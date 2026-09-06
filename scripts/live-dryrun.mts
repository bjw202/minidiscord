// scripts/live-dryrun.mts — SPEC-LIVEENV-001 가짜 채널 예행 (REQ-014 · AC-LIVEENV-014)
//
// 실 세션을 쓰기 전에 §A 순서를 한 바퀴 돈다. 이 예행은 서버 프로세스 하나와 평범한
// WebSocket 클라이언트만 쓰며, 세션을 띄우지 않고 유료 API 를 부르지 않는다.
//
// [D4(b) 배치 근거] `scripts/e2e.mts` 안에 넣지 않는다 — 그 파일은 시나리오를 열다섯으로
// 못박고 진행 표지 `[n/15]` 를 기준으로 쓰므로, 안에 덧붙이면 그 수와 표지가 흔들린다.
// 헬퍼는 상대 import 로 가져다 쓴다 — 사본을 늘리지 않는다.
//
// [HARD] 종결 조건은 추출기가 «기대한 파일 집합» 을 만드는 것이다. 대화 기록 유래 산출은
// 그 집합에서 빠진다 — 예행은 세션을 띄우지 않으므로 대화 기록이 애초에 생기지 않고,
// 없는 것을 만들라고 적으면 이 예행은 영구히 빨갛다.

import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { acquirePort, api, checkDependencies, spawnServer, stopServer, waitForBoot } from './e2e.mts'
import { runExtract, type SurfaceInput } from '../server/test/live-extract-lib.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const USER = { username: 'liveenv-dryrun', password: 'liveenv-dryrun-pass' }
const BOT_NAME = 'pm'
// 봇이 «스스로 지어낸» 표지. 요청 어디에도 없고, 예행 밖에서 만들어질 수 없다.
const MARKER = 'Dr7yRun9'.slice(0, 8)

function log(s: string): void { console.log(s) }

/** 예행이 낳은 자손만 센다 — 기계 전체의 claude 를 세지 않는다(AC-LIVEENV-014 ㉢). */
function pgrepCount(args: string[]): number {
  try {
    const out = execFileSync('pgrep', args, { encoding: 'utf8' })
    return out.split('\n').filter(l => l.trim() !== '').length
  } catch {
    return 0   // pgrep 은 적중이 없으면 1 로 끝난다 — 그것이 0건이다
  }
}

async function main(): Promise<number> {
  await checkDependencies()
  const { connectV2 } = await import('../server/test/gateway-v2.ts')

  const outDir = path.join(ROOT, '.moai/specs/SPEC-LIVEENV-001/evidence/dryrun')
  const dataDir = path.join(ROOT, 'data/live-dryrun')
  const botFilesDir = path.join(dataDir, 'bot-files')
  rmSync(dataDir, { recursive: true, force: true })
  mkdirSync(botFilesDir, { recursive: true })
  mkdirSync(outDir, { recursive: true })

  // ㉢ 의 기준선 — 예행 «전» 의 기계 전체 세션 수. 판정선이 아니라 증분의 앞자리다.
  const claudeBefore = pgrepCount(['-x', 'claude'])
  // 좁은 판별자도 -P 가 없어 «기계 전체» 를 잰다 — 절대 0 은 판정선이 될 수 없다(AC-014 ㉢, 리드 처분 33).
  // 하필 이 플래그가 spec.md §1.2 F-15 의 다섯째 사람 손이라, 이 카드가 실 세션을 띄우면 값이 1 이상이 된다.
  // 그래서 넓은 판별자와 같은 형태로 «이 예행이 만든 증분» 을 잰다. 기준선은 예행이 시작하는 지금 잡는다.
  const narrowBefore = pgrepCount(['-f', 'dangerously-load-development-channels'])
  const dryrunPid = process.pid
  log(`[dryrun] pid=${dryrunPid} claude_before=${claudeBefore} narrow_before=${narrowBefore}`)

  const port = await acquirePort()
  let child: ChildProcess | null = spawnServer(port.forServer, dataDir, botFilesDir)
  await waitForBoot(child, port.forProbe)
  const p = port.forProbe
  log('[dryrun] ① 서버 기동')

  // ② 초대 — 사람이 손으로 맞추던 자리를 코드가 한다
  await api(p, 'POST', '/api/auth/register', { json: USER })
  const login = await api(p, 'POST', '/api/auth/login', { json: USER })
  const cookie = login.res.headers.getSetCookie?.()?.[0]?.split(';')[0] ?? ''
  if (!cookie) { console.error('[dryrun] 로그인 쿠키를 얻지 못했다'); return 1 }
  const room = await api(p, 'POST', '/api/rooms', { cookie, json: { name: 'live-env dry run' } })
  const roomId = room.body.id as number
  const bot = await api(p, 'POST', '/api/bots', { cookie, json: { name: BOT_NAME, description: 'live-env dry run' } })
  const botId = bot.body.id as number
  const inv = await api(p, 'POST', `/api/rooms/${roomId}/invites`, { cookie, json: { bot_id: botId } })
  const token = inv.body.token as string
  log('[dryrun] ② 초대 발급')

  // ③ 접속 — 평범한 WebSocket 클라이언트다. 세션이 아니다.
  const conn = await connectV2(p, token)
  log('[dryrun] ③ 가짜 채널 접속')

  // ④ @TO 왕복 — 봇이 스스로 지어낸 표지를 «답변 본문» 에 담아 되돌린다.
  await api(p, 'POST', `/api/rooms/${roomId}/messages`, {
    cookie, form: (() => { const f = new FormData(); f.set('body', `@TO(${BOT_NAME}) 무작위 8자리를 지어내 답 끝에 붙여줘`); return f })(),
  })
  conn.ws.send(JSON.stringify({ type: 'bot_message', body: `확인했습니다 ${MARKER}` }))
  log('[dryrun] ④ @TO 왕복')

  // ⑤ 멘션 없는 두 줄 — A09 의 재료다
  for (const line of ['멘션 없는 첫째 줄 alpha77', '멘션 없는 둘째 줄 beta88']) {
    await api(p, 'POST', `/api/rooms/${roomId}/messages`, {
      cookie, form: (() => { const f = new FormData(); f.set('body', line); return f })(),
    })
  }
  log('[dryrun] ⑤ 멘션 없는 두 줄')

  // ⑥ 이력 회수 — since_id 커서
  conn.ws.send(JSON.stringify({ type: 'history_request', rid: 'dryrun-h1', limit: 100 }))
  await new Promise(r => setTimeout(r, 500))
  log('[dryrun] ⑥ 이력 회수')

  // ⑦ 재시작 — 같은 데이터 디렉터리로 다시 띄운다 (A11 의 재료)
  await stopServer(child); child = null
  const second = await acquirePort()
  child = spawnServer(second.forServer, dataDir, botFilesDir)
  await waitForBoot(child, second.forProbe)
  const p2 = second.forProbe
  const relogin = await api(p2, 'POST', '/api/auth/login', { json: USER })
  const cookie2 = relogin.res.headers.getSetCookie?.()?.[0]?.split(';')[0] ?? cookie
  log('[dryrun] ⑦ 서버 재시작')

  // ㉢ 관측 — 예행이 도는 «지금» 잰다. 자손 판별자가 이 예행이 낳은 것을 겨눈다.
  const narrowAfter = pgrepCount(['-f', 'dangerously-load-development-channels'])
  const descendantClaude = pgrepCount(['-P', String(dryrunPid), '-x', 'claude'])
  const descendantAny = pgrepCount(['-P', String(dryrunPid)])
  const claudeDuring = pgrepCount(['-x', 'claude'])

  // ⑧ 보관 — 되돌릴 수 없으므로 마지막이다 (A12)
  await api(p2, 'POST', `/api/rooms/${roomId}/archive`, { cookie: cookie2 })
  log('[dryrun] ⑧ 방 보관')

  // ── 추출기 구동 ────────────────────────────────────────────────────
  const procFacts: SurfaceInput['processes'] = { established: 0, listenPid: String(child.pid ?? '') }
  const code = runExtract({
    out: outDir,
    db: path.join(dataDir, 'minidiscord.db'),
    transcriptDir: null,          // 예행은 세션을 띄우지 않는다 — ㉠ 표면은 원리적으로 미도달이다
    globalConfig: path.join(ROOT, 'data/live-dryrun/absent-global.json'),
    processes: procFacts,
  })
  log(`[dryrun] ⑨ 추출기 종료 코드 = ${code}`)

  await stopServer(child); child = null

  // ── 기대한 파일 집합 대조 ──────────────────────────────────────────
  const expected = ['manifest.json', 'A08-fetch-history.txt', 'A09-since-id.txt',
    'A11-restart.txt', 'A12-archived.txt', 'A01-db-row.txt']
  const missing = expected.filter(f => !existsSync(path.join(outDir, f)))
  // 대화 기록 유래 산출은 «없어야» 한다 — 예행이 원리적으로 닿지 못하는 표면이다
  const forbidden = ['A01-reply-arg.txt'].filter(f => existsSync(path.join(outDir, f)))

  const manifest = JSON.parse(readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
  const a01 = manifest.items.find((i: any) => i.name === 'A01 ㉣')

  const report = [
    `dryrun_pid=${dryrunPid}`,
    `claude_before=${claudeBefore}`,
    `claude_during=${claudeDuring}`,
    `claude_delta=${claudeDuring - claudeBefore}`,
    `pgrep_narrow_before=${narrowBefore}`,
    `pgrep_narrow_after=${narrowAfter}`,
    `pgrep_narrow_delta=${narrowAfter - narrowBefore}`,
    `pgrep_descendant_claude=${descendantClaude}`,
    `pgrep_descendant_any=${descendantAny}`,
    `extract_exit=${code}`,
    `expected_missing=${missing.length}${missing.length ? ' — ' + missing.join(',') : ''}`,
    `forbidden_present=${forbidden.length}${forbidden.length ? ' — ' + forbidden.join(',') : ''}`,
    `a01_status=${a01?.status}`,
    `marker_planted=${MARKER}`,
  ]
  writeFileSync(path.join(outDir, 'dryrun-report.txt'), report.join('\n') + '\n')
  for (const line of report) log(`[dryrun] ${line}`)

  const ok = missing.length === 0 && forbidden.length === 0
    && narrowAfter === narrowBefore && descendantClaude === 0
    && claudeDuring === claudeBefore
    && a01?.status === 'UNMEASURED'
  log(`[dryrun] VERDICT=${ok ? 'PASS' : 'FAIL'}`)
  return ok ? 0 : 1
}

const isDirectRun = process.argv[1] !== undefined && process.argv[1].endsWith('live-dryrun.mts')
if (isDirectRun) {
  main().then(c => { process.exitCode = c }).catch(e => { console.error(e); process.exitCode = 1 })
}
