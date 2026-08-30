import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash, createHmac, randomBytes, sign, timingSafeEqual } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes } from '../src/auth.js'
import { pubOf, ksrvHexOf, skOf, connectV2 } from './gateway-v2.js'

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
async function build(opts: { botFiles?: 'off' } = {}) {
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
  // botFilesDir: 봇이 첨부로 보낼 수 있는 파일의 허용 뿌리. 테스트는 임시 트리 전체를 허용해
  // 기존 첨부 테스트의 원본 파일(dir 바로 아래)이 그대로 통과하게 둔다 — 경계 밖 파일은
  // 아래 AC-GW-021 테스트가 이 트리 바깥에 따로 만든다.
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up'), botFilesDir: opts.botFiles === 'off' ? undefined : dir })
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
  // v2 저장 계약 (SPEC-GWAUTH-002 §D-3) — 검증자와 확인 열쇠만 저장한다. 유도는 이 파일의
  // 하니스 사본(gateway-v2.ts)으로 한다 — 구현을 부르지 않는다.
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')
    .run(roomId, botId, pubOf(token), ksrvHexOf(token))
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

function wsConnect(port: number, token: string, extra: object = {}): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    const inbox: Inbox = { queue: [], waiters: [] }
    inboxes.set(ws, inbox)
    // v2 핸드셰이크 (SPEC-GWAUTH-002) — hello{pub, client_nonce} → challenge 대조 → auth 서명.
    // 이후 프레임은 전부 봉투다 — 검증하고 풀어 내부 프레임을 큐에 넣는다. 대조·검증 규칙은 이
    // 파일의 사본으로 계산한다(위 gateway-v2.ts 와 같은 근거). extra 는 v1 증명 기준(M5 대체 예정)이
    // 쓰던 자리라 형태를 유지한다 — v2 hello 에 붙는 추가 필드는 서버가 무시한다.
    const clientNonce = randomBytes(32).toString('hex')
    let sessKey: Buffer | null = null
    let lastSeq = 0
    let welcomed = false
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: clientNonce, ...extra })))
    ws.on('message', data => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'challenge') {
        const expected = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
          .update(`challenge|${clientNonce}|${msg.server_nonce}|${msg.room_id}|${msg.bot_id}|${pubOf(token)}|unbound`)
          .digest('hex')
        if (typeof msg.server_proof !== 'string' || msg.server_proof.length !== expected.length ||
            !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.server_proof, 'hex'))) {
          ws.close()
          reject(new Error('harness: challenge 대조 실패'))
          return
        }
        sessKey = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
          .update(`session|${clientNonce}|${msg.server_nonce}|${msg.room_id}|${msg.bot_id}|unbound`)
          .digest()
        const signature = sign(
          null,
          Buffer.from(`auth|${clientNonce}|${msg.server_nonce}|${msg.room_id}|${msg.bot_id}|${pubOf(token)}|unbound`),
          skOf(token),   // 하니스의 개인키도 스스로 유도한다 — 구현의 deriveBotKeys 를 부르지 않는다
        ).toString('hex')
        ws.send(JSON.stringify({ type: 'auth', signature }))
        return
      }
      if (msg.type === 'env') {
        const expected = createHmac('sha256', sessKey!).update(`${msg.seq}|${msg.payload}`).digest('hex')
        if (sessKey === null || typeof msg.mac !== 'string' || msg.mac.length !== expected.length ||
            msg.seq <= lastSeq || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.mac, 'hex'))) return
        lastSeq = msg.seq
        let inner: any
        try { inner = JSON.parse(msg.payload) } catch { return }
        if (inner.type === 'welcome' && !welcomed) {
          welcomed = true
          resolve({ ws, welcome: inner })   // welcome 은 큐에 넣지 않는다 — v1 하니스와 같은 의미다
          return
        }
        const w = inbox.waiters.shift()
        if (w) { clearTimeout(w.timer); w.resolve(inner) } else inbox.queue.push(inner)
        return
      }
      // challenge·env 이외(맨몸 welcome 등)는 이 하니스가 기다리는 프레임이 아니다 — 무시한다
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

// SPEC-GWAUTH-001 기준의 독립 증명 계산. 구현이 쓰는 코드(sha256Hex)를 부르지 않고
// node:crypto 로 스스로 계산한다 — 공유하면 규칙이 함께 틀려도 기준이 알아채지 못한다
// (acceptance.md §공통 테스트 하네스, spec.md §3.5 — 사본은 의도된 것이다).
const keyOf = (token: string): string => createHash('sha256').update(token).digest('hex')
const proofOf = (token: string, nonce: string, roomId: number, botId: number): string =>
  createHmac('sha256', keyOf(token)).update(`${nonce}|${roomId}|${botId}`).digest('hex')

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
    db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE verifier_pub=?").run(pubOf(revoked))
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

  // AC-GW-007 — bot_message 저장·복사·발행
  it('stores bot_message, copies files into uploadsDir and publishes to the hub', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const src = join(dir, 'report.md')
    writeFileSync(src, '# 결과\n완료')

    ws.send(JSON.stringify({ type: 'bot_message', body: '정리 완료', files: [{ local_path: src, name: '보고서.md' }] }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    expect(row.body).toBe('정리 완료')
    expect(row.author_bot_id).toBe(pm)
    const att = db.prepare('SELECT * FROM attachments WHERE message_id=?').get(row.id) as any
    // 첨부 행이 실제로 있어야 한다. size/mime 이 NOT NULL 이라 값을 빠뜨리면 INSERT 가
    // 제약 위반으로 던지고 그 예외가 REQ-GW-011 의 건너뛰기 catch 에 삼켜진다 — 그러면
    // 이 줄에서 att 가 undefined 가 되어 아래 단언들이 전부 깨진다.
    expect(att).toBeDefined()
    expect(att.filename).toBe('보고서.md')
    // size 는 원본의 실제 바이트 길이다. 상수도 0도 통과하지 못한다.
    // 본문 '# 결과\n완료' 는 문자 8개지만 UTF-8 로는 15바이트라, 문자 길이를 넣은 구현도 깨진다.
    const srcBytes = readFileSync(src).length
    expect(srcBytes).toBe(15)
    expect(att.size).toBe(srcBytes)
    expect(att.mime).toBe('application/octet-stream')
    // 복사본이 uploadsDir 안에 있고, 원본은 그대로 남는다(이동이 아니라 복사).
    expect(att.stored_path).not.toBe(src)
    expect(att.stored_path.startsWith(join(dir, 'up'))).toBe(true)
    expect(readFileSync(att.stored_path, 'utf8')).toContain('완료')
    expect(existsSync(src)).toBe(true)
    // 허브 발행: 이벤트 이름·방·작성자 이름까지 관측한다.
    const msgEvents = published.filter(p => p.event === 'message')
    expect(msgEvents).toHaveLength(1)
    expect(msgEvents[0].roomId).toBe(room)
    expect(msgEvents[0].data.author_name).toBe('pm')
    expect(msgEvents[0].data.attachments).toHaveLength(1)

    ws.close()
    await app.close()
  })

  // AC-GW-008 — 없는 파일 하나만 건너뛴다
  it('bot_message skips only the missing attachment', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const good = join(dir, '있는파일.txt')
    writeFileSync(good, 'ok')

    ws.send(JSON.stringify({
      type: 'bot_message', body: '결과',
      files: [{ local_path: join(dir, '없는파일'), name: 'x' }, { local_path: good, name: '있는파일.txt' }],
    }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    expect(row.body).toBe('결과')
    const atts = db.prepare('SELECT filename FROM attachments WHERE message_id=?').all(row.id) as { filename: string }[]
    // 분별: 정확히 하나만 살아남는다. 0 이면 "하나 실패 시 전부 포기", 2 면 없는 파일까지 기록한 것이다.
    expect(atts.map(a => a.filename)).toEqual(['있는파일.txt'])

    ws.close()
    await app.close()
  })

  // AC-GW-021 — 허용 뿌리 밖의 local_path 는 복사하지 않는다 (sync-audit F-01)
  it('bot_message refuses a local_path outside botFilesDir while still attaching one inside', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    // 카나리는 허용 뿌리(dir) **밖**에 만든다 — 봇이 절대 경로만 알려주면
    // 서버가 그 내용을 uploads 안으로 복사해 오던 것이 이 결함이다.
    const outsideDir = mkdtempSync(join(tmpdir(), 'md-outside-'))
    const canary = join(outsideDir, 'secret.txt')
    writeFileSync(canary, 'TOP-SECRET-CANARY-9f3a')
    // 대조군: 허용 뿌리 안의 정상 파일 하나. 이게 없으면 "전부 거부"하는 구현도 통과한다.
    const good = join(dir, '정상.txt')
    writeFileSync(good, 'ok')

    try {
      ws.send(JSON.stringify({
        type: 'bot_message', body: '유출 시도',
        files: [{ local_path: canary, name: 'harmless.txt' }, { local_path: good, name: '정상.txt' }],
      }))
      await new Promise(r => setTimeout(r, 300))

      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      // 메시지 자체는 저장된다 — 거부되는 것은 그 첨부 하나뿐이다 (REQ-GW-011 과 같은 자리).
      expect(row.body).toBe('유출 시도')
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      // 분별: 정확히 하나만 살아남는다. 2 면 유출이 그대로이고, 0 이면 정상 파일까지 막은 것이다.
      expect(atts.map(a => a.filename)).toEqual(['정상.txt'])
      // 내용까지 확인한다 — 파일명만 보면 이름이 바뀐 채 복사된 경우를 놓친다.
      for (const a of atts) {
        expect(readFileSync(a.stored_path, 'utf8')).not.toContain('TOP-SECRET-CANARY-9f3a')
      }
      // 원본 카나리는 손대지 않는다.
      expect(readFileSync(canary, 'utf8')).toBe('TOP-SECRET-CANARY-9f3a')
    } finally {
      rmSync(outsideDir, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-023 — 허용 뿌리 안의 심볼릭 링크로도 밖을 끌어오지 못한다 (sync-reaudit N-02)
  it('bot_message refuses a symlink inside botFilesDir that points outside it', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    const outsideDir = mkdtempSync(join(tmpdir(), 'md-outside-'))
    const canary = join(outsideDir, 'secret.txt')
    writeFileSync(canary, 'TOP-SECRET-LINK-7b2c')
    // 링크 자체는 허용 뿌리(dir) **안**에 있다 — 어휘적 경로 검사는 이걸 통과시킨다.
    const link = join(dir, '겉보기정상.txt')
    symlinkSync(canary, link)
    // 대조군: 링크가 아닌 뿌리 안의 진짜 파일.
    const good = join(dir, '진짜.txt')
    writeFileSync(good, 'ok')

    try {
      ws.send(JSON.stringify({
        type: 'bot_message', body: '링크 시도',
        files: [{ local_path: link, name: '겉보기정상.txt' }, { local_path: good, name: '진짜.txt' }],
      }))
      await new Promise(r => setTimeout(r, 300))

      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      expect(row.body).toBe('링크 시도')
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['진짜.txt'])
      for (const a of atts) {
        expect(readFileSync(a.stored_path, 'utf8')).not.toContain('TOP-SECRET-LINK-7b2c')
      }
    } finally {
      rmSync(outsideDir, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-024 — 허브 발행 프레임에 저장 경로가 실리지 않는다 (sync-reaudit N-01)
  it('never publishes stored_path on the hub frame for a bot attachment', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const src = join(dir, '첨부.txt')
    writeFileSync(src, '내용')

    ws.send(JSON.stringify({ type: 'bot_message', body: '첨부 있음', files: [{ local_path: src, name: '첨부.txt' }] }))
    await new Promise(r => setTimeout(r, 300))

    const frame = published.filter(p => p.event === 'message').at(-1)!
    // 대조군: 첨부가 실제로 하나 실려 있고 id·filename 은 있어야 한다 —
    // 없으면 "첨부를 통째로 빼먹은" 구현도 통과한다.
    expect(frame.data.attachments).toHaveLength(1)
    expect(frame.data.attachments[0].filename).toBe('첨부.txt')
    expect(typeof frame.data.attachments[0].id).toBe('number')
    expect(frame.data.attachments[0]).not.toHaveProperty('stored_path')
    // 프레임 전체를 문자열로 훑어 다른 필드 이름으로 새는 경우까지 잡는다.
    const att = db.prepare('SELECT stored_path FROM attachments').get() as { stored_path: string }
    expect(JSON.stringify(frame.data)).not.toContain(att.stored_path)

    ws.close()
    await app.close()
  })

  // AC-GW-025 — botFilesDir 미설정이면 봇 첨부를 전부 거부한다 (sync-audit-3 N-08)
  it('bot_message attaches nothing at all when botFilesDir is unset', async () => {
    const { app, port } = await build({ botFiles: 'off' })
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    // 켜져 있었다면 통과했을 파일이다 — 위 AC-GW-021 의 대조군과 같은 자리에 있다.
    const good = join(dir, '켜져있으면통과.txt')
    writeFileSync(good, 'ok')

    ws.send(JSON.stringify({ type: 'bot_message', body: '첨부 시도', files: [{ local_path: good, name: '켜져있으면통과.txt' }] }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    // 본문은 저장된다 — 꺼진 것은 첨부뿐이다.
    expect(row.body).toBe('첨부 시도')
    expect(db.prepare('SELECT COUNT(*) c FROM attachments WHERE message_id=?').get(row.id)).toEqual({ c: 0 })

    ws.close()
    await app.close()
  })

  // AC-GW-026 — 허용 뿌리와 이름이 겹치는 형제 디렉터리는 통과하지 못한다 (sync-audit-3 N-08)
  it('bot_message refuses a sibling directory whose path merely prefixes botFilesDir', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    // dir 의 형제이면서 문자열로는 dir 을 접두사로 갖는 디렉터리. 경로 구분자를 붙이지 않고
    // 비교하면 여기가 뚫린다 — gateway.ts 주석이 방어한다고 적어 둔 바로 그 경우다.
    const sibling = `${dir}evil`
    mkdirSync(sibling, { recursive: true })
    const outside = join(sibling, 'secret.txt')
    writeFileSync(outside, 'SIBLING-CANARY-4d1e')
    const good = join(dir, '진짜뿌리안.txt')
    writeFileSync(good, 'ok')

    try {
      ws.send(JSON.stringify({
        type: 'bot_message', body: '형제 시도',
        files: [{ local_path: outside, name: 'secret.txt' }, { local_path: good, name: '진짜뿌리안.txt' }],
      }))
      await new Promise(r => setTimeout(r, 300))

      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['진짜뿌리안.txt'])
      for (const a of atts) {
        expect(readFileSync(a.stored_path, 'utf8')).not.toContain('SIBLING-CANARY-4d1e')
      }
    } finally {
      rmSync(sibling, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-009 — status 는 두 값만 발행한다
  it('status publishes bot_status for working and idle only', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    ws.send(JSON.stringify({ type: 'status', state: 'working' }))
    ws.send(JSON.stringify({ type: 'status', state: 'idle' }))
    await new Promise(r => setTimeout(r, 200))
    let events = published.filter(p => p.event === 'bot_status')
    expect(events.map(e => e.data.state)).toEqual(['working', 'idle'])
    expect(events[0].data.bot_id).toBe(pm)
    expect(events[0].roomId).toBe(room)

    // 대조군: 알 수 없는 값은 아무것도 발행하지 않는다.
    ws.send(JSON.stringify({ type: 'status', state: 'sleeping' }))
    await new Promise(r => setTimeout(r, 200))
    events = published.filter(p => p.event === 'bot_status')
    expect(events).toHaveLength(2)

    ws.close()
    await app.close()
  })

  // AC-GW-010 — isOnline 은 접속을 따라간다
  it('isOnline follows the connection, per room and bot', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const token = invite(roomA, pm)
    invite(roomA, qa); invite(roomB, pm)

    expect(gateway.isOnline(roomA, pm)).toBe(false)
    const { ws } = await wsConnect(port, token)
    expect(gateway.isOnline(roomA, pm)).toBe(true)
    // 분별: 같은 방 다른 봇도, 다른 방 같은 봇도 온라인이 아니다. `return true` 는 여기서 깨진다.
    expect(gateway.isOnline(roomA, qa)).toBe(false)
    expect(gateway.isOnline(roomB, pm)).toBe(false)

    ws.close()
    await closedPromise(ws)
    await new Promise(r => setTimeout(r, 100))
    expect(gateway.isOnline(roomA, pm)).toBe(false)
    await app.close()
  })

  // AC-GW-011 — 이력은 번호 오름차순이고 rid 를 되돌린다
  it('history_request returns the room messages in id order and echoes rid', async () => {
    const { app, port } = await build()
    const room = seedRoom('A'), other = seedRoom('B')
    const pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    for (const b of ['하나', '둘', '셋']) db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, b)
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '남의 방')").run(other)

    ws.send(JSON.stringify({ type: 'history_request', rid: 'r1', limit: 10 }))
    const res1 = await nextMessage(ws)
    expect(res1.type).toBe('history_response')
    expect(res1.rid).toBe('r1')
    expect(res1.messages.map((m: any) => m.body)).toEqual(['하나', '둘', '셋'])
    expect(res1.messages.map((m: any) => m.id)).toEqual([...res1.messages.map((m: any) => m.id)].sort((a: number, b: number) => a - b))
    // 방 격리: 다른 방 메시지는 섞이지 않는다.
    expect(res1.messages.map((m: any) => m.body)).not.toContain('남의 방')

    // 분별: rid 는 요청마다 그대로 되돌아온다. 하드코딩은 여기서 깨진다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r2', limit: 10 }))
    const res2 = await nextMessage(ws)
    expect(res2.rid).toBe('r2')

    ws.close()
    await app.close()
  })

  // AC-GW-012 — since_id 는 커서 이하를 실제로 걸러 낸다
  it('history_request with since_id returns only later messages', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const ids = ['하나', '둘', '셋'].map(b =>
      db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, b).lastInsertRowid as number)
    const cursor = ids[1]

    // 대조군 먼저: 필터가 없으면 커서 이하 메시지가 응답에 들어온다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'ctl', limit: 10 }))
    const control = await nextMessage(ws)
    expect(control.messages.map((m: any) => m.id)).toEqual(ids)
    expect(control.messages.some((m: any) => m.id <= cursor)).toBe(true)

    // 본 검사: since_id 를 붙이면 커서 이하가 하나도 없다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r2', since_id: cursor, limit: 10 }))
    const res = await nextMessage(ws)
    expect(res.rid).toBe('r2')
    expect(res.messages.length).toBeGreaterThan(0)
    expect(res.messages.every((m: any) => m.id > cursor)).toBe(true)
    expect(res.messages.map((m: any) => m.body)).toEqual(['셋'])
    // 필터가 없앤 것이 실재함을 DB 로 확인한다 — 방에 커서 이하 메시지가 둘 있다.
    const below = db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=? AND id<=?').get(room, cursor) as { c: number }
    expect(below.c).toBe(2)
    expect(control.messages.length - res.messages.length).toBe(below.c)

    ws.close()
    await app.close()
  })

  // AC-GW-013 — limit 은 필터보다 먼저, 선택 필터 셋은 각각 걸러 낸다
  it('history_request applies limit before since_id, speaker, since and until', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const alice = db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice','x')").run().lastInsertRowid as number
    const { ws } = await wsConnect(port, invite(room, pm))

    const ids: number[] = []
    for (let i = 1; i <= 5; i++) {
      ids.push(db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body, created_at) VALUES (?, 'user', ?, ?, ?)")
        .run(room, alice, `m${i}`, `2026-08-2${i}T00:00:00Z`).lastInsertRowid as number)
    }
    db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body, created_at) VALUES (?, 'bot', ?, '봇 발언', '2026-08-26T00:00:00Z')").run(room, pm)

    // limit 순서: limit 2 는 "최근 2건을 자른 뒤" since_id 를 적용한다.
    // 필터를 먼저 적용했다면 m1 다음 두 건(m2, m3)이 왔을 것이다 — 두 해석을 가른다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'a', since_id: ids[0], limit: 2 }))
    const limited = await nextMessage(ws)
    expect(limited.messages.map((m: any) => m.body)).toEqual(['m5', '봇 발언'])

    // speaker 필터
    ws.send(JSON.stringify({ type: 'history_request', rid: 'b', speaker: 'pm', limit: 100 }))
    expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['봇 발언'])

    // since / until 필터
    ws.send(JSON.stringify({ type: 'history_request', rid: 'c', since: '2026-08-24T00:00:00Z', until: '2026-08-26T00:00:00Z', limit: 100 }))
    expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['m4', 'm5'])

    // 대조군: 필터 없이는 여섯 건 전부 온다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'd', limit: 100 }))
    expect((await nextMessage(ws)).messages).toHaveLength(6)

    ws.close()
    await app.close()
  })

  // AC-GW-014 — 이력의 네 필드와 작성자 이름 해석
  it('history_response carries id, author_name, body and created_at', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const alice = db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice','x')").run().lastInsertRowid as number
    db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body) VALUES (?, 'user', ?, '사람 말')").run(room, alice)
    db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, '봇 말')").run(room, pm)
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', '시스템 말')").run(room)

    const { ws } = await wsConnect(port, invite(room, pm))
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r', limit: 10 }))
    const res = await nextMessage(ws)

    for (const m of res.messages) {
      // 네 조각: 채널이 `#<번호> [시각] 작성자: 본문` 을 만들 때 쓰는 필드 전부
      expect(typeof m.id).toBe('number')
      expect(typeof m.author_name).toBe('string')
      expect(typeof m.body).toBe('string')
      expect(typeof m.created_at).toBe('string')
      expect(m.created_at.length).toBeGreaterThan(0)
    }
    // 분별: 작성자 종류마다 이름이 다르다. 상수를 돌려주는 authorName 은 여기서 깨진다.
    expect(res.messages.map((m: any) => m.author_name)).toEqual(['alice', 'pm', '시스템'])

    ws.close()
    await app.close()
  })

  // AC-GW-015 — 이력 응답은 요청한 봇에게만 간다
  it('history_response goes only to the requesting bot', async () => {
    const { app, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    const wsPm = await wsConnect(port, invite(room, pm))
    const wsQa = await wsConnect(port, invite(room, qa))
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '하나')").run(room)

    wsPm.ws.send(JSON.stringify({ type: 'history_request', rid: 'r', limit: 10 }))
    const res = await nextMessage(wsPm.ws)
    expect(res.rid).toBe('r')
    await expectNoMessage(wsQa.ws)   // 부정 관측: 옆 봇에게 새지 않는다

    wsPm.ws.close(); wsQa.ws.close()
    await app.close()
  })

  // AC-GW-016 — closeRoom 은 그 방만 끊는다
  it('closeRoom disconnects only that room', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const wsA = await wsConnect(port, invite(roomA, pm))
    const wsB = await wsConnect(port, invite(roomB, qa))
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', 'B 방 메시지')").run(roomB)

    const aClosed = closedPromise(wsA.ws)
    gateway.closeRoom(roomA)
    await aClosed
    expect(gateway.isOnline(roomA, pm)).toBe(false)

    // 분별: 다른 방 소켓은 열려 있을 뿐 아니라 여전히 왕복이 된다.
    expect(wsB.ws.readyState).toBe(WebSocket.OPEN)
    expect(gateway.isOnline(roomB, qa)).toBe(true)
    wsB.ws.send(JSON.stringify({ type: 'history_request', rid: 'alive', limit: 10 }))
    const res = await nextMessage(wsB.ws)
    expect(res.rid).toBe('alive')
    expect(res.messages.map((m: any) => m.body)).toEqual(['B 방 메시지'])

    wsB.ws.close()
    await app.close()
  })

  // AC-GW-017 — 권한 릴레이 창구
  it('relays permission_request to the handler and sendToBot reports delivery', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    invite(room, qa)   // qa 는 초대만 받고 접속하지 않는다 (오프라인 대조군)
    const seen: { info: any; params: any }[] = []
    gateway.setPermissionHandler((info, params) => seen.push({ info, params }))
    const { ws } = await wsConnect(port, invite(room, pm))

    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'p1', tool_name: 'Bash', description: '설치', input_preview: 'npm i' }))
    await new Promise(r => setTimeout(r, 200))
    expect(seen).toHaveLength(1)
    expect(seen[0].info).toEqual({ roomId: room, botId: pm })
    expect(seen[0].params.request_id).toBe('p1')
    expect(seen[0].params.tool_name).toBe('Bash')

    // 온라인 봇에게는 true 이고 실제로 도착한다.
    expect(gateway.sendToBot(room, pm, { type: 'permission_verdict', request_id: 'p1', behavior: 'allow' })).toBe(true)
    const verdict = await nextMessage(ws)
    expect(verdict).toEqual({ type: 'permission_verdict', request_id: 'p1', behavior: 'allow' })
    // 분별: 오프라인 봇에게는 false 이고 아무 일도 일어나지 않는다. `return true` 는 여기서 깨진다.
    expect(gateway.sendToBot(room, qa, { type: 'permission_verdict', request_id: 'p2', behavior: 'deny' })).toBe(false)
    await expectNoMessage(ws)

    // 핸들러 해제 후에는 호출되지 않는다.
    gateway.setPermissionHandler(null)
    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'p3' }))
    await new Promise(r => setTimeout(r, 200))
    expect(seen).toHaveLength(1)

    ws.close()
    await app.close()
  })

  // AC-GW-018 — 조립: buildServer 배선과 초대 목록의 online
  it('buildServer wires the gateway, archive hook and invite online flag', async () => {
    process.env.MINIDISCORD_DATA_DIR = join(dir, 'srv')
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    await app.listen({ port: 0 })
    const port = (app.server.address() as { port: number }).port

    // Gateway 계약: 다섯 메서드가 전부 함수다 (REQ-GW-021)
    const gw = (app as any).gateway
    for (const m of ['deliver', 'closeRoom', 'isOnline', 'sendToBot', 'setPermissionHandler']) {
      expect(typeof gw[m]).toBe('function')
    }

    // 가입·로그인 라우트 이름과 set-cookie 정규화는 rooms-bots.test.ts 의 build() 와 같다
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    const raw = login.headers['set-cookie'] ?? ''
    const ck = (Array.isArray(raw) ? raw[0] : raw).split(';')[0]
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name: 'A' } })).json()
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: ck }, payload: { name: 'pm' } })).json()
    const inv = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck }, payload: { bot_id: bot.id } })).json()

    // 접속 전: online 은 false
    const before = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck } })).json()
    expect(before[0].online).toBe(false)

    // v2 핸드셰이크로 접속한다 — API 가 발급한 평문 토큰으로 유도가 맞는지까지 같이 잰다
    const { ws } = await connectV2(port, inv.token)

    // 접속 후: 같은 라우트가 true 로 바뀐다 — 상수 false 를 배제하는 분별 단언
    const during = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck } })).json()
    expect(during[0].online).toBe(true)
    expect(typeof during[0].online).toBe('boolean')

    // 보관 훅: HTTP 로 방을 보관하면 그 방 소켓이 끊긴다
    const closed = closedPromise(ws)
    const archived = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie: ck } })
    expect(archived.statusCode).toBe(200)
    await closed

    await app.close()
    delete process.env.MINIDISCORD_DATA_DIR
  })

  // AC-GWAUTH-001 — 증명은 논스·방·봇에 묶이고 저장된 해시를 열쇠로 한다
  it('welcome carries a proof bound to the nonce, room and bot, keyed on the stored token hash', async () => {
    const { app, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    // invite() 는 평문 토큰을 돌려주고 해시만 저장한다 — 증명 열쇠 후보는 이 해시뿐이다.
    const tokenA = invite(roomA, pm)
    const tokenB = invite(roomB, qa)

    const n1 = randomBytes(32).toString('hex')
    const n2 = randomBytes(32).toString('hex')
    const a = await wsConnect(port, tokenA, { nonce: n1 })
    const b = await wsConnect(port, tokenB, { nonce: n2 })
    // 각 증명은 테스트가 독립 계산한 값과 정확히 같다. 열쇠가 저장 해시가 아니면(평문 토큰,
    // room_id 문자열 등) 여기서 깨진다 — 상수 증명도 두 토큰 대조에서 깨진다.
    expect(a.welcome.proof).toBe(proofOf(tokenA, n1, roomA, pm))
    expect(b.welcome.proof).toBe(proofOf(tokenB, n2, roomB, qa))
    expect(a.welcome.proof).not.toBe(b.welcome.proof)

    // 같은 토큰·방·봇이라도 논스가 바뀌면 증명이 달라진다 — 논스 의존의 실측.
    const n3 = randomBytes(32).toString('hex')
    const again = await wsConnect(port, tokenA, { nonce: n3 })
    expect(again.welcome.proof).toBe(proofOf(tokenA, n3, roomA, pm))
    expect(again.welcome.proof).not.toBe(a.welcome.proof)

    a.ws.close(); b.ws.close(); again.ws.close()
    await app.close()
  })

  // AC-GWAUTH-002 — 논스 없는 hello 도 환영받고, 그 환영에는 증명이 없다
  it('a hello without a nonce is still welcomed, and that welcome carries no proof', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)

    // nonce 없이 — wsConnect 의 기존 hello 프레임 그대로다.
    const { ws, welcome } = await wsConnect(port, token)
    // 접속이 닫히지 않았다 — welcome 뒤 왕복 하나가 실제로 성립하는 것으로 잰다 (REQ-GWAUTH-004).
    ws.send(JSON.stringify({ type: 'history_request', rid: 'alive', limit: 1 }))
    const res = await nextMessage(ws)
    expect(res.rid).toBe('alive')
    // 증명 키의 부재 — undefined 만이 아니라 키 집합에서 아예 없어야 한다. 키 집합 전체를
    // toEqual 로 재면 다른 이름의 필드가 조용히 늘어도 잡힌다.
    expect(Object.keys(welcome).sort()).toEqual(['bot_id', 'bot_name', 'missed_after_id', 'room_id', 'type'])

    ws.close()
    await app.close()
  })

  // AC-GWAUTH-003 — 어떤 프레임도 평문 토큰이나 저장 해시를 싣지 않는다
  it('no frame ever carries the plaintext token or its stored hash', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)
    // 재전송 프레임을 하나 심는다 — welcome 만 받으면 «어떤 프레임도» 을 재지 못한다.
    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '재전송 대상')").run(room).lastInsertRowid as number
    db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(msgId, pm, 'to')

    const nonce = randomBytes(32).toString('hex')
    const { ws, welcome } = await wsConnect(port, token, { nonce })
    // welcome 과 재전송 프레임을 전부 모은다 — 더 오지 않을 때까지 기다린다.
    const frames: any[] = [welcome]
    try { for (;;) frames.push(await nextMessage(ws, 300)) } catch { /* 타임아웃 — 프레임이 끝났다 */ }
    // 대조군: 관측 집합이 실재한다 — welcome 과 재전송 message 가 실제로 도착했다.
    expect(frames[0].type).toBe('welcome')
    expect(frames.some(f => f.type === 'message')).toBe(true)
    // 부재 측정에는 포함 검사가 정확하다 — 이 테스트만 .includes 를 쓴다 (acceptance.md).
    // 두 값 모두 64자 hex 라 우연 일치는 실질적으로 없다.
    const wire = frames.map(f => JSON.stringify(f)).join('')
    expect(wire.includes(token)).toBe(false)
    expect(wire.includes(keyOf(token))).toBe(false)

    ws.close()
    await app.close()
  })
})
