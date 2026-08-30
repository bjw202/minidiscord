// F-05 재현: 게이트웨이가 JSON 아닌 프레임을 보내면 봇 프로세스가 사는가?
// 실행: channel/ 복사본에서 `node --import tsx probe/crash.ts`
import { WebSocketServer } from 'ws'
import { createGatewayClient } from '../src/gateway-client.js'
const wss = new WebSocketServer({ port: 0 })
const port = (wss.address() as any).port
wss.on('connection', ws => ws.on('message', d => {
  if (JSON.parse(String(d)).type === 'hello') ws.send('not-json{')
}))
const gw = createGatewayClient({ url: `ws://127.0.0.1:${port}/bot`, token: 'tok' })
gw.start()
setTimeout(() => { console.log('P4_SURVIVED'); process.exit(0) }, 800)
// 관측: P4_SURVIVED 는 출력되지 않고 SyntaxError 로 exit 1
