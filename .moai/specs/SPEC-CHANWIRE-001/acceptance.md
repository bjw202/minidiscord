# SPEC-CHANWIRE-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 계획 디렉터리의 다른 문서나 초기 커밋에 담긴 v1 초안은 이 SPEC 의 참조 대상이 아니다.

## 이 문서가 지키는 검증 원칙

이 SPEC 의 수용 기준은 **배선이 끊겨 있어도 통과하는 기준을 하나도 두지 않는다**. 배선은 네 갈래가 서로 독립적이라, 한 갈래만 끊긴 상태가 정확히 "대부분 잘 도는 것처럼 보이는" 상태다 — 조용히 깨지기 가장 쉬운 자리다. 그래서 위험한 자리마다 어떤 스텁이 순진한 기준을 뚫는지 명시해 두었다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 수신 갈래 | "알림이 왔다"만 보면 `delivery` 를 잃어버리거나 두 번 보내는 구현도 통과한다 | 알림 **건수**가 정확히 1 이고 `params.meta.delivery` 가 원래 값과 같은가 (AC-CHANWIRE-001) |
| cc 상태 억제 | "cc 도 전달된다"는 단언은 **cc 에도 `working` 을 보내는 구현**을 그대로 통과시킨다 — 원본 테스트가 실제로 이렇다 | cc push 전후로 `status working` 프레임 **수가 늘지 않았는가** (AC-CHANWIRE-002) |
| 상태 순서 | "`idle` 이 보내졌다"는 **항상 `idle` 을 보내는 구현**도 통과한다 | 전송 순서에서 `idle` 의 위치가 `bot_message` **뒤인가** (AC-CHANWIRE-005) |
| 이력 파라미터 | "이력이 돌아왔다"는 파라미터를 통째로 버리고 `{}` 를 보내는 구현도 통과한다 | 게이트웨이가 받은 `history_request` 프레임에 `since_id` 가 **그 값 그대로** 실려 있는가 (AC-CHANWIRE-006) |
| 갈래 독립성 | 기준 전체가 한 번에 통과하면, 어느 기준이 어느 갈래를 재는지 아무도 모른다 | 갈래를 하나씩 끊었을 때 **그 갈래의 기준만** 무너지는가 (AC-CHANWIRE-009) |
| 진입점 | "바이너리가 실행된다"는 아무것도 재지 않는다 | 토큰이 있을 때 게이트웨이가 `hello` 를 **실제로 받았는가**, 토큰이 없을 때는 **연결이 0건인가**(부정 사례) (AC-CHANWIRE-014) |
| 검증이 남긴 프로세스 | 관측이 끝난 뒤에도 살아 있는 자식 프로세스는 스텁 포트로 백오프 재접속을 계속 시도해(상한 30초) **뒤따르는 기준의 프레임 계수를 오염시킨다** — 그 오염은 결함처럼 보이지 않고 간헐 실패로만 나타난다 | `spawn` **직후** 등록된 정리가 모든 경로에서 거두는가 (공통 하네스 5번) |
| 임포트 부작용 | **같은 프로세스 안에서는 잴 수 없다** — 테스트 파일이 이미 임포트한 모듈을 다시 `import()` 하면 ES 모듈 캐시가 돌아올 뿐 본문이 다시 실행되지 않아, 최상단에서 무조건 접속하는 구현도 통과한다 | 모듈을 처음 적재하는 **자식 프로세스**가 스텁에 연결을 만드는가 (AC-CHANWIRE-010) |
| 빌드 산출물 | 소스를 `tsx` 로 돌려 통과해도, `bin` 이 가리키는 `dist/index.js` 가 MCP 를 말하는지는 재지 않은 것이다 | 빌드된 산출물이 stdin 의 `initialize` 에 stdout 으로 응답하는가 (AC-CHANWIRE-014) |

같은 이유로 다음 형태는 이 문서에서 금지한다 — "파일이 존재한다", "`wire` 가 export 돼 있다", "테스트 스위트가 통과한다(어떤 테스트인지 이름 없이)", "파일이 N개다 / N줄이다", 그리고 구현 본문을 지워도 참인 단언.

**반대 방향의 결함도 함께 막는다.** 공허한 기준이 잘못된 구현을 거짓 통과시킨다면, 잘못 쓴 기준은 **정상 구현을 거짓 실패시킨다.** 이 SPEC 에서 그런 자리는 셋이며, 각각 아래 하네스와 해당 기준 본문에 경위를 적어 두었다 — (1) 원본 하네스의 `setNotificationHandler` 인자가 zod 스키마가 아니라 평범한 객체다(`plan.md` §D 1번), (2) 원본 하네스가 고정 `setTimeout(100)` 으로 비동기를 기다린다, (3) v0.1.0 의 기본 주소 기준이 스텁을 `127.0.0.1:3000` — 프로젝트 서버 자신의 기본 포트 — 에 바인딩해, 서버를 띄워 둔 개발자에게는 정상 구현이 환경 때문에 실패했다(감사 지적 M6, AC-CHANWIRE-011 에서 교정).

**이름 붙은 기존 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다.

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## 공통 테스트 하네스

아래 시나리오는 `channel/test/index-wiring.test.ts` 의 다음 하네스를 쓴다. `plan-v2.md` Task 13 Step 1 의 원본에서 **다섯 가지가 달라졌다**.

**1. `setNotificationHandler` 에는 zod 스키마를 넘긴다 (차단급 교정).** 원본은 `obs.setNotificationHandler({ method: 'notifications/claude/channel' } as any, ...)` 를 쓴다. MCP SDK 의 `Protocol.setNotificationHandler` 는 인자에서 `schema.shape.method.value` 를 읽어 등록 키를 만드는데, 평범한 객체에는 `shape` 가 없어 그 자리에서 `TypeError` 가 난다 — **배선이 완벽해도 알림을 보는 기준이 전부 실패한다.** `as any` 가 타입 검사도 가려 놓아 컴파일에서도 걸리지 않는다. 그래서 zod 스키마로 바꿨다.

**2. 고정 대기 대신 조건 대기를 쓴다.** 원본은 `await new Promise(r => setTimeout(r, 100))` 로 접속과 왕복을 기다린다. 100ms 는 지금 통과하더라도 부하 걸린 기계에서 간헐적으로 무너지는 값이고, 무너질 때 실패 사유가 "배선이 없다"와 구분되지 않는다. `waitFor(조건)` 은 조건이 서면 즉시 진행하고, 서지 않으면 명시적 타임아웃으로 실패한다.

**3. 정리는 개별 테스트가 아니라 `cleanups` 가 한다.** WebSocket 서버·게이트웨이 클라이언트·MCP 관찰자를 각 테스트가 스스로 닫게 하면 한 곳만 빠뜨려도 vitest 프로세스가 종료되지 않는다. `gatewayStub()`·`connected()` 가 각자 자기 정리를 등록하고 `afterEach` 가 역순으로 실행한다. 형제 SPEC 하네스와 같은 형태다.

**5. 자식 프로세스는 띄운 자리에서 즉시 수거를 등록한다.** 진입점을 재는 세 관측(AC-CHANWIRE-010·014)은 실제 프로세스를 띄운다. 그 프로세스들은 stdio 를 잡은 채 계속 살아 있게 설계돼 있으므로(REQ-CHANWIRE-003 의 개정된 계약), 거두지 않으면 좀비로 남아 **스텁 포트로 백오프 재접속을 계속 시도한다**(상한 30초). 이 프로젝트에는 배경 부하가 검증을 오염시킨 전례가 있어 추측이 아니다. `spawnChild()` 는 `spawn` **바로 다음 줄**에서 `cleanups` 에 `SIGKILL` 을 등록한다 — 그 아래에서 무엇이 던지든, 단언이 실패하든, `afterEach` 가 반드시 거둔다. 명령 끝에 `kill` 한 줄을 다는 형태는 일찍 끝나는 경로에서 그 줄에 닿지 않으므로 쓰지 않는다.

**4. 게이트웨이 스텁이 프레임 훅을 받는다.** 이력 시나리오가 `history_request` 에 응답해야 하므로, 원본이 테스트 본문에서 `[...wss.clients][0].on('message', ...)` 로 뒤늦게 붙이던 핸들러를 스텁이 처음부터 받도록 바꿨다. 원본 형태는 클라이언트 목록이 아직 비어 있을 때 조용히 아무것도 등록하지 않는다.

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { wire, resolveUrl, DEFAULT_SERVER } from '../src/index.js'

// 빌드 산출물의 절대 경로. 테스트 파일 기준이라 vitest 의 cwd 가 무엇이든 같은 곳을 가리킨다.
const DIST = fileURLToPath(new URL('../dist/index.js', import.meta.url))

// 열어 둔 자원(WS 서버·게이트웨이 클라이언트·MCP 관찰자)의 일괄 정리 목록. 등록 역순으로 닫는다.
const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { while (cleanups.length) await cleanups.pop()!() })

// 조건이 설 때까지 기다린다. 고정 sleep 이 만드는 간헐 실패를 없앤다.
async function waitFor(pred: () => boolean, label: string, ms = 3000): Promise<void> {
  const t0 = Date.now()
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`waitFor timeout: ${label}`)
    await new Promise(r => setTimeout(r, 10))
  }
}

// MCP SDK 는 등록 키를 schema.shape.method.value 에서 읽는다 — 반드시 zod 스키마여야 한다.
const ChannelNotification = z.object({
  method: z.literal('notifications/claude/channel'),
  params: z.object({ content: z.string(), meta: z.record(z.any()) }).passthrough(),
})

function gatewayStub() {
  const wss = new WebSocketServer({ port: 0 })
  const sent: any[] = []                                    // 봇이 게이트웨이로 보낸 프레임 전부, 순서대로
  const hooks: ((ws: WebSocket, m: any) => void)[] = []
  wss.on('connection', ws => {
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      sent.push(m)
      if (m.type === 'hello') ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))
      for (const h of hooks) h(ws, m)
    })
  })
  cleanups.push(() => new Promise<void>(r => wss.close(() => r())))
  return {
    sent,
    port: () => (wss.address() as any).port,
    push: (msg: any) => { for (const c of wss.clients) c.send(JSON.stringify(msg)) },
    onFrame: (h: (ws: WebSocket, m: any) => void) => hooks.push(h),
    countOf: (pred: (m: any) => boolean) => sent.filter(pred).length,
  }
}

// 부모(vitest) 환경의 두 변수가 새어 들어가면 판정이 뒤집히므로 명시적으로 지운다.
function childEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.MINIDISCORD_TOKEN
  delete env.MINIDISCORD_SERVER
  return { ...env, ...extra }
}

// 자식 프로세스를 띄우고 **바로 다음 줄에서** 수거를 등록한다.
// 이 순서가 계약이다 — 아래에서 무엇이 던지든 afterEach 가 반드시 거둔다.
function spawnChild(args: string[], extra: Record<string, string>) {
  const child = spawn(process.execPath, args, { env: childEnv(extra), stdio: ['pipe', 'pipe', 'pipe'] })
  cleanups.push(() => new Promise<void>(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve()
    child.once('close', () => resolve())
    child.kill('SIGKILL')
  }))
  const chunks: string[] = []
  child.stdout.on('data', d => chunks.push(String(d)))
  let exit: number | null = null
  child.once('exit', code => { exit = code })
  return { child, out: () => chunks.join(''), exitCode: () => exit }
}

// stdout 의 줄들 중 그 id 를 가진 JSON-RPC 응답을 찾는다. 없으면 undefined.
function rpcResponse(text: string, id: number): any | undefined {
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id === id) return msg
    } catch { /* 아직 덜 온 줄 */ }
  }
}

const INITIALIZE = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'probe', version: '0' } },
})

// 게이트웨이에 붙고 MCP 관찰자까지 연결된 상태를 만든다.
async function connected() {
  const stub = gatewayStub()
  const { channel, gw } = wire({ url: `ws://127.0.0.1:${stub.port()}/bot`, token: 'tok' })
  gw.start()
  cleanups.push(() => gw.stop())
  await waitFor(() => stub.sent.some(m => m.type === 'hello'), 'hello 도착')

  const obs = new Client({ name: 'obs', version: '0' })
  const [c, s] = InMemoryTransport.createLinkedPair()
  const notified: any[] = []
  obs.setNotificationHandler(ChannelNotification, n => { notified.push(n) })
  await Promise.all([obs.connect(c), channel.server.connect(s)])
  cleanups.push(async () => { await obs.close() })

  return { stub, channel, gw, obs, notified }
}
```

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-CHANWIRE-001 | REQ-CHANWIRE-001, 006 | 아래 본문 | TO push 뒤 알림이 정확히 1건이고 `meta.delivery === 'to'`, `meta.chat_id === '9'` |
| AC-CHANWIRE-002 | REQ-CHANWIRE-007, 010 | 아래 본문 | cc push 뒤 알림 수 `+1`, `status working` 프레임 수는 **그대로** |
| AC-CHANWIRE-003 | REQ-CHANWIRE-008 | 아래 본문 | TO push 뒤 `{ type:'status', state:'working' }` 가 게이트웨이에 도착 |
| AC-CHANWIRE-004 | REQ-CHANWIRE-011 | 아래 본문 | `bot_message.body === '정리 완료'`, `files` 가 `[{ local_path:'/tmp/r.md' }]` 와 정확히 일치 |
| AC-CHANWIRE-005 | REQ-CHANWIRE-009 | 아래 본문 | 전송 순서에서 `idle` 의 인덱스가 `bot_message` 의 인덱스보다 **큼** |
| AC-CHANWIRE-006 | REQ-CHANWIRE-012 | 아래 본문 | 게이트웨이가 받은 `history_request` 에 `since_id: 41`, `limit: 5` 가 그대로 실림 |
| AC-CHANWIRE-007 | REQ-CHANWIRE-012 | 아래 본문 | 도구 결과를 `JSON.parse` 한 값이 `{cursor:1, messages:[{id,at,author,body}]}` 와 `toEqual` (v0.4.0 개정) |
| AC-CHANWIRE-008 | REQ-CHANWIRE-012 | 아래 본문 | 빈 이력의 결과를 파싱한 값이 `{cursor:null, messages:[]}` 와 `toEqual` (v0.4.0 개정) |
| AC-CHANWIRE-009 | REQ-CHANWIRE-006, 008, 011, 012 | 아래 본문 | 갈래를 하나씩 끊은 네 번의 실행에서 실패 기준 집합이 아래 표와 일치 |
| AC-CHANWIRE-010 | REQ-CHANWIRE-002 | 아래 본문 | 모듈을 처음 적재하는 자식 프로세스가 스텁 연결 0건으로 종료 코드 `0` |
| AC-CHANWIRE-011 | REQ-CHANWIRE-003 | 아래 본문 | `DEFAULT_SERVER` 와 `resolveUrl({})` 가 기본 주소 문자열과 정확히 일치하고, `resolveUrl` 이 지정값을 그대로 돌려줌 |
| AC-CHANWIRE-012 | REQ-CHANWIRE-005, 013 | 아래 본문 | 기준 SHA 확인 종료 코드 `0`, 변경 파일이 정확히 두 줄, 선행 소유 파일 diff 빈 출력 |
| AC-CHANWIRE-013 | RED→GREEN 전이 | 아래 본문 | 네 전이가 순서대로 관측됨 |
| AC-CHANWIRE-014 | REQ-CHANWIRE-003, 004 | 아래 본문 | 빌드 산출물이 토큰 유무와 무관하게 `initialize` 에 응답하고, 게이트웨이 접속은 토큰이 있을 때만 |
| AC-CHANWIRE-015 | REQ-CHANWIRE-014 | 아래 본문 | MCP 상대가 없는 상태에서 채팅 1건이 도착해도 수집된 unhandled rejection **0건** + 배선이 계속 프레임을 보냄 |

---

## Given-When-Then 시나리오

### AC-CHANWIRE-001 — 게이트웨이 메시지가 세션 알림으로 도착한다

**Given** 봇이 게이트웨이에 붙어 있고 MCP 관찰자가 채널 서버에 연결돼 있다.
**When** 다음을 `channel/test/index-wiring.test.ts` 에 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('gateway message becomes exactly one session notification', async () => {
  const { stub, notified } = await connected()
  stub.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
  await waitFor(() => notified.length > 0, '알림 도착')
  expect(notified.length).toBe(1)
  expect(notified[0].params.meta.delivery).toBe('to')
  expect(notified[0].params.meta.chat_id).toBe('9')
  expect(notified[0].params.content).toContain('일정 정리해줘')
})
```

**Then** 테스트가 통과한다. `onMessage` 에서 `pushChatMessage` 호출을 빠뜨린 구현에서는 `waitFor` 가 타임아웃으로 실패한다 — 통과할 다른 길이 없다. `delivery` 나 `id` 를 잃어버리고 넘기는 구현은 뒤의 두 단언에서 걸리고, 같은 메시지를 두 번 밀어 넣는 구현은 `toBe(1)` 에서 걸린다.

이 기준은 REQ-CHANWIRE-001 도 함께 관측한다 — `wire()` 가 두 핸들을 모두 내주지 않으면 `connected()` 하네스 자체가 성립하지 않는다.

### AC-CHANWIRE-002 — cc 는 전달되지만 working 을 만들지 않는다

**Given** TO 메시지 하나가 이미 처리되어 `status working` 프레임이 한 번 나가 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('cc message is delivered but raises no working status', async () => {
  const { stub, notified } = await connected()
  stub.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
  await waitFor(() => notified.length === 1, '첫 알림')
  const workingBefore = stub.countOf(m => m.type === 'status' && m.state === 'working')

  stub.push({ type: 'message', id: 10, body: '참고만', author_name: 'alice', delivery: 'cc' })
  await waitFor(() => notified.length === 2, 'cc 알림')
  expect(notified[1].params.meta.delivery).toBe('cc')
  // cc 는 전달되지만 상태를 흔들지 않는다. 아직 도착하지 않았을 뿐일 가능성을 배제하려 여유를 준다.
  await new Promise(r => setTimeout(r, 200))
  expect(stub.countOf(m => m.type === 'status' && m.state === 'working')).toBe(workingBefore)
})
```

**Then** 테스트가 통과한다. cc 를 거르는 구현은 두 번째 `waitFor` 에서 타임아웃으로 실패하고, `delivery` 를 보지 않고 모든 수신에 `working` 을 보내는 구현은 마지막 단언에서 걸린다.

> **원본 교정 기록.** `plan-v2.md` Task 13 원본 테스트의 세 번째 절은 cc push 뒤 `expect(notified.length).toBe(before + 1)` 하나만 단언한다. 주석은 "cc 메시지는 전달되지만 status working 없음"이라고 적혀 있으나, **`working` 의 부재를 재는 단언이 없다** — 모든 수신에 `working` 을 보내는 구현이 그대로 통과한다. 부정 단언을 여기서 더했다. 여유 대기 200ms 를 둔 것은 반대 방향 결함을 막기 위해서다 — 프레임이 늦게 도착해 정상 구현이 거짓 통과하는 것도, 부정 단언이 너무 이른 시점에 참이 되는 것도 원하지 않는다.

### AC-CHANWIRE-003 — TO 수신이 working 상태를 만든다

**Given** 봇이 게이트웨이에 붙어 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('a TO message reports working to the gateway', async () => {
  const { stub, notified } = await connected()
  stub.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
  await waitFor(() => stub.sent.some(m => m.type === 'status' && m.state === 'working'), 'working 프레임')
  await waitFor(() => notified.length === 1, '알림 도착')
  const workingIdx = stub.sent.findIndex(m => m.type === 'status' && m.state === 'working')
  expect(workingIdx).toBeGreaterThanOrEqual(0)
  expect(stub.sent[workingIdx].state).toBe('working')
})
```

**Then** 테스트가 통과한다. 관측되는 것은 **게이트웨이 소켓이 실제로 받은 프레임**이다 — 배선 안에서 예외가 없었다는 것이 아니다. 상태 갈래를 통째로 빼도 수신·송신·이력 세 갈래는 멀쩡하므로, 이 기준이 없으면 그 누락이 어디에서도 드러나지 않는다.

> **남는 틈(Gap) — 감사 지적 m4.** REQ-CHANWIRE-008 은 `working` 이 세션 알림 **이전에** 나가야 한다고 적지만, 이 기준은 그 순서를 재지 않는다. 두 사건이 서로 다른 전송로(실제 소켓 / 인프로세스 `InMemoryTransport`)를 타서 도착 시각 비교가 경쟁 조건이 되고, 그렇게 만든 기준은 정상 구현을 간헐적으로 거짓 실패시킨다 — AC-CHANWIRE-005 의 `idle` 순서가 **같은 소켓 안의 인덱스**를 비교해 안전한 것과 다른 상황이다. 순서 조항은 코드 리뷰로만 확인하고, 이 사실을 `progress.md` §E.2 Gaps 에 남긴다.

### AC-CHANWIRE-004 — reply 도구가 게이트웨이 bot_message 가 된다

**Given** 봇이 게이트웨이에 붙어 있고 관찰자가 도구를 호출할 수 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('reply tool sends a bot_message with mapped file paths', async () => {
  const { stub, obs } = await connected()
  await obs.callTool({ name: 'reply', arguments: { text: '정리 완료', files: ['/tmp/r.md'] } })
  await waitFor(() => stub.sent.some(m => m.type === 'bot_message'), 'bot_message 도착')
  const botMsg = stub.sent.find(m => m.type === 'bot_message')!
  expect(botMsg.body).toBe('정리 완료')
  expect(botMsg.files).toEqual([{ local_path: '/tmp/r.md' }])

  await obs.callTool({ name: 'reply', arguments: { text: '첨부 없음' } })
  await waitFor(() => stub.sent.filter(m => m.type === 'bot_message').length === 2, '두 번째 bot_message')
  expect(stub.sent.filter(m => m.type === 'bot_message')[1].files).toEqual([])
})
```

**Then** 테스트가 통과한다. `files` 를 문자열 배열 그대로 보내는 구현은 `toEqual([{ local_path: '/tmp/r.md' }])` 에서 걸린다 — 게이트웨이는 `local_path` 필드를 읽으므로, 그대로 보내면 첨부가 조용히 사라진다. `files` 가 없을 때 `undefined` 를 보내는 구현은 마지막 단언에서 걸린다.

### AC-CHANWIRE-005 — idle 은 답변 뒤에 나간다

**Given** `reply` 도구가 한 번 호출됐다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('idle status follows the bot_message, not precedes it', async () => {
  const { stub, obs } = await connected()
  await obs.callTool({ name: 'reply', arguments: { text: '정리 완료' } })
  await waitFor(() => stub.sent.some(m => m.type === 'status' && m.state === 'idle'), 'idle 프레임')
  const msgIdx = stub.sent.findIndex(m => m.type === 'bot_message')
  const idleIdx = stub.sent.findIndex(m => m.type === 'status' && m.state === 'idle')
  expect(msgIdx).toBeGreaterThanOrEqual(0)
  expect(idleIdx).toBeGreaterThan(msgIdx)
})
```

**Then** 테스트가 통과한다. 이 기준의 핵심은 `toBeGreaterThan` 이다 — "`idle` 이 보내졌다"만 재면 접속하자마자 `idle` 을 보내는 구현도, 답변보다 먼저 보내는 구현도 통과한다. 순서를 재야 답변 완료 신호로서 성립한다.

### AC-CHANWIRE-006 — fetch_history 파라미터가 게이트웨이까지 그대로 간다

**Given** 게이트웨이 스텁이 `history_request` 에 응답한다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('fetch_history forwards since_id and limit verbatim', async () => {
  const { stub, obs } = await connected()
  stub.onFrame((ws, m) => {
    if (m.type === 'history_request') ws.send(JSON.stringify({ type: 'history_response', rid: m.rid, messages: [] }))
  })
  await obs.callTool({ name: 'fetch_history', arguments: { since_id: 41, limit: 5 } })
  const req = stub.sent.find(m => m.type === 'history_request')!
  expect(req.since_id).toBe(41)
  expect(req.limit).toBe(5)
})
```

**Then** 테스트가 통과한다. 파라미터를 버리고 `gw.requestHistory({})` 를 부르는 구현은 두 단언 모두에서 걸린다. `since_id` 를 다른 이름(`since`, `after_id`)으로 바꿔 싣는 구현도 마찬가지다. 이 커서가 떨어지면 봇은 매번 같은 대화를 다시 읽고, 그 증상은 사람 눈에 "봇이 좀 느리다" 정도로만 보인다.

### AC-CHANWIRE-007 — 이력이 구조화 JSON 으로 렌더링된다 (v0.4.0 개정)

**Given** 게이트웨이가 메시지 한 건을 돌려준다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('history renders as one structured JSON document', async () => {
  const { stub, obs } = await connected()
  stub.onFrame((ws, m) => {
    if (m.type === 'history_request') ws.send(JSON.stringify({
      type: 'history_response', rid: m.rid,
      messages: [{ id: 1, author_name: 'alice', body: '과거', created_at: '2026-08-01' }],
    }))
  })
  const res = await obs.callTool({ name: 'fetch_history', arguments: { limit: 1 } })
  expect(parsedHistory(res)).toEqual({
    cursor: 1,
    messages: [{ id: 1, at: '2026-08-01', author: 'alice', body: '과거' }],
  })
})
```

**Then** 테스트가 통과한다.

**파싱한 뒤 `toEqual` 로 재는 것이 이 기준의 핵심이다.** 문자열을 `toBe` 로 재면 JSON 키 **순서** 하나로 정상 구현이 거짓 실패한다. `toEqual` 은 객체를 통째로 비교하므로 «네 키뿐이고 값이 이것들» 이 성립하고, 필드를 빠뜨리거나 몰래 더한 구현이 모두 걸린다. `cursor: 1` 단언이 커서가 배열 밖에서 나오는지를 함께 잰다.

> **v0.4.0 개정 (카드 `t10`) — «수정» 이 아니라 «개정» 이다.** v0.3.0 의 이 기준은 `toBe('#1 [2026-08-01] alice: 과거')` 였고, 개정된 REQ-CHANWIRE-012 아래에서 **반드시 실패한다.** 옛 형식이 왜 폐기됐는지는 그 조항의 v0.4.0 주석과 감사 F-03 이 적었다 — 본문의 개행 하나가 메시지 1건을 이력 2줄로 만들고, 본문의 `#숫자` 가 커서를 오염시킨다. 개정 전 형태의 **실패 원문**은 `SPEC-CHANINJECT-001` AC-CHANINJECT-014 전이 **2b** 가 실행으로 남긴다. 오염 본문에 대한 관측은 `SPEC-CHANINJECT-001` AC-CHANINJECT-004 가 소유하며, 이 기준은 **형식의 고정**만 잰다 — 그 역할 분담은 v0.3.0 §5 가 이미 지적한 대로다.

### AC-CHANWIRE-008 — 빈 이력도 같은 모양의 JSON 이다 (v0.4.0 개정)

**Given** 게이트웨이가 빈 목록을 돌려준다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('empty history renders the same JSON shape with a null cursor', async () => {
  const { stub, obs } = await connected()
  stub.onFrame((ws, m) => {
    if (m.type === 'history_request') ws.send(JSON.stringify({ type: 'history_response', rid: m.rid, messages: [] }))
  })
  const res = await obs.callTool({ name: 'fetch_history', arguments: {} })
  expect(parsedHistory(res)).toEqual({ cursor: null, messages: [] })
})
```

**Then** 테스트가 통과한다. 빈 문자열을 돌려주는 구현은 걸린다 — 세션이 받는 도구 결과가 비면 "도구가 고장 났다"와 "대화가 없다"를 구분할 수 없다. 그 성질은 v0.3.0 의 `'(기록 없음)'` 과 같고, 표현만 JSON 으로 통일됐다.

> **v0.4.0 개정 (카드 `t10`).** v0.3.0 의 `toBe('(기록 없음)')` 는 개정된 REQ-CHANWIRE-012 아래에서 실패한다. **한국어 문구를 버린 사유**: 남기면 결과 타입이 «때로는 JSON, 때로는 문장» 이 되고, 모델이 `JSON.parse` 를 시도할 수 있는지가 상황에 따라 달라진다. 그 비일관은 커서를 다시 텍스트 추측으로 되돌리는 압력이 되므로, 빈 결과도 JSON 으로 통일한다(`SPEC-CHANINJECT-001/spec.md` §3.2). 이 SPEC §6 의 «UI 문구는 한국어» 제약도 같은 패스에서 정정했다 — 이 문자열을 읽는 것은 사람이 아니라 모델이다.

> **공통 하네스 추가 (v0.4.0).** 위 두 기준은 `channel/test/index-wiring.test.ts` 의 헬퍼 하나를 쓴다. 정본은 `SPEC-CHANINJECT-001/acceptance.md` §공통 테스트 하네스이며, 같은 파일 안에 한 번만 선언한다.
>
> ```ts
> function parsedHistory(res: unknown): { cursor: number | null; messages: unknown[] } {
>   return JSON.parse((res as { content: { text: string }[] }).content[0].text)
> }
> ```

### AC-CHANWIRE-009 — 갈래는 서로 독립이며, 끊으면 그 기준이 무너진다

**Given** AC-CHANWIRE-001 부터 008 까지가 모두 통과하는 상태다.
**When** 아래 네 변이를 **하나씩** 작업 트리에 적용하고 그때마다 `npm test -w channel -- --reporter=verbose` 를 실행한 뒤, 다음 변이 전에 되돌린다. 각 실행의 출력을 `progress.md` §E.2 에 원문으로 남긴다.

| 변이 | 무엇을 끊는가 | 실패해야 하는 기준 | 통과해야 하는 기준 |
|------|--------------|-------------------|-------------------|
| 변이 A | `onMessage` 안의 `pushChatMessage` 호출 한 줄 제거 | AC-001, AC-002 | AC-003, AC-004, AC-005, AC-006, AC-007, AC-008 |
| 변이 B | `sendToChat` 안의 `bot_message` 전송 한 줄 제거 | AC-004, AC-005 | AC-001, AC-002, AC-003, AC-006, AC-007, AC-008 |
| 변이 C | `fetchHistory` 를 `gw.requestHistory({})` 로 바꿈 (파라미터 버림) | AC-006 | AC-001 ~ AC-005, AC-007, AC-008 |
| 변이 D | `delivery === 'to'` 일 때의 `status working` 전송 한 줄 제거 | AC-003 | AC-001, AC-002, AC-004, AC-005, AC-006, AC-007, AC-008 |

**Then** 네 실행 모두에서 실패한 테스트 이름 집합이 표의 "실패해야 하는 기준" 열과 **정확히 일치**하고, "통과해야 하는 기준" 열의 테스트는 `✓` 줄로 나타난다. 어긋나면 실패다 — 어긋나는 방향은 둘 다 결함이다. 끊었는데도 통과하면 그 기준은 그 갈래를 재고 있지 않은 것이고(공허한 기준), 끊지 않은 갈래의 기준까지 무너지면 기준이 서로 얽혀 있어 무엇이 깨졌는지 짚을 수 없다.

변이 B 가 두 기준을 무너뜨리는 것은 정상이다 — AC-CHANWIRE-005 는 `idle` 의 위치를 `bot_message` 를 기준으로 재므로 `bot_message` 자체가 없으면 성립할 수 없다. 표에 그렇게 적어 둔 이유다.

**되돌림 확인이 이 기준의 일부다.** 네 변이를 마친 뒤 `git diff -- channel/src/index.ts` 가 변이 전과 같은 내용을 보여야 하며, 마지막 실행이 전체 통과여야 한다.

### AC-CHANWIRE-010 — 임포트만으로는 소켓이 열리지 않는다 (부정 사례)

**Given** 게이트웨이 스텁이 임의 포트에 떠 있고 `npm run build -w channel` 이 끝나 있다.
**When** 모듈을 **처음 적재하는 자식 프로세스**를 띄운다. 토큰은 일부러 **준다** — 토큰이 있어도 임포트만으로는 아무 일도 일어나지 않아야 하기 때문이다.

```ts
it('importing the module opens no connection', async () => {
  const stub = gatewayStub()
  const spec = pathToFileURL(DIST).href
  const child = spawnChild(
    ['--input-type=module', '--eval', `await import(${JSON.stringify(spec)})`],
    { MINIDISCORD_TOKEN: 'tok', MINIDISCORD_SERVER: `ws://127.0.0.1:${stub.port()}/bot` },
  )
  await waitFor(() => child.exitCode() !== null, '자식 프로세스 종료')
  expect(child.exitCode()).toBe(0)
  expect(stub.sent.length).toBe(0)
})
```

**Then** 자식 프로세스가 **종료 코드 `0`** 으로 스스로 끝나고, 스텁이 받은 연결이 **0건**이다. 스스로 끝난다는 것 자체가 관측 대상이다 — 열어 둔 소켓이 없다는 뜻이며, `waitFor` 가 타임아웃하면 무언가를 열어 둔 것이다.

`--eval` 로 띄우면 `process.argv[1]` 이 `undefined` 라 진입점 가드가 꺼진 상태가 된다 — 그런데도 접속이 일어난다면 그 구현은 가드 **바깥**에서, 즉 모듈 최상단에서 무조건 접속하고 있는 것이다.

**`--input-type=module` 은 생략할 수 없다.** `--eval` 로 넘긴 입력의 모듈 종류를 Node 가 어떻게 판정하는지는 버전 대역에 따라 다르고, 최상위 `await` 는 ESM 으로 판정될 때만 성립한다. Global Constraints 가 선언한 하한선은 Node 20 이므로, 플래그 없이 두면 **선언한 최소 버전에서 정상 구현이 거짓 실패한다** — 이 문서가 막기로 한 반대 방향 결함이다. 플래그로 확정한다.

> **v0.2.0 교정 기록 (B1).** 이전 판은 이것을 vitest 안에서 `await import('../src/index.js')` 로 쟀다. 그런데 그 테스트 파일은 이미 맨 위에서 같은 모듈을 임포트하고 있어, 두 번째 `import()` 는 **ES 모듈 캐시를 돌려줄 뿐 본문을 한 줄도 다시 실행하지 않는다.** 게다가 첫 적재는 스텁이 뜨기도 전, 환경변수를 세팅하기도 전에 이미 끝나 있다. 결과적으로 최상단에서 무조건 접속하는 구현도 `stub.sent.length === 0` 을 통과했다 — **아무것도 재지 않는 기준**이었고, REQ-CHANWIRE-002 가 미검증인 채 통과로 기록될 뻔했다. 임포트 부작용은 원리상 같은 프로세스 안에서 잴 수 없으므로 자식 프로세스로 옮겼다. 테스트 안에서 `process.env` 를 세팅하고 되돌리지 않던 오염(감사 지적 m2)도 이 전환으로 함께 사라졌다.

### AC-CHANWIRE-011 — 주소가 환경변수대로 정해지고, 기본값이 지켜진다

**Given** 진입점이 `DEFAULT_SERVER` 와 `resolveUrl(env)` 를 내보낸다. 이 기준은 프로세스도 포트도 쓰지 않는다.
**When** 다음을 `channel/test/index-wiring.test.ts` 에 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('resolveUrl falls back to the documented default', () => {
  expect(DEFAULT_SERVER).toBe('ws://127.0.0.1:3000/bot')
  expect(resolveUrl({})).toBe('ws://127.0.0.1:3000/bot')
  expect(resolveUrl({ MINIDISCORD_SERVER: 'ws://example/bot' })).toBe('ws://example/bot')
})
```

**Then** 세 단언이 모두 통과한다. 기본 주소가 한 글자라도 다르면 걸리고, 환경변수를 읽지 않고 늘 기본값을 쓰는 구현도 셋째 단언에서 걸린다.

**지정 주소가 실제 접속에 쓰이는 것**은 AC-CHANWIRE-014 (a)가 관측한다 — 그 기준이 `MINIDISCORD_SERVER` 를 스텁으로 지정한 채 빌드 산출물을 띄워 `hello` 도착을 본다. 같은 것을 두 번 재려고 프로세스를 하나 더 띄우지 않는다. 띄운 프로세스마다 좀비 위험이 붙기 때문이다.

> **v0.2.0 교정 기록 (M6).** 이전 판은 기본값을 재려고 스텁을 `127.0.0.1:3000` 에 바인딩했다. 3000 은 **이 프로젝트 서버 자신의 기본 포트**라, 서버를 띄워 둔 개발자에게는 정상 구현이 환경 때문에 실패한다. 실패를 정직하게 기록하도록 적어 두긴 했지만, 거짓 실패가 반복되면 그 기준은 곧 "환경 탓"으로 무시되고 기본 주소 계약은 사실상 사라진다. 해석을 `resolveUrl(env)` 로 끌어내 포트와 무관하게 관측하도록 바꿨다(REQ-CHANWIRE-003 개정).
>
> **남는 틈(Gap).** 이 형태는 "기본값이 무엇인가"와 "지정값이 실제로 쓰이는가"를 각각 닫지만, **기본값 경로가 실제 접속에 쓰이는 것**은 직접 보지 않는다 — 진입점의 주소 결정 지점이 `resolveUrl` 호출 한 곳뿐이라는 사실에 기대고 있다. 그 한 곳을 우회하는 구현은 이 기준을 통과한다. 3000 번을 점유하지 않고 이보다 강하게 재는 방법을 찾지 못했으므로, `progress.md` §E.2 Gaps 에 이 문장을 그대로 남긴다.

### AC-CHANWIRE-012 — 범위 경계와 무상태

**Given** M1 단계 0 에서 `spec_base_sha` 를 기록해 두었다.
**When** 다음 네 명령을 순서대로 실행한다.

```bash
SHA=$(cat .moai/specs/SPEC-CHANWIRE-001/.spec-base-sha)
git rev-parse --verify "$SHA^{commit}"
git diff --stat "$SHA" -- channel/src/channel-server.ts channel/src/gateway-client.ts server
git diff --name-only "$SHA" -- channel
git status --porcelain
```

**Then** 네 가지가 모두 관측된다.

1. `git rev-parse --verify` 가 **종료 코드 `0`** 으로 SHA 를 출력한다. 이 확인이 먼저다 — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비우므로, 빈 출력만 보고 통과로 적으면 검사가 통째로 무력해진다.
2. 두 번째 명령이 **종료 코드 `0`** 이면서 출력이 **비어 있다**. 선행 SPEC 이 소유한 두 파일과 `server/` 를 이 SPEC 이 고치지 않았다는 뜻이다 (REQ-CHANWIRE-013).
3. 세 번째 명령의 출력이 정확히 두 줄이고, 정렬하면 `channel/src/index.ts`, `channel/test/index-wiring.test.ts` 다 (REQ-CHANWIRE-013).
4. 네 번째 명령의 출력에 테스트가 만든 파일이 하나도 없다 — 채널 패키지는 무상태이므로 실행이 디스크에 아무것도 남기지 않는다 (REQ-CHANWIRE-005).

### AC-CHANWIRE-013 — RED→GREEN 전이

**Given** 각 마일스톤이 테스트를 먼저 쓴다.
**When** `plan.md` §F 의 마일스톤 절차를 따라 실행하고 각 단계 출력을 `progress.md` §E.2 에 원문으로 남긴다.
**Then** 네 전이가 순서대로 관측된다.

| 전이 | 시점 | 관측할 결과 |
|------|------|-------------|
| 1 (RED) | M1 테스트 작성 직후 | `npm test -w channel` 실패, 사유가 `wire` 미수출 (`does not provide an export named 'wire'` 계열) |
| 2 (GREEN) | M1 구현 후 | `npm test -w channel` 통과 + `npm run typecheck -w channel` 종료 코드 `0` |
| 3 (RED) | M2 테스트 작성 직후 | `npm test -w channel` 실패, 사유가 새 단언 실패 (모듈·수출 부재가 **아님**) |
| 4 (GREEN) | M2 구현 후 | `npm test -w channel` 전체 통과 + typecheck 종료 코드 `0` |

전이 3 의 실패 사유를 구분해 적는 것이 이 기준의 핵심이다. 수출 부재로 실패한 것을 RED 로 적으면 그 마일스톤의 테스트가 실제로 무엇을 재는지 아무도 확인하지 않은 채 넘어간다.

### AC-CHANWIRE-014 — 빌드 산출물이 MCP 를 말하고, 토큰은 게이트웨이만 잠근다

**Given** `npm run build -w channel` 이 끝나 `channel/dist/index.js` 가 있고, 게이트웨이 스텁이 임의 포트에 떠 있다.
**When** 빌드 산출물을 두 번 실행하고, 각 실행의 stdin 으로 MCP `initialize` 요청 한 줄을 흘려 넣는다.

```ts
it('the built artifact speaks MCP; the token gates only the gateway', async () => {
  const stub = gatewayStub()
  const url = `ws://127.0.0.1:${stub.port()}/bot`

  // (a) 토큰 있음 — 두 갈래가 같은 프로세스에서 동시에 성립해야 한다
  const withToken = spawnChild([DIST], { MINIDISCORD_TOKEN: 'tok', MINIDISCORD_SERVER: url })
  withToken.child.stdin.write(INITIALIZE + '\n')
  await waitFor(() => rpcResponse(withToken.out(), 1) !== undefined, '(a) initialize 응답')
  expect(rpcResponse(withToken.out(), 1).result.serverInfo.name).toBe('minidiscord-channel')
  await waitFor(() => stub.sent.some(m => m.type === 'hello'), '(a) hello 도착')
  expect(stub.sent.find(m => m.type === 'hello').token).toBe('tok')

  // (b) 토큰 없음 — MCP 는 여전히 말하고, 게이트웨이에는 붙지 않는다
  const helloBefore = stub.countOf(m => m.type === 'hello')
  const noToken = spawnChild([DIST], { MINIDISCORD_SERVER: url })
  noToken.child.stdin.write(INITIALIZE + '\n')
  await waitFor(() => rpcResponse(noToken.out(), 1) !== undefined, '(b) initialize 응답')
  expect(rpcResponse(noToken.out(), 1).result.serverInfo.name).toBe('minidiscord-channel')
  await new Promise(r => setTimeout(r, 300))   // 늦게 오는 접속을 놓치지 않기 위한 여유
  expect(stub.countOf(m => m.type === 'hello')).toBe(helloBefore)
})
```

두 프로세스는 stdio 를 잡은 채 계속 살아 있다 — 그것이 개정된 계약이 요구하는 상태다. 수거는 시나리오 본문이 아니라 `spawnChild()` 가 `spawn` 직후 등록한 정리가 맡는다(공통 하네스 5번). 단언 하나가 실패해 이 테스트가 중간에 던져도 `afterEach` 가 두 프로세스를 모두 `SIGKILL` 한다. 거두지 못한 프로세스는 스텁 포트로 백오프 재접속을 계속 시도해(상한 30초) 이어지는 다른 기준의 프레임 계수를 오염시킨다.

**Then** 네 가지가 모두 관측된다.

1. (a) 의 stdout 에 그 요청의 `id` 를 가진 JSON-RPC 응답이 나오고, `result.serverInfo.name` 이 `minidiscord-channel` 이다.
2. (a) 에서 스텁이 `{ type: 'hello', token: 'tok' }` 를 받는다. **1 과 2 가 같은 프로세스에서 함께 성립하는 것**이 이 기준의 핵심이다 — 배선의 주장이 바로 "한 프로세스가 세션과 게이트웨이 양쪽에 동시에 붙어 있다"이기 때문이다.
3. (b) 의 stdout 에도 같은 형태의 `initialize` 응답이 나온다 (REQ-CHANWIRE-004 의 "stdio 를 막지 않는다" 절).
4. (b) 에서 스텁이 받은 연결이 **0건**이다 (REQ-CHANWIRE-004 의 부정 절).

> **v0.2.0 신설 기록 (M1).** 이 기준이 없을 때 네 SPEC 을 통틀어 **배선 이후 `channel/dist/index.js` 가 실제로 MCP 를 말하는지 재는 기준이 하나도 없었다.** AC-CHANWIRE-011 은 `npx tsx` 로 소스를 돌리므로, `bin` 이 가리키는 산출물이 어긋나도(`tsconfig` 의 `rootDir`·`include` 가 바뀌어 `dist/index.js` 가 엉뚱한 자리에 생기는 부류) `npm test` 는 전부 통과한다. 증상은 사용자가 `.claude.json` 에 봇을 등록하고 세션을 띄울 때에야, "봇이 그냥 아무 반응이 없다"로 처음 드러난다.
>
> (b) 는 형제 SPEC 과의 계약을 지키는 자리이기도 하다. `SPEC-CHANNEL-001` 의 AC-CHANNEL-002·004·005 가 **토큰 없이** 이 산출물을 띄워 `initialize` 응답을 읽으므로, 이 SPEC 이 stdio 까지 토큰으로 잠그면 그 세 기준이 조용히 실행 불가가 된다. 그래서 REQ-CHANWIRE-003·004 를 갈라 놓았고(`plan.md` §D 3번), (b) 가 그 분리를 매 실행마다 지킨다.

### AC-CHANWIRE-015 — MCP 상대가 끊긴 뒤 도착한 채팅이 프로세스를 죽이지 않는다

**Given** 배선은 붙었지만 채널 서버에 어떤 transport 도 연결돼 있지 않다 — Claude Code 세션이 `/clear` 되거나 재시작되어 stdio 가 끊긴 뒤와 같은 상태다.
**When** 다음을 `channel/test/index-wiring.test.ts` 에 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('a chat message with no MCP peer raises no unhandled rejection', async () => {
  const stub = gatewayStub()
  // 어떤 transport 도 붙이지 않는다 — 이 상태에서 notification() 은 'Not connected' 로 거부된다
  const { channel, gw } = wire({ url: `ws://127.0.0.1:${stub.port()}/bot`, token: 'tok' })
  gw.start()
  cleanups.push(() => gw.stop())
  await waitFor(() => stub.sent.some(m => m.type === 'hello'), 'hello 도착')

  // 전제 확인: 이 상태의 pushChatMessage 는 실제로 거부된다 — 이 테스트가 무엇을 재는지 못 박는다
  await expect(
    channel.pushChatMessage({ id: 1, author_name: 'a', body: 'x', delivery: 'to' }),
  ).rejects.toThrow()

  const rejections: unknown[] = []
  const onRejection = (e: unknown) => { rejections.push(e) }
  process.on('unhandledRejection', onRejection)
  cleanups.push(() => { process.off('unhandledRejection', onRejection) })

  stub.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
  await waitFor(() => stub.sent.some(m => m.type === 'status' && m.state === 'working'), 'working 프레임')
  await new Promise(r => setTimeout(r, 200))   // 처리되지 않은 거부는 다음 턴에야 보고된다

  expect(rejections).toEqual([])
  expect(gw.send({ type: 'still_alive' })).toBe(true)      // 배선은 계속 살아 있다
  await waitFor(() => stub.sent.some(m => m.type === 'still_alive'), 'still_alive 도착')
})
```

**Then** 테스트가 통과한다.

**이 기준은 AC-CHANPERM-009 의 수신 경로 짝이다.** 저쪽은 나가는 방향(판정 알림)에서 미연결 상태의 거부가 프로세스를 죽이지 않는지를 재고, 이쪽은 **들어오는 방향**(채팅 알림)에서 같은 것을 잰다. 두 기준의 관측 도구도 같다 — `unhandledRejection` 수집이다. `not.toThrow()` 만으로는 잡히지 않는데, 처리되지 않은 거부에 의한 죽음은 **다음 tick 에** 일어나기 때문이다.

세 단언이 각각 다른 것을 잰다. 첫째 `rejects.toThrow()` 는 **전제**다 — 이 상태에서 `pushChatMessage` 가 실제로 거부한다는 것을 못 박지 않으면, 거부가 애초에 나지 않는 환경에서도 나머지 단언이 참이 되어 기준이 공허해진다. 둘째 `rejections` 가 빈 배열인지가 **본 관측**이다. 셋째 `still_alive` 왕복이 "그래서 프로세스가 여전히 쓸 만한가"를 잰다.

**이 기준을 무너뜨리는 것**: `index.ts` 의 `await channel.pushChatMessage(m).catch(() => {})` 에서 `.catch(() => {})` 를 떼어 v0.2.1 의 무방비 `await channel.pushChatMessage(m)` 로 되돌리는 구현. 변이 `M-F06 revert rejection swallow` 로 실행 확인했다 — 이 테스트 한 건만 실패했다(`.moai/state/verify/t4-sync-fix/mutation-report.json`).

---

## 엣지 케이스

| 상황 | 기대 동작 | 덮는 기준 |
|------|-----------|-----------|
| 게이트웨이가 끊긴 상태에서 `reply` 가 호출된다 | `gw.send` 가 `false` 를 돌려주고 프레임은 나가지 않는다. 도구는 오류 없이 끝난다 | 미검증 — `plan.md` §E 알려진 위험 (반환값을 배선이 버린다) |
| `pushChatMessage` 가 거부(reject)한다 | 배선이 그 거부를 명시적으로 삼킨다. 처리되지 않은 거부가 남지 않고 프로세스도 끝나지 않는다 | AC-CHANWIRE-015 (REQ-CHANWIRE-014). v0.2.1 의 "미검증 — 알려진 위험"은 철회했다 — 감사가 채팅 1건으로 `exit=1` 을 재현했다(F-06) |
| `requestHistory` 가 10초 타임아웃으로 거부한다 | 거부가 도구 호출 오류로 세션에 전달된다 | 미검증 — 타임아웃 자체는 `SPEC-CHANCLIENT-001` 소유 |
| 같은 TO 메시지가 재접속 커서 재전송으로 두 번 온다 | 두 번 다 세션에 전달되고 `working` 도 두 번 나간다 | 미검증 — 중복 억제는 서버 커서(`missed_after_id`)가 담당 |
| `reply` 의 `files` 에 존재하지 않는 경로가 들어온다 | 배선은 그대로 싣고, 게이트웨이가 그 첨부만 건너뛴다 | 서버 SPEC 의 기존 동작 (`handleBotMessage` 의 try/catch) |
| 이력 응답의 `messages` 가 여러 건이다 | JSON 배열의 원소 여러 개가 된다 (v0.4.0 — 줄 잇기가 아니다) | AC-CHANWIRE-007 (한 건으로 형식 고정) · `SPEC-CHANINJECT-001` AC-CHANINJECT-005 (두 건으로 커서 고정) |
| 이력 본문에 개행·`#숫자`가 들어 있다 | `JSON.stringify` 가 이스케이프하므로 원소 경계도 커서도 만들지 못한다 (v0.4.0) | `SPEC-CHANINJECT-001` AC-CHANINJECT-004·005 |
| `working` 이 세션 알림보다 먼저 나가는가 (REQ-008 의 순서 조항) | 먼저 나가야 한다 | 미검증 — 두 사건이 서로 다른 전송로를 타 도착 시각 비교가 경쟁 조건이 된다. 코드 리뷰로만 확인 (감사 지적 m4, AC-CHANWIRE-003 본문) |
| 기본 주소 경로가 실제 접속에 쓰이는가 | `resolveUrl` 이 돌려준 값으로 접속해야 한다 | 미검증 — `resolveUrl` 호출 지점이 하나뿐이라는 사실에 기댄다. 그 지점을 우회하는 구현은 AC-CHANWIRE-011 을 통과한다 |
| 토큰 없이 띄운 프로세스가 계속 살아 있다 | stdio 를 잡은 채 MCP 로만 답한다 (게이트웨이에는 붙지 않음) | AC-CHANWIRE-014 (b) — v0.1.0 의 "자원 없이 정상 종료"는 계약 개정으로 폐기됐다 |

## 품질 게이트

| 항목 | 기준 |
|------|------|
| 타입 검사 | `npm run typecheck -w channel` 종료 코드 `0`. **다만 `SPEC-CHANNEL-001` 이 `tsconfig` 를 `include: ["src"]` 로 좁히면 `channel/test/**` 는 이 검사가 덮지 않는다** — 그 사실을 `progress.md` §E.2 Gaps 에 기록한다 (감사 지적 m5) |
| 빌드 | `npm run build -w channel` 종료 코드 `0`, `channel/dist/index.js` 존재 (AC-CHANWIRE-010·014 의 전제) |
| 테스트 | `npm test -w channel` 전체 통과. `index-wiring.test.ts` 의 실패 0건 |
| 갈래 독립성 | AC-CHANWIRE-009 의 네 변이 결과가 표와 일치 |
| 빌드 산출물 | AC-CHANWIRE-014 의 네 관측 모두 통과 |
| 수신 경로 견고성 | AC-CHANWIRE-015 의 세 단언 모두 통과 (전제 · unhandled rejection 0건 · 배선 생존) |
| 범위 경계 | AC-CHANWIRE-012 의 네 관측 모두 통과 |
| 무상태 | 테스트와 바이너리 실행이 어떤 파일도 만들지 않는다 — `git status --porcelain` 에 새 파일 없음 |
| 프로세스 위생 | `npm test -w channel` 이 끝난 뒤 `pgrep -f 'channel/dist/index.js'` 가 빈 출력. 남은 프로세스가 하나라도 있으면 실패이고, 그것을 죽이기 전에 어느 경로가 수거를 빠뜨렸는지 먼저 밝힌다 |
| 커밋 | `feat:` / `test:` 관례, 마일스톤마다 한 번 |

## Definition of Done

- AC-CHANWIRE-001 부터 AC-CHANWIRE-015 까지 **전부** 통과했고, 각 명령의 원문 출력이 `progress.md` §E.2 에 남았다.
- 요구사항 REQ-CHANWIRE-001..014 각각이 최소 하나의 AC 에 매핑돼 있고, 그 매핑이 `progress.md` §E.1 에 표로 남았다.
- AC-CHANWIRE-009 의 네 변이 실행 결과(실패한 테스트 이름 집합)가 §E.2 에 원문으로 남았고, 변이가 모두 되돌려졌다.
- 미검증 항목(엣지 케이스 표의 "미검증" 다섯 줄 — v0.3.0 에서 `pushChatMessage` 거부 줄이 AC-CHANWIRE-015 로 넘어가 여섯에서 다섯이 됐다 — 포함)이 §E.2 의 Gaps 절에 명시적으로 기록됐다. AC-CHANWIRE-011 의 "남는 틈" 문단과 typecheck 가 `channel/test/**` 를 덮지 않는다는 사실도 같은 절에 있다.
- `plan.md` §D 의 원본 모순 세 건에 대한 처리 결과가 §E.2 에 남았다.
- 테스트 실행이 프로세스를 남기지 않았다 — 품질 게이트의 `pgrep` 관측이 빈 출력이고, 그 출력이 §E.2 에 남았다.
- 형제 SPEC 과의 계약이 깨지지 않았다 — `SPEC-CHANNEL-001` 의 AC-CHANNEL-002·004·005 가 이 SPEC 착지 후에도 실행 가능하다는 것을 AC-CHANWIRE-014 (b) 로 확인했다.
