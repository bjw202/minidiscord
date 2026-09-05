// t38 도달성 탐침 — meta.sender 신원 충돌의 각 갈래가 실제로 도달 가능한가.
// 포트를 열지 않는다 (app.inject 만 쓴다). 배경 프로세스 스폰 없음.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { openDb } from '../../../server/src/db.js'
import { registerAuthRoutes } from '../../../server/src/auth.js'
import { registerRoomRoutes } from '../../../server/src/routes-rooms.js'
import { registerBotRoutes } from '../../../server/src/routes-bots.js'

const ZWSP = String.fromCharCode(0x200b)
const CTRL = String.fromCharCode(0x01)

const dir = mkdtempSync(join(tmpdir(), 't38-'))
const db = openDb(join(dir, 'probe.db'))
const app: any = Fastify()
app.db = db
await app.register(cookie)
registerAuthRoutes(app, db)
registerRoomRoutes(app)
registerBotRoutes(app)

const ck = (r: any) => { const h = r.headers['set-cookie'] ?? ''; return (Array.isArray(h) ? h[0] : h).split(';')[0] }
const reg = (u: string) => app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: u, password: 'pw123456' } })
const login = async (u: string) => ck(await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: u, password: 'pw123456' } }))
const mkbot = (c: string, name: string) => app.inject({ method: 'POST', url: '/api/bots', headers: { cookie: c }, payload: { name } })
const line = (k: string, v: unknown) => console.log(k + ': ' + v)

// 배경: 피해자 alice 가 이미 가입해 있고, 공격자 mallory 도 계정을 가진다.
line('A1 alice 가입', (await reg('alice')).statusCode)
line('A2 alice 재가입(같은 이름)', (await reg('alice')).statusCode)
line('A3 mallory 가입', (await reg('mallory')).statusCode)
const mc = await login('mallory')

// 갈래 1 — 봇이 실제 사용자의 이름을 가진다 (테이블이 달라 UNIQUE 가 안 걸린다)
const b1 = await mkbot(mc, 'alice')
line('B1 봇 이름 alice(실제 사용자와 동일)', b1.statusCode + ' ' + JSON.stringify(b1.json()))

// 갈래 2 — 봇이 시스템 발신자 이름을 가진다
const b2 = await mkbot(mc, '시스템')
line('B2 봇 이름 시스템(권한 이벤트 발신자)', b2.statusCode + ' ' + JSON.stringify(b2.json()))

// 갈래 3 — 봇 이름에 길이 상한이 있는가 (username 은 32자)
const b3 = await mkbot(mc, 'x'.repeat(10000))
line('B3 봇 이름 10000자', b3.statusCode + ' len=' + (b3.statusCode === 201 ? b3.json().name.length : '-'))

// 갈래 4 — 봇 이름에 제로폭/제어문자를 넣을 수 있는가 (username 은 금지)
const b4 = await mkbot(mc, 'alice' + ZWSP)
line('B4 봇 이름 alice+제로폭', b4.statusCode + ' codepoints=' + (b4.statusCode === 201 ? [...b4.json().name].map((c: string) => c.codePointAt(0)!.toString(16)).join(',') : '-'))

const b5 = await mkbot(mc, 'bo' + CTRL + 'b')
line('B5 봇 이름 제어문자 U+0001 포함', b5.statusCode + ' codepoints=' + (b5.statusCode === 201 ? [...b5.json().name].map((c: string) => c.codePointAt(0)!.toString(16)).join(',') : '-'))

// 대조군 — 사용자 이름 쪽에는 그 제한이 실제로 있는가
line('C1 username 33자 가입', (await reg('y'.repeat(33))).statusCode)
line('C2 username 제어문자 가입', (await reg('bo' + CTRL + 'b')).statusCode)

// 대조군 — 봇 이름공간 «안»에서는 유일성이 사는가
line('C3 봇 이름 alice 재생성', (await mkbot(mc, 'alice')).statusCode)

await app.close(); db.close(); rmSync(dir, { recursive: true, force: true })
