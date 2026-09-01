// ㉡ 의 대상 집합이 «자기 파일» 을 포함할 수 있는가 — 단정하지 않고 재는 프로브.
// 실행: node .moai/state/verify/t25-plan/self-reference-probe.mjs
//
// 왜 필요한가: 4회차 F-01 이 ㉠' 을 «자기를 세는 관측자» 로 무너뜨렸다. 운영자
// 결정으로 ㉠·㉠'·㉢ 이 사라지고 ㉡ 이 유일한 인프로세스 기준이 되므로,
// 「㉡ 의 주어는 다른 파일이다」가 하중을 진다. 그 문장을 쓰기 전에 잰다.
import { readFileSync, readdirSync } from 'node:fs'

// sibling-sweep.mjs 가 실제로 쓰는 두 정규식을 그 파일에서 뽑아 쓴다 — 사본을 두면
// 사본이 낡는다.
const sweepSrc = readFileSync('.moai/state/verify/t25-plan/sibling-sweep.mjs', 'utf8')
const SURFACE = new RegExp(sweepSrc.match(/const SURFACE = \/(.+?)\/\n/)[1])
const ASSERT = new RegExp(sweepSrc.match(/const ASSERT = \/(.+?)\/\n/)[1])
const FILES = [...sweepSrc.matchAll(/'(channel\/test\/[^']+)'/g)].map((m) => m[1])

console.log('sweep FILES (하드코딩된 대상):', FILES.length, '개')
const onDisk = readdirSync('channel/test').filter((f) => f.endsWith('.test.ts')).map((f) => `channel/test/${f}`)
console.log('channel/test 실재 파일:', onDisk.length, '개')
const unswept = onDisk.filter((f) => !FILES.includes(f))
console.log('훑기가 보지 않는 실재 파일:', unswept.length === 0 ? '없음 — 여섯이 곧 전부다' : unswept.join(', '))

// AC-013 테스트가 «그럴듯하게» 쓰였을 때 훑기의 후보 조건을 만족하는가.
const CANDIDATES = {
  'A) 상수만 단언 — 표면 낱말 없음': `
    const blocks = runSweep()
    for (const b of blocks) expect(sourceOf(b)).toMatch(/MAX_[A-Z0-9_]+|SIGIL/)
  `,
  'B) 주석에 렌더 표면을 설명': `
    // 대상은 params.content 와 fetch_history 결과를 만지는 블록이다
    const blocks = runSweep()
    for (const b of blocks) expect(sourceOf(b)).toMatch(/MAX_[A-Z0-9_]+/)
  `,
  'C) 표면 이름을 문자열로 들고 있음': `
    const SURFACES = ['params.content', 'parsedHistory']
    expect(SURFACES).toEqual(['params.content', 'parsedHistory'])
  `,
}
for (const [name, text] of Object.entries(CANDIDATES)) {
  const s = SURFACE.test(text)
  const a = ASSERT.test(text)
  console.log(`${name}\tSURFACE=${s}\tASSERT=${a}\t→ 후보가 ${s && a ? '된다' : '되지 않는다'}`)
}

// --------- 배치 제약을 기계로 판정한다 (5회차 G-06) ---------
// 개정 전 이 제약은 산문뿐이었다 — 「일곱째 파일에 두라」는 문장은 지켜지지 않아도
// 아무 신호를 내지 않는다. 여기서 판정한다.
// 사용: node <이 파일> [AC-013 테스트 파일 경로]
// 경로를 주지 않으면 «아직 정해지지 않음» 으로 보고한다 — 통과로 읽지 않는다.
const target = process.argv[2]
if (!target) {
  // 6회차 H-09: OK 와 UNDECIDED 가 같은 종료 코드(0)를 내면, 종료 코드로 거는 게이트는
  // «아직 안 정함» 을 «통과» 로 읽는다. 문언은 «통과가 아니다» 라고 정확히 적었으므로
  // 사람은 안전했지만 기계 신호가 문언보다 약했다. 별도 코드로 가른다.
  console.log('PLACEMENT=UNDECIDED\tAC-013 테스트 경로가 주어지지 않았다 — run 이 정하면 그 경로를 넘겨 판정한다. 통과가 아니다')
  process.exitCode = 2
} else if (FILES.includes(target)) {
  console.log(`PLACEMENT=VIOLATION\t${target} 은 훑기 FILES 안이다 — ㉡ 이 자기 블록을 검사하게 된다`)
  process.exitCode = 1
} else {
  console.log(`PLACEMENT=OK\t${target} 은 훑기 FILES 밖이다 — ㉡ 의 주어에 자기 파일이 들어올 경로가 없다`)
}
