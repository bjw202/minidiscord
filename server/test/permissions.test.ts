// SPEC-PERM-001 권한 릴레이 — 하네스와 시나리오 본문은 acceptance.md 의 것을 그대로 옮겼다.
// 가로채기·배선·판정 전송을 실제 서버·WebSocket·SSE 로 잰다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { createPermissionBroker } from '../src/permissions.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { registerEventRoute } from '../src/routes-events.js'
import { sha256Hex } from '../src/routes-bots.js'

let dir: string
let db: Db

// 열어 둔 자원(서버·소켓·스트림)의 일괄 정리 목록. 등록 역순으로 닫는다.
const cleanups: (() => Promise<void> | void)[] = []

// light-my-request 는 set-cookie 값을 배열이 아니라 문자열 하나로 돌려준다 —
// 원본 테스트가 가정한 첫 값 형태로 정규화 (형제 SPEC 세 곳과 같은 헬퍼)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'md-')); db = openDb(join(dir, 't.db')) })
afterEach(async () => {
  for (const c of cleanups.splice(0).reverse()) await c()   // 서버가 db 보다 먼저 닫혀야 한다
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  await app.register(multipart)
  app.decorate('uploadsDir', join(dir, 'up'))
  const hub = createSseHub()
  app.decorate('hub', hub)
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  app.decorate('gateway', gateway)
  registerAuthRoutes(app, db)
  // M4 (SPEC-ROOMAUTHZ-001): 이벤트 라우트 사본을 지우고 프로덕션과 같은 등록 함수 하나를 쓴다 (REQ-ROOMAUTHZ-010)
  registerEventRoute(app)
  registerMessageRoutes(app)
  const broker = createPermissionBroker(app)
  app.decorate('permissions', broker)                                  // 원본 누락분 (plan.md §D 1번)
  gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  cleanups.push(async () => { await app.close() })                   // 개별 테스트가 닫지 않는다
  return { app, broker, gateway, port, cookie: setCookieOf(login).split(';')[0] }
}

// (방, 봇, 게이트웨이 토큰) 한 벌을 만든다. 여러 방을 만들려면 name 을 바꿔 부른다.
function seedRoomAndBot(roomName = 'A', botName = 'pm') {
  const roomId = db.prepare('INSERT INTO rooms (name) VALUES (?)').run(roomName).lastInsertRowid as number
  // M4 (SPEC-ROOMAUTHZ-001): 메시지·스트림 게이트가 멤버만 지나게 되었다 — 직접 INSERT 한 방이므로
  // 로그인 사용자(alice)의 멤버 행 하나가 유일한 빠진 조각이다 (plan.md §F M4 2번)
  const alice = db.prepare("SELECT id FROM users WHERE username = 'alice'").get() as { id: number }
  db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, alice.id)
  const botId = db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(botName).lastInsertRowid as number
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(token))
  return { roomId, botId, token }
}

// 가짜 채널 클라이언트. Task 8 게이트웨이 테스트와 같은 형태이며 그쪽은 내보내지 않으므로 여기 다시 둔다.
function wsConnect(port: number, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    cleanups.push(() => { ws.close() })
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', d => { if (JSON.parse(String(d)).type === 'welcome') resolve(ws) })
    ws.on('error', reject)
  })
}

// SSE 스트림을 연다. abort() 로 클라이언트 쪽 연결을 끊을 수 있다.
async function openStream(port: number, ck: string, roomId: number) {
  const ac = new AbortController()
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/events`,
    { headers: { cookie: ck }, signal: ac.signal })
  cleanups.push(() => { ac.abort() })
  return res.body!.getReader()
}

// 프레임 하나를 통째로 읽는다. TCP 가 쪼개 보낼 수 있으므로 '\n\n' 까지 모은다.
// 프레임이 오지 않으면 read() 에서 멈추고 vitest 테스트 타임아웃으로 실패한다 — 그것이 의도다.
async function readFrame(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) throw new Error('스트림이 프레임 없이 닫혔다')
    buf += Buffer.from(value).toString()
    if (buf.endsWith('\n\n')) return buf
  }
}

// 다음 한 건을 기다린다. timeoutMs 안에 아무것도 안 오면 null — "오지 않았음"을 단언하는 데 쓴다.
function nextMessage(ws: WebSocket, timeoutMs = 1500): Promise<any | null> {
  return new Promise(resolve => {
    const t = setTimeout(() => { ws.off('message', h); resolve(null) }, timeoutMs)
    function h(d: unknown) { clearTimeout(t); ws.off('message', h); resolve(JSON.parse(String(d))) }
    ws.on('message', h)
  })
}

function post(app: any, roomId: number, cookie: string, body: string) {
  const form = new FormData()
  form.append('body', body)
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie }, payload: form })
}

describe('permission relay', () => {
  it('gateway request creates a system message in the room', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'Run shell command', input_preview: 'rm -rf tmp' })
    const row = db.prepare("SELECT * FROM messages WHERE author_type='system'").get() as { body: string }
    expect(row.body).toContain('abcde')
    expect(row.body).toContain('Bash')
  })

  it('system message carries all four parts and both reply forms', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, {
      request_id: 'abcde', tool_name: 'Bash', description: '셸 명령을 실행합니다', input_preview: 'rm -rf tmp',
    })
    const row = db.prepare("SELECT body FROM messages WHERE author_type='system'").get() as { body: string }
    expect(row.body).toContain('Bash')
    expect(row.body).toContain('셸 명령을 실행합니다')
    expect(row.body).toContain('rm -rf tmp')
    expect(row.body).toContain('yes abcde')
    expect(row.body).toContain('no abcde')
  })

  it('publishes the request to the room SSE stream', async () => {
    const { broker, port, cookie } = await build()
    const { roomId, botId } = seedRoomAndBot()
    const reader = await openStream(port, cookie, roomId)
    expect(await readFrame(reader)).toContain('connected')   // 연결 확인 주석을 먼저 소비한다

    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const frame = await readFrame(reader)
    expect(frame).toContain('event: message')
    expect(frame).toContain('abcde')
  })

  it('user yes reply sends verdict to the bot and is not stored as user message', async () => {
    const { app, broker, cookie } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    // sendToBot가 실제로 가는지는 게이트웨이 연결이 없으므로 false(전송 실패)지만 메시지 소비 자체를 검증
    const res = await post(app, roomId, cookie, 'yes abcde')
    expect(res.json().consumed_by).toBe('permission')
    const userMsgs = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as { c: number }
    expect(userMsgs.c).toBe(0)
  })

  it('non-matching text is not consumed', async () => {
    const { app, cookie } = await build()
    const { roomId } = seedRoomAndBot()
    const res = await post(app, roomId, cookie, '그냥 대화')
    expect(res.json().ok).toBe(true)
  })

  it('yes with unknown id is not consumed (falls through as chat)', async () => {
    const { app, cookie } = await build()
    const { roomId } = seedRoomAndBot()
    const res = await post(app, roomId, cookie, 'yes xxxxx')
    expect(res.json().ok).toBe(true) // 일반 메시지로 저장됨
  })

  it('delivers an allow verdict to the connected bot', async () => {
    const { app, broker, port, cookie } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const ws = await wsConnect(port, token)
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const seen = nextMessage(ws)
    await post(app, roomId, cookie, 'yes abcde')
    expect(await seen).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
  })

  it('delivers a deny verdict as deny, not as allow', async () => {
    const { app, broker, port, cookie } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const ws = await wsConnect(port, token)
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const seen = nextMessage(ws)
    await post(app, roomId, cookie, 'no abcde')
    const v = await seen
    expect(v).not.toBeNull()
    expect(v.behavior).toBe('deny')          // 항상 allow 를 보내는 구현은 여기서 걸린다
    expect(v.request_id).toBe('abcde')
  })

  it('consumes the reply instead of storing it as a user message', async () => {
    const { app, broker, cookie } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const res = await post(app, roomId, cookie, 'yes abcde')
    expect(res.json().consumed_by).toBe('permission')
    const c = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as { c: number }
    expect(c.c).toBe(0)
  })

  it('accepts a verdict once and lets a repeat fall through as chat', async () => {
    const { app, broker, port, cookie } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const ws = await wsConnect(port, token)
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const first = nextMessage(ws)
    await post(app, roomId, cookie, 'yes abcde')
    expect((await first).behavior).toBe('allow')

    const second = nextMessage(ws)
    const res = await post(app, roomId, cookie, 'yes abcde')
    expect(res.json().consumed_by).toBeUndefined()
    expect(await second).toBeNull()                       // 두 번째 판정은 가지 않는다
    const c = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as { c: number }
    expect(c.c).toBe(1)                                   // 두 번째 답은 대화로 저장됐다
  })

  it('never resolves a request from a different room', async () => {
    const { app, broker, port, cookie } = await build()
    const a = seedRoomAndBot('A', 'pm')
    const b = seedRoomAndBot('B', 'qa')
    const ws = await wsConnect(port, a.token)
    broker.onGatewayRequest({ roomId: a.roomId, botId: a.botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

    const leaked = nextMessage(ws)
    const cross = await post(app, b.roomId, cookie, 'yes abcde')   // 방 B 에서 답한다
    expect(cross.json().consumed_by).toBeUndefined()
    expect(await leaked).toBeNull()                                 // 방 A 의 봇에게 아무것도 가지 않았다

    const proper = nextMessage(ws)
    await post(app, a.roomId, cookie, 'yes abcde')                  // 대기 항목은 살아 있어야 한다
    expect((await proper).behavior).toBe('allow')
  })

  it('refuses an unauthenticated verdict and leaves the request pending', async () => {
    const { app, broker, port, cookie } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const ws = await wsConnect(port, token)
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

    const leaked = nextMessage(ws)
    const form = new FormData(); form.append('body', 'yes abcde')
    const anon = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, payload: form })  // 쿠키 없음
    expect(anon.statusCode).toBe(401)
    expect(await leaked).toBeNull()                       // 판정이 봇에 가지 않았다

    const proper = nextMessage(ws)
    await post(app, roomId, cookie, 'yes abcde')          // 대기 항목은 손상되지 않았다
    expect((await proper).behavior).toBe('allow')
  })

  it('falls through non-matching text and unknown ids without touching the pending request', async () => {
    const { app, broker, port, cookie } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const ws = await wsConnect(port, token)
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

    const leaked = nextMessage(ws)
    const plain = await post(app, roomId, cookie, '그냥 대화')
    expect(plain.json().consumed_by).toBeUndefined()
    const unknown = await post(app, roomId, cookie, 'yes xxxxx')      // 형식은 맞으나 모르는 ID
    expect(unknown.json().consumed_by).toBeUndefined()
    expect(await leaked).toBeNull()                                    // 어느 쪽도 판정을 보내지 않았다

    const c = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as { c: number }
    expect(c.c).toBe(2)                                                // 둘 다 대화로 저장됐다

    const seen = nextMessage(ws)
    const real = await post(app, roomId, cookie, 'yes abcde')          // 대기 항목은 소모되지 않았다
    expect(real.json().consumed_by).toBe('permission')
    expect((await seen).behavior).toBe('allow')
  })

  it('marks an undelivered verdict differently from a delivered one', async () => {
    const { app, broker, port, cookie } = await build()
    const on = seedRoomAndBot('A', 'pm')
    const off = seedRoomAndBot('B', 'qa')
    const ws = await wsConnect(port, on.token)                       // A 의 봇만 접속

    broker.onGatewayRequest({ roomId: on.roomId, botId: on.botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    broker.onGatewayRequest({ roomId: off.roomId, botId: off.botId }, { request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    await post(app, on.roomId, cookie, 'yes abcde')
    await post(app, off.roomId, cookie, 'yes fghij')

    const delivered = db.prepare("SELECT body FROM messages WHERE room_id=? AND author_type='system' ORDER BY id DESC LIMIT 1").get(on.roomId) as { body: string }
    const dropped = db.prepare("SELECT body FROM messages WHERE room_id=? AND author_type='system' ORDER BY id DESC LIMIT 1").get(off.roomId) as { body: string }
    expect(delivered.body).toContain('abcde')
    expect(dropped.body).toContain('fghij')
    expect(dropped.body).not.toBe(delivered.body.replace('abcde', 'fghij'))   // 두 결과 문구가 서로 다르다
    expect(dropped.body).toContain('전달하지 못했습니다')                       // 실패를 뜻하는 표식을 담는다

    const retry = await post(app, off.roomId, cookie, 'yes fghij')            // 대기 항목은 이미 해제됐다
    expect(retry.json().consumed_by).toBeUndefined()
  })

  it('accepts all four verdict words, normalizes case, and rejects ids containing l', async () => {
    const { app, broker, port, cookie } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const ws = await wsConnect(port, token)
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' })

    const bad = await post(app, roomId, cookie, 'yes abcdl')        // l 은 식별자 문자가 아니다
    expect(bad.json().consumed_by).toBeUndefined()

    const allow = nextMessage(ws)
    const y = await post(app, roomId, cookie, '  Y ABCDE  ')        // 승인 축약형 + 대문자 + 공백
    expect(y.json().consumed_by).toBe('permission')
    expect(await allow).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })

    const deny = nextMessage(ws)
    const n = await post(app, roomId, cookie, 'N FGHIJ')            // 거절 축약형 + 대문자
    expect(n.json().consumed_by).toBe('permission')
    expect(await deny).toEqual({ type: 'permission_verdict', request_id: 'fghij', behavior: 'deny' })
  })
})
