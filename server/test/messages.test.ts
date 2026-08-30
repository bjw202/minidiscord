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
  // M4 (SPEC-ROOMAUTHZ-001): 메시지 게이트가 멤버만 지나게 되었다 — 직접 INSERT 한 방이므로
  // 생성자 auto-join 에 해당하는 멤버 행 하나가 유일한 빠진 조각이다 (plan.md §F M4 2번)
  const alice = db.prepare("SELECT id FROM users WHERE username = 'alice'").get() as { id: number }
  db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, alice.id)
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

  it('saves uploaded file as attachment and serves download', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    const src = join(dir, 'memo.txt')
    writeFileSync(src, '파일 내용')

    const res = await postMessage(app, cookie, roomId, '파일 올림 @TO(pm)', src)
    expect(res.statusCode).toBe(200)

    const att = db.prepare('SELECT * FROM attachments').get() as any
    expect(att.filename).toBe('첨부.txt')
    expect(att.size).toBe(Buffer.byteLength('파일 내용'))
    expect(att.mime).toBe('text/plain')

    const dl = await app.inject({ method: 'GET', url: `/api/attachments/${att.id}`, headers: { cookie } })
    expect(dl.statusCode).toBe(200)
    expect(dl.body).toBe('파일 내용')
    expect(dl.headers['content-disposition']).toContain("filename*=UTF-8''")

    // 없는 첨부는 404
    const missing = await app.inject({ method: 'GET', url: '/api/attachments/9999', headers: { cookie } })
    expect(missing.statusCode).toBe(404)
  })

  // sync-audit F-02 — 서버 절대 경로가 HTTP 응답으로 새어 나가지 않는다
  it('never puts stored_path in the send or list response while keeping the id usable', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    const src = join(dir, 'memo.txt')
    writeFileSync(src, '파일 내용')

    const res = await postMessage(app, cookie, roomId, '파일 올림', src)
    expect(res.statusCode).toBe(200)
    const sent = JSON.parse(res.body).message

    // 전송 응답: 첨부는 있는데 stored_path 만 없다. 대조군으로 id·filename 은 실려야 한다 —
    // 이게 없으면 "첨부를 통째로 빼먹은" 구현도 이 테스트를 통과한다.
    expect(sent.attachments).toHaveLength(1)
    expect(sent.attachments[0].filename).toBe('첨부.txt')
    expect(typeof sent.attachments[0].id).toBe('number')
    expect(sent.attachments[0]).not.toHaveProperty('stored_path')

    // 목록 응답도 같다.
    const list = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie } })
    const listed = JSON.parse(list.body).messages[0]
    expect(listed.attachments).toHaveLength(1)
    expect(listed.attachments[0]).not.toHaveProperty('stored_path')

    // 문자열 어디에도 실제 저장 경로가 없다 — 다른 필드 이름으로 새는 경우까지 잡는다.
    const att = db.prepare('SELECT stored_path FROM attachments').get() as { stored_path: string }
    expect(res.body).not.toContain(att.stored_path)
    expect(list.body).not.toContain(att.stored_path)

    // id 하나로 여전히 내려받을 수 있다 — 경로를 감춘 대가로 기능이 죽지 않았음을 확인한다.
    const dl = await app.inject({ method: 'GET', url: `/api/attachments/${sent.attachments[0].id}`, headers: { cookie } })
    expect(dl.statusCode).toBe(200)
    expect(dl.body).toBe('파일 내용')
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

  it('refuses to serve an attachment whose stored path escapes the uploads directory', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()

    // 업로드 디렉터리 밖의 파일
    const outside = join(dir, 'secret.txt')
    writeFileSync(outside, '비밀입니다')

    await postMessage(app, cookie, roomId, '첨부 행을 붙일 메시지')
    const messageId = (db.prepare('SELECT id FROM messages').get() as { id: number }).id
    const bad = db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
      .run(messageId, 'secret.txt', outside, 5, 'text/plain').lastInsertRowid as number

    const dl = await app.inject({ method: 'GET', url: `/api/attachments/${bad}`, headers: { cookie } })
    expect(dl.statusCode).toBe(404)
    expect(dl.body).not.toContain('비밀입니다')
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

  it('lists messages after cursor', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    await postMessage(app, cookie, roomId, '첫째')
    await postMessage(app, cookie, roomId, '둘째')

    const ids = (db.prepare('SELECT id FROM messages ORDER BY id').all() as { id: number }[]).map(r => r.id)
    expect(ids[1]).toBeGreaterThan(ids[0])   // 커서가 방 안에서 단조 증가한다

    const list = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages?after=${ids[0]}`, headers: { cookie } })
    const msgs = list.json().messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].body).toBe('둘째')
    expect(msgs[0].id).toBe(ids[1])

    // after 가 없으면 처음부터
    const all = (await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie } })).json().messages
    expect(all.map((m: any) => m.body)).toEqual(['첫째', '둘째'])
  })

  it('list is scoped to the room and carries author_name', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    const otherRoom = db.prepare("INSERT INTO rooms (name) VALUES ('B')").run().lastInsertRowid as number
    // M4 (SPEC-ROOMAUTHZ-001): 이 방도 직접 INSERT 였으므로 alice 의 멤버 행이 필요하다 — 테스트가 B 방도 읽기를 기대한다
    const aliceId = (db.prepare("SELECT id FROM users WHERE username = 'alice'").get() as { id: number }).id
    db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(otherRoom, aliceId)

    await postMessage(app, cookie, roomId, 'A 방 메시지')
    await postMessage(app, cookie, otherRoom, 'B 방 메시지')

    const a = (await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie } })).json().messages
    expect(a.map((m: any) => m.body)).toEqual(['A 방 메시지'])
    expect(a[0].author_name).toBe('alice')
    expect(Array.isArray(a[0].attachments)).toBe(true)

    const b = (await app.inject({ method: 'GET', url: `/api/rooms/${otherRoom}/messages`, headers: { cookie } })).json().messages
    expect(b.map((m: any) => m.body)).toEqual(['B 방 메시지'])
  })

  it('all three message routes reject unauthenticated requests', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()

    // 대조군을 만들기 위해 인증된 상태로 메시지와 첨부를 하나 만든다
    const src = join(dir, 'a.txt')
    writeFileSync(src, 'x')
    await postMessage(app, cookie, roomId, '준비', src)
    const attId = (db.prepare('SELECT id FROM attachments').get() as { id: number }).id

    const form = new FormData()
    form.append('body', '몰래 보내기')

    // 쿠키 없음 → 세 라우트 전부 401
    const noAuth = [
      await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, payload: form }),
      await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages` }),
      await app.inject({ method: 'GET', url: `/api/attachments/${attId}` }),
    ]
    expect(noAuth.map(r => r.statusCode)).toEqual([401, 401, 401])

    // 대조군 — 같은 세 요청이 쿠키가 있으면 성공한다. 1차 감사 F-13: `!== 401` 은 404 도
    // 통과시켜 인증 경계를 느슨하게 잴 뿐 아니라 게이트가 걸려도 통과하는 단언이었다.
    // 실제 성공 코드(200)로 좁혀 기준의 원래 의도(인증된 요청은 성공한다)를 실제로 재게 한다.
    const withAuth = [
      await postMessage(app, cookie, roomId, '정상 전송'),
      await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie } }),
      await app.inject({ method: 'GET', url: `/api/attachments/${attId}`, headers: { cookie } }),
    ]
    expect(withAuth.every(r => r.statusCode === 200)).toBe(true)

    // 거부된 전송은 저장되지 않았다
    expect((db.prepare("SELECT COUNT(*) c FROM messages WHERE body='몰래 보내기'").get() as { c: number }).c).toBe(0)
  })

  it('buildServer wires the message routes, multipart and uploadsDir', async () => {
    process.env.MINIDISCORD_DATA_DIR = join(dir, 'srv')
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()

    // 1) uploadsDir 데코레이터가 config 값을 가리킨다 (REQ-MSG-015 항목 1)
    const { config } = await import('../src/config.js')
    expect((app as any).uploadsDir).toBe(config.uploadsDir)

    // 가입·로그인. set-cookie 정규화는 rooms-bots.test.ts 의 build() 와 같다
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'bob', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'bob', password: 'pw123456' } })
    const ck = setCookieOf(login).split(';')[0]
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name: 'A' } })).json()

    // 2) multipart 가 라우트보다 먼저 등록됐다 — 실제 form 전송이 왕복한다 (REQ-MSG-015 항목 2·3)
    const form = new FormData()
    form.append('body', '실서버 왕복')
    const sent = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/messages`, headers: { cookie: ck }, payload: form })
    expect(sent.statusCode).toBe(200)
    expect(sent.json().message.body).toBe('실서버 왕복')

    // 3) 목록 라우트가 등록돼 있고 방금 것을 돌려준다
    const list = await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/messages`, headers: { cookie: ck } })
    expect(list.statusCode).toBe(200)
    expect(list.json().messages.map((m: any) => m.body)).toEqual(['실서버 왕복'])

    // 4) 다운로드 라우트가 등록돼 있다 — 없는 id 라도 404 이지 "라우트 없음" 이 아니다
    const dl = await app.inject({ method: 'GET', url: '/api/attachments/9999', headers: { cookie: ck } })
    expect(dl.statusCode).toBe(404)
    expect(dl.json().message).not.toContain('Route GET:/api/attachments/9999 not found')

    await app.close()
  })
})
