// 탐침(증거로 커밋됨) — N1 의 대안 관측 창을 시험한다.
// 물음 셋:
//   (1) 자기 앱 HTTP 서버에 «소비하지 않는» upgrade 리스너를 하나 더 달면
//       ws 의 핸드셰이크(101)가 그대로 성립하는가?
//   (2) 그 리스너가 포획된 요청 하나에 귀속되는 값(경로 + 클라이언트 임시 포트)을
//       내놓는가?
//   (3) 공존 배치(타앱이 127.0.0.1:P 선점, 자기 앱은 기본 호스트)에서
//       그 리스너는 침묵하는가? 그리고 Fastify 부차 바인드로 들어온 업그레이드는
//       주 서버로 전달되어 이 리스너에 보이는가?
import Fastify from 'fastify'
import { WebSocketServer, WebSocket } from 'ws'

function makeApp ({ withGateway }) {
  const app = Fastify()
  const st = { onRequestUrls: [], upgrades: [] }
  app.addHook('onRequest', (req, _r, done) => { st.onRequestUrls.push(req.url); done() })
  let wss = null
  if (withGateway) wss = new WebSocketServer({ server: app.server, path: '/bot' })
  // 소비하지 않는 관측 리스너 — 소켓을 쓰지도 닫지도 않는다.
  app.server.on('upgrade', (req, socket) => {
    st.upgrades.push({ url: req.url, remotePort: socket.remotePort, localAddress: socket.localAddress })
  })
  return { app, st, wss }
}

async function dial (P, path, host = '127.0.0.1') {
  return new Promise(res => {
    const ws = new WebSocket(`ws://${host}:${P}${path}`)
    let clientPort = null
    ws.on('upgrade', () => {})
    ws.on('unexpected-response', (_q, rp) => {
      clientPort = rp.socket && rp.socket.localPort
      let b = ''
      rp.on('data', d => { b += d })
      rp.on('end', () => res({ kind: `status ${rp.statusCode}`, body: b.slice(0, 70), clientPort }))
    })
    ws.on('open', () => {
      clientPort = ws._socket.localPort
      ws.close()
      res({ kind: '101', body: '', clientPort })
    })
    ws.on('error', e => res({ kind: `오류 ${e.code || e.message}`, body: '', clientPort }))
  })
}

// ── 배열 1: 자기 앱 단독. 관측 리스너가 핸드셰이크를 깨는가?
{
  const { app, st, wss } = makeApp({ withGateway: true })
  await app.listen({ port: 0 })
  const P = app.server.address().port
  console.log('[배열1] upgrade 리스너 수 =', app.server.listenerCount('upgrade'))
  const a = await dial(P, '/bot')
  console.log('  /bot  ->', a.kind, '| 클라 임시포트', a.clientPort)
  const b = await dial(P, '/nope')
  console.log('  /nope ->', b.kind, b.body, '| 클라 임시포트', b.clientPort)
  console.log('  관측 리스너가 본 것 :', JSON.stringify(st.upgrades))
  console.log('  onRequest 가 본 URL :', JSON.stringify(st.onRequestUrls))
  const matched = st.upgrades.filter(u => u.remotePort === b.clientPort && u.url === '/nope')
  console.log('  귀속 대조(/nope 의 클라 포트로 찾기) 적중 =', matched.length)
  try { wss.close() } catch {}
  await app.close()
}

// ── 배열 2: 공존. 타앱(게이트웨이 없음)이 127.0.0.1:P 를 선점하고
//    자기 앱은 host 미지정으로 같은 P 에 붙는다.
{
  const foreign = Fastify()
  await foreign.listen({ port: 0, host: '127.0.0.1' })
  const P = foreign.server.address().port
  const { app, st, wss } = makeApp({ withGateway: true })
  let coexist = true
  try {
    await app.listen({ port: P })
  } catch (e) {
    coexist = false
    console.log('[배열2] 공존 실패:', e.code)
  }
  if (coexist) {
    console.log('[배열2] 타앱', JSON.stringify(foreign.server.address()),
      '| 자기앱', JSON.stringify(app.server.address()))
    const r = await dial(P, '/bot')
    console.log('  ws://127.0.0.1:P/bot ->', r.kind, r.body, '| 클라 임시포트', r.clientPort)
    console.log('  자기 앱 관측 리스너가 본 것 :', JSON.stringify(st.upgrades))
    console.log('  자기 앱 onRequest 가 본 URL :', JSON.stringify(st.onRequestUrls))
    const matched = st.upgrades.filter(u => u.remotePort === r.clientPort)
    console.log('  귀속 대조 적중 =', matched.length)
    try { wss.close() } catch {}
    await app.close()
  }
  await foreign.close()
}

// ── 배열 3: 자기 앱만 host 미지정으로 붙는다(부차 바인드 성립).
//    127.0.0.1 로 걸었을 때 부차 바인드의 업그레이드가 주 서버로 전달되는가?
{
  const { app, st, wss } = makeApp({ withGateway: true })
  await app.listen({ port: 0 })
  const P = app.server.address().port
  console.log('[배열3] 주 리스너', JSON.stringify(app.server.address()))
  const v4 = await dial(P, '/bot', '127.0.0.1')
  console.log('  ws://127.0.0.1:P/bot ->', v4.kind, '| 클라 임시포트', v4.clientPort)
  const v6 = await dial(P, '/bot', '[::1]')
  console.log('  ws://[::1]:P/bot     ->', v6.kind, '| 클라 임시포트', v6.clientPort)
  console.log('  관측 리스너가 본 것 :', JSON.stringify(st.upgrades))
  const m4 = st.upgrades.filter(u => u.remotePort === v4.clientPort).length
  const m6 = st.upgrades.filter(u => u.remotePort === v6.clientPort).length
  console.log(`  귀속 대조 적중 — IPv4 경유 ${m4} · IPv6 경유 ${m6}`)
  try { wss.close() } catch {}
  await app.close()
}

process.exit(0)
