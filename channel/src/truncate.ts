// 잘림 원시함수와 상한 상수 — SPEC-BOTSTAB-001 M2 (plan.md §C 표시 설계 · §D 단위·절단 지점 · §F 상수 한 곳)
// 순수 함수와 상수만 둔다 — 프로세스 상태도 I/O 도 없다 (plan.md M2).
// 이 모듈은 채널 서버·index 에 배선되지 않는다 — 배선은 M3(알림 통로)·M4(이력 통로)의 몫이다.

// ── 상한 상수 (spec.md §7 OD-1~OD-5, 운영자 확정 2026-09-01) ────────────────────────────
// 상한 값은 이 한 곳에만 둔다 (§F). 테스트와 배선은 이 식별자를 읽지, 숫자를 복제하지 않는다.
// @MX:NOTE: [AUTO] OD-1~OD-5 상한 값은 산술과 판단으로 세운 값이며 측정 근거는 없다 — 근거와 변경 책임은 spec.md §7 이 진다
// @MX:SPEC: SPEC-BOTSTAB-001
export const MAX_BODY_BYTES = 4000 // OD-1 렌더 조각 상한 — 알림 본문 조각과 이력 원소 본문이 같은 값을 쓴다
export const MAX_ATTACHMENTS = 20 // OD-2 첨부 원소 상한 (개)
export const MAX_PATH_BYTES = 512 // OD-3 경로 상한
export const MAX_HISTORY_BYTES = 16000 // OD-4 이력 총 상한
export const MAX_NAME_BYTES = 256 // OD-5 작성자 이름 상한

// ── 시길과 잘림 표시 (plan.md §C-4) ──────────────────────────────────────────────────────
export const SIGIL_OPEN = '⟪' // U+27EA — 표시의 여는 글자이자 탈출 방아쇠
export const SIGIL_CLOSE = '⟫' // U+27EB — 표시의 닫는 글자이자 탈출 방아쇠
export const SIGIL_OPEN_ESCAPE = '&#x27EA;' // 사람 유래 조각의 ⟪ 이 변하는 엔티티
export const SIGIL_CLOSE_ESCAPE = '&#x27EB;' // 사람 유래 조각의 ⟫ 이 변하는 엔티티

// 표시 문언 ⟪잘림: N바이트 생략⟫ 의 고정 부분. 조립은 formatMarker 만이 한다.
export const TRUNC_MARKER_HEAD = `${SIGIL_OPEN}잘림: `
export const TRUNC_MARKER_TAIL = `바이트 생략${SIGIL_CLOSE}`

// 잘림 표시를 만든다. N 은 절단 시점에 실제로 잰 생략 바이트 수다 (§C-4).
export function formatMarker(omittedBytes: number): string {
  return `${TRUNC_MARKER_HEAD}${omittedBytes}${TRUNC_MARKER_TAIL}`
}

// 시길 탈출 (§C-4). 방아쇠는 시길 한 글자다 — 뒤따르는 낱말을 보지 않고, 그 밖의 문자는
// 한 글자도 건드리지 않는다. 이 탈출을 neutralizeEnvelope 안에 넣지 않는다 — 형제 SPEC 의
// REQ-CHANINJECT-002(«여는 꺾쇠 말고 어떤 문자도 바꾸지 않는다»)를 위반하기 때문이다.
export function escapeSigils(text: string): string {
  return text.replaceAll(SIGIL_OPEN, SIGIL_OPEN_ESCAPE).replaceAll(SIGIL_CLOSE, SIGIL_CLOSE_ESCAPE)
}

// @MX:ANCHOR: [AUTO] 절단 원시함수 — M3(알림)·M4(이력) 배선이 함께 부르는 공용 경계다
// @MX:REASON: «남은 본문 + 표시 ≤ 예산» 과 «코드포인트 경계 절단» 과 «날것 시길은 시스템이 붙인 것뿐» 의 세 계약이 이 한 곳에서만 지켜진다
// @MX:SPEC: SPEC-BOTSTAB-001
export function truncateToBudget(text: string, budgetBytes: number): string {
  // ① 시길 탈출이 절단보다 먼저다 — 사람 유래 조각의 날것 시길은 0 이 되어야 한다 (§C-4).
  const escaped = escapeSigils(text)
  const totalBytes = Buffer.byteLength(escaped, 'utf8')
  // ② 예산 이하는 자르지도 표시도 붙이지 않는다 — 경계는 «초과» 에서만 동작한다 (E-2).
  if (totalBytes <= budgetBytes) return escaped
  // ③ 표시 자리를 먼저 비켜 둔다. N 은 «실제로 잰 생략 바이트 수» 라 자르기 전에는 모르므로(§C-4),
  //    이 입력이 낼 수 있는 가장 긴 표시(생략 수 = 중화 뒤 전체 바이트 — 자릿수가 최대인 형태)를
  //    예약한다. 자릿수는 N 에 대해 단조이므로 실제 표시가 예약을 넘지 못하고, 그래서
  //    (남은 본문 + 실제 표시) ≤ 예산 이 항상 성립한다.
  const keptBudget = budgetBytes - Buffer.byteLength(formatMarker(totalBytes), 'utf8')
  // ④ 코드포인트 경계에서 자른다 — for...of 는 코드포인트 단위로 순회하므로 서로게이트 쌍도
  //    쪼개지지 않는다 (§D). String.length 로 재지 않는다 — UTF-16 코드 유닛 수는 바이트가 아니다.
  let kept = ''
  let keptBytes = 0
  for (const ch of escaped) {
    const b = Buffer.byteLength(ch, 'utf8')
    if (keptBytes + b > keptBudget) break
    kept += ch
    keptBytes += b
  }
  // 표시가 예산보다 길어 남는 자리가 음수가 되는 값은 설계 오류이고, 품질 게이트 INV-1·INV-3 이
  // 상수 수준에서 잡는다 (E-8) — 이 함수는 그 자리에서 예외를 던지지 않는다.
  const omitted = totalBytes - keptBytes
  return kept + formatMarker(omitted)
}

// ── 파생 ㉡ 정규식 (plan.md M2 [HARD]) ──────────────────────────────────────────────────
// 상수 이름 가문의 접두를 한 곳에 선언하고 ㉡ 적중 정규식을 그 접두에서 파생시킨다 —
// 이 정규식 문자열을 코드의 두 곳에 적지 않는 것이 이 의무의 본문이다.
// 소비자: AC-BOTSTAB-013 ㉡ 의 테스트 (plan.md M4a) — 이 export 를 import 해 형제 블록의
// 소스 텍스트에 상수 식별자 적중을 판정한다.
// «맞았다는 것을 재는 자리» 는 channel/test/truncate.test.ts 의 결합 기준이 진다.
const NAME_FAMILY_MAX = 'MAX_'
const NAME_FAMILY_TRUNC = 'TRUNC_'
const NAME_FAMILY_SIGIL = 'SIGIL'
export const SIBLING_SWEEP_ASSERT_REGEX = new RegExp(
  [
    `\\b${NAME_FAMILY_MAX}[A-Z0-9_]+`,
    `\\b${NAME_FAMILY_TRUNC}[A-Z0-9_]+`,
    `\\b${NAME_FAMILY_SIGIL}[A-Z0-9_]*`,
  ].join('|'),
)
