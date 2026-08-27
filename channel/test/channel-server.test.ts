// SPEC-CHANNEL-001 채널 서버 계약 테스트 — acceptance.md 공통 하네스 + AC-CHANNEL-003·006~014
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createChannelServer } from '../src/channel-server.js'

type HistoryParams = { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }

// 의존성 호출 기록. 도구가 인자를 그대로 흘렸는지 여기서 관측한다.
interface Calls {
  replies: { text: string; files?: string[] }[]
  histories: HistoryParams[]
}

async function connect() {
  const calls: Calls = { replies: [], histories: [] }
  const handle = createChannelServer({
    sendToChat: async payload => { calls.replies.push(payload) },
    // 반환값을 인자에서 파생시킨다 — 상수를 하드코딩한 구현을 걸러 내기 위해서다 (plan.md §D 4번)
    fetchHistory: async params => {
      calls.histories.push(params)
      return `H:${params.since_id ?? '-'}:${params.limit ?? '-'}`
    },
  })
  const client = new Client({ name: 'test', version: '0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(clientTransport), handle.server.connect(serverTransport)])
  return { client, handle, calls }
}

// 채널 알림 스키마. setNotificationHandler 는 Zod 스키마에서 등록 키를 꺼내므로
// 객체 리터럴을 as any 로 넘기면 조용히 등록되지 않는다 (plan.md §D 2번 a).
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
type ChannelNote = z.infer<typeof ChannelNotification>

// 알림은 응답 없는 단방향 메시지다. pushChatMessage 의 await 는 "보냈다"까지만 보장하므로
// 약속을 먼저 잡아 둔 뒤에 부른다. 미도착은 null 로 관측된다 (plan.md §D 2번 b).
function nextNotification(client: Client, ms = 1500): Promise<ChannelNote | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), ms)
    client.setNotificationHandler(ChannelNotification, note => {
      clearTimeout(timer)
      resolve(note as ChannelNote)
    })
  })
}

// 도구 결과의 첫 텍스트 조각.
function textOf(res: unknown): string {
  return (res as { content: { type: string; text: string }[] }).content[0].text
}

// tools/list 에서 이름으로 도구 하나를 집는다. 없으면 그 자리에서 실패한다.
async function toolNamed(client: Client, name: string) {
  const listed = await client.listTools()
  const found = listed.tools.find(t => t.name === name)
  if (!found) throw new Error(`tool not listed: ${name}`)
  return found
}

describe('channel server', () => {
  // AC-CHANNEL-003 — 팩토리와 handshake
  it('creates a connectable MCP server identified as minidiscord-channel', async () => {
    const { client, handle } = await connect()
    expect(typeof handle.pushChatMessage).toBe('function')
    expect(client.getServerVersion()).toEqual({ name: 'minidiscord-channel', version: '0.1.0' })
  })

  // AC-CHANNEL-006 — 노출 도구는 정확히 둘
  it('exposes exactly the reply and fetch_history tools', async () => {
    const { client } = await connect()
    const listed = await client.listTools()
    expect(listed.tools.map(t => t.name).sort()).toEqual(['fetch_history', 'reply'])
  })

  // AC-CHANNEL-007 — reply 입력 스키마
  it('declares the reply input schema as text + optional files', async () => {
    const { client } = await connect()
    const reply = await toolNamed(client, 'reply')
    const s = reply.inputSchema as any
    expect(s.type).toBe('object')
    expect(s.properties.text.type).toBe('string')
    expect(s.properties.files.type).toBe('array')
    expect(s.properties.files.items.type).toBe('string')
    expect(s.required).toEqual(['text'])
    expect(reply.description).toContain('delivery="to"')
  })

  // AC-CHANNEL-008 — reply 의존성 호출과 sent 반환
  it('reply forwards text and files to sendToChat and answers "sent"', async () => {
    const { client, calls } = await connect()
    const res = await client.callTool({ name: 'reply', arguments: { text: '완료했습니다', files: ['/tmp/a.png'] } })
    expect(calls.replies).toEqual([{ text: '완료했습니다', files: ['/tmp/a.png'] }])
    expect(textOf(res)).toBe('sent')
  })

  // AC-CHANNEL-009 — fetch_history 입력 스키마
  it('declares all five optional fetch_history parameters and requires none', async () => {
    const { client } = await connect()
    const fh = await toolNamed(client, 'fetch_history')
    const s = fh.inputSchema as any
    expect(s.type).toBe('object')
    expect(Object.keys(s.properties).sort()).toEqual(['limit', 'since', 'since_id', 'speaker', 'until'])
    expect(s.properties.since_id.type).toBe('number')
    expect(s.properties.limit.type).toBe('number')
    expect(s.properties.since.type).toBe('string')
    expect(s.properties.until.type).toBe('string')
    expect(s.properties.speaker.type).toBe('string')
    expect(s.required ?? []).toEqual([])
  })

  // AC-CHANNEL-010 — #번호 커서 안내
  it('documents the #번호 numbering and the since_id cursor in the tool description', async () => {
    const { client } = await connect()
    const fh = await toolNamed(client, 'fetch_history')
    const d = fh.description ?? ''
    expect(d).toContain('#번호')
    expect(d).toContain('since_id')
    const sinceIdParam = (fh.inputSchema as any).properties.since_id.description ?? ''
    expect(sinceIdParam.length).toBeGreaterThan(0)
  })

  // AC-CHANNEL-011 — 인자·반환 그대로 흘리기
  it('passes fetch_history arguments through and returns the dependency string verbatim', async () => {
    const { client, calls } = await connect()
    const res = await client.callTool({ name: 'fetch_history', arguments: { since_id: 41, limit: 5 } })
    expect(calls.histories[0]).toEqual({ since_id: 41, limit: 5 })
    expect(textOf(res)).toBe('H:41:5')

    const bare = await client.callTool({ name: 'fetch_history', arguments: {} })
    expect(calls.histories[1]).toEqual({})
    expect(textOf(bare)).toBe('H:-:-')
  })

  // AC-CHANNEL-012 — 모르는 도구 거절 (부정 사례 + 양성 짝)
  it('rejects an unknown tool and touches no dependency', async () => {
    const { client, calls } = await connect()
    await expect(client.callTool({ name: 'delete_room', arguments: {} })).rejects.toThrow(/delete_room/)
    expect(calls.replies).toEqual([])
    expect(calls.histories).toEqual([])
  })

  // AC-CHANNEL-013 — TO 알림과 첨부 local_path
  it('pushChatMessage notifies with TO meta and the attachment local path', async () => {
    const { client, handle } = await connect()
    const seen = nextNotification(client)
    await handle.pushChatMessage({
      id: 3,
      author_name: 'alice',
      body: '봐줘',
      delivery: 'to',
      files: [{ name: 'x.png', local_path: '/data/uploads/x.png' }],
    })
    const note = await seen
    expect(note).not.toBeNull()
    expect(note!.method).toBe('notifications/claude/channel')
    expect(note!.params.content).toContain('alice')
    expect(note!.params.content).toContain('봐줘')
    expect(note!.params.content).toContain('/data/uploads/x.png')
    expect(note!.params.meta.chat_id).toBe('3')
    expect(note!.params.meta.delivery).toBe('to')
    expect(note!.params.meta.sender).toBe('alice')
  })

  // AC-CHANNEL-014 — cc 는 cc 로, 첨부 없으면 경로 안내 없음
  it('carries cc as cc and omits the attachment note when there are no files', async () => {
    const { client, handle } = await connect()
    const seen = nextNotification(client)
    await handle.pushChatMessage({ id: 7, author_name: 'bob', body: '참고', delivery: 'cc' })
    const note = await seen
    expect(note).not.toBeNull()
    expect(note!.params.meta.delivery).toBe('cc')
    expect(note!.params.meta.chat_id).toBe('7')
    expect(note!.params.content).toContain('bob')
    expect(note!.params.content).not.toContain('첨부 파일 경로')
  })
})
