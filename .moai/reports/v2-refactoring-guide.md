# minidiscord v2 리팩토링 가이드 — 단계별

- 짝 문서: `.moai/reports/v2-review.md` (판정 보고서). 이 가이드는 «무엇을 왜» 는 보고서를 가리키고, «어떤 순서로 무엇을 시키고 무엇으로 끝났다고 판단하나» 만 적는다.
- 기준 커밋: `1da609c` (main). 이 가이드가 인용하는 파일:줄은 그 커밋 기준이다. 단계가 진행되면 줄 번호는 어긋나므로 **함수 이름·주석 문구로 다시 찾는다**(줄 산술 금지).
- 진행 방식: 한 브랜치(`WT-v2-model` 같은 이름), 단계마다 `npm test` 초록에서 커밋. 단계 사이에 세션을 `/clear` 해도 된다 — 각 단계의 «시작 메시지» 가 그 단계에 필요한 문맥을 전부 담는다.

---

## 0. 시작 전에 정할 것 넷

> **쉽게 말하면**: 설계에서 아직 «어느 쪽으로 할지» 안 정해진 갈림길이 넷 있다. 코드를 짜다 말고 멈추지 않으려면 먼저 답을 적어 둔다. 아래에 기본 답을 써 두었으니, 다르게 하고 싶은 것만 고치면 된다.

| # | 갈림길 | 기본 답 (이 가이드가 전제하는 것) | 보고서 |
|---|---|---|---|
| ① | 봇이 도구 승인을 요청하면 **어느 방** 에 띄우나 | 채널이 «마지막으로 `delivery="to"` 알림을 넘긴 방» 을 기억해 요청 프레임에 `room_id` 로 싣는다. 서버 대기 키는 `방:id` 그대로 두되, 그 방에서 답이 안 오면 같은 봇의 다른 방 `yes` 도 받아 준다(대기 맵을 `봇:id` 로도 찾는다) | 위험 1 |
| ② | Claude Code 가 `reply` 를 부를 때 알림의 `chat_id` 를 **돌려주나** | 모른다. **A 단계 첫 작업으로 실세션 한 번 띄워 10분 관측** 한다. 돌려주면 도구 인자 `chat_id` 를 세션이 채우고, 안 돌려주면 채널이 ① 의 «마지막 to 방» 을 기본값으로 채운다. 어느 쪽이든 서버는 `room_id` 없는 `bot_message` 를 거부한다 | 위험 2 |
| ③ | 봇끼리 `@TO` 로 **무한히 부르는 것** 을 어떻게 끊나 | 서버 규칙 하나: «그 방에서 마지막 사람 글 이후 봇 글이 연속 N개(기본 6) 이상이면, 봇 글의 `@TO` 는 `cc` 로 내려 보내고 system 메시지 한 줄을 남긴다». SQL 한 번으로 세어진다 | 위험 5 |
| ④ | **비공개 방**(방 구성원 인가) 을 없애나 | 없앤다. 모든 사람이 모든 방을 본다. 남기고 싶으면 C1 의 «구성원 인가 삭제» 항목만 건너뛰고 `room-members.test.ts` 를 «고침» 으로 옮긴다 | §2.6 |

④ 는 운영자 결정이다. 새 세션 첫 메시지에 «④ 기본 답대로» 또는 «④ 남긴다» 를 한 줄 적는다.

---

## 1단계 — C1: 게이트웨이 밖의 삭제 (바닐라)

> **쉽게 말하면**: 비밀번호 로그인, 방마다 누가 들어올 수 있는지 따지는 장치, «원격이면 wss 만» 검사 — 이 셋은 사내망 한 대 PC 전제에서 할 일이 없다. 게이트웨이(봇 접속 창구)는 건드리지 않고 그 바깥만 먼저 걷어낸다. 먼저 하는 이유는, 다음 단계의 테스트들이 전부 «가입 → 로그인 → 쿠키» 로 시작하는데 그걸 «이름 하나로 로그인» 으로 바꿔 두면 다음 단계에서 같은 테스트를 두 번 고치지 않기 때문이다.

### 고치는 것

| 파일 | 무엇을 | 참고 |
|---|---|---|
| `server/src/auth.ts` | 새로 씀(≈30줄). `POST /api/auth/login {username}` → `users` 에 이름 upsert → `sessions` 토큰 → `md_session` 쿠키. `/register`·`hashPassword`·`verifyPassword`·scrypt 삭제. `requireAuth` 는 그대로. 이름 상한 32자·제어문자 검사(`USERNAME_MAX_LENGTH`, `USERNAME_FORBIDDEN`) 는 남긴다(표시 안전) | 보고서 §2.3 |
| `server/src/db.ts` | `users.password_hash` 삭제. ④ 기본 답이면 `room_members`·`schema_migrations`·`created_by` ALTER·백필 트랜잭션(`ROOMAUTHZ_BACKFILL_MARKER` 블록) 삭제 | §2.6, §3 |
| `server/src/room-members.ts` | 파일 삭제. 호출부 여덟 자리(`requireRoomMember` preHandler 일곱 + `permissions.ts` 의 `isRoomMember`)를 지운다 | §1 |
| `server/src/routes-rooms.ts` | `POST /api/rooms/:id/members` 삭제, 목록의 `WHERE id IN (SELECT room_id FROM room_members …)` 삭제, `created_by` 삽입 삭제 | §1 |
| `server/src/routes-events.ts`, `routes-messages.ts`, `routes-bots.ts` | preHandler 에서 `requireRoomMember` 제거 | §1 |
| `channel/src/index.ts` | `isTransportAllowed`·`LOOPBACK_HOSTS`·진입점의 거부 사유 세 갈래 삭제. 토큰이 있으면 `gw.start()` | §2.5 |
| `server/src/config.ts` | `host` 기본값을 `0.0.0.0` 으로 바꾸거나, 그대로 두고 README 설정 표에 «다른 PC 에서 붙으려면 `MINIDISCORD_HOST` 지정» 을 굵게 적는다. 어느 쪽이든 한 줄 | §2.5 |
| `web/index.html`, `web/app.js` | 가입 폼·비밀번호 입력 삭제, `login(username)` 하나. `register()` 삭제 | §1 |

### 테스트

- 버림: `server/test/auth.test.ts`(이름 상한·제어문자 4건만 새 파일 `auth-name.test.ts` 로 다시 씀), `server/test/room-members.test.ts`, `channel/test/transport-auth.test.ts`(fs import 부재·stdout 침묵 등 독립 6건만 `channel/test/entrypoint.test.ts` 로 옮김).
- 고침: 서버 테스트 하네스의 `build()`/`signUp`/`startServer` 가 전부 `/api/auth/register` → 로그인으로 시작한다(`grep -rln "auth/register" server/test scripts` = 13개 파일). 전부 `POST /api/auth/login {username}` 한 줄로.
- 그대로: 나머지.

### 끝 조건 (전부 명령으로 확인)

```bash
npm test                                    # 초록
grep -rn "password\|scrypt" server/src web  # 0건
grep -rn "requireRoomMember\|isRoomMember\|room_members" server/src   # 0건 (④ 기본 답일 때)
grep -rn "isTransportAllowed\|wss:" channel/src                          # 0건
grep -rln "auth/register" server/test channel/test scripts             # 0건
```

### 시작 메시지 (새 세션에 붙여 넣기)

```text
minidiscord v2 리팩토링 1단계(C1)를 한다. 가이드: .moai/reports/v2-refactoring-guide.md §1, 근거: .moai/reports/v2-review.md §2.3·§2.5·§2.6.
결정 ④: [기본 답대로 / 비공개 방 남긴다] 중 하나.
범위는 가이드 §1 표의 파일만. 게이트웨이(gateway.ts·gateway-client.ts)와 bot_tokens 는 손대지 않는다.
끝 조건은 가이드 §1 의 명령 다섯 개 전부. 초록이면 커밋 메시지 "refactor(v2-c1): …" 로 커밋하고 grep 결과를 그대로 보고하라.
```

---

## 2단계 — A: 봇 단위 신원 · 방 참여 · 방 명시 프레임 (moai plan → run)

> **쉽게 말하면**: 지금은 «봇 한 마리가 방 하나에 들어갈 때마다 열쇠(토큰)를 새로 받고, 접속 자체가 곧 방» 이다. 이걸 «봇은 열쇠 하나로 들어오고, 여러 방에 앉아 있고, 모든 말에 방 번호가 붙는» 모양으로 바꾼다. 핸드셰이크(서명·증명·봉투)도 이 단계에서 같이 사라진다 — 어차피 그 파일들을 새로 쓰기 때문이다. 이 단계만 moai 워크플로우를 쓰는 이유는, 세 파일(게이트웨이·브로커·채널)이 같은 프레임 모양 위에 서야 해서 글로 된 계약과 독립 검토가 값어치를 하기 때문이다.

### A-0: 실세션 관측 (결정 ②, 10분)

서버를 띄우고 봇 하나를 붙인 뒤, 사람이 `@TO(봇)` 로 한 마디 보내고 봇의 `reply` 도구 호출 인자를 본다(`claude --debug` 나 채널의 stderr 로그). `chat_id` 가 인자에 있으면 «세션이 채움», 없으면 «채널이 채움» 으로 SPEC-A 에 한 줄 적는다.

### A-1: `/moai plan` — SPEC-A 에 반드시 들어갈 것

plan 에 넘길 재료는 보고서 §7 SPEC-A 절과 아래 계약 초안이다. SPEC 본문은 manager-spec 이 쓰되, 다음은 **글자 그대로 들어가야** 한다.

**표(DDL)**
```sql
-- bot_tokens 삭제. bots 에 토큰 한 열.
CREATE TABLE bots (id, name UNIQUE, description, token TEXT UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'worker', created_at);
-- 참여 = 방 × 봇, 커서는 여기에 산다.
CREATE TABLE room_bots (room_id REFERENCES rooms, bot_id REFERENCES bots, last_delivered_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (room_id, bot_id));
```
(`role` 열은 B 단계가 쓰지만 표는 여기서 만든다 — 표를 두 번 바꾸지 않기 위해.)

**HTTP**
- `POST /api/bots {name, description, role?}` → `201 {id, name, token, command}` — 토큰은 이 응답에 한 번만. `command` 는 지금 `inviteCommand`(`routes-bots.ts`) 문안 재사용, 주소는 `config.host`.
- `POST /api/rooms/:id/bots {bot_id}` → 참여 추가(멱등, `INSERT OR IGNORE`). `GET /api/rooms/:id/bots` → `[{bot_id, bot_name, online}]` (웹 봇 칩이 읽는다). `DELETE /api/rooms/:id/bots/:botId` → 참여 제거.
- 초대 라우트 셋(`/invites`) 삭제. 방 보관은 `closeRoom` 만.

**WebSocket 프레임** (봉투 없음, 맨몸 JSON)
- 채널 → 서버: `hello{token}` · `bot_message{room_id, body, files?}` · `history_request{room_id, rid, …}` · `permission_request{room_id, request_id, tool_name, description, input_preview}` · `status{room_id, state}`. **`room_id` 없으면 무시하고 system 메시지 없이 버린다.**
- 서버 → 채널: `welcome{bot_id, bot_name, rooms:[{room_id, room_name}]}` · `message{room_id, id, body, author_name, author_type, delivery, files}` · `history_response{room_id, rid, messages}` · `permission_verdict{request_id, behavior}`. **서버 → 채널 방향은 `room_id` 를 항상 싣는다.**

**MCP 알림·도구**
- `meta = {chat_id: String(room_id), message_id: String(msg.id), delivery, sender, author_type}`.
- `reply{chat_id, text, files?}`, `fetch_history{chat_id, since_id?, …}`. `chat_id` 가 없으면 채널이 «마지막 to 방» 으로 채운다(결정 ①②).
- `INSTRUCTIONS` 에서 «커서로는 chat_id 를 쓰세요…» 문장을 지우고, «chat_id 는 방 번호, 이력 커서는 결과 JSON 의 cursor» 로 바꾼다.

**게이트웨이 규칙**
- `deliver(roomId, msg, targets)`: 접속의 봇이 `targets` 에 있고 **`room_bots` 에 (roomId, botId) 가 있을 때만** 보낸다. 커서 갱신은 그 (roomId, botId) 행만.
- 재접속 재전송: `SELECT m.*, t.delivery FROM message_targets t JOIN messages m ON m.id=t.message_id JOIN room_bots rb ON rb.room_id=m.room_id AND rb.bot_id=t.bot_id WHERE t.bot_id=? AND m.id>rb.last_delivered_id ORDER BY m.id` 한 번. 방마다 마지막 id 로 커서 갱신.
- 첨부 뿌리 검사·없는 파일 건너뛰기·`stored_path` 미노출·`sendToOrigin`·`isOnline(botId)` 는 지금 의미 그대로(보고서 «지켜야 할 것» 3·5·6·7).

**수용 기준으로 꼭 들어갈 변이 시험** (보고서 §7 A 끝 조건 ①~⑦): 방 둘·커서 다름 재접속, 방 A 만 참여한 봇이 방 B 첨부 경로를 못 받음, 권한 요청이 마지막 to 방에 뜨고 그 방의 yes 가 요청 접속으로 감, `grep verifier_pub|server_confirm_key|handshakeTranscript|'env'` 0건, 지시문에 «since_id 로» 문장 없음.

### A-2: `/moai run SPEC-A`

- 새로 쓰는 파일 5: `gateway.ts`, `gateway-client.ts`, `db.ts`, `routes-bots.ts`(auth.ts 는 C1 에서 끝남). 조금 고침: `channel-server.ts`, `channel/src/index.ts`, `permissions.ts`, `routes-messages.ts`, `routes-rooms.ts`, `index.ts`, web 초대·봇 등록 화면.
- 테스트: `gateway.test.ts`·`gateway-client.test.ts`·`rooms-bots.test.ts` 다시 씀(보고서 §5 «다시 씀» 3개), `channel-server.test.ts`·`index-wiring.test.ts`·`permissions.test.ts`·`messages.test.ts`·`permission-relay.test.ts`·`web-permission-contract.test.ts`·`restart-persistence.test.ts`·`web-rich.test.ts`·`db.test.ts` 고침. `server/test/gateway-v2.ts`·`channel/test/gateway-mutual-auth.test.ts`·`fixtures/tls-*` 삭제.
- run 지시에 넣을 한 줄: «`gateway.ts` 는 절대 v1 위에 덧대지 말고 빈 파일에서 시작하라. 옮겨 올 것은 `handleBotMessage` 의 첨부 블록과 `sendToOrigin` 뿐이다.»

### A-3: sync (가볍게, 감사 1회 상한)

README 첫 문단(핸드셰이크·TLS·t23 서비스화 문장 삭제)·설정 표·«봇 초대» 항목, ROADMAP M2·M3 «지금» 문단, `codemaps/entry-points.md` 프레임 목록. 감사 FAIL 이 나오면 차단 항목만 고치고 2회차에서 닫는다 — 3회차 이상 돌리지 않는다.

### 끝 조건

```bash
npm test
grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|bot_tokens\|revoked_at" server/src channel/src   # 0건
grep -rn "since_id 로" channel/src                                                                                # 0건
npx tsx scripts/e2e.mts   # 이 시점엔 빨갛다 — C2 에서 다시 쓴다. 빨간 것을 확인만 하고 넘어간다
```

### 시작 메시지

```text
minidiscord v2 리팩토링 2단계(A). 먼저 A-0 실세션 관측(가이드 §2 A-0)을 하고 결과를 한 줄로 보고한 뒤, /moai plan 으로 SPEC-A 를 쓴다.
재료: .moai/reports/v2-refactoring-guide.md §2 A-1 (DDL·HTTP·프레임·MCP·게이트웨이 규칙은 글자 그대로), .moai/reports/v2-review.md §6 위험 1~4·7, §4 «지켜야 할 것» 17개.
결정 ①③ 은 가이드 §0 기본 답. C1 은 끝나 있다(커밋 2f6cd3f, 워크트리 .claude/worktrees/v2-model 브랜치 WT-v2-model — 그 안에서 이어 간다).
plan 감사 통과 뒤 Kickoff 승인을 받고 /moai run 으로 간다. sync 는 감사 2회차 상한.
```

---

## 3단계 — B: 봇 → 봇 멘션 전달 + 역할 규칙 (바닐라)

> **쉽게 말하면**: 지금은 봇이 쓴 글의 `@TO(다른봇)` 은 아무에게도 안 간다(사람 글만 파싱한다). 이걸 봇 글에도 켜고, «worker 봇은 orchestrator 봇과 사람만 부를 수 있다» 는 규칙을 얹는다. 그리고 봇 둘이 서로 부르며 영원히 도는 걸 끊는 안전장치(결정 ③)를 넣는다.

### 고치는 것

| 파일 | 무엇을 |
|---|---|
| `server/src/routes-messages.ts` | 멘션 → 타깃 변환 블록(`for (const m of parseMentions(body)) …`)을 `resolveTargets(db, roomId, body): {targets, unknown}` 로 뽑아 `mention.ts` 옆 새 파일 `targets.ts` 에 둔다. 조회는 `room_bots` |
| `server/src/gateway.ts` | `handleBotMessage` 가 저장 뒤 `resolveTargets` 를 부르고, 역할 필터(발신 봇이 `worker` 면 타깃 중 `role='orchestrator'` 만 남김, 나머지는 system 메시지 한 줄 «… 봇은 부를 수 없습니다»), 결정 ③ 의 연속 봇 글 N 검사(초과면 `delivery` 를 `cc` 로), 그 뒤 `deliver()` |
| `server/src/routes-bots.ts` | `POST /api/bots` 의 `role` 검증(`orchestrator|worker`) — 표는 A 에서 만들어 두었다 |
| `channel/src/index.ts` | 없음. 봇 알림은 이미 `to`/`cc` 로 갈린다 |

미초대 봇 멘션: 사람 경로는 400 이지만 봇 경로는 응답이 없으므로 글은 저장하고 system 메시지 한 줄로 알린다.

### 끝 조건 (테스트로 굳힌다)

1. orchestrator 의 `@TO(worker)` → worker 에 `delivery:'to'` 알림.
2. worker 의 `@TO(다른 worker)` → 전달 0, system 메시지 1, 사람 화면엔 원문 남음.
3. 참여하지 않은 봇 멘션 → 전달 0, system 메시지 1.
4. 사람 글 없이 봇 글 N개 연속 뒤의 `@TO` → `cc` 로 도착, system 메시지 1. N-1 개에서는 `to`.
5. `npm test` 초록.

**B 종결 기록 (2026-09-07, 커밋 `12deb70`)**: 끝 조건 1~4 는 `server/test/gateway.test.ts` 의 `B-1`~`B-4`, role 검증은 `rooms-bots.test.ts` 의 `B:` 한 건 — 빨강 5 확인 뒤 초록. 결정 ③ 의 «연속 N개» 는 **지금 저장한 봇 글까지 세어** ≥6 이면 `cc` (앞 5 + 지금 1). 이월 F1(인바운드 프레임의 room_bots 참여 검사)·F3(POST /messages→deliver→ws 인프로세스 시험)은 **B 에 넣지 않고 C2 로** — 둘 다 §3 끝 조건 밖이고 C2 의 «테스트 정리» 성격이다.

### 시작 메시지

```text
minidiscord v2 리팩토링 3단계(B). 가이드 .moai/reports/v2-refactoring-guide.md §3 표의 파일만. 결정 ③ 은 가이드 §0 기본 답(N=6).
끝 조건 1~5 를 각각 테스트 하나로 먼저 쓰고(빨강 확인), 구현 뒤 초록을 보고하라. A 는 끝나 있다(커밋 b6ff9af, 워크트리 .claude/worktrees/v2-model 브랜치 WT-v2-model — 그 안에서 이어 간다). A 의 sync 감사가 이월한 F1(인바운드 프레임의 room_bots 참여 검사 부재)·F3(POST /messages→deliver→ws 인프로세스 시험 부재)은 §3 표 밖이므로 B 에 넣을지 시작 때 한 줄로 정한다.
```

---

## 4단계 — C2: SPEC · 테스트 · 스크립트 정리 (바닐라)

> **쉽게 말하면**: 이제 안 맞는 문서와 시험을 치운다. 지우지 않고 `_archive/` 로 옮기고, 남는 SPEC 에는 «v2 에서 이렇게 바뀜» 한 줄을 붙인다. 종단 간 시나리오 스크립트(`scripts/e2e.mts`)는 옛 프레임으로 짜여 있어서 새 프레임으로 다시 쓴다.

### 하는 것

1. **보관 이동** (10개, 보고서 §4 목록): `SPEC-AUTH-001, BOT-001, GATEWAY-001, CHANCLIENT-001, CHANAUTH-001, GWAUTH-002, ROOMAUTHZ-001(④ 기본 답일 때), E2E-001, LIVEVERIFY-001, LIVEENV-001` → `.moai/specs/_archive/`. 원 자리에 `SPEC-GWAUTH-001.md` 와 같은 모양의 안내 파일 한 줄(«대체됨 → SPEC-A / v2 모델 변경으로 보관, 카드 …, 내용 무변경»).
2. **개정 표기** (11개): `CORE, ROOM, MSG, PERM, CHANNEL, CHANPERM, CHANWIRE, WEBSHELL, WEBRICH, CHANINJECT` + (SPEC-A 가 GATEWAY 를 대체했음을 CHANINJECT 등에서 참조). 각 `spec.md` HISTORY 에 한 줄 — 본문은 «지금 참» 으로만 고치고 당시 결정 기록은 둔다(메모리 규칙: 본문은 지금 참, HISTORY 는 그때 참).
3. **테스트 잔여**: §5 «버림» 중 아직 남은 파일 삭제. `truncate.test.ts` ㉡이 실행하는 `.moai/state/verify/t25-plan/sibling-sweep.mjs` 의 고정 목록은 C1 에서 이미 `transport-auth` → `entrypoint` 로 바꿨다(저장소에 있음) — A 가 `gateway-mutual-auth.test.ts` 를 지우면 그 줄도 같이 지운다.
4. **스크립트**: `scripts/e2e.mts` 를 v2 프레임(맨몸 hello·`room_id`)으로 다시 쓰고 시나리오를 «봇 하나·방 둘» 로 바꾼다. `scripts/live-*` 는 LIVEENV 와 함께 보관(삭제 아님, `scripts/_archive/`).
5. **문서**: README «채널 플러그인을 붙이기 전에» 절 재작성(핸드셰이크·TLS·«서비스화 안 됨» 삭제), ROADMAP 에 v2 절 추가, `.moai/project/codemaps/` 5종 갱신(`/moai codemaps`).

### 끝 조건

```bash
find .moai/specs -maxdepth 1 -type d -name 'SPEC-*' | wc -l     # 19 (18 + SPEC-A) — B 를 SPEC 으로 썼다면 20
ls .moai/specs/_archive | wc -l                                  # 11 (GWAUTH-001 포함)
npm test && npx tsx scripts/e2e.mts                              # 둘 다 초록
grep -rn "t23\|TLS 종단\|상호 인증" README.md                     # 0건
```

**C2 종결 기록 (2026-09-07, 커밋 `74ff7c9` 정리 + `867e853` 문서)**: 네 명령 실측 — `19` · `11` · `npm test` exit 0 (server 197 · channel 103) 와 `npx tsx scripts/e2e.mts` exit 0 (`[15/15]`) · `0`. 출력 원문은 `.moai/state/verify/c2/{npm-test,e2e}.txt`. 이월 F1(참여하지 않은 방의 인바운드 프레임 버림, 시험 빨강→초록)·F3(POST→deliver→ws 인프로세스 시험) 은 «하는 것» 3 에서 닫았다. 표 밖에서 한 것 둘: `server/test/fixtures/README.md`(지운 TLS 열쇠 설명, 버림 잔여) 삭제, CHANGELOG 에 B·C2 항목. 남긴 것: `.moai/project/{structure,tech}.md` 는 아직 v1 문장(`bot_tokens`·`room_members`·`live-env`)을 담고 있다 — §4 표 밖이라 손대지 않았고, ROADMAP OD-8(보관 방에도 봇 글 저장) 과 함께 후속이다.

### 시작 메시지

```text
minidiscord v2 리팩토링 4단계(C2). 가이드 .moai/reports/v2-refactoring-guide.md §4 의 1~5 를 순서대로. 보관 목록은 .moai/reports/v2-review.md §4 «_archive 로 옮길 목록».
지우지 말고 옮긴다. 완료 SPEC 의 본문 결정 기록은 두고 HISTORY 한 줄만 더한다. 끝 조건 네 명령의 출력을 그대로 보고하라. B 는 끝나 있다(커밋 12deb70, 워크트리 .claude/worktrees/v2-model 브랜치 WT-v2-model — 그 안에서 이어 간다). A 의 sync 감사 이월 F1·F3 은 B 가 C2 로 보냈다(§3 «B 종결 기록») — «하는 것» 3 테스트 잔여 안에서 함께 처분한다.
```

---

## 5. 전체 진행판

```
──────────────────────────────────────────────
🎯 v2 리팩토링   ▓▓▓▓▓▓▓▓▓▓  5/5 (100%)

[🟢] 0. 결정 넷 확정        ← ④ 기본 답(비공개 방 삭제, 2026-09-07 운영자 확정), 나머지 기본 답
[🟢] 1. C1 게이트웨이 밖 삭제 ← 커밋 2f6cd3f (WT-v2-model) · npm test 초록 254+102 · e2e 15/15 · grep 넷 0건
[🟢] 2. A  봇 단위 모델      ← 커밋 b6ff9af (WT-v2-model) · SPEC-BOTMODEL-001 completed · npm test 초록 248+103 · grep 둘 0건 · e2e exit=1(정해진 빨강) · sync 감사 1회차 PASS 0.893
[🟢] 3. B  봇→봇 멘션·역할   ← 커밋 12deb70 (WT-v2-model) · 테스트 5 빨강→초록 · npm test 초록 253+103 · F1·F3 → C2
[🟢] 4. C2 문서·테스트 정리   ← 커밋 74ff7c9·867e853 (WT-v2-model) · SPEC 19+보관 11 · npm test 197+103 · e2e 15/15 · README grep 0 · F1·F3 종결
   └─ 병합(2026-09-07): WT-v2-model → main fast-forward. 같은 커밋에 structure/tech.md 를 v2 로 다시 쓰고 OD-8 처분(봇 글만 막는 카드)을 ROADMAP 에 적었다. 남은 것: OD-8 카드 실행(코드), product.md 의 v1 문장(방 구성원·재초대·상호 인증)
──────────────────────────────────────────────
```

## 6. 어느 단계에서든 지킬 것

- **줄 번호를 믿지 않는다.** 이 문서와 보고서의 `file:line` 은 `1da609c` 기준이다. 함수 이름·주석 문구로 다시 찾는다.
- **범위는 표의 파일만.** «보이는 김에 정리» 는 다음 단계의 diff 를 읽을 수 없게 만든다.
- **끝 조건은 명령 출력으로 보고한다.** «통과했다» 가 아니라 명령과 출력.
- **초록에서만 커밋.** 단계 중간에 세션을 끊어야 하면 `git stash` 대신 WIP 커밋을 남기고, 다음 세션 시작 메시지에 그 SHA 를 적는다.
- **남기는 보안 둘은 어느 단계에서도 건드리지 않는다**: 첨부 허용 뿌리 검사(`gateway.ts` 의 `realpathSync` + `startsWith(filesRoot + sep)` 블록), 봉투 무력화·절단(`channel-server.ts` `neutralizeEnvelope`, `truncate.ts` 전체).
