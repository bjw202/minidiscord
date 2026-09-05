// SPEC-WSUPGRADE-001 3회차 M4 — AC-WSUPGRADE-005 판정기(.moai/reports/t39/m4r2/).
// 재설계된 기준(acceptance v0.7.0 AC-005)의 세 조항을 기계로 잰다:
//   (1) 그 실행의 포획 기록 파일이 존재하고 안에 응답 항목이 1건 이상이다.
//   (2) 대상 시험이 failed 로 집계된다.
//   (3) 실패 메시지가 관측된 상태 코드를 담고(포획 기록의 statusCode 와 일치),
//       시간 초과 어간(`Test timed out`)을 닫지 않는다.
// 1회차의 CRITERION-FAILURE(«실패했는가»만 쟀음)와 다른 축 — 실패의 모양을 잰다.
//
// 용법: node ac005-verdict.mjs <run.log> <capture.json|없음>
//   capture 자리에 리터럴 `none` 을 주면 포획 부재로 판정한다(리스너 삭제 변이용).
import { readFileSync, existsSync } from 'node:fs'

const [logPath, capPath] = process.argv.slice(2)
if (!logPath || !capPath) {
  console.error('용법: node ac005-verdict.mjs <run.log> <capture.json|none>')
  process.exit(2)
}

const log = readFileSync(logPath, 'utf8')
const TARGET = 'history_request applies limit before since_id, speaker, since and until'

// (2) 대상 시험 실패 — 로그에 대상 시험의 FAIL 행이 있어야 한다.
const failedLine = log.split('\n').find(l => l.includes(`FAIL`) && l.includes(TARGET))
const clause2 = Boolean(failedLine)

// 실패 메시지 — Failed Tests 절의 첫 `Error: ` 행.
const errIdx = log.indexOf('Failed Tests')
const errMsg = errIdx >= 0 ? (log.slice(errIdx).match(/^Error: .*$/m)?.[0] ?? '(실패 메시지 없음)') : '(실패 절 없음)'

// (1) 포획 존재.
let cap = null
if (capPath !== 'none' && existsSync(capPath)) {
  try { cap = JSON.parse(readFileSync(capPath, 'utf8')) } catch { cap = null }
}
const clause1 = cap !== null && typeof cap.statusCode === 'number'

// (3) 모양 — 관측 코드 일치 + 시간 초과 어간 부재. 포획이 없으면 비교할 코드가 없으므로 n/a.
const codeInMsg = cap ? errMsg.includes(`Unexpected server response: ${cap.statusCode}`) : false
const timedOut = errMsg.includes('Test timed out')
const clause3 = cap ? (codeInMsg && !timedOut) : null

const rows = [
  `(1) 포획 기록 존재(1건 이상): ${clause1 ? 'PASS' : 'FAIL'}`,
  `(2) 대상 시험 failed: ${clause2 ? 'PASS' : 'FAIL'}`,
  `(3) 실패가 관측 코드를 실은 응답자 오류(시간 초과 아님): ${clause3 === null ? 'n/a(포획 부재 — 비교할 코드 없음)' : clause3 ? 'PASS' : 'FAIL'}`,
]
console.log(`AC-005 판정 — ${logPath}`)
console.log(`  실패 메시지: ${errMsg}`)
console.log(rows.join('\n'))

if (clause1 && clause2 && clause3 === true) {
  console.log('AC-005: PASS — 세 조항 모두 성립')
  process.exit(0)
}
const bad = [!clause1 && '(1)', !clause2 && '(2)', clause3 === false && '(3)'].filter(Boolean)
console.log(`AC-005: RED — 어긋난 조항: ${bad.join(' ')}`)
process.exit(1)
