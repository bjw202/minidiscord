// 방·봇 HTTP 표면 — v2 A 단계 (SPEC-BOTMODEL-001 §3.2). 봇 등록이 토큰을 내고(한 번만), 참여 라우트 셋(/bots)이
// 초대 라우트 셋(/invites)을 대신한다. 방 보관은 closeRoom 훅만 부른다 — 철회할 토큰이 없다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { openDb, type Db } from '../src/db.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerRoomRoutes } from '../src/routes-rooms.js'
import { registerBotRoutes } from '../src/routes-bots.js'
import type { Gateway } from '../src/gateway.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 'test.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// light-my-request 는 set-cookie 값을 배열이 아니라 문자열 하나로 돌려준다 —
// 원본 테스트가 가정한 첫 값 형태로 정규화 (SPEC-AUTH-001 과 같은 적응)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

// 로그인까지 마친 { app, cookie } 를 돌려준다. online 판정은 게이트웨이 스텁으로 가짜 접속을 건다 —
// 이 파일은 소켓을 열지 않는다 (실제 접속의 online 은 gateway.test.ts AC-018 이 잰다)
async function build(opts?: { onArchive?: (roomId: number) => void; online?: Set<number> }) {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  registerAuthRoutes(app, db)
  registerRoomRoutes(app, opts?.onArchive ? { onArchive: opts.onArchive } : undefined)
  registerBotRoutes(app)
  if (opts?.online) {
    const online = opts.online
    app.decorate('gateway', { isOnline: (botId: number) => online.has(botId) } as unknown as Gateway)
  }
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice' } })
  const cookie0 = setCookieOf(login).split(';')[0]
  return { app, cookie: cookie0 }
}

async function makeRoom(app: any, cookie: string, name = 'A'): Promise<{ id: number }> {
  return (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name } })).json()
}
async function makeBot(app: any, cookie: string, name = 'pm'): Promise<{ id: number; name: string; token: string; command: string }> {
  return (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name, description: '' } })).json()
}

describe('rooms', () => {
  it('creates and lists rooms', async () => {
    const { app, cookie } = await build()
    const create = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: '프로젝트A' } })
    expect(create.statusCode).toBe(201)
    expect(create.json().status).toBe('active')
    expect(Object.keys(create.json()).sort()).toEqual(['archived_at', 'created_at', 'id', 'name', 'status'])
    const list = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
    expect(list.json().active).toHaveLength(1)
    expect(list.json().archived).toHaveLength(0)
  })

  it('archives a room and moves it to archived list', async () => {
    const { app, cookie } = await build()
    const room = await makeRoom(app, cookie, '옛 프로젝트')
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
    expect(list.json().active).toHaveLength(0)
    expect(list.json().archived[0].id).toBe(room.id)
    expect(list.json().archived[0].archived_at).toBeTruthy()
  })

  it('requires auth', async () => {
    const { app } = await build()
    const res = await app.inject({ method: 'GET', url: '/api/rooms' })
    expect(res.statusCode).toBe(401)
  })

  it('rejects a blank room name', async () => {
    const { app, cookie } = await build()
    const res = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: '   ' } })
    expect(res.statusCode).toBe(400)
  })

  it('archiving distinguishes a missing room (404) from an archived one (409)', async () => {
    const { app, cookie } = await build()
    const room = await makeRoom(app, cookie)
    await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    const again = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    expect(again.statusCode).toBe(409)
    const missing = await app.inject({ method: 'POST', url: '/api/rooms/9999/archive', headers: { cookie } })
    expect(missing.statusCode).toBe(404)
    const notANumber = await app.inject({ method: 'POST', url: '/api/rooms/abc/archive', headers: { cookie } })
    expect(notANumber.statusCode).toBe(404)
    expect(again.json().error).not.toBe(missing.json().error)
  })

  // AC-BOTMODEL-013 (뒷절) — 방을 보관하면 closeRoom 훅이 1회 불리고 어떤 토큰 철회 UPDATE 도 실행되지 않는다 (REQ-BOTMODEL-010)
  it('AC-013: archiving calls the closeRoom hook once and revokes nothing — the bot token and its participations stay', async () => {
    const calls: number[] = []
    const { app, cookie } = await build({ onArchive: id => calls.push(id) })
    const room = await makeRoom(app, cookie)
    const other = await makeRoom(app, cookie, 'B')
    const bot = await makeBot(app, cookie)
    for (const r of [room, other]) await app.inject({ method: 'POST', url: `/api/rooms/${r.id}/bots`, headers: { cookie }, payload: { bot_id: bot.id } })
    const before = db.prepare('SELECT token FROM bots WHERE id=?').get(bot.id) as { token: string }

    const res = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(calls).toEqual([room.id])
    // 철회할 토큰이 없다 — 봇 토큰은 그대로이고 두 방의 참여 행도 그대로다
    expect((db.prepare('SELECT token FROM bots WHERE id=?').get(bot.id) as { token: string }).token).toBe(before.token)
    expect((db.prepare('SELECT COUNT(*) c FROM room_bots WHERE bot_id=?').get(bot.id) as { c: number }).c).toBe(2)
    // 실패 경로에서는 훅이 불리지 않는다
    await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    await app.inject({ method: 'POST', url: '/api/rooms/9999/archive', headers: { cookie } })
    expect(calls).toEqual([room.id])
  })

  it('every room and bot route requires a session', async () => {
    const { app } = await build()
    const calls: Array<[string, string]> = [
      ['GET', '/api/rooms'],
      ['POST', '/api/rooms'],
      ['POST', '/api/rooms/1/archive'],
      ['GET', '/api/bots'],
      ['POST', '/api/bots'],
      ['POST', '/api/rooms/1/bots'],
      ['GET', '/api/rooms/1/bots'],
      ['DELETE', '/api/rooms/1/bots/1'],
    ]
    for (const [method, url] of calls) {
      const res = await app.inject({ method: method as any, url, payload: {} })
      expect(res.statusCode, `${method} ${url}`).toBe(401)
    }
  })
})

describe('bots', () => {
  // AC-BOTMODEL-011 — POST /api/bots 응답 네 키, 토큰은 이 응답에 한 번만 (REQ-BOTMODEL-004·005)
  it('AC-011: registration answers 201 {id, name, token, command}; the token matches bots.token and never shows again', async () => {
    const { config } = await import('../src/config.js')
    const { app, cookie } = await build()
    const create = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'b1', description: '', role: 'worker' } })
    expect(create.statusCode).toBe(201)
    const body = create.json()
    expect(Object.keys(body).sort()).toEqual(['command', 'id', 'name', 'token'])
    expect(body.name).toBe('b1')
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
    const row = db.prepare('SELECT token, role FROM bots WHERE id=?').get(body.id) as { token: string; role: string }
    expect(row.token).toBe(body.token)
    expect(row.role).toBe('worker')
    // command 는 inviteCommand 문안 그대로이고 주소의 host 가 config.host 를 반영한다
    expect(body.command).toContain(`export MINIDISCORD_TOKEN=${body.token}`)
    expect(body.command).toContain(`export MINIDISCORD_SERVER=ws://${config.host}:${config.port}/bot`)
    expect(body.command).toContain('--dangerously-load-development-channels')
    expect(body.command).toContain('claude mcp add --scope user minidiscord-channel')
    // 같은 이름으로 다시 부르면 409
    const dup = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'b1' } })
    expect(dup.statusCode).toBe(409)
    // 두 번째 조회의 어떤 응답에도 token 이 실리지 않는다
    const list = await app.inject({ method: 'GET', url: '/api/bots', headers: { cookie } })
    expect(list.json()).toEqual([{ id: body.id, name: 'b1', description: '' }])
    expect(list.body).not.toContain(body.token)
  })

  it('stores the role when given and defaults it to worker; rejects blank names', async () => {
    const { app, cookie } = await build()
    const orch = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'lead', role: 'orchestrator' } })).json()
    expect((db.prepare('SELECT role FROM bots WHERE id=?').get(orch.id) as { role: string }).role).toBe('orchestrator')
    const plain = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()
    expect((db.prepare('SELECT role FROM bots WHERE id=?').get(plain.id) as { role: string }).role).toBe('worker')
    expect(plain.token).not.toBe(orch.token)   // 봇마다 토큰이 다르다
    const blank = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: '  ' } })
    expect(blank.statusCode).toBe(400)
  })

  // v2 B — role 은 orchestrator|worker 둘뿐. 그 밖의 값은 400 이고 행을 남기지 않는다 (가이드 §3 routes-bots.ts)
  it('B: rejects a role outside orchestrator|worker with 400 and stores no row', async () => {
    const { app, cookie } = await build()
    const bad = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'x', role: 'admin' } })
    expect(bad.statusCode).toBe(400)
    expect(db.prepare("SELECT COUNT(*) c FROM bots WHERE name='x'").get()).toEqual({ c: 0 })
  })

  it('registers and lists bots', async () => {
    const { app, cookie } = await build()
    const create = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: '코드리뷰어', description: '리뷰 전문' } })
    expect(create.statusCode).toBe(201)
    const list = await app.inject({ method: 'GET', url: '/api/bots', headers: { cookie } })
    expect(list.json()).toEqual([{ id: create.json().id, name: '코드리뷰어', description: '리뷰 전문' }])
  })
})

describe('participation', () => {
  // AC-BOTMODEL-012 — 참여 라우트 셋, 멱등 (REQ-BOTMODEL-006·007·008)
  it('AC-012: POST is idempotent, GET lists {bot_id, bot_name, online:boolean}, DELETE removes only that room row', async () => {
    const { app, cookie } = await build()
    const r1 = await makeRoom(app, cookie, 'R1')
    const r2 = await makeRoom(app, cookie, 'R2')
    const bot = await makeBot(app, cookie)

    const first = await app.inject({ method: 'POST', url: `/api/rooms/${r1.id}/bots`, headers: { cookie }, payload: { bot_id: bot.id } })
    const second = await app.inject({ method: 'POST', url: `/api/rooms/${r1.id}/bots`, headers: { cookie }, payload: { bot_id: bot.id } })
    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(first.statusCode)
    expect(second.json()).toEqual(first.json())
    expect((db.prepare('SELECT COUNT(*) c FROM room_bots WHERE room_id=? AND bot_id=?').get(r1.id, bot.id) as { c: number }).c).toBe(1)
    await app.inject({ method: 'POST', url: `/api/rooms/${r2.id}/bots`, headers: { cookie }, payload: { bot_id: bot.id } })

    const list = (await app.inject({ method: 'GET', url: `/api/rooms/${r1.id}/bots`, headers: { cookie } })).json()
    expect(list).toEqual([{ bot_id: bot.id, bot_name: 'pm', online: false }])
    expect(typeof list[0].online).toBe('boolean')   // 정수 0 이 아니다

    const del = await app.inject({ method: 'DELETE', url: `/api/rooms/${r1.id}/bots/${bot.id}`, headers: { cookie } })
    expect(del.statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: `/api/rooms/${r1.id}/bots`, headers: { cookie } })).json()).toEqual([])
    // 다른 방의 같은 봇 참여는 남는다
    expect((await app.inject({ method: 'GET', url: `/api/rooms/${r2.id}/bots`, headers: { cookie } })).json()).toEqual([{ bot_id: bot.id, bot_name: 'pm', online: false }])
    // DELETE 도 멱등이다
    expect((await app.inject({ method: 'DELETE', url: `/api/rooms/${r1.id}/bots/${bot.id}`, headers: { cookie } })).statusCode).toBe(200)
  })

  it('online follows the gateway per bot, and is a real boolean true', async () => {
    const online = new Set<number>()
    const { app, cookie } = await build({ online })
    const r1 = await makeRoom(app, cookie, 'R1')
    const r2 = await makeRoom(app, cookie, 'R2')
    const bot = await makeBot(app, cookie)
    for (const r of [r1, r2]) await app.inject({ method: 'POST', url: `/api/rooms/${r.id}/bots`, headers: { cookie }, payload: { bot_id: bot.id } })
    online.add(bot.id)
    for (const r of [r1, r2]) {
      const list = (await app.inject({ method: 'GET', url: `/api/rooms/${r.id}/bots`, headers: { cookie } })).json()
      expect(list).toEqual([{ bot_id: bot.id, bot_name: 'pm', online: true }])
    }
  })

  it('participation failures distinguish missing room, archived room and missing bot', async () => {
    const { app, cookie } = await build()
    const room = await makeRoom(app, cookie)
    const bot = await makeBot(app, cookie)
    const missingRoom = await app.inject({ method: 'POST', url: '/api/rooms/9999/bots', headers: { cookie }, payload: { bot_id: bot.id } })
    expect(missingRoom.statusCode).toBe(404)
    const missingBot = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/bots`, headers: { cookie }, payload: { bot_id: 9999 } })
    expect(missingBot.statusCode).toBe(404)
    expect(missingRoom.json().error).not.toBe(missingBot.json().error)
    await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    const archived = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/bots`, headers: { cookie }, payload: { bot_id: bot.id } })
    expect(archived.statusCode).toBe(409)
    expect((db.prepare('SELECT COUNT(*) c FROM room_bots').get() as { c: number }).c).toBe(0)
  })

  // AC-BOTMODEL-013 (앞절) — /invites 라우트 셋이 없다 (REQ-BOTMODEL-009)
  it('AC-013: the three /invites routes are gone — 404 each', async () => {
    const { app, cookie } = await build()
    const room = await makeRoom(app, cookie)
    const bot = await makeBot(app, cookie)
    const post = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
    const get = await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie } })
    const del = await app.inject({ method: 'DELETE', url: `/api/rooms/${room.id}/invites/${bot.id}`, headers: { cookie } })
    expect([post.statusCode, get.statusCode, del.statusCode]).toEqual([404, 404, 404])
    // 대조군: 같은 서버에서 참여 라우트는 산다 — «라우트 전부 404» 를 배제한다
    expect((await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/bots`, headers: { cookie } })).statusCode).toBe(200)
  })
})

it('buildServer registers room and bot routes behind requireAuth', async () => {
  process.env.MINIDISCORD_DATA_DIR = mkdtempSync(join(tmpdir(), 'md-buildserver-rooms-'))
  const { buildServer } = await import('../src/index.js')
  const app = await buildServer()
  await app.ready()

  const guarded = await app.inject({ method: 'GET', url: '/api/rooms' })
  expect(guarded.statusCode).toBe(401)

  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice' } })
  const cookie = setCookieOf(login).split(';')[0]

  const rooms = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
  expect(rooms.statusCode).toBe(200)
  const bots = await app.inject({ method: 'GET', url: '/api/bots', headers: { cookie } })
  expect(bots.statusCode).toBe(200)

  await app.close()
})
