// v2 형제 하네스 공용 조각 — server/test 가 쓰는 게이트웨이 접속과 열쇠 유도.
// 유도 규칙은 구현(server/src/routes-bots.ts deriveBotKeys · gateway.ts handshakeTranscript)을 부르지
// 않고 여기서 스스로 계산한다 — 사본이 함께 틀려도 기준이 알아채지 못하게 하려는 의도다
// (acceptance.md §공통 테스트 하네스, plan.md §D-9 — server/test 는 하나의 사본 자리다).
// channel/test 의 하네스와 상수를 공유하지 않는다 — 워크스페이스가 갈라져도 왕복 기준이 잡는다.
import { createHmac, createPrivateKey, createPublicKey, randomBytes, sign, timingSafeEqual } from 'node:crypto'
import WebSocket from 'ws'

const PKCS8_ED25519_PREFIX = '302e020100300506032b657004220420'   // 개인키 DER 머리 — Ed25519 고정값
const SEP = '|'
const CB = 'unbound'   // 평문 ws:// 하네스의 cb — 구현이 계산하는 값과 같다 (REQ-GWAUTH2-020)

export const skOf = (t: string) => createPrivateKey({
  key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, 'hex'), createHmac('sha256', t).update('minidiscord/v2/sign').digest()]),
  format: 'der', type: 'pkcs8',
})
export const pubOf = (t: string) =>
  createPublicKey(skOf(t)).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
export const ksrvHexOf = (t: string) => createHmac('sha256', t).update('minidiscord/v2/server-confirm').digest('hex')

// connectV2 가 세운 세션 — innerOf 가 봉투를 검증하고 풀 때 쓴다.
interface Session { sessKey: Buffer; lastSeq: number }
const sessions = new WeakMap<object, Session>()

// v2 로 접속해 challenge 대조 → auth 서명 → 봉투 welcome 도착까지를 하니스가 수행한다.
// 도착한 봉투는 innerOf(ws, raw) 로 풀어 쓴다 — 하니스가 서버의 봉투 규칙을 검증하지 않으면
// 서버가 맨몸으로 보내도 테스트가 초록인 자리가 생긴다.
export function connectV2(port: number, token: string): Promise<{ ws: any; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    const clientNonce = randomBytes(32).toString('hex')
    let settled = false   // welcome 해소 뒤에는 이 핸들러가 아무것도 하지 않는다 — 세션 소비는 innerOf 의 몫이다
    ws.on('open', () => {
      // hello 에는 비밀이 없다 — pub 과 논스뿐이다 (REQ-GWAUTH2-004). 논스는 이 소켓의 것 하나다
      ws.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: clientNonce }))
    })
    ws.on('message', (data: unknown) => {
      let msg: any
      try { msg = JSON.parse(String(data)) } catch { return }
      if (msg.type === 'challenge') {
        // 대조는 하니스도 한다 — 증명 없는 challenge 를 통과시키는 하니스는 서버의 부실 증명을 가려 준다
        const expected = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
          .update(`challenge${SEP}${clientNonce}${SEP}${msg.server_nonce}${SEP}${msg.room_id}${SEP}${msg.bot_id}${SEP}${pubOf(token)}${SEP}${CB}`)
          .digest('hex')
        if (typeof msg.server_proof !== 'string' || msg.server_proof.length !== expected.length ||
            !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.server_proof, 'hex'))) {
          ws.close()
          reject(new Error('harness: challenge 대조 실패'))
          return
        }
        const sessKey = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
          .update(`session${SEP}${clientNonce}${SEP}${msg.server_nonce}${SEP}${msg.room_id}${SEP}${msg.bot_id}${SEP}${CB}`)
          .digest()
        sessions.set(ws, { sessKey, lastSeq: 0 })
        const signature = sign(
          null,
          Buffer.from(`auth${SEP}${clientNonce}${SEP}${msg.server_nonce}${SEP}${msg.room_id}${SEP}${msg.bot_id}${SEP}${pubOf(token)}${SEP}${CB}`),
          skOf(token),
        ).toString('hex')
        ws.send(JSON.stringify({ type: 'auth', signature }))
        return
      }
      if (msg.type === 'env') {
        if (settled) return   // 확립 뒤 프레임의 검증·소비는 테스트 쪽 innerOf 가 한다 — 이중 소비하면 seq 가 어긋난다
        const session = sessions.get(ws)
        if (!session) return
        const expected = createHmac('sha256', session.sessKey).update(`${msg.seq}|${msg.payload}`).digest('hex')
        if (typeof msg.mac !== 'string' || msg.mac.length !== expected.length || msg.seq <= session.lastSeq ||
            !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.mac, 'hex'))) return
        session.lastSeq = msg.seq
        let inner: any
        try { inner = JSON.parse(msg.payload) } catch { return }
        if (inner.type === 'welcome') { settled = true; resolve({ ws, welcome: inner }) }
        return
      }
      // challenge·env 이외의 프레임은 이 하니스가 기다리는 것이 아니다 — 무시한다
    })
    ws.on('error', (e: Error) => reject(e))
    ws.on('close', () => reject(new Error('harness: welcome 전에 닫혔다')))   // 이미 settle 됐으면 무해하다
  })
}

// connectV2 로 연 소켓이 받은 원문 프레임을 검증하고 푼다. 봉투가 아니거나 검증에 실패하면 null —
// 형제 하네스의 nextMessage 류가 null 을 «온 것이 없다» 로 해석한다.
export function innerOf(ws: object, raw: any): any | null {
  const session = sessions.get(ws)
  if (!session || raw?.type !== 'env') return null
  const expected = createHmac('sha256', session.sessKey).update(`${raw.seq}|${raw.payload}`).digest('hex')
  if (typeof raw.mac !== 'string' || raw.mac.length !== expected.length || raw.seq <= session.lastSeq ||
      !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(raw.mac, 'hex'))) return null
  session.lastSeq = raw.seq
  try { return JSON.parse(raw.payload) } catch { return null }
}

// recordSocket — acceptance.md §「서버 소켓 프레임 기록」(4회차 감사 J-02) 이 정의한 관측 표면의 구현.
// createGateway 의 onConnection 으로 받은 서버 쪽 소켓에 붙는다 — 채널은 자기 소켓을 내주지 않으므로
// 서버가 받는 것과 보내는 것이 «그 소켓을 오간 프레임» 전부다. 두 방향 전부, 전선 순서대로, 파싱한
// 프레임과 전선 원문을 함께 기록한다 — 원문이 있는 이유는 «오간 것» 이 파싱 성공분만을 뜻하지 않기 때문이다.
// AC-GWAUTH2-004 가 쓴다(기준 본문은 M5).
export function recordSocket(ws: WebSocket): {
  sentFrames(): unknown[]; receivedFrames(): unknown[]
  rawSent(): string[]; rawReceived(): string[]
} {
  const sent: unknown[] = []
  const received: unknown[] = []
  const rawSent: string[] = []
  const rawReceived: string[] = []
  const orig = ws.send.bind(ws) as (data: unknown, cb?: (err?: Error) => void) => void
  ;(ws as unknown as { send: (data: unknown, cb?: (err?: Error) => void) => void }).send = (data, cb) => {
    const s = String(data)
    rawSent.push(s)
    try { sent.push(JSON.parse(s)) } catch { /* 비(非)JSON 전송도 원문에는 남는다 */ }
    orig(data, cb)
  }
  ws.on('message', (d: unknown) => {
    const s = String(d)
    rawReceived.push(s)
    try { received.push(JSON.parse(s)) } catch { /* 원문만 남는다 */ }
  })
  return { sentFrames: () => sent, receivedFrames: () => received, rawSent: () => rawSent, rawReceived: () => rawReceived }
}
