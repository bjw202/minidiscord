// SPEC-GWAUTH-001 상호 인증 왕복 테스트 — AC-GWAUTH-013.
// 진짜 서버(server/src/gateway.ts 의 createGateway)와 진짜 채널(channel/src/index.ts 의 wire)을
// 한 테스트에서 붙인다. 스텁도 흉내도 없다. 해시·HMAC 규칙의 생산 사본이 서버와 채널에 각각
// 존재하므로, 한쪽이 규칙을 바꿔도 단위 기준들은 각자의 규칙 안에서 초록으로 남는다 —
// 그 어긋남을 잡는 유일한 기준이 이 왕복이다 (SPEC-GWAUTH-001 spec.md §3.5).
// 서버 부트스트랩은 server/test/gateway.test.ts 의 build() 와 같은 형태다.
import { describe, it, expect, afterEach } from 'vitest'
import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from '../../server/src/db.js'
import { createSseHub } from '../../server/src/sse.js'
import { createGateway } from '../../server/src/gateway.js'
import { registerAuthRoutes } from '../../server/src/auth.js'
import { deriveBotKeys } from '../../server/src/routes-bots.js'
import { wire } from '../src/index.js'

// 열어 둔 자원(서버 앱·DB·임시 디렉터리·게이트웨이 클라이언트·MCP 클라이언트)의 일괄 정리 목록.
const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) await c() })

// 채팅 알림을 관측하는 스키마 — SDK 가 schema.shape.method.value 로 메서드를 읽으므로 진짜 zod 다.
const ChatNote = z.object({
  method: z.literal('notifications/claude/channel'),
  params: z.object({ content: z.string() }).passthrough(),
})

async function waitFor(pred: () => boolean, label: string, ms = 3000): Promise<void> {
  const t0 = Date.now()
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`waitFor timeout: ${label}`)
    await new Promise(r => setTimeout(r, 10))
  }
}

// 진짜 서버 하나를 띄운다 — fastify 앱 + 실제 DB + 실제 게이트웨이 (server/test/gateway.test.ts 참조).
async function buildServer() {
  const dir = mkdtempSync(join(tmpdir(), 'md-mutual-'))
  const db = openDb(join(dir, 't.db'))
  mkdirSync(join(dir, 'up'), { recursive: true })
  const app = Fastify()
  ;(app as any).db = db
  await app.register(cookie)
  ;(app as any).decorate('hub', createSseHub())
  registerAuthRoutes(app, db)
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  ;(app as any).decorate('gateway', gateway)
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  // app.close() 가 gateway 의 onClose 훅으로 열린 접속과 wss 를 닫는다 — 그 뒤 DB 와 디렉터리를 거둔다.
  cleanups.push(async () => { await app.close(); db.close(); rmSync(dir, { recursive: true, force: true }) })
  return { db, gateway, port }
}

// server/test/gateway.test.ts 의 시더와 같은 형태 — 방·봇을 만들고 평문 토큰을 발급한다.
function seedRoom(db: any, name = 'A'): number {
  return db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name).lastInsertRowid as number
}
function seedBot(db: any, name = 'pm'): number {
  return db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(name).lastInsertRowid as number
}
function invite(db: any, roomId: number, botId: number): string {
  const token = randomBytes(32).toString('hex')
  // v2 저장 계약 (SPEC-GWAUTH-002 §D-3) — 진짜 발급 경로와 같은 유도를 쓴다. 이 시험은 진짜 서버와
  // 진짜 채널의 왕복이므로 양쪽이 같은 규칙에 합의해야만 확립된다.
  const { verifierPub, serverConfirmKey } = deriveBotKeys(token)
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')
    .run(roomId, botId, verifierPub, serverConfirmKey)
  return token
}

describe('gateway mutual auth', () => {
  // AC-GWAUTH-013 — 진짜 서버와 진짜 채널이 증명에 합의한다.
  // 확립되지 않으면 서버가 민 message 프레임이 세션에 도달할 수 없다(REQ-GWAUTH-011 이 미확립
  // 소켓의 프레임을 버린다) — 그래서 «메시지가 도착했다» 가 «증명 왕복이 합의됐다»의 관측이다.
  // onWelcome 을 단언하지 않는다 — wire() 는 onWelcome 을 배선하지 않는다 (AC-GWAUTH-015 소관).
  it('the real server and the real channel agree on the proof end to end', async () => {
    const { db, gateway, port } = await buildServer()
    const roomId = seedRoom(db)
    const botId = seedBot(db)
    const token = invite(db, roomId, botId)

    // 실제 채널 배선 — 스텁도 흉내도 없다
    const { channel, gw } = wire({ url: `ws://127.0.0.1:${port}/bot`, token })
    const client = new Client({ name: 't', version: '0' })
    const notes: { params: { content: string } }[] = []
    client.setNotificationHandler(ChatNote, n => { notes.push(n as never) })
    const [c, s] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(c), channel.server.connect(s)])
    cleanups.push(async () => { gw.stop(); await client.close() })
    gw.start()

    // hello → welcome 증명 대조가 지나가야 서버의 접속 목록에 오른다
    await waitFor(() => gateway.isOnline(roomId, botId), '게이트웨이 접속')

    // 서버가 그 방에 그 봇을 타깃으로 하는 메시지를 하나 넣는다 — 확립 뒤에만 도착할 수 있다
    gateway.deliver(roomId, {
      id: 1, room_id: roomId, author_type: 'user', author_name: 'alice',
      body: '증명 왕복 본문', created_at: '2026-08-29',
    }, [{ botId, delivery: 'to' }])
    await waitFor(() => notes.length === 1, '세션 알림 도착')

    expect(notes[0].params.content).toBe('[alice] 증명 왕복 본문')
  })
})
