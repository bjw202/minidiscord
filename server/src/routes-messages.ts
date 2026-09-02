// 메시지 API — multipart 전송, 멘션 → 전달 대상 매핑, SSE·게이트웨이 팬아웃, 목록 커서, 첨부 다운로드 (Task 9)
import { createReadStream, createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { basename, extname, join, resolve, sep } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'
import { requireRoomMember } from './room-members.js'
import { parseMentions } from './mention.js'
import type { Db } from './db.js'

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
  // 멤버십 게이트가 preHandler 로 방 검사·multipart 소비보다 앞선다 (순서 계약, plan.md §B).
  // 뒤에 두면 비멤버가 409(보관됨)를 받아 방 실재가 샌다. 이 라우트는 술어의 아홉 호출부 중 하나다
  app.post('/api/rooms/:id/messages', { preHandler: [requireAuth, requireRoomMember] }, async (req, reply) => {
    const db = req.server.db
    const roomId = Number((req.params as { id: string }).id)

    // 방 검사 — 404 는 "지목한 대상이 없다", 409 는 "대상은 있으나 그 상태에서는 할 수 없다" (REQ-MSG-004).
    // 어떤 테이블에도 행을 남기지 않는다. multipart 를 소비하기 전에 가른다.
    // 비멤버는 위 게이트에서 이미 같은 404 로 끝났으므로 여기 분기는 멤버에게만 보인다 (REQ-ROOMAUTHZ-013)
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

    // 권한 판정 가로채기 — multipart 파싱 직후(방 active 확인 뒤)·멘션 파싱 앞 (REQ-PERM-005).
    // requireAuth preHandler 를 이미 통과했다 — 미인증 요청은 401 로 끝나고 대기 항목은 손상되지 않는다 (REQ-PERM-012).
    // 옵셔널 체이닝은 의도적이다 — permissions 데코레이터 없이 조립된 서버에서도 이 라우트는 동작한다
    if (req.server.permissions?.tryHandleUserReply(roomId, req.user!.id, body)) {
      return reply.code(200).send({ ok: true, consumed_by: 'permission' })   // 소비된 답은 사용자 메시지로 저장하지 않는다
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
    // 응답에 싣는 것은 id 와 filename 뿐이다 — 클라이언트는 id 하나로 GET /api/attachments/:id 를
    // 부르면 되고, stored_path 는 서버 디렉터리 구조를 노출할 뿐 쓸모가 없다 (sync-audit F-02).
    const attachments: { id: number; filename: string }[] = []
    for (const f of savedFiles) {
      const ar = db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
        .run(messageId, f.filename, f.stored_path, f.size, MIME[extname(f.filename).toLowerCase()] ?? 'application/octet-stream')
      attachments.push({ id: ar.lastInsertRowid as number, filename: f.filename })
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

  // 목록 — 그 방의 메시지 중 id 가 after 보다 큰 것을 오름차순으로 최대 200개 (REQ-MSG-011).
  // id 는 messages.id 그대로다 — 별도 방별 번호를 만들지 않는다 (REQ-MSG-012).
  // 이 라우트는 방을 조회하지 않으므로(아래 쿼리에 rooms 가 없다) 멤버십 게이트가 유일한 문이다 —
  // 비멤버에게는 빈 배열이 아니라 404 로 답한다. 빈 배열은 "메시지 없는 방"과 구별되지 않는다 (REQ-ROOMAUTHZ-009)
  app.get('/api/rooms/:id/messages', { preHandler: [requireAuth, requireRoomMember] }, async req => {
    const db = req.server.db
    const roomId = Number((req.params as { id: string }).id)
    const raw = (req.query as { after?: string }).after
    // 숫자가 아닌 after 는 NaN → SQLite 가 NULL 로 다뤄 id > NULL 이 항상 거짓이라 빈 배열 (엣지 케이스)
    const after = raw === undefined ? 0 : Number(raw)
    const rows = db.prepare('SELECT * FROM messages WHERE room_id = ? AND id > ? ORDER BY id ASC LIMIT 200')
      .all(roomId, after) as { id: number; author_type: string; author_user_id: number | null; author_bot_id: number | null }[]
    return {
      messages: rows.map(m => ({
        ...m,
        author_name: displayName(db, m),
        // stored_path 를 뽑지 않는다 — 목록 응답도 서버 절대 경로를 내보내지 않는다 (sync-audit F-02)
        attachments: db.prepare('SELECT id, filename FROM attachments WHERE message_id = ?').all(m.id),
      })),
    }
  })

  // 다운로드 — 기록된 mime 과 content-disposition attachment(RFC 5987 filename*) 로 응답 (REQ-MSG-008)
  app.get('/api/attachments/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const db = req.server.db
    const id = Number((req.params as { id: string }).id)
    const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id) as
      | { filename: string; stored_path: string; mime: string }
      | undefined
    // 404 본문의 키를 message 로 쓰는 것은 Fastify 기본 오류 봉투와 같은 형태다 — AC-MSG-015 4번이
    // dl.json().message 를 읽어 'Route … not found' 대조를 하므로 이 값은 문자열이어야 한다
    if (!att) return reply.code(404).send({ message: '파일을 찾을 수 없습니다' })
    // 읽기 시점 봉인 — 절대 경로로 풀어 업로드 디렉터리 아래가 아니면 파일을 열지 않고 404 (REQ-MSG-009).
    // REQ-MSG-007 의 쓰기 봉인과 서로의 백스톱이다 — 어느 한쪽이 뚫려도 다른 쪽이 남는다
    if (!resolve(att.stored_path).startsWith(resolve(req.server.uploadsDir) + sep)) {
      return reply.code(404).send({ message: '파일을 찾을 수 없습니다' })
    }
    // N-07 — 행은 남고 디스크 파일이 사라진 경우: createReadStream 의 ENOENT 가 Fastify 기본
    // 500 봉투로 나가면 stored_path 가 본문에 실린다. 스트림을 넘기기 전에 존재를 확인해 404 로 떨군다
    if (!existsSync(att.stored_path)) {
      return reply.code(404).send({ message: '파일을 찾을 수 없습니다' })
    }
    reply.header('content-type', att.mime)
    reply.header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.filename)}`)
    return reply.send(createReadStream(att.stored_path))
  })
}

// author_type 에 따른 작성자 이름 (REQ-MSG-011) — gateway.ts 의 authorName 과 같은 로직이지만
// 순환 참조를 피하려고 의도적으로 여기 다시 쓴다. 공용 모듈로 추출하지 않는다 (spec.md §6)
function displayName(
  db: Db,
  m: { author_type: string; author_user_id: number | null; author_bot_id: number | null },
): string {
  if (m.author_type === 'user') {
    const u = db.prepare('SELECT username FROM users WHERE id = ?').get(m.author_user_id) as { username: string } | undefined
    return u?.username ?? '사용자'
  }
  if (m.author_type === 'bot') {
    const b = db.prepare('SELECT name FROM bots WHERE id = ?').get(m.author_bot_id) as { name: string } | undefined
    return b?.name ?? '봇'
  }
  return '시스템'
}
