// SPEC-BOTSTAB-001 §M-2 보조 — 판정 자체가 아니라 «사람이 볼 후보 줄» 을 뽑는다.
// sibling-sweep.mjs 의 블록 가르기를 그대로 재현한 뒤, 블록마다
//   (a) 상수 식별자를 담은 줄
//   (b) 그 줄이 단언 표현 안에 있는지 (expect 를 여는 줄부터 이어지는 구문인지)
// 를 뽑아 낸다. 최종 판정은 사람이 이 출력과 원문을 대조해 내린다 (plan.md §M-2).
import { readFileSync } from 'node:fs'

const FILES = [
  'channel/test/channel-server.test.ts',
  'channel/test/gateway-client.test.ts',
  'channel/test/gateway-mutual-auth.test.ts',
  'channel/test/index-wiring.test.ts',
  'channel/test/permission-relay.test.ts',
  'channel/test/transport-auth.test.ts',
]
const SURFACE = /params\.content|parsedHistory|fetch_history/
const ASSERT = /\.toBe\(|\.toEqual\(|\.toStrictEqual\(|\.toContain\(/
// truncate.ts 가 수출하는 세 어족 (SIBLING_SWEEP_ASSERT_REGEX 와 같은 축) +
// 그 상수들에서 파생된 테스트 파일 지역 상수 둘. 파생 상수를 넣는 이유: §M-2 의 물음 2 는
// «기대값이나 경계가 상수에서 나오는가» 이지 «상수 이름이 그 줄에 있는가» 가 아니다.
// CONTENT_TOTAL_LIMIT / ASSEMBLY_BYTES 는 channel-server.test.ts:365-370 에서
// MAX_* 만으로 조립되므로 숫자 복제가 아니다. 좁은 규식만 쓰면 블록 11·18 의 판정
// 단언을 놓친다 (실제로 놓쳤고, 원문 대조로 잡았다).
const CONST = /\bMAX_[A-Z0-9_]+|\bTRUNC_[A-Z0-9_]+|\bSIGIL_[A-Z0-9_]*|\bCONTENT_TOTAL_LIMIT\b|\bASSEMBLY_BYTES\b/

const out = []
for (const f of FILES) {
  const lines = readFileSync(f, 'utf8').split('\n')
  let start = -1
  let title = ''
  let buf = []
  const flush = () => {
    if (start < 0) return
    const text = buf.join('\n')
    if (SURFACE.test(text) && ASSERT.test(text)) {
      const constLines = buf
        .map((l, i) => [start + i, l])
        .filter(([, l]) => CONST.test(l))
      out.push({ file: f, line: start, title, constLines })
    }
    start = -1
    buf = []
  }
  lines.forEach((l, i) => {
    const direct = l.match(/^\s*it\(\s*['"`](.*?)['"`]/)
    const each = l.match(/^\s*it\.each\(/)
    if (direct || each) {
      flush()
      start = i + 1
      title = direct ? direct[1] : '(it.each - title pending)'
    }
    if (start >= 0 && each === null && title.startsWith('(it.each')) {
      const t = l.match(/\]\)\(\s*['"`](.*?)['"`]/)
      if (t) title = `${t[1]} [it.each]`
    }
    if (start >= 0) buf.push(l)
  })
  flush()
}

let n = 0
for (const b of out) {
  n += 1
  console.log(`\n=== [${n}] ${b.file}:${b.line}  ${b.title}`)
  console.log(`    상수 담은 줄 ${b.constLines.length}개`)
  for (const [ln, src] of b.constLines) console.log(`    ${ln}: ${src.trim()}`)
}
console.log(`\n총 블록 ${out.length}`)
