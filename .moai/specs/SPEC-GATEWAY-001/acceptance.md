# SPEC-GATEWAY-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 워크스페이스 루트에서 실행한다. 새 테스트는 전부 `server/test/gateway.test.ts` 의 `describe('gateway', …)` 안에 둔다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** `.moai/plan/2026-08-26-minidiscord/` 안의 `plan.md`·`spec.md` 는 초기 커밋(`edd982e`)에 담긴 **폐기된 v1** 이며 이 SPEC 의 참조 대상이 아니다 — 파일 이름이 비슷해 혼동하기 쉬우므로 여기 못 박아 둔다.

이 SPEC 은 `SPEC-CORE-001` · `SPEC-BOT-001` · `SPEC-MENTION-001` · `SPEC-SSE-001` 이 먼저 끝난 상태를 전제한다. 특히 `app.hub` 가 없으면 AC-GW-007·009 는 준비 단계에서 실패한다.

## 판정 규약 (모든 기준에 공통)

**1. 테스트 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다 — 요약 줄로도 종료 코드로도 두 경우를 가를 수 없다. 그래서 모든 기준의 명령은

```bash
npm test -w server -- --reporter=verbose
```

이고, 1차 관측 대상은 `✓ test/gateway.test.ts > gateway > <그 기준의 테스트 이름>` 줄이 출력에 **실제로 나타나는가** 다. 그 줄이 없으면 그 기준은 **실패**다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다. (`SPEC-BOT-001` v0.4.0 교정에서 확인된 결함 부류다.)

**2. 각 기준의 단언은 "구현이 비어 있으면 반드시 깨지도록" 쓴다.** 아래 모든 테스트 본문은 다음 세 가지 중 하나 이상을 반드시 포함한다.

- **대조군(control)** — 같은 테스트 안에서 조건을 뺀 요청도 함께 보내, 관측된 차이가 그 조건 때문임을 보인다 (AC-GW-012 의 `since_id` 없는 요청이 대표 사례)
- **부정 관측** — 오지 **말아야** 할 메시지가 오지 않음을 `expectNoMessage` 로 관측한다 (AC-GW-004·005·015)
- **분별(discrimination)** — 서로 다른 입력이 서로 다른 결과를 내는지 한 테스트 안에서 대조한다 (AC-GW-001 의 두 토큰, AC-GW-006 의 `to`/`cc`, AC-GW-016 의 두 방)

"파일이 있다", "함수가 export 됐다", "테스트 스위트가 통과한다" 만으로 이루어진 기준은 이 SPEC 에 하나도 없다.

**3. 기준 SHA 가 없으면 범위 경계 기준(AC-GW-019)은 통과가 아니라 실패다.** `git rev-parse --verify` 로 기준 SHA 가 실제 커밋으로 풀리는지 **종료 코드 `0`** 으로 먼저 확인하고, 그 뒤에만 `git diff` 로 넘어간다. 기준 SHA 가 없을 때도 `git diff` 의 표준 출력은 비어 있어서, "출력이 비어 있음"만 보면 조용히 통과해 버린다.

---

## 공통 테스트 하네스

아래 모든 시나리오가 이 하네스를 쓴다. `gateway.test.ts` 상단에 한 번만 둔다.

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes } from '../src/auth.js'
import { sha256Hex } from '../src/routes-bots.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
  mkdirSync(join(dir, 'up'), { recursive: true })
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// hub.publish 를 감싸 발행 내역을 기록한다. SseHub 가 publish 를 속성으로 갖는
// 평범한 객체라는 SPEC-SSE-001 의 계약에 의존한다 (plan.md §D 4번).
async function build() {
  const app = Fastify()
  app.db = db
  await app.register(cookie)
  const hub = createSseHub()
  const published: { roomId: number; event: string; data: any }[] = []
  const orig = hub.publish.bind(hub)
  hub.publish = (roomId: number, event: string, data: any) => {
    published.push({ roomId, event, data })
    orig(roomId, event, data)
  }
  app.decorate('hub', hub)
  registerAuthRoutes(app, db)
  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
  app.decorate('gateway', gateway)
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  return { app, hub, published, gateway, port }
}

function seedRoom(name = 'A'): number {
  return db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name).lastInsertRowid as number
}
function seedBot(name = 'pm'): number {
  return db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(name).lastInsertRowid as number
}
function invite(roomId: number, botId: number): string {
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(token))
  return token
}
function cursorOf(roomId: number, botId: number): number {
  return (db.prepare('SELECT last_delivered_id v FROM bot_tokens WHERE room_id=? AND bot_id=?')
    .get(roomId, botId) as { v: number }).v
}

// 접속 시점부터 프레임을 큐에 쌓는다. handleHello 는 welcome 과 재전송 message 를
// 같은 동기 블록에서 연속으로 보내고, 루프백에서 두 프레임은 한 TCP 세그먼트로 합쳐져
// 같은 스택에서 연속 emit 되기 쉽다. 테스트가 await 이후에 리스너를 붙이는 구조라면
// 그 사이(마이크로태스크 경계)에 지나간 재전송 프레임을 놓친다 — 구현이 옳아도
// 간헐적으로 실패하는, 진단이 가장 비싼 형태다. 큐가 그 경계를 없앤다.
type Inbox = { queue: any[]; waiters: { resolve: (m: any) => void; timer: NodeJS.Timeout }[] }
const inboxes = new WeakMap<WebSocket, Inbox>()

function wsConnect(port: number, token: string): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    const inbox: Inbox = { queue: [], waiters: [] }
    inboxes.set(ws, inbox)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', data => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'welcome') { resolve({ ws, welcome: msg }); return }
      const w = inbox.waiters.shift()
      if (w) { clearTimeout(w.timer); w.resolve(msg) } else inbox.queue.push(msg)
    })
    ws.on('error', reject)
    ws.on('close', () => reject(new Error('closed before welcome')))   // 이미 settle 됐으면 무해하다
  })
}

// 큐에 이미 들어온 것이 있으면 그것을 먼저 돌려준다.
function nextMessage(ws: WebSocket, timeoutMs = 2000): Promise<any> {
  const inbox = inboxes.get(ws)
  if (!inbox) return Promise.reject(new Error('wsConnect() 로 연 소켓에만 쓸 수 있다 — 프레임 큐가 없다'))
  if (inbox.queue.length > 0) return Promise.resolve(inbox.queue.shift())
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      reject(new Error('timeout waiting ws message'))
    }, timeoutMs)
    inbox.waiters.push({ resolve, timer })
  })
}

// 오지 말아야 할 메시지가 오지 않음을 관측한다. 큐에 이미 쌓여 있어도 실패다 —
// 그렇지 않으면 대기 시작 전에 도착한 프레임을 못 본 채로 통과한다.
function expectNoMessage(ws: WebSocket, ms = 400): Promise<void> {
  const inbox = inboxes.get(ws)
  if (!inbox) return Promise.reject(new Error('wsConnect() 로 연 소켓에만 쓸 수 있다 — 프레임 큐가 없다'))
  if (inbox.queue.length > 0) {
    return Promise.reject(new Error(`unexpected ws message: ${JSON.stringify(inbox.queue[0])}`))
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      resolve()
    }, ms)
    inbox.waiters.push({ resolve: m => reject(new Error(`unexpected ws message: ${JSON.stringify(m)}`)), timer })
  })
}

function closedPromise(ws: WebSocket): Promise<void> {
  return new Promise(r => ws.on('close', () => r()))
}
```

---

## AC 매트릭스

모든 명령은 `npm test -w server -- --reporter=verbose` 다. 아래 표의 "관측할 결과" 는 그 `✓` 줄이 나타난 **뒤에** 성립해야 하는 실질 관측이다.

| ID | 요구사항 | 테스트 이름 (`✓ test/gateway.test.ts > gateway > …`) | 관측할 결과 |
|----|----------|------------------------------------------------------|-------------|
| AC-GW-001 | REQ-GW-001, 004 | `welcomes each token as its own (room, bot) and only on /bot` | 두 토큰이 서로 다른 방·봇으로 판정됨, `last_seen_at` 이 접속 전 `null` → 접속 후 채워짐, `/bot` 아닌 경로는 열리지 않음, `app.close()` 가 소켓을 닫음 |
| AC-GW-002 | REQ-GW-002, 003, 004 | `rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames` | 다섯 거절 경로 모두 닫힘 + 같은 서버에서 정상 토큰은 환영됨 |
| AC-GW-003 | REQ-GW-005, 006 | `replays only missed messages targeted at that bot and advances the cursor` | 재전송 정확히 1건(그 봇 타깃·커서 이후), 그 외 없음, 커서가 그 번호로 이동 |
| AC-GW-004 | REQ-GW-006 | `never redelivers a message after reconnect` | 재접속 후 아무 메시지도 오지 않음, 커서 불변 |
| AC-GW-005 | REQ-GW-007, 008 | `deliver reaches only targeted bots in that room and moves only their cursor` | 타깃 봇만 수신, 비타깃·타방 봇은 무수신, 커서도 타깃만 이동 |
| AC-GW-006 | REQ-GW-009 | `deliver carries per-bot delivery and the message attachments` | 두 봇이 각각 `to`/`cc` 를 받음, `files` 가 `attachments` 행과 일치 |
| AC-GW-007 | REQ-GW-010 | `stores bot_message, copies files into uploadsDir and publishes to the hub` | 메시지 행 + 첨부 행 존재 + `size` 가 원본 바이트 길이 + `mime` 이 `'application/octet-stream'` + 복사본(원본 보존) + `hub.publish('message')` 1건 |
| AC-GW-008 | REQ-GW-011 | `bot_message skips only the missing attachment` | 없는 파일 1개는 건너뛰고 정상 파일 1개는 첨부됨 (첨부 수 정확히 1) |
| AC-GW-009 | REQ-GW-012 | `status publishes bot_status for working and idle only` | `working`·`idle` 은 발행 2건, 알 수 없는 값은 발행 0건 |
| AC-GW-010 | REQ-GW-013 | `isOnline follows the connection, per room and bot` | 접속 전 `false` → 접속 후 `true` → 종료 후 `false`, 다른 방·다른 봇은 `false` |
| AC-GW-011 | REQ-GW-014 | `history_request returns the room messages in id order and echoes rid` | 번호 오름차순, `rid` 가 요청마다 다르게 되돌아옴, 다른 방 메시지 없음 |
| AC-GW-012 | REQ-GW-015 | `history_request with since_id returns only later messages` | 모든 행이 `id > since_id`, 커서 이하 행이 방에 실재, 대조군(무필터)은 그 행을 포함 |
| AC-GW-013 | REQ-GW-014, 018 | `history_request applies limit before since_id, speaker, since and until` | `limit` 이 필터보다 먼저 적용됨, 세 선택 필터가 각각 걸러 냄 |
| AC-GW-014 | REQ-GW-016 | `history_response carries id, author_name, body and created_at` | 네 필드 모두 존재, `author_name` 이 작성자별로 달라짐 |
| AC-GW-015 | REQ-GW-017 | `history_response goes only to the requesting bot` | 요청한 봇만 수신, 같은 방 다른 봇은 무수신 |
| AC-GW-016 | REQ-GW-019 | `closeRoom disconnects only that room` | 대상 방 소켓만 닫히고 다른 방 소켓은 열린 채로 왕복 성공 |
| AC-GW-017 | REQ-GW-020 | `relays permission_request to the handler and sendToBot reports delivery` | 핸들러가 `{roomId, botId}` 로 호출됨, `sendToBot` 이 온라인 `true`/오프라인 `false` |
| AC-GW-018 | REQ-GW-021, 022 | `buildServer wires the gateway, archive hook and invite online flag` | `app.gateway` 5개 메서드, 보관이 소켓을 끊음, 초대 목록 `online` 이 접속 상태를 따라감 |
| AC-GW-019 | REQ-GW-023 | (테스트 아님 — 명령 네 개) | `gateway.ts` 존재(형제 SPEC 파일은 관측 대상 아님), 기준 SHA 확인 종료 코드 `0`, `db.ts` diff 빈 출력, 변경 파일 정확히 세 줄 |
| AC-GW-020 | RED→GREEN 전이 | (테스트 아님 — 전이 관측) | 네 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-GW-001 — 토큰이 방과 봇을 결정하고, 경로는 `/bot` 뿐이다

**Given** 서로 다른 (방, 봇) 조합 두 개에 각각 초대가 발급돼 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('welcomes each token as its own (room, bot) and only on /bot', async () => {
  const { app, port } = await build()
  const roomA = seedRoom('A'), roomB = seedRoom('B')
  const pm = seedBot('pm'), qa = seedBot('qa')
  const tokenA = invite(roomA, pm)
  const tokenB = invite(roomB, qa)
  const seenAt = () => (db.prepare('SELECT last_seen_at v FROM bot_tokens WHERE room_id=? AND bot_id=?')
    .get(roomA, pm) as { v: string | null }).v
  expect(seenAt()).toBeNull()   // 접속 전

  const a = await wsConnect(port, tokenA)
  const b = await wsConnect(port, tokenB)
  // 분별: 두 토큰이 서로 다른 방·봇으로 판정된다. 상수를 돌려주는 구현은 여기서 깨진다.
  expect([a.welcome.room_id, a.welcome.bot_id, a.welcome.bot_name]).toEqual([roomA, pm, 'pm'])
  expect([b.welcome.room_id, b.welcome.bot_id, b.welcome.bot_name]).toEqual([roomB, qa, 'qa'])
  expect(a.welcome.missed_after_id).toBe(0)
  // 분별: 접속이 last_seen_at 을 채운다. 갱신을 통째로 생략한 구현은 여기서 깨진다 (REQ-GW-001).
  expect(seenAt()).not.toBeNull()

  // 경로 격리: /bot 이 아닌 경로는 업그레이드되지 않는다.
  const wrong = new WebSocket(`ws://127.0.0.1:${port}/nope`)
  const wrongFailed = await new Promise<boolean>(r => {
    wrong.on('error', () => r(true))
    wrong.on('open', () => r(false))
  })
  expect(wrongFailed).toBe(true)

  // onClose 정리: app 이 닫히면 열린 소켓도 닫힌다.
  const bothClosed = Promise.all([closedPromise(a.ws), closedPromise(b.ws)])
  await app.close()
  await bothClosed
})
```

**Then** `✓ test/gateway.test.ts > gateway > welcomes each token as its own (room, bot) and only on /bot` 줄이 출력에 나타나고, 위 다섯 관측(두 토큰의 분별 · `missed_after_id` · `last_seen_at` 전후 · 경로 격리 · `onClose` 정리)이 모두 성립한다.

두 토큰을 한 테스트에서 대조하는 것이 이 기준의 핵심이다. `welcome` 을 상수로 만들어 보내는 구현은 방 하나만 검사할 때 통과해 버린다.

`last_seen_at` 단언은 **접속 전 `null` → 접속 후 비어 있지 않음**의 분별이다. 값 하나만 보면 스키마 기본값과 갱신을 구분할 수 없고, 갱신을 통째로 생략한 구현이 나머지 열아홉 기준을 전부 통과한다.

### AC-GW-002 — 다섯 가지 거절 경로

**Given** 유효한 토큰 하나, 철회된 토큰 하나, 보관된 방의 토큰 하나가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames', async () => {
  const { app, gateway, port } = await build()
  const room = seedRoom(), archived = seedRoom('보관됨')
  const pm = seedBot('pm'), qa = seedBot('qa')
  const good = invite(room, pm)
  const revoked = invite(room, qa)
  db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE token_hash=?").run(sha256Hex(revoked))
  const archivedToken = invite(archived, qa)
  db.prepare("UPDATE rooms SET status='archived' WHERE id=?").run(archived)

  // 1~3: 세 가지 잘못된 토큰은 모두 닫힌다.
  for (const bad of ['f'.repeat(64), revoked, archivedToken]) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    let welcomed = false
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: bad })))
    ws.on('message', () => { welcomed = true })
    await closedPromise(ws)
    expect(welcomed).toBe(false)
  }
  expect(gateway.isOnline(room, qa)).toBe(false)
  expect(gateway.isOnline(archived, qa)).toBe(false)

  // 4: hello 없이 보낸 프레임은 처리되지 않고 접속이 닫힌다.
  const anon = new WebSocket(`ws://127.0.0.1:${port}/bot`)
  await new Promise<void>(r => anon.on('open', () => r()))
  anon.send(JSON.stringify({ type: 'bot_message', body: '몰래' }))
  await closedPromise(anon)
  expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)

  // 대조군: 같은 서버에서 정상 토큰은 환영받는다 — "전부 닫는" 구현을 배제한다.
  const ok = await wsConnect(port, good)
  expect(ok.welcome.bot_id).toBe(pm)

  // 5: 인증된 접속이라도 파싱 불가한 프레임을 보내면 조용히 닫힌다.
  // 스위트를 오염시키는 uncaught 예외가 아니라 정상 종료여야 한다 (plan.md §D 8번).
  const okClosed = closedPromise(ok.ws)
  ok.ws.send('{이건 JSON 이 아니다')
  await okClosed
  expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
  expect(gateway.isOnline(room, pm)).toBe(false)

  await app.close()
})
```

**Then** `✓ … > rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames` 줄이 나타나고, 다섯 거절이 모두 `welcome` 없이(또는 5번의 경우 환영 뒤에) 닫히며, `messages` 에 행이 하나도 없고, **같은 서버에서 정상 토큰은 환영받는다**.

세 번째 대조군(정상 토큰 환영)이 없으면 "모든 접속을 즉시 닫는" 구현이 이 기준을 통과한다.

5번은 감사 지적 M7 의 관측이다. 이전 판은 파싱 실패 시의 동작을 엣지 케이스 표에 **적기만 하고 아무도 관측하지 않았고**, 표가 인용한 코드로는 그 동작이 나오지도 않았다. 이제 `plan.md` §D 8번이 구현을 고치고 이 단언이 그것을 관측한다. 테스트가 통과했는데 vitest 가 unhandled error 를 보고하면 그것도 실패로 다룬다 — `.catch` 로 잡히지 않는 동기 예외가 새어 나왔다는 뜻이다.

### AC-GW-003 — 재전송은 그 봇 타깃의 커서 이후 것만

**Given** 방에 메시지 넷이 있다 — 커서 이전 1건, 커서 이후이면서 그 봇 타깃 1건, 커서 이후이지만 **다른 봇** 타깃 1건, 커서 이후이면서 **아무 타깃도 없는** 1건.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('replays only missed messages targeted at that bot and advances the cursor', async () => {
  const { app, port } = await build()
  const room = seedRoom()
  const pm = seedBot('pm'), qa = seedBot('qa')
  const token = invite(room, pm)
  const ins = (body: string) => db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, body).lastInsertRowid as number
  const target = (id: number, bot: number, d: string) => db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(id, bot, d)

  const oldId = ins('이미 받은 것'); target(oldId, pm, 'to')
  const mine = ins('내 앞으로 온 것'); target(mine, pm, 'to')
  const other = ins('qa 앞으로 온 것'); target(other, qa, 'to')
  const untargeted = ins('아무에게도 아닌 것')
  db.prepare('UPDATE bot_tokens SET last_delivered_id=? WHERE room_id=? AND bot_id=?').run(oldId, room, pm)

  const { ws } = await wsConnect(port, token)
  const replay = await nextMessage(ws)
  expect(replay.type).toBe('message')
  expect(replay.id).toBe(mine)
  expect(replay.delivery).toBe('to')
  // 부정 관측: 다른 봇 타깃도, 무타깃도, 커서 이전 것도 오지 않는다.
  await expectNoMessage(ws)
  expect([other, untargeted, oldId]).not.toContain(replay.id)
  // 커서가 재전송한 마지막 번호로 이동한다.
  expect(cursorOf(room, pm)).toBe(mine)
  ws.close()
  await app.close()
})
```

**Then** `✓ … > replays only missed messages targeted at that bot and advances the cursor` 줄이 나타나고, 재전송이 **정확히 한 건**이며 그것이 `mine` 이고, 커서가 `mine` 으로 올라간다.

`expectNoMessage` 가 이 기준의 무게 중심이다. "방의 커서 이후 메시지를 전부 보내는" 구현은 첫 단언은 통과하지만 여기서 깨진다.

### AC-GW-004 — 재접속해도 같은 메시지가 두 번 오지 않는다

**Given** 봇이 접속해 있고 그 앞으로 메시지 하나가 전달됐다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('never redelivers a message after reconnect', async () => {
  const { app, gateway, port } = await build()
  const room = seedRoom(), pm = seedBot('pm')
  const token = invite(room, pm)
  const first = await wsConnect(port, token)

  const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(room).lastInsertRowid as number
  db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(msgId, pm, 'to')
  const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
  gateway.deliver(room, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
  const got = await nextMessage(first.ws)
  expect(got.id).toBe(msgId)
  expect(cursorOf(room, pm)).toBe(msgId)

  first.ws.close()
  await closedPromise(first.ws)

  // 재접속: 커서가 이미 그 번호이므로 재전송할 것이 없다.
  const again = await wsConnect(port, token)
  expect(again.welcome.missed_after_id).toBe(msgId)
  await expectNoMessage(again.ws, 600)
  expect(cursorOf(room, pm)).toBe(msgId)
  again.ws.close()
  await app.close()
})
```

**Then** `✓ … > never redelivers a message after reconnect` 줄이 나타나고, 재접속 후 **아무 메시지도 오지 않으며**(`expectNoMessage`), 커서가 변하지 않는다.

`spec-v2.md` 8장의 "중복 전달" 행을 직접 관측하는 기준이다. "전달이 일어났다" 만 보는 단언으로는 중복 여부를 알 수 없으므로, 여기서는 **오지 않음**이 관측 대상이다.

### AC-GW-005 — `deliver` 는 타깃에게만 가고 커서도 타깃만 움직인다

**Given** 같은 방에 봇 둘(타깃·비타깃), 다른 방에 봇 하나가 접속해 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('deliver reaches only targeted bots in that room and moves only their cursor', async () => {
  const { app, gateway, port } = await build()
  const roomA = seedRoom('A'), roomB = seedRoom('B')
  const pm = seedBot('pm'), qa = seedBot('qa'), ops = seedBot('ops')
  const wsPm = await wsConnect(port, invite(roomA, pm))
  const wsQa = await wsConnect(port, invite(roomA, qa))
  const wsOps = await wsConnect(port, invite(roomB, ops))

  const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(roomA).lastInsertRowid as number
  const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
  gateway.deliver(roomA, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])

  const got = await nextMessage(wsPm.ws)
  expect(got.author_name).toBe('alice')
  expect(got.id).toBe(msgId)
  // 부정 관측 둘: 같은 방 비타깃도, 다른 방도 받지 않는다.
  await expectNoMessage(wsQa.ws)
  await expectNoMessage(wsOps.ws)
  // 커서도 타깃만 움직인다 — 오프라인 재전송(REQ-GW-005)이 성립하는 근거다.
  expect(cursorOf(roomA, pm)).toBe(msgId)
  expect(cursorOf(roomA, qa)).toBe(0)
  expect(cursorOf(roomB, ops)).toBe(0)

  for (const w of [wsPm, wsQa, wsOps]) w.ws.close()
  await app.close()
})
```

**Then** `✓ … > deliver reaches only targeted bots in that room and moves only their cursor` 줄이 나타나고, 타깃만 수신하며, **비타깃 두 봇의 커서가 `0` 으로 남는다**.

커서 단언이 없으면 "전부에게 보내되 타깃만 기록" 같은 절반 구현이 통과할 수 있다.

### AC-GW-006 — `delivery` 는 봇마다 다르고, `files` 는 첨부와 일치한다

**Given** 한 메시지에 첨부 하나가 있고, 두 봇이 각각 `to` 와 `cc` 로 타깃이다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('deliver carries per-bot delivery and the message attachments', async () => {
  const { app, gateway, port } = await build()
  const room = seedRoom()
  const pm = seedBot('pm'), qa = seedBot('qa')
  const wsPm = await wsConnect(port, invite(room, pm))
  const wsQa = await wsConnect(port, invite(room, qa))

  const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(room).lastInsertRowid as number
  const stored = join(dir, 'up', 'stored-report.md')
  writeFileSync(stored, '내용')
  db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)')
    .run(msgId, '보고서.md', stored, 'text/markdown')
  const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any

  gateway.deliver(room, { ...row, author_name: 'alice' }, [
    { botId: pm, delivery: 'to' },
    { botId: qa, delivery: 'cc' },
  ])
  const toMsg = await nextMessage(wsPm.ws)
  const ccMsg = await nextMessage(wsQa.ws)
  // 분별: 같은 메시지인데 delivery 가 봇마다 다르다. 'to' 하드코딩은 여기서 깨진다.
  expect(toMsg.delivery).toBe('to')
  expect(ccMsg.delivery).toBe('cc')
  expect(toMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])
  expect(ccMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])

  wsPm.ws.close(); wsQa.ws.close()
  await app.close()
})
```

**Then** `✓ … > deliver carries per-bot delivery and the message attachments` 줄이 나타나고, 두 봇이 서로 **다른** `delivery` 를 받으며, `files` 가 `attachments` 행과 정확히 일치한다.

### AC-GW-007 — `bot_message` 저장·복사·발행

**Given** 봇이 접속해 있고 로컬에 파일 하나가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('stores bot_message, copies files into uploadsDir and publishes to the hub', async () => {
  const { app, published, port } = await build()
  const room = seedRoom(), pm = seedBot('pm')
  const { ws } = await wsConnect(port, invite(room, pm))
  const src = join(dir, 'report.md')
  writeFileSync(src, '# 결과\n완료')

  ws.send(JSON.stringify({ type: 'bot_message', body: '정리 완료', files: [{ local_path: src, name: '보고서.md' }] }))
  await new Promise(r => setTimeout(r, 300))

  const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
  expect(row.body).toBe('정리 완료')
  expect(row.author_bot_id).toBe(pm)
  const att = db.prepare('SELECT * FROM attachments WHERE message_id=?').get(row.id) as any
  // 첨부 행이 실제로 있어야 한다. size/mime 이 NOT NULL 이라 값을 빠뜨리면 INSERT 가
  // 제약 위반으로 던지고 그 예외가 REQ-GW-011 의 건너뛰기 catch 에 삼켜진다 — 그러면
  // 이 줄에서 att 가 undefined 가 되어 아래 단언들이 전부 깨진다.
  expect(att).toBeDefined()
  expect(att.filename).toBe('보고서.md')
  // size 는 원본의 실제 바이트 길이다. 상수도 0도 통과하지 못한다.
  // 본문 '# 결과\n완료' 는 문자 8개지만 UTF-8 로는 15바이트라, 문자 길이를 넣은 구현도 깨진다.
  const srcBytes = readFileSync(src).length
  expect(srcBytes).toBe(15)
  expect(att.size).toBe(srcBytes)
  expect(att.mime).toBe('application/octet-stream')
  // 복사본이 uploadsDir 안에 있고, 원본은 그대로 남는다(이동이 아니라 복사).
  expect(att.stored_path).not.toBe(src)
  expect(att.stored_path.startsWith(join(dir, 'up'))).toBe(true)
  expect(readFileSync(att.stored_path, 'utf8')).toContain('완료')
  expect(existsSync(src)).toBe(true)
  // 허브 발행: 이벤트 이름·방·작성자 이름까지 관측한다.
  const msgEvents = published.filter(p => p.event === 'message')
  expect(msgEvents).toHaveLength(1)
  expect(msgEvents[0].roomId).toBe(room)
  expect(msgEvents[0].data.author_name).toBe('pm')
  expect(msgEvents[0].data.attachments).toHaveLength(1)

  ws.close()
  await app.close()
})
```

**Then** `✓ … > stores bot_message, copies files into uploadsDir and publishes to the hub` 줄이 나타나고, 여덟 관측(메시지 행·작성자·**첨부 행 존재**·첨부 이름·**`size` 가 원본 바이트 길이**·**`mime` 상수**·복사본 위치와 원본 보존·허브 발행 1건)이 모두 성립한다.

허브 발행 건수를 `toHaveLength(1)` 로 세는 것이 중요하다. "발행이 있었다" 만 보면 0건도 여러 건도 가려낼 수 없다.

`size` 단언이 이 기준의 두 번째 무게 중심이다. `attachments.size` 와 `mime` 은 스키마에서 `NOT NULL` 이라(`server/src/db.ts:60-61`) 값을 넣지 않은 구현은 INSERT 가 제약 위반으로 던지고, 그 예외가 REQ-GW-011 의 건너뛰기 `catch` 에 삼켜져 **첨부가 조용히 사라진다** — 메시지는 저장되고 로그도 조용하다. `expect(att).toBeDefined()` 가 그 침묵을 깨고, 바이트 길이 대조가 상수·`0`·문자 길이를 각각 배제한다.

### AC-GW-008 — 없는 파일 **하나만** 건너뛴다

**Given** 한 `bot_message` 에 없는 파일 하나와 있는 파일 하나가 함께 실려 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('bot_message skips only the missing attachment', async () => {
  const { app, port } = await build()
  const room = seedRoom(), pm = seedBot('pm')
  const { ws } = await wsConnect(port, invite(room, pm))
  const good = join(dir, '있는파일.txt')
  writeFileSync(good, 'ok')

  ws.send(JSON.stringify({
    type: 'bot_message', body: '결과',
    files: [{ local_path: join(dir, '없는파일'), name: 'x' }, { local_path: good, name: '있는파일.txt' }],
  }))
  await new Promise(r => setTimeout(r, 300))

  const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
  expect(row.body).toBe('결과')
  const atts = db.prepare('SELECT filename FROM attachments WHERE message_id=?').all(row.id) as { filename: string }[]
  // 분별: 정확히 하나만 살아남는다. 0 이면 "하나 실패 시 전부 포기", 2 면 없는 파일까지 기록한 것이다.
  expect(atts.map(a => a.filename)).toEqual(['있는파일.txt'])

  ws.close()
  await app.close()
})
```

**Then** `✓ … > bot_message skips only the missing attachment` 줄이 나타나고, 첨부가 **정확히 하나**이며 그것이 정상 파일이다.

원본 계획의 테스트는 없는 파일 하나만 보내고 첨부 수 `0` 을 단언한다. 그 형태로는 "첨부 처리를 통째로 생략한" 구현도 통과한다 — 정상 파일을 섞은 것이 그 구멍을 막는다.

### AC-GW-009 — `status` 는 두 값만 발행한다

**Given** 봇이 접속해 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('status publishes bot_status for working and idle only', async () => {
  const { app, published, port } = await build()
  const room = seedRoom(), pm = seedBot('pm')
  const { ws } = await wsConnect(port, invite(room, pm))

  ws.send(JSON.stringify({ type: 'status', state: 'working' }))
  ws.send(JSON.stringify({ type: 'status', state: 'idle' }))
  await new Promise(r => setTimeout(r, 200))
  let events = published.filter(p => p.event === 'bot_status')
  expect(events.map(e => e.data.state)).toEqual(['working', 'idle'])
  expect(events[0].data.bot_id).toBe(pm)
  expect(events[0].roomId).toBe(room)

  // 대조군: 알 수 없는 값은 아무것도 발행하지 않는다.
  ws.send(JSON.stringify({ type: 'status', state: 'sleeping' }))
  await new Promise(r => setTimeout(r, 200))
  events = published.filter(p => p.event === 'bot_status')
  expect(events).toHaveLength(2)

  ws.close()
  await app.close()
})
```

**Then** `✓ … > status publishes bot_status for working and idle only` 줄이 나타나고, 발행이 정확히 두 건이며 `sleeping` 은 건수를 늘리지 않는다.

### AC-GW-010 — `isOnline` 은 접속을 따라간다

**Given** 방 둘, 봇 둘이 있고 그중 한 조합만 접속한다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('isOnline follows the connection, per room and bot', async () => {
  const { app, gateway, port } = await build()
  const roomA = seedRoom('A'), roomB = seedRoom('B')
  const pm = seedBot('pm'), qa = seedBot('qa')
  const token = invite(roomA, pm)
  invite(roomA, qa); invite(roomB, pm)

  expect(gateway.isOnline(roomA, pm)).toBe(false)
  const { ws } = await wsConnect(port, token)
  expect(gateway.isOnline(roomA, pm)).toBe(true)
  // 분별: 같은 방 다른 봇도, 다른 방 같은 봇도 온라인이 아니다. `return true` 는 여기서 깨진다.
  expect(gateway.isOnline(roomA, qa)).toBe(false)
  expect(gateway.isOnline(roomB, pm)).toBe(false)

  ws.close()
  await closedPromise(ws)
  await new Promise(r => setTimeout(r, 100))
  expect(gateway.isOnline(roomA, pm)).toBe(false)
  await app.close()
})
```

**Then** `✓ … > isOnline follows the connection, per room and bot` 줄이 나타나고, 다섯 관측이 모두 성립한다.

### AC-GW-011 — 이력은 번호 오름차순이고 `rid` 를 되돌린다

**Given** 대상 방에 메시지 셋, 다른 방에 메시지 하나가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('history_request returns the room messages in id order and echoes rid', async () => {
  const { app, port } = await build()
  const room = seedRoom('A'), other = seedRoom('B')
  const pm = seedBot('pm')
  const { ws } = await wsConnect(port, invite(room, pm))
  for (const b of ['하나', '둘', '셋']) db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, b)
  db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '남의 방')").run(other)

  ws.send(JSON.stringify({ type: 'history_request', rid: 'r1', limit: 10 }))
  const res1 = await nextMessage(ws)
  expect(res1.type).toBe('history_response')
  expect(res1.rid).toBe('r1')
  expect(res1.messages.map((m: any) => m.body)).toEqual(['하나', '둘', '셋'])
  expect(res1.messages.map((m: any) => m.id)).toEqual([...res1.messages.map((m: any) => m.id)].sort((a, b) => a - b))
  // 방 격리: 다른 방 메시지는 섞이지 않는다.
  expect(res1.messages.map((m: any) => m.body)).not.toContain('남의 방')

  // 분별: rid 는 요청마다 그대로 되돌아온다. 하드코딩은 여기서 깨진다.
  ws.send(JSON.stringify({ type: 'history_request', rid: 'r2', limit: 10 }))
  const res2 = await nextMessage(ws)
  expect(res2.rid).toBe('r2')

  ws.close()
  await app.close()
})
```

**Then** `✓ … > history_request returns the room messages in id order and echoes rid` 줄이 나타나고, 네 관측(응답 타입·`rid` 두 번·오름차순·방 격리)이 모두 성립한다.

### AC-GW-012 — `since_id` 는 커서 이하를 **실제로 걸러 낸다**

이 SPEC 에서 가장 조용히 통과하기 쉬운 기준이다. "메시지가 돌아왔다" 는 필터가 아예 없어도 성립하므로, 필터가 **무언가를 없앴다는 것**을 대조군으로 증명한다.

**Given** 방에 메시지 셋이 있고, 커서를 두 번째 메시지 번호로 잡는다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('history_request with since_id returns only later messages', async () => {
  const { app, port } = await build()
  const room = seedRoom(), pm = seedBot('pm')
  const { ws } = await wsConnect(port, invite(room, pm))
  const ids = ['하나', '둘', '셋'].map(b =>
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, b).lastInsertRowid as number)
  const cursor = ids[1]

  // 대조군 먼저: 필터가 없으면 커서 이하 메시지가 응답에 들어온다.
  ws.send(JSON.stringify({ type: 'history_request', rid: 'ctl', limit: 10 }))
  const control = await nextMessage(ws)
  expect(control.messages.map((m: any) => m.id)).toEqual(ids)
  expect(control.messages.some((m: any) => m.id <= cursor)).toBe(true)

  // 본 검사: since_id 를 붙이면 커서 이하가 하나도 없다.
  ws.send(JSON.stringify({ type: 'history_request', rid: 'r2', since_id: cursor, limit: 10 }))
  const res = await nextMessage(ws)
  expect(res.rid).toBe('r2')
  expect(res.messages.length).toBeGreaterThan(0)
  expect(res.messages.every((m: any) => m.id > cursor)).toBe(true)
  expect(res.messages.map((m: any) => m.body)).toEqual(['셋'])
  // 필터가 없앤 것이 실재함을 DB 로 확인한다 — 방에 커서 이하 메시지가 둘 있다.
  const below = db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=? AND id<=?').get(room, cursor) as { c: number }
  expect(below.c).toBe(2)
  expect(control.messages.length - res.messages.length).toBe(below.c)

  ws.close()
  await app.close()
})
```

**Then** `✓ … > history_request with since_id returns only later messages` 줄이 나타나고, 다음 **다섯** 관측이 모두 성립한다.

1. 대조군(`since_id` 없음)이 세 건을 돌려주고 그중 커서 이하가 실재한다 — 걸러 낼 대상이 있었다는 뜻이다
2. `since_id` 를 붙인 응답이 비어 있지 않다 — 빈 배열로 "모두 걸러 낸" 구현을 배제한다
3. 응답의 **모든** 행이 `id > since_id` 다 (`every`)
4. 본문이 정확히 `['셋']` 이다
5. **대조군과의 건수 차이가 DB 의 커서 이하 건수와 정확히 같다** — 필터가 없앤 것이 무엇인지까지 맞춘다

3번만 있으면 방에 메시지가 하나뿐일 때 필터 없이도 통과한다. 1·5번이 그 구멍을 막는다.

### AC-GW-013 — `limit` 은 필터보다 먼저, 선택 필터 셋은 각각 걸러 낸다

**Given** 방에 메시지 다섯이 있고 작성자와 시각이 서로 다르다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('history_request applies limit before since_id, speaker, since and until', async () => {
  const { app, port } = await build()
  const room = seedRoom(), pm = seedBot('pm')
  const alice = db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice','x')").run().lastInsertRowid as number
  const { ws } = await wsConnect(port, invite(room, pm))

  const ids: number[] = []
  for (let i = 1; i <= 5; i++) {
    ids.push(db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body, created_at) VALUES (?, 'user', ?, ?, ?)")
      .run(room, alice, `m${i}`, `2026-08-2${i}T00:00:00Z`).lastInsertRowid as number)
  }
  db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body, created_at) VALUES (?, 'bot', ?, '봇 발언', '2026-08-26T00:00:00Z')").run(room, pm)

  // limit 순서: limit 2 는 "최근 2건을 자른 뒤" since_id 를 적용한다.
  // 필터를 먼저 적용했다면 m1 다음 두 건(m2, m3)이 왔을 것이다 — 두 해석을 가른다.
  ws.send(JSON.stringify({ type: 'history_request', rid: 'a', since_id: ids[0], limit: 2 }))
  const limited = await nextMessage(ws)
  expect(limited.messages.map((m: any) => m.body)).toEqual(['m5', '봇 발언'])

  // speaker 필터
  ws.send(JSON.stringify({ type: 'history_request', rid: 'b', speaker: 'pm', limit: 100 }))
  expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['봇 발언'])

  // since / until 필터
  ws.send(JSON.stringify({ type: 'history_request', rid: 'c', since: '2026-08-24T00:00:00Z', until: '2026-08-26T00:00:00Z', limit: 100 }))
  expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['m4', 'm5'])

  // 대조군: 필터 없이는 여섯 건 전부 온다.
  ws.send(JSON.stringify({ type: 'history_request', rid: 'd', limit: 100 }))
  expect((await nextMessage(ws)).messages).toHaveLength(6)

  ws.close()
  await app.close()
})
```

**Then** `✓ … > history_request applies limit before since_id, speaker, since and until` 줄이 나타나고, 네 관측이 모두 성립한다.

첫 단언이 이 기준의 핵심이다. `limit` 을 필터 뒤에 적용하는 구현과 앞에 적용하는 구현은 **서로 다른 답**을 내며, 이 단언이 그중 하나를 계약으로 고정한다 (`spec.md` §6 의 제약). 마지막 대조군은 세 필터가 "아무것도 안 거르는" 구현으로 통과하는 길을 막는다.

### AC-GW-014 — 이력의 네 필드와 작성자 이름 해석

**Given** 방에 사용자 메시지 하나와 봇 메시지 하나가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('history_response carries id, author_name, body and created_at', async () => {
  const { app, port } = await build()
  const room = seedRoom(), pm = seedBot('pm')
  const alice = db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice','x')").run().lastInsertRowid as number
  db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body) VALUES (?, 'user', ?, '사람 말')").run(room, alice)
  db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, '봇 말')").run(room, pm)
  db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', '시스템 말')").run(room)

  const { ws } = await wsConnect(port, invite(room, pm))
  ws.send(JSON.stringify({ type: 'history_request', rid: 'r', limit: 10 }))
  const res = await nextMessage(ws)

  for (const m of res.messages) {
    // 네 조각: 채널이 `#<번호> [시각] 작성자: 본문` 을 만들 때 쓰는 필드 전부
    expect(typeof m.id).toBe('number')
    expect(typeof m.author_name).toBe('string')
    expect(typeof m.body).toBe('string')
    expect(typeof m.created_at).toBe('string')
    expect(m.created_at.length).toBeGreaterThan(0)
  }
  // 분별: 작성자 종류마다 이름이 다르다. 상수를 돌려주는 authorName 은 여기서 깨진다.
  expect(res.messages.map((m: any) => m.author_name)).toEqual(['alice', 'pm', '시스템'])

  ws.close()
  await app.close()
})
```

**Then** `✓ … > history_response carries id, author_name, body and created_at` 줄이 나타나고, 모든 항목이 네 필드를 갖추며, 세 작성자 종류가 **서로 다른** 이름으로 해석된다.

> 이력 줄 `#<번호> [시각] 작성자: 본문` 의 **조립은 카드 `t4`** 의 채널 플러그인이 한다. 서버가 책임지는 것은 그 네 조각을 빠짐없이 내려보내는 것이며, 이 기준이 그것을 관측한다 (REQ-GW-016).

### AC-GW-015 — 이력 응답은 요청한 봇에게만 간다

**Given** 같은 방에 봇 둘이 접속해 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('history_response goes only to the requesting bot', async () => {
  const { app, port } = await build()
  const room = seedRoom()
  const pm = seedBot('pm'), qa = seedBot('qa')
  const wsPm = await wsConnect(port, invite(room, pm))
  const wsQa = await wsConnect(port, invite(room, qa))
  db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '하나')").run(room)

  wsPm.ws.send(JSON.stringify({ type: 'history_request', rid: 'r', limit: 10 }))
  const res = await nextMessage(wsPm.ws)
  expect(res.rid).toBe('r')
  await expectNoMessage(wsQa.ws)   // 부정 관측: 옆 봇에게 새지 않는다

  wsPm.ws.close(); wsQa.ws.close()
  await app.close()
})
```

**Then** `✓ … > history_response goes only to the requesting bot` 줄이 나타나고, 요청한 봇만 응답을 받는다.

### AC-GW-016 — `closeRoom` 은 그 방만 끊는다

**Given** 방 둘에 각각 봇이 접속해 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('closeRoom disconnects only that room', async () => {
  const { app, gateway, port } = await build()
  const roomA = seedRoom('A'), roomB = seedRoom('B')
  const pm = seedBot('pm'), qa = seedBot('qa')
  const wsA = await wsConnect(port, invite(roomA, pm))
  const wsB = await wsConnect(port, invite(roomB, qa))
  db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', 'B 방 메시지')").run(roomB)

  const aClosed = closedPromise(wsA.ws)
  gateway.closeRoom(roomA)
  await aClosed
  expect(gateway.isOnline(roomA, pm)).toBe(false)

  // 분별: 다른 방 소켓은 열려 있을 뿐 아니라 여전히 왕복이 된다.
  expect(wsB.ws.readyState).toBe(WebSocket.OPEN)
  expect(gateway.isOnline(roomB, qa)).toBe(true)
  wsB.ws.send(JSON.stringify({ type: 'history_request', rid: 'alive', limit: 10 }))
  const res = await nextMessage(wsB.ws)
  expect(res.rid).toBe('alive')
  expect(res.messages.map((m: any) => m.body)).toEqual(['B 방 메시지'])

  wsB.ws.close()
  await app.close()
})
```

**Then** `✓ … > closeRoom disconnects only that room` 줄이 나타나고, 대상 방만 끊기며 **다른 방은 왕복까지 성공한다**.

`readyState` 만 보면 "닫는 중" 상태를 놓칠 수 있어 실제 왕복을 함께 관측한다.

### AC-GW-017 — 권한 릴레이 창구

**Given** 권한 핸들러가 등록돼 있고 봇 하나가 접속해 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('relays permission_request to the handler and sendToBot reports delivery', async () => {
  const { app, gateway, port } = await build()
  const room = seedRoom()
  const pm = seedBot('pm'), qa = seedBot('qa')
  invite(room, qa)   // qa 는 초대만 받고 접속하지 않는다 (오프라인 대조군)
  const seen: { info: any; params: any }[] = []
  gateway.setPermissionHandler((info, params) => seen.push({ info, params }))
  const { ws } = await wsConnect(port, invite(room, pm))

  ws.send(JSON.stringify({ type: 'permission_request', request_id: 'p1', tool_name: 'Bash', description: '설치', input_preview: 'npm i' }))
  await new Promise(r => setTimeout(r, 200))
  expect(seen).toHaveLength(1)
  expect(seen[0].info).toEqual({ roomId: room, botId: pm })
  expect(seen[0].params.request_id).toBe('p1')
  expect(seen[0].params.tool_name).toBe('Bash')

  // 온라인 봇에게는 true 이고 실제로 도착한다.
  expect(gateway.sendToBot(room, pm, { type: 'permission_verdict', request_id: 'p1', behavior: 'allow' })).toBe(true)
  const verdict = await nextMessage(ws)
  expect(verdict).toEqual({ type: 'permission_verdict', request_id: 'p1', behavior: 'allow' })
  // 분별: 오프라인 봇에게는 false 이고 아무 일도 일어나지 않는다. `return true` 는 여기서 깨진다.
  expect(gateway.sendToBot(room, qa, { type: 'permission_verdict', request_id: 'p2', behavior: 'deny' })).toBe(false)
  await expectNoMessage(ws)

  // 핸들러 해제 후에는 호출되지 않는다.
  gateway.setPermissionHandler(null)
  ws.send(JSON.stringify({ type: 'permission_request', request_id: 'p3' }))
  await new Promise(r => setTimeout(r, 200))
  expect(seen).toHaveLength(1)

  ws.close()
  await app.close()
})
```

**Then** `✓ … > relays permission_request to the handler and sendToBot reports delivery` 줄이 나타나고, 다섯 관측(핸들러 1회 호출·`ConnInfo` 일치·온라인 `true`+도착·오프라인 `false`+무전송·해제 후 무호출)이 모두 성립한다.

### AC-GW-018 — 조립: `buildServer` 배선과 초대 목록의 `online`

**Given** `buildServer()` 로 띄운 실제 서버와 로그인한 사용자가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
it('buildServer wires the gateway, archive hook and invite online flag', async () => {
  process.env.MINIDISCORD_DATA_DIR = join(dir, 'srv')
  const { buildServer } = await import('../src/index.js')
  const app = await buildServer()
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port

  // Gateway 계약: 다섯 메서드가 전부 함수다 (REQ-GW-021)
  const gw = (app as any).gateway
  for (const m of ['deliver', 'closeRoom', 'isOnline', 'sendToBot', 'setPermissionHandler']) {
    expect(typeof gw[m]).toBe('function')
  }

  // 가입·로그인 라우트 이름과 set-cookie 정규화는 rooms-bots.test.ts 의 build() 와 같다
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const raw = login.headers['set-cookie'] ?? ''
  const ck = (Array.isArray(raw) ? raw[0] : raw).split(';')[0]
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: ck }, payload: { name: 'pm' } })).json()
  const inv = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck }, payload: { bot_id: bot.id } })).json()

  // 접속 전: online 은 false
  const before = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck } })).json()
  expect(before[0].online).toBe(false)

  const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
  await new Promise<void>(r => { ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: inv.token }))); ws.on('message', () => r()) })

  // 접속 후: 같은 라우트가 true 로 바뀐다 — 상수 false 를 배제하는 분별 단언
  const during = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck } })).json()
  expect(during[0].online).toBe(true)
  expect(typeof during[0].online).toBe('boolean')

  // 보관 훅: HTTP 로 방을 보관하면 그 방 소켓이 끊긴다
  const closed = closedPromise(ws)
  const archived = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie: ck } })
  expect(archived.statusCode).toBe(200)
  await closed

  await app.close()
  delete process.env.MINIDISCORD_DATA_DIR
})
```

**Then** `✓ … > buildServer wires the gateway, archive hook and invite online flag` 줄이 나타나고, 네 관측이 모두 성립한다.

1. `app.gateway` 의 다섯 메서드가 전부 함수다 (REQ-GW-021)
2. 같은 초대 목록 라우트가 접속 **전** `false`, 접속 **후** `true` 를 낸다 — 상수를 배제하는 분별이며, `SPEC-BOT-001` 이 남겨 둔 자리가 실제로 채워졌다는 유일한 증거다
3. `online` 이 여전히 불리언이다 (SQLite 정수 `0`/`1` 이 새지 않는다)
4. HTTP 보관 요청이 그 방 소켓을 끊는다 — `onArchive` 훅이 실제로 연결됐다 (REQ-GW-022)

`typeof` 만 검사하고 값 변화를 보지 않으면 `online: false` 를 그대로 둔 구현이 통과한다. 2번이 그 구멍을 막는다.

### AC-GW-019 — 범위 경계와 스키마 불변

**Given** 이 SPEC 의 구현이 끝났다.
**When** 다음 네 명령을 차례로 실행한다.

```bash
ls server/src
git rev-parse --verify "$(cat .moai/specs/SPEC-GATEWAY-001/.spec-base-sha)^{commit}"
git diff --stat <둘째 명령이 출력한 40자리 SHA> -- server/src/db.ts
git diff --name-only <같은 SHA> -- server/src
```

**둘째 명령이 앞에 있어야 하는 이유.** M1 단계 0 을 건너뛴 실행에서는 `.spec-base-sha` 가 없고, `git diff … "$(cat …)"` 는 빈 문자열을 리비전으로 받아 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 그러면 셋째 명령의 "비어 있음"은 성립해 버리고 셋째 관측만 조용히 무력해진다. 그래서 기준 SHA 의 존재 자체를 관측 대상으로 올린다. 셋째·넷째 명령에 SHA 를 직접 적는 것은 `$(cat …)` 을 품은 `git diff` 가 워크트리 격리 세션의 가드에 걸려 실행되지 않기 때문이다.

**Then** 네 관측이 모두 성립한다.

1. `server/src` 에 `gateway.ts` 가 있고, 선행 SPEC 의 산출물 `auth.ts`·`config.ts`·`db.ts`·`index.ts`·`routes-bots.ts`·`routes-rooms.ts` 가 그대로 있다. **형제 SPEC 의 파일(`mention.ts`·`sse.ts`·`routes-messages.ts`·`permissions.ts`)의 존재 여부는 이 기준의 관측 대상이 아니다** — 카드 `t3` 안의 SPEC 실행 순서에 따라 있을 수도 없을 수도 있고, 어느 쪽이든 이 SPEC 의 통제 밖이다. "이 SPEC 이 만들지 않았다"의 판정은 4번의 base-SHA diff 가 한다(형제 SPEC 이 만든 파일은 그 diff 에 나타나지 않는다). 형제 SPEC `SPEC-MSG-001` 의 같은 기준(AC-MSG-013)도 같은 서술을 쓴다.
2. 둘째 명령이 **종료 코드 `0`** 으로 끝나고 40자리 SHA 한 줄을 출력한다. 종료 코드가 `0` 이 아니거나 `fatal:` 이 나오면 **이 기준은 실패**다. 셋째·넷째로 넘어가지 않는다.
3. 셋째 명령이 **종료 코드 `0`** 으로 끝나고 **출력이 비어 있다** — `db.ts` 가 이 SPEC 진입 이후 한 줄도 바뀌지 않았다 (REQ-GW-023). 두 조건이 함께 성립해야 통과다.
4. 넷째 명령이 **종료 코드 `0`** 으로 끝나고 출력이 정확히 세 줄이다 — `server/src/gateway.ts`, `server/src/index.ts`, `server/src/routes-bots.ts`. 그 밖의 파일이 한 줄이라도 나타나면 실패다.

### AC-GW-020 — RED → GREEN 전이 증거

**Given** 각 마일스톤에서 테스트를 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 다음 네 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | AC-GW-001~006 의 테스트 추가 후 실패 — 원인이 `../src/gateway.js` 부재임이 출력에서 확인된다 |
| 2 | M1 | GREEN | `createGateway` 의 접속·재전송·`deliver` 구현 후 그 여섯 테스트의 `✓` 줄이 나타난다 |
| 3 | M2 | RED | AC-GW-007~017 의 테스트 추가 후 그 항목들이 실패 — 원인이 해당 핸들러 부재임이 확인된다 |
| 4 | M2 | GREEN | `bot_message`·`status`·`history`·권한 릴레이 구현 후 전체 `✓`, 이어서 M3 에서 AC-GW-018 배선까지 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다. RED 판정은 도구가 내는 특정 문구가 아니라 "그것이 없어서 실패했다"는 원인이 출력에서 확인되는가로 한다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| `hello` 를 두 번 보냄 | 두 번째도 같은 접속을 다시 등록하고 재전송을 다시 시도한다. 커서가 이미 올라가 있으므로 실제로는 아무것도 오지 않는다 | AC-GW-004 와 같은 커서 경로 |
| 같은 토큰으로 두 프로세스가 동시에 접속 | 둘 다 환영받고 둘 다 메시지를 받는다. 막지 않는다 | `spec.md` §5 에서 수용으로 명시 |
| 커서가 `0` 인 첫 접속에 그 봇 타깃 메시지가 이미 있음 | 전부 재전송된다. `id > 0` 이므로 자연히 성립한다 | AC-GW-003 의 커서 경로 |
| 파싱 불가한 JSON 프레임 | `JSON.parse` 를 `try/catch` 로 감싼 뒤 그 접속을 닫는다. 인자 위치에서 파싱하면 예외가 프로미스 체인 **바깥에서 동기적으로** 던져져 `.catch` 가 잡지 못하고 vitest 의 unhandled error 로 새어 나간다 (`plan.md` §D 8번) | AC-GW-002 의 5번이 직접 관측 |
| 알 수 없는 `type` 을 인증된 접속이 보냄 | `switch` 의 어느 분기에도 걸리지 않아 조용히 무시된다. 접속은 유지된다 | AC-GW-009 의 `sleeping` 이 같은 성질을 관측한다 |
| `bot_message` 의 `body` 가 없음 | `String(msg.body ?? '')` 로 빈 문자열이 저장된다. 오류가 아니다 | AC-GW-007 과 같은 경로 |
| `files` 가 없는 `bot_message` | `?? []` 로 첨부 없이 저장된다 | AC-GW-007·008 과 같은 경로 |
| `history_request` 의 `limit` 이 `500` 초과 | `Math.min(…, 500)` 으로 잘린다 | AC-GW-013 의 `limit` 경로 |
| 초대는 있으나 접속이 없는 봇에게 `deliver` | 아무것도 보내지 않고 커서도 그대로다. 다음 접속 때 재전송된다 | AC-GW-005 (커서 `0` 유지) + AC-GW-003 |
| 방이 보관된 뒤 그 방의 토큰으로 재접속 | `hello` 가 거절되고 접속이 닫힌다 | AC-GW-002 의 보관 방 경로 |
| 서버 재시작 후 `isOnline` | 전부 `false`. 접속 목록은 메모리에만 있다 | `spec.md` §5 에서 정상 동작으로 명시 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (선행 SPEC 분 + 이 SPEC 의 18건) | `npm test -w server -- --reporter=verbose` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), `gateway.ts` 는 WebSocket 연결과 봇 토큰 인증만 안다 | 리뷰 |
| Unified | TypeScript strict, NodeNext, 상대 import 에 `.js` 확장자 | `npm run typecheck -w server` |
| Secured | 토큰은 `sha256Hex` 해시로만 조회, 방·봇은 요청이 아니라 토큰이 결정, 철회·보관된 토큰은 거절 | AC-GW-001, AC-GW-002 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-GW-001 부터 AC-GW-020 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server -- --reporter=verbose` 가 종료 코드 `0` 이고, 위 18개 테스트 이름의 `✓` 줄이 **전부** 출력에 나타남
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `gateway.ts` 가 존재하고 선행 SPEC 산출물 여섯 파일이 그대로임 (형제 SPEC 파일의 존재 여부는 관측하지 않는다 — AC-GW-019 1번)
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-GATEWAY-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함
- [ ] 그 SHA 로 실행한 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이고 출력이 비어 있음. **빈 출력만으로 통과 처리하지 않는다** — 기준 SHA 가 없을 때도 표준 출력은 비어 있다
- [ ] 같은 SHA 로 실행한 `git diff --name-only <SHA> -- server/src` 가 정확히 `gateway.ts`·`index.ts`·`routes-bots.ts` 세 줄
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 3개 (`feat: bot gateway with token auth and cursor replay`, `feat: gateway bot_message, status, history and permission relay`, `feat: wire gateway into buildServer and invite online flag`)
