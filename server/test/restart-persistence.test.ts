// server/test/restart-persistence.test.ts — REQ-E2E-009 인프로세스 회귀 짝.
// E2E 스크립트(scripts/e2e.mts)가 셸 명령으로 잡는 것과 같은 「서버 재시작 영속성」을
// vitest 안에서 같은 데이터 디렉터리로 buildServer() 를 두 번 세워 관측한다.
// 판정은 개수 산술이 아니라 동일성이다(REQ-E2E-010) — 메시지 id·본문, 첨부 바이트,
// 봇 토큰의 재접속 가능. 격리 관행은 gateway.test.ts:19-24 의 mkdtempSync+afterEach 를 따른다.
// 이 파일은 server/test 의 새 조각 하나다 — 형제 테스트·gateway-v2.ts·server/src 는 건드리지 않는다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { buildServer } from '../src/index.js'
import { connectV2 } from './gateway-v2.js'

let dir: string
let app: FastifyInstance
let port: number

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-restart-'))
  // config.ts 의 게터가 호출 시점에 env 를 읽는다(config.ts:7-8) — import 이후 설정도 반영된다
  process.env.MINIDISCORD_DATA_DIR = dir
})
afterEach(async () => {
  delete process.env.MINIDISCORD_DATA_DIR
  if (app) { await app.close(); app.db.close() }   // 아래 closeForRestart 의 [HARD] 닫기와 같은 형태
  app = undefined as unknown as FastifyInstance
  rmSync(dir, { recursive: true, force: true })
})

/** 재시작의 닫기 절반 — [HARD] REQ-E2E-009. Fastify 단독은 db 를 닫지 않지만 이 buildServer 는
 *  onClose 훅으로 닫는다(index.ts:61). 그 위에 명시 닫기를 한 번 더 얹는다 — 이 버전의
 *  better-sqlite3(13.x)는 이중 close 를 던지지 않음을 실측했다. 닫힘 없이 다시 buildServer()
 *  하는 것은 재시작이 아니라 두 연결 병존이다(plan.md §D-6, 1회차 감사 D-13). */
async function closeForRestart(): Promise<void> {
  await app.close()
  app.db.close()
}

/** build + 임시 포트 리슨 — 토큰 동일성 단언은 실제 WS 전선(/bot)이 필요하다 */
async function build(): Promise<number> {
  app = await buildServer()
  await app.listen({ port: 0, host: '127.0.0.1' })
  port = (app.server.address() as { port: number }).port
  return port
}

/** 메시지 라우트는 req.parts() multipart 만 받는다(routes-messages.ts:50) — 최소 multipart 을 손으로 조립한다 */
function messagePayload(body: string, files: { filename: string; data: Buffer }[] = []): { payload: Buffer; headers: Record<string, string> } {
  const boundary = 'restart-pair-boundary'
  const parts: Buffer[] = [Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="body"\r\n\r\n${body}\r\n`)]
  for (const f of files) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${f.filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`))
    parts.push(f.data)
    parts.push(Buffer.from('\r\n'))
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  return { payload: Buffer.concat(parts), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

interface Rec { cookie: string; roomId: number; botId: number; token: string; msgId: number; msgBody: string; attId: number; attBytes: Buffer }

/** 재시작 전의 쓰기 — 회원·방·봇·초대 토큰, 첨부 하나가 붙은 메시지. 전부 앱 자신의 라우트로 넣는다 */
async function seed(): Promise<Rec> {
  const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'restart-user', password: 'restart-password-123' } })
  expect(reg.statusCode).toBe(201)
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'restart-user', password: 'restart-password-123' } })
  expect(login.statusCode).toBe(200)
  const rawSet = login.headers['set-cookie'] as unknown as string | string[] | undefined
  const cookie = (Array.isArray(rawSet) ? rawSet : [rawSet ?? '']).map(c => c.split(';')[0]).find(c => c.startsWith('md_session='))
  expect(cookie, '로그인이 md_session 쿠키를 준다').toBeTruthy()

  const room = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: cookie! }, payload: { name: 'restart-room' } })
  expect(room.statusCode).toBe(201)
  const roomId = (room.json() as { id: number }).id
  const bot = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: cookie! }, payload: { name: 'Restart-Bot' } })
  expect(bot.statusCode).toBe(201)
  const botId = (bot.json() as { id: number }).id
  const inv = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/invites`, headers: { cookie: cookie! }, payload: { bot_id: botId } })
  expect(inv.statusCode).toBe(201)
  const token = (inv.json() as { token: string }).token

  const msgBody = '재시작 전에 저장한 메시지'
  const attBytes = Buffer.from('restart attachment bytes')
  const mp = messagePayload(msgBody, [{ filename: 'restart.txt', data: attBytes }])
  const sent = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie: cookie!, ...mp.headers }, payload: mp.payload })
  expect(sent.statusCode).toBe(200)
  const message = (sent.json() as { message: { id: number; attachments: { id: number }[] } }).message
  expect(message.attachments.length).toBe(1)
  return { cookie: cookie!, roomId, botId, token, msgId: message.id, msgBody, attId: message.attachments[0].id, attBytes }
}

/** 세 동일성 대조 — id 로 찾아 본문을, id 로 내려받아 바이트를, 같은 토큰으로 접속해 welcome 을 본다.
 *  세 대조 모두 「그 값이 그대로」라는 동일성이지, 행수 가감이 아니다(REQ-E2E-010). */
async function assertIdentities(rec: Rec, label: string): Promise<void> {
  // 동일성 1 — 메시지 id·본문
  const list = await app.inject({ method: 'GET', url: `/api/rooms/${rec.roomId}/messages`, headers: { cookie: rec.cookie } })
  expect(list.statusCode, `${label} 방 목록 조회`).toBe(200)
  const found = (list.json() as { messages: { id: number; body: string }[] }).messages.find(m => m.id === rec.msgId)
  expect(found, `${label} 메시지 id ${rec.msgId} 가 목록에 남아 있다`).toBeTruthy()
  expect(found!.body, `${label} 메시지 본문이 동일하다`).toBe(rec.msgBody)
  // 동일성 2 — 첨부 id·바이트
  const dl = await app.inject({ method: 'GET', url: `/api/attachments/${rec.attId}`, headers: { cookie: rec.cookie } })
  expect(dl.statusCode, `${label} 첨부 내려받기`).toBe(200)
  expect(Buffer.from(dl.rawPayload).equals(rec.attBytes), `${label} 첨부 바이트가 동일하다`).toBe(true)
  // 동일성 3 — 같은 토큰으로 v2 재접속이 된다 (봉투 welcome 수신까지)
  const conn = await connectV2(port, rec.token)
  expect(conn.welcome.room_id, `${label} 재접속 welcome 의 room`).toBe(rec.roomId)
  expect(conn.welcome.bot_id, `${label} 재접속 welcome 의 bot`).toBe(rec.botId)
  conn.ws.close()
}

describe('서버 재시작 영속성 — 인프로세스 회귀 짝 (REQ-E2E-009·010)', () => {
  it('재시작 후 메시지·첨부·토큰의 동일성이 남는다', async () => {
    await build()
    const rec = await seed()
    await closeForRestart()
    await build()   // 같은 데이터 디렉터리(env 그대로)로 다시 세운다 — 이것이 재시작이다
    await assertIdentities(rec, '재시작 후:')
  })

  it('재시작 이후 무관한 메시지를 더 써도 같은 세 동일성이 다시 성립한다 (AC-E2E-010)', async () => {
    await build()
    const rec = await seed()
    await closeForRestart()
    await build()
    await assertIdentities(rec, '재시작 직후:')
    // 재시작 이후의 새 쓰기 — 옛 행을 흔들지 않는다
    const mp = messagePayload('재시작 이후의 새 메시지')
    const fresh = await app.inject({ method: 'POST', url: `/api/rooms/${rec.roomId}/messages`, headers: { cookie: rec.cookie, ...mp.headers }, payload: mp.payload })
    expect(fresh.statusCode).toBe(200)
    // 같은 세 단언을 다시 돈다 — 새 쓰기가 옆에 있어도 옛 동일성은 그대로다
    await assertIdentities(rec, '새 쓰기 후:')
    const list = await app.inject({ method: 'GET', url: `/api/rooms/${rec.roomId}/messages`, headers: { cookie: rec.cookie } })
    expect((list.json() as { messages: { body: string }[] }).messages.some(m => m.body === '재시작 이후의 새 메시지')).toBe(true)
  })
})
