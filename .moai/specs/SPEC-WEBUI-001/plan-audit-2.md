# SPEC-WEBUI-001 계획 감사 — 2회차

| 항목 | 값 |
|------|-----|
| 대상 | `.moai/specs/SPEC-WEBUI-001/` 넷 (spec 562 / plan 321 / acceptance 819 / progress 42), `spec.md` 0.3.0 |
| 1회차 보고서 | `plan-audit.md` (판정 FAIL, 조화평균 0.52) — 덮어쓰지 않았다 |
| 감사 시점 | 2026-09-11, `git HEAD = c1ea5fd` (1회차와 같은 트리) |
| 반복 | 2 / 3 |

> M1 컨텍스트 격리 준수. 작성자의 「무엇을 고쳤다」 서술은 **주장으로만** 취급했고, 열일곱 건 전부 현재 파일을 열어 대조했다.

---

## 0. 먼저 — 1회차 감사의 측정 오류를 정정한다

1회차 보고서의 «깨끗하다고 확인한 것» 표에서 `web/style.css` 의 토큰 아닌 `font-size` 를 «em 8건 + 20px 1건 = 9» 로 적었다. **틀렸다. 정답은 11이다.**

```
$ grep -c 'font-size:' web/style.css          → 35
$ grep -c 'font-size: var(' web/style.css     → 24
차                                            → 11
```

내역(직접 열거해 다시 셌다): `20px` 1건(`:69`) + `em` 10건(`:429`, `:441`, `:598`, `:599`, `:600`, `:601`, `:602`, `:603`, `:618`, `:632`). 1회차에 `.md-h` 여섯 줄 가운데 둘을 빠뜨렸다. **작성자가 옳고 내가 틀렸다.** `plan.md` §A 의 「감사 보고서의 「9」는 em 둘을 빠뜨린 값이다」는 정확한 지적이다.

이 라운드에서 인용하는 다른 수치는 전부 다시 쟀다:

| 수치 | 1회차 | 2회차 재측정 | 판정 |
|------|-------|-------------|------|
| `style.css` 16진수 색 리터럴 | 0 | **0** (`grep -cE ':[^;{]*#[0-9a-fA-F]{3,8}\b'` = 0, 더 넓은 `grep -cE '#[0-9a-fA-F]{3,8}'` 도 0) | 1회차 옳음 |
| `style.css` px `font-size` | 1 | **1** (`:69` `20px`) | 1회차 옳음 |
| 토큰 아닌 `font-size` | ~~9~~ | **11** | **1회차 틀림 — 정정** |
| `index.html`·`app.js` SVG 색 리터럴 | (안 쟀음) | **0 · 0** (`grep -cE '(stroke|fill)="#[0-9a-fA-F]'`) | 신규 측정, 작성자 기준선과 일치 |
| 계약 주석 자리 | app.js:64 · :377 | **:64 · :377** 그대로 | 옳음 |
| `.bot-color-4` | (안 쟀음) | **`style.css:329`** — 작성자 인용과 일치 | 옳음 |

---

## 판정

**CONDITIONAL PASS.**

한 문장 이유: 1회차의 blocking 열둘이 **전부 실제로 닫혔고** 요구사항 계층·추적성·필수 통과 일곱이 모두 깨끗하지만, 교정 그 자체가 새 blocking 넷을 만들었다 — 그중 셋은 **올바른 구현을 붉게 만들고**, 하나는 `npm test` 를 `pretest` 단계에서 죽인다. 넷 다 한 줄짜리 국소 수정이므로 FAIL 이 아니라 조건부다.

| 차원 | 1회차 | 2회차 | 밴드 근거 |
|------|-------|-------|----------|
| Clarity | 0.75 | **1.00** | REQ-009 의 폭 선언(`spec.md:261`), REQ-011 의 초기값 출처(`:297`), REQ-004 의 강조색 위계표(`:176-188`)로 해석 여지가 사라졌다 |
| Completeness | 1.00 | **1.00** | 12필드·필수 절·`### Out of Scope — <주제>` 여섯 유지 |
| Testability | 0.25 | **0.50** | 열여섯 중 열이 실행·판별 가능. 여섯(003·004·005·006 뒤 겹·010·016)이 N1~N4 로 막힌다 |
| Traceability | 1.00 | **1.00** | REQ 16 ↔ AC 16, 고아 0, 미커버 0 |

조화평균 = 4 / (1 + 1 + 2 + 1) = **0.80**. Tier M 통과선 0.80 에 정확히 닿는다.

점수 회귀 없음(0.52 → 0.80) — STOP 신호 해당 없음.

### 필수 통과 (7/7 PASS, 1회차와 동일)

- **MP-1** REQ-WEBUI-001~016 순차·무중복 (`spec.md:130~375`, `grep -c '^\*\*REQ-WEBUI-'` = 16)
- **MP-2** GEARS — 요구사항 계층 열여섯 전부 다섯 패턴 중 하나. Ubiquitous 아홉, Where 하나(`:242`), While 셋(`:156`·`:251`·`:287`), When 둘(`:161`·`:340`), Unwanted 하나(`:375`). `acceptance.md` 의 Given-When-Then 은 검증 계층이므로 감점 대상 아님
- **MP-3** 프런트매터 12필드 present, `version: "0.3.0"`, `phase: "v2.2.0 target"`(생명주기 토큰 아님), snake_case 별칭 0
- **MP-4** N/A — 단일 언어 프로젝트
- **MP-5** D7 — 참조 SPEC 전부 실재, retired/superseded/archived 0건
- **MP-6** D8 — `grep -c syscall spec.md` = 0
- **MP-7** `grep -rn '\[NEEDS CLARIFICATION' plan.md` = 0

---

## 1. F1~F17 검증표

| # | 주장 | 판정 | 근거 (file:line + 인용) |
|---|------|------|------------------------|
| **F1** | `loadDom` 오용 제거 | **VERIFIED FIXED** | `acceptance.md:481-483` — `// [F1] 이 파일에는 loadDom 이 없다. index.html 본문을 세우는 일은 loadApp() 이 이미 한다(:90-93).` 뒤 `await loadApp(baseHandler()); const doc = document`. 둘째 `it`(`:505-507`)도 같은 형태. `grep -n 'loadDom()' acceptance.md` 의 잔여 호출은 전부 `web-shell.test.ts` 대상(:126, :158, :210, :268, :613, :692) — 그 파일에는 `loadDom`(:16)이 있다. 실측 헬퍼 표(`acceptance.md:23-30`)가 파일별 가용 목록을 정확히 적었다 |
| **F2** | `flush` 지역 정의 | **VERIFIED FIXED** | `acceptance.md:39-42` — `// web-shell.test.ts — 이 파일에는 flush 가 없다. … const flush = () => new Promise(r => setTimeout(r, 0))`. AC-012(`:611`)·AC-014(`:681`) 각각 `> [F2]` 인용문으로 재확인. 실측: `grep -n flush server/test/web-shell.test.ts` → 0건 (표의 「**`flush` 없음**」이 맞다) |
| **F3** | `rule()` 삭제, `cssRuleBlock` 로 전환, 이스케이프 제거 | **VERIFIED FIXED** (단, N3 을 낳았다) | 호출부 열두 자리 전부 이스케이프 없음: `:173` `rule('.room-prefix')`, `:178-179` `rule('.room-name')`, `:195` `cssRuleBlock(src, '.room-item')`, `:257` `rule('.archive-btn')`, `:293-294` `rule('.room-item.active')`, `:344-345`, `:349`, `:417`, `:493`. **역슬래시가 남은 호출 0건** (직접 grep 확인). `:62` `const rule = (sel: string) => cssRuleBlock(css(), sel)   // 편의 별칭 — 이스케이프 없음`. `:54` [HARD] 절이 양쪽 이스케이프 금지를 명문화 |
| **F4** | `window.__app` 삭제, 두 겹 재작성 | **VERIFIED FIXED** (단, N4 에 걸린다) | `grep -rn '__app' acceptance.md` → 잔여는 `:210` 의 **금지 문장**뿐: `**`window.__app` 같은 전역은 쓰지 않는다** — `web/app.js` 는 ES 모듈이고 전역을 심지 않으며, 그것을 심으라고 요구하는 요구사항도 없다.` 앞 겹(`:193-202`)은 CSS 정적이라 브라우저 없이 돌고, 뒤 겹(`:212-236`)은 `bootVisual()` + 실 API(`fetch('/api/rooms')`) + `page.reload()` 로 방을 만든다. `bootVisual()` 계약은 `:70-77`, 추출은 M0 2번(`plan.md:216`) |
| **F5** | 그리드 자동 배치 정정 | **VERIFIED FIXED** | ① `spec.md:204` — `.message > :not(.msg-avatar) { grid-column: 2; }` 가 CSS 블록에 들어갔고 `:206` [HARD] 가 이유를 적었다. ② `spec.md:494` 표제가 「하나는 닿고 하나는 닿지 않는다」로 바뀌고 `:498` 첫 행이 **닿는다 — 그리드 자동 배치가 직계 자식을 지배한다**. ③ `acceptance.md:349` `expect(rule('.message > :not(.msg-avatar)')).toMatch(/grid-column:\s*2/)`, 뒤 겹 `:353-378` 이 탐침 노드 렌더 폭 `>200` 을 관측. 내 1회차 실측(`web/rich.js:122` `el.appendChild(node)`, `:159` `el.appendChild(row)`)이 세 문서에 그대로 인용됐다 |
| **F6** | 종료 코드 관측 | **VERIFIED FIXED** (잔여 하나) | `acceptance.md:766-769` — `# vitest 기본 리포터는 «통과한» 시험 이름을 출력하지 않는다 … grep -c 로 이름을 세는 관측은 부호가 뒤집혀 있었다` + `npx vitest run test/web-shell.test.ts -t 'id hygiene'; echo "exit=$?"`. `-t 'id hygiene'` 는 실재하는 describe 명(`web-shell.test.ts:125` `AC-WEBSHELL-003 id hygiene`)과 맞는다. **잔여**: N9 참조 |
| **F7** | 주석 앵커 grep | **PARTIALLY FIXED** | 앵커 넷 중 **셋은 유효**: `acceptance.md:797` `^// .*SPEC-WEBUI-001 §5\.1 — 꼬리는 줄이지 않는다`(대상 `app.js:64`, 열 0 시작 ✓), `:798` `§5\.2 — 직계 자식 셋`(`app.js:377`, 열 0 ✓), `:799` `^// @MX:NOTE: .*/api/auth/me`(`auth.ts:20`, 열 0 ✓). 앵커 문장 원문은 `spec.md:419-422`·`:466-470` 에 못 박혀 있고 구현 코드가 만들어 낼 수 없는 한국어 문장이라 **판별력이 있다.** **넷째가 깨진다 → N1** |
| **F8** | `hasRoute` 로 등록 출처 관측 | **VERIFIED FIXED — 판별력 있음** | `acceptance.md:655-666` — `const bare = Fastify(); bare.db = db; await bare.register(cookie); registerAuthRoutes(bare, db) // 이 한 줄이 등록하는 것만 있는 앱` 뒤 `expect(bare.hasRoute({ method: 'GET', url: '/api/auth/me' })).toBe(true)`. 대역이 있을 수 없는 앱이므로 라우트가 시험 골격에만 있으면 false 다 — 산문이 명령이 됐다. 의존 심볼 전부 이미 import 돼 있다(`auth-name.test.ts:7` `Fastify`, `:8` `cookie`, `:10` `registerAuthRoutes`) |
| **F9** | 되쓰기 대상 2 → 4 | **VERIFIED FIXED** (넷째 관측은 N1) | `spec.md:359` — `run 단계는 이 SPEC 이 거짓으로 만드는 **네 자리의 계약 주석** 을 전부 되쓴 뒤에야…` + `:365-370` 4행 표(app.js ×2, `auth.ts` `@MX:NOTE`, `auth-name.test.ts`). `plan.md:262` M3 6번이 실행 단계로 넣었다. 옛 문장 grep 넷(`acceptance.md:790-793`)은 실제 텍스트와 정확히 맞는다 — `auth.ts:20` 이 `라우트는 login·logout 둘뿐` 을, `auth-name.test.ts:126` 이 `라우트는 login·logout 둘뿐이다` 를 실제로 담고 있음을 확인했다 |
| **F10** | 강조색 위계 정정 | **VERIFIED FIXED** | `spec.md:174` — 「하나만 남는다」가 **강조색은 사라지지 않고 위계를 얻는다** 로 바뀌고 `:178-183` 에 4행 표(현재 방 막대·BOT 배지·초점 테두리·보내기). `:187` [HARD] 가 「하나뿐으로 읽어 넷 중 어느 것을 지우면 REQ-007·009·011 을 어기게 된다」로 오독을 막는다. `--md-role-color-4 == --md-accent` 는 `:90` 에 **기존 동작**으로 기록(`.bot-color-4` at `style.css:329` — 실측 일치), 팔레트 불변 |
| **F11** | `#composer-box` 폭 선언 | **VERIFIED FIXED** (단, N2 가 여기 있다) | `spec.md:261` — `**그리고 폭 선언 `flex: 1; min-width: 0`**` + `:262` [HARD] 「폭 선언이 없으면 「폭을 그대로 쓴다」가 성립하지 않는다」. `acceptance.md:500-501` 이 `flex:1|width:100%` 와 `min-width: 0` 을 단언하고, 뒤 겹 `:519-538` 이 `boxW > footerW - 40` 으로 실제 폭을 잰다. **판별력 있음** — grow 없는 컨테이너는 내용 폭(≈300px)에 머물러 1040px 열에서 떨어진다 |
| **F12** | 초기 `aria-disabled` 출처 | **VERIFIED FIXED — 판별력 있음** | `spec.md:297` [HARD] **초기값의 출처를 정한다** + `:299-304` 네 자리 표(`initChat()` 추가). `acceptance.md:590-604` 둘째 `it` 이 핵심이다 — `send.setAttribute('aria-disabled', 'false'); type(''); await flush(); expect(...).toBe('true')`. 정적 문자열 구현은 여기서 붉어진다. 실측 확인: `onComposerInput` 은 `initChat()`(`app.js:351`)이 걸고 `openRoom()`(`:233`)이 `initChat()` 을 0단계로 부르므로 `type()` 의 input 이벤트가 실제로 도달한다. `pickFiles`(`web-chat.test.ts:722`)도 실재 |
| **F13** | SVG 색 리터럴 금지 | **VERIFIED FIXED** | `spec.md:383` 금지행 + 다섯 자리 열거(보관·새 방·봇 등록·첨부·로그아웃), 요구사항 본문 넷에 `fill="none" stroke="currentColor"` 명시(`:167`·`:189`·`:280`·`:316`). `acceptance.md:741-743` 관측 (2). `plan.md:171` 제약행. 기준선 재측정 = 0·0 ✓ |
| **F14** | 단위 무관 `font-size` 금지 | **VERIFIED FIXED** | `spec.md:380` — `밖의 새 `font-size` 값을 **단위와 무관하게** 넣는 것 (`px`·`em`·`rem`·`%` 전부)` + 기준선 11 명시. `acceptance.md:745-751` 이 (3) 총량 「11 이하」와 (3-b) **더한 줄** 기준 0 을 함께 둔다. (3-b) 가 방향이 정확한 관측이다 |
| **F15** | 선택자를 요구사항에 규범화 | **PARTIALLY FIXED** | 절반 해소: REQ-001(`spec.md:150-153`)이 `.room-prefix`·`.room-name`·`.room-hash` 를 단일 선택자 규칙으로 못 박아 `rule('.room-name')` 이 정당해졌다. **미해소**: `acceptance.md:302` 의 `/#new-room-btn,\s*#new-bot-btn\s*\{([^}]*)\}/` 는 그대로이고, REQ-004(`spec.md:189`)는 「두 생성 버튼은 `background: none`…」이라고만 적어 **공동 규칙 하나**로 쓰라는 규범이 없다. 선택자 순서를 뒤집거나 두 규칙으로 나누면 올바른 구현이 떨어진다 |
| **F16** | 판단 기록 (병합 방식) | **AS DECLARED — 판단으로 처리** | `plan.md:100-120` §B.8. 「이번 라운드는 합치지 않았다」가 사실임을 확인했다 — REQ 16·AC 16 그대로이고 늘어난 것은 단언 수다. 잔여 비용 셋을 정직하게 표로 적었고, Tier L 전환 조건(`:118` 「다음 라운드에서 요구사항을 하나라도 더 쪼개야 한다면」)을 명시했다. 내가 1회차에 optional 로 분류했으므로 이 처리는 계약대로다 |
| **F17** | M2/M3 순서 명시 | **VERIFIED FIXED** | `plan.md:249` — `[F17] **AC-WEBUI-012 는 이름 칸이 빈 상태로 통과한다.** … **구현자는 M3 을 기다리지 말고 M2 를 닫는다.**` |

**요약: VERIFIED FIXED 13 · PARTIALLY FIXED 2(F7·F15) · AS DECLARED 1(F16) · NOT FIXED 0.**

---

## 2. 새 결함 (교정이 만든 것 + 1회차에 내가 놓친 것) — 심각한 순서

### N1 — [critical / blocking] AC-016 넷째 앵커가 `^//` 로 시작하지만 대상 주석은 **들여쓰기 안에** 있다

- 관측: `acceptance.md:800` — `grep -c '^// .*/api/auth 라우트는 셋' server/test/auth-name.test.ts   # 기대: 1`
- 실측 대상 줄(`awk 'NR==126'` 원문, 대괄호는 내가 붙인 경계 표시):

```
auth-name:126 [    // 이 모듈이 등록하는 /api/auth 라우트는 login·logout 둘뿐이다 — 가입 라우트는 등록되지 않는다]
```

  **선행 공백 넷.** 그 주석은 `describe` → `it` 안에 있어 열 0 이 아니다. 되쓴 뒤에도 들여쓰기는 유지되므로 `^//` 는 **영원히 0** 을 돌려준다.
- 대조: 나머지 셋은 전부 열 0 이다 — `auth.ts:20 [// @MX:NOTE: …]`, `app.js:64 [// .room-item / …]`, `app.js:377 [// div.message.<author_type> …]`. 그래서 셋은 통과하고 넷만 떨어진다. 한 자리만 다른 것이 이 결함을 놓치기 쉽게 만든다.
- 왜 중요한가: 되쓰기를 **정확히 수행한** 구현이 AC-016 에서 붉어진다. 그리고 F9 가 지적한 대로 이 자리는 **다른 어떤 시험도 관측하지 않으므로**(`auth-name.test.ts:128` 은 `'regist'` 만 본다) 이 grep 이 유일한 관측이다 — 그 유일한 관측이 구조적으로 실패한다.
- 고치는 법: `grep -cE '^\s*// .*/api/auth 라우트는 셋' server/test/auth-name.test.ts`. 나머지 셋도 같은 형태로 통일하면 앞으로 들여쓰기가 바뀌어도 안전하다.

### N2 — [critical / blocking] AC-010 이 같은 `it` 안에서 `const box` 를 **두 번 선언한다** (F11 교정이 만든 것)

- 자리: `acceptance.md:484` 와 `acceptance.md:500`

```ts
  const box = doc.getElementById('composer-box')!      // :484
  …
  const box = rule('#composer-box')                    // :500  ← [F11] 로 추가된 줄
```

- `server/tsconfig.json` 은 `"strict": true` 이고 `include: ["src","test"]` 다. 블록 스코프 재선언은 `TS2451: Cannot redeclare block-scoped variable 'box'` 이며, 타입 검사 이전에 **런타임 SyntaxError** 이기도 하다.
- 왜 중요한가: `server/package.json:7` 이 `"pretest": "npm run typecheck"` 다. 즉 이 한 줄이 **`npm test` 자체를 pretest 단계에서 죽인다** — AC-016 의 마지막 관측(`npm test` 종료 코드 0)과 Definition of Done 의 세 항목이 함께 무너진다. F11 을 닫으려고 넣은 줄이 F11 을 포함한 AC-010 전체를 실행 불가로 만들었다.
- 고치는 법: 둘째를 `const boxRule = rule('#composer-box')` 로 바꾸고 `:500-501` 의 단언 둘을 그 이름으로 고친다.

### N3 — [critical / blocking] `cssRuleBlock` 은 **첫 매치**를 돌려주는데, 삭제된 `rule()` 은 **마지막 매치**였다 — §B.6 의 편집 방식과 어긋난다

- 실측 (`server/test/web-shell.test.ts:398-403`):

```ts
  for (let i = bare.indexOf(selector); i !== -1; i = bare.indexOf(selector, i + 1)) {
    if (bare.slice(i + selector.length).trimStart().startsWith('{')) { at = i; break }
  }
```

  `break` — **첫 매치에서 멈춘다.**
- 삭제된 1회차 헬퍼는 정반대였다(`plan-audit.md` 가 인용한 원문): `// 마지막 정의가 이긴다는 CSS 규칙에 맞춰, 같은 선택자가 여러 번 나오면 마지막 것을 준다` → `return all[all.length - 1][1]`.
- `plan.md:90` §B.6 은 **이번 라운드에 바뀌지 않았다**: `이 SPEC 도 파일 끝에 `/* SPEC-WEBUI-001 */ … */` 를 열고 **새 규칙을 전부 그 안에** 둔다`. 즉 새 선언은 파일 **끝**에 간다.
- 충돌하는 세 자리 — 선택자가 `web/style.css` 에 **이미 있고**, AC 가 요구하는 선언은 끝 블록에 갈 것들이다:

| AC | 호출 | 기존 규칙 자리 | 단언 대상 | 결과 |
|----|------|--------------|----------|------|
| AC-003 앞 겹 (`acceptance.md:195-198`) | `cssRuleBlock(src, '.room-item')` | `style.css:133` `.room-item {` | `height: 26px` 존재 · `min-height` 부재 | 첫 매치는 옛 블록 — `height` 가 없어 **떨어진다** |
| AC-004 (`:257-260`) | `rule('.archive-btn')` | `style.css:157` `.archive-btn {` | `opacity: 0` 존재 | 옛 블록에 없다 — **떨어진다** |
| AC-005 (`:293-294`) | `rule('.room-item.active')` | `style.css:146` `.room-item.active {` | `box-shadow: inset 2px 0 0 var(--md-accent)` | 옛 블록에 없다 — **떨어진다** |

- 안전한 자리도 확인했다: `.room-prefix`·`.room-name`·`.message`·`.message > :not(.msg-avatar)`·`.avatar-color-N`·`#composer-box` 는 전부 새 선택자라 충돌이 없고, `.message:not(.turn-cont)`(`:294`)는 §B.6 이 **제자리 삭제**를 지시하므로 첫 매치가 옳다.
- 왜 중요한가: 1회차 F3 과 **정확히 같은 형태의 결함**이다 — 공유 헬퍼의 의미가 올바른 구현을 조용히 떨어뜨린다. 원인만 이스케이프에서 매치 순서로 바뀌었다. 구현자는 CSS 를 옳게 쓰고도 「규칙에 `height: 26px` 가 없다」는 메시지를 본다.
- 고치는 법 — 셋 중 하나를 고른다:
  1. §B.6 을 정밀하게 다시 쓴다: **「기존 선택자에 선언을 더하는 것은 제자리 편집, 새 선택자만 끝 블록」**. 이 편이 CSS 의 층 쌓기도 줄여 §B.6 의 원래 의도와 맞는다.
  2. 세 AC 를 「파일 전체에서 그 선언이 그 선택자 블록 어딘가에 있다」로 바꾼다(첫/마지막 무관).
  3. `cssRuleBlock` 에 마지막 매치 선택 옵션을 더한다 — 다만 기존 세 호출(`:430`·`:431`·`:479`)의 의미를 바꾸지 않도록 기본값은 첫 매치로 두어야 한다.

### N4 — [major / blocking] 새로 들어온 실브라우저 겹 셋이 `strict: true` 에서 **타입 검사를 통과하지 못한다**

- 근거: 세 겹의 코드를 그대로 떼어 `server/tsconfig.json` 과 같은 설정(`strict: true`, `target: ES2022`, DOM lib)으로 `tsc --noEmit` 에 넣어 **실제로 돌렸다**. 출력 그대로:

```
probe.ts(6,17): error TS7006: Parameter 'name' implicitly has an 'any' type.
probe.ts(10,5): error TS7006: Parameter 'els' implicitly has an 'any' type.
probe.ts(10,20): error TS7006: Parameter 'e' implicitly has an 'any' type.
probe.ts(18,5): error TS18047: 'm' is possibly 'null'.
probe.ts(22,16): error TS2531: Object is possibly 'null'.
```

- 원 자리: `acceptance.md:216` `const mk = (name) => fetch(…)`, `:228-229` `els => els.map(e => e.getBoundingClientRect().height)`, `:369` `const m = document.querySelector('#messages .message')` 뒤 `:373` `m.appendChild(probe)`, `:529` `document.getElementById('composer-box').getBoundingClientRect()`.
- 기존 `web-visual.test.ts` 가 이 문제를 겪지 않는 이유는 `browser`·`page` 가 `any` 이면서 **콜백을 넘기지 않기** 때문이다(`:79-96` 은 전부 `await page.locator(...)` 형태). 새 겹은 `page.evaluate(cb)`·`page.$$eval(sel, cb)` 로 **매개변수 있는 콜백**을 넘기고 DOM 널 역참조를 한다 — `page` 가 `any` 라 문맥 타입이 없으므로 매개변수는 암묵적 `any` 가 된다.
- 왜 중요한가: 이 SPEC 은 이번 라운드에 `npm run typecheck` 를 **판정 명령 맨 앞**으로 올렸다(`spec.md:552`, `plan.md:189`). 그 명령이 맨 먼저 붉어진다. `pretest` 때문에 `npm test` 도 함께 죽는다(N2 와 같은 경로).
- 고치는 법: 콜백 매개변수에 명시 타입을 붙이고(`(name: string) =>`, `(els: Element[]) =>`, `(e: Element) =>`) 널 역참조에 `!` 를 쓴다. 다섯 자리, 한 줄씩이다. `bootVisual()` 의 반환 타입을 `page: any` 대신 최소 구조 타입으로 좁히면 근본적으로 막힌다.
- 이것을 닫는 명령: `cd server && npm run typecheck` (AC 코드 삽입 직후).

### N5 — [minor / optional] `rule('#msg-input')).toMatch(/flex:\s*1/)` 는 **오늘 이미 참**이다

- `acceptance.md:497` 의 단언 대상은 `style.css:411-415` 의 기존 규칙이고 `:412` 가 이미 `flex: 1;` 이다. 첫 매치 규칙(N3) 때문에 새 블록도 보지 않는다.
- 즉 이 단언은 구현 전에도 초록이라 tdd 의 RED 를 만들지 못하고, 「입력칸이 폭을 다 쓴다」를 관측하지도 않는다. 무해하지만 판별력 0 이다.
- 고치는 법: 지우거나, `background: none`·`border: none` 처럼 **이 SPEC 이 실제로 더하는** 선언으로 바꾼다.

### N6 — [minor / optional] 헬퍼 행 번호 인용 다섯 건이 1~2 줄 어긋난다

| 인용 (`acceptance.md:23-30`) | 실측 | 차이 |
|---|---|---|
| `loadApp`(:47) | **46** | −1 |
| `REQUIRED_IDS`(:118) | **116** | −2 |
| `loadPlaywrightCandidates`(:23) | **21** | −2 |
| `login`(:35) | **36** | +1 |
| `userCount`(:37) | **38** | +1 |

- 이름은 전부 정확하고 존재 여부 판정도 옳으므로 실질 피해는 없다. 다만 이 저장소의 `completed-spec-semantics.md` 가 **「Line-anchor tables are PROHIBITED … Locate citations by grep anchor, not by line arithmetic」** 을 못 박고 있고, 이 SPEC 자신도 `plan.md:129` 에서 「행 번호가 아니라 내용으로 찾는다」고 쓴다. 표가 자기 규칙을 어긴다.
- 고치는 법: 표에서 `(:NN)` 을 빼고 이름만 남기거나, `grep -n 'function loadApp' …` 형태로 바꾼다. `cssRuleBlock` 호출 세 자리(:430·:431·:479)는 **정확했다** — 이건 그대로 두어도 된다.

### N7 — [minor / optional] 파일 수·마일스톤 수가 문서마다 어긋난다

- `plan.md:13` 표: **9** (공유 헬퍼 포함) ✓ / `progress.md`: **9** ✓ / **`plan.md:114` §B.8: 「8개, Tier M 구간(5~15) 안」** ✗ — 교정 전 값이 남았다.
- `plan.md:17` 산문: 「마일스톤은 넷에서 다섯으로 늘었다」 — 실제로는 **여섯**(M0~M5, `plan.md:209-283`). `progress.md` 는 6 으로 적어 맞다.
- 판정에는 영향이 없다(9 도 6 도 Tier M 구간 안). 다만 §B.8 은 Tier 재판정의 **근거 문단**이라 그 안의 수가 틀린 것은 근거의 신뢰도를 깎는다.

### N8 — [minor / optional] 기대값 0 인 `grep -c` 들이 **종료 코드 1** 을 낸다 (1회차 미해소)

- `acceptance.md:790-793` 옛 계약문 넷 + `:742` SVG 색 + `:750` 더한 줄 색 — 전부 「기대: 0」인데 `grep -c` 는 매치 0 에서 exit 1 이다.
- 관측 블록을 스크립트로 묶어 돌리면(`set -e`, 또는 `&&` 연결) 성공이 실패로 읽힌다. 사람이 한 줄씩 눈으로 읽으면 무해하다.
- 고치는 법: `grep -c … || true` 를 붙이거나, `if grep -q … ; then echo FAIL; fi` 형태로 바꾼다.

### N9 — [minor / optional] AC-015 (6) 의 `-t` 필터가 **아무것도 못 잡아도 종료 코드 0** 일 수 있다

- `acceptance.md:769` — `npx vitest run test/web-shell.test.ts -t 'id hygiene'; echo "exit=$?"`.
- F6 의 부호 뒤집힘은 확실히 고쳐졌다(이름 grep → 종료 코드). 다만 누군가 describe 명을 바꾸면 `-t` 가 0개를 잡고, vitest 설정에 따라 그래도 exit 0 이 될 수 있다 — 그러면 관측이 조용히 공백이 된다.
- **미검증**: 이 저장소의 vitest 4.1.11 이 「필터가 0개를 잡았을 때」 어떤 종료 코드를 내는지 실행으로 확인하지 않았다. 닫는 명령: `cd server && npx vitest run test/web-shell.test.ts -t 'zzz-존재하지-않는-이름'; echo "exit=$?"`.
- 고치는 법: 이름과 함께 실행 개수도 본다 — `npx vitest run test/web-shell.test.ts -t 'id hygiene' --reporter=json` 에서 `numPassedTests >= 1` 을 확인하거나, 파일 전체를 돌려 종료 코드를 본다.

---

## 3. 교정이 깨뜨렸는가 — 1회차 «깨끗함» 목록 대조

| 1회차에 깨끗했던 것 | 2회차 상태 | 근거 |
|---|---|---|
| `cssRuleBlock` 기존 호출 세 자리 | **깨지지 않는다** | 실측 `:430 cssRuleBlock(css, '#auth-view')`, `:431 (css, '#auth-error')`, `:479 (css, '[hidden]')` — `acceptance.md:64` 이 지목한 셋과 **정확히 일치**한다(이 세 인용은 1줄도 안 어긋났다). `css-rule.ts` 로 옮겨도 시그니처가 같고 세 선택자 전부 `style.css` 에 **한 번씩만** 나오므로 첫/마지막 구분이 무의미하다. **주의 하나**: `cssRuleBlock` 본문이 `expect(at, …).toBeGreaterThanOrEqual(0)` 로 vitest `expect` 를 쓰므로(`web-shell.test.ts:404`), 새 모듈은 `import { expect } from 'vitest'` 를 반드시 함께 옮겨야 한다 — `acceptance.md:64`·`plan.md:214` 어디에도 그 말이 없다. M0 이 놓치면 `TS2304: Cannot find name 'expect'` 다 |
| `server/test/` 에 비-테스트 `.ts` 를 두는 것 | **안전** | 선례 셋 실재 — `no-listen.ts`, `probe-db.ts`, `wsupgrade-judgment.ts`. vitest 기본 include(`**/*.{test,spec}.*`)에 걸리지 않아 `css-rule.ts` 가 테스트로 수집되지 않는다 |
| `bootVisual()` 추출이 기존 `it` 을 건드리는가 | **건드리지 않도록 명시됨** | `plan.md:216` — 「기존 `it` 도 그것을 쓰게 바꾸되 **단언 넷(`authBox` null, `mainBox` 존재·폭·높이)은 한 글자도 건드리지 않는다.**」 Definition of Done(`acceptance.md:814`)에도 같은 항목이 있다. 실측: 그 넷은 `web-visual.test.ts:92-96` 이고 기동 절차(:52-86)와 정리 절차(:98-102)에서 분리 가능하다 |
| 형제 SPEC 시험 의존 | **변화 없음** | M0 이 만지는 것은 `web-shell.test.ts`(헬퍼 이동)·`web-visual.test.ts`(기동 추출) 둘뿐이고, 둘 다 형제 SPEC 이 import 하지 않는다. `web-chat`·`web-markdown`·`web-rich`·`web-permission-contract` 는 각자 헬퍼를 갖는다(실측 확인) |
| 새 단언이 기존 단언과 모순되는가 | **모순 없음** | AC-006 의 `expect($$('#messages .message > .msg-head > strong').length).toBe(3)` 는 `web-chat.test.ts:386` 과 같은 방향이고, `.message > :not(.msg-avatar) { grid-column: 2 }` 는 `.msg-head`·`.msg-body` 의 명시 배치와 **같은 값**이라 충돌하지 않는다. 특이성도 안전하다 — `.msg-avatar` 는 `:not()` 이 배제한다 |
| `requireAuth` 불변 | **유지** | REQ-013 [HARD](`spec.md:337`)·§6(`:520`)·`plan.md:165` 세 자리 그대로. AC-013 이 `preHandler` 로 소비만 한다 |
| `login()` 방어 (AC-014 둘째 `it`) | **유지 — 여전히 판별력 있음** | `app.js:149-175` 의 `login()` 이 두 catch 모두 되던지므로 스텁이 던지면 `await app.login('alice')` 가 거부된다 |
| 범위 누출 | **없음** | §6 제외 다섯을 다시 대조했다 — 동적 placeholder·보내기 화살표·보관 접기·노란 막대·아바타 이미지를 요구하는 요구사항·기준 0건 |
| 필수 통과 일곱 | **7/7 유지** | 위 판정 절 참조 |

**결론: 교정이 1회차의 깨끗한 항목을 깨뜨리지는 않았다.** 새 결함 넷은 전부 **새로 추가된 문장 안**에서 났다.

---

## 4. 새 관측의 판별력 평가 (요청 3)

| 관측 | 판별력 | 근거 |
|------|--------|------|
| F7 주석 앵커 (`^// .*§5.1 — 꼬리는 줄이지 않는다`) | **있음** (넷째만 N1) | 앵커가 한국어 산문 조각이라 `renderRooms()` 의 어떤 코드도 우연히 만들 수 없다. 옛 관측(`grep -c 'room-hash'`)은 `span.className = 'room-hash'` 한 줄로 통과했다 — 그 구멍이 닫혔다 |
| F8 `hasRoute` (bare 앱) | **있음** | 대역이 존재할 수 없는 앱을 따로 세운다. 라우트가 `build()` 에만 있으면 false. 산문이 명령이 됐다 |
| F12 전이 관측 (`aria-disabled` 뒤집기) | **있음** | 정적 문자열 구현이 정확히 이 단언에서 붉어진다. `initChat()` → `onComposerInput` 결합을 실제 코드로 확인했다 |
| F5 뒤 겹 (탐침 노드 렌더 폭 > 200) | **있음** | `grid-column: 2` 가 없으면 탐침이 1열(40px)로 자동 배치돼 40 언저리가 나온다. 기본 뷰포트 1280 에서 본문 열은 ≈980px 이라 임계 200 은 여유 있다. **CSS 정적 단언이 못 보는 것(적힌 규칙이 실제로 듣는가)을 정확히 겨눈다** |
| F11 뒤 겹 (`boxW > footerW - 40`) | **있음** | grow 선언이 없으면 컨테이너가 내용 폭(≈300px)에 머물러 1040px 열에서 떨어진다. `#composer` 좌우 패딩 16px×2 = 32 < 40 이라 올바른 구현에는 여유가 있다 |
| F4 뒤 겹 (실 API 로 방 생성 + `scrollWidth <= clientWidth`) | **있음** | 전역 없이 실제 세션 쿠키로 `POST /api/rooms` 를 친다. 꼬리에 생략기호를 걸면 `scrollWidth > clientWidth` 가 되어 떨어진다 |
| F6 종료 코드 | **있음** (N9 잔여) | 이름 grep 의 부호 뒤집힘은 확실히 해소 |
| F14 (3-b) 더한 줄 기준 | **있음** | `git diff | grep '^+'` 는 총량이 아니라 **이 SPEC 이 더한 것**을 본다. (3) 의 「이하」와 방향이 달라 둘이 서로를 보완한다 |
| N5 `#msg-input` `flex: 1` | **없음** | 오늘 이미 참 |

---

## 5. M0 은 충분한가 (요청 4)

M0 은 설계상 어떤 기준도 통과시키지 않고 뒤의 기준을 **실행 가능**하게만 만든다. 그 목적에 대해:

| F | M0 이 제공하는가 | 판정 |
|---|---|---|
| F1 (`loadDom` 부재) | 3번 「그 파일에 없는 헬퍼를 지역 정의」 + AC-010 본문이 `loadApp()` 방식으로 재작성됨 | **충분** |
| F2 (`flush` 부재) | 3번이 `web-shell.test.ts` 용 `const flush = …` 를 명시 | **충분** |
| F3 (`cssRuleBlock` 공유) | 1번이 `css-rule.ts` 추출 + 세 호출 import 전환 | **불충분 — `expect` import 누락**(§3 표 첫 행). 한 줄이면 닫힌다 |
| F4 (`bootVisual()`) | 2번이 추출 + 기존 `it` 단언 불변 명시 | **충분** |

M0 이 **놓친 것 하나 더**: N4 의 타입 오류 다섯은 M0 이 아니라 M1·M2·M4 에서 AC 코드를 넣을 때 난다. M0 4번(`typecheck`·`npm test` 둘 다 초록 확인)은 M0 시점의 트리만 보므로 이것을 잡지 못한다. `plan.md:189` 의 [HARD]「AC 코드를 넣은 **직후** 한 번 돌린다」가 그 자리를 메우지만, **AC 본문 자체가 타입 오류를 담고 있으면** 구현자는 자기 실수로 오해한다. AC 코드에 타입 주석을 미리 넣어 두는 편이 옳다.

---

## 6. Tier 판정 (요청 5)

**Tier M 유지에 동의한다.** 근거 셋을 직접 재확인했다.

- 파일 수 **9** — `plan.md:13` 의 열거(소스 4 + 시험 4 + `css-rule.ts`)가 M0~M5 가 실제로 여는 파일과 일치한다. Tier M 구간 5~15 안이고, Tier L 문턱(15 초과)에 한참 못 미친다.
- LOC 600~700 추정 — 구간 300~1000 안. 검증은 못 하지만(구현 전) CSS ~150·`app.js` ~100·HTML ~40·`auth.ts` ~4·시험 ~400 의 내역이 마일스톤 작업량과 어긋나지 않는다.
- 구조적 성격 — 스키마·마이그레이션·아키텍처 변경 0. 새 라우트는 기존 `preHandler` 를 읽기만 한다.

**16/16 이 무언가를 덜 관측하게 만드는가 — 지금은 아니다.** 1회차에 지적한 두 하위 주장(REQ-009 의 폭, REQ-011 의 초기 상태)에 각각 관측이 붙었고, 요구사항을 합치지 않은 채 단언만 늘렸다. `plan.md:118` 이 적은 Tier L 전환 조건(「요구사항을 하나라도 더 쪼개야 한다면 그때는 L」)도 정확하다 — REQ-001·009 를 되돌리면 18 이 되어 상한을 넘는다.

**다만 여유가 0 이라는 사실은 실제 위험이다.** 이번 라운드가 그것을 증명했다: 새 관측을 넣을 곳이 「기존 기준 안의 추가 단언」밖에 없었고, 그 결과 AC-010 은 한 `it` 안에 열 개 넘는 단언이 쌓여 **N2(변수 재선언)를 낳았다.** 예산이 있었다면 폭 관측은 독립된 AC 가 됐을 것이다. 다음에 무엇이든 더할 때 이 압력이 다시 작동한다는 점을 `plan.md` §B.8 이 이미 인정하고 있다 — 그 인정은 정직하고 충분하다.

---

## 7. 검증하지 못한 것

1. **시험을 돌리지 않았다** (읽기 전용 제약). N1·N2·N3 은 정적 대조로 확정했고 N4 는 **떼어낸 코드를 실제 `tsc` 에 넣어** 확정했다. 전부 닫는 명령: `cd server && npm run typecheck` (AC 코드 삽입 후) → N2·N4 가 즉시 드러난다. N1·N3 은 구현 완료 후 J1·J4 실행이 필요하다.
2. **N3 의 「구현자가 끝 블록에 쓸 것이다」는 추론이다.** 근거는 `plan.md:90` §B.6 과 M2 5번(`:245`)의 「제자리에서 지우고, 새 규칙을 끝 블록에 넣는다」 문형이다. 제자리 편집을 택하면 N3 은 발생하지 않는다 — 그래서 고침의 첫 선택지가 §B.6 을 정밀화하는 것이다. 닫는 명령: 구현 후 `grep -n '^\.room-item {' web/style.css` 로 정의가 몇 개인지 센다.
3. **N9 의 vitest `-t` 종료 코드 동작을 확인하지 않았다.** 닫는 명령은 N9 항에 적었다.
4. **`bootVisual()` 이 실제로 뽑히는지**는 M0 산출물이라 지금 판정할 수 없다. `web-visual.test.ts` 에 그런 헬퍼가 없다는 사실(:21-48 이 전부이고 기동 절차는 `it` 안에 인라인)은 실측했다.
5. **Playwright 가 이 환경에 있는지 확인하지 않았다.** AC-003·006·010 의 뒤 겹이 실제로 도는지는 J3 을 돌려야 안다. `plan.md:191` 이 이미 [HARD] 로 「한 번 이상 실제로 돌리고, 못 돌렸으면 Gap 으로 적는다」를 요구하므로 이 공백은 SPEC 이 스스로 관리한다.
6. **아트보드 캔버스는 여전히 접근 불가** (세션 스크래치패드). 「SPEC 이 아트보드를 정확히 옮겼는가」는 1회차와 같이 판정 불가다.
7. **LOC 추정 600~700 을 검증하지 않았다** — 구현 전이라 원리적으로 불가하다.

---

## 8. 권고

조건부 통과의 «조건»은 아래 넷이다. 전부 국소 수정이고, 넷 다 닫히면 Testability 는 1.0 구간으로 올라간다(조화평균 1.00).

1. **N2** — `acceptance.md:500` 의 `const box` 를 `const boxRule` 로 바꾸고 `:500-501` 두 단언을 그 이름으로 고친다. (1줄)
2. **N1** — `acceptance.md:800` 의 `^//` 를 `^\s*//` 로 바꾼다. 나머지 앵커 셋도 같이 통일하기를 권한다. (1줄)
3. **N3** — `plan.md` §B.6 에 「**기존 선택자에 선언을 더하는 것은 제자리 편집**, 새 선택자만 끝 블록」 한 문장을 더한다. (1문장; AC 를 고치는 것보다 싸고 CSS 층 쌓기도 줄인다)
4. **N4** — 실브라우저 겹 셋의 콜백 매개변수 다섯 자리에 타입 주석을 붙인다. `bootVisual()` 반환 타입에서 `page: any` 를 좁히면 근본적으로 막힌다. (5줄)

추가로 권하되 조건은 아니다:

5. **M0 1번에 `import { expect } from 'vitest'` 를 명시**한다 — `cssRuleBlock` 본문이 `expect` 를 쓴다(`web-shell.test.ts:404`).
6. **F15 잔여** — REQ-004 에 「두 생성 버튼은 공동 규칙 하나로 쓴다」를 규범으로 넣거나, `acceptance.md:302` 의 정규식을 두 규칙·역순도 받아들이게 완화한다.
7. **N5** — 판별력 0 인 `#msg-input` `flex: 1` 단언을 지우거나 이 SPEC 이 실제로 더하는 선언으로 교체한다.
8. **N6·N7** — 헬퍼 표의 `(:NN)` 을 빼고, `plan.md:114` 의 「8개」를 9 로, `:17` 의 「넷에서 다섯으로」를 여섯으로 고친다.

3회차 재감사는 위 1~4 의 델타에 한정해도 충분하다. 1회차 F1~F17 의 재검증은 이 보고서로 종료한다 — 열셋은 확정적으로 닫혔고, 둘(F7·F15)은 부분이며 그 잔여가 각각 N1 과 권고 6 으로 이월됐고, 하나(F16)는 선언대로 판단으로 처리됐다.
