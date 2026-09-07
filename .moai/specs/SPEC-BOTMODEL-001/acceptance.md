# SPEC-BOTMODEL-001 — 수용 기준

기준 25개, Tier L 상한 25 에 정확히 닿는다. 각 기준은 **명령 하나 또는 인프로세스 단언 하나**로 판정한다. «통과했다» 는 판정이 아니다 — 명령과 그 출력이 판정이다.

관측면 규칙: 셸 grep 으로만 서는 기준은 **AC-007·AC-008 둘**이고, 둘 다 인프로세스 짝을 함께 둔다 — AC-007 은 `server/test/db.test.ts` 의 표 목록 단언, AC-008 은 `channel/test/channel-server.test.ts` 의 지시문 문자열 단언이다. **AC-009 는 이 규칙의 대상이 아니다** — 그 When 이 `PRAGMA table_info(...)` 라 처음부터 인프로세스 단언이고 회귀 스위트가 그대로 다시 실행한다. 셸 기준을 지우지 않는 이유는 형제 SPEC 의 선례 그대로다 — 인프로세스 단언은 소스 트리에 남은 잔여 식별자를 재지 못한다.

판정 명령 표기: 파일 하나를 지목할 때는 `npm test -w server -- <파일이름>` · `npm test -w channel -- <파일이름>` 형태를 쓴다(각 워크스페이스의 `test` 는 `vitest run` 이고 `--` 뒤가 필터로 간다). 전체 스위트는 루트 `npm test`(= `npm test --workspaces --if-present`)다. **`scripts/e2e.mts` 는 어떤 기준의 판정에도 쓰지 않는다** — 이 SPEC 종료 시점에 빨갛고 C2 가 소유한다(AC-025 넷째 명령 참조).

---

## §A 끝 조건 ①~⑦ (보고서 §7 SPEC-A)

### AC-BOTMODEL-001 — ① 봇 하나가 토큰 하나로 두 방의 `to` 알림을 각각 그 방의 `chat_id` 로 받는다 (REQ-BOTMODEL-014 · REQ-BOTMODEL-016 · REQ-BOTMODEL-024)

**Given** 방 `R1`·`R2` 가 있고 봇 `B` 가 둘 다에 참여(`room_bots` 두 행)해 있으며, `B` 는 등록 응답의 토큰 하나로 `hello{token}` 접속을 하나만 열었다
**When** 사람이 `R1` 에서 `@TO(B)` 로 한 마디, `R2` 에서 `@TO(B)` 로 한 마디를 보낸다
**Then** 아래 세 단언이 **모두** 초록이다. 두 계층을 각각 인프로세스로 재고, 셋째가 이음매를 잰다.

| # | 판정 파일 | 하네스 | 단언 |
|---|---|---|---|
| ① 서버 | `server/test/gateway.test.ts` | 실제 Fastify 앱 + 실제 `ws` 클라이언트 `wsConnect(port, token)` 가 채널 노릇을 한다 (실제 `createGateway` 를 부른다 — 스텁이 아니다) | 그 한 접속의 프레임 큐에서 `type === 'message'` 인 프레임 둘을 꺼내 `frames.map(f => f.room_id)` 가 `[R1, R2]` 와 같다. `wsConnect` 호출은 이 시나리오에서 정확히 한 번이다 |
| ② 채널 | `channel/test/channel-server.test.ts` | `handle.pushChatMessage({room_id, …})` 직접 호출 | `note.params.meta.chat_id === String(room_id)` 이고, `R1`·`R2` 두 값에 대해 각각 성립한다 |
| ③ 이음매 | `channel/test/index-wiring.test.ts` | 스텁 `WebSocketServer({port:0})` + **실제** `channel/src/index.ts` 배선 | 스텁 게이트웨이가 서버가 낼 모양 그대로 `message{room_id: R2, id, body, author_name, author_type, delivery:'to', files:[]}` 를 밀어 넣으면, 채널이 세션에 낸 알림이 `notified[0].params.meta.chat_id === String(R2)` 다. `R1` 프레임으로 되풀이해 같은 등식이 선다 |

세 번째가 **이 SPEC 의 이음매**다 — 서버가 실은 `room_id` 와 채널이 낸 `meta.chat_id` 가 같은 값인가. 접속은 여전히 하나다.
**판정 명령**: `npm test -w server -- gateway.test.ts` · `npm test -w channel -- channel-server.test.ts` · `npm test -w channel -- index-wiring.test.ts`. `scripts/e2e.mts` 는 쓰지 않는다.

### AC-BOTMODEL-002 — ② `reply{chat_id}` 가 그 방에만 저장·발행된다 (REQ-BOTMODEL-013 · REQ-BOTMODEL-024)

**Given** AC-001 과 같은 배치이고 `R1`·`R2` 의 메시지 수를 미리 센다
**When** 세션이 `reply{chat_id: String(R2), text: "…"}` 를 한 번 호출한다
**Then** 아래 두 단언이 **모두** 초록이다.

| # | 판정 파일 | 단언 |
|---|---|---|
| ① 채널 | `channel/test/index-wiring.test.ts` | `obs.callTool({name:'reply', arguments:{chat_id: String(R2), text:'…'}})` 뒤 `stub.sent.filter(m => m.type === 'bot_message')` 가 정확히 1건이고 그 건의 `room_id === R2` 다 |
| ② 서버 | `server/test/gateway.test.ts` | 확립된 접속이 맨몸 `bot_message{room_id: R2, body}` 를 보내면 `messages` 에 `room_id = R2` 인 봇 글이 정확히 1행 늘고 `R1` 행 수는 그대로이며, SSE 발행이 `R2` 구독자에게만 정확히 1회 간다 |

이음매(`chat_id` → `bot_message.room_id`)는 ①이, 저장·발행은 ②가 잰다. 둘을 잇는 값은 `R2` 하나다.
**판정 명령**: `npm test -w channel -- index-wiring.test.ts` · `npm test -w server -- gateway.test.ts`.

### AC-BOTMODEL-003 — ③ 방 둘의 커서가 다를 때 재접속 재전송 (위험 3 변이) (REQ-BOTMODEL-017 · REQ-BOTMODEL-018)

**Given** `B` 가 `R1`·`R2` 에 참여해 있고 두 방에 각각 타깃 메시지가 여럿 쌓여 있으며, `room_bots` 커서를 **서로 다른 값**으로 심는다(예: `R1` 커서 = 그 방 두 번째 메시지 id, `R2` 커서 = 0)
**When** `B` 가 끊겼다가 `hello{token}` 으로 다시 붙는다
**Then** 도착한 `message` 프레임 집합은 «각 방의 커서 초과» 메시지와 정확히 같고(한 건도 더도 덜도 아님), 전체 순서는 `id` 오름차순이며, 재전송 뒤 `room_bots` 의 두 행 커서가 각각 그 방에서 마지막으로 보낸 id 로 갱신돼 있다.
**변이 확인**: 재전송 쿼리에서 `JOIN room_bots` 절을 지우면(전역 커서 하나로 되돌리면) 이 기준이 붉어져야 한다.

### AC-BOTMODEL-004 — ④ 참여가 사라진 방의 첨부 경로는 배달에도 재전송에도 실리지 않는다 (위험 4 변이) (REQ-BOTMODEL-016 · REQ-BOTMODEL-018 · REQ-BOTMODEL-021)

> **왜 사람 라우트로 타깃 행을 만들지 않는가**: AC-024 가 「`room_bots` 에 없는 봇을 `@TO` 로 부르면 `400` 이고 어떤 행도 남지 않는다」를 못 박으므로, 「참여하지 않은 방에서 타깃 행이 생긴다」는 전제는 옳게 착지한 트리에서 **재현 불가능**하다. 그래서 이 기준은 타깃 행이 **정당하게 생긴 뒤 참여가 사라지는** 배치를 쓴다. 위험 4 가 겨냥하는 것은 멘션 라우트가 아니라 `deliver`/재전송이 방 밖 봇에게 `files[].local_path` 를 흘리는가이고, 이 배치가 바로 그 자리에 닿는다 — **라우트가 뚫려도 배달이 막는다**는 이중 방어를 잰다.

**Given** 봇 `B` 가 `R1`·`R2` 둘 다에 참여해 있다(`room_bots` 두 행). `R1` 의 커서는 그 방의 마지막 메시지 id 로 심어 둔다
**When** 아래 두 갈래를 각각 실행한다.

- **갈래 ㉮ (재전송 경로)** — `B` 의 접속이 없는 동안, 사람이 `R2` 에서 첨부를 붙여 `@TO(B)` 로 보낸다(정당한 경로이므로 `message_targets` 에 `(그 메시지, B)` 행이 **생긴다**). 그 다음 `DELETE /api/rooms/R2/bots/B` 로 `R2` 참여만 지운다. 그 뒤 `B` 가 `hello{token}` 으로 붙는다.
- **갈래 ㉯ (실시간 배달 경로)** — `B` 의 접속이 하나 열려 있는 상태에서, 사람이 `R2` 에서 첨부를 붙여 `@TO(B)` 로 보내 `message_targets` 행이 생긴 **뒤**, `deliver(R2, msg, [B])` 를 부르기 직전에 `DELETE /api/rooms/R2/bots/B` 로 참여를 지운다(테스트는 `deliver` 를 직접 호출해 이 순서를 못 박는다).

**Then** 두 갈래 모두에서 그 접속에는 `room_id: R2` 인 `message` 프레임이 한 건도 도착하지 않으며, 특히 그 메시지의 `files[].local_path` 문자열이 한 건도 오지 않는다. `room_bots` 의 `(R1, B)` 커서도 움직이지 않는다(㉮ 에서 `R1` 은 이미 커서가 끝까지 올라가 있어 재전송 대상이 없다). `message_targets` 의 행은 그대로 남아 있다 — 막는 자리는 타깃 매핑이 아니라 배달이다.
**변이 확인**: `deliver` 에서 `room_bots` 참여 검사를 지우면 **갈래 ㉯** 가 붉어져야 하고, 재전송 쿼리에서 `JOIN room_bots` 절을 지우면(**전역 커서 하나로 되돌리면**) **갈래 ㉮** 가 붉어져야 한다. 두 변이 모두 이제 실제로 `deliver`/재전송에 도달한다 — 타깃 행이 정당하게 존재하기 때문이다.
**판정 파일**: `server/test/gateway.test.ts` (실제 게이트웨이 + `wsConnect`).

### AC-BOTMODEL-005 — ⑤ 권한 요청이 마지막 `to` 방에 뜨고 그 방의 `yes` 가 요청 접속으로 간다 (위험 1) (REQ-BOTMODEL-022)

**Given** `B` 가 `R1`·`R2` 에 참여해 있고 채널이 가장 최근에 `R2` 의 `to` 알림을 세션에 넘겼다
**When** 세션이 `permission_request` 알림을 내고, 사람이 **`R2` 에서** `yes <id>` 로 답한다
**Then** system 승인 요청 메시지가 `R2` 에만 저장·발행되고(`R1` 에는 0행), 판정 `permission_verdict{request_id, behavior:'allow'}` 가 요청을 낸 그 `connId` 접속 하나에만 도착하며, `R2` 에 `✅ 승인 전송됨 (<id>)` 한 줄이 남는다.

### AC-BOTMODEL-006 — ⑤-b 다른 방의 `yes` 도 같은 요청을 닫는다 (결정 ①의 이중 색인) (REQ-BOTMODEL-023)

**Given** AC-005 와 같은 배치 — 요청은 `R2` 에 떴다
**When** 사람이 **`R1` 에서** `yes <id>` 로 답한다
**Then** 그 답은 사용자 메시지로 저장되지 않고(`consumed_by: 'permission'`), 판정이 같은 `connId` 로 한 번 전달되며, 대기 항목이 사라져 같은 답을 다시 보내면 «모르는 ID» 경로로 흐른다.

### AC-BOTMODEL-007 — ⑥ 핸드셰이크·방별 토큰 잔여 식별자 0건 (REQ-BOTMODEL-003 · REQ-BOTMODEL-015)

**Given** 구현이 착지한 작업 트리
**When** 아래 명령을 실행한다
**Then** 출력이 0건이다.

```bash
grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|'env'\|bot_tokens\|revoked_at" server/src channel/src
```

**인프로세스 짝**: `server/test/db.test.ts` 의 표 목록 단언이 `bot_tokens` 를 포함하지 않고 `bots`·`room_bots` 를 포함한다.

### AC-BOTMODEL-008 — ⑦ 지시문에 «since_id 로» 문장이 없다 (REQ-BOTMODEL-025)

**Given** 구현이 착지한 작업 트리
**When** `grep -rn "다음에 since_id 로 넘기면" channel/src` 를 실행한다
**Then** 출력이 0건이다.

**패턴을 좁힌 이유**: 가이드 §2 «끝 조건» 은 이 자리를 `grep -rn "since_id 로" channel/src` 로 적지만 그 형태는 지금 트리보다 성겨서 적중이 **둘**이다 — 지울 `INSTRUCTIONS` 문장과, `channel/src/channel-server.ts` 의 `fetch_history` 도구 설명(«다음 요청의 since_id 로는 결과 JSON 의 cursor 필드 값을 그대로 넘긴다»)이다. 뒤의 것은 **옳은 문장이고 이 SPEC 이 건드리지 않는다**(REQ-BOTMODEL-025 는 `INSTRUCTIONS` 만 고친다). 그래서 이 SPEC 은 가이드의 끝 조건을 지울 문장 하나에만 걸리도록 좁힌다.
**인프로세스 짝** (`channel/test/channel-server.test.ts`, 두 단언 모두 문자열 일치이며 해석이 끼지 않는다):

- **양성**: `INSTRUCTIONS.includes('chat_id 는 방 번호입니다. 이력 커서는 결과 JSON 의 cursor 를 쓰세요.')` 가 참이다 — REQ-BOTMODEL-025 가 못 박은 문안 그대로.
- **음성**: `INSTRUCTIONS.includes('마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.')` 가 거짓이다 — 지금 트리에 실재하는 문장(`channel/test/channel-server.test.ts` 가 현재 이 문자열을 단언한다)이므로, 그 단언이 반대로 뒤집히는 것이 이 기준의 관측 대상이다.

---

## §B 데이터 모델

### AC-BOTMODEL-009 — `bots`·`room_bots` 표 모양 (REQ-BOTMODEL-001 · REQ-BOTMODEL-002)

**Given** 새 DB 파일로 `openDb` 를 부른다
**When** `PRAGMA table_info(bots)` 와 `PRAGMA table_info(room_bots)` 를 읽는다
**Then** `bots` 에 `token`(UNIQUE NOT NULL)·`role`(NOT NULL DEFAULT `'worker'`) 열이 있고, `room_bots` 에 `room_id`·`bot_id`·`last_delivered_id`(NOT NULL DEFAULT 0) 세 열이 있으며 기본키가 `(room_id, bot_id)` 복합키다. `bot_tokens` 표는 존재하지 않는다.

### AC-BOTMODEL-010 — 옛 DB 파일은 큰 소리로 거절된다 (REQ-BOTMODEL-003)

**Given** `bot_tokens` 를 가진 v1 DB 파일
**When** `openDb` 를 부른다
**Then** 예외가 던져지고 그 메시지가 부분문자열 `개발용 DB 파일을 지우고 새로 만드세요` 를 **포함한다** — 단언은 `expect(err.message).toContain('개발용 DB 파일을 지우고 새로 만드세요')` 이며 해석이 끼지 않는다. 이로써 «테이블은 있는데 열이 없는» 상태가 첫 사용까지 조용히 숨지 않는다.

---

## §C HTTP 표면

### AC-BOTMODEL-011 — `POST /api/bots` 응답 네 키 (REQ-BOTMODEL-004 · REQ-BOTMODEL-005)

**Given** 로그인한 사람
**When** `POST /api/bots {name:"b1", description:"", role:"worker"}` 를 부른다
**Then** `201` 이고 본문 키가 정확히 `{id, name, token, command}` 이며, `token` 은 `bots.token` 과 같고, `command` 안의 서버 주소가 `config.host` 를 반영한다. 같은 이름으로 다시 부르면 `409` 다. **두 번째 조회(`GET /api/bots`)의 어떤 응답에도 `token` 이 실리지 않는다.**

### AC-BOTMODEL-012 — 참여 라우트 셋 (멱등) (REQ-BOTMODEL-006 · REQ-BOTMODEL-007 · REQ-BOTMODEL-008)

**Given** 방 `R1` 과 봇 `B`
**When** `POST /api/rooms/R1/bots {bot_id:B}` 를 두 번 부르고, `GET /api/rooms/R1/bots` 를 부르고, `DELETE /api/rooms/R1/bots/B` 를 부른다
**Then** 두 POST 응답이 같고 `room_bots` 행은 1행이며, GET 응답이 `[{bot_id, bot_name, online}]` 모양이고 `online` 이 불리언(정수 0/1 아님)이고, DELETE 뒤 그 방의 행만 사라져 다른 방의 같은 봇 참여는 남는다.

### AC-BOTMODEL-013 — `/invites` 라우트가 없다 (REQ-BOTMODEL-009 · REQ-BOTMODEL-010)

**Given** 조립된 서버
**When** `POST /api/rooms/1/invites` · `GET /api/rooms/1/invites` · `DELETE /api/rooms/1/invites/1` 을 부른다
**Then** 셋 다 `404` 다. 그리고 방을 보관하면 `closeRoom` 훅이 1회 불리고 어떤 토큰 철회 UPDATE 도 실행되지 않는다.

---

## §D WebSocket 프레임

### AC-BOTMODEL-014 — `hello{token}` → `welcome{…rooms}` 한 왕복 (REQ-BOTMODEL-011 · REQ-BOTMODEL-012)

**Given** `B` 가 `R1`·`R2` 에 참여해 있다
**When** 채널이 맨몸 `{"type":"hello","token":"<토큰>"}` 하나를 보낸다
**Then** 답이 맨몸 JSON `welcome` 한 건이고 `{bot_id, bot_name, rooms:[{room_id, room_name}, …]}` 를 담으며, `rooms` 가 `R1`·`R2` 둘을 담는다. 응답 어디에도 `env`·`seq`·`mac`·`challenge` 키가 없다. **모르는 토큰의 `hello`** 는 어떤 프레임도 받지 못하고 소켓이 닫힌다.

### AC-BOTMODEL-015 — `room_id` 없는 채널→서버 프레임은 조용히 버려진다 (REQ-BOTMODEL-013)

**Given** 확립된 접속
**When** `bot_message{body}` · `history_request{rid}` · `permission_request{request_id,…}` · `status{state:'working'}` 를 각각 `room_id` 없이 보낸다
**Then** `messages` 행이 늘지 않고, `history_response` 가 오지 않고, 어떤 방에도 system 메시지가 생기지 않고, `bot_status` 가 발행되지 않는다. **소켓은 닫히지 않는다** — 버리기이지 거절이 아니다.

### AC-BOTMODEL-016 — 서버→채널 프레임은 `room_id` 를 항상 싣고 이력은 요청 접속에만 간다 (REQ-BOTMODEL-014 · REQ-BOTMODEL-021)

**Given** `B` 의 접속이 둘 열려 있고(같은 토큰, 접속 둘) 각각 `connId` 가 다르다
**When** 접속 ①이 `history_request{room_id:R1, rid:"x"}` 를 보낸다
**Then** `history_response{room_id:R1, rid:"x", messages}` 가 **접속 ①에만** 도착하고 접속 ②에는 오지 않으며, `messages` 는 `R1` 의 메시지만 담는다. 같은 배치에서 `deliver` 로 나가는 `message` 프레임도 `room_id` 를 싣는다.

### AC-BOTMODEL-017 — `status{room_id, state}` 가 그 방의 칩을 켠다 (REQ-BOTMODEL-020)

**Given** `B` 가 `R1`·`R2` 에 참여해 있고 `R1`·`R2` 각각의 SSE 구독자가 있다
**When** 채널이 `R2` 의 `to` 알림을 받아 `status{room_id:R2, state:'working'}` 를 보내고, `reply{chat_id:String(R2)}` 뒤 `status{room_id:R2, state:'idle'}` 를 보낸다
**Then** `bot_status` 이벤트가 `R2` 구독자에게만 두 번(working·idle) 가고 `R1` 구독자에게는 0번 간다.

### AC-BOTMODEL-018 — `isOnline(botId)` 는 접속의 존재로 판정한다 (REQ-BOTMODEL-019)

**Given** `B` 가 `R1`·`R2` 에 참여해 있고 접속을 하나 연다
**When** `GET /api/rooms/R1/bots` 와 `GET /api/rooms/R2/bots` 를 부른다
**Then** 두 응답 모두 `B` 의 `online: true` 다 — 방이 아니라 봇 단위 판정이다. 접속을 닫으면 **직후에** 둘 다 `false` 다(비동기 close 정리에 기대지 않는다).

---

## §E 남기는 보안 둘 (변이로 지킨다)

### AC-BOTMODEL-019 — 첨부 허용 뿌리 검사와 없는 파일 건너뛰기 (REQ-BOTMODEL-021)

**Given** `botFilesDir` 이 지정돼 있고 그 뿌리 밖에 파일 하나, 뿌리 안에 파일 하나, 뿌리 안 심볼릭 링크가 뿌리 밖을 가리키는 것 하나가 있다
**When** 봇이 `bot_message{room_id, body, files:[뿌리밖, 뿌리안, 링크, 없는파일]}` 를 보낸다
**Then** `attachments` 행은 «뿌리 안» 하나만 생기고, 메시지 자체와 나머지 첨부 처리는 계속된다.
**변이 확인**: `realpathSync` 를 `resolve` 로 바꾸면 링크 건이 통과해 이 기준이 붉어져야 하고, `startsWith(filesRoot + sep)` 에서 `+ sep` 를 지우면 `<root>-evil` 접두 일치가 통과해 붉어져야 한다.
**기제 교체 시 단서**: 구현이 동등하게 안전한 **다른** 기제(예: `fs.realpath` 비동기형, `path.relative` 기반 봉쇄 검사)를 고르면 위 두 변이는 실행 불가능해진다. 그 경우 기제를 바꾼 커밋이 **이 두 변이도 함께 새 기제에 맞게 다시 쓴다** — 변이 없는 상태로 남기지 않는다.

### AC-BOTMODEL-020 — `stored_path` 미노출 (REQ-BOTMODEL-021)

**Given** 첨부가 붙은 메시지
**When** `POST /api/rooms/:id/messages` 응답 · SSE `message` 이벤트 · 봇 `handleBotMessage` 뒤의 `hub.publish` 페이로드를 모두 본다
**Then** 세 곳 어디에도 `stored_path` 키가 없다. 봇 접속으로 가는 `message` 프레임에만 `files[].local_path` 가 절대 경로로 실린다.

---

## §F MCP 계약

### AC-BOTMODEL-021 — `meta` 다섯 키 (REQ-BOTMODEL-024)

**Given** 채널이 `message{room_id, id, body, author_name, author_type, delivery, files}` 를 받는다
**When** `pushChatMessage` 가 세션 알림을 낸다
**Then** `params.meta` 가 정확히 `{chat_id, message_id, delivery, sender, author_type}` 다섯 키이며 `chat_id === String(room_id)`, `message_id === String(msg.id)` 이고, 다섯 값 모두 **중화·절단되지 않은 원문**이다.

### AC-BOTMODEL-022 — `chat_id` 인자와 «마지막 `to` 방» 보충 (REQ-BOTMODEL-024)

**Given** 채널이 `R2` 의 `to` 알림을 마지막으로 넘긴 상태
**When** ① 세션이 `reply{chat_id:"7", text}` 를 부르고, ② 세션이 `reply{text}` 만 부른다
**Then** ① 은 `bot_message{room_id:7, …}` 로 나가고, ② 는 `bot_message{room_id:R2, …}` 로 나간다. `fetch_history{chat_id}` 도 같은 두 갈래를 따른다. 한 번도 `to` 를 받지 않은 채널이 `chat_id` 없이 `reply` 를 부르면 `bot_message` 는 `room_id` 없이 나가고 **서버가 AC-015 대로 버린다**.

### AC-BOTMODEL-023 — 이력 커서는 여전히 결과 JSON 의 `cursor` 다 (REQ-BOTMODEL-025)

**Given** `fetch_history{chat_id:String(R1)}` 호출
**When** 결과 문자열을 파싱한다
**Then** `{cursor, messages}` 한 건이고 `cursor` 는 실린 원소 `id` 의 최댓값이며 **방 번호가 아니다**. 빈 이력이면 `cursor` 는 `null` 이다.

---

## §G 서버 소비자와 전체 회귀

### AC-BOTMODEL-024 — 멘션 매핑이 `room_bots` 를 본다 (REQ-BOTMODEL-025)

**Given** 봇 `B` 가 `R1` 에만 참여해 있다
**When** 사람이 `R1` 에서 `@TO(B)` 를, `R2` 에서 `@TO(B)` 를 각각 보낸다
**Then** `R1` 은 `200` 이고 `message_targets` 행이 1행 생기며, `R2` 는 `400` 이고 본문이 «… 봇은 이 방에 초대되지 않았습니다» 이며 어떤 행도 남지 않는다.

### AC-BOTMODEL-025 — 전체 스위트 초록과 A 단계 끝 조건 명령 네 개 (REQ-BOTMODEL-003 · REQ-BOTMODEL-015)

**Given** 구현과 테스트 개정이 모두 착지한 트리
**When** 아래 네 명령을 순서대로 실행한다
**Then** 네 명령 모두 **이분 판정**이 선다 — ①은 종료 코드 0, ②③은 출력 0건, ④는 종료 코드가 **0 이 아니다**.

```bash
npm test                                                                                                          # 종료 코드 0
grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|bot_tokens\|revoked_at" server/src channel/src   # 0건
grep -rn "다음에 since_id 로 넘기면" channel/src                                                                # 0건
npx tsx scripts/e2e.mts; echo "exit=$?"                                                                           # exit != 0
```

넷째의 판정은 「빨간 것을 확인만 한다」가 아니라 **종료 코드가 0 이 아님**이다. 이 러너는 v1 프레임 위에 서 있어 이 SPEC 종료 시점에 반드시 실패하며, 재작성은 C2 가 소유한다(spec.md §5). 만약 초록으로 나온다면 그것은 통과가 아니라 **알아야 할 사실**이다 — 러너가 실은 아무것도 재고 있지 않다는 뜻이므로 그 사실을 `progress.md` §E.2 에 적고 리드에게 보고한다.

---

## Definition of Done

- [ ] 기준 25개가 전부 초록이고, 각각의 판정 근거로 **실행한 명령과 그 출력**이 `progress.md` §E.2 에 남아 있다.
- [ ] 변이 시험 넷을 각각 넣고, **아래 표가 적은 붉음 집합과 정확히 같은지** 관측했다. 「하나만 붉어진다」가 아니라 **집합 일치**로 판정한다 — 변이 ㉠ 은 한 줄을 두 기준이 함께 지키는 자리라 둘을 붉게 만드는 것이 옳은 결과다.

  **판정 규칙 — 집계 기준 제외**: 변이 판정은 **표가 지목한 파일별 실행**(`npm test -w server -- gateway.test.ts` 처럼 기준이 적은 판정 명령)으로만 잰다. **AC-BOTMODEL-025 는 전체 스위트를 재는 집계 기준이므로 이 집합 판정에서 제외한다** — 그 첫째 명령 `npm test` 는 루트에서 두 워크스페이스를 전부 돌아 개별 기준의 판정 파일을 포함하므로, 어떤 변이를 넣어도 대상 기준과 함께 붉어진다. 변이를 넣은 상태에서 AC-025 가 붉어지는 것은 **정상**이며 표를 위반하지 않는다. AC-025 는 **변이를 넣지 않은 트리에서만** 판정한다. 따라서 이 집합 판정의 대상은 개별 기준 **24개(AC-001~024)** 다.

  | 변이 | 대상 한 줄 | 붉어져야 하는 것 | 초록으로 남아야 하는 것 (AC-025 제외, 24개 중) |
  |---|---|---|---|
  | ㉠ | 재전송 쿼리의 `JOIN room_bots` 절 제거(**전역 커서 하나로 되돌리기**) | AC-003 **그리고** AC-004 갈래 ㉮ | 나머지 **22 기준** |
  | ㉡ | `deliver` 의 `room_bots` 참여 검사 제거 | AC-004 갈래 ㉯ **만** | AC-003 포함 나머지 **23 기준** |
  | ㉢ | `realpathSync` → `resolve` | AC-019 **만** | 나머지 **23 기준** |
  | ㉣ | `startsWith(filesRoot + sep)` 에서 `+ sep` 제거 | AC-019 **만** | 나머지 **23 기준** |

  ㉠ 의 괄호 한정은 AC-003 의 문안과 같은 뜻이다 — `JOIN` 절만 문자 그대로 지우면 `rb` 별칭이 미정의가 되어 SQL 자체가 깨지고, 그러면 다른 이유로 훨씬 많은 기준이 붉어져 이 행의 집합 판정이 성립하지 않는다.
- [ ] `spec.md` §7 표의 17 불변식 중 «기존 테스트 그대로» 로 적은 줄이 실제로 그 파일에서 초록이다 — 파일이 지워졌거나 그 `it()` 블록이 사라졌다면 «그대로» 가 아니라 «대체» 이므로 그 사실을 §E.2 에 적는다.
- [ ] 삭제 대상 테스트 보조 파일(`server/test/gateway-v2.ts` · `channel/test/gateway-mutual-auth.test.ts` · `server/test/fixtures/tls-*`)이 사라졌고, `.moai/state/verify/t25-plan/sibling-sweep.mjs` 의 고정 목록에서 `gateway-mutual-auth` 줄이 함께 지워졌다.
- [ ] `npm test` 초록에서 커밋했다.
