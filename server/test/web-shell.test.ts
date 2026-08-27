// @vitest-environment jsdom
// ^ 이 도크블록이 이 파일만 jsdom 환경으로 가른다 — 기존 서버 테스트(better-sqlite3·ws·실 listen)는
// node 환경을 유지한다 (plan.md §C). 도크블록이 vitest 4.1.11 에서 동작하는지는 이 파일의
// 첫 실행으로 확인하고 그 결과를 progress.md §E.2 에 기록한다.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))    // server/test
const webDir = join(here, '../../web')

// index.html 의 실제 마크업을 jsdom 문서에 세운다.
// innerHTML 로 삽입된 <script> 는 실행되지 않으므로 부작용이 없다 — 부트스트랩은 테스트가 직접 부른다.
function loadDom(): Document {
  const html = readFileSync(join(webDir, 'index.html'), 'utf8')
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  document.documentElement.lang = parsed.documentElement.lang
  document.head.innerHTML = parsed.head.innerHTML
  document.body.innerHTML = parsed.body.innerHTML
  return parsed
}

// buildServer() 가 저장소의 진짜 data/ 를 열지 않게 격리한다.
// config.dataDir 은 게터로 지연 평가되므로 import 이후 설정해도 반영된다
// (server/src/config.ts, SPEC-SSE-001 progress.md 의 확정된 선례).
function isolateEnv() {
  const prevData = process.env.MINIDISCORD_DATA_DIR
  const prevWeb = process.env.MINIDISCORD_WEB_DIR
  const dir = mkdtempSync(join(tmpdir(), 'md-web-'))
  process.env.MINIDISCORD_DATA_DIR = dir
  process.env.MINIDISCORD_WEB_DIR = webDir
  return () => {
    process.env.MINIDISCORD_DATA_DIR = prevData
    process.env.MINIDISCORD_WEB_DIR = prevWeb
    rmSync(dir, { recursive: true, force: true })
  }
}

beforeEach(() => { loadDom() })
afterEach(() => { vi.restoreAllMocks() })

describe('AC-WEBSHELL-001 static serving', () => {
  it('serves the web directory from the server root', async () => {
    const restore = isolateEnv()
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    const root = await app.inject({ method: 'GET', url: '/' })
    expect(root.statusCode).toBe(200)
    expect(root.headers['content-type']).toContain('text/html')
    // 아무 HTML 이나 통과하지 않게 이 SPEC 의 두 뷰를 직접 본다
    expect(root.body).toContain('id="auth-view"')
    expect(root.body).toContain('id="main-view"')
    for (const path of ['/style.css', '/app.js', '/design-tokens.css']) {
      const res = await app.inject({ method: 'GET', url: path })
      expect(res.statusCode, `${path} 가 200 이어야 한다`).toBe(200)
      expect(res.body.length).toBeGreaterThan(0)
    }
    await app.close()
    restore()
  })
})

describe('AC-WEBSHELL-002 API not shadowed', () => {
  it('does not shadow the API routes with static serving', async () => {
    const restore = isolateEnv()
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    // 존재로 쓴 절반 — 정적 서빙이 실제로 걸려 있다
    const root = await app.inject({ method: 'GET', url: '/' })
    expect(root.headers['content-type']).toContain('text/html')
    // 기존 API 가 그대로 JSON 을 낸다
    const health = await app.inject({ method: 'GET', url: '/api/health' })
    expect(health.statusCode).toBe(200)
    expect(health.json()).toEqual({ ok: true })
    // 없는 API 경로가 index.html 로 폴백하지 않는다
    const missing = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(missing.statusCode).toBe(404)
    expect(missing.body).not.toContain('id="auth-view"')
    await app.close()
    restore()
  })
})
