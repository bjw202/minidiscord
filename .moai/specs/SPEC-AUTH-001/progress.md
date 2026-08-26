# SPEC-AUTH-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-AUTH-001` |
| 칸반 카드 | `t2` (마일스톤 M2) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 3 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·5·9장 |
| 워크트리 | `.claude/worktrees/t2` (브랜치 `WT-auth-room-bot`) |
| 선행 SPEC | `SPEC-CORE-001` (카드 `t1`, `completed`) |
| 후행 SPEC | `SPEC-ROOM-001` → `SPEC-BOT-001` (같은 카드, 순차 진행) |
| 현재 상태 | `draft` — plan 단계 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-AUTH-001
tier: M
card: t2
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 3)
split_from: SPEC-AUTH-001 v0.1.0 (33 REQ / 27 AC)
siblings: [SPEC-ROOM-001, SPEC-BOT-001]
spec_version: "0.4.0"
req_count: 15
ac_count: 14
tier_budget: "16 REQ / 16 AC"
spec_base_sha: "<run 단계 진입 시 기록 — M1 단계 0>"
plan_audit: .moai/reports/plan-audit/t2-3spec-audit.md
plan_audit_verdict: "FAIL (0.62) — 1차 교정 라운드 반영 완료"
plan_audit_iter2: .moai/reports/plan-audit/t2-3spec-audit-iter2.md
plan_audit_iter2_verdict: "PASS (0.90) — 남은 중대 2건(R1·R2) 반영 완료"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-AUTH-001/.spec-base-sha
```

같은 값을 위 `spec_base_sha` 필드에도 옮겨 적는다. 범위 경계 검사(AC-AUTH-012)가 `HEAD` 대신 이 값을 기준으로 비교하는 이유는, `HEAD` 기준 비교가 **이미 커밋된 변경을 볼 수 없어** 금지 요구사항을 거짓 통과시키기 때문이다. 이 SPEC 은 커밋이 하나뿐이라 실제 노출은 없지만, 형제 SPEC 두 개와 검사 형태를 통일한다.

### plan-audit 교정 라운드 (v0.3.0)

`.moai/reports/plan-audit/t2-3spec-audit.md` 가 이 SPEC 을 **FAIL (0.62 / 기준선 0.80)** 로 판정했다. 지적된 차단 3건·중대 4건·경미 3건을 전부 반영했다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| AUTH-B1 (차단) | REQ-AUTH-013 이 "인증 없이 접근 가능한 경로는 세 개뿐"이라고 단정했는데, `server/src/index.ts:5` 의 `GET /api/health` 가 이미 인증 없이 등록돼 있어 요구사항 자체가 거짓이었다. 그 경로는 SPEC-CORE-001 소관이라 지울 수도 없다 | REQ-AUTH-013 을 **이 SPEC 이 등록하는 라우트**로 한정하고, `/api/health` 가 범위 밖이며 그대로 둔다고 명시. 실제 서버에서 그 경로가 인증 없이 `200` 인지는 AC-AUTH-014 가 관측 |
| AUTH-B2 (차단) | AC-AUTH-002 의 첫 케이스(빈 `username`)가 REQ-AUTH-006 으로는 통과할 수 없었다. 타입 검사를 더하면서 원래 있던 빈 문자열 조건이 빠졌고, 빈 문자열은 문자열이므로 타입 검사를 통과한다 | REQ-AUTH-006 에 빈 문자열 조건을 되살렸다. 타입 검사는 **그대로 두고** 조건을 더한 것이다 — 되돌린 것이 아니라 두 구멍을 다 막았다 |
| AUTH-B3 (차단) | REQ-AUTH-003 의 `buildServer` 절반을 관측하는 기준이 하나도 없었다. 모든 테스트가 자기 `Fastify()` 를 배선하므로 `index.ts` 를 안 고쳐도 13개 기준이 전부 초록불이었다. AC-AUTH-005 는 테스트 헬퍼의 배선을 보고 `buildServer` 의 배선을 추론하는 문장을 달고 있었다 | **AC-AUTH-014** 신설 — `buildServer()` 를 직접 불러 `app.db` · 쿠키 발급 · 인증 라우트 등록 · `/api/health` 를 관측한다. AC-AUTH-005 의 Then 절은 자기가 관측한 것만 주장하도록 고쳤다 |
| AUTH-M1 (중대) | 엣지 케이스 표가 "`password` 가 문자열이 아니면 통과할 수 있다 / 미해결"이라고 적어, 같은 문서의 REQ-AUTH-006·AC-AUTH-002 와 정면으로 충돌했다. 원본 동작을 적은 것인데 이 SPEC 이 이미 고친 부분이다 | 해당 행을 `400` + REQ-AUTH-006 타입 검사 우선으로 고치고, 빈 문자열 행을 하나 더했다 |
| AUTH-M2 (중대) | `/api/me` 를 네 개 기준이 쓰는데 `spec.md` 는 언급조차 없었고, REQ-AUTH-013 의 문장은 오히려 그것을 금지하는 것처럼 읽혔다 | REQ-AUTH-013 에 "테스트 전용 경로이며 `server/src` 에 등록하지 않는다"를 명시. `acceptance.md` 서두와 `plan.md` §H 안티패턴에도 같은 경계를 적었다 |
| AUTH-M3 (중대) | `git diff --stat HEAD -- db.ts` 는 커밋 뒤 항상 빈 출력이라 형제 SPEC 에서 무력하다. 이 SPEC 에서는 커밋 전에 실행돼 우연히 안전했다 | 세 SPEC 모두 `spec_base_sha` 기준 비교로 통일. M1 단계 0 에 기록 절차를 넣었다 |
| AUTH-M4 (중대) | AC-AUTH-013 의 RED 판정이 vitest 가 내는 특정 문구(`Cannot find module '...'`)를 단언해, 해석 경로에 따라 재현되지 않았다 | 판정을 "모듈 부재가 원인임이 출력에 나타난다"로 완화하고, 원문 출력을 `§E.2` 에 남기는 것을 증거로 삼는다 |
| AUTH-m1 (경미) | AC-AUTH-009 의 `for` 반복문은 출력 다섯 줄의 순서로만 원인을 짚을 수 있었다 | 심볼별로 `grep -c` 를 따로 실행하도록 풀었다 |
| AUTH-m2 (경미) | `app.db` 와 `registerAuthRoutes(app, db)` 라는 두 경로가 같은 연결을 가리켜야 한다는 것을 `plan.md` 만 알고 요구사항 층은 몰랐다 | REQ-AUTH-003 에 `registerAuthRoutes(app, app.db)` 호출 규칙을 명시 |
| AUTH-m3 (경미) | 모듈 선언 병합이 `auth.ts` 와 `index.ts` 로 갈라져 있어, 빌드를 나누면 깨진다 | `plan.md` §E 에 위험으로 기록. 지금 구조를 바꾸지는 않는다 |

### plan-audit 2차 교정 라운드 (v0.4.0)

`.moai/reports/plan-audit/t2-3spec-audit-iter2.md` 가 이 SPEC 을 **PASS (0.90 / 기준선 0.80, 차단 0건)** 로 판정했다. 1차의 지적 10건은 모두 닫힌 것으로 확인됐고, 이번 라운드는 남은 **중대 2건만** 닫는다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| R1 (중대) | AC-AUTH-012 의 관측 조건이 "출력이 비어 있다" 하나뿐이었다. `.spec-base-sha` 가 없으면 `$(cat …)` 이 빈 문자열이 되고 git 은 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝나는데 **표준 출력은 비어 있다** — M1 단계 0 을 건너뛴 실행이 이 기준을 통과했다 | AC-AUTH-012 와 DoD 를 세 명령으로 나눴다. `git rev-parse --verify "$(cat …)^{commit}"` 이 **종료 코드 `0`** 으로 40자리 SHA 를 내는 것을 먼저 관측하고, 그 SHA 를 직접 넣은 `git diff` 가 **종료 코드 `0` 이면서** 비어 있는지를 본다. `plan.md` §F 단계 7 과 §H 에도 같은 조건을 적었다 |
| R2 (중대) | AC-AUTH-014 가 임시 `MINIDISCORD_DATA_DIR` 로 도는 것이 우연에 기대고 있었다. `config.dataDir` 이 게터가 아닌 평범한 속성이라, `auth.ts` 가 `config` 를 import 하는 순간 대입이 무효가 되고 이 기준은 통과하면서 저장소의 진짜 `data/` 를 열게 된다 | `server/src/config.ts` 의 `dataDir` 을 게터로 바꿨다(카드 교차 수정 — `SPEC-CORE-001` 산출물을 `t2` 에서 수정, 사유는 `AC-ROOM-011` hermetic 보장). 기록은 `SPEC-ROOM-001` `plan.md` §D 8번에 있고, 이 SPEC 은 AC-AUTH-014 본문·`plan.md` §E·§I 에서 그것을 참조한다 |

**남은 한계 (기록만).** `config.ts` 3행의 `port` 는 여전히 즉시 평가다. 이 SPEC 은 `MINIDISCORD_PORT` 를 설정하지 않으므로 걸리는 기준이 없다. 상세는 `SPEC-ROOM-001` `plan.md` §D 8번.

**이번 라운드에서 닫지 않은 것.** 2차 보고서의 R3(`plan.md` M1 단계 2 에 남은 RED 문구)는 경미로 분류돼 있고 이번 지시 범위 밖이라 그대로 둔다 — **미해결**이다.

### plan-audit 3차 교정 라운드 (v0.5.0)

`.moai/reports/plan-audit/t2-3spec-audit-iter3.md` 가 이 SPEC 을 **FAIL (0.87 / 기준선 0.80, 차단 2건)** 로 판정했다. 점수는 기준선을 넘겼고, 실패 사유는 점수가 아니라 차단 결함이다. 리드 지시에 따라 이번 라운드는 **D1 하나만** 닫는다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| D1 (차단) | "이름 붙은 기존 테스트가 통과한다"를 관측 전부로 삼은 기준 다섯 개(AC-AUTH-001·003·005·006·007)가 명령을 `npm test -w server` 로 지정했다. 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않으므로, 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고 둘 다 종료 코드 `0` 이다. 원문 출력을 `§E.2` 에 그대로 남기는 절차적 보완도 여기서는 듣지 않는다 — 남길 출력 안에 테스트 이름 자체가 없기 때문이다 | 명령을 `npm test -w server -- --reporter=verbose` 로 바꾸고, 관측을 `✓ test/auth.test.ts > <describe 이름> > <테스트 이름>` 줄이 출력에 나타나는가 하나로 다시 썼다. AC 매트릭스 행과 Given-When-Then 본문을 함께 고쳐 둘이 어긋나지 않게 했다. `acceptance.md` 서두에 공통 조항을, `plan.md` §H 에 안티패턴을 더했다. `-t <이름>` 필터는 대안으로 쓰지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이라 같은 결함이 되살아난다 |

**감사 목록과 실제 교정 범위.** 3차 보고서는 이 SPEC 의 D1 대상을 네 건(AC-AUTH-001·003·006·007)으로 적었다. 같은 형태인 AC-AUTH-005 가 그 목록에서 빠져 있어 이번 교정에서 함께 고쳤다 — 실제로는 다섯 건이다.

**이번 라운드에서 닫지 않은 것.** D2(원본 `plan-v2.md` 가 이 워크트리에도 git 에도 없는 문제)는 리드 판단 대기라 손대지 않았다 — **미해결**이다. 2차 보고서의 R3·R5 도 리드가 의도적으로 이월한 항목이라 그대로 둔다 — **미해결**이다. 지연 평가되지 않는 `config.port` 잔여 한계도 그대로다 — **미해결**이다.

### 3분할 기록

버전 0.1.0 의 이 SPEC 은 요구사항 33개·수용 기준 27개를 담고 있었다. `.claude/rules/moai/workflow/spec-workflow.md:146-152` 의 Tier 예산은 Tier M 을 16/16, Tier L 을 25/25 로 묶고, 상한을 넘으면 예산을 늘리지 말고 쪼개라고 지시한다. 33/27 은 Tier L 상한도 넘는다. 그래서 카드 `t2` 를 그대로 둔 채 SPEC 만 셋으로 나눴다.

| SPEC | 범위 | 원본 REQ |
|------|------|----------|
| `SPEC-AUTH-001` (이 문서) | 인증 — 가입·로그인·로그아웃·세션 쿠키·진입 검사 | REQ-AUTH-001..013 |
| `SPEC-ROOM-001` | 방 API + 봇 등록 API | 원본 REQ-AUTH-014..024 |
| `SPEC-BOT-001` | 봇 초대·토큰 발급 API | 원본 REQ-AUTH-025..031 |

원본의 범위 경계 요구사항(REQ-AUTH-032·033)은 각 SPEC 이 자기 범위에 맞게 다시 쓴다. 이 SPEC 에서는 REQ-AUTH-014(네 파일만)·REQ-AUTH-015(`SCHEMA` 불변)가 그 자리다. 요구사항 번호 001..013 은 AUTH 접두사를 유지하므로 **원본 번호 그대로** 두었다.

실행 순서는 의존 순서와 같다: `SPEC-AUTH-001` → `SPEC-ROOM-001` → `SPEC-BOT-001`. 뒤의 두 SPEC 이 이 SPEC 의 `requireAuth` 와 세션 쿠키 계약을 소비한다(`plan.md` §A).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-AUTH-001/spec.md` | GEARS 요구사항 15개 (REQ-AUTH-001..015), 범위 밖 8개 항목(형제 SPEC 3개 포함), 제약, HISTORY 0.4.0 |
| `.moai/specs/SPEC-AUTH-001/plan.md` | 의존 순서와 내보내는 계약(§A) 우선 배치, DB 주입 결정(§B), 사람이 보는 계약(§C), 원본 모순 2건(§D), 위험 5건, 마일스톤 M1, 안티패턴 6건 |
| `.moai/specs/SPEC-AUTH-001/acceptance.md` | 수용 기준 14개 (AC-AUTH-001..014), Given-When-Then 시나리오, 엣지 케이스 7건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-AUTH-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-AUTH-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

15개 REQ 전부가 하나 이상의 AC 에 매핑됐다. 빠진 요구사항은 없다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-AUTH-001 | `auth.ts` 네 개의 내보내기 | AC-AUTH-009 |
| REQ-AUTH-002 | `FastifyRequest.user` 타입 선언 | AC-AUTH-009 |
| REQ-AUTH-003 | `@fastify/cookie` 등록 + `app.db` 데코레이터 + `registerAuthRoutes(app, app.db)` | **AC-AUTH-014** (실제 `buildServer` 관측), AC-AUTH-005 (테스트 인스턴스에서 두 경로가 같은 연결) |
| REQ-AUTH-004 | salt + scrypt 비밀번호 해시 | AC-AUTH-008 |
| REQ-AUTH-005 | 회원가입 성공 201 | AC-AUTH-001 |
| REQ-AUTH-006 | 유효하지 않은 가입 입력 400 | AC-AUTH-002 |
| REQ-AUTH-007 | 중복 사용자 이름 409 | AC-AUTH-003 |
| REQ-AUTH-008 | 로그인 성공 + 세션 쿠키 속성 | AC-AUTH-004 |
| REQ-AUTH-009 | 로그인 실패 401 (본문 구분 없음) | AC-AUTH-006 |
| REQ-AUTH-010 | 로그아웃이 세션 삭제 + 쿠키 제거 | AC-AUTH-010 |
| REQ-AUTH-011 | 진입 검사 통과 시 `req.user` 설정 | AC-AUTH-005 |
| REQ-AUTH-012 | 미인증 요청 401, 핸들러 미실행 | AC-AUTH-007 |
| REQ-AUTH-013 | 이 SPEC 이 등록하는 라우트 중 인증 예외는 세 개뿐, `/api/health` 는 범위 밖, `/api/me` 는 테스트 전용 | AC-AUTH-011, AC-AUTH-014 (`/api/health` 가 인증 없이 `200`) |
| REQ-AUTH-014 | `server/src` 는 네 파일만 | AC-AUTH-012 |
| REQ-AUTH-015 | `db.ts` 의 `SCHEMA` 불변 | AC-AUTH-012 (`spec_base_sha` 기준 diff — 기준 SHA 확인과 diff 둘 다 종료 코드 `0` 관측) |
| (전 구간) | RED→GREEN 전이 증거 | AC-AUTH-013 |

역방향도 확인했다. AC-AUTH-001..012 와 AC-AUTH-014 는 각각 최소 하나의 REQ 를 검증하고, AC-AUTH-013 만 요구사항이 아닌 개발 절차(테스트 우선)를 검증한다.

**REQ-AUTH-003 의 검증이 왜 두 기준으로 갈라지는가.** 이 요구사항은 두 가지를 요구한다 — 테스트든 실서버든 인증 라우트의 DB 와 `req.server.db` 가 같은 연결이어야 한다는 것, 그리고 그 배선을 `buildServer` 가 실제로 한다는 것. 앞은 AC-AUTH-005 가, 뒤는 AC-AUTH-014 가 관측한다. 교정 전에는 앞의 관측으로 뒤를 추론하고 있었고, plan-audit 이 그것을 차단 결함(AUTH-B3)으로 잡았다.

**이 SPEC 에서 관측하지 않는 것.** `buildServer` 로 조립한 서버에서 `requireAuth` 가 보호 라우트를 막는지는 여기서 관측할 수 없다 — 이 시점의 `buildServer` 에는 보호 라우트가 하나도 없다(`/api/me` 는 테스트 전용). 그 절반은 `SPEC-ROOM-001` 의 `AC-ROOM-011` 이 방 라우트가 붙은 뒤에 관측한다.

**v0.5.0 (3차 교정) — 관측 형태만 바뀌었다.** 위 매핑은 그대로다. 요구사항도 수용 기준도 하나 늘거나 줄지 않았다. 바뀐 것은 다섯 개 기준(AC-AUTH-001·003·005·006·007)이 **무엇을 보고 판정하는가**다 — `npm test -w server` 의 요약 줄과 종료 코드가 아니라, `npm test -w server -- --reporter=verbose` 출력의 `✓ test/auth.test.ts > <describe 이름> > <테스트 이름>` 줄이다. 이 기준들이 덮는 REQ-AUTH-005·007·011·009·012 의 검증 강도가 그만큼 올라간다.

### 이 단계에서 하지 않은 것 (Gaps)

- 이 SPEC 의 산출물 코드는 한 줄도 작성하지 않았다. `server/src/auth.ts` 와 `server/test/auth.test.ts` 모두 미생성 — run 단계 소관이다. **예외 한 건**: v0.4.0 교정 라운드에서 `server/src/config.ts` 의 `dataDir` 이 게터로 바뀌었다(R2, 카드 교차 수정 — `SPEC-ROOM-001` `plan.md` §D 8번). 이 SPEC 의 산출물이 아니라 AC-AUTH-014 와 AC-ROOM-011 의 전제를 성립시키는 수정이다.
- `server/src/index.ts` 의 `buildServer` 수정도 하지 않았다. 현재는 `GET /api/health` 하나만 등록한 SPEC-CORE-001 상태 그대로다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. 전부 run 단계에서 처음 실행된다. `npm test -w server` 가 현재 몇 개 통과하는지도 **미검증**이다(기존 3개로 추정하나 이 세션에서 관측하지 않았다).
- ~~형제 SPEC 두 개의 파일은 읽지 않았다~~ — **v0.3.0 교정 라운드에서 해소됨.** 세 SPEC 을 한 세션이 함께 들고 고쳤고, 교차 참조(`SPEC-ROOM-001 REQ-ROOM-005`, `SPEC-ROOM-001 AC-ROOM-011`, `SPEC-BOT-001` 의 `build()` 헬퍼 출처)를 상대 문서와 대조해 확인했다. 최초 작성 시의 이 미검증 항목이 이번 감사에서 지적된 교차 SPEC 결함 대부분의 원인이었다.
- 원본 `plan-v2.md` Task 6 이후(메시지·멘션·SSE·게이트웨이)는 읽지 않았다. 카드 범위 밖이다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
