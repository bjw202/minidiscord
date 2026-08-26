# SPEC-ROOM-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §D 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤과는 다른 층위다.

---

## §A 의존 순서와 SPEC 사이의 계약

카드 `t2` 는 세 개의 Tier M SPEC 을 **의존 순서대로** 내놓는다. 순서를 바꿀 수 없다.

```
SPEC-AUTH-001  →  SPEC-ROOM-001 (이 문서)  →  SPEC-BOT-001
   인증·세션          방·봇 등록                봇 초대·토큰
```

### 이 SPEC 이 SPEC-AUTH-001 에서 소비하는 것

| 소비 대상 | 형태 | 없으면 생기는 일 |
|-----------|------|------------------|
| `requireAuth(req, reply): Promise<void>` | `server/src/auth.ts` 의 이름 붙은 내보내기 | 두 라우트 모듈이 import 에서 컴파일 실패 |
| `md_session` 쿠키와 `POST /api/auth/{register,login}` | HTTP 계약 | 테스트의 `build()` 헬퍼가 쿠키를 못 얻어 전 테스트가 `401` |
| `app.db` 데코레이터 + `declare module 'fastify'` 의 `db` 선언 | `buildServer` 안에서 설정 | `req.server.db` 가 타입 오류이자 런타임 `undefined` |
| `@fastify/cookie` 등록 | `buildServer` 안에서 `await app.register(cookie)` | `req.cookies` 가 없어 `requireAuth` 가 항상 `401` |

**이 SPEC 은 위 넷 중 어느 것도 정의하지 않는다.** 전부 가져다 쓴다. SPEC-AUTH-001 이 완료되지 않은 상태에서 이 SPEC 의 run 단계를 시작하면 첫 테스트부터 실패하며, 그 실패는 이 SPEC 의 결함이 아니다.

### 이 SPEC 이 SPEC-BOT-001 에게 남기는 것

| 산출물 | 형태 | SPEC-BOT-001 이 쓰는 방식 |
|--------|------|---------------------------|
| `rooms` 행과 `POST /api/rooms` | 활성 방 | 초대의 대상 방. 초대는 `status='active'` 인 방만 받는다 |
| `bots` 행과 `POST /api/bots` | 봇 정의 | 초대의 대상 봇. `bot_id` 가 여기 없으면 `404` |
| `server/src/routes-bots.ts` | 파일 자체 | 같은 파일에 초대 라우트 세 개와 `sha256Hex` 를 **덧붙인다** |
| 보관 시 `bot_tokens` 일괄 철회 | `POST /api/rooms/:id/archive` 안의 트랜잭션 | 초대된 방을 보관하면 토큰이 죽는다는 것을 실행으로 검증 |
| `registerRoomRoutes` 의 `onArchive` 훅 자리 | 선택 인자 | 아직 아무도 쓰지 않는다. 게이트웨이(이후 카드)가 연결 끊기에 쓴다 |

`routes-bots.ts` 가 두 SPEC 에 걸쳐 자라는 것이 이 분할에서 가장 어색한 지점이다. §C 에서 왜 파일을 나누지 않았는지 설명한다.

## §B 되돌리기 어려운 결정 — 사람이 보는 HTTP 계약

브라우저(이후 카드)와 사용자가 직접 마주하는 표면이라, 확정 뒤에는 UI 코드가 여기에 결합한다.

| 라우트 | 성공 | 실패와 코드 |
|--------|------|-------------|
| `GET /api/rooms` | 200 | 미인증 401 |
| `POST /api/rooms` | 201 | 빈 이름 400 / 미인증 401 |
| `POST /api/rooms/:id/archive` | 200 | 활성 방 없음 404 / 미인증 401 |
| `GET /api/bots` | 200 | 미인증 401 |
| `POST /api/bots` | 201 | 빈 이름 400 / 중복 409 / 미인증 401 |

여기서 굳는 형태가 두 개 더 있다.

- **`GET /api/rooms` 의 응답은 배열이 아니라 `{ active, archived }` 객체다.** 서버가 한 번 `SELECT` 해서 상태로 나눠 준다. 클라이언트가 필터링하지 않는다. UI 사이드바가 두 목록을 그대로 두 섹션에 매핑하는 것을 전제한 형태다.
- **`Room` 은 `archived_at` 을 활성 방에서도 키로 갖는다**(값은 `null`). 목록 응답이 상태에 따라 모양이 달라지지 않게 하려는 것이다.

의도적 비대칭 하나: 방이 없을 때 **보관은 `404`** 다. SPEC-BOT-001 의 초대는 같은 상황에서 `403` 을 쓴다. 보관은 "그런 활성 방이 없다"는 조회 실패이고, 초대는 "방은 있는데 보관돼서 안 된다"가 주된 경우라 권한 거절로 읽는 편이 사용자에게 맞다. 원본 Task 4-5 의 코드와 테스트가 그렇게 돼 있어 그대로 따른다. **두 SPEC 사이에 걸친 결정이므로 여기서 바꾸면 SPEC-BOT-001 도 함께 바꿔야 한다.**

## §C 되돌리기 어려운 결정 — 보관의 원자성, 훅 경계, 파일 분할

### 보관은 한 트랜잭션이다

보관 핸들러는 UPDATE 를 두 번 한다. 방 상태를 바꾸고, 그 방의 활성 토큰을 철회한다. 원본 Task 4 의 코드는 두 문장을 그냥 나란히 둔다.

**결정: `better-sqlite3` 의 `db.transaction()` 으로 묶는다.**

중간에 실패하면 "보관됐는데 토큰은 살아 있는" 상태가 남고, 그 방의 봇이 계속 접속 가능해진다. 보관은 되돌릴 수 없는 전이라 이 중간 상태를 수습할 경로도 없다 — unarchive 는 범위 밖이다. 그래서 REQ-ROOM-005 가 한 트랜잭션을 요구한다.

첫 UPDATE 의 `changes === 0` 검사(= 404 판정)는 트랜잭션 **안**에서 하고, 0이면 트랜잭션에서 빠져나와 `404` 를 응답한다. 두 번째 UPDATE 가 절대 단독으로 실행되면 안 된다 — REQ-ROOM-006 의 "어떤 토큰도 철회하지 않아야 한다"가 그것이다.

### `onArchive` 훅은 자리만 만든다

`registerRoomRoutes(app, opts?)` 의 `onArchive` 는 이 SPEC 에서 **호출자가 없다.** `buildServer` 는 `registerRoomRoutes(app)` 로 인자 없이 부른다. 테스트만 훅을 주입한다.

미래를 위한 코드를 미리 만드는 것은 보통 안티패턴이지만, 여기서는 원본 Task 4 의 인터페이스 명세가 훅을 요구하고 원본 테스트가 그것을 검증한다. 훅을 나중에 붙이면 시그니처가 바뀌어 호출부를 다시 손봐야 한다. **자리만 만들고 동작은 만들지 않는다** — 훅 안에서 게이트웨이 연결을 끊는 일은 이후 카드 소관이고, 그 사실을 `spec.md` §5 에 명시했다.

훅은 트랜잭션 **밖**, 커밋 이후에 호출한다. 훅이 던지는 예외로 이미 확정된 보관이 되돌아가면 안 된다.

### `routes-bots.ts` 를 두 SPEC 이 나눠 쓴다

이 SPEC 은 `routes-bots.ts` 에 `registerBotRoutes` 와 등록·목록 두 라우트만 넣는다. SPEC-BOT-001 이 같은 파일에 초대 라우트 세 개와 `sha256Hex` 를 덧붙인다.

대안은 초대를 `routes-invites.ts` 로 떼는 것이었다. 채택하지 않은 이유: 원본 `plan-v2.md` 의 파일 구조가 `routes-bots.ts` 를 "봇 등록/목록 + 방 초대(토큰 발급)"로 못 박고 있고, 이 SPEC 의 REQ-ROOM-012 가 `server/src` 의 파일 목록을 여섯 개로 고정한다. 파일을 더 만들면 그 요구사항과 정면으로 부딪친다. **SPEC 분할이 파일 구조를 바꾸게 두지 않는다** — 분할은 문서의 사정이지 코드의 사정이 아니다.

여기서 파생되는 판단 하나를 명시한다. 원본 `REQ-AUTH-021` 은 `routes-bots.ts` 가 `registerBotRoutes` 와 `sha256Hex` 를 **함께** 내보낼 것을 요구했다. 이 SPEC 은 `sha256Hex` 를 가져오지 않는다. 그 함수는 토큰 해시 계약의 일부이고, 토큰 발급이 없는 상태에서 해시 함수만 내보내면 소비자 없는 죽은 코드가 된다. `sha256Hex` 의 정의와 그 계약(게이트웨이가 같은 함수를 재사용한다는 것)은 SPEC-BOT-001 이 통째로 가져간다.

## §D 원본 문서 모순과 해결

원본 `plan-v2.md` Task 4 와 `spec-v2.md` 를 대조하면서 발견한 것들 가운데 **방·봇 등록 범위 안에 드는 것만** 옮겼다. 인증 관련 모순은 SPEC-AUTH-001 의 `plan.md` 가, 초대·토큰 관련 모순은 SPEC-BOT-001 의 `plan.md` 가 가져간다.

| # | 모순 | 해결 |
|---|------|------|
| 1 | Task 4 의 `archives a room` 테스트에 `let archivedId = -1` 이 선언되고 `expect(archivedId).toBe(-1)` 로 끝난다. 어떤 코드도 이 변수를 바꾸지 않으므로 이 단언은 아무것도 검증하지 않는다 | 그 단언을 지우고, 훅 검증은 바로 다음 테스트 `calls onArchive hook when provided` 에 맡긴다. 죽은 단언을 남기면 "훅이 호출되지 않음"을 검증한다는 오해를 부른다 |
| 2 | 방 보관의 두 UPDATE(방 상태 / 토큰 철회)가 원본에서는 별개 문장이다 | `db.transaction()` 으로 묶는다 (§C). REQ-ROOM-005 가 한 트랜잭션을 요구하는 이유다 |
| 3 | Task 4 의 인터페이스 명세는 `opts: { onArchive?… }` 를 **필수** 인자로 쓰는데, 구현 코드는 `opts: {…} = {}` 기본값을 두고 `buildServer` 는 `registerRoomRoutes(app)` 로 인자 없이 부른다 | 구현 쪽을 따른다. 시그니처를 `opts?: { onArchive?: (roomId: number) => void }` 로 확정한다 (REQ-ROOM-001) |
| 4 | `POST /api/rooms` 의 응답 SELECT 가 `archived_at` 을 뽑지 않는데(`SELECT id, name, status, created_at`), `GET /api/rooms` 는 뽑는다. 같은 `Room` 타입인데 모양이 다르다 | 생성 응답도 `archived_at` 을 포함하도록 SELECT 를 맞춘다 (§B). 활성 방이므로 값은 `null` 이다. 원본 테스트는 `status` 만 보므로 깨지지 않는다 |
| 5 | 원본 테스트 `requires auth` 는 `GET /api/rooms` 하나만 확인한다. 나머지 네 경로의 `requireAuth` 누락은 잡히지 않는다 | AC-ROOM-008 이 다섯 경로 전부를 확인하도록 확장한다. 원본 테스트는 그대로 두고 새 테스트를 더한다 |
| 6 | 보관 시 토큰 철회를 요구하는데, 이 SPEC 에는 토큰을 만들 경로가 없다 — 요구사항은 있으나 이 SPEC 만으로는 실행 검증이 불가능하다 | 요구사항(REQ-ROOM-005)은 여기 둔다. 보관 라우트가 이 SPEC 의 산출물이기 때문이다. 검증은 둘로 나눈다 — 관측 가능한 절반(방 이동·`archived_at`)과 구조(트랜잭션 grep)는 AC-ROOM-003 이, 토큰이 실제로 죽는지는 SPEC-BOT-001 의 수용 기준이 맡는다. 통과할 수 없는 기준을 여기에 두지 않는다 |

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| SPEC-AUTH-001 이 `app.db` 데코레이터를 선언하지 않은 채 이 SPEC 을 시작 | 두 라우트 모듈의 `req.server.db` 가 타입 오류. 전 테스트 실패 | §A 의 소비 목록을 run 단계 진입 전 체크리스트로 쓴다. `git log` 에서 SPEC-AUTH-001 의 커밋 3개를 먼저 확인한다 |
| 보관 트랜잭션 안에서 `404` 판정을 하다 `better-sqlite3` 트랜잭션 함수가 예외를 요구하는 형태와 어긋남 | 보관이 항상 500 이 되거나, 반대로 롤백 없이 진행 | `db.transaction()` 안에서 `changes === 0` 이면 플래그를 반환하고, 트랜잭션 밖에서 그 플래그로 응답을 갈라 쓴다. 예외로 롤백하지 않는다 |
| `onArchive` 훅이 던진 예외가 보관을 취소한 것처럼 보임 | 보관은 이미 커밋됐는데 응답은 500 — 사용자가 재시도하면 `404` | 훅은 트랜잭션 밖·커밋 이후 호출 (§C). 이 SPEC 에서 훅 주입자는 테스트뿐이라 실사용 노출은 없다 |
| `routes-bots.ts` 를 두 SPEC 이 나눠 쓰면서 SPEC-BOT-001 이 이 SPEC 의 코드를 덮어씀 | 봇 등록 테스트가 조용히 깨짐 | SPEC-BOT-001 은 파일을 **덧붙이는** 작업임을 §A 에 명시. `rooms-bots.test.ts` 의 기존 테스트가 회귀 감지기 역할을 한다 |
| `bots.name` 의 `UNIQUE` 위반을 `try/catch` 로 잡아 409 로 바꾸는데, 다른 DB 오류도 같이 409 가 된다 | 오진단 | 수용(원본 그대로). 이 테이블에 다른 제약이 없어 실제 오분류 경로가 없다 |

## §F 마일스톤

우선순위 순서다. 앞 단계가 끝나야 다음을 시작할 수 있다 — M2 의 테스트가 M1 의 `build()` 헬퍼를 쓴다.

**진입 조건: SPEC-AUTH-001 이 `implemented` 이상이어야 한다.** `server/src/auth.ts` 가 없으면 M1 의 첫 테스트가 import 단계에서 죽고, 그 실패는 RED 증거가 아니라 순서 위반이다.

### M1 — 방 API (우선순위 High)

원본: `plan-v2.md` Task 4 Step 1-3 의 rooms 부분.

1. `server/test/rooms-bots.test.ts` 작성 — 파일 뼈대(`beforeEach` / `afterEach` / `build()`)와 `describe('rooms', …)` 4건. §D 1번에 따라 `archivedId` 죽은 단언은 옮겨 적지 않는다. AC-ROOM-002 / 003 / 004 / 008 의 테스트도 여기서 함께 넣는다.
2. **RED 확인**: `npm test -w server` → `Cannot find module '../src/routes-rooms.js'` 로 실패. 출력 기록.
3. `server/src/routes-rooms.ts` 구현 — 목록/생성/보관. 보관은 §C 에 따라 트랜잭션으로 묶고, 커밋 후 `onArchive` 훅을 호출한다. 생성 응답 SELECT 는 §D 4번에 따라 `archived_at` 을 포함한다.
4. `buildServer` 에 `registerRoomRoutes(app)` 등록.
5. **GREEN 확인**: `npm test -w server` → rooms 테스트 전부 통과. `npm run typecheck -w server` → 종료 코드 0.
6. 커밋: `feat: room API with archive and onArchive hook`

수용 기준: AC-ROOM-001..005, AC-ROOM-008(방 경로 세 개), AC-ROOM-010(전이 1-2).

### M2 — 봇 등록 API (우선순위 High)

원본: `plan-v2.md` Task 4 Step 1-3 의 bots 부분.

1. `server/test/rooms-bots.test.ts` 에 `describe('bots', …)` 추가 — 원본 1건 + AC-ROOM-007 의 1건. AC-ROOM-008 의 목록에 봇 경로 두 개를 더한다.
2. **RED 확인**: `npm test -w server` → `routes-bots.js` 모듈 없음으로 실패. 출력 기록.
3. `server/src/routes-bots.ts` 구현 — `GET`/`POST /api/bots` 만. §C 에 따라 `sha256Hex` 와 초대 라우트는 넣지 않는다.
4. `buildServer` 에 `registerBotRoutes(app)` 등록.
5. **GREEN 확인**: `npm test -w server` → 전체 통과. typecheck 0.
6. 범위 경계 확인: `ls server/src` 가 여섯 파일만 보이는지, `db.ts` 가 안 바뀌었는지 (AC-ROOM-009).
7. 커밋: `feat: bot registry API`

수용 기준: AC-ROOM-006, 007, 009, AC-ROOM-008(봇 경로 두 개), AC-ROOM-010(전이 3-4).

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-ROOM-001..010 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

AC-ROOM-003 의 토큰 철회 절반은 이 SPEC 에서 **구조로만** 확인한다. `§E.2` 에 "토큰 철회 동작은 SPEC-BOT-001 에서 검증 — 이 SPEC 에서는 미검증"으로 남긴다. 관측하지 않은 것을 관측했다고 적지 않는다.

## §H 안티패턴 (하지 말 것)

- **스키마 변경** — `db.ts` 의 `SCHEMA` 에 컬럼을 더하지 않는다. REQ-ROOM-013 이 금지하고, 필요하면 진행을 멈추고 보고한다.
- **인증 재정의** — `requireAuth` 를 이 SPEC 안에서 다시 만들거나 고치지 않는다. SPEC-AUTH-001 의 산출물을 그대로 import 한다. 고쳐야 할 것이 보이면 멈추고 보고한다.
- **범위 선반영** — "어차피 다음 SPEC 에서 필요하니까" `sha256Hex` 나 초대 라우트 스텁을 미리 만들지 않는다. AC-ROOM-009 와 Definition of Done 이 기계적으로 잡는다.
- **`onArchive` 훅에 동작 채우기** — 훅은 자리만이다. 게이트웨이 연결 끊기를 여기서 구현하지 않는다.
- **보관의 두 UPDATE 를 분리** — 편의를 위해 트랜잭션을 풀지 않는다. §C 가 그 이유다.
- **통과할 수 없는 수용 기준 추가** — 토큰 발급이 없는 상태에서 "활성 토큰 1 → 0" 을 이 SPEC 의 기준으로 쓰지 않는다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-ROOM-010 의 전이 증거를 만들 수 없다.
- **테스트에서 실제 `data/` 쓰기** — 모든 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다.

## §I 상호 참조

- `spec.md` — 이 SPEC 의 GEARS 요구사항(REQ-ROOM-001..013)과 범위 경계
- `acceptance.md` — AC-ROOM-001..010
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 — 원본 (읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·5장 — 기능 요구사항, 데이터 모델
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `openDb`, 스키마)
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (`requireAuth`, 세션 쿠키, `app.db`)
- `.moai/specs/SPEC-BOT-001/` — 후행 SPEC (초대·토큰 발급, `sha256Hex`)
