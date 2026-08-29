# 카드 t3 (M3) sync 3차 감사 보고서

```yaml
card: t3
milestone: M3
lens: "--security --deep"
auditor: sync-auditor (3차 — 독립 재실행 + 변이 검증)
worktree: .claude/worktrees/t3
branch: WT-msg-gateway-relay
head_at_audit: 8c15698
prior_audits:
  - {file: .moai/reports/t3/sync-audit.md, head: eaebe1e, verdict: FAIL, weighted_harmonic: 66.8}
  - {file: .moai/reports/t3/sync-reaudit.md, head: 2a3c0fc, verdict: CONDITIONAL PASS, weighted_harmonic: 74.8}
newly_observed_commits: [a635378, 82c0d5b, b2d4b4a, 8c15698]
verdict: PASS
verdict_driver: "차단 findings 잔여 0건. 필수 통과 두 차원 모두 임계 상회(Functionality 82 / Security 84, 임계 70). 신규 findings 3건은 전부 non-blocking"
authority: 자문 — 최종 판정은 칸반 리드
```

## 한눈에 보기

**닫혔습니다.** 두 차례의 감사가 남긴 차단 findings 는 이번 트리에서 하나도 살아 있지 않습니다.
그리고 이번에는 **읽어서 판단한 것이 아니라 돌려서 확인했습니다.**

- `stored_path` 가 실시간 스트림으로 새던 마지막 구멍(F-02 잔여 = N-01)은, 실제 HTTP 소켓에
  도착한 **SSE 프레임 원문을 받아** 확인했습니다. 프레임에는 `{id, filename}` 만 있습니다.
  2차 감사가 "종단 간 프로브를 돌리지 않았다"고 Gaps 에 적어 둔 항목을 이번에 닫았습니다.
- 심볼릭 링크 우회(N-02)는 게이트웨이의 검사식을 그대로 떼어 **여덟 가지 경우**에 태워 봤습니다.
  전부 의도대로 동작하고, 애매한 경우는 모두 거부 방향으로 떨어집니다.
- **네 개의 보안 테스트가 실제로 잘못된 구현을 걸러내는지**를, 트리 사본을 만들어 수정을 하나씩
  되돌리는 방식으로 확인했습니다. 네 건 모두 정확히 해당 테스트 하나만 실패시킵니다.
  이 프로젝트의 재발 결함 부류("검증하지 않는 수용 기준")에 해당하지 않습니다.
- SPEC 개정 두 건이 추가한 **다섯 개의 인수 기준 명령을 전부 실행**했고, 커밋 메시지가 주장한
  출력과 글자 단위로 같았습니다.

다만 **결함 부류 훑기는 아직 한 칸 남아 있었습니다.** 동기화 세션이 세어 준 여섯 개의 유출
경로 밖에, **일곱 번째 문**이 있습니다 — 첨부 행은 있는데 디스크의 파일이 없을 때
`GET /api/attachments/:id` 가 내는 500 응답 본문에 서버 절대 경로가 그대로 실립니다.
제가 직접 재현했습니다. 원격 공격자가 마음대로 유발할 수 있는 경로는 아니라 차단은 아니지만,
"HTTP 응답은 저장 경로를 내보내지 않습니다"라는 README 문장을 정확히 한 칸 넘습니다.

그 밖에 **보안 기본값 세 가지에 회귀 테스트가 없습니다** — 되돌려도 102개가 전부 초록입니다.
지금 뚫려 있다는 뜻이 아니라, 다음에 누가 되돌려도 아무도 모른다는 뜻입니다.

---

## 차원 점수

앞선 두 감사와 같은 가중치·같은 임계로 매겼습니다.

| 차원 | 1차 | 2차 | **3차** | 임계 | 판정 | 근거 요약 |
|------|-----|-----|---------|------|------|-----------|
| Functionality (40%) | 78 | 74 | **82** | 70 | **PASS (필수)** | 102/102 통과·타입 검사 exit 0(직접 실행). 새 AC 명령 5개 전부 실행해 주장한 출력 일치. N-03 경고가 출하 경로에서 실제로 뜨는 것 관측. 감점: 첨부 개별 건너뛰기는 여전히 무로그, F-04·F-05·F-06 그대로 |
| **Security (25%)** | 45 | 72 | **84** | **70** | **PASS (필수)** | F-01·F-02·F-03 전부 CLOSED — 각각 실행 관측. 검사식 8경우 프로브 전원 fail-closed. 감점: N-07(500 오류 본문 경로 노출), 보안 기본값 3종 무테스트 |
| Craft (20%) | 76 | 78 | **78** | 60 | PASS | 보안 테스트 4건 전부 **변이 검증 통과**(각각 정확히 해당 테스트 1건만 실패). 감점: `+ sep`·fail-closed 기본값·루프백 기본값 세 방어에 테스트 없음, 커버리지 미측정 |
| Consistency (15%) | 90 | 78 | **80** | 60 | PASS | N-04 닫힘(REQ-CORE-010 개정 + HISTORY + AC 3단계), REQ-CORE-005 정렬, 다른 요구사항 무변경 확인, N-06 닫힘(.gitignore 규칙 실동작 확인). 감점: AC-CORE-012 가 현재 트리에서 실패하는데 SPEC-CORE-001 은 `completed`, §E.6 이 두 SPEC 커밋 이후 갱신되지 않음 |

**가중 조화평균**: `1 / (0.40/82 + 0.25/84 + 0.20/78 + 0.15/80)` = **81.3** (1차 66.8 → 2차 74.8 → 3차 81.3)
**비가중 조화평균**: `4 / (1/82 + 1/84 + 1/78 + 1/80)` = **80.9** (67.4 → 75.4 → 80.9)

**필수 통과 방화벽**: Functionality 82 ≥ 70, Security 84 ≥ 70 — 둘 다 독립적으로 상회.
전체 FAIL 을 강제하는 조건 없음. **차단 findings 잔여 0건.**

---

## 제가 직접 실행한 것 (Claim / Evidence / Baseline-attribution)

### Claim 1 — 스위트와 타입 검사

```
$ unset MOAI_KANBAN MOAI_KANBAN_ID MOAI_KANBAN_LABEL MOAI_KANBAN_LEAD_ADDR MOAI_KANBAN_SETTINGS_INJECTED && npm test -w server -- --run
 Test Files  10 passed (10)
      Tests  102 passed (102)
   Duration  7.14s
TEST_EXIT=0

$ npm run typecheck -w server
> tsc --noEmit
TYPECHECK_EXIT=0
```

### Claim 2 — SSE 프레임 원문 (2차 감사의 Gap 을 닫는 관측)

실제 Fastify 서버를 임의 포트로 띄우고, 쿠키 인증된 `GET /api/rooms/1/events` 를 **진짜 HTTP
소켓**으로 열어 둔 상태에서 봇이 WebSocket 으로 첨부를 보냈습니다. 소켓에 도착한 바이트 원문:

```
: connected

event: message
data: {"id":1,"room_id":1,"author_type":"bot","author_user_id":null,"author_bot_id":1,
       "body":"첨부 있음","created_at":"2026-08-27 03:52:59","author_name":"pm",
       "attachments":[{"id":1,"filename":"첨부.txt"}]}

DB 의 실제 stored_path : /var/folders/.../sse-CRxwgn/up/4971c988-…-첨부.txt
wire contains stored_path? : false
wire contains uploads dir? : false
```

(가독성을 위해 `data:` 한 줄만 줄바꿈했습니다. 그 밖에는 소켓이 받은 그대로입니다.)

### Claim 3 — 검사식 8경우 프로브

`gateway.ts:147-156` 의 검사식을 글자 그대로 떼어 저장소 밖 임시 트리에서 태웠습니다.

```
A tmpdir-symlink (양쪽 raw 경로)      : ACCEPT   ← root realpath 가 resolve() 와 다름(macOS /tmp)
B 뿌리 안 하위 디렉터리가 밖을 가리킴 : REJECT
C 뿌리 안 하위 디렉터리가 안을 가리킴 : ACCEPT   ← 정상 사용을 막지 않음
D botFilesDir 를 상대 경로로 지정     : ACCEPT
E botFilesDir 가 실재하지 않음        : REJECT
F botFilesDir 미설정 (출하 기본)      : REJECT
G 출처가 뿌리 디렉터리 자신           : REJECT
H 형제 접두사 '<root>evil'            : REJECT
```

A 가 중요합니다 — **뿌리와 출처를 둘 다 `realpathSync` 로 풀기 때문에** macOS 의
`/tmp` → `/private/tmp` 같은 링크가 정상 사용을 깨뜨리지 않습니다. 한쪽만 풀었다면 A 가
REJECT 로 떨어져 기능이 조용히 죽었을 것입니다. 리드가 물은 "realpathSync 가 테스트가 덮지
않는 동작 변화를 만들었는가"에 대한 답은 **만들지 않았다**이고, 근거는 위 여덟 줄입니다.

### Claim 4 — 네 개의 보안 테스트는 잘못된 구현을 실제로 걸러낸다 (변이 검증)

`server/src` 와 `server/test` 를 저장소 추적 밖(`node_modules/.audit3-probe/`)에 복사해
대조군 102/102 초록을 먼저 확인한 뒤, 수정을 하나씩 되돌려 관측했습니다.

| 변이 | 되돌린 것 | 결과 |
|------|-----------|------|
| M1 | `gateway.ts:172` SELECT 에 `stored_path` 재추가 | **1 failed** — `never publishes stored_path on the hub frame for a bot attachment` (AC-GW-024) |
| M2 | `realpathSync` → `resolve` (뿌리·출처 양쪽) | **1 failed** — `bot_message refuses a symlink inside botFilesDir that points outside it` (AC-GW-023) |
| M3 | `gateway.ts:156` 봉인 검사 줄 삭제 | **2 failed** — AC-GW-021 + AC-GW-023 |
| M4 | `routes-messages.ts:136` 목록 SELECT 에 `stored_path` 재추가 | **1 failed** — `never puts stored_path in the send or list response…` |
| M4b | `routes-messages.ts:98` 전송 응답에 `stored_path` 재추가 | **1 failed** — 같은 테스트 |

네 건 모두 **정확히 해당 테스트만** 실패시킵니다. 과잉 결합도, 무감각도 없습니다.
§E.6 에 기록된 RED 출력 두 줄(`expected [ '겉보기정상.txt', '진짜.txt' ] to deeply equal
[ '진짜.txt' ]`, `to not have property "stored_path"`)은 제 M2·M1 출력과 같은 모양입니다 —
동기화 세션의 RED 주장은 **독립적으로 재현됐습니다.**

### Claim 5 — 되돌려도 아무도 모르는 것 (같은 변이 방법, 반대 결과)

| 변이 | 되돌린 것 | 결과 |
|------|-----------|------|
| M3b | `filesRoot + sep` → `filesRoot` (형제 접두사 구멍 재개방) | **102 passed** — 아무도 못 잡음 |
| M5 | `config.host` 기본값 `127.0.0.1` → `0.0.0.0` | **102 passed** — 아무도 못 잡음 |
| M6 | `botFilesDir` 미설정 시 검사를 무력화(fail-open 화) | **102 passed** — 아무도 못 잡음 |

→ N-08.

### Claim 6 — SPEC 개정이 추가한 인수 기준 명령 5개

전부 이 트리에서 실행했고, 커밋 메시지가 주장한 출력과 일치했습니다.

```
AC-CORE-007 ①  botFilesDir,dataDir,dbPath,host,port,uploadsDir
AC-CORE-007 ②  3000 ./data ./data/minidiscord.db ./data/uploads
AC-CORE-007 ③  4100 /tmp/md /tmp/md/minidiscord.db /tmp/md/uploads
AC-CORE-015 ③a 127.0.0.1
AC-CORE-015 ③b 0.0.0.0
```

### Claim 7 — N-03 기동 경고는 출하 경로에서 실제로 뜬다

`server/package.json` 의 `dev` 스크립트가 `tsx src/index.ts` 라 `process.argv[1]` 이
`index.ts` 를 포함합니다 — 진입점 가드가 열립니다. 상한을 건 실행:

```
$ MINIDISCORD_PORT=4321 MINIDISCORD_DATA_DIR=/tmp/md-audit3 <perl 알람 셸 8초> npx tsx src/index.ts
minidiscord listening on 127.0.0.1:4321
minidiscord: MINIDISCORD_BOT_FILES_DIR 이 없어 봇 첨부를 받지 않습니다 (본문만 전달됩니다)
```

문장이 **환경변수 이름과 그 결과를 둘 다** 말하므로 운영자가 행동할 수 있습니다.
첫 줄은 덤으로 **F-03 의 루프백 바인드를 실행으로 확인**해 줍니다 — 2차 감사는 코드 읽기로만
확인했던 항목입니다.

### Claim 8 — `.gitignore` 규칙은 주장대로 동작한다

```
$ git ls-files ".moai/specs/.moai" | wc -l          → 0            (추적 해제됨)
$ git check-ignore -v server/.moai/state/x.json      → .gitignore:6:**/.moai/state/   (중첩분 무시됨)
$ git check-ignore -v .moai/state/verify/9d51afd1/test-8c15698.txt
                                                     → exit 1      (루트는 무시되지 않음 = 추적 가능)
$ git ls-files .moai/state | wc -l                   → 5           (증거 파일 실제 추적 중)
```

### Baseline-attribution

- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `8c15698`.
- 직전 기준선: 같은 트리 HEAD `2a3c0fc`, 100/100. 증분 2건은 `a635378` 이 추가한
  `it(...)` 두 개(AC-GW-023·AC-GW-024)이며 diff 에서 정확히 2개임을 확인했습니다.
- 저장소 무변경: 감사 전후 `git status --short` 에 추적 파일 변경 0건. 변이 검증과 프로브는
  전부 `node_modules/` 아래 임시 디렉터리와 저장소 밖 임시 트리에서 수행했고 삭제했습니다.
  제가 만든 유일한 저장소 파일은 이 보고서입니다.

---

## 초점 2 — `stored_path` 생산자/소비자 전수 훑기

동기화 세션의 열거를 받아들이지 않고 독립적으로 만들었습니다. 방법: (a) `stored_path`·`local_path`
전체 grep, (b) `attachments` 를 읽는 모든 자리 grep, (c) 서버 밖으로 나가는 모든 배출구
(`hub.publish` 4곳, `send(ws,…)` 5곳, HTTP 응답 3라우트, 로거 설정, catch 블록)를 따로 세고
양쪽을 대조.

### 생산자 — `attachments` 표에서 `stored_path` 를 읽는 자리

| # | 위치 | SELECT | 어디로 나가나 | 누가 받나 | 의도된 것인가 |
|---|------|--------|---------------|-----------|----------------|
| P1 | `gateway.ts:113` `sendStoredMessage` | `id, filename, stored_path` | `send(ws,…)` `files[].local_path` (:114) | **재접속한 그 봇 하나** | **예** — 봇이 로컬 파일을 여는 설계 표면 |
| P2 | `gateway.ts:172` `handleBotMessage` | `id, filename` | `hub.publish` → SSE (:173) | 그 방 구독자 **전원**(로그인만 하면) | **닫힘 ✅** (N-01 수정) |
| P3 | `gateway.ts:199` `deliver` | `id, filename, stored_path` | `send(ws,…)` `files[].local_path` (:204) | 그 메시지의 **타깃 봇들만** | **예** — 같은 설계 표면. 다만 방에 초대된 봇은 uploads 절대 경로를 알게 됨(설계상 수용) |
| P4 | `routes-messages.ts:96-98` 전송 | (INSERT 후 메모리 `savedFiles`) | 응답 + `hub.publish`(:114) + `deliver`(:115) 가 공유하는 `message` 객체 | HTTP 호출자 + SSE 구독자 | **닫힘 ✅** — push 는 `{id, filename}` 뿐 |
| P5 | `routes-messages.ts:136` 목록 | `id, filename` | HTTP 목록 응답 | 인증된 호출자 | **닫힘 ✅** |
| P6 | `routes-messages.ts:145` 다운로드 | `SELECT *` (포함) | :153 봉인 검사, :158 스트림 열기 | **아무도** — 서버 내부 전용 | **예** — 서버 측 사용 |
| **P7** | **`routes-messages.ts:158` 의 오류 경로** | (P6 에서 온 값) | **Fastify 기본 500 봉투의 `message` 필드** | **인증된 호출자** | **아니오 — N-07** |

### 배출구 — 서버 밖으로 나갈 수 있는 모든 자리

| 배출구 | 자리 | `stored_path` 를 나르나 |
|--------|------|--------------------------|
| SSE | `gateway.ts:73`(bot_status)·`gateway.ts:173`·`permissions.ts:27`(`attachments: []` 리터럴)·`routes-messages.ts:114` | **없음** — 4곳 전부 |
| WebSocket | `:100` welcome·`:114` sendStoredMessage·`:193` sendToConn→history_response·`:204` deliver·`:222` sendToBot | `:114`·`:204` 만 (의도됨). `history_response` 는 `id·author_name·body·created_at` 만 실음 |
| HTTP 정상 응답 | 전송(:117)·목록(:131)·다운로드(:156-158) | **없음** |
| **HTTP 오류 응답** | Fastify 기본 오류 봉투 | **P7 — 있음** |
| 로그 | `Fastify({ logger: false })`(index.ts:31), 게이트웨이 catch 는 **빈 블록**, `console.log/warn` 2줄(호스트·포트·환경변수 이름) | **없음** |
| 스택 트레이스 | P7 외 없음 | P7 만 |

### 동기화 세션의 열거와 다른 점

| 항목 | 동기화 세션 | 제 열거 | 차이 |
|------|-------------|---------|------|
| `routes-messages.ts:97` | 전송 응답, 닫힘 | P4 (`:98` push) | 같음 (줄 번호만 한 칸) |
| `routes-messages.ts:136` | 목록, 닫힘 | P5 | 같음 |
| `gateway.ts:172` | 허브 발행, 닫힘 | P2 | 같음 |
| `permissions.ts:27` | "항상 빈 첨부" | 배출구이되 **생산자가 아님** | 무해한 과잉 포함 — `attachments: []` 는 리터럴이라 표를 읽지 않음 |
| `gateway.ts:113` | 재접속 재전송, 유지 | P1 | 같음 |
| `gateway.ts:206` | `deliver`, 유지 | P3 (`:199` SELECT / `:206` 사용) | 같음 |
| `routes-messages.ts:158` | "서버 측 전용" | P6 는 서버 측 전용, **그러나 그 줄의 오류 경로 P7 은 아님** | **여기가 갈립니다** |
| — | (없음) | **P7 — 오류 응답** | **일곱 번째 문. 동기화 세션이 세지 않았습니다** |

**결함 부류 훑기는 세 번째로 한 칸씩 늘어났습니다.** 1차는 한 파일의 출구만 봤고, 2차는 두
파일의 정상 출구까지 봤고, 이번에 **오류 출구**가 나왔습니다. 다음 훑기가 있다면 물어야 할
질문은 "이 값을 읽는 자리가 어디인가"가 아니라 **"이 값이 어떤 봉투에 담겨 나갈 수 있는가"** 입니다.

---

## 직전 findings 처리 결과

| ID | 직전 판정 | **이번 판정** | 근거 (전부 이번 트리 관측) |
|----|-----------|---------------|-----------------------------|
| **F-01** | CLOSED (조건부) | **CLOSED (무조건)** | 8경우 프로브 전원 의도대로. 조건이던 N-02 가 닫힘 |
| **F-02** | **PARTIALLY CLOSED** | **CLOSED** | SSE 소켓 원문 관측(Claim 2) + 전수 훑기(P2·P4·P5 전부 청소). 단 P7 은 별건 N-07 |
| **F-03** | CLOSED | **CLOSED** | 실행 관측: `minidiscord listening on 127.0.0.1:4321` (Claim 7) |
| **N-01** (SSE 경로 노출) | 신규 | **CLOSED** | Claim 2 + 변이 M1 |
| **N-02** (심볼릭 링크 우회) | 신규 | **CLOSED** | Claim 3 + 변이 M2 |
| **N-03** (조용한 fail-closed) | 신규 | **CLOSED** | Claim 7 — 출하 경로에서 실제로 뜨고 문장이 행동 가능 |
| **N-04** (SPEC-CORE-001 `0.0.0.0`) | 신규 | **CLOSED** | `b2d4b4a` — REQ-CORE-010 개정 + 근거 인용 + HISTORY 0.2.0 + AC-CORE-015 3단계(명령 실행 확인) |
| **N-05** (README 한 문장) | 신규 | **CLOSED (거의)** | 문장이 "HTTP 응답도, 실시간 스트림도" 로 정정되고 봇 프레임 예외까지 명시. N-07 만큼만 여전히 넓음 |
| **N-06** (`.moai` 잔여물 추적) | 신규 | **CLOSED** | Claim 8 — 추적 해제 + 규칙 실동작 확인 |

### 비차단 F-04 ~ F-11 의 심각도 변화

리드 지시대로 이관 결정 자체는 재론하지 않고, **바뀐 것만** 적습니다.

| ID | 2차 | **3차** | 사유 |
|----|-----|---------|------|
| F-04 (`request_id` 미검증) | Medium | **Medium (변화 없음)** | `permissions.ts` 무변경 — 백로그 카드 |
| F-05 (`request_id` 전역 네임스페이스) | Medium | **Medium (변화 없음)** | 같음 — 백로그 카드 |
| F-06 (봇이 `system` 작성자로 임의 문구) | Medium | **Medium (변화 없음)** | 같음 |
| F-07 (미인증 유휴 WebSocket) | Low | **Low (변화 없음)** | F-03 이 여전히 닫혀 있음 |
| F-08 (업로드 상한 없음) | Low | **Low (변화 없음)** | 같음 |
| F-09 (§E.4 발췌를 발췌라 밝히지 않음) | Low | **Low (재발)** | §E.6 의 RED 블록도 `1 failed \| 101 skipped` 라는 **필터링된 실행** 결과인데 그렇다고 적지 않았습니다. 같은 모양의 반복 |
| F-10 (인용 증거 미커밋) | CLOSED | **CLOSED (유지)** | `git ls-files .moai/state` → 5건 추적 중 |
| F-11 (`.moai/` 잔여물) | 악화 → N-06 | **개선** | `server/.moai`·`server/src/.moai`·`plan/.../.moai` 는 디스크에 남아 있으나 이제 전부 무시 대상이라 `git status` 를 더럽히지 않습니다. 다만 **루트** `.moai/state/config-cache.json`·`context-usage.json`·`github/` 는 예외 규칙 때문에 영구히 미추적 잡음으로 보입니다 (Low, 변화 없음) |

---

## 신규 findings

### N-07 — [Low] [optional] 파일이 사라진 첨부를 내려받으면 500 본문이 저장 경로를 그대로 알려준다

**위치**: `server/src/routes-messages.ts:158` (오류 경로), 봉투는 Fastify 기본 오류 처리기

첨부 행은 있는데 디스크의 파일이 없으면, `:153` 의 읽기 시점 봉인은 통과합니다(경로는
uploads 안이니까). 그다음 `createReadStream` 이 열리지 않고, Fastify 기본 봉투가 그 오류
메시지를 그대로 실어 보냅니다. **제가 재현했습니다:**

```
status : 500
body   : {"statusCode":500,"code":"ENOENT","error":"Internal Server Error",
          "message":"ENOENT: no such file or directory, open
                     '/var/folders/.../probe-YlKA3x/up/CANARY-8f3a-deleted.txt'"}
LEAKS stored_path? : true
```

**심각도를 Low 로 두는 이유**: 이 상태를 원격 공격자가 마음대로 만들 수 없습니다. 전송 경로는
`statSync` 로 존재를 확인한 뒤 행을 넣고, 게이트웨이도 복사한 뒤 넣습니다. 파일이 사라지는 것은
운영 사건(수동 삭제, 디스크 정리, 데이터 디렉터리 이동)이지 공격 입력이 아닙니다.
**그럼에도 세어야 하는 이유**: 새는 정보가 F-02 와 **정확히 같은 종류**(서버 절대 경로)이고
받는 사람도 같습니다(로그인한 아무나). 그리고 README 문장이 이 문 하나만큼 넓습니다.

**닫는 조건**: 스트림을 넘기기 전에 존재를 확인해 404 로 떨구거나(`existsSync` 한 줄 —
`:153` 봉인 검사 바로 뒤), 이 라우트에 오류 처리기를 붙여 500 본문을 고정 문구로 만듭니다.
후자가 더 넓게 막습니다. 테스트는 "행은 있고 파일은 없는 첨부를 GET 하면 응답 본문에
`stored_path` 가 없다" 한 건이면 충분합니다.

### N-08 — [Medium] [optional] 출하 경로를 안전하게 만드는 기본값 세 가지에 회귀 테스트가 없다

**위치**: `server/src/config.ts:6`, `server/src/gateway.ts:156`

변이 검증 M3b·M5·M6 이 셋 다 **102개 전부 초록**으로 통과했습니다. 즉:

| 되돌리면 다시 열리는 것 | 스위트 반응 |
|---|---|
| `+ sep` 제거 → `<root>evil` 형제 접두사 통과 (코드 주석이 명시적으로 방어한다고 적은 것) | 초록 |
| 기본 호스트 `0.0.0.0` 복귀 → F-03 재개방 | 초록 |
| `botFilesDir` 미설정 시 fail-open → **F-01 의 핵심 방어 무력화** | 초록 |

특히 마지막이 무겁습니다. 두 차례의 감사가 "출하 기본 경로에서는 도달 불가능"을 근거로 잔여
위험을 낮게 매겼는데, **그 근거 자체를 지키는 테스트가 없습니다.** 게이트웨이 테스트는 전부
`{ uploadsDir, botFilesDir: dir }` 로 켜고 들어갑니다 — 끈 상태를 관측하는 테스트가 한 건도
없습니다.

**닫는 조건**: 세 줄짜리 테스트 세 건. (a) `createGateway(app, { uploadsDir })` 로 만든
게이트웨이에 뿌리 안의 정상 파일을 보내도 첨부 행이 0건이다. (b) `config.host` 기본값이
`127.0.0.1` 이고 `MINIDISCORD_HOST` 로 바뀐다(`config.test.ts` 의 기존 `vi.resetModules()`
패턴 그대로). (c) `<root>` 와 형제인 `<root>evil` 안의 파일이 거부된다.
셋 다 기존 파일에 얹으면 되고 새 헬퍼가 필요 없습니다.

### N-09 — [Low] [optional] SPEC-CORE-001 은 `completed` 인데 자기 인수 기준 하나가 현재 트리에서 실패한다

**위치**: `.moai/specs/SPEC-CORE-001/acceptance.md` AC-CORE-012 (REQ-CORE-015)

```
AC-CORE-012 | REQ-CORE-015 | `ls server/src` | 정확히 config.ts, db.ts, index.ts 세 파일만

$ ls server/src
auth.ts  config.ts  db.ts  gateway.ts  index.ts  mention.ts
permissions.ts  routes-bots.ts  routes-messages.ts  routes-rooms.ts  sse.ts   ← 11개
```

**공정하게 말하면** REQ-CORE-015 의 문장("이 SPEC의 구현은 … 라우트를 등록해서는 안 된다")은
M1 시점의 범위 선언으로 읽는 것이 자연스럽고, 형제 SPEC 들이 그 뒤에 파일을 더한 것은 정상입니다.
문제는 **AC 가 시점 한정 없이 실행 가능한 명령과 이분법적 기대 출력으로 적혀 있다**는 점입니다.
지금 이 SPEC 을 근거로 검증하는 사람은 실패를 봅니다.

그리고 이것이 이번 라운드에 걸리는 이유는, **개정 두 건이 바로 그 파일을 두 번 열었기 때문**입니다.
`b2d4b4a`·`8c15698` 은 "코드와 어긋난 SPEC 을 정렬한다"는 전제로 REQ-CORE-005·010 을 고쳤는데,
같은 부류의 세 번째 어긋남은 지나갔습니다. `version: 0.3.0`, `updated: 2026-08-27`,
`status: completed` 인 문서가 자기 AC 하나를 위반하는 상태입니다.

**닫는 조건**: AC-CORE-012 에 시점 한정을 넣거나(`M1 완료 시점 기준`), 명령을
`git show <M1 태그>:… ` 형태로 고정하거나, REQ-CORE-015 를 "이 SPEC 의 `buildServer` 가
등록하는 라우트는 `GET /api/health` 하나뿐" 만 남기고 파일 목록 단언을 뺍니다.
**SPEC 개정 권한은 감사자에게 없습니다 — 리드 판단 사항입니다.**

### N-10 — [Low] [optional] §E.6 이 두 SPEC 개정 커밋 이후로 갱신되지 않았다

다섯 `progress.md` 의 §E.6 은 다섯 벌 모두 바이트 단위로 동일하고(md5 일치), N-04 를
**"닫지 않음 — 리드 판정 대기"** 로 적어 두었습니다. 그런데 그 두 커밋 뒤(`b2d4b4a`)
N-04 는 실제로 닫혔고, `8c15698` 이 REQ-CORE-005 정렬까지 더했습니다. §E.7 은 없습니다.

즉 진행 기록의 마지막 진술이 **트리의 마지막 상태보다 두 커밋 뒤처져** 있습니다.
§E.6 이 스스로 "세 번째 재감사를 받지 않았다"고 밝혀 둔 것은 그 시점에서 정직했고, 지금 이
보고서가 그 문장을 갱신할 근거가 됩니다.

**닫는 조건**: 다섯 벌에 §E.7 한 절 — 두 SPEC 커밋이 무엇을 닫았는지, 그리고 이 3차 감사의
판정. 값이 싸고, 3단계 종료 전에 하는 편이 자연스럽습니다.

---

## 그 밖에 리드가 지목한 항목

**`realpathSync` 의 TOCTOU** — 창은 **좁아졌지만 사라지지 않았습니다.** 좁아진 이유는
`copyFileSync(src, stored)` 가 봇이 준 원본 문자열이 아니라 **검사를 통과한 realpath 결과**를
쓰기 때문입니다(`gateway.ts:155·162`) — 중간 디렉터리 링크를 검사 후에 바꿔치기하는 공격은
이미 풀린 경로에 닿지 않습니다. 남는 창은 **마지막 성분 하나**입니다: `realpathSync` 가
일반 파일이라고 답한 직후 그 이름을 밖을 가리키는 링크로 바꾸면 `statSync`·`copyFileSync` 가
따라갑니다. 전제는 N-02 와 같습니다 — `botFilesDir` 안에 쓸 수 있어야 하고, 밀리초 단위로
맞춰야 합니다. **경쟁 프로브는 돌리지 않았습니다**(Gaps 에 적습니다). 근본 해결은 열어 둔
파일 서술자로 복사하는 것(`open` → `fstat` → 스트림)인데, 이 위협 모델에 비해 값이 비쌉니다.
**후속 카드 후보이지 이 카드의 결함으로 세지 않습니다.**

**README·CHANGELOG 진술** — 이번에 추가된 문장을 각각 코드에 대조했습니다.

| 진술 | 근거 | 판정 |
|---|---|---|
| "확인은 심볼릭 링크를 따라간 **실제 경로**로" | `gateway.ts:148·155` + Claim 3 프로브 B·H | 참 |
| "HTTP 응답도, 실시간 이벤트 스트림도 저장 경로를 내보내지 않습니다" | Claim 2 (SSE 원문) + P4·P5 | **정상 응답에 대해서는 참. N-07 의 500 본문만큼 넓음** |
| "봇에게 가는 WebSocket 프레임의 `local_path` 만 예외" | P1·P3 | 참 — 그리고 이제 비대칭을 문장이 밝힙니다 |
| "테스트 37 → 102, 넷 모두 되돌리면 실패하는 것까지 확인" | 제 변이 검증 M1·M2·M3·M4 | **참 — 독립 재현했습니다** |

**§E.5·§E.6** — 다섯 벌 모두에 존재하고 다섯 벌이 동일합니다. §E.6 의 서술은 실제 일어난 일과
맞고, **Gaps 를 스스로 밝힙니다**("N-04 닫지 않음", "비차단 F-04..F-11 그대로",
"세 번째 재감사를 받지 않았다"). 세 문장 다 그 시점에서 정확했습니다. 다만 N-10(두 커밋 뒤처짐)과
F-09 재발(필터링된 RED 출력을 발췌라 밝히지 않음)이 남습니다.

---

## Gaps — 제가 검증하지 **않은** 것

- **TOCTOU 경쟁 프로브**: 돌리지 않았습니다. 위 판단은 `gateway.ts:155·160·162` 의 코드 사실
  (검사 통과한 realpath 문자열을 그대로 `statSync`·`copyFileSync` 에 넘긴다)로부터의 추론입니다.
  실제로 경쟁을 걸어 파일을 바꿔치기해 본 것은 아닙니다.
- **HTTP 전송 경로의 SSE 프레임**: 제 종단 간 프로브는 **봇 첨부(P2) 경로**만 실제 소켓으로
  관측했습니다. 사용자 multipart 전송이 만드는 SSE 프레임(P4, `routes-messages.ts:114`)은
  기존 테스트가 응답 본문을 관측하는 것과 코드 읽기로만 확인했습니다. 다만 두 경로는 같은
  `message` 객체를 공유하고(`:110·114·115`), 그 객체의 `attachments` 는 `{id, filename}`
  배열 리터럴입니다.
- **커버리지 수치**: 재지 않았습니다(`@vitest/coverage-v8` 미설치, 의존성 설치는 감사 범위 밖).
  Craft 점수는 커버리지가 아니라 **변이 검증 결과**로 매겼습니다.
- **AC-CORE-015 1·2단계**: 3단계(호스트)만 실행했습니다. 1단계(비기본 포트 `curl`)와
  2단계(가져오기만 할 때 종료 `0`)는 다시 실행하지 않았습니다 — 이번 개정이 손대지 않은 부분입니다.
- **F-04 ~ F-08 의 재현**: 다시 재현하지 않았습니다. "변화 없음" 판단은 `permissions.ts` 와
  `gateway.ts` 의 해당 줄이 이번 네 커밋에서 손대지 않았다는 diff 사실로부터의 추론입니다.
- **원격 도달성**: 다른 호스트에서 접속해 보지 않았습니다. `127.0.0.1` 바인드는 기동 로그 한 줄로
  확인했고, 그 주소로 실제 외부 접속이 거부되는지는 관측하지 않았습니다.
- **동시성·부하·성능**: 보지 않았습니다.
- **채널 플러그인(`channel/`)**: 이 워크트리에 디렉터리가 없습니다. 루트 `package.json` 의
  `workspaces` 는 `["server", "channel"]` 인데 `channel` 이 실재하지 않습니다 — 감사하지 않았습니다.
- **머지 후 CI**: 이 분기는 푸시되지 않았고 CI 가 돈 적이 없습니다. 관측은 전부 이 워크트리의
  로컬 실행입니다.
- **`web/`**: `design-tokens.css` 한 장뿐이라 소비자 분석 대상이 아니었습니다.

## Residual-risk — 관측했음에도 남는 위험

- **N-08 이 앞선 두 감사의 판정 근거를 무보증 상태로 둡니다.** 1·2차 감사가 잔여 위험을 낮게
  매긴 근거는 "출하 기본값이 fail-closed" 였는데, 그 기본값을 지키는 테스트가 없습니다.
  누가 되돌려도 스위트는 초록이고, 다음 감사자는 같은 근거를 다시 코드 읽기로만 확인해야 합니다.
- **P7 은 훑기가 끝났다는 감각을 경계하게 합니다.** 세 번의 훑기가 세 번 다 한 칸씩 늘었습니다.
  "모든 생산자를 셌다"는 주장은 봉투(정상 응답 / 오류 응답 / 로그 / 트레이스)를 축으로 다시
  세기 전까지는 완결이 아닙니다.
- **이 분기는 아직 머지되지 않았고 워크트리가 유일한 사본입니다.** 워크트리를 정리하면 M3 전체가
  함께 사라집니다. `t1`·`t2` 도 같은 상태라고 들었습니다.
- **`channel` 워크스페이스가 선언돼 있는데 실재하지 않습니다.** 루트에서 `npm test` 를 돌리는
  경로가 있다면 이 불일치가 드러날 수 있습니다 — 이번에 `-w server` 로만 돌려 확인하지 않았습니다.

---

## 리드를 위한 정리

**판정은 PASS 이고, 3단계 종료를 막는 findings 는 없습니다.**

이번에 새로 나온 네 건(N-07·N-08·N-09·N-10)은 전부 non-blocking 이며, 성격이 다릅니다.

- **N-08** 이 값에 비해 가장 무겁습니다 — 테스트 세 줄이면 앞선 두 감사가 세운 판정 근거가
  코드에 고정됩니다. 이 카드 안에서 처리하는 것을 권합니다.
- **N-10** 은 값이 가장 쌉니다 — §E.7 한 절. 3단계 종료 기록으로도 어차피 필요합니다.
- **N-07** 은 후속 카드로 충분합니다. 공격자가 유발할 수 없고, 닫는 값은 한두 줄이지만
  이 카드의 범위(같은 결함 부류의 잔여)와 성격이 조금 다릅니다.
- **N-09** 는 SPEC 소유권 문제라 리드 판단 사항입니다. SPEC-CORE-001 을 `completed` 로 유지할지,
  AC-CORE-012 에 시점 한정을 넣을지는 감사자가 정할 일이 아닙니다.

한 가지만 덧붙입니다. **이번 카드에서 같은 결함 부류가 세 번 나왔고, 세 번 다 "훑었다"고
믿은 뒤에 나왔습니다.** 이번에 그 부류를 닫는 데 실제로 효과가 있었던 것은 열거가 아니라
**변이 검증** 이었습니다 — 테스트를 읽는 대신 구현을 되돌려 테스트가 우는지 본 것.
다음 카드의 sync 단계에 이 방법을 기본으로 넣는 것을 제안드립니다. 트리 사본 한 벌과
`sed` 한 줄이면 되고, 이 저장소의 재발 결함 부류("검증하지 않는 수용 기준")를 정면으로 겨눕니다.

판정 권한은 리드에게 있습니다. 제가 드리는 것은 결론이 아니라 위 증거입니다.
