// SPEC-BOTSTAB-001 §3.3 — «영향 자리의 기대값이 제안 상한 아래인가» 를 재는 스크립트 (재현용).
// 실행: node .moai/state/verify/t25-plan/fixture-size.mjs   (워크스페이스 루트에서)
//
// 왜 «파일별 최대 리터럴» 을 재지 않는가 (2회차 감사 B-05):
//   ① 백틱 정규식이 무관한 두 백틱 사이를 통째로 잡아 수천 바이트짜리 «리터럴» 을
//   만들어낸다(측정 인공물). ② 소스의 `\n` 은 두 글자로 세어져 런타임 값보다 길다.
//   그래서 파일이 아니라 §3.3 이 열거한 «영향 단언 자리» 만 훑는다.
//
// 왜 «리터럴 바이트가 0인가» 로 재지 않는가 (3회차 감사 C-04):
//   기대값이 변수인 줄도 그 줄에 다른 리터럴(날짜 등)이 있으면 0이 아니다.
//   `index-wiring.test.ts:316` 이 그 형태이고, 「0인가」 규칙은 그 자리를 놓쳤다.
//   그래서 이 스크립트는 자리를 세 갈래로 **분류**한다 — 그 분류가 출력이고,
//   «잴 수 없는 자리가 몇 개인가» 는 세는 것이 아니라 이 출력에서 읽는다.
//     literal   : 기대값이 그 줄의 리터럴로 닫힌다 → 바이트를 잰다
//     identifier: 기대값이 변수를 참조한다        → 이 도구는 재지 못한다
//     multiline : 기대값이 다음 줄로 이어진다      → 이 도구는 재지 못한다
import { readFileSync } from 'node:fs'

// §3.3 «영향 자리» 표의 단언 줄. 표가 바뀌면 여기도 바뀐다.
const SITES = {
  'channel/test/channel-server.test.ts': [172, 173, 174, 219, 220, 244, 269],
  'channel/test/gateway-mutual-auth.test.ts': [226, 265, 428],
  'channel/test/index-wiring.test.ts': [184, 258, 294, 305, 306, 316, 329],
  'channel/test/transport-auth.test.ts': [425, 791],
}

// 매처 인자 = 줄의 마지막 `.toXxx(` 뒤부터. 괄호 균형이 맞지 않으면 다음 줄로 이어진 것이다.
function matcherArg(line) {
  const m = [...line.matchAll(/\.(toBe|toEqual|toStrictEqual|toContain|toMatch)\(/g)].pop()
  if (!m) return null
  const from = m.index + m[0].length
  let depth = 1
  for (let i = from; i < line.length; i += 1) {
    if ('([{'.includes(line[i])) depth += 1
    else if (')]}'.includes(line[i])) {
      depth -= 1
      if (depth === 0) return { text: line.slice(from, i), closed: true }
    }
  }
  return { text: line.slice(from), closed: false }
}

const litBytes = (t) => {
  let max = 0
  for (const re of [/'([^'\n]*)'/g, /"([^"\n]*)"/g, /`([^`\n]*)`/g]) {
    for (const m of t.matchAll(re)) max = Math.max(max, Buffer.byteLength(m[1], 'utf8'))
  }
  return max
}

// 리터럴·숫자·객체 키를 지운 뒤 남는 식별자가 있으면 «변수 참조» 다.
const hasIdentifier = (t) =>
  /[A-Za-z_$][\w$]*/.test(
    t
      .replace(/'[^'\n]*'|"[^"\n]*"|`[^`\n]*`/g, ' ')
      .replace(/\b[A-Za-z_$][\w$]*\s*:/g, ' ')
      .replace(/\b\d+\b/g, ' '),
  )

const tally = { literal: 0, identifier: 0, multiline: 0 }
let max = 0
let maxAt = ''
for (const [f, lines] of Object.entries(SITES)) {
  const src = readFileSync(f, 'utf8').split('\n')
  for (const n of lines) {
    const line = src[n - 1] ?? ''
    const arg = matcherArg(line)
    let kind
    if (!arg || !arg.closed) kind = 'multiline'
    else if (hasIdentifier(arg.text)) kind = 'identifier'
    else kind = 'literal'
    tally[kind] += 1
    const b = arg ? litBytes(arg.text) : 0
    if (kind === 'literal' && b > max) {
      max = b
      maxAt = `${f}:${n}`
    }
    console.log(`${f}:${n}\t${kind}\tliteral_bytes_on_line=${b}`)
  }
}
console.log(`TALLY\tliteral=${tally.literal}\tidentifier=${tally.identifier}\tmultiline=${tally.multiline}`)
console.log(`MEASURED_MAX=${max}\tat=${maxAt}\t(literal 갈래에 한한 값이다)`)
