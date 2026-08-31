// @TO(봇)/@CC(봇) 멘션 파서 — 순수 함수 (REQ-MENTION-006: 외부 모듈을 가져오지 않는다)
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
