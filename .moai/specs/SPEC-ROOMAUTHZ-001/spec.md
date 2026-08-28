---
id: SPEC-ROOMAUTHZ-001
title: "minidiscord 방 멤버십 인가 — 방에 속하지 않은 계정이 그 방을 읽지도 쓰지도 승인하지도 못하게 한다"
version: "0.1.0"
status: draft
created: 2026-08-29
updated: 2026-08-29
author: manager-spec
priority: P0
phase: "v0.4.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "authorization, room-membership, invitation, privilege-escalation, permission-relay, schema-migration"
tier: M
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001, SPEC-SSE-001, SPEC-MSG-001, SPEC-PERM-001]
---

# SPEC-ROOMAUTHZ-001 — 방 멤버십 인가 (서버 쪽)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-29 | 최초 작성. `.moai/reports/t4/sync-audit.md` F-14(High, out-of-diff)에서 도출 (칸반 카드 `t11`). 이 SPEC 은 `spec-v2.md` 2장의 "방별 접근 권한은 없음 — YAGNI" 판단을 **뒤집는다** — 그 판단은 권한 릴레이(SPEC-PERM-001) 이전의 시스템에 대한 것이었고, 릴레이가 들어오면서 "로그인한 누구나 아무 방이나 읽는다"가 편의가 아니라 **권한 상승 경로**가 됐다. 뒤집는 근거와 원문 주석은 §1.2 에 있다. 요구사항 16개·수용 기준 16개로 Tier M 상한(16/16) 안이다. 운영자가 확정한 설계 결정 3건(획득 방식·게이트 범위·기존 데이터 처리)은 §3 에 기각안과 함께 기록했다. | manager-spec |

---

## 1. 배경과 목적

### 1.1 무엇이 열려 있는가

이 서버에는 **방 멤버십 개념이 존재하지 않는다.** 관측으로 확인했다.

```
$ grep -rn "room_members\|membership\|requireMember\|owner" server/src/
$ echo $?
1
```

한 줄도 나오지 않는다. `rooms` 테이블(`server/src/db.ts:18-24`)의 컬럼은 정확히 `id, name, status, created_at, archived_at` 다섯이고 `created_by` 가 없다. 그래서 방 범위 라우트는 전부 `requireAuth` 하나에만 기댄다.

| 라우트 | 위치 | 현재 경계 |
|--------|------|-----------|
| `POST /api/rooms/:id/messages` | `server/src/routes-messages.ts:29` | 로그인만 |
| `GET /api/rooms/:id/messages` | `server/src/routes-messages.ts:123` | 로그인만 |
| `GET /api/rooms/:id/events` (SSE) | `server/src/index.ts:57` | 로그인만 |
| `GET /api/rooms` | `server/src/routes-rooms.ts:12` | 로그인만 — **모든 방을 모두에게 돌려준다** |

그리고 판정 소비 함수는 **누가 눌렀는지를 인자로조차 받지 않는다.**

```ts
// server/src/permissions.ts:43-58
tryHandleUserReply(roomId, text) {
  const m = PERMISSION_REPLY_RE.exec(text)      // :44  형식인가
  if (!m) return false
  const info = open.get(requestId)              // :47  대기 중인가
  if (!info) return false
  if (info.roomId !== roomId) return false      // :49  방이 맞는가
  ...
}
```

세 검사 어디에도 사람이 없다. 그리고 승인 코드(`request_id`)는 **서버 스스로** 그 방의 system 메시지로 공개한다(`server/src/permissions.ts:34-40`) — 방을 읽을 수 있으면 코드를 안다.

### 1.2 네 걸음이면 남의 도구 실행이 승인된다

각 걸음에 필요한 것은 `requireAuth` 통과, 즉 **계정 하나**뿐이다.

```
1. POST /api/auth/register        계정을 만든다
2. GET  /api/rooms                방 목록을 통째로 받는다
3. GET  /api/rooms/<id>/messages  대기 중인 request_id 를 읽는다
4. POST /api/rooms/<id>/messages  "yes <id>" 를 보낸다
   → 사람이 한 번도 승인하지 않은 도구 실행이 승인된다
```

이 SPEC 은 그 사슬을 **첫 걸음에서** 끊는다. 네 번째 걸음만 막으면 `request_id` 는 여전히 읽히고, 사슬이 한 요청 길어질 뿐이다.

### 1.3 왜 지금 뒤집는가 — YAGNI 판단의 유효기간

`.moai/plan/2026-08-26-minidiscord/spec-v2.md:32` 는 이렇게 적었다.

> **계정**: 소수 그룹이 각자 계정으로 로그인한다. (방별 접근 권한은 없음 — YAGNI)

**그 판단은 그때 옳았다.** 방별 권한이 없다는 것은 그 시점 시스템에서 "동료가 내 방 대화를 볼 수 있다"는 뜻이었고, 소수 그룹 전제에서 그것은 편의였다. 만들지 않는 것이 맞다.

**그 뒤 시스템이 바뀌었다.** `SPEC-PERM-001`(권한 릴레이)이 들어오면서 방 안의 문자열 하나가 **봇 세션의 도구 실행을 승인하는 행위**가 됐다. 같은 "방을 읽을 수 있다"가 이제 "남의 세션에 임의 명령 실행을 허가할 수 있다"를 뜻한다. 읽기 권한이 실행 권한으로 승격된 것이다.

YAGNI 는 "아직 필요 없다"는 판단이지 "영원히 필요 없다"는 선언이 아니다. 그 판단이 적용되던 시스템은 더 이상 존재하지 않는다. 그래서 이 SPEC 은 원문을 지우지 않고 **주석을 붙여 뒤집는다** — 결정의 역사가 읽히도록.

근거 문서: `.moai/reports/t4/sync-audit.md` §F-14 (High, out-of-diff), `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2장·9장.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 멤버 | `room_members` 에 `(room_id, user_id)` 행이 있는 사용자. 그 방의 구성원이다 |
| 비멤버 | 로그인은 했으나 그 방에 행이 없는 사용자. 이 SPEC 이 막는 대상 |
| 생성자 | `rooms.created_by` 가 가리키는 사용자. 방을 만든 사람이며 만드는 순간 멤버가 된다 |
| 초대 (사람) | 기존 멤버가 다른 사용자를 그 방의 멤버로 넣는 것. `POST /api/rooms/:id/members` |
| 초대 (봇) | `SPEC-BOT-001` 의 `POST /api/rooms/:id/invites`. **이 SPEC 과 다른 것이다** — 봇 토큰을 발급한다 |
| 멤버십 술어 | `(방, 사용자)`가 멤버인지 되묻는 함수 하나. 모든 게이트가 이것 하나를 부른다 |
| 게이트 | 멤버십 술어를 걸어 비멤버를 거르는 지점. 라우트 preHandler 또는 함수 본문 안의 검사 |
| 백필 | 스키마 상향 시점에 이미 있던 방·사용자에게 멤버 행을 채워 넣는 1회성 이행 |

## 3. 운영자가 확정한 설계 결정

세 질문에 운영자가 답했다. 이 SPEC 은 그 답을 **재검토하지 않고 부호화한다.** 기각된 대안도 기각 사유와 함께 남긴다 — 나중에 같은 질문이 다시 올라올 때 답을 다시 만들지 않기 위해서다.

### D1 — 멤버십은 어떻게 획득되는가: 생성자 + 초대뿐

| | |
|---|---|
| **채택** | `rooms.created_by` 를 더하고, `POST /api/rooms` 가 만든 사람을 그 자리에서 멤버로 넣는다. 그 뒤로는 **그 방의 기존 멤버만** `POST /api/rooms/:id/members` 로 다른 사람을 넣을 수 있다. 스스로 들어오는 경로는 없다 |
| **기각 — 자율 참가(join) 라우트** | 초대 없이 `POST /api/rooms/:id/join` 으로 들어올 수 있게 하는 안. 감사 기록(누가 언제 들어왔는가)은 남지만 **§1.2 의 사슬은 그대로 성립한다** — 공격자의 요청이 하나 늘어날 뿐 막히지 않는다. 인가처럼 보이면서 인가가 아니다 |
| **기각 — 생성자 전용(초대 없음)** | 방을 만든 사람만 멤버인 안. 검사는 가장 단순하지만 여러 사람이 한 방을 쓰는 것이 원천 금지된다 — `spec-v2.md` 2장의 "소수 그룹" 전제 자체를 부순다 |

### D2 — 게이트 범위: 읽기·쓰기·구독 전부

| | |
|---|---|
| **채택** | POST 메시지 · GET 메시지 · GET 이벤트(SSE) · 판정 수용 네 곳에 멤버십을 걸고, `GET /api/rooms` 를 **호출자가 속한 방으로 좁힌다** |
| **근거** | 승인 누르는 자리 하나만 막으면 `request_id` 는 여전히 읽힌다. 사슬은 **1단계에서** 끊어야 하며, 그러려면 열거(`GET /api/rooms`)와 읽기(GET 메시지·SSE)가 함께 닫혀야 한다 |

### D3 — 기존 데이터: 전원 백필

| | |
|---|---|
| **채택** | 스키마 상향 시점에 **기존 방 × 기존 사용자 전부**를 멤버로 넣는다 |
| **왜** | 넣지 않으면 돌고 있는 서버가 상향 직후 **어느 방에도 멤버가 없는 상태**가 되어, 모든 사람이 자기 방에서 잠겨 나온다. 복구 경로가 없다 (초대는 기존 멤버만 할 수 있으므로 아무도 시작할 수 없다) |
| **정직한 한계** | 이 백필은 **기존 방에 대해서는 보안 이득이 없다.** 상향 전과 똑같이 모두가 모든 옛 방을 읽는다. 조이는 효과는 **상향 이후에 생기는 방**에만 적용된다. 그것이 잠금 방지와 맞바꾼 값이며, 이 문서는 그것을 이득인 척하지 않는다 |
| **1회성 보장** | `db.ts` 의 `SCHEMA` 는 기동할 때마다 무조건 실행된다. 백필이 그 자리에 그냥 들어가면 **탈퇴 기능이 생겼을 때 나간 사람이 재기동마다 되돌아온다.** 그래서 이행 이름을 기록하는 표(`schema_migrations`)를 두고, 이름이 이미 있으면 백필을 건너뛴다. 멱등성은 "여러 번 돌려도 안전"이 아니라 **"두 번째부터는 아무것도 하지 않는다"** 로 확보한다 (REQ-ROOMAUTHZ-003) |

## 4. 선행 SPEC에서 받아 쓰는 것

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `SPEC-CORE-001` | `openDb`, `SCHEMA`, `buildServer` — 이 SPEC 은 `SCHEMA` 를 **바꾼다**(그 SPEC 이후 처음이다. §7 제약 참조) |
| `SPEC-AUTH-001` | `requireAuth` preHandler, `req.user = { id, username }` — 멤버십 검사는 이것 **뒤에** 온다 |
| `SPEC-ROOM-001` | `POST /api/rooms`, `GET /api/rooms`, `registerRoomRoutes(app, opts)` 시그니처 |
| `SPEC-MSG-001` | `POST/GET /api/rooms/:id/messages`, `registerMessageRoutes(app)` 시그니처 |
| `SPEC-SSE-001` | `GET /api/rooms/:id/events` 라우트와 `hub.subscribe` |
| `SPEC-PERM-001` | `PermissionBroker.tryHandleUserReply` — 이 SPEC 이 **시그니처를 바꾼다**(REQ-ROOMAUTHZ-012) |

---

## 5. 요구사항 (GEARS)

### 5.1 데이터 모델

**REQ-ROOMAUTHZ-001** (Ubiquitous)
`server/src/db.ts` 의 `SCHEMA` 는 방 구성원 표 하나를 정의해야 한다. 한 사람이 한 방에 두 번 들어가는 것이 표 차원에서 불가능해야 한다.

```sql
CREATE TABLE IF NOT EXISTS room_members (
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (room_id, user_id)
);
```

복합 기본키가 중복을 막는 자리다. 응용 코드의 "이미 있는지 먼저 조회"에 기대지 않는다 — 동시 요청 둘이 같은 사람을 같은 방에 넣으려 하면 조회-후-삽입은 둘 다 통과한다.

**REQ-ROOMAUTHZ-002** (Ubiquitous)
`rooms` 는 만든 사람을 가리키는 컬럼 `created_by INTEGER REFERENCES users(id)` 를 가져야 한다. 이 컬럼은 **NULL 을 허용한다** — 이 SPEC 이전에 만들어진 방에는 만든 사람의 기록이 없고, 없는 값을 지어내지 않는다.

`created_by` 는 **기록이지 권한이 아니다.** 인가 판정은 전부 `room_members` 로 하며, 어떤 게이트도 `created_by` 를 읽어 통과 여부를 정하지 않는다. 그래야 나중에 생성자가 방을 떠나는 기능이 생겨도 게이트가 흔들리지 않는다.

**REQ-ROOMAUTHZ-003** (When — 스키마가 열릴 때)
`openDb` 가 데이터베이스를 열면, 구현은 다음을 이 순서로 수행해야 한다.

1. `SCHEMA` 실행 (기존 동작 그대로 — `room_members` 와 `schema_migrations` 가 여기서 생긴다)
2. `PRAGMA table_info(rooms)` 로 `created_by` 의 존재를 확인하고, **없을 때만** `ALTER TABLE rooms ADD COLUMN created_by INTEGER REFERENCES users(id)` 를 실행한다
3. `schema_migrations` 에 이행 이름 `roomauthz-001-backfill` 이 **없을 때만** 백필을 실행하고, 성공하면 그 이름을 기록한다

백필의 내용은 "그 시점에 존재하는 모든 방 × 모든 사용자"이며, SQL 한 문장으로 쓴다.

```sql
INSERT OR IGNORE INTO room_members (room_id, user_id) SELECT r.id, u.id FROM rooms r, users u;
```

백필과 이행 이름 기록은 **하나의 트랜잭션**이어야 한다. 갈라지면 백필만 되고 이름이 안 남는 상태(다음 기동에 다시 돎)나 그 반대(백필 없이 완료로 표시됨)가 생긴다.

이행 이름 표는 다음과 같다.

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**왜 `INSERT OR IGNORE` 와 이행 표를 둘 다 두는가.** `OR IGNORE` 는 같은 실행 안의 충돌을 삼키고, 이행 표는 **다음 기동에 다시 도는 것 자체를 막는다.** 앞의 것만 두면 재기동마다 백필이 돌아 탈퇴한 사람이 되돌아오고, 뒤의 것만 두면 부분 실패 시 중복 삽입으로 터진다. 둘은 서로 다른 실패를 막는다.

### 5.2 멤버십의 획득

**REQ-ROOMAUTHZ-004** (When — 방 생성)
`POST /api/rooms` 가 방을 만들면, 서버는 같은 트랜잭션 안에서 `rooms.created_by` 에 `req.user.id` 를 기록하고 `room_members` 에 `(새 방, req.user.id)` 행을 넣어야 한다.

**한 트랜잭션이어야 한다.** 갈라지면 멤버 없는 방이 남을 수 있고, 그 방은 **아무도 들어갈 수 없다** — 초대는 기존 멤버만 할 수 있으므로 복구 경로가 없다. 이 SPEC 에서 가장 비싼 부분 실패다.

응답 본문은 `SPEC-ROOM-001` REQ-ROOM-003 이 고정한 다섯 키(`id, name, status, created_at, archived_at`) 그대로다. `created_by` 를 응답에 **더하지 않는다** — 그 SPEC 의 계약이 다섯 키를 못 박고 있고, 이 SPEC 은 인가를 더할 뿐 응답 모양을 바꾸지 않는다.

**REQ-ROOMAUTHZ-005** (When — 사람 초대)
`POST /api/rooms/:id/members` 요청이 오면, 서버는 호출자가 **그 방의 멤버일 때만** 본문이 지정한 사용자를 그 방의 멤버로 넣어야 한다.

| 항목 | 값 |
|------|-----|
| 본문 | `{ user_id: number }` |
| 성공 | `201`, 본문 `{ ok: true }` |
| 이미 멤버 | `200`, 본문 `{ ok: true, already: true }` — 오류가 아니다 |
| 호출자가 비멤버 | `404`, 본문 `{ error: '방을 찾을 수 없습니다' }` (REQ-ROOMAUTHZ-013) |
| 없는 방 | `404`, 같은 본문 |
| 없는 사용자 | `400`, 본문 `{ error: '사용자를 찾을 수 없습니다' }` |
| 보관된 방 | `409`, 본문 `{ error: '보관된 방에는 초대할 수 없습니다' }` — 단, **멤버인 호출자에게만** 이 코드가 보인다 |

"이미 멤버"가 오류가 아닌 이유: 초대는 사람이 누르는 버튼이고, 두 번 눌렸다고 실패로 보이면 UI 가 없는 문제를 보고한다. 멱등이 옳다.

**REQ-ROOMAUTHZ-006** (Unwanted — shall not)
구현은 **초대 없이 멤버가 되는 경로를 만들어서는 안 된다.** 구체적으로 `POST /api/rooms/:id/join` 류의 자율 참가 라우트를 만들지 않고, 어떤 라우트도 "요청자가 아직 멤버가 아니면 넣어 준다"는 부작용을 가져서는 안 된다.

D1 이 그 대안을 기각했다. 자율 참가는 감사 기록만 남기고 §1.2 의 사슬을 그대로 통과시킨다.

### 5.3 술어와 강제 지점

**REQ-ROOMAUTHZ-007** (Ubiquitous)
멤버십 판정은 **함수 하나**로 표현되어야 하며, 모든 게이트가 그 함수 하나를 불러야 한다. `server/src/room-members.ts` 가 다음을 내보낸다.

```ts
export function isRoomMember(db: Db, roomId: number, userId: number): boolean
export async function requireRoomMember(req: FastifyRequest, reply: FastifyReply): Promise<void>
```

`requireRoomMember` 는 `requireAuth` **다음에** 오는 preHandler 이며, `req.params.id` 를 방 번호로, `req.user!.id` 를 사용자로 읽는다. 통과하지 못하면 `404` 로 끝내고 핸들러를 실행하지 않는다.

**판정 논리를 라우트마다 다시 쓰지 않는다.** 같은 판정이 네 곳에 복사되면 그중 하나만 고쳐지는 날이 오고, 그날 열리는 구멍은 아무 오류도 내지 않는다.

**REQ-ROOMAUTHZ-008** (When — 메시지 전송)
`POST /api/rooms/:id/messages` 가 처리될 때, 서버는 `requireAuth` 통과 직후 그리고 **방 상태(보관 여부)를 확인하기 전에** 멤버십을 확인해야 한다. 비멤버의 요청은 `404` 로 끝나고, `messages`·`attachments`·`message_targets` 어느 표에도 행을 남기지 않으며, multipart 본문을 디스크에 저장하지도 않아야 한다.

순서가 계약이다 — §5.4 REQ-ROOMAUTHZ-013 이 그 이유를 적는다.

**REQ-ROOMAUTHZ-009** (When — 메시지 조회)
`GET /api/rooms/:id/messages` 가 처리될 때, 서버는 호출자가 그 방의 멤버일 때만 메시지를 돌려주어야 한다. 비멤버에게는 `404` 를 돌려주며, **빈 배열을 돌려주어서는 안 된다** — 빈 배열은 "메시지가 없는 방"과 구별되지 않아 방의 존재를 여전히 드러낸다.

**REQ-ROOMAUTHZ-010** (When — 이벤트 구독)
`GET /api/rooms/:id/events` 가 처리될 때, 서버는 호출자가 그 방의 멤버일 때만 스트림을 열어야 한다. 비멤버의 요청은 `reply.hijack()` **이전에** `404` 로 끝나야 하며, `hub.subscribe` 를 불러서는 안 된다.

`hijack()` 뒤에는 Fastify 가 상태 코드를 보내지 않으므로, 순서를 뒤집으면 비멤버가 응답 없이 열린 스트림을 쥐게 된다.

이 라우트의 등록은 `server/src/` 안의 함수 하나로 내보내져야 하며(`registerEventRoute(app: FastifyInstance): void`), `index.ts` 와 테스트 하네스가 **같은 함수**를 불러야 한다. 지금 이 라우트는 `index.ts:57` 에 인라인으로 있고 `server/test/sse.test.ts:30` 과 `server/test/permissions.test.ts:51` 이 각자 사본을 등록한다 — 그 상태로 게이트를 걸면 사본에는 게이트가 없어 **테스트가 프로덕션 동작을 재지 않는다.** 게이트가 통째로 빠져도 테스트는 초록이다.

`SPEC-SSE-001` `spec.md:171` 은 이 라우트가 `:id` 의 실재를 확인하지 않는다고 적었다. 멤버십 검사는 실재하지 않는 방을 자동으로 함께 거른다 — 없는 방에는 멤버 행이 없기 때문이다. 그 SPEC 의 서술은 이 SPEC 으로 대체된다.

**REQ-ROOMAUTHZ-011** (When — 방 목록)
`GET /api/rooms` 는 **호출자가 멤버인 방만** 돌려주어야 한다. 응답 봉투는 `SPEC-ROOM-001` 그대로 `{ active, archived }` 두 배열이며, 각 행의 다섯 키도 그대로다. 바뀌는 것은 **어떤 행이 들어가는가** 하나다.

```sql
SELECT r.id, r.name, r.status, r.created_at, r.archived_at
FROM rooms r JOIN room_members m ON m.room_id = r.id
WHERE m.user_id = ? ORDER BY r.id DESC
```

**REQ-ROOMAUTHZ-012** (When — 판정 수용)
권한 판정은 **답한 사람이 그 방의 멤버일 때만** 소비되고 전송되어야 한다. 이를 위해 `PermissionBroker.tryHandleUserReply` 의 시그니처가 바뀐다.

```ts
// 바뀌기 전 (SPEC-PERM-001 REQ-PERM-004 가 글자 그대로 고정한 형태)
tryHandleUserReply(roomId: number, text: string): boolean

// 바뀐 뒤 (이 SPEC)
tryHandleUserReply(roomId: number, userId: number, text: string): boolean
```

`userId` 는 누른 사람이며, 호출부(`server/src/routes-messages.ts`)가 `req.user!.id` 를 넘긴다. 브로커는 정규식 판정과 방 대조 사이에서 멤버십을 확인하고, 멤버가 아니면 `false` 를 돌려주며 **대기 항목을 소모하지 않는다.**

**이것은 `SPEC-PERM-001` REQ-PERM-004 의 개정이다.** 그 요구사항은 위 인터페이스를 글자 그대로 고정했으므로, 인자를 더하는 순간 그 요구사항이 거짓이 된다. 개정 사실은 그 SPEC 문서에 주석으로 기록한다(§6 참조).

**라우트가 이미 막는데 브로커가 왜 또 보는가.** REQ-ROOMAUTHZ-008 의 게이트가 있으면 브로커에 도달하는 요청은 이미 멤버의 것이다. 그럼에도 브로커가 스스로 확인하는 이유는 두 가지다 — (1) 브로커는 라우트 하나에만 결합된 부품이 아니고, 두 번째 호출부가 생기는 날 라우트의 게이트는 그 경로를 보호하지 않는다. (2) 게이트가 실수로 제거됐을 때 **판정이라는 가장 비싼 동작**만은 여전히 막힌다. 두 검사는 서로의 백스톱이며, 이는 `SPEC-MSG-001` 의 쓰기 봉인·읽기 봉인(REQ-MSG-007·009)이 이미 쓰는 형태다.

### 5.4 금지 조항

**REQ-ROOMAUTHZ-013** (Unwanted — shall not)
서버는 **비멤버에게 방의 존재 여부를 드러내서는 안 된다.** 비멤버의 방 범위 요청에 대한 응답은 없는 방에 대한 응답과 **구별 불가능**해야 한다 — 상태 코드 `404`, 본문 `{ error: '방을 찾을 수 없습니다' }`.

따라서 멤버십 검사는 **방 상태 검사보다 먼저** 온다. 뒤에 두면 비멤버가 `409`(보관됨)와 `404`(없음)를 구별할 수 있고, 그 차이 하나로 방의 실재가 새어 나간다.

**받아들인 정보 누출을 명시한다.** `403`(자격 없음) 대신 `404` 를 고른 대가는 **진단 가능성**이다. 초대받지 못한 사람은 "그런 방이 없다"와 "그 방에 초대되지 않았다"를 구별할 수 없고, 방 번호를 잘못 받은 사람은 스스로 원인을 알 수 없어 초대한 사람에게 물어야 한다. 그 비용을 치르고 얻는 것은 §1.2 사슬의 2-3단계 차단이다 — `403` 은 계정만 있으면 누구에게나 "이 번호에 방이 있다"를 확인해 주고, 그것이 열거의 출발점이다. 인가 결함을 닫으러 온 SPEC 이 열거 통로를 열어 둘 수는 없다.

**REQ-ROOMAUTHZ-014** (Unwanted — shall not)
비멤버의 판정 답은 **소비되어서도, 전송되어서도, 대기 항목을 변경해서도 안 된다.** 비멤버가 유효한 `yes <request_id>` 를 보내도 봇에게 어떤 판정도 가지 않아야 하고, 그 대기 항목은 레지스트리에 그대로 남아 **멤버가 여전히 판정할 수 있어야** 한다.

뒤 절이 이 요구사항의 본체다. "비멤버의 답이 전달되지 않았다"만 재는 검사는 **모든 판정을 죽인 구현**도 통과시킨다.

**REQ-ROOMAUTHZ-015** (Unwanted — shall not)
이 SPEC 은 **봇 경로의 인가를 바꾸지 않는다.** `server/src/gateway.ts` 의 토큰 인증, `bot_tokens` 를 통한 (방, 봇) 결합, `deliver`·`sendToBot`·`closeRoom`·`history_request` 의 동작은 그대로다. 봇은 사람이 아니므로 `room_members` 에 들어가지 않으며, 봇의 방 접근 자격은 지금처럼 토큰이 정한다.

`SPEC-BOT-001` 의 봇 초대 라우트(`POST /api/rooms/:id/invites`)도 이 SPEC 이 게이트를 걸지 않는다 — D2 가 확정한 범위 다섯 곳에 들어 있지 않다. 남는 것은 §8 에 잔여 위험으로 기록한다.

**REQ-ROOMAUTHZ-016** (Unwanted — shall not)
이 SPEC 의 구현은 `server/` 밖의 파일을 바꾸어서는 안 된다. `web/` 과 `channel/` 은 손대지 않는다. 형제 SPEC 문서에 다는 개정 주석(§6)은 문서 편집이며 이 조항이 말하는 소스 변경이 아니다.

---

## 6. 이 SPEC 이 거짓으로 만드는 형제 문서의 진술

아래 진술은 이 SPEC 이 구현되는 순간 **거짓이 된다.** 원문을 지우지 않고 개정 주석을 달아 뒤집는다 — 결정의 역사가 읽혀야 하기 때문이다.

| 문서 | 위치 | 지금 무엇을 주장하는가 | 이 SPEC 이후 |
|------|------|----------------------|-------------|
| `.moai/plan/2026-08-26-minidiscord/spec-v2.md` | `:32` | 방별 접근 권한은 없음 — YAGNI | 뒤집힘. §1.3 이 근거 |
| `SPEC-PERM-001/spec.md` | `:149` | 멤버십 개념이 없어 경계는 "로그인했는가" 하나 | 경계가 둘이 됐다 — 로그인 + 멤버십 |
| `SPEC-PERM-001/spec.md` | `:172` | 방 멤버십 검사는 범위 밖 (검사할 대상이 없음) | 대상이 생겼고 이 SPEC 이 만든다 |
| `SPEC-PERM-001/spec.md` | REQ-PERM-004 | `tryHandleUserReply(roomId, text)` 를 글자 그대로 고정 | 인자가 셋으로 개정 (REQ-ROOMAUTHZ-012) |
| `SPEC-PERM-001/plan.md` | `:130`, `:134` | 멤버십은 스키마에 대상이 없어 만들 수 없다 | 스키마가 바뀐다 |
| `SPEC-PERM-001/acceptance.md` | `:387` | 이 기준이 거는 경계는 로그인 하나 | AC-PERM-009 의 **전제가 무효화된다**(아래) |
| `SPEC-MSG-001/spec.md` | `:173` | 로그인한 사람은 어느 방이든 읽고 쓴다 | 멤버인 방만 |
| `SPEC-MSG-001/plan.md` | `:103`, `:106` | 소유자 컬럼 없음 / 방별 권한 YAGNI | 둘 다 뒤집힘 |
| `SPEC-MSG-001/acceptance.md` | `:519` | 남의 방을 읽는 것은 **의도된 동작**이며 수용된 잔여 위험 | 의도된 동작이 아니게 됐다. AC-MSG-012 의 **전제가 무효화된다** |
| `SPEC-SSE-001/spec.md` | `:171` | 방 존재 검증을 하지 않는다 (수용된 설계) | 멤버십 검사가 실재하지 않는 방을 함께 거른다 |
| `SPEC-SSE-001/plan.md` | `:84`, `:265` | 방이 없어도 404 를 내지 않는다 | 비멤버·미실재 모두 404 |
| `SPEC-ROOM-001/spec.md` | `:184` | 방별 접근 권한은 YAGNI 로 배제 | 뒤집힘 |
| `SPEC-ROOM-001/plan.md` | `:140` | `403` 이 가리킬 권한 차원이 이 시스템에 없다 | 권한 차원이 생겼다. 다만 이 SPEC 은 `403` 대신 `404` 를 쓴다(REQ-ROOMAUTHZ-013) |
| `SPEC-BOT-001/spec.md` | `:45`, `:168` | 소유자 컬럼 없음 / 방별 권한 YAGNI | `created_by` 가 생긴다. 단 봇 초대 라우트에는 게이트를 걸지 않는다(REQ-ROOMAUTHZ-015) |
| `SPEC-BOT-001/plan.md` | `:70`, `:179` | `403` 이 가리킬 대상이 없다 | 위와 같다 |
| `SPEC-BOT-001/acceptance.md` | `:130` | 권한 차원이 없어 `403` 이 의미가 비어 있다 | 위와 같다 |
| `SPEC-AUTH-001/spec.md` | `:181` | 방별 접근 권한은 YAGNI 로 배제 | 뒤집힘 |
| `SPEC-AUTH-001/plan.md` | `:31` | `rooms` 에 소유자 컬럼이 없어 `req.user` 를 두 필드로 고정 | 컬럼이 생겼으나 `req.user` 는 그대로 두 필드다 — 멤버십은 표로 조회한다 |
| `SPEC-CORE-001/spec.md` | `:93` | 방 멤버십을 범위 밖으로 두었으므로 루프백 바인드로 전제를 지킨다 | 멤버십이 생겼다. 루프백 기본값은 **그대로 유지**한다 |

### 전제가 무효화되는 수용 기준 둘 — 조용히 고치지 않는다

두 기준은 문장을 바꾸지 않아도 **그것이 무엇을 증명하는가**가 달라진다. 명시적으로 이름을 부른다.

- **AC-MSG-012** (`SPEC-MSG-001/acceptance.md:519` 의 주석이 달린 기준, "all three message routes reject unauthenticated requests"). 이 기준의 대조군은 "인증된 사용자는 성공한다"인데, 그 사용자는 방을 직접 `INSERT` 로 만든 비멤버다. **이 SPEC 이후 이 기준은 정상 구현에서 실패한다.** 기준의 의도(인증 경계)는 여전히 옳으므로 폐기하지 않고, 하네스가 대조군 사용자를 멤버로 만들도록 고쳐야 한다 — 그것은 이 SPEC 의 run 단계 작업이며 `plan.md` §D 에 목록으로 있다.
- **AC-PERM-009** (`SPEC-PERM-001/acceptance.md:387`, "refuses an unauthenticated verdict and leaves the request pending"). 같은 이유로 대조군(인증된 답이 전달됨)이 깨진다. 인증 경계 자체는 그대로 유효하다.

두 기준을 **말없이 다시 쓰지 않는다.** 다시 쓰면 "원래 그랬던 것"처럼 보이고, 다음 감사자가 무엇이 왜 바뀌었는지 알 수 없다.

---

## 7. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자 또는 배제 근거를 명시한다.

### Out of Scope — 웹 UI (후속 카드)

- **초대 화면.** 방 설정에서 사용자를 검색해 초대하는 UI, 멤버 목록 표시, 나가기 버튼. 이 SPEC 은 `POST /api/rooms/:id/members` 라우트까지만 만든다 — 지금은 사람이 직접 호출해야 초대가 된다
- 비멤버 `404` 를 사람이 읽을 수 있는 문구로 바꾸는 처리, 목록이 좁아진 뒤의 빈 화면 안내

### Out of Scope — 채널 플러그인 (`channel/`)

- `channel/` 패키지의 어떤 파일도 바꾸지 않는다. 봇 쪽 인가는 게이트웨이 토큰이 정하며 이 SPEC 의 대상이 아니다 (REQ-ROOMAUTHZ-015)

### Out of Scope — 멤버십의 나머지 생애

- **탈퇴·추방.** `DELETE /api/rooms/:id/members/:userId` 를 만들지 않는다. 다만 REQ-ROOMAUTHZ-003 의 1회성 이행 표는 **그 기능이 생겼을 때 나간 사람이 되돌아오지 않도록** 미리 대비해 둔 것이다
- **역할·등급.** 소유자/관리자/일반 같은 구분을 두지 않는다. 멤버는 전부 같은 권한이며, 멤버라면 누구나 초대할 수 있다 (D1)
- **초대 기록.** 누가 누구를 언제 초대했는지는 `room_members.created_at` 이 시각만 남긴다. 초대한 사람은 기록하지 않는다

### Out of Scope — 이 SPEC 이 닫지 않는 읽기 경로

- **`GET /api/attachments/:id`.** 첨부는 방이 아니라 첨부 번호로 조회되며, 이 라우트에는 멤버십 게이트를 걸지 않는다. D2 가 확정한 범위 다섯 곳에 없기 때문이다. 결과적으로 **첨부 번호를 아는 비멤버는 그 파일을 여전히 내려받을 수 있다.** 번호는 1부터 증가하는 정수라 추측 가능하다. 이것은 이 SPEC 이 남기는 가장 큰 구멍이며 §8 에 잔여 위험으로 올린다 — 후속 카드가 필요하다
- **`POST /api/rooms/:id/invites` (봇 초대)와 `POST /api/rooms/:id/archive`.** 같은 이유로 게이트를 걸지 않는다. 비멤버가 남의 방에 봇을 초대하거나 남의 방을 보관할 수 있는 상태가 남는다

### Out of Scope — 인증 계층

- 세션 만료, CSRF, HTTPS 강제. `SPEC-AUTH-001` 과 `SPEC-CORE-001` 이 각각 범위 밖으로 두었고 이 SPEC 도 바꾸지 않는다. 이 SPEC 은 **인증이 아니라 인가**를 다룬다

---

## 8. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 새 의존성을 추가하지 않는다. `fastify ^5`, `@fastify/cookie`, `@fastify/multipart`, `better-sqlite3`, `ws`, `vitest` 를 그대로 쓴다.
- **이 SPEC 은 `server/src/db.ts` 의 `SCHEMA` 를 바꾼다.** 형제 SPEC 다수가 스키마 불변을 자기 조항으로 금지했으나(`REQ-PERM-014`, `REQ-MSG-014`, `REQ-BOT-009`, `REQ-AUTH-015`), 그 조항들은 **자기 SPEC 의 구현**을 구속하는 것이지 이후 SPEC 을 구속하는 것이 아니다. 이 SPEC 은 스키마 변경을 자기 범위로 명시하고 그 변경 방식(REQ-ROOMAUTHZ-003)을 요구사항으로 못 박는다.
- 기존 표의 컬럼을 **지우거나 이름을 바꾸지 않는다.** 더하는 것만 한다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- UI 문구(오류 본문 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).
- 기존 응답 봉투를 바꾸지 않는다 — `GET /api/rooms` 는 `{ active, archived }`, 방 행은 다섯 키, 오류는 `{ error }`.

---

## 9. 잔여 위험

| 위험 | 성질 | 처리 |
|------|------|------|
| `GET /api/attachments/:id` 가 열려 있다 | 비멤버가 번호를 추측해 남의 방 첨부를 내려받는다. 번호는 순차 증가 정수 | **수용하지 않음 — 후속 카드 필요.** D2 범위 밖이라 이 SPEC 이 닫지 않는다. 읽기 경로가 하나 남아 있음을 명시한다 |
| 봇 초대·방 보관 라우트가 열려 있다 | 비멤버가 남의 방에 봇을 넣거나 남의 방을 보관한다 | 위와 같다. D2 범위 밖 |
| 백필이 기존 방에 아무 보안 이득을 주지 않는다 | 상향 전 방은 여전히 전원 공개 | **수용.** D3 이 잠금 방지와 맞바꾼 값이며, 그 사실을 §3 D3 에 정직하게 적었다 |
| 멤버 없는 방이 생긴다 | 아무도 들어갈 수 없고 복구 경로가 없다 | REQ-ROOMAUTHZ-004 의 단일 트랜잭션이 막는다. AC 가 부분 실패를 직접 잰다 |
| `404` 가 진단을 어렵게 한다 | 초대받지 못한 사람이 원인을 스스로 알 수 없다 | **수용.** REQ-ROOMAUTHZ-013 이 그 대가를 명시했다 |
| 게이트를 라우트마다 따로 쓴다 | 하나만 고쳐지는 날 조용히 열린다 | REQ-ROOMAUTHZ-007 이 술어 하나를 강제한다 |
| 형제 SPEC 의 기존 테스트가 대량 실패한다 | run 단계가 "구현이 틀렸다"로 오진할 수 있다 | `plan.md` §D 가 깨질 테스트를 **파일·이름 단위로 미리 열거한다.** 목록 밖의 실패만 결함으로 본다 |

---

## 10. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어지며, **모든 게이트 기준은 부정 사례(비멤버가 거부됨)와 대조군(멤버는 성공함)을 함께 갖는다** — 모두를 거부하는 구현이 통과하지 못하게 하기 위해서다.

## 11. 참조

- `.moai/reports/t4/sync-audit.md` §F-14 — 이 SPEC 의 발단
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2장·9장 — 뒤집는 대상 원문
- `.moai/specs/SPEC-CORE-001/` — 스키마와 `buildServer`
- `.moai/specs/SPEC-AUTH-001/` — `requireAuth`, `req.user`
- `.moai/specs/SPEC-ROOM-001/` — 방 생성·목록·보관
- `.moai/specs/SPEC-MSG-001/` — 메시지 라우트
- `.moai/specs/SPEC-SSE-001/` — 이벤트 스트림
- `.moai/specs/SPEC-PERM-001/` — 권한 릴레이 (REQ-PERM-004 개정 대상)
- 칸반 카드 `t11`
