// 2회차 감사 탐침 — 새 2차 판별자(자기 앱 수신 카운터 + 포트 보유 상태)가
// 실제 관측 위에서 상수 함수인지 묻는다. D1 의 실패 모양이 재현되는지가 물음이다.
// node_modules 는 주 체크아웃 것을 상위 탐색으로 쓴다.
import Fastify from 'fastify'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'node:http'

function mkMine () {
  const app = Fastify()
  const st = { received: 0 }
  app.addHook('onRequest', (_req, _reply, done) => { st.received += 1; done() })
  return { app, st }
}

// ---- 배열 A: 타앱이 127.0.0.1:P 를 먼저 쥔 상태 (H-2 모양) ----
const other = Fastify()
await other.listen({ port: 0, host: '127.0.0.1' })
const P = other.server.address().port

const { app: mineA, st: stA } = mkMine()
const wssA = new WebSocketServer({ server: mineA.server, path: '/bot' })
let errA = null
try { await mineA.listen({ port: P }) } catch (e) { errA = e.code }

const beforeA = stA.received
const obsA = await new Promise(res => {
  const ws = new WebSocket(`ws://127.0.0.1:${P}/bot`)
  ws.on('unexpected-response', (_rq, rp) => {
    let b = ''
    rp.on('data', d => { b += d })
    rp.on('end', () => res({ status: rp.statusCode, body: b.slice(0, 80) }))
  })
  ws.on('open', () => { ws.close(); res({ status: 101 }) })
  ws.on('error', e => res({ err: e.code || e.message }))
})
const afterA = stA.received
const holdA = { listening: mineA.server.listening, port: mineA.server.address()?.port, own: P }

console.log('배열 A (타앱 선점)      : 바인드', errA ?? 'OK', '| 응답', JSON.stringify(obsA))
console.log('  카운터', beforeA, '->', afterA, '| 증감', afterA - beforeA, '| 보유', JSON.stringify(holdA))

await new Promise(r => { try { wssA.close() } catch {} ; mineA.close().then(r, r) })
await other.close()

// ---- 배열 B: 타앱 없음. 자기 앱이 직접 404 를 낸다 (H-3 모양의 카운터 거동) ----
const { app: mineB, st: stB } = mkMine()
const wssB = new WebSocketServer({ server: mineB.server, path: '/bot' })
await mineB.listen({ port: 0 })
const PB = mineB.server.address().port

const beforeB = stB.received
const obsB = await new Promise(res => {
  const rq = http.request({ host: '127.0.0.1', port: PB, path: '/nope', method: 'GET' }, rp => {
    let b = ''
    rp.on('data', d => { b += d })
    rp.on('end', () => res({ status: rp.statusCode, body: b.slice(0, 80) }))
  })
  rq.on('error', e => res({ err: e.code }))
  rq.end()
})
const afterB = stB.received
const holdB = { listening: mineB.server.listening, port: mineB.server.address()?.port, own: PB }

console.log('배열 B (자기 앱이 응답) : 응답', JSON.stringify(obsB))
console.log('  카운터', beforeB, '->', afterB, '| 증감', afterB - beforeB, '| 보유', JSON.stringify(holdB))

// ---- 배열 C: /bot 업그레이드를 자기 앱에 직접 건다 (H-3 성립 조건 시험, §7-7) ----
const beforeC = stB.received
const obsC = await new Promise(res => {
  const ws = new WebSocket(`ws://127.0.0.1:${PB}/bot`)
  ws.on('unexpected-response', (_rq, rp) => {
    let b = ''
    rp.on('data', d => { b += d })
    rp.on('end', () => res({ status: rp.statusCode, body: b.slice(0, 80) }))
  })
  ws.on('open', () => { ws.close(); res({ status: 101 }) })
  ws.on('error', e => res({ err: e.code || e.message }))
})
const afterC = stB.received
console.log('배열 C (자기 앱 /bot)   : 응답', JSON.stringify(obsC), '| 카운터 증감', afterC - beforeC)

try { wssB.close() } catch {}
await mineB.close()
process.exit(0)
