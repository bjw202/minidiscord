// SPEC-LIVEENV-001 — 증거 추출기의 인프로세스 회귀 (AC-LIVEENV-010 · AC-LIVEENV-011 · AC-LIVEENV-012)
//
// [HARD] 셸 확인만으로는 이 기준이 서지 않는다. 추출기 본문을 통째로 지워도 「파일이 있다」는
// 셸 검사는 이전 실행의 산출로 초록일 수 있다. 이 파일이 그 구멍을 막는다 —
// 여기서 재는 것은 산출 파일의 존재가 아니라 추출기 «함수» 의 거동이다.
//
// 이 스위트는 대응 관계만 세운다. 도달성(그 경로가 실제로 밟히는가)은 표면마다 따로 재며,
// 대화 기록 표면의 도달성은 실 세션 한 번이 단독으로 진다(AC-LIVEENV-010 의 표면별 도달성 표).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildA01,
  buildHumanItems,
  buildManifest,
  countFetchHistory,
  extractReplyMarker,
  findMarkerInDb,
  manifestNamesMatch,
  maskTokens,
  parseTranscript,
  type DbMessage,
} from './live-extract-lib.js'

const FIX = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/live-extract')
const MARKER = 'Qz7m4Kd2'

const positive = () => parseTranscript(readFileSync(path.join(FIX, 'positive.jsonl'), 'utf8'))
const negative = () => parseTranscript(readFileSync(path.join(FIX, 'negative.jsonl'), 'utf8'))

const dbRow: DbMessage = {
  id: 7, room_id: 1, author_type: 'bot',
  body: `확인했습니다 ${MARKER}`, created_at: '2026-09-06T00:00:03Z',
}

describe('대화 기록 파서 — 값은 호출 인자에서만 읽는다', () => {
  it('reply 호출 인자에 실린 표지를 집는다', () => {
    expect(extractReplyMarker(positive())).toBe(MARKER)
  })

  // [HARD] 음성 fixture 짝 — 같은 값이 tool_result 와 알림에 심겨 있다.
  // 들어온 것을 만든 것으로 읽으면 이 단언이 빨개진다.
  it('같은 값이 tool_result·알림에만 있으면 읽지 않는다', () => {
    // 원문에는 분명히 있다 — 파서가 결과·알림 본문을 아예 담지 않는 것이 옳은 거동이므로,
    // 「있다」는 확인은 파싱 결과가 아니라 파일 원문에 대고 한다.
    const raw = readFileSync(path.join(FIX, 'negative.jsonl'), 'utf8')
    expect(raw).toContain(MARKER)
    expect(extractReplyMarker(negative())).toBeNull()   // 그러나 호출 인자에는 없다
  })

  it('채널 도구 왕복 짝을 센다 — 승인 전에는 0이다', () => {
    expect(positive().channelRoundTrips).toBe(2)
    expect(negative().channelRoundTrips).toBe(1)
  })

  it('이력 회수 호출 수를 센다', () => {
    expect(countFetchHistory(positive())).toBe(1)
  })

  it('세션 표지가 단일 값이다', () => {
    expect(positive().sessionIds).toHaveLength(1)
    expect(positive().cwds).toHaveLength(1)
  })
})

describe('A01 ㉣ — 두 값과 그 일치 여부', () => {
  it('두 면이 모두 서면 agree=yes 이고 machine 판정이 붙는다', () => {
    const { item, body } = buildA01({
      transcript: positive(), messages: [dbRow], rooms: null, processes: null,
    })
    expect(body).toContain(`reply_arg=${MARKER}`)
    expect(body).toContain(`db_row=${MARKER}`)
    expect(body).toContain('agree=yes')
    expect(item.status).toBe('ok')
    expect(item.judge).toBe('machine')
  })

  // [HARD] 한쪽이 없으면 machine 판정을 붙이지 않는다 — 형제 기준을 만족시키지 못하는
  // 증거에 기계 판정이 달리는 것이 1회차 감사가 잡은 결함이다.
  it('DB 면이 비면 UNMEASURED 이고 verdict 열쇠가 없다', () => {
    const { item } = buildA01({ transcript: positive(), messages: [], rooms: null, processes: null })
    expect(item.status).toBe('UNMEASURED')
    expect(item).not.toHaveProperty('verdict')
  })

  it('대화 기록 면이 비면 UNMEASURED 다', () => {
    const { item } = buildA01({ transcript: negative(), messages: [dbRow], rooms: null, processes: null })
    expect(item.status).toBe('UNMEASURED')
  })

  it('DB 판독기가 같은 표지를 찾는다', () => {
    expect(findMarkerInDb([dbRow], MARKER)?.id).toBe(7)
    expect(findMarkerInDb([dbRow], 'ZZZZZZZZ')).toBeNull()
  })
})

describe('manifest — 기계 판정과 사람 판정을 가른다', () => {
  const seven = () => [
    buildA01({ transcript: positive(), messages: [dbRow], rooms: null, processes: null }).item,
    { name: 'A08', judge: 'machine' as const, status: 'ok' as const, files: [] },
    { name: 'A09', judge: 'machine' as const, status: 'ok' as const, files: [] },
    { name: 'A11', judge: 'machine' as const, status: 'ok' as const, files: [] },
    { name: 'A12', judge: 'machine' as const, status: 'ok' as const, files: [] },
    ...buildHumanItems(false),
  ]

  it('항 이름 집합이 정확히 그 일곱이다', () => {
    expect(manifestNamesMatch(buildManifest(seven()))).toBe(true)
  })

  it('여덟째 항이 들어오면 빨개진다', () => {
    const items = [...seven(), { name: 'A02', judge: 'machine' as const, status: 'ok' as const, files: [] }]
    expect(manifestNamesMatch(buildManifest(items))).toBe(false)
  })

  it('한 항이 빠지면 빨개진다', () => {
    expect(manifestNamesMatch(buildManifest(seven().slice(1)))).toBe(false)
  })

  // [HARD] 변이 ⑥ 이 겨누는 단언 — A03 에 verdict 를 넣으면 여기가 빨개져야 한다.
  it('A03·A10 은 judge=human 이고 판정 필드가 아예 없다', () => {
    for (const item of buildHumanItems(false)) {
      expect(item.judge).toBe('human')
      expect(item).not.toHaveProperty('verdict')
    }
    for (const item of buildHumanItems(true)) {
      expect(item).not.toHaveProperty('verdict')
    }
  })

  it('Playwright 부재 항의 상태는 UNMEASURED 다', () => {
    expect(buildHumanItems(false).every(i => i.status === 'UNMEASURED')).toBe(true)
  })
})

describe('토큰 마스킹 — 산출물 어디에도 전문이 없다', () => {
  it('64자 hex 를 앞 8글자만 남긴다', () => {
    const token = 'a'.repeat(64)
    const out = maskTokens(`export MINIDISCORD_TOKEN=${token}`)
    expect(out).not.toContain(token)
    expect(out).toContain('aaaaaaaa')
  })
})
