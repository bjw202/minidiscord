// 권한 릴레이 브로커: 봇의 승인 요청을 방에 system 메시지로 띄우고 사람의 yes/no 답을 판정으로 되돌린다 (spec 7장)
import type { FastifyInstance } from 'fastify'
import type { ConnInfo } from './gateway.js'
import { isRoomMember } from './room-members.js'

// 판정 정규식 — 공식 문서 형식 그대로. l 은 1 과 헷갈려 빼고, /i 로 입력기 자동 대문자화를 흡수한다 (REQ-PERM-005).
// 완화도 강화도 하지 않는다 — 카드 t5 UI 의 /\byes [a-km-z]{5}/ 파서가 이 형식에 결합한다 (plan.md §C)
export const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i

// 등록 형식 검사 — 봇→서버 등록 원본은 공식 형식(소문자 5자, l 제외)을 그대로 요구하므로 /i 를 붙이지 않는 것이 의도다.
// 사람 답변 방향만 PERMISSION_REPLY_RE 의 /i 로 대문자화를 흡수한다. 등록 원본이 대문자면 keyOf 의 소문자화 때문에
// 소문자 id 와 같은 키로 뭉개져 먼저 등록한 요청이 조용히 사라진다 (sync-audit T7-F-03). reply 정규식이 절대 못 맞추는
// id(l 포함·길이≠5)의 등록 — 사람이 안내대로 쳐도 아무 일도 일어나지 않는 결함 — 도 여기서 함께 막는다 (T7-F-02).
const PERMISSION_REQUEST_ID_RE = /^[a-km-z]{5}$/

// 도구 이름 형식 검사 — tool_name 은 접두 없는 1번째 줄 안에 실리므로 봇이 채울 문자를 문자셋·길이로 좁힌다.
// 어긋나도 요청은 거부하지 않는다 — 판정은 request_id 로 흐르고 tool_name 은 표시용 메타데이터일 뿐이라
// 고정 자리표시자로 바꿔 넣는 쪽이 맞다 (재판정 §S3.1, T7-F-09)
const TOOL_NAME_RE = /^[A-Za-z0-9_.\-]{1,40}$/

// 봇이 쓴 줄의 접두 표식 — 접두가 붙은 줄은 봇이 쓴 줄, 접두 없는 줄만 서버가 쓴 줄이다.
// 불변식의 두 절반은 각각 강제점이 있다 — 봇 줄은 접두 표식으로 갈라지고, 접두 없는 줄 안의 봇 텍스트 자리는
// 진입부 형식 검사가 통제한다(tool_name 문자셋·길이 검사 — 재판정 §S3.1, T7-F-09).
// 줄바꿈 중화만으로는 줄 없는 description 이 안내 문구와 똑같은 한 줄을 통째로 차지하는 것을 막지 못하므로
// 봇이 채우는 두 줄(description·input_preview)에 붙여 서버 문구와 시각적으로 갈라 놓는다 (sync-audit 재감사 §R3, 정정 2라운드)
const BOT_MARK = '│ '
// 봇이 보낸 문자열의 줄바꿈과 접두 표식 문자를 눈에 보이는 표식으로 중화한다 — join('\n') 네 줄 구조(REQ-PERM-002) 안에서
// 서버 문구처럼 보이는 가짜 안내 줄이 위조되는 것(줄바꿈)과 표식을 줄 중간에 새겨 접두 없는 서버 줄로 위장하는 것(│)을 막는다
// (sync-audit T7-F-01, 정정 2라운드 §R3)
const oneLine = (s: string) => String(s).replace(/\r\n?|\n/g, ' ⏎ ').replaceAll('│', '/')

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
        // 거절 안내 줄에도 접두가 없다 — 그러므로 봇 원문을 그대로 인용하지 않고 id 문자셋을 통과한 부분만 남긴다.
        // 남는 글자가 하나도 없으면 인용 자체를 생략한다. 진단 가치는 지키되 접두 없는 줄에 봇 텍스트가 실리지 않는다 (T7-F-01·T7-F-10)
        const shown = requestId.replace(/[^A-Za-z0-9_.\-]/g, '').slice(0, 24)
        postSystem(info.roomId, `⚠️ 봇이 보낸 승인 요청의 request_id 가 형식에 맞지 않아 등록하지 않았습니다 ${shown ? `("${shown}")` : '(표시할 수 있는 문자가 없습니다)'}`)
        return
      }
      // tool_name 검사는 요청 거부가 아니라 자리표시자 대체다 — 접두 없는 1번째 줄이 봇이 쓴 안내를 담지
      // 않도록 그 자리를 문자셋·길이로 좁힌다. 요청은 그대로 등록된다 (T7-F-09)
      const rawToolName = String(params.tool_name ?? '')
      const toolName = TOOL_NAME_RE.test(rawToolName) ? rawToolName : '(형식에 맞지 않는 도구 이름)'
      // 대기 등록이 system 저장보다 먼저다 — 저장이 실패해도 대기 항목은 남아야 터미널 승인 경로가 살아 있다 (plan.md §B)
      open.set(keyOf(info.roomId, requestId), info)
      const body = [
        // 1·4 번째 줄에는 접두가 없다 — 1번째 줄의 봇 텍스트 자리(tool_name)는 진입부 문자셋 검사가 통제하고
        // 4번째 줄은 서버 문구만으로 이뤄진다. 접두 없는 줄이 곧 서버가 쓴 줄이라는 불변식이다 (T7-F-09)
        `🔒 봇이 도구 사용 승인을 요청합니다: ${oneLine(toolName)}`,
        BOT_MARK + oneLine(params.description),
        BOT_MARK + oneLine(params.input_preview),
        `승인하려면 "yes ${requestId}", 거절하려면 "no ${requestId}" 라고 답해주세요.`,
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
      const info = open.get(keyOf(roomId, requestId))
      if (!info) return false                    // 모르는 ID — 재시작 직후와 같은 경로다 (REQ-PERM-003·010)
      open.delete(keyOf(roomId, requestId))      // 해제는 전송 시도 직후 — 성공 여부와 무관 (plan.md §B). 남기면 같은 답을 무한 재시도할 수 있다
      const behavior = m[1][0].toLowerCase() === 'y' ? 'allow' : 'deny'   // 정규식이 y|yes|n|no 로 좁혔으니 첫 글자로 갈린다 (REQ-PERM-006·007)
      // REQ-PERMROUTE-006 — 판정은 «요청한 접속 하나» 로만 되돌아간다. 전원 발신 메서드는 판정 경로에서 부르지 않는다
      // REQ-PERMROUTE-008 — 접속을 찾지 못해도 같은 (방, 봇) 의 다른 접속으로 «대신 보내지 않는다» — 대체 발신은 채널 가드 의존의 재생이다
      // REQ-PERMROUTE-007 — 되돌리지 못하는 갈래는 둘이고 문구도 둘이다: (ㄱ) connId 가 있으나 그 접속이 없다 · (ㄴ) connId 자체가 없다
      // (ㄴ) 에 (ㄱ) 의 «끊겼다» 를 쓰면 아무것도 끊기지 않은 갈래에 틀린 진단을 준다 — 두 문구는 서로 다르다 (2회차 감사 N-06)
      // 두 실패 문구 모두 꼬리 «전달하지 못했습니다 (<id>)» 를 유지한다 — web/rich.js RESOLUTION_RE 가 그 꼬리만으로 인식한다 ([HARD])
      const sent = info.connId != null
        ? app.gateway.sendToOrigin(info.connId, { type: 'permission_verdict', request_id: requestId, behavior })
        : false
      // 반환값을 읽는다 — 버리면 봇이 죽은 동안 누른 승인이 화면상 성공으로 보인다 (plan.md §D 3번, REQ-PERM-009)
      const body = info.connId == null
        ? `⚠️ 요청한 세션의 신원이 기록되지 않아 판정을 전달하지 못했습니다 (${requestId})`
        : !sent
          ? `⚠️ 요청한 세션이 끊겨 판정을 전달하지 못했습니다 (${requestId})`
          : behavior === 'allow' ? `✅ 승인 전송됨 (${requestId})` : `⛔ 거절 전송됨 (${requestId})`
      postSystem(info.roomId, body)
      return true
    },
  }
}
