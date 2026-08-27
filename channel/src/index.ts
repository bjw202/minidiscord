// MCP 채널 플러그인: 채널 서버와 게이트웨이 클라이언트를 잇는 배선 (SPEC-CHANWIRE-001).
// wire() 는 배선을 세우기만 하고 시작하지 않는다 — 접속(gw.start)과 stdio 연결은 호출자의 몫이다.
import { createChannelServer, type ChannelHandle, type ChatMessage } from './channel-server.js'
import { createGatewayClient, type GatewayClient } from './gateway-client.js'

export interface WireOpts {
  url: string
  token: string
}

export function wire(opts: WireOpts): { channel: ChannelHandle; gw: GatewayClient } {
  // 두 클로저는 서로를 참조하지만 호출은 gw.start() 이후에만 일어난다 — 선언 순서는 안전하다 (plan.md §D 7번).
  const gw = createGatewayClient({
    url: opts.url,
    token: opts.token,
    // 수신 갈래 + 상태 갈래. TO 이면 세션에 넘기기 전에 working 을 먼저 보낸다 (REQ-CHANWIRE-008).
    // gateway-client 가 이 콜백을 await 하지 않으므로 여기서 생긴 거부는 처리되지 않는다 — 알려진 위험 (plan.md §D 5번).
    onMessage: async (m: ChatMessage) => {
      if (m.delivery === 'to') gw.send({ type: 'status', state: 'working' })
      await channel.pushChatMessage(m)
    },
  })
  const channel = createChannelServer({
    // 송신 갈래. files 는 경로 문자열을 { local_path } 객체로 바꿔 싣는다 — 게이트웨이가 읽는 필드 이름이다 (REQ-CHANWIRE-011).
    // idle 은 bot_message 다음에 나간다. 순서가 계약이다 (REQ-CHANWIRE-009).
    sendToChat: async payload => {
      gw.send({ type: 'bot_message', body: payload.text, files: (payload.files ?? []).map(local_path => ({ local_path })) })
      gw.send({ type: 'status', state: 'idle' })
    },
    // 이력 갈래 — 파라미터는 그대로 넘기고, 응답 렌더링은 M2 가 세운다 (plan.md §F M1 단계 2).
    fetchHistory: async params => JSON.stringify(await gw.requestHistory(params)),
  })
  return { channel, gw }
}
