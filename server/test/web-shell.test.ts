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

// 요청을 기록하면서 미리 정한 응답을 돌려주는 fetch. 키는 "<METHOD> <path>".
// 등록되지 않은 경로에서 던지는 것이 의도다 — 구현이 예상 밖의 엔드포인트를 부르면
// 테스트가 조용히 통과하지 않고 그 자리에서 실패한다.
type Stubbed = { status: number; body?: unknown }
function stubFetch(routes: Record<string, Stubbed>) {
  const calls: { path: string; opts: RequestInit }[] = []
  globalThis.fetch = vi.fn(async (path: string, opts: RequestInit = {}) => {
    calls.push({ path, opts })
    const key = `${(opts.method ?? 'GET').toUpperCase()} ${path}`
    const r = routes[key]
    if (!r) throw new Error(`스텁에 없는 경로: ${key}`)
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body ?? {},
    } as unknown as Response
  }) as unknown as typeof fetch
  return calls
}

// 모듈 수준 state 가 테스트 사이에 새는 것을 막는다.
async function loadApp() {
  vi.resetModules()
  // @ts-expect-error web/app.js 는 브라우저가 직접 읽는 ES 모듈이라 타입 선언을 두지 않는다 (spec.md §4.8 계약 1)
  return await import('../../web/app.js')
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

// 영속 id 20개 (spec.md REQ-WEBSHELL-003 관측 2 — v2 에서 가입 폼·비밀번호 입력의 넷이 빠졌다). `placeholder` 는 여기 없다 —
// #chat 요소는 이 SPEC 소유지만 #chat 내용물은 SPEC-WEBCHAT-001 소유라, 형제가 내용물을
// 교체하는 순간 지워진다. 그 존재는 AC-015 관측 5(마감 시점 명령)가 잰다 (감사 MF-6).
const REQUIRED_IDS = [
  'auth-view', 'login-form', 'login-username', 'auth-error',
  'main-view', 'sidebar', 'room-list', 'archived-box', 'archived-list',
  'bot-list', 'new-room-btn', 'new-bot-btn', 'logout-btn',
  'chat',
  'prompt-dialog', 'prompt-form', 'prompt-label', 'prompt-input', 'prompt-ok',
  'error-toast',
]

describe('AC-WEBSHELL-003 id hygiene', () => {
  it('keeps every element id unique and present', () => {
    const doc = loadDom()
    const ids = [...doc.querySelectorAll('[id]')].map(e => e.id)
    // 중복이 있으면 어떤 값이 중복인지 실패 메시지에 드러나게 한다
    const dupes = ids.filter((v, i) => ids.indexOf(v) !== i)
    expect(dupes).toEqual([])
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of REQUIRED_IDS) {
      expect(doc.getElementById(id), `#${id} 가 있어야 한다`).not.toBeNull()
    }
  })
})

describe('AC-WEBSHELL-004 module bootstrap', () => {
  it('boots app.js as an ES module through initApp', () => {
    const doc = loadDom()
    expect(doc.documentElement.lang).toBe('ko')
    expect(doc.querySelector('meta[charset]')?.getAttribute('charset')).toBe('utf-8')
    const modules = [...doc.querySelectorAll('script[type="module"]')]
    expect(modules.length).toBeGreaterThan(0)
    // 주석 안의 문자열이 아니라 실제 스크립트 요소의 본문/참조를 본다
    const bootstraps = modules.filter(s => s.textContent?.includes('initApp'))
    expect(bootstraps.length, 'initApp() 을 부르는 모듈 스크립트가 있어야 한다').toBe(1)
    expect(bootstraps[0].textContent).toMatch(/import\s*\{[^}]*initApp[^}]*\}\s*from/)
    // 전역 스크립트로 app.js 를 다시 불러오지 않는다
    const classic = [...doc.querySelectorAll('script[src]')].filter(s => !s.getAttribute('type'))
    expect(classic, 'app.js 를 전역 스크립트로 불러오면 안 된다').toEqual([])
  })
})

// 이 SPEC 이 소유하는 필수 최소 집합 17개 (spec.md REQ-WEBSHELL-005 — v2 에서 register 가 빠졌다).
// 형제 SPEC 은 여기에 이름을 더할 수 있다 — 이 기준은 더해진 이름에 침묵한다.
const REQUIRED_EXPORTS = [
  '$', 'api', 'archiveRoom', 'createBot', 'createRoom', 'initApp', 'loadBots',
  'loadRooms', 'login', 'logout', 'openRoom', 'promptText',
  'renderBots', 'renderRooms', 'showAuth', 'showMain', 'state',
].sort()

describe('AC-WEBSHELL-006 export surface', () => {
  it('exposes at least the surface the sibling SPECs bind to', async () => {
    const app = await loadApp()
    const actual = Object.keys(app)
    // 1) 필수 이름이 하나도 빠지지 않았다. 빠진 것이 있으면 그 이름이 실패 메시지에 드러난다.
    const missing = REQUIRED_EXPORTS.filter(n => !actual.includes(n))
    expect(missing, '필수 export 가 빠졌다').toEqual([])
    // 2) state 는 객체이고 이 SPEC 이 소유하는 세 필드가 규정된 초기값을 갖는다.
    //    형제가 더한 필드에는 침묵한다 — toEqual 로 객체 전체를 못 박지 않는다.
    expect(typeof app.state).toBe('object')
    expect(app.state.rooms).toEqual({ active: [], archived: [] })
    expect(app.state.bots).toEqual([])
    expect(app.state.currentRoomId).toBeNull()
    // 3) 나머지 열여섯은 전부 함수다.
    for (const name of REQUIRED_EXPORTS.filter(n => n !== 'state')) {
      expect(typeof app[name], `${name} 은 함수여야 한다`).toBe('function')
    }
  })
})

describe('AC-WEBSHELL-007 api() request shape', () => {
  it('serializes, sends credentials, and surfaces the server error text', async () => {
    const { api } = await loadApp()
    const calls = stubFetch({
      'POST /api/rooms': { status: 201, body: { id: 1, name: '프로젝트A' } },
      'GET /api/bots': { status: 200, body: [] },
      'POST /api/bots': { status: 409, body: { error: '이미 있는 봇 이름입니다' } },
    })

    const created = await api('/api/rooms', { method: 'POST', body: { name: '프로젝트A' } })
    expect(created).toEqual({ id: 1, name: '프로젝트A' })
    const sent = calls[0]
    expect(sent.path).toBe('/api/rooms')
    expect((sent.opts.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect(sent.opts.body).toBe(JSON.stringify({ name: '프로젝트A' }))
    expect(sent.opts.credentials).toBe('same-origin')

    // 본문 없는 GET 에는 content-type 을 붙이지 않는다
    await api('/api/bots')
    expect((calls[1].opts.headers as Record<string, string> | undefined)?.['content-type']).toBeUndefined()
    expect(calls[1].opts.credentials).toBe('same-origin')

    // 오류 본문의 error 필드가 그대로 메시지가 된다
    await expect(api('/api/bots', { method: 'POST', body: { name: 'pm' } }))
      .rejects.toThrow('이미 있는 봇 이름입니다')
  })
})

describe('AC-WEBSHELL-008 401 two-way split', () => {
  it('shows the auth view on a protected 401 but not on an auth 401', async () => {
    const { api, showMain } = await loadApp()
    stubFetch({
      'GET /api/rooms': { status: 401, body: { error: '로그인이 필요합니다' } },
      'POST /api/auth/login': { status: 400, body: { error: 'username은 32자 이하여야 합니다' } },
    })

    showMain()
    expect(document.getElementById('main-view')!.hidden).toBe(false)

    // 보호 경로의 401 → 인증 뷰로 되돌린다
    await expect(api('/api/rooms')).rejects.toThrow()
    expect(document.getElementById('main-view')!.hidden).toBe(true)
    expect(document.getElementById('auth-view')!.hidden).toBe(false)

    // 인증 경로의 실패(400) → 화면을 건드리지 않는다
    showMain()
    await expect(api('/api/auth/login', { method: 'POST', body: { username: 'a' } }))
      .rejects.toThrow('username은 32자 이하여야 합니다')
    expect(document.getElementById('main-view')!.hidden, '로그인 실패가 화면을 되돌리면 안 된다').toBe(false)
  })
})

describe('AC-WEBSHELL-009 login flow', () => {
  it('enters the main view on login and shows the server message on failure', async () => {
    const app = await loadApp()
    const ok = stubFetch({
      'POST /api/auth/login': { status: 200, body: { ok: true } },
      'GET /api/rooms': { status: 200, body: { active: [], archived: [] } },
      'GET /api/bots': { status: 200, body: [] },
    })
    await app.login('alice')
    expect(document.getElementById('main-view')!.hidden).toBe(false)
    expect(document.getElementById('auth-view')!.hidden).toBe(true)
    const paths = ok.map(c => c.path)
    expect(paths).toContain('/api/rooms')   // 목록을 실제로 적재했다
    expect(paths).toContain('/api/bots')

    // 실패 경로
    const err = document.getElementById('auth-error')!
    stubFetch({ 'POST /api/auth/login': { status: 400, body: { error: 'username에 제어문자나 앞뒤 공백을 쓸 수 없습니다' } } })
    await expect(app.login(' alice')).rejects.toThrow()
    expect(err.hidden).toBe(false)
    expect(err.textContent).toBe('username에 제어문자나 앞뒤 공백을 쓸 수 없습니다')
  })
})

describe('AC-WEBSHELL-010 room list render', () => {
  it('renders active and archived rooms differently', async () => {
    const app = await loadApp()
    app.state.rooms = {
      active: [
        { id: 1, name: '프로젝트A', status: 'active', created_at: 'x', archived_at: null },
        { id: 2, name: '프로젝트B', status: 'active', created_at: 'x', archived_at: null },
      ],
      archived: [{ id: 3, name: '옛 프로젝트', status: 'archived', created_at: 'x', archived_at: 'y' }],
    }
    app.state.currentRoomId = 2
    app.renderRooms()

    const active = [...document.getElementById('room-list')!.querySelectorAll('.room-item')]
    const archived = [...document.getElementById('archived-list')!.querySelectorAll('.room-item')]
    expect(active).toHaveLength(2)
    expect(archived).toHaveLength(1)
    expect(active[0].textContent).toContain('프로젝트A')
    expect(archived[0].textContent).toContain('옛 프로젝트')
    // 활성 방에만 보관 버튼이 있다 — 보관된 방을 또 보관하면 서버가 409 를 낸다
    expect(active[0].querySelector('.archive-btn')).not.toBeNull()
    expect(archived[0].querySelector('.archive-btn')).toBeNull()
    // 현재 방 표시
    expect(active[1].classList.contains('active')).toBe(true)
    expect(active[0].classList.contains('active')).toBe(false)

    // 다시 그리면 쌓이지 않는다
    app.renderRooms()
    expect(document.getElementById('room-list')!.querySelectorAll('.room-item')).toHaveLength(2)
  })
})

describe('AC-WEBSHELL-011 room create/archive', () => {
  it('creates and archives rooms, reloads the list, and surfaces failures', async () => {
    const app = await loadApp()
    const calls = stubFetch({
      'POST /api/rooms': { status: 201, body: { id: 1, name: '프로젝트A' } },
      'POST /api/rooms/1/archive': { status: 200, body: { ok: true } },
      'GET /api/rooms': { status: 200, body: { active: [], archived: [] } },
    })

    await app.createRoom('프로젝트A')
    expect(calls[0].path).toBe('/api/rooms')
    expect(calls[0].opts.method).toBe('POST')
    expect(calls[0].opts.body).toBe(JSON.stringify({ name: '프로젝트A' }))
    expect(calls[1].path, '생성 뒤 목록을 다시 적재해야 한다').toBe('/api/rooms')
    expect(calls[1].opts.method ?? 'GET').toBe('GET')

    await app.archiveRoom(1)
    expect(calls[2].path).toBe('/api/rooms/1/archive')
    expect(calls[2].opts.method).toBe('POST')
    expect(calls[3].path).toBe('/api/rooms')

    // 서버 오류를 삼키지 않는다 (plan.md §D 4번)
    const toast = document.getElementById('error-toast')!
    stubFetch({ 'POST /api/rooms/9/archive': { status: 409, body: { error: '이미 보관된 방입니다' } } })
    await app.archiveRoom(9)
    expect(toast.hidden).toBe(false)
    expect(toast.textContent).toBe('이미 보관된 방입니다')
  })
})

describe('AC-WEBSHELL-012 bots', () => {
  it('renders bots and registers a new one', async () => {
    const app = await loadApp()
    app.state.bots = [{ id: 1, name: 'pm', description: '' }, { id: 2, name: '코드리뷰어', description: '리뷰' }]
    app.renderBots()
    const items = document.getElementById('bot-list')!.children
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toContain('pm')
    expect(items[1].textContent).toContain('코드리뷰어')
    app.renderBots()
    expect(document.getElementById('bot-list')!.children).toHaveLength(2)

    const calls = stubFetch({
      'POST /api/bots': { status: 201, body: { id: 3, name: 'qa', description: '' } },
      'GET /api/bots': { status: 200, body: [] },
    })
    await app.createBot('qa', '')
    expect(calls[0].path).toBe('/api/bots')
    expect(calls[0].opts.method).toBe('POST')
    expect(calls[0].opts.body).toBe(JSON.stringify({ name: 'qa', description: '' }))
    expect(calls[1].path, '등록 뒤 목록을 다시 적재해야 한다').toBe('/api/bots')
  })
})

describe('AC-WEBSHELL-013 logout', () => {
  it('logs out, clears the state, and returns to the auth view', async () => {
    const app = await loadApp()
    app.showMain()
    app.state.rooms = { active: [{ id: 1, name: 'x', status: 'active', created_at: 'x', archived_at: null }], archived: [] }
    app.state.bots = [{ id: 1, name: 'pm', description: '' }]
    app.state.currentRoomId = 1

    const calls = stubFetch({ 'POST /api/auth/logout': { status: 200, body: { ok: true } } })
    await app.logout()

    expect(calls[0].path).toBe('/api/auth/logout')
    expect(calls[0].opts.method).toBe('POST')
    expect(app.state.rooms).toEqual({ active: [], archived: [] })
    expect(app.state.bots).toEqual([])
    expect(app.state.currentRoomId).toBeNull()
    expect(document.getElementById('auth-view')!.hidden).toBe(false)
    expect(document.getElementById('main-view')!.hidden).toBe(true)
  })
})

// ── 카드 t32 §D — auth-error 배너 위치 수리 (결함 D-2) ──────────
// 결함 D-1(회원가입 실패 무반응)은 v2 에서 회원가입 자체가 사라져 대상이 없다. login() 은 실패를
// #auth-error 에 띄우는 같은 형태를 유지한다 — AC-WEBSHELL-009 가 잰다.

// style.css 에서 셀렉터의 규칙 블록 원문을 잡는다. 접두가 겹치는 셀렉터(#auth-view form 등)는
// 셀렉터 다음에 여백+`{` 가 바로 오지 않으므로 여기서 걸러진다. 주석은 먼저 벗겨낸다 —
// 규칙 설명 주석이 셀렉터 문법([hidden]{display:none} 등)을 그대로 인용하면 주석 속
// 문자열이 진짜 규칙보다 먼저 잡히기 때문이다(D-3 가드 it 이 잡은 실제 사례). CSS 주석은
// 중첩되지 않으므로 벗기기가 안전하다. 중괄호는 깊이를 세어 짝을 맞춘다.
function cssRuleBlock(css: string, selector: string): string {
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '')
  let at = -1
  for (let i = bare.indexOf(selector); i !== -1; i = bare.indexOf(selector, i + 1)) {
    if (bare.slice(i + selector.length).trimStart().startsWith('{')) { at = i; break }
  }
  expect(at, `style.css 에 ${selector} 규칙이 있어야 한다`).toBeGreaterThanOrEqual(0)
  const brace = bare.indexOf('{', at)
  let depth = 0
  for (let i = brace; i < bare.length; i++) {
    if (bare[i] === '{') depth++
    else if (bare[i] === '}') { depth--; if (depth === 0) return bare.slice(brace + 1, i) }
  }
  return ''
}

describe('auth-error repair (card t32 §D)', () => {
  // 결함 D-2: #auth-error 가 폼 다음 형제라 오류 문구가 패널 바깥 오른쪽에 떴다
  // (스크린샷 evidence/defect-1-register-silent.png). 배너가 #auth-view 의 첫 자식인 것을 DOM 위치로 잰다.
  it('keeps the auth-error banner ahead of the login panel', () => {
    loadDom()
    const banner = document.getElementById('auth-error')!
    const loginForm = document.getElementById('login-form')!
    expect(banner.compareDocumentPosition(loginForm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // 결함 D-2 의 시각 절반 — 배너가 두 패널 «위» 줄을 차지해야 한다. jsdom 은 link 된
  // stylesheet 의 규칙을 getComputedStyle 로 읽지 못하고 offsetTop 도 전부 0 이라
  // 런타임 레이아웃 단언은 불가능하다. 그래서 기계적으로 가능한 최강의 대체로
  // style.css 파일 자체를 읽어 해당 셀렉터의 규칙 블록에서 두 선언을 잰다
  // (AC-WEBSHELL-001 이 web/ 파일을 readFileSync 로 잰 것과 같은 방식). DOM 순서 it 과
  // 이 규칙 it 이 함께여야 «순서 + 규칙» 의 시각 의도가 고정된다.
  it('keeps the banner full-width above the panels (style.css rules)', () => {
    const css = readFileSync(join(webDir, 'style.css'), 'utf8')
    expect(cssRuleBlock(css, '#auth-view')).toContain('flex-wrap: wrap')
    expect(cssRuleBlock(css, '#auth-error')).toContain('width: 100%')
  })

  // 갈래 2 — «무반응 제거» 보강. WebKit 판정(evidence/webkit-green-output.txt)으로
  // 무반응의 원인이 운영자 브라우저의 쿠키 저장 거부로 확정됐지만, «성공해도 메시지가
  // 없어 디버깅 불가» 는 그 자체로 결함이다: 쿠키가 무시되면 login 200 뒤 rooms 401 로
  // api() 가 인증 뷰로 되돌리는데 어디에도 문구가 없었다.
  it('shows the session-lost message when room loading fails after login (401)', async () => {
    const app = await loadApp()
    stubFetch({
      'POST /api/auth/login': { status: 200, body: { ok: true } },
      'GET /api/rooms': { status: 401, body: { error: '로그인이 필요합니다' } },
    })
    await expect(app.login('alice')).rejects.toThrow()
    // api() 의 401 처리가 인증 뷰로 되돌려 놓는다 — 그 위에 문구가 있어야 디버깅이 시작된다
    expect(document.getElementById('auth-view')!.hidden).toBe(false)
    expect(document.getElementById('main-view')!.hidden).toBe(true)
    const err = document.getElementById('auth-error')!
    expect(err.hidden, '세션 유지 실패가 화면에 보여야 한다').toBe(false)
    expect(err.textContent).toBe('로그인은 됐지만 세션을 유지하지 못했습니다 — 브라우저 쿠키 설정을 확인하세요')
  })

  // 오류 토스트는 자동으로 사라지지 않는다 — 삼켜진 오류가 없게 하는 기존 관습의 회귀
  // 가드다. AC-WEBSHELL-011 은 표시 자체를 재므로 시간축(4초 후에도 남아 있음)은 여기가 잰다.
  it('keeps the error toast on screen (no auto-hide)', async () => {
    const app = await loadApp()
    vi.useFakeTimers()
    try {
      stubFetch({ 'POST /api/rooms/9/archive': { status: 409, body: { error: '이미 보관된 방입니다' } } })
      await app.archiveRoom(9)
      const toast = document.getElementById('error-toast')!
      expect(toast.hidden).toBe(false)
      vi.advanceTimersByTime(4_000)
      expect(toast.hidden, '오류 토스트는 저절로 사라지지 않는다').toBe(false)
      expect(toast.classList.contains('toast-success'), '오류 토스트에 성공 클래스가 없어야 한다').toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })


  // 결함 D-3 의 규칙 절반 — [hidden] 가드. author 의 display:flex 선언(#auth-view·
  // #main-view)은 UA 스타일시트의 [hidden]{display:none} 을 항상 이기므로 el.hidden = true
  // 가 시각적으로 무효가 되고 두 뷰가 겹쳐 렌더링된다. author 선언을 통째로 이기려면
  // !important 가 필요하다. 실제 겹침 해소는 test/web-visual.test.ts 의 실브라우저
  // bounding box 단언이 잰다 — 이 it 은 규칙 존재만 고정한다.
  it('keeps the [hidden] guard in style.css', () => {
    const css = readFileSync(join(webDir, 'style.css'), 'utf8')
    expect(cssRuleBlock(css, '[hidden]')).toContain('display: none !important')
  })
})
