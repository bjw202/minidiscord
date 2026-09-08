// @vitest-environment jsdom
// ^ 이 도크블록이 이 파일만 jsdom 환경으로 가른다 — 기존 서버 테스트(better-sqlite3·ws·실 listen)는
// node 환경을 유지한다 (plan.md §C). 선행 web-shell.test.ts 가 같은 방식을 쓰고 있다.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// 실제 서버 파서를 그대로 가져온다 — 계약 일치 검증(AC-WEBCHAT-010·011)의 전부다.
// 이 import 를 문자열 비교로 대체하면 정규식이 바뀔 때 조용히 어긋난다 (plan.md §D 1번)
import { parseMentions } from '../src/mention.js'

const webDir = join(dirname(fileURLToPath(import.meta.url)), '../../web')

// ── 가짜 EventSource ────────────────────────────────────────────────
// 실제 서버를 띄우지 않는다. 테스트가 서버 역할을 하며 이벤트를 직접 주입한다.
// close() 호출 여부를 기록해 두는 것이 AC-WEBCHAT-007 의 관측 수단이다.
class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  closed = false
  onerror: ((e: unknown) => void) | null = null
  onopen: ((e: unknown) => void) | null = null
  private ls: Record<string, ((e: { data: string }) => void)[]> = {}
  constructor(url: string) { this.url = url; FakeEventSource.instances.push(this) }
  addEventListener(type: string, fn: (e: { data: string }) => void) { (this.ls[type] ??= []).push(fn) }
  close() { this.closed = true }
  emit(type: string, data: unknown) { for (const f of this.ls[type] ?? []) f({ data: JSON.stringify(data) }) }
  // 구현이 onerror/onopen 속성을 쓰든 addEventListener 를 쓰든 둘 다 발화시킨다
  fail() { this.onerror?.({}); for (const f of this.ls['error'] ?? []) f({ data: '' }) }
  reopen() { this.onopen?.({}); for (const f of this.ls['open'] ?? []) f({ data: '' }) }
  static last() { return FakeEventSource.instances[FakeEventSource.instances.length - 1] }
}

// ── 가짜 fetch ─────────────────────────────────────────────────────
// 호출을 전부 기록한다. 호출 '횟수' 를 세는 기준(AC-WEBCHAT-009·012·013)이 이 기록에 의존한다.
interface Call { url: string; method: string; body: unknown }
let calls: Call[] = []
type Handler = (url: string, opts: { method?: string; body?: unknown }) =>
  unknown | Promise<unknown>

function installFetch(handler: Handler) {
  calls = []
  ;(globalThis as { fetch: unknown }).fetch = async (url: unknown, opts: { method?: string; body?: unknown } = {}) => {
    calls.push({ url: String(url), method: opts.method ?? 'GET', body: opts.body })
    const out = (await handler(String(url), opts)) as { ok?: boolean; status?: number; data?: unknown } | undefined
    return {
      ok: out?.ok !== false,
      status: out?.status ?? (out?.ok === false ? 400 : 200),
      json: async () => out?.data ?? {},
    }
  }
}

// 참여 목록 GET 호출만 센다 (v2: /api/rooms/:id/bots). POST /api/rooms/:id/bots 는 SPEC-WEBRICH-001 의
// 참여 추가이므로 형제가 자기 SPEC 대로 구현해도 이 계수가 흔들리지 않아야 한다.
const inviteGets = () => calls.filter(c => c.method === 'GET' && /^\/api\/rooms\/[0-9]+\/bots/.test(c.url)).length

// 마이크로태스크를 흘려보낸다. 가짜 타이머 아래에서도 Promise 는 정상 해소되므로
// setTimeout(0) 대신 이것을 쓴다 — setTimeout 은 가짜 타이머에 잡혀 영원히 안 돈다.
async function flush(times = 20) { for (let i = 0; i < times; i++) await Promise.resolve() }

// ── 앱 로딩 ────────────────────────────────────────────────────────
// web/app.js 는 ES 모듈이다 (SPEC-WEBSHELL-001 §4.8 계약 1). 원문을 감싸 eval 하지 않고
// 그대로 import 한다. 세 가지가 순서대로 지켜져야 한다:
//   (1) 가짜 fetch/EventSource 를 import 보다 먼저 심는다
//   (2) index.html 의 <body> 를 문서에 넣어 두어야 모듈이 찾는 요소가 존재한다
//   (3) 매 테스트가 새 모듈 인스턴스를 받아야 한다 — 모듈 수준 state 가 테스트끼리 새지 않도록
//       vi.resetModules() 로 모듈 레지스트리를 비운 뒤 적재한다.
//
// [run 단계 조정 기록] 0.3.0 골격은 `new URL('...?t=<n>').href` + `@vite-ignore` 적재를
// 제안했으나 이 vitest 파이프라인에서는 동작하지 않는다 — import.meta.url 이 http: 스킴이라
// @vite-ignore 가 넘기는 Node 기본 ESM 로더가 "Only URLs with a scheme in: file and data
// are supported" 로 거부한다(실제 출력, progress.md §E.2). 선행 web-shell.test.ts 의
// 확정된 방식(vi.resetModules() + 지정자 그대로 적재)으로 바꿨고, 모듈 신선도는 아래
// 'loads a fresh module instance' 테스트가 상시 관측한다.
interface AppModule {
  state: Record<string, unknown>
  openRoom: (id: number) => Promise<void>
  renderMessage: (m: unknown) => void
  sendMessage: () => Promise<void>
  refreshRoomBots: () => Promise<void>
  registerMessageDecorator: (factory: unknown) => void
  loadRooms: () => Promise<void>
}

async function loadApp(handler: Handler, opts: { decorator?: unknown } = {}) {
  FakeEventSource.instances = []
  installFetch(handler)
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource

  const html = readFileSync(join(webDir, 'index.html'), 'utf8')
  // <body> 안쪽만 넣는다. innerHTML 로 삽입된 <script> 는 명세상 실행되지 않으므로,
  // index.html 의 인라인 부트스트랩(initApp 호출)은 여기서 돌지 않는다.
  document.body.innerHTML = html.replace(/[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '')

  vi.resetModules()
  // @ts-expect-error web/app.js 는 브라우저가 직접 읽는 ES 모듈이라 타입 선언을 두지 않는다 (spec.md §4.8 계약 1)
  const mod = (await import('../../web/app.js')) as unknown as AppModule

  // 형제 SPEC 이 소유한 방 목록 적재. #room-title 이 방 이름을 찾으려면 state.rooms 가
  // 채워져 있어야 한다 (AC-WEBCHAT-001). initApp() 대신 이것만 부르는 이유는,
  // initApp() 이 폼 핸들러까지 거는 형제 소관 함수이고 이 SPEC 의 기준이 그것을 관측하지 않기 때문이다.
  await mod.loadRooms()
  if (opts.decorator) mod.registerMessageDecorator(opts.decorator)
  await flush()
  return mod
}

// ── 편의 함수 ──────────────────────────────────────────────────────
const $$ = (sel: string) => Array.from(document.querySelectorAll(sel))
const el = (id: string) => document.getElementById(id) as HTMLElement
const input = () => document.getElementById('msg-input') as HTMLTextAreaElement

// 입력창에 문자열을 넣고 커서를 끝에 두고 input 이벤트를 발화시킨다
function type(text: string) {
  const t = input()
  t.value = text
  t.selectionStart = t.selectionEnd = text.length
  t.dispatchEvent(new Event('input', { bubbles: true }))
}

function pressEnter(shift = false) {
  input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: shift, bubbles: true, cancelable: true }))
}

// keydown 하나를 보내고 이벤트를 돌려준다 — defaultPrevented 를 관측하는 기준(AC-WEBACNAV-005)이 쓴다
function pressKey(key: string, init: KeyboardEventInit = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  input().dispatchEvent(ev)
  return ev
}

// 메시지 하나 만들기 — 실제 서버 페이로드 모양 (spec.md §3.1)
function msg(over: Record<string, unknown> = {}) {
  return {
    id: 1, room_id: 1, author_type: 'user', author_user_id: 1, author_bot_id: null,
    body: '본문', created_at: '2026-08-27 10:00:00', author_name: 'u', attachments: [],
    ...over,
  }
}

// 방 하나만 있는 기본 핸들러. 필요한 응답만 덮어쓴다.
function baseHandler(over: Record<string, unknown> = {}): Handler {
  return url => {
    for (const [k, v] of Object.entries(over)) if (url.startsWith(k)) return { data: v }
    if (url.startsWith('/api/rooms/1/messages')) return { data: { messages: [] } }
    if (url.startsWith('/api/rooms/2/messages')) return { data: { messages: [] } }
    if (/^\/api\/rooms\/[0-9]+\/bots/.test(url)) return { data: [] }
    if (url.startsWith('/api/rooms')) return { data: { active: [{ id: 1, name: '방1' }, { id: 2, name: '방2' }], archived: [] } }
    if (url.startsWith('/api/bots')) return { data: [] }
    return { data: {} }
  }
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  FakeEventSource.instances = []
})

// ── 모듈 신선도 — plan.md §F M2 단계 1 의 상시 관측 ──────────────────
// 캐시 무효화 쿼리 없이 같은 지정자를 두 번 적재하면 모듈 수준 state 가 새는지 본다.
// 새면 "구현이 틀렸다"로 오진되는 부류의 실패다.
describe('module freshness', () => {
  it('loads a fresh module instance per loadApp call', async () => {
    const first = await loadApp(baseHandler())
    ;(first.state as { touched?: boolean }).touched = true
    const second = await loadApp(baseHandler())
    expect((second.state as { touched?: boolean }).touched).toBeUndefined()
    expect(second).not.toBe(first)
  })
})

// ── AC-WEBCHAT-001 — 방을 열면 과거 대화가 실제로 그려진다 ──────────
describe('AC-WEBCHAT-001 openRoom renders history', () => {
  it('renders past messages when a room is opened', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/messages': { messages: [msg({ id: 1, body: '첫 줄' }), msg({ id: 2, body: '둘째 줄' })] },
    }))
    await app.openRoom(1)
    await flush()

    const bodies = $$('#messages .message .msg-body').map(n => n.textContent)
    expect(bodies).toEqual(['첫 줄', '둘째 줄'])
    expect(el('room-title').textContent).toBe('# 방1')
    expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
  })

  it('falls back to the room number when the room is not in state.rooms', async () => {
    // 방 목록에는 없는 방을 직접 연다 — # undefined 대신 방 번호가 보여야 한다 (plan.md §D 8번)
    const app = await loadApp(url => {
      if (url.startsWith('/api/rooms/9/messages')) return { data: { messages: [] } }
      if (/^\/api\/rooms\/[0-9]+\/bots/.test(url)) return { data: [] }
      if (url.startsWith('/api/rooms')) return { data: { active: [], archived: [] } }
      return { data: {} }
    })
    await app.openRoom(9)
    await flush()
    expect(el('room-title').textContent).toBe('# 9')
    expect(el('room-title').textContent).not.toContain('undefined')
  })
})

// ── AC-WEBCHAT-002 — 메시지 구조·작성자별 색·확장 훅 (세 테스트) ──────
describe('AC-WEBCHAT-002 message structure, bot colours, decoration hook', () => {
  it('builds the documented message structure and colours bots apart', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/messages': { messages: [
        msg({ id: 1, author_type: 'user', author_name: 'jw', body: '사람' }),
        msg({ id: 2, author_type: 'bot', author_bot_id: 1, author_name: 'pm', body: '봇1' }),
        msg({ id: 3, author_type: 'bot', author_bot_id: 2, author_name: 'qa', body: '봇2' }),
        msg({ id: 4, author_type: 'system', author_name: '시스템', body: '🔒 승인 요청' }),
      ] },
    }))
    await app.openRoom(1)
    await flush()

    expect($$('#messages .message.user').length).toBe(1)
    expect($$('#messages .message.bot').length).toBe(2)
    expect($$('#messages .message.system').length).toBe(1)

    // 구조: .message > .msg-head > (strong + span), .message > .msg-body
    const first = document.querySelector('#messages .message') as HTMLElement
    expect(first.querySelector('.msg-head > strong')!.textContent).toBe('jw')
    expect(first.querySelector('.msg-head > span')!.textContent).toContain('2026-08-27')
    expect(first.querySelector('.msg-body')!.textContent).toBe('사람')

    // 봇 이름 색은 author_bot_id 로 순환 배정된다 (bot-color-1..5)
    const names = $$('#messages .message.bot .msg-head > strong').map(n => (n as HTMLElement).className)
    expect(names[0]).toMatch(/\bbot-color-[1-5]\b/)
    expect(names[1]).toMatch(/\bbot-color-[1-5]\b/)
    expect(names[0]).not.toBe(names[1])   // 서로 다른 봇은 서로 다른 색
  })

  it('calls the registered decoration hook once per message, before append', async () => {
    // SPEC-WEBRICH-001 의 createRichContext({ api, doc }) 자리에 세우는 대역.
    // 팩토리가 방마다 새로 불리는지, decorate 가 (el, m) 로 정확히 한 번 불리는지를 본다.
    const seen: { el: Element; m: { id: number }; attachedWhenCalled: boolean }[] = []
    let factoryCalls = 0
    const factory = (deps: { api: unknown; doc: Document }) => {
      factoryCalls++
      expect(typeof deps.api).toBe('function')     // api 래퍼를 넘겨받는다
      expect(deps.doc).toBe(document)
      return {
        decorate(el: Element, m: { id: number }) {
          // 호출 시점에 요소는 아직 #messages 에 붙어 있지 않아야 한다
          seen.push({ el, m, attachedWhenCalled: !!el.parentElement })
          el.appendChild(document.createElement('figure'))   // 훅은 자손을 더할 수 있다
        },
      }
    }

    const app = await loadApp(baseHandler({
      '/api/rooms/1/messages': { messages: [msg({ id: 1, body: '가' }), msg({ id: 2, body: '나' })] },
    }), { decorator: factory })

    await app.openRoom(1)
    await flush()

    expect(factoryCalls).toBe(1)                       // 방을 열 때 컨텍스트를 만든다
    expect(seen.length).toBe(2)                        // 과거 메시지 둘 → 정확히 두 번
    expect(seen.map(s => s.m.id)).toEqual([1, 2])      // 인자 m 은 서버 페이로드 원본
    expect(seen.every(s => s.attachedWhenCalled === false)).toBe(true)  // 붙이기 '직전'
    expect(seen[0].el.classList.contains('message')).toBe(true)         // 인자 el 은 메시지 요소
    // 훅이 더한 자손이 화면에 남는다 — 훅을 부르고 나서 버리는 구현을 배제한다
    expect($$('#messages .message > figure').length).toBe(2)
    // 구조 세 요소는 훅이 있어도 그대로다
    expect($$('#messages .message > .msg-head > strong').length).toBe(2)
    expect($$('#messages .message > .msg-body').length).toBe(2)

    // SSE 로 온 메시지도 같은 경로를 지난다 — 과거 렌더에만 훅을 붙인 구현을 배제한다
    FakeEventSource.last().emit('message', msg({ id: 3, body: '다' }))
    await flush()
    expect(seen.map(s => s.m.id)).toEqual([1, 2, 3])

    // 방을 다시 열면 컨텍스트가 새로 만들어진다 (방 국소 상태가 넘어가지 않는다)
    await app.openRoom(2)
    await flush()
    expect(factoryCalls).toBe(2)
  })

  it('renders normally when no decoration hook is registered', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/messages': { messages: [msg({ id: 1, body: '훅 없음' })] },
    }))   // 등록하지 않는다
    await app.openRoom(1)
    await flush()

    expect($$('#messages .message').length).toBe(1)
    expect(document.querySelector('#messages .msg-body')!.textContent).toBe('훅 없음')
  })
})

// ── AC-WEBCHAT-003 — 사용자·봇 문자열이 마크업으로 해석되지 않는다 ────
describe('AC-WEBCHAT-003 no markup interpretation', () => {
  it('never interprets message or bot text as markup', async () => {
    const evil = '<img src=x onerror="window.__pwned=1"><b>굵게</b>'
    const app = await loadApp(baseHandler({
      '/api/rooms/1/messages': { messages: [msg({ id: 1, body: evil, author_name: evil })] },
      '/api/rooms/1/bots': [{ bot_id: 1, bot_name: '<script>window.__pwned=1</script>', online: true }],
    }))
    await app.openRoom(1)
    await flush()

    // 이 단언은 '첨부가 없는 메시지'(msg() 기본값 attachments: [])에 대한 것이다.
    // 첨부가 있으면 <img> 를 만드는 것이 SPEC-WEBRICH-001 의 옳은 동작이며, 이 테스트는 그 입력을 주지 않는다.
    expect(document.querySelectorAll('#messages img').length).toBe(0)
    expect(document.querySelectorAll('#messages b').length).toBe(0)
    expect(document.querySelectorAll('#room-bots script').length).toBe(0)
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()

    // 텍스트로는 그대로 보인다 — 삼켜 버리는 구현도 통과하면 안 된다
    expect(document.querySelector('#messages .msg-body')!.textContent).toBe(evil)
    expect(el('room-bots').textContent).toContain('<script>')
  })
})

// ── AC-WEBCHAT-004 — SSE 로 온 메시지가 화면에 붙는다 ────────────────
describe('AC-WEBCHAT-004 live message reception', () => {
  it('appends messages arriving over the event stream', async () => {
    const app = await loadApp(baseHandler({ '/api/rooms/1/messages': { messages: [msg({ id: 1, body: '과거' })] } }))
    await app.openRoom(1)
    await flush()
    expect($$('#messages .message').length).toBe(1)

    const es = FakeEventSource.last()
    expect(es.url).toBe('/api/rooms/1/events')

    es.emit('message', msg({ id: 2, author_type: 'bot', author_bot_id: 1, author_name: 'pm', body: '실시간' }))
    await flush()

    expect($$('#messages .message').length).toBe(2)
    expect(document.querySelectorAll('#messages .msg-body')[1].textContent).toBe('실시간')
  })
})

// ── AC-WEBCHAT-005 — 봇 상태가 칩에 반영된다 ────────────────────────
describe('AC-WEBCHAT-005 bot_status on chips', () => {
  it('reflects bot_status on the bot chip', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [{ bot_id: 3, bot_name: 'pm', online: true }],
    }))
    await app.openRoom(1)
    await flush()
    expect(el('room-bots').textContent).toContain('pm')
    expect(el('room-bots').textContent).not.toContain('입력 중')

    FakeEventSource.last().emit('bot_status', { bot_id: 3, state: 'working' })
    await flush()
    expect(el('room-bots').textContent).toContain('입력 중')

    FakeEventSource.last().emit('bot_status', { bot_id: 3, state: 'idle' })
    await flush()
    expect(el('room-bots').textContent).not.toContain('입력 중')
  })
})

// ── AC-WEBCHAT-006 — 5분 무응답이 가짜 타이머로 관측된다 ─────────────
describe('AC-WEBCHAT-006 stale after five minutes', () => {
  it('marks a bot stale after five minutes without idle', async () => {
    vi.useFakeTimers()
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [{ bot_id: 3, bot_name: 'pm', online: true }],
    }))
    await app.openRoom(1)
    await flush()

    FakeEventSource.last().emit('bot_status', { bot_id: 3, state: 'working' })
    await flush()
    expect(el('room-bots').textContent).toContain('입력 중')
    expect(el('room-bots').textContent).not.toContain('응답 없음')

    await vi.advanceTimersByTimeAsync(5 * 60_000)
    await flush()
    expect(el('room-bots').textContent).toContain('응답 없음')

    FakeEventSource.last().emit('bot_status', { bot_id: 3, state: 'idle' })
    await flush()
    expect(el('room-bots').textContent).not.toContain('응답 없음')
    expect(el('room-bots').textContent).not.toContain('입력 중')
  })
})

// ── AC-WEBCHAT-007 — 방을 떠나면 타이머와 스트림이 실제로 정리된다 ───
describe('AC-WEBCHAT-007 cleanup on room switch', () => {
  it('clears pending timers and closes the previous stream on room switch', async () => {
    vi.useFakeTimers()
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [{ bot_id: 3, bot_name: 'pm', online: true }],
    }))
    await app.openRoom(1)
    await flush()

    FakeEventSource.last().emit('bot_status', { bot_id: 3, state: 'working' })
    await flush()
    // 먼저 '걸렸다'를 관측한다 — 이 단언이 없으면 타이머를 아예 안 거는 구현이 통과한다
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(1)

    const first = FakeEventSource.last()
    await app.openRoom(2)
    await flush()

    expect(vi.getTimerCount()).toBe(0)
    expect(first.closed).toBe(true)
    expect(FakeEventSource.instances.length).toBe(2)
    expect(FakeEventSource.last().url).toBe('/api/rooms/2/events')
  })
})

// ── AC-WEBCHAT-008 — 재연결 뒤 놓친 메시지를 커서로 채운다 ───────────
describe('AC-WEBCHAT-008 reconnect backfill', () => {
  it('backfills missed messages with the after cursor on reconnect', async () => {
    const app = await loadApp(url => {
      if (url === '/api/rooms/1/messages') return { data: { messages: [msg({ id: 10, body: '과거' })] } }
      if (url === '/api/rooms/1/messages?after=11') return { data: { messages: [msg({ id: 12, body: '놓친 것' })] } }
      if (/^\/api\/rooms\/[0-9]+\/bots/.test(url)) return { data: [] }
      if (url.startsWith('/api/rooms')) return { data: { active: [{ id: 1, name: '방1' }], archived: [] } }
      return { data: {} }
    })
    await app.openRoom(1)
    await flush()

    const es = FakeEventSource.last()
    es.emit('message', msg({ id: 11, body: '실시간' }))
    await flush()
    expect($$('#messages .message').length).toBe(2)

    es.fail()
    es.reopen()
    await flush()

    expect(calls.some(c => c.url === '/api/rooms/1/messages?after=11')).toBe(true)
    const bodies = $$('#messages .msg-body').map(n => n.textContent)
    expect(bodies).toEqual(['과거', '실시간', '놓친 것'])   // 중복 없이 정확히 셋
  })
})

// ── AC-WEBCHAT-009 — 자동완성이 캐시만 읽는다 ────────────────────────
describe('AC-WEBCHAT-009 autocomplete reads cache only', () => {
  it('shows candidates from cache without one request per keystroke', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [
        { bot_id: 1, bot_name: 'pm', online: true },
        { bot_id: 2, bot_name: 'qa', online: false },
      ],
    }))
    await app.openRoom(1)
    await flush()

    const before = inviteGets()
    expect(before).toBeGreaterThanOrEqual(1)   // 방을 열 때는 실제로 한 번 받아 온다

    type('@'); await flush()
    type('@p'); await flush()
    type('@pm'); await flush()

    expect(inviteGets()).toBe(before)   // 타이핑으로 늘지 않는다
    expect(el('autocomplete').hasAttribute('hidden')).toBe(false)
    const items = $$('#autocomplete .ac-item').map(n => n.textContent ?? '')
    expect(items.length).toBeGreaterThan(0)
    expect(items.every(t => t.includes('pm'))).toBe(true)   // 'qa' 는 접두사가 안 맞아 걸러졌다

    type('그냥 텍스트'); await flush()
    expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
  })
})

// ── AC-WEBCHAT-010 — 삽입 문자열을 서버 파서가 그 봇으로 해석한다 ────
describe('AC-WEBCHAT-010 mention contract round-trip', () => {
  it('inserts a mention the real server parser resolves to that bot', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [{ bot_id: 1, bot_name: 'pm', online: true }],
    }))
    await app.openRoom(1)
    await flush()

    // TO 후보 선택
    type('@p'); await flush()
    const to = $$('#autocomplete .ac-item').find(n => (n.textContent ?? '').startsWith('TO')) as HTMLElement
    expect(to).toBeDefined()
    to.click(); await flush()

    const composed = input().value + '일정 정리해줘'
    expect(parseMentions(composed)).toEqual([{ bot: 'pm', delivery: 'to' }])

    // CC 후보 선택
    type('@p'); await flush()
    const cc = $$('#autocomplete .ac-item').find(n => (n.textContent ?? '').startsWith('CC')) as HTMLElement
    cc.click(); await flush()
    expect(parseMentions(input().value + '참고')).toEqual([{ bot: 'pm', delivery: 'cc' }])
  })
})

// ── AC-WEBCHAT-011 — 서버가 해석하지 못하는 이름은 완성해 주지 않는다 ─
describe('AC-WEBCHAT-011 unmentionable names excluded', () => {
  it('never offers a bot name the server parser cannot resolve', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [
        { bot_id: 1, bot_name: '코드 리뷰어', online: true },
        { bot_id: 2, bot_name: 'pm', online: true },
      ],
    }))
    await app.openRoom(1)
    await flush()

    type('@'); await flush()
    const selectable = $$('#autocomplete .ac-item')
      .filter(n => !(n as HTMLElement).classList.contains('disabled') && n.getAttribute('aria-disabled') !== 'true')
      .map(n => n.textContent ?? '')

    // 1) 불가 이름은 선택 가능한 후보에 없다
    expect(selectable.some(t => t.includes('코드 리뷰어'))).toBe(false)
    // 2) 정상 이름은 그대로 있다 — 전부 숨기는 구현을 배제한다
    expect(selectable.some(t => t.includes('pm'))).toBe(true)
    // 3) 배제 근거가 실제 파서와 같다 — 임의 규칙이 아님을 같은 테스트에서 못 박는다
    expect(parseMentions('@TO(코드 리뷰어) 봐줘')).toEqual([])
    expect(parseMentions('@TO(pm) 봐줘')).toEqual([{ bot: 'pm', delivery: 'to' }])
  })
})

// ── AC-WEBCHAT-012 — 드롭다운 열림 상태 Enter 미전송 ─────────────────
describe('AC-WEBCHAT-012 enter with open dropdown', () => {
  it('does not send while the autocomplete is open', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [{ bot_id: 1, bot_name: 'pm', online: true }],
    }))
    await app.openRoom(1)
    await flush()

    type('@p'); await flush()
    expect(el('autocomplete').hasAttribute('hidden')).toBe(false)

    pressEnter(); await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(0)

    // 드롭다운이 닫히면 Enter 는 정상 전송이어야 한다 — 전송을 통째로 막는 구현을 배제한다
    type('안녕하세요'); await flush()
    expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
    pressEnter(); await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(1)
  })
})

// ── 결함 D-6 (카드 t32) — 한글 조합 중 Enter 는 전송이 아니다 ────────
// 한글 조합 중 Enter 는 keydown 을 두 번 낳는다: ① 조합 확정용(isComposing=true)과
// ② 확정 뒤의 진짜 Enter. ① 을 전송으로 처리하면 조합 중 글자를 포함한 본문이 나간 뒤
// 입력창이 비워지고, 확정된 마지막 글자가 빈 칸에 들어가 ② 가 그 한 글자를 또 보낸다.
// 실측 재현: 방 DB id 58/59·60/61·81/82 — 각각 같은 초에 끝 글자 한 건이 더 올라갔다
// (evidence/D01-defect-register-silent.txt §22).
describe('D-6 enter during IME composition', () => {
  it('does not send while a composition is active, and sends once after it commits', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    type('아침에 커피를 두 잔 마셨다'); await flush()

    // ① 조합 확정용 keydown — 전송이 아니다
    input().dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', isComposing: true, bubbles: true, cancelable: true,
    }))
    await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(0)

    // ② 확정 뒤의 진짜 Enter — 여기서 정확히 한 번 나간다
    pressEnter(); await flush()
    const posts = calls.filter(c => c.method === 'POST')
    expect(posts.length).toBe(1)

    // 나간 본문이 문장 전체여야 한다 — 마지막 글자가 떨어져 나가지 않았다는 관측
    const sent = (posts[0].body as FormData).get('body')
    expect(sent).toBe('아침에 커피를 두 잔 마셨다')

    // 입력창은 비어 있다 — 조합 잔여가 남아 다음 Enter 에 또 나가지 않는다
    expect(input().value).toBe('')
  })

  it('does not send on a legacy keyCode 229 keydown (Safari-family IME)', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    type('주말엔 등산을 갈 계획이다'); await flush()

    input().dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', keyCode: 229, bubbles: true, cancelable: true,
    } as KeyboardEventInit))
    await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(0)
  })
})

// ── 결함 D-7 (카드 t32) — 웹에서 사람이 파일을 올릴 수 있어야 한다 ────
// index.html 은 `#file-input` 을 두었으나 어느 SPEC 도 그것을 여는 UI 와 전송 결합을
// 소유하지 않아, 사람이 방에 파일을 올릴 경로가 없었다(운영자 실측: 드래그앤드롭·메뉴 모두
// 실패, attachments 표 0행 — evidence/D01-defect-register-silent.txt §23).
// 서버는 이미 받는다: routes-messages.ts 의 `req.parts()` 는 `part.type === 'file'` 인
// 파트를 필드명과 무관하게 저장하고, 파일이 아닌 파트는 전부 body 로 이어 붙인다.
// 한 번의 change 로 파일 여러 개를 고른다. picker.files 는 읽기 전용이라 defineProperty 로 심는다.
// 문자열을 주면 그 이름의 File 을 만들고, File 을 그대로 주면 그 객체를 쓴다 — 같은 파일을 다시
// 고르는 상황(중복 제거 기준)을 재현하려면 같은 File 객체를 두 번 넘기면 된다.
// lastModified 를 고정하는 이유: 이름·크기·lastModified 세 값으로 같은 파일을 판정하므로
// 시각이 흔들리면 «같은 파일» 재선택이 재현되지 않는다.
function pickFiles(...specs: Array<string | File>) {
  const files = specs.map(s =>
    typeof s === 'string'
      ? new File([`내용-${s}`], s, { type: 'text/plain', lastModified: 1_700_000_000_000 })
      : s)
  const picker = document.getElementById('file-input') as HTMLInputElement
  Object.defineProperty(picker, 'files', { value: files, configurable: true })
  picker.dispatchEvent(new Event('change', { bubbles: true }))
  return files
}

function pickFile(name = 'note.txt', content = '자몽샐러드-7391') {
  return pickFiles(new File([content], name, { type: 'text/plain', lastModified: 1_700_000_000_000 }))[0]
}

// 화면에 그려진 첨부 칩의 이름들. 칩 안에는 이름 텍스트 노드와 ✕ 버튼이 함께 있으므로
// textContent 전체가 아니라 버튼의 aria-label 이 아닌 첫 텍스트 노드를 읽는다.
const chipNames = () => $$('#file-chosen .file-chip').map(c => (c.firstChild?.textContent ?? '').trim())

describe('D-7 attaching a file from the web composer', () => {
  it('sends the picked file as a file part alongside the body', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    pickFile()
    type('파일 하나 보냅니다'); await flush()
    pressEnter(); await flush()

    const posts = calls.filter(c => c.method === 'POST')
    expect(posts.length).toBe(1)
    const fd = posts[0].body as FormData
    // 서버는 필드명을 가리지 않으나, 파일 파트가 하나 실려야 한다
    const parts = [...fd.values()].filter(v => v instanceof File) as File[]
    expect(parts.length).toBe(1)
    expect(parts[0].name).toBe('note.txt')
    // 텍스트 파트는 하나뿐이어야 한다 — 서버가 파일 아닌 파트를 전부 body 로 이어 붙이므로
    // 둘이 되면 본문이 오염된다
    expect(fd.getAll('body')).toEqual(['파일 하나 보냅니다'])
  })

  it('sends a file with no text, and clears the picker after a successful send', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    pickFile('보고서.txt', '내용')
    pressEnter(); await flush()

    const posts = calls.filter(c => c.method === 'POST')
    expect(posts.length).toBe(1)
    const parts = [...(posts[0].body as FormData).values()].filter(v => v instanceof File) as File[]
    expect(parts[0].name).toBe('보고서.txt')

    // 전송 성공 뒤에는 선택이 비워져, 다음 Enter 에 같은 파일이 또 나가지 않는다
    expect((el('file-input') as HTMLInputElement).value).toBe('')
    expect(el('file-chosen').textContent).toBe('')
  })

  it('still sends nothing when there is neither text nor a file', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    pressEnter(); await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(0)
  })
})

// ── 첨부 여러 개 + 하나씩 빼기 (운영자 결정 2026-09-08) ─────────────────
// 브라우저의 input.files 는 항목 하나만 빼는 수단이 없다. 그래서 «보낼 목록» 을
// app.js 안의 배열이 소유하고, picker 는 고르는 창구로만 쓴다. 이 블록은 그 소유 이전이
// 실제로 관측되는지를 본다: 여러 개 고르기·두 번에 나눠 고르기·중복 방지·하나만 빼기.
describe('attach-multi — several files, remove one', () => {
  it('lets the file picker take several files at once', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    expect((el('file-input') as HTMLInputElement).hasAttribute('multiple')).toBe(true)
  })

  it('renders one chip per file picked in a single change', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    pickFiles('가.txt', '나.txt')
    expect(chipNames()).toEqual(['가.txt', '나.txt'])
  })

  it('accumulates across two changes and does not add the same file twice', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    const [first] = pickFiles('가.txt')
    pickFiles('나.txt')
    expect(chipNames()).toEqual(['가.txt', '나.txt'])

    // 같은 파일(이름·크기·lastModified 동일)을 다시 골라도 목록은 그대로다
    pickFiles(first)
    expect(chipNames()).toEqual(['가.txt', '나.txt'])
  })

  it('removes only the clicked file, and sends the remaining one', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    pickFiles('가.txt', '나.txt')
    const removes = $$('#file-chosen .file-chip-remove') as HTMLButtonElement[]
    expect(removes.length).toBe(2)
    removes[0].click()
    expect(chipNames()).toEqual(['나.txt'])

    pressEnter(); await flush()

    const posts = calls.filter(c => c.method === 'POST')
    expect(posts.length).toBe(1)
    const fd = posts[0].body as FormData
    const parts = [...fd.values()].filter(v => v instanceof File) as File[]
    expect(parts.map(f => f.name)).toEqual(['나.txt'])
    // 파일 아닌 파트를 서버가 전부 body 로 이어 붙이므로 텍스트 파트는 하나뿐이어야 한다
    expect(fd.getAll('body')).toEqual([''])
  })

  it('clears the chips after a successful send, so the next Enter sends nothing', async () => {
    const app = await loadApp(baseHandler())
    await app.openRoom(1)
    await flush()

    pickFiles('가.txt', '나.txt')
    pressEnter(); await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(1)
    expect(chipNames()).toEqual([])
    expect(el('file-chosen').textContent).toBe('')

    // 목록이 비었으니 본문 없는 두 번째 Enter 는 아무것도 보내지 않는다
    pressEnter(); await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(1)
  })

  it('keeps the chips when the send fails', async () => {
    const app = await loadApp((url, opts) =>
      opts.method === 'POST' && url === '/api/rooms/1/messages'
        ? { ok: false, status: 500, data: { error: '보내지 못했습니다' } }
        : baseHandler()(url, opts))
    await app.openRoom(1)
    await flush()

    pickFiles('가.txt', '나.txt')
    pressEnter(); await flush()

    expect(calls.filter(c => c.method === 'POST').length).toBe(1)
    // 실패하면 선택이 남아 다시 보내기로 그대로 나간다 (기존 D-7 규칙과 같은 방향)
    expect(chipNames()).toEqual(['가.txt', '나.txt'])
  })
})

// ── AC-WEBCHAT-013 — 전송은 한 번, 응답 미렌더, 실패 복원 ────────────
describe('AC-WEBCHAT-013 send once, no response render, restore on failure', () => {
  it('posts once, does not render the response, and restores on failure', async () => {
    const app = await loadApp(baseHandler({ '/api/rooms/1/messages': { messages: [] } }))
    await app.openRoom(1)
    await flush()
    expect($$('#messages .message').length).toBe(0)

    type('보낼 메시지'); await flush()
    ;(el('send-btn') as HTMLButtonElement).click()
    await flush()

    const posts = calls.filter(c => c.method === 'POST')
    expect(posts.length).toBe(1)
    expect(posts[0].url).toBe('/api/rooms/1/messages')
    expect(posts[0].body).toBeInstanceOf(FormData)
    expect((posts[0].body as FormData).get('body')).toBe('보낼 메시지')
    // 서버가 같은 메시지를 SSE 로도 보내므로 응답을 그리면 두 번 보인다
    expect($$('#messages .message').length).toBe(0)
    expect(input().value).toBe('')

    // 실패 경로 — 입력을 되살린다.
    // 핸들러는 'POST /api/rooms/1/messages' 하나만 실패시킨다. 방 목록·과거 메시지·초대 목록
    // 조회는 기본 핸들러가 그대로 성공시켜야, 실패가 '전송'에서 났다고 말할 수 있다.
    const app2 = await loadApp((url, opts) =>
      opts.method === 'POST' && url === '/api/rooms/1/messages'
        ? { ok: false, status: 409, data: { error: '보관된 방입니다' } }
        : baseHandler()(url, opts))
    await app2.openRoom(1); await flush()
    type('실패할 메시지'); await flush()
    ;(el('send-btn') as HTMLButtonElement).click()
    await flush()

    expect(input().value).toBe('실패할 메시지')            // 입력이 되살아난다
    expect($$('#messages .message').length).toBe(0)        // 실패한 메시지를 그리지 않는다
    expect(document.body.textContent).toContain('보관된 방입니다')   // 서버 오류 문구를 화면에 보여 준다
  })
})

// ── AC-WEBCHAT-014 — 늦은 응답이 다른 방 화면을 오염시키지 않는다 ────
describe('AC-WEBCHAT-014 late response isolation', () => {
  it('discards a late response that belongs to a room the user already left', async () => {
    let releaseRoom1: (v: unknown) => void = () => {}
    const slow = new Promise(r => { releaseRoom1 = r })

    const app = await loadApp(async url => {
      if (url.startsWith('/api/rooms/1/messages')) {
        await slow
        return { data: { messages: [msg({ id: 1, body: '방1 메시지' })] } }
      }
      if (url.startsWith('/api/rooms/2/messages')) return { data: { messages: [msg({ id: 2, body: '방2 메시지' })] } }
      if (/^\/api\/rooms\/[0-9]+\/bots/.test(url)) return { data: [] }
      if (url.startsWith('/api/rooms')) return { data: { active: [{ id: 1, name: '방1' }, { id: 2, name: '방2' }], archived: [] } }
      return { data: {} }
    })

    const p1 = app.openRoom(1)          // 응답 대기 상태로 둔다
    await flush()
    await app.openRoom(2)               // 그 사이 방 2 로 전환
    await flush()
    releaseRoom1({})                    // 이제 방 1 의 응답이 도착한다
    await p1
    await flush()

    const bodies = $$('#messages .msg-body').map(n => n.textContent)
    expect(bodies).toEqual(['방2 메시지'])
  })
})

// ── SPEC-WEBACNAV-001 — @ 멘션 헬퍼의 키보드 이동과 TO/CC 배지 ────────
// 여덟 it 은 acceptance.md 의 코드 그대로다. 빈 구현과 «전부 막기» 구현이 둘 다 떨어지도록
// AC-005 전반(닫힌 상태 통과)과 AC-004 후반(Esc 뒤 Enter 전송)이 짝을 이룬다.
const selectable = () => $$('#autocomplete .ac-item:not(.disabled)') as HTMLElement[]
const selected = () => $$('#autocomplete .ac-item.selected') as HTMLElement[]
const onePmBot = () => baseHandler({ '/api/rooms/1/bots': [{ bot_id: 1, bot_name: 'pm', online: true }] })

describe('SPEC-WEBACNAV-001 keyboard navigation and TO/CC badges', () => {
  // AC-WEBACNAV-001
  it('renders TO/CC badges with listbox roles and selects the first item', async () => {
    const app = await loadApp(onePmBot())
    await app.openRoom(1); await flush()

    type('@p'); await flush()
    expect(el('autocomplete').hasAttribute('hidden')).toBe(false)
    expect(el('autocomplete').getAttribute('role')).toBe('listbox')

    expect($$('#autocomplete .ac-item .ac-kind.to').length).toBe(1)
    expect($$('#autocomplete .ac-item .ac-kind.cc').length).toBe(1)

    const items = selectable()
    expect(items.length).toBe(2)
    expect(items.map(n => n.getAttribute('role'))).toEqual(['option', 'option'])
    expect(items.map(n => n.dataset.kind)).toEqual(['TO', 'CC'])
    // 배지가 맨 앞 — 기존 AC-WEBCHAT-010 의 startsWith('TO') 탐색이 그대로 맞는다
    expect(items.map(n => n.textContent)).toEqual(['TO pm', 'CC pm'])

    expect(items[0].classList.contains('selected')).toBe(true)
    expect(items[0].getAttribute('aria-selected')).toBe('true')
    expect(items[1].classList.contains('selected')).toBe(false)
    expect(items[1].getAttribute('aria-selected')).toBe('false')
  })

  // AC-WEBACNAV-002 (1/2)
  it('ArrowDown then Enter (or Tab) commits the selected CC candidate without sending', async () => {
    const app = await loadApp(onePmBot())
    await app.openRoom(1); await flush()

    type('@p'); await flush()
    pressKey('ArrowDown'); await flush()
    expect(selected()[0]?.dataset.kind).toBe('CC')
    pressEnter(); await flush()

    expect(input().value.endsWith('@CC(pm) ')).toBe(true)
    // 실제 서버 파서가 그 봇·그 전달 종류로 해석한다 — 문자열 비교로 대체하지 않는다
    expect(parseMentions(input().value + 'x')).toEqual([{ bot: 'pm', delivery: 'cc' }])
    expect(calls.filter(c => c.method === 'POST').length).toBe(0)
    expect(el('autocomplete').hasAttribute('hidden')).toBe(true)

    // Tab 도 같은 확정 경로다
    type('@p'); await flush()
    pressKey('ArrowDown'); await flush()
    const tab = pressKey('Tab'); await flush()
    expect(tab.defaultPrevented).toBe(true)
    expect(parseMentions(input().value + 'x')).toEqual([{ bot: 'pm', delivery: 'cc' }])
    expect(calls.filter(c => c.method === 'POST').length).toBe(0)
  })

  // AC-WEBACNAV-002 (2/2)
  it('Tab with no selectable candidate only closes the dropdown', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [{ bot_id: 1, bot_name: '코드 리뷰어', online: true }],
    }))
    await app.openRoom(1); await flush()

    type('@코'); await flush()
    expect(el('autocomplete').hasAttribute('hidden')).toBe(false)   // 열려는 있다
    expect($$('#autocomplete .ac-item.disabled').length).toBe(1)   // disabled 행 하나뿐
    expect(selectable().length).toBe(0)

    const tab = pressKey('Tab'); await flush()
    expect(tab.defaultPrevented).toBe(true)
    expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
    expect(input().value).toBe('@코')
    expect(calls.filter(c => c.method === 'POST').length).toBe(0)
  })

  // AC-WEBACNAV-003
  it('wraps the selection at both ends', async () => {
    const app = await loadApp(onePmBot())
    await app.openRoom(1); await flush()
    type('@p'); await flush()
    const items = selectable()
    expect(items.length).toBe(2)

    pressKey('ArrowUp'); await flush()          // 첫 → 마지막
    expect(selected()).toEqual([items[items.length - 1]])
    expect(items[items.length - 1].getAttribute('aria-selected')).toBe('true')

    pressKey('ArrowDown'); await flush()        // 마지막 → 첫
    expect(selected()).toEqual([items[0]])
    expect(items[0].getAttribute('aria-selected')).toBe('true')
    expect(items[1].getAttribute('aria-selected')).toBe('false')
  })

  // AC-WEBACNAV-004
  it('Escape hides the dropdown without touching the value; a following Enter sends normally', async () => {
    const app = await loadApp(onePmBot())
    await app.openRoom(1); await flush()
    type('@p'); await flush()
    expect(el('autocomplete').hasAttribute('hidden')).toBe(false)

    const esc = pressKey('Escape'); await flush()
    expect(esc.defaultPrevented).toBe(true)
    expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
    expect(input().value).toBe('@p')

    // AC-WEBCHAT-012 의 후반과 같은 뜻 — «전부 막기» 구현을 배제한다
    pressEnter(); await flush()
    expect(calls.filter(c => c.method === 'POST').length).toBe(1)
  })

  // AC-WEBACNAV-005
  it('does not intercept arrows/Tab/Escape when closed, nor while composing', async () => {
    const app = await loadApp(onePmBot())
    await app.openRoom(1); await flush()

    // 전반 — 닫힌 상태: 커서 이동·포커스 이동은 브라우저 몫
    type('그냥 텍스트'); await flush()
    expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
    expect(pressKey('ArrowDown').defaultPrevented).toBe(false)
    expect(pressKey('ArrowUp').defaultPrevented).toBe(false)
    expect(pressKey('Tab').defaultPrevented).toBe(false)
    expect(pressKey('Escape').defaultPrevented).toBe(false)

    // 후반 — 열린 상태의 조합 중 keydown: 새 분기도 preventDefault 앞에서 돌아간다
    type('@p'); await flush()
    const before = selected()[0]
    expect(before?.dataset.kind).toBe('TO')
    const composing = pressKey('ArrowDown', { isComposing: true }); await flush()
    expect(composing.defaultPrevented).toBe(false)
    expect(selected()).toEqual([before])
    const legacy = pressKey('ArrowDown', { keyCode: 229 } as KeyboardEventInit); await flush()
    expect(legacy.defaultPrevented).toBe(false)
    expect(selected()).toEqual([before])
  })

  // AC-WEBACNAV-006
  it('never selects a disabled row while cycling', async () => {
    const app = await loadApp(baseHandler({
      '/api/rooms/1/bots': [
        { bot_id: 1, bot_name: '코드 리뷰어', online: true },
        { bot_id: 2, bot_name: 'pm', online: true },
      ],
    }))
    await app.openRoom(1); await flush()
    type('@'); await flush()

    expect($$('#autocomplete .ac-item.disabled').length).toBe(1)   // disabled 행이 실제로 있다
    expect(selectable().length).toBe(2)

    const seen = new Set<string>()
    for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowUp']) {
      pressKey(key); await flush()
      const cur = selected()
      expect(cur.length).toBe(1)
      expect(cur[0].classList.contains('disabled')).toBe(false)
      expect(cur[0].getAttribute('aria-selected')).toBe('true')
      seen.add(cur[0].dataset.kind ?? '')
    }
    expect([...seen].sort()).toEqual(['CC', 'TO'])   // 두 선택 가능 항목을 실제로 오갔다
  })

  // AC-WEBACNAV-007
  it('mouseenter moves the selection to that item and Enter commits it', async () => {
    const app = await loadApp(onePmBot())
    await app.openRoom(1); await flush()
    type('@p'); await flush()
    const items = selectable()
    expect(selected()).toEqual([items[0]])

    items[1].dispatchEvent(new MouseEvent('mouseenter'))
    await flush()
    expect(selected()).toEqual([items[1]])
    expect(items[0].getAttribute('aria-selected')).toBe('false')
    expect(items[1].getAttribute('aria-selected')).toBe('true')

    pressEnter(); await flush()
    expect(parseMentions(input().value + 'x')).toEqual([{ bot: 'pm', delivery: 'cc' }])
  })
})
