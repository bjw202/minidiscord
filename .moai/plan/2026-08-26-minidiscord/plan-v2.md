# minidiscord 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 내 PC에서 도는 자체 호스팅 채팅 서버(minidiscord)와, Claude Code 세션을 봇으로 참여시키는 커스텀 채널 플러그인을 만든다.

**Architecture:** 단일 Node 프로세스 서버(Fastify + SQLite + SSE + WebSocket 봇 게이트웨이)가 웹 UI를 서빙한다. 클로드코드 세션마다 spawn되는 채널 플러그인(MCP 서버, stdio)이 공식 Channels 계약을 구현해 게이트웨이에 WebSocket으로 접속한다. 세션은 정확히 한 방에만 속하고(세션→방 N:1), 사용자 메시지는 `@TO`/`@CC` 멘션으로 지정 봇에게만 전달된다.

**Tech Stack:** TypeScript, Node.js(20+), npm workspaces, Fastify, better-sqlite3, ws, @modelcontextprotocol/sdk, vitest, 바닐라 JS 웹 UI(프레임워크 없음).

**Spec:** `designs/2026-08-26-minidiscord/spec.md` — 이 계획서는 spec에서 논증된다. 실행자는 spec과 이 문서를 함께 읽는다. 사전 조사 자료는 설계 레포의 `user-context/docs/`에 있다.

> **중요 — 구현 위치:** 이 설계 레포(design-superpowers)에서는 구현하지 않는다. 새로 만든 별도 레포(권장 이름: `minidiscord`)에서 Task 1부터 진행한다.

## Global Constraints

- Node.js 20 이상, TypeScript strict 모드.
- 의존성은 설치 시점의 최신 안정 버전으로 설치한다(버전은 하한선): fastify ^5, @fastify/cookie ^11, @fastify/multipart ^9, @fastify/static ^8, better-sqlite3 ^11, ws ^8, @modelcontextprotocol/sdk ^1, zod ^3, vitest ^2, typescript ^5, tsx ^4.
- 서버 데이터(DB·업로드 파일)는 모두 `MINIDISCORD_DATA_DIR`(기본 `./data`) 아래에 둔다. 절대 코드 디렉터리에 데이터를 쓰지 않는다.
- 채널 플러그인은 **무상태**: 디스크에 아무 파일도 쓰지 않고, 설정(토큰·서버 주소)은 환경변수 `MINIDISCORD_TOKEN`, `MINIDISCORD_SERVER`(기본 `ws://127.0.0.1:3000/bot`)로만 받는다.
- 커밋은 자주: 모든 태스크 마지막 스텝이 커밋이다. 커밋 메시지는 영어 관례(`feat:`, `test:`, `chore:` 등).
- 테스트 프레임워크는 vitest. 각 스텝의 "실행" 명령은 워크스페이스 루트에서 `npm test -w server` / `npm test -w channel` 형태다.
- UI 문구는 한국어.
- 채널 계약(capabilities·notification 메서드·reply 도구·권한 릴레이)은 spec 4-B와 공식 문서(channels-reference)를 그대로 따른다. 계약 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다.

## 파일 구조

```
minidiscord/                        # 구현 레포 (신규 생성)
├── package.json                    # npm workspaces root
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # 조립+시작 (모든 라우트/게이트웨이 연결)
│   │   ├── config.ts               # 포트·데이터 경로
│   │   ├── db.ts                   # SQLite 연결+스키마
│   │   ├── auth.ts                 # 가입/로그인/세션 쿠키/requireAuth
│   │   ├── routes-rooms.ts         # 방 생성/목록/보관
│   │   ├── routes-bots.ts          # 봇 등록/목록 + 방 초대(토큰 발급)
│   │   ├── routes-messages.ts      # 메시지 전송(multipart)/목록/다운로드
│   │   ├── mention.ts              # @TO/@CC 파서 (순수 함수)
│   │   ├── sse.ts                  # SSE 허브 (방별 구독/발행)
│   │   ├── gateway.ts              # 봇 게이트웨이 (WebSocket 서버)
│   │   └── permissions.ts          # 권한 릴레이 브로커
│   └── test/
│       ├── db.test.ts
│       ├── auth.test.ts
│       ├── rooms-bots.test.ts
│       ├── mention.test.ts
│       ├── sse.test.ts
│       ├── gateway.test.ts
│       ├── messages.test.ts
│       └── permissions.test.ts
├── channel/
│   ├── package.json                # bin: minidiscord-channel
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                # 진입점: MCP 서버 + 게이트웨이 클라이언트 연결
│   │   ├── channel-server.ts       # MCP 채널 계약 구현 (capabilities/reply/fetch_history)
│   │   └── gateway-client.ts       # WebSocket 클라이언트 (재접속 백오프)
│   └── test/
│       ├── channel-server.test.ts
│       └── gateway-client.test.ts
├── web/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── scripts/
│   └── e2e.mjs                     # 전체 시나리오 자동 검증
└── README.md
```

책임 경계: `gateway.ts`는 WebSocket 연결과 봇 토큰 인증만, `routes-messages.ts`는 HTTP와 멘션 라우팅만, `permissions.ts`는 승인 요청 상태만 알게 분리한다. `mention.ts`는 순수 함수로 분리해 파서만 단독 테스트한다.

---

### Task 1: 저장소 스캐폴드와 서버 헬스

**Files:**
- Create: `package.json`, `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`, `server/src/config.ts`, `server/test/health.test.ts`, `.gitignore`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces: `buildServer(): FastifyInstance`(server/src/index.ts) — 이후 모든 태스크가 라우트를 이 객체에 등록한다. `config`(server/src/config.ts) — `{ port, dataDir, dbPath, uploadsDir }`.

- [ ] **Step 1: 워크스페이스 초기화**

새 레포 `minidiscord`를 만들고 루트 `package.json`:

```json
{
  "name": "minidiscord",
  "private": true,
  "workspaces": ["server", "channel"]
}
```

`server/package.json`:

```json
{
  "name": "@minidiscord/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

`server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

`.gitignore`:

```
node_modules/
data/
dist/
```

설치:

```bash
npm install -w server fastify @fastify/cookie @fastify/multipart @fastify/static better-sqlite3 ws
npm install -w server -D typescript tsx vitest @types/node @types/better-sqlite3 @types/ws
```

- [ ] **Step 2: 실패하는 헬스 테스트 작성**

`server/test/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildServer } from '../src/index.js'

describe('health', () => {
  it('GET /api/health returns ok', async () => {
    const app = await buildServer()
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    await app.close()
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — `Cannot find module '../src/index.js'`

- [ ] **Step 4: 최소 구현**

`server/src/config.ts`:

```ts
// 서버 설정: 포트와 데이터 경로
export const config = {
  port: Number(process.env.MINIDISCORD_PORT ?? 3000),
  dataDir: process.env.MINIDISCORD_DATA_DIR ?? './data',
  get dbPath() { return `${this.dataDir}/minidiscord.db` },
  get uploadsDir() { return `${this.dataDir}/uploads` },
}
```

`server/src/index.ts`:

```ts
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS (1 test)

- [ ] **Step 6: 커밋**

```bash
git init && git add -A && git commit -m "chore: scaffold workspace with server health endpoint"
```

---

### Task 2: DB 스키마

**Files:**
- Create: `server/src/db.ts`, `server/test/db.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `openDb(path: string): Db` (`Db`는 `better-sqlite3`의 `Database.Database`). 테이블: `users, sessions, rooms, bots, bot_tokens, messages, message_targets, attachments` (스키마는 아래 SQL 그대로).

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/db.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from '../src/db.js'

function testDb() {
  return openDb(join(mkdtempSync(join(tmpdir(), 'md-')), 'test.db'))
}

describe('openDb', () => {
  it('creates all tables', () => {
    const db = testDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    const names = tables.map(t => t.name)
    for (const t of ['users', 'sessions', 'rooms', 'bots', 'bot_tokens', 'messages', 'message_targets', 'attachments']) {
      expect(names).toContain(t)
    }
  })

  it('is idempotent (reopen same file)', () => {
    const db = testDb()
    db.prepare("INSERT INTO rooms (name) VALUES ('r1')").run()
    const path = db.name
    db.close()
    const db2 = openDb(path)
    const rows = db2.prepare('SELECT name FROM rooms').all() as { name: string }[]
    expect(rows).toEqual([{ name: 'r1' }])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — `Cannot find module '../src/db.js'`

- [ ] **Step 3: 구현**

`server/src/db.ts`:

```ts
// SQLite 연결과 스키마 (spec 5장 데이터 모델)
import Database from 'better-sqlite3'

export type Db = Database.Database

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);
CREATE TABLE IF NOT EXISTS bots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS bot_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  token_hash TEXT UNIQUE NOT NULL,
  last_delivered_id INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('user','bot','system')),
  author_user_id INTEGER REFERENCES users(id),
  author_bot_id INTEGER REFERENCES bots(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS message_targets (
  message_id INTEGER NOT NULL REFERENCES messages(id),
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  delivery TEXT NOT NULL CHECK (delivery IN ('to','cc'))
);
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL REFERENCES messages(id),
  filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, id);
CREATE INDEX IF NOT EXISTS idx_targets_bot ON message_targets(bot_id, message_id);
`

export function openDb(path: string): Db {
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)
  return db
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add server/src/db.ts server/test/db.test.ts
git commit -m "feat: sqlite schema for users/rooms/bots/tokens/messages"
```

---

### Task 3: 인증 (회원가입/로그인/세션 쿠키)

**Files:**
- Create: `server/src/auth.ts`, `server/test/auth.test.ts`
- Modify: `server/src/index.ts` (라우트 등록 + DB 열기)

**Interfaces:**
- Consumes: `openDb` (Task 2), `config` (Task 1)
- Produces:
  - `registerAuthRoutes(app: FastifyInstance, db: Db): void`
  - `requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void>` — 이후 모든 보호 라우트의 `preHandler`로 쓴다. 통과하면 `req.user = { id: number, username: string }`이 설정된다.
  - 쿠키 이름 `md_session`.

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/auth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { openDb, type Db } from '../src/db.js'
import { registerAuthRoutes, requireAuth } from '../src/auth.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 'test.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

async function build() {
  const app = Fastify()
  await app.register(cookie)
  registerAuthRoutes(app, db)
  app.get('/api/me', { preHandler: [requireAuth] }, async req => ({ user: req.user }))
  return app
}

describe('auth', () => {
  it('registers a user', async () => {
    const app = await build()
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    expect(res.statusCode).toBe(201)
  })

  it('rejects duplicate username', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    expect(res.statusCode).toBe(409)
  })

  it('login sets session cookie and /api/me works', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    expect(login.statusCode).toBe(200)
    const cookieHeader = login.headers['set-cookie']![0]
    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: cookieHeader.split(';')[0] } })
    expect(me.statusCode).toBe(200)
    expect(me.json().user.username).toBe('alice')
  })

  it('wrong password returns 401', async () => {
    const app = await build()
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'wrong' } })
    expect(res.statusCode).toBe(401)
  })

  it('protected route without cookie returns 401', async () => {
    const app = await build()
    const res = await app.inject({ method: 'GET', url: '/api/me' })
    expect(res.statusCode).toBe(401)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — `Cannot find module '../src/auth.js'`

- [ ] **Step 3: 구현**

`server/src/auth.ts`:

```ts
// 회원가입/로그인/세션 쿠키 (scrypt 해시, sessions 테이블)
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from './db.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: number; username: string }
  }
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pw, salt, 64).toString('hex')}`
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hex] = stored.split(':')
  if (!salt || !hex) return false
  const a = Buffer.from(hex, 'hex')
  const b = scryptSync(pw, salt, 64)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function registerAuthRoutes(app: FastifyInstance, db: Db): void {
  app.post('/api/auth/register', async (req, reply) => {
    const { username, password } = req.body as { username?: string; password?: string }
    if (!username || !password || password.length < 8) {
      return reply.code(400).send({ error: 'username과 8자 이상 password가 필요합니다' })
    }
    try {
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hashPassword(password))
    } catch {
      return reply.code(409).send({ error: '이미 있는 사용자 이름입니다' })
    }
    return reply.code(201).send({ ok: true })
  })

  app.post('/api/auth/login', async (req, reply) => {
    const { username, password } = req.body as { username?: string; password?: string }
    const row = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as
      | { id: number; username: string; password_hash: string }
      | undefined
    if (!row || !verifyPassword(password ?? '', row.password_hash)) {
      return reply.code(401).send({ error: '사용자 이름 또는 비밀번호가 틀렸습니다' })
    }
    const token = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, row.id)
    reply.setCookie('md_session', token, { httpOnly: true, sameSite: 'lax', path: '/' })
    return { ok: true }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies['md_session']
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    reply.clearCookie('md_session', { path: '/' })
    return { ok: true }
  })
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies['md_session']
  if (!token) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  const row = (await Promise.resolve(
    req.server['db' as keyof typeof req.server] as Db | undefined,
  ))?.prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token) as
    | { id: number; username: string }
    | undefined
  if (!row) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  req.user = row
}
```

주의: 위 `requireAuth`는 `app.db` 데코레이터에 의존한다. `server/src/index.ts`의 `buildServer`를 다음과 같이 고쳐 의존성을 주입한다:

```ts
import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import { mkdirSync } from 'node:fs'
import { openDb, type Db } from './db.js'
import { registerAuthRoutes } from './auth.js'
import { config } from './config.js'

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
```

그리고 `requireAuth` 본문을 데코레이터 기반으로 단순화한다(위의 Promise 래퍼 대신):

```ts
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies['md_session']
  if (!token) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  const row = req.server.db
    .prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(token) as { id: number; username: string } | undefined
  if (!row) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  req.user = row
}
```

테스트의 `build()`가 DB를 주입하도록 `registerAuthRoutes`에 넘기듯, 테스트에서는 `app.db = db`로 직접 할당한다. 테스트 `build()`에 한 줄 추가:

```ts
const app = Fastify()
app.db = db   // ← 이 줄 추가
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS (auth 5건 + 기존)

- [ ] **Step 5: 커밋**

```bash
git add server/src server/test
git commit -m "feat: auth with register/login/session cookie"
```

---

### Task 4: 방 API와 봇 등록 API

**Files:**
- Create: `server/src/routes-rooms.ts`, `server/src/routes-bots.ts`, `server/test/rooms-bots.test.ts`
- Modify: `server/src/index.ts` (라우트 등록)

**Interfaces:**
- Consumes: `requireAuth` (Task 3), `app.db`
- Produces:
  - `registerRoomRoutes(app, opts: { onArchive?: (roomId: number) => void }): void` — `onArchive`는 방 보관 직후 호출되는 훅. Task 8에서 게이트웨이 연결 끊기에 사용한다(그 전에는 생략).
  - `registerBotRoutes(app): void`
  - API: `GET /api/rooms` → `{ active: Room[], archived: Room[] }`, `POST /api/rooms {name}` → `Room`, `POST /api/rooms/:id/archive` → `{ok}`. `GET/POST /api/bots`. `Room = { id, name, status, created_at, archived_at? }`, `Bot = { id, name, description }`.

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/rooms-bots.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { openDb, type Db } from '../src/db.js'
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { registerRoomRoutes } from '../src/routes-rooms.js'
import { registerBotRoutes } from '../src/routes-bots.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 'test.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

async function build(opts?: { onArchive?: (roomId: number) => void }) {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  registerAuthRoutes(app, db)
  registerRoomRoutes(app, opts)
  registerBotRoutes(app)
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const cookie0 = login.headers['set-cookie']![0].split(';')[0]
  return { app, cookie: cookie0 }
}

describe('rooms', () => {
  it('creates and lists rooms', async () => {
    const { app, cookie } = await build()
    const create = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: '프로젝트A' } })
    expect(create.statusCode).toBe(201)
    expect(create.json().status).toBe('active')
    const list = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
    expect(list.json().active).toHaveLength(1)
    expect(list.json().archived).toHaveLength(0)
  })

  it('archives a room and moves it to archived list', async () => {
    const { app, cookie } = await build()
    const create = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: '옛 프로젝트' } })
    const id = create.json().id
    let archivedId = -1
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${id}/archive`, headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
    expect(list.json().active).toHaveLength(0)
    expect(list.json().archived[0].id).toBe(id)
    expect(archivedId).toBe(-1) // onArchive는 옵션
  })

  it('calls onArchive hook when provided', async () => {
    const calls: number[] = []
    const { app, cookie } = await build({ onArchive: id => calls.push(id) })
    const create = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'x' } })
    await app.inject({ method: 'POST', url: `/api/rooms/${create.json().id}/archive`, headers: { cookie } })
    expect(calls).toEqual([create.json().id])
  })

  it('requires auth', async () => {
    const { app } = await build()
    const res = await app.inject({ method: 'GET', url: '/api/rooms' })
    expect(res.statusCode).toBe(401)
  })
})

describe('bots', () => {
  it('registers and lists bots', async () => {
    const { app, cookie } = await build()
    const create = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: '코드리뷰어', description: '리뷰 전문' } })
    expect(create.statusCode).toBe(201)
    const list = await app.inject({ method: 'GET', url: '/api/bots', headers: { cookie } })
    expect(list.json()).toEqual([{ id: create.json().id, name: '코드리뷰어', description: '리뷰 전문' }])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`server/src/routes-rooms.ts`:

```ts
// 방 생성/목록/보관 API
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'

export function registerRoomRoutes(app: FastifyInstance, opts: { onArchive?: (roomId: number) => void } = {}): void {
  app.get('/api/rooms', { preHandler: [requireAuth] }, async req => {
    const rows = req.server.db.prepare('SELECT id, name, status, created_at, archived_at FROM rooms ORDER BY id DESC').all()
    return {
      active: rows.filter((r: any) => r.status === 'active'),
      archived: rows.filter((r: any) => r.status === 'archived'),
    }
  })

  app.post('/api/rooms', { preHandler: [requireAuth] }, async (req, reply) => {
    const { name } = req.body as { name?: string }
    if (!name?.trim()) return reply.code(400).send({ error: '방 이름이 필요합니다' })
    const r = req.server.db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name.trim())
    const room = req.server.db.prepare('SELECT id, name, status, created_at FROM rooms WHERE id = ?').get(r.lastInsertRowid)
    return reply.code(201).send(room)
  })

  app.post('/api/rooms/:id/archive', { preHandler: [requireAuth] }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const r = req.server.db.prepare("UPDATE rooms SET status='archived', archived_at=datetime('now') WHERE id=? AND status='active'").run(id)
    if (r.changes === 0) return reply.code(404).send({ error: '활성 방을 찾을 수 없습니다' })
    // 그 방의 모든 봇 토큰 철회 (spec: 보관 시 토큰 일괄 무효화)
    req.server.db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE room_id=? AND revoked_at IS NULL").run(id)
    opts.onArchive?.(id)
    return { ok: true }
  })
}
```

`server/src/routes-bots.ts`:

```ts
// 봇 등록/목록 API (표시용 정보만 — 페르소나는 각 세션 디렉터리가 담당)
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'

export function registerBotRoutes(app: FastifyInstance): void {
  app.get('/api/bots', { preHandler: [requireAuth] }, async req => {
    return req.server.db.prepare('SELECT id, name, description FROM bots ORDER BY name').all()
  })

  app.post('/api/bots', { preHandler: [requireAuth] }, async (req, reply) => {
    const { name, description } = req.body as { name?: string; description?: string }
    if (!name?.trim()) return reply.code(400).send({ error: '봇 이름이 필요합니다' })
    try {
      const r = req.server.db.prepare('INSERT INTO bots (name, description) VALUES (?, ?)').run(name.trim(), description ?? '')
      return reply.code(201).send(req.server.db.prepare('SELECT id, name, description FROM bots WHERE id=?').get(r.lastInsertRowid))
    } catch {
      return reply.code(409).send({ error: '이미 있는 봇 이름입니다' })
    }
  })
}
```

`server/src/index.ts`의 `buildServer`에 등록 추가(`registerAuthRoutes` 뒤):

```ts
import { registerRoomRoutes } from './routes-rooms.js'
import { registerBotRoutes } from './routes-bots.js'
// ...
registerRoomRoutes(app)
registerBotRoutes(app)
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add server/src server/test
git commit -m "feat: room and bot registry APIs with archive"
```

---

### Task 5: 봇 초대 API (토큰 발급 + 세션 실행 명령 안내)

**Files:**
- Modify: `server/src/routes-bots.ts`
- Modify: `server/test/rooms-bots.test.ts` (테스트 추가)

**Interfaces:**
- Consumes: Task 4의 `registerBotRoutes`
- Produces:
  - `POST /api/rooms/:id/invites { bot_id }` → `201 { bot_id, bot_name, token, command }`. `token`은 이 응답에 **한 번만** 나온다(이후 조회 불가).
  - `GET /api/rooms/:id/invites` → `[{ bot_id, bot_name, online: false }]` (online은 Task 8에서 채워진다).
  - `DELETE /api/rooms/:id/invites/:botId` → 토큰 철회.
  - `sha256Hex(s: string): string` 내보내기 — Task 8 게이트웨이가 토큰 해시 조회에 재사용.

- [ ] **Step 1: 실패하는 테스트 추가** (`server/test/rooms-bots.test.ts`의 `describe('bots', ...)` 뒤에)

```ts
describe('invites', () => {
  it('invites a bot and returns one-time token + command', async () => {
    const { app, cookie } = await build()
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm', description: '' } })).json()
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
    expect(body.command).toContain('--dangerously-load-development-channels')
    expect(body.command).toContain(body.token)
  })

  it('lists invites without token', async () => {
    const { app, cookie } = await build()
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm', description: '' } })).json()
    await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
    const list = await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie } })
    expect(list.json()).toEqual([{ bot_id: bot.id, bot_name: 'pm', online: false }])
  })

  it('re-inviting same bot revokes old token and issues new one', async () => {
    const { app, cookie } = await build()
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm', description: '' } })).json()
    const first = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })).json()
    const second = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })).json()
    expect(first.token).not.toBe(second.token)
    const count = db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room.id) as { c: number }
    expect(count.c).toBe(1)
  })

  it('invite to archived room returns 403', async () => {
    const { app, cookie } = await build()
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
    await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm', description: '' } })).json()
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
    expect(res.statusCode).toBe(403)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — 새 describe 4건

- [ ] **Step 3: 구현** (`server/src/routes-bots.ts`에 추가)

```ts
import { createHash, randomBytes } from 'node:crypto'

export function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

function inviteCommand(token: string, port = 3000): string {
  return [
    '# 1회 등록 (최초 한 번만):',
    'claude mcp add --scope user minidiscord-channel -- minidiscord-channel',
    '',
    '# 세션 실행 (원하는 페르소나 디렉터리에서):',
    `export MINIDISCORD_TOKEN=${token}`,
    `export MINIDISCORD_SERVER=ws://127.0.0.1:${port}/bot`,
    'claude --dangerously-load-development-channels server:minidiscord-channel',
  ].join('\n')
}

export function registerBotRoutes(app: FastifyInstance): void {
  // ...기존 GET/POST /api/bots 그대로...

  app.post('/api/rooms/:id/invites', { preHandler: [requireAuth] }, async (req, reply) => {
    const roomId = Number((req.params as { id: string }).id)
    const { bot_id } = req.body as { bot_id?: number }
    const db = req.server.db
    const room = db.prepare("SELECT id FROM rooms WHERE id=? AND status='active'").get(roomId)
    if (!room) return reply.code(403).send({ error: '활성 방이 아닙니다' })
    const bot = db.prepare('SELECT id, name FROM bots WHERE id=?').get(bot_id ?? -1) as { id: number; name: string } | undefined
    if (!bot) return reply.code(404).send({ error: '봇을 찾을 수 없습니다' })
    db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE room_id=? AND bot_id=? AND revoked_at IS NULL").run(roomId, bot.id)
    const token = randomBytes(32).toString('hex')
    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, bot.id, sha256Hex(token))
    return reply.code(201).send({ bot_id: bot.id, bot_name: bot.name, token, command: inviteCommand(token) })
  })

  app.get('/api/rooms/:id/invites', { preHandler: [requireAuth] }, async req => {
    const roomId = Number((req.params as { id: string }).id)
    return req.server.db.prepare(
      `SELECT t.bot_id, b.name AS bot_name, 0 AS online
       FROM bot_tokens t JOIN bots b ON b.id = t.bot_id
       WHERE t.room_id=? AND t.revoked_at IS NULL ORDER BY b.name`,
    ).all(roomId)
  })

  app.delete('/api/rooms/:id/invites/:botId', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id, botId } = req.params as { id: string; botId: string }
    req.server.db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE room_id=? AND bot_id=? AND revoked_at IS NULL").run(Number(id), Number(botId))
    return { ok: true }
  })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add server/src server/test
git commit -m "feat: bot invite API issuing one-time gateway token"
```

---

### Task 6: 멘션 파서 (@TO/@CC)

**Files:**
- Create: `server/src/mention.ts`, `server/test/mention.test.ts`

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces: `parseMentions(body: string): { bot: string; delivery: 'to' | 'cc' }[]` — 본문 순서대로 중복 포함 모든 멘션. 형식은 정확히 `@TO(봇이름)` / `@CC(봇이름)`. 봇이름은 `(`와 `)` 사이에 공백·괄호 없는 1자 이상.

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/mention.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseMentions } from '../src/mention.js'

describe('parseMentions', () => {
  it('parses a single TO', () => {
    expect(parseMentions('@TO(pm) 일정 정리해줘')).toEqual([{ bot: 'pm', delivery: 'to' }])
  })

  it('parses CC', () => {
    expect(parseMentions('이건 참고만 @CC(coder)')).toEqual([{ bot: 'coder', delivery: 'cc' }])
  })

  it('parses multiple mentions in order, duplicates kept', () => {
    expect(parseMentions('@TO(pm) 정리하고 @TO(coder) 구현해. @CC(coder)')).toEqual([
      { bot: 'pm', delivery: 'to' },
      { bot: 'coder', delivery: 'to' },
      { bot: 'coder', delivery: 'cc' },
    ])
  })

  it('ignores plain @name without TO/CC parens', () => {
    expect(parseMentions('@pm 안녕 @토(pm)도 무시')).toEqual([])
  })

  it('rejects empty or space-containing name (no match)', () => {
    expect(parseMentions('@TO( ) @TO()')).toEqual([])
  })

  it('korean bot names work', () => {
    expect(parseMentions('@TO(코드리뷰어) 봐줘')).toEqual([{ bot: '코드리뷰어', delivery: 'to' }])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`server/src/mention.ts`:

```ts
// @TO(봇)/@CC(봇) 멘션 파서 — 순수 함수 (spec 5-A)
const MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g

export interface Mention {
  bot: string
  delivery: 'to' | 'cc'
}

export function parseMentions(body: string): Mention[] {
  const out: Mention[] = []
  for (const m of body.matchAll(MENTION_RE)) {
    out.push({ bot: m[2], delivery: m[1].toLowerCase() as 'to' | 'cc' })
  }
  return out
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add server/src/mention.ts server/test/mention.test.ts
git commit -m "feat: @TO/@CC mention parser"
```

---

### Task 7: SSE 허브

**Files:**
- Create: `server/src/sse.ts`, `server/test/sse.test.ts`

**Interfaces:**
- Consumes: `requireAuth`
- Produces: `createSseHub(): SseHub` where

```ts
interface SseHub {
  subscribe(roomId: number, res: import('http').ServerResponse): void
  publish(roomId: number, event: string, data: unknown): void
}
```

이벤트는 `event: <name>` + `data: <json>` 형식으로 전송된다. 이후 태스크에서 쓰는 이벤트명: `message`, `bot_status`.

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/sse.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { createSseHub } from '../src/sse.js'
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { openDb } from '../src/db.js'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('sse hub', () => {
  it('delivers published events to room subscribers only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'md-'))
    const app = Fastify()
    app.db = openDb(join(dir, 't.db'))
    await app.register(cookie)
    registerAuthRoutes(app, app.db)
    const hub = createSseHub()
    app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
      hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
    })
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'u', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'u', password: 'pw123456' } })
    const ck = login.headers['set-cookie']![0].split(';')[0]

    const chunks: string[] = []
    await app.inject({
      method: 'GET', url: '/api/rooms/1/events', headers: { cookie: ck },
    }) // inject는 SSE를 소비하지 않으므로 아래처럼 실제 서버로 검증한다
    chunks.length = 0

    // 실제 HTTP 서버로 검증
    await app.listen({ port: 0 })
    const addr = app.server.address() as { port: number }
    const res = await fetch(`http://127.0.0.1:${addr.port}/api/rooms/1/events`, { headers: { cookie: ck } })
    const reader = res.body!.getReader()
    const first = await reader.read() // ': connected' 주석
    expect(Buffer.from(first.value!).toString()).toContain('connected')

    hub.publish(1, 'message', { id: 7 })
    const second = await reader.read()
    const text = Buffer.from(second.value!).toString()
    expect(text).toContain('event: message')
    expect(text).toContain('"id":7')

    hub.publish(2, 'message', { id: 9 }) // 다른 방은 안 옴
    await new Promise(r => setTimeout(r, 100))
    await reader.cancel()
    await app.close()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`server/src/sse.ts`:

```ts
// SSE 허브: 방별 구독자에게 이벤트 발행
import type { ServerResponse } from 'node:http'

export interface SseHub {
  subscribe(roomId: number, res: ServerResponse): void
  publish(roomId: number, event: string, data: unknown): void
}

export function createSseHub(): SseHub {
  const rooms = new Map<number, Set<ServerResponse>>()

  function subscribe(roomId: number, res: ServerResponse): void {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    res.write(': connected\n\n')
    const set = rooms.get(roomId) ?? new Set()
    set.add(res)
    rooms.set(roomId, set)
    res.on('close', () => {
      set.delete(res)
      if (set.size === 0) rooms.delete(roomId)
    })
  }

  function publish(roomId: number, event: string, data: unknown): void {
    const set = rooms.get(roomId)
    if (!set) return
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const res of set) res.write(payload)
  }

  return { subscribe, publish }
}
```

SSE 라우트 등록은 `server/src/index.ts`의 `buildServer`에 추가:

```ts
import { createSseHub } from './sse.js'
// ...
const hub = createSseHub()
app.decorate('hub', hub)
app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
  app.hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
})
```

`declare module 'fastify'` 블록에 `hub` 추가:

```ts
interface FastifyInstance {
  db: Db
  hub: ReturnType<typeof createSseHub>
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add server/src server/test
git commit -m "feat: SSE hub with per-room subscription"
```

---

### Task 8: 봇 게이트웨이 (WebSocket 서버)

spec 6장의 게이트웨이 프로토콜을 구현한다. 이 태스크가 끝나면 가짜 채널 클라이언트가 토큰으로 접속해 메시지를 주고받을 수 있다.

**Files:**
- Create: `server/src/gateway.ts`, `server/test/gateway.test.ts`
- Modify: `server/src/index.ts` (게이트웨이 attach, `onArchive` 연결)
- Modify: `server/src/routes-rooms.ts` 없음(훅은 이미 Task 4에서 만듦)

**Interfaces:**
- Consumes: `openDb`, `createSseHub`, `sha256Hex`(Task 5), `config.uploadsDir`
- Produces: `createGateway(app: FastifyInstance, opts: { uploadsDir: string }): Gateway` where

```ts
interface Gateway {
  deliver(roomId: number, msg: MessageRow, targets: { botId: number; delivery: 'to' | 'cc' }[]): void
  closeRoom(roomId: number): void
  isOnline(roomId: number, botId: number): boolean
  sendToBot(roomId: number, botId: number, payload: object): boolean  // Task 11 권한 verdict가 사용
  setPermissionHandler(fn: ((info: ConnInfo, params: PermissionRequestParams) => void) | null): void
}
interface MessageRow { id: number; room_id: number; author_type: string; author_name: string; body: string; created_at: string; attachments?: { id: number; filename: string; stored_path: string }[] }
interface ConnInfo { roomId: number; botId: number }
```

WebSocket 경로는 `/bot`. 프로토콜 메시지는 JSON with `type` 필드.

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/gateway.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { sha256Hex } from '../src/routes-bots.js'
import { randomBytes } from 'node:crypto'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
  mkdirSync(join(dir, 'up'), { recursive: true })
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  const hub = createSseHub()
  app.decorate('hub', hub)
  registerAuthRoutes(app, db)
  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
    hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  app.decorate('gateway', gateway)
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  return { app, hub, gateway, port }
}

function seedRoomAndBot(): { roomId: number; botId: number; token: string } {
  const roomId = (db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number)
  const botId = (db.prepare("INSERT INTO bots (name, description) VALUES ('pm', '')").run().lastInsertRowid as number)
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(token))
  return { roomId, botId, token }
}

function wsConnect(port: number, token: string): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', data => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'welcome') resolve({ ws, welcome: msg })
    })
    ws.on('error', reject)
  })
}

async function nextMessage(ws: WebSocket, timeoutMs = 2000): Promise<any> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting ws message')), timeoutMs)
    ws.on('message', function h(data) {
      clearTimeout(t)
      ws.off('message', h)
      resolve(JSON.parse(String(data)))
    })
  })
}

describe('gateway', () => {
  it('welcomes a valid token and replays missed messages', async () => {
    const { app, port } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    // 커서 이전 메시지 1건 + 타깃 메시지 1건
    const oldId = (db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '안녕')").run(roomId).lastInsertRowid as number)
    const newId = (db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(roomId).lastInsertRowid as number)
    db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(newId, botId, 'to')
    db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE room_id=? AND bot_id=?').run(oldId, roomId, botId)

    const { ws, welcome } = await wsConnect(port, token)
    expect(welcome.room_id).toBe(roomId)
    expect(welcome.bot_id).toBe(botId)
    expect(welcome.bot_name).toBe('pm')
    const replay = await nextMessage(ws)
    expect(replay.type).toBe('message')
    expect(replay.id).toBe(newId)
    expect(replay.delivery).toBe('to')
    ws.close()
    await app.close()
  })

  it('rejects invalid token by closing', async () => {
    const { app, port } = await build()
    seedRoomAndBot()
    const closed = new Promise<void>(r => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: 'f'.repeat(64) })))
      ws.on('close', () => r())
    })
    await closed
    await app.close()
  })

  it('stores bot_message (with local file copy) and publishes to SSE', async () => {
    const { app, hub, port } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const srcPath = join(dir, 'report.md')
    writeFileSync(srcPath, '# 결과\n완료')
    const published: any[] = []
    // hub에 직접 스파이 대신 실제 SSE 대신: publish 가로채기는 힘드므로 DB로 검증 + files 복사 검증
    const { ws } = await wsConnect(port, token)
    ws.send(JSON.stringify({ type: 'bot_message', body: '정리 완료', files: [{ local_path: srcPath, name: '보고서.md' }] }))
    await new Promise(r => setTimeout(r, 300))
    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(roomId) as any
    expect(row.body).toBe('정리 완료')
    expect(row.author_bot_id).toBe(botId)
    const att = db.prepare('SELECT * FROM attachments WHERE message_id=?').get(row.id) as any
    expect(att.filename).toBe('보고서.md')
    expect(readFileSync(att.stored_path, 'utf8')).toContain('완료')
    ws.close()
    await app.close()
  })

  it('bot_message with missing file skips that attachment but stores message', async () => {
    const { app, port } = await build()
    const { roomId, token } = seedRoomAndBot()
    const { ws } = await wsConnect(port, token)
    ws.send(JSON.stringify({ type: 'bot_message', body: '결과', files: [{ local_path: join(dir, '없는파일'), name: 'x' }] }))
    await new Promise(r => setTimeout(r, 300))
    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(roomId) as any
    expect(row.body).toBe('결과')
    const cnt = db.prepare('SELECT COUNT(*) c FROM attachments').get() as any
    expect(cnt.c).toBe(0)
    ws.close()
    await app.close()
  })

  it('status updates online flag', async () => {
    const { app, gateway, port } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    expect(gateway.isOnline(roomId, botId)).toBe(false)
    const { ws } = await wsConnect(port, token)
    expect(gateway.isOnline(roomId, botId)).toBe(true)
    ws.close()
    await new Promise(r => setTimeout(r, 100))
    expect(gateway.isOnline(roomId, botId)).toBe(false)
    await app.close()
  })

  it('history_request returns room messages', async () => {
    const { app, port } = await build()
    const { roomId, token } = seedRoomAndBot()
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '하나')").run(roomId)
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'bot', '둘')").run(roomId)
    const { ws } = await wsConnect(port, token)
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r1', limit: 10 }))
    const res = await nextMessage(ws)
    expect(res.type).toBe('history_response')
    expect(res.rid).toBe('r1')
    expect(res.messages.map((m: any) => m.body)).toEqual(['하나', '둘'])
    ws.close()
    await app.close()
  })

  it('history_request with since_id returns only later messages', async () => {
    const { app, port } = await build()
    const { roomId, token } = seedRoomAndBot()
    const first = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '하나')").run(roomId)
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '둘')").run(roomId)
    const { ws } = await wsConnect(port, token)
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r2', since_id: first.lastInsertRowid, limit: 10 }))
    const res = await nextMessage(ws)
    expect(res.messages.map((m: any) => m.body)).toEqual(['둘'])
    expect(res.messages[0].id).toBeGreaterThan(Number(first.lastInsertRowid))
    ws.close()
    await app.close()
  })

  it('deliver sends message only to targeted online bot and updates cursor', async () => {
    const { app, port } = await build()
    const { roomId, botId, token } = seedRoomAndBot()
    const { ws } = await wsConnect(port, token)
    const msgId = (db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(roomId).lastInsertRowid as number)
    db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(msgId, botId, 'to')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    ;(app as any).gateway.deliver(roomId, { ...row, author_name: 'alice' }, [{ botId, delivery: 'to' }])
    const got = await nextMessage(ws)
    expect(got.type).toBe('message')
    expect(got.author_name).toBe('alice')
    const cur = db.prepare('SELECT last_delivered_id v FROM bot_tokens WHERE room_id=? AND bot_id=?').get(roomId, botId) as any
    expect(cur.v).toBe(msgId)
    ws.close()
    await app.close()
  })

  it('closeRoom disconnects that room sockets', async () => {
    const { app, gateway, port } = await build()
    const { roomId, token } = seedRoomAndBot()
    const { ws } = await wsConnect(port, token)
    const closed = new Promise<void>(r => ws.on('close', () => r()))
    gateway.closeRoom(roomId)
    await closed
    await app.close()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — `../src/gateway.js` 없음

- [ ] **Step 3: 구현**

`server/src/gateway.ts`:

```ts
// 봇 게이트웨이: 채널 플러그인의 WebSocket 접속 창구 (spec 6장)
import { WebSocketServer, WebSocket } from 'ws'
import { randomUUID, statSync } from 'node:crypto'
import { copyFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { sha256Hex } from './routes-bots.js'

export interface MessageRow {
  id: number; room_id: number; author_type: string; author_name: string
  body: string; created_at: string
  attachments?: { id: number; filename: string; stored_path: string }[]
}

export interface ConnInfo { roomId: number; botId: number }

export interface Gateway {
  deliver(roomId: number, msg: MessageRow, targets: { botId: number; delivery: 'to' | 'cc' }[]): void
  closeRoom(roomId: number): void
  isOnline(roomId: number, botId: number): boolean
  sendToBot(roomId: number, botId: number, payload: object): boolean
  setPermissionHandler(fn: ((info: ConnInfo, params: any) => void) | null): void
}

export function createGateway(app: FastifyInstance, opts: { uploadsDir: string }): Gateway {
  const db = app.db
  const hub = app.hub
  const conns = new Map<WebSocket, ConnInfo & { tokenRowId: number }>()
  let permissionHandler: ((info: ConnInfo, params: any) => void) | null = null

  const wss = new WebSocketServer({ server: app.server, path: '/bot' })
  app.addHook('onClose', async () => { for (const ws of conns.keys()) ws.close(); wss.close() })

  wss.on('connection', ws => {
    ws.on('message', raw => { handleWsMessage(ws, JSON.parse(String(raw))).catch(() => ws.close()) })
    ws.on('close', () => conns.delete(ws))
  })

  async function handleWsMessage(ws: WebSocket, msg: any): Promise<void> {
    if (msg.type === 'hello') return handleHello(ws, msg.token)
    const info = conns.get(ws)
    if (!info) throw new Error('not authenticated')
    switch (msg.type) {
      case 'bot_message': return handleBotMessage(info, msg)
      case 'status': {
        if (msg.state === 'working' || msg.state === 'idle') {
          hub.publish(info.roomId, 'bot_status', { bot_id: info.botId, state: msg.state })
        }
        return
      }
      case 'history_request': return handleHistory(info, msg)
      case 'permission_request': {
        permissionHandler?.({ roomId: info.roomId, botId: info.botId }, msg)
        return
      }
    }
  }

  function handleHello(ws: WebSocket, token: string): void {
    const row = db.prepare(
      `SELECT t.id AS token_row_id, t.room_id, t.bot_id, t.last_delivered_id, r.status AS room_status, b.name AS bot_name
       FROM bot_tokens t JOIN rooms r ON r.id = t.room_id JOIN bots b ON b.id = t.bot_id
       WHERE t.token_hash = ? AND t.revoked_at IS NULL AND r.status = 'active'`,
    ).get(sha256Hex(token)) as any
    if (!row) { ws.close(); return }
    const info = { roomId: row.room_id, botId: row.bot_id, tokenRowId: row.token_row_id }
    conns.set(ws, info)
    db.prepare("UPDATE bot_tokens SET last_seen_at=datetime('now') WHERE id=?").run(row.token_row_id)
    send(ws, { type: 'welcome', room_id: row.room_id, bot_id: row.bot_id, bot_name: row.bot_name, missed_after_id: row.last_delivered_id })
    // 놓친 메시지 재전송: 그 봇이 타깃인 메시지 중 커서 이후
    const missed = db.prepare(
      `SELECT m.*, t.delivery FROM message_targets t JOIN messages m ON m.id = t.message_id
       WHERE t.bot_id = ? AND m.room_id = ? AND m.id > ? ORDER BY m.id`,
    ).all(row.bot_id, row.room_id, row.last_delivered_id) as any[]
    for (const m of missed) sendStoredMessage(ws, m)
    if (missed.length > 0) {
      db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE id = ?').run(missed[missed.length - 1].id, row.token_row_id)
    }
  }

  function sendStoredMessage(ws: WebSocket, m: any): void {
    const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(m.id) as any[]
    send(ws, {
      type: 'message', id: m.id, body: m.body,
      author_name: authorName(m),
      delivery: m.delivery,
      files: attachments.map(a => ({ name: a.filename, local_path: a.stored_path })),
    })
  }

  function authorName(m: any): string {
    if (m.author_type === 'user') {
      const u = db.prepare('SELECT username FROM users WHERE id = ?').get(m.author_user_id) as any
      return u?.username ?? '사용자'
    }
    if (m.author_type === 'bot') {
      const b = db.prepare('SELECT name FROM bots WHERE id = ?').get(m.author_bot_id) as any
      return b?.name ?? '봇'
    }
    return '시스템'
  }

  function handleBotMessage(info: ConnInfo & { tokenRowId: number }, msg: any): void {
    const r = db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, ?)")
      .run(info.roomId, info.botId, String(msg.body ?? ''))
    const messageId = r.lastInsertRowid as number
    for (const f of (msg.files ?? []) as { local_path: string; name?: string }[]) {
      try {
        const size = statSync(f.local_path).size
        const stored = join(opts.uploadsDir, `${randomUUID()}-${basename(f.local_path)}`)
        copyFileSync(f.local_path, stored)
        db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
          .run(messageId, f.name ?? basename(f.local_path), stored, size, 'application/octet-stream')
      } catch {
        // 파일이 없으면 그 첨부만 건너뛴다 (spec 8장)
      }
    }
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as any
    const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(messageId)
    hub.publish(info.roomId, 'message', { ...row, author_name: authorName(row), attachments })
  }

  function handleHistory(info: ConnInfo, msg: any): void {
    const limit = Math.min(Number(msg.limit ?? 100), 500)
    let rows = db.prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?').all(info.roomId, limit) as any[]
    rows = rows.reverse()
    if (msg.speaker) rows = rows.filter(m => authorName(m) === msg.speaker)
    if (msg.since_id != null) rows = rows.filter(m => m.id > Number(msg.since_id))
    if (msg.since) rows = rows.filter(m => m.created_at >= msg.since)
    if (msg.until) rows = rows.filter(m => m.created_at < msg.until)
    sendToConn(info, {
      type: 'history_response', rid: msg.rid,
      messages: rows.map(m => ({ id: m.id, author_name: authorName(m), body: m.body, created_at: m.created_at })),
    })
  }

  function send(ws: WebSocket, payload: object): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
  }

  function sendToConn(info: ConnInfo, payload: object): void {
    for (const [ws, c] of conns) if (c.roomId === info.roomId && c.botId === info.botId) send(ws, payload)
  }

  return {
    deliver(roomId, msg, targets) {
      const attachments = db.prepare('SELECT id, filename, stored_path FROM attachments WHERE message_id = ?').all(msg.id) as any[]
      for (const [ws, c] of conns) {
        if (c.roomId !== roomId) continue
        const t = targets.find(t => t.botId === c.botId)
        if (!t) continue
        send(ws, {
          type: 'message', id: msg.id, body: msg.body, author_name: msg.author_name, delivery: t.delivery,
          files: attachments.map(a => ({ name: a.filename, local_path: a.stored_path })),
        })
        db.prepare('UPDATE bot_tokens SET last_delivered_id = ? WHERE id = ?').run(msg.id, c.tokenRowId)
      }
    },
    closeRoom(roomId) {
      for (const [ws, c] of conns) if (c.roomId === roomId) ws.close()
    },
    isOnline(roomId, botId) {
      for (const c of conns.values()) if (c.roomId === roomId && c.botId === botId) return true
      return false
    },
    sendToBot(roomId, botId, payload) {
      for (const [ws, c] of conns) if (c.roomId === roomId && c.botId === botId) { send(ws, payload); return true }
      return false
    },
    setPermissionHandler(fn) { permissionHandler = fn },
  }
}
```

`server/src/index.ts`의 `buildServer`에 연결:

```ts
import { createGateway } from './gateway.js'
// ... hub/decorate 뒤에
const gateway = createGateway(app, { uploadsDir: config.uploadsDir })
app.decorate('gateway', gateway)
// onArchive에 게이트웨이 연결 끊기 반영
registerRoomRoutes(app, { onArchive: roomId => gateway.closeRoom(roomId) })
```

`declare module 'fastify'`에 `gateway: Gateway` 추가. 또한 `GET /api/rooms/:id/invites`의 online 필드를 실제 상태로 바꾼다(`routes-bots.ts` 수정):

```ts
app.get('/api/rooms/:id/invites', { preHandler: [requireAuth] }, async req => {
  const roomId = Number((req.params as { id: string }).id)
  const rows = req.server.db.prepare(
    `SELECT t.bot_id, b.name AS bot_name FROM bot_tokens t JOIN bots b ON b.id = t.bot_id
     WHERE t.room_id=? AND t.revoked_at IS NULL ORDER BY b.name`,
  ).all(roomId) as { bot_id: number; bot_name: string }[]
  return rows.map(r => ({ ...r, online: (req.server as any).gateway?.isOnline(roomId, r.bot_id) ?? false }))
})
```

`import { randomUUID } from 'node:crypto'`와 `statSync`는 `node:fs`에서 오는 것에 유의: `randomUUID`는 `node:crypto`, `statSync/copyFileSync`는 `node:fs`에서 임포트한다(위 코드의 import 줄을 다음처럼 정정):

```ts
import { randomUUID } from 'node:crypto'
import { copyFileSync, statSync } from 'node:fs'
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS (gateway 8건 포함 전체)

- [ ] **Step 5: 커밋**

```bash
git add server/src server/test
git commit -m "feat: bot gateway with auth, cursor replay, bot_message, history"
```

---

### Task 9: 메시지 API (전송 multipart + 목록 + 다운로드)

사용자 메시지 전송은 multipart(`body` 필드 + 선택적 `files`)로 통합한다. 멘션 파싱 → `message_targets` 기록 → SSE 발행 → 게이트웨이 전달까지 한 번에.

**Files:**
- Create: `server/src/routes-messages.ts`, `server/test/messages.test.ts`
- Modify: `server/src/index.ts` (multipart 등록 + 라우트 등록)

**Interfaces:**
- Consumes: `parseMentions`(Task 6), `createGateway`(Task 8), `createSseHub`(Task 7), `requireAuth`
- Produces:
  - `registerMessageRoutes(app: FastifyInstance): void`
  - `POST /api/rooms/:id/messages` — multipart form: `body`(문자열), `files`(선택). 응답 `{ ok, message }`. 멘션된 봇 이름이 방에 초대되어 있지 않으면 `400` + 안내.
  - `GET /api/rooms/:id/messages?after=<id>` — `{ messages: [...] }` 각 메시지에 `author_name`, `attachments` 포함.
  - `GET /api/attachments/:id` — 파일 다운로드(인증 필요).

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/messages.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { sha256Hex } from '../src/routes-bots.js'
import { randomBytes } from 'node:crypto'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  await app.register(multipart)
  const hub = createSseHub()
  app.decorate('hub', hub)
  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
    hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  app.decorate('gateway', gateway)
  registerAuthRoutes(app, db)
  registerMessageRoutes(app)
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  return { app, cookie: login.headers['set-cookie']![0].split(';')[0] }
}

function seed(): { roomId: number; botId: number } {
  const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number
  const botId = db.prepare("INSERT INTO bots (name, description) VALUES ('pm', '')").run().lastInsertRowid as number
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(randomBytes(32).toString('hex')))
  return { roomId, botId }
}

async function postMessage(app: any, ck: string, roomId: number, body: string, filePath?: string) {
  const form = new FormData()
  form.append('body', body)
  if (filePath) form.append('files', new Blob([await (await import('node:fs/promises')).readFile(filePath)]), '첨부.txt')
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie: ck }, payload: form })
}

describe('messages', () => {
  it('stores a plain user message with no targets (no bot delivery)', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    const res = await postMessage(app, cookie, roomId, '그냥 기록용 메모')
    expect(res.statusCode).toBe(200)
    const targets = db.prepare('SELECT COUNT(*) c FROM message_targets').get() as any
    expect(targets.c).toBe(0)
    const row = db.prepare('SELECT * FROM messages').get() as any
    expect(row.body).toBe('그냥 기록용 메모')
  })

  it('stores targets for mentioned bots', async () => {
    const { app, cookie } = await build()
    const { roomId, botId } = seed()
    const res = await postMessage(app, cookie, roomId, '@TO(pm) 일정 정리해줘')
    expect(res.statusCode).toBe(200)
    const t = db.prepare('SELECT * FROM message_targets').get() as any
    expect(t.bot_id).toBe(botId)
    expect(t.delivery).toBe('to')
  })

  it('rejects mention of bot not invited to the room', async () => {
    const { app, cookie } = await build()
    const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number
    const res = await postMessage(app, cookie, roomId, '@TO(모르는봇) 안녕')
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('모르는봇')
  })

  it('rejects message to archived room', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    db.prepare("UPDATE rooms SET status='archived'").run()
    const res = await postMessage(app, cookie, roomId, '늦은 메시지')
    expect(res.statusCode).toBe(403)
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
    const dl = await app.inject({ method: 'GET', url: `/api/attachments/${att.id}`, headers: { cookie } })
    expect(dl.statusCode).toBe(200)
    expect(dl.body).toBe('파일 내용')
  })

  it('lists messages after cursor', async () => {
    const { app, cookie } = await build()
    const { roomId } = seed()
    await postMessage(app, cookie, roomId, '첫째')
    await postMessage(app, cookie, roomId, '둘째')
    const first = (db.prepare('SELECT id FROM messages ORDER BY id LIMIT 1').get() as any).id
    const list = await app.inject({ method: 'GET', url: `/api/rooms/${roomId}/messages?after=${first}`, headers: { cookie } })
    const msgs = list.json().messages
    expect(msgs).toHaveLength(1)
    expect(msgs[0].body).toBe('둘째')
    expect(msgs[0].author_name).toBe('alice')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`server/src/routes-messages.ts`:

```ts
// 메시지 전송(multipart)/목록/첨부 다운로드 (spec 7장 흐름)
import { createWriteStream, renameSync, mkdirSync, statSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { basename, join, extname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createReadStream } from 'node:fs'
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'
import { parseMentions } from './mention.js'

const MIME: Record<string, string> = {
  '.txt': 'text/plain', '.md': 'text/markdown', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.pdf': 'application/pdf', '.json': 'application/json',
  '.csv': 'text/csv', '.zip': 'application/zip', '.log': 'text/plain',
}

export function registerMessageRoutes(app: FastifyInstance): void {
  app.post('/api/rooms/:id/messages', { preHandler: [requireAuth] }, async (req, reply) => {
    const roomId = Number((req.params as { id: string }).id)
    const db = req.server.db
    const room = db.prepare("SELECT id FROM rooms WHERE id=? AND status='active'").get(roomId)
    if (!room) return reply.code(403).send({ error: '활성 방이 아닙니다' })

    // multipart 파싱: body 필드 + files
    let body = ''
    const savedFiles: { filename: string; stored_path: string; size: number }[] = []
    const parts = req.parts({ limits: { fileSize: 100 * 1024 * 1024 } })
    for await (const part of parts) {
      if (part.type === 'file') {
        mkdirSync(req.server.uploadsDir, { recursive: true })
        const stored = join(req.server.uploadsDir, `${randomUUID()}-${part.filename}`)
        await pipeline(part.file, createWriteStream(stored))
        savedFiles.push({ filename: part.filename, stored_path: stored, size: statSync(stored).size })
      } else if (part.fieldname === 'body') {
        body = String(part.value ?? '')
      }
    }
    if (!body.trim() && savedFiles.length === 0) {
      return reply.code(400).send({ error: '내용이나 파일이 필요합니다' })
    }

    // 멘션 → 그 방의 초대된 봇만 매핑
    const mentions = parseMentions(body)
    const invited = db.prepare(
      `SELECT b.id, b.name FROM bot_tokens t JOIN bots b ON b.id = t.bot_id
       WHERE t.room_id=? AND t.revoked_at IS NULL`,
    ).all(roomId) as { id: number; name: string }[]
    const byName = new Map(invited.map(b => [b.name, b.id]))
    const unknown = [...new Set(mentions.map(m => m.bot))].filter(n => !byName.has(n))
    if (unknown.length > 0) {
      return reply.code(400).send({ error: `이 방에 초대되지 않은 봇입니다: ${unknown.join(', ')}` })
    }
    const targets = mentions.map(m => ({ botId: byName.get(m.bot)!, delivery: m.delivery }))

    const r = db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body) VALUES (?, 'user', ?, ?)")
      .run(roomId, req.user!.id, body)
    const messageId = r.lastInsertRowid as number
    for (const t of targets) {
      db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(messageId, t.botId, t.delivery)
    }
    const attachments = savedFiles.map(f => {
      db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
        .run(messageId, f.filename, f.stored_path, f.size, MIME[extname(f.filename).toLowerCase()] ?? 'application/octet-stream')
      return { filename: f.filename, stored_path: f.stored_path, id: db.prepare('SELECT last_insert_rowid() id').get().id }
    })

    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(messageId) as any
    const payload = { ...row, author_name: req.user!.username, attachments }
    req.server.hub.publish(roomId, 'message', payload)
    req.server.gateway.deliver(roomId, { ...row, author_name: req.user!.username }, targets)
    return { ok: true, message: payload }
  })

  app.get('/api/rooms/:id/messages', { preHandler: [requireAuth] }, async req => {
    const roomId = Number((req.params as { id: string }).id)
    const after = Number((req.query as { after?: string }).after ?? 0)
    const rows = req.server.db.prepare('SELECT * FROM messages WHERE room_id=? AND id>? ORDER BY id ASC LIMIT 200').all(roomId, after) as any[]
    const messages = rows.map(m => ({
      ...m,
      author_name: displayName(req.server.db, m),
      attachments: req.server.db.prepare('SELECT id, filename, stored_path, size FROM attachments WHERE message_id=?').all(m.id),
    }))
    return { messages }
  })

  app.get('/api/attachments/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const att = req.server.db.prepare('SELECT * FROM attachments WHERE id=?').get(id) as
      { filename: string; stored_path: string; mime: string } | undefined
    if (!att) return reply.code(404).send({ error: '파일을 찾을 수 없습니다' })
    reply.header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.filename)}`)
    reply.type(att.mime || 'application/octet-stream')
    return reply.send(createReadStream(att.stored_path))
  })
}

function displayName(db: any, m: any): string {
  if (m.author_type === 'user') return db.prepare('SELECT username FROM users WHERE id=?').get(m.author_user_id)?.username ?? '사용자'
  if (m.author_type === 'bot') return db.prepare('SELECT name FROM bots WHERE id=?').get(m.author_bot_id)?.name ?? '봇'
  return '시스템'
}
```

`server/src/index.ts`에 등록(`@fastify/multipart` 등록 포함, `uploadsDir` 데코레이트):

```ts
import multipart from '@fastify/multipart'
import { registerMessageRoutes } from './routes-messages.js'
// buildServer 안에서:
app.decorate('uploadsDir', config.uploadsDir)
await app.register(multipart)
registerMessageRoutes(app)
```

`declare module 'fastify'`에 `uploadsDir: string` 추가. `displayName`은 gateway.ts의 `authorName`과 같은 로직이지만 모듈 순환 참조를 피하기 위해 여기 별도로 둔다(10줄 중복 허용 — 순환 참조 위험이 더 크다).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add server/src server/test
git commit -m "feat: message API with mention routing, uploads, downloads"
```

---

### Task 10: 권한 릴레이 (서버 쪽)

봇의 도구 승인 요청을 방에 system 메시지로 띄우고, 사용자의 `yes/no <ID>` 답을 verdict로 되돌린다.

**Files:**
- Create: `server/src/permissions.ts`, `server/test/permissions.test.ts`
- Modify: `server/src/routes-messages.ts` (POST 시작에 사용자 답변 가로채기)
- Modify: `server/src/index.ts` (브로커 연결)

**Interfaces:**
- Consumes: `Gateway.setPermissionHandler`, `Gateway.sendToBot`(Task 8)
- Produces:
  - `createPermissionBroker(app: FastifyInstance): PermissionBroker` where

```ts
interface PermissionBroker {
  onGatewayRequest(info: ConnInfo, params: { request_id: string; tool_name: string; description: string; input_preview: string }): void
  tryHandleUserReply(roomId: number, text: string): boolean  // true면 이 메시지는 verdict로 소비됨
}
```

  - verdict 전송 규칙: `PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i` (공식 문서 형식 그대로).

- [ ] **Step 1: 실패하는 테스트 작성**

`server/test/permissions.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { createPermissionBroker } from '../src/permissions.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { sha256Hex } from '../src/routes-bots.js'
import { randomBytes } from 'node:crypto'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

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
  registerMessageRoutes(app)
  const broker = createPermissionBroker(app)
  gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number
  const botId = db.prepare("INSERT INTO bots (name, description) VALUES ('pm', '')").run().lastInsertRowid as number
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(randomBytes(32).toString('hex')))
  return { app, broker, roomId, botId, cookie: login.headers['set-cookie']![0].split(';')[0] }
}

describe('permission relay', () => {
  it('gateway request creates a system message in the room', async () => {
    const { app, roomId, botId, broker } = await build()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'Run shell command', input_preview: 'rm -rf tmp' })
    const row = db.prepare("SELECT * FROM messages WHERE author_type='system'").get() as any
    expect(row.body).toContain('abcde')
    expect(row.body).toContain('Bash')
  })

  it('user yes reply sends verdict to the bot and is not stored as user message', async () => {
    const { app, roomId, botId, broker, cookie } = await build()
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
    // sendToBot가 실제로 가는지는 게이트웨이 연결이 없으므로 false(전송 실패)지만 메시지 소비 자체를 검증
    const form = new FormData()
    form.append('body', 'yes abcde')
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie }, payload: form })
    expect(res.json().consumed_by).toBe('permission')
    const userMsgs = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as any
    expect(userMsgs.c).toBe(0)
  })

  it('non-matching text is not consumed', async () => {
    const { app, roomId, cookie } = await build()
    const form = new FormData()
    form.append('body', '그냥 대화')
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie }, payload: form })
    expect(res.json().ok).toBe(true)
  })

  it('yes with unknown id is not consumed (falls through as chat)', async () => {
    const { app, roomId, cookie } = await build()
    const form = new FormData()
    form.append('body', 'yes xxxxx')
    const res = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie }, payload: form })
    expect(res.json().ok).toBe(true) // 일반 메시지로 저장됨
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w server`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`server/src/permissions.ts`:

```ts
// 권한 릴레이 브로커: 봇의 승인 요청을 방에 표시하고 사용자 답을 verdict로 전달 (spec 7장)
import type { FastifyInstance } from 'fastify'
import type { ConnInfo } from './gateway.js'

// 공식 문서 형식: 5글자 소문자(l 제외). autocorrect 대소문자 허용.
const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i

export interface PermissionBroker {
  onGatewayRequest(info: ConnInfo, params: { request_id: string; tool_name: string; description: string; input_preview: string }): void
  tryHandleUserReply(roomId: number, text: string): boolean
}

export function createPermissionBroker(app: FastifyInstance): PermissionBroker {
  const db = app.db
  const hub = app.hub
  // request_id → 방/봇. 서버 재시작으로 유실돼도 터미널 대화상자가 살아있어 승인 가능(공식 릴레이 설계와 동일)
  const open = new Map<string, ConnInfo>()

  return {
    onGatewayRequest(info, params) {
      open.set(params.request_id, info)
      const body = [
        `🔒 봇이 도구 사용 승인을 요청합니다: ${params.tool_name}`,
        params.description,
        params.input_preview,
        `승인하려면 "yes ${params.request_id}", 거절하려면 "no ${params.request_id}" 라고 답해주세요.`,
      ].join('\n')
      const r = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', ?)").run(info.roomId, body)
      const row = db.prepare('SELECT * FROM messages WHERE id=?').get(r.lastInsertRowid) as any
      hub.publish(info.roomId, 'message', { ...row, author_name: '시스템', attachments: [] })
    },

    tryHandleUserReply(roomId, text) {
      const m = PERMISSION_REPLY_RE.exec(text)
      if (!m) return false
      const requestId = m[2].toLowerCase()
      const info = open.get(requestId)
      if (!info || info.roomId !== roomId) return false
      open.delete(requestId)
      const behavior = m[1].toLowerCase().startsWith('y') ? 'allow' : 'deny'
      app.gateway.sendToBot(roomId, info.botId, { type: 'permission_verdict', request_id: requestId, behavior })
      const body = behavior === 'allow' ? `✅ 승인 전송됨 (${requestId})` : `⛔ 거절 전송됨 (${requestId})`
      const r = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', ?)").run(roomId, body)
      const row = db.prepare('SELECT * FROM messages WHERE id=?').get(r.lastInsertRowid) as any
      hub.publish(roomId, 'message', { ...row, author_name: '시스템', attachments: [] })
      return true
    },
  }
}
```

`server/src/routes-messages.ts`의 POST 핸들러에서 multipart 파싱 **직후**(방 active 확인 후)에 가로채기를 삽입:

```ts
import type { PermissionBroker } from './permissions.js'
// registerMessageRoutes 시그니처 변경: (app) 그대로, 브로커는 app 데코레이터로 접근
// buildServer에서 app.decorate('permissions', broker) 후:
// (multipart 파싱으로 body를 얻은 직후)
if ((app as any).permissions?.tryHandleUserReply(roomId, body)) {
  return { ok: true, consumed_by: 'permission' }
}
```

`server/src/index.ts`에 연결:

```ts
import { createPermissionBroker } from './permissions.js'
// gateway 생성 뒤:
const broker = createPermissionBroker(app)
app.decorate('permissions', broker)
gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))
```

`declare module 'fastify'`에 `permissions: PermissionBroker` 추가.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w server`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add server/src server/test
git commit -m "feat: permission relay broker with yes/no verdict flow"
```

---

### Task 11: 채널 패키지와 MCP 채널 서버 코어

공식 Channels 계약을 구현하는 MCP 서버를 만든다. 이 태스크에서는 게이트웨이 없이 계약 자체(capabilities·instructions·reply 도구)를 InMemoryTransport로 검증한다.

**Files:**
- Create: `channel/package.json`, `channel/tsconfig.json`, `channel/src/channel-server.ts`, `channel/src/index.ts`, `channel/test/channel-server.test.ts`

**Interfaces:**
- Consumes: 없음(독립 모듈)
- Produces: `createChannelServer(deps: ChannelDeps): ChannelHandle` where

```ts
interface ChannelDeps {
  sendToChat: (payload: { text: string; files?: string[] }) => Promise<void>   // reply 도구가 호출
  fetchHistory: (params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }) => Promise<string>  // fetch_history 도구가 호출
  sendPermissionRequest?: (params: { request_id: string; tool_name: string; description: string; input_preview: string }) => void   // Task 14에서 연결
}
interface ChannelHandle {
  server: Server            // @modelcontextprotocol/sdk Server — stdio 연결용
  pushChatMessage(msg: { id: number; author_name: string; body: string; delivery: 'to' | 'cc'; files?: { name: string; local_path: string }[] }): Promise<void>
  handlePermissionVerdict(v: { request_id: string; behavior: 'allow' | 'deny' }): void   // Task 14에서 추가
}
```

- [ ] **Step 1: 채널 패키지 초기화**

`channel/package.json`:

```json
{
  "name": "@minidiscord/channel",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": { "minidiscord-channel": "./dist/index.js" },
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

`channel/tsconfig.json`은 server와 동일(복사). 설치:

```bash
npm install -w channel @modelcontextprotocol/sdk ws zod
npm install -w channel -D typescript tsx vitest @types/node @types/ws
```

- [ ] **Step 2: 실패하는 테스트 작성**

`channel/test/channel-server.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createChannelServer } from '../src/channel-server.js'

async function connect() {
  const calls = { replies: [] as any[], histories: [] as any[] }
  const handle = createChannelServer({
    sendToChat: async payload => { calls.replies.push(payload) },
    fetchHistory: async params => { calls.histories.push(params); return '대화기록' },
  })
  const client = new Client({ name: 'test', version: '0' })
  const [c, s] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(c), handle.server.connect(s)])
  return { client, handle, calls }
}

describe('channel server', () => {
  it('declares channel + tools capabilities', async () => {
    const { client } = await connect()
    // capabilities 검증은 서버 생성 시 선언된 값으로: 간접적으로 tools/list로 확인
    const tools = await client.listTools()
    const names = tools.tools.map(t => t.name)
    expect(names).toContain('reply')
    expect(names).toContain('fetch_history')
  })

  it('reply tool calls sendToChat', async () => {
    const { client, calls } = await connect()
    const res = await client.callTool({ name: 'reply', arguments: { text: '완료했습니다', files: ['/tmp/a.png'] } })
    expect(calls.replies).toEqual([{ text: '완료했습니다', files: ['/tmp/a.png'] }])
    expect((res.content as any[])[0].text).toBe('sent')
  })

  it('fetch_history returns text from deps', async () => {
    const { client, calls } = await connect()
    const res = await client.callTool({ name: 'fetch_history', arguments: { since_id: 41, limit: 5 } })
    expect((res.content as any[])[0].text).toBe('대화기록')
    expect(calls.histories[0]).toEqual({ since_id: 41, limit: 5 })
  })

  it('pushChatMessage notifies with TO/CC meta', async () => {
    const { client, handle } = await connect()
    const received: any[] = []
    client.setNotificationHandler({ method: 'notifications/claude/channel' } as any, n => { received.push(n) })
    await handle.pushChatMessage({ id: 3, author_name: 'alice', body: '봐줘', delivery: 'to', files: [{ name: 'x.png', local_path: '/data/uploads/x.png' }] })
    expect(received).toHaveLength(1)
    const p = received[0].params
    expect(p.content).toContain('alice')
    expect(p.content).toContain('봐줘')
    expect(p.content).toContain('/data/uploads/x.png')
    expect(p.meta.delivery).toBe('to')
    expect(p.meta.chat_id).toBe('3')
  })
})
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -w channel`
Expected: FAIL — 모듈 없음

- [ ] **Step 4: 구현**

`channel/src/channel-server.ts`:

```ts
// MCP 채널 서버: 공식 Channels 계약 구현 (spec 4-B)
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'

export const INSTRUCTIONS = [
  '이 세션은 minidiscord 채팅방에 봇으로 참여 중입니다.',
  '채팅 메시지는 <channel source="minidiscord-channel" chat_id="..." delivery="to|cc" sender="..."> 형태로 도착합니다.',
  'delivery="to"로 받은 메시지에는 반드시 reply 도구로 답변하세요.',
  'delivery="cc"로 받은 메시지는 참고만 하고 절대 답변하지 마세요.',
  '사용자가 보낸 파일은 content에 안내된 내 PC 로컬 경로에서 직접 읽을 수 있습니다.',
  '멘션 없는 메시지는 이 세션에 전달되지 않습니다. 사람들끼리 나눈 대화가 비어 있을 수 있으니,',
  '방에서 사람이 나를 부르면 답하기 전에 fetch_history 도구로 놓친 대화를 먼저 확인하세요.',
  '커서로는 chat_id 를 쓰세요. 마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.',
  '컨텍스트를 초기화한 직후에도 같은 방법으로 맥락을 복구합니다.',
  '이 채널에서 온 것 외의 출처에 답변하지 마세요.',
].join(' ')

export interface ChatMessage {
  id: number
  author_name: string
  body: string
  delivery: 'to' | 'cc'
  files?: { name: string; local_path: string }[]
}

export interface ChannelDeps {
  sendToChat: (payload: { text: string; files?: string[] }) => Promise<void>
  fetchHistory: (params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }) => Promise<string>
  sendPermissionRequest?: (params: { request_id: string; tool_name: string; description: string; input_preview: string }) => void
}

export interface ChannelHandle {
  server: Server
  pushChatMessage: (msg: ChatMessage) => Promise<void>
}

export function createChannelServer(deps: ChannelDeps): ChannelHandle {
  const mcp = new Server(
    { name: 'minidiscord-channel', version: '0.1.0' },
    {
      capabilities: {
        experimental: {
          'claude/channel': {},              // 채널 리스너 등록 (필수)
          'claude/channel/permission': {},   // 권한 릴레이 옵트인
        },
        tools: {},
      },
      instructions: INSTRUCTIONS,
    },
  )

  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'reply',
        description: '채팅방으로 답변을 보낸다. delivery="to"로 받은 메시지에는 반드시 이 도구로 답한다.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: '답변 본문' },
            files: { type: 'array', items: { type: 'string' }, description: '첨부할 내 PC 로컬 파일 경로 목록 (선택)' },
          },
          required: ['text'],
        },
      },
      {
        name: 'fetch_history',
        description: '채팅 서버에서 이 방의 대화 기록을 가져온다. 멘션 없이 오간 대화를 따라잡거나 컨텍스트를 잃었을 때 맥락을 복구할 때 사용. 결과의 각 줄 앞에 붙는 #번호를 기억해 두면 다음에 since_id 로 그 다음부터만 받을 수 있다.',
        inputSchema: {
          type: 'object',
          properties: {
            since_id: { type: 'number', description: '이 메시지 번호 다음부터 (정확한 커서. 시각보다 이쪽을 쓴다)' },
            since: { type: 'string', description: '이후 (ISO 날짜)' },
            until: { type: 'string', description: '이전 (ISO 날짜)' },
            speaker: { type: 'string', description: '특정 발화자만' },
            limit: { type: 'number', description: '최대 개수 (기본 100)' },
          },
        },
      },
    ],
  }))

  mcp.setRequestHandler(CallToolRequestSchema, async req => {
    if (req.params.name === 'reply') {
      const { text, files } = req.params.arguments as { text: string; files?: string[] }
      await deps.sendToChat({ text, files })
      return { content: [{ type: 'text', text: 'sent' }] }
    }
    if (req.params.name === 'fetch_history') {
      const args = req.params.arguments as { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }
      const text = await deps.fetchHistory(args)
      return { content: [{ type: 'text', text }] }
    }
    throw new Error(`unknown tool: ${req.params.name}`)
  })

  async function pushChatMessage(msg: ChatMessage): Promise<void> {
    const fileNote = msg.files?.length ? `\n(첨부 파일 경로: ${msg.files.map(f => f.local_path).join(', ')})` : ''
    const content = `[${msg.author_name}] ${msg.body}${fileNote}`
    await mcp.notification({
      method: 'notifications/claude/channel',
      params: {
        content,
        meta: {
          chat_id: String(msg.id),
          delivery: msg.delivery,
          sender: msg.author_name,
        },
      },
    })
  }

  return { server: mcp, pushChatMessage }
}
```

`channel/src/index.ts` (이 태스크에서는 stdio 연결까지만; Task 12~13에서 게이트웨이와 연결한다):

```ts
// minidiscord-channel 진입점: MCP 서버를 stdio로 연결
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createChannelServer } from './channel-server.js'

const handle = createChannelServer({
  sendToChat: async () => {},       // Task 13에서 게이트웨이 연결
  fetchHistory: async () => '(게이트웨이 미연결)',
})
await handle.server.connect(new StdioServerTransport())
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -w channel`
Expected: PASS (4건)

- [ ] **Step 6: 커밋**

```bash
git add channel
git commit -m "feat: channel MCP server with reply/fetch_history tools"
```

---

### Task 12: 게이트웨이 클라이언트 (WebSocket + 재접속)

**Files:**
- Create: `channel/src/gateway-client.ts`, `channel/test/gateway-client.test.ts`

**Interfaces:**
- Consumes: 없음(독립)
- Produces: `createGatewayClient(opts): GatewayClient` where

```ts
interface GatewayClientOpts {
  url: string
  token: string
  onMessage?: (m: { type: 'message'; id: number; body: string; author_name: string; delivery: 'to' | 'cc'; files?: { name: string; local_path: string }[] }) => void
  onVerdict?: (v: { type: 'permission_verdict'; request_id: string; behavior: 'allow' | 'deny' }) => void
  onWelcome?: (w: { room_id: number; bot_id: number; bot_name: string }) => void
  sleep?: (ms: number) => Promise<void>   // 테스트 주입용
  maxBackoffMs?: number                    // 기본 30000
}
interface GatewayClient {
  start(): void
  stop(): void
  send(payload: object): boolean
  requestHistory(params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }): Promise<any>  // rid 매칭, 10초 타임아웃
}
```

- [ ] **Step 1: 실패하는 테스트 작성**

`channel/test/gateway-client.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import { createGatewayClient } from '../src/gateway-client.js'

function startServer(onHello: (ws: WebSocket, msg: any) => void) {
  const wss = new WebSocketServer({ port: 0 })
  const messages: any[] = []
  wss.on('connection', ws => {
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      messages.push(m)
      if (m.type === 'hello') onHello(ws, m)
    })
  })
  return { wss, messages, port: () => (wss.address() as any).port }
}

describe('gateway client', () => {
  it('sends hello and emits messages/verdicts', async () => {
    let sock: WebSocket | undefined
    const srv = startServer((ws) => { sock = ws })
    const got: any[] = []
    const client = createGatewayClient({
      url: `ws://127.0.0.1:${srv.port()}/bot`,
      token: 'tok123',
      onMessage: m => got.push(m),
      onVerdict: v => got.push(v),
    })
    client.start()
    await new Promise(r => setTimeout(r, 100))
    expect(srv.messages[0]).toEqual({ type: 'hello', token: 'tok123' })
    sock!.send(JSON.stringify({ type: 'message', id: 1, body: '안녕', author_name: 'a', delivery: 'to' }))
    sock!.send(JSON.stringify({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' }))
    await new Promise(r => setTimeout(r, 100))
    expect(got.map(g => g.type ?? 'message')).toContain('message')
    expect(got.find(g => g.request_id)?.behavior).toBe('allow')
    client.stop()
    srv.wss.close()
  })

  it('send() delivers payload to server', async () => {
    const srv = startServer(() => {})
    const client = createGatewayClient({ url: `ws://127.0.0.1:${srv.port()}/bot`, token: 't' })
    client.start()
    await new Promise(r => setTimeout(r, 100))
    expect(client.send({ type: 'bot_message', body: '답변' })).toBe(true)
    await new Promise(r => setTimeout(r, 100))
    expect(srv.messages.some(m => m.type === 'bot_message')).toBe(true)
    client.stop()
    srv.wss.close()
  })

  it('requestHistory matches rid and resolves', async () => {
    let sock: WebSocket | undefined
    const srv = startServer(ws => { sock = ws })
    const client = createGatewayClient({ url: `ws://127.0.0.1:${srv.port()}/bot`, token: 't' })
    client.start()
    await new Promise(r => setTimeout(r, 100))
    sock!.on('message', d => {
      const m = JSON.parse(String(d))
      if (m.type === 'history_request') sock!.send(JSON.stringify({ type: 'history_response', rid: m.rid, messages: [] }))
    })
    const res = await client.requestHistory({ limit: 3 })
    expect(res.messages).toEqual([])
    client.stop()
    srv.wss.close()
  })

  it('reconnects with injected sleep after server close', async () => {
    const sleeps: number[] = []
    let srv = startServer(() => {})
    const client = createGatewayClient({
      url: () => `ws://127.0.0.1:${srv.port()}/bot`,   // url은 함수도 허용(재접속 시 재평가)
      token: 't',
      sleep: async ms => { sleeps.push(ms); await new Promise(r => setTimeout(r, 5)) },
      maxBackoffMs: 400,
    })
    client.start()
    await new Promise(r => setTimeout(r, 100))
    srv.wss.close()   // 연결 끊김
    await new Promise(r => setTimeout(r, 50))
    // 새 서버가 같은 포트로 다시 뜨는 대신, 두 번째 서버를 새 포트에 띄워 url 함수가 교체된 것처럼 검증
    const srv2 = startServer(() => {})
    ;(client as any).opts.url = `ws://127.0.0.1:${srv2.port()}/bot`
    await new Promise(r => setTimeout(r, 300))
    expect(sleeps.length).toBeGreaterThanOrEqual(1)
    client.stop()
    srv2.wss.close()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w channel`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`channel/src/gateway-client.ts`:

```ts
// 게이트웨이 WebSocket 클라이언트: hello/welcome, 재접속 백오프, rid 매칭 (spec 4-B)
import WebSocket from 'ws'
import { randomUUID } from 'node:crypto'

type UrlRef = string | (() => string)

export interface GatewayClientOpts {
  url: UrlRef
  token: string
  onMessage?: (m: any) => void
  onVerdict?: (v: any) => void
  onWelcome?: (w: any) => void
  sleep?: (ms: number) => Promise<void>
  maxBackoffMs?: number
}

export interface GatewayClient {
  start(): void
  stop(): void
  send(payload: object): boolean
  requestHistory(params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }): Promise<any>
  opts: GatewayClientOpts   // 테스트가 url을 교체할 수 있게 노출
}

export function createGatewayClient(input: GatewayClientOpts): GatewayClient {
  const opts = { ...input }
  const sleep = opts.sleep ?? (ms: number) => new Promise<void>(r => setTimeout(r, ms))
  const maxBackoff = opts.maxBackoffMs ?? 30_000
  const pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>()

  let ws: WebSocket | null = null
  let stopped = false
  let backoff = 1000

  function url(): string { return typeof opts.url === 'function' ? opts.url() : opts.url }

  function connect(): void {
    if (stopped) return
    ws = new WebSocket(url())
    ws.on('open', () => {
      backoff = 1000
      ws!.send(JSON.stringify({ type: 'hello', token: opts.token }))
    })
    ws.on('message', data => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'welcome') opts.onWelcome?.(msg)
      else if (msg.type === 'message') opts.onMessage?.(msg)
      else if (msg.type === 'permission_verdict') opts.onVerdict?.(msg)
      else if (msg.type === 'history_response') {
        const p = pending.get(msg.rid)
        if (p) { clearTimeout(p.timer); pending.delete(msg.rid); p.resolve(msg) }
      }
    })
    ws.on('close', () => { ws = null; if (!stopped) void retry() })
    ws.on('error', () => { /* close 핸들러가 재접속 처리 */ })
  }

  async function retry(): Promise<void> {
    await sleep(backoff)
    backoff = Math.min(backoff * 2, maxBackoff)
    connect()
  }

  return {
    opts,
    start() { connect() },
    stop() { stopped = true; ws?.close() },
    send(payload) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify(payload))
      return true
    },
    requestHistory(params) {
      const rid = randomUUID()
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(rid); reject(new Error('history request timeout')) }, 10_000)
        pending.set(rid, { resolve, reject, timer })
        if (!this.send({ type: 'history_request', rid, ...params })) {
          clearTimeout(timer); pending.delete(rid); reject(new Error('gateway not connected'))
        }
      })
    },
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w channel`
Expected: PASS (4건)

- [ ] **Step 5: 커밋**

```bash
git add channel/src/gateway-client.ts channel/test/gateway-client.test.ts
git commit -m "feat: gateway websocket client with reconnect backoff"
```

---

### Task 13: 채널 연결 — index.ts 완성 (수신→세션, reply→게이트웨이, fetch_history, status)

채널 서버(Task 11)와 게이트웨이 클라이언트(Task 12)를 묶어 실행 가능한 `minidiscord-channel` 바이너리를 완성한다.

**Files:**
- Modify: `channel/src/index.ts` (전면 교체)
- Create: `channel/test/index-wiring.test.ts`

**Interfaces:**
- Consumes: `createChannelServer`(Task 11), `createGatewayClient`(Task 12)
- Produces: 실행 파일 `minidiscord-channel` (환경변수 `MINIDISCORD_TOKEN`, `MINIDISCORD_SERVER` 읽음). 내보내는 `wire(opts): { channel: ChannelHandle; gw: GatewayClient }` — 테스트와 Task 14가 재사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`channel/test/index-wiring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import { wire } from '../src/index.js'

function gatewayStub() {
  const wss = new WebSocketServer({ port: 0 })
  const sent: any[] = []
  wss.on('connection', ws => {
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      sent.push(m)
      if (m.type === 'hello') {
        ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))
      }
    })
  })
  return {
    wss, sent,
    port: () => (wss.address() as any).port,
    push: (msg: any) => { for (const c of wss.clients) c.send(JSON.stringify(msg)) },
  }
}

describe('wiring', () => {
  it('gateway message → session notification, reply → bot_message, working/idle status', async () => {
    const gw = gatewayStub()
    const { channel, gw: client } = wire({ url: `ws://127.0.0.1:${gw.port()}/bot`, token: 'tok' })
    client.start()
    await new Promise(r => setTimeout(r, 100))

    // MCP 클라이언트를 붙여 notification 관찰
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
    const obs = new Client({ name: 'obs', version: '0' })
    const [c, s] = InMemoryTransport.createLinkedPair()
    const notified: any[] = []
    obs.setNotificationHandler({ method: 'notifications/claude/channel' } as any, n => notified.push(n))
    await Promise.all([obs.connect(c), channel.server.connect(s)])

    // 1) 게이트웨이 message → notification (delivery to)
    gw.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
    await new Promise(r => setTimeout(r, 100))
    expect(notified.length).toBe(1)
    expect(notified[0].params.meta.delivery).toBe('to')

    // 2) reply 도구 → bot_message 전송 + status idle
    await obs.callTool({ name: 'reply', arguments: { text: '정리 완료', files: ['/tmp/r.md'] } })
    await new Promise(r => setTimeout(r, 100))
    const botMsg = gw.sent.find(m => m.type === 'bot_message')
    expect(botMsg.body).toBe('정리 완료')
    expect(botMsg.files).toEqual([{ local_path: '/tmp/r.md' }])
    expect(gw.sent.some(m => m.type === 'status' && m.state === 'working')).toBe(true)
    expect(gw.sent.some(m => m.type === 'status' && m.state === 'idle')).toBe(true)

    // 3) cc 메시지는 전달되지만 status working 없음
    const before = notified.length
    gw.push({ type: 'message', id: 10, body: '참고만', author_name: 'alice', delivery: 'cc' })
    await new Promise(r => setTimeout(r, 100))
    expect(notified.length).toBe(before + 1)

    client.stop()
    gw.wss.close()
  })

  it('fetch_history routes through gateway request', async () => {
    const gw = gatewayStub()
    const { channel, gw: client } = wire({ url: `ws://127.0.0.1:${gw.port()}/bot`, token: 'tok' })
    client.start()
    await new Promise(r => setTimeout(r, 100))
    // 게이트웨이가 history_request에 응답하는 흉내
    ;([...gw.wss.clients][0] as WebSocket).on('message', d => {
      const m = JSON.parse(String(d))
      if (m.type === 'history_request') {
        ;([...gw.wss.clients][0] as WebSocket).send(
          JSON.stringify({ type: 'history_response', rid: m.rid, messages: [{ id: 1, author_name: 'alice', body: '과거', created_at: '2026-08-01' }] }),
        )
      }
    })
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
    const obs = new Client({ name: 'obs', version: '0' })
    const [c, s] = InMemoryTransport.createLinkedPair()
    await Promise.all([obs.connect(c), channel.server.connect(s)])
    const res = await obs.callTool({ name: 'fetch_history', arguments: { limit: 1 } })
    expect((res.content as any[])[0].text).toContain('과거')
    // 봇이 다음 따라잡기에 쓸 커서를 읽을 수 있어야 한다
    expect((res.content as any[])[0].text).toContain('#1')
    client.stop()
    gw.wss.close()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w channel`
Expected: FAIL — `wire` 미수출

- [ ] **Step 3: 구현** — `channel/src/index.ts` 전면 교체

```ts
// minidiscord-channel: MCP 채널 서버 ↔ 게이트웨이 클라이언트 연결 (무상태, 환경변수 설정)
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createChannelServer, type ChatMessage } from './channel-server.js'
import { createGatewayClient, type GatewayClient } from './gateway-client.js'

export interface WireOpts {
  url: string
  token: string
}

export function wire(opts: WireOpts): { channel: ReturnType<typeof createChannelServer>; gw: GatewayClient } {
  const gw = createGatewayClient({
    url: opts.url,
    token: opts.token,
    onMessage: async msg => {
      if (msg.delivery === 'to') gw.send({ type: 'status', state: 'working' }) // "입력 중" 근사: TO push→working
      await channel.pushChatMessage(msg as ChatMessage)
    },
  })

  const channel = createChannelServer({
    sendToChat: async payload => {
      gw.send({
        type: 'bot_message',
        body: payload.text,
        files: (payload.files ?? []).map(p => ({ local_path: p })),
      })
      gw.send({ type: 'status', state: 'idle' }) // 답변 완료→idle 근사
    },
    fetchHistory: async params => {
      const res = await gw.requestHistory(params)
      const lines = (res.messages as any[]).map(m => `#${m.id} [${m.created_at}] ${m.author_name}: ${m.body}`)
      return lines.length > 0 ? lines.join('\n') : '(기록 없음)'
    },
  })

  return { channel, gw }
}

// 직접 실행될 때만 stdio 연결 (테스트 임포트 시 부작용 없음)
if (process.env.MINIDISCORD_TOKEN && process.argv[1]?.includes('index')) {
  const url = process.env.MINIDISCORD_SERVER ?? 'ws://127.0.0.1:3000/bot'
  const { channel, gw } = wire({ url, token: process.env.MINIDISCORD_TOKEN })
  gw.start()
  await channel.server.connect(new StdioServerTransport())
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w channel`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add channel
git commit -m "feat: wire channel server to gateway client"
```

---

### Task 14: 채널 권한 릴레이

Claude Code가 보내는 `notifications/claude/channel/permission_request`를 게이트웨이로 넘기고, 게이트웨이 verdict를 Claude Code로 되돌린다.

**Files:**
- Modify: `channel/src/channel-server.ts` (핸들러 등록)
- Modify: `channel/src/index.ts` (연결)
- Create: `channel/test/permission-relay.test.ts`

**Interfaces:**
- Consumes: Task 11의 `ChannelDeps`에 `sendPermissionRequest` 추가, `ChannelHandle`에 `handlePermissionVerdict` 추가
- Produces: 권한 릴레이 전체 경로 (Claude Code ↔ 채널 ↔ 게이트웨이 ↔ 방)

- [ ] **Step 1: 실패하는 테스트 작성**

`channel/test/permission-relay.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createChannelServer } from '../src/channel-server.js'

describe('permission relay', () => {
  it('verdict notification is sent back through the server when handlePermissionVerdict is called', async () => {
    const requests: any[] = []
    const handle = createChannelServer({
      sendToChat: async () => {},
      fetchHistory: async () => '',
      sendPermissionRequest: p => requests.push(p),
    })
    const client = new Client({ name: 't', version: '0' })
    const [c, s] = InMemoryTransport.createLinkedPair()
    await Promise.all([client.connect(c), handle.server.connect(s)])

    // Claude Code가 permission_request를 보내는 것을 시뮬레이션: 서버로 notification 전송
    await client.notification({
      method: 'notifications/claude/channel/permission_request',
      params: { request_id: 'abcde', tool_name: 'Bash', description: 'Run shell command', input_preview: 'ls -la' },
    } as any)
    await new Promise(r => setTimeout(r, 50))
    expect(requests).toEqual([{ request_id: 'abcde', tool_name: 'Bash', description: 'Run shell command', input_preview: 'ls -la' }])

    // verdict 회로: handlePermissionVerdict → Claude Code로 notification
    const verdicts: any[] = []
    client.setNotificationHandler({ method: 'notifications/claude/channel/permission' } as any, n => verdicts.push(n))
    handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
    await new Promise(r => setTimeout(r, 50))
    expect(verdicts[0].params).toEqual({ request_id: 'abcde', behavior: 'allow' })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -w channel`
Expected: FAIL — `handlePermissionVerdict` 없음

- [ ] **Step 3: 구현**

`channel/src/channel-server.ts`에 추가. (a) zod 임포트와 스키마, (b) 핸들러 등록, (c) `ChannelHandle` 확장:

```ts
import { z } from 'zod'
import type { Notification } from '@modelcontextprotocol/sdk/types.js'

// ...파일 상단 INSTRUCTIONS 아래에
const PermissionRequestSchema = z.object({
  method: z.literal('notifications/claude/channel/permission_request'),
  params: z.object({
    request_id: z.string(),
    tool_name: z.string(),
    description: z.string(),
    input_preview: z.string(),
  }),
})
```

`createChannelServer` 본문 마지막(`return` 전)에:

```ts
  mcp.setNotificationHandler(PermissionRequestSchema as any, ({ params }: z.infer<typeof PermissionRequestSchema>) => {
    deps.sendPermissionRequest?.(params)
  })

  function handlePermissionVerdict(v: { request_id: string; behavior: 'allow' | 'deny' }): void {
    void mcp.notification({
      method: 'notifications/claude/channel/permission',
      params: { request_id: v.request_id, behavior: v.behavior },
    })
  }

  return { server: mcp, pushChatMessage, handlePermissionVerdict }
```

`ChannelHandle` 인터페이스와 `ChannelDeps.sendPermissionRequest`에 대응하는 선언을 맞춘다(이 태스크 설계 블록 참고). `channel/src/index.ts`의 `wire`에 연결:

```ts
  const channel = createChannelServer({
    // ...기존 sendToChat/fetchHistory 그대로
    sendPermissionRequest: params => { gw.send({ type: 'permission_request', ...params }) },
  })
  gw.opts.onVerdict = v => { channel.handlePermissionVerdict({ request_id: v.request_id, behavior: v.behavior }) }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -w channel`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add channel
git commit -m "feat: channel permission relay wiring"
```

---

### Task 15: 웹 UI — 로그인과 방 목록

여기부터 UI 태스크다. 자동 테스트 대신 "서버 실행 + 수동 확인" 스텝으로 검증한다(정적 파일이므로). 매 태스크 끝에 서버를 띄워 확인하고 커밋한다.

**Files:**
- Create: `web/index.html`, `web/style.css`, `web/app.js`
- Modify: `server/src/index.ts` (정적 파일 서빙)

**Interfaces:**
- Consumes: Task 3~5의 API(`/api/auth/*`, `/api/rooms`, `/api/bots`)
- Produces: `web/app.js`의 전역 상태와 함수 — `api(path, opts)`(fetch 래퍼), `state = { rooms, bots, currentRoomId }`. Task 16~17이 이어서 확장한다.

- [ ] **Step 1: index.html 작성**

`web/index.html`:

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>minidiscord</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <!-- 로그인 뷰 -->
  <div id="auth-view">
    <h1>minidiscord</h1>
    <form id="login-form">
      <input id="login-username" placeholder="사용자 이름" autocomplete="username" required>
      <input id="login-password" type="password" placeholder="비밀번호" autocomplete="current-password" required>
      <button type="submit">로그인</button>
    </form>
    <form id="register-form">
      <input id="reg-username" placeholder="새 사용자 이름" autocomplete="username" required>
      <input id="reg-password" type="password" placeholder="비밀번호 (8자 이상)" autocomplete="new-password" required>
      <button type="submit">회원가입</button>
    </form>
    <p id="auth-error" class="error" hidden></p>
  </div>

  <!-- 메인 뷰 -->
  <div id="main-view" hidden>
    <aside id="sidebar">
      <div id="sidebar-top">
        <h2>방</h2>
        <button id="new-room-btn" class="small">+ 새 방</button>
      </div>
      <div id="room-list"></div>
      <details id="archived-box">
        <summary>보관된 방</summary>
        <div id="archived-list"></div>
      </details>
      <hr>
      <div id="sidebar-top">
        <h2>봇</h2>
        <button id="new-bot-btn" class="small">+ 봇 등록</button>
      </div>
      <div id="bot-list"></div>
    </aside>
    <main id="chat">
      <!-- Task 16에서 채움 -->
      <div id="placeholder">왼쪽에서 방을 선택하세요</div>
    </main>
  </div>

  <dialog id="prompt-dialog">
    <form id="prompt-form" method="dialog">
      <label id="prompt-label" for="prompt-input"></label>
      <input id="prompt-input" required>
      <menu><button value="cancel">취소</button><button id="prompt-ok" value="ok">확인</button></menu>
    </form>
  </dialog>

  <script src="/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: style.css 작성**

`web/style.css`:

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #313338; color: #dbdee1; }
.error { color: #fa776c; }
.small { font-size: 12px; padding: 2px 8px; }
#auth-view { max-width: 320px; margin: 15vh auto; display: flex; flex-direction: column; gap: 12px; }
#auth-view input { padding: 8px; border-radius: 6px; border: none; }
#auth-view button { padding: 8px; border: none; border-radius: 6px; background: #5865f2; color: white; cursor: pointer; }
#main-view { display: flex; height: 100vh; }
#sidebar { width: 240px; background: #2b2d31; padding: 12px; overflow-y: auto; }
#sidebar-top { display: flex; justify-content: space-between; align-items: center; }
#sidebar h2 { font-size: 12px; text-transform: uppercase; color: #949ba4; margin: 8px 0 4px; }
.room-item { padding: 6px 8px; border-radius: 6px; cursor: pointer; margin: 1px 0; }
.room-item:hover { background: #35373c; }
.room-item.active { background: #404249; }
.room-item .archive-btn { float: right; opacity: 0.4; cursor: pointer; border: none; background: none; color: inherit; }
#chat { flex: 1; display: flex; flex-direction: column; }
#placeholder { margin: auto; color: #949ba4; }
/* Task 16~17이 여기에 추가 */
```

- [ ] **Step 3: app.js — 인증/방/봇 부분 작성**

`web/app.js`:

```js
// minidiscord 웹 UI
const $ = id => document.getElementById(id)

const state = {
  rooms: { active: [], archived: [] },
  bots: [],
  currentRoomId: null,
  sse: null,
  workingBots: new Set(),   // "roomId:botId" → working 표시 (Task 16)
  staleTimers: {},          // "roomId:botId" → 응답 없음 타임아웃 타이머 (Task 16)
  staleBots: new Set(),     // "roomId:botId" → 5분 이상 응답 없음 (Task 16)
}

async function api(path, opts = {}) {
  if (opts.json !== false && opts.body && !(opts.body instanceof FormData)) {
    opts.headers = { 'content-type': 'application/json', ...(opts.headers ?? {}) }
    opts.body = JSON.stringify(opts.body)
  }
  const res = await fetch(path, { credentials: 'same-origin', ...opts })
  if (res.status === 401 && !path.includes('/auth/')) { showAuth(); throw new Error('로그인 필요') }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
}

function showAuth() { $('auth-view').hidden = false; $('main-view').hidden = true }
function showMain() { $('auth-view').hidden = true; $('main-view').hidden = false }

function promptText(label) {
  return new Promise(resolve => {
    $('prompt-label').textContent = label
    $('prompt-input').value = ''
    $('prompt-dialog').showModal()
    $('prompt-form').onsubmit = () => resolve($('prompt-dialog').returnValue === 'ok' ? $('prompt-input').value.trim() : null)
  })
}

async function loadRooms() {
  state.rooms = await api('/api/rooms')
  renderRooms()
}

async function loadBots() {
  state.bots = await api('/api/bots')
  renderBots()
}

function renderRooms() {
  const list = $('room-list')
  list.innerHTML = ''
  for (const r of state.rooms.active) {
    const el = document.createElement('div')
    el.className = 'room-item' + (r.id === state.currentRoomId ? ' active' : '')
    el.textContent = '# ' + r.name
    const arch = document.createElement('button')
    arch.className = 'archive-btn'
    arch.textContent = '📦'
    arch.title = '방 보관'
    arch.onclick = async e => {
      e.stopPropagation()
      if (confirm(`"${r.name}" 방을 보관할까요? 대화는 읽기 전용으로 남습니다.`)) {
        await api(`/api/rooms/${r.id}/archive`, { method: 'POST' })
        await loadRooms()
      }
    }
    el.appendChild(arch)
    el.onclick = () => openRoom(r.id)   // Task 16에서 구현, 그 전까지는 noop여도 됨
    list.appendChild(el)
  }
  const archList = $('archived-list')
  archList.innerHTML = ''
  for (const r of state.rooms.archived) {
    const el = document.createElement('div')
    el.className = 'room-item'
    el.textContent = '# ' + r.name + ' (보관)'
    el.onclick = () => openRoom(r.id)
    archList.appendChild(el)
  }
}

function renderBots() {
  const list = $('bot-list')
  list.innerHTML = ''
  for (const b of state.bots) {
    const el = document.createElement('div')
    el.className = 'room-item'
    el.textContent = '🤖 ' + b.name
    list.appendChild(el)
  }
}

$('login-form').onsubmit = async e => {
  e.preventDefault()
  try {
    await api('/api/auth/login', { method: 'POST', body: { username: $('login-username').value, password: $('login-password').value } })
    await enterMain()
  } catch (err) { $('auth-error').textContent = err.message; $('auth-error').hidden = false }
}
$('register-form').onsubmit = async e => {
  e.preventDefault()
  try {
    await api('/api/auth/register', { method: 'POST', body: { username: $('reg-username').value, password: $('reg-password').value } })
    await api('/api/auth/login', { method: 'POST', body: { username: $('reg-username').value, password: $('reg-password').value } })
    await enterMain()
  } catch (err) { $('auth-error').textContent = err.message; $('auth-error').hidden = false }
}
$('new-room-btn').onclick = async () => {
  const name = await promptText('새 방 이름 (프로젝트명)')
  if (name) { await api('/api/rooms', { method: 'POST', body: { name } }); await loadRooms() }
}
$('new-bot-btn').onclick = async () => {
  const name = await promptText('새 봇 이름 (예: pm, 코드리뷰어)')
  if (!name) return
  const desc = await promptText('봇 설명 (선택, Enter로 건너뛰기)') ?? ''
  await api('/api/bots', { method: 'POST', body: { name, description: desc } })
  await loadBots()
}

async function enterMain() {
  showMain()
  await Promise.all([loadRooms(), loadBots()])
}

;(async () => {
  try {
    await api('/api/rooms')  // 401이면 showAuth
    await enterMain()
  } catch { showAuth() }
})()

// Task 16에서 정의됨 (여기서는 선언만)
async function openRoom(id) { state.currentRoomId = id; renderRooms() }
```

- [ ] **Step 4: 서버에 정적 파일 서빙 추가**

`server/src/index.ts`의 `buildServer`에:

```ts
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
// ...
const webDir = process.env.MINIDISCORD_WEB_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '../../web')
await app.register(fastifyStatic, { root: webDir, prefix: '/' })
```

- [ ] **Step 5: 수동 확인**

Run: `npm run dev -w server` 후 브라우저 `http://localhost:3000`
Expected: 회원가입→로그인→방 생성(`# 프로젝트A` 표시)→방 보관(보관 목록 이동)→봇 등록까지 동작.

- [ ] **Step 6: 커밋**

```bash
git add web server/src/index.ts
git commit -m "feat: web UI with auth, rooms, bot registry"
```

---

### Task 16: 웹 UI — 채팅 화면, SSE 수신, @ 자동완성, 봇 상태

**Files:**
- Modify: `web/index.html` (채팅 영역), `web/app.js` (openRoom 구현), `web/style.css`

**Interfaces:**
- Consumes: `GET /api/rooms/:id/messages`, `GET /api/rooms/:id/events`(SSE), `GET /api/rooms/:id/invites`, Task 15의 `state`/`api`
- Produces: `openRoom(id)` 전체 구현, `renderMessage(msg)` — Task 17이 파일 표시로 확장.

- [ ] **Step 1: index.html 채팅 영역 교체** — `<main id="chat">` 내부의 placeholder를 교체:

```html
  <main id="chat">
    <header id="room-header">
      <h1 id="room-title"></h1>
      <div id="room-bots"></div>
      <button id="invite-btn" class="small">🤖 봇 초대</button>
    </header>
    <div id="messages"></div>
    <div id="composer">
      <div id="autocomplete" hidden></div>
      <textarea id="msg-input" rows="2" placeholder="메시지 입력… @를 치면 봇 자동완성"></textarea>
      <input type="file" id="file-input" multiple>
      <button id="send-btn">보내기</button>
    </div>
  </main>
```

- [ ] **Step 2: app.js에 채팅 로직 추가** — 파일 끝의 `openRoom` 임시 구현을 교체하고 아래 추가:

```js
async function openRoom(id) {
  if (state.sse) state.sse.close()
  state.currentRoomId = id
  renderRooms()
  const room = [...state.rooms.active, ...state.rooms.archived].find(r => r.id === id)
  $('room-title').textContent = '# ' + room?.name
  $('messages').innerHTML = ''
  const { messages } = await api(`/api/rooms/${id}/messages`)
  for (const m of messages) renderMessage(m)
  $('messages').scrollTop = $('messages').scrollHeight
  await refreshRoomBots()
  state.sse = new EventSource(`/api/rooms/${id}/events`)
  state.sse.addEventListener('message', e => {
    renderMessage(JSON.parse(e.data))
    $('messages').scrollTop = $('messages').scrollHeight
  })
  state.sse.addEventListener('bot_status', e => {
    const { bot_id, state: s } = JSON.parse(e.data)
    const key = `${id}:${bot_id}`
    if (s === 'working') {
      state.workingBots.add(key)
      clearTimeout(state.staleTimers?.[key])           // 응답 없음 타임아웃(spec 8장): 5분 경과 시 표시 변경
      state.staleTimers ??= {}
      state.staleTimers[key] = setTimeout(() => { state.staleBots?.add(key); refreshRoomBots() }, 5 * 60_000)
    } else {
      state.workingBots.delete(key)
      clearTimeout(state.staleTimers?.[key])
      state.staleBots?.delete(key)
    }
    refreshRoomBots()
  })
}

async function refreshRoomBots() {
  const id = state.currentRoomId
  if (!id) return
  const invites = await api(`/api/rooms/${id}/invites`)
  const box = $('room-bots')
  box.innerHTML = ''
  for (const inv of invites) {
    const el = document.createElement('span')
    const key = `${id}:${inv.bot_id}`
    const working = state.workingBots.has(key)
    const stale = state.staleBots?.has(key)
    el.className = 'bot-chip' + (inv.online ? '' : ' offline')
    el.textContent = (inv.online ? '🟢 ' : '⚪ ') + inv.bot_name
      + (stale ? ' (응답 없음?)' : working ? ' (입력 중…)' : '')
    box.appendChild(el)
  }
}

function renderMessage(m) {
  const el = document.createElement('div')
  el.className = 'message ' + m.author_type
  const head = document.createElement('div')
  head.className = 'msg-head'
  const name = document.createElement('strong')
  name.textContent = m.author_name
  const time = document.createElement('span')
  time.textContent = ' ' + (m.created_at ?? '')
  head.append(name, time)
  const body = document.createElement('div')
  body.className = 'msg-body'
  body.textContent = m.body
  el.append(head, body)
  // 파일 첨부 표시는 Task 17에서 추가
  $('messages').appendChild(el)
}

// 메시지 전송 (파일은 Task 17에서 FormData에 추가)
$('send-btn').onclick = () => sendMessage()
$('msg-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
})

async function sendMessage() {
  const id = state.currentRoomId
  if (!id) return
  const body = $('msg-input').value.trim()
  if (!body) return
  const form = new FormData()
  form.append('body', body)
  for (const f of $('file-input').files) form.append('files', f)
  $('file-input').value = ''
  $('msg-input').value = ''
  try {
    await api(`/api/rooms/${id}/messages`, { method: 'POST', body: form })
  } catch (err) {
    alert(err.message)
    $('msg-input').value = body  // 실패 시 복원
  }
}

// @ 자동완성: '@'로 시작하는 토큰 감지 → 그 방의 봇 목록 드롭다운
$('msg-input').addEventListener('input', () => {
  const input = $('msg-input')
  const upToCursor = input.value.slice(0, input.selectionStart)
  const m = /(^|\s)@([^\s(]*)$/.exec(upToCursor)
  if (!m || !state.currentRoomId) { $('autocomplete').hidden = true; return }
  const prefix = m[2].toLowerCase()
  api(`/api/rooms/${state.currentRoomId}/invites`).then(invites => {
    const hits = invites.filter(i => i.bot_name.toLowerCase().includes(prefix))
    if (hits.length === 0) { $('autocomplete').hidden = true; return }
    const box = $('autocomplete')
    box.innerHTML = ''
    box.hidden = false
    for (const h of hits) {
      for (const kind of ['TO', 'CC']) {
        const item = document.createElement('div')
        item.className = 'ac-item'
        item.textContent = `${kind}: ${h.bot_name}`
        item.onclick = () => {
          const before = input.value.slice(0, input.selectionStart)
          const after = input.value.slice(input.selectionStart)
          const replaced = before.replace(/@([^\s(]*)$/, `@${kind}(${h.bot_name}) `)
          input.value = replaced + after
          input.focus()
          const pos = replaced.length
          input.setSelectionRange(pos, pos)
          box.hidden = true
        }
        box.appendChild(item)
      }
    }
  })
})
```

- [ ] **Step 3: style.css 추가**

`web/style.css` 끝에:

```css
#room-header { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #1e1f22; }
#room-header h1 { font-size: 16px; margin: 0; }
.bot-chip { background: #2b2d31; border-radius: 12px; padding: 2px 10px; font-size: 12px; }
.bot-chip.offline { opacity: 0.5; }
#messages { flex: 1; overflow-y: auto; padding: 16px; }
.message { margin-bottom: 10px; }
.msg-head { font-size: 12px; color: #949ba4; }
.message.bot .msg-head strong { color: #57f287; }
.message.system .msg-body { color: #fee75c; font-size: 13px; white-space: pre-wrap; }
.msg-body { white-space: pre-wrap; }
#composer { position: relative; display: flex; gap: 8px; padding: 12px; }
#msg-input { flex: 1; resize: none; border-radius: 8px; border: none; padding: 10px; font: inherit; background: #383a40; color: inherit; }
#send-btn { border: none; border-radius: 8px; background: #5865f2; color: white; cursor: pointer; padding: 0 16px; }
#autocomplete { position: absolute; bottom: 100%; left: 12px; background: #2b2d31; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.4); z-index: 10; }
.ac-item { padding: 6px 14px; cursor: pointer; font-size: 13px; }
.ac-item:hover { background: #404249; }
```

- [ ] **Step 4: 수동 확인**

서버 실행 → 두 브라우저 창에서 같은 방 접속 → 한쪽에서 메시지 보내면 양쪽 모두 실시간 표시(SSE). `@` 입력 시 그 방의 봇 자동완성 동작. 봇 초대 후 (채널 없이) 오프라인 표시 확인.

- [ ] **Step 5: 커밋**

```bash
git add web
git commit -m "feat: chat view with SSE, autocomplete, bot status"
```

---

### Task 17: 웹 UI — 파일 첨부 표시, 봇 초대 모달, 권한 승인 버튼

**Files:**
- Modify: `web/index.html` (초대 다이얼로그), `web/app.js`, `web/style.css`

**Interfaces:**
- Consumes: `POST /api/rooms/:id/invites`(Task 5), `GET /api/attachments/:id`(Task 9), `renderMessage`(Task 16)
- Produces: 완성된 UI (spec 4-C 전체).

- [ ] **Step 1: index.html에 초대 다이얼로그 추가** — `</body>` 앞:

```html
  <dialog id="invite-dialog">
    <h3>봇 초대</h3>
    <div id="invite-bot-choices"></div>
    <div id="invite-result" hidden>
      <p>아래 명령으로 세션을 띄우세요 (원하는 페르소나 디렉터리에서):</p>
      <pre id="invite-command"></pre>
      <button id="copy-command" class="small">명령 복사</button>
      <p class="error">⚠️ 토큰은 다시 표시되지 않습니다. 지금 복사하세요.</p>
      <form method="dialog"><button>닫기</button></form>
    </div>
  </dialog>
```

- [ ] **Step 2: app.js에 초대·파일·권한 로직 추가**

```js
// 봇 초대
$('invite-btn').onclick = async () => {
  const id = state.currentRoomId
  if (!id) return
  const box = $('invite-bot-choices')
  box.innerHTML = ''
  $('invite-result').hidden = true
  for (const b of state.bots) {
    const btn = document.createElement('button')
    btn.textContent = `🤖 ${b.name} 초대`
    btn.onclick = async () => {
      const res = await api(`/api/rooms/${id}/invites`, { method: 'POST', body: { bot_id: b.id } })
      $('invite-command').textContent = res.command
      $('invite-result').hidden = false
      await refreshRoomBots()
    }
    box.appendChild(btn)
  }
  $('invite-dialog').showModal()
}
$('copy-command').onclick = () => navigator.clipboard.writeText($('invite-command').textContent)

// renderMessage의 "// 파일 첨부 표시는 Task 17에서 추가" 줄을 아래로 교체:
// (renderMessage 안 el.append(head, body) 뒤에)
//   const files = m.attachments ?? []
//   for (const f of files) {
//     const a = document.createElement('a')
//     a.href = `/api/attachments/${f.id}`
//     a.textContent = '📄 ' + f.filename
//     a.className = 'attachment'
//     el.appendChild(a)
//   }
// 권한 요청 system 메시지에는 승인/거절 버튼 추가:
//   if (m.author_type === 'system' && m.body.includes('yes ')) {
//     const rid = /[a-km-z]{5}/.exec(m.body)?.[0]
//     const row = document.createElement('div')
//     const yes = document.createElement('button'); yes.textContent = '승인'
//     const no = document.createElement('button'); no.textContent = '거절'
//     yes.onclick = () => api(`/api/rooms/${m.room_id}/messages`, { method: 'POST', body: new FormData([['body', `yes ${rid}`]]) })
//     no.onclick = () => api(`/api/rooms/${m.room_id}/messages`, { method: 'POST', body: new FormData([['body', `no ${rid}`]]) })
//     row.append(yes, no)
//     el.appendChild(row)
//   }
```

위 주석 블록은 `renderMessage`로 실제 반영한다(주석이 아니라 코드로 넣는다 — 실행자는 Task 16의 `renderMessage`를 다음 완성본으로 교체한다):

```js
function renderMessage(m) {
  const el = document.createElement('div')
  el.className = 'message ' + m.author_type
  const head = document.createElement('div')
  head.className = 'msg-head'
  const name = document.createElement('strong')
  name.textContent = m.author_name
  const time = document.createElement('span')
  time.textContent = ' ' + (m.created_at ?? '')
  head.append(name, time)
  const body = document.createElement('div')
  body.className = 'msg-body'
  body.textContent = m.body
  el.append(head, body)
  for (const f of m.attachments ?? []) {
    const a = document.createElement('a')
    a.href = `/api/attachments/${f.id}`
    a.textContent = '📄 ' + f.filename
    a.className = 'attachment'
    el.appendChild(a)
  }
  if (m.author_type === 'system' && /\byes [a-km-z]{5}/.test(m.body)) {
    const rid = /[a-km-z]{5}/.exec(m.body)?.[0]
    const row = document.createElement('div')
    const yes = document.createElement('button'); yes.textContent = '승인'
    const no = document.createElement('button'); no.textContent = '거절'
    const reply = word => {
      const form = new FormData(); form.append('body', `${word} ${rid}`)
      api(`/api/rooms/${m.room_id}/messages`, { method: 'POST', body: form })
      yes.disabled = no.disabled = true
    }
    yes.onclick = () => reply('yes')
    no.onclick = () => reply('no')
    row.append(yes, no)
    el.appendChild(row)
  }
  $('messages').appendChild(el)
}
```

`web/style.css` 끝에:

```css
.attachment { display: inline-block; margin: 4px 8px 0 0; background: #2b2d31; padding: 4px 10px; border-radius: 6px; font-size: 13px; color: #00a8fc; text-decoration: none; }
#invite-bot-choices { display: flex; flex-direction: column; gap: 6px; }
#invite-bot-choices button { padding: 8px; border: none; border-radius: 6px; background: #4e5058; color: inherit; cursor: pointer; text-align: left; }
#invite-command { background: #1e1f22; padding: 10px; border-radius: 6px; max-width: 480px; white-space: pre-wrap; font-size: 12px; }
```

- [ ] **Step 3: 수동 확인**

파일 첨부해서 전송 → 메시지에 📄 링크 → 클릭 시 다운로드. 봇 초대 → 명령 안내 표시·복사. Task 19(E2E)에서 권한 승인 버튼은 자동 검증된다.

- [ ] **Step 4: 커밋**

```bash
git add web
git commit -m "feat: invite modal, attachments, permission buttons"
```

---

### Task 18: E2E 시나리오와 재시작 영속성

실제 서버 프로세스를 띄우고 가짜 채널(WebSocket 클라이언트)로 전체 흐름을 자동 검증한다. API 비용 0원(Claude 없음).

**Files:**
- Create: `scripts/e2e.mjs`
- Modify: 루트 `package.json` (`"e2e": "node scripts/e2e.mjs"` 스크립트)

**Interfaces:**
- Consumes: 지금까지의 모든 서버 API와 게이트웨이 프로토콜
- Produces: `npm run e2e` — 전 시나리오 PASS/FAIL.

- [ ] **Step 1: E2E 스크립트 작성**

`scripts/e2e.mjs`:

```js
// E2E: 서버 프로세스 + 가짜 채널로 전체 흐름 검증 (Claude/API 비용 없음)
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'

const PORT = 3999
const BASE = `http://127.0.0.1:${PORT}`
const dataDir = mkdtempSync(join(tmpdir(), 'md-e2e-'))
let cookie = ''
let server

function assert(cond, msg) { if (!cond) { console.error('❌ FAIL:', msg); cleanup(1) } else console.log('✅', msg) }

async function api(path, opts = {}) {
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers = { 'content-type': 'application/json', ...(opts.headers ?? {}) }
    opts.body = JSON.stringify(opts.body)
  }
  if (cookie) opts.headers = { cookie, ...(opts.headers ?? {}) }
  const res = await fetch(BASE + path, { ...opts })
  const setC = res.headers.get('set-cookie')
  if (setC) cookie = setC.split(';')[0]
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn('npx', ['tsx', 'server/src/index.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, MINIDISCORD_PORT: String(PORT), MINIDISCORD_DATA_DIR: dataDir },
      stdio: 'ignore',
    })
    server.on('error', reject)
    const t = setInterval(async () => {
      try { const r = await fetch(`${BASE}/api/health`); if (r.ok) { clearInterval(t); resolve() } } catch {}
    }, 200)
  })
}

async function waitForMessage(ws, pred, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeoutMs)
    ws.on('message', function h(d) {
      const m = JSON.parse(String(d))
      if (pred(m)) { clearTimeout(t); ws.off('message', h); resolve(m) }
    })
  })
}

async function main() {
  await startServer()
  console.log('--- 시나리오 시작 ---')

  // 1. 회원가입/로그인
  await api('/api/auth/register', { method: 'POST', body: { username: 'e2e', password: 'pw123456' } })
  const login = await api('/api/auth/login', { method: 'POST', body: { username: 'e2e', password: 'pw123456' } })
  assert(login.status === 200, '로그인')

  // 2. 방 생성 + 봇 등록 + 초대
  const room = (await api('/api/rooms', { method: 'POST', body: { name: 'E2E 프로젝트' } })).data
  const bot = (await api('/api/bots', { method: 'POST', body: { name: 'pm', description: '테스트' } })).data
  const invite = (await api(`/api/rooms/${room.id}/invites`, { method: 'POST', body: { bot_id: bot.id } })).data
  assert(invite.token?.length === 64, '봇 초대 → 토큰 발급')

  // 3. 가짜 채널 접속
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/bot`)
  await new Promise(r => ws.on('open', r))
  ws.send(JSON.stringify({ type: 'hello', token: invite.token }))
  const welcome = await waitForMessage(ws, m => m.type === 'welcome')
  assert(welcome.bot_name === 'pm', '게이트웨이 welcome')

  // 4. 사용자 @TO 메시지 → 채널 수신 (delivery to)
  const form = new FormData(); form.append('body', '@TO(pm) 일정 정리해줘')
  const sent = await api(`/api/rooms/${room.id}/messages`, { method: 'POST', body: form })
  assert(sent.status === 200, '메시지 전송')
  const got = await waitForMessage(ws, m => m.type === 'message' && m.id === sent.data.message.id)
  assert(got.delivery === 'to' && got.body.includes('일정'), '@TO 라우팅 → 채널 수신')

  // 5. 봇 답변 (파일 첨부) → 메시지 목록에 저장
  const srcPath = join(dataDir, 'result.md')
  writeFileSync(srcPath, '# 완료')
  ws.send(JSON.stringify({ type: 'bot_message', body: '정리 완료', files: [{ local_path: srcPath, name: '결과.md' }] }))
  await new Promise(r => setTimeout(r, 500))
  const list = await api(`/api/rooms/${room.id}/messages`)
  const botMsg = list.data.messages.find(m => m.author_name === 'pm')
  assert(botMsg?.attachments?.length === 1, '봇 답변 + 파일 첨부 저장')

  // 6. 다운로드
  const dl = await fetch(`${BASE}/api/attachments/${botMsg.attachments[0].id}`, { headers: { cookie } })
  assert((await dl.text()).includes('완료'), '첨부 다운로드')

  // 7. @CC는 전달되지만 다른 봇 없는 CC는 무시됨(이 방엔 봇 1개) — TO 없는 메시지는 전달 안 됨
  const plain = new FormData(); plain.append('body', '봇 없는 메모')
  const p2 = await api(`/api/rooms/${room.id}/messages`, { method: 'POST', body: plain })
  ws.send(JSON.stringify({ type: 'status', state: 'idle' })) // 프로토콜 동작 확인
  assert(p2.status === 200, '멘션 없는 메시지 저장(봇 전달 없음)')

  // 8. history_request — 전체 조회와 since_id 커서 조회
  ws.send(JSON.stringify({ type: 'history_request', rid: 'h1', limit: 10 }))
  const hist = await waitForMessage(ws, m => m.type === 'history_response' && m.rid === 'h1')
  assert(hist.messages.length >= 2, 'history 요청 응답')

  // 멘션 없이 저장된 '봇 없는 메모'(7번)가 기록에는 남아 있어야 한다 — 따라잡기의 근거
  assert(hist.messages.some((m: any) => m.body === '봇 없는 메모'), '멘션 없는 메시지도 기록에는 남음')

  const cursor = hist.messages[0].id
  ws.send(JSON.stringify({ type: 'history_request', rid: 'h2', since_id: cursor, limit: 10 }))
  const after = await waitForMessage(ws, m => m.type === 'history_response' && m.rid === 'h2')
  assert(after.messages.every((m: any) => m.id > cursor), 'since_id 이후만 반환')

  // 9. 권한 릴레이
  ws.send(JSON.stringify({ type: 'permission_request', request_id: 'xqwer', tool_name: 'Bash', description: '테스트 명령', input_preview: 'echo hi' }))
  await new Promise(r => setTimeout(r, 300))
  const afterReq = await api(`/api/rooms/${room.id}/messages`)
  assert(afterReq.data.messages.some(m => m.body.includes('xqwer')), '권한 요청 → system 메시지')
  const verdictForm = new FormData(); verdictForm.append('body', 'yes xqwer')
  const v = await api(`/api/rooms/${room.id}/messages`, { method: 'POST', body: verdictForm })
  assert(v.data.consumed_by === 'permission', 'yes 답변이 verdict로 소비됨')
  const verdict = await waitForMessage(ws, m => m.type === 'permission_verdict' && m.request_id === 'xqwer')
  assert(verdict.behavior === 'allow', '채널이 verdict 수신')

  // 10. 커서 재전송: 재접속하면 놓친 TO 메시지 다시 받기
  ws.close()
  await new Promise(r => setTimeout(r, 200))
  const form2 = new FormData(); form2.append('body', '오프라인 중 @TO(pm) 에 온 메시지')
  const offline = await api(`/api/rooms/${room.id}/messages`, { method: 'POST', body: form2 })
  const ws2 = new WebSocket(`ws://127.0.0.1:${PORT}/bot`)
  await new Promise(r => ws2.on('open', r))
  ws2.send(JSON.stringify({ type: 'hello', token: invite.token }))
  const replay = await waitForMessage(ws2, m => m.type === 'message' && m.id === offline.data.message.id)
  assert(replay.body.includes('오프라인'), '재접속 시 놓친 메시지 재전송')
  ws2.close()

  // 11. 서버 재시작 → 영속성
  server.kill()
  await new Promise(r => setTimeout(r, 500))
  await startServer()
  const after = await api(`/api/rooms/${room.id}/messages`)
  assert(after.data.messages.length === list.data.messages.length + 2, '재시작 후 대화 보존') // 권한 2건 system 추가됨
  const ws3 = new WebSocket(`ws://127.0.0.1:${PORT}/bot`)
  await new Promise(r => ws3.on('open', r))
  ws3.send(JSON.stringify({ type: 'hello', token: invite.token }))
  const w3 = await waitForMessage(ws3, m => m.type === 'welcome')
  assert(w3.bot_name === 'pm', '재시작 후 토큰으로 재접속')
  ws3.close()

  // 12. 방 보관 → 토큰 무효
  await api(`/api/rooms/${room.id}/archive`, { method: 'POST' })
  await new Promise(r => setTimeout(r, 200))
  const ws4 = new WebSocket(`ws://127.0.0.1:${PORT}/bot`)
  await new Promise(r => ws4.on('open', r))
  ws4.send(JSON.stringify({ type: 'hello', token: invite.token }))
  const closed = await new Promise(r => ws4.on('close', () => r(true)))
  assert(closed, '보관 후 토큰 거부')

  console.log('--- 전체 통과 ---')
  cleanup(0)
}

function cleanup(code) {
  server?.kill()
  setTimeout(() => { rmSync(dataDir, { recursive: true, force: true }); process.exit(code) }, 300)
}

main().catch(e => { console.error('❌ 오류:', e); cleanup(1) })
```

루트 `package.json`의 scripts에 추가:

```json
"e2e": "node scripts/e2e.mjs"
```

`ws`는 루트에서 접근해야 하므로 루트에도 설치:

```bash
npm install ws
```

- [ ] **Step 2: 실행**

Run: `npm run e2e`
Expected: 모든 ✅ 라인 출력 후 `--- 전체 통과 ---`

- [ ] **Step 3: 커밋**

```bash
git add scripts package.json package-lock.json
git commit -m "test: e2e scenario covering routing, files, permissions, restart"
```

---

### Task 19: README와 실세션 수동 검증

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: 전체 시스템
- Produces: 운영 문서. 수동 체크리스트는 실제 Claude 세션 1개로 spec의 성공 기준을 최종 확인한다.

- [ ] **Step 1: README 작성**

```markdown
# minidiscord

내 PC에서 도는 자체 호스팅 채팅 서버 + Claude Code 봇 연동. 디스코드를 쓸 수 없는 환경에서
클로드코드 세션을 봇으로 대화하기 위한 시스템이다. 설계 문서는 design-superpowers 레포의
`designs/2026-08-26-minidiscord/spec.md`를 참고한다.

## 시작하기

### 서버 (내 PC)

```bash
npm install
npm run dev -w server        # 기본 :3000, 데이터는 ./data
```

환경변수: `MINIDISCORD_PORT`, `MINIDISCORD_DATA_DIR`.

### 채널 등록 (최초 1회)

```bash
npm run build -w channel
npm link                     # minidiscord-channel 명령을 PATH에 노출
claude mcp add --scope user minidiscord-channel -- minidiscord-channel
```

### 봇 초대와 세션 실행

1. 웹 UI에서 방을 만들고 봇을 등록한다.
2. 방에서 "봇 초대" → 봇 선택 → 안내 명령을 복사한다.
3. 원하는 페르소나 디렉터리(그 봇의 CLAUDE.md가 있는 곳)에서 복사한 명령을 실행한다:

```bash
export MINIDISCORD_TOKEN=<토큰>
export MINIDISCORD_SERVER=ws://127.0.0.1:3000/bot
claude --dangerously-load-development-channels server:minidiscord-channel
```

4. 웹 UI에서 봇이 🟢로 바뀌면 접속 완료. `@TO(봇이름)`으로 말을 걸면 답변이 온다.

## 사용 규칙

- `@TO(봇)` — 그 봇에게 직접 전달, 답변 의무. `@CC(봇)` — 전달만, 답변 금지. 멘션 없으면 봇 전달 없음.
- 봇이 도구 승인을 요구하면 방에 🔒 메시지가 뜬다. `yes <ID>` / `no <ID>` 또는 버튼으로 승인/거절.
- 프로젝트가 끝나면 방을 보관(📦)한다. 대화·파일은 읽기 전용으로 남는다.
- 봇의 기억은 방마다 리셋된다. 이전 맥락이 필요하면 봇에게 "이전 대화 기록 가져와"라고 요청하면
  fetch_history 도구로 복구한다. 멘션 없이 오간 대화도 같은 도구로 따라잡는다 — since_id 에
  마지막으로 본 chat_id 를 넘기면 그 다음부터만 온다.

## 주의사항

- Channels는 research preview다. `--dangerously-load-development-channels` 플래그가 필요하며
  Claude Code 버전에 따라 문법이 바뀔 수 있다.
- HTTP 평문 통신이므로 공용망에서 내용이 노출될 수 있다. 필요 시 리버스 프록시로 HTTPS를 붙인다.
- 채널은 무상태다. 토큰·서버 주소는 환경변수로만 전달한다.

## 테스트

```bash
npm test -w server && npm test -w channel && npm run e2e
```
```

- [ ] **Step 2: 실세션 수동 체크리스트** (API 비용 최소화 — 세션 1개, 짧은 대화)

```bash
# 1. 서버 기동
npm run dev -w server
# 2. 웹 UI에서: 회원가입 → 방 생성 → 봇 등록(pm) → 초대 → 명령 복사
# 3. 임시 디렉터리에서 세션 실행 (복사한 명령)
# 4. 확인 항목:
#   [ ] 웹 UI에서 봇 🟢 표시
#   [ ] "@TO(pm) 안녕, 한 줄로 자기소개해줘" → 봇 답변 도착
#   [ ] 답변 중 "입력 중…" 표시
#   [ ] "@CC(pm) 참고만 해줘" → 응답 없음
#   [ ] 멘션 없는 메시지 → 봇 반응 없음
#   [ ] 파일 첨부 업로드 → 봇이 내용 언급 가능 ("방금 올린 파일 뭐라고 써있어?")
#   [ ] 봇에게 "파일 만들어서 첨부해줘" → 📄 첨부 → 다운로드
#   [ ] 터미널 세션에서 /clear → 봇에게 "fetch_history로 아까 대화 확인하고 마지막 주제 말해줘" → 복구됨
#   [ ] 멘션 없이 두 줄 대화 → 그다음 @TO 로 봇 호출 → 봇이 fetch_history 로 그 두 줄을 읽고 답함
#   [ ] 봇이 도구 승인 요구하는 작업 시도(예: 파일 쓰기) → 방에 🔒 표시 → yes → 진행
#   [ ] 서버 재시작 후 방 접속 → 대화 그대로
#   [ ] 방 보관 → 봇 ⚪ 및 접속 거부
```

- [ ] **Step 3: 커밋**

```bash
git add README.md
git commit -m "docs: README with setup, usage rules, manual checklist"
```

---

## 계획 자기 검토 결과

- **spec 커버리지**: 성공 기준 6개 ↔ Task 9(방/대화), 18(영속성), 9/13(파일 양방향), 8(다중 봇 게이트웨이), 9/16(@TO/@CC UI), 13(fetch_history). 요구사항 표의 각 항목은 Task 3~17에 분포. 범위 밖 항목(페르소나 디렉터리, 봇 간 세션 통신, 스트리밍, HTTPS, 핸드오프 이월)은 태스크에 없음 — 의도된 것이다.
- **알려진 절충**: `authorName`/`displayName` 로직이 gateway.ts와 routes-messages.ts에 중복(순환 참조 회피), "입력 중" 상태는 message push→working / reply→idle 근사값.
- **타입 일관성**: `Gateway.deliver/sendToBot/closeRoom/isOnline/setPermissionHandler`, `SseHub.publish/subscribe`, `parseMentions` 반환형 `{ bot, delivery }`, `ChannelDeps.sendToChat/fetchHistory/sendPermissionRequest`가 태스크 간 동일하게 사용됨을 확인했다. `fetchHistory`/`requestHistory`/`history_request`/도구 스키마 네 곳의 파라미터가 `{ since_id?, since?, until?, speaker?, limit? }` 로 같다.
- **나중에 추가된 것 — `since_id` 커서 (2026-08-26)**: 봇 하네스 설계(`designs/2026-08-26-mfg-bot-harness/spec.md` §7-9)가 "멘션 없이 오간 대화를 봇이 스스로 따라잡는다" 는 규칙을 두면서, `fetch_history` 가 시각(`since`)만 받고 이력 문자열에 메시지 번호가 없어 정확한 커서를 만들 수 없다는 문제가 드러났다. 그래서 `since_id`(그 번호 다음부터)를 더하고, 이력 줄 형식을 `#<번호> [시각] 작성자: 본문` 으로 바꿨다. 번호는 이미 `missed_after_id` 가 쓰는 커서 원시어라 새 개념을 들이지 않는다. 영향 범위는 Task 8(서버 필터·테스트), Task 11(도구 스키마·지시문·테스트), Task 12~13(클라이언트 시그니처·줄 형식·테스트), Task 18(E2E)이다.


---

---
