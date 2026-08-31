# 카드 t4 재판정 — run 단계 보고서 (run-done-2)

| 항목 | 값 |
|------|-----|
| 카드 | `t4` (채널 SPEC 4종 재판정) |
| 재판정 HEAD | `0a75327ae77712505887011b5c0ae5eff8dfd052` (브랜치 `WT-channel-plugin`) |
| 재판정 일시 | 2026-08-29 |
| 대상 SPEC | `SPEC-CHANWIRE-001` · `SPEC-CHANNEL-001` · `SPEC-CHANCLIENT-001` · `SPEC-CHANPERM-001` |
| 증거 디렉터리 | `.moai/state/verify/t4-retrial-run/` |
| 선행 보고서 | `.moai/reports/t4/run-done.md` (원래 run), `.moai/reports/t4/sync-audit.md` (FAIL 62.1, 2026-08-27) — 보존, 본 보고서는 수정하지 않음 |

## 1. Claim (주장)

1. **네 SPEC 의 수용 기준은 병합 트리(HEAD `0a75327`)에서 계속 성립한다** — 인프로세스·셸 프로브·종단간 프로브로 관측한 전건이 통과했다. 구체 개수: CHANWIRE 15개 중 **13 PASS**(001-008·010·011·014·015 + 변이 재실행으로 재확인한 009), CHANNEL 16개 중 **15 PASS**(001-014 — 004·005 는 관측면 둘 모두), CHANCLIENT 16개 중 **15 PASS**(001-014·015의 관측 5 중 3), CHANPERM 12개 중 **11 PASS**(001-010 + 종단간 프로브). 계열별 세부는 §2·§5.
2. **문자 그대로는 더 이상 성립하지 않는 기준이 한 부류 있다 — 범위 경계 4건** (AC-CHANWIRE-012·AC-CHANNEL-015·AC-CHANCLIENT-015·AC-CHANPERM-011). 이 기준들은 `spec_base_sha` 와의 diff 로 «이 SPEC 이 남의 파일을 고치지 않았다»를 재는데, 재판정 트리는 후행 카드 다섯 개의 **의도적 병합**을 흡수한 트리라 그 측정이 구조적으로 성립하지 않는다. 본문 개정 권한이 이 카드에 없으므로 **판정 유보·기록만** 남긴다 (§4 표류 1류).
3. **RED→GREEN 전이 기준 4건** (AC-CHANWIRE-013·AC-CHANNEL-016·AC-CHANCLIENT-016·AC-CHANPERM-012)은 재판정에서 재관측 불가다 — 구현 부재 시점의 원문이어야 성립하는 기준이고 병합 트리에는 구현이 이미 있다. 원래 run 의 §E.2 원문이 증거로 남는다 (Gaps).
4. **F-01 의 나머지 절반은 닫히지 않았다.** 위조 `welcome` 프레임으로 게이트를 연 상대가 소켓에서 읽은 진짜 `request_id` 로 위조한 판정을 밀어 넣어 선착 승리하는 경로 — «first-arriver-wins» 판정 경주 — 는 여전히 열려 있고 **카드 `t15` 소유다.** 이 재판정의 판정 대상은 병합 트리에서의 네 SPEC 수용 기준이지, F-01 종결이 아니다.
5. **병합으로 인한 회귀는 관측되지 않았다.** server 15 파일 180/180 + channel 5 파일 70/70 + typecheck 둘 다 종료 `0` + 채널 빌드 종료 `0` — 전부 이 트리·이 HEAD 에서 직접 실행해 관측한 값이다. 종단간 프로브로 t7·t9·t10·t11 의 변경이 채널 릴레이와 맞물리는 자리를 실제로 돌려 보았고, 어긋난 곳은 없었다.

## 2. Evidence (증거 — 실행한 명령과 원문 출력)

### 2.1 빌드와 전체 스위트 (재판정 기준선)

```
$ npm run build -w channel
BUILD_EXIT=0                      # channel/dist/{index,channel-server,gateway-client}.js 재생성

$ npm test                        # 루트 — 두 워크스페이스
 Test Files  15 passed (15)       # server
      Tests  180 passed (180)
 Test Files  5 passed (5)         # channel
      Tests  70 passed (70)
TEST_ALL_EXIT=0                   # 저장: .moai/state/verify/t4-retrial-run/final-test-all.txt

$ npm run typecheck -w server     → TS_SERVER_EXIT=0
$ npm run typecheck -w channel    → TS_CHANNEL_EXIT=0
```

### 2.2 SPEC-CHANNEL-001 — 셸 프로브 (관측면 (a), 병합 트리 재실행)

```
$ printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize",…}' | node channel/dist/index.js 2>/dev/null | head -n 1
  > .moai/state/verify/t4-retrial-run/mdc-init.json   # 1540 bytes, probe-exit=0

$ node -e '<capabilities 검사 — acceptance.md 원문>'
OK
ac004-exit=0

$ node -e '<instructions 11 리터럴 + /절대/ 검사 — acceptance.md 원문, v0.3.0 신뢰 경계 2문장 포함>'
OK
ac005-exit=0
```

AC-CHANNEL-001 (패키지 계약): `OK` + `ac001-exit=0`. AC-CHANNEL-002 (무상태): 파일 쓰기 grep `grep-exit=1`, 빈 임시 디렉터리 실행 뒤 `leftover=0`. AC-CHANNEL-004·005 의 (b) 관측면과 003·006~014 는 verbose `✓` 로 관측 (§2.4).

### 2.3 AC-CHANWIRE-009 변이 재실행 (병합 트리, t10 이 고친 index.ts 위에서)

각 변이: 적용 → `npm test -w channel -- --reporter=verbose` → `shasum -a 256 channel/src/index.ts` 대조 복원. 원본 해시 `16c32f9e905f37c3ea520b8b161705e727333784a40e0dcd5e97aab549ee2624`, 복원 후 동일, `git diff -- channel/src/index.ts` 빈 출력, 최종 실행 70/70.

| 변이 | 실패 관측 (verbose `×`, 원문 이름) |
|------|-----------------------------------|
| A — `pushChatMessage` 한 줄 제거 | `gateway message becomes exactly one session notification` · `cc message is delivered but raises no working status` · `a TO message reports working to the gateway` · (형제) `after welcome, the same two frames reach the session exactly once each` — 4 failed \| 66 passed |
| B — `bot_message` 전송 한 줄 제거 | `reply tool sends a bot_message with mapped file paths` · `idle status follows the bot_message, not precedes it` — 2 failed \| 68 passed |
| C — `requestHistory({})` 파라미터 버림 | `fetch_history forwards since_id and limit verbatim` — 1 failed \| 69 passed |
| D — `status working` 한 줄 제거 | `a TO message reports working to the gateway` · `a chat message with no MCP peer raises no unhandled rejection` — 2 failed \| 68 passed |

원문 저장: `mut-A.txt`·`mut-B.txt`·`mut-C.txt`·`mut-D.txt`. 해석 — A의 AC-003 실패는 원래 run 이 문서화한 테스트 본문 유발(AC-003 본문이 알림 도착을 기다림)의 재현이고, 형제 1건(t9의 CHANAUTH 수신 경로 테스트)은 같은 갈래를 재는 합리적 실패다. D의 AC-015 실패는 AC-015 본문이 `working` 프레임을 대기 신호로 쓰기 때문이며 **거부 삼킴(`.catch`) 자체는 살아 있다** — 전제 대기가 깨져 실패했을 뿐이다. «끊긴 갈래는 반드시 무너지고 무관한 갈래는 근거 없이 무너지지 않는다»는 갈래 독립성의 본질은 네 변이 모두에서 성립한다.

### 2.4 인프로세스 스위트 — verbose `✓` 전건 (발췌)

`npm test -w channel -- --reporter=verbose` → 70/70 (`channel-suite-verbose.txt`). 네 SPEC 대응 테스트 이름 전건이 `✓` 로 관측됐다 — AC-CHANWIRE-001~008·010·011·014·015 (v0.4.0 개정본 007·008 포함), AC-CHANNEL-003~014 (v0.3.0 개정본 010·회귀층 004(b)·005(b) 포함), AC-CHANCLIENT-001~014 (v0.4.0 개정 계약 아래), AC-CHANPERM-001~010 (v0.3.0 개정본 008 + v0.4.0 발신 전제 005·006·009 + t9 보강 4건 포함). 원문 목록은 각 SPEC `progress.md` §E.2 재판정 절에 적었다.

### 2.5 종단간 프로브 — 실서버 + 실채널 dist (임시 테스트, 캡처 후 삭제)

```
$ npx vitest run --root server test/zz-retrial-e2e-probe.test.ts
 Test Files  1 passed (1)
      Tests  2 passed (2)
PROBE_EXIT=0                      # 원문: e2e-probe.txt. 프로브 파일은 캡처 뒤 삭제 — git status 잔재 없음
```

실제 Fastify 서버(실제 게이트웨이 + 실제 브로커)에 실제 `channel/dist/index.js` 를 stdio MCP 상대로 붙여 관측한 것:

1. 채널 `permission_request`(id `abcde`) → 브로커 system 메시지 등록, 방에 `yes abcde` 안내 줄.
2. **비멤버의 `no abcde` → HTTP 404** (`requireRoomMember`, `server/src/routes-messages.ts:32`), 판정 알림 0건, 대기 항목 생존 — **t11 멤버십 게이트가 판정 수용 경로에서 유효**.
3. **멤버의 `yes abcde` → 세션 알림 `notifications/claude/channel/permission` `{ request_id: 'abcde', behavior: 'allow' }` 도착** + `✅ 승인 전송됨` 줄 — CHANPERM 표장문의 전송 계통이 병합 트리에서 실제로 한 바퀴 돈다.
4. **t7 문자셋 게이트** — 채널이 중계한 형식 밖 id(`Zz9!x`)는 등록 거부(`server/src/permissions.ts:14,62`) + `⚠️ …형식에 맞지 않아 등록하지 않았습니다` 줄, 같은 id 의 `yes` 답변은 미소비·판정 0건.

### 2.6 프로세스 위생

```
$ pgrep -f 'channel/dist/index.js' ; echo $?
pgrep-exit=1                      # 매칭 없음 — 스위트 실행이 프로세스를 남기지 않았다
```

## 3. Baseline-attribution (baseline 귀속)

| 증거 | 명령 | 귀속 트리 | HEAD |
|------|------|-----------|------|
| 전체 스위트 250/250 | `npm test` (루트) | 이 실행, 이 트리 (`.claude/worktrees/t4`) | `0a75327` |
| 채널 스위트 70/70 verbose | `npm test -w channel -- --reporter=verbose` | 이 실행, 이 트리 | `0a75327` |
| 셸 프로브 OK 3건 | `node channel/dist/index.js` + `node -e` 검사 | 이 실행, 이 트리, 재빌드 직후 dist | `0a75327` |
| 변이 4회 실패 집합 | 변이 적용 + verbose 실행 + 해시 복원 | 이 실행, 이 트리 | `0a75327` (작업 트리 변이, 완전 복원) |
| 종단간 프로브 2/2 | 임시 vitest 테스트 (삭제 후 잔재 없음) | 이 실행, 이 트리 | `0a75327` |
| typecheck 2건 종료 0 | `npm run typecheck -w server` / `-w channel` | 이 실행, 이 트리 | `0a75327` |

**병합 통합 기록 (재판정 이전에 오케스트레이터가 수행 — 본 보고서가 그 수용을 검증):**

| 순서 | 병합 SHA | 카드 | 내용 |
|------|----------|------|------|
| 1 | `d92dc5b` | t5 | 웹 UI (`web/*`, `@fastify/static`, SPEC-WEBSHELL/WEBCHAT/WEBRICH-001) |
| 2 | `bfc08d5` | t7 | 서버 권한 요청 경화 (request_id 문자셋·형식 검사, bot-text 줄 중화, tool_name 문자셋) |
| 3 | `7b56c97` | t9 | 채널 승인 게이트 (welcome 게이트, 발신 request_id 집합 상한 128, 비루프백 wss 강제, SPEC-CHANAUTH-001) |
| 4 | `21676e2` | t10 | 주입 경화 (`<channel>` 봉투 중화, 구조화 이력, 신뢰 경계 지시문, SPEC-CHANINJECT-001) |
| 5 | `0a75327` | t11 | 방 멤버십 인가 (`room_members`, `requireRoomMember`, 404-우선, 판정·봇 초대 게이트, SPEC-ROOMAUTHZ-001) |

**병합 적응 2건 (HEAD `0a75327` 에 포함):**

1. `channel/dist` 재빌드 — 8-27 빌드의 stale dist 가 transport-auth 관측 2건을 거짓 실패시켰다. 재빌드로 소멸 (운영 적응, 소스 무변경).
2. `server/test/web-permission-contract.test.ts:74` — `seedRoomAndBot` 에 alice 의 `room_members` 삽입 한 줄. t11 이 메시지·초대 경로를 멤버 게이트로 바꾼 뒤 t5 하네스(멤버십 이전 작성)의 시드가 한 조각 모자란 것. 하네스 적응이지 동작 변경이 아니다.

## 4. 표류 발견 (contract-drift findings — 본문 미개정, 판단 대상)

| # | 위치 | 문언이 말하는 것 | 병합 트리의 실제 | 성격 |
|---|------|------------------|------------------|------|
| CD-1 | `SPEC-CHANWIRE-001/acceptance.md:443-456` (AC-CHANWIRE-012 관측 2·3), `SPEC-CHANNEL-001/acceptance.md:551-561` (AC-CHANNEL-015 관측 2-4), `SPEC-CHANCLIENT-001/acceptance.md:589-607` (AC-CHANCLIENT-015 관측 3·4), `SPEC-CHANPERM-001/acceptance.md:475-487` (AC-CHANPERM-011 관측 2·3) | «`spec_base_sha` 이후 diff 가 비어 있다 / 정확히 N줄이다» — 이 SPEC 이 남의 파일을 고치지 않았음의 증명 | 병합 5건으로 diff 가 채워졌다 (CHANWIRE 관측 2: 19파일, 관측 3: 9줄; CHANNEL: server+web 22파일, `ws` grep 1줄·gateway-client.ts 존재; CHANCLIENT 관측 3·4; CHANPERM: server 17파일, channel/src 3줄). 본 SPEC 구현의 침범이 아니라 **의도된 병합**이 채운 것 — 기준 문언이 병합 트리에서 그 차이를 분리해 내지 못한다 | 측정 유효성 — 본문 개정 필요 여부는 sync/re-trial 판단 대상 |
| CD-2 | `SPEC-CHANPERM-001/spec.md:115-116` (가정-2·가정-3 «**미해결. 카드 `t7` 소유**»), `:118`, `:201-202` | 서버 대기 맵이 전역 `request_id` 키 하나(가정-2), 등록 원본/조회 소문자 불일치(가정-3) — 둘 다 미해결 | `t7` 이 착지해 **둘 다 수정됐다**: `permissions.ts:49` 의 합성키 `keyOf(roomId, requestId)` 가 등록·조회 양쪽에서 같은 소문자화 키를 쓴다. 인용 줄 번호(`:21,33,46-47`)도 모두 낡았다. 같은 파일 F-14 절에는 t11 개정 블록이 있는데 가정-2·3 에는 상응 정정이 없다 | 거짓 문언 — t7 이 착지한 트리에서 «미해결»은 사실이 아님 |
| CD-3 | `SPEC-CHANPERM-001/spec.md:114` (가정-1 «깨지면» 열) | «형식(길이·문자 집합)은 채널의 관심사가 아니다» — 검증하지 않는 이유와 깨졌을 때의 그림 | 채널이 검증하지 않는 절은 유효(REQ-CHANPERM-002·007 준수, 코드도 그렇다). 그러나 병합된 서버는 등록 단계에서 `[a-km-z]{5}` 를 강제하고(`permissions.ts:14,62`) 형식 밖 id 는 `⚠️` 줄과 함께 등록이 거부돼 세션의 도구 호출이 영구 대기한다 — 종단간 프로브 2.5-4 로 관측. 릴레이 종단간 주장에는 «Claude Code 의 id 가 서버 문자셋 안에 있다»는 사전 조건이 새로 붙었고 «깨지면» 열은 이 경로를 기술하지 않는다 | 문서 공백 — 동작 위반 아님, 기술 보완 대상 |

병합 트리에서 **문언이 실제와 일치하는** 이음매도 확인했다: CHANWIRE v0.4.0 (t10 구조화 JSON), CHANNEL v0.3.0 (지시문 9항목·신뢰 경계 2문장 — §2.2 프로브로 관측), CHANCLIENT v0.4.0/v0.5.0 (세션 확립 전제·F-01 소유 분해), CHANPERM v0.3.0/v0.4.0 (발신 집합 계약·AC-005/006/007/009 개정) — 전부 테스트 통과로 관측됐다.

## 5. Gaps (미검증 — 명시)

1. **RED→GREEN 전이 4건 재관측 불가** — AC-CHANWIRE-013·AC-CHANNEL-016·AC-CHANCLIENT-016·AC-CHANPERM-012. 구현 부재 시점 원문이어야 성립. 원래 run 의 §E.2 원문(2026-08-27 트리)이 유일한 증거로 남는다. 재판정은 이 네 기준을 «통과»로 세지 않는다 — «재판정 대상 외»로 둔다.
2. **범위 경계 4건의 «본문 문언대로 통과» 판정 불가** — CD-1. 관측은 했으나 그 관측이 병합 트리에서 기준의 의도(침범 여부)를 재지 못한다. 본문 개정·기준 대체 여부는 이 카드 권한 밖이다.
3. **F-01 나머지 절반 미검증·미해소** — 위조 `welcome`, 위조 판정의 선착 승리, 소켓에서 읽은 진짜 `request_id` 의 남용. 카드 `t15` 소유. 본 보고서는 그 존재를 다시 확인했을 뿐 아무것도 닫지 않았다.
4. **Claude Code 실제 `request_id` 형식 미확인** — CD-3 의 사전 조건이 실제로 성립하는지는 이 환경에서 관측할 수 없다(네트워크·호스트 결합 없음). 프로브는 형식 안/밖 id 각 하나로 서버 게이트의 동작만 확인했다.
5. **엣지 케이스 표의 «미검증» 행들** — 네 SPEC acceptance.md 가 원래 run 에서 남겨 둔 미검증 행(게이트웨이 끊김 중 reply, `start()` 중복 호출, 서버 커서 중복 재전송 등)은 재판정에서 새로 검증하지 않았다. 소유 SPEC·후속 카드 지정 그대로다.
6. **커버리지 재측정 생략** — 원래 run 이 측정했고 병합 후 소스는 각 소유 카드가 측정했다(70/180 전건 통과). 본 재판정은 커버리지 수치를 새로 내지 않았다.

## 6. Residual-risk (잔여 위험)

- **종속 환경 차이** — 모든 관측은 이 워크트리·이 기계(Node v24, 로컬 소켓)에서다. 부하 걸린 환경에서의 타이밍 민감 기준(CHANCLIENT 백오프·타임아웃은 주입·가짜 타이머로 완화돼 있으나 CHANPERM `tick(50)` 부정 관측은 그렇지 않다)은 다른 환경에서 간헐 실패할 수 있다.
- **종단간 프로브의 단발성** — 프로브는 임시 파일로 한 번 실행하고 지웠다. 같은 흐름의 회귀 기준은 서버 스위트(`permissions.test.ts`)와 채널 스위트(`permission-relay.test.ts`)가 **따로** 지킨다 — 프로세스 경계를 건너는 결합 자체를 지키는 회귀 기준은 이 재판정이 만들지 않았다(원본 plan Task 18 E2E 소관).
- **F-A3~A10·J2 이월** — 운영자 결정(2026-08-28)대로 t10/t11 로 이월된 발견들은 이 카드에서 추적하지 않는다. 본 보고서의 판정은 그 이월이 이미 반영된 트리에서의 네 SPEC 기준 판정이다.
- **문언 표류의 후속 조치 미정** — CD-1~3 을 어떻게 처리할지(개정·기준 대체·수용 기록)는 sync 단계와 리드의 판단 사안으로 남는다. 이 보고서는 사실 기록만 담는다.

## Card Cross-Check

| 마일스톤/산출물 | 카드 | 비고 |
|-----------------|------|------|
| SPEC-CHANWIRE-001 재판정 (AC 13 PASS·1 유보·1 대상 외) | t4 | `progress.md` §E.2 재판정 절 |
| SPEC-CHANNEL-001 재판정 (AC 15 PASS·1 유보·1 대상 외) | t4 | `progress.md` §E.2 재판정 절 |
| SPEC-CHANCLIENT-001 재판정 (AC 15 PASS·1 유보·1 대상 외) | t4 | `progress.md` §E.2 재판정 절 |
| SPEC-CHANPERM-001 재판정 (AC 11 PASS·1 유보·1 대상 외 + 종단간 프로브) | t4 | `progress.md` §E.2 재판정 절 |
| 병합 통합 5건 검증 + 적응 2건 수용 | t4 (병합), t5·t7·t9·t10·t11 (착지) | §3 병합 통합 기록 |
| 표류 발견 CD-1 (범위 경계 측정 유효성) | t4 기록 → sync/re-trial 판단 | §4 |
| 표류 발견 CD-2·CD-3 (CHANPERM 가정 문언) | t4 기록 → t7 관련 정정은 SPEC-PERM-001 쪽 판단 대상 | §4 |
| F-01 나머지 절반 (위조 welcome·선착 판정) | **t15** — 닫지 않음 | §1 주장 4·§5 Gap 3 |
| 원래 run+sync 기록 (run-done.md·sync-done.md·sync-audit.md) | t4 — 보존, 본 보고서에서 수정 없음 | 헤더 표 |
