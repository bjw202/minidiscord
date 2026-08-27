// 권한 릴레이 브로커: 봇의 승인 요청을 방에 system 메시지로 띄우고 사람의 yes/no 답을 판정으로 되돌린다 (spec 7장)
import type { FastifyInstance } from 'fastify'
import type { ConnInfo } from './gateway.js'

// 판정 정규식 — 공식 문서 형식 그대로. l 은 1 과 헷갈려 빼고, /i 로 입력기 자동 대문자화를 흡수한다 (REQ-PERM-005).
// 완화도 강화도 하지 않는다 — 카드 t5 UI 의 /\byes [a-km-z]{5}/ 파서가 이 형식에 결합한다 (plan.md §C)
export const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i

// 등록 형식 검사 — 봇→서버 등록 원본은 공식 형식(소문자 5자, l 제외)을 그대로 요구하므로 /i 를 붙이지 않는 것이 의도다.
// 사람 답변 방향만 PERMISSION_REPLY_RE 의 /i 로 대문자화를 흡수한다. 등록 원본이 대문자면 keyOf 의 소문자화 때문에
// 소문자 id 와 같은 키로 뭉개져 먼저 등록한 요청이 조용히 사라진다 (sync-audit T7-F-03). reply 정규식이 절대 못 맞추는
// id(l 포함·길이≠5)의 등록 — 사람이 안내대로 쳐도 아무 일도 일어나지 않는 결함 — 도 여기서 함께 막는다 (T7-F-02).
const PERMISSION_REQUEST_ID_RE = /^[a-km-z]{5}$/

// 봇이 보낸 문자열의 줄바꿈을 눈에 보이는 표식으로 중화한다 — join('\n') 네 줄 구조(REQ-PERM-002) 안에서
// 서버 문구처럼 보이는 가짜 안내 줄이 위조되는 것을 막는다 (sync-audit T7-F-01)
const oneLine = (s: string) => String(s).replace(/\r\n?|\n/g, ' ⏎ ')

// @MX:ANCHOR: [AUTO] index.ts 배선과 routes-messages 가로채기가 소비하는 브로커 공개 계약 (REQ-PERM-004)
// @MX:REASON: createPermissionBroker/PermissionBroker 시그니처는 spec.md REQ-PERM-004 가 글자 그대로 고정한다
export interface PermissionBroker {
  onGatewayRequest(info: ConnInfo, params: { request_id: string; tool_name: string; description: string; input_preview: string }): void
  tryHandleUserReply(roomId: number, text: string): boolean
}

export function createPermissionBroker(app: FastifyInstance): PermissionBroker {
  const db = app.db
  const hub = app.hub
  // 대기 레지스트리 — 프로세스 메모리 맵이며 디스크에 저장되지 않는다 (REQ-PERM-003).
  // 키는 방 이름공간 합성키(방:소문자 id) — 같은 request_id 가 여러 방에 걸려도 서로를 덮어쓰지 않는다 (REQ-PERM-006)
  // 재시작으로 비는 것은 수용된 설계다 — 세션 쪽 승인 대화상자는 살아 있어 터미널에서 직접 승인할 수 있다
  const open = new Map<string, ConnInfo>()
  // 합성키 — 키에 방 번호가 박혀 있으므로 다른 방의 답은 맵 조회 자체가 놓친다. 소비·전송 없이 대기 항목이 살아 남는 것이 곧 REQ-PERM-011 이다
  const keyOf = (roomId: number, requestId: string) => `${roomId}:${requestId.toLowerCase()}`

  // system 메시지 저장 + 같은 방에 SSE 발행. 이벤트 이름은 기존 'message' 하나 — 새 이벤트 타입을 만들지 않는다 (REQ-PERM-013)
  function postSystem(roomId: number, body: string): void {
    const r = db.prepare("INSERT INTO messages (room_id, author_type, body) VALUES (?, 'system', ?)").run(roomId, body)
    const row = db.prepare('SELECT * FROM messages WHERE id = ?').get(r.lastInsertRowid) as Record<string, unknown>
    hub.publish(roomId, 'message', { ...row, author_name: '시스템', attachments: [] })
  }

  return {
    onGatewayRequest(info, params) {
      // 형식 검사가 등록보다 먼저다 — 어긋난 id 는 대기 항목을 만들지 않고 거절 안내 한 줄로 끝난다 (T7-F-02·03)
      const requestId = String(params.request_id ?? '')
      if (!PERMISSION_REQUEST_ID_RE.test(requestId)) {
        // 거절 안내에 들어가는 id 도 줄바꿈 중화·길이 절단을 거친다 — 거절 문구 자체가 위조 경로가 되지 않도록 (T7-F-01)
        postSystem(info.roomId, `⚠️ 봇이 보낸 승인 요청의 request_id 가 형식에 맞지 않아 등록하지 않았습니다 ("${oneLine(requestId).slice(0, 24)}")`)
        return
      }
      // 대기 등록이 system 저장보다 먼저다 — 저장이 실패해도 대기 항목은 남아야 터미널 승인 경로가 살아 있다 (plan.md §B)
      open.set(keyOf(info.roomId, requestId), info)
      const body = [
        `🔒 봇이 도구 사용 승인을 요청합니다: ${oneLine(params.tool_name)}`,
        oneLine(params.description),
        oneLine(params.input_preview),
        `승인하려면 "yes ${requestId}", 거절하려면 "no ${requestId}" 라고 답해주세요.`,
      ].join('\n')
      postSystem(info.roomId, body)
    },

    tryHandleUserReply(roomId, text) {
      const m = PERMISSION_REPLY_RE.exec(text)
      if (!m) return false                       // 판정 형식이 아니면 흘려보낸다 (REQ-PERM-010)
      const requestId = m[2].toLowerCase()       // 대문자로 답해도 봇은 소문자로 알아본다 (REQ-PERM-006)
      const info = open.get(keyOf(roomId, requestId))
      if (!info) return false                    // 모르는 ID — 재시작 직후와 같은 경로다 (REQ-PERM-003·010)
      open.delete(keyOf(roomId, requestId))      // 해제는 전송 시도 직후 — 성공 여부와 무관 (plan.md §B). 남기면 같은 답을 무한 재시도할 수 있다
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
