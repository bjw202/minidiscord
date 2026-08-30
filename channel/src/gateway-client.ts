// 게이트웨이 클라이언트: 봇 게이트웨이(ws://…/bot)에 붙어 있게 하는 WebSocket 배관.
// 프레임의 해석자가 아니라 전달자다 — type 값으로만 갈라 콜백에 넘기고 나머지 필드는 건드리지 않는다.
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
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

// welcome 의 증명 대조. 순서가 계약이다 — 존재 확인 → 길이 확인 → 상수 시간 대조.
// timingSafeEqual 은 길이가 다르면 예외를 던지므로 길이 확인이 반드시 먼저다 — 짧은 proof
// 한 프레임이 예외로 프로세스를 끝내지 않게 한다 (REQ-GWAUTH-009·010, plan.md §D-7).
// 대조는 timingSafeEqual 로만 한다 — === 는 plan.md §G 가 금지한다 (기준이 잡지 못하는 자리다).
function verifyProof(msg: any, nonce: string, token: string): boolean {
  if (typeof msg.proof !== 'string') return false
  if (!/^[0-9a-f]{64}$/.test(msg.proof)) return false
  // @MX:ANCHOR: [AUTO] 해시·HMAC 규칙의 채널 사본 — 워크스페이스가 분리되어 server/ 의 심볼을 import 할 수 없어 사본이 불가피하다 (SPEC-GWAUTH-001 §3.5)
  // @MX:REASON: 규칙의 정본은 server/src/routes-bots.ts:11 (sha256Hex), 서버 사용 지점은 server/src/gateway.ts handleHello 다. 이 사본이 정본과 갈라지면 왕복 기준(AC-GWAUTH-013)만 붉어진다 — 단위 기준은 각자의 규칙 안에서 초록으로 남는다
  const key = createHash('sha256').update(token).digest('hex')
  // room_id·bot_id 는 프레임이 주장하는 값을 그대로 쓴다 — 증명이 묶인 방과 프레임이 말하는
  // 방이 다르면 대조가 어긋나야 하기 때문이다 (REQ-GWAUTH-007, AC-GWAUTH-009).
  const expected = createHmac('sha256', key).update(`${nonce}|${msg.room_id}|${msg.bot_id}`).digest('hex')
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.proof, 'hex'))
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
    // 세션 확립 상태는 소켓 하나에 붙는다 (REQ-CHANAUTH-003). connect() 호출마다 새로 만들어지므로
    // 재접속하면 미확립으로 되돌아간다 — 상태를 클로저로 올리면 한 번 확립된 뒤 게이트가 영구히 열린다 (plan.md §H).
    let established = false
    // 거절 상태도 소켓 지역이다 — established 와 별개 플래그다. 클로저로 올리면 한 번 거절당한
    // 뒤 재접속이 영원히 막힌다 (plan.md §F M3-3).
    let proofRejected = false
    // 논스는 connect() 마다 새로 만든다 — 소켓 하나에 붙는다. 클로저로 올리면 한 소켓에서 관측된
    // (nonce, proof) 쌍이 다음 소켓에서 그대로 통하므로 재생이 열린다 (REQ-GWAUTH-002, plan.md §D-4).
    const nonce = randomBytes(32).toString('hex')
    ws.on('open', () => {
      backoff = 1000   // 짧게 끊겼다 붙기를 반복해도 대기가 자라지 않게 한다
      ws.send(JSON.stringify({ type: 'hello', token: opts.token, nonce }))   // 첫 프레임은 곧 인증이다
    })
    ws.on('message', d => {
      // JSON 아닌 프레임 하나로 프로세스가 끝나지 않게 한다 — 리스너 안의 throw 는
      // uncaughtException 으로 올라가 재접속조차 없이 봇이 사라진다. 아래 error 핸들러와 같은 방향의 방어다.
      let msg: any
      try { msg = JSON.parse(String(d)) } catch { return }
      // 이 SPEC 의 강제 지점 — t9 의 !established 게이트보다 앞이며 그 게이트와 독립이다 (REQ-GWAUTH-011·012).
      // 거절 뒤에 버퍼에 이미 들어와 있던 프레임도 여기서 버려진다 — close() 가 디스패치를 앞지르지 못하기 때문이다.
      if (proofRejected) return
      if (msg.type === 'welcome') {
        if (!verifyProof(msg, nonce, opts.token)) {
          // 플래그를 먼저 세우고, stderr 한 줄(stdout 은 MCP 전송 통로라 금지)을 내고, 그 다음에 닫는다 (REQ-GWAUTH-008).
          proofRejected = true
          console.error('minidiscord-channel: welcome 증명 대조 실패 — 세션을 확립하지 않고 소켓을 닫는다')
          ws.close()
          return
        }
        established = true   // 세션이 섰다 — 이 프레임 자체는 종전대로 콜백에 넘긴다 (REQ-CHANAUTH-002)
        opts.onWelcome?.(msg)
      } else if (!established) {
        // welcome 전에 온 message·verdict·history_response 는 어떤 콜백에도 넘기지 않고 버린다 (REQ-CHANAUTH-001).
        // 예외도 버퍼링도 없다 — 버퍼링하면 확립 전 주입이 확립 후에 되살아나 게이트가 무의미해진다.
      } else if (msg.type === 'message') opts.onMessage?.(msg)
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
