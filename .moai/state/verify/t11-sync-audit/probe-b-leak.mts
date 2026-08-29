// 감사 프로브 B — 방 실재 누출: 비멤버 응답과 없는 방 응답의 바이트 대조 (프로덕션 조립 buildServer)
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const dir = mkdtempSync(join(tmpdir(), 'authz-probe-b-'))
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

const alice = await signUp('alice')
const mallory = await signUp('mallory')

// alice 가 방을 만든다 (mallory 는 비멤버). 백필은 사용자 0명 시점에 이미 돌았으므로 영향 없다
const made = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'secret' } })
const roomId = made.json().id
const GHOST = 999999

const gated: [string, string][] = [
  ['GET', '/api/rooms/{}/messages'],
  ['POST', '/api/rooms/{}/messages'],
  ['GET', '/api/rooms/{}/events'],
  ['POST', '/api/rooms/{}/members'],
  ['POST', '/api/rooms/{}/invites'],
  ['GET', '/api/rooms/{}/invites'],
  ['DELETE', '/api/rooms/{}/invites/1'],
  ['POST', '/api/rooms/{}/archive'],
  ['HEAD', '/api/rooms/{}/messages'],
  ['HEAD', '/api/rooms/{}/invites'],
]

function norm(res: any) {
  const h: Record<string, string> = {}
  for (const [k, v] of Object.entries(res.headers)) {
    if (k === 'date' || k === 'content-length') continue
    h[k] = String(v)
  }
  return JSON.stringify({ status: res.statusCode, body: res.body, headers: h })
}

console.log('=== B1. 비멤버(mallory) vs 없는 방 — 바이트 대조 ===')
for (const [method, tpl] of gated) {
  const opts: any = { method, headers: { cookie: mallory.cookie } }
  if (method === 'POST') { opts.payload = { user_id: alice.id, bot_id: 1 } }
  const nonMember = await app.inject({ ...opts, url: tpl.replace('{}', String(roomId)) })
  const ghost = await app.inject({ ...opts, url: tpl.replace('{}', String(GHOST)) })
  const same = norm(nonMember) === norm(ghost)
  console.log(`${same ? 'SAME  ' : 'DIFF!!'} ${method} ${tpl}`)
  console.log(`   nonmember: ${nonMember.statusCode} ${JSON.stringify(nonMember.body).slice(0, 120)}`)
  console.log(`   ghost    : ${ghost.statusCode} ${JSON.stringify(ghost.body).slice(0, 120)}`)
  if (!same) {
    console.log(`   NM_HEADERS: ${JSON.stringify(nonMember.headers)}`)
    console.log(`   GH_HEADERS: ${JSON.stringify(ghost.headers)}`)
  }
}

console.log('')
console.log('=== B2. archive 실재 오라클 (같은 mallory 로 세 갈래) ===')
const r2 = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'victim' } })
const victim = r2.json().id
const a1 = await app.inject({ method: 'POST', url: `/api/rooms/${victim}/archive`, headers: { cookie: mallory.cookie } })
console.log(`archive 있는-활성 방 : ${a1.statusCode} ${a1.body}`)
const a2 = await app.inject({ method: 'POST', url: `/api/rooms/${victim}/archive`, headers: { cookie: mallory.cookie } })
console.log(`archive 이미-보관 방 : ${a2.statusCode} ${a2.body}`)
const a3 = await app.inject({ method: 'POST', url: `/api/rooms/${GHOST}/archive`, headers: { cookie: mallory.cookie } })
console.log(`archive 없는 방      : ${a3.statusCode} ${a3.body}`)
const st = app.db.prepare('SELECT status FROM rooms WHERE id = ?').get(victim) as any
console.log(`파괴적 효과 확인      : rooms.status = ${st.status} (비멤버가 남의 방을 보관했다)`)

console.log('')
console.log('=== B3. 정수 아닌 room id — 게이트 응답 ===')
for (const bad of ['abc', '1abc', '1.5', '', '%20', '0x1']) {
  const res = await app.inject({ method: 'GET', url: `/api/rooms/${bad}/messages`, headers: { cookie: mallory.cookie } })
  const resA = await app.inject({ method: 'GET', url: `/api/rooms/${bad}/messages`, headers: { cookie: alice.cookie } })
  console.log(`id='${bad}' 비멤버=${res.statusCode} ${res.body.slice(0, 60)} | 멤버=${resA.statusCode}`)
}

console.log('')
console.log('=== B4. isRoomMember 에 NaN 을 직접 넘기면? (P5 생존 변이의 관측 가능성) ===')
const { isRoomMember } = await import('../../../../server/src/room-members.js')
try {
  const out = isRoomMember(app.db, NaN, alice.id)
  console.log(`isRoomMember(db, NaN, alice) => ${out} (예외 없음)`)
} catch (e: any) {
  console.log(`isRoomMember(db, NaN, alice) => THROWS: ${e.constructor.name}: ${e.message}`)
}
try {
  const out = isRoomMember(app.db, 1.5, alice.id)
  console.log(`isRoomMember(db, 1.5, alice) => ${out}`)
} catch (e: any) {
  console.log(`isRoomMember(db, 1.5, alice) => THROWS: ${e.constructor.name}: ${e.message}`)
}

await app.close()
