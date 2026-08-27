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

// 초대 목록 GET 호출만 센다. POST /api/rooms/:id/invites 는 SPEC-WEBRICH-001 의
// 초대 발급이므로 형제가 자기 SPEC 대로 구현해도 이 계수가 흔들리지 않아야 한다.
const inviteGets = () => calls.filter(c => c.method === 'GET' && c.url.includes('/invites')).length

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
    if (url.includes('/invites')) return { data: [] }
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
})
