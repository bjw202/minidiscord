// 게이트웨이 클라이언트: 봇 게이트웨이(ws://…/bot)에 붙어 있게 하는 WebSocket 배관 — v2 A 단계 (SPEC-BOTMODEL-001).
// 접속은 맨몸 hello{token} → 맨몸 welcome 한 왕복이고 이후 프레임도 전부 맨몸 JSON 이다.
// 남은 것: 접속·백오프(1초 배증·상한 30초·open 시 복귀)·stop() 가드·requestHistory 의 rid 대조.
import { randomUUID } from 'node:crypto'
import { WebSocket } from 'ws'

export type UrlRef = string | (() => string)

// 서버가 봇 접속으로 보내는 message 프레임 — room_id 와 author_type 을 항상 싣는다 (REQ-BOTMODEL-014, spec.md §3.3)
export interface GatewayMessage {
  type: 'message'; room_id: number; id: number; body: string; author_name: string; author_type: string
  delivery: 'to' | 'cc'; files?: { name: string; local_path: string }[]
}

export interface GatewayClientOpts {
  url: UrlRef
  token: string
  onMessage?: (m: GatewayMessage) => void
  onVerdict?: (v: { type: 'permission_verdict'; request_id: string; behavior: 'allow' | 'deny' }) => void
  sleep?: (ms: number) => Promise<void>   // 테스트 주입용
  maxBackoffMs?: number                    // 기본 30000
}

// 이력 요청 — room_id 는 프레임 최상위에 실린다. 없으면 서버가 그 요청을 버린다 (REQ-BOTMODEL-013)
export interface HistoryParams { room_id?: number; since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }

export interface GatewayClient {
  start(): void
  stop(): void
  send(payload: object): boolean
  requestHistory(params: HistoryParams): Promise<any>
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

// @MX:ANCHOR: [AUTO] 게이트웨이 클라이언트 팩토리 — wire() 와 기준 하네스 여럿이 부르는 공개 경계다
// @MX:REASON: GatewayClientOpts / GatewayClient 시그니처는 SPEC-CHANWIRE-001 과 SPEC-BOTMODEL-001 이 함께 고정한다.
// 콜백 이름 하나만 바뀌어도 wire() 의 배선과 기준이 통째로 깨진다
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
      ws.send(JSON.stringify({ type: 'hello', token: opts.token }))
    })

    ws.on('message', d => {
      // JSON 아닌 프레임 하나로 프로세스가 끝나지 않게 한다 — 리스너 안의 throw 는
      // uncaughtException 으로 올라가 재접속조차 없이 봇이 사라진다.
      let msg: any
      try { msg = JSON.parse(String(d)) } catch { return }
      // welcome 은 확립의 표식일 뿐 콜백으로 가지 않는다 — rooms 는 서버가 방마다 room_id 로 다시 알려 준다
      if (msg?.type === 'message') opts.onMessage?.(msg)
      else if (msg?.type === 'permission_verdict') opts.onVerdict?.(msg)
      else if (msg?.type === 'history_response') {
        const entry = pending.get(msg.rid)
        if (entry) {
          clearTimeout(entry.timer)
          pending.delete(msg.rid)
          entry.resolve(msg)   // messages 만 꺼내지 않고 프레임 전체로 넘긴다
        }
        // 모르는 rid 는 조용히 무시한다 — 타임아웃된 요청의 늦은 응답도 여기로 온다
      }
      // 그 밖의 종류는 어디로도 가지 않는다
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

  function requestHistory(params: HistoryParams): Promise<any> {
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
