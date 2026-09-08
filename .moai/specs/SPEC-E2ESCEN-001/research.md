# SPEC-E2ESCEN-001 조사 기록

> 기준: `main` HEAD `66267ca` (2026-09-08). 아래 행 번호는 전부 이 커밋에서 `cat -n` 으로 직접 읽은 것이다. 낡으면 «앵커» 문자열로 다시 찾는다(`completed-spec-semantics.md` — 행 번호 표는 낡는다).

## §1 지금 있는 것 — 이 SPEC 이 다시 덮지 않는 것

### 1.1 첫째 러너 `scripts/e2e.mts` (484행, `npm run e2e`)

- 실제 서버 프로세스: `spawn('npx', ['tsx', 'server/src/index.ts'])`(73행), 임시 `MINIDISCORD_DATA_DIR`·`MINIDISCORD_BOT_FILES_DIR`, `/api/health` 폴링 기동(89~103행), 기동 시한 초과는 `[boot-timeout]` + exit 9, 그 밖의 실패는 exit 1(33~35행).
- 가짜 봇: 맨몸 JSON WebSocket `/bot`, `hello{token}` → `welcome{bot_id, bot_name, rooms}`(168~195행), 수신 큐로 welcome 직후 연속 프레임을 놓치지 않는다(162~165행).
- 열다섯 단계 «봇 하나·방 둘»(10~14행 주석, 268~449행 본문): 로그인·방 둘·등록·참여·welcome·모르는 토큰·`@TO` 라우팅·봇 답변+첨부·바이트 동일 내려받기·멘션 없는 글·방별 이력(전체·`since_id`)·권한 릴레이 allow 한 경로·오프라인 재전송·재시작 영속성·보관(+t43 봇 글 미저장).
- export: `checkDependencies`·`acquirePort`·`spawnServer`·`waitForBoot`·`step`·`stopServer`·`main`·**`api`**(152행). 모듈 내부: `connect`·`nextFrame`·`expectQuiet`·`pollUntil`·`closeWs`·`fail`·`assert`·`messageForm`·`listMessages`·`runScenarios`·`E2eError`·`cleanup`.
- 상수: `BOOT_TIMEOUT_MS 30_000`·`POLL_INTERVAL_MS 200`·`FRAME_TIMEOUT_MS 10_000`·`QUIET_MS 600`(28~31행). `step(n)` 은 엄격 단조 사다리, `[n/15]` 를 찍는다(105~112행).
- CI 에 없다: `.github/workflows/ci.yml` 은 `npm ci` → `typecheck` 둘 → `npm test` 뿐(26~29행). `ROADMAP.md` 186행 OD-6 «CI 가 `npm run e2e` 를 돌리지 않는다» 가 열려 있다. 벽시계 시간을 적어 둔 자리는 어디에도 없다(`grep -rn "elapsed\|wall-clock\|걸린 시간" scripts/ ROADMAP.md` → 러너 관련 0건).

### 1.2 인프로세스 vitest (server/test/) — 겹치는 관측은 인용만 한다

| 파일 | 덮는 것 | 확인 |
|------|---------|------|
| `gateway.test.ts` | `describe('B: bot-to-bot mentions')` 1250행 — B-1 orchestrator→worker `to`(1263행), B-2 역할 무관(1290행), B-3 미참여 봇 system 한 줄(1315행), B-4 N번째 봇 글 강등·(N-1)번째 유지(1338행); 보관 방 버림(274~277행 seed, t43); AC-016 같은 토큰 소켓 둘의 `history_response` 는 요청 소켓에만(1034행); `dropBot`(875행) | 전부 인프로세스 `buildServer` |
| `permissions.test.ts` | allow/deny/모르는 id/중복/다른 방/죽은 소켓 | `it` **29개** — `cd server && npx vitest run test/permissions.test.ts test/sse.test.ts` → `Tests 38 passed (38)`, sse 9 이므로 29 |
| `sse.test.ts` | 9개(79~203행): 구독자 전달·헤더와 `: connected`·방 격리·프레임 모양·전원 전달·close 정리·구독자 없음 no-op·미인증 거부·`buildServer` 배선 | `it` 9 |
| `restart-persistence.test.ts` | 재시작 뒤 메시지·첨부·토큰 동일성(120·128행, REQ-E2E-009·010 의 인프로세스 짝) | — |

이 SPEC 의 둘째 러너는 위를 **전선에서 봇 둘·관측자와 함께** 다시 잰다. 인프로세스 시험을 옮기거나 지우지 않는다.

### 1.3 채널 플러그인의 이력 잘림 (플러그인 쪽, 서버 아님)

- `channel/src/truncate.ts`: `MAX_BODY_BYTES = 4000`(9행), `MAX_HISTORY_BYTES = 16000`(12행), 표시 `⟪잘림: N바이트 생략⟫`(22~28행), `truncateToBudget`(40~65행).
- `channel/src/index.ts` `fetchHistory`(78~112행): `gw.requestHistory` → 원소별 절단(93~98행) → 총 바이트 초과면 **id 가 가장 큰 것부터** 버림(104~108행) → `cursor` 는 실린 원소의 id 최댓값(85~86행).
- `README.md` 620행(앵커 «원소 하나의 본문은 4,000바이트»)이 이를 문서화한다(«원소 하나의 본문은 4,000바이트, 결과 전체는 16,000바이트 … 새것부터 버리고 … cursor 는 실제로 실린 원소들의 id 최댓값»).
- 인프로세스 시험: `channel/test/truncate.test.ts`(존재 확인). 전선 관측은 없다 → REQ-015(선택 M7).

## §2 서버 계약 — 확인한 자리

### 2.1 `server/src/gateway.ts` (317행)

| 계약 | 행 | 앵커 |
|------|-----|------|
| 비 JSON → 닫기 | 62 | `catch { dropConn(ws); return }` |
| 미인증 → throw → 63행 catch → 닫기 | 109 | `throw new Error('not authenticated')` |
| 정수 아닌 `room_id` → 조용히 버림 | 110~111 | `if (roomId === null) return` |
| 미참여 방 → 조용히 버림 | 114 | `if (!isMember(roomId, info.botId)) return` |
| 보관 방 + `bot_message`/`status` → 버림 | 117 | `!isActiveRoom(roomId)` |
| 분기 넷 | 118~134 | `switch (msg.type)` |
| `status` → `bot_status{bot_id,state}` 발행(working/idle 만) | 122~123 | `hub.publish(roomId, 'bot_status'` |
| `hello` → `welcome` → 재전송 | 138~155 | `function handleHello` — **기존 접속을 보지 않는다**(같은 토큰 둘째 소켓 허용) |
| 재전송: 타깃 행마다 프레임, 방별 커서 | 160~173 | `function replayMissed` |
| `message` 프레임 모양, `local_path` 절대 경로 | 179~186 | `function messageFrame` |
| 삭제된 봇 작성자 «(삭제된 봇)» | 196 | `'(삭제된 봇)'` |
| 봇 글 저장·첨부 봉인(`botFilesDir` 아래만) | 202~236 | `function handleBotMessage` |
| 미참여 봇 이름 system 글 | 241 | `봇은 이 방에 초대되지 않았습니다` |
| 되먹임 상한 상수 | **49** | `const BOT_RUN_LIMIT = 6` |
| 강등 판정·문구 | 246~249 | `사람 글 없이 봇 글이 ${BOT_RUN_LIMIT}개 이어져` |
| 세기 SQL(마지막 사람 글 이후 봇 글, system 은 끊지 않음) | 264~269 | `function botRunSinceLastHuman` |
| 이력: `limit` 을 500 으로 clamp, **DESC LIMIT 뒤 필터** | 272~284 | `Math.min(Number(msg.limit ?? 100) \|\| 100, 500)` · `ORDER BY id DESC LIMIT ?` · `rows.reverse()` |
| `history_response` 는 요청 소켓에만 | 280~283 | `send(ws, { type: 'history_response'` |
| 배달: 접속 전부 순회, 타깃은 `find`(첫 행), 커서 갱신 | 289~297 | `function deliverTo` |
| `sendToOrigin`(판정 통로) | 311~314 | `sendToOrigin(connId, payload)` |
| `dropBot` | 75~77 | `function dropBot` |

### 2.2 `server/src/routes-messages.ts` (176행)

| 계약 | 행 | 앵커 |
|------|-----|------|
| 업로드 100 MB/파일 | 47 | `fileSize: 100 * 1024 * 1024` |
| 권한 답 가로채기 → `200 {ok:true, consumed_by:'permission'}` | 63~65 | `tryHandleUserReply` |
| 미참여 봇 멘션 → 400 | 76~78 | `봇은 이 방에 초대되지 않았습니다` |
| 겹친 멘션 → 행 둘(중복 제거 없음) | 94~97 | `같은 봇을 to·cc 로 함께 멘션해도 중복 제거하지 않는다` |
| SSE 발행 + 게이트웨이 배달 각 1회 | 107~109 | `hub.publish(roomId, 'message'` |
| 목록 `?after=`: 없으면 0, 숫자 아니면 `[]`, 없는 방 `[]`, `LIMIT 200` | 117~133 | `ORDER BY id ASC LIMIT 200` |
| 내려받기 404 삼중 봉인 | 144 · 147 · 152 | `파일을 찾을 수 없습니다` |

### 2.3 `server/src/permissions.ts` (132행)

| 계약 | 행 | 앵커 |
|------|-----|------|
| 사람 답 정규식 | 7 | `PERMISSION_REPLY_RE` |
| `request_id` 형식 | 13 | `PERMISSION_REQUEST_ID_RE = /^[a-km-z]{5}$/` |
| 만료·상한 없음 | 45~47 | `@MX:DEBT` |
| 색인 둘(방:id · 봇:id), 다른 방의 답은 참여 확인 뒤 봇 색인으로 | 48~64 | `const open` · `const byBot` · `findByBot` |
| 형식 밖 id → 등록 없이 ⚠️ | 77~83 | `request_id 가 형식에 맞지 않아 등록하지 않았습니다` |
| 색인 삭제가 전송보다 먼저 | 111~112 | `open.delete(` |
| 판정은 `sendToOrigin` 으로만 | 119~121 | `app.gateway.sendToOrigin` |
| 결과 문구 셋(끊김·신원 없음·승인/거절) | 123~127 | `요청한 세션이 끊겨` |
| 결과 글은 요청의 방에 | 128 | `postSystem(info.roomId, body)` |

### 2.4 SSE · 멘션 · 신원 · 등록/삭제

| 파일 | 계약 | 행 |
|------|------|-----|
| `routes-events.ts` | `GET /api/rooms/:id/events`, `requireAuth` preHandler, hijack | 11~14 |
| `sse.ts` | `: connected\n\n` 한 번(25), 프레임 `event: X\ndata: JSON\n\n`(49), `id:`/`retry:` 없음 | 19~32 · 46~51 |
| `mention.ts` | `@(TO\|CC)\(([^()\s]+)\)`, 중복 제거 없음 | 3 |
| `auth.ts` | 사람 이름 32자·`\p{Cc}\p{Cf}\p{Zl}\p{Zp}` 금지 | 14 · 18 |
| `routes-bots.ts` | `POST /api/bots`: `trim` 비어 있지 않음·role·UNIQUE 409 뿐(길이·형식 문자 검사 없음) | 60~76 |
| `routes-bots.ts` | `DELETE /api/bots/:id`: 트랜잭션(작성자 NULL → targets → room_bots → bots) 뒤 `dropBot` | 108~123 |
| `db.ts` | `created_at TEXT DEFAULT (datetime('now'))` — 초 단위 UTC 문자열, `since`/`until` 은 문자열 비교 | 24 · 33 |

## §3 SSE 이벤트 발행 자리(전수)

`grep -n "hub.publish" server/src/*.ts` — `gateway.ts` 123(`bot_status`)·236(`message`, 봇 글)·260(`message`, system) · `routes-messages.ts` 107(`message`, 사람 글) · `permissions.ts` 70(`message`, system). 이벤트 이름은 `message`·`bot_status` 둘뿐이다. 모든 `message` payload 는 `attachments` 를 `{id, filename}` 으로만 싣고 `stored_path` 를 빼 놓았다(주석 `sync-audit F-02` — 234·260행, `routes-messages.ts` 129행).

## §4 위임 요약과 코드가 어긋난 자리 — 코드를 따랐다

| # | 위임 요약 | 코드 | 이 SPEC 의 처리 |
|---|-----------|------|-----------------|
| 1 | `api` 는 모듈 내부(export 안 됨) | `export async function api`(`e2e.mts` 152행) | 이미 export 돼 있으므로 «옮긴다» 는 같다. `plan.md` §A 에 export 목록을 바로잡았다 |
| 2 | `BOT_RUN_LIMIT = 6` 이 48행 | 48행은 주석, **49행**이 `const` | 49행으로 인용 |
| 3 | 겹친 `@TO(B) @CC(B)` → «타깃 행 둘 / 프레임 둘» | 행은 둘(`routes-messages.ts` 94~97행)이지만 실시간 배달은 `deliverTo` 가 `targets.find`(291행)라 **접속당 프레임 하나**. 재전송 `replayMissed`(161~171행)는 타깃 행마다 보내므로 **둘** | REQ-011 (ㄷ) 을 «실시간 1 / 재전송 2» 의 두 관측값으로 갈라 적고, `plan.md` §G ⑤ 로 올렸다 |
| 4 | `permissions.test.ts` 33 tests | `it` 29개(vitest 실행 `38 passed` − sse 9) | §1.2 에 실측값 |
| 5 | 커서 걸음(`since_id = 마지막 id` 반복)이 빠짐·겹침 없이 전부를 덮는다 — 통과 기준 | `handleHistory` 는 `ORDER BY id DESC LIMIT ?` 로 **가장 새로운 N 을 먼저 자른 뒤** `since_id` 를 거른다(273~277행). 밀린 글 > `limit` 이면 오래된 쪽이 걸음에서 빠진다 | «`limit ≥ 밀린 수` 이면 빠짐·겹침 0» 만 단언하고, 작은 `limit` 의 걸음은 관측 항목 `history.cursor-walk` 로. `plan.md` §B.1·§G ① |
| 6 | (오케스트레이터 정정) 같은 토큰 소켓 둘 → «이중 배달·커서 두 번 전진» | `deliverTo` 는 그 봇의 접속 전부에 보낸다 — `gateway.test.ts` 1034~1062행 AC-016 이 의도된 동작으로 단언. `advanceCursor` 는 접속마다 같은 값을 같은 행에 다시 쓴다(101~103행) — «두 번 오름» 이 아니다 | REQ-011 (ㄱ) 은 «둘째 접속이 거절·퇴출되지 않는다(운영 전제 ‹봇 하나 = 세션 하나› 미강제)» 로 적었다. `plan.md` §B.4·§G ③ |

## §5 이 SPEC 의 인프로세스 시험이 가능한지 (REQ-014)

- `scripts/e2e-lib.mts` 는 `.mts` 라 `server/` 의 vitest(ESM, `tsx` 없이 vitest 자체 변환)가 상대 경로로 import 할 수 있다 — `server/test/web-chat.test.ts` 가 `web/app.js` 를 상대 경로로 읽는 선례가 있다. `server/tsconfig.json` 은 `include: ["src", "test"]`·`strict: true` 이고 tsc 는 include 를 뿌리로 import 를 **따라가므로**, `pretest` 의 `tsc --noEmit` 이 `scripts/e2e-lib.mts` 까지 strict 로 검사한다 — 추출 코드는 strict-clean 이어야 한다. 감사관의 읽기 전용 탐침(`npx tsc --noEmit --ignoreConfig --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --target ES2022 --types node ../scripts/e2e.mts`, server 에서) 은 현행 `e2e.mts` 에 대해 종료 0 이었다(`.moai/reports/e2escen/plan-audit.md` 5(a)). 초판의 «시험 파일만 본다» 는 틀린 전제였다(감사 D8).
- `expectQuiet`·`nextFrame` 은 `inboxes` WeakMap 에 등록된 객체를 받으므로, 시험은 `connect` 없이 큐를 직접 세울 수 있어야 한다 — 추출 때 `registerInbox(ws)`(또는 같은 뜻의 내부 export)를 시험용으로 열어 둔다. 이는 `plan.md` M1 3번의 작은 결정이다.

## §6 실행 예산 근거

- 첫째 러너는 침묵 창 `600 ms` 를 여섯 번(⑩·⑬×3·⑭·⑮×2 ≈ 7회), 재시작 한 번을 쓴다. 벽시계 기록은 없다.
- 둘째 러너는 침묵 창을 십수 회, 재시작 한 번, R2 채우기 500 프레임과 초 넘김 대기(≤ 1,100 ms) 한 번을 쓴다. `FRAME_TIMEOUT_MS 10 s` 는 «오지 않는 실패» 의 상한이지 정상 경로의 비용이 아니다.
- 규약: `.claude/rules/moai/workflow/kanban-dispatch.md` § Verification load is lane-local — 배경 부하 금지, 정리 보장 없는 프로세스 금지. 둘째 러너가 띄우는 프로세스는 서버(그리고 M7 의 채널) 뿐이며 둘 다 `finally` 에서 거둔다.
