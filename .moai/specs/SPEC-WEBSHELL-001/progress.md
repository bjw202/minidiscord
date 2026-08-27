# SPEC-WEBSHELL-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-WEBSHELL-001` |
| 칸반 카드 | `t5` (마일스톤 M5) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 15 |
| 시각 표준 | `.moai/project/design-dna-discord.md` + `web/design-tokens.css` |
| 워크트리 | `.claude/worktrees/t5` (브랜치 `WT-web-ui`) |
| 선행 SPEC | `SPEC-CORE-001` → `SPEC-AUTH-001` → `SPEC-ROOM-001` (카드 `t1`·`t2`) |
| 실행 순서 | 카드 `t5` 의 첫 SPEC — `SPEC-WEBCHAT-001`(Task 16)·`SPEC-WEBRICH-001`(Task 17)이 이 SPEC 의 `state`/`api()`/`initApp()` 계약에 결합한다 |
| 현재 상태 | `draft` — plan 단계 완료, **감사 교정 라운드 반영(0.2.0)** |
| plan 감사 | `.moai/reports/t5/plan-audit.md` (2026-08-27, HEAD `6e9a167`) — 이 SPEC **CONDITIONAL PASS**, 통합 표면 **FAIL**. 배정된 MUST-FIX 5건(MF-2·3·4·6·7) + 관찰 O-4 교정 완료 |
| spec_base_sha | `0020276` (전체: `00202769b3731ea223d97c2c20e8068cd4d331cd`) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-WEBSHELL-001
tier: M
card: t5
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 15)
design_standard: .moai/project/design-dna-discord.md + web/design-tokens.css
spec_version: "0.2.0"
req_count: 15
ac_count: 16
plan_audit_report: .moai/reports/t5/plan-audit.md
plan_audit_verdict: CONDITIONAL_PASS
plan_audit_fixes: [MF-2, MF-3, MF-4, MF-6, MF-7, O-4]
card_contract_section: "spec.md §4.8 (REQ-WEBSHELL-015)"
manual_ac_count: 1
tier_budget: "16 REQ / 16 AC"
spec_base_sha: 00202769b3731ea223d97c2c20e8068cd4d331cd
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-WEBSHELL-001/.spec-base-sha
```

같은 값을 위 필드와 표에 옮겨 적는다. 이 기준점 위에 AC-015 의 관측 **일곱 개**가 올라간다 — `db.ts` 불변, 변경 파일이 허용 집합 이내, `#placeholder` 존재, `index.html` 의 토큰 문자열 부재, `state` 필드가 정확히 셋 등(REQ-WEBSHELL-014·015).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-WEBSHELL-001/spec.md` | GEARS 요구사항 **15개** (REQ-WEBSHELL-001..015), §4.8 형제 결합 계약 6조항, 범위 밖 4개 묶음, 제약, HISTORY 0.1.0·0.2.0 |
| `.moai/specs/SPEC-WEBSHELL-001/plan.md` | 의존, 되돌리기 어려운 결정 2건(`app.js` 공개 표면 / 검증 방식), 원본 결함 8건(8번은 미해결 보존), **전수 훑기 §E.1(0.1.0)·§E.2(0.2.0 두 방향 32질문)**, 위험 18건, 마일스톤 M1-M4, 안티패턴 33건 |
| `.moai/specs/SPEC-WEBSHELL-001/acceptance.md` | 수용 기준 16개 (AC-WEBSHELL-001..016, 그중 1개 MANUAL), 공통 테스트 골격, 엣지 케이스 9건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-WEBSHELL-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-WEBSHELL-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

| 요구사항 | 덮는 AC |
|----------|---------|
| REQ-WEBSHELL-001 (정적 서빙) | AC-001 |
| REQ-WEBSHELL-002 (API 비가림) | AC-002 |
| REQ-WEBSHELL-003 (index.html 골격) | AC-003, AC-004 |
| REQ-WEBSHELL-004 (style.css 토큰 소비) | AC-005 |
| REQ-WEBSHELL-005 (app.js 공개 표면) | AC-006 |
| REQ-WEBSHELL-006 (`api()` 요청 구성) | AC-007 |
| REQ-WEBSHELL-007 (`401` 두 갈래) | AC-008 |
| REQ-WEBSHELL-008 (로그인/회원가입) | AC-009 |
| REQ-WEBSHELL-009 (방 목록 렌더) | AC-010 |
| REQ-WEBSHELL-010 (방 생성·보관) | AC-011 |
| REQ-WEBSHELL-011 (봇 목록·등록) | AC-012 |
| REQ-WEBSHELL-012 (로그아웃) | AC-013 |
| REQ-WEBSHELL-013 (시각 충실도) | AC-014 **(MANUAL)** |
| REQ-WEBSHELL-014 (범위 경계) | AC-015 |
| REQ-WEBSHELL-015 (형제 결합 계약) | AC-003(계약 4), AC-004(계약 1·4), AC-005(계약 5), AC-006(계약 1·2·3), AC-012(계약 4·6), AC-015(계약 2·4·5) — **간접 커버, 계약 조항별 관측 지정** |
| — (프로세스) | AC-016 (RED→GREEN 전이) |

덮이지 않은 요구사항 없음. AC 16개 중 15개가 기계 검증, 1개가 명시적 MANUAL.

**REQ-015 가 전용 AC 없이 간접 커버인 이유.** Tier M 예산이 수용 기준 16개로 차 있고, REQ-015 는 새 동작을 요구하는 것이 아니라 **기존 기준들이 무엇을 관측하는지를 형제가 읽을 수 있게 모아 놓은 계약**이다. 계약 여섯 조항 각각이 위 표대로 이미 존재하는 기계 관측에 매핑되므로, 관측되지 않는 조항은 없다. 감사 MF-8 이 형제 SPEC 에서 잡은 부류("어떤 기준으로도 관측되지 않는 요구사항")를 이 SPEC 이 반복하지 않기 위해 매핑을 조항 단위로 적었다.

### 수용 기준 전수 훑기 — 두 방향, 두 번

[HARD] 이 SPEC 은 훑기를 두 차례 거쳤다. 두 번째가 필요했던 이유가 이 라운드의 핵심이다.

**1차 (0.1.0, 자기 SPEC 범위).** 열여섯 기준을 한 부류로 묶어 읽고 두 방향을 물었다.

1. **"본문이 비어 있는 구현에서도 이 기준이 통과하는가?"** — 초안 아홉 건이 걸렸고 존재 단언을 짝지어 고쳤다.
2. **"완전히 옳은 구현이 이 기준에서 실패할 수 있는가?"** — **적발 0건이라고 적었다.**

**2차 (0.2.0, 카드 전체 범위).** 독립 감사(`.moai/reports/t5/plan-audit.md`)가 두 번째 방향에서 **3건**을 잡았다 — AC-003(`#placeholder`, MF-6) · AC-006(export 집합 `toEqual`, MF-2) · AC-015(`package-lock.json` 누락, O-4).

**1차의 "0건" 주장은 틀렸다.** 감사가 그 원인을 정확히 짚었다: 질문을 **자기 SPEC 안에서만** 물었기 때문이다. 두 번째 방향의 실패는 형제 SPEC 의 변경이 일으키므로, 자기 SPEC 산출물만 보는 훑기로는 원리적으로 보이지 않는다. 첫 방향에 걸린 것이 하나도 없다는 사실이 두 번째 방향도 안전하다는 근거가 될 수 없는데, 1차는 사실상 그렇게 읽었다.

그래서 질문을 바꿔 다시 훑었다: **"이 기준이, 형제 SPEC 이 자기 요구사항대로 옳게 구현했을 때 실패하는가?"**

| 방향 | 질문 수 | 적발 | 내역 |
|------|--------|------|------|
| A — 빈 구현이 통과하는가 | 16 | **0** | 1차 주장이 사실이었고 독립 감사도 같은 결론(48개 중 0건) |
| B — 형제의 옳은 구현이 실패시키는가 | 16 | **3 결함 + 4 잠재 위험** | 결함: AC-003·AC-006·AC-015 (전부 교정). 잠재 위험: AC-004(스크립트 타입) · AC-005(CSS 규율) · AC-009/011(호출 순번) · AC-012(`#bot-list` 자식 수) |
| **합계** | **32** | **7** | 결함 3건은 기준을 고쳤고, 잠재 위험 4건은 `spec.md` §4.8 계약 조항으로 봉인했다 |

훑기 표 전문은 `plan.md` §E.2 에 있다.

**두 부류를 가른 원리 둘.**

1. **소유하지 않은 것을 단언했다** — AC-003 의 `placeholder`, AC-006 의 `toEqual` 집합. 교정: 소유한 것만 단언하고 소유하지 않은 것에는 침묵한다.
2. **시점에 따라 참·거짓이 뒤집히는 성질을 시점 무관 영구 기준에 넣었다** — 형제 필드의 부재, `#placeholder` 의 존재. 교정: 그런 성질은 이 SPEC 마감 시점 명령(AC-015)으로 옮긴다. `npm test -w server` 는 형제 둘의 GREEN 게이트이기도 하므로, 거기 실리는 기준은 카드가 끝날 때까지 참이어야 한다.

훑기 후 남은 성질:

- 부재 검사가 **단독으로** 판정하는 기준: **0건.**
- 자동 검사인 척하는 시각 기준: **0건.** AC-014 를 MANUAL 로 명시하고 관측 항목 6개를 반증 가능한 형태로 열거했다.
- 형제의 옳은 구현이 실패시키는 기준: **0건** (교정 후). 잠재 위험 4건은 계약으로 봉인됐으므로, 형제가 계약을 어겼을 때만 붉어진다 — 그것은 형제의 결함이지 이 기준의 결함이 아니다.

### 0.2.0 교정 항목별 조치

| 감사 항목 | 무엇이 문제였나 | 조치 |
|-----------|----------------|------|
| **MF-2** | AC-006 이 export 집합과 `state` 를 `toEqual` 로 못 박아, 형제가 확장하는 순간 옳은 구현이 실패. `spec.md` L156 의 자기 서술과도 모순 | 필수 부분집합 + 형태 단언으로 교체. 부재 단언은 AC-015 관측 7(마감 시점)로 이관. `spec.md` §4.8 계약 2·3 에 확장 모델 명문화 |
| **MF-3** | `$(id)` 를 형제 둘이 의존하는데 export 목록에 없음. `enterMain()` 은 어디에도 없는 이름 | `$` 를 REQ-005 export 목록과 `REQUIRED_EXPORTS` 에 추가(17→18). `enterMain()` 은 **존재하지 않음**을 §4.8 계약 3 이름 대조표에 명시 — 형제가 참조를 제거한다 |
| **MF-4** | `state` 확장 모델이 두 SPEC 에서 다르게 읽혔다 | §4.8 계약 2가 단일 해석으로 확정 — 이 SPEC 은 세 필드만 초기화, 형제는 자기 필드를 **스스로 초기화**. 소유 표로 명시 |
| **MF-6** | `#placeholder` 를 영속 필수 id 로 둬서, WEBCHAT 이 `#chat` 내용물을 교체하면 영구 테스트가 붉어짐 | 영속 24개 / 이 SPEC 전용 1개로 분리. `#chat` 요소는 이 SPEC 소유, 내용물은 WEBCHAT 소유(§4.8 계약 4) |
| **MF-7** | 토큰 로딩 경로가 명시되지 않아 형제가 `index.html` 을 grep 하는 기준을 만들었다 | §4.8 계약 5가 단일 경로 확정 + 올바른 grep 대상(`web/style.css`) 명시. AC-015 관측 6이 `index.html` 에 토큰 문자열이 없음을 이 SPEC 마감 시점에 확인 |
| **O-4** | AC-015 허용 집합에 루트 `package-lock.json` 이 빠짐 — M1 첫 작업이 반드시 바꾸는 파일 | 허용 집합에 추가(+`server/vitest.config.ts`). 판정을 "정확히 네 줄"에서 "필수 넷 포함 ∧ 허용 집합 이내"로 교체 |
| **MF-1** (오케스트레이터 결정) | `app.js` 모듈 형식이 WEBSHELL(ES 모듈) ↔ WEBCHAT(클래식 스크립트)로 정면 충돌 | **ES 모듈로 확정** — plan-audit 교정 게이트의 오케스트레이터 결정. `spec.md` §4.8 계약 1·HISTORY 0.2.0·§6 제약에 출처를 명시해, 형제의 준수 근거가 이 SPEC 의 선택이 아니라 그 결정임을 추적 가능하게 했다 |

### 원본 Task 15 코드 블록 결함 (plan.md §D 전문)

| # | 결함 | 처리 |
|---|------|------|
| 1 | `id="sidebar-top"` 중복 (원본 2989행·2999행) | 클래스 `.sidebar-head` 로 교체. AC-003 이 기계적으로 잡는다 |
| 2 | 로그아웃 UI 부재 — 서버의 `POST /api/auth/logout` 이 도달 불가 | `#logout-btn` + `logout()` 추가 (REQ-012, AC-013) |
| 3 | `promptText` 가 `submit` 에서 `returnValue` 를 읽음 | `close` 이벤트 + `{ once: true }` 로 교체 |
| 4 | 액션 핸들러에 `try/catch` 없음 — 오류를 삼킴 | `#error-toast` + 액션 함수의 오류 처리 (REQ-010, AC-011) |
| 5 | `style.css` 가 원시 16진 색값 사용, 토큰 파일 미소비 (값도 일부 불일치) | `@import` + `var(--md-*)` 전환 (REQ-004, AC-005) |
| 6 | `app.js` 가 전역 스크립트 + 즉시실행 IIFE — 검증 불가 | ES 모듈 + `initApp()` + 액션 함수 분리 (REQ-005) |
| 7 | `@fastify/static` 미등록 (의존성은 설치됨), 원본 명시 버전과 실제 설치본 불일치 | `buildServer` 맨 끝에 등록 (REQ-001, AC-001·002) |
| 8 | 원본 파일 구조에 `web/design-tokens.css` 가 없음 | **미해결 보존** — 원본은 읽기 전용 |

### 이 단계에서 하지 않은 것 (Gaps)

- **`@fastify/static` v10 의 API 경로 폴백 동작을 실행으로 확인하지 않았다.** 이 워크트리에 `node_modules` 가 없어 확인할 수 없었다. AC-WEBSHELL-002 가 어느 쪽이든 기계적으로 판정하며, 폴백한다면 `plan.md` §D 7번의 조정 절차를 따르고 블로커로 보고한다.
- **vitest 4 에서 `// @vitest-environment jsdom` 도크블록이 동작하는지 확인하지 않았다.** 같은 이유. 대안(`vitest.config.ts` + `test.projects`)을 `plan.md` §C 에 미리 적어 뒀고, 어느 쪽을 썼는지 §E.2 에 기록하게 했다.
- **jsdom 의 `<dialog>`·`window.confirm` 지원 여부를 확인하지 않았다.** 확인 대신 그 의존을 끊는 설계를 택했다 — 액션 함수를 분리해 기계 검증을 다이얼로그 밖으로 옮기고, 다이얼로그 자체는 AC-014 MANUAL 로 보냈다.
- **테스트를 실제로 실행하지 않았다.** plan 단계의 산출물은 문서 넷뿐이며 코드는 한 줄도 쓰지 않았다. `acceptance.md` 의 테스트 본문은 실행 검증되지 않은 제안이다 — run 단계에서 실제로 돌려 보고 조정이 필요하면 그 조정을 §E.2 에 기록한다.
- **`web/` 아래 어떤 파일도 만들거나 고치지 않았다.** 기존 `web/design-tokens.css` 는 읽기만 했다.

### Residual-risk (잔여 위험)

- **형제 SPEC 둘의 교정이 아직 반영되지 않았다.** 이 SPEC 은 `spec.md` §4.8 에 계약을 확정했지만, `SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001` 은 이 라운드 뒤에 교정된다. 형제가 §4.8 을 참조하도록 바뀌기 전까지는 세 문서가 여전히 서로 다른 표면을 말한다 — 이 SPEC 의 산출물만으로는 통합 표면 FAIL 이 해소되지 않는다. 해소 여부는 형제 교정 후 재감사가 판정한다.
- **§4.8 계약 6조항이 실행으로 검증되지 않았다.** plan 단계 산출물은 문서뿐이고 `web/` 아래에는 아직 아무 파일도 없다. 계약이 실제 구현에서 성립하는지는 run 단계 AC-003·004·005·006·012·015 가 처음 판정한다.
- **계약 5의 16진 선택자 규칙은 현재 알려진 이름 집합에 대해서만 확인했다.** 세 SPEC 이 지금 쓰겠다고 적은 id·클래스를 전수 대조해 오탐이 없음을 확인했지만, 형제가 나중에 새 이름을 더하면 다시 걸릴 수 있다. 규칙 자체는 §4.8 계약 5에 적혀 있으므로 형제가 읽고 지키는 것에 의존한다.
- `plan-v2.md` 는 코드보다 오래된 문서다. Task 16·17 의 코드 블록에도 같은 부류의 결함이 있을 공산이 크다 — 형제 SPEC 이 각자 §D 를 두는 것으로 처리한다.

---

## §E.2 Run-phase Evidence

### M1 — 준비와 정적 서빙

**DOM 테스트 환경 결정 (plan.md §C)**: 파일 단위 도크블록 `// @vitest-environment jsdom` 을 채택했다. vitest 4.1.11 + jsdom 29.1.1 에서 정상 작동한다 — 첫 실행 출력의 `environment 396ms` 가 jsdom 환경 로드이며, 도크블록이 무시됐다면 `loadDom` 의 `DOMParser` 가 없어 다른 오류로 죽는다. `server/vitest.config.ts` 대안 경로는 쓰지 않았다(AC-015 허용 집합에도 안 들어간다).

**acceptance.md 골격 대비 조정**: 공통 골격의 `stubFetch`/`loadApp` 헬퍼를 M3 시점에 추가했다. M1 골격에 포함했더니 Vite transform 이 아직 없는 `../../web/app.js` import 해석에 실패해 파일 전체가 로드되지 않았다(RED 직전 판). 마일스톤 순서상 `app.js` 는 M3 에서 만들므로, 헬퍼는 그 소비 시점(AC-006~013 테스트)에 함께 넣는다.

**RED (AC-016 전이 1)**:

```
$ npm test -w server -- web-shell.test.ts
Error: ENOENT: no such file or directory, open '.../t5/web/index.html'
 ❯ loadDom test/web-shell.test.ts:17:16
 Test Files  1 failed (1)
      Tests  2 failed (2)
```

원인이 `web/index.html` 부재로 출력에 직접 보인다 — AC-016 전이 1 의 허용 원인 둘 중 하나.

**GREEN (AC-016 전이 2)**:

```
$ npm test -w server -- web-shell.test.ts
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

**전체 스위트 + typecheck (직접 실행)**:

```
$ npm test -w server
 Test Files  11 passed (11)
      Tests  106 passed (106)      ← 기존 104 + 이 SPEC 2

$ npm run typecheck -w server
종료 코드 0
```

**@fastify/static v10 폴백 확인 (plan.md §D 7 미확인 항목 — 해소)**: AC-002 가 통과했다. `GET /api/nope` 는 `404` 에 비-HTML 본문을 내고 `index.html` 로 폴백하지 않는다. `wildcard` 조정 없이 등록 위치(buildServer 맨 끝)만으로 충분했다. 블로커 없음.

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

---

## §F Phase 4 Mode Selection

- **기록 시각**: 2026-08-27 (run-phase 진입, 카드 `t5` run 레인 `run2`)
- **입력 변수**: tier=M · scope=신규 3파일(web/index.html·style.css·app.js)+기존 1파일(server/src/index.ts)+테스트 · domain=1(웹 UI) · 언어 혼합=HTML/CSS/JS/TS · 동시성 편익=LOW(코딩 집중, 계약 소유자 단일 세션 필수)
- **모드 평가**: `direct` 부적합(다중 파일·신규 UI) · `serial` **선택** · `fanout` 부적합(코딩 집중 — Anthropic 코딩 병렬성 주의; WEBSHELL은 공유 계약 소유자로 단독 구현 필수) · `sweep` 부적합(기계적 균일 변환 아님)
- **Decision: serial**
- **근거**: 코딩 집중 작업은 직렬이 기본(Anthropic 코딩-과제 병렬성 회피 권고). 세 SPEC이 한 파일(web/app.js)을 공유하므로 병렬 쓰기는 이음새 파괴 위험. 구현은 manager-develop 역할의 단일 에이전트가 순차 수행.
- **Plan Audit Gate 스킵 근거**: 최종(3차) 감사 `.moai/reports/t5/plan-audit-c.md` 판정 **PASS**(MUST-FIX 11건 전부 종결, 미종결 0건 — Tier M 문턱 0.80 충족 판정문) + 산출물 해시 무변경(판정 후 plan 산출물 커밋 `0020276` 이후 spec/plan/acceptance 수정 없음, `git status`로 확인). 스킵 3조건 모두 성립.
