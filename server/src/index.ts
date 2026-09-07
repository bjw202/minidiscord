import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { openDb, type Db } from './db.js'
import { registerAuthRoutes } from './auth.js'
import { registerRoomRoutes } from './routes-rooms.js'
import { registerBotRoutes } from './routes-bots.js'
import { registerMessageRoutes } from './routes-messages.js'
import { registerEventRoute } from './routes-events.js'
import { createSseHub } from './sse.js'
import { createGateway, type Gateway } from './gateway.js'
import { createPermissionBroker, type PermissionBroker } from './permissions.js'
import { config } from './config.js'

// FastifyInstance.db — requireAuth 와 이후 도메인 라우트가 req.server.db 로 공유하는 단일 연결
// FastifyInstance.hub — SSE 허브. 프로세스당 하나며 Task 8·9·10 이 app.hub.publish 로 결합한다
// FastifyInstance.gateway — 봇 게이트웨이. routes-messages·permissions·routes-bots 초대 online 이 소비한다
// FastifyInstance.uploadsDir — 업로드 디렉터리. 메시지 라우트가 req.server.uploadsDir 로 읽는다 (REQ-MSG-006 정의 상자)
// FastifyInstance.permissions — 권한 릴레이 브로커. 메시지 라우트의 가로채기가 req.server.permissions 로 접근한다
declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    hub: ReturnType<typeof createSseHub>
    gateway: Gateway
    uploadsDir: string
    permissions: PermissionBroker
  }
}

// @MX:ANCHOR: [AUTO] 서버 조립의 단일 지점 — 진입 블록·health/restart-persistence 시험·E2E 가 띄우는 프로세스가 전부 이 함수로 앱을 만든다
// @MX:REASON: 등록 순서 셋이 계약이다 — 게이트웨이는 허브 데코레이트 뒤(REQ-GW-022), multipart 는 메시지 라우트 앞(REQ-MSG-015), 정적 서빙은 맨 끝(REQ-WEBSHELL-001). 어느 하나를 옮겨도 오류 없이 조용히 깨진다
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
  // 봇 게이트웨이 — 허브 데코레이트 뒤에 만든다 (REQ-GW-022). 방 보관 훅으로 그 방 접속 끊기를 건다.
  // uploadsDir 데코레이터와 게이트웨이가 같은 값을 쓴다 — 갈라지면 경로 봉인 검사가 무엇을 재는지 불분명해진다 (plan.md §D 4번)
  app.decorate('uploadsDir', config.uploadsDir)
  const gateway = createGateway(app, { uploadsDir: config.uploadsDir, botFilesDir: config.botFilesDir })
  app.decorate('gateway', gateway)
  registerRoomRoutes(app, { onArchive: roomId => gateway.closeRoom(roomId) })
  registerBotRoutes(app)
  // 메시지 라우트 — multipart 등록이 라우트 등록보다 앞서야 한다 (REQ-MSG-015). 뒤에 오면 요청 시점에 req.parts() 가 없다
  await app.register(multipart)
  registerMessageRoutes(app)
  // 권한 릴레이 브로커 — 게이트웨이 승인 요청을 방에 띄우고 yes/no 답을 판정으로 되돌린다 (REQ-PERM-004).
  // 데코레이션이 빠지면 라우트 쪽 옵셔널 체이닝이 조용히 undefined 를 내어 릴레이 전체가 아무 오류 없이 죽는다
  const broker = createPermissionBroker(app)
  app.decorate('permissions', broker)
  gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))
  // 방별 이벤트 스트림 — 등록은 registerEventRoute 하나로 한다. 인라인 사본을 남기면 Fastify 는
  // 조용히 둘 다 등록하지 않는 채 프로덕션만 게이트 없는 상태로 남는다 (REQ-ROOMAUTHZ-010)
  registerEventRoute(app)
  app.addHook('onClose', async () => app.db.close())
  // 정적 서빙 — 모든 API 라우트가 등록된 뒤에 맨 끝에 붙인다 (REQ-WEBSHELL-001, plan.md §D 7).
  // prefix '/' 가 와일드카드 GET 을 만드므로, API 보다 앞서 등록되면 API 가 정적 응답으로 가려진다.
  await app.register(fastifyStatic, {
    root: process.env.MINIDISCORD_WEB_DIR ?? fileURLToPath(new URL('../../web', import.meta.url)),
    prefix: '/',
  })
  return app
}

if (process.argv[1]?.includes('index.ts')) {
  const app = await buildServer()
  await app.listen({ port: config.port, host: config.host })
  console.log(`minidiscord listening on ${config.host}:${config.port}`)
  // 켜지지 않은 기능은 조용히 없는 것처럼 보인다 — 봇이 파일을 보내는데 방에 아무것도 안 뜨는
  // 진단하기 어려운 실패를 막으려고 기동 시 한 줄 알린다 (sync-reaudit N-03).
  if (!config.botFilesDir) {
    console.warn('minidiscord: MINIDISCORD_BOT_FILES_DIR 이 없어 봇 첨부를 받지 않습니다 (본문만 전달됩니다)')
  }
}
