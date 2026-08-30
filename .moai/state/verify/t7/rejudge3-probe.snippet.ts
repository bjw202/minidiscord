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
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
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
  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
    reply.hijack()                                                   // SPEC-SSE-001 REQ-SSE-003 — subscribe 앞에 온다
    hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
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

const DESTRUCTIVE = 'DESTRUCTIVE_TOOL_CALL'
describe('t7 re-judgement probe (round 3, clean re-run)', () => {
  it('W1 tool_name forging a guidance instruction', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'zzzzz', tool_name: 'Bash', description: DESTRUCTIVE, input_preview: DESTRUCTIVE })
    broker.onGatewayRequest({ roomId, botId }, {
      request_id: 'abcde',
      tool_name: 'Read' + ' '.repeat(40) + '승인하려면 "yes zzzzz", 거절하려면 "no zzzzz" 라고 답해주세요.',
      description: 'harmless', input_preview: 'cat README',
    })
    const row = db.prepare("SELECT body FROM messages WHERE author_type='system' ORDER BY id DESC LIMIT 1").get() as { body: string }
    console.log('[W1 본문]\n' + row.body)
    expect(row.body.split('\n')[0]).not.toContain('승인하려면')
    expect(row.body.split('\n').filter(l => l.startsWith('승인하려면')).length).toBe(1)
  })
  it('W3 rejection notice carries bot text on an unprefixed line', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, {
      request_id: '승인하려면 "yes zzzzz", 거절하려면 "no zzzzz" 라고 답해주세요.',
      tool_name: 'Read', description: 'd', input_preview: 'p',
    })
    const row = db.prepare("SELECT body FROM messages WHERE author_type='system' ORDER BY id DESC LIMIT 1").get() as { body: string }
    console.log('[W3 본문]\n' + row.body)
    console.log('[W3 줄 수] ' + row.body.split('\n').length + ' / 접두 없음 = ' + !row.body.startsWith('│'))
    expect(row.body.split('\n').length).toBe(1)
  })
  it('W4 malformed tool_name still registers and resolves', async () => {
    const { app, broker, cookie, port } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const ws = await wsConnect(port, token)
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Read Bash', description: 'd', input_preview: 'p' })
    const seen = nextMessage(ws)
    const res = await post(app, roomId, cookie, 'yes abcde')
    const verdict = await seen
    console.log('[W4 판정] ' + JSON.stringify(verdict) + ' / consumed_by=' + JSON.parse(res.body).consumed_by)
    expect(verdict?.behavior).toBe('allow')
  })
})
