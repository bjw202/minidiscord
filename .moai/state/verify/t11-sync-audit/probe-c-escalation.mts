// 감사 프로브 C — 권한 상승·릴레이 교란·첨부·백필 재실행·극단 room id
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const dir = mkdtempSync(join(tmpdir(), 'authz-probe-c-'))
process.env.MINIDISCORD_DATA_DIR = dir
const { buildServer } = await import('../../../../server/src/index.js')
const { isRoomMember } = await import('../../../../server/src/room-members.js')
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
const alice = await signUp('alice')
const mallory = await signUp('mallory')
const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'secret' } })).json().id

console.log('=== C1. 극단 room id — 게이트가 던지는가 (P5 생존 변이의 두 번째 후보 입력) ===')
for (const v of [Infinity, -Infinity, NaN, 1e308, Number.MAX_SAFE_INTEGER + 2, -0]) {
  try {
    console.log(`  isRoomMember(db, ${String(v)}, alice) => ${isRoomMember(app.db, v as number, alice.id)}`)
  } catch (e: any) {
    console.log(`  isRoomMember(db, ${String(v)}, alice) => THROWS ${e.constructor.name}: ${e.message}`)
  }
}
for (const s of ['1e999', 'Infinity', '-1', '9007199254740995', '+1', ' 1']) {
  const res = await app.inject({ method: 'GET', url: `/api/rooms/${encodeURIComponent(s)}/messages`, headers: { cookie: alice.cookie } })
  console.log(`  GET id='${s}' (멤버 alice) => ${res.statusCode} ${res.body.slice(0, 70)}`)
}

console.log('')
console.log('=== C2. 자가 승급 시도 — mallory 가 스스로 멤버가 되는 경로가 있는가 ===')
const selfInvite = await app.inject({ method: 'POST', url: `/api/rooms/${room}/members`, headers: { cookie: mallory.cookie }, payload: { user_id: mallory.id } })
console.log(`  비멤버 자가초대: ${selfInvite.statusCode} ${selfInvite.body}`)
const joinRes = await app.inject({ method: 'POST', url: `/api/rooms/${room}/join`, headers: { cookie: mallory.cookie } })
console.log(`  POST .../join : ${joinRes.statusCode} ${joinRes.body.slice(0, 80)}`)
console.log(`  판정 후 멤버?  : ${isRoomMember(app.db, room, mallory.id)}`)

console.log('')
console.log('=== C3. 멤버가 쓰는 사용자 존재 오라클 ===')
const ghostUser = await app.inject({ method: 'POST', url: `/api/rooms/${room}/members`, headers: { cookie: alice.cookie }, payload: { user_id: 987654 } })
console.log(`  없는 사용자 초대 : ${ghostUser.statusCode} ${ghostUser.body}`)
const realUser = await app.inject({ method: 'POST', url: `/api/rooms/${room}/members`, headers: { cookie: alice.cookie }, payload: { user_id: mallory.id } })
console.log(`  있는 사용자 초대 : ${realUser.statusCode} ${realUser.body}`)
const again = await app.inject({ method: 'POST', url: `/api/rooms/${room}/members`, headers: { cookie: alice.cookie }, payload: { user_id: mallory.id } })
console.log(`  재초대(멱등)     : ${again.statusCode} ${again.body}`)

console.log('')
console.log('=== C4. 권한 릴레이 — 비멤버가 대기 판정을 소모하거나 교란할 수 있는가 ===')
const room2 = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'relay' } })).json().id
const carol = await signUp('carol')   // 어느 방에도 속하지 않는다
const broker = app.permissions
const fakeConn: any = { roomId: room2, botId: 1 }
broker.onGatewayRequest(fakeConn, { request_id: 'abcde', tool_name: 'Bash', description: 'd', input_preview: 'p' })
const r1 = broker.tryHandleUserReply(room2, carol.id, 'yes abcde')
console.log(`  비멤버 carol 판정 반환 : ${r1}`)
const r2 = broker.tryHandleUserReply(room2, carol.id, 'no abcde')
console.log(`  비멤버 carol 재시도    : ${r2}`)
const r3 = broker.tryHandleUserReply(room2, alice.id, 'yes ABCDE')
console.log(`  멤버 alice 판정 반환   : ${r3}  (대기 항목이 남아 있었다면 true)`)
const r4 = broker.tryHandleUserReply(room2, alice.id, 'yes abcde')
console.log(`  멤버 alice 재소비      : ${r4}  (이미 소모돼 false 여야 한다)`)
// HTTP 경로에서도 같은가
broker.onGatewayRequest(fakeConn, { request_id: 'fghij', tool_name: 'Bash', description: 'd', input_preview: 'p' })
const httpNon = await app.inject({ method: 'POST', url: `/api/rooms/${room2}/messages`, headers: { cookie: carol.cookie }, payload: 'yes fghij' })
console.log(`  HTTP 비멤버 전송       : ${httpNon.statusCode} ${httpNon.body.slice(0, 60)}`)
const httpMem = await app.inject({ method: 'POST', url: `/api/rooms/${room2}/messages`, headers: { cookie: alice.cookie }, payload: 'yes fghij' })
console.log(`  HTTP 멤버 전송         : ${httpMem.statusCode} ${httpMem.body.slice(0, 80)}`)

console.log('')
console.log('=== C5. 첨부 — 비멤버가 번호로 남의 방 첨부를 받는가 ===')
const boundary = '----probe'
const body = [
  `--${boundary}`, 'Content-Disposition: form-data; name="body"', '', '비밀 파일',
  `--${boundary}`, 'Content-Disposition: form-data; name="file"; filename="secret.txt"', 'Content-Type: text/plain', '', 'TOP SECRET',
  `--${boundary}--`, '',
].join('\r\n')
const sent = await app.inject({
  method: 'POST', url: `/api/rooms/${room2}/messages`, headers: { cookie: alice.cookie, 'content-type': `multipart/form-data; boundary=${boundary}` }, payload: body,
})
const attId = sent.json()?.message?.attachments?.[0]?.id
console.log(`  alice 첨부 전송: ${sent.statusCode}, attachment id = ${attId}`)
if (attId) {
  const dl = await app.inject({ method: 'GET', url: `/api/attachments/${attId}`, headers: { cookie: carol.cookie } })
  console.log(`  비멤버 carol 다운로드: ${dl.statusCode} content-type=${dl.headers['content-type']} body=${JSON.stringify(dl.body).slice(0, 60)}`)
}

console.log('')
console.log('=== C6. 방 목록 — 비멤버에게 남의 방이 보이는가 ===')
const listC = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie: carol.cookie } })
console.log(`  carol 목록: ${listC.statusCode} ${listC.body}`)
const listA = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie: alice.cookie } })
console.log(`  alice 목록: ${listA.statusCode} ${listA.body.slice(0, 200)}`)

await app.close()

console.log('')
console.log('=== C7. 백필 재실행 — 지운 멤버십이 재기동으로 되살아나는가 ===')
const { openDb } = await import('../../../../server/src/db.js')
const dbPath = join(dir, 'minidiscord.db')
const db2 = openDb(dbPath)
const before = db2.prepare('SELECT COUNT(*) c FROM room_members').get() as any
db2.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(room2, alice.id)
const afterDelete = db2.prepare('SELECT COUNT(*) c FROM room_members').get() as any
const marks = db2.prepare('SELECT name FROM schema_migrations').all()
db2.close()
const db3 = openDb(dbPath)
const afterReopen = db3.prepare('SELECT COUNT(*) c FROM room_members').get() as any
const resurrected = !!db3.prepare('SELECT 1 FROM room_members WHERE room_id=? AND user_id=?').get(room2, alice.id)
console.log(`  재개방 전 행수=${before.c} → 삭제 후=${afterDelete.c} → 재개방 후=${afterReopen.c}`)
console.log(`  표식: ${JSON.stringify(marks)}`)
console.log(`  삭제한 멤버십 부활? ${resurrected}`)
// 표식을 지우면 (운영자 실수 시나리오) 어떻게 되는가
db3.prepare('DELETE FROM schema_migrations').run()
db3.close()
const db4 = openDb(dbPath)
const afterMarkerWipe = !!db4.prepare('SELECT 1 FROM room_members WHERE room_id=? AND user_id=?').get(room2, alice.id)
const cnt4 = db4.prepare('SELECT COUNT(*) c FROM room_members').get() as any
console.log(`  표식 삭제 후 재개방: 부활? ${afterMarkerWipe}, 총 행수=${cnt4.c}`)
db4.close()
