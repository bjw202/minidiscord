// SPEC-CHANCLIENT-001 게이트웨이 클라이언트 테스트 — acceptance.md 공통 하네스 + AC-CHANCLIENT-001~006
import { describe, it, expect, afterEach, vi } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import type { AddressInfo } from 'node:net'
import { createHash, createHmac } from 'node:crypto'
import { createGatewayClient, type GatewayClientOpts } from '../src/gateway-client.js'

// 증명 계산 헬퍼 — 이 파일이 자체 정의한다. src 의 구현을 부르지 않는다 (SPEC-GWAUTH-001 §3.5 —
// 사본이 함께 틀려도 기준이 알아채지 못하게 하려는 의도다). 이 하네스의 토큰 상수는 'tok123' 이다.
const keyOf = (token: string) => createHash('sha256').update(token).digest('hex')
const proofOf = (token: string, nonce: string, roomId: number, botId: number) =>
  createHmac('sha256', keyOf(token)).update(`${nonce}|${roomId}|${botId}`).digest('hex')

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
}

// autoWelcome: hello 를 받으면 welcome 으로 답한다. 기본값이 true 인 것이 v0.4.0 개정이다 —
// REQ-CHANCLIENT-004·005 의 분배 의무가 세션 확립 뒤에만 성립하므로(SPEC-CHANAUTH-001 §4.1),
// welcome 을 보내지 않는 서버를 상대로는 프레임 분배 기준이 아무것도 관측하지 못한다.
// 형제 하네스(index-wiring.test.ts·permission-relay.test.ts)가 이미 쓰는 형태와 같다.
// false 로 두는 자리는 하나뿐이다 — 자기 welcome 하나만 세는 AC-CHANCLIENT-002.
function startServer(opts: { autoWelcome?: boolean } = {}): FakeServer {
  const autoWelcome = opts.autoWelcome ?? true
  const wss = new WebSocketServer({ port: 0 })
  const messages: any[] = []
  const sockets: WebSocket[] = []
  const handlers: ((ws: WebSocket, msg: any) => void)[] = []
  let lastUrl = ''
  wss.on('connection', ws => {
    sockets.push(ws)
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      messages.push(m)
      if (autoWelcome && m.type === 'hello') {
        // SPEC-GWAUTH-001: hello 에 논스가 실려 오면 그 논스로 증명을 계산해 welcome 에 싣는다 —
        // 증명 없는 welcome 은 채널이 거절하므로(REQ-GWAUTH-006) 스텁 서버도 같은 규칙을 따라야 한다.
        const welcome: Record<string, unknown> = { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm', missed_after_id: 0 }
        if (typeof m.nonce === 'string') welcome.proof = proofOf(m.token, m.nonce, 1, 2)
        ws.send(JSON.stringify(welcome))
      }
      for (const h of handlers) h(ws, m)
    })
  })
  const srv: FakeServer = {
    wss, messages, sockets,
    on(handler) { handlers.push(handler) },
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

// 클라이언트를 만들어 start() 하고, hello 가 서버에 도착할 때까지 기다린다.
// sleeps 에는 재접속 대기 인자가 순서대로 쌓인다. 주입된 sleep 은 실제로 기다리지 않는다.
async function connected(srv: FakeServer, over: Partial<GatewayClientOpts> = {}) {
  const sleeps: number[] = []
  const client = createGatewayClient({
    url: () => srv.url(),
    token: 'tok123',
    sleep: async ms => { sleeps.push(ms); await new Promise(r => setTimeout(r, 1)) },
    ...over,
  })
  cleanups.push(() => client.stop())
  client.start()
  await waitFor(() => srv.messages.some(m => m.type === 'hello'))
  return { client, sleeps }
}

describe('gateway client', () => {
  // AC-CHANCLIENT-001 — 소켓이 열리면 hello 가 첫 프레임으로 나간다
  // (v0.6.0 계약 개정, SPEC-GWAUTH-001 — hello 는 token 에 논스를 더한 정확히 세 필드다)
  it('sends hello with the token as the very first frame', async () => {
    const srv = startServer()
    await connected(srv)
    expect(Object.keys(srv.messages[0]).sort()).toEqual(['nonce', 'token', 'type'])
    expect(srv.messages[0].token).toBe('tok123')
    expect(srv.messages[0].nonce).toMatch(/^[0-9a-f]{64}$/)   // 값은 고정하지 않는다 — 무작위성은 011 이 소켓 간 대조로 잰다
  })

  // AC-CHANCLIENT-002 — welcome 을 손대지 않고 그대로 넘긴다
  // (v0.6.0 계약 개정, SPEC-GWAUTH-001 — 증명 없는 welcome 은 거절되므로 통과 충실성을 재려면
  //  이 하네스가 관측한 논스로 계산한 유효한 증명을 실어 보내야 한다. REQ-CHANCLIENT-003 은
  //  증명 필드가 늘어난 뒤에도 유지된다)
  it('passes the welcome frame through untouched, extra fields included', async () => {
    const srv = startServer({ autoWelcome: false })   // 이 기준만 자기 welcome 하나를 직접 보낸다
    const got: any[] = []
    await connected(srv, { onWelcome: w => got.push(w) })
    const helloNonce = srv.messages.find(m => m.type === 'hello').nonce
    const frame = { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm', missed_after_id: 42, proof: proofOf('tok123', helloNonce, 1, 2) }
    srv.sockets[0].send(JSON.stringify(frame))
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual(frame)
  })

  // AC-CHANCLIENT-003 — message 를 손대지 않고 그대로 넘긴다
  it('passes the message frame through untouched, files and delivery included', async () => {
    const srv = startServer()
    const got: any[] = []
    await connected(srv, { onMessage: m => got.push(m) })
    const frame = {
      type: 'message', id: 7, body: '안녕', author_name: 'alice', delivery: 'cc',
      files: [{ name: 'a.png', local_path: '/tmp/up/a.png' }],
    }
    srv.sockets[0].send(JSON.stringify(frame))
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual(frame)
  })

  // AC-CHANCLIENT-004 — 판정을 판정으로 넘긴다
  it('passes a deny verdict through as deny', async () => {
    const srv = startServer()
    const got: any[] = []
    await connected(srv, { onVerdict: v => got.push(v) })
    srv.sockets[0].send(JSON.stringify({ type: 'permission_verdict', request_id: 'abcde', behavior: 'deny' }))
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'deny' })
  })

  // AC-CHANCLIENT-005 — 모르는 프레임은 어디로도 새지 않는다
  it('routes by type only — an unknown frame reaches no callback', async () => {
    const srv = startServer()
    const seen: string[] = []
    await connected(srv, {
      onMessage: () => seen.push('message'),
      onVerdict: () => seen.push('verdict'),
      onWelcome: () => seen.push('welcome'),
    })
    const sock = srv.sockets[0]
    sock.send(JSON.stringify({ type: 'presence', body: '모르는 프레임' }))   // 먼저 보낸다
    sock.send(JSON.stringify({ type: 'message', id: 1, body: 'x', author_name: 'a', delivery: 'to' }))
    await waitFor(() => seen.length >= 2)
    // 하네스가 hello 에 welcome 으로 답하므로 welcome 이 먼저 온다 (v0.4.0).
    // 미지의 프레임 presence 는 그 사이에 있었고 세지 않았다.
    expect(seen).toEqual(['welcome', 'message'])
  })

  it('survives frames whose callback was not provided', async () => {
    const srv = startServer()
    const { client } = await connected(srv)     // 콜백 없음
    const sock = srv.sockets[0]
    sock.send(JSON.stringify({ type: 'message', id: 1, body: 'x', author_name: 'a', delivery: 'to' }))
    sock.send(JSON.stringify({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' }))
    expect(client.send({ type: 'still_alive' })).toBe(true)
    await waitFor(() => srv.messages.some(m => m.type === 'still_alive'))
  })

  // 회귀: JSON 아닌 프레임 한 개가 프로세스를 끝내지 않는다 (감사 F-05)
  // 리스너 안의 throw 는 uncaughtException 으로 올라간다 — 재접속조차 없이 봇이 사라진다.
  it('drops a malformed frame and keeps processing the next valid one', async () => {
    const srv = startServer()
    const got: any[] = []
    const { client } = await connected(srv, { onMessage: m => got.push(m) })
    const sock = srv.sockets[0]
    sock.send('not-json{')                                   // 먼저 깨진 프레임
    const frame = { type: 'message', id: 1, body: 'x', author_name: 'a', delivery: 'to' }
    sock.send(JSON.stringify(frame))                          // 그 뒤 정상 프레임
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual(frame)                             // 깨진 프레임 뒤에도 배달된다
    expect(client.send({ type: 'still_alive' })).toBe(true)   // 연결도 살아 있다
    await waitFor(() => srv.messages.some(m => m.type === 'still_alive'))
  })

  // AC-CHANCLIENT-006 — send 의 true/false 가 실제 전송과 일치한다
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

  // AC-CHANCLIENT-007 — 이력 요청 프레임이 다섯 파라미터를 그대로 싣는다
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

    srv.sockets[0].send(JSON.stringify({ type: 'history_response', rid, messages: [] }))
    await p                                       // 남은 약속을 정리한다 (열린 타이머를 남기지 않는다)
  })

  // AC-CHANCLIENT-008 — rid 로 맞추고, 도착 순서로 맞추지 않는다
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
    sock.send(JSON.stringify({ type: 'history_response', rid: rids[1], messages: [{ id: 2 }] }))   // 역순
    sock.send(JSON.stringify({ type: 'history_response', rid: rids[0], messages: [{ id: 1 }] }))

    expect(await p1).toEqual({ type: 'history_response', rid: rids[0], messages: [{ id: 1 }] })
    expect(await p2).toEqual({ type: 'history_response', rid: rids[1], messages: [{ id: 2 }] })
  })

  // AC-CHANCLIENT-009 — 10초에 정확히 끊는다
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

  // AC-CHANCLIENT-010 — 연결이 없으면 즉시 실패하고 흔적을 남기지 않는다
  it('fails a history request immediately when not connected, and recovers after connecting', async () => {
    const srv = startServer()
    const client = createGatewayClient({ url: () => srv.url(), token: 'tok123', sleep: async () => {} })
    cleanups.push(() => client.stop())

    await expect(client.requestHistory({ limit: 1 })).rejects.toThrow()
    expect(srv.messages.length).toBe(0)                 // 아무 프레임도 나가지 않았다

    srv.on((ws, m) => {
      if (m.type === 'history_request') ws.send(JSON.stringify({ type: 'history_response', rid: m.rid, messages: [] }))
    })
    client.start()
    await waitFor(() => srv.messages.some(m => m.type === 'hello'))
    expect(await client.requestHistory({ limit: 1 })).toEqual(
      expect.objectContaining({ type: 'history_response', messages: [] }),
    )
  })

  // AC-CHANCLIENT-011 — 끊기면 대기 후 새 주소로 다시 붙는다
  // (v0.6.0 계약 개정, SPEC-GWAUTH-001 — 재접속 hello 도 같은 세 필드다. 새 서버의 새 논스가
  //  첫 소켓의 것과 다름이 곧 논스 재생성의 관측이다)
  it('waits then reconnects to the replaced opts.url and says hello again', async () => {
    const srv1 = startServer()
    const { client, sleeps } = await connected(srv1)
    const nonce1 = srv1.messages.find(m => m.type === 'hello').nonce

    const srv2 = startServer()                          // 새 포트에 두 번째 서버
    client.opts.url = srv2.url()                        // 문자열 형태로 교체 (원본 계약의 노출 경로)
    await stopServer(srv1)                              // 연결이 끊긴다

    await waitFor(() => srv2.messages.some(m => m.type === 'hello'))
    expect(sleeps[0]).toBe(1000)                        // 즉시 재시도가 아니라 1초를 기다렸다
    expect(Object.keys(srv2.messages[0]).sort()).toEqual(['nonce', 'token', 'type'])
    expect(srv2.messages[0].token).toBe('tok123')
    expect(srv2.messages[0].nonce).not.toBe(nonce1)     // 소켓이 바뀌면 논스도 새로 만들어진다
  })

  // AC-CHANCLIENT-012 — 백오프가 두 배씩 늘고 상한에서 멈춘다
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

  // AC-CHANCLIENT-013 — 연결에 성공하면 백오프가 처음으로 돌아간다
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

  // AC-CHANCLIENT-014 — stop() 뒤에는 다시 붙지 않는다 (부정 사례)
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

  // AC-GWAUTH-015 — 증명을 실은 welcome 도 손대지 않고 그대로 넘긴다 (SPEC-GWAUTH-001).
  // wire() 는 onWelcome 을 배선하지 않으므로 이 관측은 createGatewayClient 를 직접 쓰는
  // 이 하네스에서만 성립한다 — AC-CHANCLIENT-002 와 별개로 이 SPEC 이 들이는 필드의 관측이다.
  it('passes a proof-bearing welcome through untouched, proof field included', async () => {
    const srv = startServer({ autoWelcome: false })
    const got: any[] = []
    await connected(srv, { onWelcome: w => got.push(w) })
    // 이 하네스는 rogueGateway 가 아니므로 논스를 srv.messages 에서 읽는다 (nonceSeen 접근자 없음)
    const helloNonce = srv.messages.find(m => m.type === 'hello').nonce
    const frame = { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm', missed_after_id: 42, proof: proofOf('tok123', helloNonce, 1, 2) }
    srv.sockets[0].send(JSON.stringify(frame))
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual(frame)                        // proof 필드를 포함해 프레임 객체가 통째로 그대로
  })
})
