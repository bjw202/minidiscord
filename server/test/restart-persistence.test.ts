// server/test/restart-persistence.test.ts — REQ-E2E-009 인프로세스 회귀 짝.
// E2E 스크립트(scripts/e2e.mts)가 셸 명령으로 잡는 것과 같은 「서버 재시작 영속성」을
// vitest 안에서 같은 데이터 디렉터리로 buildServer() 를 두 번 세워 관측한다.
// 판정은 개수 산술이 아니라 동일성이다(REQ-E2E-010) — 메시지 id·본문, 첨부 바이트,
// 봇 토큰의 재접속 가능. 격리 관행은 gateway.test.ts 의 mkdtempSync+afterEach 를 따른다.
// v2 A 단계 (SPEC-BOTMODEL-001): 토큰은 봇 등록 응답의 것 하나이고, 재접속은 맨몸 hello{token} 이다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import WebSocket from 'ws'
import { buildServer } from '../src/index.js'

let dir: string
let app: FastifyInstance
let port: number

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-restart-'))
  // config.ts 의 게터가 호출 시점에 env 를 읽는다 — import 이후 설정도 반영된다
  process.env.MINIDISCORD_DATA_DIR = dir
})
afterEach(async () => {
  delete process.env.MINIDISCORD_DATA_DIR
  if (app) { await app.close(); app.db.close() }   // 아래 closeForRestart 의 [HARD] 닫기와 같은 형태
  app = undefined as unknown as FastifyInstance
  rmSync(dir, { recursive: true, force: true })
})

/** 재시작의 닫기 절반 — [HARD] REQ-E2E-009. 닫힘 없이 다시 buildServer() 하는 것은 재시작이 아니라 두 연결 병존이다. */
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

/** 맨몸 hello{token} → 맨몸 welcome */
function connect(p: number, token: string): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${p}/bot`)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', d => {
      let m: any
      try { m = JSON.parse(String(d)) } catch { return }
      if (m.type === 'welcome') resolve({ ws, welcome: m })
    })
    ws.on('error', reject)
    ws.on('close', () => reject(new Error('harness: welcome 전에 닫혔다')))
  })
}

/** 메시지 라우트는 req.parts() multipart 만 받는다 — 최소 multipart 을 손으로 조립한다 */
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

/** 재시작 전의 쓰기 — 회원·방·봇(등록 토큰)·참여, 첨부 하나가 붙은 메시지. 전부 앱 자신의 라우트로 넣는다 */
async function seed(): Promise<Rec> {
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'restart-user' } })
  expect(login.statusCode).toBe(200)
  const rawSet = login.headers['set-cookie'] as unknown as string | string[] | undefined
  const cookie = (Array.isArray(rawSet) ? rawSet : [rawSet ?? '']).map(c => c.split(';')[0]).find(c => c.startsWith('md_session='))
  expect(cookie, '로그인이 md_session 쿠키를 준다').toBeTruthy()

  const room = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: cookie! }, payload: { name: 'restart-room' } })
  expect(room.statusCode).toBe(201)
  const roomId = (room.json() as { id: number }).id
  const bot = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: cookie! }, payload: { name: 'Restart-Bot' } })
  expect(bot.statusCode).toBe(201)
  const { id: botId, token } = bot.json() as { id: number; token: string }
  const joined = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/bots`, headers: { cookie: cookie! }, payload: { bot_id: botId } })
  expect(joined.statusCode).toBe(201)

  const msgBody = '재시작 전에 저장한 메시지'
  const attBytes = Buffer.from('restart attachment bytes')
  const mp = messagePayload(msgBody, [{ filename: 'restart.txt', data: attBytes }])
  const sent = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie: cookie!, ...mp.headers }, payload: mp.payload })
  expect(sent.statusCode).toBe(200)
  const message = (sent.json() as { message: { id: number; attachments: { id: number }[] } }).message
  expect(message.attachments.length).toBe(1)
  return { cookie: cookie!, roomId, botId, token, msgId: message.id, msgBody, attId: message.attachments[0].id, attBytes }
}

/** 세 동일성 대조 — id 로 찾아 본문을, id 로 내려받아 바이트를, 같은 토큰으로 접속해 welcome 을 본다. */
async function assertIdentities(rec: Rec, label: string): Promise<void> {
  const list = await app.inject({ method: 'GET', url: `/api/rooms/${rec.roomId}/messages`, headers: { cookie: rec.cookie } })
  expect(list.statusCode, `${label} 방 목록 조회`).toBe(200)
  const found = (list.json() as { messages: { id: number; body: string }[] }).messages.find(m => m.id === rec.msgId)
  expect(found, `${label} 메시지 id ${rec.msgId} 가 목록에 남아 있다`).toBeTruthy()
  expect(found!.body, `${label} 메시지 본문이 동일하다`).toBe(rec.msgBody)
  const dl = await app.inject({ method: 'GET', url: `/api/attachments/${rec.attId}`, headers: { cookie: rec.cookie } })
  expect(dl.statusCode, `${label} 첨부 내려받기`).toBe(200)
  expect(Buffer.from(dl.rawPayload).equals(rec.attBytes), `${label} 첨부 바이트가 동일하다`).toBe(true)
  // 동일성 3 — 같은 토큰으로 재접속이 되고 welcome 의 rooms 에 그 방이 그대로 있다 (참여도 영속이다)
  const conn = await connect(port, rec.token)
  expect(conn.welcome.bot_id, `${label} 재접속 welcome 의 bot`).toBe(rec.botId)
  expect(conn.welcome.rooms.map((r: { room_id: number }) => r.room_id), `${label} 재접속 welcome 의 rooms`).toContain(rec.roomId)
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
    const mp = messagePayload('재시작 이후의 새 메시지')
    const fresh = await app.inject({ method: 'POST', url: `/api/rooms/${rec.roomId}/messages`, headers: { cookie: rec.cookie, ...mp.headers }, payload: mp.payload })
    expect(fresh.statusCode).toBe(200)
    await assertIdentities(rec, '새 쓰기 후:')
    const list = await app.inject({ method: 'GET', url: `/api/rooms/${rec.roomId}/messages`, headers: { cookie: rec.cookie } })
    expect((list.json() as { messages: { body: string }[] }).messages.some(m => m.body === '재시작 이후의 새 메시지')).toBe(true)
  })
})
