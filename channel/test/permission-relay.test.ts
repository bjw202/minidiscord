// SPEC-CHANPERM-001 권한 릴레이 테스트 — acceptance.md 공통 하네스 + AC-CHANPERM-001~009.
// 원본 plan-v2.md Task 14 Step 1 의 유사 객체 스키마({ method } as any)는 쓰지 않는다 —
// SDK 가 schema.shape 에서 메서드를 읽으므로 등록 단계에서 깨진다 (plan.md §D 1번). 정본은 이 하네스다.
import { describe, it, expect, afterEach } from 'vitest'
import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
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

const REQ: Params = { request_id: 'abcde', tool_name: 'Bash', description: 'Run shell command', input_preview: 'ls -la' }

describe('permission relay', () => {
  // AC-CHANPERM-001 — 나간 id 로 돌아온다 (두 경로의 상관 관측)
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

  // AC-CHANPERM-002 — 정확한 메서드 이름에만 반응한다
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

  // AC-CHANPERM-003 — params 를 한 글자도 바꾸지 않는다
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

  // AC-CHANPERM-004 — 의존이 없는 배선에서도 깨지지 않는다
  it('survives a wiring without sendPermissionRequest', async () => {
    const { client } = await attach({ permission: false })
    const unhandled = collectUnhandled()

    await sendRequest(client, REQ)                       // 여기서 죽으면 안 된다
    expect(await unhandled()).toEqual([])

    // 서버가 여전히 살아 있는가 — 다른 기능이 정상 동작하는지로 잰다
    const out = await client.callTool({ name: 'reply', arguments: { text: 'ping' } })
    expect(out).toBeDefined()
  })

  // AC-CHANPERM-005 — 판정 알림이 계약대로 나간다
  it('emits exactly one permission notification with exactly two params', async () => {
    const { handle, verdicts } = await attach()
    handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
    await tick()

    expect(verdicts.length).toBe(1)
    expect(verdicts[0].params).toEqual({ request_id: 'abcde', behavior: 'allow' })
    expect(Object.keys(verdicts[0].params).sort()).toEqual(['behavior', 'request_id'])
  })

  // AC-CHANPERM-006 — 거절이 거절로서 도달한다
  it('delivers deny as deny', async () => {
    const { handle, verdicts } = await attach()
    handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'deny' })
    await tick()
    expect(verdicts[0].params.behavior).toBe('deny')
  })

  // AC-CHANPERM-007 — request_id 를 변형하지 않는다 (양방향)
  it('passes request_id through untouched in both directions', async () => {
    const { client, handle, requests, verdicts } = await attach()
    await sendRequest(client, { ...REQ, request_id: 'AbC12' })
    expect(requests[0].request_id).toBe('AbC12')         // 나가는 방향

    handle.handlePermissionVerdict({ request_id: 'abc12', behavior: 'allow' })
    await tick()
    expect(verdicts[0].params.request_id).toBe('abc12')  // 돌아오는 방향 — 서버가 준 그대로
  })

  // AC-CHANPERM-008 — 모르는 판정이 와도 다른 요청을 건드리지 않는다
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

  // AC-CHANPERM-009 — 연결 전 판정이 프로세스를 죽이지 않는다
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
})
