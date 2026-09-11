// cssRuleBlock — style.css 에서 셀렉터의 규칙 블록 원문을 잡는 공유 헬퍼 (SPEC-WEBUI-001 M0).
// web-shell.test.ts 에서 옮겨 왔다 — 본문과 시그니처는 그대로다. 그래서 기존 호출 세 자리의
// 단언 의미도 바뀌지 않는다(옮겼다는 증거는 npm test 가 여전히 초록인 것이다).
// [HARD] 본문이 vitest 의 expect 를 쓴다 — 이 import 를 함께 가져가지 않으면
//        TS2304: Cannot find name 'expect' 로 M0 자체가 실패한다.
import { expect } from 'vitest'

// 접두가 겹치는 셀렉터(#auth-view form 등)는 셀렉터 다음에 여백+`{` 가 바로 오지 않으므로
// 여기서 걸러진다. 주석은 먼저 벗겨낸다 — 규칙 설명 주석이 셀렉터 문법([hidden]{display:none} 등)을
// 그대로 인용하면 주석 속 문자열이 진짜 규칙보다 먼저 잡히기 때문이다(D-3 가드 it 이 잡은 실제 사례).
// CSS 주석은 중첩되지 않으므로 벗기기가 안전하다. 중괄호는 깊이를 세어 짝을 맞춘다.
// «첫 매치» 를 돌려준다(at = i; break) — 그 성질 때문에 plan.md §B.6 은 기존 선택자를
// 제자리에서 고치고 끝 블록에는 새 선택자만 둔다.
export function cssRuleBlock(css: string, selector: string): string {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '')
  let at = -1
  for (let i = bare.indexOf(selector); i !== -1; i = bare.indexOf(selector, i + 1)) {
    if (bare.slice(i + selector.length).trimStart().startsWith('{')) { at = i; break }
  }
  expect(at, `style.css 에 ${selector} 규칙이 있어야 한다`).toBeGreaterThanOrEqual(0)
  const brace = bare.indexOf('{', at)
  let depth = 0
  for (let i = brace; i < bare.length; i++) {
    if (bare[i] === '{') depth++
    else if (bare[i] === '}') { depth--; if (depth === 0) return bare.slice(brace + 1, i) }
  }
  return ''
}
