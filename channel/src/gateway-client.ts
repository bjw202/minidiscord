// 게이트웨이 클라이언트: 봇 게이트웨이(ws://…/bot)에 붙어 있게 하는 WebSocket 배관.
// v2 상호 인증 (SPEC-GWAUTH-002): hello{pub, client_nonce} → challenge 대조 → auth 서명 → 봉투(env) 수신.
// 나가는 프레임은 봉투에 담지 않는다 — 봉투는 서버→채널 한 방향이다 (spec.md §5).
import { createHmac, createPrivateKey, createPublicKey, randomBytes, randomUUID, sign, timingSafeEqual } from 'node:crypto'
import { TLSSocket } from 'node:tls'
import { WebSocket } from 'ws'

export type UrlRef = string | (() => string)

export interface GatewayClientOpts {
  url: UrlRef
  token: string
  onMessage?: (m: { type: 'message'; id: number; body: string; author_name: string; delivery: 'to' | 'cc'; files?: { name: string; local_path: string }[] }) => void
  onVerdict?: (v: { type: 'permission_verdict'; request_id: string; behavior: 'allow' | 'deny' }) => void
  onWelcome?: (w: { type: 'welcome'; room_id: number; bot_id: number; bot_name: string; missed_after_id?: number }) => void
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

// @MX:ANCHOR: [AUTO] v2 열쇠 유도·전사·바인딩 규칙의 채널 정본 — 라벨 셋·DER 접두·구분자·바인딩 라벨이 이 함수 하나에 모여 있다 (plan.md §D-9)
// @MX:REASON: 워크스페이스가 분리돼 server/ 를 import 할 수 없어 규칙의 사본이 불가피하다 — 서버 쪽 쌍대 정본은
// server/src/routes-bots.ts 의 deriveBotKeys(유도 라벨·개인키 DER 접두)와 server/src/gateway.ts 의 handshakeTranscript·channelBinding
// (전사 라벨·구분자·바인딩 라벨)이다. 사본이 한 글자라도 갈리면 정상 구현이 거짓 실패하고 그 갈림은 왕복 기준(AC-GWAUTH2-020)만
// 붉어진다 — 단위 기준은 각자의 규칙 안에서 초록으로 남는다. cb 의 exportKeyingMaterial 호출은 2인자형 그대로여야 하고 양쪽
// 사본이 글자 그대로 같아야 같은 TLS 연결의 두 종단이 같은 cb 를 얻는다 (plan.md §D-10)
function v2Rules() {
  const SIGN_LABEL = 'minidiscord/v2/sign'
  const CONFIRM_LABEL = 'minidiscord/v2/server-confirm'
  const BINDING_LABEL = 'EXPORTER-minidiscord/v2/channel-binding'
  const BINDING_BYTES = 32
  const PKCS8_ED25519_PREFIX = '302e020100300506032b657004220420'   // 개인키 DER 머리 — Ed25519 고정값
  const SEP = '|'
  // 결정적 유도 — 같은 토큰은 언제나 같은 개인키·pub 을 낳는다 (REQ-GWAUTH2-001). 개인키는 이 함수가 만든
  // 객체로 메모리에만 존재하고 디스크·로그·프레임 어디에도 나가지 않는다
  const skOf = (t: string) => createPrivateKey({
    key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, 'hex'), createHmac('sha256', t).update(SIGN_LABEL).digest()]),
    format: 'der', type: 'pkcs8',
  })
  const pubOf = (t: string) => createPublicKey(skOf(t)).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
  const ksrvOf = (t: string) => createHmac('sha256', t).update(CONFIRM_LABEL).digest()
  // 전사 — challenge 와 auth 는 라벨 하나로만 다르다. 라벨이 같으면 한쪽 증명이 다른 쪽 자리에서 통한다 (design.md §C)
  const transcriptOf = (label: 'challenge' | 'auth', cn: string, sn: string, room: number, bot: number, pub: string, cb: string) =>
    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`
  const sessKeyOf = (t: string, cn: string, sn: string, room: number, bot: number, cb: string) =>
    createHmac('sha256', ksrvOf(t)).update(`session${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${cb}`).digest()
  return { skOf, pubOf, ksrvOf, transcriptOf, sessKeyOf, BINDING_LABEL, BINDING_BYTES }
}
const rules = v2Rules()

// 채널 바인딩 유도 (plan.md §D-10). TLS 소켓이 아니거나 유도에 실패하면 리터럴 'unbound' — 예외가 밖으로
// 나가지 않는다 (REQ-GWAUTH2-016). 2인자형만 쓴다 — 설치된 @types/node 는 3인자 overload 만 표기하지만
// 컨텍스트를 넘기면 «생략» 과 «길이 0» 이 갈라 서버 사본과 값이 어긋난다 (REQ-GWAUTH2-019)
function channelBinding(sock: unknown): string {
  try {
    if (!(sock instanceof TLSSocket)) return 'unbound'
    const exporter = sock as unknown as { exportKeyingMaterial?: (bytes: number, label: string) => Buffer }
    if (typeof exporter.exportKeyingMaterial !== 'function') return 'unbound'
    return exporter.exportKeyingMaterial(rules.BINDING_BYTES, rules.BINDING_LABEL).toString('hex')
  } catch {
    return 'unbound'
  }
}

export function createGatewayClient(input: GatewayClientOpts): GatewayClient {
  const opts = input
  let socket: WebSocket | null = null
  let stopped = false
  const maxBackoff = opts.maxBackoffMs ?? 30000
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>(r => setTimeout(r, ms)))
  const pending = new Map<string, Pending>()
  let backoff = 1000   // open 되면 이 값으로 되돌아간다

  // 신원은 토큰에서 결정적으로 유도된다 — 소켓 지역 상태가 아니라 클라이언트 수명의 값이다 (REQ-GWAUTH2-001)
  const sk = rules.skOf(opts.token)
  const pub = rules.pubOf(opts.token)

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
    // 이 소켓의 상태는 전부 여기서 태어나고 이 소켓과 함께 사라진다 (plan.md §D-8 — 클로저로 올리면
    // 한 번 거절당한 뒤 재접속이 막히거나, 한 번 확립된 뒤 게이트가 영구히 열린다).
    let established = false   // ③ SPEC-CHANAUTH-001 의 강제 지점이 거는 플래그
    let proofRejected = false // ② 서버 증명 대조 실패
    let frameRejected = false // ① 봉투 mac·seq 검사 실패 — «그 프레임을 버린다» 표식이다(아래 주석)
    let lastSeq = 0           // 받아들인 마지막 봉투의 seq — 이 값보다 큰 seq 만 받아들인다 (REQ-GWAUTH2-014).
                              // «정확히 1 증가» 는 서버가 보내는 쪽 규칙이고(REQ-GWAUTH2-013), 받는 쪽은 이하만 거절한다 —
                              // 건너뜀(삭제)을 탐지하지 않는 것이 이 설계의 공시된 한계다 (spec.md §0-7)
    let sessKey: Buffer | null = null
    let cb = 'unbound'
    // 논스는 connect() 마다 새로 만든다 — 소켓 하나에 붙는다. 클로저로 올리면 한 소켓에서 관측된 값이
    // 다음 소켓에서 그대로 통하므로 재생이 열린다 (REQ-GWAUTH2-010)
    const clientNonce = randomBytes(32).toString('hex')

    ws.on('open', () => {
      backoff = 1000   // 짧게 끊겼다 붙기를 반복해도 대기가 자라지 않게 한다
      // _socket 은 생성자가 세우는 인스턴스 필드라 open 이후에 읽는다 (plan.md §D-10)
      cb = channelBinding((ws as unknown as { _socket?: unknown })._socket)
      // hello 에는 비밀이 없다 — pub 과 논스뿐이다 (REQ-GWAUTH2-004, AC-GWAUTH2-003 의 키 집합)
      ws.send(JSON.stringify({ type: 'hello', pub, client_nonce: clientNonce }))
    })

    ws.on('message', d => {
      // JSON 아닌 프레임 하나로 프로세스가 끝나지 않게 한다 — 리스너 안의 throw 는
      // uncaughtException 으로 올라가 재접속조차 없이 봇이 사라진다. 아래 error 핸들러와 같은 방향의 방어다.
      let msg: any
      try { msg = JSON.parse(String(d)) } catch { return }
      // ② 핸드셰이크 강제 지점 — 체인 밖 독립 문장이고 ③ 보다 앞선다 (REQ-GWAUTH2-015). 거절 뒤에
      // 버퍼에 이미 들어와 있던 프레임도 여기서 버려진다 — close() 가 디스패치를 앞지르지 못하기 때문이다.
      if (proofRejected) return

      if (msg.type === 'challenge') {
        // 형식 검사가 대조보다 먼저다 (REQ-GWAUTH2-006) — §2.5 의 구분자 단일성 논증은 «논스는 hex, 방·봇은
        // 정수» 라는 성질에 서는데 그 값들은 신뢰할 수 없는 프레임이 실어 온 것이다. 어느 갈래가 걸렸는지는
        // 응답으로 알려 주지 않는다 — 갈래마다 다르게 대하면 상대가 차이로 어느 갈래인지 알아낸다.
        const formatOk =
          typeof msg.server_proof === 'string' && /^[0-9a-f]{64}$/.test(msg.server_proof) &&
          typeof msg.server_nonce === 'string' && /^[0-9a-f]{64}$/.test(msg.server_nonce) &&
          Number.isInteger(msg.room_id) && Number.isInteger(msg.bot_id)
        if (!formatOk) return rejectChallenge(ws)
        // 대조 값은 프레임이 주장한 room·bot·nonce 로 계산한다 — 증명이 묶인 값과 프레임이 말하는 값이
        // 다르면 대조가 어긋나야 하기 때문이다 ('other-room' 갈래가 잡는 자리다).
        const expected = createHmac('sha256', rules.ksrvOf(opts.token))
          .update(rules.transcriptOf('challenge', clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, pub, cb))
          .digest('hex')
        // 길이 확인이 상수 시간 대조보다 먼저다 — timingSafeEqual 은 길이가 다르면 던진다 (REQ-GWAUTH2-016).
        // 대조는 timingSafeEqual 로만 한다 — === 는 plan.md §G 가 금지한다 (기준이 잡지 못하는 자리다).
        const macOk = msg.server_proof.length === expected.length &&
          timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.server_proof, 'hex'))
        if (!macOk) return rejectChallenge(ws)
        // 서버가 자신을 증명한 뒤에, 그리고 그때에만 서명이 나간다 (REQ-GWAUTH2-007·008)
        sessKey = rules.sessKeyOf(opts.token, clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, cb)
        const signature = sign(null, Buffer.from(rules.transcriptOf('auth', clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, pub, cb)), sk).toString('hex')
        ws.send(JSON.stringify({ type: 'auth', signature }))
        return
      }
      if (msg.type === 'env') {
        // ① 프레임 인증 강제 지점 — else-if 체인 밖의 독립 문장이고 ③ 보다 앞선다 (REQ-GWAUTH2-015).
        // 검사 순서: 필드 존재·형식 → mac 대조 → seq 연속. payload 는 받은 문자열 그대로 MAC 한다 —
        // 파싱해 다시 직렬화하면 정규화 어긋남이 생긴다 (plan.md §D-6).
        const keysOk =
          typeof msg.payload === 'string' &&
          typeof msg.mac === 'string' && /^[0-9a-f]{64}$/.test(msg.mac) &&
          Number.isInteger(msg.seq)
        const macOk = keysOk && sessKey !== null && (() => {
          const expected = createHmac('sha256', sessKey!).update(`${msg.seq}|${msg.payload}`).digest('hex')
          return msg.mac.length === expected.length && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.mac, 'hex'))
        })()
        const seqOk = keysOk && macOk && msg.seq > lastSeq
        if (!keysOk || !macOk || !seqOk) {
          // 실패한 봉투는 이 프레임만 버린다 — 소켓은 살아 있고 다음 유효한 봉투는 계속 받아들인다.
          // AC-GWAUTH2-014·015 가 «같은 소켓에서» 그 직후의 유효한 봉투 도착을 요구하므로 close() 는
          // 쓰지 않는다 — plan.md §D-8 의 문자와는 어긋나지만 D-8 자신의 탈출 조건(«더 나은 구조를 찾으면
          // 변이 N3 의 기대값이 유지되는 한 그것을 택해도 된다»)이 이긴다. 귀속은 progress.md §E.2.13.
          frameRejected = true
          return
        }
        lastSeq = msg.seq
        let inner: any
        try { inner = JSON.parse(msg.payload) } catch { return }   // 파싱 실패도 버림으로 끝난다 — 예외 없다 (REQ-GWAUTH2-016)
        if (!established) {
          established = true   // 확립 — 봉투 welcome 이 왔을 때만이다 (REQ-GWAUTH2-017 — 맨몸 welcome 은 받지 않는다)
          // 바인딩 부재 공시 (REQ-GWAUTH2-020) — 확립한 접속에서 한 줄. open 시점에 미리 쓰지 않는 이유:
          // 거절만 되고 끝난 접속까지 공시하면 AC-GWAUTH2-019 의 «stderr 줄 수 = 접속 수» 가 공시 줄과
          // 겹쳐 깨진다. 해석의 귀속과 근거는 progress.md §E.2.13 에 남긴다.
          if (cb === 'unbound') {
            console.error('minidiscord-channel: 이 연결은 채널 바인딩이 없다(unbound) — 중계형 중간자가 배제되지 않는다')
          }
          if (inner.type === 'welcome') opts.onWelcome?.(inner)
          return
        }
        if (inner.type === 'message') opts.onMessage?.(inner)
        else if (inner.type === 'permission_verdict') opts.onVerdict?.(inner)
        else if (inner.type === 'history_response') {
          const entry = pending.get(inner.rid)
          if (entry) {
            clearTimeout(entry.timer)
            pending.delete(inner.rid)
            entry.resolve(inner)   // messages 만 꺼내지 않고 프레임 전체로 넘긴다
          }
          // 모르는 rid 는 조용히 무시한다 — 타임아웃된 요청의 늦은 응답도 여기로 온다
        }
        return
      }
      else if (!established) {
        // ③ — 확립 전에 온 봉투 아닌 프레임(v1 형태의 맨몸 welcome 포함)은 버려진다
        // (REQ-GWAUTH2-017, REQ-CHANAUTH-001). 버퍼링도 예외도 없다. return — 뒤에 어떤
        // 분배도 두지 않는다는 것을 제어 흐름으로 고정한다 (변이 O 의 이동 대상이 «뒤» 가
        // 되면 확립 전 challenge 가 ③ 에 먹혀 핸드셰이크가 멈춘다 — AC-GWAUTH2-017 이 관측).
        return
      }
      // 여기 도달한 프레임(확립 «후» 의 비(非)봉투 프레임)은 전선 위 다섯 종류 어디에도 해당하지
      // 않는 위반 프레임이다 — 봉투에서 푼 내부 프레임만 콜백에 간다 (REQ-GWAUTH2-014).
      // 그래서 이 자리에는 분배 체인이 없다 — 있는 그 자체가 주입 통로가 된다.
    })

    // challenge 거절 — 갈래와 무관하게 이 한 경로다. 플래그를 먼저 세우고 stderr 한 줄(stdout 은 MCP
    // 전송 통로라 금지다)을 내고, 그 다음에 닫는다 (REQ-GWAUTH2-006·016·019)
    function rejectChallenge(target: WebSocket): void {
      proofRejected = true
      console.error('minidiscord-channel: challenge 를 거절한다 — 서버 증명이 형식 또는 값 대조를 통과하지 못해 세션을 확립하지 않고 소켓을 닫는다')
      target.close()
    }

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
