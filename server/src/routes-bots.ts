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

// @MX:NOTE: [AUTO] 세션 실행 명령 안내 문자열 — 권장 방법 하나만 싣는다 (REQ-BOTMODEL-005, 2026-09-08 운영자 지시).
// 2026-09-08 crew 연동으로 방식을 «페르소나 폴더의 .mcp.json + --strict-mcp-config --mcp-config» 로 통일했다(사용자 결정):
// 토큰이 ~/.claude.json 이 아니라 봇 폴더 파일 하나에 살아 폴더째 옮겨도 그대로 붙고, --strict-mcp-config 가 사용자의 전역
// MCP 서버(다른 도구들)를 봇 세션에서 떼어 낸다. --mcp-config 로 명시해 넘긴 .mcp.json 은 프로젝트 .mcp.json 의 «첫 승인»
// 절차를 타지 않는다(crew 실측). MCP 서버 이름은 봇과 무관하게 minidiscord-channel 로 고정 — 채널 지시문의
// source="minidiscord-channel" 과 허용 목록 이름(mcp__minidiscord-channel__reply)이 봇마다 달라지지 않도록.
// 채널 경로는 저장소 안 빌드 산출물의 절대 경로다. JSON 의 키·순서는 crew setup.js 가 쓰는 파일과 글자 단위로 같다.
export const MCP_SERVER_NAME = 'minidiscord-channel'
export const LAUNCH_COMMAND = `claude --strict-mcp-config --mcp-config .mcp.json --dangerously-load-development-channels server:${MCP_SERVER_NAME}`

export function mcpJsonFor(token: string, entry = channelEntry()): string {
  return JSON.stringify({
    mcpServers: {
      [MCP_SERVER_NAME]: {
        command: 'node',
        args: [entry],
        env: { MINIDISCORD_TOKEN: token, MINIDISCORD_SERVER: `ws://${config.host}:${config.port}/bot` },
      },
    },
  }, null, 2)
}

function registrationCommand(name: string, token: string): string {
  return [
    `# ① 이 봇의 페르소나 폴더(CLAUDE.md 를 둘 곳)에 .mcp.json 파일을 만듭니다. 토큰이 이 파일에 남습니다 — git 에 넣지 마세요.`,
    `#    (저장소 뿌리에서 npm run build -w channel 을 먼저 한 번 — channel/dist/index.js 가 있어야 합니다)`,
    `cd <이 봇의 페르소나 폴더>`,
    `cat > .mcp.json <<'EOF'`,
    mcpJsonFor(token),
    `EOF`,
    '',
    `# ② 이후 이 폴더에서 세션을 띄울 때마다 — 토큰을 다시 넣을 필요가 없습니다:`,
    LAUNCH_COMMAND,
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
      return reply.code(201).send({ id: r.lastInsertRowid as number, name: name.trim(), token, command: registrationCommand(name.trim(), token) })
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

  // 봇 삭제 — 완전 삭제 (2026-09-08 운영자 결정). 봇 행·모든 방의 참여·message_targets 를 한 트랜잭션에 지우고,
  // 붙어 있던 소켓은 게이트웨이가 끊는다. 옛 글(messages.author_bot_id)은 남기되 작성자는 «(삭제된 봇)» 으로 보인다.
  // 이름은 UNIQUE 라 지우면 바로 다시 쓸 수 있다. 토큰 재발급 API 는 없으므로 «지우고 다시 등록» 이 그 자리다
  app.delete('/api/bots/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const db = req.server.db
    const bot = Number.isInteger(id) ? db.prepare('SELECT id FROM bots WHERE id = ?').get(id) as { id: number } | undefined : undefined
    if (!bot) return reply.code(404).send({ error: '봇을 찾을 수 없습니다' })
    db.transaction(() => {
      // 외래키가 켜져 있다(better-sqlite3 기본) — 옛 글은 남기고 작성자 참조만 푼다. author_type 은 'bot' 그대로라 «(삭제된 봇)» 으로 보인다
      db.prepare('UPDATE messages SET author_bot_id = NULL WHERE author_bot_id = ?').run(id)
      db.prepare('DELETE FROM message_targets WHERE bot_id = ?').run(id)
      db.prepare('DELETE FROM room_bots WHERE bot_id = ?').run(id)
      db.prepare('DELETE FROM bots WHERE id = ?').run(id)
    })()
    // 커밋 뒤에 끊는다 — 소켓이 재접속해도 토큰이 이미 없다
    ;(req.server as { gateway?: Gateway }).gateway?.dropBot(id)
    return { ok: true }
  })

  // 참여 제거 — 그 방의 그 봇 행만. 다른 방의 같은 봇 참여는 남는다. 멱등이다 (REQ-BOTMODEL-008)
  app.delete('/api/rooms/:id/bots/:botId', { preHandler: [requireAuth] }, async req => {
    const { id, botId } = req.params as { id: string; botId: string }
    req.server.db.prepare('DELETE FROM room_bots WHERE room_id = ? AND bot_id = ?').run(Number(id), Number(botId))
    return { ok: true }
  })
}
