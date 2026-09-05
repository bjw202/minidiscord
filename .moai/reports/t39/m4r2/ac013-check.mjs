// SPEC-WSUPGRADE-001 3회차 — AC-WSUPGRADE-013 판정기(.moai/reports/t39/m4r2/).
// 복제 기록(m6/summary.txt 형식: `trial=N rc=R captures=C t0=T t1=T1` 행들)의 두 조항을 잰다:
//   (1) 시행 수가 정확히 20이다.
//   (2) 포획이 처음 난 시행 이후에도 시행이 20까지 이어져 있다 — «마지막 포획 시행 번호 ==
//       기록의 마지막 시행 번호 && 그 번호 < 20» 이면 실패(acceptance AC-013 이분 판정).
// 포획 0건이면 (2)의 전제는 불성실이다 — 조항별로 따로 적어 «공허 통과»를 가려 낸다
// (3회차 리드 지시: 시행 수 조항과 정지 규칙 조항을 따로 기록한다).
//
// 용법: node ac013-check.mjs <summary-copy>
import { readFileSync } from 'node:fs'

const p = process.argv[2]
if (!p) { console.error('용법: node ac013-check.mjs <summary-file>'); process.exit(2) }
const trials = []
for (const line of readFileSync(p, 'utf8').split('\n')) {
  const m = line.match(/^trial=(\d+) rc=(\d+) captures=(\d+) t0=(\d+) t1=(\d+)$/)
  if (m) trials.push({ n: +m[1], rc: +m[2], caps: +m[3], t0: +m[4], t1: +m[5] })
}
if (trials.length === 0) { console.error('trial 행이 없다 — 형식이 다르다'); process.exit(2) }

const n = trials.length
const lastTrial = trials[n - 1].n
const capped = trials.filter(t => t.caps > 0)
const lastCap = capped.length ? Math.max(...capped.map(t => t.n)) : null

const c1 = n === 20
const stopAfterCapture = capped.length > 0 && lastCap === lastTrial && lastTrial < 20

console.log(`AC-013 판정 — ${p}`)
console.log(`  시행 수: ${n} (조항 (1) ${c1 ? 'PASS' : 'FAIL'})`)
if (capped.length === 0) {
  console.log('  정지 규칙(조항 (2)): 전제 불성실 — 포획 0건이라 «첫 포획 이후 지속»을 잴 사건이 없다')
} else {
  console.log(`  마지막 포획 시행: ${lastCap} · 마지막 시행: ${lastTrial} (조항 (2) ${stopAfterCapture ? 'FAIL' : 'PASS'})`)
}
if (c1 && !stopAfterCapture) {
  console.log(capped.length === 0
    ? 'AC-013: PASS(조항 (1)만) — 정지 규칙 조항은 전제 불성실(공허 통과 주의)'
    : 'AC-013: PASS — 두 조항 모두 성립')
  process.exit(0)
}
console.log(`AC-013: RED — 어긋난 조항: ${[!c1 && '(1)', stopAfterCapture && '(2)'].filter(Boolean).join(' ')}`)
process.exit(1)
