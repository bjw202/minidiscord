import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { openDb, type Db } from '../src/db.js'
import { registerAuthRoutes, requireAuth, USERNAME_MAX_LENGTH } from '../src/auth.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 'test.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// light-my-request 는 set-cookie 값 하나를 배열이 아니라 문자열로 돌려준다 — 원본 테스트가 가정한 첫 값 형태로 정규화
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

async function build() {
  const app = Fastify()
  app.db = db // requireAuth 가 req.server.db 로 읽는다 — registerAuthRoutes 에 넘기는 것과 같은 연결
  await app.register(cookie)
  registerAuthRoutes(app, db)
  app.get('/api/me', { preHandler: [requireAuth] }, async req => ({ user: req.user }))
  return app
}

describe('auth', () => {
  it('registers a user', async () => {
    const app = await build()
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    expect(res.statusCode).toBe(201)
  })

  it('rejects duplicate username', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    expect(res.statusCode).toBe(409)
  })

  it('login sets session cookie and /api/me works', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    expect(login.statusCode).toBe(200)
    const cookieHeader = setCookieOf(login)
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieHeader.split(';')[0] } })
    expect(me.statusCode).toBe(200)
    expect(me.json().user.username).toBe('alice')
  })

  it('wrong password returns 401', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'wrong' } })
    expect(res.statusCode).toBe(401)
  })

  it('protected route without cookie returns 401', async () => {
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/api/me' })
    expect(res.statusCode).toBe(401)
  })

  it('rejects invalid registration input', async () => {
    const app = await build()
    const cases = [
      { username: '', password: 'pw123456' },
      { username: 'bob' },
      { username: 'bob', password: 'short7' },
      { username: 'bob', password: 12345678 },
      { username: 'bob', password: ['pw123456'] },
      { username: ['bob'], password: 'pw123456' },
    ]
    for (const payload of cases) {
      const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload })
      expect(res.statusCode).toBe(400)
    }
    const c = db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number }
    expect(c.c).toBe(0)
  })

  // t33: 상한이 없으면 2만 바이트 이름이 그대로 저장된다 — 길이·글자 상한을 한 자리에서 잰다
  it('rejects over-long and malformed usernames, accepts a normal one', async () => {
    const app = await build()
    const rejected = [
      'a'.repeat(20000),                              // 재현 사례: 2만 글자
      'a'.repeat(USERNAME_MAX_LENGTH + 1),            // 경계 바로 바깥
      'bad\u0000name',                                // 제어문자 NUL (C0)
      'bad\u009fname',                               // 제어문자 (C1)
      ' alice',                                       // 앞 공백
      'alice ',                                       // 뒤 공백
    ]
    for (const username of rejected) {
      const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username, password: 'pw123456' } })
      expect(res.statusCode, `username length ${username.length}`).toBe(400)
    }
    expect((db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number }).c).toBe(0)

    // 경계 안쪽과 평범한 이름은 그대로 통과해야 한다 — 상한이 정상 가입을 막지 않는지 확인
    for (const username of ['a'.repeat(USERNAME_MAX_LENGTH), 'alice', '홍길동']) {
      const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username, password: 'pw123456' } })
      expect(res.statusCode, username).toBe(201)
    }
    expect((db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number }).c).toBe(3)
  })

  it('sets an httpOnly lax session cookie', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    const raw = setCookieOf(login)
    expect(raw).toMatch(/^md_session=/)
    expect(raw).toMatch(/HttpOnly/i)
    expect(raw).toMatch(/SameSite=Lax/i)
    expect(raw).toMatch(/Path=\//)
  })

  it('stores a salted scrypt hash, never the plaintext', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const row = db.prepare('SELECT password_hash FROM users WHERE username=?').get('alice') as { password_hash: string }
    expect(row.password_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/)
    expect(row.password_hash).not.toContain('pw123456')
  })

  it('logout invalidates the session', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    const c = setCookieOf(login).split(';')[0]
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: c } })
    expect(out.statusCode).toBe(200)
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: c } })
    expect(me.statusCode).toBe(401)
    const n = db.prepare('SELECT COUNT(*) c FROM sessions').get() as { c: number }
    expect(n.c).toBe(0)
  })

  it('only the three /api/auth routes are reachable without a session', async () => {
    const app = await build()
    const open: Array<[string, string]> = [
      ['POST', '/api/auth/register'],
      ['POST', '/api/auth/login'],
      ['POST', '/api/auth/logout'],
    ]
    for (const [method, url] of open) {
      const res = await app.inject({ method: method as any, url, payload: {} })
      expect(res.statusCode, `${method} ${url}`).not.toBe(401)
    }
    const guarded = await app.inject({ method: 'GET', url: '/api/me' })
    expect(guarded.statusCode).toBe(401)
  })

  it('buildServer wires cookie, db and auth routes', async () => {
    process.env.MINIDISCORD_DATA_DIR = mkdtempSync(join(tmpdir(), 'md-buildserver-'))
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    await app.ready()

    expect(app.db).toBeDefined()

    const health = await app.inject({ method: 'GET', url: '/api/health' })
    expect(health.statusCode).toBe(200)

    const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    expect(reg.statusCode).toBe(201)

    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    expect(login.statusCode).toBe(200)
    expect(setCookieOf(login)).toMatch(/^md_session=/)

    await app.close()
  })
})
