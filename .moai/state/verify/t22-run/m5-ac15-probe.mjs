// M5 실측 — AC-015 시나리오 재현 (컴파일된 진짜 클라이언트 대상).
// welcome(seq1) 확립 뒤: seq2 판정(기준선) → seq2 재생 → seq1 → seq3. 각 단계에서 관측되는 verdicts.
import { createServer } from 'node:http'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WebSocketServer, WebSocket } from 'ws'
import { createHmac, createPrivateKey, createPublicKey, randomBytes, sign } from 'node:crypto'
import { createGatewayClient } from './m3-dist/channel/gateway-client.js'

const skOf = t => createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), createHmac('sha256', t).update('minidiscord/v2/sign').digest()]), format: 'der', type: 'pkcs8' })
const pubOf = t => createPublicKey(skOf(t)).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
const ksrvOf = t => createHmac('sha256', t).update('minidiscord/v2/server-confirm').digest()

const TOKEN = 'tok'
const wss = new WebSocketServer({ port: 0 })
await new Promise(r => wss.on('listening', r))
const sessions = new Map()
const pending = new Map()
let envLog = 'sent: '
wss.on('connection', ws => {
  ws.on('message', d => {
    const m = JSON.parse(String(d))
    if (m.type === 'hello') {
      const sn = randomBytes(32).toString('hex')
      pending.set(ws, { cn: m.client_nonce, sn })
      const proof = createHmac('sha256', ksrvOf(TOKEN)).update(`challenge|${m.client_nonce}|${sn}|1|2|${m.pub}|unbound`).digest('hex')
      ws.send(JSON.stringify({ type: 'challenge', server_nonce: sn, room_id: 1, bot_id: 2, server_proof: proof }))
    }
    if (m.type === 'auth') {
      const p = pending.get(ws)
      sessions.set(ws, { sessKey: createHmac('sha256', ksrvOf(TOKEN)).update(`session|${p.cn}|${p.sn}|1|2|unbound`).digest(), seq: 0 })
    }
  })
})
const port = wss.address().port
const httpServer = createServer()
void httpServer

const verdicts = []
const client = createGatewayClient({ url: `ws://127.0.0.1:${port}/bot`, token: TOKEN, onVerdict: v => { verdicts.push(v.request_id + ':' + v.behavior); console.error('[verdict]', verdicts.join(',')) } })
client.start()

const first = await new Promise(res => {
  const wait = setInterval(() => {
    const c = wss.clients.values().next().value
    if (c && !c._wired) {
      c._wired = true
      clearInterval(wait)
      c.on('message', d => { const m = JSON.parse(String(d)); if (m.type === 'auth') res(c) })
    }
  }, 20)
})
const s = sessions.get(first)
const env = (seq, inner, macOverride) => {
  const payload = JSON.stringify(inner)
  const mac = macOverride ?? createHmac('sha256', s.sessKey).update(`${seq}|${payload}`).digest('hex')
  return JSON.stringify({ type: 'env', seq, payload, mac })
}
await new Promise(r => setTimeout(r, 200))
// 기준선 seq 2
first.send(env(2, { type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })); envLog += ' seq2,'
await new Promise(r => setTimeout(r, 300))
// 재생 seq 2
first.send(env(2, { type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })); envLog += ' replay-seq2,'
await new Promise(r => setTimeout(r, 300))
// 역행 seq 1
first.send(env(1, { type: 'permission_verdict', request_id: 'abcde0', behavior: 'allow' })); envLog += ' seq1,'
await new Promise(r => setTimeout(r, 300))
// 정상 seq 3
first.send(env(3, { type: 'permission_verdict', request_id: 'abcde2', behavior: 'allow' })); envLog += ' seq3,'
await new Promise(r => setTimeout(r, 400))
console.error('[final verdicts]', JSON.stringify(verdicts))
console.error('[envLog]', envLog)
client.stop(); wss.close()
process.exit(0)
