// scripts/e2e-lib.mts — 두 종단 간 러너(e2e.mts · e2e-scenario.mts)가 함께 쓰는 조작과 상수.
//
// 여기 있는 것은 전부 «전선» 도구다 — HTTP 와 WebSocket 으로만 말을 걸며 server/src/** 를 import 하지 않는다.
// 정의는 e2e.mts 에서 «옮겨 온» 것이고 복사본이 아니다: 두 벌이 되면 첫째 러너의 출력이 조용히 갈라진다.
//
// 경계 하나 — step(n) 은 여기 없다. 표지 문자열(`[n/15]` · `[n/N]`)과 stepsPassed 상태는 러너마다 다르므로
// 각 러너가 자기 것을 든다(plan.md §B.6).

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:net'

// 프로젝트 뿌리 — 이 파일의 위치(scripts/)에서 역산한다. cwd 가 어디서든 같은 서버를 찾는다.
export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const BOOT_TIMEOUT_MS = 30_000   // /api/health 시한 — 무한 대기 금지
export const POLL_INTERVAL_MS = 200
export const FRAME_TIMEOUT_MS = 10_000  // 프레임·조건 대기의 기본 시한 — 무한 대기는 실패를 숨긴다
export const QUIET_MS = 600             // «오지 않는다» 를 재는 침묵 창

// 종료 코드 규약: 9 는 기동 시한 전용. 그 외 실패는 1.
export const EXIT_BOOT_TIMEOUT = 9
export const EXIT_FAILED = 1

/** 사용자에게 이미 한 줄을 출력한 뒤 던지는 종료 운반체 — 러너는 스택 없이 이 코드로 끝낸다 */
export class E2eError extends Error {
  constructor(readonly exitCode: number) { super(`exit ${exitCode}`) }
}

/** 의존성 부재 경로: 한 줄 안내 + exit 1. `ws` 는 spawn 된 서버와 이 러너가 함께 쓰는 클라이언트 의존성이다.
 *  정적 import 하면 npm install 전 상태에서 모듈 적재가 검사보다 먼저 스택으로 죽으므로 늦게 채운다.
 *  export 된 `let` 이라 ESM 의 살아 있는 바인딩으로 러너 쪽 `WS` 도 채워진 뒤의 값을 본다. */
export let WS: any

export async function checkDependencies(): Promise<void> {
  try {
    ;({ default: WS } = await import('ws'))
  } catch {
    console.error('의존성이 해소되지 않습니다 — 먼저 `npm install` 을 돌리세요.')
    throw new E2eError(EXIT_FAILED)
  }
}

/** 포트 확보: E2E_FORCE_PORT 가 있으면 그 값을 그대로 쓴다. 없으면 이 순간 빈 포트를 하나 잡는다. */
export async function acquirePort(): Promise<{ forServer: string; forProbe: number }> {
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

/** 서버 spawn — 별도 프로세스, 실제 전선. detached 로 프로세스 그룹을 만들어 npx→tsx→node 중간 단계가 있어도
 *  그룹 전체를 거둘 수 있게 한다. 환경변수는 server/src/config.ts 가 실제로 읽는 것들이다. */
export function spawnServer(portForServer: string, dataDir: string, botFilesDir: string): ChildProcess {
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

/** 채널 플러그인 프로세스 — 둘째 러너의 선택 마일스톤(G7, `--with-channel`)만 쓴다. 시나리오 파일이 `spawn(` 을
 *  직접 부르지 않도록 여기에 둔다(AC-E2ESCEN-012 (5)). 빌드가 없으면 한 줄로 안내하고 끝낸다. */
export function spawnChannel(token: string, serverUrl: string): ChildProcess {
  const entry = path.join(PROJECT_ROOT, 'channel', 'dist', 'index.js')
  if (!existsSync(entry)) {
    console.error('channel/dist/index.js 가 없습니다 — 먼저 `npm run build -w channel` 을 돌리세요.')
    throw new E2eError(EXIT_FAILED)
  }
  return spawn('node', [entry], {
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'inherit'],
    env: { ...process.env, MINIDISCORD_TOKEN: token, MINIDISCORD_SERVER: serverUrl },
  })
}

/** 시한 있는 기동 대기: 준비 신호는 /api/health 가 응답하는 것 — 고정 sleep 이 아니다.
 *  시한 초과 또는 서버 프로세스가 먼저 죽으면 [boot-timeout] 을 딱 한 번 찍고 exit 9 로 끝낸다. */
export async function waitForBoot(child: ChildProcess, probePort: number): Promise<void> {
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

/** 서버 프로세스 그룹을 거둔다 — SIGTERM → 3초 유예 → SIGKILL. 최종 정리와 재시작 단계가 함께 쓴다. */
export async function stopServer(child: ChildProcess): Promise<void> {
  if (!child.pid) return
  const dead = new Promise<void>(resolve => child.once('exit', () => resolve()))
  try { process.kill(-child.pid, 'SIGTERM') } catch { /* 이미 죽었다 */ }
  await Promise.race([dead, new Promise<void>(resolve => setTimeout(resolve, 3_000))])
  if (child.exitCode === null && child.signalCode === null) {
    try { process.kill(-child.pid, 'SIGKILL') } catch { /* 이미 죽었다 */ }
    await dead
  }
}

// ── 시나리오 공용 조작 ─────────────────────────────────────────────────────

/** 한 줄 실패 — 표지는 단언 성공 뒤에만 찍히므로, 마지막 표지가 곧 실패 위치의 증거다 */
export function fail(label: string): never {
  console.error(`[fail] ${label}`)
  throw new E2eError(EXIT_FAILED)
}

export function assert(cond: unknown, label: string): asserts cond {
  if (!cond) fail(label)
}

/** 시한 래퍼 — 도우미를 지나지 않는 `await` 대기(스트림 읽기·닫힘 대기 등)를 감싼다. 시한 없는 대기를 남기지
 *  않으려는 REQ-E2ESCEN-013 의 도구이며, 러너 파일에 날것 setTimeout 이 나타나지 않게 한다. */
export function withDeadline<T>(promise: Promise<T>, label: string, timeoutMs = FRAME_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`[fail] ${label} — 시한 ${timeoutMs}ms 를 넘겼다`)
      reject(new E2eError(EXIT_FAILED))
    }, timeoutMs)
    promise.then(
      value => { clearTimeout(timer); resolve(value) },
      err => { clearTimeout(timer); reject(err) },
    )
  })
}

/** 고정 시간 대기 — 벽시계 초 넘김처럼 «지날 때까지» 를 재는 자리에서만 쓴다. 시한 있는 폴링(pollUntil)의
 *  간격 구현이기도 하다. 러너 파일이 setTimeout 을 직접 부르지 않도록 여기에 둔다. */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** multipart 폼 하나 — 메시지 라우트는 req.parts() multipart 만 받는다 */
export function messageForm(body: string): FormData {
  const fd = new FormData()
  fd.append('body', body)
  return fd
}

/** JSON/폼 HTTP 호출 — 상태 코드·본문·원응답(쿠키 헤더용)을 돌려준다 */
export async function api(port: number, method: string, path: string, init: { cookie?: string; json?: unknown; form?: FormData } = {}): Promise<{ status: number; body: any; res: Response }> {
  const headers: Record<string, string> = {}
  if (init.cookie) headers.cookie = init.cookie
  let body: FormData | string | undefined
  if (init.form) body = init.form
  else if (init.json !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(init.json) }
  const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body })
  return { status: res.status, body: await res.json().catch(() => null), res }
}

/** 접속 시점부터 프레임을 큐에 쌓는다 — welcome 과 재전송 프레임은 서버가 같은 동기 블록에서 연속으로 보내므로
 *  리스너를 나중에 달면 놓친다. 큐가 그 경계를 없앤다. */
export type Inbox = { queue: any[]; waiters: { resolve: (m: any) => void; timer: NodeJS.Timeout }[] }
const inboxes = new WeakMap<object, Inbox>()

/** 소켓 하나에 빈 큐를 붙이고 그것을 돌려준다 — connect 가 쓰고, 인프로세스 시험이 실제 소켓 없이 큐를 세울 때도 쓴다 */
export function registerInbox(ws: object): Inbox {
  const inbox: Inbox = { queue: [], waiters: [] }
  inboxes.set(ws, inbox)
  return inbox
}

/** v2 접속 — 맨몸 hello{token} 하나를 보내고 맨몸 welcome 으로 해소된다. welcome 은 큐에 넣지 않는다. */
export function connect(port: number, token: string, label: string): Promise<{ ws: any; welcome: any }> {
  return new Promise((resolve, reject) => {
    const ws = new WS(`ws://127.0.0.1:${port}/bot`)
    const inbox = registerInbox(ws)
    let welcomed = false
    const timer = setTimeout(() => {
      console.error(`[fail] ${label} — 시한 ${FRAME_TIMEOUT_MS}ms 안에 welcome 이 오지 않았다`)
      reject(new E2eError(EXIT_FAILED))
    }, FRAME_TIMEOUT_MS)
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token })))
    ws.on('message', (data: unknown) => {
      const msg = JSON.parse(String(data))
      if (msg.type === 'welcome' && !welcomed) {
        welcomed = true
        clearTimeout(timer)
        resolve({ ws, welcome: msg })
        return
      }
      const w = inbox.waiters.shift()
      if (w) { clearTimeout(w.timer); w.resolve(msg) } else inbox.queue.push(msg)
    })
    ws.on('error', () => { /* 닫힘으로 귀결된다 */ })
    ws.on('close', () => {
      if (!welcomed) { clearTimeout(timer); console.error(`[fail] ${label} — welcome 전에 닫혔다`); reject(new E2eError(EXIT_FAILED)) }
    })
  })
}

/** 큐에 이미 들어온 것이 있으면 그것을 먼저 돌려준다 — 조건에 맞는 첫 프레임까지 기다린다 */
export function nextFrame(ws: any, label: string, predicate: (m: any) => boolean = () => true, timeoutMs = FRAME_TIMEOUT_MS): Promise<any> {
  const inbox = inboxes.get(ws)!
  const deadline = Date.now() + timeoutMs
  const take = (): Promise<any> => {
    if (inbox.queue.length > 0) return Promise.resolve(inbox.queue.shift())
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = inbox.waiters.findIndex(w => w.timer === timer)
        if (i >= 0) inbox.waiters.splice(i, 1)
        console.error(`[fail] ${label} — 시한 안에 해당 프레임이 오지 않았다`)
        reject(new E2eError(EXIT_FAILED))
      }, Math.max(1, deadline - Date.now()))
      inbox.waiters.push({ resolve, timer })
    })
  }
  return (async () => {
    for (;;) {
      const m = await take()
      if (predicate(m)) return m
    }
  })()
}

/** 오지 말아야 할 프레임이 오지 않음을 관측한다 — 큐에 이미 쌓여 있어도 실패다 */
export async function expectQuiet(ws: any, label: string): Promise<void> {
  const inbox = inboxes.get(ws)!
  if (inbox.queue.length > 0) fail(`${label} — 오지 말아야 할 프레임: ${JSON.stringify(inbox.queue[0])}`)
  const got = await new Promise<any | null>(resolve => {
    const timer = setTimeout(() => {
      const i = inbox.waiters.findIndex(w => w.timer === timer)
      if (i >= 0) inbox.waiters.splice(i, 1)
      resolve(null)
    }, QUIET_MS)
    inbox.waiters.push({ resolve, timer })
  })
  if (got !== null) fail(`${label} — 오지 말아야 할 프레임: ${JSON.stringify(got)}`)
}

/** 조건이 참이 될 때까지 HTTP 를 짧게 재묻는다 — 고정 sleep 로 상태를 가정하지 않는다 */
export async function pollUntil<T>(label: string, probe: () => Promise<T | null>, timeoutMs = FRAME_TIMEOUT_MS): Promise<T> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const found = await probe()
    if (found !== null) return found
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  fail(`${label} — 시한 ${timeoutMs}ms 안에 조건이 참이 되지 않았다`)
}

/** 소켓을 닫고 닫힘까지 기다린다 */
export function closeWs(ws: any, label: string): Promise<void> {
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

export async function listMessages(port: number, cookie: string, roomId: number): Promise<any[]> {
  const list = await api(port, 'GET', `/api/rooms/${roomId}/messages`, { cookie })
  assert(list.status === 200, `방 ${roomId} 목록 조회가 200 이 아니다`)
  return list.body?.messages ?? []
}
