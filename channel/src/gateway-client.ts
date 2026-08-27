// 게이트웨이 클라이언트: 봇 게이트웨이(ws://…/bot)에 붙어 있게 하는 WebSocket 배관.
// 프레임의 해석자가 아니라 전달자다 — type 값으로만 갈라 콜백에 넘기고 나머지 필드는 건드리지 않는다.
import { WebSocket } from 'ws'

export type UrlRef = string | (() => string)

export interface GatewayClientOpts {
  url: UrlRef
  token: string
  onMessage?: (m: { type: 'message'; id: number; body: string; author_name: string; delivery: 'to' | 'cc'; files?: { name: string; local_path: string }[] }) => void
  onVerdict?: (v: { type: 'permission_verdict'; request_id: string; behavior: 'allow' | 'deny' }) => void
  onWelcome?: (w: { room_id: number; bot_id: number; bot_name: string }) => void
  sleep?: (ms: number) => Promise<void>   // 테스트 주입용
  maxBackoffMs?: number                    // 기본 30000
}

export interface GatewayClient {
  start(): void
  stop(): void
  send(payload: object): boolean
  requestHistory(params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }): Promise<any>
  opts: GatewayClientOpts   // 재접속 시 url 교체를 위해 노출
}

export function createGatewayClient(input: GatewayClientOpts): GatewayClient {
  const opts = input
  let socket: WebSocket | null = null

  // 소켓이 OPEN 일 때만 보낸다. 그 외 상태에서는 false — 호출자가 이 값으로 연결 없음을 판정한다.
  function send(payload: object): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false
    socket.send(JSON.stringify(payload))
    return true
  }

  function connect() {
    const url = typeof opts.url === 'function' ? opts.url() : opts.url   // 시도할 때마다 다시 평가한다
    const ws = new WebSocket(url)
    socket = ws
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'hello', token: opts.token }))   // 첫 프레임은 곧 인증이다
    })
    ws.on('message', d => {
      const msg = JSON.parse(String(d))
      if (msg.type === 'welcome') opts.onWelcome?.(msg)
      else if (msg.type === 'message') opts.onMessage?.(msg)
      else if (msg.type === 'permission_verdict') opts.onVerdict?.(msg)
      // 그 외 type 은 해석하지 않는다 — else 로 흘려보내지 않는다
    })
    // error 이벤트를 가만히 두면 처리되지 않은 예외로 프로세스가 죽는다. 재접속은 close 경로에서만 일어난다.
    ws.on('error', () => {})
  }

  return {
    opts,
    start: connect,
    stop() {
      socket?.close()
    },
    send,
    requestHistory(_params) {
      return Promise.reject(new Error('history request not implemented yet'))
    },
  }
}
