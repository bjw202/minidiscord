// scripts/e2e.mts — SPEC-E2E-001 종단 간 시나리오 러너 (Tier M · 카드 t6 · M3 재시작 영속성)
//
// [D1(a) 공시 — 워크스페이스 경계를 가로지르는 import] 이 스크립트는
// ../server/test/gateway-v2.ts 의 connectV2·innerOf 를 상대 경로로 가져다 쓴다. 그 하네스는
// 구현(server/src)의 함수를 부르지 않고 열쇠를 스스로 유도한다(gateway-v2.ts:1-5 주석) —
// 재사용이 인증 독립성 축을 깨지 않는다. 그 파일은 서버 스위트 전체가 공유하므로 이 카드는
// 절대 편집하지 않는다(plan.md §F M2).
// 반대 방향은 금지다(plan.md §D-1): 이 스크립트는 server/src/** 를 import 하지 않는다.
// 서버는 실제 프로세스로 spawn 하고, 이 스크립트는 HTTP와 WebSocket 전선으로만 말을 건다.
//
// M1 골격 — 포트 확보 → 임시 데이터 디렉터리(+봇 첨부 뿌리) → 서버 spawn → 시한 있는 /api/health 폴링 →
// 정상·단언 실패·예외 세 경로 전부의 정리.
// M2 본체 — REQ-E2E-007 의 ①~⑬ 을 runScenarios 가 순서대로 수행한다.
// M3 — ⑭ 서버 재시작 영속성(kill 후 같은 데이터 디렉터리로 재기동, 세 동일성 대조)·
// ⑮ 방 보관 후 접속 거부로 15 단계를 채운다. 진행 표지 [n/15] 는 그 단계의 단언이 전부
// 성공한 뒤에만 찍는다(REQ-E2E-007 [HARD] — step 참고).

// @MX:TODO: [AUTO] M4 — 루트 package.json 에 "e2e" 스크립트 배선 (plan.md §F M4, test 값 불변)
// @MX:NOTE: [AUTO] ../server/test/gateway-v2.ts 상대 import 는 D1(a) 재사용 — 하네스가 구현을 부르지 않아 독립성 축 유지 (plan.md §D-2)

import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'node:net'

// 프로젝트 뿌리 — 이 파일의 위치(scripts/)에서 역산한다. cwd 가 어디서든 같은 서버를 찾는다.
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const BOOT_TIMEOUT_MS = 30_000   // /api/health 시한 — 무한 대기 금지 (REQ-E2E-006)
const POLL_INTERVAL_MS = 200
const FRAME_TIMEOUT_MS = 10_000  // 프레임·조건 대기의 기본 시한 — 무한 대기는 실패를 숨긴다

// 종료 코드 규약: 9 는 기동 시한 전용(REQ-E2E-006). 그 외 실패는 9 를 쓰지 않는다 —
// 두 경로가 코드를 나눠 갖지 않으면 AC-E2E-006 이 공허해진다(plan.md §C).
const EXIT_BOOT_TIMEOUT = 9
const EXIT_FAILED = 1

/** 사용자에게 이미 한 줄을 출력한 뒤 던지는 종료 운반체 — 러너는 스택 없이 이 코드로 끝낸다 */
class E2eError extends Error {
  constructor(readonly exitCode: number) { super(`exit ${exitCode}`) }
}

/** 의존성 부재 경로: 한 줄 안내 + exit 1 (스택 트레이스 없음, 9 가 아니다).
 *  `ws` 는 v2 하네스(gateway-v2.ts)와 spawn 된 서버가 함께 쓰는 클라이언트 의존성이다.
 *  [M2 실측] 이 두 의존성을 정적 import 하면 npm install 전 상태에서 모듈 적재 단계가
 *  검사보다 먼저 ERR_MODULE_NOT_FOUND 스택으로 죽는다 — 한 줄 계약(plan.md §C)을 지키려면
 *  로딩 자체가 검사 뒤에 와야 하므로 ws·하네스는 아래 홀더에 늦게 채운다. */
let WS: any   // ws 기본 export — 소켓 생성자와 readyState 상수
let connectV2: (port: number, token: string) => Promise<{ ws: any; welcome: any }>
let innerOf: (ws: object, raw: any) => any | null

export async function checkDependencies(): Promise<void> {
  try {
    ;({ default: WS } = await import('ws'))
    ;({ connectV2, innerOf } = await import('../server/test/gateway-v2.ts'))
  } catch {
    console.error('의존성이 해소되지 않습니다 — 먼저 `npm install` 을 돌리세요.')
    throw new E2eError(EXIT_FAILED)
  }
}

/** 포트 확보 (plan.md §D-3 — 하드코딩 없음): E2E_FORCE_PORT 가 있으면 그 값을 그대로(verbatim) 쓴다.
 *  빈 문자열은 미설정으로 본다 — AC-E2E-006 이 상정한 점유자 경주에서 빈 값이 흘러들 때
 *  스크립트가 스스로 빈 포트를 잡는 쪽이 기준이 기대한 동작이다.
 *  없으면 이 순간 빈 포트를 하나 잡는다(listen(0) 후 닫음 — 닫힘과 재사용 사이의 작은 경주는 감수). */
async function acquirePort(): Promise<{ forServer: string; forProbe: number }> {
  const forced = process.env.E2E_FORCE_PORT
  if (forced) return { forServer: forced, forProbe: Number(forced) }
  const port = await new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.on('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const p = (probe.address() as { port: number }).port
      probe.close(() => resolve(p))
    })
  })
  return { forServer: String(port), forProbe: port }
}

/** 서버 spawn — 별도 프로세스, 실제 전선(plan.md §D-1). detached 로 프로세스 그룹을 만들어
 *  npx→tsx→node 중간 단계가 있어도 그룹 전체를 거둘 수 있게 한다(cleanup 참고).
 *  환경변수 셋은 server/src/config.ts 가 실제로 읽는 것들이다 —
 *  MINIDISCORD_PORT(config.ts:3) · MINIDISCORD_HOST(config.ts:6) · MINIDISCORD_DATA_DIR(config.ts:8) ·
 *  MINIDISCORD_BOT_FILES_DIR(config.ts:13 — 미설정이면 봇 첨부를 전부 거부하는 fail-closed).
 *  시나리오 ⑧첨부 저장·⑨내려받기가 이 서버 환경을 그대로 쓰므로 주입이 필수다. */
function spawnServer(portForServer: string, dataDir: string, botFilesDir: string): ChildProcess {
  return spawn('npx', ['tsx', 'server/src/index.ts'], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      MINIDISCORD_PORT: portForServer,
      MINIDISCORD_HOST: '127.0.0.1',
      MINIDISCORD_DATA_DIR: dataDir,
      MINIDISCORD_BOT_FILES_DIR: botFilesDir,
    },
  })
}

/** 시한 있는 기동 대기 (REQ-E2E-006): 무한히 기다리지 않는다. 준비 신호는 포트가 실제로
 *  받아들이고 /api/health 가 응답하는 것 — 고정 sleep 이 아니다(P-06 이전 지적).
 *  시한 초과 또는 서버 프로세스가 먼저 죽으면(점유 포트 EADDRINUSE 등) [boot-timeout] 을
 *  딱 한 번 표준출력에 찍고 exit 9 로 끝낸다. */
async function waitForBoot(child: ChildProcess, probePort: number): Promise<void> {
  const url = `http://127.0.0.1:${probePort}/api/health`
  const deadline = Date.now() + BOOT_TIMEOUT_MS
  let exited = false
  child.once('exit', () => { exited = true })
  while (Date.now() < deadline && !exited) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(POLL_INTERVAL_MS) })
      if (res.ok) return
    } catch { /* 아직 응답할 수 없다 — 다음 폴링 */ }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  console.log('[boot-timeout]')
  throw new E2eError(EXIT_BOOT_TIMEOUT)
}

// [HARD] REQ-E2E-007 · plan.md §D-8 — step(n) 은 그 단계의 모든 단언이 "성공한 뒤에"만 호출한다.
// 단언 앞에 부르면 단계가 실패해도 표지 열이 온전해져 순서 증거가 거짓이 된다(AC-E2E-007 공허화).
// 호출 지점의 계약: runScenarios 의 각 단계에서 단언 전부 → 그 다음 줄에서 step(n).
// 건너뜀·중복·역순 호출은 조용히 통과시키지 않고 곧장 실패로 끝낸다.
let stepsPassed = 0
export function step(n: number): void {
  if (n !== stepsPassed + 1) throw new E2eError(EXIT_FAILED)
  stepsPassed = n
  console.log(`[${n}/15]`)
}

/** 서버 프로세스 그룹을 거둔다 — SIGTERM → 3초 유예 → SIGKILL.
 *  최종 정리(cleanup)와 ⑭ 재시작이 함께 쓴다. */
async function stopServer(child: ChildProcess): Promise<void> {
  if (!child.pid) return
  const dead = new Promise<void>(resolve => child.once('exit', () => resolve()))
  try { process.kill(-child.pid, 'SIGTERM') } catch { /* 이미 죽었다 */ }
  await Promise.race([dead, new Promise<void>(resolve => setTimeout(resolve, 3_000))])
  if (child.exitCode === null && child.signalCode === null) {
    try { process.kill(-child.pid, 'SIGKILL') } catch { /* 이미 죽었다 */ }
    await dead
  }
}

/** 정리 — 정상·단언 실패·예외 세 경로 전부에서 finally 로 호출된다(plan.md §D-4).
 *  서버 프로세스 그룹을 먼저 거두고, 다 죽은 뒤 임시 데이터 디렉터리를 지운다.
 *  bot-files 하위 경로도 dataDir 재귀 삭제로 함께 거둔다. 아무것도 만들어지기 전에
 *  실패하면(child·dataDir null) 아무것도 하지 않는다. */
async function cleanup(child: ChildProcess | null, dataDir: string | null): Promise<void> {
  if (child) await stopServer(child)
  if (dataDir) rmSync(dataDir, { recursive: true, force: true })
}

// ── M2 시나리오 공용 조작 (REQ-E2E-007 ①~⑬) ──────────────────────────────────

/** 한 줄 실패 — 표지는 단언 성공 뒤에만 찍히므로, 마지막 표지가 곧 실패 위치의 증거다 */
function fail(label: string): never {
  console.error(`[fail] ${label}`)
  throw new E2eError(EXIT_FAILED)
}

function assert(cond: unknown, label: string): asserts cond {
  if (!cond) fail(label)
}

/** multipart 폼 하나 — 메시지 라우트는 req.parts() multipart 만 받는다 (routes-messages.ts:50) */
function messageForm(body: string): FormData {
  const fd = new FormData()
  fd.append('body', body)
  return fd
}

/** JSON/폼 HTTP 호출 — 상태 코드·본문·원응답(쿠키 헤더용)을 돌려준다 */
async function api(port: number, method: string, path: string, init: { cookie?: string; json?: unknown; form?: FormData } = {}): Promise<{ status: number; body: any; res: Response }> {
  const headers: Record<string, string> = {}
  if (init.cookie) headers.cookie = init.cookie
  let body: FormData | string | undefined
  if (init.form) body = init.form
  else if (init.json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(init.json) }
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body })
  return { status: res.status, body: await res.json().catch(() => null), res }
}

/** 확립 소켓의 다음 봉투를 기다린다 — innerOf 가 mac 일치·seq 단조를 검증한 뒤의
 *  안쪽 프레임만 본다(REQ-E2E-003). 시한 안에 오지 않으면 한 줄 실패로 끝난다. */
function nextInner(ws: any, label: string, predicate: (inner: any) => boolean, timeoutMs = FRAME_TIMEOUT_MS): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', listener)
      console.error(`[fail] ${label} — 시한 ${timeoutMs}ms 안에 해당 프레임이 오지 않았다`)
      reject(new E2eError(EXIT_FAILED))
    }, timeoutMs)
    const listener = (data: unknown) => {
      let env: any
      try { env = JSON.parse(String(data)) } catch { return }
      const inner = innerOf(ws, env)
      if (inner === null || !predicate(inner)) return
      clearTimeout(timer)
      ws.off('message', listener)
      resolve(inner)
    }
    ws.on('message', listener)
  })
}

/** 조건이 참이 될 때까지 HTTP 를 짧게 재묻는다 — 고정 sleep 로 상태를 가정하지 않는다 */
async function pollUntil<T>(label: string, probe: () => Promise<T | null>, timeoutMs = FRAME_TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const found = await probe()
    if (found !== null) return found
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  console.error(`[fail] ${label} — 시한 ${timeoutMs}ms 안에 조건이 참이 되지 않았다`)
  throw new E2eError(EXIT_FAILED)
}

/** 소켓을 닫고 닫힘까지 기다린다 — 다음 접속이 같은 (방, 봇) 자리를 이어받기 전에 정리된다 */
function closeWs(ws: any, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WS.CLOSED) return resolve()
    const timer = setTimeout(() => {
      console.error(`[fail] ${label} — 소켓이 시한 안에 닫히지 않았다`)
      reject(new E2eError(EXIT_FAILED))
    }, FRAME_TIMEOUT_MS)
    ws.once('close', () => { clearTimeout(timer); resolve() })
    ws.close()
  })
}

/** 소켓이 닫히기를 기다린다 — 닫는 주체는 서버(보관 훅)여야 하므로 클라이언트에서 close 를 부르지 않는다.
 *  ⑮ 전용 — 보관 훅의 closeRoom 이 그 방 접속을 끊는 관측이 곧 단계의 본론이다(gateway.ts:339-341). */
function expectServerClose(ws: any, label: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws.readyState === WS.CLOSED) return resolve()
    const timer = setTimeout(() => {
      console.error(`[fail] ${label} — 서버가 소켓을 닫지 않았다`)
      reject(new E2eError(EXIT_FAILED))
    }, FRAME_TIMEOUT_MS)
    ws.once('close', () => { clearTimeout(timer); resolve() })
  })
}

/** M2 본체 — REQ-E2E-007 의 ①~⑬, M3 이 ⑭ 재시작·⑮ 보관 거부를 덧붙인다.
 *  각 단계: 단언 전부 → step(n). 실패는 곧 exit 1.
 *  URL·페이로드는 server/src/routes-*.ts 와 gateway.ts 의 실제 형태를 따른다(추측 없음). */
async function runScenarios(port: number, dataDir: string, botFilesDir: string, proc: { child: ChildProcess | null }): Promise<void> {
  const USER = { username: 'e2e-user', password: 'e2e-password-123' }
  const BOT_NAME = 'E2E-Bot'

  // ① 가입·로그인 — 로그인은 md_session 쿠키로 세션을 준다 (auth.ts:56-59)
  assert((await api(port, 'POST', '/api/auth/register', { json: USER })).status === 201, 'step1 ① 가입이 201 이 아니다')
  const login = await api(port, 'POST', '/api/auth/login', { json: USER })
  assert(login.status === 200, 'step1 ① 로그인이 200 이 아니다')
  const cookie = (login.res.headers.getSetCookie?.() ?? [])
    .map(c => c.split(';')[0])
    .find(c => c.startsWith('md_session='))
  assert(cookie, 'step1 ① 로그인 응답에 md_session 쿠키가 없다')
  step(1)

  // ② 방 생성 — 생성자는 곧 구성원이다 (routes-rooms.ts:34-38 한 트랜잭션)
  const room = await api(port, 'POST', '/api/rooms', { cookie, json: { name: 'e2e-room' } })
  assert(room.status === 201 && typeof room.body?.id === 'number' && room.body?.status === 'active', 'step2 ② 방 생성 응답이 201·active 가 아니다')
  const roomId = room.body.id as number
  step(2)

  // ③ 봇 등록 (routes-bots.ts:57-67)
  const bot = await api(port, 'POST', '/api/bots', { cookie, json: { name: BOT_NAME, description: 'e2e scenario bot' } })
  assert(bot.status === 201 && typeof bot.body?.id === 'number', 'step3 ③ 봇 등록이 201 이 아니다')
  const botId = bot.body.id as number
  step(3)

  // ④ 봇 초대 — 평문 토큰은 이 응답에 한 번만 실린다 (routes-bots.ts:88-91, 64자 hex)
  const inv = await api(port, 'POST', `/api/rooms/${roomId}/invites`, { cookie, json: { bot_id: botId } })
  assert(inv.status === 201 && /^[0-9a-f]{64}$/.test(inv.body?.token ?? ''), 'step4 ④ 초대 응답의 토큰이 64자 hex 가 아니다')
  const token = inv.body.token as string
  step(4)

  // ⑤ v2 접속 — connectV2 가 challenge 대조·auth 서명·봉투 welcome 검증을 통과해야 해소된다
  const conn = await connectV2(port, token).catch(e => fail(`step5 ⑤ v2 접속 실패: ${e?.message ?? e}`))
  assert(conn.welcome.room_id === roomId && conn.welcome.bot_id === botId && typeof conn.welcome.missed_after_id === 'number',
    'step5 ⑤ welcome 의 room·bot·커서가 기대와 다르다')
  step(5)

  // ⑥ v1 hello{token} 음성 대조군 — dropConn 은 send 없이 닫는다 (gateway.ts:118-122·153-156)
  let v1Frames = 0
  const v1 = new WS(`ws://127.0.0.1:${port}/bot`)
  v1.on('message', () => { v1Frames++ })
  v1.on('error', () => { /* 비정상 종료도 닫힘으로 귀결된다 — 본론은 수신 프레임 수다 */ })
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error('[fail] step6 ⑥ v1 소켓이 시한 안에 닫히지 않았다')
      reject(new E2eError(EXIT_FAILED))
    }, FRAME_TIMEOUT_MS)
    v1.on('open', () => v1.send(JSON.stringify({ type: 'hello', token })))
    v1.on('close', () => { clearTimeout(timer); resolve() })
  })
  assert(v1Frames === 0, 'step6 ⑥ v1 소켓이 닫히기 전에 프레임을 받았다')
  step(6)

  // ⑦ @TO 라우팅 — 멘션 문법은 @TO(봇이름) 이다 (mention.ts:2). deliver 가 커서를 msg.id 로 올린다 (gateway.ts:324-337)
  const pending7 = nextInner(conn.ws, 'step7 ⑦ @TO 전달 프레임', i => i.type === 'message' && i.delivery === 'to')
  const body7 = `@TO(${BOT_NAME}) e2e 라우팅 점검`
  const sent7 = await api(port, 'POST', `/api/rooms/${roomId}/messages`, { cookie, form: messageForm(body7) })
  assert(sent7.status === 200 && typeof sent7.body?.message?.id === 'number', 'step7 ⑦ 멘션 메시지 저장이 200 이 아니다')
  const msg7id = sent7.body.message.id as number
  const frame7 = await pending7
  assert(frame7.id === msg7id && frame7.body === body7 && frame7.author_name === USER.username, 'step7 ⑦ 전달 프레임이 저장된 메시지와 다르다')
  step(7)

  // ⑧ 봇 답변 + 첨부 저장 — 봇 파일은 주입한 botFilesDir 안에 만들어 local_path 로 건넨다 (gateway.ts:281-282 뿌리 검사)
  const botFile = path.join(botFilesDir, 'e2e-answer.txt')
  const botFileBytes = Buffer.from('e2e attachment payload — step8 ⑧ 봇 첨부')
  writeFileSync(botFile, botFileBytes)
  conn.ws.send(JSON.stringify({
    type: 'bot_message',
    body: 'E2E-Bot 답변입니다',
    files: [{ local_path: botFile, name: 'e2e-answer.txt' }],
  }))
  const botMsg = await pollUntil('step8 ⑧ 봇 메시지가 방 목록에 저장되지 않았다', async () => {
    const list = await api(port, 'GET', `/api/rooms/${roomId}/messages`, { cookie })
    if (list.status !== 200) return null
    return list.body?.messages?.find((m: any) => m.author_type === 'bot' && m.body === 'E2E-Bot 답변입니다') ?? null
  })
  assert(Array.isArray(botMsg.attachments) && botMsg.attachments.length === 1 && typeof botMsg.attachments[0]?.id === 'number',
    'step8 ⑧ 봇 첨부가 기록되지 않았다')
  const botMsgId = botMsg.id as number
  const attId = botMsg.attachments[0].id as number
  step(8)

  // ⑨ 첨부 내려받기 — 바이트 동일성으로 잰다 (REQ-E2E-010 의 형태)
  const dl = await fetch(`http://127.0.0.1:${port}/api/attachments/${attId}`, { headers: { cookie } })
  assert(dl.status === 200, 'step9 ⑨ 첨부 내려받기가 200 이 아니다')
  const bytes = Buffer.from(await dl.arrayBuffer())
  assert(Buffer.compare(bytes, botFileBytes) === 0, 'step9 ⑨ 내려받은 바이트가 봇이 올린 원본과 다르다')
  step(9)

  // ⑩ 멘션 없는 메시지 저장 — 타깃 행이 생기지 않는 일반 전송
  const body10 = '멘션 없는 보통 메시지'
  const sent10 = await api(port, 'POST', `/api/rooms/${roomId}/messages`, { cookie, form: messageForm(body10) })
  assert(sent10.status === 200 && sent10.body?.message?.author_type === 'user' && sent10.body?.message?.body === body10
    && Array.isArray(sent10.body?.message?.attachments) && sent10.body.message.attachments.length === 0,
    'step10 ⑩ 멘션 없는 메시지의 저장 형태가 기대와 다르다')
  const msg10id = sent10.body.message.id as number
  step(10)

  // ⑪ history_request — 전체 조회와 since_id 커서 조회 (gateway.ts:303-315). 세 메시지의 동일성으로 잰다
  const h1pending = nextInner(conn.ws, 'step11 ⑪ history_response(전체)', i => i.type === 'history_response' && i.rid === 'e2e-h1')
  conn.ws.send(JSON.stringify({ type: 'history_request', rid: 'e2e-h1', limit: 100 }))
  const h1 = await h1pending
  const allIds = [msg7id, botMsgId, msg10id]
  assert(Array.isArray(h1.messages) && h1.messages.length === allIds.length
    && allIds.every((id: number) => h1.messages.some((m: any) => m.id === id)),
    'step11 ⑪ 전체 조회 결과가 저장된 세 메시지와 다르다')
  const h2pending = nextInner(conn.ws, 'step11 ⑪ history_response(커서)', i => i.type === 'history_response' && i.rid === 'e2e-h2')
  conn.ws.send(JSON.stringify({ type: 'history_request', rid: 'e2e-h2', limit: 100, since_id: msg7id }))
  const h2 = await h2pending
  assert(Array.isArray(h2.messages) && h2.messages.every((m: any) => m.id > msg7id)
    && h2.messages.some((m: any) => m.id === msg10id) && !h2.messages.some((m: any) => m.id === msg7id),
    'step11 ⑪ since_id 커서 조회가 ⑦ 이후만 담지 않았다')
  step(11)

  // ⑫ 권한 릴레이 — 봇 요청(request_id 5자 [a-km-z]) → 사람이 "yes <id>" 를 방에 답하면
  // 메시지 라우트의 가로채기가 소비하고(routes-messages.ts:66) 판정이 봇으로 되돌아온다 (permissions.ts:86-107)
  const verdictPending = nextInner(conn.ws, 'step12 ⑫ permission_verdict', i => i.type === 'permission_verdict' && i.request_id === 'abcde')
  conn.ws.send(JSON.stringify({
    type: 'permission_request',
    request_id: 'abcde',
    tool_name: 'write_file',
    description: 'e2e 권한 릴레이 점검',
    input_preview: '{"path":"e2e.txt"}',
  }))
  const reply = await api(port, 'POST', `/api/rooms/${roomId}/messages`, { cookie, form: messageForm('yes abcde') })
  assert(reply.status === 200 && reply.body?.consumed_by === 'permission', 'step12 ⑫ yes 답이 권한 소비로 처리되지 않았다')
  const verdict = await verdictPending
  assert(verdict.behavior === 'allow', 'step12 ⑫ 판정이 allow 가 아니다')
  step(12)

  // ⑬ 재접속 시 놓친 메시지 재전송 — 소켓을 닫아 오프라인을 만들고 메시지를 하나 흘려보낸다.
  // 접속이 없으면 deliver 가 커서를 못 올린다(gateway.ts:324-337) — 그래서 커서는 ⑦ 값에 머문다.
  // 재전송 프레임은 welcome 과 같은 쓰기로 붙어 와서 welcome 처리 드레인 안에 소비될 수 있어
  // 리스너를 다는 시점에 이미 지나갈 수 있다. 그래서 잡는 곳을 둘로 나눈다:
  // (a) 재접속 1 — welcome 커서가 ⑦ 값인 것 + 이력 조회로 흘려보낸 메시지의 실체를 잡고,
  // (b) 재접속 2 — 커서가 missedId 로 올라간 것을 잡는다. 커서 갱신은 재전송 루프가 잡은
  // 것이 있을 때만 일어난다(gateway.ts:216-224) — 즉 커서 상승이 곧 재전송 실행의 증거다.
  await closeWs(conn.ws, 'step13 ⑬ 본 소켓 닫기')
  const missedBody = `@TO(${BOT_NAME}) 자리 비운 사이 메시지`
  const sentM = await api(port, 'POST', `/api/rooms/${roomId}/messages`, { cookie, form: messageForm(missedBody) })
  assert(sentM.status === 200 && typeof sentM.body?.message?.id === 'number', 'step13 ⑬ 오프라인 메시지 저장이 200 이 아니다')
  const missedId = sentM.body.message.id as number
  assert(missedId > msg7id, 'step13 ⑬ 오프라인 메시지 id 가 ⑦ 이후가 아니다')
  const re1 = await connectV2(port, token).catch(e => fail(`step13 ⑬ 재접속 실패: ${e?.message ?? e}`))
  assert(re1.welcome.missed_after_id === msg7id, 'step13 ⑬ 재접속 welcome 의 커서가 ⑦ 이후가 아니다')
  const hMp = nextInner(re1.ws, 'step13 ⑬ 재접속 후 history_response', i => i.type === 'history_response' && i.rid === 'e2e-missed')
  re1.ws.send(JSON.stringify({ type: 'history_request', rid: 'e2e-missed', limit: 100 }))
  const hM = await hMp
  assert(Array.isArray(hM.messages) && hM.messages.some((m: any) => m.id === missedId && m.body === missedBody),
    'step13 ⑬ 흘려보낸 메시지가 재접속 후 이력에 없다')
  await closeWs(re1.ws, 'step13 ⑬ 재접속 1 닫기')
  const re2 = await connectV2(port, token).catch(e => fail(`step13 ⑬ 재접속 2 실패: ${e?.message ?? e}`))
  assert(re2.welcome.missed_after_id === missedId, 'step13 ⑬ 재전송 루프가 커서를 올리지 않았다 — 재전송이 일어나지 않았다')
  await closeWs(re2.ws, 'step13 ⑬ 재접속 2 닫기')
  step(13)

  // ⑭ 서버 재시작 영속성 (REQ-E2E-008·010) — 재시작 전에 동일성 표적을 기록한다:
  // 메시지 id·본문(⑬), 첨부 id·바이트(⑧⑨), 봇 토큰(④). 커서(⑬ 재접속 2 가 올린 값)도 함께 기록한다.
  const recMsgId = missedId
  const recMsgBody = missedBody
  const recAttId = attId
  const recBytes = botFileBytes
  const recToken = token
  const recCursor = missedId
  // 재기동 포트 설계 — 기본은 새 빈 포트를 다시 잡는다. 죽은 리스너의 포트를 곧바로 재바인드하는 것은
  // 다른 프로세스가 그 포트를 가로채는 작은 경주를 다시 사는 것이고, 영속성의 실체는 포트가 아니라
  // 데이터 디렉터리다(REQ-E2E-008 은 같은 데이터 디렉터리를 요구하지 같은 포트를 요구하지 않는다).
  // E2E_FORCE_PORT 가 걸려 있으면 그 값을 양쪽 기동이 그대로 쓴다 — 강제 포트의 의미가 유지된다.
  const second = await acquirePort()
  await stopServer(proc.child!)
  proc.child = spawnServer(second.forServer, dataDir, botFilesDir)
  await waitForBoot(proc.child, second.forProbe)
  // 대조 1 — 메시지 id·본문: 목록에서 id 로 찾아 본문이 그대로인다. 세션 쿠키도 이 조회로 함께 검증된다
  // (sessions 표가 DB 에 남아 있으므로 재시작 전 로그인 쿠키가 살아 있어야 200 이 나온다)
  const list14 = await api(second.forProbe, 'GET', `/api/rooms/${roomId}/messages`, { cookie })
  assert(list14.status === 200, 'step14 ⑭ 재시작 후 방 목록 조회가 200 이 아니다 — 세션도 살아 있어야 한다')
  const found14 = (list14.body?.messages ?? []).find((m: any) => m.id === recMsgId)
  assert(found14 && found14.body === recMsgBody, 'step14 ⑭ 재시작 후 메시지 id·본문이 동일하지 않다')
  // 대조 2 — 첨부 id·바이트
  const dl14 = await fetch(`http://127.0.0.1:${second.forProbe}/api/attachments/${recAttId}`, { headers: { cookie } })
  assert(dl14.status === 200, 'step14 ⑭ 재시작 후 첨부 내려받기가 200 이 아니다')
  const bytes14 = Buffer.from(await dl14.arrayBuffer())
  assert(Buffer.compare(bytes14, recBytes) === 0, 'step14 ⑭ 재시작 후 첨부 바이트가 동일하지 않다')
  // 대조 3 — 같은 토큰으로 v2 재접속 → 봉투 welcome. 세션은 메모리에서 비지만 커서는 DB 에 남는다 —
  // welcome 의 missed_after_id 가 재시작 전 값(⑬) 그대로인 것까지 함께 잰다
  const conn3 = await connectV2(second.forProbe, recToken).catch(e => fail(`step14 ⑭ 재시작 후 v2 재접속 실패: ${e?.message ?? e}`))
  assert(conn3.welcome.room_id === roomId && conn3.welcome.bot_id === botId, 'step14 ⑭ 재접속 welcome 의 room·bot 이 다르다')
  assert(conn3.welcome.missed_after_id === recCursor, 'step14 ⑭ 재접속 welcome 의 커서가 재시작 전 값이 아니다')
  step(14)

  // ⑮ 방 보관 후 접속 거부 — 보관 훅이 그 방 접속을 끊고(routes-rooms.ts:88 onArchive → gateway.closeRoom),
  // 보관된 방은 hello 조회(r.status='active' 조건, gateway.ts:160)에서 걸려 새 접속은 welcome 전에 닫힌다
  const arch = await api(second.forProbe, 'POST', `/api/rooms/${roomId}/archive`, { cookie })
  assert(arch.status === 200, 'step15 ⑮ 방 보관이 200 이 아니다')
  await expectServerClose(conn3.ws, 'step15 ⑮ 보관 후 기존 접속 닫힘')
  let freshRejected = false
  await connectV2(second.forProbe, recToken).then(() => { freshRejected = false }).catch(() => { freshRejected = true })
  assert(freshRejected, 'step15 ⑮ 보관된 방에 새 접속이 거절되지 않았다')
  step(15)
}

/** M1: 포트 → mkdtemp(+봇 첨부 뿌리) → spawn → 시한 있는 health 대기.
 *  M2: 그 뒤 runScenarios 로 ①~⑬ 를 수행.
 *  M3: ⑭ 에서 runScenarios 가 서버를 kill 후 같은 데이터 디렉터리로 재기동한다(proc.child 교체) —
 *  최종 정리는 그 현재 서버를 거둔다. */
export async function main(): Promise<number> {
  const proc: { child: ChildProcess | null } = { child: null }
  let dataDir: string | null = null
  try {
    await checkDependencies()
    const { forServer, forProbe } = await acquirePort()
    dataDir = mkdtempSync(path.join(tmpdir(), 'minidiscord-e2e-'))
    // 봇 첨부 뿌리 — dataDir 안의 하위 경로. 정리는 dataDir 재귀 삭제가 함께 거둔다(cleanup).
    const botFilesDir = path.join(dataDir, 'bot-files')
    mkdirSync(botFilesDir, { recursive: true })
    proc.child = spawnServer(forServer, dataDir, botFilesDir)
    await waitForBoot(proc.child, forProbe)
    await runScenarios(forProbe, dataDir, botFilesDir, proc)
    console.log('E2E PASS — 15 단계 전부 통과')
    return 0
  } finally {
    await cleanup(proc.child, dataDir)
  }
}

// 직접 실행(npx tsx scripts/e2e.mts)일 때만 main 을 돌린다 — 측정이 import 만으로
// main 을 건드리지 않게 하려는 가드다. process.exit 대신 exitCode 로 끝내 pipe 유출을 막는다.
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
