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

// MCP 서버 이름은 [A-Za-z0-9_-] 만 안전하다. 봇 이름에서 그 밖의 글자를 지우고(연속 공백·기호는 - 하나), 비면 bot<id> 로 대체
function mcpName(id: number, name: string): string {
  const slug = name.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '')
  return `${slug || `bot${id}`}-channel`
}

// @MX:NOTE: [AUTO] 세션 실행 명령 안내 문자열 — 권장 방법 하나만 싣는다 (REQ-BOTMODEL-005, 2026-09-08 운영자 지시):
// 페르소나 폴더에서 봇 이름별 MCP 서버를 --scope local 로 등록하고 토큰·주소를 --env 로 박아, 다음 세션부터는 실행 한 줄이면 된다.
// 토큰을 전역(--scope user)에 두면 다른 봇 폴더의 셸 export 를 덮은 실측이 있어 폴더 범위에만 둔다. 채널 경로는 저장소 안 빌드 산출물의 절대 경로다
function registrationCommand(id: number, name: string, token: string): string {
  const entry = channelEntry()
  const mcp = mcpName(id, name)
  return [
    `# ① 이 봇의 페르소나 폴더(CLAUDE.md 를 둘 곳)로 가서, 한 번만 등록합니다. 토큰이 그 폴더의 설정에 남습니다.`,
    `#    (저장소 뿌리에서 npm run build -w channel 을 먼저 한 번 — channel/dist/index.js 가 있어야 합니다)`,
    `cd <이 봇의 페르소나 폴더>`,
    `claude mcp remove ${mcp} -s local 2>/dev/null; \\`,
    `claude mcp add --scope local ${mcp} \\`,
    `  --env MINIDISCORD_TOKEN=${token} \\`,
    `  --env MINIDISCORD_SERVER=ws://${config.host}:${config.port}/bot \\`,
    `  -- node ${entry}`,
    `claude mcp get ${mcp}   # Status: ✔ Connected 여야 합니다`,
    '',
    `# ② 이후 이 폴더에서 세션을 띄울 때마다 — 토큰을 다시 넣을 필요가 없습니다:`,
    `claude --dangerously-load-development-channels server:${mcp}`,
    '',
    `# ③ 세션이 붙어도 방에 참여시키기 전에는 그 방에 보이지 않습니다:`,
    `#    웹 화면에서 방 머리의 «봇 참여» 버튼으로 이 봇을 방에 넣고, @TO(${name}) 으로 부르세요.`,
    `#    페르소나 폴더의 CLAUDE.md 첫 줄에 «너는 이 방에서 ${name} 이라는 봇이다» 를 적어 두면 세션이 제 이름을 압니다.`,
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
  // 기록용 이름표다 (게이트웨이의 역할 필터는 2026-09-08 삭제)
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
      return reply.code(201).send({ id: r.lastInsertRowid as number, name: name.trim(), token, command: registrationCommand(r.lastInsertRowid as number, name.trim(), token) })
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
