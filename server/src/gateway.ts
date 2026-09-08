// 봇 게이트웨이: 채널 플러그인의 WebSocket 접속 창구 — v2 A 단계 (SPEC-BOTMODEL-001 §3.3·§3.5).
// 접속은 봇 단위다: hello{token} → welcome{bot_id, bot_name, rooms}. 확립 뒤 상태는 {botId, connId} 뿐이고
// 방은 프레임(room_id)이 실어 온다. 모든 프레임은 맨몸 JSON 이다 — 봉투·순번·핸드셰이크는 없다.
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'
import { copyFileSync, statSync, realpathSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { resolveTargets } from './targets.js'

export interface MessageRow {
  id: number; room_id: number; author_type: string; author_name: string
  body: string; created_at: string
  // stored_path 는 이 payload 에 싣지 않는다 — 서버 절대 경로가 HTTP 응답으로 새어 나갔다
  // (sync-audit F-02). 봇 프레임의 local_path 는 deliver 가 DB 에서 다시 읽어 채운다.
  attachments?: { id: number; filename: string }[]
}

// 브로커에 넘기는 요청 신원. roomId 는 접속이 아니라 permission_request 프레임의 room_id 에서 온다 (REQ-BOTMODEL-022).
// connId 는 선택 필드다 — 소켓 없이 만들어진 ConnInfo(시험·브로커 직접 호출)는 없을 수 있다 (REQ-PERMROUTE-003)
export interface ConnInfo { roomId: number; botId: number; connId?: string }

// @MX:ANCHOR: [AUTO] 태스크 간 계약 — routes-messages·permissions·routes-bots 셋이 소비하는 공개 표면
// @MX:REASON: deliver·isOnline(botId)·sendToOrigin 의 시그니처를 소비자 셋이 글자 그대로 쓴다. 메서드 하나라도 바꾸면 소비자가 동시에 깨진다
export interface Gateway {
  deliver(roomId: number, msg: MessageRow, targets: { botId: number; delivery: 'to' | 'cc' }[]): void
  closeRoom(roomId: number): void
  // 판정 근거는 접속의 존재다 — 방과 무관하다 (REQ-BOTMODEL-019)
  isOnline(botId: number): boolean
  // 봇 삭제 — 그 봇의 소켓 전부를 닫는다 (토큰이 사라졌으니 재접속은 hello 에서 거절된다). 2026-09-08
  dropBot(botId: number): void
  // 판정을 «요청한 접속 하나» 에게만 되돌리는 통로 (REQ-PERMROUTE-004)
  sendToOrigin(connId: string, payload: object): boolean
  setPermissionHandler(fn: ((info: ConnInfo, params: any) => void) | null): void
}

// 확립된 소켓의 상태 — 방이 없다. 접속 식별자는 hello 한 자리에서만 발급한다 (REQ-PERMROUTE-001)
type Established = { botId: number; connId: string }

// @MX:NOTE: [AUTO] 접속 목록은 메모리에만 있다 — 서버 재시작으로 비면 isOnline 전원 false 가 정상 상태다
// botFilesDir: 봇이 bot_message 로 첨부할 수 있는 파일의 허용 뿌리. 미지정이면 봇 첨부를 전부
// 거부한다(fail-closed) — 검사가 없던 동안 봇 토큰 하나로 서버가 읽는 임의 파일을 uploads 안으로
// 복사해 내려받을 수 있었다 (sync-audit F-01, 유출 재현됨).
export function createGateway(app: FastifyInstance, opts: { uploadsDir: string; botFilesDir?: string }): Gateway {
  const db = app.db
  const hub = app.hub
  const conns = new Map<WebSocket, Established>()
  // 결정 ③ 기본 답 N=6 (가이드 §0)
  const BOT_RUN_LIMIT = 6
  let permissionHandler: ((info: ConnInfo, params: any) => void) | null = null

  const wss = new WebSocketServer({ server: app.server, path: '/bot' })
  // app 이 닫히면 열린 접속을 전부 닫고 WebSocket 서버도 닫는다 — 테스트가 좀비 프로세스를 남기지 않는 조건
  app.addHook('onClose', async () => {
    for (const [ws] of conns) dropConn(ws)
    wss.close()
  })

  wss.on('connection', ws => {
    ws.on('message', raw => {
      let msg: any
      try { msg = JSON.parse(String(raw)) } catch { dropConn(ws); return }   // 비(非)JSON 은 조용히 닫는다
      try { handleWsMessage(ws, msg) } catch { dropConn(ws) }
    })
    ws.on('close', () => { conns.delete(ws) })
  })

  // 서버가 먼저 닫는 경로 — 접속 목록에서 먼저 지운다. 비동기 'close' 정리에만 맡기면 isOnline 이 잠깐 참을 보고한다.
  function dropConn(ws: WebSocket): void {
    conns.delete(ws)
    ws.close()
  }

  // 봇 삭제 뒤 호출 — 접속 맵을 돌며 그 봇의 소켓만 닫는다. 다른 봇의 접속은 건드리지 않는다
  function dropBot(botId: number): void {
    for (const [ws, info] of [...conns]) if (info.botId === botId) dropConn(ws)
  }

  function send(ws: WebSocket, payload: object): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
  }

  // 채널 → 서버 프레임의 방 번호. 정수가 아니면 «없다» 로 본다 — 그 프레임은 system 메시지 없이 버려지고
  // 소켓은 닫지 않는다. 버리기이지 거절이 아니다 (REQ-BOTMODEL-013)
  function roomIdOf(msg: any): number | null {
    return Number.isInteger(msg?.room_id) ? (msg.room_id as number) : null
  }

  // 참여 = room_bots 행. deliver 가 방 밖 봇에게 local_path 를 흘리지 않게 막는 자리다 (위험 4 갈래 ㉯)
  function isMember(roomId: number, botId: number): boolean {
    return db.prepare('SELECT 1 FROM room_bots WHERE room_id = ? AND bot_id = ?').get(roomId, botId) !== undefined
  }

  // 보관 여부는 rooms.status 한 열이다 — welcome 목록의 r.status = 'active' 와 같은 판정 (t43)
  function isActiveRoom(roomId: number): boolean {
    return db.prepare("SELECT 1 FROM rooms WHERE id = ? AND status = 'active'").get(roomId) !== undefined
  }

  // [HARD] 커서를 채우는 자리는 둘이다 — replayMissed(방별 마지막 id)와 deliver(배달한 그 (room_id, bot_id) 행).
  // 한쪽만 고치면 다른 쪽이 조용히 옛 방의 커서를 올린다 (위험 3). 양쪽 다 이 함수를 지난다.
  function advanceCursor(roomId: number, botId: number, lastId: number): void {
    db.prepare('UPDATE room_bots SET last_delivered_id = ? WHERE room_id = ? AND bot_id = ?').run(lastId, roomId, botId)
  }

  function handleWsMessage(ws: WebSocket, msg: any): void {
    if (msg?.type === 'hello') return handleHello(ws, msg)
    const info = conns.get(ws)
    // hello 로 신원을 세우지 못한 접속의 어떤 메시지도 처리하지 않는다 — 닫는 것으로 끝낸다
    if (!info) throw new Error('not authenticated')
    const roomId = roomIdOf(msg)
    if (roomId === null) return   // 네 프레임 모두 room_id 가 필수다 — 없으면 무시 (REQ-BOTMODEL-013)
    // 참여하지 않은 방을 실은 프레임도 같은 자리에서 버린다 — 행·발행·응답 없이, 소켓은 열어 둔다 (A sync 감사 이월 F1, C2).
    // 이 검사가 없던 동안 봇 토큰 하나로 참여하지 않은 방에 글을 쓰고 이력을 읽을 수 있었다
    if (!isMember(roomId, info.botId)) return
    // 보관된 방은 읽기 전용이다 — 봇 글과 상태는 사람 경로의 409 처럼 막되, 봇 쪽은 참여 검사와 같은 «조용히 버림» 이다.
    // 이력 조회와 권한 요청은 그대로 지나간다 (t43, ROADMAP OD-8 처분 2026-09-07)
    if ((msg.type === 'bot_message' || msg.type === 'status') && !isActiveRoom(roomId)) return
    switch (msg.type) {
      case 'bot_message': return handleBotMessage(info, roomId, msg)
      case 'status': {
        // 'working'·'idle' 두 값만 발행 — 그 밖의 값은 조용히 무시한다. 방은 프레임의 것이다 (REQ-BOTMODEL-020)
        if (msg.state === 'working' || msg.state === 'idle') {
          hub.publish(roomId, 'bot_status', { bot_id: info.botId, state: msg.state })
        }
        return
      }
      case 'history_request': return handleHistory(ws, roomId, msg)
      case 'permission_request': {
        // 등록된 핸들러가 없으면 조용히 무시한다 — 판정은 permissions.ts 의 몫.
        // 요청을 낸 접속의 신원을 싣는다 — 방은 접속이 아니라 이 프레임에서 온다 (REQ-BOTMODEL-022, REQ-PERMROUTE-002)
        permissionHandler?.({ roomId, botId: info.botId, connId: info.connId }, msg)
        return
      }
    }
  }

  // 토큰 조회 → 등록 → welcome → 재전송. 모르는 토큰은 어떤 프레임도 답하지 않고 닫는다 (REQ-BOTMODEL-011·012)
  function handleHello(ws: WebSocket, msg: any): void {
    const token = typeof msg.token === 'string' ? msg.token : ''
    const bot = token
      ? db.prepare('SELECT id, name FROM bots WHERE token = ?').get(token) as { id: number; name: string } | undefined
      : undefined
    if (!bot) { dropConn(ws); return }
    // 같은 소켓이 이미 등록된 뒤 다시 hello 를 보내면 이전 등록을 지우고 새로 세운다
    conns.delete(ws)
    const conn: Established = { botId: bot.id, connId: randomUUID() }
    conns.set(ws, conn)
    // rooms 는 그 봇이 참여한 활성 방 전부다 — 보관된 방은 빠진다
    const rooms = db.prepare(
      `SELECT rb.room_id, r.name AS room_name FROM room_bots rb JOIN rooms r ON r.id = rb.room_id
       WHERE rb.bot_id = ? AND r.status = 'active' ORDER BY rb.room_id`,
    ).all(bot.id)
    send(ws, { type: 'welcome', bot_id: bot.id, bot_name: bot.name, rooms })
    replayMissed(ws, conn)
  }

  // 재접속 재전송 — 쿼리 한 번 (REQ-BOTMODEL-018). 그 봇이 타깃인 메시지 중 각 방의 커서 이후 것을 m.id 오름차순으로.
  // JOIN room_bots 가 두 몫을 한다: 방마다 다른 커서를 읽고, 참여가 사라진 방의 메시지를 거른다 (위험 4 갈래 ㉮).
  // 커서 갱신은 방마다 마지막 id 로 — advanceCursor 의 [HARD] 주석이 deliver 와의 짝을 적는다.
  function replayMissed(ws: WebSocket, c: Established): void {
    const missed = db.prepare(
      `SELECT m.*, t.delivery FROM message_targets t
       JOIN messages m ON m.id = t.message_id
       JOIN room_bots rb ON rb.room_id = m.room_id AND rb.bot_id = t.bot_id
       WHERE t.bot_id = ? AND m.id > rb.last_delivered_id ORDER BY m.id`,
    ).all(c.botId) as any[]
    const lastByRoom = new Map<number, number>()
    for (const m of missed) {
      send(ws, messageFrame(m.room_id, m, authorName(m), m.delivery))
      lastByRoom.set(m.room_id, m.id)
    }
    for (const [roomId, lastId] of lastByRoom) advanceCursor(roomId, c.botId, lastId)
  }

  // 봇 접속으로 나가는 message 프레임 — room_id 를 항상 싣는다 (REQ-BOTMODEL-014).
  // [HARD] local_path 는 절대 경로다 (카드 t32 결함 D-8). stored_path 는 dataDir 기본값 './data' 때문에 상대 경로로
  // 저장되는데 봇 세션의 cwd 는 서버와 다르다. DB 값은 손대지 않는다 — 내려받기 봉인(routes-messages.ts)이 resolve() 로 비교한다.
  // 채우는 자리는 replayMissed 와 deliver 둘이고 둘 다 이 함수를 지난다.
  function messageFrame(roomId: number, m: { id: number; body: string; author_type: string }, author: string, delivery: 'to' | 'cc'): object {
    const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(m.id) as any[]
    return {
      type: 'message', room_id: roomId, id: m.id, body: m.body,
      author_name: author, author_type: m.author_type, delivery,
      files: attachments.map(a => ({ name: a.filename, local_path: resolve(a.stored_path) })),
    }
  }

  // author_type 에 따른 작성자 이름 해석 — 참조 행이 없으면 각각 '사용자'/'봇' 으로 대체
  function authorName(m: any): string {
    if (m.author_type === 'user') {
      const u = db.prepare('SELECT username FROM users WHERE id = ?').get(m.author_user_id) as any
      return u?.username ?? '사용자'
    }
    if (m.author_type === 'bot') {
      const b = db.prepare('SELECT name FROM bots WHERE id = ?').get(m.author_bot_id) as any
      return b?.name ?? '(삭제된 봇)'
    }
    return '시스템'
  }

  // 봇 발신 메시지 저장 → 파일 복사 → 허브 발행. 방은 프레임의 room_id 다.
  function handleBotMessage(info: Established, roomId: number, msg: any): void {
    const r = db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, ?)")
      .run(roomId, info.botId, String(msg.body ?? ''))
    const messageId = r.lastInsertRowid as number
    // 허용 뿌리는 한 번만 정규화한다. 미지정이거나 실재하지 않으면 null 이고, 아래 검사가 모든 첨부를 거부한다.
    // realpathSync 를 쓴다 — resolve() 는 어휘적 정규화만 해서 심볼릭 링크를 따라가지 않는데,
    // copyFileSync 는 따라간다. 그 차이로 뿌리 안의 링크가 바깥 내용을 끌어올 수 있었다 (sync-reaudit N-02).
    let filesRoot: string | null = null
    try { filesRoot = opts.botFilesDir ? realpathSync(opts.botFilesDir) : null } catch { filesRoot = null }
    for (const f of (msg.files ?? []) as { local_path?: string; name?: string }[]) {
      try {
        // 출처 경로 봉인 (sync-audit F-01). basename() 은 목적지 이름에만 걸리고 출처에는 걸리지 않아,
        // 이 검사가 없으면 '../..' 없이 절대 경로만으로도 뿌리 밖 파일이 그대로 복사됐다.
        // sep 를 붙여 비교한다 — 붙이지 않으면 '<root>-evil' 같은 접두사 일치가 통과한다.
        // 없는 파일은 realpathSync 가 던지고 아래 catch 가 받는다 — 건너뛰기와 같은 자리다.
        const src = realpathSync(String(f.local_path))
        if (!filesRoot || !src.startsWith(filesRoot + sep)) continue
        // 다섯 컬럼 전부 채운다 — size·mime 은 NOT NULL 이라 빠뜨리면 INSERT 가 제약 위반으로
        // 던지고 이 catch 가 그것을 삼켜 첨부가 조용히 사라진다.
        // size 는 원본의 바이트 크기, mime 은 상수 — 게이트웨이는 내용을 스니핑하지 않는다.
        const size = statSync(src).size
        const stored = join(opts.uploadsDir, `${randomUUID()}-${basename(src)}`)
        copyFileSync(src, stored)
        db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
          .run(messageId, f.name ?? basename(src), stored, size, 'application/octet-stream')
      } catch {
        // 파일이 없으면 그 첨부만 건너뛴다 — 메시지와 나머지 첨부는 그대로
      }
    }
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any
    // stored_path 를 뽑지 않는다 — 이 프레임은 방을 구독한 로그인 사용자 전원에게 가므로
    // HTTP 응답과 같은 규칙이 적용돼야 한다 (sync-reaudit N-01). 봇 프레임은 deliver 가 따로 만든다.
    const attachments = db.prepare('SELECT id, filename FROM attachments WHERE message_id = ?').all(messageId)
    const message = { ...row, author_name: authorName(row), attachments }
    hub.publish(roomId, 'message', message)

    // v2 B — 봇 글의 @TO/@CC 도 전달한다 (가이드 §3). 사람 경로와 같은 room_bots 조회를 지나되, 봇 경로는 응답
    // 프레임이 없으므로 거부·강등을 system 메시지 한 줄로 알린다. 원문은 위에서 이미 저장·발행됐다 — 사람 화면엔 남는다.
    const { targets, unknown } = resolveTargets(db, roomId, message.body)
    if (unknown.length > 0) postSystem(roomId, `${unknown.join(', ')} 봇은 이 방에 초대되지 않았습니다`)
    // 역할 규칙(worker 는 orchestrator 만 부른다)은 2026-09-08 운영자 결정으로 뺐다 — 봇 간 규칙은 각 Claude Code 세션이
    // 정하고, 서버는 방향을 제한하지 않는다. bots.role 은 기록으로만 남는다. 되먹임 방어는 아래 연속 봇 글 상한 하나다
    let allowed = targets
    // 결정 ③ — 마지막 사람 글 이후 봇 글이 연속 N개(지금 글 포함) 이상이면 @TO 를 cc 로 내린다. system 글은 연속을 끊지 않는다
    if (allowed.some(t => t.delivery === 'to') && botRunSinceLastHuman(roomId) >= BOT_RUN_LIMIT) {
      postSystem(roomId, `사람 글 없이 봇 글이 ${BOT_RUN_LIMIT}개 이어져 @TO 를 cc 로 내렸습니다`)
      allowed = allowed.map(t => ({ ...t, delivery: 'cc' as const }))
    }
    for (const t of allowed) {
      db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(messageId, t.botId, t.delivery)
    }
    deliverTo(roomId, message, allowed.map(t => ({ botId: t.botId, delivery: t.delivery })))
  }

  // system 메시지 저장 + 같은 방에 SSE 발행 — permissions.ts 의 postSystem 과 같은 형태 (이벤트 이름은 'message' 하나)
  function postSystem(roomId: number, body: string): void {
    const r = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', ?)").run(roomId, body)
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(r.lastInsertRowid) as Record<string, unknown>
    hub.publish(roomId, 'message', { ...row, author_name: '시스템', attachments: [] })
  }

  // 결정 ③ 의 세기 — 그 방에서 마지막 사람 글보다 뒤에 있는 봇 글 수. SQL 한 번. 사람 글이 없으면 방의 봇 글 전부
  function botRunSinceLastHuman(roomId: number): number {
    return (db.prepare(
      `SELECT COUNT(*) c FROM messages WHERE room_id = ? AND author_type = 'bot'
       AND id > COALESCE((SELECT MAX(id) FROM messages WHERE room_id = ? AND author_type = 'user'), 0)`,
    ).get(roomId, roomId) as { c: number }).c
  }

  // 이력 조회 — 최근 N 개를 먼저 자른 뒤 필터를 적용한다. 응답은 요청한 접속 하나에만 간다 (REQ-BOTMODEL-014·021)
  function handleHistory(ws: WebSocket, roomId: number, msg: any): void {
    const limit = Math.min(Number(msg.limit ?? 100) || 100, 500)
    let rows = db.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?').all(roomId, limit) as any[]
    rows = rows.reverse()
    if (msg.speaker != null) rows = rows.filter(m => authorName(m) === msg.speaker)
    if (msg.since_id != null) rows = rows.filter(m => m.id > Number(msg.since_id))
    if (msg.since != null) rows = rows.filter(m => m.created_at >= msg.since)
    if (msg.until != null) rows = rows.filter(m => m.created_at < msg.until)
    send(ws, {
      type: 'history_response', room_id: roomId, rid: msg.rid,
      messages: rows.map(m => ({ id: m.id, author_name: authorName(m), body: m.body, created_at: m.created_at })),
    })
  }

  // 접속의 봇이 targets 에 있고 room_bots 에 (roomId, botId) 가 있을 때만 보낸다 (REQ-BOTMODEL-016).
  // 커서는 배달한 그 (room_id, bot_id) 행만 올린다 — 같은 봇의 다른 방 커서는 움직이지 않는다 (REQ-BOTMODEL-017).
  // 오프라인 타깃의 커서는 그대로여야 재전송이 성립한다. 사람 경로(deliver)와 봇 경로(handleBotMessage) 둘이 지난다.
  function deliverTo(roomId: number, msg: MessageRow, targets: { botId: number; delivery: 'to' | 'cc' }[]): void {
    for (const [ws, c] of conns) {
      const tr = targets.find(t => t.botId === c.botId)
      if (!tr) continue
      if (!isMember(roomId, c.botId)) continue   // 참여 검사 — 위험 4 갈래 ㉯ 의 방벽
      send(ws, messageFrame(roomId, msg, msg.author_name, tr.delivery))
      advanceCursor(roomId, c.botId, msg.id)      // 자리 ② — replayMissed 의 방별 갱신과 짝
    }
  }

  return {
    deliver: deliverTo,
    // 접속은 봇 단위라 방을 보관해도 닫을 소켓이 없다 — 보관된 방은 다음 welcome 의 rooms 에서 빠진다.
    // 훅 계약(방 보관 → closeRoom 1회)은 routes-rooms.ts 가 그대로 부른다 (REQ-BOTMODEL-010)
    closeRoom(_roomId) {},
    // 판정 근거는 접속의 존재이지 마지막 status 값이 아니다 — 방 무관 (REQ-BOTMODEL-019)
    isOnline(botId) {
      for (const c of conns.values()) if (c.botId === botId) return true
      return false
    },
    dropBot,
    // REQ-PERMROUTE-004 — «그 connId 를 가진 살아 있는 접속 하나» 에게만 보낸다. 다른 어떤 접속에도 보내지 않는다
    sendToOrigin(connId, payload) {
      for (const [ws, c] of conns) if (c.connId === connId) { send(ws, payload); return true }
      return false
    },
    setPermissionHandler(fn) { permissionHandler = fn },
  }
}
