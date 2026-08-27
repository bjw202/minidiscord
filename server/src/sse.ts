// SSE 허브 — 방별 구독자 집합 관리와 프레임 발행. 순수 메모리 구조로 DB·디스크·타이머를 쓰지 않는다.
import type { ServerResponse } from 'node:http'

// @MX:ANCHOR: [AUTO] Task 8·9·10(게이트웨이·메시지 라우트·권한 릴레이)이 결합하는 발행/구독 계약
// @MX:REASON: subscribe/publish 시그니처는 spec.md REQ-SSE-001 이 문자 그대로 못 박는 공개 표면이라 한 글자 바꾸면 세 파일이 함께 깨진다
export interface SseHub {
  subscribe(roomId: number, res: ServerResponse): void
  publish(roomId: number, event: string, data: unknown): void
  subscriberCount(roomId: number): number
}

// 프로세스당 하나만 만들어 buildServer 가 app.decorate('hub', …) 로 붙인다.
export function createSseHub(): SseHub {
  const rooms = new Map<number, Set<ServerResponse>>()

  return {
    // 구독 — 순서가 계약이다: 헤더 → 연결 확인 주석 → 집합 등록 → close 정리 (REQ-SSE-002)
    // ': connected' 는 한 번만 보내는 연결 개시 신호다. 하트비트가 아니므로 절대 반복하지 않는다.
    subscribe(roomId, res) {
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      })
      res.write(': connected\n\n')

      let set = rooms.get(roomId)
      if (!set) {
        set = new Set()
        rooms.set(roomId, set)
      }
      set.add(res)

      // 연결 종료 감지 — 구독자를 집합에서 빼고, 집합이 비면 방 항목 자체를 지운다 (REQ-SSE-008)
      res.on('close', () => {
        const s = rooms.get(roomId)
        if (!s) return
        s.delete(res)
        if (s.size === 0) rooms.delete(roomId)
      })
    },

    // 발행 — 그 방 구독자 전원에게 같은 프레임. 이벤트명은 검증하지 않고 그대로 쓴다.
    // 구독자 없는 방은 집합을 만들지 않고 조용히 반환한다 (REQ-SSE-007).
    // 프레임 끝의 빈 줄('\n\n')까지 정확히 이 모양이어야 브라우저 EventSource 가 이벤트를 방출한다.
    publish(roomId, event, data) {
      const set = rooms.get(roomId)
      if (!set) return
      const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      for (const res of set) res.write(frame)
    },

    // 관측 표면 — 구독자 누수 검증용이며 어떤 프로덕션 경로도 호출하지 않는다.
    subscriberCount(roomId) {
      return rooms.get(roomId)?.size ?? 0
    },
  }
}
