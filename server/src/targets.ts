// 멘션 → 전달 대상 변환 — v2 B 단계 (가이드 §3). 사람 글(routes-messages)과 봇 글(gateway.handleBotMessage) 이
// 같은 자리에서 타깃을 푼다. 조회는 room_bots — 그 방에 참여한 봇만 타깃이 되고, 나머지 이름은 unknown 으로 돌려준다.
// 거부 형태는 부르는 쪽이 정한다 (사람 경로 400, 봇 경로 system 메시지). 순수 조회 — 어떤 행도 남기지 않는다.
import { parseMentions } from './mention.js'
import type { Db } from './db.js'

export interface Target {
  botId: number
  name: string
  role: string
  delivery: 'to' | 'cc'
}

// @MX:ANCHOR: [AUTO] 두 발신 경로(사람·봇)가 같은 room_bots 조회를 지나는 자리 — 여기서 걸러진 이름은 어느 경로에서도 타깃이 되지 않는다
// @MX:REASON: 같은 봇을 to·cc 로 함께 멘션하면 항목 둘이다 — 중복 제거하지 않는다(mention.ts 계약 그대로)
export function resolveTargets(db: Db, roomId: number, body: string): { targets: Target[]; unknown: string[] } {
  const targets: Target[] = []
  const unknown: string[] = []
  for (const m of parseMentions(body)) {
    const bot = db.prepare(
      `SELECT b.id, b.name, b.role FROM bots b JOIN room_bots rb ON rb.bot_id = b.id
       WHERE b.name = ? AND rb.room_id = ?`,
    ).get(m.bot, roomId) as { id: number; name: string; role: string } | undefined
    if (!bot) { unknown.push(m.bot); continue }
    targets.push({ botId: bot.id, name: bot.name, role: bot.role, delivery: m.delivery })
  }
  return { targets, unknown }
}
