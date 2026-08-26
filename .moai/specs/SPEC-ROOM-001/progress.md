# SPEC-ROOM-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-ROOM-001` |
| 칸반 카드 | `t2` (3분할 중 두 번째) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·5장 |
| 워크트리 | `.claude/worktrees/t2` (브랜치 `WT-auth-room-bot`) |
| 선행 SPEC | `SPEC-CORE-001` (완료), `SPEC-AUTH-001` (같은 카드, 먼저 실행) |
| 후행 SPEC | `SPEC-BOT-001` (같은 카드, 나중 실행) |
| 실행 순서 | `SPEC-AUTH-001` → **`SPEC-ROOM-001`** → `SPEC-BOT-001` |
| 현재 상태 | `completed` — sync 단계 완료 (§E.4 audit-ready) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-ROOM-001
tier: M
card: t2
split_of: "카드 t2 원본 SPEC (요구사항 33 / 수용 기준 27 — Tier L 상한 25/25 초과)"
depends_on: SPEC-AUTH-001
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 4)
spec_version: "0.3.0"
req_count: 14
ac_count: 11
tier_budget: "16 REQ / 16 AC"
spec_base_sha: "bca6067b7d76cdf3eb196d1a4326fba3f4f54962"
plan_audit: .moai/reports/plan-audit/t2-3spec-audit.md
plan_audit_verdict: "FAIL (0.74) — 1차 교정 라운드 반영 완료"
plan_audit_iter2: .moai/reports/plan-audit/t2-3spec-audit-iter2.md
plan_audit_iter2_verdict: "PASS (0.88) — 남은 중대 2건(R1·R2) 반영 완료"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-ROOM-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 SPEC 에서는 이 기준점이 특히 중요하다 — 범위 경계 검사가 M2 에서 도는데 M1 이 이미 커밋을 하므로, `HEAD` 기준 비교로는 M1 에서 커밋된 스키마 변경을 **원리적으로 볼 수 없다**.

### plan-audit 교정 라운드 (v0.2.0)

`.moai/reports/plan-audit/t2-3spec-audit.md` 가 이 SPEC 을 **FAIL (0.74 / 기준선 0.80)** 로 판정했다. 세 SPEC 중 기준선에 가장 가까웠고, 차단 1건·중대 3건·경미 4건을 전부 반영했다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| ROOM-B1 (차단) | AC-ROOM-009 의 `git diff --stat HEAD -- server/src/db.ts` 는 커밋된 변경을 볼 수 없다. 이 검사는 M2 단계 6 에서 도는데 M1 은 단계 6 에서 이미 커밋하므로, M1 에서 컬럼을 더해 커밋하면 출력이 비어 REQ-ROOM-013 이 **거짓 통과**한다. 감사자가 이 워크트리에서 실제로 재현했다 — `db.ts` 는 72줄이 커밋돼 있는데 같은 명령의 출력이 비어 있다 | 비교 기준을 `spec_base_sha`(M1 단계 0 에서 `git rev-parse HEAD` 로 기록)로 바꿨다. 세 SPEC 모두 같은 형태로 통일했다 |
| ROOM-M1 (중대) | `buildServer` 에 두 모듈을 등록하라는 요구사항이 없었다. `spec.md` 산문과 `plan.md` 단계에만 있었고, 어떤 기준도 관측하지 않았다 — 모든 테스트가 자기 인스턴스에 직접 등록하기 때문이다 | **REQ-ROOM-014** 신설(요구사항 층)과 **AC-ROOM-011** 신설(`buildServer()` 를 직접 호출해 관측). 쿠키 없이 `401` 을 단언해 "라우트가 있다"와 "진입 검사가 걸려 있다"를 한 번에 보인다 |
| ROOM-M2 (중대) | 보관은 `404`, 초대는 `403` 으로 같은 상황에 다른 코드를 쓰면서, 어느 쪽도 "방이 없다"와 "방이 보관됐다"를 구분하지 못했다. `403` 은 권한 차원이 없는 이 시스템에서 가리킬 대상이 없다 | 리드 판정에 따라 `SPEC-BOT-001` 과 **같은 편집에서 함께** 고쳤다. `404` = 대상 없음, `409` = 상태 충돌로 두 SPEC 의 규칙을 통일. 원본으로부터의 의도적 이탈이며 경위는 `plan.md` §D 7번에 기록했다 |
| ROOM-M3 (중대) | `plan.md` §D 4번이 "생성 응답도 `archived_at` 을 포함한다"고 해소했는데, REQ-ROOM-003 도 AC-ROOM-001 도 그것을 요구하지 않아 조용히 되돌아갈 수 있었다. §D 기록 자체가 "원본 테스트는 `status` 만 보므로 깨지지 않는다"고 적고 있었는데, 그것이 바로 문제였다 | REQ-ROOM-003 에 다섯 키(`id`·`name`·`status`·`created_at`·`archived_at`)를 명시하고, AC-ROOM-001 에 `Object.keys(...).sort()` 단언을 더했다 |
| ROOM-m1 (경미) | `related_specs` 는 프론트매터 스키마의 선택 필드 표에 없고, 형제 SPEC 두 개는 아예 이 필드를 쓰지 않아 셋이 서로 달랐다 | 정식 필드인 `depends_on: [SPEC-CORE-001, SPEC-AUTH-001]` 로 바꿨다. 후행 SPEC 인 `SPEC-BOT-001` 은 의존 대상이 아니므로 뺐고, 세 SPEC 모두 `depends_on` 을 쓰도록 맞췄다 |
| ROOM-m2 (경미) | AC-ROOM-003 의 `grep -c "db.transaction("` 에서 이스케이프하지 않은 `.` 이 아무 문자에나 맞아, `dbXtransaction(` 같은 문자열도 셌다 | `grep -c 'db\.transaction('` 로 고치고, 이 구조 검사가 증명하는 것과 못 하는 것을 본문에 갈라 적었다 |
| ROOM-m3 (경미) | 숫자가 아닌 방 `id` 의 동작이 엣지 케이스 표에만 있고 어떤 기준도 확인하지 않았다 | AC-ROOM-004 에 `/api/rooms/abc/archive` 케이스를 넣어 실행으로 확인한다 |
| ROOM-m4 (경미) | `declare module 'fastify'` 의 `db` 선언이 `index.ts` 에 있는데 이 SPEC 의 라우트 모듈은 다른 파일에 있어, 빌드를 나누면 깨진다 | `plan.md` §E 에 위험으로 기록. 지금 구조는 바꾸지 않는다 |

### plan-audit 2차 교정 라운드 (v0.3.0)

`.moai/reports/plan-audit/t2-3spec-audit-iter2.md` 가 이 SPEC 을 **PASS (0.88 / 기준선 0.80, 차단 0건)** 로 판정했다. 1차의 지적 8건은 모두 닫힌 것으로 확인됐고, 이번 라운드는 교정 과정에서 새로 드러난 **중대 2건만** 닫는다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| R1 (중대) | 기준 SHA 를 쓰는 범위 경계 기준의 관측 조건이 "출력이 비어 있다" 하나뿐이었다. `.spec-base-sha` 가 없으면 `$(cat …)` 이 빈 문자열이 되고 git 은 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝나는데, **표준 출력은 비어 있다** — 즉 M1 단계 0 을 건너뛴 실행이 이 기준을 통과했다. ROOM-B1 과 같은 결함이 "항상 무력"에서 "기록을 건너뛰면 무력"로 자리만 옮긴 셈이다 | AC-ROOM-009 와 Definition of Done 을 세 명령으로 나눴다. `git rev-parse --verify "$(cat …)^{commit}"` 이 **종료 코드 `0`** 으로 40자리 SHA 를 내는 것을 먼저 관측하고, 그 SHA 를 직접 넣은 `git diff` 가 **종료 코드 `0` 이면서** 비어 있는지를 본다. 빈 출력 하나만으로는 통과가 아니라고 본문·DoD·§F·§H 네 곳에 적었다 |
| R2 (중대) | AC-ROOM-011 은 `MINIDISCORD_DATA_DIR` 을 임시 디렉터리로 대입한 뒤 `buildServer()` 를 부르는데, `config.dataDir` 이 게터가 아닌 평범한 속성이라 모듈 로드 시점에 값이 굳었다. `SPEC-BOT-001` 이 `routes-bots.ts` 에 `config.js` import 를 더하는 순간(정적 import 는 테스트 본문보다 먼저 평가된다) 이 대입은 아무 효과도 내지 못하고, 이 기준은 **통과하면서 저장소의 진짜 `data/minidiscord.db` 를 열게** 될 예정이었다. 이 SPEC 자신의 §H 안티패턴을 이 SPEC 의 기준이 어기는 상태다 | `server/src/config.ts` 의 `dataDir` 을 게터로 바꿨다. **`SPEC-CORE-001` 산출물을 카드 `t2` 에서 수정한 것이며, 사유는 `AC-ROOM-011` hermetic 보장이다.** 경위·근거·영향 범위는 `plan.md` §D 8번에 기록했고, AC-ROOM-011 본문이 "환경변수를 다시 읽는 것은 게터다"라고 기제를 명시한다. `SPEC-AUTH-001` 의 AC-AUTH-014 가 같은 지연 평가에 기대므로 그쪽에서 이 항목을 참조한다 |

**남은 한계 (이번 라운드 범위 밖, 기록만).** `config.ts` 3행의 `port` 는 여전히 즉시 평가다. 이 세 SPEC 중 어느 것도 import 이후에 `MINIDISCORD_PORT` 를 바꾸지 않으므로 지금은 걸리는 기준이 없다. 뒤 카드가 포트를 테스트마다 달리 띄우려 들면 같은 결함이 재발하며, 그것은 새 버그가 아니라 `plan.md` §D 8번과 §E 에 적어 둔 알려진 한계다.

**R4 는 이 라운드에서 닫았다.** 리드가 범위를 R1·R2·R4 로 확장했다. AC-ROOM-010 전이표 1행이 도구 문구 `Cannot find module '../src/routes-rooms.js'` 를 그대로 요구해, 네 줄 아래의 "특정 문구가 아니라 원인으로 판정한다"는 규칙과 한 기준 안에서 충돌하고 있었다. 1행과 3행을 원인 서술로 고쳐 표와 주석이 같은 조건을 말하게 했다. 확장 근거: 이번이 Retry Loop 마지막 회차이고, 자기모순은 1차 감사에서 차단 6건을 만든 결함 부류와 같다 — 이월하면 run 단계에서 구현자가 두 조건 중 하나를 임의로 고르게 된다.

**이번 라운드에서 닫지 않은 것.** 2차 보고서의 R3(계획 단계 산문에 남은 RED 문구)·R5 는 경미로 분류돼 있고 리드가 의도적으로 이월했다 — **미해결**이다.

### plan-audit 3차 교정 라운드 (v0.4.0)

`.moai/reports/plan-audit/t2-3spec-audit-iter3.md` 가 이 SPEC 을 **FAIL (0.88 / 기준선 0.80, 차단 2건)** 로 판정했다. 점수는 기준선을 넘겼고, 실패 사유는 점수가 아니라 차단 결함이다. 리드 지시에 따라 이번 라운드는 **D1 하나만** 닫는다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| D1 (차단) | "이름 붙은 기존 테스트가 통과한다"를 관측 전부로 삼은 기준 세 개(AC-ROOM-001·005·006)가 명령을 `npm test -w server` 로 지정했다. 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않으므로, 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고 둘 다 종료 코드 `0` 이다. 원문 출력을 `§E.2` 에 그대로 남기는 절차적 보완도 여기서는 듣지 않는다 — 남길 출력 안에 테스트 이름 자체가 없기 때문이다 | 명령을 `npm test -w server -- --reporter=verbose` 로 바꾸고, 관측을 `✓ test/rooms-bots.test.ts > <describe 이름> > <테스트 이름>` 줄이 출력에 나타나는가 하나로 다시 썼다. AC 매트릭스 행과 Given-When-Then 본문을 함께 고쳐 둘이 어긋나지 않게 했다. `acceptance.md` 서두에 공통 조항을, `plan.md` §H 에 안티패턴을 더했다. `-t <이름>` 필터는 대안으로 쓰지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이라 같은 결함이 되살아난다 |

**감사 목록과 실제 교정 범위.** 3차 보고서가 이 SPEC 에서 지목한 대상(AC-ROOM-005·006 과 AC-ROOM-001 의 기반 테스트)과 실제 교정 범위가 일치한다 — 세 건이다.

**D2 는 닫았다 — 근거 문서를 저장소에 넣었다.** 3차 감사가 발견한 문제다: 세 SPEC 이 `plan-v2.md` 를 47회, `spec-v2.md` 를 22회 인용하며 규범으로 선언하는데, 두 파일은 주 체크아웃의 **미추적 파일로만** 존재해 `git log --all` 이 빈 출력이었고 이 워크트리에는 아예 없었다. 구현자가 근거를 읽을 수 없는 상태였다. 두 파일을 워크트리 같은 경로로 복사해 커밋했다(SHA-256 대조로 원본과 바이트 동일 확인). 주 체크아웃은 공유 자원이라 읽기만 했고 거기서 커밋하지 않았다.

**배치 문제는 plan 세션이 덧붙였다.** 감사는 `plan-v2.md` 의 부재를 지적했으나, 이 워크트리에는 초기 커밋(`edd982e`)의 **폐기된 v1** `plan.md`·`spec.md` 가 남아 있었다. 부재만 고치면 인용된 v2 옆에 이름이 비슷한 v1 이 나란히 놓여, 구현자가 v2 를 찾다 못 찾고 v1 을 집을 수 있다 — 없는 것보다 나쁜 배치다. (세 SPEC 이 v1 을 인용하는 곳은 0건임은 grep 으로 확인했다.) 리드는 이 진단을 받아들이되 **삭제 대신 표시**로 조치했다 — 위험의 실체는 v1 의 존재가 아니라 어느 쪽이 규범인지 모호한 것이므로, 한 문장으로 없앨 수 있는 위험에 운영자 자산을 지우는 비용을 치를 이유가 없다는 판단이다. 세 `acceptance.md` 서두와 세 `plan.md` §I 에 v2 만 규범이고 v1 은 참조 대상이 아님을 명시했다.

**이번 라운드에서 닫지 않은 것.** 2차 보고서의 R3·R5 도 리드가 의도적으로 이월한 항목이라 그대로 둔다 — **미해결**이다. 지연 평가되지 않는 `config.port` 잔여 한계도 그대로다 — **미해결**이다.

### 왜 쪼갰는가

카드 `t2` 의 원본 SPEC 은 인증·방·봇 등록·봇 초대를 한 문서에 담아 요구사항 33개, 수용 기준 27개가 됐다. `.claude/rules/moai/workflow/spec-workflow.md` 는 Tier M 을 16/16, Tier L 을 25/25 로 상한을 두고, 넘치면 상한을 늘리지 말고 쪼개라고 지시한다. 카드는 하나로 두고 SPEC 만 셋으로 나눴다.

| SPEC | 범위 | 요구사항 |
|------|------|----------|
| `SPEC-AUTH-001` | 인증 모듈, 가입·로그인·로그아웃, 세션 쿠키, `requireAuth` | 원본 REQ-AUTH-001..013 계열 |
| **`SPEC-ROOM-001`** (이 문서) | 방 API, 봇 등록 API | 원본 REQ-AUTH-014..024 → REQ-ROOM-001..011 로 재번호 + 범위 경계 2개 |
| `SPEC-BOT-001` | 봇 초대, 토큰 발급·철회, `sha256Hex`, 실행 명령 안내 | 원본 REQ-AUTH-025..031 계열 |

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-ROOM-001/spec.md` | GEARS 요구사항 14개 (REQ-ROOM-001..014), 범위 밖 6개 항목, 제약과 선행 SPEC 소비 목록, HISTORY 0.2.0 |
| `.moai/specs/SPEC-ROOM-001/plan.md` | 의존 순서와 SPEC 간 계약(§A), 되돌리기 어려운 결정 2건(§B HTTP 계약 / §C 트랜잭션·훅·파일 분할), 원본 모순 6건과 해결(§D), 위험 5건, 마일스톤 M1-M2, 안티패턴 8건 |
| `.moai/specs/SPEC-ROOM-001/acceptance.md` | 수용 기준 11개 (AC-ROOM-001..011), Given-When-Then 시나리오, 엣지 케이스 9건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-ROOM-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-ROOM-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

14개 REQ 전부가 하나 이상의 AC 에 매핑됐다. 매핑되지 않은 REQ 는 없다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-ROOM-001 | `registerRoomRoutes` 계약 + `requireAuth` 부착 | AC-ROOM-001, AC-ROOM-008 |
| REQ-ROOM-002 | `GET /api/rooms` 응답 형태 | AC-ROOM-001 |
| REQ-ROOM-003 | `POST /api/rooms` 생성 + 응답 다섯 키 | AC-ROOM-001 (`Object.keys` 단언 포함) |
| REQ-ROOM-004 | 빈 방 이름 400 | AC-ROOM-002 |
| REQ-ROOM-005 | 보관 = 한 트랜잭션(방 이동 + 토큰 철회) | AC-ROOM-003 (부분 — 아래 주석) |
| REQ-ROOM-006 | 없는 방 `404` / 이미 보관된 방 `409`, 본문으로 구분 | AC-ROOM-004 |
| REQ-ROOM-007 | `onArchive` 훅 1회 호출 | AC-ROOM-005 |
| REQ-ROOM-008 | `registerBotRoutes` 계약 + `requireAuth` 부착 | AC-ROOM-006, AC-ROOM-008 |
| REQ-ROOM-009 | `POST /api/bots` 생성 | AC-ROOM-006 |
| REQ-ROOM-010 | 중복 409 / 공백 400 | AC-ROOM-007 |
| REQ-ROOM-011 | `GET /api/bots` 목록 | AC-ROOM-006 |
| REQ-ROOM-012 | `server/src` 여섯 파일 | AC-ROOM-009 |
| REQ-ROOM-013 | `SCHEMA` 불변 | AC-ROOM-009 (`spec_base_sha` 기준 diff — 기준 SHA 확인과 diff 둘 다 종료 코드 `0` 관측) |
| REQ-ROOM-014 | `buildServer` 가 두 라우트 모듈을 등록 | AC-ROOM-011 (`config.dataDir` 게터에 의존 — `plan.md` §D 8번) |
| (전 구간) | RED→GREEN 전이 증거 | AC-ROOM-010 |

**REQ-ROOM-005 의 부분 검증 주석.** 이 요구사항은 두 가지를 요구하고, 이 SPEC 시점에 실행으로 관측할 수 있는 것은 하나뿐이다.

- 관측 가능 — 방이 `archived` 목록으로 이동하고 `archived_at` 이 채워진다. AC-ROOM-003 의 테스트가 확인한다.
- 구조로만 확인 — 두 UPDATE 가 `db.transaction()` 하나에 묶여 있다. AC-ROOM-003 의 `grep -c` 가 확인한다.
- **이 SPEC 에서 미검증** — 활성 토큰이 실제로 철회되는 동작. 토큰을 만들려면 초대 API 가 필요하고 그것은 `SPEC-BOT-001` 의 산출물이다. 해당 검증은 `SPEC-BOT-001` 의 수용 기준이 맡는다.

**v0.4.0 (3차 교정) — 관측 형태만 바뀌었다.** 위 매핑은 그대로다. 요구사항도 수용 기준도 하나 늘거나 줄지 않았다. 바뀐 것은 세 개 기준(AC-ROOM-001·005·006)이 **무엇을 보고 판정하는가**다 — `npm test -w server` 의 요약 줄과 종료 코드가 아니라, `npm test -w server -- --reporter=verbose` 출력의 `✓ test/rooms-bots.test.ts > <describe 이름> > <테스트 이름>` 줄이다. 이 기준들이 덮는 REQ-ROOM-001·002·003·007·008·009·011 의 검증 강도가 그만큼 올라간다.

### 이 단계에서 하지 않은 것 (Gaps)

- 이 SPEC 의 산출물 코드는 한 줄도 작성하지 않았다. `server/src/routes-rooms.ts`, `server/src/routes-bots.ts`, `server/test/rooms-bots.test.ts` 모두 미생성 — run 단계 소관이다. **예외 한 건**: v0.3.0 교정 라운드에서 `server/src/config.ts` 의 `dataDir` 이 게터로 바뀌었다(R2, `plan.md` §D 8번). `SPEC-CORE-001` 산출물이며 이 SPEC 의 산출물이 아니다.
- `server/src/index.ts` 의 `buildServer` 에 라우트 등록 두 줄을 더하는 작업도 하지 않았다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. 전부 run 단계에서 처음 실행된다. `npm test -w server` 가 현재 몇 개 통과하는지 이 세션에서 관측하지 않았다 — **미검증**이다.
- `SPEC-AUTH-001` 의 산출물이 실제로 존재하는지 확인하지 않았다. 이 세션과 동시에 다른 에이전트가 그 문서를 쓰는 중이라 읽지 않았고, 코드는 아직 어느 쪽도 만들지 않았다. §A 의 소비 목록은 원본 `plan-v2.md` Task 3-4 의 인터페이스 명세에서 도출한 것이지 실물 확인이 아니다 — **미검증**.
- ~~`SPEC-BOT-001` 의 문서도 읽지 않았다~~ — **v0.2.0 교정 라운드에서 해소됨.** plan-audit 이 두 문서를 대조했고, 이번 라운드에서 세 SPEC 을 한 세션이 함께 들고 고쳤다. 그 대조에서 드러난 것이 §B 의 404/403 비대칭(실제로는 두 문서가 서로 모순되지는 않았고, 원본 계약 자체가 결함이었다 — §D 7번)과 `SPEC-BOT-001` 의 `build()` 헬퍼 출처 오기다. `sha256Hex` 이관은 양쪽이 같은 결론에 이르러 있어 문제가 없었다.
- `SPEC-AUTH-001` 의 산출물이 실제로 존재하는지는 여전히 **미검증**이다. 코드는 세 SPEC 어느 쪽도 아직 한 줄도 만들지 않았고, §A 의 소비 목록은 문서 대조로 확인한 것이지 실행으로 확인한 것이 아니다.
- 원본 `plan-v2.md` Task 5 이후(초대·메시지·SSE·게이트웨이)는 경계 확인에 필요한 만큼만 읽었다.

---

## §E.2 Run-phase Evidence

### 사전 확인 (pre-flight, HEAD `bca6067b7d76cdf3eb196d1a4326fba3f4f54962`)

```
$ git branch --show-current && git rev-parse HEAD
WT-auth-room-bot
bca6067b7d76cdf3eb196d1a4326fba3f4f54962

$ npm test -w server
 Test Files  4 passed (4)
      Tests  16 passed (16)
EXIT=0

$ npm run typecheck -w server
> typecheck
> tsc --noEmit
EXIT=0

$ ls server/src
auth.ts
config.ts
db.ts
index.ts

$ cat .moai/specs/SPEC-ROOM-001/.spec-base-sha
bca6067b7d76cdf3eb196d1a4326fba3f4f54962
```

### M1 — 방 API

**전이 1 (RED)** — `server/test/rooms-bots.test.ts` 작성 직후, 구현 이전. 실패 원인이 출력에서 확인됨: `routes-rooms.js` 모듈 부재.

```
$ npm test -w server
 FAIL  test/rooms-bots.test.ts [ test/rooms-bots.test.ts ]
Error: Cannot find module '../src/routes-rooms.js' imported from /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t2/server/test/rooms-bots.test.ts
 ❯ test/rooms-bots.test.ts:9:1

 Test Files  1 failed | 4 passed (5)
      Tests  16 passed (16)
EXIT=1
```

**전이 2 (GREEN)** — `routes-rooms.ts` 구현 + `buildServer` 등록 후.

```
$ npm test -w server
 Test Files  5 passed (5)
      Tests  24 passed (24)
EXIT=0

$ npm run typecheck -w server
> typecheck
> tsc --noEmit
EXIT=0

$ grep -c 'db\.transaction(' server/src/routes-rooms.ts
1
```

이름 붙은 테스트 관측 (AC-ROOM-001·005 판정 근거). 아래는 `npm test -w server -- --reporter=verbose` 실행(M1 GREEN 시점, 총 24 passed / EXIT=0) 출력에서 `rooms-bots.test.ts` 줄만 발췌한 것이다 — 실행마다 소요 시간(ms)은 달라지므로 생략했다:

```
 ✓ test/rooms-bots.test.ts > rooms > creates and lists rooms
 ✓ test/rooms-bots.test.ts > rooms > archives a room and moves it to archived list
 ✓ test/rooms-bots.test.ts > rooms > calls onArchive hook when provided
 ✓ test/rooms-bots.test.ts > rooms > requires auth
 ✓ test/rooms-bots.test.ts > rooms > rejects a blank room name
 ✓ test/rooms-bots.test.ts > rooms > archiving moves the room and stamps archived_at
 ✓ test/rooms-bots.test.ts > rooms > archiving distinguishes a missing room (404) from an archived one (409)
 ✓ test/rooms-bots.test.ts > rooms > every room and bot route requires a session
```

**이탈 기록 (환경 적응, AUTH 와 같은 부류).** light-my-request 가 이 환경에서 `headers['set-cookie']` 을 배열이 아니라 **문자열 하나**로 돌려주므로, 원본 테스트의 `['set-cookie']![0]` 인덱싱은 그대로 쓰면 항상 `undefined` 에서 죽는다. `auth.test.ts` 의 `setCookieOf()` 헬퍼를 이 파일에 다시 선언해 `build()` 와 AC-ROOM-011 의 쿠키 추출을 정규화했다. 모든 테스트 이름과 단언은 acceptance.md 그대로다.

**AC-ROOM-003 토큰 철회 절반 — 이 SPEC 에서 미검증.** 활성 토큰이 실제로 죽는지는 이 SPEC 에 토큰 발급 경로가 없어 실행으로 관측할 수 없다. 이 문서의 근거는 구조 절반(`grep -c 'db\.transaction('` → `1`)과 관측 절반(방 이동·`archived_at`·활성 토큰 수 0)뿐이다. 동작 검증은 `SPEC-BOT-001` 의 AC-BOT-008 이 맡는다.

### M2 — 봇 등록 API

**전이 3 (RED)** — `describe('bots', …)` 추가 + `build()` 에 `registerBotRoutes` 배선 직후, 구현 이전. 실패 원인이 출력에서 확인됨: `routes-bots.js` 모듈 부재.

```
$ npm test -w server
 FAIL  test/rooms-bots.test.ts [ test/rooms-bots.test.ts ]
Error: Cannot find module '../src/routes-bots.js' imported from /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t2/server/test/rooms-bots.test.ts
 ❯ test/rooms-bots.test.ts:10:1

 Test Files  1 failed | 4 passed (5)
      Tests  16 passed (16)
EXIT=1
```

**전이 4 (GREEN)** — `routes-bots.ts` 구현 + `buildServer` 등록 후, 최종 트리 기준.

```
$ npm test -w server
 Test Files  5 passed (5)
      Tests  27 passed (27)
EXIT=0
```

이름 붙은 테스트 관측 (AC-ROOM-006 판정 근거). 최종 트리에서 `npm test -w server -- --reporter=verbose`(총 27 passed / EXIT=0) 실행 출력의 `rooms-bots.test.ts` 줄 발췌:

```
 ✓ test/rooms-bots.test.ts > rooms > creates and lists rooms
 ✓ test/rooms-bots.test.ts > rooms > archives a room and moves it to archived list
 ✓ test/rooms-bots.test.ts > rooms > calls onArchive hook when provided
 ✓ test/rooms-bots.test.ts > rooms > requires auth
 ✓ test/rooms-bots.test.ts > rooms > rejects a blank room name
 ✓ test/rooms-bots.test.ts > rooms > archiving moves the room and stamps archived_at
 ✓ test/rooms-bots.test.ts > rooms > archiving distinguishes a missing room (404) from an archived one (409)
 ✓ test/rooms-bots.test.ts > rooms > every room and bot route requires a session
 ✓ test/rooms-bots.test.ts > bots > registers and lists bots
 ✓ test/rooms-bots.test.ts > bots > rejects duplicate and blank bot names
 ✓ test/rooms-bots.test.ts > buildServer registers room and bot routes behind requireAuth
```

**AC-ROOM-009 범위 경계 (M2 단계 6, 최종 트리 기준):**

```
$ ls server/src
auth.ts
config.ts
db.ts
index.ts
routes-bots.ts
routes-rooms.ts

$ git rev-parse --verify "$(cat .moai/specs/SPEC-ROOM-001/.spec-base-sha)^{commit}"
bca6067b7d76cdf3eb196d1a4326fba3f4f54962
(EXIT=0)

$ git diff --stat bca6067b7d76cdf3eb196d1a4326fba3f4f54962 -- server/src/db.ts
(EXIT=0, 출력 없음)
```

**경계 grep (AC-ROOM-009 / E4):**

```
$ grep -c "sha256Hex" server/src/routes-bots.ts
0
$ grep -c "invites" server/src/routes-bots.ts
0
$ grep -c 'db\.transaction(' server/src/routes-rooms.ts
1
```

**커버리지 시도 (E3) — 미검증.** `@vitest/coverage-v8` 이 없어 설치가 금지돼 있으므로 커버리지 수치를 잴 수 없다. 원문 오류:

```
$ npm test -w server -- --coverage
 MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'
EXIT=1
```

보상 관측 — 어떤 테스트가 어느 내보낸 라우트를 덮는지: `creates and lists rooms`·`requires auth`·`every room and bot route requires a session`(GET/POST `/api/rooms`), `rejects a blank room name`(POST `/api/rooms` 400), `archiving moves…`·`archiving distinguishes…`·`archives a room…`·`calls onArchive hook…`(POST `/api/rooms/:id/archive` 200/409/404/훅), `registers and lists bots`·`rejects duplicate and blank bot names`(GET/POST `/api/bots`), `buildServer registers…`(buildServer 조립 + 인증 경계). 다섯 경로 전부가 성공 경로와 최소 하나의 실패 경로를 갖는다.

**M2 중 커밋 전 수정 한 건.** @MX 주석이 형제 계약 서술에 `sha256Hex` 라는 이름을 그대로 써 `grep -c "sha256Hex" server/src/routes-bots.ts` 가 `1` 이 나왔다. 주석을 "초대 라우트·토큰 해시"로 다시 써 `0` 을 만들었다. 코드 동작 변화 없음(주석만 수정, 수정 후 전체 스위트 27/27 재확인).



---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-26
spec_id: SPEC-ROOM-001
cycle_type: tdd
milestones: "M1 room API + M2 bot registry API — 2 커밋 (워크트리 WT-auth-room-bot)"
ac_total: 11
ac_pass: 11
ac_fail: 0
test_files: 5
tests: 27
typecheck: "exit 0 (최종 트리)"
```

### §E 행렬 요약 (E1-E8)

| 항목 | 판정 | 근거 (원문 출력은 §E.2) |
|------|------|------------------------|
| E1 AC-ROOM-001..011 | 11/11 PASS | 001·005·006 은 verbose `✓` 줄, 나머지는 명령 출력 — 아래 AC 표 |
| E2 typecheck | PASS | `npm run typecheck -w server` exit 0 (최종 트리) |
| E3 coverage | GAP | `@vitest/coverage-v8` 부재, 설치 금지 — 오류 원문 §E.2, 보상 관측(테스트↔라우트 매핑)으로 대체 |
| E4 경계 grep | PASS | sha256Hex 0 / invites 0 / db\.transaction( 1 — §E.2 |
| E5 lint | PASS | typecheck 가 lint 면이며 신규 0건 (tsc --noEmit exit 0) |
| E6 커밋 | PASS | 2 커밋 M1·M2, 명시적 pathspec, 미푸시 — SHA 는 git log 참조 |
| E7 차단 보고 | 없음 | 요구되지 않은 사용자 결정 없음 |
| E8 RED 증거 | PASS | 네 전이 순서대로 관측 (§E.2 — AC-ROOM-010) |

### AC 판정표 (E1)

| AC | 판정 | 판정 근거 |
|----|------|-----------|
| AC-ROOM-001 | PASS | `✓ test/rooms-bots.test.ts > rooms > creates and lists rooms` 줄 관측 + `Object.keys(...).sort()` 다섯 키 단언 통과 (201·`status: 'active'` 포함) |
| AC-ROOM-002 | PASS | `rejects a blank room name` — 400 |
| AC-ROOM-003 | PASS | 방 `archived` 이동 + `archived_at` 충족 + `grep -c 'db\.transaction('` → `1`. 토큰 철회 동작 절반은 미검증(SPEC-BOT-001 AC-BOT-008 위임, §E.2 기록) |
| AC-ROOM-004 | PASS | 409 / 404 / 숫자 아님 404 / 두 본문 상이 — 전부 단언 통과 |
| AC-ROOM-005 | PASS | `✓ test/rooms-bots.test.ts > rooms > calls onArchive hook when provided` 줄 관측 (calls 배열 `[방 id]`) |
| AC-ROOM-006 | PASS | `✓ test/rooms-bots.test.ts > bots > registers and lists bots` 줄 관측 (목록 `[{ id, name, description }]` 일치 — 페르소나 필드 없음) |
| AC-ROOM-007 | PASS | 중복 409 / 공백 400 |
| AC-ROOM-008 | PASS | 다섯 경로 전부 무쿠키 401 (최종 트리 — M2 가 봇 경로 둘을 추가한 뒤) |
| AC-ROOM-009 | PASS | `ls server/src` 정확히 6 파일 + `git rev-parse --verify` exit 0 SHA 출력 + `git diff --stat <SHA> -- db.ts` exit 0·빈 출력 |
| AC-ROOM-010 | PASS | 네 전이 순서 관측 — 전이 1(RED, routes-rooms.js 부재) → 2(GREEN) → 3(RED, routes-bots.js 부재) → 4(GREEN), 원문은 §E.2 |
| AC-ROOM-011 | PASS | `buildServer registers room and bot routes behind requireAuth` — 무쿠키 401(등록+진입검사 증명), 로그인 후 rooms·bots 200 |

**잔여 한계(기록).** 커버리지 수치 미측정(E3). `bots` INSERT 의 try/catch 가 UNIQUE 위반 외 DB 오류도 409 로 분류(plan.md §E 수용 항목). `config.port` 즉시 평가 한계는 이 SPEC 범위 밖 기록 유지.


---

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-27
sync_commit_sha: "41e36e5894736c8cae9705451a8b9dd571c45f80"
spec_id: SPEC-ROOM-001
card: t2
worktree: .claude/worktrees/t2 (WT-auth-room-bot)
head_at_sync_evidence: "3bc0387"
sync_session: 05a46860-5a2b-4779-bb63-a879ff273531
lens: "--security --deep"
docs_updated: [README.md, CHANGELOG.md]
status_transition: "in-progress → implemented → completed (단일 sync 커밋)"
```

### Claim (주장)

SPEC-ROOM-001 의 방 API 와 봇 등록 API 가 sync 세션의 **독립 재실행**으로 확인되었고, 보관 트랜잭션과 라우트 가드에 대한 보안 렌즈 검토에서 차단 사항이 나오지 않았다. 문서(README·CHANGELOG)가 현재 코드 상태를 반영한다.

### Evidence (증거)

sync 세션이 run 세션 보고를 인용하지 않고 직접 실행해 관측했다.

```
$ npm test -w server -- --reporter=verbose
 ✓ test/rooms-bots.test.ts > rooms > creates and lists rooms 105ms
 ✓ test/rooms-bots.test.ts > rooms > archives a room and moves it to archived list 46ms
 ✓ test/rooms-bots.test.ts > rooms > calls onArchive hook when provided 45ms
 ✓ test/rooms-bots.test.ts > rooms > requires auth 44ms
 ✓ test/rooms-bots.test.ts > rooms > rejects a blank room name 45ms
 ✓ test/rooms-bots.test.ts > rooms > archiving moves the room and stamps archived_at 47ms
 ✓ test/rooms-bots.test.ts > rooms > archiving distinguishes a missing room (404) from an archived one (409) 44ms
 ✓ test/rooms-bots.test.ts > rooms > every room and bot route requires a session 45ms
 ✓ test/rooms-bots.test.ts > bots > registers and lists bots 43ms
 ✓ test/rooms-bots.test.ts > bots > rejects duplicate and blank bot names 43ms
 ✓ test/rooms-bots.test.ts > buildServer registers room and bot routes behind requireAuth 47ms
 Test Files  5 passed (5)
      Tests  37 passed (37)
exit=0
```

```
$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

원문 로그: `.moai/state/verify/sync-t2/full.log`, `.moai/state/verify/sync-t2/typecheck.log`.

**보안 렌즈 관측 2건**:

1. **방·봇 라우트 5개가 전부 진입 검사 뒤에 있다** — `grep -c 'preHandler: \[requireAuth\]' server/src/routes-rooms.ts` → `3`, 같은 명령을 `routes-bots.ts` 에 → `5`. `grep -rn "app\.\(get\|post\|...\)("` 전수 출력에서 가드 없는 라우트는 `/api/health` 와 `/api/auth/*` 넷뿐이고, 방·봇 경로는 하나도 그 목록에 없다. AC-ROOM-008 의 런타임 401 단언과 정적 관측이 일치한다.
2. **보관 트랜잭션이 실패 경로에서 아무것도 쓰지 않는다** — `routes-rooms.ts:38-50` 의 `db.transaction()` 이 방을 먼저 조회해 `missing`/`conflict`/`ok` 로 갈라, 앞 둘에서는 두 `UPDATE` 를 실행조차 하지 않는다. `onArchive` 훅은 트랜잭션 반환 **이후**에만 불린다 — 훅 예외가 확정된 보관을 되돌리지 못한다.

### Baseline-attribution (baseline 귀속)

- 측정 대상 트리: `.claude/worktrees/t2`, `git rev-parse --short HEAD` → `3bc0387`, 브랜치 `WT-auth-room-bot`.
- 두 명령 모두 이 트리에서 이 sync 세션이 실행했으며, run 세션이나 리드 디스패치의 수치를 옮겨 적지 않았다.

### Gaps (미검증)

- **커버리지 수치** — `@vitest/coverage-v8` 미설치, 설치 금지. §E.3 E3 의 이월 항목 그대로다.
- **실제 프로세스 기동 후 수동 확인** — 관측 범위는 `buildServer()` + `inject` 까지다.
- **동시 보관 요청** — 같은 방에 대한 두 보관 요청이 겹칠 때의 동작은 관측하지 않았다. SQLite 트랜잭션이 직렬화하므로 이론적으로는 두 번째가 `409` 이나, 실측하지 않았다.

### Residual-risk (잔여 위험)

- **봇 등록의 `409` 오분류 여지** — `routes-bots.ts:38-43` 의 `catch` 가 `UNIQUE` 위반 외 DB 오류(디스크 가득 참, 잠금 시간 초과 등)도 "이미 있는 봇 이름입니다" `409` 로 바꾼다. `bots` 표에 다른 제약이 없다는 근거로 plan.md §E 가 수용한 항목이다. 표에 제약이 추가되면 이 판단이 무효가 된다.
- **인증만 있고 인가는 없다** — 로그인한 사용자는 누구나 어떤 방이든 보관할 수 있고 어떤 봇이든 등록할 수 있다. 단일 사용자 로컬 전제에서는 의도된 범위이며 README 에 명시했다.
- **`Number(id)` 처리** — 숫자가 아닌 방 id 는 `Number.isInteger` 검사에서 `404` 로 떨어진다. 소수점 id(`1.5`)도 같은 `404` 다 — 의도된 동작이며 AC-ROOM-004 가 관측한다.
- `config.port` 즉시 평가 한계 — 이 SPEC 범위 밖 기록 유지.

---

## §F Phase 4 Mode Selection

**입력 변수** — tier: M · 스코프: 4개 파일(`routes-rooms.ts`·`routes-bots.ts` 신규, `rooms-bots.test.ts` 신규, `index.ts` 등록 두 줄) + progress.md 증거 · 도메인 수: 1(서버 방·봇 API) · 언어 조합: TypeScript 단일 · 동시성 이득: 낮음(코딩 중심, M1→M2 순서 의존 — M2 테스트가 M1의 `build()` 헬퍼를 씀) · Agent Teams 전제: 명시 요구 없음

| 모드 | 선택 | 근거 |
|------|------|------|
| direct | 아니오 | 두 마일스톤·세 파일 신규 작성 |
| serial | **선택** | 코딩 중심 + 마일스톤 간 순서 의존(M2가 M1 산출물 소비) |
| fanout | 아니오 | 단일 도메인·연구 아님 — RED→GREEN→커밋이 두 번 순차로 이어짐 |
| sweep | 아니오 | 파일 수 적음·순차 의존적 신규 코드 |

**Decision: serial**

**근거**: M1(방)과 M2(봇 등록)가 강하게 순서 의존적이고(M2의 테스트가 M1의 `{ app, cookie }` build() 헬퍼를 사용) 같은 파일(`rooms-bots.test.ts`, `index.ts`)을 이어 쓰므로 병렬화 이득이 없다. Implementation Kickoff Approval은 리드 디스패치(카드 t2, 2026-08-26)로 완료.

**depends_on 처분 기록**: `SPEC-CORE-001` completed(충족). `SPEC-AUTH-001` 라벨은 `in-progress`이나 진입 조건의 실질(산출물 존재)은 run 세션 오케스트레이터가 bca6067에서 직접 관측 — `server/src/auth.ts` 존재, `index.ts`에 `app.db`·쿠키 등록·`registerAuthRoutes(app, app.db)` 배선 확인, `npm test -w server` 16/16 통과·exit 0, typecheck exit 0. 라벨의 `implemented` 전이는 카드 t2의 sync 단계에서 세 SPEC과 함께 일어난다. 리드 디스패치가 세 SPEC 순차 run을 명시적으로 지시했으므로 이 순서로 진행한다.

**Phase 1 (Plan Audit Gate) 처리 기록**: plan-audit 사이클 3회 상한 도달(0.74 → 0.88 PASS → 0.88 FAIL·차단 2건, 3차 D1은 v0.4.0으로 교정, D2는 원본 반입으로 실질 해소). 이후 진행은 리드가 Implementation Kickoff Approval과 함께 오버라이드 — run 세션에서 4차 재감사 없음(상한 계약 위반).
