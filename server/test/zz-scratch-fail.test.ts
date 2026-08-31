import { describe, it, expect } from 'vitest'

describe('scratch', () => {
  it('scratch: CI 변별용 의도적 실패 — 병합 금지', () => {
    expect(1).toBe(2)
  })
})
