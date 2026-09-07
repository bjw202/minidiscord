// SPEC-WEBRICH-001 계약 합치 검사 (골격 A, node 환경) — AC-WEBRICH-001·002·003·004.
// UI 가 만든 페이로드를 실제 Fastify·실제 WebSocket 게이트웨이에 그대로 먹여
// 의도한 결과가 나는지 본다. 하네스(build·setCookieOf·seedRoomAndBot·wsConnect)는
// permissions.test.ts 와 동일한 형태로 옮겨 왔다 (acceptance.md 공통 골격 A).
// v2 A 단계 (SPEC-BOTMODEL-001): 접속은 맨몸 hello{token}, 권한 요청 프레임은 room_id 를 싣고,
// AC-004 의 «초대 명령» 은 «봇 등록 명령» 이 됐다 — 토큰은 봇 하나에 하나다.
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
import { registerBotRoutes } from '../src/routes-bots.js'
import {
  permissionRequestId, permissionResolutionId, verdictForm, applyInviteResult,
} from '../../web/rich.js'

let dir: string
let db: Db

const cleanups: (() => Promise<void> | void)[] = []

function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'md-')); db = openDb(join(dir, 't.db')) })
afterEach(async () => {
  for (const c of cleanups.splice(0).reverse()) await c()
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
    reply.hijack()
    hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
  registerMessageRoutes(app)
  registerBotRoutes(app)   // 봇 등록·참여 라우트 — AC-004 가 실제 POST /api/bots 를 지나야 한다
  const broker = createPermissionBroker(app)
  app.decorate('permissions', broker)
  gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice' } })
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  cleanups.push(async () => { await app.close() })
  return { app, broker, gateway, port, cookie: setCookieOf(login).split(';')[0] }
}

// (방, 봇, 봇 토큰) 한 벌 — v2: 토큰은 bots 행에 하나, 참여는 room_bots 행 (SPEC-BOTMODEL-001 §3.1)
function seedRoomAndBot(roomName = 'A', botName = 'pm') {
  const roomId = db.prepare('INSERT INTO rooms (name) VALUES (?)').run(roomName).lastInsertRowid as number
  const token = randomBytes(32).toString('hex')
  const botId = db.prepare("INSERT INTO bots (name, description, token) VALUES (?, '', ?)").run(botName, token).lastInsertRowid as number
  db.prepare('INSERT OR IGNORE INTO room_bots (room_id, bot_id) VALUES (?, ?)').run(roomId, botId)
  return { roomId, botId, token }
}

// 맨몸 hello{token} → 맨몸 welcome 으로 해소된다 (v2 A 단계)
function wsConnect(port: number, token: string): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    cleanups.push(() => { ws.close() })
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    const onWelcome = (d: unknown) => {
      let m: any
      try { m = JSON.parse(String(d)) } catch { return }
      if (m.type === 'welcome') { ws.off('message', onWelcome); resolve({ ws, welcome: m }) }
    }
    ws.on('message', onWelcome)
    ws.on('error', reject)
    ws.on('close', () => reject(new Error('harness: welcome 전에 닫혔다')))
  })
}

// 조건이 참이 될 때까지 잠깐씩 기다린다. 브로커 저장은 ws 프레임보다 늦게 보일 수 있다.
async function waitFor(cond: () => boolean, ms = 1500): Promise<void> {
  const start = Date.now()
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('조건이 시간 안에 성립하지 않았다')
    await new Promise(r => setTimeout(r, 10))
  }
}

// 방에 저장된 가장 최근 system 메시지 본문. 없으면 null.
function lastSystemBody(): string | null {
  const row = db.prepare("SELECT body FROM messages WHERE author_type='system' ORDER BY id DESC LIMIT 1").get() as { body: string } | undefined
  return row ? row.body : null
}

// 봇을 접속시키고 승인 요청을 하나 띄운 뒤, 방에 실제로 저장된 요청 system 메시지 본문을 돌려준다.
// 손으로 타이핑한 문자열이 아니라 브로커가 만든 실물이 입력이다 (plan.md §H 3). 방은 프레임의 room_id 다.
async function raisePermissionRequest(ws: WebSocket, roomId: number, params: Record<string, string>): Promise<string> {
  ws.send(JSON.stringify({ type: 'permission_request', room_id: roomId, ...params }))
  await waitFor(() => {
    const b = lastSystemBody()
    return b !== null && b.includes(params.request_id)
  })
  const body = lastSystemBody()
  if (body === null) throw new Error('요청 system 메시지가 저장되지 않았다')
  return body
}

// 봇이 받은 다음 프레임을 원시 문자열로 돌려준다 — 호출처에서 JSON.parse 한다 (acceptance.md 골격 A 형태).
// 오지 않으면 vitest 타임아웃으로 실패한다 — 그것이 이 검사의 의도다.
function nextBotFrame(ws: WebSocket): Promise<string> {
  return new Promise(resolve => {
    const on = (d: unknown) => {
      ws.off('message', on)
      resolve(String(d))
    }
    ws.on('message', on)
  })
}

// JSON POST — 봇 등록·참여 추가는 multipart 가 아니라 JSON 본문이다 (routes-bots.ts).
async function postJson(port: number, ck: string, url: string, body: unknown) {
  return fetch(`http://127.0.0.1:${port}${url}`, {
    method: 'POST', headers: { cookie: ck, 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
}

// 골격 B(web-rich.test.ts)의 REQUEST_BODY·RESOLVED_BODY·FAILED_BODY 상수는 이 it 의
// 출력에서 왔다 — 손으로 발명하지 않고 브로커 실물을 옮겨 적었다.
it('dumps the real broker bodies shared with skeleton B', async () => {
  const c = await build()
  const { roomId, token } = seedRoomAndBot()
  const { ws } = await wsConnect(c.port, token)

  const polluted = await raisePermissionRequest(ws, roomId, {
    request_id: 'nmjkh', tool_name: 'Bash',
    description: 'command 를 실행합니다', input_preview: 'git commit --amend --no-edit',
  })
  expect(polluted).toContain('nmjkh')

  const allow = await fetch(`http://127.0.0.1:${c.port}/api/rooms/${roomId}/messages`, {
    method: 'POST', headers: { cookie: c.cookie }, body: verdictForm('nmjkh', 'allow'),
  })
  expect(allow.status).toBe(200)
  await waitFor(() => {
    const b = lastSystemBody()
    return b !== null && b.includes('nmjkh') && b.includes('전송됨')
  })
  const resolvedBody = lastSystemBody()

  // 봇이 접속해 있지 않은 두 번째 방에서 실패(⚠️) 결과 본문을 뽑는다 — ws 경유가 아니라 브로커 직접
  const off = seedRoomAndBot('B', 'qa')
  c.broker.onGatewayRequest({ roomId: off.roomId, botId: off.botId }, { request_id: 'zxvbn', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  await waitFor(() => {
    const b = lastSystemBody()
    return b !== null && b.includes('zxvbn')
  })
  await fetch(`http://127.0.0.1:${c.port}/api/rooms/${off.roomId}/messages`, {
    method: 'POST', headers: { cookie: c.cookie }, body: verdictForm('zxvbn', 'deny'),
  })
  const failedBody = lastSystemBody()

  console.log('WEBSHARED_REQUEST_BODY=' + JSON.stringify(polluted))
  console.log('WEBSHARED_RESOLVED_BODY=' + JSON.stringify(resolvedBody))
  console.log('WEBSHARED_FAILED_BODY=' + JSON.stringify(failedBody))
})

describe('AC-WEBRICH-001..004 permission & registration contract', () => {
  it('AC-001 delivers an approve verdict to the bot with the exact request_id', async () => {
    const c = await build()
    const { roomId, token } = seedRoomAndBot()
    const { ws } = await wsConnect(c.port, token)
    const body = await raisePermissionRequest(ws, roomId, {
      request_id: 'qwerz', tool_name: 'Bash',
      description: '명령을 실행합니다', input_preview: 'ls -al',
    })

    const rid = permissionRequestId(body)
    expect(rid).toBe('qwerz')

    const frameSeen = nextBotFrame(ws)
    const res = await fetch(`http://127.0.0.1:${c.port}/api/rooms/${roomId}/messages`, {
      method: 'POST', headers: { cookie: c.cookie }, body: verdictForm(rid!, 'allow'),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, consumed_by: 'permission' })

    const frame = JSON.parse(String(await frameSeen))
    expect(frame).toMatchObject({ type: 'permission_verdict', request_id: 'qwerz', behavior: 'allow' })

    const rows = db.prepare("SELECT body FROM messages WHERE author_type='user'").all()
    expect(rows).toEqual([])
  })

  it('AC-002 delivers a deny verdict', async () => {
    const c = await build()
    const { roomId, token } = seedRoomAndBot()
    const { ws } = await wsConnect(c.port, token)
    const body = await raisePermissionRequest(ws, roomId, {
      request_id: 'zxcvb', tool_name: 'Write', description: '파일을 씁니다', input_preview: '/tmp/x',
    })
    const frameSeen = nextBotFrame(ws)
    await fetch(`http://127.0.0.1:${c.port}/api/rooms/${roomId}/messages`, {
      method: 'POST', headers: { cookie: c.cookie }, body: verdictForm(permissionRequestId(body)!, 'deny'),
    })
    expect(JSON.parse(String(await frameSeen))).toMatchObject({ behavior: 'deny', request_id: 'zxcvb' })
  })

  it('AC-003 extracts the real request_id even when the preview contains lookalike runs', async () => {
    const c = await build()
    const { roomId, token } = seedRoomAndBot()
    const { ws } = await wsConnect(c.port, token)
    const body = await raisePermissionRequest(ws, roomId, {
      request_id: 'nmjkh', tool_name: 'Bash',
      description: 'command 를 실행합니다',
      input_preview: 'git commit --amend --no-edit',
    })
    expect(permissionRequestId(body)).toBe('nmjkh')

    const frameSeen = nextBotFrame(ws)
    await fetch(`http://127.0.0.1:${c.port}/api/rooms/${roomId}/messages`, {
      method: 'POST', headers: { cookie: c.cookie }, body: verdictForm('nmjkh', 'allow'),
    })
    expect(JSON.parse(String(await frameSeen))).toMatchObject({ request_id: 'nmjkh' })
  })

  // v2 — 화면에 뜨는 것은 초대 명령이 아니라 봇 등록 명령이다. 그 토큰 하나로 붙고, 참여를 더하면 그 방에서 online 이 된다.
  it('AC-004 shows a registration command whose token actually authenticates, and a participation makes it online in that room', async () => {
    const c = await build()
    const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number
    const res = await postJson(c.port, c.cookie, '/api/bots', { name: 'pm', description: '' })
    expect(res.status).toBe(201)
    const reg = await res.json() as { id: number; command: string }

    // UI 가 하는 일 그대로 — InviteNodes 는 구조적 형이므로 객체 리터럴로 충분하다 (node 환경)
    const commandEl = { textContent: '' }
    const resultEl = { hidden: true }
    applyInviteResult({ commandEl, resultEl }, reg)

    expect(resultEl.hidden).toBe(false)
    expect(commandEl.textContent).toBe(reg.command)

    // 화면 문자열에서 토큰을 되뽑아 그 토큰만으로 게이트웨이에 붙는다 — 맨몸 hello 로
    const token = /MINIDISCORD_TOKEN=([0-9a-f]{64})/.exec(commandEl.textContent!)![1]
    const { welcome } = await wsConnect(c.port, token)
    expect(welcome).toMatchObject({ type: 'welcome', bot_id: reg.id, bot_name: 'pm', rooms: [] })

    // 참여를 더하면 그 방의 목록에서 online 이다
    expect((await postJson(c.port, c.cookie, `/api/rooms/${roomId}/bots`, { bot_id: reg.id })).status).toBe(201)
    const list = await (await fetch(`http://127.0.0.1:${c.port}/api/rooms/${roomId}/bots`, { headers: { cookie: c.cookie } })).json() as { bot_id: number; online: boolean }[]
    expect(list).toEqual([{ bot_id: reg.id, bot_name: 'pm', online: true }])
  })
})
