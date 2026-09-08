# 웹 채팅 마크다운 렌더링 (SPEC-WEBMD-001 후보)

## Context — 왜 이 일을 하는가

지금 웹 채팅 화면은 봇(AI)이 보낸 마크다운 글을 **텍스트 그대로** 보여준다. `**보고서 요지**` 가 별표째 노출되고, 목록·코드블록·표가 전부 평문으로 뭉개져 읽기 어렵다. ChatGPT·Claude 앱처럼 렌더링해서 보여주되, 화면이 느려지지 않아야 한다.

**렌더링 지점은 코드 전체에서 딱 한 줄이다** — `web/app.js:384` 의 `body.textContent = m.body ?? ''`.

성능 걱정은 실측 근거로 해소된다. 메시지는 SSE 로 **완성된 채로 한 개씩** 도착하고(스트리밍 아님, 재렌더 없음), 방을 열 때 받는 이력은 서버가 **최대 200개**로 제한한다(`server/src/routes-messages.ts:123` `LIMIT 200`). 총 파싱 대상은 100~400KB 수준이고 줄·문자 단위 단일 패스라 10~40ms 미만이다. **캐시·가상 스크롤·메모이제이션은 전부 넣지 않는다** — 없는 문제에 대한 과잉 설계다.

진짜 어려운 부분은 성능이 아니라 **안전성**이다. 이 프로젝트는 "사용자·봇·시스템 문자열은 전부 `textContent` 로만"(`REQ-WEBCHAT-004`)을 SPEC 수준에서 못박아 두었고, 마크다운 렌더링은 `SPEC-WEBCHAT-001` spec.md:316 에 **명시적 비목표**로 적혀 있다. 봇 본문은 신뢰 경계 밖 문자열이므로, 그 규범을 우회하는 것이 아니라 **더 강한 형태로 계승**하는 설계여야 한다.

---

## 확정된 결정 (사용자 선택)

1. **외부 라이브러리 없음.** `web/markdown.js` 를 직접 작성. `innerHTML` 을 단 한 번도 쓰지 않고 `createElement` + `textContent` 로만 DOM 트리를 조립한다.
2. **모든 메시지에 적용** (사용자·봇·시스템).
3. **문법: 실용 세트 + 표.** 제목 `#`~`######`, `**굵게**`, `*기울임*`, `~~취소선~~`, `` `인라인코드` ``, ` ``` ` 펜스 코드블록(언어 표시), 순서/비순서 목록(중첩), `>` 인용, `[텍스트](url)` 링크(http/https 만), 자동링크, `---` 수평선, GFM 표(긴 표는 가로 스크롤 상자).

---

## 설계

### A. `web/markdown.js` (신규, 500~560줄 — 한국어 주석 + REQ ID 포함)

**공개 표면 5개.** 나머지는 모듈 내부.

```js
export function renderMarkdown(src, doc = document) -> DocumentFragment  // 유일한 진입점
export function parseBlocks(lines, depth = 0) -> Block[]                 // 테스트용 (AST)
export function renderInline(text, doc) -> DocumentFragment              // 테스트용
export function safeHref(raw) -> string | null                           // 테스트용 (XSS 단언 핵심)
export function codeLangToken(info) -> string | null                     // 테스트용
```

`doc` 를 인자로 받는 것은 기존 `rich.js` 의 `buildAttachmentNode(att, doc)` 관례를 따른 것이다.

**파이프라인 3단**

```
문자열 → normalizeSource → 줄 배열 → parseBlocks (순수 객체 AST) → buildBlock (DOM) → DocumentFragment
                                                                        └ renderInline (인라인 스캐너)
```

AST 를 중간에 두면 블록 파서를 재귀(인용·목록 중첩)시키면서도 DOM 생성 코드를 한 군데로 모을 수 있고, 테스트가 DOM 없이 파서만 단언할 수 있다.

**블록 스캐너 — 시도 순서가 곧 우선순위다.** 각 함수는 `(lines, i, depth) → { node, next } | null`.

| 순서 | 함수 | 비고 |
|---|---|---|
| 1 | `scanFence` | **반드시 최우선.** 코드 안의 `#`·`|`·`-` 가 문법으로 오독되지 않게 한다. 미닫힘 펜스는 입력 끝에서 자동 종료 |
| 2 | `scanTable` | 다음 줄이 구분 행(`|---|:--:|`)일 때만 표로 인정 (1줄 lookahead) |
| 3 | `scanHeading` | `^#{1,6}\s+` |
| 4 | `scanHr` | `^-{3,}$` — setext 제목은 지원하지 않으므로 `---` 는 항상 수평선 |
| 5 | `scanQuote` | `>` 접두 제거 후 `parseBlocks(inner, depth+1)` 재귀 |
| 6 | `scanList` | 들여쓰기 2칸 이상은 하위 블록으로 모아 재귀 → 중첩·항목 내 코드블록 자연 지원 |
| 7 | `scanParagraph` | 폴백, 항상 성공 |

`depth > 6` 이면 재귀를 멈추고 남은 줄을 문단으로 처리한다(중첩 폭탄 방어).

**인라인 스캐너 — 문자 단위 단일 패스.** 문자열 치환이 아니라 **노드 생성**이므로 "치환된 HTML 을 다시 파싱"하는 고전 취약점이 구조적으로 없다. 우선순위: `matchCodeSpan`(최우선) → `matchLink` → `matchAutolink` → `matchStrike` → `matchStrong` → `matchEm`. 닫는 구분자를 못 찾으면 **즉시 리터럴**로 떨어뜨린다(백트래킹 폭발 없음).

**DOM 빌더** — `buildHeading`/`buildCode`/`buildParagraph`/`buildList`/`buildQuote`/`buildTable`/`buildHr`. 클래스명은 `md-` 접두사로 통일(`md-p`, `md-pre`, `md-table-wrap` 등) — 기존 앱 클래스와 이름 공간을 분리한다.

### B. 안전성 — `innerHTML` 회피만으로는 부족한 네 지점

**(a) 링크 스킴.** `a.href = 공격자문자열` 하나로 `javascript:` 가 살아난다. 브라우저는 스킴 안의 TAB/LF/CR 을 무시하므로 `java\tscript:` 는 순진한 `startsWith` 검사를 통과한다. **사전 정제 + 화이트리스트 + URL 파서 재확인** 세 겹.

```js
// 스킴 판정 전에 제거할 문자 — 브라우저가 무시하는 제어문자 + 보이지 않는 공백·BOM.
// 지우고 나서 판정해야 "java<TAB>script:" 가 걸린다. (실제 코드에서는 \u 이스케이프로 적는다)
const URL_STRIP_RE = /[\u0000-\u0020\u007f\u00a0\u2000-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2069\ufeff]/g

export function safeHref(raw) {
  const cleaned = String(raw).replace(URL_STRIP_RE, '')
  if (!/^https?:\/\//i.test(cleaned)) return null      // 상대경로·프로토콜상대 //evil 도 거부
  let u
  try { u = new URL(cleaned) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  return u.href
}
```

`null` 이면 **링크를 만들지 않고 `[텍스트](url)` 원문을 텍스트로 남긴다** — 죽은 `<a>` 를 만들거나 조용히 삼키지 않는다. 속성은 `href`/`rel`/`target`/`title`/`className` **다섯 개 고정 이름만** 설정한다(`setAttribute(공격자문자열, …)` 형태는 모듈 전체에 없다 → `on*` 주입 차단). `rel = 'noopener noreferrer nofollow ugc'` — `noopener` 없으면 탭내빙이 열린다. **`![alt](url)` 은 지원 문법이 아니다** — 렌더러는 `img` 를 어떤 경로로도 만들지 않는다(이미지 생성은 `rich.js` 첨부 경로 독점).

**(b) 링크 텍스트가 URL 을 흉내 낼 때.** `[https://minidiscord.internal/settings](https://evil.example/x)` 는 완전히 정상적인 마크다운이라 파서로는 막을 수 없다. 표시층에서 드러낸다 — 라벨이 URL 처럼 생겼는데 호스트가 href 와 다르면 `.md-link-host` 로 **진짜 호스트를 뒤에 붙인다**. 라벨 파싱 실패 시 힌트 표시 쪽으로 fail-loud. 링크 라벨의 방향 제어 문자(RTL override)는 `�` 로 치환한다(라벨에만 — 본문 원문 보존을 깨지 않게). 자동링크는 라벨 == href 이므로 힌트가 붙지 않는다.

**(c) 코드블록 언어 문자열.** `code.className = 'lang-' + info` 는 두 가지 실제 피해를 만든다 — ① 공격자가 `hidden msg-body verdict-row` 같은 **기존 앱 클래스**를 얻어 UI 를 숨기거나 위장 ② `classList.add` 가 공백/빈 토큰에 `DOMException` 을 던져 렌더 전체가 폴백으로 떨어짐.

```js
const LANG_RE = /^[A-Za-z0-9][A-Za-z0-9+#._-]{0,19}$/
export function codeLangToken(info) {
  const first = String(info ?? '').trim().split(/\s+/)[0] ?? ''
  return LANG_RE.test(first) ? first.toLowerCase() : null
}
// 사용부 — 접두사 고정으로 앱 클래스와 이름 공간 분리
if (lang !== null) code.classList.add(`md-lang-${lang}`)
```

`dataset` 도 키가 공격자 통제면 임의 속성이 되므로 쓰지 않는다.

**(d) `rich.js` 권한 승인 정규식 — 새 구멍은 열리지 않는다.** `permissionRequestId`/`permissionResolutionId` 는 서버 페이로드 **원본 `m.body`** 를 읽고, `renderMarkdown` 은 인자를 읽기만 하며 `m` 을 변형하지 않는다. 위장 방향은 fail-closed 다 — 봇이 `**승인하려면 "yes abcde"…**` 로 마커를 끼우면 그 줄은 애초에 정규식에 안 걸린다(가짜 요청으로 버튼을 띄울 수 없음, 오늘과 동일). 새로 생기는 것은 **표시-진실 괴리**뿐이다: 봇이 `input_preview` 에 미닫힘 펜스를 넣으면 진짜 요청 줄이 코드블록 안에 렌더된다. 버튼은 원문 기준이라 승인 흐름 자체는 안전하고, 파서 상태가 메시지마다 완전히 초기화되므로 크로스-메시지 오염은 구조적으로 불가능하다. 이 불변을 §D 24번 테스트로 못박는다.

> 범위 밖 관찰(별도 카드 후보): `verdict-row` 버튼에 request id 가 표시되지 않는다(`rich.js:130-160`). 표시-진실 괴리를 근본적으로 없애려면 버튼 옆에 `rid` 를 노출하는 편이 낫다. **이번 SPEC 에서는 하지 않는다.**

**(e) 입력 상한 (DoS 방어, 성능 아님).** 입력 20,000자 초과 시 잘라내고 `…(잘림)` 표시 · 블록 재귀 깊이 6 · 인라인 재귀 깊이 4 · 표 열 50/행 500.

### C. `web/app.js` 수정 — import 1줄 + 384행 교체

```js
import { renderMarkdown } from './markdown.js'   // 파일 상단, rich.js 관례대로 확장자 포함
```

**before (382-384):**
```js
  const body = document.createElement('div')
  body.className = 'msg-body'
  body.textContent = m.body ?? ''
```

**after:**
```js
  const body = document.createElement('div')
  body.className = 'msg-body'
  // 본문만 마크다운으로 그린다 (REQ-WEBMD-001). 작성자 이름·시각·봇 이름·방 이름은
  // 여전히 textContent 전용이다 — 마크다운은 .msg-body 안쪽에서만 산다.
  // 렌더가 던지면 원문 텍스트로 되돌린다: renderMessage 는 이력 루프(:267)와 SSE 수신(:445)의
  // 동기 경로라, 여기서 예외가 나가면 메시지 한 개가 아니라 그 뒤 전부가 사라진다.
  // 조용히 삼키지는 않는다 — md-fallback 클래스와 console.warn 으로 흔적을 남긴다.
  const raw = m.body ?? ''
  try {
    body.appendChild(renderMarkdown(raw, document))
  } catch (err) {
    body.textContent = raw
    body.classList.add('md-fallback')
    console.warn('markdown 렌더 실패 — 원문 텍스트로 되돌림', err)
  }
```

`wrap.appendChild(head/body)` 와 `roomDecorator.decorate(wrap, m)` 순서는 **한 글자도 바꾸지 않는다.** 훅은 `wrap` 에 형제로 append 하고 `.msg-body` 를 건드리지 않으므로 충돌 지점이 없다.

**폴백을 넣는 판단 근거:** 이 프로젝트는 "훅이 던지면 삼키지 않는다"(app.js:389 주석)를 관례로 두지만, 그건 *남의 모듈* 계약 위반을 감추지 말라는 규범이다. 여기는 *우리 모듈*의 예상 못한 입력 방어이고 실패 모드가 "메시지 목록 전체 소실"이라 비대칭이 크다. 대신 관측 가능하게 만들고(§D 25번) 테스트로 폴백 경로를 직접 단언한다.

### D. `web/markdown.d.ts` (신규)

`server/tsconfig.json` 은 `include: ["src","test"]` 에 `allowJs` 가 없어서, 테스트가 `../../web/markdown.js` 를 import 하면 **형 선언 파일이 있어야 typecheck 를 통과**한다. `web/rich.d.ts` 가 같은 이유로 존재하는 선례다(`rich.d.ts:4-5` 주석에 근거 기록됨). CI 가 `npm run typecheck -w server` 를 돌리므로(`.github/workflows/ci.yml:27`) 이 파일이 없으면 CI 가 빨간불이 된다.

### E. `web/style.css` — `white-space: pre-wrap` 문제

현재 `.msg-body { white-space: pre-wrap }` 이 줄바꿈을 전담한다(`style.css:307-311`, 파일 전체에서 유일한 사용처). 블록 요소를 넣으면 ① 블록 사이 개행이 **여분의 빈 줄**로 보이고 ② `<pre>` 안에서 긴 코드 줄이 강제로 접혀 가로 스크롤 설계가 망가지며 ③ 표 셀 간격이 어긋난다.

**해법은 책임 이동이다.** `pre-wrap` 을 제거하고 줄바꿈을 **렌더러가 노드로 표현**한다:
- 빈 줄 = 문단 경계 → `p.md-p` 두 개 (CSS margin 이 간격 담당)
- 문단 안 단일 개행 = 하드 브레이크 → `br` (GFM 이 아니라 **채팅 관례**를 따른다 — Enter 한 번이 무시되면 사용자는 버그로 인식한다)
- 파서는 블록 사이에 **텍스트 노드를 절대 만들지 않는다** → 여분 공백이 애초에 안 생긴다
- `pre` 만 `white-space: pre` 로 국소 복원, 폴백(`.md-fallback`)에만 `pre-wrap` 되살림

```css
/* 마크다운 본문 (REQ-WEBMD-002) — 줄바꿈 책임이 pre-wrap 에서 p/br 노드로 옮겨졌다 */
.msg-body { margin: var(--md-space-1) 0 0; overflow-wrap: anywhere; }
/* 렌더 실패 폴백 — 원문 텍스트이므로 예전 규칙을 국소 복원한다 */
.md-fallback { white-space: pre-wrap; }
```

추가 규칙(요지) — **새 색 토큰은 만들지 않는다.** 기존 `--md-bg-panel`/`--md-bg-input`/`--md-divider`/`--md-text-muted`/`--md-text-link` 로 전부 충당된다. 코드블록 스타일은 `#invite-command`(style.css:535, `--md-bg-sidebar` + `overflow-x: auto`) 선례를 따른다. `style.css` 의 `/* SPEC-XXX */ … /* /SPEC-XXX */` 구획 관례대로 자기 블록에 넣는다.

| 선택자 | 요지 |
|---|---|
| `.md-p` | `margin: 0 0 var(--md-space-2)`, `:last-child { margin-bottom: 0 }` |
| `.md-h` (h1~h6) | `margin: var(--md-space-3) 0 var(--md-space-1)`, `:first-child { margin-top: 0 }`; h1/h2 는 `border-bottom: var(--md-border-width) solid var(--md-divider)`; 크기는 `1.4em`~`0.9em` **상대값**(새 px 토큰 안 만듦) |
| `.md-pre` | `position: relative; background: var(--md-bg-panel); border-radius: var(--md-radius-input); padding: var(--md-space-3); overflow-x: auto; white-space: pre` |
| `.md-pre code`, `.md-code` | `font-family: ui-monospace, SFMono-Regular, Menlo, monospace`; 인라인은 `background: var(--md-bg-input)` + `border-radius: var(--md-radius-badge)` |
| `.md-code-lang` | `position: absolute; top/right` 배치, `font-size: var(--md-font-size-label)`, `color: var(--md-text-muted)`, `user-select: none` |
| `.md-ul`, `.md-ol`, `.md-li` | `padding-left: var(--md-space-5)`, 중첩 목록은 간격 축소 |
| `.md-quote` | `border-left: 4px solid var(--md-divider)`, `color: var(--md-text-muted)` |
| `.md-table-wrap` | `overflow-x: auto; max-width: 100%` — **긴 표 가로 스크롤 상자** |
| `.md-table` | `border-collapse: collapse; width: max-content; min-width: 100%` (`max-content` 가 있어야 셀이 눌리지 않고 실제로 가로 스크롤이 생긴다) |
| `.md-table th/td` | `border: var(--md-border-width) solid var(--md-divider)`, `white-space: nowrap`; th 는 `background: var(--md-bg-panel)` |
| `.md-al-center`, `.md-al-right` | 구분 행 `:---:` / `---:` 대응 |
| `.md-hr` | `border-top: var(--md-border-width) solid var(--md-divider)` |
| `.msg-body a`, `.md-link-host` | `color: var(--md-text-link)` / `var(--md-text-muted)` |
| `.message.system .md-pre` | `background: var(--md-bg-input)` — system 패널 배경과 겹치지 않게 |

---

## 기존 SPEC 문서와의 관계

`SPEC-WEBCHAT-001` 을 **수정하지 않고**, 신설 `SPEC-WEBMD-001` 이 명시적으로 상위 규정한다.

- spec.md:316 의 비목표 항목은 "Tier M 예산과 Task 16 범위"라는 *당시의 판단* 기록이지 영구 금지가 아니다. 삭제 대신 `SPEC-WEBMD-001` §3 에 "이 SPEC 은 `SPEC-WEBCHAT-001` §5 Out of Scope 의 '마크다운 렌더링 … white-space: pre-wrap 텍스트로만' **한 항목만** 대체하며, 같은 절의 나머지 비목표(그룹핑·읽음 표시·무한 스크롤 등)는 그대로 유효하다"를 못박고, `SPEC-WEBCHAT-001` HISTORY 에 이관 사실을 한 줄 추가한다.
- **`REQ-WEBCHAT-004` 는 폐기하지 않고 강화 계승한다.** 그 규범의 실질은 "신뢰 경계 밖 문자열을 마크업 파서에 넘기지 말라"이고 `textContent` 는 그 수단이었다. 새 SPEC 은 (i) `innerHTML`·`outerHTML`·`insertAdjacentHTML`·`document.write`·`Range.createContextualFragment` **전면 금지**, `innerHTML = ''` 만 허용 (ii) 작성자 이름·봇 이름·방 이름·시각은 **변경 없이** `textContent` 전용 (iii) 새로 허용되는 것은 오직 `.msg-body` 안쪽의 `createElement` + `textContent` 노드 트리이며, 모든 leaf 텍스트는 `textContent`/`createTextNode` 로만 들어가고 속성은 화이트리스트 5개(`href`/`rel`/`target`/`title`/`class`)에만 설정된다 — 로 재서술한다.

그 결과 `web-chat.test.ts:313` 의 AC-WEBCHAT-003("마크업으로 해석되지 않는다")은 **손대지 않고 그대로 통과**하며, 새 SPEC 의 안전성 회귀 방어선으로 자동 승계된다.

---

## 수정할 파일

| 파일 | 성격 |
|---|---|
| `.moai/specs/SPEC-WEBMD-001/{spec,plan,acceptance,progress}.md` | 신규 (프로젝트 SPEC 관례 4파일 묶음) |
| `web/markdown.js` | **신규** — 렌더러 본체 |
| `web/markdown.d.ts` | **신규** — typecheck 필수 (`rich.d.ts` 선례) |
| `web/app.js` | import 1줄 + 382-384행 교체 |
| `web/style.css` | 307-311 `.msg-body` 수정 + 마크다운 구획 추가 |
| `server/test/web-markdown.test.ts` | **신규** — 검증 |
| `server/test/web-chat.test.ts` | **회귀 기준선 — 수정하지 않는 것이 목표** |
| `.moai/project/structure.md`, `.moai/project/codemaps/{overview,dependencies,data-flow}.md` | `web/` 파일 목록에 `markdown.js`·`markdown.d.ts` 반영 |
| `CHANGELOG.md` | 항목 추가 |

---

## 기존 테스트 회귀 판정 (grep 으로 실제 확인함)

`.msg-body` 의 `textContent` 를 단언하는 곳은 6군데이고 **전부 안전**하다.

| 위치 | 단언 | 판정 |
|---|---|---|
| `web-chat.test.ts:183` | `['첫 줄','둘째 줄']` | `p` 로 감싸도 `textContent` 동일 |
| `:226` | `toBe('사람')` | 안전. **정확 일치**이므로 파서가 앞뒤 공백/개행을 절대 덧붙이면 안 된다 — 설계 제약으로 확정 |
| `:290` | `toBe('훅 없음')` | 안전 |
| `:313` | `toBe('<img src=x onerror=…><b>굵게</b>')` + `#messages img/b 개수 0` | **안전하며 오히려 핵심 방어선.** 이 문자열엔 마크다운 마커가 없어 순수 텍스트 문단이 되고, 우리는 `img`/`b` 를 어떤 경로로도 만들지 않는다(`<strong>` 을 만든다) |
| `:333`, `:433`, `:828` | 한 줄 본문들 | 안전 |

`web-rich.test.ts` / `web-permission-contract.test.ts` / `web-shell.test.ts` / E2E 스크립트는 `.msg-body` 를 보지 않아 무관하다.

**유일한 잠재 회귀는 여러 줄 본문**이다 — `br` 도입으로 `.msg-body.textContent` 에서 `\n` 이 사라진다. 현재 테스트 본문은 전부 한 줄이라 지금은 안 깨지지만, 이 사실을 새 테스트에 **명시적으로 못박아** 나중에 다중 줄 단언을 추가하는 사람이 혼란에 빠지지 않게 한다.

---

## 검증 계획

새 파일 `server/test/web-markdown.test.ts` — `// @vitest-environment jsdom` 도크블록 + `web/` 직접 import, 기존 관례 그대로. 세 그룹.

**A. 문법별 렌더 (11개)** — 제목 h1~h6 및 `#######` 은 문단 / 강조 3종과 미닫힘 마커의 리터럴화 / 코드스팬이 강조보다 우선 / 펜스(언어 유무, 미닫힘 자동종료, 코드 안 `#`·`|` 미해석, 본문 원문 정확 일치) / 목록 4종·중첩 2단·`ol.start` / 인용 중첩 / 표(정렬 3종, `.md-table-wrap` 존재, 구분 행 없으면 문단) / `---` vs `--` / 링크·자동링크 / **줄바꿈 계약**(`'a\n\nb'`→`p` 2개, `'a\nb'`→`p` 1개+`br` 1개, fragment 앞뒤에 공백 텍스트 노드 없음) / **평문 항등**(마커 없는 한 줄은 `fragment.textContent === 원문`)

**B. XSS·안전성 (9개)** — `safeHref` 가 `javascript:`·`JaVaScRiPt:`·`java\tscript:`·`java\nscript:`·`data:`·`vbscript:`·`//evil`·`/relative`·`#frag` 를 전부 `null` / 차단된 링크는 `a` 를 만들지 않고 원문 텍스트로 남음 / `rel` 에 `noopener`·`noreferrer`, `target='_blank'` / 라벨 위장 시 `.md-link-host` 표시, 자동링크엔 미표시 / `codeLangToken` 이 `hidden msg-body`·`<script>`·21자·빈 문자열을 거름 / 위험한 정보 문자열이 클래스·텍스트에 안 들어감 / `<img onerror>` 본문 → `img` 0개, `window.__pwned` undefined / 깊이 폭탄(`'>'.repeat(500)`, `'- '.repeat(500)`)과 30,000자 입력이 유한 시간 내 반환 / `renderMarkdown` 이 입력 문자열을 변형하지 않음

**C. app.js 통합·회귀 (6개)** — `'**굵게**'` → `strong` 1개 / `'평문'` → `textContent` 정확 일치(`:226` 계열 고정) / 장식 훅과 공존(훅 노드가 `.msg-body` **밖 형제**로 유지) / **권한 릴레이 회귀**: 실제 브로커 4줄 요청 본문 → `verdict-row` 버튼 2개, 앞에 미닫힘 펜스를 넣은 변형에서도 버튼 그대로(원문 파싱 불변 증명), 판정 결과 본문에서 버튼 잠김 / **폴백**: 던지는 가짜 렌더러 주입 시 메시지가 사라지지 않고 `.md-fallback` + 원문, 후속 렌더 계속 / **CSS 계약**: `readFileSync(style.css)` 로 `.msg-body` 에 `pre-wrap` 없음, `.md-fallback`·`.md-table-wrap{overflow-x:auto}` 있음, 새 규칙에 리터럴 `#` 색 없음(`var(--md-` 만)

**끝에서 끝까지 확인**

```bash
npm run typecheck -w server     # markdown.d.ts 누락이면 여기서 잡힌다
npm test                        # 워크스페이스 전체 (CI 와 동일)
npm run e2e                     # 실제 서버 프로세스 15단계
```

기존 4개 웹 테스트(`web-chat`·`web-rich`·`web-shell`·`web-permission-contract`)를 **수정 없이** 통과시키는 것이 목표다. 수정이 필요해지면 그건 설계 오류 신호다.

마지막으로 **실제 브라우저 육안 확인** — jsdom 은 레이아웃을 계산하지 않아 `overflow-x` 를 자동 검증할 수 없다. 서버를 띄우고(`npm run dev -w server`) 긴 표의 가로 스크롤, 코드블록 배경, 중첩 목록 들여쓰기를 눈으로 본다.

---

## 구현 순서

1. `.moai/specs/SPEC-WEBMD-001/` 4파일 작성 — **REQ ID 를 먼저 확정**해야 이후 파일 주석에 달 수 있다(프로젝트 주석 관례)
2. `server/test/web-markdown.test.ts` 의 **A·B 그룹 먼저** 작성 → 실패 확인 (RED)
3. `web/markdown.js` 작성 (`normalizeSource`·`safeHref`·`codeLangToken` → 인라인 → 블록 → DOM 빌더 → `renderMarkdown`) + `web/markdown.d.ts`. A·B GREEN 까지 **app.js 를 건드리지 않는다** — 렌더러가 독립 검증되기 전에 통합하면 회귀 원인이 두 파일로 흩어진다
4. `web/style.css` 수정 → C 그룹 26번(CSS 계약)으로 확인
5. `web/app.js` 수정 (import + 384행) → C 그룹 작성·GREEN
6. 전체 회귀 (`typecheck` + `npm test` + `e2e`)
7. 실브라우저 육안 확인
8. `SPEC-WEBCHAT-001` HISTORY 한 줄 + 프로젝트 문서 4개 + `CHANGELOG.md`
