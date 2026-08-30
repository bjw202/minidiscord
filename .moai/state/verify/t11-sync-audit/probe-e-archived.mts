// 감사 프로브 E — 보관된 방에서도 비멤버 응답이 없는 방 응답과 같은가 (REQ-013 순서 계약)
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const dir = mkdtempSync(join(tmpdir(), 'authz-probe-e-'))
process.env.MINIDISCORD_DATA_DIR = dir
const { buildServer } = await import('../../../../server/src/index.js')
const app: any = await buildServer()
await app.ready()
function ck(r: any) { const h = r.headers['set-cookie'] ?? ''; return (Array.isArray(h) ? h[0] : h).split(';')[0] }
async function signUp(n: string) {
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: n, password: 'pw123456' } })
  const l = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: n, password: 'pw123456' } })
  return { id: (app.db.prepare('SELECT id FROM users WHERE username = ?').get(n) as any).id, cookie: ck(l) }
}
const alice = await signUp('alice')
const mallory = await signUp('mallory')
const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie: alice.cookie }, payload: { name: 'arch' } })).json().id
await app.inject({ method: 'POST', url: `/api/rooms/${room}/archive`, headers: { cookie: alice.cookie } })
console.log(`방 ${room} 보관 완료: ${(app.db.prepare('SELECT status FROM rooms WHERE id=?').get(room) as any).status}`)
const G = 999999
const cases: [string, string, any][] = [
  ['POST', '/api/rooms/{}/messages', null],
  ['GET', '/api/rooms/{}/messages', null],

  ['POST', '/api/rooms/{}/members', { user_id: alice.id }],
  ['POST', '/api/rooms/{}/invites', { bot_id: 1 }],
  ['GET', '/api/rooms/{}/invites', null],
  ['DELETE', '/api/rooms/{}/invites/1', null],
]
for (const [m, tpl, payload] of cases) {
  const o: any = { method: m, headers: { cookie: mallory.cookie } }
  if (payload) o.payload = payload
  const nm = await app.inject({ ...o, url: tpl.replace('{}', String(room)) })
  const gh = await app.inject({ ...o, url: tpl.replace('{}', String(G)) })
  const mem: any = { method: m, headers: { cookie: alice.cookie } }
  if (payload) mem.payload = payload
  const mb = await app.inject({ ...mem, url: tpl.replace('{}', String(room)) })
  const same = nm.statusCode === gh.statusCode && nm.body === gh.body
  console.log(`${same ? 'SAME  ' : 'DIFF!!'} ${m} ${tpl}  비멤버=${nm.statusCode} 없는방=${gh.statusCode} | 멤버(보관방)=${mb.statusCode} ${mb.body.slice(0, 50)}`)
}
await app.close()
