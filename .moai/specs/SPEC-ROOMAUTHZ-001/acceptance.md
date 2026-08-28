# SPEC-ROOMAUTHZ-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

## 이 문서가 지키는 검증 원칙

이 SPEC 은 **인가**를 다루므로, 순진하게 쓰면 무의미해지는 자리가 다른 SPEC 보다 많다. 인가 기준은 한 방향만 재면 반드시 뚫린다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 모든 게이트 | "비멤버가 `404` 를 받는다"는 **모든 요청을 `404` 로 막는 구현**도 통과시킨다 | 같은 시나리오 안에서 **멤버는 성공한다**를 함께 단언한다 (대조군) |
| 모든 게이트 (반대 방향) | "멤버가 성공한다"는 **게이트가 아예 없는 구현**도 통과시킨다 | 같은 시나리오 안에서 **비멤버는 거부된다**를 함께 단언한다 (부정 사례) |
| 메시지 조회 | "비멤버가 남의 메시지를 못 본다"는 **빈 배열을 돌려주는 구현**도 통과시킨다 — 그런데 빈 배열은 방의 실재를 그대로 드러낸다 | 상태 코드가 `404` 이고 본문이 **없는 방과 글자 그대로 같은가** |
| 실재 은닉 | "비멤버가 `404` 를 받는다"는 `403` 을 쓰는 구현을 거르지만 **보관 방을 `409` 로 알려 주는 구현**은 통과시킨다 | 비멤버에게 보이는 세 응답(없는 방·활성 방·보관된 방)이 **서로 구별 불가능한가** |
| 판정 수용 | "비멤버의 판정이 전달되지 않았다"는 **모든 판정을 죽인 구현**도 통과시킨다 | 비멤버가 시도한 뒤에도 **멤버의 진짜 판정이 여전히 성립하는가** |
| 백필 멱등 | "두 번 열어도 오류가 안 난다"는 **매번 다시 채워 넣는 구현**도 통과시킨다 | 사이에 지운 행이 **되살아나지 않는가** |
| 생성자 자동 참가 | "방을 만들면 목록에 보인다"는 **목록을 좁히지 않은 구현**도 통과시킨다 | `room_members` 행을 직접 세고, 남이 만든 방이 **내 목록에 없는가** |

같은 이유로 다음 형태는 이 문서에서 금지한다 — "파일이 존재한다", "함수가 export 돼 있다", "테스트 스위트가 통과한다(어떤 테스트인지 이름 없이)", 그리고 구현 본문을 지워도 참인 단언.

**이름 붙은 기존 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내므로, 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고 둘 다 종료 코드 `0` 이다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 된다.

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## 공통 테스트 하네스

아래 시나리오는 `server/test/room-members.test.ts` 의 다음 하네스를 쓴다. 형제 SPEC 하네스와 다른 점이 셋이다.

1. **사용자가 둘이다** — `alice`(방을 만드는 사람, 곧 멤버)와 `mallory`(계정만 있는 바깥 사람). 인가 기준은 사람이 둘이어야 성립한다.
2. **방을 `POST /api/rooms` 로 만든다** — `INSERT INTO rooms` 직접 삽입은 멤버 행을 남기지 않으므로, 그렇게 만든 방은 생성자조차 비멤버다. 형제 하네스가 전부 그 형태이고 그것이 `plan.md` §D 목록의 원인이다.
3. **이벤트 라우트를 사본으로 등록하지 않는다** — `registerEventRoute(app)` 를 부른다. 사본을 두면 게이트가 통째로 빠져도 테스트가 초록이 된다 (REQ-ROOMAUTHZ-010).

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { createPermissionBroker } from '../src/permissions.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerRoomRoutes } from '../src/routes-rooms.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { registerEventRoute } from '../src/routes-events.js'     // REQ-ROOMAUTHZ-010 — index.ts 와 같은 함수
import { sha256Hex } from '../src/routes-bots.js'

let dir: string
let db: Db
const cleanups: (() => Promise<void> | void)[] = []

// light-my-request 는 set-cookie 를 배열이 아니라 문자열 하나로 돌려준다 (형제 SPEC 네 곳과 같은 헬퍼)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'md-authz-')); db = openDb(join(dir, 't.db')) })
afterEach(async () => {
  for (const c of cleanups.splice(0).reverse()) await c()
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

async function signUp(app: any, username: string) {
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username, password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: 'pw123456' } })
  const id = (db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number }).id
  return { id, cookie: setCookieOf(login).split(';')[0] }
}

async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  await app.register(multipart)
  app.decorate('uploadsDir', join(dir, 'up'))
  const hub = createSseHub()
  app.decorate('hub', hub)
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  app.decorate('gateway', gateway)
  registerAuthRoutes(app, db)
  registerRoomRoutes(app)
  registerEventRoute(app)                      // 사본이 아니라 프로덕션과 같은 함수
  registerMessageRoutes(app)
  const broker = createPermissionBroker(app)
  app.decorate('permissions', broker)
  gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))

  const alice = await signUp(app, 'alice')      // 방을 만드는 사람 → 멤버
  const mallory = await signUp(app, 'mallory')  // 계정만 있는 바깥 사람 → 비멤버

  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  cleanups.push(async () => { await app.close() })
  return { app, broker, gateway, hub, port, alice, mallory }
}

// 방은 반드시 라우트로 만든다 — 직접 INSERT 하면 생성자조차 비멤버가 된다
async function createRoom(app: any, ck: string, name = 'A'): Promise<number> {
  const res = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name } })
  expect(res.statusCode).toBe(201)
  return res.json().id
}

function invite(app: any, ck: string, roomId: number, userId: number) {
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/members`, headers: { cookie: ck }, payload: { user_id: userId } })
}

function postMsg(app: any, ck: string, roomId: number, body: string) {
  const form = new FormData()
  form.append('body', body)
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie: ck }, payload: form })
}

function listMsg(app: any, ck: string, roomId: number) {
  return app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages`, headers: { cookie: ck } })
}

function listRooms(app: any, ck: string) {
  return app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie: ck } })
}

function memberCount(roomId: number): number {
  return (db.prepare('SELECT COUNT(*) c FROM room_members WHERE room_id = ?').get(roomId) as { c: number }).c
}

// (봇, 게이트웨이 토큰) 한 벌. 방은 라우트로 만든 뒤 이 함수에 번호를 넘긴다.
function seedBot(roomId: number, botName = 'pm') {
  const botId = db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(botName).lastInsertRowid as number
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(token))
  return { botId, token }
}

function wsConnect(port: number, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    cleanups.push(() => { ws.close() })
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', d => { if (JSON.parse(String(d)).type === 'welcome') resolve(ws) })
    ws.on('error', reject)
  })
}

// 프레임 하나를 기다린다. 오지 않으면 null — 부정 관측 도구다.
function nextMessage(ws: WebSocket, ms = 1500): Promise<any | null> {
  return new Promise(resolve => {
    const t = setTimeout(() => { ws.off('message', on); resolve(null) }, ms)
    const on = (d: WebSocket.RawData) => { clearTimeout(t); ws.off('message', on); resolve(JSON.parse(String(d))) }
    ws.on('message', on)
  })
}

// SSE 스트림을 연다. 게이트에 걸리면 res.status 가 404 이고 body 는 JSON 이다.
async function openStream(port: number, ck: string, roomId: number) {
  const ac = new AbortController()
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/events`,
    { headers: { cookie: ck }, signal: ac.signal })
  cleanups.push(() => { ac.abort() })
  return res
}

async function readFrame(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) throw new Error('스트림이 프레임 없이 닫혔다')
    buf += Buffer.from(value).toString()
    if (buf.endsWith('\n\n')) return buf
  }
}
```

`nextMessage` 의 `null` 과 `memberCount` 가 이 문서의 **부정 관측 도구**다. 부정 단언은 반드시 같은 시나리오 안의 양성 단언과 짝을 이룬다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-ROOMAUTHZ-001 | REQ-001, 002 | 아래 본문 | `room_members`·`schema_migrations` 가 있고 `rooms` 에 `created_by` 가 있음. 같은 (방,사람) 두 번 삽입이 예외 |
| AC-ROOMAUTHZ-002 | REQ-003 (컬럼 추가) | 아래 본문 | **옛 모양 DB** 를 `openDb` 로 다시 열면 `created_by` 가 생기고 기존 행이 보존됨 |
| AC-ROOMAUTHZ-003 | REQ-003 (백필 1회성) | 아래 본문 | 첫 개방에 전원 백필 + 표식 기록. 행을 지우고 다시 열면 **되살아나지 않음** |
| AC-ROOMAUTHZ-004 | REQ-004 | 아래 본문 | 생성 응답이 다섯 키 그대로 + `created_by` 가 생성자 + 멤버 행 수 `1` |
| AC-ROOMAUTHZ-005 | REQ-005 | 아래 본문 | 멤버 초대는 `201`, 재초대는 `200 already:true`, 없는 사용자는 `400` |
| AC-ROOMAUTHZ-006 | REQ-005, 013 | 아래 본문 | 비멤버의 초대 시도는 `404` + 멤버 행 수 불변, 그 뒤 멤버의 초대는 성립 |
| AC-ROOMAUTHZ-007 | REQ-006 | 아래 본문 | `POST /api/rooms/:id/join` 이 존재하지 않고, 거부된 요청이 멤버 행을 남기지 않음 |
| AC-ROOMAUTHZ-008 | REQ-008 | 아래 본문 | 비멤버 POST 는 `404` + 어느 표에도 행 없음, 멤버 POST 는 `200` + 행 생김 |
| AC-ROOMAUTHZ-009 | REQ-009 | 아래 본문 | 비멤버 GET 은 `404`(빈 배열 아님), 멤버 GET 은 그 메시지를 돌려줌 |
| AC-ROOMAUTHZ-010 | REQ-010 | 아래 본문 | 비멤버 스트림 요청은 `404` + 구독자 0, 멤버는 스트림이 열리고 이벤트 도착 |
| AC-ROOMAUTHZ-011 | REQ-011 | 아래 본문 | 남이 만든 방은 내 목록에 없고, 초대받으면 나타남. 봉투는 `{active,archived}` 그대로 |
| AC-ROOMAUTHZ-012 | REQ-012, 014 | 아래 본문 | 비멤버의 `yes` 는 봇 수신 `null` + 대기 항목 생존, 이어진 멤버의 `yes` 는 전달됨 |
| AC-ROOMAUTHZ-013 | REQ-013 | 아래 본문 | 비멤버에게 없는 방·활성 방·보관된 방 세 응답이 **완전히 동일** |
| AC-ROOMAUTHZ-014 | REQ-015 | 아래 본문 | 봇 게이트웨이 경로가 그대로 동작 (`room_members` 에 봇 행 없음) |
| AC-ROOMAUTHZ-015 | REQ-016 | 아래 본문 | 기준 SHA 확인 종료 코드 `0`, `web/`·`channel/` diff 빈 출력 |
| AC-ROOMAUTHZ-016 | 형제 하네스 교정 | 아래 본문 | `npm test -w server` 전건 통과 + 실제 실패 목록이 `plan.md` §D.4 와 대조됨 |

---

## Given-When-Then 시나리오

### AC-ROOMAUTHZ-001 — 스키마가 중복 멤버십을 표 차원에서 막는다

**Given** 새 데이터베이스를 연다.
**When** 다음을 `server/test/room-members.test.ts` 에 추가하고 `npm test -w server` 를 실행한다.

```ts
it('schema carries room_members with a composite key and rooms.created_by', async () => {
  const cols = db.prepare('PRAGMA table_info(rooms)').all() as { name: string }[]
  expect(cols.map(c => c.name)).toContain('created_by')

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
  expect(tables.map(t => t.name)).toEqual(expect.arrayContaining(['room_members', 'schema_migrations']))

  const u = db.prepare("INSERT INTO users (username, password_hash) VALUES ('u','x')").run().lastInsertRowid
  const r = db.prepare("INSERT INTO rooms (name) VALUES ('R')").run().lastInsertRowid
  db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(r, u)
  // 같은 짝을 두 번 넣으면 표가 거부한다 — 응용 코드의 조회-후-삽입에 기대지 않는다
  expect(() => db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(r, u)).toThrow()
  expect(memberCount(r as number)).toBe(1)
})
```

**Then** 테스트가 통과한다. 마지막 두 줄이 이 기준의 본체다 — `PRIMARY KEY` 를 빼고 인덱스만 둔 구현은 예외를 내지 않아 여기서 걸린다.

### AC-ROOMAUTHZ-002 — 이미 돌고 있던 DB 에도 컬럼이 생긴다

**Given** 이 SPEC 이전 모양의 데이터베이스가 있다 (`rooms` 에 `created_by` 가 없고 방 행이 들어 있다).
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('adds created_by to an already-existing rooms table without losing rows', async () => {
  const p = join(dir, 'legacy.db')
  // 옛 모양을 손으로 만든다 — SCHEMA 상수를 쓰지 않는다
  const legacy = new (await import('better-sqlite3')).default(p)
  legacy.exec(`CREATE TABLE rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT (datetime('now')), archived_at TEXT);
    CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));`)
  legacy.prepare("INSERT INTO rooms (name) VALUES ('옛 방')").run()
  legacy.prepare("INSERT INTO users (username, password_hash) VALUES ('old','x')").run()
  legacy.close()

  const up = openDb(p)
  const cols = (up.prepare('PRAGMA table_info(rooms)').all() as { name: string }[]).map(c => c.name)
  expect(cols).toContain('created_by')
  // 기존 행이 살아 있고 새 컬럼은 NULL 이다 — 지어낸 값을 넣지 않는다
  const row = up.prepare('SELECT name, created_by FROM rooms').get() as { name: string; created_by: number | null }
  expect(row.name).toBe('옛 방')
  expect(row.created_by).toBeNull()
  up.close()
})
```

**Then** 테스트가 통과한다. `SCHEMA` 상수만 고친 구현은 `CREATE TABLE IF NOT EXISTS` 가 기존 표를 건드리지 않으므로 `created_by` 를 찾지 못해 **첫 단언에서 실패**한다. 이것이 이 기준의 존재 이유다.

### AC-ROOMAUTHZ-003 — 백필은 한 번만 돌고, 두 번째부터는 아무것도 하지 않는다

**Given** 방 둘과 사용자 둘이 이미 들어 있는 옛 모양 데이터베이스가 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('backfills every room x user exactly once and never resurrects removed rows', async () => {
  const p = join(dir, 'bf.db')
  const seed = openDb(p)                                    // 먼저 정상 스키마로 열어 둔다
  seed.prepare('DELETE FROM schema_migrations').run()        // 백필이 아직 안 돈 상태로 되돌린다
  seed.prepare('DELETE FROM room_members').run()
  seed.prepare("INSERT INTO rooms (name) VALUES ('A'), ('B')").run()
  seed.prepare("INSERT INTO users (username, password_hash) VALUES ('a','x'), ('b','x')").run()
  seed.close()

  const first = openDb(p)                                    // 1차 개방 — 백필이 돈다
  const all = (first.prepare('SELECT COUNT(*) c FROM room_members').get() as { c: number }).c
  expect(all).toBe(4)                                        // 방 2 × 사람 2
  expect((first.prepare("SELECT COUNT(*) c FROM schema_migrations WHERE name='roomauthz-001-backfill'")
    .get() as { c: number }).c).toBe(1)
  // 한 사람이 한 방을 떠났다고 가정한다
  first.prepare('DELETE FROM room_members WHERE room_id = 1 AND user_id = 2').run()
  first.close()

  const second = openDb(p)                                   // 2차 개방 — 아무것도 하지 않아야 한다
  expect((second.prepare('SELECT COUNT(*) c FROM room_members').get() as { c: number }).c).toBe(3)
  second.close()
})
```

**Then** 테스트가 통과한다. 마지막 단언이 본체다 — 백필을 표식 없이 `INSERT OR IGNORE` 로만 구현하면 2차 개방에서 지운 행이 되살아나 `4` 가 나오고 **실패**한다. "두 번 열어도 오류가 안 난다"만 재는 기준은 그 구현을 통과시킨다.

### AC-ROOMAUTHZ-004 — 방을 만든 사람은 그 자리에서 멤버가 된다

**Given** `alice` 가 로그인해 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('records the creator and joins them in the same transaction', async () => {
  const { app, alice } = await build()
  const res = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'A' } })
  expect(res.statusCode).toBe(201)
  // 응답 봉투는 SPEC-ROOM-001 REQ-ROOM-003 그대로 다섯 키다 — created_by 를 더하지 않는다
  expect(Object.keys(res.json()).sort()).toEqual(['archived_at', 'created_at', 'id', 'name', 'status'])

  const roomId = res.json().id
  const row = db.prepare('SELECT created_by FROM rooms WHERE id = ?').get(roomId) as { created_by: number }
  expect(row.created_by).toBe(alice.id)
  expect(memberCount(roomId)).toBe(1)
  expect((db.prepare('SELECT user_id FROM room_members WHERE room_id = ?').get(roomId) as { user_id: number }).user_id)
    .toBe(alice.id)
})
```

**Then** 테스트가 통과한다. `created_by` 만 기록하고 멤버 행을 넣지 않은 구현은 `memberCount` 에서 `0` 이 나와 실패한다 — 그 상태의 방은 아무도 들어갈 수 없는 방이다.

### AC-ROOMAUTHZ-005 — 초대는 성공하고, 두 번 눌러도 오류가 아니다

**Given** `alice` 가 방을 만들었고 `mallory` 는 아직 그 방 밖에 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('invites a user, is idempotent on repeat, and rejects an unknown user', async () => {
  const { app, alice, mallory } = await build()
  const roomId = await createRoom(app, alice.cookie)

  const first = await invite(app, alice.cookie, roomId, mallory.id)
  expect(first.statusCode).toBe(201)
  expect(memberCount(roomId)).toBe(2)

  const again = await invite(app, alice.cookie, roomId, mallory.id)
  expect(again.statusCode).toBe(200)
  expect(again.json().already).toBe(true)
  expect(memberCount(roomId)).toBe(2)          // 두 번째가 행을 늘리지 않는다

  const nobody = await invite(app, alice.cookie, roomId, 9999)
  expect(nobody.statusCode).toBe(400)
  expect(memberCount(roomId)).toBe(2)
})
```

**Then** 테스트가 통과한다. 재초대를 `409` 로 돌려주는 구현은 두 번째 단언에서 걸린다 — 사람이 버튼을 두 번 눌렀을 뿐인데 UI 가 없는 문제를 보고하게 된다.

### AC-ROOMAUTHZ-006 — 바깥 사람은 초대할 수 없고, 그 사실조차 알 수 없다

**Given** `alice` 의 방이 있고 `mallory` 는 비멤버다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('refuses an invitation from a non-member while a member can still invite', async () => {
  const { app, alice, mallory } = await build()
  const roomId = await createRoom(app, alice.cookie)
  const outsider = await signUp(app, 'trudy')

  // 부정 사례 — mallory 가 자기 친구를 남의 방에 넣으려 한다
  const refused = await invite(app, mallory.cookie, roomId, outsider.id)
  expect(refused.statusCode).toBe(404)
  expect(refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })
  expect(memberCount(roomId)).toBe(1)

  // 대조군 — 멤버의 같은 요청은 성립한다. 모두를 거부하는 구현은 여기서 걸린다
  const allowed = await invite(app, alice.cookie, roomId, outsider.id)
  expect(allowed.statusCode).toBe(201)
  expect(memberCount(roomId)).toBe(2)
})
```

**Then** 테스트가 통과한다. 대조군이 없으면 `POST /api/rooms/:id/members` 를 통째로 `404` 로 만든 구현도 통과한다.

### AC-ROOMAUTHZ-007 — 스스로 들어오는 문은 없다

**Given** `mallory` 가 `alice` 의 방 번호를 알고 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('offers no self-service join path and leaves no membership behind a refusal', async () => {
  const { app, alice, mallory } = await build()
  const roomId = await createRoom(app, alice.cookie)

  // 자율 참가 라우트가 존재하지 않는다 (D1 기각안)
  const join = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/join`, headers: { cookie: mallory.cookie } })
  expect(join.statusCode).toBe(404)

  // 거부되는 요청들이 부작용으로 멤버를 만들지 않는다
  await postMsg(app, mallory.cookie, roomId, '들어가게 해줘')
  await listMsg(app, mallory.cookie, roomId)
  await invite(app, mallory.cookie, roomId, mallory.id)      // 자기 자신을 넣으려는 시도
  expect(memberCount(roomId)).toBe(1)

  // 대조군 — 정규 경로는 여전히 동작한다
  expect((await invite(app, alice.cookie, roomId, mallory.id)).statusCode).toBe(201)
  expect(memberCount(roomId)).toBe(2)
})
```

**Then** 테스트가 통과한다. 세 번째 블록이 본체다 — "요청자가 아직 멤버가 아니면 넣어 준다"는 부작용을 어딘가에 심은 구현은 `memberCount` 가 `2` 가 되어 실패한다.

### AC-ROOMAUTHZ-008 — 바깥 사람은 글을 쓸 수 없고, 멤버는 쓸 수 있다

**Given** `alice` 의 방이 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('refuses a non-member send with no trace while a member send succeeds', async () => {
  const { app, alice, mallory } = await build()
  const roomId = await createRoom(app, alice.cookie)

  const refused = await postMsg(app, mallory.cookie, roomId, '몰래 보내기')
  expect(refused.statusCode).toBe(404)
  expect(refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })
  // 어느 표에도 흔적이 없다
  expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
  expect((db.prepare('SELECT COUNT(*) c FROM attachments').get() as { c: number }).c).toBe(0)

  // 대조군 — 멤버의 같은 요청은 저장된다
  const ok = await postMsg(app, alice.cookie, roomId, '정상 전송')
  expect(ok.statusCode).toBe(200)
  expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(1)
})
```

**Then** 테스트가 통과한다. `404` 를 돌려주면서 본문은 저장하는 구현(게이트를 저장 뒤에 둔 경우)은 세 번째 단언에서 걸린다.

### AC-ROOMAUTHZ-009 — 바깥 사람은 읽을 수 없고, 빈 배열로도 알 수 없다

**Given** `alice` 의 방에 메시지 하나가 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('answers a non-member read with 404, not an empty list, while a member reads it', async () => {
  const { app, alice, mallory } = await build()
  const roomId = await createRoom(app, alice.cookie)
  await postMsg(app, alice.cookie, roomId, '비밀 이야기')

  const refused = await listMsg(app, mallory.cookie, roomId)
  expect(refused.statusCode).toBe(404)
  expect(refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })
  expect(refused.json().messages).toBeUndefined()      // 빈 배열도 아니다

  // 대조군 — 멤버는 그 메시지를 본다
  const seen = await listMsg(app, alice.cookie, roomId)
  expect(seen.statusCode).toBe(200)
  expect(seen.json().messages.map((m: any) => m.body)).toEqual(['비밀 이야기'])
})
```

**Then** 테스트가 통과한다. 세 번째 단언이 본체다 — `{ messages: [] }` 를 돌려주는 구현은 내용은 감추지만 **방이 있다는 사실은 그대로 알려 준다**. 그 상태로는 `spec.md` §1.2 의 2단계가 닫히지 않는다.

### AC-ROOMAUTHZ-010 — 바깥 사람의 스트림은 열리지 않는다

**Given** `alice` 의 방이 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('refuses a non-member event stream before hijack and opens it for a member', async () => {
  const { app, hub, port, alice, mallory } = await build()
  const roomId = await createRoom(app, alice.cookie)

  const refused = await openStream(port, mallory.cookie, roomId)
  expect(refused.status).toBe(404)                        // hijack 뒤였다면 상태 코드가 오지 않는다
  expect(await refused.json()).toEqual({ error: '방을 찾을 수 없습니다' })

  // 구독자가 생기지 않았다 — 발행해도 아무 데도 가지 않는다
  hub.publish(roomId, 'message', { id: 1 })

  // 대조군 — 멤버의 스트림은 열리고 이벤트가 도착한다
  const opened = await openStream(port, alice.cookie, roomId)
  expect(opened.status).toBe(200)
  const reader = opened.body!.getReader()
  expect(await readFrame(reader)).toContain('connected')
  hub.publish(roomId, 'message', { id: 42 })
  expect(await readFrame(reader)).toBe('event: message\ndata: {"id":42}\n\n')
})
```

**Then** 테스트가 통과한다. `reply.hijack()` 을 먼저 부르고 그 뒤에 멤버십을 보는 구현은 `refused.status` 가 `200` 이 되어 첫 단언에서 걸린다.

이 기준은 하네스가 `registerEventRoute` 를 쓰기 때문에만 의미를 갖는다. 하네스가 라우트 사본을 등록하면 게이트를 통째로 지워도 이 기준이 통과한다 — `plan.md` §D.3.1 참조.

### AC-ROOMAUTHZ-011 — 방 목록은 내가 속한 방만 담는다

**Given** `alice` 와 `mallory` 가 각각 방을 하나씩 만들었다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('narrows the room listing to the caller rooms and widens it on invitation', async () => {
  const { app, alice, mallory } = await build()
  const aRoom = await createRoom(app, alice.cookie, 'A의 방')
  const mRoom = await createRoom(app, mallory.cookie, 'M의 방')

  const aList = (await listRooms(app, alice.cookie)).json()
  // 봉투는 SPEC-ROOM-001 그대로 두 배열이다
  expect(Object.keys(aList).sort()).toEqual(['active', 'archived'])
  expect(aList.active.map((r: any) => r.id)).toEqual([aRoom])       // 남의 방은 없다

  const mList = (await listRooms(app, mallory.cookie)).json()
  expect(mList.active.map((r: any) => r.id)).toEqual([mRoom])

  // 대조군 — 초대받으면 나타난다. 목록을 통째로 비운 구현은 여기서 걸린다
  await invite(app, alice.cookie, aRoom, mallory.id)
  const after = (await listRooms(app, mallory.cookie)).json()
  expect(after.active.map((r: any) => r.id).sort()).toEqual([aRoom, mRoom].sort())
})
```

**Then** 테스트가 통과한다. 좁히지 않은 구현은 `aList.active` 가 두 개가 되어 걸리고, 무조건 빈 목록을 내는 구현은 마지막 단언에서 걸린다.

### AC-ROOMAUTHZ-012 — 바깥 사람은 승인을 대신 누를 수 없다

이것이 `.moai/reports/t4/sync-audit.md` §F-14 를 직접 재는 기준이다.

**Given** `alice` 의 방에 봇이 접속해 있고 승인 요청 하나가 대기 중이다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('never lets a non-member approve, and leaves the request for a member to answer', async () => {
  const { app, broker, port, alice, mallory } = await build()
  const roomId = await createRoom(app, alice.cookie)
  const { botId, token } = seedBot(roomId)
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

  // 부정 사례 — mallory 는 방 밖에서 승인 코드를 알고 있다고 가정한다
  const seen = nextMessage(ws)
  const refused = await postMsg(app, mallory.cookie, roomId, 'yes abcde')
  expect(refused.statusCode).toBe(404)
  expect(await seen).toBeNull()                       // 봇에게 아무것도 가지 않았다

  // 대조군 — 대기 항목은 살아 있고 멤버가 여전히 판정할 수 있다.
  // 모든 판정을 죽인 구현은 여기서 걸린다
  const real = nextMessage(ws)
  await postMsg(app, alice.cookie, roomId, 'yes abcde')
  expect(await real).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
})
```

**Then** 테스트가 통과한다.

**브로커 자신도 막는지 따로 잰다** — 라우트 게이트가 있으면 위 시나리오만으로는 브로커의 검사가 있는지 없는지 구별되지 않는다. 그래서 브로커를 직접 부르는 단언을 같은 파일에 둔다.

```ts
it('the broker itself refuses a non-member verdict, independent of the route gate', async () => {
  const { broker, port, alice, mallory, app } = await build()
  const roomId = await createRoom(app, alice.cookie)
  const { botId, token } = seedBot(roomId)
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

  expect(broker.tryHandleUserReply(roomId, mallory.id, 'yes abcde')).toBe(false)   // 비멤버
  expect(broker.tryHandleUserReply(roomId, alice.id, 'yes abcde')).toBe(true)      // 멤버 — 대기 항목이 살아 있었다
  expect(await nextMessage(ws)).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
})
```

두 번째 단언이 대조군이며 동시에 **비멤버 시도가 대기 항목을 소모하지 않았다**는 증거다. 소모하는 구현에서는 `true` 가 나오지 않는다.

### AC-ROOMAUTHZ-013 — 바깥 사람에게 세 응답이 구별되지 않는다

**Given** 없는 방 번호, `alice` 의 활성 방, `alice` 의 보관된 방 셋이 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('gives a non-member byte-identical answers for missing, active and archived rooms', async () => {
  const { app, alice, mallory } = await build()
  const active = await createRoom(app, alice.cookie, '살아 있는 방')
  const archived = await createRoom(app, alice.cookie, '보관될 방')
  await app.inject({ method: 'POST', url: `/api/rooms/${archived}/archive`, headers: { cookie: alice.cookie } })

  const answers = [
    await listMsg(app, mallory.cookie, 999999),      // 없는 방
    await listMsg(app, mallory.cookie, active),      // 있지만 남의 방
    await listMsg(app, mallory.cookie, archived),    // 있고 보관된 남의 방
  ]
  const shapes = answers.map(r => `${r.statusCode}|${r.body}`)
  expect(new Set(shapes).size).toBe(1)               // 셋이 글자 그대로 같다
  expect(answers[0].statusCode).toBe(404)

  // 대조군 — 멤버에게는 보관 상태가 그대로 보인다 (409 는 죽지 않았다)
  const memberSend = await postMsg(app, alice.cookie, archived, '늦은 메시지')
  expect(memberSend.statusCode).toBe(409)
})
```

**Then** 테스트가 통과한다. 멤버십을 방 상태 검사 **뒤에** 둔 구현은 세 번째 응답이 `409` 가 되어 `Set` 크기가 `2` 이상이 되고 실패한다. 대조군은 "보관 검사를 통째로 지워서 통과"하는 구현을 배제한다.

### AC-ROOMAUTHZ-014 — 봇의 길은 바뀌지 않았다

**Given** `alice` 의 방에 봇이 초대돼 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('leaves the bot gateway path untouched by room membership', async () => {
  const { app, gateway, port, alice } = await build()
  const roomId = await createRoom(app, alice.cookie)
  const { botId, token } = seedBot(roomId)
  const ws = await wsConnect(port, token)                      // 토큰만으로 접속된다

  // 봇은 사람이 아니므로 멤버 표에 들어가지 않는다 — 그래도 전달은 된다
  expect(memberCount(roomId)).toBe(1)                          // alice 하나뿐
  expect(gateway.sendToBot(roomId, botId, { type: 'ping' })).toBe(true)
  expect(await nextMessage(ws)).toEqual({ type: 'ping' })
})
```

**Then** 테스트가 통과한다. 게이트웨이에 `room_members` 검사를 잘못 얹은 구현은 `sendToBot` 이 `false` 가 되거나 접속 자체가 끊겨 실패한다.

### AC-ROOMAUTHZ-015 — 범위 경계

**Given** 이 SPEC 의 구현이 끝났다.
**When** 다음을 차례로 실행한다.

```bash
git rev-parse --verify "$(cat .moai/specs/SPEC-ROOMAUTHZ-001/.spec-base-sha)^{commit}"
git diff --name-only "$(cat .moai/specs/SPEC-ROOMAUTHZ-001/.spec-base-sha)" -- web/ channel/
git diff --name-only "$(cat .moai/specs/SPEC-ROOMAUTHZ-001/.spec-base-sha)" -- server/
```

**Then** 첫 명령이 **종료 코드 `0`** 으로 SHA 를 출력하고, 두 번째가 **빈 출력**이며, 세 번째가 이 SPEC 이 손댄 `server/` 파일만 나열한다.

**기준 SHA 확인이 먼저다.** 파일이 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비우므로, 빈 출력만 보고 통과로 적으면 **아무것도 검사하지 않은 것**을 통과로 적게 된다. 종료 코드를 먼저 본다.

### AC-ROOMAUTHZ-016 — 형제 하네스가 교정되었고, 그 목록이 대조되었다

**Given** M3 까지의 구현이 끝났다.
**When** 다음을 실행한다.

```bash
npm test -w server -- --reporter=verbose
```

**Then** 둘 다 참이어야 한다.

1. **전건 통과.** 종료 코드가 `0` 이고 실패한 테스트가 없다.
2. **M4 단계 1 의 대조 기록이 `progress.md` §E.2 에 있다.** M3 직후(하네스 교정 전) 같은 명령을 돌려 받은 실패 목록이 원문으로 적혀 있고, `plan.md` §D.4 의 34개와 대조한 결과 — 일치하는 항목, 목록에 없는데 실패한 항목, 목록에 있는데 실패하지 않은 항목 — 이 셋으로 나뉘어 적혀 있다.

두 번째가 이 기준의 본체다. 초록만 확인하면 **테스트를 지워서 초록으로 만든 구현**과 구별되지 않는다. 대조 기록이 없으면 이 기준은 통과가 아니라 **실패**다.

`plan.md` §D.4 와 어긋난 항목이 하나라도 있으면 그것은 문서가 놓친 결합이며, 고치기 전에 원인을 §E.2 에 적는다.

---

## 완료 정의 (Definition of Done)

- AC-ROOMAUTHZ-001..016 전부 통과.
- `npm run typecheck -w server` 종료 코드 `0`.
- `spec.md` §6 표의 형제 문서 전부에 개정 주석이 달렸고, 원문이 지워지지 않았다.
- 전제가 무효화된 두 기준(AC-MSG-012·AC-PERM-009)의 변경 사실이 각 SPEC 문서에 이름과 함께 남았다.
- `spec.md` §9 의 잔여 위험 중 **닫지 않은 것**(첨부 라우트, 봇 초대·방 보관 라우트)이 후속 카드 요청으로 리드에 보고되었거나, 보고하지 못했다면 그 사실이 `progress.md` §E.2 에 남았다.
