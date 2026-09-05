// SPEC-WSUPGRADE-001 M4 — AC-002 변이 상태에서 AC-004 가 함께 무너지는 것의 실행 증거.
// (a) 귀속 제거 변이(항목 수만 남기는 모양)의 기록 — attributionHits 가 항상 [] 다.
//     진짜 H-3 사건(창2 귀속 적중이 있었을 사건)의 기록이라도 개수-only 모양에서는
//     창2 적중을 읽을 수 없어 H-3 에 도달하지 못한다 → 2차 판정이 «이 요청»에 설 수 없다.
// (d) 보유 상태 제거 변이의 기록 — portPossession 이 항상 null 다.
//     적중 0 기록에서 H-1·H-2 가 같은 미분류로 붕괴한다 → H-1/H-2 구분 소실.
// (모듈은 변이 없는 원본 wsupgrade-judgment.ts 를 쓴다 — 무너지는 것은 입력 모양이다.)
import { secondVerdict } from '../../../../server/test/wsupgrade-judgment.ts'

const fastify = {
  statusCode: 404,
  statusLine: 'HTTP/1.1 404 Not Found',
  headers: [{ name: 'content-type', value: 'application/json' }],
  body: '{"message":"Route GET:/bot not found","error":"Not Found","statusCode":404}',
  localAddress: '127.0.0.1', localPort: 51000,
  remoteAddress: '127.0.0.1', remotePort: 51000,
  localFamily: 'IPv4', remoteFamily: 'IPv4',
  windowLogs: { upgrade: [], onRequest: [] },
  attributionHits: [],
  attributionHitCount: 0,
  tOpen: 1000, tClose: 1100,
  collision: '없음',
  portPossession: { ownPort: 4000, listening: true, address: { port: 4000, address: '::1', family: 'IPv6' } },
  capturedAt: '2026-09-05T00:00:00.000Z',
  clientPath: '/bot',
}

// (a) — 개수-only 모양(창2 관측이 «3건» 있었다고 해도 항목이 없으면 귀속을 읽을 길이 없다).
const countOnly = { ...fastify, windowLogs: { upgrade: [], onRequest: [] }, attributionHits: [], attributionHitCount: 0 }
console.log('(a) 귀속 제거(항목 수만) 기록 → secondVerdict:', secondVerdict(countOnly),
  '← 창2 귀속 적중을 읽을 수 없어 H-3 불도달(AC-004 동반 실패)')

// (d) — 보유 상태 제거 모양.
const noPossession = { ...fastify, portPossession: null }
console.log('(d) 보유 상태 제거 기록 → secondVerdict:', secondVerdict(noPossession),
  '← H-1·H-2 가 같은 미분류로 붕괴(AC-004 동반 실패)')
