import { requireAuth } from './auth.js';
import { requireRoomMember } from './room-members.js';
// @MX:ANCHOR: [AUTO] 이벤트 스트림 라우트의 단일 등록점 — buildServer 와 테스트 build() 가 호출한다
// @MX:REASON: 이 함수가 유일한 등록 경로여야 «하네스는 게이트를 지나고 프로덕션은 못 지나는» 갈라짐이 원천적으로 없다 (REQ-ROOMAUTHZ-010)
export function registerEventRoute(app) {
    // 멤버십 게이트가 preHandler 로 hijack 앞에서 끝난다 — hijack 뒤에는 Fastify 가 상태 코드를
    // 보내지 못해 비멤버가 응답 없는 열린 스트림을 쥔다 (plan.md §H, REQ-ROOMAUTHZ-010)
    app.get('/api/rooms/:id/events', { preHandler: [requireAuth, requireRoomMember] }, async (req, reply) => {
        // hijack 을 먼저 호출해 소켓 소유권을 넘긴다 — 허브가 reply.raw 에 직접 쓴다.
        reply.hijack();
        app.hub.subscribe(Number(req.params.id), reply.raw);
    });
}
