# SPEC-WEBUI-001 계획 감사 (적대적)

| 항목 | 값 |
|------|-----|
| 대상 | `.moai/specs/SPEC-WEBUI-001/` 넷 (spec 492 / plan 250 / acceptance 595 / progress 40) |
| 감사 시점 | 2026-09-11, `git HEAD = c1ea5fd` |
| 감사자 | plan-auditor (독립·적대적) |
| 반복 | 1 / 3 |

> M1 컨텍스트 격리 준수: 작성자 추론 맥락은 무시했다. SPEC 산출물 넷과 저장소의 실제 코드만 읽었다.

---

## 판정

**FAIL.**

한 문장 이유: 열여섯 수용 기준 가운데 **여섯**이 지정된 파일에서 **문자 그대로 실행되지 않으며**(정의되지 않은 헬퍼 둘, 스스로를 이중 이스케이프해 절대 매치하지 않는 `rule()` 헬퍼, 저장소에 존재하지 않는 `window.__app` 접근 경로), 그와 별개로 `SPEC-WEBRICH-001` 의 장식 노드가 `.message` 의 **직계 자식**이라는 실측 사실을 REQ-WEBUI-005 의 CSS 그리드가 조용히 깨뜨리는데 어떤 기준도 그것을 관측하지 않는다.

Tier M 통과선은 0.80 이다. 아래 차원 점수의 조화평균은 **0.52** 로 통과선 아래다.

| 차원 | 점수 | 밴드 | 근거 |
|------|------|------|------|
| Clarity(명료성) | 0.75 | 0.75 | 요구사항 본문은 한 뜻으로 읽힌다. 다만 REQ-009 의 「폭을 그대로 쓴다」와 REQ-011 의 초기 `aria-disabled` 출처가 해석을 요구한다 |
| Completeness(완결성) | 1.00 | 1.0 | 프런트매터 12필드 전부, 필수 절 전부, `### Out of Scope — <주제>` H3 여섯 개 + 불릿 |
| Testability(시험가능성) | 0.25 | 0.25 | 여섯 기준이 실행 불가 또는 관측 대상 불일치 (F1~F5) |
| Traceability(추적성) | 1.00 | 1.0 | REQ-001~016 전부 최소 하나의 AC 를 갖고, AC 열여섯이 전부 실재하는 REQ 를 가리킨다 |

조화평균 = 4 / (1/0.75 + 1/1.0 + 1/0.25 + 1/1.0) = **0.522**

### 필수 통과 (Must-Pass)

- **[PASS] MP-1 REQ 번호 일관성** — `spec.md` 에 REQ-WEBUI-001~016 이 빠짐·중복·패딩 불일치 없이 순차적이다 (`grep -c '^\*\*REQ-WEBUI-' → 16`).
- **[PASS] MP-2 GEARS 형식 (요구사항 계층)** — 판정 대상은 `spec.md` 의 `REQ-XXX` 계층이다. 열여섯 전부 GEARS 다섯 패턴 중 하나로 표기돼 있다: Ubiquitous 아홉(REQ-001·004·005·006·010·012·013·015), Where 하나(REQ-007 `spec.md:218` "Where `author_type` 이 `'bot'` 인 메시지"), While 셋(REQ-002 `:151`, REQ-008 `:227`, REQ-011 `:262`), When 둘(REQ-003 `:156`, REQ-014 `:304`), Unwanted 하나(REQ-016 `:328` "구현은 아래 가운데 어느 것도 해서는 안 된다"). `acceptance.md` 의 Given-When-Then 은 검증 계층이므로 여기서 감점하지 않는다.
- **[PASS] MP-3 프런트매터** — `spec.md:2-16` 에 12 정규 필드 전부 present, 타입 적합, snake_case 별칭 0건. `phase: "v2.2.0 target"` 은 금지된 생명주기 토큰이 아니다.
- **[N/A] MP-4 §22 언어 중립성** — 단일 언어(TypeScript/vanilla JS) 프로젝트의 단일 표면 SPEC 이다. 자동 통과.
- **[PASS] MP-5 D7 교차 SPEC 조정** — `spec.md` 가 참조하는 형제 SPEC 아홉(`WEBSHELL/WEBCHAT/ROOM/MSG/WEBRICH/WEBACNAV/AUTH/WEBMD/BOT`) 전부 `.moai/specs/` 에 실재하고, `status:` 가 retired/superseded/archived 인 것은 0건. BLOCKING 없음.
- **[PASS] MP-6 D8 크로스플랫폼** — `grep -c syscall spec.md → 0`. 자동 통과.
- **[PASS] MP-7 미해소 [NEEDS CLARIFICATION]** — `grep -rn '\[NEEDS CLARIFICATION' plan.md` → 0건. `plan.md` §B.1 의 유일했던 미결은 운영자 결정으로 해소돼 있다.

필수 통과는 일곱 전부 통과했다. **판정 FAIL 의 근거는 루브릭 점수(Testability 0.25)이며**, 아래 F1~F5 는 M6 분류상 **blocking** 이다 — 요구사항이 실제로 말하는 것을 기준이 관측하지 못하기 때문이다.

---

## 결함 (심각한 순서)

### F1 — [critical / blocking] AC-WEBUI-010 이 `web-chat.test.ts` 에 없는 `loadDom()` 을 부른다

- 자리: `acceptance.md:362`, `acceptance.md:383` (둘 다 AC-WEBUI-010, 판정 명령 **J2** = `test/web-chat.test.ts`)
- 원문: `  const doc = loadDom()`
- 실측: `server/test/web-chat.test.ts` 의 파일 스코프 헬퍼는 `FakeEventSource`(17) · `installFetch`(41) · `inviteGets`(56) · `flush`(60) · `loadApp`(86) · `$$`(110) · `el`(111) · `input`(112) · `type`(115) · `pressEnter`(122) · `pressKey`(127) · `msg`(134) · `baseHandler`(143) · `pickFiles`(722) · `pickFile`(733) 뿐이다. **`loadDom` 은 없다.** 정의는 `server/test/web-shell.test.ts:16` 에 있고 두 파일은 서로를 import 하지 않는다.
- 왜 중요한가: `server/tsconfig.json` 이 `test` 를 include 하므로 `npm run typecheck` 가 `TS2304: Cannot find name 'loadDom'` 로 붉어지고, vitest 실행도 그 자리에서 죽는다. AC-010 은 C3(작성기)의 유일한 구조 기준이다 — 즉 C3 전체가 관측 없이 남는다.
- 고치는 법: AC-010 의 두 `it` 안에서 `web-chat.test.ts` 가 이미 쓰는 방식(`loadApp()` 이 `document.body.innerHTML` 을 index.html 로 채운다, `web-chat.test.ts:93-95`)을 쓰거나, `web-chat.test.ts` 끝 블록에 `loadDom` 을 지역 정의한다. 후자를 택하면 `acceptance.md:15` 의 「기존 골격을 그대로 쓴다」 문장도 함께 고쳐야 한다.

### F2 — [critical / blocking] AC-WEBUI-012·014 가 `web-shell.test.ts` 에 없는 `flush()` 를 부른다

- 자리: `acceptance.md:450`, `:452`, `:506` (AC-012·AC-014, 판정 명령 **J1** = `test/web-shell.test.ts`)
- 원문: `  await flush()`
- 실측: `grep -n 'flush' server/test/web-shell.test.ts` → **0건**. `flush` 는 `web-chat.test.ts:60` 과 `web-markdown.test.ts:426` 에만 있다. `web-shell.test.ts` 는 비동기를 `await app.login(...)` 처럼 프로미스를 직접 기다리는 방식으로만 다룬다.
- 왜 중요한가: F1 과 같은 타입 오류·런타임 오류. 게다가 AC-014 는 이 SPEC 이 **가장 강하게 방어했다고 주장하는 기준**(테스트 대역 함정 계열)이다 — 그 기준이 실행되지 않으면 방어도 없다.
- 고치는 법: `web-shell.test.ts` 끝 블록에 `flush` 를 지역 정의하거나, `initApp()` 의 부트스트랩 사슬이 프로미스를 반환하지 않으므로 `await new Promise(r => setTimeout(r, 0))` 를 쓴다. 어느 쪽이든 `acceptance.md:15` 의 헬퍼 목록 문장을 파일별로 갈라 적어야 한다.

### F3 — [critical / blocking] 공통 헬퍼 `rule()` 이 스스로를 이중 이스케이프해 **모든 클래스 선택자 호출에서 던진다**

- 자리: `acceptance.md:22-28`
- 원문:
  ```ts
  const re = new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'g')
  ```
- 호출부는 이미 이스케이프된 문자열을 넘긴다: `rule('\\.room-prefix')`(:122), `rule('\\.room-name')`(:127,128), `rule('\\.archive-btn')`(:177), `rule('\\.room-item\\.active')`(:213,214), `rule('\\.message:not\\(\\.turn-cont\\)')`(:264), `rule('\\.message')`(:265), ``rule(`\\.avatar-color-${n}`)``(:298), `rule('\\.ac-kind\\.to')`(:372).
- 기계적 추적: JS 문자열 `'\\.room-prefix'` 는 문자 `\` + `.room-prefix` 다. `replace` 가 `\` 를 `\\` 로, `.` 를 `\.` 로 다시 escape 하므로 최종 패턴은 `\\\.room-prefix` — 정규식으로는 **「리터럴 역슬래시 다음에 점」** 을 요구한다. `web/style.css` 에 역슬래시는 없으므로 매치가 0이고, 헬퍼는 곧바로 `throw new Error('선택자 «...» 규칙이 style.css 에 없다')` 를 낸다.
- 왜 중요한가: CSS 정적 관측 **열두 곳 전부**가 「규칙이 없다」는 오해를 부르는 메시지로 실패한다. 구현자는 CSS 를 올바로 썼는데도 붉은 화면을 보고 CSS 를 계속 고치게 된다 — run 단계에서 가장 비싼 종류의 시간 낭비다. `#autocomplete`·`#msg-input`·`#composer-box` 처럼 `#` 로 시작하는 넷만 우연히 통과한다.
- 고치는 법: 호출부에서 이스케이프를 빼고 `rule('.room-prefix')` 로 넘기거나, 헬퍼에서 `replace` 를 지운다. 둘 중 하나만 고른다 — 지금은 양쪽이 다 이스케이프하고 있다.
- 부수 결함 둘(같은 헬퍼): ① 기존 `web-shell.test.ts:396 cssRuleBlock` 은 **CSS 주석을 먼저 벗긴다**. 그 이유가 주석에 적혀 있다 — "규칙 설명 주석이 셀렉터 문법을 그대로 인용하면 주석 속 문자열이 진짜 규칙보다 먼저 잡힌다(D-3 가드 it 이 잡은 실제 사례)". 새 `rule()` 은 주석을 벗기지 않아 이미 한 번 물린 함정을 되살린다. ② `[^}]*` 는 중괄호 깊이를 세지 않아 미디어쿼리 안의 규칙을 잡지 못한다(`cssRuleBlock` 은 센다).

### F4 — [critical / blocking] AC-WEBUI-003 이 저장소에 없는 `window.__app` 을 「기존 파일이 쓰는 접근 경로」라고 적는다

- 자리: `acceptance.md:143`
- 원문: `    const app = (window as any).__app   // 기존 파일이 쓰는 접근 경로를 따른다`
- 실측: `grep -rn '__app' web server/test` → **NONE**. `server/test/web-visual.test.ts` 는 104행 전부가 단 하나의 `it` 이며, `page.goto` → `page.fill('#login-username')` → `page.click` → `waitForSelector` → `boundingBox()` 만 한다. `page.evaluate` 도, 앱 모듈 전역 노출도 없다. `web/app.js` 는 ES 모듈이고 어디에도 전역을 심지 않는다.
- 왜 중요한가: ① AC-003 을 쓰려면 **`web/app.js` 에 전역 노출 코드를 더해야 한다** — 어떤 요구사항도 그것을 허락하지 않으며, REQ-WEBUI-016 이 동결한 표면 밖에서 프로덕션 코드를 늘리는 일이다. ② AC-003 은 **C1 의 핵심 주장(「행 높이 26px 한 줄」, REQ-001)을 관측하는 유일한 기준**이다. 그것이 실행 불가이고 Playwright 부재 시 skip 이므로, C1 의 시각 계약은 사실상 무보증이다. ③ `// …기존 파일의 서버 기동·로그인 절차를 그대로 밟은 뒤…` 라는 생략표는 재사용 가능한 헬퍼가 있는 것처럼 읽히지만, 그 절차는 유일한 `it` 안에 인라인돼 있어 새 `it` 은 40여 줄을 복제해야 한다.
- 고치는 법: (a) 로그인 후 `#room-list` 를 실제 서버 데이터로 채우고 `page.$$eval` 로 재는 방식으로 다시 쓰거나(전역 불필요), (b) `web-visual.test.ts` 의 기동 절차를 `beforeAll` 헬퍼로 뽑는 리팩터를 M2 산출물에 명시하거나, (c) AC-003 을 jsdom 으로 옮길 수 없음을 인정하고 CSS 정적 관측(`rule('.room-item')` 이 `height: 26px` 를 갖는다)으로 대체한다. 어느 쪽이든 "기존 파일이 쓰는 접근 경로" 라는 **사실이 아닌 문장**은 지운다.

### F5 — [critical / blocking] `.message` 그리드가 `SPEC-WEBRICH-001` 의 장식 노드를 40px 아바타 칸으로 밀어 넣는다 — 어떤 기준도 이것을 보지 않는다

- 자리: `spec.md:186-191` (REQ-WEBUI-005 의 그리드 선언), `spec.md:434-435` (§5.4 「닿지 않는다」 주장)
- SPEC 의 주장 원문: `| SPEC-WEBRICH-001 | .message a.attachment, .message img.attachment-image, .verdict-row, #invite-dialog 일가 | **닿지 않는다** | 넷 다 메시지 안쪽 또는 다이얼로그이며 작성기 밖이다 |`
- 실측 반증: `web/rich.js:122` 는 `el.appendChild(node)`, `web/rich.js:159` 는 `el.appendChild(row)` 다. 여기서 `el` 은 장식 훅이 받는 `.message` 요소 그 자체다. 즉 첨부 노드와 `.verdict-row` 는 **`.message` 의 직계 자식**이지 「메시지 안쪽(`.msg-body` 아래)」이 아니다. 형제 시험이 그 사실을 못 박고 있다: `server/test/web-chat.test.ts:384` `expect($$('#messages .message > figure').length).toBe(2)`, `server/test/web-markdown.test.ts:593` `expect(document.querySelectorAll('#messages .message > figure').length).toBe(2)`, `:504` `expect(document.querySelectorAll('#messages .msg-body .verdict-row').length).toBe(0)`.
- 결과: `.message { display: grid; grid-template-columns: 40px 1fr }` 아래에서 명시 배치가 없는 네 번째 이후 직계 자식은 **자동 배치**돼 40px 폭 첫 열(3행)로 들어간다. 첨부 이미지와 승인/거부 버튼 두 개짜리 `.verdict-row` 가 40px 안에서 뭉갠다.
- 왜 가장 위험한가: **시험은 전부 초록으로 남는다.** 위 세 단언은 전부 DOM 개수만 세므로 레이아웃 붕괴에 침묵한다. `spec.md:425` 가 시각 관측을 맡긴 `web-visual.test.ts` 에도 이 화면은 없다. 즉 «시험은 초록인데 화면이 깨진» 상태로 sync 를 통과한다.
- 고치는 법: REQ-WEBUI-005 의 CSS 블록에 직계 자식 기본 배치를 한 줄 더한다 — `.message > :not(.msg-avatar) { grid-column: 2; }` (또는 `grid-auto-flow` 를 명시). 그리고 §5.4 의 「닿지 않는다」 행을 「닿는다 — 그리드 자동 배치가 직계 자식을 지배한다」로 고치고, 형제 장식 노드가 2열에 놓이는 것을 관측하는 기준을 하나 추가한다(예: `rule('.message > :not(.msg-avatar)')` 가 `grid-column: 2` 를 갖는다).

### F6 — [major / blocking] AC-WEBUI-015 관측 (5) 는 시험이 **통과했는지** 를 재지 않는다 (오히려 실패할 때 참이 되기 쉽다)

- 자리: `acceptance.md:559`
- 원문: `cd server && npx vitest run test/web-shell.test.ts 2>&1 | grep -c 'AC-WEBSHELL-003'   # 기대: 1 이상`
- 문제: vitest 기본 리포터는 **통과한** 테스트 이름을 출력하지 않는다(파일 한 줄 + 요약으로 접는다). 이름이 표준 출력에 나오는 것은 대개 **실패했을 때**다. 따라서 이 관측은 「영속 id 20개가 살아 있다」를 재는 것이 아니라, 잘해야 무의미하고 나쁘면 **부호가 뒤집혀 있다.**
- 왜 중요한가: 영속 id 20개는 C4 가 `#logout-btn` 을 옮기면서 가장 깨지기 쉬운 계약이고(REQ-WEBUI-012 [HARD]), 그 마감 관측이 이것 하나다.
- 고치는 법: `npx vitest run test/web-shell.test.ts -t 'AC-WEBSHELL-003'` 의 **종료 코드 0** 을 본다. 또는 `index.html` 을 직접 읽어 20개 id 존재를 세는 명령으로 바꾼다.

### F7 — [major / blocking] AC-WEBUI-016 은 REQ-WEBUI-015(계약문 되쓰기)를 관측하지 못한다 — 구현 코드만으로 전부 통과한다

- 자리: `acceptance.md:577-581`
- 원문: `grep -c 'SPEC-WEBUI-001' web/app.js # 기대: 2 이상` / `grep -c 'room-hash' web/app.js # 기대: 1 이상` / `grep -c 'msg-avatar' web/app.js # 기대: 1 이상`
- 문제: 뒤 둘은 `renderRooms()` 의 `span.className = 'room-hash'` 와 `renderMessage()` 의 `'msg-avatar'` 로 **구현만 해도** 충족된다. 앞 하나는 아무 데나 문자열을 두 번 적으면 충족된다. 즉 REQ-015 가 요구하는 「§5 의 개정된 계약문을 주석 자리에 되쓴다」는 **한 글자도 검증되지 않는다.** 이 SPEC 이 스스로 정의한 함정 부류 「이름 없는 통과」에 정확히 해당한다.
- 고치는 법: 개정 계약문에서 코드에 나타날 수 없는 문장 조각을 골라 grep 한다(예: `grep -c 'span.room-prefix ── 앞머리' web/app.js`, `grep -c '§5.2' web/app.js`), 그리고 그것이 주석 줄인지 확인한다(`grep -c '^// .*§5\.2'`).

### F8 — [major / blocking] `GET /api/auth/me` 의 대역 함정 차단이 **명령이 아니라 산문**이다

- 자리: `acceptance.md:539-541` ([HARD] 절), `plan.md:128`, `plan.md:235`
- 검증 결과 — SPEC 의 주장 절반은 **사실이다**: `server/test/auth-name.test.ts:32` 가 `app.get('/api/me', { preHandler: [requireAuth] }, ...)` 로 시험 전용 대역을 등록해 두고 있고, AC-013 은 `/api/auth/me` 를 찌른다. Fastify 라우팅상 두 경로는 별개이므로 **AC-013 은 실제 프로덕션 라우트를 관측한다.** 경로 고정은 유효하다.
- 남은 구멍: 「시험 파일이 `/api/auth/me` 를 스스로 등록해서는 안 된다」는 금지가 **어떤 명령으로도 관측되지 않는다.** `build()` 에 한 줄만 더하면 `server/src/auth.ts` 의 라우트를 통째로 지워도 AC-013 은 초록이다. `acceptance.md:35-45` 표는 이 실패 형태를 스스로 열거하고 「막는 관측: AC-013 의 [HARD] 절」이라고 적었는데, [HARD] 절은 관측이 아니라 문장이다.
- 고치는 법: 대역이 **없는** 앱으로 한 번 더 찌른다 — 같은 `it` 안에서 `const bare = Fastify(); bare.db = db; await bare.register(cookie); registerAuthRoutes(bare, db)` 를 만들고 `expect(bare.hasRoute({ method: 'GET', url: '/api/auth/me' })).toBe(true)` 를 단언한다. 한 줄이면 산문이 명령이 된다.

### F9 — [major / blocking] `auth.ts:20` 의 `@MX:NOTE` 와 `auth-name.test.ts:126` 의 계약 주석이 새 라우트로 **거짓이 된다** — 개정 목록에 없다

- 자리: `server/src/auth.ts:20` — `// @MX:NOTE: 이 모듈이 등록하는 라우트는 login·logout 둘뿐 — 가입은 없다`; `server/test/auth-name.test.ts:126` — `// 이 모듈이 등록하는 /api/auth 라우트는 login·logout 둘뿐이다`
- SPEC 은 `web/app.js` 의 계약 주석 **둘만** 되쓰도록 요구한다(REQ-WEBUI-015, §5.1·§5.2). `registerAuthRoutes` 가 세 라우트를 등록하게 되는 순간 위 두 문장은 코드 옆에 남은 거짓 계약이 된다.
- 시험은 깨지지 않는다(`auth-name.test.ts:128` 단언은 `'regist'` 만 본다) — 그래서 조용하다. REQ-015 가 세운 원칙(「계약이 문서에만 있고 코드에 없으면 다음 사람이 옛 계약을 되살린다」)이 바로 이 자리에 적용돼야 한다.
- 고치는 법: REQ-WEBUI-015 의 되쓰기 대상을 **세 자리**로 늘리고(`web/app.js` 둘 + `server/src/auth.ts:20`), `auth-name.test.ts:126` 주석도 M3 산출물에 넣는다. AC-016 에 `grep -c 'login·logout 둘뿐' server/src/auth.ts # 기대: 0` 를 더한다.

### F10 — [major / blocking] REQ-WEBUI-004 의 「강조색은 화면에 하나만 남는다」가 같은 문서 안에서 네 번 반증된다

- 자리: `spec.md:170` — `강조색은 화면에 **하나만** 남는다 — 보내기 버튼(REQ-WEBUI-011)과 현재 방의 2px 막대(REQ-WEBUI-002)뿐이다.`
- 반증: `spec.md:219` (REQ-007 `.bot-badge { background: var(--md-accent) }`), `spec.md:245` (REQ-009 초점 시 inset 테두리 `var(--md-accent)`), `spec.md:275` (REQ-012 계정 바 아바타 `background: var(--md-accent)`), 그리고 `spec.md:83` 의 대조표 자신이 `--md-accent` 의 용처를 **넷**으로 적는다.
- 추가 실측: `web/design-tokens.css:33` `--md-role-color-4: #5865f2` 는 `--md-accent: #5865f2` 와 **같은 값**이다. 따라서 `avatar-color-4` 를 배정받은 작성자의 아바타는 강조색과 구분되지 않는다 — REQ-006 의 「개인을 가른다」와 REQ-004 의 「강조색 절약」이 그 한 색에서 동시에 흐려진다.
- 왜 중요한가: 이 문장은 C4 의 근거 문장이라 구현자가 규범으로 읽는다. 「하나만」을 곧이곧대로 지키면 REQ-007·009·012 를 어기게 된다.
- 고치는 법: REQ-004 의 문장을 사실에 맞게 고친다 — 「사이드바에서 강조색을 쓰는 것은 현재 방 막대와 계정 바 아바타뿐이고, 두 생성 버튼은 조용해진다」. `--md-role-color-4` 충돌은 §1.2 아래에 한 줄 관측으로 남긴다(새 토큰을 만들지 않는 결정은 유지).

### F11 — [major / blocking] C3 의 머리 주장(「폭을 그대로 쓴다」)에 이를 떨어뜨릴 기준이 없다

- 자리: `spec.md:235` — `그 컨테이너가 채팅 열의 폭을 그대로 쓰게 해야 한다`
- 요구사항 본문의 CSS 목록(`spec.md:237-241`)에는 `#composer-box` 의 폭 선언이 **없다.** 실측상 `web/style.css:336-340` 의 `#composer { display: flex }` 가 그대로 남으므로, `#composer-box` 는 `flex: 1` 또는 `width: 100%` 없이는 내용 폭까지만 늘어난다.
- AC-WEBUI-010 은 `rule('#composer-box')` 가 `background: var(--md-bg-input)` 를 갖는지만 본다(`acceptance.md:375`). 폭이 좁은 구현이 그대로 통과한다 — C3 이 해결하겠다고 선언한 결함 C3(「입력칸이 버튼에 폭을 떼어 줘 가운데가 좁다」)이 남아도 초록이다.
- 고치는 법: REQ-009 의 CSS 목록에 `#composer-box { flex: 1; min-width: 0 }`(또는 `#composer { display: block }` + `width: 100%`)를 명시하고, AC-010 에 그 선언을 관측하는 단언을 더한다.

### F12 — [major / blocking] AC-WEBUI-011 의 첫 단언은 요구사항이 정하지 않은 초기 상태에 의존한다 (그리고 정적 문자열로 만족된다)

- 자리: `acceptance.md:405-408`
- `await app.openRoom(1); await flush()` 직후 곧바로 `expect(send.getAttribute('aria-disabled')).toBe('true')` 다. REQ-WEBUI-011(`spec.md:267`)은 상태 갱신 호출 자리를 **셋**(`onComposerInput`·`renderPickedFiles`·`clearPickedFiles`)으로 못 박았고, 그 셋 중 어느 것도 방 열기 시점에 반드시 도는 것이 아니다. 속성이 없으면 `getAttribute` 는 `null` 을 돌려 이 단언이 실패한다.
- 뒤집힌 위험도 같다: 구현자가 `web/index.html` 의 `<button id="send-btn" aria-disabled="true">` 로 **정적 문자열만** 박아도 첫 단언은 통과한다.
- 고치는 법: REQ-011 에 「초기값은 `web/index.html` 이 `aria-disabled="true"` 로 싣고, 이후 세 자리가 갱신한다」를 명시하거나, 갱신 함수를 `initChat()`/`openRoom()` 에서 한 번 부르도록 넷째 호출 자리를 요구사항에 넣는다.

### F13 — [minor / optional] `web/style.css` 밖의 16진수 리터럴은 어떤 기준도 막지 않는다

- 운영자 제약 4 는 「색은 `var(--md-*)` 참조로만」이다(`plan.md:131`). REQ-WEBUI-016 의 금지는 `web/style.css` 로 한정돼 있고(`spec.md:333`), AC-WEBUI-015 관측 (1)도 `web/style.css` 만 grep 한다(`acceptance.md:551`).
- 그런데 이 SPEC 은 **인라인 SVG 를 네 곳에 새로 넣는다** — `.archive-btn`(REQ-003), `#new-room-btn`·`#new-bot-btn`(REQ-004), `#attach-btn`(REQ-010), `#logout-btn`(REQ-012). `stroke="#949ba4"` 같은 리터럴이 `web/index.html`·`web/app.js` 로 들어와도 관측되지 않는다. REQ-010 만 `stroke="currentColor"` 를 못 박았고 나머지 셋은 「stroke 방식 인라인 SVG」라고만 적는다.
- 고치는 법: 네 SVG 전부에 `stroke="currentColor"`(또는 `fill="none"` + `currentColor`)를 요구사항에 못 박고, AC-015 에 `grep -cE '(stroke|fill)="#[0-9a-fA-F]' web/index.html web/app.js # 기대: 0` 을 더한다.

### F14 — [minor / optional] `font-size` 기준선 관측이 px 단위만 잡는다

- `acceptance.md:554` — `grep -cE 'font-size:\s*[0-9.]+px' web/style.css # 기대: 1`
- 실측으로 기준선은 확인했다(아래 「깨끗한 것」 참조). 그러나 금지 대상은 「세 토큰 밖의 새 `font-size` 값」이다(`spec.md:334`). `font-size: 1.1em` / `0.8rem` / `90%` 는 이 grep 을 통과한다.
- 고치는 법: `grep -cE 'font-size:\s*(?!var\()' ...` 계열(또는 `grep -c 'font-size:' minus grep -c 'font-size: var('`)로 「토큰이 아닌 font-size 선언 수」를 세고 기준선 **9**(20px 1 + em 8)를 유지하는 형태로 바꾼다.

### F15 — [minor / optional] CSS 관측이 구현자의 **작성 형식**을 과하게 고정한다

- `acceptance.md:230` — `/#new-room-btn,\s*#new-bot-btn\s*\{([^}]*)\}/`. 선택자 순서를 뒤집거나(`#new-bot-btn, #new-room-btn`) 두 규칙으로 나누면 올바른 구현이 떨어진다.
- 마찬가지로 `rule('.room-name')` 은 **정확히 그 단일 선택자** 규칙을 요구한다. `.room-item .room-name { }` 로 쓰면 헬퍼가 던진다.
- 고치는 법: 요구사항 본문에 선택자 문자열을 규범으로 못 박거나(그러면 기준이 정당해진다), 기준을 「해당 선언이 어딘가에 있다」 수준으로 완화한다. 지금은 요구사항이 자유를 주고 기준이 뺏는다.

### F16 — [minor / optional] Tier 상한을 맞추려고 요구사항을 **합쳤다**고 SPEC 이 스스로 기록한다

- `spec.md:26` (HISTORY 0.2.0) — `**Tier M 상한 16/16 을 지키려고 둘을 합쳤다** — 구 REQ-002(행 한 줄 고정)를 REQ-001 안으로, 구 REQ-013(첨부 칩·자동완성 자리)을 작성기 컨테이너 요구사항 안으로 접었다. 수용 기준도 같은 이유로 둘을 합치고…`
- Tier 예산은 「초과하면 tier 를 올리거나 SPEC 을 쪼개라」는 신호이지 「병합해서 맞춰라」가 아니다. 결과가 REQ-001(렌더러 구조 + 화면 높이 + CSS 다섯 선언, `spec.md:125-149`)과 REQ-009(컨테이너 + 초점 + 칩 배치 + 자동완성 불변, `spec.md:234-253`) 같은 복합 요구사항이고, F11·F12 의 「관측 없는 하위 주장」이 정확히 그 안에서 생겼다.
- 파일 수 재측정은 **정직하다**: `plan.md:13` 이 세는 8(소스 4 + 시험 4)은 마일스톤이 실제로 여는 파일과 일치한다(M1: web-chat.test/app.js/style.css, M2: web-shell.test/app.js/index.html/style.css/web-visual.test, M3: auth-name.test/auth.ts/web-shell.test/app.js/index.html/style.css, M4: web-chat.test/index.html/app.js/style.css). 즉 **Tier 는 M 이 맞다.** 문제는 tier 가 아니라 **예산을 병합으로 맞춘 방식**이다.
- 고치는 법: REQ-001 을 「DOM 구조」와 「행 높이·생략 규칙」으로 되돌려 쪼개고 예산 초과분은 Tier 재판정으로 다룬다. 또는 현행 유지하되 F11·F12 의 관측을 보강해 복합 요구사항의 각 주장이 각각 떨어질 수 있게 한다.

### F17 — [minor / optional] 마일스톤 M2↔M3 의 순서 위험이 SPEC 안에서 인정되지만 기준이 그것을 견디지 못한다

- `plan.md:187` — `계정 바의 **이름 칸은 이 마일스톤에서 비워 둔다** — 구조와 로그아웃 생존만 여기서 관측하고, 이름을 채우는 것은 M3 이다.`
- 그런데 M2 의 산출 목록(`plan.md:185`)은 AC-WEBUI-012 통과를 포함하고, AC-012 의 스텁(`acceptance.md:452-457`)은 `'GET /api/auth/me'` 를 **이미 포함한다**. M3 이전에는 `initApp()` 이 `/api/auth/me` 를 부르지 않으므로 스텁은 그냥 안 쓰일 뿐 — 통과한다. 실행 가능은 하다.
- 진짜 위험은 반대편이다: M2 에서 `#logout-btn` 을 계정 바로 옮기고 `margin-top: auto` 를 지우면, 계정 바의 `margin: auto ...`(REQ-012)가 그 자리를 대신한다. `web/style.css:95-103` 의 `#sidebar { display: flex; flex-direction: column; padding: var(--md-space-3) }` 를 실측했고 **음수 마진 계산은 맞다.** 이 부분은 깨끗하다.
- 나머지 순서는 건전하다: M1(메시지)·M2(사이드바)·M4(작성기)는 서로 겹치는 CSS 선택자가 없고, M3 만 M2 에 의존하며 그 의존이 문서에 적혀 있다.
- 고치는 법: M2 산출 문장에 「AC-012 는 이름 칸이 빈 상태로 통과한다」를 한 줄 명시해 구현자가 M3 를 기다리지 않게 한다.

---

## 깨끗하다고 확인한 것 (근거 포함)

| 검사 | 결과 | 근거 |
|------|------|------|
| `web/style.css` 16진수 색 리터럴 기준선 | **0건 — SPEC 주장 정확** | `grep -cE ':[^;{]*#[0-9a-fA-F]{3,8}\b' web/style.css` → `0`. 더 넓은 `grep -nE '#[0-9a-fA-F]{3,8}\b' web/style.css` 도 **출력 없음** |
| `web/style.css` px `font-size` 기준선 | **1건 — SPEC 주장 정확** | `grep -nE 'font-size:\s*[0-9.]+px'` → `69:  font-size: 20px;` (`#auth-view h1`). 단 em 단위 선언 8건 존재(1.4/1.25/1.15/1.05/0.95/0.9×2/0.85×2) — 전부 `SPEC-WEBMD-001`·기존 블록이며 `spec.md:334` 는 `0.9em`·`0.85em` 만 열거해 불완전하다(F14 참조) |
| `§1.2` 토큰 대조표 | **전 항목 실재** | `web/design-tokens.css` 에 `--md-bg-sidebar/panel/main/hover/input`, `--md-text-primary/muted`, `--md-accent`, `--md-divider`, `--md-role-color-1..5`, `--md-font-size-label/timestamp/body`, `--md-font-weight-name`, `--md-space-1..5`, `--md-radius-avatar/input/badge`, `--md-border-width`, `--md-status-error` 전부 present |
| 리터럴 길이 선례 주장 (`plan.md:89`) | **정확** | `style.css:414 min-height: 44px`, `:347 min-width: 240px`, `:533 max-height: 200px` |
| `requireAuth` 불변 요구 | **근거 실재, 설계상 강제 불필요** | `server/src/auth.ts:52-53` 에 `@MX:ANCHOR` + `@MX:REASON` 실재. 제안된 라우트 `app.get('/api/auth/me', { preHandler: [requireAuth] }, async req => req.user)` 는 `requireAuth` 를 **preHandler 로 소비만** 한다 — 시그니처·401 본문(`:56`,`:60`)·`req.user` 모양(`:61`) 어느 것도 건드릴 이유가 없다. `req.user` 는 `SELECT u.id, u.username` 결과 그대로(`:57-59`)이므로 AC-013 의 `toEqual(row)`·`Object.keys(...).sort()` 단언이 실제로 성립한다. **실무상 `requireAuth` 변경을 강제하는 경로를 찾지 못했다** |
| 세 곳 고정 주장 | **확인** | `spec.md:302` [HARD], `spec.md:454` (범위 밖), `plan.md:126` (§D 제약표) — 셋 다 실재 |
| `/api/auth/me` vs 시험 대역 `/api/me` 경로 분리 | **유효** | `auth-name.test.ts:32` 가 `/api/me` 를 등록하지만 Fastify 라우팅상 `/api/auth/me` 와 별개다. AC-013 은 진짜 라우트를 찌른다 (구멍은 F8) |
| AC-014 둘째 `it` 의 `login()` 방어 | **실제로 작동한다** | `web-shell.test.ts:29-44` 의 `stubFetch` 는 미등록 경로에서 `throw new Error('스텁에 없는 경로: ...')` 를 낸다. `web/app.js:149-175` 의 `login()` 은 두 try 모두 **되던지므로**, `loadMe()` 가 `login()` 본문 어디에 들어가도 `await app.login('alice')` 가 거부돼 시험이 붉어진다 |
| `initApp()` 을 실제로 부르는 기존 시험 부재 (`plan.md:32`) | **정확** | `grep -rn 'initApp' server/test/` → 정적 문자열 단언(`web-shell.test.ts:147-149`)·export 목록(`:159`)·주석(`web-chat.test.ts:93,101-102`)뿐. 런타임 호출 0건. 부트스트랩 사슬에 `loadMe()` 를 끼워도 기존 단언은 안전하다 |
| `AC-WEBSHELL-010` 이 span 분해를 견딘다 (`spec.md:371`) | **정확** | `web-shell.test.ts:277-278` 은 `toContain('프로젝트A')` 이고, `:280-281` 의 `.archive-btn` 유무 단언은 구조에 둔감하다 |
| `web-chat.test.ts` 의 `.msg-head > span` 단언 (`spec.md:421`) | **정확** | `:325-329` 는 첫 메시지(사람, `strong='jw'`)를 본다. 배지는 봇에만 붙으므로 사람 메시지의 `.msg-head > span` 은 여전히 `.msg-time` 하나다 |
| `web-markdown.test.ts` `.msg-body` 정규식 (`spec.md:424`) | **정확한 경고** | `:346` `/\.msg-body\s*\{[^}]*\}/` 는 **첫** 블록(`style.css:317`)을 잡는다. 새 규칙을 파일 끝 블록에 두는 §B.6 방침이면 안전하다 |
| `#sidebar` 음수 마진 계산 (REQ-012) | **성립** | `style.css:95-103` `#sidebar { display:flex; flex-direction:column; padding: var(--md-space-3) }` — `calc(-1 * var(--md-space-3))` 가 정확히 상쇄한다 |
| `.file-chip` 배경 변경 근거 (REQ-009) | **성립** | `style.css:434-442` 현재 `.file-chip { background: var(--md-bg-input) }` — 새 컨테이너가 같은 `--md-bg-input` 이므로 칩이 사라진다는 SPEC 의 관찰이 맞다 |
| `sendMessage()` 빈 전송 차단 (`plan.md:27`) | **정확** | `web/app.js:714~` `sendMessage()` 존재, 빈 전송 가드 실재 |
| 형제 영향 범위 (`web-permission-contract`·`web-rich`·`e2e-lib`) | **무해 — 확인** | `grep` 결과 `web-permission-contract.test.ts`·`e2e-lib.test.ts` 는 `.message`/`.room-item`/`#composer` 계열 선택자를 **하나도** 쓰지 않는다. `web-rich.test.ts` 는 `msgEl()`(`:24`)로 **빈 `div`** 를 만들어 쓰므로 `.message` CSS 와 무관하다 |
| 요구사항↔기준 추적성 | **완전** | REQ-001→AC-001·002·003, 002→005, 003→004, 004→005, 005→006, 006→007, 007→008, 008→009, 009→010, 010→010, 011→011, 012→012, 013→013, 014→014, 015→016, 016→015. 고아 AC 0, 미커버 REQ 0 |
| 범위 누출 (§6 제외 넷 + 아바타 업로드) | **없음** | 동적 placeholder: `index.html:58` 의 `placeholder="메시지 보내기"` 를 바꾸라는 요구사항·기준 0건. 보내기 화살표: REQ-011 은 색·`aria-disabled` 만 규정하고 아이콘을 요구하지 않는다. 보관 방 접기/배지: `#archived-box` 를 만지는 요구사항 0건. 노란 왼쪽 막대: `--md-status-idle`/`border-left` 를 요구하는 자리 0건(오히려 AC-005 가 `border-left` **부재**를 단언한다). 아바타 이미지: 전 요구사항이 「이름 첫 글자」로만 말한다(REQ-005·006·012) |
| 프런트매터·문서 구조 | **적합** | 12필드 present, `### Out of Scope — <주제>` H3 여섯 + 각 불릿, HISTORY·배경·용어·요구사항·판정 절 전부 present |
| `depends_on` 선행 조건 | **주의 표시** | `depends_on: [SPEC-WEBSHELL-001, SPEC-WEBCHAT-001, SPEC-AUTH-001]` 셋 다 실재한다. 다만 셋의 `status:` 가 `completed` 인지는 Phase 1 Depends_on Pre-flight 의 몫이며 이 감사에서 판정하지 않았다 |

---

## 검증하지 못한 것 (그리고 그 이유)

1. **시험을 실제로 돌리지 않았다.** 감사 지시가 `web/`·`server/` 읽기 전용이었고, `npm test` 는 임시 sqlite 를 만들고 포트를 연다. F1·F2·F3 은 **정적 추적**(헬퍼 정의 부재, 문자열→정규식 변환)으로 확정했고 실행 확인은 하지 않았다. 결론을 닫는 명령: `cd server && npm run typecheck` 를 AC 코드 삽입 후 실행하면 F1·F2 가 `TS2304` 로 즉시 드러난다.
2. **F3 의 정규식 추적은 손으로 했다.** 확정 명령: `node -e "const s='\\\\.room-prefix'; console.log(s.replace(/[.*+?^\${}()|[\]\\\\]/g,'\\\\\$&'))"` — 출력이 `\\\.room-prefix` 이면 F3 이 확정된다.
3. **F5 의 그리드 자동 배치는 CSS 사양 추론이다.** DOM 사실(`web/rich.js:122,159` 의 `el.appendChild`)은 실측했지만, 실제 렌더 결과는 브라우저에서만 확인된다. 닫는 명령: 첨부가 있는 메시지를 띄우고 `document.querySelector('#messages .message > figure').getBoundingClientRect().width` 가 40 근처인지 본다.
4. **`depends_on` 셋의 `status:` 를 읽지 않았다** — MP-5 판정에는 존재 여부만 필요했고, 완료 여부 판정은 run 단계 Phase 1 의 몫이다.
5. **아트보드 캔버스에 접근하지 못했다.** `spec.md:65` 의 URL 은 세션 스크래치패드 산출물이다. 따라서 「SPEC 본문이 아트보드를 정확히 옮겼는가」는 판정 불가다 — 다만 `spec.md:68` 이 그 자립성을 [HARD] 로 요구하고, 실제로 §4 본문만으로 화면을 만들 수 있을 만큼 값이 적혀 있음은 확인했다.
6. **`--md-role-color-4` 와 `--md-accent` 의 시각 충돌(F10)이 운영자에게 수용 가능한지** 는 디자인 판단이라 감사가 결정하지 않았다. 사실만 기록했다.

---

## 권고 (번호 순서대로 고친다)

1. **F3 을 먼저 고친다** — 한 곳(`acceptance.md:22-28` 또는 호출부 여덟)만 고치면 CSS 관측 열두 개가 살아난다. 가장 싸고 가장 크다.
2. **F1·F2** — `acceptance.md:15` 의 헬퍼 문장을 파일별로 갈라 다시 쓰고(“`web-shell` 은 `loadDom`·`stubFetch`, `web-chat` 은 `loadApp(handler)`·`baseHandler`·`msg`·`$$`·`el`·`type`·`flush`”), AC-010 에서 `loadDom()` 을, AC-012·014 에서 `flush()` 를 각 파일에 맞게 대체하거나 지역 정의한다.
3. **F5** — REQ-WEBUI-005 의 CSS 블록에 `.message > :not(.msg-avatar) { grid-column: 2 }` 한 줄을 더하고, `spec.md:434` 의 「닿지 않는다」를 사실에 맞게 고치고, 그것을 관측하는 단언을 AC-006 에 붙인다.
4. **F4** — AC-WEBUI-003 을 `window.__app` 없이 다시 쓴다(실서버 데이터로 방 둘을 만들거나, CSS 정적 관측으로 강등). 「기존 파일이 쓰는 접근 경로」라는 거짓 주석을 지운다.
5. **F8·F9** — 대역 금지를 명령으로 바꾸고(`bare` 앱 한 줄), 되쓰기 대상에 `server/src/auth.ts:20` 과 `auth-name.test.ts:126` 을 넣는다.
6. **F6·F7** — 마감 관측 둘을 「종료 코드」와 「주석 고유 문자열」 기준으로 바꾼다.
7. **F10·F11·F12** — REQ-004 의 「하나만」 문장을 사실로 맞추고, REQ-009 에 폭 선언을, REQ-011 에 초기값 출처를 명시한다. 셋 다 요구사항 본문 한 줄씩이다.
8. **F13~F17** 은 optional 로 분류했다 — 오케스트레이터 재량이다. 다만 F13(인라인 SVG 의 hex)은 운영자 제약 4 의 직접적 구멍이라 함께 처리하기를 권한다.

재감사는 위 F1~F12 의 델타에 한정해도 된다(반복 2). 이 열둘이 닫히면 Testability 는 0.25 → 1.0 구간으로 올라가고 조화평균은 0.90 을 넘어 Tier M 통과선을 통과한다.
