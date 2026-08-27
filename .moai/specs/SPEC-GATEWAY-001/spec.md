---
id: SPEC-GATEWAY-001
title: "minidiscord 봇 게이트웨이 — WebSocket 접속·재접속 복구·이력 조회"
version: "0.3.0"
status: completed
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "websocket, bot-gateway, token-auth, cursor-replay, since-id, history, permission-relay"
tier: L
depends_on: [SPEC-CORE-001, SPEC-BOT-001, SPEC-MENTION-001, SPEC-SSE-001]
---

# SPEC-GATEWAY-001 — 봇 게이트웨이 (WebSocket 서버)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 8 과 `spec-v2.md` 6장에서 도출 (칸반 카드 `t3`, 마일스톤 M3). 2026-08-26 에 추가된 `since_id` 커서 개정(`plan-v2.md` 계획 자기 검토 결과 항목)을 일급 요구사항 REQ-GW-015 로 반영했다. 요구사항 23개·수용 기준 20개 — Tier L 상한 25/25 안이다. | manager-spec |
| 0.2.0 | 2026-08-27 | **plan-audit 교정 라운드.** `.moai/reports/t3-plan-audit-a.md` 가 이 SPEC 을 CONDITIONAL PASS 로 판정하고 차단 3건(M5·M6·M7)을 지적했다. 전부 반영했다. **M5** — 공통 하네스의 `wsConnect` 가 `welcome` 직후 도착하는 프레임을 흘려 AC-GW-003 이 **구현이 옳아도** 간헐 실패할 수 있었다(두 프레임이 한 TCP 세그먼트로 합쳐지는 경우). 접속 시점부터 프레임을 큐에 쌓는 구조로 바꿨다. **M6** — REQ-GW-001 이 요구하는 `last_seen_at` 갱신을 관측하는 기준이 하나도 없어, 그 갱신을 통째로 생략한 구현이 스무 기준을 전부 통과했다. AC-GW-001 에 접속 전 `null` → 접속 후 채워짐 분별을 더했다. **M7** — 엣지 케이스 표가 인용한 코드(`JSON.parse` 를 인자 위치에서 호출)로는 표가 주장하는 동작이 나오지 않았고 관측하는 기준도 없었다. 구현 지시를 `try/catch` 로 고치고(`plan.md` §D 8번, REQ-GW-004 에 명문화) AC-GW-002 에 다섯 번째 거절 경로로 관측을 추가했다. 감사 §3-1(형제 SPEC 실행 순서에 따라 AC-GW-019 의 고정 파일 목록이 통제 밖 이유로 실패)도 함께 반영했다. 요구사항 23개·수용 기준 20개로 개수는 그대로다. | manager-spec |
| 0.3.0 | 2026-08-27 | **재감사 후 잔여 결함 1건 반영 (감사 §3-2).** 세 차단(M5·M6·M7)은 재감사에서 RESOLVED 로 확인됐고, v0.2.0 에서 판단 요청으로 남겨 뒀던 항목 하나를 닫는다. REQ-GW-010 이 `attachments.size`·`mime` 의 출처를 말하지 않았는데 두 컬럼 모두 스키마에서 `NOT NULL` 이라(`server/src/db.ts:60-61`), 요건대로만 구현하면 INSERT 가 제약 위반으로 던지고 그 예외를 REQ-GW-011 의 건너뛰기 `catch` 가 삼켜 **파일이 멀쩡한데도 첨부가 조용히 사라진다.** 설계 판단이 필요한 자리가 아니어서 원본이 이미 정한 값을 명문화했다 — `size` 는 복사 시점에 읽은 원본의 바이트 크기(`plan-v2.md:1534`), `mime` 은 상수 `'application/octet-stream'`(`plan-v2.md:1537-1538`). REQ-GW-010 에 다섯 컬럼 출처 표를 넣고, 게이트웨이의 상수 `mime` 이 `SPEC-MSG-001` 의 확장자 판정과 **의도적으로 다르다**는 것을 함께 적었다. AC-GW-007 이 첨부 행 존재 + `size` 가 원본 바이트 길이(상수·`0`·문자 길이 모두 배제) + `mime` 상수를 관측한다. 요구사항 23개·수용 기준 20개로 개수는 그대로다. | manager-spec |

---

## 1. 배경과 목적

카드 `t3` 는 마일스톤 M3 이며, 서버가 **봇을 맞이하는 창구**를 만든다. 여기까지 오면 사람 쪽 절반(인증·방·봇 초대)은 카드 `t2` 가 끝냈고, 발급된 토큰을 들고 올 상대가 없는 상태다. 이 SPEC 이 그 상대를 받는다.

```
카드 t2 (M2)                                  카드 t3 (M3, 이 SPEC 이 속한 카드)
SPEC-AUTH-001 → SPEC-ROOM-001 → SPEC-BOT-001  →  SPEC-MENTION-001
                                                  SPEC-SSE-001
                                                  SPEC-GATEWAY-001 (이 SPEC — 카드 안 마지막)
```

이 SPEC 이 끝나면, 가짜 채널 클라이언트가 `ws://127.0.0.1:<port>/bot` 에 붙어 `hello { token }` 하나로 자기가 어느 방의 어느 봇인지 판정받고, 끊겼던 동안 자기 앞으로 온 메시지를 중복 없이 이어받고, 답장을 보내고, 지나간 대화를 번호 커서로 따라잡을 수 있다. 실제 Claude 세션은 필요 없다 — `spec-v2.md` 10장이 정한 테스트 전략 그대로다.

**이 SPEC 은 카드 `t3` 안에서 세 번째이자 마지막이다.** `SPEC-MENTION-001`(`mention.ts` 순수 파서)과 `SPEC-SSE-001`(`sse.ts` 허브)이 먼저 끝나야 한다. 게이트웨이는 봇이 보낸 메시지와 상태 변화를 웹 UI 로 흘려보낼 때 `app.hub` 를 쓰고(REQ-GW-010·012), 멘션 파서는 다음 SPEC 의 `routes-messages.ts` 가 `deliver()` 를 호출할 때 쓴다.

게이트웨이는 **다음 세 단계가 전부 매달리는 계약면**이다. 카드 `t4` 의 채널 플러그인은 여기 정의된 프로토콜 메시지를 그대로 구현하고, 다음 SPEC 의 `routes-messages.ts` 는 `Gateway.deliver()` 를 호출하며, 권한 릴레이는 `setPermissionHandler` / `sendToBot` 두 메서드에 붙는다. 그래서 §4.8 이 `Gateway` 인터페이스 시그니처를 글자 그대로 고정한다 — 나중에 바꾸면 소비자 세 곳이 동시에 깨진다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 8, `spec-v2.md` 3장(다중 봇 접속)·6장(게이트웨이 프로토콜)·8장(에러 처리)·9장(보안)·10장(테스트 전략).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 접속(connection) | `/bot` 으로 열린 WebSocket 하나. `hello` 가 성공한 뒤에만 (방, 봇) 이 붙는다 |
| 접속 목록(registry) | `Map<WebSocket, ConnInfo & { tokenRowId: number }>`. 서버 메모리에만 있고 재시작하면 비는 것이 정상이다 |
| 커서 | `messages.id`. 방마다 단조 증가하는 번호이며, 재접속 복구(`missed_after_id`)와 대화 따라잡기(`since_id`)가 **같은 번호 체계 하나**를 쓴다 (`spec-v2.md:154`) |
| `last_delivered_id` | `bot_tokens` 의 컬럼. 그 (방, 봇) 에게 마지막으로 보낸 메시지 번호. 중복 전달을 막는 유일한 근거다 |
| 놓친 메시지 재전송(replay) | `hello` 직후, 그 봇이 타깃인 메시지 중 커서 이후 것을 번호 오름차순으로 다시 보내는 것 |
| 타깃(target) | `message_targets` 의 한 행. `delivery` 는 `'to'` 또는 `'cc'` |
| 온라인 | 그 (방, 봇) 조합의 접속이 접속 목록에 하나라도 있는 상태. `isOnline()` 이 판정한다 |
| 이력 줄 형식 | 채널 플러그인이 만드는 `#<번호> [시각] 작성자: 본문` 문자열. **서버는 이 문자열을 만들지 않고** 그 네 조각을 필드로 내려보낸다 (REQ-GW-016) |

## 3. 선행 SPEC에서 받아 쓰는 것

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `SPEC-CORE-001` | `openDb`, 여덟 테이블 스키마(`bot_tokens` / `messages` / `message_targets` / `attachments`), `config.uploadsDir`, `buildServer` |
| `SPEC-BOT-001` | `sha256Hex(s: string): string` — `routes-bots.ts` 가 내보내는 그 함수를 **그대로** 재사용한다. 해시 방식이 갈라지면 발급된 토큰이 전부 무효가 된다 |
| `SPEC-BOT-001` | `bot_tokens` 행의 의미 — `revoked_at IS NULL` 이 활성, `token_hash` 가 조회 키, `online` 필드는 이 SPEC 이 채우기로 예약된 자리 |
| `SPEC-SSE-001` | `app.hub` (`SseHub.publish(roomId, event, data)`) — 봇 발신 메시지와 상태 변화를 웹 UI 로 흘려보내는 유일한 경로 |
| `SPEC-ROOM-001` | `registerRoomRoutes(app, { onArchive })` 훅 — 방 보관 시 그 방 소켓을 끊는 데 쓴다 |

`SPEC-MENTION-001` 은 이 SPEC 이 직접 호출하지 않는다. 같은 카드 안에서 순서상 앞설 뿐이며, `deliver()` 의 호출자가 되는 것은 다음 SPEC 의 `routes-messages.ts` 다. `depends_on` 에 넣은 이유는 카드 안 실행 순서를 고정하기 위해서다.

---

## 4. 요구사항 (GEARS)

### 4.1 접속과 인증

**REQ-GW-001** (When — 이벤트 구동)
`/bot` 접속이 `hello { token }` 을 보내면, 서버는 `sha256Hex(token)` 으로 `bot_tokens` 를 조회해 `revoked_at IS NULL` 이고 방이 `status='active'` 인 행을 찾은 경우에만, 그 접속을 접속 목록에 `{ roomId, botId, tokenRowId }` 로 등록하고 `bot_tokens.last_seen_at` 을 갱신한 뒤 `welcome { room_id, bot_id, bot_name, missed_after_id }` 를 보내야 한다. `missed_after_id` 는 그 행의 `last_delivered_id` 다. 방과 봇은 요청에 실린 값이 아니라 **토큰이 결정한다** (`spec-v2.md` 9장 — "방 ID 가 아니라 토큰으로 식별한다").

**REQ-GW-002** (Unwanted — shall not)
다음 세 경우의 `hello` 는 `welcome` 을 받아서는 안 되며 접속이 닫혀야 한다. 어느 경우에도 접속 목록에 항목이 생겨서는 안 된다.

| 감지된 상황 | 판정 근거 |
|-------------|-----------|
| 그 해시의 `bot_tokens` 행이 없다 | 조회 결과 없음 |
| 그 행의 `revoked_at` 이 채워져 있다 | 철회된 초대 |
| 그 행의 방이 `status='archived'` 다 | 보관된 방 |

**REQ-GW-003** (Unwanted — shall not)
`hello` 로 인증되지 않은 접속이 보낸 어떤 메시지도 처리되어서는 안 된다. 서버는 그 접속을 닫아야 하고, 데이터베이스에 어떤 행도 남겨서는 안 된다.

**REQ-GW-004** (Ubiquitous)
게이트웨이는 Fastify 의 HTTP 서버(`app.server`)에 경로 `/bot` 으로만 붙는다. 모든 프로토콜 메시지는 `type` 필드를 가진 JSON 한 덩어리다. **파싱할 수 없는 프레임은 그 접속을 닫는 것으로 처리해야 하며, 파싱 예외가 처리되지 않은 채 밖으로 새어 나가서는 안 된다** (구현 형태는 `plan.md` §D 8번). `app` 이 닫히면(`onClose`) 게이트웨이는 열린 접속을 전부 닫고 WebSocket 서버를 닫아야 한다 — 테스트가 좀비 프로세스를 남기지 않는 조건이다.

### 4.2 재접속 복구 (커서)

**REQ-GW-005** (When — 이벤트 구동)
`welcome` 을 보낸 직후, 서버는 그 봇이 **타깃인** 메시지(`message_targets.bot_id` 가 그 봇) 중 같은 방이고 `id > last_delivered_id` 인 것을 **번호 오름차순으로** `message { type, id, body, author_name, delivery, files }` 로 다시 보내야 한다. 하나라도 보냈다면 `last_delivered_id` 를 마지막으로 보낸 번호로 올려야 한다.

**REQ-GW-006** (Unwanted — shall not)
재전송은 **중복을 만들어서는 안 된다**. 커서 이하인 메시지, 그 봇이 타깃이 아닌 메시지, 다른 방의 메시지는 재전송되어서는 안 된다. 한 번 전달돼 커서가 올라간 메시지는 그 뒤 몇 번을 재접속해도 다시 오지 않아야 한다 (`spec-v2.md` 8장 — "중복 전달: 방별 증가 커서 `id` 로 재접속 시 중복 없이 이어받기").

### 4.3 전달 (`deliver`)

**REQ-GW-007** (When — 이벤트 구동)
`deliver(roomId, msg, targets)` 가 호출되면, 서버는 그 방의 접속 중 `targets` 에 `botId` 가 있는 접속에만 `message` 를 보내고, **보낸 접속의** `bot_tokens.last_delivered_id` 를 `msg.id` 로 갱신해야 한다.

**REQ-GW-008** (Unwanted — shall not)
`deliver` 는 타깃이 아닌 봇이나 다른 방의 접속에 메시지를 보내서는 안 되며, 그런 접속의 커서를 갱신해서도 안 된다. 오프라인인 타깃 봇의 커서도 갱신해서는 안 된다 — 그래야 REQ-GW-005 의 재전송이 성립한다.

**REQ-GW-009** (Ubiquitous)
`message` 페이로드의 `delivery` 는 그 봇에 대한 `targets` 항목의 값(`'to'` 또는 `'cc'`)이어야 하며, 봇마다 다를 수 있다. `files` 는 그 메시지의 `attachments` 행을 `{ name: filename, local_path: stored_path }` 로 옮긴 배열이다. 첨부가 없으면 빈 배열이다.

### 4.4 봇 발신 (`bot_message`)

**REQ-GW-010** (When — 이벤트 구동)
인증된 접속이 `bot_message { body, files }` 를 보내면, 서버는 `messages` 에 `author_type='bot'`, `author_bot_id=<그 봇>` 행을 넣고, 각 `files[].local_path` 를 `opts.uploadsDir` 아래 `<randomUUID>-<원본파일명>` 으로 **복사**한 뒤 `attachments` 행을 넣고, 마지막으로 `hub.publish(roomId, 'message', { ...row, author_name, attachments })` 를 호출해야 한다. 원본 파일은 그대로 남는다(이동이 아니라 복사).

`attachments` 행의 다섯 컬럼은 다음에서 온다. `size` 와 `mime` 은 스키마에서 `NOT NULL` 이므로(`server/src/db.ts:60-61`) 값을 빠뜨리면 INSERT 가 제약 위반으로 실패하고, 그 예외가 REQ-GW-011 의 건너뛰기 `catch` 에 삼켜져 **첨부가 조용히 사라진다**. 그래서 출처를 요구사항으로 못 박는다.

| 컬럼 | 값 |
|------|-----|
| `filename` | `files[].name`, 없으면 `basename(local_path)` |
| `stored_path` | 복사본 경로 (`<uploadsDir>/<randomUUID>-<원본파일명>`) |
| `size` | 복사 시점에 읽은 **원본 파일의 바이트 크기** (`statSync(local_path).size` — `plan-v2.md:1534`) |
| `mime` | 상수 `'application/octet-stream'` (`plan-v2.md:1537-1538`) |
| `message_id` | 방금 넣은 메시지 행의 `id` |

`mime` 이 상수인 것은 의도된 것이다. 게이트웨이는 파일 내용을 스니핑하지도, 확장자로 추론하지도 않는다 — 봇이 보낸 로컬 경로를 그대로 복사할 뿐이다. **HTTP 업로드 경로(`SPEC-MSG-001`)는 다르다**: 그쪽은 확장자로 `mime` 을 판정한다. 두 경로가 같은 테이블에 서로 다른 규칙으로 쓰는 것이 정상이며, 게이트웨이 쪽을 확장자 판정으로 "맞추려" 해서는 안 된다.

**REQ-GW-011** (When — 파일 부재 감지)
`files[].local_path` 가 읽히지 않으면 서버는 **그 첨부 하나만 건너뛰고** 나머지 처리를 계속해야 한다. 메시지 행은 그대로 저장되고, 같은 요청의 다른 정상 파일은 정상적으로 첨부된다 (`spec-v2.md` 8장 — "봇 발신 경로가 없으면 해당 첨부만 건너뛰고 안내").

### 4.5 상태와 온라인 판정

**REQ-GW-012** (When — 이벤트 구동)
인증된 접속이 `status { state }` 를 보내고 `state` 가 `'working'` 또는 `'idle'` 이면, 서버는 `hub.publish(roomId, 'bot_status', { bot_id, state })` 를 호출해야 한다. 그 밖의 값은 무시하고 아무것도 발행해서는 안 된다.

**REQ-GW-013** (Ubiquitous)
`isOnline(roomId, botId)` 는 그 (방, 봇) 조합의 접속이 접속 목록에 하나라도 있으면 `true`, 없으면 `false` 를 돌려준다. 판정 근거는 **접속의 존재**이지 마지막 `status` 값이 아니다. 서버 재시작으로 접속 목록이 비면 전부 `false` 가 되는 것이 정상이다 (`spec-v2.md` 8장 — 오프라인은 정상 상태).

### 4.6 이력 조회 (`history_request`)

**REQ-GW-014** (When — 이벤트 구동)
인증된 접속이 `history_request { rid, since_id?, since?, until?, speaker?, limit? }` 를 보내면, 서버는 그 방의 메시지를 **번호 오름차순으로** `history_response { rid, messages }` 로 돌려줘야 한다. `rid` 는 요청의 값을 그대로 되돌린다. `limit` 은 기본 `100`, 상한 `500` 이며 **최근 N 개를 먼저 자른 뒤** 나머지 필터를 적용한다(§6 의 제약에 기록된 계약).

**REQ-GW-015** (When — `since_id` 커서, v2 개정)
`history_request` 에 `since_id` 가 있으면, 응답의 **모든** 메시지는 `id > since_id` 를 만족해야 한다. `since_id` 가 가리키는 번호와 그 이하의 메시지는 하나도 실려서는 안 된다.

이 번호는 새 개념이 아니다. `missed_after_id` 가 쓰는 것과 **같은 커서**이며 (`spec-v2.md:154` — "재접속 복구와 대화 따라잡기가 하나의 커서 체계를 쓴다"), 봇이 멘션 없이 오간 대화를 스스로 따라잡을 때 "그 번호 다음부터"를 정확히 지정하는 수단이다. 시각(`since`)만으로는 같은 초에 여러 메시지가 있을 때 경계를 가를 수 없어 추가됐다 (`plan-v2.md` 계획 자기 검토 결과 — `since_id` 커서, 2026-08-26).

**REQ-GW-016** (Ubiquitous)
`history_response.messages` 의 각 항목은 `id`, `author_name`, `body`, `created_at` **네 필드를 모두** 담아야 한다. 채널 플러그인(카드 `t4`)이 만드는 이력 줄 `#<번호> [시각] 작성자: 본문` 의 네 조각이 정확히 이것이며, 하나라도 빠지면 그 줄을 만들 수 없다. **서버는 그 문자열을 만들지 않는다** — 조립은 채널의 몫이다.

`author_name` 은 `author_type` 에 따라 해석한다: `'user'` 면 `users.username`, `'bot'` 이면 `bots.name`, 그 밖이면 `'시스템'`. 참조 행이 없으면 각각 `'사용자'`, `'봇'` 으로 대체한다.

**REQ-GW-017** (Ubiquitous)
`history_response` 는 **요청한 (방, 봇) 의 접속에만** 가야 한다. 같은 방의 다른 봇에게 흘러가서는 안 된다.

**REQ-GW-018** (Where — 선택적 필터)
`speaker` 가 주어지면 `author_name` 이 그 값과 같은 메시지만, `since` 가 주어지면 `created_at >= since` 인 메시지만, `until` 이 주어지면 `created_at < until` 인 메시지만 남긴다. 세 필터와 `since_id` 는 함께 쓸 수 있고, 주어지지 않은 필터는 아무것도 거르지 않는다.

### 4.7 방 종료와 권한 릴레이 창구

**REQ-GW-019** (When — 이벤트 구동)
`closeRoom(roomId)` 가 호출되면 서버는 **그 방의** 접속만 닫아야 한다. 다른 방의 접속은 열린 채로 남고 계속 동작해야 한다. 이 메서드는 `registerRoomRoutes` 의 `onArchive` 훅에 연결된다.

**REQ-GW-020** (When — 권한 릴레이 계약)
인증된 접속이 `permission_request` 를 보내면, 서버는 `setPermissionHandler` 로 등록된 함수를 `({ roomId, botId }, 그 메시지)` 로 호출해야 한다. 등록된 함수가 없으면 조용히 무시한다.
`sendToBot(roomId, botId, payload)` 는 그 조합의 접속을 찾아 `payload` 를 보내고 `true` 를, 접속이 없으면 아무것도 보내지 않고 `false` 를 돌려줘야 한다.

이 SPEC 은 **창구만** 만든다. 승인 요청의 상태 관리와 `permission_verdict` 의 내용을 판단하는 일은 `permissions.ts` 의 몫이며 이 SPEC 범위 밖이다.

### 4.8 태스크 간 계약 (시그니처 고정)

**REQ-GW-021** (Ubiquitous)
`server/src/gateway.ts` 는 아래 시그니처를 **글자 그대로** 내보내야 한다. 소비자가 셋(다음 SPEC 의 `routes-messages.ts`, 다음 카드의 `permissions.ts`, 이 SPEC 이 고치는 `routes-bots.ts`)이라 여기서 고정한다.

```ts
export interface MessageRow {
  id: number; room_id: number; author_type: string; author_name: string
  body: string; created_at: string
  attachments?: { id: number; filename: string; stored_path: string }[]
}
export interface ConnInfo { roomId: number; botId: number }
export interface Gateway {
  deliver(roomId: number, msg: MessageRow, targets: { botId: number; delivery: 'to' | 'cc' }[]): void
  closeRoom(roomId: number): void
  isOnline(roomId: number, botId: number): boolean
  sendToBot(roomId: number, botId: number, payload: object): boolean
  setPermissionHandler(fn: ((info: ConnInfo, params: any) => void) | null): void
}
export function createGateway(app: FastifyInstance, opts: { uploadsDir: string }): Gateway
```

**REQ-GW-022** (When — 조립)
`buildServer` 는 허브 데코레이트 뒤에 `createGateway(app, { uploadsDir: config.uploadsDir })` 를 호출해 `app.gateway` 로 데코레이트하고, `registerRoomRoutes(app, { onArchive: roomId => gateway.closeRoom(roomId) })` 로 보관 훅을 연결해야 한다. 또한 `GET /api/rooms/:id/invites` 의 `online` 필드는 상수 `false` 가 아니라 `gateway.isOnline(roomId, bot_id)` 의 결과여야 한다 — `SPEC-BOT-001` 이 "실제 판정은 카드 `t3` 게이트웨이가 채운다"고 남겨 둔 자리다.

### 4.9 범위 경계 (금지)

**REQ-GW-023** (Unwanted — shall not)
이 SPEC 의 구현은 `server/src/routes-messages.ts` 와 `server/src/permissions.ts` 를 만들어서는 안 되고, `server/src/db.ts` 의 `SCHEMA` 상수를 변경해서도 안 된다. 이 SPEC 이 만드는 소스 파일은 `server/src/gateway.ts` 하나이고, 고치는 소스 파일은 `server/src/index.ts` 와 `server/src/routes-bots.ts` 둘뿐이다. 스키마 변경이 필요해 보이면 진행을 멈추고 보고한다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자를 명시한다.

### Out of Scope — 같은 카드의 형제 SPEC (`t3`)

- `server/src/mention.ts` — `@TO`/`@CC` 파서와 그 반환형 `{ bot, delivery }` (`SPEC-MENTION-001`)
- `server/src/sse.ts` — SSE 허브의 구독·발행 구현 (`SPEC-SSE-001`). 이 SPEC 은 `app.hub.publish` 를 **호출만** 한다

### Out of Scope — 메시지 HTTP 계층 (다음 SPEC)

- `server/src/routes-messages.ts` — multipart 전송, 목록, 다운로드
- 멘션 파싱 결과를 `message_targets` 에 기록하는 일. 이 SPEC 의 `deliver()` 는 **이미 계산된** `targets` 배열을 받는다
- 사용자 메시지를 `deliver()` 로 흘려보내는 호출부

### Out of Scope — 권한 릴레이 브로커 (다음 카드)

- `server/src/permissions.ts` — 승인 요청 상태 관리, 대기·만료, 웹 UI 승인 화면과의 왕복
- `permission_verdict` 의 **내용을 판단하는 일**. 이 SPEC 은 `sendToBot` 이라는 전송 창구와 `setPermissionHandler` 라는 수신 창구만 제공한다

### Out of Scope — 채널 플러그인 (카드 `t4`)

- `channel/` 아래 어떤 파일도 만들지 않는다. MCP 채널 계약, 재접속 지수 백오프, `fetch_history` 도구 스키마
- 이력 줄 `#<번호> [시각] 작성자: 본문` 의 **조립**. 서버는 네 필드를 내려보낼 뿐이다 (REQ-GW-016)

### Out of Scope — 웹 UI (카드 `t5`)

- `web/` 아래 어떤 파일도 만들지 않는다. 온라인 표시등, "입력 중…" 표시, 권한 승인 버튼

### Out of Scope — `spec-v2.md` 8장 중 이번에 만들지 않는 것

- **접속이 끊길 때 방에 `system` 메시지를 남기는 일.** `spec-v2.md` 8장 표는 "봇 오프라인 표시 + 방에 system 메시지"라고 적었지만 `plan-v2.md` Task 8 의 구현과 테스트에는 그 동작이 없다. 이 SPEC 은 계획서를 따라 만들지 않으며, 이 불일치를 §7 에 모순 1번으로 기록한다
- **봇 응답 타임아웃 안내.** "타임아웃(설정값) 후 '응답 없음' 안내"는 어느 태스크에도 없고 설정값도 정의되지 않았다
- **재접속 지수 백오프.** 끊긴 쪽이 다시 붙는 책임은 채널 플러그인(카드 `t4`)에 있다

### Out of Scope — 게이트웨이 운영 심화

- 접속 목록의 영속화. 서버 재시작 시 전부 사라지는 것이 정상이며, 복구는 채널의 재접속과 커서 재전송이 담당한다
- 하트비트(ping/pong), 유휴 접속 정리, 접속 수 제한(rate limit), 메시지 크기 제한
- 같은 (방, 봇) 토큰으로 두 프로세스가 동시에 붙는 경우의 배제. `spec-v2.md` 3장은 "(방, 봇) 조합마다 별도 토큰"으로 방 안의 여러 **봇**을 풀었을 뿐, 같은 토큰의 중복 접속을 막지는 않는다 — 둘 다 메시지를 받고 커서는 둘 다 갱신한다. 단일 사용자·소수 그룹 전제로 수용한다
- HTTPS/WSS 업그레이드. `spec-v2.md` 9장이 평문 HTTP 의 위험을 명시적으로 수용했다

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 이미 설치된 것만 쓴다: `ws ^8`(`@types/ws` 포함), `fastify ^5`, `better-sqlite3`. 새 의존성을 추가하지 않는다.
- WebSocket 서버는 `new WebSocketServer({ server: app.server, path: '/bot' })` 로 Fastify 의 HTTP 서버에 얹는다. 별도 포트를 열지 않는다.
- **import 출처 주의**: `randomUUID` 는 `node:crypto`, `statSync`/`copyFileSync` 는 `node:fs` 다. `plan-v2.md:1428` 의 첫 import 줄은 `statSync` 를 `node:crypto` 에서 가져오는 오기이며, 같은 문서 `plan-v2.md:1624-1629` 가 스스로 정정한다. 정정본을 따른다.
- **`limit` 은 필터보다 먼저 적용된다.** 구현이 `ORDER BY id DESC LIMIT ?` 로 최근 N 개를 먼저 자르고, `since_id`/`speaker`/`since`/`until` 은 그 N 개 안에서만 거른다. 따라서 `limit` 은 "조건에 맞는 것을 N 개"가 아니라 "최근 N 개 중 조건에 맞는 것"이다. 원본 구현의 성질이며, AC-GW-013 이 이 계약을 못 박아 다른 해석으로 조용히 바뀌는 것을 막는다.
- 토큰 조회는 `SPEC-BOT-001` 이 내보낸 `sha256Hex` 를 그대로 쓴다. 게이트웨이가 자기 해시 함수를 새로 만들지 않는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`. 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지우며, 실제 `data/` 에 쓰지 않는다.
- 모든 테스트는 `app.listen({ port: 0 })` 로 임의 포트를 쓰고 `app.close()` 로 끝낸다 — 포트 충돌과 좀비 프로세스를 만들지 않는다.
- UI 문구(오류 메시지 포함)는 한국어. 코드 주석도 한국어. 커밋 메시지는 영어 관례(`feat:`, `test:`).
- 채널 계약(프로토콜 메시지의 이름과 필드)은 `spec-v2.md` 6장을 그대로 따른다. 계약 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다.

---

## 7. 원본 문서 사이의 모순 (기록)

이 SPEC 을 쓰면서 `plan-v2.md` 와 `spec-v2.md` 사이에서 찾은 불일치다. 해결 방침은 `plan.md` §D 에 있다.

| # | 불일치 | 이 SPEC 의 처리 |
|---|--------|-----------------|
| 1 | `spec-v2.md` 8장은 접속이 끊기면 "방에 system 메시지"를 남긴다고 적었으나, `plan-v2.md` Task 8 의 구현(`ws.on('close', () => conns.delete(ws))`)과 테스트에는 그 동작이 전혀 없다 | 계획서를 따라 **만들지 않는다**. §5 에 범위 밖으로 명시하고 리드에게 보고한다 |
| 2 | `spec-v2.md` 6장의 `bot_message` 는 `files: [{ local_path }]` 지만, `plan-v2.md` 의 구현·테스트는 `{ local_path, name }` 를 쓴다 | `plan-v2.md` 를 따른다(`name` 은 선택, 없으면 `basename(local_path)`). 상위 호환이라 계약 위반이 아니다 |
| 3 | `spec-v2.md` 6장의 `history_request`/`history_response` 에는 `rid` 가 없으나, `plan-v2.md` 의 구현·테스트는 요청·응답 모두에 `rid` 를 넣는다 | `plan-v2.md` 를 따른다. 한 접속에서 여러 이력 요청이 겹칠 때 응답을 짝지을 유일한 수단이다 |
| 4 | `plan-v2.md:1428` 이 `statSync` 를 `node:crypto` 에서 import 한다 | 같은 문서 `plan-v2.md:1624-1629` 의 정정을 따른다 (`node:fs`) |
| 5 | `plan-v2.md` 의 테스트 이름 `status updates online flag` 는 `status` 메시지를 한 번도 보내지 않고 접속·종료만으로 `isOnline` 을 검사한다 — 이름과 검사 내용이 다르다 | 두 성질을 분리해 각각 검사한다. `status` 발행은 AC-GW-009, 접속 기반 온라인 판정은 AC-GW-010 |
| 6 | `plan-v2.md:1460` 이 `handleWsMessage(ws, JSON.parse(String(raw))).catch(() => ws.close())` 로 인자 위치에서 파싱한다 — 파싱 예외는 프로미스 체인 바깥에서 동기적으로 던져져 `.catch` 에 잡히지 않는다 | 구현 지시를 `try/catch` 로 고치고(`plan.md` §D 8번) AC-GW-002 의 5번이 그것을 관측한다 |

---

## 8. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 9. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 8, 계획 자기 검토 결과(`since_id` 커서 개정)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 3장 다중 봇 접속, 6장 게이트웨이 프로토콜, 8장 에러 처리, 9장 보안, 10장 테스트 전략
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (스키마, `buildServer`, `config`)
- `.moai/specs/SPEC-BOT-001/` — 선행 SPEC (`sha256Hex`, `bot_tokens` 계약, `online` 자리 예약)
- `.moai/specs/SPEC-SSE-001/` — 같은 카드 형제 SPEC (`app.hub`)
- `.moai/specs/SPEC-MENTION-001/` — 같은 카드 형제 SPEC (`@TO`/`@CC` 파서)
- 칸반 카드 `t3` (마일스톤 M3)
