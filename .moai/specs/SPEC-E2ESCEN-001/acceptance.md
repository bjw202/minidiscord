# SPEC-E2ESCEN-001 수용 기준

각 기준은 **명령 하나 이상 + 관측 가능한 결과** 다. 판정은 이분법이다.

판정 명령은 셋이다 — ① `npm run e2e:scenario`(표준 출력·표준 오류·종료 코드), ② `cd server && npx vitest run test/e2e-lib.test.ts`, ③ 몇 개의 bash 검사. ①의 출력은 한 번 받아 파일에 두고 여러 AC 가 그 파일을 `grep` 한다 — `npm run e2e:scenario > .moai/state/verify/e2escen/scenario.txt 2>&1; echo $? > .moai/state/verify/e2escen/scenario.exit`.

## 이 문서가 지키려는 것 — 빈 러너와 «전부 단언» 러너가 둘 다 떨어지게

형제 SPEC 이 세운 부류 넷(존재만 보기·이름 없는 통과·부재 보기·깨진 구현과 양립)을 열다섯 기준에 적용했다. 이 SPEC 에서 특히 가까운 두 형태:

| 잘못된 구현 | 통과할 뻔한 기준 | 막는 관측 |
|-------------|-----------------|-----------|
| 단계 표지만 찍고 단언은 비어 있는 러너 | AC-003 | AC-004~AC-009 가 각각 «잘못된 값이면 붉어지는» 수를 요구하고, AC-011 의 변이가 «판정이 실제로 결과에 닿는다» 를 관측 항목의 반대 방향으로 확인한다 — 관측 항목만 판정에 닿지 않아야 하므로 시나리오 단언 하나를 뒤집으면 종료 코드 1 이어야 한다(AC-011 둘째 갈래) |
| 관측 항목을 `assert` 로 써서 서버의 현재 동작을 «정답» 으로 못 박는 러너 | AC-010 | AC-011 첫째 갈래 — 관측값을 뒤집어도 종료 코드 0 |

## 공통 — 출력 파일과 표지 수

- `N` 은 둘째 러너의 단계 수다. 이 문서는 `N` 을 고정하지 않는다 — «`[1/N]` 부터 `[N/N]` 까지 빠짐·역순 없이» 를 명령으로 센다(`grep -oE '^\[[0-9]+/[0-9]+\]$'`). 러너가 단계를 더하면 `N` 이 함께 는다.
- 관측 항목 이름 집합(8)은 AC-010 이 열거한다. 이 수는 고정이다 — 러너가 관측 항목을 더하면 이 문서와 `plan.md` §B.4·§G 를 함께 고친다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 | 판정 |
|----|----------|------|-------------|------|
| AC-E2ESCEN-001 | REQ-001, REQ-016 | bash | 추출 전후 `npm run e2e` 출력 diff 0줄(포트 가림)·종료 코드 0·0; `e2e.mts` 에 lib import 1건 이상·지역 도우미 정의 0건 | 자동 |
| AC-E2ESCEN-002 | REQ-014, REQ-001 | vitest | `test/e2e-lib.test.ts` 통과, `it` 3개 이상, `failed` 0 | 자동 |
| AC-E2ESCEN-003 | REQ-002, REQ-003, REQ-004 | scenario + bash | 종료 코드 0; 표지 연속; 마지막 줄; 점유 포트 강제 시 `[boot-timeout]`·9 | 자동 |
| AC-E2ESCEN-004 | REQ-005 | scenario | G1 네 관측 | 자동 |
| AC-E2ESCEN-005 | REQ-006 | scenario | G2 — 침묵 창 시점 `to` 5·`cc` 1·system 1·봇 글 6 → ⑦ 뒤 `cc` 2·system 2, 사람 글 뒤 `to` 복귀 | 자동 |
| AC-E2ESCEN-006 | REQ-007 | scenario | G3 여섯 관측 | 자동 |
| AC-E2ESCEN-007 | REQ-008 | scenario | G4 여섯 관측(마지막은 관측 항목) | 자동 |
| AC-E2ESCEN-008 | REQ-009 | scenario | G5-a — 배치 «채우기 전 셋 → A 500 → 초 넘김 → 사람 1», REST≡history, 다섯 필터의 기대 id 집합·개수(499·499·10·3·500), 500 잘림, 마지막 사람 글 포함, 밀린 480 걸음 빠짐 0 단언 + 밀린 504 걸음 관측 | 자동 |
| AC-E2ESCEN-009 | REQ-010 | scenario | G5-b 세 관측 — «(삭제된 봇)» 은 R1 에서 삭제 전 B 글 수(≥ 1)와 같은 수 | 자동 |
| AC-E2ESCEN-010 | REQ-011, REQ-012 | bash | `[observe]` 8줄, 이름 8개 전부, `[observe-summary] 8 items` | 자동 |
| AC-E2ESCEN-011 | REQ-012 | bash(변이) | 관측값 뒤집기 → 0·표지 전부; 시나리오 단언 뒤집기 → 1·표지 멈춤; `observe()` 본문에 `assert(`·`fail(` 0건 | 자동 |
| AC-E2ESCEN-012 | REQ-013 | bash | 시한 없는 대기·무한 반복 0건; 정상·실패 둘 다 `[elapsed] <정수> ms` | 자동 |
| AC-E2ESCEN-013 | REQ-015 | scenario | 플래그 없음 → `[skip] G7` 1줄·0; `--with-channel` → 잘림·큰 id 먼저·cursor 재수신(M7, 미룰 수 있음) | 자동 |
| AC-E2ESCEN-014 | REQ-016 | bash | `66267ca` 기준 보호 경로 diff 비어 있음; 변경 파일 ⊆ 여섯 + 산출물 경로 | 자동 |
| AC-E2ESCEN-015 | REQ-002, REQ-016 | bash | `npm test`·`npm run e2e`·`npm run e2e:scenario` 종료 코드 0·0·0 | 자동 |

---

## Given-When-Then 시나리오

### AC-E2ESCEN-001 — 도우미 추출 뒤 첫째 러너의 출력이 같다

**Given** 추출 전 `main` 에서 `npm run e2e > before.txt 2>&1` 을 받아 두었고 종료 코드가 0 이다(`echo $?` 를 `before.exit` 에).
**When** 추출을 끝낸 나무에서 다음을 실행한다.

```bash
npm run e2e > after.txt 2>&1; echo $? > after.exit
sed -E 's/127\.0\.0\.1:[0-9]+/127.0.0.1:PORT/g' before.txt > b.txt
sed -E 's/127\.0\.0\.1:[0-9]+/127.0.0.1:PORT/g' after.txt  > a.txt
diff b.txt a.txt | wc -l                       # (1)
cat before.exit after.exit                     # (2)
grep -c "from './e2e-lib.mts'" scripts/e2e.mts # (3)
grep -cE '^(export )?(async )?function (api|connect|nextFrame|expectQuiet|pollUntil|closeWs|fail|assert|messageForm|listMessages)\b' scripts/e2e.mts   # (4)
grep -c '^\[[0-9]*/15\]$' after.txt            # (5)
```

**Then** (1) `0` · (2) `0` 과 `0` · (3) `1` 이상 · (4) `0` · (5) `15`. 마지막 줄 «E2E PASS — 15 단계 전부 통과 (봇 하나 · 방 둘)» 이 `after.txt` 에 있다. 도우미를 복사해 두 벌로 둔 구현은 (4) 에서, 출력 문구를 조금이라도 바꾼 구현은 (1) 에서 떨어진다.

### AC-E2ESCEN-002 — 공용 도우미의 인프로세스 시험

**Given** `server/test/e2e-lib.test.ts` 가 `scripts/e2e-lib.mts` 를 import 한다(실제 서버 없음).
**When** `cd server && npx vitest run test/e2e-lib.test.ts` 를 실행한다.
**Then** 종료 코드 0, `failed` 0 이고 다음 `it` 셋이 있다(이름은 자유, 관측은 고정).

- `expectQuiet`: 가짜 소켓의 큐에 프레임을 하나 넣어 두면 `E2eError` 로 거부되고, 큐가 비어 있고 `QUIET_MS` 동안 아무것도 오지 않으면 해소된다 — 그리고 해소까지 걸린 시간이 `QUIET_MS` 이상 `QUIET_MS + 200` 미만이다(`performance.now()` 로 잰다).
- `nextFrame`: 프레임이 오지 않는 가짜 소켓에 `timeoutMs: 50` 으로 부르면 `E2eError` 로 거부되고 `err.exitCode === 1` 이며 표준 오류에 `[fail] ` 로 시작하는 한 줄이 찍힌다.
- `api`: `fetch` 를 `vi.stubGlobal` 로 바꿔 두면, `{ cookie: 'md_session=x' }` 가 요청 헤더 `cookie` 로 실리고, `json` 은 `content-type: application/json` + 문자열 본문으로, `form` 은 `FormData` 본문으로(그리고 `content-type` 을 손수 넣지 않고) 나간다.

`npm test -w server` 에 이 파일이 포함된다(`vitest run` 이 `test/**` 를 잡는다).

### AC-E2ESCEN-003 — 둘째 러너의 골격: 표지 사다리·마지막 줄·기동 시한

**Given** 의존성이 설치돼 있고 빈 포트가 있다.
**When** 다음을 실행한다.

```bash
npm run e2e:scenario > scenario.txt 2>&1; echo $?                                   # (1)
grep -oE '^\[[0-9]+/[0-9]+\]$' scenario.txt | awk -F'[/\\[\\]]' '{print $2, $3}' \
  | awk 'BEGIN{ok=1} {if ($1 != NR || $2 != N && NR>1) ok=0; N=$2} END{print (ok && NR==N) ? "ladder-ok" : "ladder-broken"}'   # (2)
tail -n 2 scenario.txt                                                              # (3)
timeout 25 node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);setTimeout(()=>s.close(),20000)})" > port.txt &   # timeout 이 바깥에서 수명을 묶는다 — kanban-dispatch § Verification load
sleep 1; E2E_FORCE_PORT=$(cat port.txt) npx tsx scripts/e2e-scenario.mts > boot.txt 2>&1; echo $?   # (4)
grep -c '^\[boot-timeout\]$' boot.txt                                               # (5)
```

**Then** (1) `0` · (2) `ladder-ok`(1 부터 N 까지 연속, 분모가 모두 같다) · (3) 마지막에서 둘째 줄이 `[elapsed] <정수> ms`, 마지막 줄이 «E2E-SCENARIO PASS — N 단계 전부 통과 (봇 둘 · 방 둘 · 관측자 하나)» · (4) `9` · (5) `1`. (4) 는 서버가 그 포트에 못 서므로 `/api/health` 가 30초 안에 오지 않는 경로다.

### AC-E2ESCEN-004 — G1 봇 간 전달

**Given** A·B 가 R1·R2 에 참여해 접속했고 C 는 등록만 됐다. B 의 정책은 `to` 에 «B 답» 을 돌려준다.
**When** 러너의 G1 단계가 돈다 — A 가 R1 에 `@TO(B) 1`, `@CC(B) 2`, `@TO(C) 3` 을 차례로 `bot_message` 로 보내고, 사람이 R1 에 `@TO(C) 4` 를 POST 하며, A·B 가 각각 R1 `history_request` 를 낸다.
**Then** 단계 표지가 찍히려면 러너가 다음을 단언했어야 한다.

- (ㄱ) B 의 `received` 에 `type:'message'`·`delivery:'to'`·`author_type:'bot'`·`author_name:'A'`·`body:'@TO(B) 1'` 프레임이 정확히 하나; R1 목록에 `author_type:'bot'`·`author_name:'B'`·`body:'B 답'` 이 있다.
- (ㄴ) B 에 `delivery:'cc'`·`body:'@CC(B) 2'` 프레임이 하나 오고, A 는 침묵 창 동안 프레임 0(`expectQuiet`).
- (ㄷ) R1 목록에 `author_type:'system'`·`body:'C 봇은 이 방에 초대되지 않았습니다'` 가 있고(`pollUntil`), A·B 모두 침묵 창 동안 새 프레임 0; 사람의 POST 는 `400` 이고 `error` 가 같은 문구다.
- (ㄹ) A 와 B 의 `history_response.messages.map(m => m.id)` 가 같다.

C 를 방에 참여시킨 채로 (ㄷ) 을 돌리면 프레임이 와서 붉어진다 — 부재 관측은 `expectQuiet` 로만 한다.

### AC-E2ESCEN-005 — G2 되먹임 차단(전선)

**Given** A 의 정책 `onTo: m => ({ body: '@TO(B) ' + (n+1) })`, B 의 정책 `onTo: m => ({ body: '@TO(A) ' + (n+1) })`(n 은 받은 글의 번호).
**When** 사람이 R1 에 `@TO(A) 시작` 을 POST 하고, 러너가 침묵 창(양쪽 소켓 `expectQuiet`)을 기다린 뒤, A 로 `@TO(B) 7` 을 강제로 보내고, 다시 사람이 `@TO(A) 다시` 를 POST 한다.
**Then** 단계 표지가 찍히려면 러너가 다음을 단언했어야 한다(`plan.md` §B.5 표의 시점 그대로).

- 침묵 창 시점: A·B 의 `received` 에서 `type:'message'` 이고 `author_type:'bot'` 인 프레임의 `delivery` 열이 순서대로 `to,to,to,to,to,cc`(A: `to,to,cc` · B: `to,to,to`) 이고, R1 목록의 봇 글이 정확히 6, system 글 «사람 글 없이 봇 글이 6개 이어져 @TO 를 cc 로 내렸습니다» 가 정확히 1.
- `@TO(B) 7` 뒤: B 에 `delivery:'cc'` 프레임 하나 더, system 글 2, B 의 정책은 답하지 않아 A 침묵.
- `@TO(A) 다시` 뒤: A 에 `delivery:'to'`, A 의 답이 B 에 `delivery:'to'` 로 도착.

상한이 5 로 어긋난 구현(또는 시나리오)은 첫 열의 다섯째가 `cc` 라 붉어지고, system 글이 세기를 끊는 구현은 `@TO(B) 7` 이 `to` 로 와서 붉어진다.

### AC-E2ESCEN-006 — G3 SSE 관측자

**Given** 관측자가 R1 을 구독해 `: connected` 를 받았다.
**When** 사람 글 1, A 의 첨부 있는 봇 글 1(`botFilesDir` 안 파일), A 의 `status{working}` → `status{idle}`, `@TO(C)` 로 system 글 1 이 R1 에 흐른 뒤 관측자가 `abort()` 하고, 사람 글 3 이 더 저장되고, 러너가 `?after=<끊기 전 마지막 id>`·`?after=abc`·`GET /api/rooms/999999/messages` 를 부른다.
**Then** 단계 표지가 찍히려면 러너가 다음을 단언했어야 한다.

- (ㄱ) `record.connected === true` 이고 `events[0]` 이 `: connected` 뒤에 온 첫 `event:` 다.
- (ㄴ) 구독 구간에 저장된 글마다 `event:'message'` 이고 `data.id` 가 같은 이벤트가 **정확히 1개**(중복 0·누락 0), `data.author_name`·`data.author_type` 이 목록 조회와 같다.
- (ㄷ) 첨부 있는 봇 글의 `data.attachments` 가 `[{ id: <number>, filename: <string> }]` 이고, `JSON.stringify(record).includes('stored_path') === false`.
- (ㄹ) `event:'bot_status'` 의 `data` 열이 `[{bot_id:A, state:'working'}, {bot_id:A, state:'idle'}]` 순서.
- (ㅁ) 되찾기 응답의 `messages.map(m => m.id)` 가 끊긴 뒤 저장된 세 id 와 같고(오름차순), 끊기 전 id 는 하나도 없다.
- (ㅂ) `?after=abc` 와 없는 방 모두 `{ messages: [] }`.

### AC-E2ESCEN-007 — G4 권한 릴레이 전 경로

**Given** B 가 R1·R2 에 참여해 접속했고 A 도 접속해 있다.
**When** 러너가 다음을 차례로 한다 — B 가 `permission_request{room_id:R1, request_id:'bcdef'}` → 사람이 R1 에 `no bcdef`; B 가 `{room_id:R1, request_id:'cdefg'}` → 사람이 **R2** 에 `yes cdefg` → 다시 `yes cdefg`; B 가 `{room_id:R1, request_id:'defgh'}` → B 소켓 닫기 → 사람이 `yes defgh`; B(재접속) 가 `request_id:'abcdl'` 과 `'abcd'` → 사람이 `yes abcdl`; B 가 `fghij` 부터 서로 다른 id 로 20개 → 사람이 첫 id 로 `yes`.
**Then** 단계 표지가 찍히려면 러너가 다음을 단언했어야 한다.

- (ㄱ) POST 응답 `consumed_by:'permission'`; R1 목록에 «⛔ 거절 전송됨 (bcdef)»; B 의 `verdicts` 에 `{request_id:'bcdef', behavior:'deny'}` 정확히 1, A 의 `verdicts` 0 (침묵 창).
- (ㄴ) R2 의 `yes cdefg` 응답 `consumed_by:'permission'`; B 의 `verdicts` 에 `allow` 1; «✅ 승인 전송됨 (cdefg)» 는 **R1** 목록에 있고 R2 목록에는 없다.
- (ㄷ) 둘째 `yes cdefg` 응답에 `consumed_by` 키가 없고 `message.author_type === 'user'`·`body === 'yes cdefg'`; R2 목록에 그 글이 있다.
- (ㄹ) `yes defgh` 응답 `consumed_by:'permission'`; R1 목록에 «⚠️ 요청한 세션이 끊겨 판정을 전달하지 못했습니다 (defgh)».
- (ㅁ) R1 목록에 «⚠️ 봇이 보낸 승인 요청의 request_id 가 형식에 맞지 않아 등록하지 않았습니다» 로 시작하는 글이 2(`abcdl`·`abcd`); `yes abcdl` 응답에 `consumed_by` 없음·`author_type:'user'`.
- (ㅂ) 관측 항목 `[observe] permission.no-expiry: {"unanswered":20,"first_still_resolves":<bool>}` 한 줄 — 값은 단언하지 않는다.

### AC-E2ESCEN-008 — G5-a 대화 DB 와 이력 필터

**Given** R2 의 글 배치는 다음 한 문장으로 고정되며 아래의 모든 상수는 여기서 유도된다 — **«채우기 전 셋»(사람 글 2·system 글 1) → A 의 멘션 없는 `bot_message` 500 («채우기», 채우기 #1~#500) → 벽시계 초가 넘어갈 때까지 대기 → 사람의 멘션 없는 글 1 («마지막 사람 글») → 기준 집합 = 그 뒤의 `history_request{limit:500}` 응답 = 채우기 #2~#500 (A 499) + 마지막 사람 글 1 = 500.** 방 전체는 504 개다. 마지막 사람 글이 어느 봇 소켓에도 오지 않았음을 양쪽 `expectQuiet` 로 확인한다. 초 넘김 대기는 러너가 채우기 #500 의 저장을 확인한 뒤 `pollUntil`(시한 1,100 ms) 로 `Math.floor(Date.now() / 1000)` 이 바뀔 때까지 기다리는 것이다 — 서버와 러너는 같은 호스트라 같은 시계를 쓰고, `created_at` 은 초 단위 문자열(`db.ts` 48행 `datetime('now')`)이라 이 대기 없이는 채우기 500 개와 사람 글이 한 초 안에 들어갈 수 있다. 대기 뒤 러너는 «마지막 사람 글의 `created_at` > 채우기 #500 의 `created_at`»(문자열 비교)을 먼저 **단언**한다 — 초 넘김이 실패하면 여기서 붉어진다. 채우기 #1 의 `created_at` 은 `GET /api/rooms/R2/messages?after=<채우기 전 셋의 마지막 id>` 의 첫 원소에서 읽는다.
**When** 러너가 REST 목록과 `history_request` 를 아래 인자로 부른다.
**Then** 단계 표지가 찍히려면 러너가 다음을 단언했어야 한다.

- (ㄱ) 채우기 전 셋만 있던 시점에 `GET /api/rooms/R2/messages` 의 `messages.map(m => [m.id, m.body])` 와 `history_request{limit:500}` 의 `messages.map(m => [m.id, m.body])` 가 같고 길이가 정확히 3.
- (ㄴ) 마지막 사람 글 뒤, 응답 id 열이 기대 집합의 id 열과 **같다**(`JSON.stringify` 대조 — 부분집합이나 «전부 만족» 이 아니다). 기대는 전부 기준 집합(채우기 #2~#500 + 마지막 사람 글)에서 유도한 상수다:
  - `since_id: X`(X = 기준 집합의 뒤에서 11번째 id = 채우기 #491) → 기대 = 채우기 #492~#500 + 마지막 사람 글, 길이 정확히 10.
  - `since: T1, until: T2`(T1 = 채우기 #1 의 `created_at`, T2 = 마지막 사람 글의 `created_at`) → 기대 = 기준 집합 중 `T1 ≤ created_at < T2` = 채우기 #2~#500 전부, 길이 정확히 **499** — 초 넘김 대기 덕에 마지막 사람 글은 T2 에서 빠지고 채우기는 전부 T1 이상이다(상수이며 실행마다 같다).
  - `speaker: 'A'` → 기대 = 채우기 #2~#500, 길이 정확히 **499**(기준 집합 500 중 마지막 사람 글 하나는 사람이다); `speaker: '시스템'` → 길이 정확히 0(system 글은 채우기 전 셋에 있어 최근 500 밖) — 이어서 `speaker: '시스템', limit: 500` 을 채우기 **전** 시점에 부른 결과(러너가 (ㄱ) 에서 함께 받아 둔다)는 길이 정확히 1.
  - `limit: 3` → 기대 = 채우기 #499·#500 + 마지막 사람 글, 길이 정확히 3.
  - `limit: 9999` → 길이 정확히 500 이고 첫 원소가 채우기 #2, 마지막 원소가 마지막 사람 글.
- (ㄷ) 마지막 사람 글의 id 가 A·B 양쪽의 `history_request{limit:500}` 응답에 있다(채운 뒤 보낸 글이라 가장 새로운 500 안에 있다).
- (ㄹ) 걸음 둘. **단언 갈래**: `since_id` 를 «밀린 수 480» 이 되는 id(기준 집합의 뒤에서 481번째 id = 채우기 #21)로 잡고 `limit: 500` 으로 걸으면 첫 응답이 정확히 480 개(채우기 #22~#500 + 마지막 사람 글)이고 둘째 응답이 0 개 — 빠짐 0·겹침 0 을 **단언한다**. **관측 갈래**: `since_id: 0`(밀린 수 = 방 전체 504, `limit` 초과)·`limit: 100` 으로 `since_id = 마지막 id` 갱신 반복 → `[observe] history.cursor-walk: {"backlog":504,"limit":100,"steps":<k>,"missed_ids":<m>}` 한 줄 — 값은 단언하지 않는다. 현행 코드(`gateway.ts` 271~277행: `ORDER BY id DESC LIMIT ?` 뒤에 `since_id` 필터)에서는 첫 응답이 가장 새로운 100 이라 `missed_ids` 가 0 보다 클 것으로 예상되며, 그 값이 `plan.md` §G ① 의 입력이다.

### AC-E2ESCEN-009 — G5-b 재시작·봇 삭제·재전송과 이력의 겹침

**Given** G5-a 가 끝난 상태.
**When** 러너가 서버를 같은 데이터 디렉터리로 재시작하고 A·B 를 다시 붙이며 관측자를 다시 구독한다; 이어서 B 가 붙은 채 `DELETE /api/bots/<B>` 를 부르고, 같은 이름으로 다시 등록하며, 옛 토큰으로 `hello` 를 보낸다; 이어서 A 를 닫고 사람이 R1 에 `@TO(A)` 둘을 보낸 뒤 A 를 다시 붙인다.
**Then** 단계 표지가 찍히려면 러너가 다음을 단언했어야 한다.

- (ㄱ) 재접속 `welcome.rooms` 의 `room_id` 집합이 재시작 전과 같고, 두 소켓 모두 침묵 창 동안 재전송 0; A 의 R1·R2 `history_response` id 열이 재시작 전과 같고; 관측자 `?after=<마지막 id>` 가 `[]`.
- (ㄴ) DELETE 응답 `{ok:true}` 뒤 B 소켓의 `close` 가 시한 안에 온다(걸린 ms 는 `[observe] bots.delete-while-connected-close-ms` 로 찍는다); 삭제 **전** 러너가 R1 목록에서 `author_type:'bot'`·`author_name:'B'` 인 글을 세어 둔 수 `nB` 가 1 이상이고(현행 시나리오는 G1 «B 답» 1 + G2 ②④⑥ = 4), 삭제 뒤 R1 목록에서 `author_name:'(삭제된 봇)'` 인 글이 정확히 `nB` 개·`author_name:'B'` 인 글이 0 개이며 A 의 R1 `history_response{limit:500}` 도 같은 두 수를 낸다; 같은 이름 `POST /api/bots` 가 `201` 이고 `id` 가 다르다; 옛 토큰의 `hello` 는 프레임 0 으로 닫힌다.
- (ㄷ) A 재접속 뒤 `type:'message'` 프레임이 정확히 2 이고 그 id 열이 `history_request{room_id:R1, since_id:<닫기 전 마지막 id>}` 의 id 열과 같다(겹침은 설계된 것).

### AC-E2ESCEN-010 — 관측 항목 여덟과 요약

**Given** `scenario.txt`.
**When** 다음을 실행한다.

```bash
grep -c '^\[observe\] ' scenario.txt                                   # (1)
for n in permission.no-expiry history.cursor-walk identity.same-token-two-sockets identity.zero-width-name \
         mention.duplicate-live-frames mention.duplicate-replay-frames permission.cross-room-outcome-room \
         bots.delete-while-connected-close-ms; do grep -c "^\[observe\] $n: " scenario.txt; done   # (2)
grep -c '^\[observe-summary\] 8 items$' scenario.txt                   # (3)
```

**Then** (1) `8` · (2) 여덟 줄 모두 `1` · (3) `1`. 각 관측값은 JSON 한 줄이며 `identity.same-token-two-sockets` 의 값은 `{"sockets_received":<n>,"second_hello_rejected":<bool>,"history_reply_to_requester_only":<bool>}` 모양이다(값 자체는 단언하지 않는다 — 두 소켓이 모두 받는 것은 `gateway.test.ts` AC-016 의 의도된 동작이고, 관측의 요지는 둘째 접속이 거절되지 않는다는 것이다).

### AC-E2ESCEN-011 — 관측 항목은 판정에 닿지 않고, 시나리오 단언은 닿는다 (변이)

**Given** 둘째 러너의 원본.
**When** (a) `observe('permission.no-expiry', …)` 에 넘기는 값의 불리언 하나를 부정으로 뒤집은 사본으로, (b) G1 (ㄱ) 의 `delivery === 'to'` 단언을 `'cc'` 로 뒤집은 사본으로 각각 실행한다(사본은 `scripts/` 밖 임시 경로에 두고 실행 뒤 지운다).
**Then** (a) 종료 코드 `0`·표지 전부(AC-003 (2) 와 같은 검사 `ladder-ok`) · (b) 종료 코드 `1`·표준 오류에 `[fail] ` 한 줄·표지가 G1 앞에서 멈춘다. 변이 두 실행의 출력 파일을 `progress.md` §E.2 에 남긴다. 그리고 (c) 원본에서 `awk '/function observe\(/,/^}/' scripts/e2e-scenario.mts | grep -c 'assert(\|fail('` → `0` — 관측 함수 본문이 판정 함수를 부르지 않는다는 것을 변이 하나의 일반화가 아니라 본문 검사로 잰다(`observe` 는 `e2e-scenario.mts` 안의 최상위 `function observe(` 여야 한다).

### AC-E2ESCEN-012 — 시한 있는 대기와 벽시계 출력

**Given** `scripts/e2e-scenario.mts`·`scripts/e2e-lib.mts`.
**When** 다음을 실행한다.

```bash
grep -nE 'while \(true\)|for \(;;\)' scripts/e2e-scenario.mts | wc -l                     # (1)
grep -cE 'setTimeout\(' scripts/e2e-scenario.mts                                                # (2a) 시나리오 파일에 날것 setTimeout 0
grep -nE '\<await ' scripts/e2e-scenario.mts | grep -vE 'withDeadline\(|nextFrame\(|expectQuiet\(|pollUntil\(|closeWs\(|connect\(|api\(|fetch\(|listMessages\(|waitForBoot\(|stopServer\(|acquirePort\(|checkDependencies\(' | wc -l   # (2b)
grep -cE '^\[elapsed\] [0-9]+ ms$' scenario.txt                                          # (3)
grep -cE '^\[elapsed\] [0-9]+ ms$' boot.txt                                              # (4)
grep -nE 'setInterval\(|spawn\(' scripts/e2e-scenario.mts | grep -vE 'spawnServer\(|spawnChannel\(' | wc -l   # (5)
```

**Then** (1) `0` · (2a) `0`(시나리오 파일은 `setTimeout` 을 직접 부르지 않는다 — 모든 시간 대기는 `e2e-lib.mts` 의 도우미를 지난다) · (2b) `0`(`await` 되는 모든 대기가 시한을 가진 도우미 — 프레임·침묵·폴링·접속·닫기·기동·HTTP — 이거나 `withDeadline(promise, ms, label)` 로 감싸져 있다; `withDeadline` 은 `e2e-lib.mts` 가 export 하며 `FRAME_TIMEOUT_MS` 를 기본값으로 쓴다. `for (;;)` 는 `e2e-lib.mts` 의 `nextFrame` 안에만 있고 그 안은 시한 있는 `take()` 다) · (3) `1` · (4) `1`(실패 종료에서도 찍힌다) · (5) `0`(배경 타이머·서버 밖 프로세스 없음; `--with-channel` 의 채널 프로세스는 `e2e-lib.mts` 의 `spawnChannel()` 이 띄우므로 시나리오 파일에 `spawn(` 이 나타나지 않는다 — 주석 예외가 아니라 위치로 가른다).

### AC-E2ESCEN-013 — G7 `--with-channel` (선택 마일스톤)

**Given** 플래그 없이 실행한 `scenario.txt`.
**When** `grep -c '^\[skip\] G7' scenario.txt` 를 실행한다.
**Then** `1` 이고 종료 코드는 여전히 `0` — 이 절반은 **필수**다.

**Given** (M7 을 했다면) `npm run build -w channel` 뒤 `npx tsx scripts/e2e-scenario.mts --with-channel > channel.txt 2>&1`.
**When** 러너가 R2 에 5,000 바이트 본문 하나를 더한 뒤 채널 프로세스에 MCP `tools/call fetch_history{chat_id:R2}` 를 보내고, 이어서 `since_id: <첫 응답 cursor>` 로 한 번 더 보낸다.
**Then** 첫 응답 JSON 의 어떤 원소 `body` 에 `⟪잘림: ` 이 있고 그 바이트 길이가 4,000 이하; 첫 응답 전체가 16,000 바이트 이하이며 빠진 원소의 id 가 실린 원소의 id 최댓값보다 크고; 둘째 응답에 첫 응답에서 빠진 id 가 나타난다. M7 을 미뤘으면 `progress.md` 에 «M7 미착수 — §G ⑥» 을 적고 이 절반은 비운다.

### AC-E2ESCEN-014 — 보호 경로 무변경

**Given** 구현 커밋들이 `main` 위에 있다.
**When** 다음을 실행한다.

```bash
BASE=$(grep -m1 'run_base_sha' .moai/specs/SPEC-E2ESCEN-001/progress.md | grep -oE '[0-9a-f]{7,40}')   # run 단계 시작 시 구현자가 §E.2 에 적은 HEAD
test -n "$BASE" || echo "run_base_sha 미기록"                             # (0)
git diff --stat $BASE -- server/src web channel/src .github | wc -l     # (1)
git diff --name-only $BASE | sort                                       # (2)
```

**Then** (0) 출력 없음(`run_base_sha` 가 있다) · (1) `0` · (2) 의 모든 줄이 `scripts/e2e-lib.mts` · `scripts/e2e.mts` · `scripts/e2e-scenario.mts` · `package.json` · `server/test/e2e-lib.test.ts` · `ROADMAP.md` · `.moai/specs/SPEC-E2ESCEN-001/*` · `.moai/reports/**` · `.moai/state/verify/e2escen/*` 안이다. 기준은 **`run_base_sha`** — run 단계 첫 행동으로 구현자가 `git rev-parse --short HEAD` 를 `progress.md` §E.2 에 `run_base_sha: <sha>` 로 적는다. `main` 브랜치를 기준으로 잡으면 구현이 `main` 에 직접 착지할 때 항상 비고(감사 D6), plan 시점의 `spec_base_sha` 66267ca 를 기준으로 잡으면 그 사이 다른 세션의 커밋(예: README 만 고친 d98ad7b)이 목록에 들어 구현 전부터 붉다(감사 R2-3). `spec_base_sha` 는 행 번호 인용의 닻으로만 남는다.

### AC-E2ESCEN-015 — 전체 회귀 셋

**Given** 구현이 끝난 나무.
**When** `npm test; echo $?` · `npm run e2e; echo $?` · `npm run e2e:scenario; echo $?` 를 차례로 실행한다(동시에 돌리지 않는다 — 셋 다 서버를 띄운다).
**Then** 세 종료 코드가 전부 `0`. `npm test` 의 요약 줄에 `failed` 가 없고 server 쪽 `Tests` 수가 AC-002 의 `it` 수만큼 늘어 있다(2026-09-08 기준선 210 → 213 이상; 기준선은 `progress.md` 에 실측으로 적는다).

---

## 엣지 케이스 (단계 안에 접혀 있는 것)

| 엣지 | 어느 AC | 어떻게 재나 |
|------|---------|-------------|
| 관측자 SSE 프레임이 `\n\n` 경계에서 쪼개져 온다 | AC-006 | 누적 버퍼 파싱; 파싱 실패는 곧 `data.id` 누락으로 (ㄴ) 이 붉어진다 |
| `since`/`until` 에 같은 초의 글이 여럿 | AC-008 (ㄴ) | 반열림 `[since, until)` 로 단언 — `created_at` 은 초 단위 문자열(`db.ts` 48행 `datetime('now')`) |
| 채우기 500 개와 마지막 사람 글이 한 초 안에 들어가 `[T1, T2)` 가 빈다 | AC-008 Given·(ㄴ) | 채우기 #500 저장 확인 뒤 `pollUntil`(시한 1,100 ms) 로 벽시계 초가 바뀔 때까지 기다린 뒤 사람 글을 보내고, «사람 글 `created_at` > 채우기 #500 `created_at`» 을 먼저 단언한다 — 기대 499 는 상수가 된다(감사 R2-2) |
| 봇 삭제 뒤 옛 소켓이 `close` 를 늦게 받는다 | AC-009 (ㄴ) | `FRAME_TIMEOUT_MS` 시한의 `close` 대기, 걸린 ms 는 관측 항목 |
| 폭 0 이름이 등록 409 로 거절된다(UNIQUE 는 바이트 비교라 아닐 것) | AC-010 | 관측값에 상태 코드를 그대로 싣는다 |
| 재전송 프레임 둘(`to`·`cc`)의 순서 | AC-010 | `mention.duplicate-replay-frames` 값에 `deliveries` 열을 싣는다 — 단언 없음 |

## 품질 게이트

- `npm test -w server` 의 `pretest`(`tsc --noEmit`, `strict: true`) 는 `include: ["src", "test"]` 를 뿌리로 import 를 따라가므로 `server/test/e2e-lib.test.ts` 가 import 하는 `scripts/e2e-lib.mts` 까지 **strict 로 검사한다**. 추출한 도우미는 strict-clean 이어야 한다 — 현행 `scripts/e2e.mts` 는 같은 옵션으로 통과한다(감사관 탐침, `npx tsc --noEmit … --strict ../scripts/e2e.mts` 종료 0).
- 첫째 러너·둘째 러너 모두 `server/src/**` import 0건: `grep -c "server/src" scripts/e2e*.mts` → 각각 `0`(주석의 경로 언급은 제외 — `grep -cE "^import .*server/src"`).

## Definition of Done

- [ ] AC-E2ESCEN-001 ~ 012, 014, 015 전부 초록(명령 출력을 `progress.md` §E.2 에 원문으로).
- [ ] AC-E2ESCEN-013 의 «플래그 없음» 절반 초록; 나머지 절반은 초록이거나 «M7 미착수» 기록.
- [ ] `[elapsed]` 실측값이 `progress.md` 와 `ROADMAP.md` OD-6 행에 적혀 있다.
- [ ] `plan.md` §G 의 OD 제안 ①~⑤(그리고 M7 을 미뤘으면 ⑥)가 `ROADMAP.md` «후속 후보» 표에 있다 — sync 단계.
- [ ] `git diff --stat <run_base_sha> -- server/src web channel/src .github` 가 비어 있다(`run_base_sha` 는 `progress.md` §E.2).
