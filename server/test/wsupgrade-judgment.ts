// SPEC-WSUPGRADE-001 — 관측 하네스 공용 조각(server/test 전용 순수 모듈). 생산 코드가 아니다 —
// server/src 무수정이 AC-WSUPGRADE-012 다. M1 은 기록 형태와 귀속 대조를 담고(plan.md §F M1),
// M2 가 같은 파일에 지문표(§5.4)·2차 판정·세 갈래 사상(§5.5)을 더한다. 하네스(gateway.test.ts)와
// 판정 시험이 같은 조각을 쓴다 — 사본이 갈라지면 형제 기준이 알아채지 못한다.
// 이 모듈은 순수하다 — 어떤 입출력도 하지 않고, 어떤 부하 프로세스도 만들지 않는다(REQ-009).

// 수신 관측 한 항목 — 창1(upgrade)과 창2(onRequest)가 공유한다. 경로·원격 포트·창 안 순번·시각은
// spec.md §2 「자기 앱 수신 관측」이 요구하는 넷이다. window 는 항목이 어느 창의 것인지 스스로 단다 —
// 귀속 적중 항목이 «어느 창의 것인지»를 단다는 AC-002 요구의 최소 단위다.
export interface WinEntry {
  window: 'upgrade' | 'onRequest'
  seq: number
  path: string | null
  remotePort: number | null
  t: number
}

// 포획 시점의 자기 앱 포트 보유 상태(AC-002 열 가운데 하나). listening === false 거나
// address 의 port 가 ownPort 가 아니면, 자기 앱은 그 포트를 더는 들고 있지 않은 것이다(§5.4 ㉯).
export interface PortPossession {
  ownPort: number
  listening: boolean
  address: unknown   // app.server.address() 의 반환 — AddressInfo | string | null
}

// 포획 기록 — AC-001 의 넷(응답 원문) + AC-002 의 열(소켓 양끝·귀속된 수신 관측·포트 보유).
// 적중 0 은 attributionHits 빈 배열 + attributionHitCount 0 으로, 충돌 없음은 collision '없음' 으로
// 명시한다 — 누락과 «명시된 0·없음» 은 다르다는 AC-002 이분 판정을 형태가 강제한다.
export interface CaptureRecord {
  // — AC-001: 응답 원문 넷 —
  statusCode: number
  statusLine: string                              // 상태 줄 원문 — HTTP/<버전> <코드> <이유구>
  headers: { name: string; value: string }[]      // res.rawHeaders 의 순서·대소문자·중복 보존 쌍
  body: string
  // — AC-002: 소켓 양끝 넷과 계열 둘 —
  localAddress: string | null
  localPort: number | null                        // 클라이언트 임시 포트 — 귀속 대조 값(§2 「귀속」)
  remoteAddress: string | null
  remotePort: number | null                       // 기록 항목일 뿐 판별에 쓰지 않는다(§5.4 버린 판별자)
  localFamily: string | null
  remoteFamily: string | null
  // — AC-002: 자기 앱 수신 관측 — 두 창의 항목 전건 —
  windowLogs: { upgrade: WinEntry[]; onRequest: WinEntry[] }
  // — AC-002: 귀속 적중 항목 전건(0 이면 빈 배열을 명시) —
  attributionHits: WinEntry[]
  attributionHitCount: number
  // — AC-002: 포획 창의 경계 두 시각(§2 「포획 창」) —
  tOpen: number
  tClose: number
  // — AC-002: 귀속 충돌 여부(없으면 '없음' 을 명시) —
  collision: '있음' | '없음'
  // — AC-002: 포획 시점의 포트 보유 상태 —
  portPossession: PortPossession | null
  // — 부수: 기록 시각과 포획된 요청의 경로(귀속 대조의 셋째 값) —
  capturedAt: string
  clientPath: string | null
}

// 귀속 대조(spec.md §2 「귀속」) — 포획된 응답 소켓의 localPort(클라이언트가 그 접속에 쓴 임시
// 포트)와 같은 remotePort, 같은 경로, 포획 창 [tOpen, tClose] 안의 시각을 모두 만족하는 관측 항목이
// 그 요청에 귀속된다. 창 단위 개수 증감은 귀속이 아니다 — 같은 창의 무관한 요청도 그 수를 올린다.
// localPort 나 clientPath 를 못 읽으면 삼중 대조 자체가 불가능하므로(§5.4 ㉱) 적중 없이 끝낸다.
// 충돌 탐지 — 포획 창 안에서 remotePort·경로가 같은 후보가 둘 이상이면 임시 포트 재사용이 삼중
// 대조를 무너뜨릴 수 있으므로 그 사실을 collision 으로 돌려준다. 무너진 대조를 조용히 근거로
// 계상하지 않게 하기 위해서다(귀속은 성립하지 않은 것으로 다룬다 — 사상은 판정기가 미분류로 내린다).
export function attributeHits(
  windows: { upgrade: WinEntry[]; onRequest: WinEntry[] },
  localPort: number | null,
  clientPath: string | null,
  tOpen: number,
  tClose: number,
): { hits: WinEntry[]; collision: boolean } {
  if (localPort === null || clientPath === null) return { hits: [], collision: false }
  const pool = [...windows.upgrade, ...windows.onRequest]
  const hits = pool.filter(e =>
    e.remotePort === localPort && e.path === clientPath && e.t >= tOpen && e.t <= tClose,
  )
  const seen = new Map<string, number>()
  for (const h of hits) {
    const key = `${h.remotePort}|${h.path}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  const collision = [...seen.values()].some(n => n >= 2)
  return { hits, collision }
}

// ===== M2 — 지문표·2차 판정·세 갈래 사상 (spec.md §5.4·§5.5, plan.md §F M2) =====
// 모두 순수 함수다 — 합성 입력으로 시험하고, 실제 포획 기록을 같은 기계로 판정한다.

// 응답자 부류 — 이름은 spec.md §5.4 부류 열을 따른다. 어느 술어에도 걸리지 않는 응답은
// 미분류로 남긴다 — 추측으로 채우지 않는다(REQ-WSUPGRADE-003).
export type ResponderClass =
  | 'ws WebSocketServer (경로 미스)'
  | 'Fastify 기본 404'
  | '맨 http.createServer'
  | '정적·Vite 계열 서버'
  | '미분류'

// 헤더 쌍에서 대소문자를 무시하고 값을 읽는다 — rawHeaders 의 대소문자는 서버마다 다르다.
export function headerOf(headers: { name: string; value: string }[], name: string): string | undefined {
  const key = name.toLowerCase()
  const pair = headers.find(h => h.name.toLowerCase() === key)
  return pair?.value
}

function jsonShapeOf(body: string): unknown {
  try { return JSON.parse(body) } catch { return undefined }
}

// ② 의 «모양» — Fastify 기본 404 본문 {message:…, error:'Not Found', statusCode:404}.
function isFastify404Shape(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false
  const o = parsed as Record<string, unknown>
  return typeof o.message === 'string' && o.error === 'Not Found' && o.statusCode === 404
}

// ③ 의 «프레임워크 표지» — 맨 http.createServer 의 기본 404 가 세팅하지 않는 헤더들.
// 실측(F2, probe-upgrade.log): 맨 서버의 404 는 Date·Connection·Keep-Alive 만 온다 —
// content-type 조차 없다. 표지가 하나라도 있으면 «맨» 이 아니다.
function hasFrameworkMarker(headers: { name: string; value: string }[]): boolean {
  const markers = ['content-type', 'server', 'x-powered-by', 'via']
  return markers.some(m => headerOf(headers, m) !== undefined)
}

// 지문표(spec.md §5.4) — 술어 ①→⑤ 순서로 걸어 첫 적중을 응답자 부류로 삼는다.
export function fingerprint(input: Pick<CaptureRecord, 'statusCode' | 'headers' | 'body'>): ResponderClass {
  const parsed = jsonShapeOf(input.body)
  // ① — F1 의 경로다. 관측된 실패는 404 이므로 이 부류는 대조군으로 표에 남는다.
  if (input.statusCode === 400 &&
      (headerOf(input.headers, 'sec-websocket-version') !== undefined || input.body.trim() === '')) {
    return 'ws WebSocketServer (경로 미스)'
  }
  // ② — 게이트웨이 없는 Fastify 앱이거나, 게이트웨이 있는 앱이 업그레이드를 라우터로 흘린 경우.
  // H-1·H-2·H-3 은 여기서 갈린다 — 2차 판정(secondVerdict)의 몫이다.
  if (input.statusCode === 404 && isFastify404Shape(parsed)) return 'Fastify 기본 404'
  // ③ — F2 탐침의 응답 모양(JSON 아님 + 표지 없음).
  if (input.statusCode === 404 && parsed === undefined && !hasFrameworkMarker(input.headers)) {
    return '맨 http.createServer'
  }
  // ④ — 스위트 밖 프로세스일 수 있다.
  if (input.statusCode === 404 && (headerOf(input.headers, 'content-type') ?? '').includes('text/html')) {
    return '정적·Vite 계열 서버'
  }
  // ⑤ — 어느 술어에도 걸리지 않음. 기록만 남기고 이름을 지어 주지 않는다.
  return '미분류'
}

// 2차 판정의 갈래 — 갈래 집합 {H-1, H-2, H-3} 을 좁히지 않는다(spec.md §4). 판정할 수 없는
// 자리는 전부 미분류로 남긴다 — 추측한 갈래를 내면 그것이 실패다(AC-004).
export type Branch = 'H-1' | 'H-2' | 'H-3' | '미분류'

// 2차 판정(spec.md §5.4 둘째 표) — 지문 ②(Fastify 기본 404)가 적중했을 때만 돈다. 판별의 축은
// 소켓 튜플이 아니라 «내 앱이 이 요청을 받았는가»이며, 그 물음은 귀속 적중으로만 답한다(§2 「귀속」).
// 표의 순서는 ㉮→㉮′→㉯→㉰→㉱ 이지만, ㉱(대조 불가)와 충돌은 갈래 자체를 세울 수 없는 자리라
// 앞에서 미분류로 가드한다 — 출력 집합은 표와 같다.
export function secondVerdict(record: CaptureRecord): Branch {
  if (fingerprint(record) !== 'Fastify 기본 404') return '미분류'   // 이 표는 지문 ② 에서만 돈다
  // ㉱ — 두 창의 로그가 없거나 localPort·경로를 읽지 못해 귀속 대조 자체가 불가능하다.
  if (record.localPort === null || record.clientPath === null) return '미분류'
  // 충돌 — 귀속은 성립하지 않은 것으로 다룬다(§2 「귀속」). 임시 포트 재사용이 삼중 대조를
  // 무너뜨린 자리를 근거로 계상하지 않는다.
  if (record.collision !== '없음') return '미분류'
  const onRequestHits = record.attributionHits.filter(h => h.window === 'onRequest').length
  const upgradeHits = record.attributionHits.filter(h => h.window === 'upgrade').length
  // ㉮ — 창2(onRequest) 귀속 적중 ≥ 1 만 자기 앱 «라우터»가 답했다(H-3)로 받는다.
  if (onRequestHits >= 1) return 'H-3'
  // ㉮′ — 창1 단독 적중은 자기모순 관측이다: 지문 ② 인데 창1 이 발화했다면 그 자리의 응답자는
  // ws 여야 했다(F1). 가장 그럴듯한 설명은 귀속 오사상 — 갈래를 고르지 않고 미분류로 남긴다.
  if (upgradeHits >= 1) return '미분류'
  // ㉯·㉰ — 적중 0 은 포획 시점의 포트 보유로만 갈린다.
  const possession = record.portPossession
  if (possession === null) return '미분류'   // 보유 상태조차 없으면 판정 불가 — 추측으로 채우지 않는다
  const addr = possession.address as { port?: number } | null
  const holding = possession.listening && addr !== null && addr.port === possession.ownPort
  return holding ? 'H-2' : 'H-1'   // ㉰ / ㉯
}

// 세 갈래 분류(spec.md §5.5) — 병렬 팔 실패 Mp, 직렬 팔 실패 Ms. 두 팔의 실패 수만으로 결정한다.
// (0,0) 은 미관측이며 PASS 로 사상하지 않는다(REQ-WSUPGRADE-008 — 침묵은 통과가 아니다).
// (0,≥1) 은 뒤집힘 — 예상 밖의 관측을 이름 없는 통에 접지 않는다.
export type ComparisonClass = '병렬에서만 실패' | '항상 실패' | '미관측' | '뒤집힘'

export function classifyComparison(mp: number, ms: number): ComparisonClass {
  if (mp >= 1 && ms === 0) return '병렬에서만 실패'
  if (mp >= 1 && ms >= 1) return '항상 실패'
  if (mp === 0 && ms === 0) return '미관측'
  return '뒤집힘'
}
