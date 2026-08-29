// 권한 릴레이 브로커: 봇의 승인 요청을 방에 system 메시지로 띄우고 사람의 yes/no 답을 판정으로 되돌린다 (spec 7장)
import type { FastifyInstance } from 'fastify'
import type { ConnInfo } from './gateway.js'
import { isRoomMember } from './room-members.js'

// 판정 정규식 — 공식 문서 형식 그대로. l 은 1 과 헷갈려 빼고, /i 로 입력기 자동 대문자화를 흡수한다 (REQ-PERM-005).
// 완화도 강화도 하지 않는다 — 카드 t5 UI 의 /\byes [a-km-z]{5}/ 파서가 이 형식에 결합한다 (plan.md §C)
export const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i

// @MX:ANCHOR: [AUTO] index.ts 배선과 routes-messages 가로채기가 소비하는 브로커 공개 계약 (REQ-PERM-004)
// @MX:REASON: createPermissionBroker/PermissionBroker 시그니처는 spec.md REQ-PERM-004 가 글자 그대로 고정한다.
// tryHandleUserReply 는 SPEC-ROOMAUTHZ-001 §C 로 (roomId, userId, text) 로 개정됐다 — userId 가 두 번째인 것은
// (roomId, userId) 가 멤버십 술어 isRoomMember 의 인자 순서와 같아 호출부가 읽기 쉽기 때문이다
export interface PermissionBroker {
  onGatewayRequest(info: ConnInfo, params: { request_id: string; tool_name: string; description: string; input_preview: string }): void
  tryHandleUserReply(roomId: number, userId: number, text: string): boolean
}

export function createPermissionBroker(app: FastifyInstance): PermissionBroker {
  const db = app.db
  const hub = app.hub
  // 대기 레지스트리 — 프로세스 메모리 맵이며 디스크에 저장되지 않는다 (REQ-PERM-003).
  // 재시작으로 비는 것은 수용된 설계다 — 세션 쪽 승인 대화상자는 살아 있어 터미널에서 직접 승인할 수 있다
  const open = new Map<string, ConnInfo>()

  // system 메시지 저장 + 같은 방에 SSE 발행. 이벤트 이름은 기존 'message' 하나 — 새 이벤트 타입을 만들지 않는다 (REQ-PERM-013)
  function postSystem(roomId: number, body: string): void {
    const r = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', ?)").run(roomId, body)
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(r.lastInsertRowid) as Record<string, unknown>
    hub.publish(roomId, 'message', { ...row, author_name: '시스템', attachments: [] })
  }

  return {
    onGatewayRequest(info, params) {
      // 대기 등록이 system 저장보다 먼저다 — 저장이 실패해도 대기 항목은 남아야 터미널 승인 경로가 살아 있다 (plan.md §B)
      open.set(params.request_id, info)
      const body = [
        `🔒 봇이 도구 사용 승인을 요청합니다: ${params.tool_name}`,
        params.description,
        params.input_preview,
        `승인하려면 "yes ${params.request_id}", 거절하려면 "no ${params.request_id}" 라고 답해주세요.`,
      ].join('\n')
      postSystem(info.roomId, body)
    },

    tryHandleUserReply(roomId, userId, text) {
      const m = PERMISSION_REPLY_RE.exec(text)
      if (!m) return false                       // 판정 형식이 아니면 흘려보낸다 (REQ-PERM-010)
      // 멤버십 백스톱 (REQ-ROOMAUTHZ-012) — 메시지 라우트의 게이트가 이미 막지만, 두 번째 호출부가
      // 생기는 날 그 경로는 보호되지 않는다. 라우트가 막는다고 빼면 안 되는 중복이다 (plan.md §C·§H).
      // 소비(delete) 전에 가르므로 거부된 답은 대기 항목을 건드리지 않는다 — SPEC-MSG-001 의
      // 쓰기·읽기 봉인과 같은 형태다
      if (!isRoomMember(db, roomId, userId)) return false
      const requestId = m[2].toLowerCase()       // 대문자로 답해도 봇은 소문자로 알아본다 (REQ-PERM-006)
      const info = open.get(requestId)
      if (!info) return false                    // 모르는 ID — 재시작 직후와 같은 경로다 (REQ-PERM-003·010)
      if (info.roomId !== roomId) return false   // 다른 방의 답은 소비도 전송도 하지 않고 항목을 남긴다 (REQ-PERM-011)
      open.delete(requestId)                     // 해제는 전송 시도 직후 — 성공 여부와 무관 (plan.md §B). 남기면 같은 답을 무한 재시도할 수 있다
      const behavior = m[1][0].toLowerCase() === 'y' ? 'allow' : 'deny'   // 정규식이 y|yes|n|no 로 좁혔으니 첫 글자로 갈린다 (REQ-PERM-006·007)
      const sent = app.gateway.sendToBot(info.roomId, info.botId, { type: 'permission_verdict', request_id: requestId, behavior })
      // 반환값을 읽는다 — 버리면 봇이 죽은 동안 누른 승인이 화면상 성공으로 보인다 (plan.md §D 3번, REQ-PERM-009)
      const body = !sent
        ? `⚠️ 봇이 접속해 있지 않아 판정을 전달하지 못했습니다 (${requestId})`
        : behavior === 'allow' ? `✅ 승인 전송됨 (${requestId})` : `⛔ 거절 전송됨 (${requestId})`
      postSystem(info.roomId, body)
      return true
    },
  }
}
