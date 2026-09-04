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
