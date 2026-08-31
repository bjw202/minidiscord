# SPEC-GWAUTH-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 채널 자식 프로세스를 띄우는 기준(AC-GWAUTH-010)은 **`npm run build -w channel` 이 선행되어야 한다** — `channel/dist/` 가 없으면 방어와 무관하게 거짓 실패한다.

> **v0.2.0 — 1회차 계획 감사(`.moai/reports/t15/plan-audit.md`, FAIL 0.67) 교정.** 이 문서의 수용 기준 층이 통째로 다시 쓰였다. 감사가 지목한 것은 결함 목록이 아니라 **결함의 형태 셋**이다 — ① 정상 구현에서 통과할 수 없는 단언(C-01), ② 하네스에 존재하지 않는 관측 지점(C-04), ③ 서술이 주장하는 상황이 하네스에서 재현되지 않음(H-02). 그리고 그 위에 ④ 굵은-변이 분리 설계가 계획이 지시한 구현 아래에서 성립하지 않는다는 것(C-02)이 있었다. **기준 수는 14 → 15 로 하나 늘었다**(AC-GWAUTH-015 신설 — C-04 처리).

---

## 이 문서가 지키는 검증 원칙

이 SPEC 의 기준은 **자기가 재기로 한 상대에 대해서는, 방어를 통째로 지워도 통과하는 기준을 하나도 두지 않는다.** 상호 인증은 그 부류가 특히 나오기 쉬운 자리다. **다만 「재기로 한 상대」 자체가 좁다 — 그 범위를 바로 아래에 적는다.**

> **[HARD] 이 기준들이 재지 않는 상대가 있다 (sync 감사 F-02, 운영자 처분 (b)).** `rogueGateway` 의 증명 갈래 넷(`omit`·`wrong`·`short`·`other-room`)은 전부 **받은 토큰을 읽지 않기로 한 위조자**다 — 하네스가 쥐여 준 값을 쓸 수 없는 상대가 아니라, 쓰지 않기로 정해 둔 상대다. `hello` 에 실려 온 평문 토큰으로 증명을 계산하는 상대는 **AC-GWAUTH-006 · 008 · 009 · 011 · 012 다섯을 전부 통과하며**, 열다섯 기준 중 그 상대를 재는 것은 **0개**다(`spec.md` §5 배제표 **둘째 행** — 「`hello` 를 받는 자리」). **통과 개수를 방어의 넓이로 읽어서는 안 된다.** 그 상대를 재는 기준의 신설은 후속 카드 `t22` 가 소유한다.

### 1) 한 기준은 변이 하나로 무너져야 한다

각 기준 끝에 **「이 기준을 무너뜨리는 변이」** 를 한 줄로 적었다. 그 변이를 구현에 넣었을 때 그 기준이 실패하지 않으면, 실패한 것은 구현이 아니라 기준이다. §「품질 게이트」의 변이표가 그 대응을 실행으로 관측한다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 증명 대조 | "위조된 welcome 이 막혔다"만 재면 **모든 welcome 을 거절하는 구현**이 통과한다 — 봇이 영원히 붙지 못하는 상태와 구분되지 않는다 | 같은 스텁이 **틀린 증명**을 보내면 0건, **맞는 증명**을 보내면 각 1건 — 두 기준이 짝이다 (AC-GWAUTH-006 · 007) |
| 증명의 값 | "proof 필드가 있는지"만 재면 **존재만 확인하는 구현**이 통과한다 | 길이가 맞고 값만 틀린 증명을 거절하는가 (AC-GWAUTH-008) |
| 증명의 결속 | "nonce 를 서명했다"만 재면 **프레임 내용을 서명하지 않는 구현**이 통과한다 — 그 구현에서 공격자는 유효한 증명을 그대로 두고 `room_id` 만 바꾼다 | 같은 논스의 유효한 증명을 실은 채 `room_id` 만 바꾼 welcome 을 거절하는가 (AC-GWAUTH-009) |
| 논스의 수명 | "논스를 보냈다"만 재면 **한 번 만들어 재사용하는 구현**이 통과한다. 재접속이 정상 동작인 봇에서 그 구현은 직전 왕복의 재생을 그대로 허용한다 | 두 소켓의 논스가 다른가, 그리고 소켓 1 의 증명이 소켓 2 에서 거절되는가 (AC-GWAUTH-005) |
| 선착 판정 승리 | "위조 판정이 안 나갔다"만 재면 **판정 릴레이를 통째로 끊은 구현**이 통과한다 | 위조 판정 뒤에 도착한 **진짜 판정이 여전히 중계되는가** — 즉 위조가 id 를 소진하지 않았는가 (AC-GWAUTH-011) |
| 상수 시간 대조 | 소스에 `timingSafeEqual` 이 적혔는지 재는 것은 텍스트 단언이지 동작 단언이 아니다 | 길이가 다른 증명이 **예외를 던지지 않고** 거절되는가 — 길이 가드가 없으면 `timingSafeEqual` 이 던진다 (AC-GWAUTH-012) |
| 열쇠 유출 | "증명을 붙였다"만 재면 열쇠를 함께 흘리는 구현이 통과한다 | 어떤 프레임에도 평문 토큰과 해시가 없는가 (AC-GWAUTH-003) |
| `onWelcome` 통과 충실성 | `wire()` 는 `onWelcome` 을 배선하지 않으므로 **`wire()` 하네스로는 이 성질을 아예 관측할 수 없다** | `createGatewayClient` 를 직접 쓰는 형제 하네스에서 프레임 객체 동일성을 잰다 (AC-GWAUTH-015) |

### 2) 모든 기준이 회귀 스위트 안에 있다

`.moai/reports/t4/sync-audit.md` §3.2 가 이 프로젝트의 결함 부류를 지목했다 — **기준 자체는 제대로 재지만, 그 기준이 다시 실행되는 곳이 어디에도 없는 경우**다. 그래서 이 문서는 **셸 명령으로만 관측하는 기준을 하나도 두지 않는다.** 진입점 관측(AC-GWAUTH-010)조차 vitest 안에서 자식 프로세스를 띄우는 형태이고, 범위 경계(AC-GWAUTH-014)만이 git·파일 검사이며 그것은 회귀 대상이 아니라 이 카드 한 번의 경계 확인이다.

`.moai/state/verify/t15-plan/probe-rogue-welcome.mts` 는 **이미 거의 테스트다.** AC-GWAUTH-006 의 하네스는 그 프로브를 vitest 형태로 옮긴 것이며, 그렇게 옮기는 것 자체가 이 카드의 값싼 개선이다 — plan 단계가 한 번 관측한 것을 앞으로 매번 관측한다.

### 3) 접두로 만족되는 단언을 쓰지 않는다

`toContain`·`toMatch` 같은 포함 단언은 접두만 맞아도 참이 된다. 이 문서는 **정확한 값과 부재**를 단언한다 — 배열은 `toEqual` 로 통째로, 없음은 `toEqual([])` 로 잰다. `not.toContain` 도 쓰지 않는다: 무엇이 없는지가 아니라 **무엇만 있는지**를 재야 "그 밖에는 아무것도 없다"가 성립한다.

### 4) 굵은 변이는 두 방어를 가른다 — 강제 지점을 둘로 분리해서

이 SPEC 의 게이트는 `SPEC-CHANAUTH-001` 의 `welcome` 게이트와 **같은 콜백 안에** 선다. diff 전체를 되돌리는 굵은 변이는 어느 쪽이 측정되는지 가르지 못한다.

**v0.1.0 의 논증은 틀렸다 (1회차 감사 C-02).** 그때는 «부정 기준의 스텁이 언제나 `welcome` 을 보내므로 t9 게이트는 이미 열려 있다» 고 적었다. 그러나 계획이 지시한 구현에서는 **증명에 실패한 `welcome` 이 `established` 를 세우지 않으므로**, 뒤따르는 프레임을 버리는 주체가 바로 t9 의 `} else if (!established) {` 가 된다 — 두 방어가 한 강제 지점을 공유하고, 어느 쪽을 지워도 같은 기준들이 무너진다. **호칭이 아니라 구조가 분리를 만든다.**

**그래서 분리를 구조로 만든다.** `plan.md` §F M3-3 이 [HARD] 로 처방한다 — 거절 상태를 `established` 와 **별개 플래그**(`proofRejected`)로 두고, 그 검사를 `!established` 게이트보다 **앞**에 배치한다.

```
if (proofRejected) return        // ① 이 SPEC 의 강제 지점
if (msg.type === 'welcome') { … }
else if (!established) { }       // ② t9 의 강제 지점
```

이 구조에서 각 기준이 재는 것:

| 변이 | 무엇을 지우는가 | 이 SPEC 의 부정 기준 | t9 의 기준 |
|---|---|---|---|
| **H** — 증명 대조를 `if (false)` 로 | ① (플래그가 서지 않는다) | **무너진다** (006·008·009·011·012) | 영향 없음 |
| **N** — `!established` → `false` | ② | **무너지지 않는다** — ①이 먼저 반환한다 | 무너진다 (AC-CHANAUTH-001·003·004·005) |

`proofRejected` 를 `established` 하나로 합치거나 ①을 ② 뒤에 두면 이 표의 두 행이 같아지고, **실패가 어느 방어의 부재를 뜻하는지 귀속할 수 없다.** 변이 N 은 그 분리를 매번 확인하는 관측이다.

### 5) 반대 방향의 결함도 함께 막는다 — 정상 구현을 거짓 실패시키지 않는다

이 절이 v0.1.0 에서 가장 크게 실패한 자리다. 1회차 감사 C-01 이 **네 기준이 정상 구현에서 통과할 수 없음**을 보였다. 원인과 대응을 전부 적는다.

- **이력 축을 `await` 로 재지 않는다 (C-01 교정).** v0.1.0 은 `await expect(historyPromise).rejects.toThrow(/timed out/)` 를 네 기준에 걸었다. **두 갈래 모두 통과 불가였다** — 소켓이 닫혀 있으면 `send()` 가 `false` 를 돌려주어 거부 메시지가 `gateway client is not connected` 이고(`gateway-client.ts:109-113`), 열려 있으면 `HISTORY_TIMEOUT_MS = 10_000`(`:27`)이라 vitest 기본 `testTimeout` 5,000ms 를 넘긴다(`channel/vitest.config.ts` 에 `testTimeout` 설정이 없다 — 직접 확인). **형제 AC-CHANAUTH-003 이 이미 옳은 형태를 갖고 있다**(`transport-auth.test.ts:252-273`): 약속을 `await` 하지 않고 `settled` 센티넬에 담아 `settle()` 400ms 뒤에 **`'pending'` 임을 단언**한다. 이 문서의 모든 이력 축 관측을 그 형태로 되돌렸다.
- **부정 관측의 대기 시간.** "오지 않았음"을 재는 기준은 원리상 완벽할 수 없다. 소켓을 건너는 부정 관측은 `settle()`(400ms)로 **양성 신호가 실제로 도착하는 데 걸리는 시간의 여러 배**를 기다린 뒤에 잰다. 짝이 되는 양성 기준(AC-GWAUTH-007)이 같은 하네스에서 `waitFor` 로 통과하므로, 대기 시간이 모자란 경우는 그쪽이 먼저 드러난다.
- **닫힌 소켓으로는 프레임이 나가지 않는다 (H-02 교정).** v0.1.0 은 «스텁이 나가는 `permission_request` 에서 진짜 id 를 읽는다» 를 AC-006·011 의 본체로 적었으나, 증명 거절 직후 소켓이 닫히므로 `gw.send()` 가 `false` 를 돌려주어 그 프레임이 나가지 않는다(`gateway-client.ts:46-49`). **서술을 철회하지 않고 하네스의 순서를 바꿨다** — 스텁이 `welcome` 을 **지연 발송**하게 해서, 요청 프레임이 소켓이 열려 있는 동안 나가고 스텁이 그것을 실제로 읽은 뒤에 위조 `welcome` 을 보낸다. 이제 서술이 하네스가 하는 일과 일치한다.
- **`wire()` 는 `onWelcome` 을 배선하지 않는다 (C-04 교정).** `channel/src/index.ts:43-58` 이 `onMessage`·`onVerdict` 만 넘긴다 — 이 SPEC 자신이 §2.3 에서 근거로 쓴 사실이다. v0.1.0 은 그 사실을 알면서 `wire()` 하네스 위에서 `onWelcome` 호출을 단언했다. **양성 짝(AC-007)과 왕복(AC-013)은 «확립의 귀결»(채팅 도달·판정 중계·이력 해소)로 재도록 다시 썼고**, `onWelcome` 통과 충실성은 `createGatewayClient` 를 직접 쓰는 형제 하네스(`gateway-client.test.ts`)에 **AC-GWAUTH-015** 를 신설해 잰다. `wire()` 배선은 `plan.md` §A PRESERVE 대로 손대지 않는다.
- **재접속을 기다리는 기준의 타임아웃.** AC-GWAUTH-005·011 은 실제 백오프 1,000ms 를 두 번 이상 지난다. 그 두 기준만 `it(..., { timeout: 20000 })` 로 둔다. 이 값은 방어와 무관한 하네스 상수다.
- **자식 프로세스가 남으면 뒤따르는 기준이 오염된다.** 거두지 못한 프로세스는 스텁 포트로 백오프 재접속을 계속 시도해(상한 30초) 다음 기준의 연결 수를 늘린다. `spawnChild()` 가 `spawn` **직후** `SIGKILL` 정리를 등록한다 — 명령 끝의 `kill` 한 줄은 일찍 끝나는 경로에 닿지 않으므로 쓰지 않는다.
- **`channel/dist` 가 없으면 자식 기준이 거짓 실패한다.** 문서 상단의 선행 명령이 그 조건이다.
- **양쪽 해시 규칙이 갈라지면 단위 기준만으로는 드러나지 않는다.** AC-GWAUTH-013 이 그 어긋남을 잡는 유일한 기준이다(`spec.md` §3.5).

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. **`plan.md` §C 사전 점검**(run 착수 시점, M2 착수 직전)에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사(AC-GWAUTH-014)는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## 공통 테스트 하네스

네 파일이 이 SPEC 을 관측한다.

| 파일 | 무엇을 재는가 | 성격 |
|---|---|---|
| `server/test/gateway.test.ts` | §4.2 (AC-001·002·003) | **기존 파일에 잇는다.** `invite()` 헬퍼가 이미 평문 토큰을 돌려주고 해시를 저장한다(`:56-60`) |
| `channel/test/transport-auth.test.ts` | §4.1·§4.3·§4.4 (AC-004~012) | **기존 파일에 잇는다.** `rogueGateway` 하네스에 증명 손잡이를 단다. `waitFor`·`settle`·`collectUnhandled`·`collectUncaught`·`spawnChild`·`sendRequest` 가 이미 있다 |
| `channel/test/gateway-client.test.ts` | `onWelcome` 통과 충실성 (AC-015) | **기존 파일에 잇는다.** 이 파일만이 `createGatewayClient` 를 직접 쓰고 `connected(srv, over)` 가 옵션을 통째로 넘겨 콜백을 노출한다(`:97`, 사용례 `:129`) |
| `channel/test/gateway-mutual-auth.test.ts` | 왕복 (AC-013) | **새 파일.** 진짜 서버(`createGateway`)와 진짜 채널(`wire`)을 한 테스트에서 붙인다 |

### 증명 계산 헬퍼 (양쪽에서 **각각** 정의한다 — 공유하지 않는다)

```ts
import { createHash, createHmac } from 'node:crypto'

// 구현이 쓰는 코드를 부르지 않고 기준이 스스로 계산한다. 공유하면 규칙이 함께 틀려도
// 기준이 그것을 알아채지 못한다 (spec.md §3.5 완화 1 — 사본 여섯은 의도된 것이다).
const keyOf = (token: string) => createHash('sha256').update(token).digest('hex')
const proofOf = (token: string, nonce: string, roomId: number, botId: number) =>
  createHmac('sha256', keyOf(token)).update(`${nonce}|${roomId}|${botId}`).digest('hex')
```

### `rogueGateway` 확장 (channel 쪽)

기존 `rogueGateway(opts: { welcome: boolean })` 에 손잡이 둘을 더한다.

```ts
// proof: 'valid' 유효 | 'omit' 필드 없음 | 'wrong' 길이는 맞고 값이 틀림
//      | 'short' 길이가 틀림 | 'other-room' 유효한 증명 + room_id 만 다른 값
// deferWelcome: true 이면 hello 에 즉시 답하지 않는다. 테스트가 pushWelcome() 으로
//   시점을 고른다 — 요청 프레임이 소켓이 열려 있는 동안 나가야 하는 기준이 쓴다 (H-02 교정).
function rogueGateway(opts: {
  welcome: boolean
  proof?: 'valid' | 'omit' | 'wrong' | 'short' | 'other-room'
  deferWelcome?: boolean
})
// 추가 접근자 (AC 가 실제로 쓰는 것 전부 — 2회차 감사 N-04):
//   nonceSeen()  — 이 소켓의 hello 에서 읽은 논스
//   pushWelcome() — 지금 welcome 을 보낸다 (deferWelcome 짝)
//   readIds()    — 나가는 permission_request 프레임에서 읽은 request_id 들. AC-011 이
//                  «스텁이 진짜로 프레임에서 읽었다» 를 단언하는 데 쓴다
//   set proof(v) — 접속 도중에 증명 갈래를 바꾼다. AC-011 이 1단계 'omit' → 2단계 'valid'
//                  전환에 쓴다 (기존 하네스의 `set welcome` 과 같은 형태)
```

`proofOf` 의 토큰은 하네스 상수 `'tok'`, 방·봇은 기존 스텁과 같은 `1`·`2` 다.

### `startServer` 확장 (gateway-client.test.ts 쪽 — `rogueGateway` 와 **다른 하네스**다)

AC-GWAUTH-015 만 이 하네스를 쓴다. 그쪽 토큰 상수는 `'tok123'` 이고 `rogueGateway` 의 `'tok'` 이 아니다 — 두 하네스는 이름도 상수도 공유하지 않는다(2회차 감사 N-04). 필요한 확장은 하나다.

```ts
// startServer() 가 받은 hello 프레임을 노출한다 — 기준이 그 안의 nonce 를 읽어
// 증명을 계산해야 한다. 기존 srv.messages[] 로 이미 접근 가능하므로 새 접근자는 없고,
// 기준이 srv.messages.find(m => m.type === 'hello').nonce 로 읽는다.
```

### 이력 축 관측의 표준 형태 (모든 부정 기준이 이 형태를 쓴다)

```ts
let settled: 'pending' | 'resolved' | 'rejected' = 'pending'
const p = gw.requestHistory({ limit: 10 })
p.then(() => { settled = 'resolved' }, () => { settled = 'rejected' })
await waitFor(() => stub.sent.some(m => m.type === 'history_request'), 'history_request 도착')
const rid = () => (stub.sent.find(m => m.type === 'history_request') as { rid: string }).rid
// … 위조 welcome + history_response 를 민다 …
await settle()
expect(settled).toBe('pending')      // 해소되지도 거부되지도 않았다
```

**`'pending'` 을 재는 것이 핵심이다.** `'rejected'` 를 기대하면 «연결 없음» 거부와 «게이트가 막았다» 를 구분하지 못하고, `rejects.toThrow(/timed out/)` 는 10초를 기다려야 해서 정상 구현을 타임아웃으로 죽인다(§「검증 원칙」 5). 요청은 **소켓이 열려 있는 동안** 나가므로 `send()` 는 `true` 를 돌려주고, 그 뒤 게이트가 응답을 버려 약속이 `'pending'` 으로 남는다.

---

## 수용 기준 매트릭스

| 기준 | 요구사항 | 파일 | `it()` 이름 |
|---|---|---|---|
| AC-GWAUTH-001 | REQ-GWAUTH-003 | `server/test/gateway.test.ts` | `welcome carries a proof bound to the nonce, room and bot, keyed on the stored token hash` |
| AC-GWAUTH-002 | REQ-GWAUTH-004 | 같음 | `a hello without a nonce is still welcomed, and that welcome carries no proof` |
| AC-GWAUTH-003 | REQ-GWAUTH-005 | 같음 | `no frame ever carries the plaintext token or its stored hash` |
| AC-GWAUTH-004 | REQ-GWAUTH-001 | `channel/test/transport-auth.test.ts` | `hello carries a 64-hex nonce and exactly three fields` |
| AC-GWAUTH-005 | REQ-GWAUTH-002 | 같음 | `the nonce is regenerated per socket and a replayed proof is refused` |
| AC-GWAUTH-006 | REQ-GWAUTH-006, 011 | 같음 | `a forged welcome with no proof opens nothing: no chat, no verdict, no history` |
| AC-GWAUTH-007 | REQ-GWAUTH-007 | 같음 | `a welcome with a valid proof establishes the session and the same frames arrive once each` |
| AC-GWAUTH-008 | REQ-GWAUTH-006 | 같음 | `a proof of the right length and the wrong value is refused` |
| AC-GWAUTH-009 | REQ-GWAUTH-003, 007 | 같음 | `a valid proof does not authenticate a different room_id` |
| AC-GWAUTH-010 | REQ-GWAUTH-008 | 같음 | `the entry point closes a proofless socket, says one line on stderr and nothing on stdout` |
| AC-GWAUTH-011 | REQ-GWAUTH-012 | 같음 | `a forged verdict neither reaches the session nor consumes the id the real verdict needs` |
| AC-GWAUTH-012 | REQ-GWAUTH-009, 010 | 같음 | `a proof of the wrong length is refused without throwing` |
| AC-GWAUTH-013 | REQ-GWAUTH-003, 007 | `channel/test/gateway-mutual-auth.test.ts` | `the real server and the real channel agree on the proof end to end` |
| AC-GWAUTH-014 | REQ-GWAUTH-013 | (경계 확인) | — |
| AC-GWAUTH-015 | REQ-GWAUTH-007 | `channel/test/gateway-client.test.ts` | `passes a proof-bearing welcome through untouched, proof field included` |

---

## AC-GWAUTH-001 — 증명은 논스·방·봇에 묶이고 저장된 해시를 열쇠로 한다

**Given** `seedRoom()`·`seedBot()`·`invite()` 로 서로 다른 두 방·봇 짝의 평문 토큰 두 개를 만들고 서버를 띄운다.
**When** 각 토큰으로 `{ type:'hello', token, nonce }` 를 보내고 각 `welcome` 을 받는다. 두 접속은 서로 다른 논스를 쓴다. 이어서 첫 토큰으로 **논스만 바꿔** 한 번 더 접속한다.
**Then** 각 `welcome.proof` 가 테스트가 독립 계산한 `proofOf(token, nonce, room_id, bot_id)` 와 **정확히 같고**(`toBe`), 두 접속의 증명이 서로 다르며, **같은 토큰·방·봇이라도 논스가 바뀌면 증명이 달라진다**.

두 토큰을 한 테스트에서 대조하는 것이 이 기준의 핵심이다 — 형제 AC-GW-001 이 같은 이유로 두 토큰을 쓴다. 증명을 상수로 만들어 보내는 구현은 한 토큰만 볼 때 통과해 버린다. 논스를 바꿔 한 번 더 재는 것은 증명이 논스에 **실제로** 의존함을 잰다.

**이 기준을 무너뜨리는 변이**: `welcome` 에서 `proof` 를 뺀다 / 상수 문자열을 싣는다 / 열쇠를 `token_hash` 가 아닌 값(평문 토큰, `room_id` 문자열 등)으로 바꾼다 / 메시지에서 `nonce` 를 뺀다.

## AC-GWAUTH-002 — 논스 없는 `hello` 도 환영받고, 그 환영에는 증명이 없다

**Given** 서버를 띄우고 유효한 토큰을 만든다.
**When** `{ type:'hello', token }` 을 — `nonce` 없이 — 보낸다.
**Then** `welcome` 이 도착하고(접속이 닫히지 않는다), `Object.keys(welcome).sort()` 가 `['bot_id','bot_name','missed_after_id','room_id','type']` 와 `toEqual` 로 같다 — 즉 `proof` 필드가 **없다**.

`toEqual` 로 키 집합 전체를 재는 이유는 §「검증 원칙」 3번이다. `welcome.proof === undefined` 만 재면 다른 이름의 필드가 조용히 늘어도 통과한다.

**이 기준을 무너뜨리는 변이**: 논스 없는 `hello` 에 접속을 끊는다 / 논스 유무와 무관하게 항상 증명을 싣는다(빈 문자열 논스로 계산한 값도 여기 걸린다).

## AC-GWAUTH-003 — 접속이 **받은** 어떤 프레임도 평문 토큰이나 저장 해시를 싣지 않는다

**Given** 서버를 띄우고 유효한 토큰으로 접속해 `welcome` 과 재전송 메시지까지 받는다.
**When** 그 접속이 받은 **모든** 프레임을 `JSON.stringify` 로 이어 붙인다.
**Then** 그 문자열이 평문 토큰을 포함하지 않고, `keyOf(token)` 도 포함하지 않는다.

이 자리는 예외적으로 포함 검사(`.includes`)를 쓴다 — 재는 것이 «없음» 이고, 부재를 재는 데는 포함 검사가 정확하다. 두 값 모두 64자 이상 hex 라 우연 일치는 실질적으로 없다.

**[HARD] 제목이 «받은» 으로 한정된 이유 — 나가는 방향은 반대다.** v0.4.0 까지 이 기준의 제목은 «**어떤** 프레임도» 였으나 본문은 처음부터 «그 접속이 **받은** 모든 프레임» 만 쟀고, 그 차이가 설계 구멍을 가렸다: 나가는 `hello` 는 **평문 토큰을 그대로 싣는다**(`channel/src/gateway-client.ts:82`). 제목대로 양방향을 쟀다면 이 기준이 처음부터 붉어져 plan 단계에서 구멍이 드러났을 것이다(sync 보고 S-01). 이 기준의 범위를 **넓히지 않는다** — 나가는 방향을 닫는 것은 프로토콜 변경이며 후속 카드 `t22` 가 소유한다. 여기서는 제목이 재는 것보다 넓게 말하지 않도록 좁히기만 한다. `server/test/gateway.test.ts:897` 의 같은 제목 주석은 코드 파일이라 이 라운드에서 손대지 않았다 — `t22` 또는 sync 가 맞춘다.

**이 기준을 무너뜨리는 변이**: 증명 대신 열쇠를 그대로 싣는다 / 진단용으로 `token_hash` 를 `welcome` 에 붙인다.

## AC-GWAUTH-004 — `hello` 는 64자 hex 논스를 싣고 필드는 정확히 셋이다

**Given** `rogueGateway({ welcome: true, proof: 'valid' })` 를 띄우고 `wire()` 로 붙인다.
**When** `hello` 가 스텁에 도착한다.
**Then** `Object.keys(hello).sort()` 가 `['nonce','token','type']` 와 `toEqual` 로 같고, `hello.nonce` 가 `/^[0-9a-f]{64}$/` 를 만족하며, `hello.token` 은 `'tok'` 그대로다.

정규식은 형식만 재고 무작위성은 재지 못한다. 무작위성은 AC-GWAUTH-005 가 두 소켓의 값이 다름으로 잰다 — 두 기준이 짝이다.

**이 기준을 무너뜨리는 변이**: `nonce` 를 싣지 않는다 / 고정 문자열을 싣는다(005 가 잡는다) / `randomUUID()` 로 만든다(36자라 정규식이 잡는다).

## AC-GWAUTH-005 — 논스는 소켓마다 새로 만들어지고, 재생된 증명은 거절된다

`it(..., { timeout: 20000 })`.

**Given** `rogueGateway({ welcome: true, proof: 'valid' })` 를 띄우고 붙여 확립한다. 첫 소켓의 `nonce1` 과 그 소켓에 보낸 `proof1` 을 기록한다. 확립 뒤 채팅·판정 프레임을 하나씩 밀어 `notes`·`verdicts` 가 각 1건이 되게 한다(양성 기준선).
**When** 스텁이 그 소켓을 `terminate()` 하고, 채널이 백오프 뒤 다시 붙는다. 스텁은 **두 번째 소켓에 `proof1` 을 그대로 재생한다**(새 논스로 다시 계산하지 않는다). 그 뒤 채팅 프레임과 판정 프레임을 하나씩 민다.
**Then** 두 번째 `hello` 의 `nonce2` 가 `nonce1` 과 다르고, `settle()` 뒤 `notes.length` 와 `verdicts.length` 가 **재접속 이전 값 그대로 각 1**이다 — 즉 두 번째 소켓은 확립되지 않았다.

`notes` 를 함께 재는 이유는 계획 감사 H-01 이 형제 SPEC 에 남긴 교훈이다 — 판정 축만 재면 발신 집합 대조가 먼저 버려서 이 게이트의 유무를 구분하지 못한다. 채팅 축에는 발신 집합 대조가 걸리지 않으므로 **이 게이트만이 막을 수 있는 값**이다.

**이 기준을 무너뜨리는 변이**: 논스를 `connect()` 바깥 클로저 변수로 올린다(그러면 `nonce2 === nonce1` 이고 재생 증명이 통과해 두 값이 2로 는다).

## AC-GWAUTH-006 — 증명 없는 위조 `welcome` 은 아무것도 열지 못한다

**이것이 `.moai/state/verify/t15-plan/probe.log` 의 세 줄을 회귀 스위트로 옮긴 기준이다.**

**Given** `rogueGateway({ welcome: true, proof: 'omit', deferWelcome: true })` 를 띄우고 `wire()` 로 붙인다 — 프로브의 상대와 같은 자리다. **스텁은 아직 `welcome` 을 보내지 않았고, 소켓은 열려 있다.**
**When** 아래 순서로 진행한다. **순서가 하네스의 본체다** — 요청 프레임은 소켓이 열려 있는 동안 나가야 스텁이 그것을 읽을 수 있다(1회차 감사 H-02).

1. 세션이 `sendRequest(client, REQ)` 로 승인 요청을 발신한다 → `permission_request` 가 나가고, **스텁이 그 프레임에서 진짜 `request_id` 를 읽는다.**
2. `gw.requestHistory({ limit: 10 })` 를 §「이력 축 관측의 표준 형태」대로 걸고, `history_request` 가 도착할 때까지 기다려 **스텁이 `rid` 를 읽는다.**
3. 스텁이 `pushWelcome()` 으로 **증명 없는 `welcome`** 을 보내고, 이어서 ① 사칭 채팅 `{ type:'message', delivery:'to', author_name:'admin', body:… }` ② 1번에서 읽은 진짜 id 의 `{ type:'permission_verdict', behavior:'allow' }` ③ 2번에서 읽은 `rid` 의 `history_response` 를 민다.
4. `await settle()`.

**Then** 세 관측이 동시에 성립한다.

```
expect(notes).toEqual([])          // 사칭 채팅 주입 0건   (프로브 P1_CHAT_NOTES 와 반대)
expect(verdicts).toEqual([])       // 판정 주입 0건        (프로브 P1_VERDICTS 와 반대)
expect(settled).toBe('pending')    // 이력 오염 0건        (프로브 P1_HISTORY 와 반대)
```

**이 기준이 재는 것은 이 SPEC 의 게이트 하나뿐이다.** 스텁은 `welcome` 을 **보내고**, 구현은 `proofRejected` 를 세워 ①에서 세 프레임을 버린다(`plan.md` §F M3-3). t9 의 `!established` 게이트를 지워도(**변이 N**) ①이 먼저 반환하므로 이 기준은 통과한다 — §「검증 원칙」 4번의 표가 그 분리다.

**이 기준을 무너뜨리는 변이**: 증명 대조 조건을 `if (false)` 로 바꾼다 / 증명이 없으면 통과시키는 하위 호환 갈래를 넣는다 / `proofRejected` 검사를 `!established` 게이트 **뒤로** 옮긴다(그러면 변이 N 으로도 무너져 귀속이 깨진다 — 변이 N 이 그것을 잡는다).

## AC-GWAUTH-007 — 유효한 증명은 세션을 확립하고 정상 경로가 돈다

**AC-GWAUTH-006 의 짝이다.** 이 기준이 없으면 «모든 welcome 을 거절하는 구현» 이 006 을 통과한다.

**Given** `rogueGateway({ welcome: true, proof: 'valid', deferWelcome: true })` — 스텁은 `hello.nonce` 를 읽어 `proofOf('tok', nonce, 1, 2)` 를 계산해 싣는다.
**When** 006 과 **완전히 같은 4단계**를 밟는다(같은 순서, 같은 세 프레임).
**Then** **확립의 귀결**을 잰다.

```
expect(notes.length).toBe(1)                       // 사칭이 아니라 정상 채팅 경로가 산다
expect(verdicts.map(v => v.params)).toEqual([{ request_id: REQ.request_id, behavior: 'allow' }])
await waitFor(() => settled !== 'pending', '이력 해소')
expect(settled).toBe('resolved')
expect((await p).messages).toEqual([…스텁이 보낸 그대로…])
```

**`onWelcome` 을 단언하지 않는다.** 이 하네스는 `wire()` 이고 `wire()` 는 `onWelcome` 을 배선하지 않으므로(`channel/src/index.ts:43-58`), 그 단언은 관측 지점이 없는 문장이었다(1회차 감사 C-04). 통과 충실성은 AC-GWAUTH-015 가 `createGatewayClient` 하네스에서 잰다.

006 과 007 이 **같은 4단계를 쓰는 것**이 이 짝의 핵심이다. 다른 순서를 쓰면 두 결과의 차이가 증명 때문인지 순서 때문인지 가를 수 없다.

**이 기준을 무너뜨리는 변이**: 모든 `welcome` 을 거절한다 / 유효한 증명에도 `proofRejected` 를 세운다 / 증명 계산의 메시지 순서를 바꾼다.

## AC-GWAUTH-008 — 길이가 맞고 값이 틀린 증명은 거절된다

**Given** `rogueGateway({ welcome: true, proof: 'wrong', deferWelcome: true })` — 유효한 증명의 **첫 글자만 뒤집은** 64자 hex 를 싣는다.
**When** 006 과 같은 4단계.
**Then** `notes` `[]` · `verdicts` `[]` · `settled === 'pending'`.

첫 글자만 뒤집는 것이 의도적이다 — 접두 비교나 부분 비교로 구현된 대조를 잡는다.

**이 기준을 무너뜨리는 변이**: 대조를 `typeof proof === 'string'` 이나 `proof !== undefined` 같은 존재 확인으로 바꾼다 / 접두 n자만 비교한다.

## AC-GWAUTH-009 — 유효한 증명이 다른 `room_id` 를 인증하지는 않는다

**Given** `rogueGateway({ welcome: true, proof: 'other-room', deferWelcome: true })` — 스텁은 `proofOf('tok', nonce, 1, 2)` 를 **정확히** 계산해 싣되, 같은 프레임의 `room_id` 만 `9` 로 적는다.
**When** 006 과 같은 4단계.
**Then** `notes` `[]` · `verdicts` `[]` · `settled === 'pending'`.

채널이 «자기 논스와 **그 프레임의** `room_id`·`bot_id`» 로 다시 계산하므로(REQ-GWAUTH-007), 프레임이 주장하는 방과 증명이 묶인 방이 다르면 대조가 어긋난다. 이 기준이 없으면 증명이 «어떤 welcome 이 왔다» 만 인증하고 «그 welcome 이 무엇을 말하는가» 는 인증하지 않는 구현이 통과한다.

**이 기준을 무너뜨리는 변이**: HMAC 메시지를 `nonce` 하나로 줄인다 / 채널이 프레임의 값 대신 자기가 기대하는 상수로 다시 계산한다.

## AC-GWAUTH-010 — 거절은 소켓을 닫고 stderr 한 줄만 낸다

**Given** `rogueGateway({ welcome: true, proof: 'omit' })`(지연 없음 — 붙는 즉시 거절당해야 한다)를 띄우고, `spawnChild([DIST], { MINIDISCORD_TOKEN: 'tok', MINIDISCORD_SERVER: 'ws://127.0.0.1:<port>/bot' })` 로 자식 프로세스를 띄운다. `DIST` 는 `fileURLToPath(new URL('../dist/index.js', import.meta.url))` 다.
**When** 자식이 붙어 거절당하고 백오프 뒤 다시 붙기를 두 번 이상 반복할 만큼 기다린다(`waitFor(() => stub.connections() >= 2, …)`).
**Then** ① 스텁이 관측한 접속 수가 2 이상이다(닫혔고 다시 붙었다 — 재접속 경로가 멈추지 않았다) ② 자식의 **stdout 이 빈 문자열**이다 ③ stderr 의 비어 있지 않은 줄 수가 **접속 수와 같다** ④ 자식 프로세스가 살아 있다(`proc.exitCode === null`).

③이 «정확히 한 줄» 이 아니라 «접속당 한 줄» 인 이유를 적는다 — 거절은 소켓마다 일어나고 재접속은 정상 동작이므로, 총량을 상수로 못 박으면 정상 구현이 타이밍에 따라 거짓 실패한다. 잰 것은 **접속 하나에 진단 한 줄** 이라는 성질이다.

**이 기준을 무너뜨리는 변이**: 거절 시 `process.exit` 한다(④가 잡는다) / 진단을 `console.log` 로 낸다(②가 잡는다 — MCP 전송 통로가 깨진다) / 거절 후 소켓을 닫지 않는다(①이 잡는다) / 예외를 던진다(④가 잡는다).

## AC-GWAUTH-011 — 위조 판정은 중계되지도, 진짜 판정이 쓸 id 를 소진하지도 않는다

`it(..., { timeout: 20000 })`. **`.moai/state/verify/t15-plan/probe.log` 의 `P1_VERDICTS` 한 줄이 이 기준의 출처다.**

**Given** 스텁을 두 단계로 둔다. 1단계는 `{ welcome: true, proof: 'omit', deferWelcome: true }` — 위조 상대이며, **아직 `welcome` 을 보내지 않아 소켓이 열려 있다.**
**When** 아래 순서로 진행한다.

1. 세션이 `sendRequest(client, { ...REQ, request_id: 'real-42' })` 를 발신한다 → `permission_request` 가 **소켓이 열려 있는 동안** 나가고, 스텁이 그 프레임에서 `'real-42'` 를 읽는다. (id 는 하네스가 정한 값이지만, 스텁이 그것을 **프레임에서 실제로 읽는다** — `expect(stub.readIds()).toEqual(['real-42'])` 로 그 읽기 자체를 단언한다.)
2. 스텁이 `pushWelcome()` 으로 증명 없는 `welcome` 을 보내고, **곧바로** 그 id 의 `{ behavior:'allow' }` 를 보낸다 — **위조가 먼저 도착한다.**
3. `await settle()`. 스텁이 소켓을 끊는다.
4. 스텁을 2단계로 전환한다(`proof: 'valid'`). 채널이 백오프 뒤 재접속해 확립한다.
5. 스텁이 같은 id 로 사람의 진짜 판정 `{ behavior:'deny' }` 를 보낸다.

**Then**

```
expect(stub.readIds()).toEqual(['real-42'])        // 스텁이 진짜로 프레임에서 읽었다
expect(verdicts.map(v => v.params)).toEqual([{ request_id: 'real-42', behavior: 'deny' }])
```

**둘째 줄이 두 가지를 동시에 잰다.** 배열의 길이가 1 이므로 위조 `allow` 는 중계되지 않았고, 그 원소가 `deny` 이므로 **먼저 도착한 위조가 id 를 소진하지 않았다** — 사람의 진짜 판정이 살아남았다. 프로브가 관측한 것(`[{"request_id":"real-42","behavior":"allow"}]`, 뒤이은 `deny` 는 없음)의 정확한 반대다.

순서가 이 기준의 본체다. 위조를 나중에 보내면 발신 집합이 이미 소진돼 있어 어떤 구현에서도 통과하므로, **위조가 반드시 먼저**여야 한다. v0.1.0 은 이 순서를 적어 놓고 소켓이 닫힌 뒤에 요청을 보내게 해 1번이 실행되지 않았다(1회차 감사 H-02) — `deferWelcome` 이 그 순서를 실제로 성립시킨다.

**이 기준을 무너뜨리는 변이**: 증명 대조를 제거한다(1단계가 확립돼 `allow` 가 중계되고 id 가 소진되므로 결과가 `[{…allow}]` 가 된다 — 길이도 값도 어긋난다) / 판정 릴레이를 통째로 끊는다(결과가 `[]` 가 된다).

## AC-GWAUTH-012 — 길이가 틀린 증명은 예외 없이 거절된다

**Given** `rogueGateway({ welcome: true, proof: 'short', deferWelcome: true })` — `proof: 'ab'` 두 글자를 싣는다. `collectUnhandled()` 와 `collectUncaught()` 를 건다(형제 하네스에 이미 있다).
**When** 006 과 같은 4단계.
**Then** `notes` `[]` · `verdicts` `[]` · `settled === 'pending'` 이고, **처리되지 않은 거부가 `[]`, 잡히지 않은 예외가 `[]`** 이며, 클라이언트가 계속 살아 재접속한다.

`timingSafeEqual` 은 길이가 다르면 예외를 던진다. 즉 이 기준은 **길이 가드가 대조보다 먼저 있는가**를 동작으로 잰다 — 소스에 `timingSafeEqual` 이 적혔는지 읽는 텍스트 단언보다 강하다.

**이 기준을 무너뜨리는 변이**: 길이 확인 없이 `timingSafeEqual` 을 부른다(잡히지 않은 예외가 생긴다). **`===` 로 대조한 구현은 이 기준을 통과한다** — 예외를 던지지 않기 때문이다. 그 한계는 「잔여 위험」에 적었고, 그 자리는 코드 리뷰가 지킨다.

## AC-GWAUTH-013 — 진짜 서버와 진짜 채널이 증명에 합의한다

**Given** `server/src/gateway.ts` 의 `createGateway` 로 실제 서버를 띄우고 `invite()` 로 실제 토큰을 발급한 뒤, `channel/src/index.ts` 의 `wire()` 로 실제 채널을 그 주소에 붙인다. 스텁도 흉내도 없다.
**When** 채널이 `hello` 를 보내고 서버가 `welcome` 으로 답한다. 그 뒤 서버가 그 방에 그 봇을 타깃으로 하는 메시지를 하나 넣는다.
**Then** 그 메시지가 **세션 알림으로 도착한다**(`waitFor(() => notes.length === 1)`), 그리고 그 알림의 `content` 가 서버가 넣은 본문을 담는다.

**`onWelcome` 을 단언하지 않는다** — `wire()` 가 배선하지 않기 때문이다(1회차 감사 C-04). **확립되지 않으면 그 메시지가 도착할 수 없으므로**(REQ-GWAUTH-011 이 미확립 소켓의 `message` 를 버린다), 「메시지가 도착했다」가 「확립됐다」의 충분한 관측이다. 「스텁도 흉내도 없다」는 성질은 그대로 살아 있다.

**이 기준만이 §3.5 의 생산 두 자리 분기를 잡는다.** 해시·HMAC 규칙이 서버와 채널에 각각 존재하므로, 한쪽이 규칙을 바꾸면 단위 기준들은 **각자의 규칙 안에서 전부 초록으로 남는다.**

**이 기준을 무너뜨리는 변이**: 한쪽의 해시를 `sha512` 로 바꾼다 / 한쪽의 구분자를 `|` 에서 `:` 로 바꾼다 / 한쪽의 메시지 순서를 `room|bot|nonce` 로 바꾼다. 셋 다 단위 기준은 전부 통과하고 이 기준만 실패한다.

## AC-GWAUTH-014 — 범위 경계

**Given** `plan.md` §C 사전 점검이 기록한 `spec_base_sha`, 그리고 **구현 HEAD `2d7c1ef`**.
**When** `git diff --name-only <spec_base_sha>..2d7c1ef` 를 낸다.
**Then** 목록이 아래 집합 안에 든다.

**[HARD] 측정 끝점을 `HEAD` 가 아니라 구현 HEAD `2d7c1ef` 에 고정한다 (v0.5.0).** 이 기준은 스스로 «회귀 대상이 아니라 **이 카드 한 번의 경계 확인**» 이라고 적는다(아래). 끝점을 움직이는 `HEAD` 로 두면, 경계와 무관한 뒤 커밋(sync 단계의 증거·보고서 커밋, 이 문서 자신의 개정)이 들어올 때마다 이미 통과한 판정이 다시 붉어진다 — 재는 대상이 «구현이 경계를 지켰는가» 인데 측정은 «그 뒤로 무엇이 더 커밋됐는가» 를 재게 된다. 구현이 착지한 커밋에 고정하면 그 어긋남이 사라진다. 원 측정 원문은 `.moai/state/verify/t15-run/ac014-boundary.txt`.

```
server/src/gateway.ts
channel/src/gateway-client.ts
server/test/gateway.test.ts
channel/test/transport-auth.test.ts
channel/test/gateway-mutual-auth.test.ts
channel/test/gateway-client.test.ts          ← 형제 개정 (§3.2) + AC-GWAUTH-015
channel/test/permission-relay.test.ts        ← 하네스 증명 손잡이
channel/test/index-wiring.test.ts            ← 하네스 증명 손잡이
.moai/specs/**                               ← 문서
.moai/reports/**                             ← 단계 보고·감사 보고 (v0.5.0 추가)
.moai/state/verify/**                        ← 검증 증거 원문 (v0.5.0 추가)
```

**뒤의 두 줄을 더한 이유 (v0.5.0).** run·sync 단계는 재현 가능한 증거를 파일로 남기고 그것을 커밋해야 한다 — 인용된 증거 경로가 감사 시점에 없으면 그 주장은 귀속되지 않은 주장이 된다. v0.4.0 의 집합은 두 경로를 담지 않아서, 지시받은 대로 증거를 커밋하면 **지금 통과 중인 이 기준이 붉어지는** 모순이 있었다(sync 보고 §5). 두 경로는 산출물이 아니라 **이 카드의 기록**이므로 경계 위반이 아니다. 위 끝점 고정과 함께 보면 증거 커밋은 애초에 측정 구간 밖이지만, 집합에도 명시해 두 겹으로 어긋남을 없앤다.

그리고 ① `server/package.json`·`channel/package.json` 의 `dependencies` 블록이 base 와 동일하다(새 의존성 없음) ② `channel/src` 아래 어떤 파일도 `node:fs` 를 import 하지 않는다(형제 AC-CHANINJECT-008 과 같은 관측) ③ 게이트웨이 메시지 **타입** 집합이 base 와 같다(필드 둘만 늘었다).

**배포 문서 개정(`README.md`·`CHANGELOG.md`)은 이 집합에 넣지 않는다 (sync 2차 감사 G-02).** `spec.md` §5 가 요구하는 그 개정은 고정 끝점 `2d7c1ef` **이후**에 착지하므로 애초에 이 측정 구간 밖이며, 허용 집합에 없다는 것이 그 지시와 모순되지 않는다 — 경계 기준을 넓히는 대신 구간을 밝혀 어긋남을 없앤다.

**이 기준은 회귀 대상이 아니다** — 이 카드 한 번의 경계 확인이며, 그래서 이 문서에서 유일하게 vitest 밖에 있다. ②만은 vitest 안의 형제 기준이 이미 매번 재고 있다.

## AC-GWAUTH-015 — 증명을 실은 `welcome` 도 손대지 않고 그대로 넘긴다

**C-04 로 AC-GWAUTH-007 에서 떼어 낸 관측이다.** `wire()` 가 아니라 **`createGatewayClient` 를 직접 쓰는** 형제 하네스에서만 성립한다.

**Given** `channel/test/gateway-client.test.ts` 의 `startServer({ autoWelcome: false })` 와 `connected(srv, { onWelcome: w => got.push(w) })` — 이 파일의 하네스는 `onWelcome` 을 노출한다(`:97` 정의, `:129` 사용례).
**When** 서버 스텁이 `frame = { type:'welcome', room_id:1, bot_id:2, bot_name:'pm', missed_after_id:42, proof: proofOf('tok123', helloNonce, 1, 2) }` 를 보낸다. 논스는 `srv.messages.find(m => m.type === 'hello').nonce` 로 읽는다 — **이 하네스는 `rogueGateway` 가 아니므로 `nonceSeen()` 접근자가 없다.** 토큰 상수도 이쪽은 `'tok123'` 이다 (2회차 감사 N-04).
**Then** `got.length === 1` 이고 `expect(got[0]).toEqual(frame)` — **`proof` 필드를 포함해 프레임 객체가 통째로 그대로** 넘어간다.

이 기준은 형제 AC-CHANCLIENT-002 의 «통과 충실성» 계약(REQ-CHANCLIENT-003)이 증명 필드가 늘어난 뒤에도 유지되는지를 잰다. **AC-CHANCLIENT-002 자체는 `plan.md` §B-1 의 계약 개정이 다시 쓰며**, 이 기준은 그것과 별개로 이 SPEC 이 들이는 필드에 대한 관측이다.

**이 기준을 무너뜨리는 변이**: `onWelcome` 에 세 필드(`room_id`·`bot_id`·`bot_name`)만 골라 새 객체로 넘긴다 / 검증에 쓴 뒤 `proof` 를 지우고 넘긴다.

---

## 품질 게이트

run 단계는 아래를 모두 관측해야 한다.

| 항목 | 명령 | 통과 조건 |
|---|---|---|
| 전체 스위트 | `npm test` | **250/250 이상 초록.** base 실측: server 180/180 · channel 70/70 (`2026-08-29`, 이 워크트리에서 실행 — 1회차 감사도 같은 값을 독립 확인했다) |
| 타입 검사 | `npm run typecheck -w server` · `-w channel` | 오류 0 |
| 채널 빌드 | `npm run build -w channel` | 종료 코드 0 (AC-GWAUTH-010 의 선행 조건) |
| 신규 기준 | `npm test` 출력에 AC-GWAUTH-001~013·015 의 `it()` 이름 14줄 | 전건 `✓` |
| 형제 비회귀 | 위 250 안에 `AC-CHANAUTH-001~012`·`AC-CHANPERM-*`·`AC-CHANCLIENT-*`·`AC-CHANINJECT-*`·`AC-GW-*` 가 전부 포함 | 개정된 세 건(AC-CHANCLIENT-001·002·011)은 **개정 후 본문**으로 초록 |
| 범위 경계 | AC-GWAUTH-014 | 목록이 집합 안 |

### 변이표 — run 단계가 실제로 넣고 관측한다

각 변이를 하나씩 넣고 스위트를 돌린 뒤 되돌린다. 되돌린 뒤 `git diff` 가 비어 있음을 매번 확인한다.

**[HARD] 이 표는 v0.5.0 에서 연역에서 실측으로 바뀌었다.** v0.4.0 의 행 값은 «이 변이는 이 기준을 무너뜨릴 것이다» 라는 **예측**이었고, run 단계가 15개를 실제로 넣어 재자 **13행 중 7행(C·F·G·H·I·J·M)이 어긋났다**(sync 감사 F-03). 아래 표의 값은 그 실측 원문(`.moai/state/verify/t15-run/mutation-*.txt`)에서 **테스트 이름 → 기준 번호 매핑으로 다시 뽑은 것**이며, run 요약(`progress.md` §E.2.4)의 재인용이 아니다.

판정 규칙도 그에 맞춰 좁힌다:

- **[HARD] `AC-GWAUTH-*` 집합은 표와 정확히 일치해야 한다** — 더 많이 무너져도, 더 적게 무너져도 실패다.
- **형제 기준의 연쇄 붕괴는 «총 실패 수» 로만 잰다.** C·F·J 는 세션 확립 자체를 막으므로 확립에 기대는 형제 기준이 무더기로 무너진다. 그 목록을 행마다 옮겨 적으면 표가 형제 SPEC 의 변경마다 거짓이 되므로, 총 수만 적고 목록은 원문에 맡긴다.
- **이 규칙 변경이 잃는 것을 적는다.** 예측이던 표를 실측으로 바꾸면 「기준들이 서로 독립이 아니다」를 표가 스스로 잡아내지는 못한다 — 그 사실은 이제 표가 **발견한 결과**로 아래 «과결합의 이유» 에 기록돼 있고, 표는 회귀 기준선 역할만 한다.

| # | 변이 | 무너져야 하는 기준 |
|---|---|---|
| A | `welcome` 에서 `proof` 를 뺀다 (서버) | AC-GWAUTH-001 · 013 |
| B | 증명을 상수 문자열로 만든다 (서버) | AC-GWAUTH-001 · 013 |
| C | HMAC 메시지를 `nonce` 하나로 줄인다 (양쪽 동시) | **001 · 005 · 007 · 011 · 015** (총 실패 32 = 서버 1 + 채널 31). **009 · 013 은 생존** — ① |
| D | 논스 없는 `hello` 에도 증명을 싣는다 (서버) | AC-GWAUTH-002 |
| E | `welcome` 에 `token_hash` 를 함께 싣는다 (서버) | AC-GWAUTH-003 |
| F | `hello` 에서 `nonce` 를 뺀다 (채널) | **004 · 005 · 007 · 011 · 013 · 015** (총 실패 35). **006 · 008 · 009 · 010 · 012 는 생존** — ② |
| G | 논스를 `connect()` 바깥 클로저로 올린다 (채널) | **005** + 형제 `AC-CHANCLIENT-011` (총 실패 2) — ③ |
| H | 증명 대조 조건을 `if (false)` 로 바꾼다 (채널) | **005 · 006 · 008 · 009 · 010 · 011 · 012** (총 실패 7, 형제 0) — ④ |
| I | 대조를 존재 확인(`proof !== undefined`)으로 바꾼다 (채널) | **005 · 008 · 009 · 012** (총 실패 4, 형제 0). **011 은 생존** — ⑤ |
| J | 모든 `welcome` 을 거절한다 (채널) | **005 · 007 · 011 · 013 · 015** (총 실패 32) — ⑥ |
| K | 길이 확인 없이 `timingSafeEqual` 을 부른다 (채널) | AC-GWAUTH-012 |
| L | 거절 시 `console.log` 로 진단을 낸다 (채널) | AC-GWAUTH-010 |
| M | 거절 후 소켓을 닫지 않는다 (채널) | **010 · 012** (총 실패 2, 형제 0) — ⑦ |
| **N** | **`} else if (!established) {` → `} else if (false) {`** (t9 의 게이트) | **AC-GWAUTH-* 는 하나도 무너지지 않는다.** `AC-CHANAUTH-001·003·004·005` 만 무너진다 |
| **O** | **`if (proofRejected) return` 을 `!established` 게이트 뒤로 옮긴다 — 반드시 «체인 밖 독립 문장을 if/else 체인 뒤로» 다. `else if (proofRejected) return` 로 체인 분기에 끼우면 안 된다** (구조 변이) | **변이 N 을 다시 넣었을 때 AC-GWAUTH-005·006·008·009·011·012 가 무너진다**(실측 `11 failed | 70 passed` = N 자신의 5건 + 이 여섯) — 즉 O 는 «N 의 기대값이 뒤집히는가» 로 판정한다. **`005` 가 따라오는 것은 확립 경로를 공유하기 때문이다** — ①이 뒤로 밀리고 ②가 지워지면 거절돼야 할 `welcome` 이 확립을 세우므로, 논스 재생성과 재생 증명 거절을 재는 005 가 함께 무너진다(`progress.md` §E.2.5 · §E.3 `thick_mutation_defense` 가 처음부터 여섯을 적고 있다) |

**변이 H 가 여럿을 무너뜨리는 것은 설계다.** 그 다섯(006·008·009·011·012)이 «증명 대조» 하나를 서로 다른 각도에서 재기 때문이다.

**과결합의 이유 — 표를 연역이 아니라 실측 지도로 만드는 일곱 주석.**

- **① C.** 양쪽을 **함께** 바꾸므로 서버와 채널은 여전히 같은 규칙에 합의한다 — 그래서 종단간 합의를 재는 013 이 생존하고, 009(방 결속)도 «전체 규칙 불일치» 라는 **잘못된 이유로** 통과한다. 반면 하네스 스텁은 정본 규칙(`nonce|room|bot`)으로 증명을 만들므로 확립이 실패해 005·007·011·015 와 형제 27건이 함께 무너진다. 001 은 서버 단독 기준이라 곧바로 잡는다. **즉 C 를 잡는 것은 표가 예측한 009 가 아니라 001 이다.**
- **② F.** 논스가 사라지면 하네스가 논스를 읽지 못해 확립이 실패한다. 다만 **거절**을 재는 기준(006·008·009·010·012)은 확립을 전제하지 않으므로 생존한다 — v0.4.0 의 «005~012·015 도 함께 무너진다» 는 실측보다 넓게 적혀 있었다.
- **③ G.** 논스가 소켓 밖 클로저로 올라가면 재접속이 같은 논스를 재사용하므로, 재접속을 재는 형제 `AC-CHANCLIENT-011` 이 함께 무너진다. **이 카드가 형제 기준을 무너뜨리는 유일한 소규모 변이다.**
- **④ H.** 대조가 항상 실패하므로 확립에 기대는 005 와, 거절의 부작용을 재는 010 이 표의 다섯에 더해진다.
- **⑤ I.** 존재 확인으로 바꾸면 **증명이 아예 없는** 위조 `welcome` 은 여전히 거절된다 — 그래서 011(증명 없는 위조 판정)이 **생존**한다. 대신 길이가 맞고 값이 틀린 경우가 통과하므로 008·009·012 가 무너지고, 확립 경로를 공유하는 005 가 따라온다.
- **⑥ J.** 어떤 `welcome` 도 확립되지 않으므로 확립 뒤를 재는 모든 것이 무너진다(형제 27건 포함). 표가 예측한 013 은 맞았고, 005·015 가 더해진다.
- **⑦ M.** 소켓을 닫지 않으면 010 의 «닫힘» 관측과 함께, 거절 뒤 재접속을 기다리는 012 의 관측도 시간 초과로 무너진다.

**남은 6행(A·B·D·E·K·L)은 예측과 실측이 완전히 일치했다** — A(001·013) · B(001·013) · D(002) · E(003) · K(012) · L(010).

**[HARD] O 의 형태를 한 문장으로 못 박는다**: `if (proofRejected) return` 을 **체인 밖 독립 문장으로 if/else 체인 뒤에** 옮긴다 — `else if (proofRejected) return` 로 **체인 분기에 끼우는 형태가 아니다.** 후자로 구현하면 `message` 프레임이 ②를 지운 뒤 그 분기에 걸려 변이 N 으로도 **O 가 지목한 기준들이 무너지지 않고**, run 이 «구조가 틀렸다» 로 오진한다 (2회차 감사 N-03).

**변이 N 과 O 가 이 카드의 굵은-변이 방어다.** N 은 두 게이트가 실제로 분리돼 있는지를, O 는 그 분리가 **구조 때문**임을(호칭이나 우연이 아니라) 확인한다. v0.1.0 은 N 만 두고 그 기대값을 «하나도 무너지지 않는다» 로 적었는데, **그때 지시한 구현 아래에서는 다섯이 무너졌다**(1회차 감사 C-02). 구조를 `plan.md` §F M3-3 이 [HARD] 로 처방한 지금은 기대값이 성립한다 — 그리고 O 가 그 처방을 지키지 않은 구현을 잡는다.

---

## Definition of Done

- [ ] REQ-GWAUTH-001~013 이 전부 구현됐다
- [ ] AC-GWAUTH-001~015 가 전부 통과한다
- [ ] 변이표 A~M 의 **`AC-GWAUTH-*` 집합이 표와 정확히 일치**하고, 형제 연쇄가 행에 적힌 **총 실패 수**와 같다 (v0.5.0 판정 규칙 — 변이표 서문)
- [ ] **변이 N 이 AC-GWAUTH-* 를 하나도 무너뜨리지 않는다** — 두 게이트의 분리가 실측으로 확인됐다
- [ ] **변이 O 를 넣으면 N 의 기대값이 뒤집힌다** — 분리가 구조에서 나온다는 것이 확인됐다
- [ ] `npm test` 가 250 이상 초록이고 base 대비 신규 실패 0
- [x] 형제 계약 개정 여덟 자리(`SPEC-CHANCLIENT-001` v0.6.0 7자리 + `SPEC-GATEWAY-001` v0.4.0 1자리)가 **plan 단계에서 닫혔다** — 운영자 결정 D3=(a), `plan.md` §B-1·§B-2. **run 단계에 남은 것은 하네스 6자리와 기준 본문 3건이며 M4 작업 항목이다**
- [ ] `spec.md` §5 의 경계 진술이 §E.2 에 그대로 남았다 — **«그 소켓의 `hello` 를 읽을 수 없고 토큰도 그 저장 해시도 모르는 상대를 배제했다. `hello` 를 받는 자리에 있는 상대는 닫지 못하며(후속 카드 `t22`), `bot_tokens.token_hash` 가 읽기 전용으로 유출된 배치도 닫지 않는다»**. 줄여 적으면 완료가 아니다. **v0.4.0 까지 이 자리가 요구하던 «토큰 또는 그 저장 해시를 모르는 상대를 배제했다» 는 이제 거짓이다**(sync 감사 F-01) — 그 문장이 §E.2 에 남아 있다면 그것도 미충족이다
- [ ] `spec.md` §3.3 C 부류의 형제 문장들을 **고치지 않았다**(git diff 로 확인)

---

## 잔여 위험

- **상수 시간 성질을 완전히 재는 기준이 없다.** AC-GWAUTH-012 는 길이 가드의 존재를 동작으로 잰다. 그러나 `===` 로 바꾼 구현은 예외를 던지지 않으므로 이 기준을 통과한다 — 타이밍 측정은 테스트 환경에서 신뢰할 수 없어 기준으로 두지 않았다. **이 자리는 코드 리뷰가 지킨다**(`plan.md` §G). 실질 위험은 낮다: 공격자가 얻는 것은 증명의 앞자리이고, 열쇠를 복원하려면 논스마다 새로 시작해야 하며 논스는 소켓마다 바뀐다.
- **`bot_name`·`missed_after_id` 는 인증되지 않는다**(`spec.md` §2.3). 현재 소비자가 없어 실제 영향이 없다는 판단에 근거하며, **소비자가 생기는 시점을 감지하는 기준은 없다.**
- **AC-GWAUTH-005·011 은 실제 시간 1,000ms 를 두 번 이상 기다린다.** 부하 걸린 기계에서 20초 타임아웃이 모자랄 여지가 있다. `sleep` 주입이 `wire()` 를 통해 노출되지 않아 가짜 타이머를 쓸 수 없었다 — 그 노출은 `SPEC-CHANWIRE-001` 계약 변경이라 이 카드 범위 밖이다.
- **`plan.md` §F M3-3 의 구조 처방은 SPEC 이 HOW 를 규정하는 자리다.** 구현 자유도를 좁히는 대가를 치른다. 그럼에도 이 자리는 «무엇을 관측할 수 있는가» 가 구조에 직접 달려 있어 불가피하다고 판단했다(1회차 감사 §8 도 같은 평가다). **구현이 더 나은 분리 구조를 찾으면 변이 N 의 기대값이 유지되는 한 그것을 택해도 된다** — 처방된 것은 구조의 문자가 아니라 «두 강제 지점이 분리되고 이 SPEC 의 것이 앞선다» 는 성질이다.
- **형제 붕괴 55건은 상한이지 실측이 아니다**(`spec.md` §3.2). `plan.md` §C 사전 점검이 실측한다.
- **하네스 네 자리가 증명을 계산하게 되면 그것들이 «서버를 흉내내는 코드» 가 된다.** 서버 규칙이 바뀌면 채널 기준이 무더기로 붉어진다 — 진단은 쉽지만 비용이 있다. AC-GWAUTH-013 이 그 어긋남의 방향을 가려 준다.
- **`deferWelcome` 순서에 기대는 기준 여섯이 생겼다**(006·007·008·009·011·012). 그 기준들은 «요청 프레임이 소켓이 열려 있는 동안 나간다» 는 성질에 의존하므로, 구현이 `hello` 직후 무언가를 이유로 소켓을 먼저 닫으면 전부 함께 붉어진다. 진단은 명확하지만(하네스 1·2단계가 타임아웃) 원인이 방어가 아니라 순서라는 점을 알아보려면 이 문단을 읽어야 한다.
