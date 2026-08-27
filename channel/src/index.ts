// MCP 채널 플러그인: 채널 서버와 게이트웨이 클라이언트를 잇는 배선 (SPEC-CHANWIRE-001).
// wire() 는 배선을 세우기만 하고 시작하지 않는다 — 접속(gw.start)과 stdio 연결은 호출자의 몫이다.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { pathToFileURL } from 'node:url'
import { createChannelServer, type ChannelHandle, type ChatMessage } from './channel-server.js'
import { createGatewayClient, type GatewayClient } from './gateway-client.js'

export interface WireOpts {
  url: string
  token: string
}

// 기본 주소는 문자열 하나까지 계약이다 — 서버를 기본 포트로 띄우고 환경변수 없이 봇을 붙이는 것이 표준 사용법이다.
export const DEFAULT_SERVER = 'ws://127.0.0.1:3000/bot'

export function resolveUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.MINIDISCORD_SERVER ?? DEFAULT_SERVER
}

export function wire(opts: WireOpts): { channel: ChannelHandle; gw: GatewayClient } {
  // 두 클로저는 서로를 참조하지만 호출은 gw.start() 이후에만 일어난다 — 선언 순서는 안전하다 (plan.md §D 7번).
  const gw = createGatewayClient({
    url: opts.url,
    token: opts.token,
    // 수신 갈래 + 상태 갈래. TO 이면 세션에 넘기기 전에 working 을 먼저 보낸다 (REQ-CHANWIRE-008).
    // gateway-client 가 이 콜백을 await 하지 않으므로 여기서 생긴 거부는 아무도 받지 않는다.
    // MCP 상대가 먼저 끊긴 뒤 채팅이 오면 pushChatMessage 가 거부되므로 명시적으로 삼킨다 —
    // 판정 갈래의 .catch(() => {}) (channel-server.ts) 와 같은 형태의 방어다.
    onMessage: async (m: ChatMessage) => {
      if (m.delivery === 'to') gw.send({ type: 'status', state: 'working' })
      await channel.pushChatMessage(m).catch(() => {})
    },
    // 판정 갈래: 게이트웨이 verdict 를 세션 알림으로 되돌린다. 두 필드만 골라 넘긴다 —
    // payload 의 type 같은 계약 밖 필드는 세션으로 가지 않는다 (REQ-CHANPERM-004).
    onVerdict: v => {
      channel.handlePermissionVerdict({ request_id: v.request_id, behavior: v.behavior })
    },
  })
  const channel = createChannelServer({
    // 송신 갈래. files 는 경로 문자열을 { local_path } 객체로 바꿔 싣는다 — 게이트웨이가 읽는 필드 이름이다 (REQ-CHANWIRE-011).
    // idle 은 bot_message 다음에 나간다. 순서가 계약이다 (REQ-CHANWIRE-009).
    sendToChat: async payload => {
      gw.send({ type: 'bot_message', body: payload.text, files: (payload.files ?? []).map(local_path => ({ local_path })) })
      gw.send({ type: 'status', state: 'idle' })
    },
    // 승인 요청 갈래: params 에 type 만 붙여 게이트웨이로 내보낸다 — 서버가 그 값으로 분기한다 (REQ-CHANPERM-004).
    sendPermissionRequest: params => {
      gw.send({ type: 'permission_request', ...params })
    },
    // 이력 갈래. 파라미터는 통째로 그대로 넘긴다 — since_id 는 봇의 따라잡기 커서다 (REQ-CHANWIRE-012).
    // 줄 앞의 #번호는 장식이 아니라 계약이다: 채널 지시문이 봇에게 이 번호를 다음 since_id 로 쓰라고 시킨다.
    fetchHistory: async params => {
      const res = await gw.requestHistory(params)
      const messages: { id: number; author_name: string; body: string; created_at: string }[] = res.messages ?? []
      if (messages.length === 0) return '(기록 없음)'
      return messages.map(m => `#${m.id} [${m.created_at}] ${m.author_name}: ${m.body}`).join('\n')
    },
  })
  return { channel, gw }
}

// 진입점 가드: 이 모듈이 실행 파일로 직접 구동될 때만 부작용이 일어난다. 임포트만으로는 아무 일도 없다 (REQ-CHANWIRE-002).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.MINIDISCORD_TOKEN
  const { channel, gw } = wire({ url: resolveUrl(), token: token ?? '' })
  // stdio 연결은 토큰과 무관하게 항상 — 토큰 없이 띄운 프로세스도 MCP 로 말을 걸면 답한다 (REQ-CHANWIRE-003·004).
  await channel.server.connect(new StdioServerTransport())
  // 토큰 게이트는 게이트웨이 접속만 가로막는다 (REQ-CHANWIRE-004).
  if (token) gw.start()
}
