// 회원가입/로그인/세션 쿠키 (scrypt 해시, sessions 테이블)
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from './db.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: number; username: string }
  }
}

// @MX:NOTE: [AUTO] 16바이트 난수 salt + scrypt 64바이트 파생 키를 `<salt-hex>:<key-hex>` 한 줄로 저장
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`
}

// @MX:NOTE: [AUTO] timingSafeEqual 상수 시간 비교 — 저장값 형식이 손상되면 거짓을 반환한다
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hex] = stored.split(':')
  if (!salt || !hex) return false
  const a = Buffer.from(hex, 'hex')
  const b = scryptSync(pw, salt, 64)
  return a.length === b.length && timingSafeEqual(a, b)
}

// 사용자 이름 상한 — 상한이 없으면 2만 바이트 이름이 그대로 저장된다(t33)
export const USERNAME_MAX_LENGTH = 32
// 제어문자(C0/C1)와 앞뒤 공백을 거른다 — 표시·로그를 깨뜨리고 닮은꼴 중복 계정을 만든다
const USERNAME_FORBIDDEN = /[\u0000-\u001f\u007f-\u009f]/

// @MX:NOTE: [AUTO] 이 SPEC 이 등록하는 라우트는 이 세 개뿐 (REQ-AUTH-013) — 그 밖의 경로는 테스트 헬퍼에서만 등록한다
export function registerAuthRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/auth/register', async (req, reply) => {
    const { username, password } = req.body as { username?: string; password?: string }
    // 타입 검사를 길이 검사보다 먼저 (REQ-AUTH-006) — 문자열이 아닌 값이 .length 검사를 통과하지 못하게 한다
    if (typeof username !== 'string' || username === '' || typeof password !== 'string' || password.length < 8) {
      return reply.code(400).send({ error: 'username과 8자 이상 password가 필요합니다' })
    }
    // 길이·글자 상한 (t33) — 형식 위반과 길이 위반을 구분해 안내한다
    if ([...username].length > USERNAME_MAX_LENGTH) {
      return reply.code(400).send({ error: `username은 ${USERNAME_MAX_LENGTH}자 이하여야 합니다` })
    }
    if (USERNAME_FORBIDDEN.test(username) || username !== username.trim()) {
      return reply.code(400).send({ error: 'username에 제어문자나 앞뒤 공백을 쓸 수 없습니다' })
    }
    try {
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hashPassword(password))
    } catch {
      return reply.code(409).send({ error: '이미 있는 사용자 이름입니다' })
    }
    return reply.code(201).send({ ok: true })
  })

  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = req.body as { username?: string; password?: string }
    // 문자열이 아닌 입력은 400 — 빈 페이로드가 401 로 흘러 AC-AUTH-011 예외 경로 단언을 깨는 것을 막는다
    if (typeof username !== 'string' || typeof password !== 'string') {
      return reply.code(400).send({ error: '사용자 이름과 비밀번호가 필요합니다' })
    }
    const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as
      | { id: number; username: string; password_hash: string }
      | undefined
    // 없는 사용자와 틀린 비밀번호를 같은 401 본문으로 처리 — 사용자 이름 열거 방지 (REQ-AUTH-009)
    if (!row || !verifyPassword(password, row.password_hash)) {
      return reply.code(401).send({ error: '사용자 이름 또는 비밀번호가 틀렸습니다' })
    }
    const token = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, row.id)
    reply.setCookie('md_session', token, { httpOnly: true, sameSite: 'lax', path: '/' })
    return { ok: true }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies['md_session']
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    reply.clearCookie('md_session', { path: '/' })
    return { ok: true }
  })
}

// @MX:ANCHOR: [AUTO] 모든 보호 라우트의 preHandler 진입 검사 — SPEC-ROOM-001·SPEC-BOT-001 이 소비하는 공개 계약
// @MX:REASON: md_session 쿠키를 sessions 테이블과 대조해 통과하면 req.user 를 설정한다. 시그니처 변경은 형제 SPEC 의 라우트를 전부 깨뜨린다
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies['md_session']
  if (!token) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  const row = req.server.db
    .prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(token) as { id: number; username: string } | undefined
  if (!row) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  req.user = row
}
