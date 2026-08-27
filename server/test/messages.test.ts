import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { randomBytes } from 'node:crypto'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { sha256Hex } from '../src/routes-bots.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// light-my-request 는 set-cookie 값을 배열이 아니라 문자열 하나로 돌려준다 —
// rooms-bots.test.ts:21-26 의 setCookieOf 와 같은 정규화 (plan.md §D 8번)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  await app.register(multipart)
  const hub = createSseHub()
  app.decorate('hub', hub)
  const uploadsDir = join(dir, 'up')          // ← plan.md §D 4번: 게이트웨이와 데코레이터가 같은 값을 쓴다
  app.decorate('uploadsDir', uploadsDir)      // ← 원본에 없던 한 줄
  const gateway = createGateway(app, { uploadsDir })
  app.decorate('gateway', gateway)
  registerAuthRoutes(app, db)
  registerMessageRoutes(app)
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  return { app, cookie: setCookieOf(login).split(';')[0], uploadsDir }
}

function seed(): { roomId: number; botId: number } {
  const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number
  const botId = db.prepare("INSERT INTO bots (name, description) VALUES ('pm', '')").run().lastInsertRowid as number
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)')
    .run(roomId, botId, sha256Hex(randomBytes(32).toString('hex')))
  return { roomId, botId }
}

// asName 은 서버로 보낼 파일명. AC-MSG-007 이 여기에 경로 이탈 문자열을 넣는다.
async function postMessage(app: any, ck: string, roomId: number, body: string, filePath?: string, asName = '첨부.txt') {
  const form = new FormData()
  form.append('body', body)
  if (filePath) form.append('files', new Blob([await readFile(filePath)]), asName)
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie: ck }, payload: form })
}

describe('messages', () => {
  it('stores a plain user message with no targets', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    const res = await postMessage(app, cookie, roomId, '그냥 기록용 메모')
    expect(res.statusCode).toBe(200)

    const rows = db.prepare('SELECT * FROM messages').all() as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].body).toBe('그냥 기록용 메모')
    expect(rows[0].room_id).toBe(roomId)
    expect(rows[0].author_type).toBe('user')

    const targets = db.prepare('SELECT COUNT(*) c FROM message_targets').get() as { c: number }
    expect(targets.c).toBe(0)

    // 응답의 message 가 실제 저장된 행을 가리킨다 — 빈 껍데기 200 을 배제하는 단언
    expect(res.json().ok).toBe(true)
    expect(res.json().message.id).toBe(rows[0].id)
    expect(res.json().message.author_name).toBe('alice')
  })

  it('stores targets for mentioned bots', async () => {
    const { app, cookie } = await build()
    const { roomId, botId } = seed()
    const res = await postMessage(app, cookie, roomId, '@TO(pm) 일정 정리해줘 @CC(pm) 참고')
    expect(res.statusCode).toBe(200)

    const messageId = (db.prepare('SELECT id FROM messages').get() as { id: number }).id
    const ts = db.prepare('SELECT * FROM message_targets ORDER BY delivery').all() as any[]
    expect(ts).toHaveLength(2)
    expect(ts.map(t => t.delivery)).toEqual(['cc', 'to'])
    expect(ts.every(t => t.bot_id === botId)).toBe(true)
    expect(ts.every(t => t.message_id === messageId)).toBe(true)
  })

  it('rejects mention of bot not invited to the room', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()

    const bad = await postMessage(app, cookie, roomId, '@TO(모르는봇) 안녕')
    expect(bad.statusCode).toBe(400)
    expect(bad.json().error).toContain('모르는봇')

    // 세 테이블 어디에도 남지 않는다
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
    expect((db.prepare('SELECT COUNT(*) c FROM message_targets').get() as { c: number }).c).toBe(0)
    expect((db.prepare('SELECT COUNT(*) c FROM attachments').get() as { c: number }).c).toBe(0)

    // 대조군 — 초대된 봇 멘션은 같은 라우트에서 통과한다
    const good = await postMessage(app, cookie, roomId, '@TO(pm) 안녕')
    expect(good.statusCode).toBe(200)
  })

  it('send failures distinguish missing room from archived room', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()

    const missing = await postMessage(app, cookie, 9999, '없는 방으로')
    expect(missing.statusCode).toBe(404)

    db.prepare("UPDATE rooms SET status='archived' WHERE id=?").run(roomId)
    const archived = await postMessage(app, cookie, roomId, '늦은 메시지')
    expect(archived.statusCode).toBe(409)

    // 두 실패의 문구가 서로 다르다 — 같은 코드를 두 주어에 쓰지 않는다는 증거
    expect(missing.json().error).not.toBe(archived.json().error)

    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
  })

  it('rejects an empty send with neither body nor file', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()

    const empty = await postMessage(app, cookie, roomId, '   ')
    expect(empty.statusCode).toBe(400)
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)

    // 대조군 — 내용이 있으면 같은 라우트가 통과시킨다
    const ok = await postMessage(app, cookie, roomId, '한 글자')
    expect(ok.statusCode).toBe(200)
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(1)
  })

  it('refuses to store an upload outside the uploads directory', async () => {
    const { app, cookie, uploadsDir } = await build()
    const { roomId } = seed()
    const src = join(dir, 'payload.txt')
    writeFileSync(src, '이탈 시도')

    const res = await postMessage(app, cookie, roomId, '경로 이탈', src, '../../../../etc/passwd')
    expect(res.statusCode).toBe(200)

    const att = db.prepare('SELECT * FROM attachments').get() as { filename: string; stored_path: string }

    // 1) 경로 성분이 제거된 이름만 DB 에 남는다
    expect(att.filename).toBe('passwd')

    // 2) 저장 경로를 절대 경로로 풀어도 업로드 디렉터리 안이다
    expect(resolve(att.stored_path).startsWith(resolve(uploadsDir) + sep)).toBe(true)

    // 3) 그 경로에 파일이 실제로 있다 — "아무 데도 안 썼다"로 통과하는 것을 배제
    expect(existsSync(att.stored_path)).toBe(true)
  })

  it('publishes to the sse hub and delivers to the gateway exactly once', async () => {
    const { app, cookie } = await build()
    const { roomId, botId } = seed()

    const published: unknown[][] = []
    const delivered: unknown[][] = []
    const hub = (app as any).hub
    const gateway = (app as any).gateway
    const origPublish = hub.publish.bind(hub)
    const origDeliver = gateway.deliver.bind(gateway)
    hub.publish = (...a: unknown[]) => { published.push(a); return origPublish(...a) }
    gateway.deliver = (...a: unknown[]) => { delivered.push(a); return origDeliver(...a) }

    const res = await postMessage(app, cookie, roomId, '@TO(pm) 확인해줘')
    expect(res.statusCode).toBe(200)

    const messageId = (db.prepare('SELECT id FROM messages').get() as { id: number }).id

    expect(published).toHaveLength(1)
    expect(published[0][0]).toBe(roomId)
    expect(published[0][1]).toBe('message')
    // 페이로드가 실제 그 메시지다 — hub.publish(roomId, 'message', {}) 를 배제
    expect((published[0][2] as any).id).toBe(messageId)
    expect((published[0][2] as any).author_name).toBe('alice')

    expect(delivered).toHaveLength(1)
    expect(delivered[0][0]).toBe(roomId)
    // msg 인자가 실제 그 메시지다 — 게이트웨이가 이 id 로 last_delivered_id 를 올린다
    expect((delivered[0][1] as any).id).toBe(messageId)
    expect((delivered[0][1] as any).body).toBe('@TO(pm) 확인해줘')
    expect((delivered[0][1] as any).author_name).toBe('alice')
    expect(delivered[0][2]).toEqual([{ botId, delivery: 'to' }])
  })
})
