// scripts/e2e.mts — 종단 간 시나리오 러너, v2 봇 모델 (리팩토링 C2 단계에서 다시 씀).
//
// 서버는 실제 프로세스로 spawn 하고, 이 스크립트는 HTTP 와 WebSocket 전선으로만 말을 건다 —
// server/src/** 를 import 하지 않는다. 프레임은 전부 맨몸 JSON 이다: hello{token} → welcome{bot_id, bot_name, rooms},
// 그 뒤 모든 프레임이 room_id 를 싣는다. 봉투·순번·핸드셰이크는 없다 (SPEC-BOTMODEL-001).
//
// 시나리오는 «봇 하나 · 방 둘» 이다. 접속은 봇 단위라 소켓 하나가 두 방을 맡고, 어느 방의 일인지는 프레임의 room_id 가
// 가른다 — 열다섯 단계가 그 경계(저장·전달·이력·재전송·보관)가 방마다 따로 서는지를 잰다.
//
//  ① 이름 로그인            ② 방 둘 생성                ③ 봇 등록(토큰은 이 응답에 한 번)
//  ④ 두 방 참여             ⑤ hello → welcome{rooms 둘}  ⑥ 모르는 토큰 → 프레임 없이 닫힘
//  ⑦ R1 @TO → R1 프레임     ⑧ 봇 답변+첨부 → R2 에만     ⑨ 첨부 내려받기(바이트 동일)
//  ⑩ 멘션 없는 글           ⑪ 방별 이력(전체·since_id)    ⑫ 권한 릴레이(room_id → yes → verdict)
//  ⑬ 오프라인 재전송(방마다) ⑭ 서버 재시작 영속성          ⑮ R1 보관 → 접속 유지·welcome 에서 빠짐·전송 409
//
// 진행 표지 [n/15] 는 그 단계의 단언이 전부 성공한 뒤에만 찍는다 — step 참고.

import { type ChildProcess } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// 조작과 상수는 둘째 러너와 나눠 쓴다 — 정의는 e2e-lib.mts 로 옮겼고 여기서는 import 만 한다.
// 열다섯 단계 본문과 표지 문자열은 그대로다(plan.md §B.6).
import {
  E2eError, EXIT_FAILED, FRAME_TIMEOUT_MS, WS,
  acquirePort, api, assert, checkDependencies, closeWs, connect, expectQuiet,
  listMessages, messageForm, nextFrame, pollUntil, spawnServer, stopServer, waitForBoot,
} from './e2e-lib.mts'

export { checkDependencies, acquirePort, spawnServer, waitForBoot, stopServer, api }

// [HARD] step(n) 은 그 단계의 모든 단언이 "성공한 뒤에"만 호출한다. 단언 앞에 부르면 단계가 실패해도 표지 열이
// 온전해져 순서 증거가 거짓이 된다. 건너뜀·중복·역순 호출은 조용히 통과시키지 않고 곧장 실패로 끝낸다.
let stepsPassed = 0
export function step(n: number): void {
  if (n !== stepsPassed + 1) throw new E2eError(EXIT_FAILED)
  stepsPassed = n
  console.log(`[${n}/15]`)
}

/** 정리 — 정상·단언 실패·예외 세 경로 전부에서 finally 로 호출된다. 서버를 먼저 거두고 임시 디렉터리를 지운다. */
async function cleanup(child: ChildProcess | null, dataDir: string | null): Promise<void> {
  if (child) await stopServer(child)
  if (dataDir) rmSync(dataDir, { recursive: true, force: true })
}

/** 열다섯 단계 본체. 각 단계: 단언 전부 → step(n). 실패는 곧 exit 1.
 *  URL·페이로드는 server/src/routes-*.ts 와 gateway.ts 의 실제 형태를 따른다(추측 없음). */
async function runScenarios(port: number, dataDir: string, botFilesDir: string, proc: { child: ChildProcess | null }): Promise<void> {
  const USER = { username: 'e2e-user' }
  const BOT_NAME = 'E2E-Bot'

  // ① 이름 로그인 — md_session 쿠키를 받는다 (가입 없음)
  const login = await api(port, 'POST', '/api/auth/login', { json: USER })
  assert(login.status === 200, 'step1 ① 로그인이 200 이 아니다')
  const cookie = (login.res.headers.getSetCookie?.() ?? [])
    .map(c => c.split(';')[0])
    .find(c => c.startsWith('md_session='))
  assert(cookie, 'step1 ① 로그인 응답에 md_session 쿠키가 없다')
  step(1)

  // ② 방 둘 생성
  const r1 = await api(port, 'POST', '/api/rooms', { cookie, json: { name: 'e2e-room-1' } })
  const r2 = await api(port, 'POST', '/api/rooms', { cookie, json: { name: 'e2e-room-2' } })
  assert(r1.status === 201 && r1.body?.status === 'active' && r2.status === 201 && r2.body?.status === 'active', 'step2 ② 방 생성 응답이 201·active 가 아니다')
  const R1 = r1.body.id as number, R2 = r2.body.id as number
  assert(R1 !== R2, 'step2 ② 두 방의 번호가 같다')
  step(2)

  // ③ 봇 등록 — 평문 토큰은 이 응답에 한 번만 실린다 (64자 hex). 목록 응답에는 토큰이 없다
  const bot = await api(port, 'POST', '/api/bots', { cookie, json: { name: BOT_NAME, description: 'e2e scenario bot', role: 'orchestrator' } })
  assert(bot.status === 201 && typeof bot.body?.id === 'number' && /^[0-9a-f]{64}$/.test(bot.body?.token ?? ''), 'step3 ③ 봇 등록 응답의 토큰이 64자 hex 가 아니다')
  assert(typeof bot.body.command === 'string' && bot.body.command.includes(`"MINIDISCORD_TOKEN": "${bot.body.token}"`), 'step3 ③ 등록 안내문(.mcp.json)이 토큰을 담지 않는다')
  const botId = bot.body.id as number
  const token = bot.body.token as string
  const bots = await api(port, 'GET', '/api/bots', { cookie })
  assert(bots.status === 200 && !JSON.stringify(bots.body).includes(token), 'step3 ③ 봇 목록 응답에 토큰이 실렸다')
  step(3)

  // ④ 두 방 참여 — 참여 = room_bots 행. 접속 전이라 online 은 false
  const j1 = await api(port, 'POST', `/api/rooms/${R1}/bots`, { cookie, json: { bot_id: botId } })
  const j2 = await api(port, 'POST', `/api/rooms/${R2}/bots`, { cookie, json: { bot_id: botId } })
  assert(j1.status === 201 && j2.status === 201, 'step4 ④ 참여 추가가 201 이 아니다')
  const before = await api(port, 'GET', `/api/rooms/${R1}/bots`, { cookie })
  assert(before.status === 200 && before.body?.[0]?.bot_id === botId && before.body[0].online === false, 'step4 ④ 접속 전 참여 목록의 online 이 false 가 아니다')
  step(4)

  // ⑤ hello → welcome — rooms 는 참여한 활성 방 둘. 접속 뒤 두 방의 참여 목록이 online:true
  const conn = await connect(port, token, 'step5 ⑤ 접속')
  assert(conn.welcome.bot_id === botId && conn.welcome.bot_name === BOT_NAME, 'step5 ⑤ welcome 의 bot 이 다르다')
  const roomIds = (conn.welcome.rooms ?? []).map((r: any) => r.room_id).sort((a: number, b: number) => a - b)
  assert(JSON.stringify(roomIds) === JSON.stringify([R1, R2].sort((a, b) => a - b)), 'step5 ⑤ welcome 의 rooms 가 참여한 두 방이 아니다')
  const during = await api(port, 'GET', `/api/rooms/${R2}/bots`, { cookie })
  assert(during.body?.[0]?.online === true, 'step5 ⑤ 접속 뒤 참여 목록의 online 이 true 가 아니다')
  step(5)

  // ⑥ 모르는 토큰 — 어떤 프레임도 답하지 않고 닫는다
  let strangerFrames = 0
  const stranger = new WS(`ws://127.0.0.1:${port}/bot`)
  stranger.on('message', () => { strangerFrames++ })
  stranger.on('error', () => { /* 닫힘으로 귀결된다 */ })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { console.error('[fail] step6 ⑥ 모르는 토큰 소켓이 시한 안에 닫히지 않았다'); reject(new E2eError(EXIT_FAILED)) }, FRAME_TIMEOUT_MS)
    stranger.on('open', () => stranger.send(JSON.stringify({ type: 'hello', token: 'f'.repeat(64) })))
    stranger.on('close', () => { clearTimeout(timer); resolve() })
  })
  assert(strangerFrames === 0, 'step6 ⑥ 모르는 토큰 소켓이 닫히기 전에 프레임을 받았다')
  step(6)

  // ⑦ R1 에서 @TO → 프레임의 room_id 가 R1, delivery 'to'. R2 목록에는 없다
  const body7 = `@TO(${BOT_NAME}) e2e 라우팅 점검`
  const sent7 = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm(body7) })
  assert(sent7.status === 200 && typeof sent7.body?.message?.id === 'number', 'step7 ⑦ 멘션 메시지 저장이 200 이 아니다')
  const msg7id = sent7.body.message.id as number
  const frame7 = await nextFrame(conn.ws, 'step7 ⑦ @TO 전달 프레임', m => m.type === 'message')
  assert(frame7.room_id === R1 && frame7.id === msg7id && frame7.delivery === 'to' && frame7.body === body7 && frame7.author_name === USER.username,
    'step7 ⑦ 전달 프레임이 저장된 메시지·방과 다르다')
  assert(!(await listMessages(port, cookie, R2)).some(m => m.id === msg7id), 'step7 ⑦ R1 의 메시지가 R2 목록에 보인다')
  step(7)

  // ⑧ 봇 답변 + 첨부 — room_id 는 R2. 봇 파일은 주입한 botFilesDir 안에 만들어 local_path 로 건넨다
  const botFile = path.join(botFilesDir, 'e2e-answer.txt')
  const botFileBytes = Buffer.from('e2e attachment payload — step8 ⑧ 봇 첨부')
  writeFileSync(botFile, botFileBytes)
  conn.ws.send(JSON.stringify({ type: 'bot_message', room_id: R2, body: 'E2E-Bot 답변입니다', files: [{ local_path: botFile, name: 'e2e-answer.txt' }] }))
  const botMsg = await pollUntil('step8 ⑧ 봇 메시지가 R2 목록에 저장되지 않았다', async () =>
    (await listMessages(port, cookie, R2)).find((m: any) => m.author_type === 'bot' && m.body === 'E2E-Bot 답변입니다') ?? null)
  assert(Array.isArray(botMsg.attachments) && botMsg.attachments.length === 1 && typeof botMsg.attachments[0]?.id === 'number', 'step8 ⑧ 봇 첨부가 기록되지 않았다')
  assert(!(await listMessages(port, cookie, R1)).some(m => m.id === botMsg.id), 'step8 ⑧ R2 의 봇 글이 R1 목록에 보인다')
  const botMsgId = botMsg.id as number
  const attId = botMsg.attachments[0].id as number
  step(8)

  // ⑨ 첨부 내려받기 — 바이트 동일성
  const dl = await fetch(`http://127.0.0.1:${port}/api/attachments/${attId}`, { headers: { cookie } })
  assert(dl.status === 200, 'step9 ⑨ 첨부 내려받기가 200 이 아니다')
  assert(Buffer.compare(Buffer.from(await dl.arrayBuffer()), botFileBytes) === 0, 'step9 ⑨ 내려받은 바이트가 봇이 올린 원본과 다르다')
  step(9)

  // ⑩ 멘션 없는 메시지 — 타깃 행이 생기지 않는 일반 전송. 봇 소켓에는 아무것도 오지 않는다
  const body10 = '멘션 없는 보통 메시지'
  const sent10 = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm(body10) })
  assert(sent10.status === 200 && sent10.body?.message?.author_type === 'user' && sent10.body?.message?.body === body10
    && Array.isArray(sent10.body?.message?.attachments) && sent10.body.message.attachments.length === 0, 'step10 ⑩ 멘션 없는 메시지의 저장 형태가 기대와 다르다')
  const msg10id = sent10.body.message.id as number
  await expectQuiet(conn.ws, 'step10 ⑩ 멘션 없는 글이 봇 소켓에 왔다')
  step(10)

  // ⑪ 방별 이력 — R1 전체는 ⑦·⑩ 둘, since_id 로 ⑦ 이후만, R2 는 봇 글 하나. 응답의 room_id·rid 가 요청과 같다
  conn.ws.send(JSON.stringify({ type: 'history_request', room_id: R1, rid: 'e2e-h1', limit: 100 }))
  const h1 = await nextFrame(conn.ws, 'step11 ⑪ history_response(R1 전체)', m => m.type === 'history_response' && m.rid === 'e2e-h1')
  assert(h1.room_id === R1 && Array.isArray(h1.messages) && h1.messages.length === 2
    && [msg7id, msg10id].every(id => h1.messages.some((m: any) => m.id === id)), 'step11 ⑪ R1 전체 이력이 ⑦·⑩ 둘이 아니다')
  conn.ws.send(JSON.stringify({ type: 'history_request', room_id: R1, rid: 'e2e-h2', limit: 100, since_id: msg7id }))
  const h2 = await nextFrame(conn.ws, 'step11 ⑪ history_response(since_id)', m => m.type === 'history_response' && m.rid === 'e2e-h2')
  assert(h2.messages.length === 1 && h2.messages[0].id === msg10id, 'step11 ⑪ since_id 이력이 ⑩ 하나가 아니다')
  conn.ws.send(JSON.stringify({ type: 'history_request', room_id: R2, rid: 'e2e-h3', limit: 100 }))
  const h3 = await nextFrame(conn.ws, 'step11 ⑪ history_response(R2)', m => m.type === 'history_response' && m.rid === 'e2e-h3')
  assert(h3.room_id === R2 && h3.messages.length === 1 && h3.messages[0].id === botMsgId && h3.messages[0].author_name === BOT_NAME, 'step11 ⑪ R2 이력이 봇 글 하나가 아니다')
  step(11)

  // ⑫ 권한 릴레이 — 봇 요청(room_id R1, request_id 5자 [a-km-z]) → 사람이 R1 에 "yes <id>" → 판정이 요청한 접속으로
  conn.ws.send(JSON.stringify({ type: 'permission_request', room_id: R1, request_id: 'abcde', tool_name: 'write_file', description: 'e2e 권한 릴레이 점검', input_preview: '{"path":"e2e.txt"}' }))
  await pollUntil('step12 ⑫ 권한 요청 system 메시지가 R1 에 오지 않았다', async () =>
    (await listMessages(port, cookie, R1)).find((m: any) => m.author_type === 'system' && String(m.body).includes('abcde')) ?? null)
  const reply = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('yes abcde') })
  assert(reply.status === 200 && reply.body?.consumed_by === 'permission', 'step12 ⑫ yes 답이 권한 소비로 처리되지 않았다')
  const verdict = await nextFrame(conn.ws, 'step12 ⑫ permission_verdict', m => m.type === 'permission_verdict' && m.request_id === 'abcde')
  assert(verdict.behavior === 'allow', 'step12 ⑫ 판정이 allow 가 아니다')
  step(12)

  // ⑬ 오프라인 재전송 — 소켓을 닫고 두 방에 @TO 를 하나씩 흘려보낸다. 재접속하면 welcome 뒤에 두 프레임이
  // id 오름차순으로, 각각 자기 room_id 를 싣고 온다. 다시 접속하면 커서가 올라가 있어 아무것도 오지 않는다
  await closeWs(conn.ws, 'step13 ⑬ 본 소켓 닫기')
  const missed1 = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm(`@TO(${BOT_NAME}) 자리 비운 사이 R1`) })
  const missed2 = await api(port, 'POST', `/api/rooms/${R2}/messages`, { cookie, form: messageForm(`@TO(${BOT_NAME}) 자리 비운 사이 R2`) })
  assert(missed1.status === 200 && missed2.status === 200, 'step13 ⑬ 오프라인 메시지 저장이 200 이 아니다')
  const m1 = missed1.body.message.id as number, m2 = missed2.body.message.id as number
  const re1 = await connect(port, token, 'step13 ⑬ 재접속 1')
  const rp1 = await nextFrame(re1.ws, 'step13 ⑬ 재전송 프레임 1', m => m.type === 'message')
  const rp2 = await nextFrame(re1.ws, 'step13 ⑬ 재전송 프레임 2', m => m.type === 'message')
  assert(rp1.id === m1 && rp1.room_id === R1 && rp1.delivery === 'to', 'step13 ⑬ 첫 재전송 프레임이 R1 의 것이 아니다')
  assert(rp2.id === m2 && rp2.room_id === R2 && rp2.delivery === 'to', 'step13 ⑬ 둘째 재전송 프레임이 R2 의 것이 아니다')
  await expectQuiet(re1.ws, 'step13 ⑬ 재전송이 둘을 넘겼다')
  await closeWs(re1.ws, 'step13 ⑬ 재접속 1 닫기')
  const re2 = await connect(port, token, 'step13 ⑬ 재접속 2')
  await expectQuiet(re2.ws, 'step13 ⑬ 커서가 오르지 않아 같은 메시지가 다시 왔다')
  await closeWs(re2.ws, 'step13 ⑬ 재접속 2 닫기')
  step(13)

  // ⑭ 서버 재시작 영속성 — 같은 데이터 디렉터리로 재기동. 세션 쿠키·메시지·첨부 바이트·봇 토큰·참여(welcome rooms)가 그대로
  const second = await acquirePort()
  await stopServer(proc.child!)
  proc.child = spawnServer(second.forServer, dataDir, botFilesDir)
  await waitForBoot(proc.child, second.forProbe)
  const port2 = second.forProbe
  const found14 = (await listMessages(port2, cookie, R1)).find((m: any) => m.id === m1)
  assert(found14 && found14.body === `@TO(${BOT_NAME}) 자리 비운 사이 R1`, 'step14 ⑭ 재시작 후 메시지 id·본문이 동일하지 않다 (세션 쿠키도 살아 있어야 한다)')
  const dl14 = await fetch(`http://127.0.0.1:${port2}/api/attachments/${attId}`, { headers: { cookie } })
  assert(dl14.status === 200 && Buffer.compare(Buffer.from(await dl14.arrayBuffer()), botFileBytes) === 0, 'step14 ⑭ 재시작 후 첨부 바이트가 동일하지 않다')
  const conn3 = await connect(port2, token, 'step14 ⑭ 재시작 후 재접속')
  const rooms3 = (conn3.welcome.rooms ?? []).map((r: any) => r.room_id).sort((a: number, b: number) => a - b)
  assert(JSON.stringify(rooms3) === JSON.stringify([R1, R2].sort((a, b) => a - b)), 'step14 ⑭ 재시작 후 welcome 의 rooms 가 다르다')
  await expectQuiet(conn3.ws, 'step14 ⑭ 재시작 후 이미 배달한 메시지가 다시 왔다 — 커서가 DB 에 남지 않았다')
  step(14)

  // ⑮ R1 보관 — 접속은 봇 단위라 소켓은 열린 채다. 다음 welcome 의 rooms 에서 R1 이 빠지고, R1 전송은 409, R2 는 그대로 통한다
  const arch = await api(port2, 'POST', `/api/rooms/${R1}/archive`, { cookie })
  assert(arch.status === 200, 'step15 ⑮ 방 보관이 200 이 아니다')
  await expectQuiet(conn3.ws, 'step15 ⑮ 보관이 봇 소켓에 프레임을 냈다')
  assert(conn3.ws.readyState === WS.OPEN, 'step15 ⑮ 보관이 봇 접속을 끊었다 — v2 에서 접속은 방과 무관하다')
  const blocked = await api(port2, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('보관된 방') })
  assert(blocked.status === 409, 'step15 ⑮ 보관된 방 전송이 409 가 아니다')
  // t43 — 봇 글도 막힌다: 보관된 R1 에 보낸 bot_message 는 행을 남기지 않고 소켓도 유지된다 (조용히 버림)
  const r1Before = await api(port2, 'GET', `/api/rooms/${R1}/messages`, { cookie })
  conn3.ws.send(JSON.stringify({ type: 'bot_message', room_id: R1, body: '보관 뒤 봇 글' }))
  await expectQuiet(conn3.ws, 'step15 ⑮ 보관된 방의 bot_message 가 봇 소켓에 프레임을 냈다')
  const r1After = await api(port2, 'GET', `/api/rooms/${R1}/messages`, { cookie })
  assert(r1After.body.length === r1Before.body.length, 'step15 ⑮ 보관된 방에 봇 글이 저장됐다 (t43)')
  assert(conn3.ws.readyState === WS.OPEN, 'step15 ⑮ 보관된 방의 bot_message 가 봇 접속을 끊었다')
  const still = await api(port2, 'POST', `/api/rooms/${R2}/messages`, { cookie, form: messageForm(`@TO(${BOT_NAME}) 보관 뒤 R2`) })
  assert(still.status === 200, 'step15 ⑮ 보관되지 않은 R2 전송이 200 이 아니다')
  const frame15 = await nextFrame(conn3.ws, 'step15 ⑮ R2 전달 프레임', m => m.type === 'message')
  assert(frame15.room_id === R2 && frame15.id === still.body.message.id, 'step15 ⑮ 보관 뒤 R2 전달이 그 방의 것이 아니다')
  await closeWs(conn3.ws, 'step15 ⑮ 소켓 닫기')
  const conn4 = await connect(port2, token, 'step15 ⑮ 보관 뒤 재접속')
  assert(JSON.stringify((conn4.welcome.rooms ?? []).map((r: any) => r.room_id)) === JSON.stringify([R2]), 'step15 ⑮ 보관 뒤 welcome 의 rooms 가 R2 하나가 아니다')
  await closeWs(conn4.ws, 'step15 ⑮ 재접속 닫기')
  step(15)
}

/** 포트 → mkdtemp(+봇 첨부 뿌리) → spawn → 시한 있는 health 대기 → 열다섯 단계. ⑭ 가 서버를 교체하므로(proc.child)
 *  최종 정리는 그 현재 서버를 거둔다. */
export async function main(): Promise<number> {
  const proc: { child: ChildProcess | null } = { child: null }
  let dataDir: string | null = null
  try {
    await checkDependencies()
    const { forServer, forProbe } = await acquirePort()
    dataDir = mkdtempSync(path.join(tmpdir(), 'minidiscord-e2e-'))
    const botFilesDir = path.join(dataDir, 'bot-files')
    mkdirSync(botFilesDir, { recursive: true })
    proc.child = spawnServer(forServer, dataDir, botFilesDir)
    await waitForBoot(proc.child, forProbe)
    await runScenarios(forProbe, dataDir, botFilesDir, proc)
    console.log('E2E PASS — 15 단계 전부 통과 (봇 하나 · 방 둘)')
    return 0
  } finally {
    await cleanup(proc.child, dataDir)
  }
}

// 직접 실행(npx tsx scripts/e2e.mts)일 때만 main 을 돌린다. process.exit 대신 exitCode 로 끝내 pipe 유출을 막는다.
const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectRun) {
  main()
    .then(code => { process.exitCode = code })
    .catch(err => {
      if (!(err instanceof E2eError)) console.error(err) // 예상 밖 예외만 스택을 낸다
      process.exitCode = err instanceof E2eError ? err.exitCode : EXIT_FAILED
    })
}
