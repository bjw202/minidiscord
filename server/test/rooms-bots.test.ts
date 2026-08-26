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

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 'test.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// light-my-request 는 set-cookie 값을 배열이 아니라 문자열 하나로 돌려준다 —
// 원본 테스트가 가정한 첫 값 형태로 정규화 (SPEC-AUTH-001 과 같은 적응, 이탈은 §E.2 에 기록)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

// 이 SPEC 자신의 헬퍼 — 가입·로그인까지 마친 { app, cookie } 를 돌려준다 (SPEC-BOT-001 이 이어 쓴다)
async function build(opts?: { onArchive?: (roomId: number) => void }) {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  registerAuthRoutes(app, db)
  registerRoomRoutes(app, opts)
  registerBotRoutes(app)
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const cookie0 = setCookieOf(login).split(';')[0]
  return { app, cookie: cookie0 }
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
    const create = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: '옛 프로젝트' } })
    const id = create.json().id
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${id}/archive`, headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
    expect(list.json().active).toHaveLength(0)
    expect(list.json().archived[0].id).toBe(id)
  })

  it('calls onArchive hook when provided', async () => {
    const calls: number[] = []
    const { app, cookie } = await build({ onArchive: id => calls.push(id) })
    const create = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'x' } })
    await app.inject({ method: 'POST', url: `/api/rooms/${create.json().id}/archive`, headers: { cookie } })
    expect(calls).toEqual([create.json().id])
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

  it('archiving moves the room and stamps archived_at', async () => {
    const { app, cookie } = await build()
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
    expect(list.json().active).toHaveLength(0)
    expect(list.json().archived[0].id).toBe(room.id)
    expect(list.json().archived[0].archived_at).toBeTruthy()
    const after = db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room.id) as { c: number }
    expect(after.c).toBe(0)
  })

  it('archiving distinguishes a missing room (404) from an archived one (409)', async () => {
    const { app, cookie } = await build()
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
    await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })

    const again = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    expect(again.statusCode).toBe(409)

    const missing = await app.inject({ method: 'POST', url: '/api/rooms/9999/archive', headers: { cookie } })
    expect(missing.statusCode).toBe(404)

    const notANumber = await app.inject({ method: 'POST', url: '/api/rooms/abc/archive', headers: { cookie } })
    expect(notANumber.statusCode).toBe(404)

    expect(again.json().error).not.toBe(missing.json().error)
  })

  it('every room and bot route requires a session', async () => {
    const { app } = await build()
    const calls: Array<[string, string]> = [
      ['GET', '/api/rooms'],
      ['POST', '/api/rooms'],
      ['POST', '/api/rooms/1/archive'],
      ['GET', '/api/bots'],
      ['POST', '/api/bots'],
    ]
    for (const [method, url] of calls) {
      const res = await app.inject({ method: method as any, url, payload: {} })
      expect(res.statusCode, `${method} ${url}`).toBe(401)
    }
  })
})

describe('bots', () => {
  it('registers and lists bots', async () => {
    const { app, cookie } = await build()
    const create = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: '코드리뷰어', description: '리뷰 전문' } })
    expect(create.statusCode).toBe(201)
    const list = await app.inject({ method: 'GET', url: '/api/bots', headers: { cookie } })
    expect(list.json()).toEqual([{ id: create.json().id, name: '코드리뷰어', description: '리뷰 전문' }])
  })

  it('rejects duplicate and blank bot names', async () => {
    const { app, cookie } = await build()
    await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })
    const dup = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })
    expect(dup.statusCode).toBe(409)
    const blank = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: '  ' } })
    expect(blank.statusCode).toBe(400)
  })
})

it('buildServer registers room and bot routes behind requireAuth', async () => {
  process.env.MINIDISCORD_DATA_DIR = mkdtempSync(join(tmpdir(), 'md-buildserver-rooms-'))
  const { buildServer } = await import('../src/index.js')
  const app = await buildServer()
  await app.ready()

  const guarded = await app.inject({ method: 'GET', url: '/api/rooms' })
  expect(guarded.statusCode).toBe(401)

  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const cookie = setCookieOf(login).split(';')[0]

  const rooms = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
  expect(rooms.statusCode).toBe(200)
  const bots = await app.inject({ method: 'GET', url: '/api/bots', headers: { cookie } })
  expect(bots.statusCode).toBe(200)

  await app.close()
})
