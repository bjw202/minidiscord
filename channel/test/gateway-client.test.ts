// SPEC-CHANCLIENT-001 게이트웨이 클라이언트 테스트 — acceptance.md 공통 하네스 + AC-CHANCLIENT-001~006
import { describe, it, expect, afterEach, vi } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import type { AddressInfo } from 'node:net'
import { createGatewayClient, type GatewayClientOpts } from '../src/gateway-client.js'

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

function startServer(): FakeServer {
  const wss = new WebSocketServer({ port: 0 })
  const messages: any[] = []
  const sockets: WebSocket[] = []
  const handlers: ((ws: WebSocket, msg: any) => void)[] = []
  wss.on('connection', ws => {
    sockets.push(ws)
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      messages.push(m)
      for (const h of handlers) h(ws, m)
    })
  })
  const srv: FakeServer = {
    wss, messages, sockets,
    on(handler) { handlers.push(handler) },
    url: () => `ws://127.0.0.1:${(wss.address() as AddressInfo).port}/bot`,
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
  it('sends hello with the token as the very first frame', async () => {
    const srv = startServer()
    await connected(srv)
    expect(srv.messages[0]).toEqual({ type: 'hello', token: 'tok123' })
  })

  // AC-CHANCLIENT-002 — welcome 을 손대지 않고 그대로 넘긴다
  it('passes the welcome frame through untouched, extra fields included', async () => {
    const srv = startServer()
    const got: any[] = []
    await connected(srv, { onWelcome: w => got.push(w) })
    const frame = { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm', missed_after_id: 42 }
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
    await waitFor(() => seen.length >= 1)
    expect(seen).toEqual(['message'])          // 앞서 보낸 미지의 프레임은 세지 않았다
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
})
