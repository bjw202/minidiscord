// AC-CORE-007 검증 보조 — 인라인 tsx -e 형태가 워크스페이스 경로 해석에 실패하여
// acceptance.md 구현자 주에 따라 동일한 관측값 8개를 테스트로 관측한다.
import { describe, it, expect, vi } from 'vitest'

describe('config', () => {
  it('defaults (no env)', async () => {
    vi.resetModules()
    const { config } = await import('../src/config.js')
    expect(config.port).toBe(3000)
    expect(config.dataDir).toBe('./data')
    expect(config.dbPath).toBe('./data/minidiscord.db')
    expect(config.uploadsDir).toBe('./data/uploads')
  })

  it('env overrides', async () => {
    process.env.MINIDISCORD_PORT = '4100'
    process.env.MINIDISCORD_DATA_DIR = '/tmp/md'
    vi.resetModules()
    const { config } = await import('../src/config.js')
    expect(config.port).toBe(4100)
    expect(config.dataDir).toBe('/tmp/md')
    expect(config.dbPath).toBe('/tmp/md/minidiscord.db')
    expect(config.uploadsDir).toBe('/tmp/md/uploads')
    delete process.env.MINIDISCORD_PORT
    delete process.env.MINIDISCORD_DATA_DIR
  })
})
