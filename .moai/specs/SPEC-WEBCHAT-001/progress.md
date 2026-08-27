# SPEC-WEBCHAT-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-WEBCHAT-001` |
| 칸반 카드 | `t5` (마일스톤 M5) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 16 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-C·8장 |
| 시각 기준 | `.moai/project/design-dna-discord.md` + `web/design-tokens.css` |
| 워크트리 | `.claude/worktrees/t5` (브랜치 `WT-web-ui`) |
| 선행 SPEC | `SPEC-WEBSHELL-001`(미구현) · `SPEC-SSE-001` · `SPEC-MSG-001` · `SPEC-MENTION-001` · `SPEC-BOT-001` · `SPEC-GATEWAY-001` (뒤 다섯은 구현 완료) |
| 실행 순서 | 카드 `t5` 의 두 번째 SPEC — Task 15 → **Task 16(이 SPEC)** → Task 17 |
| 현재 상태 | `draft` — plan 단계 산출물 작성 완료, **감사 교정 라운드 1회 반영(v0.2.0)** |
| spec_base_sha | _(run 단계 첫 동작으로 기록)_ |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
plan_corrected_at: 2026-08-27
plan_audit_report: .moai/reports/t5/plan-audit.md
plan_audit_verdict: FAIL (교정 라운드 1 반영)
spec_id: SPEC-WEBCHAT-001
tier: M
card: t5
depends_on: [SPEC-WEBSHELL-001, SPEC-SSE-001, SPEC-MSG-001, SPEC-MENTION-001, SPEC-BOT-001, SPEC-GATEWAY-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 16)
spec_version: "0.2.0"
req_count: 16
ac_count: 16
ac_manual_count: 1
tier_budget: "16 REQ / 16 AC"
spec_base_sha: null
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-WEBCHAT-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 기준점 위에 AC-WEBCHAT-015 의 검사 세 개가 올라간다 — `server/src`·`channel` 불변, `web` 변경 파일 세 개, 그리고 그 판정의 전제인 SHA 유효성 확인.

### 감사 교정 라운드 (2026-08-27, v0.2.0)

근거: `.moai/reports/t5/plan-audit.md` — plan-auditor 독립 감사, HEAD `6e9a167`. 이 SPEC **FAIL**, 카드 `t5` 통합 표면 **FAIL**.

| 항목 | 무엇이 틀렸나 | 무엇을 고쳤나 |
|------|--------------|--------------|
| **MF-1** (BLOCKING) | `acceptance.md` 공통 골격이 `app.js` 를 클래식 스크립트로 전제하고 `window.eval` 로 감쌌다. 형제가 ES 모듈로 확정했으므로 `export` 토큰에서 `SyntaxError` — **자동 기준 15개 전부가 첫 단언 전에 실행 불가** | 골격을 `await import('../../web/app.js?t=<n>')` 로 다시 썼다. 캐시 무효화 쿼리 + `vi.resetModules()` 로 테스트마다 새 인스턴스. `spec.md` §6 제약과 `plan.md` §C·§H 의 반대 항목을 삭제·역전. **이 결정의 출처는 오케스트레이터의 plan-audit 교정 게이트 결정이며 이 SPEC 의 단독 판단이 아니다** |
| **MF-3** | `spec.md` 범위 밖 절이 `enterMain()` 을 적었다 — 어디에도 없는 이름 | 삭제하고 실재하는 `showMain()` 을 적었다. 새로 정의하지 않는다 |
| **MF-4** (BLOCKING) | `state.sse`·`workingBots`·`staleTimers`·`staleBots` 가 형제에 이미 있다고 적고 "직접 읽어 확인"이라고 근거를 달았다. **읽은 것은 형제 SPEC 이 아니라 원본 `plan-v2.md` 였다.** 형제는 세 필드만 초기화한다 | 형제 §4.8 계약 2를 따라 **이 SPEC 이 일곱 필드를 `initChat()` 에서 스스로 선언·초기화**한다(REQ-WEBCHAT-016). §D 7번의 방어 제거 지시는 유지하되 **근거를 갈아 끼웠다** — "형제가 이미 만든다"가 아니라 "`initChat()` 이 `openRoom` 0단계이고 그 앞에 사용 경로가 없다" |
| **MF-5** (BLOCKING) | `SPEC-WEBRICH-001` 이 `renderMessage` 안에 `rich.decorate(el, m)` 한 줄을 넣겠다고 **일방적으로** 적었고, 생산자인 이 SPEC 은 그 훅을 선언한 적이 없다 | 생산자가 선언한다 — REQ-WEBCHAT-003 이 호출 자리·인자·무등록 동작·예외 처리를 표로, REQ-WEBCHAT-016 이 `registerMessageDecorator(factory)` 와 방별 컨텍스트 생성을 규정. `refreshRoomBots()` 도 export 계약에 넣었다(같은 부류였다). AC-WEBCHAT-002 가 세 테스트로 관측 |
| **MF-6** | M1 이 `<main id="chat">` **안을 통째로 교체**하는데 형제가 `#placeholder` 존재를 영구 기준으로 못 박고 있었다 | 형제가 소유권을 갈랐다(요소=형제, 내용물=이 SPEC, `#placeholder` 제거·`hidden` 허용). REQ-WEBCHAT-001 과 §F M1 단계 3 을 그 경계에 맞췄다 |
| **MF-7** (형제 몫이나 이 SPEC 에도 지시가 있었음) | §F M4 단계 2 가 `index.html` 에서 토큰 링크를 찾고 없으면 블로커로 보고하라고 적었다. **옳은 구현에서는 그 문자열이 `index.html` 에 없다** — 잘못된 블로커를 반드시 하나 만들 준비였다 | 확인 명령을 `grep -q "design-tokens.css" web/style.css` 로 바꿨다. `index.html` 에 `<link>` 를 더하지 않는다 |
| **O-1** | REQ-WEBCHAT-001 이 "아홉 개"라 쓰고 열 개를 나열했다 | "열 개"로 정정 |
| **O-5** | 도크블록이 듣지 않을 때의 대안(`server/vitest.config.ts`)을 안티패턴으로 **금지**해 두었다. 그 파일은 형제의 허용 집합에 있고 카드 전체가 필요로 할 수 있다 | 금지에서 빼고 **명시된 대체 경로**로 승격. AC-WEBCHAT-015 허용 예외에도 추가 |
| **O-7** | AC-WEBCHAT-013 실패 경로 핸들러가 "run 단계에서 조정한다"로 미확정이었다 — 열여섯 중 유일 | `POST /api/rooms/1/messages` 하나만 실패시키는 핸들러로 확정. 오류 문구 표시 단언을 더해 `alert` 구현을 배제 |

**두 방향 훑기**: `plan.md` §E.2 에 기준 열여섯 개 × 두 방향 표와 계수를 기록했다. 방향 A(빈 구현 통과) **0건**, 방향 B(형제의 옳은 구현에서 실패) **5건**(골격 전역 1 + 개별 4: AC-001·009·013·015), 전부 이번 라운드에서 교정.

**바꾸지 않은 것**: 감사가 코드로 직접 확인해 **사실로 판정한 drift 주장 넷**은 그대로 살아 있다 — `@TO(코드 리뷰어)` 조용한 실패(§D 1번), SSE 재연결 백필 부재(§D 2번), 방 세대 경쟁(§D 5번), stale 타이머 누수(§D 6번). 그것을 관측하는 AC-WEBCHAT-008·010·011·007·014 도 그대로다.

### 감사 교정 라운드 3 (2026-08-27, v0.3.0)

근거: `.moai/reports/t5/plan-audit-b.md` — plan-auditor 독립 재감사. 이 SPEC **CONDITIONAL PASS**(배정된 MF-1·3·4·5·6 과 O-1·5·7 전부 종결), 카드 `t5` 통합 표면 **FAIL**.

| 항목 | 무엇이 틀렸나 | 무엇을 고쳤나 |
|------|--------------|--------------|
| **MF-9** (BLOCKING, 형제와 공동 교정) | `spec.md` L250 주석이 "`SPEC-WEBRICH-001` 이 부른다"고 형제에게 의무를 지웠는데, `registerMessageDecorator` 라는 이름이 형제의 네 파일 어디에도 없었다(감사 전수 grep). 형제는 대신 세 곳에서 `createRichContext(...).decorate` 를 넘기겠다고 적었다 — 이 SPEC 이 요구하는 **팩토리**가 아니다. 그리고 그 배선 한 줄을 세 SPEC 48개 기준 가운데 **아무것도 관측하지 않았다** | §4.6 에 「배선 계약」 신설 — 소유자(`SPEC-WEBRICH-001`)·자리(`web/app.js` 모듈 최상위)·값(`createRichContext` 그 자체)·관측자(`AC-WEBRICH-016` 관측 4·5). **형제 v0.3.0 REQ-WEBRICH-002 가 글자 그대로 같은 문단을 싣는다**(md5 대조 동일). L250 주석은 「배선 계약」 참조로 교체. 범위 밖 절에 배선 한 줄을 명시. DoD 에 "이 SPEC 마감 시점 `registerMessageDecorator(` 는 정의 하나뿐" 확인 항목 추가 |

**왜 한 세션이 두 SPEC 을 함께 고쳤나.** 라운드 1의 MF-5 를 두 SPEC 이 **각자 다른 세션에서** 고쳤고, 각자 고친 결과가 다시 어긋난 것이 MF-9 다. 감사 권고 5가 그 재발을 막기 위해 한 세션 배정을 요구했다. 이제 두 문서가 같은 문단을 공유하므로, 한쪽만 바뀌면 md5 대조에서 드러난다.

**이 SPEC 의 자립성은 그대로다.** 배선 줄은 이 SPEC 의 산출물이 아니고 이 SPEC 의 어떤 기준도 그것을 관측하지 않는다. `AC-WEBCHAT-002` 셋째 테스트("훅 없이도 렌더가 성립")가 마감 시점의 자립성을 계속 보장한다.

**공허 훑기**: `plan.md` §E.3 에 열여섯 기준 × 세 번째 물음("실패가 아니라 *공허*로 무너지는 입력이 있는가")의 표와 계수를 기록했다. 기준별 적발 **0건** — `AC-WEBCHAT-015` 는 관측 1(`git rev-parse --verify`)과 관측 4(`wc -l` 선행)로 그 가드를 **처음부터** 갖고 있었고, 감사도 같은 판정이었다. 횡단 **1건**(테스트 파일 부재·`it.skip` 시 `npm test` 가 종료 코드 `0`)을 DoD 한 줄로 막았다. 요구사항 16개·수용 기준 16개 불변.

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-WEBCHAT-001/spec.md` | GEARS 요구사항 **16개** (REQ-WEBCHAT-001..016), 범위 밖 4개 묶음, 제약, HISTORY 0.1.0 + 0.2.0 |
| `.moai/specs/SPEC-WEBCHAT-001/plan.md` | 의존, 되돌리기 어려운 결정 2건(멘션 계약 / 검증 방식), 원본 결함 10건 + 결함 아니었던 것 5건, §E.1 위험 + **§E.2 두 방향 훑기 표**, 마일스톤 M1-M4, 안티패턴 |
| `.moai/specs/SPEC-WEBCHAT-001/acceptance.md` | 수용 기준 16개 (AC-WEBCHAT-001..016, 그중 1개 MANUAL), **ES 모듈 공통 테스트 골격**, 엣지 케이스, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-WEBCHAT-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-WEBCHAT-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

| 요구사항 | 덮는 수용 기준 |
|----------|---------------|
| REQ-WEBCHAT-001 (마크업) | AC-001·002·004·005·009·012·013 (전부 실제 `index.html` 을 jsdom 에 넣고 그 안의 id 로 요소를 찾는다 — 전용 기준을 따로 두지 않은 이유는 `acceptance.md` AC 매트릭스 아래 설명) |
| REQ-WEBCHAT-002 (`openRoom` 순서) | AC-001, AC-007, AC-014 |
| REQ-WEBCHAT-003 (`renderMessage` 구조·봇 색·확장 훅) | AC-002(세 테스트: 구조·색 / 이음매 / 훅 없는 렌더), AC-016(MANUAL) |
| REQ-WEBCHAT-004 (마크업 삽입 금지) | AC-003 |
| REQ-WEBCHAT-005 (`message` 수신) | AC-004, AC-008 |
| REQ-WEBCHAT-006 (`bot_status`·stale) | AC-005, AC-006 |
| REQ-WEBCHAT-007 (타이머·스트림 정리) | AC-007 |
| REQ-WEBCHAT-008 (재연결 백필) | AC-008 |
| REQ-WEBCHAT-009 (자동완성 캐시) | AC-009 |
| REQ-WEBCHAT-010 (계약 일치) | AC-010 |
| REQ-WEBCHAT-011 (불가 이름 배제) | AC-011 |
| REQ-WEBCHAT-012 (드롭다운 열림 Enter) | AC-012 |
| REQ-WEBCHAT-013 (전송) | AC-013 |
| REQ-WEBCHAT-014 (방 세대) | AC-014 |
| REQ-WEBCHAT-015 (범위 경계·토큰) | AC-015, AC-016(MANUAL) |
| REQ-WEBCHAT-016 (공유 표면: export·`state` 필드·훅 등록) | AC-002(훅 등록·방별 컨텍스트), AC-007(타이머 필드), AC-008(커서 필드), AC-009(캐시 필드), AC-014(세대 필드) — **전용 기준을 두지 않는 근거는 `acceptance.md` AC 매트릭스 아래에 있다: 필드 존재만 보는 기준은 빈 구현이 통과하는 부류다** |

덮이지 않은 요구사항 없음. 요구사항에 대응하지 않는 수용 기준 없음.

### run 단계가 먼저 해야 하는 준비

1. **`jsdom` 개발 의존성 설치** — `npm install -D jsdom -w server`. 현재 `package-lock.json` 에 `jsdom` 도 `happy-dom` 도 없음을 확인했다. 이것 없이는 모든 웹 테스트가 환경 로드 단계에서 실패한다 (`plan.md` §C).
2. **`SPEC-WEBSHELL-001` 산출물 존재 확인** — `web/` 에는 지금 `design-tokens.css` 하나뿐이다. `index.html`·`app.js`·`style.css` 가 없으면 블로커로 보고하고 중단한다. **`app.js` 가 ES 모듈인지(`grep -c '^export' web/app.js` ≥ 1)도 함께 본다** — 아니면 계약 위반이므로 블로커다.
3. **모듈 적재 확인** — `await import('../../web/app.js?t=1')` 가 실제로 돌고, 캐시 무효화 쿼리 없이 두 번 적재하면 상태가 새는지 확인 (`plan.md` §F M2 단계 1).
4. **가짜 타이머 아래 Promise 해소 동작 확인** — 같은 자리.
5. **기록해야 할 선택 둘** — `#placeholder` 를 제거했는지 `hidden` 으로 뒀는지, jsdom 환경을 도크블록으로 얻었는지 `server/vitest.config.ts` 로 얻었는지.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
