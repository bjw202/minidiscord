import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes } from '../src/auth.js'
import { sha256Hex } from '../src/routes-bots.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
  mkdirSync(join(dir, 'up'), { recursive: true })
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// hub.publish 를 감싸 발행 내역을 기록한다. SseHub 가 publish 를 속성으로 갖는
// 평범한 객체라는 SPEC-SSE-001 의 계약에 의존한다 (plan.md §D 4번).
async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  const hub = createSseHub()
  const published: { roomId: number; event: string; data: any }[] = []
  const orig = hub.publish.bind(hub)
  hub.publish = (roomId: number, event: string, data: any) => {
    published.push({ roomId, event, data })
    orig(roomId, event, data)
  }
  app.decorate('hub', hub)
  registerAuthRoutes(app, db)
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  app.decorate('gateway', gateway)
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  return { app, hub, published, gateway, port }
}

function seedRoom(name = 'A'): number {
  return db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name).lastInsertRowid as number
}
function seedBot(name = 'pm'): number {
  return db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(name).lastInsertRowid as number
}
function invite(roomId: number, botId: number): string {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(token))
  return token
}
function cursorOf(roomId: number, botId: number): number {
  return (db.prepare('SELECT last_delivered_id v FROM bot_tokens WHERE room_id=? AND bot_id=?')
    .get(roomId, botId) as { v: number }).v
}

// 접속 시점부터 프레임을 큐에 쌓는다. handleHello 는 welcome 과 재전송 message 를
// 같은 동기 블록에서 연속으로 보내고, 루프백에서 두 프레임은 한 TCP 세그먼트로 합쳐져
// 같은 스택에서 연속 emit 되기 쉽다. 테스트가 await 이후에 리스너를 붙이는 구조라면
// 그 사이(마이크로태스크 경계)에 지나간 재전송 프레임을 놓친다 — 구현이 옳아도
// 간헐적으로 실패하는, 진단이 가장 비싼 형태다. 큐가 그 경계를 없앤다.
type Inbox = { queue: any[]; waiters: { resolve: (m: any) => void; timer: NodeJS.Timeout }[] }
const inboxes = new WeakMap<WebSocket, Inbox>()

function wsConnect(port: number, token: string): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    const inbox: Inbox = { queue: [], waiters: [] }
    inboxes.set(ws, inbox)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', data => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'welcome') { resolve({ ws, welcome: msg }); return }
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

// 오지 말아야 할 메시지가 오지 않음을 관측한다. 큐에 이미 쌓여 있어도 실패다 —
// 그렇지 않으면 대기 시작 전에 도착한 프레임을 못 본 채로 통과한다.
function expectNoMessage(ws: WebSocket, ms = 400): Promise<void> {
  const inbox = inboxes.get(ws)
  if (!inbox) return Promise.reject(new Error('wsConnect() 로 연 소켓에만 쓸 수 있다 — 프레임 큐가 없다'))
  if (inbox.queue.length > 0) {
    return Promise.reject(new Error(`unexpected ws message: ${JSON.stringify(inbox.queue[0])}`))
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      resolve()
    }, ms)
    inbox.waiters.push({ resolve: m => reject(new Error(`unexpected ws message: ${JSON.stringify(m)}`)), timer })
  })
}

function closedPromise(ws: WebSocket): Promise<void> {
  return new Promise(r => ws.on('close', () => r()))
}

describe('gateway', () => {
  // AC-GW-001 — 토큰이 방과 봇을 결정하고, 경로는 /bot 뿐이다
  it('welcomes each token as its own (room, bot) and only on /bot', async () => {
    const { app, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const tokenA = invite(roomA, pm)
    const tokenB = invite(roomB, qa)
    const seenAt = () => (db.prepare('SELECT last_seen_at v FROM bot_tokens WHERE room_id=? AND bot_id=?')
      .get(roomA, pm) as { v: string | null }).v
    expect(seenAt()).toBeNull()   // 접속 전

    const a = await wsConnect(port, tokenA)
    const b = await wsConnect(port, tokenB)
    // 분별: 두 토큰이 서로 다른 방·봇으로 판정된다. 상수를 돌려주는 구현은 여기서 깨진다.
    expect([a.welcome.room_id, a.welcome.bot_id, a.welcome.bot_name]).toEqual([roomA, pm, 'pm'])
    expect([b.welcome.room_id, b.welcome.bot_id, b.welcome.bot_name]).toEqual([roomB, qa, 'qa'])
    expect(a.welcome.missed_after_id).toBe(0)
    // 분별: 접속이 last_seen_at 을 채운다. 갱신을 통째로 생략한 구현은 여기서 깨진다 (REQ-GW-001).
    expect(seenAt()).not.toBeNull()

    // 경로 격리: /bot 이 아닌 경로는 업그레이드되지 않는다.
    const wrong = new WebSocket(`ws://127.0.0.1:${port}/nope`)
    const wrongFailed = await new Promise<boolean>(r => {
      wrong.on('error', () => r(true))
      wrong.on('open', () => r(false))
    })
    expect(wrongFailed).toBe(true)

    // onClose 정리: app 이 닫히면 열린 소켓도 닫힌다.
    const bothClosed = Promise.all([closedPromise(a.ws), closedPromise(b.ws)])
    await app.close()
    await bothClosed
  })

  // AC-GW-002 — 다섯 가지 거절 경로
  it('rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), archived = seedRoom('보관됨')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const good = invite(room, pm)
    const revoked = invite(room, qa)
    db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE token_hash=?").run(sha256Hex(revoked))
    const archivedToken = invite(archived, qa)
    db.prepare("UPDATE rooms SET status='archived' WHERE id=?").run(archived)

    // 1~3: 세 가지 잘못된 토큰은 모두 닫힌다.
    for (const bad of ['f'.repeat(64), revoked, archivedToken]) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      let welcomed = false
      ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: bad })))
      ws.on('message', () => { welcomed = true })
      await closedPromise(ws)
      expect(welcomed).toBe(false)
    }
    expect(gateway.isOnline(room, qa)).toBe(false)
    expect(gateway.isOnline(archived, qa)).toBe(false)

    // 4: hello 없이 보낸 프레임은 처리되지 않고 접속이 닫힌다.
    const anon = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    await new Promise<void>(r => anon.on('open', () => r()))
    anon.send(JSON.stringify({ type: 'bot_message', body: '몰래' }))
    await closedPromise(anon)
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)

    // 대조군: 같은 서버에서 정상 토큰은 환영받는다 — "전부 닫는" 구현을 배제한다.
    const ok = await wsConnect(port, good)
    expect(ok.welcome.bot_id).toBe(pm)

    // 5: 인증된 접속이라도 파싱 불가한 프레임을 보내면 조용히 닫힌다.
    // 스위트를 오염시키는 uncaught 예외가 아니라 정상 종료여야 한다 (plan.md §D 8번).
    const okClosed = closedPromise(ok.ws)
    ok.ws.send('{이건 JSON 이 아니다')
    await okClosed
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
    expect(gateway.isOnline(room, pm)).toBe(false)

    await app.close()
  })

  // AC-GW-003 — 재전송은 그 봇 타깃의 커서 이후 것만
  it('replays only missed messages targeted at that bot and advances the cursor', async () => {
    const { app, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    const token = invite(room, pm)
    const ins = (body: string) => db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, body).lastInsertRowid as number
    const target = (id: number, bot: number, d: string) => db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(id, bot, d)

    const oldId = ins('이미 받은 것'); target(oldId, pm, 'to')
    const mine = ins('내 앞으로 온 것'); target(mine, pm, 'to')
    const other = ins('qa 앞으로 온 것'); target(other, qa, 'to')
    const untargeted = ins('아무에게도 아닌 것')
    db.prepare('UPDATE bot_tokens SET last_delivered_id=? WHERE room_id=? AND bot_id=?').run(oldId, room, pm)

    const { ws } = await wsConnect(port, token)
    const replay = await nextMessage(ws)
    expect(replay.type).toBe('message')
    expect(replay.id).toBe(mine)
    expect(replay.delivery).toBe('to')
    // 부정 관측: 다른 봇 타깃도, 무타깃도, 커서 이전 것도 오지 않는다.
    await expectNoMessage(ws)
    expect([other, untargeted, oldId]).not.toContain(replay.id)
    // 커서가 재전송한 마지막 번호로 이동한다.
    expect(cursorOf(room, pm)).toBe(mine)
    ws.close()
    await app.close()
  })

  // AC-GW-004 — 재접속해도 같은 메시지가 두 번 오지 않는다
  it('never redelivers a message after reconnect', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)
    const first = await wsConnect(port, token)

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(room).lastInsertRowid as number
    db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(msgId, pm, 'to')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    gateway.deliver(room, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    const got = await nextMessage(first.ws)
    expect(got.id).toBe(msgId)
    expect(cursorOf(room, pm)).toBe(msgId)

    first.ws.close()
    await closedPromise(first.ws)

    // 재접속: 커서가 이미 그 번호이므로 재전송할 것이 없다.
    const again = await wsConnect(port, token)
    expect(again.welcome.missed_after_id).toBe(msgId)
    await expectNoMessage(again.ws, 600)
    expect(cursorOf(room, pm)).toBe(msgId)
    again.ws.close()
    await app.close()
  })

  // AC-GW-005 — deliver 는 타깃에게만 가고 커서도 타깃만 움직인다
  it('deliver reaches only targeted bots in that room and moves only their cursor', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa'), ops = seedBot('ops')
    const wsPm = await wsConnect(port, invite(roomA, pm))
    const wsQa = await wsConnect(port, invite(roomA, qa))
    const wsOps = await wsConnect(port, invite(roomB, ops))

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(roomA).lastInsertRowid as number
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    gateway.deliver(roomA, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])

    const got = await nextMessage(wsPm.ws)
    expect(got.author_name).toBe('alice')
    expect(got.id).toBe(msgId)
    // 부정 관측 둘: 같은 방 비타깃도, 다른 방도 받지 않는다.
    await expectNoMessage(wsQa.ws)
    await expectNoMessage(wsOps.ws)
    // 커서도 타깃만 움직인다 — 오프라인 재전송(REQ-GW-005)이 성립하는 근거다.
    expect(cursorOf(roomA, pm)).toBe(msgId)
    expect(cursorOf(roomA, qa)).toBe(0)
    expect(cursorOf(roomB, ops)).toBe(0)

    for (const w of [wsPm, wsQa, wsOps]) w.ws.close()
    await app.close()
  })

  // AC-GW-006 — delivery 는 봇마다 다르고, files 는 첨부와 일치한다
  it('deliver carries per-bot delivery and the message attachments', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    const wsPm = await wsConnect(port, invite(room, pm))
    const wsQa = await wsConnect(port, invite(room, qa))

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(room).lastInsertRowid as number
    const stored = join(dir, 'up', 'stored-report.md')
    writeFileSync(stored, '내용')
    db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)')
      .run(msgId, '보고서.md', stored, 'text/markdown')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any

    gateway.deliver(room, { ...row, author_name: 'alice' }, [
      { botId: pm, delivery: 'to' },
      { botId: qa, delivery: 'cc' },
    ])
    const toMsg = await nextMessage(wsPm.ws)
    const ccMsg = await nextMessage(wsQa.ws)
    // 분별: 같은 메시지인데 delivery 가 봇마다 다르다. 'to' 하드코딩은 여기서 깨진다.
    expect(toMsg.delivery).toBe('to')
    expect(ccMsg.delivery).toBe('cc')
    expect(toMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])
    expect(ccMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])

    wsPm.ws.close(); wsQa.ws.close()
    await app.close()
  })
})
