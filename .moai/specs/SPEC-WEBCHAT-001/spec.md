---
id: SPEC-WEBCHAT-001
title: "minidiscord 웹 UI — 채팅 화면, SSE 수신, @ 자동완성, 봇 상태"
version: "0.3.0"
status: draft
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P1
phase: "v0.1.0 target"
module: "web/"
lifecycle: spec-anchored
tags: "web-ui, sse-client, mention-autocomplete, bot-status, chat-view, vanilla-js, jsdom"
tier: M
depends_on: [SPEC-WEBSHELL-001, SPEC-SSE-001, SPEC-MSG-001, SPEC-MENTION-001, SPEC-BOT-001, SPEC-GATEWAY-001]
related_specs: [SPEC-PERM-001, SPEC-WEBRICH-001]
---

# SPEC-WEBCHAT-001 — 웹 UI 채팅 화면 (SSE 수신 · @ 자동완성 · 봇 상태)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 16 에서 도출 (칸반 카드 `t5`, 마일스톤 M5). 요구사항 15개·수용 기준 16개로 Tier M 상한(16/16) 안에 든다. 원본 Task 16 이 싣고 있는 HTML·JS·CSS 코드 블록을 실제 서버 코드(`sse.ts`·`mention.ts`·`routes-messages.ts`·`routes-bots.ts`·`gateway.ts`)와 대조해 결함 열 건을 찾았고, 전부 `plan.md` §D 에 기록하고 의도적으로 이탈했다. 그 가운데 가장 값비싼 것은 **자동완성이 만드는 멘션 문자열이 서버 파서가 해석하지 못하는 형태가 될 수 있다는 것**이다 — 서버 정규식은 봇 이름에 공백·괄호를 허용하지 않는데 봇 등록 API 는 허용한다. 원본이 제안한 "서버 띄우고 눈으로 확인" 검증도 기계 검증(jsdom + 가짜 `EventSource` + 가짜 타이머 + 서버 파서 왕복 대조)으로 바꿨다. | manager-spec |
| 0.2.0 | 2026-08-27 | **plan 단계 감사 교정 라운드.** 근거: `.moai/reports/t5/plan-audit.md` (plan-auditor 독립 감사, 2026-08-27, HEAD `6e9a167`). 이 SPEC 판정은 **FAIL**, 카드 `t5` 세 SPEC 을 잇는 통합 표면 판정도 **FAIL**. 이 SPEC 에 배정된 MUST-FIX 다섯 건(MF-1·MF-3·MF-4·MF-5·MF-6)과 관찰 두 건(O-1·O-5·O-7)을 고쳤다. ① **MF-1** — `web/app.js` 는 **ES 모듈로 확정**됐다. 이것은 이 SPEC 의 판단이 아니라 **plan-audit 교정 게이트에서의 오케스트레이터 결정**이며, `SPEC-WEBSHELL-001` §4.8 계약 1이 그 전문을 보유한다. 클래식 스크립트 전제(구 §6 제약)와 `window.eval` 테스트 골격은 폐기하고 `await import(...)` 로 교정했다 — 구 골격은 `export` 토큰에서 `SyntaxError` 로 죽어 자동 기준 15개 전부를 실행 불가로 만들었다. ② **MF-3** — 존재하지 않는 `enterMain()` 참조를 삭제했다. 실재하는 이름은 `showMain()` 이다(형제 §4.8 계약 3 이름 대조표). ③ **MF-4** — `state.sse`·`workingBots`·`staleTimers`·`staleBots` 가 형제 SPEC 에 이미 있다는 전제는 **거짓이었다**(원본 `plan-v2.md` 를 읽고 형제 SPEC 을 읽지 않은 결과). 형제 §4.8 계약 2에 따라 **이 SPEC 이 그 넷을 스스로 선언·초기화한다** — REQ-WEBCHAT-016 이 그 소유를 명시한다. ④ **MF-5** — `SPEC-WEBRICH-001` 이 일방적으로 적어 두었던 `rich.decorate(el, m)` 이음매를 **생산자인 이 SPEC 이 선언**한다(REQ-WEBCHAT-003 확장 훅 + REQ-WEBCHAT-016 등록 지점·`refreshRoomBots()` export). ⑤ **MF-6** — `#chat` **요소**는 형제 소유(영속), `#chat` **내용물**은 이 SPEC 소유, `#placeholder` 는 제거하거나 `hidden` 으로 둘 수 있다(형제 §4.8 계약 4). ⑥ **O-1** — REQ-WEBCHAT-001 의 "아홉 개"는 열 개였다. ⑦ **O-5** — vitest 도크블록이 듣지 않을 때의 대안(`server/vitest.config.ts`)을 안티패턴 금지에서 빼고 **명시된 대체 경로**로 승격했다. ⑧ **O-7** — AC-WEBCHAT-013 의 실패 경로 핸들러를 plan 시점에 확정했다. 요구사항 15→16개, 수용 기준 16개(불변, AC-WEBCHAT-002 가 이음매 관측을 함께 진다). 카드 전체를 놓고 열여섯 기준을 **두 방향**으로 다시 훑었다(`plan.md` §E.2). | manager-spec |
| 0.3.0 | 2026-08-27 | **plan 단계 감사 교정 라운드 3 (최종).** 근거: `.moai/reports/t5/plan-audit-b.md` (plan-auditor 독립 재감사, 2026-08-27). 이 SPEC 판정은 **CONDITIONAL PASS** — 배정된 MUST-FIX 다섯 건은 전부 종결됐고, 남은 결함 하나가 **형제와 짝을 이루는 문장**이었다. 카드 `t5` 통합 표면 판정은 여전히 **FAIL**. ① **MF-9 (BLOCKING, 형제와 공동 교정)** — `spec.md` L250 의 주석 "(`SPEC-WEBRICH-001` 이 부른다)"는 형제가 그 의무를 자기 문서에 적은 뒤에만 참인데, `registerMessageDecorator` 라는 이름이 형제의 네 파일 어디에도 없었다(감사 전수 grep 확인). 더 나쁜 것은 형제가 세 곳에서 **`createRichContext({ api, doc }).decorate`** 를 넘기겠다고 적은 것이다 — 이 SPEC 은 **팩토리**를 요구하므로(`AC-WEBCHAT-002` 의 `expect(factoryCalls).toBe(2)` 가 그것을 기계적으로 못 박는다) 그대로 구현하면 `openRoom` 이 `decorate({ api, doc }, undefined)` 를 부르고 반환 `undefined` 가 방의 컨텍스트가 된다. 이 라운드에서 §4.6 에 **「배선 계약」**을 신설해 배선 한 줄의 소유자(`SPEC-WEBRICH-001`)·자리(`web/app.js` 모듈 최상위)·넘기는 값(`createRichContext` 그 자체)·관측자(`AC-WEBRICH-016` 관측 4·5)를 못 박았고, **형제 `SPEC-WEBRICH-001` v0.3.0 이 REQ-WEBRICH-002 에 글자 그대로 같은 문단을 싣는다.** 두 라운드 연속으로 형제가 서로를 안 보고 고쳐 이음매가 어긋났기 때문에, 이번에는 한 세션이 두 SPEC 을 함께 고쳤다(감사 권고 5). ② **O-12** — 소비자가 없는 `refreshRoomBots` export 는 그대로 둔다. 이 SPEC 의 REQ-WEBCHAT-009 가 스스로 부르므로 형제에게 의무를 지우지 않는다. ③ 감사 권고 3에 따라 열여섯 기준을 **세 번째 물음 — "이 기준이 실패가 아니라 *공허*로 무너지는 입력이 있는가"** — 로 전수 훑었다(`plan.md` §E.3). 기준별 적발 **0건**(`AC-WEBCHAT-015` 는 그 가드를 처음부터 갖고 있었다), 횡단 1건(테스트 미실행·`skip` 시 `npm test` 가 종료 코드 `0`)을 DoD 한 줄로 막았다. 요구사항 16개·수용 기준 16개 불변. | manager-spec |

---

## 1. 배경과 목적

카드 `t5` (마일스톤 M5)는 `plan-v2.md` 의 Task 15·16·17 을 담는다. 이 SPEC 은 그 가운데 **Task 16 — 채팅 화면** 하나만 맡는다.

Task 15(`SPEC-WEBSHELL-001`)가 로그인 화면과 방 목록, 그리고 `api()`·`state`·`$()` 라는 토대를 만든다. Task 17(`SPEC-WEBRICH-001`)이 파일 첨부 표시와 봇 초대 모달, 권한 승인 버튼을 얹는다. 이 SPEC 은 그 사이에서 **방을 열고, 과거 대화를 불러오고, 실시간으로 받고, 봇을 멘션하고, 봇이 지금 무엇을 하고 있는지 보여 주는** 층을 만든다.

이 SPEC 이 끝나면 이런 상태가 된다.

```
사용자가 방 클릭
   → openRoom(id)
   → GET /api/rooms/:id/messages        (과거 대화)
   → GET /api/rooms/:id/invites         (이 방의 봇 목록 + online)
   → new EventSource('/api/rooms/:id/events')
        ├─ event: message    → 화면에 한 줄 추가
        └─ event: bot_status → 봇 칩 표시 변경 (입력 중… / 응답 없음?)
사용자가 '@' 입력
   → 그 방 봇 목록 드롭다운
   → 선택하면 '@TO(이름) ' 삽입 → 서버 parseMentions 가 그 봇으로 해석
```

### 이 SPEC 이 지키는 가장 중요한 성질 — 계약 일치

이 화면이 만드는 문자열 하나가 서버의 파서 하나와 **정확히 맞아야** 한다.

| 만드는 쪽 | 해석하는 쪽 |
|-----------|-------------|
| 자동완성이 `#msg-input` 에 삽입하는 `@TO(이름)` / `@CC(이름)` | `server/src/mention.ts` 의 `MENTION_RE = /@(TO\|CC)\(([^()\s]+)\)/g` |

이 둘이 어긋나면 **아무 오류도 나지 않는다.** 메시지는 정상적으로 저장되고, 화면에도 뜨고, 서버는 `200` 을 돌려준다. 다만 그 메시지가 어떤 봇에게도 전달되지 않는다. 사용자는 봇이 무시했다고 생각하고, 봇은 메시지를 받은 적이 없다. **조용히 실패하는 결함이며, 이 SPEC 에서 가장 값비싼 하나다.** REQ-WEBCHAT-010·011 과 AC-WEBCHAT-010·011 이 그 성질을 정면으로 관측한다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 16, `spec-v2.md` 4-C(웹 UI)·8장(봇 상태와 응답 없음 판정).
시각 기준: `.moai/project/design-dna-discord.md` 와 그것을 CSS 변수로 옮긴 `web/design-tokens.css`.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 채팅 영역 | `web/index.html` 의 `<main id="chat">` 안. 방 헤더 + 메시지 목록 + 작성기 세 부분 |
| 작성기(composer) | `#composer` — 자동완성 드롭다운 · 입력창 · 파일 선택 · 보내기 버튼 |
| 봇 칩 | `#room-bots` 안의 `.bot-chip` 한 개. 봇 하나의 이름·온라인 여부·활동 상태를 한 덩어리로 보여 준다 |
| 멘션 토큰 | 입력창에서 커서 바로 앞에 있는 `@` 로 시작하는 미완성 낱말. `(^\|\s)@([^\s(]*)$` 로 감지한다 |
| 멘션 문자열 | 자동완성이 삽입하는 완성된 형태. `@TO(이름) ` 또는 `@CC(이름) ` |
| 멘션 가능한 이름 | `/^[^()\s]+$/` 를 만족하는 봇 이름. 서버 파서가 해석할 수 있는 이름이다 |
| working / idle | 봇 게이트웨이가 `bot_status` 이벤트로 보내는 두 값. 그 밖의 값은 서버가 발행하지 않는다 |
| stale(응답 없음) | `working` 을 받은 뒤 `idle` 없이 5분이 지난 상태. 서버가 아니라 **브라우저가 타이머로 판정한다** |
| 방 세대(room generation) | 방을 열 때마다 1 씩 오르는 정수. 늦게 도착한 비동기 응답이 어느 방 것인지 가리는 데 쓴다 |
| 백필(backfill) | SSE 가 끊겼다 다시 붙은 사이에 놓친 메시지를 `?after=<마지막 id>` 로 다시 받아 채우는 것 |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 은 **서버 코드를 한 줄도 고치지 않는다.** 아래를 그대로 소비한다.

| 출처 | 받아 쓰는 것 | 실제 코드에서 확인한 모양 |
|------|-------------|--------------------------|
| `SPEC-WEBSHELL-001` | `$(id)`, `api(path, opts)`, `state` 객체, `showAuth()`/`showMain()`, `renderRooms()`, `loadRooms()`, `openRoom(id)` 이름 | **`SPEC-WEBSHELL-001/spec.md` §4.3 REQ-WEBSHELL-005(18개 export)와 §4.8(공유 계약 여섯 조항)이 그 전문이다.** 이 SPEC 은 그 표면을 여기에 다시 적지 않고 **참조한다** — 각자 자기 문서에 표면을 적었기 때문에 세 SPEC 이 서로 다른 약속을 적게 됐다는 것이 감사 진단이다. 아직 구현 전이며, 이 SPEC 의 유일한 미구현 의존이다 |
| `SPEC-SSE-001` | `GET /api/rooms/:id/events`, 프레임 형식 `event: <이름>\ndata: <JSON>\n\n`, 구독 직후 `: connected` 주석 | `server/src/sse.ts` (구현 완료, 직접 읽어 확인) |
| `SPEC-MSG-001` | `GET /api/rooms/:id/messages[?after=<id>]` → `{ messages: [...] }`, `POST /api/rooms/:id/messages` (multipart), SSE `message` 페이로드 | `server/src/routes-messages.ts` (구현 완료, 직접 읽어 확인) |
| `SPEC-MENTION-001` | `@TO(이름)` / `@CC(이름)` 문법과 그것을 해석하는 정규식 | `server/src/mention.ts` (구현 완료, 직접 읽어 확인) |
| `SPEC-BOT-001` | `GET /api/rooms/:id/invites` → `[{ bot_id, bot_name, online }]` | `server/src/routes-bots.ts` (구현 완료, 직접 읽어 확인) |
| `SPEC-GATEWAY-001` | SSE `bot_status` 페이로드 `{ bot_id, state }` 와 `state ∈ {'working','idle'}` | `server/src/gateway.ts:71-74` (구현 완료, 직접 읽어 확인) |
| `SPEC-PERM-001` | 권한 릴레이가 만드는 system 메시지가 `message` 이벤트로 온다는 사실 (`author_type: 'system'`) | `server/src/permissions.ts:27` — 새 이벤트 타입을 만들지 않는다 |

### 3.1 실제 코드에서 확인한 페이로드 모양

**`message` 이벤트 / 메시지 목록 항목** — 세 발행 지점(`routes-messages.ts:114`, `gateway.ts:173`, `permissions.ts:27`)이 모두 아래 모양을 낸다.

```
{ id, room_id, author_type: 'user'|'bot'|'system', author_user_id, author_bot_id,
  body, created_at, author_name, attachments: [{ id, filename }] }
```

`stored_path` 는 어느 경로에도 실리지 않는다(서버가 의도적으로 뺐다). `created_at` 은 SQLite `datetime('now')` 가 만드는 `'YYYY-MM-DD HH:MM:SS'` 문자열이다.

**`bot_status` 이벤트** — `{ bot_id, state }`. `state` 는 `'working'` 과 `'idle'` 둘뿐이며, 게이트웨이가 그 밖의 값을 걸러 낸다.

**`invites` 응답** — `[{ bot_id, bot_name, online }]`. `online` 은 게이트웨이 접속 여부이고, 게이트웨이가 없는 조립에서는 `false` 다.

---

## 4. 요구사항 (GEARS)

### 4.1 마크업과 렌더링

**REQ-WEBCHAT-001** (Ubiquitous)
`web/index.html` 의 `<main id="chat">` 안은 아래 **열 개** id 를 가진 요소를 포함해야 한다 — `room-header`, `room-title`, `room-bots`, `invite-btn`, `messages`, `composer`, `autocomplete`, `msg-input`, `file-input`, `send-btn`.

이 id 들은 **계약이다.** `invite-btn` 과 `file-input` 은 이 SPEC 이 동작을 붙이지 않고 자리만 남긴다 — `SPEC-WEBRICH-001` 이 그 둘에 결합한다. `#autocomplete` 는 초기 상태가 `hidden` 이어야 한다.

**요소 소유권 경계** (`SPEC-WEBSHELL-001` §4.8 계약 4). `#chat` **요소 자체**는 형제 SPEC 소유이며 이 SPEC 은 그것을 **지우지 않는다**. `#chat` 의 **내용물**은 이 SPEC 소유이며 통째로 교체해도 된다. 형제가 그 안에 둔 `#placeholder` 는 **제거하거나 `hidden` 으로 남길 수 있다** — 형제의 영구 테스트는 `#placeholder` 의 존재를 단언하지 않고, 자기 마감 시점 검사에서만 본다. 형제의 영속 id 24개는 하나도 지우지 않는다. 이 SPEC 이 새로 더하는 id 열 개는 문서 전체에서 유일해야 한다.

**REQ-WEBCHAT-002** (When — 방이 선택됨)
`openRoom(id)` 가 호출되면, 구현은 순서대로 다음을 해야 한다.

0. `initChat()` 을 부른다 (REQ-WEBCHAT-016). 멱등이며, 채팅 전용 `state` 필드를 초기화하고 작성기 이벤트 핸들러를 한 번만 건다. **이 단계가 다른 어떤 단계보다 먼저다** — 이후 단계가 만지는 필드가 여기서 만들어진다.
1. 열려 있는 `EventSource` 가 있으면 닫는다.
2. 이전 방의 stale 타이머를 전부 해제하고 working·stale 표시를 비운다 (REQ-WEBCHAT-007).
3. 방 세대를 1 올리고 그 값을 지역 변수에 잡아 둔다 (REQ-WEBCHAT-014).
3-1. 등록된 장식 팩토리가 있으면 **이 방 전용 장식 컨텍스트를 새로 만들어** 보관한다 (REQ-WEBCHAT-016). 없으면 컨텍스트를 비운다.
4. `state.currentRoomId` 를 갱신하고 `renderRooms()` 를 부른다.
5. `#room-title` 과 `#messages` 를 그 방의 것으로 초기화한다.
6. `GET /api/rooms/:id/messages` 로 과거 대화를 받아 순서대로 `renderMessage` 한다.
7. `#messages` 를 맨 아래로 스크롤한다.
8. `GET /api/rooms/:id/invites` 로 봇 목록을 받아 캐시하고 `#room-bots` 를 그린다.
9. `new EventSource('/api/rooms/:id/events')` 로 스트림을 연다.

`#room-title` 은 `state.rooms` 에서 방을 찾지 못해도 `# undefined` 를 보여서는 안 된다 — 찾지 못하면 방 번호를 쓴다.

**REQ-WEBCHAT-003** (Ubiquitous)
`renderMessage(m)` 은 아래 구조의 요소 하나를 만들어 `#messages` 에 덧붙여야 한다.

```
div.message.<author_type>
  ├ div.msg-head  ── strong(작성자 이름) + span(시각)
  └ div.msg-body  ── 본문
```

`author_type` 이 `'bot'` 인 메시지의 작성자 이름 요소는 봇마다 다른 색을 가져야 한다. 색은 `web/design-tokens.css` 의 `--md-role-color-1..5` 를 `author_bot_id` 로 순환 배정한다(디자인 DNA §1 의 "역할 색상 → 봇 색상" 적용점).

**확장 훅 — 이 SPEC 이 생산자다** (감사 MF-5). `renderMessage` 는 요소를 만든 뒤, **`#messages` 에 붙이기 직전에** 등록된 장식 훅을 **정확히 한 번** 부른다. 그 자리의 계약은 이렇다.

| 항목 | 값 |
|------|-----|
| 호출 자리 | `$('messages').appendChild(el)` **바로 앞**. 요소는 이미 `.msg-head`·`.msg-body` 까지 완성돼 있고, 아직 문서에 붙어 있지 않다 |
| 호출 형태 | `ctx.decorate(el, m)` — 인자 둘, 반환값은 **쓰지 않는다** |
| `el` | 이 메시지의 `div.message.<author_type>` 요소 |
| `m` | 서버가 준 메시지 객체 원본 (§3.1 의 모양 그대로, `attachments` 포함) |
| 훅이 해도 되는 것 | `el` 의 자손을 더하는 것. `.msg-head > strong`·`.msg-head > span`·`.msg-body` **세 요소를 지우거나 바꾸지 않는다** (AC-WEBCHAT-002 가 그 구조를 계속 단언한다) |
| 훅이 없을 때 | **아무것도 부르지 않고 그대로 붙인다.** 예외도, 로그도, 빈 자리 표시도 없다 |
| 호출 횟수 | 메시지 하나당 정확히 한 번. 과거 대화 렌더와 SSE 수신 렌더 **양쪽 모두** 같은 경로를 지난다 |
| 예외 처리 | 훅이 던지면 삼키지 않는다. 조용한 실패보다 그 자리에서 드러나는 편이 낫다 |

`ctx` 는 방을 열 때 만들어진 이 방 전용 장식 컨텍스트다(REQ-WEBCHAT-002 단계 3-1, REQ-WEBCHAT-016). `SPEC-WEBRICH-001` 이 그 컨텍스트를 만드는 팩토리(`createRichContext({ api, doc })`)와 그것이 돌려주는 `decorate(el, m)` 를 소유한다. **첨부 표시(`m.attachments` 소비)와 권한 승인 버튼은 전부 그 훅 안에서 일어나며, 이 SPEC 은 `m.attachments` 를 읽지 않는다.**

**REQ-WEBCHAT-004** (Unwanted — shall not)
구현은 사용자·봇·시스템이 만든 어떤 문자열도 `innerHTML` 로 DOM 에 넣어서는 안 된다. 메시지 본문, 작성자 이름, 봇 이름, 방 이름은 전부 `textContent` 로만 넣는다. `innerHTML` 은 컨테이너를 비우는 용도(`= ''`)로만 쓴다.

봇의 답변 본문은 사용자가 통제하지 않는 문자열이고, 봇 이름과 방 이름은 다른 사용자가 등록할 수 있다. 셋 다 신뢰 경계 밖이다.

### 4.2 실시간 수신

**REQ-WEBCHAT-005** (When — `message` 이벤트 도착)
`EventSource` 가 `message` 이벤트를 방출하면, 구현은 `JSON.parse(e.data)` 한 객체를 `renderMessage` 로 그리고, `#messages` 를 맨 아래로 스크롤하고, 그 메시지의 `id` 를 마지막 수신 id 로 기록해야 한다.

마지막 수신 id 는 REQ-WEBCHAT-008 의 백필 커서다.

**REQ-WEBCHAT-006** (When — `bot_status` 이벤트 도착)
`bot_status` 이벤트가 도착하면, 구현은 `{ bot_id, state }` 를 읽어 다음을 해야 한다.

- `state === 'working'`: 그 봇을 working 으로 표시하고, 기존 stale 타이머가 있으면 해제한 뒤 **5분(300,000ms)** 짜리 타이머를 새로 건다. 타이머가 만료되면 그 봇을 stale 로 표시하고 봇 칩을 다시 그린다.
- `state === 'idle'`: working 표시와 stale 표시를 모두 해제하고 타이머를 해제한다.

봇 칩의 표시는 `🟢 이름` / `⚪ 이름`(online 여부) 뒤에 `(입력 중…)` 또는 `(응답 없음?)` 를 붙인다. stale 이 working 보다 우선한다.

5분 기준의 근거는 `spec-v2.md` 8장이다. **이 판정은 서버가 아니라 브라우저가 한다** — 서버는 `stale` 이라는 상태를 발행하지 않는다.

**REQ-WEBCHAT-007** (Unwanted — shall not)
구현은 방을 떠난 뒤에도 살아 있는 타이머나 열린 `EventSource` 를 남겨서는 안 된다. 방을 전환하거나 같은 방을 다시 열면, 직전 방에서 건 stale 타이머는 전부 해제되고 직전 `EventSource` 는 닫혀야 한다.

관측 가능한 결과로 진술한다 — 방 `1` 에서 `working` 을 받아 타이머가 걸린 상태에서 방 `2` 를 열면, 대기 중인 타이머 수가 `0` 이고 방 `1` 의 `EventSource` 는 `close()` 를 받은 상태여야 한다. **"누수가 없다"는 부재 진술로는 검사하지 않는다.**

**REQ-WEBCHAT-008** (When — 스트림이 끊겼다 다시 붙음)
`EventSource` 가 `error` 를 낸 뒤 다시 `open` 되면, 구현은 `GET /api/rooms/:id/messages?after=<마지막 수신 id>` 를 호출해 끊긴 사이의 메시지를 받아 순서대로 그려야 한다.

`SPEC-SSE-001` REQ-SSE-009 가 `id:`·`retry:` 필드와 하트비트를 금지하므로, 브라우저의 `Last-Event-ID` 재개 경로는 **존재하지 않는다.** 자동 재연결만 있고 놓친 이벤트는 서버가 다시 보내 주지 않는다. 그 공백을 메우는 것은 REST 커서뿐이며, `routes-messages.ts` 의 `?after=` 파라미터가 정확히 그 용도다. 원본 Task 16 코드에는 이 처리가 전혀 없다 (`plan.md` §D 7번).

### 4.3 @ 자동완성

**REQ-WEBCHAT-009** (When — 멘션 토큰이 감지됨)
`#msg-input` 에 `input` 이벤트가 발생하고 커서 앞 문자열이 `(^|\s)@([^\s(]*)$` 에 일치하면, 구현은 그 방의 **캐시된** 초대 목록에서 접두사가 일치하는 봇을 골라 `#autocomplete` 에 후보로 표시해야 한다. 일치하는 봇이 없거나 토큰이 감지되지 않으면 `#autocomplete` 를 숨긴다.

**구현은 키 입력마다 `GET /api/rooms/:id/invites` 를 호출해서는 안 된다.** 목록은 방을 열 때(REQ-WEBCHAT-002 단계 8)와 `bot_status` 를 받을 때만 갱신한다. 원본 Task 16 코드는 매 키 입력마다 호출하고 그 응답들의 도착 순서를 보장하지 않는다 (`plan.md` §D 4번).

**REQ-WEBCHAT-010** (Ubiquitous)
자동완성 후보를 선택했을 때 `#msg-input` 에 삽입되는 문자열은, `server/src/mention.ts` 의 `parseMentions()` 에 넣었을 때 **선택한 그 봇 이름과 선택한 그 전달 종류(`to` / `cc`)로 정확히 해석되어야 한다.**

이것이 이 SPEC 의 계약 일치 요구사항이다. 서버 문법은 `@(TO|CC)\(([^()\s]+)\)` 이며, 이 SPEC 은 그 정규식을 **바꾸지 않는다** — `SPEC-MENTION-001` 이 소유하고, 게이트웨이와 메시지 라우트가 그것에 결합해 있다. 맞추는 쪽은 UI 다.

**REQ-WEBCHAT-011** (Unwanted — shall not)
구현은 서버 파서가 해석할 수 없는 봇 이름(`/^[^()\s]+$/` 를 만족하지 않는 이름 — 공백이나 괄호를 포함하는 이름)을 **선택 가능한 자동완성 후보로 제시해서는 안 된다.** 그런 이름은 후보 목록에서 제외하거나, 선택 불가 항목으로 표시하고 그 이유를 함께 보여 준다.

`POST /api/bots` 는 `name.trim()` 이 비지 않기만 하면 어떤 이름이든 받는다(`routes-bots.ts`). 즉 `코드 리뷰어` 같은 이름이 실제로 등록될 수 있고, 그 이름으로 `@TO(코드 리뷰어)` 를 만들면 서버 파서는 아무것도 찾지 못한다. 메시지는 `200` 으로 저장되고 화면에도 뜨지만 어떤 봇에게도 가지 않는다 — **오류 없이 조용히 실패한다.** UI 가 그 이름을 완성해 주는 것이 그 실패를 만드는 마지막 조각이므로, 여기서 막는다 (`plan.md` §D 1번).

**REQ-WEBCHAT-012** (While — 자동완성 드롭다운이 열려 있음)
`#autocomplete` 가 보이는 동안 `#msg-input` 에서 `Shift` 없는 `Enter` 가 눌리면, 구현은 메시지를 전송해서는 안 된다. 대신 현재 후보를 확정하거나(선택 가능한 후보가 있을 때) 드롭다운을 닫는다.

원본 코드는 드롭다운 상태를 보지 않고 곧바로 전송한다. `@pm` 까지 치고 `Enter` 를 누른 사용자는 완성될 것이라 기대하지만, 실제로는 `@pm` 이라는 깨진 멘션이 담긴 메시지가 전송되고 그 메시지는 어떤 봇에게도 가지 않는다 (`plan.md` §D 3번).

### 4.4 전송

**REQ-WEBCHAT-013** (When — 전송이 요청됨)
`#send-btn` 클릭 또는 `Shift` 없는 `Enter`(드롭다운이 닫혀 있을 때)로 전송이 요청되면, 구현은 `FormData` 에 `body` 를 담아 `POST /api/rooms/:id/messages` 를 **한 번** 호출해야 한다. 본문이 비어 있으면 아무것도 하지 않는다.

- 구현은 **POST 응답의 `message` 를 화면에 그려서는 안 된다.** 서버는 저장 직후 같은 메시지를 `message` 이벤트로 그 방 전원(보낸 사람 포함)에게 발행한다(`routes-messages.ts:114`). 응답도 그리면 자기 메시지가 두 번 보인다.
- 실패하면 오류를 사용자에게 알리고 입력창의 내용을 복원한다.

**REQ-WEBCHAT-014** (Where — 비동기 응답이 늦게 도착함)
비동기 호출(과거 메시지 조회, 초대 목록 조회)의 응답을 화면에 반영하기 전에, 구현은 그 호출을 시작한 시점의 방 세대와 현재 방 세대가 같은지 확인해야 한다. 다르면 응답을 버린다.

원본 코드는 `await` 뒤에 `state.currentRoomId` 를 다시 읽거나 아예 확인하지 않는다. 방 `1` 을 클릭하고 응답이 오기 전에 방 `2` 를 클릭하면, 방 `1` 의 메시지가 방 `2` 화면에 그려진다 (`plan.md` §D 5번).

### 4.5 범위 경계 (금지)

**REQ-WEBCHAT-015** (Unwanted — shall not)
이 SPEC 의 구현은 `server/` 아래 어떤 파일도, `channel/` 아래 어떤 파일도 고쳐서는 안 된다. 손대는 파일은 `web/index.html`, `web/app.js`, `web/style.css` 셋과 이 SPEC 이 새로 만드는 테스트 파일뿐이다.

`web/style.css` 에 이 SPEC 이 더하는 규칙은 `web/design-tokens.css` 의 CSS 변수를 써야 하며, 색상을 16진수 리터럴로 직접 적어서는 안 된다. 판정을 위해 이 SPEC 이 더하는 블록은 `/* ── SPEC-WEBCHAT-001 채팅 영역 ── */` 주석으로 시작한다.

`web/design-tokens.css` 자체도 고치지 않는다 — 그 파일은 디자인 DNA 문서의 값을 옮긴 것이며 이 SPEC 은 소비자다.

### 4.6 이 SPEC 이 공유 표면에 더하는 것

**REQ-WEBCHAT-016** (Ubiquitous)
`web/app.js` 는 `SPEC-WEBSHELL-001` REQ-WEBSHELL-005 의 필수 18개 export 를 **그대로 두고**, 아래 이름 다섯을 **더 내보내야** 한다. 형제 SPEC 의 계약은 export 를 더하는 것을 허용하며(§4.8 계약 3), 형제의 기준은 더해진 이름에 침묵한다.

```js
export function initChat()                             // 멱등 초기화 — state 필드 + 작성기 핸들러
export function renderMessage(m)                       // REQ-WEBCHAT-003
export async function sendMessage()                    // REQ-WEBCHAT-013
export async function refreshRoomBots()                // 초대 목록 캐시 갱신 + #room-bots 재렌더
export function registerMessageDecorator(factory)      // 장식 팩토리 등록 (아래 「배선 계약」 참조)
```

`openRoom(id)` 는 형제가 이름을 확정하고 최소 본체만 둔 함수이며, **이 SPEC 이 그 본체를 채운다.** 이름과 시그니처는 바꾸지 않는다.

**`state` 필드 소유** (감사 MF-4, 형제 §4.8 계약 2). 형제 SPEC 은 `rooms`·`bots`·`currentRoomId` 세 필드만 초기화하며 **다른 어떤 필드도 미리 선언하지 않는다.** 따라서 아래 일곱 필드는 이 SPEC 이 `initChat()` 안에서 **스스로 선언·초기화한다.**

| 필드 | 초기값 | 쓰임 |
|------|--------|------|
| `state.sse` | `null` | 열려 있는 `EventSource` 핸들 (REQ-WEBCHAT-002·007) |
| `state.workingBots` | `new Set()` | working 표시 중인 `roomId:botId` 키 (REQ-WEBCHAT-006) |
| `state.staleTimers` | `{}` | 키 → 5분 타이머 핸들 (REQ-WEBCHAT-006·007) |
| `state.staleBots` | `new Set()` | stale 판정된 키 (REQ-WEBCHAT-006) |
| `state.lastEventId` | `0` | 백필 커서 (REQ-WEBCHAT-005·008) |
| `state.roomBots` | `[]` | 이 방의 초대 목록 캐시 (REQ-WEBCHAT-009) |
| `state.roomGeneration` | `0` | 방 세대 카운터 (REQ-WEBCHAT-014) |

[HARD] **이 필드들이 이미 초기화돼 있다고 가정하지 않는다.** 초기화의 유일한 자리는 `initChat()` 이고, `initChat()` 은 `openRoom` 의 0단계에서 불린다. 그 순서가 지켜지므로 옵셔널 체이닝(`?.`)과 `??=` 방어는 두지 않는다 — 초기화가 깨지면 `TypeError` 로 그 자리에서 드러나는 편이 조용히 아무것도 하지 않는 것보다 낫다 (`plan.md` §D 7번).

**장식 팩토리 등록 계약.** `registerMessageDecorator(factory)` 는 팩토리 하나를 기억한다. `factory` 는 `({ api, doc })` 를 받아 `{ decorate(el, m) }` 를 돌려주는 함수다. `openRoom` 은 방을 열 때마다 `factory({ api, doc: document })` 를 **새로 불러** 그 방 전용 컨텍스트를 만든다 — 판정 완료 상태 같은 방 국소 상태가 방을 넘어가지 않게 하는 것이 그 목적이며, 그 요구는 `SPEC-WEBRICH-001` 이 낸 것이다. 등록이 없으면 컨텍스트는 `null` 이고 `renderMessage` 는 훅을 부르지 않는다.

**배선 계약 (이음매의 마지막 한 줄).** `web/app.js` 의 **모듈 최상위**(어떤 함수 본체도 아닌 자리)에서 `registerMessageDecorator(createRichContext)` 를 **정확히 한 번** 호출한다. 넘기는 값은 팩토리 함수 `createRichContext` **그 자체**이며, 그것을 호출한 결과(`createRichContext({ ... }).decorate`)가 아니다 — 결과를 넘기면 `openRoom` 이 `factory({ api, doc })` 를 부를 때 실제로는 `decorate({ api, doc }, undefined)` 가 불리고, 그 반환 `undefined` 가 그 방의 컨텍스트가 된다. 그 호출 줄과 그것을 가능하게 하는 `import { createRichContext } from './rich.js'` 는 **`SPEC-WEBRICH-001` 이 소유**하며, `SPEC-WEBCHAT-001` 은 등록 지점을 만들 뿐 그 줄을 쓰지 않는다. 관측은 `AC-WEBRICH-016` 관측 4가 진다.

[HARD] **위 문단은 `SPEC-WEBRICH-001` v0.3.0 `spec.md` REQ-WEBRICH-002 와 글자 그대로 같다.** 두 라운드 연속으로 이 이음매가 어긋난 원인은 두 SPEC 이 같은 사실을 각자의 말로 적은 것이었다(감사 MF-5 → MF-9). 한쪽을 고칠 때 다른 쪽도 같은 문장으로 고친다 — 문장이 갈라지면 그때가 다시 어긋난 때다.

**이 SPEC 이 배선에 대해 지는 의무는 하나뿐이다** — `registerMessageDecorator` 를 export 하고, `openRoom` 이 등록된 팩토리를 방마다 새로 부르게 하는 것. 배선 줄 자체는 이 SPEC 의 산출물이 아니며, 이 SPEC 의 어떤 수용 기준도 그 줄을 관측하지 않는다(관측자는 형제의 `AC-WEBRICH-016` 이다). 이 SPEC 은 **배선이 없는 상태에서도 단독으로 마감·검증된다** — `AC-WEBCHAT-002` 의 셋째 테스트("훅 없이도 렌더가 성립")가 그 자립성을 보장한다.

**`web/app.js` 는 ES 모듈이다.** 이 결정의 출처는 `SPEC-WEBSHELL-001` §4.8 계약 1이며, plan-audit 교정 게이트에서의 오케스트레이터 결정이다. 이 SPEC 은 그 결정을 따르고, 테스트는 `await import(...)` 로 모듈을 적재한다.

**네트워크 호출 자리 제한** (형제 §4.8 계약 6). 형제가 소유한 아홉 함수(`api`·`login`·`register`·`logout`·`loadRooms`·`loadBots`·`createRoom`·`archiveRoom`·`createBot`) 본문에 `fetch`/`api()` 호출을 **더하지 않는다.** 형제의 기준이 그 함수들의 호출을 순번으로 단언하기 때문이다. 이 SPEC 의 배선은 `openRoom` 본체와 위 다섯 함수 안에만 둔다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자를 명시한다.

### Out of Scope — 웹 UI 토대 (같은 카드 `t5`, Task 15 — `SPEC-WEBSHELL-001`)

- 로그인·회원가입 화면(`#auth-view`)과 그 폼 처리
- 방 목록·보관 목록 사이드바(`#sidebar`, `renderRooms`, `#archived-box`)와 봇 등록 목록(`#bot-list`)
- `api(path, opts)` fetch 래퍼, `state` 객체 선언과 그 세 필드(`rooms`·`bots`·`currentRoomId`), `$(id)` 헬퍼, `showAuth()`/`showMain()`, `promptText()`. **`enterMain()` 이라는 이름은 어디에도 존재하지 않는다** — 0.1.0 이 그 이름을 적은 것은 오기였고, 실재하는 것은 `showMain()` 이다(형제 §4.8 계약 3 이름 대조표)
- `server/src/index.ts` 의 정적 파일 서빙(`@fastify/static`) 배선
- `web/index.html` 의 문서 골격(`<head>`, `<script>` 태그, 영속 id 24개, `#auth-view`, `#sidebar`, `#prompt-dialog`, `#chat` **요소 자체**)과 `web/style.css` 의 토대 규칙 및 그 첫머리의 `@import`. **디자인 토큰은 `web/style.css` 의 `@import` 하나로만 실리고 `index.html` 에는 `design-tokens.css` 문자열이 없다** — 로딩 확인은 `grep -q "design-tokens.css" web/style.css` 로 한다(형제 §4.8 계약 5)

### Out of Scope — 첨부·모달·권한 버튼 (같은 카드 `t5`, Task 17 — `SPEC-WEBRICH-001`)

- 메시지의 파일 첨부 표시. 이 SPEC 의 `renderMessage` 는 `m.attachments` 를 읽지 않는다. **다만 그 확장이 들어오는 자리(장식 훅)는 이 SPEC 이 소유하고 REQ-WEBCHAT-003·016 이 규정한다** — 훅의 등록·생성·호출은 여기, 훅의 내용은 저기다
- `#file-input` 에 실제로 파일을 담아 보내는 동작. 이 SPEC 은 요소만 두고 `FormData` 에 본문만 담는다
- `#invite-btn` 을 눌렀을 때 뜨는 봇 초대 모달과 초대 토큰 표시
- 권한 승인 버튼. 권한 요청은 `author_type: 'system'` 인 일반 메시지로 오므로 **이 SPEC 의 `renderMessage` 가 텍스트로는 이미 보여 준다.** 그 위에 yes/no 버튼을 얹는 것이 Task 17 의 몫이다
- **`registerMessageDecorator(createRichContext)` 배선 한 줄과 그 `import`** — 이 SPEC 은 등록 함수와 호출 지점을 만들 뿐, 그 줄을 쓰지 않는다(§4.6 「배선 계약」). 관측도 형제의 `AC-WEBRICH-016` 관측 4·5 가 진다

### Out of Scope — 서버 계층 (카드 `t3`, 구현 완료)

- SSE 허브와 이벤트 스트림 라우트(`SPEC-SSE-001`)
- 메시지 API 와 `?after=` 커서(`SPEC-MSG-001`). 이 SPEC 은 커서를 **쓰기만** 한다
- `@TO`/`@CC` 파서와 그 정규식(`SPEC-MENTION-001`). **이 SPEC 은 그 정규식을 바꾸지 않고 맞춘다**
- 초대 목록과 `online` 판정(`SPEC-BOT-001`·`SPEC-GATEWAY-001`)
- 권한 릴레이 브로커와 `PERMISSION_REPLY_RE`(`SPEC-PERM-001`)

### Out of Scope — 시각·상호작용 심화

- 같은 작성자의 연속 메시지 그룹핑(디자인 DNA §3 이 권하는 패턴). 값어치는 인정하지만 Task 16 에 없고 Tier M 예산 밖이다. 별도 SPEC 이 정한다
- 자동완성의 키보드 위/아래 탐색과 하이라이트 이동. `Enter` 로 인한 오전송만 막는다(REQ-WEBCHAT-012)
- 마크다운 렌더링, 코드 블록 하이라이트, 이모지 치환, 링크 자동 변환. 본문은 `white-space: pre-wrap` 텍스트로만 보여 준다
- 읽음 표시, 타이핑 인디케이터(사람 쪽), 알림, 사운드
- 메시지 수정·삭제·검색·무한 스크롤(과거 방향 페이지네이션). 목록은 서버가 한 번에 최대 200개를 준다
- 시각 문자열의 지역 시간 변환. 서버가 주는 `created_at` 을 그대로 보여 준다
- 모바일 반응형 레이아웃. 단일 사용자 데스크톱 전제다

---

## 6. 제약

- 프레임워크 없는 바닐라 JavaScript. 빌드 단계도 번들러도 없다 — `web/app.js` 는 브라우저가 그대로 읽는 **ES 모듈**(`<script type="module">`)이다. 이 결정의 출처는 `SPEC-WEBSHELL-001` §4.8 계약 1(오케스트레이터 결정)이며 이 SPEC 은 그것을 따른다.
- **새 런타임 의존성을 추가하지 않는다.** 테스트용 개발 의존성(`jsdom`) 하나만 추가하며, 그것도 `server` 워크스페이스의 `devDependencies` 다 (`plan.md` §C).
- 테스트 프레임워크는 vitest(`^4.1.11`, `server` 워크스페이스에 이미 설치됨). 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- **웹 UI 테스트는 jsdom 환경에서 돈다.** 1순위 경로는 파일 상단의 `// @vitest-environment jsdom` 독블록이다. **그것이 vitest 4 에서 듣지 않으면 `server/vitest.config.ts` 를 두는 것이 명시된 대체 경로다** — 이 파일은 형제 SPEC 의 허용 파일 집합에도 들어 있고 카드 전체가 그 경로를 필요로 할 수 있다. 어느 쪽을 썼는지 `progress.md` 에 기록한다. `web` 워크스페이스는 새로 만들지 않는다.
- **시간에 의존하는 검증은 실제 대기 없이 가짜 타이머로 한다.** 5분 stale 판정을 실제로 기다리지 않는다.
- **네트워크와 `EventSource` 는 전부 대역(stub)으로 대체한다.** 테스트에서 실제 서버를 띄우지 않는다 — 다만 `parseMentions` 만은 실제 서버 소스에서 import 한다. 그것이 계약 일치 검증의 전부다.
- UI 문구는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 기준 16개 가운데 15개는 명령 하나로 판정되는 기계 검증이고, 하나(AC-WEBCHAT-016)는 사람 눈이 필요한 시각 대조로 **명시적으로 MANUAL 로 표시**돼 있다. 자동으로 보이게 위장한 수동 검사는 두지 않는다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 15·16·17 (원본, 읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-C 웹 UI, 8장 봇 상태와 응답 없음 판정
- `.moai/project/design-dna-discord.md` — 시각 기준 (색·타이포·간격·모양·레이아웃)
- `web/design-tokens.css` — 위 문서를 CSS 변수로 옮긴 실제 파일. 이 SPEC 의 스타일은 이 변수를 쓴다
- `server/src/sse.ts`, `server/src/routes-messages.ts`, `server/src/mention.ts`, `server/src/routes-bots.ts`, `server/src/gateway.ts`, `server/src/permissions.ts` — 이 SPEC 이 소비하는 실제 서버 표면 (읽기 전용)
- `.moai/specs/SPEC-SSE-001/`, `.moai/specs/SPEC-MSG-001/`, `.moai/specs/SPEC-MENTION-001/`, `.moai/specs/SPEC-BOT-001/`, `.moai/specs/SPEC-GATEWAY-001/`, `.moai/specs/SPEC-PERM-001/` — 선행 SPEC
- 칸반 카드 `t5` (마일스톤 M5)
