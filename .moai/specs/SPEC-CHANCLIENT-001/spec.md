---
id: SPEC-CHANCLIENT-001
title: "minidiscord 게이트웨이 클라이언트 — 채널 플러그인이 봇 게이트웨이에 붙어 있게 하는 WebSocket 배관"
version: "0.5.0"
status: completed
created: 2026-08-27
updated: 2026-08-29
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "channel/"
lifecycle: spec-anchored
tags: "websocket-client, gateway-handshake, reconnect-backoff, rid-matching, history-request, stateless-plugin"
tier: M
depends_on: [SPEC-CHANNEL-001]
related_specs: [SPEC-GATEWAY-001, SPEC-CHANWIRE-001, SPEC-CHANPERM-001]
followup_cards: [t15, t16, t20]
---

# SPEC-CHANCLIENT-001 — 게이트웨이 클라이언트 (채널 쪽)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.5.0 | 2026-08-28 | **참조 정정 — 이력 렌더링 형식과 잔여 소유 분리 (카드 `t10`, `SPEC-CHANINJECT-001` v0.1.0 §3.3).** **이 SPEC 의 계약은 한 글자도 바뀌지 않는다.** `requestHistory` 가 프레임을 통째로 `resolve` 하는 성질(REQ-CHANCLIENT-005), 다섯 파라미터를 프레임 최상위에 싣는 성질(REQ-CHANCLIENT-007), 10초 타임아웃 — 전부 그대로다. 「커서를 별도 필드로 뺀다」는 것은 **모델이 읽는 표면**의 이야기이지 게이트웨이 프레임의 이야기가 아니며, `since_id` 는 이미 프레임 최상위 필드이고 본문에서 파생되지 않는다. 바뀐 것은 **두 줄의 참조**뿐이다. ① §5 범위 밖 열거가 이력 문자열의 옛 형식(`#<번호> [시각] 작성자: 본문`)을 리터럴로 적고 있었는데, 그 형식은 `SPEC-CHANWIRE-001` v0.4.0 에서 폐기됐다 — 형식 리터럴을 지우고 소유자를 적었다. ② §5 «상대 인증» 절이 게이팅 뒤 잔여를 카드 `t15` 소유로만 적었는데, 그 잔여는 두 층이다 — **내용 신뢰 경계는 `SPEC-CHANINJECT-001`(카드 `t10`), 상대 신원은 `t15`**. 갈라 적었다. **형제 회귀 기준은 하나도 깨지지 않는다** — `channel/test/gateway-client.test.ts` 의 이력 관련 세 기준(AC-CHANCLIENT-007·008·010)이 전부 프레임 객체를 단언하고 렌더링 문자열을 단언하지 않는다(`SPEC-CHANINJECT-001/spec.md` §3.5 무영향 표). | manager-spec |
| 0.4.0 | 2026-08-28 | **계약 개정 — 세션 확립 전제 (카드 `t9`, 계획 감사 C-03).** v0.3.0 §5 는 F-01 을 "이 카드에서 해소하지 않았다"로 기록하고 별도 카드에 넘겼다. 그 카드가 `t9`(`SPEC-CHANAUTH-001`)이고, **그쪽 REQ-CHANAUTH-001 이 이 SPEC 의 REQ-CHANCLIENT-004·005 와 정면 충돌한다** — 이쪽은 프레임이 도착하면 **조건 없이** 분배하라고 요구하고, 저쪽은 `welcome` 이 오기 전에는 **어떤 콜백에도 전달하지 말라**고 요구한다. `t9` 의 첫 계획(`SPEC-CHANAUTH-001` v0.1.0)은 `SPEC-CHANPERM-001` 만 개정하고 이 SPEC 을 건드리지 않았고, 계획 감사가 그 누락을 Critical 로 지목했다. **개정 내용은 둘이다.** (1) **REQ-CHANCLIENT-004·005** 에 세션 확립 전제를 달았다 — 분배 의무는 `welcome` 이 도착한 소켓에 대해서만 성립하며, 그전에 도착한 세 프레임은 버린다. **통과 충실성 조항(필드를 잃거나 바꾸지 않는다)은 한 글자도 바뀌지 않는다** — 바뀐 것은 "언제 분배하는가"뿐이다. (2) `acceptance.md` 공통 하네스의 `startServer()` 가 `hello` 에 `welcome` 으로 답하도록 `autoWelcome` 손잡이를 달았고(기본값 `true` — 형제 하네스 `index-wiring.test.ts`·`permission-relay.test.ts` 가 이미 쓰는 형태다), 그에 따라 **AC-CHANCLIENT-002·005 두 건의 본문**이 바뀌었다. 하네스 변경만으로 되살아나는 기준이 다섯 건 더 있다(AC-003·004·007·008·010 — 전건 열거는 `SPEC-CHANAUTH-001/spec.md` §3.2). **요구사항 14개·수용 기준 16개는 개수 그대로다.** 구현과 테스트 교체는 `SPEC-CHANAUTH-001` 의 run 단계(M1)가 수행한다. | manager-spec |
| 0.3.0 | 2026-08-27 | **sync 감사 마감 라운드 (F-05).** `.moai/reports/t4/sync-audit.md` 가 이 SPEC 에서 High 1건을 실행으로 재현했다 — `gateway-client.ts` 의 `ws.on('message')` 리스너가 `JSON.parse` 를 무방비로 부르고 있어, JSON 아닌 프레임 **한 개**로 `uncaughtException` 이 나 프로세스가 끝난다(`P4_EXIT=1`). 재접속조차 없다, 프로세스가 없기 때문이다. v0.2.1 까지 엣지 케이스 표는 이것을 "미검증 — 수용" 으로 적었으나, 수용 기록이 결함을 결함이 아니게 만들지는 않는다 — 같은 파일이 형제 위험은 모두 막아 두었고(`ws.on('error')`), 서버 쪽 같은 자리도 `try/catch` 다. **REQ-CHANCLIENT-006 에 파싱 실패 조항을 더하고 AC-CHANCLIENT-005 에 셋째 테스트를 더해 닫았다**(변이 `M-F05 revert try/catch` 로 조준 확인, 이 테스트 한 건만 실패). 요구사항 14개·수용 기준 16개 그대로다 — Tier M 상한(16/16)을 넘지 않으려고 새 AC 를 만드는 대신 같은 요구사항을 재는 AC-005 를 넓혔다. 함께 미해소 결함 F-01(상대 인증 부재)·F-07(평문 토큰)을 §5 에 기록했다 — **이 카드는 그 둘을 고치지 않았다.** | manager-spec |
| 0.2.1 | 2026-08-27 | **2차 감사 사소 교정 (근거 문장 한 곳).** 2차 판정은 PASS 였고, 사소 지적 m3 하나만 닫았다 — `REQ-CHANCLIENT-003` 의 근거 문장이 `missed_after_id` 커서를 "쓰는 `SPEC-CHANWIRE-001` 쪽"이라고 적었으나 **그런 소비자는 존재하지 않는다.** 실제 소비자는 서버 자신으로, `server/src/gateway.ts:101-108` 이 `welcome` 을 보낸 직후 그 커서 이후의 메시지를 스스로 재전송한다(직접 확인). 요구사항 자체와 실제 영향은 그대로이므로 근거만 바로잡고, 이 요구사항이 겨냥하는 것이 그 필드 하나가 아니라 **해석하지 않는 프레임의 통과 충실성**이라는 점을 §4.1·§5·`acceptance.md` AC-CHANCLIENT-002·`plan.md` §E 에 다시 적었다. **요구사항·수용 기준은 개수·내용 모두 그대로다.** | manager-spec |
| 0.2.0 | 2026-08-27 | **plan-audit 교정 라운드 (프론트매터 한 줄).** `.moai/reports/t4/plan-audit.md` 가 주요 1건(M5)을 지적했다 — `depends_on: []` 이 실행 순서를 보증하지 않는다는 것. "코드 의존이 아니라 실행 전제"라는 v0.1.0 의 관찰은 옳지만 결론이 틀렸다: `depends_on` 이 표현하는 것은 import 그래프가 아니라 **착수 가능 조건**이고, 비워 두면 스케줄러가 이 SPEC 을 `SPEC-CHANNEL-001` 보다 먼저 띄울 수 있어 수용 기준 16개가 전부 실행 불가가 된다. `depends_on: [SPEC-CHANNEL-001]` 로 고쳤고, 그 의존이 코드 import 가 아니라 패키지 스캐폴드 선행이라는 구분은 §3 과 `plan.md` §A 에 그대로 남겼다. **요구사항·수용 기준은 개수·내용 모두 그대로다**(REQ-CHANCLIENT-001..014, AC-CHANCLIENT-001..016). | manager-spec |
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 12 에서 도출 (칸반 카드 `t4`, 마일스톤 M4). 요구사항 14개·수용 기준 16개로 Tier M 상한(16/16) 안이다. 원본 Task 12 의 `Consumes` 가 "없음(독립)" 이라 `depends_on` 을 비워 두었으나, 테스트 명령 `npm test -w channel` 은 `SPEC-CHANNEL-001` 이 만드는 `channel/` 워크스페이스 스캐폴드 없이는 실행되지 않는다 — 코드 의존이 아닌 실행 전제로 §3 과 `plan.md` §A 에 기록하고 리드에 보고했다. | manager-spec |

---

## 1. 배경과 목적

채널 플러그인은 Claude Code 세션마다 새로 spawn 되는 stdio MCP 서버다. 세션과 채팅 서버 사이를 잇는 유일한 통로가 이 플러그인이고, 그 통로의 **서버 쪽 끝**이 봇 게이트웨이(`ws://…/bot`)다. 이 SPEC 은 그 끝에 붙어 있는 일을 맡는 부품 하나 — `channel/src/gateway-client.ts` — 를 확정한다.

이 부품이 하는 일은 넷이다.

```
① 붙는다        connect → open → { type:'hello', token }  → 서버가 welcome 으로 답한다
② 받아 나눈다    message / permission_verdict / welcome / history_response 를 type 으로 갈라 콜백에 넘긴다
③ 보낸다        send(payload) — 소켓이 열려 있을 때만 true
④ 되묻는다       requestHistory(params) → history_request { rid } → 같은 rid 의 history_response 로 resolve
   ⑤ 끊기면 다시 붙는다  close → sleep(backoff) → connect, backoff 는 1s 에서 두 배씩 최대 30s
```

**왜 재접속이 요구사항 층에 있는가.** 서버를 재시작하거나 노트북이 절전에서 깨어나면 소켓은 조용히 끊긴다. 그때 다시 붙지 않으면 세션은 살아 있는 채로 방에서만 사라진다 — 사람은 봇이 죽은 줄 모르고 멘션을 계속 보내고, 어떤 오류도 어디에도 뜨지 않는다. 재접속은 있으면 좋은 기능이 아니라 이 플러그인이 성립하기 위한 조건이다.

**왜 `sleep` 을 주입받는가.** 백오프는 초 단위로 커진다. 실제 시간을 기다리는 테스트로는 지수 증가와 상한을 잴 수 없고(30초 상한을 확인하려면 한 번의 테스트에 1분이 넘게 든다), 기다리는 테스트는 곧 간헐 실패로 바뀐다. 그래서 원본 계약이 `sleep` 을 옵션으로 열어 두었다 — 이 SPEC 의 타이밍 관련 기준은 전부 주입된 `sleep` 과 가짜 타이머로만 관측한다(§6).

이 SPEC 이 끝나면 채널 플러그인의 나머지 부분(`SPEC-CHANWIRE-001`)이 "게이트웨이에 늘 붙어 있는 소켓"을 전제로 배선을 짤 수 있다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 12, Global Constraints, `spec-v2.md` 4-B(채널 계약).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 게이트웨이 | 서버의 WebSocket 엔드포인트 `/bot`. 봇 토큰으로 인증하고 방 하나에 묶인다. 구현은 `SPEC-GATEWAY-001` 소유 |
| handshake | 소켓이 열린 직후 클라이언트가 보내는 `{ type:'hello', token }` 한 프레임과, 서버가 답하는 `welcome` 한 프레임 |
| 프레임 | 이 소켓을 오가는 JSON 객체 하나. 모두 `type` 필드를 갖는다 |
| `rid` | `requestHistory` 한 번을 가리키는 요청 식별자. 요청 프레임과 응답 프레임에 같은 값이 실린다 |
| 대기 맵 | 아직 응답이 오지 않은 `rid` 를 그 요청의 `resolve`/`reject`/타이머에 연결해 두는 프로세스 메모리 맵 |
| 백오프 | 재접속 시도 사이에 기다리는 시간. 1000ms 에서 시작해 실패할 때마다 두 배가 되고 `maxBackoffMs` 에서 멈춘다 |
| `UrlRef` | `url` 옵션의 타입. 문자열이거나 무인자 함수이며, 함수면 **연결을 시도할 때마다** 다시 평가된다 |

## 3. 이 SPEC 이 받아 쓰는 것

원본 Task 12 의 Interfaces 는 `Consumes: 없음(독립)` 이다. 이 SPEC 은 다른 SPEC 의 함수나 타입을 하나도 import 하지 않는다. 테스트도 실제 서버가 아니라 테스트 안에서 띄우는 가짜 `WebSocketServer` 를 상대로 돈다.

그런데도 `depends_on: [SPEC-CHANNEL-001]` 이다. **이 의존은 코드 import 가 아니라 패키지 스캐폴드 선행이다** — `channel/` 워크스페이스가 없으면 `npm test -w channel` 이 없는 워크스페이스를 가리켜 이 SPEC 의 수용 기준 16개가 전부 실행 불가가 된다. `depends_on` 이 표현하는 것은 import 그래프가 아니라 **착수 가능 조건**이므로, 비워 두면 스케줄러가 이 SPEC 을 `SPEC-CHANNEL-001` 보다 먼저 띄울 수 있다. 구분 자체는 유효하다 — 이 SPEC 의 **소스 코드**는 여전히 독립이고, 형제 SPEC 의 어떤 심볼도 참조하지 않는다.

아래 두 가지가 그 관계다. 둘 다 §5 에 소유자와 함께 적었다.

| 항목 | 소유자 | 이 SPEC 에서의 성격 |
|------|--------|-------------------|
| `channel/` 워크스페이스 스캐폴드 (`package.json`, `tsconfig.json`, `ws`·`vitest`·`@types/ws` 설치) | `SPEC-CHANNEL-001` (원본 Task 11) | **실행 전제.** 이것이 없으면 `npm test -w channel` 자체가 없는 워크스페이스를 가리켜 이 SPEC 의 어떤 기준도 실행되지 않는다 |
| 게이트웨이가 실제로 보내는 프레임의 필드 이름 (`welcome` 의 `missed_after_id` 등) | `SPEC-GATEWAY-001` (원본 Task 8) | **상대편 계약.** 이 SPEC 은 그 이름을 해석하지 않고 그대로 통과시킨다 — REQ-CHANCLIENT-003 |

이 SPEC 이 만드는 것(`Produces`)은 다음 하나다. 원본 계약을 축약 없이 그대로 옮긴다.

```ts
type UrlRef = string | (() => string)

export interface GatewayClientOpts {
  url: UrlRef
  token: string
  onMessage?: (m: { type: 'message'; id: number; body: string; author_name: string; delivery: 'to' | 'cc'; files?: { name: string; local_path: string }[] }) => void
  onVerdict?: (v: { type: 'permission_verdict'; request_id: string; behavior: 'allow' | 'deny' }) => void
  onWelcome?: (w: { room_id: number; bot_id: number; bot_name: string }) => void
  sleep?: (ms: number) => Promise<void>   // 테스트 주입용
  maxBackoffMs?: number                    // 기본 30000
}

export interface GatewayClient {
  start(): void
  stop(): void
  send(payload: object): boolean
  requestHistory(params: { since_id?: number; since?: string; until?: string; speaker?: string; limit?: number }): Promise<any>
  opts: GatewayClientOpts   // 재접속 시 url 교체를 위해 노출
}

export function createGatewayClient(input: GatewayClientOpts): GatewayClient
```

`requestHistory` 의 반환형이 `Promise<any>` 인 것은 원본 그대로다. 이력 응답의 모양은 게이트웨이가 정하고(`SPEC-GATEWAY-001`), 그것을 문자열로 빚는 일은 `SPEC-CHANWIRE-001` 이 한다 — 이 SPEC 은 응답 객체를 **해석하지 않고** 넘긴다.

---

## 4. 요구사항 (GEARS)

### 4.1 연결과 handshake

**REQ-CHANCLIENT-001** (When — 이벤트 구동)
`start()` 가 호출되면 클라이언트는 `url` 이 가리키는 주소로 WebSocket 연결을 열어야 하고, 그 소켓이 `open` 된 직후 **첫 프레임으로** `{ "type": "hello", "token": <opts.token> }` 을 보내야 한다. 필드는 이 둘뿐이며, 다른 프레임이 hello 보다 먼저 나가서는 안 된다.

토큰을 실은 첫 프레임이 곧 인증이다(`SPEC-GATEWAY-001`). 이름이나 값이 어긋나면 게이트웨이가 연결을 끊고, 그 실패는 재접속 루프에 흡수되어 조용한 무한 재시도로 보인다.

**REQ-CHANCLIENT-002** (Ubiquitous)
`url` 옵션은 문자열이거나 무인자 함수(`UrlRef`)이며, 클라이언트는 **연결을 시도할 때마다** 그 값을 다시 평가해야 한다. 한 번 평가해 캐시해서는 안 된다.

또한 `createGatewayClient` 가 돌려주는 객체는 자신의 옵션 사본을 `opts` 프로퍼티로 노출해야 하고, 호출자가 `client.opts.url` 을 바꾸면 **다음 연결 시도부터** 그 값이 쓰여야 한다. 서버가 다른 주소로 되살아난 상황을 테스트가 재현하는 경로이며, 원본 계약이 이 노출을 명시한다.

**REQ-CHANCLIENT-003** (When — 이벤트 구동)
`type: 'welcome'` 프레임이 도착하면 클라이언트는 `onWelcome` 콜백을 그 **프레임 객체 그대로** 호출해야 한다. 필드를 골라 새 객체로 다시 만들어서는 안 된다.

게이트웨이의 `welcome` 은 `room_id`·`bot_id`·`bot_name` 외에 재전송 커서 `missed_after_id` 를 함께 싣는다(`SPEC-GATEWAY-001`, `server/src/gateway.ts:100`). **그 커서를 쓰는 쪽은 서버 자신이다** — 서버는 `welcome` 을 보낸 직후 그 커서 이후의 놓친 메시지를 스스로 재전송하고 `last_delivered_id` 를 전진시킨다(`server/src/gateway.ts:101-108`). 따라서 채널 쪽에는 이 값을 소비하는 자리가 없고, 지금 이 필드를 잃어도 실제 동작은 달라지지 않는다.

이 요구사항이 겨냥하는 것은 그 필드 하나가 아니라 **통과 충실성**이다. 이 클라이언트는 프레임의 해석자가 아니라 전달자이며(§1), `type` 외의 어떤 필드도 읽지 않는다. 해석하지 않는 객체를 옵션 타입에 선언된 세 필드로 좁혀 다시 만들면, 서버가 지금 싣는 필드도 나중에 더할 필드도 채널 경계에서 소리 없이 사라진다 — 클라이언트가 그 필드의 의미를 모르므로 무엇이 사라졌는지 판단할 수도 없고, 타입 검사로도 잡히지 않는다. 받은 프레임을 그대로 넘기면 소비자가 생기든 필드가 늘든 이 SPEC 은 손댈 일이 없다.

### 4.2 수신 프레임 분배

> **세션 확립 전제 (v0.4.0, 카드 `t9`).** 아래 두 조항의 분배 의무는 **`welcome` 프레임이 이미 도착한 소켓**에 대해서만 성립한다. 그전에 도착한 `message`·`permission_verdict`·`history_response` 는 버린다 — 상세와 근거는 `SPEC-CHANAUTH-001` REQ-CHANAUTH-001·002·003 이 소유하며, 이 SPEC 은 그 전제를 받아 적는다. **전제는 "언제 분배하는가"만 좁힌다. 통과 충실성(어떤 필드도 잃거나 바꾸지 않는다)은 전혀 바뀌지 않는다.**
>
> 이 전제가 `welcome` 을 인증의 증거로 삼는 것은 **아니다.** `welcome` 프레임에는 토큰 지식의 증거가 없고, 게이트가 사는 것은 `hello` 에 응답하지 않는 상대의 차단 하나뿐이다 (`SPEC-CHANAUTH-001` §2.1).

**REQ-CHANCLIENT-004** (While — 상태 구동 + When — 이벤트 구동)
현재 소켓으로 `welcome` 이 도착한 뒤에 `type: 'message'` 프레임이 도착하면 `onMessage` 를, `type: 'permission_verdict'` 프레임이 도착하면 `onVerdict` 를, 각각 그 프레임 객체 그대로 호출해야 한다. `files` 배열, `delivery` 값, `behavior` 값을 포함해 어떤 필드도 잃거나 바꾸지 않아야 한다.

`welcome` 이 아직 도착하지 않은 동안 같은 두 프레임이 도착하면 **어떤 콜백도 호출해서는 안 된다** (REQ-CHANAUTH-001).

**REQ-CHANCLIENT-005** (While — 상태 구동 + When — 이벤트 구동)
현재 소켓으로 `welcome` 이 도착한 뒤에 `type: 'history_response'` 프레임이 도착하면 클라이언트는 그 프레임의 `rid` 로 대기 맵을 조회해, 있으면 그 항목의 타이머를 해제하고 맵에서 지운 뒤 **그 프레임 객체 전체**로 `resolve` 해야 한다. `messages` 필드만 꺼내 넘겨서는 안 된다.

`welcome` 이 아직 도착하지 않은 동안 도착한 `history_response` 는 **대기 맵을 조회해서도, 어떤 약속을 해소해서도 안 된다.** 그 요청은 평소대로 10초 타임아웃으로 reject 된다 (REQ-CHANCLIENT-011 무변경).

**REQ-CHANCLIENT-006** (Unwanted — shall not)
위 네 가지 `type` 중 어느 것에도 해당하지 않는 프레임은 **어떤 콜백에도 전달되어서는 안 된다**. 분배는 `type` 값에 의한 배타 분기이며, 마지막 갈래를 `else` 로 두어 남는 것을 `onMessage` 로 흘려보내서는 안 된다.

해당 콜백이 지정되지 않은 프레임이 도착해도 예외가 나서는 안 되고, 그 뒤에도 클라이언트는 계속 동작해야 한다.

**JSON 으로 파싱되지 않는 프레임도 같다** (v0.3.0 개정, 감사 F-05). 본문이 JSON 이 아닌 프레임 하나가 도착해도 클라이언트는 **그 프레임만 버리고** 계속 동작해야 하며, 그 뒤에 도착하는 정상 프레임은 평소대로 분배되어야 한다. `ws.on('message')` 리스너 안에서 나간 예외는 `uncaughtException` 으로 올라가 프로세스를 끝내므로 — 재접속 경로조차 밟지 못하고 봇이 사라진다 — 파싱 실패는 리스너 안에서 삼켜야 한다. v0.2.1 까지 이 자리는 "미검증 — 수용" 이었고, 감사가 프레임 한 개로 `exit=1` 을 재현해 그 수용을 철회했다.

### 4.3 송신

**REQ-CHANCLIENT-007** (When — 이벤트 구동)
`send(payload)` 는 소켓이 존재하고 `OPEN` 상태일 때만 `payload` 를 JSON 으로 직렬화해 보내고 `true` 를 돌려주어야 한다. 그 외의 모든 상태(연결 전, 재접속 대기 중, `stop()` 이후)에서는 **아무것도 보내지 않고** `false` 를 돌려주어야 한다.

`false` 는 호출자가 읽는 신호다 — `requestHistory` 가 이 값으로 "연결 없음"을 판정한다(REQ-CHANCLIENT-010). 보내지 못했는데 `true` 를 돌려주면 그 판정이 통째로 무너진다.

### 4.4 이력 요청

**REQ-CHANCLIENT-008** (When — 이벤트 구동)
`requestHistory(params)` 가 호출되면 클라이언트는 그 요청만의 `rid` 를 만들어 `{ type: 'history_request', rid, ...params }` 프레임을 보내야 한다. `params` 의 다섯 키 `since_id`·`since`·`until`·`speaker`·`limit` 는 **그 이름 그대로 프레임의 최상위**에 실려야 하며, `params` 라는 이름의 중첩 객체로 감싸서는 안 된다.

`since_id` 는 정확한 커서다(`plan-v2.md` 변경 이력 2026-08-26). 이 키가 프레임에서 누락되면 봇은 시각 기반 근사 커서로 되돌아가고, 같은 메시지를 다시 받거나 건너뛴다.

**REQ-CHANCLIENT-009** (Ubiquitous)
서로 다른 `requestHistory` 호출은 서로 다른 `rid` 를 가져야 하고, 각 호출은 **자신의 `rid` 를 실은 응답으로만** resolve 되어야 한다. 다른 `rid` 의 응답이나 응답 도착 순서로 resolve 되어서는 안 된다.

**REQ-CHANCLIENT-010** (Unwanted — shall not)
`send` 가 `false` 를 돌려준 경우, `requestHistory` 는 대기 맵에 항목을 남기거나 타이머를 남긴 채로 있어서는 안 된다. 즉시 오류로 reject 하고 그 `rid` 의 흔적을 남기지 않아야 한다.

**REQ-CHANCLIENT-011** (While — 상태 구동)
응답을 기다리는 동안, **10,000ms** 안에 같은 `rid` 의 `history_response` 가 오지 않으면 그 요청은 오류로 reject 되어야 하고 대기 맵에서 제거되어야 한다. 상한값은 10초이며 이 SPEC 에서 완화하지도 강화하지도 않는다.

### 4.5 재접속 백오프

**REQ-CHANCLIENT-012** (When — 이벤트 구동)
`stop()` 이 호출되지 않은 상태에서 소켓이 닫히면, 클라이언트는 `sleep(현재 백오프)` 를 기다린 뒤 다시 연결을 시도해야 한다. 대기에는 **주입된 `sleep`** 을 쓰고, 주입되지 않았을 때만 기본 구현(`setTimeout` 기반)을 쓴다.

소켓 `error` 이벤트는 그 자체로 처리되지 않은 예외를 만들어서는 안 된다. 오류 뒤에도 재접속은 `close` 경로 하나로만 일어난다.

**REQ-CHANCLIENT-013** (Ubiquitous)
백오프의 초기값은 **1000ms** 이고, 재접속을 시도할 때마다 두 배가 되며, `maxBackoffMs`(기본 **30000**)를 넘지 않아야 한다. 상한에 닿은 뒤에는 상한값이 계속 쓰인다.

연결이 성공해 소켓이 `open` 되면 백오프는 **1000ms 로 되돌아가야** 한다. 되돌리지 않으면 짧게 끊겼다 붙기를 반복하는 동안 대기 시간이 계속 자라, 결국 30초를 기다리는 봇이 된다.

**REQ-CHANCLIENT-014** (Unwanted — shall not)
`stop()` 이 호출된 뒤에는 어떤 재접속도 일어나서는 안 된다. `sleep` 호출도, 새 WebSocket 연결도 없어야 한다. `stop()` 은 진행 중인 소켓을 닫는다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자 또는 배제 근거를 명시한다.

### Out of Scope — 채널 패키지 스캐폴드 (`SPEC-CHANNEL-001`, 원본 Task 11)

- `channel/package.json`, `channel/tsconfig.json`, 워크스페이스 등록, `ws`·`vitest`·`@types/ws` 설치
- `channel/src/channel-server.ts` — MCP 채널 계약(capabilities·`reply` 도구·`fetch_history` 도구·지시문 문자열)
- 이 SPEC 은 그 패키지 **안에 파일 두 개를 더할** 뿐이다. 스캐폴드가 없으면 §7 의 명령이 실행되지 않는다 — `plan.md` §A 의 착수 전 확인 대상이다

### Out of Scope — 채널 배선 (`SPEC-CHANWIRE-001`, 원본 Task 13)

- `channel/src/index.ts` — MCP 서버와 이 클라이언트를 잇는 조립, 환경변수 `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 읽기
- `onMessage` 를 받아 세션에 알림으로 넘기는 일, `reply` 도구를 `send` 로 잇는 일
- `requestHistory` 의 응답 객체를 모델이 읽는 이력 텍스트로 빚는 일. **형식의 소유자는 `SPEC-CHANWIRE-001` REQ-CHANWIRE-012 이고, 그 내용 규약(구조화 JSON `{cursor, messages[]}`)은 `SPEC-CHANINJECT-001` REQ-CHANINJECT-004·005 가 소유한다.** v0.4.0 까지 이 줄은 옛 줄 형식 `#<번호> [시각] 작성자: 본문` 을 리터럴로 적었으나, 그 형식은 감사 F-03 때문에 폐기됐다 (v0.5.0, 카드 `t10`)
- `welcome` 의 `missed_after_id` 커서를 **채널 쪽에서** 쓰는 일. 오늘 그런 자리는 어디에도 없다 — 그 커서의 소비자는 서버 자신이고(`server/src/gateway.ts:101-108` 이 스스로 재전송한다), 이 SPEC 은 그 값을 **전달만** 한다(REQ-CHANCLIENT-003). 나중에 채널 쪽 소비자가 생기더라도 이 SPEC 은 손댈 일이 없다

### Out of Scope — 채널 권한 릴레이 (`SPEC-CHANPERM-001`, 원본 Task 14)

- `permission_request` 를 세션에서 받아 게이트웨이로 올리는 경로
- `onVerdict` 로 받은 판정을 Claude Code 에 적용하는 일. 이 SPEC 은 콜백 호출까지가 끝이다

### Out of Scope — 서버 쪽 게이트웨이 (`SPEC-GATEWAY-001`)

- `server/src/gateway.ts` 전체 — `hello` 토큰 검증, `welcome` 발행, `history_request` 처리와 `since_id` 필터, `missed_after_id` 재전송
- 이 SPEC 의 테스트는 실제 게이트웨이가 아니라 테스트 안의 가짜 `WebSocketServer` 를 상대한다. 두 쪽이 실제로 맞물리는지는 원본 Task 18 의 E2E 가 본다

### Out of Scope — 상대 인증과 접속 상태 게이팅 (감사 F-01 — 카드 `t9`·`t15` 로 인계 완료)

> **v0.4.0 갱신.** 아래 v0.3.0 서술은 이 결함을 "미해소, 별도 카드 소유"로 남겼다. 그 별도 카드가 **`t9`(`SPEC-CHANAUTH-001`)** 로 확정됐고, 아래 두 항목의 처리 결과는 이렇다.
>
> - **접속 상태 게이팅** — `t9` 가 소유하며, 그 귀결로 **이 SPEC 의 REQ-CHANCLIENT-004·005 에 세션 확립 전제가 붙었다**(§4.2, v0.4.0). 즉 이 항목은 더 이상 "범위 밖"이 아니라 **이 SPEC 의 계약 일부**다. 구현은 여전히 `t9` 의 run 단계가 한다.
> - **`wss://` 스킴 검증** — `t9` 의 REQ-CHANAUTH-010 이 소유한다. `channel/src/index.ts` 를 고치므로 이 SPEC 의 범위 밖인 것은 그대로다.
>
> **그리고 게이팅이 서도 상대 인증은 여전히 없다.** `welcome` 프레임에는 토큰 지식의 증거가 없으므로(`SPEC-CHANAUTH-001` §2.1), `hello` 에 답할 수 있는 상대는 게이트를 열고 사칭 `message` 와 `history_response` 를 그대로 밀어 넣을 수 있다. 아래 v0.3.0 서술의 위협 기술은 그 범위에서 여전히 유효하다.
>
> **v0.5.0 정정 — 그 남은 몫은 한 카드가 아니라 두 층이다 (카드 `t10`).** v0.4.0 은 이 자리를 «남은 절반은 카드 `t15` 가 소유한다» 한 줄로 적었으나, 잔여는 성질이 다른 둘이고 소유자도 둘이다.
>
> - **무엇이 말해지는가 (내용 신뢰 경계)** — 밀어 넣어진 본문·이력이 모델 지시로 승격되는 경로. **`SPEC-CHANINJECT-001`(카드 `t10`)** 소유. 봉투 시퀀스 중화 · 구조화 이력 + 별도 커서 · 지시문 신뢰 경계 두 문장. 감사 F-02·F-03·F-04.
> - **누가 말하는가 (상대 신원)** — `welcome` 위조 불가능화, 소켓에서 읽은 진짜 `request_id` 로 위조한 `permission_verdict`, 선착 판정 승리, F-A8. **카드 `t15`** 소유. `server/` 쪽 서명·논스가 필요하다.
>
> **둘은 서로를 대신하지 못한다** — 내용을 중화해도 사칭 상대는 여전히 «진짜 형태의 거짓 메시지» 를 밀어 넣을 수 있고, 상대를 인증해도 방 참가자가 쓴 본문은 여전히 신뢰할 수 없다 (`SPEC-CHANINJECT-001` §5).

`.moai/reports/t4/sync-audit.md` F-01(Critical)은 이 파일의 프레임 분배가 **`welcome` 을 받았는지 보지 않고** `type` 만으로 분기한다는 점을 지적했다. 봇은 `hello` + 토큰으로 자신을 인증하지만 서버는 봇에게 자신을 인증하지 않으므로, 소켓 상대가 진짜 게이트웨이인지 검사하는 자리가 이 SPEC 에는 없다. `MINIDISCORD_SERVER` 로 원격을 가리키는 지원 구성(AC-CHANWIRE-011)에서는 같은 망의 누구나·평문 경로의 MITM·재시작 직후 포트를 선점한 프로세스가 전부 그 자리에 설 수 있다.

- `welcome` 수신 전에는 `message`/`permission_verdict`/`history_response` 를 처리하지 않는 접속 상태 가드
- 호스트가 루프백이 아닐 때 `wss://` 를 요구하는 스킴 검증 (같은 보고서 F-07)

**이 카드에서 해소하지 않았다.** 위 둘은 별도 카드가 소유하며, 여기서는 결함이 열려 있다는 사실만 기록한다. 이 카드가 닫은 것은 같은 파일의 F-05(파싱 실패로 인한 프로세스 종료)뿐이고, 그것은 인증 문제가 아니라 견고성 문제다 — 인증되지 않은 상대의 프레임은 F-05 수정 뒤에도 여전히 그대로 분배된다.

### Out of Scope — 프로토콜 확장

- 하트비트(ping/pong), 연결 상태 이벤트, 재접속 횟수 상한, 지터(jitter)
- 큐잉: `send` 가 `false` 를 돌려준 payload 를 모아 두었다가 재접속 후 다시 보내는 일. 원본에 없다. 재전송 책임은 서버의 `missed_after_id` 커서에 있다
- 프레임 스키마 검증(zod 등). 이 SPEC 은 `type` 값 하나로만 분기하고 나머지 필드는 해석하지 않는다

### Out of Scope — 상태와 설정

- 디스크에 무엇이든 쓰는 일. Global Constraints 가 채널 플러그인을 무상태로 못 박았다
- 환경변수를 직접 읽는 일. `url` 과 `token` 은 오직 `opts` 로만 들어온다(REQ-CHANCLIENT-002 와 `SPEC-CHANWIRE-001` 의 경계)
- 로깅 형식, 재접속 알림 UI

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 `SPEC-CHANNEL-001` 이 설치한 것을 그대로 쓴다: `ws ^8`, `vitest ^2`, `@types/ws`. 이 SPEC 은 새 의존성을 추가하지 않는다. `randomUUID` 는 Node 표준 `node:crypto` 에서 온다.
- **채널 플러그인은 무상태다.** 이 SPEC 의 구현은 디스크에 어떤 파일도 쓰지 않고, `process.env` 를 읽지 않는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w channel`.
- **타이밍은 실제 시간으로 재지 않는다.** 백오프 관련 기준은 주입된 `sleep` 이 기록한 인자값으로, 10초 타임아웃 기준은 vitest 가짜 타이머(`vi.useFakeTimers`)로 관측한다. `await new Promise(r => setTimeout(r, N))` 로 결과를 기다리는 형태는 이 SPEC 의 기준에서 쓰지 않는다 — 느린 기계에서 간헐 실패로 바뀌고, 그 실패는 타임아웃을 늘리는 방향으로 덮이기 때문이다.
- 프레임의 필드 이름과 `type` 값(`hello`·`welcome`·`message`·`permission_verdict`·`history_request`·`history_response`)은 `spec-v2.md` 4-B 와 공식 channels-reference 를 그대로 따른다. 이 SPEC 에서 바꾸지 않는다. 변경이 필요해 보이면 중단하고 보고한다.
- 코드 주석은 한국어. 커밋 메시지는 영어 관례(`feat:`, `test:`).

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 12(이 SPEC 의 원본), Task 8(게이트웨이 계약), Task 11·13·14(형제 SPEC 의 원본)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-B 채널 계약
- `.moai/specs/SPEC-GATEWAY-001/` — 서버 쪽 게이트웨이. 이 SPEC 이 말을 거는 상대편
- `.moai/specs/SPEC-CHANNEL-001/` — 채널 패키지 스캐폴드와 MCP 채널 서버 (실행 전제)
- `.moai/specs/SPEC-CHANWIRE-001/` — 채널 배선. 이 클라이언트의 소비자
- `.moai/specs/SPEC-CHANPERM-001/` — 채널 권한 릴레이
- 칸반 카드 `t4` (마일스톤 M4)
