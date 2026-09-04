---
id: SPEC-PERM-001
title: "minidiscord 권한 릴레이 — 봇의 도구 승인 요청을 사람에게 중계하고 판정을 되돌린다"
version: "0.3.0"
status: completed
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "permission-relay, tool-approval, verdict, system-message, message-interception, gateway-bridge"
tier: M
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-SSE-001, SPEC-GATEWAY-001]
---

# SPEC-PERM-001 — 권한 릴레이 (서버 쪽)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.3.0 | 2026-08-27 | **재감사 교정 라운드 (하네스 한정).** `.moai/reports/t3-plan-reaudit.md` 가 v0.2.0 의 네 수정(MF-1·2·3·5)을 **RESOLVED** 로 확인하고 차단급 회귀 한 건(R-1)을 새로 지적했다 — 하네스의 `build()` 가 `set-cookie` 를 배열로 가정해(`headers['set-cookie']![0]`) 실제로는 문자열의 첫 글자 `"m"` 을 쿠키로 보내고 있었고, 그 아래에서 기준 열 개가 구현이 완벽해도 `401` 로 실패했다. 형제 SPEC 세 곳이 쓰는 `setCookieOf` 헬퍼로 교정했고, 같은 부류(스칼라를 배열로 인덱싱)를 하네스 전체에서 기계적으로 훑어 다른 자리가 없음을 확인했다. **요구사항·수용 기준은 이번에도 개수·내용 모두 그대로다**(REQ-PERM-001..014, AC-PERM-001..014). 바뀐 것은 하네스 한 줄과 헬퍼 하나이며, 내역은 `progress.md` §G.2 에 있다. | manager-spec |
| 0.2.0 | 2026-08-27 | **plan-audit 교정 라운드.** `.moai/reports/t3-plan-audit-b.md` 가 이 SPEC 을 **CONDITIONAL PASS** 로 판정하고 필수 수정 4건(MF-1·2·3·5)을 지적했다 — 유예 4건·의도적 이탈 1건·원본 차단급 결함 주장은 모두 옳다고 확인됐고, 지적은 전부 기술적인 것이다. 넷 다 `acceptance.md` 와 `plan.md` 에서 닫았고, 있으면 좋은 것 2건(NH-3·NH-4)도 함께 반영했다. **요구사항은 하나도 바뀌지 않았다** — REQ-PERM-001..014 그대로이고, 수용 기준도 14개 그대로다. 바뀐 것은 두 기준(AC-PERM-003·010)이 **무엇을 보고 판정하는가**와 공통 테스트 하네스의 배선(`reply.hijack()` 추가, `cleanups` 일괄 정리, `readFrame`/`openStream` 헬퍼)이다. 자세한 내역은 `progress.md` §Audit Response 에 있다. | manager-spec |
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 10 과 `spec-v2.md` 7장(권한 릴레이)·9장(보안)에서 도출 (칸반 카드 `t3`, 마일스톤 M3). 요구사항 14개·수용 기준 14개로 Tier M 상한(16/16) 안이다. 작성 지시서가 요구한 네 항목(전용 승인/거절 HTTP 엔드포인트, 방 멤버십 검사, 미응답 타임아웃, 봇 연결 해제 시 대기 정리)은 원본 두 문서 어디에도 없어 §5 범위 밖에 소유자와 함께 기록했고, 리드에 보고했다. | manager-spec |

---

## 1. 배경과 목적

봇은 Claude Code 세션이다. 세션이 `Bash` 같은 승인 필요 도구를 호출하면 Claude Code 가 채널에 `permission_request` 알림을 보낸다. 그런데 그 세션의 터미널을 사람이 보고 있지 않다 — 사람은 웹 UI 의 방을 보고 있다. 승인 대화상자가 아무도 보지 않는 터미널에 떠 있는 동안 세션은 멈춰 선다.

이 SPEC 은 그 대화상자를 방으로 옮긴다. 승인 요청이 방에 system 메시지로 뜨고, 사람이 그 방에 `yes <ID>` 또는 `no <ID>` 라고 답하면 그 판정이 역경로로 세션에 되돌아간다.

```
봇 세션 → 채널 → 게이트웨이 permission_request
      → 브로커: 대기 등록 + 방에 system 메시지 + SSE 발행
      → 사람이 방에 "yes abcde" 입력
      → 브로커가 그 메시지를 가로채 소비(일반 메시지로 저장하지 않음)
      → Gateway.sendToBot → 채널 → Claude Code 에 permission_verdict 적용
```

> 2026-09-04 개정 — 위 흐름도의 «→ Gateway.sendToBot» 은 «→ Gateway.sendToOrigin(connId, …)» 이다 — `SPEC-PERMROUTE-001` 이 판정 통로를 «요청한 접속 하나» 로 옮겼다 (REQ-PERMROUTE-004·006). 원문은 지우지 않는다.

`spec-v2.md` 9장이 이 기능의 안전성 근거를 이미 정해 두었다 — "권한 릴레이는 게이트웨이 토큰 인증 위에서만 동작하므로 안전하게 켠다". 요청은 인증된 게이트웨이 연결에서만 들어오고, 판정은 로그인한 사람의 메시지에서만 나간다.

이 SPEC 이 끝나면 사람이 터미널을 보지 않고도 봇의 도구 사용을 승인하거나 거절할 수 있다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 10, `spec-v2.md` 7장(권한 릴레이 흐름)·9장(보안).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 승인 요청 | 봇이 게이트웨이로 보낸 `permission_request` 메시지 하나. `{ request_id, tool_name, description, input_preview }` |
| `request_id` | 승인 요청 하나를 가리키는 5글자 식별자. 공식 문서 형식은 `l` 을 뺀 소문자 알파벳 5자다 |
| 대기 레지스트리 | 아직 판정이 나지 않은 `request_id` 를 그 요청이 온 (방, 봇) 에 연결해 두는 프로세스 메모리 맵 |
| 판정 / verdict | 게이트웨이로 되돌려 보내는 `{ type: 'permission_verdict', request_id, behavior }`. `behavior` 는 `'allow'` 또는 `'deny'` |
| 소비 | 사용자가 보낸 메시지가 판정으로 해석되어 **일반 대화 메시지로 저장되지 않는** 것 |
| 흘려보내기 | 판정 형식이 아니거나 모르는 `request_id` 라 소비하지 않고 평범한 대화 메시지로 처리하는 것 |
| system 메시지 | `messages.author_type='system'` 인 행. 작성자가 사람도 봇도 아닌 서버다 |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 은 새 테이블도 새 프로토콜 메시지 타입도 만들지 않는다. 다음을 그대로 소비한다.

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `SPEC-CORE-001` | `buildServer`, `openDb`, `messages` 테이블(`author_type` 에 `'system'` 이 이미 허용돼 있다) |
| `SPEC-AUTH-001` | `requireAuth` preHandler, `md_session` 세션 쿠키, `req.user` |
| `SPEC-SSE-001` | `SseHub.publish(roomId, event, data)` — 방 구독자에게 발행 |
| `SPEC-GATEWAY-001` | `Gateway.setPermissionHandler`, `Gateway.sendToBot`, `ConnInfo` 타입 |
| 카드 `t3` 의 메시지 SPEC | `POST /api/rooms/:id/messages` 라우트 — 이 SPEC 은 그 핸들러 **안에** 가로채기 한 줄을 넣는다 |

> 2026-09-04 개정 — 위 표의 `SPEC-GATEWAY-001` 행: 이 SPEC 이 받아 쓰는 판정 통로는 `Gateway.sendToBot` 이 아니라 `Gateway.sendToOrigin` 이고, `ConnInfo` 에는 `connId?` 가 더해졌다 (`SPEC-PERMROUTE-001` REQ-PERMROUTE-003·004·006).

게이트웨이 쪽 계약은 이미 확정돼 있고 이 SPEC 은 그것을 소비만 한다. 축약 없이 그대로 옮긴다.

```ts
export interface ConnInfo { roomId: number; botId: number }

// Gateway (SPEC-GATEWAY-001 소유)
sendToBot(roomId: number, botId: number, payload: object): boolean
setPermissionHandler(fn: ((info: ConnInfo, params: any) => void) | null): void
```

`setPermissionHandler` 의 `params` 가 `any` 인 것은 게이트웨이 쪽 계약 그대로다. 이 SPEC 은 그것을 좁혀 받는다 — §4.1 REQ-PERM-004 참조.

> **개정 (2026-09-04, `SPEC-PERMROUTE-001`).** 위 «축약 없이» 블록의 세 자리가 모두 개정됐다 — `ConnInfo` 에 `connId?: string` 선택 필드가 더해지고(REQ-PERMROUTE-003), `Gateway` 에 `sendToOrigin(connId: string, payload: object): boolean` 이 더해져 판정 통로가 `sendToBot` 에서 옮겨 가며(REQ-PERMROUTE-004·006), 핸들러가 받는 `info` 는 요청 접속의 `connId` 를 싣는다(REQ-PERMROUTE-002). 원문은 지우지 않는다.

---

## 4. 요구사항 (GEARS)

### 4.1 요청 도착 — 방에 띄우기

**REQ-PERM-001** (When — 이벤트 구동)
게이트웨이에서 `permission_request` 가 도착하면, 브로커는 그 `request_id` 를 요청이 온 `ConnInfo`(방·봇)에 연결해 대기 레지스트리에 등록하고, 그 방에 `author_type='system'` 메시지 한 행을 저장하고, 같은 방에 SSE `message` 이벤트를 발행해야 한다. 세 가지가 모두 일어나야 한다.

**REQ-PERM-002** (Ubiquitous)
그 system 메시지 본문은 네 줄로 이루어지며, 도구 이름·`description`·`input_preview`·판정 안내를 이 순서로 담아야 한다. 판정 안내 줄은 `yes <request_id>` 와 `no <request_id>` 두 형태를 **그 요청의 실제 `request_id` 와 함께** 문자열로 보여 주어야 한다. 사람이 그 줄을 읽고 그대로 옮겨 적을 수 있어야 하기 때문이다.

**REQ-PERM-003** (Ubiquitous)
대기 레지스트리는 프로세스 메모리 안의 맵이며, 디스크에 저장되지 않는다. 서버가 재시작하면 대기 항목은 사라진다. 이것은 결함이 아니라 수용된 설계다 — 세션 쪽 승인 대화상자는 그대로 살아 있어 사람이 터미널에서 직접 승인할 수 있고, 공식 릴레이 설계도 같은 성질을 갖는다.

**REQ-PERM-004** (Where — 배선 조건)
`Gateway.setPermissionHandler` 가 존재하는 서버 조립 경로에서, `server/src/index.ts` 는 브로커를 만들어 `app` 에 데코레이터로 붙이고 그 핸들러를 게이트웨이에 등록해야 한다. 브로커가 노출하는 계약은 다음과 같다.

```ts
export interface PermissionBroker {
  onGatewayRequest(info: ConnInfo, params: { request_id: string; tool_name: string; description: string; input_preview: string }): void
  tryHandleUserReply(roomId: number, text: string): boolean
}

export function createPermissionBroker(app: FastifyInstance): PermissionBroker
```

`tryHandleUserReply` 의 반환값 `true` 는 "이 메시지는 판정으로 소비됐다"는 뜻이다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** **위 인터페이스의 `tryHandleUserReply` 시그니처는 개정됐다.** `SPEC-ROOMAUTHZ-001` REQ-ROOMAUTHZ-012 가 누른 사람을 인자로 더한다.
>
> ```ts
> tryHandleUserReply(roomId: number, userId: number, text: string): boolean
> ```
>
> 브로커는 정규식 판정과 방 대조 사이에서 멤버십을 확인하고, 멤버가 아니면 `false` 를 돌려주며 대기 항목을 소모하지 않는다. 나머지 계약(반환값 `true` 의 뜻, `createPermissionBroker` 시그니처, 데코레이터 이름 `permissions`)은 그대로다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

> **개정 (2026-09-04, `SPEC-PERMROUTE-001`) — 두 번째 개정.** 위 인터페이스의 `onGatewayRequest` 가 받는 `ConnInfo` 의 모양이 다시 개정됐다 — `connId?: string` 선택 필드가 더해진다(REQ-PERMROUTE-003·006). 브로커는 대기 항목에 `connId` 를 함께 보관하고, 판정을 `sendToOrigin(info.connId, …)` 으로 «판정을 요청한 접속 하나» 에게만 되돌린다. `connId` 를 담지 않은 대기 항목의 판정은 어느 소켓에도 가지 않고 REQ-PERMROUTE-007 의 (ㄴ) 실패 문구로 끝난다. 원문과 첫 개정은 지우지 않는다.

데코레이터 이름은 `permissions` 이며, `declare module 'fastify'` 에 `permissions: PermissionBroker` 를 더한다. **데코레이션이 빠지면 가로채기가 통째로 무력화된다** — 라우트 쪽 호출이 옵셔널 체이닝이라 조용히 `undefined` 가 되어 모든 판정이 평범한 대화 메시지로 저장되고, 어떤 오류도 나지 않는다. 이 조건을 요구사항으로 못 박는 이유다(원본 모순 1번, `plan.md` §D).

### 4.2 판정 해석과 소비

**REQ-PERM-005** (When — 이벤트 구동)
`POST /api/rooms/:id/messages` 가 처리되는 동안, 방이 활성인지 확인한 직후이자 멘션을 파싱하기 전에, 서버는 본문 텍스트를 브로커에 넘겨 판정인지 물어야 한다. 브로커가 `true` 를 돌려주면 서버는 `{ ok: true, consumed_by: 'permission' }` 을 응답하고 **그 메시지를 `messages` 테이블에 사용자 메시지로 저장하지 않아야 한다**.

판정 형식은 `PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i` 다. 공식 문서 형식 그대로이며, 대소문자를 가리지 않고 `l` 은 식별자 문자에서 제외된다.

**REQ-PERM-006** (When — 승인)
소비된 메시지의 판정어가 `y` 또는 `yes` 이면, 서버는 그 `request_id` 를 등록한 (방, 봇) 에게만 `{ type: 'permission_verdict', request_id, behavior: 'allow' }` 를 `Gateway.sendToBot` 으로 보내야 한다. `request_id` 는 소문자로 정규화해서 보낸다.

**REQ-PERM-007** (When — 거절)
소비된 메시지의 판정어가 `n` 또는 `no` 이면, 서버는 같은 경로로 `behavior: 'deny'` 를 보내야 한다. 거절은 승인과 **다른 값**이 봇에 도달해야 성립한다 — 판정어와 무관하게 `'allow'` 를 보내는 구현은 이 요구사항을 만족하지 않는다.

> **개정 (2026-09-04, `SPEC-PERMROUTE-001`).** REQ-PERM-006·007 의 두 겹이 개정됐다. (1) 통로 — 판정은 `Gateway.sendToBot` 이 아니라 `Gateway.sendToOrigin(info.connId, …)` 으로 간다. **판정 경로에서 `Gateway.sendToBot` 을 호출해서는 안 된다**(REQ-PERMROUTE-006). (2) 주소 단위 — «등록한 (방, 봇) 에게만» 이 아니라 **«판정을 요청한 접속 하나» 에게만** 간다: 같은 (방, 봇) 의 다른 소켓은 받지 않고, 접속을 찾지 못했을 때 다른 소켓으로 «대신 보내지도 않는다»(REQ-PERMROUTE-005·008). 원문은 지우지 않는다.

**REQ-PERM-008** (When — 1회용)
판정이 전송되면 그 `request_id` 는 대기 레지스트리에서 제거되어야 한다. 같은 `request_id` 에 대한 두 번째 답은 소비되지 않고 평범한 대화 메시지로 흘러가야 하며, 봇에게 두 번째 판정이 가서는 안 된다.

**REQ-PERM-009** (Ubiquitous)
판정이 전송된 뒤, 서버는 그 결과를 알리는 system 메시지 한 행을 같은 방에 저장하고 SSE 로 발행해야 한다. 그 본문은 승인과 거절을 서로 다른 문구로 구분해야 하고, `request_id` 를 포함해야 한다.

`Gateway.sendToBot` 이 `false` 를 돌려준 경우(그 방·봇의 연결이 없는 경우) 그 본문은 **판정이 전달되지 않았음**을 사람이 읽을 수 있는 문구로 밝혀야 한다. 전달된 경우와 같은 문구를 써서는 안 된다. 원본 구현은 반환값을 버렸는데, 그러면 봇이 죽어 있는 동안 누른 승인이 화면상 성공으로 보이면서 세션은 계속 멈춰 있는다 — 의도적 확장이며 근거는 `plan.md` §D 3번에 있다.

> **개정 (2026-09-04, `SPEC-PERMROUTE-001`).** 실패 갈래의 이름과 뜻이 개정됐다 — 갈래는 `Gateway.sendToOrigin` 이 `false`(그 `connId` 를 가진 살아 있는 접속이 없는 경우)와 대기 항목의 `connId` 부재(소켓 없이 만들어진 요청)의 **둘**이고, 문구도 둘로 갈린다 — «요청한 세션이 끊겨 …» 와 «요청한 세션의 신원이 기록되지 않아 …». 두 문구 모두 꼬리 «전달하지 못했습니다 (`<request_id>`)» 를 유지하며, 옛 문구 «봇이 접속해 있지 않아 …» 는 소멸했다(REQ-PERMROUTE-007). 원문은 지우지 않는다.

### 4.3 흘려보내기와 격리 (금지 조항)

**REQ-PERM-010** (Unwanted — shall not)
판정 형식에 맞지 않는 텍스트, 그리고 형식에는 맞으나 대기 레지스트리에 없는 `request_id` 는 소비되어서는 안 된다. 두 경우 모두 평범한 대화 메시지로 저장되고 `{ ok: true }` 계열 응답이 나가야 한다.

**REQ-PERM-011** (Unwanted — shall not)
어떤 방에서 온 답도 **다른 방**에 등록된 승인 요청을 소비하거나 그 판정을 전송해서는 안 된다. 브로커는 대기 항목의 `roomId` 와 답이 들어온 `roomId` 가 같을 때만 소비한다. 다르면 소비하지 않고, 그 대기 항목은 레지스트리에 그대로 남아 원래 방에서 여전히 판정할 수 있어야 한다.

**REQ-PERM-012** (Unwanted — shall not)
로그인하지 않은 요청은 판정을 소비해서도, 전송해서도 안 된다. 가로채기는 `requireAuth` preHandler 를 통과한 **뒤에** 놓여야 하며, 미인증 요청은 `401` 로 끝나고 대기 항목은 손상되지 않은 채 남아야 한다.

이 시스템에는 방별 멤버십 개념이 없다 — `rooms` 에 소유자 컬럼이 없고 멤버 테이블도 없으며, 방별 접근 권한은 `spec-v2.md` 2장이 YAGNI 로 명시 배제했다. 따라서 이 요구사항이 거는 경계는 "로그인했는가" 하나이고, 방 단위 격리는 REQ-PERM-011 의 방 대조가 담당한다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 문단은 더 이상 참이 아니다. `SPEC-ROOMAUTHZ-001` 이 `room_members` 표와 `rooms.created_by` 를 만들었으므로 **이 요구사항이 거는 경계는 둘이 됐다** — 로그인 여부(REQ-PERM-012)와 방 멤버십(REQ-ROOMAUTHZ-012). 방 단위 격리는 여전히 REQ-PERM-011 의 방 대조가 담당한다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

### 4.4 범위 경계

**REQ-PERM-013** (Unwanted — shall not)
이 SPEC 의 구현은 전용 승인/거절 HTTP 엔드포인트를 만들어서는 안 되고, 새 SSE 이벤트 타입을 도입해서도 안 되며, 새 WebSocket 메시지 타입을 정의해서도 안 된다. 판정은 기존 메시지 POST 를 통해서만 들어오고, UI 에는 기존 `message` 이벤트로만 전달된다.

이 SPEC 이 손대는 소스 파일은 정확히 셋이다 — 새로 만드는 `server/src/permissions.ts`, 가로채기 한 갈래를 더하는 `server/src/routes-messages.ts`, 배선 세 줄을 더하는 `server/src/index.ts`.

**REQ-PERM-014** (Unwanted — shall not)
이 SPEC 의 구현은 `server/src/db.ts` 의 `SCHEMA` 상수를 변경해서는 안 된다. 대기 레지스트리를 테이블로 만들고 싶어지더라도 마찬가지다 — REQ-PERM-003 이 메모리 보관을 확정했다. 스키마 변경이 필요해 보이면 진행을 멈추고 보고한다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자 또는 배제 근거를 명시한다.

### Out of Scope — 원본 두 문서에 존재하지 않는 네 기능 (설계 결정 필요, 리드 판정 대기)

작성 지시서가 요구했으나 `plan-v2.md` Task 10 과 `spec-v2.md` 7·9장 어디에도 근거가 없는 항목이다. Global Constraints 가 "계약 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다"고 지시하므로 만들지 않고 여기 기록한다.

- **전용 승인/거절 HTTP 엔드포인트** (`POST /api/rooms/:id/permissions/:requestId` 류). 원본 설계에서 판정은 사람이 방에 치는 평범한 채팅 메시지이고, 그 문자열을 `POST /api/rooms/:id/messages` 가 가로챈다. 두 번째 경로를 만들면 대기 레지스트리에 두 개의 진입점이 생기고, "판정은 그 방의 대화에 남는다"는 성질이 깨진다. 웹 UI 의 승인 버튼도 원본에서는 입력창에 `yes <ID>` 를 채워 넣는 방식이다(`plan-v2.md` 카드 `t5` 의 `app.js`).
- **방 멤버십 검사**. 이 시스템에는 멤버십 모델 자체가 없다 — 스키마에 소유자·멤버 컬럼이 없고, `spec-v2.md` 2장이 방별 접근 권한을 YAGNI 로 배제했다. 이 SPEC 이 거는 경계는 REQ-PERM-012 의 로그인 검사와 REQ-PERM-011 의 방 대조 두 가지다.

  > **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 항목은 **더 이상 범위 밖이 아니다.** "검사할 대상이 없다"는 근거가 사라졌다 — `SPEC-ROOMAUTHZ-001` 이 스키마에 멤버 표를 만들고 메시지 POST·GET, SSE 구독, 판정 수용 네 곳에 게이트를 걸었다. 발단은 `.moai/reports/t4/sync-audit.md` §F-14 이며, 리드 판정은 그 카드(`t11`)에서 났다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

  > **2차 개정 (2026-08-29, `SPEC-ROOMAUTHZ-001` / 카드 `t11` — D2 v2).** 위 1차 주석의 열거 «네 곳»이 더 이상 완전하지 않다. 운영자가 D2 를 확대해 봇 초대 라우트 셋이 더해졌고, 게이트는 **여덟 곳**이다 — 메시지 `POST`·`GET /api/rooms/:id/messages`, SSE 구독(`GET /api/rooms/:id/events`), 방 목록(`GET /api/rooms`), 판정 수용, 그리고 `POST`·`GET /api/rooms/:id/invites` 와 `DELETE /api/rooms/:id/invites/:botId`(REQ-ROOMAUTHZ-017). 1차 주석은 지우지 않는다 — 결정의 역사가 읽혀야 한다.
- **미응답 타임아웃**. 원본에는 타이머가 없다. 아무도 답하지 않으면 대기 항목은 서버가 재시작할 때까지 남고, 세션 쪽 대화상자도 그대로 열려 있어 터미널에서 직접 승인할 수 있다. 타임아웃을 넣으려면 "만료된 요청에 어떤 `behavior` 를 보낼 것인가"를 채널 계약 차원에서 정해야 하는데, 그것은 Global Constraints 가 금지한 계약 변경이다.
- **봇 연결 해제 시 대기 항목 정리**. 원본 게이트웨이의 `ws.on('close')` 는 연결 목록에서만 지우고 대기 레지스트리는 건드리지 않는다. 이 SPEC 은 그 상태에서 **관측 가능한 결과**만 확정한다 — 판정 전송이 실패하고, 그 사실이 system 메시지에 드러난다(REQ-PERM-009). 봇이 재접속했을 때 놓친 승인 요청을 재전송하는 복구 흐름은 만들지 않는다.

### Out of Scope — 게이트웨이 (`SPEC-GATEWAY-001`)

- `server/src/gateway.ts` 전체 — WebSocket 서버, `hello { token }` 토큰 인증, 연결 목록 관리, `missed_after_id` 커서 재전송
- `permission_request` 를 WebSocket 에서 받아 핸들러로 넘기는 분기 자체. 이 SPEC 은 그 핸들러를 **등록**할 뿐이다
- `sendToBot` 의 구현과 그 반환값 의미론

### Out of Scope — 메시지 라우팅 (카드 `t3` 의 메시지 SPEC)

- `POST /api/rooms/:id/messages` 라우트의 생성, multipart 파싱, 첨부 저장, 멘션 파싱, `message_targets` 기록, `Gateway.deliver` 호출
- `GET /api/rooms/:id/messages` 목록과 첨부 다운로드
- `mention.ts` 의 `@TO`/`@CC` 파서

### Out of Scope — SSE 허브 (`SPEC-SSE-001`)

- `sse.ts` 의 `subscribe`/`publish` 구현, `GET /api/rooms/:id/events` 라우트
- 이 SPEC 은 `publish` 를 호출만 하고 새 이벤트 이름을 만들지 않는다(REQ-PERM-013)

### Out of Scope — 채널 플러그인 (카드 `t4`)

- `channel/` 패키지의 어떤 파일도 만들지 않는다. `notifications/claude/channel/permission_request` 수신, `sendPermissionRequest`, `onVerdict` 콜백, Claude Code 로의 판정 적용
- 이 SPEC 은 게이트웨이 경계 **안쪽**에서 끝난다 — 봇 소켓으로 나간 판정 payload 까지가 관측 대상이다

### Out of Scope — 웹 UI (카드 `t5`)

- system 메시지 렌더링, 승인/거절 빠른 버튼, 입력창 자동 채우기

### Out of Scope — 감사와 운영

- 승인 이력 테이블, 누가 승인했는지 기록, 승인 통계
- 도구별 자동 승인 정책(allowlist), 요청 빈도 제한
- `input_preview` 의 마스킹·길이 제한. 원본은 게이트웨이가 보낸 문자열을 그대로 싣는다

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 선행 SPEC 이 설치한 것을 그대로 쓴다: `fastify ^5`, `@fastify/cookie`, `@fastify/multipart`, `better-sqlite3`, `ws`, `vitest`. 이 SPEC 은 새 의존성을 추가하지 않는다.
- 서버 데이터는 전부 `MINIDISCORD_DATA_DIR`(기본 `./data`) 아래. 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- UI 문구(system 메시지 본문 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).
- 채널 계약(capabilities·notification 메서드·reply 도구·권한 릴레이)은 `spec-v2.md` 4-B 와 공식 channels-reference 를 그대로 따른다. `permission_request` / `permission_verdict` 의 필드 이름과 `behavior` 값(`'allow'`/`'deny'`)은 이 SPEC 에서 바꾸지 않는다. 변경이 필요해 보이면 중단하고 보고한다.
- 판정 정규식 `PERMISSION_REPLY_RE` 는 공식 문서 형식 그대로다. 완화(예: 6글자 허용, `l` 재포함)도 강화(예: 대소문자 구분)도 하지 않는다.

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 10(권한 릴레이), Task 8(게이트웨이 계약)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 7장 권한 릴레이 흐름, 8장 에러 처리, 9장 보안
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `openDb`, 스키마)
- `.moai/specs/SPEC-AUTH-001/` — 인증·세션 쿠키·`requireAuth`
- `.moai/specs/SPEC-SSE-001/` — SSE 허브
- `.moai/specs/SPEC-GATEWAY-001/` — 봇 게이트웨이 (`setPermissionHandler`, `sendToBot`, `ConnInfo`)
- 칸반 카드 `t3` (마일스톤 M3)
