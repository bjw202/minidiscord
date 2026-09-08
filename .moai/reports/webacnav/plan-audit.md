# SPEC-WEBACNAV-001 계획 단계 감사 보고서

- 회차: 1/3
- 감사 대상: `.moai/specs/SPEC-WEBACNAV-001/` (spec.md · plan.md · acceptance.md · progress.md), Tier S
- 기준 트리: `main` HEAD `5087a49` (`git rev-parse --short HEAD` 로 확인)
- 감사 일자: 2026-09-08
- 저자의 추론 맥락은 M1 격리 원칙에 따라 무시했다. 읽은 것은 네 산출물, 승인된 계획서 `.moai/plans/floating-stargazing-hamming.md`, 그리고 실제 코드뿐이다.

## 판정

**CONDITIONAL PASS** — 종합 점수 **0.91**, 통과선 **0.75**(Tier S).

- 필수 통과 7개 전부 통과(아래 표). 루브릭 점수도 통과선 위다.
- 그러나 **plan.md 안에 서로 어긋나는 문장 둘**(D1·D2)이 있어, 그대로 두면 run 단계 M1 의 완료 기준이 원리적으로 달성 불가능하고 AC-008(4) 의 검사 범위가 정의되지 않는다. 둘 다 plan.md 한두 줄 수정으로 닫힌다. 이 둘이 닫히면 PASS 로 확정한다.

### 점수 산식

통과선은 프롬프트가 아니라 SSOT 에서 읽었다: `.claude/rules/moai/workflow/spec-workflow.md` L140 「S (Simple) … plan-auditor PASS threshold 0.75」. `harness.yaml` 에는 숫자 통과선이 없고, `evaluator-profiles/default.md` L81 의 D7/D8 표는 `audit-rubric-scope.md` §1 이 「읽는 주체가 없는 죽은 표」로 규정한 것이라 쓰지 않았다.

집계식은 `agent-common-protocol.md` § Skeptical Evaluation Stance 의 **비가중 조화평균**(`audit-rubric-scope.md` §3):

```
H = 4 / (1/0.85 + 1/1.00 + 1/0.90 + 1/0.90)
  = 4 / (1.1765 + 1.0000 + 1.1111 + 1.1111)
  = 4 / 4.3987 = 0.909 → 0.91
```

## 필수 통과 (Must-Pass)

| 항목 | 결과 | 근거 |
|---|---|---|
| MP-1 REQ 번호 연속·중복 없음 | PASS | `grep -c '^\*\*REQ-WEBACNAV-' spec.md` → 8; 번호 001~008 각 1회(HISTORY 의 REQ-004 언급은 본문 재인용). spec.md:84·89·110·113·119·124·129·134 |
| MP-2 GEARS 형식 (요구 계층) | PASS | 여덟 REQ 전부 shall(「~여야 한다」) 또는 shall not(「~해서는 안 된다」) 꼴. While/When 수식은 제목 괄호에 명시 — spec.md:110 「While 드롭다운이 열려 있음 · When ArrowDown…」, :124 「While 닫혀 있음 — shall not」, :129 「While IME 조합 중 — shall not」. AC 계층(Given-When-Then)은 여기서 채점하지 않았다 |
| MP-3 YAML 프런트매터 | PASS | 12 필수 필드 전부 존재·타입 일치(spec.md:2~13). `version: "0.1.0"` 인용 semver, `phase: "v2.1.0 target"`(생애주기 토큰 아님), `tags` 쉼표 문자열. 도구 재확인: `moai spec lint .moai/specs/SPEC-WEBACNAV-001/spec.md` → 「No findings」 |
| MP-4 언어 중립성 | N/A | 단일 언어 프로젝트(바닐라 JS + TS 테스트). 다언어 도구 열거 없음 |
| MP-5 D7 교차 SPEC | PASS | 참조 SPEC 셋(`SPEC-WEBCHAT-001`·`SPEC-MENTION-001`·`SPEC-WEBRICH-001`) 전부 존재, `status: completed`(각 spec.md `^status:` 직접 읽음). retired/superseded/archived 없음 → BLOCKING 없음 |
| MP-6 D8 syscall | PASS | `grep -c syscall` 네 파일 전부 0 → 자동 통과 |
| MP-7 [NEEDS CLARIFICATION] | PASS | `grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-WEBACNAV-001/` → 0건(rc=1). research.md 는 Tier S 라 없음 |

## 루브릭 점수

| 차원 | 점수 | 근거 |
|---|---|---|
| Clarity | 0.85 | 요구 여덟이 한 뜻으로 읽힌다. 한 곳만 해석이 갈린다 — spec.md:113 REQ-004 「`Shift` 없는 `Enter` 또는 `Tab`」에서 «Shift 없는»이 Tab 에도 걸리는지 불분명한데, plan.md:43 의 분기는 `shiftKey` 를 보지 않아 Shift+Tab 도 가로챈다(O-2) |
| Completeness | 1.00 | HISTORY(:21), 배경·목적(:29), 용어(:52), 요구(:80), 범위 밖 H3 셋 + `-` 항목(:153·159·165), 제약(:172), 수용 기준(:183), 참조(:198). 프런트매터 완전 |
| Testability | 0.90 | AC-001~007 은 전부 이분 판정이며 **실제로 HEAD 에서 RED 임을 실행으로 확인**(아래 §2). AC-008 은 명령 다섯으로 기계 판정. 감점 하나: acceptance.md:290 DoD 「새 8개 실패」는 새 `it` 이 7개라 관측 불가능한 조건(D1) |
| Traceability | 0.90 | REQ→AC: 001→AC-001·007, 002→AC-001·006, 003→AC-003·006, 004→AC-002, 005→AC-004, 006→AC-005, 007→AC-005, 008→AC-008 — 빠진 REQ 없음, 없는 REQ 를 가리키는 AC 없음. 감점 하나: spec.md:114 가 이 SPEC 이 새로 정한 가장자리(「선택 가능 항목 0 이면 Tab 은 닫기만」, HISTORY :25 에서 스스로 강조)에 기준이 없다(O-3) |

## 결함 목록

### 차단(MUST-FIX) — 판정을 확정하기 전에 고칠 것

**D1. plan.md:85·89·91·130, acceptance.md:290 — 「새 테스트 여덟」은 존재하지 않는다.** acceptance.md 의 `it(` 블록은 **7개**(`grep -c "^it('" acceptance.md` → 7, AC-001~007). AC-008 은 새 `it` 이 아니라 파일 전체 실행 + bash 넷이다(acceptance.md:264~280). 그런데 plan.md M1 완료 기준은 「새 8개 실패, 기존 전부 통과」이고 DoD 첫 항목도 같다. 실측(§2): HEAD 에서 실패하는 새 테스트는 정확히 7개. 이 기준은 그대로는 달성이 불가능하고, 구현자가 여덟째 테스트를 지어내거나 기준을 무시하게 만든다. — 심각도 major · 분류 blocking · 수정: plan.md:85·89·91·130 과 acceptance.md:290 의 「여덟/8개」를 「일곱/7개」로 고친다(AC-008 이 bash 검사임을 M1 문장에 한 줄 덧붙이면 더 분명하다).

**D2. plan.md:79, :119 — AC-008(4) 가 요구하는 닫는 표식이 계획에 없다.** acceptance.md:275~276·284 는 CSS 블록이 `/* SPEC-WEBACNAV-001 */` 로 **시작해 `/* /SPEC-WEBACNAV-001 */` 로 끝나야** 하며 `sed` 가 그 둘 사이를 잘라 낸다고 정한다. plan.md §B.4(:79) 와 M5(:119) 는 여는 주석만 지시한다(`grep -n '/SPEC-WEBACNAV-001' plan.md` → 0건). 여는 표식만 있으면 `sed` 의 범위가 파일 끝까지 이어져 (4) 의 «비어 있지 않음» 계수는 뒤따르는 WEBRICH 블록 전부를 세고, 16진수 검사도 남의 블록을 잰다 — 검사가 자기 대상을 잃는다. — 심각도 minor · 분류 blocking(문서 간 정합성) · 수정: plan.md:79 와 :119 에 「블록 끝에 `/* /SPEC-WEBACNAV-001 */`」 한 줄을 더한다.

### 관측(optional) — 판정을 바꾸지 않음

**O-1. spec.md:135, plan.md:20 — 행 번호 하나가 두 줄 어긋난다.** 「371~373행의 기존 규약(색은 `var(--md-*)` 만)」이라 적었으나 실제 그 주석은 `web/style.css` **373~375행**이다(`grep -n 'var(--md-\*)' web/style.css` → 374; 블록 머리 `/* SPEC-WEBRICH-001 */` 은 373). 승인 계획서(.moai/plans/…:71 「371행」)의 값이 그대로 딸려 왔다. plan.md:25 「계획서와 코드가 어긋난 자리는 없었다」는 이 한 자리에서 과대주장이다(계획서의 493~575·331~356 도 각각 494~574·341~356 이 맞고, SPEC 은 그 둘은 고쳤다). 나머지 인용은 전부 일치했다 — 아래 §1 표.

**O-2. spec.md:113 ↔ plan.md:43 — Shift+Tab.** REQ-004 의 「Shift 없는」이 Tab 까지 수식하는지 문장만으로는 갈리고, 계획의 분기는 Shift 여부와 무관하게 Tab 을 가로챈다. 열린 드롭다운에서 Shift+Tab 은 드물어 해롭지 않으나, 어느 쪽인지 한 절로 못 박으면 뜻이 하나가 된다.

**O-3. spec.md:114 — 이 SPEC 이 새로 정한 가장자리에 기준이 없다.** 「선택 가능한 항목이 하나도 없으면 드롭다운만 닫는다」(plan.md:57 「계획서 밖에서 이 SPEC 이 정한 것 1」)는 AC 어디에서도 관측하지 않는다. Tier S 상한(8/8)이 꽉 차 있으니 새 AC 대신 AC-002 끝에 단언 서너 줄(멘션 불가 봇만 있는 방에서 `@` → Tab → `hidden` 참, `defaultPrevented` 참)로 접어 넣을 수 있다. 드문 경로라 optional 로 둔다.

**O-4. spec.md:87·127 — 요구 본문에 구현 방식이 섞여 있다.** REQ-001 둘째 문단(「모듈 수준 정수 하나」)과 REQ-006 둘째 문단(「557행 앞에 들어가되」)은 WHAT 이 아니라 HOW 다. plan.md §B 가 이미 같은 결정을 들고 있으므로 REQ 에서는 빼도 뜻이 줄지 않는다. 루브릭에 점수 칸이 없는 검사(RQ-3/RQ-4)라 점수에 넣지 않았다.

**O-5. spec.md:14~16 / progress.md:6 — Tier S 인데 acceptance.md 가 있다.** `spec-workflow.md` L140 은 Tier S 를 「spec.md + plan.md, AC 는 spec.md 안에」로 정한다. 이 SPEC 은 셋째 파일을 두고 spec.md §7 에 요약표만 뒀다. 진행 기록이 그 사실을 적어 두었고 `moai spec lint` 도 잡지 않으니 위반은 아니나, 계획 감사 캐시의 해시 대상에 acceptance.md 가 들어간다는 점만 적어 둔다. 프런트매터의 `related_specs` 는 스키마의 선택 필드 목록에 없는 키인데 lint 가 통과시켰다.

**O-6. AC-005 전반은 지금도 참이다 — 결함이 아니라 성격 기록.** 닫힌 상태의 ↓/↑/Tab/Esc 가 `defaultPrevented === false` 인 것은 현재 코드(app.js:557 조기 `return`)에서도 그렇다. AC-005 가 HEAD 에서 붉은 이유는 후반의 `expect(before?.dataset.kind).toBe('TO')`(acceptance.md:187)이지 전반이 아니다. 즉 전반은 RED 증거가 아니라 «전부 막기» 구현에 대한 회귀 방어다. acceptance.md:13 이 그 역할을 정확히 그렇게 적었으므로 문서와 실측이 맞는다. 후반(IME)은 구현 뒤 판별력이 있다: 가드를 `preventDefault` 뒤에 두면 `composing.defaultPrevented` 가 참이 돼 :189 에서, 가드를 아예 빼면 선택이 옮겨져 :190 에서 떨어진다.

## §1 인용 대조 — 네 문서의 `file:line` 전수

전부 `grep -n` 앵커로 다시 찾았다(줄 산술 아님).

| 문서가 적은 자리 | 실제 (HEAD 5087a49) | 일치 |
|---|---|---|
| app.js 494~574 자동완성 절 | 494 `// ── @ 자동완성 ──` … 574 `}`; 576 이 다음 절 | ✓ |
| app.js 498~499 정규식 둘 | 498 `MENTION_TOKEN_RE`, 499 `MENTIONABLE_RE` | ✓ |
| app.js 510~538 `onComposerInput`, 519~528 disabled 행, 529~535 TO/CC 루프, 537 `box.hidden = false` | 510 함수 머리, 523 `'ac-item disabled'`, 532 `item.textContent = \`${kind} …\``, 537 `box.hidden = false` | ✓ |
| app.js 542~552 `commitMention`, 547 치환 | 542 함수 머리, 547 `before.replace(… \`@${kind}(${name}) \`)` | ✓ |
| app.js 556~574 `onComposerKeyDown`, 557 조기 return, 562~563 [HARD] 주석, 564 IME 가드, 565 preventDefault, 568 `first`, 570 `hideAutocomplete` | 556·557·562·563·564·565·568·570 전부 그 내용 | ✓ |
| app.js 429~431 `hideAutocomplete` | 429 함수 머리, 430 `hidden = true`, 431 `}` | ✓ |
| app.js 346~348 이벤트 배선 | 347 `input`, 348 `keydown` (346 은 `const composer`) | ✓ |
| style.css 324~356 작성기 블록, 341~346 `.ac-item`, 348 `:hover`, 351~356 `.disabled` | 324 `#composer {`, 341, 348, 351, 356 | ✓ |
| style.css 371~373 색 규약 주석 | **373~375** (`/* SPEC-WEBRICH-001 */` 373, `var(--md-*)` 374) | ✗ O-1 |
| index.html 57 `<div id="autocomplete" hidden>` | 57 | ✓ |
| mention.ts 4 `MENTION_RE` | 4 `/@(TO\|CC)\(([^()\s]+)\)/g` | ✓ |
| test 86~108 `loadApp`, 111~125 헬퍼, 123 `pressEnter` | `loadApp` 86~107, `$$` 110·`el` 111, `pressEnter` **122** | ≈ (1행 차, 무해) |
| test 431~535 AC-WEBCHAT-009~012, 537~584 D-6(주석 포함)/543~584 D-6 describe, 717 파일 끝 | 431 주석 머리, 535 `})`, 537 주석, 543 describe, 584 `})`, `wc -l` 717 | ✓ |
| design-tokens 11개 토큰 존재 | `grep -nE -- '--md-(accent\|…):'` → 11행 전부 적중 (12·16·17·21·27·40·41·44·45·53·54) | ✓ |
| 봇 목록 키 `/api/rooms/1/bots` | test 435·466 등 | ✓ |

## §2 AC 실행 검증 — HEAD 에서 실제로 붉은가

acceptance.md 의 헬퍼 셋과 `it` 일곱을 **글자 그대로** `server/test/web-chat.test.ts` 사본 끝에 붙여 실행했다(임시 파일 `server/test/__audit-webacnav.test.ts`, 실행 뒤 삭제 — `git status --short server/test/ web/` 빈 출력으로 확인).

```
$ cd server && npx vitest run test/__audit-webacnav.test.ts --reporter=verbose
 Tests  7 failed | 23 passed (30)
```

| AC | HEAD 결과 | 첫 실패 단언 (실제 출력) |
|---|---|---|
| AC-001 | ✗ | `expected null to be 'listbox'` — role 부재 |
| AC-002 | ✗ | `expected undefined to be 'CC'` — ↓ 뒤 선택 없음 |
| AC-003 | ✗ | `expected [] to deeply equal [ <div class="ac-item"> ]` |
| AC-004 | ✗ | `expected false to be true` — Esc `defaultPrevented` |
| AC-005 | ✗ | `expected undefined to be 'TO'` — 후반 선택 부재(O-6) |
| AC-006 | ✗ | `expected +0 to be 1` — `.selected` 0개 |
| AC-007 | ✗ | `expected [] to deeply equal [ <div class="ac-item"> ]` |
| 기존 23개 (AC-WEBCHAT-001~014 · D-6 ×2 · D-7 ×3 · 모듈 신선도) | ✓ 전부 통과 | — |

공허 통과는 없다. AC-008 의 셸 명령도 HEAD 에 대고 돌렸다: (1) `grep -c "describe('AC-WEBCHAT-0\(09\|10\|11\|12\)\|describe('D-6"` → 5(기대값과 일치), (4) `sed` 범위 → 0행(블록 부재를 «0»으로 정확히 드러냄), 16진수 정규식은 `#5865f2;` 를 1건 잡고 `#autocomplete`·`#msg-input`·`#composer`·`#send-btn`·`#file-chosen`·`#attach-btn` 은 잡지 않는다(거짓 양성 없음). 현재 `style.css` 전체에 16진수 색 리터럴은 0건.

jsdom 전제(plan.md §F)도 실측: `scrollIntoView` → `undefined`(옵셔널 호출 필요, 맞음), `MouseEvent('mouseenter').bubbles` → `false`(항목 직접 리스너 필요, 맞음), `KeyboardEvent` 의 `isComposing: true`·`keyCode: 229` 초기화 → 그대로 실림(AC-005 후반 성립). jsdom 29.1.1 · vitest 4.1.11.

## §3 회귀 안전 — 기존 테스트와 새 마크업

- **AC-WEBCHAT-010 (test 472·481) `textContent.startsWith('TO'|'CC')`**: 새 마크업은 `<span class="ac-kind">TO</span>` + 텍스트 노드 `" pm"` 이라 `textContent === "TO pm"`. 이것은 추론에 그치지 않는다 — **AC-001 자체가 `items.map(n => n.textContent)).toEqual(['TO pm','CC pm'])` 를 단언**(acceptance.md:71)하므로 AC-001 을 통과하는 어떤 구현도 472·481 을 깨뜨릴 수 없다. 배지를 이름 뒤에 두는 구현은 AC-001 에서 먼저 떨어진다.
- **AC-WEBCHAT-009 (452) `t.includes('pm')`, AC-WEBCHAT-011 (500~502) disabled 필터 + `includes`**: 텍스트 포함 검사라 배지 무관. disabled 행은 「한 글자도 바꾸지 않는다」(spec.md:105, plan.md §E).
- **AC-WEBCHAT-012 (515~535)**: 열린 상태 Enter → 새 코드는 «선택된 항목»(초기 = 첫 항목) 확정 → POST 0 유지; 닫힌 뒤 Enter → 전송 1. 새 분기는 Enter 를 다루지 않으므로(plan.md:43 키 목록에 Enter 없음) 기존 경로 그대로다.
- **D-6 (543~584)**: Enter + `isComposing` / `keyCode 229` 는 새 분기의 키 목록 밖이라 app.js:564 가드가 그대로 받는다.
- SPEC 이 이 테스트들의 단언 변경을 금지(spec.md:181, acceptance.md:294 「해당 줄 범위 무변경」).

## §4 IME [HARD] 순서 — 두 경로 모두

- 기존 Enter 경로: plan.md:113 「IME 가드 564행은 그 자리 그대로」, spec.md:130 「그 자리 그대로(`preventDefault` 보다 앞)」. M4 는 568행의 `first` → `pick` 치환만 지시하고 562~565 는 손대지 않는다.
- 새 분기: plan.md:44 `if (e.isComposing || e.keyCode === 229) return   // [HARD] preventDefault 보다 앞` 이 :45 `e.preventDefault()` 앞에 있다. 승인 계획서(:58)도 같은 순서. REQ-007(spec.md:129~130)이 이 순서를 요구로 못 박았고 AC-005 후반이 반대 순서를 잡는다(O-6).
- 결론: 두 경로 모두 보존. 결함 없음.

## §5 Tier S 상한·표식·프런트매터

- REQ 8 / AC 8 — 상한 8/8 정확히 충족(초과 없음).
- `[NEEDS CLARIFICATION]` 0건. `syscall` 0건.
- 프런트매터 12 필수 필드 전부 존재, lint 「No findings」. 선택 필드 `tier: S`·`depends_on` 은 스키마 등재, `related_specs` 는 미등재(O-5).

## §6 세 문서의 정합성 (개수·ID·가장자리)

| 항목 | spec.md | plan.md | acceptance.md | 판정 |
|---|---|---|---|---|
| REQ 수 | 8 (:25, §4) | §G 「001~008」 | AC 매트릭스가 REQ-001~008 참조 | ✓ |
| AC 수 | 8 (§7 표) | §C 마일스톤이 AC-001~008 전부 배정(M2→001, M3→007, M4→002~006, M5→008) | 8 (매트릭스 + 절) | ✓ |
| 새 vitest `it` 수 | — | **8** (:85·89·91·130) | **7** (:55~254) | ✗ D1 |
| CSS 블록 표식 | 없음 | 여는 것만 (:79·119) | 여는 것 + 닫는 것 (:275·284) | ✗ D2 |
| Tab, 선택 가능 0 | 「닫기만」(:114) | 「닫는다」(:57) | 기준 없음 | ✓ 일치 (O-3 는 검증 부재) |
| 열린 상태 방향키, 선택 가능 0 | 언급 없음 | 「preventDefault 뒤 조기 반환, 그대로 둔다」(:58) | — | ✓ (plan 이 spec 밖 가장자리를 스스로 공시) |
| 봇 목록 키 | `/api/rooms/1/bots` (:74) | 같음 (:23) | 같음 (:5·27) | ✓ |
| 손대는 파일 셋 | :163·178 | :125·132 | :282·295 | ✓ |
| IME 가드 순서 | :50·130 | :44·113 | :297 | ✓ |

## 권고

1. plan.md:85·89·91·130 과 acceptance.md:290 의 「여덟/8개」→「일곱/7개」(D1). 한 줄씩 다섯 자리.
2. plan.md:79 와 :119 에 닫는 표식 `/* /SPEC-WEBACNAV-001 */` 지시 추가(D2).
3. (선택) spec.md:135·plan.md:20 의 「371~373」→「373~375」(O-1); REQ-004 의 Shift+Tab 한 절(O-2); AC-002 에 «선택 가능 0 + Tab» 단언 접어 넣기(O-3).

1·2 가 닫히면 이 보고서의 판정은 PASS 0.91 로 확정된다. 재감사 범위는 D1·D2 두 자리의 델타로 한정한다.
