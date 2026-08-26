// 봇 등록/목록 API (표시용 정보만 — 페르소나는 각 세션 디렉터리가 담당)
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'

// @MX:ANCHOR: [AUTO] 봇 등록 라우트 2개의 등록점 — buildServer 와 테스트 build() 가 호출, SPEC-BOT-001 초대 라우트가 이 봇 행들을 소비한다
// @MX:REASON: 이 파일은 SPEC-ROOM-001(등록·목록)과 SPEC-BOT-001(초대 라우트·토큰 해시)이 나눠 쓴다 — 형제 SPEC 이 같은 파일에 덧붙이는 계약이므로 구조 변경은 양쪽을 깨뜨린다
export function registerBotRoutes(app: FastifyInstance): void {
  app.get('/api/bots', { preHandler: [requireAuth] }, async req => {
    return req.server.db.prepare('SELECT id, name, description FROM bots ORDER BY name').all()
  })

  app.post('/api/bots', { preHandler: [requireAuth] }, async (req, reply) => {
    const { name, description } = req.body as { name?: string; description?: string }
    if (!name?.trim()) return reply.code(400).send({ error: '봇 이름이 필요합니다' })
    try {
      const r = req.server.db.prepare('INSERT INTO bots (name, description) VALUES (?, ?)').run(name.trim(), description ?? '')
      return reply.code(201).send(req.server.db.prepare('SELECT id, name, description FROM bots WHERE id = ?').get(r.lastInsertRowid))
    } catch {
      // @MX:NOTE: [AUTO] UNIQUE 위반을 포함한 DB 오류를 전부 409 로 바꾼다 — 이 테이블에 다른 제약이 없어 오분류 경로가 없다 (plan.md §E 수용 항목)
      return reply.code(409).send({ error: '이미 있는 봇 이름입니다' })
    }
  })
}
