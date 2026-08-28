# SPEC-SSE-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 디렉터리의 `plan.md` 와 `spec.md` 는 초기 커밋(`edd982e`)에 담긴 **폐기된 v1** 이며 이 SPEC 의 참조 대상이 아니다.

이 SPEC 은 `SPEC-CORE-001`·`SPEC-AUTH-001`·`SPEC-ROOM-001` 이 먼저 끝난 상태를 전제한다.

---

## 이 문서가 지키려는 것 — 빈 구현으로 통과하는 기준을 두지 않는다

카드 `t2` 에서 같은 결함이 세 번 재생산됐다. **구현 본문이 비어 있어도 통과하는 수용 기준**이다. 흔한 형태 셋이 있다.

1. **존재만 보는 기준** — "파일이 있다", "함수가 export 돼 있다". 빈 함수도 export 된다.
2. **이름 없이 통과만 보는 기준** — "테스트 스위트가 통과한다". 테스트를 하나도 안 쓴 실행도 종료 코드 `0` 이다.
3. **부재를 보는 기준** — "누수가 없다", "다른 방에 안 간다". 아무 일도 일어나지 않는 구현이 가장 잘 통과한다.

세 번째가 이 SPEC 에서 가장 위험하다. 이 SPEC 의 핵심 성질 두 개(방 격리, 구독자 정리)가 정확히 그 모양이기 때문이다. 그래서 두 성질을 **부재가 아니라 존재**로 다시 썼다.

| 성질 | 부재로 쓴 기준 (금지) | 존재로 쓴 기준 (채택) |
|------|----------------------|----------------------|
| 방 격리 | "방 2 로 발행한 이벤트가 방 1 구독자에게 오지 않는다" | 방 2 로 먼저 발행하고 방 1 로 나중에 발행한 뒤, 방 1 구독자가 받는 **다음 프레임이 방 1 것**임을 단언 (AC-SSE-003) |
| 구독자 정리 | "구독자가 누수되지 않는다" | 구독 직후 `subscriberCount` 가 **`1`**, 연결이 끊긴 뒤 **`0`** — 두 값 모두 관측 (AC-SSE-006) |

**작성 후 훑기.** 이 문서를 마치기 전에 모든 기준을 다시 읽고 한 가지만 물었다 — "본문이 비어 있는 구현에서도 이 기준이 통과하는가?" 통과하는 기준은 남기지 않았다. AC-SSE-007(구독자 없는 방 발행)만은 단독으로는 빈 구현에서도 통과할 수 있어서, **같은 테스트 안에 실제 전달 단언을 함께 넣어** 전체가 빈 구현에서 실패하게 만들었다.

---

## 공통 테스트 골격

아래 시나리오들이 공유하는 헬퍼다. `server/test/sse.test.ts` 상단에 한 번 둔다.

```ts
import { describe, it, expect, afterEach } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSseHub } from '../src/sse.js'
import { registerAuthRoutes, requireAuth } from '../src/auth.js'
import { openDb } from '../src/db.js'

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { for (const c of cleanups.splice(0)) await c() })

// light-my-request 는 set-cookie 를 배열이 아니라 문자열 하나로 돌려준다.
// 원본 plan-v2.md 의 headers['set-cookie']![0] 은 그 문자열의 첫 글자 'm' 을 집어내므로
// 그대로 쓰면 requireAuth 가 전부 401 을 낸다 — 이미 머지된 rooms-bots.test.ts:21-26 과 같은 정규화.
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}

// 실제 HTTP 서버를 띄운다. SSE 는 응답이 끝나지 않으므로 app.inject 로 검증할 수 없다.
async function startServer() {
  const dir = mkdtempSync(join(tmpdir(), 'md-sse-'))
  const app = Fastify({ logger: false })
  app.db = openDb(join(dir, 't.db'))
  await app.register(cookie)
  registerAuthRoutes(app, app.db)
  const hub = createSseHub()
  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
    reply.hijack()   // Fastify 가 자기 응답을 보내지 않게 소켓 소유권을 넘긴다
    hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'u', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'u', password: 'pw123456' } })
  const ck = setCookieOf(login).split(';')[0]
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  cleanups.push(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }) })
  return { app, hub, cookie: ck, port }
}

// 이벤트 스트림을 연다. abort() 로 클라이언트 쪽 연결을 끊을 수 있다.
async function openStream(port: number, ck: string, roomId: number) {
  const ac = new AbortController()
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms/${roomId}/events`,
    { headers: { cookie: ck }, signal: ac.signal })
  const reader = res.body!.getReader()
  cleanups.push(() => { ac.abort() })
  return { res, reader, abort: () => ac.abort() }
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

// 조건이 참이 될 때까지 기다린다. close 이벤트는 비동기라 고정 sleep 은 불안정하다.
async function waitFor(fn: () => boolean, ms = 2000): Promise<boolean> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (fn()) return true
    await new Promise(r => setTimeout(r, 10))
  }
  return false
}
```

`readFrame` 이 프레임을 못 받으면 `reader.read()` 에서 멈추고 vitest 테스트 타임아웃(기본 5초)으로 실패한다. **빈 `publish` 구현에서 이 기준들이 실패하는 경로가 그것이다** — 통과할 다른 길이 없다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-SSE-001 | REQ-SSE-005 | 아래 본문 참조 | 발행 후 구독자가 `event: message` + `"id":7` 프레임을 실제로 받음 |
| AC-SSE-002 | REQ-SSE-002 | 아래 본문 참조 | 헤더 세 개가 모두 규정값, 첫 프레임이 `: connected\n\n` |
| AC-SSE-003 | REQ-SSE-006 | 아래 본문 참조 | 방 2 → 방 1 순서로 발행했을 때 방 1 구독자가 받는 다음 프레임이 방 1 것 |
| AC-SSE-004 | REQ-SSE-005 (프레임 형식) | 아래 본문 참조 | 받은 프레임이 `event: message\ndata: {"id":7}\n\n` 와 **정확히 일치** |
| AC-SSE-005 | REQ-SSE-005 (다중 구독자) | 아래 본문 참조 | `subscriberCount(1)` 이 `2`, 구독자 둘 다 같은 프레임 수신 |
| AC-SSE-006 | REQ-SSE-008 | 아래 본문 참조 | `subscriberCount(1)` 이 구독 직후 `1`, 연결 종료 후 `0` — **두 값 모두** |
| AC-SSE-007 | REQ-SSE-007 | 아래 본문 참조 | 빈 방 발행이 던지지 않고 `subscriberCount` 를 늘리지 않으며, 같은 테스트의 실제 전달이 성립 |
| AC-SSE-008 | REQ-SSE-004 | 아래 본문 참조 | 쿠키 없는 요청이 `401`, `content-type` 이 `text/event-stream` 이 **아님** |
| AC-SSE-009 | REQ-SSE-003 | 아래 본문 참조 | `buildServer()` 가 띄운 실제 서버에서 스트림이 열리고 발행이 도달 |
| AC-SSE-010 | REQ-SSE-010, REQ-SSE-011 | 아래 본문 참조 | `server/src` 에 `sse.ts` 존재, 기준 SHA 확인 exit `0`, `db.ts` diff exit `0`+빈 출력, 변경 파일이 `index.ts`+`sse.ts` **정확히 두 줄** |
| AC-SSE-011 | RED→GREEN 전이 | 아래 본문 참조 | 두 전이가 순서대로 관측됨 |
| AC-SSE-012 | REQ-SSE-009, 제약(순수 메모리) | 아래 본문 참조 | `sse.ts` 의 import 가 정확히 한 줄이고 그 줄이 `node:http` 타입 import, `setInterval`/`retry:`/`id:` 부재 |

---

## Given-When-Then 시나리오

### AC-SSE-001 — 발행한 이벤트가 그 방 구독자에게 실제로 도달한다

**Given** 로그인한 사용자가 방 `1` 의 이벤트 스트림을 열고 있다.
**When** `server/test/sse.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('delivers a published event to the room subscriber', async () => {
  const { hub, cookie: ck, port } = await startServer()
  const { reader } = await openStream(port, ck, 1)
  expect(await readFrame(reader)).toContain('connected')

  hub.publish(1, 'message', { id: 7 })
  const frame = await readFrame(reader)
  expect(frame).toContain('event: message')
  expect(frame).toContain('"id":7')
})
```

**Then** 테스트가 통과한다.

`publish` 본문이 비어 있으면 두 번째 `readFrame` 이 프레임을 받지 못해 `reader.read()` 에서 멈추고, vitest 테스트 타임아웃으로 **실패**한다. `subscribe` 가 구독자를 등록하지 않아도 같은 경로로 실패한다. 이 기준은 두 메서드가 실제로 연결돼 있을 때만 통과한다.

### AC-SSE-002 — 구독 응답 헤더와 연결 확인 주석

**Given** 스트림을 막 열었다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('opens the stream with SSE headers and a connected comment', async () => {
  const { cookie: ck, port } = await startServer()
  const { res, reader } = await openStream(port, ck, 1)

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toContain('text/event-stream')
  expect(res.headers.get('cache-control')).toContain('no-cache')
  expect(res.headers.get('connection')).toContain('keep-alive')
  expect(await readFrame(reader)).toBe(': connected\n\n')
})
```

**Then** 테스트가 통과한다 — 헤더 세 개가 모두 규정값이고, 첫 프레임이 `: connected\n\n` 와 정확히 일치한다.

`subscribe` 가 `writeHead` 를 생략하면 Fastify 기본 `content-type`(`application/json` 또는 미설정)이 나와 첫 단언에서 실패한다. `: connected` 를 안 쓰면 `readFrame` 이 멈춰 타임아웃으로 실패한다. `toBe` 를 쓴 이유는 여기에 하트비트나 다른 프리앰블을 끼워 넣으면 즉시 드러나게 하기 위해서다 (REQ-SSE-009).

### AC-SSE-003 — 방 격리를 도착 순서로 관측한다

**Given** 구독자는 방 `1` 하나만 보고 있고, 방 `2` 에도 이벤트가 발행된다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('never leaks another room event into this room stream', async () => {
  const { hub, cookie: ck, port } = await startServer()
  const { reader } = await openStream(port, ck, 1)
  expect(await readFrame(reader)).toContain('connected')

  hub.publish(2, 'message', { room: 2 })   // 이 방 구독자에게 오면 안 된다
  hub.publish(1, 'message', { room: 1 })   // 이것이 와야 한다

  const frame = await readFrame(reader)
  expect(frame).toBe('event: message\ndata: {"room":1}\n\n')
})
```

**Then** 테스트가 통과한다 — 방 `1` 구독자가 받는 **다음 프레임**이 방 `1` 것이다.

**이 단언이 이 기준의 전부다.** 발행 순서가 `2` 먼저이므로, 허브가 전역 브로드캐스트라면 다음 프레임은 `{"room":2}` 가 되어 `toBe` 가 실패한다. 흔히 쓰이는 "발행하고 100ms 기다린 뒤 아무 단언 없이 리더를 닫는" 형태는 **아무것도 검사하지 않는다** — 전역 브로드캐스트 구현도, 발행이 아예 없는 구현도 똑같이 통과한다. 원본 `plan-v2.md` Task 7 의 테스트가 그 형태였고, 여기서 순서 단언으로 바꿨다(`plan.md` §D 3번).

### AC-SSE-004 — 프레임 형식이 정확히 일치한다

**Given** 이벤트 하나가 발행됐다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('frames events exactly as event/data/blank-line', async () => {
  const { hub, cookie: ck, port } = await startServer()
  const { reader } = await openStream(port, ck, 1)
  await readFrame(reader)

  hub.publish(1, 'message', { id: 7 })
  expect(await readFrame(reader)).toBe('event: message\ndata: {"id":7}\n\n')

  hub.publish(1, 'bot_status', { bot_id: 3, state: 'working' })
  expect(await readFrame(reader)).toBe('event: bot_status\ndata: {"bot_id":3,"state":"working"}\n\n')
})
```

**Then** 테스트가 통과한다 — 두 이벤트명 모두 같은 형식으로 나가고, 문자열이 바이트 단위로 일치한다.

`toContain` 이 아니라 `toBe` 인 이유: 끝의 빈 줄(`\n\n`)이 없으면 브라우저 `EventSource` 는 이벤트를 방출하지 않는데, `toContain('event: message')` 는 그 결함을 통과시킨다. `data:` 뒤 공백 하나가 빠져도 마찬가지다. Task 11 의 웹 UI 가 이 형식에 결합하므로 여기서 바이트로 못 박는다.

두 이벤트명(`message`, `bot_status`)을 함께 보는 이유는 `plan-v2.md` Task 7 이 그 둘을 이후 태스크에서 쓴다고 명시하기 때문이다.

### AC-SSE-005 — 한 방의 구독자 여럿이 모두 받는다

**Given** 같은 방에 브라우저 탭 두 개가 붙어 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('delivers to every subscriber of the room', async () => {
  const { hub, cookie: ck, port } = await startServer()
  const a = await openStream(port, ck, 1)
  const b = await openStream(port, ck, 1)
  await readFrame(a.reader)
  await readFrame(b.reader)

  expect(await waitFor(() => hub.subscriberCount(1) === 2)).toBe(true)

  hub.publish(1, 'message', { id: 7 })
  expect(await readFrame(a.reader)).toBe('event: message\ndata: {"id":7}\n\n')
  expect(await readFrame(b.reader)).toBe('event: message\ndata: {"id":7}\n\n')
})
```

**Then** 테스트가 통과한다 — 구독자 수가 `2` 이고, 두 리더가 모두 같은 프레임을 받는다.

집합이 아니라 방당 응답 하나만 들고 있는 구현(나중 구독이 앞 구독을 덮어쓰는 형태)은 `subscriberCount` 가 `1` 이 되어 첫 단언에서, 혹은 `a.reader` 가 프레임을 못 받아 타임아웃으로 실패한다.

### AC-SSE-006 — 연결이 끊기면 구독자가 실제로 사라진다

**Given** 방 `1` 에 구독자가 하나 있고, 그 연결이 곧 끊긴다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('removes the subscriber when the connection closes', async () => {
  const { hub, cookie: ck, port } = await startServer()
  const s = await openStream(port, ck, 1)
  await readFrame(s.reader)

  // 구독 직후: 반드시 1 이어야 한다
  expect(await waitFor(() => hub.subscriberCount(1) === 1)).toBe(true)
  expect(hub.subscriberCount(1)).toBe(1)

  s.abort()   // 클라이언트가 연결을 끊는다

  // 끊긴 뒤: 반드시 0 이어야 한다
  expect(await waitFor(() => hub.subscriberCount(1) === 0)).toBe(true)
  expect(hub.subscriberCount(1)).toBe(0)
})
```

**Then** 테스트가 통과한다 — 구독자 수가 **`1` 을 거쳐 `0` 으로** 간다.

**앞의 `1` 단언이 이 기준의 절반이다.** "누수가 없다"만 보면 `subscribe` 가 아무 일도 하지 않는 구현이 `0 → 0` 으로 가장 잘 통과한다. 등록이 실제로 일어났다는 것을 먼저 관측해야 그 뒤의 `0` 이 "정리됐다"는 뜻이 된다.

`close` 이벤트는 비동기라 고정 `setTimeout` 은 기계에 따라 흔들린다. `waitFor` 로 상한(2초) 안에서 폴링하고, 상한 안에 `0` 이 되지 않으면 `waitFor` 가 `false` 를 돌려 **실패**한다. `res.on('close')` 핸들러를 아예 걸지 않은 구현은 여기서 걸린다.

방 항목 자체가 지워지는지(`rooms.delete`)는 `subscriberCount` 가 `0` 을 돌려주는 것으로 함께 관측된다 — 항목이 남아 빈 집합이어도 `0`, 지워져도 `0` 이므로 이 기준은 둘을 구분하지 않는다. 그 구분은 관측 가치가 없어 의도적으로 두지 않았다(`plan.md` §E).

### AC-SSE-007 — 구독자 없는 방으로 발행해도 아무 일도 없다

**Given** 방 `99` 에는 구독자가 없고, 방 `1` 에는 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('publishing to a room with no subscribers is a silent no-op', async () => {
  const { hub, cookie: ck, port } = await startServer()

  // 구독자가 하나도 없는 상태에서 발행 — 던지지 않아야 한다
  expect(() => hub.publish(99, 'message', { id: 1 })).not.toThrow()
  expect(hub.subscriberCount(99)).toBe(0)

  // 같은 테스트 안에서 실제 전달까지 확인한다 — 빈 구현이 이 테스트를 통과하지 못하게 하는 장치다
  const { reader } = await openStream(port, ck, 1)
  await readFrame(reader)
  hub.publish(99, 'message', { id: 2 })   // 여전히 구독자 없음
  hub.publish(1, 'message', { id: 3 })
  expect(await readFrame(reader)).toBe('event: message\ndata: {"id":3}\n\n')
  expect(hub.subscriberCount(99)).toBe(0)
})
```

**Then** 테스트가 통과한다 — 빈 방 발행이 던지지 않고 구독자 집합을 만들지도 않으며, 그 사이에 낀 실제 발행은 정상 도달한다.

**앞 절반만으로는 이 기준이 무효다.** `publish` 가 통째로 빈 함수여도 "던지지 않는다"와 "구독자 수 `0`"은 성립한다. 그래서 뒷 절반의 실제 전달 단언을 같은 테스트에 묶었다 — 빈 구현은 마지막 `readFrame` 에서 타임아웃으로 실패한다.

### AC-SSE-008 — 인증 없이는 스트림이 열리지 않는다

**Given** 세션 쿠키가 없다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('rejects an unauthenticated event-stream request', async () => {
  const { app, port } = await startServer()

  // inject 로 검증 가능한 유일한 경로 — requireAuth 가 즉시 끊으므로 응답이 끝난다
  const injected = await app.inject({ method: 'GET', url: '/api/rooms/1/events' })
  expect(injected.statusCode).toBe(401)
  expect(injected.headers['content-type'] ?? '').not.toContain('text/event-stream')

  // 실제 서버에서도 같은지 확인 (preHandler 가 실 소켓 경로에서도 도는지)
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms/1/events`)
  expect(res.status).toBe(401)
  expect(res.headers.get('content-type') ?? '').not.toContain('text/event-stream')
  await res.body?.cancel()
})
```

**Then** 테스트가 통과한다 — 두 경로 모두 `401` 이고, 이벤트 스트림이 시작되지 않는다.

`preHandler: [requireAuth]` 를 빠뜨리면 `subscribe` 가 실행되어 `200` + `text/event-stream` 이 나오고 두 단언이 함께 실패한다. 게다가 `inject` 쪽은 응답이 끝나지 않아 테스트가 멈춘다 — 어느 쪽으로도 통과하지 못한다.

### AC-SSE-009 — `buildServer` 배선이 실제로 살아 있다

**Given** 이 SPEC 이 `server/src/index.ts` 에 허브와 라우트를 배선했다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('wires the hub and the events route into buildServer', async () => {
  const { buildServer } = await import('../src/index.js')
  const app = await buildServer()
  cleanups.push(async () => { await app.close() })

  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'w', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'w', password: 'pw123456' } })
  const ck = setCookieOf(login).split(';')[0]

  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  const { reader } = await openStream(port, ck, 1)
  expect(await readFrame(reader)).toContain('connected')

  app.hub.publish(1, 'message', { id: 42 })
  expect(await readFrame(reader)).toBe('event: message\ndata: {"id":42}\n\n')
})
```

**Then** 테스트가 통과한다 — 테스트가 직접 만든 앱이 아니라 **프로덕션 조립 경로**인 `buildServer()` 가 띄운 서버에서 스트림이 열리고 발행이 도달한다.

앞선 기준들은 모두 테스트가 손으로 조립한 Fastify 앱을 쓴다. 그 앱들은 `index.ts` 를 한 줄도 읽지 않으므로, `sse.ts` 가 완벽해도 `buildServer` 에 배선이 없으면 전부 통과한다. 이 기준이 그 구멍을 막는다 — `app.decorate('hub', …)` 가 없으면 `app.hub` 가 `undefined` 라 `publish` 호출에서 `TypeError` 로, 라우트 등록이 없으면 `openStream` 이 `404` 를 받아 `res.body` 파싱에서 실패한다.

`buildServer()` 는 `config.dataDir` 아래 진짜 `data/` 를 연다는 점에 유의한다. 이 테스트는 그 디렉터리에 사용자 두 행을 남기므로, 실행 전 `MINIDISCORD_DATA_DIR` 을 임시 경로로 설정하거나(`config.dataDir` 게터로 지연 평가됨 — `SPEC-ROOM-001` `plan.md` §D 8번) 격리 방법을 run 단계에서 정한다. `plan.md` §E 의 위험 항목이다.

### AC-SSE-010 — 범위 경계와 스키마 불변

**Given** 이 SPEC 의 구현이 끝났다.
**When** 다음 네 명령을 차례로 실행한다.

```bash
ls server/src
git rev-parse --verify "$(cat .moai/specs/SPEC-SSE-001/.spec-base-sha)^{commit}"
git diff --stat <둘째 명령이 출력한 40자리 SHA> -- server/src/db.ts
git diff --name-only <같은 SHA> -- server/src
```

**둘째 명령이 앞에 있어야 하는 이유.** M1 단계 0 을 건너뛴 실행에서는 `.spec-base-sha` 가 없고, `git diff … "$(cat …)"` 는 `$(cat …)` 이 빈 문자열이 되어 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 그러면 셋째 명령의 "비어 있음"이 성립해 버려 그 관측만 조용히 무력해진다. 기준 SHA 의 존재 자체를 관측 대상으로 올리는 이유다. 셋째·넷째 명령에 SHA 를 직접 적는 것은 `$(cat …)` 을 품은 `git diff` 가 워크트리 격리 세션의 가드에 걸려 실행되지 않기 때문이다.

**Then** 네 관측이 모두 성립한다.

1. 출력에 `sse.ts` 가 **있다.** 이 SPEC 이 만든 유일한 새 소스 파일이므로, 없으면 실패다. 그 외의 항목 수는 세지 않는다 — 형제 SPEC 파일(`mention.ts`, `gateway.ts`, `routes-messages.ts`, `permissions.ts`)의 존재 여부는 **이 관측의 판정 대상이 아니다.** 그것들이 이 SPEC 때문에 생겼는지는 관측 4가 판정한다.
2. 둘째 명령이 **종료 코드 `0`** 으로 끝나고 40자리 SHA 한 줄을 출력한다. 종료 코드가 `0` 이 아니거나 `fatal:` 이 나오면 **이 기준은 실패**다. 셋째·넷째 명령으로 넘어가지 않는다.
3. 셋째 명령이 **종료 코드 `0`** 으로 끝나고 **출력이 비어 있다** — `db.ts` 가 이 SPEC 의 진입 시점 이후 한 줄도 바뀌지 않았다 (REQ-SSE-011). 두 조건이 함께 성립해야 통과다.
4. 넷째 명령이 **종료 코드 `0`** 으로 끝나고 출력이 정확히 두 줄 — `server/src/index.ts` 와 `server/src/sse.ts` (사전순). 다른 파일이 나타나면 실패다.

**관측 4가 이 기준의 무게를 진다.** "이 SPEC 이 만들지 않았다"는 판정은 여기서 나온다 — `spec_base_sha` 이후 `server/src` 에서 변경된 파일이 정확히 둘이라는 **양성** 단언이라, 이 SPEC 의 구현자가 `gateway.ts` 나 `routes-messages.ts` 를 미리 만들면 세 번째 줄로 즉시 드러난다. 동시에 상대 비교라서 형제 SPEC 이 진입 시점 **이전에** 무엇을 만들어 뒀든 영향받지 않는다. 관측 1을 절대 열거에서 존재 확인으로 줄일 수 있었던 이유가 그것이다 — 절대 열거가 하던 일을 관측 4가 더 정확하게, 실행 순서에 흔들리지 않고 하고 있었다.

> **v0.2.0 교정 기록 (감사 지적 MF-4).** 이전 판의 관측 1은 "정확히 일곱 항목이고 `mention.ts` 는 없다"였다. 그런데 카드 `t3` 의 `SPEC-MENTION-001` 은 자신을 카드의 **첫 번째**로 못 박고 `SPEC-GATEWAY-001` 은 SSE 와 MENTION 이 먼저 끝나야 한다고 쓴다. 즉 이 SPEC 이 실행될 때 `mention.ts` 는 이미 있을 공산이 크고, 그러면 목록이 여덟 항목이 되어 **구현이 완전히 옳아도 이 관측이 실패**한다. 이 SPEC 이 통제하지 않는 다른 SPEC 의 산출물을 절대 목록으로 단언한 것이 원인이었다. 형제 파일을 목록 검사에서 빼고, 판정을 이미 그 일을 하고 있던 관측 4로 옮겼다 — 형제 `SPEC-MSG-001` 의 AC-MSG-013 과 같은 모양이다. 감사가 제안한 음성 열거(`gateway.ts`·`routes-messages.ts`·`permissions.ts` 부재)를 쓰지 않은 이유는 그것도 여전히 실행 순서에 매여 있고(형제 셋 중 하나가 먼저 도는 순서가 생기면 같은 결함이 되살아난다), 부재 검사라 빈 구현도 통과시키기 때문이다.

### AC-SSE-011 — RED → GREEN 전이 증거

**Given** 각 마일스톤에서 테스트를 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 두 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | `sse.test.ts` 의 허브 테스트가 실패. 원인은 `../src/sse.js` 모듈 부재(해석 오류)가 출력에 직접 보임 |
| 2 | M1 | GREEN | `createSseHub` 구현 후 허브 테스트 전부 통과 |
| 3 | M2 | RED | AC-SSE-009 의 `buildServer` 배선 테스트가 실패. 원인은 라우트 미등록(`404`) 또는 `app.hub` 미정의가 출력에 직접 보임 |
| 4 | M2 | GREEN | `index.ts` 배선 후 전체 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다. RED 판정은 도구가 내는 특정 문구가 아니라 **"무엇이 없어서 실패했다"는 원인이 출력에서 확인되는가**로 한다.

### AC-SSE-012 — 순수 메모리 구조이며 하트비트가 없다

**Given** `server/src/sse.ts` 가 구현됐다.
**When** 다음 세 명령을 실행한다.

```bash
grep -c "^import" server/src/sse.ts
grep -n "^import" server/src/sse.ts
grep -nE "setInterval|setTimeout|^retry:|\\\\nretry:|\\\\nid:" server/src/sse.ts
```

**Then** 세 관측이 성립한다.

1. 첫 명령이 정확히 `1` 을 출력한다 — import 줄이 하나뿐이다. `0` 이면 실패다(구현이 없거나 타입 import 를 안 쓴 것). `2` 이상이면 실패다.
2. 둘째 명령의 그 한 줄이 `import type { ServerResponse } from 'node:http'` 다. `./db.js`·`./config.js`·`node:fs` 를 끌어들이면 여기서 드러난다 — 허브는 순수 메모리 구조라는 제약이 그것이다.
3. 셋째 명령이 **일치 없음**(종료 코드 `1`)으로 끝난다 — 하트비트 타이머도, SSE 재접속 필드도 없다 (REQ-SSE-009).

세 관측 가운데 **첫째와 둘째가 이 기준의 무게를 진다.** 셋째는 부재 검사라 빈 파일에서도 성립하므로 단독으로는 무효이고, 앞의 두 개(정확히 한 줄이고 그 줄이 무엇인가)가 빈 파일을 걸러낸 뒤에만 뜻이 있다. 소스 패턴 검사의 한계는 그대로 남는다 — 이 기준은 구조를 재는 보조 검사이며, 허브가 실제로 동작한다는 것은 AC-SSE-001~007 이 실행으로 관측한다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 존재하지 않는 방 번호로 스트림 열기 | `200` 으로 열린다. 방 존재 검증은 이 SPEC 범위 밖이다(`spec.md` §5) | AC-SSE-001 이 방 `1` 을 만들지 않고 여는 것이 그대로 이 경우다 |
| `:id` 가 숫자가 아닌 문자열 | `Number('abc')` 가 `NaN` 이 되고 `Map` 은 `NaN` 을 일관된 키로 다룬다(SameValueZero). 스트림은 열리지만 어떤 `publish` 도 닿지 않는다 | 수용. 방 존재 검증이 없는 것의 자연스러운 귀결이며 `plan.md` §E 에 기록 |
| 같은 브라우저가 같은 방에 탭 두 개 | 구독자 두 개로 센다. 둘 다 같은 프레임을 받는다 | AC-SSE-005 |
| 구독자가 있는 채로 서버가 닫힘 | `app.close()` 가 소켓을 끊고 각 응답의 `close` 가 발화해 집합이 비워진다 | AC-SSE-006 과 같은 정리 경로 |
| `data` 가 순환 참조 객체 | `JSON.stringify` 가 던진다. 발행자(Task 8·9·10)의 책임이며 허브는 방어하지 않는다 | 범위 밖. 이 SPEC 은 `data: unknown` 을 그대로 직렬화한다 |
| 이미 끊긴 응답에 `publish` | `res.write` 가 `false` 를 돌려주거나 조용히 무시된다. `close` 정리가 먼저 도는 것이 정상 경로다 | AC-SSE-006 이 정리를 관측. 경합 시 예외가 나면 run 단계에서 블로커로 보고 |
| 미인증 요청 | `401`. 스트림이 시작되지 않는다 | AC-SSE-008 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (선행 SPEC 분 + 이 SPEC 추가분) | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), `sse.ts` 는 구독·발행·정리 세 가지만 안다 | 리뷰 |
| Unified | TypeScript strict, NodeNext, 상대 import 에 `.js` 확장자 | `npm run typecheck -w server` |
| Secured | 이벤트 라우트에 `requireAuth` 가 붙어 있고 미인증은 `401` | AC-SSE-008 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-SSE-001 부터 AC-SSE-012 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `sse.ts` 가 존재함. **파일 개수를 세지 않는다** — 형제 SPEC 산출물의 존재 여부는 이 SPEC 의 판정 대상이 아니다 (v0.2.0 교정, 감사 지적 MF-4)
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-SSE-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함
- [ ] 그 SHA 로 실행한 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이고 출력이 비어 있음. **빈 출력만으로 통과 처리하지 않는다**
- [ ] 같은 SHA 로 실행한 `git diff --name-only <SHA> -- server/src` 가 종료 코드 `0` 이고 출력이 정확히 `server/src/index.ts` + `server/src/sse.ts` 두 줄임
- [ ] `SseHub` 의 `subscribe` / `publish` 시그니처가 `spec.md` REQ-SSE-001 과 문자 그대로 일치함 — Task 8·9·10 이 결합하는 계약이다
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 2개 (`feat: SSE hub with per-room subscription`, `feat: wire SSE event stream route into buildServer`)
