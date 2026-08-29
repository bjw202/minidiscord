# SPEC-WEBCHAT-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 16 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`~`M4` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M5`(카드 `t5`)와는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t5` 는 `plan-v2.md` 의 Task 15·16·17 을 담고, 이 SPEC 은 그중 Task 16 하나다. 카드 안에서의 순서는 고정이다.

```
SPEC-WEBSHELL-001 (Task 15 — api/state/$ 토대, index.html 골격, style.css 토대)
      ↓  이 SPEC 은 그 위에서만 동작한다
SPEC-WEBCHAT-001 (이 SPEC — Task 16)
      ↓  renderMessage / #invite-btn / #file-input 확장점
SPEC-WEBRICH-001 (Task 17 — 첨부 표시, 초대 모달, 권한 승인 버튼)
```

서버 쪽 의존은 **전부 이미 구현돼 있다** — 카드 `t3` 가 `sse.ts`·`routes-messages.ts`·`mention.ts`·`gateway.ts`·`permissions.ts` 를, 카드 `t2` 가 `routes-bots.ts` 를 머지했다. 이 SPEC 은 그 코드를 읽어 계약을 확인했고(§D 의 판정 근거가 전부 실제 코드다), 한 줄도 고치지 않는다.

**유일한 미구현 의존은 `SPEC-WEBSHELL-001` 이다.** 그 SPEC 이 `web/index.html`·`web/app.js`·`web/style.css` 를 만들지 않으면 이 SPEC 은 고칠 파일이 없다.

| 선행 SPEC | 받아 쓰는 것 | 이 SPEC에서의 쓰임 |
|-----------|-------------|-------------------|
| `SPEC-WEBSHELL-001` | `$(id)`, `api(path, opts)`, `state`, `renderRooms()`, `loadRooms()`, `state.rooms` | 채팅 로직 전부가 이 위에 올라간다. **표면의 전문은 형제 `spec.md` §4.3 + §4.8 이며 이 문서는 그것을 다시 적지 않고 참조한다** |
| `SPEC-WEBSHELL-001` | `web/index.html` 의 `<main id="chat">` 요소 | 요소는 그대로 두고 **내용물만** 교체한다. 그 안의 `#placeholder` 는 제거하거나 `hidden` 으로 둔다 (§4.8 계약 4) |
| `SPEC-WEBSHELL-001` | `web/style.css` | 파일 끝에 채팅 영역 블록을 덧붙인다. `@import` 줄보다 앞에 선택자를 넣지 않는다 (§4.8 계약 5) |
| `SPEC-WEBSHELL-001` | `openRoom(id)` 이름과 최소 본체 | 이 SPEC 이 본체를 채운다. 이름·시그니처는 바꾸지 않는다 |
| `SPEC-SSE-001` | `GET /api/rooms/:id/events`, 프레임 형식 | 브라우저 `EventSource` 가 파싱한다 |
| `SPEC-MSG-001` | `GET /api/rooms/:id/messages[?after=]`, `POST .../messages` | 과거 대화, 백필, 전송 |
| `SPEC-MENTION-001` | `parseMentions()` 와 그 정규식 | **자동완성이 맞춰야 하는 문법.** 테스트가 이 함수를 실제로 import 한다 |
| `SPEC-BOT-001` | `GET /api/rooms/:id/invites` | 봇 칩, 자동완성 후보 |
| `SPEC-GATEWAY-001` | `bot_status` 페이로드 | working/idle 표시 |
| `SPEC-PERM-001` | `author_type: 'system'` 메시지 | `renderMessage` 가 텍스트로 보여 준다 (버튼은 Task 17) |

## §B 되돌리기 어려운 결정 — 자동완성이 만드는 문자열과 서버 파서의 계약

이 SPEC 에서 가장 되돌리기 비싼 결정이다. 어긋나면 **오류 없이 조용히 실패한다.**

서버의 실제 정규식(`server/src/mention.ts`, 직접 읽어 확인):

```js
const MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g
```

봇 이름 자리(`[^()\s]+`)는 **공백도 괄호도 허용하지 않는다.** 그런데 봇 등록 라우트(`server/src/routes-bots.ts`)는 `name.trim()` 이 비지 않기만 하면 무엇이든 받는다. 두 계약 사이에 틈이 있고, 그 틈은 UI 가 이름을 완성해 줄 때 실제 결함이 된다.

| 결정 | 값 | 근거 |
|------|-----|------|
| 삽입 형식 | `@TO(<이름>) ` / `@CC(<이름>) ` — 뒤에 공백 하나 | 원본 Task 16 그대로. 서버 정규식과 일치한다 |
| 서버 정규식 수정 | **하지 않는다** | `SPEC-MENTION-001` 이 소유하고 게이트웨이·메시지 라우트가 결합해 있다. 이름에 공백을 허용하도록 넓히면 `@TO(pm) 안녕` 에서 `pm) 안녕` 까지 삼킬 위험이 생긴다 |
| 멘션 불가 이름 | 후보에서 제외하거나 선택 불가로 표시 | UI 가 막는 편이 싸다. 서버는 이미 미초대 이름을 `400` 으로 거절하지만, **문법이 안 맞는 이름은 파서가 아예 못 보므로 그 `400` 경로에도 안 걸린다** |
| 멘션 가능 판정식 | `/^[^()\s]+$/` | 서버 정규식의 이름 자리와 **같은 문자 집합**이다. 다른 식을 쓰면 이 표가 무의미해진다 |
| 검증 방식 | 테스트가 `server/src/mention.js` 의 `parseMentions` 를 **실제로 import** 해 왕복 대조 | 문자열을 눈으로 비교하면 정규식이 바뀔 때 조용히 어긋난다 |

검토 시 이 표가 확인 대상이다. "이름에 공백을 허용하자"는 반대 방향의 해결책이 있고, 그것은 서버 세 파일과 이미 통과한 수용 기준들을 흔든다. 그래서 UI 쪽에서 막는 쪽을 택했다.

## §C 되돌리기 어려운 결정 — 검증 방식

원본 Task 16 Step 4 는 "서버 실행 → 두 브라우저 창 → 눈으로 확인"이다. 그것만으로는 이 SPEC 의 핵심 성질 넷(계약 일치, 타이머 정리, 재연결 백필, 늦은 응답 격리)이 **관측되지 않는다.** 넷 다 조용히 깨지는 부류다.

| 결정 | 값 | 근거 |
|------|-----|------|
| 테스트 환경 | vitest + jsdom, 파일 상단 `// @vitest-environment jsdom` 독블록 (1순위) | 서버 테스트는 그대로 node 환경에서 돈다. 이 경로가 vitest 4 에서 듣지 않을 때의 대체는 아래 줄에 있다 |
| 테스트 위치 | `server/test/web-chat.test.ts` | `web` 워크스페이스가 없고 만드는 것은 Task 16 범위 밖이다. 여기여야 `../src/mention.js` 를 직접 import 할 수 있다 |
| **추가 개발 의존성** | `jsdom` (server 워크스페이스 devDependency) | **run 단계의 필수 사전 준비다.** 현재 `package-lock.json` 에 `jsdom` 도 `happy-dom` 도 없다(확인함). vitest 4 는 DOM 환경 구현체를 번들하지 않으므로 설치 없이는 `environment: 'jsdom'` 이 뜨지 않는다 |
| `app.js` 로딩 방식 | jsdom 문서에 `index.html` 의 `<body>` 를 넣고, **`await import('../../web/app.js?t=<n>')`** 로 모듈을 적재한다. 쿼리는 캐시 무효화용이며 테스트마다 새 모듈 인스턴스를 준다 | **`web/app.js` 는 ES 모듈이다** — `SPEC-WEBSHELL-001` §4.8 계약 1, plan-audit 교정 게이트의 오케스트레이터 결정. `window.eval` 로 원문을 감싸는 0.1.0 골격은 `export` 토큰에서 `SyntaxError` 로 죽었다 |
| jsdom 환경 확보 실패 시 | `server/vitest.config.ts` 를 둔다 | 도크블록이 1순위, 이것이 명시된 대체 경로다. 형제 SPEC 의 허용 파일 집합에도 있다 (감사 O-5) |
| `EventSource` | 가짜 클래스로 `globalThis.EventSource` 를 대체 | 실제 서버를 띄우지 않는다. `close()` 호출 여부와 이벤트 주입을 둘 다 관측할 수 있다 |
| `fetch` | 가짜 함수. 호출 URL·메서드·본문을 기록 | 호출 **횟수**를 세는 기준(AC-WEBCHAT-009·013)이 이 기록에 의존한다 |
| 타이머 | `vi.useFakeTimers()` + `vi.advanceTimersByTime` | 5분을 실제로 기다리지 않는다. `vi.getTimerCount()` 가 누수 관측 수단이다 |
| 시각 충실도 | **MANUAL** 로 명시 (AC-WEBCHAT-016) | 사람 눈이 필요한 것을 자동처럼 위장하지 않는다 |

**모듈 적재에서 순서가 load-bearing 인 자리를 적어 둔다.** 세 가지가 순서대로 지켜져야 한다. (1) 가짜 `fetch` 와 가짜 `EventSource` 를 **import 보다 먼저** 심는다 — 모듈 최상위가 네트워크를 치지 않더라도, `loadRooms()` 를 부르는 시점에는 이미 심겨 있어야 한다. (2) `index.html` 의 `<body>` 를 문서에 먼저 넣는다 — `innerHTML` 로 삽입된 `<script>` 는 명세상 실행되지 않으므로 형제의 인라인 `initApp()` 부트스트랩은 여기서 돌지 않고, 그래서 이 SPEC 의 배선은 `initApp` 이 아니라 `openRoom` 0단계의 `initChat()` 에 있어야 한다(REQ-WEBCHAT-016). (3) 매 테스트가 새 모듈 인스턴스를 받도록 URL 에 캐시 무효화 쿼리를 붙인다 — 붙이지 않으면 모듈 수준 `state` 가 테스트끼리 새고, 그 증상은 "구현이 틀렸다"로 오진되기 쉽다.

**그럼에도 이 SPEC 의 기준들은 전부 DOM 관찰과 가짜 대역 호출 기록으로만 판정한다.** `state` 핸들이 닿긴 하지만 내부 상태를 들여다보지 않는다 — 사용자가 보는 것이 곧 기준이어야 구현 방식이 바뀌어도 기준이 살아남는다.

### 채팅 전용 상태를 어디에 둘 것인가 — 0.2.0 에서 뒤집었다

0.1.0 은 이렇게 적었다: *"`SPEC-WEBSHELL-001` 의 `state` 리터럴은 이미 `sse`·`workingBots`·`staleTimers`·`staleBots` 를 선언해 두고 있다. 그 넷은 그대로 쓴다."* **그 전제는 거짓이었다** (감사 MF-4). 근거로 삼은 관측은 형제 SPEC 이 아니라 원본 `plan-v2.md` Task 15 의 코드 블록을 읽은 것이었고, 형제는 그 지점에서 의도적으로 이탈해 **세 필드(`rooms`·`bots`·`currentRoomId`)만** 초기화하고 나머지를 자기 안티패턴 목록으로 봉인했다. 같은 절 안에서 "그 넷을 그대로 쓴다"와 "리터럴에 손대지 않는다"가 양립하지 않았던 것도 그 오독의 결과다.

교정된 결정은 형제 §4.8 계약 2의 단일 해석을 따른다 — **필드를 쓰는 SPEC 이 그 필드를 스스로 선언·초기화한다.**

| 결정 | 값 | 근거 |
|------|-----|------|
| 필드의 자리 | `state` 객체 위. 별도 객체를 만들지 않는다 | 형제 계약 2가 "형제는 자기 필드를 `state` 에 더한다"로 못 박았다. 별도 객체는 그 계약과 어긋나고, 형제 둘이 서로의 상태를 못 보게 만든다 |
| 초기화의 자리 | `initChat()` **한 곳**. `openRoom` 0단계에서 멱등으로 불린다 | 리터럴을 고치지 않으므로 형제와의 병합 충돌 표면이 그대로 없다. 초기화 자리가 하나뿐이라 "어디서 만들어지는가"에 답이 하나다 |
| 소유 필드 | `sse`·`workingBots`·`staleTimers`·`staleBots` + `lastEventId`·`roomBots`·`roomGeneration` 일곱 | 앞의 넷은 원본이 형제 것으로 착각했던 것이고, 뒤의 셋은 이 SPEC 이 새로 필요로 하는 것이다. 소유가 같으므로 같은 자리에 둔다 |
| 방어 코드 | `?.` 와 `??=` 를 두지 않는다 | §D 7번. **근거가 바뀌었다** — "형제가 이미 초기화한다"가 아니라 "`initChat()` 이 `openRoom` 의 첫 단계이고 그 앞에서 이 필드를 만지는 경로가 없다"이다 |
| 형제 리터럴 | 한 글자도 고치지 않는다 | 형제의 영구 기준(AC-WEBSHELL-006)이 세 필드의 존재와 초기값을 계속 단언한다. 더해진 필드에는 침묵하므로, 런타임에 더하는 것은 안전하고 리터럴을 고치는 것은 위험하다 |

## §D 원본 문서 결함과 해결

원본 `plan-v2.md` Task 16 이 싣고 있는 HTML·JS·CSS 를 실제 서버 코드와 대조하면서 찾은 것들이다. **1번이 가장 값비싸다.**

### 1. 자동완성이 서버가 해석하지 못하는 멘션을 만들 수 있다

원본 코드는 초대 목록의 이름을 그대로 괄호에 넣는다.

```js
const replaced = before.replace(/@([^\s(]*)$/, `@${kind}(${h.bot_name}) `)
```

`h.bot_name` 은 `GET /api/rooms/:id/invites` 가 준 값이고, 그 값은 `POST /api/bots` 가 받은 이름이다. 그 라우트는 `name.trim()` 이 비지 않기만 확인한다(`routes-bots.ts:38-40`). 반면 파서는 `[^()\s]+` 만 이름으로 인정한다(`mention.ts:2`).

`코드 리뷰어` 라는 봇이 있으면 UI 는 `@TO(코드 리뷰어) ` 를 만든다. 그러면:

1. `parseMentions('@TO(코드 리뷰어) 봐줘')` → **`[]`**. 공백 때문에 어느 것도 일치하지 않는다.
2. `routes-messages.ts` 의 미초대 이름 검사(`unknown.length > 0` → `400`)에도 **걸리지 않는다.** 파서가 이름을 하나도 못 뽑았으므로 검사할 대상이 없다.
3. 메시지는 `200` 으로 저장되고 SSE 로 화면에 뜬다. `message_targets` 에는 행이 하나도 안 생긴다.
4. 봇은 아무것도 받지 못한다. 사용자는 봇이 무시했다고 생각한다.

**해결**: `spec.md` REQ-WEBCHAT-011 — 멘션 가능 판정식 `/^[^()\s]+$/` 를 만족하지 않는 이름은 선택 가능한 후보로 제시하지 않고, 그 이유를 함께 보여 준다. 서버 정규식은 건드리지 않는다(§B). AC-WEBCHAT-010 이 **실제 `parseMentions` 를 import 해** 왕복을 단언하고, AC-WEBCHAT-011 이 불가 이름 경로를 단언한다.

### 2. SSE 재연결 뒤의 공백을 메우는 코드가 없다

원본 `openRoom` 은 `EventSource` 를 열고 두 이벤트만 듣는다. `error` 도 `open` 도 다루지 않는다.

`EventSource` 는 연결이 끊기면 브라우저가 스스로 다시 붙는다. 그런데 `SPEC-SSE-001` REQ-SSE-009 가 `id:` 필드와 `retry:` 지시자를 금지했으므로, 브라우저가 `Last-Event-ID` 로 재개를 요청할 근거가 없고 서버도 놓친 이벤트를 다시 보내지 않는다(`sse.ts` 의 `publish` 는 현재 구독자 집합에만 쓴다). **끊긴 사이에 온 메시지는 영구히 화면에 나타나지 않는다** — 방을 다시 열기 전까지.

**해결**: `spec.md` REQ-WEBCHAT-008 — `error` 뒤 `open` 이 오면 `?after=<마지막 수신 id>` 로 REST 백필. 그 파라미터는 `routes-messages.ts` 가 이미 제공한다(`id > after` 오름차순 최대 200개). AC-WEBCHAT-008 이 관측한다.

이 방향은 원본 `spec-v2.md` 4-C 의 "과거는 REST로, 접속 후는 SSE로" 와 일치한다 — 재연결 직후는 다시 "과거"가 된다.

### 3. 자동완성이 열린 채로 Enter 를 누르면 깨진 멘션이 전송된다

원본 `keydown` 핸들러는 드롭다운 상태를 보지 않는다.

```js
if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
```

`@pm` 까지 치면 드롭다운이 뜬다. 사용자가 `Enter` 를 누른다 — 자동완성 UI 를 본 사람의 자연스러운 동작이다. 실제로는 `@pm` 이라는 미완성 멘션이 담긴 메시지가 즉시 전송되고, §D 1번과 같은 경로로 조용히 실패한다.

**해결**: `spec.md` REQ-WEBCHAT-012 — 드롭다운이 보이는 동안 `Enter` 는 전송하지 않는다.

### 4. 자동완성이 키 입력마다 API 를 호출하고 응답 순서를 보장하지 않는다

```js
$('msg-input').addEventListener('input', () => {
  ...
  api(`/api/rooms/${state.currentRoomId}/invites`).then(invites => { ... })
})
```

`@`, `@p`, `@pm` 세 번의 입력이 세 번의 HTTP 요청을 낸다. 세 응답의 도착 순서는 보장되지 않으므로, `@` 의 응답(전체 목록)이 `@pm` 의 응답보다 늦게 오면 좁혀 놓은 목록이 다시 넓어진다. 방을 전환하는 중이면 이전 방의 목록이 새 방의 드롭다운에 그려진다.

**해결**: `spec.md` REQ-WEBCHAT-009 — 방을 열 때와 `bot_status` 를 받을 때만 목록을 받아 캐시하고, `input` 핸들러는 캐시만 읽는다. 요청 횟수가 0 이 되므로 순서 문제 자체가 사라진다. AC-WEBCHAT-009 가 fetch 호출 횟수를 센다.

### 5. 늦게 도착한 응답이 다른 방 화면에 그려진다

세 곳이 같은 결함을 갖는다.

```js
const { messages } = await api(`/api/rooms/${id}/messages`)   // openRoom — id 는 잡혀 있으나 도착 시점 검사 없음
for (const m of messages) renderMessage(m)                     // #messages 는 이미 방 2 의 것일 수 있다

async function refreshRoomBots() {
  const id = state.currentRoomId          // 호출 시점의 방
  const invites = await api(...)          // await 동안 방이 바뀔 수 있다
  const box = $('room-bots'); box.innerHTML = ''   // 지금 화면(다른 방)을 덮어쓴다
}
```

방 `1` 을 클릭하고 응답이 오기 전에 방 `2` 를 클릭하면, `openRoom(2)` 가 `#messages` 를 비운 뒤 방 `1` 의 응답이 도착해 방 `1` 의 메시지를 방 `2` 화면에 그린다. 로컬 서버라 드물지만, 메시지가 많거나 첨부 조회가 겹치면 실제로 난다.

**해결**: `spec.md` REQ-WEBCHAT-014 — 방 세대 카운터. 호출 시작 시점의 세대를 잡아 두고 반영 직전에 현재 세대와 비교한다. `state.currentRoomId` 비교로는 부족하다 — 같은 방을 다시 여는 경우를 가리지 못한다. AC-WEBCHAT-014 가 관측한다.

### 6. 방을 떠나도 stale 타이머가 살아 있다

원본 `openRoom` 은 `state.sse.close()` 만 한다. `state.staleTimers` 에 걸린 5분 타이머들은 그대로 남아, 방을 떠난 뒤에도 만료되면 `refreshRoomBots()` 를 호출한다 — 그때의 `state.currentRoomId` 는 이미 다른 방이다. `state.workingBots` 도 비워지지 않는다.

키가 `roomId:botId` 로 이름 공간이 나뉘어 있어 **표시는 틀리지 않는다.** 하지만 타이머가 쌓이고, 만료될 때마다 필요 없는 API 호출이 나가고, 방을 여러 번 오가면 그 수만큼 누적된다.

**해결**: `spec.md` REQ-WEBCHAT-007 — 방 전환 시 모든 stale 타이머를 해제하고 working·stale 집합을 비운다. AC-WEBCHAT-007 이 `vi.getTimerCount() === 0` 으로 **존재로** 관측한다("누수가 없다"는 부재 진술을 쓰지 않는다).

### 7. `state.staleTimers ??= {}` 와 `state.staleBots?.` 는 죽은 방어다 — 근거를 0.2.0 에서 갈아 끼웠다

원본 코드:

```js
clearTimeout(state.staleTimers?.[key])
state.staleTimers ??= {}
state.staleTimers[key] = setTimeout(() => { state.staleBots?.add(key); refreshRoomBots() }, 5 * 60_000)
```

0.1.0 은 이 방어를 걷어내는 근거로 *"Task 15 의 `state` 리터럴이 `staleTimers: {}` 와 `staleBots: new Set()` 을 이미 초기화한다"* 를 들었다. **그 근거는 틀렸다** (감사 MF-4) — 형제 SPEC 은 세 필드만 초기화한다. 그 상태에서 방어만 걷어냈다면 첫 `bot_status: working` 수신에서 `TypeError: Cannot set properties of undefined` 가 났을 것이고, AC-WEBCHAT-005·006·007 이 그 자리에서 죽었을 것이다.

**결론은 유지하되 근거를 바꾼다.** 방어를 걷어내는 근거는 이제 이것이다 — **이 SPEC 이 `initChat()` 에서 그 필드를 직접 만들고, `initChat()` 은 `openRoom` 의 0단계이며, 그 앞에서 이 필드를 만지는 경로가 없다**(REQ-WEBCHAT-016, §C). 초기화의 자리가 하나이고 그 자리가 모든 사용보다 앞선다는 것이 확인 가능한 사실이므로, `?.` 와 `??=` 는 여전히 발화하지 않는 죽은 코드다.

그리고 죽은 코드가 해로운 이유는 그대로다 — **`staleBots` 가 정말로 `undefined` 인 상황에서 `?.add(key)` 는 조용히 아무것도 하지 않는다.** stale 표시가 영원히 안 뜨고 아무도 이유를 모른다. 초기화가 깨지면 `TypeError` 로 그 자리에서 드러나는 편이 낫다. 순서도 바로잡는다 — `clearTimeout` 보다 초기화가 먼저다.

### 8. `# undefined` 방 제목

```js
const room = [...state.rooms.active, ...state.rooms.archived].find(r => r.id === id)
$('room-title').textContent = '# ' + room?.name
```

`room` 이 없으면 `room?.name` 은 `undefined` 이고 문자열 연결로 `"# undefined"` 가 화면에 뜬다. 옵셔널 체이닝이 예외는 막았지만 사용자에게는 더 나쁜 것을 보여 준다.

**해결**: `spec.md` REQ-WEBCHAT-002 마지막 줄 — 찾지 못하면 방 번호를 쓴다.

### 9. 전송 실패 복원이 그 사이 입력한 것을 덮어쓴다

```js
} catch (err) {
  alert(err.message)
  $('msg-input').value = body  // 실패 시 복원
}
```

`await` 동안 사용자가 다음 메시지를 치고 있었다면 그것이 사라진다. 또 `alert` 는 jsdom 에서 구현돼 있지 않아 테스트에서 예외를 던진다.

**해결**: 입력창이 비어 있을 때만 복원한다. 오류 알림은 `alert` 대신 화면 안의 요소로 낸다 — 테스트에서 관측 가능해지고(부수 효과), 브라우저를 멈추지 않는다. AC-WEBCHAT-013 이 복원을 단언한다.

### 10. CSS 가 디자인 토큰을 쓰지 않고 색을 직접 적는다

원본 Step 3 의 CSS 는 `#1e1f22`·`#2b2d31`·`#5865f2`·`#57f287` 같은 16진수 리터럴을 쓴다. 그런데 이 저장소에는 그 값들을 이미 변수로 옮겨 둔 `web/design-tokens.css` 가 있고, 디자인 DNA 문서가 "M5 작업은 이 토큰을 그대로 갖다 쓰면 된다"고 못 박는다.

리터럴을 그대로 두면 토큰 파일과 두 곳에서 색이 갈라지고, 어느 쪽이 기준인지 알 수 없게 된다. 또 원본이 모든 봇 이름을 같은 초록(`#57f287`)으로 칠하는데, 디자인 DNA §1 은 **역할별 팔레트**가 Discord 가독성의 핵심이라고 지목하며 `--md-role-color-1..5` 다섯 개를 준비해 뒀다.

**해결**: `spec.md` REQ-WEBCHAT-015 — 이 SPEC 이 더하는 블록에 16진수 색 리터럴을 두지 않고 `var(--md-*)` 를 쓴다. 판정을 위해 블록을 `/* ── SPEC-WEBCHAT-001 채팅 영역 ── */` 로 시작한다. REQ-WEBCHAT-003 — 봇 이름 색을 `author_bot_id` 로 다섯 색에 순환 배정한다. AC-WEBCHAT-015 가 기계적으로, AC-WEBCHAT-016 이 눈으로 확인한다.

### 원본 코드에서 결함이 **아니었던** 것 (확인 후 그대로 둠)

정직하게 함께 적는다 — 의심했다가 실제 코드를 읽고 무해하다고 판정한 것들이다.

| 의심한 것 | 판정 |
|-----------|------|
| `renderMessage` 의 XSS | **결함 아님.** 원본은 이미 `textContent` 만 쓴다. `innerHTML` 은 컨테이너를 비울 때(`= ''`)만 쓰인다. REQ-WEBCHAT-004 는 그 성질을 **유지하라는 요구사항**이지 고치라는 것이 아니다 |
| 자기 메시지 중복 표시 | **결함 아님.** `sendMessage` 는 POST 응답을 그리지 않고 SSE 만 그린다. 서버는 보낸 사람에게도 `message` 를 발행하므로 정확히 한 번 보인다. REQ-WEBCHAT-013 이 그 성질을 못 박는다 |
| 권한 답장(`yes xqwer`)이 화면에 안 남는 것 | **결함 아님.** `routes-messages.ts` 가 그 답을 소비하고 사용자 메시지로 저장하지 않는다(설계). 대신 `permissions.ts` 가 `✅ 승인 전송됨` system 메시지를 발행하므로 화면에는 결과가 남는다 |
| `.ac-item` 의 `onclick` 이 textarea blur 때문에 안 먹는 것 | **결함 아님.** blur 핸들러가 없어 드롭다운이 사라지지 않으므로 `click` 이 정상 발화한다 |
| 감지 정규식과 치환 정규식이 다른 것(`(^\|\s)@...` vs `@...`) | **결함 아님.** 치환은 감지가 성공한 뒤에만 돌고, 치환식은 감지식보다 넓으므로 같은 위치를 잡는다 |

---

## §E 알려진 위험과 두 방향 훑기

### §E.1 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| `SPEC-WEBSHELL-001` 미완료 상태에서 착수 | 고칠 파일 자체가 없다. `web/` 에는 지금 `design-tokens.css` 하나뿐이다 | §A 의존표를 M1 시작 전 체크리스트로 쓴다. 없으면 블로커로 보고하고 임의로 Task 15 를 구현하지 않는다 |
| `jsdom` 미설치 | 모든 웹 테스트가 환경 로드 단계에서 실패한다. "구현이 틀렸다"로 오진하기 쉽다 | §F M1 단계 1 이 설치를 **첫 작업**으로 못 박고, 설치 확인을 RED 전에 둔다 |
| `await import('../../web/app.js')` 가 실패함 | 형제 파일이 없거나(`ERR_MODULE_NOT_FOUND`), 형제가 클래식 스크립트로 만들었거나(`SyntaxError`), export 가 모자란다 | **셋 다 블로커 보고이고 공통 골격을 되돌리지 않는다.** `acceptance.md` 공통 골격 아래 증상·원인·처리 표가 그 세 갈래를 미리 적어 두었다. 형제 파일을 임의로 만들거나 고치지 않는다 |
| 테스트끼리 모듈 상태가 샘 | 캐시 무효화 쿼리 없이 같은 URL 을 두 번 import 하면 같은 인스턴스가 온다 | `?t=${++loadSeq}` + `vi.resetModules()`. 증상이 "구현이 틀렸다"로 보이는 부류이므로 M2 첫 작업으로 확인한다 |
| 모듈 최상위나 `loadRooms()` 가 네트워크를 침 | 형제의 부트스트랩은 `initApp()` 안에 있고 `index.html` 인라인 스크립트가 부르므로 테스트에서 자동으로 돌지는 않는다. 그러나 골격이 `loadRooms()` 를 명시적으로 부른다 | import 보다 **먼저** 가짜 `fetch` 를 심는다. `acceptance.md` 공통 골격이 그 순서를 고정한다 |
| 이음매를 형제가 자기 쪽에서 다시 발명함 | 두 SPEC 이 서로 다른 훅 이름·인자·호출 자리를 갖게 된다 | 생산자인 이 SPEC 이 `spec.md` REQ-WEBCHAT-003·016 에 시그니처·호출 자리·무등록 동작까지 적었고, AC-WEBCHAT-002 가 그 넷을 기계로 관측한다. 형제 문서와 어긋나 보이면 구현 전에 블로커로 보고한다 |
| `logout()` 이 SSE 를 안 닫음 | 로그아웃 뒤에도 `EventSource` 가 남아 재연결을 시도한다 | **의도적으로 감수한다.** 형제 §4.8 계약 6이 `logout()` 본문 수정을 금지하고, 서버가 세션 쿠키 없는 재연결을 `401` 로 끊는다. 방을 다시 열면 0단계가 이전 스트림을 닫는다 |
| `alert` 가 jsdom 에서 던짐 | 전송 실패 기준이 구현 결함이 아니라 환경 때문에 실패한다 | §D 9번이 `alert` 를 화면 요소로 대체한다 |
| 계약 일치 기준을 문자열 비교로 되돌림 | `parseMentions` 를 import 하지 않고 `'@TO(pm) '` 와 비교하면, 서버 정규식이 바뀔 때 조용히 어긋난다 | AC-WEBCHAT-010 이 실제 함수 import 를 본문에 못 박는다. §H 안티패턴에도 적었다 |
| 타이머 누수를 부재로 검사 | "타이머가 안 남는다"는 아무 타이머도 안 거는 구현에서 가장 잘 통과한다 | AC-WEBCHAT-007 이 **먼저 `1` 을 관측하고 그 다음 `0`** 을 관측한다 |
| 5분 대기를 실제로 함 | 테스트 하나가 5분 걸리고, 그것을 못 견뎌 단언을 지우게 된다 | `vi.useFakeTimers()` + `advanceTimersByTime(300_000)` |
| 가짜 타이머가 `fetch` 대역의 Promise 해소를 막음 | 가짜 타이머 아래에서 마이크로태스크가 안 도는 것으로 오해해 `await` 를 지우게 된다 | Promise 는 가짜 타이머와 무관하다. 대기가 필요하면 `await vi.advanceTimersByTimeAsync(...)` 를 쓴다. M2 첫 작업으로 이 동작을 확인한다 |
| 재연결 백필이 중복 렌더 | `after` 커서를 갱신하지 않으면 같은 메시지를 두 번 그린다 | REQ-WEBCHAT-005 가 수신마다 커서를 올린다. AC-WEBCHAT-008 이 렌더된 노드 **수**를 단언한다 |
| 방 세대 대신 `currentRoomId` 비교로 축소 | 같은 방을 두 번 여는 경로(새로고침 버튼, 이중 클릭)를 가리지 못한다 | REQ-WEBCHAT-014 가 세대 카운터를 명시하고 AC-WEBCHAT-014 가 방 전환으로 관측한다 |
| 서버 정규식을 넓히는 쪽으로 해결 | `SPEC-MENTION-001` 과 그 수용 기준, 게이트웨이·메시지 라우트가 함께 흔들린다 | §B 가 방향을 고정하고 REQ-WEBCHAT-015 가 `server/` 수정을 금지한다. AC-WEBCHAT-015 가 diff 로 잡는다 |
| 시각 기준을 자동 검사인 척 적음 | 통과했다고 적히지만 아무도 안 본 화면이 나간다 | AC-WEBCHAT-016 을 **MANUAL 로 명시**하고, 관측 항목을 반증 가능한 형태로 적는다 |
| `SPEC-WEBRICH-001` 과 같은 파일을 동시에 고침 | `web/app.js`·`index.html`·`style.css` 셋 다 형제가 노린다 | 카드 안에서 Task 16 → Task 17 순서로 직렬 실행한다. `state` 리터럴은 건드리지 않는다(§C) |

---


### §E.2 두 방향 훑기 (0.2.0 교정 라운드에서 수행)

0.1.0 의 훑기(§G)는 **한 방향뿐이었다** — "빈 구현이 통과하는가"(방향 A). 독립 감사가 그 주장을 받아들이지 않고 세 SPEC 48개 기준을 직접 다시 훑은 결과, 방향 A 적발은 **0건**으로 사실이 확인됐다. 대신 반대 방향에서 카드 전체 **19건**이 나왔다: **"형제 SPEC 이 자기 요구사항대로 옳게 구현했을 때 내 기준이 실패하는가"**(방향 B). 그 부류는 정의상 자기 SPEC 안에서만 물으면 보이지 않는다 — 형제의 요구사항을 읽어야 보인다.

이번 라운드는 기준 열여섯 개를 **두 방향으로, 카드 전체를 놓고** 다시 훑었다. 방향 B 의 질문은 구체적으로 이렇게 던졌다: *"`SPEC-WEBSHELL-001` 이 자기 §4.8 계약대로, `SPEC-WEBRICH-001` 이 자기 REQ 대로 구현을 마쳤을 때, 이 기준이 붉어지는가?"*

| 기준 | 방향 A — 빈 구현이 통과하는가 | 방향 B — 형제의 옳은 구현에서 실패하는가 | 조치 |
|------|------------------------------|------------------------------------------|------|
| AC-001 | 아니오 — `openRoom` 이 비면 `bodies` 가 `[]` | **그랬다.** 구 골격은 부트스트랩 IIFE 가 방 목록을 채워 주는 것에 기댔다. 형제가 그 로직을 `initApp()` 안으로 옮겼으므로 `state.rooms` 가 비고 `# 방1` 단언이 실패한다 | 골격이 `mod.loadRooms()` 를 명시적으로 부른다 |
| AC-002 | 아니오 — 훅 호출 수가 `0` 이면 실패 | 아니오 — 자식 선택자(`.msg-head > strong` 등)로 단언하므로 `SPEC-WEBRICH-001` 이 자손을 더해도 흔들리지 않는다 | (이 라운드에 이음매 관측 신설) |
| AC-003 | 아니오 — 텍스트 보존 단언이 함께 있다 | 아니오 — `#messages img` 0건 단언은 **첨부가 없는 메시지**(`attachments: []`)에 대한 것이다. 첨부가 있으면 `SPEC-WEBRICH-001` 이 `<img>` 를 만드는 것이 옳고, 이 테스트는 그 입력을 주지 않는다 | 그 사실을 테스트 주석으로 못 박음 |
| AC-004 | 아니오 — 노드 증가를 본다 | 아니오 | — |
| AC-005 | 아니오 — `입력 중` 부재→존재 2단 관측 | 아니오 — `#room-bots` 는 이 SPEC 소유이고 형제 둘 다 그 안에 쓰지 않는다(초대 모달은 별도 요소) | — |
| AC-006 | 아니오 — 임계값 앞뒤를 본다 | 아니오 | — |
| AC-007 | 아니오 — 타이머 `1`→`0` 2단 관측 | 아니오 — 형제 둘 다 타이머를 걸지 않는다(`SPEC-WEBRICH-001` 은 팩토리 클로저에 지도 둘만 둔다) | — |
| AC-008 | 아니오 — 중복 렌더를 마지막 단언이 잡는다 | 아니오 | — |
| AC-009 | 아니오 — `before >= 1` 을 먼저 본다 | **그랬다.** `/invites` 를 URL 로만 세면 `SPEC-WEBRICH-001` 의 초대 발급 `POST /api/rooms/:id/invites` 가 같은 계수에 들어온다 | `inviteGets()` 로 **GET 만** 센다 |
| AC-010 | 아니오 — 실제 파서 왕복 | 아니오 — 서버 파서에만 결합한다 | — |
| AC-011 | 아니오 — 관측 셋이 함께 있다 | 아니오 | — |
| AC-012 | 아니오 — 닫힌 상태 전송을 함께 본다 | 아니오 — POST 계수는 이 테스트가 유발한 것뿐이다(초대 버튼을 누르지 않는다) | — |
| AC-013 | 아니오 — 성공 경로가 POST 1회를 관측 | **그랬다.** ① 실패 핸들러가 plan 시점에 미확정(감사 O-7)이었고, ② `FormData` 를 키 집합으로 단언했다면 `SPEC-WEBRICH-001` 이 파일 필드를 더하는 순간 붉어진다 | 핸들러를 `POST /api/rooms/1/messages` 하나만 실패시키도록 확정. `FormData` 는 `.get('body')` 로만 보고 키 집합을 단언하지 않는다 |
| AC-014 | 아니오 — `toEqual` 이 양방향 | 아니오 | — |
| AC-015 | 아니오 — `sed` 출력 비어 있지 않음을 먼저 본다 | **그랬다.** 허용 예외에 루트 `package-lock.json` 과 `server/vitest.config.ts` 가 빠져 있었다. 또 16진 정규식이 앞 세 글자가 모두 16진인 선택자를 오탐할 수 있다 | 예외를 네 파일로 명시. 이 SPEC 이 쓰는 선택자 전수 확인 — `#messages`·`#composer`·`#autocomplete`·`#msg-input`·`#file-input`·`#send-btn`·`#room-header`·`#room-title`·`#room-bots`·`#invite-btn` 모두 앞 세 글자에 비-16진 문자가 있어 **오탐 0건** |
| AC-016 | 해당 없음 (MANUAL) | 아니오 — 관측 1(채팅 배경 > 사이드바 배경)은 형제가 토큰을 계약대로 썼을 때 성립하는 값이다 | — |
| **합계** | **적발 0건** | **적발 5건** — 골격 전역 1건(MF-1: `window.eval` 골격이 ES 모듈에서 `SyntaxError` → 자동 기준 15개 전부 실행 불가) + 개별 4건(AC-001·009·013·015) | 전부 이번 라운드에서 교정 |

**감사 보고서의 계수와 이 표의 계수가 다른 이유.** 감사는 이 SPEC 의 방향 B 적발을 **15건**으로 셌다 — MF-1 하나가 자동 기준 열다섯 개를 전부 죽이므로 기준 단위로 세면 열다섯이다. 이 표는 **원인 단위**로 세어 골격 전역 1건 + 개별 4건 = 5건으로 적었다. 같은 사실의 두 계수 방식이며, 어느 쪽으로 세든 교정 대상은 동일하다.

**이 훑기가 0.1.0 훑기와 다른 점 하나.** 방향 B 는 자기 문서만 읽어서는 답할 수 없다. 형제 SPEC 의 요구사항과 수용 기준을 직접 열어야 한다 — 0.1.0 이 `state` 필드 넷을 "직접 읽어 확인"했다고 적으면서 **잘못된 파일**(원본 `plan-v2.md`)을 읽은 것이 정확히 그 실패다. 이번 라운드의 근거는 전부 `.moai/specs/SPEC-WEBSHELL-001/spec.md` §4.3·§4.8 과 `.moai/specs/SPEC-WEBRICH-001/spec.md` §3·§4.1 원문이다.

---

### §E.3 수용 기준 전수 훑기 (0.3.0) — "실패가 아니라 *공허*로 무너지는 입력이 있는가?"

[HARD] 두 번째 독립 감사(`.moai/reports/t5/plan-audit-b.md` 권고 3)가 세 번째 물음을 지목했다.

> **방향 C — 이 기준이 실패가 아니라 *공허*로 무너지는 입력이 있는가?** 절차를 건너뛴 실행, 파일이 없는 base, 표준 오류로만 실패하고 표준 출력은 비는 명령.

이 SPEC 은 그 부류의 대표 함정을 이미 알고 막아 두었다 — `AC-WEBCHAT-015` 관측 1이 `git rev-parse --verify` 로 기준 SHA 유효성을 먼저 보고, 관측 4가 `sed … | wc -l` 로 마커 블록이 비어 있지 않음을 본 뒤에야 관측 5의 부재 검사를 판정한다. 감사도 이 SPEC 에서 방향 C 적발 0건을 확인했다. 그래도 형제(`SPEC-WEBRICH-001`)에서 같은 부류가 두 건 나왔으므로 열여섯 기준을 그 물음으로 전수 다시 훑었다.

#### 훑기 결과 — 16 기준 × 1 물음

| 기준 | 공허로 무너지는 입력이 있는가 | 조치 |
|------|------------------------------|------|
| AC-001 … AC-014 (골격 기반 자동 기준 14개) | 아니오 — 전부 `loadApp` 을 지난다. `web/app.js` 가 없으면 `await import(...)` 가 던져 **실패**하고, `index.html` 이 없으면 `readFileSync` 가 던진다. 요소가 안 생기면 `$$()` 계수 단언이 0 으로 **실패**한다. 부재 축만으로 이뤄진 기준은 없다 — AC-011·012·013 은 부재 단언마다 같은 회차의 존재 단언을 짝지어 두었다 | 변경 없음 |
| AC-015 범위 경계 | 아니오 — 관측 1(`git rev-parse --verify`)이 기준 SHA 부재를 **실패**로 만들고, 관측 4(`wc -l` > 1)가 관측 5의 부재 검사를 떠받친다. **형제 `SPEC-WEBRICH-001` 의 AC-016 에 빠져 있던 가드가 이 SPEC 에는 처음부터 있었다**(감사 MF-10 대조군) | 변경 없음 |
| AC-016 시각 (MANUAL) | 아니오 — 판정 불가로 명시된 기준 | 변경 없음 |
| **횡단 1건 — 전 기준 공통** | **적발** — 테스트 파일이 없거나 `it` 이 `.skip` 이면 `npm test -w server` 가 종료 코드 `0` 으로 끝난다. "열다섯 자동 기준이 GREEN 이다"라는 주장이 실행 없이 성립한다 | DoD 에 한 줄 추가 — `--reporter=verbose` 출력에 `web-chat.test.ts` 가 나타나고 요약 줄의 `skipped`·`todo` 가 **0** 이어야 한다 |

#### 집계

| 물음 | 질문 수 | 적발 |
|------|--------|------|
| C — 공허로 무너지는 입력이 있는가 (기준별) | 16 | **0** |
| C — 횡단(전 기준 공통 실행 경로) | 1 | **1** — 테스트 미실행/`skip` |
| **합계** | **17** | **1** — 이번 라운드에서 교정 |

라운드별 추이: 방향 A 0건 → 방향 B 5건(2라운드 교정 완료, 감사 재확인 0건) → 방향 C 0건 + 횡단 1건.

**왜 이 SPEC 만 방향 C 가 0건이었나.** 이 SPEC 의 shell 기반 기준은 AC-015 하나뿐이고, 그 하나를 쓸 때 "빈 출력은 통과가 아니다"를 관측 순서로 못 박았다. 형제 `SPEC-WEBRICH-001` 은 같은 함정을 2라운드에서 관측을 **추가**하다 만들었다 — 단언을 더할 때 선행 조건은 더하지 않는 것이 이 부류의 발생 경로다.

---

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다.

### M1 — 준비와 마크업 (우선순위 High)

원본: `plan-v2.md` Task 16 Step 1.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-WEBCHAT-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` `§E.1` 에 적는다. M4 의 범위 경계 검사가 이 값을 기준으로 비교한다.
1. **`jsdom` 을 `server` 워크스페이스 개발 의존성으로 설치한다** — `npm install -D jsdom -w server`. 설치 후 `node -e "require.resolve('jsdom')"` 이 종료 코드 `0` 인지 확인하고 출력을 기록한다. **이 단계 없이는 이후 어떤 테스트도 환경 로드 단계에서 실패한다.**
2. `SPEC-WEBSHELL-001` 산출물 존재 확인 — `web/index.html`·`web/app.js`·`web/style.css` 세 파일이 있고, `index.html` 에 `<main id="chat">` 가 있고, `app.js` 가 **ES 모듈**(`export` 문 존재)인지 본다. 하나라도 아니면 **블로커로 보고하고 중단한다.** `grep -c '^export' web/app.js` 가 `1` 이상이어야 한다.
3. `web/index.html` 의 `<main id="chat">` **안(내용물)** 을 REQ-WEBCHAT-001 의 **열 요소**로 교체한다. `#autocomplete` 는 `hidden`. **`<main id="chat">` 요소 자체는 지우지 않는다** — 형제의 영속 id 24개에 들어 있다. 그 안의 `#placeholder` 는 제거하거나 `hidden` 으로 남기고, **어느 쪽을 택했는지 `progress.md` 에 적는다**(형제 §4.8 계약 4).
4. `server/test/web-chat.test.ts` 를 만들고 `acceptance.md` § 공통 테스트 골격을 넣는다.
5. **RED 확인**: `npm test -w server` → 골격의 첫 기준(AC-WEBCHAT-001)이 실패. 원인이 `openRoom` 미구현(과거 메시지가 그려지지 않음)으로 출력에 보이는지 확인하고 기록.
6. 커밋: `feat: chat area markup for the web UI`

수용 기준: 없음(준비 단계). AC-WEBCHAT-001 의 RED 만 관측한다.

### M2 — 렌더링과 실시간 수신 (우선순위 High)

원본: `plan-v2.md` Task 16 Step 2 의 `openRoom`·`refreshRoomBots`·`renderMessage`.

1. **모듈 적재와 가짜 타이머를 먼저 확인한다** (§E.1 위험 항목 둘). ① `await import('../../web/app.js?t=1')` 가 실제로 도는지, 캐시 무효화 쿼리 없이 두 번 적재하면 상태가 새는지 확인하고 골격에 반영한다. ② `vi.useFakeTimers()` 아래에서 가짜 `fetch` 의 Promise 가 해소되는지, `advanceTimersByTimeAsync` 가 필요한지 확정한다. **둘 다 확인 없이 넘어가지 않는다** — 실패 모양이 "구현이 틀렸다"로 보이는 부류다.
2. AC-WEBCHAT-001~008 의 테스트를 쓴다. **AC-WEBCHAT-002 는 세 테스트다** — 구조·색, 이음매, 훅 없는 렌더.
3. **RED 확인**: `npm test -w server` → 해당 기준들이 실패. 출력 기록.
4. `web/app.js` 에 `initChat`·`openRoom`·`refreshRoomBots`·`renderMessage`·`registerMessageDecorator` 와 SSE 핸들러를 쓴다. §D 2·5·6·7·8번의 이탈을 전부 반영한다 — 백필, 방 세대, 타이머 정리, 죽은 방어 제거, 방 제목 대체. **`initChat()` 이 `state` 일곱 필드를 만들고, `openRoom` 0단계에서 멱등으로 불린다**(REQ-WEBCHAT-016). **장식 훅은 `$('messages').appendChild(el)` 바로 앞 한 줄**이며, 컨텍스트는 `openRoom` 이 방마다 새로 만든다(REQ-WEBCHAT-003).
5. **GREEN 확인**: `npm test -w server` → AC-WEBCHAT-001~008 통과.
6. 커밋: `feat: chat rendering and live SSE reception`

수용 기준: AC-WEBCHAT-001, 002, 003, 004, 005, 006, 007, 008.

### M3 — 자동완성과 전송 (우선순위 High)

원본: `plan-v2.md` Task 16 Step 2 의 `sendMessage` 와 `input` 핸들러.

1. AC-WEBCHAT-009~014 의 테스트를 쓴다. **AC-WEBCHAT-010 은 `../src/mention.js` 의 `parseMentions` 를 실제로 import 한다.**
2. **RED 확인**: `npm test -w server` → 여섯 기준이 실패. 출력 기록.
3. `web/app.js` 에 자동완성과 전송을 쓴다. §D 1·3·4·9번의 이탈을 반영한다 — 멘션 불가 이름 배제, 열린 드롭다운에서 `Enter` 미전송, 캐시 사용, `alert` 제거와 조건부 복원.
4. **GREEN 확인**: `npm test -w server` → AC-WEBCHAT-009~014 통과.
5. 커밋: `feat: mention autocomplete and message sending`

수용 기준: AC-WEBCHAT-009, 010, 011, 012, 013, 014.

### M4 — 스타일과 범위 경계 (우선순위 Medium)

원본: `plan-v2.md` Task 16 Step 3·4.

1. `web/style.css` 끝에 `/* ── SPEC-WEBCHAT-001 채팅 영역 ── */` 로 시작하는 블록을 더한다. 원본 Step 3 의 규칙을 옮기되 색은 전부 `var(--md-*)` 로 바꾼다(§D 10번). 봇 이름 색 다섯 개 규칙(`--md-role-color-1..5`)을 더한다.
2. `web/design-tokens.css` 가 실제로 로드되는지 확인한다. **확인 명령은 이것 하나다.**
   ```bash
   grep -q "design-tokens.css" web/style.css && echo loaded
   ```
   토큰은 `style.css` 첫머리의 `@import` **하나로만** 실리고, `index.html` 에는 그 문자열이 **없는 것이 옳다**(형제 §4.8 계약 5). 0.1.0 은 여기서 `index.html` 을 보고 없으면 블로커로 보고하라고 적었는데, **그것은 옳은 구현에서 반드시 발생하는 잘못된 블로커였다**(감사 MF-7). `index.html` 에 토큰 `<link>` 를 더하지 않는다 — 더하면 토큰이 두 경로로 실리고 형제의 AC-WEBSHELL-005 가 흐려진다. 위 `grep` 이 실패하면 그때는 진짜 블로커다.
3. 범위 경계 확인 (AC-WEBCHAT-015): `git rev-parse --verify "$(cat .moai/specs/SPEC-WEBCHAT-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 SHA 를 내는지 먼저 확인한다. 그 SHA 로 `git diff --name-only <SHA> -- server/src channel` 이 종료 코드 `0` 이면서 **비어 있는지**, `git diff --name-only <SHA> -- web` 이 `web/app.js`·`web/index.html`·`web/style.css` 세 줄인지 본다. **빈 출력 하나만 보고 통과로 적지 않는다** — 기준 SHA 가 없어도 표준 출력은 비어 있다.
4. 토큰 사용 확인: 채팅 블록 안에 16진수 색 리터럴이 없는지 본다.
   ```bash
   sed -n '/SPEC-WEBCHAT-001 채팅 영역/,$p' web/style.css | grep -nE '#[0-9a-fA-F]{3,8}\b'
   ```
   일치 없음(종료 코드 `1`)이어야 한다. 앞선 `sed` 가 **비어 있지 않은지 먼저 확인한다** — 마커가 없으면 빈 입력에 grep 을 돌려 항상 "일치 없음"이 된다.
5. **AC-WEBCHAT-016(MANUAL) 수행**: 서버를 띄우고 브라우저에서 직접 대조한다. 관측 결과를 `progress.md` `§E.2` 에 항목별로 적는다.
6. **전체 확인**: `npm test -w server` 종료 코드 `0`, `npm run typecheck -w server` 종료 코드 `0`.
7. 커밋: `feat: chat view styling from design tokens`

수용 기준: AC-WEBCHAT-015, AC-WEBCHAT-016(MANUAL).

---

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-WEBCHAT-001..016 전부다. 별도 기준을 만들지 않는다.

### 공허한 기준 부류 훑기 (0.1.0 작성 시 수행 — 한 방향뿐이었다)

> **이 절은 방향 A 만 물었다.** 두 번째 방향("형제의 옳은 구현에서 내 기준이 실패하는가")과 그 결과·계수는 **§E.2** 에 있다. 아래 기록은 그대로 두되, 이 SPEC 의 훑기 근거는 §E.2 와 함께 읽어야 완결된다.

#### 공허한 기준 부류 훑기 — 방향 A 상세

이 저장소에는 **구현 본문이 비어 있어도 통과하는 수용 기준**이라는 결함 부류가 카드 `t2` 에서 세 번 재생산된 기록이 있다. 이 SPEC 의 `acceptance.md` 를 마치기 전에, **기준 16개를 개별이 아니라 부류로 한 번에 훑었다** — 하나씩 검토하면 같은 부류의 세 번째가 또 빠져나간다.

훑기 질문 셋과 그 결과:

1. **"본문이 빈 구현에서도 통과하는가?"** — AC-WEBCHAT-007(타이머 정리)과 AC-WEBCHAT-011(불가 이름 배제)이 걸렸다. 둘 다 부재를 보는 모양이었다. 007 은 **`1` 을 먼저 관측한 뒤 `0`** 으로 바꿨고, 011 은 "후보에 없다"에 더해 **그 이름으로 만든 문자열이 `parseMentions` 에서 실제로 0건임**을 같은 테스트에서 함께 단언하게 했다.
2. **"아무것도 만들지 않는 관측인가?"** — AC-WEBCHAT-015 의 색 리터럴 grep 이 걸렸다. 마커가 없으면 `sed` 가 빈 입력을 내고 grep 은 항상 "일치 없음"이 된다. **`sed` 출력이 비어 있지 않은지 먼저 확인**하는 관측을 앞에 붙였다.
3. **"관측 결과가 깨진 구현과도 양립하는가?"** — AC-WEBCHAT-010 이 걸렸다. `#msg-input` 의 값이 `@TO(pm) ` 인지 문자열로 비교하는 형태는 서버 정규식이 바뀌면 조용히 어긋난다. **실제 `parseMentions` 를 import 해 왕복**하는 형태로 바꿨다.

훑기 후 기준 16개 가운데 빈 구현에서 통과하는 것은 남아 있지 않다.

### 기록 의무

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)
- AC-WEBCHAT-016(MANUAL)은 관측 항목별로 본 것을 적는다. "확인함" 한 줄로 적지 않는다

---

## §H 안티패턴 (하지 말 것)

- **서버 멘션 정규식 고치기** — `mention.ts` 의 `MENTION_RE` 를 넓혀 공백을 허용하지 않는다. `SPEC-MENTION-001` 이 소유하고 세 파일이 결합해 있다. 맞추는 쪽은 UI 다 (§B).
- **계약 일치를 문자열 비교로 대체** — `expect(input.value).toBe('@TO(pm) ')` 로 끝내지 않는다. 실제 `parseMentions` 를 import 해 결과가 `[{ bot: 'pm', delivery: 'to' }]` 인지 본다. 문자열 비교는 정규식이 바뀔 때 조용히 어긋난다 (§D 1번).
- **멘션 불가 이름을 그냥 후보로 두기** — "서버가 어차피 400 을 낼 것"이 흔한 이유인데, **틀렸다.** 파서가 이름을 못 뽑으므로 미초대 검사에도 안 걸리고 `200` 이 난다 (§D 1번).
- **부재로 쓴 수용 기준** — "타이머가 남지 않는다", "다른 방 메시지가 안 그려진다"를 단언 없이 적지 않는다. 아무 일도 하지 않는 구현이 가장 잘 통과한다. 존재로 다시 쓴다: 타이머 수 `1` → `0`(AC-WEBCHAT-007), 방 2 메시지의 실제 존재(AC-WEBCHAT-014).
- **`getTimerCount` 의 앞 단언 지우기** — 끊긴 뒤 `0` 만 보면 타이머를 아예 안 거는 구현이 통과한다. 걸린 직후 `1` 을 먼저 관측한다.
- **5분을 실제로 기다리기** — `vi.useFakeTimers()` 를 쓴다. 실제 대기는 테스트를 5분짜리로 만들고, 그 고통이 단언을 지우게 만든다.
- **재연결 백필 생략** — "EventSource 가 알아서 다시 붙는다"는 맞지만, 끊긴 사이의 메시지는 **아무도 다시 보내 주지 않는다**. `id:`/`retry:` 는 REQ-SSE-009 가 금지했다 (§D 2번).
- **키 입력마다 초대 목록 조회** — 원본 그대로 두지 않는다. 응답 순서가 뒤집히면 좁혀 놓은 목록이 다시 넓어진다 (§D 4번).
- **`await` 뒤에 `state.currentRoomId` 다시 읽기** — 같은 방을 두 번 여는 경로를 가리지 못한다. 방 세대 카운터를 쓴다 (§D 5번).
- **POST 응답의 메시지를 그리기** — 서버가 SSE 로도 같은 것을 보낸다. 그리면 자기 메시지가 두 번 보인다.
- **`innerHTML` 로 본문·이름 넣기** — 원본은 이미 `textContent` 만 쓴다. "마크다운도 되게" 하려다 되돌리지 않는다. 봇 답변은 신뢰 경계 밖이다.
- **`alert` 쓰기** — jsdom 에서 던지고 브라우저를 멈춘다. 화면 안의 요소로 알린다 (§D 9번).
- **16진수 색 리터럴 적기** — `web/design-tokens.css` 의 변수를 쓴다. 두 곳에서 색이 갈라지면 어느 쪽이 기준인지 알 수 없어진다 (§D 10번).
- **`web/design-tokens.css` 고치기** — 이 SPEC 은 소비자다. 값이 안 맞으면 블로커로 보고한다.
- **`server/` · `channel/` 파일 고치기** — 한 줄도 고치지 않는다. AC-WEBCHAT-015 가 diff 로 잡는다.
- **`index.html` 의 `<head>`·`<script>`·`#auth-view`·`#sidebar`·`<main id="chat">` **요소 자체** 고치기** — `SPEC-WEBSHELL-001` 영역이다. 고치는 것은 `#chat` 의 **내용물**뿐이다. 필요하면 블로커로 보고한다.
- **`index.html` 에서 토큰 로딩을 확인하거나 토큰 `<link>` 를 더하기** — 토큰은 `style.css` 의 `@import` 하나로만 실린다. 확인 명령은 `grep -q "design-tokens.css" web/style.css` 다 (감사 MF-7).
- **형제 함수 아홉의 본문에 `fetch`/`api()` 더하기** — 형제 기준이 그 호출을 순번으로 단언한다. 배선은 `openRoom` 본체와 이 SPEC 의 함수 안에만 둔다 (형제 §4.8 계약 6).
- **존재하지 않는 이름 쓰기** — `enterMain()` 은 어디에도 없다. 실재하는 것은 `showMain()` 이다 (감사 MF-3).
- **형제의 `state` 리터럴을 고치기** — 리터럴은 형제 소유이고 그 세 필드를 형제의 영구 기준이 단언한다. 이 SPEC 의 일곱 필드는 **런타임에 `initChat()` 이 만든다** (§C, REQ-WEBCHAT-016).
- **`state` 필드가 이미 초기화돼 있다고 가정하기** — 형제는 세 필드만 만든다. `state.staleTimers[key] = ...` 를 `initChat()` 없이 쓰면 첫 `bot_status` 에서 `TypeError` 다. 0.1.0 이 정확히 그 전제를 적었고 감사 MF-4 가 잡았다 (§D 7번).
- **이음매를 형제에게 미루기** — `renderMessage` 는 이 SPEC 소유이므로 확장점의 이름·인자·호출 자리·무등록 동작을 **여기서** 정한다. 형제가 자기 문서에만 적어 둔 이음매는 한쪽만 아는 계약이며, 그것이 감사 MF-5 였다.
- **`app.js` 를 클래식 스크립트로 되돌리거나 `window.eval` 골격으로 회귀하기** — `web/app.js` 는 ES 모듈로 확정됐다(형제 §4.8 계약 1, 오케스트레이터 결정). `import` 가 실패하면 골격을 되돌리지 말고 **블로커로 보고한다** — 되돌리면 `export` 토큰에서 `SyntaxError` 로 자동 기준 전부가 죽는다 (§C, 감사 MF-1).
- **`web` 워크스페이스 새로 만들기** — 루트 `package.json` 의 `workspaces` 를 고치는 일이며 Task 16 범위 밖이다. 테스트는 `server/test/` 에 둔다. (**`server/vitest.config.ts` 는 다르다** — 도크블록이 듣지 않을 때의 명시된 대체 경로이며 형제의 허용 파일 집합에도 있다. 만들었으면 `progress.md` 에 이유를 적는다.)
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡힌다. `spec_base_sha` 를 기준으로 비교한다 (M1 단계 0).
- **빈 출력만 보고 범위 경계·토큰 검사 통과로 적기** — 기준 SHA 가 없거나 `sed` 마커가 없으면 표준 출력은 그냥 비어 있다. 입력이 비어 있지 않은 것을 먼저 확인한다.
- **`npm test -w server` 종료 코드만 보고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않으므로, 테스트를 하나도 안 쓴 실행도 종료 코드 `0` 이다. 특정 기준의 통과를 근거로 삼을 때는 `--reporter=verbose` 로 `✓` 줄을 직접 본다.
- **MANUAL 기준을 자동인 척 적기** — AC-WEBCHAT-016 은 사람이 화면을 봐야 한다. "확인함" 한 줄이 아니라 관측 항목별 결과를 적는다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 전이 증거를 만들 수 없다.

---

## §I 상호 참조

- `.moai/reports/t5/plan-audit.md` — **0.2.0 교정 라운드의 근거.** plan-auditor 독립 감사(2026-08-27, HEAD `6e9a167`). 이 SPEC 판정 FAIL, 통합 표면 판정 FAIL. MF-1·3·4·5·6 + O-1·5·7 이 이 SPEC 몫이다
- `.moai/specs/SPEC-WEBSHELL-001/spec.md` §4.3·§4.8 — **카드 `t5` 공유 표면의 유일한 전문.** 모듈 형식, `state` 확장, export 최소 집합, 요소 소유권, 토큰 로딩 경로, 액션 함수 네트워크 호출 고정. 이 문서는 그것을 다시 적지 않고 참조한다
- `.moai/specs/SPEC-WEBRICH-001/spec.md` §3·§4.1 — 이음매의 소비자 쪽. `createRichContext({ api, doc })` 와 `decorate(el, m)` 가 그 SPEC 소유다

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 15·16·17 — **이 SPEC 의 규범 근거**(읽기 전용). Task 16 이 이 SPEC, 15 가 `SPEC-WEBSHELL-001`, 17 이 `SPEC-WEBRICH-001`
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-C·8장 — 웹 UI, 봇 상태와 응답 없음 판정
- `.moai/project/design-dna-discord.md`, `web/design-tokens.css` — 시각 기준. §D 10번이 그것을 요구사항으로 옮겼다
- `spec.md` — GEARS 요구사항 15개(REQ-WEBCHAT-001..015)와 범위 경계
- `acceptance.md` — AC-WEBCHAT-001..016, 공통 테스트 골격, 엣지 케이스
- `progress.md` — 단계별 증거 기록처
- `server/src/mention.ts` — §B·§D 1번의 판정 근거. `MENTION_RE` 원문
- `server/src/routes-messages.ts` — §D 1·2번의 판정 근거. `?after=` 커서와 SSE 팬아웃
- `server/src/sse.ts` — §D 2번의 판정 근거. `id:`/`retry:` 부재
- `server/src/routes-bots.ts` — §D 1번의 판정 근거. 봇 이름 검증이 `trim()` 뿐인 것
- `server/src/gateway.ts:71-74` — `bot_status` 페이로드와 `working`/`idle` 두 값
- `.moai/specs/SPEC-SSE-001/` — 프레임 형식과 하트비트 금지. 이 SPEC 의 `plan.md` §D 형식을 그대로 따랐다
- `.moai/specs/SPEC-MENTION-001/` — 멘션 문법의 소유 SPEC
