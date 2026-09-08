# SPEC-WEBMD-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본은 승인된 구현 계획 `.moai/plans/ai-stateless-scroll.md` 이며, 아래 자리는 전부 2026-09-08 의 `main` 에서 **내용 앵커로** 다시 찾아 확인했다.
>
> 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A~§C 가 검토 대상이고 §E 의 마일스톤은 그 결정이 선 뒤의 실행 절차다.

---

## §A 손대는 자리 (읽어서 확인한 앵커)

| 파일 | 앵커 | 지금 모양 | 무엇을 |
|------|------|-----------|--------|
| `web/app.js` | `body.className = 'msg-body'` (383행) 바로 아래 | 384행 `body.textContent = m.body ?? ''` | try/catch + `renderMarkdown` (§D) |
| `web/app.js` | 파일 상단 import 절 | `rich.js` 관례대로 확장자 포함 | `import { renderMarkdown } from './markdown.js'` 한 줄 |
| `web/app.js` | `wrap.appendChild(head)` · `roomDecorator.decorate(wrap, m)` (386~391행) | 훅은 `wrap` 에 형제로 append | **한 글자도 바꾸지 않는다** |
| `web/style.css` | `.msg-body {` (307행) 안의 `white-space: pre-wrap;` (309행 — 파일 전체 유일) | 줄바꿈을 CSS 가 전담 | `pre-wrap` 제거, 책임을 노드로 이동 (§C) |
| `web/style.css` | `#invite-command {` (535행) | `--md-bg-sidebar` + `overflow-x: auto` | 코드블록 표면의 **선례**. 바꾸지 않고 따라 한다 |
| `web/rich.js` | `REQUEST_LINE_RE`(53행) · `RESOLUTION_RE`(69행) · `verdict-row`(130행) | 원본 `m.body` 를 읽는다 | **고치지 않는다.** 회귀 기준선(§F) |
| `web/design-tokens.css` | `:root` | 쓸 토큰 전부 존재 | **고치지 않는다.** 새 토큰 0개 |
| `server/tsconfig.json` | `"include": ["src","test"]`, `allowJs` 없음 | — | 고치지 않는다 — `web/markdown.d.ts` 가 필요한 이유(§B.4) |
| `.github/workflows/ci.yml` | 27행 `npm run typecheck -w server` | — | 고치지 않는다 — `.d.ts` 누락이 여기서 빨간불이 된다 |
| `server/test/web-chat.test.ts` | `msg-body` 를 보는 단언 자리들 | 아래 §D 표 | **고치지 않는 것이 목표** |

신규 파일 셋: `web/markdown.js` · `web/markdown.d.ts` · `server/test/web-markdown.test.ts`.

---

## §B 파이프라인 — 가장 먼저 검토할 설계 결정

### B.1 왜 중간에 AST 를 두는가

```
문자열 → normalizeSource → 줄 배열 → parseBlocks (순수 객체 AST) → buildBlock (DOM) → DocumentFragment
                                                                        └ renderInline (인라인 스캐너)
```

3단으로 가르는 이유는 둘이다.

1. **블록 파서를 재귀시키면서도 DOM 생성 코드를 한 군데로 모을 수 있다.** 인용과 목록은 안쪽에 다시 블록을 담으므로 파서가 자기를 부른다. AST 없이 곧바로 DOM 을 만들면 재귀 지점마다 DOM 조립 코드가 흩어지고, 속성 화이트리스트(REQ-WEBMD-005)를 지키는지 확인할 자리도 함께 흩어진다.
2. **테스트가 DOM 없이 파서만 단언할 수 있다.** `parseBlocks` 가 export 인 이유가 그것이다.

인라인은 **문자열 치환이 아니라 노드 생성**이다. 치환한 HTML 을 다시 파싱하는 고전 취약점이 구조적으로 존재하지 않는다.

### B.2 블록 스캐너 — 시도 순서가 곧 우선순위다

각 함수는 `(lines, i, depth) → { node, next } | null` 이다.

| 순서 | 함수 | 왜 이 자리인가 |
|---|---|---|
| 1 | `scanFence` | **반드시 최우선.** 코드블록 안의 `#`·`|`·`-` 가 제목·표·수평선으로 오독되지 않게 한다. 이 하나가 뒤로 밀리면 코드 예제가 담긴 봇 답변이 통째로 깨진다. 미닫힘 펜스는 입력 끝에서 자동 종료 |
| 2 | `scanTable` | **1줄 lookahead** — 다음 줄이 구분 행(`|---|:--:|`)일 때만 표로 인정한다. 그래야 `|` 를 쓴 평범한 문장이 표가 되지 않는다 |
| 3 | `scanHeading` | `^#{1,6}\s+`. 7개 이상은 맞지 않아 문단으로 흘러간다 |
| 4 | `scanHr` | `^-{3,}$`. setext 제목을 지원하지 않으므로 `---` 는 **항상** 수평선이다 — 표 다음에 오면 표가 먼저 잡으므로 충돌하지 않는다 |
| 5 | `scanQuote` | `>` 접두 제거 후 `parseBlocks(inner, depth+1)` 재귀 |
| 6 | `scanList` | 들여쓰기 2칸 이상을 하위 블록으로 모아 재귀 → 중첩과 항목 안 코드블록이 자연히 따라온다 |
| 7 | `scanParagraph` | 폴백. **항상 성공한다** — 어떤 줄도 미아가 되지 않는다 |

`depth > 6` 이면 재귀를 멈추고 남은 줄을 문단으로 처리한다(REQ-WEBMD-013 중첩 폭탄 방어).

### B.3 인라인 스캐너 — 우선순위와 즉시 리터럴화

문자 단위 단일 패스. 우선순위: `matchCodeSpan`(최상위) → `matchLink` → `matchAutolink` → `matchStrike` → `matchStrong` → `matchEm`.

- **코드스팬이 최상위**여야 `` `**not bold**` `` 가 코드 안에서 강조되지 않는다.
- `matchStrong` 이 `matchEm` 보다 앞이어야 `**` 를 `*`+`*` 로 잘못 읽지 않는다.
- **닫는 구분자를 못 찾으면 즉시 리터럴로 떨어뜨린다.** 되돌아가서 다른 조합을 시도하지 않는다 — 백트래킹 폭발이 없는 이유이며, 적대적 입력(`'*'.repeat(10000)`)이 선형 시간에 끝나는 이유다.
- 인라인 재귀 깊이 4 를 넘으면 남은 텍스트를 리터럴로 둔다.

### B.4 `web/markdown.d.ts` 가 선택이 아닌 이유

`server/tsconfig.json` 은 `include: ["src","test"]` 이고 `allowJs` 가 없다. 테스트가 `../../web/markdown.js` 를 import 하면 **형 선언 파일을 통해서만** typecheck 를 통과한다. `web/rich.d.ts` 가 정확히 같은 이유로 존재하며 그 파일 4~5행 주석에 근거가 적혀 있다. CI 는 `npm run typecheck -w server` 를 돌린다(`.github/workflows/ci.yml` 27행) — 이 파일이 없으면 테스트가 초록이어도 CI 가 빨간불이다.

선언할 표면은 export 다섯과 `Block` 형이다.

---

## §C CSS — 줄바꿈 책임 이동과 규칙 목록

### C.1 `pre-wrap` 을 왜 없애야 하는가

지금 `.msg-body { white-space: pre-wrap }` 이 줄바꿈을 전담한다(`web/style.css` 309행, 파일 전체 유일). 블록 요소를 넣으면 셋이 동시에 깨진다 — ① 블록 사이 개행이 **여분의 빈 줄**로 보이고 ② `pre` 안에서 긴 코드 줄이 강제로 접혀 가로 스크롤 설계가 무너지며 ③ 표 셀 간격이 어긋난다.

해법은 **책임 이동**이다.

```css
/* 마크다운 본문 (REQ-WEBMD-010) — 줄바꿈 책임이 pre-wrap 에서 p/br 노드로 옮겨졌다 */
.msg-body { margin: var(--md-space-1) 0 0; overflow-wrap: anywhere; }
/* 렌더 실패 폴백 — 원문 텍스트이므로 예전 규칙을 국소 복원한다 */
.md-fallback { white-space: pre-wrap; }
```

파서가 **블록 사이에 텍스트 노드를 절대 만들지 않으므로** 여분 공백이 애초에 생기지 않는다. 이 성질은 AC-WEBMD-005 가 직접 단언한다.

### C.2 규칙 목록 (선택자별)

전부 `/* SPEC-WEBMD-001 */` 로 시작해 **`/* /SPEC-WEBMD-001 */` 로 끝나는** 블록 안에 둔다 — AC-WEBMD-014 의 색 리터럴 검사가 이 두 주석을 앵커로 블록을 잘라 내므로, 닫는 주석이 없으면 범위가 파일 끝까지 늘어나 다른 SPEC 의 규칙까지 재게 된다.

| 선택자 | 요지 |
|---|---|
| `.md-p` | `margin: 0 0 var(--md-space-2)`; `:last-child { margin-bottom: 0 }` |
| `.md-h` (h1~h6) | `margin: var(--md-space-3) 0 var(--md-space-1)`; `:first-child { margin-top: 0 }`; h1/h2 는 `border-bottom: var(--md-border-width) solid var(--md-divider)`; 크기는 `1.4em`~`0.9em` **상대값**(새 px 토큰을 만들지 않는다) |
| `.md-pre` | `position: relative; background: var(--md-bg-panel); border-radius: var(--md-radius-input); padding: var(--md-space-3); overflow-x: auto; white-space: pre` |
| `.md-pre code`, `.md-code` | `font-family: ui-monospace, SFMono-Regular, Menlo, monospace`; 인라인은 `background: var(--md-bg-input)` + `border-radius: var(--md-radius-badge)` |
| `.md-code-lang` | `position: absolute` 로 우상단, `font-size: var(--md-font-size-label)`, `color: var(--md-text-muted)`, `user-select: none` |
| `.md-ul`, `.md-ol`, `.md-li` | `padding-left: var(--md-space-5)`; 중첩 목록은 간격 축소 |
| `.md-quote` | `border-left: var(--md-space-1) solid var(--md-divider)`; `color: var(--md-text-muted)` — REQ-WEBMD-014 가 간격도 토큰으로만 적으라 하므로 생 `4px` 리터럴을 쓰지 않는다(`--md-space-1` 이 곧 `4px`, `web/design-tokens.css` 44행) |
| `.md-table-wrap` | `overflow-x: auto; max-width: 100%` — **긴 표의 가로 스크롤 상자** |
| `.md-table` | `border-collapse: collapse; width: max-content; min-width: 100%`. **`max-content` 가 있어야** 셀이 눌리지 않고 실제로 가로 스크롤이 생긴다 — 이 한 선언이 REQ-WEBMD-014 의 핵심이다 |
| `.md-table th/td` | `border: var(--md-border-width) solid var(--md-divider)`; `white-space: nowrap`; th 는 `background: var(--md-bg-panel)` |
| `.md-al-center`, `.md-al-right` | 구분 행 `:---:` / `---:` 대응 |
| `.md-hr` | `border-top: var(--md-border-width) solid var(--md-divider)` |
| `.msg-body a` · `.md-link-host` | `color: var(--md-text-link)` / `var(--md-text-muted)` |
| `.message.system .md-pre` | `background: var(--md-bg-input)` — system 패널 배경과 겹치지 않게 |

**새 색 토큰을 만들지 않는다.** 위 전부가 `web/design-tokens.css` 의 기존 토큰으로 충당되는 것을 읽어 확인했다.

---

## §D `web/app.js` 통합과 회귀 판정

### D.1 바꾸는 것 — import 한 줄 + 384행

**before** (382~384행):
```js
  const body = document.createElement('div')
  body.className = 'msg-body'
  body.textContent = m.body ?? ''
```

**after**:
```js
  const body = document.createElement('div')
  body.className = 'msg-body'
  // 본문만 마크다운으로 그린다 (REQ-WEBMD-002). 작성자 이름·시각·봇 이름·방 이름은
  // 여전히 textContent 전용이다 — 마크다운은 .msg-body 안쪽에서만 산다.
  // 렌더가 던지면 원문 텍스트로 되돌린다 (REQ-WEBMD-011): renderMessage 는 이력 루프(:265)와
  // SSE 수신(:445·:466)의 동기 경로라, 여기서 예외가 나가면 메시지 한 개가 아니라 그 뒤 전부가 사라진다.
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

`wrap.appendChild(head/body)` 와 `roomDecorator.decorate(wrap, m)` 의 순서는 **한 글자도 바꾸지 않는다.** 훅은 `wrap` 에 형제로 append 하고 `.msg-body` 를 건드리지 않으므로 충돌 지점이 없다.

### D.2 기존 테스트 회귀 판정 — 자리마다

자리의 수는 **그것을 센 명령과 함께** 적는다. 명령 없이 숫자만 옮겨 적지 않는다.

```bash
grep -n "msg-body" server/test/web-chat.test.ts        # 주석 포함 전 자리
grep -rln "msg-body" server/test scripts               # 다른 파일이 보는지
```

둘째 명령의 검색 범위가 `scripts` 인 이유: E2E 코드는 `scripts/e2e.mts` · `scripts/e2e-scenario.mts` · `scripts/e2e-lib.mts` 에 살고(`package.json` 의 `"e2e": "npx tsx scripts/e2e.mts"`), `e2e` 라는 디렉터리는 이 저장소에 없다. 실행 출력은 이렇다.

```
$ grep -rln "msg-body" server/test scripts
server/test/web-chat.test.ts
```

**승인 계획서는 이 자리를 «6군데»라 적었으나 위 첫 명령의 출력은 `textContent` 를 읽는 자리 일곱과 구조 개수를 세는 자리 하나를 보인다.** 판정은 바뀌지 않는다 — 여덟 모두 안전하다. 이 수가 문서에 고정 숫자로 남아도 낡지 않는 이유는 REQ-WEBMD-015 가 이 파일의 `diff` 를 0줄로 못박기 때문이다. 계약이 풀리면 이 표가 아니라 위 명령을 먼저 다시 돌려야 한다.

| 자리 | 단언 | 판정 |
|---|---|---|
| 183행 | `['첫 줄','둘째 줄']` (메시지 둘, 각 한 줄) | 안전. `p` 로 감싸도 `textContent` 는 같다 |
| 226행 | `toBe('사람')` | 안전. **정확 일치**이므로 파서가 앞뒤에 공백·개행을 절대 덧붙이면 안 된다 — REQ-WEBMD-010 의 설계 제약이 여기서 나왔다 |
| **269행** | `$$('#messages .message > .msg-body').length` `toBe(2)` | 안전. **`textContent` 가 아니라 직계 자식 개수**다. `.msg-body` 는 여전히 `.message` 의 직계 자식이고 훅 노드는 그 밖 형제이므로 2 그대로 |
| 290행 | `toBe('훅 없음')` | 안전 |
| 313행 | `toBe(evil)` + `#messages img` 0 + `#messages b` 0 + `__pwned` undefined | **안전하며 오히려 핵심 방어선.** `evil` 문자열에는 마크다운 마커가 없어 순수 텍스트 문단이 되고, 렌더러는 `img` 를 어떤 경로로도 만들지 않으며(REQ-WEBMD-004) 굵게는 `b` 가 아니라 `strong` 으로 만든다 |
| 333행 | `toBe('실시간')` | 안전 |
| 433행 | `['과거','실시간','놓친 것']` | 안전 |
| 828행 | `['방2 메시지']` | 안전 |

`web-rich.test.ts` · `web-shell.test.ts` · `web-permission-contract.test.ts` · E2E 스크립트는 `.msg-body` 를 보지 않는다(위 두 번째 명령으로 확인).

**유일한 잠재 위험은 여러 줄 본문이다.** `br` 도입으로 여러 줄 본문의 `.msg-body.textContent` 에서 `\n` 이 사라진다. 현재 픽스처는 전부 한 줄이라 지금은 깨지지 않지만, 나중에 다중 줄 단언을 추가하는 사람이 혼란에 빠지지 않도록 **새 테스트 파일에 이 사실을 주석과 단언으로 명시적으로 못박는다**(AC-WEBMD-005).

---

## §E 마일스톤 (TDD — 실패하는 테스트가 먼저)

### M1 — A·B 그룹 테스트를 먼저 쓴다 (RED) · 우선순위 High

1. `server/test/web-markdown.test.ts` 를 만든다. 1행 `// @vitest-environment jsdom`, `web/` 소스 직접 import(`server/test/web-rich.test.ts` 11행 관례).
2. A 그룹(문법별 렌더)과 B 그룹(안전성)을 `acceptance.md` 코드 그대로 쓴다.
3. `cd server && npx vitest run test/web-markdown.test.ts` → **전부 실패**를 확인하고 출력을 `progress.md` §E.2 에 남긴다.

완료 기준: 새 `it` 전부 실패(수는 `grep -c "^\s*it(" server/test/web-markdown.test.ts` 로 센다), 기존 테스트 전부 통과.

### M2 — `web/markdown.js` + `web/markdown.d.ts` · 우선순위 High

작성 순서: `normalizeSource` · `safeHref` · `codeLangToken` → 인라인 스캐너 → 블록 스캐너 → DOM 빌더 → `renderMarkdown`.

**A·B 그룹이 초록이 될 때까지 `web/app.js` 를 건드리지 않는다.** 렌더러가 독립적으로 검증되기 전에 통합하면 회귀의 원인이 두 파일로 흩어져 어느 쪽이 깨졌는지 가릴 수 없게 된다.

완료 기준: AC-WEBMD-001~013 · 015 초록. `npm run typecheck -w server` 종료 코드 0.

### M3 — `web/style.css` · 우선순위 High

§C.2 의 블록을 `/* SPEC-WEBMD-001 */` … `/* /SPEC-WEBMD-001 */` 로 감싸 추가하고, `.msg-body` 의 `white-space: pre-wrap`(309행)을 제거한다.

완료 기준: AC-WEBMD-014 초록.

### M4 — `web/app.js` 통합과 C 그룹 · 우선순위 High

§D.1 의 import 한 줄과 384행 교체. 그 다음 C 그룹(통합·회귀) 테스트를 쓴다.

완료 기준: AC-WEBMD-011 · 012 · 016 초록.

### M5 — 전체 회귀 · 우선순위 High

```bash
npm run typecheck -w server     # markdown.d.ts 누락이면 여기서 잡힌다
npm test                        # 워크스페이스 전체 (CI 와 같다)
npm run e2e                     # 실제 서버 프로세스
git diff --stat server/test/web-chat.test.ts server/test/web-rich.test.ts \
    server/test/web-shell.test.ts server/test/web-permission-contract.test.ts   # 0줄이어야 한다
```

완료 기준: 전부 종료 코드 0, 네 테스트 파일 diff 0줄(REQ-WEBMD-015).

### M6 — 실브라우저 육안 확인 (수동, 판정 기준 아님) · 우선순위 Medium

jsdom 은 레이아웃을 계산하지 않아 `overflow-x` 를 기계로 판정할 수 없다. `npm run dev -w server` 로 띄우고 **긴 표의 가로 스크롤 · 코드블록 배경 · 중첩 목록 들여쓰기 · 링크 호스트 힌트**를 눈으로 본다. 결과를 `progress.md` 에 적되 **자동 기준으로 위장하지 않는다.**

### M7 — 문서 동기화 (sync 단계) · 우선순위 Low

- `.moai/project/structure.md` — `web/` 파일 목록에 `markdown.js` · `markdown.d.ts`
- `.moai/project/codemaps/overview.md` · `dependencies.md` · `data-flow.md` — 같은 목록 셋 (셋 다 `web/` 파일을 열거한다)
- `CHANGELOG.md` — 항목 추가
- `.moai/specs/SPEC-WEBCHAT-001/spec.md` HISTORY — 비목표 한 항목의 이관을 알리는 **한 줄**(§3.1). 본문 §5 는 고치지 않는다

---

## §F 손대지 않는 것

- `server/src/` 아래 소스 전부. 특히 `routes-messages.ts` 의 `LIMIT 200` 과 `permissions.ts` 의 메시지 문구.
- `web/rich.js` — 첨부·모달·권한 버튼과 정규식 둘. 이 SPEC 의 불변(REQ-WEBMD-012)이 성립하는 근거가 «이 파일을 안 고친다»이다.
- `web/design-tokens.css` · `web/index.html`.
- 기존 웹 테스트 네 파일의 단언(REQ-WEBMD-015).
- `wrap.appendChild(head/body)` → `roomDecorator.decorate` 순서.

---

## §G 알려진 위험

| 위험 | 어떻게 드러나나 | 대응 |
|------|----------------|------|
| `scanFence` 가 최우선이 아니면 | 코드블록 안 `#`·`|` 이 제목·표가 된다 | AC-WEBMD-002 가 코드 안 마커 미해석과 본문 원문 일치를 함께 본다 |
| 정제보다 판정이 먼저면 | `java<TAB>script:` 가 통과한다 | AC-WEBMD-006 이 탭·개행이 낀 변형을 직접 먹인다 |
| `rel` 에 `noreferrer` 만 있고 `noopener` 가 없으면 | 탭내빙이 열리지만 눈에 보이지 않는다 | AC-WEBMD-007 이 두 토큰을 **각각** 단언한다 |
| 차단된 링크를 «조용히 삼키는» 구현 | 사용자가 URL 이 있었다는 사실조차 모른다 | AC-WEBMD-006 후반이 `a` 0개 **그리고** 원문 텍스트 잔존을 함께 본다 — 삼키는 구현은 후자에서 떨어진다 |
| `codeLangToken` 없이 `classList.add` | 빈/공백 토큰에 `DOMException` → 렌더 전체가 폴백 | AC-WEBMD-009 가 빈 문자열과 공백 포함 토큰을 먹인다 |
| 폴백이 예외를 **조용히** 삼키면 | 렌더러가 깨져도 아무도 모른 채 평문이 계속 나온다 | AC-WEBMD-012 가 `.md-fallback` 클래스 **와** 원문 잔존 **와** 후속 렌더 지속을 함께 본다 |
| `.md-table` 에 `max-content` 를 빠뜨리면 | 셀이 눌려 가로 스크롤이 생기지 않는다. jsdom 은 레이아웃을 계산하지 않아 **동작으로는 못 잡는다** | AC-WEBMD-014 가 CSS 원문에서 선언 존재를 읽는다(계약 검사). 실동작은 M6 육안 |
| 파서가 블록 사이에 공백 텍스트 노드를 만들면 | `web-chat.test.ts` 226행의 **정확 일치** 단언이 깨진다 | AC-WEBMD-005 가 fragment 앞뒤 공백 노드 0 과 평문 항등을 먼저 잡는다 |
| 통합을 먼저 하고 렌더러를 나중에 고치면 | 회귀 원인이 두 파일로 흩어진다 | M2 완료 기준이 «app.js 미변경 상태에서 A·B 초록» |

`[NEEDS CLARIFICATION]` 항목 없음 — 승인된 계획서가 결정을 전부 싣고 있고, 계획서 밖에서 이 문서가 정한 것 둘(§D.2 의 자리 수 정정, §C.2 의 닫는 주석 앵커)은 판정을 바꾸지 않는 확인·보강이다.

---

## §H 상호 참조

- `spec.md` §4 (REQ-WEBMD-001~015) · §5 범위 밖 · §7 AC 매트릭스
- `acceptance.md` — AC-WEBMD-001~016 의 Given-When-Then 과 테스트 코드
- `.moai/plans/ai-stateless-scroll.md` — 승인된 원 계획
- `.moai/specs/SPEC-WEBCHAT-001/spec.md` §5 · REQ-WEBCHAT-004 · `acceptance.md` AC-WEBCHAT-003
- `.moai/specs/SPEC-WEBRICH-001/plan.md` §C — `web/rich.d.ts` 가 필요했던 같은 근거
