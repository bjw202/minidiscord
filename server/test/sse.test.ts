import { describe, it, expect, afterEach } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSseHub } from '../src/sse.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerEventRoute } from '../src/routes-events.js'
import { openDb, type Db } from '../src/db.js'

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { for (const c of cleanups.splice(0)) await c() })

// light-my-request 는 set-cookie 를 배열이 아니라 문자열 하나로 돌려준다.
// 원본 plan-v2.md 의 headers['set-cookie']![0] 은 그 문자열의 첫 글자 'm' 을 집어내므로
// 그대로 쓰면 requireAuth 가 전부 401 을 낸다 — 이미 머지된 rooms-bots.test.ts:21-26 과 같은 정규화.
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

// 실제 HTTP 서버를 띄운다. SSE 는 응답이 끝나지 않으므로 app.inject 로 검증할 수 없다.
async function startServer() {
  const dir = mkdtempSync(join(tmpdir(), 'md-sse-'))
  const app = Fastify({ logger: false })
  app.db = openDb(join(dir, 't.db'))
  await app.register(cookie)
  registerAuthRoutes(app, app.db)
  const hub = createSseHub()
  app.decorate('hub', hub)
  // M4 (SPEC-ROOMAUTHZ-001): 이벤트 라우트 사본을 지우고 프로덕션과 같은 등록 함수 하나를 쓴다 (REQ-ROOMAUTHZ-010)
  registerEventRoute(app)
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'u', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'u', password: 'pw123456' } })
  const ck = setCookieOf(login).split(';')[0]
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  cleanups.push(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }) })
  return { app, hub, cookie: ck, port }
}

// M4 (SPEC-ROOMAUTHZ-001): 스트림 게이트는 실재하는 방과 멤버를 요구한다 — 임의의 1 대신
// 방을 만들고 로그인 사용자를 그 멤버로 넣은 뒤 그 번호로 스트림을 연다 (plan.md §D.3.1)
function memberRoom(app: { db: Db }, username = 'u', name = 'A'): number {
  const roomId = app.db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name).lastInsertRowid as number
  const u = app.db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number }
  app.db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, u.id)
  return roomId
}

// 이벤트 스트림을 연다. abort() 로 클라이언트 쪽 연결을 끊을 수 있다.
async function openStream(port: number, ck: string, roomId: number) {
  const ac = new AbortController()
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/events`,
    { headers: { cookie: ck }, signal: ac.signal })
  const reader = res.body!.getReader()
  cleanups.push(() => { ac.abort() })
  return { res, reader, abort: () => ac.abort() }
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

// 조건이 참이 될 때까지 기다린다. close 이벤트는 비동기라 고정 sleep 은 불안정하다.
async function waitFor(fn: () => boolean, ms = 2000): Promise<boolean> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (fn()) return true
    await new Promise(r => setTimeout(r, 10))
  }
  return false
}

describe('sse', () => {
  // AC-SSE-001 — 발행한 이벤트가 그 방 구독자에게 실제로 도달한다
  it('delivers a published event to the room subscriber', async () => {
    const { app, hub, cookie: ck, port } = await startServer()
    const roomId = memberRoom(app)
    const { reader } = await openStream(port, ck, roomId)
    expect(await readFrame(reader)).toContain('connected')

    hub.publish(roomId, 'message', { id: 7 })
    const frame = await readFrame(reader)
    expect(frame).toContain('event: message')
    expect(frame).toContain('"id":7')
  })

  // AC-SSE-002 — 구독 응답 헤더와 연결 확인 주석
  it('opens the stream with SSE headers and a connected comment', async () => {
    const { app, cookie: ck, port } = await startServer()
    const roomId = memberRoom(app)
    const { res, reader } = await openStream(port, ck, roomId)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(res.headers.get('cache-control')).toContain('no-cache')
    expect(res.headers.get('connection')).toContain('keep-alive')
    expect(await readFrame(reader)).toBe(': connected\n\n')
  })

  // AC-SSE-003 — 방 격리를 도착 순서로 관측한다
  it('never leaks another room event into this room stream', async () => {
    const { app, hub, cookie: ck, port } = await startServer()
    const roomId = memberRoom(app)
    const { reader } = await openStream(port, ck, roomId)
    expect(await readFrame(reader)).toContain('connected')

    hub.publish(2, 'message', { room: 2 })   // 이 방 구독자에게 오면 안 된다
    hub.publish(roomId, 'message', { room: 1 })   // 이것이 와야 한다

    const frame = await readFrame(reader)
    expect(frame).toBe('event: message\ndata: {"room":1}\n\n')
  })

  // AC-SSE-004 — 프레임 형식이 정확히 일치한다
  it('frames events exactly as event/data/blank-line', async () => {
    const { app, hub, cookie: ck, port } = await startServer()
    const roomId = memberRoom(app)
    const { reader } = await openStream(port, ck, roomId)
    await readFrame(reader)

    hub.publish(roomId, 'message', { id: 7 })
    expect(await readFrame(reader)).toBe('event: message\ndata: {"id":7}\n\n')

    hub.publish(roomId, 'bot_status', { bot_id: 3, state: 'working' })
    expect(await readFrame(reader)).toBe('event: bot_status\ndata: {"bot_id":3,"state":"working"}\n\n')
  })

  // AC-SSE-005 — 한 방의 구독자 여럿이 모두 받는다
  it('delivers to every subscriber of the room', async () => {
    const { app, hub, cookie: ck, port } = await startServer()
    const roomId = memberRoom(app)
    const a = await openStream(port, ck, roomId)
    const b = await openStream(port, ck, roomId)
    await readFrame(a.reader)
    await readFrame(b.reader)

    expect(await waitFor(() => hub.subscriberCount(roomId) === 2)).toBe(true)

    hub.publish(roomId, 'message', { id: 7 })
    expect(await readFrame(a.reader)).toBe('event: message\ndata: {"id":7}\n\n')
    expect(await readFrame(b.reader)).toBe('event: message\ndata: {"id":7}\n\n')
  })

  // AC-SSE-006 — 연결이 끊기면 구독자가 실제로 사라진다
  it('removes the subscriber when the connection closes', async () => {
    const { app, hub, cookie: ck, port } = await startServer()
    const roomId = memberRoom(app)
    const s = await openStream(port, ck, roomId)
    await readFrame(s.reader)

    // 구독 직후: 반드시 1 이어야 한다
    expect(await waitFor(() => hub.subscriberCount(roomId) === 1)).toBe(true)
    expect(hub.subscriberCount(roomId)).toBe(1)

    s.abort()   // 클라이언트가 연결을 끊는다

    // 끊긴 뒤: 반드시 0 이어야 한다
    expect(await waitFor(() => hub.subscriberCount(roomId) === 0)).toBe(true)
    expect(hub.subscriberCount(roomId)).toBe(0)
  })

  // AC-SSE-007 — 구독자 없는 방으로 발행해도 아무 일도 없다
  it('publishing to a room with no subscribers is a silent no-op', async () => {
    const { app, hub, cookie: ck, port } = await startServer()
    const roomId = memberRoom(app)

    // 구독자가 하나도 없는 상태에서 발행 — 던지지 않아야 한다
    expect(() => hub.publish(99, 'message', { id: 1 })).not.toThrow()
    expect(hub.subscriberCount(99)).toBe(0)

    // 같은 테스트 안에서 실제 전달까지 확인한다 — 빈 구현이 이 테스트를 통과하지 못하게 하는 장치다
    const { reader } = await openStream(port, ck, roomId)
    await readFrame(reader)
    hub.publish(99, 'message', { id: 2 })   // 여전히 구독자 없음
    hub.publish(roomId, 'message', { id: 3 })
    expect(await readFrame(reader)).toBe('event: message\ndata: {"id":3}\n\n')
    expect(hub.subscriberCount(99)).toBe(0)
  })

  // AC-SSE-008 — 인증 없이는 스트림이 열리지 않는다
  it('rejects an unauthenticated event-stream request', async () => {
    const { app, port } = await startServer()

    // inject 로 검증 가능한 유일한 경로 — requireAuth 가 즉시 끊으므로 응답이 끝난다
    const injected = await app.inject({ method: 'GET', url: '/api/rooms/1/events' })
    expect(injected.statusCode).toBe(401)
    expect(injected.headers['content-type'] ?? '').not.toContain('text/event-stream')

    // 실제 서버에서도 같은지 확인 (preHandler 가 실 소켓 경로에서도 도는지)
    const res = await fetch(`http://127.0.0.1:${port}/api/rooms/1/events`)
    expect(res.status).toBe(401)
    expect(res.headers.get('content-type') ?? '').not.toContain('text/event-stream')
    await res.body?.cancel()
  })

  // AC-SSE-009 — buildServer 배선이 실제로 살아 있다
  it('wires the hub and the events route into buildServer', async () => {
    // 데이터 디렉터리 격리 — buildServer() 는 config.dataDir 아래 진짜 디렉터리를 연다.
    // config.dataDir 은 게터로 지연 평가되므로(config.ts) import 이후에 환경변수를 설정해도 반영된다.
    const dataDir = mkdtempSync(join(tmpdir(), 'md-sse-wire-'))
    const prevDataDir = process.env.MINIDISCORD_DATA_DIR
    process.env.MINIDISCORD_DATA_DIR = dataDir
    cleanups.push(() => {
      if (prevDataDir === undefined) delete process.env.MINIDISCORD_DATA_DIR
      else process.env.MINIDISCORD_DATA_DIR = prevDataDir
      rmSync(dataDir, { recursive: true, force: true })
    })

    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    cleanups.push(async () => { await app.close() })

    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'w', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'w', password: 'pw123456' } })
    const ck = setCookieOf(login).split(';')[0]

    // M4 (SPEC-ROOMAUTHZ-001): 게이트가 실재하는 방과 멤버를 요구한다 — 실서버의 방 생성 라우트로
    // 만들면 생성자가 곧 멤버다. 임의의 1 을 쓰지 않는다 (plan.md §D.3.1)
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name: 'A' } })).json() as { id: number }

    await app.listen({ port: 0 })
    const port = (app.server.address() as { port: number }).port
    const { reader } = await openStream(port, ck, room.id)
    expect(await readFrame(reader)).toContain('connected')

    app.hub.publish(room.id, 'message', { id: 42 })
    expect(await readFrame(reader)).toBe('event: message\ndata: {"id":42}\n\n')
  })
})
