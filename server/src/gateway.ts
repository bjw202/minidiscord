// 봇 게이트웨이: 채널 플러그인의 WebSocket 접속 창구 (spec 6장)
import { WebSocketServer, WebSocket } from 'ws'
import type { FastifyInstance } from 'fastify'
import { sha256Hex } from './routes-bots.js'

export interface MessageRow {
  id: number; room_id: number; author_type: string; author_name: string
  body: string; created_at: string
  attachments?: { id: number; filename: string; stored_path: string }[]
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
export function createGateway(app: FastifyInstance, opts: { uploadsDir: string }): Gateway {
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
      // bot_message·status·history_request·permission_request 분기는 M2 가 추가한다
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
