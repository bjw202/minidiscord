// MCP 채널 플러그인: 채널 서버와 게이트웨이 클라이언트를 잇는 배선 (SPEC-CHANWIRE-001).
// wire() 는 배선을 세우기만 하고 시작하지 않는다 — 접속(gw.start)과 stdio 연결은 호출자의 몫이다.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { pathToFileURL } from 'node:url'
import { createChannelServer, neutralizeEnvelope, type ChannelHandle, type ChatMessage } from './channel-server.js'
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

// 전송 판정: 스킴과 호스트 두 값만 본다 (REQ-CHANAUTH-010·011). 루프백 세 값(127.0.0.1·localhost·[::1])은
// ws 또는 wss 만 허용하고(F-A6 — 루프백 분기도 스킴을 본다), 그 외 원격은 wss 뿐이다(감사 F-07).
// Node 의 URL 은 IPv6 호스트를 대괄호째 돌려주므로 '[::1]' 형태가 집합에 있어야 하고(계획 감사 M-01),
// 대괄호 없는 IPv6 루프백 표기는 어떤 입력도 만나지 않는 사문이라 목록에 두지 않는다(F-A7, REQ-CHANINJECT-014).
// 해석 불가면 거부 — fail-closed.
// resolveUrl 을 건드리지 않는 이유는 plan.md §D — 형제 기준 AC-CHANWIRE-011 이 반환값을 글자 그대로 단언한다.
// @MX:NOTE: [AUTO] 판정만 하는 순수 함수다 — 진입점이 실제로 부르는지는 AC-CHANAUTH-011 이 따로 잰다
const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '[::1]']

export function isTransportAllowed(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  const schemeOk = u.protocol === 'ws:' || u.protocol === 'wss:'
  if (LOOPBACK_HOSTS.includes(u.hostname)) return schemeOk
  return u.protocol === 'wss:'
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
    // 결과는 구조화 JSON 문자열 하나다 (REQ-CHANINJECT-004·006): 줄 잇기를 버려 본문의 개행·#숫자·따옴표가
    // 원소 경계나 커서를 만들지 못하고, 커서는 배열 밖 cursor 필드에서 id 최댓값으로만 나온다 (REQ-CHANINJECT-005).
    // 빈 이력도 같은 모양의 JSON 이다 — 결과 타입이 갈리면 커서가 다시 텍스트 추측으로 돌아간다 (plan.md §B).
    // author·body 는 알림 통로와 같은 규칙(REQ-CHANINJECT-001)으로 중화한다 (v0.3.0, sync 감사 F-01) —
    // 알림만 중화하면 같은 문자열이 통로만 바꾸어 모델에 도착한다. id·at 은 무변형이다 — id 는
    // 커서의 유일한 출처이고(REQ-CHANINJECT-005), 중화 함수는 channel-server.ts 한 벌을 나눠 쓴다.
    fetchHistory: async params => {
      const res = await gw.requestHistory(params)
      const messages: { id: number; author_name: string; body: string; created_at: string }[] = res.messages ?? []
      const cursor = messages.length > 0 ? Math.max(...messages.map(m => m.id)) : null
      return JSON.stringify({
        cursor,
        messages: messages.map(m => ({
          id: m.id,
          at: m.created_at,
          author: neutralizeEnvelope(m.author_name),
          body: neutralizeEnvelope(m.body),
        })),
      })
    },
  })
  return { channel, gw }
}

// 진입점 가드: 이 모듈이 실행 파일로 직접 구동될 때만 부작용이 일어난다. 임포트만으로는 아무 일도 없다 (REQ-CHANWIRE-002).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.MINIDISCORD_TOKEN
  const url = resolveUrl()
  const { channel, gw } = wire({ url, token: token ?? '' })
  // stdio 연결은 토큰과 무관하게 항상 — 토큰 없이 띄운 프로세스도 MCP 로 말을 걸면 답한다 (REQ-CHANWIRE-003·004).
  await channel.server.connect(new StdioServerTransport())
  // 토큰 게이트는 게이트웨이 접속만 가로막는다 (REQ-CHANWIRE-004) — 전송 검사도 같은 자리다 (REQ-CHANAUTH-010·012),
  // stdio 는 잠그지 않는다. 거부 갈래는 stderr 한 줄로 알리고 프로세스는 계속 산다 — 종료시키면 stdio 로
  // 말을 걸던 상대가 이유 없이 끊긴 것으로 본다. stdout 은 MCP 전송 통로라 한 글자도 쓸 수 없다 (REQ-CHANAUTH-004).
  if (token && isTransportAllowed(url)) gw.start()
  else if (token) {
    // 거부 사유는 세 갈래로 갈라진다 (REQ-CHANINJECT-012·013, 감사 F-A10 · sync 감사 F-02) — 갈래의 사실과
    // 그 조치를 말한다. 갈래가 남의 사유를 물려받으면 운영자를 반대 방향으로 보낸다: 루프백 http: 주소가
    // «비루프백» 이라 말하며 wss:// 를 지목했고, 그 안내를 따른 접속은 TLS 로 못 붙어 조용히 재접속만 반복한다.
    // (i) 해석 불가 — 호스트가 없으므로 호스트를 근거로 안내하지 않는다. (ii) 루프백 + 비 ws 스킴 —
    // 조치는 스킴을 ws:// 로 바꾸는 것이다. (iii) 비루프백 평문 — 조치는 wss:// 다.
    let parsed: URL | null
    try {
      parsed = new URL(url)
    } catch {
      parsed = null
    }
    let reason: string
    if (parsed === null) reason = `${url} (주소를 해석하지 못했다)`
    else if (LOOPBACK_HOSTS.includes(parsed.hostname)) reason = `${url} (루프백 주소는 ws:// 를 쓴다)`
    else reason = `${url} (비루프백 호스트에는 wss:// 를 쓴다)`
    console.error(`minidiscord-channel: 게이트웨이 주소를 거부했다 — ${reason}`)
  }
}
