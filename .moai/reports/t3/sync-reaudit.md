# 카드 t3 (M3) sync 재감사 보고서

```yaml
card: t3
milestone: M3
lens: "--security --deep"
auditor: sync-auditor (재감사 — 독립 재실행)
worktree: .claude/worktrees/t3
branch: WT-msg-gateway-relay
head_at_reaudit: 2a3c0fc
baseline_audit: .moai/reports/t3/sync-audit.md (head eaebe1e, verdict FAIL)
fix_commits: [4c20d0e (code), 2a3c0fc (docs + SPEC)]
verdict: CONDITIONAL PASS
verdict_driver: "필수 통과 두 차원 모두 임계 상회 (Functionality 74, Security 72 / 임계 70). 다만 F-02 는 완전히 닫히지 않았다"
authority: 자문 — 최종 판정은 칸반 리드
```

## 한눈에 보기

차단 3건 중 **2건은 확실히 닫혔고(F-01·F-03), 1건은 절반만 닫혔습니다(F-02).** 직전 감사가
실증했던 "봇 토큰 하나로 임의 파일 읽기"는 실제로 막혔습니다 — 저는 새 검사 코드를 읽고,
새 테스트가 잘못된 구현을 걸러내는지 확인하고, 테스트 100건이 전부 통과하는 것을 다시
관측했습니다.

문제는 두 가지입니다. 첫째, `stored_path` 를 응답에서 뺀 것이 **HTTP 응답 두 곳에만**
적용됐습니다. 봇이 첨부와 함께 메시지를 보내면 그 절대 경로가 **SSE 스트림을 타고** 그 방을
구독 중인 로그인 사용자 전원에게 그대로 갑니다(`gateway.ts:166`). 직전 감사가 "한 파일 안에서
봉인을 확인하면 그 파일의 입구만 확인된다"고 적었던 바로 그 결함 부류가, 같은 카드 안에서
한 번 더 재생산됐습니다. 둘째, F-01 의 새 검사는 **심볼릭 링크로 우회됩니다** — 제가 직접
실행해 확인했습니다.

다만 **둘 다 `MINIDISCORD_BOT_FILES_DIR` 를 켜야만 발동합니다.** 기본값은 꺼짐이고, 꺼져 있으면
봇 첨부 행 자체가 생기지 않아 SSE 로 샐 경로도 없고 심볼릭 링크로 끌어올 것도 없습니다.
그래서 출하 기본 경로에서는 두 결함 모두 도달 불가능하고, 필수 통과 방화벽은 넘습니다.
**"봇 첨부 기능을 켜기 전에 반드시 닫아야 할 두 건"** 으로 넘기는 것이 제 권고입니다.

---

## 차원 점수

직전 감사와 같은 임계·같은 가중치로 매겼습니다(비교 가능하도록).

| 차원 | 직전 | 이번 | 임계 | 판정 | 근거 요약 |
|------|------|------|------|------|-----------|
| Functionality (40%) | 78 | **74** | 70 | PASS | 100/100 통과·타입 검사 clean. 감점: fail-closed 기본값이 봇 첨부를 **아무 신호 없이** 끈다(로그 한 줄도 없음). F-04·F-05 는 그대로 |
| **Security (25%)** | 45 | **72** | **70** | **PASS (필수 통과, 가까스로)** | F-01 토큰 단독 경로 차단·F-03 차단. 잔여: SSE 경로 노출(N-01), 심볼릭 링크 우회(N-02) — 둘 다 옵트인 뒤 |
| Craft (20%) | 76 | **78** | 60 | PASS | 새 테스트 2건 모두 대조군 보유·RED→GREEN 관측 기록. 감점: `config.host`/`botFilesDir` 무테스트, 조용한 skip |
| Consistency (15%) | 90 | **78** | 60 | PASS | 감점: SPEC-CORE-001 REQ-CORE-010 이 여전히 `0.0.0.0` 을 요구(수정 없음, status 도 completed), README 한 문장이 코드와 불일치, `.moai/specs/.moai/` 잔여물이 이번에 **커밋됨** |

**가중 조화평균**: `1 / (0.40/74 + 0.25/72 + 0.20/78 + 0.15/78)` = **74.8** (직전 66.8)
**비가중 조화평균**: `4 / (1/74 + 1/72 + 1/78 + 1/78)` = **75.4** (직전 67.4)

필수 통과 방화벽(Functionality + Security) — 두 차원 모두 임계 상회. 전체 FAIL 을 강제하는
조건은 없습니다.

---

## 제가 직접 재실행한 것 (Claim / Evidence / Baseline-attribution)

### Claim
수정 라운드가 보고한 "테스트 98 → 100, 전부 통과, 타입 검사 exit 0" 은 사실이다.

### Evidence

```
$ unset MOAI_KANBAN MOAI_KANBAN_ID MOAI_KANBAN_LABEL MOAI_KANBAN_LEAD_ADDR MOAI_KANBAN_SETTINGS_INJECTED && npm test -w server -- --run
EXIT=0

 Test Files  10 passed (10)
      Tests  100 passed (100)
   Duration  7.17s

$ npm run typecheck -w server
TYPECHECK_EXIT=0
> tsc --noEmit
(출력 없음)
```

### Baseline-attribution
- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `2a3c0fc`.
- 직전 감사 기준선: 같은 트리, HEAD `eaebe1e`, 98/98. 증분 2건 = gateway 1 + messages 1 —
  두 커밋의 diff 에서 추가된 `it(...)` 이 정확히 2개임을 확인했습니다.
- 작업 트리는 커밋 상태 그대로입니다(`git status --short` 에 추적 파일 변경 없음 — 로그·상태
  캐시 미추적분만 있음). 제가 저장소 파일을 고친 것은 없습니다.

---

## 직전 차단 findings 처리 결과

### F-01 — [Critical] 봇 첨부 출처 경로 봉인 → **CLOSED (조건부, 아래 N-02 참조)**

**관측한 것:**

- `server/src/gateway.ts:144-152` 에 검사가 실재합니다. `filesRoot = opts.botFilesDir ? resolve(opts.botFilesDir) : null` 을
  루프 밖에서 한 번 계산하고, 각 첨부마다 `const src = resolve(String(f.local_path))` 후
  `if (!filesRoot || !src.startsWith(filesRoot + sep)) continue`.
- `sep` 를 붙인 비교가 실제로 `<root>-evil` 접두사 일치를 막습니다 — 코드 읽기로 확인.
- `server/src/index.ts:44` 가 `botFilesDir: config.botFilesDir` 를 넘기고,
  `config.botFilesDir` 는 `process.env.MINIDISCORD_BOT_FILES_DIR` (게터, 기본 undefined) 입니다.
  따라서 **`buildServer` 를 포함한 출하 기본 경로에서 봇 첨부는 전부 거부됩니다.** 리드가
  물은 항목 5의 "기본값으로 꺼져 있다"는 주장은 **사실입니다.**

**지시받은 우회 시도 — 각각 어떻게 확인했는지 명시합니다:**

| 시도 | 결과 | 확인 방법 |
|---|---|---|
| `..` 세그먼트 | 막힘 — `resolve()` 가 정규화한 뒤 비교 | 코드 읽기 |
| 상대 경로(서버 cwd 기준 해석) | 막힘 — 해석 결과가 뿌리 안이어야 통과 | 코드 읽기 |
| `<root>-evil` 접두사 일치 | 막힘 — `sep` 를 붙여 비교 | 코드 읽기 |
| `botFilesDir` = uploads 디렉터리 | 새 권한 없음 — 이미 다운로드 가능한 파일들 | 코드 읽기 |
| `botFilesDir` = `/` | **전부 거부됨**(의외의 fail-closed) — `resolve('/')` 는 `/`, `'/'+sep` 은 `'//'`, `/etc/passwd` 는 `//` 로 시작하지 않음 | **실행 확인** (아래) |
| 대소문자 무시 파일시스템 | 거부 방향(fail-closed) — `resolve` 는 케이스를 정규화하지 않음 | 코드 읽기 |
| **뿌리 안의 심볼릭 링크가 밖을 가리킴** | **뚫림** → N-02 | **실행 확인** (아래) |
| `botFilesDir` 자체가 심볼릭 링크 | 같은 원리로 우회 가능(뿌리 쪽 `resolve` 도 lexical) | 코드 읽기 |

실행 확인한 프로브 (저장소 밖 임시 디렉터리, 저장소 무변경):

```
filesRoot        : …/symprobe/root
resolved src     : …/symprobe/root/link.txt      ← root 밖 secret.txt 를 가리키는 심볼릭 링크
passes guard?    : true                          ← 검사를 통과한다
statSync size    : 14
copied content   : "CANARY-OUTSIDE"              ← 바깥 내용이 그대로 복사된다
--- botFilesDir=/ probe ---
root=/, guard on /etc/passwd : false             ← '/' 를 뿌리로 주면 전부 거부된다
```

**판정**: 직전 감사가 실증한 공격(**봇 토큰만 있는 원격 공격자**가 절대 경로 하나로 임의 파일을
끌어옴)은 닫혔습니다. 남은 우회는 **봇 프로세스가 `botFilesDir` 안에 파일을 쓸 수 있어야**
성립하므로 전제가 명확히 더 강합니다. 따라서 CLOSED 로 판정하되, N-02 를 별건으로 답니다.

### F-02 — [High] `stored_path` HTTP 노출 → **PARTIALLY CLOSED**

**닫힌 부분 (관측함):**

- `routes-messages.ts:92` 전송 응답 배열 타입에서 `stored_path` 제거, push 도 `{ id, filename }` 만.
- `routes-messages.ts:135` 목록 응답 SELECT 가 `SELECT id, filename` 로 축소.
- `gateway.ts:14` `MessageRow.attachments` 원소 타입 축소.
- 새 테스트가 두 응답 모두를 관측하고, 문자열 전체에 실제 `stored_path` 가 없는지까지 봅니다.

**닫히지 않은 부분:**

`server/src/gateway.ts:166-167` — 봇 메시지 처리의 마지막 두 줄이 그대로입니다.

```
166:    const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(messageId)
167:    hub.publish(info.roomId, 'message', { ...row, author_name: authorName(row), attachments })
```

`hub.publish` 는 `sse.ts:49` 에서 `JSON.stringify(data)` 로 프레임을 만들어 그 방의 SSE
구독자 전원에게 씁니다. 구독 경로는 `index.ts:57` `GET /api/rooms/:id/events` 이고
`preHandler: [requireAuth]` — 즉 **로그인한 아무나** 입니다. 봇 프레임(`deliver`,
`sendStoredMessage`)의 `local_path` 는 설계상 표면이라 유지가 맞지만, 이 줄은 봇이 아니라
**사람 쪽 스트림**입니다.

**세 번째 생산자를 놓쳤습니다.** 직전 감사가 F-01 에서 도출한 교훈("첨부 테이블의 두 번째
생산자")과 정확히 같은 모양이 한 칸 옆에서 재생산됐습니다.

**어떻게 확인했는가 (정직하게)**: 종단 간 유출 프로브는 **돌리지 않았습니다.** 근거는 (a) 위 두
줄의 코드 사실, (b) `sse.ts:46-51` 의 직렬화 코드, (c) `index.ts:57` 의 인증 수준, 그리고
(d) 기존 통과 테스트 `AC-GW-007` 이 `msgEvents[0].data.attachments` 가 그 SELECT 결과임을
관측한다는 점입니다. 그 테스트는 길이만 보고 `stored_path` 유무는 보지 않으므로 **이 누출을
고정하는 테스트도, 막는 테스트도 없습니다.**

**닫는 조건**: `gateway.ts:166` 의 SELECT 를 `SELECT id, filename` 으로 줄인다(한 줄).
그리고 `AC-GW-007` 이 이미 잡고 있는 `published` 배열에 `expect(msgEvents[0].data.attachments[0]).not.toHaveProperty('stored_path')`
한 줄을 더한다.

### F-03 — [High] `0.0.0.0` 바인드 → **CLOSED**

- `config.ts:6` `host: process.env.MINIDISCORD_HOST ?? '127.0.0.1'`.
- `index.ts:67` `await app.listen({ port: config.port, host: config.host })`.
- 저장소 전체 grep 결과 `0.0.0.0` 은 문서·SPEC·계획서에만 남고 **실행 코드에는 없습니다.**
  다른 바인드도 없습니다 — `.listen(` 은 `index.ts:67` 과 테스트 5곳(`{ port: 0 }`, 호스트
  미지정 → Fastify 기본 localhost)뿐입니다. `web/` 에는 `design-tokens.css` 하나뿐이라 별도
  개발 서버가 없습니다.

**리드가 물은 게터 vs 일반 속성 문제 — 실질 영향 없습니다.** `config.host` 가 게터가 아닌
일반 속성인 것은 `config.port` 와 같은 모양이라 오히려 인접 필드와 일관됩니다. 그리고 이
프로젝트의 설정 테스트는 `vi.resetModules()` + 동적 import 패턴을 쓰는데, 이 패턴에서는 모듈
본문이 다시 실행되므로 **일반 속성도 새 환경변수를 반영합니다**(`config.port`=4100 테스트가
이미 그 증거입니다). 지연 게터가 필요한 것은 "같은 모듈 인스턴스를 유지한 채 import 이후에
환경변수를 바꾸는" 경우뿐이고, 이 저장소에는 그런 경로가 없습니다. **결함 아님**으로 판정합니다.

다만 **F-03 에는 회귀 테스트가 하나도 없습니다** — `config.test.ts` 는 손대지 않아서
`host` 도 `botFilesDir` 도 관측하지 않습니다. 누가 기본값을 되돌려도 스위트는 초록입니다.
(Craft 감점 사유)

---

## 수정 라운드가 깨뜨린 것 — 없음 (관측함)

리드가 지목한 세 항목을 각각 확인했습니다.

- **`deliver` 의 봇 프레임 `local_path`**: `gateway.ts:193` 이 DB 에서 `SELECT id, filename, stored_path`
  로 **다시 읽어** `files: [{ name, local_path: a.stored_path }]` 를 만듭니다. `MessageRow`
  타입 축소는 이 경로를 지나지 않습니다 — 봇 프레임은 그대로입니다.
- **재접속 재전송(`sendStoredMessage`)**: `gateway.ts:112-119` 도 같은 모양으로 DB 재조회.
  영향 없음.
- **`MessageRow.attachments` 소비자 중 `stored_path` 의존**: `stored_path`/`local_path` 를
  grep 한 결과 `server/src` 와 `server/test` 밖에는 소비자가 없습니다(`web/` 은 CSS 한 장뿐).
  타입 검사 exit 0 도 같은 결론입니다.

---

## 새 테스트 2건은 분별력이 있는가 — 있습니다

이 프로젝트의 재발 결함 부류("검증하지 않는 수용 기준") 기준으로 훑었습니다.

**`bot_message refuses a local_path outside botFilesDir while still attaching one inside`**

- **대조군 있음**: 허용 뿌리 안의 정상 파일 1건을 같은 프레임에 함께 보냅니다. 단언이
  `expect(atts.map(a => a.filename)).toEqual(['정상.txt'])` 라서 **2 면 유출 그대로, 0 이면
  전부 거부** — 양방향 오답을 모두 떨어뜨립니다.
- **내용까지 관측**: 복사본을 열어 카나리 문자열이 없는지 봅니다. 이름만 보는 단언이
  놓칠 "이름 바꿔 복사" 경우를 덮습니다.
- **RED→GREEN 이 §E.5 에 기록**돼 있고, 기록된 RED 출력(`+ "harmless.txt"`)이 제가 코드에서
  예측한 실패 모양과 일치합니다.
- 제가 직접 구현을 되돌려 재현하지는 않았습니다(수정 금지 제약) — **Gaps 에 명시합니다.**

**`never puts stored_path in the send or list response while keeping the id usable`**

- **대조군 있음**: `attachments` 길이 1, `filename` 값, `id` 타입까지 먼저 단언하므로
  "첨부를 통째로 빼먹은" 구현은 통과하지 못합니다.
- **다른 이름으로 새는 경우까지**: DB 의 실제 `stored_path` 문자열이 응답 본문 어디에도 없는지
  `res.body`/`list.body` 전체에 대해 봅니다.
- **기능이 죽지 않았음까지**: `id` 로 다운로드해 본문이 일치하는지 확인합니다.
- **다만 범위가 HTTP 두 곳뿐**입니다. 봇 경로도, SSE 프레임도 관측하지 않아 위 F-02 잔여를
  잡지 못합니다. 테스트가 부실한 게 아니라, **수정 범위가 좁았고 테스트가 그 범위를 정확히
  따라간 것**입니다.

---

## 새 findings (이번 라운드에서 생겼거나 처음 관측한 것)

### N-01 — [Medium] [blocking-if-bot-attachments-enabled] SSE 스트림이 `stored_path` 를 그대로 내보낸다

**위치**: `server/src/gateway.ts:166`

F-02 항목에 전문을 적었습니다. 요약: 봇 첨부가 있는 메시지의 허브 발행 프레임이 서버 절대
경로를 담고, 그 프레임은 인증만 통과한 모든 방 구독자에게 갑니다. `MINIDISCORD_BOT_FILES_DIR`
가 꺼져 있으면 봇 첨부 행이 생기지 않아 발동하지 않습니다.

**닫는 조건**: SELECT 한 줄 축소 + `AC-GW-007` 에 단언 한 줄 추가.

### N-02 — [High] [blocking-if-bot-attachments-enabled] 심볼릭 링크가 출처 봉인을 통과한다

**위치**: `server/src/gateway.ts:151-158`

`path.resolve()` 는 **어휘적(lexical)** 정규화만 합니다 — 심볼릭 링크를 따라가지 않습니다.
반면 `copyFileSync` 는 따라갑니다. 그래서 `botFilesDir` 안에 바깥을 가리키는 링크가 있으면
검사는 통과하고 복사는 바깥 내용을 가져옵니다. 위 프로브에서 실행으로 확인했습니다.

전제: 공격자가 `botFilesDir` 안에 링크를 만들 수 있어야 합니다. 그런데 이 디렉터리의 용도가
README 상 "봇 세션의 작업 폴더"라, **봇 프로세스 자신은 늘 그 안에 쓸 수 있습니다.** 즉 토큰만
가진 원격 공격자에게는 닫혔지만, **봇 프로세스가 신뢰 경계를 넘는 입력이라는 직전 감사의
관점(F-04/F-06)에서는 여전히 열려 있습니다.**

**닫는 조건**: 비교 대상을 `realpathSync` 결과로 바꾼다 — 뿌리와 출처 양쪽 모두.
`const src = realpathSync(String(f.local_path))`, `const filesRoot = realpathSync(opts.botFilesDir)`.
없는 파일은 `realpathSync` 가 던지고 기존 `catch` 가 받으므로 REQ-GW-011 의 "건너뛰기" 동작과
자연스럽게 맞물립니다. 테스트는 기존 AC-GW-021 에 링크 케이스 한 줄을 더하면 됩니다.

### N-03 — [Low] [optional] fail-closed 기본값이 아무 신호 없이 기능을 끈다

**위치**: `server/src/gateway.ts:152` (`continue`), `server/src/index.ts:44`

리드가 물은 항목 6 입니다. **문서 쪽은 충분합니다** — README 환경변수 표에 "없음 (봇 첨부 꺼짐)"
이 있고, 본문 한 문단과 CHANGELOG 항목이 각각 명시합니다.

**코드 쪽은 침묵합니다.** `botFilesDir` 가 없으면 모든 첨부가 조용히 `continue` 되고, 기동
로그에도 경고가 없고, 봇에게 돌아가는 오류 프레임도 없습니다. CHANGELOG 를 읽지 않고
업그레이드한 운영자에게는 "봇이 파일을 보내는데 방에 아무것도 안 뜬다"만 남습니다 — 진단
비용이 가장 비싼 실패 모양입니다.

**닫는 조건**: 기동 시 `botFilesDir` 미설정이면 `console.warn` 한 줄, 또는 첨부를 건너뛸 때
`app.log` 한 줄. 둘 중 하나면 충분합니다.

### N-04 — [Medium] [optional] SPEC-CORE-001 이 여전히 `0.0.0.0` 을 요구한다

**위치**: `.moai/specs/SPEC-CORE-001/spec.md:87` (REQ-CORE-010), 같은 파일 `status: completed`

```
REQ-CORE-010 (Where — 진입점 직접 실행)
server/src/index.ts 가 프로세스 진입점으로 직접 실행된 경우, 서버는 config.port 와
호스트 0.0.0.0 으로 수신을 시작해야 한다.
```

코드는 이제 이 요구사항을 **위반합니다.** CHANGELOG 는 F-03 항목 끝에 "(`SPEC-CORE-001` 경계)"
라고 적어 이 SPEC 을 인지하고 있는데, 정작 SPEC 본문은 손대지 않았고 status 도 `completed`
그대로입니다. 다섯 SPEC 은 `in-progress` 로 되돌렸으면서 실제로 요구사항이 바뀐 한 벌만
남았습니다.

**닫는 조건**: REQ-CORE-010 의 호스트를 `config.host`(기본 `127.0.0.1`)로 개정하고, 그 개정을
SPEC-CORE-001 의 변경 이력에 남긴다. 리드 판단 사항 — SPEC 개정은 감사자의 권한이 아닙니다.

### N-05 — [Low] [optional] README 한 문장이 코드보다 넓게 약속한다

**위치**: `README.md` 보안 절 마지막 문단

> 첨부 응답에는 파일 번호(`id`)와 이름만 실립니다. 서버 안의 실제 저장 경로는 내보내지 않습니다.

앞 문장은 참(HTTP 응답 두 곳). 뒤 문장은 N-01 때문에 **거짓**입니다 — SSE 프레임으로 나갑니다.
N-01 을 닫으면 이 문장도 참이 되므로 별도 수정 항목으로 세지 않습니다.

**나머지 문서 진술은 전부 코드에 근거가 있습니다** (리드 항목 5에 대한 답):

| 이번에 추가된 진술 | 근거 |
|---|---|
| `MINIDISCORD_HOST` 기본 `127.0.0.1` | `config.ts:6` + `index.ts:67` |
| `MINIDISCORD_BOT_FILES_DIR` 기본 없음 → 봇 첨부 꺼짐 | `config.ts:13` + `gateway.ts:145,152` + `index.ts:44` — **`buildServer` 포함 확인** |
| "밖의 경로는 그 첨부만 조용히 건너뜁니다" | `gateway.ts:152` 의 `continue` (메시지 INSERT 는 141행에서 이미 끝남) |
| 테스트 37 → 100 | 제가 재실행: 100 passed, exit 0 |
| "가입 제한 없음" 을 미구현 목록에 추가 | `auth.ts` 의 register 에 게이트 없음 — 직전 감사가 확인한 사실과 동일 |
| CHANGELOG "다운로드도 업로드 디렉터리 밖은 내주지 않습니다" | 직전 감사가 F-01 로 **내용상 거짓**이라 지적했던 문장 — F-01 이 닫히면서 **다시 참이 됐습니다** |

### N-06 — [Low] [optional] 이번 커밋이 소스 트리 잔여물을 **추적 대상으로** 만들었다

직전 F-11 은 "추적되지 않은 `.moai/` 잔여물"이었습니다. `2a3c0fc` 이 그중 셋을 커밋했습니다:

```
$ git ls-files ".moai/specs/.moai"
.moai/specs/.moai/state/config-cache.json
.moai/specs/.moai/state/context-usage.json
.moai/specs/.moai/state/github/counts.json
```

세션 상태 캐시가 `.moai/specs/` 아래에 들어간 것이라, 미추적일 때보다 나빠졌습니다.
`server/.moai/`, `server/src/.moai/` 는 여전히 미추적으로 남아 있습니다.

**닫는 조건**: 세 파일을 `git rm --cached` 하고 `.gitignore` 에 `**/.moai/state/` 를 넣는다.

---

## 비차단 findings(F-04 ~ F-11) 의 심각도 변화

리드 지시대로 백로그 이관 결정 자체는 재론하지 않고, **이번 수정으로 심각도가 바뀐 것만**
적습니다.

| ID | 직전 | 이번 | 변화 이유 |
|---|---|---|---|
| F-04 (`request_id` 미검증) | Medium | **Medium (변화 없음)** | 봇 프레임 신뢰 문제라 바인드 주소와 무관 |
| F-05 (`request_id` 전역 네임스페이스) | Medium | **Medium (변화 없음)** | 위와 같음 |
| F-06 (봇이 `system` 작성자로 임의 문구) | Medium | **Medium (변화 없음)** | 위와 같음 |
| F-07 (미인증 유휴 WebSocket 무제한) | Medium | **Low** | 증폭기였던 F-03 이 닫혀 원격에서 소켓을 쌓으려면 `MINIDISCORD_HOST` 를 명시적으로 넓혀야 함 |
| F-08 (업로드 개수·총량 상한 없음) | Low | **Low (하한 유지, 실효 위험 감소)** | 같은 이유로 원격 반복 호출 전제가 사라짐 |
| F-09 (§E.4 발췌를 발췌라 밝히지 않음) | Low | **Low (변화 없음)** | 이번 라운드에서 손대지 않음 |
| F-10 (인용 증거 파일 미커밋) | Low | **CLOSED** | `git ls-files` 확인 — `test-verbose.txt` 가 `23b9b83` 에서 커밋됨. **단, t2 세대 인용인 `.moai/state/verify/sync-t2/*.log` 는 여전히 미추적**(이 카드 범위 밖) |
| F-11 (`.moai/` 잔여물) | Low | **악화 → N-06** | 셋이 추적 대상이 됨 |

---

## Gaps — 제가 검증하지 **않은** 것

- **SSE 종단 간 유출 프로브(N-01)**: 실행하지 않았습니다. 근거는 코드 4곳(`gateway.ts:166-167`,
  `sse.ts:46-51`, `index.ts:57`)의 데이터 경로와 기존 통과 테스트 `AC-GW-007` 의 관측입니다.
  브라우저나 HTTP 클라이언트로 실제 SSE 프레임을 받아 본 것은 **아닙니다.**
- **수정을 되돌린 RED 재현**: 하지 않았습니다 — 구현·테스트 수정 금지 제약. §E.5 에 기록된
  RED 출력을 읽고 제 코드 분석과 일치하는지 대조한 것이 전부입니다.
- **커버리지 수치**: 재지 않았습니다(`@vitest/coverage-v8` 미설치, 의존성 설치는 감사 범위 밖).
  Craft 점수는 커버리지가 아니라 테스트 대조군·AC 대조표·코드 가독성으로 매겼습니다.
- **심볼릭 링크 우회의 서버 내 재현(N-02)**: Node 표준 동작(`path.resolve` 는 lexical,
  `copyFileSync` 는 링크를 따라감)을 **저장소 밖 프로브로 실행 확인**했습니다. 실제
  `handleBotMessage` 를 태워 첨부 행이 생기는 것까지 보지는 않았습니다. 다만 검사식이
  프로브와 글자 그대로 같습니다.
- **F-03 의 원격 도달성**: 다른 호스트에서 접속해 보지 않았습니다. `127.0.0.1` 바인드는
  코드 사실로만 확인했습니다.
- **`MINIDISCORD_HOST` 를 실제로 넓혀 본 실행**: 하지 않았습니다.
- **채널 플러그인(`channel/`)**: 이 워크트리에 디렉터리 자체가 없습니다. README 가 언급하는
  `minidiscord-channel` 은 별도 저장소로 보이며 감사하지 않았습니다.
- **동시성·경쟁 조건, 성능·부하**: 보지 않았습니다.
- **머지 후 CI**: 이 분기는 푸시되지 않았고 CI 가 돈 적이 없습니다. 관측은 전부 이 워크트리의
  로컬 실행입니다.
- **F-04 ~ F-09 의 재현**: 다시 재현하지 않았습니다. 심각도 변화 판단은 F-03 이 닫혔다는
  코드 사실로부터의 추론이며, 각 항목을 다시 실행해 본 것은 아닙니다.

## Residual-risk — 관측했음에도 남는 위험

- **N-01·N-02 는 같은 스위치 뒤에 있습니다.** `MINIDISCORD_BOT_FILES_DIR` 를 켜는 순간 둘 다
  동시에 살아납니다. 즉 "봇 첨부를 켠다"는 결정이 **두 개의 보안 결함을 한 번에 여는 결정**
  입니다. 이 결합을 README 어디에도 적어 두지 않았습니다.
- **F-03 의 close 를 지키는 테스트가 없습니다.** 누가 기본 호스트를 되돌려도 스위트는 초록입니다.
- **이 분기는 아직 머지되지 않았고 워크트리가 유일한 사본입니다.** 워크트리를 정리하면 M3 전체가
  함께 사라집니다.
- **SPEC-CORE-001 이 코드와 어긋난 채 `completed` 로 남아 있습니다**(N-04). 다음에 이 SPEC 을
  근거로 삼는 작업이 `0.0.0.0` 을 다시 요구할 수 있습니다.

---

## 리드를 위한 정리

**차단 3건은 실질적으로 처리됐고 필수 통과 방화벽을 넘습니다.** 다만 "F-02 closed" 는 엄밀히는
사실이 아닙니다 — 세 번째 생산자가 남아 있습니다.

권고는 둘 중 하나입니다.

- **(a) 지금 닫고 넘긴다** — N-01(SELECT 한 줄 + 단언 한 줄)과 N-02(`realpathSync` 두 줄)를
  이 카드 안에서 마저 닫습니다. 합쳐서 대여섯 줄이고, 둘 다 이미 있는 테스트에 단언을 얹으면
  됩니다. 이러면 F-02 가 완전히 닫히고 판정이 무조건부 PASS 가 됩니다. **이쪽을 권합니다** —
  같은 결함 부류가 같은 카드 안에서 두 번 나온 상태로 닫는 것이 마음에 걸립니다.
- **(b) 지금 닫고 두 건을 후속 카드로 넘긴다** — 출하 기본 경로에서 도달 불가능하다는 점을
  근거로 CONDITIONAL PASS 를 채택하되, **"봇 첨부 기능을 켜기 전 필수"** 라는 조건을 후속
  카드 본문에 못 박습니다. N-04(SPEC-CORE-001 개정)도 같이 넘깁니다.

어느 쪽이든 N-03(조용한 skip 에 로그 한 줄)과 N-06(`.moai` 잔여물 3건 언스테이지)은 값이
싸므로 이 카드에서 함께 처리하는 편이 낫습니다.

판정 권한은 리드에게 있습니다. 제가 드리는 것은 결론이 아니라 위 증거입니다.
