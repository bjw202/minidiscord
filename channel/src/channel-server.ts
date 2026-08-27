// MCP 채널 서버: 공식 Channels 계약 구현 (spec 4-B)
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
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
