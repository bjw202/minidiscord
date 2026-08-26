# SPEC-MSG-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 디렉터리의 `plan.md` 와 `spec.md` 는 초기 커밋(`edd982e`)에 담긴 **폐기된 v1** 이며 이 SPEC 의 참조 대상이 아니다.

이 SPEC 은 `SPEC-CORE-001`·`SPEC-AUTH-001`·`SPEC-ROOM-001`·`SPEC-MENTION-001`·`SPEC-SSE-001`·`SPEC-GATEWAY-001` 이 먼저 끝난 상태를 전제한다.

---

## 판정 방식에 관한 공통 조항 (먼저 읽을 것)

**1. 테스트 기반 기준은 모두 `--reporter=verbose` 의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 **아예 쓰지 않은 실행**과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다 — 요약 줄로도 종료 코드로도 두 경우를 가를 수 없다. 따라서 AC-MSG-001 부터 AC-MSG-012 까지의 명령은 전부

```bash
npm test -w server -- --reporter=verbose
```

이고(AC-MSG-015 도 같다), 각 기준의 관측 대상은 출력에 `✓ test/messages.test.ts > messages > <그 기준이 지정한 테스트 이름>` 로 읽히는 줄(끝에 붙는 소요 시간은 제외)이 **실제로 나타나는가** 하나다. 그 줄이 없으면 — 테스트를 안 썼든, 이름이 다르든, 건너뛰었든, 실패했든 — **그 기준은 실패다**. `-t <이름>` 필터로 대신하지 않는다: 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다 (`SPEC-BOT-001` 3차 감사 D1 의 교훈).

**2. 각 기준은 그 테스트가 무엇을 단언하는지까지 지정한다.** `✓` 줄 하나만으로는 이름이 맞는 빈 테스트도 통과한다. 그래서 아래 시나리오는 테스트 본문을 그대로 싣고, 통과 판정은 "그 이름의 테스트가 **그 본문으로** 통과했다"이다. 구현자가 단언을 지우거나 약화하면 그 기준은 충족되지 않는다.

**3. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 실패다.** AC-MSG-013 의 명령은 `git rev-parse --verify` 로 기준 SHA 가 실제 커밋으로 풀리는지 먼저 확인하고, 그 확인이 **종료 코드 `0`** 으로 끝난 뒤에만 `git diff` 로 넘어간다. `spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이며 M1 단계 0 에서 기록한다.

---

## 공통 테스트 하네스

아래 모든 시나리오는 `server/test/messages.test.ts` 의 다음 하네스를 쓴다. 원본 `plan-v2.md` Task 9 의 `build()` 에서 **두 곳이 고쳐져 있다.**

- **`set-cookie` 정규화** (`plan.md` §D 8번) — `light-my-request` 는 `set-cookie` 를 배열이 아니라 **문자열 하나**로 돌려준다. 원본의 `login.headers['set-cookie']![0]` 은 그 문자열의 첫 글자 `"m"` 을 집어내고 `.split(';')[0]` 도 `"m"` 이라, 그 값을 쿠키로 보내면 `requireAuth` 가 전부 `401` 을 낸다 — **정상 구현조차 열두 기준을 통과할 수 없다.** 이미 머지된 `server/test/rooms-bots.test.ts:21-26` 이 같은 문제를 `setCookieOf` 로 해소해 두었고, 형제 SPEC 의 AC-GW-018 도 같은 교정을 적용했다. 이 하네스는 그 형태를 그대로 따른다.
- **`uploadsDir` 데코레이트** (`plan.md` §D 4번) — 원본은 `uploadsDir` 을 `createGateway` 에만 넘기는데 구현은 `req.server.uploadsDir` 을 읽으므로, 그대로 두면 업로드 테스트가 `mkdirSync(undefined)` 로 던진다.

```ts
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
```

모든 테스트는 `describe('messages', () => { … })` 안에 둔다 — `✓` 줄의 가운데 칸이 `messages` 인 것이 그 때문이다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-MSG-001 | REQ-MSG-001 | `npm test -w server -- --reporter=verbose` | `✓ … > messages > stores a plain user message with no targets` 줄 |
| AC-MSG-002 | REQ-MSG-002 | 〃 | `✓ … > messages > stores targets for mentioned bots` 줄 |
| AC-MSG-003 | REQ-MSG-003 | 〃 | `✓ … > messages > rejects mention of bot not invited to the room` 줄 |
| AC-MSG-004 | REQ-MSG-004 | 〃 | `✓ … > messages > send failures distinguish missing room from archived room` 줄 |
| AC-MSG-005 | REQ-MSG-005 | 〃 | `✓ … > messages > rejects an empty send with neither body nor file` 줄 |
| AC-MSG-006 | REQ-MSG-006, REQ-MSG-008 | 〃 | `✓ … > messages > saves uploaded file as attachment and serves download` 줄 |
| AC-MSG-007 | REQ-MSG-007 | 〃 | `✓ … > messages > refuses to store an upload outside the uploads directory` 줄 |
| AC-MSG-008 | REQ-MSG-009 | 〃 | `✓ … > messages > refuses to serve an attachment whose stored path escapes the uploads directory` 줄 |
| AC-MSG-009 | REQ-MSG-010 | 〃 | `✓ … > messages > publishes to the sse hub and delivers to the gateway exactly once` 줄 |
| AC-MSG-010 | REQ-MSG-011, REQ-MSG-012 | 〃 | `✓ … > messages > lists messages after cursor` 줄 |
| AC-MSG-011 | REQ-MSG-011 | 〃 | `✓ … > messages > list is scoped to the room and carries author_name` 줄 |
| AC-MSG-012 | REQ-MSG-013 | 〃 | `✓ … > messages > all three message routes reject unauthenticated requests` 줄 |
| AC-MSG-013 | REQ-MSG-014 | 아래 AC-MSG-013 본문의 네 명령 | 여덟 파일, 기준 SHA 확인 exit `0`, `db.ts` diff exit `0` + 빈 출력, 변경 파일 목록이 정확히 두 줄 |
| AC-MSG-014 | RED→GREEN 전이 | 아래 AC-MSG-014 본문 | 네 전이가 순서대로 관측됨 |
| AC-MSG-015 | REQ-MSG-015 | `npm test -w server -- --reporter=verbose` | `✓ … > messages > buildServer wires the message routes, multipart and uploadsDir` 줄 |

---

## Given-When-Then 시나리오

### AC-MSG-001 — 멘션 없는 사용자 메시지가 저장된다

**Given** 활성 방이 하나 있고 로그인한 사용자가 있다.
**When** 아래 테스트를 `messages.test.ts` 에 두고 `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
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
```

**Then** `✓ test/messages.test.ts > messages > stores a plain user message with no targets` 줄이 출력에 나타난다.

`message.id === rows[0].id` 단언이 이 기준의 핵심이다. 이것이 없으면 아무것도 저장하지 않고 `{ ok: true, message: {} }` 만 돌려주는 구현이 `targets.c === 0` 과 `statusCode === 200` 을 통과해 버린다.

### AC-MSG-002 — 멘션이 전달 대상으로 기록된다

**Given** 방에 `pm` 봇이 초대돼 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > stores targets for mentioned bots` 줄이 나타난다 — `to` 와 `cc` 두 행이 기록되고, 둘 다 그 메시지와 그 봇을 가리킨다.

두 종류(`to`/`cc`)를 함께 단언하는 이유는, 하나만 보면 `delivery` 를 상수로 박은 구현이 통과하기 때문이다.

### AC-MSG-003 — 초대되지 않은 봇 멘션은 거부되고 아무것도 남지 않는다

**Given** 방에 `pm` 만 초대돼 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > rejects mention of bot not invited to the room` 줄이 나타난다.

대조군이 이 기준의 핵심이다. 그것이 없으면 **모든 전송을 `400` 으로 거부하는 구현**이 앞의 네 단언을 전부 통과한다.

> **관측 경계.** "아무것도 남지 않는다"의 관측 대상은 **DB 세 테이블**이지 디스크가 아니다. 파일 파트가 있는 요청이 멘션 오류로 거부되면 이미 저장된 파일이 디스크에 고아로 남는다 — `plan.md` §D 6번이 수용한 위험이며, 원자적 이동은 이 SPEC 범위 밖이다.

### AC-MSG-004 — 전송 실패는 없는 방과 보관된 방을 구분한다

**Given** 활성 방 하나와 존재하지 않는 방 `id` 가 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > send failures distinguish missing room from archived room` 줄이 나타난다 — 없는 방은 `404`, 보관된 방은 `409`, 두 본문이 서로 다르고, 어느 쪽도 `messages` 에 행을 남기지 않는다.

> **원본으로부터의 의도적 이탈.** 원본 `plan-v2.md:1837` 은 `if (!room) return reply.code(403).send({ error: '활성 방이 아닙니다' })` 로 두 경우를 `403` 하나로 합쳤고, 원본 테스트 이름은 `rejects message to archived room` 이었다. 그 형태로는 두 경우를 구분할 수 없고, `403`(인증됐으나 권한 없음)이 가리킬 권한 차원이 이 시스템에 없다. `SPEC-BOT-001` §D 5번이 초대 라우트에서 같은 결함을 이미 고쳤고, 이 SPEC 은 그 규칙(`404` = 대상 없음, `409` = 상태 충돌)을 그대로 따른다. 경위는 `plan.md` §D 1번에 있다.

### AC-MSG-005 — 내용도 파일도 없는 전송은 거부된다

**Given** 활성 방이 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > rejects an empty send with neither body nor file` 줄이 나타난다.

여기서도 대조군이 "전부 `400`" 구현을 배제한다.

### AC-MSG-006 — 첨부가 저장되고 다시 내려받아진다

**Given** 활성 방이 있고 올릴 파일이 하나 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > saves uploaded file as attachment and serves download` 줄이 나타난다 — 저장된 바이트 수와 MIME 이 맞고, 내려받은 본문이 올린 내용과 **바이트 단위로 같으며**, 없는 `id` 는 `404` 다.

`dl.body === '파일 내용'` 이 왕복을 닫는 단언이다. 파일을 안 쓰거나 다른 경로를 읽는 구현은 여기서 갈린다.

### AC-MSG-007 — 업로드 파일명이 업로드 디렉터리를 벗어나지 못한다

**Given** 사용자가 파일명에 경로 이탈 문자열을 실어 보낸다. 이 기준이 쓰는 구체적 입력은 `../../../../etc/passwd` 다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > refuses to store an upload outside the uploads directory` 줄이 나타난다.

`basename` 을 적용하지 않는 구현(= 원본 `plan-v2.md:1845`)에서는 `att.filename` 이 `'../../../../etc/passwd'` 가 되어 1번이 실패하고, `resolve(stored_path)` 가 업로드 디렉터리 밖을 가리켜 2번도 실패한다. 3번은 "경로 이탈을 막는다"를 "파일을 아예 안 쓴다"로 오해한 구현을 걸러 낸다.

### AC-MSG-008 — 업로드 디렉터리 밖을 가리키는 첨부는 내보내지 않는다

**Given** `attachments` 에 업로드 디렉터리 밖을 가리키는 `stored_path` 행이 이미 들어 있다(다른 경로로 들어온 행, 수동 삽입, 또는 미래의 봇 발신 첨부 경로).
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > refuses to serve an attachment whose stored path escapes the uploads directory` 줄이 나타난다 — 상태 코드가 `404` 이고, 응답 본문에 그 파일의 내용이 들어 있지 않다.

원본 구현(`plan-v2.md:1885`)은 `createReadStream(att.stored_path)` 로 어떤 경로든 그대로 스트리밍하므로 이 테스트는 `200` + `'비밀입니다'` 로 **실패한다**. 두 단언을 함께 두는 이유는, 상태 코드만 보면 `404` 를 내면서 본문을 함께 실어 보내는 구현을 놓치기 때문이다.

### AC-MSG-009 — SSE 발행과 게이트웨이 전달이 각각 정확히 한 번

**Given** 방에 `pm` 이 초대돼 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > publishes to the sse hub and delivers to the gateway exactly once` 줄이 나타난다.

두 호출을 **아예 하지 않아도** 나머지 열네 기준은 전부 통과한다 — DB 에는 다 들어가기 때문이다. 그래서 호출 자체를 직접 관측한다. 횟수를 `toHaveLength(1)` 로 못 박는 것은 같은 메시지를 두 번 밀어 내는 구현(브라우저에 중복 표시)을 함께 잡기 위해서다.

**두 번째 인자를 단언하는 이유** (plan-audit M3). 초판은 `delivered[0][2]`(targets)만 보고 `delivered[0][1]`(msg)을 건너뛰었다. 그러면 `gateway.deliver(roomId, {}, targets)` 처럼 **빈 객체를 넘기는 구현이 통과한다.** 게이트웨이는 그 `msg.id` 로 `bot_tokens.last_delivered_id` 를 올리므로(`plan-v2.md:1580`), 빈 객체가 넘어가면 이 SPEC 이 스스로 "가장 비싼 계약"이라 부른 커서 체계(REQ-MSG-012)가 조용히 깨지고 봇의 재접속 복구가 잘못된 지점에서 시작한다. 두 SPEC 이 만나는 유일한 이음매이므로 여기서 관측한다. 같은 이유로 SSE 페이로드(`published[0][2]`)도 함께 단언한다 — 그것이 없으면 `hub.publish(roomId, 'message', {})` 가 통과하고 브라우저에 빈 메시지가 뜬다.

### AC-MSG-010 — 커서 이후의 메시지만 돌려준다

**Given** 같은 방에 메시지가 두 개 쌓여 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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
```

**Then** `✓ … > messages > lists messages after cursor` 줄이 나타난다 — `after` 를 준 조회는 그 이후 하나만, 안 준 조회는 오름차순 둘 다다.

`after` 를 무시하고 전부 돌려주는 구현은 첫 `toHaveLength(1)` 에서, `after` 를 잘못 해석해 아무것도 안 돌려주는 구현은 마지막 `toEqual` 에서 갈린다.

### AC-MSG-011 — 목록은 그 방으로 한정되고 작성자 이름을 담는다

**Given** 방이 둘 있고 각각에 메시지가 하나씩 있다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
it('list is scoped to the room and carries author_name', async () => {
  const { app, cookie } = await build()
  const { roomId } = seed()
  const otherRoom = db.prepare("INSERT INTO rooms (name) VALUES ('B')").run().lastInsertRowid as number

  await postMessage(app, cookie, roomId, 'A 방 메시지')
  await postMessage(app, cookie, otherRoom, 'B 방 메시지')

  const a = (await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie } })).json().messages
  expect(a.map((m: any) => m.body)).toEqual(['A 방 메시지'])
  expect(a[0].author_name).toBe('alice')
  expect(Array.isArray(a[0].attachments)).toBe(true)

  const b = (await app.inject({ method: 'GET', url: `/api/rooms/${otherRoom}/messages`, headers: { cookie } })).json().messages
  expect(b.map((m: any) => m.body)).toEqual(['B 방 메시지'])
})
```

**Then** `✓ … > messages > list is scoped to the room and carries author_name` 줄이 나타난다 — 각 방 조회가 **그 방 것만** 돌려주고, 각 메시지가 `author_name` 과 `attachments` 배열을 담는다.

두 방을 교차로 확인하는 것이 핵심이다. 한 방만 보면 `WHERE room_id=?` 를 빠뜨린 구현도 통과한다.

### AC-MSG-012 — 세 라우트 모두 미인증 요청을 거부한다

**Given** 세션 쿠키가 없는 요청과 있는 요청을 나란히 보낸다.
**When** 아래 테스트를 두고 같은 명령을 실행한다.

```ts
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

  // 대조군 — 같은 세 요청이 쿠키가 있으면 401 이 아니다
  const withAuth = [
    await postMessage(app, cookie, roomId, '정상 전송'),
    await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie } }),
    await app.inject({ method: 'GET', url: `/api/attachments/${attId}`, headers: { cookie } }),
  ]
  expect(withAuth.every(r => r.statusCode !== 401)).toBe(true)

  // 거부된 전송은 저장되지 않았다
  expect((db.prepare("SELECT COUNT(*) c FROM messages WHERE body='몰래 보내기'").get() as { c: number }).c).toBe(0)
})
```

**Then** `✓ … > messages > all three message routes reject unauthenticated requests` 줄이 나타난다.

부정 사례가 이 기준의 본체다 — `requireAuth` 를 붙인 라우트만 `401` 을 낸다. 대조군은 "모든 요청을 `401` 로 막는" 구현을 배제하고, 마지막 단언은 `401` 을 돌려주면서도 본문은 저장하는 구현을 배제한다.

> **이 기준이 검증하지 않는 것.** 이것은 **인증**(로그인 여부)이지 **인가**(그 방에 접근할 자격)가 아니다. 방 구성원이라는 개념이 스키마에 없어 인가는 이 SPEC 이 강제할 수 있는 대상이 아니다 — `plan.md` §D 2번과 `spec.md` REQ-MSG-013 본문에 근거가 있다. 로그인한 사람이 남의 방을 읽고 남의 첨부를 내려받는 것은 이 시스템에서 **의도된 동작**이며, 잔여 위험으로 기록돼 있다.

### AC-MSG-013 — 범위 경계와 스키마 불변

**Given** 이 SPEC 의 구현이 끝났다.
**When** 다음 네 명령을 차례로 실행한다.

```bash
ls server/src
git rev-parse --verify "$(cat .moai/specs/SPEC-MSG-001/.spec-base-sha)^{commit}"
git diff --stat <둘째 명령이 출력한 40자리 SHA> -- server/src/db.ts
git diff --name-only <같은 SHA> -- server/src
```

**둘째 명령이 앞에 있어야 하는 이유.** M1 단계 0 을 건너뛴 실행에서는 `.spec-base-sha` 가 없고, `git diff … "$(cat …)"` 는 `$(cat …)` 이 빈 문자열이 되어 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 그러면 셋째 명령의 "비어 있음"은 성립해 버려 그 관측만 조용히 무력해진다. 그래서 기준 SHA 의 존재 자체를 관측 대상으로 올린다. 셋째·넷째 명령에 SHA 를 직접 적는 것은 `$(cat …)` 을 품은 `git diff` 가 워크트리 격리 세션의 가드에 걸려 실행되지 않기 때문이다.

**Then** 네 관측이 모두 성립한다.

1. `auth.ts`, `config.ts`, `db.ts`, `gateway.ts`, `index.ts`, `mention.ts`, `routes-bots.ts`, `routes-messages.ts`, `routes-rooms.ts`, `sse.ts` 가 모두 있다 — 선행 형제 SPEC 이 만든 `mention.ts`·`sse.ts`·`gateway.ts` 가 이미 있어야 하고, 이 SPEC 이 더한 `routes-messages.ts` 가 있어야 한다.
   **`permissions.ts` 의 존재 여부는 이 기준의 관측 대상이 아니다.** 형제 SPEC `SPEC-PERM-001`(원본 Task 10)이 같은 카드에서 그 파일을 만들 수 있고, 그 경우 목록에 나타나는 것이 정상이다. REQ-MSG-014 가 금지하는 것은 "**이 SPEC 이** 그것을 만드는 것"이며, 그 판정은 4번의 `git diff --name-only` 가 한다 — 그 출력에 `permissions.ts` 가 나타나면 실패다.
2. 둘째 명령이 **종료 코드 `0`** 으로 끝나고 40자리 SHA 한 줄을 출력한다. 종료 코드가 `0` 이 아니거나 `fatal:` 이 나오면 **이 기준은 실패**다. 셋째·넷째로 넘어가지 않는다.
3. 셋째 명령이 **종료 코드 `0`** 으로 끝나고 **출력이 비어 있다** — `db.ts` 가 이 SPEC 의 진입 시점 이후 한 줄도 바뀌지 않았다. 두 조건이 함께 성립해야 통과다.
4. 넷째 명령이 **종료 코드 `0`** 으로 끝나고 출력이 정확히 두 줄 — `server/src/index.ts` 와 `server/src/routes-messages.ts` 다. 다른 파일이 나타나면 실패다.

> 1번의 파일 목록은 형제 SPEC 세 개(`SPEC-MENTION-001`·`SPEC-SSE-001`·`SPEC-GATEWAY-001`)가 각자 자기 파일을 만든 뒤의 상태를 전제한다. 그 셋 중 하나라도 없으면 이 SPEC 의 테스트가 import 단계에서 실패하므로, 여기까지 오지 못한다.

### AC-MSG-014 — RED → GREEN 전이 증거

**Given** 각 마일스톤에서 테스트를 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 네 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | `messages.test.ts` 추가 후 전송 테스트가 실패. 원인은 `../src/routes-messages.js` 모듈 부재 |
| 2 | M1 | GREEN | `routes-messages.ts` 의 `POST` + `index.ts` 배선 후 전송 테스트 전부 통과 |
| 3 | M2 | RED | 목록·다운로드 테스트 추가 후 그 항목들이 실패. 원인은 `GET` 두 라우트 미등록 |
| 4 | M2 | GREEN | `GET` 두 라우트와 읽기 시점 경로 봉인 구현 후 전체 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다. RED 판정은 도구가 내는 특정 문구가 아니라 "그 모듈이/그 라우트가 없어서 실패했다"는 **원인이 출력에서 확인되는가**로 한다.

### AC-MSG-015 — 조립: `buildServer` 가 세 라우트와 multipart 와 `uploadsDir` 을 실제로 배선한다

> plan-audit M2. 초판에는 이 기준이 없었고, 열네 기준 전부가 손으로 조립한 `build()` 앱을 썼다. 그 결과 **실제 서버에 라우트가 하나도 등록되지 않아도 SPEC 이 완료로 판정되는** 상태였다 — `index.ts` 를 아무 한 줄이나 건드리면 AC-MSG-013 4번이 성립하기 때문이다. 형제 SPEC 의 AC-GW-018 과 같은 형태로 그 구멍을 닫는다.

**Given** `buildServer()` 로 띄운 실제 서버가 있다.
**When** 아래 테스트를 두고 `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
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
```

**Then** `✓ … > messages > buildServer wires the message routes, multipart and uploadsDir` 줄이 나타난다.

네 관측이 각각 배선의 한 조각을 맡는다. 1번은 `uploadsDir` 데코레이터, 2번은 multipart 등록과 그 **순서**(뒤에 등록되면 `req.parts()` 가 없어 여기서 실패한다), 3번은 목록 라우트, 4번은 다운로드 라우트다.

4번의 두 번째 단언이 필요한 이유는, 라우트를 등록하지 않아도 Fastify 가 `404` 를 내기 때문이다. 상태 코드만 보면 "등록됨"과 "미등록"이 같은 값이라 아무것도 가르지 못한다. 그래서 본문이 Fastify 의 기본 미등록 응답(`Route GET:… not found`)이 아닌지까지 본다 — 등록된 라우트라면 REQ-MSG-008 이 정한 "파일을 찾을 수 없다"는 한국어 문구가 온다.

`process.env.MINIDISCORD_DATA_DIR` 을 임시 디렉터리로 바꾸는 것은 `config.dataDir` 이 게터라 가능하다(`SPEC-ROOM-001` `plan.md` §D 8번). 이 한 줄이 없으면 실제 저장소의 `data/` 에 DB 와 업로드가 생긴다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 같은 봇을 `@TO` 와 `@CC` 로 함께 멘션 | `message_targets` 에 두 행. 중복 제거하지 않는다 | AC-MSG-002 |
| 멘션이 여럿이고 그중 하나만 미초대 | 전체를 `400` 으로 거부. 부분 저장은 없다 | AC-MSG-003 (`unknown` 배열이 비어 있지 않으면 즉시 반환) |
| 파일만 있고 `body` 가 빈 문자열 | `200`. 파일이 있으면 빈 내용도 유효하다 | AC-MSG-005 의 반대 경로 — REQ-MSG-005 는 "둘 다 없을 때"만 거부한다 |
| 파일명이 `첨부.txt` 처럼 한글 | 그대로 저장·표시되고 `filename*=UTF-8''` 로 인코딩되어 내려온다 | AC-MSG-006 |
| 파일명이 `../` 만으로 이루어진 경우 | `basename('../')` → `'..'`. 업로드 디렉터리 안에 `<uuid>-..` 로 저장된다 — 디렉터리를 벗어나지 않는다 | AC-MSG-007 과 같은 경로 |
| 확장자가 MIME 표에 없는 파일 | `application/octet-stream` | AC-MSG-006 과 같은 경로 |
| 없는 방의 메시지 목록 조회 | 빈 배열 `[]`. 오류가 아니다 | REQ-MSG-011 이 방 존재 여부를 보지 않는다. `spec.md §5` 가 범위 밖으로 명시 |
| `after` 가 숫자가 아닌 문자열 | `Number('abc')` → `NaN` → `id > NaN` 이 항상 거짓이라 빈 배열 | 수용. 원본 그대로이며 오류를 내지 않는다 |
| 메시지가 200개를 넘는 방 | `LIMIT 200` 으로 잘린다. 클라이언트는 마지막 `id` 를 커서로 이어 조회한다 | REQ-MSG-011 |
| 보관된 방의 메시지 목록 조회 | `200` + 그동안의 메시지. 보관은 읽기 전용 보존이다 (`spec-v2.md` 7장) | REQ-MSG-011 은 방 상태를 보지 않는다 |
| 미인증 요청으로 세 라우트 호출 | 전부 `401` | AC-MSG-012 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (선행 SPEC 분 + 이 SPEC 추가 12건) | `npm test -w server -- --reporter=verbose` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), `routes-messages.ts` 는 HTTP 와 멘션 라우팅만 안다 (`plan-v2.md` 책임 경계) | 리뷰 |
| Unified | TypeScript strict, NodeNext, 상대 import 에 `.js` 확장자 | `npm run typecheck -w server` |
| Secured | 업로드 파일명 경로 성분 제거(쓰기), 저장 경로 봉인 확인(읽기), 세 라우트 `requireAuth` | AC-MSG-007, AC-MSG-008, AC-MSG-012 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-MSG-001 부터 AC-MSG-015 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server -- --reporter=verbose` 출력에 `✓ test/messages.test.ts > messages > <이름>` 줄이 AC-MSG-001..012 와 AC-MSG-015 가 지정한 **열세 이름 전부**로 나타남
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `git diff --name-only <spec_base_sha> -- server/src` 출력에 `permissions.ts` 가 나타나지 않음 — 이 SPEC 이 권한 릴레이를 만들지 않았다는 증거. 형제 SPEC `SPEC-PERM-001` 이 그 파일을 만들어 `ls` 목록에 보이는 것은 정상이다
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-MSG-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함
- [ ] 그 SHA 로 실행한 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이고 출력이 비어 있음. **빈 출력만으로 통과 처리하지 않는다** — 기준 SHA 가 없을 때도 표준 출력은 비어 있다
- [ ] 같은 SHA 로 실행한 `git diff --name-only <SHA> -- server/src` 가 종료 코드 `0` 이고 출력이 정확히 `server/src/index.ts` 와 `server/src/routes-messages.ts` 두 줄임
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 2개 (`feat: message send API with multipart upload and mention fan-out`, `feat: message listing with cursor and guarded attachment download`)
