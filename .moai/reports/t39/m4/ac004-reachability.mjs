// SPEC-WSUPGRADE-001 M4/M5 — AC-WSUPGRADE-004 (2) 정의역 도달성 근거 검증기(.moai/reports/t39/m4/).
// acceptance AC-004 (2)가 인정하는 근거는 둘뿐이다:
//   (가) 그 갈래를 낸 «실제 포획 기록» — 단, 귀속된 것이어야 한다: H-3 은 창2(onRequest) 귀속
//        적중 항목이 포획된 요청의 localPort·경로·포획 창[tOpen,tClose]과 맞아야 하고(AC-002),
//        창1 단독 적중은 ㉮′ 로 미분류므로 근거가 아니며, 귀속 충돌 기록도 근거가 아니다.
//        창 단위 개수만 오른 기록(귀속 없는 카운트)은 혼입일 수 있으므로 근거가 아니다(N1).
//   (나) 그 갈래의 입력 조합을 «실행으로 재현한 탐침의 출력 경로» — 경로가 존재하고 그
//        출력이 그 갈래를 내는 것으로 판독 가능해야 한다. «경로가 적혔다»만으로는 부족하다.
// 근거가 한 갈래도 없으면 이 검증기는 «도달성 근거 없음»을 돌려준다 — 그때 AC-004 는
// PASS 가 아니라 미관측이다(acceptance 「포획 0건일 때의 처분」).
//
// 용법: node ac004-reachability.mjs <claims.json>
//   claims.json: [{ "branch": "H-1"|"H-2"|"H-3", "kind": "capture"|"probe",
//                   "path": "<기록/탐침 출력 경로>" }]
import { existsSync, readFileSync } from 'node:fs'

const claimsPath = process.argv[2]
if (!claimsPath) {
  console.error('용법: node ac004-reachability.mjs <claims.json>')
  process.exit(2)
}
const claims = JSON.parse(readFileSync(claimsPath, 'utf8'))
const required = ['H-1', 'H-2', 'H-3']
const verdicts = []
const rejections = []

for (const branch of required) {
  const forBranch = claims.filter(c => c.branch === branch)
  const accepted = []
  for (const c of forBranch) {
    // — 경로 먼저: 근거는 «경로가 적혔는가»가 아니라 «그 경로가 존재하는가»부터다.
    if (!c.path || !existsSync(c.path)) {
      rejections.push(`${branch}: 경로가 존재하지 않는다 — ${c.path ?? '(없음)'}`)
      continue
    }
    if (c.kind === 'capture') {
      let rec
      try {
        rec = JSON.parse(readFileSync(c.path, 'utf8'))
      } catch {
        rejections.push(`${branch}: 포획 기록을 읽을 수 없다 — ${c.path}`)
        continue
      }
      // (가) — 귀속된 포획만 근거다.
      if (!Array.isArray(rec.attributionHits) || rec.attributionHits.length === 0) {
        rejections.push(`${branch}: 귀속 적중 항목이 없는 포획 기록(창 단위 개수만 있는 모양) — 혼입 위험, 근거 아님(acceptance AC-004 (가)) — ${c.path}`)
        continue
      }
      if (rec.collision && rec.collision !== '없음') {
        rejections.push(`${branch}: 귀속 충돌이 기록된 포획 — 귀속이 성립하지 않았으므로 근거 아님 — ${c.path}`)
        continue
      }
      const w2 = rec.attributionHits.filter(h => h.window === 'onRequest').length
      const w1 = rec.attributionHits.filter(h => h.window === 'upgrade').length
      if (branch === 'H-3' && w2 === 0) {
        rejections.push(`${branch}: 창2 귀속 적중이 없다(창1 단독 ${w1}건) — ㉮′ 미분류로 밀리는 기록, H-3 근거 아님 — ${c.path}`)
        continue
      }
      // 지문 조건 — H-1/H-2/H-3 의 포획 근거는 «Fastify 404» 지문이어야 한다(2차 판정의 전제).
      if (rec.statusCode !== 404) {
        rejections.push(`${branch}: 지문이 404 가 아니다(${rec.statusCode}) — 2차 판정표가 도는 기록이 아니다 — ${c.path}`)
        continue
      }
      accepted.push(c.path)
    } else if (c.kind === 'probe') {
      // (나) — 탐침 출력 경로. 존재 + 사람이 판독 가능한 출력 파일이면 받는다.
      // 어떤 갈래를 냈는가의 판독은 이 검증기 밖의 기록(M5 판정)에서 인용된다 — 검증기는
      // «존재하지 않는 경로를 근거로 계상하는 것»만 막는다(보조 변이: 경로를 잰다).
      accepted.push(c.path)
    } else {
      rejections.push(`${branch}: 알 수 없는 근거 종류 — ${c.kind}`)
    }
  }
  verdicts.push({ branch, evidence: accepted, status: accepted.length > 0 ? '근거 있음' : '도달성 근거 없음' })
}

for (const v of verdicts) console.log(`${v.branch}: ${v.status}${v.evidence.length ? ' — ' + v.evidence.join(', ') : ''}`)
if (rejections.length) {
  console.log('기각된 근거 주장:')
  for (const r of rejections) console.log(`  - ${r}`)
}
const withEvidence = verdicts.filter(v => v.evidence.length > 0).length
console.log(`---`)
console.log(`(2) 도달성 근거가 있는 갈래: ${withEvidence}/3`)
if (withEvidence === 0) console.log('판정: 미관측 — 포획 0건일 때의 처분(acceptance AC-004)')
else if (withEvidence < 3) console.log('판정: (2) 미충족 — 근거 없는 갈래가 남아 있다(통과 아님)')
else console.log('판정: (2) 충족')
