# 카드 t5 (M5 웹 UI) — plan 단계 재감사 (라운드 2)

| 항목 | 값 |
|------|-----|
| 카드 | `t5` (마일스톤 M5 — 웹 UI) |
| 대상 | `SPEC-WEBSHELL-001` v0.2.0 · `SPEC-WEBCHAT-001` v0.2.0 · `SPEC-WEBRICH-001` v0.2.0 |
| 워크트리 | `.claude/worktrees/t5` (브랜치 `WT-web-ui`) |
| 기준 시점 | HEAD `6e9a167` |
| 1차 감사 | `.moai/reports/t5/plan-audit.md` (CONDITIONAL PASS / FAIL / CONDITIONAL PASS + 통합 표면 FAIL, MUST-FIX 8건) |
| 감사자 | plan-auditor (독립 감사) |
| 날짜 | 2026-08-27 |

작성자가 프롬프트로 넘긴 추론 맥락은 M1 Context Isolation 에 따라 무시했다. 교정 보고서(각 SPEC 의 `progress.md` 자기 주장)도 근거로 채택하지 않았고, 여덟 건의 종결 여부는 산출물 원문에서 직접 확인했다.

---

## 쉬운 말 요약

교정 라운드는 대체로 성공했다. 1차 감사가 낸 MUST-FIX 여덟 건 가운데 여섯 건은 완전히 닫혔고, 특히 가장 컸던 `app.js` 모듈 형식 충돌(MF-1)과 `state` 필드 거짓 전제(MF-4)는 흔적 없이 사라졌다. `SPEC-WEBSHELL-001` 은 공유 계약(§4.8)을 한 곳에 모아 소유권을 명확히 갈랐고, 그 SPEC 자체에서는 새 결함을 한 건도 찾지 못했다.

그런데 **이번에도 형제 둘이 서로를 안 보고 고쳤고, 이번에도 이어 붙이는 자리 한 곳이 비었다.** 장식 훅의 양쪽 절반 — 만드는 쪽(`registerMessageDecorator`)과 끼우는 쪽(`createRichContext`) — 은 시그니처·인자·수명·호출 자리·예외 규약까지 완벽하게 맞는다. 그런데 **그 둘을 실제로 이어 붙이는 한 줄을 아무도 요구사항으로 적지 않았고 아무 기준도 관측하지 않는다.** 게다가 `SPEC-WEBRICH-001` 이 자기 계획서에 적어 둔 배선은 **넘기는 값이 틀렸다** — 형제는 "팩토리"를 달라는데 이 쪽은 "이미 만들어진 decorate 함수"를 넘기겠다고 적었다. 그대로 구현하면 첫 메시지에서 `TypeError` 로 죽거나, 방을 옮겨도 판정 상태가 남는다.

여기에 `SPEC-WEBRICH-001` 의 새 결함이 하나 더 있다. MF-8 을 메우려고 강화한 AC-016 이 **기준 SHA 가 없으면 조용히 통과한다.** 형제 둘은 정확히 그 함정을 알고 `git rev-parse --verify` 가드를 각자 붙여 두었는데, 이 SPEC 만 붙이지 않았다.

그래서 판정은 이렇다 — `SPEC-WEBSHELL-001` **PASS**, `SPEC-WEBCHAT-001` **조건부 통과**, `SPEC-WEBRICH-001` **불합격**, 그리고 셋을 잇는 통합 표면은 **여전히 불합격**이다. 귀무가설("동시에 따로 쓴 형제 SPEC 은 합쳐지지 않는다")은 이번에도 기각되지 않았다.

---

## 판정

| 대상 | 판정 | 근거 요약 |
|------|------|-----------|
| `SPEC-WEBSHELL-001` | **PASS** | 배정된 MF-2·3·4·6·7 과 O-4 전부 종결. 내 독립 훑기에서 방향 A·B 적발 각 0건. §4.8 여섯 계약이 공유 표면의 단일 자리로 성립한다 |
| `SPEC-WEBCHAT-001` | **CONDITIONAL PASS** | 배정된 MF-1·3·4·5(생산자측)·6 과 O-1·5·7 전부 종결. 이음매의 자기 절반은 완결됐고 AC-002 가 강하게 관측한다. 결함 하나 — `spec.md` L250 이 "`SPEC-WEBRICH-001` 이 부른다"고 형제에게 의무를 지우는데 형제가 그 이름을 어디에도 적지 않았다(MF-5 의 거울상) |
| `SPEC-WEBRICH-001` | **FAIL** | MF-7 은 완전 종결. MF-5·MF-8 은 **형태만** 종결됐다 — 자기가 소유한 배선이 요구사항에도 수용 기준에도 없고 넘기는 인자가 형제 계약과 어긋나며(MF-9), MF-8 을 메운 AC-016 관측 3이 기준 SHA 가드 없이 공허해질 수 있다(MF-10) |
| **교차 SPEC 통합 표면** | **FAIL** | 일곱 축 가운데 한 축(장식 훅 배선)에서 BLOCKING. 나머지 여섯 축은 이번 라운드에서 정합으로 전환됐다 |

---

## 라운드 1 MUST-FIX 종결 현황 — 항목별

| # | 내용 | 상태 | 근거 |
|---|------|------|------|
| **MF-1** | `app.js` 모듈 형식 정면 충돌 | **종결** | `WEBSHELL/spec.md` L240-246 계약 1이 ES 모듈을 오케스트레이터 결정으로 명시. `WEBCHAT/spec.md` L271·L318 이 그 결정을 따르고, `WEBCHAT/acceptance.md` L44-46·L128-140 이 `window.eval` 골격을 `await import(url)` 로 교체. 세 SPEC 어디에도 "클래식 스크립트" 전제가 남아 있지 않다 |
| **MF-2** | WEBSHELL AC-006 의 `toEqual` 집합 단언 | **종결** | `WEBSHELL/acceptance.md` L315-316 `expect(missing, '필수 export 가 빠졌다').toEqual([])` 부분집합 검사 + L319-322 `state` 세 필드 개별 단언. 초과 export·추가 필드에 침묵한다. `spec.md` L163 의 자기모순 문장도 §4.8 계약 2 참조로 교체됨 |
| **MF-3** | `$(id)` 미제공 · `enterMain()` 오기 | **종결** | `WEBSHELL/spec.md` L144 `export function $(id)` (17→18), `acceptance.md` L306 `REQUIRED_EXPORTS` 에 `'$'` 포함. `WEBSHELL/spec.md` L273 이름 대조표가 `enterMain()` 을 "존재하지 않는다"로 못 박고, `WEBCHAT/spec.md` L285 · `WEBRICH/spec.md` L84 가 각각 그 참조를 삭제·부인 |
| **MF-4** | WEBCHAT 의 `state` 확장 필드 거짓 전제 | **종결** | `WEBSHELL/spec.md` L248-263 계약 2가 소유표로 단일 해석 확정. `WEBCHAT/spec.md` L255-267 REQ-WEBCHAT-016 이 일곱 필드를 `initChat()` 에서 스스로 초기화한다고 선언하고 `?.`·`??=` 방어 배제 근거를 명시. WEBSHELL 의 부재 단언은 영구 테스트에서 빠져 `acceptance.md` L655 AC-015 관측 7(마감 시점)로 이동 |
| **MF-5** | `rich.decorate` 이음매를 한쪽만 앎 | **부분 종결 — 잔여 BLOCKING** | 종결된 부분: 호출 자리·인자·수명·무등록 동작·예외 규약을 생산자가 선언(`WEBCHAT/spec.md` L149-162, L269)하고 `WEBCHAT/acceptance.md` L292-352 가 세 테스트로 관측. 소비자는 `RichContext` 를 정의하고 `createRichContext` 를 export 계약에 넣음(`WEBRICH/spec.md` L117-119, L129). **남은 부분: 두 절반을 잇는 호출 자체.** 아래 MF-9 참조 |
| **MF-6** | `#placeholder` 가 형제 변경으로 사라짐 | **종결** | `WEBSHELL/acceptance.md` L213-221 `REQUIRED_IDS` 가 영속 24개로 축소되고 `placeholder` 제외, L653 AC-015 관측 5(`grep -c 'id="placeholder"'` ≥ 1)가 마감 시점 방어를 진다. `WEBSHELL/spec.md` L280-291 계약 4가 `#chat` 요소/내용물 소유권을 갈랐고 `WEBCHAT/spec.md` L119 가 같은 문장을 참조한다 |
| **MF-7** | AC-WEBRICH-014 가 잘못된 파일을 봄 | **종결** | `WEBRICH/acceptance.md` L450 `grep -q "design-tokens.css" web/style.css` + L457 `grep -c "design-tokens.css" web/index.html # 0 이어야 한다`. 반대 방향까지 관측한다. `WEBSHELL/spec.md` L295-306 계약 5가 두 명령의 옳음·틀림을 명시하고, `WEBCHAT/spec.md` L287 · DoD L~874 도 같은 대상으로 정정됨 |
| **MF-8** | REQ-WEBRICH-002 를 관측하는 기준 없음 | **형태만 종결 — 잔여 결함** | `WEBRICH/acceptance.md` L498-506·L514 가 `renderMessage` 범위 diff 관측 3을 추가했고, base 시점 파일에서 범위를 뽑는 설계는 옳다(L516). 그러나 그 관측이 **기준 SHA 부재 시 공허**하다. 아래 MF-10 참조 |

**여섯 건 완전 종결, 두 건(MF-5·MF-8) 잔여 결함.**

---

## 새 MUST-FIX (우선순위 순)

### MF-9 — 장식 훅을 실제로 잇는 배선이 요구사항에도 기준에도 없고, 넘기는 인자가 형제 계약과 어긋난다 · BLOCKING

**어디**

- `SPEC-WEBCHAT-001/spec.md` L250 — `export function registerMessageDecorator(factory)  // 장식 팩토리 등록 (SPEC-WEBRICH-001 이 부른다)`
- `SPEC-WEBCHAT-001/spec.md` L269 — "`factory` 는 `({ api, doc })` 를 받아 `{ decorate(el, m) }` 를 돌려주는 함수다. `openRoom` 은 방을 열 때마다 `factory({ api, doc: document })` 를 **새로 불러**…"
- `SPEC-WEBCHAT-001/acceptance.md` L330·L352 — `expect(factoryCalls).toBe(1)` / `expect(factoryCalls).toBe(2)`. 등록되는 값이 **팩토리**임을 기계적으로 못 박는다
- `SPEC-WEBRICH-001/spec.md` L150 — 소유표: "그 훅에 끼우는 함수 = `createRichContext({ api, doc }).decorate` | **이 SPEC**"
- `SPEC-WEBRICH-001/plan.md` L64 · L329 — "형제가 선언한 등록 지점에 `createRichContext({ api, doc: document }).decorate` 를 넘기는 배선"
- `SPEC-WEBRICH-001/acceptance.md` L514 — 같은 문장이 AC-016 관측 3의 해설로 반복
- **`registerMessageDecorator` 라는 이름은 `SPEC-WEBRICH-001` 의 네 파일 어디에도 나타나지 않는다** (전수 grep 확인)

**무엇이 틀렸나**

두 가지가 겹쳐 있다.

1. **인자 형태 불일치.** 형제는 `registerMessageDecorator(factory)` 에 **팩토리**(`({api, doc}) => ({decorate})`)를 요구한다. 이 SPEC 은 자기 문서 세 곳에서 일관되게 **`createRichContext(...).decorate`**, 즉 이미 만들어진 `(el, m) => void` 를 넘기겠다고 적었다. 그대로 구현하면 `openRoom` 이 `factory({api, doc})` 를 부를 때 실제로는 `decorate({api, doc}, undefined)` 가 불리고, 그 반환값 `undefined` 가 이 방의 컨텍스트가 된다. 첫 메시지에서 `ctx.decorate` 접근이 `TypeError` 로 죽거나, 널 가드가 있으면 첨부와 권한 버튼이 **아무 오류 없이 영원히 안 뜬다.**

   더 나쁜 것은, 이 형태가 `createRichContext` 를 팩토리로 만든 **목적 자체를 무효화**한다는 점이다. 인스턴스가 하나만 만들어지므로 `resolved`·`pending` 이 방을 넘어 살아남는다 — `WEBRICH/plan.md` §B 2 가 "모듈 최상위 `const resolved = new Set()` 은 틀렸다"고 배제한 바로 그 상태로 되돌아간다.

2. **배선의 소유와 관측이 비었다.** 그 한 줄을 이 SPEC 이 쓴다는 사실은 `plan.md` 산출물 목록과 AC-016 해설 문장에만 있다. `spec.md` 의 열여섯 요구사항 가운데 그것을 규정하는 것이 없고(REQ-001 은 `rich.js` 의 열두 export 만 규정한다), 열여섯 수용 기준 가운데 그것을 관측하는 것이 없다. `WEBRICH/acceptance.md` L104 의 REQ 커버리지 문단도 `decorate` 가 "AC-010·011·012 가 실제로 부른다"고만 적는데, 그 셋은 전부 `createRichContext` 를 **테스트가 직접 부른다**(골격 B, L73) — 배선을 거치지 않는다.

   형제 쪽 관측도 이 구멍을 못 메운다. `AC-WEBCHAT-002` 는 **테스트가 만든 가짜 팩토리**를 등록해 생산자 절반만 잰다(L293-296). 즉 세 SPEC 의 48개 기준 전부가 초록인 상태에서, 실제 앱에서는 첨부도 권한 버튼도 뜨지 않을 수 있다.

**run 단계에서의 비용**

Task 17 실행자가 `plan.md` L329 를 그대로 따라 배선한다 → 모든 자동 기준이 초록 → 수동 기준(AC-WEBRICH-015)에서 "첨부가 안 보인다"로 처음 드러난다 → 원인이 `rich.js` 도 `renderMessage` 도 아닌 두 파일 사이의 한 줄이라 진단이 가장 비싸다. 널 가드가 있으면 그 수동 기준마저 "아직 형제가 안 끝났나 보다"로 오진될 수 있다.

**고칠 방향**

`SPEC-WEBRICH-001` 에서 셋을 함께 한다.

1. `spec.md` L150 소유표의 값을 **`createRichContext` 그 자체**로 정정하고, 배선을 요구사항으로 승격한다 — 예: REQ-WEBRICH-002 에 "`web/app.js` 는 `renderMessage` **밖**에서 `registerMessageDecorator(createRichContext)` 를 정확히 한 번 호출한다"를 더한다. Tier M 요구사항 예산이 16/16 으로 차 있으므로 새 REQ 대신 REQ-002 본문 확장이 맞다.
2. `plan.md` L64·L329 와 `acceptance.md` L514 의 `.decorate` 를 지운다.
3. 그 배선을 관측하는 단언을 AC-016(또는 골격 B)에 더한다 — 예: `web/app.js` 를 import 해 `registerMessageDecorator` 가 실제로 불렸고 그 인자가 `createRichContext` 와 동일한 참조인지, 또는 실제 `openRoom` 경로에서 첨부 노드가 생기는지.
4. `SPEC-WEBCHAT-001/spec.md` L250 의 주석 "(`SPEC-WEBRICH-001` 이 부른다)"는 형제가 그 의무를 자기 문서에 적은 뒤에만 참이다. 3번이 끝나기 전에는 형제에게 없는 의무를 지우는 문장이므로, 형제 정정과 짝을 맞춘다.

---

### MF-10 — AC-WEBRICH-016 이 기준 SHA 없이 조용히 통과한다 · MUST-FIX

**어디**

- `SPEC-WEBRICH-001/acceptance.md` L490 — `BASE=$(cat .moai/specs/SPEC-WEBRICH-001/.spec-base-sha)`, 이어 L493·L496·L501·L504 가 전부 `"$BASE"` 를 쓴다
- 같은 파일 L510-514 「Then」 세 관측 — SHA 유효성을 관측 대상으로 올리지 않는다
- 같은 파일 L544-551 품질 게이트·DoD — `rev-parse` 가 한 번도 나오지 않는다 (전수 grep: `acceptance.md`·`plan.md` 합쳐 0건)
- 대조: `SPEC-WEBSHELL-001/acceptance.md` L621·L629·L634 — 같은 함정을 문단으로 설명하고 `git rev-parse --verify` 를 **관측 2로 승격**
- 대조: `SPEC-WEBCHAT-001/acceptance.md` L786 관측 1 — "여기서 실패하면 아래 관측은 전부 무의미하다"

**무엇이 틀렸나**

`.spec-base-sha` 가 없으면 `BASE` 가 빈 문자열이 되고, `git diff --name-only "" -- server/src` 는 `fatal:` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. 표준 출력은 비어 있으므로 관측 1("빈 출력")이 성립해 버린다. 관측 2도 빈 목록이 허용 집합의 부분집합이라 성립하고, 관측 3은 `git show ":web/app.js"` 실패로 awk 입력이 비어 범위가 나오지 않아 셀 것이 없다.

즉 **run 단계 첫 동작을 건너뛴 실행에서 AC-016 세 관측이 전부 통과한다.** 그런데 AC-016 은 이 SPEC 이 REQ-WEBRICH-002(자기가 "가장 되돌리기 어려운 결정"으로 지목한 성질)를 관측하는 **유일한** 자리이고, 범위 경계를 판정하는 유일한 자리이기도 하다. 형제 둘은 이 함정을 알고 각자 가드를 붙였는데 이 SPEC 만 빠졌다 — 라운드 1 에서 MF-8 을 메우며 관측을 더할 때 함께 들어갔어야 할 가드다.

같은 관측에 두 번째 공허 경로가 하나 더 있다. `plan.md` L26 은 "두 선행 SPEC 이 아직 존재하지 않아도 이 SPEC 의 절반은 진행할 수 있다"고 적는데, 그 순서로 실행하면 `BASE` 시점에 `web/app.js` 가 없어 `git show "$BASE:web/app.js"` 가 실패하고 관측 3이 다시 공허해진다.

**run 단계에서의 비용**

`renderMessage` 를 통째로 교체한 구현 — 원본 Task 17 지시를 그대로 따른, 이 SPEC 이 명시적으로 금지한 구현 — 이 열여섯 기준을 전부 초록으로 통과한다. MF-8 이 고쳤다고 적은 바로 그 결함이 조건부로 되살아난다.

**고칠 방향**

형제의 문장을 그대로 베낀다.

```bash
git rev-parse --verify "$(cat .moai/specs/SPEC-WEBRICH-001/.spec-base-sha)^{commit}"   # 종료 코드 0 + 40자리 SHA
git show "$BASE:web/app.js" | wc -l                                                     # 0 보다 커야 한다
```

첫 줄을 관측 0 으로, 둘째 줄과 awk 범위가 비어 있지 않음을 관측 3의 선행 조건으로 올린다. DoD 에도 같은 줄을 더한다.

---

### MF-11 — AC-WEBRICH-016 허용 집합에 `server/vitest.config.ts` 가 빠졌다 · MUST-FIX

**어디**

- `SPEC-WEBRICH-001/acceptance.md` L508 허용 집합 — `web/rich.js`, `web/rich.d.ts`, `web/app.js`, `web/index.html`, `web/style.css`, `server/package.json`, `package-lock.json`, 테스트 둘, `.moai/specs/SPEC-WEBRICH-001/*`
- 대조: `SPEC-WEBSHELL-001/acceptance.md` L647 — 허용 경로에 `server/vitest.config.ts` 포함
- 대조: `SPEC-WEBCHAT-001/acceptance.md` L~800 허용 예외 네 번째 행 — `server/vitest.config.ts` 포함
- `SPEC-WEBRICH-001/spec.md` L308 — DOM 환경은 "파일 단위 `// @vitest-environment jsdom` 도크블록"만 적는다. 대체 경로를 적지 않는다

**무엇이 틀렸나**

세 SPEC 이 공유하는 미검증 전제(vitest 4 의 파일 단위 도크블록이 실제로 듣는가)가 거짓으로 판명되면, 형제 둘은 `server/vitest.config.ts` 를 만들 수 있고 그 파일이 자기 허용 집합에 있다. 이 SPEC 만 없다. 형제가 먼저 만들어 두면 base 에 이미 들어 있어 diff 에 안 나오므로 무해하지만, **이 SPEC 이 새로 만드는 두 테스트 파일 때문에 설정을 손대야 하는 경우**(골격 A 는 `node` 환경, 골격 B 는 `jsdom` 환경 — 한 SPEC 이 두 환경을 동시에 쓰는 것은 이 SPEC 뿐이다) 옳은 구현이 자기 기준에서 실패한다.

`plan.md` §H 8번은 O-5 교정으로 "새로 만들지 않는다 / 형제가 이미 만들었으면 바꾸지 않고 따른다"가 됐는데, **두 환경을 쓰는 SPEC 에서 그 약속이 지켜질 수 있는지가 확인되지 않았다.** 형제 둘은 각각 한 환경만 쓴다.

**고칠 방향**

허용 집합에 `server/vitest.config.ts` 를 더하고(형제 둘과 동일), `spec.md` §6 DOM 환경 행에 대체 경로를 명시한다. 한 줄씩이다.

---

## 관찰 (MUST-FIX 아님)

| # | 어디 | 내용 |
|---|------|------|
| O-10 | `SPEC-WEBRICH-001/acceptance.md` L500-506 | AC-016 관측 3의 명령 블록이 마지막 줄에서 끊긴다 — "`# 위 범위와 겹치는 헝크의 +/- 줄 수`" 주석만 있고 실제로 세는 명령이 없다. 절차는 명확하지만 "명령 하나 + 관측 하나"라는 이 문서 자신의 규율을 이 관측만 지키지 않는다. `git diff -U0` 출력에서 `@@ -a,b` 헝크 헤더를 읽어 범위와 겹치면 `+`/`-` 줄을 세는 한 줄짜리 `awk` 로 마무리하면 된다 |
| O-11 | `SPEC-WEBRICH-001/acceptance.md` L502 | awk 패턴 `/^(export )?function renderMessage\(/` 는 `export function renderMessage (m)`(괄호 앞 공백)이나 `const renderMessage = (m) =>` 형태를 놓친다. 형제가 `export function renderMessage(m)` 로 적었으므로(`WEBCHAT/spec.md` L247) 현재는 맞지만, 놓치면 조용히 공허해지는 쪽으로 실패한다 — MF-10 의 "범위가 비어 있지 않음" 선행 관측을 붙이면 함께 막힌다 |
| O-12 | `SPEC-WEBCHAT-001/acceptance.md` L116 · L877 | `refreshRoomBots` export 는 `AppModule` 타입 캐스트(런타임 검사 아님)와 DoD 체크박스로만 관측된다. 어떤 기준도 그 이름으로 부르지 않는다. `SPEC-WEBRICH-001` 이 의존을 뺐으므로 이 export 는 지금 소비자가 없다 — 형제에게 없는 의무를 지우지는 않으니 무해하나, MF-5 항목 3의 잔재다 |
| O-13 | `SPEC-WEBRICH-001/acceptance.md` L457 | `grep -c "design-tokens.css" web/index.html # 0 이어야 한다` 는 옳은 구현에서 종료 코드 `1` 로 끝난다. 이 블록을 `set -e` 스크립트로 옮기면 옳은 구현이 중단된다. 값으로 읽으라는 표기를 한 줄 붙이면 된다(`WEBSHELL/acceptance.md` L654 는 그 사실을 명시했다) |
| O-14 | `SPEC-WEBCHAT-001/plan.md` L255 | 로그아웃 뒤 `EventSource` 를 닫지 않는 선택을 "감수한다"로 적고, 근거로 "서버가 세션 쿠키 없는 재연결을 `401` 로 끊는다"를 든다. 아래 「미검증 전제」에서 판정한다 — **유예 안전** |
| O-15 | 세 SPEC 의 `vitest.config.ts` 소관 | 단일 소유자가 이름으로 지정되지는 않았다. 실질 소유는 `SPEC-WEBSHELL-001`(가장 먼저 실행되고 §C 에 결정·기록 절차를 유일하게 적었다)이고 나머지 둘이 "형제가 만들었으면 따른다"로 정렬돼 있어 run 단계에서 충돌하지 않는다. MF-11 을 고치면 세 SPEC 의 허용 집합도 일치한다 |

---

## 프롬프트가 지목한 일곱 축 — 축별 결과

| # | 축 | 결과 |
|---|-----|------|
| 1 | 장식 훅 이음매 | **결함 — MF-9.** 아래 필드별 대조표 참조. 아홉 항목 가운데 여덟이 정확히 일치하고, 배선 한 항목만 어긋난다 |
| 2 | AC-WEBRICH-016 관측 3 vs 이음매 | **정합.** WEBRICH 의 base 는 자기 run 단계 첫 동작에 기록되고, 구현 순서가 WEBSHELL → WEBCHAT → WEBRICH 이므로 base 시점 `app.js` 에는 `ctx.decorate(el, m)` 줄이 **이미 들어 있다.** 따라서 WEBRICH 의 추가·삭제 줄은 0 이고 기준이 옳은 구현을 실패시키지 않는다. 다만 그 정합은 순서에 의존하며, 순서가 어긋나면 기준이 실패가 아니라 **공허**로 무너진다(MF-10 둘째 경로) |
| 3 | `refreshRoomBots()` | **무해한 발산.** WEBRICH 가 의존 표에서 뺐고(`spec.md` L74), WEBCHAT 이 자기 export 계약에 넣어 자기 REQ-009 에서 쓴다. 어느 쪽도 상대에게 의무를 지우지 않는다. O-12 로 남긴다 |
| 4 | `state` 필드 | **정합.** WEBCHAT 일곱 필드(`spec.md` L257-265)는 `initChat()` 소유. WEBSHELL AC-006(`acceptance.md` L319-322)은 세 필드만 개별 단언하므로 형제가 일곱을 더해도 초록이고, export 도 부분집합 검사(L315-316)라 18→23 이 되어도 초록이다. 부재 단언은 마감 시점(AC-015 관측 7)에만 있다. 계약 3의 "이 SPEC 의 기준은 더해진 이름에 침묵한다"가 실제로 성립한다 |
| 5 | 공유 `npm test -w server` 게이트 | **정합.** 내 독립 훑기 결과 형제가 옳게 구현했을 때 붉어지는 기준은 **0건**(아래 훑기 표). 라운드 1의 19건이 전부 사라졌다 |
| 6 | `vitest.config.ts` · jsdom 환경 | **경미한 결함 — MF-11.** 1순위 경로(도크블록)와 대체 경로가 셋 다 일치하고 기록 의무도 일치한다. WEBRICH 의 허용 집합에서만 대체 경로 파일이 빠졌다 |
| 7 | Tier M 예산 · 커버리지 | **정합.** REQ 15/16/16, AC 16/16/16 — 셋 다 상한 이내이고 번호에 구멍·중복 없음(전수 확인). 고아 AC 0건. 미커버 REQ 0건 — REQ-WEBRICH-002 는 AC-016 관측 3이(MF-10 조건부), REQ-WEBCHAT-016 은 AC-002·007·008·009·014 가 분산 관측한다 |

### 축 1 — 이음매 아홉 항목 필드별 대조

| 항목 | `SPEC-WEBCHAT-001` (생산자) | `SPEC-WEBRICH-001` (소비자) | 일치 |
|------|------------------------------|------------------------------|------|
| 등록 API 시그니처 | `registerMessageDecorator(factory)` (spec L250) | **언급 없음** | ✗ |
| 팩토리 시그니처 | `({api, doc}) => ({decorate(el,m)})` (spec L269) | `createRichContext(deps: {api: Function; doc: Document}): RichContext` (spec L129) | ✓ |
| `decorate` 시그니처·반환 | `ctx.decorate(el, m)`, 반환값 쓰지 않음 (spec L154) | `decorate(el: Element, m: MessageEnvelope): void` (spec L118) | ✓ |
| 동기/비동기 | 동기 렌더 경로 (spec L159) | "`Promise` 를 돌려주는 것" 금지 (spec L175) | ✓ |
| 컨텍스트 수명 | 방마다 새로 (`openRoom` 3-1, spec L128·L269) | 팩토리 인스턴스에만 상태 (spec L136) | ✓ |
| 호출 자리 | `appendChild` **직전** (spec L153) | "아직 문서에 붙어 있지 않다" (spec L158) | ✓ |
| 요소 상태 보장 | `.msg-head`·`.msg-body` 완성됨 (spec L153) | 그 셋을 지우지 않음 (spec L169) | ✓ |
| 미등록 시 동작 | 아무것도 부르지 않음 (spec L158) | 그 성질도 형제 소유로 인정 (spec L60) | ✓ |
| 예외 규약 | 훅이 던지면 삼키지 않음 (spec L160) | 어떤 봉투에도 정상 반환 (spec L174) | ✓ (상보적) |
| **배선(등록 호출)** | "`SPEC-WEBRICH-001` 이 부른다" (spec L250) | `plan.md` L329 에만, **인자가 `.decorate`** | ✗ |

여덟 항목이 문자 단위로 맞는데 두 항목이 비었다. 그 둘이 같은 한 줄이다.

---

## 방향 A·B 독립 훑기 — 내 자체 계수

작성자 셋이 모두 "카드 전체 범위에서 두 방향으로 다시 훑었고 0건"이라고 주장했다(각 `plan.md` §E.2). 그 주장을 받아들이지 않고 48개 기준을 다시 훑었다.

- **방향 A** — 빈/스텁 구현, 또는 절차를 건너뛴 실행이 통과하는가?
- **방향 B** — 형제 SPEC 이 자기 요구사항대로 **옳게** 구현했을 때 이 기준이 실패하는가?

| SPEC | 기준 수 | 방향 A 적발 | 방향 B 적발 | 비고 |
|------|--------|------------|------------|------|
| `SPEC-WEBSHELL-001` | 16 (자동 15 + MANUAL 1) | **0** | **0** | 라운드 1의 3건(AC-003·006·015) 전부 해소. AC-006 의 `toEqual` → 부분집합 전환이 빈 구현 방어를 잃지 않았음을 반례로 확인했다(빈 모듈에서 `missing` 이 18개). AC-005 의 16진 정규식이 형제가 더할 선택자(`.message`·`.msg-head`·`#room-bots`·`.attachment`·`#invite-dialog` 등 전수)를 오탐하지 않는지도 직접 대조 — 오탐 0건 |
| `SPEC-WEBCHAT-001` | 16 (자동 15 + MANUAL 1) | **0** | **0** | 라운드 1의 15건은 MF-1 해소로 전부 사라졌다. 새 골격의 `await import(?t=n)` 경로를 따라가 보았고, `loadApp` 이 형제의 `loadRooms()` 를 명시 호출하는 것이 방향 B 를 실제로 막는다(형제가 부트스트랩을 `initApp()` 안으로 옮긴 것과 정합). AC-002 셋째 테스트("훅 없이도 렌더가 성립")가 이 SPEC 마감 시점의 자립성을 보장한다 |
| `SPEC-WEBRICH-001` | 16 (자동 15 + MANUAL 1) | **1** — AC-016(기준 SHA 가드 부재, MF-10) | **2** — AC-016 관측 2(`vitest.config.ts` 누락, MF-11) · AC-016 관측 3(base 가 형제보다 앞설 때 공허, MF-10 둘째 경로) | 라운드 1의 1건(AC-014)은 해소. 나머지 열다섯 기준은 두 방향 모두 깨끗하다 — AC-010 의 호출 횟수 `1`, AC-012 의 "같은 회차 정상 요청에는 버튼 2개", AC-011 의 양방향 순서 관측은 내가 반례를 구성해 봐도 뚫리지 않았다. **세 건이 전부 AC-016 하나에 몰려 있다** |
| **합계** | **48** | **1** | **2** | 라운드 1: 방향 A 0건 / 방향 B 19건 → 라운드 2: 1건 / 2건 |

핵심: 라운드 1이 진단한 부류(형제가 옳으면 붉어지는 기준)는 **19건에서 2건으로 줄었고, 남은 2건은 한 기준에 몰려 있다.** 대신 새 부류가 하나 생겼다 — 라운드 1의 교정이 **관측을 더하면서 그 관측의 선행 조건은 더하지 않은** 자리(MF-10). 관측을 강화할 때 그 관측이 무의미해지는 경로를 함께 막는 것이 남은 규율이다.

---

## 의도적 이탈 두 건에 대한 판정

### (가) `SPEC-WEBSHELL-001` 이 "카드 최종 export 집합 고정"을 거절한 것 — **타당하다**

1차 감사는 MF-2 의 해결책으로 두 갈래를 제시했다: (가) 카드 종료 시점 최종 표면을 지금 확정해 셋이 공유, (나) 부분집합 + 마감 시점 부재 검사. WEBSHELL 은 (나)를 택하고 (가)를 "같은 결함(소유하지 않은 것을 단언)의 재생산"이라며 거절했다(`acceptance.md` L332-339).

**타당하다.** 세 가지 근거로 확인했다.

1. **MF-2 의 근본 원인이 정확히 그것이었다.** 라운드 1의 결함은 "17개"라는 숫자가 틀렸다는 게 아니라, 자기가 소유하지 않은 이름 집합을 시점 무관 영구 기준으로 못 박았다는 것이다. 숫자를 23개로 바꿔도 그 성질은 그대로다 — 형제가 하나만 더 export 하면 다시 붉어진다.
2. **방어가 실제로 유지된다.** `toEqual` 이 막던 둘 가운데 (가) 필수 이름 누락은 부분집합 검사가 **누락에 대해서는 동일하게 엄격**하고(빈 모듈에서 18개 전부 적발), (나) 형제 필드 선취는 AC-015 관측 7이 마감 시점에 진다. 시점에 따라 참·거짓이 뒤집히는 성질을 시점 무관 기준에서 시점 명시 기준으로 옮긴 것은 옳은 이동이다.
3. **감사 권고보다 나은 선택이다.** (가)를 택했다면 WEBSHELL 이 형제 둘의 최종 export 를 마감 전에 알아야 하는데, 그 정보는 형제가 마감해야 확정된다. 순서상 성립할 수 없는 요구였다.

내 라운드 1 권고 중 (가) 갈래는 **철회한다.**

### (나) `SPEC-WEBRICH-001` 이 `decorate` 를 모듈 수준 export 로 만들지 않은 것 — **타당하다. 그리고 필수였다**

WEBRICH 는 `decorate` 를 `createRichContext` 가 돌려주는 `RichContext` 의 유일한 멤버로 두고, 모듈 수준 값 export 로 승격하지 않았다(`spec.md` L136). 근거는 "모듈 전역에 두면 방을 옮겨도 판정 상태가 남고 테스트끼리 샌다"이다.

**타당하다 — 그리고 이 판단은 선택이 아니라 계약 요구였다.** 형제의 `AC-WEBCHAT-002` 는 `expect(factoryCalls).toBe(2)` 로 **방마다 컨텍스트가 새로 만들어질 것**을 기계적으로 단언한다(`WEBCHAT/acceptance.md` L352). 모듈 수준 `decorate` 는 그 단언을 만족시킬 수 없다. 두 SPEC 이 서로를 안 보고도 같은 결론에 도달한 유일한 자리이며, 라운드 1의 MF-5 가 남긴 "방마다 재생성을 한 줄로는 실현할 수 없다"는 지적이 양쪽에서 정확히 해소된 결과다.

1차 감사가 MF-5 고칠 방향에 적은 "`decorate`/`RichContext` 를 REQ-001 의 export 계약에 넣는다"는 문장은 **형 계약으로 충족됐다** — `RichContext` 가 `rich.d.ts` 로 내보내지고 그 안에 `decorate` 의 이름·시그니처가 문자 그대로 적혀 있으므로, 형제가 이음매를 배선하기 위해 볼 자리는 한 곳뿐이다. 값 export 를 요구한 것이 아니었다.

**다만 이 판단의 타당성이 MF-9 를 가리지 않는다.** 팩토리로 두기로 한 결정이 옳기 때문에, 그 팩토리를 넘겨야 할 자리에 `.decorate` 를 넘기겠다고 적은 것이 더 정확히 결함이 된다.

---

## 새로 들어온 미검증 전제 두 건

| 전제 | 누가 의존하나 | 유예가 안전한가 |
|------|--------------|----------------|
| 로그아웃한 `EventSource` 는 재연결하지 않고 종료한다 (`WEBCHAT/plan.md` L255) | WEBCHAT | **안전.** EventSource 명세상 재연결 요청이 `401`(비-2xx)을 받으면 브라우저는 연결을 **실패 처리하고 재연결하지 않는다** — 명세 해석으로는 주장이 옳다. 실행 확인은 이 환경에서 불가능하다. 중요한 것은 **어떤 수용 기준도 이 성질에 의존하지 않는다**는 점이다. 틀렸을 때의 비용은 로그아웃 후 배경에서 도는 재연결 루프 하나이고, 방을 다시 열면 `openRoom` 1단계가 닫는다. 정직하게 "감수한다"로 적었고 근거와 대체 경로를 함께 적었다 — 숨긴 것이 없다 |
| 작성기 이벤트 배선이 `initApp` 이 아니라 `openRoom` 에 있어야 한다 (`WEBCHAT/plan.md` L78, `spec.md` L124) | WEBCHAT | **안전.** 이것은 전제가 아니라 **관측에서 도출된 결론**이다 — `innerHTML` 로 삽입된 `<script>` 는 명세상 실행되지 않으므로 테스트 골격에서 형제의 인라인 부트스트랩이 돌지 않고, 따라서 이 SPEC 의 배선이 `initApp` 안에 있으면 자동 기준이 전부 죽는다. 실제 브라우저에서의 부작용도 따져 보았다 — 작성기는 `#chat` 안에 있고 방을 열기 전에는 쓸 일이 없으므로 방을 열 때 배선되는 것이 의미상으로도 맞다. `initChat()` 의 멱등성(REQ-WEBCHAT-016)이 중복 등록을 막고, 그 멱등성은 `openRoom` 0단계가 2단계(타이머 해제)보다 앞선다는 순서와도 정합한다 |

---

## 형식 검사 (라운드 2 재확인 — 변경된 부분만)

| 항목 | 결과 | 근거 |
|------|------|------|
| REQ 번호 연속·중복 | PASS | `REQ-WEBSHELL-001…015`(15), `REQ-WEBCHAT-001…016`(16), `REQ-WEBRICH-001…016`(16). 전수 grep — 구멍·중복·자릿수 불일치 없음 |
| Tier M 예산 (16/16) | PASS | 15/16 · 16/16 · 16/16 요구사항, 16/16/16 수용 기준. 둘 다 상한 이내 |
| 프런트매터 12필드 | PASS | 세 파일 모두 canonical 12필드 + `tier: M` + `depends_on`. `version` 이 셋 다 `"0.2.0"` 으로 올랐고 `updated` 도 갱신됨. 거부 별칭 사용 0건 |
| REQ↔AC 커버리지 | PASS (조건부) | 고아 AC 0건, 미커버 REQ 0건. REQ-WEBRICH-002 의 커버는 AC-016 관측 3에 걸려 있고 MF-10 이 해소되기 전에는 조건부다 |
| `[NEEDS CLARIFICATION]` 미해결 | PASS | 전 산출물 grep 1건, 그것도 `WEBRICH/plan.md` L102 의 "**[NEEDS CLARIFICATION 아님 — 확정된 설치 스텝]**" 명시적 부정. 미해결 0건 |
| Out of Scope 절 | PASS | 셋 다 `### Out of Scope — <주제>` H3 소제목 4개 이상 + 구체적 `-` 항목 + 소유자 명시 |
| MANUAL 기준 표기 | PASS | 각 SPEC 정확히 1건(AC-WEBSHELL-014 / AC-WEBCHAT-016 / AC-WEBRICH-015). 셋 다 `[MANUAL]` 명시 + 반증 가능 관측 5~6개 |

---

## 권고

1. **MF-9 를 먼저 처리한다. 그리고 이번에는 한쪽만 고치지 않는다.** 이것이 이 라운드가 다시 열린 이유와 정확히 같은 부류다 — 라운드 1의 MF-5 를 양쪽이 각자 고쳤는데, 각자 고친 결과가 다시 어긋났다. 배선 한 줄에 대해 **인자 형태·소유·관측 셋을 한 번에** 확정하고, `WEBRICH` 수정과 `WEBCHAT` L250 주석 정정을 같은 커밋에 넣는다.
2. **MF-10·MF-11 은 각각 두세 줄 수정이다.** 형제 둘의 문장을 그대로 베끼면 된다 — `WEBSHELL/acceptance.md` L621·L629·L634 와 L647.
3. **다음 훑기에 질문을 하나 더한다.** 라운드 1은 "형제가 옳게 구현하면 내 기준이 실패하는가"(방향 B)를 더해 19건을 2건으로 줄였다. 이번 라운드가 드러낸 새 부류는 그 질문으로도 안 잡힌다: **"이 기준이 실패가 아니라 *공허*로 무너지는 입력이 있는가 — 절차를 건너뛴 실행, 파일이 없는 base, 빈 표준 출력"**. MF-10 이 그 부류이고, 형제 둘은 이미 그 방어를 갖고 있으므로 **셋의 방어 수준을 맞추는 것**만으로 끝난다.
4. **재감사 범위.** 위 세 건을 고친 뒤의 재감사는 이 목록의 델타로 한정한다 — 형식 검사 7항목, 방향 A·B 훑기 45건(AC-WEBRICH-016 제외), 이음매 아홉 항목 중 여덟은 이번에 통과했으므로 다시 볼 이유가 없다. 확인할 것은 배선 세 줄(인자·요구사항·관측)과 AC-016 의 가드 두 줄, 허용 집합 한 줄뿐이다.
5. **이번 라운드는 3회 상한의 2회차다.** MF-9 는 두 SPEC 을 동시에 만져야 하므로, 3회차에서 또 한쪽만 고치는 일이 없도록 **한 세션이 두 파일을 함께 고치게** 배정하는 편이 안전하다. 점수 회귀(regression)는 없었다 — 방향 B 적발이 19 → 2 로 줄었으므로 STOP 신호는 발생하지 않는다.

---

## 부록 — 감사 방법

- 읽은 산출물: 세 SPEC 의 `spec.md`·`acceptance.md` 전문, `plan.md`·`progress.md` 의 이음매·훑기·산출물 관련 절 (총 4,954줄 중 약 3,400줄).
- 전수 grep 로 확인한 것: `registerMessageDecorator`(WEBRICH 4파일에 0건), `createRichContext`, `refreshRoomBots`, `rev-parse`(WEBRICH 에 0건), `vitest.config`, `NEEDS CLARIFICATION`, REQ/AC 번호 집합.
- 판정 규율: 작성자의 자기 훑기 주장과 `progress.md` 의 교정 완료 주장은 근거로 채택하지 않고, 여덟 건의 종결을 산출물 원문 인용으로 각각 확인했다. 방향 A·B 훑기는 48개 기준을 다시 돌았다.
- 쓰기 없음: SPEC 산출물은 한 글자도 고치지 않았다.
