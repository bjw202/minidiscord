# SPEC-CHANNEL-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 11 과 `spec-v2.md` 4-B 이며, 그 두 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M4`(카드 `t4`)와는 다른 층위다.

---

## §A 실행 순서와 의존

이 SPEC 은 **독립 모듈**이다. 선행 SPEC 이 없고, `server/` 의 어떤 산출물도 쓰지 않는다.

```
(선행 없음) → SPEC-CHANNEL-001 → SPEC-CHANCLIENT-001(Task 12) → SPEC-CHANWIRE-001(Task 13) → SPEC-CHANPERM-001(Task 14)
```

`plan-v2.md` Task 11 Interfaces 블록의 `Consumes: 없음(독립 모듈)` 을 그대로 확인했고, 실제로 이 SPEC 이 만드는 다섯 파일은 npm 의존성 외에 아무것도 import 하지 않는다. 그래서 `spec.md` 의 `depends_on` 이 `[]` 다.

바깥에서 받는 것은 셋뿐이다.

| 출처 | 받아 쓰는 것 | 이 SPEC 에서의 쓰임 |
|------|-------------|-------------------|
| `@modelcontextprotocol/sdk` | `Server`, `StdioServerTransport`, `ListToolsRequestSchema`, `CallToolRequestSchema` | 채널 서버 본체 |
| `@modelcontextprotocol/sdk` (테스트) | `Client`, `InMemoryTransport` | 계약을 바깥에서 관측하는 유일한 도구 |
| 루트 `package.json` | `workspaces: ["server", "channel"]` | **이미 들어 있다.** 고치지 않는다 |

## §B 되돌리기 어려운 결정 — 계약 리터럴

이 SPEC 에서 가장 되돌리기 비싼 것은 코드가 아니라 **문자열**이다. 아래 값들은 Claude Code 런타임과 봇 세션이 읽는 계약이며, 나중에 바꾸면 이미 등록된 세션이 조용히 오작동한다(오류가 아니라 "채널로 인식되지 않음"·"도구를 안 씀"으로 나타난다).

| 자리 | 값 | 바꾸면 무슨 일이 나는가 |
|------|-----|----------------------|
| capabilities 키 | `experimental['claude/channel']` | 없으면 Claude Code 가 이 MCP 서버를 채널로 등록하지 않는다. 도구는 보이는데 채팅이 안 온다 |
| capabilities 키 | `experimental['claude/channel/permission']` | 없으면 권한 릴레이 옵트인이 안 돼 Task 14 가 통째로 죽는다 |
| 알림 메서드 | `notifications/claude/channel` | 다르면 채팅 메시지가 세션에 도달하지 않는다. 송신 쪽에는 오류가 없다 |
| `meta.chat_id` | **문자열** (`String(msg.id)`) | 숫자로 실으면 커서 왕복(`chat_id` → `since_id`)의 타입이 갈린다 |
| 도구 이름 | `reply`, `fetch_history` | 세션이 부를 이름이다. 다르면 instructions 의 안내와 어긋나 봇이 못 찾는다 |
| `reply` 반환 | 텍스트 `sent` | 원본 리터럴. 세션이 전송 성공을 읽는 유일한 신호 |
| `fetch_history` 설명의 `#번호` | 리터럴 `#번호` | 봇이 결과 줄 앞머리 숫자를 커서로 인식하는 근거. `번호`·`id` 로 바꾸면 `since_id` 왕복이 끊긴다 |
| `serverInfo` | `minidiscord-channel` / `0.1.0` | `.claude.json` 등록 이름과 맞물린다 |

검토 시 이 표가 확인 대상이다. 여기 있는 값 중 하나라도 "더 나은 이름" 으로 바꾸고 싶어지면, 그것은 Global Constraints 가 금지한 계약 변경이므로 중단하고 보고한다.

## §C 되돌리기 어려운 결정 — instructions 본문

`instructions` 는 봇 세션의 시스템 프롬프트에 그대로 붙는다. 즉 **이 문자열이 봇의 행동 규범**이다. 원본(`plan-v2.md` Task 11 Step 4)의 열 줄을 그대로 쓰되, 그중 v2 에서 새로 들어온 세 줄(따라잡기·커서·컨텍스트 복구)이 이 SPEC 의 핵심 추가분이다.

```
이 세션은 minidiscord 채팅방에 봇으로 참여 중입니다.
채팅 메시지는 <channel source="minidiscord-channel" chat_id="..." delivery="to|cc" sender="..."> 형태로 도착합니다.
delivery="to"로 받은 메시지에는 반드시 reply 도구로 답변하세요.
delivery="cc"로 받은 메시지는 참고만 하고 절대 답변하지 마세요.
사용자가 보낸 파일은 content에 안내된 내 PC 로컬 경로에서 직접 읽을 수 있습니다.
멘션 없는 메시지는 이 세션에 전달되지 않습니다. 사람들끼리 나눈 대화가 비어 있을 수 있으니,   ← 따라잡기 (1)
방에서 사람이 나를 부르면 답하기 전에 fetch_history 도구로 놓친 대화를 먼저 확인하세요.        ← 따라잡기 (2)
커서로는 chat_id 를 쓰세요. 마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.  ← 커서
컨텍스트를 초기화한 직후에도 같은 방법으로 맥락을 복구합니다.                                   ← 복구
이 채널에서 온 것 외의 출처에 답변하지 마세요.
```

열 줄을 공백 하나로 이어 붙인 문자열 하나(`INSTRUCTIONS`)로 export 한다.

따라잡기 세 줄을 빼면 봇은 자기가 무엇을 놓쳤는지 **알 방법이 없다** — 멘션 없는 대화는 애초에 전달되지 않으므로, 안내가 없으면 `fetch_history` 를 부를 이유를 스스로 만들어 내지 못한다. 그래서 이 세 줄은 "있으면 좋은 문구" 가 아니라 REQ-CHANNEL-005 의 조항이고, AC-CHANNEL-005 가 리터럴로 관측한다.

## §D 원본 문서 모순과 해결

### 1. [차단급] 원본 테스트의 capabilities 검증이 아무것도 재지 않는다

원본 `plan-v2.md` Task 11 Step 2 의 첫 테스트는 이름이 `declares channel + tools capabilities` 인데, 본문은 주석으로 이렇게 적혀 있다.

```ts
// capabilities 검증은 서버 생성 시 선언된 값으로: 간접적으로 tools/list로 확인
const tools = await client.listTools()
expect(names).toContain('reply')
```

`tools/list` 가 답한다는 사실은 `tools` capability 가 있다는 정도만 시사할 뿐, **`experimental['claude/channel']` 에 대해서는 아무것도 말하지 않는다.** 그 키를 통째로 빼도 이 테스트는 통과하고, 그러면 Claude Code 는 이 서버를 채널로 인식하지 않는다 — 이 SPEC 에서 가장 비싼 실패인데 원본 검증은 그것을 못 잡는다.

**해결:** capabilities 를 두 갈래로 직접 관측한다.

- **1차(주 관측)** — 빌드된 `channel/dist/index.js` 에 stdio 로 `initialize` 요청 하나를 던져 그 **응답 JSON 을 직접 읽는다**(AC-CHANNEL-004). 프로토콜이 실제로 내보내는 값이라 SDK 편의 접근자에 의존하지 않고, 덤으로 REQ-CHANNEL-014 의 stdio 배선까지 같은 명령으로 확인된다.
- **2차(보조)** — 인프로세스에서 `client.getServerCapabilities()` 로 같은 값을 확인한다(AC-CHANNEL-003 에 포함). SDK 버전에 따라 이 접근자 이름이 다를 수 있으므로, **없으면 1차만으로 판정한다** — 2차의 부재는 이 SPEC 의 실패가 아니다. run 단계에서 실제 설치된 SDK 로 확인하고 결과를 `progress.md` §E.2 에 기록한다.

### 2. [차단급] 원본 알림 테스트가 정상 구현을 거짓 실패시킨다

원본 Step 2 의 네 번째 테스트는 두 가지 이유로 구현이 완벽해도 실패한다.

```ts
client.setNotificationHandler({ method: 'notifications/claude/channel' } as any, n => { received.push(n) })
await handle.pushChatMessage({ ... })
expect(received).toHaveLength(1)
```

- **(a) 핸들러 등록 인자가 스키마가 아니다.** SDK 의 `setNotificationHandler` 는 Zod 객체 스키마를 받아 `schema.shape.method.value` 로 등록 키를 꺼낸다. `{ method: '...' } as any` 에는 `shape` 가 없어 등록 시점에 터지거나 조용히 등록되지 않는다. `as any` 가 타입 검사까지 눌러 놓아서 눈에 띄지 않는다.
- **(b) 알림 도착을 기다리지 않는다.** 알림은 응답 없는 단방향 메시지다. `pushChatMessage` 의 `await` 는 **보냈다**까지만 보장하고, 클라이언트가 그것을 받아 핸들러를 부르는 것은 다음 틱 이후다. `received` 를 곧바로 읽으면 비어 있을 수 있다 — 통과한다면 우연이고, 그래서 간헐 결함이 된다.

**해결:** Zod 스키마로 등록하고, 핸들러가 resolve 하는 약속을 **먼저 잡아 둔 뒤** `pushChatMessage` 를 부른다. `acceptance.md` 공통 하네스의 `nextNotification` 이 그 형태이며, 미도착은 1.5초 뒤 `null` 로 관측된다 — 부정 기준(AC-CHANNEL-012)이 이 `null` 을 쓴다.

이 둘은 §D 1번과 반대 방향의 결함이다. 공허한 기준은 잘못된 구현을 통과시키고, 이 둘은 **정상 구현을 거짓 실패시킨다.** 부류 훑기는 앞의 것만 걸러 내므로 뒤의 것은 따로 봐야 한다.

### 3. [차단급] `tsconfig.json` 을 "server 와 동일(복사)" 하면 `bin` 이 깨진다

원본 Step 1 은 `channel/tsconfig.json` 은 server 와 동일(복사)이라고 지시한다. 그런데 `server/tsconfig.json` 은 `"include": ["src", "test"]` 이고 `rootDir` 이 없다. 그대로 복사하면 TypeScript 가 공통 루트를 `channel/` 로 잡아 산출물이 **`dist/src/index.js`** 에 놓이고, `package.json` 의 `bin: "./dist/index.js"` 는 존재하지 않는 파일을 가리킨다. `npm test` 는 vitest 가 소스를 직접 읽으므로 **전부 통과하고**, 실패는 사용자가 실제로 플러그인을 실행할 때 처음 드러난다.

**해결:** `bin` 리터럴을 원본 그대로 지키고(REQ-CHANNEL-001), 빌드 산출물이 `channel/dist/index.js` 에 놓이도록 tsconfig 를 맞춘다. 가장 작은 변경은 `include` 를 `["src"]` 로 두고 `rootDir: "src"` 를 명시하는 것이다. 관측은 tsconfig 의 모양이 아니라 **`node channel/dist/index.js` 가 실제로 MCP 응답을 내놓는가**로 한다(AC-CHANNEL-004) — 구현이 어떤 방식으로 맞추든 상관없고, 안 맞추면 걸린다.

부작용 하나를 기록한다: `include` 에서 `test` 가 빠지면 `npm run typecheck -w channel` 이 테스트 파일을 검사하지 않는다. 테스트의 타입 오류는 vitest 실행 중에 드러나므로 수용하되, `progress.md` §E.2 의 Gaps 에 적는다.

### 4. `fetch_history` 반환 검증이 상수 스텁을 통과시킨다

원본 세 번째 테스트는 의존성이 `'대화기록'` 을 돌려주게 해 놓고 결과가 `'대화기록'` 인지 본다. `return { content: [{ type: 'text', text: '대화기록' }] }` 이라고 **하드코딩한 구현**도 통과한다.

**해결:** 하네스의 `fetchHistory` 가 **받은 인자에서 파생된** 문자열을 돌려준다(`H:41:5` 꼴). 인자를 흘리지 않는 구현도, 반환을 흘리지 않는 구현도 이 단언에서 걸린다.

### 5. `ChannelHandle` 에 `handlePermissionVerdict` 를 넣을 것인가

원본 Interfaces 블록은 `handlePermissionVerdict` 를 인터페이스에 적어 두고 바로 옆에 `// Task 14에서 추가` 라고 달았고, 같은 Task 의 구현 코드(Step 4)의 `ChannelHandle` 에는 그 필드가 **없다**. 원본 안에서 두 자리가 어긋난다.

**해결:** 구현 코드 쪽을 따른다 — 이 SPEC 의 `ChannelHandle` 은 `server` 와 `pushChatMessage` 둘만 노출한다. 지금 빈 껍데기로 넣으면 Task 14 가 그것을 "이미 있는 것" 으로 착각할 수 있고, 무엇보다 호출자가 없는 필드는 검증할 방법이 없다. `deps.sendPermissionRequest` 는 원본 그대로 **선택 필드로 타입에만** 남긴다(Task 14 가 채운다).

### 6. `StdioServerTransport` 를 `channel-server.ts` 가 import 한다

원본 Step 4 의 `channel-server.ts` 는 `StdioServerTransport` 를 import 하지만 **쓰지 않는다**(실제 연결은 `index.ts` 가 한다). strict + `noUnusedLocals` 설정에 따라서는 빌드가 깨질 수 있다.

**해결:** `channel-server.ts` 에서 그 import 를 뺀다. 전송 계층을 아는 것은 `index.ts` 하나여야 하며, 이는 원본의 책임 경계(`plan-v2.md` 파일 구조 주석)와도 일치한다. 요구사항 층에는 올리지 않는다 — 관측 가능한 계약이 아니라 정리다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| `experimental['claude/channel']` 누락 | 채널로 인식되지 않는다. 도구는 보이는데 채팅이 안 온다. 오류가 나지 않는 실패 | AC-CHANNEL-004 가 `initialize` 응답 JSON 을 직접 읽는다 (§D 1번) |
| 따라잡기 세 줄 누락 | 봇이 놓친 대화를 스스로 복구하지 못한다. 겉으로는 정상 동작으로 보인다 | AC-CHANNEL-005 가 리터럴 부분 문자열로 관측 |
| `#번호` 표기를 다른 말로 바꿈 | 봇이 결과 줄 앞머리 숫자를 커서로 인식하지 못해 `since_id` 왕복이 끊긴다 | AC-CHANNEL-010 이 `#번호`·`since_id` 두 리터럴을 단언 |
| `meta.chat_id` 를 숫자로 실음 | 커서 왕복의 타입이 갈린다. 느슨한 비교에서는 한동안 드러나지 않는다 | AC-CHANNEL-013 이 `'3'` 문자열을 `toBe` 로 단언 |
| `delivery` 를 항상 `'to'` 로 실음 | CC 메시지에 봇이 답하기 시작한다. 이 SPEC 의 오작동 중 사용자에게 가장 시끄럽다 | AC-CHANNEL-014 가 `'cc'` 갈래를 따로 관측 |
| 첨부 경로를 빼고 파일 이름만 실음 | 세션이 파일을 읽지 못한다. content 에 파일 언급이 있어 통과처럼 보인다 | AC-CHANNEL-013 이 `local_path` 를 단언 (`name` 이 아니다) |
| SDK 의 `getServerCapabilities()` 접근자 이름이 다름 | 보조 관측이 실패해 정상 구현을 거짓 실패시킬 수 있다 | 주 관측을 stdio `initialize` 로 두고, 보조는 없으면 생략한다 (§D 1번). run 단계에서 확인해 기록 |
| `server.notification()` 이 미선언 capability 를 거부 | SDK 가 알림 메서드별 capability 검사를 한다면 `notifications/claude/channel` 이 막힐 수 있다 | 실제 SDK 로 M1 RED→GREEN 에서 즉시 드러난다. 막히면 계약 변경이 아니라 SDK 옵션 문제이므로 §D 에 추가 기록하고 계속 |
| 빌드 산출물 경로가 `bin` 과 어긋남 | `npm test` 는 전부 통과하고, 사용자가 실행할 때 처음 깨진다 | AC-CHANNEL-004 가 `node channel/dist/index.js` 를 실제로 실행한다 (§D 3번) |
| 알림 테스트의 간헐 실패 | 비동기 도착 타이밍. 원인을 SDK 로 오해하면 시간을 태운다 | `nextNotification` 이 약속을 먼저 잡는다. 1.5초는 인메모리 왕복(수 µs)의 수만 배다 — 흔들리면 타임아웃을 늘리지 말고 원인을 규명해 §E 에 적는다 |
| `ws` 를 설치했는데 이 SPEC 에서 쓰지 않음 | 다음 SPEC 을 위한 선설치인데, 무심코 import 해 범위를 넘길 수 있다 | AC-CHANNEL-015 가 `channel/src` 의 `ws` import 부재를 관측 |
| stdio 프로브가 종료하지 않음 | 검증 명령이 매달린다 | `head -n 1` 로 파이프를 닫아 프로세스를 끝낸다 (AC-CHANNEL-004) |

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다 — M2 의 stdio 프로브가 M1 이 만든 서버 본체를 빌드해 실행한다.

### M1 — 계약 표면 (우선순위 High)

원본: `plan-v2.md` Task 11 Step 1-5 중 `channel-server.ts` 경로.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-CHANNEL-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` §E.1 에 적는다. M2 단계 6 의 범위 경계 검사가 이 값을 기준으로 비교한다.
1. `channel/package.json` 과 `channel/tsconfig.json` 을 만든다. `package.json` 은 원본 리터럴 그대로, `tsconfig.json` 은 §D 3번의 교정을 반영한다. 의존성 설치:
   `npm install -w channel @modelcontextprotocol/sdk ws zod`
   `npm install -w channel -D typescript tsx vitest @types/node @types/ws`
2. `channel/test/channel-server.test.ts` 를 만들고 `acceptance.md` 의 공통 하네스와 `describe('channel server', ...)` 를 쓴다. 이 마일스톤의 테스트는 AC-CHANNEL-003·006·007·008·009·010·011·012·013·014 다.
3. **RED 확인**: `npm test -w channel` → `Cannot find module '../src/channel-server.js'` 로 실패. 출력 원문 기록.
4. `channel/src/channel-server.ts` 를 만든다 — `INSTRUCTIONS` 상수(§C), `ChatMessage`·`ChannelDeps`·`ChannelHandle` 타입, `createChannelServer`(capabilities·instructions 선언, `ListToolsRequestSchema`·`CallToolRequestSchema` 핸들러, `pushChatMessage`). `StdioServerTransport` 는 import 하지 않는다(§D 6번).
5. **GREEN 확인**: `npm test -w channel` → M1 테스트 통과. `npm run typecheck -w channel` → 종료 코드 `0`.
6. 커밋: `feat: channel MCP server with reply/fetch_history tools`

수용 기준: AC-CHANNEL-001, 002, 003, 006, 007, 008, 009, 010, 011, 012, 013, 014, AC-CHANNEL-016(전이 1-2).

### M2 — stdio 진입점과 경계 (우선순위 High)

원본: `plan-v2.md` Task 11 Step 4 중 `index.ts` 경로.

1. `channel/src/index.ts` 를 만든다 — 껍데기 `deps` 로 핸들을 만들고 `handle.server.connect(new StdioServerTransport())`. `fetchHistory` 는 게이트웨이 미연결을 알리는 짧은 문자열을 돌려준다.
2. `npm run build -w channel` 을 실행하고 **`channel/dist/index.js` 가 실제로 생겼는지** 확인한다. `dist/src/index.js` 에 있으면 §D 3번으로 돌아가 tsconfig 를 고친다.
3. **stdio 프로브**: AC-CHANNEL-004 의 명령으로 `initialize` 응답을 받아 capabilities 세 키를 확인한다. 이것이 이 SPEC 의 주 관측이다 — 응답 원문을 `progress.md` §E.2 에 남긴다.
4. **instructions 확인**: 같은 응답에서 AC-CHANNEL-005 의 리터럴 일곱 조각을 확인한다.
5. **무상태 확인**: AC-CHANNEL-002 의 두 관측(소스에 파일 쓰기 호출 없음, 테스트 실행 후 작업 트리가 깨끗함).
6. **범위 경계 확인** (AC-CHANNEL-015): `git rev-parse --verify "$(cat .moai/specs/SPEC-CHANNEL-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 먼저 확인하고, 그 뒤에만 `git diff` 로 넘어간다. **기준 커밋 없이 `git diff` 를 쓰지 않는다** — M1 커밋 이후라 `HEAD` 기준으로는 아무것도 잡히지 않는다. **빈 출력 하나만 보고 통과로 적지도 않는다** — 기준 SHA 가 없어도 표준 출력은 비어 있다.
7. 커밋: `feat: channel plugin stdio entry point`

수용 기준: AC-CHANNEL-004, 005, 015, AC-CHANNEL-016(전이 3-4).

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-CHANNEL-001..016 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` §E.2 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증" 으로 기록)

## §H 안티패턴 (하지 말 것)

- **capabilities 를 `tools/list` 로 대신 확인하기** — 이 SPEC 에서 가장 위험한 실수다. `experimental['claude/channel']` 을 통째로 빼도 `tools/list` 는 답한다. `initialize` 응답을 직접 읽는다 (§D 1번).
- **`setNotificationHandler` 에 객체 리터럴을 `as any` 로 넘기기** — Zod 스키마가 아니면 등록 키를 못 꺼낸다. `as any` 가 타입 검사까지 눌러서 눈에 안 띈다 (§D 2번).
- **알림을 보낸 직후에 곧바로 관측하기** — 알림은 단방향이라 `await` 가 도착을 보장하지 않는다. 약속을 먼저 잡고 기다린다 (§D 2번).
- **의존성이 상수를 돌려주게 해 놓고 반환 흐름을 검증했다고 적기** — 하드코딩한 구현도 통과한다. 인자에서 파생된 값을 돌려준다 (§D 4번).
- **tsconfig 를 형제 패키지에서 그대로 복사하기** — `bin` 이 가리키는 `dist/index.js` 가 생기지 않는데 `npm test` 는 전부 통과한다 (§D 3번).
- **`handlePermissionVerdict` 를 빈 껍데기로 넣기** — Task 14 가 "이미 있는 것" 으로 착각한다. 호출자 없는 필드는 검증할 방법도 없다 (§D 5번).
- **`deps.sendPermissionRequest` 를 이 SPEC 에서 호출하기** — Task 14 의 것이다. 타입에만 남긴다.
- **`ws` 를 import 하기** — 다음 SPEC 을 위해 미리 설치했을 뿐이다. 이 SPEC 에서 소켓을 열면 무상태·범위 경계 두 조항을 함께 깬다 (REQ-CHANNEL-015).
- **디스크에 무엇이든 쓰기** — 캐시·로그·기록 스냅숏 무엇도 안 된다. 무상태는 이 플러그인의 설계 전제다 (REQ-CHANNEL-002).
- **계약 문자열을 "더 나은 이름" 으로 바꾸기** — §B 표의 값은 전부 계약이다. 바꾸고 싶으면 중단하고 보고한다.
- **세 번째 도구 노출하기** — 세션에 보이는 능력이 늘어나는 것은 계약 변경이다 (REQ-CHANNEL-006).
- **`reply` 실패를 삼키고 `sent` 돌려주기** — 세션은 `sent` 를 전송 성공으로 읽는다. 답이 방에 안 갔는데 봇은 답했다고 믿는다 (REQ-CHANNEL-008).
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-CHANNEL-016 의 전이 증거를 만들 수 없다. 특히 전이 3 은 **모듈 부재가 아닌 단언 실패**여야 한다.
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡힌다. `spec_base_sha` 를 기준으로 비교한다.
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 의 종료 코드 `0` 을 먼저 확인한다.
- **이름만 대고 통과로 적기** — vitest 기본 리포터는 테스트 이름을 출력하지 않는다. 이름 붙은 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다.
- **간헐 실패를 타임아웃 연장으로 덮기** — 인메모리 왕복은 마이크로초 단위다. 1.5초에서 흔들리면 타이밍이 아니라 배선 문제다.

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 11 — **이 SPEC 의 원본**(읽기 전용). Task 12~14 가 다음 SPEC 들
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B — 채널 플러그인 계약. 6장이 게이트웨이 프로토콜, 10장이 테스트 전략
- `spec.md` — GEARS 요구사항(REQ-CHANNEL-001..015)과 범위 경계
- `acceptance.md` — AC-CHANNEL-001..016, 공통 테스트 하네스
- `progress.md` — 단계별 증거 기록처
- `.moai/specs/SPEC-CHANCLIENT-001/` · `SPEC-CHANWIRE-001/` · `SPEC-CHANPERM-001/` — 카드 `t4` 의 뒤따르는 세 SPEC (Task 12·13·14). 셋 다 이 SPEC 을 선행으로 둔다
- `.moai/specs/SPEC-GATEWAY-001/` — `SPEC-CHANCLIENT-001` 이 붙을 상대 (봇 게이트웨이)
- `.moai/specs/SPEC-PERM-001/` — `sendPermissionRequest` 의 반대편 (서버 쪽 권한 릴레이)
