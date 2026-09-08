---
id: SPEC-E2ESCEN-001
title: "전체 구동 시나리오 러너 — 봇 둘·방 둘·웹 관측자 하나로 전달·되먹임·SSE·권한·이력·경계를 전선에서 점검"
version: "0.3.0"
status: in-progress
created: 2026-09-08
updated: 2026-09-08
author: manager-spec
priority: P2
phase: "v2.1.0 target"
module: "scripts/"
lifecycle: spec-anchored
tags: "e2e, scenario, gateway, sse, history, permission, fake-bot"
tier: M
depends_on: [SPEC-BOTMODEL-001, SPEC-MSG-001, SPEC-SSE-001, SPEC-PERM-001, SPEC-MENTION-001]
---

# SPEC-E2ESCEN-001 — 전체 구동 시나리오 러너

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-09-08 | 최초 작성. 운영자 의도(«순수 미니디스코드 관점의 전체 구동 시나리오 — 봇 답변은 가상으로 밀어 넣고, 대화 DB 와 이력 fetch 가 얼마나 잘 되는지까지 자동으로 점검»)를 GEARS 요구사항 16개·수용 기준 15개로 옮겼다(Tier M 상한 16/16). 인용한 행 번호는 전부 `main` HEAD `66267ca` 에서 직접 읽어 확인했으며, 위임 요약과 코드가 어긋난 자리 다섯은 `research.md` §4 에 적고 코드를 따랐다 — `api` 는 이미 export 돼 있다(`scripts/e2e.mts` 152행), `BOT_RUN_LIMIT` 는 49행, `deliverTo` 는 `find` 라 겹친 멘션도 실시간 프레임은 하나(291행)이고 재전송은 둘, `permissions.test.ts` 의 `it` 은 29개, `history_request` 는 `limit` 을 `since_id` 보다 먼저 적용한다(273~277행). 마지막 것이 이 SPEC 의 관측 항목 하나가 됐다(REQ-009 ㉣). | manager-spec |
| 0.2.0 | 2026-09-08 | **plan 단계 감사 교정 라운드.** 근거: `.moai/reports/e2escen/plan-audit.md` (plan-auditor, FAIL 0.75, 통과선 0.80 — Testability 0.50). 운영자 결정 «CI 포함 안 함» 으로 `plan.md` §E 의 CI 포함 여부(OD-6) 미결 표지를 결정문으로 바꿨다(D2). MUST-FIX — **D1** `related_specs` 의 SPEC-CHANCLIENT-001·SPEC-GATEWAY-001 은 SPEC-BOTMODEL-001 로 대체된 스텁이라 필드를 지우고 §8 에 한 줄로 적었다. **D3** AC-008 (ㄹ) 의 `limit: 500` 걸음 단언이 밀린 수 520 과 모순이었다 — 단언 갈래는 밀린 수가 480 이 되는 `since_id` 에서만 하고, `limit` 보다 많이 밀린 걸음은 관측 항목으로 빠진 수를 찍는다(`gateway.ts` 271~277행). **D4** AC-008 (ㄴ) 다섯 필터에 기대 집합·정확한 개수 단언을 더했다. **D5** AC-009 (ㄴ) 의 «(삭제된 봇)» 검사를 B 가 실제로 쓴 R1 로 옮기고 개수를 박았다(REQ-010 (ㄴ) 도 같이). **D6** AC-014·§7·`plan.md` §D 의 `git diff … main` 을 `spec_base_sha` 66267ca 기준으로 바꾸고 허용 목록에 `.moai/reports/**` 를 더했다. **D7** AC-008 (ㄷ) 멘션 없는 글의 시점(채운 뒤)과 조회 `limit: 500` 을 명시. **D9** G2 수치 요약을 세 문서에서 «침묵 창 시점 to 5·cc 1·system 1·봇 글 6 → ⑦ 뒤 cc 2·system 2» 하나로 맞췄다. 관찰 — **D8** `research.md` 의 «tsc 는 시험 파일만 본다» 를 «`pretest` 가 `scripts/e2e-lib.mts` 까지 strict 검사한다» 로 정정. **D10** README 인용 526→620행. **D11** AC-003 (4) 배경 리스너를 `timeout 25` 로 감쌌다. **D12** AC-012 (2) 는 `withDeadline(` 도우미 이름을, (5) 는 `spawnChannel` 을 `e2e-lib.mts` 에 두고 `grep -v` 로 잰다. **D13** AC-011 에 `observe()` 본문의 `assert(`·`fail(` 0건 검사를 더했다. 요구사항 16개·수용 기준 15개 불변. | manager-spec |
| 0.3.0 | 2026-09-08 | **plan 단계 감사 2회차 교정.** 근거: `.moai/reports/e2escen/plan-audit.md` 2회차 절 (plan-auditor, CONDITIONAL PASS 0.857). **R2-1** AC-008 의 글 배치를 한 문장으로 고정하고(«채우기 전 셋 → A 채우기 500 → 초 넘김 대기 → 마지막 사람 글 1 → 기준 집합 = A 499 + 사람 1») 모든 상수를 거기서 유도했다 — `speaker:'A'` 500 → **499**, `since_id` 10·걸음 480 은 기준 집합을 마지막 사람 글 **뒤** 로 못 박아 유지. **R2-2** `[T1, T2)` 가 한 초 안에 비는 경우를 막기 위해 채우기 뒤 벽시계 초 넘김을 `pollUntil`(≤ 1,100 ms) 로 기다리고, `since` = 채우기 #1·`until` = 마지막 사람 글의 `created_at` 으로 기대를 정확히 499 로 고정, 엣지 표에 추가. **R2-3** AC-014·DoD·§7·`plan.md` §D 의 diff 기준을 plan 시점 SHA 66267ca(다른 세션의 README 커밋 d98ad7b 가 끼어 구현 전부터 붉다)에서 run 단계 시작 시 구현자가 `progress.md` §E.2 에 적는 `run_base_sha` 로 바꿨다; `spec_base_sha` 는 행 번호 인용의 닻으로만 남긴다. **R2-4** AC-012 (2b) 의 `'^\s*await '` 를 `'\<await '` 로(`const x = await …` 도 잡도록). 채우기 수 520 → 500 은 `plan.md`·`research.md` 도 함께 고쳤다. HEAD 는 d98ad7b(README 만 고친 커밋)이나 `server/`·`scripts/` 인용 행은 그대로다(감사관이 `gateway.ts` 동일 확인). 요구사항 16개·수용 기준 15개 불변. | manager-spec |

---

## 1. 배경과 목적

지금 있는 종단 간 러너 `scripts/e2e.mts`(`npm run e2e`)는 **봇 하나·방 둘**로 열다섯 단계를 잰다 — 로그인·방·등록·참여·welcome·모르는 토큰·`@TO` 라우팅·봇 답변과 첨부·바이트 동일 내려받기·멘션 없는 글·방별 이력·권한 릴레이 한 경로(allow)·오프라인 재전송·재시작 영속성·보관. 이 러너가 재지 않는 것이 이 SPEC 의 대상이다.

- **봇이 둘일 때** 서로를 `@TO`/`@CC` 로 부르는 전달, 그리고 봇끼리 무한히 주고받는 되먹임을 서버가 `N=6` 에서 끊는지 — 지금은 인프로세스 시험(`server/test/gateway.test.ts` 1250~1373행 `describe('B: bot-to-bot mentions')`)에만 있고 전선(spawn 한 실제 서버 + 실제 WebSocket)에서는 잰 적이 없다.
- **웹이 보는 것** — `GET /api/rooms/:id/events` 의 SSE 스트림이 사람·봇·시스템 글을 정확히 한 번씩, 올바른 작성자 정보로, `stored_path` 없이 내보내는지와 `bot_status` 전이 순서, 그리고 스트림이 끊긴 뒤 `?after=` 로 놓친 것만 되찾는지.
- **권한 릴레이의 나머지 경로** — 거절, 다른 방에서 온 답, 중복 답, 답하기 전에 끊긴 봇, 형식이 틀린 `request_id`.
- **대화 DB 와 이력 fetch**(운영자가 명시한 것) — REST 목록과 `history_request` 가 같은 것을 돌려주는지, 다섯 필터(`since_id`·`since`·`until`·`speaker`·`limit`)가 각각 맞게 거르는지, 커서로 걸어가면 빠짐·겹침이 없는지, 멘션 없는 글도 이력에는 있는지, 재시작·봇 삭제 뒤에도 읽히는지.
- **경계** — 같은 토큰의 소켓 둘, 폭 0 문자가 든 봇 이름, 같은 봇을 `@TO` 와 `@CC` 로 겹쳐 부른 글.

이 SPEC 이 끝나면 **둘째 러너** `scripts/e2e-scenario.mts`(`npm run e2e:scenario`)가 생긴다. 첫째 러너는 고치지 않되, 둘이 함께 쓰는 도우미를 `scripts/e2e-lib.mts` 로 뽑아 나눠 쓴다. 봇의 답변은 사람이 아니라 **대본(정책 객체)을 따르는 가짜 봇**이 밀어 넣는다 — `delivery: 'to'` 를 받으면 규칙대로 답하고 `cc` 는 답하지 않으며, `permission_verdict` 는 기록만 한다. 웹 화면 대신 **SSE 관측자**(세션 쿠키로 스트림을 구독해 `event:` 이름과 `bot_status` 전이를 순서대로 적는 클라이언트)가 «웹이 본 것» 을 증언한다.

### 이 SPEC 이 지키는 가장 중요한 성질 셋

1. **서버를 고치지 않는다.** 시나리오가 드러내는 의심스러운 동작(권한 요청이 만료되지 않음, 같은 토큰의 둘째 접속이 거절·퇴출되지 않음, 폭 0 문자 이름이 등록됨, 겹친 멘션의 재전송 이중화, `limit` 이 `since_id` 보다 먼저 적용됨)은 **관측 항목**이다 — 러너는 `[observe]` 접두로 관측 결과를 찍고 종료 코드 0 으로 끝난다. 고칠지는 `ROADMAP.md` 의 미결 항목(OD)으로 올려 별도 카드가 정한다(`plan.md` §G). 결함이라고 단언하지 않는다.
2. **첫째 러너의 출력은 한 글자도 안 바뀐다.** 도우미 추출 전후로 `npm run e2e` 의 표준 출력을 받아 두 파일을 대조한다(포트 번호만 가린다). 추출은 동작이 아니라 파일 경계만 바꾼다.
3. **모든 대기에는 시한이 있고, 끝에 걸린 시간을 찍는다.** `FRAME_TIMEOUT_MS`·`QUIET_MS`·`BOOT_TIMEOUT_MS` 를 그대로 쓰고, 배경 부하와 시한 없는 반복을 두지 않는다(`.claude/rules/moai/workflow/kanban-dispatch.md` § Verification load is lane-local). 걸린 시간은 CI 에 넣을지(OD-6) 정하는 입력값이다.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 첫째 러너 | `scripts/e2e.mts`, `npm run e2e`. 봇 하나·방 둘·열다섯 단계. 이 SPEC 은 그 출력을 바꾸지 않는다 |
| 둘째 러너 | `scripts/e2e-scenario.mts`, `npm run e2e:scenario`. 이 SPEC 의 산출물 |
| 공용 도우미 | `scripts/e2e-lib.mts`. 두 러너가 import 하는 HTTP·WebSocket 조작과 상수 |
| 가짜 봇 | 러너 안에서 `/bot` WebSocket 에 `hello{token}` 으로 붙는 클라이언트. 서버 쪽에서는 진짜 봇과 구별되지 않는다 |
| 정책 객체 | 가짜 봇의 대본. `message` 프레임의 `delivery` 별 반응(`to` → 규칙대로 `bot_message`, `cc` → 무응답)과 `permission_verdict` 의 기록을 정한다 |
| 관측자 | `GET /api/rooms/:id/events` 를 세션 쿠키로 구독하는 SSE 클라이언트. 받은 프레임의 `event:` 이름과 `data` 를 순서대로 기록한다 |
| 단계 표지 | `[n/N]` 한 줄. 그 단계의 단언이 전부 성공한 뒤에만 찍히며 건너뜀·역순은 곧 실패다(첫째 러너 105~112행의 규약) |
| 관측 항목 | 결과를 단언하지 않고 `[observe] <이름>: <관측값>` 한 줄로 찍는 단계. 실행을 실패시키지 않는다 |
| 되먹임 상한 | `server/src/gateway.ts` 49행 `BOT_RUN_LIMIT = 6`. 마지막 사람 글 뒤 봇 글이 연속 6개(지금 글 포함)에 이르면 그 글의 `@TO` 를 `cc` 로 내리고 system 글 한 줄을 남긴다(246~249행) |
| 되찾기 | `GET /api/rooms/:id/messages?after=N`. `id > N` 인 글을 오름차순 최대 200개(`routes-messages.ts` 117~133행) |

## 3. 선행 SPEC 과 코드에서 받아 쓰는 것

이 SPEC 은 **`server/`·`web/`·`channel/` 의 소스 파일을 한 줄도 고치지 않는다.** 아래 계약을 그대로 소비하며, 자리는 전부 `main` HEAD `66267ca` 에서 읽어 확인했다. 상세와 어긋난 자리는 `research.md` 에 있다.

| 출처 | 받아 쓰는 것 | 실제 코드에서 확인한 자리 |
|------|-------------|--------------------------|
| `SPEC-BOTMODEL-001` | 접속 `hello{token}` → `welcome{bot_id, bot_name, rooms}`; 수신 네 프레임 `bot_message`·`status`·`history_request`·`permission_request` 의 분기; 문(gate) — 비 JSON 은 닫기, 미인증은 닫기, 정수 아닌 `room_id`·미참여 방·보관된 방의 `bot_message`/`status` 는 조용히 버림 | `server/src/gateway.ts` 62 · 105~135 · 109 · 110~111 · 114 · 117 · 138~155행 |
| `SPEC-BOTMODEL-001` | 나가는 `message{room_id,id,body,author_name,author_type,delivery,files[{name,local_path}]}`; `history_response{room_id,rid,messages[{id,author_name,body,created_at}]}` 는 요청한 접속에만; 재전송은 방별 커서 이후를 id 오름차순으로 | `gateway.ts` 179~186 · 272~284 · 160~173행 |
| `SPEC-BOTMODEL-001` v2 B | 봇 글의 멘션도 전달; 미참여 봇 이름은 system 글 «… 봇은 이 방에 초대되지 않았습니다»; 되먹임 상한 `N=6` 과 문구 «사람 글 없이 봇 글이 6개 이어져 @TO 를 cc 로 내렸습니다»; 세기는 마지막 사람 글 이후의 봇 글 수(system 글은 끊지 않음) | `gateway.ts` 238~254 · 241 · 49 · 247 · 264~269행 |
| `SPEC-MSG-001` | 사람 전송 `POST /api/rooms/:id/messages`(multipart); 미참여 봇 멘션은 400; 같은 봇의 `@TO`·`@CC` 겹침은 행 둘; 목록 `?after=`(없으면 0, 숫자 아니면 빈 배열, 없는 방은 빈 배열); 내려받기 404 삼중 봉인 | `server/src/routes-messages.ts` 29~112 · 76~78 · 94~97 · 117~133 · 136~158행 |
| `SPEC-SSE-001` | `GET /api/rooms/:id/events`; `: connected` 한 번 뒤 `event: X\ndata: JSON\n\n`; `id:`·`retry:` 없음; 이벤트는 `message`(행 + `author_name` + `attachments[{id,filename}]`, `stored_path` 없음)와 `bot_status{bot_id,state}` 둘 | `server/src/routes-events.ts` 11행; `server/src/sse.ts` 19~32 · 49행; 발행 자리 `routes-messages.ts` 107행 · `gateway.ts` 123 · 236 · 260행 · `permissions.ts` 70행 |
| `SPEC-PERM-001` · `SPEC-PERMROUTE-001` | `request_id` 형식 `/^[a-km-z]{5}$/`(어긋나면 등록 없이 ⚠️ 한 줄); 색인 둘(방:id, 봇:id) 이라 같은 봇이 참여한 다른 방의 답도 닫힘; 사람 답 `/^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i` 가로채기 → `200 {ok:true, consumed_by:'permission'}`; 판정은 요청한 접속 하나에만; 색인은 전송 전에 지워 중복 답은 보통 글; 결과 문구 셋; 만료·상한 없음 | `server/src/permissions.ts` 13 · 77~83 · 48~64 · 7 · 111~112 · 119~128 · 45~47행; `routes-messages.ts` 63~65행 |
| `SPEC-MENTION-001` | `@(TO|CC)\(([^()\s]+)\)`, 중복 제거 없음 | `server/src/mention.ts` 3행 |
| 봇 등록·삭제 | `POST /api/bots` 는 공백 아닌 이름·role 검사·UNIQUE 409 뿐(길이·형식 문자 검사 없음); `DELETE /api/bots/:id` 는 트랜잭션으로 작성자 참조를 풀고 참여·타깃·봇을 지운 뒤 소켓을 끊음; 옛 글 작성자는 «(삭제된 봇)» | `server/src/routes-bots.ts` 60~76 · 108~123행; `gateway.ts` 196행 · `routes-messages.ts` 173행 |
| 첫째 러너 | 서버 spawn·기동 대기·정리·단계 사다리·종료 코드 규약(9 = 기동 시한, 1 = 실패)·상수 셋 | `scripts/e2e.mts` 28~35 · 72~124 · 105~112행 |

---

## 4. 요구사항 (GEARS)

### 4.1 기반 — 도우미 추출과 러너 골격

**REQ-E2ESCEN-001** (Ubiquitous — 공용 도우미와 첫째 러너 불변)
`scripts/e2e-lib.mts` 는 첫째 러너가 지금 안에 들고 있는 조작 — HTTP 호출(쿠키·JSON·multipart), `hello`→`welcome` 접속과 수신 큐, 조건부 다음 프레임 대기, 침묵 관측, 조건 폴링, 소켓 닫기, 단언·실패, 메시지 폼, 목록 조회, 종료 운반 오류 — 와 상수(`FRAME_TIMEOUT_MS`·`QUIET_MS`·`BOOT_TIMEOUT_MS`·종료 코드)를 export 해야 하며, 첫째 러너는 그것을 import 해 쓰되 **표준 출력과 종료 코드가 추출 전과 같아야 한다**(포트 번호만 다를 수 있다). 첫째 러너의 열다섯 단계 본문과 표지 문자열 `[n/15]`·마지막 줄 «E2E PASS — 15 단계 전부 통과 (봇 하나 · 방 둘)» 은 바뀌지 않는다.

**REQ-E2ESCEN-002** (Ubiquitous — 둘째 러너)
`scripts/e2e-scenario.mts` 는 루트 `package.json` 의 `e2e:scenario` 스크립트로 실행되고, 첫째 러너와 같은 방식으로 실제 서버 프로세스를 띄워(임시 `DATA_DIR`·`BOT_FILES_DIR`, `/api/health` 기동 대기) **봇 둘(A, B)·방 둘(R1, R2)·웹 관측자 하나**를 세운 뒤 §4.2~§4.7 의 단계를 번호 사다리 `[n/N]` 로 진행해야 한다. 종료 코드는 첫째 러너의 규약을 따른다 — 전부 통과 0, 단언 실패 1, 기동 시한 9. 정리(서버 거두기·임시 디렉터리 삭제)는 세 경로(정상·실패·예외) 전부에서 일어난다.

**REQ-E2ESCEN-003** (Ubiquitous — 가짜 봇의 정책 객체)
가짜 봇 하나는 정책 객체 하나로 움직여야 한다. 정책은 (ㄱ) `message` 프레임의 `delivery` 가 `to` 이면 규칙이 정한 본문(필요하면 첨부)을 `bot_message` 로 그 `room_id` 에 되돌리고, (ㄴ) `cc` 이면 아무것도 보내지 않으며, (ㄷ) `permission_verdict` 는 기록만 하고, (ㄹ) 받은 모든 프레임을 순서대로 기록한다. 같은 하네스가 정책만 바꿔 모든 시나리오 묶음을 덮는다 — 시나리오마다 봇 클라이언트를 따로 짜지 않는다.

**REQ-E2ESCEN-004** (Ubiquitous — SSE 관측자)
관측자는 세션 쿠키로 `GET /api/rooms/:id/events` 를 구독해 (ㄱ) 첫 바이트 `: connected` 의 수신, (ㄴ) 이어지는 프레임의 `event:` 이름과 `data` JSON 을 도착 순서대로, (ㄷ) `bot_status` 의 `{bot_id, state}` 전이를 기록해야 하며, 러너가 원할 때 스트림을 강제로 끊을 수 있어야 한다(되찾기 시나리오용).

### 4.2 G1 — 봇 간 전달

**REQ-E2ESCEN-005** (When 봇 A 가 R1 에 멘션이 든 `bot_message` 를 보낼 때)
러너는 다음을 관측해야 한다. (ㄱ) `@TO(B)` → B 의 소켓에 `delivery:'to'`, `author_type:'bot'`, `author_name` 이 A 의 이름인 `message` 프레임이 하나 오고, B 의 정책이 답한 글이 R1 목록에 `author_type:'bot'` 으로 저장된다. (ㄴ) `@CC(B)` → B 에 `delivery:'cc'` 프레임이 오고, A 는 침묵 창 동안 아무 프레임도 받지 않는다(정책이 답하지 않았다). (ㄷ) 등록만 되고 R1 에 참여하지 않은 봇 C 를 `@TO(C)` → R1 에 system 글 «C 봇은 이 방에 초대되지 않았습니다» 가 남고 어느 봇 소켓에도 프레임이 오지 않는다; 같은 멘션을 사람이 보내면 400 이다. (ㄹ) A 와 B 가 각자 `history_request` 로 받은 R1 이력의 id 열이 같다.

### 4.3 G2 — 되먹임 차단(전선에서)

**REQ-E2ESCEN-006** (When 사람이 R1 에 `@TO(A)` 를 보내고 A·B 의 정책이 서로를 `@TO` 로 되부를 때)
러너는 다음을 관측해야 한다. (ㄱ) 봇 글 다섯(A→B→A→B→A)은 `delivery:'to'` 로 전달되고, **여섯째 봇 글**(B 의 셋째)의 `@TO(A)` 는 A 에 `delivery:'cc'` 로 도착하며 그 순간 R1 에 system 글 «사람 글 없이 봇 글이 6개 이어져 @TO 를 cc 로 내렸습니다» 가 하나 남는다. (ㄴ) `cc` 를 받은 A 의 정책은 답하지 않아 핑퐁이 멈추고, 침묵 창 뒤 R1 의 봇 글 수는 정확히 6 이다. (ㄷ) 그 뒤 A 가 사람 글 없이 `@TO(B)` 를 하나 더 보내면 다시 `cc` 로 내려가고 system 글이 하나 더 남는다 — system 글은 연속을 끊지 않는다. (ㄹ) 사람이 `@TO(A)` 를 한 번 더 보내면 A 의 답은 다시 `delivery:'to'` 로 B 에 닿는다 — 사람 글이 세기를 되돌린다.

### 4.4 G3 — SSE 관측자

**REQ-E2ESCEN-007** (While 관측자가 R1 을 구독하는 동안 · When 사람·봇·시스템 글과 `status` 프레임이 R1 에 흐를 때)
러너는 다음을 관측해야 한다. (ㄱ) 관측자의 기록은 `: connected` 로 시작하고 그 뒤 `event:` 프레임이 온다. (ㄴ) 이 구간에 R1 에 저장된 모든 글(사람·봇·system)이 `message` 이벤트로 **정확히 한 번씩** 나타나며 `author_name`·`author_type` 이 목록 조회와 같다. (ㄷ) 첨부가 있는 봇 글의 `data.attachments` 는 `[{id, filename}]` 이고 어느 `message` 이벤트에도 `stored_path` 키가 없다. (ㄹ) 봇이 보낸 `status{working}`·`status{idle}` 는 `bot_status{bot_id, state}` 로 보낸 순서 그대로 도착한다. (ㅁ) 관측자가 스트림을 끊은 사이 R1 에 K 개의 글이 더 저장되면 `GET /api/rooms/R1/messages?after=<끊기 전 마지막 id>` 는 정확히 그 K 개를 id 오름차순으로 돌려주고 겹침이 없다. (ㅂ) `?after=abc` 와 없는 방 번호는 빈 배열이다.

### 4.5 G4 — 권한 릴레이 전 경로

**REQ-E2ESCEN-008** (When 봇 B 가 `permission_request` 를 보내고 사람이 답할 때)
러너는 다음을 관측해야 한다. (ㄱ) `no <id>` → R1 에 «⛔ 거절 전송됨 (<id>)» 가 남고 B 의 요청 소켓에만 `permission_verdict{behavior:'deny'}` 가 오며 A 는 침묵한다. (ㄴ) B 가 R1 의 `room_id` 로 낸 요청에 사람이 **R2** 에서 `yes <id>` 를 보내면(B 는 두 방 모두 참여) 응답이 `consumed_by:'permission'` 이고 B 에 `allow` 판정이 오며, 결과 글은 요청이 걸린 R1 에 남는다. (ㄷ) 같은 `yes <id>` 를 한 번 더 보내면 응답에 `consumed_by` 가 없고 그 글이 R2 목록에 `author_type:'user'` 로 저장된다. (ㄹ) B 가 요청을 낸 뒤 소켓을 닫고 사람이 `yes <id>` 를 보내면 «⚠️ 요청한 세션이 끊겨 판정을 전달하지 못했습니다 (<id>)» 가 남고 응답은 여전히 `consumed_by:'permission'` 이다. (ㅁ) `request_id` 가 형식 밖(예: `l` 포함·길이 4)이면 «⚠️ 봇이 보낸 승인 요청의 request_id 가 형식에 맞지 않아 …» 가 남고, 그 id 로 `yes` 를 보내도 보통 글로 저장된다. (ㅂ) **관측 항목** — 답하지 않은 요청 20개를 낸 뒤 첫 요청의 id 로 `yes` 를 보내면 판정이 여전히 도착한다(만료·상한이 없음을 관측값으로 찍는다).

### 4.6 G5 — 대화 DB 와 이력

**REQ-E2ESCEN-009** (When R2 에 사람·봇·system 글이 섞여 쌓인 뒤 이력을 조회할 때)
러너는 다음을 관측해야 한다. (ㄱ) `GET /api/rooms/R2/messages` 와 `history_request{limit:500}` 이 같은 id 열(오름차순)과 같은 본문을 돌려준다(REST 는 200개 상한이므로 200 이하일 때 비교한다). (ㄴ) `since_id` 는 그 id 초과만, `since`/`until` 은 `created_at` 의 반열림 구간 `[since, until)` 만, `speaker` 는 그 작성자 이름(봇 이름·사람 이름·«시스템»)만, `limit` 은 **가장 새로운** N 개만 돌려주고, `limit: 9999` 는 500 개로 잘린다. (ㄷ) 멘션 없이 보낸 사람 글은 어느 봇 소켓에도 오지 않았지만 두 봇의 이력에는 있다. (ㄹ) **관측 항목** — `since_id` 를 마지막 id 로 갱신하며 `limit` 을 밀린 글 수보다 작게 걸어가면, 첫 응답이 가장 오래된 N 개가 아니라 가장 새로운 N 개라 그보다 오래된 글이 걸음에서 빠진다(`gateway.ts` 273~277행이 `limit` 을 `since_id` 보다 먼저 적용한다). 러너는 밀린 수·걸음 수·빠진 id 수를 관측값으로 찍는다(현행 코드에서는 빠진 수가 0 보다 크다고 예상된다). 밀린 수가 `limit` 이하인 자리 — 러너가 `since_id` 를 골라 밀린 수를 480 으로 만든 뒤 `limit: 500` 으로 걷는 것 — 에서는 빠짐·겹침이 없음을 **단언한다**.

**REQ-E2ESCEN-010** (When 서버를 같은 데이터 디렉터리로 재시작하거나 봇을 삭제하거나 봇이 자리를 비운 사이 글이 쌓일 때)
러너는 다음을 관측해야 한다. (ㄱ) 재시작 뒤 A·B 가 같은 토큰으로 다시 붙으면 `welcome.rooms` 가 같고 이미 배달된 글은 다시 오지 않으며, 두 봇의 R1·R2 이력과 관측자의 `?after=<마지막 id>` 되찾기(빈 배열)가 재시작 전과 같다. (ㄴ) B 가 붙어 있는 채로 `DELETE /api/bots/<B>` 를 부르면 B 의 소켓이 닫히고, B 가 실제로 글을 남긴 R1 에서(G1·G2 로 1개 이상) 삭제 전 `author_name` 이 B 였던 글 전부가 목록과 A 의 `history_response` 에서 «(삭제된 봇)» 으로 바뀌고 그 수가 삭제 전에 센 수와 같으며, 같은 이름으로 다시 등록하면 201 이고 옛 토큰의 `hello` 는 프레임 없이 닫힌다. (ㄷ) A 가 소켓을 닫은 사이 사람이 `@TO(A)` 를 둘 보내고 A 가 다시 붙으면 그 둘이 재전송 프레임으로 한 번씩 오고, `history_request{since_id:<닫기 전 마지막 id>}` 도 같은 두 id 를 돌려준다 — 이 겹침은 설계된 것이며 러너는 두 id 열이 같음을 단언한다.

### 4.7 G6 — 동시성·신원 경계(관측 항목)

**REQ-E2ESCEN-011** (When 같은 토큰으로 소켓을 둘 붙이거나, 폭 0 문자가 든 이름을 등록하거나, 같은 봇을 `@TO`·`@CC` 로 겹쳐 부를 때)
러너는 다음을 **관측 항목**으로 찍어야 한다(단언하지 않는다). (ㄱ) B 의 토큰으로 소켓 둘을 붙이고 사람이 `@TO(B)` 를 보내면 두 소켓이 각각 프레임을 받는다 — 이는 `gateway.ts` 289~297행이 그 봇의 접속 전부에 보내도록 짜인 의도된 동작이며 `server/test/gateway.test.ts` 1034~1062행(AC-016)이 그렇게 단언한다. 러너가 찍는 관측값은 «받은 소켓 수» 와 «둘째 `hello` 가 거절·퇴출되지 않았다» 이다 — 운영 전제 «봇 하나 = 세션 하나» 를 서버가 강제하지 않는다는 뜻이지 이중 배달 결함이 아니다. 커서(`room_bots.last_delivered_id`)는 접속마다 같은 값을 다시 쓸 뿐이라 두 번 오르지 않는다(101~103행). 한 소켓의 `history_request` 응답은 그 소켓에만 온다(다른 소켓 침묵). (ㄴ) `POST /api/bots` 에 `B` 와 `B​`(폭 0 공백) 를 이름으로 보내면 둘 다 201 인지, 그리고 `@TO(B​)` 가 어느 봇에 닿는지를 찍는다. (ㄷ) 사람이 `@TO(B) @CC(B)` 를 보내면 B 의 살아 있는 소켓에 오는 프레임 수(코드는 하나, `gateway.ts` 291행 `find`)와, B 가 자리를 비운 사이 같은 글을 보내고 다시 붙었을 때의 재전송 프레임 수(코드는 둘, 161~171행이 타깃 행마다 보냄)를 찍는다.

### 4.8 관측 항목 규약·실행 예산·시험·선택 마일스톤·금지

**REQ-E2ESCEN-012** (Ubiquitous — 관측 항목의 출력 규약)
관측 항목은 `[observe] <이름>: <관측값>` 한 줄로 표준 출력에 찍혀야 하며, 관측값이 무엇이든 단계 표지는 그대로 진행하고 종료 코드에 영향을 주지 않는다. 러너의 마지막 줄 앞에 `[observe-summary] N items` 를 찍는다. 관측 항목의 이름 집합은 `acceptance.md` AC-010 이 열거하며, 이름 하나가 빠지면 그 AC 가 붉어진다.

**REQ-E2ESCEN-013** (Ubiquitous — 실행 예산)
둘째 러너의 모든 대기는 시한이 있어야 한다 — 프레임·조건 대기는 `FRAME_TIMEOUT_MS`, 침묵 관측은 `QUIET_MS`, 기동은 `BOOT_TIMEOUT_MS` 를 재사용한다. 시한 없는 `setTimeout` 대기나 `while (true)`·`for (;;)` 반복이 도우미 밖에 있어서는 안 되고, 배경 부하(별도 프로세스·반복 타이머)를 띄우지 않는다. 러너는 끝에 `[elapsed] <ms> ms` 한 줄로 전체 벽시계 시간을 찍는다 — 정상 종료와 실패 종료 모두에서.

**REQ-E2ESCEN-014** (Ubiquitous — 공용 도우미의 인프로세스 시험)
`server/test/e2e-lib.test.ts` 는 실제 서버 없이 `scripts/e2e-lib.mts` 를 import 해 (ㄱ) 침묵 관측이 `QUIET_MS` 안에 온 프레임을 실패로, 오지 않으면 통과로 판정하고, (ㄴ) 조건부 프레임 대기가 시한을 넘기면 종료 운반 오류(코드 1)를 던지며, (ㄷ) HTTP 도우미가 `cookie` 를 요청 헤더에 싣고 JSON 과 multipart 를 갈라 보내는 것을 검증해야 한다. 이 시험은 `npm test -w server` 에 들어간다.

**REQ-E2ESCEN-015** (Where `--with-channel` 플래그가 주어지면 — 선택 마일스톤)
둘째 러너는 봇 B 자리에 실제 채널 플러그인 프로세스(`node channel/dist/index.js`, `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 환경변수)를 띄우고 MCP stdio 로 `fetch_history` 를 불러 (ㄱ) 원소 하나의 `body` 가 4,000 바이트를 넘으면 `⟪잘림: N바이트 생략⟫` 표시로 잘리고, (ㄴ) 결과 JSON 전체가 16,000 바이트를 넘으면 **id 가 큰 것부터** 버려지며, (ㄷ) `cursor` 가 실제로 실린 원소들의 id 최댓값이라 다음 호출에 버려진 것이 다시 오는 것을 관측해야 한다. 플래그가 없으면 이 묶음은 «skipped» 한 줄로 건너뛰고 종료 코드에 영향이 없다. 이 요구는 `plan.md` M7 로 미뤄질 수 있다.

**REQ-E2ESCEN-016** (Ubiquitous — shall not)
이 SPEC 의 구현은 `server/`·`web/`·`channel/` 아래 소스 파일과 `.github/workflows/ci.yml` 을 고쳐서는 **안 된다.** 손대는 파일은 `scripts/e2e-lib.mts`(신설)·`scripts/e2e.mts`(import 로 교체)·`scripts/e2e-scenario.mts`(신설)·`package.json`(스크립트 한 줄)·`server/test/e2e-lib.test.ts`(신설)·`ROADMAP.md`(관측 항목의 OD 제안, sync 단계) 뿐이다. 이 SPEC 디렉터리·감사 보고서(`.moai/reports/**`)·검증 증거(`.moai/state/verify/**`) 는 산출물이지 구현 변경이 아니다. 시나리오가 드러낸 동작을 고치는 것은 별도 카드다.

---

## 5. 범위 밖 (Exclusions)

이 SPEC 이 **하지 않는 것**이다. 아래 항목이 구현에 섞여 들면 범위 위반이다.

### Out of Scope — 서버 동작 변경

- 권한 요청 대기 맵의 만료·상한(`permissions.ts` 45~47행 `@MX:DEBT`), 같은 토큰의 둘째 접속 정책(거절·퇴출 규칙 없음 — `gateway.ts` 138~155행 `handleHello` 는 기존 접속을 보지 않는다), 봇 이름의 길이·형식 문자 검사(`routes-bots.ts` 60~76행), 겹친 멘션의 재전송 이중화, `history_request` 의 `limit`/`since_id` 적용 순서 — 전부 관측만 하고 고치지 않는다. 각각은 `plan.md` §G 의 OD 제안으로 간다.
- 새 프레임·새 이벤트·새 라우트를 더하지 않는다. 오류 프레임을 만들지 않는다.

### Out of Scope — CI 편입과 첫째 러너 개편

- `.github/workflows/ci.yml` 에 `npm run e2e` 나 `npm run e2e:scenario` 를 넣지 않는다. 운영자 결정(2026-09-08)으로 이 SPEC 은 포함하지 않는다. 포함 여부는 `ROADMAP.md` 186행 OD-6 에 남아 있으며, 이 SPEC 은 걸린 시간(REQ-013 의 `[elapsed]`)을 그 결정의 입력값으로 남긴다.
- 첫째 러너의 열다섯 단계를 고치거나 둘째 러너로 합치지 않는다. 겹치는 관측(예: 오프라인 재전송·재시작)은 둘째 러너가 봇 둘·관측자로 **확장**할 뿐 첫째 것을 지우지 않는다.

### Out of Scope — 웹 UI 와 채널 플러그인

- 브라우저·jsdom 으로 `web/` 을 구동하지 않는다. «웹이 본 것» 은 SSE 관측자가 대신한다.
- `channel/` 소스를 고치지 않는다. `--with-channel`(REQ-015) 은 빌드된 `channel/dist/index.js` 를 그대로 띄울 뿐이다. 잘림 상한 4,000/16,000 은 플러그인 쪽 상수(`channel/src/truncate.ts` 9·12행)이지 서버가 아니다.

### Out of Scope — 부하·성능·플래키 재현

- 동시 접속 수십 개, 대용량 첨부(웹 100 MB 상한), 장기 구동 메모리 증가는 재지 않는다. 배경 부하를 띄우지 않는다.
- `t36`·`t39` 가 다룬 404/플래키 재현은 이 러너의 목적이 아니다.

## 6. 제약

| 제약 | 내용 |
|------|------|
| 개발 방식 | TDD (`quality.yaml` `development_mode: tdd`). M1 에서 `server/test/e2e-lib.test.ts` 를 먼저 써 RED 를 남기고(`progress.md` §E.2), 도우미를 추출한다 |
| 첫째 러너 불변 | 추출 전 `npm run e2e > before.txt`, 추출 후 `> after.txt` 를 받아 포트 번호를 가린 뒤 `diff` 가 비어야 한다(AC-001). 두 번 다 종료 코드 0 |
| 전선만 | 두 러너 모두 `server/src/**` 를 import 하지 않는다 — HTTP 와 WebSocket 으로만 말한다(첫째 러너 3~4행의 규약) |
| 시한 | 모든 대기는 `FRAME_TIMEOUT_MS`(10,000)·`QUIET_MS`(600)·`BOOT_TIMEOUT_MS`(30,000) 안. 새 상수를 만들려면 `e2e-lib.mts` 한 곳에 둔다 |
| 관측 항목 | 결과가 어떻든 종료 코드 0. «결함» 이라는 낱말을 출력에 쓰지 않는다 — 관측값만 |
| 파일 경계 | REQ-016 의 여섯 파일 뿐. `git status --short` 로 확인 |
| 회귀 | `npm test`(server 210 + channel 103, 2026-09-08 기준)·`npm run e2e`·`npm run e2e:scenario` 셋이 모두 종료 코드 0 |

## 7. 수용 기준

전문은 `acceptance.md` 에 있다(Given-When-Then 과 판정 명령). 판정은 셋 — `npm run e2e:scenario` 의 표준 출력·종료 코드, `cd server && npx vitest run test/e2e-lib.test.ts`, 그리고 몇 개의 bash 검사 — 로 기계적으로 한다.

| ID | 요구사항 | 관측할 결과 |
|----|----------|-------------|
| AC-E2ESCEN-001 | REQ-001, REQ-016 | 추출 전후 `npm run e2e` 표준 출력 diff 0줄(포트 가림), 종료 코드 둘 다 0; `e2e.mts` 에 `import … from './e2e-lib.mts'` 가 있고 지역 정의 `function api\|connect\|nextFrame\|expectQuiet` 0건 |
| AC-E2ESCEN-002 | REQ-014, REQ-001 | `vitest run test/e2e-lib.test.ts` 통과 — `expectQuiet` 두 갈래, `nextFrame` 시한 → `E2eError(1)`, `api` 쿠키·JSON·multipart |
| AC-E2ESCEN-003 | REQ-002, REQ-003, REQ-004 | `npm run e2e:scenario` 종료 코드 0; 표지 `[1/N]`…`[N/N]` 가 빠짐·역순 없이 N 줄; 마지막 줄 «E2E-SCENARIO PASS — N 단계 전부 통과 (봇 둘 · 방 둘 · 관측자 하나)»; 기동 시한 강제(`E2E_FORCE_PORT` 로 점유된 포트) 시 `[boot-timeout]` 한 줄·종료 코드 9 |
| AC-E2ESCEN-004 | REQ-005 | G1 네 관측 (ㄱ)~(ㄹ) 의 단계 표지가 찍힘 |
| AC-E2ESCEN-005 | REQ-006 | G2 — 침묵 창 시점 `to` 5·`cc` 1·system 1·봇 글 6 → ⑦ 뒤 `cc` 2·system 2, 사람 글 뒤 `to` 복귀 |
| AC-E2ESCEN-006 | REQ-007 | G3 — `: connected` 선행, `message` 정확히 1회/글, `stored_path` 0건, `bot_status` 순서, 되찾기 K 개 정확·겹침 0, `after=abc`→[] |
| AC-E2ESCEN-007 | REQ-008 | G4 — deny 문구·요청 소켓만, 다른 방 `yes` 해소, 중복 `yes` 보통 글, 끊긴 세션 문구, 형식 밖 id 거절, 20개 미답 뒤 첫 요청 해소 관측 |
| AC-E2ESCEN-008 | REQ-009 | G5-a — 배치 «채우기 전 셋 → A 500 → 초 넘김 → 사람 1», REST≡history, 다섯 필터(기대 id 집합·정확한 개수 — `speaker:'A'` 499·`since/until` 499·`since_id` 10), 500 잘림, 마지막 사람 글이 `limit: 500` 이력에 포함, 밀린 480·`limit` 500 걸음 빠짐 0 단언, 밀린 504·`limit` 100 걸음은 빠진 수 관측 |
| AC-E2ESCEN-009 | REQ-010 | G5-b — 재시작 뒤 동일성, 봇 삭제 뒤 R1 의 B 글(≥ 1, 삭제 전 센 수와 같음)이 «(삭제된 봇)»·재등록·옛 토큰 거절, 재전송 id 열 ≡ 이력 id 열 |
| AC-E2ESCEN-010 | REQ-011, REQ-012 | `[observe]` 줄이 이름 집합 8개를 전부 가지고, `[observe-summary] 8 items` |
| AC-E2ESCEN-011 | REQ-012 | 관측 항목 하나의 관측값을 뒤집어도(변이) 종료 코드 0·표지 전부, 시나리오 단언 하나를 뒤집으면 1; `observe()` 본문에 `assert(`·`fail(` 0건 |
| AC-E2ESCEN-012 | REQ-013 | `e2e-scenario.mts` 에 시한 없는 `setTimeout`·`while (true)`·`for (;;)` 0건; 정상·실패 종료 둘 다 `[elapsed] <정수> ms` 한 줄 |
| AC-E2ESCEN-013 | REQ-015 | 플래그 없이 «[skip] G7 …» 한 줄·종료 코드 0; `--with-channel` 로 잘림 표시·큰 id 먼저 버림·cursor 재수신 세 관측(M7, 미룰 수 있음) |
| AC-E2ESCEN-014 | REQ-016 | `git diff --stat <run_base_sha> -- server/src web channel/src .github` 가 비어 있고 변경 파일이 여섯 + 산출물 경로 안(`run_base_sha` 는 run 시작 시 `progress.md` §E.2 에 기록) |
| AC-E2ESCEN-015 | REQ-002, REQ-016 | `npm test`·`npm run e2e`·`npm run e2e:scenario` 종료 코드 0 셋 다 |

## 8. 참조

- 첫째 러너: `scripts/e2e.mts` (484행, `main` HEAD `66267ca`)
- 게이트웨이 계약: `server/src/gateway.ts`, `.moai/specs/SPEC-BOTMODEL-001/spec.md` §3.3·§3.5
- 메시지·SSE·권한: `server/src/routes-messages.ts` · `server/src/sse.ts` · `server/src/permissions.ts`
- 인프로세스 시험(겹치지 않게 참조): `server/test/gateway.test.ts` 1250~1373행 · `permissions.test.ts` · `sse.test.ts` · `restart-persistence.test.ts`
- 채널 잘림: `channel/src/truncate.ts` 9·12행, `channel/src/index.ts` 78~112행, `README.md` 620행(«원소 하나의 본문은 4,000바이트»)
- 대체된 선행 SPEC: `SPEC-CHANCLIENT-001`·`SPEC-GATEWAY-001` 은 `SPEC-BOTMODEL-001` §3.3~§3.5 로 대체된 스텁(본문은 `_archive/`)이라 이 SPEC 은 참조하지 않는다 — 프레임·접속 계약은 전부 BOTMODEL-001 에서 받는다
- 미결: `ROADMAP.md` 186행 OD-6
- 실행 부하 규약: `.claude/rules/moai/workflow/kanban-dispatch.md` § Verification load is lane-local
