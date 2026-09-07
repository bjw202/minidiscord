// 이름 로그인/세션 쿠키 (sessions 테이블). 비밀번호는 없다 — v2 전제(사내망, 회사 인증을 거친 사람만)에서
// 사람 인증은 «이름 하나» 로 줄였다 (.moai/reports/v2-review.md §2.3). 남은 검사는 표시 안전용 이름 규칙뿐이다.
import { randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from './db.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: number; username: string }
  }
}

// 사용자 이름 상한 — 상한이 없으면 2만 바이트 이름이 그대로 저장된다(t33)
export const USERNAME_MAX_LENGTH = 32
// 보이지 않으면서 표시를 흔드는 문자와 앞뒤 공백을 거른다 — 제어(Cc)·형식(Cf)·줄/문단 구분(Zl/Zp).
// Cc 만 막으면 U+202E(방향 뒤집기)·U+200B(폭 0 공백)·U+2028(줄 구분자)이 그대로 들어와
// 표시·로그를 깨뜨리고 화면상 구분되지 않는 닮은꼴 계정을 만든다 (t33 F2 — sync 감사)
const USERNAME_FORBIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u

// @MX:NOTE: 이 모듈이 등록하는 라우트는 login·logout 둘뿐 — 가입은 없다. 처음 보는 이름은 로그인 때 users 에 생긴다
export function registerAuthRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/auth/login', async (req, reply) => {
    const { username } = req.body as { username?: string }
    // 타입 검사를 길이 검사보다 먼저 — 문자열이 아닌 값이 .length 검사를 통과하지 못하게 한다
    if (typeof username !== 'string' || username === '') {
      return reply.code(400).send({ error: 'username이 필요합니다' })
    }
    // 길이·글자 상한 (t33) — 형식 위반과 길이 위반을 구분해 안내한다
    if ([...username].length > USERNAME_MAX_LENGTH) {
      return reply.code(400).send({ error: `username은 ${USERNAME_MAX_LENGTH}자 이하여야 합니다` })
    }
    if (USERNAME_FORBIDDEN.test(username) || username !== username.trim()) {
      return reply.code(400).send({ error: 'username에 제어문자나 앞뒤 공백을 쓸 수 없습니다' })
    }
    // 같은 이름은 같은 사람이다 — 있으면 그 행을, 없으면 새 행을 쓴다 (INSERT OR IGNORE 뒤 조회)
    db.prepare('INSERT OR IGNORE INTO users (username) VALUES (?)').run(username)
    const row = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username) as { id: number; username: string }
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
