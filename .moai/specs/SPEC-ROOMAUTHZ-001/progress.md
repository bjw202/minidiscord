# SPEC-ROOMAUTHZ-001 진행 기록

칸반 카드 `t11` / 워크트리 `.claude/worktrees/t11` / 브랜치 `WT-room-authz`

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_round: 3            # 2차 감사 FAIL 0.84 (.moai/reports/t11/plan-audit-2.md) 반영본 — 1차는 FAIL 0.75
plan_complete_at: 2026-08-29
tier: M
requirements: 17         # REQ-ROOMAUTHZ-001..017 — Tier M 상한 16 초과 (리드 승인: spec.md §5 머리말)
acceptance_criteria: 18  # AC-ROOMAUTHZ-001..018 — Tier M 상한 16 초과 (같은 승인)
tier_ceiling_exceeded: true
tier_ceiling_waiver: lead-approved   # 2026-08-29 리드 결정 — tier M 유지, 기준선 0.80 (2차 감사 N-06)
artifacts: [spec.md, plan.md, acceptance.md, progress.md]
open_questions: 0        # 설계 결정 3건은 운영자가 확정 (spec.md §3), D2 는 v2 로 확대 확정
```

**플랜 단계에서 확정된 것**

- 발단: `.moai/reports/t4/sync-audit.md` §F-14 (High, out-of-diff). 코드베이스에 방 멤버십 개념이 없어 계정 하나로 남의 방 도구 승인을 대신 누를 수 있다.
- 운영자 결정 3건(획득 방식 · 게이트 범위 · 기존 데이터)은 `spec.md` §3 에 기각안과 함께 부호화했다. 재검토 대상이 아니다.
- **D2 는 v2 로 확대됐다** (2026-08-29, 1차 감사 F-01 을 읽은 뒤 운영자 확정). 봇 초대 라우트 셋(`POST`·`GET`·`DELETE /api/rooms/:id/invites*`)이 이 카드 안에서 게이트 범위에 들어온다. 원인은 그 라우트가 평문 봇 토큰을 발급하고 그 토큰이 게이트웨이 `history_request` 로 방 대화 전체를 넘겨받는다는 관측이다 — 읽기를 막으면서 같은 크기의 문을 남기는 셈이었다. v1 원문은 지우지 않고 `spec.md` §3 에 남겼다.
- 그 확대로 REQ-ROOMAUTHZ-017 과 AC-ROOMAUTHZ-018 이, 감사 F-06(REQ-007 미커버) 대응으로 AC-ROOMAUTHZ-017 이 생겼다. **Tier M 상한(16/16)을 넘겼고, 압축 대신 초과를 명시했다** — 요구사항을 합쳐 상한을 맞추면 측정되지 않는 절반이 생긴다.
- **상한 초과는 리드가 승인했다** (2026-08-29, 2차 감사 N-06). 티어 상향도 SPEC 분할도 아니라 «이 카드에 한한 명시적 초과 승인»이며, 기준선은 `0.80` 을 유지한다. 결정 원문은 `spec.md` §5 머리말에 있다. 더 이상 리드 판정 대기 항목이 아니다.
- **2차 감사(FAIL 0.84)가 잡은 새 결함 일곱(N-01..N-07)을 3차에 반영했다.** 가장 큰 것은 N-01 — D2 v2 확대가 이 SPEC 이 1차에 써 넣은 형제 주석 두 자리를 정반대의 거짓으로 만들었는데 §6 표는 그것이 정정됐다고 적고 있었다. 3차에 2차 개정 주석을 덧붙였고, 같은 기준으로 형제 주석 전건을 다시 훑어 하나(N-04)를 더 찾았다. 완료 정의에 **§6 표 ↔ 대상 파일 양방향 대조**를 더해, 「주석이 존재한다」가 아니라 「주석이 참이다」를 판정하도록 고쳤다.
- 형제 문서 25개 자리의 진술이 거짓이 된다 (`spec.md` §6 표 — 1차 감사가 잡은 누락 둘과 선택 등급 셋을 더해 19 → 25). 전제가 무효화되는 수용 기준 둘(AC-MSG-012 · AC-PERM-009)은 이름을 불러 기록했다.
- 기존 테스트 34개가 깨질 것으로 열거했다 (`plan.md` §D). **이 숫자는 D2 v2 이후 처음부터 다시 세었고 결과가 같았다** — 초대 라우트를 부르는 기존 테스트 11건은 전부 방을 `POST /api/rooms` 로 만들고 그 생성자가 호출자라 게이트를 통과한다(`plan.md` §D.0.1). run 단계는 이 목록 밖의 실패만 결함으로 본다.

**플랜 단계에서 관측한 것 (실행)**

- `npm test` → 서버 104개 · 채널 70개 전건 통과. 워크트리에 의존성이 설치돼 실행이 가능해졌다.
- `npx vitest run --reporter=verbose` → `✓` 줄 104 줄. 파일별 테스트 이름 목록을 실제로 받아 §D 의 분모로 썼다.
- 증거 파일: `.moai/state/verify/t11-plan2/npm-test-baseline.txt`, `.moai/state/verify/t11-plan2/server-verbose.txt`

**플랜 단계에서 관측하지 못한 것 (미검증)**

- **34개 목록의 「깨진다」는 소스 판독이다.** 게이트가 아직 구현되지 않아 실행으로 확인할 수 없다. 위 실행이 확정한 것은 분모(현재 초록 104개)뿐이며 분자는 아니다. M4 단계 1이 실제 실패 목록을 받아 대조한다.
- 백필·`ALTER TABLE` 동작은 SQLite 문서와 현재 `db.ts` 구조를 근거로 설계했으며, 실행해 보지 않았다.
- 새로 쓴 수용 기준(AC-004 트랜잭션 트리거, AC-008 업로드 디렉터리, AC-010 `buildServer` 판, AC-017 게이트 훑기, AC-018 초대 라우트)의 **코드가 실제로 컴파일·실행되는지 확인하지 않았다.** 구현 대상이 아직 없으므로 M1~M3 의 RED 단계가 첫 확인이다.
- REQ-ROOMAUTHZ-003 의 백필 트랜잭션은 어느 기준도 재지 않는다 — `spec.md` §9 에 미검증으로 적었다.

**run 단계 기록 — spec_base_sha** (plan.md §F M1-0): `018e7db41697cfa9062f3512df4ff8a10820028a` — `.moai/specs/SPEC-ROOMAUTHZ-001/.spec-base-sha` 파일과 같은 값. `git rev-parse HEAD | tee .moai/specs/SPEC-ROOMAUTHZ-001/.spec-base-sha` 로 기록(종료 코드 0 직접 관측).

## §E.2 Run-phase Evidence

### M1 — 스키마와 이행 (2026-08-29)

기준: HEAD `018e7db41697cfa9062f3512df4ff8a10820028a` (브랜치 `WT-room-authz`) — `.spec-base-sha` 와 같은 값.

**구현 에이전트의 RED 관측 (db.ts 변경 전, 에이전트가 실행해 원문 인용 — 레인 재현 아님):**

```
 FAIL  test/room-members.test.ts > ... > schema carries room_members with a composite key and rooms.created_by
AssertionError: expected [ 'id', 'name', 'status', …(2) ] to include 'created_by'
 FAIL  test/room-members.test.ts > ... > adds created_by to an already-existing rooms table without losing rows
AssertionError: expected [ 'id', 'name', 'status', …(2) ] to include 'created_by'
 FAIL  test/room-members.test.ts > ... > backfills every room x user exactly once and never resurrects removed rows
SqliteError: no such table: schema_migrations
 Test Files  1 failed | 10 passed (11)
      Tests  3 failed | 104 passed (107)
```

실패 양상 분류(에이전트 보고 인용): 단언 실패 2건 + SQL 오류 1건(`no such table: schema_migrations` — 표의 존재 자체가 피검 대상이므로 유효한 RED). 모듈 부재·import 실패 없음, 기존 104건은 RED 동안에도 전부 초록.

**레인 독립 재실행 (구현 후 — 아래 전부 이 세션이 직접 관측):**

- `npm test -w server -- --reporter=verbose` → 종료 코드 **0**, `Tests  107 passed (107)` (기존 104 + 신규 3). 신규 3건 이름 단위 `✓` 직접 관측: `schema carries room_members…` / `adds created_by to an already-existing rooms table…` / `backfills every room x user exactly once…`. 원문: `.moai/state/verify/t11-run1/m1-green-verbose.txt`
- `npm run typecheck -w server` → 종료 코드 **0**. 원문: `.moai/state/verify/t11-run1/m1-typecheck.txt`
- 변경 범위: `git status --porcelain -- server/` → ` M server/src/db.ts` / `?? server/test/room-members.test.ts` — 정확히 2파일 (+38줄).

**수용 기준**: AC-ROOMAUTHZ-001·002·003 PASS (verbose 이름 단위 3건). db.ts diff 를 레인이 직독해 §A 구속 결정 준수 확인 — 복합 PK 표·PRAGMA 가드 ALTER(NULL 허용)·표식 선행 검사+단일 트랜잭션 백필·D3 범위(rooms×users).

**미검증 (명시):**

- RED 원문은 구현 에이전트의 관측 인용이다 — 레인이 독립 재현하지 않았다(구현 전 상태가 이미 지나감).
- 기존 104건은 개별 이름 판정이 아니라 총계(107/107, 0 실패)로 판정했다.
- AC-003 의 «부분 실패 시 표식 롤백» 방향은 단일 트랜잭션 구조에서 도출한 것이지 별도 장애 주입 관측이 아니다 — 그 시나리오 부류는 AC-004 트리거 롤백(M2)의 몫이다.
- acceptance.md 공통 하네스 전체는 `routes-events` 모듈이 M3 에서 생기므로 M1 에 넣으면 import 실패가 난다 — M1 은 세 기준이 쓰는 부분집합만 심었다(구현 에이전트 편차 #1, 리드 보고 포함). 나머지 하네스는 각 AC 의 첫 소비 시점에 단계적으로 심는다(`routes-events` import 는 M3 이후 가능).

### M2 — 술어와 멤버십 획득 (2026-08-29)

기준: HEAD `9b0e619` (M1 착지 후). RED 는 구현 에이전트 관측 원문 인용, GREEN 은 레인 독립 재실행.

**구현 에이전트의 RED 관측 (room-members.ts·routes-rooms.ts 변경 전):** `Tests  6 failed | 107 passed (113)` — 6건 전부 **단언 실패**(bare import failure 0). 주요 양상: `created_by` null(생성자 기록 부재), 트리거 시나리오 `expected 201 not to be 201`(트랜잭션 원자성 부재), `Route POST:/api/rooms/1/members not found`(초대 라우트 부재), `memberCount = 0`(자동 가입 부재).

**레인 독립 재실행 (구현 후 — 직접 관측):**

- `npm test -w server -- --reporter=verbose` → 종료 코드 **0**, `Tests  113 passed (113)` (107 + 신규 6). 신규 6건 이름 단위 `✓` 직접 관측(describe `room membership acquisition` 하위). 원문: `.moai/state/verify/t11-run1/m2-green-verbose.txt`
- `npm run typecheck -w server` → 종료 코드 **0**. 원문: `.moai/state/verify/t11-run1/m2-typecheck.txt`
- 변경 범위: `git status --porcelain -- server/` → `M routes-rooms.ts` / `M room-members.test.ts` / `?? room-members.ts` — 정확히 3파일.

**되돌림 시나리오(AC-004 두번째) 프로브 (구현 에이전트 관측, tsx 일회성·실행 후 삭제):** 트리거 강제 실패 시 `statusCode = 500 | rooms count = 0 | body = {"statusCode":500,"code":"SQLITE_CONSTRAINT_TRIGGER",...}` / 정상 경로 `201 | member rows = 1`. 2차 감사 재현치(500+롤백, 방 행 무잔존)와 일치.

**구현 모양 (레인 직독 확인):** `room-members.ts` — `isRoomMember` 은 `room_members` 만 읽는다(created_by 미사용, §A). `requireRoomMember` 는 requireAuth 뒤 preHandler 로 비멤버·없는 방·비정수 id 를 같은 `404`+같은 본문으로 통일(REQ-ROOMAUTHZ-013) — M3 의 여덟 게이트가 재사용하는 형태. `@MX:ANCHOR [AUTO]`+`@MX:REASON`, `@MX:NOTE` 비치.

**수용 기준**: AC-ROOMAUTHZ-004(양 시나리오)·005·006(양 시나리오)·007 PASS.

**미검증 (명시):**

- RED 원문과 롤백 프로브는 구현 에이전트 관측 인용이다 — 레인이 재현하지 않았다(AC-004-2 테스트 자체가 레인 verbose 실행에서 통과 관측됨).
- 커버리지 수치 미측정(이 마일스톤 지시 항목 아님).
- 트리거 강제 롤백은 «삽입 실패 시 되돌아감» 한 관점만 잰다 — acceptance.md 가 명시한 관측 한계와 동일.

**하네스 단계적 추가 (카드 (e) 추적용):** M2 에 `build()`에 `registerMessageRoutes`+multipart+`hub`/`gateway` 데코레이트 추가(AC-007 의 postMsg/listMsg 가 메시지 라우트·브로커를 침 — REQ-MSG-015 multipart 선행). `listen`/`port`/`cleanups`·`signUpOn`·봇/SSE 헬퍼는 M3(AC-008..010·017·018 첫 소비) 몫.

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

## §F Phase 4 Mode Selection

- 입력: tier M / 구현 파일 ~6-8개(server 한 패키지) / 도메인 1개(server 인가) / 코딩 중심 / 동시성 이점 낮음
- 평가: direct 미해당(다단계 구현) · fanout 미해당(코딩 중심, Anthropic 코딩 병렬화 경고) · sweep 미해당(기계적 대량 변형 아님) · agent-team 미요청
- **Decision: serial** — 마일스톤당 구현 서브에이전트 1개 순차 위임(M1→M2→M3→M4 엄격 의존: 게이트 테스트가 스키마를 쓰고 하네스 교정이 게이트를 씀, plan.md §F)
- 근거: 코딩 중심 작업의 병렬화 경고 + 마일스톤 간 하드 의존으로 병렬 이득 없음. 카드 워크트리 안이므로 manager-develop 대신 general-purpose+역할 프롬프트로 위임(카드 워크트리 위임 관행 — isolation:worktree 는 원격 기본 브랜치에서 새 나무를 만듦)
- 구현 위임은 카드 워크트리 안에서 수행(별도 isolation 없음). Kickoff 승인은 운영자가 완료(2026-08-29, 리드 전달). Phase 1 감사 게이트 skip 요건 3건 충족: 판정 PASS 0.89 ≥ 티어 M 기준선 0.80 + 최종 판정 이후 plan 산출물 무변경(HEAD 018e7db = 감사 통과 커밋)
