import { describe, it, expect } from 'vitest'
import { parseMentions } from '../src/mention.js'
import type { Mention } from '../src/mention.js'

// 계약 고정 1 — 반환은 Mention 배열이다.
const _pinned: Mention[] = parseMentions('@TO(pm)')
// 계약 고정 2 — 배열이지 단일 Mention 이 아니다.
// @ts-expect-error parseMentions 는 Mention[] 를 돌려준다
const _notSingle: Mention = parseMentions('@TO(pm)')
// 계약 고정 3 — delivery 는 'to' | 'cc' 두 값뿐이다.
// @ts-expect-error 'bcc' 는 delivery 값이 아니다
const _notWidened: Mention = { bot: 'pm', delivery: 'bcc' }

describe('parseMentions', () => {
  it('parses a single TO', () => {
    expect(parseMentions('@TO(pm) 일정 정리해줘')).toEqual([{ bot: 'pm', delivery: 'to' }])
  })

  it('parses CC', () => {
    expect(parseMentions('이건 참고만 @CC(coder)')).toEqual([{ bot: 'coder', delivery: 'cc' }])
  })

  it('parses multiple mentions in order, duplicates kept', () => {
    expect(parseMentions('@TO(pm) 정리하고 @TO(coder) 구현해. @CC(coder)')).toEqual([
      { bot: 'pm', delivery: 'to' },
      { bot: 'coder', delivery: 'to' },
      { bot: 'coder', delivery: 'cc' },
    ])
  })

  it('ignores plain @name and non-TO/CC keywords while catching a real mention', () => {
    expect(parseMentions('@pm 안녕 @토(pm)도 무시 @to(pm)도 무시 @TO(real) 이건 잡힌다')).toEqual([
      { bot: 'real', delivery: 'to' },
    ])
  })

  it('rejects empty and space-containing names while catching a valid one', () => {
    expect(parseMentions('@TO( ) @TO() @CC(ok)')).toEqual([{ bot: 'ok', delivery: 'cc' }])
  })

  it('korean bot names work', () => {
    expect(parseMentions('@TO(코드리뷰어) 봐줘')).toEqual([{ bot: '코드리뷰어', delivery: 'to' }])
  })
})
