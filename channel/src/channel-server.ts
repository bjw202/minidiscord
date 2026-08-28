// MCP 채널 서버: 공식 Channels 계약 구현 (spec 4-B)
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

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
  handlePermissionVerdict: (v: { request_id: string; behavior: 'allow' | 'deny' }) => void
}

// 들어오는 승인 요청 알림 스키마. method 를 z.literal 로 고정한다 — 느슨하게 비교하면
// 자기가 보낸 판정 알림(…/permission, 한 단어 짧다)까지 이 경로를 타고 게이트웨이로 되쏜다 (REQ-CHANPERM-002).
const PermissionRequestNotification = z.object({
  method: z.literal('notifications/claude/channel/permission_request'),
  params: z.object({
    request_id: z.string(),
    tool_name: z.string(),
    description: z.string(),
    input_preview: z.string(),
  }),
})

export function createChannelServer(deps: ChannelDeps): ChannelHandle {
  // 발신 집합 — 채널이 내보낸 request_id 문자열들의 상한 있는 목록. 무상태 원칙 개정이
  // 새로 인정하는 유일한 상태다(SPEC-CHANAUTH-001 plan §B). Set 의 삽입 순서 보장을 그대로 써서
  // 축출 순서를 유지하고, 상한 128 을 넘으면 가장 오래된 것부터 버린다 (REQ-CHANAUTH-008).
  const emitted = new Set<string>()

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

  // 승인 요청 릴레이: Claude Code 의 알림 params 를 deps 로 내보낸다. 받은 것 그대로 —
  // 절단·마스킹·대소문자 변경·필드 가감 어느 것도 하지 않는다 (REQ-CHANPERM-001·002).
  // 의존이 없는 배선에서는 조용히 지나친다 (REQ-CHANPERM-003, Task 11 계약의 옵셔널).
  // 내보낸 request_id 만 발신 집합에 넣는다 — 정규화 없이 글자 그대로 (REQ-CHANPERM-007).
  mcp.setNotificationHandler(PermissionRequestNotification, n => {
    if (deps.sendPermissionRequest) {
      deps.sendPermissionRequest(n.params)
      emitted.add(n.params.request_id)
      if (emitted.size > 128) {
        const oldest = emitted.values().next().value
        if (oldest !== undefined) emitted.delete(oldest)
      }
    }
  })

  // 판정 반환: 게이트웨이가 준 값을 그대로 실어 보낸다. params 는 두 필드뿐이다 —
  // payload 의 type 같은 계약 밖 필드는 골라 담지 않는다 (REQ-CHANPERM-005·006·007).
  // 채널이 기억하는 것은 위 발신 집합 하나뿐이다 — 그 안의 판정은 중계와 동시에 집합에서
  // 지워 재생으로 deny 를 allow 로 덮어쓰지 못하게 하고(REQ-CHANAUTH-007), 집합에 없는
  // 판정은 조용히 버린다 (REQ-CHANPERM-008, v0.3.0 개정). 디스크에는 여전히 아무것도 쓰지 않는다.
  function handlePermissionVerdict(v: { request_id: string; behavior: 'allow' | 'deny' }): void {
    if (!emitted.has(v.request_id)) return
    emitted.delete(v.request_id)
    // 거부를 명시적으로 받는다: transport 가 없으면 notification() 은 거부된 프로미스를 돌려주고,
    // void 로 버리면 처리되지 않은 거부가 되어 Node 가 프로세스를 끝낸다 (REQ-CHANPERM-009).
    mcp
      .notification({
        method: 'notifications/claude/channel/permission',
        params: { request_id: v.request_id, behavior: v.behavior },
      })
      .catch(() => {})
  }

  return { server: mcp, pushChatMessage, handlePermissionVerdict }
}
