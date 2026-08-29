// F-06 재현: MCP 관찰자가 먼저 끊긴 뒤 채팅이 오면 프로세스가 사는가?
import { WebSocketServer } from 'ws'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { wire } from '../src/index.js'
const wss = new WebSocketServer({ port: 0 })
const port = (wss.address() as any).port
let sock: any = null
wss.on('connection', ws => { sock = ws; ws.on('message', d => {
  if (JSON.parse(String(d)).type === 'hello') ws.send(JSON.stringify({ type: 'welcome', room_id: 1, bot_id: 2, bot_name: 'pm' }))
}) })
const { channel, gw } = wire({ url: `ws://127.0.0.1:${port}/bot`, token: 'tok' })
gw.start()
const c = new Client({ name: 'p', version: '0' })
const [a, b] = InMemoryTransport.createLinkedPair()
await Promise.all([c.connect(a), channel.server.connect(b)])
await new Promise(r => setTimeout(r, 300))
await c.close()                                  // Claude Code 세션 단절
await new Promise(r => setTimeout(r, 100))
sock.send(JSON.stringify({ type: 'message', id: 1, body: 'hi', author_name: 'a', delivery: 'to' }))
setTimeout(() => { console.log('P5_SURVIVED'); process.exit(0) }, 800)
// 관측: Error: Not connected 로 exit 1
