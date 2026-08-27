// 메시지 API — multipart 전송, 멘션 → 전달 대상 매핑, SSE·게이트웨이 팬아웃 (Task 9)
import { createWriteStream, mkdirSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { basename, extname, join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'
import { parseMentions } from './mention.js'

// 확장자 → MIME 표 (REQ-MSG-006). 비교는 소문자로 정규화한 뒤 하고 표에 없으면 application/octet-stream
const MIME: Record<string, string> = {
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
}

// @MX:ANCHOR: [AUTO] 세 메시지 라우트의 등록점 — buildServer(REQ-MSG-015 배선)과 테스트 build() 가 호출한다
// @MX:REASON: registerMessageRoutes(app: FastifyInstance): void 시그니처는 REQ-MSG-015 가 글자 그대로 고정한다. 게이트웨이는 req.server.gateway 데코레이터로만 접근한다(순환 참조 금지, spec.md §6)
export function registerMessageRoutes(app: FastifyInstance): void {
  app.post('/api/rooms/:id/messages', { preHandler: [requireAuth] }, async (req, reply) => {
    const db = req.server.db
    const roomId = Number((req.params as { id: string }).id)

    // 방 검사 — 404 는 "지목한 대상이 없다", 409 는 "대상은 있으나 그 상태에서는 할 수 없다" (REQ-MSG-004).
    // 어떤 테이블에도 행을 남기지 않는다. multipart 를 소비하기 전에 가른다.
    const room = db.prepare('SELECT id, status FROM rooms WHERE id = ?').get(roomId) as
      | { id: number; status: string }
      | undefined
    if (!room) return reply.code(404).send({ error: '방을 찾을 수 없습니다' })
    if (room.status === 'archived') return reply.code(409).send({ error: '보관된 방에는 메시지를 보낼 수 없습니다' })

    // multipart 파싱 — req.parts() 스트리밍 API 만 쓴다(제약). 업로드 디렉터리는 req.server.uploadsDir
    // 데코레이터가 가리키는 경로다 — config.uploadsDir 을 직접 읽으면 테스트 격리가 깨진다 (REQ-MSG-006 정의 상자)
    let body = ''
    const savedFiles: { filename: string; stored_path: string; size: number }[] = []
    mkdirSync(req.server.uploadsDir, { recursive: true })
    for await (const part of req.parts({ limits: { fileSize: 100 * 1024 * 1024 } })) {
      if (part.type === 'file') {
        // 쓰기 시점 봉인 — 사용자 파일명의 경로 성분을 제거한다 (REQ-MSG-007). '../../…' 를 담아도 업로드 디렉터리 밖에 쓰지 않는다
        const safeName = basename(part.filename)
        const stored = join(req.server.uploadsDir, `${randomUUID()}-${safeName}`)
        await pipeline(part.file, createWriteStream(stored))
        // size 는 저장된 파일의 실제 바이트 수다 (REQ-MSG-006)
        savedFiles.push({ filename: safeName, stored_path: stored, size: statSync(stored).size })
      } else {
        body += part.value
      }
    }

    // 빈 전송 — body 도 파일도 없으면 400 (REQ-MSG-005)
    if (!body.trim() && savedFiles.length === 0) {
      return reply.code(400).send({ error: '내용이나 파일이 필요합니다' })
    }

    // 멘션 → 그 방에 초대된 봇으로만 매핑 (REQ-MSG-002). 미초대 이름이 하나라도 있으면 전체를 400 으로
    // 거부하고 어떤 행도 남기지 않는다 (REQ-MSG-003). 디스크에 남는 고아 파일은 plan.md §D 6번이 수용한 위험이다.
    const targets: { botId: number; delivery: 'to' | 'cc' }[] = []
    const unknown: string[] = []
    for (const m of parseMentions(body)) {
      const bot = db.prepare(
        `SELECT b.id FROM bots b JOIN bot_tokens t ON t.bot_id = b.id
         WHERE b.name = ? AND t.room_id = ? AND t.revoked_at IS NULL`,
      ).get(m.bot, roomId) as { id: number } | undefined
      if (!bot) { unknown.push(m.bot); continue }
      targets.push({ botId: bot.id, delivery: m.delivery })
    }
    if (unknown.length > 0) {
      return reply.code(400).send({ error: `${unknown.join(', ')} 봇은 이 방에 초대되지 않았습니다` })
    }

    const r = db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body) VALUES (?, 'user', ?, ?)")
      .run(roomId, req.user!.id, body)
    const messageId = r.lastInsertRowid as number

    // 첨부 기록 — id 는 run().lastInsertRowid 로 받는다. SELECT last_insert_rowid() 는 strict 모드에서 컴파일되지 않는다 (plan.md §D 5번)
    const attachments: { id: number; filename: string; stored_path: string }[] = []
    for (const f of savedFiles) {
      const ar = db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
        .run(messageId, f.filename, f.stored_path, f.size, MIME[extname(f.filename).toLowerCase()] ?? 'application/octet-stream')
      attachments.push({ id: ar.lastInsertRowid as number, filename: f.filename, stored_path: f.stored_path })
    }

    // 멘션이 여럿이면 그 수만큼 행이 생긴다 — 같은 봇을 to·cc 로 함께 멘션해도 중복 제거하지 않는다 (엣지 케이스)
    for (const t of targets) {
      db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(messageId, t.botId, t.delivery)
    }

    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as {
      id: number; room_id: number; author_type: string; author_user_id: number | null; author_bot_id: number | null
      body: string; created_at: string
    }
    const message = { ...row, author_name: req.user!.username, attachments }

    // 팬아웃 — 저장이 끝나면 SSE 발행과 게이트웨이 전달을 각각 정확히 한 번 (REQ-MSG-010).
    // deliver 의 msg 는 실제 저장된 메시지여야 한다 — 게이트웨이가 이 id 로 last_delivered_id 를 올린다 (REQ-MSG-012)
    req.server.hub.publish(roomId, 'message', message)
    req.server.gateway.deliver(roomId, message, targets)

    return reply.code(200).send({ ok: true, message })
  })
}
