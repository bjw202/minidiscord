import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import { mkdirSync } from 'node:fs'
import { openDb, type Db } from './db.js'
import { registerAuthRoutes } from './auth.js'
import { config } from './config.js'

// FastifyInstance.db — requireAuth 와 이후 도메인 라우트가 req.server.db 로 공유하는 단일 연결
declare module 'fastify' {
  interface FastifyInstance {
    db: Db
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
  app.addHook('onClose', async () => app.db.close())
  return app
}

if (process.argv[1]?.includes('index.ts')) {
  const app = await buildServer()
  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`minidiscord listening on :${config.port}`)
}
