// SPEC-BOTSTAB-001 문서 정합 훑기 (재현용).
// 실행: node .moai/state/verify/t25-plan/doc-stem-sweep.mjs   (워크스페이스 루트에서)
//
// v0.5.0 개정 (4회차 감사 F-04). 3회차가 세운 형태는 **부정 목록**이었다 —
// 「13|17 을 보면 적중」처럼 그때 폐기된 값을 열거하는 규칙. 그 형태는 값이 다시
// 바뀌는 순간(19 → 20) 조용히 눈이 멀고, 하필 그 순간이 규칙이 필요한 순간이다.
// 그리고 어순을 박아 둔 규칙은 뒤집힌 문장을 놓쳤다. 둘을 함께 고친다.
//
//   kind: 'value' — 주장의 **모양**을 잡고 거기서 뽑은 수를 FACTS 와 대조한다.
//                   FACTS 는 선언하지 않고 **문서에서 세어 만든다**(아래 derive).
//                   값이 바뀌면 규칙도 사실도 저절로 따라가므로 낡지 않는다.
//   kind: 'shape' — 나타나서는 안 되는 주장 «형태». 낱말이 한 줄에 함께 있으면
//                   적중이며 **어순을 보지 않는다**(all: 배열의 교집합).
//
// 무엇을 재지 못하는가 — 5회차 G-08 이 «공시된 목록이 실제 경계가 아니다» 로 지적해
// 이번에 **이 라운드에 실제로 겪은 것으로** 다시 적는다. 앞의 목록은 짐작이었다.
//   ① RULES 에 모양이 없는 주장. 자기 목록 의존을 없앤 것이 아니라 «값마다» 에서
//      «모양마다» 로 한 단계 늦춘 것이다.
//   ② 한 줄을 넘는 주장. 판정 단위가 줄이다.
//   ③ **면제가 줄 단위라, 한 줄에 이력 서술과 현재값이 섞이면 현재값까지 면제된다.**
//      이 라운드에 실제로 그랬다 — `plan-done.md` 의 계수 표 한 줄이 괄호 안에
//      «v0.2.0 에서» 를 담고 있어, 같은 줄의 낡은 현재값이 면제로 통과했다(G-02).
//   ④ **수를 낱말로 바꿔 쓰면 value 규칙을 피한다.** 규칙은 «수 + 세는 이름» 꼴을
//      찾으므로 「행수는 그대로다」 같은 서술은 잡지 못한다.
//   ⑤ **자기 시험은 «규칙이 도달 가능한가» 를 재지 «규칙이 옳은 것을 겨누는가» 를
//      재지 않는다.** 픽스처가 규칙과 함께 틀리면 둘 다 통과한다.
//   ⑥ FACTS 로 셀 수 있는 사실은 셋뿐이다(행수·기준 수·상한 상수 수). 귀속·예측·
//      서술은 셀 수 없어 모양 규칙에 의존하며, 그것이 ①의 자리다.
//   ⑦ 문서 밖 사실(코드·스크립트 출력)과의 어긋남. 그것은 각 도구가 잰다.
import { readFileSync } from 'node:fs'

const DOCS = [
  '.moai/specs/SPEC-BOTSTAB-001/spec.md',
  '.moai/specs/SPEC-BOTSTAB-001/plan.md',
  '.moai/specs/SPEC-BOTSTAB-001/acceptance.md',
  '.moai/specs/SPEC-BOTSTAB-001/plan-done.md',
  '.moai/specs/SPEC-BOTSTAB-001/progress.md',   // 4회차 F-06(a) — 귀속 [HARD] 를 지키는 규칙이
]                                                //   유일한 기계 판독 파일을 훑지 않고 있었다

const AC = readFileSync('.moai/specs/SPEC-BOTSTAB-001/acceptance.md', 'utf8')
const SPEC = readFileSync('.moai/specs/SPEC-BOTSTAB-001/spec.md', 'utf8')

// 사실은 **선언하지 않고 센다.** 선언한 사실은 값이 바뀔 때 그 자체가 낡는다.
const FACTS = {
  mutation_rows: (AC.match(/^\| [A-Z][0-9]* \| /gm) || []).length,
  acceptance_criteria: (AC.match(/^### AC-BOTSTAB-/gm) || []).length,
  ceiling_constants: (SPEC.match(/^\| \*\*OD-\d\*\* \|/gm) || []).length,
}

// 점수는 매겨진 트리와 함께 적어야 한다. 트리 토큰이 같은 줄에 없으면 적중.
const SCORES = [
  { score: '0.733', tree: /v0\.1\.0/ },
  { score: '0.792', tree: /v0\.2\.0/ },
  { score: '0.820', tree: /v0\.3\.0/ },
  { score: '0.761', tree: /v0\.4\.0/ },
]

// 이력 서술은 폐기값을 인용해도 된다. 그 표시를 담은 줄만 면제한다.
// 발견 번호(F-04·G-01 …)를 담은 줄은 이력 서술이므로 면제한다. **그러나 그 토큰은
// 기준 id 의 부분 문자열이기도 하다** — 5회차 G-01: `[A-F]-0[1-9]` 가 `AC-013`(안의
// `C-01`)과 `AC-BOTSTAB-012`(안의 `B-01`)까지 삼켰다. 직접 재보니 비어 있지 않은
// 1,091줄 중 213줄이 면제였고 **113줄이 오직 이 오발로** 면제됐으며, 그중 54줄이
// AC id 를 담고 있었다. 이 SPEC 에서 가장 많이 논의되는 기준이 통째로 눈 밖에 있었다.
// 고침: 앞이 영숫자·하이픈이면 발견 번호가 아니다(=id 의 꼬리다). 뒤에 숫자가 더
// 붙어도 발견 번호가 아니다.
const FINDING_ID = /(?<![A-Za-z0-9-])[A-G]-0[1-9](?![0-9])/
const HISTORICAL = /개정 전|폐기|철회|되돌[리린]|회차 감사|v0\.[1-4]\.0 에서|^\| 0\.\d\.\d \||금지했다|굳혔다|재현했다|하한이었다|낡[았은]|삭제했다|사라[졌진]/
const exempt = (l) => HISTORICAL.test(l) || FINDING_ID.test(l)

const RULES = [
  {
    id: 'mutation-rows', kind: 'value', fact: 'mutation_rows',
    why: '변이표 행수는 표에서 센 값과 같아야 한다',
    all: [/변이표/], num: /(\d+)\s*행/g, pick: 'last',
  },
  {
    id: 'ceiling-constants', kind: 'value', fact: 'ceiling_constants',
    why: '상한 상수 개수는 §7 표에서 센 값과 같아야 한다',
    all: [/상한 상수/], num: /(\d+)\s*개|(다섯|넷|네|셋|여섯)\s*개/g, pick: 'last',
    words: { 다섯: 5, 넷: 4, 네: 4, 셋: 3, 여섯: 6 },
  },
  {
    id: 'criteria-count', kind: 'value', fact: 'acceptance_criteria',
    why: '수용 기준 수는 AC 블록을 세어 만든 값과 같아야 한다',
    all: [/(수용 기준|기준은?)\s*\*\*\d+건/], num: /(?:수용 기준|기준은?)\s*\*\*(\d+)건/g, pick: 'first',
    unless: /형제|REQ|요구사항|변이/,
  },
  {
    id: 'invalidation-count', kind: 'shape',
    why: '무효화 자리 수는 문서가 소유하지 않는다 — 정본은 훑기 출력이며, 수를 적으려면 스냅숏임을 같은 줄에 밝힌다',
    all: [/무효화/, /(\d+|일곱|여섯|열아홉)\s*(건|자리)/], unless: /스냅숏|정본|TALLY|훑기 출력/,
  },
  {
    id: 'unmeasurable-count', kind: 'shape',
    why: '「잴 수 없는 자리」의 개수는 도구의 TALLY 줄이 소유한다 — 문서가 수로 굳히지 않는다',
    all: [/재지 못|잴 수 없|측정하지 못/, /(둘|셋|넷|다섯|여섯|일곱)|\d+\s*(자리|개|건)/],
    // 「그 둘」처럼 **앞서 이름 붙인 것들을 되받는** 수사는 계수 주장이 아니다.
    unless: /TALLY|갈래|identifier|multiline|(그|앞의|뒤의|이) (둘|셋|넷)|(둘|셋|넷) 다/,
  },
  {
    id: 'red0-measured', kind: 'shape',
    why: '「빨개지는 것 0건」은 예측이지 측정이 아니다 (B-05)',
    all: [/빨개지는/, /측정/], unless: /예측|아니다|아니라/,
  },
  {
    id: 'site-ceiling', kind: 'shape',
    why: '「일곱 자리 한정」 천장은 삭제됐다 (B-01)',
    all: [/일곱 자리/, /한정/],
  },
  {
    id: 'removed-predicate', kind: 'shape',
    why: "㉠·㉠'·㉢ 은 2026-09-01 운영자 결정으로 AC-013 에서 삭제됐다 — 살아 있는 술어처럼 적을 수 없다",
    // 셋째 항이 정밀도를 만든다 — 삭제된 술어를 «지금 무엇을 한다» 로 적을 때만 잡는다.
    // 그것 없이는 「㉠' 과 같은 이유로 무의미해진다」 같은 경계 서술까지 잡혔다.
    all: [/AC-?013|AC-BOTSTAB-013/, /㉠'|㉠ |㉢/, /잰다|읽는다|받는다|지킨다|덮는다|잡는다|기록한다|비교한다/],
    unless: /삭제|제거|없다|옮겼|더는|sync/,
  },
  {
    id: 'od-pending', kind: 'shape',
    why: 'OD 다섯 값은 운영자가 2026-09-01 확정했다 — 더는 대기 상태가 아니다',
    all: [/OD-?\d?|상한 값/, /미결|결정 대기|대기 중/], unless: /확정|판단값/,
  },
  {
    id: 'od-derived', kind: 'shape',
    why: 'OD 값은 확정됐을 뿐 측정된 것이 아니다',
    all: [/OD/, /측정한 값|도출한 값|도출된 값/],
  },
]

const numOf = (m, words) => {
  const raw = m.slice(1).find((x) => x !== undefined)
  return words && words[raw] !== undefined ? words[raw] : Number(raw)
}

// 규칙 평가를 함수 하나로 모은다 — 자기 시험과 실제 실행이 **같은 경로**를 쓰게
// 하려는 것이다. 시험이 규칙 평가를 다시 구현하면, 시험은 사본을 검사하게 되고
// 사본은 낡는다(이 카드가 여러 번 겪은 형태다).
function evaluateLine(l) {
  if (exempt(l)) return []
  const out = []
  for (const r of RULES) {
    if (!r.all.every((re) => re.test(l))) continue
    if (r.unless && r.unless.test(l)) continue
    if (r.kind === 'shape') { out.push({ id: r.id, why: r.why }); continue }
    const found = [...l.matchAll(r.num)].map((m) => numOf(m, r.words)).filter((n) => !Number.isNaN(n))
    if (found.length === 0) continue
    const got = r.pick === 'last' ? found[found.length - 1] : found[0]
    if (got !== FACTS[r.fact]) out.push({ id: r.id, why: `${r.why} — 이 줄은 ${got}, 현재값은 ${FACTS[r.fact]}` })
  }
  for (const sc of SCORES) {
    if (l.includes(sc.score) && !sc.tree.test(l)) {
      out.push({ id: 'score-attribution', why: `${sc.score} 은 매겨진 트리와 같은 줄에 적어야 한다` })
    }
  }
  return out
}

// ─────────────────────────── 자기 시험 ───────────────────────────
// 왜 있는가 (5회차 G-01): 이 스크립트가 **스스로 눈이 먼 채 CLEAN 을 보고했다.**
// 면제 정규식이 감시 대상 id 공간을 삼켰고, 문서들이 그 CLEAN 을 근거로 인용했다.
// 실패할 수 없는 훑기는 훑기가 없는 것보다 나쁘다. 그래서 훑기 전에 훑기를 시험한다.
//
// [HARD] 이 시험이 스스로 실패할 수 있어야 한다. 그것을 «주장» 으로 적지 않고
// 카나리아로 **실행해서 보인다** — 옛 깨진 면제 정규식을 시험에 걸어, 시험이 그것을
// 반드시 불합격 처리하는지 확인한다. 시험을 무르게 고치면 카나리아가 먼저 깨진다.

// 감시 대상 id 공간 — 면제가 이 중 하나라도 삼키면 그 규칙들은 도달 불가가 된다.
const WATCHED_IDS = [
  'AC-013', 'AC-BOTSTAB-013', 'AC-BOTSTAB-012', 'AC-BOTSTAB-005',
  'REQ-BOTSTAB-001', 'REQ-BOTSTAB-012', 'OD-1', 'OD-5',
]
// 발견 번호 — 면제가 이것들은 계속 잡아야 이력 서술이 오탐이 되지 않는다.
const FINDING_IDS = ['F-04', 'G-01', 'A-03', 'B-07', 'C-05']

// 규칙마다 «반드시 잡혀야 하는 줄» 과 «잡히면 안 되는 줄». 둘 다 있어야 한다 —
// 양성만 두면 «무엇이든 잡는 규칙» 이 도달성 시험을 통과해 버린다.
const FIXTURES = {
  'mutation-rows': ['변이표 99행을 적용한다', '변이표의 모든 행을 적용한다'],
  'ceiling-constants': ['상한 상수 네 개를 같은 자리에 둔다', '상한 상수를 한 자리에 모은다'],
  'criteria-count': ['수용 기준 **99건**이다', '수용 기준은 이 문서가 소유한다'],
  'invalidation-count': ['무효화되는 단언 자리가 7건이다', '무효화되는 자리는 훑기 출력이 정본이다'],
  'unmeasurable-count': ['도구가 재지 못한 자리는 여섯이다', '도구가 재지 못한 갈래는 identifier 와 multiline 이다'],
  'red0-measured': ['빨개지는 것은 측정한 값이다', '빨개지는 것 0건은 예측이며 측정이 아니다'],
  'site-ceiling': ['일곱 자리 로 한정한다', '훑기 출력 전체가 대상이다'],
  'removed-predicate': ['AC-013 의 ㉢ 이 기준선을 읽는다', 'AC-013 의 ㉢ 은 삭제됐다'],
  'od-pending': ['OD-1 은 미결이다', 'OD-1 은 판단값이며 운영자 확정이다'],
  'od-derived': ['OD 값은 도출된 값이다', 'OD 값은 판단이다'],
  'score-attribution': ['3회차 판정은 0.820 이었다', '3회차 판정은 0.820 — spec.md v0.3.0 트리'],
}

function runSelfTest(exemptFn) {
  const fail = []
  // ① 면제가 감시 대상 id 를 삼키지 않는가
  for (const id of WATCHED_IDS) {
    if (exemptFn(`이 줄은 ${id} 를 이야기한다`)) fail.push(`면제가 감시 대상 id 를 삼킨다: ${id}`)
  }
  // ② 면제가 발견 번호는 여전히 잡는가 (한쪽으로만 조이면 이력 줄이 전부 오탐이 된다)
  for (const id of FINDING_IDS) {
    if (!exemptFn(`${id} 가 지적한 자리다`)) fail.push(`면제가 발견 번호를 놓친다: ${id}`)
  }
  // ③ 규칙마다 픽스처가 있는가 — 규칙을 늘리고 시험을 안 늘리면 여기서 깨진다
  const ruleIds = [...RULES.map((r) => r.id), 'score-attribution']
  for (const id of ruleIds) if (!FIXTURES[id]) fail.push(`픽스처 없는 규칙: ${id}`)
  for (const id of Object.keys(FIXTURES)) if (!ruleIds.includes(id)) fail.push(`규칙 없는 픽스처: ${id}`)
  // ④ 규칙마다 도달 가능한가(양성이 잡히는가) + 무엇이든 잡지는 않는가(음성이 안 잡히는가)
  for (const [id, pair] of Object.entries(FIXTURES)) {
    if (!ruleIds.includes(id)) continue
    const [pos, neg] = pair
    if (!evaluateLine(pos).some((h) => h.id === id)) fail.push(`도달 불가 규칙(양성을 못 잡음): ${id}`)
    if (evaluateLine(neg).some((h) => h.id === id)) fail.push(`과잉 규칙(음성을 잡음): ${id}`)
  }
  return fail
}

// 카나리아 — 시험이 실제로 실패를 낼 수 있음을 «실행으로» 보인다.
const BROKEN_EXEMPT = (l) => /[A-F]-0[1-9]/.test(l)
const canary = runSelfTest(BROKEN_EXEMPT)
if (canary.length === 0) {
  console.error('SELF_TEST=BROKEN — 카나리아가 옛 깨진 면제를 통과시켰다. 시험 자체가 실패할 수 없는 상태다.')
  process.exit(2)
}

const failures = runSelfTest(exempt)
if (failures.length > 0) {
  for (const f of failures) console.error(`  ✗ ${f}`)
  console.error(`SELF_TEST=FAIL (${failures.length}) — 훑기 결과를 신뢰할 수 없으므로 문서 판정을 내지 않는다.`)
  process.exit(1)
}
console.log(`SELF_TEST=PASS (규칙 ${RULES.length + 1}개 전부 도달 가능 · 감시 id ${WATCHED_IDS.length}개 비면제 · 카나리아가 옛 면제를 ${canary.length}건으로 불합격 처리)`)

// ─────────────────────────── 실제 훑기 ───────────────────────────
let hits = 0
console.log(`FACTS(문서에서 셈): 변이표 ${FACTS.mutation_rows}행 · 수용 기준 ${FACTS.acceptance_criteria}건 · 상한 상수 ${FACTS.ceiling_constants}개`)
for (const f of DOCS) {
  const lines = readFileSync(f, 'utf8').split('\n')
  lines.forEach((l, i) => {
    for (const h of evaluateLine(l)) {
      hits += 1
      console.log(`${f}:${i + 1}\t${h.id}\t${h.why}`)
      console.log(`    ${l.trim().slice(0, 170)}`)
    }
  })
}
console.log(hits === 0 ? 'DOC_STEM_SWEEP=CLEAN' : `DOC_STEM_SWEEP=${hits} hit(s)`)
