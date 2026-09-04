// SPEC-WSUPGRADE-001 M2 — 지문표·2차 판정·세 갈래 사상의 합성 입력 시험(plan.md §F M2).
// 합성 입력만 쓴다 — 실제 404 포획을 기다리지 않는다(AC-003 · AC-004 (1) · AC-009).
// AC-004 의 (2) 정의역 도달성 조항은 이 시험이 재는 것이 아니다 — 합성 입력이 세 이름을 낸다는
// 것은 함수가 판별력을 갖는다는 뜻일 뿐 그 입력이 실제 포획에서 발생 가능하다는 뜻이 아니며,
// 도달성 근거는 실제 포획 기록 또는 탐침 출력으로 M5 가 채운다(현재 상태: H-2 재현됨,
// H-1·H-3 근거 없음 — acceptance AC-004 · plan.md §F M2).
import { describe, expect, it } from 'vitest'
import {
  classifyComparison,
  fingerprint,
  secondVerdict,
  type CaptureRecord,
} from './wsupgrade-judgment.js'

// 합성 기록 — AC 가 명시한 최소 필드를 채우고 나머지는 «명시된 없음» 으로 둔다.
// null 과 빈 배열은 누락이 아니라 명시다(AC-002 이분 판정과 같은 규약).
function synth(over: Partial<CaptureRecord> & Pick<CaptureRecord, 'statusCode' | 'headers' | 'body'>): CaptureRecord {
  return {
    statusLine: `HTTP/1.1 ${over.statusCode}`,
    localAddress: null,
    localPort: null,
    remoteAddress: null,
    remotePort: null,
    localFamily: null,
    remoteFamily: null,
    windowLogs: { upgrade: [], onRequest: [] },
    attributionHits: [],
    attributionHitCount: 0,
    tOpen: 0,
    tClose: 1,
    collision: '없음',
    portPossession: null,
    capturedAt: '1970-01-01T00:00:00.000Z',
    clientPath: null,
    ...over,
  }
}

// acceptance AC-003 둘째 입력의 본문 — 관측된 Fastify 기본 404 모양 그대로다.
const FASTIFY_BODY = '{"message":"Route GET:/bot not found","error":"Not Found","statusCode":404}'

describe('SPEC-WSUPGRADE-001 지문표 (AC-003)', () => {
  it('다섯 합성 입력을 서로 다른 다섯 이름으로 가른다', () => {
    const ws400 = synth({ statusCode: 400, headers: [{ name: 'Sec-WebSocket-Version', value: '13, 8' }], body: '' })
    const fastify = synth({ statusCode: 404, headers: [{ name: 'content-type', value: 'application/json' }], body: FASTIFY_BODY })
    const bare = synth({ statusCode: 404, headers: [{ name: 'connection', value: 'keep-alive' }], body: 'plain-404' })   // F2 탐침의 실제 응답 모양
    const html = synth({ statusCode: 404, headers: [{ name: 'content-type', value: 'text/html' }], body: '<html>404</html>' })
    const other = synth({ statusCode: 502, headers: [], body: '' })

    expect(fingerprint(ws400)).toBe('ws WebSocketServer (경로 미스)')
    expect(fingerprint(fastify)).toBe('Fastify 기본 404')
    expect(fingerprint(bare)).toBe('맨 http.createServer')
    expect(fingerprint(html)).toBe('정적·Vite 계열 서버')
    expect(fingerprint(other)).toBe('미분류')   // 추측한 이름을 내면 실패다
    expect(new Set([
      fingerprint(ws400), fingerprint(fastify), fingerprint(bare), fingerprint(html), fingerprint(other),
    ]).size).toBe(5)
  })

  it('content-type 이 json 이어도 본문 모양이 Fastify 가 아니면 미분류다 — 모양으로 가른다', () => {
    const notFastify = synth({ statusCode: 404, headers: [{ name: 'content-type', value: 'application/json' }], body: '{"error":"nope"}' })
    expect(fingerprint(notFastify)).toBe('미분류')
  })
})

describe('SPEC-WSUPGRADE-001 2차 판정 (AC-004 (1))', () => {
  // 귀속 적중 한 항목 — window 라벨이 어느 창의 적중인지를 단다(AC-002).
  const hit = (window: 'upgrade' | 'onRequest') => ({ window, seq: 1, path: '/bot', remotePort: 51000, t: 5 })
  const holding = { ownPort: 4000, listening: true, address: { port: 4000, address: '::1', family: 'IPv6' } }
  const fastify = () => synth({
    statusCode: 404,
    headers: [{ name: 'content-type', value: 'application/json' }],
    body: FASTIFY_BODY,
    localPort: 51000,
    clientPath: '/bot',
    portPossession: holding,
  })

  it('창2 귀속 적중 ≥ 1 → H-3 (㉮)', () => {
    const r = { ...fastify(), attributionHits: [hit('onRequest')], attributionHitCount: 1 }
    expect(secondVerdict(r)).toBe('H-3')
  })

  it('적중 0 + 포트 보유 없음 → H-1 (㉯) — listening false 와 address 포트 불일치 둘 다', () => {
    const closed = { ...fastify(), portPossession: { ownPort: 4000, listening: false, address: null } }
    const moved = { ...fastify(), portPossession: { ownPort: 4000, listening: true, address: { port: 9999, address: '127.0.0.1', family: 'IPv4' } } }
    expect(secondVerdict(closed)).toBe('H-1')
    expect(secondVerdict(moved)).toBe('H-1')
  })

  it('적중 0 + 포트 보유 → H-2 (㉰)', () => {
    expect(secondVerdict(fastify())).toBe('H-2')
  })

  it('창1 단독 적중(㉮′)·귀속 대조 불가(㉱)·귀속 충돌은 전부 미분류다', () => {
    // ㉮′ — 창1 단독 적중은 자기모순 관측이다. H-3 을 내면 실패다(acceptance AC-004 다섯째 입력).
    const window1Only = { ...fastify(), attributionHits: [hit('upgrade')], attributionHitCount: 1 }
    expect(secondVerdict(window1Only)).toBe('미분류')
    // ㉱ — localPort 를 못 읽으면 대조 자체가 불가능하다.
    const unreadable = { ...fastify(), localPort: null }
    expect(secondVerdict(unreadable)).toBe('미분류')
    // 충돌 — 같은 remotePort·경로 후보가 둘 이상이면 귀속은 성립하지 않은 것으로 다룬다(§2 「귀속」).
    const collided = { ...fastify(), attributionHits: [hit('upgrade'), hit('upgrade')], attributionHitCount: 2, collision: '있음' }
    expect(secondVerdict(collided)).toBe('미분류')
  })

  it('지문 ② 가 아닌 기록에서는 판정표가 돌지 않는다', () => {
    const ws400 = synth({ statusCode: 400, headers: [{ name: 'Sec-WebSocket-Version', value: '13, 8' }], body: '' })
    expect(secondVerdict(ws400)).toBe('미분류')
  })
})

describe('SPEC-WSUPGRADE-001 세 갈래 사상 (AC-009)', () => {
  it('네 조합이 네 이름으로 사상되고, (0,0) 은 PASS 가 아니라 미관측이다', () => {
    expect(classifyComparison(1, 0)).toBe('병렬에서만 실패')
    expect(classifyComparison(3, 2)).toBe('항상 실패')
    expect(classifyComparison(0, 0)).toBe('미관측')   // REQ-WSUPGRADE-008 — PASS 로 사상 금지
    expect(classifyComparison(0, 1)).toBe('뒤집힘')   // 예상 밖을 이름 없는 통에 접지 않는다
    expect(new Set([
      classifyComparison(1, 0), classifyComparison(1, 1), classifyComparison(0, 0), classifyComparison(0, 1),
    ]).size).toBe(4)
  })
})
