# 카드 t5 (M5 웹 UI) — plan 단계 적대적 감사

| 항목 | 값 |
|------|-----|
| 카드 | `t5` (마일스톤 M5 — 웹 UI) |
| 대상 | `SPEC-WEBSHELL-001` (Task 15) · `SPEC-WEBCHAT-001` (Task 16) · `SPEC-WEBRICH-001` (Task 17) |
| 워크트리 | `.claude/worktrees/t5` (브랜치 `WT-web-ui`) |
| 감사 기준 시점 | HEAD `6e9a167` |
| 감사자 | plan-auditor (독립 감사, 작성자 근거 무시 — M1 Context Isolation) |
| 날짜 | 2026-08-27 |

작성자가 프롬프트로 넘긴 추론 맥락은 M1 Context Isolation 에 따라 무시했다. 판정 근거는 세 SPEC 의 산출물 파일과 `server/src/`·`web/design-tokens.css`·`.moai/project/design-dna-discord.md`·`plan-v2.md` 원문뿐이다.

---

## 쉬운 말 요약

세 SPEC 을 따로 보면 셋 다 잘 쓰였다. 요구사항 번호에 구멍이 없고, 프런트매터가 온전하고, Tier M 예산(요구사항 16개·수용 기준 16개)을 지켰고, 작성자들이 서버 코드에서 찾아낸 결함 주장은 내가 직접 코드를 열어 본 것 열한 건 가운데 열한 건이 전부 사실이었다. 수용 기준의 품질도 이 저장소 평균보다 훨씬 높다 — "빈 구현이 통과하는 기준"을 내가 따로 훑어 본 결과 각 SPEC 안에서는 한 건도 나오지 않았다.

문제는 셋을 겹쳐 놓았을 때다. 세 사람이 서로를 안 보고 동시에 썼기 때문에 **이어 붙이는 자리마다 서로 다른 약속이 적혀 있다.** 가장 큰 것은 `web/app.js` 를 무엇으로 볼 것인가다 — Task 15 는 "ES 모듈"이라고 못 박고 기계 검사까지 붙여 놓았는데, Task 16 은 "클래식 스크립트"라고 못 박고 그 전제 위에 테스트 골격 전부를 세웠다. 이대로 run 단계에 들어가면 Task 16 의 자동 기준 열다섯 개가 **첫 줄에서 문법 오류로 죽는다.** 그 밖에도 아무도 내보내지 않는 `$()` 를 둘이 갖다 쓰고, 존재하지 않는 `state` 필드 넷을 하나가 이미 있다고 믿고 있고, Task 17 이 쓰겠다는 확장점(`rich.decorate`)을 Task 16 은 만들겠다고 한 적이 없다.

그래서 판정은 이렇다 — Task 15 와 Task 17 은 **조건부 통과**, Task 16 은 **불합격**, 그리고 셋을 잇는 통합 표면은 **불합격**이다. 아래 MUST-FIX 여덟 건을 순서대로 고치기 전에는 run 단계에 들어가면 안 된다.

---

## 판정

| 대상 | 판정 | 근거 요약 |
|------|------|-----------|
| `SPEC-WEBSHELL-001` | **CONDITIONAL PASS** | 단독 품질은 셋 중 가장 높다. 결함은 전부 "카드 전체에서 보면 옳은 구현이 실패하는" 부류 — 형제가 확장할 표면을 `toEqual` 로 정확히 못 박았다 (MF-2·MF-6·O-4), 그리고 `spec.md` L156 이 자기 AC-006 과 모순된다 |
| `SPEC-WEBCHAT-001` | **FAIL** | 자동 기준 15개 전부가 실행 불가능한 전제(클래식 스크립트) 위에 서 있고(MF-1), `state` 확장 필드 넷이 실재한다는 거짓 전제로 설계됐다(MF-4). 형제가 결합할 이음매를 선언하지 않았다(MF-5) |
| `SPEC-WEBRICH-001` | **CONDITIONAL PASS** | 계약 합치 검사 설계는 세 SPEC 가운데 가장 강하고 drift 분석도 정확하다. 결함은 한쪽만 아는 이음매(MF-5), 자기 export 목록에서 빠진 `decorate`(MF-5), 잘못된 파일을 보는 AC-014(MF-7), 검증 AC 가 없는 REQ-002(MF-8) |
| **교차 SPEC 통합 표면** | **FAIL** | 아래 7개 검사 축 가운데 5개에서 결함. 세 SPEC 을 지금 순서대로 실행하면 Task 16 착수 시점에 즉시 멈춘다 |

귀무가설("동시에 따로 쓴 형제 SPEC 은 합쳐지지 않는다")은 **기각되지 않았다.**

---

## MUST-FIX (우선순위 순)

### MF-1 — `web/app.js` 의 모듈 형식이 정면 충돌한다 · BLOCKING

**어디**

- `SPEC-WEBSHELL-001/spec.md` L113(인라인 모듈 스크립트), L129-L154(REQ-005 `export const state` … 17개 export), L269(제약: "`web/app.js` 는 ES 모듈이다")
- `SPEC-WEBSHELL-001/plan.md` §B 표 1행, §D 6번, §I 안티패턴 "`app.js` 를 전역 스크립트로 두기"
- `SPEC-WEBSHELL-001/acceptance.md` AC-004 마지막 단언 — `expect(classic, 'app.js 를 전역 스크립트로 불러오면 안 된다').toEqual([])`
- `SPEC-WEBCHAT-001/spec.md` L265 — "`web/app.js` 는 브라우저가 그대로 읽는 **클래식 스크립트**다"
- `SPEC-WEBCHAT-001/plan.md` §C 표 "app.js 로딩 방식" 행 + 그 아래 IIFE 해설, §H 안티패턴 "**`app.js` 를 ES 모듈로 바꾸기**"(금지 항목)
- `SPEC-WEBCHAT-001/acceptance.md` 공통 골격 — `window.eval(\`(function(){\n${src}\n;window.__app = { openRoom, renderMessage, sendMessage, state };\n})()\`)`

**무엇이 틀렸나**

두 SPEC 이 같은 파일에 대해 배타적인 성질을 각각 [HARD] 로 못 박았다. WEBSHELL 은 ES 모듈을 **요구**하고 기계 검사까지 붙였고, WEBCHAT 은 ES 모듈로 바꾸는 것을 **금지**하고 클래식 스크립트 전제 위에 테스트 골격 전부를 세웠다. WEBCHAT 이 이 전제를 얻은 곳은 형제 SPEC 이 아니라 원본 `plan-v2.md` Task 15 다 — 형제가 그 지점에서 원본을 이탈했다는 사실을 보지 못했다.

**run 단계에서의 비용**

`export const state = {...}` 를 담은 파일 원문을 `window.eval` 에 넣으면 `SyntaxError: Unexpected token 'export'` 가 **첫 단언이 돌기 전에** 터진다. `window.__app` 이 만들어지지 않으므로 `loadApp()` 을 부르는 모든 테스트가 죽는다 — AC-WEBCHAT-001…014 열넷, 그리고 골격에 의존하는 AC-015 의 일부. 즉 WEBCHAT 의 자동 기준 사실상 전부가 실행 불가다. 더 나쁜 것은 실패 모양이 "환경 문제"로 보인다는 점이다 — 카드 `t2` 에서 세 번 재생산됐다고 세 SPEC 이 모두 경계하는 바로 그 오진 경로다.

**고칠 방향**

`app.js` 는 ES 모듈로 확정한다(WEBSHELL 이 그 근거를 제시했고 — `plan.md` §D 6번 — 검증 가능성 측면에서 옳다). WEBCHAT 의 공통 골격을 `vi.resetModules()` + `await import('../../web/app.js')` 형태로 다시 쓰고, `spec.md` L265 제약 문장과 `plan.md` §C·§H 의 해당 항목을 삭제한다. 이 수정은 MF-2 로 연쇄한다.

---

### MF-2 — WEBSHELL AC-006 이 export 집합을 `toEqual` 로 못 박아, 형제가 확장하는 순간 깨진다 · BLOCKING

**어디**

- `SPEC-WEBSHELL-001/acceptance.md` AC-WEBSHELL-006 — `expect(Object.keys(app).sort()).toEqual(EXPECTED_EXPORTS)` (17개 고정), `expect(app.state).toEqual({ rooms: {active:[],archived:[]}, bots: [], currentRoomId: null })`
- `SPEC-WEBSHELL-001/spec.md` L156 — "형제 SPEC 은 이 객체에 필드를 **더한다**(`sse`, `workingBots`, `staleTimers`, `staleBots` 등)"
- `SPEC-WEBCHAT-001/acceptance.md` Definition of Done — "`npm test -w server` 가 종료 코드 `0`"
- `SPEC-WEBRICH-001/acceptance.md` 품질 게이트 — "테스트: 전부 통과, 실패 0"

**무엇이 틀렸나**

두 가지가 겹쳐 있다.

1. **자기모순**: `spec.md` L156 은 형제가 `state` 에 필드를 더한다고 명시하는데, 같은 SPEC 의 AC-006 은 `state` 가 정확히 세 필드임을 `toEqual` 로 단언한다. 형제가 L156 대로 하면 AC-006 이 깨진다.
2. **카드 수준 지뢰**: `server/test/web-shell.test.ts` 는 영구 파일이고 `npm test -w server` 에 계속 실린다. 그 명령은 WEBCHAT 과 WEBRICH 의 **자기 GREEN 게이트이기도 하다.** MF-1 을 고쳐 WEBCHAT 이 `import` 로 전환하면 `openRoom` 실제 본체·`renderMessage`·`sendMessage` 를 export 해야 하고, WEBRICH 는 `app.js` 가 `rich.js` 를 import 해 `rich.decorate` 를 부르게 해야 한다. 어느 쪽이든 export 집합이 17개를 넘는 순간 형제의 테스트 실행이 형제가 만들지도 않은 기준에서 붉게 된다.

**run 단계에서의 비용**

Task 16 착수 → `npm test -w server` 붉음 → 원인이 자기 코드가 아니라 형제 SPEC 의 기준 → 실행자가 그 기준을 완화하거나 지우려 든다. 수용 기준을 실행자가 사후에 무르는 경로가 열리는 것이 실제 비용이며, 이 저장소가 반복해서 겪은 결함 부류의 상류다.

**고칠 방향**

카드 안에서 결정한다. 둘 중 하나:
(가) `EXPECTED_EXPORTS` 를 카드 종료 시점의 **최종 표면**(세 SPEC 이 더할 것 전부)으로 지금 확정하고 세 SPEC 이 그것을 공유한다.
(나) AC-006 을 "기대 목록이 부분집합으로 포함되고, `sse`/`workingBots`/`staleTimers`/`staleBots` 가 **이 SPEC 의 커밋 시점에는** 없다"로 다시 쓴다.
어느 쪽이든 `spec.md` L156 과 AC-006 의 모순을 함께 해소해야 한다.

---

### MF-3 — `$(id)` 를 두 SPEC 이 의존하는데 아무도 내보내지 않는다 · BLOCKING

**어디**

- `SPEC-WEBCHAT-001/spec.md` L84 §3 표 — "`SPEC-WEBSHELL-001` | `$(id)`, `api(path, opts)`, `state`, …"
- `SPEC-WEBCHAT-001/plan.md` §A 표 — "`$(id)`, `api(path, opts)`, `state`, `renderRooms()` … 채팅 로직 전부가 이 넷 위에 올라간다"
- `SPEC-WEBRICH-001/spec.md` L65 §3 표 — "`api(path, opts)`, `state`, `$(id)` | 그대로 호출한다"
- `SPEC-WEBSHELL-001/spec.md` L132-L154 REQ-005 export 목록 — `$` 없음
- `SPEC-WEBSHELL-001/acceptance.md` AC-006 `EXPECTED_EXPORTS` — `$` 없음

**무엇이 틀렸나**

생산자가 만들지 않는 이름을 소비자 둘이 계약에 적었다. 같은 부류로 `SPEC-WEBCHAT-001/spec.md` L232 는 범위 밖 항목에 `enterMain()` 을 적는데, WEBSHELL 이 정의하는 것은 `showMain()` 이고 `enterMain` 은 어디에도 없다.

**run 단계에서의 비용**

MF-1 을 고쳐 `import` 로 전환하면 `import { $ } from './app.js'` 가 `undefined` 를 준다. 클래식 스크립트로 남겨도 `window.__app` 에 `$` 가 없다. 어느 쪽이든 Task 16·17 의 첫 DOM 접근에서 `TypeError: $ is not a function` 이다. 다만 MF-1·MF-2 를 고치는 과정에서 함께 드러날 가능성이 높아 발견 비용은 낮다.

**고칠 방향**

`$` 를 WEBSHELL REQ-005 export 목록과 `EXPECTED_EXPORTS` 에 추가한다(가장 짧다). 또는 형제 둘이 자기 안에서 지역 헬퍼를 정의하고 §3 표에서 `$` 를 뺀다. `enterMain()` 언급도 함께 정정한다.

---

### MF-4 — WEBCHAT 이 `state` 의 확장 필드 넷이 이미 있다고 믿는다 (거짓 전제) · BLOCKING

**어디**

- `SPEC-WEBCHAT-001/plan.md` §C 「채팅 전용 상태를 어디에 둘 것인가」 — "`SPEC-WEBSHELL-001` 의 `state` 리터럴은 이미 `sse`·`workingBots`·`staleTimers`·`staleBots` 를 'Task 16 용'으로 선언해 두고 있다. **그 넷은 그대로 쓴다.**"
- `SPEC-WEBCHAT-001/plan.md` §D 7번 — "옵셔널 체이닝과 `??=` 를 걷어내고 직접 접근한다. 초기화가 깨지면 그 자리에서 `TypeError` 로 드러나는 편이 낫다" + "Task 15 의 `state` 리터럴은 `staleTimers: {}` 와 `staleBots: new Set()` 을 이미 초기화한다(**직접 읽어 확인**)"
- `SPEC-WEBSHELL-001/spec.md` L133-L137 REQ-005 — `state` 는 정확히 세 필드
- `SPEC-WEBSHELL-001/plan.md` §I 안티패턴 — "**`state` 에 형제 SPEC 필드 미리 넣기** — 이 SPEC 이 쓰지 않는 죽은 필드가 된다. 세 필드만 둔다"
- `SPEC-WEBSHELL-001/acceptance.md` AC-006 — `toEqual` 로 세 필드를 기계적으로 강제

**무엇이 틀렸나**

WEBCHAT 의 "직접 읽어 확인"은 형제 SPEC 이 아니라 원본 `plan-v2.md` Task 15 의 코드 블록을 읽은 것이다. 형제는 그 지점에서 의도적으로 이탈했고, 그 이탈을 자기 안티패턴 목록과 수용 기준으로 이중 봉인했다. 즉 WEBCHAT 이 근거로 든 관측은 **잘못된 대상을 관측한 것**이며, 검증되지 않은 전제를 검증된 사실로 적었다.

같은 §C 안에서 WEBCHAT 은 자기모순도 범한다 — 바로 다음 문단이 "**이 SPEC 이 새로 필요한 것은 `state` 리터럴에 추가하지 않고 별도 객체에 둔다**"라고 말한다. 넷을 그대로 쓰겠다는 앞 문장과, 리터럴에 손대지 않겠다는 뒤 문장이 양립하지 않는다.

**run 단계에서의 비용**

§D 7번 지시대로 방어를 걷어내고 `state.staleTimers[key] = setTimeout(...)` 을 직접 쓰면 `state.staleTimers` 가 `undefined` 이므로 첫 `bot_status: working` 수신에서 `TypeError: Cannot set properties of undefined`. AC-WEBCHAT-005·006·007 이 그 자리에서 죽는다. 반대로 리터럴에 필드를 넣어 고치면 MF-2 의 AC-006 이 깨진다 — 두 출구가 모두 막혀 있다.

**고칠 방향**

WEBCHAT 이 자기 채팅 블록 안의 별도 객체(§C 후반의 결정)에 `sse`/`workingBots`/`staleTimers`/`staleBots` 를 **스스로 초기화**하고, §C 앞 문단과 §D 7번의 "이미 초기화돼 있다"는 서술을 삭제한다.

---

### MF-5 — `rich.decorate` 이음매를 한쪽만 알고 있고, 그 이름은 소유자의 export 목록에도 없다 · BLOCKING

**어디**

- `SPEC-WEBRICH-001/spec.md` L99-L103 REQ-WEBRICH-002 — "확장은 함수 끝의 `$('messages').appendChild(el)` **직전에 삽입하는 한 줄**로만 한다 / `rich.decorate(el, m)`"
- `SPEC-WEBRICH-001/spec.md` L66 §3 표 — `renderMessage(m)`, `refreshRoomBots()` 를 WEBCHAT 에서 받아 쓴다고 선언
- `SPEC-WEBRICH-001/spec.md` L82-L93 REQ-WEBRICH-001 — 열두 export 목록에 `decorate` 없음, 반환형 `RichContext` 는 참조만 되고 정의 없음
- `SPEC-WEBRICH-001/plan.md` §B 2 — `createRichContext` 인스턴스를 "**방을 열 때마다 새로 만든다**"
- `SPEC-WEBCHAT-001/spec.md` L133-L144 REQ-WEBCHAT-003 — `renderMessage` 를 규정하지만 `rich` 핸들도, `decorate` 호출 자리도, `$('messages').appendChild(el)` 구조도 선언하지 않는다. "첨부 표시 자리는 이 SPEC 에서 비워 둔다"가 전부
- `SPEC-WEBCHAT-001/acceptance.md` AC-WEBCHAT-002 — `.msg-head > strong`·`.msg-head > span`·`.msg-body` 구조는 못 박지만 이음매는 관측하지 않음

**무엇이 틀렸나**

WEBRICH 가 형제의 함수 안에 코드 한 줄을 넣겠다는 계약을 **일방적으로** 적었다. 소비자만 아는 이음매다. 게다가 그 계약 자체가 세 군데에서 불완전하다.

1. `decorate` 는 REQ-WEBRICH-001 의 열두 export 어디에도 없다. `createRichContext` 가 돌려주는 객체의 메서드로만 `plan.md` §B 에 나타나고, 그 반환형 `RichContext` 는 `rich.d.ts` 가 선언해야 한다면서 정의를 어디에도 두지 않았다.
2. `rich` 인스턴스를 **누가 어디서 만드는가**가 미정이다. `plan.md` §B 는 방을 열 때마다 새로 만들라고 하는데, 방을 여는 코드는 WEBCHAT 의 `openRoom` 이고 WEBRICH 는 REQ-002 로 스스로 "`renderMessage` 끝의 한 줄" 밖은 건드리지 않겠다고 묶어 놓았다. 한 줄로는 방마다 재생성을 실현할 수 없다.
3. `refreshRoomBots()` 도 같은 모양이다 — WEBRICH 가 의존 표에 적었지만 WEBCHAT 의 `spec.md` 어디에도 그 이름이 계약으로 나오지 않는다(`plan.md` 서술에만 등장).

**run 단계에서의 비용**

Task 17 실행자가 `renderMessage` 를 열어 보면 삽입할 자리(`$('messages').appendChild(el)`)가 규정된 형태로 있으리라는 보장이 없고, `rich` 라는 이름의 핸들도 없다. `plan.md` §A 가 예고한 대로 "이음매 배선은 블로커 보고"가 되는데 — 그 블로커의 해결자는 이미 카드에서 손을 뗀 Task 16 이다. 실질적으로 Task 16 재작업이다.

**고칠 방향**

WEBCHAT 에 이음매를 **명시적 요구사항 + 수용 기준**으로 추가한다: `renderMessage` 는 요소를 `#messages` 에 붙이기 직전에 주입된 장식 훅을 정확히 한 번, `(el, m)` 인자로 부른다. 그 훅의 등록 지점(예: `openRoom` 이 방마다 새 컨텍스트를 만들어 등록)까지 WEBCHAT 이 소유한다. WEBRICH 는 `decorate`/`RichContext` 를 REQ-001 의 export 계약에 넣고, `refreshRoomBots()` 의존이 실제로 필요한지 재확인한다.

---

### MF-6 — `#placeholder` 가 사라져 WEBSHELL 의 영구 테스트가 붉어진다 · MUST-FIX

**어디**

- `SPEC-WEBSHELL-001/spec.md` L112 REQ-003 필수 id 목록 — `chat`, `placeholder` 포함
- `SPEC-WEBSHELL-001/acceptance.md` AC-WEBSHELL-003 `REQUIRED_IDS` — `'chat', 'placeholder'`
- `SPEC-WEBCHAT-001/plan.md` §F M1 단계 3 — "`web/index.html` 의 `<main id="chat">` 안을 REQ-WEBCHAT-001 의 아홉 요소로 **교체한다**"

**무엇이 틀렸나**

WEBSHELL 이 자리표시자 요소의 존재를 영구 기준으로 못 박았는데, WEBCHAT 이 그 자리를 통째로 교체한다. AC-003 은 "존재"를 단언하므로 요소가 사라지면 실패한다.

**run 단계에서의 비용**

Task 16 M1 커밋 직후 `npm test -w server` 가 붉어진다. 원인은 자기 변경이지만 실패하는 기준은 형제 것 — MF-2 와 같은 오진·완화 경로다.

**고칠 방향**

`placeholder` 를 `REQUIRED_IDS` 에서 빼거나(가장 짧다), WEBCHAT 이 `#placeholder` 를 `hidden` 으로 보존하도록 REQ-WEBCHAT-001 에 명시한다.

---

### MF-7 — AC-WEBRICH-014 가 잘못된 파일에서 토큰 로딩을 확인한다 · MUST-FIX

**어디**

- `SPEC-WEBRICH-001/acceptance.md` AC-WEBRICH-014 — `grep -q "design-tokens.css" web/index.html   # 토큰 파일이 실제로 로드된다`
- `SPEC-WEBSHELL-001/spec.md` L121 REQ-004 관측 1 — "파일 앞부분에 `@import` 로 `design-tokens.css` 를 불러오며"
- `SPEC-WEBSHELL-001/plan.md` §F M2 단계 4 — "`web/style.css` 를 쓴다 — 첫머리 `@import url('./design-tokens.css')`"
- `SPEC-WEBCHAT-001/plan.md` §F M4 단계 2 — "`SPEC-WEBSHELL-001` 이 `index.html` 에서 링크하지 않았다면 **블로커로 보고한다**"

**무엇이 틀렸나**

WEBSHELL 은 토큰을 `style.css` 의 `@import` 로 싣기로 확정했고, `index.html` 은 `style.css` 하나만 링크한다. 따라서 **올바른 구현에서 `index.html` 에는 `design-tokens.css` 문자열이 없다.** 옳은 구현이 실패하는 기준이다 — 세 SPEC 이 모두 경계한 두 번째 훑기 축(「완전히 옳은 구현이 실패하는가」)에 정확히 걸린다. WEBCHAT 은 같은 오해를 블로커 보고 지시로 적어 두어, 잘못된 블로커를 한 건 만들어 낼 준비가 돼 있다.

**run 단계에서의 비용**

AC-WEBRICH-014 가 붉게 뜨고 실행자가 `index.html` 에 불필요한 `<link>` 를 넣어 "고친다" — 토큰이 두 경로로 로드되고, WEBSHELL AC-005 관측 1(`@import` 정확히 한 줄)과의 관계가 흐려진다.

**고칠 방향**

`grep -q "design-tokens.css" web/style.css` 로 바꾼다. WEBCHAT `plan.md` §F M4 단계 2 의 블로커 지시도 같은 대상으로 정정한다.

---

### MF-8 — REQ-WEBRICH-002 를 검증하는 수용 기준이 없다 · MUST-FIX

**어디**

- `SPEC-WEBRICH-001/spec.md` L98-L105 REQ-WEBRICH-002 — "`renderMessage` 본체를 다시 쓰거나 통째로 바꿔서는 안 된다"
- `SPEC-WEBRICH-001/acceptance.md` AC 매트릭스 — REQ-002 는 AC-WEBRICH-016 에 매핑
- `SPEC-WEBRICH-001/acceptance.md` AC-WEBRICH-016 — 허용 집합에 `web/app.js` 가 통째로 들어 있고, 변경 파일 목록만 본다

**무엇이 틀렸나**

AC-016 은 "`web/app.js` 가 바뀌었는가"만 볼 뿐 "어떻게 바뀌었는가"를 보지 않는다. `renderMessage` 를 통째로 교체한 구현 — 즉 WEBRICH 가 `plan.md` §D 1번에서 명시적으로 이탈하겠다고 선언한 원본 Task 17 의 지시를 그대로 따른 구현 — 이 AC-016 을 포함한 WEBRICH 의 모든 기준을 통과한다.

이것은 이 SPEC 이 스스로 "가장 되돌리기 어려운 결정"으로 지목한 성질(`plan.md` §B 1)이 **관측되지 않는다**는 뜻이다. WEBRICH 의 자기 훑기 표(§E)는 열여섯 기준을 훑었다고 적었지만, 이 축 — "요구사항 하나가 어떤 기준으로도 관측되지 않는다" — 은 훑기 질문에 들어 있지 않았다.

**run 단계에서의 비용**

Task 17 실행자가 편의상 `renderMessage` 를 다시 쓰고, 모든 기준이 초록으로 통과하며, `SPEC-WEBCHAT-001` 의 소유권 침범이 감사에 걸리지 않는다. 나중에 Task 16 의 기준(AC-WEBCHAT-002 구조 단언)이 깨지면 그때 드러나지만, 원인 추적은 훨씬 비싸진다.

**고칠 방향**

AC-016 에 관측 하나를 더한다 — `git diff <WEBCHAT 마감 SHA> -- web/app.js` 의 `renderMessage` 범위 안 추가 줄이 한 줄이고 삭제 줄이 0 줄이다. 또는 MF-5 의 해결(WEBCHAT 이 훅을 소유)로 대체하면 이 요구사항 자체가 불필요해진다.

---

## 관찰 (MUST-FIX 아님)

| # | 어디 | 내용 |
|---|------|------|
| O-1 | `SPEC-WEBCHAT-001/spec.md` L114 | REQ-WEBCHAT-001 이 "아래 **아홉 개** id" 라고 쓰고 열 개를 나열한다(`room-header`·`room-title`·`room-bots`·`invite-btn`·`messages`·`composer`·`autocomplete`·`msg-input`·`file-input`·`send-btn`). `plan.md` §F M1 단계 3 도 "아홉 요소"로 반복한다. 숫자만 정정하면 된다 |
| O-2 | `SPEC-WEBRICH-001/spec.md` L192 vs `plan.md` L245·§E 위험 3 | `spec.md` 범위 밖 절은 `<script type="module">` 배선을 WEBSHELL 소관으로 넘기는데, `plan.md` §F M3 은 "`app.js` 를 `type="module"` 로"를 자기 산출물로 적고 §E 위험 3 은 "WEBSHELL 이 클래식 스크립트로 싣는다"를 Medium 위험으로 둔다. 전제가 거짓(WEBSHELL 은 모듈로 싣는다)이고 자기모순이다. WEBSHELL 이 먼저 마감되면 무해한 무동작이 되므로 BLOCKING 은 아니다. 위험 3 을 삭제하고 M3 항목을 빼면 된다 |
| O-3 | `SPEC-WEBRICH-001/spec.md` L128 | REQ-WEBRICH-006 은 "`m` 플래그로 적용해 **마지막 일치**의 캡처 그룹 1 을 쓴다"고 하는데, 제시된 정규식에 `g` 가 없다. `.exec` 는 첫 일치만 준다. `matchAll` 또는 `g` 플래그가 필요하다. 실제 서버 본문에서는 요청 줄이 하나뿐이라 결과는 같지만, 방어의 근거로 든 성질(오염된 `input_preview` 대비)이 문면상 성립하지 않는다 |
| O-4 | `SPEC-WEBSHELL-001/acceptance.md` AC-WEBSHELL-015 L596 | 허용 예외로 `server/test/web-shell.test.ts` 와 `server/package.json` 을 명시했지만 루트 `package-lock.json` 이 빠졌다. `npm install -D -w server jsdom` 은 루트 lock 파일을 반드시 바꾼다. `SPEC-WEBRICH-001/acceptance.md` AC-016 의 허용 집합은 이 파일을 올바로 포함하고 있으므로 그것을 베끼면 된다 |
| O-5 | 세 `plan.md` §C / M1 | `npm i -D jsdom -w server` 를 셋이 각각 자기 **첫 스텝**으로 선언했다. 명령이 멱등이라 실질 피해는 없다. 다만 vitest 4 의 파일 단위 `// @vitest-environment jsdom` 이 듣지 않을 때의 대안(`server/vitest.config.ts` + `test.projects`)을 문서화한 것은 WEBSHELL 뿐이고, WEBCHAT §H 와 WEBRICH §H 8번은 그 파일을 만드는 것을 **안티패턴으로 금지**한다. 대안 경로가 실제로 필요해지면 형제 둘의 금지 목록이 카드의 실제 상태와 어긋난다 |
| O-6 | `SPEC-WEBRICH-001/acceptance.md` AC-004·AC-009 | `applyInviteResult({ commandEl: { textContent: '' }, resultEl: { hidden: true } }, res)` 처럼 `Element` 자리에 평범한 객체 리터럴을 넘기고, AC-009 는 `Element \| null` 반환값을 null 검사 없이 `.children` 으로 읽는다. `server/tsconfig.json` 이 `test` 를 include 하므로 `npm run typecheck -w server` 가 붉어질 수 있다. run 단계에서 고칠 수 있는 테스트 코드 수준 문제 |
| O-7 | `SPEC-WEBCHAT-001/acceptance.md` AC-WEBCHAT-013 | 실패 경로 핸들러에 대해 "위 실패 경로의 핸들러는 방 목록 조회까지 실패시키지 않도록 **run 단계에서 조정한다**"고 적었다. 명령이 plan 시점에 확정되지 않은 유일한 기준이다. 관측 두 개는 보존하라고 못 박았으므로 공허하지는 않으나, 다른 열다섯과 달리 그대로 실행할 수 없다 |
| O-8 | 디자인 토큰 매핑 | **모순 없음.** WEBSHELL 이 사이드바에 `--md-bg-panel`(`#2b2d31`)을 고른 판단은 `.moai/project/design-dna-discord.md` L13-14(`#1e1f22` = 서버 아이콘 레일, `#2b2d31` = 채널 사이드바)와 L72("컬럼 수는 3개로 단순화 … 서버 아이콘 레일은 뺍니다")가 그대로 뒷받침한다. WEBRICH 는 첨부 칩에 `--md-bg-panel`, 초대 명령 상자에 `--md-bg-sidebar` 를 쓰고 WEBCHAT 은 `--md-role-color-1..5` 를 쓴다 — 같은 요소를 두 SPEC 이 다르게 칠하는 자리는 없다. 굳이 적자면 가장 어두운 토큰의 이름(`--md-bg-sidebar`)이 사이드바가 아닌 요소에 쓰이는 명명 어긋남이 남는데, 토큰 파일은 이 카드가 고치지 않기로 했으므로 그대로 두는 것이 옳다 |
| O-9 | 테스트 파일 이름 | 충돌 없음 — `web-shell.test.ts` / `web-chat.test.ts` / `web-rich.test.ts` + `web-permission-contract.test.ts`. vitest 배치 제안도 셋이 일치한다(파일 단위 도크블록, 전역 설정 파일 없음) |

---

## 프롬프트가 지목한 7개 통합 축 — 축별 결과

| # | 축 | 결과 |
|---|-----|------|
| 1 | `renderMessage` 소유권과 이음매 | **결함** — MF-5. WEBRICH 가 형제가 동의한 적 없는 이음매를 발명했고, 그 이름은 자기 export 목록에도 없다 |
| 2 | 첨부 데이터(`mime` 부재) | **정합** — 코드로 확인했다(`routes-messages.ts` L92-98·L136: 응답에 `{id, filename}` 만). WEBCHAT 의 `renderMessage` 설계는 `m.attachments` 를 아예 읽지 않으므로(REQ-WEBCHAT-003 마지막 문단, 범위 밖 절 L238) 없는 필드에 의존하지 않는다. 두 SPEC 의 판단이 일치한다 |
| 3 | `app.js` 로드 형식 | **결함** — MF-1(WEBSHELL↔WEBCHAT 정면 충돌) + O-2(WEBRICH 의 거짓 전제와 자기모순) |
| 4 | 공유 준비 작업의 삼중화 | **경미** — O-5·O-9. 명령이 멱등이고 파일명이 충돌하지 않아 실행에 지장 없음. 대안 경로 금지 항목만 어긋난다 |
| 5 | 디자인 토큰 매핑 | **정합** — O-8. 재론이나 충돌 없음. WEBSHELL 의 판단은 디자인 DNA 문서로 뒷받침된다 |
| 6 | `state` 모양 | **결함** — MF-4(WEBCHAT 의 거짓 전제 + 자기모순) + MF-2(WEBSHELL 자기모순: `spec.md` L156 vs AC-006) |
| 7 | 의존 순서와 블로커 규율 | **부분 결함** — 순환은 없다(WEBSHELL → WEBCHAT → WEBRICH 직렬, `depends_on` 이 가리키는 SPEC 은 전부 `.moai/specs/` 에 존재하고 서버 쪽 아홉 개는 모두 `status: completed`). 블로커 규율도 셋 다 명시했다. 다만 WEBRICH `plan.md` §A 가 예고한 "이음매 배선 블로커"는 MF-5 때문에 **반드시 발생하는 블로커**이고 그 해결자가 이미 마감한 형제라, 규율이 있어도 출구가 없다 |

---

## 공허한 수용 기준 — 내 독립 훑기 결과

작성자 셋이 모두 "훑었고 0건 남았다"고 주장했다. 그 주장을 받아들이지 않고 기준 48개를 두 방향으로 직접 훑었다.

- 방향 A — **빈/스텁 구현이 통과하는가?**
- 방향 B — **옳은 구현이 실패하는가?**

| SPEC | 기준 수 | 방향 A 적발 | 방향 B 적발 | 비고 |
|------|--------|------------|------------|------|
| `SPEC-WEBSHELL-001` | 16 (자동 15 + MANUAL 1) | **0** | **3** — AC-003(`placeholder`, MF-6) · AC-006(export 집합, MF-2) · AC-015(`package-lock.json` 누락, O-4) | 방향 A 는 작성자 주장이 사실이다. 부재 축 기준 넷(AC-002·003·005·015)에 전부 존재 축이 짝지어져 있는 것을 개별로 확인했다. AC-005 의 16진 정규식이 `#room-list`·`#chat` 같은 id 선택자를 오탐하지 않는지도 직접 따져 보았다 — 오탐 없음 |
| `SPEC-WEBCHAT-001` | 16 (자동 15 + MANUAL 1) | **0** | **15** — MF-1 로 자동 기준 전부가 골격 로드 단계에서 죽는다 | 기준 하나하나의 설계는 셋 중 가장 촘촘하다(AC-007 의 `1 → 0` 2단 관측, AC-008 의 중복 렌더 적발, AC-010·011 의 실제 `parseMentions` 왕복, AC-014 의 `toEqual` 양방향). **공허해서가 아니라 실행 불가여서** 방향 B 에 전부 걸린다. 별도로 AC-013 은 명령이 미확정(O-7) |
| `SPEC-WEBRICH-001` | 16 (자동 15 + MANUAL 1) | **0** (단, REQ-002 를 관측하는 기준이 없음 — MF-8) | **1** — AC-014 `grep … web/index.html`(MF-7) | 방향 A 는 작성자 주장이 사실이다. 특히 AC-005·AC-014 의 존재 축 보강, AC-010 의 `toHaveBeenCalledTimes(1)`, AC-012 의 "같은 회차 정상 요청에는 버튼 2개"는 내가 따로 반례를 구성해 봐도 뚫리지 않았다. 다만 훑기 축에 **"관측되지 않는 요구사항"** 이 없어 MF-8 을 놓쳤다 |
| **합계** | **48** | **0** | **19** | 작성자들의 방향 A 주장은 전부 사실로 확인됐다. 반면 방향 B 는 세 SPEC 모두 자기 안에서만 물었고, **카드 전체를 놓고 묻지 않아** 19건이 남았다 |

핵심: 이 카드가 반복 재생산해 온 결함 부류(빈 구현이 통과하는 기준)는 **실제로 근절됐다.** 남은 것은 그 반대 부류 — 옳은 구현이 형제의 기준에서 실패하는 자리 — 이고, 그것은 각자 훑기로는 원리적으로 잡히지 않는다.

---

## drift 주장 검증 — 확인 / 미확인

### 코드로 직접 확인한 것 (13건, 전부 사실)

| 주장 | 출처 | 확인 근거 |
|------|------|-----------|
| 권한 `request_id` 파서가 본문 아무 데서나 다섯 글자를 집는다 | `WEBRICH/plan.md` §D 2 | `server/src/permissions.ts:38` 템플릿 4줄 구성 확인. `input_preview: 'git commit …'` 의 앞 줄 `command 를 실행합니다` 에서 `[a-km-z]{5}` 첫 일치는 `comma` — 문자 단위로 대조해 사실 확인. **이 SPEC 의 가장 무거운 주장이 정확했다** |
| 첨부 응답에 `mime` 이 없다 | `WEBRICH/plan.md` §D 4 | `routes-messages.ts:92-98`(주석까지 "id 와 filename 뿐이다"), `:136`(`SELECT id, filename`). `mime` 은 DB 에는 저장되지만(`:96-97`) 응답 봉투에는 실리지 않는다 |
| `@TO(이름)` 자동완성이 서버 파서가 못 읽는 문자열을 만들 수 있다 | `WEBCHAT/plan.md` §D 1 | `mention.ts:2` `MENTION_RE = /@(TO\|CC)\(([^()\s]+)\)/g` — 이름 자리에 공백·괄호 불가. `routes-bots.ts` 봇 등록은 `name.trim()` 만 검사. `parseMentions('@TO(코드 리뷰어) …')` 는 `[]` 를 돌려주고, 그러면 미초대 이름 400 검사에도 걸리지 않는다 |
| SSE 재연결 백필이 없고 `?after=` 가 그 공백을 메운다 | `WEBCHAT/plan.md` §D 2 | `sse.ts` 에 `id:`·`retry:` 발행 없음. `routes-messages.ts:120-130` — `id > after ORDER BY id ASC LIMIT 200`. 커서 경로가 실재한다 |
| `@fastify/static` 이 설치돼 있지만 등록되지 않았다 | `WEBSHELL/plan.md` §D 7 | `server/package.json` dependencies 에 `"@fastify/static": "^10.1.3"`. `server/src/index.ts` 는 `cookie`·`multipart` 만 register, static 은 import 조차 없음 |
| 로그아웃 라우트가 서버에 있는데 UI 가 없다 | `WEBSHELL/plan.md` §D 2 | `server/src/auth.ts:62` — `app.post('/api/auth/logout', …)` 존재 |
| 원본 HTML 이 `id="sidebar-top"` 을 두 번 쓴다 (2989·2999행) | `WEBSHELL/plan.md` §D 1 | `plan-v2.md` 2989행·2999행 원문 확인 — 방 헤더와 봇 헤더가 같은 id |
| `#4e5058` 은 토큰 파일에 없다 (나머지 셋은 있다) | `WEBRICH/plan.md` §D 8 | `web/design-tokens.css` 전수 확인 — `#2b2d31`(`--md-bg-panel`)·`#00a8fc`(`--md-text-link`)·`#1e1f22`(`--md-bg-sidebar`) 존재, `#4e5058` 없음 |
| `jsdom`·`happy-dom` 이 devDependencies 에 없고 vitest 는 `^4.1.11` | 세 `plan.md` §C | `server/package.json` 확인 — 정확히 그렇다 |
| 판정 결과 메시지 템플릿 세 종 | `WEBRICH/spec.md` REQ-010 | `permissions.ts:54-56` — `⚠️ 봇이 접속해 있지 않아 판정을 전달하지 못했습니다 (id)` / `✅ 승인 전송됨 (id)` / `⛔ 거절 전송됨 (id)`. SPEC 서술과 일치 |
| `PERMISSION_REPLY_RE` 가 양끝 고정이다 | `WEBRICH/spec.md` REQ-008 | `permissions.ts:7` — `/^\s*(y\|yes\|n\|no)\s+([a-km-z]{5})\s*$/i`. 접두·접미가 붙으면 불일치. 서버 주석(`:6`)이 "카드 t5 UI 의 파서가 이 형식에 결합한다"고 이미 인정하고 있다 |
| 권한 답장이 사용자 메시지로 저장되지 않는다 | `WEBCHAT/plan.md` §D 「결함이 아니었던 것」 | `routes-messages.ts:63` — `consumed_by: 'permission'` 로 조기 반환. 작성자가 "의심했다가 무해로 판정"한 항목까지 사실이다 |
| 초대 명령에 `claude …` 줄과 64자리 hex 토큰이 있다 | `WEBRICH/acceptance.md` AC-004·AC-015 | `routes-bots.ts:15-25` `inviteCommand()` 6줄 + `randomBytes(32).toString('hex')`(`:59`) = 64 hex |

### 확인할 수 없었던 것 (작성자들이 정직하게 미검증으로 남긴 것들)

| 미확인 전제 | 누가 의존하나 | 유예가 안전한가 |
|------------|--------------|----------------|
| vitest 4 의 파일 단위 `// @vitest-environment jsdom` 이 실제로 듣는가 | 셋 다 | **조건부 안전.** 이 워크트리에 `node_modules` 가 없어 실행 확인이 불가능한 것은 사실이다. WEBSHELL 만 대안(`vitest.config.ts` + `test.projects`)을 미리 적어 두었고 어느 쪽을 썼는지 기록하게 했다 — 옳은 처리다. 반면 WEBCHAT·WEBRICH 는 대안 경로를 안티패턴으로 금지해 두었다(O-5). WEBSHELL 이 첫 SPEC 이므로 실무상 그가 먼저 판정하고 나머지가 따라가면 되지만, 형제 둘의 금지 문구는 정정되어야 한다 |
| `@fastify/static` v10 이 `prefix: '/'` 에서 `/api/nope` 를 404 로 내는가(index.html 폴백을 안 하는가) | WEBSHELL | **안전.** AC-WEBSHELL-002 가 어느 쪽이든 **기계적으로 판정**하고, 폴백하면 `wildcard: false` 로 조정한 뒤 블로커 보고하도록 경로를 미리 적어 두었다. 기준을 완화하지 말라는 문구까지 있다. 유예가 숨기는 것이 없다 |
| jsdom 의 `<dialog>`·`showModal()` 지원 | WEBSHELL(`promptText`), WEBRICH(초대 다이얼로그) | **안전.** 둘 다 회피가 아니라 **설계로 의존을 끊었다** — WEBSHELL 은 액션 함수를 분리해 다이얼로그 없이 검증하고, WEBRICH 는 `showModal()`/`close()` 호출을 `app.js` 에만 두어 어떤 AC 도 그것을 부르지 않게 했다. 남은 부분은 MANUAL 기준으로 명시 이관됐다 |
| 브라우저가 `content-disposition: attachment` 를 무시하고 `<img>` 를 렌더하는가 | WEBRICH | **안전.** 기계로 잴 수 없는 것이 맞다(jsdom 은 이미지를 가져오지 않는다). AC-007 은 "노드가 올바른 `src` 로 만들어진다"까지만 단언하고, "실제로 그려진다"는 AC-015 MANUAL 1번 항목으로 넘기며 아니오면 블로커 보고 경로까지 적었다. 자동인 척하지 않았다 |
| `promptText` 의 `returnValue` 를 `submit` 에서 읽으면 틀린다 | WEBSHELL §D 3 | **미확인이지만 무해.** DOM 명세 해석에 근거한 주장이고 이 환경에서 실행 확인은 불가능하다. 제시된 해결(`close` 이벤트 + `{ once: true }`)은 어느 쪽이 맞든 안전한 방향이라 위험이 없다 |

**정직성 평가**: 세 SPEC 모두 미검증 항목을 감추지 않고 "확인하지 않은 것을 정직하게 적어 둔다"는 표제 아래 명시했다. 유예된 다섯 건 가운데 넷은 기계 판정 경로나 설계상 회피가 함께 준비돼 있어 안전하고, 하나(vitest 도크블록)만 형제 둘의 금지 문구 정정이 필요하다. **결정할 수 없는 기준을 숨긴 자리는 없다.**

---

## 형식 검사 (통과 항목 — 근거)

| 항목 | 결과 | 근거 |
|------|------|------|
| REQ 번호 연속·중복 | PASS | `REQ-WEBSHELL-001…014`(14), `REQ-WEBCHAT-001…015`(15), `REQ-WEBRICH-001…016`(16). 구멍·중복·자릿수 불일치 없음 |
| Tier M 예산 (16/16) | PASS | 14/16 · 15/16 · 16/16. 수용 기준은 셋 다 정확히 16 |
| 프런트매터 12필드 | PASS | 세 파일 모두 `id`·`title`·`version`(따옴표 semver)·`status`·`created`·`updated`·`author`·`priority`·`phase`·`module`·`lifecycle`·`tags` + `tier: M` + `depends_on`. 거부 별칭(`created_at`/`updated_at`/`labels`/`spec_id`) 사용 없음 |
| `depends_on` 실재성 | PASS | 인용된 9개 SPEC 이 전부 `.moai/specs/` 에 존재하고 서버 쪽 아홉 개는 모두 `status: completed`. retired/superseded/archived 없음 |
| GEARS 형식 | PASS | 요구사항 45개 전부가 Ubiquitous / When / While / Where / Unwanted(shall not) 다섯 패턴 중 하나로 표기됨 |
| REQ↔AC 커버리지 | 조건부 | 고아 AC 없음. 미커버 REQ 한 건 — REQ-WEBRICH-002(MF-8). REQ-WEBCHAT-001·REQ-WEBRICH-001 은 전용 AC 없이 간접 커버이나 그 근거를 문서가 명시하고 성립한다 |
| Out of Scope 절 | PASS | 셋 다 `### Out of Scope — <주제>` H3 소제목 4개 이상, 각각 구체적 `-` 항목과 소유자 명시 |
| MANUAL 기준 표기 | PASS | 각 SPEC 정확히 1건(AC-WEBSHELL-014 / AC-WEBCHAT-016 / AC-WEBRICH-015). 셋 다 `[MANUAL]` 명시 + 반증 가능한 관측 항목 5~6개 열거 + "확인함 한 줄은 기록이 아니다" 명시. 자동으로 위장한 수동 검사는 발견되지 않았다 |
| `[NEEDS CLARIFICATION]` 미해결 | PASS | 전 산출물 grep 결과 1건, 그것도 `WEBRICH/plan.md:82` 의 "**[NEEDS CLARIFICATION 아님 — 확정된 설치 스텝]**" 로 명시적 부정. 미해결 마커 0건 |

---

## 권고

1. **MF-1 부터 순서대로 처리한다.** MF-1 → MF-2 → MF-3 → MF-4 는 하나의 결정 덩어리다 — "`app.js` 의 최종 공개 표면을 카드 착수 전에 확정한다". 이 결정을 세 SPEC 이 공유하는 한 곳(예: 카드 수준 계약 문서 또는 WEBSHELL `spec.md` §4.3 확장)에 적고, 세 SPEC 이 그것을 참조하게 한다. 지금처럼 각자 자기 문서에 표면을 적는 한 같은 종류의 어긋남이 다시 생긴다.
2. **MF-5 는 WEBCHAT 재작업이다.** 이음매를 소비자가 아니라 생산자가 선언해야 한다 — WEBCHAT 에 요구사항 하나와 수용 기준 하나를 더한다. Tier M 예산은 WEBCHAT 이 15/16 이라 요구사항 한 칸이 남아 있고, 수용 기준은 16 이 차 있으므로 AC-WEBCHAT-002(구조 단언)에 이음매 관측을 얹는 것이 가장 싸다.
3. **MF-6·MF-7·O-4 는 각각 한 줄 수정이다.** 문자열 하나씩만 바꾸면 된다.
4. **MF-8 은 MF-5 해결의 부산물로 사라질 수 있다.** WEBCHAT 이 훅을 소유하면 REQ-WEBRICH-002 의 "본체를 다시 쓰지 마라"가 구조적으로 불가능해져 관측이 필요 없어진다. MF-5 를 먼저 결정한 뒤 다시 판단한다.
5. **세 SPEC 을 각자 다시 훑게 하지 말고, 카드 수준에서 한 번 훑는다.** 방향 A(빈 구현 통과)는 이미 근절됐다 — 48개 중 0건이 그 증거다. 남은 것은 방향 B 이고, 그것은 정의상 자기 SPEC 안에서는 보이지 않는다. 훑기 질문을 하나 더한다: **"내 수용 기준이, 형제 SPEC 이 자기 요구사항대로 구현했을 때 실패하는가?"**
6. **재감사 범위.** 위 여덟 건을 고친 뒤의 재감사는 이 목록의 델타로 한정한다 — 형식 검사 9개 항목과 방향 A 훑기 48건은 이번에 통과했으므로 다시 볼 이유가 없다.

---

## 부록 — 감사 방법

- 읽은 산출물: 세 SPEC 의 `spec.md`·`plan.md`·`acceptance.md`·`progress.md` 전문 (4,149줄).
- 대조한 코드: `server/src/{index,auth,mention,permissions,routes-messages,routes-bots,sse}.ts`, `server/package.json`, `server/test/` 목록, `web/design-tokens.css`.
- 대조한 문서: `.moai/project/design-dna-discord.md`, `.moai/plan/2026-08-26-minidiscord/plan-v2.md`(2980-3005행).
- 판정 규율: 작성자의 자기 훑기 주장은 근거로 채택하지 않고 48개 기준을 두 방향으로 재훑었다. drift 주장은 코드를 직접 열기 전까지 가설로 다뤘다.
- 쓰기 없음: SPEC 산출물은 한 글자도 고치지 않았다.
