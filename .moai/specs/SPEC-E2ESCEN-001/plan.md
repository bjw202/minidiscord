# SPEC-E2ESCEN-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 인용한 행 번호는 전부 2026-09-08 의 `main`(HEAD `66267ca`) 에서 직접 읽어 확인한 것이며, 이 문서가 낡으면 행 번호가 아니라 표의 «앵커» 열(grep 으로 다시 찾을 수 있는 문자열)로 되찾는다.
>
> 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §B 가 검토 대상이고, §C 의 마일스톤은 그 결정이 선 뒤의 실행 절차다. 기계적인 것(도우미 추출·무변경 검사)은 뒤에 있다.

---

## §A 맥락 — 손대는 자리와 손대지 않는 자리

| 파일 | 지금 | 무엇을 | 앵커 |
|------|------|--------|------|
| `scripts/e2e.mts` (484행) | 도우미 열 개와 상수 셋을 안에 들고 있다. `checkDependencies`·`acquirePort`·`spawnServer`·`waitForBoot`·`step`·`stopServer`·`main`·**`api`** 는 export, 나머지는 모듈 내부 | 내부 도우미를 `e2e-lib.mts` 에서 import 하도록 바꾼다. 열다섯 단계 본문(`runScenarios`, 268~449행)과 `step`(105~112행, `[n/15]`)·마지막 줄(465행)은 **한 글자도 바꾸지 않는다** | `async function runScenarios(` · `console.log(\`[${n}/15]\`)` |
| `scripts/e2e-lib.mts` (신설) | 없음 | `E2eError`·`EXIT_*`·`FRAME_TIMEOUT_MS`·`QUIET_MS`·`BOOT_TIMEOUT_MS`·`POLL_INTERVAL_MS`·`api`·`connect`·`nextFrame`·`expectQuiet`·`pollUntil`·`closeWs`·`fail`·`assert`·`messageForm`·`listMessages`·`checkDependencies`(WS 적재)·`acquirePort`·`spawnServer`·`waitForBoot`·`stopServer` | — |
| `scripts/e2e-scenario.mts` (신설) | 없음 | 봇 둘·방 둘·관측자 하나의 단계 사다리 | `E2E-SCENARIO PASS` |
| `package.json` | `"e2e": "npx tsx scripts/e2e.mts"` | `"e2e:scenario": "npx tsx scripts/e2e-scenario.mts"` 한 줄 | `"e2e":` |
| `server/test/e2e-lib.test.ts` (신설) | 없음 | 도우미 세 가지의 인프로세스 시험(REQ-014) | `describe('e2e-lib'` |
| `ROADMAP.md` | 186행 OD-6 | sync 단계에서 §G 의 OD 제안을 «후속 후보» 표에 더한다(코드 변경 없음) | `\| OD-6 \|` |
| `server/src/**` · `web/**` · `channel/src/**` · `.github/workflows/ci.yml` | — | **손대지 않는다** (REQ-016) | — |

위임 요약과 코드가 어긋난 자리 다섯은 `research.md` §4 에 있다. 이 계획은 코드를 따른다.

## §B 결정 — 바뀔 가능성이 큰 순서

### B.1 `history_request` 커서 걸음을 «관측 항목» 으로 둔다 (가장 먼저 검토)

위임 요약은 «커서 걸음이 빠짐·겹침 없이 전부를 덮는다» 를 통과 기준으로 적었다. 코드는 그렇지 않다 — `gateway.ts` 273~277행은 `ORDER BY id DESC LIMIT ?` 로 **가장 새로운 N 개를 먼저 자른 뒤** `since_id` 를 거른다. 밀린 글이 N 보다 많으면 첫 응답이 가장 오래된 N 개가 아니라 가장 새로운 N 개이고, 그 뒤 `since_id = 마지막 id` 로 걸으면 더 오래된 글은 영원히 오지 않는다. 채널 플러그인의 `fetch_history` 가 이 프레임을 그대로 쓰므로(`channel/src/index.ts` 78~81행, 기본 `limit` 100), 100개 넘게 밀린 뒤의 따라잡기가 앞부분을 놓치는 경로가 실제로 있다.

| 결정 | 값 | 근거 |
|------|-----|------|
| 통과 기준 | `limit ≥ 밀린 수` 일 때만 빠짐·겹침 0 을 단언 — 러너가 `since_id` 를 골라 밀린 수를 480 으로 만들고 `limit: 500` 으로 걷는다(첫 응답 480·둘째 0) | 코드가 보장하는 것만 단언한다. 밀린 504 를 `limit: 500` 으로 걸으면 올바른 서버에서도 4 개가 빠져 단언이 거짓이 된다(감사 D3) |
| 관측 항목 | `history.cursor-walk` — `since_id: 0`·`limit: 100` 으로 밀린 504 를 걸었을 때 «밀린 수·걸음 수·빠진 id 수» (현행 코드 `gateway.ts` 271~277행에서 빠진 수 > 0 예상) | 고칠지는 별도 카드(§G OD 제안 ①). 이 SPEC 은 서버를 고치지 않는다 |
| 데이터 | 배치를 한 문장으로 고정한다 — «채우기 전 셋(사람 2·system 1) → A 의 멘션 없는 `bot_message` 500 → 벽시계 초 넘김 대기(`pollUntil` ≤ 1,100 ms) → 사람의 멘션 없는 글 1». 기준 집합 = 그 뒤 `limit:500` 응답 = A 499 + 사람 1, 방 전체 504. WebSocket 이라 빠르고, 타깃 행이 안 생겨 되먹임 세기와 무관하다 | 500 잘림(REQ-009 ㄴ)과 REST 200 상한을 같은 데이터로 잰다. 초 넘김 대기가 `since/until` 기대를 상수 499 로 만든다(감사 R2-2). 관측자는 R1 만 구독하므로 SSE 기록이 부풀지 않는다 |

### B.2 정책 객체의 모양

```ts
type Policy = {
  onTo?: (m: MessageFrame) => { body: string; files?: { local_path: string; name: string }[] } | null
  // cc 는 정책이 아니라 하네스가 «아무것도 보내지 않는다» 로 고정한다 — 정책이 cc 에 답하는 길을 아예 두지 않는다
}
type FakeBot = { name: string; id: number; token: string; ws: any; received: any[]; verdicts: any[]; policy: Policy }
```

| 결정 | 값 | 근거 |
|------|-----|------|
| `to` 반응 | 정책 함수가 `null` 을 돌려주면 답하지 않는다. G2 의 핑퐁은 `onTo: m => ({ body: \`@TO(${상대}) …\` })` 하나로 만든다 | 시나리오마다 봇 클라이언트를 따로 짜지 않는다(REQ-003) |
| `cc` 반응 | 하네스 고정 무응답 | «cc 에는 답하지 않는다» 는 채널 지시문의 계약이고, 되먹임 차단(G2)은 이 무응답에 기대어 멈춘다 |
| 기록 | `received` 에 welcome 뒤 모든 프레임, `verdicts` 에 `permission_verdict` 만 따로 | G4 의 «요청 소켓에만» 은 `verdicts.length` 로 잰다 |
| `status` 프레임 | 정책이 아니라 러너가 명시적으로 보낸다(G3 (ㄹ)) | 채널 플러그인의 working/idle 순서를 흉내 내되, 러너가 순서를 알고 있어야 관측자 기록과 대조할 수 있다 |
| 첨부 | `botFilesDir` 안에 파일을 쓰고 `local_path` 로 건넨다(첫째 러너 ⑧ 과 같음) | G3 (ㄷ) 의 `attachments[{id,filename}]` 와 `stored_path` 부재를 잰다 |

### B.3 관측자의 모양

| 결정 | 값 | 근거 |
|------|-----|------|
| 구독 | `fetch(url, { headers: { cookie }, signal })` 의 `body` 를 `TextDecoder` 로 읽어 `\n\n` 단위로 자른다. `EventSource` 는 쿠키를 못 싣고 Node 내장도 아니다 | 프레임 모양 `event: X\ndata: JSON\n\n`(`sse.ts` 49행)과 `: connected`(25행)를 글자 그대로 본다 |
| 기록 | `{ connected: boolean; events: { event: string; data: any }[] }`; `bot_status` 전이는 `events` 에서 걸러 낸다 | 하나의 기록으로 (ㄱ)~(ㄹ) 을 다 잰다 |
| 끊기 | `AbortController.abort()` | 되찾기(ㅁ)는 «끊긴 사이 K 개» 를 러너가 알고 있어야 하므로 끊는 시점을 러너가 쥔다 |
| 완료 판정 | «글 하나가 왔다» 는 `pollUntil` 로 기록 길이를 기다린다 — 고정 sleep 없음 | REQ-013 |

### B.4 관측 항목 계약

| 결정 | 값 | 근거 |
|------|-----|------|
| 출력 | `[observe] <이름>: <JSON 한 줄>` | 기계로 세고(AC-010) 사람이 읽는다 |
| 이름 집합(8) | `permission.no-expiry` · `history.cursor-walk` · `identity.same-token-two-sockets` · `identity.zero-width-name` · `mention.duplicate-live-frames` · `mention.duplicate-replay-frames` · `permission.cross-room-outcome-room` · `bots.delete-while-connected-close-ms` | AC-010 이 여덟을 열거한다. 이름을 더하면 AC 와 §G 를 함께 고친다 |
| 판정 격리 | 관측 항목은 `observe(name, value)` 한 함수만 부르고 `assert` 를 부르지 않는다. AC-011 이 변이로 확인한다 | «관측 항목이 판정에 닿지 않는다» 는 그 함수가 `assert` 를 안 부르는 것으로 보장된다 |
| 낱말 | 출력에 «결함»·«bug» 를 쓰지 않는다 | spec.md §1 성질 1 |
| 같은 토큰 소켓 둘 | 관측값은 `{ sockets_received: 2, second_hello_rejected: false }`. 이는 `gateway.ts` 289~297행이 그 봇의 접속 전부에 보내는 의도된 동작(`gateway.test.ts` 1034~1062행 AC-016)이고, 커서는 접속마다 같은 값을 다시 쓸 뿐이다(101~103행). 관측의 요지는 «운영 전제 ‹봇 하나 = 세션 하나› 를 서버가 강제하지 않는다» 이지 이중 배달이 아니다 | §G OD 제안 ③ «둘째 접속 정책 미정» |

### B.5 G2 의 정확한 수 (되먹임 상한)

`botRunSinceLastHuman`(264~269행)은 «마지막 사람 글 이후의 봇 글 수» 를 **지금 글을 INSERT 한 뒤** 센다(203~204행이 246행보다 앞). 그래서 사람 글 뒤 첫 봇 글은 1, … 여섯째 봇 글은 6 ≥ `BOT_RUN_LIMIT` 라 그 글의 `@TO` 가 `cc` 로 내려간다.

| 단계 | 글 | 세기 | 전달 |
|------|-----|------|------|
| 사람 `@TO(A) 시작` | user | — | A 에 `to` |
| A `@TO(B) 1` | bot ① | 1 | B 에 `to` |
| B `@TO(A) 2` | bot ② | 2 | A 에 `to` |
| A `@TO(B) 3` | bot ③ | 3 | B 에 `to` |
| B `@TO(A) 4` | bot ④ | 4 | A 에 `to` |
| A `@TO(B) 5` | bot ⑤ | 5 | B 에 `to` |
| B `@TO(A) 6` | bot ⑥ | **6** | A 에 **`cc`** + system «… 6개 이어져 …» |
| (A 는 cc 라 무응답) | — | — | 침묵 창 뒤 봇 글 수 6 |
| 러너가 A 로 `@TO(B) 7` 강제 | bot ⑦ | 7 | B 에 `cc` + system 하나 더(system 은 끊지 않음) |
| 사람 `@TO(A) 다시` | user | 0 | A 에 `to`; A 의 답은 B 에 `to`(세기 1) |

한 문장으로: **침묵 창 시점 `to` 5·`cc` 1·system 1·봇 글 6 → ⑦ 뒤 `cc` 2·system 2(봇 글 7)**. `spec.md` §7 과 `acceptance.md` 매트릭스가 같은 문장을 쓴다(감사 D9).

### B.6 `e2e-lib.mts` 의 경계 — `step` 은 뽑지 않는다

`step(n)` 은 `[n/15]` 를 찍고 `stepsPassed` 모듈 상태를 든다. 뽑아서 `makeStepLadder(total)` 로 일반화하면 첫째 러너의 호출부가 바뀐다 — 출력은 같아도 «본문 불변» 이 흐려진다. 그래서 `step` 은 두 러너가 각자 든다(둘째 러너는 `[n/N]` 과 자기 `stepsPassed`). `fail`/`assert` 는 뽑는다 — 표준 오류 한 줄 `[fail] <label>` 의 모양이 두 러너에서 같아야 하기 때문이다. `WS` 지연 적재(`checkDependencies`)도 뽑는다 — `connect` 가 `WS` 를 쓰므로 같은 모듈에 있어야 한다.

둘째 러너만 쓰는 것 둘도 `e2e-lib.mts` 에 둔다(감사 D12). `withDeadline(promise, ms = FRAME_TIMEOUT_MS, label)` — 도우미 밖의 모든 `await` 대기(관측자 스트림 읽기, 소켓 `close` 대기 등)를 감싸는 시한 래퍼라 시나리오 파일에 날것 `setTimeout` 이 남지 않는다(AC-012 (2a)(2b)). `spawnChannel(token, url)` — M7 의 채널 프로세스를 띄우는 자리라 시나리오 파일에 `spawn(` 이 나타나지 않는다(AC-012 (5)). `channel/dist/index.js` 부재 검사도 이 함수 안이다.

## §C 마일스톤 (TDD — 실패하는 테스트가 먼저)

`quality.yaml` 이 `development_mode: tdd` 이므로 M1 이 RED 다. M1 의 실패 출력을 그대로 `progress.md` §E.2 에 남긴다(`manager-develop-prompt-template.md` E8). 시나리오 마일스톤(M3~M6)은 러너 자체가 «실패하는 테스트» 라 각 마일스톤의 첫 실행은 단계 표지가 멈추는 자리를 RED 증거로 남긴다.

### M1 — 도우미 시험을 먼저 쓰고(RED) 추출한다 · 우선순위 High

1. `npm run e2e > .moai/state/verify/e2escen/e2e-before.txt 2>&1; echo $?` — 추출 전 출력을 받아 둔다(종료 코드 0 확인).
2. `server/test/e2e-lib.test.ts` 를 쓴다 — `import … from '../../scripts/e2e-lib.mts'` 라 파일이 없어 RED. `it` 셋: `expectQuiet` 두 갈래(큐에 있으면 실패·`QUIET_MS` 동안 없으면 통과), `nextFrame` 시한 초과 → `E2eError` 이고 `exitCode === 1`, `api` 가 `cookie` 헤더·`content-type: application/json`·multipart 를 가른다(`fetch` 를 `vi.stubGlobal` 로 바꿔 요청을 잡는다).
3. `scripts/e2e-lib.mts` 를 만들고 `e2e.mts` 의 해당 정의를 **옮긴다**(복사 아님). `e2e.mts` 는 import 한 줄로 교체.
4. `npm run e2e > e2e-after.txt 2>&1` → `sed -E 's/127\.0\.0\.1:[0-9]+/127.0.0.1:PORT/g'` 로 둘을 가려 `diff` 0줄.

완료 기준: AC-001 · AC-002 초록. RED 출력 파일 존재.

### M2 — 둘째 러너 골격: 서버·봇 둘·방 둘·관측자·표지·`[elapsed]` · 우선순위 High

1. `package.json` 에 `e2e:scenario`.
2. `e2e-scenario.mts` — `main()` 이 첫째 러너와 같은 골격(포트 → mkdtemp → spawn → health → 단계 → finally 정리)에 `performance.now()` 시작·끝을 재어 `[elapsed] <ms> ms` 를 **finally 에서** 찍는다(실패 경로 포함).
3. 준비 단계: 로그인(관측자용 사람 `e2e-human`), R1·R2, 봇 A·B 등록·두 방 참여, 봇 C 등록만, A·B 접속(`welcome.rooms` 둘), 관측자 R1 구독(`: connected`).
4. `observe()`·`FakeBot`·`Observer`·`Policy` 골격(§B.2·B.3·B.4).

완료 기준: AC-003 의 표지·마지막 줄·종료 코드 9 경로, AC-012 의 `[elapsed]`.

### M3 — G1 봇 간 전달 + G2 되먹임 · 우선순위 High

§B.5 의 표 그대로. G1 (ㄷ) 의 사람 400 은 `api` 응답 상태로, system 글은 `pollUntil` 로 R1 목록에서 찾는다.

완료 기준: AC-004 · AC-005.

### M4 — G3 SSE 관측자 · 우선순위 High

관측자 기록 대 목록 조회 대조(글마다 정확히 1회), `stored_path` 키 부재는 `JSON.stringify(record).includes('stored_path') === false`, `status` 순서, `abort()` 뒤 K=3 저장 → `?after=` 되찾기, `?after=abc`·없는 방 → `[]`.

완료 기준: AC-006.

### M5 — G4 권한 릴레이 · 우선순위 High

request_id 는 `[a-km-z]{5}` 안에서 서로 다르게(`bcdef`·`cdefg`·`defgh`·`efghi`…), 형식 밖은 `abcdl`(l 포함)·`abcd`(4자). 20개 미답은 `fghij`… 순으로 만들고 첫 것으로 `yes`. 결과 글은 `info.roomId`(요청의 방)에 남는다(`permissions.ts` 128행) — 다른 방 `yes` 시나리오에서 R1 목록을 본다.

완료 기준: AC-007.

### M6 — G5 이력·재시작·삭제 + G6 경계 + 관측 요약 · 우선순위 High

1. R2 채우기(§B.1 배치 — 초 넘김 대기와 «사람 글 `created_at` > 채우기 #500» 선행 단언 포함) → REST≡history(채우기 전 셋 구간에서) → 다섯 필터(상수 499·499·10·3·500) → 500 잘림 → 커서 걸음(단언 480 / 관측 limit 100 대 밀린 504).
2. 재시작(첫째 러너 ⑭ 과 같은 `stopServer`→`spawnServer`) → A·B 재접속·관측자 재구독·되찾기 `[]`.
3. B 삭제(붙어 있는 채) → 소켓 `close` 대기·닫힘까지 ms 관측 → «(삭제된 봇)» → 재등록 201 → 옛 토큰 hello 무응답 닫힘(첫째 러너 ⑥ 과 같은 방법).
4. A 오프라인 둘 → 재접속 재전송 ≡ `history_request{since_id}`.
5. G6 셋: 같은 토큰 둘째 소켓(B 재등록본의 토큰) · 폭 0 이름 · `@TO(B) @CC(B)` 실시간 1 / 재전송 2.
6. `[observe-summary] 8 items` → 마지막 줄.

완료 기준: AC-008 · AC-009 · AC-010 · AC-011(변이 실측) · AC-014 · AC-015.

### M7 — G7 `--with-channel` (선택, 미룰 수 있음) · 우선순위 Low

`e2e-lib.mts` 의 `spawnChannel(token, url)` 로 `node channel/dist/index.js` 를 `MINIDISCORD_TOKEN`(B 의 토큰)·`MINIDISCORD_SERVER` 와 함께 띄우고 MCP stdio 로 `tools/call fetch_history` 를 보낸다. R2 의 504개 위에 본문 5,000 바이트짜리 하나를 더해 (ㄱ) `⟪잘림: ` 표시, (ㄴ) 결과 16,000 바이트 초과 시 큰 id 부터 빠짐(`channel/src/index.ts` 104~108행), (ㄷ) `cursor` = 실린 id 최댓값이라 다음 호출에 빠진 것이 다시 옴. 플래그가 없으면 `[skip] G7 — --with-channel 없음` 한 줄.

이 마일스톤은 **미뤄도 SPEC 은 닫힌다** — AC-013 의 «플래그 없음» 절반만으로 통과하고, 나머지 절반은 `progress.md` 에 «M7 미착수» 로 남긴다. 미룬다면 §G OD 제안 ⑥ 으로 올린다.

## §D 검증 명령

```bash
cd server && npx vitest run test/e2e-lib.test.ts         # AC-002
npm run e2e > /tmp/after.txt 2>&1; echo $?                # AC-001 (before.txt 와 diff, 포트 가림)
npm run e2e:scenario; echo $?                             # AC-003~AC-012, AC-015
grep -c '^\[observe\] ' <출력>                            # AC-010 (8)
grep -nE 'while \(true\)|for \(;;\)' scripts/e2e-scenario.mts   # AC-012 (0)
BASE=$(grep -m1 run_base_sha .moai/specs/SPEC-E2ESCEN-001/progress.md | grep -oE '[0-9a-f]{7,40}')
git diff --stat $BASE -- server/src web channel/src .github   # AC-014 (비어 있음; 기준은 run 시작 시 §E.2 에 적는 run_base_sha — main 기준은 Route A 에서 늘 비고, plan 시점 SHA 는 다른 세션 커밋이 끼어 붉다)
npm test                                                   # AC-015
```

## §E 손대지 않는 것

- `server/src/**` 전부 — 특히 `gateway.ts` 의 `deliverTo`(289~297행)·`handleHistory`(272~284행)·`botRunSinceLastHuman`(264~269행), `permissions.ts` 의 대기 맵(48행), `routes-bots.ts` 의 이름 검사(62행).
- `.github/workflows/ci.yml` — 운영자 결정 2026-09-08 — 이 SPEC 은 ci.yml 을 손대지 않는다. 러너가 찍는 `[elapsed]` 실측값을 ROADMAP OD-6 의 입력으로 남기고, CI 포함 여부는 그 값을 보고 별도로 정한다. 기대치는 첫째 러너(15단계, 재시작 1회)보다 길다 — 재시작 1회 + 500개 채우기 + 초 넘김 대기 ≤ 1,100 ms + 침묵 창(600 ms) 십수 회 — 이며 실측 뒤 `progress.md` 에 적는다.
- `scripts/e2e.mts` 의 `runScenarios`·`step`·`main`·마지막 줄.
- `web/**`, `channel/src/**`.

## §F 알려진 위험

| 위험 | 어떻게 드러나나 | 대응 |
|------|----------------|------|
| 추출이 첫째 러너의 출력을 바꾼다 | AC-001 의 diff 가 0줄이 아니다 | `step`·마지막 줄은 뽑지 않는다(§B.6). `fail` 의 `[fail] ` 접두는 옮겨도 같은 문자열 |
| G2 의 세기가 한 칸 어긋난다(5 대 6) | 여섯째가 `to` 로 오거나 다섯째가 `cc` 로 온다 | §B.5 표 — INSERT 가 세기보다 앞이라 «지금 글 포함» 이다. 러너는 ①~⑥ 의 `delivery` 를 순서대로 단언한다 |
| 관측자의 SSE 읽기가 `\n\n` 경계에서 프레임을 쪼갠다 | `data` JSON 파싱 실패 | 누적 버퍼에서 `\n\n` 을 찾을 때까지 이어 붙인다(첫째 러너의 수신 큐와 같은 원리) |
| 500개 채우기가 침묵 창·시한을 넘긴다 | `[elapsed]` 가 커지거나 `pollUntil` 시한 | WebSocket 으로 보내고 «R2 의 채우기 글 500 개 저장» 을 `pollUntil` 로 한 번만 기다린다. 개당 폴링 없음. 그 뒤 초 넘김 대기는 최대 1,100 ms 한 번 |
| 봇 삭제 뒤 옛 토큰 hello 가 «프레임 없이 닫힘» 대신 남는다 | 첫째 러너 ⑥ 방식의 close 대기 시한 | `dropBot` 이 커밋 뒤에 불리므로(`routes-bots.ts` 120~121행) DELETE 응답 뒤엔 토큰이 없다 — hello 는 143행에서 닫힌다 |
| 폭 0 이름이 `@TO(B​)` 에서 정규식 `[^()\s]+` 를 통과해 봇 둘 중 어느 쪽에 닿는지 예측할 수 없다 | 관측값이 실행마다 다르다 | 단언하지 않는다(관측 항목). 값이 무엇이든 찍기만 한다 |
| 관측 항목이 몰래 판정에 닿는다 | AC-011 변이가 실패로 끝난다 | `observe()` 는 `assert` 를 부르지 않는다. 변이 실측을 `progress.md` 에 남긴다 |
| `--with-channel` 이 `channel/dist` 부재로 죽는다 | M7 실행 시 `Cannot find module` | `spawnChannel` 이 `channel/dist/index.js` 존재를 먼저 확인하고 없으면 «먼저 `npm run build -w channel`» 한 줄로 exit 1 (`fresh-worktree-needs-channel-build` 기억) |

## §G 관측 항목이 낳는 ROADMAP OD 제안 (sync 단계에서 «후속 후보» 표에 더한다)

| # | 제안 항목 | 무엇을 정해야 하나 | 근거 자리 |
|---|-----------|--------------------|-----------|
| ① | **이력 조회의 limit 이 since_id 보다 먼저 적용된다 — 밀린 글 > limit 이면 오래된 글 누락** | `since_id` 가 있을 때 «그 이후에서 가장 오래된 N» 으로 바꿀지, 지금처럼 «가장 새로운 N» 으로 둘지. 채널의 따라잡기(`fetch_history`, 기본 `limit` 100)가 100개 넘게 밀리면 앞을 놓치고 그 글은 다음 커서부터 영구히 오지 않는다 | `gateway.ts` 271~277행 · `channel/src/index.ts` 78~81행 · `[observe] history.cursor-walk` 의 `missed_ids` |
| ② | 권한 요청 대기 맵에 만료·상한이 없다 | 이미 `@MX:DEBT`(`permissions.ts` 45~47행)와 보류 카드 t12 가 있다. 이 러너의 «20개 미답 뒤 첫 요청 해소» 관측을 그 카드의 재현 증거로 붙일지 | `[observe] permission.no-expiry` |
| ③ | **둘째 접속 정책 미정** — 같은 토큰으로 둘째 소켓이 붙어도 거절·퇴출되지 않는다 | 두 소켓 모두 받는 것은 의도된 동작(AC-016)이다. 운영 전제 «봇 하나 = 세션 하나» 를 서버가 강제할지(둘째 `hello` 거절 / 첫째 퇴출 / 지금처럼 허용) | `gateway.ts` 138~155행 · `[observe] identity.same-token-two-sockets` |
| ④ | 봇 이름에 길이·형식 문자 검사가 없다 | 사람 이름은 32자·`\p{Cc}\p{Cf}\p{Zl}\p{Zp}` 금지(`auth.ts` 14~18행)인데 봇 이름은 `trim` 뿐이다. 같은 규칙을 둘지 | `routes-bots.ts` 62행 · `[observe] identity.zero-width-name` |
| ⑤ | 겹친 멘션(`@TO(B) @CC(B)`)의 실시간 1 프레임 / 재전송 2 프레임 비대칭 | `deliverTo` 는 `find`(291행), `replayMissed` 는 타깃 행 전부(161~171행). 재전송에서 `to` 가 `cc` 보다 먼저 오는지도 순서가 정해져 있지 않다. 한쪽으로 맞출지 | `[observe] mention.duplicate-live-frames` · `mention.duplicate-replay-frames` |
| ⑥ | (M7 을 미룬 경우) 채널 잘림의 전선 관측 | `channel/test/truncate.test.ts` 가 인프로세스로 덮는다. 전선 관측을 별도 카드로 할지 | REQ-015 |

OD-6(CI 편입)은 이미 표에 있다 — 이 SPEC 은 `[elapsed]` 실측값을 그 행에 덧붙인다.

## §H 상호 참조

- `spec.md` §4 (REQ-E2ESCEN-001~016), §5 범위 밖, §7 AC 매트릭스
- `acceptance.md` — AC-E2ESCEN-001~015 의 Given-When-Then 과 판정 명령
- `research.md` — 지금 있는 것(첫째 러너·인프로세스 시험), 서버 계약의 확인 행, 위임 요약과 어긋난 자리 다섯
- `scripts/e2e.mts` — 골격의 원본; `.moai/specs/SPEC-BOTMODEL-001/spec.md` §3.3·§3.5 — 프레임 계약의 원본
- `ROADMAP.md` 186행 OD-6 — CI 편입 미결
