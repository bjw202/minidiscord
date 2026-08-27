---
id: SPEC-WEBSHELL-001
title: "minidiscord 웹 UI 껍데기 — 정적 서빙, 로그인, 방 목록, 봇 목록"
version: "0.2.0"
status: draft
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "web/, server/"
lifecycle: spec-anchored
tags: "web-ui, static-serving, login, room-list, bot-list, design-tokens, app-shell"
tier: M
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]
---

# SPEC-WEBSHELL-001 — 웹 UI 껍데기 (정적 서빙 + 로그인 + 방 목록 + 봇 목록)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 15 에서 도출 (칸반 카드 `t5`, 마일스톤 M5). 요구사항 14개·수용 기준 16개로 Tier M 상한(16/16) 안에 든다. 원본 Task 15 가 제안한 "서버 띄우고 눈으로 확인" 검증 방식을 **기계 검증으로 대체**했다 — `app.js` 를 ES 모듈로 만들고 순수 로직을 내보내 jsdom 위에서 vitest 로 재고, 정적 서빙은 이미 쓰이는 `app.inject` 로 재고, 토큰 준수는 `grep` 으로 잰다. 원본 코드 블록에서 발견한 결함 일곱 건은 `plan.md` §D 에 기록하고 의도적으로 이탈했다 — 중복 `id="sidebar-top"`, 로그아웃 경로 부재, `promptText` 의 `returnValue` 읽는 시점, 오류 삼킴, 토큰 파일 미소비, 전역 스크립트라 import 불가, `@fastify/static` 미등록. | manager-spec |
| 0.2.0 | 2026-08-27 | **plan 단계 감사 교정 라운드.** 근거: `.moai/reports/t5/plan-audit.md` (plan-auditor 독립 감사, 2026-08-27, HEAD `6e9a167`). 이 SPEC 판정은 **CONDITIONAL PASS**, 카드 `t5` 의 세 SPEC 을 잇는 통합 표면 판정은 **FAIL**. 이 SPEC 에 배정된 MUST-FIX 다섯 건(MF-2·MF-3·MF-4·MF-6·MF-7)과 관찰 O-4 를 고쳤다. ① **MF-2** — AC-006 이 export 집합과 `state` 를 `toEqual` 로 못 박아 형제가 확장하는 순간 옳은 구현이 실패했다. 소유하지 않은 것에는 침묵하도록 **필수 부분집합 + 형태** 단언으로 다시 썼다. ② **MF-3** — 형제 둘이 의존하는 `$(id)` 를 export 목록에 넣었다(17→18개). 형제가 참조한 `enterMain()` 은 **존재하지 않는다** — 실재하는 이름은 `showMain()` 이며 §4.8 이름 대조표가 그 사실을 명시한다. ③ **MF-4** — `state` 확장 모델을 §4.8 에 단일 해석으로 못 박았다: 이 SPEC 은 세 필드만 초기화하고, 형제는 **자기 필드를 스스로 선언·초기화한다**. 부재 단언은 영구 테스트에서 빼고 이 SPEC 마감 시점 검사(AC-015)로 옮겼다. ④ **MF-6** — `#placeholder` 를 영속 id 에서 분리했다. `#chat` **요소**는 이 SPEC 소유(영속), `#chat` **내용물**은 `SPEC-WEBCHAT-001` 소유. ⑤ **MF-7** — 토큰 로딩 경로를 §4.8 에 단일 경로로 확정했다: `style.css` 의 `@import` 하나뿐이며 `index.html` 에는 `design-tokens.css` 문자열이 **없다**. ⑥ **O-4** — AC-015 허용 집합에 루트 `package-lock.json` 을 더했다. 함께 **REQ-WEBSHELL-015**(형제 결합 계약)를 신설해 14→15개가 됐고, 카드 전체를 놓고 열여섯 기준을 두 방향으로 다시 훑었다(`plan.md` §E.2). **`web/app.js` 를 ES 모듈로 확정한 것은 이 SPEC 의 단독 판단이 아니라 plan-audit 교정 게이트에서의 오케스트레이터 결정이다**(MF-1 해소 방향) — `SPEC-WEBCHAT-001` 의 클래식 스크립트 전제와 `window.eval` 테스트 골격은 그 결정에 따라 폐기되고 ES 모듈 import 로 교정된다. | manager-spec |

---

## 1. 배경과 목적

카드 `t5` (마일스톤 M5)는 `plan-v2.md` 의 Task 15·16·17 — 웹 UI 전체 — 를 담는다. 이 SPEC 은 그 가운데 **Task 15 하나**만 맡는다.

지금까지 카드 `t1`~`t4` 가 만든 것은 전부 서버 쪽이다. HTTP API 도 있고 SSE 배관도 있고 봇 게이트웨이도 있지만, **사람이 브라우저로 열 수 있는 화면이 하나도 없다.** 서버는 `web/` 디렉터리를 서빙하지도 않는다(`server/src/index.ts` 를 직접 읽어 확인 — `@fastify/static` 은 `server/package.json` 에 의존성으로 있지만 `buildServer` 안에서 등록되지 않았다).

이 SPEC 이 끝나면 이런 상태가 된다.

```
브라우저 ──GET /──▶ 서버가 web/index.html 을 서빙
  ↓ 회원가입 / 로그인 (POST /api/auth/register, /api/auth/login)
메인 화면: [방 목록 사이드바] + [빈 채팅 영역(자리표시자)]
  ↓ 방 만들기 / 방 보관 / 봇 등록 / 로그아웃
목록이 다시 그려진다
```

**이 SPEC 이 만드는 것은 껍데기와 그 껍데기가 형제 SPEC 에 넘길 계약이다.** 실제 대화 화면은 여기 없다. `web/app.js` 가 내보내는 `state` 객체와 `api()` 래퍼가 이 SPEC 에서 확정되고, 형제 둘이 그것에 결합한다.

| 소비자 | 무엇을 이어 붙이는가 | 어느 태스크 |
|--------|---------------------|------------|
| `SPEC-WEBCHAT-001` | 채팅 렌더링, `EventSource` 수신, `@` 자동완성, 봇 상태 | Task 16 |
| `SPEC-WEBRICH-001` | 첨부 파일 표시, 봇 초대 모달, 권한 승인 버튼 | Task 17 |

그래서 `state` 의 모양과 `api(path, opts)` 의 시그니처는 **이 SPEC 에서 고정된다.** 나중에 바꾸면 형제 둘의 코드가 함께 바뀐다. §4.3 의 REQ-WEBSHELL-005 가 그 표면을 문자 그대로 못 박는 이유다.

**형제가 읽어야 하는 계약 전문은 §4.8(REQ-WEBSHELL-015)에 있다.** 모듈 형식, `state` 확장 방식, export 최소 집합, 요소 소유권, 토큰 로딩 경로, 액션 함수의 네트워크 호출 고정 — 여섯 계약이 거기 한 곳에 모여 있다. 형제 SPEC 은 자기 문서에 이 표면을 **다시 적지 않고 §4.8 을 참조한다.** 각자 자기 문서에 표면을 적었기 때문에 세 SPEC 이 서로 다른 약속을 적게 됐다는 것이 plan 단계 감사의 진단이다(`.moai/reports/t5/plan-audit.md` 권고 1번).

또 하나. 이 SPEC 은 **화면의 시각 기준도 확정한다.** `.moai/project/design-dna-discord.md` 와 그것을 CSS 변수로 옮긴 `web/design-tokens.css` 가 M5 의 구속력 있는 시각 표준이고, 그 파일은 이미 저장소에 있다. `web/style.css` 는 색을 다시 선언하지 않고 그 토큰을 소비한다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 15, Global Constraints, 파일 구조. `.moai/project/design-dna-discord.md`, `web/design-tokens.css`.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 껍데기(shell) | 로그인 화면과, 로그인 후 보이는 [사이드바 + 빈 채팅 영역] 레이아웃. 대화 내용은 이 SPEC 밖이다 |
| 정적 서빙 | `@fastify/static` 이 `web/` 디렉터리의 파일을 HTTP 로 그대로 내보내는 것. `GET /` 는 `index.html` 을 준다 |
| `api()` 래퍼 | `web/app.js` 가 내보내는 `fetch` 감싸개. JSON 직렬화·쿠키 동반·오류 변환·`401` 처리를 한 곳에 모은다 |
| `state` | `web/app.js` 의 모듈 수준 객체 하나. 방 목록·봇 목록·현재 방을 담는다. 형제 SPEC 이 필드를 더한다 |
| 디자인 토큰 | `web/design-tokens.css` 의 `--md-*` CSS 변수들. Discord 다크 테마 분석 결과를 옮긴 것 |
| 활성 방 / 보관된 방 | `GET /api/rooms` 응답의 `active` 배열과 `archived` 배열. 보관된 방은 읽기 전용으로 남는다 |
| 부트스트랩 | `initApp()`. 폼 핸들러를 걸고 세션이 살아 있는지 한 번 물어보는 진입 함수. `index.html` 의 인라인 모듈 스크립트가 부른다 |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 은 데이터베이스도 스키마도 서버 API 도 만들지 않는다. 이미 머지된 것을 그대로 소비한다.

| 출처 | 받아 쓰는 것 | 실제 코드로 확인한 모양 |
|------|-------------|------------------------|
| `SPEC-CORE-001` | `buildServer()`, `config` | `server/src/index.ts`, `server/src/config.ts` |
| `SPEC-AUTH-001` | `POST /api/auth/register` | 본문 `{username, password}`. 성공 `201 {ok:true}`. `password` 8자 미만이면 `400`, 중복 이름 `409` |
| `SPEC-AUTH-001` | `POST /api/auth/login` | 본문 `{username, password}`. 성공 `200 {ok:true}` + `md_session` 쿠키(`httpOnly`). 실패 `401 {error}` |
| `SPEC-AUTH-001` | `POST /api/auth/logout` | 본문 없음. 항상 `200 {ok:true}`, 쿠키 삭제 |
| `SPEC-ROOM-001` | `GET /api/rooms` | `{ active: RoomRow[], archived: RoomRow[] }`. `RoomRow = {id, name, status, created_at, archived_at}` |
| `SPEC-ROOM-001` | `POST /api/rooms` | 본문 `{name}`. 성공 `201` + `RoomRow` 다섯 키. 빈 이름 `400` |
| `SPEC-ROOM-001` | `POST /api/rooms/:id/archive` | 본문 없음. 성공 `200 {ok:true}`. 없는 방 `404`, 이미 보관 `409` |
| `SPEC-ROOM-001` | `GET /api/bots` | `{id, name, description}[]`, 이름 오름차순 |
| `SPEC-ROOM-001` | `POST /api/bots` | 본문 `{name, description}`. 성공 `201` + 봇 행. 빈 이름 `400`, 중복 `409` |
| 저장소 산출물 | `web/design-tokens.css` | 이미 존재하는 `--md-*` 변수 집합. 이 SPEC 이 고치지 않는다 |

`SPEC-BOT-001` 은 **의존이 아니다.** 초대 발급(`POST /api/rooms/:id/invites`)은 이 SPEC 이 부르지 않는다 — 봇 초대 모달은 `SPEC-WEBRICH-001` 소관이다. `SPEC-SSE-001`·`SPEC-MSG-001`·`SPEC-GATEWAY-001`·`SPEC-PERM-001` 도 마찬가지로 의존이 아니다.

**원본 문서와 실제 코드가 어긋나는 지점**은 `plan.md` §D 에 전부 기록했다. 어긋날 때는 코드가 이긴다.

---

## 4. 요구사항 (GEARS)

### 4.1 정적 서빙 (서버 쪽 유일한 변경)

**REQ-WEBSHELL-001** (Ubiquitous)
`buildServer()` 는 `@fastify/static` 을 `root` = `process.env.MINIDISCORD_WEB_DIR ?? <저장소 루트>/web`, `prefix: '/'` 로 등록해야 한다. 등록 후 `GET /` 는 `200` 과 `text/html` 로 `web/index.html` 을 내보내고, `GET /style.css`·`GET /app.js`·`GET /design-tokens.css` 는 각각 `200` 으로 해당 파일 내용을 내보내야 한다.

`@fastify/static` 은 이미 `server/package.json` 의 의존성이다(`^10.1.3`). 이 SPEC 은 새 의존성을 **런타임 쪽에** 추가하지 않고, 등록만 더한다.

**REQ-WEBSHELL-002** (Unwanted — shall not)
정적 서빙 등록은 기존 API 라우트를 가려서는 안 된다. 등록 후에도 `GET /api/health` 는 `200` 과 `{"ok":true}` JSON 을 내야 하고, 존재하지 않는 API 경로(`GET /api/nope`)는 `404` 를 내야 하며 그 본문이 `index.html` 의 HTML 이어서는 안 된다.

정적 파일 서빙을 `prefix: '/'` 로 걸면 와일드카드 라우트(`GET /*`)가 생긴다. 그것이 API 를 삼키면 **웹 화면은 잘 뜨는데 API 가 조용히 HTML 을 돌려주는** 진단하기 어려운 실패가 된다. 그래서 부재가 아니라 존재로 관측한다 — 헬스 라우트가 여전히 JSON 을 내는 것과, 없는 API 경로가 HTML 이 아닌 `404` 를 내는 것 둘 다 본다.

### 4.2 파일 골격

**REQ-WEBSHELL-003** (Ubiquitous)
`web/index.html` 은 다음을 모두 만족해야 한다.

1. 문서 안의 모든 `id` 속성 값이 **유일**하다. 같은 값이 두 번 나타나면 안 된다.
2. **영속 id 24개**가 모두 정확히 한 번씩 존재한다 — `auth-view`, `login-form`, `login-username`, `login-password`, `register-form`, `reg-username`, `reg-password`, `auth-error`, `main-view`, `sidebar`, `room-list`, `archived-box`, `archived-list`, `bot-list`, `new-room-btn`, `new-bot-btn`, `logout-btn`, `chat`, `prompt-dialog`, `prompt-form`, `prompt-label`, `prompt-input`, `prompt-ok`, `error-toast`.
3. **이 SPEC 전용 id 1개**가 존재한다 — `placeholder`. `#chat` 안의 자리표시자이며, 형제 SPEC 이 `#chat` 내용물을 채우면서 제거해도 된다(§4.8 참조).
4. `web/app.js` 를 **ES 모듈**로 불러오고, `initApp()` 을 호출하는 인라인 모듈 스크립트를 포함한다.
5. `<html lang="ko">` 이며 `<meta charset="utf-8">` 을 포함한다.

원본 `plan-v2.md` Task 15 Step 1 의 HTML 은 `id="sidebar-top"` 을 **두 번** 쓴다(원본 2989행·2999행 — 직접 읽어 확인). `document.getElementById` 는 첫 번째만 돌려주므로 두 번째 블록은 스타일 대상에서 조용히 빠진다. 관측 1이 그 부류 전체를 잡는다 (`plan.md` §D 1번).

**관측 2와 관측 3이 갈라져 있는 이유** (감사 MF-6). `SPEC-WEBCHAT-001` 의 첫 마일스톤은 `<main id="chat">` 의 **내용물을 통째로 교체한다.** `placeholder` 를 영속 id 로 두면, 형제가 자기 요구사항대로 옳게 구현한 순간 이 SPEC 의 영구 테스트(`server/test/web-shell.test.ts`, `npm test -w server` 에 계속 실린다)가 붉어진다. 그래서 소유권을 갈랐다 — **`#chat` 요소 자체는 이 SPEC 소유(영속), `#chat` 의 내용물은 `SPEC-WEBCHAT-001` 소유.** 영구 테스트(AC-003)는 관측 2만 보고, 관측 3은 이 SPEC 마감 시점 검사(AC-015)가 본다.

**REQ-WEBSHELL-004** (Ubiquitous)
`web/style.css` 는 `web/design-tokens.css` 를 소비해야 한다. 구체적으로

1. 파일 앞부분에 `@import` 로 `design-tokens.css` 를 불러오며, 그 `@import` 줄은 첫 번째 선택자 블록보다 **앞에** 있다.
2. 파일 안에 **원시 색상 리터럴이 하나도 없다** — `#rrggbb`·`#rgb`·`#rrggbbaa` 형태의 16진 색상 값이 0건이다. 색은 전부 `var(--md-*)` 로 참조한다.
3. `var(--md-` 참조가 12곳 이상 나타난다.

관측 2만으로는 색을 아예 안 쓴 빈 파일도 통과한다. 그래서 관측 3이 함께 붙는다 — **없음**이 아니라 **있음**으로 재기 위해서다.

### 4.3 `app.js` 공개 표면 (형제 SPEC 이 결합하는 계약)

**REQ-WEBSHELL-005** (Ubiquitous)
`web/app.js` 는 ES 모듈이어야 하며, 다음 **18개 이름을 모두** 내보내야 한다. 이 목록이 `SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001` 이 결합하는 **필수 표면**이다 — 형제 SPEC 은 여기에 이름을 **더할 수 있고**, 이 목록의 이름을 지우거나 시그니처를 바꿀 수는 없다.

```js
export const state = {
  rooms: { active: [], archived: [] },
  bots: [],
  currentRoomId: null,
}
export function $(id)                         // document.getElementById 축약 — 형제 둘이 의존한다
export async function api(path, opts = {})   // fetch 래퍼
export function initApp()                     // 부트스트랩 (index.html 이 부른다)
export function showAuth()
export function showMain()
export function renderRooms()
export function renderBots()
export async function loadRooms()
export async function loadBots()
export async function login(username, password)
export async function register(username, password)
export async function logout()
export async function createRoom(name)
export async function archiveRoom(id)
export async function createBot(name, description)
export async function openRoom(id)
export function promptText(label)
```

`state` 는 **모듈 수준 상수 객체**이며 재대입되지 않는다. 이 SPEC 이 초기화하는 것은 위 세 필드뿐이다. 형제 SPEC 이 자기 필드를 어떻게 더하는지는 §4.8 계약 2번이 단일 해석으로 못 박는다 — **이 SPEC 은 형제의 필드를 미리 선언하지 않고, 형제는 자기 필드를 스스로 초기화한다.**

`$` 를 내보내는 것도 **원본에서 바꾼 것**이다. 원본 `app.js` 는 `$` 를 파일 내부 지역 함수로만 두는데, 형제 SPEC 둘이 자기 계약 문서에서 이 이름을 이미 의존 표면으로 적었다(감사 MF-3). 생산자가 만들지 않는 이름을 소비자 둘이 계약에 적은 상태였으므로, **가장 짧은 해결인 export 추가**를 택한다 — 형제 둘이 각자 지역 헬퍼를 중복 정의하는 것보다 낫고, 셋이 같은 DOM 접근 방식을 쓰게 된다.

`login`/`register`/`logout`/`createRoom`/`archiveRoom`/`createBot` 을 별도 함수로 내보내는 것은 원본에 없는 **분리**다. 원본은 이 로직을 DOM 이벤트 핸들러 본문 안에 인라인으로 두는데, 그러면 다이얼로그를 실제로 열지 않고서는 어떤 것도 검증할 수 없다 (`plan.md` §D 6번).

**REQ-WEBSHELL-006** (When — 이벤트 구동)
`api(path, opts)` 가 호출되면 다음을 해야 한다.

1. `opts.body` 가 있고 `FormData` 가 아니면 `content-type: application/json` 헤더를 붙이고 본문을 `JSON.stringify` 한다.
2. `fetch(path, { credentials: 'same-origin', ...opts })` 를 호출한다.
3. 응답이 `res.ok` 면 파싱한 JSON 을 반환한다.
4. 응답이 `res.ok` 가 아니면 응답 본문의 `error` 필드를 메시지로 하는 `Error` 를 던진다. `error` 필드가 없으면 `HTTP <status>` 를 메시지로 쓴다.

`credentials: 'same-origin'` 이 빠지면 `md_session` 쿠키가 동반되지 않아 **로그인은 성공하는데 그다음 모든 요청이 `401`** 이 된다. 서버가 그 쿠키를 `httpOnly` 로 설정하므로(`server/src/auth.ts` 직접 확인) JS 로 우회할 방법이 없다.

**REQ-WEBSHELL-007** (When — 미인증 감지)
`api()` 가 `401` 응답을 받고 그 요청 경로가 `/auth/` 를 포함하지 **않으면**, `showAuth()` 를 호출한 뒤 오류를 던져야 한다. 경로가 `/auth/` 를 포함하면 `showAuth()` 를 호출하지 않고 오류만 던진다.

로그인 실패(`401`)에서 화면을 로그인 뷰로 되돌리면, 사용자가 방금 입력한 값과 오류 문구가 함께 사라진다. 두 경로를 갈라야 하는 이유가 그것이다.

### 4.4 인증 화면

**REQ-WEBSHELL-008** (When — 이벤트 구동)
로그인 폼이 제출되면 `login(username, password)` 가 `POST /api/auth/login` 을 부르고, 성공하면 메인 뷰로 전환하며 방 목록과 봇 목록을 적재해야 한다. 실패하면 화면은 인증 뷰에 머물고 `#auth-error` 에 서버가 준 오류 문구가 보여야 한다(`hidden` 속성이 제거된다).

회원가입 폼이 제출되면 `register(username, password)` 가 `POST /api/auth/register` 를 부르고, 성공하면 같은 자격으로 이어서 로그인한다.

### 4.5 방 목록과 봇 목록

**REQ-WEBSHELL-009** (When — 이벤트 구동)
`renderRooms()` 가 호출되면 다음을 해야 한다.

1. `#room-list` 의 기존 내용을 지우고 `state.rooms.active` 의 각 방마다 `.room-item` 요소 하나를 만든다. 요소는 `# <방 이름>` 을 보이고, 방 보관 버튼(`.archive-btn`) 하나를 자식으로 갖는다.
2. `state.currentRoomId` 와 같은 `id` 의 방 요소에는 `active` 클래스가 붙는다.
3. `#archived-list` 의 기존 내용을 지우고 `state.rooms.archived` 의 각 방마다 `.room-item` 요소 하나를 만든다. **보관된 방 요소에는 `.archive-btn` 이 없다.**

보관된 방을 또 보관할 수는 없다(서버가 `409` 를 낸다). 버튼이 거기 있으면 누를 때마다 오류만 난다.

**REQ-WEBSHELL-010** (When — 이벤트 구동)
`createRoom(name)` 은 `POST /api/rooms` 를 부른 뒤 `loadRooms()` 로 목록을 다시 적재해야 한다. `archiveRoom(id)` 은 `POST /api/rooms/<id>/archive` 를 부른 뒤 같은 재적재를 해야 한다. 두 함수 모두 서버가 오류를 내면 그 오류를 삼키지 않고 `#error-toast` 에 문구를 보여야 한다.

**REQ-WEBSHELL-011** (When — 이벤트 구동)
`renderBots()` 는 `#bot-list` 를 지우고 `state.bots` 의 각 봇마다 요소 하나를 만들어 봇 이름을 보여야 한다. `createBot(name, description)` 은 `POST /api/bots` 를 부른 뒤 `loadBots()` 로 목록을 다시 적재해야 한다.

**REQ-WEBSHELL-012** (When — 이벤트 구동)
`logout()` 이 호출되면 `POST /api/auth/logout` 을 부르고, `state.rooms` 를 빈 모양(`{active: [], archived: []}`)으로, `state.bots` 를 빈 배열로, `state.currentRoomId` 를 `null` 로 되돌린 뒤 `showAuth()` 를 호출해야 한다. `#logout-btn` 클릭이 이 함수를 부른다.

서버는 `POST /api/auth/logout` 을 이미 제공한다(`server/src/auth.ts` 직접 확인). 원본 `plan-v2.md` Task 15 에는 그것을 부르는 UI 가 **없다** — 서버 기능이 도달 불가능한 상태였다 (`plan.md` §D 2번).

### 4.6 시각 기준

**REQ-WEBSHELL-013** (Ubiquitous)
로그인 후 화면은 `.moai/project/design-dna-discord.md` 가 규정한 Discord 다크 테마를 따라야 한다 — 2단 레이아웃(사이드바 `--md-sidebar-width` + 채팅 영역), 사이드바 배경이 채팅 영역 배경보다 어두움, 밝은 텍스트/어두운 배경, 사이드바 카테고리 라벨은 작은 대문자 흐린 텍스트, 굵은 테두리 없음(구분선만), 그림자 없음.

**이 요구사항은 사람 눈으로만 판정한다.** AC-WEBSHELL-014 가 이것을 **MANUAL** 로 명시하고, 무엇을 볼지를 반증 가능한 형태로 적는다. 기계로 잴 수 있는 부분(원시 색상 부재, 토큰 참조 수)은 REQ-WEBSHELL-004 가 이미 가져갔으므로 여기 겹쳐 두지 않는다.

### 4.7 범위 경계 (금지)

**REQ-WEBSHELL-014** (Unwanted — shall not)
이 SPEC 의 구현은 다음을 만들어서는 안 된다.

- 채팅 메시지 렌더링, 메시지 입력창, `EventSource` 연결, `@` 자동완성, 봇 상태 표시 — `SPEC-WEBCHAT-001` 소관
- 첨부 파일 표시·업로드, 봇 초대 모달, 권한 승인 버튼 — `SPEC-WEBRICH-001` 소관
- 새 서버 라우트, `server/src/db.ts` 의 `SCHEMA` 변경, 새 서버 소스 파일

**이 SPEC 이 만드는 새 파일은 `web/index.html`·`web/style.css`·`web/app.js` 셋이고, 고치는 기존 소스 파일은 `server/src/index.ts` 하나다.** `web/design-tokens.css` 는 이미 존재하며 고치지 않는다.

"이 SPEC 이 만들지 않았다"는 판정은 절대 파일 목록이 아니라 **`spec_base_sha` 기준 상대 diff** 가 진다 — 형제 SPEC 이 언제 실행되든 흔들리지 않으면서, 이 SPEC 의 구현자가 채팅 코드를 미리 넣는 것은 그대로 잡는다 (`SPEC-SSE-001` AC-SSE-010 의 선례를 따른다).

### 4.8 형제 SPEC 이 결합하는 계약 (카드 `t5` 공유 표면)

**REQ-WEBSHELL-015** (Ubiquitous)
이 SPEC 은 카드 `t5` 의 공유 표면 소유자다. 아래 여섯 계약이 그 표면의 전문이며, `SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001` 은 여기에 **정확히 하나의 해석으로** 결합해야 한다. 각 계약 문장은 어느 기계 관측이 그것을 판정하는지를 함께 적는다.

이 절이 존재하는 이유는 감사 보고서(`.moai/reports/t5/plan-audit.md`)의 권고 1번이다 — *"세 SPEC 이 각자 자기 문서에 표면을 적는 한 같은 종류의 어긋남이 다시 생긴다."* 표면은 여기 한 곳에만 적히고, 형제 둘은 자기 문서에 표면을 **다시 적지 않고 이 절을 참조한다.**

#### 계약 1 — `web/app.js` 는 ES 모듈이다 (오케스트레이터 결정)

`web/app.js` 는 `<script type="module">` 로 실려 `export` 문을 쓴다. 형제 SPEC 의 테스트는 `await import('../../web/app.js')` 로 모듈을 적재한다. **`window.eval` 로 파일 원문을 감싸 실행하는 클래식 스크립트 골격은 쓰지 않는다** — `export` 토큰에서 `SyntaxError` 로 죽는다.

**이 결정의 출처는 이 SPEC 의 단독 판단이 아니다.** plan-audit 교정 게이트(2026-08-27)에서 오케스트레이터가 감사 MF-1 을 이 방향으로 해소하기로 결정했고, `SPEC-WEBCHAT-001` 의 클래식 스크립트 전제와 그 위에 세워진 테스트 골격은 그 결정에 따라 교정된다. 형제의 준수 근거는 이 SPEC 의 선택이 아니라 그 결정이다.

관측: AC-WEBSHELL-004(타입 없는 `script[src]` 0건 + `import { initApp } from` 형태), AC-WEBSHELL-006(모듈 import 성공).

#### 계약 2 — `state` 는 열린 객체이고, 형제는 자기 필드를 스스로 초기화한다

`export const state` 는 재대입되지 않는 모듈 수준 객체다. 소유가 이렇게 갈린다.

| 필드 | 소유자 | 초기값 |
|------|--------|--------|
| `rooms` | 이 SPEC | `{ active: [], archived: [] }` |
| `bots` | 이 SPEC | `[]` |
| `currentRoomId` | 이 SPEC | `null` |
| 그 밖의 모든 필드 | 그 필드를 쓰는 형제 SPEC | **그 형제가 스스로 초기화한다** |

[HARD] **이 SPEC 은 `sse`·`workingBots`·`staleTimers`·`staleBots` 를 비롯한 어떤 형제 필드도 선언하지 않는다.** 형제 SPEC 이 그 필드가 이미 초기화돼 있다고 가정하면 첫 접근에서 `TypeError` 가 난다(감사 MF-4 가 정확히 그 경로를 짚었다). 형제는 자기 필드를 자기 초기화 코드에서 만든다 — 예: `SPEC-WEBCHAT-001` 이 `state.staleTimers` 를 쓰려면 그 SPEC 이 `state.staleTimers = {}` 를 자기 코드에 둔다.

[HARD] 반대 방향도 함께 못 박는다. **이 SPEC 의 영구 테스트는 형제 필드의 부재를 단언하지 않는다.** 부재 단언은 이 SPEC 의 마감 시점 검사(AC-WEBSHELL-015)에만 있고, `npm test -w server` 에 계속 실리는 기준(AC-WEBSHELL-006)은 세 필드의 **존재와 초기값**만 본다. 형제가 필드를 더해도 이 SPEC 의 기준은 붉어지지 않는다.

관측: AC-WEBSHELL-006(세 필드 존재·초기값·형태), AC-WEBSHELL-015(마감 시점 세 필드뿐).

#### 계약 3 — export 는 **필수 최소 집합**이고, 형제는 더할 수 있다

REQ-WEBSHELL-005 의 18개 이름이 필수 집합이다. 형제 SPEC 은 여기에 이름을 더할 수 있다(`renderMessage`, `sendMessage`, `decorate` 등). **이 SPEC 의 기준은 필수 18개의 존재와 형태만 보고, 더해진 이름에는 침묵한다** — 형제가 export 를 더한다는 이유로 이 SPEC 의 기준이 붉어지는 일은 없다(감사 MF-2).

[HARD] **이름 대조표 — 형제 문서에 등장했으나 실재하지 않는 이름.**

| 형제 문서의 표기 | 실제 | 조치 |
|------------------|------|------|
| `enterMain()` | **존재하지 않는다.** 이 SPEC 은 그런 이름을 정의한 적이 없다 | 실재하는 이름은 `showMain()` 이다. 형제 SPEC 은 `enterMain()` 참조를 **제거한다** — 새로 정의하지 않는다 |
| `$(id)` | 존재한다(0.2.0 에서 추가) | 그대로 import 해 쓴다 |
| `showMain()` / `showAuth()` | 존재한다 | 그대로 |
| `openRoom(id)` | 존재하되 **본체는 최소 구현**(`currentRoomId` 갱신 + 재렌더)이다 | `SPEC-WEBCHAT-001` 이 본체를 채운다. 이름과 시그니처는 바꾸지 않는다 |

관측: AC-WEBSHELL-006(필수 18개 존재 + 형태, 초과분 불문).

#### 계약 4 — 요소 소유권

| 요소 | 소유자 | 형제가 할 수 있는 것 |
|------|--------|---------------------|
| 영속 id 24개 (REQ-WEBSHELL-003 관측 2) | 이 SPEC | **지우지 않는다.** 이 SPEC 의 영구 테스트가 존재를 계속 단언한다 |
| `#chat` 요소 | 이 SPEC | 지우지 않는다 |
| `#chat` 의 **내용물** | `SPEC-WEBCHAT-001` | 통째로 교체해도 된다 |
| `#placeholder` | 이 SPEC(마감 시점까지) | `SPEC-WEBCHAT-001` 이 `#chat` 내용물을 채우면서 **제거하거나 `hidden` 으로 둘 수 있다** |
| `#bot-list` 의 직계 자식 | 이 SPEC — 자식 수 == `state.bots.length` | 봇 상태 표시는 **각 봇 항목 요소 안쪽**에 붙인다. `#bot-list` 의 직계 자식으로 별도 요소를 더하면 AC-WEBSHELL-012 가 붉어진다 |
| `.room-item` / `.archive-btn` | 이 SPEC | 클래스 이름과 "보관된 방에는 `.archive-btn` 이 없다"는 규칙을 바꾸지 않는다. 자식 요소를 더하는 것은 무해하다 |
| 새로 더하는 id | 형제 SPEC | 문서 전체에서 **유일**해야 한다(AC-WEBSHELL-003 관측 1이 카드 전체에 계속 적용된다) |
| 새로 더하는 `<script>` | 형제 SPEC | **반드시 `type="module"` 을 단다.** 타입 없는 `script[src]` 를 더하면 AC-WEBSHELL-004 가 붉어진다 |

관측: AC-WEBSHELL-003, AC-WEBSHELL-004, AC-WEBSHELL-012.

#### 계약 5 — 디자인 토큰 로딩 경로는 하나뿐이다

[HARD] `web/design-tokens.css` 는 **`web/style.css` 첫머리의 `@import url('./design-tokens.css')` 로만** 실린다. `web/index.html` 은 `style.css` 하나만 `<link>` 하며, **`index.html` 에는 `design-tokens.css` 라는 문자열이 나타나지 않는다.**

[HARD] 따라서 형제 SPEC 이 토큰 로딩을 확인할 때 쓰는 명령은 이것이다.

```bash
grep -q "design-tokens.css" web/style.css     # 올바름
grep -q "design-tokens.css" web/index.html    # 틀림 — 옳은 구현에서 항상 실패한다
```

두 번째 형태는 감사 MF-7 이 잡은 "옳은 구현이 실패하는 기준"이다. 형제가 그것을 고치려고 `index.html` 에 `<link>` 를 더하면 토큰이 두 경로로 실리고 AC-WEBSHELL-005 관측 1(`@import` 정확히 한 줄)의 의미가 흐려진다. **`index.html` 에 토큰 `<link>` 를 더하지 않는다.**

형제 SPEC 이 `web/style.css` 에 규칙을 더할 때 지킬 것 셋:
1. 규칙은 파일 **끝에 덧붙인다.** `@import` 줄보다 앞에 선택자 블록을 넣지 않는다(AC-WEBSHELL-005 관측 2).
2. **원시 16진 색상 리터럴을 쓰지 않는다.** 색은 전부 `var(--md-*)` 다(관측 3).
3. 새 id·클래스 선택자의 **앞 세 글자가 모두 16진 문자(`0-9a-f`)인 이름을 쓰지 않는다.** AC-WEBSHELL-005 관측 3의 정규식이 그런 선택자를 색상 리터럴로 오탐한다. 현재 세 SPEC 이 쓰는 이름 가운데 이에 걸리는 것은 없다(`#messages`·`#composer`·`#autocomplete`·`#msg-input`·`#file-input`·`#send-btn`·`#room-*`·`#invite-btn` 전부 앞 세 글자에 비-16진 문자가 있다).

관측: AC-WEBSHELL-005.

#### 계약 6 — 껍데기 액션 함수는 네트워크 호출을 더 받지 않는다

[HARD] 이 SPEC 이 소유하는 아홉 함수 — `api`, `login`, `register`, `logout`, `loadRooms`, `loadBots`, `createRoom`, `archiveRoom`, `createBot` — 의 **네트워크 호출 순서와 개수는 고정이다.** 형제 SPEC 은 이 함수들 본문에 `fetch`/`api()` 호출을 더하지 않는다.

이유는 기계적이다. AC-WEBSHELL-009·011·012 는 스텁 `fetch` 가 받은 호출을 **순번(`calls[0]`·`calls[1]`…)으로** 단언한다. 형제가 `login()` 안에 요청을 하나 더하면 그 순번이 밀려 세 기준이 함께 붉어지고, 등록되지 않은 경로면 스텁이 그 자리에서 던진다. **형제의 배선은 `openRoom(id)` 본체와 형제 자신의 함수 안에 둔다** — 그 두 자리는 이 SPEC 의 기준이 관측하지 않는다.

`EventSource` 는 `fetch` 가 아니므로 이 계약의 적용 대상이 아니다. 다만 `logout()` 이 연결을 닫아야 한다면, 형제가 `logout()` 본문을 고치는 대신 자기 정리 함수를 `openRoom`/자기 배선에서 관리한다.

관측: AC-WEBSHELL-007, AC-WEBSHELL-009, AC-WEBSHELL-011, AC-WEBSHELL-012, AC-WEBSHELL-013.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자를 명시한다.

### Out of Scope — 채팅 화면과 실시간 수신 (`SPEC-WEBCHAT-001`, Task 16)

- 메시지 목록 렌더링, 메시지 입력창, 전송 처리, 메시지 그룹핑
- 브라우저 `EventSource` 연결과 재접속, `message`/`bot_status` 이벤트 처리
- `@TO`/`@CC` 자동완성 팝업
- 봇 working/idle/stale 상태 표시. `state.workingBots`·`staleTimers`·`staleBots` 필드는 그 SPEC 이 더하며 **그 SPEC 이 스스로 초기화한다** — 이 SPEC 은 그 필드를 선언하지 않는다(§4.8 계약 2)
- `#chat` 의 **내용물**. 이 SPEC 은 `#chat` 요소와 그 안의 `#placeholder` 자리표시자만 두고, 내용물의 소유권은 그 SPEC 에 넘긴다(§4.8 계약 4)
- `openRoom(id)` 의 **본체**. 이 SPEC 은 `state.currentRoomId` 를 바꾸고 다시 그리는 최소 구현만 두고 이름을 확정한다

### Out of Scope — 리치 UI (`SPEC-WEBRICH-001`, Task 17)

- 첨부 파일 표시와 다운로드 링크, 파일 업로드 입력
- 봇 초대 모달과 `POST /api/rooms/:id/invites` 호출, 발급된 실행 명령 표시
- 초대 목록·철회·온라인 표시
- 권한 승인/거부 버튼과 그 응답 전송

### Out of Scope — 서버 API (카드 `t1`~`t4` 에서 이미 완료)

- 인증·방·봇·메시지·SSE·게이트웨이·권한 릴레이의 **구현**. 이 SPEC 은 그 API 를 부르기만 한다
- 새 API 엔드포인트 추가. 화면에 필요한 것이 API 에 없어 보이면 임의로 만들지 말고 중단하고 보고한다

### Out of Scope — 디자인 시스템 자체

- `web/design-tokens.css` 의 값 변경·추가. 이미 존재하는 파일이며 이 SPEC 은 소비만 한다
- `.moai/project/design-dna-discord.md` 수정
- 라이트 테마, 테마 전환, 사용자 설정 화면

### Out of Scope — 프런트엔드 기반 확장

- 프레임워크 도입(React·Vue 등). `plan-v2.md` Global Constraints 가 "바닐라 JS 웹 UI(프레임워크 없음)"로 못 박는다
- 번들러·트랜스파일러·빌드 단계. `web/` 는 브라우저가 그대로 읽는 파일이다
- 반응형/모바일 레이아웃, 접근성 감사, 국제화. 단일 사용자·데스크톱 브라우저 전제다
- 브라우저 실행 E2E 테스트(Playwright 등). 전체 시나리오 검증은 `plan-v2.md` Task 18 소관이다

---

## 6. 제약

- `plan-v2.md` Global Constraints 를 그대로 따른다 — 바닐라 JS, 프레임워크 없음, UI 문구는 한국어, 커밋 메시지는 영어 관례.
- `web/` 아래 파일은 브라우저가 그대로 읽는다. TypeScript 도 JSX 도 쓰지 않고, 번들 단계를 두지 않는다.
- `web/app.js` 는 ES 모듈이다(`<script type="module">`). Node 20+ 와 최신 브라우저 모두 그대로 읽는다. **이것은 카드 `t5` 전체에 걸리는 결정이며, 출처는 plan-audit 교정 게이트의 오케스트레이터 결정이다**(§4.8 계약 1).
- **디자인 토큰은 `web/style.css` 의 `@import` 하나로만 실린다.** `web/index.html` 은 `style.css` 만 `<link>` 하며 `design-tokens.css` 문자열을 포함하지 않는다(§4.8 계약 5).
- 서버 쪽 변경은 `server/src/index.ts` 한 파일의 정적 서빙 등록뿐이다. 런타임 의존성을 새로 추가하지 않는다 — `@fastify/static` 은 이미 설치돼 있다.
- **테스트 환경 의존성 하나는 새로 필요하다.** `web/app.js` 의 DOM 로직을 vitest 로 재려면 jsdom 계열 환경이 있어야 하는데 `server/package.json` 에 없다. `plan.md` §C 가 이것을 run 단계 착수 전 필수 준비 단계로 못 박는다.
- 테스트는 `server/test/` 아래 vitest 로 둔다. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- 코드 주석은 한국어(`code_comments: ko`).

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어지며, 구현 본문이 비어 있을 때 통과하는 기준은 두지 않는다. 사람 눈이 필요한 기준 하나(AC-WEBSHELL-014)는 **MANUAL** 로 명시하고 자동 검사인 척하지 않는다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 15 (원본, 읽기 전용)
- `.moai/project/design-dna-discord.md` — M5 의 구속력 있는 시각 표준
- `web/design-tokens.css` — 그 표준을 CSS 변수로 옮긴 실제 파일 (이미 존재)
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `config`)
- `.moai/specs/SPEC-AUTH-001/` — 인증 API
- `.moai/specs/SPEC-ROOM-001/` — 방 API·봇 등록 API
- `.moai/specs/SPEC-SSE-001/` — 범위 경계 판정 방식(`spec_base_sha` 상대 diff)의 선례
- 칸반 카드 `t5` (마일스톤 M5)
