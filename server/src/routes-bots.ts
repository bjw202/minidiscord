// 봇 등록/목록/초대 API (표시용 정보만 — 페르소나는 각 세션 디렉터리가 담당)
import type { FastifyInstance } from 'fastify'
import { createHash, createHmac, createPrivateKey, createPublicKey, randomBytes } from 'node:crypto'
import { requireAuth } from './auth.js'
import { requireRoomMember } from './room-members.js'
import { config } from './config.js'
import type { Gateway } from './gateway.js'

// @MX:ANCHOR: [AUTO] v1 토큰 해시 유도 — 이행기 계약. v2 에서 bot_tokens 저장은 이 함수를 쓰지 않는다(§D-3).
// 남은 소비자는 v1 조회 경로뿐이다: server/src/gateway.ts 의 handleHello 가 쓰는 hello 조회와, 같은 유도로 v1 모양
// 행을 심는 형제 하네스 셋(server/test 다섯 파일 · channel/test/gateway-mutual-auth.test.ts). gateway-client.ts 의
// v1 hello 전송도 같은 값을 쓴다. 마지막 소비자가 M2(게이트웨이 v2 핸드셰이크)와 M3/M4(채널·하네스)에서 떠나면
// 이 함수는 지운다 — 줄 번호를 적지 않은 이유는 두 파일 모두 이 카드의 뒤 마일스톤이 고치기 때문이다
// @MX:REASON: v1 발급(여기)과 v1 조회(gateway)가 같은 해시를 쓰게 하는 것이 지금의 유일한 계약이다 — v2 검증자
// 계약은 아래 deriveBotKeys 가 대신한다. 형식을 바꾸면 남은 v1 조회 경로가 전부 어긋난다
export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

// @MX:ANCHOR: [AUTO] v2 열쇠 유도의 정본 위치 — 서명·확인 열쇠 라벨과 Ed25519 DER 접두가 이 함수 하나에 모여 있다 (SPEC-GWAUTH-002 plan.md §D-9)
// @MX:REASON: 채널(channel/src/gateway-client.ts)은 server/ 를 import 할 수 없어 같은 규칙의 사본을 지닌다 —
// 사본이 갈라지면 정상 구현이 거짓 실패하고 그 어긋남은 왕복 기준(AC-GWAUTH2-020)만이 잡는다. 양쪽 사본의
// @MX:ANCHOR 가 서로를 가리켜 한쪽 고침이 다른 쪽을 따라오게 한다. 라벨이나 접두를 바꾸면 이미 발급된 초대가
// 전부 무효가 된다 — 검증자 저장 계약(REQ-GWAUTH2-003)과 결정적 유도(REQ-GWAUTH2-001)가 이 함수 위에 선다
// 서명 개인키(sk)는 유도에만 쓰고 돌려주지 않는다 — 개인키는 프로세스 메모리를 벗어나지 않는다(REQ-GWAUTH2-001)
export function deriveBotKeys(token: string): { verifierPub: string; serverConfirmKey: string } {
  const SIGN_LABEL = 'minidiscord/v2/sign'
  const CONFIRM_LABEL = 'minidiscord/v2/server-confirm'
  const PKCS8_ED25519_PREFIX = '302e020100300506032b657004220420' // 개인키 DER 머리 — Ed25519 고정값, 값에 따라 변하지 않는다
  const seed = createHmac('sha256', token).update(SIGN_LABEL).digest()
  const sk = createPrivateKey({ key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, 'hex'), seed]), format: 'der', type: 'pkcs8' })
  const verifierPub = createPublicKey(sk).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
  const serverConfirmKey = createHmac('sha256', token).update(CONFIRM_LABEL).digest('hex')
  return { verifierPub, serverConfirmKey }
}

// @MX:NOTE: [AUTO] 세션 실행 명령 안내 문자열 — 포트 기본값을 두지 않고 호출부가 config.port 를 넘기게 한다 (plan.md §D 2)
function inviteCommand(token: string, port: number): string {
  return [
    '# 1회 등록 (최초 한 번만):',
    'claude mcp add --scope user minidiscord-channel -- minidiscord-channel',
    '',
    '# 세션 실행 (원하는 페르소나 디렉터리에서):',
    `export MINIDISCORD_TOKEN=${token}`,
    `export MINIDISCORD_SERVER=ws://127.0.0.1:${port}/bot`,
    'claude --dangerously-load-development-channels server:minidiscord-channel',
  ].join('\n')
}

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

  // 초대 발급 — 평문 토큰은 이 응답에 한 번만 실리고 bot_tokens 에는 그로부터 유도한 검증자와 확인 열쇠만 저장한다
  // (REQ-GWAUTH2-003). v1 은 sha256 해시를 저장했는데 그 값만으로 봇을 사칭할 수 있었다(SPEC-GWAUTH-001 §1.1) —
  // v2 검증자는 공개키라 저장 값을 읽은 상대가 봇 방향으로는 아무것도 만들지 못한다. 확인 열쇠는 그 반대 절반의
  // 대용이며 그 한계는 spec §5 표가 진다
  // 멤버십 게이트가 방 조회보다 앞선다 (REQ-ROOMAUTHZ-017) — 초대 라우트는 "봇 하나 추가"가 아니라
  // 그 방 대화 전체로 통하는 두 번째 문이다. 뒤에 두면 비멤버가 보관된 방에서 409 를 받아 실재가 샌다
  app.post('/api/rooms/:id/invites', { preHandler: [requireAuth, requireRoomMember] }, async (req, reply) => {
    const roomId = Number((req.params as { id: string }).id)
    const { bot_id } = req.body as { bot_id?: number }
    const db = req.server.db
    // 방을 먼저 조회해 없음(404)과 보관됨(409)을 가른다 — 403은 이 시스템에 쓰지 않는다 (plan.md §D 5).
    // 비멤버는 위 게이트에서 이미 같은 404 로 끝났으므로 이 분기는 멤버에게만 보인다 (REQ-ROOMAUTHZ-013)
    const room = db.prepare('SELECT id, status FROM rooms WHERE id = ?').get(roomId) as { id: number; status: string } | undefined
    if (!room) return reply.code(404).send({ error: '방을 찾을 수 없습니다' })
    if (room.status === 'archived') return reply.code(409).send({ error: '보관된 방에는 초대할 수 없습니다' })
    const bot = db.prepare('SELECT id, name FROM bots WHERE id=?').get(bot_id ?? -1) as { id: number; name: string } | undefined
    if (!bot) return reply.code(404).send({ error: '봇을 찾을 수 없습니다' })
    // 재초대: 기존 활성 토큰을 먼저 철회한 뒤 새 토큰을 발급한다 (REQ-BOT-003)
    db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE room_id=? AND bot_id=? AND revoked_at IS NULL").run(roomId, bot.id)
    const token = randomBytes(32).toString('hex')
    const { verifierPub, serverConfirmKey } = deriveBotKeys(token)
    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)').run(roomId, bot.id, verifierPub, serverConfirmKey)
    return reply.code(201).send({ bot_id: bot.id, bot_name: bot.name, token, command: inviteCommand(token, config.port) })
  })

  // 초대 목록 — SQL 결과를 매핑해 online 을 불리언으로 내보낸다. SQLite 의 0 AS online 은 정수 0 이라 그대로 흘려보내면 안 된다 (plan.md §D 1).
  // 비멤버에게는 빈 배열이 아니라 404 다 — 빈 배열은 "봇 없는 방"과 구별되지 않아 실재가 샌다 (REQ-ROOMAUTHZ-009 와 같은 논리)
  app.get('/api/rooms/:id/invites', { preHandler: [requireAuth, requireRoomMember] }, async req => {
    const roomId = Number((req.params as { id: string }).id)
    const rows = req.server.db.prepare(
      `SELECT t.bot_id, b.name AS bot_name FROM bot_tokens t JOIN bots b ON b.id = t.bot_id
       WHERE t.room_id=? AND t.revoked_at IS NULL ORDER BY b.name`,
    ).all(roomId) as { bot_id: number; bot_name: string }[]
    // online 은 게이트웨이의 접속 판정을 따른다 — 게이트웨이를 데코레이트하지 않은 테스트 조립에서는 false 로 내려간다
    return rows.map(r => ({ ...r, online: (req.server as { gateway?: Gateway }).gateway?.isOnline(roomId, r.bot_id) ?? false }))
  })

  // 초대 철회 — 멱등: 철회할 활성 토큰이 없어도 같은 응답을 낸다 (REQ-BOT-007).
  // 파괴적 쓰기라서 게이트가 더 중요하다 — 남의 방 봇 세션을 끊을 수 없어야 한다 (REQ-ROOMAUTHZ-017)
  app.delete('/api/rooms/:id/invites/:botId', { preHandler: [requireAuth, requireRoomMember] }, async req => {
    const { id, botId } = req.params as { id: string; botId: string }
    // room_id 와 bot_id 를 모두 조건에 넣어 다른 방의 같은 봇 토큰은 건드리지 않는다
    req.server.db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE room_id=? AND bot_id=? AND revoked_at IS NULL").run(Number(id), Number(botId))
    return { ok: true }
  })
}
