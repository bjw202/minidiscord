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

### M3 — 게이트 여덟 곳 (2026-08-29) + **M4 단계 1 대조 기록 (AC-ROOMAUTHZ-016 본체)**

기준: HEAD `9ace4c9` (M2 착지 후). 대조 명령: `npm test -w server -- --reporter=verbose` — **M3 직후, 하네스 교정 전** 상태에서 레인이 직접 실행. 원문 전체: `.moai/state/verify/t11-run1/m3-post-gates-verbose.txt`. 실패 26건의 테스트 이름은 그 파일의 `×` 줄과 글자 단위로 일치하는 것을 레인이 대조했다.

**실측 토탈:** `Test Files  3 failed | 8 passed (11)` / `Tests  26 failed | 98 passed (124)` (종료 코드 1 — 예정된 상태). `room-members.test.ts` 20/20 통과, `npm run typecheck -w server` 종료 0, channel 워크스페이스 70/70 무관계 확인.

**AC-016 요구의 셋으로 나눈 대조 결과 (기준선 = plan.md §D.4 합계 칸의 34):**

1. **일치하는 항목 — 26건**, 전부 §D 직접 목록과 이름 단위 일치:
   - `messages.test.ts` (13): stores a plain user message with no targets / stores targets for mentioned bots / rejects mention of bot not invited to the room / send failures distinguish missing room from archived room / rejects an empty send with neither body nor file / saves uploaded file as attachment and serves download / never puts stored_path in the send or list response while keeping the id usable / refuses to store an upload outside the uploads directory / refuses to serve an attachment whose stored path escapes the uploads directory / publishes to the sse hub and delivers to the gateway exactly once / lists messages after cursor / list is scoped to the room and carries author_name / all three message routes reject unauthenticated requests
   - `permissions.test.ts` (12): user yes reply sends verdict to the bot and is not stored as user message / non-matching text is not consumed / yes with unknown id is not consumed (falls through as chat) / delivers an allow verdict to the connected bot / delivers a deny verdict as deny, not as allow / consumes the reply instead of storing it as a user message / accepts a verdict once and lets a repeat fall through as chat / never resolves a request from a different room / refuses an unauthenticated verdict and leaves the request pending (= AC-PERM-009) / falls through non-matching text and unknown ids without touching the pending request / marks an undelivered verdict differently from a delivered one / accepts all four verdict words, normalizes case, and rejects ids containing l
   - `sse.test.ts` (1): wires the hub and the events route into buildServer
2. **목록에 있는데 (아직) 실패하지 않은 항목 — 8건**, 전부 §D.3.1 «2차 효과» 묶음과 이름 단위 일치: sse 7(delivers a published event to the room subscriber / opens the stream with SSE headers and a connected comment / never leaks another room event into this room stream / frames events exactly as event/data/blank-line / delivers to every subscriber of the room / removes the subscriber when the connection closes / publishing to a room with no subscribers is a silent no-op) + permissions 1(publishes the request to the room SSE stream). **원인 규명 (AC-016 의 «고치기 전 원인»):** 이 8건은 하네스가 자기 파일 안에 직접 등록한 이벤트 라우트 사본(`sse.test.ts:30`·`permissions.test.ts:51`)을 쓰므로, 프로덕션 `index.ts` 의 게이트가 착지했어도 사본에는 게이트가 없어 지금 통과한다. `registerEventRoute` 로 사본을 옮기는 것은 plan §F M4 단계 2 의 행위이며, 옮기는 순간 §D.4 의 34건이 된다(그 순간의 verbose 를 M4 에서 포착해 기록). plan.md 자신이 §D.3.1 범위 한정 상자(F-14)에서 이 26 상태를 «문면대로만 이행한 경우의 실제 실패»로 이름해 둔 상태다.
3. **목록에 없는데 실패한 항목 — 0건.** (차이 규명 완료 — 진행한다.)

**관측 (기록 의무):**

- **plan §D.4 표 분모 미일치 1건:** 표의 파일별 분모 합계는 102(sse 9+messages 14+permissions 15+rooms-bots 21+gateway 23+그 외 20)인데 실측 분모는 104. «그 외 5개 파일» 행이 실제보다 2개 short. **분자 34 기준선(AC-016 이 고정하는 수)에는 영향 없음** — 기록만 남긴다.
- 생존 확인: `messages.test.ts:354`, `permissions.test.ts:124·:133·:147`, `sse.test.ts:176` — §D.4 의 생존 목록과 일치.
- 경계 준수 (레인 grep 직접 관측): `routes-rooms.ts:67` archive 라우트는 `requireAuth` 만 있고 멤버십 게이트 없음(REQ-013 알려진 미준수 — 준수), `server/src` 에 `403` 사용 0건(주석 언급만 존재), 비멤버 빈 배열 응답 없음(AC-009·013 통과로 간접 확인).
- 브로커 백스톱: `tryHandleUserReply(roomId, userId, text)` 시그니처 + 소비 전 `isRoomMember` 검사(AC-012 두번째 시나리오가 잰다). REQ-PERM-004 문서 개정은 M4 몫.
- `registerEventRoute(app)` 단일 인자 시그니처 — 위임 지시 `(app, opts)` 대신 기존 등록 함수 형태에 맞춤(인라인 라우트가 opts 미사용, 하네스 호출부 단일 인자 — 구현 에이전트 판단, 레인 수용).
- 범위 밖 관찰: `.moai/state/verify/t4-sync-audit/probe-inject.test.ts` — t4 감사 탐침 잔재가 루트 vitest 실행 시 17번째 파일로 수집돼 로드 오류를 낸다(워크스페이스 명령에는 안 잡힘). 기존 상태, 이번 변경과 무관 — run-done.md 에 리드 판단 사항으로 보고.

**M3 RED (구현 에이전트 관측 인용):** 11건 전부 단언 실패 — `expected 200 to be 404`(게이트 부재), `expected [2,1] to deeply equal [1]`(목록 미축소), `expected true to be false`(백스톱 부재), AC-017 `expected [200,200,200,404,201,200,200] …`(M2 초대 라우트만 게이트 — 갈라짐 그 자체) 등. bare import failure 0.

**수용 기준**: AC-ROOMAUTHZ-008·009·010(양)·011·012(양)·013·017·018(양) PASS — verbose `✓` 11건 이름 단위(구현 에이전트 verbose 원문 + 레인 전체 재실행에서 room-members 파일 20/20 관측).

**커밋 게이트 우회 1건 (기록 의무):** M3 커밋 시 pre-commit `moai gate` 가 `npm test` 전체 초록을 요구해 첫 시도가 막혔다. M3 종료 시점의 형제 26건 실패는 plan §F M3 4번이 못 박은 예정 상태(«전체 초록»은 M4 의 조건)이므로, 훅 자체가 안내하는 `SKIP_MOAI_PRECOMMIT=1` 로 우회해 커밋했다. 테스트를 고치거나 지워 초록을 만든 것이 아니며, 전체 초록 회복은 M4 단계 5 가 증명한다.

**하네스 단계적 추가 (카드 (e) 추적용):** M3 에서 `listen`/`port`/`cleanups`·`signUpOn`·`makeBot`/`botInvite`/`botInviteList`/`botInviteRevoke`/`archiveRoom`/`postMsg`/`listMsg`/`openStream`/`invite` 와 `routes-events` import 가 보태졌다 — 공통 하네스의 나머지 전부. (M1: 스키마 부분집합 → M2: 메시지 라우트+multipart+브로커 데코레이트 → M3: 완성.)

### M4 — 형제 하네스 교정과 문서 개정 (2026-08-29)

기준: HEAD `64c56ce`. 하네스 수리·34-moment·양방향 대조는 구현 에이전트 관측(원문 인용), 최종 GREEN·타입·범위는 레인 독립 재실행.

**34-moment (구현 에이전트 관측, 사본 교체 직후·수리 전):** `npm test -w server -- --reporter=verbose` → `Tests  34 failed | 90 passed (124)` — **§D.4 기준선 34와 정확히 일치, 목록 밖 실패 0건.** 원문: `.moai/state/verify/t11-run1/m4-transition-34-verbose.txt`. §D.3.1 의 8건이 사본 교체 순간 합류해 26→34 로 전이함이 실측됐다 — M3 대조 기록의 «원인 규명»이 예측대로 검증됨.

**하네스 수리 (구현 에이전트 수행, 레인이 verbose 통과로 확인):** `messages.test.ts` seed() 에 alice 멤버 행 삽입+둘째 방에도 멤버 행, AC-MSG-012 대조군 단언 `!== 401` → `=== 200` 으로 축소(F-13 근거 주석, 소스에서 세 라우트 성공 코드 200 확인 후). `permissions.test.ts` seedRoomAndBot() 멤버 행+사본 라우트 → `registerEventRoute`. `sse.test.ts` 사본 라우트 → `registerEventRoute`, 신규 `memberRoom(app)` 헬퍼로 실제 방+멤버로 스트림 오픈(임의 `1` 제거), `:192` buildServer 판은 실제 `POST /api/rooms` 로 방 생성. 테스트 삭제 0, 단언 추가·재배열 0(축소 1건 제외).

**AC-ROOMAUTHZ-014 보강 (레인 지시로 동일 에이전트가 추가):** 테스트가 어디에도 없었던 것을 레인이 발견 — acceptance.md 본문 그대로 `room-members.test.ts` 에 이식. 보존 판정(봇 경로 무변경)이라 M3 이전엔 잴 것이 없어 born-green 이 정상 — 근거 주석을 테스트 위에 둠. 레인 독립 관측: `✓ test/room-members.test.ts > room membership gates > leaves the bot gateway path untouched by room membership`.

**§6 표 양방향 대조 (구현 에이전트 실행·판정, 레인이 명령과 결론 대조 확인):**

- 파일→표: `grep -rn "SPEC-ROOMAUTHZ-001" .moai/specs/ .moai/plan/` (자기 디렉터리 제외) → **35 히트, 전부 §6 표 행에 사상 — 고아 주석 0, 표 완결.** 25행 전부 주석이 디스크에 존재(3차 계획 개정이 착지시킨 것) + progress.md 두 건 말미 추가.
- 표→파일: 전 행 **참 판정.** 근거(이번 실행 실측): 아홉 술어 소비부 존재(`routes-messages.ts:32·:128`, `routes-events.ts:13`, `routes-rooms.ts:15-18`, `permissions.ts:53`, `routes-bots.ts:50·70·82`, `routes-rooms.ts:47`); D2 v2 문장이 SPEC-BOT-001 :49·:178 에 읽힘(1차 주석의 뒤집힌 문장은 그 뒤에 2차 반전 주석이 붙어 교정 이력 상태); REQ-PERM-004 시그니처가 `permissions.ts:16` 과 일치; «첨부 라우트는 여전히 열려 있다»가 실제로 참(`routes-messages.ts:147`·`routes-rooms.ts:67` requireAuth 만). 판정 대상은 존재가 아니라 참임 — N-01 교훈 이행.

**경계 검사 (AC-ROOMAUTHZ-015, 구현 에이전트 실행):** `git rev-parse --verify "$(cat .spec-base-sha)^{commit}"` → `018e7db4…` 종료 0(빈 출력 아님 확인) → `git diff --name-only <base> -- web/ channel/` 빈 출력, `-- server/` 12파일 전부 이 SPEC 소속. (워크트리 가드가 `$(cat …)` 복합형을 거부해 SHA 리터럴로 동일 검사 — 동치.)

**레인 독립 최종 GREEN (직접 관측):** `npm test -w server -- --reporter=verbose` → 종료 코드 **0**, `Tests  125 passed (125)`. 원문: `.moai/state/verify/t11-run1/m4-green-verbose.txt`. `npm run typecheck -w server` → 종료 **0**. 변경 범위: 테스트 4파일 + progress.md.

**완료 정의(§G) 대응:** AC-ROOMAUTHZ-001..018 전부 통과(125/125 안에 이름 단위 관측) · typecheck 0 · §6 표 전부 개정 주석+원문 보존(양방향 참) · AC-MSG-012·AC-PERM-009 전제 변경 주석 · **잔여 위험(첨부 `GET /api/attachments/:id`, 보관 `POST /api/rooms/:id/archive`)은 run-done.md 로 리드에 후속 카드 요청과 함께 보고** · 보관 라우트 알려진 미준수는 spec.md §7·§9 에 이름으로 존재(어느 AC 도 통과로 판정하지 않음).

**미검증 (명시):** 34-moment·양방향 대조·경계 검사의 원문은 구현 에이전트 관측 인용이다 — 레인은 최종 GREEN(125/125)·타입·범위·AC-014 라인을 직접 재관측했고, 대조 결론은 명령·숫자·파일 경로를 대조해 확인했다. SSE 수리 테스트의 프레임 단언은 본문 불변(페이로드 동일)을 에이전트가 보고했다 — 레인이 줄 단위로 재대조하진 않았다.

**하네스 단계적 추가 (카드 (e) 추적용) — 최종:** M1 스키마 부분집합 → M2 메시지 라우트+multipart+브로커 데코레이트 → M3 공통 하네스 완성(`listen`/`port`/`cleanups`·`signUpOn`·봇/SSE 헬퍼·`routes-events` import) → M4 형제 하네스 수리+`memberRoom` 신설. 공통 하네스는 이 SPEC 안에서 4단계에 걸쳐 완성됐다.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-29
requirements_implemented: 17        # REQ-ROOMAUTHZ-001..017
acceptance_criteria_pass: 18        # AC-ROOMAUTHZ-001..018 — 125/125 스위트 안에서 이름 단위 관측
commits:
  - 9b0e619   # M1 room_members table, created_by, one-shot backfill
  - 9ace4c9   # M2 membership predicate, creator auto-join, invitation route
  - 64c56ce   # M3 eight gates (26-failure interim state, gate override documented)
  - ec2f344   # M4 sibling harness repair + AC-014 + two-way doc verification
final_suite: 125/125 exit 0 (verbose)   # .moai/state/verify/t11-run1/m4-green-verbose.txt
typecheck: exit 0
comparison_record: §E.2 M3 절 — AC-ROOMAUTHZ-016 본체 (26 일치 / 8 원인 규명 / 0 목록 밖; 34-moment 로 예측 실증)
followup_card_request: GET /api/attachments/:id + POST /api/rooms/:id/archive 게이트 (spec.md §9 잔여 위험 — run-done.md 로 리드 보고)
known_deviations:
  - M3 커밋 시 SKIP_MOAI_PRECOMMIT=1 우회(예정된 26건 실패 상태 — §E.2 M3 절 기록)
  - plan §D.4 표 분모 합계 102 vs 실측 104(분자 34 기준선 무영향 — §E.2 M3 절 기록)
  - registerEventRoute 단일 인자 시그니처(구현 판단, AC-010 buildServer 판이 통과로 검증)
open_observations:
  - .moai/state/verify/t4-sync-audit/probe-inject.test.ts 잔재(루트 vitest 실행 시 로드 오류) — 리드 판단 사항, run-done.md 보고
```

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-29
sync_commit_sha: pending-backfill-t11-sync   # 커밋은 자기 SHA 를 모른다 — 착지 후 sync 레인이 백필한다
sync_base_head: c87cbc1                      # 이 sync 편집이 얹힌 HEAD (run-done 커밋)
frontmatter_status_transitions:
  spec.md: in-progress -> implemented        # updated 는 이미 2026-08-29 — 변경 없음
  plan.md: n/a                               # 이 SPEC 의 plan.md 에는 프론트매터가 없다 (파일 첫 줄이 H1)
  acceptance.md: n/a                         # 같음
  progress.md: n/a                           # 같음
  completed_transition: deferred             # 감사 판정 후 리드가 결정한다 — sync 레인이 앞당기지 않는다
documents_updated:
  - CHANGELOG.md            # [Unreleased] 안에 «방 멤버십 인가 (카드 t11)» 절 신설 — t10 절 위
  - README.md               # 머리말 한 줄 · 설정 절 · API 표(구성원 칸 신설) · «방 구성원» 절 신설 · 보안 절(«방 사이의 경계» 신설, F-14 항목 닫힘 표기) · 데이터베이스 절(표 8→10, room_members·schema_migrations·created_by) · 문서 목록
  - .moai/specs/SPEC-ROOMAUTHZ-001/spec.md   # 프론트매터 status 만
  - .moai/specs/SPEC-ROOMAUTHZ-001/progress.md  # 이 §E.4 블록만
  - .moai/state/verify/t4-sync-audit/probe-inject.test.ts -> probe-inject.snippet.ts  # 순수 이름 변경(양쪽 해시 6d3c222c…). 이 sync 가 만든 것이 아니라 세션 시작 전부터 트리에 있던 미신고 델타이며, 감사 F-03 이 지적해 리드 결정으로 이 커밋에 포함·공시한다. 효과: 루트 vitest 수집에서 빠져 로드 오류가 사라진다(감사자 §6.6 이 16파일/195건·로드 오류 0 으로 실행 검증)
post_audit_amendments:                       # 감사(PASS 84.0) 판정 이후 리드 결정으로 더한 문서 변분 — 코드 무변경이라 재검증 불요
  - finding: F-02
    files: [CHANGELOG.md, README.md]
    change: "보관 라우트 미준수의 크기 정정 — 보관된 방에서는 구성원도 전송·봇 초대가 409 로 막히고 되돌리는 라우트가 API 에 없다는 한 문장 추가. spec.md §9 몫은 후속 카드"
  - finding: F-05
    files: [README.md]
    change: "데이터베이스 표의 messages/message_targets·attachments 두 행 «아직» → «예» (이번 변경 이전부터 거짓이던 칸)"
  - finding: F-01
    files: []
    change: "정정하지 않음 — 후속 카드로 이월(리드 결정, 운영자 승인). 술어 호출부의 참값은 여덟이고 목록은 인라인 SQL 로 같은 조건을 따로 적는다"
b12_self_test_a_duplicate_grep:
  command: grep -c 'SPEC-ROOMAUTHZ-001' CHANGELOG.md
  observed: 0
  verdict: pass                              # 0 이므로 중복 착지 없음 — 신규 emission 허용
b12_self_test_b_ac_count:
  command: grep -oE 'AC-ROOMAUTHZ-[0-9]+' .moai/specs/SPEC-ROOMAUTHZ-001/acceptance.md | sort -u | wc -l
  observed: 18                               # AC-ROOMAUTHZ-001..018 — 0 이 아니므로 유효한 대조
  changelog_reference: 18                    # acceptance.md 가 SSOT (progress.md 아님)
  verdict: pass
b12_self_test_c_path_existence:
  command: "ls server/src/room-members.ts server/src/routes-events.ts server/src/routes-rooms.ts server/src/routes-messages.ts server/src/routes-bots.ts server/src/permissions.ts server/src/db.ts"
  observed: 7 paths resolved, exit 0         # CHANGELOG 가 이름으로 부른 소스 전건 실재
  verdict: pass
changelog_entry_position: "CHANGELOG.md ## [Unreleased] 첫 절 (카드 t10 절 바로 위)"
canary_compliance_check: n/a                 # 이 SPEC 은 자기 sync 가 시험할 전향적 정책을 정의하지 않는다

sync_phase_direct_observations:              # sync 레인이 이 트리·이 HEAD 에서 직접 실행
  - command: npm test -w server
    observed: "Test Files  11 passed (11) / Tests  125 passed (125)"
  - command: npm run typecheck -w server
    observed: "exit 0"                       # 원문 .moai/state/verify/t11-sync/typecheck-server-syncagent.txt
  - command: git diff --name-only 018e7db4… -- web/ channel/
    observed: "(빈 출력)"                     # REQ-ROOMAUTHZ-016 경계 — sync 레인 직접 재확인
  - command: git diff --name-only 018e7db4… -- server/src/
    observed: "8 files: db·index·permissions·room-members·routes-bots·routes-events·routes-messages·routes-rooms"
  - artifact: .moai/state/verify/t11-sync/mutation-matrix.md
    observed: "강제 지점 9/9 개별 검출, 생존 변이 0; 술어 변이 4종 전부 검출; 이중 방어 2건 생존(측정 밖)"

gaps_and_observations:
  - id: G-T11-01
    title: "술어를 «부른다»는 문언이 일곱 자리에서 거짓이다 — 동작은 옳고 측정도 된다"
    scope_correction: "이 항목을 처음 적을 때는 두 자리로 셌으나, 감사(F-01)와 sync 레인 재검증이 일곱 자리로 확정했다: room-members.ts:2·:7, routes-rooms.ts:13·:46, routes-messages.ts:31, plan.md:379, spec.md:277 (+ progress.md:153 은 §E.2 의 역사 기록이라 세지 않고 고치지도 않는다). 술어 호출부의 참값은 여덟이다."
    what_is_false:
      - "server/src/room-members.ts:7 @MX:ANCHOR — 게이트 여덟 곳으로 «메시지·스트림·목록·브로커·초대 셋»을 열거하며 그 전부가 이 술어를 «호출한다»고 적는다. 목록(GET /api/rooms)은 isRoomMember 를 부르지 않는다."
      - "progress.md §E.2 M4 §6 표 양방향 대조 항목 — «아홉 술어 소비부» 목록에 routes-rooms.ts:15-18 을 넣었다. 그 자리는 술어 소비부가 아니다."
    what_is_nonetheless_true:
      - "GET /api/rooms 는 인라인 SQL 하위 질의(routes-rooms.ts:17-19, `WHERE id IN (SELECT room_id FROM room_members WHERE user_id = ?)` 는 :18)로 같은 조건을 건다 — REQ-ROOMAUTHZ-011 이 그 SQL 을 문면으로 지정했으므로 구현이 요구사항을 벗어난 것이 아니다."
      - "AC-ROOMAUTHZ-011 이 그 자리를 실제로 잰다 — sync 레인이 그 SQL 을 `WHERE ? IS NOT NULL` 로 변이시키자 «narrows the room listing to the caller rooms and widens it on invitation» 1건이 실패했다(mutation-matrix.md M9). 측정되지 않는 자리가 아니다."
      - "REQ-ROOMAUTHZ-007 의 «게이트가 술어 하나를 부른다»가 구속하는 범위는 상태 코드로 방향이 드러나는 게이트 여덟이며, 목록은 spec.md §5.3 이 이미 그 sweep 밖으로 이름 붙여 두었다(AC-ROOMAUTHZ-017 이 아니라 AC-ROOMAUTHZ-011 이 잰다)."
    handling: "고치지 않았다 — 주석은 소스이고 §E.2 는 run 단계의 역사적 관측 기록이라, 둘 다 sync 단계(manager-docs)의 산출물 소유 밖이다. 감사자와 리드가 보도록 여기에만 기록한다. CHANGELOG 와 README 는 처음부터 이 사실대로 썼다 — «목록만은 술어를 부르지 않고 SQL 로 같은 조건을 건다»."
    proposed_owner: "결정됨 — 리드가 후속 카드로 이월(운영자 승인, 큐 추가 완료). 이 커밋에서는 손대지 않는다. 정정 시 숫자만이 아니라 spec.md §5.3 의 예외 사유도 함께 고쳐야 한다 — 적힌 사유(«상태 코드로 방향이 안 드러나서»)와 실제 사유(«두 번째 SQL 판정이 따로 존재해서»)가 다르다"
  - id: G-T11-02
    title: "sync 레인이 재현하지 않은 것"
    items:
      - "run 단계의 RED 원문·34-moment·경계 검사 원문은 구현 에이전트 관측 인용이다(§E.2 가 그렇게 명시한다). sync 레인은 최종 상태(125/125·typecheck 0·web·channel 무변경·server/src 8파일)만 직접 재관측했다."
      - "REQ-ROOMAUTHZ-003 의 백필 트랜잭션 원자성은 이번에도 재지 않았다 — spec.md §9 가 «미검증»으로 이름 붙인 그대로다. sync 단계가 새로 잰 것이 없다."
      - "«올려도 아무도 잠겨 나오지 않는다»는 CHANGELOG 의 업그레이드 문장은 db.ts:97-107 판독과 AC-ROOMAUTHZ-003 통과에 근거한다 — 실제 구버전 DB 파일을 상향해 보는 실행은 하지 않았다."
```

## §F Phase 4 Mode Selection

- 입력: tier M / 구현 파일 ~6-8개(server 한 패키지) / 도메인 1개(server 인가) / 코딩 중심 / 동시성 이점 낮음
- 평가: direct 미해당(다단계 구현) · fanout 미해당(코딩 중심, Anthropic 코딩 병렬화 경고) · sweep 미해당(기계적 대량 변형 아님) · agent-team 미요청
- **Decision: serial** — 마일스톤당 구현 서브에이전트 1개 순차 위임(M1→M2→M3→M4 엄격 의존: 게이트 테스트가 스키마를 쓰고 하네스 교정이 게이트를 씀, plan.md §F)
- 근거: 코딩 중심 작업의 병렬화 경고 + 마일스톤 간 하드 의존으로 병렬 이득 없음. 카드 워크트리 안이므로 manager-develop 대신 general-purpose+역할 프롬프트로 위임(카드 워크트리 위임 관행 — isolation:worktree 는 원격 기본 브랜치에서 새 나무를 만듦)
- 구현 위임은 카드 워크트리 안에서 수행(별도 isolation 없음). Kickoff 승인은 운영자가 완료(2026-08-29, 리드 전달). Phase 1 감사 게이트 skip 요건 3건 충족: 판정 PASS 0.89 ≥ 티어 M 기준선 0.80 + 최종 판정 이후 plan 산출물 무변경(HEAD 018e7db = 감사 통과 커밋)
