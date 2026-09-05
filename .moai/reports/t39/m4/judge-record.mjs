// SPEC-WSUPGRADE-001 M4 — AC-001·AC-002 포획 기록 판정기(.moai/reports/t39/m4/).
// 포획 JSON 한 건을 acceptance 의 이분 판정 그대로 재는 것: AC-001 의 넷 + AC-002 의 열.
// "명시된 0·없음"과 누락을 가른다(AC-002 이분 판정) — null·빈 배열은 값이고, 필드 자체의
// 부재가 실패다.
//
// --trigger 모드: 하네스 트리거(/nope 경로 미스 → ws 의 400)로 얻은 포획에만 쓰는 단서다.
// 그 포획은 «자기 앱의 ws 가 답한 것»이므로(acceptance §A·spec.md F1) (1) 창1(upgrade)이
// 그 요청을 관측했어야 하고(배열1 실측 — 리스너 수 2, 귀속 적중 1), (2) 귀속 대조가
// 적중 ≥ 1 을 내야 하며, (3) 자기 앱 포트 보유 상태가 null 이어서는 안 된다(포획 직전에
// 그 포트를 낸 build() 가 살아 있다). 이 세 단서 덕에 «귀속 대조 삭제»·«창1 삭제»·«보유
// 상태 삭제» 변이가 각각 자기 필드에서 잡힌다.
//
// 용법: node judge-record.mjs <capture.json> [--trigger]
import { readFileSync } from 'node:fs'

const path = process.argv[2]
const trigger = process.argv.includes('--trigger')
if (!path) {
  console.error('용법: node judge-record.mjs <capture.json> [--trigger]')
  process.exit(2)
}

const rec = JSON.parse(readFileSync(path, 'utf8'))
const fails = []

// — AC-001: 응답 원문 넷 —
// statusLine 은 문자열이어야 한다.
if (typeof rec.statusLine !== 'string' || rec.statusLine === '')
  fails.push('AC-001 statusLine 누락 또는 빈 값')
// 헤더 전건 — 쌍의 배열이고, 비(非)101 응답에는 헤더가 반드시 있으므로 빈 배열은 실패다.
if (!Array.isArray(rec.headers) || rec.headers.length === 0)
  fails.push('AC-001 headers 전건 누락 또는 빈 배열')
else if (rec.headers.some(h => typeof h.name !== 'string' || typeof h.value !== 'string'))
  fails.push('AC-001 headers 쌍(name,value) 아님')
// 상태 코드·본문 — 본문은 «전체»가 기록되면 된다(ws 의 400 은 본문이 빈 것이 원문이다.
// 본문 비어 있음은 트리거의 성질이지 기록 실패가 아니다 — 기록 파일에 그대로 남는다).
if (typeof rec.statusCode !== 'number') fails.push('AC-001 statusCode 누락')
if (typeof rec.body !== 'string') fails.push('AC-001 body 누락')

// — AC-002: 소켓 양끝 넷과 계열 둘(필드 존재 — null 도 값이다) —
for (const k of ['localAddress', 'localPort', 'remoteAddress', 'remotePort', 'localFamily', 'remoteFamily'])
  if (rec[k] === undefined) fails.push(`AC-002 ${k} 누락`)

// — AC-002: 자기 앱 수신 관측 로그(두 창) —
if (!rec.windowLogs || !Array.isArray(rec.windowLogs.upgrade) || !Array.isArray(rec.windowLogs.onRequest)) {
  fails.push('AC-002 windowLogs 두 창 배열 누락')
} else {
  const entries = [...rec.windowLogs.upgrade, ...rec.windowLogs.onRequest]
  for (const e of entries)
    if (!(e.window && typeof e.seq === 'number' && 'path' in e && 'remotePort' in e && typeof e.t === 'number'))
      fails.push('AC-002 창 항목 필드 누락(window/seq/path/remotePort/t)')
  if (trigger && rec.statusCode !== 101 && rec.windowLogs.upgrade.length === 0)
    fails.push('AC-002 창1(upgrade) 관측 누락 — 포획된 그 요청이 창1 에 잡히지 않았다(명시된 0 이 아니라 못 잡은 0)')
}

// — AC-002: 귀속 적중 항목 전건(0 이면 빈 배열이 «명시») —
if (!Array.isArray(rec.attributionHits)) {
  fails.push('AC-002 attributionHits 누락 — 항목 전건이 배열이 아니다')
} else {
  if (rec.attributionHitCount !== rec.attributionHits.length)
    fails.push('AC-002 attributionHitCount 가 항목 배열과 불일치')
  for (const h of rec.attributionHits)
    if (!h.window) fails.push('AC-002 귀속 적중 항목에 창 표지(window) 없음')
  if (trigger && rec.statusCode !== 101 && rec.attributionHits.length === 0)
    fails.push('AC-002 귀속 적중 0 — 트리거된 자기 앱 요청이 귀속 대조에서 사라졌다(대조 삭제 변이의 적신호)')
}

// — AC-002: 포획 창 경계 두 시각 —
if (typeof rec.tOpen !== 'number' || typeof rec.tClose !== 'number')
  fails.push('AC-002 tOpen/tClose 누락')
else if (rec.tOpen > rec.tClose)
  fails.push('AC-002 tOpen > tClose — 창 경계가 거꾸로다')

// — AC-002: 귀속 충돌 여부 명시 —
if (rec.collision !== '있음' && rec.collision !== '없음')
  fails.push('AC-002 collision 이 «있음/없음» 으로 명시되지 않았다')

// — AC-002: 포획 시점의 포트 보유 상태 —
if (rec.portPossession === undefined)
  fails.push('AC-002 portPossession 누락')
else if (rec.portPossession !== null) {
  const p = rec.portPossession
  if (typeof p.ownPort !== 'number' || typeof p.listening !== 'boolean' || !('address' in p))
    fails.push('AC-002 portPossession 필드 누락(ownPort/listening/address)')
}
if (trigger && rec.portPossession === null)
  fails.push('AC-002 포트 보유 상태 null — 트리거된 자기 앱 포획인데 보유 상태가 기록되지 않았다')

// — 부수: 기록 시각·경로(귀속 대조의 셋째 값) —
if (typeof rec.capturedAt !== 'string' || rec.capturedAt === '') fails.push('부수 capturedAt 누락')
if (!('clientPath' in rec)) fails.push('부수 clientPath 누락')

if (fails.length === 0) {
  console.log(`RECORD-JUDGE: PASS (${path}${trigger ? ' --trigger' : ''})`)
  process.exit(0)
}
console.log(`RECORD-JUDGE: FAIL (${path}${trigger ? ' --trigger' : ''})`)
for (const f of fails) console.log(`  - ${f}`)
process.exit(1)
