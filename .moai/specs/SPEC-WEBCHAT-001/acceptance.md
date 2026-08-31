# SPEC-WEBCHAT-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md`, 그리고 이미 머지된 서버 소스다.** 두 문서와 서버 코드가 어긋나는 곳에서는 **코드가 이긴다** — `plan.md` §D 가 그 대조 결과다.

이 SPEC 은 `SPEC-WEBSHELL-001` 이 먼저 끝난 상태를 전제한다.

---

## 이 문서가 지키려는 것 — 빈 구현으로 통과하는 기준을 두지 않는다

이 저장소에는 **구현 본문이 비어 있어도 통과하는 수용 기준**이라는 결함 부류가 카드 `t2` 에서 세 번 재생산된 기록이 있다. 흔한 형태 넷이 있다.

1. **존재만 보는 기준** — "요소가 있다", "함수가 정의돼 있다". 빈 함수도 정의된다.
2. **이름 없이 통과만 보는 기준** — "테스트 스위트가 통과한다". 테스트를 하나도 안 쓴 실행도 종료 코드 `0` 이다.
3. **부재를 보는 기준** — "타이머가 안 남는다", "다른 방 메시지가 안 뜬다". 아무 일도 일어나지 않는 구현이 가장 잘 통과한다.
4. **깨진 구현과도 양립하는 관측** — 문자열이 `@TO(pm) ` 인지만 보는 기준은, 서버 파서가 그것을 해석하지 못하게 바뀌어도 그대로 통과한다.

**작성 후 부류 훑기.** 이 문서를 마치기 전에 기준 16개를 **하나씩이 아니라 부류로 한 번에** 다시 읽었다(`plan.md` §G 에 훑기 질문 셋과 결과를 기록). 하나씩 보면 같은 부류의 세 번째가 또 빠져나간다. 훑기에서 걸린 셋을 아래처럼 다시 썼다.

| 성질 | 걸린 형태 (금지) | 다시 쓴 형태 (채택) |
|------|-----------------|--------------------|
| 타이머 정리 | "방을 떠나면 타이머가 남지 않는다" | `working` 직후 대기 타이머가 **1개 이상**, 방 전환 뒤 **`0`** — 두 값 모두 관측 (AC-WEBCHAT-007) |
| 멘션 불가 이름 배제 | "그 이름이 후보에 없다" | 그 이름이 선택 가능한 후보에 **없고**, 동시에 **정상 이름은 있으며**, 동시에 그 이름으로 만든 문자열이 **실제 `parseMentions` 에서 0건**임 (AC-WEBCHAT-011) |
| 자동완성 계약 일치 | 입력창 값이 `'@TO(pm) '` 인지 문자열 비교 | 입력창 값을 **실제 `parseMentions` 에 넣어** `[{ bot: 'pm', delivery: 'to' }]` 인지 (AC-WEBCHAT-010) |
| 색 리터럴 부재 검사 | `grep` 이 일치 없음이면 통과 | `sed` 로 잘라낸 블록이 **비어 있지 않은 것을 먼저 확인**한 뒤 `grep` (AC-WEBCHAT-015) |

훑기 후, 기준 16개 가운데 빈 구현에서 통과하는 것은 남아 있지 않다.

**0.2.0 에서 두 번째 방향을 더했다.** 위 훑기는 전부 "빈 구현이 통과하는가"(방향 A) 한 방향이었고, 독립 감사는 그 주장이 사실임을 확인했다 — 세 SPEC 48개 기준 가운데 방향 A 적발 0건. 대신 반대 방향에서 열아홉 건이 나왔다: **"형제 SPEC 이 자기 요구사항대로 옳게 구현했을 때 내 기준이 실패하는가"**(방향 B). 그 부류는 정의상 자기 SPEC 안에서만 보면 보이지 않는다. 0.2.0 은 기준 열여섯 개를 **카드 전체를 놓고 두 방향으로** 다시 훑었고, 결과와 건수를 `plan.md` §E.2 에 표로 적었다.

---

## 공통 테스트 골격

아래 헬퍼는 `server/test/web-chat.test.ts` 상단에 한 번 둔다. **파일 첫 줄의 독블록이 이 파일만 jsdom 환경으로 돌린다.** 그것이 vitest 4 에서 듣지 않으면 `server/vitest.config.ts` 를 두는 것이 명시된 대체 경로이며(`spec.md` §6), 어느 쪽을 썼는지 `progress.md` 에 적는다.

> **0.2.0 에서 이 골격 전체를 다시 썼다.** 0.1.0 은 `app.js` 원문을 `window.eval('(function(){...})()')` 로 감싸 실행하는 클래식 스크립트 골격이었다. `web/app.js` 가 ES 모듈로 확정되면서(`SPEC-WEBSHELL-001` §4.8 계약 1 — plan-audit 교정 게이트의 오케스트레이터 결정) 그 골격은 `export` 토큰에서 `SyntaxError` 로 죽는다. 자동 기준 열다섯 개 전부가 첫 단언 전에 실행 불가가 되므로, 적재를 **동적 `import`** 로 교체했다.

```ts
// @vitest-environment jsdom
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
//       캐시 무효화 쿼리를 붙인다. 파일 URL 의 쿼리가 다르면 별개 모듈로 적재된다.
let loadSeq = 0
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
  const url = new URL(`../../web/app.js?t=${++loadSeq}`, import.meta.url).href
  const mod = (await import(/* @vite-ignore */ url)) as unknown as AppModule

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
```

**적재 실패는 환경 문제로 오진하기 쉬운 자리다.** `await import(...)` 가 실패하는 경우와 그 처리를 미리 적어 둔다.

| 증상 | 원인 | 처리 |
|------|------|------|
| `ERR_MODULE_NOT_FOUND` | `SPEC-WEBSHELL-001` 이 아직 `web/app.js` 를 만들지 않았다 | **블로커로 보고하고 중단한다.** 형제 파일을 임의로 만들지 않는다 (`plan.md` §F M1 단계 2) |
| `SyntaxError: Unexpected token 'export'` | 형제가 클래식 스크립트로 만들었다 | **블로커로 보고한다.** 계약 위반이며 형제 §4.8 계약 1·AC-WEBSHELL-004 가 그것을 막는다. 이 골격을 `eval` 로 되돌리지 않는다 |
| `mod.loadRooms is not a function` | 형제의 export 18개가 갖춰지지 않았다 | **블로커로 보고한다.** 형제 REQ-WEBSHELL-005 의 필수 표면이다 |
| 두 번째 테스트부터 상태가 샌다 | 캐시 무효화 쿼리가 빠졌다 | `?t=${++loadSeq}` 를 확인한다. `vi.resetModules()` 만으로는 파일 URL 로 적재된 모듈이 새로 만들어지지 않을 수 있다 |

**빈 구현이 이 골격에서 실패하는 경로.** `openRoom` 이 아무것도 하지 않으면 `#messages` 가 비어 있어 노드 수 단언이 실패한다. `EventSource` 를 열지 않으면 `FakeEventSource.instances` 가 비어 있어 이벤트를 주입할 대상이 없다. 자동완성이 아무것도 삽입하지 않으면 `parseMentions` 가 빈 배열을 돌려준다. 장식 훅을 부르지 않으면 AC-WEBCHAT-002 의 호출 횟수 단언이 `0` 으로 실패한다. **통과할 다른 길이 없다.**

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 | 판정 |
|----|----------|------|-------------|------|
| AC-WEBCHAT-001 | REQ-001, REQ-002 | `npm test -w server` | `openRoom(1)` 후 과거 메시지 2건이 실제 노드로 그려지고 제목이 `# 방1` | 자동 |
| AC-WEBCHAT-002 | REQ-003, REQ-016 | `npm test -w server` | `.message.<type>` 구조 3종 + 봇별 색 클래스 상이 + **장식 훅이 메시지당 정확히 1회 `(el, m)` 로 불리고, 훅이 없을 때는 렌더가 그대로 성립** | 자동 |
| AC-WEBCHAT-003 | REQ-004 | `npm test -w server` | 태그 문자열이 요소가 아닌 텍스트로 남고 `img`/`b`/`script` 노드 0개 | 자동 |
| AC-WEBCHAT-004 | REQ-005 | `npm test -w server` | SSE `message` 주입 후 노드 1개 증가, `EventSource` URL 이 규정 경로 | 자동 |
| AC-WEBCHAT-005 | REQ-006 | `npm test -w server` | `working` 후 칩에 `입력 중`, `idle` 후 사라짐 | 자동 |
| AC-WEBCHAT-006 | REQ-006 | `npm test -w server` | 가짜 타이머 5분 경과 후 칩에 `응답 없음`, `idle` 로 해제 | 자동 |
| AC-WEBCHAT-007 | REQ-007 | `npm test -w server` | 대기 타이머 **1개 이상 → `0`**, 이전 `EventSource.closed === true` | 자동 |
| AC-WEBCHAT-008 | REQ-008 | `npm test -w server` | 재연결 후 `?after=11` 호출이 실제로 나가고, 놓친 메시지가 중복 없이 채워짐 | 자동 |
| AC-WEBCHAT-009 | REQ-009 | `npm test -w server` | 후보가 뜨고, 타이핑 3회 동안 `/invites` 호출 증가분이 `0` | 자동 |
| AC-WEBCHAT-010 | REQ-010 | `npm test -w server` | 삽입된 문자열을 **실제 `parseMentions`** 가 `to`/`cc` 로 정확히 해석 | 자동 |
| AC-WEBCHAT-011 | REQ-011 | `npm test -w server` | 불가 이름은 선택 불가 + 정상 이름은 선택 가능 + 그 이름의 `parseMentions` 결과가 0건 | 자동 |
| AC-WEBCHAT-012 | REQ-012 | `npm test -w server` | 드롭다운 열림 상태 `Enter` → POST `0`회, 닫힌 상태 `Enter` → POST `1`회 | 자동 |
| AC-WEBCHAT-013 | REQ-013 | `npm test -w server` | POST 정확히 1회·`FormData.body` 일치·응답 렌더 0건, 실패 시 입력 복원 | 자동 |
| AC-WEBCHAT-014 | REQ-014 | `npm test -w server` | 늦게 도착한 방 1 응답이 방 2 화면에 그려지지 않고 방 2 것만 남음 | 자동 |
| AC-WEBCHAT-015 | REQ-015 | 아래 bash | `server`·`channel` diff 빈 출력(SHA 확인 후), `web` diff 3줄, 블록 내 색 리터럴 0건 | 자동 |
| AC-WEBCHAT-016 | REQ-003, REQ-015 (시각) | 아래 절차 | 디자인 DNA 대조 관측 5항목 | **MANUAL** |

**REQ-WEBCHAT-016(공유 표면)은 전용 기준을 두지 않는다 — 관측은 나뉘어 있다.** export 다섯 이름은 골격의 `AppModule` 타입과 모든 기준의 실제 호출이 관측한다(이름이 없으면 `TypeError` 로 죽는다). `state` 일곱 필드는 그것을 쓰는 기준들이 동작으로 관측한다 — 타이머(AC-007), 커서(AC-008), 캐시(AC-009), 세대(AC-014). 장식 훅의 등록·생성·호출은 AC-WEBCHAT-002 가 진다. **"필드가 선언돼 있다"만 보는 기준은 두지 않는다** — 그것이 이 문서가 금지하는 1번 부류다.

**REQ-WEBCHAT-001(마크업)도 전용 기준을 두지 않는다.** 위 기준들이 전부 실제 `index.html` 을 jsdom 에 넣고 그 안의 id 로 요소를 찾으므로, 열 요소 가운데 하나라도 없으면 해당 기준들이 곧바로 실패한다. 별도로 "요소가 있다"만 보는 기준을 두면 그것이 바로 위 1번 부류다.

---

## Given-When-Then 시나리오

### AC-WEBCHAT-001 — 방을 열면 과거 대화가 실제로 그려진다

**Given** 방 `1` 에 메시지 두 건이 저장돼 있다.
**When** `server/test/web-chat.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
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
```

**Then** 테스트가 통과한다.

`openRoom` 이 비어 있으면 `bodies` 가 `[]` 가 되어 첫 단언에서 실패한다. 순서를 뒤집는 구현도 `toEqual` 이 잡는다. 제목 단언은 `plan.md` §D 8번의 `# undefined` 를 막는다 — 방 이름을 찾는 경로가 실제로 도는지 본다.

### AC-WEBCHAT-002 — 메시지 구조·작성자별 색·확장 훅

**Given** 같은 방에 사용자·봇 둘·시스템 메시지가 있고, `SPEC-WEBRICH-001` 자리에 가짜 장식 팩토리를 등록한다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
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
```

**Then** 세 테스트가 모두 통과한다.

모든 봇에 같은 색을 주는 구현(원본 CSS 가 그렇다)은 첫 테스트 마지막 단언에서 실패한다. 구조를 다르게 짜면 자식 선택자 단언에서 실패한다 — `SPEC-WEBRICH-001` 이 이 구조에 첨부를 얹으므로 여기서 못 박는다.

**둘째 테스트가 이음매의 생산자 쪽 계약 전부를 진다** (감사 MF-5). 훅을 아예 부르지 않는 구현은 `seen.length` 가 `0` 이라 실패하고, 붙인 뒤에 부르는 구현은 `attachedWhenCalled` 가 `true` 라 실패하고, 방마다 컨텍스트를 새로 만들지 않는 구현은 `factoryCalls` 가 `1` 에 머물러 실패하고, SSE 경로에만 훅을 안 붙인 구현은 세 번째 id 가 빠져 실패한다. 셋째 테스트는 반대 방향이다 — **훅 없이도 렌더가 성립해야** 한다. 형제가 아직 아무것도 등록하지 않은 상태(이 SPEC 마감 시점)가 바로 그 경우이므로, 이 단언이 없으면 훅을 필수로 만든 구현이 형제 없이는 못 도는 채로 통과한다.

### AC-WEBCHAT-003 — 사용자·봇 문자열이 마크업으로 해석되지 않는다

**Given** 메시지 본문과 봇 이름에 HTML 태그 모양 문자열이 들어 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('never interprets message or bot text as markup', async () => {
  const evil = '<img src=x onerror="window.__pwned=1"><b>굵게</b>'
  const app = await loadApp(baseHandler({
    '/api/rooms/1/messages': { messages: [msg({ id: 1, body: evil, author_name: evil })] },
    '/api/rooms/1/invites': [{ bot_id: 1, bot_name: '<script>window.__pwned=1</script>', online: true }],
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
```

**Then** 테스트가 통과한다.

마지막 두 단언이 이 기준의 절반을 진다. 노드 수 `0` 만 보면 **본문을 통째로 버리는 구현도 통과한다** — 위 3번 부류다. 텍스트가 그대로 남아 있어야 실제로 `textContent` 로 넣었다는 뜻이 된다.

### AC-WEBCHAT-004 — SSE 로 온 메시지가 화면에 붙는다

**Given** 방 `1` 의 스트림이 열려 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
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
```

**Then** 테스트가 통과한다.

`addEventListener('message', ...)` 를 걸지 않은 구현은 두 번째 노드가 생기지 않아 실패한다. URL 단언은 다른 경로를 여는 구현을 잡는다.

### AC-WEBCHAT-005 — 봇 상태가 칩에 반영된다

**Given** 방 `1` 에 봇 `pm` 이 온라인으로 초대돼 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('reflects bot_status on the bot chip', async () => {
  const app = await loadApp(baseHandler({
    '/api/rooms/1/invites': [{ bot_id: 3, bot_name: 'pm', online: true }],
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
```

**Then** 테스트가 통과한다.

첫 두 단언(칩이 존재하고 아직 `입력 중` 이 아님)이 앞에 있어야 한다. 마지막 단언 하나만 보면 **`bot_status` 를 아예 안 듣는 구현이 통과한다** — `입력 중` 이 한 번도 뜬 적 없으므로.

### AC-WEBCHAT-006 — 5분 무응답이 가짜 타이머로 관측된다

**Given** 봇이 `working` 을 보낸 뒤 답이 없다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('marks a bot stale after five minutes without idle', async () => {
  vi.useFakeTimers()
  const app = await loadApp(baseHandler({
    '/api/rooms/1/invites': [{ bot_id: 3, bot_name: 'pm', online: true }],
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
```

**Then** 테스트가 통과한다.

**실제로 5분을 기다리지 않는다.** 임계값을 다르게 잡은 구현(1분, 10분)은 `advanceTimersByTimeAsync(300_000)` 시점에 표시가 없거나 이미 있어서 앞뒤 단언 가운데 하나에서 갈린다. `idle` 로 해제되지 않는 구현은 마지막 두 단언에서 실패한다.

### AC-WEBCHAT-007 — 방을 떠나면 타이머와 스트림이 실제로 정리된다

**Given** 방 `1` 에서 stale 타이머가 걸린 채로 방 `2` 로 전환한다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('clears pending timers and closes the previous stream on room switch', async () => {
  vi.useFakeTimers()
  const app = await loadApp(baseHandler({
    '/api/rooms/1/invites': [{ bot_id: 3, bot_name: 'pm', online: true }],
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
```

**Then** 테스트가 통과한다 — 대기 타이머가 **`1` 이상이었다가 `0`** 이 되고, 이전 스트림이 닫힌다.

앞의 `toBeGreaterThanOrEqual(1)` 이 이 기준의 절반이다. `toBe(0)` 하나만 보면 타이머를 한 번도 안 거는 구현이 가장 잘 통과한다 (`plan.md` §D 6번, §G 훑기 1번).

### AC-WEBCHAT-008 — 재연결 뒤 놓친 메시지를 커서로 채운다

**Given** 스트림이 끊겼다가 다시 붙는다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('backfills missed messages with the after cursor on reconnect', async () => {
  const app = await loadApp(url => {
    if (url === '/api/rooms/1/messages') return { data: { messages: [msg({ id: 10, body: '과거' })] } }
    if (url === '/api/rooms/1/messages?after=11') return { data: { messages: [msg({ id: 12, body: '놓친 것' })] } }
    if (url.includes('/invites')) return { data: [] }
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
```

**Then** 테스트가 통과한다.

`?after=` 호출을 아예 안 하는 구현(원본 코드가 그렇다)은 첫 단언에서 실패한다. 커서를 갱신하지 않아 `?after=10` 을 부르는 구현은 서버가 `11` 을 다시 주므로 `bodies` 에 `'실시간'` 이 두 번 나와 마지막 단언에서 실패한다 — **중복 렌더가 마지막 단언에 잡히는 것이 요점이다.**

### AC-WEBCHAT-009 — 자동완성이 캐시만 읽는다

**Given** 방 `1` 에 봇 둘이 초대돼 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('shows candidates from cache without one request per keystroke', async () => {
  const app = await loadApp(baseHandler({
    '/api/rooms/1/invites': [
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
```

**Then** 테스트가 통과한다.

`before >= 1` 을 먼저 관측한다 — 목록을 한 번도 안 받아 오는 구현은 "타이핑으로 늘지 않는다"를 자동으로 만족하기 때문이다. 접두사 필터 단언이 없으면 전체 목록을 늘 보여 주는 구현이 통과한다.

### AC-WEBCHAT-010 — 삽입된 문자열을 서버 파서가 그 봇으로 해석한다 (계약 일치)

**Given** 자동완성 후보에서 `pm` 을 고른다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('inserts a mention the real server parser resolves to that bot', async () => {
  const app = await loadApp(baseHandler({
    '/api/rooms/1/invites': [{ bot_id: 1, bot_name: 'pm', online: true }],
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
```

**Then** 테스트가 통과한다 — 삽입된 문자열이 **실제 `server/src/mention.ts` 의 파서**를 통과해 그 봇, 그 전달 종류로 해석된다.

**이 기준이 이 SPEC 에서 가장 무겁다.** `parseMentions` 를 import 하지 않고 `expect(input().value).toBe('@TO(pm) ')` 로 대체하면, 서버 정규식이 바뀌었을 때 이 기준은 그대로 통과하면서 실제 시스템은 조용히 깨진다 (`plan.md` §D 1번, §G 훑기 3번). 뒤에 텍스트를 이어 붙여 검사하는 것도 의도적이다 — 문자열 끝에서만 맞고 중간에서 깨지는 형식을 잡는다.

### AC-WEBCHAT-011 — 서버가 해석하지 못하는 이름은 완성해 주지 않는다

**Given** 방에 `코드 리뷰어`(공백 포함)와 `pm` 두 봇이 초대돼 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('never offers a bot name the server parser cannot resolve', async () => {
  const app = await loadApp(baseHandler({
    '/api/rooms/1/invites': [
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
```

**Then** 테스트가 통과한다.

관측 세 개가 함께 있어야 한다. 1번만 보면 후보를 하나도 안 그리는 구현이 통과하고(3번 부류), 3번만 보면 UI 를 전혀 안 고친 구현이 통과한다. 셋이 함께일 때만 "UI 가 실제 파서 문법을 따라 걸렀다"가 성립한다 (`plan.md` §D 1번, §G 훑기 1번).

### AC-WEBCHAT-012 — 자동완성이 열린 채로 Enter 를 눌러도 전송되지 않는다

**Given** `@p` 까지 입력해 드롭다운이 열려 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('does not send while the autocomplete is open', async () => {
  const app = await loadApp(baseHandler({
    '/api/rooms/1/invites': [{ bot_id: 1, bot_name: 'pm', online: true }],
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
```

**Then** 테스트가 통과한다.

후반부가 없으면 `Enter` 핸들러를 통째로 지운 구현이 통과한다. 원본 코드는 전반부에서 실패한다 — 드롭다운 상태를 보지 않고 곧바로 보낸다 (`plan.md` §D 3번).

### AC-WEBCHAT-013 — 전송은 한 번, 응답은 그리지 않으며, 실패하면 복원한다

**Given** 입력창에 본문이 있다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
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
```

**Then** 테스트가 통과한다.

마지막 단언이 `alert` 를 배제한다 — `alert` 로 알리는 구현은 문구가 문서 어디에도 남지 않아 실패하고, jsdom 에서는 그 전에 예외로 죽는다 (`plan.md` §D 9번). 오류를 통째로 삼키는 구현도 같은 단언에서 걸린다. `expect(input().value)` 하나만 보면, 전송을 아예 시도하지 않아 입력이 그대로 남은 구현이 통과한다 — 앞의 성공 경로가 POST 를 정확히 한 번 관측하므로 그 길은 막혀 있다.

### AC-WEBCHAT-014 — 늦게 도착한 응답이 다른 방 화면을 오염시키지 않는다

**Given** 방 `1` 의 메시지 응답이 느리고, 그 사이 사용자가 방 `2` 로 전환한다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('discards a late response that belongs to a room the user already left', async () => {
  let releaseRoom1: (v: unknown) => void = () => {}
  const slow = new Promise(r => { releaseRoom1 = r })

  const app = await loadApp(async url => {
    if (url.startsWith('/api/rooms/1/messages')) {
      await slow
      return { data: { messages: [msg({ id: 1, body: '방1 메시지' })] } }
    }
    if (url.startsWith('/api/rooms/2/messages')) return { data: { messages: [msg({ id: 2, body: '방2 메시지' })] } }
    if (url.includes('/invites')) return { data: [] }
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
```

**Then** 테스트가 통과한다 — 늦게 온 방 `1` 의 메시지가 화면에 **하나도** 없고, 방 `2` 의 것만 남는다.

`toEqual(['방2 메시지'])` 는 두 방향을 동시에 본다. "방 1 이 없다"만 단언하면 아무것도 안 그리는 구현이 통과하고(3번 부류), "방 2 가 있다"만 단언하면 원본 코드도 통과한다 — 원본은 둘 다 그린다 (`plan.md` §D 5번).

### AC-WEBCHAT-015 — 범위 경계와 디자인 토큰

**Given** 구현이 끝났다.
**When** 다음 명령을 순서대로 실행한다.

```bash
SHA=$(cat .moai/specs/SPEC-WEBCHAT-001/.spec-base-sha)
git rev-parse --verify "$SHA^{commit}"                       # 1
git diff --name-only "$SHA" -- server channel; echo "exit=$?" # 2
git diff --name-only "$SHA" -- web                            # 3
sed -n '/SPEC-WEBCHAT-001 채팅 영역/,$p' web/style.css | wc -l # 4
sed -n '/SPEC-WEBCHAT-001 채팅 영역/,$p' web/style.css | grep -nE '#[0-9a-fA-F]{3,8}\b'   # 5
```

**Then** 다섯 관측이 모두 성립한다.

1. 첫 명령이 종료 코드 `0` 으로 40자리 SHA 를 출력한다. **여기서 실패하면 아래 관측은 전부 무의미하다** — 기준 SHA 가 없어도 `git diff` 의 표준 출력은 비어 있기 때문이다.
2. 둘째 명령이 종료 코드 `0` 이면서 출력이 **비어 있다** — `server/` 와 `channel/` 을 한 줄도 고치지 않았다 (REQ-WEBCHAT-015).
3. 셋째 명령의 출력이 정확히 `web/app.js`, `web/index.html`, `web/style.css` 세 줄이다. `web/design-tokens.css` 가 있으면 실패다.
4. 넷째 명령이 **`1` 보다 큰 수**를 출력한다 — 마커 주석이 실제로 있고 그 뒤에 규칙이 있다는 뜻이다. `0` 이면 마커가 없는 것이고, 그 경우 다섯째 관측은 빈 입력에 대한 검사라 아무 의미가 없다.
5. 다섯째 명령이 **일치 없음**(종료 코드 `1`)으로 끝난다 — 채팅 블록 안에 16진수 색 리터럴이 없다 (`plan.md` §D 10번).

4번이 5번을 떠받친다. 5번만 단독으로 보면 마커를 안 쓴 구현, 블록을 아예 안 쓴 구현이 모두 통과한다 (§G 훑기 2번).

**2번 관측의 허용 예외 — 정확히 이 넷뿐이다.** 테스트 파일 추가와 `jsdom` 개발 의존성 때문에 `server` 경로 아래가 불가피하게 바뀐다(`plan.md` §C).

| 허용 파일 | 이유 |
|-----------|------|
| `server/test/web-chat.test.ts` | 이 SPEC 의 테스트 |
| `server/package.json` | `jsdom` devDependency 추가 |
| `package-lock.json` (저장소 루트) | `npm install -D` 이 반드시 바꾼다 |
| `server/vitest.config.ts` | **도크블록이 듣지 않을 때만.** 형제 `SPEC-WEBSHELL-001` 의 허용 집합에도 있다. 만들었으면 그 사실과 이유를 `progress.md` 에 적고, 안 만들었으면 이 파일은 존재하지 않아야 한다 |

예외를 이 넷 너머로 늘리지 않는다. **`server/src` 아래는 한 줄도 바뀌지 않아야 하며**, 그것을 `git diff --name-only "$SHA" -- server/src` 가 빈 출력인지로 따로 확인한다(그 명령의 SHA 유효성은 1번 관측이 이미 보장한다).

### AC-WEBCHAT-016 — [MANUAL] 디자인 DNA 시각 대조

> **이 기준은 사람이 화면을 봐야 한다.** 자동 검사가 아니며, 자동인 척 기록해서도 안 된다. 통과 여부는 아래 다섯 관측을 실제로 보고 판정한다.

**Given** `npm run dev -w server` 로 서버를 띄우고 브라우저에서 방 하나를 열었다. 그 방에는 사용자 메시지, 서로 다른 봇 둘의 메시지, system 메시지가 각각 하나 이상 있고, 봇 하나는 온라인·하나는 오프라인이다.

**When** 화면을 `.moai/project/design-dna-discord.md` 와 나란히 놓고 본다.

**Then** 다섯 관측이 모두 성립한다. 각 항목은 반증 가능하다 — "아니오"라고 답할 수 있는 형태로 적었다.

| # | 관측 | 반증되는 경우 |
|---|------|--------------|
| 1 | 채팅 영역 배경이 사이드바보다 **밝다** (DNA §1 의 4단 레이어: `#313338` > `#2b2d31`) | 두 영역의 배경이 같거나 채팅 쪽이 더 어둡다 |
| 2 | 서로 다른 두 봇의 **이름 색이 서로 다르고**, 둘 다 사용자 이름 색과도 다르다 (DNA §1 역할 색상) | 봇 이름이 전부 같은 색이거나 사용자와 같은 색이다 |
| 3 | 타임스탬프가 본문보다 **작고 흐리다** (DNA §2: 12px, `#949ba4`) | 타임스탬프가 본문과 같은 크기·같은 밝기다 |
| 4 | 입력창이 **둥근 사각형**(약 8px)이고 배경이 채팅 영역보다 밝다 (DNA §4 `--md-radius-input`, `--md-bg-input`) | 각진 사각형이거나 배경이 채팅 영역과 같다 |
| 5 | 오프라인 봇 칩이 온라인 칩보다 **흐리게** 보이고 둘의 아이콘이 다르다 (`⚪` / `🟢`) | 두 칩이 같아 보인다 |

관측 결과는 `progress.md` `§E.2` 에 **항목별로** 적는다. "확인함" 한 줄은 기록이 아니다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 방 이름을 `state.rooms` 에서 못 찾음 | `# undefined` 대신 방 번호를 보여 준다 | AC-WEBCHAT-001 이 정상 경로를 관측. 대체 경로는 run 단계에서 확인하고 `progress.md` 에 기록 |
| `created_at` 이 없거나 빈 문자열 | 시각 자리를 비워 두고 예외를 내지 않는다 | `renderMessage` 가 `?? ''` 로 흡수. 원본 그대로 |
| 시각이 UTC 문자열 그대로 보임 | 수용. 지역 시간 변환은 범위 밖(`spec.md` §5) | — |
| 봇 이름이 여섯 개 이상 | 색이 다섯 개를 순환해 재사용된다 | AC-WEBCHAT-002 는 두 봇만 본다. 순환은 수용된 설계 |
| `@` 만 치고 아무것도 안 침 | 접두사가 빈 문자열이라 그 방 봇 전부가 후보로 뜬다 | AC-WEBCHAT-009 의 첫 `type('@')` 이 그 경우다 |
| 초대된 봇이 하나도 없음 | `@` 를 쳐도 드롭다운이 뜨지 않는다 | AC-WEBCHAT-009 의 마지막 단언과 같은 경로 |
| 초대된 봇 전부가 멘션 불가 이름 | 드롭다운이 뜨지 않거나 전부 선택 불가로 뜬다. 어느 쪽이든 깨진 멘션은 만들어지지 않는다 | AC-WEBCHAT-011 관측 1 |
| 같은 봇을 `@TO` 와 `@CC` 로 함께 멘션 | 서버가 중복 제거하지 않고 `message_targets` 에 두 행을 만든다(`routes-messages.ts` 주석). UI 는 막지 않는다 | 범위 밖. 서버가 이미 정한 동작이다 |
| 미초대 봇 이름을 손으로 타이핑 | 서버가 `400` 과 `"… 봇은 이 방에 초대되지 않았습니다"` 를 낸다. UI 는 그 메시지를 보여 주고 입력을 복원한다 | AC-WEBCHAT-013 의 실패 경로와 같은 처리 |
| 권한 요청 system 메시지 | `.message.system` 으로 텍스트가 그대로 보인다. yes/no 버튼은 없다 | AC-WEBCHAT-002 가 `system` 클래스를 관측. 버튼은 `SPEC-WEBRICH-001` |
| 첨부가 있는 메시지 | 장식 훅이 등록돼 있지 않은 동안에는 본문만 보인다. 훅이 등록되면 그 훅이 첨부 노드를 더한다 | 훅 미등록 경로는 AC-WEBCHAT-002 셋째 테스트, 등록 경로는 둘째 테스트. 첨부 노드의 내용 자체는 `SPEC-WEBRICH-001` |
| 장식 훅이 예외를 던짐 | 삼키지 않는다. 렌더가 그 자리에서 실패한다 | `spec.md` REQ-WEBCHAT-003 확장 훅 표. 조용한 실패보다 드러나는 편이 낫다 |
| 보관된 방을 열어 전송 시도 | 서버가 `409` 를 낸다. UI 는 오류를 보여 주고 복원한다 | AC-WEBCHAT-013 실패 경로 |
| 스트림이 여러 번 끊겼다 붙음 | 붙을 때마다 그 시점의 커서로 백필한다. 커서가 계속 오르므로 중복되지 않는다 | AC-WEBCHAT-008 이 한 번의 왕복을 관측. 반복은 같은 경로 |
| 메시지가 200건을 넘는 방 | 서버가 최대 200건만 준다. 과거 방향 페이지네이션은 없다 | 범위 밖 (`spec.md` §5) |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (선행 SPEC 분 + 이 SPEC 추가분) | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`). `app.js` 의 채팅 블록이 렌더·수신·자동완성·전송 네 덩어리로 읽힌다 | 리뷰 |
| Unified | 색은 `web/design-tokens.css` 변수로만. 새 런타임 의존성 없음 | AC-WEBCHAT-015 |
| Secured | 사용자·봇 문자열이 `textContent` 로만 들어간다. 자동완성이 서버가 해석 못 하는 멘션을 만들지 않는다 | AC-WEBCHAT-003, AC-WEBCHAT-010, AC-WEBCHAT-011 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-WEBCHAT-001 부터 AC-WEBCHAT-015 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] AC-WEBCHAT-016(MANUAL)의 관측 다섯 항목이 **항목별로** `progress.md` `§E.2` 에 기록됨. "확인함" 한 줄은 기록으로 인정하지 않음
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm test -w server -- --run --reporter=verbose` 출력에 `web-chat.test.ts` 가 나타나고, 요약 줄의 `skipped`·`todo` 가 **0** 이다. 테스트 파일이 없거나 `it` 이 `.skip` 이면 종료 코드는 `0` 이어도 GREEN 이 아니다 (`plan.md` §E.3 횡단 적발)
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `jsdom` 이 `server` 워크스페이스 `devDependencies` 에 있고 `node -e "require.resolve('jsdom')"` 이 종료 코드 `0`
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-WEBCHAT-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함. **빈 출력만으로 아래 diff 검사를 통과 처리하지 않음**
- [ ] 그 SHA 로 실행한 `git diff --name-only <SHA> -- server/src channel` 이 종료 코드 `0` 이고 출력이 비어 있음
- [ ] 같은 SHA 로 실행한 `git diff --name-only <SHA> -- web` 이 `web/app.js` + `web/index.html` + `web/style.css` 세 줄임
- [ ] `web/style.css` 의 채팅 블록에 16진수 색 리터럴이 없음. **마커 뒤 줄 수가 `1` 보다 큰 것을 먼저 확인함**
- [ ] `renderMessage` 가 `SPEC-WEBRICH-001` 이 확장할 수 있는 형태로 남아 있음 — `.message > .msg-head + .msg-body` 구조와 함수 이름이 `spec.md` REQ-WEBCHAT-003 과 일치
- [ ] **이음매가 선언대로 구현됨** — `registerMessageDecorator(factory)` 가 export 되고, `openRoom` 이 방마다 `factory({ api, doc })` 를 새로 부르며, `renderMessage` 가 `#messages` 에 붙이기 **직전에** `decorate(el, m)` 를 메시지당 한 번 부르고, **등록이 없으면 아무것도 부르지 않음** (AC-WEBCHAT-002)
- [ ] **배선 한 줄은 이 SPEC 의 산출물이 아님을 확인함** — `web/app.js` 에 `registerMessageDecorator(` 가 **정의 하나뿐**(`grep -c "registerMessageDecorator(" web/app.js` 가 `1`)이고, 이 SPEC 은 `createRichContext` 를 import 하지도 부르지도 않음. 그 줄은 `SPEC-WEBRICH-001` 이 더하고 `AC-WEBRICH-016` 관측 4가 관측한다 (`spec.md` §4.6 「배선 계약」)
- [ ] **`state` 일곱 필드를 이 SPEC 이 스스로 초기화함** — `sse`·`workingBots`·`staleTimers`·`staleBots`·`lastEventId`·`roomBots`·`roomGeneration` 이 `initChat()` 안에서 만들어지고, 형제 `state` 리터럴의 세 필드(`rooms`·`bots`·`currentRoomId`)는 손대지 않음 (`spec.md` REQ-WEBCHAT-016)
- [ ] `web/app.js` 의 export 에 필수 18개가 그대로 있고 이 SPEC 이 더한 다섯(`initChat`·`renderMessage`·`sendMessage`·`refreshRoomBots`·`registerMessageDecorator`)이 있음. 형제 함수 아홉의 본문에 `fetch`/`api()` 호출을 더하지 않음
- [ ] `#chat` 요소와 형제의 영속 id 24개가 그대로 있음. `#placeholder` 는 제거했거나 `hidden` 이며, 어느 쪽인지 `progress.md` 에 기록됨
- [ ] 디자인 토큰 로딩을 `grep -q "design-tokens.css" web/style.css` 로 확인함 (`index.html` 이 아님 — 옳은 구현에서 그 문자열은 `index.html` 에 없다). `index.html` 에 토큰 `<link>` 를 더하지 않음
- [ ] `#invite-btn` 과 `#file-input` 이 존재하고, 이 SPEC 은 그 둘에 동작을 붙이지 않음 (`SPEC-WEBRICH-001` 의 자리)
- [ ] jsdom 환경을 도크블록으로 얻었는지 `server/vitest.config.ts` 로 얻었는지 `progress.md` 에 기록됨
- [ ] `server/src`, `channel/`, `web/design-tokens.css` 어디에도 이 SPEC 의 변경이 없음 (AC-WEBCHAT-015 의 허용 예외 네 파일 제외)
- [ ] 커밋 4개 (`feat: chat area markup for the web UI`, `feat: chat rendering and live SSE reception`, `feat: mention autocomplete and message sending`, `feat: chat view styling from design tokens`)
