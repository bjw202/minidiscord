// 봇 등록/목록 + 방 참여 API — v2 A 단계 (SPEC-BOTMODEL-001 §3.2). 봇은 신원이라 등록할 때 토큰 하나를 받고,
// 참여(방 × 봇)는 room_bots 행이다. 초대 라우트 셋(/invites)은 없다 — 방별 토큰이 없기 때문이다.
import type { FastifyInstance } from 'fastify'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireAuth } from './auth.js'
import { config } from './config.js'
import type { Gateway } from './gateway.js'

// 채널 플러그인 진입 파일의 절대 경로 — 이 서버 소스의 위치(server/src)에서 저장소 뿌리를 거슬러 계산한다.
// 안내문이 PATH 의 전역 명령(minidiscord-channel)을 가리키면 전역 설치가 없는 PC 에서 «not found» 로 막히고,
// 이미 있는 항목은 claude mcp add 가 덮어쓰지 않아 옛 경로가 남는다 (2026-09-08 맥북 실측). 그래서 절대 경로를 싣는다.
// 호출 시점에 계산한다 — jsdom 환경의 웹 시험은 모듈 적재 때 import.meta.url 이 file: 이 아니다 (index.ts 의 web 루트와 같은 이유)
function channelEntry(): string {
  return fileURLToPath(new URL('../../channel/dist/index.js', import.meta.url))
}

// @MX:NOTE: [AUTO] 세션 실행 명령 안내 문자열 — 주소는 config.host 를, 채널 경로는 이 저장소의 빌드 산출물 절대 경로를 반영한다 (REQ-BOTMODEL-005)
function registrationCommand(token: string): string {
  const CHANNEL_ENTRY = channelEntry()
  return [
    '# 1회 등록 (이 PC 에서 최초 한 번만 — 저장소 뿌리에서):',
    'npm run build -w channel',
    'claude mcp remove minidiscord-channel -s user 2>/dev/null; \\',
    `claude mcp add --scope user minidiscord-channel -- node ${CHANNEL_ENTRY}`,
    'claude mcp get minidiscord-channel   # Status: ✔ Connected 여야 합니다',
    '',
    '# 세션 실행 (원하는 페르소나 디렉터리에서):',
    `export MINIDISCORD_TOKEN=${token}`,
    `export MINIDISCORD_SERVER=ws://${config.host}:${config.port}/bot`,
    'claude --dangerously-load-development-channels server:minidiscord-channel',
    '',
    '# 그다음 — 세션이 붙어도 방에 참여시키기 전에는 그 방에 보이지 않습니다:',
    '#   웹 화면에서 방 머리의 «봇 참여» 버튼으로 이 봇을 방에 넣고, @TO(봇이름) 으로 부르세요.',
  ].join('\n')
}

// @MX:ANCHOR: [AUTO] 봇 라우트 다섯의 등록점 — buildServer 와 테스트 build() 가 호출, routes-messages 의 멘션 매핑이 room_bots 를 소비한다
// @MX:REASON: 등록 응답 {id, name, token, command} 와 참여 목록 [{bot_id, bot_name, online}] 은 web/app.js 와 channel 문서가 글자 그대로 읽는 계약이다
export function registerBotRoutes(app: FastifyInstance): void {
  app.get('/api/bots', { preHandler: [requireAuth] }, async req => {
    // token 은 어떤 조회 응답에도 싣지 않는다 — 등록 응답 한 번뿐이다 (REQ-BOTMODEL-004)
    return req.server.db.prepare('SELECT id, name, description FROM bots ORDER BY name').all()
  })

  // 등록 — 평문 토큰은 이 응답에 한 번만 실린다. role 은 orchestrator|worker 둘뿐이고 비우면 worker 다 —
  // 게이트웨이의 역할 필터(worker 는 orchestrator 만 부른다)가 이 두 값만 안다 (v2 B, 결정 ③)
  app.post('/api/bots', { preHandler: [requireAuth] }, async (req, reply) => {
    const { name, description, role } = req.body as { name?: string; description?: string; role?: string }
    if (!name?.trim()) return reply.code(400).send({ error: '봇 이름이 필요합니다' })
    const storedRole = typeof role === 'string' && role.trim() ? role.trim() : 'worker'
    if (storedRole !== 'orchestrator' && storedRole !== 'worker') {
      return reply.code(400).send({ error: 'role 은 orchestrator 또는 worker 여야 합니다' })
    }
    const token = randomBytes(32).toString('hex')
    try {
      const r = req.server.db.prepare('INSERT INTO bots (name, description, token, role) VALUES (?, ?, ?, ?)')
        .run(name.trim(), description ?? '', token, storedRole)
      return reply.code(201).send({ id: r.lastInsertRowid as number, name: name.trim(), token, command: registrationCommand(token) })
    } catch {
      // @MX:NOTE: [AUTO] UNIQUE 위반을 포함한 DB 오류를 전부 409 로 바꾼다 — 이름 UNIQUE 밖의 제약(토큰 UNIQUE)은 32바이트 난수라 실질적으로 닿지 않는다
      return reply.code(409).send({ error: '이미 있는 봇 이름입니다' })
    }
  })

  // 참여 추가 — 멱등 (INSERT OR IGNORE). 같은 요청을 되풀이해도 같은 응답이다 (REQ-BOTMODEL-006)
  app.post('/api/rooms/:id/bots', { preHandler: [requireAuth] }, async (req, reply) => {
    const roomId = Number((req.params as { id: string }).id)
    const { bot_id } = req.body as { bot_id?: number }
    const db = req.server.db
    // 방을 먼저 조회해 없음(404)과 보관됨(409)을 가른다 — 403 은 이 시스템에 쓰지 않는다
    const room = db.prepare('SELECT id, status FROM rooms WHERE id = ?').get(roomId) as { id: number; status: string } | undefined
    if (!room) return reply.code(404).send({ error: '방을 찾을 수 없습니다' })
    if (room.status === 'archived') return reply.code(409).send({ error: '보관된 방에는 참여시킬 수 없습니다' })
    const bot = db.prepare('SELECT id, name FROM bots WHERE id = ?').get(bot_id ?? -1) as { id: number; name: string } | undefined
    if (!bot) return reply.code(404).send({ error: '봇을 찾을 수 없습니다' })
    db.prepare('INSERT OR IGNORE INTO room_bots (room_id, bot_id) VALUES (?, ?)').run(roomId, bot.id)
    return reply.code(201).send({ room_id: roomId, bot_id: bot.id, bot_name: bot.name })
  })

  // 참여 목록 — SQL 결과를 매핑해 online 을 불리언으로 내보낸다. SQLite 의 0 AS online 은 정수 0 이라 그대로 흘려보내면 안 된다.
  // online 은 봇 단위 판정이다 (REQ-BOTMODEL-007·019)
  app.get('/api/rooms/:id/bots', { preHandler: [requireAuth] }, async req => {
    const roomId = Number((req.params as { id: string }).id)
    const rows = req.server.db.prepare(
      `SELECT rb.bot_id, b.name AS bot_name FROM room_bots rb JOIN bots b ON b.id = rb.bot_id
       WHERE rb.room_id = ? ORDER BY b.name`,
    ).all(roomId) as { bot_id: number; bot_name: string }[]
    // 게이트웨이를 데코레이트하지 않은 테스트 조립에서는 false 로 내려간다
    return rows.map(r => ({ ...r, online: (req.server as { gateway?: Gateway }).gateway?.isOnline(r.bot_id) ?? false }))
  })

  // 참여 제거 — 그 방의 그 봇 행만. 다른 방의 같은 봇 참여는 남는다. 멱등이다 (REQ-BOTMODEL-008)
  app.delete('/api/rooms/:id/bots/:botId', { preHandler: [requireAuth] }, async req => {
    const { id, botId } = req.params as { id: string; botId: string }
    req.server.db.prepare('DELETE FROM room_bots WHERE room_id = ? AND bot_id = ?').run(Number(id), Number(botId))
    return { ok: true }
  })
}
