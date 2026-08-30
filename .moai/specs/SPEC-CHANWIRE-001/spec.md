---
id: SPEC-CHANWIRE-001
title: "minidiscord 채널 배선 — MCP 채널 서버와 게이트웨이 클라이언트를 묶어 실행 가능한 봇 바이너리를 만든다"
version: "0.6.0"
status: completed
created: 2026-08-27
updated: 2026-08-29
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "channel/"
lifecycle: spec-anchored
tags: "channel-wiring, mcp-bridge, gateway-client, reply-tool, fetch-history, status-report, stateless-binary"
tier: M
depends_on: [SPEC-CHANNEL-001, SPEC-CHANCLIENT-001]
followup_cards: [t15, t16, t20]
---

# SPEC-CHANWIRE-001 — 채널 배선 (`channel/src/index.ts`)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.6.0 | 2026-08-29 | **하네스 코드 착지에 맞춘 명세 갱신 (카드 `t15`, `SPEC-GWAUTH-001` M4 짝).** v0.5.0 이 예고한 하네스 코드가 착지했다 — `acceptance.md` 공통 하네스의 스텁(`gatewayStub`)이 이제 `hello` 의 `nonce` 를 읽어 `HMAC-SHA256(key = sha256Hex(token), msg = `${nonce}\|${room_id}\|${bot_id}`)` 를 `proof` 로 계산해 `welcome` 에 싣는다. 증명 계산 헬퍼(`keyOf`·`proofOf`)는 테스트 파일이 자체 정의하고 `src` 를 부르지 않는다(SPEC-GWAUTH-001 §3.5). **요구사항 14개·수용 기준 15개는 개수도 본문도 그대로다** — 바뀐 것은 하네스가 스텁 서버를 흉내 내는 방식뿐이며, `acceptance.md` 의 v0.5.0 블록 주석이 현재형으로 개정됐다. | manager-spec |
| 0.5.0 | 2026-08-29 | **하네스 명세 주석 + 기준 본문 주 두 자리 (카드 `t15`, `SPEC-GWAUTH-001` 3회차 계획 감사 R-06).** ① `acceptance.md` 공통 하네스의 스텁이 **증명 없는 `welcome`** 을 보낸다 — `SPEC-GWAUTH-001` 착지 후 채널이 거절하므로 이 하네스를 쓰는 기준이 전부 확립에 실패한다. **이 블록은 `channel/test/index-wiring.test.ts:47` 의 명세 원본**이며, 고칠 형태와 시점(그 SPEC 의 M4)을 주석으로 명시했다. ② AC-CHANWIRE-014 의 Then 2번이 `{ type: 'hello', token: 'tok' }` 를 리터럴로 적는다 — 착지 후 `nonce` 가 붙어 **세 필드**가 되므로 그 사실을 주로 달았다. **단언 형태는 바뀌지 않는다** — 그 기준이 재는 것은 «스텁이 hello 를 받았는가» 이지 필드 집합이 아니다. **요구사항·수용 기준은 개수도 본문도 그대로다.** | manager-spec |
| 0.4.0 | 2026-08-28 | **주입 방어 결합 개정 (카드 `t10`, `SPEC-CHANINJECT-001` v0.1.0 §3.2).** v0.3.0 이 §5 에 «미해소» 로 기록한 **F-03(High, 이력 렌더링 위조와 커서 오염)** 의 소유자가 정해졌고, 그 SPEC 이 요구하는 계약 변경을 여기서 받아 적는다. **REQ-CHANWIRE-012**: 이력 렌더링이 줄 형식 `#<id> [<created_at>] <author_name>: <body>` + 개행 잇기에서 **구조화 JSON `{cursor, messages[]}`** 으로 바뀌었다. 개행 이스케이프는 `JSON.stringify` 의 성질이 되고, 커서는 배열 밖 `cursor` 필드에서만 나온다. **§6 제약과 §5 두 자리**의 옛 형식 리터럴도 함께 정정했다 — 이 프로젝트가 이미 세 번 재현한 «본체를 고치고 참조 자리를 놓친다» 부류를 피하기 위해 형식 리터럴이 적힌 자리를 전건 훑었다. 그 귀결로 형제 회귀 기준 **두 건이 깨진다** — `channel/test/index-wiring.test.ts:207`(AC-CHANWIRE-007)·`:217`(AC-CHANWIRE-008). 둘 다 «수정» 이 아니라 «개정» 이며 개정 전 실패 원문은 `SPEC-CHANINJECT-001` AC-CHANINJECT-014 전이 **2b** 가 실행으로 남긴다. **`'(기록 없음)'` 을 버린 사유**는 결과 타입이 갈리면 커서가 다시 텍스트 추측으로 돌아가기 때문이다(`SPEC-CHANINJECT-001/spec.md` §3.2). **요구사항 14개·수용 기준 15개는 개수 그대로다.** | manager-spec |
| 0.3.0 | 2026-08-27 | **sync 감사 마감 라운드 (F-06).** `.moai/reports/t4/sync-audit.md` 가 수신 갈래에서 Medium 1건을 실행으로 재현했다 — `gateway-client` 가 `onMessage` 를 await 하지 않으므로 `pushChatMessage` 의 거부를 아무도 받지 않고, MCP 상대가 먼저 끊긴 뒤 채팅 **한 건**이 도착하면 처리되지 않은 거부로 프로세스가 끝난다(`P5_EXIT=1`). Claude Code 세션이 `/clear` 되거나 재시작되는 것은 일상적인 사건이다. 무게가 큰 이유는 **같은 카드 안에서 같은 위험을 한쪽만 막았다**는 점이다 — 판정 갈래는 `.catch(() => {})` 로 막혀 있고 AC-CHANPERM-009 가 그것을 검증까지 하는데, 수신 갈래는 `plan.md` §D 5번이 위험을 인지하고도 방어도 기준도 두지 않았다. 수용된 갭이 아니라 내부 비일관이다. **REQ-CHANWIRE-014 와 AC-CHANWIRE-015 를 신설해 닫았다** — AC-CHANPERM-009 의 수신 경로 짝이며, 관측 도구도 같은 `unhandledRejection` 수집이다(변이 `M-F06 revert rejection swallow` 로 조준 확인, 이 테스트 한 건만 실패). 요구사항 13개 → **14개**, 수용 기준 14개 → **15개**(Tier M 상한 16/16 안). 함께 커버리지 제외 사유 정정(F-10)과 미해소 결함 F-03(이력 렌더링 위조)을 §5 에 기록했다 — **F-03 은 이 카드에서 고치지 않았다.** | manager-spec |
| 0.2.1 | 2026-08-27 | **2차 감사 마감 라운드 (수용 기준 한정).** 2차 판정은 PASS 였고, 그 위에서 두 줄을 더 닫았다. **n1** — AC-CHANWIRE-010 의 `node --eval` 이 최상위 `await` 를 쓰는데, `--eval` 입력의 모듈 종류 판정이 Node 버전 대역에 따라 달라 **선언한 하한선(Node 20)에서 정상 구현이 거짓 실패**했다. `--input-type=module` 로 확정했다. **잔여 위험(좀비 프로세스)** — AC-CHANWIRE-014 가 프로세스 둘을 살려 둔 채 끝나는데 종료 주체가 없었다. 거두지 못한 프로세스는 스텁 포트로 백오프 재접속을 계속 시도해(상한 30초) 뒤따르는 기준을 오염시킨다. 공통 하네스에 `spawnChild()` 를 더해 **`spawn` 직후** `SIGKILL` 정리를 등록하도록 했고(명령 끝의 `kill` 한 줄은 일찍 끝나는 경로에서 닿지 않으므로 쓰지 않는다), 품질 게이트에 `pgrep` 사후 관측을 더했다. 곁들여 AC-CHANWIRE-011 에서 프로세스를 띄우던 갈래를 걷어 내 AC-014 (a)가 이미 재는 것과의 중복을 없앴다 — 띄우는 프로세스가 하나 줄면 좀비 위험도 하나 준다. **요구사항 13개·수용 기준 14개 모두 그대로**이고, 바뀐 것은 하네스 하나와 기준 셋의 관측 방식이다. n2(`WireOpts.token` 옵셔널화)는 감사자가 권하지 않아 손대지 않았다. | manager-spec |
| 0.2.0 | 2026-08-27 | **plan-audit 교정 라운드.** `.moai/reports/t4/plan-audit.md` 가 이 SPEC 에서 차단급 1건(B1)과 주요 2건(M1·M6)을 지적했고, 셋 다 옳다고 확인해 닫았다. **B1** — 임포트 부작용 기준이 같은 파일이 이미 임포트한 모듈을 다시 `import()` 해 ES 모듈 캐시만 돌려받고 있었다. 즉 최상단에서 무조건 접속하는 구현도 통과하는, 아무것도 재지 않는 기준이었다. 자식 프로세스 관측으로 바꿨다. **M1** — REQ-CHANWIRE-003 의 토큰 게이트가 형제 SPEC 의 stdio 프로브(`SPEC-CHANNEL-001` AC-002·004·005 는 토큰 없이 `node channel/dist/index.js` 를 띄운다)를 조용히 무력화하고, 배선 이후 빌드 산출물이 MCP 를 말하는지 재는 기준은 네 SPEC 어디에도 없었다. **계약을 바꿔 닫았다 — stdio 연결은 토큰과 무관하게 하고, 토큰은 게이트웨이 접속만 가로막는다**(REQ-003·004 개정). 그리고 빌드 산출물을 직접 재는 AC-CHANWIRE-014 를 더했다. **M6** — 기본 주소 검증이 스텁을 `127.0.0.1:3000`(프로젝트 서버 자신의 기본 포트)에 바인딩해, 서버를 띄워 둔 개발자에게는 정상 구현이 환경 때문에 실패했다. `resolveUrl(env)` 를 내보내 포트와 무관한 관측으로 바꿨다. 요구사항은 13개 그대로이고(REQ-003·004 의 **내용**이 바뀌었다), 수용 기준은 13개 → **14개**가 됐다. 함께 사소 지적 2건도 닫았다(m2 `process.env` 오염 — 자식 프로세스 전환으로 소멸, m4 순서 조항 미관측 — Gaps 로 명시). | manager-spec |
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 13 과 Global Constraints 에서 도출 (칸반 카드 `t4`, 마일스톤 M4). 요구사항 13개·수용 기준 13개로 Tier M 상한(16/16) 안이다. 원본 테스트 하네스에서 차단급 결함 한 건(`setNotificationHandler` 에 zod 스키마가 아닌 평범한 객체를 넘겨 구현이 완벽해도 `TypeError` 로 실패한다)을 찾아 `plan.md` §D 1번에 기록하고 `acceptance.md` 하네스에서 교정했다. 원본 테스트가 "cc 에는 working 이 없다"를 실제로는 재지 않는다는 것도 §D 2번에 기록하고 AC-CHANWIRE-002 에서 닫았다. | manager-spec |

---

## 1. 배경과 목적

`SPEC-CHANNEL-001` 이 MCP 채널 계약(capabilities·`reply`·`fetch_history`)을 구현했고, `SPEC-CHANCLIENT-001` 이 게이트웨이와 말하는 WebSocket 클라이언트를 구현했다. 둘은 서로를 모른다 — 채널 서버는 답변을 어디로 보낼지 모르고, 게이트웨이 클라이언트는 받은 메시지를 누구에게 줄지 모른다.

이 SPEC 은 그 사이의 배선을 만든다. 배선이 끝나면 `minidiscord-channel` 이 실행 가능한 봇이 된다.

```
사람이 방에 "@pm 일정 정리해줘"      →  게이트웨이  →  gateway-client  ─┐
                                                                      │ onMessage
                                                   channel.pushChatMessage
                                                                      ↓
                                                       Claude Code 세션에 notification
                                                                      │
                                            세션이 reply 도구 호출     ↓
              게이트웨이  ←  gateway-client  ←  sendToChat  ←  channel-server
```

네 갈래가 이 배선을 통과한다 — **수신**(게이트웨이 message → 세션 notification), **송신**(`reply` 도구 → 게이트웨이 `bot_message`), **이력 조회**(`fetch_history` 도구 → 게이트웨이 `history_request`), **상태 보고**(`status` `working`/`idle`). 네 갈래는 서로 독립적이라, 하나만 끊겨도 나머지 셋은 멀쩡히 동작한다. 그래서 이 SPEC 의 수용 기준은 **갈래마다 하나씩** 있고, 각 기준은 그 갈래 하나만 끊었을 때 그 기준만 실패해야 한다(AC-CHANWIRE-009 가 그것을 직접 관측한다).

이 SPEC 이 끝나면 토큰과 서버 주소를 환경변수로 받아 실행되는 봇 바이너리가 생긴다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 13, Global Constraints(무상태·환경변수 설정), Task 11·12 의 Interfaces 블록.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 배선 / wiring | 채널 서버와 게이트웨이 클라이언트를 서로의 콜백으로 연결하는 일. `wire()` 함수 하나가 전부다 |
| `wire(opts)` | 이 SPEC 이 내보내는 유일한 함수. `{ url, token }` 을 받아 `{ channel, gw }` 를 돌려준다. 연결을 **시작하지는 않는다** |
| 수신 갈래 | 게이트웨이 `message` → `channel.pushChatMessage` → 세션 notification |
| 송신 갈래 | `reply` 도구 → `sendToChat` → 게이트웨이 `bot_message` |
| 이력 갈래 | `fetch_history` 도구 → `fetchHistory` → `gw.requestHistory` → 게이트웨이 `history_request` |
| 상태 갈래 | `{ type: 'status', state: 'working' \| 'idle' }` 전송. `working` 은 TO 수신 시, `idle` 은 답변 직후 |
| `delivery` | 메시지가 이 봇에게 어떻게 왔는가. `'to'` 는 답해야 하는 것, `'cc'` 는 참고만 하는 것 |
| 진입점 가드 | 모듈이 **직접 실행될 때만** 부작용(stdio 연결·게이트웨이 접속)을 일으키게 하는 조건문. 임포트만으로는 아무 일도 일어나지 않는다 |
| 토큰 게이트 | 진입점 가드 **안쪽**의 두 번째 조건. `MINIDISCORD_TOKEN` 이 있을 때만 게이트웨이 접속을 시작한다. stdio 연결은 이 게이트 밖에 있다 |
| 무상태 | 이 패키지는 디스크에 아무 파일도 쓰지 않고, 설정을 환경변수로만 받는다 (Global Constraints) |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 은 새 도구도 새 WebSocket 메시지 타입도 만들지 않는다. 다음을 그대로 소비한다.

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `SPEC-CHANNEL-001` | `createChannelServer(deps): ChannelHandle`, `ChatMessage` 타입, `reply`·`fetch_history` 도구 정의, `notifications/claude/channel` 알림 형식 |
| `SPEC-CHANCLIENT-001` | `createGatewayClient(opts): GatewayClient`, `start`/`stop`/`send`/`requestHistory`, 재접속 백오프, `rid` 매칭 |
| `SPEC-GATEWAY-001` (서버 쪽) | `bot_message`·`status`·`history_request` 를 받는 게이트웨이 쪽 계약 |

두 선행 계약은 이미 확정돼 있다. 축약 없이 그대로 옮긴다.

```ts
// SPEC-CHANNEL-001 소유
interface ChannelDeps {
  sendToChat: (payload: { text: string; files?: string[] }) => Promise<void>
  fetchHistory: (params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }) => Promise<string>
  sendPermissionRequest?: (params: { request_id: string; tool_name: string; description: string; input_preview: string }) => void
}
interface ChannelHandle {
  server: Server
  pushChatMessage: (msg: ChatMessage) => Promise<void>
}

// SPEC-CHANCLIENT-001 소유
interface GatewayClient {
  start(): void
  stop(): void
  send(payload: object): boolean
  requestHistory(params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }): Promise<any>
}
```

`sendPermissionRequest` 는 이 SPEC 에서 연결하지 않는다 — 권한 릴레이는 `SPEC-CHANPERM-001` 의 몫이다(§5).

---

## 4. 요구사항 (GEARS)

### 4.1 배선 함수의 형태

**REQ-CHANWIRE-001** (Ubiquitous)
`channel/src/index.ts` 는 `wire(opts: WireOpts): { channel: ChannelHandle; gw: GatewayClient }` 를 내보내야 한다. `WireOpts` 는 `{ url: string; token: string }` 이다. 돌려준 `channel` 은 `SPEC-CHANNEL-001` 이 만든 핸들 그대로이고, `gw` 는 `SPEC-CHANCLIENT-001` 이 만든 클라이언트 그대로여서, 호출자가 `channel.server` 로 stdio 를 연결하고 `gw.start()` 로 접속을 시작할 수 있어야 한다.

이 SPEC 의 테스트와 `SPEC-CHANPERM-001` 이 같은 함수를 재사용한다. 그래서 반환값은 두 핸들을 **둘 다** 내주어야 하며, 한쪽만 내주는 형태로는 성립하지 않는다.

**REQ-CHANWIRE-002** (Ubiquitous — 부작용 금지)
`wire()` 는 게이트웨이에 접속하지 않고, stdio 를 연결하지 않으며, 어떤 소켓도 열지 않아야 한다. 연결 시작은 호출자가 `gw.start()` 를 부를 때만 일어난다. 모듈을 `import` 하는 것만으로도 마찬가지다 — 임포트 자체가 접속을 일으켜서는 안 된다(진입점 가드는 REQ-CHANWIRE-003 이 정한다).

### 4.2 진입점

**REQ-CHANWIRE-003** (Where — 실행 조건)
모듈이 실행 파일로 직접 구동되는 경로에서, 진입점은 `channel.server` 를 `StdioServerTransport` 에 **항상** 연결해야 한다. 여기에 더해 `MINIDISCORD_TOKEN` 이 설정돼 있으면 `wire({ url, token })` 의 `gw.start()` 를 불러 게이트웨이 접속을 시작해야 한다. `url` 은 `MINIDISCORD_SERVER` 이며, 설정돼 있지 않으면 문자열 `'ws://127.0.0.1:3000/bot'` 이다. `token` 은 `MINIDISCORD_TOKEN` 의 값 그대로다.

기본 주소는 문자열 하나까지 계약이다 — 사람이 서버를 기본 포트로 띄우고 환경변수 없이 봇을 붙이는 것이 표준 사용법이기 때문이다. 그 해석을 **포트 점유와 무관하게** 관측할 수 있도록, 진입점은 다음 둘을 함께 내보내고 자신도 그 함수를 통해서만 주소를 정해야 한다.

```ts
export const DEFAULT_SERVER = 'ws://127.0.0.1:3000/bot'
export function resolveUrl(env: NodeJS.ProcessEnv = process.env): string   // env.MINIDISCORD_SERVER ?? DEFAULT_SERVER
```

**REQ-CHANWIRE-004** (Unwanted — shall not)
`MINIDISCORD_TOKEN` 이 없으면 진입점은 게이트웨이에 접속해서는 안 된다. 그러나 **stdio 연결까지 막아서는 안 된다** — 토큰 없이 띄운 프로세스도 MCP 로 말을 걸면 답해야 한다.

이것은 원본 스니펫(`plan-v2.md` Task 13 Step 3)이 두 가지를 한 조건에 묶어 둔 것을 **의도적으로 갈라낸 것**이다. 형제 SPEC `SPEC-CHANNEL-001` 의 세 기준(AC-CHANNEL-002·004·005)이 `node channel/dist/index.js` 를 **토큰 없이** 띄워 `initialize` 응답을 읽는데, 원본대로 두 가지를 함께 잠그면 이 SPEC 이 착지하는 순간 그 세 기준이 조용히 실행 불가가 된다. 토큰이 가로막아야 하는 것은 "인증이 필요한 게이트웨이 접속"이지 "MCP 로 말할 수 있는가"가 아니다. 근거와 대안 비교는 `plan.md` §D 3번에 있다.

**REQ-CHANWIRE-005** (Ubiquitous — 무상태)
이 패키지의 실행은 디스크에 어떤 파일도 만들거나 고치지 않아야 하고, 설정을 환경변수 두 개(`MINIDISCORD_TOKEN`, `MINIDISCORD_SERVER`) 외의 경로(설정 파일·CLI 인자·홈 디렉터리)에서 읽어서도 안 된다. Global Constraints 가 정한 무상태 조건이다.

### 4.3 수신 갈래

**REQ-CHANWIRE-006** (When — 이벤트 구동)
게이트웨이에서 `type: 'message'` 가 도착하면, 배선은 그 메시지를 `channel.pushChatMessage` 에 넘겨 세션에 알림 **한 건**이 나가게 해야 한다. 넘기는 값은 게이트웨이가 보낸 것 그대로여서, 세션이 받는 알림의 `params.meta.delivery` 가 원래 `delivery` 와 같고 `params.meta.chat_id` 가 원래 `id` 를 담아야 한다.

**REQ-CHANWIRE-007** (Ubiquitous)
`delivery` 가 `'cc'` 인 메시지도 `'to'` 와 똑같이 세션에 전달되어야 한다. 참고용 메시지를 배선에서 걸러 내면 세션이 방의 맥락을 잃는다 — 답하지 말라는 지시는 채널 지시문이 하고, 배선은 거르지 않는다.

**REQ-CHANWIRE-014** (Unwanted — shall not)
수신 갈래에서 `channel.pushChatMessage` 가 **거부(reject)** 하더라도, 배선은 **처리되지 않은 프로미스 거부(unhandled rejection)를 남겨서는 안 되고** 그 때문에 프로세스가 끝나서도 안 된다. 게이트웨이 클라이언트는 이 콜백을 `await` 하지 않으므로(`REQ-CHANCLIENT-004` 의 호출 형태), 여기서 생긴 거부는 아무도 받지 않는다 — Node 는 처리되지 않은 거부에 프로세스를 끝낸다.

이 조항의 짝은 판정 갈래의 **REQ-CHANPERM-009** 이다. 그쪽은 나가는 방향(Claude Code 로 보내는 판정 알림)에서 같은 위험을 이미 막았고, 이 조항은 **들어오는 방향**에서 같은 것을 막는다. Claude Code 세션이 `/clear` 되거나 재시작되어 stdio 가 끊긴 뒤 채팅 한 건이 도착하는 일은 일상적인 사건이므로, 한쪽만 막아 두는 것은 수용된 갭이 아니라 내부 비일관이다(v0.3.0 개정, 감사 F-06).

### 4.4 상태 갈래

**REQ-CHANWIRE-008** (When — TO 수신)
`delivery` 가 `'to'` 인 메시지가 도착하면, 배선은 그 메시지를 세션에 넘기기 전에 게이트웨이로 `{ type: 'status', state: 'working' }` 을 보내야 한다. 방에서 사람이 "봇이 지금 일하는 중"임을 보는 근사값이다.

**REQ-CHANWIRE-009** (When — 답변 완료)
`reply` 도구가 답변을 보내면, 배선은 `bot_message` 를 보낸 **다음에** `{ type: 'status', state: 'idle' }` 을 보내야 한다. 순서가 계약이다 — `idle` 이 답변보다 먼저 나가면 방에서 "끝났다"고 표시된 뒤에 답변이 오게 된다.

**REQ-CHANWIRE-010** (Unwanted — shall not)
`delivery` 가 `'cc'` 인 메시지는 `working` 상태를 발생시켜서는 안 된다. 참고 메시지마다 봇이 일하는 중으로 표시되면 상태 표시가 무의미해진다.

### 4.5 송신 갈래와 이력 갈래

**REQ-CHANWIRE-011** (When — 답변 전송)
`reply` 도구가 `{ text, files? }` 로 호출되면, 배선은 게이트웨이로 `{ type: 'bot_message', body: <text 그대로>, files: <경로 목록을 { local_path } 객체 배열로 바꾼 것> }` 을 보내야 한다. `files` 가 주어지지 않으면 빈 배열을 보낸다. 경로 문자열 `'/tmp/r.md'` 는 정확히 `{ local_path: '/tmp/r.md' }` 가 되어야 한다 — 게이트웨이가 첨부를 복사할 때 읽는 필드 이름이 `local_path` 이기 때문이다.

**REQ-CHANWIRE-012** (When — 이력 조회)
`fetch_history` 도구가 호출되면, 배선은 도구가 받은 파라미터 객체를 **그대로** `gw.requestHistory` 에 넘겨야 한다. `since_id`·`since`·`until`·`speaker`·`limit` 다섯 개 어느 것도 이름이 바뀌거나 떨어져 나가서는 안 된다. 특히 `since_id` 는 봇이 "지난번에 본 다음부터"를 정확히 집는 커서라, 여기서 떨어지면 봇이 매번 같은 대화를 다시 읽는다.

받은 응답의 `messages` 는 **구조화 JSON 문자열 하나**로 렌더링되어 도구 결과 텍스트가 되어야 한다. 형식과 커서 규칙의 정본은 `SPEC-CHANINJECT-001` REQ-CHANINJECT-004·005·006 이며, 이 조항은 그것을 받아 적는다.

```
{"cursor": <messages 의 id 최댓값, 비면 null>, "messages": [{"id":…, "at":…, "author":…, "body":…}, …]}
```

**줄을 잇지 않는다.** 커서는 배열 밖 `cursor` 필드에서만 나오며, 어떤 메시지의 `body` 에서도 파생되지 않는다. 메시지가 하나도 없으면 `{"cursor":null,"messages":[]}` 를 돌려준다.

> **v0.4.0 개정 (카드 `t10`) — 이 조항은 v0.3.0 이 §5 에 «미해소» 로 적은 F-03 을 닫는 자리다.** v0.3.0 은 이 자리에 줄 형식 `#<id> [<created_at>] <author_name>: <body>` 를 못 박고 «줄 앞의 `#<번호>` 는 장식이 아니라 계약이다» 라고 적었다. **그 계약이 결함의 원인이었다.** 본문에 개행이 들어가면 진짜 줄과 가짜 줄을 구분할 수 없고(감사 프로브 P3: 메시지 **1건**이 두 줄이 되었다), 본문에 `#999999` 를 심으면 모델이 그것을 커서로 채택해 진짜 이력이 **오류 없이 조용히** 영구히 걸러진다(`.moai/reports/t4/sync-audit.md` F-03). 구조화 JSON 은 `JSON.stringify` 의 이스케이프로 앞의 결과를, 별도 `cursor` 필드로 뒤의 결과를 닫는다. **왜 «개행만 이스케이프» 를 고르지 않았는지**는 `SPEC-CHANINJECT-001/plan.md` §B 가 적었다 — 그 갈래는 커서 오염을 닫지 못한다. **형제 회귀 기준 둘이 이 개정으로 깨진다**: AC-CHANWIRE-007·008. 두 기준은 아래에서 함께 개정한다.

### 4.6 범위 경계

**REQ-CHANWIRE-013** (Unwanted — shall not)
이 SPEC 의 구현은 `channel/src/channel-server.ts` 와 `channel/src/gateway-client.ts` 를 고쳐서는 안 되고, `server/` 아래 어떤 파일도 건드려서는 안 되며, 새 MCP 도구·새 WebSocket 메시지 타입·새 환경변수를 도입해서도 안 된다. 손대는 파일은 정확히 둘이다 — 전면 교체하는 `channel/src/index.ts` 와 새로 만드는 `channel/test/index-wiring.test.ts`.

선행 계약을 고쳐야 할 것 같으면 진행을 멈추고 보고한다(Global Constraints).

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자 또는 배제 근거를 명시한다.

### Out of Scope — 채널 서버 계약 (`SPEC-CHANNEL-001`)

- `channel/src/channel-server.ts` 전체 — `createChannelServer`, capabilities 선언, `INSTRUCTIONS` 지시문, `reply`·`fetch_history` 도구 스키마, `pushChatMessage` 의 알림 형식(`content` 조립·`meta` 필드 구성)
- MCP 서버가 도구 호출을 라우팅하는 방식과 알 수 없는 도구 이름에 대한 오류

### Out of Scope — 게이트웨이 클라이언트 (`SPEC-CHANCLIENT-001`)

- `channel/src/gateway-client.ts` 전체 — `hello`/`welcome` 핸드셰이크, 재접속 백오프, `rid` 매칭과 10초 타임아웃, `send` 의 연결 상태 판정
- `requestHistory` 가 `history_request` 프레임을 만드는 방식. 이 SPEC 은 그것을 **호출**할 뿐이다

### Out of Scope — 권한 릴레이 (`SPEC-CHANPERM-001`)

- `ChannelDeps.sendPermissionRequest` 의 연결, `handlePermissionVerdict` 의 배선, `notifications/claude/channel/permission_request` 수신
- 이 SPEC 이 만든 `wire()` 를 그 SPEC 이 확장한다. 확장 지점은 남겨 두되 이 SPEC 에서 채우지 않는다

### Out of Scope — 서버 (`SPEC-GATEWAY-001` 외 서버 SPEC 전부)

- `bot_message` 를 받아 메시지 행과 첨부를 저장하는 것, `status` 를 받아 방에 표시하는 것, `history_request` 에 응답하는 것
- 이 SPEC 의 관측 대상은 **게이트웨이 소켓으로 나간 프레임까지**다. 그 프레임이 서버에서 어떻게 처리되는지는 서버 SPEC 이 이미 정했다

### Out of Scope — 봇 등록·초대 흐름

- 봇 토큰 발급, 방 초대, `MINIDISCORD_TOKEN` 에 넣을 값을 사람이 얻는 절차 (서버 SPEC 과 웹 UI 카드가 소유)

### Out of Scope — 이력 렌더링의 신뢰 경계 (감사 F-03 — `SPEC-CHANINJECT-001` 이 해소)

> **v0.4.0 정정 (카드 `t10`).** 아래 절은 v0.3.0 이 «미해소·별도 카드» 로 적은 상태를 그대로 보존한다 — 그 시점의 사실이었고 소급 수정은 감사 추적을 훼손한다. **바뀐 것은 둘이다.** ① 소유자가 정해졌다: `SPEC-CHANINJECT-001`(카드 `t10`). ② 그 SPEC 의 요구로 **REQ-CHANWIRE-012 가 v0.4.0 에서 개정됐으므로, 아래 «AC-CHANWIRE-007 이 못 박은 `#1 [2026-08-01] alice: 과거` 형식» 은 더 이상 이 SPEC 의 형식이 아니다.** 아래 «이 카드에서 해소하지 않았다» 의 «이 카드» 는 `t4` 를 가리킨다. F-02·F-04(지시문 쪽)의 소유자도 `SPEC-CHANNEL-001` 이 아니라 `SPEC-CHANINJECT-001` 로 이관됐다 — 셋이 한 부류이기 때문이다(감사 §6 권고 2번).


`.moai/reports/t4/sync-audit.md` F-03(High)은 `index.ts` 의 이력 렌더링이 **개행으로 구분된 평문**이라, 한 사람의 본문이 임의 개수의 가짜 `#번호` 이력 줄을 만들어 낼 수 있다는 점을 지적했다(커서 오염 포함). AC-CHANWIRE-007 이 못 박은 `#1 [2026-08-01] alice: 과거` 형식은 **형식의 고정**을 재는 기준이지 **본문의 무해화**를 재는 기준이 아니다 — 본문에 개행과 `#숫자`가 들어 있어도 그 기준은 통과한다.

- 이력 줄 렌더링에서 본문을 이스케이프하거나 구조화된 형태로 감싸는 일
- 채팅 본문이 모델 지시로 승격되지 못하게 하는 신뢰 경계 (같은 보고서 F-02·F-04 — 지시문 쪽은 `SPEC-CHANNEL-001` 소유)

**이 카드에서 해소하지 않았다.** 별도 카드가 소유하며, 여기서는 결함이 열려 있다는 사실만 기록한다. 이 카드가 이 파일에서 닫은 것은 F-06(수신 갈래의 처리되지 않은 거부)뿐이고, 그것은 신뢰 경계 문제가 아니라 견고성 문제다.

### Out of Scope — 운영 편의 기능

- 토큰이 없을 때의 안내 메시지·사용법 출력·`--help` 류 CLI 인자. 토큰 없이 띄운 프로세스는 MCP 로만 답하고 게이트웨이에는 붙지 않는데(REQ-CHANWIRE-004), 그 상태를 사람에게 알리는 문구를 새로 만드는 것은 설계 변경이다. stderr 진단 출력은 stdio 전송과 섞이지 않으므로 기술적으로는 가능하나, 문구 신설은 리드 판정 대기로 남긴다(`plan.md` §D 3번)
- 로그 파일·재접속 알림·헬스체크 엔드포인트. 무상태 제약(REQ-CHANWIRE-005)과 충돌한다
- 여러 방 동시 참여. 세션은 정확히 한 방에만 속한다(`spec-v2.md` 2장)

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 선행 SPEC 이 설치한 것을 그대로 쓴다: `@modelcontextprotocol/sdk ^1`, `ws ^8`, `zod ^3`, `vitest ^2`. 이 SPEC 은 새 의존성을 추가하지 않는다.
- 채널 플러그인은 무상태다 — 디스크에 아무 파일도 쓰지 않고, 설정은 `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 두 환경변수로만 받는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w channel`.
- UI 문구는 한국어, 코드 주석도 한국어. **다만 이력 결과 텍스트는 v0.4.0 부터 UI 문구가 아니라 구조화 JSON 이고, `'(기록 없음)'` 은 `{"cursor":null,"messages":[]}` 로 대체됐다** — 그 문자열을 읽는 것은 사람이 아니라 모델이다 (카드 `t10`, `SPEC-CHANINJECT-001/plan.md` §B).
- 커밋 메시지는 영어 관례(`feat:`, `test:`).
- 채널 계약(capabilities·notification 메서드·`reply` 도구·권한 릴레이)은 `spec-v2.md` 4-B 와 공식 channels-reference 를 그대로 따른다. `bot_message`·`status`·`history_request` 의 필드 이름과 `state` 값(`'working'`/`'idle'`)은 이 SPEC 에서 바꾸지 않는다. 변경이 필요해 보이면 중단하고 보고한다.
- 이력 결과 형식은 REQ-CHANWIRE-012(v0.4.0)가 정한 구조화 JSON 이며, 그 정본은 `SPEC-CHANINJECT-001` REQ-CHANINJECT-004·005 다. 이 SPEC 에서 완화도 강화도 하지 않는다. **v0.3.0 까지 이 자리가 고정하던 줄 형식 `#<id> [<created_at>] <author_name>: <body>` 와 `'(기록 없음)'` 은 폐기됐다** (카드 `t10`, 감사 F-03).

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 13(채널 연결), Task 11·12(선행 계약), Task 8(게이트웨이 서버 쪽 수신)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-B 채널 계약, 2장 세션→방 N:1
- `.moai/specs/SPEC-CHANNEL-001/` — MCP 채널 서버 코어
- `.moai/specs/SPEC-CHANCLIENT-001/` — 게이트웨이 WebSocket 클라이언트
- `.moai/specs/SPEC-CHANPERM-001/` — 채널 권한 릴레이 (이 SPEC 의 `wire()` 를 확장)
- `.moai/specs/SPEC-GATEWAY-001/` — 서버 쪽 봇 게이트웨이
- 칸반 카드 `t4` (마일스톤 M4)
