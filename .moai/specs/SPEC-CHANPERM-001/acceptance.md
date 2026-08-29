# SPEC-CHANPERM-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 계획 디렉터리의 다른 문서나 초기 커밋에 담긴 v1 초안은 이 SPEC 의 참조 대상이 아니다.

## 개정 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.3.0 | 2026-08-28 | **AC-CHANPERM-008 개정 (카드 `t9` / 감사 F-01).** 이 문서는 v0.2.2 까지 "모르는 `request_id` 의 판정도 그대로 중계한다"를 **정상 동작으로 못 박고** 있었고, 그 자리에 "열려 있는 계약 질문(미해소)" 블록을 달아 두었다. 카드 `t9` 가 그 질문에 **발신 id 를 기억하는 쪽으로 답했으므로**, 질문 블록을 걷어 내고 기준을 뒤집었다 — 이제 이 문서는 **발신하지 않은 id 의 판정이 한 건도 나가지 않는 것**을 잰다. 함께 바뀐 것: 검증 원칙 표의 "불일치 판정" 행, AC 매트릭스의 AC-008 행, 엣지 케이스 표 두 행, Definition of Done 한 줄. `spec.md` REQ-CHANPERM-008 이 같은 패스에서 개정됐고(v0.3.0), 새 요구사항 본체는 `SPEC-CHANAUTH-001` REQ-CHANAUTH-005..009 가 소유한다. **기준 개수는 12개 그대로다.** | manager-spec |

---

## 이 문서가 지키는 검증 원칙

이 SPEC 의 수용 기준은 **구현 본문이 비어 있어도 통과하는 기준을 하나도 두지 않는다**. 중계기는 특히 그런 기준이 나오기 쉬운 자리라 — "알림이 도착했다", "오류가 안 났다" 같은 단언이 전부 무의미하다 — 위험한 자리마다 어떤 스텁이 그 기준을 뚫는지 적어 두었다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 요청 릴레이 | "`sendPermissionRequest` 가 불렸다"는 **params 를 통째로 버리고 빈 객체를 넘기는 구현**도 통과시킨다 | 넘어간 객체가 네 필드 값까지 깊은 동등인가 (AC-CHANPERM-003) |
| 두 경로의 상관 | 나가는 쪽과 돌아오는 쪽을 따로 재면, 어느 한쪽에서 `request_id` 를 파생·재작성하는 구현이 양쪽 기준을 각각 통과한다 (둘 다 리터럴 id 를 쓰므로) | 나가는 경로에서 **관측한** id 를 되먹여 돌아온 알림이 원래 값을 싣는가 (AC-CHANPERM-001) |
| 메서드 이름 | "핸들러가 등록됐다"는 **모든 알림을 다 받는 구현**도 통과시킨다. 그런 구현은 자기가 보낸 판정 알림에도 반응한다 | 이름이 한 단어 다른 알림에서 `sendPermissionRequest` 가 **불리지 않는가** (AC-CHANPERM-002) |
| 거절 경로 | "판정 알림이 나갔다"는 **항상 `allow` 를 보내는 구현**도 통과시킨다 | Claude Code 쪽이 받은 `params.behavior` 가 정확히 `'deny'` 인가 (AC-CHANPERM-006) |
| 발신하지 않은 판정 | "예외가 안 났다"는 아무것도 재지 않는다. 그리고 "모르는 판정이 안 나갔다"만 재면 **판정 릴레이를 통째로 끊은 구현**이 통과한다 | 발신하지 않은 id 의 알림이 **한 건도 없는가**, 같은 테스트 안에서 발신한 id 의 알림은 정확히 1건 나가는가, 그 뒤 새 발신이 여전히 성립하는가 (AC-CHANPERM-008) |
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

> **v0.7.0 — 이 하네스는 이제 증명을 계산해 싣는다 (`SPEC-GWAUTH-001` M4 짝, 카드 `t15`).** 채널은 **증명 없는 `welcome` 을 거절**하므로(REQ-GWAUTH-006·008), 위 스텁은 `hello` 의 `nonce` 를 읽어 `HMAC-SHA256(key = sha256Hex(token), msg = `${nonce}|${room_id}|${bot_id}`)` 를 `proof` 로 계산해 `welcome` 에 실어 보낸다. 증명 계산 헬퍼(`keyOf`·`proofOf`)는 이 테스트 파일이 자체 정의하고 `src` 의 구현을 부르지 않는다 — 사본이 함께 틀려도 기준이 그것을 알아채지 못하게 하려는 의도다(SPEC-GWAUTH-001 §3.5). **이 블록은 그 코드의 명세 원본이다** — 실제 코드(`channel/test/permission-relay.test.ts:93`)가 이 설명과 함께 착지했다. 이 SPEC 의 요구사항·수용 기준은 **하나도 바뀌지 않았다** — 바뀐 것은 하네스가 스텁 서버를 흉내 내는 방식뿐이다.

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
| AC-CHANPERM-008 | REQ-CHANPERM-008 | 아래 본문 | 발신하지 않은 id 판정에서 알림 0건 + 발신한 id 판정에서 그 id 그대로 정확히 1건 + 같은 id 재판정에서 증가 없음 + 새 발신 뒤 정상 판정 성립 |
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
  const { client, handle, verdicts } = await attach()
  await sendRequest(client, REQ)                       // 먼저 발신한다 (v0.4.0 전제)
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
  await tick()

  expect(verdicts.length).toBe(1)
  expect(verdicts[0].params).toEqual({ request_id: 'abcde', behavior: 'allow' })
  expect(Object.keys(verdicts[0].params).sort()).toEqual(['behavior', 'request_id'])
})
```

**Then** 테스트가 통과한다.

메서드 이름은 하네스의 `PermissionVerdictNotification` 이 `z.literal` 로 고정한다 — 다른 이름으로 보내는 구현에서는 이 핸들러가 아예 불리지 않아 `verdicts.length` 가 `0` 이 된다. 키 집합 단언은 `.passthrough()` 가 있어야만 의미가 있다(문서 앞머리의 두 번째 경위).

> **v0.4.0 개정 (계획 감사 C-02).** 이전 판은 `attach()` 직후 **발신 없이** 판정을 밀어 넣고 알림 1건을 기대했다. 개정된 REQ-CHANPERM-008 아래에서 그 형태는 정상 구현에서 `verdicts.length` 가 `0` 이 되어 거짓 실패한다 — 발신 집합에 없는 id 이기 때문이다. 그래서 **같은 id 를 먼저 발신하는 한 줄을 앞에 넣었다.** 이 기준이 재는 것(정확히 한 건, 정확히 두 필드)은 한 글자도 바뀌지 않았다. `REQ` 의 `request_id` 가 `'abcde'` 이므로 단언의 값도 그대로다.

### AC-CHANPERM-006 — 거절이 거절로서 도달한다

**Given** 사람이 방에서 `no abcde` 라고 답해 게이트웨이가 `deny` 판정을 보냈다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('delivers deny as deny', async () => {
  const { client, handle, verdicts } = await attach()
  await sendRequest(client, REQ)                       // 먼저 발신한다 (v0.4.0 전제)
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'deny' })
  await tick()
  expect(verdicts[0].params.behavior).toBe('deny')
})
```

**Then** 테스트가 통과한다.

> **v0.4.0 개정 (계획 감사 C-02).** AC-CHANPERM-005 와 같은 이유로 발신 한 줄이 앞에 붙었다. 개정 전 형태에서는 `verdicts[0]` 이 `undefined` 라 프로퍼티 접근에서 깨진다.

이 기준을 AC-CHANPERM-005 와 **따로 두는 이유**가 있다. `behavior: 'allow'` 를 상수로 박아 넣은 구현은 AC-CHANPERM-005 를 온전히 통과한다. 사람이 거절했는데 세션이 그 도구를 실행하는 경로가 정확히 그 구현이고, 이 한 줄이 그것을 잡는 유일한 자리다.

### AC-CHANPERM-007 — `request_id` 를 변형하지 않는다 (양방향)

**Given** Claude Code 가 대소문자와 하이픈이 섞인 `request_id` 를 만들었다.
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('passes request_id through untouched in both directions', async () => {
  const { client, handle, requests, verdicts } = await attach()
  const issued = 'Ab-C12'                              // 대소문자·하이픈 혼합
  await sendRequest(client, { ...REQ, request_id: issued })
  expect(requests[0].request_id).toBe(issued)          // 나가는 방향

  // 돌아오는 방향은 나간 값을 그대로 되먹인다 — 나가는 경로에서 관측한 값을 쓴다
  handle.handlePermissionVerdict({ request_id: requests[0].request_id, behavior: 'allow' })
  await tick()
  expect(verdicts[0].params.request_id).toBe(issued)   // 글자 그대로
})
```

**Then** 테스트가 통과한다. 값이 `'Ab-C12'` 인 것이 이 기준의 전부다 — 대문자·소문자·하이픈이 한 값에 섞여 있으므로 `.toLowerCase()`·`.toUpperCase()`·`.trim()`·정규식 재생성 중 어느 하나라도 넣은 구현은 두 단언 중 하나에서 걸린다. **정규화를 발신 기록·조회 중 한쪽에만 넣으면** 발신 집합 조회가 빗나가 `verdicts[0]` 이 `undefined` 가 되고, **알림에 싣는 값을 정규화하면** 마지막 `toBe` 가 `'ab-c12'` 와 어긋난다. 잡지 못하는 갈래도 적어 둔다 — **양쪽 키를 모두 정규화하면서 알림에는 받은 값을 그대로 싣는 구현은 이 기준을 통과한다.** 그 구현은 REQ-CHANPERM-007(무변형 중계)을 어기지 않으므로 통과가 옳다 (`SPEC-CHANAUTH-001` 계획 감사 N-9 — 설명만 정정, 기준 본문·단언은 그대로).

> **v0.4.0 개정 — 문구가 아니라 설계를 바꿨다 (계획 감사 C-02).** 이전 판은 나가는 id `'AbC12'` 와 돌아오는 id `'abc12'` 를 **의도적으로 다르게** 두어, 서버가 소문자로 정규화해 되돌리는 현재 동작(`spec.md` §3.1 가정-3)에서 채널이 짝을 맞춰 주려 들지 않는지를 재려 했다. 개정된 REQ-CHANPERM-008 아래에서 **그 형태는 원리상 성립할 수 없다** — 발신 집합에는 `'AbC12'` 가 들어가는데 조회는 `'abc12'` 로 들어오므로 대조가 반드시 빗나가고, 정상 구현이 알림 0건으로 거짓 실패한다. 두 요구사항이 양립하지 않으므로 관측 형태를 바꿨다: **같은 id 로 양방향을 재고, 무변형은 값 자체의 문자 구성(`'Ab-C12'`)으로 관측한다.**
>
> **잃은 관측과 그 소유자.** 이 개정으로 "서버가 대소문자를 바꿔 되돌릴 때 채널이 어떻게 행동하는가"는 더 이상 여기서 관측되지 않는다. 그 상황은 **서버 쪽 결함이며 카드 `t7`(`SPEC-PERM-001`) 소관**이다(`spec.md` §3.1 가정-3: 등록은 원본 키·조회는 소문자 키). `t7` 이 그 결함을 고치면 나가는 id 와 돌아오는 id 는 항상 같아지므로 이 기준이 재는 형태가 곧 실제 형태가 된다. 고치기 전까지는 그 불일치를 **채널이 흡수하지 않는다**는 것이 이 SPEC 의 입장이고(REQ-CHANPERM-007), 그 입장은 개정 뒤에도 그대로다 — 다만 그 입장을 **이 기준이 아니라 `t7` 의 기준이 증명한다.**

### AC-CHANPERM-008 — 발신하지 않은 판정은 세션에 닿지 않는다

**Given** 채널 서버는 자신이 내보낸 `request_id` 의 집합만 기억한다 (REQ-CHANPERM-008, v0.3.0 개정).
**When** 다음을 추가하고 `npm test -w channel` 을 실행한다.

```ts
it('relays a verdict only for an id it actually emitted, exactly once', async () => {
  const { client, handle, requests, verdicts } = await attach()
  const unhandled = collectUnhandled()
  await sendRequest(client, REQ)                       // 발신한 것은 'abcde' 하나뿐이다
  expect(requests.map(r => r.request_id)).toEqual(['abcde'])

  handle.handlePermissionVerdict({ request_id: 'zzzzz', behavior: 'allow' })   // 발신한 적 없다
  await tick()
  expect(verdicts).toEqual([])                         // 한 건도 나가지 않는다

  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })   // 발신한 id
  await tick()
  expect(verdicts.map(v => v.params)).toEqual([{ request_id: 'abcde', behavior: 'allow' }])

  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'deny' })    // 이미 소진된 id
  await tick()
  expect(verdicts.length).toBe(1)                      // 두 번째는 나가지 않는다 (재생 차단)
  expect(await unhandled()).toEqual([])

  // 프로세스가 여전히 쓸 만한가 — 새로 발신한 id 로 잰다
  await sendRequest(client, { ...REQ, request_id: 'qqqqq' })
  handle.handlePermissionVerdict({ request_id: 'qqqqq', behavior: 'deny' })
  await tick()
  expect(verdicts.map(v => v.params)).toEqual([
    { request_id: 'abcde', behavior: 'allow' },
    { request_id: 'qqqqq', behavior: 'deny' },
  ])
})
```

**Then** 테스트가 통과한다.

**네 관측이 서로를 가린 채 통과할 수 없게 짜여 있다.** 첫 단언(`verdicts` 가 `[]`)만 있으면 **판정 릴레이를 통째로 끊은 구현**이 통과한다 — 그래서 둘째 단언이 같은 테스트 안에서 발신한 id 의 알림 1건을 요구한다. 셋째 단언이 없으면 **집합에서 지우지 않는 구현**이 통과하고, 그 구현에서는 한 번 발신된 id 가 영구 통행권이 되어 `deny` 를 `allow` 로 덮어쓰는 재생이 가능해진다. 마지막 단언 짝은 소진이 릴레이 전체를 막은 것이 아님을 새 발신으로 확인한다.

`verdicts` 를 `map(v => v.params)` 로 **통째로** `toEqual` 하는 형태가 이 기준의 핵심이다. `not.toContain` 은 쓰지 않는다 — 무엇이 없는지가 아니라 **무엇만 있는지**를 재야 "그 밖에는 아무것도 없다"가 성립한다. `request_id` 를 정규화하는 구현(발신 기록·조회 어느 쪽이든)은 조회가 빗나가 알림이 0건이 되거나 값이 어긋나 이 단언에서 걸린다 — REQ-CHANPERM-007 의 무변형 조항이 여기서도 함께 지켜진다.

> **v0.3.0 개정 기록 (감사 F-01).** 이전 판의 이 기준은 `expect(ids).toEqual(['zzzzz', 'abcde', 'abcde'])` 로, **모르는 id 의 판정이 알림으로 나가는 것을 통과 기준으로 못 박았다.** `.moai/reports/t4/sync-audit.md` F-01(Critical)이 바로 그 성질을 인증되지 않은 상대의 `allow` 를 세션으로 흘려보내는 경로로 지목했고, 카드 `t4` 는 판단을 F-01 소유 카드에 넘겼다. 카드 `t9` 가 **발신 id 를 기억하는 쪽으로 답했고**, 그 결과 이 기준은 정반대를 재게 됐다. 개정의 경계(무상태 원칙이 어디까지 좁아지는가)는 `spec.md` §4.3, 근거와 고르지 않은 대안은 `SPEC-CHANAUTH-001` `plan.md` §B 에 있다.
>
> **run 단계 주의.** `channel/test/permission-relay.test.ts` 의 해당 `it` 블록은 이전 문언으로 이미 구현돼 있다. `SPEC-CHANAUTH-001` `plan.md` §F M3 단계 1 이 **개정 전 테스트가 실패하는 것을 먼저 관측한 뒤** 이 본문으로 교체하도록 순서를 못 박았다 — 개정본을 먼저 넣으면 계약 충돌이 실재했다는 증거가 남지 않는다.

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
  await sendRequest(client, REQ)                       // 먼저 발신한다 (v0.4.0 전제)
  handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
  await tick()
  expect(verdicts.length).toBe(1)
})
```

**Then** 테스트가 통과한다.

> **v0.4.0 개정 (계획 감사 C-02).** 마지막 양성 짝에 발신 한 줄이 앞에 붙었다. 이전 판은 발신 기록 없이 알림 1건을 기대했으므로 개정된 계약에서 거짓 실패한다.
>
> **첫 단언 갈래는 개정하지 않았다.** 연결 전 판정(`expect(() => …).not.toThrow()` + `unhandled()` 가 비어 있음)은 발신 여부와 무관하게 성립한다 — 발신 집합에 없는 id 를 조용히 버리는 것이 개정된 계약의 정상 동작이고, 그때도 예외나 미처리 거부를 남기지 않아야 한다는 요구는 그대로이기 때문이다. 오히려 개정 뒤 이 갈래는 **두 방어를 동시에** 지난다.

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
| 같은 세션이 판정 전에 두 번째 승인 요청을 보낸다 | 두 요청이 각각 독립적으로 게이트웨이로 나가고 두 `request_id` 가 모두 발신 집합에 들어간다. 각각의 판정이 서로 간섭 없이 한 번씩 중계된다 | AC-CHANPERM-008 (여러 id 를 섞어 판정) |
| 같은 `request_id` 로 판정이 두 번 온다 | 첫 번째만 나간다. 중계와 동시에 id 가 발신 집합에서 지워지므로 두 번째는 재생으로 취급돼 버려진다 (v0.3.0 개정) | AC-CHANPERM-008 |
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
- **v0.3.0 개정분**: 개정 전 AC-CHANPERM-008 이 실패하는 원문과, 개정본으로 교체한 `channel/test/permission-relay.test.ts` 의 diff 가 `SPEC-CHANAUTH-001` 의 `progress.md` §E.2 에 남았다.
