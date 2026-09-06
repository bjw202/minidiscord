// SPEC-LIVEENV-001 — 증거 추출기의 인프로세스 회귀 (AC-LIVEENV-010 · AC-LIVEENV-011 · AC-LIVEENV-012)
//
// [HARD] 셸 확인만으로는 이 기준이 서지 않는다. 추출기 본문을 통째로 지워도 「파일이 있다」는
// 셸 검사는 이전 실행의 산출로 초록일 수 있다. 이 파일이 그 구멍을 막는다 —
// 여기서 재는 것은 산출 파일의 존재가 아니라 추출기 «함수» 의 거동이다.
//
// 이 스위트는 대응 관계만 세운다. 도달성(그 경로가 실제로 밟히는가)은 표면마다 따로 재며,
// 대화 기록 표면의 도달성은 실 세션 한 번이 단독으로 진다(AC-LIVEENV-010 의 표면별 도달성 표).
import { afterAll, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EXIT_OK,
  EXIT_UNMEASURED,
  buildA01,
  buildA08,
  buildA09,
  buildA11,
  buildA12,
  buildHumanItems,
  buildManifest,
  channelToolUses,
  countFetchHistory,
  dbMessages,
  dbRooms,
  extractReplyMarker,
  findMarkerInDb,
  manifestNamesMatch,
  maskTokens,
  parseTranscript,
  playwrightCandidates,
  readDb,
  readGlobalEntry,
  runCapture,
  runExtract,
  transcriptCandidates,
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

  // [4회차 sync 감사 B1 부수] 위 시험만으로는 «앞 8글자» 의 8 이 지켜지는지 서지 않는다.
  // fixture 가 'a' 64개라 toContain('aaaaaaaa') 는 남는 길이가 8이든 16이든 늘 참이다
  // — 감사가 slice(0,8) → slice(0,16) 변이를 넣었을 때 54건이 전부 초록으로 살아남았다.
  // 폭을 실제로 못박으려면 «자리마다 다른» 토큰이어야 한다.
  it('남기는 길이가 정확히 8 이다 — 아홉째 글자부터는 지워진다', () => {
    // 0123456789abcdef 를 네 번 이어 64자를 만든다. 각 자리가 서로 다르므로 폭이 드러난다.
    const token = '0123456789abcdef'.repeat(4)
    const out = maskTokens(`token=${token}`)
    expect(out).not.toContain(token)
    expect(out).toContain('01234567…(가림)')   // 앞 8글자 + 표지
    expect(out).not.toContain('012345678')      // 아홉째 글자가 남으면 빨개진다
  })

  it('한 줄에 토큰이 둘이면 둘 다 가린다', () => {
    const a = '0123456789abcdef'.repeat(4)
    const b = 'fedcba9876543210'.repeat(4)
    const out = maskTokens(`before=${a} after=${b}`)
    expect(out).not.toContain(a)
    expect(out).not.toContain(b)
    expect(out).toContain('01234567…(가림)')
    expect(out).toContain('fedcba98…(가림)')
  })

  // [4회차 sync 감사 B3 수리를 재는 시험]
  //
  // 수리 전에는 runExtract 의 e5 갈래(전역 항목이 실행 중에 바뀐 경우)가 쓰는
  // extract-notes.txt 가 maskTokens 를 지나지 않았고, 그 갈래는 전역 MCP 항목의
  // «내용» 을 그대로 싣는다(spec.md §7 토큰 소재 1번). manifest.json 도 같았다.
  //
  // [HARD · 이 시험의 한계를 먼저 적는다] e5 갈래 «자체» 는 단위 시험으로 밟을 수 없다.
  //   그 갈래는 entryBefore(실행 시작)와 entryAfter(실행 끝)가 달라야 들어가는데,
  //   runExtract 는 그 사이에 시험이 끼어들 이음매를 주지 않는다. 이음매를 만들려면
  //   구현에 인자를 더해야 하고, 그것은 리드 처분 47 이 허용한 「두 줄」 밖이다.
  //   그래서 아래는 «그 갈래가 쓰는 문자열이 가림을 지나는가» 를 잰다 — 갈래의 도달성이
  //   아니라 가림의 적용 범위다. 도달성은 미검증으로 남긴다(예행/실 세션의 몫).
  //   하네스를 채우는 대신 못 재는 것을 못 잰다고 적는다.
  //
  // [HARD · 이 시험은 수리 자체를 «잡지 못한다» — 실행으로 확인했다]
  //   B3 수리(manifest.json 과 e5 note 를 maskTokens 로 감싼 두 줄)를 «되돌리는» 변이를
  //   넣고 돌렸더니 58건이 전부 초록이었다. 즉 아래 시험은 maskTokens 라는 «함수» 를 재지,
  //   그 함수가 그 두 자리에서 «불리는지» 를 재지 않는다. 잡으려면 64자 hex 가 실제로
  //   그 두 산출에 도달해야 하는데 — manifest 는 항 이름·상태·파일명만 담아 단위 시험이
  //   토큰을 밀어 넣을 입력 경로가 없고, e5 는 위에 적은 대로 갈래 자체가 도달 불가다.
  //   **그러므로 이 수리는 「옳지만 시험이 붙들지 못하는」 상태다.** 그 사실을 여기 적는다 —
  //   초록을 보고 「수리가 검증됐다」고 읽으면 그것이 이 카드가 겨눈 조용한 초록이다.
  it('e5 갈래가 싣는 문자열 모양이 가림을 지나면 토큰이 남지 않는다', () => {
    const token = '0123456789abcdef'.repeat(4)
    // 구현이 그 갈래에서 만드는 것과 같은 모양 — entry_before / entry_after 두 줄.
    const body = `unmeasured_path=e5_global_entry_changed\n`
      + `entry_before={"env": {"X": "before"}}\n`
      + `entry_after={"env": {"MINIDISCORD_TOKEN": "${token}"}}\n`
    const out = maskTokens(body)
    expect(out).not.toContain(token)            // 전문이 남으면 빨개진다
    expect(out).toContain('01234567…(가림)')     // 가려진 형태로는 남는다
    expect(out).toContain('e5_global_entry_changed')  // 진단 정보는 살아남는다
  })

  it('63자·65자 hex 는 토큰이 아니므로 건드리지 않는다 — 경계가 64 에 걸려 있다', () => {
    const short = '0123456789abcdef'.repeat(3) + '012345678901111'  // 63자
    const long = '0123456789abcdef'.repeat(4) + '0'                 // 65자
    expect(short).toHaveLength(63)
    expect(long).toHaveLength(65)
    expect(maskTokens(`x=${short}`)).toContain(short)
    // 65자는 \b 경계 때문에 통째로는 안 잡힌다 — 원문이 그대로 남는지로 확인한다
    expect(maskTokens(`y=${long}`)).toContain(long)
  })
})

// ────────────────────────────────────────────────────────────────────────
// 아래는 같은 축의 확장이다 — 추출기 함수가 «재지 못함» 과 «재서 이렇다» 를 어떻게
// 가르는지, 그리고 표면이 빠졌을 때 무엇을 «만들지 않는지» 를 건다.
// ────────────────────────────────────────────────────────────────────────

const tmpDirs: string[] = []
function tmpDir(): string {
  const d = mkdtempSync(path.join(tmpdir(), 'live-extract-'))
  tmpDirs.push(d)
  return d
}
afterAll(() => { for (const d of tmpDirs) rmSync(d, { recursive: true, force: true }) })

const jsonl = (...recs: unknown[]) => recs.map(r => JSON.stringify(r)).join('\n') + '\n'
const toolUse = (id: string, name: string, input: unknown) => ({
  type: 'assistant', sessionId: 'S1', cwd: '/tmp/bot-01',
  message: { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
})
const toolResult = (id: string) => ({
  type: 'user', sessionId: 'S1', cwd: '/tmp/bot-01',
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: [{ type: 'text', text: 'ok' }] }] },
})
const CH = 'mcp__minidiscord-channel__'

const msg = (id: number, author_type: string, body: string): DbMessage =>
  ({ id, room_id: 1, author_type, body, created_at: '2026-09-06T00:00:00Z' })

describe('대화 기록 파서 — 못 읽는 줄과 통로 밖 도구', () => {
  it('깨진 줄은 건너뛰고 성한 줄의 호출만 남긴다', () => {
    const t = parseTranscript(
      '{이건 JSON 이 아니다\n'
      + '\n'
      + jsonl(toolUse('u1', `${CH}reply`, { text: '확인했습니다 Qz7m4Kd2' })),
    )
    expect(t.toolUses.map(u => u.name)).toEqual([`${CH}reply`])
    expect(extractReplyMarker(t)).toBe(MARKER)
  })

  it('content 가 배열이 아닌 기록은 도구 호출을 하나도 내놓지 않는다', () => {
    const t = parseTranscript(jsonl({
      type: 'assistant', sessionId: 'S1',
      message: { role: 'assistant', content: `${CH}reply 를 불렀다고 적힌 산문` },
    }))
    expect(t.toolUses).toHaveLength(0)
    expect(t.sessionIds).toEqual(['S1'])
  })

  it('채널 도구만 골라내고 다른 도구는 남기지 않는다', () => {
    const t = parseTranscript(jsonl(
      toolUse('u1', 'Read', { file_path: '/tmp/a' }),
      toolUse('u2', `${CH}reply`, { text: '확인했습니다 Qz7m4Kd2' }),
      toolUse('u3', `${CH}fetch_history`, { limit: 20 }),
    ))
    expect(t.toolUses).toHaveLength(3)
    expect(channelToolUses(t).map(u => u.name)).toEqual([`${CH}reply`, `${CH}fetch_history`])
  })

  it('왕복 짝은 채널 도구에만 센다 — 다른 도구의 결과는 세지 않는다', () => {
    const t = parseTranscript(jsonl(
      toolUse('u1', 'Read', { file_path: '/tmp/a' }), toolResult('u1'),
      toolUse('u2', `${CH}reply`, { text: '확인했습니다 Qz7m4Kd2' }), toolResult('u2'),
      toolUse('u3', `${CH}fetch_history`, { limit: 20 }),
    ))
    expect(t.channelRoundTrips).toBe(1)
  })

  it('reply 의 text 가 문자열이 아니면 그 호출을 건너뛰고 다음 reply 를 본다', () => {
    const t = parseTranscript(jsonl(
      toolUse('u1', `${CH}reply`, { text: { 잘못된: '모양' } }),
      toolUse('u2', `${CH}reply`, { text: '확인했습니다 Qz7m4Kd2' }),
    ))
    expect(extractReplyMarker(t)).toBe(MARKER)
  })

  it('표지 규칙을 바꾸면 같은 기록에서 다른 값이 잡힌다', () => {
    const t = parseTranscript(jsonl(toolUse('u1', `${CH}reply`, { text: '코드 ZZ-99 와 표지 Qz7m4Kd2' })))
    expect(extractReplyMarker(t, /\bZZ-\d{2}\b/)).toBe('ZZ-99')
  })
})

describe('A08 — 「0건」과 「표면이 없다」는 다른 값이다', () => {
  const withFetch = (n: number) => parseTranscript(
    jsonl(...Array.from({ length: n }, (_, i) => toolUse(`f${i}`, `${CH}fetch_history`, { limit: 20 }))),
  )

  it('이력 회수 호출이 있으면 그 수를 적고 machine 판정을 붙인다', () => {
    const { item, body } = buildA08({ transcript: withFetch(2), messages: null, rooms: null, processes: null })
    expect(body).toContain('fetch_history_calls=2')
    expect(item.status).toBe('ok')
    expect(item.verdict).toBe('fetch_history 호출 관측')
  })

  it('호출이 0건이면 0 이라 적되 판정은 붙이지 않는다', () => {
    const { item, body } = buildA08({ transcript: withFetch(0), messages: null, rooms: null, processes: null })
    expect(body).toContain('fetch_history_calls=0')
    expect(item.status).toBe('UNMEASURED')
    expect(item).not.toHaveProperty('verdict')
  })

  it('대화 기록 표면 자체가 없으면 0 이 아니라 «-» 로 적는다', () => {
    const { body, item } = buildA08({ transcript: null, messages: null, rooms: null, processes: null })
    expect(body).toContain('fetch_history_calls=-')
    expect(body).not.toContain('fetch_history_calls=0')
    expect(item.status).toBe('UNMEASURED')
  })
})

describe('A09 — 「쟀다」와 「따라잡았다」를 가른다', () => {
  const three = [
    msg(1, 'user', 'unseen-A 못 본 첫째 줄'),
    msg(2, 'user', 'unseen-B 못 본 둘째 줄'),
    msg(3, 'user', '@TO(pm) mention-C 이제 확인해줘'),
  ]

  it('멘션 줄 앞의 두 줄만 대조 대상이다 — 마지막 줄은 빠진다', () => {
    const answer = msg(4, 'bot', '확인했습니다: unseen-A 와 unseen-B 를 봤습니다')
    const { item, body } = buildA09({ transcript: null, messages: [...three, answer], rooms: null, processes: null })
    expect(body).toContain('unmentioned_lines=2')
    expect(body).toContain('covered_by_reply=yes')
    expect(item.status).toBe('ok')
  })

  it('답변이 두 줄을 담지 못하면 covered=no 로 적되 상태는 여전히 ok 다 — 기록이지 합격 판정이 아니다', () => {
    const answer = msg(4, 'bot', '확인했습니다: unseen-A 만 봤습니다')
    const { item, body } = buildA09({ transcript: null, messages: [...three, answer], rooms: null, processes: null })
    expect(body).toContain('covered_by_reply=no')
    expect(item.status).toBe('ok')
    expect(item.verdict).toBe('두 줄 포함 여부를 기록했다')
  })

  it('봇 답변이 없으면 UNMEASURED 다 — 대조할 면이 없다', () => {
    const { item } = buildA09({ transcript: null, messages: three, rooms: null, processes: null })
    expect(item.status).toBe('UNMEASURED')
    expect(item).not.toHaveProperty('verdict')
  })

  it('사람 줄이 셋에 못 미치면 못 본 두 줄이 성립하지 않아 UNMEASURED 다', () => {
    const msgs = [three[0]!, three[2]!, msg(4, 'bot', 'unseen-A')]
    const { item, body } = buildA09({ transcript: null, messages: msgs, rooms: null, processes: null })
    expect(body).toContain('unmentioned_lines=1')
    expect(item.status).toBe('UNMEASURED')
  })

  it('DB 표면이 없으면 그 사실을 본문에 적고 UNMEASURED 다', () => {
    const { item, body } = buildA09({ transcript: null, messages: null, rooms: null, processes: null })
    expect(body).toContain('# 서버 DB 표면이 읽히지 않았다')
    expect(body).not.toContain('unmentioned_lines=')
    expect(item.status).toBe('UNMEASURED')
  })
})

describe('A11 — 재시작 대조는 개수가 아니라 고정된 한 행이다', () => {
  it('가장 이른 행을 고정하고 그 본문을 적는다', () => {
    const msgs = [msg(3, 'user', '첫 줄'), msg(9, 'bot', '나중 줄')]
    const { item, body } = buildA11({ transcript: null, messages: msgs, rooms: null, processes: null })
    expect(body).toContain('picked_id=3')
    expect(body).toContain('picked_body=첫 줄')
    expect(body).not.toContain('picked_id=9')
    expect(item.status).toBe('ok')
  })

  it('고정한 본문에 토큰 전문이 있으면 가려서 적는다', () => {
    const token = 'b'.repeat(64)
    const { body } = buildA11({
      transcript: null, messages: [msg(1, 'user', `MINIDISCORD_TOKEN=${token}`)],
      rooms: null, processes: null,
    })
    expect(body).not.toContain(token)
    expect(body).toContain('bbbbbbbb…(가림)')
  })

  it('메시지가 한 줄도 없으면 고를 행이 없어 UNMEASURED 다', () => {
    for (const messages of [null, [] as DbMessage[]]) {
      const { item, body } = buildA11({ transcript: null, messages, rooms: null, processes: null })
      expect(item.status).toBe('UNMEASURED')
      expect(item).not.toHaveProperty('verdict')
      expect(body).toContain('# 서버 DB 표면이 읽히지 않았거나 메시지가 없다')
    }
  })
})

describe('A12 — 접속 0건은 관측이고, 표면 부재는 관측이 아니다', () => {
  const rooms = [
    { id: 1, name: 'general', status: 'active' },
    { id: 2, name: 'old', status: 'archived' },
  ]

  it('방 상태와 접속 수를 함께 적으면 ok 다 — 접속 0건도 잰 값이다', () => {
    const { item, body } = buildA12({
      transcript: null, messages: null, rooms, processes: { established: 0 },
    })
    expect(body).toContain('room=2:old:status=archived')
    expect(body).toContain('established_connections=0')
    expect(item.status).toBe('ok')
    expect(item.verdict).toBe('방 상태와 접속 수를 함께 기록했다')
  })

  it('프로세스 표면이 없으면 «-» 로 적고 UNMEASURED 다 — 0 과 구분된다', () => {
    const { item, body } = buildA12({ transcript: null, messages: null, rooms, processes: null })
    expect(body).toContain('established_connections=-')
    expect(body).toContain('# 프로세스 표면이 읽히지 않았다')
    expect(item.status).toBe('UNMEASURED')
    expect(item).not.toHaveProperty('verdict')
  })

  it('DB 표면이 없으면 방 줄을 하나도 적지 않는다', () => {
    const { item, body } = buildA12({
      transcript: null, messages: null, rooms: null, processes: { established: 3 },
    })
    expect(body).toContain('# 서버 DB 표면이 읽히지 않았다')
    expect(body).not.toContain('room=')
    expect(item.status).toBe('UNMEASURED')
  })
})

describe('DB 판독기 — 못 읽음은 던짐이 아니라 null 이다', () => {
  it('DB 파일이 없으면 세 판독기가 모두 null 을 낸다', () => {
    const absent = path.join(tmpDir(), 'no-such.db')
    expect(readDb(absent, 'SELECT 1')).toBeNull()
    expect(dbMessages(absent)).toBeNull()
    expect(dbRooms(absent)).toBeNull()
  })

  it('파일이 있어도 DB 가 아니면 null 이다 — 던지지 않는다', () => {
    const bogus = path.join(tmpDir(), 'not-a.db')
    writeFileSync(bogus, '이건 sqlite 파일이 아니다\n')
    expect(() => readDb(bogus, 'SELECT id FROM messages')).not.toThrow()
    expect(readDb(bogus, 'SELECT id FROM messages')).toBeNull()
    expect(dbMessages(bogus)).toBeNull()
  })
})

// sqlite3 CLI 가 있는 환경에서만 도는 실 DB 대조 — 판독기가 «행» 을 어떤 형으로 옮기는지는
// 실제 sqlite3 출력 없이는 재지 못한다. 부재 환경은 조용히 통과시키지 않고 skip 으로 남긴다.
const hasSqlite3 = (() => {
  try { execFileSync('sqlite3', ['-version'], { stdio: 'ignore' }); return true } catch { return false }
})()

function makeDb(dir: string): string {
  const dbPath = path.join(dir, 'live.db')
  execFileSync('sqlite3', [dbPath], {
    input: [
      'CREATE TABLE rooms (id INTEGER, name TEXT, status TEXT);',
      'CREATE TABLE messages (id INTEGER, room_id INTEGER, author_type TEXT, body TEXT, created_at TEXT);',
      "INSERT INTO rooms VALUES (1,'general','active'),(2,'old','archived');",
      'INSERT INTO messages VALUES',
      " (1,1,'user','unseen-A 못 본 첫째 줄','2026-09-06T00:00:00Z'),",
      " (2,1,'user','unseen-B 못 본 둘째 줄','2026-09-06T00:00:01Z'),",
      " (3,1,'user','@TO(pm) 이제 확인해줘','2026-09-06T00:00:02Z'),",
      ` (4,1,'bot','확인했습니다 ${MARKER} — unseen-A unseen-B','2026-09-06T00:00:03Z');`,
    ].join('\n'),
    encoding: 'utf8',
  })
  return dbPath
}

describe.skipIf(!hasSqlite3)('DB 판독기 — 실 sqlite3 출력에서 행을 옮긴다', () => {
  it('메시지 행의 id 는 수로, 본문은 문자열로 옮긴다', () => {
    const rows = dbMessages(makeDb(tmpDir()))!
    expect(rows).toHaveLength(4)
    expect(rows[0]!.id).toBe(1)
    expect(rows[0]!.room_id).toBe(1)
    expect(rows[0]!.author_type).toBe('user')
    expect(rows[3]!.body).toContain(MARKER)
    expect(rows[3]!.created_at).toBe('2026-09-06T00:00:03Z')
  })

  it('방 행의 상태 값을 그대로 옮긴다', () => {
    const rooms = dbRooms(makeDb(tmpDir()))!
    expect(rooms.map(r => `${r.id}:${r.name}:${r.status}`)).toEqual(['1:general:active', '2:old:archived'])
  })
})

describe('대화 기록 후보 고르기 — .jsonl 만, 정렬해서', () => {
  it('디렉터리가 없으면 빈 목록이다', () => {
    expect(transcriptCandidates(path.join(tmpDir(), 'no-such-dir'))).toEqual([])
  })

  it('.jsonl 만 고르고 이름순으로 준다', () => {
    const d = tmpDir()
    for (const f of ['b.jsonl', 'a.jsonl', 'notes.txt', 'c.jsonl.bak']) writeFileSync(path.join(d, f), '')
    expect(transcriptCandidates(d)).toEqual([path.join(d, 'a.jsonl'), path.join(d, 'b.jsonl')])
  })
})

describe('전역 항목 판별자 — 네 결과가 서로 구분된다', () => {
  it('파일이 없으면 «파일 없음»', () => {
    expect(readGlobalEntry(path.join(tmpDir(), 'none.json'))).toBe('(파일 없음)')
  })

  it('JSON 이 깨졌으면 «읽지 못함» — 항목 없음과 구분된다', () => {
    const p = path.join(tmpDir(), 'broken.json')
    writeFileSync(p, '{ 이건 JSON 이')
    expect(readGlobalEntry(p)).toBe('(읽지 못함)')
  })

  it('JSON 은 성한데 채널 항목이 없으면 «항목 없음»', () => {
    const p = path.join(tmpDir(), 'empty.json')
    writeFileSync(p, JSON.stringify({ mcpServers: { other: { command: 'x' } } }))
    expect(readGlobalEntry(p)).toBe('(항목 없음)')
  })

  it('항목이 있으면 그 내용을 한 줄로 준다 — 내용이 바뀌면 값이 바뀐다', () => {
    const p = path.join(tmpDir(), 'entry.json')
    const entry = { command: 'node', args: ['/tmp/channel/dist/mcp.js'] }
    writeFileSync(p, JSON.stringify({ mcpServers: { 'minidiscord-channel': entry } }))
    expect(readGlobalEntry(p)).toBe(JSON.stringify(entry))

    writeFileSync(p, JSON.stringify({ mcpServers: { 'minidiscord-channel': { ...entry, command: 'bun' } } }))
    expect(readGlobalEntry(p)).not.toBe(JSON.stringify(entry))
  })
})

describe('runExtract — 닿지 못한 표면의 산출은 만들지 않는다', () => {
  const stableConfig = () => path.join(tmpDir(), 'absent-config.json')

  function transcriptDirWith(files: Record<string, string>): string {
    const d = tmpDir()
    for (const [name, body] of Object.entries(files)) writeFileSync(path.join(d, name), body)
    return d
  }

  const positiveText = () => readFileSync(path.join(FIX, 'positive.jsonl'), 'utf8')

  it('후보가 하나면 그 대화 기록에서 표지를 읽어 A01 산출에 적는다', () => {
    const out = tmpDir()
    const code = runExtract({
      out, db: null, transcriptDir: transcriptDirWith({ 'a.jsonl': positiveText() }),
      globalConfig: stableConfig(), processes: null,
    })
    expect(code).toBe(EXIT_UNMEASURED)
    expect(readFileSync(path.join(out, 'A01-reply-arg.txt'), 'utf8')).toContain(`reply_arg=${MARKER}`)
    expect(readFileSync(path.join(out, 'A01-db-row.txt'), 'utf8')).toContain('db_row=-')
    const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'))
    expect(manifestNamesMatch(manifest)).toBe(true)
    expect(manifest.spec).toBe('SPEC-LIVEENV-001')
  })

  // [HARD] 이 단언이 AC-LIVEENV-014 ㉡ 을 진다 — 닿지 못한 표면의 파일을 만들어 버리면
  // 예행의 기대 파일 집합이 거짓이 된다.
  it('후보가 둘이면 판정을 멈추고 대화 기록 유래 산출을 아예 만들지 않는다', () => {
    const out = tmpDir()
    const code = runExtract({
      out, db: null,
      transcriptDir: transcriptDirWith({ 'a.jsonl': positiveText(), 'b.jsonl': positiveText() }),
      globalConfig: stableConfig(), processes: null,
    })
    expect(code).toBe(EXIT_UNMEASURED)
    expect(existsSync(path.join(out, 'A01-reply-arg.txt'))).toBe(false)
    expect(existsSync(path.join(out, 'A01-db-row.txt'))).toBe(true)
    const notes = readFileSync(path.join(out, 'extract-notes.txt'), 'utf8')
    expect(notes).toContain('unmeasured_path=e3_transcript_candidates_multiple')
    expect(notes.match(/^candidate=/gm)).toHaveLength(2)
  })

  it('채널 도구 왕복 짝이 0건이면 승인 전이라고 적는다 — 실패가 아니다', () => {
    const out = tmpDir()
    const code = runExtract({
      out, db: null,
      transcriptDir: transcriptDirWith({
        'a.jsonl': jsonl(toolUse('u1', `${CH}reply`, { text: '확인했습니다 Qz7m4Kd2' })),
      }),
      globalConfig: stableConfig(), processes: null,
    })
    expect(code).toBe(EXIT_UNMEASURED)
    expect(readFileSync(path.join(out, 'extract-notes.txt'), 'utf8'))
      .toContain('unmeasured_path=e2_approval_pending')
    expect(existsSync(path.join(out, 'A01-reply-arg.txt'))).toBe(true)
  })

  it('후보가 없을 때와 디렉터리를 안 줬을 때를 다른 문장으로 적는다', () => {
    const empty = tmpDir()
    const outA = tmpDir()
    runExtract({ out: outA, db: null, transcriptDir: empty, globalConfig: stableConfig(), processes: null })
    expect(readFileSync(path.join(outA, 'extract-notes.txt'), 'utf8'))
      .toContain('# 대화 기록 후보가 없다')

    const outB = tmpDir()
    runExtract({ out: outB, db: null, transcriptDir: null, globalConfig: stableConfig(), processes: null })
    const notesB = readFileSync(path.join(outB, 'extract-notes.txt'), 'utf8')
    expect(notesB).toContain('# 대화 기록 디렉터리가 주어지지 않았다')
    expect(existsSync(path.join(outB, 'A01-reply-arg.txt'))).toBe(false)
  })

  // 실행 «중» 전역 항목의 내용이 달라지는 상황을 만든다 — 추출기 자신이 쓰는 파일을
  // 판별 대상으로 겨누면, 실행 전엔 없던 항목이 실행 뒤엔 「항목 없음」이 되어 값이 바뀐다.
  it('실행 중 전역 항목의 내용이 바뀌면 귀속을 포기하고 e5 를 적는다', () => {
    const out = tmpDir()
    const code = runExtract({
      out, db: null, transcriptDir: null,
      globalConfig: path.join(out, 'manifest.json'), processes: null,
    })
    expect(code).toBe(EXIT_UNMEASURED)
    const notes = readFileSync(path.join(out, 'extract-notes.txt'), 'utf8')
    expect(notes).toContain('unmeasured_path=e5_global_entry_changed')
    expect(notes).toContain('entry_before=(파일 없음)')
    expect(notes).toContain('entry_after=(항목 없음)')
    expect(notes).toContain('(판별자가 아니다)')
    expect(notes).not.toContain('# 대화 기록 디렉터리가 주어지지 않았다')
  })

  it.skipIf(!hasSqlite3)('기계 항이 전부 ok 여도 사람 항 둘 때문에 종료 코드는 0 이 아니다', () => {
    const out = tmpDir()
    const db = makeDb(tmpDir())
    const code = runExtract({
      out, db,
      transcriptDir: transcriptDirWith({ 'a.jsonl': positiveText() }),
      globalConfig: stableConfig(), processes: { established: 1 },
    })
    const manifest = JSON.parse(readFileSync(path.join(out, 'manifest.json'), 'utf8'))
    const byName: Record<string, any> = Object.fromEntries(manifest.items.map((i: any) => [i.name, i]))
    for (const name of ['A01 ㉣', 'A08', 'A09', 'A11', 'A12']) {
      expect(byName[name].status, `${name} 이 ok 여야 한다`).toBe('ok')
    }
    expect(byName['A03'].status).toBe('UNMEASURED')
    expect(byName['A10'].status).toBe('UNMEASURED')
    expect(code).toBe(EXIT_UNMEASURED)
    expect(code).not.toBe(EXIT_OK)
    expect(readFileSync(path.join(out, 'A01-db-row.txt'), 'utf8')).toContain('agree=yes')
    expect(existsSync(path.join(out, 'extract-notes.txt'))).toBe(false)
  })
})

describe('캡처 단계 — 부재는 skip 도 실패도 아니고 «재지 못함» 이다', () => {
  const saved = process.env.PLAYWRIGHT_BROWSERS_PATH
  const restore = () => {
    if (saved === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH
    else process.env.PLAYWRIGHT_BROWSERS_PATH = saved
  }

  it('브라우저 캐시 경로가 빈 값이면 모듈 후보를 세지 않는다', () => {
    try {
      process.env.PLAYWRIGHT_BROWSERS_PATH = ''
      expect(playwrightCandidates()).toEqual([])
    } finally { restore() }
  })

  it('브라우저 캐시 경로가 없는 자리를 가리키면 모듈이 있어도 후보가 없다', () => {
    try {
      process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(tmpDir(), 'no-such-browsers')
      expect(playwrightCandidates()).toEqual([])
    } finally { restore() }
  })

  it('후보가 없으면 종료 코드 2 와 UNMEASURED 상태 파일을 남긴다 — 0 도 1 도 아니다', () => {
    const out = tmpDir()
    let code: number
    try {
      process.env.PLAYWRIGHT_BROWSERS_PATH = ''
      code = runCapture(out)
    } finally { restore() }
    expect(code).toBe(EXIT_UNMEASURED)
    expect(code).not.toBe(EXIT_OK)
    const status = readFileSync(path.join(out, 'capture-status.txt'), 'utf8')
    expect(status).toContain('unmeasured_path=capture_playwright_absent')
    expect(status).toContain('status=UNMEASURED')
  })
})
