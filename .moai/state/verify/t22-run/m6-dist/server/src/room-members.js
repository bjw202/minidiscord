// @MX:ANCHOR: [AUTO] 멤버십 판정의 단일 술어 — M2 초대 라우트와 M3 게이트 여덟 곳(메시지·스트림·목록·브로커·초대 셋)이 호출한다
// @MX:REASON: 인가는 room_members 표만 본다 (plan.md §A). rooms.created_by 는 기록일 뿐 권한이 아니라서, 판정을 created_by 로 옮기면 탈퇴 기능이 생기는 날 게이트가 깨진다
export function isRoomMember(db, roomId, userId) {
    return !!db.prepare('SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId);
}
// @MX:NOTE: requireAuth 뒤에서 쓰는 preHandler 게이트. 멤버십을 방 상태(보관 여부) 검사보다 앞에 둔다는 순서 계약(plan.md §B)의 앞부분을 이 함수가 담당한다 — 뒤집으면 비멤버가 409 로 방 실재를 가른다
export async function requireRoomMember(req, reply) {
    const roomId = Number(req.params.id);
    if (!req.user || !Number.isInteger(roomId) || !isRoomMember(req.server.db, roomId, req.user.id)) {
        // 비멤버와 없는 방을 같은 404 + 같은 본문으로 돌려준다 — 구별되면 방 실재가 샌다 (REQ-ROOMAUTHZ-013)
        return void reply.code(404).send({ error: '방을 찾을 수 없습니다' });
    }
}
