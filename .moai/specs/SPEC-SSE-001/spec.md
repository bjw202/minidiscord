---
id: SPEC-SSE-001
title: "minidiscord SSE 허브 — 방별 실시간 이벤트 구독과 발행"
version: "0.2.0"
status: completed
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "sse, event-stream, realtime, pub-sub, room-subscription, subscriber-cleanup"
tier: M
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]
---

# SPEC-SSE-001 — SSE 허브 (방별 구독/발행 + 이벤트 스트림 엔드포인트)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 7 에서 도출 (칸반 카드 `t3`, 마일스톤 M3). 요구사항 11개·수용 기준 12개로 Tier M 상한(16/16) 안에 든다. 원본 Task 7 의 테스트 골격에서 발견한 결함 네 건은 `plan.md` §D 에 기록하고 의도적으로 이탈했다 — 소비하지 않는 `app.inject` 호출, `reply.hijack()` 누락, 아무것도 단언하지 않는 방 격리 검사, 구독자 수를 관측할 수단 부재. | manager-spec |
| 0.2.0 | 2026-08-27 | **plan-audit 교정 라운드.** `.moai/reports/t3-plan-audit-b.md` 가 이 SPEC 을 **CONDITIONAL PASS** 로 판정했다 — 수용 기준 12개 중 공허한 것 0건이나 필수 수정 1건(MF-4). REQ-SSE-010 과 AC-SSE-010 관측 1이 `server/src` 파일 목록을 절대 열거(일곱 파일)로 못 박아, 카드 `t3` 안에서 `SPEC-MENTION-001` 이 먼저 끝나 `mention.ts` 가 존재하면 **구현이 옳아도 실패**하는 기준이었다. 이 SPEC 이 통제하지 않는 산출물을 자기 요구사항으로 삼은 것이 원인이다. 절대 열거를 걷어내고 판정을 `spec_base_sha` 기준 상대 diff 로 옮겼다. 같은 교정 중 자체 훑기에서 **같은 부류의 결함 한 건을 추가로 찾아 함께 고쳤다** — `acceptance.md` 공통 골격의 `set-cookie` 처리가 `light-my-request` 의 실제 반환 형태와 어긋나 모든 스트림 기준이 `401` 로 실패할 상태였다(`plan.md` §D 6번). 요구사항 11개·수용 기준 12개로 개수는 그대로다. | manager-spec |

---

## 1. 배경과 목적

카드 `t3` (마일스톤 M3)는 `plan-v2.md` 의 Task 7·8·9·10 을 담는다. 이 SPEC 은 그 가운데 **Task 7 — SSE 허브** 하나만 맡는다.

SSE(Server-Sent Events)는 서버가 브라우저로 단방향 push 를 보내는 HTTP 기반 방식이다. minidiscord 에서 SSE 가 하는 일은 하나다 — **어떤 방에서 무슨 일이 일어났는지를 그 방을 보고 있는 브라우저에만 알린다.** `spec-v2.md` 4-A 의 "실시간 push(SSE): 브라우저에 새 메시지·봇 상태 변화 전달"이 그것이고, 4-C 는 웹 UI 가 "과거는 REST로, 접속 후는 SSE로" 메시지를 받는다고 못 박는다.

이 SPEC 이 끝나면 이런 상태가 된다.

```
브라우저  ──GET /api/rooms/:id/events──▶  서버 (열린 채로 유지)
서버 코드 ──hub.publish(roomId, 'message', {...})──▶  그 방 구독자에게만 프레임 전송
브라우저 연결 종료 ──▶ 구독자 집합에서 제거 (누수 없음)
```

**이 SPEC 이 만드는 것은 배관이지 배관을 쓰는 코드가 아니다.** 실제로 `publish` 를 호출하는 쪽은 전부 이 SPEC 밖에 있다.

| 호출자 | 이벤트명 | 어느 태스크 |
|--------|----------|------------|
| 봇 게이트웨이 (`gateway.ts`) | `bot_status`, `message` | Task 8 |
| 메시지 전송 라우트 (`routes-messages.ts`) | `message` | Task 9 |
| 권한 릴레이 브로커 (`permissions.ts`) | `message` (system 메시지) | Task 10 |

그래서 `SseHub` 의 `publish` / `subscribe` **시그니처는 이 SPEC 에서 확정되고, 뒤 세 태스크가 그것에 결합한다.** 나중에 바꾸면 세 파일이 함께 바뀐다. §4.1 의 REQ-SSE-001 이 그 시그니처를 문자 그대로 못 박는 이유다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 7, `spec-v2.md` 4-A(서버 모듈)·4-C(웹 UI)·7장(사람→봇 흐름).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| SSE | Server-Sent Events. `text/event-stream` 으로 열린 채 유지되는 HTTP 응답에 서버가 프레임을 계속 써 넣는 단방향 push 방식 |
| 허브(hub) | `createSseHub()` 가 만드는 객체 하나. 프로세스 전체에서 하나만 쓰며 `buildServer` 가 `app.hub` 로 들고 있다 |
| 구독자 | `subscribe` 로 등록된 열린 `ServerResponse` 하나. 브라우저 탭 하나가 구독자 하나다 |
| 구독자 집합 | 방 하나에 딸린 `Set<ServerResponse>`. 허브 내부의 `Map<number, Set<ServerResponse>>` 한 항목 |
| 프레임 | 구독자에게 실제로 써지는 바이트. `event: <이름>\ndata: <JSON>\n\n` 형식 |
| 연결 확인 주석 | 구독 직후 한 번 보내는 `: connected\n\n`. SSE 주석 줄(`:` 로 시작)이라 브라우저 이벤트로 잡히지 않고, 연결이 실제로 열렸다는 신호로만 쓴다 |
| 하이재킹 | `reply.hijack()`. Fastify 에게 "이 응답은 내가 직접 소켓에 쓸 테니 네가 응답을 보내지 마라"고 알리는 것 |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 은 데이터베이스도 스키마도 건드리지 않는다. 다음을 그대로 소비한다.

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `SPEC-CORE-001` | `buildServer()`, `config.port`, `server/src/index.ts` 의 `declare module 'fastify'` 블록 |
| `SPEC-AUTH-001` | `requireAuth` preHandler, `md_session` 세션 쿠키, `registerAuthRoutes` |
| `SPEC-ROOM-001` | `POST /api/rooms` (테스트에서 방을 만들 때만 쓴다). 방 목록·보관 라우트는 쓰지 않는다 |

`SPEC-BOT-001` 은 **의존이 아니다.** 이 SPEC 은 봇 토큰도 초대도 읽지 않는다.

---

## 4. 요구사항 (GEARS)

### 4.1 허브 계약 (다음 태스크가 결합하는 표면)

**REQ-SSE-001** (Ubiquitous)
`server/src/sse.ts` 는 `SseHub` 인터페이스와 `createSseHub(): SseHub` 팩토리를 내보내야 한다. `publish` 와 `subscribe` 의 시그니처는 아래와 **문자 그대로** 같아야 한다 — Task 8·9·10 이 이 두 메서드에 결합한다.

```ts
import type { ServerResponse } from 'node:http'

export interface SseHub {
  subscribe(roomId: number, res: ServerResponse): void
  publish(roomId: number, event: string, data: unknown): void
  subscriberCount(roomId: number): number
}

export function createSseHub(): SseHub
```

`subscriberCount(roomId: number): number` 는 원본 `plan-v2.md` Task 7 의 인터페이스에 없는 **추가**다. 구독자 누수를 관측할 다른 경로가 없어서 넣었고(`plan.md` §D 3번), 기존 두 메서드는 한 글자도 바뀌지 않으므로 뒤 세 태스크에는 영향이 없다. 이 메서드는 관측 표면일 뿐이며 어떤 프로덕션 경로도 호출하지 않는다.

허브는 프로세스당 하나다. `buildServer` 가 `createSseHub()` 를 한 번 부르고 `app.decorate('hub', hub)` 로 붙인다.

### 4.2 구독

**REQ-SSE-002** (When — 이벤트 구동)
`subscribe(roomId, res)` 가 호출되면, 허브는 순서대로 다음을 해야 한다.

1. 상태 코드 `200` 과 헤더 세 개를 쓴다 — `content-type: text/event-stream`, `cache-control: no-cache`, `connection: keep-alive`.
2. 연결 확인 주석 `: connected\n\n` 을 한 번 쓴다.
3. `res` 를 그 `roomId` 의 구독자 집합에 넣는다. 집합이 없으면 만든다.
4. `res` 의 `close` 이벤트에 정리 핸들러를 건다 (REQ-SSE-005).

**REQ-SSE-003** (When — 이벤트 구동)
`GET /api/rooms/:id/events` 가 호출되면, 서버는 `requireAuth` preHandler 를 통과시킨 뒤 `reply.hijack()` 을 호출하고 `app.hub.subscribe(Number(req.params.id), reply.raw)` 를 실행해야 한다. 이 라우트는 `server/src/index.ts` 의 `buildServer` 안에서 등록된다.

`reply.hijack()` 은 원본 `plan-v2.md` Task 7 에 없다. Fastify 는 핸들러가 끝나면 자기 응답을 보내려 하는데, 그때는 이미 `reply.raw` 로 헤더와 본문이 나간 뒤다. 하이재킹은 그 소유권을 넘기는 문서화된 방법이다 (`plan.md` §D 2번).

**REQ-SSE-004** (Unwanted — shall not)
인증되지 않은 요청은 이벤트 스트림을 열어서는 안 된다. 세션 쿠키 없이 `GET /api/rooms/:id/events` 를 부르면 `401` 로 끝나야 하고, `text/event-stream` 응답이 시작되어서는 안 된다.

### 4.3 발행

**REQ-SSE-005** (When — 이벤트 구동)
`publish(roomId, event, data)` 가 호출되면, 허브는 정확히 `event: ${event}\ndata: ${JSON.stringify(data)}\n\n` 문자열을 만들어 **그 `roomId` 의 구독자 집합에 든 모든 응답에** 써야 한다. 한 방에 구독자가 여럿이면 전원이 같은 프레임을 받는다.

프레임 형식은 브라우저 `EventSource` 가 파싱하는 계약이다. 끝의 빈 줄(`\n\n`) 이 없으면 브라우저는 이벤트를 방출하지 않는다. Task 11 의 웹 UI 가 이 형식에 결합한다.

**REQ-SSE-006** (Unwanted — shall not)
`publish` 는 다른 방의 구독자에게 프레임을 보내서는 안 된다. 방 `A` 로 발행한 이벤트가 방 `B` 의 구독자에게 도달하면 안 된다.

이것이 이 SPEC 에서 가장 조용히 깨지기 쉬운 성질이다. 전역 브로드캐스트 구현은 "이벤트가 도착한다"만 보는 검사를 전부 통과한다. AC-SSE-003 이 도착 순서로 이 성질을 관측하는 이유다.

**REQ-SSE-007** (Where — 구독자 없는 방)
구독자가 하나도 없는 방으로 `publish` 가 호출되면, 허브는 아무것도 하지 않고 조용히 반환해야 한다. 예외를 던지지 않고, 그 방의 구독자 집합을 새로 만들지도 않는다.

### 4.4 구독 해제와 누수 방지

**REQ-SSE-008** (When — 연결 종료 감지)
구독자의 응답에서 `close` 이벤트가 감지되면, 허브는 그 응답을 방의 구독자 집합에서 제거해야 한다. 제거 후 집합이 비면 `Map` 에서 그 방 항목 자체를 지운다.

관측 가능한 결과로 진술한다 — 구독 직후 `subscriberCount(roomId)` 는 `1` 이고, 그 연결이 끊긴 뒤에는 `0` 이다. 두 값이 모두 관측되어야 이 요구사항이 만족된다. 끊긴 뒤의 `0` 하나만 보는 검사는 `subscribe` 가 아무것도 하지 않는 구현에서도 성립하므로 무효다.

### 4.5 범위 경계 (금지)

**REQ-SSE-009** (Unwanted — shall not)
이 SPEC 의 구현은 하트비트(keep-alive) 타이머를 만들어서는 안 되며, SSE 재접속 필드(`id:`, `retry:`)를 프레임에 넣어서도 안 된다.

`plan-v2.md` 도 `spec-v2.md` 도 하트비트를 규정하지 않는다. 서버와 브라우저가 같은 PC 에서 돌고 사이에 유휴 연결을 끊을 프록시가 없다는 것이 근거다. 연결 확인 주석 `: connected` 는 하트비트가 아니라 **한 번만** 보내는 연결 개시 신호다. 하트비트가 필요해 보이면 임의로 넣지 말고 중단하고 보고한다.

**REQ-SSE-010** (Unwanted — shall not)
이 SPEC 의 구현은 봇 게이트웨이·메시지 라우트·멘션 파서·권한 릴레이를 만들어서는 안 된다. **이 SPEC 이 만드는 새 소스 파일은 `sse.ts` 하나이고, 고치는 기존 소스 파일은 `index.ts` 하나다.** 구현 후 `server/src` 에 `sse.ts` 가 존재해야 한다.

**이 요구사항은 `server/src` 의 파일 목록을 절대 열거로 못 박지 않는다.** 카드 `t3` 는 형제 SPEC 넷(`SPEC-MENTION-001`·`SPEC-GATEWAY-001`·`SPEC-MSG-001`·`SPEC-PERM-001`)을 함께 담고, 그중 `SPEC-MENTION-001` 은 자신을 카드의 첫 번째로 못 박는다. 즉 이 SPEC 이 실행될 때 `mention.ts` 가 이미 있을 공산이 크다. 이 SPEC 이 통제하지 않는 산출물의 존재 여부를 자기 요구사항으로 삼으면, **구현이 완전히 옳아도 카드 안 실행 순서에 따라 위반으로 판정된다.**

그래서 "이 SPEC 이 만들지 않았다"는 판정은 절대 목록이 아니라 **`spec_base_sha` 기준 상대 diff** 가 진다 — 진입 시점 이후 `server/src` 에서 변경된 파일이 정확히 `index.ts` 와 `sse.ts` 두 개여야 한다(AC-SSE-010 관측 4). 상대 비교이므로 형제 SPEC 이 언제 실행되든 영향받지 않으면서, 이 SPEC 이 `gateway.ts` 나 `routes-messages.ts` 를 미리 만드는 것은 그대로 잡는다.

**REQ-SSE-011** (Unwanted — shall not)
이 SPEC 의 구현은 `server/src/db.ts` 의 `SCHEMA` 상수를 변경해서는 안 된다. SSE 는 순수 메모리 구조이며 어떤 테이블도 읽거나 쓰지 않는다. 스키마 변경이 필요해 보이면 진행을 멈추고 보고한다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자를 명시한다.

### Out of Scope — 인증과 방 관리 (SPEC-AUTH-001 / SPEC-ROOM-001)

- 회원가입·로그인·세션 쿠키·`requireAuth` 자체의 구현. 이 SPEC 은 `requireAuth` 를 이벤트 라우트에 붙여 쓰기만 한다
- 방 생성·목록·보관 라우트
- **방 존재 여부 검증** — 이 SPEC 의 이벤트 라우트는 `:id` 가 실재하는 방인지 확인하지 않는다. 존재하지 않는 방 번호로도 스트림이 열린다. 방별 접근 권한이 `spec-v2.md` 2장에서 YAGNI 로 배제됐고 선행 SPEC 들도 소유자 개념을 두지 않았으므로, 여기서 새 검증 계층을 만들지 않는다. 수용된 설계이며 `plan.md` §E 에 위험으로 기록돼 있다

### Out of Scope — 봇 게이트웨이 (같은 카드 `t3`, Task 8)

- `server/src/gateway.ts` — WebSocket 서버, `hello { token }` 인증, `missed_after_id` 커서 재전송
- `bot_status` 이벤트를 **발행하는** 코드. 이 SPEC 은 그 이벤트를 실어 나를 배관만 만든다
- 봇 온라인/오프라인 판정

### Out of Scope — 메시지 계층 (같은 카드 `t3`, Task 9)

- `server/src/routes-messages.ts` — 메시지 전송(multipart)/목록/다운로드
- `server/src/mention.ts` — `@TO`/`@CC` 파서
- `message` 이벤트를 **발행하는** 코드와 그 페이로드 모양. 이 SPEC 은 `data` 를 `unknown` 으로 받아 `JSON.stringify` 할 뿐 안을 들여다보지 않는다

### Out of Scope — 권한 릴레이 (같은 카드 `t3`, Task 10)

- `server/src/permissions.ts` — 승인 요청 상태 관리와 system 메시지 발행

### Out of Scope — 웹 UI (카드 `t5`)

- `web/index.html`, `web/app.js`, `web/style.css`
- 브라우저 쪽 `EventSource` 연결, 재접속 처리, 이벤트 렌더링. 이 SPEC 은 그것이 파싱할 **서버 쪽 프레임 형식**만 확정한다

### Out of Scope — SSE 운영 심화

- 하트비트(keep-alive) 타이머 — REQ-SSE-009 가 금지한다
- SSE 재접속 프로토콜(`id:` 필드, `Last-Event-ID` 헤더, `retry:` 지시자). 봇 쪽 재전송은 게이트웨이의 `missed_after_id` 커서가 맡고(Task 8), 브라우저 쪽 과거 메시지는 REST 로 받는다(`spec-v2.md` 4-C)
- 구독자 수 상한, 방당 연결 제한, 백프레셔 처리. 단일 사용자·소수 그룹 전제다
- 서버 재시작 시 구독 복원. 허브는 메모리 구조이므로 재시작하면 전부 사라지고 브라우저가 다시 연결한다

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 `SPEC-CORE-001` 이 설치한 것을 그대로 쓴다: `fastify ^5`, `@fastify/cookie`, `vitest`. **이 SPEC 은 새 의존성을 추가하지 않는다** — SSE 는 Node 표준 `http.ServerResponse` 만으로 구현된다.
- 허브는 순수 메모리 구조다. `better-sqlite3` 도 `node:fs` 도 import 하지 않는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- **SSE 테스트는 `app.inject` 로 검증할 수 없다.** `inject` 는 응답이 끝나기를 기다리는데 이벤트 스트림은 끝나지 않는다. 스트림 검증은 `app.listen({ port: 0 })` 으로 실제 서버를 띄우고 `fetch` + `res.body.getReader()` 로 한다. `inject` 는 `401` 검증처럼 응답이 즉시 끝나는 경우에만 쓴다.
- 모든 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고, 열었던 서버와 리더를 `afterEach` 에서 반드시 닫는다. 닫지 않은 서버는 vitest 프로세스를 종료시키지 않는다.
- UI 문구(오류 메시지 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어지며, 구현 본문이 비어 있을 때 통과하는 기준은 두지 않는다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 7 (원본, 읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-A 서버 모듈, 4-C 웹 UI, 7장 사람→봇 흐름
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `config`)
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (인증·세션 쿠키·`requireAuth`)
- `.moai/specs/SPEC-ROOM-001/` — 선행 SPEC (방 API)
- 칸반 카드 `t3` (마일스톤 M3)
