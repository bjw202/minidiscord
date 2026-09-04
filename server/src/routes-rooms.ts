// 방 생성/목록/보관 API — 모든 쿼리는 req.server.db 단일 연결을 쓴다
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'
import { requireRoomMember } from './room-members.js'

// GET /api/rooms 행 모양 — 생성 응답도 목록 응답과 정확히 같은 다섯 키를 쓴다 (REQ-ROOM-003)
type RoomRow = { id: number; name: string; status: string; created_at: string; archived_at: string | null }

// @MX:ANCHOR: [AUTO] 방 라우트 3개의 등록점 — buildServer 와 테스트 build() 가 호출, SPEC-BOT-001 초대 라우트가 이 방들을 소비한다
// @MX:REASON: opts.onArchive 훅 계약(보관 커밋 직후 방 id 로 1회 호출)은 이후 게이트웨이 카드가 연결 끊기에 쓴다. 시그니처 변경은 소비자 전부를 깨뜨린다
export function registerRoomRoutes(app: FastifyInstance, opts?: { onArchive?: (roomId: number) => void }): void {
  // 목록은 호출자가 멤버인 방만 담는다 (REQ-ROOMAUTHZ-011) — 남의 방이 보이면 존재가 샌다.
  // 봉투 {active, archived} 는 SPEC-ROOM-001 그대로 둔다. 목록은 술어의 여덟 호출부에 들지 않고 여기서
  // 인라인 SQL 로 같은 조건을 적는다. 상태 코드로 방향이 드러나지 않아 AC-ROOMAUTHZ-017 의 sweep 이
  // 아니라 AC-ROOMAUTHZ-011 이 잰다
  app.get('/api/rooms', { preHandler: [requireAuth] }, async req => {
    const rows = req.server.db.prepare(
      `SELECT id, name, status, created_at, archived_at FROM rooms
       WHERE id IN (SELECT room_id FROM room_members WHERE user_id = ?)
       ORDER BY id DESC`,
    ).all(req.user!.id) as RoomRow[]
    return {
      active: rows.filter(r => r.status === 'active'),
      archived: rows.filter(r => r.status === 'archived'),
    }
  })

  app.post('/api/rooms', { preHandler: [requireAuth] }, async (req, reply) => {
    const { name } = req.body as { name?: string }
    if (!name?.trim()) return reply.code(400).send({ error: '방 이름이 필요합니다' })
    const db = req.server.db
    const creatorId = req.user!.id
    // @MX:NOTE: [AUTO] 방 행과 생성자 멤버 행은 한 트랜잭션이다 (REQ-ROOMAUTHZ-004). 둘로 갈라지면
    // 멤버 없는 방이 남고, 그 방은 아무도 들어갈 수 없는 채 목록에 뜬다 — SPEC §5.2 의 가장 비싼 부분 실패
    const createWithMembership = db.transaction((roomName: string): number => {
      const r = db.prepare('INSERT INTO rooms (name, created_by) VALUES (?, ?)').run(roomName, creatorId)
      db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(r.lastInsertRowid, creatorId)
      return r.lastInsertRowid as number
    })
    const roomId = createWithMembership(name.trim())
    // §D 4: 생성 응답의 SELECT 도 archived_at 을 뽑아 다섯 키를 갖춘다 — 활성 방이므로 값은 null
    const room = db.prepare('SELECT id, name, status, created_at, archived_at FROM rooms WHERE id = ?').get(roomId)
    return reply.code(201).send(room)
  })

  // 초대 — 멤버십 게이트(requireRoomMember)가 방 상태 검사보다 앞선다 (순서 계약, plan.md §B).
  // 비멤버는 보관 여부를 못 보고 같은 404 로 끝난다. 이 라우트는 술어의 여덟 호출부 중 하나다
  app.post('/api/rooms/:id/members', { preHandler: [requireAuth, requireRoomMember] }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const { user_id } = req.body as { user_id?: number }
    const db = req.server.db
    const room = db.prepare('SELECT status FROM rooms WHERE id = ?').get(id) as { status: string } | undefined
    if (!room) return reply.code(404).send({ error: '방을 찾을 수 없습니다' })
    // 멤버에게만 보관 상태가 보인다 — 비멤버는 위 게이트에서 이미 같은 404 로 끝났다
    if (room.status === 'archived') return reply.code(409).send({ error: '보관된 방에는 초대할 수 없습니다' })
    if (typeof user_id !== 'number' || !Number.isInteger(user_id)) {
      return reply.code(400).send({ error: '사용자를 찾을 수 없습니다' })
    }
    if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(user_id)) {
      return reply.code(400).send({ error: '사용자를 찾을 수 없습니다' })
    }
    // 조회-후-삽입 대신 표의 복합 PK 로 갈린다 — 동시 초대 둘을 모두 통과시키지 않는다 (plan.md §A)
    const info = db.prepare('INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)').run(id, user_id)
    if (info.changes === 0) return reply.code(200).send({ ok: true, already: true })
    return reply.code(201).send({ ok: true })
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
