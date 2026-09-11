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

// 임시 데이터 디렉터리 + 포트 0 서버, chromium, 로그인, #main-view 대기까지 한 번에 세운다
// (SPEC-WEBUI-001 M0 — 서버 기동·chromium·로그인 절차가 유일한 it 안에 인라인돼 있던 것을 뽑았다).
// 돌려주는 dispose() 는 browser·app·디렉터리를 기존 finally 절과 같은 순서로 정리한다.
// 운영자의 3000/3001 에 붙지 않는다 — 임시 데이터 디렉터리 + 포트 0(자유 포트).
// 로그인 흐름이 실제 sqlite 에 쓰지만 그 대상은 이 임시 디렉터리다.
async function bootVisual(): Promise<{ page: any; base: string; dispose: () => Promise<void> }> {
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

  const page = await browser.newPage()
  await page.goto(base + '/')
  // 이름 로그인 흐름 — 제출하면 login → main 진입까지 자동이다 (v2, 가입 없음)
  await page.fill('#login-username', `visual-probe-${Date.now()}`)
  await page.click('#login-form button[type="submit"]')
  // 로그인 완료 신호: main-view 의 hidden 속성이 떼어지는 시점까지 기다린다.
  // 이 대기는 속성 기준이다 — 시각 판정은 각 it 의 bounding box 가 한다.
  await page.waitForSelector('#main-view:not([hidden])', { state: 'attached', timeout: 10_000 })

  const dispose = async () => {
    await browser.close()
    await app.close()
    rmSync(dir, { recursive: true, force: true })
  }
  return { page, base, dispose }
}

describe('D-3 hidden guard (real browser, card t32 §D)', () => {
  it('hides the auth view visually after successful registration', { skip: skipReason !== null, timeout: 60_000 }, async () => {
    const { page, dispose } = await bootVisual()
    try {
      // 시각 단언 — 속성이 아니라 실제 레이아웃을 잰다. display:none 이면 boundingBox 는 null.
      const authBox = await page.locator('#auth-view').boundingBox()
      const mainBox = await page.locator('#main-view').boundingBox()
      // (a) auth-view 는 화면에서 사라져야 한다 — 겹치면 실제 크기의 box 가 남는다
      expect(authBox, `auth-view 가 여전히 렌더링된다(겹침) — box: ${JSON.stringify(authBox)}`).toBeNull()
      // (b) main-view 는 실제로 보여야 한다
      expect(mainBox, 'main-view 의 bounding box 가 있어야 한다').not.toBeNull()
      expect(mainBox!.width).toBeGreaterThan(0)
      expect(mainBox!.height).toBeGreaterThan(0)

    } finally {
      await dispose()
    }
  })
})

// ── SPEC-WEBUI-001 — 실브라우저 뒤 겹 (C2·C1·C3) ────────────────────────
// 그리드 자동 배치는 CSS 사양 동작이라 jsdom 이 재지 못한다. CSS 정적 단언은 「규칙이
// 적혀 있다」까지만 보고, 적힌 규칙이 실제로 듣는지는 여기서 잰다.
describe('SPEC-WEBUI-001 real-browser layers', () => {
  // AC-WEBUI-006 뒤 겹 — 이 SPEC 에서 유일하게 「시험은 초록인데 화면이 깨진」 상태를 잡는 관측
  it('keeps a decoration node out of the 40px avatar column (real browser)', { skip: skipReason !== null, timeout: 60_000 }, async () => {
    const { page, dispose } = await bootVisual()
    try {
      await page.evaluate(async () => {
        await fetch('/api/rooms', { method: 'POST', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'probe' }) })
      })
      await page.reload()
      await page.click('#room-list .room-item')
      // 메시지 하나를 실제로 보낸다 — 렌더 경로를 그대로 지난다
      await page.fill('#msg-input', '레이아웃 탐침')
      await page.click('#send-btn')
      await page.waitForSelector('#messages .message')

      // SPEC-WEBRICH-001 이 붙이는 것과 «같은 자리»에 노드를 하나 붙인다 (el.appendChild(node))
      const width = await page.evaluate(() => {
        const m = document.querySelector('#messages .message')!
        const probe = document.createElement('div')
        probe.className = 'attachment-probe'
        probe.textContent = '첨부 자리 탐침'
        m.appendChild(probe)                      // rich.js 의 el.appendChild 와 같은 직계 자식 추가
        return probe.getBoundingClientRect().width
      })
      // 40px 칸으로 밀려 들어갔으면 이 값이 40 언저리다. 2열이면 본문 폭을 받는다.
      expect(width).toBeGreaterThan(200)
    } finally { await dispose() }
  })

  // AC-WEBUI-003 뒤 겹 — 실제 API 로 만든 방 둘의 행 높이가 둘 다 26 이고 꼬리가 잘리지 않는다.
  // window.__app 같은 전역은 쓰지 않는다 — web/app.js 는 ES 모듈이고 전역을 심지 않는다.
  it('renders every room row at the same fixed height (real browser)', { skip: skipReason !== null, timeout: 60_000 }, async () => {
    const { page, dispose } = await bootVisual()
    try {
      // 방 둘을 실제 서버에 만든다 — 페이지의 세션 쿠키를 그대로 쓰는 fetch 다
      await page.evaluate(async () => {
        const mk = (name: string) => fetch('/api/rooms', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
        })
        await mk('a')
        await mk('prodev-worktogether-2026-장기/분기별-수율-보고서-최종본')
      })
      await page.reload()
      await page.waitForSelector('#room-list .room-item')

      const heights = await page.$$eval('#room-list .room-item',
        (els: Element[]) => els.map((e: Element) => e.getBoundingClientRect().height))
      expect(heights).toHaveLength(2)
      expect(heights[0]).toBe(26)
      expect(heights[1]).toBe(heights[0])   // 이름 길이가 행 높이를 바꾸지 않는다
      // 꼬리는 화면에서도 잘리지 않는다 — 줄어드는 것은 앞머리뿐이다
      const tail = await page.$$eval('#room-list .room-item .room-name',
        (els: Element[]) => els.map((e: Element) => e.scrollWidth <= e.clientWidth))
      expect(tail).toEqual([true, true])
    } finally { await dispose() }
  })

  // AC-WEBUI-010 뒤 겹 — 선언이 적혀 있다는 것과 폭이 실제로 나온다는 것은 다른 사실이다.
  // 컨테이너 폭이 바깥 footer 폭(좌우 패딩 16px 씩 제외)과 같은지 잰다.
  it('lets the composer container span the chat column (real browser)', { skip: skipReason !== null, timeout: 60_000 }, async () => {
    const { page, dispose } = await bootVisual()
    try {
      await page.evaluate(async () => {
        await fetch('/api/rooms', { method: 'POST', credentials: 'same-origin',
          headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'probe' }) })
      })
      await page.reload()
      await page.click('#room-list .room-item')
      await page.waitForSelector('#composer-box')

      const [boxW, footerW] = await page.evaluate(() => {
        const b = document.getElementById('composer-box')!.getBoundingClientRect()
        const f = document.getElementById('composer')!.getBoundingClientRect()
        return [b.width, f.width]
      })
      // 바깥 footer 의 좌우 패딩(--md-space-4 = 16px 씩)을 뺀 만큼을 컨테이너가 다 쓴다
      expect(boxW).toBeGreaterThan(footerW - 40)
    } finally { await dispose() }
  })
})
