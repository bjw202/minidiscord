// MCP 채널 플러그인: 채널 서버와 게이트웨이 클라이언트를 잇는 배선 (SPEC-CHANWIRE-001).
// wire() 는 배선을 세우기만 하고 시작하지 않는다 — 접속(gw.start)과 stdio 연결은 호출자의 몫이다.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { pathToFileURL } from 'node:url'
import { createChannelServer, neutralizeEnvelope, type ChannelHandle, type ChatMessage } from './channel-server.js'
import { createGatewayClient, type GatewayClient } from './gateway-client.js'
import { MAX_BODY_BYTES, MAX_HISTORY_BYTES, MAX_NAME_BYTES, truncateToBudget } from './truncate.js'

export interface WireOpts {
  url: string
  token: string
}

// 기본 주소는 문자열 하나까지 계약이다 — 서버를 기본 포트로 띄우고 환경변수 없이 봇을 붙이는 것이 표준 사용법이다.
export const DEFAULT_SERVER = 'ws://127.0.0.1:3000/bot'

export function resolveUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.MINIDISCORD_SERVER ?? DEFAULT_SERVER
}

// @MX:ANCHOR: [AUTO] 채널 진입점의 조립 지점 — 여섯 기준 파일이 이 함수 하나로 전체 배선을 세운다 (t4 감사 F-13)
// @MX:REASON: 두 팩토리를 잇는 순서와 콜백 갈래(TO -> working, cc 무시)가 여기 한 곳에만 있다.
// 반환 모양 { channel, gw } 를 바꾸면 채널 기준 전부가 한꺼번에 죽는다
export function wire(opts: WireOpts): { channel: ChannelHandle; gw: GatewayClient } {
  // «마지막 to 방» — 채널이 가장 최근에 delivery="to" 알림을 세션에 넘긴 방의 번호 (SPEC-BOTMODEL-001 §2).
  // chat_id 가 없는 reply·fetch_history 와 permission_request 의 방을 이것으로 채운다 (결정 ①·②, 겹 2 — 안전망이지 기본 경로가 아니다).
  let lastToRoom: number | null = null
  // 방 번호 세 겹 (design.md §C.2): ① 세션이 chat_id 로 채운다 → ② 없으면 마지막 to 방 → ③ 그것도 없으면 null —
  // 프레임은 room_id 없이 나가고 서버가 버린다 (REQ-BOTMODEL-013).
  const roomOf = (chatId: string | undefined): number | null => {
    const n = chatId === undefined ? NaN : Number(chatId)
    return Number.isInteger(n) ? n : lastToRoom
  }
  const withRoom = (roomId: number | null, frame: Record<string, unknown>): Record<string, unknown> =>
    roomId === null ? frame : { room_id: roomId, ...frame }

  // 두 클로저는 서로를 참조하지만 호출은 gw.start() 이후에만 일어난다 — 선언 순서는 안전하다 (plan.md §D 7번).
  const gw = createGatewayClient({
    url: opts.url,
    token: opts.token,
    // 수신 갈래 + 상태 갈래. TO 이면 방을 기억하고, 세션에 넘기기 전에 그 방의 working 을 먼저 보낸다 (REQ-CHANWIRE-008, REQ-BOTMODEL-020).
    // gateway-client 가 이 콜백을 await 하지 않으므로 여기서 생긴 거부는 아무도 받지 않는다.
    // MCP 상대가 먼저 끊긴 뒤 채팅이 오면 pushChatMessage 가 거부되므로 명시적으로 삼킨다 —
    // 판정 갈래의 .catch(() => {}) (channel-server.ts) 와 같은 형태의 방어다.
    onMessage: async (m: ChatMessage) => {
      if (m.delivery === 'to') {
        lastToRoom = m.room_id
        gw.send({ type: 'status', room_id: m.room_id, state: 'working' })
      }
      await channel.pushChatMessage(m).catch(() => {})
    },
    // 판정 갈래: 게이트웨이 verdict 를 세션 알림으로 되돌린다. 두 필드만 골라 넘긴다 —
    // payload 의 type 같은 계약 밖 필드는 세션으로 가지 않는다 (REQ-CHANPERM-004).
    onVerdict: v => {
      channel.handlePermissionVerdict({ request_id: v.request_id, behavior: v.behavior })
    },
  })
  const channel = createChannelServer({
    // 송신 갈래. files 는 경로 문자열을 { local_path } 객체로 바꿔 싣는다 — 게이트웨이가 읽는 필드 이름이다 (REQ-CHANWIRE-011).
    // 방은 세 겹(roomOf)으로 정한다. idle 은 bot_message 다음에 같은 방으로 나간다 — 순서가 계약이다 (REQ-CHANWIRE-009, REQ-BOTMODEL-020).
    sendToChat: async payload => {
      const roomId = roomOf(payload.chat_id)
      gw.send(withRoom(roomId, { type: 'bot_message', body: payload.text, files: (payload.files ?? []).map(local_path => ({ local_path })) }))
      gw.send(withRoom(roomId, { type: 'status', state: 'idle' }))
    },
    // 승인 요청 갈래: 마지막 to 방을 room_id 로 싣고 params 에 type 을 붙여 내보낸다 (REQ-CHANPERM-004, 결정 ①).
    // 서버 쪽 대기 맵의 봇:id 색인이 이 근사가 틀린 경우를 받쳐 준다 (REQ-BOTMODEL-023).
    sendPermissionRequest: params => {
      gw.send(withRoom(lastToRoom, { type: 'permission_request', ...params }))
    },
    // 이력 갈래. chat_id 는 방 번호로 바꿔 room_id 로 싣고 나머지 파라미터는 그대로 넘긴다 — since_id 는 봇의 따라잡기 커서다 (REQ-CHANWIRE-012).
    // 결과는 구조화 JSON 문자열 하나다 (REQ-CHANINJECT-004·006): 줄 잇기를 버려 본문의 개행·#숫자·따옴표가
    // 원소 경계나 커서를 만들지 못하고, 커서는 배열 밖 cursor 필드에서 id 최댓값으로만 나온다 (REQ-CHANINJECT-005).
    // 빈 이력도 같은 모양의 JSON 이다 — 결과 타입이 갈리면 커서가 다시 텍스트 추측으로 돌아간다 (plan.md §B).
    // author·body 는 알림 통로와 같은 규칙(REQ-CHANINJECT-001)으로 중화한다 (v0.3.0, sync 감사 F-01) —
    // 알림만 중화하면 같은 문자열이 통로만 바꾸어 모델에 도착한다. id·at 은 무변형이다 — id 는
    // 커서의 유일한 출처이고(REQ-CHANINJECT-005), 중화 함수는 channel-server.ts 한 벌을 나눠 쓴다.
    fetchHistory: async params => {
      const { chat_id, ...rest } = params
      const roomId = roomOf(chat_id)
      const res = await gw.requestHistory(roomId === null ? rest : { room_id: roomId, ...rest })
      const messages: { id: number; author_name: string; body: string; created_at: string }[] = res.messages ?? []
      // 최종 문서를 하나의 함수로 빚는다 — 2단계의 총바이트 판정과 반환값이 같은 모양을 쓰도록.
      // cursor 도 이 문자열의 일부다 — 그래서 총바이트 판정에 cursor 가 함께 잰다 (AC-BOTSTAB-007 ㉠ 의 대상).
      const doc = (list: { id: number }[]) =>
        JSON.stringify({ cursor: list.length > 0 ? Math.max(...list.map(m => m.id)) : null, messages: list })
      // 1단계 — 원소별 절단 (REQ-BOTSTAB-007 1단계, plan.md §E). 절단은 중화 뒤에 온다 (plan.md §B).
      // truncateToBudget 은 시길 탈출을 절단보다 먼저 하므로(§C-4) 사람 유래 날것 시길도 여기서 0 이 된다.
      // id·at 은 무변형이다 — id 는 커서의 유일한 출처이고(REQ-CHANINJECT-005). author 는 OD-5 로 절단된다 —
      // 알림 통로와 같은 상수다(sync 감사 F1 수리, 카드 t25). 서버가 username 길이를 검사하지 않으므로
      // (auth.ts:32) 무절단 author 는 2단계 루프로 원소째 버려져 cursor null 을 냈고, 저 위의 중화 주석이
      // author 중화의 근거를 진다. 이 절차와 버리는 방향은 이 클로저 안에만 산다 (plan.md §I).
      const kept = messages.map(m => ({
        id: m.id,
        at: m.created_at,
        author: truncateToBudget(neutralizeEnvelope(m.author_name), MAX_NAME_BYTES),
        body: truncateToBudget(neutralizeEnvelope(m.body), MAX_BODY_BYTES),
      }))
      // 2단계 — 새것부터 버리기 (REQ-BOTSTAB-007 2단계, plan.md §E). 오래된 것부터 버리면 cursor 가
      // 버려진 원소를 «이미 지나간 것» 으로 선언하고 그 메시지들은 다음 요청부터 조용히 영구히 사라진다 —
      // SPEC-CHANINJECT-001 F-03 의 커서 오염이다. 새것부터 버리면 버려진 메시지는 다음 요청에서 다시 온다.
      // @MX:NOTE: [AUTO] 버리는 방향(큰 id 먼저)과 cursor 의 계산원(실린 집합)은 이 SPEC 의 두 계약이다 — 방향을 뒤집거나 전체 최댓값으로 돌리면 커서 오염이 돌아온다
      // @MX:SPEC: SPEC-BOTSTAB-001
      while (kept.length > 0 && Buffer.byteLength(doc(kept), 'utf8') > MAX_HISTORY_BYTES) {
        let newest = 0
        for (let i = 1; i < kept.length; i++) if (kept[i].id > kept[newest].id) newest = i
        kept.splice(newest, 1)
      }
      // INV-2(acceptance.md) 가 «원소 하나 + 봉투 + 표시 ≤ OD-4» 를 보증하므로 위 루프는 0개로 닿지 않는다 —
      // 그래서 cursor null 은 입력이 빈 배열일 때만 나온다 (엣지 E-1).
      return doc(kept)
    },
  })
  return { channel, gw }
}

// 진입점 가드: 이 모듈이 실행 파일로 직접 구동될 때만 부작용이 일어난다. 임포트만으로는 아무 일도 없다 (REQ-CHANWIRE-002).
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.MINIDISCORD_TOKEN
  const url = resolveUrl()
  const { channel, gw } = wire({ url, token: token ?? '' })
  // stdio 연결은 토큰과 무관하게 항상 — 토큰 없이 띄운 프로세스도 MCP 로 말을 걸면 답한다 (REQ-CHANWIRE-003·004).
  await channel.server.connect(new StdioServerTransport())
  // 토큰 게이트는 게이트웨이 접속만 가로막는다 (REQ-CHANWIRE-004) — stdio 는 잠그지 않는다.
  // 전송 스킴 검사(루프백 밖은 wss 만)는 v2 에서 지웠다 — 사내 LAN 의 ws:// 주소가 표준 사용법이다 (v2-review.md §2.5).
  // stdout 은 MCP 전송 통로라 한 글자도 쓸 수 없다.
  if (token) gw.start()
}
