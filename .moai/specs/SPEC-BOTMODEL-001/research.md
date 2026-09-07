# SPEC-BOTMODEL-001 — 조사 기록

이 SPEC 을 쓰기 전에 **직접 읽은 것**과 **직접 실행한 것**만 적는다. 보고서에서 옮겨 온 것은 그렇다고 표시했다.

인용 규칙: 이 저장소의 보고서·가이드가 인용하는 `file:line` 은 커밋 `1da609c` 기준이고 C1(`2f6cd3f`)이 이미 그것을 어긋내 놓았다. 그래서 여기서는 **`파일: 함수명 / 주석 문구`** 로만 가리킨다 — 줄 번호를 쓰지 않는다.

작업 트리: `.claude/worktrees/v2-model`, 브랜치 `WT-v2-model`, HEAD `1b4e918` (`git rev-parse --short HEAD` 로 확인).

---

## §A 직접 읽은 소스

전문을 읽은 파일: `server/src/db.ts` · `server/src/gateway.ts` · `server/src/routes-bots.ts` · `server/src/permissions.ts` · `server/src/routes-rooms.ts` · `server/src/config.ts` · `channel/src/gateway-client.ts` · `channel/src/channel-server.ts` · `channel/src/index.ts`.
부분을 읽은 파일: `server/src/routes-messages.ts`(멘션 매핑 블록과 팬아웃 블록) · `web/app.js`·`web/rich.js`(초대·봇 칩 자리를 grep 으로 좁혀 확인).

### A.1 `server/src/db.ts` — 표의 현재 모양

- `SCHEMA` 상수 안에 `bot_tokens` 표가 있고 열은 `room_id` · `bot_id` · `verifier_pub` · `server_confirm_key` · `last_delivered_id` · `last_seen_at` · `revoked_at` · `created_at` 이다. **커서가 이 표에 산다.**
- `bots` 표에는 `id` · `name UNIQUE` · `description` · `created_at` 넷뿐 — `token` 도 `role` 도 없다.
- `openDb` 안에 검사 둘이 있다: `PRAGMA table_info(bot_tokens)` 로 `verifier_pub` 유무를 보는 v1 거절과, C1 이 더한 `PRAGMA table_info(users)` 열 수 검사(주석 «v2 C1 — 비밀번호 열이 남은 옛 users 표는…»).
- **C1 이 이미 지운 것을 확인**: `users.password_hash` 없음, `room_members` 표 없음, `schema_migrations` 없음, `rooms.created_by` 없음, 백필 트랜잭션 없음.

### A.2 `server/src/gateway.ts` — 접속이 곧 방인 자리

- `ConnInfo` 는 `{ roomId, botId, connId? }`, `Established` 는 여기에 `tokenRowId` · `sessKey` · `seq` 를 더한다. **`tokenRowId` 가 «커서를 올릴 행의 주소» 다** — v2 에서 이 필드가 사라지는 것이 위험 3 의 기제다.
- `handleHello` 가 `verifier_pub` 로 `bot_tokens` 를 조회해 **방과 봇을 역방향으로 얻는다**(주석 «방과 봇은 요청이 아니라 저장된 검증자가 결정한다»). `handleAuth` 가 Ed25519 서명을 검증한 뒤에야 `conns.set` 한다.
- `handleWsMessage` 의 스위치 네 갈래(`bot_message` · `status` · `history_request` · `permission_request`)가 **전부 `info.roomId` 를 읽는다** — 프레임이 아니라 접속에서.
- `sendEstablished` 가 유일한 출구이고 모든 프레임에 `env{seq, payload, mac}` 봉투를 씌운다. 주석이 발신 지점 여섯을 열거해 둔다.
- `channelBinding` 은 주석 스스로 «오늘 이 저장소의 서버는 TLS 를 종단하지 않으므로 현 배치에서는 언제나 `'unbound'` 다» 라고 적는다 — **이미 아무 일도 하지 않는다**.

**커서를 올리는 자리 실측**: `grep -n "last_delivered_id" server/src/gateway.ts` 를 실행했다. 출력은 5줄이고 그중 **UPDATE 는 정확히 둘**이다.

```
230:      db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE id = ?').run(missed[missed.length - 1].id, hs.tokenRowId)
347:        db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE id = ?').run(msg.id, c.tokenRowId)
```

하나는 `handleAuth` 의 재전송 뒤, 하나는 `deliver` 안이다. 나머지 세 줄은 `handleHello` 의 SELECT·타입·`lastDeliveredId` 대입이다. 보고서 §6 위험 3 이 «자리 둘» 이라고 쓴 것을 이 실행으로 확인했다. (줄 번호는 이 실행 시점의 것이며 구현이 시작되면 곧 어긋난다 — 재확인은 같은 grep 으로.)

**남길 자리 확인**: `handleBotMessage` 안의 첨부 블록에 `realpathSync(String(f.local_path))` 와 `src.startsWith(filesRoot + sep)` 가 있고, 주석이 `+ sep` 를 붙이는 이유(«붙이지 않으면 `'<root>-evil'` 같은 접두사 일치가 통과한다»)와 `realpathSync` 를 쓰는 이유(«`resolve()` 는 어휘적 정규화만 해서 심볼릭 링크를 따라가지 않는다»)를 함께 적어 둔다. `sendToOrigin` 은 `c.connId === connId` 하나로만 보낸다.

**`deliver` 의 방 경계 실측**: 반환 객체의 `deliver` 안 첫 줄이 `if (c.roomId !== roomId) continue` 다. **v2 에서 이 줄이 설 자리가 없어진다** — 접속에 방이 없으므로. 이 자리를 `room_bots` 참여 검사로 갈아 끼우지 않으면 위험 4(방 넘어 새는 첨부 경로)가 열린다.

### A.3 `server/src/routes-bots.ts` — 초대가 곧 토큰 발급

- `POST /api/rooms/:id/invites` 가 `randomBytes(32)` 로 토큰을 만들고 `deriveBotKeys` 로 검증자를 유도해 `bot_tokens` 에 넣는다. 재초대는 **먼저 기존 활성 토큰을 철회**한다.
- `POST /api/bots` 는 지금 `{id, name, description}` 만 응답한다 — **토큰이 없다**.
- `inviteCommand` 는 `MINIDISCORD_SERVER=ws://127.0.0.1:${port}/bot` 을 굽는다 — **host 가 `127.0.0.1` 로 고정**이라 `config.host` 를 반영하지 않는다.
- `GET /api/rooms/:id/invites` 가 `online` 을 만들고, 주석이 «SQLite 의 `0 AS online` 은 정수 0 이라 그대로 흘려보내면 안 된다» 고 적는다 — v2 참여 목록도 같은 매핑이 필요하다.
- `sha256Hex` 는 `@MX:NOTE` 가 «(호출자 0 — ANCHOR 에서 강등)» 이라고 자백한다.

### A.4 `server/src/permissions.ts` — 대기 키에 방이 박혀 있다

- `keyOf = (roomId, requestId) => \`${roomId}:${requestId.toLowerCase()}\`` 이고 주석이 «키에 방 번호가 박혀 있으므로 다른 방의 답은 맵 조회 자체가 놓친다» 고 적는다. **결정 ① 이 여기에 `봇:id` 두 번째 색인을 더한다.**
- `onGatewayRequest` 가 `postSystem(info.roomId, …)` 로 방을 정한다 — `info` 는 게이트웨이가 `{roomId: info.roomId, botId, connId}` 로 만들어 넘긴 것이라 **접속에서 온다**.
- 실패 문구 둘이 꼬리 `전달하지 못했습니다 (${requestId})` 를 공유하고, 주석이 «`web/rich.js` `RESOLUTION_RE` 가 그 꼬리만으로 인식한다 ([HARD])» 라고 못 박는다. `web/rich.js` 에서 실제 정규식을 확인했다: `/^.*(?:승인 전송됨|거절 전송됨|전달하지 못했습니다) \(([a-km-z]{5})\)$/`.
- **C1 확인**: `isRoomMember` 백스톱이 이미 없다.

### A.5 `channel/src/channel-server.ts` — `chat_id` 가 메시지 id 인 자리

- `pushChatMessage` 의 `meta` 는 지금 **세 키**다: `chat_id: String(msg.id)` · `delivery` · `sender`. `author_type` 도 `message_id` 도 없다.
- `INSTRUCTIONS` 배열 안에 문제의 문장이 그대로 있다: `'커서로는 chat_id 를 쓰세요. 마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.'`
- 같은 파일의 `fetch_history` 도구 설명은 이미 **반대로** 말한다: «다음 요청의 `since_id` 로는 결과 JSON 의 `cursor` 필드 값을 그대로 넘긴다». **두 문장이 지금도 서로 모순인 채 공존한다** — 보고서 §6 위험 2 가 지목한 그대로다. `chat_id` 가 방 번호가 되면 위 문장은 «방 번호를 `since_id` 로 넘겨라» 가 되어 이력이 조용히 빈다.
- **끝 조건 패턴에 대한 관측**: 가이드 §2 의 `grep -rn "since_id 로" channel/src` 를 지금 트리에서 실제로 돌리면 적중이 **둘**이다 — 위 `INSTRUCTIONS` 문장과, 바로 위에 적은 `fetch_history` 도구 설명(«다음 요청의 since_id 로는 …» — 줄 번호가 아니라 이 설명 문구로 찾는다)이다. 뒤의 것은 t10 이 이미 옳게 고친 문장이고 이 SPEC 은 건드리지 않으므로, 옳게 구현해도 그 명령은 1건을 남긴다. 그래서 AC-BOTMODEL-008 · plan.md §D · spec-compact.md 의 끝 조건은 `"다음에 since_id 로 넘기면"` 으로 좁혔다(`since_id 로는` 인 도구 설명은 걸리지 않는다).
- `reply` 의 `inputSchema.properties` 는 `text` · `files` 둘, `required: ['text']`. `fetch_history` 는 `since_id` · `since` · `until` · `speaker` · `limit` 다섯. **양쪽 다 `chat_id` 가 없다** — A-0 관측이 «인자를 정의해야 관측이 성립한다» 고 한 이유다.
- 남길 것 확인: `neutralizeEnvelope` 는 `/<\/?channel/gi` 의 여는 꺾쇠만 `&lt;` 로 바꾸고, 주석이 `meta` 세 값을 «봉투 속성의 유일한 정직한 출처이므로 중화하지 않는다» 고 적는다.

### A.6 `channel/src/index.ts` — 방을 기억할 자리

- `wire()` 의 `onMessage` 콜백이 `if (m.delivery === 'to') gw.send({ type:'status', state:'working' })` 를 한다 — **여기가 «마지막 `to` 방» 을 기억할 자리다.** `m` 에 방 번호가 없어 지금은 기억할 것 자체가 없다.
- `sendToChat` 이 `bot_message` 와 `status{idle}` 를 연달아 보낸다 — 순서가 계약(REQ-CHANWIRE-009).
- `sendPermissionRequest` 는 `{ type:'permission_request', ...params }` 로 params 를 통째로 흘린다 — **방을 더할 자리가 바로 여기다.**
- `fetchHistory` 가 `gw.requestHistory(params)` 를 부르고 결과를 `{cursor, messages}` JSON 한 건으로 빚는다. `cursor` 는 실린 원소 id 의 최댓값이고 2단계 루프가 «새것부터» 버린다 — **`chat_id` 가 방 번호가 되어도 이 커서는 여전히 메시지 id 여야 한다.**
- **C1 확인**: `isTransportAllowed` 와 거부 사유 세 갈래가 이미 없고, 진입점 주석이 «전송 스킴 검사(루프백 밖은 wss 만)는 v2 에서 지웠다» 고 적는다.

### A.7 `channel/src/gateway-client.ts` — 지울 덩어리와 남길 덩어리

- 지울 것: `v2Rules()`(유도 라벨 셋·DER 접두·전사·세션 열쇠) · `channelBinding` · `challenge` 대조 · `auth` 서명 · 봉투 mac/seq 검사 · `established`/`proofRejected`/`frameRejected` 세 플래그 · `lastSeq` · `rejectChallenge` · `onWelcome` 옵션.
- 남길 것: `connect()`/`retry()` 의 백오프(`backoff = 1000` 시작, `Math.min(backoff * 2, maxBackoff)`, `open` 에서 1000 복귀), `stop()` 의 `stopped` 가드(«대기 중에 `stop()` 이 불렸으면 새 소켓을 열지 않는다»), `requestHistory` 의 `rid` 대조와 10초 타임아웃, `ws.on('error', () => {})`.

### A.8 `server/src/routes-messages.ts` — 멘션 매핑

멘션 → 타깃 변환 블록의 SQL 이 지금 이렇다.

```sql
SELECT b.id FROM bots b JOIN bot_tokens t ON t.bot_id = b.id
 WHERE b.name = ? AND t.room_id = ? AND t.revoked_at IS NULL
```

`bot_tokens` 를 `room_bots` 로 갈고 `revoked_at` 조건을 지우면 그대로 선다. 팬아웃은 `hub.publish` 와 `gateway.deliver` 각 1회이고 주석이 «`deliver` 의 msg 는 실제 저장된 메시지여야 한다» 고 적는다 — 불변식 1 의 강제 지점이다.

### A.9 web

- `web/app.js`: `pickInvite(bot)` 이 `POST /api/rooms/${state.currentRoomId}/invites` 를 부르고 `applyInviteResult` 로 명령을 그린다. `createBot(name, description)` 은 지금 토큰을 받지 않는다. 봇 칩은 `GET /api/rooms/${id}/invites` 응답의 `online` 을 읽어 `🟢/⚪` 를 그린다. `bot_status` 이벤트 리스너가 «입력 중…» 을 붙인다.
- `web/rich.js`: `applyInviteResult` · `clearInviteResult` · `copyText` 는 표시 함수라 **봇 등록 명령 표시에 그대로 재사용된다**. `permissionRequestId`·`RESOLUTION_RE` 는 `permissions.ts` 문구에 결합해 있고 그 문구가 안 바뀌므로 그대로다.

---

## §B 직접 실행한 것

| 명령 | 목적 | 결과 |
|---|---|---|
| `git rev-parse --show-toplevel` · `git branch --show-current` · `git rev-parse --short HEAD` | 작업 트리 확인 | `.claude/worktrees/v2-model` · `WT-v2-model` · `1b4e918` |
| `grep -n "last_delivered_id" server/src/gateway.ts` | 커서를 채우는 자리 세기 | 5줄 중 UPDATE 둘 (§A.2) |
| `ls server/test channel/test` | §7 불변식 표의 «기존 테스트 그대로» 파일 존재 확인 | 아래 §C |
| `grep -n "gateway-mutual-auth\|entrypoint" .moai/state/verify/t25-plan/sibling-sweep.mjs` | 딸린 정리 자리 확인 | `'channel/test/gateway-mutual-auth.test.ts'` 줄이 실재한다 |
| `ID="SPEC-BOTMODEL-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` | SPEC ID 형식 | `PASS` |

## §C 테스트 파일 존재 확인 (`spec.md` §7 표의 근거)

`ls server/test channel/test` 출력에서 직접 확인한 것.

- 있다: `channel-server.test.ts` · `entrypoint.test.ts` · `gateway-client.test.ts` · `gateway-mutual-auth.test.ts` · `index-wiring.test.ts` · `permission-relay.test.ts` · `truncate.test.ts` · `auth-name.test.ts` · `config.test.ts` · `db.test.ts` · `gateway.test.ts` · `gateway-v2.ts` · `health.test.ts` · `live-extract.test.ts` · `mention.test.ts` · `messages.test.ts` · `permissions.test.ts` · `restart-persistence.test.ts` · `rooms-bots.test.ts` · `sse.test.ts` · `web-chat.test.ts` · `web-permission-contract.test.ts` · `web-rich.test.ts` · `web-shell.test.ts` · `web-visual.test.ts` · `wsupgrade-judgment.test.ts`.
- **없다**(C1 이 이미 처분): `server/test/auth.test.ts`(→ `auth-name.test.ts` 로 대체) · `server/test/room-members.test.ts` · `channel/test/transport-auth.test.ts`(→ `channel/test/entrypoint.test.ts` 로 대체).

그러므로 `spec.md` §7 표에서 «기존 테스트 그대로» 로 적은 파일은 **전부 실재한다**. 보고서 §5 표가 «버림» 으로 분류한 파일 중 셋은 C1 이 이미 처리했고, 이 SPEC 이 지울 것은 `gateway-v2.ts` · `gateway-mutual-auth.test.ts` · `fixtures/tls-*` 셋이다.

---

## §D A-0 실세션 관측 (결정 ②의 근거)

출처: `.moai/state/verify/a0/result.md` (2026-09-07). 내가 새로 관측한 것이 아니라 **그 기록을 읽은 것**이다.

- 질문: Claude Code 가 `reply` 를 부를 때 알림 `meta.chat_id` 를 인자로 되돌리는가.
- 방법: `reply` inputSchema 에 선택 인자 `chat_id` 를 임시로 더하고 호출 인자를 로그. 서버 v1(C1 나무 `2f6cd3f`, 포트 3777, 새 DB) + 봇 `bot-a0` 을 tmux 세션(claude 2.1.263, Fable 5.1)으로 붙이고 사람이 `@TO(bot-a0)` 두 번.
- 관측: 알림 `chat_id="1"` → `reply {chat_id:"1", …}` · 알림 `chat_id="3"` → `reply {chat_id:"3", …}`.
- 판정: **세션이 채운다** (2/2). 둘째 값 `3` 이 방 id `1` 과 달라 «방 번호 추측» 이 아니라 «알림 값 되돌림» 으로 구별된다.
- 패치는 관측 뒤 되돌렸고 `git diff | wc -l` = 0 으로 확인됐다고 기록돼 있다.

**한정(그 기록이 스스로 적은 것)**: 세션 하나·모델 하나·2회. 다른 모델·긴 대화·여러 방의 알림이 섞인 상황은 재지 않았다. 그래서 «채널이 마지막 `to` 방으로 채움» 안전망은 삭제하지 않는다.

---

## §E 보고서에서 옮겨 온 것 (내가 재확인하지 않은 것)

아래는 `.moai/reports/v2-review.md` 가 낸 수치·판단이며, 이 SPEC 은 그것을 **재측정하지 않고** 인용한다. 그 보고서 스스로 «확인 못 한 것» 절에서 추정임을 밝힌 항목이 포함돼 있다.

- 「새로 쓴 뒤 크기 약 470줄」 — 추정이며 실측 근거가 없다고 보고서가 적는다.
- 「테스트 그대로 통과·깨질 건수」 — 읽기 판단이며 어떤 기제도 변이시켜 `npm test` 를 돌리지 않았다고 보고서가 적는다.
- 테스트 처분 표의 줄 수(`gateway.test.ts` 1,667 등) — 보고서 값이며 이 SPEC 이 다시 세지 않았다.
- SPEC 인용 줄 번호 — 보고서가 16자리를 표본 재확인했고 1자리가 틀려 정정했다고 적는다. 표본 밖은 같은 비율의 오차가 있을 수 있다.

run 단계가 이 수치들 위에 판정을 세우지 않도록, 이 SPEC 의 수용 기준은 **전부 명령 또는 인프로세스 단언**으로만 쓰였다 — 줄 수나 파일 수를 단언하는 기준은 하나도 없다.
