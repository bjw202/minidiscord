# SPEC-WEBSHELL-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

**규범 근거는 `plan-v2.md` 와 `.moai/project/design-dna-discord.md` 뿐이다.** 서버 API 의 실제 모양은 이미 머지된 `server/src/` 코드가 진다 — 원본 문서와 어긋나면 코드가 이긴다(`plan.md` §D).

이 SPEC 은 `SPEC-CORE-001`·`SPEC-AUTH-001`·`SPEC-ROOM-001` 이 먼저 끝난 상태를 전제한다.

---

## 이 문서가 지키려는 것 — 빈 구현으로 통과하는 기준을 두지 않는다

이 저장소에는 같은 결함 부류가 반복 재생산된 기록이 있다. **구현 본문이 비어 있어도 통과하는 수용 기준**이다. 흔한 형태 셋이 있다.

1. **존재만 보는 기준** — "파일이 있다", "함수가 export 돼 있다". 빈 함수도 export 된다.
2. **이름 없이 통과만 보는 기준** — "테스트 스위트가 통과한다". 테스트를 하나도 안 쓴 실행도 종료 코드 `0` 이다.
3. **부재를 보는 기준** — "원시 색상이 없다", "API 를 가리지 않는다". 아무 일도 일어나지 않는 구현이 가장 잘 통과한다.

**이 SPEC 에서 세 번째가 특히 위험하다.** 이 SPEC 의 성질 상당수가 정확히 그 모양이기 때문이다 — CSS 에 원시 색값이 없다, HTML 에 중복 `id` 가 없다, 정적 서빙이 API 를 가리지 않는다. 셋 다 **빈 파일이 가장 잘 통과한다.** 그래서 전부 존재 단언과 짝지었다.

| 성질 | 부재로 쓴 기준 (금지) | 존재로 짝지은 기준 (채택) |
|------|----------------------|--------------------------|
| CSS 토큰 준수 | "원시 16진 색값이 0건" | 그것 **더하기** `@import` 존재 + 첫 선택자보다 앞 + `var(--md-` 12곳 이상 (AC-005) |
| HTML `id` 위생 | "중복 `id` 가 없다" | 그것 **더하기** 영속 `id` 24개 전부 존재 (AC-003) + `#placeholder` 존재 (AC-015 관측 5) |
| API 비가림 | "`/api/nope` 가 HTML 이 아니다" | 그것 **더하기** 같은 테스트에서 `GET /` 가 HTML 을 준다 (AC-002) |
| `401` 처리 | "`401` 이면 던진다" | 비-`/auth/` 경로는 `showAuth` 효과 **있음**, `/auth/` 경로는 그 효과 **없음** — 두 방향 (AC-008) |

**작성 후 전수 훑기 — 두 방향, 두 번.** 이 문서는 훑기를 두 차례 거쳤다.

- **0.1.0 (자기 SPEC 범위)** — 열여섯 기준을 한 부류로 묶어 읽고 물었다: "본문이 비어 있는 구현에서도 통과하는가?"(초안 아홉 건 적발, 짝 단언으로 교정) 와 "완전히 옳은 구현이 실패하는가?"(적발 0건이라고 적었다). 표 전문은 `plan.md` §E.1.
- **0.2.0 (카드 전체 범위)** — 독립 감사가 두 번째 방향에서 **3건**을 잡았다(AC-003·AC-006·AC-015). 0.1.0 의 "적발 0건"은 **틀렸다** — 질문을 *자기 SPEC 안에서만* 물었기 때문이다. 형제 SPEC 이 자기 요구사항대로 옳게 구현했을 때 이 SPEC 의 기준이 실패하는 자리는 자기 SPEC 안에서는 원리적으로 보이지 않는다. 그래서 질문을 바꿔 다시 훑었다: **"이 기준이, 형제 SPEC 이 자기 요구사항대로 옳게 구현했을 때 실패하는가?"** 결과 표 전문은 `plan.md` §E.2.

**두 번째 방향의 교정 원칙은 하나다 — 소유한 것만 단언하고, 소유하지 않은 것에는 침묵한다.** 그리고 시점에 따라 참·거짓이 뒤집히는 성질(형제 필드의 부재, `#placeholder` 의 존재)은 영구 테스트가 아니라 **이 SPEC 마감 시점 명령**(AC-015)에 둔다.

**사람 눈이 필요한 기준 하나는 MANUAL 로 명시한다.** AC-WEBSHELL-014 는 자동 검사인 척하지 않으며, 대신 관측 항목 여섯 개를 각각 예/아니오로 답할 수 있는 형태로 적는다.

---

## 공통 테스트 골격

`server/test/web-shell.test.ts` 상단에 한 번 둔다. **파일 첫 줄의 환경 도크블록이 이 SPEC 의 테스트를 다른 서버 테스트와 가른다** — 기존 테스트(`better-sqlite3`·`ws`·실서버 `listen`)의 환경은 건드리지 않는다.

```ts
// @vitest-environment jsdom
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
```

`stubFetch` 가 등록되지 않은 경로에서 **던지는** 것이 의도다. 구현이 예상 밖의 엔드포인트를 부르면 테스트가 조용히 통과하지 않고 그 자리에서 실패한다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-WEBSHELL-001 | REQ-001 | 아래 본문 | `GET /` 가 `200`+HTML 이고 본문에 `id="auth-view"`·`id="main-view"` 둘 다, `/style.css`·`/app.js`·`/design-tokens.css` 각 `200` |
| AC-WEBSHELL-002 | REQ-002 | 아래 본문 | 같은 앱에서 `GET /api/health` 가 `{"ok":true}`, `GET /api/nope` 가 `404`+비-HTML, `GET /` 는 HTML |
| AC-WEBSHELL-003 | REQ-003 관측 1·2, REQ-015 | 아래 본문 | `id` 집합 크기 == `id` 개수, **영속 `id` 24개** 전부 존재 (`placeholder` 는 AC-015 관측 5) |
| AC-WEBSHELL-004 | REQ-003 관측 4·5, REQ-015 | 아래 본문 | `<script type="module">` 요소가 있고 그 본문에 `initApp` 호출, `<html lang="ko">`, 타입 없는 `script[src]` 0건 |
| AC-WEBSHELL-005 | REQ-004, REQ-015 | 아래 본문 | `@import` 줄번호 < 첫 `{` 줄번호, 원시 16진 색값 0건, `var(--md-` 12곳 이상 |
| AC-WEBSHELL-006 | REQ-005, REQ-015 | 아래 본문 | 필수 export 18개가 **하나도 빠지지 않음**(초과분 불문), `state` 의 소유 세 필드 초기값 일치, 나머지 17개가 함수 |
| AC-WEBSHELL-007 | REQ-006 | 아래 본문 | 스텁 `fetch` 가 받은 인자 네 가지(경로·`content-type`·직렬화 본문·`credentials`)가 규정값, 오류 시 `error` 문구가 메시지 |
| AC-WEBSHELL-008 | REQ-007 | 아래 본문 | 비-`/auth/` `401` → 던짐 **그리고** `#main-view` 가 `hidden`; `/auth/` `401` → 던짐 **그러나** `#main-view` 는 그대로 |
| AC-WEBSHELL-009 | REQ-008 | 아래 본문 | 성공 시 `#main-view` 노출 + 방/봇 목록 요청 발생, 실패 시 `#auth-error` 문구가 서버 문구와 일치하고 `hidden` 해제 |
| AC-WEBSHELL-010 | REQ-009 | 아래 본문 | 활성 2·보관 1 입력에서 `#room-list` 2개·`#archived-list` 1개, 활성에만 `.archive-btn`, `currentRoomId` 항목에 `active` 클래스 |
| AC-WEBSHELL-011 | REQ-010 | 아래 본문 | `createRoom`/`archiveRoom` 이 규정 경로+메서드로 부르고 뒤이어 `GET /api/rooms` 재적재, 오류 시 `#error-toast` 에 문구 |
| AC-WEBSHELL-012 | REQ-011 | 아래 본문 | `renderBots` 가 `#bot-list` 에 이름 표시, `createBot` 이 `POST /api/bots` + `GET /api/bots` 재적재 |
| AC-WEBSHELL-013 | REQ-012 | 아래 본문 | `POST /api/auth/logout` 발생 + `state` 세 필드 초기화 + `#auth-view` 노출 |
| AC-WEBSHELL-014 | REQ-013 | **MANUAL** — 아래 본문 | 관측 항목 6개 각각 예/아니오로 기록 |
| AC-WEBSHELL-015 | REQ-014, REQ-015 | 아래 본문 | 기준 SHA 확인 exit `0`, `db.ts` diff 빈 출력, 변경 파일이 필수 넷 포함 ∧ 허용 집합 이내, `#placeholder` 존재, `index.html` 에 토큰 문자열 부재, `state` 필드 정확히 셋 |
| AC-WEBSHELL-016 | RED→GREEN 전이 | 아래 본문 | 네 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-WEBSHELL-001 — 서버가 `web/` 를 실제로 내보낸다

**Given** `web/index.html`·`style.css`·`app.js`·`design-tokens.css` 가 존재하고 `buildServer()` 에 정적 서빙이 등록됐다.
**When** 다음을 `server/test/web-shell.test.ts` 에 추가하고 `npm test -w server` 를 실행한다.

```ts
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
```

**Then** 다섯 관측이 모두 성립한다 — `GET /` 가 `200`, `content-type` 이 `text/html`, 본문에 `id="auth-view"`, 본문에 `id="main-view"`, 세 정적 파일이 각각 `200` 이고 본문이 비어 있지 않다.

**본문 문자열 두 개가 이 기준의 무게를 진다.** `200` + `text/html` 만 보면 아무 HTML 이나 통과하고, 정적 서빙 대신 인라인 문자열을 돌려주는 구현도 통과한다.

### AC-WEBSHELL-002 — 정적 서빙이 API 를 가리지 않는다

**Given** AC-001 과 같은 앱.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
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
```

**Then** 네 관측이 모두 성립한다.

1. `GET /` 가 `text/html` 이다 — **정적 서빙이 실제로 걸려 있다.**
2. `GET /api/health` 가 `200` 이고 본문이 정확히 `{"ok":true}` 다.
3. `GET /api/nope` 가 `404` 다.
4. 그 본문에 `id="auth-view"` 가 없다 — `index.html` 로 폴백하지 않았다.

**관측 1이 없으면 이 기준 전체가 부재 검사가 된다.** 정적 서빙을 아예 등록하지 않은 구현이 관측 2·3·4 를 전부 통과하기 때문이다.

**관측 3·4 가 실패하면 `plan.md` §D 7번의 미확인 항목이 현실이 된 것이다.** `@fastify/static` v10 의 폴백 동작을 실행으로 확인하지 않았다. 그 경우 `wildcard: false` 등으로 조정하고, 조정 자체를 블로커로 보고한 뒤 진행한다 — 이 기준을 완화하지 않는다.

### AC-WEBSHELL-003 — `id` 가 유일하고 필요한 것이 다 있다

**Given** `web/index.html` 이 작성됐다.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
const REQUIRED_IDS = [
  'auth-view', 'login-form', 'login-username', 'login-password',
  'register-form', 'reg-username', 'reg-password', 'auth-error',
  'main-view', 'sidebar', 'room-list', 'archived-box', 'archived-list',
  'bot-list', 'new-room-btn', 'new-bot-btn', 'logout-btn',
  'chat',
  'prompt-dialog', 'prompt-form', 'prompt-label', 'prompt-input', 'prompt-ok',
  'error-toast',
]   // 영속 id 24개. `placeholder` 는 여기 없다 — 아래 설명 참조.

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
```

**Then** 세 관측이 성립한다 — 중복 목록이 빈 배열, `id` 집합 크기가 개수와 같음, **영속 `id` 24개**가 전부 존재.

**필수 목록 단언이 없으면 빈 HTML 이 가장 잘 통과한다.** 원본이 `id="sidebar-top"` 을 두 번 쓴 것(`plan.md` §D 1번)을 잡는 것은 앞의 두 관측이고, 빈 파일을 걸러내는 것은 세 번째다.

**`placeholder` 가 이 목록에서 빠진 이유 — 감사 MF-6** (0.2.0 교정). 이 파일은 영구 산출물이고 `npm test -w server` 에 계속 실린다. 그 명령은 형제 SPEC 둘의 GREEN 게이트이기도 하다. `SPEC-WEBCHAT-001` 의 첫 마일스톤은 `<main id="chat">` 의 내용물을 **통째로 교체하며**, 그때 `#placeholder` 가 사라진다 — 형제가 **자기 요구사항대로 옳게 구현한 결과**로 이 기준이 붉어진다. 그러면 실행자는 원인이 자기 코드가 아닌 곳에 있다고 보고 형제의 기준을 완화하거나 지우려 든다. 이 저장소가 반복해서 겪은 결함 부류의 상류가 정확히 그 경로다.

그래서 소유권을 갈랐다(`spec.md` §4.8 계약 4) — **`#chat` 요소는 이 SPEC 소유(영속), `#chat` 의 내용물은 `SPEC-WEBCHAT-001` 소유.** `#placeholder` 의 존재는 **이 SPEC 의 마감 시점에만** 요구되며, 그 관측은 영구 테스트가 아니라 AC-WEBSHELL-015 관측 5가 진다. 빈 구현 방어는 그대로 유지된다 — 이 SPEC 이 `#placeholder` 없이 마감하면 AC-015 가 실패한다.

### AC-WEBSHELL-004 — 모듈 부트스트랩이 실제로 있다

**Given** 같은 파일.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
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
```

**Then** 다섯 관측이 성립한다 — `lang="ko"`, `charset="utf-8"`, 모듈 스크립트 존재, `initApp` 을 부르는 모듈 스크립트가 정확히 하나이며 `import { initApp } from ...` 형태, 타입 없는 `src` 스크립트가 0건.

마지막 관측이 `plan.md` §D 6번(전역 스크립트 잔존)을 기계적으로 막는다.

**형제 SPEC 이 스크립트를 더할 때** — 반드시 `type="module"` 을 단다(`spec.md` §4.8 계약 4). 타입 없는 `script[src]` 를 더하면 마지막 관측이 붉어진다. `initApp` 을 부르는 모듈 스크립트가 **정확히 하나**라는 관측도 유지된다 — 형제는 자기 배선을 `initApp()` 안이나 자기 함수에 두고, 두 번째 부트스트랩 스크립트를 만들지 않는다.

### AC-WEBSHELL-005 — `style.css` 가 토큰을 실제로 소비한다

**Given** `web/style.css` 가 작성됐다.
**When** 다음 네 명령을 실행한다.

```bash
grep -n "@import" web/style.css
grep -n "{" web/style.css | head -1
grep -nEi '#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})([^0-9a-z_-]|$)' web/style.css
grep -c 'var(--md-' web/style.css
```

**Then** 네 관측이 모두 성립한다.

1. 첫 명령이 정확히 한 줄을 출력하고 그 줄이 `design-tokens.css` 를 포함한다.
2. 그 줄 번호가 둘째 명령이 출력한 줄 번호보다 **작다** — `@import` 가 첫 선택자 블록보다 앞이다. CSS 는 `@import` 를 다른 규칙 뒤에 두면 무시한다.
3. 셋째 명령이 **일치 없음**(종료 코드 `1`)으로 끝난다 — 원시 16진 색상 리터럴이 0건이다.
4. 넷째 명령이 **12 이상**을 출력한다.

**정규식이 `#room-list` 같은 id 선택자를 잡지 않는 이유**: 최소 3자리를 요구하는데 `#roo` 의 `r`, `#bot-list` 의 `o`, `#chat` 의 `h`, `#sidebar` 의 `s` 가 모두 16진 문자가 아니다. 이 SPEC 이 쓰는 id 목록(AC-003)에는 앞 3자가 전부 16진 문자인 것이 없다. 새 id 를 더할 때 이 성질을 깨면 이 관측이 거짓 실패하므로, 그때는 id 이름을 바꾼다.

**관측 3만으로는 빈 파일이 가장 잘 통과한다.** 관측 1·2·4 가 그것을 막는다 — 특히 관측 4는 색이 실제로 토큰을 거쳐 쓰이는지를 **존재**로 잰다.

**형제 SPEC 이 토큰 로딩을 확인할 때 볼 파일은 `web/style.css` 다** — `web/index.html` 이 아니다(`spec.md` §4.8 계약 5, 감사 MF-7). 토큰은 여기 `@import` 하나로만 실리므로 `index.html` 에는 `design-tokens.css` 문자열이 없다. 형제가 `web/style.css` 에 규칙을 더할 때 지킬 세 가지(파일 끝에 덧붙이기 / 원시 16진값 금지 / 앞 세 글자가 모두 16진 문자인 선택자 이름 금지)도 같은 계약에 있다. 셋 중 하나라도 어기면 이 기준이 **형제의 변경 때문에** 붉어진다.

### AC-WEBSHELL-006 — `app.js` 가 필수 표면을 전부 갖추고 그 형태가 맞다

**Given** `web/app.js` 가 작성됐다.
**When** 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
// 이 SPEC 이 소유하는 필수 최소 집합 18개 (spec.md REQ-WEBSHELL-005).
// 형제 SPEC 은 여기에 이름을 더할 수 있다 — 이 기준은 더해진 이름에 침묵한다.
const REQUIRED_EXPORTS = [
  '$', 'api', 'archiveRoom', 'createBot', 'createRoom', 'initApp', 'loadBots',
  'loadRooms', 'login', 'logout', 'openRoom', 'promptText', 'register',
  'renderBots', 'renderRooms', 'showAuth', 'showMain', 'state',
].sort()

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
  // 3) 나머지 열일곱은 전부 함수다.
  for (const name of REQUIRED_EXPORTS.filter(n => n !== 'state')) {
    expect(typeof app[name], `${name} 은 함수여야 한다`).toBe('function')
  }
})
```

**Then** 세 관측이 성립한다 — 빠진 필수 export 목록이 빈 배열, `state` 의 세 소유 필드가 규정된 초기값, 나머지 열일곱이 전부 함수.

**`toEqual` 집합 단언을 걷어낸 이유 — 감사 MF-2** (0.2.0 교정). 0.1.0 은 `expect(Object.keys(app).sort()).toEqual(EXPECTED_EXPORTS)` 로 열일곱 이름을 못 박고 `expect(app.state).toEqual({...})` 로 세 필드를 못 박았다. 둘 다 **이 SPEC 이 소유하지 않은 것까지 단언하는 형태**였다.

- 자기모순이었다. 같은 SPEC 의 `spec.md` 가 "형제 SPEC 은 이 객체에 필드를 더한다"고 쓰면서, 이 기준은 더하는 순간 실패하도록 잠갔다.
- 카드 수준 지뢰였다. 이 테스트 파일은 영구 산출물이고 `npm test -w server` 는 형제 둘의 GREEN 게이트다. 형제가 `renderMessage`·`sendMessage`·`decorate` 를 export 하거나 `state.sse` 를 더하는 순간, **형제가 만들지도 않은 기준에서 형제의 옳은 구현이 붉어진다.** 그러면 실행자가 그 기준을 완화하거나 지우는 경로가 열린다.

교정 원칙은 하나다 — **소유한 것만 단언하고, 소유하지 않은 것에는 침묵한다.**

**빈 구현 방어가 약해지지 않는 이유.** `toEqual` 이 막던 것은 두 가지였다: (가) 필수 이름 누락, (나) 형제 필드 선취. (가)는 위 관측 1이 그대로 잡는다 — 부분집합 검사는 **누락에 대해서는 `toEqual` 과 동일하게 엄격하다.** (나)는 영구 테스트가 아니라 **이 SPEC 마감 시점 검사**(AC-WEBSHELL-015 관측 6)로 옮겼다 — 형제 필드 선취는 이 SPEC 의 커밋에서만 결함이고, 형제가 마감한 뒤에는 결함이 아니기 때문이다. 시점에 따라 참·거짓이 뒤집히는 성질을 시점 무관 영구 기준으로 쓴 것이 0.1.0 의 오류였다.

빈 모듈은 관측 1에서 열여덟 개 전부가 `missing` 으로 잡히고, 껍데기만 있는 구현은 AC-007~013 이 실제 동작을 재므로 통과하지 못한다.

**이 테스트가 `loadApp()` 만으로 통과한다는 사실 자체가 관측이다** — `app.js` 가 import 시점에 네트워크를 때리면 스텁 없는 `fetch` 에서 터진다(`plan.md` §D 6번).

**이 테스트가 `loadApp()` 만으로 통과한다는 사실 자체가 관측이다** — `app.js` 가 import 시점에 네트워크를 때리면 스텁 없는 `fetch` 에서 터진다(`plan.md` §D 6번).

### AC-WEBSHELL-007 — `api()` 가 규정대로 요청을 만든다

**Given** 같은 모듈.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
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
```

**Then** 여섯 관측이 성립한다 — 반환값이 파싱된 JSON, 요청 경로, `content-type` 헤더, 직렬화된 본문 문자열, `credentials: 'same-origin'`(두 요청 모두), 오류 메시지가 서버 `error` 문구와 일치.

`credentials` 관측이 빠지면 **로그인은 되는데 그 뒤 전부 `401`** 인 결함이 검사망을 그대로 통과한다(`spec.md` REQ-WEBSHELL-006).

### AC-WEBSHELL-008 — `401` 을 두 갈래로 가른다

**Given** 같은 모듈.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
it('shows the auth view on a protected 401 but not on an auth 401', async () => {
  const { api, showMain } = await loadApp()
  stubFetch({
    'GET /api/rooms': { status: 401, body: { error: '로그인이 필요합니다' } },
    'POST /api/auth/login': { status: 401, body: { error: '사용자 이름 또는 비밀번호가 틀렸습니다' } },
  })

  showMain()
  expect(document.getElementById('main-view')!.hidden).toBe(false)

  // 보호 경로의 401 → 인증 뷰로 되돌린다
  await expect(api('/api/rooms')).rejects.toThrow()
  expect(document.getElementById('main-view')!.hidden).toBe(true)
  expect(document.getElementById('auth-view')!.hidden).toBe(false)

  // 인증 경로의 401 → 화면을 건드리지 않는다
  showMain()
  await expect(api('/api/auth/login', { method: 'POST', body: { username: 'a', password: 'b' } }))
    .rejects.toThrow('사용자 이름 또는 비밀번호가 틀렸습니다')
  expect(document.getElementById('main-view')!.hidden, '로그인 실패가 화면을 되돌리면 안 된다').toBe(false)
})
```

**Then** 두 방향이 모두 관측된다 — 보호 경로에서는 `#main-view` 가 `hidden` 이 되고, 인증 경로에서는 `hidden` 이 되지 **않는다.**

**두 방향을 같은 테스트에 둔 것이 요점이다.** 한 방향만 보면 `showAuth` 를 항상 부르는 구현과 아예 안 부르는 구현 중 하나가 통과한다.

### AC-WEBSHELL-009 — 로그인 성공과 실패가 화면에 드러난다

**Given** 같은 모듈.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
it('enters the main view on login and shows the server message on failure', async () => {
  const app = await loadApp()
  const ok = stubFetch({
    'POST /api/auth/login': { status: 200, body: { ok: true } },
    'GET /api/rooms': { status: 200, body: { active: [], archived: [] } },
    'GET /api/bots': { status: 200, body: [] },
  })
  await app.login('alice', 'pw123456')
  expect(document.getElementById('main-view')!.hidden).toBe(false)
  expect(document.getElementById('auth-view')!.hidden).toBe(true)
  const paths = ok.map(c => c.path)
  expect(paths).toContain('/api/rooms')   // 목록을 실제로 적재했다
  expect(paths).toContain('/api/bots')

  // 실패 경로
  const err = document.getElementById('auth-error')!
  stubFetch({ 'POST /api/auth/login': { status: 401, body: { error: '사용자 이름 또는 비밀번호가 틀렸습니다' } } })
  await expect(app.login('alice', 'wrong')).rejects.toThrow()
  expect(err.hidden).toBe(false)
  expect(err.textContent).toBe('사용자 이름 또는 비밀번호가 틀렸습니다')
})
```

**Then** 여섯 관측이 성립한다 — 성공 후 `#main-view` 노출, `#auth-view` 숨김, `/api/rooms` 요청 발생, `/api/bots` 요청 발생, 실패 후 `#auth-error` 의 `hidden` 해제, 그 문구가 서버 문구와 **정확히** 일치.

목록 적재 두 관측이 없으면 "화면만 바꾸고 아무것도 안 불러오는" 구현이 통과한다.

### AC-WEBSHELL-010 — 방 목록이 활성과 보관을 갈라 그린다

**Given** 같은 모듈.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
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
```

**Then** 여덟 관측이 성립한다 — 활성 2개, 보관 1개, 각 이름 표시, 활성에 `.archive-btn` 존재, 보관에 `.archive-btn` 부재, `currentRoomId` 항목에 `active` 클래스 있음, 다른 항목에 없음, 재렌더 후에도 2개(누적 없음).

마지막 관측이 `innerHTML = ''` 초기화 누락을 잡는다 — 그것 없이는 방 목록이 갱신될 때마다 늘어난다.

### AC-WEBSHELL-011 — 방 생성·보관이 API 를 부르고 재적재하며 오류를 삼키지 않는다

**Given** 같은 모듈.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
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
```

**Then** 아홉 관측이 성립한다 — 생성 요청의 경로·메서드·본문, 생성 뒤 `GET /api/rooms` 재적재, 보관 요청의 경로·메서드, 보관 뒤 재적재, 오류 시 `#error-toast` 의 `hidden` 해제와 문구 일치.

**재적재 관측 둘이 이 기준의 절반을 진다.** API 만 부르고 목록을 다시 안 읽는 구현은 "버튼을 눌러도 화면이 그대로"라는 결함이고, 요청 단언만으로는 잡히지 않는다.

### AC-WEBSHELL-012 — 봇 목록과 등록

**Given** 같은 모듈.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
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
```

**Then** 여덟 관측이 성립한다 — 봇 2개 렌더, 각 이름 표시, 재렌더 후에도 2개, 등록 요청의 경로·메서드·본문, 등록 뒤 `GET /api/bots` 재적재.

**형제 SPEC 에 대한 경계** (`spec.md` §4.8 계약 4·6). 첫 관측은 `#bot-list` 의 **직계 자식 수**를 본다. `SPEC-WEBCHAT-001` 이 봇 working/idle/stale 표시를 더할 때 상태 요소를 `#bot-list` 의 직계 자식으로 붙이면 이 기준이 붉어진다 — 표시는 **각 봇 항목 요소 안쪽**에 붙인다. 마지막 두 관측은 스텁 호출 순번(`calls[0]`·`calls[1]`)에 의존하므로, 형제가 `createBot` 본문에 요청을 더해도 붉어진다 — 형제의 배선은 `openRoom` 과 자기 함수 안에 둔다.

### AC-WEBSHELL-013 — 로그아웃이 서버와 화면과 상태를 모두 되돌린다

**Given** 같은 모듈.
**When** 다음을 추가하고 같은 명령을 실행한다.

```ts
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
```

**Then** 일곱 관측이 성립한다 — 요청 경로, 메서드, `state.rooms` 초기화, `state.bots` 초기화, `state.currentRoomId` 가 `null`, `#auth-view` 노출, `#main-view` 숨김.

**상태 초기화 세 관측이 없으면** 로그아웃 후 다른 사용자로 로그인했을 때 이전 사용자의 목록이 잠깐 보이는 결함이 그대로 남는다.

### AC-WEBSHELL-014 — [MANUAL] Discord 디자인 DNA 충실도

**이 기준은 사람 눈으로만 판정한다. 자동 검사가 아니며, 자동 검사인 척하지 않는다.**

**Given** `npm run dev -w server` 로 서버를 띄우고 브라우저에서 `http://127.0.0.1:3000` 을 연다. 회원가입 → 로그인 → 방 두 개 생성 → 한 개 보관 → 봇 한 개 등록까지 진행한다.
**When** 아래 여섯 항목을 눈으로 확인한다.
**Then** 여섯 항목이 모두 **예**다. **각 항목의 예/아니오를 `progress.md` `§E.2` 에 개별로 기록한다** — "화면이 잘 뜬다" 같은 한 줄 요약으로 갈음하지 않는다.

| # | 관측 항목 (반증 가능한 형태) | 근거 |
|---|------------------------------|------|
| 1 | 왼쪽 사이드바 배경이 오른쪽 채팅 영역 배경보다 **어둡다**. 두 영역의 경계가 눈으로 구분된다 | DNA §1 — 레이어가 왼쪽으로 갈수록 어둡다 (`--md-bg-panel` < `--md-bg-main`) |
| 2 | 컬럼이 **2개**다 — 사이드바 + 채팅 영역. 서버 아이콘 레일에 해당하는 세 번째 세로 줄이 없다 | DNA "조정 포인트" — minidiscord 는 서버 개념이 없다 |
| 3 | 텍스트가 밝고 배경이 어둡다. 검은 글자가 흰 배경 위에 있는 영역이 하나도 없다 | DNA §1 `contrast_strategy: light-on-dark` |
| 4 | 사이드바의 "방"/"봇" 라벨이 본문보다 **작고 대문자꼴이며 흐린 색**이다. 방 이름과 같은 크기·같은 밝기가 아니다 | DNA §2 — 카테고리 라벨 11px 대문자 흐린 텍스트 |
| 5 | 굵은 테두리로 둘러싸인 상자가 없다. 영역 구분은 배경색 차이와 얇은 구분선으로만 되어 있고, 요소에 드리운 그림자가 없다 | DNA §4·§6 — `subtle 1px`, `shadow_style: none` |
| 6 | 방 이름 위에 마우스를 올리면 배경이 **눈에 띄게** 밝아진다. 아무 변화가 없지 않다 | DNA §1 메시지 호버 배경 (`--md-bg-hover`) |

추가로 다이얼로그 경로를 확인한다 — **"+ 새 방" 을 눌러 이름을 넣고 확인하면 방이 목록에 생기고, 취소하면 아무 방도 생기지 않는다.** 같은 확인을 "+ 봇 등록" 에도 한다. 이 경로는 `<dialog>` 지원 편차 때문에 기계 검증에서 뺐다(`plan.md` §C).

**이 기준이 실패하는 방식**: 여섯 항목 중 하나라도 **아니오**면 실패다. "대체로 비슷하다"는 통과가 아니다.

### AC-WEBSHELL-015 — 범위 경계와 스키마 불변

**Given** M1 단계 0 에서 `spec_base_sha` 를 기록했다.
**When** 다음 네 명령을 순서대로 실행한다. `<SHA>` 는 `.spec-base-sha` 의 값을 **직접 적어** 넣는다.

```bash
ls web
git rev-parse --verify "$(cat .moai/specs/SPEC-WEBSHELL-001/.spec-base-sha)^{commit}"
git diff --stat <SHA> -- server/src/db.ts
git diff --name-only <SHA>
grep -c 'id="placeholder"' web/index.html
grep -c 'design-tokens.css' web/index.html
sed -n '/^export const state = {/,/^}/p' web/app.js
```

**둘째 명령이 앞에 있어야 하는 이유.** M1 단계 0 을 건너뛴 실행에서는 `.spec-base-sha` 가 없고, `git diff … "$(cat …)"` 는 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 그러면 셋째 명령의 "비어 있음"이 성립해 버려 그 관측만 조용히 무력해진다. 기준 SHA 의 존재 자체를 관측 대상으로 올리는 이유다.

**Then** 일곱 관측이 모두 성립한다.

1. 첫 명령의 출력에 `index.html`·`style.css`·`app.js`·`design-tokens.css` 가 **있다.** 개수를 세지 않는다 — 형제 SPEC 이 나중에 `web/` 에 무엇을 더하든 이 관측의 판정 대상이 아니다.
2. 둘째 명령이 **종료 코드 `0`** 으로 40자리 SHA 한 줄을 출력한다. `fatal:` 이 나오면 **이 기준은 실패**이며 나머지로 넘어가지 않는다.
3. 셋째 명령이 **종료 코드 `0`** 이고 **출력이 비어 있다** — `db.ts` 가 진입 시점 이후 한 줄도 바뀌지 않았다. 두 조건이 함께 성립해야 통과다.
4. 넷째 명령이 **종료 코드 `0`** 이고, 그 출력이 두 조건을 함께 만족한다.
   - **필수 포함**: `server/src/index.ts`, `web/app.js`, `web/index.html`, `web/style.css` 네 줄이 전부 있다.
   - **허용 집합 이내**: `.moai/` 아래 경로(이 SPEC 자신의 산출물)를 제외한 나머지가 아래 허용 집합의 부분집합이다.

   | 허용 경로 | 이유 |
   |-----------|------|
   | `server/src/index.ts` | 정적 서빙 등록 (필수) |
   | `web/index.html` · `web/style.css` · `web/app.js` | 이 SPEC 의 산출물 (필수) |
   | `server/test/web-shell.test.ts` | 이 SPEC 의 테스트 |
   | `server/package.json` | `jsdom` devDependency 추가 |
   | `package-lock.json` (저장소 루트) | `npm install -D -w server jsdom` 이 **반드시** 바꾼다 |
   | `server/vitest.config.ts` | `plan.md` §C 의 대안 경로를 쓴 경우에만 |

   `web/design-tokens.css` 가 나타나면 **실패**다(이 SPEC 은 그 파일을 고치지 않는다). 허용 집합 밖의 소스 파일이 하나라도 나타나면 실패다.

   **`package-lock.json` 이 허용 집합에 들어간 이유 — 감사 O-4** (0.2.0 교정). 0.1.0 은 예외로 `server/test/web-shell.test.ts` 와 `server/package.json` 만 적었다. 그런데 M1 의 첫 작업이 `npm install -D -w server jsdom` 이고 그 명령은 워크스페이스 루트의 `package-lock.json` 을 **반드시** 바꾼다. 즉 **계획대로 옳게 실행한 구현이 이 관측에서 실패했다.**

5. 다섯째 명령이 **`1` 이상**을 출력한다 — 이 SPEC 의 마감 시점에 `#placeholder` 가 `web/index.html` 에 존재한다(REQ-WEBSHELL-003 관측 3). 이 관측이 AC-003 의 영구 테스트에서 빠진 `placeholder` 의 빈 구현 방어를 대신 진다(감사 MF-6).
6. 여섯째 명령이 **`0`** 을 출력하고 종료 코드가 `1` 이다 — `web/index.html` 에 `design-tokens.css` 문자열이 **없다.** 토큰은 `style.css` 의 `@import` 하나로만 실린다(`spec.md` §4.8 계약 5). 이 관측은 형제 SPEC 이 `index.html` 에 토큰 `<link>` 를 더해 두 경로로 싣는 것을 이 SPEC 마감 시점에 미리 차단한다(감사 MF-7 의 반대 방향).
7. 일곱째 명령의 출력에 필드 줄이 정확히 셋이다 — `rooms`, `bots`, `currentRoomId`. `sse`·`workingBots`·`staleTimers`·`staleBots` 를 비롯한 형제 필드가 나타나면 **실패**다. 이 SPEC 은 자기가 쓰지 않는 죽은 필드를 두지 않는다(`spec.md` §4.8 계약 2).

   **이 관측이 영구 테스트가 아니라 여기 있는 이유** (감사 MF-2·MF-4). 형제 필드의 부재는 **이 SPEC 의 커밋 시점에만** 참이어야 하는 성질이다. 형제가 마감한 뒤에는 그 필드가 있는 것이 옳다. 시점에 따라 참·거짓이 뒤집히는 성질을 시점 무관 영구 기준(AC-006)에 넣은 것이 0.1.0 의 오류였다. 마감 시점 명령으로 옮기면 두 성질이 함께 성립한다 — 이 SPEC 은 선취를 금지당하고, 형제는 확장을 허락받는다.

**관측 4가 이 기준의 무게를 진다.** "이 SPEC 이 만들지 않았다"는 판정은 여기서 나온다 — `spec_base_sha` 이후 변경된 파일이 정확히 예상 집합이라는 **양성** 단언이라, 구현자가 채팅 코드나 초대 모달을 미리 넣으면 즉시 드러난다. 동시에 상대 비교라서 형제 SPEC 이 진입 시점 **이전에** 무엇을 만들어 뒀든 영향받지 않는다(`SPEC-SSE-001` AC-SSE-010 의 선례).

### AC-WEBSHELL-016 — RED → GREEN 전이 증거

**Given** 각 마일스톤에서 테스트를 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 네 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | AC-001 이 실패. 원인이 `GET /` 의 `404`(정적 서빙 미등록) 또는 `web/index.html` 부재로 출력에 직접 보임 |
| 2 | M1 | GREEN | 정적 서빙 등록 + `index.html` 뼈대 후 AC-001·002 통과 |
| 3 | M3 | RED | AC-006 이 실패. 원인이 `../../web/app.js` 모듈 부재(해석 오류)로 출력에 직접 보임 |
| 4 | M3 | GREEN | `app.js` 구현 후 AC-006~013 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2` 에 기록한다. RED 판정은 도구가 내는 특정 문구가 아니라 **"무엇이 없어서 실패했다"는 원인이 출력에서 확인되는가**로 한다.

**M2 에 RED 전이를 따로 두지 않은 이유**: M2 의 테스트(AC-003~005)는 M1 이 만든 `index.html` 뼈대 위에서 실패한다 — 필수 `id` 부족과 `style.css` 부재가 원인이고, 그것도 전이 1 과 같은 부류다. 별도 전이로 세지 않되 출력은 기록한다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 방이 하나도 없는 상태로 로그인 | `#room-list` 가 비고 `#placeholder` 문구가 보인다. 오류는 나지 않는다 | AC-009 가 빈 `{active:[],archived:[]}` 로 그 경로를 탄다. `#placeholder` 존재는 AC-015 관측 5 |
| 보관된 방을 클릭 | `openRoom` 이 불리고 `currentRoomId` 가 바뀐다. 이 SPEC 은 그 뒤 아무것도 하지 않는다 | 범위 밖 — 읽기 전용 표시는 `SPEC-WEBCHAT-001` 소관 |
| 방 이름을 빈 문자열로 생성 | 서버가 `400 {error:'방 이름이 필요합니다'}`. `#error-toast` 에 그 문구가 뜬다 | AC-011 의 오류 경로와 같은 처리 |
| 8자 미만 비밀번호로 회원가입 | 서버가 `400`. `#auth-error` 에 서버 문구가 뜨고 화면은 인증 뷰에 머문다 | AC-009 실패 경로와 같은 처리 |
| 다이얼로그에서 취소 | `promptText` 가 `null` 을 반환하고 액션 함수를 부르지 않는다 | AC-014 MANUAL (`<dialog>` 지원 편차 때문 — `plan.md` §C) |
| 세션 만료 상태로 방 목록 요청 | `401` → `showAuth()` → 인증 뷰. 입력값은 비어 있다 | AC-008 첫 방향 |
| 로그인 실패 | `401` 이지만 화면은 인증 뷰 그대로, 입력값과 오류 문구가 함께 남는다 | AC-008 둘째 방향 |
| 서버가 죽은 상태에서 버튼 클릭 | `fetch` 가 거부하고 `api()` 가 던진다. 액션 함수가 잡아 `#error-toast` 에 띄운다 | AC-011 의 `try/catch` 경로와 같다. 네트워크 실패 메시지는 브라우저가 정한다 |
| `web/` 에 파일이 없는 채로 서버 기동 | `@fastify/static` 등록이 실패하거나 `GET /` 가 `404`. 조용히 넘어가지 않는다 | AC-001 이 그 상태를 RED 로 관측한다(전이 1) |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (선행 SPEC 분 + 이 SPEC 추가분) | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), `app.js` 는 인증·방·봇·부트스트랩 네 덩어리로 나뉜다 | 리뷰 |
| Unified | 서버 쪽 TypeScript strict 통과, `web/` 는 브라우저가 그대로 읽는 ES 모듈 | `npm run typecheck -w server` |
| Secured | `api()` 가 `credentials: 'same-origin'` 을 붙이고, `401` 을 삼키지 않으며, 로그아웃 경로가 존재한다 | AC-007, AC-008, AC-013 |
| Shared contract | `spec.md` §4.8 의 여섯 계약이 구현과 일치한다 — 형제 SPEC 둘이 결합하는 표면 | AC-003, AC-004, AC-005, AC-006, AC-012, AC-015 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`, `chore:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-WEBSHELL-001 부터 AC-WEBSHELL-016 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] AC-WEBSHELL-015 의 관측 **일곱 개가 각각** 기록됨 (0.2.0 에서 넷 → 일곱으로 늘었다)
- [ ] AC-WEBSHELL-014 의 관측 항목 **여섯 개가 각각** 예/아니오로 기록됨 (한 줄 요약으로 갈음하지 않음)
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `plan.md` §C 의 테스트 환경 결정(도크블록인지 `vitest.config.ts` 인지)과 그 근거 출력이 `progress.md` §E.2 에 기록됨
- [ ] `web/` 에 `index.html`·`style.css`·`app.js`·`design-tokens.css` 가 존재함. **개수를 세지 않는다**
- [ ] `web/design-tokens.css` 가 이 SPEC 의 diff 에 나타나지 않음
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-WEBSHELL-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함
- [ ] 그 SHA 로 실행한 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이고 출력이 비어 있음. **빈 출력만으로 통과 처리하지 않는다**
- [ ] `app.js` 가 `spec.md` REQ-WEBSHELL-005 의 필수 export **18개를 하나도 빠짐없이** 내보냄 — 형제 SPEC 둘이 결합하는 계약이다. 초과분은 판정 대상이 아니다
- [ ] `state` 에 형제 SPEC 필드(`sse`·`workingBots`·`staleTimers`·`staleBots`)가 **이 SPEC 의 커밋 시점에** 없음 (AC-015 관측 7)
- [ ] `web/index.html` 에 `design-tokens.css` 문자열이 **없음** (AC-015 관측 6) — 토큰은 `style.css` 의 `@import` 하나로만 실린다
- [ ] `web/index.html` 에 `#placeholder` 가 **있음** (AC-015 관측 5)
- [ ] `spec.md` §4.8 의 여섯 계약이 전부 이 SPEC 의 구현과 일치함 — 형제 SPEC 둘이 이것을 읽고 결합한다
- [ ] `channel/`, `scripts/`, `server/src/` 의 새 소스 파일이 생성되지 않음 (`server/src/index.ts` 수정만)
- [ ] 커밋 4개 (`feat: serve the web directory from the server`, `feat: web UI shell markup and design-token stylesheet`, `feat: web UI auth, room list, and bot registry`, `chore: record manual visual verification for the web shell`)
