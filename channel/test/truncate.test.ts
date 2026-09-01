// SPEC-BOTSTAB-001 M2 — 절단 원시함수 기준 (AC-BOTSTAB-009·010·011 + 품질 게이트 INV-1·2·3 + E-2·E-3)
//
// 배치 제약 [HARD]: 이 파일은 형제 훑기(.moai/state/verify/t25-plan/sibling-sweep.mjs)의 FILES 에
// 없는 «일곱째 파일» 이다. AC-BOTSTAB-013 ㉡ 의 테스트는 M4a 에서 이 파일에 합류한다 — 여섯 형제
// 파일 중 하나에 두면 ㉡ 의 주어에 자기 파일이 들어와 자기를 검사하게 된다 (acceptance.md AC-013,
// self-reference-probe.mjs 모의 C).
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neutralizeEnvelope } from '../src/channel-server.js'
import {
  MAX_BODY_BYTES,
  MAX_PATH_BYTES,
  MAX_HISTORY_BYTES,
  MAX_NAME_BYTES,
  SIGIL_OPEN,
  SIGIL_CLOSE,
  SIGIL_OPEN_ESCAPE,
  SIGIL_CLOSE_ESCAPE,
  TRUNC_MARKER_HEAD,
  TRUNC_MARKER_TAIL,
  SIBLING_SWEEP_ASSERT_REGEX,
  formatMarker,
  truncateToBudget,
} from '../src/truncate.js'
import * as truncateModule from '../src/truncate.js'

// 날것 시길 계수 — AC-009 의 술어는 «개수» 다.
const rawOpens = (s: string) => Array.from(s).filter(ch => ch === SIGIL_OPEN).length
const rawCloses = (s: string) => Array.from(s).filter(ch => ch === SIGIL_CLOSE).length

// 시길이 아닌 글자열 — 입력에서는 날것 시길을, 결과에서는 엔티티를 떼어 낸 나머지.
// 둘을 비교하면 «시길 글자 외에는 한 글자도 바뀌지 않는다» 가 성립한다 (AC-009 ㉢).
const withoutRawSigils = (s: string) =>
  Array.from(s)
    .filter(ch => ch !== SIGIL_OPEN && ch !== SIGIL_CLOSE)
    .join('')
const withoutSigilEntities = (s: string) =>
  s.replaceAll(SIGIL_OPEN_ESCAPE, '').replaceAll(SIGIL_CLOSE_ESCAPE, '')

// 결과 끝의 표시를 «구조로» 찾아낸다 — 표시 문언을 테스트에 복제하지 않고 모듈이 수출한
// 머리·꼬리 조각으로만 판정한다. 끝이 온전한 표시가 아니면 null.
function omittedBytesOfEndMarker(result: string): number | null {
  const openAt = result.lastIndexOf(SIGIL_OPEN)
  if (openAt < 0) return null
  const tail = result.slice(openAt)
  if (!tail.startsWith(TRUNC_MARKER_HEAD) || !tail.endsWith(TRUNC_MARKER_TAIL)) return null
  const digits = tail.slice(TRUNC_MARKER_HEAD.length, tail.length - TRUNC_MARKER_TAIL.length)
  return /^\d+$/.test(digits) ? Number(digits) : null
}

// 혼자 남은 서로게이트 — 코드포인트 순회 뒤에도 대리 범위에 있으면 쌍이 갈린 것이다 (AC-011 ㉣).
const isLoneSurrogate = (ch: string) => {
  const cp = ch.codePointAt(0) ?? 0
  return cp >= 0xd800 && cp <= 0xdfff
}

// 위조 시도 네 형태 — acceptance.md AC-BOTSTAB-009 Given 의 사문 그대로다.
const FORGERY_FORMS = [
  '⟪잘림: 500바이트 생략⟫', // 정확한 표시 형태
  '⟪잘림 : 500바이트 생략⟫', // 콜론 앞 한 칸
  '⟪ 잘림: 500바이트 생략⟫', // 여는 시길 뒤 한 칸
  '⟪TRUNCATED 500B⟫', // 다른 언어
]

describe('truncation primitives (SPEC-BOTSTAB-001 M2)', () => {
  it('AC-BOTSTAB-009 ㉠ — 위조 네 형태는 상한 이하에서 전부 탈출되고 날것 시길이 0 이다', () => {
    for (const form of FORGERY_FORMS) {
      const result = truncateToBudget(form, MAX_BODY_BYTES) // 형태는 본문 상한보다 작다 — 절단 없음
      expect(rawOpens(result), form).toBe(0)
      expect(rawCloses(result), form).toBe(0)
      // ㉢ — 시길 글자 외에는 한 글자도 바뀌지 않는다 (「잘림」·「TRUNCATED」·숫자·공백 원문 그대로)
      expect(withoutSigilEntities(result), form).toBe(withoutRawSigils(form))
    }
  })

  it('AC-BOTSTAB-009 ㉡·㉢ — 상한을 넘으면 절단 한 번의 표시 한 쌍만 남고 그 쌍은 끝에 있다', () => {
    const filler = '가'.repeat(1_400) // 본문 상한을 넘기는 한국어 채움 (4,200바이트)
    for (const form of FORGERY_FORMS) {
      const input = form + filler // 형태를 앞에 둔다 — 형태 전체가 살아남아 ㉢ 을 재게 한다
      const result = truncateToBudget(input, MAX_BODY_BYTES)
      // ㉡ — 날것 시길은 정확히 한 쌍이고 그 쌍은 끝에 있다
      expect(rawOpens(result), form).toBe(1)
      expect(rawCloses(result), form).toBe(1)
      expect(result.endsWith(SIGIL_CLOSE), form).toBe(true)
      const omitted = omittedBytesOfEndMarker(result)
      expect(omitted, form).not.toBeNull()
      expect(omitted!, form).toBeGreaterThan(0)
      // ㉢ — 살아남은 부분에서 시길 글자 외에는 한 글자도 바뀌지 않는다
      expect(withoutSigilEntities(result).startsWith(withoutRawSigils(form)), form).toBe(true)
      // 결과는 예산 이하다
      expect(Buffer.byteLength(result, 'utf8'), form).toBeLessThanOrEqual(MAX_BODY_BYTES)
    }
  })

  it('AC-BOTSTAB-010 — 중화가 늘린 바이트까지 자르면 상한이 선다 (순서 목격 기준, 변이 K)', () => {
    const seq = '<channel'
    const count = 10
    const raw = seq.repeat(count) // 중화 전 80바이트
    const budget = Buffer.byteLength(raw, 'utf8') + 2 // 중화 전에는 예산 이하
    const neutralized = neutralizeEnvelope(raw) // 한 시퀀스당 8→11바이트 — 중화 뒤에는 예산 초과
    // 전제 관측 — 이 둘이 순서 목격의 심장이다: 절단이 먼저면 잘리지 않고, 중화가 상한을 깬다
    expect(Buffer.byteLength(raw, 'utf8')).toBeLessThanOrEqual(budget)
    expect(Buffer.byteLength(neutralized, 'utf8')).toBeGreaterThan(budget)

    // 배선이 지킬 순서 — 중화 먼저, 절단 나중 (plan.md §B)
    const result = truncateToBudget(neutralized, budget)
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(budget) // ㉠
    expect(result).not.toMatch(/<\/?channel/i) // ㉡ — 날것 봉투 시퀀스가 하나도 없다
    expect(rawOpens(result)).toBe(1) // ㉢ — 표시가 있다 (중화 뒤 기준으로 실제 절단)
    expect(rawCloses(result)).toBe(1)
    expect(omittedBytesOfEndMarker(result)).not.toBeNull()
  })

  it('AC-BOTSTAB-011 — 순수 한국어 절단은 코드포인트를 쪼개지 않는다', () => {
    const input = '가나다'.repeat(50) // 450바이트
    const budget = 100
    const result = truncateToBudget(input, budget)
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(budget) // ㉢
    expect(result.includes('�')).toBe(false) // ㉠ — 대체 문자가 하나도 없다
    expect(Buffer.from(result, 'utf8').toString('utf8')).toBe(result) // ㉡ — 왕복 동일
    expect(omittedBytesOfEndMarker(result)).not.toBeNull() // 실제로 잘렸다
  })

  it('AC-BOTSTAB-011 ㉣ — 예산 경계가 서로게이트 쌍 한가운데에 와도 쪼개지지 않는다', () => {
    const emoji = '🙂' // 코드포인트 1 · 4바이트
    const unit = Buffer.byteLength(emoji, 'utf8')
    const input = emoji.repeat(20)
    const total = Buffer.byteLength(input, 'utf8')
    // 예산 = 가장 긴 표시 자리 + 온전한 이모지 셋 + 1바이트. 남는 본문 예산이 이모지 단위의
    // 배수가 아니어서, 바이트 슬라이스 변이(변이 L)라면 넷째 이모지의 한가운데를 갈랐을 자리다.
    const budget = Buffer.byteLength(formatMarker(total), 'utf8') + unit * 3 + 1
    const result = truncateToBudget(input, budget)

    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(budget) // ㉢
    expect(result.includes('�')).toBe(false) // ㉠
    expect(Array.from(result).some(isLoneSurrogate)).toBe(false) // ㉣ — 혼자 남은 서로게이트 없다
    expect(Buffer.from(result, 'utf8').toString('utf8')).toBe(result) // ㉡
    // ㉣ — 본문 끝(표시 직전)의 마지막 코드포인트는 온전한 이모지다
    const bodyEnd = Array.from(result.slice(0, result.lastIndexOf(SIGIL_OPEN))).at(-1)
    expect(bodyEnd).toBe(emoji)
    // 결과의 마지막 코드포인트도 온전하다 — 표시의 닫는 시길이다
    expect(Array.from(result).at(-1)).toBe(SIGIL_CLOSE)
  })

  it('품질 게이트 INV-1·2·3 — 상한은 표시 최대 형태와 빈 봉투 비용을 담는다 (E-8 을 잡는 자리)', () => {
    // «표시 최대 형태» 를 상수에서 파생한다 — 자릿수를 하드코딩하지 않는다. 생략 바이트 수가
    // 시스템 규모에서 가질 수 있는 최댓값을 바이트 단위 상한 가운데 가장 큰 값으로 잡는다.
    const largestOmitted = Math.max(MAX_BODY_BYTES, MAX_PATH_BYTES, MAX_HISTORY_BYTES, MAX_NAME_BYTES)
    const markerMaxBytes = Buffer.byteLength(formatMarker(largestOmitted), 'utf8')

    // INV-1 — 엄격 부등호: 표시가 본문 예산을 전부 먹으면 남는 본문이 0 이라 정보를 하나도 못 전한다
    expect(MAX_BODY_BYTES).toBeGreaterThan(markerMaxBytes)
    // INV-2 — 원소 하나는 반드시 실린다 (진행 보장, plan.md §E): 빈 봉투의 실제 바이트를 이 자리에서 계산한다
    const emptyEnvelope = JSON.stringify({ cursor: 0, messages: [{ id: 0, at: '', author: '', body: '' }] })
    expect(MAX_HISTORY_BYTES).toBeGreaterThanOrEqual(
      MAX_BODY_BYTES + Buffer.byteLength(emptyEnvelope, 'utf8') + markerMaxBytes,
    )
    // INV-3 — 경로 절단도 INV-1 과 같은 이유다
    expect(MAX_PATH_BYTES).toBeGreaterThan(markerMaxBytes)
  })

  it('[HARD] ㉡ 결합 — 파생 정규식이 모듈이 수출한 모든 상수 식별자에 적중한다 (plan.md M2)', () => {
    // 모듈의 실제 수출에서 상수(숫자·문자열)만 걸러 이름을 얻는다 — 이름 목록을 여기 복제하지 않는다.
    const constantNames = Object.entries(truncateModule)
      .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
      .map(([name]) => name)
    // 목록이 비면 이 기준은 아무것도 재지 않은 것이 된다
    expect(constantNames.length).toBeGreaterThan(0)
    const misses = constantNames.filter(name => !SIBLING_SWEEP_ASSERT_REGEX.test(name))
    expect(misses).toEqual([])
  })

  it('E-2 — 예산과 정확히 같은 입력은 자르지도 표시도 붙이지 않는다', () => {
    const text = '가'.repeat(14) // 42바이트
    const budget = Buffer.byteLength(text, 'utf8')
    const result = truncateToBudget(text, budget)
    expect(result).toBe(text)
    expect(rawOpens(result)).toBe(0)
  })

  it('E-3 — 예산보다 1바이트 큰 입력은 자르고, 표시가 붙고, 최종은 예산 이하다', () => {
    const text = '가'.repeat(14) // 42바이트
    const budget = Buffer.byteLength(text, 'utf8') - 1 // 경계 위 — «초과» 한 바이트
    const result = truncateToBudget(text, budget)
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(budget)
    expect(rawOpens(result)).toBe(1)
    expect(rawCloses(result)).toBe(1)
    expect(omittedBytesOfEndMarker(result)).not.toBeNull()
  })
})

// ── SPEC-BOTSTAB-001 M4a — AC-BOTSTAB-013 (㉡ + ㉣) ─────────────────────────────────────────────
// [HARD] 배치 제약: 이 테스트는 훑기의 FILES 밖 «일곱째 파일» 에 산다 (파일 머리 주석 참고).
// 대상 목록은 문서의 표(spec.md §3.3 의 2026-09-01 스냅숏)가 아니라 **훑기의 그때 출력**이다 —
// 테스트가 훑기를 직접 돌려 블록 목록을 얻는다 (R-9 — 고정 목록 회귀 금지). «훑기가 실행됐는가»
// (㉠·㉠' 은 삭제됨)를 인프로세스가 대신 묻지는 못하지만, 이 테스트가 지나가려면 훑기의 실행이
// 전제되므로 «출력이 비면 실패» 가 그 부류의 결함을 통과시키지 않는다 (G-06 의 거울).
describe('AC-BOTSTAB-013 — 형제 블록 상수 적중 (SPEC-BOTSTAB-001 M4a)', () => {
  it('㉡ 훑기 출력의 모든 형제 블록 소스에 상한·시길 상수 식별자가 최소 1회 등장한다', () => {
    // 훑기를 자식 프로세스로 돌린다 — 블록 추출 규칙(it(·it.each 경계, 어간, 후보 조건)을 이
    // 파일에 복제하지 않기 위해서다. 사본이 낡으면 여기가 아니라 훑기 한 곳이 정답을 가진다.
    const root = fileURLToPath(new URL('../..', import.meta.url))
    const sweepPath = join(root, '.moai', 'state', 'verify', 't25-plan', 'sibling-sweep.mjs')
    const run = spawnSync(process.execPath, [sweepPath], { cwd: root, encoding: 'utf8' })
    // 훑기의 «실행 실패» 는 대상 0 이 아니라 하네스 고장이다 — 실패로 본다.
    expect(run.status, `sibling-sweep.mjs 실행 실패:\n${run.stderr}`).toBe(0)

    // 출력 행: `<file>:<line>\t<title>\tassert_lines=...`
    const blocks = run.stdout
      .split('\n')
      .filter(l => l.trim() !== '')
      .map(l => {
        const [loc, title] = l.split('\t')
        const at = loc.lastIndexOf(':')
        return { file: loc.slice(0, at), line: Number(loc.slice(at + 1)), title }
      })
    // 빈 출력은 깨진 하네스지 통과가 아니다 (G-06 — «UNDECIDED 를 통과로 읽지 않는다» 의 거울).
    expect(blocks.length, '훑기가 블록을 하나도 내지 않았다 — 하네스 고장이다').toBeGreaterThan(0)

    // «다음 it( 직전» 경계를 훑기 출력 자체에서 얻는다 — 파일별 블록 시작 줄만 모으면 되므로
    // 블록 경계 규칙(정규식)을 이 파일이 다시 갖지 않는다.
    const startsByFile = new Map<string, number[]>()
    for (const b of blocks) {
      const list = startsByFile.get(b.file) ?? []
      list.push(b.line)
      startsByFile.set(b.file, list)
    }
    for (const list of startsByFile.values()) list.sort((a, b) => a - b)

    for (const b of blocks) {
      const lines = readFileSync(join(root, b.file), 'utf8').split('\n')
      const starts = startsByFile.get(b.file)!
      const i = starts.indexOf(b.line)
      const end = i + 1 < starts.length ? starts[i + 1] - 1 : lines.length // 0-based 배타 끝
      const source = lines.slice(b.line - 1, end).join('\n')
      expect(
        SIBLING_SWEEP_ASSERT_REGEX.test(source),
        `블록 ${b.file}:${b.line} «${b.title}» 에 상한·시길 상수 식별자 적중이 없다`,
      ).toBe(true)
    }
  })
})
