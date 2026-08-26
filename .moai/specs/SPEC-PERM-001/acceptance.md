# SPEC-PERM-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 계획 디렉터리의 다른 문서나 초기 커밋에 담긴 v1 초안은 이 SPEC 의 참조 대상이 아니다.

## 이 문서가 지키는 검증 원칙

이 SPEC 의 수용 기준은 **구현 본문이 비어 있어도 통과하는 기준을 하나도 두지 않는다**. 특히 다음 세 가지는 순진하게 쓰면 전부 무의미해지는 자리라, 각각 어떤 스텁이 그 기준을 뚫는지 명시해 두었다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 거절 경로 | "판정이 도착한다"는 단언은 **항상 `allow` 를 보내는 구현**도 통과시킨다 | 봇 소켓이 실제로 받은 payload 의 `behavior` 가 `'deny'` 인가 (AC-PERM-005) |
| 봇 오프라인 | "시간이 지났다"·"예외가 안 났다"는 아무것도 재지 않는다 | 결과 system 메시지 본문이 전달 성공 문구와 **다른가**, 실패 표식을 양성으로 담는가, 대기 항목이 해제됐는가 (AC-PERM-011) |
| 접근 통제 | "인증된 사람이 승인할 수 있다"는 **아무 검사도 없는 구현**도 통과시킨다 | 미인증 요청이 `401` 이고 판정이 봇에 **가지 않았는가**(부정 사례) (AC-PERM-009) |
| 흘려보내기 | "소비되지 않았다"는 **가로채기가 아예 없는 구현**도 통과시킨다 — 부정 기준의 기대값이 정상 경로의 기본값과 같다 | 흘려보낸 뒤에도 대기 항목이 살아 있어 **진짜 판정이 성립하는가** (AC-PERM-010) |

같은 이유로 다음 형태는 이 문서에서 금지한다 — "파일이 존재한다", "함수가 export 돼 있다", "테스트 스위트가 통과한다(어떤 테스트인지 이름 없이)", 그리고 구현 본문을 지워도 참인 단언.

**반대 방향의 결함도 함께 막는다.** 공허한 기준이 정상 구현을 거짓 통과시킨다면, 잘못 쓴 기준은 **정상 구현을 거짓 실패시킨다.** 부류 훑기는 앞의 것만 걸러 내므로 뒤의 것은 따로 봐야 한다 — 이 문서에서 그런 자리는 비동기 스트림을 읽는 AC-PERM-003 하나이며, 그 경위는 해당 기준 본문에 적어 두었다.

**이름 붙은 기존 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다. 그런 기준의 명령은 `npm test -w server -- --reporter=verbose` 이고, 관측 대상은 `✓ test/permissions.test.ts > <describe 이름> > <테스트 이름>` 줄이 출력에 실제로 나타나는가 하나다. 그 줄이 없으면 **실패**다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다.

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## 공통 테스트 하네스

아래 모든 시나리오는 `server/test/permissions.test.ts` 의 다음 하네스를 쓴다. `plan-v2.md` Task 10 Step 1 의 `build()` 에 **다섯 가지가 더해졌다** — (1) `app.decorate('permissions', broker)`(원본 누락, `plan.md` §D 1번), (2) `await app.listen({ port: 0 })`(실제 봇 소켓 연결을 위해), (3) `reply.hijack()` 을 앞세운 SSE 구독 라우트 등록(AC-PERM-003 을 위해 — `SPEC-SSE-001` `REQ-SSE-003` 이 확정한 형태), (4) 일괄 정리 목록 `cleanups`, (5) `setCookieOf` 헬퍼(원본의 `set-cookie` 배열 가정 교정 — `plan.md` §D 6번).

**`set-cookie` 는 배열이 아니다.** `light-my-request`(= `app.inject`)는 그 헤더를 **문자열 하나**로 돌려준다. 원본이 쓴 `login.headers['set-cookie']![0]` 은 문자열의 첫 글자 `"m"` 을 집어내고, `.split(';')[0]` 도 `"m"` 이라, 그 값을 쿠키로 보내는 모든 요청이 `requireAuth` 에서 `401` 이 된다 — 구현이 완벽해도 열 개 기준이 실패한다. 형제 SPEC 세 곳이 같은 결함을 각각 교정하며 쓴 `setCookieOf` 헬퍼를 그대로 가져왔다.

**정리는 개별 테스트가 아니라 `cleanups` 가 한다.** `app.listen` 으로 띄운 서버와 열어 둔 WebSocket·SSE 스트림을 각 테스트가 스스로 닫게 하면, 한 곳만 빠뜨려도 vitest 프로세스가 종료되지 않는다. `build()`·`wsConnect`·`openStream` 이 각자 자기 정리를 등록하고 `afterEach` 가 역순으로 실행하므로, 아래 시나리오 본문에는 정리 코드가 한 줄도 나오지 않는다 — 빠뜨릴 수 있는 자리를 없앤 것이다. `SPEC-SSE-001` 하네스와 같은 형태다.

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
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { registerMessageRoutes } from '../src/routes-messages.js'
import { sha256Hex } from '../src/routes-bots.js'

let dir: string
let db: Db

// 열어 둔 자원(서버·소켓·스트림)의 일괄 정리 목록. 등록 역순으로 닫는다.
const cleanups: (() => Promise<void> | void)[] = []

// light-my-request 는 set-cookie 값을 배열이 아니라 문자열 하나로 돌려준다 —
// 원본 테스트가 가정한 첫 값 형태로 정규화 (형제 SPEC 세 곳과 같은 헬퍼)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'md-')); db = openDb(join(dir, 't.db')) })
afterEach(async () => {
  for (const c of cleanups.splice(0).reverse()) await c()   // 서버가 db 보다 먼저 닫혀야 한다
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

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
  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
    reply.hijack()                                                   // SPEC-SSE-001 REQ-SSE-003 — subscribe 앞에 온다
    hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
  registerMessageRoutes(app)
  const broker = createPermissionBroker(app)
  app.decorate('permissions', broker)                                  // 원본 누락분 (plan.md §D 1번)
  gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  cleanups.push(async () => { await app.close() })                   // 개별 테스트가 닫지 않는다
  return { app, broker, gateway, port, cookie: setCookieOf(login).split(';')[0] }
}

// (방, 봇, 게이트웨이 토큰) 한 벌을 만든다. 여러 방을 만들려면 name 을 바꿔 부른다.
function seedRoomAndBot(roomName = 'A', botName = 'pm') {
  const roomId = db.prepare('INSERT INTO rooms (name) VALUES (?)').run(roomName).lastInsertRowid as number
  const botId = db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(botName).lastInsertRowid as number
  const token = randomBytes(32).toString('hex')
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash) VALUES (?, ?, ?)').run(roomId, botId, sha256Hex(token))
  return { roomId, botId, token }
}

// 가짜 채널 클라이언트. Task 8 게이트웨이 테스트와 같은 형태이며 그쪽은 내보내지 않으므로 여기 다시 둔다.
function wsConnect(port: number, token: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    cleanups.push(() => { ws.close() })
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', d => { if (JSON.parse(String(d)).type === 'welcome') resolve(ws) })
    ws.on('error', reject)
  })
}

// SSE 스트림을 연다. abort() 로 클라이언트 쪽 연결을 끊을 수 있다.
async function openStream(port: number, ck: string, roomId: number) {
  const ac = new AbortController()
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/events`,
    { headers: { cookie: ck }, signal: ac.signal })
  cleanups.push(() => { ac.abort() })
  return res.body!.getReader()
}

// 프레임 하나를 통째로 읽는다. TCP 가 쪼개 보낼 수 있으므로 '\n\n' 까지 모은다.
// 프레임이 오지 않으면 read() 에서 멈추고 vitest 테스트 타임아웃으로 실패한다 — 그것이 의도다.
async function readFrame(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) throw new Error('스트림이 프레임 없이 닫혔다')
    buf += Buffer.from(value).toString()
    if (buf.endsWith('\n\n')) return buf
  }
}

// 다음 한 건을 기다린다. timeoutMs 안에 아무것도 안 오면 null — "오지 않았음"을 단언하는 데 쓴다.
function nextMessage(ws: WebSocket, timeoutMs = 1500): Promise<any | null> {
  return new Promise(resolve => {
    const t = setTimeout(() => { ws.off('message', h); resolve(null) }, timeoutMs)
    function h(d: unknown) { clearTimeout(t); ws.off('message', h); resolve(JSON.parse(String(d))) }
    ws.on('message', h)
  })
}

function post(app: any, roomId: number, cookie: string, body: string) {
  const form = new FormData()
  form.append('body', body)
  return app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, headers: { cookie }, payload: form })
}
```

`nextMessage` 가 `null` 을 돌려주는 것이 이 문서의 **부정 관측 도구**다. "판정이 가지 않았다"를 단언하는 기준(AC-PERM-007·008·009·010)이 전부 이것을 쓴다.

`readFrame` 은 **연결 확인 주석을 반드시 한 번 소비한 뒤** 다음 프레임으로 넘어가야 한다. `SPEC-SSE-001` `REQ-SSE-002` 가 `subscribe` 진입 시 `: connected\n\n` 을 먼저 쓰도록 확정했으므로, 스트림을 열자마자 한 번만 읽으면 그 주석을 받는다 — 브로커가 완벽해도 실패하는 기준이 된다. 그래서 AC-PERM-003 은 `readFrame` 을 두 번 부르고, 발행을 **첫 `readFrame` 이 반환한 뒤에** 일으킨다. 순서를 뒤집으면 두 프레임이 한 청크로 합쳐질 수 있어 두 번째 `readFrame` 이 멈춘다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-PERM-001 | REQ-PERM-001 | `npm test -w server -- --reporter=verbose` | `✓ test/permissions.test.ts > permission relay > gateway request creates a system message in the room` 줄이 나타남 |
| AC-PERM-002 | REQ-PERM-002 | 아래 본문 | system 메시지 본문이 네 조각을 모두 포함하고 `yes abcde` / `no abcde` 두 형태를 담음 |
| AC-PERM-003 | REQ-PERM-001 (SSE 절) | 아래 본문 | 연결 확인 주석 **다음** 프레임에 `event: message` 와 `abcde` 가 도착 |
| AC-PERM-004 | REQ-PERM-006 | 아래 본문 | 봇 소켓이 `{ type:'permission_verdict', request_id:'abcde', behavior:'allow' }` 수신 |
| AC-PERM-005 | REQ-PERM-007 | 아래 본문 | 봇 소켓이 받은 payload 의 `behavior` 가 정확히 `'deny'` |
| AC-PERM-006 | REQ-PERM-005 | 아래 본문 | 응답 `consumed_by === 'permission'` 이고 `author_type='user'` 행 수 `0` |
| AC-PERM-007 | REQ-PERM-008 | 아래 본문 | 두 번째 `yes` 는 소비되지 않고 저장됨 + 봇 소켓 두 번째 수신이 `null` |
| AC-PERM-008 | REQ-PERM-011 | 아래 본문 | 다른 방 답에서 봇 수신 `null` + 원래 방에서는 여전히 판정 전달됨 |
| AC-PERM-009 | REQ-PERM-012 | 아래 본문 | 쿠키 없는 POST 가 `401` + 봇 수신 `null` + 이후 인증된 답은 전달됨 |
| AC-PERM-010 | REQ-PERM-010 | 아래 본문 | 두 텍스트 모두 봇 수신 `null` + `author_type='user'` 행 수 `2` + 이후 진짜 판정이 여전히 성립 |
| AC-PERM-011 | REQ-PERM-009 | 아래 본문 | 봇 오프라인 시 결과 system 본문이 온라인 시 본문과 **다르고** 실패 표식을 담음 + 재시도가 소비되지 않음 |
| AC-PERM-012 | REQ-PERM-005 (정규식 계약) | 아래 본문 | 판정어 네 갈래(`y`/`yes`/`n`/`no`)가 모두 덮이고, `Y ABCDE` 는 소문자로 전달, `yes abcdl` 은 소비되지 않음 |
| AC-PERM-013 | REQ-PERM-013, REQ-PERM-014 | 아래 본문 | 기준 SHA 확인 종료 코드 `0`, `db.ts` diff 빈 출력, 변경 파일 목록이 정확히 세 줄 |
| AC-PERM-014 | RED→GREEN 전이 | 아래 본문 | 네 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-PERM-001 — 승인 요청이 방에 뜬다

**Given** 활성 방과 그 방에 초대된 봇이 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/permissions.test.ts > ` 로 시작해 ` > gateway request creates a system message in the room` 으로 끝나는 줄(끝에 붙는 소요 시간 제외)이 나타난다. 그 줄이 없으면 **실패**다.

그 테스트는 `plan-v2.md` Task 10 원본이며 다음을 단언한다 — `broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'Run shell command', input_preview: 'rm -rf tmp' })` 뒤에 `author_type='system'` 행이 생기고, 그 `body` 가 `'abcde'` 와 `'Bash'` 를 모두 포함한다.

### AC-PERM-002 — system 메시지가 사람이 따라 칠 수 있는 안내를 담는다

**Given** 승인 요청 하나가 도착했다.
**When** `server/test/permissions.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('system message carries all four parts and both reply forms', async () => {
  const { broker } = await build()
  const { roomId, botId } = seedRoomAndBot()
  broker.onGatewayRequest({ roomId, botId }, {
    request_id: 'abcde', tool_name: 'Bash', description: '셸 명령을 실행합니다', input_preview: 'rm -rf tmp',
  })
  const row = db.prepare("SELECT body FROM messages WHERE author_type='system'").get() as { body: string }
  expect(row.body).toContain('Bash')
  expect(row.body).toContain('셸 명령을 실행합니다')
  expect(row.body).toContain('rm -rf tmp')
  expect(row.body).toContain('yes abcde')
  expect(row.body).toContain('no abcde')
})
```

**Then** 테스트가 통과한다. 네 조각이 모두 들어 있고, 승인·거절 두 형태가 **그 요청의 실제 `request_id` 와 함께** 문자열로 들어 있다.

`yes abcde` / `no abcde` 를 단언하는 부분이 이 기준의 핵심이다. 안내 줄을 `yes <ID>` 처럼 자리표시자 그대로 두면 사람이 무엇을 쳐야 하는지 알 수 없는데, 그런 구현은 이 단언에서 걸린다. 카드 `t5` 의 UI 가 이 문자열을 정규식으로 찾아 빠른 승인 버튼을 붙이므로(`plan-v2.md` `app.js`) 형식이 계약이다.

### AC-PERM-003 — 요청이 SSE 로 브라우저에 전파된다

**Given** 브라우저가 그 방의 SSE 스트림을 구독하고 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('publishes the request to the room SSE stream', async () => {
  const { broker, port, cookie } = await build()
  const { roomId, botId } = seedRoomAndBot()
  const reader = await openStream(port, cookie, roomId)
  expect(await readFrame(reader)).toContain('connected')   // 연결 확인 주석을 먼저 소비한다

  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  const frame = await readFrame(reader)
  expect(frame).toContain('event: message')
  expect(frame).toContain('abcde')
})
```

**Then** 테스트가 통과한다. `hub.publish` 를 부르지 않는 구현에서는 두 번째 `readFrame` 이 걸린 채 vitest 기본 타임아웃으로 **실패**한다 — 통과할 다른 길이 없다. 새 이벤트 이름을 만든 구현도 `event: message` 단언에서 걸린다(REQ-PERM-013).

> **v0.2.0 교정 기록 (MF-1).** 이전 판은 스트림을 열자마자 `reader.read()` 를 **한 번만** 하고 그 청크에 `event: message` 가 있기를 기대했다. `subscribe` 는 `SPEC-SSE-001` `REQ-SSE-002` 에 따라 `: connected\n\n` 을 먼저 쓰므로 첫 청크는 그 주석이고, **브로커가 완벽해도 이 기준은 실패한다.** 감사자가 Node v24.12.0 에서 같은 형태의 서버로 재현해 첫 청크가 정확히 `": connected\n\n"` 임을 관측했다. 두 쓰기가 우연히 한 TCP 세그먼트로 합쳐질 때만 통과하므로 최선의 경우에도 간헐 결함이었다. 공허한 기준의 반대 방향 — **정상 구현을 거짓 실패시키는** 기준 — 이라 부류 훑기에서 걸러지지 않았고, 그래서 여기 따로 적어 둔다.

### AC-PERM-004 — 승인 판정이 실제로 봇 소켓에 도달한다

**Given** 그 방의 봇이 게이트웨이에 접속해 있고 승인 요청 하나가 대기 중이다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('delivers an allow verdict to the connected bot', async () => {
  const { app, broker, port, cookie } = await build()
  const { roomId, botId, token } = seedRoomAndBot()
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  const seen = nextMessage(ws)
  await post(app, roomId, cookie, 'yes abcde')
  expect(await seen).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
})
```

**Then** 테스트가 통과한다. 관측되는 것은 **봇 소켓이 실제로 받은 payload 전체**다 — 브로커가 `true` 를 돌려주었다거나 예외가 없었다는 것이 아니다. `sendToBot` 호출을 빠뜨린 구현에서는 `seen` 이 `null` 이라 `toEqual` 이 실패한다.

### AC-PERM-005 — 거절 판정이 거절로서 도달한다

**Given** AC-PERM-004 와 같은 상태다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('delivers a deny verdict as deny, not as allow', async () => {
  const { app, broker, port, cookie } = await build()
  const { roomId, botId, token } = seedRoomAndBot()
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  const seen = nextMessage(ws)
  await post(app, roomId, cookie, 'no abcde')
  const v = await seen
  expect(v).not.toBeNull()
  expect(v.behavior).toBe('deny')          // 항상 allow 를 보내는 구현은 여기서 걸린다
  expect(v.request_id).toBe('abcde')
})
```

**Then** 테스트가 통과한다. `behavior` 값을 **직접** 단언하는 것이 이 기준의 존재 이유다. "판정이 도착했다"만 보는 기준은 판정어를 아예 읽지 않는 구현도 통과시킨다 — 승인이 되어야 할 자리에서 거절이, 거절이 되어야 할 자리에서 승인이 나가도 조용하다. 이 SPEC 에서 가장 비싼 오작동이라 기준을 따로 세웠다.

### AC-PERM-006 — 소비된 답은 대화로 저장되지 않는다

**Given** 승인 요청 하나가 대기 중이다. 봇은 접속하지 않았다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('consumes the reply instead of storing it as a user message', async () => {
  const { app, broker, cookie } = await build()
  const { roomId, botId } = seedRoomAndBot()
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  const res = await post(app, roomId, cookie, 'yes abcde')
  expect(res.json().consumed_by).toBe('permission')
  const c = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as { c: number }
  expect(c.c).toBe(0)
})
```

**Then** 테스트가 통과한다 — 응답이 소비를 밝히고, 사용자 메시지 행이 하나도 생기지 않았다.

`plan-v2.md` Task 10 원본 테스트와 같은 단언이지만, 원본 `build()` 는 `app.decorate('permissions', broker)` 를 빠뜨려 이 테스트가 **구현이 옳아도 실패**한다. 라우트 쪽 호출이 `(app as any).permissions?.tryHandleUserReply(...)` 라 데코레이터가 없으면 옵셔널 체이닝이 조용히 `undefined` 를 내고, 답은 평범한 메시지로 저장되어 `c.c` 가 `1` 이 된다. 하네스에서 그 줄을 채운 이유이며 경위는 `plan.md` §D 1번에 있다.

### AC-PERM-007 — 판정은 1회용이다

**Given** 같은 `request_id` 에 두 번 답한다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('accepts a verdict once and lets a repeat fall through as chat', async () => {
  const { app, broker, port, cookie } = await build()
  const { roomId, botId, token } = seedRoomAndBot()
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  const first = nextMessage(ws)
  await post(app, roomId, cookie, 'yes abcde')
  expect((await first).behavior).toBe('allow')

  const second = nextMessage(ws)
  const res = await post(app, roomId, cookie, 'yes abcde')
  expect(res.json().consumed_by).toBeUndefined()
  expect(await second).toBeNull()                       // 두 번째 판정은 가지 않는다
  const c = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as { c: number }
  expect(c.c).toBe(1)                                   // 두 번째 답은 대화로 저장됐다
})
```

**Then** 테스트가 통과한다. 대기 항목을 지우지 않는 구현은 두 번째 판정을 보내므로 `toBeNull()` 에서 걸리고, 저장 행 수도 `0` 이 되어 두 번 걸린다.

### AC-PERM-008 — 다른 방의 답은 판정이 되지 않는다

**Given** 방 A 에 승인 요청이 대기 중이고, 같은 사람이 방 B 에도 접근할 수 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('never resolves a request from a different room', async () => {
  const { app, broker, port, cookie } = await build()
  const a = seedRoomAndBot('A', 'pm')
  const b = seedRoomAndBot('B', 'qa')
  const ws = await wsConnect(port, a.token)
  broker.onGatewayRequest({ roomId: a.roomId, botId: a.botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

  const leaked = nextMessage(ws)
  const cross = await post(app, b.roomId, cookie, 'yes abcde')   // 방 B 에서 답한다
  expect(cross.json().consumed_by).toBeUndefined()
  expect(await leaked).toBeNull()                                 // 방 A 의 봇에게 아무것도 가지 않았다

  const proper = nextMessage(ws)
  await post(app, a.roomId, cookie, 'yes abcde')                  // 대기 항목은 살아 있어야 한다
  expect((await proper).behavior).toBe('allow')
})
```

**Then** 테스트가 통과한다. 세 가지가 함께 관측된다 — 다른 방의 답은 소비되지 않고, 판정이 봇에 **가지 않으며**, 그 실패가 대기 항목을 소모하지도 않아 원래 방에서 여전히 판정할 수 있다.

`info.roomId !== roomId` 검사를 빼먹은 구현은 두 번째 단언에서 걸린다. 그 검사를 넣되 대기 항목을 지워 버리는 구현은 세 번째에서 걸린다.

### AC-PERM-009 — 로그인하지 않은 요청은 판정할 수 없다 (부정 사례)

**Given** 승인 요청이 대기 중이고, 쿠키 없는 요청이 들어온다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('refuses an unauthenticated verdict and leaves the request pending', async () => {
  const { app, broker, port, cookie } = await build()
  const { roomId, botId, token } = seedRoomAndBot()
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

  const leaked = nextMessage(ws)
  const form = new FormData(); form.append('body', 'yes abcde')
  const anon = await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/messages`, payload: form })  // 쿠키 없음
  expect(anon.statusCode).toBe(401)
  expect(await leaked).toBeNull()                       // 판정이 봇에 가지 않았다

  const proper = nextMessage(ws)
  await post(app, roomId, cookie, 'yes abcde')          // 대기 항목은 손상되지 않았다
  expect((await proper).behavior).toBe('allow')
})
```

**Then** 테스트가 통과한다. 단언의 무게는 `401` 이 아니라 **판정이 가지 않았다**는 부정 관측에 있다. 가로채기를 `requireAuth` 앞에 두거나 라우트 밖으로 빼면 상태 코드는 그대로여도 판정이 새어 나가는데, `toBeNull()` 이 그것을 잡는다.

이 시스템에 방 멤버십 모델이 없으므로(`spec.md` §5) 이 기준이 거는 경계는 로그인 하나다. 방 단위 격리는 AC-PERM-008 이 맡는다.

### AC-PERM-010 — 판정이 아닌 텍스트는 흘려보내되, 대기 항목은 살아남는다

**Given** 대기 항목 `abcde` 가 하나 있고, 봇이 접속해 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('falls through non-matching text and unknown ids without touching the pending request', async () => {
  const { app, broker, port, cookie } = await build()
  const { roomId, botId, token } = seedRoomAndBot()
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })

  const leaked = nextMessage(ws)
  const plain = await post(app, roomId, cookie, '그냥 대화')
  expect(plain.json().consumed_by).toBeUndefined()
  const unknown = await post(app, roomId, cookie, 'yes xxxxx')      // 형식은 맞으나 모르는 ID
  expect(unknown.json().consumed_by).toBeUndefined()
  expect(await leaked).toBeNull()                                    // 어느 쪽도 판정을 보내지 않았다

  const c = db.prepare("SELECT COUNT(*) c FROM messages WHERE author_type='user'").get() as { c: number }
  expect(c.c).toBe(2)                                                // 둘 다 대화로 저장됐다

  const seen = nextMessage(ws)
  const real = await post(app, roomId, cookie, 'yes abcde')          // 대기 항목은 소모되지 않았다
  expect(real.json().consumed_by).toBe('permission')
  expect((await seen).behavior).toBe('allow')
})
```

**Then** 테스트가 통과한다. 네 가지가 함께 관측된다 — 두 텍스트 모두 소비되지 않고, 어느 쪽도 판정을 봇에 보내지 않았으며, 둘 다 대화로 **저장됐고**, 그러고도 진짜 판정이 여전히 성립한다.

마지막 두 단언이 이 기준의 존재 이유다. 앞의 두 단언만으로는 **가로채기가 통째로 없는 구현**도 통과한다 — 부정 기준의 기대값(`consumed_by` 없음)이 정상 경로의 기본값과 같기 때문이다. 저장 행 수 `2` 는 항상 `true` 를 돌려주는 껍데기를 잡고, 마지막 `consumed_by === 'permission'` 은 항상 `false` 를 돌려주는 껍데기와 배선이 없는 구현을 잡는다.

> **v0.2.0 교정 기록 (MF-2).** 이전 판은 `plan-v2.md` Task 10 원본 테스트 두 개(`non-matching text is not consumed`, `yes with unknown id is not consumed (falls through as chat)`)의 `✓` 줄이 나타나는가만 보았다. 그 두 테스트가 실제로 단언하는 것은 `expect(res.json().ok).toBe(true)` **하나뿐**이라, `tryHandleUserReply` 가 항상 `false` 인 껍데기 — `plan.md` §F M1 단계 3 이 만드는 바로 그 중간 상태 — 에서도, 가로채기가 라우트에 아예 없어도 통과했다. 이 카드가 막으려던 공허한 기준 부류 그 자체다.
>
> 더해서 이전 판의 서술("평범한 메시지로 **저장되며** 응답이 `ok: true` 임을 단언한다")은 원본 테스트에 없는 저장 단언을 있다고 적어, 원본의 검증력을 실제보다 크게 서술했다. 이 문서 서두의 자기 선언과도 어긋났다. 서술을 낮추는 대신 **기준 자체를 올려** 고쳤다 — 서술만 고치면 정확성만 회복하고 검증력은 그대로다.
>
> 원본 두 테스트는 `plan.md` §F M2 단계 1 에 따라 파일에 그대로 남지만, 이 기준의 **판정 관측 대상은 아니다.** 그 둘은 원본 계약의 회귀 방지선일 뿐이고, REQ-PERM-010 의 검증은 위 테스트가 진다.

### AC-PERM-011 — 봇이 끊긴 채 판정하면 그 사실이 드러난다

**Given** 승인 요청이 대기 중이고, 그 봇의 게이트웨이 연결이 없다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('marks an undelivered verdict differently from a delivered one', async () => {
  const { app, broker, port, cookie } = await build()
  const on = seedRoomAndBot('A', 'pm')
  const off = seedRoomAndBot('B', 'qa')
  const ws = await wsConnect(port, on.token)                       // A 의 봇만 접속

  broker.onGatewayRequest({ roomId: on.roomId, botId: on.botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  broker.onGatewayRequest({ roomId: off.roomId, botId: off.botId }, { request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  await post(app, on.roomId, cookie, 'yes abcde')
  await post(app, off.roomId, cookie, 'yes fghij')

  const delivered = db.prepare("SELECT body FROM messages WHERE room_id=? AND author_type='system' ORDER BY id DESC LIMIT 1").get(on.roomId) as { body: string }
  const dropped = db.prepare("SELECT body FROM messages WHERE room_id=? AND author_type='system' ORDER BY id DESC LIMIT 1").get(off.roomId) as { body: string }
  expect(delivered.body).toContain('abcde')
  expect(dropped.body).toContain('fghij')
  expect(dropped.body).not.toBe(delivered.body.replace('abcde', 'fghij'))   // 두 결과 문구가 서로 다르다
  expect(dropped.body).toContain('전달하지 못했습니다')                       // 실패를 뜻하는 표식을 담는다

  const retry = await post(app, off.roomId, cookie, 'yes fghij')            // 대기 항목은 이미 해제됐다
  expect(retry.json().consumed_by).toBeUndefined()
})
```

**Then** 테스트가 통과한다. 세 가지가 관측된다 — 전달된 판정과 전달되지 못한 판정의 결과 문구가 `request_id` 를 맞춘 뒤에도 **서로 다르고**, 실패 쪽 본문이 실패를 뜻하는 표식을 **양성으로** 담으며, 전달 실패였더라도 대기 항목은 이미 소모되어 재시도가 소비되지 않는다.

`toContain('전달하지 못했습니다')` 가 양성 단언이다. "성공 문구와 다르다"만으로는 실패 쪽 문구가 무엇이든 — 빈 문자열이든, 사람이 읽고 실패인지 알 수 없는 문구든 — 통과한다. `plan.md` §C 가 확정한 문구(`⚠️ 봇이 접속해 있지 않아 판정을 전달하지 못했습니다 (<request_id>)`)의 핵심 어절을 직접 잰다.

`sendToBot` 의 반환값을 버리는 원본 구현은 두 문구가 같아져 첫 단언에서 걸린다. `spec.md` REQ-PERM-009 가 원본에서 의도적으로 벗어난 자리이며 근거는 `plan.md` §D 3번에 있다.

### AC-PERM-012 — 정규식 계약을 지킨다 (판정어 네 갈래 전부)

**Given** 대기 항목 `abcde` 와 `fghij` 가 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('accepts all four verdict words, normalizes case, and rejects ids containing l', async () => {
  const { app, broker, port, cookie } = await build()
  const { roomId, botId, token } = seedRoomAndBot()
  const ws = await wsConnect(port, token)
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
  broker.onGatewayRequest({ roomId, botId }, { request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' })

  const bad = await post(app, roomId, cookie, 'yes abcdl')        // l 은 식별자 문자가 아니다
  expect(bad.json().consumed_by).toBeUndefined()

  const allow = nextMessage(ws)
  const y = await post(app, roomId, cookie, '  Y ABCDE  ')        // 승인 축약형 + 대문자 + 공백
  expect(y.json().consumed_by).toBe('permission')
  expect(await allow).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })

  const deny = nextMessage(ws)
  const n = await post(app, roomId, cookie, 'N FGHIJ')            // 거절 축약형 + 대문자
  expect(n.json().consumed_by).toBe('permission')
  expect(await deny).toEqual({ type: 'permission_verdict', request_id: 'fghij', behavior: 'deny' })
})
```

**Then** 테스트가 통과한다. `text.startsWith('yes ')` 같은 구현은 `Y` 갈래에서, `l` 을 허용하도록 정규식을 완화한 구현은 첫 갈래에서 걸린다. 전달된 `request_id` 가 소문자로 정규화됐다는 것도 함께 관측된다 — 대문자 그대로 보내면 봇 쪽이 자기 요청을 못 알아본다.

**판정어 네 갈래가 이 문서 안에서 모두 덮인다** — `yes` 는 AC-PERM-004, `no` 는 AC-PERM-005, 축약형 `y` 와 `n` 은 여기다. 축약형 두 개가 서로 다른 `behavior` 로 가는 것을 한 테스트에서 함께 재므로, `startsWith('y')` 로 둘을 뭉뚱그린 구현이 걸린다 (v0.2.0 교정 — NH-4).

### AC-PERM-013 — 범위 경계

**Given** M1 단계 0 에서 `spec_base_sha` 를 기록해 두었다.
**When** 다음 네 명령을 순서대로 실행한다.

```bash
SHA=$(cat .moai/specs/SPEC-PERM-001/.spec-base-sha)
git rev-parse --verify "$SHA^{commit}"
git diff --stat "$SHA" -- server/src/db.ts
git diff --name-only "$SHA" -- server/src
```

**Then** 네 가지가 모두 관측된다.

1. `git rev-parse --verify` 가 **종료 코드 `0`** 으로 SHA 를 출력한다. 이 확인이 먼저다 — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비우므로, 빈 출력만 보고 통과로 적으면 검사가 통째로 무력해진다.
2. `git diff --stat ... db.ts` 가 **종료 코드 `0`** 이면서 출력이 **비어 있다** (REQ-PERM-014).
3. `git diff --name-only ... server/src` 의 출력이 정확히 세 줄이고, 정렬하면 `server/src/index.ts`, `server/src/permissions.ts`, `server/src/routes-messages.ts` 다 (REQ-PERM-013).
4. 그 목록에 `gateway.ts`·`sse.ts`·`routes-rooms.ts`·`routes-bots.ts`·`mention.ts` 가 **없다**. 선행 SPEC 소유 파일을 이 SPEC 에서 고치지 않았다는 뜻이다.

### AC-PERM-014 — RED→GREEN 전이

**Given** 각 마일스톤이 테스트를 먼저 쓴다.
**When** `plan.md` §F 의 마일스톤 절차를 따라 실행하고 각 단계 출력을 `progress.md` §E.2 에 원문으로 남긴다.
**Then** 네 전이가 순서대로 관측된다.

| 전이 | 시점 | 관측할 결과 |
|------|------|-------------|
| 1 (RED) | M1 테스트 작성 직후 | `npm test -w server` 실패, 사유가 `Cannot find module '../src/permissions.js'` |
| 2 (GREEN) | M1 구현 후 | `npm test -w server` 통과 + `npm run typecheck -w server` 종료 코드 `0` |
| 3 (RED) | M2 테스트 작성 직후 | `npm test -w server` 실패, 사유가 새 단언 실패 (모듈 부재가 **아님**) |
| 4 (GREEN) | M2 구현 후 | `npm test -w server` 전체 통과 + typecheck 종료 코드 `0` |

전이 3 의 실패 사유를 구분해 적는 것이 이 기준의 핵심이다. 모듈 부재로 실패한 것을 RED 로 적으면 그 마일스톤의 테스트가 실제로 무엇을 재는지 아무도 확인하지 않은 채 넘어간다.

---

## 엣지 케이스

| 상황 | 기대 동작 | 덮는 기준 |
|------|-----------|-----------|
| 같은 봇이 판정 전에 두 번째 승인 요청을 보낸다 | 두 `request_id` 가 각각 독립적으로 대기한다. 하나를 판정해도 다른 하나는 남는다 | AC-PERM-011 (두 요청 병존 상태에서 각각 판정) |
| 답 문자열 앞뒤에 공백이 있다 | 정규식 `^\s*` / `\s*$` 로 흡수해 소비한다 | AC-PERM-012 |
| 답이 `yes abcde 추가 문장` 처럼 뒤에 말이 붙는다 | 정규식이 `$` 로 끝나므로 소비하지 않고 대화로 저장한다 | AC-PERM-010 (형식 불일치 갈래) |
| 답과 함께 파일이 첨부된다 | 가로채기가 multipart 파싱 **뒤**라 파일은 이미 디스크에 저장된 상태로 소비된다. 첨부는 어느 메시지에도 붙지 않는다 | 미검증 — `plan.md` §E 알려진 위험에 기록 |
| 보관된 방에 온 답 | 라우트가 활성 방 확인에서 먼저 걸러 `403`. 가로채기까지 오지 않는다 | 미검증 — 라우트 소유 SPEC 의 기존 동작 |
| 서버 재시작 후 답 | 대기 레지스트리가 비어 있어 소비되지 않고 대화로 저장된다 (REQ-PERM-003 수용) | AC-PERM-010 (모르는 ID 갈래와 같은 경로) |
| 봇이 판정 직전에 끊긴다 | `sendToBot` 이 `false` → 결과 문구가 전달 실패를 밝힌다 | AC-PERM-011 |

## 품질 게이트

| 항목 | 기준 |
|------|------|
| 타입 검사 | `npm run typecheck -w server` 종료 코드 `0` |
| 테스트 | `npm test -w server` 전체 통과. `permissions.test.ts` 의 실패 0건 |
| 범위 경계 | AC-PERM-013 의 네 관측 모두 통과 |
| 데이터 격리 | 테스트가 저장소의 `data/` 에 아무것도 쓰지 않는다 — `git status --porcelain data/` 가 빈 출력 |
| 커밋 | `feat:` / `test:` 관례, 마일스톤마다 한 번 |

## Definition of Done

- AC-PERM-001 부터 AC-PERM-014 까지 **전부** 통과했고, 각 명령의 원문 출력이 `progress.md` §E.2 에 남았다.
- 요구사항 REQ-PERM-001..014 각각이 최소 하나의 AC 에 매핑돼 있고, 그 매핑이 `progress.md` §E.1 에 표로 남았다.
- 미검증 항목(엣지 케이스 표의 "미검증" 두 줄 포함)이 §E.2 의 Gaps 절에 명시적으로 기록됐다.
- `spec.md` §5 에 기록한 네 개의 범위 밖 항목(전용 엔드포인트·멤버십·타임아웃·연결 해제 정리)에 대해 리드의 판정을 받았거나, 받지 못했다면 그 사실이 §E.2 에 남았다.
