# SPEC-BOTMODEL-001 — 구현 계획

기준 커밋: C1 착지 `2f6cd3f`, 이 SPEC 작성 시점 HEAD `1b4e918`, 브랜치 `WT-v2-model`, 워크트리 `.claude/worktrees/v2-model`.

보고서와 가이드의 `file:line` 인용은 `1da609c` 기준이라 이미 어긋나 있다. **줄 번호를 믿지 않는다 — 함수 이름·주석 문구로 다시 찾는다.**

---

## §A 맥락

C1 이 게이트웨이 «밖» 의 삭제를 끝냈다(사람 인증 축소·방 구성원 인가 삭제·전송 스킴 검사 삭제·web 로그인 폼). 그래서 모든 서버 테스트 하네스는 이미 이름 로그인으로 시작한다 — 이 SPEC 이 하네스를 두 번 고치지 않는 이유다.

남은 것이 게이트웨이 «안» 이다. 핸드셰이크 삭제와 모델 변경이 같은 줄에 얽혀 있어 한 SPEC 으로 묶었다.

## §B 마일스톤 — 되돌리기 어려운 결정부터

순서는 «바뀔 가능성이 큰 결정» 을 앞에 둔다. M1·M2 가 이 SPEC 의 설계 결정 전부를 담고, M3~M5 는 그 결정을 소비하는 자리이며, M6 는 기계적 정리다.

### M1 — 데이터 모델 (가장 되돌리기 어렵다)

`server/src/db.ts` **새로 씀**.

- `bots` 표에 `token TEXT UNIQUE NOT NULL` · `role TEXT NOT NULL DEFAULT 'worker'` 두 열 (spec.md §3.1 DDL 글자 그대로).
- `room_bots(room_id, bot_id, last_delivered_id, PRIMARY KEY(room_id, bot_id))` 신설. **커서가 여기로 이사한다** — 이 SPEC 에서 가장 되돌리기 어려운 한 줄이다.
- `bot_tokens` 표 삭제, v1 스키마 거절 검사(`verifier_pub` 유무) 삭제, 대신 v2 표 존재 검사 한 줄.
- 인덱스 `idx_targets_bot` 는 그대로 — 재전송 쿼리가 `message_targets(bot_id, message_id)` 로 들어간다.

판정: **AC-BOTMODEL-009 · 010**.

### M2 — 프레임 계약 (게이트웨이·클라이언트를 같은 모양 위에 세운다)

`server/src/gateway.ts` **새로 씀** · `channel/src/gateway-client.ts` **새로 씀**.

- 맨몸 `hello{token}` → `welcome{bot_id, bot_name, rooms:[{room_id, room_name}]}` 한 왕복.
- 확립 상태에서 `roomId` 를 지운다 — 접속 상태는 `{botId, connId}` 다. 방은 **프레임이 실어 온다**.
- 채널→서버 네 프레임에서 `room_id` 없으면 조용히 버림(소켓은 닫지 않는다). 서버→채널은 항상 실음. **방향을 갈라 적는 것이 fixture 수정 범위를 좁히는 장치다**(위험 6) — 필드를 «더하는» 방향인 서버→채널 자리의 기존 fixture 약 40자리는 그대로 통과한다.
- 삭제: `challenge`·`auth`·`env` 봉투·`handshakeTranscript`·`channelBinding`·`SPKI_ED25519_PREFIX`·`sessKey`·`seq`·`lastSeq`·확립 게이트·`proofRejected`/`frameRejected` 플래그·TLS import.
- `gateway-client.ts` 에서 남기는 것: 접속·백오프(1초 배증·상한 30초·open 시 복귀)·`stop()` 가드·`requestHistory` 의 `rid` 대조.

**[HARD] run 지시 한 줄 (가이드 §2 A-2 글자 그대로)**:

> `gateway.ts` 는 절대 v1 위에 덧대지 말고 빈 파일에서 시작하라. 옮겨 올 것은 `handleBotMessage` 의 첨부 블록과 `sendToOrigin` 뿐이다.

판정: **AC-BOTMODEL-014 · 015 · 016**.

### M3 — 배달·커서·이력

`server/src/gateway.ts` 계속.

- `deliver(roomId, msg, targets)`: 접속의 봇이 `targets` 에 있고 **`room_bots` 에 `(roomId, botId)` 가 있을 때만** 보낸다.
- 커서 갱신은 `UPDATE room_bots SET last_delivered_id=? WHERE room_id=? AND bot_id=?` — **채우는 자리는 둘이다**(재전송 루프와 `deliver`). 위험 3 이 지목한 자리다: 한쪽만 고치면 다른 쪽이 조용히 옛 방의 커서를 올린다. 두 자리에 서로를 가리키는 주석을 남긴다.
- 재전송은 spec.md §3.5 의 쿼리 **한 번**. 방마다 마지막 id 로 갱신 — 루프 안에서 `(room_id → 마지막 id)` 를 모아 마지막에 방별로 UPDATE.
- `handleHistory` 는 `msg.room_id` 로 범위를 잡고 응답은 요청한 `connId` 하나에만.
- `isOnline(botId)` 로 시그니처 단순화. `sendToBot` 삭제(소스 호출자 0).

- 첨부 뿌리 검사(`realpathSync` + `startsWith(filesRoot + sep)`)·없는 파일 건너뛰기·`stored_path` 미노출은 **여기서 의미 그대로 선다** — M2 가 옮겨 온 `handleBotMessage` 첨부 블록이 이 마일스톤에서 새 `deliver` 와 같은 파일 안에 자리 잡기 때문이다. 변이 넷 중 둘(㉢ ㉣)이 이 자리를 잰다.

판정: **AC-BOTMODEL-003 · 004 · 016 · 018 · 019 · 020**.

### M4 — 권한 라우팅과 채널 배선

`server/src/permissions.ts` **조금 고침** · `channel/src/index.ts` **조금 고침** · `channel/src/channel-server.ts` **조금 고침**.

- `permissions.ts`: `ConnInfo.roomId` 의 출처가 프레임이 된다. 대기 맵에 `방:소문자id` 와 `봇:소문자id` **두 색인**을 함께 건다(결정 ①). 문구 넷·`sendToOrigin` 경로·`connId` 없음 갈래의 두 실패 문구 꼬리는 **한 글자도 바꾸지 않는다** — `web/rich.js` 의 `RESOLUTION_RE` 가 그 꼬리에 결합해 있다.
- `channel/src/index.ts`: `onMessage` 안에 «마지막 `to` 방» 변수 하나. `status`·`bot_message`·`history_request`·`permission_request` 네 발신에 `room_id` 를 싣는다. `fetchHistory` 가 `chat_id` 를 게이트웨이로 넘긴다.
- `channel-server.ts`: `meta` 다섯 키, `reply`/`fetch_history` 입력 스키마에 `chat_id`, `INSTRUCTIONS` 문장 교체, `sendPermissionRequest` 에 방 번호.

- **이 마일스톤이 간판 끝 조건 ①②(AC-001 · 002)를 닫는다.** 서버 쪽 절반은 M2(프레임에 `room_id`)와 M3(`deliver`)가 이미 세워 두었고, 여기서 채널이 `meta.chat_id` 를 실어 이음매가 이어진다. 그래서 ①②의 소유 마일스톤은 M4 다 — 앞 마일스톤이 아니라 **마지막으로 착지해야 할 자리**에 건다.

판정: **AC-BOTMODEL-001 · 002 · 005 · 006 · 017 · 021 · 022 · 023**.

### M5 — HTTP 와 화면

`server/src/routes-bots.ts` **새로 씀** · `routes-rooms.ts`·`routes-messages.ts`·`index.ts` **조금 고침** · `web/index.html`·`app.js`·`rich.js`·`rich.d.ts` **조금 고침**.

- `routes-bots.ts`: `POST /api/bots` 가 토큰을 낸다. 참여 라우트 셋(`/bots`). `/invites` 셋 삭제. `sha256Hex`·`deriveBotKeys` 삭제, `inviteCommand` 문안은 재사용하되 host 를 `config.host` 로.
- `routes-rooms.ts`: 보관 트랜잭션에서 토큰 철회 UPDATE 제거 — `closeRoom` 훅만.
- `routes-messages.ts`: 멘션 → 타깃 매핑 SQL 이 `bot_tokens` 대신 `room_bots` 를 본다.
- web: 초대 다이얼로그가 «참여 추가» 가 되고, 등록 명령 표시는 봇 등록 쪽으로 옮긴다. `applyInviteResult`·`clearInviteResult`·`copyText` 는 그대로 재사용하고 `rich.d.ts` 의 `InviteResult` 형 이름·필드만 바꾼다. **`textContent` 전용 규칙과 판정 버튼 잠금은 손대지 않는다.**

판정: **AC-BOTMODEL-011 · 012 · 013 · 024**.

### M6 — 테스트 정리 (기계적)

§C 표대로 다시 씀·고침·삭제. 마지막에 §D 끝 조건 명령 네 개.

판정: **AC-BOTMODEL-007 · 008 · 025**. (「§D 가 덮는다」가 아니라 번호로 적는다 — 번호가 없으면 다음 회차가 다시 센다.)

### §B.7 마일스톤 판정 합집합 — 25/25

| 마일스톤 | 판정 AC | 개수 |
|---|---|---|
| M1 | 009 · 010 | 2 |
| M2 | 014 · 015 · 016 | 3 |
| M3 | 003 · 004 · 016 · 018 · 019 · 020 | 6 (016 은 M2 와 겹침) |
| M4 | 001 · 002 · 005 · 006 · 017 · 021 · 022 · 023 | 8 |
| M5 | 011 · 012 · 013 · 024 | 4 |
| M6 | 007 · 008 · 025 | 3 |

**합집합 = 001~025 전부, 25개.** 겹치는 것은 016 하나뿐이고(M2 가 프레임 모양을, M3 가 이력 라우팅을 잰다) 배정되지 않은 기준은 없다. 이 표는 acceptance.md 의 25 기준과 1:1 로 맞아야 한다 — 어긋나면 acceptance.md 가 정본이다.

---

## §C 파일 처분 (가이드 §2 A-2 · 보고서 §5)

### 소스

| 처분 | 파일 |
|---|---|
| **새로 씀 5** | `server/src/gateway.ts` · `channel/src/gateway-client.ts` · `server/src/db.ts` · `server/src/routes-bots.ts` — 넷이다. 가이드가 센 다섯 중 `auth.ts` 는 **C1 에서 끝났다** |
| **조금 고침** | `channel/src/channel-server.ts` · `channel/src/index.ts` · `server/src/permissions.ts` · `server/src/routes-messages.ts` · `server/src/routes-rooms.ts` · `server/src/index.ts` · web 초대·봇 등록 화면(`web/index.html` · `web/app.js` · `web/rich.js` · `web/rich.d.ts`) |
| **그대로** | `server/src/sse.ts` · `server/src/mention.ts` · `channel/src/truncate.ts` · `web/style.css` · `web/design-tokens.css` · `server/src/auth.ts`(C1 산출물) · `server/src/config.ts` |

> 가이드 §2 A-2 는 «새로 쓰는 파일 5» 라고 적고 괄호로 «auth.ts 는 C1 에서 끝남» 을 함께 적는다. 이 SPEC 이 새로 쓰는 파일은 **넷**이다 — 가이드 문안을 고친 것이 아니라 그 괄호를 셈에 반영했다.

### 테스트

| 처분 | 파일 | 무엇을 |
|---|---|---|
| **다시 씀 3** | `server/test/gateway.test.ts` | 하네스 `wsConnect`·`invite()` 가 v2 핸드셰이크·`bot_tokens` 위에 선다. GWAUTH2 절 약 360줄은 버림. 첨부 뿌리·이력·권한 경로·절대 경로 절은 프레임에 `room_id` 만 더해 남긴다 |
| | `channel/test/gateway-client.test.ts` | 열쇠 헬퍼·스텁 봉투 전면 교체. 재접속·백오프·rid·stop 약 250줄은 맨몸 프레임으로 남긴다 |
| | `server/test/rooms-bots.test.ts` | `invites` 절이 참여 라우트 절로. 봇 등록 응답의 토큰·명령 시험이 새로 든다 |
| **고침 9** | `channel/test/index-wiring.test.ts` | 스텁 핸드셰이크 → `hello{token}`→`welcome`; `chat_id` 단언; welcome 의 `room_id:1` 고정 → `rooms` 배열 |
| | `channel/test/channel-server.test.ts` | `meta` 스키마·단언, 지시문 문장, `pushChatMessage` 입력에 방 번호 |
| | `server/test/permissions.test.ts` | 하네스 `seedRoomAndBot`·`connectV2`; `permission_request` 프레임에 `room_id`. 본체 27건은 그대로 |
| | `server/test/messages.test.ts` | `seed()` 의 `bot_tokens` → `room_bots`; `deliver` 인자. 봉인·커서·격리 15건 본체 그대로 |
| | `channel/test/permission-relay.test.ts` | 스텁 핸드셰이크 한 자리만 |
| | `server/test/web-permission-contract.test.ts` | 하네스; «초대 명령의 토큰으로 접속» 을 봇 등록 명령으로 |
| | `server/test/restart-persistence.test.ts` | 초대 토큰 → 봇 등록 토큰, `connectV2` → 맨몸 hello. 동일성 대조는 그대로 |
| | `server/test/web-rich.test.ts` | 초대 명령 표시·소거를 봇 등록 명령으로 |
| | `server/test/db.test.ts` | 표 목록 |
| **버림 2 + 자산** | `server/test/gateway-v2.ts` (핸드셰이크 사본) · `channel/test/gateway-mutual-auth.test.ts` · `server/test/fixtures/tls-test-*.pem` | |
| **그대로** | `server/test/web-chat.test.ts` · `server/test/mention.test.ts` · `server/test/health.test.ts` · `server/test/wsupgrade-judgment.test.ts` · `channel/test/truncate.test.ts` · `server/test/live-extract.test.ts` · `server/test/auth-name.test.ts` · `server/test/config.test.ts` · `server/test/sse.test.ts` · `server/test/web-shell.test.ts` · `server/test/web-visual.test.ts` · `channel/test/entrypoint.test.ts` | C1 이 이미 하네스를 이름 로그인으로 옮겨 두었다 |

**딸린 정리 한 자리**: `.moai/state/verify/t25-plan/sibling-sweep.mjs` 의 고정 목록에 `'channel/test/gateway-mutual-auth.test.ts'` 줄이 있다(직접 확인). 그 파일을 지우면 이 줄도 함께 지운다 — 남기면 `channel/test/truncate.test.ts` 가 붉어진다.

---

## §D 끝 조건 (가이드 §2 «끝 조건» 글자 그대로)

```bash
npm test
grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|bot_tokens\|revoked_at" server/src channel/src   # 0건
grep -rn "다음에 since_id 로 넘기면" channel/src                                                                # 0건
npx tsx scripts/e2e.mts; echo "exit=$?"   # 판정은 «종료 코드 ≠ 0» — 재작성은 C2 소유
```

**셋째 명령은 가이드보다 좁다**: 가이드 §2 는 `grep -rn "since_id 로" channel/src` 로 적지만 그 형태는 지금 트리에 적중이 **둘**이라 옳게 구현해도 0건이 되지 않는다 — 지울 `INSTRUCTIONS` 문장과, 이 SPEC 이 건드리지 않는 `channel/src/channel-server.ts` 의 `fetch_history` 도구 설명(«다음 요청의 since_id 로는 결과 JSON 의 cursor 필드 값을 그대로 넘긴다»)이다. 그래서 이 절은 지울 문장 하나에만 걸리도록 패턴을 좁혔다. 나머지 세 명령은 가이드 문안 그대로다.

**이 절이 닫는 기준: AC-BOTMODEL-007 · AC-BOTMODEL-008 · AC-BOTMODEL-025.** (소유 마일스톤은 M6 이다.) 넷째 명령의 판정은 「빨간 것을 확인만 한다」가 아니라 **종료 코드가 0 이 아님**이다 — acceptance.md AC-025 와 같은 문안을 쓴다.

출력은 «통과했다» 가 아니라 **명령과 출력 그대로** `progress.md` §E.2 에 남긴다.

---

## §E A-3 sync 범위 (감사 2회차 상한)

가볍게 간다. 손대는 자리는 넷뿐이다.

1. `README.md` 첫 문단 — 핸드셰이크·TLS·t23 서비스화 문장 삭제.
2. `README.md` 설정 표 — `MINIDISCORD_HOST` 항목(C1 의 결정에 맞춰) 확인.
3. `README.md` «봇 초대» 항목 → «봇 등록·방 참여» 로.
4. `ROADMAP` M2·M3 의 «지금» 문단, `codemaps/entry-points.md` 의 프레임 목록.

**감사 FAIL 이 나오면 차단 항목만 고치고 2회차에서 닫는다 — 3회차 이상 돌리지 않는다.**

C2 가 소유하는 것(SPEC 보관 이동·개정 HISTORY·`scripts/e2e.mts` 재작성·codemaps 5종 전면 갱신·ROADMAP v2 절 신설)은 여기서 하지 않는다.

---

## §F 위험과 대응

| # | 위험 | 대응 | 판정 |
|---|---|---|---|
| 1 | 권한 요청 프레임에 방이 없다 | 채널이 «마지막 `to` 방» 을 실음 + 서버가 `봇:id` 이중 색인 | AC-005 · 006 |
| 2 | `chat_id` 의 뜻 변경 (메시지 id → 방 id) | 지시문 문장 삭제 + `message_id` 별도 키 + 세 겹(세션 채움 / 채널 보충 / 서버 거부) | AC-008 · 021 · 022 · 023 |
| 3 | 재접속 재전달의 방별 순서 — **커서 채우는 자리가 둘** | 쿼리 한 번 + 두 자리에 서로를 가리키는 주석 + 방 둘 커서 다름 변이 | AC-003 |
| 4 | 첨부 경로가 방을 넘어 새는가 | `deliver` 의 `room_bots` 참여 검사 **와** 재전송 쿼리의 `JOIN room_bots` — 참여가 뒤늦게 사라진 방이 두 경로 모두에서 막혀야 한다 | AC-004 (갈래 ㉮ 재전송 · ㉯ 실시간) |
| 6 | 프레임 형태 변경이 fixture 에 미치는 범위 | 방향을 갈라 적음 — 필수화는 채널→서버 네 자리로 한정 | AC-015 · 016 |
| 7 | 웹 봇 칩과 `status` 프레임 | `status{room_id, state}` — `working` 은 `to` 의 방, `idle` 은 `reply` 의 방 | AC-017 |

**위험 5**(봇→봇 멘션 되먹임)는 이 SPEC 의 범위 밖이다 — 이 SPEC 에서 봇 글의 멘션은 여전히 어떤 봇에게도 가지 않으므로 되먹임 경로가 열리지 않는다.

---

## §G 안티패턴

- **v1 위에 덧대기.** `gateway.ts` 를 열어 핸드셰이크 블록만 지우는 방식. 접속 상태에서 `roomId` 를 빼는 것이 이 파일의 모든 분기를 바꾸므로, 빈 파일에서 시작하는 편이 diff 도 읽히고 결과도 작다(추정 374 → 약 200줄).
- **커서 한 자리만 고치기.** 위험 3 이 명명한 자리다. `deliver` 와 재전송 루프 둘 다 고친다.
- **`room_id` 를 서버→채널 방향에서도 필수로 만들기.** fixture 약 40자리가 이유 없이 붉어진다.
- **`permissions.ts` 의 실패 문구 손보기.** `web/rich.js` 의 `RESOLUTION_RE` 가 «전달하지 못했습니다 (\<id\>)» 꼬리에 글자 단위로 결합해 있다.
- **`neutralizeEnvelope`·`truncate.ts` 를 «봉투 정리» 로 묶어 지우기.** 이 저장소의 «봉투» 는 둘이고, 지우는 것은 **전선 봉투** 하나뿐이다.
- **범위 확장.** 「보이는 김에」 B·C2 항목을 당겨오면 다음 단계의 diff 를 읽을 수 없게 된다.

---

## §H 상호 참조

- `.moai/reports/v2-refactoring-guide.md` §0(결정 넷) · §2(A 단계) · §6(모든 단계 공통 규칙)
- `.moai/reports/v2-review.md` §1(모듈 처분) · §4(불변식 17) · §5(테스트 처분) · §6(위험 1~7) · §7(SPEC-A)
- `.moai/state/verify/a0/result.md` — 결정 ② 의 실측 근거
- 형제 SPEC: `SPEC-GATEWAY-001`(죽음, 불변식 이관) · `SPEC-CHANCLIENT-001`(죽음, 백오프·rid·stop 이관) · `SPEC-CHANAUTH-001`(죽음, 발신 집합만 이관) · `SPEC-GWAUTH-002`(죽음) — 보관 이동은 C2 가 한다
