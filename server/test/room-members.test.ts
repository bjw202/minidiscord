// SPEC-ROOMAUTHZ-001 M1+M2+M3 — 스키마·이행(AC-ROOMAUTHZ-001..003), 술어·멤버십 획득(AC-004..007),
// 게이트 여덟 곳(AC-008..013, 017, 018). 공통 하네스(acceptance.md)의 나머지 절반 — listen·port·
// cleanups, 봇 라우트, registerEventRoute — 를 이 마일스톤에서 잇는다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs'
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
import { registerRoomRoutes } from '../src/routes-rooms.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { registerEventRoute } from '../src/routes-events.js'     // REQ-ROOMAUTHZ-010 — index.ts 와 같은 함수
import { registerBotRoutes } from '../src/routes-bots.js'
import { connectV2, innerOf, pubOf, ksrvHexOf } from './gateway-v2.js'

let dir: string
let db: Db
const cleanups: (() => Promise<void> | void)[] = []

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'md-authz-')); db = openDb(join(dir, 't.db')) })
afterEach(async () => {
  for (const c of cleanups.splice(0).reverse()) await c()   // 서버가 db 보다 먼저 닫혀야 한다
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

// buildServer() 로 조립한 앱은 모듈 수준 `db` 가 아니라 config.dataDir 아래 자기 DB 를 연다.
// 그래서 사용자 번호를 그 앱의 DB 에서 조회하는 판을 따로 둔다 (AC-ROOMAUTHZ-010 두 번째 시나리오)
async function signUpOn(app: any, username: string) {
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username, password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: 'pw123456' } })
  const id = (app.db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number }).id
  return { id, cookie: setCookieOf(login).split(';')[0] }
}

// 공통 하네스의 build — 봇 라우트·이벤트 라우트·브로커·listen 을 갖춘 완전형 (AC-008.. 이후 전부가 쓴다).
// 라우트 사본을 등록하지 않는다 — registerEventRoute 는 프로덕션과 같은 함수를 부른다 (REQ-ROOMAUTHZ-010)
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
  registerBotRoutes(app)                       // 봇 초대 라우트 셋 — D2 v2 로 게이트 범위에 들어왔다 (REQ-ROOMAUTHZ-017)
  registerEventRoute(app)                      // 사본이 아니라 프로덕션과 같은 함수
  registerMessageRoutes(app)
  const broker = createPermissionBroker(app)
  app.decorate('permissions', broker)
  gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))

  const alice = await signUp(app, 'alice')      // 방을 만드는 사람 → 멤버
  const mallory = await signUp(app, 'mallory')  // 계정만 있는 바깥 사람 → 비멤버

  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  cleanups.push(async () => { await app.close() })
  return { app, broker, gateway, hub, port, alice, mallory }
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

function listRooms(app: any, ck: string) {
  return app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie: ck } })
}

function archiveRoom(app: any, ck: string, roomId: number) {
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/archive`, headers: { cookie: ck } })
}

function memberCount(roomId: number): number {
  return (db.prepare('SELECT COUNT(*) c FROM room_members WHERE room_id = ?').get(roomId) as { c: number }).c
}

// 업로드 디렉터리의 파일 수. 디렉터리가 아직 없으면 0 — "없음"과 "비어 있음"을 같게 본다
function uploadCount(): number {
  const up = join(dir, 'up')
  return existsSync(up) ? readdirSync(up).length : 0
}

function targetCount(): number {
  return (db.prepare('SELECT COUNT(*) c FROM message_targets').get() as { c: number }).c
}

// 봇 초대 라우트 셋 (REQ-ROOMAUTHZ-017). 방은 라우트로 만든 뒤 번호를 넘긴다
function botInvite(app: any, ck: string, roomId: number, botId: number) {
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/invites`, headers: { cookie: ck }, payload: { bot_id: botId } })
}

function botInviteList(app: any, ck: string, roomId: number) {
  return app.inject({ method: 'GET', url: `/api/rooms/${roomId}/invites`, headers: { cookie: ck } })
}

function botInviteRevoke(app: any, ck: string, roomId: number, botId: number) {
  return app.inject({ method: 'DELETE', url: `/api/rooms/${roomId}/invites/${botId}`, headers: { cookie: ck } })
}

function activeTokenCount(roomId: number): number {
  return (db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id = ? AND revoked_at IS NULL')
    .get(roomId) as { c: number }).c
}

async function makeBot(app: any, ck: string, name = 'pm'): Promise<number> {
  const res = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: ck }, payload: { name } })
  expect(res.statusCode).toBe(201)
  return res.json().id
}

// (봇, 게이트웨이 토큰) 한 벌. 방은 라우트로 만든 뒤 이 함수에 번호를 넘긴다.
function seedBot(roomId: number, botName = 'pm') {
  const botId = db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(botName).lastInsertRowid as number
  const token = randomBytes(32).toString('hex')
  // v2 저장 계약 (SPEC-GWAUTH-002 §D-3) — 검증자와 확인 열쇠를 하니스 사본으로 유도해 저장한다
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')
    .run(roomId, botId, pubOf(token), ksrvHexOf(token))
  return { botId, token }
}

// v2 (SPEC-GWAUTH-002) — 접속은 challenge 대조와 auth 서명을 거친다 (gateway-v2.ts).
function wsConnect(port: number, token: string): Promise<WebSocket> {
  return connectV2(port, token).then(r => { cleanups.push(() => { r.ws.close() }); return r.ws })
}

// 프레임 하나를 기다린다. 오지 않으면 null — 부정 관측 도구다.
// 도착 원문은 봉투다 — innerOf 가 검증하고 풀어 내부 프레임만 관측 대상이 된다 (SPEC-GWAUTH-002).
function nextMessage(ws: WebSocket, ms = 1500): Promise<any | null> {
  return new Promise(resolve => {
    const t = setTimeout(() => { ws.off('message', on); resolve(null) }, ms)
    const on = (d: WebSocket.RawData) => {
      const inner = innerOf(ws, JSON.parse(String(d)))
      if (inner === null) return   // 봉투 아님·검증 실패 — 다음 프레임을 기다린다
      clearTimeout(t)
      ws.off('message', on)
      resolve(inner)
    }
    ws.on('message', on)
  })
}

// SSE 스트림을 연다. 게이트에 걸리면 res.status 가 404 이고 body 는 JSON 이다.
async function openStream(port: number, ck: string, roomId: number) {
  const ac = new AbortController()
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/events`,
    { headers: { cookie: ck }, signal: ac.signal })
  cleanups.push(() => { ac.abort() })
  return res
}

async function readFrame(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) throw new Error('스트림이 프레임 없이 닫혔다')
    buf += Buffer.from(value).toString()
    if (buf.endsWith('\n\n')) return buf
  }
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

describe('room membership gates', () => {
  // AC-ROOMAUTHZ-008 — 바깥 사람은 글을 쓸 수 없고, 멤버는 쓸 수 있다
  it('refuses a non-member send with no trace while a member send succeeds', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)

    // 파일까지 붙여 보낸다 — REQ-008 의 "디스크에 저장하지 않는다" 절반을 재려면 파일이 있어야 한다
    const sneaky = new FormData()
    sneaky.append('body', '몰래 보내기')
    sneaky.append('file', new Blob(['비밀 파일']), 'secret.txt')
    const refused = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`,
      headers: { cookie: mallory.cookie }, payload: sneaky })
    expect(refused.statusCode).toBe(404)
    expect(refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })
    // 어느 표에도 흔적이 없다 — 세 표 전부를 본다 (message_targets 가 초판에서 빠져 있었다)
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
    expect((db.prepare('SELECT COUNT(*) c FROM attachments').get() as { c: number }).c).toBe(0)
    expect(targetCount()).toBe(0)
    // 디스크에도 흔적이 없다 — multipart 소비 루프 뒤에 게이트를 둔 구현은 여기서 걸린다
    expect(uploadCount()).toBe(0)

    // 대조군 — 멤버의 같은 요청은 저장되고 파일이 실제로 남는다.
    // 이 줄이 없으면 "업로드를 아예 안 하는 구현"이 위 uploadCount 단언을 통과한다
    const ok = new FormData()
    ok.append('body', '정상 전송')
    ok.append('file', new Blob(['정상 파일']), 'ok.txt')
    const sent = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`,
      headers: { cookie: alice.cookie }, payload: ok })
    expect(sent.statusCode).toBe(200)
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(1)
    expect((db.prepare('SELECT COUNT(*) c FROM attachments').get() as { c: number }).c).toBe(1)
    expect(uploadCount()).toBe(1)
  })

  // AC-ROOMAUTHZ-009 — 바깥 사람은 읽을 수 없고, 빈 배열로도 알 수 없다
  it('answers a non-member read with 404, not an empty list, while a member reads it', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)
    await postMsg(app, alice.cookie, roomId, '비밀 이야기')

    const refused = await listMsg(app, mallory.cookie, roomId)
    expect(refused.statusCode).toBe(404)
    expect(refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })
    expect(refused.json().messages).toBeUndefined()      // 빈 배열도 아니다 (의도 표시용 — 아래 주 참조)

    // 대조군 — 멤버는 그 메시지를 본다
    const seen = await listMsg(app, alice.cookie, roomId)
    expect(seen.statusCode).toBe(200)
    expect(seen.json().messages.map((m: any) => m.body)).toEqual(['비밀 이야기'])
  })

  // AC-ROOMAUTHZ-010 시나리오 1 — 비멤버의 스트림은 hijack 앞에서 막히고, 멤버의 스트림은 열린다
  it('refuses a non-member event stream before hijack and opens it for a member', async () => {
    const { app, hub, port, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)

    const refused = await openStream(port, mallory.cookie, roomId)
    expect(refused.status).toBe(404)                        // hijack 뒤였다면 상태 코드가 오지 않는다
    expect(await refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })

    // 구독자가 생기지 않았다. 이 단언이 관측이고, 아래 publish 는 그 뒤의 정상 동작 확인일 뿐이다
    expect(hub.subscriberCount(roomId)).toBe(0)
    hub.publish(roomId, 'message', { id: 1 })

    // 대조군 — 멤버의 스트림은 열리고 이벤트가 도착한다
    const opened = await openStream(port, alice.cookie, roomId)
    expect(opened.status).toBe(200)
    const reader = opened.body!.getReader()
    expect(await readFrame(reader)).toContain('connected')
    hub.publish(roomId, 'message', { id: 42 })
    expect(await readFrame(reader)).toBe('event: message\ndata: {"id":42}\n\n')
  })

  // AC-ROOMAUTHZ-010 시나리오 2 — 프로덕션 배선(buildServer)에서도 비멤버는 막힌다.
  // 인라인 라우트를 남겨 둔 구현은 하네스 기준만으로는 초록이라, 이 판이 유일하게 잡는다
  it('refuses a non-member on the buildServer-assembled event route', async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'md-authz-wire-'))
    const prev = process.env.MINIDISCORD_DATA_DIR
    process.env.MINIDISCORD_DATA_DIR = dataDir
    cleanups.push(() => {
      if (prev === undefined) delete process.env.MINIDISCORD_DATA_DIR
      else process.env.MINIDISCORD_DATA_DIR = prev
      rmSync(dataDir, { recursive: true, force: true })
    })

    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()                       // 하네스가 아니라 프로덕션 조립이다
    cleanups.push(async () => { await app.close() })
    const a = await signUpOn(app, 'wire-alice')
    const m = await signUpOn(app, 'wire-mallory')
    await app.listen({ port: 0 })
    const port = (app.server.address() as { port: number }).port

    const roomId = await createRoom(app, a.cookie, '배선 확인용')

    // 부정 사례 — 프로덕션 배선에서도 비멤버는 막힌다
    const refused = await openStream(port, m.cookie, roomId)
    expect(refused.status).toBe(404)

    // 대조군 — 멤버는 열린다. 이것이 없으면 "이벤트 라우트를 아예 안 단 구현"이 통과한다
    const opened = await openStream(port, a.cookie, roomId)
    expect(opened.status).toBe(200)
    expect(await readFrame(opened.body!.getReader())).toContain('connected')
  })

  // AC-ROOMAUTHZ-011 — 방 목록은 내가 속한 방만 담는다
  it('narrows the room listing to the caller rooms and widens it on invitation', async () => {
    const { app, alice, mallory } = await build()
    const aRoom = await createRoom(app, alice.cookie, 'A의 방')
    const mRoom = await createRoom(app, mallory.cookie, 'M의 방')

    const aList = (await listRooms(app, alice.cookie)).json()
    // 봉투는 SPEC-ROOM-001 그대로 두 배열이다
    expect(Object.keys(aList).sort()).toEqual(['active', 'archived'])
    expect(aList.active.map((r: any) => r.id)).toEqual([aRoom])       // 남의 방은 없다

    const mList = (await listRooms(app, mallory.cookie)).json()
    expect(mList.active.map((r: any) => r.id)).toEqual([mRoom])

    // 대조군 — 초대받으면 나타난다. 목록을 통째로 비운 구현은 여기서 걸린다
    await invite(app, alice.cookie, aRoom, mallory.id)
    const after = (await listRooms(app, mallory.cookie)).json()
    expect(after.active.map((r: any) => r.id).sort()).toEqual([aRoom, mRoom].sort())
  })

  // AC-ROOMAUTHZ-012 시나리오 1 — 비멤버의 yes 는 소비되지 않고, 대기 항목은 멤버의 몫으로 남는다.
  // 이것이 .moai/reports/t4/sync-audit.md §F-14 를 직접 재는 기준이다
  it('never lets a non-member approve, and leaves the request for a member to answer', async () => {
    const { app, port, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)
    const { botId, token } = seedBot(roomId)
    const ws = await wsConnect(port, token)
    // SPEC-PERMROUTE-001 (M4-7, 리드 처분) — 요청을 소켓으로 보내 대기 항목에 «살아 있는 connId» 가 실리게 한다.
    // broker 직접 호출은 connId 가 없어 (ㄴ) 실패 갈래로 빠져 멤버의 판정이 봇에 도달하지 않는다.
    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    await new Promise(r => setTimeout(r, 200))

    // 부정 사례 — mallory 는 방 밖에서 승인 코드를 알고 있다고 가정한다
    const seen = nextMessage(ws)
    const refused = await postMsg(app, mallory.cookie, roomId, 'yes abcde')
    expect(refused.statusCode).toBe(404)
    expect(await seen).toBeNull()                       // 봇에게 아무것도 가지 않았다

    // 대조군 — 대기 항목은 살아 있고 멤버가 여전히 판정할 수 있다.
    // 모든 판정을 죽인 구현은 여기서 걸린다
    const real = nextMessage(ws)
    await postMsg(app, alice.cookie, roomId, 'yes abcde')
    expect(await real).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
  })

  // AC-ROOMAUTHZ-012 시나리오 2 — 브로커 자신도 비멤버를 막는다 (라우트 게이트와 독립인 백스톱).
  // 브로커를 직접 불러야 라우트 게이트만으로는 보이지 않는 검사의 유무가 갈린다
  it('the broker itself refuses a non-member verdict, independent of the route gate', async () => {
    const { broker, port, alice, mallory, app } = await build()
    const roomId = await createRoom(app, alice.cookie)
    const { botId, token } = seedBot(roomId)
    const ws = await wsConnect(port, token)
    // M4-7 — 등록은 소켓으로(살아 있는 connId), 비멤버·멤버 판정은 tryHandleUserReply 직접 호출로.
    // 이 시험의 본체는 «브로커 자신의 비멤버 차단» 이고, 마지막 단언은 «멤버의 판정이 봇에 도달한다» 다.
    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    await new Promise(r => setTimeout(r, 200))

    expect(broker.tryHandleUserReply(roomId, mallory.id, 'yes abcde')).toBe(false)   // 비멤버
    expect(broker.tryHandleUserReply(roomId, alice.id, 'yes abcde')).toBe(true)      // 멤버 — 대기 항목이 살아 있었다
    expect(await nextMessage(ws)).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
  })

  // AC-ROOMAUTHZ-013 — 없는 방·활성 방·보관된 방이 비멤버에게 글자 그대로 같다 (GET 과 POST 양쪽).
  // GET 만 비교하면 POST 의 방 조회 뒤에 게이트를 둔 구현이 통과하므로 POST 판이 본체다 (1차 감사 F-04)
  it('gives a non-member byte-identical answers for missing, active and archived rooms', async () => {
    const { app, alice, mallory } = await build()
    const active = await createRoom(app, alice.cookie, '살아 있는 방')
    const archived = await createRoom(app, alice.cookie, '보관될 방')
    await app.inject({ method: 'POST', url: `/api/rooms/${archived}/archive`, headers: { cookie: alice.cookie } })

    const answers = [
      await listMsg(app, mallory.cookie, 999999),      // 없는 방
      await listMsg(app, mallory.cookie, active),      // 있지만 남의 방
      await listMsg(app, mallory.cookie, archived),    // 있고 보관된 남의 방
    ]
    const shapes = answers.map(r => `${r.statusCode}|${r.body}`)
    expect(new Set(shapes).size).toBe(1)               // 셋이 글자 그대로 같다
    expect(answers[0].statusCode).toBe(404)

    // POST 판 — 같은 비교를 쓰기 경로에서 한 번 더 한다.
    // GET 만 재면 순서를 뒤집은 구현이 통과한다 (1차 감사 F-04)
    const posts = [
      await postMsg(app, mallory.cookie, 999999, '없는 방으로'),
      await postMsg(app, mallory.cookie, active, '남의 활성 방으로'),
      await postMsg(app, mallory.cookie, archived, '남의 보관된 방으로'),
    ]
    const postShapes = posts.map(r => `${r.statusCode}|${r.body}`)
    expect(new Set(postShapes).size).toBe(1)
    expect(posts[0].statusCode).toBe(404)

    // 대조군 — 멤버에게는 보관 상태가 그대로 보인다 (409 는 죽지 않았다)
    const memberSend = await postMsg(app, alice.cookie, archived, '늦은 메시지')
    expect(memberSend.statusCode).toBe(409)
  })

  // AC-ROOMAUTHZ-017 — 술어를 부르는 일곱 라우트가 한 사람에 대해 같은 방향으로 움직인다.
  // 하나만 다르게 판정하는 구현은 이 배열 비교에서 걸린다 (REQ-ROOMAUTHZ-007)
  it('moves every gated route together for one person, before and after the invitation', async () => {
    const { app, port, alice, mallory } = await build()
    const outsider = await signUp(app, 'outsider')   // memberInvite 의 초대 대상 — 훑는 사람(mallory)과 달라야 한다
    const roomId = await createRoom(app, alice.cookie)
    const botId = await makeBot(app, alice.cookie)

    // 술어를 부르는 라우트 일곱을 한 사람으로 훑는다. 새 게이트가 생기면 이 배열에 줄을 더한다.
    // `GET /api/rooms`(목록)와 판정 수용은 상태 코드 하나로 방향이 드러나지 않아 여기 넣지 않는다 —
    // 각각 AC-ROOMAUTHZ-011 과 AC-ROOMAUTHZ-012 가 자기 관측으로 잰다
    const sweep = async (ck: string) => ({
      post:         (await postMsg(app, ck, roomId, 'x')).statusCode,
      list:         (await listMsg(app, ck, roomId)).statusCode,
      stream:       (await openStream(port, ck, roomId)).status,
      memberInvite: (await invite(app, ck, roomId, outsider.id)).statusCode,
      invitePost:   (await botInvite(app, ck, roomId, botId)).statusCode,
      inviteList:   (await botInviteList(app, ck, roomId)).statusCode,
      inviteDelete: (await botInviteRevoke(app, ck, roomId, botId)).statusCode,
    })

    // 부정 사례 — 비멤버에게는 전부 404 다. 하나라도 다르면 그 라우트의 술어가 갈라진 것이다
    const before = await sweep(mallory.cookie)
    expect(Object.values(before)).toEqual([404, 404, 404, 404, 404, 404, 404])

    // 대조군 — 초대 한 번으로 전부 방향이 바뀐다. 하나라도 404 로 남으면 그 라우트만 다른 판정을 쓴다.
    // 이 블록이 없으면 "전부 404 로 막은 구현"이 위 단언을 통과한다
    expect((await invite(app, alice.cookie, roomId, mallory.id)).statusCode).toBe(201)
    const after = await sweep(mallory.cookie)
    for (const [name, code] of Object.entries(after)) {
      expect(code, `${name} 는 멤버에게 열려야 한다`).not.toBe(404)
    }
  })

  // AC-ROOMAUTHZ-018 시나리오 1 — 봇 초대 라우트 셋이 비멤버에게 404 다 (목록은 빈 배열이 아니고,
  // 철회는 토큰을 그대로 둔다). 초대 라우트는 그 방 대화 전체로 통하는 두 번째 문이다 (D2 v2)
  it('refuses all three bot-invite routes to a non-member while a member keeps the old behaviour', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)
    const botId = await makeBot(app, alice.cookie)
    expect((await botInvite(app, alice.cookie, roomId, botId)).statusCode).toBe(201)
    expect(activeTokenCount(roomId)).toBe(1)
    const issuedAt = (db.prepare('SELECT verifier_pub AS stored FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL')
      .get(roomId) as { stored: string }).stored

    // 부정 사례 1 — 발급. 토큰이 응답에 실려 나가지 않는다
    const refusedPost = await botInvite(app, mallory.cookie, roomId, botId)
    expect(refusedPost.statusCode).toBe(404)
    expect(refusedPost.json()).toEqual({ error: '방을 찾을 수 없습니다' })
    expect(activeTokenCount(roomId)).toBe(1)                       // 재발급도 철회도 일어나지 않았다

    // 부정 사례 2 — 목록. 빈 배열이 아니라 404 다 (빈 배열은 "봇 없는 방"과 구별되지 않는다)
    const refusedList = await botInviteList(app, mallory.cookie, roomId)
    expect(refusedList.statusCode).toBe(404)
    expect(refusedList.json()).toEqual({ error: '방을 찾을 수 없습니다' })

    // 부정 사례 3 — 철회. 남의 방 봇 세션을 끊을 수 없다
    const refusedDelete = await botInviteRevoke(app, mallory.cookie, roomId, botId)
    expect(refusedDelete.statusCode).toBe(404)
    expect(activeTokenCount(roomId)).toBe(1)
    expect((db.prepare('SELECT verifier_pub AS stored FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL')
      .get(roomId) as { stored: string }).stored).toBe(issuedAt)   // 같은 토큰이 그대로 살아 있다

    // 없는 방과 구별되지 않는다 (REQ-ROOMAUTHZ-013)
    const missing = await botInviteList(app, mallory.cookie, 999999)
    expect(`${refusedList.statusCode}|${refusedList.body}`).toBe(`${missing.statusCode}|${missing.body}`)

    // 대조군 — 멤버에게는 셋 다 기존 동작 그대로다. 없으면 "셋을 통째로 404 로 막은 구현"이 통과한다
    const list = await botInviteList(app, alice.cookie, roomId)
    expect(list.statusCode).toBe(200)
    expect(list.json()).toEqual([{ bot_id: botId, bot_name: 'pm', online: false }])

    const reissue = await botInvite(app, alice.cookie, roomId, botId)
    expect(reissue.statusCode).toBe(201)
    expect(typeof reissue.json().token).toBe('string')             // 평문 토큰은 멤버에게만 나간다
    expect(activeTokenCount(roomId)).toBe(1)                       // 재초대는 옛 토큰을 철회한다 (REQ-BOT-003)

    const revoke = await botInviteRevoke(app, alice.cookie, roomId, botId)
    expect(revoke.statusCode).toBe(200)
    expect(revoke.json()).toEqual({ ok: true })
    expect(activeTokenCount(roomId)).toBe(0)
  })

  // AC-ROOMAUTHZ-018 시나리오 2 — 게이트가 방 조회보다 앞이어야 멤버의 기존 실패 코드가 죽지 않고,
  // 비멤버에게는 보관된 방이 없는 방과 구별되지 않는다. 순서를 뒤집은 구현은 여기서 409 를 흘린다
  it('keeps the member-facing invite failure codes intact behind the gate', async () => {
    const { app, alice, mallory } = await build()
    const roomId = await createRoom(app, alice.cookie)
    const botId = await makeBot(app, alice.cookie)

    // 멤버 — 없는 봇은 여전히 봇 쪽 404 다. 방 쪽 404 와 본문이 달라야 구별이 산다
    const noBot = await botInvite(app, alice.cookie, roomId, 999999)
    expect(noBot.statusCode).toBe(404)
    expect(noBot.json()).toEqual({ error: '봇을 찾을 수 없습니다' })

    // 멤버 — 보관된 방은 409 그대로
    expect((await archiveRoom(app, alice.cookie, roomId)).statusCode).toBe(200)
    const archivedForMember = await botInvite(app, alice.cookie, roomId, botId)
    expect(archivedForMember.statusCode).toBe(409)

    // 비멤버 — 같은 보관된 방이 없는 방과 구별되지 않는다. 순서를 뒤집은 구현은 여기서 409 를 흘린다
    const archivedForOutsider = await botInvite(app, mallory.cookie, roomId, botId)
    const missingForOutsider = await botInvite(app, mallory.cookie, 999999, botId)
    expect(archivedForOutsider.statusCode).toBe(404)
    expect(`${archivedForOutsider.statusCode}|${archivedForOutsider.body}`)
      .toBe(`${missingForOutsider.statusCode}|${missingForOutsider.body}`)
  })

  // AC-ROOMAUTHZ-014 — 봇의 길은 바뀌지 않았다 (plan.md §F M4 수용 기준). 보존 감시다 —
  // 봇 경로의 인가가 M1~M3 의 멤버십 작업으로 변하지 않았음을 재는 것이므로 착지 즉시 초록이 맞다
  // (RED 불요). M3 이전에 쓰면 게이트도 없어 아무것도 재지 못했으므로, M4 의 형제 하네스 교정과
  // 함께 심는다. 본문은 acceptance.md 의 시나리오 코드를 그대로 옮겼다
  it('leaves the bot gateway path untouched by room membership', async () => {
    const { app, gateway, port, alice } = await build()
    const roomId = await createRoom(app, alice.cookie)
    const { botId, token } = seedBot(roomId)
    const ws = await wsConnect(port, token)                      // 토큰만으로 접속된다

    // 봇은 사람이 아니므로 멤버 표에 들어가지 않는다 — 그래도 전달은 된다
    expect(memberCount(roomId)).toBe(1)                          // alice 하나뿐
    expect(gateway.sendToBot(roomId, botId, { type: 'ping' })).toBe(true)
    expect(await nextMessage(ws)).toEqual({ type: 'ping' })
  })
})
