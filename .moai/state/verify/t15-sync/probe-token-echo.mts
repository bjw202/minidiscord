// t15-sync-P1: `hello` 를 받는 자리에 있는 상대가, 같은 프레임에 실려 온 평문 토큰으로
// 증명을 계산하면 SPEC-GWAUTH-001 의 대조를 통과하는가?
//
// v0.4.0 의 spec.md §5 배제표 1행은 그 상대를 «증명을 만들 수 없다 / 배제한다» 로 적었다.
// 이 프로브가 그 행을 반증했고, 커밋 26b2f71 이 표를 실측에 맞춰 축소했다.
//
// 형태는 plan 단계의 probe-rogue-welcome.mts 와 같다 — 스위트 밖의 독립 스크립트다.
// vitest 로 만들지 않은 이유: channel/test/ 에 두면 기본 스위트에 수집되어 264 라는
// 형제 문서 다수가 인용하는 개수가 바뀌고, 그 인용들이 일제히 낡는다.
//
// 실행: npx tsx .moai/state/verify/t15-sync/probe-token-echo.mts
// 선행: npm run build -w channel  (channel/dist 가 있어야 한다)
import { WebSocketServer } from 'ws'
import { createHash, createHmac } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'
import { createGatewayClient } from '../../../../channel/dist/gateway-client.js'

const LOG = new URL('./probe.log', import.meta.url).pathname
writeFileSync(LOG, '')
const log = (s: string) => appendFileSync(LOG, s + '\n')

// 채널만 아는 값이다. 위조자는 이 문자열을 미리 알지 못한다 —
// 아는 경로는 오직 자기 소켓에 도착하는 hello 프레임 하나뿐이다.
const SECRET = 'secret-token-the-rogue-never-knew'

const wss = new WebSocketServer({ port: 0 })
let sawToken = ''
let sawNonce = ''

wss.on('connection', ws => {
  ws.on('message', d => {
    const m = JSON.parse(String(d))
    if (m.type !== 'hello') return
    // 위조자가 hello 에서 읽는 것 — 토큰과 논스 둘 다 평문으로 도착한다.
    sawToken = m.token
    sawNonce = m.nonce
    const key = createHash('sha256').update(m.token).digest('hex')
    const proof = createHmac('sha256', key).update(`${m.nonce}|1|2`).digest('hex')
    ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm', proof }))
  })
})

const port = (wss.address() as { port: number }).port
let welcomed = false
const client = createGatewayClient({
  url: `ws://127.0.0.1:${port}/bot`,
  token: SECRET,
  onWelcome: () => { welcomed = true },
})
client.start()

const t0 = Date.now()
while (!welcomed && Date.now() - t0 < 3000) await new Promise(r => setTimeout(r, 10))

log(`P1_TOKEN_SEEN_BY_ROGUE>>>${sawToken}`)
log(`P1_TOKEN_MATCHES_CHANNEL_SECRET>>>${sawToken === SECRET}`)
log(`P1_NONCE_SEEN_BY_ROGUE>>>${sawNonce}`)
log(`P1_SESSION_ESTABLISHED>>>${welcomed}`)

client.stop()
wss.close()
process.exit(0)
