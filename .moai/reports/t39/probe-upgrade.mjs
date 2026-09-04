// 탐침(커밋하지 않음): upgrade 리스너가 없는 http 서버에 WebSocket 업그레이드 요청을 보내면 무엇이 오는가.
import http from 'node:http'
import net from 'node:net'

const srv = http.createServer((req, res) => { res.statusCode = 404; res.end('plain-404') })
await new Promise(r => srv.listen(0, '127.0.0.1', r))
const port = srv.address().port
console.log('upgrade 리스너 수 =', srv.listenerCount('upgrade'))

const sock = net.connect(port, '127.0.0.1')
let buf = ''
sock.on('data', d => { buf += d })
sock.on('error', e => console.log('소켓 오류:', e.code))
sock.on('close', () => {
  console.log('--- 받은 응답 ---')
  console.log(buf ? buf.split('\r\n').slice(0, 4).join(' | ') : '(응답 없음 - 연결만 끊김)')
  try { srv.close() } catch {}
})
sock.on('connect', () => {
  sock.write('GET /bot HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n')
})
setTimeout(() => { try { sock.destroy() } catch {}; try { srv.close() } catch {} }, 2000)
