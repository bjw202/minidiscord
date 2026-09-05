// AC-WSUPGRADE-012 변이 커밋 — 생산 코드 한 줄 (M4 변이 창, 곧 reset 으로 되돌림)
// v2 상호 인증 (SPEC-GWAUTH-002): hello{pub, client_nonce} → challenge → auth → 봉투(env) welcome.
// 서버는 한 번도 평문 토큰을 본 적 없는 검증자(verifier_pub)로 조회하고, 저장한 server_confirm_key 로
// 자신을 증명하며, 확립 이후 내보내는 모든 프레임을 봉투에 담는다.
import { WebSocketServer, WebSocket } from 'ws'
import { createHmac, createPublicKey, randomBytes, randomUUID, verify } from 'node:crypto'
import { TLSSocket } from 'node:tls'
import { copyFileSync, statSync, realpathSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import type { FastifyInstance } from 'fastify'

export interface MessageRow {
  id: number; room_id: number; author_type: string; author_name: string
  body: string; created_at: string
  // stored_path 는 이 payload 에 싣지 않는다 — 서버 절대 경로가 HTTP 응답으로 새어 나갔다
  // (sync-audit F-02). 봇 프레임의 local_path 는 deliver 가 DB 에서 다시 읽어 채운다.
  attachments?: { id: number; filename: string }[]
}

// connId 는 선택 필드다 — 소켓 확립에서 발급되지만 소켓 없이 만들어진 ConnInfo(시험·브로커 직접 호출)는 없을 수 있다 (REQ-PERMROUTE-003, 리드 처분: 선택)
export interface ConnInfo { roomId: number; botId: number; connId?: string }

// @MX:ANCHOR: [AUTO] 태스크 간 계약 — routes-messages(다음 SPEC)·permissions(다음 카드)·routes-bots(이 SPEC) 셋이 소비하는 공개 표면
// @MX:REASON: REQ-GW-021 이 시그니처를 글자 그대로 고정한다. 메서드 하나라도 바꾸면 소비자 세 곳이 동시에 깨진다
export interface Gateway {
  deliver(roomId: number, msg: MessageRow, targets: { botId: number; delivery: 'to' | 'cc' }[]): void
  closeRoom(roomId: number): void
  isOnline(roomId: number, botId: number): boolean
  sendToBot(roomId: number, botId: number, payload: object): boolean
  // 판정을 «요청한 접속 하나» 에게만 되돌리는 통로 — sendToConn(비공개 전원 발신)과 정반대 배달이라 이름을 빌리지 않았다 (REQ-PERMROUTE-004)
  sendToOrigin(connId: string, payload: object): boolean
  setPermissionHandler(fn: ((info: ConnInfo, params: any) => void) | null): void
}

// 확립된 소켓의 상태 — 전부 소켓 지역이다 (plan.md §D-8). sessKey 는 이 소켓의 논스·pub·cb 에서만
// 유도되고, seq 는 이 맵이 유일한 보관장소라 소켓 사이에서 이어지지 않는다 (REQ-GWAUTH2-010·013)
// Established 는 connId 를 필수로 좁힌다 — 발급 누락이 타입에서 잡히는 비대칭 (plan.md §D-1)
type Established = ConnInfo & { connId: string; tokenRowId: number; sessKey: Buffer; seq: number }
// challenge 를 보낸 뒤 auth 를 기다리는 소켓의 상태 — 이 자리에는 등록 권한이 없다 (REQ-GWAUTH2-009)
type PendingHandshake = {
  roomId: number; botId: number; tokenRowId: number
  verifierPub: string; clientNonce: string; serverNonce: string; confirmKey: Buffer
  botName: string; lastDeliveredId: number; cb: string
}

// 공개키 DER 머리 — Ed25519 고정값. 개인키 접두와 유도 라벨 셋의 쌍대 정본은 server/src/routes-bots.ts 의
// deriveBotKeys(§D-9)가 지고, 검증층인 이 파일은 공개키 접두를 지른다. 채널 쪽 쌍은 channel/src/gateway-client.ts (M3)
const SPKI_ED25519_PREFIX = '302a300506032b6570032100'

// @MX:ANCHOR: [AUTO] v2 채널 바인딩 유도의 서버 정본 — 라벨·길이·호출 형태가 이 함수 안에만 있다 (plan.md §D-10)
// @MX:REASON: 채널 쪽 쌍(channel/src/gateway-client.ts, M3)과 글자 그대로 같아야 같은 TLS 연결의 두 종단이 같은 cb 를 얻는다
// — 3인자 호출은 «길이 0 컨텍스트» 와 다른 값을 낳으므로 2인자만 쓴다. 실패·부재는 전부 'unbound' 로 떨어뜨린다 —
// 예외는 REQ-GWAUTH2-016 이, 바인딩 부재의 접속 거절은 REQ-GWAUTH2-020 이 금지한다. 오늘 이 저장소의 서버는 TLS 를
// 종단하지 않으므로(spec.md §2.8.4 실측) 현 배치에서는 언제나 'unbound' 다
function channelBinding(ws: WebSocket): string {
  const BINDING_LABEL = 'EXPORTER-minidiscord/v2/channel-binding'
  const BINDING_BYTES = 32
  try {
    const sock = (ws as unknown as { _socket?: unknown })._socket
    if (!(sock instanceof TLSSocket)) return 'unbound'
    // 2인자 형태만 쓴다 — 설치된 @types/node 는 3인자 overload 만 표기하지만 런타임은 컨텍스트를 생략하는
    // 2인자를 지원하고, 컨텍스트를 넘기면 «생략» 과 «길이 0» 이 갈라 D-10 의 쌍대 조건이 깨진다.
    // 그래서 호출 형태를 여기 직접 박는다
    const exporter = sock as unknown as { exportKeyingMaterial?: (bytes: number, label: string) => Buffer }
    if (typeof exporter.exportKeyingMaterial !== 'function') return 'unbound'
    return exporter.exportKeyingMaterial(BINDING_BYTES, BINDING_LABEL).toString('hex')
  } catch {
    return 'unbound'
  }
}

// @MX:ANCHOR: [AUTO] v2 핸드셰이크 전사·세션 전사의 서버 정본 — 라벨 셋(challenge·auth·session)과 구분자가 이 함수 하나에 모여 있다 (plan.md §D-9)
// @MX:REASON: 채널은 server/ 를 import 할 수 없어 같은 규칙의 사본을 지닌다(channel/src/gateway-client.ts, M3) —
// 사본이 한 글자라도 갈리면 정상 구현이 거짓 실패하고 그 갈림은 왕복 기준(AC-GWAUTH2-020)만 잡는다. challenge 와 auth 의
// 전사가 라벨 하나로만 다른 이유는, 라벨이 없으면 한쪽 증명이 다른 쪽 자리에서 통하기 때문이다(design.md §C)
function handshakeTranscript(
  kind: 'challenge' | 'auth' | 'session',
  clientNonce: string, serverNonce: string, room: number | string, bot: number | string, pub: string, cb: string,
): string {
  const SEP = '|'
  if (kind === 'session') return `session${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${cb}`
  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`
}

// @MX:NOTE: [AUTO] 접속 목록은 메모리에만 있다 — 서버 재시작으로 비면 isOnline 전원 false 가 정상 상태다 (REQ-GW-013)
// botFilesDir: 봇이 bot_message 로 첨부할 수 있는 파일의 허용 뿌리. 미지정이면 봇 첨부를 전부
// 거부한다(fail-closed) — 검사가 없던 동안 봇 토큰 하나로 서버가 읽는 임의 파일을 uploads 안으로
// 복사해 내려받을 수 있었다 (sync-audit F-01, 유출 재현됨).
// onConnection: 하네스가 서버 쪽 소켓을 관측하는 유일한 창구 (SPEC-GWAUTH-002 acceptance.md §「서버
// 소켓 프레임 기록」 — recordSocket 의 부착점). 생산 경로는 넘기지 않는다 — 옵션이 없으면 아무 일도 하지 않는다.
export function createGateway(app: FastifyInstance, opts: { uploadsDir: string; botFilesDir?: string; onConnection?: (ws: WebSocket) => void }): Gateway {
  const db = app.db
  const hub = app.hub
  const conns = new Map<WebSocket, Established>()
  const handshakes = new Map<WebSocket, PendingHandshake>()
  let permissionHandler: ((info: ConnInfo, params: any) => void) | null = null

  const wss = new WebSocketServer({ server: app.server, path: '/bot' })
  // app 이 닫히면 열린 접속을 전부 닫고 WebSocket 서버도 닫는다 — 테스트가 좀비 프로세스를 남기지 않는 조건 (REQ-GW-004)
  app.addHook('onClose', async () => {
    for (const [ws] of conns) dropConn(ws)
    for (const [ws] of handshakes) dropConn(ws)
    wss.close()
  })

  wss.on('connection', ws => {
    opts.onConnection?.(ws)
    ws.on('message', raw => {
      let msg: any
      try { msg = JSON.parse(String(raw)) } catch { dropConn(ws); return }   // 인자 위치에서 파싱하지 않는다 (plan.md §D 8번)
      handleWsMessage(ws, msg).catch(() => dropConn(ws))
    })
    ws.on('close', () => {
      handshakes.delete(ws)
      conns.delete(ws)
    })
  })

  // 서버가 먼저 닫는 경로 — 접속 목록에서 먼저 지운다. 클라이언트 쪽 close 이벤트가
  // 서버 소켓의 close 이벤트보다 먼저 관측될 수 있어, 비동기 'close' 정리에만 맡기면
  // isOnline 이 잠깐 참을 보고한다 (AC-GW-002·016 의 직후 단언).
  function dropConn(ws: WebSocket): void {
    handshakes.delete(ws)
    conns.delete(ws)
    ws.close()
  }

  async function handleWsMessage(ws: WebSocket, msg: any): Promise<void> {
    if (msg?.type === 'hello') return handleHello(ws, msg)
    if (msg?.type === 'auth') return handleAuth(ws, msg)
    const info = conns.get(ws)
    // hello·auth 로 증명하지 못한 접속의 어떤 메시지도 처리하지 않는다 — 닫는 것으로 끝낸다 (REQ-GW-003·REQ-GWAUTH2-009)
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
        // 요청을 낸 접속의 신원을 싣는다 — 판정이 «그 접속 하나» 로 되돌아가는 근거 (REQ-PERMROUTE-002)
        permissionHandler?.({ roomId: info.roomId, botId: info.botId, connId: info.connId }, msg)
        return
      }
    }
  }

  // pub 조회 → challenge 발신. 이 자리에서는 등록하지 않는다 — 등록은 auth 서명 검증 통과 시점이다 (REQ-GWAUTH2-009).
  // 방과 봇은 요청이 아니라 저장된 검증자가 결정한다 — verifier_pub 로 bot_tokens 를 조회해 역방향으로 얻는다 (REQ-GWAUTH2-005)
  function handleHello(ws: WebSocket, msg: any): void {
    const pub = typeof msg.pub === 'string' ? msg.pub : ''
    const clientNonce = typeof msg.client_nonce === 'string' ? msg.client_nonce : ''
    // pub 이 없는 hello — v1 형태 { type:'hello', token } 을 포함해 — 형식 검사 하나에서 같이 닫힌다.
    // 갈래를 나눠 다르게 대하지 않는 것은 응답 차이로 상대가 어느 갈래에 걸렸는지 알아내지 않게 하기 위해서다
    // (REQ-GWAUTH2-017 — 하향 협상 경로를 남기지 않는다)
    if (!/^[0-9a-f]{64}$/.test(pub) || !/^[0-9a-f]{64}$/.test(clientNonce)) { dropConn(ws); return }
    const row = db.prepare(
      `SELECT t.id AS token_row_id, t.room_id, t.bot_id, t.last_delivered_id, t.server_confirm_key, b.name AS bot_name
       FROM bot_tokens t JOIN rooms r ON r.id = t.room_id JOIN bots b ON b.id = t.bot_id
       WHERE t.verifier_pub = ? AND t.revoked_at IS NULL AND r.status = 'active'`,
    ).get(pub) as
      | { token_row_id: number; room_id: number; bot_id: number; last_delivered_id: number; server_confirm_key: string; bot_name: string }
      | undefined
    // 모르는 pub·철회된 토큰·보관된 방은 전부 이 한 곳에서 걸러지고, 어떤 프레임도 답하지 않는다 (REQ-GW-002·REQ-GWAUTH2-005)
    if (!row) { dropConn(ws); return }
    // 같은 소켓이 이미 등록된 뒤 다시 hello 를 보내면 이전 등록을 먼저 지운다 — 새 등록은 여전히 auth 서명을 통과해야만 세워진다
    conns.delete(ws)
    // server_nonce 는 hello 마다 새로 만들고 소켓 지역에만 둔다 — 소켓 밖 클로저의 재사용은 REQ-GWAUTH2-010 이 금지한다
    const serverNonce = randomBytes(32).toString('hex')
    const cb = channelBinding(ws)
    const handshake: PendingHandshake = {
      roomId: row.room_id, botId: row.bot_id, tokenRowId: row.token_row_id,
      verifierPub: pub, clientNonce, serverNonce,
      confirmKey: Buffer.from(row.server_confirm_key, 'hex'),
      botName: row.bot_name, lastDeliveredId: row.last_delivered_id, cb,
    }
    handshakes.set(ws, handshake)
    const serverProof = createHmac('sha256', handshake.confirmKey)
      .update(handshakeTranscript('challenge', clientNonce, serverNonce, row.room_id, row.bot_id, pub, cb))
      .digest('hex')
    // challenge 는 확립 이전 프레임이라 봉투에 담지 않는다 — 봉투는 확립 이후에만 씌운다 (plan.md §D-4·D-6)
    send(ws, { type: 'challenge', server_nonce: serverNonce, room_id: row.room_id, bot_id: row.bot_id, server_proof: serverProof })
  }

  // 서명 검증 → 등록 → welcome(봉투) → 커서 이후 재전송 → 커서 갱신 (REQ-GWAUTH2-009·012)
  function handleAuth(ws: WebSocket, msg: any): void {
    const hs = handshakes.get(ws)
    // challenge 를 거치지 않고 온 auth 는 절차 위반이다 — 아무 것도 등록하지 않고 닫는다 (REQ-GWAUTH2-017 의 따름정리)
    if (!hs) { dropConn(ws); return }
    handshakes.delete(ws)
    const signature = typeof msg.signature === 'string' ? msg.signature : ''
    // 길이·형식 검사가 대조보다 먼저 — 128자 소문자 hex 가 아니면 검증 함수에 들어가지도 않는다 (REQ-GWAUTH2-016).
    // 대조는 문자열 비교(===)가 아니라 Ed25519 검증 한 번으로 끝난다 — «=== 로 대조한다» 안티패턴이 설 자리가 없다 (plan.md §G)
    if (!/^[0-9a-f]{128}$/.test(signature)) { dropConn(ws); return }
    const message = Buffer.from(
      handshakeTranscript('auth', hs.clientNonce, hs.serverNonce, hs.roomId, hs.botId, hs.verifierPub, hs.cb),
    )
    const ok = verify(
      null, message,
      createPublicKey({ key: Buffer.concat([Buffer.from(SPKI_ED25519_PREFIX, 'hex'), Buffer.from(hs.verifierPub, 'hex')]), format: 'der', type: 'spki' }),
      Buffer.from(signature, 'hex'),
    )
    if (!ok) { dropConn(ws); return }
    const conn: Established = {
      roomId: hs.roomId, botId: hs.botId, tokenRowId: hs.tokenRowId,
      // 접속 식별자는 등록 자리 하나에서만 발급한다 (REQ-PERMROUTE-001) — 이 구성 자리가 그 하나다
      connId: randomUUID(),
      // 세션 열쇠는 이 소켓의 논스·pub·cb 에서 유도한다 — k_srv 를 아는 상대도 논스와 cb 없이는 못 만든다 (design.md §C)
      sessKey: createHmac('sha256', hs.confirmKey)
        .update(handshakeTranscript('session', hs.clientNonce, hs.serverNonce, hs.roomId, hs.botId, hs.verifierPub, hs.cb))
        .digest(),
      seq: 1,   // 소켓마다 1 에서 시작해 프레임마다 정확히 1 (REQ-GWAUTH2-013)
    }
    conns.set(ws, conn)   // 등록이 옮겨 온 자리 — v1 은 hello 조회 성공에서 등록해 인증이 등록보다 늦었다 (REQ-GWAUTH2-009)
    db.prepare("UPDATE bot_tokens SET last_seen_at=datetime('now') WHERE id=?").run(hs.tokenRowId)
    // welcome 도 봉투 안이다 — 예외 종류를 하나라도 두면 그 종류가 주입 통로가 된다 (design.md §B.2)
    sendEstablished(conn, ws, { type: 'welcome', room_id: hs.roomId, bot_id: hs.botId, bot_name: hs.botName, missed_after_id: hs.lastDeliveredId })
    // 놓친 메시지 재전송: 그 봇이 타깃인 메시지 중 같은 방의 커서 이후 것을 번호 오름차순으로
    const missed = db.prepare(
      `SELECT m.*, t.delivery FROM message_targets t JOIN messages m ON m.id = t.message_id
       WHERE t.bot_id = ? AND m.room_id = ? AND m.id > ? ORDER BY m.id`,
    ).all(hs.botId, hs.roomId, hs.lastDeliveredId) as any[]
    for (const m of missed) sendStoredMessage(conn, ws, m)
    if (missed.length > 0) {
      db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE id = ?').run(missed[missed.length - 1].id, hs.tokenRowId)
    }
  }

  // [HARD] 봇 프레임의 local_path 는 절대 경로다 (카드 t32 결함 D-8). attachments.stored_path 는
  // config.dataDir 기본값 './data' 때문에 상대 경로로 저장되는데, 봇 세션의 cwd 는 서버와 다르므로
  // 그대로 넘기면 풀리지 않는다. DB 값은 손대지 않는다 — 내려받기 봉인(routes-messages.ts REQ-MSG-009)이
  // 이미 resolve() 로 비교하므로 저장 형태를 바꾸면 그쪽 계약이 함께 움직인다.
  // 채우는 자리는 여기와 deliver 둘이다 — 한쪽만 고치면 다른 쪽이 조용히 상대 경로를 넘긴다.
  function sendStoredMessage(c: Established, ws: WebSocket, m: any): void {
    const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(m.id) as any[]
    sendEstablished(c, ws, {
      type: 'message', id: m.id, body: m.body,
      author_name: authorName(m),
      delivery: m.delivery,
      files: attachments.map(a => ({ name: a.filename, local_path: resolve(a.stored_path) })),
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

  // @MX:ANCHOR: [AUTO] v2 봉투 함수 — 확립 소켓이 내보내는 모든 프레임이 지나는 유일한 출구 (plan.md §D-6)
  // @MX:REASON: 한 자리라도 봉투를 빠뜨리면 그 프레임은 채널에서 조용히 버려진다 — 진단이 가장 어려운 실패 형태다.
  // 발신 지점 여섯(welcome · sendStoredMessage 재전송 · sendToConn/history_response · deliver · sendToBot · sendToOrigin)이 전부
  // 이 함수를 지나는가가 M2 의 덮개 대조표다. seq 는 여기서만 증가하고 payload 는 문자열 그대로 MAC 된다 (REQ-GWAUTH2-012·013)
  function sendEstablished(c: Established, ws: WebSocket, inner: object): void {
    const payload = JSON.stringify(inner)   // 서버가 만든 문자열 그대로 MAC 한다 — 정규화 규칙이 존재하지 않는다 (plan.md §D-6)
    const seq = c.seq++
    const mac = createHmac('sha256', c.sessKey).update(`${seq}|${payload}`).digest('hex')
    send(ws, { type: 'env', seq, payload, mac })
  }

  // 봇 발신 메시지 저장 → 파일 복사 → 허브 발행 (REQ-GW-010·011)
  function handleBotMessage(info: ConnInfo & { tokenRowId: number }, msg: any): void {
    const r = db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, ?)")
      .run(info.roomId, info.botId, String(msg.body ?? ''))
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
        // 없는 파일은 realpathSync 가 던지고 아래 catch 가 받는다 — REQ-GW-011 의 건너뛰기와 같은 자리다.
        const src = realpathSync(String(f.local_path))
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
    // stored_path 를 뽑지 않는다 — 이 프레임은 방을 구독한 로그인 사용자 전원에게 가므로
    // HTTP 응답과 같은 규칙이 적용돼야 한다 (sync-reaudit N-01). 봇 프레임은 deliver 가 따로 만든다.
    const attachments = db.prepare('SELECT id, filename FROM attachments WHERE message_id = ?').all(messageId)
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

  // 같은 (방, 봇) 의 접속에만 보낸다 — 같은 방의 다른 봇에게는 새지 않는다 (REQ-GW-017).
  // conns 에는 auth 를 통과한 소켓만 있으므로 여기서 나가는 프레임은 전부 봉투를 입는다 (REQ-GWAUTH2-012)
  function sendToConn(info: ConnInfo, payload: object): void {
    for (const [ws, c] of conns) if (c.roomId === info.roomId && c.botId === info.botId) sendEstablished(c, ws, payload)
  }

  return {
    // 타깃에만 보내고 보낸 접속의 커서만 올린다 — 오프라인 타깃의 커서는 그대로여야 재전송이 성립한다 (REQ-GW-007·008)
    deliver(roomId, msg, targets) {
      const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(msg.id) as any[]
      for (const [ws, c] of conns) {
        if (c.roomId !== roomId) continue
        const tr = targets.find(t => t.botId === c.botId)
        if (!tr) continue
        sendEstablished(c, ws, {
          type: 'message', id: msg.id, body: msg.body, author_name: msg.author_name, delivery: tr.delivery,
          files: attachments.map(a => ({ name: a.filename, local_path: resolve(a.stored_path) })),
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
    // 일치하는 접속 «전원» 에게 보낸다 — deliver 와 같은 갈래다 (카드 t32 §D 결함 D-5).
    sendToBot(roomId, botId, payload) {
      let sent = false
      for (const [ws, c] of conns) if (c.roomId === roomId && c.botId === botId) { sendEstablished(c, ws, payload); sent = true }
      return sent
    },
    // REQ-PERMROUTE-004 — «그 connId 를 가진 살아 있는 접속 하나» 에게만 보낸다. sendEstablished 를
    // 지나므로 봉투 규칙이 승계되고(REQ-GWAUTH2-012), 다른 어떤 접속에도 보내지 않는다(REQ-PERMROUTE-005)
    sendToOrigin(connId, payload) {
      for (const [ws, c] of conns) if (c.connId === connId) { sendEstablished(c, ws, payload); return true }
      return false
    },
    setPermissionHandler(fn) { permissionHandler = fn },
  }
}
