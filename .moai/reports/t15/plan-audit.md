# SPEC-GWAUTH-001 계획 감사 보고 (카드 t15)

| 항목 | 값 |
|------|-----|
| 감사 대상 | `.moai/specs/SPEC-GWAUTH-001/` (신규, 미커밋) + 형제 개정 `SPEC-CHANAUTH-001` v0.5.0 · `SPEC-CHANINJECT-001` v0.3.2 (작업 트리) |
| 감사 대상 커밋 | `9a93caa` + 미커밋 작업 트리 (브랜치 `WT-rogue-frame-defense`, 워크트리 `.claude/worktrees/t15`) |
| 감사자 | plan-auditor (독립 감사 — 작성자 추론 맥락 배제, M1 Context Isolation) |
| 반복 회차 | 1 / 3 |
| **판정** | **FAIL** |
| 종합 점수 | **0.67** (Tier M 임계 0.80) |
| 차단 결함 | Critical 4 · High 2 |

> 위임 프롬프트에 실린 작성자 자기 보고(«변이 N 이 분리한다», «55건», «세 자리» 등)는 **감사 근거가 아니라 감사 대상**으로만 읽었다. 전부 코드·테스트·실행으로 다시 쟀다 (M1 Context Isolation).

---

## 1. 주장 (Claim)

**설계의 뼈대는 옳다.** 논스 + HMAC 상호 핸드셰이크는 이 트리에서 실제로 계산 가능하고(§2.3에서 실측), 세 갈래를 한 겹으로 닫는다는 판단도 성립하며, 하향 협상 경로도 만들어지지 않는다. 인계 범위 넷 중 셋은 요구사항으로 정확히 이어졌고, 요구사항·수용 기준 추적성은 빈틈이 없다. 프로브는 실재하고, 그 다섯 줄은 SPEC 인용과 줄 단위로 바이트 일치한다. base 250/250 도 내가 직접 돌려 확인했다.

**그러나 수용 기준 층이 무너져 있다.** 14개 기준 가운데 **여섯 건이 정상 구현에서 통과할 수 없거나(006·008·009·012), 관측 자체가 하네스에 존재하지 않거나(007·013), 하네스가 요구하는 소켓을 구현이 닫아 버려 성립하지 않는다(011).** 이 SPEC 이 세운 방어를 재는 기준은 사실상 006~013 여덟 건인데, 그중 일곱 건이 이 셋 중 하나에 걸린다.

**그리고 이 카드가 막겠다고 선언한 두 실패 부류가 문서 안에서 그대로 재현됐다.**

- **굵은 변이가 절반을 가린다.** `acceptance.md` §「검증 원칙」 4번은 «`SPEC-CHANAUTH-001` 의 `established` 게이트를 지워도 이 기준들은 통과한다» 고 단언하고, 변이 N 이 그것을 확인한다고 적었다. **`plan.md` §F M3 이 지시한 구현 아래에서 그 단언은 거짓이다** — 증명에 실패한 `welcome` 은 `established` 를 세우지 않으므로, 뒤따르는 프레임을 버리는 주체가 바로 그 `established` 게이트다. 변이 N 은 AC-GWAUTH-006·008·009·011·012 를 함께 무너뜨린다.
- **방어 주장이 위협 모형보다 넓다.** §5 는 «**토큰을 모르는 모든 상대**를 닫는다» 고 적었으나, 증명 열쇠는 평문 토큰이 아니라 **저장된 `token_hash`** 다. 백업·읽기 전용 DB 유출로 해시만 얻은 상대는 토큰을 모르면서 증명을 위조한다. §2.2 의 «해시를 아는 것과 토큰을 아는 것은 동치»·«새 공격면이 아니다» 는 상대가 **DB 쓰기 권한까지 갖는다**는 검증되지 않은 전제 위에 있다. 카드 `t15` 를 만든 실패가 바로 이 부류다.

부수적으로, 형제 문장 «전건 열거»는 최소 6자리를 빠뜨렸고, 자기 개정이 자기 인용을 낡게 만든 자리가 5건, 형제 SPEC 개정 버전 기록이 3자리에서 틀렸다.

---

## 2. 증거 (Evidence)

관측은 전부 이 워크트리(`.claude/worktrees/t15`, `9a93caa` + 미커밋)에서 직접 읽거나 실행했다. 실행할 수 없는 것은 §4 미검증에 적었다.

### 2.1 프로브와 base 실측 — 작성자 주장이 옳다

```
$ diff <(sed -n '/^P1_SAW_HELLO/,/^P1_HISTORY/p' .moai/specs/SPEC-GWAUTH-001/spec.md | sort) \
       <(sort .moai/state/verify/t15-plan/probe.log)
(출력 없음 — 다섯 줄이 집합으로 완전 일치)

$ diff <(sed -n '/^P1_SAW_HELLO/,/^P1_HISTORY/p' .moai/specs/SPEC-GWAUTH-001/spec.md) \
       .moai/state/verify/t15-plan/probe.log
0a1
> P1_ROGUE_READ_REAL_ID="real-42"
3d3
< P1_ROGUE_READ_REAL_ID="real-42"
```

**각 줄은 바이트 단위로 같고, 순서만 다르다** — 로그는 `P1_ROGUE_READ_REAL_ID` 를 `permission_request` 처리 시점에 먼저 쓰고(`probe-rogue-welcome.mts:48`) 나머지 넷을 마지막에 쓴다(`:81-84`). §8 이 그 다섯 줄을 «원문» 이라 부르므로 순서 차이는 L-01 로 든다. 프로브 스크립트 자체는 읽었고, 상대가 토큰을 읽지 않는다는 서술(`:31-32`)과 사람의 진짜 `deny` 를 120ms 뒤에 보내는 서술(`:51`)이 코드와 일치한다.

```
$ npm test
 Test Files  15 passed (15)      Tests  180 passed (180)     # server
 Test Files   5 passed (5)       Tests   70 passed (70)      # channel
```

**base 250/250 은 내가 직접 돌려 확인했다.** `plan.md` §A·`acceptance.md` 품질 게이트의 수치가 맞다.

```
$ grep -o "\bit(" channel/test/gateway-client.test.ts | wc -l      → 16
$ grep -o "\bit(" channel/test/permission-relay.test.ts | wc -l    → 14
$ grep -o "\bit(" channel/test/index-wiring.test.ts | wc -l        → 14
$ grep -o "\bit(" channel/test/transport-auth.test.ts | wc -l      → 11
```

**55 는 옳다** (16+14+14+11). channel 전체 70건 가운데 나머지 15건은 `channel-server.test.ts` 이고 그 파일은 게이트웨이 소켓을 쓰지 않으므로, 55 는 영향 집합의 상한으로도 타당하다.

서버 쪽 비파손 주장도 그대로 맞다. 세 자리를 직접 읽었다.

```
server/test/gateway.test.ts:82    if (msg.type === 'welcome') { resolve({ ws, welcome: msg }); return }
server/test/gateway.test.ts:143   expect([a.welcome.room_id, a.welcome.bot_id, a.welcome.bot_name]).toEqual([roomA, pm, 'pm'])
server/test/web-permission-contract.test.ts:261   expect(welcome).toMatchObject({ type: 'welcome', room_id: roomId })
$ grep -rn "welcome" server/test/ | grep -i "toEqual\|Object.keys"
  → :143 · :144 두 줄뿐 (둘 다 세 필드 배열)
```

프레임 전체를 `toEqual` 로 단언하는 자리가 서버 테스트에 없다. ✅

### 2.2 (C-01) 부정 기준 넷은 정상 구현에서 통과할 수 없다

AC-GWAUTH-006·008·009·012 는 전부 같은 세 줄을 단언한다.

```
await expect(historyPromise).rejects.toThrow(/timed out/)
```

`requestHistory` 의 거부 경로는 둘이고, **둘 다 이 단언을 통과시키지 못한다.**

```
channel/src/gateway-client.ts:104-107
  const timer = setTimeout(() => { pending.delete(rid)
    reject(new Error(`history request ${rid} timed out after ${HISTORY_TIMEOUT_MS}ms`)) }, HISTORY_TIMEOUT_MS)
channel/src/gateway-client.ts:109-113
  if (!send({ type: 'history_request', rid, ...params })) { …
    reject(new Error('gateway client is not connected')) }
channel/src/gateway-client.ts:27
  const HISTORY_TIMEOUT_MS = 10_000
```

- **소켓이 이미 닫힌 경우** — REQ-GWAUTH-008 이 «거절하면 소켓을 닫아라» 를 명령하고 `plan.md` §F M3-3 이 `ws.close()` 로 구현하라고 지시한다. 그러면 `send()` 가 `false` 를 돌려주고(`:47` `readyState !== OPEN`) 거부 메시지는 **`gateway client is not connected`** 다. `/timed out/` 에 걸리지 않는다.
- **소켓이 아직 열려 있는 경우** — 10,000ms 를 기다려야 타임아웃 거부가 난다. `channel/vitest.config.ts` 에 `testTimeout` 설정이 없어 **vitest 기본 5,000ms** 이고, 이 네 기준에는 `{ timeout: 20000 }` 이 붙어 있지 않다(붙은 것은 005·011 둘뿐 — `acceptance.md` §「검증 원칙」 5번이 명시). 테스트가 먼저 죽는다.

형제 SPEC 이 같은 자리를 어떻게 피했는지가 대조 증거다. `transport-auth.test.ts:191-201` (AC-CHANAUTH-003)은 **약속을 await 하지 않고** `settled` 센티넬 + `settle()` 400ms 로 잰다.

```ts
let settled: 'pending' | 'resolved' | 'rejected' = 'pending'
const p = gw.requestHistory({ limit: 10 })
p.then(() => { settled = 'resolved' }, () => { settled = 'rejected' })
…
await settle()
expect(settled).toBe('pending')
```

**이 SPEC 은 그 형태를 버리고 10초 거부를 직접 기다리는 형태로 되돌아갔다.** `acceptance.md` §「검증 원칙」 5번이 «정상 구현을 거짓 실패시키지 않는다» 를 표제로 걸고도 그 절이 스스로 든 두 위험(부정 관측 대기·재접속 타임아웃) 가운데 이 세 번째를 놓쳤다.

### 2.3 (C-02) 굵은 변이 분리 주장이 성립하지 않는다

`acceptance.md` §「검증 원칙」 4번의 단언:

> 이 SPEC 의 부정 기준(AC-GWAUTH-006·008·009·011)에 쓰이는 스텁은 **언제나 `welcome` 을 보낸다.** 따라서 `SPEC-CHANAUTH-001` 의 게이트(`} else if (!established) {`)를 지워도 이 기준들은 통과한다 — 그 게이트는 `welcome` 이 온 이 상황에서 이미 열려 있기 때문이다.

이 추론은 **현행 구현**에서만 참이다. 현행에서는 `welcome` 이 오면 무조건 `established = true` 가 된다.

```
channel/src/gateway-client.ts:68-73
  if (msg.type === 'welcome') {
    established = true
    opts.onWelcome?.(msg)
  } else if (!established) {
    // welcome 전에 온 message·verdict·history_response 는 어떤 콜백에도 넘기지 않고 버린다
  } else if (msg.type === 'message') opts.onMessage?.(msg)
```

`plan.md` §F M3-3 이 지시한 구현은 이 관계를 뒤집는다.

> `welcome` 갈래를 고친다 — **증명 대조를 통과할 때만 `established = true`** 와 `onWelcome`. 실패하면 `ws.close()` + `console.error` 한 줄.

즉 착지 후에는 **증명에 실패한 `welcome` 을 받은 소켓에서 `established` 가 `false` 로 남는다.** 그 소켓으로 도착하는 `message`·`permission_verdict`·`history_response` 를 콜백에 넘기지 않는 주체는 — 소켓 닫기가 프레임 디스패치를 앞지르지 못하는 한 — **정확히 `} else if (!established) {` 그 줄이다.** 변이 N(`!established` → `false`)을 넣으면 그 프레임들이 `onMessage`·`onVerdict`·대기 맵으로 흘러가고, AC-GWAUTH-006·008·009·011·012 가 함께 붉어진다.

**따라서 `acceptance.md` 품질 게이트의 «변이 N 이 AC-GWAUTH-* 를 하나도 무너뜨리지 않는지 관측한다 — 이 확인이 이 카드의 굵은-변이 방어다» 와 `Definition of Done` 의 같은 항목은 통과할 수 없다.** 그리고 그 귀결로, 이 SPEC 의 부정 기준 다섯 건은 **t9 의 게이트와 t15 의 게이트를 구분하지 못한다** — 둘 중 어느 쪽을 지워도 같은 다섯이 무너지므로, 실패가 어느 방어의 부재를 뜻하는지 귀속할 수 없다. 이것이 카드 `t15` 문서가 스스로 «설계로 없앤다» 고 선언한 바로 그 결함 부류다.

REQ-GWAUTH-011 의 §4.4 주석 — «`SPEC-CHANAUTH-001` REQ-CHANAUTH-001 과 같은 문장이지만 **적용 범위가 다르다**» — 도 같은 오류를 담고 있다. 문장이 같은 이유는 범위가 달라서가 아니라 **강제 지점이 하나이기 때문**이다.

### 2.4 (C-03) 경계 진술이 열쇠의 실제 성질보다 넓다

증명 열쇠는 §2.2 가 정확히 실측한 대로 **저장된 해시**다. 나도 직접 확인했다.

```
server/src/routes-bots.ts:11-13   export function sha256Hex(s) { return createHash('sha256').update(s).digest('hex') }
server/src/routes-bots.ts:63-64   const token = randomBytes(32).toString('hex')
                                  INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?,?,?)  ← sha256Hex(token)
server/src/gateway.ts:93          ).get(sha256Hex(String(token ?? '')))
```

**서버가 평문을 저장하지 않는다는 판단은 옳고, 양쪽이 같은 값에 도달한다는 것도 옳다.** 설계는 계산 가능하다.

그런데 §5 는 이렇게 적었다.

> - **닫는다**: 루프백 포트 선점 …, 그리고 **토큰을 모르는 모든 상대**.
> - **닫지 않는다**: **토큰이 유출된 배치와, 인증서는 유효하지만 서버 자신이 손상된 배치.**

**두 줄이 실제 경계를 가르지 못한다.** 증명을 위조하는 데 필요한 것은 토큰이 아니라 `token_hash` 다. DB 백업, 읽기 전용 SQL 주입, 파일 시스템 접근으로 `bot_tokens.token_hash` 만 얻은 상대는 **토큰을 모르면서** 유효한 `proof` 를 만들어 게이트를 연다. 그 상대는 §5 의 «닫는다» 줄에 들어가 있고 «닫지 않는다» 줄 어디에도 없다.

§2.2 가 이 자리를 다루긴 한다.

> 해시는 토큰의 결정적 함수이므로 «해시를 아는 것» 과 «토큰을 아는 것» 은 이 시스템에서 동치이고 … DB 읽기 권한을 가진 상대가 증명을 위조할 수 있다는 것은 사실이지만, **그 상대는 토큰을 새로 발급할 수도 있으므로 새 공격면이 아니다.**

- «동치» 는 한 방향으로만 참이다. 토큰 → 해시는 자명하고, 해시 → 토큰은 256비트 역상 문제다. **해시 보유자는 토큰 보유자보다 약한 지식을 가지고도 증명 위조에는 충분하다** — 그것이 이 설계에서 유의미한 비대칭이다.
- «토큰을 새로 발급할 수도 있다» 는 상대가 **DB 쓰기 권한**을 가진다는 전제다. 그 전제는 이 문서 어디에도 세워지지 않았고 관측되지도 않았다. 읽기만 얻은 상대에게는 성립하지 않는다.

착지 전후를 비교하면 «새 공격면» 은 아니다(착지 전에는 **아무나** 게이트웨이를 사칭할 수 있었으므로). 그러나 **§5 가 주장하는 것은 그 비교가 아니라 «무엇이 닫혔는가» 이고, 그 주장이 실제보다 넓다.** 정확한 진술은 «토큰 **또는 그 저장 해시**를 모르는 상대를 배제했다» 다.

§1.3 «토큰을 아는 상대는 곧 게이트웨이다», §5 «정확한 진술은 «토큰을 모르는 상대를 배제했다» 다» 도 같은 정정이 필요하다.

### 2.5 (C-04) `onWelcome` 을 재는 두 기준의 관측 지점이 하네스에 없다

AC-GWAUTH-007 의 Then: «`onWelcome` 이 정확히 1회 호출되고 그 인자가 스텁이 보낸 프레임 객체와 `toEqual` 로 같으며»
AC-GWAUTH-013 의 Then: «`onWelcome` 이 1회 호출되고»

두 기준의 하네스는 `acceptance.md` 「공통 테스트 하네스」 표대로 `wire()` 다. **`wire()` 는 `onWelcome` 을 배선하지 않는다.**

```
channel/src/index.ts:41    export function wire(opts: WireOpts): { channel; gw } {
channel/src/index.ts:43-58   createGatewayClient({ url, token, onMessage: …, onVerdict: … })
                             ← onWelcome 없음
channel/test/transport-auth.test.ts:77   const { channel, gw } = wire({ url: …, token: 'tok' })
```

이 사실은 이 SPEC 자신이 §2.3·§5 에서 근거로 쓴 것이기도 하다 — «`bot_name` 은 채널이 소비하지 않고(`wire()` 는 `onWelcome` 을 배선하지 않는다)». **그 같은 사실이 AC-GWAUTH-007·013 을 관측 불가로 만든다.**

그리고 `plan.md` §A PRESERVE 목록이 `channel/src/index.ts … wire 배선` 을 손대지 말라고 명시하므로, 하네스를 고쳐 `onWelcome` 을 노출하는 우회는 범위 위반이다. 남는 길은 `createGatewayClient` 를 직접 쓰는 것인데 — AC-013 은 «`wire()` 로 실제 채널을 붙인다. **스텁도 흉내도 없다**» 를 기준의 본체로 삼고 있어 그 우회가 기준을 훼손한다.

귀결이 무겁다. AC-GWAUTH-007 은 006 의 **양성 짝**이고(«이 기준이 없으면 모든 welcome 을 거절하는 구현이 006 을 통과한다»), AC-GWAUTH-013 은 §3.5 가 «해시 규칙 분기의 **유일한** 관측» 으로 지목한 기준이다. 둘이 함께 흔들리면 이 SPEC 의 양성/음성 짝 구조와 워크스페이스 간 정합성 관측이 동시에 빈다.

### 2.6 (H-01) «전건 열거» 가 형제 문장 최소 6자리를 빠뜨렸다

`spec.md` §3.3 의 제목은 «이 SPEC 이 착지하면 거짓이 되는 형제 문장 — **전건 열거**» 이고, B 부류로 `SPEC-CHANCLIENT-001` 세 자리 + `SPEC-GATEWAY-001` 한 자리를 든다. `SPEC-CHANCLIENT-001/spec.md` 를 직접 훑은 결과 **표에 없는 자리가 더 있다.**

| 위치 | 현재 문장 | 착지 후 |
|---|---|---|
| `spec.md:42` | `connect → open → { type:'hello', token }  → 서버가 welcome 으로 답한다` (§1 흐름도) | 필드 열거가 불완전해진다 |
| `spec.md:62` | 용어표 `handshake` — «클라이언트가 보내는 `{ type:'hello', token }` 한 프레임과, 서버가 답하는 `welcome` 한 프레임» | 같음 |
| `spec.md:92` | **API 표면의 타입 선언** `onWelcome?: (w: { room_id: number; bot_id: number; bot_name: string }) => void` | `welcome` 이 `proof`·`missed_after_id` 를 싣고 REQ-CHANCLIENT-003 이 «프레임 객체 그대로» 를 명령하므로, 이 시그니처가 실제 인자와 어긋난다 |
| `spec.md:129` | «게이트웨이의 `welcome` 은 `room_id`·`bot_id`·`bot_name` 외에 재전송 커서 `missed_after_id` 를 함께 싣는다» | 열거가 불완전해진다 |
| `spec.md:230` | «그리고 게이팅이 서도 **상대 인증은 여전히 없다.** `welcome` 프레임에는 토큰 지식의 증거가 없으므로…» | 현재형으로 거짓 |
| `progress.md:352` | «본 SPEC §5 v0.5.0 이 분해해 둔 F-01 잔여 두 층 가운데 **상대 신원 층은 닫히지 않았다**» | 현재형으로 거짓 |

앞의 넷은 B 부류(계약 개정 필요)와 같은 성질이고, 뒤의 둘은 C 부류(정직성 기록)로 볼 여지가 있다. 어느 쪽이든 **표에 없다.** `spec.md:92` 는 특히 무겁다 — 산문이 아니라 이 SPEC 이 개정 대상으로 지목한 §4.1 의 **타입 선언**이며, `channel/src/gateway-client.ts:13` 의 실제 시그니처와 짝을 이룬다.

같은 결함이 §3.3 C 부류에도 있다. C 부류는 «`SPEC-CHANPERM-001`·`SPEC-CHANWIRE-001`·`SPEC-CHANNEL-001`·`SPEC-CHANCLIENT-001` 의 … **다섯 줄**» 로 셌으나, 실측은 그보다 많다.

```
$ grep -rn 't15' .moai/specs/ --include='*.md' | grep -v SPEC-GWAUTH-001 | wc -l   → 44
```

44 줄 전부가 거짓이 되는 것은 아니지만, 그 안에 **§3.3 이 다루지 않은 거짓 문장 부류가 하나 더 있다** — M-04 를 보라.

### 2.7 (H-02) AC-GWAUTH-011 의 1단계가 성립하지 않는다

AC-GWAUTH-011 의 Given/When:

> 1단계는 **증명 없는** `welcome` 으로 답한다(위조 상대). 붙인 뒤 세션이 `request_id: 'real-42'` 로 승인 요청을 발신한다 — **스텁은 나가는 `permission_request` 에서 그 id 를 읽는다.**

증명 없는 `welcome` 을 보낸 직후 채널은 REQ-GWAUTH-008 에 따라 **그 소켓을 닫는다.** 그 뒤 세션이 승인 요청을 발신하면 `wire()` 의 `sendPermissionRequest` → `gw.send()` 가 `readyState !== OPEN` 으로 **`false` 를 돌려주고 프레임이 나가지 않는다**(`gateway-client.ts:46-49`). 스텁이 «나가는 `permission_request` 에서 id 를 읽는» 단계가 실행되지 않는다.

발신 집합에는 id 가 그대로 들어간다 — `emitted.add` 는 소켓 상태를 보지 않는다(`channel-server.ts:157`). 따라서 2단계의 진짜 `deny` 는 중계된다. 즉 **Then 의 최종 단언은 우연히 통과할 수 있으나, 기준의 본체라고 적힌 «위조가 먼저 도착한다» 는 상황이 재현되지 않는다.** «순서가 이 기준의 본체다» 라고 적어 놓고 그 순서가 성립하지 않는 하네스다.

같은 이유로 AC-GWAUTH-006 의 ②③(«세션이 발신한 `permission_request` 에서 읽은 진짜 `request_id`», «나가는 `history_request` 의 `rid`»)도 재현 경로가 끊긴다.

### 2.8 (M-01) «해시 규칙이 세 자리» 는 실측과 다르다

```
$ grep -rn "sha256Hex\|createHash" server/src/ channel/src/
server/src/routes-bots.ts:3   import { createHash, randomBytes } from 'node:crypto'
server/src/routes-bots.ts:11  export function sha256Hex(s: string): string {
server/src/routes-bots.ts:12    return createHash('sha256').update(s).digest('hex')
server/src/routes-bots.ts:64    … .run(roomId, bot.id, sha256Hex(token))
server/src/gateway.ts:7       import { sha256Hex } from './routes-bots.js'
server/src/gateway.ts:93      ).get(sha256Hex(String(token ?? '')))
```

**`gateway.ts:93` 은 규칙의 사본이 아니라 호출 지점이다** — `routes-bots.js` 에서 `sha256Hex` 를 import 한다. 서버 쪽 해시 규칙은 **한 자리**에 있고, `routes-bots.ts:9-10` 의 `@MX:ANCHOR` 가 지키는 것이 정확히 그 사실이다. 착지 후의 실제 생산 코드 사본은 **둘**(서버 공유 함수 · 채널 사본)이지 셋이 아니다.

이 오류는 완화책을 잘못 겨눈다 — §3.5 완화 2(«채널·서버 양쪽 코드에 상호 참조 주석을 달아 **세 자리**를 서로 가리키게 한다», `plan.md` §F M3-5)는 존재하지 않는 셋째 생산 자리를 전제한다. 한편 **진짜 증식은 테스트 쪽**이다: `acceptance.md` 가 서버·채널 기준에 `keyOf`/`proofOf` 를 «각각» 정의하라 하고 스텁 네 자리가 증명을 계산하게 되므로 사본이 여섯 이상 생긴다. 그 위험은 「잔여 위험」이 언급하지만 §3.5 의 완화 셋은 그 자리를 겨누지 않는다.

**분기 관측 가능성 자체는 성립한다** — 서버 함수와 채널 사본이 갈라지면 AC-GWAUTH-013 이 잡는다. 다만 그 AC 가 C-04 로 흔들린다.

### 2.9 (M-02·M-03·M-04) 정정이 스스로 낡은 기록을 남겼다

**M-02 — 형제 개정 버전 기록 3자리가 틀렸다.** 실제 개정은 `0.3.1 → 0.3.2` 다.

```
$ git diff .moai/specs/SPEC-CHANINJECT-001/spec.md | grep '^[-+]version'
-version: "0.3.1"
+version: "0.3.2"

$ grep -n 'v0\.2\.0' .moai/specs/SPEC-GWAUTH-001/*.md
spec.md:202      | A | `SPEC-CHANINJECT-001/spec.md:465` … | **개정함** (v0.2.0) |
spec.md:373      - …:465 — §5 «전송 계층 상대의 신원» 절 (v0.2.0 에서 이 SPEC 을 가리키도록 개정)
progress.md:27   - "SPEC-CHANINJECT-001 v0.2.0 — §5:465 인계 절 동일 개정"
```

세 자리 모두 `v0.3.2` 여야 한다. (`SPEC-CHANAUTH-001` v0.5.0 기록은 맞다.)

**M-03 — 자기 개정이 자기 줄 번호 인용을 깨뜨렸다.** 이 패스의 CHANINJECT 개정이 HISTORY 1행 + §5 블록인용 2행을 더해 이후 줄이 밀렸다.

```
$ git show HEAD:.moai/specs/SPEC-CHANINJECT-001/spec.md | grep -n '전송 계층 상대의 신원'
465:### Out of Scope — 전송 계층 상대의 신원 (카드 `t15`)
$ grep -n '전송 계층 상대의 신원' .moai/specs/SPEC-CHANINJECT-001/spec.md
466:### Out of Scope — 전송 계층 상대의 신원 (`SPEC-GWAUTH-001` / 카드 `t15` 소유)
$ sed -n '465p;471p' .moai/specs/SPEC-CHANINJECT-001/spec.md
(둘 다 빈 줄)
```

`:465` 인용 3자리(`spec.md:202`·`spec.md:373`·`plan.md:216`)와 `:471` 인용 2자리(`spec.md:383`·`plan.md:56`)가 **전부 빈 줄 또는 무관한 줄을 가리킨다.** 실제 값은 466 과 474 다. 작성자가 «개정 후 grep 으로 훑었다» 고 보고한 그 훑기가 자기 인용은 훑지 않았다.

**M-04 — F-A8 소유 문장 최소 9자리가 거짓이 됐고 §3.3 이 다루지 않는다.** 이 패스는 F-A8 을 «`SPEC-GWAUTH-001` §5 가 명시적으로 범위 밖에 두었다» 로 갈라 적었다. 그러면 «F-A8 은 카드 `t15` 소유» 라고 적은 형제 줄들이 **소유자 없는 항목을 소유자 있는 것처럼 적은 상태**가 된다 — 이 개정이 스스로 «하지 않기 위해» 라고 밝힌 바로 그 상태다.

```
.moai/specs/SPEC-CHANAUTH-001/spec.md:392        … F-A8(카드 `t15`)
.moai/specs/SPEC-CHANAUTH-001/progress.md:763    "F-A8 … 사칭 채팅 경로와 한 몸이므로 t15 소유"
.moai/specs/SPEC-CHANAUTH-001/progress.md:768    scope: "… F-A8 도 이 카드"
.moai/specs/SPEC-CHANINJECT-001/spec.md:535      … F-A1·F-A2·F-A8 (카드 `t15` 소유, 범위 밖)
.moai/specs/SPEC-CHANINJECT-001/spec.md:546      칸반 카드 `t15` — …(… · F-A8) 소유 카드
.moai/specs/SPEC-CHANINJECT-001/progress.md:13, :77, :531-532
.moai/specs/SPEC-CHANCLIENT-001/spec.md:235      … 선착 판정 승리, F-A8. **카드 `t15`** 소유
```

§3.3 C 부류 행은 «`progress.md`/`§5` 에 흩어진 «잔여는 카드 `t15` 소유» 다섯 줄» 만 든다. **F-A8 부류는 그 행에 들어 있지 않고, 이 개정이 만들어 낸 새 거짓이다.** 개정한 CHANINJECT §5 셋째 줄 자체도 «사칭 채팅 경로와 한 몸이므로 `t15` 소유 → **범위 밖에 두었다**» 라는 자기모순 문장으로 남았다.

또 `spec.md:392` 는 §8 참조 목록이지 §5 가 아니다. 그런데 `spec.md` §5 는 «`SPEC-CHANAUTH-001` §5 가 **이 항목도 `t15` 소유로 적었다**» 고 적었다 — F-A8 을 `t15` 소유로 적은 곳은 `SPEC-CHANINJECT-001` §5 와 `SPEC-CHANAUTH-001` **§8**·`progress.md` 이고, `SPEC-CHANAUTH-001` §5 에는 F-A8 이 한 번도 나오지 않는다(`grep -n 'F-A8' … CHANAUTH/spec.md` → `392` 한 줄뿐). 인계 출처 오귀속이다.

### 2.10 (M-05) 인계 항목 넷 가운데 둘의 처리가 원문과 어긋난다

원문 네 줄(`git show HEAD:…SPEC-CHANAUTH-001/spec.md` §5)을 항목별로 대조했다.

| # | 인계 원문 | 이 SPEC 의 처리 | 판정 |
|---|---|---|---|
| 1 | `welcome` 의 위조 불가능화(서버 쪽 챌린지·논스·서명) 또는 그에 준하는 상대 신원 확보 | REQ-GWAUTH-001·002·003·006·007·008·009 | **닫힘** — 설계가 그 요구를 정확히 이행한다 |
| 2 | 인증된-그러나-적대적 전송, 그리고 루프백 포트 선점 상황에서의 **채팅 본문·이력 신뢰 경계** | 루프백 → REQ-GWAUTH-011. 인증된-그러나-적대적 → 범위 밖, «**어느 카드도 소유하지 않는다**» | **부분 · 모순** (아래) |
| 3 | 판정 주입의 잔여 절반 | REQ-GWAUTH-012 (+ 011) | **닫힘** |
| 4 | 감사 F-02·F-03·F-04 와의 **통합 판단** — 같은 층의 문제이므로 **한 카드에서 함께 본다** | «`SPEC-CHANINJECT-001`(카드 `t10`)이 이미 소유·착지했다» | **미이행** (아래) |

- **②의 모순.** `SPEC-CHANAUTH-001` §5 개정본은 «인증된-그러나-적대적 전송 … 은 **어느 카드도 소유하지 않는다**» 로 적었는데, `SPEC-GWAUTH-001` §5 는 같은 대상의 내용 층을 «`SPEC-CHANINJECT-001` / 카드 `t10` 소유 … 이미 착지했으며» 로 적는다. **한 패스에서 쓴 두 문서가 같은 잔여의 소유자를 다르게 말한다.** 원문이 요구한 «채팅 본문·이력 신뢰 경계» 는 내용 층이므로 후자가 맞고, CHANAUTH 개정의 «어느 카드도 소유하지 않는다» 가 과잉 고아화다.
- **④의 미이행.** 원문은 «통합 **판단**» 을 요구했다 — 한 카드에서 함께 보라는 뜻이다. 이 SPEC 은 판단을 수행하지 않고 «t10 이 이미 소유했다» 로 소유자를 재지정한 뒤 §5 에서 층 경계 한 문단으로 대신했다. 그 경계 서술 자체는 타당하나(«누가 말하는가» 대 «무엇이 말해지는가»), **원문이 요구한 통합 판단은 이루어지지 않았고 그 사실이 어디에도 적히지 않았다.** 덧붙여 «이미 … 착지했다» 는 `SPEC-CHANINJECT-001` frontmatter 가 `status: in-progress` (`progress.md:15` — «마감 정리 중»)인 상태와 어긋난다. 코드는 착지했으므로(내 실행에서 channel 70/70) 완전한 거짓은 아니나, 완료 상태를 앞당겨 적었다.

### 2.11 하향 협상 · 논스 수명 — 이 두 자리는 성립한다

- **하향 협상 경로 없음.** REQ-GWAUTH-004 가 서버를 관대하게 두지만, 채널은 REQ-GWAUTH-001 로 **항상** 논스를 싣고 REQ-GWAUTH-006·008 로 **항상** 증명을 요구한다. 증명 없는 `welcome` 은 논스 유무와 무관하게 거절되므로, 공격자가 «논스 없는 hello» 를 흉내 내 증명을 생략할 경로가 없다. `plan.md` §D-3 의 «거절 결정은 보호받는 쪽이 내린다» 는 논증이 옳다. ✅
- **논스의 소켓 지역성이 요구되고 실제로 측정된다.** REQ-GWAUTH-002 가 클로저 상승을 금지하고, AC-GWAUTH-005 가 `nonce2 ≠ nonce1` 과 **재생 증명 거절**을 함께 잰다. `gateway-client.ts:56-58` 의 기존 경고 주석과 짝이 맞고, `notes` 축을 함께 재는 이유(발신 집합 대조가 판정 축을 먼저 버린다)도 정확하다. ✅ 다만 AC-005 는 실제 백오프 1,000ms 를 두 번 이상 지나며 `{ timeout: 20000 }` 을 갖고 있어, C-01 의 타임아웃 부류에는 걸리지 않는다.

### 2.12 구조 검사 — 전부 통과

```
$ grep -o 'REQ-GWAUTH-[0-9]*' spec.md | sort -u        → 001..013, 결번·중복 없음 (13건)
$ grep -o 'AC-GWAUTH-[0-9]*' acceptance.md | sort -u    → 001..014, 결번·중복 없음 (14건)
$ grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-GWAUTH-001/   → 없음
$ grep -n '^### Out of Scope' spec.md                   → 7개 절, 각 절에 구체 항목 bullet 존재
```

- **추적성 완전.** 매트릭스대로 REQ 13건이 전부 최소 1개 AC 로 덮이고(001→AC-004, 002→005, 003→001·009·013, 004→002, 005→003, 006→006·008, 007→007·009·013, 008→010, 009→012, 010→012, 011→006, 012→011, 013→014), 고아 AC 는 없다.
- **Tier M 상한.** REQ 13 / AC 14 ≤ 16 / 16. ✅
- **frontmatter.** 12개 정본 필드 + `tier: M` 전부 존재, 타입 정상.
- **GEARS 타이핑.** 13건 모두 패턴을 갖는다. 다만 REQ-GWAUTH-002 는 «Unwanted» 로 라벨링됐으나 앞 절이 긍정 shall 이고(복합), REQ-GWAUTH-009 는 요구사항 본문이 구현 함수명(`timingSafeEqual`·`===`·`Buffer.compare`)을 규정한다 — L-04.

---

## 3. 발견 (Findings)

| # | 위치 | 내용 | 심각도 | 분류 |
|---|---|---|---|---|
| **C-01** | `acceptance.md` AC-GWAUTH-006·008·009·012 | `rejects.toThrow(/timed out/)` 가 정상 구현에서 통과 불가 — 소켓이 닫히면 메시지가 `gateway client is not connected`(`gateway-client.ts:113`), 열려 있으면 10,000ms 로 vitest 기본 5,000ms 를 초과. 두 기준만 `{timeout:20000}` 을 가졌고 이 넷은 없다 | **Critical** | blocking |
| **C-02** | `acceptance.md` §「검증 원칙」4 · 품질 게이트 변이 N · `Definition of Done` | 굵은-변이 분리 주장이 `plan.md` §F M3-3 구현 아래에서 거짓. 증명 실패 시 `established=false` 로 남으므로 프레임 차단 주체가 t9 의 `} else if (!established) {` 이고, 변이 N 이 AC-GWAUTH-006·008·009·011·012 를 함께 무너뜨린다. 부정 기준이 두 방어를 구분하지 못한다 | **Critical** | blocking |
| **C-03** | `spec.md` §5 «닫는다» 줄 · §1.3 · §2.2 · §7 서술 | «토큰을 모르는 **모든** 상대» 를 닫는다는 진술이 실제보다 넓다 — 열쇠는 `token_hash` 이고, 읽기 전용 해시 유출 보유자는 토큰 없이 증명을 위조한다. «해시와 토큰은 동치»(한 방향만 참) · «새 공격면이 아니다»(DB 쓰기 권한 전제, 미검증) | **Critical** | blocking |
| **C-04** | `acceptance.md` AC-GWAUTH-007 · AC-GWAUTH-013 | `onWelcome` 호출을 단언하나 지정 하네스 `wire()`(`channel/src/index.ts:41-58`)가 `onWelcome` 을 배선하지 않는다. `plan.md` §A PRESERVE 가 그 배선 수정을 금지 → 006 의 양성 짝과 §3.5 의 «유일한» 워크스페이스 간 관측이 동시에 성립 불가 | **Critical** | blocking |
| **H-01** | `spec.md` §3.3 «전건 열거» | `SPEC-CHANCLIENT-001` 의 `spec.md:42`·`:62`·**`:92`(onWelcome 타입 선언)**·`:129`·`:230`·`progress.md:352` 가 표에 없다. §3.3 이 스스로 «전건» 을 표방한다 | **High** | blocking |
| **H-02** | `acceptance.md` AC-GWAUTH-011 (그리고 006 의 ②③) | 1단계 스텁이 «나가는 `permission_request` 에서 진짜 id 를 읽는» 단계가, REQ-GWAUTH-008 이 소켓을 닫으므로 실행되지 않는다(`gateway-client.ts:46-49`). «순서가 이 기준의 본체다» 라고 적은 그 순서가 재현되지 않는다 | **High** | blocking |
| **M-01** | `spec.md` §2.2·§3.5 · `plan.md` §F M3-5 | «해시 규칙이 세 자리» 는 실측과 다르다 — `gateway.ts:7` 이 `sha256Hex` 를 import 하므로 서버 쪽은 한 자리. 완화 2(세 자리 상호 참조 주석)가 존재하지 않는 자리를 겨눈다. 진짜 증식은 테스트 사본 6곳 | Medium | blocking |
| **M-02** | `spec.md:202` · `spec.md:373` · `progress.md:27` | `SPEC-CHANINJECT-001` 개정 버전을 `v0.2.0` 으로 기록. 실제는 **v0.3.2**(`0.3.1 → 0.3.2`) | Medium | blocking |
| **M-03** | `spec.md:202`·`:373`·`:383` · `plan.md:56`·`:216` | 자기 개정이 줄을 밀어 `:465`·`:471` 인용 5자리가 전부 빈 줄/무관한 줄을 가리킨다. 실제는 466 · 474 | Medium | blocking |
| **M-04** | `spec.md` §3.3 C 부류 · `spec.md` §5 F-A8 절 · 형제 9자리 | F-A8 을 범위 밖으로 옮기면서 «F-A8 은 `t15` 소유» 형제 문장 9자리를 훑지 않았다(CHANAUTH `spec.md:392`·`progress.md:763,768`, CHANINJECT `spec.md:535,546`·`progress.md:13,77,531-532`, CHANCLIENT `spec.md:235`). 개정한 CHANINJECT §5 셋째 줄 자체가 «t15 소유 → 범위 밖» 자기모순. 또 «`SPEC-CHANAUTH-001` §5 가 이 항목도 t15 소유로 적었다» 는 오귀속 — 그 §5 에 F-A8 은 없다(§8 과 progress.md 에만 있다) | Medium | blocking |
| **M-05** | `spec.md` §5 · `SPEC-CHANAUTH-001` §5 개정본 | 인계 ②의 소유자를 두 문서가 다르게 말한다(«어느 카드도 소유하지 않는다» vs «`SPEC-CHANINJECT-001`/t10 소유»). 인계 ④ «통합 판단» 은 수행되지 않고 소유자 재지정으로 대체됐으며 그 사실이 기록되지 않았다. «이미 착지했다» 는 `status: in-progress` 와 어긋난다 | Medium | blocking |
| **L-01** | `spec.md` §1.1 · §8 | 프로브 다섯 줄을 «원문» 이라 부르며 인용했으나 순서가 다르다(`P1_ROGUE_READ_REAL_ID` 가 1행 → 3행). 각 줄 내용은 바이트 일치 | Low | optional |
| **L-02** | `spec.md` §3.2 붕괴 표 | AC-CHANCLIENT-002 의 위치를 `gateway-client.test.ts:288-...` 로 적었으나 실제는 `:108-117`. `:288` 은 AC-CHANCLIENT-011 구역 | Low | optional |
| **L-03** | `plan.md` §D-3 · `spec.md` REQ-GWAUTH-004 근거 | «`server/test/` 의 5개 파일이 논스 없이 hello 를 보낸다» — 실측 **4개**(`gateway`·`permissions`·`room-members`·`web-permission-contract`). `sse.test.ts` 는 `hello` 를 보내지 않는다. `spec.md` 는 그 목록의 출처를 §3.2 로 적었으나 §3.2 에 없다 | Low | optional |
| **L-04** | `spec.md` REQ-GWAUTH-002 · 009 | 002 는 «Unwanted» 라벨이나 앞 절이 긍정 shall(복합). 009 는 요구사항 본문이 구현 함수명(`timingSafeEqual`·`===`·`Buffer.compare`)을 규정 — WHAT 이 아니라 HOW | Low | optional |
| **L-05** | `plan.md` §A PRESERVE · git diff | PRESERVE 는 CHANAUTH 를 «§5 인계 절 이외 전부» 보존이라 적었으나 diff 는 frontmatter·HISTORY·§8 도 건드린다. 또 `SPEC-CHANINJECT-001` 은 다른 레인(t10/t16)이 마감 정리 중인 `in-progress` 문서인데 이 레인이 버전을 올렸다 | Low | optional |

---

## 4. 미검증 (Gaps)

아래는 **관측하지 못했다.** 통과로 간주하지 않았다.

- **변이표 A~M·N 의 실제 대응.** 구현이 존재하지 않으므로 실행으로 재지 못했다. C-02 는 `plan.md` §F M3-3 이 지시한 구현과 현행 `gateway-client.ts:68-73` 구조로부터의 **연역**이며, 실행 관측이 아니다. 구현이 `established` 와 **분리된** 거절 플래그를 두고 그 검사를 `!established` 게이트보다 **앞에** 배치하면 C-02 는 성립하지 않는다 — 다만 계획은 그 구현을 지시하지 않는다.
- **AC-GWAUTH-006·008·009·012 의 실제 실패.** 위와 같은 이유로 연역이다. `HISTORY_TIMEOUT_MS=10_000`, vitest 기본 `testTimeout=5000`, `send()` 의 `false` 경로 세 사실은 전부 직접 읽었다.
- **AC-GWAUTH-010 의 stderr 줄 수 = 접속 수 성질.** 자식 프로세스 타이밍에 달려 있고 구현 없이 재지 못했다. 이 기준 자체가 그 취약성을 인지하고 있다.
- **`server/test/` 의 나머지 형제 기준 전수 대조.** `welcome` 을 `toEqual`/`Object.keys` 로 단언하는 자리가 없다는 것은 grep 으로 확인했으나, 서버 15개 파일 180건을 한 건씩 읽지는 않았다.
- **형제 붕괴 실측치.** 55 는 `it()` 개수의 산술 합으로 확인했으나, 그중 실제로 몇 건이 붉어지는지는 구현 없이 잴 수 없다. `plan.md` §B-3 의 M1 단계 0 실측 지시는 타당하다.
- **`SPEC-CHANPERM-001`·`SPEC-CHANWIRE-001`·`SPEC-CHANNEL-001` 본문 전수 훑기.** `t15` 문자열 44줄을 목록으로 뽑았을 뿐, 각 SPEC 을 통독해 착지 후 거짓이 되는 문장을 전수 판별하지는 않았다. H-01 이 든 6자리는 `SPEC-CHANCLIENT-001` **통독** 결과이며 나머지 셋에는 더 있을 수 있다.
- **타이밍 부채널.** `===` 대조의 실제 위험도는 재지 않았다. 「잔여 위험」의 판단(공격자가 얻는 것은 증명 앞자리, 논스가 소켓마다 바뀜)은 타당해 보이나 실측은 아니다.
- **`t15` 큐 카드 본문.** 큐를 조회하지 않았다. 카드 본문과 실범위의 불일치(B-4)는 형제 문서 기록을 읽은 것이지 큐 실측이 아니다.

---

## 5. 차원별 점수

| 차원 | 점수 | 밴드 근거 |
|---|---|---|
| 명확성 (Clarity) | **0.75** | 대부분의 요구사항은 해석이 하나다. 그러나 §5 의 경계 문장이 실제와 다르게 읽히고(C-03), §2.2 의 «세 자리»(M-01)와 §3.3 의 «전건»(H-01)이 독자를 잘못 인도한다 |
| 완전성 (Completeness) | **0.70** | 절 구성·frontmatter·Out of Scope 는 완비. 그러나 «전건 열거» 가 6자리를 빠뜨렸고(H-01), F-A8 부류 9자리가 처리되지 않았으며(M-04), 인계 ④의 통합 판단이 미이행이다(M-05) |
| 검증가능성 (Testability) | **0.45** | 14개 기준 중 006·007·008·009·011·012·013 **일곱 건**이 통과 불가·관측 불가·재현 불가 중 하나에 걸린다. 굵은-변이 분리 설계(C-02)가 성립하지 않아 남은 부정 기준도 방어를 귀속하지 못한다 |
| 추적성 (Traceability) | **1.00** | REQ 13 전건이 AC 로 덮이고 고아 AC 0건. 매트릭스와 본문이 일치한다 (§2.12 실측) |

**종합 = 조화평균(0.75, 0.70, 0.45, 1.00) = 0.668 → 0.67.** Tier M 임계 0.80 미달. Critical 4건이 단독으로도 FAIL 을 확정한다.

---

## 6. 판정

**FAIL (0.67 / Tier M 0.80)**

설계는 옳고 실측 근거도 견고하다 — 프로브는 실재하고, base 는 내가 직접 돌려 맞았고, 열쇠 유도는 계산 가능하며, 서버 비파손 판독은 정확했고, 추적성은 빈틈이 없다. **무너진 것은 그 설계를 재는 층이다.** 수용 기준 열넷 중 일곱이 정상 구현을 거짓 실패시키거나 관측 지점이 없거나 재현 경로가 끊겨 있고, 이 카드가 «설계로 없앤다» 고 선언한 굵은-변이 분리는 계획 자신이 지시한 구현 아래에서 성립하지 않는다. 그리고 이 카드를 존재하게 만든 실패 — 닫은 것보다 넓게 적기 — 가 §5 의 경계 문장에서 다시 나타났다.

---

## 7. 권고 처리 순서

되돌리기 비싼 순서다.

1. **C-03 — 경계 진술을 먼저 정정한다.** §5 의 «닫는다» 를 «토큰 **또는 그 저장 해시**를 모르는 상대» 로 좁히고, «닫지 않는다» 에 «`bot_tokens.token_hash` 가 읽기 전용으로 유출된 배치» 를 명시적으로 더한다. §2.2 의 «동치» 를 «해시는 증명 위조에 충분하다(역은 성립하지 않는다)» 로, «새 공격면이 아니다» 를 «착지 전 대비 새 능력은 아니나, 해시 보유자는 배제되지 않는다» 로 고친다. §1.3·§7 도 같이. **이 항목이 가장 먼저인 이유는 이것이 카드의 존재 이유이기 때문이다.**
2. **C-02 — 분리 설계를 다시 세운다.** 둘 중 하나다. (a) 구현을 «거절 플래그를 `established` 와 별도로 두고 그 검사를 `!established` 게이트보다 앞에 배치» 로 `plan.md` §F M3 에 명시하고 §「검증 원칙」4 의 논증을 그 구조로 다시 쓴다. (b) 분리가 불가능함을 인정하고 «부정 기준은 두 방어를 귀속하지 못한다» 를 잔여 위험에 적은 뒤, 변이 N 의 기대값을 «AC-GWAUTH-006·008·009·011·012 가 함께 무너진다» 로 정정한다. **(a) 를 권한다** — 귀속 불가를 남기면 sync 감사에서 되돌아온다.
3. **C-01 + H-02 — 부정 기준 넷과 011 의 하네스를 다시 쓴다.** 이력 축은 형제 AC-CHANAUTH-003 의 `settled` 센티넬 + `settle()` 형태로 되돌린다(10초를 기다리지 않는다). 011·006 의 «나가는 프레임에서 진짜 id 를 읽는다» 는, 소켓이 닫히기 전에 요청이 나가도록 순서를 재설계하거나 id 를 하네스 상수로 고정하고 «읽는다» 서술을 철회한다.
4. **C-04 — 007·013 의 관측 지점을 정한다.** `wire()` 를 손대지 않는다면 `onWelcome` 단언을 버리고 «확립의 귀결»(첫 메시지 도달·이력 해소)로 양성 짝을 재구성한다. `onWelcome` 충실성을 꼭 재야 한다면 `createGatewayClient` 직접 사용 기준을 따로 두고, AC-013 의 «스텁도 흉내도 없다» 는 다른 관측(서버가 넣은 메시지가 세션 알림으로 도착)만으로 성립시킨다.
5. **H-01 — 형제 문장 열거를 다시 뽑는다.** `SPEC-CHANCLIENT-001` 의 6자리를 B/C 로 갈라 §3.3 표와 `plan.md` §B-1 에 올린다. **`spec.md:92` 의 `onWelcome` 타입 선언은 반드시 B 부류다.** 그리고 §3.3 이 «전건 열거» 를 표방하려면 `SPEC-CHANPERM-001`·`SPEC-CHANWIRE-001`·`SPEC-CHANNEL-001` 도 통독한 뒤여야 한다 — 못 하면 표제를 «확인한 범위» 로 낮춘다.
6. **M-04 — F-A8 소유 문장 9자리를 처리한다.** 개정하든 «C 부류로 남긴다» 고 적든, **§3.3 표에 행으로 존재해야 한다.** CHANINJECT §5 셋째 줄의 «t15 소유 → 범위 밖» 자기모순 문장도 함께. §5 의 «`SPEC-CHANAUTH-001` §5 가 적었다» 오귀속은 §8·`progress.md` 로 정정.
7. **M-05 — 인계 ②·④ 를 마무리한다.** ②의 소유자를 두 문서에서 하나로 통일한다(내용 층 = `SPEC-CHANINJECT-001`/t10). ④는 통합 판단을 수행하거나, 수행하지 않았음과 그 이유를 §3.3 에 발견 사실로 적는다. «이미 착지했다» 는 «코드는 착지했고 SPEC 은 `in-progress` 마감 정리 중» 으로 정확히.
8. **M-01·M-02·M-03 — 기록을 사실과 맞춘다.** «세 자리» → «생산 두 자리 + 테스트 사본 6곳» (§2.2·§3.5·`plan.md` §F M3-5 완화 2 의 겨냥도 함께). `v0.2.0` → `v0.3.2` 3자리. `:465`/`:471` → `:466`/`:474` 5자리. **정정 후 같은 파일의 줄 번호 인용을 다시 grep 한다** — 이 항목 자체가 그 훑기를 빠뜨려 생긴 것이다.
9. **L-01~L-05.** 프로브 인용 순서, `:288` → `:108-117`, «5개 파일» → «4개 파일»(+ 출처를 §3.2 가 아닌 실측으로), REQ-002 라벨과 REQ-009 의 구현 규정, PRESERVE 문언과 CHANINJECT 동시 편집 고지.

**재감사 범위.** 2회차는 위 결함 델타에 한정한다. 특히 C-02 는 «어떤 구현을 지시했는가» 로 판정하므로 `plan.md` §F M3 의 문언을 직접 읽어 확인한다.

---

## 8. 잔여 위험

- **C-02 를 (a) 로 닫으면 구현 자유도가 좁아진다.** 거절 플래그를 별도로 두라는 지시는 SPEC 이 HOW 를 규정하는 방향이며 L-04 와 같은 부류의 대가를 늘린다. 그럼에도 이 자리는 «무엇을 관측할 수 있는가» 가 구현 구조에 직접 달려 있어 불가피해 보인다.
- **AC-GWAUTH-013 이 흔들리면 워크스페이스 간 해시 규칙 분기가 어떤 기준으로도 관측되지 않는다.** 단위 기준들은 각자의 규칙 안에서 전부 초록으로 남는다 — SPEC 이 §3.5 에서 스스로 지적한 그대로다. 4번 처리에서 이 관측을 반드시 살려야 한다.
- **`bot_name`·`missed_after_id` 미인증 판단은 «소비자가 없다» 에 근거한다.** 오늘은 맞다(`wire()` 가 `onWelcome` 을 배선하지 않음 — 내가 확인했다). 소비자가 생기는 순간 이 판단이 낡고, 그 시점을 감지하는 기준은 없다.
- **하네스 네 자리가 서버를 흉내내게 된다.** 「잔여 위험」이 든 대로 서버 규칙 변경이 채널 기준 전체를 붉게 만든다. 진단은 쉽지만, 그 파급이 55건 규모라는 점은 M1 단계 0 실측 전까지 상한 추정이다.
- **이 워크트리는 미푸시다.** 브랜치 `WT-rogue-frame-defense` 의 작업은 이 나무에만 있으며, 개정된 두 형제 SPEC 도 커밋되지 않은 상태다.
