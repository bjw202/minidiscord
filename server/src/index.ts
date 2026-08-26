import Fastify, { type FastifyInstance } from 'fastify'

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  app.get('/api/health', async () => ({ ok: true }))
  return app
}

if (process.argv[1]?.includes('index.ts')) {
  const { config } = await import('./config.js')
  const app = await buildServer()
  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`minidiscord listening on :${config.port}`)
}
