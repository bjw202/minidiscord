// SPEC-CHANWIRE-001 채널 배선 테스트 — acceptance.md 공통 하네스 + AC-CHANWIRE-001~005 (M1)
import { describe, it, expect, afterEach } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import type { AddressInfo } from 'node:net'
import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { wire } from '../src/index.js'

// 열어 둔 자원(WS 서버·게이트웨이 클라이언트·MCP 관찰자)의 일괄 정리 목록. 등록 역순으로 닫는다.
const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { while (cleanups.length) await cleanups.pop()!() })

// 조건이 설 때까지 기다린다. 고정 sleep 이 만드는 간헐 실패를 없앤다.
async function waitFor(pred: () => boolean, label: string, ms = 3000): Promise<void> {
  const t0 = Date.now()
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`waitFor timeout: ${label}`)
    await new Promise(r => setTimeout(r, 10))
  }
}

// MCP SDK 는 등록 키를 schema.shape.method.value 에서 읽는다 — 반드시 zod 스키마여야 한다 (plan.md §D 1번).
// meta 는 형제 테스트(channel-server.test.ts)와 같은 명시 형태다 — zod 4 에서는 단일 인자 z.record 를 쓸 수 없다.
const ChannelNotification = z.object({
  method: z.literal('notifications/claude/channel'),
  params: z.object({
    content: z.string(),
    meta: z.object({
      chat_id: z.string(),
      delivery: z.string(),
      sender: z.string(),
    }).passthrough(),
  }).passthrough(),
})

function gatewayStub() {
  const wss = new WebSocketServer({ port: 0 })
  const sent: any[] = []                                    // 봇이 게이트웨이로 보낸 프레임 전부, 순서대로
  const hooks: ((ws: WebSocket, m: any) => void)[] = []
  wss.on('connection', ws => {
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      sent.push(m)
      if (m.type === 'hello') ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))
      for (const h of hooks) h(ws, m)
    })
  })
  cleanups.push(() => new Promise<void>(r => wss.close(() => r())))
  return {
    sent,
    port: () => (wss.address() as AddressInfo).port,
    push: (msg: any) => { for (const c of wss.clients) c.send(JSON.stringify(msg)) },
    onFrame: (h: (ws: WebSocket, m: any) => void) => hooks.push(h),
    countOf: (pred: (m: any) => boolean) => sent.filter(pred).length,
  }
}

// 게이트웨이에 붙고 MCP 관찰자까지 연결된 상태를 만든다.
async function connected() {
  const stub = gatewayStub()
  const { channel, gw } = wire({ url: `ws://127.0.0.1:${stub.port()}/bot`, token: 'tok' })
  gw.start()
  cleanups.push(() => gw.stop())
  await waitFor(() => stub.sent.some(m => m.type === 'hello'), 'hello 도착')

  const obs = new Client({ name: 'obs', version: '0' })
  const [c, s] = InMemoryTransport.createLinkedPair()
  const notified: any[] = []
  obs.setNotificationHandler(ChannelNotification, n => { notified.push(n) })
  await Promise.all([obs.connect(c), channel.server.connect(s)])
  cleanups.push(async () => { await obs.close() })

  return { stub, channel, gw, obs, notified }
}

describe('channel wiring', () => {
  // AC-CHANWIRE-001 — 수신 갈래: 게이트웨이 메시지가 세션 알림으로 정확히 한 번 도착한다
  it('gateway message becomes exactly one session notification', async () => {
    const { stub, notified } = await connected()
    stub.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
    await waitFor(() => notified.length > 0, '알림 도착')
    expect(notified.length).toBe(1)
    expect(notified[0].params.meta.delivery).toBe('to')
    expect(notified[0].params.meta.chat_id).toBe('9')
    expect(notified[0].params.content).toContain('일정 정리해줘')
  })

  // AC-CHANWIRE-002 — cc 는 전달되지만 working 을 만들지 않는다
  it('cc message is delivered but raises no working status', async () => {
    const { stub, notified } = await connected()
    stub.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
    await waitFor(() => notified.length === 1, '첫 알림')
    const workingBefore = stub.countOf(m => m.type === 'status' && m.state === 'working')

    stub.push({ type: 'message', id: 10, body: '참고만', author_name: 'alice', delivery: 'cc' })
    await waitFor(() => notified.length === 2, 'cc 알림')
    expect(notified[1].params.meta.delivery).toBe('cc')
    // cc 는 전달되지만 상태를 흔들지 않는다. 아직 도착하지 않았을 뿐일 가능성을 배제하려 여유를 준다.
    await new Promise(r => setTimeout(r, 200))
    expect(stub.countOf(m => m.type === 'status' && m.state === 'working')).toBe(workingBefore)
  })

  // AC-CHANWIRE-003 — TO 수신이 working 상태를 만든다
  it('a TO message reports working to the gateway', async () => {
    const { stub, notified } = await connected()
    stub.push({ type: 'message', id: 9, body: '일정 정리해줘', author_name: 'alice', delivery: 'to' })
    await waitFor(() => stub.sent.some(m => m.type === 'status' && m.state === 'working'), 'working 프레임')
    await waitFor(() => notified.length === 1, '알림 도착')
    const workingIdx = stub.sent.findIndex(m => m.type === 'status' && m.state === 'working')
    expect(workingIdx).toBeGreaterThanOrEqual(0)
    expect(stub.sent[workingIdx].state).toBe('working')
  })

  // AC-CHANWIRE-004 — reply 도구가 게이트웨이 bot_message 가 된다
  it('reply tool sends a bot_message with mapped file paths', async () => {
    const { stub, obs } = await connected()
    await obs.callTool({ name: 'reply', arguments: { text: '정리 완료', files: ['/tmp/r.md'] } })
    await waitFor(() => stub.sent.some(m => m.type === 'bot_message'), 'bot_message 도착')
    const botMsg = stub.sent.find(m => m.type === 'bot_message')!
    expect(botMsg.body).toBe('정리 완료')
    expect(botMsg.files).toEqual([{ local_path: '/tmp/r.md' }])

    await obs.callTool({ name: 'reply', arguments: { text: '첨부 없음' } })
    await waitFor(() => stub.sent.filter(m => m.type === 'bot_message').length === 2, '두 번째 bot_message')
    expect(stub.sent.filter(m => m.type === 'bot_message')[1].files).toEqual([])
  })

  // AC-CHANWIRE-005 — idle 은 답변 뒤에 나간다
  it('idle status follows the bot_message, not precedes it', async () => {
    const { stub, obs } = await connected()
    await obs.callTool({ name: 'reply', arguments: { text: '정리 완료' } })
    await waitFor(() => stub.sent.some(m => m.type === 'status' && m.state === 'idle'), 'idle 프레임')
    const msgIdx = stub.sent.findIndex(m => m.type === 'bot_message')
    const idleIdx = stub.sent.findIndex(m => m.type === 'status' && m.state === 'idle')
    expect(msgIdx).toBeGreaterThanOrEqual(0)
    expect(idleIdx).toBeGreaterThan(msgIdx)
  })
})
