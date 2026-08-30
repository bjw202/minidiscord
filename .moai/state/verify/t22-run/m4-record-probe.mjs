// M4 실측 — recordSocket 구축 실측 (acceptance.md §「서버 소켓 프레임 기록」 J-02 표면).
// createGateway 의 onConnection 으로 서버 소켓을 받아 recordSocket 을 붙이고, 진짜 v2 핸드셰이크를
// 돌려 두 방향·전선 순서·원문+파싱 병행 기록이 성립하는가를 잰다. 소비 기준(AC-004)은 M5 다.
import { createServer } from 'node:http'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WebSocket } from 'ws'
import { openDb } from './m4-dist/server/src/db.js'
import { deriveBotKeys } from './m4-dist/server/src/routes-bots.js'
import { createGateway } from './m4-dist/server/src/gateway.js'

const dir = mkdtempSync(join(tmpdir(), 't22-m4-'))
mkdirSync(join(dir, 'uploads'), { recursive: true })
const db = openDb(join(dir, 'probe.db'))
const TOKEN = 'ef'.repeat(32)
const { verifierPub } = deriveBotKeys(TOKEN)
const room = db.prepare("INSERT INTO rooms (name) VALUES ('r')").run()
const bot = db.prepare("INSERT INTO bots (name) VALUES ('pm')").run()
db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')
  .run(Number(room.lastInsertRowid), Number(bot.lastInsertRowid), verifierPub, deriveBotKeys(TOKEN).serverConfirmKey)

const httpServer = createServer()
let recorded = null
const gw = createGateway(
  { db, hub: { publish() {} }, server: httpServer, addHook() {} },
  { uploadsDir: join(dir, 'uploads'), onConnection: ws => { recorded = recordSocketOf(ws) } },
)
await new Promise(r => httpServer.listen(0, '127.0.0.1', r))
const port = httpServer.address().port

function recordSocketOf(ws) {
  // gateway-v2.ts 의 recordSocket 과 동일한 계약 — 컴파일 dist 와 테스트 TS 를 잇는 실측이므로 여기서는
  // 최소 형태로 직접 둔다. 정본 구현은 server/test/gateway-v2.ts 다.
  const sent = [], received = [], rawSent = [], rawReceived = []
  const orig = ws.send.bind(ws)
  ws.send = (data, cb) => { rawSent.push(String(data)); try { sent.push(JSON.parse(String(data))) } catch {} ; orig(data, cb) }
  ws.on('message', d => { rawReceived.push(String(d)); try { received.push(JSON.parse(String(d))) } catch {} })
  return { sent, received, rawSent, rawReceived }
}

// 최소 v2 클라이언트 — hello → challenge 수신 → auth → env welcome
const ws = new WebSocket(`ws://127.0.0.1:${port}/bot`)
const frames = []
ws.on('message', d => frames.push(JSON.parse(String(d))))
await new Promise(r => ws.on('open', r))
const cn = 'ab'.repeat(32)
ws.send(JSON.stringify({ type: 'hello', pub: verifierPub, client_nonce: cn }))
await new Promise(r => setTimeout(r, 400))
const challenge = frames.find(f => f.type === 'challenge')
const { createHmac, createPrivateKey, sign } = await import('node:crypto')
const seed = createHmac('sha256', TOKEN).update('minidiscord/v2/sign').digest()
const sk = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' })
ws.send(JSON.stringify({ type: 'auth', signature: sign(null, Buffer.from(`auth|${cn}|${challenge.server_nonce}|${challenge.room_id}|${challenge.bot_id}|${verifierPub}|unbound`), sk).toString('hex') }))
await new Promise(r => setTimeout(r, 600))

const results = []
const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`) }
const r = recorded
check('A. 부착 자체가 성립했다(onConnection → 기록기)', r !== null)
check('B. receivedFrames 가 hello·auth 를 전선 순서대로', JSON.stringify(r.received.map(f => f.type)) === JSON.stringify(['hello', 'auth']), JSON.stringify(r.received.map(f => f.type)))
check('C. sentFrames 가 challenge→env welcome 을 전선 순서대로', JSON.stringify(r.sent.map(f => f.type)) === JSON.stringify(['challenge', 'env']) && JSON.parse(r.sent[1].payload).type === 'welcome')
check('D. env welcome 의 seq 가 1이다', r.sent[1]?.seq === 1)
check('E. 원문과 파싱이 같은 길이로 병행된다', r.rawSent.length === r.sent.length && r.rawReceived.length === r.received.length)
check('F. 원문에 봉투 문자열이 그대로 있다', typeof r.rawSent[1] === 'string' && r.rawSent[1].includes('"type":"env"'))
ws.close(); httpServer.close()
const failed = results.filter(x => !x).length
console.log(`PROBE ${failed === 0 ? 'PASS' : 'FAIL'} — ${results.length - failed}/${results.length}`)
process.exit(failed === 0 ? 0 : 1)
