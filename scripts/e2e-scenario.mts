// scripts/e2e-scenario.mts — 둘째 종단 간 러너 «봇 둘 · 방 둘 · 관측자 하나» (SPEC-E2ESCEN-001).
//
// 첫째 러너(e2e.mts)가 재지 않는 자리를 전선에서 잰다 — 봇끼리의 전달과 되먹임 차단, 웹이 보는 SSE,
// 권한 릴레이의 나머지 경로, 대화 DB 와 이력 필터, 그리고 신원·동시성 경계다. 조작과 상수는 e2e-lib.mts 를
// 첫째 러너와 나눠 쓰고, server/src/** 는 import 하지 않는다.
//
//  [1] 준비            [2~5] G1 봇 간 전달        [6~8] G2 되먹임 차단
//  [9] G3 SSE 관측자   [10] G5-a 이력 필터        [11~15] G4 권한 릴레이
//  [16~18] G5-b 재시작·삭제·재전송                [19] G6 경계(관측)   [20] G7 건너뜀 + 관측 요약
//
// 두 가지를 갈라 둔다. **단언**은 서버가 보장하는 것만 건다 — 틀리면 종료 코드 1 이다.
// **관측 항목**은 «지금 이렇게 동작한다» 를 [observe] 한 줄로 찍을 뿐 판정에 닿지 않는다 — 고칠지는 별도 카드가 정한다.

import { type ChildProcess } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  E2eError, EXIT_FAILED, WS,
  acquirePort, api, assert, checkDependencies, closeWs, connect, drainQuiet, expectQuiet,
  messageForm, nextFrame, pollUntil, spawnServer, stopServer, subscribeObserver, waitForBoot,
  withDeadline, type Observer,
} from './e2e-lib.mts'

const TOTAL_STEPS = 20
// 시나리오 전체의 바깥 시한 — 개별 대기는 각자 시한이 있고, 이것은 «어디에서도 멈추지 않는다» 의 마지막 그물이다
const SCENARIO_TIMEOUT_MS = 600_000
// 채우기 크기와 거기서 유도되는 상수들 (acceptance.md AC-E2ESCEN-008 의 배치 한 문장)
const FILL = 500

// [HARD] 첫째 러너와 같은 규약 — 그 단계의 단언이 전부 성공한 뒤에만 부른다. 건너뜀·중복·역순은 곧 실패다.
let stepsPassed = 0
function step(n: number): void {
  if (n !== stepsPassed + 1) throw new E2eError(EXIT_FAILED)
  stepsPassed = n
  console.log(`[${n}/${TOTAL_STEPS}]`)
}

// 관측 항목 — 이 함수는 판정 함수를 부르지 않는다. 값이 무엇이든 단계는 그대로 진행하고 종료 코드도 바뀌지 않는다.
// «결함» 이라는 낱말을 쓰지 않는다 — 관측값만 싣는다 (spec.md §1 성질 1).
let observed = 0
function observe(name: string, value: unknown): void {
  observed += 1
  console.log(`[observe] ${name}: ${JSON.stringify(value)}`)
}

// ── 가짜 봇과 정책 객체 ────────────────────────────────────────────────────
// 정책은 `to` 를 받았을 때 무엇을 되돌릴지만 정한다. `cc` 무응답은 정책이 아니라 하네스가 고정한다 —
// 되먹임 차단(G2)이 그 무응답에 기대어 멈추므로 정책이 cc 에 답하는 길을 아예 두지 않는다.
type Reply = { body: string; files?: { local_path: string; name: string }[] }
type Policy = { onTo?: ((m: any) => Reply | null) | null }
type FakeBot = { name: string; id: number; token: string; ws: any; received: any[]; verdicts: any[]; policy: Policy }

function applyPolicy(bot: FakeBot, frame: any): void {
  bot.received.push(frame)
  if (frame.type === 'permission_verdict') { bot.verdicts.push(frame); return }
  if (frame.type !== 'message') return
  if (frame.delivery !== 'to') return
  const reply = bot.policy.onTo?.(frame)
  if (!reply) return
  bot.ws.send(JSON.stringify({ type: 'bot_message', room_id: frame.room_id, body: reply.body, files: reply.files }))
}

// 살아 있는 관측자 — 실패로 끝나도 스트림이 남아 프로세스가 안 죽는 일이 없도록 main 의 finally 가 전부 끊는다
const liveObservers: Observer[] = []

// ── 러너 지역 도우미 ───────────────────────────────────────────────────────

let ridSeq = 0
/** 이력 한 번 — 요청과 응답을 rid 로 짝짓는다. 응답은 요청한 접속에만 오므로 그 소켓에서 기다린다 */
async function historyOf(bot: FakeBot, roomId: number, params: Record<string, unknown> = {}): Promise<any> {
  const rid = `s${++ridSeq}`
  bot.ws.send(JSON.stringify({ type: 'history_request', room_id: roomId, rid, ...params }))
  return await nextFrame(bot.ws, `${bot.name} 이력 ${rid}`, m => m.type === 'history_response' && m.rid === rid)
}

/** 방의 글 전부 — 목록 라우트는 한 번에 200개라 커서로 이어 받는다 (routes-messages.ts 의 LIMIT 200) */
async function allMessages(port: number, cookie: string, roomId: number): Promise<any[]> {
  const out: any[] = []
  let after = 0
  for (let page = 0; page < 50; page++) {
    const res = await api(port, 'GET', `/api/rooms/${roomId}/messages?after=${after}`, { cookie })
    assert(res.status === 200, `방 ${roomId} 목록 조회가 200 이 아니다`)
    const batch: any[] = res.body?.messages ?? []
    out.push(...batch)
    if (batch.length < 200) break
    after = batch[batch.length - 1].id
  }
  return out
}

const ids = (rows: any[]): number[] => rows.map(m => m.id)
const sameIds = (a: any[], b: any[]): boolean => JSON.stringify(ids(a)) === JSON.stringify(ids(b))

// ── 시나리오 본체 ──────────────────────────────────────────────────────────

async function runScenarios(startPort: number, dataDir: string, botFilesDir: string, proc: { child: ChildProcess | null }): Promise<void> {
  let port = startPort
  const HUMAN = { username: 'e2e-human' }

  // ─── [1] 준비 — 사람 하나·방 둘·봇 셋(A·B 참여, C 는 등록만)·관측자 하나 ───
  const login = await api(port, 'POST', '/api/auth/login', { json: HUMAN })
  assert(login.status === 200, 'step1 로그인이 200 이 아니다')
  const cookie = (login.res.headers.getSetCookie?.() ?? [])
    .map(c => c.split(';')[0])
    .find(c => c.startsWith('md_session='))
  assert(cookie, 'step1 로그인 응답에 md_session 쿠키가 없다')

  const r1 = await api(port, 'POST', '/api/rooms', { cookie, json: { name: 'scenario-room-1' } })
  const r2 = await api(port, 'POST', '/api/rooms', { cookie, json: { name: 'scenario-room-2' } })
  assert(r1.status === 201 && r2.status === 201, 'step1 방 생성이 201 이 아니다')
  const R1 = r1.body.id as number, R2 = r2.body.id as number

  async function registerBot(name: string, role: string): Promise<{ id: number; token: string }> {
    const res = await api(port, 'POST', '/api/bots', { cookie, json: { name, description: `scenario ${name}`, role } })
    assert(res.status === 201 && /^[0-9a-f]{64}$/.test(res.body?.token ?? ''), `step1 봇 ${name} 등록이 201·64자 hex 토큰이 아니다`)
    return { id: res.body.id as number, token: res.body.token as string }
  }
  const regA = await withDeadline(registerBot('A', 'orchestrator'), 'step1 봇 A 등록')
  const regB = await withDeadline(registerBot('B', 'worker'), 'step1 봇 B 등록')
  const regC = await withDeadline(registerBot('C', 'worker'), 'step1 봇 C 등록')

  for (const room of [R1, R2]) {
    for (const bot of [regA.id, regB.id]) {
      const j = await api(port, 'POST', `/api/rooms/${room}/bots`, { cookie, json: { bot_id: bot } })
      assert(j.status === 201, `step1 방 ${room} 에 봇 ${bot} 참여가 201 이 아니다`)
    }
  }
  // C 는 등록만 — 어느 방에도 참여시키지 않는다. G1 (ㄷ) 이 그 부재를 잰다
  assert(typeof regC.id === 'number', 'step1 봇 C 등록 id 가 없다')

  const connA = await connect(port, regA.token, 'step1 봇 A 접속')
  const connB = await connect(port, regB.token, 'step1 봇 B 접속')
  const A: FakeBot = { name: 'A', id: regA.id, token: regA.token, ws: connA.ws, received: [], verdicts: [], policy: {} }
  const B: FakeBot = { name: 'B', id: regB.id, token: regB.token, ws: connB.ws, received: [], verdicts: [], policy: {} }
  for (const [bot, welcome] of [[A, connA.welcome], [B, connB.welcome]] as [FakeBot, any][]) {
    const rooms = (welcome.rooms ?? []).map((r: any) => r.room_id).sort((a: number, b: number) => a - b)
    assert(JSON.stringify(rooms) === JSON.stringify([R1, R2].sort((a, b) => a - b)), `step1 봇 ${bot.name} 의 welcome.rooms 가 두 방이 아니다`)
  }

  let observer = await withDeadline(subscribeObserver(port, cookie, R1, 'step1 관측자 구독'), 'step1 관측자 구독')
  liveObservers.push(observer)
  await pollUntil('step1 관측자가 : connected 를 받지 못했다', async () => (observer.record.connected ? true : null))
  step(1)

  // ─── [2] G1 (ㄱ) 봇 A 의 @TO(B) → B 에 to 프레임 하나, B 의 답이 R1 에 봇 글로 저장 ───
  B.policy.onTo = () => ({ body: 'B 답' })
  A.ws.send(JSON.stringify({ type: 'bot_message', room_id: R1, body: '@TO(B) 1' }))
  const f2 = await nextFrame(B.ws, 'step2 B 가 받는 @TO 프레임', m => m.type === 'message')
  assert(f2.delivery === 'to' && f2.author_type === 'bot' && f2.author_name === 'A' && f2.body === '@TO(B) 1' && f2.room_id === R1,
    'step2 G1 (ㄱ) B 가 받은 프레임이 A 의 to 봇 글이 아니다')
  applyPolicy(B, f2)
  const answered = await pollUntil('step2 G1 (ㄱ) B 의 답이 R1 에 저장되지 않았다', async () =>
    (await withDeadline(allMessages(port, cookie, R1), 'step2 R1 목록')).find(m => m.author_type === 'bot' && m.author_name === 'B' && m.body === 'B 답') ?? null)
  assert(answered.room_id === R1, 'step2 G1 (ㄱ) B 의 답이 R1 의 글이 아니다')
  await expectQuiet(A.ws, 'step2 G1 (ㄱ) B 의 답이 멘션 없이 A 에 왔다')
  step(2)

  // ─── [3] G1 (ㄴ) @CC(B) → B 에 cc 하나, 정책은 답하지 않아 A 는 침묵 ───
  A.ws.send(JSON.stringify({ type: 'bot_message', room_id: R1, body: '@CC(B) 2' }))
  const f3 = await nextFrame(B.ws, 'step3 B 가 받는 @CC 프레임', m => m.type === 'message')
  assert(f3.delivery === 'cc' && f3.body === '@CC(B) 2', 'step3 G1 (ㄴ) B 가 받은 프레임이 cc 가 아니다')
  applyPolicy(B, f3)
  await expectQuiet(A.ws, 'step3 G1 (ㄴ) cc 에 정책이 답해 A 에 프레임이 왔다')
  await expectQuiet(B.ws, 'step3 G1 (ㄴ) cc 뒤 B 에 프레임이 더 왔다')
  step(3)

  // ─── [4] G1 (ㄷ) 미참여 봇 C — 봇 경로는 system 글 한 줄, 사람 경로는 400. 어느 소켓에도 프레임이 없다 ───
  A.ws.send(JSON.stringify({ type: 'bot_message', room_id: R1, body: '@TO(C) 3' }))
  await pollUntil('step4 G1 (ㄷ) 미참여 봇 안내 system 글이 R1 에 오지 않았다', async () =>
    (await withDeadline(allMessages(port, cookie, R1), 'step4 R1 목록')).find(m => m.author_type === 'system' && m.body === 'C 봇은 이 방에 초대되지 않았습니다') ?? null)
  await expectQuiet(A.ws, 'step4 G1 (ㄷ) 미참여 봇 멘션이 A 에 프레임을 냈다')
  await expectQuiet(B.ws, 'step4 G1 (ㄷ) 미참여 봇 멘션이 B 에 프레임을 냈다')
  const humanToC = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('@TO(C) 4') })
  assert(humanToC.status === 400 && humanToC.body?.error === 'C 봇은 이 방에 초대되지 않았습니다',
    'step4 G1 (ㄷ) 사람의 미참여 봇 멘션이 400 과 같은 문구가 아니다')
  step(4)

  // ─── [5] G1 (ㄹ) 두 봇이 각각 받은 R1 이력의 id 열이 같다 ───
  const hA5 = await withDeadline(historyOf(A, R1, { limit: 500 }), 'step5 A 의 R1 이력')
  const hB5 = await withDeadline(historyOf(B, R1, { limit: 500 }), 'step5 B 의 R1 이력')
  assert(hA5.messages.length > 0 && sameIds(hA5.messages, hB5.messages), 'step5 G1 (ㄹ) A 와 B 의 R1 이력 id 열이 다르다')
  step(5)

  // ─── [6] G2 되먹임 차단 — 사람 글 뒤 봇 글 여섯째에서 @TO 가 cc 로 내려간다 (plan.md §B.5) ───
  // INSERT 가 세기보다 앞이라 «지금 글 포함» 이다: 여섯째 봇 글의 세기가 6 = BOT_RUN_LIMIT 이다.
  let pong = 0
  A.policy.onTo = () => ({ body: `@TO(B) ${++pong + 1}` })
  B.policy.onTo = () => ({ body: `@TO(A) ${++pong + 1}` })
  const kick = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('@TO(A) 시작') })
  assert(kick.status === 200, 'step6 G2 사람의 시작 글이 200 이 아니다')

  // 프레임은 일곱이다 — 사람의 시작 글 하나(author_type 'user')와 그 뒤 봇 글 여섯. 전달 열은 봇 글만 센다.
  const g2Deliveries: string[] = []
  const g2ByBot: Record<string, string[]> = { A: [], B: [] }
  for (let hop = 0; hop < 7; hop++) {
    const target = hop % 2 === 0 ? A : B
    const frame = await nextFrame(target.ws, `step6 G2 ${hop + 1}번째 전달`, m => m.type === 'message')
    if (frame.author_type === 'bot') {
      g2Deliveries.push(frame.delivery)
      g2ByBot[target.name].push(frame.delivery)
    }
    applyPolicy(target, frame)
  }
  assert(JSON.stringify(g2Deliveries) === JSON.stringify(['to', 'to', 'to', 'to', 'to', 'cc']),
    `step6 G2 봇 글 전달 열이 to,to,to,to,to,cc 가 아니다 — ${g2Deliveries.join(',')}`)
  assert(JSON.stringify(g2ByBot.A) === JSON.stringify(['to', 'to', 'cc']) && JSON.stringify(g2ByBot.B) === JSON.stringify(['to', 'to', 'to']),
    `step6 G2 소켓별 전달 열이 A=to,to,cc · B=to,to,to 가 아니다 — A=${g2ByBot.A.join(',')} · B=${g2ByBot.B.join(',')}`)
  await expectQuiet(A.ws, 'step6 G2 cc 를 받은 A 가 답해 핑퐁이 이어졌다')
  await expectQuiet(B.ws, 'step6 G2 침묵 창에 B 에 프레임이 더 왔다')
  const r1AfterG2 = await withDeadline(allMessages(port, cookie, R1), 'step6 R1 목록')
  const g2Kick = ids(r1AfterG2.filter(m => m.body === '@TO(A) 시작'))[0]
  const botRun = r1AfterG2.filter(m => m.id > g2Kick && m.author_type === 'bot')
  const demoteNote = r1AfterG2.filter(m => m.id > g2Kick && m.author_type === 'system' && m.body === '사람 글 없이 봇 글이 6개 이어져 @TO 를 cc 로 내렸습니다')
  assert(botRun.length === 6, `step6 G2 침묵 창 시점의 봇 글이 6 이 아니다 — ${botRun.length}`)
  assert(demoteNote.length === 1, `step6 G2 강등 안내 system 글이 1 이 아니다 — ${demoteNote.length}`)
  step(6)

  // ─── [7] G2 ⑦ — 사람 글 없이 하나 더 보내면 다시 cc 로 내려가고 안내가 하나 더 (system 은 연속을 끊지 않는다) ───
  A.policy.onTo = null
  B.policy.onTo = null
  A.ws.send(JSON.stringify({ type: 'bot_message', room_id: R1, body: '@TO(B) 7' }))
  const f7 = await nextFrame(B.ws, 'step7 G2 일곱째 봇 글', m => m.type === 'message')
  assert(f7.delivery === 'cc' && f7.body === '@TO(B) 7', 'step7 G2 ⑦ 이 cc 로 내려가지 않았다 — system 글이 연속을 끊었다')
  await expectQuiet(A.ws, 'step7 G2 ⑦ 뒤 A 에 프레임이 왔다')
  const r1AfterSeven = await withDeadline(allMessages(port, cookie, R1), 'step7 R1 목록')
  const notes7 = r1AfterSeven.filter(m => m.id > g2Kick && m.author_type === 'system' && m.body === '사람 글 없이 봇 글이 6개 이어져 @TO 를 cc 로 내렸습니다')
  assert(notes7.length === 2, `step7 G2 ⑦ 뒤 강등 안내가 2 가 아니다 — ${notes7.length}`)
  step(7)

  // ─── [8] G2 (ㄹ) 사람 글이 세기를 되돌린다 — A 의 답이 다시 to 로 B 에 닿는다 ───
  A.policy.onTo = () => ({ body: '@TO(B) 사람 뒤 첫 답' })
  const again = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('@TO(A) 다시') })
  assert(again.status === 200, 'step8 G2 사람의 재개 글이 200 이 아니다')
  const f8a = await nextFrame(A.ws, 'step8 A 가 받는 재개 프레임', m => m.type === 'message')
  assert(f8a.delivery === 'to', 'step8 G2 사람 글 뒤 A 에 온 프레임이 to 가 아니다')
  applyPolicy(A, f8a)
  const f8b = await nextFrame(B.ws, 'step8 B 가 받는 A 의 답', m => m.type === 'message')
  assert(f8b.delivery === 'to' && f8b.body === '@TO(B) 사람 뒤 첫 답', 'step8 G2 사람 글 뒤 A 의 답이 to 로 B 에 닿지 않았다')
  A.policy.onTo = null
  step(8)

  // ─── [9] G3 SSE 관측자 — 이 구간에 저장된 글마다 정확히 한 번, 첨부는 {id,filename}, stored_path 는 없다 ───
  const beforeG3 = await withDeadline(allMessages(port, cookie, R1), 'step9 관측 구간 시작점')
  const mark = beforeG3[beforeG3.length - 1].id as number
  const statusBefore = observer.record.events.filter(e => e.event === 'bot_status').length

  const g3Human = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('G3 사람 글') })
  assert(g3Human.status === 200, 'step9 G3 사람 글이 200 이 아니다')
  const g3File = path.join(botFilesDir, 'g3-attachment.txt')
  writeFileSync(g3File, Buffer.from('G3 관측자 첨부 바이트'))
  A.ws.send(JSON.stringify({ type: 'bot_message', room_id: R1, body: 'G3 첨부 있는 봇 글', files: [{ local_path: g3File, name: 'g3-attachment.txt' }] }))
  A.ws.send(JSON.stringify({ type: 'status', room_id: R1, state: 'working' }))
  A.ws.send(JSON.stringify({ type: 'status', room_id: R1, state: 'idle' }))
  A.ws.send(JSON.stringify({ type: 'bot_message', room_id: R1, body: '@TO(C) G3 system 글 유발' }))

  const windowRows = await pollUntil('step9 G3 구간의 글 넷이 저장되지 않았다', async () => {
    const res = await api(port, 'GET', `/api/rooms/${R1}/messages?after=${mark}`, { cookie })
    const rows: any[] = res.body?.messages ?? []
    return rows.length >= 4 ? rows : null
  })
  await pollUntil('step9 G3 관측자 기록이 저장된 글 수를 따라오지 못했다', async () => {
    const seen = observer.record.events.filter(e => e.event === 'message' && e.data?.id > mark)
    return seen.length >= windowRows.length ? true : null
  })
  await pollUntil('step9 G3 bot_status 두 전이가 관측자에 오지 않았다', async () =>
    (observer.record.events.filter(e => e.event === 'bot_status').length - statusBefore >= 2 ? true : null))

  // (ㄱ) ': connected' 가 먼저다
  assert(observer.record.connected === true && observer.record.connectedFirst === true,
    'step9 G3 (ㄱ) : connected 가 첫 event 프레임보다 앞서지 않았다')
  // (ㄴ) 글마다 정확히 한 번, 작성자 정보가 목록과 같다
  const seenMessages = observer.record.events.filter(e => e.event === 'message' && e.data?.id > mark)
  assert(seenMessages.length === windowRows.length,
    `step9 G3 (ㄴ) 관측자 message 이벤트 수(${seenMessages.length})가 저장된 글 수(${windowRows.length})와 다르다`)
  for (const row of windowRows) {
    const hits = seenMessages.filter(e => e.data.id === row.id)
    assert(hits.length === 1, `step9 G3 (ㄴ) 글 ${row.id} 의 message 이벤트가 정확히 1개가 아니다 — ${hits.length}`)
    assert(hits[0].data.author_name === row.author_name && hits[0].data.author_type === row.author_type,
      `step9 G3 (ㄴ) 글 ${row.id} 의 작성자 정보가 목록과 다르다`)
  }
  // (ㄷ) 첨부 모양과 stored_path 부재
  const attachRow = windowRows.find(m => m.body === 'G3 첨부 있는 봇 글')
  assert(attachRow, 'step9 G3 (ㄷ) 첨부 있는 봇 글이 저장되지 않았다')
  const attachEvent = seenMessages.find(e => e.data.id === attachRow.id)!
  assert(Array.isArray(attachEvent.data.attachments) && attachEvent.data.attachments.length === 1
    && typeof attachEvent.data.attachments[0].id === 'number' && typeof attachEvent.data.attachments[0].filename === 'string',
    'step9 G3 (ㄷ) 첨부 이벤트가 [{id, filename}] 이 아니다')
  assert(JSON.stringify(observer.record).includes('stored_path') === false, 'step9 G3 (ㄷ) 관측자 기록에 stored_path 가 실렸다')
  // (ㄹ) bot_status 전이 순서
  const statuses = observer.record.events.filter(e => e.event === 'bot_status').slice(statusBefore)
  assert(JSON.stringify(statuses.slice(0, 2).map(e => e.data)) === JSON.stringify([{ bot_id: A.id, state: 'working' }, { bot_id: A.id, state: 'idle' }]),
    'step9 G3 (ㄹ) bot_status 전이가 working → idle 순서가 아니다')
  // (ㅁ) 끊긴 사이 저장된 K 개만 되찾기
  const lastBeforeCut = windowRows[windowRows.length - 1].id as number
  observer.abort()
  await withDeadline(observer.closed, 'step9 관측자 스트림 종료')
  const cutIds: number[] = []
  for (let k = 0; k < 3; k++) {
    const posted = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm(`G3 끊긴 사이 ${k + 1}`) })
    assert(posted.status === 200, 'step9 G3 (ㅁ) 끊긴 사이 글이 200 이 아니다')
    cutIds.push(posted.body.message.id as number)
  }
  const recovered = await api(port, 'GET', `/api/rooms/${R1}/messages?after=${lastBeforeCut}`, { cookie })
  assert(JSON.stringify(ids(recovered.body?.messages ?? [])) === JSON.stringify(cutIds),
    'step9 G3 (ㅁ) 되찾기가 끊긴 사이의 세 글과 다르다')
  // (ㅂ) 숫자 아닌 after 와 없는 방
  const bogus = await api(port, 'GET', `/api/rooms/${R1}/messages?after=abc`, { cookie })
  const noRoom = await api(port, 'GET', '/api/rooms/999999/messages', { cookie })
  assert(JSON.stringify(bogus.body?.messages) === '[]' && JSON.stringify(noRoom.body?.messages) === '[]',
    'step9 G3 (ㅂ) after=abc 또는 없는 방이 빈 배열이 아니다')
  step(9)

  // ─── [10] G5-a 대화 DB 와 이력 필터 — 배치 «채우기 전 셋 → A 500 → 초 넘김 → 사람 1» ───
  // 채우기 전 셋: 사람 글 둘 + system 글 하나(권한 요청이 남기는 한 줄). 이 시점의 R2 는 비어 있다.
  for (const n of [1, 2]) {
    const pre = await api(port, 'POST', `/api/rooms/${R2}/messages`, { cookie, form: messageForm(`R2 채우기 전 사람 글 ${n}`) })
    assert(pre.status === 200, 'step10 채우기 전 사람 글이 200 이 아니다')
  }
  B.ws.send(JSON.stringify({ type: 'permission_request', room_id: R2, request_id: 'mnopq', tool_name: 'read_file', description: 'R2 채우기 전 system 글', input_preview: '{}' }))
  const preFill = await pollUntil('step10 채우기 전 셋이 R2 에 서지 않았다', async () => {
    const rows = await withDeadline(allMessages(port, cookie, R2), 'step10 R2 목록')
    return rows.length === 3 && rows.some(m => m.author_type === 'system') ? rows : null
  })
  assert(preFill.filter(m => m.author_type === 'user').length === 2 && preFill.filter(m => m.author_type === 'system').length === 1,
    'step10 채우기 전 셋이 사람 2 · system 1 이 아니다')
  // (ㄱ) REST 목록과 history_request 가 같은 것을 돌려준다
  const preHist = await withDeadline(historyOf(A, R2, { limit: 500 }), 'step10 채우기 전 이력')
  assert(preHist.messages.length === 3, `step10 (ㄱ) 채우기 전 이력이 3 이 아니다 — ${preHist.messages.length}`)
  assert(JSON.stringify(preFill.map(m => [m.id, m.body])) === JSON.stringify(preHist.messages.map((m: any) => [m.id, m.body])),
    'step10 (ㄱ) REST 목록과 history_request 의 id·본문 열이 다르다')
  const preSystem = await withDeadline(historyOf(A, R2, { speaker: '시스템', limit: 500 }), 'step10 채우기 전 speaker 시스템')
  assert(preSystem.messages.length === 1, `step10 (ㄴ) 채우기 전 speaker 시스템이 1 이 아니다 — ${preSystem.messages.length}`)
  const preLastId = preFill[preFill.length - 1].id as number

  // 채우기 — 멘션 없는 봇 글이라 타깃 행이 생기지 않고 되먹임 세기와도 무관하다
  for (let n = 1; n <= FILL; n++) {
    A.ws.send(JSON.stringify({ type: 'bot_message', room_id: R2, body: `fill-${n}` }))
  }
  const filled = await pollUntil('step10 채우기 500 이 저장되지 않았다', async () => {
    const h = await withDeadline(historyOf(A, R2, { limit: 500 }), 'step10 채우기 확인 이력')
    return h.messages.some((m: any) => m.body === `fill-${FILL}`) ? h : null
  }, 60_000)
  const fillLast = filled.messages.find((m: any) => m.body === `fill-${FILL}`)
  const firstFillPage = await api(port, 'GET', `/api/rooms/${R2}/messages?after=${preLastId}`, { cookie })
  const fillFirst = (firstFillPage.body?.messages ?? [])[0]
  assert(fillFirst?.body === 'fill-1', 'step10 채우기 #1 을 찾지 못했다')

  // 초 넘김 대기 — created_at 이 초 단위 문자열이라 이 대기가 없으면 [T1, T2) 가 빌 수 있다
  const secondAtFill = Math.floor(Date.now() / 1000)
  await pollUntil('step10 벽시계 초가 1,100ms 안에 넘어가지 않았다', async () =>
    (Math.floor(Date.now() / 1000) !== secondAtFill ? true : null), 1_100)
  const lastHuman = await api(port, 'POST', `/api/rooms/${R2}/messages`, { cookie, form: messageForm('R2 마지막 사람 글') })
  assert(lastHuman.status === 200, 'step10 마지막 사람 글이 200 이 아니다')
  await expectQuiet(A.ws, 'step10 멘션 없는 마지막 사람 글이 A 소켓에 왔다')
  await expectQuiet(B.ws, 'step10 멘션 없는 마지막 사람 글이 B 소켓에 왔다')

  const base = await withDeadline(historyOf(A, R2, { limit: 500 }), 'step10 기준 집합')
  const baseMsgs: any[] = base.messages
  assert(baseMsgs.length === 500, `step10 기준 집합이 500 이 아니다 — ${baseMsgs.length}`)
  const humanRow = baseMsgs[baseMsgs.length - 1]
  assert(baseMsgs[0].body === 'fill-2' && humanRow.body === 'R2 마지막 사람 글', 'step10 기준 집합의 양끝이 채우기 #2 와 마지막 사람 글이 아니다')
  // 초 넘김이 실제로 일어났는지를 먼저 단언한다 — 여기서 붉으면 아래 상수 499 가 성립하지 않는다
  assert(humanRow.created_at > fillLast.created_at,
    `step10 마지막 사람 글의 created_at 이 채우기 #500 보다 뒤가 아니다 — ${fillLast.created_at} → ${humanRow.created_at}`)

  // (ㄴ) 다섯 필터 — 기대는 전부 기준 집합에서 유도한 상수다
  const sinceIdX = baseMsgs[baseMsgs.length - 11]
  assert(sinceIdX.body === `fill-${FILL - 9}`, `step10 (ㄴ) since_id 기준점이 fill-${FILL - 9} 이 아니다 — ${sinceIdX.body}`)
  const bySinceId = await withDeadline(historyOf(A, R2, { limit: 500, since_id: sinceIdX.id }), 'step10 since_id 필터')
  assert(bySinceId.messages.length === 10 && sameIds(bySinceId.messages, baseMsgs.slice(-10)),
    `step10 (ㄴ) since_id 필터가 마지막 10 과 다르다 — ${bySinceId.messages.length}`)

  const byWindow = await withDeadline(historyOf(A, R2, { limit: 500, since: fillFirst.created_at, until: humanRow.created_at }), 'step10 since/until 필터')
  assert(byWindow.messages.length === 499 && sameIds(byWindow.messages, baseMsgs.slice(0, 499)),
    `step10 (ㄴ) [since, until) 이 채우기 499 와 다르다 — ${byWindow.messages.length}`)

  const bySpeakerA = await withDeadline(historyOf(A, R2, { limit: 500, speaker: 'A' }), 'step10 speaker A 필터')
  assert(bySpeakerA.messages.length === 499 && sameIds(bySpeakerA.messages, baseMsgs.slice(0, 499)),
    `step10 (ㄴ) speaker A 가 499 가 아니다 — ${bySpeakerA.messages.length}`)
  const bySpeakerSystem = await withDeadline(historyOf(A, R2, { limit: 500, speaker: '시스템' }), 'step10 speaker 시스템 필터')
  assert(bySpeakerSystem.messages.length === 0, `step10 (ㄴ) 채운 뒤 speaker 시스템이 0 이 아니다 — ${bySpeakerSystem.messages.length}`)

  const byLimit3 = await withDeadline(historyOf(A, R2, { limit: 3 }), 'step10 limit 3')
  assert(byLimit3.messages.length === 3 && sameIds(byLimit3.messages, baseMsgs.slice(-3)),
    `step10 (ㄴ) limit 3 이 가장 새로운 셋이 아니다 — ${byLimit3.messages.length}`)
  const byLimitHuge = await withDeadline(historyOf(A, R2, { limit: 9999 }), 'step10 limit 9999')
  assert(byLimitHuge.messages.length === 500 && byLimitHuge.messages[0].body === 'fill-2' && byLimitHuge.messages[499].id === humanRow.id,
    `step10 (ㄴ) limit 9999 가 500 으로 잘리지 않았다 — ${byLimitHuge.messages.length}`)

  // (ㄷ) 멘션 없이 보낸 마지막 사람 글도 두 봇의 이력에는 있다
  const hB10 = await withDeadline(historyOf(B, R2, { limit: 500 }), 'step10 B 의 R2 이력')
  assert(baseMsgs.some(m => m.id === humanRow.id) && hB10.messages.some((m: any) => m.id === humanRow.id),
    'step10 (ㄷ) 마지막 사람 글이 두 봇의 이력에 함께 있지 않다')

  // (ㄹ) 걸음 둘 — limit ≥ 밀린 수 는 단언, limit < 밀린 수 는 관측
  const walkFrom = baseMsgs[baseMsgs.length - 481]
  assert(walkFrom.body === 'fill-21', `step10 (ㄹ) 걸음 기준점이 fill-21 이 아니다 — ${walkFrom.body}`)
  const walk1 = await withDeadline(historyOf(A, R2, { limit: 500, since_id: walkFrom.id }), 'step10 걸음 1')
  assert(walk1.messages.length === 480 && sameIds(walk1.messages, baseMsgs.slice(-480)),
    `step10 (ㄹ) 밀린 480 걸음의 첫 응답이 480 이 아니다 — ${walk1.messages.length}`)
  const walk2 = await withDeadline(historyOf(A, R2, { limit: 500, since_id: walk1.messages[479].id }), 'step10 걸음 2')
  assert(walk2.messages.length === 0, `step10 (ㄹ) 밀린 480 걸음의 둘째 응답이 0 이 아니다 — ${walk2.messages.length}`)

  const roomTotal = 3 + FILL + 1
  const seenIds = new Set<number>()
  let cursor = 0
  let walkSteps = 0
  for (let k = 0; k < 20; k++) {
    const page = await withDeadline(historyOf(A, R2, { limit: 100, since_id: cursor }), `step10 커서 걸음 ${k + 1}`)
    if (page.messages.length === 0) break
    walkSteps += 1
    for (const m of page.messages) seenIds.add(m.id)
    cursor = page.messages[page.messages.length - 1].id
  }
  observe('history.cursor-walk', { backlog: roomTotal, limit: 100, steps: walkSteps, missed_ids: roomTotal - seenIds.size })
  step(10)

  // ─── [11] G4 (ㄱ) 거절 — 요청한 소켓에만 판정, 다른 봇은 침묵 ───
  async function request(bot: FakeBot, roomId: number, requestId: string): Promise<void> {
    bot.ws.send(JSON.stringify({ type: 'permission_request', room_id: roomId, request_id: requestId, tool_name: 'write_file', description: `요청 ${requestId}`, input_preview: '{"path":"x"}' }))
  }
  await withDeadline(request(B, R1, 'bcdef'), 'step11 요청 bcdef')
  await pollUntil('step11 G4 (ㄱ) 요청 안내가 R1 에 오지 않았다', async () =>
    (await withDeadline(allMessages(port, cookie, R1), 'step11 R1 목록')).find(m => m.author_type === 'system' && String(m.body).includes('bcdef')) ?? null)
  const no = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('no bcdef') })
  assert(no.status === 200 && no.body?.consumed_by === 'permission', 'step11 G4 (ㄱ) no 답이 권한 소비로 처리되지 않았다')
  const denyVerdict = await nextFrame(B.ws, 'step11 G4 (ㄱ) deny 판정', m => m.type === 'permission_verdict' && m.request_id === 'bcdef')
  applyPolicy(B, denyVerdict)
  assert(denyVerdict.behavior === 'deny', 'step11 G4 (ㄱ) 판정이 deny 가 아니다')
  assert(B.verdicts.filter(v => v.request_id === 'bcdef').length === 1, 'step11 G4 (ㄱ) B 의 deny 판정이 정확히 하나가 아니다')
  await expectQuiet(A.ws, 'step11 G4 (ㄱ) 판정이 A 에도 갔다')
  const denyNote = (await withDeadline(allMessages(port, cookie, R1), 'step11 R1 목록')).filter(m => m.body === '⛔ 거절 전송됨 (bcdef)')
  assert(denyNote.length === 1, `step11 G4 (ㄱ) 거절 안내가 1 이 아니다 — ${denyNote.length}`)
  step(11)

  // ─── [12] G4 (ㄴ)(ㄷ) 다른 방에서 온 답이 해소하고, 결과 글은 요청이 걸린 방에 남는다. 중복 답은 보통 글 ───
  await withDeadline(request(B, R1, 'cdefg'), 'step12 요청 cdefg')
  await pollUntil('step12 G4 (ㄴ) 요청 안내가 R1 에 오지 않았다', async () =>
    (await withDeadline(allMessages(port, cookie, R1), 'step12 R1 목록')).find(m => m.author_type === 'system' && String(m.body).includes('cdefg')) ?? null)
  const crossYes = await api(port, 'POST', `/api/rooms/${R2}/messages`, { cookie, form: messageForm('yes cdefg') })
  assert(crossYes.status === 200 && crossYes.body?.consumed_by === 'permission', 'step12 G4 (ㄴ) 다른 방의 yes 가 권한 소비로 처리되지 않았다')
  const allowVerdict = await nextFrame(B.ws, 'step12 G4 (ㄴ) allow 판정', m => m.type === 'permission_verdict' && m.request_id === 'cdefg')
  applyPolicy(B, allowVerdict)
  assert(allowVerdict.behavior === 'allow', 'step12 G4 (ㄴ) 판정이 allow 가 아니다')
  const r1For12 = await withDeadline(allMessages(port, cookie, R1), 'step12 R1 목록')
  const r2For12 = await withDeadline(allMessages(port, cookie, R2), 'step12 R2 목록')
  const inR1 = r1For12.filter(m => m.body === '✅ 승인 전송됨 (cdefg)').length
  const inR2 = r2For12.filter(m => m.body === '✅ 승인 전송됨 (cdefg)').length
  assert(inR1 === 1 && inR2 === 0, `step12 G4 (ㄴ) 결과 글이 요청의 방(R1)에만 있지 않다 — R1 ${inR1} · R2 ${inR2}`)
  observe('permission.cross-room-outcome-room', { request_room: R1, reply_room: R2, outcome_in_request_room: inR1, outcome_in_reply_room: inR2 })
  const dupYes = await api(port, 'POST', `/api/rooms/${R2}/messages`, { cookie, form: messageForm('yes cdefg') })
  assert(dupYes.status === 200 && dupYes.body?.consumed_by === undefined, 'step12 G4 (ㄷ) 중복 yes 가 다시 소비됐다')
  assert(dupYes.body?.message?.author_type === 'user' && dupYes.body?.message?.body === 'yes cdefg', 'step12 G4 (ㄷ) 중복 yes 가 사용자 글로 저장되지 않았다')
  const dupStored = (await withDeadline(allMessages(port, cookie, R2), 'step12 R2 재조회')).some(m => m.id === dupYes.body.message.id)
  assert(dupStored, 'step12 G4 (ㄷ) 중복 yes 글이 R2 목록에 없다')
  step(12)

  // ─── [13] G4 (ㄹ) 요청한 세션이 끊긴 뒤의 답 — 소비는 되고 문구는 «전달하지 못했습니다» ───
  await withDeadline(request(B, R1, 'defgh'), 'step13 요청 defgh')
  await pollUntil('step13 G4 (ㄹ) 요청 안내가 R1 에 오지 않았다', async () =>
    (await withDeadline(allMessages(port, cookie, R1), 'step13 R1 목록')).find(m => m.author_type === 'system' && String(m.body).includes('defgh')) ?? null)
  await closeWs(B.ws, 'step13 B 소켓 닫기')
  const orphanYes = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('yes defgh') })
  assert(orphanYes.status === 200 && orphanYes.body?.consumed_by === 'permission', 'step13 G4 (ㄹ) 끊긴 세션의 yes 가 소비되지 않았다')
  const orphanNote = (await withDeadline(allMessages(port, cookie, R1), 'step13 R1 목록'))
    .filter(m => m.body === '⚠️ 요청한 세션이 끊겨 판정을 전달하지 못했습니다 (defgh)')
  assert(orphanNote.length === 1, `step13 G4 (ㄹ) 끊긴 세션 안내가 1 이 아니다 — ${orphanNote.length}`)
  const reB = await connect(port, B.token, 'step13 B 재접속')
  B.ws = reB.ws
  step(13)

  // ─── [14] G4 (ㅁ) 형식 밖 request_id — 등록 없이 안내 한 줄, 그 id 로 답해도 보통 글 ───
  await withDeadline(request(B, R1, 'abcdl'), 'step14 요청 abcdl')
  await withDeadline(request(B, R1, 'abcd'), 'step14 요청 abcd')
  const malformed = await pollUntil('step14 G4 (ㅁ) 형식 밖 id 안내 둘이 R1 에 서지 않았다', async () => {
    const rows = (await withDeadline(allMessages(port, cookie, R1), 'step14 R1 목록'))
      .filter(m => m.author_type === 'system' && String(m.body).startsWith('⚠️ 봇이 보낸 승인 요청의 request_id 가 형식에 맞지 않아'))
    return rows.length === 2 ? rows : null
  })
  assert(malformed.length === 2, `step14 G4 (ㅁ) 형식 밖 id 안내가 2 가 아니다 — ${malformed.length}`)
  const badYes = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('yes abcdl') })
  assert(badYes.status === 200 && badYes.body?.consumed_by === undefined && badYes.body?.message?.author_type === 'user',
    'step14 G4 (ㅁ) 형식 밖 id 의 yes 가 보통 글로 저장되지 않았다')
  step(14)

  // ─── [15] G4 (ㅂ) 답하지 않은 요청 스무 개 뒤 첫 요청이 아직 해소되는지 — 관측만 한다 ───
  const alphabet = 'abcdefghijkmnopqrstuvwxyz'
  const pending: string[] = []
  for (let i = 0; i < 20; i++) {
    const id = `zzz${alphabet[i % alphabet.length]}${alphabet[(i * 7 + 3) % alphabet.length]}`
    pending.push(id)
    await withDeadline(request(B, R1, id), `step15 미답 요청 ${id}`)
  }
  await pollUntil('step15 G4 (ㅂ) 미답 요청 스무 개의 안내가 R1 에 서지 않았다', async () => {
    const rows = await withDeadline(allMessages(port, cookie, R1), 'step15 R1 목록')
    return pending.every(id => rows.some(m => m.author_type === 'system' && String(m.body).includes(id))) ? true : null
  })
  const revive = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm(`yes ${pending[0]}`) })
  const drained = await withDeadline(drainQuiet(B.ws), 'step15 미답 뒤 판정 관측')
  for (const frame of drained) applyPolicy(B, frame)
  const firstStillResolves = drained.some((m: any) => m.type === 'permission_verdict' && m.request_id === pending[0])
  observe('permission.no-expiry', { unanswered: 20, consumed: revive.body?.consumed_by === 'permission', first_still_resolves: firstStillResolves })
  step(15)

  // ─── [16] G5-b 재시작 — 같은 데이터 디렉터리로 다시 띄워도 참여·이력·커서가 그대로 ───
  const beforeRestartA1 = await withDeadline(historyOf(A, R1, { limit: 500 }), 'step16 재시작 전 A 의 R1 이력')
  const beforeRestartA2 = await withDeadline(historyOf(A, R2, { limit: 500 }), 'step16 재시작 전 A 의 R2 이력')
  const beforeRooms = (connA.welcome.rooms ?? []).map((r: any) => r.room_id).sort((a: number, b: number) => a - b)
  const lastR1Id = (await withDeadline(allMessages(port, cookie, R1), 'step16 재시작 전 R1 마지막 id')).slice(-1)[0].id as number

  const next = await acquirePort()
  await stopServer(proc.child!)
  proc.child = spawnServer(next.forServer, dataDir, botFilesDir)
  await waitForBoot(proc.child, next.forProbe)
  port = next.forProbe

  const reA16 = await connect(port, A.token, 'step16 재시작 후 A 재접속')
  const reB16 = await connect(port, B.token, 'step16 재시작 후 B 재접속')
  A.ws = reA16.ws
  B.ws = reB16.ws
  for (const [bot, welcome] of [[A, reA16.welcome], [B, reB16.welcome]] as [FakeBot, any][]) {
    const rooms = (welcome.rooms ?? []).map((r: any) => r.room_id).sort((a: number, b: number) => a - b)
    assert(JSON.stringify(rooms) === JSON.stringify(beforeRooms), `step16 (ㄱ) ${bot.name} 의 재시작 후 welcome.rooms 가 다르다`)
  }
  await expectQuiet(A.ws, 'step16 (ㄱ) 재시작 후 A 에 이미 배달한 글이 다시 왔다')
  await expectQuiet(B.ws, 'step16 (ㄱ) 재시작 후 B 에 이미 배달한 글이 다시 왔다')
  const afterRestartA1 = await withDeadline(historyOf(A, R1, { limit: 500 }), 'step16 재시작 후 A 의 R1 이력')
  const afterRestartA2 = await withDeadline(historyOf(A, R2, { limit: 500 }), 'step16 재시작 후 A 의 R2 이력')
  assert(sameIds(beforeRestartA1.messages, afterRestartA1.messages) && sameIds(beforeRestartA2.messages, afterRestartA2.messages),
    'step16 (ㄱ) 재시작 전후의 이력 id 열이 다르다')
  observer = await withDeadline(subscribeObserver(port, cookie, R1, 'step16 관측자 재구독'), 'step16 관측자 재구독')
  liveObservers.push(observer)
  await pollUntil('step16 재구독한 관측자가 : connected 를 받지 못했다', async () => (observer.record.connected ? true : null))
  const nothingNew = await api(port, 'GET', `/api/rooms/${R1}/messages?after=${lastR1Id}`, { cookie })
  assert(JSON.stringify(nothingNew.body?.messages) === '[]', 'step16 (ㄱ) 재시작 뒤 되찾기가 빈 배열이 아니다')
  step(16)

  // ─── [17] G5-b 봇 삭제 — 붙어 있는 소켓이 닫히고 옛 글의 작성자가 «(삭제된 봇)» 이 된다 ───
  const r1Before17 = await withDeadline(allMessages(port, cookie, R1), 'step17 삭제 전 R1 목록')
  const nB = r1Before17.filter(m => m.author_type === 'bot' && m.author_name === 'B').length
  assert(nB >= 1, `step17 (ㄴ) 삭제 전 R1 에 B 의 글이 없다 — ${nB}`)
  const oldBToken = B.token
  const bClosed = new Promise<void>(resolve => B.ws.once('close', () => resolve()))
  const closeStarted = performance.now()
  const del = await api(port, 'DELETE', `/api/bots/${B.id}`, { cookie })
  assert(del.status === 200 && del.body?.ok === true, 'step17 (ㄴ) 봇 삭제가 200·ok 가 아니다')
  await withDeadline(bClosed, 'step17 삭제된 봇의 소켓 닫힘')
  observe('bots.delete-while-connected-close-ms', { ms: Math.round(performance.now() - closeStarted) })

  const r1After17 = await withDeadline(allMessages(port, cookie, R1), 'step17 삭제 후 R1 목록')
  const renamed = r1After17.filter(m => m.author_type === 'bot' && m.author_name === '(삭제된 봇)').length
  const stillB = r1After17.filter(m => m.author_type === 'bot' && m.author_name === 'B').length
  assert(renamed === nB && stillB === 0, `step17 (ㄴ) 삭제 뒤 «(삭제된 봇)» 이 ${nB} 이 아니다 — ${renamed} · B ${stillB}`)
  const hA17 = await withDeadline(historyOf(A, R1, { limit: 500 }), 'step17 A 의 R1 이력')
  assert(hA17.messages.filter((m: any) => m.author_name === '(삭제된 봇)').length === nB
    && hA17.messages.filter((m: any) => m.author_name === 'B').length === 0,
    'step17 (ㄴ) A 의 이력에서 «(삭제된 봇)» 수가 목록과 다르다')

  const reReg = await api(port, 'POST', '/api/bots', { cookie, json: { name: 'B', description: 're-registered', role: 'worker' } })
  assert(reReg.status === 201 && reReg.body.id !== B.id, 'step17 (ㄴ) 같은 이름 재등록이 201·다른 id 가 아니다')
  B.id = reReg.body.id as number
  B.token = reReg.body.token as string
  for (const room of [R1, R2]) {
    const j = await api(port, 'POST', `/api/rooms/${room}/bots`, { cookie, json: { bot_id: B.id } })
    assert(j.status === 201, 'step17 재등록한 B 의 참여가 201 이 아니다')
  }
  let staleFrames = 0
  const stale = new WS(`ws://127.0.0.1:${port}/bot`)
  stale.on('message', () => { staleFrames++ })
  stale.on('error', () => { /* 닫힘으로 귀결된다 */ })
  const staleClosed = new Promise<void>(resolve => {
    stale.on('open', () => stale.send(JSON.stringify({ type: 'hello', token: oldBToken })))
    stale.on('close', () => resolve())
  })
  await withDeadline(staleClosed, 'step17 옛 토큰 소켓 닫힘')
  assert(staleFrames === 0, 'step17 (ㄴ) 옛 토큰의 hello 가 프레임을 받았다')
  const reB17 = await connect(port, B.token, 'step17 재등록한 B 접속')
  B.ws = reB17.ws
  step(17)

  // ─── [18] G5-b 오프라인 재전송과 이력의 겹침 — 설계된 겹침이므로 두 id 열이 같음을 단언한다 ───
  const beforeClose18 = (await withDeadline(allMessages(port, cookie, R1), 'step18 닫기 전 R1 마지막 id')).slice(-1)[0].id as number
  await closeWs(A.ws, 'step18 A 소켓 닫기')
  const missedIds: number[] = []
  for (const n of [1, 2]) {
    const sent = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm(`@TO(A) 자리 비운 사이 ${n}`) })
    assert(sent.status === 200, 'step18 오프라인 글이 200 이 아니다')
    missedIds.push(sent.body.message.id as number)
  }
  const reA18 = await connect(port, A.token, 'step18 A 재접속')
  A.ws = reA18.ws
  const replay1 = await nextFrame(A.ws, 'step18 재전송 프레임 1', m => m.type === 'message')
  const replay2 = await nextFrame(A.ws, 'step18 재전송 프레임 2', m => m.type === 'message')
  assert(JSON.stringify([replay1.id, replay2.id]) === JSON.stringify(missedIds), 'step18 (ㄷ) 재전송 두 프레임의 id 열이 저장된 둘과 다르다')
  await expectQuiet(A.ws, 'step18 (ㄷ) 재전송이 둘을 넘겼다')
  const overlap = await withDeadline(historyOf(A, R1, { limit: 500, since_id: beforeClose18 }), 'step18 겹침 이력')
  assert(JSON.stringify(overlap.messages.map((m: any) => m.id)) === JSON.stringify(missedIds),
    'step18 (ㄷ) since_id 이력이 재전송 두 id 와 다르다')
  step(18)

  // ─── [19] G6 신원·동시성 경계 — 전부 관측 항목이다. 값이 무엇이든 단계는 진행한다 ───
  // (ㄷ-1) 실시간: 같은 봇을 @TO 와 @CC 로 겹쳐 부른 글이 살아 있는 소켓에 몇 프레임으로 오는가
  const dupLive = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('@TO(B) @CC(B) 겹친 멘션 실시간') })
  assert(dupLive.status === 200, 'step19 겹친 멘션 글이 200 이 아니다')
  const liveFrames = await withDeadline(drainQuiet(B.ws), 'step19 겹친 멘션 실시간 프레임')
  observe('mention.duplicate-live-frames', {
    frames: liveFrames.filter((m: any) => m.type === 'message' && m.id === dupLive.body.message.id).length,
    deliveries: liveFrames.filter((m: any) => m.type === 'message' && m.id === dupLive.body.message.id).map((m: any) => m.delivery),
  })

  // (ㄷ-2) 재전송: 자리를 비운 사이의 같은 글이 몇 프레임으로 오는가
  await closeWs(B.ws, 'step19 B 소켓 닫기')
  const dupReplay = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('@TO(B) @CC(B) 겹친 멘션 재전송') })
  assert(dupReplay.status === 200, 'step19 겹친 멘션 재전송 글이 200 이 아니다')
  const reB19 = await connect(port, B.token, 'step19 B 재접속')
  B.ws = reB19.ws
  const replayFrames = await withDeadline(drainQuiet(B.ws), 'step19 겹친 멘션 재전송 프레임')
  observe('mention.duplicate-replay-frames', {
    frames: replayFrames.filter((m: any) => m.type === 'message' && m.id === dupReplay.body.message.id).length,
    deliveries: replayFrames.filter((m: any) => m.type === 'message' && m.id === dupReplay.body.message.id).map((m: any) => m.delivery),
  })

  // (ㄱ) 같은 토큰의 둘째 소켓 — 거절·퇴출되지 않는다. 두 소켓이 함께 받는 것은 의도된 동작이다
  let secondRejected = false
  const secondConn = await connect(port, B.token, 'step19 같은 토큰 둘째 소켓').catch(() => { secondRejected = true; return null })
  const twoSocketPost = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('@TO(B) 소켓 둘') })
  assert(twoSocketPost.status === 200, 'step19 소켓 둘 실험 글이 200 이 아니다')
  const firstDrain = await withDeadline(drainQuiet(B.ws), 'step19 첫 소켓 수신')
  const secondDrain = secondConn ? await withDeadline(drainQuiet(secondConn.ws), 'step19 둘째 소켓 수신') : []
  const gotIt = (frames: any[]) => frames.some((m: any) => m.type === 'message' && m.id === twoSocketPost.body.message.id)
  let replyToRequesterOnly = false
  if (secondConn) {
    B.ws.send(JSON.stringify({ type: 'history_request', room_id: R1, rid: 'two-socket', limit: 5 }))
    await nextFrame(B.ws, 'step19 첫 소켓의 이력 응답', m => m.type === 'history_response' && m.rid === 'two-socket')
    const otherSide = await withDeadline(drainQuiet(secondConn.ws), 'step19 둘째 소켓 침묵 관측')
    replyToRequesterOnly = otherSide.every((m: any) => m.type !== 'history_response')
  }
  observe('identity.same-token-two-sockets', {
    sockets_received: (gotIt(firstDrain) ? 1 : 0) + (gotIt(secondDrain) ? 1 : 0),
    second_hello_rejected: secondRejected,
    history_reply_to_requester_only: replyToRequesterOnly,
  })
  if (secondConn) await closeWs(secondConn.ws, 'step19 둘째 소켓 닫기')

  // (ㄴ) 폭 0 문자가 든 이름 — 등록이 갈라지는지, 그 이름의 멘션이 어디에 닿는지
  const plainName = await api(port, 'POST', '/api/bots', { cookie, json: { name: 'B', role: 'worker' } })
  const zeroWidth = await api(port, 'POST', '/api/bots', { cookie, json: { name: 'B​', role: 'worker' } })
  const zwMention = await api(port, 'POST', `/api/rooms/${R1}/messages`, { cookie, form: messageForm('@TO(B​) 폭 0 이름') })
  observe('identity.zero-width-name', {
    plain_status: plainName.status,
    zero_width_status: zeroWidth.status,
    mention_post_status: zwMention.status,
    mention_error: zwMention.body?.error ?? null,
  })
  step(19)

  // ─── [20] G7 은 선택 마일스톤이라 건너뛴다. 관측 요약을 찍고 끝낸다 ───
  if (process.argv.includes('--with-channel')) {
    console.log('[skip] G7 — --with-channel 은 M7 미착수 (plan.md §G ⑥)')
  } else {
    console.log('[skip] G7 — --with-channel 없음')
  }
  assert(observed === 8, `step20 관측 항목이 여덟이 아니다 — ${observed}`)
  console.log(`[observe-summary] ${observed} items`)
  step(20)
}

/** 포트 → mkdtemp(+봇 첨부 뿌리) → spawn → 시한 있는 health 대기 → 스무 단계.
 *  [elapsed] 는 finally 에서 찍는다 — 정상·단언 실패·기동 시한 세 경로 모두에서 남아야 하기 때문이다.
 *  마지막 줄은 그 뒤에 온다: 성공했을 때만 도달하므로 «[elapsed] 다음 줄이 PASS» 라는 순서가 성립한다. */
export async function main(): Promise<number> {
  const started = performance.now()
  const proc: { child: ChildProcess | null } = { child: null }
  let dataDir: string | null = null
  try {
    await checkDependencies()
    const { forServer, forProbe } = await acquirePort()
    dataDir = mkdtempSync(path.join(tmpdir(), 'minidiscord-e2e-scenario-'))
    const botFilesDir = path.join(dataDir, 'bot-files')
    mkdirSync(botFilesDir, { recursive: true })
    proc.child = spawnServer(forServer, dataDir, botFilesDir)
    await waitForBoot(proc.child, forProbe)
    await withDeadline(runScenarios(forProbe, dataDir, botFilesDir, proc), '시나리오 전체', SCENARIO_TIMEOUT_MS)
  } finally {
    for (const obs of liveObservers) obs.abort()
    if (proc.child) await withDeadline(stopServer(proc.child), '서버 정리', 30_000)
    if (dataDir) rmSync(dataDir, { recursive: true, force: true })
    console.log(`[elapsed] ${Math.round(performance.now() - started)} ms`)
  }
  console.log(`E2E-SCENARIO PASS — ${TOTAL_STEPS} 단계 전부 통과 (봇 둘 · 방 둘 · 관측자 하나)`)
  return 0
}

// 직접 실행일 때만 main 을 돌린다. process.exit 대신 exitCode 로 끝내 pipe 유출을 막는다.
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
