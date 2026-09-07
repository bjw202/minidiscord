# SPEC-BOTMODEL-001 — 설계

프레임이 실제로 어떤 순서로 오가고, 상태가 어디에 살고, 어느 자리가 조용히 어긋날 수 있는지.

---

## §A 데이터 모델

```
users ──┐
        ├── messages(room_id, author_type, author_user_id, author_bot_id, body, created_at)
rooms ──┤        │
        │        ├── message_targets(message_id, bot_id, delivery)   ← 누구에게 갈 글인가
        │        └── attachments(message_id, filename, stored_path, size, mime)
        │
        └── room_bots(room_id, bot_id, last_delivered_id)   ← [NEW] 참여 + 커서
                            │
bots(id, name UNIQUE, description, token UNIQUE, role, created_at)   ← [MODIFY] 토큰이 여기로
```

v1 과의 차이 셋.

| | v1 | v2 |
|---|---|---|
| 토큰의 주인 | `bot_tokens(room_id, bot_id)` — **쌍** | `bots.token` — **봇** |
| 커서의 집 | `bot_tokens.last_delivered_id` — 쌍마다 하나 | `room_bots.last_delivered_id` — 참여마다 하나 |
| 방을 정하는 것 | 접속(`ConnInfo.roomId`) | **프레임(`msg.room_id`)** |

접속 상태에서 `roomId` 가 사라지는 것이 이 SPEC 의 축이다.

```ts
// v1
type Established = { roomId: number; botId: number; connId: string; tokenRowId: number; sessKey: Buffer; seq: number }
// v2
type Established = { botId: number; connId: string }
```

`tokenRowId`(커서를 올릴 행의 주소)가 사라지는 것이 위험 3 의 뿌리다 — v1 은 접속이 «자기 커서 행» 을 들고 다녔고, v2 는 배달할 때마다 `(room_id, bot_id)` 로 찾아가야 한다.

---

## §B 프레임 흐름

### B.1 접속 — `hello` → `welcome` (한 왕복)

```
채널                                    게이트웨이                       DB
 │  {type:'hello', token}                  │                             │
 ├─────────────────────────────────────────►                             │
 │                                         │ SELECT id,name FROM bots    │
 │                                         │  WHERE token = ?            │
 │                                         ├────────────────────────────►│
 │                                         │ (없으면: 아무 답 없이 close) │
 │                                         │ SELECT rb.room_id, r.name   │
 │                                         │  FROM room_bots rb          │
 │                                         │  JOIN rooms r …             │
 │                                         │  WHERE rb.bot_id=?          │
 │                                         │    AND r.status='active'    │
 │                                         ├────────────────────────────►│
 │  {type:'welcome', bot_id, bot_name,     │                             │
 │   rooms:[{room_id, room_name}, …]}      │                             │
 ◄─────────────────────────────────────────┤                             │
 │            (여기서부터 맨몸 JSON — 봉투 없음)                          │
```

v1 의 `challenge`·`auth` 두 프레임과 `env` 봉투가 사라진다. `welcome` 의 `missed_after_id` 단일 값도 사라진다 — 방마다 다르므로 하나로 표현할 수 없다.

### B.2 사람 글 배달 — 방이 프레임에 실린다

```
사람 → POST /api/rooms/R2/messages  "@TO(B) 해줘"
          │
          ├─ resolveTargets: SELECT b.id FROM bots b
          │    JOIN room_bots rb ON rb.bot_id=b.id
          │    WHERE b.name=? AND rb.room_id=R2          ← [MODIFY] bot_tokens → room_bots
          │
          ├─ INSERT messages / message_targets / attachments
          │
          ├─ hub.publish(R2, 'message', …)               ← 정확히 1회 (불변식 1)
          └─ gateway.deliver(R2, msg, targets)           ← 정확히 1회
                    │
                    │  for (ws, c) of conns:
                    │    if (!targets.find(t => t.botId === c.botId)) continue
                    │    if (!참여(R2, c.botId)) continue        ← [NEW] 위험 4 의 방벽
                    │    send {type:'message', room_id:R2, id, body,
                    │          author_name, author_type, delivery, files}
                    │    커서갱신(R2, c.botId, msg.id)            ← 자리 ①
```

### B.3 재접속 재전송 — 방마다 커서, 전역 순서

```
welcome 직후, 한 번:

SELECT m.*, t.delivery
  FROM message_targets t
  JOIN messages m  ON m.id = t.message_id
  JOIN room_bots rb ON rb.room_id = m.room_id AND rb.bot_id = t.bot_id
 WHERE t.bot_id = ?
   AND m.id > rb.last_delivered_id
 ORDER BY m.id

  ↓ 결과 예시 (B 가 R1·R2 참여, R1 커서=12, R2 커서=0)

  id=3  room=R2 ─┐
  id=7  room=R2  │  m.id 전역 오름차순 — messages.id 가 전역 단조 증가라
  id=15 room=R1  │  방별 순서와 전역 순서가 동시에 지켜진다
  id=18 room=R2 ─┘

  ↓ 방별 마지막 id 로 갱신
  UPDATE room_bots SET last_delivered_id=15 WHERE room_id=R1 AND bot_id=B   ← 자리 ②
  UPDATE room_bots SET last_delivered_id=18 WHERE room_id=R2 AND bot_id=B   ← 자리 ②
```

### B.4 권한 요청·판정 — 방을 건너 되돌아온다

```
세션                채널                     게이트웨이            브로커            방 R2 (SSE)
 │ permission_request │                          │                   │                 │
 ├───────────────────►│ lastToRoom = R2          │                   │                 │
 │                    │ {type:'permission_request',                   │                 │
 │                    │  room_id:R2, request_id, tool_name, …}        │                 │
 │                    ├─────────────────────────►│                    │                 │
 │                    │                          │ ConnInfo{          │                 │
 │                    │                          │  roomId: msg.room_id,  ← [MODIFY]    │
 │                    │                          │  botId, connId}    │                 │
 │                    │                          ├───────────────────►│                 │
 │                    │                          │            open.set('R2:abcde', info)│
 │                    │                          │            open.set('B:abcde', info) │  ← [NEW] 결정 ①
 │                    │                          │            postSystem(R2, 네 줄)     │
 │                    │                          │                    ├────────────────►│
 │                                                                                       │
 │        사람이 R1 에서 "yes abcde" 라고 답해도:                                          │
 │          open.get('R1:abcde') → 없음 → open.get('B:abcde') → 있음                     │
 │                                                                                       │
 │                    │  {type:'permission_verdict', request_id, behavior}                │
 │                    ◄─────────────────────────  sendToOrigin(connId, …)  ← 접속 하나만  │
 │ notifications/…/permission                                                             │
 ◄────────────────────┤                                                                   │
```

`permission_verdict` 프레임에는 `room_id` 가 없다 — `request_id` 가 이미 유일하고, 채널의 발신 집합(`emitted`)이 그 id 로만 판정을 받아들이기 때문이다(불변식 14).

### B.5 `status` — 어느 방의 칩을 켜는가 (위험 7)

```
채널의 두 발신 자리, 각각 방을 안다:

onMessage(m):  if (m.delivery === 'to')
                 send {type:'status', room_id: m.room_id, state:'working'}   ← to 메시지의 방

sendToChat(p): send {type:'bot_message', room_id: 해석된방, …}
               send {type:'status', room_id: 해석된방, state:'idle'}          ← reply 의 방
```

「해석된 방」은 §C.2 의 세 겹이 정한다.

---

## §C 상태가 사는 곳

### C.1 커서를 채우는 자리는 둘이다 (위험 3)

v1 `gateway.ts` 는 이미 같은 모양의 함정을 주석으로 고백해 두었다 — `sendStoredMessage` 의 «채우는 자리는 여기와 deliver 둘이다 — 한쪽만 고치면 다른 쪽이 조용히 상대 경로를 넘긴다». 커서도 같다.

| 자리 | 언제 | 무엇으로 |
|---|---|---|
| ① `deliver` 안 | 사람 글을 실시간으로 배달할 때 | `UPDATE room_bots … WHERE room_id=<그 방> AND bot_id=<그 봇>` |
| ② 재전송 뒤 | 접속 직후 밀린 것을 흘려보낸 뒤 | 방별로 모은 마지막 id 로 방 수만큼 UPDATE |

**한쪽만 `room_bots` 로 옮기고 다른 쪽이 옛 형태로 남으면 조용히 어긋난다** — 실패가 예외로 드러나지 않고 «다음 접속에서 메시지가 하나 덜/더 온다» 로만 나타난다. 그래서 두 자리에 서로를 가리키는 주석을 남기고, AC-BOTMODEL-003 이 «방 둘·커서 서로 다름» 으로 이 자리를 조준한다.

같은 함정의 세 번째 얼굴: v1 에는 커서를 올리는 자리가 `deliver` 와 `handleAuth` 재전송 **둘**이었고 둘 다 `bot_tokens.id`(접속이 들고 다니던 행 주소) 하나로 썼다. v2 는 그 행 주소가 없어지므로 **양쪽 모두 `(room_id, bot_id)` 를 인자로 받아야 한다**.

### C.2 방 번호가 정해지는 세 겹

```
① 세션이 채운다      reply{chat_id:"7"}        →  room_id = 7
      ↓ 없으면
② 채널이 보충한다     lastToRoom = 3            →  room_id = 3
      ↓ 그것도 없으면 (한 번도 to 를 못 받은 채널)
③ 서버가 버린다      bot_message{room_id 없음}  →  무시, system 메시지 없음
```

A-0 관측(2026-09-07)이 확인한 것은 ① 이 실제로 동작한다는 것이다(2/2). ②·③ 은 관측의 한정(세션 하나·모델 하나·2회) 때문에 유지되는 안전망이다.

### C.3 접속과 방의 관계 — 다대다

```
        R1 ────┐
               ├──── B ──── 접속 α (connId=a1)
        R2 ────┘        └── 접속 β (connId=b2)     ← 같은 봇, 접속 둘 (PERMROUTE 의 전제)

isOnline(B)              → 접속이 하나라도 있으면 true   (방 무관)
deliver(R1, …)           → α·β 둘 다에 보낸다 (참여 검사 통과 시)
sendToOrigin('a1', …)    → α 에만                       (불변식 7)
history_response         → 요청을 낸 접속에만            (불변식 5)
```

한 봇이 접속 여럿을 가질 수 있다는 전제는 v1 에서도 참이었고(`SPEC-PERMROUTE-001`), v2 에서도 그대로다. 바뀐 것은 그 접속들이 «같은 방» 이 아니라 «같은 봇» 으로 묶인다는 것뿐이다.

---

## §D 방향 비대칭 — 왜 fixture 수정 범위가 좁아지는가 (위험 6)

```
채널 → 서버 : room_id 를 «필수» 로 만든다   ← 없으면 버림
                bot_message · history_request · permission_request · status
                ⇒ 이 네 자리의 fixture 만 고치면 된다

서버 → 채널 : room_id 를 «더한다»          ← 있으면 읽고, 옛 fixture 는 무시
                message · history_response
                ⇒ 방 번호 없는 message push 약 40자리는 그대로 통과한다
```

필드를 **더하는** 방향은 기존 단언을 깨지 않는다(`toMatchObject`·부분 단언이 대부분). 필드를 **필수로 만드는** 순간 그 자리가 전부 실패한다. 방향을 갈라 적는 문장 하나가 이 SPEC 의 테스트 수정량을 결정한다.

---

## §E 지우는 것과 남기는 것 — «봉투» 는 둘이다

이 저장소에서 「봉투」라는 낱말은 서로 다른 두 가지를 가리킨다. 하나만 지운다.

| | 전선 봉투 | 문맥 봉투 무력화 |
|---|---|---|
| 무엇 | `env{seq, payload, mac}` — HMAC 과 순번을 씌운 프레임 | 사람 유래 문자열의 `<channel` → `&lt;channel` |
| 어디 | `gateway.ts` `sendEstablished` · `gateway-client.ts` 봉투 검사 | `channel-server.ts` `neutralizeEnvelope` |
| v2 | **[REMOVE] 지운다** | **[EXISTING] 손대지 않는다** |

남기는 보안 둘은 어느 단계에서도 건드리지 않는다.

1. 첨부 허용 뿌리 검사 — `gateway.ts` 의 `realpathSync` + `startsWith(filesRoot + sep)` 블록.
2. 봉투 무력화·절단 — `channel-server.ts` 의 `neutralizeEnvelope` 와 `truncate.ts` 전체.

함께 지우는 것: `handshakeTranscript` · `channelBinding` · `SPKI_ED25519_PREFIX` · `deriveBotKeys` · `sha256Hex` · `bot_tokens` 표와 그 다섯 열(`verifier_pub` · `server_confirm_key` · `last_seen_at` · `revoked_at` · `last_delivered_id`) · v1 스키마 거절 검사 · `missed_after_id` · `onWelcome` 콜백 · `onConnection` 관측 옵션 · `sendToBot` · TLS import 와 fixture.
