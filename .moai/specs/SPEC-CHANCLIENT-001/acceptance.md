# SPEC-CHANCLIENT-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 계획 디렉터리의 다른 문서나 초기 커밋에 담긴 v1 초안은 이 SPEC 의 참조 대상이 아니다.

## 이 문서가 지키는 검증 원칙

이 SPEC 의 수용 기준은 **구현 본문이 비어 있어도 통과하는 기준을 하나도 두지 않는다**. 이 부품은 배관이라 "예외가 나지 않았다"·"시간이 좀 지났다" 로 통과시키기 쉬운 자리가 많다. 각 자리마다 어떤 스텁이 순진한 기준을 뚫는지 적어 둔다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 재접속 백오프 | "잠시 뒤 다시 붙었다"는 백오프가 아예 없는 구현(즉시 재시도)도, 상한이 없는 구현도 통과시킨다 | 주입된 `sleep` 이 받은 **인자값의 수열**이 `[1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]` 인가 (AC-CHANCLIENT-012) |
| 10초 타임아웃 | 실제로 10초를 기다리는 테스트는 느린 기계에서 흔들리고, 그 흔들림은 타임아웃을 늘리는 방향으로 덮인다. "언젠가 reject 됐다"는 1초 타임아웃 구현도 통과시킨다 | 가짜 타이머로 9,999ms 에서 **아직 미결**, 1ms 를 더하면 **reject** — 상한값 10,000 을 양쪽에서 조인다 (AC-CHANCLIENT-009) |
| `rid` 매칭 | "약속이 resolve 됐다"는 `rid` 를 아예 보지 않고 **먼저 온 응답으로 먼저 온 요청을 채우는** 구현도 통과시킨다 | 두 요청을 띄우고 응답을 **역순으로** 보냈을 때 각 약속이 자기 응답을 받는가 (AC-CHANCLIENT-008) |
| 프레임 분배 | "`onMessage` 가 불렸다"는 마지막 갈래를 `else` 로 두어 모르는 프레임까지 흘려보내는 구현도 통과시킨다 | 알 수 없는 `type` 이 **어떤 콜백에도 가지 않는가**, 그리고 그 뒤 진짜 프레임은 여전히 도착하는가 (AC-CHANCLIENT-005) |
| `send` 의 `false` | "`false` 를 돌려준다"는 반환값만 조작하고 실제로는 보내는 구현도, 보내지 못한 것을 큐에 쌓아 두었다가 나중에 보내는 구현도 통과시킨다 | 그 프레임이 서버에 **도달하지 않았는가**를 나중에 도착한 표식 프레임을 기준으로 확인 (AC-CHANCLIENT-006) |
| `stop()` 이후 재접속 없음 | 부정 관측을 "조금 기다렸는데 아무 일도 없었다"로 재면 무엇도 재지 않은 것과 같다 | 같은 서버에 붙은 **대조군 클라이언트**가 실제로 재접속 대기에 들어간 시점을 기준선으로 삼고, 그 시점에 `stop()` 한 쪽의 `sleep` 호출이 `0` 인가 (AC-CHANCLIENT-014) |

같은 이유로 다음 형태는 이 문서에서 금지한다 — "파일이 존재한다", "함수가 export 돼 있다", "테스트 스위트가 통과한다(어떤 테스트인지 이름 없이)", 그리고 구현 본문을 지워도 참인 단언.

**반대 방향의 결함도 함께 막는다.** 공허한 기준이 정상 구현을 거짓 통과시킨다면, 잘못 쓴 기준은 **정상 구현을 거짓 실패시킨다.** 이 SPEC 에서 그 위험이 가장 큰 자리는 시간이다 — 원본 Task 12 의 테스트는 곳곳에서 `await new Promise(r => setTimeout(r, 100))` 로 결과를 기다리는데, 100ms 는 로컬 소켓 왕복의 여유분일 뿐 보장이 아니다. 부하가 걸린 기계에서 이 형태는 구현이 완벽해도 실패하고, 그 실패는 대개 "100 을 300 으로" 늘려 덮인다. **이 문서의 시나리오에는 고정 시간 대기가 한 줄도 없다** — 조건이 성립할 때까지 다시 보는 `waitFor` 로 바꾸었고, 성립하지 않으면 vitest 테스트 타임아웃으로 실패한다.

**이름 붙은 기존 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다.

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## 공통 테스트 하네스

아래 모든 시나리오는 `channel/test/gateway-client.test.ts` 의 다음 하네스를 쓴다. `plan-v2.md` Task 12 Step 1 의 `startServer()` 에 **아홉 가지가 더해졌다** (여섯째는 v0.4.0, 일곱째부터 아홉째까지는 v2 — 카드 `t22`, `SPEC-GWAUTH-002`).

**이 절은 실제 하네스를 원문으로 삼는다 (v2 갱신, 카드 `t22`).** 아래 코드는 `channel/test/gateway-client.test.ts` 의 현재 하네스를 그대로 옮긴 것이며, v1(`{ type:'hello', token }` → 맨몸 `welcome`) 하네스는 `SPEC-GWAUTH-002` 착지로 **없어졌다**. 열쇠 유도 헬퍼는 하네스가 **자체 계산**한다 — 구현을 부르지 않는 것이 사본 원칙이다(`SPEC-GWAUTH-002` `plan.md` §D-9).

1. **일괄 정리 목록 `cleanups`** — 원본은 각 테스트 끝에서 `client.stop(); srv.wss.close()` 를 손으로 부른다. 한 곳만 빠뜨려도 열린 소켓 때문에 vitest 프로세스가 종료되지 않는데, 그 누락은 리뷰에서 눈에 띄지 않는다. 정리 책임을 개별 테스트에서 걷어 냈다.
2. **`stopServer` 가 소켓을 먼저 끊는다** — `wss.close()` 는 리스닝만 멈추고 이미 수립된 연결은 남을 수 있다. 재접속 기준은 클라이언트가 `close` 를 **보는 것**이 전제라, 확실히 끊는 경로를 따로 두었다.
3. **`waitFor` (조건 폴링)** — 원본의 고정 시간 대기를 대체한다. 위 검증 원칙 절의 "반대 방향" 항목이 그 이유다.
4. **`sockets` 배열** — 서버가 수립한 연결을 순서대로 모은다. 재접속 관측과 응답 전송에 쓴다.
5. **`on(handler)` 훅** — 서버가 받은 프레임에 반응해 응답을 보내야 하는 시나리오(`history_response`)를 위한 자리.
6. **`autoWelcome` (v0.4.0, 카드 `t9` — v2 로 갱신, 카드 `t22`)** — **v2 핸드셰이크(`challenge` → `auth`)가 끝난 뒤** 봉투에 담은 `welcome` 으로 답한다. 기본값 `true`. REQ-CHANCLIENT-004·005 의 분배 의무가 세션 확립 뒤에만 성립하도록 개정됐으므로(§4.2), `welcome` 을 보내지 않는 서버 앞에서는 분배 기준이 **아무것도 관측하지 못한다** — 정상 구현인데도 `waitFor` 타임아웃과 10초 reject 로 실패한다. 이 손잡이가 없던 v0.3.0 하네스에서 깨지는 기준은 일곱 건이었다(전건 열거: `SPEC-CHANAUTH-001/spec.md` §3.2).

7. **v2 핸드셰이크 응답 (카드 `t22`, `SPEC-GWAUTH-002`)** — `hello` 를 받으면 새 `server_nonce` 를 만들어 `{ type:'challenge', server_nonce, room_id, bot_id, server_proof }` 로 답하고, `auth` 가 오면 그 소켓의 세션 열쇠를 세운다. `server_proof` 와 세션 열쇠는 하네스가 토큰 상수 `'tok123'` 에서 **자체 유도**한다(`skOf`·`pubOf`·`ksrvOf`·`challengeProofOf`·`sessKeyOf`). 채널 바인딩은 이 저장소의 배치가 TLS 를 종단하지 않으므로 리터럴 `unbound` 다(`SPEC-GWAUTH-002` §2.8.4·REQ-GWAUTH2-020).
8. **`sendInner(ws, inner)` (카드 `t22`)** — 확립 이후 서버가 보내는 **모든** 프레임은 봉투 `{ type:'env', seq, mac, payload }` 여야 하므로(REQ-GWAUTH2-012·013), 내부 프레임을 봉투에 담아 보내는 통로를 하네스가 지닌다. 확립되지 않은 소켓으로 부르면 **하네스가 던진다** — 봉투 없이 보내는 실수를 조용히 통과시키지 않기 위해서다. 아래 시나리오에서 v1 의 `srv.sockets[0].send(JSON.stringify(frame))` 자리는 전부 이 통로로 바뀌었다.
9. **`establishedCount()` (카드 `t22`)** — 세션이 선 소켓의 수를 돌려준다. `connected()` 가 「무엇을 기다릴 것인가」를 이 값으로 정한다: v1 에서는 `hello` 가 클라이언트의 마지막 악수 프레임이라 「`hello` 도착 = 확립」이 참이었으나, v2 가 악수를 넷으로 늘리면서 그 등식이 깨졌다. 대기 술어가 `sendInner` 가 요구하는 바로 그 조건(`sessions` 항목의 존재)을 읽으므로 「기다린 것」과 「필요한 것」이 같은 사실이 된다.

> **개정 이력 (v0.4.0).** 하네스 변경으로 본문이 함께 바뀐 기준은 **둘뿐**이다 — AC-CHANCLIENT-002(자기 `welcome` 하나만 세도록 `autoWelcome: false`)와 AC-CHANCLIENT-005(`seen` 기대값에 `'welcome'` 이 앞선다). 나머지 다섯(AC-003·004·007·008·010)은 **본문 한 글자도 바뀌지 않고** 하네스만으로 되살아난다. 개정하지 않은 아홉 건(AC-001·006·009·011·012·013·014·015·016)은 `welcome` 없이도 성립하므로 손대지 않았다.
>
> **v2 정정 (2026-08-31, 카드 `t22`).** 위 기록은 v0.4.0 시점에 대해 참이며 그대로 둔다. 다만 그때 «손대지 않았다» 로 적힌 아홉 건 중 **AC-001·011 두 건의 본문이 v2 에서 바뀌었다** — 두 기준 모두 `hello` 의 **리터럴 형태**를 단언하는데 v2 가 그 형태를 교체했기 때문이다(`SPEC-GWAUTH-002` REQ-GWAUTH2-004). 프레임 전달을 재는 나머지 기준들은 본문의 `send` 호출이 봉투 통로(`srv.sendInner`)로 바뀌었을 뿐 관측 대상은 그대로다.

**정리는 개별 테스트가 아니라 `cleanups` 가 한다.** 아래 시나리오 본문에는 `stop()` 도 `close()` 도 한 줄도 나오지 않는다 — 빠뜨릴 수 있는 자리를 없앤 것이다. `afterEach` 는 **가짜 타이머를 먼저 실제 타이머로 되돌린 뒤** 정리를 실행한다. 순서를 뒤집으면 AC-CHANCLIENT-009 가 남긴 가짜 타이머 위에서 서버 종료 콜백을 기다리게 되어 정리가 멈춘다.

```ts
import { describe, it, expect, afterEach, vi } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import type { AddressInfo } from 'node:net'
import { createHmac, createPrivateKey, createPublicKey, randomBytes } from 'node:crypto'
import { createGatewayClient, type GatewayClientOpts } from '../src/gateway-client.js'

// v2 열쇠 유도 헬퍼 — 이 파일이 자체 정의한다. src 의 구현을 부르지 않는다 (SPEC-GWAUTH-001 §3.5 —
// 사본이 함께 틀려도 기준이 알아채지 못하게 하려는 의도다). 이 하네스의 토큰 상수는 'tok123' 이다.
// (SPEC-GWAUTH-002 plan.md §D-9 — server/test 와 channel/test 는 각자의 사본을 지닌다.)
const skOf = (t: string) => createPrivateKey({
  key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), createHmac('sha256', t).update('minidiscord/v2/sign').digest()]),
  format: 'der', type: 'pkcs8',
})
const pubOf = (t: string) =>
  createPublicKey(skOf(t)).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
const ksrvOf = (t: string) => createHmac('sha256', t).update('minidiscord/v2/server-confirm').digest()
const challengeProofOf = (t: string, cn: string, sn: string, room: number, bot: number, pub: string) =>
  createHmac('sha256', ksrvOf(t)).update(`challenge|${cn}|${sn}|${room}|${bot}|${pub}|unbound`).digest('hex')
const sessKeyOf = (t: string, cn: string, sn: string, room: number, bot: number) =>
  createHmac('sha256', ksrvOf(t)).update(`session|${cn}|${sn}|${room}|${bot}|unbound`).digest()

// 열어 둔 자원(서버·클라이언트)의 일괄 정리 목록. 등록 역순으로 닫는다.
const cleanups: (() => void | Promise<void>)[] = []

afterEach(async () => {
  vi.useRealTimers()                                  // 정리보다 먼저 — 가짜 타이머 위에서 서버를 닫지 않는다
  for (const c of cleanups.splice(0).reverse()) await c()
})

interface FakeServer {
  wss: WebSocketServer
  messages: any[]                                     // 서버가 받은 프레임을 도착 순서대로
  sockets: WebSocket[]                                // 수립된 연결. length 가 곧 연결 횟수다
  on(handler: (ws: WebSocket, msg: any) => void): void
  url(): string
  sendInner(ws: WebSocket, inner: object): void       // v2 — 내부 프레임을 봉투에 담아 보낸다
  establishedCount(): number                          // v2 — 세션이 선 소켓의 수. sendInner 가 가능한 소켓만 센다
}

// autoWelcome: v2 핸드셰이크(challenge→auth)가 끝나면 봉투에 담긴 welcome 으로 답한다.
// REQ-CHANCLIENT-004·005 의 분배 의무가 세션 확립 뒤에만 성립하므로(SPEC-CHANAUTH-001 §4.1),
// welcome 을 보내지 않는 서버를 상대로는 프레임 분배 기준이 아무것도 관측하지 못한다.
// false 로 두는 자리는 하나뿐이다 — 자기 welcome 하나만 세는 AC-CHANCLIENT-002.
function startServer(opts: { autoWelcome?: boolean } = {}): FakeServer {
  const autoWelcome = opts.autoWelcome ?? true
  const wss = new WebSocketServer({ port: 0 })
  const messages: any[] = []
  const sockets: WebSocket[] = []
  const handlers: ((ws: WebSocket, msg: any) => void)[] = []
  const sessions = new Map<WebSocket, { sessKey: Buffer; seq: number }>()
  const pending = new Map<WebSocket, { cn: string; sn: string }>()
  let lastUrl = ''

  const sendInner = (ws: WebSocket, inner: object): void => {
    const s = sessions.get(ws)
    if (!s) throw new Error('하네스: 확립되지 않은 소켓으로 sendInner 를 불렀다')
    const payload = JSON.stringify(inner)
    s.seq += 1
    ws.send(JSON.stringify({ type: 'env', seq: s.seq, payload, mac: createHmac('sha256', s.sessKey).update(`${s.seq}|${payload}`).digest('hex') }))
  }

  wss.on('connection', ws => {
    sockets.push(ws)
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      messages.push(m)
      if (m.type === 'hello') {
        // v2 (SPEC-GWAUTH-002) — challenge 로 응답한다. 증명은 이 하네스가 자체 계산한다(구현 미호출).
        const sn = randomBytes(32).toString('hex')
        pending.set(ws, { cn: m.client_nonce, sn })
        ws.send(JSON.stringify({ type: 'challenge', server_nonce: sn, room_id: 1, bot_id: 2, server_proof: challengeProofOf('tok123', m.client_nonce, sn, 1, 2, m.pub) }))
        return
      }
      if (m.type === 'auth') {
        // auth 통과 — 이 소켓의 세션을 세우고 이후 모든 발신은 봉투로 나간다 (REQ-GWAUTH2-012·013)
        const p = pending.get(ws)!
        sessions.set(ws, { sessKey: sessKeyOf('tok123', p.cn, p.sn, 1, 2), seq: 0 })
        if (autoWelcome) sendInner(ws, { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm', missed_after_id: 0 })
        return
      }
      for (const h of handlers) h(ws, m)
    })
  })
  const srv: FakeServer = {
    wss, messages, sockets,
    on(handler) { handlers.push(handler) },
    sendInner,
    // 확립 = auth 처리에서 sessions 에 항목이 선 것. sendInner 가 요구하는 바로 그 조건이므로
    // 대기 술어가 이 값을 읽으면 「기다린 것」과 「필요한 것」이 같은 사실이 된다.
    establishedCount: () => sessions.size,
    // address() 는 리스닝 전·close 후에 null 을 내므로 마지막 유효 주소를 돌려준다 —
    // null.port 로 예외가 나면 클라이언트의 재시도 루프가 죽어 AC-CHANCLIENT-013 이
    // 백오프 리셋이 아니라 하네스 결함으로 실패한다 (plan.md §H: 원인 규명 후 기록).
    url: () => {
      const addr = wss.address()
      if (addr) lastUrl = `ws://127.0.0.1:${(addr as AddressInfo).port}/bot`
      return lastUrl
    },
  }
  cleanups.push(() => stopServer(srv))
  return srv
}

// 서버를 확실히 내린다. wss.close() 는 리스닝만 멈추므로 기존 연결을 먼저 끊는다 —
// 클라이언트가 'close' 를 보는 것이 재접속 기준의 전제다.
async function stopServer(srv: FakeServer): Promise<void> {
  for (const ws of srv.sockets) ws.terminate()
  await new Promise<void>(r => srv.wss.close(() => r()))
}

// 조건이 성립할 때까지 5ms 간격으로 다시 본다. 성립하지 않으면 반환하지 않고
// vitest 테스트 타임아웃으로 실패한다 — 그것이 의도다. 고정 시간 대기를 대체한다.
async function waitFor(cond: () => boolean): Promise<void> {
  while (!cond()) await new Promise(r => setTimeout(r, 5))
}

// 살아 있는 주소를 하나 만들고 곧바로 내려서 '아무도 없는 주소' 를 얻는다.
// 재접속 실패를 반복시키는 기준(AC-CHANCLIENT-012)이 쓴다.
async function deadUrl(): Promise<string> {
  const srv = startServer()
  const u = srv.url()
  await stopServer(srv)
  return u
}

// 클라이언트를 만들어 start() 하고, 그 클라이언트의 소켓에 «세션이 설 때까지» 기다린다.
// v1 에서는 hello 가 클라이언트가 보내는 마지막 악수 프레임이어서 「hello 도착 = 확립」이 참이었다.
// v2 가 악수를 hello → challenge → auth → 봉투 넷으로 늘리면서 그 등식이 깨졌는데(SPEC-GWAUTH-002)
// 이 술어만 v1 그대로 남아 있었다. hello 도착에서 반환하면 srv.sendInner 가 요구하는 세션이 아직
// 없어서, 곧바로 sendInner 를 부르는 기준들이 두 왕복의 창을 경주하고 부하에서 진다.
// 절대 개수가 아니라 «호출 전후의 증가» 를 재는 이유: 한 서버에 두 클라이언트를 붙이는 자리
// (AC-CHANCLIENT-014)에서 앞선 클라이언트의 확립을 자기 것으로 착각하지 않기 위해서다.
// sleeps 에는 재접속 대기 인자가 순서대로 쌓인다. 주입된 sleep 은 실제로 기다리지 않는다.
async function connected(srv: FakeServer, over: Partial<GatewayClientOpts> = {}) {
  const sleeps: number[] = []
  const establishedBefore = srv.establishedCount()
  const client = createGatewayClient({
    url: () => srv.url(),
    token: 'tok123',
    sleep: async ms => { sleeps.push(ms); await new Promise(r => setTimeout(r, 1)) },
    ...over,
  })
  cleanups.push(() => client.stop())
  client.start()
  await waitFor(() => srv.establishedCount() > establishedBefore)
  return { client, sleeps }
}
```

`waitFor` 가 이 문서의 **동기화 도구**이고, 주입된 `sleep` 이 기록하는 `sleeps` 배열이 **시간 관측 도구**다. 벽시계는 어느 기준에서도 판정 근거가 아니다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-CHANCLIENT-001 | REQ-CHANCLIENT-001 | 아래 본문 | 서버가 받은 **첫** 프레임의 키 집합이 정확히 `{ type, pub, client_nonce }` 이고, `pub` 이 토큰에서 유도한 값과 같고, 그 프레임 어디에도 평문 토큰이 없음. **v2 갱신 (카드 `t22`)**: v1 의 리터럴 `{ type:'hello', token:'tok123' }` 은 `SPEC-GWAUTH-002` §4.2(REQ-GWAUTH2-004)가 대체했고, 같은 키 집합을 전선에서 재는 자리는 AC-GWAUTH2-003 이다 |
| AC-CHANCLIENT-002 | REQ-CHANCLIENT-003 | 아래 본문 | `onWelcome` 인자가 `missed_after_id` 를 포함해 서버가 보낸 객체와 완전히 같음 |
| AC-CHANCLIENT-003 | REQ-CHANCLIENT-004 (message) | 아래 본문 | `onMessage` 인자가 `files` 배열과 `delivery:'cc'` 를 포함해 원 프레임과 완전히 같음 |
| AC-CHANCLIENT-004 | REQ-CHANCLIENT-004 (verdict) | 아래 본문 | `onVerdict` 인자의 `behavior` 가 정확히 `'deny'`, `request_id` 보존 |
| AC-CHANCLIENT-005 | REQ-CHANCLIENT-006 | 아래 본문 | 알 수 없는 `type` 이 세 콜백 어디에도 가지 않음 + 콜백 없는 클라이언트가 예외 없이 계속 동작 + **JSON 아닌 프레임 뒤에도 다음 정상 프레임이 배달되고 소켓이 살아 있음** |
| AC-CHANCLIENT-006 | REQ-CHANCLIENT-007 | 아래 본문 | 연결 전 `false` + 그 프레임 **미도달**, 연결 중 `true` + 도달, `stop()` 후 `false` |
| AC-CHANCLIENT-007 | REQ-CHANCLIENT-008 | 아래 본문 | `history_request` 프레임이 `since_id` 포함 다섯 키를 **최상위**에 그대로 실음 |
| AC-CHANCLIENT-008 | REQ-CHANCLIENT-005, 009 | 아래 본문 | 두 요청의 `rid` 가 서로 다르고, **역순** 응답에도 각 약속이 자기 프레임 전체로 resolve |
| AC-CHANCLIENT-009 | REQ-CHANCLIENT-011 | 아래 본문 | 가짜 타이머 9,999ms 미결 → 10,000ms reject |
| AC-CHANCLIENT-010 | REQ-CHANCLIENT-010 | 아래 본문 | 미연결 시 즉시 reject + `history_request` 미전송 + 이후 연결하면 정상 동작 |
| AC-CHANCLIENT-011 | REQ-CHANCLIENT-002, 012 | 아래 본문 | 끊긴 뒤 `sleep(1000)` 을 거쳐 **교체된 `opts.url`** 로 재접속하고 hello 재전송. **v2 갱신 (카드 `t22`)**: 재전송된 hello 의 키 집합도 `{ type, pub, client_nonce }` 이고, 그 `client_nonce` 가 **첫 소켓의 것과 다름** |
| AC-CHANCLIENT-012 | REQ-CHANCLIENT-013 | 아래 본문 | `sleeps` 가 `[1000,2000,4000,8000,16000,30000,30000,30000]`, `maxBackoffMs:2500` 이면 `[1000,2000,2500,2500]` |
| AC-CHANCLIENT-013 | REQ-CHANCLIENT-013 (리셋 절) | 아래 본문 | 재접속 성공 뒤 다시 끊겼을 때 첫 대기가 다시 `1000` |
| AC-CHANCLIENT-014 | REQ-CHANCLIENT-014 | 아래 본문 | 대조군이 재접속 대기에 든 시점에 `stop()` 한 쪽의 `sleep` 호출 `0` + `send` 가 `false` |
| AC-CHANCLIENT-015 | REQ-CHANCLIENT 범위 경계, `spec.md` §6 무상태 | 아래 본문 | 기준 SHA 확인 종료 코드 `0`, 변경 목록에 두 파일 존재·금지 파일 부재, `fs`/`process.env` grep 종료 코드 `1` |
| AC-CHANCLIENT-016 | RED→GREEN 전이 | 아래 본문 | 네 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-CHANCLIENT-001 — 소켓이 열리면 hello 가 첫 프레임으로 나간다

**Given** 게이트웨이를 흉내 내는 서버가 떠 있다.
**When** `channel/test/gateway-client.test.ts` 에 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('sends hello with the verifier pub as the very first frame', async () => {
  const srv = startServer()
  await connected(srv)
  expect(Object.keys(srv.messages[0]).sort()).toEqual(['client_nonce', 'pub', 'type'])
  expect(srv.messages[0].pub).toBe(pubOf('tok123'))
  expect(srv.messages[0].client_nonce).toMatch(/^[0-9a-f]{64}$/)   // 값은 고정하지 않는다 — 무작위성은 011 이 소켓 간 대조로 잰다
  expect(JSON.stringify(srv.messages[0])).not.toContain('tok123')  // 평문 토큰 부재 — v1 이 채운 자리다
})
```

**Then** 테스트가 통과한다. 키 집합을 `toEqual` 로 고정하므로 **필드가 더 있어도 없어도** 실패한다 — v1 의 `token` 을 함께 얹은 구현도, 논스를 빠뜨린 구현도 걸린다. `messages[0]` 을 보는 것이 "첫 프레임"의 관측이다 — hello 를 나중에 보내는 구현은 앞선 다른 프레임 때문에 이 인덱스에서 걸린다.

**논스 값을 고정하지 않는 이유**: 값은 소켓마다 새로 만들어지므로 리터럴로 잴 수 없다. 형식(64자 소문자 hex)만 여기서 재고, **소켓 사이에 달라지는가**는 AC-CHANCLIENT-011 이 두 서버의 `client_nonce` 를 대조해 잰다.

**마지막 단언이 v2 의 본체다.** v1 은 이 자리에 평문 토큰을 실었고 그것이 `SPEC-GWAUTH-002` §1.1 이 인계받은 결함이다. 전선의 직렬화 문자열에서 토큰 상수를 찾는 형태로 재므로, 필드 이름을 바꿔 숨긴 구현도 걸린다. 필드 이름을 `bot_pub` 따위로 바꾼 구현은 실제 게이트웨이에서 연결이 끊긴 뒤 재접속 루프에 흡수되어 **조용히** 실패한다 — 그 조용한 실패를 여기서 시끄럽게 만든다.

### AC-CHANCLIENT-002 — welcome 을 손대지 않고 그대로 넘긴다

**Given** 클라이언트가 연결돼 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('passes the welcome frame through untouched, extra fields included', async () => {
  const srv = startServer({ autoWelcome: false })   // 이 기준만 자기 welcome 하나를 직접 보낸다
  const got: any[] = []
  await connected(srv, { onWelcome: w => got.push(w) })
  const frame = { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm', missed_after_id: 42 }
  srv.sendInner(srv.sockets[0], frame)
  await waitFor(() => got.length === 1)
  expect(got[0]).toEqual(frame)
})
```

**Then** 테스트가 통과한다. `missed_after_id` 를 단언하는 부분이 이 기준의 핵심이다 — 옵션 타입에 그 필드가 없다는 이유로 `{ room_id, bot_id, bot_name }` 세 개만 골라 새 객체로 넘기는 구현은 여기서 걸린다.

**`autoWelcome: false` 인 이유 (v0.4.0 — v2 로 갱신, 카드 `t22`).** 하네스 기본값은 v2 핸드셰이크가 끝나면 봉투에 담은 `welcome` 으로 답하는 것인데, 이 기준은 `got.length === 1` 로 **정확히 하나**를 세므로 하네스가 보낸 `welcome` 이 섞이면 두 건이 되어 무너진다. 이 기준의 관측 대상은 세션 확립이 아니라 프레임의 **통과 충실성**이므로, 자기 프레임 하나만 보내는 형태를 유지한다 — 그래서 하네스 손잡이를 껐다. 이 SPEC 에서 `autoWelcome: false` 를 쓰는 자리는 여기 하나뿐이다. **v2 에서는 이 자기 프레임도 봉투로 나간다** — `srv.sendInner` 가 그 통로이고, 봉투 밖으로 도착한 확립 후 프레임은 어떤 콜백에도 가지 않으므로(`SPEC-GWAUTH-002` REQ-GWAUTH2-014) 맨몸으로 보내면 이 기준은 «전달되지 않음» 으로 무너진다.

이 기준이 재는 것은 그 필드의 쓰임이 아니라 **통과 충실성**이다. `missed_after_id` 의 소비자는 서버 자신이고(`server/src/gateway.ts:101-108` 이 그 커서 이후를 스스로 재전송한다), 채널 쪽에는 이 값을 읽는 자리가 없다. 그런데도 단언하는 이유는, 클라이언트가 해석하지 않는 필드를 좁혀 버리는 구현은 **지금 실려 오는 필드도 나중에 늘어날 필드도 똑같이 잃기** 때문이다. 그 손실은 **타입 검사로 잡히지 않고**, 클라이언트가 필드의 의미를 모르므로 무엇이 사라졌는지 스스로 알 수도 없다. `missed_after_id` 는 그 부류를 잡기 위한 관측 대상이지, 이 SPEC 이 지키는 기능이 아니다(REQ-CHANCLIENT-003).

### AC-CHANCLIENT-003 — message 를 손대지 않고 그대로 넘긴다

**Given** 클라이언트가 연결돼 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('passes the message frame through untouched, files and delivery included', async () => {
  const srv = startServer()
  const got: any[] = []
  await connected(srv, { onMessage: m => got.push(m) })
  const frame = {
    type: 'message', id: 7, body: '안녕', author_name: 'alice', delivery: 'cc',
    files: [{ name: 'a.png', local_path: '/tmp/up/a.png' }],
  }
  srv.sendInner(srv.sockets[0], frame)
  await waitFor(() => got.length === 1)
  expect(got[0]).toEqual(frame)
})
```

**Then** 테스트가 통과한다. `files` 와 `delivery` 를 함께 단언하는 이유는 둘 다 **없어도 아무 오류가 나지 않는** 필드이기 때문이다. 첨부를 잃으면 봇은 파일이 온 줄 모르고, `delivery` 를 잃으면 `@CC` 로 스쳐 지나간 메시지를 자기에게 온 지시로 오해한다.

### AC-CHANCLIENT-004 — 판정을 판정으로 넘긴다

**Given** 클라이언트가 연결돼 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('passes a deny verdict through as deny', async () => {
  const srv = startServer()
  const got: any[] = []
  await connected(srv, { onVerdict: v => got.push(v) })
  srv.sendInner(srv.sockets[0], { type: 'permission_verdict', request_id: 'abcde', behavior: 'deny' })
  await waitFor(() => got.length === 1)
  expect(got[0]).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'deny' })
})
```

**Then** 테스트가 통과한다. `'deny'` 를 쓰는 이유는 값을 읽지 않는 구현이 **거절을 승인으로 뒤집을** 수 있기 때문이다. `'allow'` 로만 시험하면 값을 상수로 박은 구현도 통과한다 — 이 시스템에서 가장 비싼 오작동이라 판정을 실어 나르는 이 부품에서도 값을 직접 단언한다.

### AC-CHANCLIENT-005 — 모르는 프레임도 깨진 프레임도 어디로도 새지 않고, 프로세스를 끝내지도 않는다

**Given** 클라이언트가 세 콜백을 모두 지정하고 연결돼 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('routes by type only — an unknown frame reaches no callback', async () => {
  const srv = startServer()
  const seen: string[] = []
  await connected(srv, {
    onMessage: () => seen.push('message'),
    onVerdict: () => seen.push('verdict'),
    onWelcome: () => seen.push('welcome'),
  })
  const sock = srv.sockets[0]
  srv.sendInner(sock, { type: 'presence', body: '모르는 프레임' })   // 먼저 보낸다
  srv.sendInner(sock, { type: 'message', id: 1, body: 'x', author_name: 'a', delivery: 'to' })
  await waitFor(() => seen.length >= 2)
  // 하네스가 v2 핸드셰이크를 마치고 봉투 welcome 으로 답하므로 welcome 이 먼저 온다 (v0.4.0, v2 갱신 t22).
  // 미지의 프레임 presence 는 그 사이에 있었고 세지 않았다.
  expect(seen).toEqual(['welcome', 'message'])
})

it('survives frames whose callback was not provided', async () => {
  const srv = startServer()
  const { client } = await connected(srv)     // 콜백 없음
  const sock = srv.sockets[0]
  srv.sendInner(sock, { type: 'message', id: 1, body: 'x', author_name: 'a', delivery: 'to' })
  srv.sendInner(sock, { type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
  expect(client.send({ type: 'still_alive' })).toBe(true)
  await waitFor(() => srv.messages.some(m => m.type === 'still_alive'))
})
```

```ts
// 회귀: JSON 아닌 프레임 한 개가 프로세스를 끝내지 않는다 (감사 F-05)
it('drops a malformed frame and keeps processing the next valid one', async () => {
  const srv = startServer()
  const got: any[] = []
  const { client } = await connected(srv, { onMessage: m => got.push(m) })
  const sock = srv.sockets[0]
  sock.send('not-json{')                                   // 먼저 깨진 프레임 — 전선의 비(非)JSON 도 버려진다
  const frame = { type: 'message', id: 1, body: 'x', author_name: 'a', delivery: 'to' }
  srv.sendInner(sock, frame)                                // 그 뒤 정상 봉투
  await waitFor(() => got.length === 1)
  expect(got[0]).toEqual(frame)                             // 깨진 프레임 뒤에도 배달된다
  expect(client.send({ type: 'still_alive' })).toBe(true)   // 연결도 살아 있다
  await waitFor(() => srv.messages.some(m => m.type === 'still_alive'))
})
```

**Then** 세 테스트가 통과한다.

첫 테스트의 판정 근거는 **순서**다. 한 소켓 위의 프레임은 보낸 순서대로 도착하므로, 하네스의 `welcome` → 미지의 `presence` → `message` 순으로 처리된다. 미지의 프레임은 `message` 보다 먼저 처리되므로, 마지막 갈래를 `else { opts.onMessage?.(msg) }` 로 둔 구현에서는 `seen` 이 `['welcome','message','message']` 가 되어 `toEqual` 이 실패한다.

**기대값에 `'welcome'` 이 앞서는 것이 v0.4.0 개정이다.** 세션 확립 전제(§4.2)가 붙었으므로 `welcome` 없이는 `message` 자체가 분배되지 않고, 그러면 이 기준은 구현이 옳아도 `waitFor` 타임아웃으로 실패한다. `welcome` 을 세지 않도록 `onWelcome` 을 빼는 방법도 있었지만 그렇게 하지 않았다 — 그 콜백을 등록해 두는 것이 "미지의 프레임이 **세 콜백 어디로도** 새지 않는다"를 재는 형태이기 때문이다. 고정 시간 대기 없이 부정 관측을 하는 방법이기도 하다 — 뒤에 보낸 프레임의 도착이 앞의 것이 이미 처리됐다는 증거다.

둘째 테스트는 콜백이 없을 때 예외로 죽지 않는지를 본다. 관측 대상은 "예외가 안 났다"가 아니라 **그 뒤에도 소켓으로 프레임을 보낼 수 있는가**다 — 죽은 클라이언트는 그 단언을 통과할 수 없다.

셋째 테스트(v0.3.0 추가, 감사 F-05)가 재는 것은 **파싱 실패한 프레임 뒤에도 배선이 살아 있는가**다. `ws.on('message')` 리스너 안의 throw 는 `uncaughtException` 으로 올라가 프로세스를 끝내므로 — 재접속조차 일어나지 않는다, 프로세스가 없기 때문이다 — "예외를 안 던진다"를 단언해서는 잡히지 않는다. 그래서 두 단언을 짝으로 둔다: 깨진 프레임 **뒤에** 보낸 정상 프레임이 `onMessage` 에 도착했는가(리스너가 살아 있다), 그리고 그 소켓으로 다시 보낼 수 있는가(프로세스가 살아 있다).

**이 기준을 무너뜨리는 것**: `gateway-client.ts` 의 `try { msg = JSON.parse(String(d)) } catch { return }` 를 v0.2.1 의 무방비 `JSON.parse` 로 되돌리는 구현. 변이 `M-F05 revert try/catch` 로 실행 확인했다 — 이 테스트 한 건만 실패했다(`.moai/state/verify/t4-sync-fix/mutation-report.json`). 되돌린 구현에서 `waitFor` 는 정상 프레임을 영영 보지 못한다.

### AC-CHANCLIENT-006 — send 의 `true`/`false` 가 실제 전송과 일치한다

**Given** 서버가 떠 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('sends only while open, and reports it truthfully', async () => {
  const srv = startServer()
  const sleeps: number[] = []
  const client = createGatewayClient({
    url: () => srv.url(), token: 'tok123',
    sleep: async ms => { sleeps.push(ms); await new Promise(r => setTimeout(r, 1)) },
  })
  cleanups.push(() => client.stop())

  expect(client.send({ type: 'too_early' })).toBe(false)      // 연결 전
  client.start()
  await waitFor(() => srv.messages.some(m => m.type === 'hello'))

  expect(client.send({ type: 'marker' })).toBe(true)
  await waitFor(() => srv.messages.some(m => m.type === 'marker'))
  expect(srv.messages.some(m => m.type === 'too_early')).toBe(false)   // 큐잉도 없다

  client.stop()
  await waitFor(() => srv.sockets[0].readyState === WebSocket.CLOSED)
  expect(client.send({ type: 'too_late' })).toBe(false)
})
```

**Then** 테스트가 통과한다.

`too_early` 의 부재를 **`marker` 도착 이후에** 확인하는 것이 이 기준의 설계다. 연결 전 payload 를 큐에 담아 두었다가 `open` 때 보내는 구현이라면 그 프레임은 `marker` 보다 먼저 도착하므로, `marker` 가 보인 시점에는 이미 목록에 있다. 고정 시간 대기 없이 "보내지 않았다"를 재는 방법이다.

반환값만 `false` 로 조작하고 실제로는 보내는 구현은 `too_early` 단언에서, 보내지 못했는데 `true` 를 돌려주는 구현은 `too_late` 단언에서 걸린다.

### AC-CHANCLIENT-007 — 이력 요청 프레임이 다섯 파라미터를 그대로 싣는다

**Given** 클라이언트가 연결돼 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('puts every history parameter on the frame top level, since_id included', async () => {
  const srv = startServer()
  const { client } = await connected(srv)
  const p = client.requestHistory({ since_id: 41, since: '2026-08-01', until: '2026-08-02', speaker: 'alice', limit: 5 })
  await waitFor(() => srv.messages.some(m => m.type === 'history_request'))

  const frame = srv.messages.find(m => m.type === 'history_request')!
  expect(typeof frame.rid).toBe('string')
  expect(frame.rid.length).toBeGreaterThan(0)
  const { rid, ...rest } = frame
  expect(rest).toEqual({
    type: 'history_request',
    since_id: 41, since: '2026-08-01', until: '2026-08-02', speaker: 'alice', limit: 5,
  })

  srv.sendInner(srv.sockets[0], { type: 'history_response', rid, messages: [] })
  await p                                       // 남은 약속을 정리한다 (열린 타이머를 남기지 않는다)
})
```

**Then** 테스트가 통과한다. `rid` 를 뺀 나머지에 `toEqual` 을 거는 것이 핵심이다 — 파라미터를 `{ params: {...} }` 로 감싼 구현, `since_id` 를 빠뜨린 구현, 키 이름을 `sinceId` 로 바꾼 구현이 모두 여기서 걸린다.

`since_id` 를 따로 적어 두는 이유는 그것이 **유일하게 정확한 커서**이기 때문이다(`plan-v2.md` 2026-08-26 변경 이력). 이 키가 새면 봇은 시각 기반 근사로 되돌아가 같은 메시지를 다시 받거나 건너뛰는데, 어느 쪽도 오류로 드러나지 않는다.

마지막 두 줄은 단언이 아니라 위생이다. 응답 없이 테스트를 끝내면 10초짜리 타이머가 살아남는다.

### AC-CHANCLIENT-008 — rid 로 맞추고, 도착 순서로 맞추지 않는다

**Given** 클라이언트가 연결돼 있고 두 이력 요청이 동시에 떠 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('matches responses by rid, not by arrival order', async () => {
  const srv = startServer()
  const { client } = await connected(srv)
  const rids: string[] = []
  srv.on((_ws, m) => { if (m.type === 'history_request') rids.push(m.rid) })

  const p1 = client.requestHistory({ limit: 1 })
  const p2 = client.requestHistory({ limit: 2 })
  await waitFor(() => rids.length === 2)
  expect(rids[0]).not.toBe(rids[1])                       // 요청마다 다른 rid

  const sock = srv.sockets[0]
  srv.sendInner(sock, { type: 'history_response', rid: rids[1], messages: [{ id: 2 }] })   // 역순
  srv.sendInner(sock, { type: 'history_response', rid: rids[0], messages: [{ id: 1 }] })

  expect(await p1).toEqual({ type: 'history_response', rid: rids[0], messages: [{ id: 1 }] })
  expect(await p2).toEqual({ type: 'history_response', rid: rids[1], messages: [{ id: 2 }] })
})
```

**Then** 테스트가 통과한다. 세 종류의 잘못된 구현이 여기서 걸린다 — `rid` 를 고정값으로 두는 구현(첫 단언), 대기 자리를 하나만 두어 두 번째 요청이 첫 번째를 덮어쓰는 구현, 그리고 `rid` 를 보지 않고 **먼저 온 응답을 먼저 온 요청에 채우는** 구현(응답을 일부러 역순으로 보냈다).

`toEqual` 의 기대값이 `messages` 만이 아니라 **프레임 전체**인 것도 계약이다 — `messages` 만 꺼내 resolve 하는 구현은 `SPEC-CHANWIRE-001` 이 `rid` 나 뒤에 추가될 필드를 볼 수 없게 만든다.

### AC-CHANCLIENT-009 — 10초에 정확히 끊는다

**Given** 클라이언트가 연결돼 있고 서버는 이력 요청에 답하지 않는다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('rejects a history request at 10 seconds, not before', async () => {
  const srv = startServer()
  const { client } = await connected(srv)            // 연결까지는 실제 타이머로 마친다
  vi.useFakeTimers()                                  // 그 뒤에만 시간을 가짜로 바꾼다

  const p = client.requestHistory({ limit: 1 })
  let state: 'pending' | 'resolved' | 'rejected' = 'pending'
  p.then(() => { state = 'resolved' }, () => { state = 'rejected' })

  await vi.advanceTimersByTimeAsync(9_999)
  expect(state).toBe('pending')                       // 9,999ms 에는 아직 살아 있다
  await vi.advanceTimersByTimeAsync(1)
  expect(state).toBe('rejected')                      // 10,000ms 에 끊긴다
  await expect(p).rejects.toThrow()
})
```

**Then** 테스트가 통과한다. 상한값을 **양쪽에서** 조이는 것이 이 기준의 존재 이유다 — 아래쪽 단언(9,999ms 미결)이 1초·5초짜리 타임아웃을 걸러 내고, 위쪽 단언(10,000ms reject)이 타임아웃을 아예 걸지 않은 구현을 걸러 낸다. 한쪽만 있으면 둘 중 하나가 그대로 통과한다.

가짜 타이머를 **연결이 끝난 뒤에** 켜는 순서가 중요하다. 연결 수립은 소켓 I/O 라 시간을 멈춰도 진행되지만, 하네스의 `waitFor` 는 `setTimeout` 위에 서 있어 가짜 타이머 아래에서는 스스로 진행하지 못한다.

### AC-CHANCLIENT-010 — 연결이 없으면 즉시 실패하고 흔적을 남기지 않는다

**Given** 아직 `start()` 하지 않은 클라이언트가 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('fails a history request immediately when not connected, and recovers after connecting', async () => {
  const srv = startServer()
  const client = createGatewayClient({ url: () => srv.url(), token: 'tok123', sleep: async () => {} })
  cleanups.push(() => client.stop())

  await expect(client.requestHistory({ limit: 1 })).rejects.toThrow()
  expect(srv.messages.length).toBe(0)                 // 아무 프레임도 나가지 않았다

  srv.on((ws, m) => {
    if (m.type === 'history_request') srv.sendInner(ws, { type: 'history_response', rid: m.rid, messages: [] })
  })
  client.start()
  await waitFor(() => srv.messages.some(m => m.type === 'hello'))
  expect(await client.requestHistory({ limit: 1 })).toEqual(
    expect.objectContaining({ type: 'history_response', messages: [] }),
  )
})
```

**Then** 테스트가 통과한다.

부정 단언(`rejects`, 프레임 0건)에 **양성 짝**을 붙인 것이 이 기준의 설계다. "실패했다"만 보면 `requestHistory` 가 늘 실패하는 구현도 통과하고, 첫 요청이 대기 맵에 남긴 찌꺼기 때문에 이후 요청이 망가지는 구현도 통과한다. 뒤이은 진짜 요청이 정상적으로 resolve 되는 것까지 봐야 판정이 성립한다.

### AC-CHANCLIENT-011 — 끊기면 대기 후 새 주소로 다시 붙는다

**Given** 클라이언트가 서버에 붙어 있다가 그 서버가 내려갔다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('waits then reconnects to the replaced opts.url and says hello again', async () => {
  const srv1 = startServer()
  const { client, sleeps } = await connected(srv1)
  const nonce1 = srv1.messages.find(m => m.type === 'hello').client_nonce

  const srv2 = startServer()                          // 새 포트에 두 번째 서버
  client.opts.url = srv2.url()                        // 문자열 형태로 교체 (원본 계약의 노출 경로)
  await stopServer(srv1)                              // 연결이 끊긴다

  await waitFor(() => srv2.messages.some(m => m.type === 'hello'))
  expect(sleeps[0]).toBe(1000)                        // 즉시 재시도가 아니라 1초를 기다렸다
  expect(Object.keys(srv2.messages[0]).sort()).toEqual(['client_nonce', 'pub', 'type'])
  expect(srv2.messages[0].pub).toBe(pubOf('tok123'))
  expect(srv2.messages[0].client_nonce).not.toBe(nonce1)   // 소켓이 바뀌면 논스도 새로 만들어진다
})
```

**Then** 테스트가 통과한다. 네 가지를 한 번에 관측한다 — 재접속이 **일어났고**(두 번째 서버가 연결을 받았다), 그 전에 **기다렸고**(`sleeps[0] === 1000`, 즉시 재시도 구현은 여기서 걸린다), 새 소켓에서 **handshake 를 다시 했고**(`srv2.messages[0]` 의 키 집합이 v2 의 셋), 그 소켓의 **논스가 새로 만들어졌다**(`nonce1` 과 다르다). 마지막 항목이 v2 갱신분이며, 소켓 사이 논스 재사용 금지(`SPEC-GWAUTH-002` REQ-GWAUTH2-010)를 이 SPEC 쪽에서 관측하는 유일한 자리다 — 논스를 클로저로 한 번만 만드는 구현은 여기서 걸린다.

`client.opts.url` 을 문자열로 바꾼 뒤 그 값이 실제로 쓰이는 것이 REQ-CHANCLIENT-002 의 관측이다. `url` 을 한 번 평가해 캐시한 구현은 계속 죽은 첫 주소로 시도하고, 두 번째 서버는 영영 연결을 받지 못해 `waitFor` 가 테스트 타임아웃으로 실패한다.

### AC-CHANCLIENT-012 — 백오프가 두 배씩 늘고 상한에서 멈춘다

**Given** 아무도 없는 주소가 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('doubles the backoff and never exceeds the ceiling', async () => {
  const url = await deadUrl()

  const sleepsA: number[] = []
  const a = createGatewayClient({
    url, token: 't', sleep: async ms => { sleepsA.push(ms); await new Promise(r => setTimeout(r, 1)) },
  })
  cleanups.push(() => a.stop())
  a.start()
  await waitFor(() => sleepsA.length >= 8)
  expect(sleepsA.slice(0, 8)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000])

  const sleepsB: number[] = []
  const b = createGatewayClient({
    url, token: 't', maxBackoffMs: 2500,
    sleep: async ms => { sleepsB.push(ms); await new Promise(r => setTimeout(r, 1)) },
  })
  cleanups.push(() => b.stop())
  b.start()
  await waitFor(() => sleepsB.length >= 4)
  expect(sleepsB.slice(0, 4)).toEqual([1000, 2000, 2500, 2500])
})
```

**Then** 테스트가 통과한다. 관측 대상은 **주입된 `sleep` 이 받은 인자값의 수열**이다 — 실제로 기다린 시간이 아니다. 주입된 `sleep` 은 1ms 만에 돌아오므로 30초 상한까지 확인하는 데 실제로 드는 시간은 수십 밀리초다.

수열의 여섯 번째 값이 이 기준의 급소다. 두 배 규칙만 있고 상한이 없는 구현은 거기서 `32000` 을 내고, 상한만 있고 두 배 규칙이 없는 구현은 처음부터 같은 값을 반복한다. `maxBackoffMs` 를 준 두 번째 클라이언트는 기본값 `30000` 이 하드코딩된 구현을 걸러 낸다 — 옵션을 무시하면 `[1000,2000,4000,8000…]` 이 나온다.

### AC-CHANCLIENT-013 — 연결에 성공하면 백오프가 처음으로 돌아간다

**Given** 클라이언트가 한 번 끊겼다가 다시 붙었다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('resets the backoff to 1000 after a successful connection', async () => {
  let current = startServer()
  const sleeps: number[] = []
  const client = createGatewayClient({
    url: () => current.url(),                          // 함수 형태 — 시도할 때마다 다시 평가된다
    token: 'tok123',
    sleep: async ms => { sleeps.push(ms); await new Promise(r => setTimeout(r, 1)) },
  })
  cleanups.push(() => client.stop())
  client.start()
  await waitFor(() => current.messages.some(m => m.type === 'hello'))

  await stopServer(current)                            // 1차 절단
  await waitFor(() => sleeps.length >= 1)
  expect(sleeps[0]).toBe(1000)

  current = startServer()                              // 새 서버 — 재접속이 성공한다
  await waitFor(() => current.messages.some(m => m.type === 'hello'))
  const before = sleeps.length

  await stopServer(current)                            // 2차 절단
  await waitFor(() => sleeps.length > before)
  expect(sleeps[before]).toBe(1000)                    // 이어서 자란 값이 아니라 처음 값
})
```

**Then** 테스트가 통과한다. 1차 절단과 2차 절단 사이에 클라이언트는 죽은 주소로 여러 번 시도하며 백오프를 키웠을 수 있다 — 그래서 2차 절단 직후의 대기값을 `sleeps[before]` 로 **그 시점부터** 읽는다. `open` 에서 리셋하지 않는 구현은 여기서 `2000` 이상을 낸다.

이 기준이 없으면 짧게 끊겼다 붙기를 반복하는 봇이 서서히 30초를 기다리는 봇으로 변해 간다. 그 변화는 어느 순간에도 오류로 드러나지 않고, 사람 눈에는 "요즘 봇이 좀 느리다" 로만 보인다.

`url` 을 함수로 준 것도 이 기준의 일부다 — AC-CHANCLIENT-011 이 문자열 교체를, 이 기준이 함수 재평가를 덮어 `UrlRef` 두 형태가 모두 관측된다.

### AC-CHANCLIENT-014 — stop() 뒤에는 다시 붙지 않는다 (부정 사례)

**Given** 같은 서버에 클라이언트 둘이 붙어 있고, 그중 하나만 `stop()` 했다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('never reconnects after stop() — measured against a live control client', async () => {
  const srv = startServer()
  const stopped = await connected(srv)
  const control = await connected(srv)                 // 대조군: 멈추지 않는다
  await waitFor(() => srv.sockets.length === 2)

  stopped.client.stop()
  await stopServer(srv)                                // 두 클라이언트 모두 소켓이 끊긴다

  await waitFor(() => control.sleeps.length >= 1)      // 대조군이 재접속 대기에 들어간 시점이 기준선
  expect(stopped.sleeps).toEqual([])                   // 멈춘 쪽은 대기조차 하지 않았다
  expect(stopped.client.send({ type: 'anything' })).toBe(false)
})
```

**Then** 테스트가 통과한다.

부정 관측의 기준선을 **대조군의 양성 사건**에 묶은 것이 이 기준의 설계다. "잠깐 기다렸는데 아무 일도 없었다"는 기다린 시간이 짧았을 뿐일 수도 있어 아무것도 재지 않는다. 같은 절단을 겪은 대조군이 **실제로 재접속 대기에 들어간 그 시점**이라면, 멈춘 쪽도 그럴 기회가 있었다는 뜻이다. `stopped` 가드가 빠진 구현은 그 시점에 이미 `sleeps` 에 `1000` 을 기록해 두었으므로 `toEqual([])` 이 실패한다.

마지막 줄은 `stop()` 이 소켓을 실제로 닫았는지 본다 — 플래그만 세우고 소켓을 열어 둔 구현은 `send` 가 `true` 를 돌려주어 걸린다.

### AC-CHANCLIENT-015 — 범위 경계와 무상태

**Given** M1 단계 0 에서 `spec_base_sha` 를 기록해 두었다.
**When** 다음 명령을 순서대로 실행한다.

```bash
SHA=$(cat .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha)
git rev-parse --verify "$SHA^{commit}"
git diff --name-only "$SHA"
grep -nE "node:fs|from 'fs'|require\('fs'\)|process\.env" channel/src/gateway-client.ts
```

**Then** 다섯 가지가 모두 관측된다.

1. `git rev-parse --verify` 가 **종료 코드 `0`** 으로 SHA 를 출력한다. 이 확인이 먼저다 — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비우므로, 빈 출력만 보고 통과로 적으면 검사가 통째로 무력해진다.
2. `git diff --name-only` 의 출력에 `channel/src/gateway-client.ts` 와 `channel/test/gateway-client.test.ts` 가 **둘 다 있다**.
3. 그 출력에 `server/` 로 시작하는 줄이 **하나도 없다**. 이 SPEC 은 서버를 고치지 않는다.
4. 그 출력에 `channel/src/index.ts` 와 `channel/src/channel-server.ts` 가 **없다**. 형제 SPEC(`SPEC-CHANWIRE-001`, `SPEC-CHANNEL-001`) 소유 파일이다.
5. `grep` 이 **종료 코드 `1`**(일치 없음)로 끝난다. 이 부품은 파일을 쓰지 않고 환경변수를 읽지 않는다 — Global Constraints 의 무상태 조항이자 `spec.md` §6 이다. 설정은 오직 `opts` 로만 들어온다.

변경 파일의 **개수**가 아니라 있어야 할 두 파일과 있어서는 안 되는 파일 집합을 본다. 형제 SPEC 이 같은 브랜치에 먼저 착지했더라도 이 SPEC 의 기준 SHA 는 그 뒤에 기록되므로, 이 검사는 그 착지에 흔들리지 않는다.

### AC-CHANCLIENT-016 — RED→GREEN 전이

**Given** 각 마일스톤이 테스트를 먼저 쓴다.
**When** `plan.md` §F 의 마일스톤 절차를 따라 실행하고 각 단계 출력을 `progress.md` §E.2 에 원문으로 남긴다.
**Then** 네 전이가 순서대로 관측된다.

| 전이 | 시점 | 관측할 결과 |
|------|------|-------------|
| 1 (RED) | M1 테스트 작성 직후 | `npm test -w channel` 실패, 사유가 `Cannot find module '../src/gateway-client.js'` |
| 2 (GREEN) | M1 구현 후 | `npm test -w channel` 통과 + `npm run typecheck -w channel` 종료 코드 `0` |
| 3 (RED) | M2 테스트 작성 직후 | `npm test -w channel` 실패, 사유가 **새 단언 실패** (모듈 부재가 **아님**) |
| 4 (GREEN) | M2 구현 후 | `npm test -w channel` 전체 통과 + typecheck 종료 코드 `0` |

전이 3 의 실패 사유를 구분해 적는 것이 이 기준의 핵심이다. 모듈 부재로 실패한 것을 RED 로 적으면 그 마일스톤의 테스트가 실제로 무엇을 재는지 아무도 확인하지 않은 채 넘어간다.

---

## 엣지 케이스

| 상황 | 기대 동작 | 덮는 기준 |
|------|-----------|-----------|
| `stop()` 을 두 번 부른다 | 두 번째는 아무 일도 하지 않는다. 재접속도 없다 | AC-CHANCLIENT-014 (`stopped` 플래그가 이미 서 있다) |
| 재접속 대기 중에 `stop()` 을 부른다 | 대기가 끝난 뒤 `connect()` 가 `stopped` 를 보고 그대로 돌아온다. 새 소켓은 열리지 않는다 | AC-CHANCLIENT-014 (같은 가드) |
| 재접속 대기 중에 `send` 를 부른다 | 소켓이 없으므로 `false`. 큐에 담지 않는다 | AC-CHANCLIENT-006 (연결 전 갈래와 같은 경로) |
| 모르는 `rid` 의 `history_response` 가 온다 | 대기 맵에 없으므로 조용히 무시한다. 어떤 콜백에도 가지 않는다 | AC-CHANCLIENT-005 (분배 규칙), AC-CHANCLIENT-008 (rid 조회) |
| 타임아웃된 요청의 응답이 뒤늦게 온다 | 이미 맵에서 지워졌으므로 무시된다. 두 번 settle 되지 않는다 | AC-CHANCLIENT-009 + 위 줄과 같은 경로 |
| 서버가 JSON 이 아닌 프레임을 보낸다 | 그 프레임만 버리고 다음 정상 프레임은 평소대로 분배한다. 프로세스는 끝나지 않는다 | AC-CHANCLIENT-005 (셋째 테스트). v0.2.1 의 "미검증 — 수용"은 철회했다 — 감사가 프레임 한 개로 `exit=1` 을 재현했다(F-05) |
| `start()` 를 두 번 부른다 | 소켓이 두 개 열린다 | **미검증 — 수용.** 원본에 가드가 없다. 호출자는 `SPEC-CHANWIRE-001` 한 곳이고 조립 시 한 번만 부른다 |
| 첫 연결부터 실패한다(서버가 아예 없다) | `close` 경로로 들어가 백오프 재시도를 시작한다 | AC-CHANCLIENT-012 (죽은 주소에서 시작한다) |

## 품질 게이트

| 항목 | 기준 |
|------|------|
| 타입 검사 | `npm run typecheck -w channel` 종료 코드 `0` |
| 테스트 | `npm test -w channel` 전체 통과. `gateway-client.test.ts` 의 실패 0건 |
| 프로세스 종료 | `npm test -w channel` 이 스스로 종료한다 — 열린 소켓·서버가 남아 매달리지 않는다 |
| 범위 경계 | AC-CHANCLIENT-015 의 다섯 관측 모두 통과 |
| 무상태 | 테스트 실행이 리포지토리에 파일을 남기지 않는다 — `git status --porcelain` 에 추적되지 않은 새 파일이 없다 |
| 커밋 | `feat:` / `test:` 관례, 마일스톤마다 한 번 |

## Definition of Done

- AC-CHANCLIENT-001 부터 AC-CHANCLIENT-016 까지 **전부** 통과했고, 각 명령의 원문 출력이 `progress.md` §E.2 에 남았다.
- 요구사항 REQ-CHANCLIENT-001..014 각각이 최소 하나의 AC 에 매핑돼 있고, 그 매핑이 `progress.md` §E.1 에 표로 남았다.
- 미검증 항목(엣지 케이스 표의 "미검증" 한 줄 — v0.3.0 에서 JSON 파싱 줄이 AC-CHANCLIENT-005 로 넘어가 둘에서 하나가 됐다 — 포함)이 §E.2 의 Gaps 절에 명시적으로 기록됐다.
- `spec.md` §3 에 기록한 실행 전제(`SPEC-CHANNEL-001` 의 `channel/` 스캐폴드)가 충족됐음을 착수 전에 확인했고, 그 확인 명령과 출력이 §E.2 에 남았다.
