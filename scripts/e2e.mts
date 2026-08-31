// scripts/e2e.mts — SPEC-E2E-001 종단 간 시나리오 러너 (Tier M · 카드 t6 · M1 골격)
//
// [D1(a) 공시 — 워크스페이스 경계를 가로지르는 import] M2 부터 이 스크립트는
// ../server/test/gateway-v2.ts 의 connectV2·innerOf 를 상대 경로로 가져다 쓴다. 그 하네스는
// 구현(server/src)의 함수를 부르지 않고 열쇠를 스스로 유도한다(gateway-v2.ts:1-5 주석) —
// 재사용이 인증 독립성 축을 깨지 않는다.
// 반대 방향은 금지다(plan.md §D-1): 이 스크립트는 server/src/** 를 import 하지 않는다.
// 서버는 실제 프로세스로 spawn 하고, 이 스크립트는 HTTP(/api/health)와 WebSocket 전선으로만 말을 건다.
//
// M1 골격 — 포트 확보 → 임시 데이터 디렉터리 → 서버 spawn → 시한 있는 /api/health 폴링 →
// 정상·단언 실패·예외 세 경로 전부의 정리. 시나리오 단계 ①~⑮ 은 M2 가 채운다.

// @MX:TODO: [AUTO] M2 — REQ-E2E-007 의 ①~⑮ 단계를 main 의 시나리오 자리에 채운다. step(n) 호출은 단언 성공 뒤에만
// @MX:NOTE: [AUTO] ../server/test/gateway-v2.ts 상대 import 는 D1(a) 재사용 — 하네스가 구현을 부르지 않아 독립성 축 유지 (plan.md §D-2)

import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createServer } from 'node:net'

// 프로젝트 뿌리 — 이 파일의 위치(scripts/)에서 역산한다. cwd 가 어디서든 같은 서버를 찾는다.
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const BOOT_TIMEOUT_MS = 30_000   // /api/health 시한 — 무한 대기 금지 (REQ-E2E-006)
const POLL_INTERVAL_MS = 200

// 종료 코드 규약: 9 는 기동 시한 전용(REQ-E2E-006). 그 외 실패는 9 를 쓰지 않는다 —
// 두 경로가 코드를 나눠 갖지 않으면 AC-E2E-006 이 공허해진다(plan.md §C).
const EXIT_BOOT_TIMEOUT = 9
const EXIT_FAILED = 1

/** 사용자에게 이미 한 줄을 출력한 뒤 던지는 종료 운반체 — 러너는 스택 없이 이 코드로 끝낸다 */
class E2eError extends Error {
  constructor(readonly exitCode: number) { super(`exit ${exitCode}`) }
}

/** 의존성 부재 경로: 한 줄 안내 + exit 1 (스택 트레이스 없음, 9 가 아니다).
 *  `ws` 는 M2 하네스(gateway-v2.ts)와 spawn 된 서버가 함께 쓰는 클라이언트 의존성이다 —
 *  npm install 전 상태에서 이 검사가 서버 기동 실패(exit 9)보다 먼저 걸린다. */
export function checkDependencies(): void {
  try {
    createRequire(import.meta.url).resolve('ws/package.json')
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
 *  E2E 시나리오 ⑧첨부 저장·⑨내려받기가 이 서버 환경을 그대로 쓰므로 주입이 필수다.
 *  미주입 시 기동 경고 «MINIDISCORD_BOT_FILES_DIR 이 없어…» 가 M1 초록 실행에서 관측됐다(레인 재현). */
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

/** 정리 — 정상·단언 실패·예외 세 경로 전부에서 finally 로 호출된다(plan.md §D-4).
 *  서버 프로세스 그룹을 먼저 거두고, 다 죽은 뒤 임시 데이터 디렉터리를 지운다.
 *  아무것도 만들어지기 전에 실패하면(child·dataDir null) 아무것도 하지 않는다. */
async function cleanup(child: ChildProcess | null, dataDir: string | null): Promise<void> {
  if (child?.pid) {
    const dead = new Promise<void>(resolve => child.once('exit', () => resolve()))
    try { process.kill(-child.pid, 'SIGTERM') } catch { /* 이미 죽었다 */ }
    await Promise.race([dead, new Promise<void>(resolve => setTimeout(resolve, 3_000))])
    if (child.exitCode === null && child.signalCode === null) {
      try { process.kill(-child.pid, 'SIGKILL') } catch { /* 이미 죽었다 */ }
      await dead
    }
  }
  if (dataDir) rmSync(dataDir, { recursive: true, force: true })
}

/** M1: 포트 → mkdtemp → spawn → 시한 있는 health 대기 → 정리 → exit 0.
 *  M2 가 main 의 이 자리에 ①~⑮ 시나리오를 넣는다(각 단계 끝에서 step(n)). */
export async function main(): Promise<number> {
  let child: ChildProcess | null = null
  let dataDir: string | null = null
  try {
    checkDependencies()
    const { forServer, forProbe } = await acquirePort()
    dataDir = mkdtempSync(path.join(tmpdir(), 'minidiscord-e2e-'))
    // 봇 첨부 뿌리 — dataDir 안의 하위 경로. 정리는 dataDir 재귀 삭제가 함께 거둔다(cleanup).
    const botFilesDir = path.join(dataDir, 'bot-files')
    mkdirSync(botFilesDir, { recursive: true })
    child = spawnServer(forServer, dataDir, botFilesDir)
    await waitForBoot(child, forProbe)
    return 0
  } finally {
    await cleanup(child, dataDir)
  }
}

// 직접 실행(npx tsx scripts/e2e.mts)일 때만 main 을 돌린다 — M2 의 tsx -e 검증이 import 만으로
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
