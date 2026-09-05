// scripts/live-extract.mts — SPEC-LIVEENV-001 증거 추출기의 CLI (REQ-010 ~ REQ-013)
//
// 순수 함수는 ../server/test/live-extract-lib.ts 에 있고 이 파일은 그것을 구동한다.
// 배치 근거는 그 파일의 머리 주석에 있다.
//
// [HARD] 종료 코드는 status 와 같은 세 값이다 — 0 재서 통과 · 1 재서 실패 · 2 재지 못함.

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runCapture, runExtract, type SurfaceInput } from '../server/test/live-extract-lib.ts'

function argOf(argv: string[], name: string): string | null {
  const i = argv.indexOf(name)
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null
}

const invokedDirectly = process.argv[1]?.endsWith('live-extract.mts')
if (invokedDirectly) {
  const argv = process.argv.slice(2)
  const sub = argv[0] ?? 'extract'
  const root = execFileSync('git', ['-C', path.dirname(process.argv[1]!), 'rev-parse', '--show-toplevel'],
    { encoding: 'utf8' }).trim()
  const out = argOf(argv, '--out') ?? path.join(root, '.moai/specs/SPEC-LIVEENV-001/evidence')

  if (sub === 'capture') {
    process.exit(runCapture(out))
  }

  const procFile = argOf(argv, '--processes')
  let processes: SurfaceInput['processes'] = null
  if (procFile && existsSync(procFile)) {
    try { processes = JSON.parse(readFileSync(procFile, 'utf8')) } catch { processes = null }
  }
  process.exit(runExtract({
    out,
    db: argOf(argv, '--db'),
    transcriptDir: argOf(argv, '--transcript-dir'),
    globalConfig: argOf(argv, '--global-config') ?? path.join(homedir(), '.claude.json'),
    processes,
  }))
}
