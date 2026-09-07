// SPEC-BOTSTAB-001 §3.3 형제 자리 어간 훑기 (재현용).
// 실행: node .moai/state/verify/t25-plan/sibling-sweep.mjs   (워크스페이스 루트에서)
// 하는 일: channel/test 의 여섯 스위트를 it(...) 블록 단위로 갈라, 블록이
//   (a) 모델이 읽는 «렌더된 사람 유래 값» 표면을 건드리고        ← SURFACE
//   (b) 그 값을 등식꼴로 못 박는 단언을 담고 있으면              ← ASSERT
// 그 블록을 «후보 자리» 로 보고한다. 별칭(const c = note.params.content)을
// 잡으려고 줄이 아니라 블록을 훑는다 — 줄 단위 «관용구» 훑기가 2회차 감사
// B-01 에서 놓친 것이 정확히 이 별칭 형태다.
import { readFileSync } from 'node:fs'

// --json 은 기계 판독 형태로 낸다.
// (5회차 G-07 정정) 이 플래그는 원래 AC-BOTSTAB-013 ㉢ 의 기준선 파일을 만들려고
// 두었다. **㉢ 과 그 기준선 설계는 2026-09-01 운영자 결정으로 삭제됐다** — 4회차
// F-02 가 그 설계를 무너뜨렸기 때문이다. 플래그 자체는 남긴다: sync 가 블록 목록을
// 기계로 다루기에 쓸모가 있고, 지우면 §M 의 산출물을 손으로 옮겨 적어야 한다.
// **더는 어떤 기준도 이 출력을 «갱신 전» 으로 읽지 않는다.**
const AS_JSON = process.argv.includes('--json')
const rows = []

const FILES = [
  'channel/test/channel-server.test.ts',
  'channel/test/gateway-client.test.ts',
  'channel/test/index-wiring.test.ts',
  'channel/test/permission-relay.test.ts',
  'channel/test/entrypoint.test.ts',   // v2 C1: transport-auth.test.ts 를 대체한다
]
// 어간이다 — 변수 이름이 아니라 «생산자» 로 잡는다. 이 SPEC 의 절단·탈출이
// 지나가는 렌더 표면은 정확히 둘이다: 알림의 params.content(pushChatMessage)와
// fetch_history 결과(그 결과를 푸는 헬퍼 이름이 parsedHistory 다).
// 게이트웨이 전선 값(bot_message.body, message 프레임 통과)은 렌더 표면이
// 아니므로 대상이 아니다 — 이 SPEC 은 그 값들을 건드리지 않는다.
const SURFACE = /params\.content|parsedHistory|fetch_history/
const ASSERT = /\.toBe\(|\.toEqual\(|\.toStrictEqual\(|\.toContain\(/

for (const f of FILES) {
  const lines = readFileSync(f, 'utf8').split('\n')
  let start = -1
  let title = ''
  let buf = []
  const flush = () => {
    if (start < 0) return
    const text = buf.join('\n')
    if (SURFACE.test(text) && ASSERT.test(text)) {
      const hits = buf
        .map((l, i) => [start + i, l])
        .filter(([, l]) => ASSERT.test(l))
        .map(([n]) => n)
      rows.push({ file: f, line: start, title, assert_lines: hits, assert_count: hits.length })
      if (!AS_JSON) console.log(`${f}:${start}\t${title}\tassert_lines=${hits.join(',')}`)
    }
    start = -1
    buf = []
  }
  lines.forEach((l, i) => {
    // 블록 시작은 it( 와 it.each([ 둘 다다 (3회차 감사 C-06).
    // it.each 는 제목이 여는 줄이 아니라 닫는 줄 `])('제목', …)` 에 있으므로
    // 시작에서는 제목을 비워 두고, 그 줄을 만나면 채운다.
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

if (AS_JSON) console.log(JSON.stringify({ generated_at: new Date().toISOString(), blocks: rows }, null, 2))
