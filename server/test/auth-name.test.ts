// v2 이름 로그인 — 비밀번호·가입이 없으므로 남는 계약은 «이름 규칙» 과 «이름 하나로 세션» 둘뿐이다.
// 이름 규칙 넷(길이 상한·제어문자·앞뒤 공백·보이지 않는 형식 문자)은 옛 auth.test.ts(t33·t33 F2)에서 옮겨 왔다.
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

// light-my-request 는 set-cookie 값 하나를 배열이 아니라 문자열로 돌려준다 — 첫 값 형태로 정규화
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

const login = (app: Awaited<ReturnType<typeof build>>, username: unknown) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { username } })
const userCount = () => (db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number }).c

describe('auth — name login', () => {
  it('logs in with a name alone, creates the user on first sight, and reuses it after', async () => {
    const app = await build()
    const first = await login(app, 'alice')
    expect(first.statusCode).toBe(200)
    const c1 = setCookieOf(first)
    expect(c1).toMatch(/^md_session=/)
    expect(c1).toMatch(/HttpOnly/i)
    expect(c1).toMatch(/SameSite=Lax/i)
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: c1.split(';')[0] } })
    expect(me.statusCode).toBe(200)
    expect(me.json().user.username).toBe('alice')

    // 같은 이름은 같은 사람 — 두 번째 로그인이 새 users 행을 만들지 않고 같은 id 를 준다
    const second = await login(app, 'alice')
    expect(second.statusCode).toBe(200)
    const me2 = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: setCookieOf(second).split(';')[0] } })
    expect(me2.json().user.id).toBe(me.json().user.id)
    expect(userCount()).toBe(1)

    // 로그아웃은 그 세션만 끊는다
    const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: c1.split(';')[0] } })
    expect(out.statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: c1.split(';')[0] } })).statusCode).toBe(401)
  })

  it('rejects a missing or non-string username with 400 and stores nothing', async () => {
    const app = await build()
    for (const username of [undefined, '', 123, ['bob'], null]) {
      const res = await login(app, username)
      expect(res.statusCode, JSON.stringify(username)).toBe(400)
    }
    expect(userCount()).toBe(0)
  })

  // t33: 상한이 없으면 2만 바이트 이름이 그대로 저장된다 — 길이 상한
  it('rejects over-long usernames and accepts the boundary and normal names', async () => {
    const app = await build()
    for (const username of ['a'.repeat(20000), 'a'.repeat(USERNAME_MAX_LENGTH + 1)]) {
      const res = await login(app, username)
      expect(res.statusCode, `username length ${username.length}`).toBe(400)
      expect(res.json().error).toContain(`${USERNAME_MAX_LENGTH}자`)
    }
    expect(userCount()).toBe(0)
    for (const username of ['a'.repeat(USERNAME_MAX_LENGTH), 'alice', '홍길동']) {
      expect((await login(app, username)).statusCode, username).toBe(200)
    }
    expect(userCount()).toBe(3)
  })

  // t33: 제어문자 (C0·C1)
  it('rejects control characters inside the name', async () => {
    const app = await build()
    for (const username of ['bad\u0000name', 'bad\u009fname']) {
      expect((await login(app, username)).statusCode, JSON.stringify(username)).toBe(400)
    }
    expect(userCount()).toBe(0)
  })

  // t33: 앞뒤 공백
  it('rejects leading and trailing whitespace', async () => {
    const app = await build()
    for (const username of [' alice', 'alice ']) {
      expect((await login(app, username)).statusCode, JSON.stringify(username)).toBe(400)
    }
    expect(userCount()).toBe(0)
  })

  // t33 F2 (sync 감사): C0/C1 만 막으면 유니코드 형식 문자·줄 구분자가 이름 안으로 들어온다.
  // 셋 다 «보이지 않으면서 표시를 흔드는» 문자이고 위치는 이름 내부다 — 앞뒤 공백 검사로는 잡히지 않는다.
  it('rejects invisible format and line-separator characters inside the name', async () => {
    const app = await build()
    const rejected = [
      'ali\u202Ece',   // U+202E RIGHT-TO-LEFT OVERRIDE — 뒤 글자의 표시 방향을 뒤집는다
      'ali\u200Bce',   // U+200B ZERO WIDTH SPACE — 폭 0. 'alice' 와 화면상 구분되지 않는 다른 계정이 된다
      'ali\u2028ce',   // U+2028 LINE SEPARATOR — 로그·표시를 줄 단위로 쪼갠다
    ]
    for (const username of rejected) {
      expect((await login(app, username)).statusCode, JSON.stringify(username)).toBe(400)
    }
    expect(userCount()).toBe(0)
  })

  it('serves logout without a session, exposes only login and logout, and keeps protected routes at 401', async () => {
    const app = await build()
    expect((await app.inject({ method: 'POST', url: '/api/auth/logout', payload: {} })).statusCode).toBe(200)
    // 이 모듈이 등록하는 /api/auth 라우트는 셋이다 — login·logout·me(SPEC-WEBUI-001 §5). 가입 라우트는 등록되지 않는다
    const authRoutes = app.printRoutes().split('\n').filter(l => l.includes('login') || l.includes('logout') || l.includes('regist'))
    expect(authRoutes.some(l => l.includes('regist'))).toBe(false)
    expect(app.hasRoute({ method: 'POST', url: '/api/auth/login' })).toBe(true)
    expect(app.hasRoute({ method: 'POST', url: '/api/auth/logout' })).toBe(true)
    expect((await app.inject({ method: 'GET', url: '/api/me' })).statusCode).toBe(401)
  })
})

describe('SPEC-WEBUI-001 — GET /api/auth/me', () => {
  it('401s without a cookie and mirrors the session user with one', async () => {
    const app = await build()
    // 쿠키 없이 — requireAuth 가 이미 하던 401 을 그대로 낸다
    const anon = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(anon.statusCode).toBe(401)
    expect(anon.json()).toEqual({ error: '로그인이 필요합니다' })

    // 로그인 뒤 — 세션이 가리키는 사용자를 그대로 돌려준다
    const res = await login(app, 'alice')
    const me = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { cookie: setCookieOf(res).split(';')[0] },
    })
    expect(me.statusCode).toBe(200)
    const row = db.prepare('SELECT id, username FROM users WHERE username = ?').get('alice')
    expect(me.json()).toEqual(row)          // req.user 를 다시 빚지 않는다 — {id, username} 그대로
    expect(Object.keys(me.json()).sort()).toEqual(['id', 'username'])   // 키가 늘지 않았다
  })

  // [F8] 위 it 은 build() 가 만든 앱을 찌른다. 누군가 build() 에 /api/auth/me 를 한 줄 더하면
  // server/src/auth.ts 의 라우트를 통째로 지워도 위 it 은 초록이다 — 산문 금지로는 못 막는다.
  // 그래서 «대역이 있을 수 없는» 앱을 따로 세워 라우트의 출처를 직접 묻는다.
  it('registers /api/auth/me inside registerAuthRoutes itself, not in the test harness', async () => {
    const bare = Fastify()
    bare.db = db
    await bare.register(cookie)
    registerAuthRoutes(bare, db)          // 이 한 줄이 등록하는 것만 있는 앱
    await bare.ready()
    expect(bare.hasRoute({ method: 'GET', url: '/api/auth/me' })).toBe(true)
    // 기존 두 라우트도 그대로다 — 새 라우트가 무언가를 밀어내지 않았다
    expect(bare.hasRoute({ method: 'POST', url: '/api/auth/login' })).toBe(true)
    expect(bare.hasRoute({ method: 'POST', url: '/api/auth/logout' })).toBe(true)
    await bare.close()
  })
})
