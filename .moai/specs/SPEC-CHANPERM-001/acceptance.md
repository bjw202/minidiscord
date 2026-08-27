# SPEC-CHANPERM-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 계획 디렉터리의 다른 문서나 초기 커밋에 담긴 v1 초안은 이 SPEC 의 참조 대상이 아니다.

## 이 문서가 지키는 검증 원칙

이 SPEC 의 수용 기준은 **구현 본문이 비어 있어도 통과하는 기준을 하나도 두지 않는다**. 중계기는 특히 그런 기준이 나오기 쉬운 자리라 — "알림이 도착했다", "오류가 안 났다" 같은 단언이 전부 무의미하다 — 위험한 자리마다 어떤 스텁이 그 기준을 뚫는지 적어 두었다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 요청 릴레이 | "`sendPermissionRequest` 가 불렸다"는 **params 를 통째로 버리고 빈 객체를 넘기는 구현**도 통과시킨다 | 넘어간 객체가 네 필드 값까지 깊은 동등인가 (AC-CHANPERM-003) |
| 두 경로의 상관 | 나가는 쪽과 돌아오는 쪽을 따로 재면, 어느 한쪽에서 `request_id` 를 파생·재작성하는 구현이 양쪽 기준을 각각 통과한다 (둘 다 리터럴 id 를 쓰므로) | 나가는 경로에서 **관측한** id 를 되먹여 돌아온 알림이 원래 값을 싣는가 (AC-CHANPERM-001) |
| 메서드 이름 | "핸들러가 등록됐다"는 **모든 알림을 다 받는 구현**도 통과시킨다. 그런 구현은 자기가 보낸 판정 알림에도 반응한다 | 이름이 한 단어 다른 알림에서 `sendPermissionRequest` 가 **불리지 않는가** (AC-CHANPERM-002) |
| 거절 경로 | "판정 알림이 나갔다"는 **항상 `allow` 를 보내는 구현**도 통과시킨다 | Claude Code 쪽이 받은 `params.behavior` 가 정확히 `'deny'` 인가 (AC-CHANPERM-006) |
| 불일치 판정 | "예외가 안 났다"는 아무것도 재지 않는다 | 그 id 그대로 알림이 한 번 나갔는가, **다른 id 의 알림이 하나도 없는가**, 그 뒤 정상 판정이 여전히 성립하는가 (AC-CHANPERM-008) |
| 미연결 전송 | "테스트가 끝까지 돌았다"는 처리되지 않은 거부를 잡지 못한다 — 그 거부는 다음 tick 에 프로세스를 죽인다 | `process.on('unhandledRejection')` 이 수집한 배열이 비어 있는가 (AC-CHANPERM-009) |
| 배선 | "`wire` 가 오류 없이 반환됐다"는 **아무것도 잇지 않은 구현**도 통과시킨다 | 게이트웨이 스텁이 실제로 `{ type:'permission_request', … }` 프레임을 받았는가, 반대 방향도 도는가 (AC-CHANPERM-010) |

같은 이유로 다음 형태는 이 문서에서 금지한다 — "파일이 존재한다", "함수가 export 돼 있다", "테스트 스위트가 통과한다(어떤 테스트인지 이름 없이)", 파일 수·줄 수를 세는 기준, 그리고 구현 본문을 지워도 참인 단언.

**반대 방향의 결함도 함께 막는다.** 공허한 기준이 정상 구현을 거짓 통과시킨다면, 잘못 쓴 기준은 **정상 구현을 거짓 실패시킨다.** 이 문서에서 그런 자리는 셋이며 각각 해당 자리에 경위를 적어 두었다.

- MCP SDK 의 `setNotificationHandler` 는 **zod 스키마**를 받아 알림을 `parse` 한 뒤 핸들러를 부른다. `{ method: '…' } as any` 같은 유사 객체를 넘기면 SDK 가 `schema.shape` 를 읽다 깨지므로, 구현이 완벽해도 기준이 실패한다. 이 문서의 하네스는 진짜 zod 스키마를 쓴다.
- zod 객체 스키마는 기본적으로 **모르는 키를 조용히 걷어낸다.** 그 상태로 "params 에 두 필드만 있다"를 단언하면 필드를 더 실어 보내는 구현도 통과한다. 그래서 `params` 스키마에 `.passthrough()` 를 붙였다.
- **소켓을 건너는 대기를 고정 시간으로 두면** 부하 걸린 기계에서 배선이 완벽해도 실패하고, 그 실패는 "배선이 안 됐다"와 구분되지 않는다. 그래서 그런 자리는 전부 `waitFor(조건)` 이다 — 경위는 § 공통 테스트 하네스에 있다 (v0.2.0 교정, M4).

**이 문서에는 테스트 이름의 존재만 재는 기준이 없다** (v0.2.1 교정, m1). 열두 기준이 모두 단언으로 동작을 관측한다. 만약 앞으로 "이름 붙은 기존 테스트가 통과한다"류의 기준을 더해야 한다면, 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않으므로 — 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고 둘 다 종료 코드 `0` 이다 — `npm test -w channel -- --reporter=verbose` 의 `✓ test/permission-relay.test.ts > <describe> > <테스트 이름>` 줄로 판정한다. `-t <이름>` 필터로 대신하지 않는다: 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다.

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## 공통 테스트 하네스

아래 모든 시나리오는 `channel/test/permission-relay.test.ts` 의 다음 하네스를 쓴다. `plan-v2.md` Task 14 Step 1 의 테스트에 **다섯 가지가 더해졌다** — (1) 진짜 zod 알림 스키마(위 경위 참조), (2) `params` 의 `.passthrough()`, (3) 소켓을 건너는 자리의 조건 대기 `waitFor`, (4) 열어 둔 클라이언트·서버·게이트웨이 스텁의 일괄 정리 목록 `cleanups`, (5) 처리되지 않은 거부 수집기.

**소켓을 건너는 대기는 `waitFor` 로 한다.** 형제 SPEC 셋(`SPEC-CHANNEL-001`·`SPEC-CHANCLIENT-001`·`SPEC-CHANWIRE-001`)은 고정 시간 대기를 이 부류의 대표 결함으로 지목하고 자기 하네스에서 **전부 제거했다.** 이 문서의 v0.1.0 은 그러지 않고 고정 50ms `tick()` 하나로 모든 대기를 처리하면서 "형제 하네스와 같은 형태"라고 적었는데, 사실이 아니었다 — 특히 AC-CHANPERM-010 은 그 50ms 안에 TCP·WebSocket 핸드셰이크와 프레임 왕복이 끝나야 해서, 부하 걸린 기계에서는 **배선이 완벽해도 실패한다.** 그리고 그 실패 사유는 "배선이 안 됐다"와 구분되지 않는다. 형제와 같은 `waitFor(조건, 라벨, 3000)` 를 그대로 가져왔다.

`tick()` 은 남겨 두되 **쓰는 자리를 좁힌다** — 인프로세스 `InMemoryTransport` 왕복(마이크로태스크 한 바퀴)과, "오지 않았음"을 재는 부정 관측에만 쓴다. 부정 관측에서 고정 대기는 원리상 완벽할 수 없지만(늦게 오는 것과 오지 않는 것을 구분할 수 없다) 인프로세스 전송이라 실제 위험은 낮다. 소켓을 건너는 자리에는 쓰지 않는다.

**정리는 개별 테스트가 아니라 `cleanups` 가 한다.** `connect` 한 MCP 클라이언트와 띄운 `WebSocketServer` 를 각 테스트가 스스로 닫게 하면, 한 곳만 빠뜨려도 vitest 프로세스가 종료되지 않는다. `attach()` 와 `gatewayStub()` 이 각자 자기 정리를 등록하고 `afterEach` 가 역순으로 실행하므로, 아래 시나리오 본문에는 정리 코드가 한 줄도 나오지 않는다 — 빠뜨릴 수 있는 자리를 없앤 것이다. 이 항목은 형제 SPEC 하네스와 같은 형태다.

```ts
import { describe, it, expect, afterEach } from 'vitest'
import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { WebSocketServer } from 'ws'
import { createChannelServer } from '../src/channel-server.js'

// 열어 둔 자원(MCP 클라이언트·게이트웨이 스텁)의 일괄 정리 목록. 등록 역순으로 닫는다.
const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) await c() })

// 나가는 판정 알림을 관측하는 스키마.
// 1) 진짜 zod 스키마여야 한다 — SDK 가 schema.shape.method.value 로 메서드를 읽는다.
// 2) params 에 .passthrough() 를 붙인다 — 기본 zod 는 모르는 키를 걷어내므로,
//    붙이지 않으면 "두 필드뿐"을 재는 AC-CHANPERM-005 가 무의미해진다.
// 3) behavior 를 enum 이 아니라 string 으로 둔다 — 잘못된 값도 parse 를 통과해야
//    "무엇이 왔는지"를 단언으로 드러낼 수 있다.
const PermissionVerdictNotification = z.object({
  method: z.literal('notifications/claude/channel/permission'),
  params: z.object({ request_id: z.string(), behavior: z.string() }).passthrough(),
})

type Params = { request_id: string; tool_name: string; description: string; input_preview: string }

// 채널 서버 하나를 만들고 MCP 클라이언트를 붙인다.
// withDeps 로 sendPermissionRequest 를 뺀 배선(REQ-CHANPERM-003)도 만들 수 있다.
async function attach(opts: { permission?: boolean } = {}) {
  const requests: Params[] = []
  const handle = createChannelServer({
    sendToChat: async () => {},
    fetchHistory: async () => '',
    ...(opts.permission === false ? {} : { sendPermissionRequest: (p: Params) => { requests.push(p) } }),
  })
  const client = new Client({ name: 't', version: '0' })
  const verdicts: { params: Record<string, unknown> }[] = []
  client.setNotificationHandler(PermissionVerdictNotification, n => { verdicts.push(n as never) })
  const [c, s] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(c), handle.server.connect(s)])
  cleanups.push(async () => { await client.close() })
  return { handle, client, requests, verdicts }
}

// Claude Code 가 보내는 승인 요청 알림을 흉내 낸다. 메서드 이름을 바꿔 부를 수 있다.
async function sendRequest(client: Client, params: unknown, method = 'notifications/claude/channel/permission_request') {
  await client.notification({ method, params } as never)
  await tick()
}

// 인프로세스(InMemoryTransport) 왕복 전용 대기. 알림은 단방향이라 응답이 없다.
// 소켓을 건너는 자리에는 쓰지 않는다 — 그쪽은 waitFor 를 쓴다.
const tick = () => new Promise<void>(r => setTimeout(r, 50))

// 조건이 설 때까지 기다린다. 고정 sleep 이 만드는 간헐 실패를 없앤다.
// 형제 SPEC(CHANWIRE·CHANCLIENT) 하네스와 같은 형태다.
async function waitFor(pred: () => boolean, label: string, ms = 3000): Promise<void> {
  const t0 = Date.now()
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`waitFor timeout: ${label}`)
    await new Promise(r => setTimeout(r, 10))
  }
}

// 처리되지 않은 프로미스 거부를 수집한다. 반환된 함수가 수집을 끝내고 목록을 돌려준다.
function collectUnhandled() {
  const seen: unknown[] = []
  const on = (e: unknown) => { seen.push(e) }
  process.on('unhandledRejection', on)
  cleanups.push(() => { process.off('unhandledRejection', on) })
  return async () => { await tick(); return seen }
}

// 게이트웨이 스텁. Task 13 의 것과 같은 형태다.
function gatewayStub() {
  const wss = new WebSocketServer({ port: 0 })
  const sent: Record<string, unknown>[] = []
  cleanups.push(() => new Promise<void>(r => wss.close(() => r())))
  wss.on('connection', ws => {
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      sent.push(m)
      if (m.type === 'hello') ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))
    })
  })
  return {
    sent,
    port: () => (wss.address() as { port: number }).port,
    push: (msg: unknown) => { for (const c of wss.clients) c.send(JSON.stringify(msg)) },
  }
}

const REQ: Params = { request_id: 'abcde', tool_name: 'Bash', description: 'Run shell command', input_preview: 'ls -la' }
```

`requests` 배열과 `verdicts` 배열이 이 문서의 두 관측창이다. **부정 관측**(무언가 일어나지 **않았음**)은 전부 이 두 배열의 길이로 잰다 — `tick()` 으로 전달 시간을 준 뒤에도 배열이 그대로면 그 경로를 타지 않은 것이다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-CHANPERM-001 | REQ-CHANPERM-001, 005 | 아래 본문 | 나가는 경로에서 관측한 `request_id` 를 되먹였을 때 돌아온 알림의 `params` 가 원래 값과 `toEqual` |
| AC-CHANPERM-002 | REQ-CHANPERM-002 (메서드 리터럴) | 아래 본문 | 이름이 다른 두 알림에서 `requests.length === 0`, 정확한 이름에서만 `1` |
| AC-CHANPERM-003 | REQ-CHANPERM-002 (무변형) | 아래 본문 | 넘어간 객체가 원본과 `toEqual` 이고 키 집합이 정확히 네 개 |
| AC-CHANPERM-004 | REQ-CHANPERM-003 | 아래 본문 | `sendPermissionRequest` 없는 배선에서 예외 없음 + 이후 `reply` 도구 호출이 정상 동작 |
| AC-CHANPERM-005 | REQ-CHANPERM-005 | 아래 본문 | 판정 알림 1건, `method` 가 `'notifications/claude/channel/permission'`, `params` 키가 정확히 `['behavior','request_id']` |
| AC-CHANPERM-006 | REQ-CHANPERM-006 | 아래 본문 | `deny` 판정에서 받은 `params.behavior` 가 정확히 `'deny'` |
| AC-CHANPERM-007 | REQ-CHANPERM-007 | 아래 본문 | 대문자·비정형 `request_id` 가 글자 그대로 전달 (양방향) |
| AC-CHANPERM-008 | REQ-CHANPERM-008 | 아래 본문 | 모르는 id 판정 뒤에도 알림 1건이 그 id 그대로 + 다른 id 알림 0건 + 이후 정상 판정 성립 |
| AC-CHANPERM-009 | REQ-CHANPERM-009 | 아래 본문 | 미연결 상태 호출이 동기 예외 없음 + 수집된 unhandled rejection 0건 + 연결 후 판정 정상 전달 |
| AC-CHANPERM-010 | REQ-CHANPERM-004 | 아래 본문 | 게이트웨이 스텁이 `{ type:'permission_request', request_id:'abcde', … }` 수신 + 스텁이 민 verdict 가 Claude Code 알림으로 도착 |
| AC-CHANPERM-011 | REQ-CHANPERM-010 | 아래 본문 | 기준 SHA 확인 종료 코드 `0`, `server` diff 빈 출력, `channel/src` 변경 목록이 정확히 두 줄 |
| AC-CHANPERM-012 | RED→GREEN 전이 | 아래 본문 | 네 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-CHANPERM-001 — 회로가 한 바퀴 돈다 (나간 id 로 돌아온다)

**Given** 채널 서버에 MCP 클라이언트가 붙어 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('relays a request out and carries the matching verdict back, correlated by the forwarded id', async () => {
  const { client, handle, requests, verdicts } = await attach()
  const issued = { ...REQ, request_id: 'q7x2m' }     // 다른 기준이 쓰지 않는 값
  await sendRequest(client, issued)
  expect(requests.length).toBe(1)

  // id 를 하드코딩하지 않는다 — 나가는 경로에서 실제로 관측된 값을 그대로 되먹인다
  const forwarded = requests[0].request_id
  handle.handlePermissionVerdict({ request_id: forwarded, behavior: 'allow' })
  await tick()

  expect(verdicts.length).toBe(1)
  expect(verdicts[0].params).toEqual({ request_id: 'q7x2m', behavior: 'allow' })
})
```

**Then** 테스트가 통과한다.

이 기준만 잡는 결함은 **두 경로의 상관(correlation)이 끊기는 것**이다. AC-CHANPERM-002·003 은 나가는 쪽만, AC-CHANPERM-005·006 은 돌아오는 쪽만 재고 둘 다 `'abcde'` 를 리터럴로 쓴다. 그래서 어느 한쪽 경로에서 id 를 파생·재작성하는 구현(예: 접두어를 붙이거나 내부 카운터로 바꾸는 구현)이 각각의 기준은 통과할 수 있다. 여기서는 되먹이는 값을 **나가는 경로에서 관측해** 쓰므로, 두 경로 중 어디서 id 가 달라져도 마지막 `toEqual` 이 원래 값 `'q7x2m'` 과 어긋나 실패한다.

> **v0.2.1 교정 기록 (m1).** 이전 판은 이 기준을 `--reporter=verbose` 출력에 원본 테스트 **이름**이 나타나는가로만 재면서, 본문에 "그 테스트는 `plan-v2.md` Task 14 Step 1 **원본**이며"라고 적었다. 두 가지가 문제였다 — 이름만 재는 관측이 단독으로 잡는 결함이 없었고(내용은 002·003·005·006 이 더 강하게 덮는다), "원본"이라는 표현이 구현자를 원본 테스트의 `setNotificationHandler({ method: … } as any)` 형태로 되돌릴 여지를 남겼다. 그 형태는 정상 구현을 거짓 실패시키는 부류이고(§ 이 문서가 지키는 검증 원칙, `plan.md` §D 1번), 형제 SPEC 셋이 공통으로 제거한 자리다. **이 문서에서 정본은 원본 테스트가 아니라 위 공통 하네스의 zod 스키마 형태다.** 원본 테스트 코드를 그대로 옮기지 않는다.

### AC-CHANPERM-002 — 정확한 메서드 이름에만 반응한다

**Given** 채널 서버에 클라이언트가 붙어 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('only the exact permission_request method reaches sendPermissionRequest', async () => {
  const { client, requests } = await attach()

  // 나가는 쪽 이름(한 단어 짧다) — 모든 알림을 받는 구현은 여기서 걸린다
  await sendRequest(client, REQ, 'notifications/claude/channel/permission')
  expect(requests.length).toBe(0)

  // 채팅 알림 이름
  await sendRequest(client, REQ, 'notifications/claude/channel')
  expect(requests.length).toBe(0)

  await sendRequest(client, REQ)                       // 정확한 이름
  expect(requests.length).toBe(1)
})
```

**Then** 테스트가 통과한다.

두 부정 단언이 이 기준의 핵심이다. 알림을 이름으로 가르지 않고 아무거나 받아 넘기는 구현은 **자기가 보낸 판정 알림에도 반응해** 승인 요청을 게이트웨이로 되쏘는데, `expect(requests.length).toBe(0)` 두 줄이 그것을 잡는다. 마지막 양성 단언이 짝이다 — 그것이 없으면 "아무것도 안 하는 구현"도 통과한다.

### AC-CHANPERM-003 — params 를 한 글자도 바꾸지 않는다

**Given** 승인 요청 하나가 도착한다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('forwards params verbatim, adding and dropping nothing', async () => {
  const { client, requests } = await attach()
  const odd = {
    request_id: 'AbC12',
    tool_name: 'Bash',
    description: '',                                   // 빈 문자열도 그대로 간다
    input_preview: 'rm -rf tmp\n두 번째 줄\t탭',        // 개행·탭·한글도 그대로 간다
  }
  await sendRequest(client, odd)
  expect(requests[0]).toEqual(odd)
  expect(Object.keys(requests[0]).sort()).toEqual(['description', 'input_preview', 'request_id', 'tool_name'])
})
```

**Then** 테스트가 통과한다. 값을 절단하거나 마스킹하거나 대소문자를 바꾸는 구현은 `toEqual` 에서, 필드를 더 붙이거나 빼는 구현은 키 집합 단언에서 걸린다.

빈 `description` 을 넣은 이유가 있다 — `params.description || '(설명 없음)'` 같은 "친절한" 보정이 흔한 유혹이고, 그 보정이 이 단언에서 걸린다.

### AC-CHANPERM-004 — 의존이 없는 배선에서도 깨지지 않는다

**Given** `sendPermissionRequest` 를 주지 않은 배선이다 (Task 11 계약이 옵셔널로 정의했다).
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('survives a wiring without sendPermissionRequest', async () => {
  const { client } = await attach({ permission: false })
  const unhandled = collectUnhandled()

  await sendRequest(client, REQ)                       // 여기서 죽으면 안 된다
  expect(await unhandled()).toEqual([])

  // 서버가 여전히 살아 있는가 — 다른 기능이 정상 동작하는지로 잰다
  const out = await client.callTool({ name: 'reply', arguments: { text: 'ping' } })
  expect(out).toBeDefined()
})
```

**Then** 테스트가 통과한다.

마지막 도구 호출이 이 기준의 양성 짝이다. "예외가 안 났다"만 재면 알림 자체를 아예 안 받는 구현도 통과하는데, 도구 호출이 성공한다는 것은 서버가 그 알림을 처리하고도 멀쩡하다는 뜻이다.

### AC-CHANPERM-005 — 판정 알림이 계약대로 나간다

**Given** 채널 서버에 클라이언트가 붙어 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('emits exactly one permission notification with exactly two params', async () => {
  const { handle, verdicts } = await attach()
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
  await tick()

  expect(verdicts.length).toBe(1)
  expect(verdicts[0].params).toEqual({ request_id: 'abcde', behavior: 'allow' })
  expect(Object.keys(verdicts[0].params).sort()).toEqual(['behavior', 'request_id'])
})
```

**Then** 테스트가 통과한다.

메서드 이름은 하네스의 `PermissionVerdictNotification` 이 `z.literal` 로 고정한다 — 다른 이름으로 보내는 구현에서는 이 핸들러가 아예 불리지 않아 `verdicts.length` 가 `0` 이 된다. 키 집합 단언은 `.passthrough()` 가 있어야만 의미가 있다(문서 앞머리의 두 번째 경위).

### AC-CHANPERM-006 — 거절이 거절로서 도달한다

**Given** 사람이 방에서 `no abcde` 라고 답해 게이트웨이가 `deny` 판정을 보냈다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('delivers deny as deny', async () => {
  const { handle, verdicts } = await attach()
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'deny' })
  await tick()
  expect(verdicts[0].params.behavior).toBe('deny')
})
```

**Then** 테스트가 통과한다.

이 기준을 AC-CHANPERM-005 와 **따로 두는 이유**가 있다. `behavior: 'allow'` 를 상수로 박아 넣은 구현은 AC-CHANPERM-005 를 온전히 통과한다. 사람이 거절했는데 세션이 그 도구를 실행하는 경로가 정확히 그 구현이고, 이 한 줄이 그것을 잡는 유일한 자리다.

### AC-CHANPERM-007 — `request_id` 를 변형하지 않는다 (양방향)

**Given** Claude Code 가 대문자를 포함한 `request_id` 를 만들었다 (`spec.md` §3.1 가정-3 이 깨진 상태).
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('passes request_id through untouched in both directions', async () => {
  const { client, handle, requests, verdicts } = await attach()
  await sendRequest(client, { ...REQ, request_id: 'AbC12' })
  expect(requests[0].request_id).toBe('AbC12')         // 나가는 방향

  handle.handlePermissionVerdict({ request_id: 'abc12', behavior: 'allow' })
  await tick()
  expect(verdicts[0].params.request_id).toBe('abc12')  // 돌아오는 방향 — 서버가 준 그대로
})
```

**Then** 테스트가 통과한다. 두 값이 서로 다른 것은 **의도된 관측**이다 — 서버가 소문자로 정규화해 되돌리는 현재 동작(`spec.md` §3.1 가정-3)에서 채널이 무엇을 하는지 고정한다. 채널은 짝을 맞춰 주려 들지 않고 받은 대로 전달한다. `.toLowerCase()`·`.trim()`·재생성 중 어느 하나라도 넣은 구현은 두 단언 중 하나에서 걸린다.

이 기준은 서버 결함(카드 `t7`)이 고쳐져도 그대로 통과한다 — 두 값이 같아지든 달라지든, 채널이 재는 것은 "받은 대로 넘겼는가" 하나이기 때문이다.

### AC-CHANPERM-008 — 모르는 판정이 와도 다른 요청을 건드리지 않는다

**Given** 채널은 대기 중인 요청을 기억하지 않는다 (무상태).
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('an unknown or already-resolved verdict resolves nothing else and does not crash', async () => {
  const { client, handle, verdicts } = await attach()
  const unhandled = collectUnhandled()
  await sendRequest(client, REQ)                       // 실제로 대기 중인 것은 'abcde'

  handle.handlePermissionVerdict({ request_id: 'zzzzz', behavior: 'allow' })   // 모르는 id
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'deny' })    // 이미 해소된 id
  await tick()

  const ids = verdicts.map(v => v.params.request_id)
  expect(ids).toEqual(['zzzzz', 'abcde', 'abcde'])     // 받은 id 그대로, 순서 그대로, 셋 다
  expect(ids).not.toContain('abcde-1')                 // 어떤 id 도 만들어내지 않는다
  expect(await unhandled()).toEqual([])

  // 프로세스가 살아 있는가 — 이후 정상 판정이 여전히 성립하는지로 잰다
  handle.handlePermissionVerdict({ request_id: 'qqqqq', behavior: 'deny' })
  await tick()
  expect(verdicts[3].params).toEqual({ request_id: 'qqqqq', behavior: 'deny' })
})
```

**Then** 테스트가 통과한다.

`ids` 배열을 통째로 단언하는 것이 이 기준의 핵심이다. "모르는 id 를 삼키는" 구현(첫 알림 누락)도, "id 를 자기가 만들어 붙이는" 구현도, "두 번째 판정을 중복으로 걸러내는" 구현도 이 한 줄에서 갈린다. 셋 다 무상태 원칙을 깨는 방향이고, 마지막 단언 짝이 "그래서 프로세스가 여전히 쓸 만한가"를 잰다.

### AC-CHANPERM-009 — 연결 전 판정이 프로세스를 죽이지 않는다

**Given** 게이트웨이 판정이 채널의 stdio 연결보다 먼저 도착할 수 있다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('a verdict before transport connect throws nothing and leaves no unhandled rejection', async () => {
  const unhandled = collectUnhandled()
  const requests: Params[] = []
  const handle = createChannelServer({
    sendToChat: async () => {}, fetchHistory: async () => '',
    sendPermissionRequest: p => { requests.push(p) },
  })

  expect(() => handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })).not.toThrow()
  expect(await unhandled()).toEqual([])                // void 로 버린 프로미스는 여기서 걸린다

  // 연결 뒤에는 정상 전달되는가 — 전송을 통째로 막아 버린 구현을 잡는 양성 짝
  const client = new Client({ name: 't', version: '0' })
  const verdicts: { params: Record<string, unknown> }[] = []
  client.setNotificationHandler(PermissionVerdictNotification, n => { verdicts.push(n as never) })
  const [c, s] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(c), handle.server.connect(s)])
  cleanups.push(async () => { await client.close() })
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
  await tick()
  expect(verdicts.length).toBe(1)
})
```

**Then** 테스트가 통과한다.

`unhandled()` 단언이 이 기준의 이유 전부다. `void mcp.notification(...)` 은 미연결 상태에서 거부된 프로미스를 만들고, Node 는 처리되지 않은 거부에 프로세스를 끝낸다 — 권한 릴레이 하나 때문에 세션의 모든 기능이 함께 죽는다. 그 죽음은 **다음 tick 에** 일어나므로 `not.toThrow()` 만으로는 잡히지 않는다. 두 단언이 함께 있어야 성립한다.

### AC-CHANPERM-010 — 배선이 두 방향 모두 이어져 있다

**Given** `wire` 가 채널 서버와 게이트웨이 클라이언트를 묶는다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('wire relays a request out to the gateway and a verdict back to Claude Code', async () => {
  const { wire } = await import('../src/index.js')
  const gwStub = gatewayStub()
  const { channel, gw } = wire({ url: `ws://127.0.0.1:${gwStub.port()}/bot`, token: 'tok' })
  gw.start()
  cleanups.push(() => { gw.stop() })
  await waitFor(() => gwStub.sent.some(m => m.type === 'hello'), '게이트웨이 접속')

  const client = new Client({ name: 't', version: '0' })
  const verdicts: { params: Record<string, unknown> }[] = []
  client.setNotificationHandler(PermissionVerdictNotification, n => { verdicts.push(n as never) })
  const [c, s] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(c), channel.server.connect(s)])
  cleanups.push(async () => { await client.close() })

  // 나가는 방향: Claude Code 알림 → 게이트웨이 프레임
  await sendRequest(client, REQ)
  await waitFor(() => gwStub.sent.some(m => m.type === 'permission_request'), '요청 프레임 도착')
  const out = gwStub.sent.find(m => m.type === 'permission_request')
  expect(out).toEqual({ type: 'permission_request', ...REQ })

  // 돌아오는 방향: 게이트웨이 verdict → Claude Code 알림
  gwStub.push({ type: 'permission_verdict', request_id: 'abcde', behavior: 'deny' })
  await waitFor(() => verdicts.length > 0, '판정 알림 도착')
  expect(verdicts[0].params).toEqual({ request_id: 'abcde', behavior: 'deny' })
})
```

**Then** 테스트가 통과한다.

세 대기가 모두 `waitFor` 인 것이 이 기준을 **간헐 실패에서 떼어 낸다.** 조건이 서면 즉시 진행하고, 3초 안에 서지 않으면 `waitFor timeout: <라벨>` 로 실패한다 — 실패 사유가 "어느 단계에서 멈췄는가"를 그대로 말해 주므로 배선 결함과 환경 지연을 구분해 읽을 수 있다. 고정 대기를 쓰면 둘이 같은 모습으로 실패하고, 관례대로 대기 시간을 늘려 덮는 순간 이 기준은 아무것도 재지 않게 된다.

`toEqual({ type: 'permission_request', ...REQ })` 가 프레임 형태를 통째로 고정한다. `type` 을 빼먹은 구현은 서버 게이트웨이의 `switch (msg.type)` 에서 아무 분기도 타지 못해 조용히 사라지는데(오류도 나지 않는다), 이 단언이 그것을 잡는다. 돌아오는 방향에 `deny` 를 쓴 것도 의도다 — `onVerdict` 를 잇고도 `behavior` 를 흘리지 않는 배선이 여기서 걸린다.

### AC-CHANPERM-011 — 범위 경계

**Given** M1 단계 0 에서 `spec_base_sha` 를 기록해 두었다.
**When** 다음 네 명령을 순서대로 실행한다.

```bash
SHA=$(cat .moai/specs/SPEC-CHANPERM-001/.spec-base-sha)
git rev-parse --verify "$SHA^{commit}"
git diff --stat "$SHA" -- server
git diff --name-only "$SHA" -- channel/src
```

**Then** 네 가지가 모두 관측된다.

1. `git rev-parse --verify` 가 **종료 코드 `0`** 으로 SHA 를 출력한다. 이 확인이 먼저다 — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비우므로, 빈 출력만 보고 통과로 적으면 검사가 통째로 무력해진다.
2. `git diff --stat ... server` 가 **종료 코드 `0`** 이면서 출력이 **비어 있다**. 서버 쪽 결함(카드 `t7`)을 이 SPEC 에서 손대지 않았다는 뜻이다 (REQ-CHANPERM-010).
3. `git diff --name-only ... channel/src` 의 출력이 정확히 두 줄이고, 정렬하면 `channel/src/channel-server.ts`, `channel/src/index.ts` 다.
4. 그 목록에 `channel/src/gateway-client.ts` 가 **없다**. 선행 SPEC 소유 파일을 이 SPEC 에서 고치지 않았다는 뜻이다.

### AC-CHANPERM-012 — RED→GREEN 전이

**Given** 각 마일스톤이 테스트를 먼저 쓴다.
**When** `plan.md` §F 의 마일스톤 절차를 따라 실행하고 각 단계 출력을 `progress.md` §E.2 에 원문으로 남긴다.
**Then** 네 전이가 순서대로 관측된다.

| 전이 | 시점 | 관측할 결과 |
|------|------|-------------|
| 1 (RED) | M1 테스트 작성 직후 | `npm test -w channel` 실패, 사유가 `handlePermissionVerdict is not a function` 계열 (모듈 부재가 **아님** — `channel-server.ts` 는 선행 SPEC 이 이미 만들었다) |
| 2 (GREEN) | M1 구현 후 | `npm test -w channel` 통과 + `npm run typecheck -w channel` 종료 코드 `0` |
| 3 (RED) | M2 테스트 작성 직후 | `npm test -w channel` 실패, 사유가 배선 단언 실패 (`permission_request` 프레임 부재) |
| 4 (GREEN) | M2 구현 후 | `npm test -w channel` 전체 통과 + typecheck 종료 코드 `0` |

전이 1 의 실패 사유를 구분해 적는 것이 이 기준의 핵심이다. `Cannot find module` 로 실패한 것을 RED 로 적으면, 그 마일스톤의 테스트가 실제로 무엇을 재는지 아무도 확인하지 않은 채 넘어간다 — 이 SPEC 은 기존 파일을 **고치는** 것이라 모듈 부재로 실패할 이유가 없다.

---

## 엣지 케이스

| 상황 | 기대 동작 | 덮는 기준 |
|------|-----------|-----------|
| 같은 세션이 판정 전에 두 번째 승인 요청을 보낸다 | 두 요청이 각각 독립적으로 게이트웨이로 나간다. 채널은 아무것도 기억하지 않으므로 서로 간섭하지 않는다 | AC-CHANPERM-008 (여러 id 를 섞어 판정) |
| 같은 `request_id` 로 판정이 두 번 온다 | 알림도 두 번 나간다. 채널은 중복을 걸러내지 않는다(그것이 곧 상태다) | AC-CHANPERM-008 |
| 게이트웨이 연결이 끊긴 동안 승인 요청이 도착한다 | `GatewayClient.send` 가 `false` 를 돌려주고 요청은 사라진다. 채널은 버퍼링하지 않는다 | 미검증 — `plan.md` §E 알려진 위험에 기록. 재전송은 `spec.md` §5 범위 밖 |
| `params` 에 알 수 없는 필드가 섞여 온다 | zod 스키마가 걷어내므로 게이트웨이로는 네 필드만 나간다 | AC-CHANPERM-003 (키 집합 단언) |
| Claude Code 가 형식을 벗어난 `request_id` 를 만든다 | 채널은 그대로 넘긴다. 방의 안내 문구대로 쳐도 서버가 인식하지 못하는 것은 서버 쪽 결함이다 | AC-CHANPERM-007 + `spec.md` §5 (카드 `t7` 소유) |
| 채널 종료 중에 판정이 도착한다 | 예외도 처리되지 않은 거부도 남기지 않는다 | AC-CHANPERM-009 (미연결 경로와 같은 갈래) |

## 품질 게이트

| 항목 | 기준 |
|------|------|
| 타입 검사 | `npm run typecheck -w channel` 종료 코드 `0` |
| 테스트 | `npm test -w channel` 전체 통과. `permission-relay.test.ts` 의 실패 0건 |
| 범위 경계 | AC-CHANPERM-011 의 네 관측 모두 통과 |
| 무상태 | 테스트 실행 중 채널이 파일을 만들지 않는다 — `git status --porcelain` 에 `channel/` 아래 새 산출물이 없다 |
| 커밋 | `feat:` / `test:` 관례, 마일스톤마다 한 번 |

## Definition of Done

- AC-CHANPERM-001 부터 AC-CHANPERM-012 까지 **전부** 통과했고, 각 명령의 원문 출력이 `progress.md` §E.2 에 남았다.
- 요구사항 REQ-CHANPERM-001..010 각각이 최소 하나의 AC 에 매핑돼 있고, 그 매핑이 `progress.md` §E.1 에 표로 남았다.
- 미검증 항목(엣지 케이스 표의 "미검증" 한 줄 포함)이 §E.2 의 Gaps 절에 명시적으로 기록됐다.
- `spec.md` §3.1 의 가정-2·가정-3(서버 쪽 `request_id` 결함 두 건)이 여전히 미해결이라는 사실, 그리고 이 SPEC 이 그것을 보상하지 않았다는 사실이 §E.2 에 남았다.
