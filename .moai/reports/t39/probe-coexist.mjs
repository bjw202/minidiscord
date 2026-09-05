// 탐침 2 — plan-audit D1 관측 3 의 독립 재현.
// 묻는 것: 게이트웨이 없는 앱이 127.0.0.1:P 를 먼저 쥔 상태에서, 게이트웨이를 단
// Fastify 앱이 {port: 0} 으로 같은 P 를 잡을 수 있는가. 잡힌다면 ws://127.0.0.1:P/bot
// 은 누구에게 닿는가.
// node_modules 는 주 체크아웃 것을 상위 탐색으로 쓴다 (이 나무에는 없다).
import Fastify from 'fastify'
import { WebSocketServer, WebSocket } from 'ws'

// 1) 게이트웨이 없는 앱을 127.0.0.1 에 명시 바인드 — restart-persistence.test.ts:43 과 같은 형태
const other = Fastify()
await other.listen({ port: 0, host: '127.0.0.1' })
const P = other.server.address().port
console.log('타앱(게이트웨이 없음) :', JSON.stringify(other.server.address()))

// 2) 게이트웨이를 단 앱을 host 없이 바인드 — gateway.test.ts:54 와 같은 형태.
//    같은 P 를 강제로 요구해 «공존 가능한가» 를 직접 묻는다.
const mine = Fastify()
const wss = new WebSocketServer({ server: mine.server, path: '/bot' })
wss.on('connection', () => console.log('!!! 내 게이트웨이가 받았다 (H-3)'))
let bindErr = null
try { await mine.listen({ port: P }) } catch (e) { bindErr = e.code || String(e) }
console.log('내앱(게이트웨이 있음)  :', bindErr ? `바인드 실패 ${bindErr}` : JSON.stringify(mine.server.address()))

if (!bindErr) {
  const ws = new WebSocket(`ws://127.0.0.1:${P}/bot`)
  ws.on('unexpected-response', (_req, res) => {
    let body = ''
    res.on('data', d => { body += d })
    res.on('end', async () => {
      console.log('*** 상태', res.statusCode, '본문', body.slice(0, 120))
      console.log('    server 헤더:', res.headers.server ?? '(없음)')
      await done()
    })
  })
  ws.on('open', async () => { console.log('*** 업그레이드 성공 — 404 아님'); ws.close(); await done() })
  ws.on('error', async e => { console.log('*** 오류', e.code || e.message); await done() })
} else { await done() }

async function done () {
  try { wss.close() } catch {}
  try { await mine.close() } catch {}
  try { await other.close() } catch {}
  process.exit(0)
}
setTimeout(() => { console.log('시간 초과'); process.exit(1) }, 8000)
