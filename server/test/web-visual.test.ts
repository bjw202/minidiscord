// ── 카드 t32 §D — 결함 D-3 시각 단언 (실브라우저) ───────────────────────
// 근본 원인(리드 확정): style.css 의 #auth-view·#main-view { display: flex } 는 UA
// 스타일시트의 [hidden]{display:none} 을 항상 이긴다(author display 선언 우선). 그래서
// el.hidden = true 가 시각적으로 무효라 앱 논리(뷰 전환·쿠키·로그인)는 전부 정상인데
// 두 뷰가 겹쳐 렌더링됐다. jsdom 의 속성 단언은 이 겹침을 못 잡으므로 이 파일만
// 실브라우저(Playwright chromium)로 bounding box 를 잰다.
//
// 브라우저 의존 trade-off: 이 테스트는 npx 캐시(~/.npm/_npx/*/node_modules/playwright)의
// playwright 모듈과 ms-playwright 캐시의 chromium 바이너리를 필요로 한다. 부재 환경
// (CI 러너 등)에서는 실패 대신 skip 으로 전환하되, 조용한 skip 은 금지다 — console.warn
// 한 줄(무엇을 왜 건너뛰었는지)과 vitest 의 skipped 표시로 반드시 흔적을 남긴다.
// 로컬(브라우저 있음)에서는 기존처럼 시각 단언이 돈다.
import { describe, it, expect } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { createRequire } from 'node:module'

// npx 캐시에서 playwright 모듈 후보를 모은다 — 최근에 쓴 것부터 시도한다.
// playwright 는 server 의 의존이 아니므로 정식 import 가 아니라 require 로 튼다.
function loadPlaywrightCandidates(): any[] {
  const npxRoot = join(homedir(), '.npm', '_npx')
  if (!existsSync(npxRoot)) {
    throw new Error('playwright 미설치 — npx 캐시(~/.npm/_npx)가 없다. npx playwright 로 한 번 실행해 캐시를 만들어라')
  }
  const require = createRequire(import.meta.url)
  const candidates = readdirSync(npxRoot)
    .map(entry => join(npxRoot, entry, 'node_modules', 'playwright'))
    .filter(p => existsSync(join(p, 'package.json')))
    .map(p => ({ p, mtime: statSync(p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  if (candidates.length === 0) {
    throw new Error('playwright 미설치 — npx 캐시에 playwright 모듈이 없다')
  }
  return candidates.map(c => require(c.p))
}

// 모듈 부재는 실패가 아니라 명시적 skip — 단, 이유를 반드시 출력한다. vitest 4.1.11 은
// skip 이 확정된 파일의 모듈 스코프 console.warn 을 수집 출력에서 가려 버리므로(실측),
// «조용한 skip 금지» 를 지키려면 표준 오류로 직접 내보내는 것이 확실하다.
let playwrightCandidates: any[] = []
let skipReason: string | null = null
try {
  playwrightCandidates = loadPlaywrightCandidates()
} catch (err) {
  skipReason = err instanceof Error ? err.message : String(err)
  process.stderr.write(`web-visual: Playwright 부재로 시각 단언 skip — 로컬에서 npm test 로 관측할 것 (${skipReason})\n`)
}

describe('D-3 hidden guard (real browser, card t32 §D)', () => {
  it('hides the auth view visually after successful registration', { skip: skipReason !== null, timeout: 60_000 }, async () => {
    // 운영자의 3000/3001 에 붙지 않는다 — 임시 데이터 디렉터리 + 포트 0(자유 포트).
    // 회원가입 흐름이 실제 sqlite 에 쓰지만 그 대상은 이 임시 디렉터리다.
    const dir = mkdtempSync(join(tmpdir(), 'md-visual-'))
    process.env.MINIDISCORD_DATA_DIR = dir
    const { buildServer } = await import('../src/index.js')
    const app = await buildServer()
    await app.listen({ port: 0, host: '127.0.0.1' })
    const address = app.server.address()
    const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`

    // chromium 캐시가 맞는 후보를 골라야 하므로 launch 실패를 다음 후보로 넘긴다
    const browsers = playwrightCandidates
    let lastErr: unknown
    let browser: any = null
    for (const pw of browsers) {
      try {
        browser = await pw.chromium.launch({ headless: true })
        break
      } catch (err) { lastErr = err }
    }
    if (!browser) {
      await app.close()
      rmSync(dir, { recursive: true, force: true })
      throw new Error(`chromium 실행 불가 — ~/Library/Caches/ms-playwright 캐시를 확인하라: ${lastErr}`)
    }

    try {
      const page = await browser.newPage()
      await page.goto(base + '/')
      // register 성공 흐름 — 제출하면 register → 자동 login → main 진입까지 자동이다
      await page.fill('#reg-username', `visual-probe-${Date.now()}`)
      await page.fill('#reg-password', 'visualpass123')
      await page.click('#register-form button[type="submit"]')
      // 로그인 완료 신호: main-view 의 hidden 속성이 떼어지는 시점까지 기다린다.
      // 이 대기는 속성 기준이다 — 시각 판정은 아래 bounding box 가 한다.
      await page.waitForSelector('#main-view:not([hidden])', { state: 'attached', timeout: 10_000 })

      // 시각 단언 — 속성이 아니라 실제 레이아웃을 잰다. display:none 이면 boundingBox 는 null.
      const authBox = await page.locator('#auth-view').boundingBox()
      const mainBox = await page.locator('#main-view').boundingBox()
      // (a) auth-view 는 화면에서 사라져야 한다 — 겹치면 실제 크기의 box 가 남는다
      expect(authBox, `auth-view 가 여전히 렌더링된다(겹침) — box: ${JSON.stringify(authBox)}`).toBeNull()
      // (b) main-view 는 실제로 보여야 한다
      expect(mainBox, 'main-view 의 bounding box 가 있어야 한다').not.toBeNull()
      expect(mainBox!.width).toBeGreaterThan(0)
      expect(mainBox!.height).toBeGreaterThan(0)

      // 묶음 ② — 성공 토스트의 색 분리도 실브라우저에서 잰다. 클래스 존재만으로는 토큰
      // 오탈자를 못 잡으므로, 계산된 색이 성공 토큰(--md-status-online)과 같고 오류 토큰과
      // 다른 것까지 확인한다.
      expect(await page.locator('#error-toast').getAttribute('class'), '성공 토스트에 클래스가 있어야 한다')
        .toContain('toast-success')
      const colors = await page.evaluate(() => {
        const probe = document.createElement('span')
        document.body.appendChild(probe)
        const read = (color: string) => {
          probe.style.color = color
          return getComputedStyle(probe).color
        }
        const online = read('var(--md-status-online)')
        const error = read('var(--md-status-error)')
        const toastColor = getComputedStyle(document.getElementById('error-toast')!).color
        probe.remove()
        return { toastColor, online, error }
      })
      expect(colors.toastColor, `토스트 색이 성공 토큰이어야 한다 — ${JSON.stringify(colors)}`).toBe(colors.online)
      expect(colors.toastColor, '토스트 색이 오류 토큰이면 안 된다').not.toBe(colors.error)
    } finally {
      await browser.close()
      await app.close()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
