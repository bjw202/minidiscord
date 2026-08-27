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
    // 출하 기본값을 고정한다 (sync-audit-3 N-08). 127.0.0.1 이 아니면 같은 네트워크의 누구나
    // 가입해 모든 방을 읽을 수 있고, 나머지 수용된 위험들이 전부 이 기본값 위에 서 있다 (F-03).
    expect(config.host).toBe('127.0.0.1')
    // 미설정이면 undefined 여야 한다 — 게이트웨이가 이 값으로 봇 첨부를 통째로 거부한다 (F-01).
    expect(config.botFilesDir).toBeUndefined()
  })

  it('env overrides', async () => {
    process.env.MINIDISCORD_PORT = '4100'
    process.env.MINIDISCORD_DATA_DIR = '/tmp/md'
    process.env.MINIDISCORD_HOST = '0.0.0.0'
    process.env.MINIDISCORD_BOT_FILES_DIR = '/tmp/botfiles'
    vi.resetModules()
    const { config } = await import('../src/config.js')
    expect(config.port).toBe(4100)
    expect(config.dataDir).toBe('/tmp/md')
    expect(config.dbPath).toBe('/tmp/md/minidiscord.db')
    expect(config.uploadsDir).toBe('/tmp/md/uploads')
    // 넓히는 것 자체는 막지 않는다 — 기본값이 좁고 재정의가 명시적이라는 두 성질을 함께 관측한다.
    expect(config.host).toBe('0.0.0.0')
    expect(config.botFilesDir).toBe('/tmp/botfiles')
    delete process.env.MINIDISCORD_PORT
    delete process.env.MINIDISCORD_DATA_DIR
    delete process.env.MINIDISCORD_HOST
    delete process.env.MINIDISCORD_BOT_FILES_DIR
  })
})
