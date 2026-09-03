// SPEC-ROOMAUTHZ-001 — 방 멤버십 술어 (REQ-ROOMAUTHZ-007).
// 술어를 부르는 자리는 여덟이다(게이트 preHandler 일곱 + 브로커 permissions.ts:93) — 판정 로직을 라우트마다
// 복사하면 하나만 고쳐지는 날 아무 오류 없는 구멍이 열린다. 이 하나를 쓴다 (plan.md §H)
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from './db.js'

// @MX:ANCHOR: [AUTO] 멤버십 판정의 단일 술어 — 여덟 자리(메시지 둘·스트림·초대 넷의 preHandler 일곱 + 브로커)가 호출한다. 목록 GET /api/rooms 는 이 술어를 부르지 않고 인라인 SQL 로 같은 조건을 적는다
// @MX:REASON: 인가는 room_members 표만 본다 (plan.md §A). rooms.created_by 는 기록일 뿐 권한이 아니라서, 판정을 created_by 로 옮기면 탈퇴 기능이 생기는 날 게이트가 깨진다
export function isRoomMember(db: Db, roomId: number, userId: number): boolean {
  return !!db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId)
}

// @MX:NOTE: requireAuth 뒤에서 쓰는 preHandler 게이트. 멤버십을 방 상태(보관 여부) 검사보다 앞에 둔다는 순서 계약(plan.md §B)의 앞부분을 이 함수가 담당한다 — 뒤집으면 비멤버가 409 로 방 실재를 가른다
export async function requireRoomMember(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const roomId = Number((req.params as { id: string }).id)
  if (!req.user || !Number.isInteger(roomId) || !isRoomMember(req.server.db, roomId, req.user.id)) {
    // 비멤버와 없는 방을 같은 404 + 같은 본문으로 돌려준다 — 구별되면 방 실재가 샌다 (REQ-ROOMAUTHZ-013)
    return void reply.code(404).send({ error: '방을 찾을 수 없습니다' })
  }
}
