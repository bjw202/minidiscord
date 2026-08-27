// 게이트웨이 클라이언트: 봇 게이트웨이(ws://…/bot)에 붙어 있게 하는 WebSocket 배관.
// 프레임의 해석자가 아니라 전달자다 — type 값으로만 갈라 콜백에 넘기고 나머지 필드는 건드리지 않는다.
import { randomUUID } from 'node:crypto'
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

// 이력 응답 대기 상한. 계약값이다 — 완화도 강화도 하지 않는다 (REQ-CHANCLIENT-011).
const HISTORY_TIMEOUT_MS = 10_000

// 아직 응답이 오지 않은 rid 를 그 요청의 resolve/reject/타이머에 연결해 둔 대기 맵.
interface Pending {
  resolve: (v: any) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export function createGatewayClient(input: GatewayClientOpts): GatewayClient {
  const opts = input
  let socket: WebSocket | null = null
  let stopped = false
  const maxBackoff = opts.maxBackoffMs ?? 30000
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  const pending = new Map<string, Pending>()
  let backoff = 1000   // open 되면 이 값으로 되돌아간다

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
      backoff = 1000   // 짧게 끊겼다 붙기를 반복해도 대기가 자라지 않게 한다
      ws.send(JSON.stringify({ type: 'hello', token: opts.token }))   // 첫 프레임은 곧 인증이다
    })
    ws.on('message', d => {
      const msg = JSON.parse(String(d))
      if (msg.type === 'welcome') opts.onWelcome?.(msg)
      else if (msg.type === 'message') opts.onMessage?.(msg)
      else if (msg.type === 'permission_verdict') opts.onVerdict?.(msg)
      else if (msg.type === 'history_response') {
        const entry = pending.get(msg.rid)
        if (entry) {
          clearTimeout(entry.timer)
          pending.delete(msg.rid)
          entry.resolve(msg)   // messages 만 꺼내지 않고 프레임 전체로 넘긴다
        }
        // 모르는 rid 는 조용히 무시한다 — 타임아웃된 요청의 늦은 응답도 여기로 온다
      }
      // 그 외 type 은 해석하지 않는다 — else 로 흘려보내지 않는다
    })
    // error 이벤트를 가만히 두면 처리되지 않은 예외로 프로세스가 죽는다. 재접속은 close 경로 하나에서만 일어난다.
    ws.on('error', () => {})
    ws.on('close', () => {
      if (!stopped) retry()
    })
  }

  async function retry() {
    await sleep(backoff)
    if (stopped) return   // 대기 중에 stop() 이 불렸으면 새 소켓을 열지 않는다
    backoff = Math.min(backoff * 2, maxBackoff)
    connect()
  }

  function requestHistory(params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }): Promise<any> {
    return new Promise((resolve, reject) => {
      const rid = randomUUID()
      const timer = setTimeout(() => {
        pending.delete(rid)
        reject(new Error(`history request ${rid} timed out after ${HISTORY_TIMEOUT_MS}ms`))
      }, HISTORY_TIMEOUT_MS)
      pending.set(rid, { resolve, reject, timer })
      if (!send({ type: 'history_request', rid, ...params })) {
        // 연결이 없다 — 타이머와 맵 흔적을 남기지 않고 즉시 실패한다
        clearTimeout(timer)
        pending.delete(rid)
        reject(new Error('gateway client is not connected'))
      }
    })
  }

  return {
    opts,
    start: connect,
    stop() {
      stopped = true
      socket?.close()
    },
    send,
    requestHistory,
  }
}
