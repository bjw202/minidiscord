// 방별 이벤트 스트림 라우트 (REQ-ROOMAUTHZ-010) — index.ts 의 인라인 라우트를 추출했다.
// 프로덕션과 테스트 하네스가 같은 함수를 쓰게 하기 위함이다. 어디선가 라우트 사본을 등록하면
// 이 모듈의 게이트가 통째로 빠져도 테스트가 초록이 되는 상태가 생긴다 (plan.md §D.3.1)
import type { FastifyInstance } from 'fastify'
import { requireAuth } from './auth.js'

// @MX:ANCHOR: [AUTO] 이벤트 스트림 라우트의 단일 등록점 — buildServer 와 테스트 build() 가 호출한다
// @MX:REASON: 이 함수가 유일한 등록 경로여야 «하네스는 게이트를 지나고 프로덕션은 못 지나는» 갈라짐이 원천적으로 없다 (REQ-ROOMAUTHZ-010)
export function registerEventRoute(app: FastifyInstance): void {
  // 인증 검사는 preHandler 로 hijack 앞에서 끝난다 — hijack 뒤에는 Fastify 가 상태 코드를 보내지 못한다
  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
    // hijack 을 먼저 호출해 소켓 소유권을 넘긴다 — 허브가 reply.raw 에 직접 쓴다.
    reply.hijack()
    app.hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
  })
}
