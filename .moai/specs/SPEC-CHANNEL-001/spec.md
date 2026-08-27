---
id: SPEC-CHANNEL-001
title: "minidiscord 채널 플러그인 코어 — 공식 Channels 계약을 구현하는 MCP 서버"
version: "0.1.0"
status: draft
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "channel/"
lifecycle: spec-anchored
tags: "mcp-server, channels-contract, capabilities, reply-tool, fetch-history, stdio, stateless"
tier: M
depends_on: []
---

# SPEC-CHANNEL-001 — 채널 플러그인 코어 (MCP 채널 서버)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 11 과 `spec-v2.md` 4-B(채널 플러그인)에서 도출 (칸반 카드 `t4`, 마일스톤 M4). 요구사항 15개·수용 기준 16개로 Tier M 상한(16/16) 안이다. 원본 테스트가 **아무것도 재지 않는 자리 두 곳**(capabilities 를 `tools/list` 로 대신 확인, `fetch_history` 반환값이 상수여도 통과)과 **정상 구현을 거짓 실패시키는 자리 두 곳**(`setNotificationHandler` 에 Zod 스키마가 아닌 객체 리터럴 전달, 알림 도착을 기다리지 않음)을 찾아 `plan.md` §D 에 기록하고 이 문서의 기준에서 교정했다. `channel/tsconfig.json` 을 "server 와 동일(복사)" 하면 `bin` 이 가리키는 `dist/index.js` 가 생기지 않는 문제도 §D 에 있다. | manager-spec |

---

## 1. 배경과 목적

봇은 Claude Code 세션이다. 세션이 minidiscord 방에 참여하려면 Claude Code 가 세션마다 subprocess 로 띄우는 **채널 플러그인**이 있어야 한다. 그 플러그인은 공식 Channels 계약을 구현한 MCP 서버이고, stdio 로 Claude Code 와 말한다.

이 SPEC 은 그 플러그인의 **계약 표면**만 만든다. 게이트웨이도, WebSocket 도, 서버 접속도 없다 — 의존성을 함수로 주입받는 순수한 MCP 서버 하나다.

```
Claude Code 세션
      │ stdio (이 SPEC 이 만드는 경계)
      ▼
minidiscord-channel (MCP 서버)
  · capabilities: claude/channel + claude/channel/permission + tools
  · instructions: TO 는 반드시 응답 / CC 는 절대 응답 금지 / 따라잡기
  · reply 도구          → deps.sendToChat(...)
  · fetch_history 도구  → deps.fetchHistory(...)
  · pushChatMessage()   → notifications/claude/channel
      │
      ▼ (이 SPEC 밖 — 카드 t4 의 다음 SPEC 들이 잇는다)
   게이트웨이 WebSocket 클라이언트
```

주입된 함수들이 실제로 서버와 말하게 만드는 일은 이 SPEC 밖이다. 여기서 확정하는 것은 **계약이 정확히 어떤 모양인가**이고, 검증은 전부 `InMemoryTransport` 로 붙인 MCP 클라이언트와, 빌드된 실행 파일에 stdio 로 던지는 `initialize` 요청 하나로 한다.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 채널 계약 (Channels contract) | 공식 문서(channels-reference)와 `spec-v2.md` 4-B 가 정한 MCP 확장. capabilities·instructions·도구·알림 메서드 이름이 전부 이 계약에 속한다 |
| `ChannelDeps` | 채널 서버가 바깥과 말하는 유일한 통로. `sendToChat`·`fetchHistory`·`sendPermissionRequest?` 세 함수 |
| `ChannelHandle` | `createChannelServer` 의 반환값. `server`(MCP `Server` 인스턴스)와 `pushChatMessage` 를 노출한다 |
| 알림 (notification) | 서버가 클라이언트에게 일방적으로 보내는 JSON-RPC 메시지. 응답을 받지 않는다. 이 SPEC 에서는 `notifications/claude/channel` 하나뿐 |
| `delivery` | 그 채팅 메시지가 이 봇에게 `@TO` 로 왔는지 `@CC` 로 왔는지. `'to'` 면 답해야 하고 `'cc'` 면 답하면 안 된다 |
| `chat_id` | 채팅 메시지 하나를 가리키는 방 단위 단조 증가 번호. 알림 meta 에는 **문자열로** 실린다 |
| `#번호` | `fetch_history` 결과의 각 줄 앞에 붙는 메시지 번호 표기. 봇이 그 값을 `since_id` 로 되돌려 커서로 쓴다 |
| 따라잡기 | 멘션 없이 오간 대화를 봇이 `fetch_history` 로 스스로 읽어 맥락을 채우는 것 |
| 무상태 | 플러그인이 디스크에 아무 파일도 쓰지 않고, 설정을 환경변수로만 받는 성질 |

## 3. 선행 SPEC에서 받아 쓰는 것

없다. 이 SPEC 은 **독립 모듈**이다.

`plan-v2.md` Task 11 의 Interfaces 블록이 `Consumes: 없음(독립 모듈)` 이라고 명시하고, 실제로 `channel/` 아래 다섯 파일 외에 어떤 기존 산출물도 import 하지 않는다. `server/` 의 어떤 모듈도, 형제 SPEC 의 어떤 export 도 쓰지 않는다. 그래서 `depends_on` 이 비어 있다.

바깥에서 오는 것은 npm 의존성뿐이다.

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `@modelcontextprotocol/sdk` | `Server`, `StdioServerTransport`, `ListToolsRequestSchema`, `CallToolRequestSchema`. 테스트에서는 `Client`, `InMemoryTransport` |
| `zod` | 테스트에서 알림 스키마 선언 (`plan.md` §D 2번) |
| 루트 `package.json` | `workspaces` 에 `channel` 이 **이미 들어 있다**. 이 SPEC 은 루트를 고치지 않는다 |

---

## 4. 요구사항 (GEARS)

### 4.1 패키지 골격

**REQ-CHANNEL-001** (Ubiquitous)
`channel/package.json` 은 이름 `@minidiscord/channel`, `private: true`, `type: "module"` 이어야 하고, `bin` 에 `minidiscord-channel` → `./dist/index.js` 를 선언해야 하며, `dev`·`build`·`test`·`typecheck` 네 스크립트를 가져야 한다. 이름·`type`·`bin` 세 값은 원본이 준 리터럴 그대로이며 이 SPEC 에서 바꾸지 않는다.

`build` 스크립트가 만든 결과물은 **`channel/dist/index.js` 에 있어야 한다** — `bin` 이 가리키는 경로가 곧 사용자가 실행하는 경로이기 때문이다. tsconfig 를 형제 패키지에서 그대로 복사하면 이 조건이 깨진다(`plan.md` §D 3번).

**REQ-CHANNEL-002** (Unwanted — shall not)
채널 플러그인은 디스크에 **어떤 파일도 써서는 안 된다**. 캐시·로그·세션 파일·기록 스냅숏 무엇도 만들지 않는다. 설정(토큰·서버 주소)은 환경변수 `MINIDISCORD_TOKEN` 과 `MINIDISCORD_SERVER` 로만 받고, 설정 파일을 읽거나 쓰지 않는다.

이 SPEC 의 범위에서 두 환경변수를 **소비하는 코드는 아직 없다** — 게이트웨이 접속이 이 SPEC 밖이기 때문이다. 여기서 확정하는 것은 금지 쪽이다: 다른 경로로 설정을 받는 코드를 지금 만들지 않는다.

### 4.2 MCP 서버 계약

**REQ-CHANNEL-003** (Ubiquitous)
`channel/src/channel-server.ts` 는 `createChannelServer(deps: ChannelDeps): ChannelHandle` 을 export 해야 한다. 두 타입은 다음과 같다.

```ts
export interface ChatMessage {
  id: number
  author_name: string
  body: string
  delivery: 'to' | 'cc'
  files?: { name: string; local_path: string }[]
}

export interface ChannelDeps {
  sendToChat: (payload: { text: string; files?: string[] }) => Promise<void>
  fetchHistory: (params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }) => Promise<string>
  sendPermissionRequest?: (params: { request_id: string; tool_name: string; description: string; input_preview: string }) => void
}

export interface ChannelHandle {
  server: Server
  pushChatMessage: (msg: ChatMessage) => Promise<void>
}
```

`handle.server` 는 `@modelcontextprotocol/sdk` 의 `Server` 인스턴스여야 하고, 그 `serverInfo` 는 이름 `minidiscord-channel`, 버전 `0.1.0` 이어야 한다. 클라이언트가 이 서버에 붙어 `initialize` 를 마칠 수 있어야 한다.

`sendPermissionRequest` 는 선택 필드로 **타입에만** 존재한다. 이 SPEC 은 그것을 호출하지 않고 `handlePermissionVerdict` 도 만들지 않는다 — §5 참조.

**REQ-CHANNEL-004** (Ubiquitous)
서버가 `initialize` 응답으로 내보내는 capabilities 는 다음 세 가지를 모두 담아야 한다.

- `experimental['claude/channel']` — 채널 리스너 등록. 이것이 없으면 Claude Code 가 이 MCP 서버를 채널로 인식하지 않는다
- `experimental['claude/channel/permission']` — 권한 릴레이 옵트인
- `tools` — `reply`·`fetch_history` 노출

세 키의 **문자열이 계약**이다. 이름을 줄이거나 바꾸거나 `experimental` 밖으로 올리면 계약 위반이다.

**REQ-CHANNEL-005** (Ubiquitous)
서버는 `initialize` 응답에 `instructions` 문자열을 실어야 하며, 그 문자열은 다음 일곱 가지를 사람이 읽을 수 있는 한국어로 모두 담아야 한다.

1. 이 세션이 minidiscord 채팅방에 봇으로 참여 중이라는 설명
2. 채팅 메시지가 `<channel source="minidiscord-channel" chat_id="..." delivery="to|cc" sender="...">` 형태로 도착한다는 것
3. `delivery="to"` 로 받은 메시지에는 **반드시 `reply` 도구로 답한다**
4. `delivery="cc"` 로 받은 메시지에는 **절대 답하지 않는다**
5. 사용자가 보낸 파일은 content 에 안내된 내 PC 로컬 경로에서 직접 읽을 수 있다
6. **따라잡기 안내** — 멘션 없는 메시지는 이 세션에 오지 않으므로 사람이 부르면 답하기 전에 `fetch_history` 로 놓친 대화를 먼저 확인하고, 커서로는 `chat_id` 를 써서 다음에 `since_id` 로 넘긴다. 컨텍스트를 초기화한 직후에도 같은 방법으로 맥락을 복구한다
7. 이 채널에서 온 것 외의 출처에는 답하지 않는다

6번이 v2 에서 새로 들어온 항목이다. 멘션 없는 대화가 봇에게 전달되지 않는 설계(`spec-v2.md` 2장)의 유일한 보완 경로가 따라잡기이므로, 안내가 빠지면 봇은 자기가 무엇을 놓쳤는지 알 방법이 없다.

### 4.3 노출 도구

**REQ-CHANNEL-006** (Ubiquitous)
`tools/list` 응답의 도구 이름 집합은 정확히 `reply` 와 `fetch_history` 두 개여야 한다. 세 번째 도구를 노출해서는 안 된다 — 이 SPEC 의 범위에서 세션에 보이는 능력은 이 둘이 전부다.

**REQ-CHANNEL-007** (Ubiquitous)
`reply` 의 `inputSchema` 는 `type: 'object'` 이고, `text` 는 `string`, `files` 는 `string` 배열이며, `required` 는 `['text']` 하나여야 한다. `files` 는 선택이다. `description` 은 이 도구가 방으로 답변을 보낸다는 것과 `delivery="to"` 에는 이 도구로 답한다는 것을 밝혀야 한다.

**REQ-CHANNEL-008** (When — 이벤트 구동)
`reply` 도구가 호출되면 서버는 인자 `{ text, files }` 를 그대로 `deps.sendToChat` 에 넘겨 **await 한 뒤**, 내용이 정확히 `sent` 인 텍스트 하나를 결과로 돌려주어야 한다.

`sent` 는 리터럴 계약이다. `deps.sendToChat` 이 reject 하면 그 실패는 도구 호출의 실패로 세션에 드러나야 한다 — 삼켜서 `sent` 를 돌려주어서는 안 된다.

**REQ-CHANNEL-009** (Ubiquitous)
`fetch_history` 의 `inputSchema` 는 `type: 'object'` 이고 다섯 개의 선택 속성 `since_id`(number)·`since`(string)·`until`(string)·`speaker`(string)·`limit`(number)를 가져야 하며, `required` 를 두어서는 안 된다. 인자 없는 호출이 유효해야 한다.

**REQ-CHANNEL-010** (Ubiquitous)
`fetch_history` 의 `description` 은 (a) 결과의 각 줄 앞에 붙는 **`#번호`** 표기, (b) 그 번호를 다음 호출에 **`since_id`** 로 넘기면 그 다음부터만 받는다는 것, (c) 따라잡기·컨텍스트 복구 용도임을 모두 밝혀야 한다.

`#번호` 와 `since_id` 두 리터럴이 계약이다. 도구 설명은 세션이 그 도구를 **언제 어떻게** 쓸지 판단하는 유일한 근거이므로, 표기법을 바꿔 쓰면(예: `번호`, `id`) 봇이 결과의 앞머리 숫자를 커서로 인식하지 못한다.

**REQ-CHANNEL-011** (When — 이벤트 구동)
`fetch_history` 도구가 호출되면 서버는 받은 인자 객체를 **가공하지 않고 그대로** `deps.fetchHistory` 에 넘기고, 그 함수가 resolve 한 문자열을 **그대로** 텍스트 결과로 돌려주어야 한다. 인자를 걸러 내거나 기본값으로 덮어써서는 안 되고, 반환 문자열을 잘라 내거나 감싸서도 안 된다.

`limit` 의 기본값 100 은 도구 설명에만 적히고, 실제 적용은 서버 쪽(카드 `t3`)이 한다.

**REQ-CHANNEL-012** (Unwanted — shall not)
`reply`·`fetch_history` 가 아닌 이름으로 도구가 호출되면 서버는 오류로 응답해야 하며, 그 오류 메시지에는 요청된 도구 이름이 들어가야 한다. 이때 `deps` 의 어떤 함수도 호출되어서는 안 된다.

### 4.4 채널 알림

**REQ-CHANNEL-013** (When — 이벤트 구동)
`pushChatMessage(msg)` 가 호출되면 서버는 메서드 이름이 정확히 `notifications/claude/channel` 인 알림 하나를 보내야 하며, 그 `params` 는 다음을 만족해야 한다.

- `params.content` — 작성자 이름과 본문을 모두 담은 문자열
- `params.meta.chat_id` — `msg.id` 를 **문자열로 변환한** 값 (`3` 이 아니라 `'3'`)
- `params.meta.delivery` — `msg.delivery` 를 그대로. `'to'` 로 온 메시지에 `'cc'` 를, 그 반대를 실어서는 안 된다
- `params.meta.sender` — `msg.author_name` 을 그대로

`msg.files` 가 비어 있지 않으면 `params.content` 는 **각 파일의 `local_path` 를 모두** 포함해야 한다. 세션이 그 경로로 파일을 직접 읽기 때문에, 파일 이름만 싣고 경로를 빠뜨리면 첨부가 도달하지 않은 것과 같다. `msg.files` 가 없으면 경로 안내를 붙이지 않는다.

호출 한 번은 알림 **한 번**이다.

### 4.5 진입점

**REQ-CHANNEL-014** (Where — 배선 조건)
`channel/src/index.ts` 는 `createChannelServer` 로 핸들을 만들고 그 `server` 를 `StdioServerTransport` 에 연결해야 한다. 빌드된 `channel/dist/index.js` 를 실행해 stdin 으로 `initialize` 요청을 보내면 stdout 으로 그 응답이 나와야 하며, 그 응답이 REQ-CHANNEL-004 의 capabilities 와 REQ-CHANNEL-005 의 instructions 를 담아야 한다.

이 SPEC 에서 주입하는 `deps` 는 자리를 채우는 껍데기다 — `sendToChat` 은 아무 일도 하지 않고, `fetchHistory` 는 게이트웨이가 붙지 않았음을 알리는 짧은 문자열을 돌려준다. 그 자리를 실제 게이트웨이 클라이언트로 바꾸는 일은 카드 `t4` 의 다음 SPEC 이 한다.

### 4.6 범위 경계

**REQ-CHANNEL-015** (Unwanted — shall not)
이 SPEC 의 구현은 다음을 해서는 안 된다.

- `channel/src/gateway-client.ts` 를 만들지 않는다
- `channel/src` 어디에서도 `ws` 를 import 하지 않고 WebSocket 연결을 열지 않는다
- `server/` 와 `web/` 아래 어떤 파일도 고치지 않는다
- 루트 `package.json` 을 고치지 않는다 (`workspaces` 에 `channel` 이 이미 있다)
- 채널 계약의 이름을 새로 만들지 않는다 — 알림 메서드·capabilities 키·도구 이름을 추가하거나 바꾸지 않는다

계약 변경이 필요해 보이면 진행을 멈추고 보고한다(Global Constraints).

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자 또는 배제 근거를 명시한다.

### Out of Scope — 게이트웨이 클라이언트 (`SPEC-CHANCLIENT-001`, `plan-v2.md` Task 12)

- `channel/src/gateway-client.ts` 전체 — WebSocket 접속, `hello { token }` 인증, 재접속 백오프, `missed_after_id` 커서
- 환경변수 `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 를 **실제로 읽어 쓰는** 코드. 이 SPEC 은 다른 설정 경로를 금지할 뿐(REQ-CHANNEL-002) 소비자를 만들지 않는다
- `channel/test/gateway-client.test.ts`

### Out of Scope — 배선 (`SPEC-CHANWIRE-001`, `plan-v2.md` Task 13)

- `index.ts` 의 껍데기 `deps` 를 실제 게이트웨이 호출로 바꾸는 일
- 게이트웨이가 보낸 채팅 메시지를 받아 `pushChatMessage` 로 흘리는 경로
- `reply` 의 `files` 를 실제로 업로드하는 경로

### Out of Scope — 권한 릴레이 채널 쪽 (`SPEC-CHANPERM-001`, `plan-v2.md` Task 14)

- `ChannelHandle.handlePermissionVerdict` — 원본 Interfaces 블록에는 있으나 "Task 14 에서 추가" 로 명시돼 있다. 이 SPEC 의 `ChannelHandle` 은 `server` 와 `pushChatMessage` 둘만 노출한다
- `deps.sendPermissionRequest` 의 **호출**. 타입 정의에는 선택 필드로 남기되(원본 그대로), 이 SPEC 은 호출하지 않는다
- `notifications/claude/channel/permission_request` 수신과 판정 적용

### Out of Scope — 서버 쪽 권한 릴레이 (`SPEC-PERM-001`)

- `permission_request` / `permission_verdict` 프로토콜 메시지의 서버 쪽 처리 전체

### Out of Scope — 서버와 웹 UI (형제 SPEC 들)

- `server/` 아래 어떤 파일도 — `SPEC-CORE-001`·`SPEC-AUTH-001`·`SPEC-SSE-001`·`SPEC-GATEWAY-001`·`SPEC-MSG-001`·`SPEC-MENTION-001`·`SPEC-ROOM-001`·`SPEC-BOT-001` 소유
- `fetch_history` 결과 문자열을 **실제로 만드는** 쪽. `#<번호> [시각] 작성자: 본문` 형식의 렌더링과 `since_id` 필터링은 서버(카드 `t3`)가 소유한다. 이 SPEC 은 그 형식을 **도구 설명에 정확히 안내하는 것**까지만 책임진다(REQ-CHANNEL-010)
- `web/` 아래 어떤 파일도

### Out of Scope — 운영과 관측

- 로깅, 메트릭, 헬스체크. 무상태 조항(REQ-CHANNEL-002)이 파일 로깅을 금지한다
- `.claude.json` 등록 자동화, 세션 실행 명령 생성
- 도구 호출 재시도·속도 제한
- 여러 방 동시 참여. 세션→방은 N:1 이며(`spec-v2.md` 3장), 이 SPEC 은 방 개념 자체를 갖지 않는다

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 설치 시점의 최신 안정 버전으로 설치한다(아래는 하한선): `@modelcontextprotocol/sdk ^1`, `ws ^8`, `zod ^3`, 개발 의존성 `typescript ^5`, `tsx ^4`, `vitest ^2`, `@types/node`, `@types/ws`. `ws` 와 `@types/ws` 는 다음 SPEC 이 쓰므로 함께 설치하되 **이 SPEC 에서는 import 하지 않는다**(REQ-CHANNEL-015).
- 채널 플러그인은 무상태다. 디스크에 아무것도 쓰지 않고, `MINIDISCORD_DATA_DIR` 과 무관하다 — 그 변수는 서버 것이다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w channel`.
- UI 문구(instructions·도구 description 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).
- 채널 계약(capabilities·notification 메서드·reply 도구·fetch_history 도구)은 `spec-v2.md` 4-B 와 공식 channels-reference 를 그대로 따른다. 이름과 형식을 이 SPEC 에서 바꾸지 않는다. 변경이 필요해 보이면 중단하고 보고한다.

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 11(**이 SPEC 의 원본**), Task 12~14(다음 SPEC 들)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-B 채널 플러그인, 6장 게이트웨이 프로토콜, 10장 테스트 전략
- `.moai/specs/SPEC-CHANCLIENT-001/` — 게이트웨이 클라이언트 (Task 12). 이 SPEC 의 `channel/` 스캐폴드를 실행 전제로 삼는다
- `.moai/specs/SPEC-CHANWIRE-001/` — 배선 (Task 13). 이 SPEC 의 껍데기 `deps` 를 실제 호출로 바꾼다
- `.moai/specs/SPEC-CHANPERM-001/` — 채널 쪽 권한 릴레이 (Task 14). `sendPermissionRequest`·`handlePermissionVerdict` 를 채운다
- `.moai/specs/SPEC-PERM-001/` — 서버 쪽 권한 릴레이 (이 SPEC 의 `sendPermissionRequest` 반대편)
- `.moai/specs/SPEC-GATEWAY-001/` — 봇 게이트웨이 (`SPEC-CHANCLIENT-001` 이 붙을 상대)
- 칸반 카드 `t4` (마일스톤 M4)
