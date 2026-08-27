import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import { mkdirSync } from 'node:fs'
import { openDb, type Db } from './db.js'
import { registerAuthRoutes, requireAuth } from './auth.js'
import { registerRoomRoutes } from './routes-rooms.js'
import { registerBotRoutes } from './routes-bots.js'
import { createSseHub } from './sse.js'
import { createGateway, type Gateway } from './gateway.js'
import { config } from './config.js'

// FastifyInstance.db — requireAuth 와 이후 도메인 라우트가 req.server.db 로 공유하는 단일 연결
// FastifyInstance.hub — SSE 허브. 프로세스당 하나며 Task 8·9·10 이 app.hub.publish 로 결합한다
// FastifyInstance.gateway — 봇 게이트웨이. routes-messages·permissions·routes-bots 초대 online 이 소비한다
declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    hub: ReturnType<typeof createSseHub>
    gateway: Gateway
  }
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  mkdirSync(config.dataDir, { recursive: true })
  mkdirSync(config.uploadsDir, { recursive: true })
  app.db = openDb(config.dbPath)
  await app.register(cookie)
  app.get('/api/health', async () => ({ ok: true }))
  registerAuthRoutes(app, app.db)
  // SSE 허브 — 순수 메모리 구조. 서버 재시작 시 구독은 사라지고 브라우저가 다시 연결한다
  const hub = createSseHub()
  app.decorate('hub', hub)
  // 봇 게이트웨이 — 허브 데코레이트 뒤에 만든다 (REQ-GW-022). 방 보관 훅으로 그 방 접속 끊기를 건다
  const gateway = createGateway(app, { uploadsDir: config.uploadsDir })
  app.decorate('gateway', gateway)
  registerRoomRoutes(app, { onArchive: roomId => gateway.closeRoom(roomId) })
  registerBotRoutes(app)
  // 방별 이벤트 스트림. hijack 을 먼저 호출해 소켓 소유권을 넘긴다 — 허브가 reply.raw 에 직접 쓴다
  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
    reply.hijack()
    app.hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
  app.addHook('onClose', async () => app.db.close())
  return app
}

if (process.argv[1]?.includes('index.ts')) {
  const app = await buildServer()
  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`minidiscord listening on :${config.port}`)
}
