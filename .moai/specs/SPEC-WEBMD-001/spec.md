---
id: SPEC-WEBMD-001
title: "웹 채팅 본문 마크다운 렌더링 — 라이브러리 없이, innerHTML 없이"
version: "0.2.1"
status: draft
created: 2026-09-08
updated: 2026-09-08
author: manager-spec
priority: P2
phase: "v2.2.0 target"
module: "web/"
lifecycle: spec-anchored
tags: "web-ui, markdown, xss-safety, vanilla-js, dom-builder, jsdom, css-contract"
tier: M
depends_on: [SPEC-WEBCHAT-001]
related_specs: [SPEC-WEBRICH-001]
---

# SPEC-WEBMD-001 — 웹 채팅 본문 마크다운 렌더링

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-09-08 | 최초 작성. 승인된 구현 계획 `.moai/plans/ai-stateless-scroll.md` 를 GEARS 요구사항 15개와 수용 기준 16개로 옮겼다(Tier M 상한 16/16). 계획서가 적은 자리는 전부 현재 `main` 의 코드와 **내용 앵커**로 대조해 확인했다 — `web/app.js` 의 `body.className = 'msg-body'` 절(383행, 계획서는 렌더 지점을 384행이라 적었고 `body.textContent = m.body ?? ''` 는 실제 384행이므로 일치), `web/style.css` 의 유일한 `pre-wrap`(309행, `.msg-body` 블록 307행), `#invite-command`(535행), `web/rich.js` 의 `REQUEST_LINE_RE`(53행)·`RESOLUTION_RE`(69행)·`verdict-row`(130행), `server/tsconfig.json` 의 `include: ["src","test"]` 에 `allowJs` 없음, `.github/workflows/ci.yml` 27행 `npm run typecheck -w server`, `server/src/routes-messages.ts` 123행 `LIMIT 200`, `web/design-tokens.css` 의 쓸 토큰 전부. **계획서와 어긋난 자리 하나를 고쳤다** — 계획서 §「기존 테스트 회귀 판정」은 `.msg-body` 단언을 «6군데»라 적었으나 `server/test/web-chat.test.ts` 에서 `textContent` 를 읽는 자리는 **일곱**(183·226·290·313·333·433·828행)이고, 그 밖에 구조 개수를 세는 자리(269행 `.message > .msg-body` 개수 2)가 하나 더 있어 `.msg-body` 를 보는 단언 자리는 **여덟**이다. 판정은 바뀌지 않는다(여덟 모두 안전) — 수가 틀렸을 뿐이다. 이후 문서는 고정 숫자 대신 **세는 명령**을 싣는다. | manager-spec |
| 0.2.0 | 2026-09-08 | plan 감사 1회차(PASS 0.879, Tier M 통과선 0.80) 의 차단 2건과 비차단 8건 수리. **차단 D1** — REQ-WEBMD-008 의 「라벨이 URL 처럼 생겼다」 판별 술어가 미정의라 `^https?://` 로만 구현해도 모든 기준을 통과했다(실제 피싱에 가장 흔한 스킴 없는 라벨을 한 번도 잡지 못한다). 술어를 정규식으로 못박고 스킴 없는 라벨의 호스트 파싱 방법을 정했으며, AC-WEBMD-008 에 절 둘(스킴 없는 위장 라벨은 힌트 필수 · URL 형이 아닌 라벨은 힌트 금지)을 더했다. 같은 부류인 **D5**(REQ-006 정제 집합의 절반에 기준이 없음)도 함께 닫았다 — AC-WEBMD-006 에 BOM·제로폭·방향 제어가 앞에 붙은 **정상 URL 이 정제 뒤 통과**하는 양성 방향 단언을 더해, fail-closed 라 판별력이 없던 음성 방향을 보강했다. **차단 D2** — `plan.md` §D.2 와 이 문서 REQ-WEBMD-015 의 확인 명령이 없는 경로(`e2e`)를 가리켜 E2E 쪽을 한 번도 검색하지 못했다. `server/test scripts` 로 고치고 실제 실행 출력(적중 `server/test/web-chat.test.ts` 하나)을 함께 실었다. 비차단: D3 요소 이름 축을 REQ-WEBMD-005 에 신설하고 AC-WEBMD-007 에 기계 검사 추가 · D4 AC-WEBMD-011 (3) 의 공허한 문자열 불변 단언을 `doc` 비변형 관측으로 교체(REQ-WEBMD-012 라벨도 Unwanted 로 정정, D6) · D7 부하 민감한 누적 시간 상한을 러너 타임아웃 기반 **종료** 판정으로 교체 · D8 DoD 의 `skipped 0` 에 `web-visual.test.ts` 의 의도된 skip 예외 명시 · D9 문서 불일치 넷(`4px`→`var(--md-space-1)`, `codeLangToken` 인자 형 고정, `JS`/`c++` 표기 통일, `plan.md` §D.2 자기 규칙 문장 정정) · D10 AC-WEBMD-010 의 고정 파일 목록을 `readdirSync` 도출로 교체. REQ 15 / AC 16 불변(Tier M 상한 16/16) — D1 의 두 절은 새 기준이 아니라 AC-WEBMD-008 **안의** 절로 넣었다. | manager-spec |
| 0.2.1 | 2026-09-08 | plan 감사 2회차(수리 검증) **PASS 0.936 · 남은 차단 0건** 뒤, optional 로 분류된 잔여 넷 가운데 둘 반영. ① AC-WEBMD-008 에 「맨 호스트」 절 추가 — 기존 절이 스킴 없는 방향으로 슬래시형과 `www.`형만 먹여, 술어를 그 둘로 좁힌 구현이 `[good.example](https://evil.example)` 를 놓치면서도 모든 절을 통과했다(REQ-WEBMD-008 위반이 기계로 안 잡히는 상태). ② Definition of Done 의 과대주장 정정 — 「테스트가 하나도 실행되지 않아도 종료 코드가 0 이 되는 경로를 이 조건이 막는다」는 거짓이었다(0건 실행은 `failed` 0 과 skip 조건을 그대로 만족한다). 반영하지 않은 둘은 앞공백 축의 두 갈래(어느 쪽이든 안전 방향)와 비ASCII 동형이의 위장(별도 카드 범위)이다. 2회차는 **1회차 권고를 따르지 않은 두 자리(D4·D5)를 수리자가 옳다고 판정**했다 — 1회차 대체안이 스스로 공허했고, 음성 방향은 fail-closed 라 판별력이 없다는 것이 실행으로 확인됐다. REQ 15 / AC 16 불변. | manager-spec |

---

## 1. 배경과 목적

지금 웹 채팅 화면은 봇이 보낸 마크다운 글을 **글자 그대로** 보여 준다. `**보고서 요지**` 가 별표째 노출되고 목록·코드블록·표가 평문으로 뭉개진다. 렌더링 지점은 코드 전체에서 한 줄이다 — `web/app.js` 의 `renderMessage` 안 `body.textContent = m.body ?? ''`(384행).

이 SPEC 이 끝나면 이렇게 된다.

```
서버 페이로드 m.body (마크다운 원문 문자열, 신뢰 경계 밖)
   → renderMessage(m)
   → renderMarkdown(raw, document)      web/markdown.js
        ├ normalizeSource   문자열 → 줄 배열 (상한 적용)
        ├ parseBlocks       줄 배열 → 순수 객체 AST (재귀: 인용·목록)
        └ buildBlock        AST → DOM (createElement + textContent 전용)
             └ renderInline 문자 단위 단일 패스 → 노드 생성
   → DocumentFragment → body.appendChild(...)
   (던지면) → body.textContent = raw · class md-fallback · console.warn
```

**어려운 부분은 성능이 아니라 안전성이다.** 성능 걱정은 실측 근거로 이미 해소돼 있다 — 메시지는 SSE 로 **완성된 채 한 개씩** 도착하고(스트리밍 재렌더 없음) 방 이력은 서버가 `LIMIT 200`(`server/src/routes-messages.ts` 123행)으로 제한하므로 총 파싱 대상은 100~400KB 수준의 단일 패스다.

반면 이 프로젝트는 «사용자·봇·시스템 문자열은 전부 `textContent` 로만»(`REQ-WEBCHAT-004`)을 SPEC 수준에서 못박아 두었고, 봇 본문은 신뢰 경계 밖 문자열이다. 이 SPEC 은 그 규범을 **우회하지 않고 더 강한 형태로 계승**한다(§3.2).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 본문 | 메시지의 `m.body` 문자열. `.msg-body` 요소 안에 그려지는 것 |
| 렌더러 | `web/markdown.js` 모듈 전체 |
| 진입점 | `renderMarkdown(src, doc = document)` — 밖에서 부르는 유일한 함수 |
| 블록 | 문단·제목·코드블록·목록·인용·표·수평선 가운데 하나. AST 노드 하나 |
| 인라인 | 블록 안의 강조·코드스팬·링크·자동링크·취소선 |
| 리터럴화 | 마커를 못 닫은 입력을 문법으로 해석하지 않고 원문 글자 그대로 텍스트 노드로 남기는 것 |
| 폴백 | 렌더가 예외를 던졌을 때 `.msg-body` 를 원문 텍스트로 되돌리고 `md-fallback` 클래스를 붙이는 경로 |
| 라벨 위장 | `[https://good.example](https://evil.example)` 처럼 링크 라벨이 href 와 다른 URL 을 흉내 내는 것 |
| 속성 화이트리스트 | 렌더러가 설정할 수 있는 속성 이름 다섯 — `href` · `rel` · `target` · `title` · `class` |

## 3. 선행 SPEC 과의 관계

### 3.1 `SPEC-WEBCHAT-001` 의 비목표 **한 항목만** 대체한다

`SPEC-WEBCHAT-001` 은 **고치지 않는다**(HISTORY 한 줄을 더하는 것은 오케스트레이터가 sync 에서 한다). 그 SPEC 의 §5 「Out of Scope — 시각·상호작용 심화」에 있는

> 마크다운 렌더링, 코드 블록 하이라이트, 이모지 치환, 링크 자동 변환. 본문은 `white-space: pre-wrap` 텍스트로만 보여 준다

이 **한 항목만** 이 SPEC 이 상위 규정한다. 그 항목은 «Tier M 예산과 Task 16 범위»라는 당시의 판단 기록이지 영구 금지가 아니다. 다만 **같은 절의 나머지 비목표는 전부 그대로 유효하다** — 같은 작성자의 연속 메시지 그룹핑, 자동완성 키보드 탐색(이미 `SPEC-WEBACNAV-001` 이 가져갔다), 읽음 표시, 타이핑 인디케이터, 알림·사운드, 메시지 수정·삭제·검색, 무한 스크롤, 시각 문자열의 지역 시간 변환, 모바일 반응형 레이아웃. 이 SPEC 은 그 가운데 어느 것도 하지 않는다.

이 항목 안에서도 **이모지 치환과 코드 블록 문법 하이라이트는 여전히 하지 않는다**(§5). 대체되는 것은 «마크다운 렌더링»과 «링크 자동 변환» 두 가지뿐이다.

### 3.2 `REQ-WEBCHAT-004` 는 폐기가 아니라 **강화 계승**이다

그 요구사항의 실질은 «신뢰 경계 밖 문자열을 마크업 파서에 넘기지 말라»이고 `textContent` 는 그 수단이었다. 이 SPEC 이 재서술하는 형태는 REQ-WEBMD-005 가 전문을 갖는다. 요지 셋:

1. `innerHTML` · `outerHTML` · `insertAdjacentHTML` · `document.write` · `Range.createContextualFragment` **전면 금지**. 컨테이너를 비우는 `innerHTML = ''` 하나만 허용한다.
2. 작성자 이름 · 봇 이름 · 방 이름 · 시각은 **변경 없이** `textContent` 전용이다.
3. 새로 허용되는 것은 오직 `.msg-body` **안쪽**의 `createElement` + `textContent` 노드 트리이며, 모든 leaf 텍스트는 `textContent`/`createTextNode` 로만 들어가고 속성은 화이트리스트 다섯(`href`·`rel`·`target`·`title`·`class`)에만 설정된다.

그 결과 `server/test/web-chat.test.ts` 313행의 `AC-WEBCHAT-003`(«마크업으로 해석되지 않는다»)은 **한 글자도 고치지 않고 그대로 통과**하며 이 SPEC 의 안전성 회귀 방어선으로 자동 승계된다 — 그 본문(`<img src=x onerror=…><b>굵게</b>`)에는 마크다운 마커가 없어 순수 텍스트 문단이 되고, 렌더러는 `img` 를 만들지 않으며 굵게는 `<b>` 가 아니라 `<strong>` 으로 만든다.

### 3.3 그대로 받아 쓰는 것

| 출처 | 받아 쓰는 것 | 확인한 자리 |
|------|-------------|------------|
| `SPEC-WEBCHAT-001` | `renderMessage(m)` 의 구조 — `.message > (.msg-head > strong+span, .msg-body)` 와 `wrap.appendChild(head/body)` 순서 | `web/app.js` 364~394행 |
| `SPEC-WEBCHAT-001` | 장식 훅 호출 지점 `roomDecorator.decorate(wrap, m)` | `web/app.js` 391행. **순서를 한 글자도 바꾸지 않는다** |
| `SPEC-WEBRICH-001` | `doc` 를 인자로 받는 관례(`buildAttachmentNode(att, doc)`)와 형 선언 파일 관례(`web/rich.d.ts`) | `web/rich.js` · `web/rich.d.ts` 4~5행 주석에 근거 기록됨 |
| `SPEC-WEBRICH-001` | 권한 릴레이 정규식 둘 — 원본 `m.body` 를 읽는다 | `web/rich.js` 53행 `REQUEST_LINE_RE` · 69행 `RESOLUTION_RE` · 130행 `verdict-row` |
| `SPEC-PERM-001` | 권한 요청/판정 시스템 메시지 문구 | 서버 `permissions.ts`. **한 글자도 고치지 않는다** |
| `web/design-tokens.css` | `--md-bg-panel` · `--md-bg-input` · `--md-bg-sidebar` · `--md-divider` · `--md-text-muted` · `--md-text-link` · `--md-radius-input` · `--md-radius-badge` · `--md-font-size-label` · `--md-border-width` · `--md-space-1~5` | 전부 `:root` 에 있음을 읽어 확인했다. **새 토큰은 만들지 않는다** |

---

## 4. 요구사항 (GEARS)

### 4.1 모듈과 적용 범위

**REQ-WEBMD-001** (Ubiquitous — 모듈 표면)
`web/markdown.js` 는 정확히 다섯 개의 함수를 export 해야 한다. 나머지는 모듈 내부다.

```js
export function renderMarkdown(src, doc = document) -> DocumentFragment  // 유일한 진입점
export function parseBlocks(lines, depth = 0) -> Block[]                 // 관측용 (AST)
export function renderInline(text, doc) -> DocumentFragment              // 관측용
export function safeHref(raw) -> string | null                           // 관측용 (안전성 단언의 핵심)
export function codeLangToken(info: string | undefined) -> string | null // 관측용
```

`codeLangToken` 의 인자 형이 `string | undefined` 인 것은 선택이 아니다 — 언어 라벨이 없는 펜스(` ``` ` 뒤가 빈 줄)에서 호출부가 `undefined` 를 넘기고, `acceptance.md` AC-WEBMD-009 가 그 호출을 직접 먹인다. `web/markdown.d.ts` 가 이 인자를 `info: string` 으로 좁히면 그 단언 줄이 `npm run typecheck -w server`(AC-WEBMD-015 가 종료 코드 0 을 요구한다)에서 붉어지므로, 두 기준이 서로 충돌하지 않도록 여기서 형을 못박는다.

`web/markdown.d.ts` 는 **반드시 함께 있어야 한다.** `server/tsconfig.json` 은 `include: ["src","test"]` 에 `allowJs` 가 없으므로 테스트의 `import … from '../../web/markdown.js'` 는 형 선언 파일을 통해서만 typecheck 를 통과한다. `web/rich.d.ts` 가 같은 이유로 존재하는 선례이며, CI 가 `npm run typecheck -w server` 를 돌리므로(`.github/workflows/ci.yml` 27행) 이 파일이 없으면 CI 가 빨간불이 된다.

**REQ-WEBMD-002** (Ubiquitous — 적용 범위)
렌더링은 `author_type` 과 무관하게 **모든 메시지**(사용자 · 봇 · 시스템)의 `.msg-body` 안쪽에만 적용돼야 한다. 작성자 이름 · 봇 이름 · 방 이름 · 시각 · 봇 칩 · 자동완성 후보에는 마크다운이 적용되지 않는다. `wrap.appendChild(head)` → `wrap.appendChild(body)` → `roomDecorator.decorate(wrap, m)` 의 순서는 바뀌지 않으며, 장식 훅이 더하는 노드는 `.msg-body` **밖 형제**로 남는다.

**REQ-WEBMD-003** (Ubiquitous — 지원 문법)
렌더러는 아래 문법만 해석해야 한다. 목록에 없는 마커는 리터럴이다.

| 문법 | 산출 | 비고 |
|------|------|------|
| `#`~`######` + 공백 | `h1`~`h6` (class `md-h`) | `#######`(7개)은 문단 |
| `**굵게**` / `*기울임*` / `~~취소선~~` | `strong` / `em` / `s` | 닫는 마커가 없으면 **즉시 리터럴** |
| `` `인라인코드` `` | `code.md-code` | 인라인 우선순위 **최상위** — 코드스팬 안의 `**` 는 강조가 아니다 |
| ` ``` ` 펜스 | `pre.md-pre > code` + 언어 라벨 | 입력 끝에서 자동 종료. 코드 안 `#`·`|`·`-` 미해석 |
| `-`/`*`/`+` · `1.` | `ul.md-ul` / `ol.md-ol` + `li.md-li` | 들여쓰기 2칸 이상은 하위 블록으로 재귀(중첩·항목 내 코드블록) |
| `>` | `blockquote.md-quote` | 접두 제거 후 재귀 |
| `[텍스트](url)` · 자동링크 | `a` | http/https 만 (REQ-WEBMD-006) |
| `---` (3개 이상) | `hr.md-hr` | setext 제목은 지원하지 않으므로 `---` 는 **항상** 수평선 |
| GFM 표 | `div.md-table-wrap > table.md-table` | 다음 줄이 구분 행일 때만 표(1줄 lookahead). 정렬 `:---`/`:---:`/`---:` |

블록 스캐너의 시도 순서는 `plan.md` §B 가 정한다 — `scanFence` 가 **반드시 최우선**이다.

**REQ-WEBMD-004** (Unwanted — 이미지 금지)
렌더러는 `img` 요소를 **어떤 경로로도 만들어서는 안 된다.** `![alt](url)` 은 지원 문법이 아니므로 그 원문은 리터럴 텍스트로 남는다(`!` 뒤의 `[alt](url)` 이 링크로 해석되는 것도 허용하지 않는다 — 원문 전체가 텍스트다). 이미지 생성은 `SPEC-WEBRICH-001` 의 첨부 경로가 독점한다.

### 4.2 안전성 — `innerHTML` 회피만으로는 부족한 다섯 지점

**REQ-WEBMD-005** (Unwanted — 마크업 API 금지, `REQ-WEBCHAT-004` 강화 계승)
`web/` 아래 어떤 파일도 `innerHTML`(대입) · `outerHTML` · `insertAdjacentHTML` · `document.write` · `Range.createContextualFragment` 를 **써서는 안 된다.** 유일한 예외는 컨테이너를 비우는 `innerHTML = ''` 이며, 이는 이 SPEC 이 새로 여는 것이 아니라 **기존에 이미 허용돼 있던 그대로**다.

추가로 렌더러는:

- 모든 leaf 텍스트를 `textContent` 또는 `createTextNode` 로만 넣는다.
- **`createElement` 에 넘기는 태그 이름은 항상 문자열 리터럴이다.** 변수·표현식으로 태그 이름을 정하지 않으며, 렌더러가 만드는 요소는 REQ-WEBMD-003 산출 표에 열거된 것뿐이다 — 즉 `p` · `h1`~`h6` · `strong` · `em` · `s` · `code` · `pre` · `ul` · `ol` · `li` · `blockquote` · `div` · `table` · `thead` · `tbody` · `tr` · `th` · `td` · `hr` · `a` · `br` · `span`. `img` · `script` · `iframe` · `object` · `embed` · `style` · `form` 은 **어떤 경로로도 만들지 않는다.** 속성 이름 축을 화이트리스트로 묶는 것과 같은 이유다 — `codeLangToken` 이 통과시키는 토큰이나 그 밖의 입력 유래 문자열이 태그 이름으로 흘러갈 구멍을 구조적으로 닫는다.
- 속성은 화이트리스트 다섯(`href` · `rel` · `target` · `title` · `class`)에만 설정한다. **공격자가 통제하는 문자열을 속성 *이름* 으로 쓰는 형태(`setAttribute(공격자문자열, …)`, `dataset[공격자키]`)는 모듈 전체에 없다** — `on*` 이벤트 핸들러 주입의 유일한 통로를 구조적으로 닫는다.
- 작성자 이름 · 봇 이름 · 방 이름 · 시각의 `textContent` 전용 규칙을 **변경 없이** 그대로 둔다.

**REQ-WEBMD-006** (Ubiquitous — URL 스킴 세 겹 검사)
`safeHref(raw)` 는 세 단계를 **이 순서로** 거쳐 `string | null` 을 돌려줘야 한다.

1. **사전 정제** — 제어문자와 보이지 않는 공백·BOM·방향 제어 문자를 제거한다. 브라우저는 스킴 안의 TAB/LF/CR 을 무시하므로 정제 **전에** 판정하면 `java<TAB>script:` 가 순진한 접두 검사를 통과한다. 정제가 판정보다 먼저여야 한다.
2. **화이트리스트** — 정제된 문자열이 `^https?://` 에 맞지 않으면 `null`. 상대 경로(`/relative`), 프로토콜 상대(`//evil.example/x`), 조각(`#frag`) 도 전부 거부된다.
3. **URL 파서 재확인** — `new URL(cleaned)` 이 던지면 `null`, `protocol` 이 `http:`/`https:` 가 아니면 `null`. 통과하면 `u.href` 를 돌려준다.

`null` 인 링크에 대해 렌더러는 **`a` 요소를 만들어서는 안 되며** `[텍스트](url)` **원문을 텍스트로 남긴다** — 죽은 링크를 만들지도, 조용히 삼키지도 않는다.

**REQ-WEBMD-007** (When 링크 요소를 만들 때 — 속성)
`a` 를 만들 때 구현은 `rel` 에 **`noopener` 와 `noreferrer` 를 모두** 포함시키고 `target="_blank"` 를 설정하며 `title` 에 진짜 href 를 넣어야 한다. `noopener` 가 없으면 새 탭이 `window.opener` 로 원본 창을 조작하는 탭내빙이 열린다.

**REQ-WEBMD-008** (When 링크 라벨이 URL 을 흉내 낼 때 — 진짜 호스트 표시)
`[https://good.example](https://evil.example)` 는 완전히 정상적인 마크다운이라 **파서로는 막을 수 없다.** 방어는 표시층이다. 라벨이 URL 처럼 생겼는데 그 호스트가 href 의 호스트와 다르면 구현은 링크 뒤에 `span.md-link-host` 로 **진짜 호스트를 붙여야 한다.**

「URL 처럼 생겼다」는 판별 술어를 구현 재량으로 남기지 않는다. 스킴이 붙은 라벨만 잡는 술어(`^https?://`)는 실제 피싱에서 가장 흔한 형태인 **스킴 없는 라벨**(`[good.example/settings](https://evil.example/x)`)을 한 번도 잡지 못하므로, 정의역이 위협보다 좁아진다. 술어는 다음 정규식이다.

```js
const URL_LIKE_LABEL_RE = /^\s*(https?:\/\/|[a-z0-9-]+(\.[a-z0-9-]+)+(?=[:\/?#]|\s*$))/i
```

- 첫 갈래는 **스킴이 붙은 라벨**을 무조건 URL 형으로 본다(`https://` 만 있고 호스트가 없는 라벨도 여기 걸린다 — 아래 fail-loud 로 이어진다).
- 둘째 갈래는 **스킴 없는 호스트 형태**를 잡는다. 점으로 이어진 라벨 계열 뒤에 `:` `/` `?` `#` 이 오거나 라벨이 거기서 끝날 때만 맞는다 — `good.example/settings` · `www.good.example` 은 잡히고, `보고서 보기` 처럼 URL 형이 아닌 평범한 문장은 잡히지 않는다.
- **호스트 비교 방법.** 라벨에 스킴이 없으면 `https://` 를 앞에 덧대어 `new URL()` 로 파싱하고 그 `host` 를 href 의 `host` 와 견준다. 스킴이 있으면 라벨을 그대로 파싱한다.

- 라벨의 호스트를 파싱하지 못하면(`new URL()` 이 던지면) **힌트를 표시하는 쪽으로** 떨어진다(fail-loud). 조용히 넘어가는 것이 아니라 의심스러우면 드러낸다.
- 술어가 아닌 라벨 — 즉 URL 형이 아닌 평범한 문장 — 에는 **힌트를 붙이지 않는다.** 이 조항이 없으면 「모든 링크에 힌트」 구현이 규범 위반이 아니게 되고, 힌트가 흔해져 정작 위장 사례에서 눈에 띄지 않는다.
- 자동링크는 라벨과 href 가 같으므로 힌트를 붙이지 않는다.
- 링크 **라벨 안의** 방향 제어 문자(RTL override 류)는 치환 문자로 바꾼다. 라벨에만 적용하며 본문 원문 보존(REQ-WEBMD-010 의 평문 항등)을 깨지 않는다.

**REQ-WEBMD-009** (Ubiquitous — 코드블록 언어 토큰 검증)
`codeLangToken(info)` 는 정보 문자열의 **첫 공백 구분 단어만** 취해 `^[A-Za-z0-9][A-Za-z0-9+#._-]{0,19}$` 로 검사하고, 통과하면 소문자화한 토큰을, 아니면 `null` 을 돌려줘야 한다. 사용부는 **고정 접두사**로만 클래스를 만든다(`md-lang-<토큰>`).

검증이 없으면 실제 피해가 둘이다 — ① 공격자가 `hidden msg-body verdict-row` 같은 **이 앱의 기존 클래스**를 얻어 UI 를 숨기거나 위장한다 ② `classList.add` 가 빈 토큰이나 공백을 품은 토큰에 `DOMException` 을 던져 **렌더 전체가 폴백으로 떨어진다.** `dataset` 도 키가 공격자 통제면 임의 속성이 되므로 쓰지 않는다.

### 4.3 줄바꿈 · 폴백 · 불변

**REQ-WEBMD-010** (Ubiquitous — 줄바꿈 책임 이동과 공백 계약)
`.msg-body` 의 `white-space: pre-wrap`(`web/style.css` 309행, 파일 전체에서 유일한 사용처)은 **제거되고**, 줄바꿈은 렌더러가 노드로 표현해야 한다.

- 빈 줄 = 문단 경계 → `p.md-p` 두 개 (간격은 CSS margin 이 진다)
- 문단 안의 단일 개행 = 하드 브레이크 → `br`. GFM 이 아니라 **채팅 관례**를 따른다 — Enter 한 번이 무시되면 사용자는 버그로 인식한다
- 파서는 **블록 사이에 텍스트 노드를 만들지 않는다.** DocumentFragment 의 맨 앞과 맨 뒤에 공백 텍스트 노드가 없어야 한다
- `pre` 안에서만 `white-space: pre` 로 국소 복원하고, 폴백(`.md-fallback`)에만 `pre-wrap` 을 되살린다
- **평문 항등** — 마크다운 마커가 없는 한 줄 입력에 대해 `renderMarkdown(src).textContent === src` 여야 한다. 앞뒤 어느 쪽에도 공백·개행이 덧붙지 않는다

**REQ-WEBMD-011** (When 렌더가 예외를 던질 때 — 폴백)
`renderMessage` 안의 렌더 호출은 `try`/`catch` 로 감싸고, 예외가 나면 구현은 `.msg-body` 의 `textContent` 를 원문으로 되돌리고 `md-fallback` 클래스를 붙이며 `console.warn` 을 남겨야 한다.

근거는 실패 모드의 비대칭이다 — `renderMessage` 는 이력 루프(`web/app.js` 265행)와 SSE 수신(445·466행)의 **동기 경로**라, 여기서 예외가 나가면 메시지 한 개가 아니라 **그 뒤 전부**가 사라진다. 이 프로젝트는 «훅이 던지면 삼키지 않는다»(391행 위 주석)를 관례로 두지만 그것은 *남의 모듈* 계약 위반을 감추지 말라는 규범이고, 여기는 *우리 모듈* 의 예상 못한 입력 방어다. 대신 **조용히 삼키지 않는다** — 클래스와 경고로 관측 가능하게 남기고 AC-WEBMD-012 가 그 경로를 직접 판정한다.

**REQ-WEBMD-012** (Unwanted — 권한 릴레이 불변)
`renderMarkdown` 은 인자로 받은 것 — 원문 문자열과 `doc` — 을 **변형해서는 안 된다.** 만든 노드는 반환하는 `DocumentFragment` 안에만 들어가며, `doc` 의 기존 트리에 직접 붙이지 않는다. `web/rich.js` 의 `REQUEST_LINE_RE`(53행)와 `RESOLUTION_RE`(69행)는 서버 페이로드의 **원본 `m.body`** 를 읽으므로, 승인/거절 버튼(`verdict-row`, 130행)의 판정은 이 SPEC 이 들어와도 바뀌지 않아야 한다.

- 위장 방향은 fail-closed 다 — 봇이 마커 줄을 강조 마크업으로 감싸면 그 줄은 애초에 정규식에 걸리지 않는다(가짜 요청으로 버튼을 띄울 수 없다, 오늘과 같다).
- 새로 생기는 것은 **표시-진실 괴리** 하나다: 봇이 미닫힘 펜스를 앞에 넣으면 진짜 요청 줄이 코드블록 안에 그려진다. 버튼은 원문 기준이므로 승인 흐름 자체는 안전하다.
- **파서 상태는 메시지마다 완전히 초기화되므로 크로스-메시지 펜스 오염은 구조적으로 불가능하다** — 미닫힘 펜스는 그 입력의 끝에서 자동 종료되고 다음 `renderMarkdown` 호출은 상태를 물려받지 않는다.

**REQ-WEBMD-013** (When 입력이 상한을 넘을 때 — DoS 방어)
구현은 아래 상한을 넘는 입력에 대해 **유한 시간 안에 반환**해야 한다. 이것은 성능 최적화가 아니라 적대적 입력에 대한 방어다.

| 축 | 상한 | 초과 시 |
|----|------|--------|
| 입력 길이 | 20,000자 | 잘라내고 잘림 표시를 남긴다 |
| 블록 재귀 깊이 | 6 | 남은 줄을 문단으로 처리 |
| 인라인 재귀 깊이 | 4 | 남은 텍스트를 리터럴로 처리 |
| 표 | 50열 / 500행 | 초과분을 버린다 |

### 4.4 시각과 회귀

**REQ-WEBMD-014** (Ubiquitous — CSS 규칙과 토큰)
`web/style.css` 의 새 규칙은 `md-` 접두 클래스에만 붙어야 하며 **색·간격·모서리는 전부 `web/design-tokens.css` 의 기존 `var(--md-*)` 토큰**으로만 적는다. **새 색 토큰을 만들지 않으며 16진수 색 리터럴을 쓰지 않는다.** 코드블록 표면은 `#invite-command`(`web/style.css` 535행, `--md-bg-sidebar` + `overflow-x: auto`)의 선례를 따른다. 규칙 전체는 `plan.md` §C 의 표가 갖는다.

긴 표의 가로 스크롤은 두 규칙이 함께 만든다 — `.md-table-wrap { overflow-x: auto; max-width: 100% }` 와 `.md-table { width: max-content; min-width: 100% }`. **`max-content` 가 없으면 셀이 눌려서 스크롤이 생기지 않는다.**

**REQ-WEBMD-015** (Unwanted — 기존 테스트를 고치지 않는다)
구현은 `server/test/web-chat.test.ts` · `web-rich.test.ts` · `web-shell.test.ts` · `web-permission-contract.test.ts` 를 **한 글자도 고쳐서는 안 된다.** 네 파일은 수정 없이 통과해야 한다 — 통과시키려고 단언을 바꾸는 것은 금지이며, 수정이 필요해지면 그것은 설계 오류 신호다.

`web-chat.test.ts` 에서 `.msg-body` 를 보는 단언 자리는 명령으로 센다(`grep -n "msg-body" server/test/web-chat.test.ts`) — `textContent` 를 읽는 자리 일곱과 구조 개수를 세는 자리 하나다. 전부 안전한 이유는 `plan.md` §D 의 표가 자리마다 적는다.

`.msg-body` 를 보는 **다른** 파일이 있는지는 아래 명령이 판정한다. 검색 범위는 `server/test` 와 `scripts` 다 — E2E 코드는 `scripts/e2e.mts` · `scripts/e2e-scenario.mts` · `scripts/e2e-lib.mts` 에 살고(`package.json` 의 `"e2e": "npx tsx scripts/e2e.mts"`), `e2e` 라는 디렉터리는 이 저장소에 없다.

```
$ grep -rln "msg-body" server/test scripts
server/test/web-chat.test.ts
```

적중이 이 한 파일뿐이므로 REQ-WEBMD-015 가 고정하는 네 파일 밖에서 `.msg-body` 를 보는 단언은 없다.

---

## 5. 범위 밖 (Exclusions)

이 SPEC 이 **하지 않는 것**이다. 아래가 구현에 섞여 들면 범위 위반이다.

### Out of Scope — 문법 확장

- 코드블록 안의 문법 하이라이트. 언어 라벨을 표시하고 `md-lang-<토큰>` 클래스를 붙이는 데서 멈춘다 — 토크나이저를 넣지 않는다.
- `![alt](url)` 이미지 문법(REQ-WEBMD-004 가 금지로 못박는다).
- 각주 · 정의 목록 · 작업 목록(`- [ ]`) · 이모지 단축어(`:smile:`) · 수식(`$…$`) · HTML 통과(raw HTML passthrough).
- setext 제목(`===`/`---` 밑줄). `---` 는 항상 수평선이다.

### Out of Scope — 적용 지점

- 작성기(`#msg-input`)의 쓰기 쪽 미리보기. 마크다운은 읽기 쪽에만 산다.
- 작성자 이름 · 봇 이름 · 방 이름 · 자동완성 후보의 마크다운. 그 자리는 `textContent` 전용 그대로다(REQ-WEBMD-005).
- `web/rich.js` 의 첨부·모달·권한 버튼 표면. 이 SPEC 은 그 파일을 고치지 않는다.
- `verdict-row` 버튼 옆에 request id 를 노출하는 것. 표시-진실 괴리를 근본적으로 없애려면 값어치가 있으나 **이번 SPEC 에서는 하지 않는다**(별도 카드 후보).

### Out of Scope — 성능 완화 (의도적 부재)

아래는 빠뜨린 것이 아니라 **없는 문제에 대한 과잉 설계라서 넣지 않기로 정한 것**이다. 판단 근거는 실측이다 — 메시지는 SSE 로 완성된 채 도착해 부분 재렌더가 없고, 방 이력은 서버가 `LIMIT 200`(`server/src/routes-messages.ts` 123행)으로 제한하므로 총 파싱 대상은 100~400KB 수준의 줄·문자 단위 단일 패스다.

- 파싱 결과 캐시 · 메모이제이션
- 가상 스크롤
- `requestIdleCallback` 분할 렌더 · 프래그먼트 일괄 삽입 배치
- 렌더 시간 계측과 그에 따른 적응적 저하

나중에 이 SPEC 을 읽는 사람이 이 부재를 **누락으로 오독하지 않도록** 여기에 명시한다. 실제 지연이 관측되면 그때 근거와 함께 별도 SPEC 이 정한다.

### Out of Scope — 형제 SPEC 이 이미 소유한 것

- `SPEC-WEBCHAT-001` §5 의 나머지 비목표 전부(§3.1). 그룹핑 · 읽음 표시 · 무한 스크롤 · 지역 시간 변환 · 모바일 반응형은 그대로 유효하다.
- 서버 계층 전체. `server/src/` 아래 소스 파일을 한 줄도 고치지 않는다(새 테스트 파일 하나만 더한다).

---

## 6. 제약

| 제약 | 내용 |
|------|------|
| 의존성 | **외부 라이브러리 없음.** 런타임 의존성을 더하지 않는다. `web/markdown.js` 는 손으로 쓴다 |
| 실행 형태 | 빌드 단계·번들러 없는 바닐라 ES 모듈. 브라우저가 그대로 읽는다 |
| 개발 방식 | TDD (`quality.yaml` `development_mode: tdd`). A·B 그룹 테스트가 먼저 실패해야 한다 |
| 테스트 | 새 파일 `server/test/web-markdown.test.ts`. 1행에 `// @vitest-environment jsdom` 도크블록, `web/` 소스 직접 import (`server/test/web-rich.test.ts` 11행 관례 그대로) |
| 형 검사 | `web/markdown.d.ts` 필수. `npm run typecheck -w server` 가 판정한다 |
| 색 | `var(--md-*)` 만. 새 토큰 0개, 16진수 리터럴 0건 |
| 언어 | UI 문구·코드 주석 한국어. 커밋 메시지는 영어 관례 |
| 육안 확인 | jsdom 은 레이아웃을 계산하지 않아 `overflow-x` 를 기계로 판정할 수 없다. 실브라우저 확인은 **수동이며 판정 기준이 아니다**(자동으로 위장한 수동 검사를 두지 않는다) |

---

## 7. 수용 기준

전문은 `acceptance.md` 에 있다(Given-When-Then 과 테스트 코드). 열여섯 기준 전부 기계 판정이다.

| ID | 요구사항 | 관측할 결과 |
|----|----------|-------------|
| AC-WEBMD-001 | REQ-003 | 제목 6단·`#######` 문단 · 강조 3종 · 미닫힘 마커 리터럴 · 코드스팬이 강조보다 우선 |
| AC-WEBMD-002 | REQ-003, REQ-009 | 펜스: 언어 라벨 `md-lang-js`, 미닫힘 자동종료, 코드 안 `#`·`|` 미해석, 코드 본문 원문 정확 일치 |
| AC-WEBMD-003 | REQ-003 | `ul`/`ol`(+`start`) · 중첩 2단 · 인용 중첩 · `---` 는 `hr`, `--` 는 문단 |
| AC-WEBMD-004 | REQ-003, REQ-014 | 표 정렬 3종 클래스 · `.md-table-wrap` 존재 · 구분 행 없으면 문단 |
| AC-WEBMD-005 | REQ-010 | `'a\n\nb'`→`p` 2개 · `'a\nb'`→`p` 1개+`br` 1개 · fragment 앞뒤 공백 텍스트 노드 0 · 평문 항등 |
| AC-WEBMD-006 | REQ-006 | `safeHref` 가 적대적 입력을 전부 `null`(제어문자·BOM·제로폭·방향 제어 변형 포함); **BOM·제로폭·방향 제어가 앞에 붙은 정상 URL 은 정제 뒤 통과**(정제 부재 구현을 배제); 차단된 링크는 `a` 0개이고 원문 텍스트가 남는다 |
| AC-WEBMD-007 | REQ-007, REQ-005 | `rel` 에 `noopener`·`noreferrer`, `target="_blank"`, `title`=href; 소스에 공격자 이름 `setAttribute` 0건 **그리고 리터럴 아닌 `createElement` 태그 이름 0건** |
| AC-WEBMD-008 | REQ-008 | 스킴 있는·**스킴 없는** 위장 라벨 둘 다 `.md-link-host` 에 진짜 호스트; **URL 형이 아닌 라벨엔 미표시**; 자동링크엔 미표시; 라벨 파싱 실패 시 표시; bidi 치환 |
| AC-WEBMD-009 | REQ-009 | `codeLangToken` 이 `hidden msg-body`·`<script>`·21자·빈 문자열·`undefined` 를 `null`, `JS`→`js`·`c++` 는 통과 |
| AC-WEBMD-010 | REQ-004, REQ-005 | `img` 0개 · `window.__pwned` undefined · `![alt](url)` 리터럴 · `web/` 의 **모든** `.js`(목록을 `readdirSync` 로 도출)에 금지 API 0건 |
| AC-WEBMD-011 | REQ-012 | 실제 브로커 4줄 본문 → `verdict-row` 버튼 2개; 미닫힘 펜스 접두 변형에서도 그대로; `doc` 비변형 |
| AC-WEBMD-012 | REQ-011 | 던지는 렌더러 주입 → 메시지가 사라지지 않고 `.md-fallback` + 원문; 이후 메시지도 계속 그려짐 |
| AC-WEBMD-013 | REQ-013 | `'>'.repeat(500)` · `'- '.repeat(500)` · `'*'.repeat(10000)` · 30,000자 입력이 **종료**한다(판정자는 테스트 러너의 타임아웃); 길이 상한 적용; 표 열/행 상한 |
| AC-WEBMD-014 | REQ-010, REQ-014 | `style.css`: `.msg-body` 블록에 `pre-wrap` 없음, `.md-fallback` 있음, `.md-table-wrap{overflow-x:auto}`, `.md-table` 에 `max-content`, 새 블록 16진수 색 0건 |
| AC-WEBMD-015 | REQ-001 | export 다섯 개 존재·`renderMarkdown` 이 `DocumentFragment` 반환; `npm run typecheck -w server` 종료 코드 0 |
| AC-WEBMD-016 | REQ-002, REQ-015 | 기존 웹 테스트 네 파일 diff 0줄; `npm test` 전체 초록; 장식 훅 노드가 `.msg-body` 밖 형제로 유지 |

## 8. 참조

- 승인된 구현 계획: `.moai/plans/ai-stateless-scroll.md`
- 대체하는 비목표 한 항목: `.moai/specs/SPEC-WEBCHAT-001/spec.md` §5 「Out of Scope — 시각·상호작용 심화」
- 강화 계승하는 요구사항: `.moai/specs/SPEC-WEBCHAT-001/spec.md` REQ-WEBCHAT-004, `acceptance.md` AC-WEBCHAT-003
- 형 선언 파일 선례: `web/rich.d.ts` 4~5행 주석
- 권한 릴레이: `web/rich.js` 53·69·130행, `.moai/specs/SPEC-PERM-001/spec.md`
- 디자인 토큰: `web/design-tokens.css`, `.moai/project/design-dna-discord.md`
