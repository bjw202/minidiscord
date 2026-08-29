# 카드 t3 (M3) sync 감사 보고서

```yaml
card: t3
milestone: M3
lens: "--security --deep"
auditor: sync-auditor (독립 재실행)
worktree: .claude/worktrees/t3
branch: WT-msg-gateway-relay
head_at_audit: eaebe1e
audited_specs: [SPEC-MENTION-001, SPEC-SSE-001, SPEC-GATEWAY-001, SPEC-MSG-001, SPEC-PERM-001]
verdict: FAIL
verdict_driver: "Security 필수 통과 차원 미달 (45/100, 임계 70)"
authority: 자문 — 최종 판정은 칸반 리드
```

## 한눈에 보기

sync 세션이 보고한 **기계적 수치는 하나도 틀리지 않았습니다.** 테스트 98건 통과, 타입 검사 통과, SPEC별 건수 6·9·18·13·15, 직전 기준선 37 — 전부 제가 다시 돌려서 같은 값을 봤습니다. 수용 기준(AC)의 품질도 이 프로젝트에서 지금까지 본 것 중 가장 좋습니다. 대조군을 갖춘 기준이 대부분이라 "잘못된 구현도 통과시키는 기준" 결함 부류는 이번 다섯 SPEC에서 재생산되지 않았습니다.

문제는 보안 렌즈입니다. sync 세션이 **반증해 보라고 넘긴 네 가지 주장 중 두 가지가 실제로 무너졌고**, 그중 하나는 제가 실행해서 확인한 임의 파일 읽기·유출 경로입니다. 봇 토큰 하나만 있으면 서버 프로세스가 읽을 수 있는 **아무 파일이나** 업로드 디렉터리 안으로 복사해 넣은 뒤, 로그인한 아무나 HTTP로 내려받을 수 있습니다. "첨부 경로 이탈은 이중으로 봉인되어 있다"는 주장은 HTTP 업로드 경로에만 해당하고, 게이트웨이 입구에는 봉인이 **아예 없습니다.**

그래서 판정은 FAIL입니다. 다만 리드가 알아야 할 것: 차단 항목은 3건이고 **각각 몇 줄짜리 수정**입니다. 설계를 되돌려야 하는 종류의 실패가 아니라, 한 입구에 검사가 빠진 종류의 실패입니다.

---

## 차원 점수

| 차원 | 점수 | 임계 | 판정 | 근거 요약 |
|------|------|------|------|-----------|
| Functionality (40%) | 78/100 | 70 | PASS | 98/98 통과·타입 검사 clean·AC 대조표 충실. 다만 F-04·F-05가 권한 릴레이의 실사용 경로를 깨뜨림 |
| **Security (25%)** | **45/100** | **70** | **FAIL (필수 통과)** | F-01 임의 파일 읽기 실증, F-02 경로 노출, F-03 0.0.0.0 바인드 + 개방 가입 |
| Craft (20%) | 76/100 | 60 | PASS | 코드·주석·테스트 대조군 우수. 커버리지 미측정, §E.4 발췌 표기, 증거 파일 미추적 |
| Consistency (15%) | 90/100 | 60 | PASS | 404/409 관례·403 미사용·명명·문서-코드 일치가 다섯 SPEC 전반에 균일 |

**가중 조화평균**: `1 / (0.40/78 + 0.25/45 + 0.20/76 + 0.15/90)` = **66.8**
**비가중 조화평균**: `4 / (1/78 + 1/45 + 1/76 + 1/90)` = **67.4**

필수 통과 방화벽(Functionality + Security)에 따라 **Security 45 < 70 이 다른 점수와 무관하게 전체를 FAIL로 확정**합니다.

---

## 제가 직접 재실행한 것 (Claim / Evidence / Baseline-attribution)

### Claim
sync 세션이 보고한 테스트·타입 검사·SPEC별 건수는 전부 사실이다.

### Evidence

```
$ unset MOAI_KANBAN … && npm test -w server -- --run > /tmp/t3-test.log 2>&1; echo "TEST_EXIT=$?"
TEST_EXIT=0
$ npm run typecheck -w server > /tmp/t3-tc.log 2>&1; echo "TYPECHECK_EXIT=$?"
TYPECHECK_EXIT=0

 Test Files  10 passed (10)
      Tests  98 passed (98)
```

```
$ npx vitest run --reporter=verbose --root server | grep -E "^ *(✓|×)" | grep -oE "test/[a-z-]+\.test\.ts" | sort | uniq -c
  11 test/auth.test.ts
   2 test/config.test.ts
   2 test/db.test.ts
  18 test/gateway.test.ts
   1 test/health.test.ts
   6 test/mention.test.ts
  13 test/messages.test.ts
  15 test/permissions.test.ts
  21 test/rooms-bots.test.ts
   9 test/sse.test.ts
TOTAL:       98
```

### Baseline-attribution
- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `eaebe1e`.
- M3 신규분 = mention 6 + sse 9 + gateway 18 + messages 13 + permissions 15 = **61**.
- 진입 기준선 = auth 11 + config 2 + db 2 + health 1 + rooms-bots 21 = **37**. 37 + 61 = 98 — sync 세션 주장과 정확히 일치.

---

## 차단 findings (blocking)

### F-01 — [Critical] [blocking] 게이트웨이 `bot_message` 가 임의 경로 파일을 첨부로 복사한다 (SPEC-GATEWAY-001)

**위치**: `server/src/gateway.ts:139-148`

봇이 보내는 `bot_message` 의 `files[].local_path` 에 **아무 검증도 없습니다.** `statSync` → `copyFileSync` 로 그 경로를 업로드 디렉터리 안으로 복사하고 첨부 행을 만듭니다. `basename()` 은 **목적지 이름**에만 걸리고 **출처 경로**에는 걸리지 않습니다.

그 결과 SPEC-MSG-001 의 읽기 시점 봉인(`resolve(stored_path).startsWith(uploadsDir + sep)`)이 **통과합니다** — 파일이 실제로 업로드 디렉터리 안에 있으니까요. 봉인이 뚫린 게 아니라, 봉인이 지키지 않는 입구가 따로 열려 있는 것입니다.

**관측한 증거** (감사용 프로브, 임시 디렉터리에서만 동작, 저장소 무변경):

```
attachment row      : {"id":1,"filename":"harmless.txt","stored_path":"…/up/eedfec5f-…-SECRET-outside-uploads.txt"}
stored inside uploads dir? : true
download status     : 200
download body       : "TOP-SECRET-CANARY-9f3a"
EXFILTRATED CANARY  : *** YES — arbitrary file read confirmed ***
```

카나리 파일은 업로드 디렉터리 **밖**에 만들어 두었고, 봇은 그 절대 경로를 `local_path` 로 보냈을 뿐입니다. 내려받은 주체는 봇이 아니라 **평범하게 로그인한 사용자**입니다.

**sync 세션 주장에 대한 판정**: "attachment path traversal is sealed twice" → **반증됨.** 두 봉인은 모두 HTTP 업로드 경로에 있고, 게이트웨이 입구에는 하나도 없습니다.

**닫는 조건**: `copyFileSync` 앞에서 출처 경로를 검사한다 — 허용 디렉터리(예: 봇별 작업 디렉터리)를 `resolve().startsWith()` 로 확인하고, 벗어나면 그 첨부만 건너뛴다(기존 `catch` 의 "없는 파일은 건너뛴다" 동작과 같은 자리). 그리고 이 동작을 고정하는 테스트 1건 — 업로드 디렉터리 밖 파일을 `local_path` 로 보냈을 때 첨부 행이 **생기지 않는지** 관측하고, 같은 테스트에서 정상 파일 1건은 첨부되는지도 함께 본다(대조군).

---

### F-02 — [High] [blocking] `stored_path` 절대 경로가 HTTP 응답으로 새어 나간다 (SPEC-MSG-001)

**위치**: `server/src/routes-messages.ts:96`(전송 응답), `:133`(목록 응답), `server/src/gateway.ts:113·188`(봇 프레임)

목록·전송 응답의 `attachments` 에 서버 파일시스템 **절대 경로**가 그대로 실립니다.

```
[{"id":1,"filename":"harmless.txt","stored_path":"/var/folders/y4/…/T/audit-4YAvD6/up/eedfec5f-…-SECRET-outside-uploads.txt"}]
```

클라이언트가 첨부를 받으려면 `id` 하나면 충분합니다 — `stored_path` 는 브라우저에 쓸모가 없고, 서버 디렉터리 구조·임시 경로·사용자명을 노출합니다. F-01 과 겹치면 공격자가 무엇이 복사되어 들어왔는지 확인하는 수단이 됩니다.

**닫는 조건**: HTTP 응답 두 곳의 SELECT 에서 `stored_path` 를 뺀다(`SELECT id, filename` 으로 축소). 봇 프레임의 `local_path` 는 봇이 로컬 파일을 여는 설계상 표면이므로 **유지**하되, 그 비대칭을 README 에 한 줄로 남긴다.

---

### F-03 — [High] [blocking] `0.0.0.0` 바인드 + 무제한 개방 가입이 문서화된 위협 모델과 어긋난다 (SPEC-CORE-001 경계, M3 가 확대)

**위치**: `server/src/index.ts:67`, `server/src/auth.ts:29`, `README.md:127`

```
67:  await app.listen({ port: config.port, host: '0.0.0.0' })
```

README 127행은 이렇게 씁니다: **"이건 내 PC에서만 도는 서버라는 전제로 만들어졌어요."** 그 전제 위에서 HTTPS·세션 만료·CSRF·사용자별 권한 구분을 뺐다고 명시합니다. 그런데 서버는 `127.0.0.1` 이 아니라 **모든 인터페이스**에 바인드합니다. 그리고 `POST /api/auth/register` 에는 어떤 게이트도 없습니다 — 초대 코드도, 관리자 승인도, 시도 제한도 없습니다.

두 사실을 합치면 **같은 네트워크의 누구나 계정을 만들 수 있고**, 계정을 만든 순간 "로그인한 사용자"가 됩니다. 그런데 이 시스템에서 "로그인한 사용자"는 모든 방을 읽고, 모든 방에 쓰고, 모든 첨부를 내려받고, 모든 봇의 도구 승인 요청을 승인할 수 있습니다. 즉 **신뢰 경계가 사실상 없습니다.**

이것이 F-01 을 Critical 로 만드는 증폭기입니다. 방 멤버십이 없다는 것은 수용된 범위 결정이지만, **그 결정은 "내 PC에서만 돈다"는 전제에 기대고 있고 코드가 그 전제를 지키지 않습니다.**

**닫는 조건**: 둘 중 하나. (a) `host` 를 `127.0.0.1` 로 바꾸고 필요할 때만 환경변수로 넓힌다 — 한 줄이고 문서화된 전제와 코드가 일치하게 된다. (b) `0.0.0.0` 을 유지할 근거가 있다면 README 127행의 전제를 고쳐 쓰고, 가입 게이트를 함께 넣는다. **(a) 를 권합니다** — 전제를 코드로 되돌리는 쪽이 싸고, 나머지 수용된 위험들이 전부 그 전제 위에 서 있습니다.

---

## 비차단 findings (non-blocking)

### F-04 — [Medium] [optional] `request_id` 가 검증되지 않아 사람이 절대 승인할 수 없는 요청이 생긴다 (SPEC-PERM-001)

**위치**: `server/src/permissions.ts:21·34-40`

봇이 보낸 `request_id` 를 그대로 대기 맵의 키로 쓰고, 그대로 안내 문구에 넣습니다. 그런데 사람의 답을 받는 정규식은 `[a-km-z]{5}` 로 좁혀져 있습니다. 둘이 맞물리지 않습니다.

```
system message tells the user to type: "승인하려면 \"yes NOT-A-VALID-ID-9999\", 거절하려면 \"no NOT-A-VALID-ID-9999\" 라고 답해주세요."
but PERMISSION_REPLY_RE would ever match that id?: false
```

방에는 "이렇게 답하세요"라는 안내가 뜨는데, 그렇게 답하면 **평범한 대화 메시지로 저장될 뿐** 승인되지 않습니다. 대기 항목도 영영 해제되지 않아 `open` 맵에 남습니다(상한 없음).

**닫는 조건**: `onGatewayRequest` 진입에서 `request_id` 가 `/^[a-km-z]{5}$/` 인지 검사하고, 아니면 등록도 안내도 하지 않는다. 대기 맵에 상한(예: 방당 N건)을 둔다.

### F-05 — [Medium] [optional] `request_id` 네임스페이스가 방 단위가 아니라 전역이라 다른 방 봇이 승인을 굶길 수 있다 (SPEC-PERM-001)

**위치**: `server/src/permissions.ts:21·47-49`

`open` 은 `Map<request_id, ConnInfo>` 로 **방 구분 없이 전역**입니다. 다른 방의 봇이 같은 `request_id` 를 나중에 등록하면 앞의 항목을 덮어씁니다. 이후 원래 방의 사람이 승인해도 `info.roomId !== roomId` 에 걸려 소비되지 않습니다.

대조군을 포함한 관측:

```
control: with ONLY bot A pending, does room1 approval reach bot A?
  tryHandleUserReply(room1,"yes abcde") -> true
  bot A verdicts received: 1

squat: bot A (room1) opens "fghij", then bot B (room2) opens the SAME id
  room1 user approves: tryHandleUserReply(room1,"yes fghij") -> false
  bot A (room1, original requester) verdicts: 0
  bot B (room2, squatter)           verdicts: 0
```

**sync 세션 주장에 대한 판정**: "verdicts cannot cross rooms" → **사실입니다.** 판정이 방을 넘지는 않습니다. 하지만 그 방 검사가 유출은 막는 대신 **거부 수단**이 되었습니다. ID 공간이 `24^5`(약 790만)이라 악의적 봇이 조직적으로 점거할 수도 있습니다. 탈취가 아니라 무력화이므로 Medium.

**닫는 조건**: 키를 `${roomId}:${request_id}` 로 바꾸거나, `request_id` 를 봇이 아니라 **서버가 발급**한다(후자를 권합니다 — F-04 도 같이 닫힙니다).

### F-06 — [Medium] [optional] 봇이 `system` 작성자로 임의 문구를 방에 띄울 수 있다 (SPEC-PERM-001)

**위치**: `server/src/permissions.ts:34-40`

`tool_name` / `description` / `input_preview` 가 이스케이프 없이 system 메시지 본문에 이어 붙습니다. 개행을 넣으면 다른 시스템 메시지를 흉내 낼 수 있습니다.

```
author_type stored as: system
body: "🔒 봇이 도구 사용 승인을 요청합니다: \n\n✅ 승인 전송됨 (abcde)\n관리자 공지: 아래 링크에서 비밀번호를 재설정하세요\n\n\n승인하려면 …"
```

`system` 은 사용자가 신뢰하는 표식입니다. 승인 UI(카드 t5)가 이 본문을 파싱하게 되면 영향이 커집니다.

**닫는 조건**: 세 필드의 개행을 제거하고 길이를 자른다. 또는 본문 문자열 대신 구조화된 필드로 옮긴다(단, REQ-PERM-013 의 "새 이벤트 타입을 만들지 않는다"와 충돌하므로 리드 판단 필요).

### F-07 — [Medium] [optional] 인증 없는 WebSocket 이 조용히 있으면 영원히 열려 있다 (SPEC-GATEWAY-001)

**위치**: `server/src/gateway.ts:41-48`

`hello` 를 보내지 않고 가만히 있는 소켓을 닫는 코드가 없습니다. 타임아웃도, ping/pong 도, 접속 수 상한도 없습니다.

```
socket state after 1.2s of silence (1 = OPEN): 1
```

F-03 과 겹치면 인증 없는 원격이 소켓을 무제한 쌓을 수 있습니다. README 32행이 "ping/pong 미구현"을 수용된 위험으로 적었지만, 그 항목은 **끊긴 접속 감지**에 관한 것이고 **미인증 유휴 접속 제한**은 어디에도 적혀 있지 않습니다.

**닫는 조건**: 접속 후 N초 안에 `hello` 가 없으면 닫는 타이머 하나.

### F-08 — [Low] [optional] 업로드에 파일 개수·총량 상한이 없고 거부된 전송의 파일이 남는다 (SPEC-MSG-001)

**위치**: `server/src/routes-messages.ts:46·83-85`

`limits` 에 `fileSize` 만 있고 `files` 개수 상한이 없습니다. 그리고 미초대 봇 멘션으로 400 이 나면 이미 저장된 파일은 디스크에 남습니다 — `plan.md §D 6` 이 수용한 위험이지만, **원격에서 반복 호출 가능한 디스크 소진 경로**라는 성격은 그 수용 문구에 드러나 있지 않습니다.

**닫는 조건**: `limits.files` 를 넣고, 400 반환 전에 `savedFiles` 를 unlink 한다.

### F-09 — [Low] [optional] §E.4 의 Evidence 블록이 필터링된 발췌인데 원문처럼 보인다 (다섯 SPEC 전부)

`$ npm test -w server -- --run --reporter=verbose` 라는 프롬프트 아래에 그 SPEC 의 `✓` 줄만 있고 나머지 92줄이 없습니다. 실제 그 명령은 98줄을 전부 출력합니다 — 제가 원문 파일에서 확인했습니다:

```
$ grep -c '✓' .moai/state/verify/9d51afd1/test-verbose.txt
98
```

수치는 전부 사실이고 원문 파일 경로도 함께 적어 두었으므로 **속임수는 아닙니다.** 다만 VCI §3.2 는 Evidence 를 "요약이 아닌 축자 출력"으로 규정하고, 발췌를 발췌라고 밝히지 않으면 읽는 사람이 구분할 수 없습니다.

**닫는 조건**: 발췌 블록에 `(해당 SPEC 줄만 발췌 — 원문 98줄은 아래 경로)` 한 줄을 붙인다.

### F-10 — [Low] [optional] 인용된 증거 파일이 git 에 없다 (다섯 SPEC 전부)

```
$ git ls-files --error-unmatch .moai/state/verify/9d51afd1/test-verbose.txt
error: pathspec '…' did not match any file(s) known to git
```

§E.4 다섯 곳이 전부 이 경로를 인용하는데 커밋되어 있지 않습니다. 지금은 워크트리 디스크에 있어 열리지만, **워크트리를 정리하는 순간 다섯 SPEC 의 인용이 전부 죽은 경로가 됩니다.** VCI §2 의 "인용된 경로가 감사 시점에 열려야 한다"에 걸립니다.

**닫는 조건**: 증거 파일을 커밋하거나, §E.4 에 축자 출력을 직접 담는다.

### F-11 — [Low] [optional] 소스 트리 안에 `.moai/` 잔여물이 생겼다

`server/.moai/`, `server/src/.moai/state/…`, `.moai/specs/.moai/`, `.moai/plan/2026-08-26-minidiscord/.moai/` 가 추적되지 않은 채 남아 있습니다. `server/src/` 아래에 상태 캐시가 들어간 것은 소스 루트 오염입니다.

**닫는 조건**: 삭제하고 `.gitignore` 에 추가한다.

---

## 지시받은 다섯 항목에 대한 답

### 1. 수용 기준이 실제로 무언가를 검증하는가 — 부류 단위 훑기

**대체로 그렇습니다. 이번 라운드에서 그 결함 부류는 재생산되지 않았습니다.**

`SPEC-PERM-001/progress.md §G` 에 기록된 결함 부류("맞는 구현을 떨어뜨리거나 틀린 구현을 통과시키는 기준")를 다섯 SPEC의 AC 77건에 걸쳐 훑었습니다. 확인한 방어 장치:

- **기본 리포터 문제를 명시적으로 인식하고 있습니다.** `SPEC-MENTION-001/acceptance.md` 는 "기본 리포터는 테스트 이름을 한 줄도 내지 않아 **테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고 둘 다 종료 코드 0**"이라고 적고, 그래서 `--reporter=verbose` 의 `✓` 줄을 관측 대상으로 삼습니다. 이건 정확히 그 결함 부류에 대한 정면 대응입니다.
- **`-t` 필터를 거부합니다** — "맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 0" 이라는 이유까지 적혀 있습니다.
- **스텁 대조표**가 있습니다. MENTION 은 기준마다 "어떤 잘못된 구현을 잡아내는가"를 표로 남겼고, 부정 기준의 기대값이 `[]` 가 되지 않도록 정상 멘션을 입력에 섞었습니다.
- **대조군이 기준 본문에 박혀 있습니다.** AC-GW-012 는 "커서 이하 행이 방에 **실재**하고 무필터 대조군은 그 행을 포함"까지 요구합니다. AC-MSG-007 은 3번 단언이 "그 경로에 파일이 실제로 있다 — '아무 데도 안 썼다'로 통과하는 것을 배제"입니다. AC-PERM-011 은 실패 문구가 성공 문구와 **다른지**까지 봅니다.

**한 가지 비대칭**: `--reporter=verbose` 규범은 MENTION(5건)·MSG(13건, `〃` 포함)·PERM(1건)에는 적용됐지만 SSE·GATEWAY 의 AC 표에는 명령 열이 "아래 본문 참조"거나 테스트 이름뿐이라 표만 봐서는 그 규범이 걸려 있는지 알 수 없습니다. 관측 항목 자체는 다중 단언이라 실질 방어력은 있습니다. **비차단 관찰**로 남깁니다 — 표에 명령을 명시하면 다섯 SPEC이 같은 규범을 쓴다는 게 표에서 보입니다.

### 2. 인증이 아니라 인가 — 기록만으로 충분한가

**세 갈래로 나눠 답합니다.**

- **방 멤버십 부재 자체**는 기록으로 충분합니다. README 30행, CHANGELOG 30행, `SPEC-PERM-001 §5` 미결 4건에 소유자 없이 리드 대기로 명시돼 있고, 범위 결정으로서 일관되게 유지됐습니다. 이것만으로 close 를 막을 근거는 없다고 봅니다.
- **다만 그 결정이 기대는 전제를 코드가 어깁니다.** 멤버십을 뺀 근거는 "내 PC에서만 돈다"입니다. `0.0.0.0` 바인드 + 개방 가입은 그 전제를 무효로 만듭니다 → **F-03, 차단.** 고칠 것은 멤버십 모델이 아니라 **전제와 코드의 불일치**입니다.
- **승인 권한이 특히 위험합니다.** 방을 읽고 쓰는 것과 **봇의 도구 실행을 승인하는 것**은 무게가 다릅니다. 후자는 봇 세션에서 실제 명령이 돌게 만듭니다. `SPEC-PERM-001 §5` 의 미결 4건 중 "방 멤버십 검사"는 이 사실을 명시하지 않은 채 나머지 셋(타임아웃, 전용 엔드포인트, 대기 정리)과 같은 무게로 나열돼 있습니다. **비차단이되, 리드가 미결을 판정할 때 이 한 건은 나머지 셋과 급이 다르다는 점을 §5 에 한 줄로 적어 두기를 권합니다.**

### 3. §E.4 증거 자체

- **인용된 명령은 실제로 실행 가능하고, 출력은 그 명령에서 나올 수 있는 것입니다.** 제가 같은 명령을 다시 돌려 같은 수치를 얻었습니다.
- **Gaps 는 정직합니다.** 커버리지 미측정(의존성 미설치), RED→GREEN 전이 미재현, 스키마 불변 주장 미재측정 — 세 가지 모두 "확인하지 않았다"고 명시했고, 제가 반대 증거를 찾은 항목은 없습니다. `SPEC-PERM-001` 은 미결 4건이 닫히지 않았음을 `open_questions_carried: 4` 로 기계 판독 가능하게까지 적었습니다. **커버되지 않은 것을 커버된 것처럼 적은 대목은 찾지 못했습니다.**
- **두 가지 흠**: 발췌를 발췌라 밝히지 않은 것(F-09), 인용 경로가 커밋되지 않은 것(F-10). 그리고 다섯 §E.4 가 `head_at_sync_evidence: "8c4798a"` 로 run 단계 HEAD 를 적었는데 현재 HEAD 는 `eaebe1e` 입니다 — 그 사이 커밋은 sync 산출물과 §E.4 백필뿐이라 **측정값에는 영향이 없고**, 오히려 "증거를 언제 쟀는가"를 정확히 적은 것이므로 흠이 아닙니다.
- **보안 렌즈 절이 실제 결함을 놓쳤습니다.** SPEC-MSG-001 §E.4 는 `grep -n "basename\|resolve(.*startsWith\|preHandler" server/src/routes-messages.ts` 를 근거로 이중 봉인을 확인했는데, **grep 대상 파일이 `routes-messages.ts` 하나**였습니다. 같은 첨부 테이블에 쓰는 두 번째 생산자가 `gateway.ts` 에 있다는 것이 검사 범위 밖이었습니다 → F-01. 이것이 이번 감사가 찾은 가장 큰 값입니다: **한 파일 안에서 봉인을 확인하면 그 파일의 입구만 확인됩니다.**

### 4. 문서 진실성

**routes·status code·프레임 이름은 전부 코드에 근거가 있습니다.** README 표의 16개 경로와 `server/src` 에 등록된 16개 경로가 정확히 일치하고, 없는 경로를 적은 곳도 있는 경로를 빠뜨린 곳도 없습니다. WebSocket 프레임 9종(`hello`/`welcome`/`bot_message`/`status`/`history_request`/`history_response`/`permission_request`/`permission_verdict`/`message`)도 전부 `gateway.ts` 에 실재합니다. 404/409 관례 서술, `consumed_by: 'permission'` 응답 모양, `?after=` 200건 상한, `l` 을 뺀 5글자 ID 규칙 — 모두 코드와 맞습니다. CHANGELOG 의 "알아둘 것" 절은 오히려 평균 이상으로 정직합니다(멤버십 부재·mime 규칙 비대칭·수용된 위험을 먼저 밝힙니다).

**근거를 찾지 못한 진술 하나:**

> CHANGELOG 12행 — "다운로드도 업로드 디렉터리 밖은 내주지 않습니다"

경로에 대해서는 참이지만 **내용에 대해서는 거짓**입니다. F-01 로 업로드 디렉터리 밖 파일의 **내용**이 그 안으로 복사되어 내려갑니다. 읽는 사람이 이 문장에서 받는 보장("바깥 파일은 못 받는다")은 성립하지 않습니다. F-01 을 고치면 이 문장도 참이 되므로 **별도 수정 항목으로 세지 않습니다.**

**README 127행**은 F-03 의 근거로 이미 다뤘습니다 — 문서가 틀렸다기보다 코드가 문서를 안 지킵니다.

### 5. sync 세션이 확인할 생각을 못 한 것

- **F-01** — 첨부 테이블의 **두 번째 생산자**. 검사 범위가 SPEC 파일 단위로 잘려 파일 간 경로를 놓쳤습니다.
- **F-03** — 바인드 주소. 다섯 SPEC 어디에도 속하지 않는 `index.ts` 한 줄이라 SPEC 단위 렌즈에서 사각이 됩니다.
- **F-05** — 방 검사를 **유출 방지**로만 봤고 **거부 수단**이 되는 방향은 보지 않았습니다. 가드는 양방향으로 봐야 합니다.
- **F-07** — 미인증 접속의 **거절**은 테스트했지만(AC-GW-002) 미인증 접속이 **아무것도 안 할 때**는 보지 않았습니다. 거절 경로 테스트는 능동적 잘못만 덮습니다.
- **F-04/F-06** — 봇을 신뢰 입력으로 다뤘습니다. 봇 토큰은 초대 응답에 평문으로 실려 환경변수로 나가는 bearer 자격증명이므로, 봇 프레임은 **신뢰 경계를 넘는 입력**입니다.

관통하는 한 가지: **검사 범위가 SPEC 경계를 따랐고, 결함은 SPEC 경계를 넘는 곳에 있었습니다.**

---

## Gaps — 제가 검증하지 **않은** 것

- **커버리지 수치**: 재지 않았습니다. `@vitest/coverage-v8` 이 없고 의존성 설치는 감사 범위 밖입니다. Craft 점수는 커버리지가 아니라 AC 대조표·테스트 대조군·코드 가독성으로 매겼습니다.
- **RED→GREEN 전이**: 재현하지 않았습니다. §E.2 기록을 그대로 두었고, 제가 확인한 것은 최종 GREEN 상태뿐입니다.
- **스키마 불변 주장(AC-SSE-010 등의 기준 SHA 대비 `db.ts` diff)**: 다시 재지 않았습니다.
- **채널 플러그인(`channel/`)·웹 UI(`web/`)**: 이번 카드 범위 밖이라 열지 않았습니다. F-06 이 t5 승인 UI 에 미치는 영향은 **추정**이며 관측이 아닙니다.
- **F-08 의 디스크 소진**: 코드 읽기로만 판단했고 실제로 채워 보지 않았습니다(레인 로컬 제약 — 부하 생성 금지).
- **F-03 의 원격 도달성**: `0.0.0.0` 바인드는 코드에서 확인했지만 **다른 호스트에서 실제로 접속해 보지는 않았습니다.** 방화벽 등 호스트 설정이 실효 노출을 좁힐 수 있습니다.
- **동시성·경쟁 조건**: SQLite WAL 하에서 다중 요청이 `open` 맵이나 커서(`last_delivered_id`)에 경쟁하는 시나리오는 보지 않았습니다.
- **성능·부하**: 측정하지 않았습니다.
- **머지 후 CI**: 이 분기는 푸시되지 않았고 CI 가 돈 적이 없습니다. 제 관측은 전부 이 워크트리의 로컬 실행입니다.

## Residual-risk — 관측했음에도 남는 위험

- 제 프로브는 `git` 상태를 바꾸지 않지만 **테스트 스위트가 아니라 별도 하네스**입니다. 프로브가 재현한 조립(`buildServer` 전체가 아니라 필요한 모듈만)이 실서버 조립과 다른 지점이 있다면 F-01 의 도달 경로가 실서버에서 조금 다를 수 있습니다. 다만 F-01 의 핵심(`gateway.ts:146` 에 출처 검사 없음)은 조립과 무관한 코드 사실입니다.
- 이 분기는 **아직 머지되지 않았고 워크트리가 유일한 사본**입니다. 워크트리를 정리하면 M3 전체와 §E.4 가 인용하는 증거 파일이 함께 사라집니다(F-10).
- 다섯 SPEC 이 `status: completed` 로 이미 전이돼 있습니다. FAIL 판정이 채택되면 **상태와 판정이 어긋난 채로 남습니다** — 리드가 되돌릴지 유지할지 정해야 합니다.

---

## 리드를 위한 정리

차단 3건(F-01·F-02·F-03)은 **합쳐서 대략 열 줄 안쪽**의 수정입니다.

1. `gateway.ts:146` 앞에 출처 경로 검사 + 그것을 고정하는 테스트 1건
2. HTTP 응답 두 곳의 SELECT 에서 `stored_path` 제거
3. `index.ts:67` 의 `host` 를 `127.0.0.1` 로

세 개를 닫으면 Security 는 임계를 넘고 전체 판정이 PASS 로 뒤집힙니다. 비차단 8건은 후속 카드로 넘겨도 이번 close 를 막지 않습니다 — 다만 F-04·F-05 는 권한 릴레이의 **실사용 경로**를 깨뜨리므로 t5 승인 UI 카드 전에 닫는 편이 낫습니다.

판정 권한은 리드에게 있습니다. 제가 드리는 것은 결론이 아니라 위 증거입니다.
