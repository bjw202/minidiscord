// M2 실측 프로브 — 컴파일된 v2 게이트웨이(/m4-dist/server)와 실제 WebSocket 왕복.
// 재는 것: ① v1 hello 거절 ② challenge 없는 auth 거절 ③ 등록이 auth 통과 시점으로 옮겨졌는가(REQ-GWAUTH2-009)
// ④ challenge 전사·키 집합(cb='unbound') ⑤ welcome 이 봉투 안인가(§B.2) ⑥ seq 1 시작·정확히 1 증가(REQ-GWAUTH2-013)
// ⑦ deliver·sendToBot 이 봉투로 나가는가 ⑧ 틀린 서명 거절. 독립 재계산은 구현 코드를 부르지 않는다(하네스 규약).
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHmac, createPrivateKey, randomBytes, sign } from 'node:crypto'
import { WebSocket } from 'ws'
import { openDb } from './m4-dist/server/src/db.js'
import { deriveBotKeys } from './m4-dist/server/src/routes-bots.js'
import { createGateway } from './m4-dist/server/src/gateway.js'

const dir = mkdtempSync(join(tmpdir(), 't22-m2-'))
mkdirSync(join(dir, 'uploads'), { recursive: true })
mkdirSync(join(dir, 'botfiles'), { recursive: true })
const db = openDb(join(dir, 'probe.db'))
const TOKEN = 'ab'.repeat(32)
const { verifierPub, serverConfirmKey } = deriveBotKeys(TOKEN)
const ksrv = Buffer.from(serverConfirmKey, 'hex')

const room = db.prepare("INSERT INTO rooms (name) VALUES ('r')").run()
const roomId = Number(room.lastInsertRowid)
const bot = db.prepare("INSERT INTO bots (name) VALUES ('pm')").run()
const botId = Number(bot.lastInsertRowid)
db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')
  .run(roomId, botId, verifierPub, serverConfirmKey)
for (const body of ['seeded one', 'seeded two']) {
  const m = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', ?)").run(roomId, body)
  db.prepare('INSERT INTO message_targets (message_id, bot_id, delivery) VALUES (?, ?, ?)').run(m.lastInsertRowid, botId, 'to')
}

const httpServer = createServer()
await new Promise(r => httpServer.listen(0, '127.0.0.1', r))
const port = httpServer.address().port
const gw = createGateway(
  { db, hub: { publish() {} }, server: httpServer, addHook() {} },
  { uploadsDir: join(dir, 'uploads'), botFilesDir: join(dir, 'botfiles') },
)
const url = `ws://127.0.0.1:${port}/bot`

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const waitClose = sock => new Promise(r => { if (sock.readyState === 3) return r(); sock.once('close', r) })
const framesOf = sock => {
  const frames = []
  sock.on('message', d => { try { frames.push(JSON.parse(String(d))) } catch { frames.push({ __raw: String(d) }) } })
  return frames
}

// ── ① v1 hello 는 닫힌다 ─────────────────────────────────────────────
{
  const ws = new WebSocket(url)
  const frames = framesOf(ws)
  await new Promise(r => ws.on('open', r))
  ws.send(JSON.stringify({ type: 'hello', token: TOKEN }))
  await waitClose(ws)
  check('A. v1 hello{token} 닫힘·무응답', ws.readyState === 3 && frames.length === 0, `frames=${frames.length}`)
}
// ── ② challenge 없는 auth 는 닫힌다 ─────────────────────────────────
{
  const ws = new WebSocket(url)
  const frames = framesOf(ws)
  await new Promise(r => ws.on('open', r))
  ws.send(JSON.stringify({ type: 'auth', signature: 'cd'.repeat(64) }))
  await waitClose(ws)
  check('B. challenge 없는 auth 닫힘·무응답', frames.length === 0, `frames=${frames.length}`)
}

// ── ③~⑦ 정상 핸드셰이크 ─────────────────────────────────────────────
const ws = new WebSocket(url)
const frames = framesOf(ws)
await new Promise(r => ws.on('open', r))
check('C0. hello 전 등록 없음', gw.isOnline(roomId, botId) === false)
const clientNonce = randomBytes(32).toString('hex')
ws.send(JSON.stringify({ type: 'hello', pub: verifierPub, client_nonce: clientNonce }))
const challenge = await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('challenge timeout')), 4000)
  ws.on('message', function h(d) {
    const m = JSON.parse(String(d))
    if (m.type === 'challenge') { clearTimeout(t); ws.off('message', h); res(m) }
  })
})
check('D. challenge 키 집합 고정', JSON.stringify(Object.keys(challenge).sort()) === JSON.stringify(['bot_id', 'room_id', 'server_nonce', 'server_proof', 'type']))
const proofExpect = createHmac('sha256', ksrv)
  .update(`challenge|${clientNonce}|${challenge.server_nonce}|${roomId}|${botId}|${verifierPub}|unbound`)
  .digest('hex')
check('E. challenge 증명=독립 재계산(cb=unbound)', challenge.server_proof === proofExpect)
check('F. challenge 후에도 등록 없음(등록 이동)', gw.isOnline(roomId, botId) === false)

const seed = createHmac('sha256', TOKEN).update('minidiscord/v2/sign').digest()
const sk = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' })
const signature = sign(null, Buffer.from(`auth|${clientNonce}|${challenge.server_nonce}|${roomId}|${botId}|${verifierPub}|unbound`), sk).toString('hex')
ws.send(JSON.stringify({ type: 'auth', signature }))
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('welcome timeout')), 4000)
  const h = () => { if (frames.some(f => f.type === 'env')) { clearTimeout(t); ws.off('message', h); res() } }
  ws.on('message', h)
})
const sessKey = createHmac('sha256', ksrv)
  .update(`session|${clientNonce}|${challenge.server_nonce}|${roomId}|${botId}|unbound`)
  .digest()
const macOk = f => createHmac('sha256', sessKey).update(`${f.seq}|${f.payload}`).digest('hex') === f.mac
const envs = frames.filter(f => f.type === 'env')
const welcomes = envs.filter(f => { try { return JSON.parse(f.payload).type === 'welcome' } catch { return false } })
check('G. welcome 이 봉투 안이다(맨몸 welcome 0)', welcomes.length === 1 && frames.every(f => f.type === 'env' || f.type === 'challenge'))
check('H. 봉투 키 집합 고정', envs.every(f => JSON.stringify(Object.keys(f).sort()) === JSON.stringify(['mac', 'payload', 'seq', 'type'])))
check('I. seq 1 시작', envs[0]?.seq === 1)
check('J. mac 전건 유효(독립 재계산)', envs.every(macOk))
check('K. 등록은 auth 통과 후', gw.isOnline(roomId, botId) === true)
const inner = envs.map(f => { try { return JSON.parse(f.payload).type } catch { return '?' } })
check('L. 재전송이 봉투로(seq 2,3)', JSON.stringify(inner) === JSON.stringify(['welcome', 'message', 'message']) && JSON.stringify(envs.map(f => f.seq)) === JSON.stringify([1, 2, 3]))

// ── ⑦ deliver·sendToBot 도 봉투로 ──────────────────────────────────
gw.deliver(roomId, { id: 99, room_id: roomId, author_type: 'system', author_name: '시스템', body: 'live', created_at: '' }, [{ botId, delivery: 'to' }])
await new Promise(r => setTimeout(r, 300))
const sentOk = gw.sendToBot(roomId, botId, { type: 'permission_verdict', params: { request_id: 'r1', behavior: 'allow' } })
await new Promise(r => setTimeout(r, 300))
const envs2 = frames.filter(f => f.type === 'env')
check('M. deliver 가 봉투로 도착', JSON.parse(envs2[3].payload).body === 'live' && envs2[3].seq === 4 && macOk(envs2[3]))
check('N. sendToBot true·봉투·seq 5', sentOk === true && envs2[4]?.seq === 5 && JSON.parse(envs2[4].payload).type === 'permission_verdict' && macOk(envs2[4]))
ws.close()

// ── ⑧ 틀린 서명은 등록 없이 닫힌다 ────────────────────────────────
// 먼저 정상 소켓을 닫아 isOnline 기준선을 false 로 만든다 — 안 그러면 등록 여부를 가를 수 없다
{
  ws.close()
  await new Promise(r => setTimeout(r, 300))
  const w2 = new WebSocket(url)
  const f2 = framesOf(w2)
  await new Promise(r => w2.on('open', r))
  w2.send(JSON.stringify({ type: 'hello', pub: verifierPub, client_nonce: randomBytes(32).toString('hex') }))
  await new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), 4000)
    w2.on('message', function h(d) { const m = JSON.parse(String(d)); if (m.type === 'challenge') { clearTimeout(t); w2.off('message', h); res(m) } })
  })
  const bad = signature.slice(0, -1) + (signature.endsWith('0') ? '1' : '0')
  w2.send(JSON.stringify({ type: 'auth', signature: bad }))
  await waitClose(w2)
  check('O. 틀린 서명 닫힘·미등록', gw.isOnline(roomId, botId) === false && f2.every(f => f.type === 'challenge' || f.type === 'env'))
}

httpServer.close()
const failed = results.filter(r => !r.ok).length
console.log(`PROBE ${failed === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed}/${results.length}`)
process.exit(failed === 0 ? 0 : 1)
