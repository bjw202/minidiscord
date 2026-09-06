// Verdict-block excerpt copied verbatim from .claude/workflows/sync-audit-4dim.js:207-232.
// Purpose: measure whether adding a fifth name to DIMENSIONS is sufficient to add a
// fifth dimension, or whether the hand-written 4-thunk `judges` literal (L192-197)
// breaks the run first. Runs no agents.
function verdict(DIMENSIONS, judges) {
  const THRESHOLD = 0.85
  const scoreOf = (j) => (j && typeof j.score === 'number' && Number.isFinite(j.score)) ? j.score : null
  const missing = DIMENSIONS.filter((dim, i) => scoreOf(judges[i]) === null)
  if (missing.length > 0) return { verdict: 'INCOMPLETE', missing }
  const scores = DIMENSIONS.map((dim, i) => judges[i].score)
  const reciprocalSum = scores.reduce((acc, s) => acc + 1 / s, 0)
  const hm = DIMENSIONS.length / reciprocalSum
  return { verdict: hm >= THRESHOLD ? 'PASS' : 'FAIL', harmonic_mean: hm }
}
const FOUR = ['Functionality', 'Security', 'Craft', 'Consistency']
const FIVE = [...FOUR, 'Rigor']
const fourJudges = [{ score: 0.9 }, { score: 0.9 }, { score: 0.9 }, { score: 0.9 }]
console.log('control  (4 dims, 4 judges):', JSON.stringify(verdict(FOUR, fourJudges)))
console.log('mutation (5 dims, 4 judges):', JSON.stringify(verdict(FIVE, fourJudges)))
console.log('repaired (5 dims, 5 judges):', JSON.stringify(verdict(FIVE, [...fourJudges, { score: 0.9 }])))
