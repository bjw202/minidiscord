# SPEC-BOTMODEL-001 — 압축본 (run 단계 인계 카드)

`spec.md` 의 계약을 한 장으로 줄인 것. **정본은 `spec.md` 이며 이 파일과 어긋나면 `spec.md` 가 이긴다.** (spec.md v0.2.0 — 계획 감사 1회차 교정 반영.)

---

## 한 문장

봇 토큰을 `(방, 봇)` 에서 **봇** 으로 옮기고, 참여를 `room_bots` 표로 만들고, 모든 프레임에 `room_id` 를 실으며, 그 과정에서 핸드셰이크·전선 봉투·방별 토큰을 함께 지운다.

## 표

```sql
CREATE TABLE bots (id, name UNIQUE, description, token TEXT UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'worker', created_at);
CREATE TABLE room_bots (room_id REFERENCES rooms, bot_id REFERENCES bots, last_delivered_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (room_id, bot_id));
-- bot_tokens 삭제
```

## HTTP

| 메서드 | 경로 | 응답 |
|---|---|---|
| POST | `/api/bots {name, description, role?}` | `201 {id, name, token, command}` — 토큰은 한 번만 |
| POST | `/api/rooms/:id/bots {bot_id}` | 참여 추가 (멱등, `INSERT OR IGNORE`) |
| GET | `/api/rooms/:id/bots` | `[{bot_id, bot_name, online}]` |
| DELETE | `/api/rooms/:id/bots/:botId` | 참여 제거 |
| — | `/api/rooms/:id/invites` × 3 | **삭제** (404). 보관은 `closeRoom` 만 |

## 프레임 (맨몸 JSON, 봉투 없음)

| 방향 | 프레임 | `room_id` |
|---|---|---|
| 채널→서버 | `hello{token}` | — |
| 채널→서버 | `bot_message{room_id, body, files?}` | **필수** |
| 채널→서버 | `history_request{room_id, rid, …}` | **필수** |
| 채널→서버 | `permission_request{room_id, request_id, tool_name, description, input_preview}` | **필수** |
| 채널→서버 | `status{room_id, state}` | **필수** |
| 서버→채널 | `welcome{bot_id, bot_name, rooms:[{room_id, room_name}]}` | `rooms` 로 |
| 서버→채널 | `message{room_id, id, body, author_name, author_type, delivery, files}` | **항상** |
| 서버→채널 | `history_response{room_id, rid, messages}` | **항상** |
| 서버→채널 | `permission_verdict{request_id, behavior}` | 없음 (`request_id` 로 식별) |

**채널→서버에 `room_id` 가 없으면 무시하고 system 메시지 없이 버린다. 소켓은 닫지 않는다.**

> 출처 문안(spec.md §3.3)은 「서버 → 채널 방향은 `room_id` 를 항상 싣는다」고 전칭하지만, 그 좁힘의 정본은 REQ-BOTMODEL-014 다 — **`message`·`history_response` 둘만 필수**이고 `welcome`·`permission_verdict` 는 위 표대로 방을 다른 필드로 식별한다. §3 과 §6 이 어긋나면 §6 이 이긴다.

## MCP

- `meta = {chat_id: String(room_id), message_id: String(msg.id), delivery, sender, author_type}` — 다섯 키, 전부 무변형.
- `reply{chat_id, text, files?}` · `fetch_history{chat_id, since_id?, …}`.
- `chat_id` 세 겹: ① 세션이 채운다(A-0 실측 2/2) → ② 없으면 채널이 «마지막 `to` 방» → ③ 그래도 없으면 서버가 버린다.
- `INSTRUCTIONS` 문자열 교체 (REQ-025, **글자 그대로**):
  - 지운다 → `마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.`
  - 넣는다 → `chat_id 는 방 번호입니다. 이력 커서는 결과 JSON 의 cursor 를 쓰세요.`
- 이력 `cursor` 는 여전히 **메시지 id** 의 최댓값이다 — 방 번호가 아니다.

## 게이트웨이 규칙

- `deliver`: 타깃이고 **`room_bots` 에 `(roomId, botId)` 가 있을 때만**. 커서는 그 행만.
- 재접속 재전송, 쿼리 한 번:
  ```sql
  SELECT m.*, t.delivery FROM message_targets t JOIN messages m ON m.id=t.message_id JOIN room_bots rb ON rb.room_id=m.room_id AND rb.bot_id=t.bot_id WHERE t.bot_id=? AND m.id>rb.last_delivered_id ORDER BY m.id
  ```
  방마다 마지막 id 로 커서 갱신.
- `isOnline(botId)` — 방 무관.
- **[EXISTING] 손대지 않는다**: 첨부 뿌리 검사(`realpathSync` + `startsWith(filesRoot + sep)`) · 없는 파일 건너뛰기 · `stored_path` 미노출 · `sendToOrigin`.

## 권한 (결정 ①)

채널이 «마지막 `to` 방» 을 `room_id` 로 싣는다. 서버 대기 맵은 `방:소문자id` **와** `봇:소문자id` 두 색인 — 다른 방의 `yes` 도 같은 요청을 닫는다. 실패 문구 꼬리 «전달하지 못했습니다 (\<id\>)» 는 한 글자도 바꾸지 않는다.

## 지우는 것

`verifier_pub` · `server_confirm_key` · `handshakeTranscript` · `channelBinding` · `SPKI_ED25519_PREFIX` · `deriveBotKeys` · `sha256Hex` · `'env'` 봉투 · `seq`/`lastSeq`/`sessKey` · `bot_tokens` · `revoked_at` · `last_seen_at` · `missed_after_id` · `onWelcome` · `onConnection` · `sendToBot` · v1 스키마 거절 · TLS import 와 fixture · `challenge`/`auth` 프레임.

## 남기는 보안 둘 (어느 단계에서도 건드리지 않는다)

1. 첨부 허용 뿌리 realpath 검사 — `gateway.ts`.
2. 문맥 봉투 무력화 + 절단 — `channel-server.ts` `neutralizeEnvelope` · `truncate.ts` 전체.

> 「봉투」는 둘이다. 지우는 것은 **전선 봉투** 하나뿐이다.

## run 지시 (글자 그대로)

> `gateway.ts` 는 절대 v1 위에 덧대지 말고 빈 파일에서 시작하라. 옮겨 올 것은 `handleBotMessage` 의 첨부 블록과 `sendToOrigin` 뿐이다.

## 끝 조건

```bash
npm test
grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|bot_tokens\|revoked_at" server/src channel/src   # 0건
grep -rn "다음에 since_id 로 넘기면" channel/src                                                                # 0건
npx tsx scripts/e2e.mts; echo "exit=$?"   # 판정은 «종료 코드 ≠ 0» — 재작성은 C2 소유
```

셋째 명령은 가이드(`since_id 로`)보다 좁다 — 그 형태는 이 SPEC 이 건드리지 않는 `channel-server.ts` 의 `fetch_history` 도구 설명까지 적중해 옳은 구현에서도 0건이 되지 않는다.

기준 판정에 `scripts/e2e.mts` 를 쓰지 않는다. 간판 끝 조건 ①②(AC-001·002)는 `server/test/gateway.test.ts`(실제 게이트웨이 + 실제 `ws` 클라이언트)와 `channel/test/{channel-server,index-wiring}.test.ts` 로 **인프로세스** 판정한다.

## 범위 밖

B 단계(봇→봇 멘션·역할 필터·연속 봇 글 N=6) · C2 단계(SPEC 보관·e2e 재작성·문서 전면 갱신) · `GET /api/attachments/:id` 방 검사 · web CSS 죽은 규칙 정리.
