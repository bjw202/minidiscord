// 봇 게이트웨이: 채널 플러그인의 WebSocket 접속 창구 (spec 6장)
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'
import { copyFileSync, statSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { sha256Hex } from './routes-bots.js'

export interface MessageRow {
  id: number; room_id: number; author_type: string; author_name: string
  body: string; created_at: string
  // stored_path 는 이 payload 에 싣지 않는다 — 서버 절대 경로가 HTTP 응답으로 새어 나갔다
  // (sync-audit F-02). 봇 프레임의 local_path 는 deliver 가 DB 에서 다시 읽어 채운다.
  attachments?: { id: number; filename: string }[]
}

export interface ConnInfo { roomId: number; botId: number }

// @MX:ANCHOR: [AUTO] 태스크 간 계약 — routes-messages(다음 SPEC)·permissions(다음 카드)·routes-bots(이 SPEC) 셋이 소비하는 공개 표면
// @MX:REASON: REQ-GW-021 이 시그니처를 글자 그대로 고정한다. 메서드 하나라도 바꾸면 소비자 세 곳이 동시에 깨진다
export interface Gateway {
  deliver(roomId: number, msg: MessageRow, targets: { botId: number; delivery: 'to' | 'cc' }[]): void
  closeRoom(roomId: number): void
  isOnline(roomId: number, botId: number): boolean
  sendToBot(roomId: number, botId: number, payload: object): boolean
  setPermissionHandler(fn: ((info: ConnInfo, params: any) => void) | null): void
}

// @MX:NOTE: [AUTO] 접속 목록은 메모리에만 있다 — 서버 재시작으로 비면 isOnline 전원 false 가 정상 상태다 (REQ-GW-013)
// botFilesDir: 봇이 bot_message 로 첨부할 수 있는 파일의 허용 뿌리. 미지정이면 봇 첨부를 전부
// 거부한다(fail-closed) — 검사가 없던 동안 봇 토큰 하나로 서버가 읽는 임의 파일을 uploads 안으로
// 복사해 내려받을 수 있었다 (sync-audit F-01, 유출 재현됨).
export function createGateway(app: FastifyInstance, opts: { uploadsDir: string; botFilesDir?: string }): Gateway {
  const db = app.db
  const hub = app.hub
  const conns = new Map<WebSocket, ConnInfo & { tokenRowId: number }>()
  let permissionHandler: ((info: ConnInfo, params: any) => void) | null = null

  const wss = new WebSocketServer({ server: app.server, path: '/bot' })
  // app 이 닫히면 열린 접속을 전부 닫고 WebSocket 서버도 닫는다 — 테스트가 좀비 프로세스를 남기지 않는 조건 (REQ-GW-004)
  app.addHook('onClose', async () => {
    for (const [ws] of conns) dropConn(ws)
    wss.close()
  })

  wss.on('connection', ws => {
    ws.on('message', raw => {
      let msg: any
      try { msg = JSON.parse(String(raw)) } catch { dropConn(ws); return }   // 인자 위치에서 파싱하지 않는다 (plan.md §D 8번)
      handleWsMessage(ws, msg).catch(() => dropConn(ws))
    })
    ws.on('close', () => conns.delete(ws))
  })

  // 서버가 먼저 닫는 경로 — 접속 목록에서 먼저 지운다. 클라이언트 쪽 close 이벤트가
  // 서버 소켓의 close 이벤트보다 먼저 관측될 수 있어, 비동기 'close' 정리에만 맡기면
  // isOnline 이 잠깐 참을 보고한다 (AC-GW-002·016 의 직후 단언).
  function dropConn(ws: WebSocket): void {
    conns.delete(ws)
    ws.close()
  }

  async function handleWsMessage(ws: WebSocket, msg: any): Promise<void> {
    if (msg?.type === 'hello') return handleHello(ws, msg.token)
    const info = conns.get(ws)
    // hello 로 인증되지 않은 접속의 어떤 메시지도 처리하지 않는다 — 닫는 것으로 끝낸다 (REQ-GW-003)
    if (!info) throw new Error('not authenticated')
    switch (msg.type) {
      case 'bot_message': return handleBotMessage(info, msg)
      case 'status': {
        // 'working'·'idle' 두 값만 발행 — 그 밖의 값은 조용히 무시한다 (REQ-GW-012)
        if (msg.state === 'working' || msg.state === 'idle') {
          hub.publish(info.roomId, 'bot_status', { bot_id: info.botId, state: msg.state })
        }
        return
      }
      case 'history_request': return handleHistory(info, msg)
      case 'permission_request': {
        // 등록된 핸들러가 없으면 조용히 무시한다 — 판정은 permissions.ts 의 몫 (REQ-GW-020)
        permissionHandler?.({ roomId: info.roomId, botId: info.botId }, msg)
        return
      }
    }
  }

  // 토큰 조회 → 등록 → last_seen_at 갱신 → welcome → 커서 이후 재전송 → 커서 갱신 (REQ-GW-001·005)
  // 방과 봇은 요청이 아니라 토큰이 결정한다 — 해시로 bot_tokens 를 조회해 역방향으로 얻는다 (spec 9장)
  function handleHello(ws: WebSocket, token: unknown): void {
    const row = db.prepare(
      `SELECT t.id AS token_row_id, t.room_id, t.bot_id, t.last_delivered_id, b.name AS bot_name
       FROM bot_tokens t JOIN rooms r ON r.id = t.room_id JOIN bots b ON b.id = t.bot_id
       WHERE t.token_hash = ? AND t.revoked_at IS NULL AND r.status = 'active'`,
    ).get(sha256Hex(String(token ?? ''))) as
      | { token_row_id: number; room_id: number; bot_id: number; last_delivered_id: number; bot_name: string }
      | undefined
    // 없는 해시·철회된 토큰·보관된 방은 전부 이 한 곳에서 걸러진다 (REQ-GW-002)
    if (!row) { dropConn(ws); return }
    conns.set(ws, { roomId: row.room_id, botId: row.bot_id, tokenRowId: row.token_row_id })
    db.prepare("UPDATE bot_tokens SET last_seen_at=datetime('now') WHERE id=?").run(row.token_row_id)
    send(ws, { type: 'welcome', room_id: row.room_id, bot_id: row.bot_id, bot_name: row.bot_name, missed_after_id: row.last_delivered_id })
    // 놓친 메시지 재전송: 그 봇이 타깃인 메시지 중 같은 방의 커서 이후 것을 번호 오름차순으로
    const missed = db.prepare(
      `SELECT m.*, t.delivery FROM message_targets t JOIN messages m ON m.id = t.message_id
       WHERE t.bot_id = ? AND m.room_id = ? AND m.id > ? ORDER BY m.id`,
    ).all(row.bot_id, row.room_id, row.last_delivered_id) as any[]
    for (const m of missed) sendStoredMessage(ws, m)
    if (missed.length > 0) {
      db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE id = ?').run(missed[missed.length - 1].id, row.token_row_id)
    }
  }

  function sendStoredMessage(ws: WebSocket, m: any): void {
    const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(m.id) as any[]
    send(ws, {
      type: 'message', id: m.id, body: m.body,
      author_name: authorName(m),
      delivery: m.delivery,
      files: attachments.map(a => ({ name: a.filename, local_path: a.stored_path })),
    })
  }

  // author_type 에 따른 작성자 이름 해석 — 참조 행이 없으면 각각 '사용자'/'봇' 으로 대체 (REQ-GW-016)
  function authorName(m: any): string {
    if (m.author_type === 'user') {
      const u = db.prepare('SELECT username FROM users WHERE id = ?').get(m.author_user_id) as any
      return u?.username ?? '사용자'
    }
    if (m.author_type === 'bot') {
      const b = db.prepare('SELECT name FROM bots WHERE id = ?').get(m.author_bot_id) as any
      return b?.name ?? '봇'
    }
    return '시스템'
  }

  function send(ws: WebSocket, payload: object): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
  }

  // 봇 발신 메시지 저장 → 파일 복사 → 허브 발행 (REQ-GW-010·011)
  function handleBotMessage(info: ConnInfo & { tokenRowId: number }, msg: any): void {
    const r = db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, ?)")
      .run(info.roomId, info.botId, String(msg.body ?? ''))
    const messageId = r.lastInsertRowid as number
    // 허용 뿌리는 한 번만 정규화한다. 미지정이면 null 이고, 아래 검사가 모든 첨부를 거부한다.
    const filesRoot = opts.botFilesDir ? resolve(opts.botFilesDir) : null
    for (const f of (msg.files ?? []) as { local_path?: string; name?: string }[]) {
      try {
        // 출처 경로 봉인 (sync-audit F-01). basename() 은 목적지 이름에만 걸리고 출처에는 걸리지 않아,
        // 이 검사가 없으면 '../..' 없이 절대 경로만으로도 뿌리 밖 파일이 그대로 복사됐다.
        // sep 를 붙여 비교한다 — 붙이지 않으면 '<root>-evil' 같은 접두사 일치가 통과한다.
        const src = resolve(String(f.local_path))
        if (!filesRoot || !src.startsWith(filesRoot + sep)) continue
        // 다섯 컬럼 전부 채운다 — size·mime 은 NOT NULL 이라 빠뜨리면 INSERT 가 제약 위반으로
        // 던지고 이 catch 가 그것을 삼켜 첨부가 조용히 사라진다 (plan.md §D 9번).
        // size 는 원본의 바이트 크기, mime 은 상수 — 게이트웨이는 내용을 스니핑하지 않는다.
        const size = statSync(src).size
        const stored = join(opts.uploadsDir, `${randomUUID()}-${basename(src)}`)
        copyFileSync(src, stored)
        db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
          .run(messageId, f.name ?? basename(src), stored, size, 'application/octet-stream')
      } catch {
        // 파일이 없으면 그 첨부만 건너뛴다 — 메시지와 나머지 첨부는 그대로 (REQ-GW-011)
      }
    }
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any
    const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(messageId)
    hub.publish(info.roomId, 'message', { ...row, author_name: authorName(row), attachments })
  }

  // 이력 조회 — 최근 N 개를 먼저 자른 뒤 필터를 적용한다 (plan.md §D 6번의 순서)
  function handleHistory(info: ConnInfo, msg: any): void {
    const limit = Math.min(Number(msg.limit ?? 100) || 100, 500)
    let rows = db.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?').all(info.roomId, limit) as any[]
    rows = rows.reverse()
    if (msg.speaker != null) rows = rows.filter(m => authorName(m) === msg.speaker)
    if (msg.since_id != null) rows = rows.filter(m => m.id > Number(msg.since_id))
    if (msg.since != null) rows = rows.filter(m => m.created_at >= msg.since)
    if (msg.until != null) rows = rows.filter(m => m.created_at < msg.until)
    sendToConn(info, {
      type: 'history_response', rid: msg.rid,
      messages: rows.map(m => ({ id: m.id, author_name: authorName(m), body: m.body, created_at: m.created_at })),
    })
  }

  // 같은 (방, 봇) 의 접속에만 보낸다 — 같은 방의 다른 봇에게는 새지 않는다 (REQ-GW-017)
  function sendToConn(info: ConnInfo, payload: object): void {
    for (const [ws, c] of conns) if (c.roomId === info.roomId && c.botId === info.botId) send(ws, payload)
  }

  return {
    // 타깃에만 보내고 보낸 접속의 커서만 올린다 — 오프라인 타깃의 커서는 그대로여야 재전송이 성립한다 (REQ-GW-007·008)
    deliver(roomId, msg, targets) {
      const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(msg.id) as any[]
      for (const [ws, c] of conns) {
        if (c.roomId !== roomId) continue
        const tr = targets.find(t => t.botId === c.botId)
        if (!tr) continue
        send(ws, {
          type: 'message', id: msg.id, body: msg.body, author_name: msg.author_name, delivery: tr.delivery,
          files: attachments.map(a => ({ name: a.filename, local_path: a.stored_path })),
        })
        db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE id = ?').run(msg.id, c.tokenRowId)
      }
    },
    // 그 방의 접속만 닫는다 — 다른 방은 열린 채로 남는다 (REQ-GW-019)
    closeRoom(roomId) {
      for (const [ws, c] of conns) if (c.roomId === roomId) dropConn(ws)
    },
    // 판정 근거는 접속의 존재이지 마지막 status 값이 아니다 (REQ-GW-013)
    isOnline(roomId, botId) {
      for (const c of conns.values()) if (c.roomId === roomId && c.botId === botId) return true
      return false
    },
    // 접속이 없으면 아무것도 보내지 않고 false — "오프라인이라 못 보냈다"의 유일한 신호 (REQ-GW-020)
    sendToBot(roomId, botId, payload) {
      for (const [ws, c] of conns) if (c.roomId === roomId && c.botId === botId) { send(ws, payload); return true }
      return false
    },
    setPermissionHandler(fn) { permissionHandler = fn },
  }
}
