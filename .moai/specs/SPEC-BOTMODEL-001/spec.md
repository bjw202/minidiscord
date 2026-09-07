---
id: SPEC-BOTMODEL-001
title: "봇 단위 신원 · 방 참여 · 방 명시 프레임 — v2 리팩토링 A 단계"
version: "0.2.0"
status: draft
created: 2026-09-07
updated: 2026-09-07
author: manager-spec
priority: P0
phase: "v2.0.0 target"
module: "server/, channel/, web/"
lifecycle: spec-anchored
tags: "bot-identity, room-bots, room-scoped-frames, chat-id, per-room-cursor, handshake-removal, permission-routing"
tier: L
depends_on: [SPEC-CORE-001, SPEC-MSG-001, SPEC-PERM-001, SPEC-PERMROUTE-001, SPEC-CHANNEL-001, SPEC-CHANWIRE-001, SPEC-CHANPERM-001, SPEC-CHANINJECT-001, SPEC-BOTSTAB-001, SPEC-MENTION-001, SPEC-SSE-001, SPEC-WEBRICH-001, SPEC-WEBSHELL-001]
---

# SPEC-BOTMODEL-001 — 봇 단위 신원 · 방 참여 · 방 명시 프레임

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-09-07 | 최초 작성. `.moai/reports/v2-refactoring-guide.md` §2(A 단계 A-0·A-1·A-2·A-3)와 `.moai/reports/v2-review.md` §6 위험 1~7·§4 «지켜야 할 것» 17개·§7 SPEC-A 절에서 도출. C1 단계는 커밋 `2f6cd3f` 로 끝나 있고 이 SPEC 은 그 위에 선다. 결정 ①③④ 는 가이드 §0 기본 답, 결정 ② 는 A-0 실세션 관측(`.moai/state/verify/a0/result.md`, 2026-09-07)으로 «세션이 채움» 이 확정됐다. 요구사항 25개·수용 기준 25개 — Tier L 상한 25/25 에 정확히 닿는다. | manager-spec |
| 0.2.0 | 2026-09-07 | 계획 감사 1회차(FAIL 0.71, Tier L 통과선 0.85) 교정. 차단 일곱(D1~D7)과 선택 셋(D8~D10)을 닫았다. **D1** — AC-004 의 전제가 AC-024 에 의해 도달 불가였던 것을 배치 교체로 고쳤다(참여했다가 `DELETE` 로 빠지는 두 갈래 ㉮ 재전송·㉯ 실시간). **D2** — AC-001·002 의 판정 파일과 단언 모양을 본문에 못 박았다(`server/test/gateway.test.ts` 실제 게이트웨이 + `channel/test/{channel-server,index-wiring}.test.ts`; `scripts/e2e.mts` 는 판정에 쓰지 않는다). **D3** — plan.md 여섯 마일스톤의 판정 합집합을 25 로 채웠다. **D4** — acceptance.md 머리말의 셋/둘 계수 오류 정정(AC-009 제외). **D5** — §3 대 §6 우선순위를 §3 머리와 §3.3 각주 두 자리에 명시. **D6** — REQ-003 을 shall 형 한 문장 두 절로 합침. **D7** — 「취지/뜻」 셋을 판정 문자열로 교체(REQ-003·REQ-025·AC-008·AC-010). **D8** — AC-025 넷째 명령을 「종료 코드 ≠ 0」 이분 판정으로. **D9** — 25 AC 전부에 대응 REQ 인용 추가. **D10** — AC-019 에 기제 교체 시 변이 재작성 단서. **REQ 25·AC 25 불변** — 새 번호를 만들지 않고 기존 본문만 고쳤다. | manager-spec |

---

## 1. 배경과 목적

지금의 모델은 **접속이 곧 방**이다. 봇 토큰은 `(방, 봇)` 쌍에 발급되고(`db.ts` 의 `bot_tokens` 표), 게이트웨이 접속 상태는 `{roomId, botId}` 한 쌍이며(`gateway.ts` 의 `ConnInfo`), 모든 분기가 `info.roomId` 를 읽는다. 봇이 방 셋에 들어가려면 토큰 셋을 받아 세션 셋을 띄워야 한다.

v2 는 그 모델을 세 문장으로 바꾼다.

1. **봇은 신원이다.** 등록할 때 토큰 하나를 받고, 그 토큰 하나로 들어온다.
2. **참여는 방 × 봇이다.** 한 접속이 여러 방에 앉아 있다.
3. **모든 말에 방 번호가 붙는다.** 프레임이 방을 싣지 않으면 서버는 어느 방인지 알 수 없다.

핸드셰이크(Ed25519 서명·HMAC 증명·전선 봉투·순번)는 이 SPEC 에서 함께 사라진다. 삭제를 따로 떼지 않는 이유는 판정 보고서 §7 이 실측한 대로다 — `gateway.ts` 의 hello/auth 블록이 곧 `(방, 봇)` 결정 자리라 삭제와 모델 변경이 같은 줄에 얽혀 있고, 나눠 하면 1,667줄짜리 `gateway.test.ts` 를 두 번 고치게 된다.

이 SPEC 이 끝나면 봇 하나가 토큰 하나로 붙어 방 둘의 `to` 알림을 각각 그 방의 `chat_id` 로 받고, `reply{chat_id}` 로 그 방에만 답하고, 끊겼다 붙으면 방마다 자기 커서 이후만 이어받는다.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 참여 (`room_bots` 행) | 방 하나와 봇 하나의 짝. 커서(`last_delivered_id`)가 여기에 산다 |
| 맨몸 JSON 프레임 | 전선 봉투(`env{seq, payload, mac}`) 없이 그대로 실리는 WebSocket 프레임 |
| 문맥 봉투 무력화 | 채널이 사람 유래 문자열의 `<channel` 을 `&lt;channel` 로 바꾸는 것 (`neutralizeEnvelope`). **전선 봉투와 다른 것이며 이 SPEC 은 건드리지 않는다** |
| 마지막 `to` 방 | 채널이 가장 최근에 `delivery="to"` 알림을 세션에 넘긴 방의 번호 |
| 방 명시 프레임 | `room_id` 를 필드로 싣는 프레임 |

## 3. 계약 — 글자 그대로 들어가는 것

이 절의 다섯 덩어리는 `.moai/reports/v2-refactoring-guide.md` §2 A-1 의 문안을 **글자 그대로** 옮긴 것이다. 구현은 이 문안을 해석하지 말고 그대로 실현한다.

**[HARD] 우선순위 — §3 과 §6 이 어긋나면 §6 이 이긴다.** §3 은 **출처 문안**이라 원 가이드가 품고 있던 내부 모순까지 그대로 싣는다. §6 의 요구사항이 그 문안을 좁히는 자리에서는 §6 이 정본이며, 「해석하지 말라」는 위 명령은 §6 이 좁히지 **않은** 부분에만 적용된다. 이 SPEC 에서 실제로 좁혀지는 자리는 **한 곳뿐**이다 — §3.3 의 전칭 「서버 → 채널 방향은 `room_id` 를 항상 싣는다」를 REQ-BOTMODEL-014 가 `message`·`history_response` 두 프레임으로 좁히고, `welcome`·`permission_verdict` 는 정의상 방을 싣지 않는 프레임(각각 `rooms` 배열과 `request_id` 로 방을 식별)임을 명시한다. 나머지 네 덩어리(§3.1·3.2·3.4·3.5)에는 좁힘이 없다.

### 3.1 표 (DDL)

```sql
-- bot_tokens 삭제. bots 에 토큰 한 열.
CREATE TABLE bots (id, name UNIQUE, description, token TEXT UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'worker', created_at);
-- 참여 = 방 × 봇, 커서는 여기에 산다.
CREATE TABLE room_bots (room_id REFERENCES rooms, bot_id REFERENCES bots, last_delivered_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (room_id, bot_id));
```

(`role` 열은 B 단계가 쓰지만 표는 여기서 만든다 — 표를 두 번 바꾸지 않기 위해.)

### 3.2 HTTP

- `POST /api/bots {name, description, role?}` → `201 {id, name, token, command}` — 토큰은 이 응답에 한 번만. `command` 는 지금 `inviteCommand`(`routes-bots.ts`) 문안 재사용, 주소는 `config.host`.
- `POST /api/rooms/:id/bots {bot_id}` → 참여 추가(멱등, `INSERT OR IGNORE`). `GET /api/rooms/:id/bots` → `[{bot_id, bot_name, online}]` (웹 봇 칩이 읽는다). `DELETE /api/rooms/:id/bots/:botId` → 참여 제거.
- 초대 라우트 셋(`/invites`) 삭제. 방 보관은 `closeRoom` 만.

### 3.3 WebSocket 프레임 (봉투 없음, 맨몸 JSON)

- 채널 → 서버: `hello{token}` · `bot_message{room_id, body, files?}` · `history_request{room_id, rid, …}` · `permission_request{room_id, request_id, tool_name, description, input_preview}` · `status{room_id, state}`. **`room_id` 없으면 무시하고 system 메시지 없이 버린다.**
- 서버 → 채널: `welcome{bot_id, bot_name, rooms:[{room_id, room_name}]}` · `message{room_id, id, body, author_name, author_type, delivery, files}` · `history_response{room_id, rid, messages}` · `permission_verdict{request_id, behavior}`. **서버 → 채널 방향은 `room_id` 를 항상 싣는다.**

> **각주 (원 문안은 그대로 두고 붙인다)**: 바로 위 전칭은 같은 줄이 `room_id` 없이 적어 놓은 `welcome` 과 `permission_verdict` 에는 **적용되지 않는다** — 출처 문안이 품고 있던 내부 모순이다. 좁힘의 정본은 REQ-BOTMODEL-014 이며, 위 § 우선순위 문단대로 §6 이 이긴다. `welcome`·`permission_verdict` 에 `room_id` 를 억지로 붙이는 것은 plan.md §G 가 지목한 안티패턴이다.

### 3.4 MCP 알림·도구

- `meta = {chat_id: String(room_id), message_id: String(msg.id), delivery, sender, author_type}`.
- `reply{chat_id, text, files?}`, `fetch_history{chat_id, since_id?, …}`. `chat_id` 가 없으면 채널이 «마지막 to 방» 으로 채운다(결정 ①②).
- `INSTRUCTIONS` 에서 «커서로는 chat_id 를 쓰세요…» 문장을 지우고, «chat_id 는 방 번호, 이력 커서는 결과 JSON 의 cursor» 로 바꾼다.

### 3.5 게이트웨이 규칙

- `deliver(roomId, msg, targets)`: 접속의 봇이 `targets` 에 있고 **`room_bots` 에 (roomId, botId) 가 있을 때만** 보낸다. 커서 갱신은 그 (roomId, botId) 행만.
- 재접속 재전송: `SELECT m.*, t.delivery FROM message_targets t JOIN messages m ON m.id=t.message_id JOIN room_bots rb ON rb.room_id=m.room_id AND rb.bot_id=t.bot_id WHERE t.bot_id=? AND m.id>rb.last_delivered_id ORDER BY m.id` 한 번. 방마다 마지막 id 로 커서 갱신.
- 첨부 뿌리 검사·없는 파일 건너뛰기·`stored_path` 미노출·`sendToOrigin`·`isOnline(botId)` 는 지금 의미 그대로(보고서 «지켜야 할 것» 3·5·6·7).

## 4. 확정된 설계 결정

아래 넷은 **정해진 결정**이다. `[NEEDS CLARIFICATION]` 이 아니며 run 단계에서 다시 묻지 않는다.

### 결정 ① — 권한 요청은 어느 방에 뜨는가

채널이 «마지막으로 `delivery="to"` 알림을 넘긴 방» 을 기억해 `permission_request` 프레임에 `room_id` 로 싣는다. 서버의 대기 키는 `방:소문자id` 합성키 그대로 두되, **같은 봇의 다른 방에서 온 `yes <id>` 도 받아 준다** — 대기 맵을 `봇:소문자id` 로도 찾을 수 있게 두 색인을 함께 건다.

근거: 봇 하나가 방 여럿에서 동시에 일하면 «마지막 to 방» 근사가 틀릴 수 있다(보고서 §6 위험 1). 근사가 틀린 경우에도 사람이 답한 요청이 닫히지 않고 «모르는 ID» 로 흘러 사용자 메시지로 저장되는 것을 막는 이중화다.

### 결정 ② — 세션이 `chat_id` 를 돌려준다 (A-0 실측)

`.moai/state/verify/a0/result.md` (2026-09-07) 의 실세션 관측 결과: `reply` 입력 스키마에 선택 인자 `chat_id` 가 있으면 **세션이 알림의 `chat_id` 값을 글자 그대로 되돌린다** (2/2). 둘째 관측의 값 `"3"` 이 방 id `1` 과 달라 «방 번호 추측» 이 아니라 «알림 값 되돌림» 으로 구별됐다.

따라서 이 SPEC 의 세 겹은 다음과 같다.

1. **세션이 채운다** — `reply` · `fetch_history` 스키마에 `chat_id` 인자를 정의하고, 세션이 준 값을 그대로 방 번호로 쓴다.
2. **채널이 보충한다** — 인자가 없을 때만 채널이 «마지막 `to` 방» 을 채운다. 안전망이며 기본 경로가 아니다.
3. **서버가 거부한다** — 어느 쪽이든 `room_id` 없는 `bot_message` · `history_request` 는 서버가 조용히 버린다.

관측의 한정(세션 하나·모델 하나·2회)은 §7 에 그대로 적는다. 겹 2·3 은 이 한정 때문에 유지된다.

### 결정 ③ — 연속 봇 글 N=6 규칙은 B 단계 것이다

봇끼리 `@TO` 로 무한히 부르는 되먹임을 끊는 규칙은 이 SPEC 의 범위가 **아니다** (§5 참조). `bots.role` 열은 표를 두 번 바꾸지 않기 위해 여기서 만들되, **역할 강제는 여기서 하지 않는다** — `POST /api/bots` 는 `role` 을 받아 저장할 뿐이고, `worker` 가 누구를 부를 수 있는가는 B 단계가 정한다.

### 결정 ④ — 비공개 방은 C1 에서 이미 없앴다

방 구성원 인가(`room_members` 표·`requireRoomMember` 게이트)는 C1 단계(커밋 `2f6cd3f`)에서 삭제됐다. 이 SPEC 은 그 결정을 전제로만 쓰고 되돌리지 않는다.

## 5. 범위 밖 (Out of Scope)

### Out of Scope — B 단계(봇 → 봇 멘션과 역할 규칙)

- 봇 글의 `@TO`/`@CC` 를 타깃으로 해석해 다른 봇에게 전달하는 것. `handleBotMessage` 는 이 SPEC 에서도 사람에게만(SSE) 흘려보낸다.
- 역할 필터 — `worker` 봇의 타깃을 `orchestrator` 로 좁히는 규칙. `role` 열은 만들지만 읽지 않는다.
- 되먹임 정지 조건(결정 ③, 연속 봇 글 N=6 이면 `@TO` 를 `cc` 로 내리고 system 메시지 한 줄).
- `resolveTargets` 를 `targets.ts` 로 뽑아내는 리팩토링.

### Out of Scope — C2 단계(문서·테스트·스크립트 정리)

- 죽은 SPEC 10개의 `_archive/` 이동과 안내 파일.
- 개정 대상 SPEC 11개의 HISTORY 한 줄 추가.
- `scripts/e2e.mts` 러너를 v2 프레임으로 재작성하는 것. **이 SPEC 이 끝난 시점에 `npx tsx scripts/e2e.mts` 는 빨갛다** — AC-BOTMODEL-025 가 그것을 「종료 코드가 0 이 아님」이라는 이분 판정으로 확인하고 넘어간다(초록이면 통과가 아니라 보고 대상이다). 이 러너는 어떤 기준의 판정 근거로도 쓰지 않는다.
- `scripts/live-*` 의 `scripts/_archive/` 이동.
- README 전면 재작성·ROADMAP v2 절 신설·codemaps 5종 갱신. (A-3 sync 는 §6 에 적은 네 자리만 손댄다.)

### Out of Scope — 이 SPEC 이 열어 둔 채 두는 구멍

- `GET /api/attachments/:id` 의 방 검사 부재. C1 에서 방 구성원 인가가 사라져 방 검사 자체가 없어졌으므로 **새 구멍이 아니다** (보고서 §6 위험 4). 보류 카드 `t17` 이 소유한다.
- `web/style.css` 의 죽은 규칙 정리 — 가입 폼이 사라져 `#register-form` 관련 규칙이 죽었을 수 있으나 세지 않았다.
- 대기 맵의 상한·만료·속도 제한 (기존 `@MX:DEBT`, 보류 카드 `t12`).

## 6. 요구사항 (GEARS)

델타 표기: **[NEW]** 새로 생김 · **[MODIFY]** 의미가 바뀜 · **[REMOVE]** 사라짐 · **[EXISTING]** 지금 의미 그대로 유지(변이 시험으로 지킨다).

### 6.1 데이터 모델 — `server/src/db.ts` [새로 씀]

- **REQ-BOTMODEL-001** [NEW] `openDb` 는 §3.1 의 `bots` 표를 만들어야 한다 — `token TEXT UNIQUE NOT NULL` 과 `role TEXT NOT NULL DEFAULT 'worker'` 두 열을 포함한다.
- **REQ-BOTMODEL-002** [NEW] `openDb` 는 §3.1 의 `room_bots` 표를 만들어야 한다 — `PRIMARY KEY (room_id, bot_id)` 이고 커서 `last_delivered_id INTEGER NOT NULL DEFAULT 0` 가 이 표에 산다.
- **REQ-BOTMODEL-003** [REMOVE] `openDb` 는 `bot_tokens` 표와 그 표를 향한 v1 스키마 거절 검사(`verifier_pub` 유무 검사)를 만들지도 실행하지도 않아야 하며, **대신 v2 표 존재 검사 한 줄로 옛 DB 파일을 거절해야 한다** — 던지는 예외 메시지는 부분문자열 `개발용 DB 파일을 지우고 새로 만드세요` 를 포함한다.

### 6.2 HTTP 표면 — `server/src/routes-bots.ts` [새로 씀] · `routes-rooms.ts` [조금 고침]

- **REQ-BOTMODEL-004** [MODIFY] 사람이 `POST /api/bots {name, description, role?}` 를 부를 때, 서버는 `201 {id, name, token, command}` 를 응답해야 한다. 토큰은 이 응답에 **한 번만** 실린다.
- **REQ-BOTMODEL-005** [MODIFY] `command` 문자열은 지금 `inviteCommand` 의 문안을 그대로 쓰되 주소의 host 는 `config.host` 를 반영해야 한다.
- **REQ-BOTMODEL-006** [NEW] 사람이 `POST /api/rooms/:id/bots {bot_id}` 를 부를 때, 서버는 `room_bots` 에 `INSERT OR IGNORE` 로 참여를 추가해야 한다 — 같은 요청을 되풀이해도 같은 응답이다(멱등).
- **REQ-BOTMODEL-007** [MODIFY] `GET /api/rooms/:id/bots` 는 `[{bot_id, bot_name, online}]` 을 응답해야 하며, `online` 은 불리언이어야 한다.
- **REQ-BOTMODEL-008** [NEW] `DELETE /api/rooms/:id/bots/:botId` 는 그 방의 그 봇 참여 행만 지워야 한다 — 다른 방의 같은 봇 참여는 남는다.
- **REQ-BOTMODEL-009** [REMOVE] 서버는 `/api/rooms/:id/invites` 세 라우트(POST·GET·DELETE)를 등록하지 않아야 한다.
- **REQ-BOTMODEL-010** [MODIFY] 방을 보관할 때, 서버는 `closeRoom` 훅만 불러야 한다 — 토큰 철회 UPDATE 는 존재하지 않는다.

### 6.3 게이트웨이 프레임 — `server/src/gateway.ts` [새로 씀]

- **REQ-BOTMODEL-011** [MODIFY] 채널이 `hello{token}` 을 보낼 때, 게이트웨이는 `bots.token` 으로 봇을 조회해 `welcome{bot_id, bot_name, rooms:[{room_id, room_name}]}` 을 맨몸 JSON 으로 답해야 한다. `rooms` 는 그 봇이 참여한 활성 방 전부다.
- **REQ-BOTMODEL-012** [MODIFY] 모르는 토큰의 `hello` 를 받을 때, 게이트웨이는 어떤 프레임도 답하지 않고 소켓을 닫아야 한다.
- **REQ-BOTMODEL-013** [NEW] 채널 → 서버 프레임(`bot_message` · `history_request` · `permission_request` · `status`)에 `room_id` 가 없을 때, 게이트웨이는 그 프레임을 **무시하고 system 메시지 없이 버려야** 한다.
- **REQ-BOTMODEL-014** [NEW] 서버 → 채널 프레임(`message` · `history_response`)은 `room_id` 를 **항상** 실어야 한다. `welcome` 은 `rooms` 배열로, `permission_verdict` 는 `request_id` 로 방을 대신 식별한다.
- **REQ-BOTMODEL-015** [REMOVE] 게이트웨이는 `challenge`·`auth` 프레임, 전선 봉투 `env{seq, payload, mac}`, `handshakeTranscript`, `channelBinding`, `SPKI_ED25519_PREFIX` 를 갖지 않아야 한다 — 확립된 접속이 내보내는 모든 프레임은 맨몸 JSON 이다.

### 6.4 배달과 커서 — `server/src/gateway.ts`

- **REQ-BOTMODEL-016** [MODIFY] `deliver(roomId, msg, targets)` 는 접속의 봇이 `targets` 에 있고 **`room_bots` 에 `(roomId, botId)` 행이 있을 때만** 그 접속에 프레임을 보내야 한다.
- **REQ-BOTMODEL-017** [MODIFY] 배달 뒤 커서 갱신은 배달한 `(room_id, bot_id)` 의 `room_bots` 행 하나만 올려야 한다 — 같은 봇의 다른 방 커서는 움직이지 않는다.
- **REQ-BOTMODEL-018** [MODIFY] 채널이 접속을 확립할 때, 게이트웨이는 §3.5 의 재접속 재전송 쿼리를 **한 번** 실행해 그 봇이 타깃인 메시지 중 각 방의 커서 이후 것을 `m.id` 오름차순으로 보내고, 방마다 마지막 id 로 그 방의 커서를 갱신해야 한다.
- **REQ-BOTMODEL-019** [MODIFY] `isOnline(botId)` 는 방과 무관하게 그 봇의 접속 존재만으로 판정해야 한다 — 마지막 `status` 값이 아니다.
- **REQ-BOTMODEL-020** [MODIFY] 채널이 `status{room_id, state}` 를 보낼 때, 게이트웨이는 그 프레임의 `room_id` 로 `bot_status` 를 발행해야 한다. `working` 은 `to` 메시지의 방, `idle` 은 `reply` 의 방이다.
- **REQ-BOTMODEL-021** [EXISTING] 게이트웨이는 봇 첨부의 허용 뿌리 `realpath` 검사(`startsWith(filesRoot + sep)`)와 없는 파일 건너뛰기를 지금 의미 그대로 유지해야 하고, 사람 화면으로 나가는 프레임에 `stored_path` 를 싣지 않아야 하며, `sendToOrigin(connId, …)` 은 그 `connId` 접속 하나에만 보내야 한다.

### 6.5 권한 릴레이 — `server/src/permissions.ts` [조금 고침]

- **REQ-BOTMODEL-022** [MODIFY] 게이트웨이가 `permission_request` 를 브로커에 넘길 때, `ConnInfo.roomId` 는 접속이 아니라 **그 프레임의 `room_id`** 에서 와야 한다.
- **REQ-BOTMODEL-023** [NEW] 사람이 `yes <id>` / `no <id>` 로 답할 때, 브로커는 `방:소문자id` 로 먼저 찾고 못 찾으면 **`봇:소문자id` 로도** 찾아야 한다 — 같은 봇의 다른 방에서 온 답도 같은 요청을 닫는다(결정 ①).

### 6.6 채널·MCP — `channel/src/gateway-client.ts` [새로 씀] · `channel-server.ts` · `index.ts` [조금 고침]

- **REQ-BOTMODEL-024** [MODIFY] 채널이 알림을 세션에 넘길 때, `meta` 는 §3.4 의 다섯 키 `{chat_id: String(room_id), message_id: String(msg.id), delivery, sender, author_type}` 를 실어야 하고, `reply{chat_id, text, files?}` · `fetch_history{chat_id, since_id?, …}` 스키마에 `chat_id` 인자가 있어야 하며, `chat_id` 가 없으면 채널이 «마지막 `to` 방» 으로 채워야 한다.
- **REQ-BOTMODEL-025** [MODIFY] `INSTRUCTIONS` 에서 문자열 `마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.` 가 사라지고 문자열 `chat_id 는 방 번호입니다. 이력 커서는 결과 JSON 의 cursor 를 쓰세요.` 가 **글자 그대로** 그 자리에 들어가야 하며, `routes-messages.ts` 의 멘션 → 타깃 매핑은 `bot_tokens` 가 아니라 `room_bots` 를 조회해야 한다.

## 7. 지켜야 할 것 — 살아 있는 불변식 17개

보고서 §4 의 목록이다. 각 줄은 이 SPEC 의 수용 기준에 걸리거나, 기존 테스트가 그대로 지킨다. «기존 테스트 그대로» 인 줄은 파일 이름을 적었고 그 파일이 저장소에 있는지 확인했다.

| # | 불변식 | 이 SPEC 에서 |
|---|--------|-------------|
| 1 | 사람 글의 팬아웃은 SSE 발행과 게이트웨이 배달 각 정확히 1회, 같은 메시지 id 로 | 기존 테스트 그대로 — `server/test/messages.test.ts` (하네스만 고침) |
| 2 | 첨부 쓰기 봉인(파일명 경로 성분 제거)과 읽기 봉인(업로드 폴더 밖이면 404)은 서로의 백스톱 | 기존 테스트 그대로 — `server/test/messages.test.ts` |
| 3 | 봇 첨부는 허용 뿌리 안의 realpath 만 복사하고 없는 파일은 그 첨부만 건너뛴다. 응답·SSE 프레임에 `stored_path` 를 싣지 않는다 | **AC-BOTMODEL-019 · AC-BOTMODEL-020** (REQ-021) |
| 4 | 재접속 재전송은 «그 봇이 타깃인 메시지 중 커서 이후» 를 id 오름차순으로, 커서는 배달한 접속의 것만 올린다 — v2 에서는 «방마다» 가 붙는다 | **AC-BOTMODEL-003** (REQ-018, 변이 시험) |
| 5 | 이력 응답은 요청한 봇의 접속에만 간다 | **AC-BOTMODEL-016** (REQ-014 계열) |
| 6 | 온라인 판정은 접속의 존재이지 마지막 status 값이 아니다 | **AC-BOTMODEL-018** (REQ-019) |
| 7 | 판정은 요청한 접속 하나(`connId`)로만 되돌아가고, 못 찾으면 대체 발신하지 않으며 두 실패 문구는 꼬리 «전달하지 못했습니다 (\<id\>)» 를 유지한다 | **AC-BOTMODEL-005** + 기존 테스트 `server/test/web-permission-contract.test.ts` |
| 8 | 대기 항목 키는 `방:소문자id` 합성키라 다른 방의 답은 조회 자체가 놓친다 | **개정된다** — 결정 ① 로 `봇:소문자id` 이중 색인이 더해진다. 합성키 자체는 남는다 (**AC-BOTMODEL-006**) |
| 9 | system 메시지 네 줄에서 접두 없는 줄은 서버가 쓴 줄뿐이고, 봇 텍스트의 줄바꿈과 `│` 는 중화된다 | 기존 테스트 그대로 — `server/test/permissions.test.ts` |
| 10 | 사람 유래 조각(본문·이름·첨부 경로)의 `<channel` 은 `&lt;channel` 로, `meta` 는 무변형 | 기존 테스트 그대로 — `channel/test/channel-server.test.ts` (`meta` 키가 다섯으로 늘 뿐 무변형 규칙은 유지) |
| 11 | 절단은 중화 뒤, 시길 탈출은 절단 앞, «남은 본문 + 표시 ≤ 예산», 코드포인트 경계 | 기존 테스트 그대로 — `channel/test/truncate.test.ts` |
| 12 | 이력은 `{cursor, messages}` JSON 한 건, cursor 는 실린 원소 id 의 최댓값, 넘치면 새것부터 버린다 | 기존 테스트 그대로 — `channel/test/index-wiring.test.ts` (하네스만 고침) |
| 13 | `delivery="to"` 알림에는 답변 유발 접미가 붙고 `cc` 에는 붙지 않는다; `to` 이면 세션에 넘기기 전에 `working` 을 보내고 `reply` 뒤에 `idle` 이 나간다 | **AC-BOTMODEL-017** 이 방 번호를 더해 재확인 + 기존 테스트 `channel/test/index-wiring.test.ts` |
| 14 | 판정 릴레이는 자기가 내보낸 `request_id` 에만, 정확히 1회 | 기존 테스트 그대로 — `channel/test/permission-relay.test.ts` |
| 15 | 재접속 백오프는 1초에서 배증·상한 30초·open 시 복귀, `stop()` 뒤에는 새 소켓을 열지 않는다 | 기존 테스트 이관 — `channel/test/gateway-client.test.ts` (다시 쓰되 이 절은 맨몸 프레임으로 남긴다) |
| 16 | 서버 조립 순서: 게이트웨이는 허브 뒤, multipart 는 메시지 라우트 앞, 정적 서빙은 맨 끝 | 기존 테스트 그대로 — `server/test/restart-persistence.test.ts` · `server/test/health.test.ts` |
| 17 | 웹은 사용자·봇·시스템 문자열을 전부 `textContent` 로만 넣고, 판정 버튼은 첫 클릭에서 잠기며 이미 끝난 요청은 버튼 없이 그린다 | 기존 테스트 그대로 — `server/test/web-chat.test.ts` · `server/test/web-rich.test.ts` |

## 8. 관측의 한정 (A-0)

결정 ② 의 근거인 A-0 관측은 다음 한정 아래 있다. run 단계가 이 한정을 넓히지 않는다.

- 세션 하나·모델 하나(Fable 5.1)·호출 2회. 다른 모델, 긴 대화, 여러 방의 알림이 섞인 상황은 재지 않았다.
- v1 스키마에는 `chat_id` 인자가 없어 넘길 길 자체가 없었다 — 이 SPEC 이 인자를 정의해야 관측이 성립한다.
- 그러므로 «채널이 마지막 `to` 방으로 채움» 안전망(겹 2)과 «서버가 `room_id` 없는 프레임을 버림»(겹 3)은 **삭제 후보가 아니다**.
