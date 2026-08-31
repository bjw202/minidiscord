// 감사 프로브 D — HTTP 경로의 릴레이 교란(멀티파트 정식 전송), SSE 구독, 보관의 파급
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join as pjoin } from 'node:path'
const dir = mkdtempSync(pjoin(tmpdir(), 'authz-probe-d-'))
process.env.MINIDISCORD_DATA_DIR = dir
const { buildServer } = await import('../../../../server/src/index.js')
const app: any = await buildServer()
await app.ready()

function ck(res: any): string {
  const h = res.headers['set-cookie'] ?? ''
  return (Array.isArray(h) ? h[0] : h).split(';')[0]
}
async function signUp(name: string) {
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: name, password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: name, password: 'pw123456' } })
  const id = (app.db.prepare('SELECT id FROM users WHERE username = ?').get(name) as any).id
  return { id, cookie: ck(login) }
}
const B = '----probe'
function mp(text: string) {
  return {
    headers: { 'content-type': `multipart/form-data; boundary=${B}` },
    payload: [`--${B}`, 'Content-Disposition: form-data; name="body"', '', text, `--${B}--`, ''].join('\r\n'),
  }
}
const alice = await signUp('alice')
const carol = await signUp('carol')
const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'relay' } })).json().id

console.log('=== D1. HTTP 경로 릴레이 교란 (정식 multipart) ===')
app.permissions.onGatewayRequest({ roomId: room, botId: 1 } as any, { request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' })
const f = mp('yes fghij')
const nonMember = await app.inject({ method: 'POST', url: `/api/rooms/${room}/messages`, headers: { cookie: carol.cookie, ...f.headers }, payload: f.payload })
console.log(`  비멤버 carol : ${nonMember.statusCode} ${nonMember.body}`)
const member = await app.inject({ method: 'POST', url: `/api/rooms/${room}/messages`, headers: { cookie: alice.cookie, ...f.headers }, payload: f.payload })
console.log(`  멤버 alice   : ${member.statusCode} ${member.body.slice(0, 80)}`)
const msgs = app.db.prepare('SELECT id, author_type, substr(body,1,40) b FROM messages WHERE room_id=?').all(room)
console.log(`  방 메시지    : ${JSON.stringify(msgs)}`)

console.log('')
console.log('=== D2. SSE — 비멤버 요청이 구독을 남기는가 ===')
console.log(`  구독 전 subscriberCount=${app.hub.subscriberCount(room)}`)
const sse = await app.inject({ method: 'GET', url: `/api/rooms/${room}/events`, headers: { cookie: carol.cookie } })
console.log(`  비멤버 SSE: ${sse.statusCode} ${sse.body.slice(0, 60)}`)
console.log(`  요청 후 subscriberCount=${app.hub.subscriberCount(room)}`)

console.log('')
console.log('=== D3. 보관의 파급 — 비멤버가 남의 방을 얼려 버릴 수 있는가 ===')
const tokenRowsBefore = app.db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room) as any
await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: alice.cookie }, payload: { name: 'helper' } })
const botId = (app.db.prepare("SELECT id FROM bots WHERE name='helper'").get() as any).id
await app.inject({ method: 'POST', url: `/api/rooms/${room}/invites`, headers: { cookie: alice.cookie }, payload: { bot_id: botId } })
const live = app.db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room) as any
console.log(`  보관 전 활성 봇 토큰: ${tokenRowsBefore.c} → 초대 후 ${live.c}`)
const arch = await app.inject({ method: 'POST', url: `/api/rooms/${room}/archive`, headers: { cookie: carol.cookie } })
console.log(`  비멤버 carol 보관 : ${arch.statusCode} ${arch.body}`)
const after = app.db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room) as any
console.log(`  보관 후 활성 토큰 : ${after.c}`)
const post = await app.inject({ method: 'POST', url: `/api/rooms/${room}/messages`, headers: { cookie: alice.cookie, ...mp('안녕').headers }, payload: mp('안녕').payload })
console.log(`  멤버 alice 이후 전송: ${post.statusCode} ${post.body}`)
const inviteAfter = await app.inject({ method: 'POST', url: `/api/rooms/${room}/invites`, headers: { cookie: alice.cookie }, payload: { bot_id: botId } })
console.log(`  멤버 alice 이후 초대: ${inviteAfter.statusCode} ${inviteAfter.body.slice(0, 60)}`)

await app.close()
