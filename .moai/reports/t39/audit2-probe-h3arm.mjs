// 2회차 감사 탐침 D — ㉮ 갈래(자기 앱 수신 카운터 증가 → H-3)가
// «업그레이드 요청» 이라는 사건 부류 위에서 도달 가능한지 묻는다.
// 자기 앱에는 WSS 가 붙어 upgrade 리스너가 있다. 그 상태에서 경로가 어긋난
// 업그레이드를 걸면 Fastify 의 onRequest 가 도는가?
import Fastify from 'fastify'
import { WebSocketServer, WebSocket } from 'ws'

const app = Fastify()
const st = { received: 0, urls: [] }
app.addHook('onRequest', (req, _r, done) => { st.received += 1; st.urls.push(req.url); done() })
const wss = new WebSocketServer({ server: app.server, path: '/bot' })
await app.listen({ port: 0 })
const P = app.server.address().port
console.log('upgrade 리스너 수 =', app.server.listenerCount('upgrade'))

async function dial (path) {
  const before = st.received
  const r = await new Promise(res => {
    const ws = new WebSocket(`ws://127.0.0.1:${P}${path}`)
    ws.on('unexpected-response', (_q, rp) => {
      let b = ''
      rp.on('data', d => { b += d })
      rp.on('end', () => res(`status ${rp.statusCode} body ${b.slice(0, 60)}`))
    })
    ws.on('open', () => { ws.close(); res('101 업그레이드 성공') })
    ws.on('error', e => res(`오류 ${e.code || e.message}`))
  })
  console.log(`  ${path.padEnd(10)} -> ${r} | 카운터 증감 ${st.received - before}`)
}

await dial('/bot')
await dial('/nope')
console.log('onRequest 가 본 URL 전건 :', JSON.stringify(st.urls))
try { wss.close() } catch {}
await app.close()
process.exit(0)
