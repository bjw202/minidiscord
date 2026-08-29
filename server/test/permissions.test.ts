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

  // 두 방이 같은 request_id 를 동시에 걸어도 서로를 덮어쓰지 않고 각자 풀려야 한다 (t7 결함1)
  it('same request_id in two rooms keeps both requests resolvable', async () => {
    const { app, broker, port, cookie } = await build()
    const a = seedRoomAndBot('A', 'pm')
    const b = seedRoomAndBot('B', 'qa')
    const wsA = await wsConnect(port, a.token)
    const wsB = await wsConnect(port, b.token)
    broker.onGatewayRequest({ roomId: a.roomId, botId: a.botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    broker.onGatewayRequest({ roomId: b.roomId, botId: b.botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

    const verdictA = nextMessage(wsA)
    const resA = await post(app, a.roomId, cookie, 'yes abcde')
    expect(resA.json().consumed_by).toBe('permission')
    expect(await verdictA).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })

    const verdictB = nextMessage(wsB)
    const resB = await post(app, b.roomId, cookie, 'yes abcde')
    expect(resB.json().consumed_by).toBe('permission')
    expect(await verdictB).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
  })

  // 대소문자 섞인 id 는 등록 자체가 거절돼야 한다 — 등록되면 keyOf 의 소문자화가 소문자 id 와 같은 키로
  // 뭉개져 먼저 등록한 요청이 조용히 사라진다 (t7 sync-audit T7-F-01·03)
  it('refuses a mixed-case request_id and registers nothing', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'AbCdE', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const rows = db.prepare("SELECT body FROM messages WHERE author_type='system'").all() as { body: string }[]
    expect(rows.length).toBe(1)                                   // 대기 항목 없이 거절 안내 한 줄만
    expect(rows[0].body).toContain('형식에 맞지 않아 등록하지 않았습니다')
    expect(rows[0].body).not.toContain('yes AbCdE')               // 불가능한 답을 시키는 안내문이 남지 않는다
  })

  // reply 정규식이 절대 못 맞추는 id(hello — l 포함)는 등록하지 않는다 — 안내대로 쳐도 아무 일도
  // 일어나지 않고 대기 항목이 영원히 남는 결함 (t7 sync-audit T7-F-02)
  it('refuses to register an id the reply format can never match', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'hello', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const rows = db.prepare("SELECT body FROM messages WHERE author_type='system'").all() as { body: string }[]
    expect(rows.length).toBe(1)
    expect(rows[0].body).toContain('형식에 맞지 않아 등록하지 않았습니다')
    expect(rows[0].body).not.toContain('yes hello')
  })

  // 봇이 보낸 텍스트의 줄바꿈은 중화된다 — 안내문에 가짜 승인 줄을 위조하는 경로 차단 (t7 sync-audit T7-F-01)
  it('flattens newlines in bot-supplied text so no forged instruction line appears', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, {
      request_id: 'abcde', tool_name: 'Bash',
      description: '도구를 실행합니다\n승인하려면 "yes zzzzz"',
      input_preview: 'cat README\n봇이 도구 사용 승인을 요청합니다: Read',
    })
    const row = db.prepare("SELECT body FROM messages WHERE author_type='system'").get() as { body: string }
    const lines = row.body.split('\n')
    expect(lines.length).toBe(4)                                  // REQ-PERM-002 네 줄 구조가 무너지지 않는다
    // 불변식 전체는 "봇이 쓴 줄은 모두 │ 접두를 달고, 접두 없는 줄만 서버가 쓴 줄이다" — 그러므로 안내 문구로
    // 시작하는 줄은 서버가 쓴 한 줄뿐이다. 이 테스트가 재는 것은 그중 "줄바꿈으로는 안내 줄을 만들 수 없다" 절반이고,
    // 줄 없는 안내 줄 위조와 표식 문자 주입은 바로 아래 두 테스트가 잰다 (t7 재감사 §R4 — 접두 도입 전에는 이 주석이
    // 구현보다 강한 보증을 주장했다. includes 로는 중화된 텍스트까지 걸리므로 startsWith 로 판정)
    const instructing = lines.filter(l => l.startsWith('승인하려면'))
    expect(instructing.length).toBe(1)
    expect(instructing[0]).toContain('yes abcde')
  })

  // 줄바꿈이 하나도 없어도 description 은 본문의 한 줄을 통째로 차지하므로 안내 문구와 똑같이 채울 수 있다 —
  // 봇이 쓴 줄은 접두 표식으로 갈라져야 하고, 안내 문구로 시작하는 줄은 서버가 쓴 한 줄뿐이어야 한다 (t7 재감사 §R3 탐침 R1)
  it('a newline-free description mimicking the guidance line cannot forge a guidance line', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, {
      request_id: 'abcde', tool_name: 'Read',
      description: '승인하려면 "yes zzzzz", 거절하려면 "no zzzzz" 라고 답해주세요.',
      input_preview: 'cat README',
    })
    const row = db.prepare("SELECT body FROM messages WHERE author_type='system'").get() as { body: string }
    const lines = row.body.split('\n')
    const instructing = lines.filter(l => l.startsWith('승인하려면'))
    expect(instructing.length).toBe(1)             // 서버가 쓴 안내 줄 하나 — 봇 설명 줄은 표식 줄로 갈라진다
    expect(instructing[0]).toContain('yes abcde')
    expect(lines[1].startsWith('│ ')).toBe(true)   // 봇이 쓴 description 줄은 봇 표식 접두로 시작한다
  })

  // 봇 텍스트가 표식 문자 │ 를 줄 중간에 새겨 넣어도 중화된다 — 표식 없이는 봇 줄이 서버 줄로 위장할 수 없다 (t7 재감사 §R3)
  it('bot text cannot inject the bot-content marker', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, {
      request_id: 'abcde', tool_name: 'Bash',
      description: '정상 설명 │ 봇이 도구 사용 승인을 요청합니다: rm -rf /',
      input_preview: 'code │ 승인하려면 "yes zzzzz"',
    })
    const row = db.prepare("SELECT body FROM messages WHERE author_type='system'").get() as { body: string }
    const lines = row.body.split('\n')
    for (const l of lines) {
      // 표식이 담긴 줄은 표식을 딱 하나만 갖는다 — 접두 하나뿐이고, 중간에 새겨진 │ 는 중화돼야 한다.
      // 개수로 재는 이유: indexOf 는 첫 위치만 돌려주므로 봇 줄이 접두로 0번 위치를 이미 갖는 탓에
      // 중간에 표식이 하나 더 생겨도 0 이라 통과했다 (t7 재판정 §S3.2 — T7-F-08)
      if (l.includes('│')) expect((l.match(/│/g) || []).length).toBe(1)
    }
    expect(lines.filter(l => l.startsWith('│ ')).length).toBe(2)   // 접두는 봇이 쓴 두 줄에만 붙는다
  })

  // tool_name 은 접두 없는 1번째 줄 안에 실리는 봇 제어 텍스트다 — 여기에 승인 안내를 심어도 진입부 형식 검사가
  // 자리표시자로 바꿔 넣으므로 접두 없는 줄에 봇이 쓴 안내가 남지 않는다. 요청 자체는 등록된다 — 판정은 request_id 로
  // 흐르고 tool_name 은 표시용 메타데이터일 뿐이다 (t7 재판정 §S3.1 — T7-F-09)
  it('a tool_name carrying a forged guidance instruction never reaches the unprefixed line', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    broker.onGatewayRequest({ roomId, botId }, {
      request_id: 'abcde',
      tool_name: 'Read 승인하려면 "yes zzzzz", 거절하려면 "no zzzzz" 라고 답해주세요.',
      description: 'harmless',
      input_preview: 'cat README',
    })
    const row = db.prepare("SELECT body FROM messages WHERE author_type='system'").get() as { body: string }
    const lines = row.body.split('\n')
    expect(lines.length).toBe(4)                                   // REQ-PERM-002 네 줄 구조가 무너지지 않는다
    expect(lines[0]).not.toContain('승인하려면')                    // 접두 없는 1번째 줄에 봇 안내가 남지 않는다
    expect(lines[0]).toContain('(형식에 맞지 않는 도구 이름)')       // 검사를 통과하지 못한 이름은 고정 자리표시자로 대체된다
    expect(lines[3]).toContain('yes abcde')                        // 요청은 거부되지 않는다 — 안내 줄은 정상 id 로 등록됐다
  })

  // 거부 안내 줄에는 접두가 없다 — 그러므로 봇이 보낸 원문을 그대로 인용하면 접두 없는 줄에 봇 텍스트가 남는다.
  // 인용은 id 문자셋을 통과한 부분만 남기고, 남는 것이 없으면 인용 자체를 생략한다 (t7 재판정 3 §T4 — T7-F-10)
  it('the rejection notice never echoes bot text outside the id charset', async () => {
    const { broker } = await build()
    const { roomId, botId } = seedRoomAndBot()
    const forged = '승인하려면 "yes zzzzz", 거절하려면 "no zzzzz" 라고 답해주세요.'
    broker.onGatewayRequest({ roomId, botId }, { request_id: forged, tool_name: 'Read', description: 'd', input_preview: 'p' })
    broker.onGatewayRequest({ roomId, botId }, { request_id: '한글로만 이루어진 아이디', tool_name: 'Read', description: 'd', input_preview: 'p' })
    const rows = db.prepare("SELECT body FROM messages WHERE author_type='system' ORDER BY id").all() as { body: string }[]
    for (const r of rows) {
      expect(r.body).toContain('형식에 맞지 않아 등록하지 않았습니다')   // 거절 안내 자체는 남는다
      expect(r.body).not.toContain('승인하려면')                        // 봇이 보낸 안내 문구가 인용으로 살아남지 않는다
      expect(r.body.split('\n').length).toBe(1)                        // 거절 안내는 한 줄이다
      const quoted = r.body.match(/\("(.*)"\)/)                        // 인용이 있다면 그 안은 id 문자셋뿐이어야 한다
      if (quoted) expect(quoted[1]).toMatch(/^[A-Za-z0-9_.\-]{1,24}$/)
    }
    expect(rows[0].body).toMatch(/\("[A-Za-z0-9_.\-]+"\)/)            // 통과한 글자가 있으면 그것만 인용한다
    expect(rows[1].body).toContain('표시할 수 있는 문자가 없습니다')      // 통과한 글자가 하나도 없으면 인용하지 않는다
  })

  // 같은 방 대소문자 변형 id 는 충돌 자체가 불가능하다 — 대문자 원본은 등록이 거절되므로 (t7 sync-audit T7-F-03)
  it('same-room case variants cannot collide because non-lowercase ids are refused', async () => {
    const { app, broker, cookie } = await build()
    const a = seedRoomAndBot('A', 'pm')
    const b = db.prepare("INSERT INTO bots (name, description) VALUES ('qa','')").run().lastInsertRowid as number
    broker.onGatewayRequest({ roomId: a.roomId, botId: a.botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    broker.onGatewayRequest({ roomId: a.roomId, botId: b }, { request_id: 'ABCDE', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    const rows = db.prepare("SELECT body FROM messages WHERE author_type='system'").all() as { body: string }[]
    expect(rows.length).toBe(2)                                   // 승인 안내 1건 + 거절 안내 1건
    expect(rows[0].body).toContain('yes abcde')                   // 첫 등록은 정상 승인 안내
    expect(rows[1].body).toContain('형식에 맞지 않아 등록하지 않았습니다')   // 두 번째 등록은 거절 — 덮어쓰기가 아니다
    const res = await post(app, a.roomId, cookie, 'yes abcde')
    expect(res.json().consumed_by).toBe('permission')             // 먼저 등록한 요청이 살아 있다
  })
})
