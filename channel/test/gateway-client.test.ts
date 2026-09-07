// 게이트웨이 클라이언트 기준 — v2 A 단계 (SPEC-BOTMODEL-001). 접속은 맨몸 hello{token} → 맨몸 welcome 한 왕복이고
// 이후 프레임도 전부 맨몸 JSON 이다. 남긴 절: 접속·백오프(1초 배증·상한 30초·open 시 복귀)·stop() 가드·
// requestHistory 의 rid 대조 (SPEC-CHANCLIENT-001 이관) · AC-BOTSTAB-001·003·012.
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
  sendInner(ws: WebSocket, inner: object): void       // 맨몸 프레임을 보낸다 (이름은 v1 하네스에서 이어 왔다)
  establishedCount(): number                          // welcome 을 받은 소켓의 수
}

const WELCOME = { type: 'welcome', bot_id: 2, bot_name: 'pm', rooms: [{ room_id: 1, room_name: 'A' }, { room_id: 3, room_name: 'C' }] }

// autoWelcome: hello{token} 이 오면 맨몸 welcome 으로 답한다. 토큰이 다르면 닫는다 (서버의 REQ-BOTMODEL-012 모양).
function startServer(opts: { autoWelcome?: boolean; token?: string } = {}): FakeServer {
  const autoWelcome = opts.autoWelcome ?? true
  const token = opts.token ?? 'tok123'
  const wss = new WebSocketServer({ port: 0 })
  const messages: any[] = []
  const sockets: WebSocket[] = []
  const handlers: ((ws: WebSocket, msg: any) => void)[] = []
  const welcomed = new Set<WebSocket>()
  let lastUrl = ''

  const sendInner = (ws: WebSocket, inner: object): void => { ws.send(JSON.stringify(inner)) }

  wss.on('connection', ws => {
    sockets.push(ws)
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      messages.push(m)
      if (m.type === 'hello') {
        if (m.token !== token) { ws.close(); return }
        welcomed.add(ws)
        if (autoWelcome) sendInner(ws, WELCOME)
        return
      }
      for (const h of handlers) h(ws, m)
    })
  })
  const srv: FakeServer = {
    wss, messages, sockets,
    on(handler) { handlers.push(handler) },
    sendInner,
    establishedCount: () => welcomed.size,
    // address() 는 리스닝 전·close 후에 null 을 내므로 마지막 유효 주소를 돌려준다
    url: () => {
      const addr = wss.address()
      if (addr) lastUrl = `ws://127.0.0.1:${(addr as AddressInfo).port}/bot`
      return lastUrl
    },
  }
  cleanups.push(() => stopServer(srv))
  return srv
}

async function stopServer(srv: FakeServer): Promise<void> {
  for (const ws of srv.sockets) ws.terminate()
  await new Promise<void>(r => srv.wss.close(() => r()))
}

async function waitFor(cond: () => boolean): Promise<void> {
  while (!cond()) await new Promise(r => setTimeout(r, 5))
}

async function deadUrl(): Promise<string> {
  const srv = startServer()
  const u = srv.url()
  await stopServer(srv)
  return u
}

// 클라이언트를 만들어 start() 하고 «그 클라이언트의 hello 가 환영받을 때까지» 기다린다.
// 절대 개수가 아니라 «호출 전후의 증가» 를 재는 이유: 한 서버에 두 클라이언트를 붙이는 자리에서
// 앞선 클라이언트의 확립을 자기 것으로 착각하지 않기 위해서다.
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

// AC-BOTSTAB-001·012 가 쓰는 게이트 클라이언트 — 대기 만료를 시험이 release() 로 결정한다.
function startGatedClient(srv: FakeServer) {
  const sleeps: number[] = []
  let release!: () => void
  const settled = new Promise<void>(r => { release = r })
  const client = createGatewayClient({
    url: () => srv.url(),
    token: 'tok123',
    sleep: async ms => { sleeps.push(ms); await settled },
  })
  cleanups.push(() => client.stop())
  return { client, sleeps, release, settled }
}

// 대기 만료 뒤에 세계가 돌았음의 증거 — probe 연결 하나의 hello 가 서버에 도착하는 것을 기다린다.
async function letWorldTurn(srv: FakeServer): Promise<void> {
  const before = srv.messages.length
  const probe = new WebSocket(srv.url())
  probe.on('open', () => probe.send(JSON.stringify({ type: 'hello', token: 'probe' })))
  cleanups.push(() => probe.close())
  await waitFor(() => srv.messages.length > before)
}

// AC-BOTSTAB-012 의 무가드 대역 — src 의 retry 와 같은 절차에서 가드 ② (`if (stopped) return`) 한 줄만 뺀 재시도 절차.
function startReplica(url: () => string, sleep: (ms: number) => Promise<void>) {
  let backoff = 1000
  let stopped = false
  let socket: WebSocket | null = null
  function connect() {
    socket = new WebSocket(url())
    socket.on('close', () => { if (!stopped) retry() })   // 가드 ① — src 와 같다
  }
  async function retry() {
    await sleep(backoff)
    // src 의 retry 에는 여기에 `if (stopped) return` 이 있다 — 이 한 줄의 부재가 ㉢ 이 재는 차이의 전부다
    backoff = Math.min(backoff * 2, 30000)
    connect()
  }
  connect()
  return { stop() { stopped = true; socket?.close() } }
}

describe('gateway client', () => {
  // AC-CHANCLIENT-001 (v2) — 소켓이 열리면 맨몸 hello{token} 이 첫 프레임으로 나간다. 키는 정확히 둘이다.
  it('sends bare hello{token} as the very first frame', async () => {
    const srv = startServer()
    await connected(srv)
    expect(Object.keys(srv.messages[0]).sort()).toEqual(['token', 'type'])
    expect(srv.messages[0]).toEqual({ type: 'hello', token: 'tok123' })
  })

  // welcome 은 소비될 뿐 어떤 콜백에도 가지 않는다 — onWelcome 은 삭제 목록에 있다 (REQ-BOTMODEL-015)
  it('consumes the welcome frame without dispatching it to any callback', async () => {
    const srv = startServer()
    const seen: string[] = []
    const { client } = await connected(srv, { onMessage: () => seen.push('message'), onVerdict: () => seen.push('verdict') })
    expect(client.opts).not.toHaveProperty('onWelcome')
    srv.sendInner(srv.sockets[0], { type: 'message', room_id: 1, id: 1, body: 'x', author_name: 'a', author_type: 'user', delivery: 'to' })
    await waitFor(() => seen.length >= 1)
    expect(seen).toEqual(['message'])   // welcome 은 세어지지 않았다
  })

  // AC-CHANCLIENT-003 (v2) — message 를 손대지 않고 그대로 넘긴다. room_id·author_type 도 그대로다.
  it('passes the message frame through untouched — room_id, author_type, files and delivery included', async () => {
    const srv = startServer()
    const got: any[] = []
    await connected(srv, { onMessage: m => got.push(m) })
    const frame = {
      type: 'message', room_id: 3, id: 7, body: '안녕', author_name: 'alice', author_type: 'user', delivery: 'cc',
      files: [{ name: 'a.png', local_path: '/tmp/up/a.png' }],
    }
    srv.sendInner(srv.sockets[0], frame)
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual(frame)
  })

  // AC-CHANCLIENT-004 — 판정을 판정으로 넘긴다
  it('passes a deny verdict through as deny', async () => {
    const srv = startServer()
    const got: any[] = []
    await connected(srv, { onVerdict: v => got.push(v) })
    srv.sendInner(srv.sockets[0], { type: 'permission_verdict', request_id: 'abcde', behavior: 'deny' })
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'deny' })
  })

  // AC-CHANCLIENT-005 — 모르는 프레임은 어디로도 새지 않는다
  it('routes by type only — an unknown frame reaches no callback', async () => {
    const srv = startServer()
    const seen: string[] = []
    await connected(srv, { onMessage: () => seen.push('message'), onVerdict: () => seen.push('verdict') })
    const sock = srv.sockets[0]
    srv.sendInner(sock, { type: 'presence', body: '모르는 프레임' })   // 먼저 보낸다
    srv.sendInner(sock, { type: 'message', room_id: 1, id: 1, body: 'x', author_name: 'a', author_type: 'user', delivery: 'to' })
    await waitFor(() => seen.length >= 1)
    expect(seen).toEqual(['message'])
  })

  it('survives frames whose callback was not provided', async () => {
    const srv = startServer()
    const { client } = await connected(srv)     // 콜백 없음
    const sock = srv.sockets[0]
    srv.sendInner(sock, { type: 'message', room_id: 1, id: 1, body: 'x', author_name: 'a', author_type: 'user', delivery: 'to' })
    srv.sendInner(sock, { type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
    expect(client.send({ type: 'still_alive' })).toBe(true)
    await waitFor(() => srv.messages.some(m => m.type === 'still_alive'))
  })

  // 회귀: JSON 아닌 프레임 한 개가 프로세스를 끝내지 않는다 (감사 F-05)
  it('drops a malformed frame and keeps processing the next valid one', async () => {
    const srv = startServer()
    const got: any[] = []
    const { client } = await connected(srv, { onMessage: m => got.push(m) })
    const sock = srv.sockets[0]
    sock.send('not-json{')
    const frame = { type: 'message', room_id: 1, id: 1, body: 'x', author_name: 'a', author_type: 'user', delivery: 'to' }
    srv.sendInner(sock, frame)
    await waitFor(() => got.length === 1)
    expect(got[0]).toEqual(frame)
    expect(client.send({ type: 'still_alive' })).toBe(true)
    await waitFor(() => srv.messages.some(m => m.type === 'still_alive'))
  })

  // AC-CHANCLIENT-006 — send 의 true/false 가 실제 전송과 일치한다
  it('sends only while open, and reports it truthfully', async () => {
    const srv = startServer()
    const client = createGatewayClient({ url: () => srv.url(), token: 'tok123', sleep: async () => { await new Promise(r => setTimeout(r, 1)) } })
    cleanups.push(() => client.stop())
    expect(client.send({ type: 'too_early' })).toBe(false)
    client.start()
    await waitFor(() => srv.messages.some(m => m.type === 'hello'))
    expect(client.send({ type: 'marker' })).toBe(true)
    await waitFor(() => srv.messages.some(m => m.type === 'marker'))
    expect(srv.messages.some(m => m.type === 'too_early')).toBe(false)
    client.stop()
    await waitFor(() => srv.sockets[0].readyState === WebSocket.CLOSED)
    expect(client.send({ type: 'too_late' })).toBe(false)
  })

  // AC-CHANCLIENT-007 (v2) — 이력 요청 프레임이 room_id 와 다섯 파라미터를 그대로 싣는다 (REQ-BOTMODEL-013 의 채널 쪽)
  it('puts room_id and every history parameter on the frame top level', async () => {
    const srv = startServer()
    const { client } = await connected(srv)
    const p = client.requestHistory({ room_id: 3, since_id: 41, since: '2026-08-01', until: '2026-08-02', speaker: 'alice', limit: 5 })
    await waitFor(() => srv.messages.some(m => m.type === 'history_request'))
    const frame = srv.messages.find(m => m.type === 'history_request')!
    expect(typeof frame.rid).toBe('string')
    expect(frame.rid.length).toBeGreaterThan(0)
    const { rid, ...rest } = frame
    expect(rest).toEqual({ type: 'history_request', room_id: 3, since_id: 41, since: '2026-08-01', until: '2026-08-02', speaker: 'alice', limit: 5 })
    srv.sendInner(srv.sockets[0], { type: 'history_response', room_id: 3, rid, messages: [] })
    await p
  })

  // AC-CHANCLIENT-008 — rid 로 맞추고, 도착 순서로 맞추지 않는다
  it('matches responses by rid, not by arrival order', async () => {
    const srv = startServer()
    const { client } = await connected(srv)
    const rids: string[] = []
    srv.on((_ws, m) => { if (m.type === 'history_request') rids.push(m.rid) })
    const p1 = client.requestHistory({ room_id: 1, limit: 1 })
    const p2 = client.requestHistory({ room_id: 1, limit: 2 })
    await waitFor(() => rids.length === 2)
    expect(rids[0]).not.toBe(rids[1])
    const sock = srv.sockets[0]
    srv.sendInner(sock, { type: 'history_response', room_id: 1, rid: rids[1], messages: [{ id: 2 }] })   // 역순
    srv.sendInner(sock, { type: 'history_response', room_id: 1, rid: rids[0], messages: [{ id: 1 }] })
    expect(await p1).toEqual({ type: 'history_response', room_id: 1, rid: rids[0], messages: [{ id: 1 }] })
    expect(await p2).toEqual({ type: 'history_response', room_id: 1, rid: rids[1], messages: [{ id: 2 }] })
  })

  // AC-CHANCLIENT-009 — 10초에 정확히 끊는다
  it('rejects a history request at 10 seconds, not before', async () => {
    const srv = startServer()
    const { client } = await connected(srv)
    vi.useFakeTimers()
    const p = client.requestHistory({ room_id: 1, limit: 1 })
    let state: 'pending' | 'resolved' | 'rejected' = 'pending'
    p.then(() => { state = 'resolved' }, () => { state = 'rejected' })
    await vi.advanceTimersByTimeAsync(9_999)
    expect(state).toBe('pending')
    await vi.advanceTimersByTimeAsync(1)
    expect(state).toBe('rejected')
    await expect(p).rejects.toThrow()
  })

  // AC-CHANCLIENT-010 — 연결이 없으면 즉시 실패하고 흔적을 남기지 않는다
  it('fails a history request immediately when not connected, and recovers after connecting', async () => {
    const srv = startServer()
    const client = createGatewayClient({ url: () => srv.url(), token: 'tok123', sleep: async () => {} })
    cleanups.push(() => client.stop())
    await expect(client.requestHistory({ room_id: 1, limit: 1 })).rejects.toThrow()
    expect(srv.messages.length).toBe(0)
    srv.on((ws, m) => {
      if (m.type === 'history_request') srv.sendInner(ws, { type: 'history_response', room_id: 1, rid: m.rid, messages: [] })
    })
    client.start()
    await waitFor(() => srv.establishedCount() >= 1)
    expect(await client.requestHistory({ room_id: 1, limit: 1 })).toEqual(expect.objectContaining({ type: 'history_response', messages: [] }))
  })

  // AC-CHANCLIENT-011 — 끊기면 대기 후 새 주소로 다시 붙고 같은 토큰으로 hello 를 다시 보낸다
  it('waits then reconnects to the replaced opts.url and says hello again', async () => {
    const srv1 = startServer()
    const { client, sleeps } = await connected(srv1)
    const srv2 = startServer()
    client.opts.url = srv2.url()
    await stopServer(srv1)
    await waitFor(() => srv2.messages.some(m => m.type === 'hello'))
    expect(sleeps[0]).toBe(1000)
    expect(srv2.messages[0]).toEqual({ type: 'hello', token: 'tok123' })
  })

  // AC-CHANCLIENT-012 — 백오프가 두 배씩 늘고 상한에서 멈춘다
  it('doubles the backoff and never exceeds the ceiling', async () => {
    const url = await deadUrl()
    const sleepsA: number[] = []
    const a = createGatewayClient({ url, token: 't', sleep: async ms => { sleepsA.push(ms); await new Promise(r => setTimeout(r, 1)) } })
    cleanups.push(() => a.stop())
    a.start()
    await waitFor(() => sleepsA.length >= 8)
    expect(sleepsA.slice(0, 8)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000])

    const sleepsB: number[] = []
    const b = createGatewayClient({ url, token: 't', maxBackoffMs: 2500, sleep: async ms => { sleepsB.push(ms); await new Promise(r => setTimeout(r, 1)) } })
    cleanups.push(() => b.stop())
    b.start()
    await waitFor(() => sleepsB.length >= 4)
    expect(sleepsB.slice(0, 4)).toEqual([1000, 2000, 2500, 2500])
  })

  // AC-CHANCLIENT-013 — 연결에 성공하면 백오프가 처음으로 돌아간다
  it('resets the backoff to 1000 after a successful connection', async () => {
    let current = startServer()
    const sleeps: number[] = []
    const client = createGatewayClient({ url: () => current.url(), token: 'tok123', sleep: async ms => { sleeps.push(ms); await new Promise(r => setTimeout(r, 1)) } })
    cleanups.push(() => client.stop())
    client.start()
    await waitFor(() => current.messages.some(m => m.type === 'hello'))
    await stopServer(current)
    await waitFor(() => sleeps.length >= 1)
    expect(sleeps[0]).toBe(1000)
    current = startServer()
    await waitFor(() => current.messages.some(m => m.type === 'hello'))
    const before = sleeps.length
    await stopServer(current)
    await waitFor(() => sleeps.length > before)
    expect(sleeps[before]).toBe(1000)
  })

  // AC-CHANCLIENT-014 — stop() 이후 도착한 close 는 재시도 경로에 들어가지 않는다
  it('does not enter the retry path when close arrives after stop()', async () => {
    const srv = startServer()
    const stopped = await connected(srv)
    const control = await connected(srv)
    await waitFor(() => srv.sockets.length === 2)
    stopped.client.stop()
    await stopServer(srv)
    await waitFor(() => control.sleeps.length >= 1)
    expect(stopped.sleeps).toEqual([])
    expect(stopped.client.send({ type: 'anything' })).toBe(false)
  })

  // AC-BOTSTAB-001 — 백오프 대기 중에 stop() 이 불리면 새 연결이 한 건도 생기지 않는다
  it('does not open a new connection when stop() lands during the backoff wait', async () => {
    const srv = startServer()
    const g = startGatedClient(srv)
    g.client.start()
    await waitFor(() => srv.establishedCount() >= 1)
    srv.sockets[0].terminate()
    await waitFor(() => g.sleeps.length >= 1)
    const atStop = srv.sockets.length
    g.client.stop()
    g.release()
    await g.settled
    await letWorldTurn(srv)
    expect(srv.sockets.length).toBe(atStop + 1)   // +1 은 probe 자신
  })

  // AC-BOTSTAB-003 — stop() 을 부르지 않으면 재접속은 여전히 일어난다
  it('reconnects exactly once when stop() is not called', async () => {
    const srv = startServer()
    const { sleeps } = await connected(srv)
    const before = srv.sockets.length
    srv.sockets[0].terminate()
    await waitFor(() => sleeps.length >= 1)
    await waitFor(() => srv.sockets.length > before)
    expect(srv.sockets.length).toBe(before + 1)
    expect(sleeps[0]).toBe(1000)
  })

  // AC-BOTSTAB-012 — AC-001 의 술어가 무가드 대역을 실패시킨다 (기준의 판별력)
  it('the no-new-connection predicate fails for a replica that omits the stopped check', async () => {
    const srv = startServer()
    const g = startGatedClient(srv)
    g.client.start()
    await waitFor(() => srv.establishedCount() >= 1)
    srv.sockets[0].terminate()
    await waitFor(() => g.sleeps.length >= 1)
    const realAtStop = srv.sockets.length
    g.client.stop()
    g.release()
    await g.settled
    await letWorldTurn(srv)
    expect(srv.sockets.length).toBe(realAtStop + 1)

    const srv2 = startServer()
    let replicaRelease!: () => void
    const replicaSettled = new Promise<void>(r => { replicaRelease = r })
    const replicaSleeps: number[] = []
    const replica = startReplica(() => srv2.url(), async ms => { replicaSleeps.push(ms); await replicaSettled })
    await waitFor(() => srv2.sockets.length >= 1)
    srv2.sockets[0].terminate()
    await waitFor(() => replicaSleeps.length >= 1)
    const replicaAtStop = srv2.sockets.length
    replica.stop()
    replicaRelease()
    await replicaSettled
    await waitFor(() => srv2.sockets.length > replicaAtStop)
    expect(srv2.sockets.length).toBe(replicaAtStop + 1)
  })
})
