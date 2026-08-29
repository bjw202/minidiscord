# SPEC-WEBSHELL-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 15 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`~`M4` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M5`(카드 `t5`)와는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t5` 는 `plan-v2.md` 의 Task 15·16·17 을 담고, 이 SPEC 은 그중 Task 15 하나다. 카드 안에서의 순서는 고정이다.

```
SPEC-WEBSHELL-001 (이 SPEC — Task 15)
      ↓ state / api() / initApp() 계약, index.html 골격, style.css 토큰 소비
SPEC-WEBCHAT-001 (Task 16) → SPEC-WEBRICH-001 (Task 17)
```

**이 SPEC 이 카드 `t5` 의 첫 번째다.** 형제 둘이 이 SPEC 의 `web/app.js` 에 코드를 덧붙이고 `web/index.html` 에 요소를 더한다.

이 SPEC 이 선행 SPEC 에서 **정확히 무엇을 받아 쓰는지**:

| 선행 SPEC | 받아 쓰는 것 | 이 SPEC 에서의 쓰임 |
|-----------|-------------|-------------------|
| `SPEC-CORE-001` | `buildServer()` 와 그 본문 | 정적 서빙 등록을 여기에 더한다 |
| `SPEC-CORE-001` | `config` (게터로 지연 평가) | 테스트가 `MINIDISCORD_DATA_DIR` 로 데이터 경로를 격리할 수 있는 근거 |
| `SPEC-AUTH-001` | `POST /api/auth/{register,login,logout}` | 인증 화면이 부르는 세 엔드포인트 |
| `SPEC-ROOM-001` | `GET/POST /api/rooms`, `POST /api/rooms/:id/archive` | 방 목록·생성·보관 |
| `SPEC-ROOM-001` | `GET/POST /api/bots` | 봇 목록·등록 |
| 저장소 산출물 | `web/design-tokens.css` | `style.css` 가 `@import` 로 소비. **고치지 않는다** |

`SPEC-BOT-001`·`SPEC-SSE-001`·`SPEC-MSG-001`·`SPEC-GATEWAY-001`·`SPEC-PERM-001` 은 의존이 아니다. 초대·SSE·메시지·권한은 전부 형제 SPEC 둘의 소관이다.

## §B 되돌리기 어려운 결정 — `app.js` 의 공개 표면

이 SPEC 에서 가장 되돌리기 비싼 결정이다. 형제 SPEC 둘이 이 모듈에 직접 코드를 덧붙이고, 표면을 나중에 바꾸면 세 파일이 함께 바뀐다.

| 항목 | 값 | 왜 여기서 고정하는가 |
|------|-----|---------------------|
| 모듈 형식 | ES 모듈. `index.html` 이 `<script type="module">` 로 `initApp()` 호출 | **원본에서 바꾼 것.** 전역 스크립트는 `import` 가 불가능해 아무것도 단독 검증할 수 없다 — §D 6번. **0.2.0: 이 결정은 plan-audit 교정 게이트의 오케스트레이터 결정으로 카드 전체에 확정됐다**(감사 MF-1) |
| 상태 | `export const state = { rooms: {active,archived}, bots, currentRoomId }` | 원본 그대로의 세 필드. **형제가 자기 필드를 스스로 선언·초기화한다** — 이 SPEC 은 형제 필드를 미리 넣지 않고, 형제 필드의 부재를 영구 기준으로 단언하지도 않는다(감사 MF-2·MF-4, `spec.md` §4.8 계약 2) |
| DOM 헬퍼 | `$(id)` 를 export 한다 | **0.2.0 에서 추가.** 형제 SPEC 둘이 이미 의존 표면으로 적었는데 생산자가 내보내지 않던 이름이다(감사 MF-3) |
| fetch 래퍼 | `api(path, opts = {})` | 원본 시그니처 그대로. 직렬화·쿠키·오류·`401` 을 한 곳에 모은다 |
| 부트스트랩 | `initApp()` | **원본에서 바꾼 것.** 원본은 파일 끝의 즉시실행 IIFE 라, import 하는 순간 네트워크를 때린다 — §D 6번 |
| 액션 함수 | `login`·`register`·`logout`·`createRoom`·`archiveRoom`·`createBot` | **원본에서 분리한 것.** 원본은 DOM 핸들러 본문 안 인라인이라 다이얼로그를 열지 않고는 검증 불가 — §D 6번 |
| 렌더 함수 | `renderRooms`·`renderBots`·`loadRooms`·`loadBots`·`showAuth`·`showMain` | 원본 이름 그대로 |
| 방 열기 | `openRoom(id)` — 이름만 확정, 본체는 형제가 채운다 | 원본 주석("Task 16에서 구현")과 같은 의도. 이 SPEC 은 `currentRoomId` 갱신 + 재렌더만 둔다 |

**의도적으로 넣지 않은 것** — `api` 를 주입 가능하게 만드는 시드(예: `setApiImpl()`). 테스트는 `globalThis.fetch` 를 스텁하면 되고, 그러면 래퍼 본문까지 함께 검증된다. 주입 시드를 두면 래퍼가 우회되어 **`api()` 자체가 검증되지 않는 기준**이 된다.

검토 시 이 표가 확인 대상이다. 여기서 이름 하나를 바꾸면 형제 SPEC 둘의 코드가 함께 바뀐다.

## §C 되돌리기 어려운 결정 — 검증 방식 (원본의 "수동 확인"을 기계 검증으로 대체)

원본 Task 15 는 서두에서 이렇게 말한다.

> 여기부터 UI 태스크다. 자동 테스트 대신 "서버 실행 + 수동 확인" 스텝으로 검증한다(정적 파일이므로).

**이 SPEC 은 그 방침을 따르지 않는다.** "정적 파일이므로"는 검증할 수 없다는 뜻이 아니다. 이 SPEC 이 만드는 것 대부분은 순수 로직(`api()` 의 직렬화·오류 변환·`401` 분기)이거나 DOM 변환(`renderRooms` 의 입력 배열 → 출력 요소)이고, 둘 다 기계로 잰다. 수동 확인만 남기면 **사람이 "떠 보인다"고 말하는 것이 유일한 증거**가 되는데, 그것은 카드 `t2` 에서 세 번 재생산된 결함 부류와 같은 자리에 있다.

네 층으로 나눈다.

| 층 | 무엇을 재는가 | 도구 | 해당 AC |
|----|--------------|------|---------|
| 서버 | 정적 서빙과 API 비가림 | 기존 `app.inject` 패턴 (`server/test/health.test.ts` 선례) | AC-001, AC-002 |
| 정적 파일 | `id` 유일성, 필수 `id`, 모듈 부트스트랩, CSS 토큰 준수 | jsdom 파싱 + `grep` | AC-003~005 |
| 브라우저 로직 | `api()`, 렌더, 액션 함수 | vitest + jsdom 환경 + `globalThis.fetch` 스텁 | AC-006~013 |
| 시각 | Discord 디자인 DNA 충실도 | **사람 눈 (MANUAL)** | AC-014 |

### [HARD] run 단계 착수 전 필수 준비 — 테스트 환경 의존성

`server/package.json` 을 직접 읽어 확인했다. `devDependencies` 는 `@types/better-sqlite3`, `@types/node`, `@types/ws`, `tsx`, `typescript`, `vitest` 뿐이고 **jsdom 도 happy-dom 도 없다.** 이 워크트리에는 `node_modules` 가 없어 설치 상태를 확인할 수 없다 — 즉 "이미 전이 의존성으로 들어와 있을 것"이라고 가정하지 않는다.

run 단계 M1 의 **첫 작업**이 이것이다.

```bash
npm install -D -w server jsdom
```

그리고 DOM 이 필요한 테스트 파일 맨 위에 환경 도크블록을 둔다.

```js
// @vitest-environment jsdom
```

**확인하지 않은 것 하나를 정직하게 적어 둔다.** 설치된 vitest 는 `^4.1.11` 이고, vitest 4 에서 파일 단위 도크블록(`// @vitest-environment jsdom`)이 그대로 동작하는지는 **실행으로 확인하지 않았다**(이 워크트리에 `node_modules` 가 없다). 도크블록이 듣지 않으면 대안은 `server/vitest.config.ts` 를 새로 만들어 `test.projects` 로 DOM 테스트 파일만 `environment: 'jsdom'` 으로 가르는 것이다. **어느 쪽을 썼는지와 그 근거 출력을 `progress.md` §E.2 에 기록한다.** 서버 테스트 전체를 jsdom 환경으로 돌리는 선택은 하지 않는다 — `better-sqlite3`·`ws`·실서버 `listen` 을 쓰는 기존 테스트가 있고, 그것들의 환경을 이 SPEC 이 바꿀 이유가 없다.

### 왜 테스트가 `server/test/` 에 사는가

`web/` 는 워크스페이스가 아니다(루트 `package.json` 의 `workspaces` 는 `["server", "channel"]`). 새 워크스페이스를 만들면 루트 `package.json`·CI·`plan-v2.md` 의 파일 구조가 함께 바뀌는데, 이 SPEC 이 그것을 감당할 이유가 없다. 테스트는 `server/test/web-shell.test.ts` 한 파일로 두고 `../../web/app.js` 를 상대 경로로 import 한다.

### 왜 `globalThis.fetch` 스텁인가

`api()` 는 전역 `fetch` 를 부른다. 이것을 `vi.fn()` 으로 갈아 끼우면 **래퍼 본문부터 DOM 갱신까지 한 줄기로** 검증된다 — 어떤 경로로 무엇을 보냈는지(요청 쪽 단언)와 화면이 어떻게 바뀌었는지(응답 쪽 단언)를 같은 테스트에서 본다. 모듈 주입 시드를 두면 `api()` 자체가 검증 대상에서 빠진다.

### 왜 `promptText` 와 `confirm` 은 기계 검증에서 빼는가

원본은 방 생성에 `<dialog>.showModal()` 을, 방 보관에 `window.confirm` 을 쓴다. 둘 다 jsdom 지원이 버전에 따라 갈리고, 이 워크트리에서는 확인할 수 없다. **그래서 그 둘에 의존하지 않는 자리로 검증을 옮겼다** — 다이얼로그가 만들어 낸 문자열을 받는 `createRoom(name)`·`archiveRoom(id)`·`createBot(name, desc)` 를 별도 함수로 내보내고, 기계 검증은 그 함수를 직접 부른다. 다이얼로그 자체의 동작은 AC-014 의 MANUAL 관측 항목에 들어간다.

**이것이 검증을 약화시키지 않는 이유**: 다이얼로그는 문자열 하나를 만들어 넘기는 얇은 어댑터이고, 실제 결함이 사는 곳(API 를 부르는가, 어떤 경로로 부르는가, 그 뒤 목록을 다시 적재하는가, 오류를 삼키는가)은 전부 액션 함수 안이다.

## §D 원본 문서 결함과 해결

원본 `plan-v2.md` Task 15 의 코드 블록과, 이미 머지된 서버 코드를 대조하면서 발견한 것들이다. 원본은 코드보다 오래된 문서이며, **어긋날 때는 코드가 이긴다.**

### 1. `id="sidebar-top"` 이 두 번 쓰인다 (원본 2989행·2999행)

원본 HTML 에서 방 헤더와 봇 헤더가 같은 `id` 를 쓴다.

```html
<div id="sidebar-top"> <h2>방</h2> <button id="new-room-btn" ...> </div>
...
<div id="sidebar-top"> <h2>봇</h2> <button id="new-bot-btn" ...> </div>
```

`document.getElementById('sidebar-top')` 은 첫 번째만 돌려주고, CSS 의 `#sidebar-top { display: flex; ... }` 은 브라우저가 두 번째에도 적용해 주긴 하지만 **문서로서는 잘못됐고 스크립트로 접근하는 순간 조용히 틀린다.**

**해결**: `id` 를 없애고 클래스 `.sidebar-head` 로 바꾼다. 이것은 신원이 아니라 스타일이므로 클래스가 옳다. CSS 도 `.sidebar-head` 로 바꾼다. REQ-WEBSHELL-003 관측 1(`id` 유일성)이 이 부류 전체를 기계적으로 잡는다.

### 2. 로그아웃 경로가 UI 에 없다 — 서버 기능이 도달 불가능

`server/src/auth.ts` 는 `POST /api/auth/logout` 을 등록한다(직접 읽어 확인). 원본 Task 15 의 `index.html` 에도 `app.js` 에도 그것을 부르는 코드가 **한 줄도 없다.** 즉 사용자는 한 번 로그인하면 브라우저 쿠키를 손으로 지우기 전까지 나갈 수 없고, 서버가 이미 가진 기능이 조용히 죽어 있다.

**해결**: `#logout-btn` 을 사이드바에 넣고 `logout()` 을 내보낸다(REQ-WEBSHELL-012). 카드 `t5` 의 리드 지시가 로그아웃을 이 SPEC 의 범위로 명시했다.

### 3. `promptText` 가 `returnValue` 를 읽는 시점이 위태롭다

원본은 이렇다.

```js
$('prompt-form').onsubmit = () => resolve($('prompt-dialog').returnValue === 'ok' ? ... : null)
```

`<form method="dialog">` 에서 `dialog.returnValue` 는 다이얼로그가 **닫힐 때** 눌린 버튼의 `value` 로 설정된다. `submit` 이벤트 핸들러는 그 닫힘 처리보다 먼저 도는 경로가 있어, 그 시점의 `returnValue` 는 **이전 호출이 남긴 값**이거나 빈 문자열일 수 있다. 두 번째 호출부터 조용히 틀리는 모양이다.

**해결**: `submit` 이 아니라 다이얼로그의 `close` 이벤트에서 읽는다.

```js
dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok' ? input.value.trim() : null), { once: true })
```

`{ once: true }` 가 함께 필요하다 — 원본의 `onsubmit = ...` 재대입은 매번 덮어써서 누수가 없었지만, `addEventListener` 는 쌓인다.

### 4. 오류를 삼킨다

원본의 방 보관·봇 등록·방 생성 핸들러에는 `try/catch` 가 없다.

```js
await api(`/api/rooms/${r.id}/archive`, { method: 'POST' })
await loadRooms()
```

서버가 `409`(이미 보관된 방) 나 `404` 를 내면 `api()` 가 던지고, 그것은 잡히지 않은 Promise 거부가 되어 **콘솔에만 남고 화면에는 아무 일도 일어나지 않는다.** 사용자에게는 "버튼을 눌렀는데 아무 반응이 없다"로 보인다. 인증 화면에만 오류 표시(`#auth-error`)가 있고 메인 화면에는 없는 것이 원인이다.

**해결**: `#error-toast` 요소를 하나 두고, 액션 함수들이 오류를 잡아 거기 문구를 띄운다(REQ-WEBSHELL-010). AC-WEBSHELL-011 이 서버 오류 응답을 스텁해 문구가 실제로 나타나는지 관측한다.

### 5. `style.css` 가 디자인 토큰을 소비하지 않는다

원본 CSS 는 색을 전부 원시 16진값으로 직접 쓴다(`#313338`, `#dbdee1`, `#5865f2`, ...). 그런데 이 저장소에는 이미 `web/design-tokens.css` 가 있고, `.moai/project/design-dna-discord.md` 가 "M5 작업은 이 토큰을 그대로 갖다 쓰면 된다"고 못 박는다.

값이 어긋나는 곳도 있다. 원본의 본문 텍스트는 `#dbdee1` 인데 토큰의 `--md-text-primary` 는 `#f2f3f5` 이고, 원본의 오류색 `#fa776c` 는 토큰의 `--md-status-error` `#f23f43` 과 다르다. 원본 CSS 는 토큰 파일이 만들어지기 전에 쓰인 것이므로 **토큰이 이긴다.**

**해결**: `style.css` 첫머리에서 `@import url('./design-tokens.css')` 하고 모든 색을 `var(--md-*)` 로 바꾼다. 원시 16진값 0건을 REQ-WEBSHELL-004 관측 2가 기계적으로 잡는다.

**매핑 하나는 판단이 필요했다.** 원본은 `#sidebar` 배경을 `#2b2d31` 로 두는데, 토큰에서 그 값은 `--md-bg-panel` 이고 `--md-bg-sidebar` 는 더 어두운 `#1e1f22` 다. 디자인 DNA 문서를 보면 `#1e1f22` 는 **서버 아이콘 레일**(minidiscord 에 없는 컬럼)이고 `#2b2d31` 이 **채널 사이드바**다. 같은 문서의 "컬럼 수는 3개로 단순화" 절이 서버 레일을 빼라고 말하므로, minidiscord 의 사이드바는 `--md-bg-panel`(`#2b2d31`)을 쓴다. 원본 CSS 의 값과 결과적으로 같다.

### 6. `app.js` 가 전역 스크립트라 아무것도 단독 검증할 수 없다

원본 `app.js` 는 세 가지 성질을 함께 가진다.

1. `<script src="/app.js">` — 모듈이 아니라 전역 스크립트다. `import` 할 수 없다.
2. 파일 끝에 즉시실행 IIFE 가 있어, 읽히는 순간 `/api/rooms` 를 때린다.
3. 폼 핸들러 등록(`$('login-form').onsubmit = ...`)이 최상위에 있어, 그 요소가 없는 문서에서는 `null.onsubmit` 으로 즉시 터진다.

셋이 겹쳐서 **"서버를 띄우고 눈으로 본다" 외의 검증 경로가 원천적으로 없다.** 원본이 수동 확인을 택한 진짜 이유가 이것이다 — 정적 파일이라서가 아니라, 그렇게 쓰였기 때문이다.

**해결**: ES 모듈로 바꾸고, 부트스트랩을 `initApp()` 으로 이름 붙여 내보내며, 액션 로직을 핸들러 본문에서 함수로 끌어낸다. `index.html` 은 인라인 모듈 스크립트로 `initApp()` 을 부른다.

```html
<script type="module">
  import { initApp } from '/app.js'
  initApp()
</script>
```

**형제 SPEC 에 미치는 영향**: `SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001` 은 같은 파일에 함수를 덧붙이고 `initApp()` 안에서 자기 배선을 부르면 된다. 파일이 하나로 유지되므로 원본 구조와 어긋나지 않는다.

### 7. `@fastify/static` 이 등록돼 있지 않다 — 그리고 버전이 원본과 다르다

`server/src/index.ts` 를 직접 읽어 확인했다. `buildServer()` 는 `cookie`·`multipart` 를 등록하지만 `@fastify/static` 은 import 조차 하지 않는다. 반면 `server/package.json` 의 `dependencies` 에는 `"@fastify/static": "^10.1.3"` 이 있다 — **설치는 돼 있고 배선만 없다.**

원본 Global Constraints 는 `@fastify/static ^8`, `@fastify/multipart ^9` 라고 쓰는데 실제 설치본은 `^10.1.3`, `^10.1.1` 이다. Global Constraints 자신이 "버전은 하한선"이라고 명시하므로 이것은 위반이 아니라 **문서 지연**이다. 같은 부류로 `better-sqlite3 ^11 → ^13.0.3`, `vitest ^2 → ^4.1.11`, `typescript ^5 → ^7.0.2` 도 앞서 있다.

**해결**: 원본 Step 4 의 등록 코드를 그대로 쓴다. 다만 **등록 위치는 `buildServer` 의 맨 끝**으로 둔다 — API 라우트가 전부 등록된 뒤에 와일드카드 라우트가 붙게 해서, 순서로 인한 가림 가능성을 구조적으로 없앤다. REQ-WEBSHELL-002 가 그 결과를 관측한다.

**확인하지 않은 것을 정직하게 적어 둔다.** `@fastify/static` v10 이 `prefix: '/'` 등록 시 `GET /api/nope` 에 대해 `404` 를 내는지(`index.html` 로 폴백하지 않는지)는 **실행으로 확인하지 않았다** — 이 워크트리에 `node_modules` 가 없다. 만약 폴백하도록 동작한다면 `wildcard: false` 를 주거나 정적 서빙에 별도 prefix 를 쓰는 방향으로 조정하고, **그 조정 자체를 블로커로 보고한 뒤 진행한다.** AC-WEBSHELL-002 가 어느 쪽이든 기계적으로 판정한다.

### 8. [미해결 — 보존] `plan-v2.md` 의 `web/` 파일 구조에 `design-tokens.css` 가 없다

원본 파일 구조 절은 `web/` 아래를 `index.html`·`app.js`·`style.css` 셋으로 적는데, 실제로는 `web/design-tokens.css` 가 이미 존재한다(카드 `t5` 준비 과정에서 추가). 원본 문서가 그것을 모른다.

**이 SPEC 의 범위 밖이다.** 원본 `plan-v2.md` 는 읽기 전용이고, 이 SPEC 이 그것을 고치지 않는다. 실제 산출물이 네 파일이라는 사실은 `spec.md` §4.7 과 이 문서에 기록해 두는 것으로 충분하다. **미해결**로 남긴다.

## §E.1 수용 기준 전수 훑기 (0.1.0) — "본문이 비어 있어도 통과하는가?"

[HARD] 이 항목은 **모든 기준을 한 부류로 묶어 한 번에 훑은 결과**다. 하나씩 따로 본 것이 아니다. 이 저장소에는 같은 결함 부류가 반복 재생산된 기록이 있다 — **구현 본문이 비어 있어도 통과하는 수용 기준.** 카드 `t2` 에서 세 번, 카드 `t3` 의 감사에서 다시 한 번 나왔다.

훑기 질문은 하나였다: **"이 기준을, 아무것도 하지 않는 구현이 통과하는가?"** 그리고 그 뒤집힌 형태 하나를 더 물었다 — **"이 기준을, 완전히 옳은 구현이 실패하는가?"** (카드 `t3` 의 MF-4 가 그 부류였다.)

| 기준 | 초안 형태 | 훑기 결과 | 채택 형태 |
|------|----------|----------|----------|
| AC-001 정적 서빙 | "`GET /` 가 `200`" | **불충분** — 아무 HTML 이나 통과 | 응답 본문에 `id="auth-view"` 와 `id="main-view"` 가 둘 다 들어 있는지 본다 |
| AC-002 API 비가림 | "`/api/nope` 가 HTML 이 아니다" | **부재 검사** — 정적 서빙을 아예 안 걸어도 통과 | 같은 테스트에서 `GET /` 가 HTML 을 주는 것을 **함께** 단언. 정적 서빙이 없으면 이 절반이 실패한다 |
| AC-003 `id` 유일성 | "중복 `id` 가 없다" | **부재 검사** — 빈 HTML 도 통과 | 필수 `id` 25개 전부 존재를 **함께** 단언 |
| AC-004 모듈 부트스트랩 | "`type="module"` 문자열이 있다" | **불충분** — 주석 안에 있어도 통과 | jsdom 이 파싱한 `<script type="module">` 요소의 본문에 `initApp` 호출이 있는지 본다 |
| AC-005 CSS 토큰 | "원시 16진값이 0건" | **부재 검사** — 빈 파일이 가장 잘 통과 | `@import` 존재 + 첫 선택자보다 앞 + `var(--md-` 12곳 이상을 **함께** 단언 |
| AC-006 export 표면 | "`app.js` 를 import 할 수 있다" | **불충분** — 빈 모듈도 import 된다 | 내보낸 이름 집합을 정렬해 기대 목록과 정확히 대조 |
| AC-007 `api()` 직렬화 | "`api()` 가 던지지 않는다" | **공허** | 스텁 `fetch` 가 받은 인자를 단언 — 경로·헤더·직렬화된 본문·`credentials` 네 가지 |
| AC-008 `401` 분기 | "`401` 이면 던진다" | **불충분** — 두 경로를 구분하지 않음 | 비-`/auth/` 경로는 `showAuth` 효과(`#main-view` 가 `hidden`)까지, `/auth/` 경로는 그 효과가 **없음**을 단언. 두 방향을 같은 테스트에서 본다 |
| AC-009 로그인 | "로그인이 성공한다" | **공허** | 성공 시 `#main-view` 노출 + 방/봇 목록 요청 발생, 실패 시 `#auth-error` 문구가 서버 문구와 일치 |
| AC-010 방 목록 렌더 | "방이 렌더된다" | **불충분** — 보관 방 구분 안 함 | 활성 2 + 보관 1 을 넣고 `#room-list` 2개·`#archived-list` 1개, 활성에만 `.archive-btn` 존재를 단언 |
| AC-011 생성·보관 | "API 를 부른다" | **불충분** — 재적재/오류를 안 봄 | 요청 경로·메서드 + 뒤이은 `GET /api/rooms` 재적재 + 오류 응답 시 `#error-toast` 문구, 세 가지 |
| AC-012 봇 | 위와 같음 | 위와 같음 | 같은 세 가지 |
| AC-013 로그아웃 | "로그아웃 API 를 부른다" | **불충분** | 요청 발생 + `state` 세 필드 초기화 + `#auth-view` 노출 |
| AC-014 시각 | "디자인이 Discord 같다" | **판정 불가** | **MANUAL 로 명시**하고 관측 항목 6개를 반증 가능한 형태로 열거 (§ 아래) |
| AC-015 범위 경계 | "다른 파일을 안 건드린다" | **부재 검사 + 실행 순서 취약** | `spec_base_sha` 기준 상대 diff 로 변경 파일 목록이 정확히 넷인지 **양성** 단언 (`SPEC-SSE-001` AC-SSE-010 선례) |
| AC-016 RED→GREEN | — | 전이 증거는 부재로 쓸 수 없음 | 각 전이의 실패 **원인**이 출력에 보이는지로 판정 |

**AC-014 를 자동 검사인 척하지 않는 것이 이 훑기의 결론 중 하나다.** "CSS 에 `--md-bg-sidebar` 가 쓰였는가" 같은 검사는 시각 충실도를 재는 것처럼 보이지만 실제로는 문자열 존재만 잰다 — 토큰을 엉뚱한 자리에 써도 통과한다. 그 부류는 REQ-WEBSHELL-004 로 옮겨 정직하게 "토큰을 소비한다"만 재게 하고, 시각 충실도는 사람 눈에 남겼다.

**이 표의 마지막 행 아래에 0.1.0 이 적은 결론 하나는 틀렸다.** 두 번째 방향("완전히 옳은 구현이 실패하는가")에 걸린 것이 없다고 적었는데, 독립 감사가 세 건을 잡았다. 왜 놓쳤는지와 다시 훑은 결과는 §E.2 에 있다.

## §E.2 수용 기준 전수 훑기 (0.2.0) — "형제가 옳게 구현하면 실패하는가?"

[HARD] 0.1.0 의 훑기는 두 방향을 물었지만 **범위가 자기 SPEC 안이었다.** 두 번째 방향(옳은 구현이 실패하는가)은 정의상 자기 SPEC 안에서는 보이지 않는다 — 실패를 일으키는 것이 형제 SPEC 의 변경이기 때문이다. 독립 감사(`.moai/reports/t5/plan-audit.md`)가 정확히 그 지점을 짚었다: *"남은 것은 방향 B 이고, 그것은 정의상 자기 SPEC 안에서는 보이지 않는다."*

그래서 질문을 바꿔 열여섯 기준을 **카드 전체 범위에서** 다시 훑었다.

- **방향 A** — 본문이 비어 있는 구현이 이 기준을 통과하는가?
- **방향 B (교정)** — **형제 SPEC(`SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001`)이 자기 요구사항대로 옳게 구현했을 때 이 기준이 실패하는가?**

### 훑기 결과 — 16 기준 × 2 방향 = 32 질문

| 기준 | 방향 A | 방향 B (카드 전체) | 조치 |
|------|--------|-------------------|------|
| AC-001 정적 서빙 | 통과 | 안전 — 형제는 `#auth-view`·`#main-view` 를 지우지 않는다. `web/` 에 파일이 늘어도 이 기준은 개수를 세지 않는다 | 변경 없음 |
| AC-002 API 비가림 | 통과 | 안전 — 형제 셋 다 새 서버 라우트를 만들지 않는다 | 변경 없음 |
| AC-003 `id` 위생 | 통과 | **결함** — WEBCHAT M1 이 `<main id="chat">` 내용물을 교체하며 `#placeholder` 를 지운다 | `REQUIRED_IDS` 에서 `placeholder` 제거(영속 24개), 존재 관측은 AC-015 관측 5로 이관. 소유권을 `spec.md` §4.8 계약 4에 명문화 |
| AC-004 모듈 부트스트랩 | 통과 | **잠재 위험** — 형제가 타입 없는 `script[src]`(예: `rich.js`)를 더하면 마지막 관측이 붉어진다 | 계약 4에 "형제가 더하는 `<script>` 는 반드시 `type="module"`" 을 명문화 |
| AC-005 CSS 토큰 | 통과 | **잠재 위험 셋** — 형제가 `style.css` 에 ① `@import` 앞에 규칙을 넣거나 ② 원시 16진값을 쓰거나 ③ 앞 세 글자가 모두 16진 문자인 선택자를 쓰면 붉어진다 | 계약 5에 세 규칙을 명문화. 세 SPEC 이 실제로 쓰는 이름 전수를 대조해 ③에 걸리는 것이 없음을 확인 |
| AC-006 export 표면 | 통과 | **결함** — `toEqual` 집합 단언이라 형제가 export 를 더하거나 `state` 에 필드를 더하는 순간 실패. `spec.md` 자기 서술과도 모순 | 필수 부분집합 + 형태 단언으로 교체. 형제 필드 부재 단언은 AC-015 관측 7로 이관 |
| AC-007 `api()` 직렬화 | 통과 | 안전 — 계약 6이 `api()` 시그니처와 의미를 동결 | 계약 6에 명문화 |
| AC-008 `401` 분기 | 통과 | 안전 — 같은 이유 | 계약 6에 명문화 |
| AC-009 로그인 | 통과 | **잠재 위험** — 형제가 `login()` 본문에 요청을 더하면 스텁이 "등록되지 않은 경로"로 던진다 | 계약 6: 껍데기 액션 함수 아홉에 네트워크 호출을 더하지 않는다 |
| AC-010 방 목록 렌더 | 통과 | 안전 — 자식 요소를 더하는 것은 무해. 클래스 이름과 보관 버튼 규칙만 동결 | 계약 4에 명문화 |
| AC-011 생성·보관 | 통과 | **잠재 위험** — 호출 순번(`calls[0..3]`) 의존. AC-009 와 같은 부류 | 계약 6이 함께 덮는다 |
| AC-012 봇 목록 | 통과 | **잠재 위험** — WEBCHAT 이 봇 상태 표시를 `#bot-list` 직계 자식으로 붙이면 자식 수 관측이 깨진다 | 계약 4: 상태 표시는 각 봇 항목 요소 **안쪽**에 붙인다 |
| AC-013 로그아웃 | 통과 | 안전 — `EventSource` 는 `fetch` 가 아니므로 스텁에 잡히지 않는다. 계약 6이 `logout()` 본문 수정을 금지 | 계약 6에 명문화 |
| AC-014 시각 (MANUAL) | 판정 불가(명시) | 안전 — 이 SPEC 마감 시점의 점검이다. 형제가 나중에 화면을 바꾸는 것은 이 관측의 대상이 아니다 | 변경 없음 |
| AC-015 범위 경계 | 통과 | **결함** — 허용 예외에 루트 `package-lock.json` 이 빠져 있는데, M1 첫 작업(`npm install -D -w server jsdom`)이 그 파일을 반드시 바꾼다. **계획대로 옳게 실행한 구현이 실패한다** | 허용 집합에 `package-lock.json`(+`server/vitest.config.ts`) 추가. 판정을 "정확히 네 줄"에서 "필수 넷 포함 ∧ 허용 집합 이내"로 완화 |
| AC-016 RED→GREEN | 통과(부재로 쓰지 않음) | 안전 — 시점 기록이다 | 변경 없음 |

### 집계

| 방향 | 질문 수 | 적발 | 내역 |
|------|--------|------|------|
| A — 빈 구현이 통과하는가 | 16 | **0** | 0.1.0 의 주장이 사실이었고, 독립 감사도 같은 결론이었다(48개 중 0건) |
| B — 형제의 옳은 구현이 실패시키는가 | 16 | **3 결함 + 4 잠재 위험** | 결함: AC-003·AC-006·AC-015. 잠재 위험: AC-004·AC-005·AC-009/011·AC-012 |
| 합계 | **32** | **7** | 결함 3건은 기준을 고쳤고, 잠재 위험 4건은 `spec.md` §4.8 계약 조항으로 봉인했다 |

### 두 부류를 가른 원리

일곱 건을 관통하는 성질이 둘 있었다.

1. **소유하지 않은 것을 단언했다** (AC-003 의 `placeholder`, AC-006 의 `toEqual` 집합). 교정: **소유한 것만 단언하고, 소유하지 않은 것에는 침묵한다.**
2. **시점에 따라 참·거짓이 뒤집히는 성질을 시점 무관 영구 기준에 넣었다** (형제 필드의 부재, `#placeholder` 의 존재). 교정: 그런 성질은 **이 SPEC 마감 시점 명령**(AC-015)으로 옮긴다. 영구 테스트(`npm test -w server`)는 형제 둘의 GREEN 게이트이기도 하므로, 거기 있는 기준은 카드가 끝날 때까지 참이어야 한다.

잠재 위험 넷은 기준을 고칠 문제가 아니었다 — 기준은 옳고, 형제가 그것을 모르는 것이 문제였다. 그래서 `spec.md` §4.8 에 계약으로 적었다. **표면이 세 문서에 흩어져 있던 것이 감사가 짚은 근본 원인이므로, 이제 표면은 §4.8 한 곳에만 있다.**

## §F 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| jsdom 이 설치돼 있지 않은 채 착수 | AC-006~013 이 전부 실행 불가. "환경 문제"로 오진해 기준을 지우게 된다 | §C 의 필수 준비 단계를 M1 의 **첫 작업**으로 못 박았다 |
| vitest 4 에서 도크블록 환경 지정이 안 먹음 | 같음 | §C 가 대안(`vitest.config.ts` + `test.projects`)을 미리 적어 뒀다. 어느 쪽을 썼는지 `progress.md` §E.2 에 기록 |
| `@fastify/static` v10 이 API 경로에 `index.html` 로 폴백 | API 가 조용히 HTML 을 돌려준다. 가장 진단하기 어려운 실패 | AC-WEBSHELL-002 가 기계적으로 잡는다. 조정이 필요하면 §D 7번대로 블로커 보고 후 진행 |
| 정적 서빙을 `buildServer` 앞쪽에 등록 | 와일드카드가 API 라우트보다 먼저 붙는다 | §D 7번이 등록 위치를 **맨 끝**으로 고정 |
| `credentials: 'same-origin'` 누락 | 로그인은 되는데 그 뒤 전부 `401`. 서버 쪽 결함으로 오진하기 쉽다 | AC-WEBSHELL-007 이 스텁 `fetch` 가 받은 옵션에서 직접 관측 |
| 테스트가 저장소의 진짜 `data/` 를 연다 | AC-001·002 가 `buildServer()` 를 부른다 | `config.dataDir` 이 게터로 지연 평가되므로 `MINIDISCORD_DATA_DIR` 을 임시 경로로 설정해 격리한다 (`SPEC-SSE-001` progress.md 의 확정된 선례를 그대로 따른다) |
| `MINIDISCORD_WEB_DIR` 미설정 시 기본 경로가 어긋남 | 테스트가 실제 `web/` 를 못 찾아 `404` | 테스트는 `MINIDISCORD_WEB_DIR` 을 저장소의 실제 `web/` 절대 경로로 명시 설정한다. 기본 경로 해석은 별도로 AC-001 에서 관측 |
| `promptText`/`confirm` 을 기계 검증에 끌어들임 | jsdom 의 `<dialog>`·`confirm` 지원 여부에 기준이 매인다 | §C 가 액션 함수를 분리해 그 의존을 끊었다. 다이얼로그는 AC-014 MANUAL |
| `state` 를 재대입으로 갱신 | `export const` 를 import 한 형제 SPEC 이 옛 객체를 계속 본다 | REQ-WEBSHELL-005 가 "재대입되지 않는다"를 명시. `loadRooms` 는 `state.rooms = ...` 필드 대입만 한다 |
| 형제 SPEC 을 위해 지금 필드를 미리 넣음 | `state` 에 `sse`·`workingBots` 등을 미리 넣으면 이 SPEC 이 안 쓰는 죽은 필드가 된다 | REQ-WEBSHELL-005 가 세 필드만 못 박고, §I 안티패턴이 금지. 관측은 AC-015 관측 7(마감 시점 검사) |
| **형제가 §4.8 계약을 읽지 않고 자기 문서의 옛 표면 서술을 따름** | 감사가 짚은 근본 원인의 재발. 세 SPEC 이 다시 서로 다른 약속을 갖게 된다 | `spec.md` §4.8 이 표면의 유일한 자리이고, `spec.md` §1 이 "형제는 표면을 다시 적지 않고 §4.8 을 참조한다"를 명시. 형제 SPEC 교정 라운드가 그 참조로 바꾼다 |
| **형제가 껍데기 액션 함수에 네트워크 호출을 더함** | AC-009·011·012 가 호출 순번 단언이라 함께 붉어지고, 등록되지 않은 경로면 스텁이 던진다 | §4.8 계약 6이 아홉 함수의 호출 순서·개수를 동결하고, 형제의 배선 자리를 `openRoom` 과 형제 자신의 함수로 지정 |
| **형제가 `#bot-list` 직계 자식으로 상태 요소를 붙임** | AC-012 의 자식 수 관측이 깨진다 | §4.8 계약 4가 상태 표시를 각 봇 항목 **안쪽**으로 지정 |
| **형제가 `web/style.css` 에 원시 16진값이나 `@import` 앞 규칙을 넣음** | AC-005 가 형제의 변경 때문에 붉어진다 | §4.8 계약 5가 세 규칙(끝에 덧붙이기 / 원시 색값 금지 / 앞 세 글자 16진 선택자 금지)을 명문화 |
| 시각 확인을 "떠 보였다"로 갈음 | AC-014 가 무엇도 판정하지 않게 된다 | AC-014 가 관측 항목 6개를 반증 가능한 형태로 열거하고, 각 항목의 판정(예/아니오)을 `progress.md` 에 개별 기록하게 한다 |
| 원본 CSS 의 원시 색값을 그대로 옮김 | 토큰과 값이 어긋난 채 굳는다(`#dbdee1` vs `#f2f3f5`) | REQ-WEBSHELL-004 관측 2 가 원시 16진값 0건을 기계적으로 요구 |
| `id` 중복을 CSS 가 가려 준다는 이유로 남김 | 브라우저는 견디지만 `getElementById` 는 조용히 틀린다 | AC-WEBSHELL-003 이 파싱 후 `id` 집합 크기로 잡는다 |

## §G 마일스톤

우선순위 순서다. 앞 마일스톤이 끝나야 다음을 시작할 수 있다.

### M1 — 준비와 정적 서빙 (우선순위 High)

원본: `plan-v2.md` Task 15 Step 4.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-WEBSHELL-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` `§E.1` 에 적는다. M4 의 범위 경계 검사가 이 값을 기준으로 비교한다.
1. **테스트 환경 준비** (§C): `npm install -D -w server jsdom`. 도크블록이 듣는지 최소 테스트로 확인하고, 안 들으면 `vitest.config.ts` 대안으로 간다. **어느 쪽인지와 근거 출력을 기록한다.**
2. `server/test/web-shell.test.ts` 를 만들고 AC-001·002 의 서버 테스트를 쓴다(`MINIDISCORD_DATA_DIR` 임시 격리 + `MINIDISCORD_WEB_DIR` 명시).
3. **RED 확인**: `npm test -w server` → `GET /` 가 `404`. 출력 기록.
4. `web/index.html` 뼈대(빈 껍데기라도 필수 `id` 를 갖춘 것)와 `server/src/index.ts` 정적 서빙 등록을 더한다. 등록은 `buildServer` **맨 끝**.
5. **GREEN 확인**: `npm test -w server` → AC-001·002 통과. `npm run typecheck -w server` → 종료 코드 0.
6. 커밋: `feat: serve the web directory from the server`

수용 기준: AC-WEBSHELL-001, 002, AC-WEBSHELL-016(전이 1-2).

### M2 — 정적 파일 골격 (우선순위 High)

원본: Task 15 Step 1·2.

1. AC-003·004·005 의 테스트를 추가한다.
2. **RED 확인**: `id` 중복 또는 `@import` 부재로 실패. 출력 기록.
3. `web/index.html` 을 완성한다 — 영속 `id` 24개 + 이 SPEC 전용 `#placeholder`, `.sidebar-head` 클래스(§D 1번), `#logout-btn`(§D 2번), `#error-toast`(§D 4번), 인라인 모듈 부트스트랩(§D 6번). **`design-tokens.css` 를 `<link>` 하지 않는다** — 토큰은 `style.css` 의 `@import` 로만 실린다(`spec.md` §4.8 계약 5).
4. `web/style.css` 를 쓴다 — 첫머리 `@import url('./design-tokens.css')`, 색은 전부 `var(--md-*)`, 원시 16진값 0건(§D 5번).
5. **GREEN 확인**: `npm test -w server` 통과.
6. 커밋: `feat: web UI shell markup and design-token stylesheet`

수용 기준: AC-WEBSHELL-003, 004, 005.

### M3 — `app.js` 로직 (우선순위 High)

원본: Task 15 Step 3.

1. AC-006~013 의 테스트를 추가한다. `globalThis.fetch` 스텁 + `web/index.html` 을 읽어 DOM 을 세우는 공통 골격(`acceptance.md` § 공통 테스트 골격)을 쓴다.
2. **RED 확인**: `../../web/app.js` 모듈 부재로 실패. 출력 기록.
3. `web/app.js` 를 쓴다 — REQ-WEBSHELL-005 의 필수 export 18개(`$` 포함), `api()`(006·007), 인증(008), 방(009·010), 봇(011), 로그아웃(012), `initApp()`. `state` 는 세 필드만 초기화한다.
4. **GREEN 확인**: `npm test -w server` 전부 통과, typecheck 0.
5. 커밋: `feat: web UI auth, room list, and bot registry`

수용 기준: AC-WEBSHELL-006, 007, 008, 009, 010, 011, 012, 013, AC-WEBSHELL-016(전이 3-4).

### M4 — 시각 확인과 범위 경계 (우선순위 Medium)

원본: Task 15 Step 5·6.

1. `npm run dev -w server` 로 서버를 띄우고 브라우저에서 AC-014 의 관측 항목 6개를 하나씩 본다. **각 항목의 예/아니오를 `progress.md` §E.2 에 개별 기록한다.** "동작함" 한 줄로 갈음하지 않는다.
2. 범위 경계와 계약 확인(AC-015, 관측 **일곱 개**): `git rev-parse --verify` 로 기준 SHA 를 먼저 확인하고, 그 SHA 로 `git diff --name-only <SHA>` 를 돌려 변경 파일이 필수 넷을 포함하고 허용 집합 이내인지 본다. 이어서 `#placeholder` 존재(관측 5), `index.html` 의 토큰 문자열 부재(관측 6), `state` 필드가 정확히 셋(관측 7)을 확인한다. **기준 커밋 없이 `git diff` 를 쓰지 않는다.**
3. 커밋: `chore: record manual visual verification for the web shell`

수용 기준: AC-WEBSHELL-014, 015.

## §H 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-WEBSHELL-001..016 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)
- §C 의 환경 결정(도크블록인지 `vitest.config.ts` 인지)과 그 근거

## §I 안티패턴 (하지 말 것)

- **원본의 "수동 확인" 방침을 그대로 따르기** — 정적 파일이라는 것이 검증 불가를 뜻하지 않는다. 순수 로직과 DOM 변환은 기계로 잰다 (§C).
- **`app.js` 를 전역 스크립트로 두기** — import 할 수 없고, 즉시실행 IIFE 가 import 시점에 네트워크를 때린다. ES 모듈 + `initApp()` 이다 (§D 6번).
- **액션 로직을 DOM 핸들러 본문 안에 인라인으로 두기** — 다이얼로그를 열지 않고는 아무것도 검증할 수 없다. `createRoom`·`archiveRoom`·`createBot`·`login`·`logout` 으로 끌어낸다 (§C).
- **`api()` 를 주입 가능하게 만들기** — 테스트가 래퍼를 우회하면 `api()` 자체가 검증되지 않는다. `globalThis.fetch` 를 스텁한다 (§B).
- **`credentials: 'same-origin'` 빼기** — 쿠키가 `httpOnly` 라 다른 경로가 없다. 빠지면 로그인 후 전부 `401` 이다.
- **`401` 을 한 갈래로 처리** — 로그인 실패에서 화면을 되돌리면 입력값과 오류 문구가 함께 사라진다. `/auth/` 경로를 가른다 (REQ-WEBSHELL-007).
- **`id="sidebar-top"` 중복 그대로 두기** — 브라우저는 견디지만 `getElementById` 는 첫 번째만 준다. 클래스로 바꾼다 (§D 1번).
- **로그아웃 없이 마감** — 서버에 이미 있는 기능을 도달 불가능하게 남기지 않는다 (§D 2번).
- **`promptText` 를 `submit` 에서 읽기** — `returnValue` 는 닫힘 시점에 정해진다. `close` 이벤트 + `{ once: true }` 다 (§D 3번).
- **오류 삼키기** — `try/catch` 없는 `await api(...)` 는 화면에 아무 일도 일으키지 않는다. `#error-toast` 로 띄운다 (§D 4번).
- **`style.css` 에 원시 16진 색값 쓰기** — 토큰 파일이 이미 있고 값이 일부 다르다. 전부 `var(--md-*)` 다 (§D 5번).
- **토큰 문자열 존재를 시각 검증으로 삼기** — 토큰을 엉뚱한 자리에 써도 통과한다. 시각 충실도는 AC-014 의 MANUAL 관측이 진다 (§E).
- **MANUAL 기준을 "동작함" 한 줄로 갈음하기** — AC-014 는 관측 항목 6개를 개별로 기록한다.
- **정적 서빙을 `buildServer` 앞쪽에 등록** — 와일드카드가 API 보다 먼저 붙는다. 맨 끝이다 (§D 7번).
- **`state` 에 형제 SPEC 필드 미리 넣기** — 이 SPEC 이 쓰지 않는 죽은 필드가 된다. 세 필드만 둔다 (관측: AC-015 관측 7).
- **형제 필드의 부재를 영구 테스트로 단언하기** — `npm test -w server` 는 형제 둘의 GREEN 게이트다. 시점에 따라 뒤집히는 성질은 영구 기준이 아니라 마감 시점 명령에 둔다 (감사 MF-2·MF-4, §E.2).
- **export 집합을 `toEqual` 로 못 박기** — 형제가 이름을 더하는 순간 옳은 구현이 실패한다. 필수 부분집합 + 형태로 단언한다 (감사 MF-2).
- **`#placeholder` 를 영속 필수 id 로 두기** — WEBCHAT 이 `#chat` 내용물을 교체하며 지운다. 영속 24개와 이 SPEC 전용 1개를 가른다 (감사 MF-6).
- **`web/index.html` 에 `design-tokens.css` 를 `<link>` 로 더하기** — 토큰이 두 경로로 실리고 AC-005 관측 1의 의미가 흐려진다. `style.css` 의 `@import` 하나뿐이다 (감사 MF-7).
- **형제가 의존하는 이름을 export 하지 않기** — `$(id)` 가 그 자리였다. 소비자 둘이 계약에 적은 이름은 생산자가 내보내거나, 계약에서 빼야 한다 (감사 MF-3).
- **`enterMain()` 같은 존재하지 않는 이름을 새로 정의해서 맞춰 주기** — 실재하는 이름은 `showMain()` 이다. 형제의 오기를 코드로 흡수하지 말고 형제 문서를 고친다 (`spec.md` §4.8 계약 3).
- **표면을 세 SPEC 이 각자 자기 문서에 적기** — 감사가 짚은 근본 원인이다. 표면은 `spec.md` §4.8 한 곳에만 있고 형제는 그것을 참조한다.
- **`state` 재대입** — `export const` 를 import 한 형제가 옛 객체를 본다. 필드 대입만 한다.
- **채팅·SSE·자동완성·첨부·초대·권한 코드 미리 넣기** — "어차피 같은 카드에서 필요하니까"가 가장 흔한 이유이고, AC-WEBSHELL-015 가 기계적으로 잡는다.
- **새 API 라우트 만들기** — 화면에 필요한 것이 API 에 없어 보이면 중단하고 보고한다. `plan-v2.md` Global Constraints 가 계약 임의 변경을 금지한다.
- **프레임워크·번들러 도입** — Global Constraints 가 바닐라 JS 를 못 박는다.
- **새 워크스페이스(`web`) 만들기** — 루트 `package.json`·CI·원본 파일 구조가 함께 바뀐다. 테스트는 `server/test/` 에 둔다 (§C).
- **서버 테스트 전체를 jsdom 환경으로 돌리기** — `better-sqlite3`·`ws`·실서버 `listen` 을 쓰는 기존 테스트의 환경을 이 SPEC 이 바꿀 이유가 없다. 파일 단위로 가른다 (§C).
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡힌다. `spec_base_sha` 를 기준으로 비교한다 (M1 단계 0).
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 를 먼저 확인한다.
- **테스트가 저장소의 진짜 `data/` 를 열게 두기** — `MINIDISCORD_DATA_DIR` 임시 격리를 먼저 건다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-WEBSHELL-016 의 전이 증거를 만들 수 없다.
- **`web/design-tokens.css` 고치기** — 이 SPEC 은 소비만 한다.

## §J 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — **이 SPEC 의 유일한 규범 근거**(읽기 전용). Global Constraints, 파일 구조, Task 15
- `.moai/project/design-dna-discord.md` — M5 의 구속력 있는 시각 표준
- `web/design-tokens.css` — 그 표준의 실제 CSS 변수 파일 (이미 존재, 고치지 않는다)
- `spec.md` — 이 SPEC 의 GEARS 요구사항(REQ-WEBSHELL-001..014)과 범위 경계
- `acceptance.md` — AC-WEBSHELL-001..016, 공통 테스트 골격, 엣지 케이스
- `progress.md` — 단계별 증거 기록처
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `config` 지연 평가)
- `.moai/specs/SPEC-AUTH-001/` — 인증 API (`register`·`login`·`logout`)
- `.moai/specs/SPEC-ROOM-001/` — 방 API·봇 등록 API
- `.moai/specs/SPEC-SSE-001/` — `spec_base_sha` 상대 diff 범위 경계 판정의 선례(AC-SSE-010), 데이터 디렉터리 격리 결정의 선례
- `.moai/reports/t5/plan-audit.md` — plan 단계 독립 감사(2026-08-27, HEAD `6e9a167`). 이 SPEC 판정 CONDITIONAL PASS, 통합 표면 판정 FAIL. 0.2.0 교정의 근거
- `.moai/specs/SPEC-WEBCHAT-001/`·`.moai/specs/SPEC-WEBRICH-001/` — 형제 SPEC. 이 SPEC 의 `spec.md` §4.8 계약에 결합한다
