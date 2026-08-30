# t15 sync 단계 품질 감사 — SPEC-GWAUTH-001

- 감사 대상: `SPEC-GWAUTH-001` (게이트웨이 상호 인증), 카드 `t15`
- 트리: `.claude/worktrees/t15` · 브랜치 `WT-rogue-frame-defense` · HEAD `2d7c1ef`
- 렌즈: `--security --deep` · Tier M · 임계 0.80 · 조화평균
- 감사관: sync-auditor (독립 판정 — run 레인·sync 레인의 주장은 전부 재현으로만 인정한다)

---

## 판정

**FAIL — 종합 0.70** (임계 0.80 미달, **must-pass 차원 Security 가 독립적으로 미달**)

| 차원 | 가중 | 점수 | 판정 | 증거 |
|---|---|---|---|---|
| Functionality | 40% | 0.76 | FAIL | `npm test` exit 0 · `Tests 183 passed (183)` + `Tests 82 passed (82)`; AC 15/15 하네스 존재·초록 실측. 그러나 acceptance.md DoD 「변이표 A~M 이 표와 **정확히 일치**」가 미충족(13행 중 7행 불일치, 미교정) |
| Security | 25% | **0.55** | **FAIL (must-pass)** | 프로브 재실행 `PROBE_TOKEN_SEEN_BY_ROGUE>>>secret-token-the-rogue-never-knew` / `PROBE_SESSION_ESTABLISHED>>>true`, exit 0. `spec.md` §5 배제표 1행이 거짓 |
| Craft | 20% | 0.85 | PASS | `npm run typecheck --workspaces` exit 0 (양쪽 0 오류). 길이 가드 선행 + `timingSafeEqual`, 소켓 지역 상태 셋, `@MX:ANCHOR`/`@MX:REASON` 착지 |
| Consistency | 15% | 0.70 | FAIL | 형제 명세 코드 블록 미개정(`SPEC-CHANPERM-001/acceptance.md:136`·`SPEC-CHANWIRE-001/acceptance.md:89` 이 여전히 증명 없는 `welcome` 을 싣는다), 낡은 줄 인용 12자리 이상 미적용 |

조화평균: `1 / (0.40/0.76 + 0.25/0.55 + 0.20/0.85 + 0.15/0.70) = 1 / 1.4304 = 0.699`

**must-pass 방화벽**: Functionality(0.76)·Security(0.55) 둘 다 0.80 미달. Security 하나만으로도 종합은 FAIL 로 확정된다.

---

## 1. Claim (주장)

이 감사가 세우는 주장은 여섯이다.

1. **HEAD `2d7c1ef` 에서 스위트는 초록이고 타입 검사는 0 오류다.** (run·sync 레인의 baseline 을 독립 재현으로 확인)
2. **AC-GWAUTH-001~015 의 `it()` 열넷이 실재하고 전부 통과하며, AC-GWAUTH-014 경계도 재측정으로 PASS 다.** (하네스 층은 건강하다)
3. **`spec.md` §5 배제표 1행은 거짓이다** — 「소켓 위치만」 가진 상대는 유효한 증명을 만들 수 있고 세션을 확립시킨다. sync 레인의 지적을 **반박 시도 후 확인**했다.
4. **§1.2 의 「세 갈래가 한꺼번에 닫힌다」는 문장 그대로는 거짓이 아니다** — 조건문이 참이기 때문이다. 거짓인 것은 §1.1 의 상대를 그 조건문의 전건 안에 놓은 §5 1행이다. (sync 레인의 물음 1 후반부에 대한 **부분 반박**)
5. **부정 수용 기준 다섯(006·008·009·011·012)은 §1.1 이 지목한 상대를 재지 않는다** — 하네스가 그 상대에게 스스로 토큰을 읽지 않도록 강제하기 때문이다.
6. **acceptance.md 의 Definition of Done 한 항목이 미충족이며 교정되지 않았다.**

---

## 2. Evidence (증거) — 실행 명령과 원문

### 2.1 스위트 (독립 재현)

```
$ npm test > .moai/state/verify/t15-sync-audit-npm-test.txt 2>&1
EXIT=0

$ grep -E "Tests |Test Files " .moai/state/verify/t15-sync-audit-npm-test.txt
 Test Files  15 passed (15)
      Tests  183 passed (183)
 Test Files  7 passed (7)
      Tests  82 passed (82)
```

**82 는 81 이 아니다** — sync 레인의 미커밋 프로브 `channel/test/zz-sync-probe-token-echo.test.ts` 한 파일이 트리에 있기 때문이다(`git status` 로 `??` 확인). 커밋된 집합의 값은 `81` 이고, run 레인이 기록한 `264` 와 일치한다.

### 2.2 타입 검사 (독립 재현)

```
$ npm run typecheck --workspaces > .moai/state/verify/t15-sync-audit-typecheck.txt 2>&1
EXIT=0

> typecheck
> tsc --noEmit

> @minidiscord/channel@0.1.0 typecheck
> tsc --noEmit
```

### 2.3 Security — 토큰 되받기 프로브 (독립 재실행)

```
$ npx vitest run test/zz-sync-probe-token-echo.test.ts --root channel --reporter=verbose --silent=false

stdout | test/zz-sync-probe-token-echo.test.ts > 프로브: hello 를 받는 자리가 토큰을 되받아 증명을 만든다 > 토큰을 미리 알지 못한 위조 게이트웨이가 세션을 확립시킨다
PROBE_TOKEN_SEEN_BY_ROGUE>>>secret-token-the-rogue-never-knew
PROBE_SESSION_ESTABLISHED>>>true

 ✓ … 17ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
EXIT=0
```

프로브 안에서 위조자가 아는 것은 **이 소켓에 도착한 `hello` 프레임 하나**뿐이다(`zz-sync-probe-token-echo.test.ts:22-29`). 그 프레임에서 토큰을 읽어 `createHash('sha256')` → `createHmac('sha256', key)` 로 증명을 만들고, 채널이 그것을 받아들여 `onWelcome` 을 부른다.

생산 코드의 두 자리가 이 결과를 설명한다.

```
$ sed -n '82p' channel/src/gateway-client.ts   (ws.on('open') 안)
      ws.send(JSON.stringify({ type: 'hello', token: opts.token, nonce }))   // 첫 프레임은 곧 인증이다

$ sed -n '45p' channel/src/gateway-client.ts   (verifyProof 안)
  const key = createHash('sha256').update(token).digest('hex')
```

즉 **증명 열쇠는 `hello` 프레임이 방금 상대에게 건넨 평문 토큰의 결정적 함수**다. 서버 쪽도 같은 값을 쓴다.

```
$ sed -n '90p;107p' server/src/gateway.ts
    const keyHex = sha256Hex(String(token ?? ''))
      welcome.proof = createHmac('sha256', keyHex).update(`${nonce}|${row.room_id}|${row.bot_id}`).digest('hex')
```

### 2.4 형제 하네스도 같은 능력을 이미 쓴다

```
$ grep -rn "proofOf(m.token" channel/test
channel/test/gateway-client.test.ts:51:        if (typeof m.nonce === 'string') welcome.proof = proofOf(m.token, m.nonce, 1, 2)
channel/test/index-wiring.test.ts:58:        if (typeof m.nonce === 'string') welcome.proof = proofOf(m.token, m.nonce, 1, 2)
channel/test/permission-relay.test.ts:97:        if (typeof m.nonce === 'string') welcome.proof = proofOf(m.token, m.nonce, 1, 2)
```

세 하네스가 **받은 토큰으로 증명을 계산**하고 통과한다. 프로브는 새 사실을 만든 것이 아니라, 이미 커밋되어 초록으로 도는 세 자리가 무엇을 뜻하는지 이름 붙인 것이다.

### 2.5 부정 기준의 위조자는 토큰을 읽지 않는다

```
$ sed -n '60,68p' channel/test/transport-auth.test.ts
  function welcomeFrame(): Record<string, unknown> {
    const frame: Record<string, unknown> = { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }
    const branch = state.proof ?? 'valid'
    if (branch !== 'omit') {
      const valid = proofOf('tok', nonceSeen, 1, 2)
```

`proofOf('tok', …)` — **하네스 상수**이지 `m.token` 이 아니다. 같은 하네스가 나가는 프레임에서 `request_id` 는 읽는다.

```
$ sed -n '86,88p' channel/test/transport-auth.test.ts
      if (m.type === 'hello') nonceSeen = m.nonce
      if (m.type === 'permission_request') requestIds.push(m.request_id)
```

**같은 위조자에게 `nonce` 와 `request_id` 를 읽을 능력은 주면서 `token` 을 읽을 능력만 빼앗는다.** 프레임을 읽는 능력은 하나인데, 기준이 그것을 필드별로 갈라 놓았다.

### 2.6 AC 하네스 실재 확인 (열넷 전건)

```
$ grep -rn "welcome carries a proof bound|…|passes a proof-bearing welcome through untouched" server/test channel/test
server/test/gateway.test.ts:849:  it('welcome carries a proof bound to the nonce, room and bot, keyed on the stored token hash', …
server/test/gateway.test.ts:878:  it('a hello without a nonce is still welcomed, and that welcome carries no proof', …
server/test/gateway.test.ts:898:  it('no frame ever carries the plaintext token or its stored hash', …
channel/test/transport-auth.test.ts:461:  it('hello carries a 64-hex nonce and exactly three fields', …
channel/test/transport-auth.test.ts:471:  it('the nonce is regenerated per socket and a replayed proof is refused', { timeout: 20000 }, …
channel/test/transport-auth.test.ts:503:  it('a forged welcome with no proof opens nothing: no chat, no verdict, no history', …
channel/test/transport-auth.test.ts:516:  it('a welcome with a valid proof establishes the session and the same frames arrive once each', …
channel/test/transport-auth.test.ts:530:  it('a proof of the right length and the wrong value is refused', …
channel/test/transport-auth.test.ts:542:  it('a valid proof does not authenticate a different room_id', …
channel/test/transport-auth.test.ts:556:  it('the entry point closes a proofless socket, says one line on stderr and nothing on stdout', …
channel/test/transport-auth.test.ts:572:  it('a forged verdict neither reaches the session nor consumes the id the real verdict needs', { timeout: 20000 }, …
channel/test/transport-auth.test.ts:603:  it('a proof of the wrong length is refused without throwing', …
channel/test/gateway-mutual-auth.test.ts:79:  it('the real server and the real channel agree on the proof end to end', …
channel/test/gateway-client.test.ts:391:  it('passes a proof-bearing welcome through untouched, proof field included', …
```

열넷 전건 실재하고, §2.1 의 스위트가 초록이므로 전건 통과다.

### 2.7 AC-GWAUTH-014 경계 (재측정)

```
$ git diff --name-only b11bdc5..HEAD
.moai/specs/SPEC-CHANPERM-001/acceptance.md
.moai/specs/SPEC-CHANPERM-001/spec.md
.moai/specs/SPEC-CHANWIRE-001/acceptance.md
.moai/specs/SPEC-CHANWIRE-001/spec.md
.moai/specs/SPEC-GWAUTH-001/progress.md
.moai/specs/SPEC-GWAUTH-001/spec.md
channel/src/gateway-client.ts
channel/test/gateway-client.test.ts
channel/test/gateway-mutual-auth.test.ts
channel/test/index-wiring.test.ts
channel/test/permission-relay.test.ts
channel/test/transport-auth.test.ts
server/src/gateway.ts
server/test/gateway.test.ts

$ git diff b11bdc5..HEAD -- server/package.json channel/package.json
(빈 출력)

$ grep -rn "node:fs" channel/src/ | wc -l
       0
```

14파일 전부 허용 집합 안. **AC-GWAUTH-014 PASS 를 독립 확인한다.**

### 2.8 형제 명세의 코드 블록은 개정되지 않았다

```
$ sed -n '136p' .moai/specs/SPEC-CHANPERM-001/acceptance.md
      if (m.type === 'hello') ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))

$ sed -n '89p' .moai/specs/SPEC-CHANWIRE-001/acceptance.md
      if (m.type === 'hello') ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))
```

두 블록 모두 **증명 없는 `welcome`** 을 싣는다. 바로 아래(`:149`·`:162`)에 「위 스텁은 … `proof` 를 계산해 실어 보낸다」는 산문 주석이 붙었을 뿐, 「이 블록은 그 코드의 명세 원본이다」라고 스스로 선언한 코드 블록 자체는 옛 모양 그대로다.

### 2.9 낡은 줄 인용 (표본 재현)

```
$ sed -n '105p;114p' channel/test/gateway-client.test.ts
  cleanups.push(() => client.stop())
  it('sends hello with the token as the very first frame', async () => {

$ sed -n '86p;93p' channel/test/permission-relay.test.ts
  const wss = new WebSocketServer({ port: 0 })
      if (m.type === 'hello') {

$ sed -n '47p;54p' channel/test/index-wiring.test.ts
  const wss = new WebSocketServer({ port: 0 })
      if (m.type === 'hello') {
```

`spec.md:189`·`:196`·`:199` 와 `plan.md:262` 가 인용한 `:105`·`:86`·`:47` 은 전부 엉뚱한 줄을 가리킨다. run 이 §E.2.9 ③에 실측한 새 앵커(`:114`·`:93`·`:54`)가 맞다 — **목록은 정확하나 적용되지 않았다.**

### 2.10 `routes-bots.ts` 주석 미수행 (실측)

```
$ sed -n '9,10p' server/src/routes-bots.ts
// @MX:ANCHOR: [AUTO] 토큰 해시 공개 계약 — 카드 t3 게이트웨이가 hello { token } 인증에서 같은 함수로 bot_tokens 를 조회한다
// @MX:REASON: 해시 방식이 이 함수 하나에 고정돼 있어야 발급(여기)과 조회(t3 게이트웨이)가 갈라지지 않는다. 형식을 바꾸면 이미 발급된 초대가 전부 무효가 된다
```

「그리고 채널 사본」은 없다. `plan.md:258` 이 그것을 지시하지만 `plan.md:23`(PRESERVE)과 `acceptance.md:355-370`(AC-014 허용 집합)이 그 파일을 배제한다 — **계획 문서 내부의 자기모순**이다.

### 2.11 린터 부재

```
$ grep -n "lint" package.json server/package.json channel/package.json
(빈 출력)
```

이 저장소에는 린터 스크립트가 없다. Craft·Consistency 의 기계 검증은 `tsc` + grep 으로 한정된다 — **PASS 가 아니라 Gap 으로 기록한다**(§4).

---

## 3. Baseline-attribution (baseline 귀속)

- **트리**: `WT-rogue-frame-defense` @ `2d7c1ef`, 기준 `b11bdc5`. 모든 수치는 **이 세션·이 나무·이 HEAD 에서 감사관이 직접 실행**한 것이며, run·sync 레인의 보고를 옮겨 적지 않았다.
- **스위트**: 감사관 실행 = server 183 + channel 82 = **265**. 커밋된 집합은 **264**(sync 레인 미커밋 프로브 1건 제외). run 레인의 `264` 와 sync 레인의 `264` 는 이 재현으로 귀속이 성립한다.
- **타입 검사**: 감사관 실행 exit 0, 양쪽 0 오류. sync 레인의 `t15-sync-typecheck.txt` 와 일치.
- **프로브**: 감사관이 sync 레인의 프로브 소스를 통독한 뒤 재실행했다. 출력이 `t15-sync-probe-token-echo.txt` 와 동일.
- **AC-014**: 감사관이 `git diff --name-only b11bdc5..HEAD` 를 직접 냈다. run 의 `ac014-boundary.txt` 를 인용하지 않았다.
- **변이 A~O**: **감사관은 변이를 재실행하지 않았다.** run 레인의 `mutation-*.txt` 원문 판독에만 근거한다 — §4 Gap 에 명시한다.

---

## 4. Gaps (미검증)

이 감사가 **관측하지 않은** 것을 적는다.

1. **변이 A~O 15개를 재실행하지 않았다.** 「전부 스위트에 포착됨」과 「N·O 짝 성립」은 run 레인의 증거 파일 판독이지 감사관의 실측이 아니다. 감사 중 변이를 넣는 것은 다른 레인의 관측을 오염시키므로 의도적으로 하지 않았다.
2. **린터를 돌리지 않았다** — 저장소에 없기 때문이다(§2.11). 스타일·복잡도·미사용 심볼 축은 기계적으로 검증되지 않았다.
3. **커버리지를 재지 않았다.** vitest 커버리지 설정이 없어 85% 임계를 기계로 확인할 수 없다.
4. **타이밍 부채널을 재지 않았다.** `timingSafeEqual` 의 존재는 소스로 확인했고 길이 가드 선행은 변이 K 가 잰다고 run 이 보고하나, 실제 타이밍 측정은 하지 않았다(acceptance 스스로 「테스트 환경에서 신뢰할 수 없다」고 배제).
5. **F-A8 의 128 상한 도달성을 실측하지 않았다** — 그것은 감사가 아니라 카드가 해야 할 조치이며, 미이행 자체가 F-04 다.
6. **의존성 취약점 감사를 돌리지 않았다** (`npm audit`). 이 SPEC 이 의존성을 하나도 더하지 않았음은 §2.7 로 확인했으므로 이번 변경의 위험 표면 밖이다.
7. **`t10`/`t16` 과의 병합 충돌을 확인하지 않았다** (run 인계 ⑤). 다른 브랜치를 읽는 일이라 이 워크트리 안에서 하지 않았다.

---

## 5. Residual-risk (잔여 위험)

- **AC-GWAUTH-005·011 은 실제 1초 백오프를 두 번 이상 기다린다**(20초 타임아웃). 부하 걸린 기계에서 이 둘부터 거짓 실패한다. 감사관의 실행에서는 통과했으나 한 번의 통과가 안정성의 증거는 아니다.
- **`deferWelcome` 순서에 기대는 기준 여섯**(006·007·008·009·011·012)은 구현이 `hello` 직후 소켓을 닫는 식으로 바뀌면 함께 붉어진다. 원인이 방어가 아니라 순서라는 진단은 문서를 읽어야만 나온다.
- **F-01 을 고치는 방향이 `hello` 의 프로토콜 변경이라면 그것은 `SPEC-GATEWAY-001` 계약 변경**이며, 형제 SPEC 다수와 하네스 전체가 다시 붉어진다. 이 카드 안에서 고치는 선택은 위험이 크다 — §7 권고가 그 이유로 「문서 정정 + 후속 카드」를 먼저 놓는다.
- **감사관이 변이를 재실행하지 않았으므로**, 「방어 구멍 0」이라는 결론은 run 레인의 관측 신뢰에 의존한다. 다만 F-01·F-02 가 성립하는 이상 「변이가 잡힌다」는 사실 자체가 재는 대상이 좁다는 문제를 상쇄하지 못한다.

---

## 6. Findings (구조화 결함 목록)

| ID | 심각도 | 차단 | 위치 | 요약 |
|---|---|---|---|---|
| F-01 | **Critical** | **차단** | `spec.md:377` (§5 배제표 1행) | 「소켓 위치만」 가진 상대가 증명을 만들 수 있다 — 배제표가 거짓 |
| F-02 | **High** | **차단** | `channel/test/transport-auth.test.ts:64` | 부정 기준 다섯이 §1.1 의 상대보다 엄격히 약한 상대를 잰다 |
| F-03 | **High** | **차단** | `acceptance.md:404`·DoD | 「변이표 A~M 이 표와 정확히 일치」 미충족, 미교정 (13행 중 7행) |
| F-04 | Medium | **차단** | `progress.md:173` (§E.4) | F-A8 포인터 미종결 — 카드가 닫히면 조용히 사라진다 |
| F-05 | Medium | 비차단 | `plan.md:258` vs `:23`·`acceptance.md:355` | 계획 문서 내부 자기모순 (M3-5 후반부) |
| F-06 | Medium | 비차단 | `SPEC-CHANPERM-001/acceptance.md:136`, `SPEC-CHANWIRE-001/acceptance.md:89` | 「명세 원본」이라 선언한 코드 블록이 개정되지 않았다 |
| F-07 | Low | 비차단 | `spec.md:189,196,199`, `plan.md:262,274`, `acceptance.md:67` | 낡은 줄 인용 12자리 이상 — 실측 목록은 있으나 미적용 |
| F-08 | Low | 비차단 | `acceptance.md:285` (AC-009) | 「유효한 증명이 다른 room_id 를 인증하지 않는다」는 증명-복사 상대에게만 참 |
| F-09 | Low | 비차단 | `channel/src/gateway-client.ts:50` | `verifyProof` 가 프레임이 주장하는 `room_id`·`bot_id` 를 그대로 쓴다 — 채널에 기대값이 없다 |
| F-10 | Low | 비차단 | 저장소 루트 | 린터 부재 — Craft 축의 기계 검증이 `tsc` 로 한정된다 |
| F-11 | Info | 비차단 | `spec.md:80` (§1.2) | **반박 성립** — §1.2 문장 자체는 참인 조건문이다 |

---

### F-01 — [Critical] [차단] `spec.md` §5 배제표 1행이 거짓이다

**위치**: `.moai/specs/SPEC-GWAUTH-001/spec.md:377`

```
| 소켓 위치만 (`hello` 를 받는 자리) — §1.1 프로브의 상대, 루프백 포트 선점, 같은 망의 중간자 | **아니다** | **배제한다** |
```

**확립 명령과 출력**: §2.3 (프로브 재실행, `PROBE_SESSION_ESTABLISHED>>>true`) + §2.3 의 `gateway-client.ts:82`·`:45` 판독.

**반박 시도 넷 — 전부 실패했다.**

1. *「소켓 위치」가 `hello` 를 못 보는 자리를 뜻하는가?* — 아니다. 표가 스스로 괄호에 「`hello` 를 **받는** 자리」라고 적었다.
2. *열쇠가 DB 에만 있는 `token_hash` 라서 상대가 못 얻는가?* — 아니다. `token_hash = sha256Hex(평문 토큰)`(`routes-bots.ts:11-13`)이고 §2.2 스스로 「토큰 → 해시는 자명하다」고 적는다. 방금 받은 평문으로 계산된다.
3. *구현이 `hello` 에서 토큰을 뺐는가?* — 아니다. `gateway-client.ts:82` 가 `{ type:'hello', token: opts.token, nonce }` 를 그대로 보낸다.
4. *하네스가 특수해서 실제 배치에서는 안 되는가?* — 아니다. 이미 커밋되어 초록으로 도는 형제 하네스 셋이 같은 계산을 한다(§2.4).

**표의 세 하위 경우를 각각 판정한다.**

| 하위 경우 | 실제 판정 | 근거 |
|---|---|---|
| §1.1 프로브의 상대 (로그 서버) | **배제하지 못한다** | §2.3 프로브 재실행 |
| 루프백 포트 선점 | **배제하지 못한다** | 같은 위치 — `ws://127.0.0.1:port` 에서 `hello` 를 받는다 |
| 같은 망의 중간자 | 배제되지만 **이 SPEC 때문이 아니다** | 비루프백 `wss://` 강제는 `SPEC-CHANAUTH-001` REQ-CHANAUTH-010 소유이며 `spec.md:433` 이 스스로 「이 SPEC 은 손대지 않는다」고 적는다. TLS 아래에서는 중간자가 `hello` 도 못 읽고 `welcome` 도 못 넣는다 |

**세 하위 경우 중 둘은 거짓이고, 셋째는 참이나 귀속이 틀렸다.**

**이것이 이 카드가 고치러 온 결함 부류다.** `spec.md:96` 이 스스로 적는다 — 「카드 `t15` 는 «방어가 닫은 것보다 더 많이 닫았다고 적은 SPEC» 이 만들어 낸 카드다 … 같은 실패를 반복하지 않는다.」 §5 는 v0.2.0 에서 1회차 감사 C-03 을 받아 「토큰을 모르는 **모든** 상대」를 네 행 표로 갈랐다. 그 정정이 **세로축(공격자가 무엇을 가졌는가)만 정밀하게 만들고 가로축(그래서 증명을 만들 수 있는가)의 1행을 검증하지 않았다.**

**필요한 처방** (택일, 이 카드 안에서):

- **(a) 권고** — §5 1행의 「배제한다」를 **「배제하지 못한다」로 정정**하고, 「소켓 위치만」 행을 두 행으로 가른다: 「`hello` 를 받는 자리 (평문 토큰을 함께 받는다)」= 배제 못함 · 「소켓에 쓸 수 있으나 `hello` 를 읽을 수 없는 자리」= 배제함(잔여, §7-2 참조). §1.2 에 「이 설계는 `hello` 가 평문 토큰을 싣는 한 소켓 위치 상대를 배제하지 않는다」 한 문장을 더한다. `progress.md` §E.2.8 의 경계 진술과 §E.3 `boundary_statement` 도 함께 정정한다.
- **(b)** 프로토콜을 고쳐 `hello` 에서 평문 토큰을 뺀다(서버가 먼저 논스를 보내고 양쪽이 HMAC 으로 증명). **이 카드 범위 밖이다** — `SPEC-GATEWAY-001` 계약 변경이며 AC-GWAUTH-014 집합을 벗어난다. 후속 카드로 연다.

(a) 없이 카드를 닫으면, 이 카드는 자기가 고치러 온 문장을 자기 문서 안에 새로 만든 채 종료된다.

---

### F-02 — [High] [차단] 부정 기준 다섯이 §1.1 의 상대를 재지 않는다

**위치**: `channel/test/transport-auth.test.ts:64` (`proofOf('tok', nonceSeen, 1, 2)`), 영향 기준 AC-GWAUTH-006·008·009·011·012.

**확립 명령과 출력**: §2.5.

`rogueGateway` 의 증명 갈래는 넷이다 — `omit`(필드 없음) · `wrong`(첫 글자 뒤집음) · `short`(길이 틀림) · `other-room`(유효한 증명 + 방만 다름). **넷 모두 「토큰을 모르는 상대」의 행동이다.** 다섯째 갈래 — 「받은 토큰으로 증명을 계산한다」 — 는 존재하지 않는다.

**하네스가 능력을 필드별로 갈랐다는 것이 핵심 증거다.** 같은 위조자가 `nonceSeen = m.nonce` 로 논스를 읽고 `requestIds.push(m.request_id)` 로 나가는 판정 요청의 id 를 읽는다(§2.5). 프레임을 읽는 능력은 하나인데, 기준이 그 능력을 「논스는 읽는다 / request_id 는 읽는다 / **token 은 안 읽는다**」로 임의 분할했다. 그 분할에는 위협 모형상의 근거가 없다.

**대조**: 「유효한 증명」갈래는 `proofOf('tok', …)` 이고 `'tok'` 은 하네스가 채널에 준 토큰과 같은 값이다. 즉 **AC-GWAUTH-007(양성)이 이미 「토큰을 아는 상대는 통과한다」를 재고 있다.** 그리고 F-01 이 보인 것은 소켓 위치 상대가 곧 토큰을 아는 상대라는 사실이다 — 그러므로 007 은 「진짜 서버」와 「§1.1 의 위조자」를 구분하지 못한다.

**공허한 기준의 정확한 목록**: AC-GWAUTH-006 · 008 · 009 · 011 · 012 다섯. 각각 자기 문장 안에서는 참을 재지만, **§1.1 이 세운 위협 모형에 대해서는 아무것도 재지 않는다.** AC-005(재생 거절)는 논스가 소켓마다 새로 만들어짐을 재므로 공허하지 않으나, 그 방어가 겨누는 재생 상대 역시 소켓 위치가 있으면 새 토큰을 받으므로 실질 잔여는 작다.

**공허하지 않은 기준**: 001·002·003·004·010·013·014·015. 이 여덟은 서버·프레임·경계의 성질을 재며 위협 모형에 의존하지 않는다.

**필요한 처방**: `rogueGateway` 에 다섯째 갈래 `'echoed'`(`proofOf(m.token, nonceSeen, 1, 2)`)를 더하고, **그 갈래가 세션을 확립시킨다는 것을 단언하는 기준을 하나 세운다.** 그 기준의 이름이 이 SPEC 의 실제 경계를 매 실행마다 문서화한다 — 「이것은 통과한다」를 기준으로 못 박는 것이 §5 를 다시 과장하지 않게 하는 유일한 기계 장치다. sync 레인의 미커밋 프로브(`zz-sync-probe-token-echo.test.ts`)가 이미 그 형태이므로, 파일명을 정규화하고 AC 를 하나 신설해 커밋하면 된다. **다만 이 편집은 AC-GWAUTH-014 허용 집합 안이다**(`channel/test/transport-auth.test.ts`) — 경계를 넘지 않는다.

---

### F-03 — [High] [차단] Definition of Done 한 항목이 미충족이며 교정되지 않았다

**위치**: `.moai/specs/SPEC-GWAUTH-001/acceptance.md:404` + DoD 세 번째 체크박스.

acceptance.md 가 변이표 앞에 [HARD] 로 적는다.

```
$ sed -n '404p' .moai/specs/SPEC-GWAUTH-001/acceptance.md
각 변이를 하나씩 넣고 스위트를 돌린 뒤 되돌린다. **표와 정확히 일치해야 한다** — 더 많이 무너져도, 더 적게 무너져도 실패다.
```

DoD: `- [ ] 변이표 A~M 이 표와 **정확히 일치**하게 대응한다`

run 레인의 실측(`progress.md` §E.2.4):

```
- **완전 일치 6행**: A(001·013) · B(001·013) · D(002) · E(003) · K(012) · L(010).
- **결합 차이 7행** … H+{005·010} · I+{005·012} · J+{005·015} · M+{012} · G+{AC-CHANCLIENT-011} …
  C-009 … 생존; I-011 … 거절됨
```

**13행 중 7행이 불일치다.** 그중 다섯(G·H·I·J·M)은 「더 많이 무너졌다」, 둘(C·I)은 「표가 예측한 기준이 생존했다」 — 기준이 명시적으로 금지한 두 방향 모두다.

**run 의 프레이밍을 그대로 받지 않는다.** run-done §5 는 이것을 「방어 구멍은 없으므로 표의 귀속 지도가 부분적으로 틀렸을 뿐」이라 적는다. 방어 구멍이 없다는 결론에는 동의하나, **DoD 는 「구멍이 없다」가 아니라 「정확히 일치한다」를 요구한다.** 그리고 「더 많이 무너져도 실패」라는 절이 존재하는 이유가 바로 지금 관측된 것 — 기준들이 서로 독립이 아니라는 신호 — 을 잡기 위해서다. 다섯 행의 과결합은 문서 결함이 아니라 **기준 설계의 실측 결과**다.

**필요한 처방**: acceptance.md 변이표 13행을 §E.2.4 의 행별 실측으로 교정하고(소유: manager-spec), 교정 후 **「표와 정확히 일치해야 한다」절이 여전히 참인지 재판정**한다. 교정만 하고 절을 그대로 두면 「답에 맞춰 시험지를 고친」 형태가 되므로, 교정본에는 **과결합 다섯 행이 왜 과결합인지**(H·I·J 가 005 를 함께 무너뜨리는 것은 논스 관측 경로를 공유하기 때문 등)를 함께 적어 표를 연역이 아닌 실측 지도로 만든다.

---

### F-04 — [Medium] [차단] F-A8 포인터가 종결되지 않았다

**위치**: `.moai/specs/SPEC-GWAUTH-001/progress.md:173` — `## §E.4 Sync-phase Audit-Ready Signal` / `_<pending sync-phase>_`

`spec.md:410-418` 이 스스로 적는다 — 「소유는 카드 `t15` 에 그대로 있다 … 카드 `t15` 가 닫히는 시점에 F-A8 은 «소유 카드가 닫혔고 후속 소유자가 없는 항목» 이 된다」. `plan.md` §B-7 과 run-done §7-2 가 이를 sync 인계로 올렸고 **「아무것도 하지 않으면 조용히 사라진다」**고 명시했다.

§E.4 는 아직 비어 있다. **지금이 그 「아무것도 하지 않음」이 확정되는 시점이다.**

**필요한 처방**: 카드를 닫기 전에 §E.4 에 둘 중 하나를 기록한다 — (a) 128 상한 도달성의 실측 결과, 또는 (b) 「소유 카드 t15 종료 · 후속 소유자 없음 · 재개하려면 도달성을 먼저 실측할 것」이라는 명시적 고아 선언. (b) 는 30초짜리 기록이며, 이것이 없으면 감사 추적이 끊긴다.

---

### F-05 — [Medium] [비차단] 계획 문서 내부의 자기모순 (M3-5 후반부)

**확립 명령과 출력**: §2.10.

`plan.md:258` 은 `server/src/routes-bots.ts:9-10` 주석 개정을 지시한다. 그러나 `plan.md:23`(PRESERVE)이 `server/src/routes-bots.ts` 를 손대지 않을 목록에 올렸고, `acceptance.md` AC-GWAUTH-014 의 허용 집합에도 그 파일이 없다. **세 문서가 서로 충돌하며, 어느 쪽을 따라도 다른 쪽을 어긴다.**

run 의 판정 — 기계적으로 검증되는 쪽(AC-014)을 따르고 미수행을 기록 — 은 **옳다.** 감사관은 이 이월을 승인한다. 그러나 계획 결함 자체는 남는다.

**필요한 처방**: `plan.md:258` 에 「이 항목의 서버 쪽 절반은 AC-GWAUTH-014 경계와 충돌하므로 수행하지 않는다 — 채널 쪽 `@MX:ANCHOR` 만 착지한다」한 줄을 더해 모순을 닫는다. 실제 코드 편집은 하지 않는다.

---

### F-06 — [Medium] [비차단] 「명세 원본」 코드 블록이 개정되지 않았다

**확립 명령과 출력**: §2.8.

`SPEC-CHANPERM-001/acceptance.md:149` 와 `SPEC-CHANWIRE-001/acceptance.md:162` 가 각각 「**이 블록은 그 코드의 명세 원본이다**」라고 선언하면서, 바로 위의 블록(`:136`·`:89`)은 증명 없는 `welcome` 을 싣는 옛 코드 그대로다. 즉 **명세 원본이라 선언한 자리가 실제 코드와 다르다.**

산문 주석이 차이를 서술하므로 독자가 오독할 위험은 낮다 — 그래서 비차단이다. 그러나 「블록이 원본」이라는 선언과 「블록이 옛것」이라는 사실이 한 파일 안에 공존한다.

**필요한 처방**: 두 코드 블록의 `ws.send(...)` 줄을 실제 착지한 형태(`if (m.type === 'hello') { … proof: proofOf(m.token, m.nonce, 1, 2) … }`)로 교체하거나, 아니면 「이 블록은 그 코드의 명세 원본이다」를 「이 블록은 개정 이전 형태이며, 현재 코드는 아래 설명대로다」로 낮춘다. 둘 중 하나면 족하다.

---

### F-07 — [Low] [비차단] 낡은 줄 인용이 적용되지 않았다

**확립 명령과 출력**: §2.9.

run 이 §E.2.9 ③에 실측한 목록은 **정확하다**(감사관이 `:114`·`:93`·`:54` 세 자리를 표본 재현으로 확인). 목록이 있고 적용만 남았다.

대상: `spec.md` 의 `:105→:114` · `:297→:307` · `:108-117→:126-140` · 하네스 네 자리(`:40→:47` · `:86→:93` · `:47→:54` · `:50,65→:47,106`), `acceptance.md` 의 `transport-auth.test.ts:191-212→:252-273` · `gateway-client.test.ts:86→:97` · `:112→:129`, `plan.md:262-263`·`:274`, 그리고 `spec.md:246` 의 `:136`→`:149` · `:89`→`:162`.

**주의 — 「정정이 스스로 낡은 기록을 남긴다」**: 이 카드의 계획 감사 네 라운드가 연속으로 재현한 부류이며, `plan.md` §B-0 이 [HARD] 전역 재도출 절차를 세운 이유다. **F-01·F-03 의 정정을 먼저 하고, 그 다음에 §B-0 절차로 트리 전체를 한 번에 훑어야 한다** — 순서를 뒤집으면 F-07 을 닫는 편집이 새 인스턴스를 만든다.

---

### F-08 — [Low] [비차단] AC-GWAUTH-009 의 주장 범위

`acceptance.md:285` — 「유효한 증명이 다른 `room_id` 를 인증하지는 않는다」. 이것은 **유효한 증명을 복사만 할 수 있는 상대**에게 참이다. 토큰을 아는 상대(= F-01 의 소켓 위치 상대)는 원하는 `room_id` 로 새 증명을 계산하므로 이 기준을 우회한다. F-02 의 하위 사례이며 별도 처방은 필요 없다 — F-01 의 §5 정정이 이 범위도 함께 바로잡는다.

---

### F-09 — [Low] [비차단] `verifyProof` 가 프레임의 주장을 그대로 쓴다

`channel/src/gateway-client.ts:50` 이 `msg.room_id`·`msg.bot_id` 를 검증 메시지에 그대로 넣는다. 주석이 그 이유를 정확히 적는다 — 채널은 자기가 어느 방에 속하는지 모르므로 비교할 기대값이 없다. **설계상 불가피하며 문서화되어 있다.** 개선 여지(서버가 발급 시점에 방·봇을 채널에 알려 두는 것)는 이 카드 범위 밖이며, 지금 고치라고 권하지 않는다 — 그것은 정확히 「불필요한 방어 코드」 부류다.

---

### F-10 — [Low] [비차단] 린터 부재

**확립 명령과 출력**: §2.11.

이번 변경의 결함이 아니라 저장소의 상태다. 이 카드에서 고칠 일이 아니며, **Gap 으로만 기록한다**(§4-2).

---

### F-11 — [Info] [비차단] §1.2 는 문장 그대로는 거짓이 아니다 — sync 레인 주장의 부분 반박

`spec.md:80` 의 문장은 이렇다.

```
증명을 계산할 수 없는 상대는 게이트를 열지 못하고, 게이트가 열리지 않으면 §1.1 의 세 갈래가 한꺼번에 닫힌다
```

**이것은 조건문이고, 조건문 자체는 참이다.** 증명을 계산할 수 없다면 실제로 세 갈래가 닫힌다. 거짓인 것은 **§1.1 의 상대를 그 전건 안에 넣은 §5 배제표 1행**(F-01)이다.

sync 레인의 질문 1 후반부(「§1.2 의 «세 갈래가 한꺼번에 닫힌다» 도 §1.1 의 상대에 대해 거짓인가」)는 **함의로는 옳고 문언으로는 틀렸다.** 감사관은 문언 층에서 반박하고 함의 층에서 인정한다 — F-01 의 처방이 §1.2 에 한 문장을 더하라고 적은 것은 그 때문이다(문장을 철회하는 것이 아니라 전건이 §1.1 의 상대를 포함하지 않음을 명시).

이 구분을 굳이 적는 이유는 하나다. **§1.2 를 「거짓」이라 적고 통째로 다시 쓰면, 참인 문장을 지우고 그 자리에 새 서술을 넣게 된다** — 이 카드가 네 라운드 연속으로 겪은 「정정이 새 결함을 만든다」의 전형적 형태다.

---

## 7. sync 레인 우선 질문 넷에 대한 답

### 7-1. `spec.md` §5 1행은 거짓인가? §1.2 의 「한꺼번에 닫힌다」는 §1.1 의 상대에 대해 거짓인가?

**§5 1행: 그렇다, 거짓이다 — 반박 시도 넷을 거친 뒤 확인한다.** 세 하위 경우 중 §1.1 프로브의 상대와 루프백 포트 선점은 배제되지 않고(§2.3 재현), 같은 망의 중간자만 배제되나 그 배제의 소유자는 이 SPEC 이 아니라 `SPEC-CHANAUTH-001` REQ-CHANAUTH-010(비루프백 `wss://` 강제)이다. 표는 세 위치를 한 행에 묶어 놓고 그중 하나에만 성립하는 판정을 셋 모두에 적용했다.

**§1.2: 문언 그대로는 거짓이 아니다** (F-11). 참인 조건문이며, 결함은 §5 가 §1.1 의 상대를 그 전건에 넣은 데 있다.

### 7-2. 이 방어가 여전히 배제하는 것은 정확히 무엇인가? 잔여는 비어 있지 않은가?

**정확한 배제 대상**: 「소켓에 프레임을 **쓸** 수 있으나 그 소켓의 `hello` 를 **읽을** 수 없는 상대」.

**그 위치가 실제로 존재하는지 따져 본다.**

| 후보 위치 | 실재하는가 | 근거 |
|---|---|---|
| `ws://` 루프백에서 소켓 종단을 잡은 상대 | 아니다 (읽는다) | 종단이므로 `hello` 를 받는다 — §2.3 |
| 비루프백 중간자 | 아니다 (아무것도 못 한다) | TLS 아래에서 읽기도 쓰기도 못 한다 — 이 SPEC 이전에 이미 닫혀 있었다 |
| 맹목 TCP 주입 (시퀀스 추측) | 실질적으로 아니다 | 루프백에는 적용되지 않고, 비루프백은 TLS 가 막는다 |
| 이전 소켓의 `(nonce, proof)` 쌍을 녹음해 재생하는 상대 | **그렇다 — 배제된다** | 논스가 소켓마다 새로 만들어진다(`gateway-client.ts:78`). 다만 재생하려면 지금 소켓 위치가 필요하고, 그 위치는 새 토큰을 준다 — **잔여가 자기 자신으로 붕괴한다** |

**결론: 적대적 상대에 대한 잔여는 실질적으로 비어 있다.** 이 방어가 실제로 얻은 것은 둘이며, 둘 다 보안 이득이 아니다.

1. **비적대적 오접속 탐지** — 낡은 서버, 다른 방의 게이트웨이, 잘못된 URL 로 붙었을 때 세션이 서지 않고 stderr 한 줄이 남는다. 진짜 무결성 이득이며, 작지 않다.
2. **미래 방어의 절반** — `hello` 가 평문 토큰을 싣지 않게 되는 순간(서버 논스 + 양방향 HMAC) 이 코드는 그대로 유효한 방어가 된다. **지금 이 SPEC 은 상호 인증의 절반만 세웠다** — 서버는 채널의 논스로 자신을 증명하는데, 채널은 비밀을 **건네주는** 방식으로 자신을 증명한다. 비대칭이 F-01 의 뿌리다.

**「이 방어가 명명된 위협 모형에 대해 공허한가」에 대한 답: 사실상 그렇다.** 착지 전 공격자는 아무것도 몰라도 됐고, 착지 후 공격자는 **이미 받은 프레임의 한 필드를 읽으면** 된다. 추가 비용이 0 에 가깝다. 다만 **이 SPEC 이 새 공격면을 연 것은 아니며**(착지 전에는 더 쉬웠다), 변경 자체를 되돌릴 이유는 없다 — 되돌리면 위 이득 둘을 잃고 얻는 것이 없다.

### 7-3. AC-GWAUTH-001~015 중 실제로 문제되는 상대를 재는 것이 있는가? 공허한 기준을 지목하라

**문제되는 상대(= 소켓 위치 상대)를 재는 기준은 하나도 없다.**

- **공허한 다섯**: **AC-GWAUTH-006 · 008 · 009 · 011 · 012.** 전부 `rogueGateway` 의 네 갈래(`omit`/`wrong`/`short`/`other-room`) 위에서 돌며, 그 넷은 「받은 토큰을 읽지 않기로 한 위조자」다(§2.5). 같은 하네스가 `nonce` 와 `request_id` 는 읽는다는 사실이 이 분할에 근거가 없음을 보인다.
- **부분적으로 공허한 하나**: **AC-GWAUTH-005.** 재생 거절은 참을 재지만, 재생 상대가 소켓 위치를 가지면 새 토큰을 받으므로 실질 잔여가 7-2 의 마지막 행처럼 붕괴한다.
- **공허하지 않은 여덟**: **001 · 002 · 003 · 004 · 010 · 013 · 014 · 015.** 서버의 증명 생성, 논스 없는 `hello` 의 하위 호환, 열쇠 유출 없음, `hello` 형식, 거절의 부작용(소켓 닫힘·stderr·stdout 무오염), 양쪽 규칙 합의, 경계, 프레임 통과 충실성 — 전부 위협 모형에 의존하지 않는 성질이다.

**대조로 말하면**: AC-GWAUTH-007(양성)이 「토큰을 아는 상대는 통과한다」를 이미 재고 있고, F-01 은 그 상대가 §1.1 의 상대와 같음을 보인다. 즉 **하네스는 이미 답을 갖고 있었고, 어느 기준도 그것을 결론으로 적지 않았다.**

### 7-4. 심각도와 sync 게이트 차단 여부

**F-01 = Critical, 차단.** 세 근거다.

1. **must-pass 차원 위반** — Security 는 Functionality 와 함께 독립 통과가 요구되는 차원이고, 「명시적으로 선언된 배제 경계가 거짓」은 그 차원의 정의상 통과할 수 없다.
2. **자기 부정** — 이 카드는 「방어가 닫은 것보다 더 많이 닫았다고 적은 SPEC」때문에 생겼고(`spec.md:96`), 같은 문서 §5 가 같은 부류의 문장을 담은 채 닫히려 한다. 카드가 자기 존재 이유를 위반한 채 종료된다.
3. **하류 신뢰** — `SPEC-GWAUTH-001` §5 는 형제 SPEC 들이 「이 층은 닫혔다」고 가정할 근거가 되며, `progress.md` §E.3 `boundary_statement` 로 카드 밖에 전파된다. 거짓 경계는 다음 카드가 방어를 중복으로 세우지 않을 이유가 된다.

**단, 코드 변경은 요구하지 않는다.** F-01 의 처방 (a)는 순수 문서 정정이며 AC-GWAUTH-014 경계를 넘지 않는다. 구현은 옳게 착지했고 되돌릴 이유가 없다 — **틀린 것은 코드가 무엇을 했는지에 대한 서술이지 코드가 아니다.**

**F-02 = High, 차단** — 기준 층이 경계를 재지 않으면 F-01 의 정정이 다음 라운드에 다시 표류한다. 처방(다섯째 갈래 + 기준 하나)이 그 표류를 기계로 막는다. 편집 대상은 허용 집합 안이다.

**F-03 = High, 차단** — DoD 항목의 명시적 미충족이며, run 이 「문서 결함」으로 낮춘 프레이밍을 감사관은 받지 않는다.

**F-04 = Medium, 차단** — 종결 비용이 한 문단이고, 미이행 시 손실이 영구적(포인터 소멸)이므로 차단으로 둔다.

**F-05~F-11 = 비차단** — 전건 보고하되 자동 처방 대상이 아니다. F-07 만은 F-01·F-03 정정 **이후에** §B-0 전역 재도출로 함께 훑기를 권한다.

---

## 8. 재감사 범위 (FAIL 후속)

재감사는 처음부터 다시 하지 않는다. 아래 델타만 잰다.

| 항목 | 확인 방법 |
|---|---|
| F-01 | `spec.md` §5 1행 · §1.2 · `progress.md` §E.2.8·§E.3 `boundary_statement` 판독 |
| F-02 | `transport-auth.test.ts` 에 `'echoed'` 갈래 + 신설 기준 실재 · `npm test` 초록 |
| F-03 | `acceptance.md` 변이표 13행이 `progress.md` §E.2.4 실측과 일치 |
| F-04 | `progress.md` §E.4 에 F-A8 종결 기록 실재 |
| 회귀 | `npm test` exit 0 · `npm run typecheck --workspaces` exit 0 · `git diff --name-only b11bdc5..HEAD` 가 AC-014 집합 안 |

비차단 F-05~F-10 은 재감사 통과 조건이 아니다.

---

## 9. 감사관이 만든 파일 (커밋 금지)

- `.moai/state/verify/t15-sync-audit-npm-test.txt` — §2.1 원문
- `.moai/state/verify/t15-sync-audit-typecheck.txt` — §2.2 원문
- 이 보고서

**소스·SPEC·plan·acceptance 파일은 한 글자도 수정하지 않았다.** `git diff --name-only b11bdc5..HEAD` 가 §2.7 시점과 동일함으로 확인된다.
