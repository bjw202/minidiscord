// 방 생성/목록/보관 API — 모든 쿼리는 req.server.db 단일 연결을 쓴다
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'

// GET /api/rooms 행 모양 — 생성 응답도 목록 응답과 정확히 같은 다섯 키를 쓴다 (REQ-ROOM-003)
type RoomRow = { id: number; name: string; status: string; created_at: string; archived_at: string | null }

// @MX:ANCHOR: [AUTO] 방 라우트 3개의 등록점 — buildServer 와 테스트 build() 가 호출, SPEC-BOT-001 초대 라우트가 이 방들을 소비한다
// @MX:REASON: opts.onArchive 훅 계약(보관 커밋 직후 방 id 로 1회 호출)은 이후 게이트웨이 카드가 연결 끊기에 쓴다. 시그니처 변경은 소비자 전부를 깨뜨린다
export function registerRoomRoutes(app: FastifyInstance, opts?: { onArchive?: (roomId: number) => void }): void {
  // 모든 사람이 모든 방을 본다 (v2 — 방 구성원 인가 삭제). 봉투 {active, archived} 는 SPEC-ROOM-001 그대로 둔다
  app.get('/api/rooms', { preHandler: [requireAuth] }, async req => {
    const rows = req.server.db.prepare(
      'SELECT id, name, status, created_at, archived_at FROM rooms ORDER BY id DESC',
    ).all() as RoomRow[]
    return {
      active: rows.filter(r => r.status === 'active'),
      archived: rows.filter(r => r.status === 'archived'),
    }
  })

  app.post('/api/rooms', { preHandler: [requireAuth] }, async (req, reply) => {
    const { name } = req.body as { name?: string }
    if (!name?.trim()) return reply.code(400).send({ error: '방 이름이 필요합니다' })
    const db = req.server.db
    const roomId = db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name.trim()).lastInsertRowid as number
    // §D 4: 생성 응답의 SELECT 도 archived_at 을 뽑아 다섯 키를 갖춘다 — 활성 방이므로 값은 null
    const room = db.prepare('SELECT id, name, status, created_at, archived_at FROM rooms WHERE id = ?').get(roomId)
    return reply.code(201).send(room)
  })

  app.post('/api/rooms/:id/archive', { preHandler: [requireAuth] }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const db = req.server.db
    // 숫자가 아닌 id 는 조회 결과가 없는 경우와 같게 404 로 둔다 (acceptance 엣지 케이스)
    if (!Number.isInteger(id)) return reply.code(404).send({ error: '방을 찾을 수 없습니다' })

    // @MX:NOTE: [AUTO] 두 UPDATE(방 상태 전이 + 활성 토큰 철회)는 한 트랜잭션 안에서만 일어난다 (REQ-ROOM-005).
    // 트랜잭션 안에서 방을 먼저 조회해 missing/conflict/ok 플래그로 갈라 실패 경로에서는 UPDATE 를 아예 실행하지 않는다 (plan.md §C)
    const archive = db.transaction((): 'missing' | 'conflict' | 'ok' => {
      const room = db.prepare('SELECT status FROM rooms WHERE id = ?').get(id) as { status: string } | undefined
      if (!room) return 'missing'
      if (room.status === 'archived') return 'conflict'
      db.prepare("UPDATE rooms SET status = 'archived', archived_at = datetime('now') WHERE id = ?").run(id)
      db.prepare("UPDATE bot_tokens SET revoked_at = datetime('now') WHERE room_id = ? AND revoked_at IS NULL").run(id)
      return 'ok'
    })
    const result = archive()
    // 404 = 지목한 대상이 없다, 409 = 대상은 있으나 그 상태에서는 할 수 없다 — 두 본문은 서로 다른 문구로 구분한다 (REQ-ROOM-006, plan.md §D 7)
    if (result === 'missing') return reply.code(404).send({ error: '방을 찾을 수 없습니다' })
    if (result === 'conflict') return reply.code(409).send({ error: '이미 보관된 방입니다' })
    // 훅은 트랜잭션 커밋 이후에만 호출 — 훅 예외로 확정된 보관이 되돌아가지 않게 한다
    opts?.onArchive?.(id)
    return { ok: true }
  })
}
