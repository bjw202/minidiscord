// @TO(봇)/@CC(봇) 멘션 파서 — 순수 함수 (REQ-MENTION-006: 외부 모듈을 가져오지 않는다)
// @MX:NOTE: [AUTO] 이 정규식 하나가 멘션 문법 전체다 — 대문자 TO/CC 만, 봇 이름은 괄호·공백 없는 연속 문자, 등장 순서 유지, 중복 제거 없음(같은 봇이 TO 와 CC 에 함께 있으면 항목 둘 → message_targets 두 행). 웹의 @ 자동완성이 이 형식으로 삽입한다
const MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g

export interface Mention {
  bot: string
  delivery: 'to' | 'cc'
}

export function parseMentions(body: string): Mention[] {
  const out: Mention[] = []
  for (const m of body.matchAll(MENTION_RE)) {
    out.push({ bot: m[2], delivery: m[1].toLowerCase() as 'to' | 'cc' })
  }
  return out
}
