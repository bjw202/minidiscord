import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, isAbsolute, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash, createHmac, randomBytes, sign, timingSafeEqual } from 'node:crypto'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import WebSocket from 'ws'
import { openDb, type Db } from '../src/db.js'
import { createSseHub } from '../src/sse.js'
import { createGateway } from '../src/gateway.js'
import { registerAuthRoutes } from '../src/auth.js'
import { registerBotRoutes } from '../src/routes-bots.js'
import { pubOf, ksrvHexOf, skOf, connectV2, recordSocket } from './gateway-v2.js'
import { attributeHits, type CaptureRecord, type WinEntry } from './wsupgrade-judgment.js'

let dir: string
let db: Db

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'md-'))
  db = openDb(join(dir, 't.db'))
  mkdirSync(join(dir, 'up'), { recursive: true })
})
afterEach(() => { db.close(); rmSync(dir, { recursive: true, force: true }) })

// SPEC-WSUPGRADE-001 M1 — 자기 앱 수신 관측 저장소(spec.md §2 「자기 앱 수신 관측」). build() 가
// 관측 한 벌을 하나씩 쌓고, wsConnect 의 포획이 자기 포트로 관측을 찾아 귀속 대조를 한다.
// 이 파일 안에서 build() 가 여러 번 불려도 마지막으로 그 포트를 낸 앱이 «자기 앱»이다 —
// 닫힌 앱의 임시 포트가 뒤 build() 에 재배정돼도 뒤 쪽이 배열 뒤에 있으므로 올바르게 고른다.
interface WsUpgradeObservation {
  ownPort: number
  w1: WinEntry[]
  w2: WinEntry[]
  app: { server: { listening: boolean; address(): unknown } }
}
const wsupgradeObservations: WsUpgradeObservation[] = []

// 이 wsConnect 포트를 낸 build() 의 관측을 찾는다. Array.findLast 는 이 tsconfig(ES2022)에
// 없으므로 손으로 뒤에서부터 훑는다.
function wsupgradeObservationOf(port: number): WsUpgradeObservation | undefined {
  for (let i = wsupgradeObservations.length - 1; i >= 0; i--) {
    if (wsupgradeObservations[i].ownPort === port) return wsupgradeObservations[i]
  }
  return undefined
}

// 소켓 양끝의 주소 넷과 계열 둘을 읽는다. 런타임에는 net.Socket 이지만 업그레이드 사건과
// IncomingMessage 의 타입상으로는 Duplex 로만 보이는 자리라 좁혀 읽는다. 값이 없으면
// null 로 기록한다 — 누락이 아니라 null 이다(AC-002 이분 판정이 누락을 실패로 센다).
function wsupgradeSockEnds(socket: unknown): {
  localAddress: string | null; localPort: number | null
  remoteAddress: string | null; remotePort: number | null
  localFamily: string | null; remoteFamily: string | null
} {
  const s = socket as {
    localAddress?: string | null; localPort?: number | null
    remoteAddress?: string | null; remotePort?: number | null
    localFamily?: string | null; remoteFamily?: string | null
  } | null | undefined
  return {
    localAddress: s?.localAddress ?? null,
    localPort: typeof s?.localPort === 'number' ? s.localPort : null,
    remoteAddress: s?.remoteAddress ?? null,
    remotePort: typeof s?.remotePort === 'number' ? s.remotePort : null,
    localFamily: s?.localFamily ?? null,
    remoteFamily: s?.remoteFamily ?? null,
  }
}

// 기록 자리 — 저장소 루트 기준 .moai/reports/t39/captures/(acceptance.md §A 「기록 자리」).
// 루트는 cwd 가 아니라 이 시험 파일 위치(server/test/)에서 두 단계 위로 찾는다 — 워커의 cwd 를
// 믿지 않기 위해서다(web-shell.test.ts 의 같은 관용구). 디렉터리는 첫 포획 때만 만든다 —
// 포획 0건인 실행은 흔적을 남기지 않는다. 기록 실패는 원래 실패(비(非)101 응답)를 가리지도
// 대신하지도 않는다 — 조용히 무시하고 던짐 경로로 간다(plan.md §C).
let wsupgradeCaptureSeq = 0
function wsupgradePersistCapture(record: CaptureRecord): void {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
    const capturesDir = join(root, '.moai', 'reports', 't39', 'captures')
    mkdirSync(capturesDir, { recursive: true })
    const name = `capture-${record.capturedAt.replace(/[:.]/g, '-')}-${++wsupgradeCaptureSeq}.json`
    writeFileSync(join(capturesDir, name), JSON.stringify(record, null, 2) + '\n')
  } catch { /* 포획 기록의 실패는 조용히 — 관측이 시험을 바꾸지 않는다(G-1) */ }
}

// hub.publish 를 감싸 발행 내역을 기록한다. SseHub 가 publish 를 속성으로 갖는
// 평범한 객체라는 SPEC-SSE-001 의 계약에 의존한다 (plan.md §D 4번).
async function build(opts: { botFiles?: 'off' } = {}) {
  const app = Fastify()
  app.db = db
  const recorders: ReturnType<typeof recordSocket>[] = []
  await app.register(cookie)
  const hub = createSseHub()
  const published: { roomId: number; event: string; data: any }[] = []
  const orig = hub.publish.bind(hub)
  hub.publish = (roomId: number, event: string, data: any) => {
    published.push({ roomId, event, data })
    orig(roomId, event, data)
  }
  app.decorate('hub', hub)
  // SPEC-WSUPGRADE-001 M1 — 창2: Fastify onRequest 훅(spec.md §2 「자기 앱 수신 관측」). 이 파일의
  // 모든 시험이 균일하게 관측되도록 listen 전에 둔다. 업그레이드 요청은 이 창을 통과하지 않는다
  // (실측 .moai/reports/t39/probe-upgrade-window.log 배열1) — 그래서 이 창의 개수만으로는
  // «자기 앱이 답했다»를 뜻하지 않고, 귀속 대조를 통과한 항목만이 뜻한다(§5.4 버린 판별자 셋째 행).
  const w2: WinEntry[] = []
  app.addHook('onRequest', (req, _reply, done) => {
    w2.push({
      window: 'onRequest',
      seq: w2.length + 1,
      path: req.raw.url ?? null,
      remotePort: wsupgradeSockEnds(req.raw.socket).remotePort,
      t: Date.now(),
    })
    done()
  })
  registerAuthRoutes(app, db)
  registerBotRoutes(app)   // AC-GWAUTH2-001 이 초대 경로의 저장 값을 관측한다 — 라우트가 필요하다
  // botFilesDir: 봇이 첨부로 보낼 수 있는 파일의 허용 뿌리. 테스트는 임시 트리 전체를 허용해
  // 기존 첨부 테스트의 원본 파일(dir 바로 아래)이 그대로 통과하게 둔다 — 경계 밖 파일은
  // 아래 AC-GW-021 테스트가 이 트리 바깥에 따로 만든다.
  const gateway = createGateway(app, {
    uploadsDir: join(dir, 'up'),
    botFilesDir: opts.botFiles === 'off' ? undefined : dir,
    // AC-GWAUTH2-004 의 관측 표면 (acceptance.md §「서버 소켓 프레임 기록」) — 서버 끝에서
    // 오간 프레임을 처음부터 기록한다. 쓰지 않는 시험은 무시한다.
    onConnection: ws => { recorders.push(recordSocket(ws)) },
  })
  app.decorate('gateway', gateway)
  // SPEC-WSUPGRADE-001 M1 — 창1: 소비하지 않는 upgrade 리스너. 소켓을 쓰지도 닫지도 끊지도
  // 않는다(G-1: 관측이 대상을 바꾸면 안 된다) — ws 의 자기 리스너와 나란히 발화하며 핸드셰이크를
  // 깨지 않는다는 것은 실행으로 확인됐다(.moai/reports/t39/probe-upgrade-window.log 배열1 —
  // 리스너 둘, /bot 여전히 101). ws 의 리스너 뒤에 다는 배치가 그 실측과 같다.
  const w1: WinEntry[] = []
  app.server.on('upgrade', (req, socket) => {
    w1.push({
      window: 'upgrade',
      seq: w1.length + 1,
      path: req.url ?? null,
      remotePort: wsupgradeSockEnds(socket).remotePort,
      t: Date.now(),
    })
  })
  await app.listen({ port: 0 })
  const port = (app.server.address() as { port: number }).port
  wsupgradeObservations.push({ ownPort: port, w1, w2, app })
  return { app, hub, published, gateway, port, recorders, db }
}

function seedRoom(name = 'A'): number {
  return db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name).lastInsertRowid as number
}
function seedBot(name = 'pm'): number {
  return db.prepare("INSERT INTO bots (name, description) VALUES (?, '')").run(name).lastInsertRowid as number
}
function invite(roomId: number, botId: number): string {
  const token = randomBytes(32).toString('hex')
  // v2 저장 계약 (SPEC-GWAUTH-002 §D-3) — 검증자와 확인 열쇠만 저장한다. 유도는 이 파일의
  // 하니스 사본(gateway-v2.ts)으로 한다 — 구현을 부르지 않는다.
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')
    .run(roomId, botId, pubOf(token), ksrvHexOf(token))
  return token
}
function cursorOf(roomId: number, botId: number): number {
  return (db.prepare('SELECT last_delivered_id v FROM bot_tokens WHERE room_id=? AND bot_id=?')
    .get(roomId, botId) as { v: number }).v
}

// 접속 시점부터 프레임을 큐에 쌓는다. handleHello 는 welcome 과 재전송 message 를
// 같은 동기 블록에서 연속으로 보내고, 루프백에서 두 프레임은 한 TCP 세그먼트로 합쳐져
// 같은 스택에서 연속 emit 되기 쉽다. 테스트가 await 이후에 리스너를 붙이는 구조라면
// 그 사이(마이크로태스크 경계)에 지나간 재전송 프레임을 놓친다 — 구현이 옳아도
// 간헐적으로 실패하는, 진단이 가장 비싼 형태다. 큐가 그 경계를 없앤다.
type Inbox = { queue: any[]; waiters: { resolve: (m: any) => void; timer: NodeJS.Timeout }[] }
const inboxes = new WeakMap<WebSocket, Inbox>()

function wsConnect(port: number, token: string): Promise<{ ws: WebSocket; welcome: any }> {
  return new Promise((resolve, reject) => {
    // t_open — 이 접속의 ws 객체를 만들기 직전의 시각(SPEC-WSUPGRADE-001 §2 「포획 창」의
    // 시작 사건). 끝 사건은 아래 리스너의 t_close(unexpected-response 발화)다.
    const tOpen = Date.now()
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    // SPEC-WSUPGRADE-001 M1 — 비(非)101 응답의 원문 포획(AC-001·002). ws 는 unexpected-response
    // 리스너가 존재하기만 하면 abortHandshake 를 건너뛴다 — EventEmitter.emit 은 리스너의
    // 반환값과 무관하게 리스너가 하나라도 있으면 참을 돌린다(websocket.js:929 · SPEC-WSUPGRADE-001
    // §7-12 실측). 그러므로 기록만 하는 리스너로는 던짐이 살아나지 않고, 이 리스너는 기록 뒤
    // 스스로 실패를 다시 세운다(아래 재수립 — REQ-004·AC-005). 기록 중 무엇이 잘못돼도 try 는
    // 조용히 무시한다 — 포획 실패가 실패 재수립을 가리지 않게 하려는 것이다.
    ws.on('unexpected-response', (req, res) => {
      // 본문을 끝까지 모은 뒤 기록하고 재수립한다 — 동기 판독은 본문이 헤더 뒤 별도 세그먼트로
      // 올 때 빈 본문을 남긴다(실측: ws 의 400 이 Content-Length: 11 인데 body 가 "" 로 잡혔다).
      // 응답은 Connection: close + Content-Length 로 오므로 end 가 온다 — 소켓이 먼저 끊기는
      // 쪽(서버가 중간에 끊는 실패)에 대비해 error·close 폴백을 두고, 기록+재수립은 정확히
      // 한 번만 한다.
      const chunks: Buffer[] = []
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        try {
        const tClose = Date.now()
        const ends = wsupgradeSockEnds(res.socket)
        // 헤더 전건 — res.rawHeaders 의 [이름, 값, ...] 을 쌍으로 옮긴다. 대소문자·중복·순서를
        // 그대로 보존한다 — 하나도 빠뜨리지 않는 것이 AC-001 의 재는 것이다.
        const headers: { name: string; value: string }[] = []
        for (let i = 0; i < res.rawHeaders.length; i += 2) {
          headers.push({ name: res.rawHeaders[i], value: res.rawHeaders[i + 1] })
        }
        // 본문 chunks 는 리스너 위의 data 수집이 이미 모았다 — end 까지 기다린 것이므로
        // Content-Length 길이만큼 온전하다(AC-001 «본문 전체»).
        const clientPath = req.path
        const observation = wsupgradeObservationOf(port)
        const windowLogs = {
          upgrade: observation?.w1 ?? [],
          onRequest: observation?.w2 ?? [],
        }
        // 귀속 — 포획된 응답 소켓의 localPort·경로·포획 창으로만 이 요청에 귀속한다(§2 「귀속」).
        // 창 단위 개수 증감은 쓰지 않는다 — 혼입이 «자기 앱이 답했다» 쪽 거짓 양성을 내는
        // 버린 판별자다(§5.4 셋째 행).
        const { hits, collision } = attributeHits(windowLogs, ends.localPort, clientPath, tOpen, tClose)
        wsupgradePersistCapture({
          // node 의 IncomingMessage 는 서버 요청과 클라이언트 응답이 한 타입이라 statusCode 가
          // optional 이다. 이 사건은 상태 줄이 파싱된 뒤에만 발화하므로 여기서는 반드시 값이 있다.
          // 값을 지어내지 않는다(?? 0 같은 대체값 금지) — 만에 하나 없으면 그대로 빠지고
          // AC-001 의 이분 판정이 «상태 코드 없음» 으로 실패로 잡는다.
          statusCode: res.statusCode as number,
          statusLine: `HTTP/${res.httpVersion} ${res.statusCode} ${res.statusMessage ?? ''}`.trimEnd(),
          headers,
          body: Buffer.concat(chunks).toString('utf8'),
          localAddress: ends.localAddress,
          localPort: ends.localPort,
          remoteAddress: ends.remoteAddress,
          remotePort: ends.remotePort,
          localFamily: ends.localFamily,
          remoteFamily: ends.remoteFamily,
          windowLogs,
          attributionHits: hits,
          attributionHitCount: hits.length,
          tOpen,
          tClose,
          collision: collision ? '있음' : '없음',
          portPossession: observation === undefined ? null : {
            ownPort: port,
            listening: observation.app.server.listening,
            address: observation.app.server.address(),
          },
          capturedAt: new Date(tClose).toISOString(),
          clientPath,
        })
        } catch { /* 포획·기록의 실패는 조용히 — 실패 재수립은 아래에서 어느 쪽이든 한다 */ }
        // 실패 재수립(REQ-004·AC-005) — 기록 뒤 관측된 상태 코드를 실은 응답자 오류로 직접 세운다.
        // ws 는 리스너 존재만으로 abortHandshake 를 건너뛰므로(위 주석) 값 돌려주기로는 던짐이
        // 살아나지 않는다. 이 재수립이 없으면 접속이 매달려 시험 실패가 5초 시간 초과로 바뀌고,
        // 그것이 1회차 AC-005 기준 실패의 정확한 모양이었다(m4/mutations.md §5). 소켓 파기는 원
        // abortHandshake 의 정리를 모방한다 — 재수립은 try 밖에 두어 포획이 실패해도 실패는 세워진다.
        res.socket.destroy()
        ws.emit('error', new Error(`Unexpected server response: ${res.statusCode}`))
      }
      res.on('data', c => chunks.push(c as Buffer))
      res.on('end', finish)
      res.on('error', finish)
      res.on('close', finish)
    })
    const inbox: Inbox = { queue: [], waiters: [] }
    inboxes.set(ws, inbox)
    // v2 핸드셰이크 (SPEC-GWAUTH-002) — hello{pub, client_nonce} → challenge 대조 → auth 서명.
    // 이후 프레임은 전부 봉투다 — 검증하고 풀어 내부 프레임을 큐에 넣는다. 대조·검증 규칙은 이
    // 파일의 사본으로 계산한다(위 gateway-v2.ts 와 같은 근거).
    const clientNonce = randomBytes(32).toString('hex')
    let sessKey: Buffer | null = null
    let lastSeq = 0
    let welcomed = false
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: clientNonce })))
    ws.on('message', data => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'challenge') {
        const expected = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
          .update(`challenge|${clientNonce}|${msg.server_nonce}|${msg.room_id}|${msg.bot_id}|${pubOf(token)}|unbound`)
          .digest('hex')
        if (typeof msg.server_proof !== 'string' || msg.server_proof.length !== expected.length ||
            !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.server_proof, 'hex'))) {
          ws.close()
          reject(new Error('harness: challenge 대조 실패'))
          return
        }
        sessKey = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
          .update(`session|${clientNonce}|${msg.server_nonce}|${msg.room_id}|${msg.bot_id}|unbound`)
          .digest()
        const signature = sign(
          null,
          Buffer.from(`auth|${clientNonce}|${msg.server_nonce}|${msg.room_id}|${msg.bot_id}|${pubOf(token)}|unbound`),
          skOf(token),   // 하니스의 개인키도 스스로 유도한다 — 구현의 deriveBotKeys 를 부르지 않는다
        ).toString('hex')
        ws.send(JSON.stringify({ type: 'auth', signature }))
        return
      }
      if (msg.type === 'env') {
        const expected = createHmac('sha256', sessKey!).update(`${msg.seq}|${msg.payload}`).digest('hex')
        if (sessKey === null || typeof msg.mac !== 'string' || msg.mac.length !== expected.length ||
            msg.seq <= lastSeq || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.mac, 'hex'))) return
        lastSeq = msg.seq
        let inner: any
        try { inner = JSON.parse(msg.payload) } catch { return }
        if (inner.type === 'welcome' && !welcomed) {
          welcomed = true
          resolve({ ws, welcome: inner })   // welcome 은 큐에 넣지 않는다 — v1 하니스와 같은 의미다
          return
        }
        const w = inbox.waiters.shift()
        if (w) { clearTimeout(w.timer); w.resolve(inner) } else inbox.queue.push(inner)
        return
      }
      // challenge·env 이외(맨몸 welcome 등)는 이 하니스가 기다리는 프레임이 아니다 — 무시한다
    })
    ws.on('error', reject)
    ws.on('close', () => reject(new Error('closed before welcome')))   // 이미 settle 됐으면 무해하다
  })
}

// 큐에 이미 들어온 것이 있으면 그것을 먼저 돌려준다.
function nextMessage(ws: WebSocket, timeoutMs = 2000): Promise<any> {
  const inbox = inboxes.get(ws)
  if (!inbox) return Promise.reject(new Error('wsConnect() 로 연 소켓에만 쓸 수 있다 — 프레임 큐가 없다'))
  if (inbox.queue.length > 0) return Promise.resolve(inbox.queue.shift())
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      reject(new Error('timeout waiting ws message'))
    }, timeoutMs)
    inbox.waiters.push({ resolve, timer })
  })
}

// 오지 말아야 할 메시지가 오지 않음을 관측한다. 큐에 이미 쌓여 있어도 실패다 —
// 그렇지 않으면 대기 시작 전에 도착한 프레임을 못 본 채로 통과한다.
function expectNoMessage(ws: WebSocket, ms = 400): Promise<void> {
  const inbox = inboxes.get(ws)
  if (!inbox) return Promise.reject(new Error('wsConnect() 로 연 소켓에만 쓸 수 있다 — 프레임 큐가 없다'))
  if (inbox.queue.length > 0) {
    return Promise.reject(new Error(`unexpected ws message: ${JSON.stringify(inbox.queue[0])}`))
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      resolve()
    }, ms)
    inbox.waiters.push({ resolve: m => reject(new Error(`unexpected ws message: ${JSON.stringify(m)}`)), timer })
  })
}

function closedPromise(ws: WebSocket): Promise<void> {
  return new Promise(r => ws.on('close', () => r()))
}

// SPEC-GWAUTH-001 기준의 독립 증명 계산. 구현이 쓰는 코드(sha256Hex)를 부르지 않고
// node:crypto 로 스스로 계산한다 — 공유하면 규칙이 함께 틀려도 기준이 알아채지 못한다
// (acceptance.md §공통 테스트 하네스, spec.md §3.5 — 사본은 의도된 것이다).
const skSeedHexOf = (token: string): string => createHmac('sha256', token).update('minidiscord/v2/sign').digest('hex')

describe('gateway', () => {
  // AC-GW-001 — 토큰이 방과 봇을 결정하고, 경로는 /bot 뿐이다
  it('welcomes each token as its own (room, bot) and only on /bot', async () => {
    const { app, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const tokenA = invite(roomA, pm)
    const tokenB = invite(roomB, qa)
    const seenAt = () => (db.prepare('SELECT last_seen_at v FROM bot_tokens WHERE room_id=? AND bot_id=?')
      .get(roomA, pm) as { v: string | null }).v
    expect(seenAt()).toBeNull()   // 접속 전

    const a = await wsConnect(port, tokenA)
    const b = await wsConnect(port, tokenB)
    // 분별: 두 토큰이 서로 다른 방·봇으로 판정된다. 상수를 돌려주는 구현은 여기서 깨진다.
    expect([a.welcome.room_id, a.welcome.bot_id, a.welcome.bot_name]).toEqual([roomA, pm, 'pm'])
    expect([b.welcome.room_id, b.welcome.bot_id, b.welcome.bot_name]).toEqual([roomB, qa, 'qa'])
    expect(a.welcome.missed_after_id).toBe(0)
    // 분별: 접속이 last_seen_at 을 채운다. 갱신을 통째로 생략한 구현은 여기서 깨진다 (REQ-GW-001).
    expect(seenAt()).not.toBeNull()

    // 경로 격리: /bot 이 아닌 경로는 업그레이드되지 않는다.
    const wrong = new WebSocket(`ws://127.0.0.1:${port}/nope`)
    const wrongFailed = await new Promise<boolean>(r => {
      wrong.on('error', () => r(true))
      wrong.on('open', () => r(false))
    })
    expect(wrongFailed).toBe(true)

    // onClose 정리: app 이 닫히면 열린 소켓도 닫힌다.
    const bothClosed = Promise.all([closedPromise(a.ws), closedPromise(b.ws)])
    await app.close()
    await bothClosed
  })

  // AC-GW-002 — 다섯 가지 거절 경로
  it('rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), archived = seedRoom('보관됨')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const good = invite(room, pm)
    const revoked = invite(room, qa)
    db.prepare("UPDATE bot_tokens SET revoked_at=datetime('now') WHERE verifier_pub=?").run(pubOf(revoked))
    const archivedToken = invite(archived, qa)
    db.prepare("UPDATE rooms SET status='archived' WHERE id=?").run(archived)

    // 1~3: 세 가지 잘못된 토큰은 모두 닫힌다.
    for (const bad of ['f'.repeat(64), revoked, archivedToken]) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      let welcomed = false
      ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: bad })))
      ws.on('message', () => { welcomed = true })
      await closedPromise(ws)
      expect(welcomed).toBe(false)
    }
    expect(gateway.isOnline(room, qa)).toBe(false)
    expect(gateway.isOnline(archived, qa)).toBe(false)

    // 4: hello 없이 보낸 프레임은 처리되지 않고 접속이 닫힌다.
    const anon = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    await new Promise<void>(r => anon.on('open', () => r()))
    anon.send(JSON.stringify({ type: 'bot_message', body: '몰래' }))
    await closedPromise(anon)
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)

    // 대조군: 같은 서버에서 정상 토큰은 환영받는다 — "전부 닫는" 구현을 배제한다.
    const ok = await wsConnect(port, good)
    expect(ok.welcome.bot_id).toBe(pm)

    // 5: 인증된 접속이라도 파싱 불가한 프레임을 보내면 조용히 닫힌다.
    // 스위트를 오염시키는 uncaught 예외가 아니라 정상 종료여야 한다 (plan.md §D 8번).
    const okClosed = closedPromise(ok.ws)
    ok.ws.send('{이건 JSON 이 아니다')
    await okClosed
    expect((db.prepare('SELECT COUNT(*) c FROM messages').get() as { c: number }).c).toBe(0)
    expect(gateway.isOnline(room, pm)).toBe(false)

    await app.close()
  })

  // AC-GW-003 — 재전송은 그 봇 타깃의 커서 이후 것만
  it('replays only missed messages targeted at that bot and advances the cursor', async () => {
    const { app, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    const token = invite(room, pm)
    const ins = (body: string) => db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, body).lastInsertRowid as number
    const target = (id: number, bot: number, d: string) => db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(id, bot, d)

    const oldId = ins('이미 받은 것'); target(oldId, pm, 'to')
    const mine = ins('내 앞으로 온 것'); target(mine, pm, 'to')
    const other = ins('qa 앞으로 온 것'); target(other, qa, 'to')
    const untargeted = ins('아무에게도 아닌 것')
    db.prepare('UPDATE bot_tokens SET last_delivered_id=? WHERE room_id=? AND bot_id=?').run(oldId, room, pm)

    const { ws } = await wsConnect(port, token)
    const replay = await nextMessage(ws)
    expect(replay.type).toBe('message')
    expect(replay.id).toBe(mine)
    expect(replay.delivery).toBe('to')
    // 부정 관측: 다른 봇 타깃도, 무타깃도, 커서 이전 것도 오지 않는다.
    await expectNoMessage(ws)
    expect([other, untargeted, oldId]).not.toContain(replay.id)
    // 커서가 재전송한 마지막 번호로 이동한다.
    expect(cursorOf(room, pm)).toBe(mine)
    ws.close()
    await app.close()
  })

  // AC-GW-004 — 재접속해도 같은 메시지가 두 번 오지 않는다
  it('never redelivers a message after reconnect', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)
    const first = await wsConnect(port, token)

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(room).lastInsertRowid as number
    db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(msgId, pm, 'to')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    gateway.deliver(room, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    const got = await nextMessage(first.ws)
    expect(got.id).toBe(msgId)
    expect(cursorOf(room, pm)).toBe(msgId)

    first.ws.close()
    await closedPromise(first.ws)

    // 재접속: 커서가 이미 그 번호이므로 재전송할 것이 없다.
    const again = await wsConnect(port, token)
    expect(again.welcome.missed_after_id).toBe(msgId)
    await expectNoMessage(again.ws, 600)
    expect(cursorOf(room, pm)).toBe(msgId)
    again.ws.close()
    await app.close()
  })

  // AC-GW-005 — deliver 는 타깃에게만 가고 커서도 타깃만 움직인다
  it('deliver reaches only targeted bots in that room and moves only their cursor', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa'), ops = seedBot('ops')
    const wsPm = await wsConnect(port, invite(roomA, pm))
    const wsQa = await wsConnect(port, invite(roomA, qa))
    const wsOps = await wsConnect(port, invite(roomB, ops))

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(roomA).lastInsertRowid as number
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any
    gateway.deliver(roomA, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])

    const got = await nextMessage(wsPm.ws)
    expect(got.author_name).toBe('alice')
    expect(got.id).toBe(msgId)
    // 부정 관측 둘: 같은 방 비타깃도, 다른 방도 받지 않는다.
    await expectNoMessage(wsQa.ws)
    await expectNoMessage(wsOps.ws)
    // 커서도 타깃만 움직인다 — 오프라인 재전송(REQ-GW-005)이 성립하는 근거다.
    expect(cursorOf(roomA, pm)).toBe(msgId)
    expect(cursorOf(roomA, qa)).toBe(0)
    expect(cursorOf(roomB, ops)).toBe(0)

    for (const w of [wsPm, wsQa, wsOps]) w.ws.close()
    await app.close()
  })

  // AC-GW-006 — delivery 는 봇마다 다르고, files 는 첨부와 일치한다
  it('deliver carries per-bot delivery and the message attachments', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    const wsPm = await wsConnect(port, invite(room, pm))
    const wsQa = await wsConnect(port, invite(room, qa))

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')").run(room).lastInsertRowid as number
    const stored = join(dir, 'up', 'stored-report.md')
    writeFileSync(stored, '내용')
    db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)')
      .run(msgId, '보고서.md', stored, 'text/markdown')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any

    gateway.deliver(room, { ...row, author_name: 'alice' }, [
      { botId: pm, delivery: 'to' },
      { botId: qa, delivery: 'cc' },
    ])
    const toMsg = await nextMessage(wsPm.ws)
    const ccMsg = await nextMessage(wsQa.ws)
    // 분별: 같은 메시지인데 delivery 가 봇마다 다르다. 'to' 하드코딩은 여기서 깨진다.
    expect(toMsg.delivery).toBe('to')
    expect(ccMsg.delivery).toBe('cc')
    expect(toMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])
    expect(ccMsg.files).toEqual([{ name: '보고서.md', local_path: stored }])

    wsPm.ws.close(); wsQa.ws.close()
    await app.close()
  })

  // AC-GW-007 — bot_message 저장·복사·발행
  it('stores bot_message, copies files into uploadsDir and publishes to the hub', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const src = join(dir, 'report.md')
    writeFileSync(src, '# 결과\n완료')

    ws.send(JSON.stringify({ type: 'bot_message', body: '정리 완료', files: [{ local_path: src, name: '보고서.md' }] }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    expect(row.body).toBe('정리 완료')
    expect(row.author_bot_id).toBe(pm)
    const att = db.prepare('SELECT * FROM attachments WHERE message_id=?').get(row.id) as any
    // 첨부 행이 실제로 있어야 한다. size/mime 이 NOT NULL 이라 값을 빠뜨리면 INSERT 가
    // 제약 위반으로 던지고 그 예외가 REQ-GW-011 의 건너뛰기 catch 에 삼켜진다 — 그러면
    // 이 줄에서 att 가 undefined 가 되어 아래 단언들이 전부 깨진다.
    expect(att).toBeDefined()
    expect(att.filename).toBe('보고서.md')
    // size 는 원본의 실제 바이트 길이다. 상수도 0도 통과하지 못한다.
    // 본문 '# 결과\n완료' 는 문자 8개지만 UTF-8 로는 15바이트라, 문자 길이를 넣은 구현도 깨진다.
    const srcBytes = readFileSync(src).length
    expect(srcBytes).toBe(15)
    expect(att.size).toBe(srcBytes)
    expect(att.mime).toBe('application/octet-stream')
    // 복사본이 uploadsDir 안에 있고, 원본은 그대로 남는다(이동이 아니라 복사).
    expect(att.stored_path).not.toBe(src)
    expect(att.stored_path.startsWith(join(dir, 'up'))).toBe(true)
    expect(readFileSync(att.stored_path, 'utf8')).toContain('완료')
    expect(existsSync(src)).toBe(true)
    // 허브 발행: 이벤트 이름·방·작성자 이름까지 관측한다.
    const msgEvents = published.filter(p => p.event === 'message')
    expect(msgEvents).toHaveLength(1)
    expect(msgEvents[0].roomId).toBe(room)
    expect(msgEvents[0].data.author_name).toBe('pm')
    expect(msgEvents[0].data.attachments).toHaveLength(1)

    ws.close()
    await app.close()
  })

  // AC-GW-008 — 없는 파일 하나만 건너뛴다
  it('bot_message skips only the missing attachment', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const good = join(dir, '있는파일.txt')
    writeFileSync(good, 'ok')

    ws.send(JSON.stringify({
      type: 'bot_message', body: '결과',
      files: [{ local_path: join(dir, '없는파일'), name: 'x' }, { local_path: good, name: '있는파일.txt' }],
    }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    expect(row.body).toBe('결과')
    const atts = db.prepare('SELECT filename FROM attachments WHERE message_id=?').all(row.id) as { filename: string }[]
    // 분별: 정확히 하나만 살아남는다. 0 이면 "하나 실패 시 전부 포기", 2 면 없는 파일까지 기록한 것이다.
    expect(atts.map(a => a.filename)).toEqual(['있는파일.txt'])

    ws.close()
    await app.close()
  })

  // AC-GW-021 — 허용 뿌리 밖의 local_path 는 복사하지 않는다 (sync-audit F-01)
  it('bot_message refuses a local_path outside botFilesDir while still attaching one inside', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    // 카나리는 허용 뿌리(dir) **밖**에 만든다 — 봇이 절대 경로만 알려주면
    // 서버가 그 내용을 uploads 안으로 복사해 오던 것이 이 결함이다.
    const outsideDir = mkdtempSync(join(tmpdir(), 'md-outside-'))
    const canary = join(outsideDir, 'secret.txt')
    writeFileSync(canary, 'TOP-SECRET-CANARY-9f3a')
    // 대조군: 허용 뿌리 안의 정상 파일 하나. 이게 없으면 "전부 거부"하는 구현도 통과한다.
    const good = join(dir, '정상.txt')
    writeFileSync(good, 'ok')

    try {
      ws.send(JSON.stringify({
        type: 'bot_message', body: '유출 시도',
        files: [{ local_path: canary, name: 'harmless.txt' }, { local_path: good, name: '정상.txt' }],
      }))
      await new Promise(r => setTimeout(r, 300))

      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      // 메시지 자체는 저장된다 — 거부되는 것은 그 첨부 하나뿐이다 (REQ-GW-011 과 같은 자리).
      expect(row.body).toBe('유출 시도')
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      // 분별: 정확히 하나만 살아남는다. 2 면 유출이 그대로이고, 0 이면 정상 파일까지 막은 것이다.
      expect(atts.map(a => a.filename)).toEqual(['정상.txt'])
      // 내용까지 확인한다 — 파일명만 보면 이름이 바뀐 채 복사된 경우를 놓친다.
      for (const a of atts) {
        expect(readFileSync(a.stored_path, 'utf8')).not.toContain('TOP-SECRET-CANARY-9f3a')
      }
      // 원본 카나리는 손대지 않는다.
      expect(readFileSync(canary, 'utf8')).toBe('TOP-SECRET-CANARY-9f3a')
    } finally {
      rmSync(outsideDir, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-023 — 허용 뿌리 안의 심볼릭 링크로도 밖을 끌어오지 못한다 (sync-reaudit N-02)
  it('bot_message refuses a symlink inside botFilesDir that points outside it', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    const outsideDir = mkdtempSync(join(tmpdir(), 'md-outside-'))
    const canary = join(outsideDir, 'secret.txt')
    writeFileSync(canary, 'TOP-SECRET-LINK-7b2c')
    // 링크 자체는 허용 뿌리(dir) **안**에 있다 — 어휘적 경로 검사는 이걸 통과시킨다.
    const link = join(dir, '겉보기정상.txt')
    symlinkSync(canary, link)
    // 대조군: 링크가 아닌 뿌리 안의 진짜 파일.
    const good = join(dir, '진짜.txt')
    writeFileSync(good, 'ok')

    try {
      ws.send(JSON.stringify({
        type: 'bot_message', body: '링크 시도',
        files: [{ local_path: link, name: '겉보기정상.txt' }, { local_path: good, name: '진짜.txt' }],
      }))
      await new Promise(r => setTimeout(r, 300))

      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      expect(row.body).toBe('링크 시도')
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['진짜.txt'])
      for (const a of atts) {
        expect(readFileSync(a.stored_path, 'utf8')).not.toContain('TOP-SECRET-LINK-7b2c')
      }
    } finally {
      rmSync(outsideDir, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-024 — 허브 발행 프레임에 저장 경로가 실리지 않는다 (sync-reaudit N-01)
  it('never publishes stored_path on the hub frame for a bot attachment', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const src = join(dir, '첨부.txt')
    writeFileSync(src, '내용')

    ws.send(JSON.stringify({ type: 'bot_message', body: '첨부 있음', files: [{ local_path: src, name: '첨부.txt' }] }))
    await new Promise(r => setTimeout(r, 300))

    const frame = published.filter(p => p.event === 'message').at(-1)!
    // 대조군: 첨부가 실제로 하나 실려 있고 id·filename 은 있어야 한다 —
    // 없으면 "첨부를 통째로 빼먹은" 구현도 통과한다.
    expect(frame.data.attachments).toHaveLength(1)
    expect(frame.data.attachments[0].filename).toBe('첨부.txt')
    expect(typeof frame.data.attachments[0].id).toBe('number')
    expect(frame.data.attachments[0]).not.toHaveProperty('stored_path')
    // 프레임 전체를 문자열로 훑어 다른 필드 이름으로 새는 경우까지 잡는다.
    const att = db.prepare('SELECT stored_path FROM attachments').get() as { stored_path: string }
    expect(JSON.stringify(frame.data)).not.toContain(att.stored_path)

    ws.close()
    await app.close()
  })

  // AC-GW-025 — botFilesDir 미설정이면 봇 첨부를 전부 거부한다 (sync-audit-3 N-08)
  it('bot_message attaches nothing at all when botFilesDir is unset', async () => {
    const { app, port } = await build({ botFiles: 'off' })
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    // 켜져 있었다면 통과했을 파일이다 — 위 AC-GW-021 의 대조군과 같은 자리에 있다.
    const good = join(dir, '켜져있으면통과.txt')
    writeFileSync(good, 'ok')

    ws.send(JSON.stringify({ type: 'bot_message', body: '첨부 시도', files: [{ local_path: good, name: '켜져있으면통과.txt' }] }))
    await new Promise(r => setTimeout(r, 300))

    const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
    // 본문은 저장된다 — 꺼진 것은 첨부뿐이다.
    expect(row.body).toBe('첨부 시도')
    expect(db.prepare('SELECT COUNT(*) c FROM attachments WHERE message_id=?').get(row.id)).toEqual({ c: 0 })

    ws.close()
    await app.close()
  })

  // AC-GW-026 — 허용 뿌리와 이름이 겹치는 형제 디렉터리는 통과하지 못한다 (sync-audit-3 N-08)
  it('bot_message refuses a sibling directory whose path merely prefixes botFilesDir', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    // dir 의 형제이면서 문자열로는 dir 을 접두사로 갖는 디렉터리. 경로 구분자를 붙이지 않고
    // 비교하면 여기가 뚫린다 — gateway.ts 주석이 방어한다고 적어 둔 바로 그 경우다.
    const sibling = `${dir}evil`
    mkdirSync(sibling, { recursive: true })
    const outside = join(sibling, 'secret.txt')
    writeFileSync(outside, 'SIBLING-CANARY-4d1e')
    const good = join(dir, '진짜뿌리안.txt')
    writeFileSync(good, 'ok')

    try {
      ws.send(JSON.stringify({
        type: 'bot_message', body: '형제 시도',
        files: [{ local_path: outside, name: 'secret.txt' }, { local_path: good, name: '진짜뿌리안.txt' }],
      }))
      await new Promise(r => setTimeout(r, 300))

      const row = db.prepare("SELECT * FROM messages WHERE room_id=? AND author_type='bot'").get(room) as any
      const atts = db.prepare('SELECT filename, stored_path FROM attachments WHERE message_id=?').all(row.id) as { filename: string; stored_path: string }[]
      expect(atts.map(a => a.filename)).toEqual(['진짜뿌리안.txt'])
      for (const a of atts) {
        expect(readFileSync(a.stored_path, 'utf8')).not.toContain('SIBLING-CANARY-4d1e')
      }
    } finally {
      rmSync(sibling, { recursive: true, force: true })
      ws.close()
      await app.close()
    }
  })

  // AC-GW-009 — status 는 두 값만 발행한다
  it('status publishes bot_status for working and idle only', async () => {
    const { app, published, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    ws.send(JSON.stringify({ type: 'status', state: 'working' }))
    ws.send(JSON.stringify({ type: 'status', state: 'idle' }))
    await new Promise(r => setTimeout(r, 200))
    let events = published.filter(p => p.event === 'bot_status')
    expect(events.map(e => e.data.state)).toEqual(['working', 'idle'])
    expect(events[0].data.bot_id).toBe(pm)
    expect(events[0].roomId).toBe(room)

    // 대조군: 알 수 없는 값은 아무것도 발행하지 않는다.
    ws.send(JSON.stringify({ type: 'status', state: 'sleeping' }))
    await new Promise(r => setTimeout(r, 200))
    events = published.filter(p => p.event === 'bot_status')
    expect(events).toHaveLength(2)

    ws.close()
    await app.close()
  })

  // AC-GW-010 — isOnline 은 접속을 따라간다
  it('isOnline follows the connection, per room and bot', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const token = invite(roomA, pm)
    invite(roomA, qa); invite(roomB, pm)

    expect(gateway.isOnline(roomA, pm)).toBe(false)
    const { ws } = await wsConnect(port, token)
    expect(gateway.isOnline(roomA, pm)).toBe(true)
    // 분별: 같은 방 다른 봇도, 다른 방 같은 봇도 온라인이 아니다. `return true` 는 여기서 깨진다.
    expect(gateway.isOnline(roomA, qa)).toBe(false)
    expect(gateway.isOnline(roomB, pm)).toBe(false)

    ws.close()
    await closedPromise(ws)
    await new Promise(r => setTimeout(r, 100))
    expect(gateway.isOnline(roomA, pm)).toBe(false)
    await app.close()
  })

  // AC-GW-011 — 이력은 번호 오름차순이고 rid 를 되돌린다
  it('history_request returns the room messages in id order and echoes rid', async () => {
    const { app, port } = await build()
    const room = seedRoom('A'), other = seedRoom('B')
    const pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    for (const b of ['하나', '둘', '셋']) db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, b)
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '남의 방')").run(other)

    ws.send(JSON.stringify({ type: 'history_request', rid: 'r1', limit: 10 }))
    const res1 = await nextMessage(ws)
    expect(res1.type).toBe('history_response')
    expect(res1.rid).toBe('r1')
    expect(res1.messages.map((m: any) => m.body)).toEqual(['하나', '둘', '셋'])
    expect(res1.messages.map((m: any) => m.id)).toEqual([...res1.messages.map((m: any) => m.id)].sort((a: number, b: number) => a - b))
    // 방 격리: 다른 방 메시지는 섞이지 않는다.
    expect(res1.messages.map((m: any) => m.body)).not.toContain('남의 방')

    // 분별: rid 는 요청마다 그대로 되돌아온다. 하드코딩은 여기서 깨진다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r2', limit: 10 }))
    const res2 = await nextMessage(ws)
    expect(res2.rid).toBe('r2')

    ws.close()
    await app.close()
  })

  // AC-GW-012 — since_id 는 커서 이하를 실제로 걸러 낸다
  it('history_request with since_id returns only later messages', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))
    const ids = ['하나', '둘', '셋'].map(b =>
      db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, b).lastInsertRowid as number)
    const cursor = ids[1]

    // 대조군 먼저: 필터가 없으면 커서 이하 메시지가 응답에 들어온다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'ctl', limit: 10 }))
    const control = await nextMessage(ws)
    expect(control.messages.map((m: any) => m.id)).toEqual(ids)
    expect(control.messages.some((m: any) => m.id <= cursor)).toBe(true)

    // 본 검사: since_id 를 붙이면 커서 이하가 하나도 없다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r2', since_id: cursor, limit: 10 }))
    const res = await nextMessage(ws)
    expect(res.rid).toBe('r2')
    expect(res.messages.length).toBeGreaterThan(0)
    expect(res.messages.every((m: any) => m.id > cursor)).toBe(true)
    expect(res.messages.map((m: any) => m.body)).toEqual(['셋'])
    // 필터가 없앤 것이 실재함을 DB 로 확인한다 — 방에 커서 이하 메시지가 둘 있다.
    const below = db.prepare('SELECT COUNT(*) c FROM messages WHERE room_id=? AND id<=?').get(room, cursor) as { c: number }
    expect(below.c).toBe(2)
    expect(control.messages.length - res.messages.length).toBe(below.c)

    ws.close()
    await app.close()
  })

  // AC-GW-013 — limit 은 필터보다 먼저, 선택 필터 셋은 각각 걸러 낸다
  it('history_request applies limit before since_id, speaker, since and until', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const alice = db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice','x')").run().lastInsertRowid as number
    const { ws } = await wsConnect(port, invite(room, pm))

    const ids: number[] = []
    for (let i = 1; i <= 5; i++) {
      ids.push(db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body, created_at) VALUES (?, 'user', ?, ?, ?)")
        .run(room, alice, `m${i}`, `2026-08-2${i}T00:00:00Z`).lastInsertRowid as number)
    }
    db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body, created_at) VALUES (?, 'bot', ?, '봇 발언', '2026-08-26T00:00:00Z')").run(room, pm)

    // limit 순서: limit 2 는 "최근 2건을 자른 뒤" since_id 를 적용한다.
    // 필터를 먼저 적용했다면 m1 다음 두 건(m2, m3)이 왔을 것이다 — 두 해석을 가른다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'a', since_id: ids[0], limit: 2 }))
    const limited = await nextMessage(ws)
    expect(limited.messages.map((m: any) => m.body)).toEqual(['m5', '봇 발언'])

    // speaker 필터
    ws.send(JSON.stringify({ type: 'history_request', rid: 'b', speaker: 'pm', limit: 100 }))
    expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['봇 발언'])

    // since / until 필터
    ws.send(JSON.stringify({ type: 'history_request', rid: 'c', since: '2026-08-24T00:00:00Z', until: '2026-08-26T00:00:00Z', limit: 100 }))
    expect((await nextMessage(ws)).messages.map((m: any) => m.body)).toEqual(['m4', 'm5'])

    // 대조군: 필터 없이는 여섯 건 전부 온다.
    ws.send(JSON.stringify({ type: 'history_request', rid: 'd', limit: 100 }))
    expect((await nextMessage(ws)).messages).toHaveLength(6)

    ws.close()
    await app.close()
  })

  // AC-GW-014 — 이력의 네 필드와 작성자 이름 해석
  it('history_response carries id, author_name, body and created_at', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const alice = db.prepare("INSERT INTO users (username, password_hash) VALUES ('alice','x')").run().lastInsertRowid as number
    db.prepare("INSERT INTO messages (room_id, author_type, author_user_id, body) VALUES (?, 'user', ?, '사람 말')").run(room, alice)
    db.prepare("INSERT INTO messages (room_id, author_type, author_bot_id, body) VALUES (?, 'bot', ?, '봇 말')").run(room, pm)
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', '시스템 말')").run(room)

    const { ws } = await wsConnect(port, invite(room, pm))
    ws.send(JSON.stringify({ type: 'history_request', rid: 'r', limit: 10 }))
    const res = await nextMessage(ws)

    for (const m of res.messages) {
      // 네 조각: 채널이 `#<번호> [시각] 작성자: 본문` 을 만들 때 쓰는 필드 전부
      expect(typeof m.id).toBe('number')
      expect(typeof m.author_name).toBe('string')
      expect(typeof m.body).toBe('string')
      expect(typeof m.created_at).toBe('string')
      expect(m.created_at.length).toBeGreaterThan(0)
    }
    // 분별: 작성자 종류마다 이름이 다르다. 상수를 돌려주는 authorName 은 여기서 깨진다.
    expect(res.messages.map((m: any) => m.author_name)).toEqual(['alice', 'pm', '시스템'])

    ws.close()
    await app.close()
  })

  // AC-GW-015 — 이력 응답은 요청한 봇에게만 간다
  it('history_response goes only to the requesting bot', async () => {
    const { app, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    const wsPm = await wsConnect(port, invite(room, pm))
    const wsQa = await wsConnect(port, invite(room, qa))
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '하나')").run(room)

    wsPm.ws.send(JSON.stringify({ type: 'history_request', rid: 'r', limit: 10 }))
    const res = await nextMessage(wsPm.ws)
    expect(res.rid).toBe('r')
    await expectNoMessage(wsQa.ws)   // 부정 관측: 옆 봇에게 새지 않는다

    wsPm.ws.close(); wsQa.ws.close()
    await app.close()
  })

  // AC-GW-016 — closeRoom 은 그 방만 끊는다
  it('closeRoom disconnects only that room', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const wsA = await wsConnect(port, invite(roomA, pm))
    const wsB = await wsConnect(port, invite(roomB, qa))
    db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', 'B 방 메시지')").run(roomB)

    const aClosed = closedPromise(wsA.ws)
    gateway.closeRoom(roomA)
    await aClosed
    expect(gateway.isOnline(roomA, pm)).toBe(false)

    // 분별: 다른 방 소켓은 열려 있을 뿐 아니라 여전히 왕복이 된다.
    expect(wsB.ws.readyState).toBe(WebSocket.OPEN)
    expect(gateway.isOnline(roomB, qa)).toBe(true)
    wsB.ws.send(JSON.stringify({ type: 'history_request', rid: 'alive', limit: 10 }))
    const res = await nextMessage(wsB.ws)
    expect(res.rid).toBe('alive')
    expect(res.messages.map((m: any) => m.body)).toEqual(['B 방 메시지'])

    wsB.ws.close()
    await app.close()
  })

  // AC-GW-017 — 권한 릴레이 창구
  it('relays permission_request to the handler and sendToBot reports delivery', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm'), qa = seedBot('qa')
    invite(room, qa)   // qa 는 초대만 받고 접속하지 않는다 (오프라인 대조군)
    const seen: { info: any; params: any }[] = []
    gateway.setPermissionHandler((info, params) => seen.push({ info, params }))
    const { ws } = await wsConnect(port, invite(room, pm))

    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'p1', tool_name: 'Bash', description: '설치', input_preview: 'npm i' }))
    await new Promise(r => setTimeout(r, 200))
    expect(seen).toHaveLength(1)
    expect(seen[0].info).toEqual({ roomId: room, botId: pm, connId: expect.any(String) })
    expect(seen[0].params.request_id).toBe('p1')
    expect(seen[0].params.tool_name).toBe('Bash')

    // 온라인 봇에게는 true 이고 실제로 도착한다.
    expect(gateway.sendToBot(room, pm, { type: 'permission_verdict', request_id: 'p1', behavior: 'allow' })).toBe(true)
    const verdict = await nextMessage(ws)
    expect(verdict).toEqual({ type: 'permission_verdict', request_id: 'p1', behavior: 'allow' })
    // 분별: 오프라인 봇에게는 false 이고 아무 일도 일어나지 않는다. `return true` 는 여기서 깨진다.
    expect(gateway.sendToBot(room, qa, { type: 'permission_verdict', request_id: 'p2', behavior: 'deny' })).toBe(false)
    await expectNoMessage(ws)

    // 핸들러 해제 후에는 호출되지 않는다.
    gateway.setPermissionHandler(null)
    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'p3' }))
    await new Promise(r => setTimeout(r, 200))
    expect(seen).toHaveLength(1)

    ws.close()
    await app.close()
  })

  // 카드 t32 §D 결함 D-5 — 같은 (방, 봇) 에 소켓이 여럿일 때 판정이 «요청한» 소켓에 닿아야 한다.
  // 실측 배경(이력): 같은 봇 토큰으로 세 세션(run 레인·lead·봇)이 동시에 붙어 있었고, 방에는 «✅ 승인
  // 전송됨» 이 떴는데 봇 터미널의 승인 프롬프트가 닫히지 않았다. 당시 sendToBot 은 첫 일치 소켓에서
  // return 했고 판정이 요청하지 않은 소켓으로 갔으며, 채널 쪽 emitted 집합 가드(REQ-CHANPERM-008)가
  // 그 판정을 조용히 버려 아무 데서도 오류가 나지 않았다. deliver 는 같은 조건에서 전원에게 보낸다 —
  // 두 발신 지점의 갈래가 어긋난 것이 뿌리다.
  // 지금의 배선(SPEC-PERMROUTE-001): 판정은 sendToOrigin 으로 «요청한 접속 하나» 에게만 되돌아간다 —
  // 이 시험은 second 가 낸 요청의 판정이 second 에게 되돌아오는지를 잰다.
  it('routes a permission verdict to the socket that requested it when several sockets share one bot', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const token = invite(room, pm)

    // 같은 초대 토큰으로 두 소켓 — 먼저 붙은 것이 «요청하지 않은» 쪽이다.
    const first = await wsConnect(port, token)
    const second = await wsConnect(port, token)

    const seen: { info: any; params: any }[] = []
    gateway.setPermissionHandler((info, params) => seen.push({ info, params }))

    // 요청은 두 번째 소켓이 낸다.
    second.ws.send(JSON.stringify({ type: 'permission_request', request_id: 'mepzy', tool_name: 'fetch_history', description: '이력 조회', input_preview: '{}' }))
    await new Promise(r => setTimeout(r, 200))
    expect(seen).toHaveLength(1)
    expect(seen[0].info).toEqual({ roomId: room, botId: pm, connId: expect.any(String) })

    expect(gateway.sendToBot(room, pm, { type: 'permission_verdict', request_id: 'mepzy', behavior: 'allow' })).toBe(true)

    // [HARD] 요청한 소켓이 판정을 받는다. 첫 소켓만 받고 끝나면 봇의 프롬프트는 영원히 열려 있다.
    const verdict = await nextMessage(second.ws)
    expect(verdict).toEqual({ type: 'permission_verdict', request_id: 'mepzy', behavior: 'allow' })

    first.ws.close()
    second.ws.close()
    await app.close()
  })

  // SPEC-PERMROUTE-001 — 판정은 «요청한 접속 하나» 에게만 되돌아온다 (M2 RED 먼저).
  // 이전 배선(sendToBot 전원 발신)은 요청하지 않은 소켓에도 판정을 뿌렸고 채널의 emitted 집합 가드가
  // 조용히 버렸다 (카드 t32 D-5). sendToOrigin 배선이 지어지기 전까지 이 시험은 붉다 — 브로커 대행
  // 핸들러가 sendToOrigin 을 부르므로, 스텁(false) 상태에서는 B 의 수신 대기가 시간 초과로 떨어진다.
  it('routes the verdict to the requesting connection only (AC-PERMROUTE-003a + 003b)', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const token = invite(room, pm)

    // 같은 초대 토큰으로 두 소켓 — 먼저 붙은 A 가 «요청하지 않은» 쪽, 나중에 붙은 B 가 요청자다.
    const a = await wsConnect(port, token)
    const b = await wsConnect(port, token)

    // 브로커 대행: 핸들러는 요청한 접속의 connId 를 받아 곧바로 sendToOrigin 으로 되돌린다 —
    // 착지 후 생산 배선(permissions.ts)이 취할 모양 그대로다.
    gateway.setPermissionHandler((info, params) => {
      gateway.sendToOrigin(info.connId as string, { type: 'permission_verdict', request_id: params.request_id, behavior: 'allow' })
    })

    // 요청은 B 가 낸다.
    b.ws.send(JSON.stringify({ type: 'permission_request', request_id: 'prr1a', tool_name: 'Bash', description: '설치', input_preview: 'npm i' }))

    // AC-PERMROUTE-003a — 요청한 소켓이 판정 프레임을 정확히 1건 받는다.
    const verdict = await nextMessage(b.ws)
    expect(verdict).toEqual({ type: 'permission_verdict', request_id: 'prr1a', behavior: 'allow' })

    // [HARD] AC-PERMROUTE-003b — B 에 도착을 관측한 «뒤에» A 의 수집함을 센다. «아직 안 온 것»과
    // «오지 않는 것»을 갈라 내기 위한 순서다 (acceptance.md AC-003b 관측 방법).
    await expectNoMessage(a.ws)

    a.ws.close()
    b.ws.close()
    await app.close()
  })

  // AC-PERMROUTE-009 회귀 (SPEC-PERMROUTE-001) — sendToBot 은 일치하는 접속 «전원» 에게 보내는 동작을
  // 유지한다 (REQ-PERMROUTE-011). 착지 뒤 생산 호출자는 0 이지만 첫 일치 return 로의 되돌림은 D-5 의
  // 뿌리를 미래 호출자에게 되살린다 — A·B 둘 다 도착과 true 반환을 여기서 잰다 (리드 M2 판독 지시).
  it('sendToBot still reaches every matching connection and reports true (AC-PERMROUTE-009)', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const token = invite(room, pm)
    const a = await wsConnect(port, token)
    const b = await wsConnect(port, token)

    expect(gateway.sendToBot(room, pm, { type: 'ping' })).toBe(true)
    expect(await nextMessage(a.ws)).toEqual({ type: 'ping' })
    expect(await nextMessage(b.ws)).toEqual({ type: 'ping' })

    a.ws.close()
    b.ws.close()
    await app.close()
  })

  // AC-PERMROUTE-001 (SPEC-PERMROUTE-001) — 접속마다 하나, 사는 동안 하나. M6-0 신설(리드 처분 (가)):
  // 같은 접속의 두 요청은 같은 connId, 다른 접속은 다른 connId — 한쪽만 재면 «매번 새 값» 과 «모두 같은
  // 상수» 중 하나가 통과하므로 두 절반을 한 시험에 둔다.
  it('issues one stable connId per connection, distinct across connections (AC-PERMROUTE-001)', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const token = invite(room, pm)
    const a = await wsConnect(port, token)
    const b = await wsConnect(port, token)

    const infos: any[] = []
    gateway.setPermissionHandler(info => infos.push(info))

    a.ws.send(JSON.stringify({ type: 'permission_request', request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    a.ws.send(JSON.stringify({ type: 'permission_request', request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    b.ws.send(JSON.stringify({ type: 'permission_request', request_id: 'kmnop', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    await new Promise(r => setTimeout(r, 300))

    expect(infos).toHaveLength(3)
    expect(infos[0].connId).toBe(infos[1].connId)      // 같은 접속 — 사는 동안 하나
    expect(infos[2].connId).not.toBe(infos[0].connId)  // 다른 접속 — 서로 다르다

    a.ws.close()
    b.ws.close()
    await app.close()
  })

  // AC-PERMROUTE-002 (SPEC-PERMROUTE-001) — 요청한 접속의 신원이 핸들러까지 온다. M6-0 신설(리드 처분 (가)).
  // connId 값은 실행마다 다르므로 roomId·botId 는 값으로, connId 는 존재·타입으로 잰다 (acceptance.md).
  it('delivers the requesting connection identity to the handler (AC-PERMROUTE-002)', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const token = invite(room, pm)
    const { ws } = await wsConnect(port, token)

    const infos: any[] = []
    gateway.setPermissionHandler(info => infos.push(info))

    ws.send(JSON.stringify({ type: 'permission_request', request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' }))
    await new Promise(r => setTimeout(r, 300))

    expect(infos).toHaveLength(1)
    expect(infos[0].roomId).toBe(room)
    expect(infos[0].botId).toBe(pm)
    expect(typeof infos[0].connId).toBe('string')
    expect((infos[0].connId as string).length).toBeGreaterThan(0)   // 비어 있지 않은 문자열

    ws.close()
    await app.close()
  })

  // AC-PERMROUTE-004 (SPEC-PERMROUTE-001) — 살아 있지 않은 신원으로는 아무 데도 가지 않는다. M6-0 신설(리드 처분 (가)).
  // 반환값만 재면 «false 를 돌려주면서 그래도 보낸다» 가 통과하므로 양쪽 소켓의 0건을 함께 잰다.
  it('returns false and delivers nowhere for a connId no connection owns (AC-PERMROUTE-004)', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const token = invite(room, pm)
    const a = await wsConnect(port, token)
    const b = await wsConnect(port, token)

    const sent = gateway.sendToOrigin('zzzzz-dead-connid', { type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
    expect(sent).toBe(false)
    await expectNoMessage(a.ws)
    await expectNoMessage(b.ws)

    a.ws.close()
    b.ws.close()
    await app.close()
  })

  // AC-GW-018 — 조립: buildServer 배선과 초대 목록의 online
  it('buildServer wires the gateway, archive hook and invite online flag', async () => {
    process.env.MINIDISCORD_DATA_DIR = join(dir, 'srv')
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    await app.listen({ port: 0 })
    const port = (app.server.address() as { port: number }).port

    // Gateway 계약: 여섯 메서드가 전부 함수다 (REQ-GW-021 — SPEC-PERMROUTE-001 이 sendToOrigin 을 더했다)
    const gw = (app as any).gateway
    for (const m of ['deliver', 'closeRoom', 'isOnline', 'sendToBot', 'sendToOrigin', 'setPermissionHandler']) {
      expect(typeof gw[m]).toBe('function')
    }

    // 가입·로그인 라우트 이름과 set-cookie 정규화는 rooms-bots.test.ts 의 build() 와 같다
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    const raw = login.headers['set-cookie'] ?? ''
    const ck = (Array.isArray(raw) ? raw[0] : raw).split(';')[0]
    const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: ck }, payload: { name: 'A' } })).json()
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: ck }, payload: { name: 'pm' } })).json()
    const inv = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck }, payload: { bot_id: bot.id } })).json()

    // 접속 전: online 은 false
    const before = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck } })).json()
    expect(before[0].online).toBe(false)

    // v2 핸드셰이크로 접속한다 — API 가 발급한 평문 토큰으로 유도가 맞는지까지 같이 잰다
    const { ws } = await connectV2(port, inv.token)

    // 접속 후: 같은 라우트가 true 로 바뀐다 — 상수 false 를 배제하는 분별 단언
    const during = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie: ck } })).json()
    expect(during[0].online).toBe(true)
    expect(typeof during[0].online).toBe('boolean')

    // 보관 훅: HTTP 로 방을 보관하면 그 방 소켓이 끊긴다
    const closed = closedPromise(ws)
    const archived = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie: ck } })
    expect(archived.statusCode).toBe(200)
    await closed

    await app.close()
    delete process.env.MINIDISCORD_DATA_DIR
  })

  // AC-GWAUTH-001 — 증명은 논스·방·봇에 묶이고 저장된 해시를 열쇠로 한다
  // AC-GWAUTH2-005 — challenge 증명은 두 논스·방·봇·pub·cb 에 묶인다 (v1 AC-GWAUTH-001 을 대체한다).
  it('the challenge proof is bound to both nonces, the room, the bot and the pub', async () => {
    const { app, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const tokenA = invite(roomA, pm)
    const tokenB = invite(roomB, qa)

    const a = await connectV2(port, tokenA)
    const b = await connectV2(port, tokenB)
    expect(a.welcome.room_id).not.toBe(b.welcome.room_id)   // 두 짝이 서로 다른 방이라는 대조의 전제

    // client_nonce 만 바꿔 같은 토큰·방·봇으로 한 번 더 — 채널 논스가 전사에 실제로 들어가는가
    const again = await connectV2(port, tokenA)
    const t0 = again.welcome   // 값의 실측은 아래 독립 재계산 핸드셰이크가 한다 — 여기선 세 접속이 모두 성립함을 확인
    expect(t0.room_id).toBe(roomA)
    a.ws.close(); b.ws.close(); again.ws.close()

    // 독립 재계산 — 하니스가 챌린지 프레임을 직접 받아 테스트가 스스로 계산한 값과 toBe 로 대조한다.
    // 전사: challenge|cn|sn|room|bot|pub|unbound (cb 는 평문 하니스의 리터럴 unbound).
    const raw = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    const cn = randomBytes(32).toString('hex')
    const sentAuth: any[] = []
    const challenge: any = await new Promise((resolve, reject) => {
      raw.on('open', () => raw.send(JSON.stringify({ type: 'hello', pub: pubOf(tokenA), client_nonce: cn })))
      raw.on('message', d => {
        const m = JSON.parse(String(d))
        if (m.type === 'challenge') { resolve(m); return }
        if (m.type === 'env') { sentAuth.push(m) }
      })
      raw.on('error', reject)
    })
    expect(challenge.room_id).toBe(roomA)
    expect(challenge.bot_id).toBe(pm)
    const expected = createHmac('sha256', Buffer.from(ksrvHexOf(tokenA), 'hex'))
      .update(`challenge|${cn}|${challenge.server_nonce}|${roomA}|${pm}|${pubOf(tokenA)}|unbound`)
      .digest('hex')
    expect(challenge.server_proof).toBe(expected)   // 어느 성분 하나만 빠져도 여기서 깨진다
    // 같은 토큰·방·봇이라도 client_nonce 가 바뀌면 증명이 달라진다 — 위 connectV2 접속과의 대조
    const cn2 = randomBytes(32).toString('hex')
    expect(createHmac('sha256', Buffer.from(ksrvHexOf(tokenA), 'hex'))
      .update(`challenge|${cn2}|${challenge.server_nonce}|${roomA}|${pm}|${pubOf(tokenA)}|unbound`).digest('hex'))
      .not.toBe(challenge.server_proof)
    // 두 접속의 server_nonce 도 서로 다르다 — connectV2 접속의 증명과 이 접속의 값 대조가 그 관측이다
    expect(sentAuth.length).toBe(0)   // 아직 auth 를 보내지 않았다 — challenge 만으로 판정이 끝난다
    raw.close()
    await app.close()
  })

  // AC-GWAUTH2-018 — v1 형태의 hello 는 환영받지 못한다 (v1 AC-GWAUTH-002·004 를 대체한다 —
  // «논스 없는 hello 도 환영» 은 REQ-GWAUTH2-017 이 폐기했다. 하향 협상 경로를 남기지 않는다).
  it('a v1 hello carrying a plaintext token is not welcomed and the socket closes', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)

    for (const bad of [
      { type: 'hello', token },                                  // v1 최초 형태
      { type: 'hello', token, nonce: randomBytes(32).toString('hex') },   // v1 최종 형태
      { type: 'hello', pub: pubOf(token) },                      // client_nonce 없음 — 형식 미달
    ]) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      let frames = 0
      ws.on('message', () => { frames++ })
      ws.on('open', () => ws.send(JSON.stringify(bad)))
      await closedPromise(ws)
      expect(frames).toBe(0)   // 어떤 프레임도 오지 않는다 — 응답 차이로 갈래를 알아내지 못하게 한다
    }
    // 이미 발급된 v1 토큰 행(검증자 없는 행)은 조회 자체가 성립하지 않는다 — 무효화가 문언의 뜻이다.
    expect(gateway.isOnline(room, pm)).toBe(false)

    await app.close()
  })

  // AC-GWAUTH-003 — 어떤 프레임도 평문 토큰이나 저장 해시를 싣지 않는다
  // AC-GWAUTH2-004 — SPEC-GWAUTH-001 AC-GWAUTH-003 의 이월 항목을 흡수한다 (plan.md §F M5).
  // v1 은 «받은» 프레임만 쟀다. v2 는 본문을 양방향으로 넓혀 그 주장을 참으로 만든다 — 문구를
  // 좁힌 것이 아니라 주장이 성립하게 되었다 (S-01 종결, :897 옛 주석의 흡수).
  it('no frame in either direction carries the token, the private key or the confirm key', async () => {
    const { app, port, recorders } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)
    // 재전송 프레임을 하나 심는다 — welcome 만 받으면 «어떤 프레임도» 을 재지 못한다.
    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '재전송 대상')").run(room).lastInsertRowid as number
    db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(msgId, pm, 'to')

    const { ws } = await wsConnect(port, token)
    // 봉투가 하나 더 도착할 시간을 준 뒤 관측을 마친다 — welcome·재전송 message 가 실재하는 대조군이다.
    await new Promise(r => setTimeout(r, 400))
    expect(recorders.length).toBe(1)
    const rec = recorders[0]
    const kinds = [...rec.receivedFrames().map((f: any) => f.type), ...rec.sentFrames().map((f: any) => f.type)]
    expect(kinds).toEqual(expect.arrayContaining(['hello', 'challenge', 'auth', 'env']))   // 네 종류가 실재한다
    expect(rec.receivedFrames().some((f: any) => f.type === 'hello')).toBe(true)
    expect(rec.sentFrames().some((f: any) => f.type === 'challenge')).toBe(true)
    expect(rec.receivedFrames().some((f: any) => f.type === 'auth')).toBe(true)
    expect(rec.sentFrames().some((f: any) => f.type === 'env')).toBe(true)

    // ㉠ 비밀 부재 — 양방향 원문 전부에 대한 포함 검사. 부재를 재는 데 포함 검사가 정확하다.
    const all = [...rec.rawSent(), ...rec.rawReceived()].join('')
    expect(all.includes(token)).toBe(false)                                   // 평문 토큰
    expect(all.includes(ksrvHexOf(token))).toBe(false)                        // 서버 확인 열쇠
    expect(all.includes(skSeedHexOf(token))).toBe(false)                      // 서명 개인키 씨앗
    expect(all.includes(createHash('sha256').update(token).digest('hex'))).toBe(false)   // v1 해시

    // ㉡ 키 집합 고정 — REQ-GWAUTH2-021 을 전선 위 네 종류에 대해 재는 자리 (toEqual 로 통째로 고정:
    // cb 를 어떤 이름으로 실어도 여분 필드가 되어 붉어진다). 봉투 payload 안의 내부 프레임은 재지 않는다.
    const helloFrame = rec.receivedFrames().find((f: any) => f.type === 'hello')
    const authFrame = rec.receivedFrames().find((f: any) => f.type === 'auth')
    const challengeFrame = rec.sentFrames().find((f: any) => f.type === 'challenge')
    const envFrame = rec.sentFrames().find((f: any) => f.type === 'env')
    expect(Object.keys(helloFrame as Record<string, unknown>).sort()).toEqual(['client_nonce', 'pub', 'type'])
    expect(Object.keys(challengeFrame as Record<string, unknown>).sort()).toEqual(['bot_id', 'room_id', 'server_nonce', 'server_proof', 'type'])
    expect(Object.keys(authFrame as Record<string, unknown>).sort()).toEqual(['signature', 'type'])
    expect(Object.keys(envFrame as Record<string, unknown>).sort()).toEqual(['mac', 'payload', 'seq', 'type'])

    ws.close()
    await app.close()
  })
})

// ─── AC-GWAUTH2 서버 측 — 검증자 저장·조회·순번 (001·002·009·010·016) ───
describe('AC-GWAUTH2 server side', () => {
  // 이 describe 의 로컬 하니스 — 원시 핸드셰이크 관측기. connectV2 는 전사를 숨기므로,
  // challenge·auth 프레임 자체를 단언해야 하는 기준들은 이 관측기를 쓴다.
  function rawHandshake(port: number, token: string): Promise<{
    ws: WebSocket
    challenge: any
    authSignature: string
    frames: any[]
    clientNonce: string
  }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      const frames: any[] = []
      let authSignature = ''
      const clientNonce = randomBytes(32).toString('hex')
      ws.on('message', d => {
        const m = JSON.parse(String(d))
        frames.push(m)
        if (m.type === 'challenge') {
          // 하니스도 대조한다 — 증명 없는 challenge 를 통과시키는 하니스는 서버의 부실 증명을 가린다
          const expected = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
            .update(`challenge|${clientNonce}|${m.server_nonce}|${m.room_id}|${m.bot_id}|${pubOf(token)}|unbound`)
            .digest('hex')
          if (m.server_proof !== expected) { ws.close(); reject(new Error('harness: challenge 대조 실패')); return }
          authSignature = sign(
            null,
            Buffer.from(`auth|${clientNonce}|${m.server_nonce}|${m.room_id}|${m.bot_id}|${pubOf(token)}|unbound`),
            skOf(token),
          ).toString('hex')
          ws.send(JSON.stringify({ type: 'auth', signature: authSignature }))
        }
        if (m.type === 'env') resolve({ ws, challenge: frames.find(f => f.type === 'challenge'), authSignature, frames, clientNonce })
      })
      ws.on('error', reject)
      ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: clientNonce })))
      ws.on('close', () => { if (frames.some(f => f.type === 'challenge')) resolve({ ws, challenge: frames.find(f => f.type === 'challenge'), authSignature, frames, clientNonce }) })
    })
  }

  async function loginOf(app: any): Promise<string> {
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
    const raw = login.headers['set-cookie'] ?? ''
    return (Array.isArray(raw) ? raw[0] : raw).split(';')[0]
  }

  // AC-GWAUTH2-001 — 초대는 검증자와 확인 열쇠만 저장한다
  it('an invite stores only a verifier and a confirm key, never the token or its hash', async () => {
    const { app, db } = await build()
    const ck = await loginOf(app)
    // 방·멤버십은 직접 심는다 — 이 파일의 build() 는 방 라우트를 등록하지 않고, 초대 경로의
    // 멤버십 게이트(REQ-ROOMAUTHZ-017)를 통과하려면 게이트 행이 필요하다 (permissions.test 선례)
    const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number
    const alice = db.prepare("SELECT id FROM users WHERE username = 'alice'").get() as { id: number }
    db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(roomId, alice.id)
    const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: ck }, payload: { name: 'pm' } })).json()
    const body = (await app.inject({ method: 'POST', url: `/api/rooms/${roomId}/invites`, headers: { cookie: ck }, payload: { bot_id: bot.id } })).json()

    // 컬럼 자체가 없다 — 행이 아니라 스키마로 잰다 (PRAGMA table_info).
    const cols = (db.prepare('PRAGMA table_info(bot_tokens)').all() as { name: string }[]).map(c => c.name)
    expect(cols).not.toContain('token_hash')
    expect(cols).toEqual(expect.arrayContaining(['verifier_pub', 'server_confirm_key']))

    const row = db.prepare('SELECT * FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(roomId) as Record<string, unknown>
    expect(row.verifier_pub).toBe(pubOf(body.token))
    expect(row.server_confirm_key).toBe(ksrvHexOf(body.token))
    // 평문 토큰도 v1 해시도 없다 — 부재에는 포함 검사가 정확하다
    const dump = JSON.stringify(row)
    expect(dump.includes(body.token)).toBe(false)
    expect(dump.includes(createHash('sha256').update(body.token).digest('hex'))).toBe(false)
    await app.close()
  })

  // AC-GWAUTH2-002 — 서버는 검증자로 조회하고, 모르는 pub 에는 닫는다
  it('the server looks the bot up by its verifier and closes on an unknown pub', async () => {
    const { app, gateway, port } = await build()
    const roomA = seedRoom('A'), roomB = seedRoom('B')
    const pm = seedBot('pm'), qa = seedBot('qa')
    const t1 = invite(roomA, pm)
    const t2 = invite(roomB, qa)

    // ①② — 각 pub 이 자기 방·봇의 challenge 를 받는다. room_id·bot_id 가 조회 결과에서 온다는
    // 것을 재려면 두 짝이 필요하다 — 상수를 답하는 구현은 한 토큰만 볼 때 통과한다.
    const c1 = await rawHandshake(port, t1)
    const c2 = await rawHandshake(port, t2)
    expect([c1.challenge.room_id, c1.challenge.bot_id]).toEqual([roomA, pm])
    expect([c2.challenge.room_id, c2.challenge.bot_id]).toEqual([roomB, qa])
    expect(c1.challenge.room_id).not.toBe(c2.challenge.room_id)

    // ③ — 발급된 적 없는 64자 hex 는 어떤 프레임도 받지 못하고 소켓이 닫힌다
    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    let frames = 0
    ws.on('message', () => { frames++ })
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', pub: '9'.repeat(64), client_nonce: randomBytes(32).toString('hex') })))
    await closedPromise(ws)
    expect(frames).toBe(0)

    c1.ws.close(); c2.ws.close()
    await app.close()
  })

  // AC-GWAUTH2-009 — DB 가 저장한 것만 쥔 클라이언트는 봇으로 등록되지 못한다.
  // REQ-GWAUTH2-002(독립 유도)의 전이적 관측이기도 하다 — 한쪽에서 다른 쪽을 유도할 수 있으면
  // 이 상대가 auth 서명을 만들어 첫 단언이 붉어진다 (변이 AA).
  it('a client holding only what the database stores cannot register as the bot', async () => {
    const { app, gateway, db, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    invite(room, pm)   // 평문 토큰은 하네스가 쓰지 않는다 — 상대의 소지품을 둘로 한정한다
    const row = db.prepare('SELECT verifier_pub, server_confirm_key FROM bot_tokens').get() as { verifier_pub: string; server_confirm_key: string }

    const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    const framesFromServer: any[] = []
    let clientNonce = ''
    ws.on('message', d => framesFromServer.push(JSON.parse(String(d))))
    await new Promise<void>(r => ws.on('open', r))
    clientNonce = randomBytes(32).toString('hex')
    ws.send(JSON.stringify({ type: 'hello', pub: row.verifier_pub, client_nonce: clientNonce }))
    while (!framesFromServer.some(f => f.type === 'challenge')) await new Promise(r => setTimeout(r, 20))
    const challenge = framesFromServer.find(f => f.type === 'challenge')

    // 상대는 확인 열쇠를 갖고 있으므로 서버 증명 검증에 «성공»한다 — 절반의 능력을 명시적으로 관측한다
    const expected = createHmac('sha256', Buffer.from(row.server_confirm_key, 'hex'))
      .update(`challenge|${clientNonce}|${challenge.server_nonce}|${challenge.room_id}|${challenge.bot_id}|${row.verifier_pub}|unbound`)
      .digest('hex')
    expect(challenge.server_proof).toBe(expected)

    // 시도할 수 있는 최선: pub 자신, server_confirm_key 로 만든 HMAC, 128자 난수 — 셋 다 등록에 못 미친다.
    // 첫 거절이 소켓을 닫으므로 시도마다 새 접속을 세운다 — 상대는 매번 같은 소지품으로 다시 시도한다.
    const authMsg = Buffer.from(`auth|${clientNonce}|${challenge.server_nonce}|${challenge.room_id}|${challenge.bot_id}|${row.verifier_pub}|unbound`)
    const tries = [
      row.verifier_pub.padEnd(128, '0'),
      createHmac('sha256', Buffer.from(row.server_confirm_key, 'hex')).update(authMsg).digest('hex').slice(0, 128),
      randomBytes(64).toString('hex'),
    ]
    for (const sig of tries) {
      const wsTry = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      await new Promise<void>(r => wsTry.on('open', r))
      const tryNonce = randomBytes(32).toString('hex')
      wsTry.send(JSON.stringify({ type: 'hello', pub: row.verifier_pub, client_nonce: tryNonce }))
      let tryChallenge: any = null
      await new Promise<void>(r => {
        const on = (d: unknown) => { const m = JSON.parse(String(d)); if (m.type === 'challenge') { tryChallenge = m; wsTry.off('message', on); r() } }
        wsTry.on('message', on)
      })
      void tryChallenge
      wsTry.send(JSON.stringify({ type: 'auth', signature: sig }))
      await new Promise(r => setTimeout(r, 150))
      expect(gateway.isOnline(room, pm)).toBe(false)   // 어떤 시도로도 등록되지 않았다
      wsTry.close()
    }
    expect(framesFromServer.filter(f => f.type === 'env')).toEqual([])   // welcome 도 재전송도 오지 않았다
    ws.close()
    await app.close()
  })

  // AC-GWAUTH2-010 — 다른 핸드셰이크의 서명은 거절되고, 그 접속의 전사로 만든 서명은 받아들여진다
  it('a signature made for another handshake is refused', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)

    // 첫 접속 — 유효하게 확립하고 그 전사(auth 서명)를 기록한다
    const first = await rawHandshake(port, token)
    expect(first.frames.some(f => f.type === 'env')).toBe(true)
    const sig1 = first.authSignature
    console.error('[dbg010 b] sig1 ok')

    // 두 번째 접속 — 같은 토큰, 새 논스. sig1 을 재생하면 거절된다. 양성 짝이 같은 테스트에
    // 있어야 «모든 서명을 거절하는 구현» 을 배제한다 (§「검증 원칙」1번).
    const ws2 = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    const frames2: any[] = []
    ws2.on('message', d => frames2.push(JSON.parse(String(d))))
    await new Promise<void>(r => ws2.on('open', r))
    ws2.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: randomBytes(32).toString('hex') }))
    while (!frames2.some(f => f.type === 'challenge')) await new Promise(r => setTimeout(r, 20))
    // 거절의 닫힘 이벤트는 재생 뒤 즉시 올 수 있다 — 관측기는 보내기 «전에» 붙인다 (늦게 붙이면
    // 이미 닫힌 소켓의 close 를 영원히 기다린다 — 5초 타임아웃의 원인).
    const ws2Closed = closedPromise(ws2)
    ws2.send(JSON.stringify({ type: 'auth', signature: sig1 }))   // 재생
    await new Promise(r => setTimeout(r, 250))
    expect(gateway.isOnline(room, pm)).toBe(true)                 // true 인 것은 첫 소켓이다
    expect(frames2.filter(f => f.type === 'env')).toEqual([])     // 두 번째 소켓엔 아무것도 오지 않았다
    await ws2Closed

    // 양성 짝 — 그 접속의 전사로 새로 만든 서명이면 정상 등록된다
    const third = await connectV2(port, token)
    expect(third.welcome.room_id).toBe(room)
    expect(gateway.isOnline(room, pm)).toBe(true)   // 첫 소켓과 셋째 소켓 — 등록이 실제로 일어났다
    first.ws.close(); third.ws.close()
    await app.close()
  })

  // AC-GWAUTH2-016 — 순번은 소켓마다 1 에서 시작해 프레임마다 정확히 1 증가한다
  it('the sequence starts at one per socket and rises by exactly one per frame', async () => {
    const { app, port } = await build()
    const room = seedRoom(), pm = seedBot('pm')
    const token = invite(room, pm)
    const seedTargets = (prefix: string) => {
      for (let i = 1; i <= 3; i++) {
        const id = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', ?)").run(room, `${prefix} ${i}`).lastInsertRowid as number
        db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(id, pm, 'to')
      }
    }
    seedTargets('첫 접속 재전송')

    // 접속마다 도착한 봉투의 seq 배열을 전선에서 모은다 — 배열 전체를 toEqual 로 잰다 (§「검증 원칙」3번).
    const seqsOf = (): Promise<number[]> => new Promise((resolve, reject) => {
      const raw = new WebSocket(`ws://127.0.0.1:${port}/bot`)
      const seqs: number[] = []
      const cn = randomBytes(32).toString('hex')
      let sessKey: Buffer | null = null
      raw.on('message', d => {
        const m = JSON.parse(String(d))
        if (m.type === 'challenge') {
          const expected = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
            .update(`challenge|${cn}|${m.server_nonce}|${m.room_id}|${m.bot_id}|${pubOf(token)}|unbound`).digest('hex')
          if (m.server_proof !== expected) { raw.close(); reject(new Error('harness: challenge 대조 실패')); return }
          sessKey = createHmac('sha256', Buffer.from(ksrvHexOf(token), 'hex'))
            .update(`session|${cn}|${m.server_nonce}|${m.room_id}|${m.bot_id}|unbound`).digest()
          raw.send(JSON.stringify({ type: 'auth', signature: sign(null, Buffer.from(`auth|${cn}|${m.server_nonce}|${m.room_id}|${m.bot_id}|${pubOf(token)}|unbound`), skOf(token)).toString('hex') }))
          return
        }
        if (m.type === 'env') {
          const expected = createHmac('sha256', sessKey!).update(`${m.seq}|${m.payload}`).digest('hex')
          if (m.mac !== expected) return   // 하니스가 검증한 봉투만 센다
          seqs.push(m.seq)
          if (seqs.length === 4) { raw.close(); resolve(seqs) }
        }
      })
      raw.on('error', reject)
      raw.on('open', () => raw.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: cn })))
    })

    expect(await seqsOf()).toEqual([1, 2, 3, 4])
    // 소켓을 끊고 다시 붙는다 — 커서가 앞서 있으므로 새 재전송 세 개를 심어 «같은 관측» 을 반복한다
    seedTargets('둘째 접속 재전송')
    expect(await seqsOf()).toEqual([1, 2, 3, 4])   // 소켓 사이에서 이어지지 않는다
    await app.close()
  })
})

// ── 결함 D-8 (카드 t32) — 봇에 넘기는 local_path 는 절대 경로여야 한다 ──────
// config.dataDir 기본이 './data'(상대)라 attachments.stored_path 가 상대 경로로 저장된다.
// 그 값을 그대로 봇 프레임에 실으면, 봇 세션의 cwd 가 서버와 다르므로 경로가 풀리지 않는다.
// 실측(카드 t32 A06): 봇이 Read 하나로 끝날 자리에서 Bash find 를 먼저 써 승인 왕복이 둘이 됐다
// (evidence/D01-defect-register-silent.txt §26).
//
// [HARD] local_path 를 채우는 자리는 **둘**이다 — deliver(실시간 배달)와
// sendStoredMessage(재접속 시 밀린 것 재생). 한쪽만 고치면 다른 쪽이 조용히 상대 경로를 넘긴다.
// 기존 첨부 기준들이 이 결함을 놓친 이유는 전부 **절대 경로**를 심어 두었기 때문이다.
describe('D-8 absolute local_path in bot frames', () => {
  // 실제 저장 형태를 그대로 재현한다 — 절대 경로를 심으면 이 기준은 공허해진다
  const REL = join('data', 'uploads', 'ffffffff-0000-note.txt')

  it('deliver hands an absolute local_path even when stored_path is relative', async () => {
    const { app, gateway, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const { ws } = await wsConnect(port, invite(room, pm))

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '봐줘')")
      .run(room, ).lastInsertRowid as number
    db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)')
      .run(msgId, 'note.txt', REL, 'text/plain')
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(msgId) as any

    gateway.deliver(room, { ...row, author_name: 'alice' }, [{ botId: pm, delivery: 'to' }])
    const msg = await nextMessage(ws)

    expect(msg.files).toHaveLength(1)
    expect(isAbsolute(msg.files[0].local_path)).toBe(true)
    expect(msg.files[0].local_path).toBe(resolve(REL))
    expect(msg.files[0].name).toBe('note.txt')

    ws.close()
    await app.close()
  })

  it('the replay path hands an absolute local_path too', async () => {
    const { app, port } = await build()
    const room = seedRoom()
    const pm = seedBot('pm')
    const token = invite(room, pm)

    const msgId = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'user', '밀린 것')")
      .run(room).lastInsertRowid as number
    db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(msgId, pm, 'to')
    db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, 3, ?)')
      .run(msgId, 'note.txt', REL, 'text/plain')

    const { ws } = await wsConnect(port, token)
    const replay = await nextMessage(ws)

    expect(replay.id).toBe(msgId)
    expect(replay.files).toHaveLength(1)
    expect(isAbsolute(replay.files[0].local_path)).toBe(true)
    expect(replay.files[0].local_path).toBe(resolve(REL))

    ws.close()
    await app.close()
  })
})
