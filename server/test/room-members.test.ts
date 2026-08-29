// SPEC-ROOMAUTHZ-001 M1+M2 — 스키마·이행(AC-ROOMAUTHZ-001..003)과 술어·멤버십 획득(AC-004..007)
// 공통 하네스(acceptance.md) 중 지금 기준들이 쓰는 부분만 둔다. registerEventRoute 는 M3 에서
// 만들어지므로 그때까지 이 파일은 그 임포트를 두지 않는다 — 모듈 부재 임포트 실패가 RED 를 흉내 내면 안 된다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerRoomRoutes } from '../src/routes-rooms.js'
import { registerMessageRoutes } from '../src/routes-messages.js'

let dir: string
let db: Db

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'md-authz-')); db = openDb(join(dir, 't.db')) })
afterEach(() => {
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

// light-my-request 는 set-cookie 를 배열이 아니라 문자열 하나로 돌려준다 (형제 SPEC 네 곳과 같은 헬퍼)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

async function signUp(app: any, username: string) {
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username, password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: 'pw123456' } })
  const id = (db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number }).id
  return { id, cookie: setCookieOf(login).split(';')[0] }
}

// M2 하네스 — 이 네 기준이 쓰는 라우트만 등록한다. 이벤트·봇 라우트는 M3 기준이 처음 쓰므로 그때 이어서.
// listen 을 하지 않는다 — AC-004..007 은 전부 app.inject 로 갈린다 (acceptance 하네스의 listen 은 스트림 기준 몫)
async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  await app.register(multipart)               // multipart 등록이 메시지 라우트 등록보다 앞서야 한다 (REQ-MSG-015)
  app.decorate('uploadsDir', join(dir, 'up'))
  const hub = createSseHub()
  app.decorate('hub', hub)
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  app.decorate('gateway', gateway)
  registerAuthRoutes(app, db)
  registerRoomRoutes(app)
  registerMessageRoutes(app)

  const alice = await signUp(app, 'alice')      // 방을 만드는 사람 → 멤버
  const mallory = await signUp(app, 'mallory')  // 계정만 있는 바깥 사람 → 비멤버
  return { app, alice, mallory }
}

// 방은 반드시 라우트로 만든다 — 직접 INSERT 하면 생성자조차 비멤버가 된다
async function createRoom(app: any, ck: string, name = 'A'): Promise<number> {
  const res = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name } })
  expect(res.statusCode).toBe(201)
  return res.json().id
}

function invite(app: any, ck: string, roomId: number, userId: number) {
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/members`, headers: { cookie: ck }, payload: { user_id: userId } })
}

function postMsg(app: any, ck: string, roomId: number, body: string) {
  const form = new FormData()
  form.append('body', body)
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie: ck }, payload: form })
}

function listMsg(app: any, ck: string, roomId: number) {
  return app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie: ck } })
}

function archiveRoom(app: any, ck: string, roomId: number) {
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/archive`, headers: { cookie: ck } })
}

function memberCount(roomId: number): number {
  return (db.prepare('SELECT COUNT(*) c FROM room_members WHERE room_id = ?').get(roomId) as { c: number }).c
}

describe('room membership schema and migration', () => {
  // AC-ROOMAUTHZ-001 — 스키마가 중복 멤버십을 표 차원에서 막는다
  it('schema carries room_members with a composite key and rooms.created_by', async () => {
    const cols = db.prepare('PRAGMA table_info(rooms)').all() as { name: string }[]
    expect(cols.map(c => c.name)).toContain('created_by')

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    expect(tables.map(t => t.name)).toEqual(expect.arrayContaining(['room_members', 'schema_migrations']))

    const u = db.prepare("INSERT INTO users (username, password_hash) VALUES ('u','x')").run().lastInsertRowid
    const r = db.prepare("INSERT INTO rooms (name) VALUES ('R')").run().lastInsertRowid
    db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(r, u)
    // 같은 짝을 두 번 넣으면 표가 거부한다 — 응용 코드의 조회-후-삽입에 기대지 않는다
    expect(() => db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(r, u)).toThrow()
    expect(memberCount(r as number)).toBe(1)
  })

  // AC-ROOMAUTHZ-002 — 이미 돌고 있던 DB 에도 컬럼이 생긴다
  it('adds created_by to an already-existing rooms table without losing rows', async () => {
    const p = join(dir, 'legacy.db')
    // 옛 모양을 손으로 만든다 — SCHEMA 상수를 쓰지 않는다
    const legacy = new (await import('better-sqlite3')).default(p)
    legacy.exec(`CREATE TABLE rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT (datetime('now')), archived_at TEXT);
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));`)
    legacy.prepare("INSERT INTO rooms (name) VALUES ('옛 방')").run()
    legacy.prepare("INSERT INTO users (username, password_hash) VALUES ('old','x')").run()
    legacy.close()

    const up = openDb(p)
    const cols = (up.prepare('PRAGMA table_info(rooms)').all() as { name: string }[]).map(c => c.name)
    expect(cols).toContain('created_by')
    // 기존 행이 살아 있고 새 컬럼은 NULL 이다 — 지어낸 값을 넣지 않는다
    const row = up.prepare('SELECT name, created_by FROM rooms').get() as { name: string; created_by: number | null }
    expect(row.name).toBe('옛 방')
    expect(row.created_by).toBeNull()
    up.close()
  })

  // AC-ROOMAUTHZ-003 — 백필은 한 번만 돌고, 두 번째부터는 아무것도 하지 않는다
  it('backfills every room x user exactly once and never resurrects removed rows', async () => {
    const p = join(dir, 'bf.db')
    const seed = openDb(p)                                     // 먼저 정상 스키마로 열어 둔다
    seed.prepare('DELETE FROM schema_migrations').run()         // 백필이 아직 안 돈 상태로 되돌린다
    seed.prepare('DELETE FROM room_members').run()
    seed.prepare("INSERT INTO rooms (name) VALUES ('A'), ('B')").run()
    seed.prepare("INSERT INTO users (username, password_hash) VALUES ('a','x'), ('b','x')").run()
    seed.close()

    const first = openDb(p)                                    // 1차 개방 — 백필이 돈다
    const all = (first.prepare('SELECT COUNT(*) c FROM room_members').get() as { c: number }).c
    expect(all).toBe(4)                                        // 방 2 × 사람 2
    expect((first.prepare("SELECT COUNT(*) c FROM schema_migrations WHERE name='roomauthz-001-backfill'")
      .get() as { c: number }).c).toBe(1)
    // 한 사람이 한 방을 떠났다고 가정한다
    first.prepare('DELETE FROM room_members WHERE room_id = 1 AND user_id = 2').run()
    first.close()

    const second = openDb(p)                                   // 2차 개방 — 아무것도 하지 않아야 한다
    expect((second.prepare('SELECT COUNT(*) c FROM room_members').get() as { c: number }).c).toBe(3)
    second.close()
  })
})

describe('room membership acquisition', () => {
  // AC-ROOMAUTHZ-004 시나리오 1 — 정상 경로: 방을 만든 사람이 그 자리에서 멤버가 된다
  it('records the creator and joins them in the same transaction', async () => {
    const { app, alice } = await build()
    const res = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'A' } })
    expect(res.statusCode).toBe(201)
    // 응답 봉투는 SPEC-ROOM-001 REQ-ROOM-003 그대로 다섯 키다 — created_by 를 더하지 않는다
    expect(Object.keys(res.json()).sort()).toEqual(['archived_at', 'created_at', 'id', 'name', 'status'])

    const roomId = res.json().id
    const row = db.prepare('SELECT created_by FROM rooms WHERE id = ?').get(roomId) as { created_by: number }
    expect(row.created_by).toBe(alice.id)
    expect(memberCount(roomId)).toBe(1)
    expect((db.prepare('SELECT user_id FROM room_members WHERE room_id = ?').get(roomId) as { user_id: number }).user_id)
      .toBe(alice.id)
  })

  // AC-ROOMAUTHZ-004 시나리오 2 — 멤버 삽입만 실패시켜(트리거) 방 행까지 되돌아가는가를 본다
  it('rolls the room back when the membership insert fails', async () => {
    const { app, alice } = await build()

    // 멤버 삽입만 실패시킨다 — 표를 지우지 않고 트리거로 막으므로 되돌리기가 쉽다
    db.exec(`CREATE TRIGGER roomauthz_block_member BEFORE INSERT ON room_members
             BEGIN SELECT RAISE(ABORT, 'blocked'); END;`)

    const before = (db.prepare('SELECT COUNT(*) c FROM rooms').get() as { c: number }).c
    const res = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: '깨질 방' } })
    expect(res.statusCode).not.toBe(201)                     // 생성이 성립하지 않았다
    // 본체 — 방 행도 남지 않았다. 두 문장으로 나눈 구현은 여기서 before + 1 이 되어 실패한다
    expect((db.prepare('SELECT COUNT(*) c FROM rooms').get() as { c: number }).c).toBe(before)

    // 대조군 — 방해를 치우면 같은 요청이 성립하고 두 행이 함께 생긴다.
    // 이것이 없으면 "방 생성을 아예 못 하는 구현"이 위 단언을 통과한다
    db.exec('DROP TRIGGER roomauthz_block_member')
    const ok = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: '정상 방' } })
    expect(ok.statusCode).toBe(201)
    expect((db.prepare('SELECT COUNT(*) c FROM rooms').get() as { c: number }).c).toBe(before + 1)
    expect(memberCount(ok.json().id)).toBe(1)
  })

  // AC-ROOMAUTHZ-005 — 초대 성공·재초대 멱등·없는 사용자·없는 방을 한 시나리오에서 가른다
  it('invites a user, is idempotent on repeat, and rejects an unknown user', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)

    const first = await invite(app, alice.cookie, roomId, mallory.id)
    expect(first.statusCode).toBe(201)
    expect(first.json()).toEqual({ ok: true })   // REQ-005 표의 성공 행 본문 (2차 감사 N-05)
    expect(memberCount(roomId)).toBe(2)

    const again = await invite(app, alice.cookie, roomId, mallory.id)
    expect(again.statusCode).toBe(200)
    expect(again.json()).toEqual({ ok: true, already: true })   // `already` 만이 아니라 봉투 전체를 잰다 (N-05)
    expect(memberCount(roomId)).toBe(2)          // 두 번째가 행을 늘리지 않는다

    const nobody = await invite(app, alice.cookie, roomId, 9999)
    expect(nobody.statusCode).toBe(400)
    expect(nobody.json()).toEqual({ error: '사용자를 찾을 수 없습니다' })   // REQ-005 표의 실패 행 본문 (3차 감사 N-09)
    expect(memberCount(roomId)).toBe(2)

    // 없는 방 — REQ-005 응답 표의 행 하나 (1차 감사 F-17 이 미측정으로 지적했다).
    // 없는 사용자(400)와 없는 방(404)이 서로 다른 코드임을 같은 시나리오에서 가른다
    const noRoom = await invite(app, alice.cookie, 999999, mallory.id)
    expect(noRoom.statusCode).toBe(404)
    expect(noRoom.json()).toEqual({ error: '방을 찾을 수 없습니다' })
  })

  // AC-ROOMAUTHZ-006 시나리오 1 — 비멤버의 초대는 거부되고, 멤버의 같은 요청은 성립한다 (부정+대조 짝)
  it('refuses an invitation from a non-member while a member can still invite', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)
    const outsider = await signUp(app, 'trudy')

    // 부정 사례 — mallory 가 자기 친구를 남의 방에 넣으려 한다
    const refused = await invite(app, mallory.cookie, roomId, outsider.id)
    expect(refused.statusCode).toBe(404)
    expect(refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })
    expect(memberCount(roomId)).toBe(1)

    // 대조군 — 멤버의 같은 요청은 성립한다. 모두를 거부하는 구현은 여기서 걸린다
    const allowed = await invite(app, alice.cookie, roomId, outsider.id)
    expect(allowed.statusCode).toBe(201)
    expect(memberCount(roomId)).toBe(2)
  })

  // AC-ROOMAUTHZ-006 시나리오 2 — 보관된 방은 비멤버에게 없는 방과 글자 그대로 같고, 멤버에게만 409 다 (순서 계약)
  it('hides an archived room from a non-member while showing 409 to a member', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie, '보관될 방')
    const outsider = await signUp(app, 'trudy')
    expect((await archiveRoom(app, alice.cookie, roomId)).statusCode).toBe(200)

    // 부정 사례 — 비멤버에게는 보관 여부가 보이지 않는다. 없는 방과 글자 그대로 같아야 한다
    const refused = await invite(app, mallory.cookie, roomId, outsider.id)
    const missing = await invite(app, mallory.cookie, 999999, outsider.id)
    expect(refused.statusCode).toBe(404)
    expect(`${refused.statusCode}|${refused.body}`).toBe(`${missing.statusCode}|${missing.body}`)

    // 대조군 — 멤버에게는 409 가 그대로 보인다. 보관 검사를 통째로 지운 구현은 여기서 걸린다
    const seen = await invite(app, alice.cookie, roomId, outsider.id)
    expect(seen.statusCode).toBe(409)
    expect(seen.json()).toEqual({ error: '보관된 방에는 초대할 수 없습니다' })
    expect(memberCount(roomId)).toBe(1)
  })

  // AC-ROOMAUTHZ-007 — 자율 참가 문은 없고, 거부된 요청이 멤버 행을 남기지 않는다
  it('offers no self-service join path and leaves no membership behind a refusal', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)

    // 자율 참가 라우트가 존재하지 않는다 (D1 기각안)
    const join = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/join`, headers: { cookie: mallory.cookie } })
    expect(join.statusCode).toBe(404)

    // 거부되는 요청들이 부작용으로 멤버를 만들지 않는다
    await postMsg(app, mallory.cookie, roomId, '들어가게 해줘')
    await listMsg(app, mallory.cookie, roomId)
    await invite(app, mallory.cookie, roomId, mallory.id)      // 자기 자신을 넣으려는 시도
    expect(memberCount(roomId)).toBe(1)

    // 대조군 — 정규 경로는 여전히 동작한다
    expect((await invite(app, alice.cookie, roomId, mallory.id)).statusCode).toBe(201)
    expect(memberCount(roomId)).toBe(2)
  })
})
