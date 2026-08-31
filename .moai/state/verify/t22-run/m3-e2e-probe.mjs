// M3 실측 프로브 — 컴파일된 진짜 채널 클라이언트(m3-dist/channel)와 진짜 서버(m3-dist/server)의 왕복,
// 그리고 스텁 게이트웨이를 상대로 한 클라이언트 쪽 거절 갈래들. 독립 재계산은 구현 코드를 부르지 않는다.
//  ① 진짜 왕복: 유도 일치 → challenge 대조 → auth → 봉투 welcome → onWelcome (REQ-GWAUTH2-001·002·004·007)
//  ② 진짜 방 봉투 수신: deliver → onMessage, requestHistory → 해소 (REQ-GWAUTH2-012)
//  ③ unbound 공시 한 줄 (REQ-GWAUTH2-020 해석 — 확립 시점, progress.md §E.2.13)
//  ④ challenge 변조 거절: 닫힘·stderr 한 줄·auth 미송신·예외 0 (REQ-GWAUTH2-006·016·019)
//  ⑤ 봉투 mac 변조 → 버림, 같은 소켓에서 다음 유효 봉투 도착 (AC-GWAUTH2-014 의 연속성)
//  ⑥ seq 재생 거절 → 버림, seq+1 도착 (REQ-GWAUTH2-014·015)
//  ⑦ 맨몸 welcome(v1 형태) 거부 (REQ-GWAUTH2-017)
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHmac, randomBytes } from 'node:crypto'
import { WebSocket, WebSocketServer } from 'ws'
import { openDb } from './m3-dist/server/src/db.js'
import { deriveBotKeys } from './m3-dist/server/src/routes-bots.js'
import { createGateway } from './m3-dist/server/src/gateway.js'
import { createGatewayClient } from './m3-dist/channel/gateway-client.js'

const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }

// stderr 감시 — console.error 를 가로채고 원본도 남긴다
const origErr = console.error
let stderrLines = []
console.error = (...a) => { stderrLines.push(a.join(' ')); origErr('[captured]', ...a) }
const unhandled = []
process.on('unhandledRejection', e => unhandled.push(String(e)))
process.on('uncaughtException', e => unhandled.push(String(e)))

const TOKEN = 'cd'.repeat(32)
const dir = mkdtempSync(join(tmpdir(), 't22-m3-'))
mkdirSync(join(dir, 'uploads'), { recursive: true })

// ── 스텁 공용 ──
const ksrvOf = t => createHmac('sha256', t).update('minidiscord/v2/server-confirm').digest()

// ── ①②③ 진짜 서버와의 왕복 ──
{
  const db = openDb(join(dir, 'real.db'))
  const room = db.prepare("INSERT INTO rooms (name) VALUES ('r')").run()
  const roomId = Number(room.lastInsertRowid)
  const bot = db.prepare("INSERT INTO bots (name) VALUES ('pm')").run()
  const botId = Number(bot.lastInsertRowid)
  const { verifierPub, serverConfirmKey } = deriveBotKeys(TOKEN)
  db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)').run(roomId, botId, verifierPub, serverConfirmKey)
  const httpServer = createServer()
  await new Promise(r => httpServer.listen(0, '127.0.0.1', r))
  const gw = createGateway({ db, hub: { publish() {} }, server: httpServer, addHook() {} }, { uploadsDir: join(dir, 'uploads') })
  const port = httpServer.address().port

  const notes = []
  const welcomes = []
  const client = createGatewayClient({
    url: `ws://127.0.0.1:${port}/bot`, token: TOKEN,
    onMessage: m => notes.push(m), onWelcome: w => welcomes.push(w),
  })
  client.start()
  const t0 = Date.now()
  while (welcomes.length === 0 && Date.now() - t0 < 5000) await new Promise(r => setTimeout(r, 50))
  check('A. 진짜 왕복 확립(onWelcome)', welcomes.length === 1, JSON.stringify(welcomes[0] ?? {}))
  check('B. welcome 안에 봉투 흔적 없음(내부 프레임만 전달)', welcomes[0] && !('seq' in welcomes[0]) && !('mac' in welcomes[0]))
  gw.deliver(roomId, { id: 1, room_id: roomId, author_type: 'system', author_name: '시스템', body: 'live-1', created_at: '' }, [{ botId, delivery: 'to' }])
  const t1 = Date.now()
  while (notes.length === 0 && Date.now() - t1 < 4000) await new Promise(r => setTimeout(r, 50))
  check('C. 확립 후 메시지가 봉투로 도착', notes.length === 1 && notes[0].body === 'live-1')
  let hist = 'pending'
  client.requestHistory({ limit: 10 }).then(() => { hist = 'resolved' }, () => { hist = 'rejected' })
  const t2 = Date.now()
  while (hist === 'pending' && Date.now() - t2 < 4000) await new Promise(r => setTimeout(r, 50))
  check('D. 이력 요청 해소(봉투 응답)', hist === 'resolved')
  check('E. unbound 공시 한 줄(중계|바인딩|unbound)', stderrLines.filter(l => /중계|바인딩|unbound/.test(l)).length === 1, `lines=${JSON.stringify(stderrLines)}`)
  client.stop()
  httpServer.close()
}

// ── ④ challenge 변조 거절 ──
{
  stderrLines = []
  const httpServer = createServer()
  const wss = new WebSocketServer({ server: httpServer, path: '/bot' })
  const framesIn = []
  wss.on('connection', ws => {
    ws.on('message', raw => {
      const m = JSON.parse(String(raw))
      framesIn.push(m.type)
      if (m.type === 'hello') {
        const sn = randomBytes(32).toString('hex')
        const good = createHmac('sha256', ksrvOf(TOKEN)).update(`challenge|${m.client_nonce}|${sn}|1|2|${m.pub}|unbound`).digest('hex')
        ws.send(JSON.stringify({ type: 'challenge', server_nonce: sn, room_id: 1, bot_id: 2, server_proof: good.slice(0, -1) + '7' }))
      }
    })
  })
  await new Promise(r => httpServer.listen(0, '127.0.0.1', r))
  const client = createGatewayClient({ url: `ws://127.0.0.1:${httpServer.address().port}/bot`, token: TOKEN, maxBackoffMs: 200 })
  client.start()
  await new Promise(r => setTimeout(r, 800))
  check('F. 변조 challenge → auth 미송신', !framesIn.includes('auth'), `frames=${JSON.stringify(framesIn)}`)
  check('G. 거절 stderr 정확히 한 줄', stderrLines.length === 1, `lines=${JSON.stringify(stderrLines)}`)
  client.stop()
  httpServer.close()
}

// ── ⑤⑥⑦ 봉투 변조·seq 재생·맨몸 welcome ──
{
  stderrLines = []
  const httpServer = createServer()
  const wss = new WebSocketServer({ server: httpServer, path: '/bot' })
  let session = null
  wss.on('connection', ws => {
    ws.on('message', raw => {
      const m = JSON.parse(String(raw))
      if (m.type !== 'hello') return
      const sn = randomBytes(32).toString('hex')
      const ksrv = ksrvOf(TOKEN)
      const proof = createHmac('sha256', ksrv).update(`challenge|${m.client_nonce}|${sn}|1|2|${m.pub}|unbound`).digest('hex')
      ws.send(JSON.stringify({ type: 'challenge', server_nonce: sn, room_id: 1, bot_id: 2, server_proof: proof }))
      ws.once('message', raw2 => {
        const a = JSON.parse(String(raw2))
        if (a.type !== 'auth') return
        session = { ksrv, cn: m.client_nonce, sn }
        const sessKey = createHmac('sha256', ksrv).update(`session|${session.cn}|${sn}|1|2|unbound`).digest()
        session.sessKey = sessKey
        const env = (seq, inner, macBad = false) => {
          const payload = JSON.stringify(inner)
          let mac = createHmac('sha256', sessKey).update(`${seq}|${payload}`).digest('hex')
          if (macBad) mac = mac.slice(0, -1) + (mac.endsWith('0') ? '1' : '0')   // 실제로 다른 값이 되도록 뒤집는다
          return JSON.stringify({ type: 'env', seq, payload, mac })
        }
        ws.send(env(1, { type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))          // 정상 확립
        setTimeout(() => ws.send(env(2, { type: 'message', id: 9, body: 'bad-mac', delivery: 'to' }, true)), 120)  // ⑤ mac 변조
        setTimeout(() => ws.send(env(3, { type: 'message', id: 10, body: 'good-after-bad', delivery: 'to' })), 240) // 같은 소켓 유효 봉투
        setTimeout(() => ws.send(env(3, { type: 'message', id: 11, body: 'replay', delivery: 'to' })), 360)         // ⑥ seq 재생(seq 3 반복)
        setTimeout(() => ws.send(env(4, { type: 'message', id: 12, body: 'after-replay', delivery: 'to' })), 480)   // seq 4 정상
        setTimeout(() => ws.send(JSON.stringify({ type: 'welcome', room_id: 1 })), 600)                             // ⑦ 맨몸 welcome
      })
    })
  })
  await new Promise(r => httpServer.listen(0, '127.0.0.1', r))
  const notes = []
  const client = createGatewayClient({ url: `ws://127.0.0.1:${httpServer.address().port}/bot`, token: TOKEN, onMessage: m => notes.push(m.body) })
  client.start()
  await new Promise(r => setTimeout(r, 900))
  check('H. mac 변조 봉투는 버려진다', !notes.includes('bad-mac'))
  check('I. 같은 소켓에서 다음 유효 봉투는 도착한다', notes.includes('good-after-bad'))
  check('J. seq 재생은 버려진다', !notes.includes('replay'))
  check('K. 재생 뒤 정상 seq 는 도착한다', notes.includes('after-replay'))
  check('L. 도착 순서가 전선 순서대로다', JSON.stringify(notes) === JSON.stringify(['good-after-bad', 'after-replay']), JSON.stringify(notes))
  check('M. 맨몸 welcome 은 콜백에 안 간다(established 유지)', !notes.includes(undefined) && notes.length === 2)
  client.stop()
  httpServer.close()
}

console.error = origErr
check('N. 처리되지 않은 거부·예외 0', unhandled.length === 0, JSON.stringify(unhandled))
const failed = results.filter(r => !r).length
console.log(`PROBE ${failed === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed}/${results.length}`)
process.exit(failed === 0 ? 0 : 1)
