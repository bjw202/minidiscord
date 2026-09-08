// 봇 게이트웨이 기준 — v2 A 단계 (SPEC-BOTMODEL-001). 접속은 봇 단위(hello{token} → welcome{rooms})이고
// 방은 프레임이 싣는다. 이 파일은 실제 createGateway 와 실제 ws 클라이언트로 잰다 — 스텁이 아니다.
// v1 의 GWAUTH2 절(핸드셰이크·봉투·순번)은 사라졌다. 첨부 뿌리·이력·권한 경로·절대 경로 절은 room_id 를
// 더해 남겼고, SPEC-WSUPGRADE-001 의 상시 관측자(비(非)101 포획)는 하네스에 그대로 산다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, isAbsolute, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerBotRoutes } from '../src/routes-bots.js'
import multipart from '@fastify/multipart'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { attributeHits, type CaptureRecord, type WinEntry } from './wsupgrade-judgment.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
  mkdirSync(join(dir, 'up'), { recursive: true })
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// SPEC-WSUPGRADE-001 M1 — 자기 앱 수신 관측 저장소(spec.md §2 「자기 앱 수신 관측」). build() 가
// 관측 한 벌을 하나씩 쌓고, wsConnect 의 포획이 자기 포트로 관측을 찾아 귀속 대조를 한다.
interface WsUpgradeObservation {
  ownPort: number
  w1: WinEntry[]
  w2: WinEntry[]
  app: { server: { listening: boolean; address(): unknown } }
}
const wsupgradeObservations: WsUpgradeObservation[] = []

function wsupgradeObservationOf(port: number): WsUpgradeObservation | undefined {
  for (let i = wsupgradeObservations.length - 1; i >= 0; i--) {
    if (wsupgradeObservations[i].ownPort === port) return wsupgradeObservations[i]
  }
  return undefined
}

function wsupgradeSockEnds(socket: unknown): {
  localAddress: string | null; localPort: number | null
  remoteAddress: string | null; remotePort: number | null
  localFamily: string | null; remoteFamily: string | null
} {
  const s = socket as {
    localAddress?: string | null; localPort?: number | null
    remoteAddress?: string | null; remotePort?: number | null
    localFamily?: string | null; remoteFamily?: string | null
  } | null | undefined
  return {
    localAddress: s?.localAddress ?? null,
    localPort: typeof s?.localPort === 'number' ? s.localPort : null,
    remoteAddress: s?.remoteAddress ?? null,
    remotePort: typeof s?.remotePort === 'number' ? s.remotePort : null,
    localFamily: s?.localFamily ?? null,
    remoteFamily: s?.remoteFamily ?? null,
  }
}

// 기록 자리 — 저장소 루트 기준 .moai/reports/t39/captures/ (SPEC-WSUPGRADE-001 acceptance.md §A). 포획 0건인
// 실행은 흔적을 남기지 않고, 기록 실패는 원래 실패를 가리지 않는다 (plan.md §C).
let wsupgradeCaptureSeq = 0
function wsupgradePersistCapture(record: CaptureRecord): void {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const capturesDir = join(root, '.moai', 'reports', 't39', 'captures')
    mkdirSync(capturesDir, { recursive: true })
    const name = `capture-${record.capturedAt.replace(/[:.]/g, '-')}-${++wsupgradeCaptureSeq}.json`
    writeFileSync(join(capturesDir, name), JSON.stringify(record, null, 2) + '\n')
  } catch { /* 포획 기록의 실패는 조용히 — 관측이 시험을 바꾸지 않는다(G-1) */ }
}

// hub.publish 를 감싸 발행 내역을 기록한다. SseHub 가 publish 를 속성으로 갖는 평범한 객체라는 계약에 의존한다.
async function build(opts: { botFiles?: 'off'; messages?: true } = {}) {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  // messages: 사람 경로(POST /api/rooms/:id/messages)까지 같은 프로세스에 조립한다 — F3 (라우트 → deliver → ws) 시험용.
  // 조립 순서는 index.ts 와 같다: multipart 는 메시지 라우트 앞
  if (opts.messages) {
    await app.register(multipart)
    app.decorate('uploadsDir', join(dir, 'up'))
    registerMessageRoutes(app)
  }
  const hub = createSseHub()
  const published: { roomId: number; event: string; data: any }[] = []
  const orig = hub.publish.bind(hub)
  hub.publish = (roomId: number, event: string, data: any) => {
    published.push({ roomId, event, data })
    orig(roomId, event, data)
  }
  app.decorate('hub', hub)
  // SPEC-WSUPGRADE-001 M1 — 창2: Fastify onRequest 훅. 업그레이드 요청은 이 창을 통과하지 않는다.
  const w2: WinEntry[] = []
  app.addHook('onRequest', (req, _reply, done) => {
    w2.push({ window: 'onRequest', seq: w2.length + 1, path: req.raw.url ?? null, remotePort: wsupgradeSockEnds(req.raw.socket).remotePort, t: Date.now() })
    done()
  })
  registerAuthRoutes(app, db)
  registerBotRoutes(app)   // 참여 라우트 — AC-004 의 DELETE 와 AC-018 의 online 이 실제 라우트를 지난다
  // botFilesDir: 봇이 첨부로 보낼 수 있는 파일의 허용 뿌리. 테스트는 임시 트리 전체를 허용해
  // 첨부 테스트의 원본 파일(dir 바로 아래)이 그대로 통과하게 둔다.
  const gateway = createGateway(app, {
    uploadsDir: join(dir, 'up'),
    botFilesDir: opts.botFiles === 'off' ? undefined : dir,
  })
  app.decorate('gateway', gateway)
  // SPEC-WSUPGRADE-001 M1 — 창1: 소비하지 않는 upgrade 리스너 (관측이 대상을 바꾸지 않는다, G-1)
  const w1: WinEntry[] = []
  app.server.on('upgrade', (req, socket) => {
    w1.push({ window: 'upgrade', seq: w1.length + 1, path: req.url ?? null, remotePort: wsupgradeSockEnds(socket).remotePort, t: Date.now() })
  })
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  wsupgradeObservations.push({ ownPort: port, w1, w2, app })
  return { app, hub, published, gateway, port, db }
}

async function loginOf(app: any): Promise<string> {
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice' } })
  const raw = login.headers['set-cookie'] ?? ''
  return (Array.isArray(raw) ? raw[0] : raw).split(';')[0]
}

function seedRoom(name = 'A'): number {
  return db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name).lastInsertRowid as number
}
// 봇은 신원이다 — 등록할 때 토큰 하나를 받는다. 시험은 토큰을 직접 심는다 (라우트를 부르지 않는다).
function seedBot(name = 'pm'): number {
  return db.prepare("INSERT INTO bots (name, description, token) VALUES (?, '', ?)").run(name, randomBytes(32).toString('hex')).lastInsertRowid as number
}
function tokenOf(botId: number): string {
  return (db.prepare('SELECT token FROM bots WHERE id=?').get(botId) as { token: string }).token
}
// 참여 = 방 × 봇. 커서는 이 행에 산다.
function joinRoom(roomId: number, botId: number): void {
  db.prepare('INSERT OR IGNORE INTO room_bots (room_id, bot_id) VALUES (?, ?)').run(roomId, botId)
}
function cursorOf(roomId: number, botId: number): number {
  return (db.prepare('SELECT last_delivered_id v FROM room_bots WHERE room_id=? AND bot_id=?')
    .get(roomId, botId) as { v: number }).v
}
function ins(roomId: number, body: string): number {
  return db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(roomId, body).lastInsertRowid as number
}
function target(id: number, bot: number, d: 'to' | 'cc' = 'to'): void {
  db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(id, bot, d)
}

// 접속 시점부터 프레임을 큐에 쌓는다. 서버는 welcome 과 재전송 message 를 같은 동기 블록에서 연속으로 보내고
// 루프백에서 두 프레임은 한 세그먼트로 합쳐지기 쉽다 — 큐가 그 마이크로태스크 경계를 없앤다.
type Inbox = { queue: any[]; waiters: { resolve: (m: any) => void; timer: NodeJS.Timeout }[] }
const inboxes = new WeakMap<WebSocket, Inbox>()

// v2 접속 — 맨몸 hello{token} 하나를 보내고 맨몸 welcome 으로 해소된다. welcome 은 큐에 넣지 않는다.
function wsConnect(port: number, token: string): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    const tOpen = Date.now()
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    // SPEC-WSUPGRADE-001 M1 — 비(非)101 응답의 원문 포획(AC-001·002)과 실패 재수립(REQ-004·AC-005).
    ws.on('unexpected-response', (req, res) => {
      const chunks: Buffer[] = []
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        try {
          const tClose = Date.now()
          const ends = wsupgradeSockEnds(res.socket)
          const headers: { name: string; value: string }[] = []
          for (let i = 0; i < res.rawHeaders.length; i += 2) headers.push({ name: res.rawHeaders[i], value: res.rawHeaders[i + 1] })
          const clientPath = req.path
          const observation = wsupgradeObservationOf(port)
          const windowLogs = { upgrade: observation?.w1 ?? [], onRequest: observation?.w2 ?? [] }
          const { hits, collision } = attributeHits(windowLogs, ends.localPort, clientPath, tOpen, tClose)
          wsupgradePersistCapture({
            statusCode: res.statusCode as number,
            statusLine: `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage ?? ''}`.trimEnd(),
            headers,
            body: Buffer.concat(chunks).toString('utf8'),
            localAddress: ends.localAddress, localPort: ends.localPort,
            remoteAddress: ends.remoteAddress, remotePort: ends.remotePort,
            localFamily: ends.localFamily, remoteFamily: ends.remoteFamily,
            windowLogs, attributionHits: hits, attributionHitCount: hits.length,
            tOpen, tClose, collision: collision ? '있음' : '없음',
            portPossession: observation === undefined ? null : { ownPort: port, listening: observation.app.server.listening, address: observation.app.server.address() },
            capturedAt: new Date(tClose).toISOString(),
            clientPath,
          })
        } catch { /* 포획·기록의 실패는 조용히 — 실패 재수립은 아래에서 어느 쪽이든 한다 */ }
        res.socket.destroy()
        ws.emit('error', new Error(`Unexpected server response: ${res.statusCode}`))
      }
      res.on('data', c => chunks.push(c as Buffer))
      res.on('end', finish)
      res.on('error', finish)
      res.on('close', finish)
    })
    const inbox: Inbox = { queue: [], waiters: [] }
    inboxes.set(ws, inbox)
    let welcomed = false
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', data => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'welcome' && !welcomed) {
        welcomed = true
        resolve({ ws, welcome: msg })
        return
      }
      const w = inbox.waiters.shift()
      if (w) { clearTimeout(w.timer); w.resolve(msg) } else inbox.queue.push(msg)
    })
    ws.on('error', reject)
    ws.on('close', () => reject(new Error('closed before welcome')))   // 이미 settle 됐으면 무해하다
  })
}

// 큐에 이미 들어온 것이 있으면 그것을 먼저 돌려준다.
function nextMessage(ws: WebSocket, timeoutMs = 2000): Promise<any> {
  const inbox = inboxes.get(ws)
  if (!inbox) return Promise.reject(new Error('wsConnect() 로 연 소켓에만 쓸 수 있다 — 프레임 큐가 없다'))
  if (inbox.queue.length > 0) return Promise.resolve(inbox.queue.shift())
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      reject(new Error('timeout waiting ws message'))
    }, timeoutMs)
    inbox.waiters.push({ resolve, timer })
  })
}

// 오지 말아야 할 메시지가 오지 않음을 관측한다. 큐에 이미 쌓여 있어도 실패다.
function expectNoMessage(ws: WebSocket, ms = 400): Promise<void> {
  const inbox = inboxes.get(ws)
  if (!inbox) return Promise.reject(new Error('wsConnect() 로 연 소켓에만 쓸 수 있다 — 프레임 큐가 없다'))
  if (inbox.queue.length > 0) return Promise.reject(new Error(`unexpected ws message: ${JSON.stringify(inbox.queue[0])}`))
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      resolve()
    }, ms)
    inbox.waiters.push({ resolve: m => reject(new Error(`unexpected ws message: ${JSON.stringify(m)}`)), timer })
  })
}

// 도착한 message 프레임을 시간 안에 전부 모은다 — 재전송 «집합» 을 재는 자리에 쓴다.
async function drainMessages(ws: WebSocket, quietMs = 400): Promise<any[]> {
  const got: any[] = []
  for (;;) {
    try { got.push(await nextMessage(ws, quietMs)) } catch { return got }
  }
}

function closedPromise(ws: WebSocket): Promise<void> {
  return new Promise(r => ws.on('close', () => r()))
}

describe('gateway', () => {
  // AC-BOTMODEL-014 — hello{token} → welcome{…rooms} 한 왕복 (REQ-BOTMODEL-011). 경로는 /bot 뿐이고 app 이 닫히면 소켓도 닫힌다.
  it('AC-014: answers hello{token} with one bare welcome listing the bot active rooms', async () => {
    const { app, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B'), archived = seedRoom('보관됨')
    const pm = seedBot('pm'), qa = seedBot('qa')
    joinRoom(roomA, pm); joinRoom(roomB, pm); joinRoom(archived, pm)
    db.prepare("UPDATE rooms SET status='archived' WHERE id=?").run(archived)
    joinRoom(roomB, qa)

    const a = await wsConnect(port, tokenOf(pm))
    const b = await wsConnect(port, tokenOf(qa))
    // 분별: 두 토큰이 서로 다른 봇으로 판정되고 rooms 는 그 봇의 활성 참여 전부다. 보관된 방은 빠진다.
    expect(Object.keys(a.welcome).sort()).toEqual(['bot_id', 'bot_name', 'rooms', 'type'])
    expect([a.welcome.bot_id, a.welcome.bot_name]).toEqual([pm, 'pm'])
    expect([...a.welcome.rooms].sort((x: any, y: any) => x.room_id - y.room_id))
      .toEqual([{ room_id: roomA, room_name: 'A' }, { room_id: roomB, room_name: 'B' }])
    expect([b.welcome.bot_id, b.welcome.bot_name]).toEqual([qa, 'qa'])
    expect(b.welcome.rooms).toEqual([{ room_id: roomB, room_name: 'B' }])
    // 맨몸 JSON — 봉투·순번·챌린지 키가 어디에도 없다 (REQ-BOTMODEL-015)
    for (const k of ['env', 'seq', 'mac', 'challenge', 'missed_after_id', 'room_id']) expect(a.welcome).not.toHaveProperty(k)

    // 경로 격리: /bot 이 아닌 경로는 업그레이드되지 않는다.
    const wrong = new WebSocket(`ws://127.0.0.1:${port}/nope`)
    const wrongFailed = await new Promise<boolean>(r => { wrong.on('error', () => r(true)); wrong.on('open', () => r(false)) })
    expect(wrongFailed).toBe(true)

    // onClose 정리: app 이 닫히면 열린 소켓도 닫힌다.
    const bothClosed = Promise.all([closedPromise(a.ws), closedPromise(b.ws)])
    await app.close()
    await bothClosed
  })

  // AC-BOTMODEL-014 (모르는 토큰) · REQ-BOTMODEL-012 — 어떤 프레임도 답하지 않고 닫는다. 미인증·비(非)JSON 프레임도 닫는다.
  it('AC-014: an unknown token gets no frame and a closed socket; unauthenticated and malformed frames close too', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), lonely = seedBot('lonely')
    joinRoom(room, pm)

    for (const bad of ['f'.repeat(64), 'not-a-token', '']) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      let frames = 0
      ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: bad })))
      ws.on('message', () => { frames++ })
      await closedPromise(ws)
      expect(frames).toBe(0)
    }
    // v1 모양의 hello(pub·client_nonce)도 토큰이 아니므로 같은 자리에서 닫힌다
    const v1 = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    let v1Frames = 0
    v1.on('open', () => v1.send(JSON.stringify({ type: 'hello', pub: 'a'.repeat(64), client_nonce: 'b'.repeat(64) })))
    v1.on('message', () => { v1Frames++ })
    await closedPromise(v1)
    expect(v1Frames).toBe(0)
    expect(gateway.isOnline(pm)).toBe(false)

    // 대조군: 방에 하나도 참여하지 않은 봇도 토큰이 맞으면 환영받는다 — rooms 가 빈 배열일 뿐이다.
    const alone = await wsConnect(port, tokenOf(lonely))
    expect(alone.welcome.rooms).toEqual([])
    alone.ws.close()

    // hello 없이 보낸 프레임은 처리되지 않고 접속이 닫힌다.
    const anon = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    await new Promise<void>(r => anon.on('open', () => r()))
    anon.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '몰래' }))
    await closedPromise(anon)
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)

    // 인증된 접속이라도 파싱 불가한 프레임을 보내면 조용히 닫힌다 — uncaught 예외가 아니라 정상 종료다.
    const ok = await wsConnect(port, tokenOf(pm))
    expect(gateway.isOnline(pm)).toBe(true)
    const okClosed = closedPromise(ok.ws)
    ok.ws.send('{이건 JSON 이 아니다')
    await okClosed
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
    expect(gateway.isOnline(pm)).toBe(false)

    await app.close()
  })

  // AC-BOTMODEL-003 — 방 둘의 커서가 다를 때 재접속 재전송 (REQ-BOTMODEL-017·018, 위험 3 변이 ㉠ 의 자리)
  it('AC-003: replays each room past its own cursor, in global id order, and advances each room cursor separately', async () => {
    const { app, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm'), qa = seedBot('qa')
    joinRoom(r1, pm); joinRoom(r2, pm); joinRoom(r2, qa)

    // 두 방에 타깃 메시지가 번갈아 쌓인다 — 전역 id 순서와 방별 순서가 함께 관측되게 섞는다
    const a1 = ins(r1, 'R1 하나'); target(a1, pm)
    const b1 = ins(r2, 'R2 하나'); target(b1, pm)
    const a2 = ins(r1, 'R1 둘'); target(a2, pm)
    const other = ins(r2, 'qa 앞으로'); target(other, qa)
    const b2 = ins(r2, 'R2 둘'); target(b2, pm)
    const a3 = ins(r1, 'R1 셋'); target(a3, pm)
    ins(r2, '아무에게도 아닌 것')
    // 커서를 서로 다른 값으로 심는다: R1 은 그 방 두 번째 메시지, R2 는 0
    db.prepare('UPDATE room_bots SET last_delivered_id=? WHERE room_id=? AND bot_id=?').run(a2, r1, pm)

    const { ws } = await wsConnect(port, tokenOf(pm))
    const got = await drainMessages(ws)
    // 집합이 «각 방의 커서 초과» 와 정확히 같다 — 한 건도 더도 덜도 아니다
    expect(got.map(m => m.id)).toEqual([b1, b2, a3])
    expect(got.map(m => m.room_id)).toEqual([r2, r2, r1])
    expect(got.every(m => m.type === 'message' && m.delivery === 'to')).toBe(true)
    // 재전송 뒤 두 행의 커서가 각각 그 방에서 마지막으로 보낸 id 다
    expect(cursorOf(r1, pm)).toBe(a3)
    expect(cursorOf(r2, pm)).toBe(b2)
    expect(cursorOf(r2, qa)).toBe(0)   // 접속하지 않은 봇의 커서는 그대로다
    ws.close()
    await app.close()
  })

  // AC-GW-004 (이관) — 재접속해도 같은 메시지가 두 번 오지 않는다
  it('never redelivers a message after reconnect', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const first = await wsConnect(port, tokenOf(pm))

    const msgId = ins(room, '봐줘'); target(msgId, pm)
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    gateway.deliver(room, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    const got = await nextMessage(first.ws)
    expect(got.id).toBe(msgId)
    expect(got.room_id).toBe(room)
    expect(cursorOf(room, pm)).toBe(msgId)

    first.ws.close()
    await closedPromise(first.ws)

    // 재접속: 커서가 이미 그 번호이므로 재전송할 것이 없다.
    const again = await wsConnect(port, tokenOf(pm))
    await expectNoMessage(again.ws, 600)
    expect(cursorOf(room, pm)).toBe(msgId)
    again.ws.close()
    await app.close()
  })

  // AC-BOTMODEL-001 ① — 봇 하나가 토큰 하나로 두 방의 to 알림을 각각 그 방의 room_id 로 받는다 (REQ-014·016)
  it('AC-001 ①: one connection with one token receives the to-message of each room, each carrying its own room_id', async () => {
    const { app, gateway, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))   // 이 시나리오에서 wsConnect 는 정확히 한 번이다

    for (const r of [r1, r2]) {
      const id = ins(r, `@TO(pm) ${r} 에서`); target(id, pm)
      const row = db.prepare('SELECT * FROM messages WHERE id=?').get(id) as any
      gateway.deliver(r, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    }
    const frames = [await nextMessage(ws), await nextMessage(ws)]
    expect(frames.every(f => f.type === 'message')).toBe(true)
    expect(frames.map(f => f.room_id)).toEqual([r1, r2])
    expect(frames.map(f => f.author_type)).toEqual(['user', 'user'])
    expect(cursorOf(r1, pm)).toBe(frames[0].id)
    expect(cursorOf(r2, pm)).toBe(frames[1].id)
    ws.close()
    await app.close()
  })

  // AC-BOTMODEL-002 ② — 맨몸 bot_message{room_id:R2} 가 R2 에만 저장·발행된다 (REQ-013·024)
  it('AC-002 ②: bot_message{room_id} stores one bot row in that room only and publishes to that room only', async () => {
    const { app, published, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    ins(r1, '이미 있는 것'); ins(r2, '이미 있는 것')
    const count = (r: number) => (db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=?').get(r) as { c: number }).c
    const before1 = count(r1), before2 = count(r2)
    const { ws } = await wsConnect(port, tokenOf(pm))

    ws.send(JSON.stringify({ type: 'bot_message', room_id: r2, body: '답장' }))
    await new Promise(r => setTimeout(r, 300))

    expect(count(r2)).toBe(before2 + 1)
    expect(count(r1)).toBe(before1)
    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(r2) as any
    expect(row.body).toBe('답장')
    expect(row.author_bot_id).toBe(pm)
    const events = published.filter(p => p.event === 'message')
    expect(events.filter(p => p.roomId === r2)).toHaveLength(1)
    expect(events.filter(p => p.roomId === r1)).toHaveLength(0)
    expect(events[0].data.author_name).toBe('pm')
    ws.close()
    await app.close()
  })

  // AC-BOTMODEL-004 ㉮ — 참여가 사라진 방의 첨부 경로는 재전송에 실리지 않는다 (REQ-016·018·021, 변이 ㉠ 의 둘째 자리)
  it('AC-004 ㉮: after the room participation is deleted, replay carries nothing from that room — not even a local_path', async () => {
    const { app, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    // R1 의 커서는 그 방의 마지막 메시지 id 로 심어 둔다 — R1 에서는 재전송 대상이 없다
    const a1 = ins(r1, 'R1 끝'); target(a1, pm)
    db.prepare('UPDATE room_bots SET last_delivered_id=? WHERE room_id=? AND bot_id=?').run(a1, r1, pm)
    // 접속이 없는 동안 사람이 R2 에서 첨부를 붙여 @TO(pm) — 정당한 경로이므로 타깃 행이 생긴다
    const b1 = ins(r2, '@TO(pm) 첨부 봐줘'); target(b1, pm)
    const stored = join(dir, 'up', 'secret-r2.txt')
    writeFileSync(stored, 'R2-ONLY-CANARY')
    db.prepare("INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, 'secret-r2.txt', ?, 14, 'text/plain')").run(b1, stored)
    // 그 다음 R2 참여만 지운다 — 실제 DELETE 라우트로
    const ck = await loginOf(app)
    const del = await app.inject({ method: 'DELETE', url: `/api/rooms/${r2}/bots/${pm}`, headers: { cookie: ck } })
    expect(del.statusCode).toBe(200)

    const { ws } = await wsConnect(port, tokenOf(pm))
    const got = await drainMessages(ws)
    expect(got.filter(m => m.room_id === r2)).toEqual([])
    expect(JSON.stringify(got)).not.toContain(stored)
    expect(got).toEqual([])   // R1 은 커서가 끝까지 올라가 있어 아무것도 오지 않는다
    expect(cursorOf(r1, pm)).toBe(a1)   // (R1, pm) 커서는 움직이지 않는다
    // 막는 자리는 타깃 매핑이 아니라 배달이다 — 타깃 행은 그대로 남아 있다
    expect((db.prepare('SELECT COUNT(*) c FROM message_targets WHERE message_id=?').get(b1) as { c: number }).c).toBe(1)
    ws.close()
    await app.close()
  })

  // AC-BOTMODEL-004 ㉯ — 실시간 배달 경로: deliver 직전에 참여를 지우면 그 접속에 아무것도 가지 않는다 (변이 ㉡ 의 자리)
  it('AC-004 ㉯: deliver sends nothing to a bot whose participation in that room was deleted just before', async () => {
    const { app, gateway, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))

    const b1 = ins(r2, '@TO(pm) 첨부 봐줘'); target(b1, pm)
    const stored = join(dir, 'up', 'secret-r2.txt')
    writeFileSync(stored, 'R2-ONLY-CANARY')
    db.prepare("INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, 'secret-r2.txt', ?, 14, 'text/plain')").run(b1, stored)
    const ck = await loginOf(app)
    expect((await app.inject({ method: 'DELETE', url: `/api/rooms/${r2}/bots/${pm}`, headers: { cookie: ck } })).statusCode).toBe(200)

    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(b1) as any
    gateway.deliver(r2, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    await expectNoMessage(ws)
    expect(cursorOf(r1, pm)).toBe(0)
    expect((db.prepare('SELECT COUNT(*) c FROM room_bots WHERE room_id=? AND bot_id=?').get(r2, pm) as { c: number }).c).toBe(0)
    expect((db.prepare('SELECT COUNT(*) c FROM message_targets WHERE message_id=?').get(b1) as { c: number }).c).toBe(1)

    // 대조군: 아직 참여 중인 R1 로는 같은 접속에 배달된다 — «전부 막는» 구현을 배제한다
    const a1 = ins(r1, '@TO(pm) R1'); target(a1, pm)
    const row1 = db.prepare('SELECT * FROM messages WHERE id=?').get(a1) as any
    gateway.deliver(r1, { ...row1, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    const got = await nextMessage(ws)
    expect(got.room_id).toBe(r1)
    expect(got.id).toBe(a1)
    expect(cursorOf(r1, pm)).toBe(a1)
    ws.close()
    await app.close()
  })

  // AC-GW-005 (이관) — deliver 는 타깃에게만 가고 커서도 그 (방, 봇) 행만 움직인다 (REQ-016·017)
  it('deliver reaches only targeted participating bots and moves only their room cursor', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa'), ops = seedBot('ops')
    joinRoom(roomA, pm); joinRoom(roomA, qa); joinRoom(roomB, ops); joinRoom(roomB, pm)
    const wsPm = await wsConnect(port, tokenOf(pm))
    const wsQa = await wsConnect(port, tokenOf(qa))
    const wsOps = await wsConnect(port, tokenOf(ops))

    const msgId = ins(roomA, '봐줘')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    gateway.deliver(roomA, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])

    const got = await nextMessage(wsPm.ws)
    expect(got.author_name).toBe('alice')
    expect(got.id).toBe(msgId)
    expect(got.room_id).toBe(roomA)
    // 부정 관측 둘: 같은 방 비타깃도, 다른 방 봇도 받지 않는다.
    await expectNoMessage(wsQa.ws)
    await expectNoMessage(wsOps.ws)
    // 커서도 그 (방, 봇) 행만 움직인다 — 같은 봇의 다른 방 커서는 그대로다 (REQ-017)
    expect(cursorOf(roomA, pm)).toBe(msgId)
    expect(cursorOf(roomB, pm)).toBe(0)
    expect(cursorOf(roomA, qa)).toBe(0)
    expect(cursorOf(roomB, ops)).toBe(0)

    for (const w of [wsPm, wsQa, wsOps]) w.ws.close()
    await app.close()
  })

  // AC-GW-006 (이관) — delivery 는 봇마다 다르고, files 는 첨부와 일치한다
  it('deliver carries per-bot delivery and the message attachments', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    joinRoom(room, pm); joinRoom(room, qa)
    const wsPm = await wsConnect(port, tokenOf(pm))
    const wsQa = await wsConnect(port, tokenOf(qa))

    const msgId = ins(room, '봐줘')
    const stored = join(dir, 'up', 'stored-report.md')
    writeFileSync(stored, '내용')
    db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)').run(msgId, '보고서.md', stored, 'text/markdown')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any

    gateway.deliver(room, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }, { botId: qa, delivery: 'cc' }])
    const toMsg = await nextMessage(wsPm.ws)
    const ccMsg = await nextMessage(wsQa.ws)
    expect(toMsg.delivery).toBe('to')
    expect(ccMsg.delivery).toBe('cc')
    expect(toMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])
    expect(ccMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])
    expect(Object.keys(toMsg).sort()).toEqual(['author_name', 'author_type', 'body', 'delivery', 'files', 'id', 'room_id', 'type'])

    wsPm.ws.close(); wsQa.ws.close()
    await app.close()
  })

  // AC-GW-007 (이관) — bot_message 저장·복사·발행
  it('stores bot_message, copies files into uploadsDir and publishes to the hub', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const src = join(dir, 'report.md')
    writeFileSync(src, '# 결과\n완료')

    ws.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '정리 완료', files: [{ local_path: src, name: '보고서.md' }] }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    expect(row.body).toBe('정리 완료')
    expect(row.author_bot_id).toBe(pm)
    const att = db.prepare('SELECT * FROM attachments WHERE message_id=?').get(row.id) as any
    expect(att).toBeDefined()
    expect(att.filename).toBe('보고서.md')
    const srcBytes = readFileSync(src).length
    expect(srcBytes).toBe(15)
    expect(att.size).toBe(srcBytes)
    expect(att.mime).toBe('application/octet-stream')
    expect(att.stored_path).not.toBe(src)
    expect(att.stored_path.startsWith(join(dir, 'up'))).toBe(true)
    expect(readFileSync(att.stored_path, 'utf8')).toContain('완료')
    expect(existsSync(src)).toBe(true)
    const msgEvents = published.filter(p => p.event === 'message')
    expect(msgEvents).toHaveLength(1)
    expect(msgEvents[0].roomId).toBe(room)
    expect(msgEvents[0].data.author_name).toBe('pm')
    expect(msgEvents[0].data.attachments).toHaveLength(1)

    ws.close()
    await app.close()
  })

  // AC-GW-008 (이관) · AC-BOTMODEL-019 «없는 파일 건너뛰기» — 없는 파일 하나만 건너뛴다
  it('bot_message skips only the missing attachment', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const good = join(dir, '있는파일.txt')
    writeFileSync(good, 'ok')

    ws.send(JSON.stringify({
      type: 'bot_message', room_id: room, body: '결과',
      files: [{ local_path: join(dir, '없는파일'), name: 'x' }, { local_path: good, name: '있는파일.txt' }],
    }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    expect(row.body).toBe('결과')
    const atts = db.prepare('SELECT filename FROM attachments WHERE message_id=?').all(row.id) as { filename: string }[]
    expect(atts.map(a => a.filename)).toEqual(['있는파일.txt'])

    ws.close()
    await app.close()
  })

  // AC-BOTMODEL-019 — 첨부 허용 뿌리 검사와 없는 파일 건너뛰기, 한 프레임에 다섯 (REQ-021, 변이 ㉢·㉣ 의 자리).
  // 변이 ㉢(realpathSync → resolve)은 링크 건이 통과해 붉어지고, 변이 ㉣(«+ sep» 제거)은 형제 접두 건이 통과해 붉어진다.
  it('AC-019: of [outside, inside, symlink-out, sibling-prefix, missing] only the inside file is attached and the message proceeds', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))

    const outsideDir = mkdtempSync(join(tmpdir(), 'md-outside-'))
    const outside = join(outsideDir, 'secret.txt')
    writeFileSync(outside, 'OUTSIDE-CANARY-1a2b')
    const inside = join(dir, '뿌리안.txt')
    writeFileSync(inside, 'ok')
    const linkTarget = join(outsideDir, 'linked-secret.txt')
    writeFileSync(linkTarget, 'LINK-CANARY-3c4d')
    const link = join(dir, '겉보기정상.txt')
    symlinkSync(linkTarget, link)
    // dir 의 형제이면서 문자열로는 dir 을 접두사로 갖는 디렉터리 — sep 없이 비교하면 여기가 뚫린다
    const sibling = `${dir}evil`
    mkdirSync(sibling, { recursive: true })
    const siblingFile = join(sibling, 'secret.txt')
    writeFileSync(siblingFile, 'SIBLING-CANARY-5e6f')
    const missing = join(dir, '없는파일.txt')

    try {
      ws.send(JSON.stringify({
        type: 'bot_message', room_id: room, body: '다섯 시도',
        files: [
          { local_path: outside, name: 'outside.txt' },
          { local_path: inside, name: '뿌리안.txt' },
          { local_path: link, name: '겉보기정상.txt' },
          { local_path: siblingFile, name: 'sibling.txt' },
          { local_path: missing, name: '없는파일.txt' },
        ],
      }))
      await new Promise(r => setTimeout(r, 300))

      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      expect(row.body).toBe('다섯 시도')   // 메시지 자체와 나머지 처리는 계속된다
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['뿌리안.txt'])
      for (const a of atts) {
        const copied = readFileSync(a.stored_path, 'utf8')
        expect(copied).not.toContain('OUTSIDE-CANARY-1a2b')
        expect(copied).not.toContain('LINK-CANARY-3c4d')
        expect(copied).not.toContain('SIBLING-CANARY-5e6f')
      }
    } finally {
      rmSync(outsideDir, { recursive: true, force: true })
      rmSync(sibling, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-021 (이관) — 허용 뿌리 밖의 local_path 는 복사하지 않는다 (sync-audit F-01)
  it('bot_message refuses a local_path outside botFilesDir while still attaching one inside', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const outsideDir = mkdtempSync(join(tmpdir(), 'md-outside-'))
    const canary = join(outsideDir, 'secret.txt')
    writeFileSync(canary, 'TOP-SECRET-CANARY-9f3a')
    const good = join(dir, '정상.txt')
    writeFileSync(good, 'ok')
    try {
      ws.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '유출 시도', files: [{ local_path: canary, name: 'harmless.txt' }, { local_path: good, name: '정상.txt' }] }))
      await new Promise(r => setTimeout(r, 300))
      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      expect(row.body).toBe('유출 시도')
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['정상.txt'])
      for (const a of atts) expect(readFileSync(a.stored_path, 'utf8')).not.toContain('TOP-SECRET-CANARY-9f3a')
      expect(readFileSync(canary, 'utf8')).toBe('TOP-SECRET-CANARY-9f3a')
    } finally {
      rmSync(outsideDir, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-023 (이관) — 허용 뿌리 안의 심볼릭 링크로도 밖을 끌어오지 못한다 (변이 ㉢ realpathSync → resolve 가 여기서 붉어진다)
  it('bot_message refuses a symlink inside botFilesDir that points outside it', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const outsideDir = mkdtempSync(join(tmpdir(), 'md-outside-'))
    const canary = join(outsideDir, 'secret.txt')
    writeFileSync(canary, 'TOP-SECRET-LINK-7b2c')
    const link = join(dir, '겉보기정상.txt')
    symlinkSync(canary, link)
    const good = join(dir, '진짜.txt')
    writeFileSync(good, 'ok')
    try {
      ws.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '링크 시도', files: [{ local_path: link, name: '겉보기정상.txt' }, { local_path: good, name: '진짜.txt' }] }))
      await new Promise(r => setTimeout(r, 300))
      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      expect(row.body).toBe('링크 시도')
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['진짜.txt'])
      for (const a of atts) expect(readFileSync(a.stored_path, 'utf8')).not.toContain('TOP-SECRET-LINK-7b2c')
    } finally {
      rmSync(outsideDir, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-024 (이관) · AC-BOTMODEL-020 — 허브 발행 프레임에 stored_path 가 실리지 않는다 (REQ-021)
  it('AC-020: never publishes stored_path on the hub frame for a bot attachment', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const src = join(dir, '첨부.txt')
    writeFileSync(src, '내용')

    ws.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '첨부 있음', files: [{ local_path: src, name: '첨부.txt' }] }))
    await new Promise(r => setTimeout(r, 300))

    const frame = published.filter(p => p.event === 'message').at(-1)!
    expect(frame.data.attachments).toHaveLength(1)
    expect(frame.data.attachments[0].filename).toBe('첨부.txt')
    expect(typeof frame.data.attachments[0].id).toBe('number')
    expect(frame.data.attachments[0]).not.toHaveProperty('stored_path')
    const att = db.prepare('SELECT stored_path FROM attachments').get() as { stored_path: string }
    expect(JSON.stringify(frame.data)).not.toContain(att.stored_path)

    ws.close()
    await app.close()
  })

  // AC-GW-025 (이관) — botFilesDir 미설정이면 봇 첨부를 전부 거부한다
  it('bot_message attaches nothing at all when botFilesDir is unset', async () => {
    const { app, port } = await build({ botFiles: 'off' })
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const good = join(dir, '켜져있으면통과.txt')
    writeFileSync(good, 'ok')
    ws.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '첨부 시도', files: [{ local_path: good, name: '켜져있으면통과.txt' }] }))
    await new Promise(r => setTimeout(r, 300))
    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    expect(row.body).toBe('첨부 시도')
    expect(db.prepare('SELECT COUNT(*) c FROM attachments WHERE message_id=?').get(row.id)).toEqual({ c: 0 })
    ws.close()
    await app.close()
  })

  // AC-GW-026 (이관) — 허용 뿌리와 이름이 겹치는 형제 디렉터리는 통과하지 못한다 (변이 ㉣ «+ sep» 제거가 여기서 붉어진다)
  it('bot_message refuses a sibling directory whose path merely prefixes botFilesDir', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const sibling = `${dir}evil`
    mkdirSync(sibling, { recursive: true })
    const outside = join(sibling, 'secret.txt')
    writeFileSync(outside, 'SIBLING-CANARY-4d1e')
    const good = join(dir, '진짜뿌리안.txt')
    writeFileSync(good, 'ok')
    try {
      ws.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '형제 시도', files: [{ local_path: outside, name: 'secret.txt' }, { local_path: good, name: '진짜뿌리안.txt' }] }))
      await new Promise(r => setTimeout(r, 300))
      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['진짜뿌리안.txt'])
      for (const a of atts) expect(readFileSync(a.stored_path, 'utf8')).not.toContain('SIBLING-CANARY-4d1e')
    } finally {
      rmSync(sibling, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-BOTMODEL-015 — room_id 없는 채널→서버 프레임은 조용히 버려진다. 소켓은 닫히지 않는다 (REQ-013)
  it('AC-015: frames without room_id are dropped silently — no row, no response, no system message, socket stays open', async () => {
    const { app, gateway, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const seen: any[] = []
    gateway.setPermissionHandler((info, params) => seen.push({ info, params }))
    const { ws } = await wsConnect(port, tokenOf(pm))

    ws.send(JSON.stringify({ type: 'bot_message', body: '방 없는 글' }))
    ws.send(JSON.stringify({ type: 'history_request', rid: 'norm', limit: 10 }))
    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    ws.send(JSON.stringify({ type: 'status', state: 'working' }))
    await expectNoMessage(ws, 500)   // history_response 가 오지 않는다

    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)   // 봇 글도 system 메시지도 없다
    expect(seen).toEqual([])                                                                    // 핸들러에 닿지 않는다
    expect(published.filter(p => p.event === 'bot_status')).toEqual([])
    expect(ws.readyState).toBe(WebSocket.OPEN)
    expect(gateway.isOnline(pm)).toBe(true)

    // 대조군: 같은 소켓에서 room_id 를 실은 프레임은 여전히 처리된다 — 버리기이지 거절이 아니다
    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'ok', limit: 10 }))
    const res = await nextMessage(ws)
    expect(res.type).toBe('history_response')
    expect(res.rid).toBe('ok')
    expect(res.room_id).toBe(room)

    ws.close()
    await app.close()
  })

  // AC-BOTMODEL-017 — status{room_id, state} 가 그 방의 칩을 켠다 (REQ-020). 두 값만 발행한다 (REQ-GW-012 이관)
  it('AC-017: status{room_id} publishes bot_status to that room only, for working and idle only', async () => {
    const { app, published, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))

    ws.send(JSON.stringify({ type: 'status', room_id: r2, state: 'working' }))
    ws.send(JSON.stringify({ type: 'status', room_id: r2, state: 'idle' }))
    ws.send(JSON.stringify({ type: 'status', room_id: r2, state: 'sleeping' }))   // 알 수 없는 값은 발행하지 않는다
    await new Promise(r => setTimeout(r, 200))
    const events = published.filter(p => p.event === 'bot_status')
    expect(events.map(e => [e.roomId, e.data.state])).toEqual([[r2, 'working'], [r2, 'idle']])
    expect(events.every(e => e.data.bot_id === pm)).toBe(true)
    expect(events.filter(e => e.roomId === r1)).toHaveLength(0)

    ws.close()
    await app.close()
  })

  // AC-BOTMODEL-018 — isOnline(botId) 는 접속의 존재로 판정한다 — 방과 무관하다 (REQ-019)
  // 2026-09-08 봇 삭제 — dropBot(botId) 은 그 봇의 소켓 전부를 닫고 다른 봇은 두며, 지워진 토큰의 재접속은 무응답 close 다
  it('dropBot closes every connection of that bot only; a hello with the deleted token is refused', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const a = seedBot('a'), b = seedBot('b')
    joinRoom(room, a); joinRoom(room, b)
    const a1 = (await wsConnect(port, tokenOf(a))).ws
    const a2 = (await wsConnect(port, tokenOf(a))).ws
    const b1 = (await wsConnect(port, tokenOf(b))).ws
    const tokenA = tokenOf(a)
    db.prepare('DELETE FROM room_bots WHERE bot_id=?').run(a)   // 외래키가 켜져 있어 참여 행부터
    db.prepare('DELETE FROM bots WHERE id=?').run(a)
    // close 리스너는 dropBot 전에 붙인다 — 하나를 기다리는 사이 다른 소켓이 먼저 닫히면 늦게 붙인 리스너는 영원히 기다린다
    const closedA1 = closedPromise(a1), closedA2 = closedPromise(a2)
    gateway.dropBot(a)
    await closedA1; await closedA2
    expect(a1.readyState).toBe(WebSocket.CLOSED)
    expect(a2.readyState).toBe(WebSocket.CLOSED)
    expect(b1.readyState).toBe(WebSocket.OPEN)
    expect(gateway.isOnline(a)).toBe(false)
    expect(gateway.isOnline(b)).toBe(true)
    const again = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    let frames = 0
    const closedAgain = closedPromise(again)
    again.on('open', () => again.send(JSON.stringify({ type: 'hello', token: tokenA })))
    again.on('message', () => { frames++ })
    await closedAgain
    expect(frames).toBe(0)
    b1.close()
    await app.close()
  })

  it('AC-018: isOnline is per bot — both rooms report online with one connection, and offline right after it closes', async () => {
    const { app, gateway, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm'), qa = seedBot('qa')
    joinRoom(r1, pm); joinRoom(r2, pm); joinRoom(r1, qa)
    const ck = await loginOf(app)
    const listOf = async (r: number) => (await app.inject({ method: 'GET', url: `/api/rooms/${r}/bots`, headers: { cookie: ck } })).json() as { bot_id: number; bot_name: string; online: boolean }[]

    expect((await listOf(r1)).find(b => b.bot_id === pm)!.online).toBe(false)
    const { ws } = await wsConnect(port, tokenOf(pm))
    expect(gateway.isOnline(pm)).toBe(true)
    expect(gateway.isOnline(qa)).toBe(false)   // 같은 방 다른 봇은 온라인이 아니다 — `return true` 는 여기서 깨진다
    for (const r of [r1, r2]) {
      const row = (await listOf(r)).find(b => b.bot_id === pm)!
      expect(row.online).toBe(true)
      expect(typeof row.online).toBe('boolean')
    }
    expect((await listOf(r1)).find(b => b.bot_id === qa)!.online).toBe(false)

    ws.close()
    await closedPromise(ws)
    await new Promise(r => setTimeout(r, 100))
    expect(gateway.isOnline(pm)).toBe(false)
    for (const r of [r1, r2]) expect((await listOf(r)).find(b => b.bot_id === pm)!.online).toBe(false)
    await app.close()
  })

  // AC-GW-011 (이관) — 이력은 번호 오름차순이고 rid 와 room_id 를 되돌린다
  it('history_request returns the room messages in id order and echoes rid and room_id', async () => {
    const { app, port } = await build()
    const room = seedRoom('A'), other = seedRoom('B')
    const pm = seedBot('pm')
    joinRoom(room, pm); joinRoom(other, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    for (const b of ['하나', '둘', '셋']) ins(room, b)
    ins(other, '남의 방')

    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'r1', limit: 10 }))
    const res1 = await nextMessage(ws)
    expect(res1.type).toBe('history_response')
    expect(res1.rid).toBe('r1')
    expect(res1.room_id).toBe(room)
    expect(res1.messages.map((m: any) => m.body)).toEqual(['하나', '둘', '셋'])
    expect(res1.messages.map((m: any) => m.body)).not.toContain('남의 방')
    // 같은 접속에서 방을 바꿔 물으면 그 방의 이력이 온다 — 방은 접속이 아니라 프레임이 정한다
    ws.send(JSON.stringify({ type: 'history_request', room_id: other, rid: 'r2', limit: 10 }))
    const res2 = await nextMessage(ws)
    expect(res2.rid).toBe('r2')
    expect(res2.room_id).toBe(other)
    expect(res2.messages.map((m: any) => m.body)).toEqual(['남의 방'])
    ws.close()
    await app.close()
  })

  // AC-GW-012 (이관) — since_id 는 커서 이하를 실제로 걸러 낸다
  it('history_request with since_id returns only later messages', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const ids = ['하나', '둘', '셋'].map(b => ins(room, b))
    const cursor = ids[1]

    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'ctl', limit: 10 }))
    const control = await nextMessage(ws)
    expect(control.messages.map((m: any) => m.id)).toEqual(ids)

    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'r2', since_id: cursor, limit: 10 }))
    const res = await nextMessage(ws)
    expect(res.rid).toBe('r2')
    expect(res.messages.every((m: any) => m.id > cursor)).toBe(true)
    expect(res.messages.map((m: any) => m.body)).toEqual(['셋'])
    const below = db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=? AND id<=?').get(room, cursor) as { c: number }
    expect(control.messages.length - res.messages.length).toBe(below.c)
    ws.close()
    await app.close()
  })

  // AC-GW-013 (이관) — limit 은 필터보다 먼저, 선택 필터 셋은 각각 걸러 낸다
  it('history_request applies limit before since_id, speaker, since and until', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const alice = db.prepare("INSERT INTO users (username) VALUES ('alice')").run().lastInsertRowid as number
    const { ws } = await wsConnect(port, tokenOf(pm))
    const ids: number[] = []
    for (let i = 1; i <= 5; i++) {
      ids.push(db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body, created_at) VALUES (?, 'user', ?, ?, ?)")
        .run(room, alice, `m${i}`, `2026-08-2${i}T00:00:00Z`).lastInsertRowid as number)
    }
    db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body, created_at) VALUES (?, 'bot', ?, '봇 발언', '2026-08-26T00:00:00Z')").run(room, pm)

    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'a', since_id: ids[0], limit: 2 }))
    expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['m5', '봇 발언'])
    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'b', speaker: 'pm', limit: 100 }))
    expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['봇 발언'])
    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'c', since: '2026-08-24T00:00:00Z', until: '2026-08-26T00:00:00Z', limit: 100 }))
    expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['m4', 'm5'])
    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'd', limit: 100 }))
    expect((await nextMessage(ws)).messages).toHaveLength(6)
    ws.close()
    await app.close()
  })

  // AC-GW-014 (이관) — 이력의 네 필드와 작성자 이름 해석
  it('history_response carries id, author_name, body and created_at', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const alice = db.prepare("INSERT INTO users (username) VALUES ('alice')").run().lastInsertRowid as number
    db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body) VALUES (?, 'user', ?, '사람 말')").run(room, alice)
    db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, '봇 말')").run(room, pm)
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', '시스템 말')").run(room)
    const { ws } = await wsConnect(port, tokenOf(pm))
    ws.send(JSON.stringify({ type: 'history_request', room_id: room, rid: 'r', limit: 10 }))
    const res = await nextMessage(ws)
    for (const m of res.messages) {
      expect(typeof m.id).toBe('number')
      expect(typeof m.author_name).toBe('string')
      expect(typeof m.body).toBe('string')
      expect(typeof m.created_at).toBe('string')
    }
    expect(res.messages.map((m: any) => m.author_name)).toEqual(['alice', 'pm', '시스템'])
    ws.close()
    await app.close()
  })

  // AC-BOTMODEL-016 — 서버→채널 프레임은 room_id 를 항상 싣고 이력은 요청한 접속에만 간다 (REQ-014·021)
  it('AC-016: history_response goes only to the requesting connection of the two sharing one token, with room_id', async () => {
    const { app, gateway, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm'), qa = seedBot('qa')
    joinRoom(r1, pm); joinRoom(r2, pm); joinRoom(r1, qa)
    const c1 = await wsConnect(port, tokenOf(pm))
    const c2 = await wsConnect(port, tokenOf(pm))   // 같은 토큰, 접속 둘 — connId 가 다르다
    const wsQa = await wsConnect(port, tokenOf(qa))
    ins(r1, 'R1 하나'); ins(r2, 'R2 하나')

    c1.ws.send(JSON.stringify({ type: 'history_request', room_id: r1, rid: 'x', limit: 10 }))
    const res = await nextMessage(c1.ws)
    expect(res).toMatchObject({ type: 'history_response', room_id: r1, rid: 'x' })
    expect(res.messages.map((m: any) => m.body)).toEqual(['R1 하나'])
    await expectNoMessage(c2.ws)   // 같은 봇의 다른 접속에는 가지 않는다
    await expectNoMessage(wsQa.ws)   // 옆 봇에게도 새지 않는다

    // 같은 배치에서 deliver 로 나가는 message 프레임도 room_id 를 싣는다 — 같은 봇의 두 접속 모두에게
    const id = ins(r1, '@TO(pm)'); target(id, pm)
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(id) as any
    gateway.deliver(r1, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    expect((await nextMessage(c1.ws)).room_id).toBe(r1)
    expect((await nextMessage(c2.ws)).room_id).toBe(r1)

    c1.ws.close(); c2.ws.close(); wsQa.ws.close()
    await app.close()
  })

  // closeRoom — v2 에서 접속은 봇 단위라 방을 보관해도 소켓은 닫히지 않는다. 보관된 방은 다음 welcome 의 rooms 에서 빠진다.
  it('closeRoom leaves the bot connection open; the archived room disappears from the next welcome', async () => {
    const { app, gateway, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    const first = await wsConnect(port, tokenOf(pm))
    ins(r2, 'R2 메시지')

    db.prepare("UPDATE rooms SET status='archived' WHERE id=?").run(r1)
    gateway.closeRoom(r1)
    await new Promise(r => setTimeout(r, 100))
    expect(first.ws.readyState).toBe(WebSocket.OPEN)
    expect(gateway.isOnline(pm)).toBe(true)
    first.ws.send(JSON.stringify({ type: 'history_request', room_id: r2, rid: 'alive', limit: 10 }))
    const res = await nextMessage(first.ws)
    expect(res.messages.map((m: any) => m.body)).toEqual(['R2 메시지'])
    first.ws.close()
    await closedPromise(first.ws)

    const again = await wsConnect(port, tokenOf(pm))
    expect(again.welcome.rooms).toEqual([{ room_id: r2, room_name: 'R2' }])
    again.ws.close()
    await app.close()
  })

  // t43 (ROADMAP OD-8) — 보관된 방은 읽기 전용이다. 참여 행이 남아 있어도 봇 글과 상태는 버리고(행·발행·응답 없이, 소켓 유지),
  // 이력 조회는 그대로 답한다. 사람 경로의 409 와 대칭이되 봇 쪽은 참여 검사와 같은 «조용히 버림» 이다.
  it('t43: bot_message and status to an archived room are dropped silently, while history_request still answers', async () => {
    const { app, published, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    ins(r1, '보관 전 글')
    const count = (r: number) => (db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=?').get(r) as { c: number }).c
    const { ws } = await wsConnect(port, tokenOf(pm))
    db.prepare("UPDATE rooms SET status='archived' WHERE id=?").run(r1)
    const before1 = count(r1), before2 = count(r2)

    ws.send(JSON.stringify({ type: 'bot_message', room_id: r1, body: '보관 뒤 봇 글' }))
    ws.send(JSON.stringify({ type: 'status', room_id: r1, state: 'working' }))
    ws.send(JSON.stringify({ type: 'bot_message', room_id: r2, body: '활성 방 봇 글' }))
    await new Promise(r => setTimeout(r, 300))

    expect(count(r1)).toBe(before1)
    expect(count(r2)).toBe(before2 + 1)
    expect(published.filter(p => p.roomId === r1)).toHaveLength(0)
    expect(ws.readyState).toBe(WebSocket.OPEN)

    ws.send(JSON.stringify({ type: 'history_request', room_id: r1, rid: 'archived', limit: 10 }))
    const res = await nextMessage(ws)
    expect(res.type).toBe('history_response')
    expect(res.rid).toBe('archived')
    expect(res.messages.map((m: any) => m.body)).toEqual(['보관 전 글'])
    ws.close()
    await app.close()
  })

  // AC-GW-017 (이관) · REQ-BOTMODEL-022 — 권한 요청의 방은 접속이 아니라 프레임에서 온다
  it('relays permission_request to the handler with the room from the frame, and stops after the handler is cleared', async () => {
    const { app, gateway, port } = await build()
    const r1 = seedRoom('R1'), r2 = seedRoom('R2')
    const pm = seedBot('pm')
    joinRoom(r1, pm); joinRoom(r2, pm)
    const seen: { info: any; params: any }[] = []
    gateway.setPermissionHandler((info, params) => seen.push({ info, params }))
    const { ws } = await wsConnect(port, tokenOf(pm))

    ws.send(JSON.stringify({ type: 'permission_request', room_id: r2, request_id: 'p1', tool_name: 'Bash', description: '설치', input_preview: 'npm i' }))
    await new Promise(r => setTimeout(r, 200))
    expect(seen).toHaveLength(1)
    expect(seen[0].info).toEqual({ roomId: r2, botId: pm, connId: expect.any(String) })
    expect(seen[0].params.request_id).toBe('p1')
    expect(seen[0].params.tool_name).toBe('Bash')

    gateway.setPermissionHandler(null)
    ws.send(JSON.stringify({ type: 'permission_request', room_id: r2, request_id: 'p3' }))
    await new Promise(r => setTimeout(r, 200))
    expect(seen).toHaveLength(1)
    ws.close()
    await app.close()
  })

  // SPEC-PERMROUTE-001 (이관) — 판정은 «요청한 접속 하나» 에게만 되돌아온다 (AC-PERMROUTE-003a + 003b)
  it('routes the verdict to the requesting connection only', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const a = await wsConnect(port, tokenOf(pm))
    const b = await wsConnect(port, tokenOf(pm))
    gateway.setPermissionHandler((info, params) => {
      gateway.sendToOrigin(info.connId as string, { type: 'permission_verdict', request_id: params.request_id, behavior: 'allow' })
    })
    b.ws.send(JSON.stringify({ type: 'permission_request', room_id: room, request_id: 'prr1a', tool_name: 'Bash', description: '설치', input_preview: 'npm i' }))
    const verdict = await nextMessage(b.ws)
    expect(verdict).toEqual({ type: 'permission_verdict', request_id: 'prr1a', behavior: 'allow' })
    await expectNoMessage(a.ws)
    a.ws.close(); b.ws.close()
    await app.close()
  })

  // AC-PERMROUTE-001·002 (이관) — 접속마다 하나, 사는 동안 하나의 connId; 요청 신원이 핸들러까지 온다
  it('issues one stable connId per connection, distinct across connections, and hands it to the handler', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const a = await wsConnect(port, tokenOf(pm))
    const b = await wsConnect(port, tokenOf(pm))
    const infos: any[] = []
    gateway.setPermissionHandler(info => infos.push(info))
    a.ws.send(JSON.stringify({ type: 'permission_request', room_id: room, request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    a.ws.send(JSON.stringify({ type: 'permission_request', room_id: room, request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    b.ws.send(JSON.stringify({ type: 'permission_request', room_id: room, request_id: 'kmnop', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    await new Promise(r => setTimeout(r, 300))
    expect(infos).toHaveLength(3)
    expect(infos[0].connId).toBe(infos[1].connId)
    expect(infos[2].connId).not.toBe(infos[0].connId)
    expect(typeof infos[0].connId).toBe('string')
    expect((infos[0].connId as string).length).toBeGreaterThan(0)
    expect(infos[0].roomId).toBe(room)
    expect(infos[0].botId).toBe(pm)
    a.ws.close(); b.ws.close()
    await app.close()
  })

  // AC-PERMROUTE-004 (이관) — 살아 있지 않은 신원으로는 아무 데도 가지 않는다
  it('returns false and delivers nowhere for a connId no connection owns', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const a = await wsConnect(port, tokenOf(pm))
    const b = await wsConnect(port, tokenOf(pm))
    expect(gateway.sendToOrigin('zzzzz-dead-connid', { type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })).toBe(false)
    await expectNoMessage(a.ws)
    await expectNoMessage(b.ws)
    a.ws.close(); b.ws.close()
    await app.close()
  })

  // AC-GW-018 (이관) — 조립: buildServer 배선, 등록 토큰으로 접속, 참여 목록의 online, 보관 훅
  it('buildServer wires the gateway; a registered token connects, participation lists go online, archive calls closeRoom', async () => {
    process.env.MINIDISCORD_DATA_DIR = join(dir, 'srv')
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    await app.listen({ port: 0 })
    const port = (app.server.address() as { port: number }).port

    // Gateway 계약: 다섯 메서드가 전부 함수이고 sendToBot 은 없다 (REQ-BOTMODEL-015 삭제 목록)
    const gw = (app as any).gateway
    for (const m of ['deliver', 'closeRoom', 'isOnline', 'sendToOrigin', 'setPermissionHandler']) expect(typeof gw[m]).toBe('function')
    expect(gw.sendToBot).toBeUndefined()

    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice' } })
    const raw = login.headers['set-cookie'] ?? ''
    const ck = (Array.isArray(raw) ? raw[0] : raw).split(';')[0]
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name: 'A' } })).json()
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: ck }, payload: { name: 'pm' } })).json()
    expect(typeof bot.token).toBe('string')
    expect((await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/bots`, headers: { cookie: ck }, payload: { bot_id: bot.id } })).statusCode).toBe(201)

    const before = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/bots`, headers: { cookie: ck } })).json()
    expect(before[0].online).toBe(false)

    // 등록 응답의 평문 토큰 하나로 접속한다
    const { ws, welcome } = await wsConnect(port, bot.token)
    expect(welcome.rooms).toEqual([{ room_id: room.id, room_name: 'A' }])
    const during = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/bots`, headers: { cookie: ck } })).json()
    expect(during[0].online).toBe(true)
    expect(typeof during[0].online).toBe('boolean')

    // 보관 훅: HTTP 로 방을 보관하면 closeRoom 이 불리고, 소켓은 봇 단위라 남는다. 다음 welcome 에서 그 방이 빠진다
    const archived = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie: ck } })
    expect(archived.statusCode).toBe(200)
    expect(ws.readyState).toBe(WebSocket.OPEN)
    ws.close()
    await closedPromise(ws)
    const again = await wsConnect(port, bot.token)
    expect(again.welcome.rooms).toEqual([])
    again.ws.close()

    await app.close()
    delete process.env.MINIDISCORD_DATA_DIR
  })
})

// ── v2 B 단계 — 봇 → 봇 멘션 전달 + 역할 규칙 + 결정 ③ (가이드 §3 끝 조건 1~4) ──────
// 봇 글의 @TO/@CC 도 사람 글과 같은 자리(room_bots)에서 타깃으로 풀린다. worker 는 orchestrator 만 부를 수 있고,
// 마지막 사람 글 이후 봇 글이 N(6)개 이상 이어지면 @TO 는 cc 로 내려간다. 거부·강등은 응답 프레임이 없으므로 system 메시지 한 줄이다.
describe('B: bot-to-bot mentions', () => {
  function seedRoleBot(name: string, role: 'orchestrator' | 'worker'): number {
    return db.prepare("INSERT INTO bots (name, description, token, role) VALUES (?, '', ?, ?)")
      .run(name, randomBytes(32).toString('hex'), role).lastInsertRowid as number
  }
  function insBot(roomId: number, botId: number, body: string): number {
    return db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, ?)").run(roomId, botId, body).lastInsertRowid as number
  }
  function systemRows(roomId: number): { body: string }[] {
    return db.prepare("SELECT body FROM messages WHERE room_id=? AND author_type='system' ORDER BY id").all(roomId) as { body: string }[]
  }

  // 끝 조건 1 — orchestrator 의 @TO(worker) → worker 접속에 delivery:'to' 프레임
  it('B-1: an orchestrator @TO(worker) reaches the worker connection as delivery to', async () => {
    const { app, port } = await build()
    const room = seedRoom()
    const lead = seedRoleBot('lead', 'orchestrator'), w1 = seedRoleBot('w1', 'worker')
    joinRoom(room, lead); joinRoom(room, w1)
    const leadWs = (await wsConnect(port, tokenOf(lead))).ws
    const w1Ws = (await wsConnect(port, tokenOf(w1))).ws

    leadWs.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '@TO(w1) 이것 좀 봐 줘' }))
    const frame = await nextMessage(w1Ws)

    expect(frame.type).toBe('message')
    expect(frame.room_id).toBe(room)
    expect(frame.delivery).toBe('to')
    expect(frame.author_name).toBe('lead')
    expect(frame.body).toBe('@TO(w1) 이것 좀 봐 줘')
    expect(systemRows(room)).toHaveLength(0)
    // 재전송 근거가 남는다 — message_targets 한 행, 커서는 배달한 행만
    expect(db.prepare('SELECT COUNT(*) c FROM message_targets WHERE bot_id=?').get(w1)).toEqual({ c: 1 })
    expect(cursorOf(room, w1)).toBe(frame.id)
    leadWs.close(); w1Ws.close()
    await app.close()
  })

  // 끝 조건 2 — worker 의 @TO(다른 worker) → 전달 0, system 1, 원문은 그대로 저장·발행
  // 2026-09-08 운영자 결정 — 역할 규칙(worker 는 orchestrator 만 부른다)을 뺐다. 봇 간 규칙은 각 Claude Code 세션이 정하고,
  // 서버의 되먹임 방어는 B-4 의 연속 봇 글 상한 하나로 남긴다. role 열은 기록으로만 남는다
  it('B-2: a worker @TO(another worker) delivers as to — the role of the sender does not filter targets', async () => {
    const { app, published, port } = await build()
    const room = seedRoom()
    const w1 = seedRoleBot('w1', 'worker'), w2 = seedRoleBot('w2', 'worker')
    joinRoom(room, w1); joinRoom(room, w2)
    const w1Ws = (await wsConnect(port, tokenOf(w1))).ws
    const w2Ws = (await wsConnect(port, tokenOf(w2))).ws

    w1Ws.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '@TO(w2) 네가 해' }))
    const frame = await nextMessage(w2Ws)
    expect(frame.type).toBe('message')
    expect(frame.delivery).toBe('to')
    expect(frame.author_name).toBe('w1')
    expect(frame.body).toBe('@TO(w2) 네가 해')

    expect(systemRows(room)).toHaveLength(0)
    expect(db.prepare('SELECT COUNT(*) c FROM message_targets WHERE bot_id = ?').get(w2)).toEqual({ c: 1 })
    const bot = published.filter(p => p.event === 'message' && p.data.author_type === 'bot')
    expect(bot).toHaveLength(1)
    expect(published.filter(p => p.event === 'message' && p.data.author_type === 'system')).toHaveLength(0)
    w1Ws.close(); w2Ws.close()
    await app.close()
  })

  // 끝 조건 3 — 참여하지 않은 봇 멘션 → 전달 0, system 1 (사람 경로의 400 에 해당하는 봇 경로의 형태)
  it('B-3: mentioning a bot not in the room delivers nothing and leaves one system line', async () => {
    const { app, port } = await build()
    const room = seedRoom(), other = seedRoom('B')
    const lead = seedRoleBot('lead', 'orchestrator'), w1 = seedRoleBot('w1', 'worker')
    joinRoom(room, lead); joinRoom(other, w1)   // w1 은 다른 방에만 참여
    const leadWs = (await wsConnect(port, tokenOf(lead))).ws
    const w1Ws = (await wsConnect(port, tokenOf(w1))).ws

    leadWs.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '@TO(w1) 있니' }))
    await expectNoMessage(w1Ws)

    const sys = systemRows(room)
    expect(sys).toHaveLength(1)
    expect(sys[0].body).toContain('w1')
    expect(sys[0].body).toContain('초대되지 않았습니다')
    expect(db.prepare('SELECT COUNT(*) c FROM message_targets').get()).toEqual({ c: 0 })
    expect(db.prepare("SELECT COUNT(*) c FROM messages WHERE room_id=? AND author_type='bot'").get(room)).toEqual({ c: 1 })
    leadWs.close(); w1Ws.close()
    await app.close()
  })

  // 끝 조건 4 — 결정 ③ N=6: 마지막 사람 글 이후 봇 글이 연속 N개(지금 글 포함) 이상이면 @TO 는 cc 로, system 1.
  // 연속 N-1 개(앞 4 + 지금 1)에서는 to 그대로. system 글은 사람 글이 아니라 연속을 끊지 않는다.
  it('B-4: the Nth consecutive bot message since the last human line demotes @TO to cc with one system line; the (N-1)th stays to', async () => {
    const { app, port } = await build()
    const room = seedRoom()
    const lead = seedRoleBot('lead', 'orchestrator'), w1 = seedRoleBot('w1', 'worker')
    joinRoom(room, lead); joinRoom(room, w1)
    const leadWs = (await wsConnect(port, tokenOf(lead))).ws
    const w1Ws = (await wsConnect(port, tokenOf(w1))).ws

    // 앞에 봇 글 4개 (사람 글 뒤) → 지금 글이 5번째 = N-1 → to
    ins(room, '사람이 시작')
    for (let i = 0; i < 4; i++) insBot(room, w1, `봇 글 ${i}`)
    leadWs.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '@TO(w1) 다섯째' }))
    const fifth = await nextMessage(w1Ws)
    expect(fifth.delivery).toBe('to')
    expect(systemRows(room)).toHaveLength(0)

    // 이제 봇 글이 5개 → 지금 글이 6번째 = N → cc + system 1
    leadWs.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '@TO(w1) 여섯째' }))
    const sixth = await nextMessage(w1Ws)
    expect(sixth.delivery).toBe('cc')
    expect(sixth.body).toBe('@TO(w1) 여섯째')
    expect(systemRows(room)).toHaveLength(1)
    expect(db.prepare('SELECT delivery FROM message_targets WHERE message_id=?').get(sixth.id)).toEqual({ delivery: 'cc' })

    // 사람 글 하나가 연속을 끊는다 → 다시 to
    ins(room, '사람이 끼어듦')
    leadWs.send(JSON.stringify({ type: 'bot_message', room_id: room, body: '@TO(w1) 다시' }))
    expect((await nextMessage(w1Ws)).delivery).toBe('to')
    expect(systemRows(room)).toHaveLength(1)
    leadWs.close(); w1Ws.close()
    await app.close()
  })
})

// ── 결함 D-8 (카드 t32, 이관) — 봇에 넘기는 local_path 는 절대 경로여야 한다 ──────
// [HARD] local_path 를 채우는 자리는 **둘**이다 — deliver(실시간 배달)와 재접속 재전송. 한쪽만 고치면 다른 쪽이 조용히 상대 경로를 넘긴다.
describe('D-8 absolute local_path in bot frames', () => {
  const REL = join('data', 'uploads', 'ffffffff-0000-note.txt')

  it('deliver hands an absolute local_path even when stored_path is relative', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const { ws } = await wsConnect(port, tokenOf(pm))
    const msgId = ins(room, '봐줘')
    db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)').run(msgId, 'note.txt', REL, 'text/plain')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    gateway.deliver(room, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    const msg = await nextMessage(ws)
    expect(msg.files).toHaveLength(1)
    expect(isAbsolute(msg.files[0].local_path)).toBe(true)
    expect(msg.files[0].local_path).toBe(resolve(REL))
    expect(msg.files[0].name).toBe('note.txt')
    ws.close()
    await app.close()
  })

  it('the replay path hands an absolute local_path too', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    joinRoom(room, pm)
    const msgId = ins(room, '밀린 것'); target(msgId, pm)
    db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)').run(msgId, 'note.txt', REL, 'text/plain')
    const { ws } = await wsConnect(port, tokenOf(pm))
    const replay = await nextMessage(ws)
    expect(replay.id).toBe(msgId)
    expect(replay.room_id).toBe(room)
    expect(replay.files).toHaveLength(1)
    expect(isAbsolute(replay.files[0].local_path)).toBe(true)
    expect(replay.files[0].local_path).toBe(resolve(REL))
    ws.close()
    await app.close()
  })
})

// ── v2 C2 — A 의 sync 감사 이월 F1·F3 (B 가 C2 로 보냄, 가이드 §3 «B 종결 기록») ──────
describe('C2: carried-over F1/F3', () => {
  // F1 — 인바운드 프레임의 room_bots 참여 검사. 참여하지 않은 방을 실은 프레임은 room_id 가 없는 프레임과 같이 버린다:
  // 행도 발행도 응답도 없고 소켓은 열린 채다. 네 프레임 전부에 걸린다 (bot_message·status·history_request·permission_request)
  it('F1: a frame naming a room the bot has not joined is dropped — no row, no publish, no reply, socket stays open', async () => {
    const { app, published, gateway, port } = await build()
    const mine = seedRoom('mine'), other = seedRoom('other')
    const pm = seedBot('pm')
    joinRoom(mine, pm)   // other 에는 참여하지 않는다
    const seen: any[] = []
    gateway.setPermissionHandler((info, params) => { seen.push({ info, params }) })
    const { ws } = await wsConnect(port, tokenOf(pm))

    ws.send(JSON.stringify({ type: 'bot_message', room_id: other, body: '남의 방' }))
    ws.send(JSON.stringify({ type: 'status', room_id: other, state: 'working' }))
    ws.send(JSON.stringify({ type: 'history_request', room_id: other, rid: 'h1' }))
    ws.send(JSON.stringify({ type: 'permission_request', room_id: other, request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    await expectNoMessage(ws)

    expect(db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=?').get(other)).toEqual({ c: 0 })
    expect(published.filter(p => p.roomId === other)).toHaveLength(0)
    expect(seen).toHaveLength(0)
    expect(ws.readyState).toBe(WebSocket.OPEN)
    // 대조군 — 같은 소켓이 참여한 방으로는 그대로 통한다
    ws.send(JSON.stringify({ type: 'bot_message', room_id: mine, body: '내 방' }))
    await new Promise(r => setTimeout(r, 200))
    expect(db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=?').get(mine)).toEqual({ c: 1 })
    ws.close()
    await app.close()
  })

  // F3 — 사람 경로 한 프로세스 안에서 끝까지: POST /api/rooms/:id/messages(@TO) → 저장 → deliver → 봇 소켓의 message 프레임
  it('F3: POST /api/rooms/:id/messages with @TO reaches the bot socket in-process with room_id and delivery to', async () => {
    const { app, port } = await build({ messages: true })
    const room = seedRoom()
    const pm = seedBot('pm')
    joinRoom(room, pm)
    const ck = await loginOf(app)
    const { ws } = await wsConnect(port, tokenOf(pm))

    const form = new FormData()
    form.append('body', '@TO(pm) 라우트에서 소켓까지')
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${room}/messages`, headers: { cookie: ck }, payload: form })
    expect(res.statusCode).toBe(200)
    const frame = await nextMessage(ws)

    expect(frame.type).toBe('message')
    expect(frame.room_id).toBe(room)
    expect(frame.id).toBe(res.json().message.id)
    expect(frame.delivery).toBe('to')
    expect(frame.author_name).toBe('alice')
    expect(cursorOf(room, pm)).toBe(frame.id)
    ws.close()
    await app.close()
  })
})
