# SPEC-PERM-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 10 과 `spec-v2.md` 7·9장이며, 그 두 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M3`(카드 `t3`)와는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t3` 는 게이트웨이·SSE·메시지·권한 릴레이를 함께 낸다. 이 SPEC 은 그중 **마지막**이다 — 앞의 셋이 없으면 이 SPEC 의 테스트는 준비 단계에서 전부 실패한다.

```
SPEC-CORE-001 → SPEC-AUTH-001 → SPEC-SSE-001 → SPEC-GATEWAY-001 → (메시지 라우트) → SPEC-PERM-001
```

이 SPEC 이 선행 산출물에서 **정확히 무엇을 받아 쓰는지**:

| 출처 | 받아 쓰는 것 | 이 SPEC 에서의 쓰임 |
|------|-------------|-------------------|
| `SPEC-GATEWAY-001` | `setPermissionHandler(fn)` | `index.ts` 에서 브로커 핸들러를 등록 |
| `SPEC-GATEWAY-001` | `sendToBot(roomId, botId, payload): boolean` | 판정 전송. **반환값을 읽는다** (§D 3번) |
| `SPEC-GATEWAY-001` | `ConnInfo { roomId, botId }` | 대기 레지스트리의 값 타입 |
| `SPEC-SSE-001` | `SseHub.publish(roomId, event, data)` | system 메시지 두 종류를 방에 발행 |
| `SPEC-AUTH-001` | `requireAuth` preHandler | 가로채기가 이것을 통과한 뒤에 놓인다 |
| `SPEC-CORE-001` | `messages` 테이블 (`author_type` 에 `'system'` 허용) | system 메시지 저장처. 스키마 변경 없음 |
| 카드 `t3` 메시지 SPEC | `POST /api/rooms/:id/messages` 핸들러 | 가로채기 한 갈래를 그 **안에** 넣는다 |
| 카드 `t3` 메시지 SPEC | `registerMessageRoutes(app)` | 시그니처를 바꾸지 않는다 — 브로커는 `app` 데코레이터로 닿는다 |

선행 산출물이 아직 없으면 이 SPEC 의 어떤 테스트도 실행할 수 없다. run 단계 진입 전 확인 대상이다.

## §B 되돌리기 어려운 결정 — 대기 레지스트리의 수명

이 SPEC 에서 가장 되돌리기 비싼 결정이다. 여기서 정한 수명이 "봇이 죽으면 어떻게 되는가", "서버가 재시작하면 어떻게 되는가", "타임아웃이 필요한가"를 전부 결정한다.

| 항목 | 값 | 왜 이렇게 정하는가 |
|------|-----|-------------------|
| 저장 위치 | 프로세스 메모리 `Map<string, ConnInfo>` | 원본 그대로. 테이블을 만들면 REQ-PERM-014 의 스키마 불변 조항과 충돌한다 |
| 등록 시점 | `onGatewayRequest` 진입 즉시 | system 메시지 저장보다 먼저 — 저장이 실패해도 대기 항목은 남아야 터미널 승인 경로가 살아 있다 |
| 해제 시점 | 판정 전송을 **시도한 직후** (성공 여부와 무관) | 전송 실패 시 항목을 남기면 같은 답을 무한히 재시도할 수 있게 되고, "이미 판정했다"는 사실이 사라진다 |
| 서버 재시작 | 전부 유실. 복구하지 않는다 | 세션 쪽 승인 대화상자가 그대로 살아 있어 터미널에서 직접 승인할 수 있다. 공식 릴레이 설계와 같은 성질 |
| 봇 연결 해제 | 항목을 **정리하지 않는다** | 원본 게이트웨이의 `ws.on('close')` 가 연결 목록만 지운다. 이 SPEC 은 게이트웨이를 고치지 않는다 |
| 만료(TTL) | 없다 | §D 4번 참조 — 채널 계약 차원의 결정이 필요해 이 SPEC 에서 정하지 않는다 |

검토 시 이 표가 확인 대상이다. "해제 시점"을 성공 시로만 바꾸면 AC-PERM-011 의 재시도 단언이 깨지고, 봇이 죽어 있는 동안 같은 판정을 몇 번이든 다시 보낼 수 있게 된다.

## §C 되돌리기 어려운 결정 — 사람이 보는 계약

방에 뜨는 문자열은 카드 `t5` 의 UI 가 정규식으로 파싱한다(`plan-v2.md` `app.js`: `/\byes [a-km-z]{5}/`). 확정 뒤에는 UI 코드가 여기에 결합한다.

### 승인 요청 system 메시지 (네 줄)

```
🔒 봇이 도구 사용 승인을 요청합니다: <tool_name>
<description>
<input_preview>
승인하려면 "yes <request_id>", 거절하려면 "no <request_id>" 라고 답해주세요.
```

네 번째 줄에 `request_id` 가 **실제 값으로** 들어가는 것이 계약이다. 자리표시자를 남기면 사람은 무엇을 칠지 모르고, UI 의 빠른 승인 버튼도 붙지 않는다.

### 판정 결과 system 메시지 (한 줄, 세 갈래)

| 상황 | 본문 |
|------|------|
| 승인, 봇에 전달됨 | `✅ 승인 전송됨 (<request_id>)` |
| 거절, 봇에 전달됨 | `⛔ 거절 전송됨 (<request_id>)` |
| 봇 연결 없음 (승인·거절 공통) | `⚠️ 봇이 접속해 있지 않아 판정을 전달하지 못했습니다 (<request_id>)` |

> 2026-09-04 개정 — 위 표의 «봇 연결 없음» 행: `SPEC-PERMROUTE-001` REQ-PERMROUTE-007 이 실패 문구를 둘로 나눴다 — «요청한 세션이 끊겨 …» 와 «요청한 세션의 신원이 기록되지 않아 …» (둘 다 꼬리 «전달하지 못했습니다 (<request_id>)» 유지). 위 문구는 소멸했다. 원문은 지우지 않는다.

세 번째 갈래가 원본에 없는 확장이다 — §D 3번.

### 판정 정규식

```ts
const PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i
```

공식 문서 형식 그대로다. `l` 이 빠진 것은 `1` 과 헷갈리기 때문이고, `/i` 는 입력기의 자동 대문자화를 흡수하기 위함이다. 완화도 강화도 하지 않는다.

## §D 원본 문서 모순과 해결

### 1. [차단급] 원본 테스트 하네스가 `permissions` 데코레이터를 빠뜨렸다

`plan-v2.md` Task 10 Step 1 의 `build()` 는 브로커를 만들고 게이트웨이에 핸들러를 등록하지만 `app.decorate('permissions', broker)` 를 하지 않는다. 그런데 같은 Task 의 Step 3 구현은 라우트에서 이렇게 부른다.

```ts
if ((app as any).permissions?.tryHandleUserReply(roomId, body)) { ... }
```

데코레이터가 없으면 `app.permissions` 는 `undefined` 이고 옵셔널 체이닝이 조용히 `undefined` 를 낸다. 그래서 `user yes reply sends verdict to the bot and is not stored as user message` 테스트는 **구현이 완전히 옳아도 실패한다** — 답이 평범한 메시지로 저장되어 `userMsgs.c` 가 `1` 이 되고, `consumed_by` 도 나오지 않는다. Step 3 의 배선 지시(`index.ts` 에 `app.decorate('permissions', broker)`)와 Step 1 의 테스트 하네스가 서로 어긋난 것이다.

**해결**: `acceptance.md` 의 공통 하네스가 그 줄을 채운다. 원본을 고치는 것이 아니라 원본이 빠뜨린 배선을 테스트에도 똑같이 적용하는 것이라, 계약 변경이 아니다.

**이 결함이 조용한 이유를 기록해 둔다** — 옵셔널 체이닝이 오류 대신 `undefined` 를 내기 때문이다. 같은 이유로 운영 코드에서도 `index.ts` 의 데코레이션 한 줄이 빠지면 권한 릴레이 전체가 아무 오류 없이 죽는다. 그래서 데코레이션을 REQ-PERM-004 로 요구사항 층에 올렸다.

### 2. 가로채기가 놓일 자리

원본 Step 3 은 "multipart 파싱 **직후**(방 active 확인 후)"라고 적었다. 그 위치가 만족해야 하는 조건은 셋이다.

- `requireAuth` **뒤** — 미인증 요청이 판정을 소모하면 안 된다 (REQ-PERM-012).
- 활성 방 확인 **뒤** — 보관된 방의 답은 라우트가 먼저 `403` 으로 거른다.
- 멘션 파싱 **앞** — `yes abcde` 에는 멘션이 없어 "봇 없음" 오류로 새지는 않지만, 파싱과 저장을 지나면 소비의 의미가 없어진다.

세 조건이 겹치는 자리는 원본이 지목한 그 자리 하나뿐이다. 그대로 따른다.

### 3. [의도적 이탈] `sendToBot` 의 반환값을 원본이 버린다

원본 구현은 이렇게 쓴다.

```ts
app.gateway.sendToBot(roomId, info.botId, { ... })
const body = behavior === 'allow' ? `✅ 승인 전송됨 (${requestId})` : `⛔ 거절 전송됨 (${requestId})`
```

`sendToBot` 은 `boolean` 을 돌려주도록 설계돼 있고(`plan-v2.md:1192` 주석이 "Task 11 권한 verdict 가 사용"이라고 명시한다), 그 방·봇의 연결이 없으면 `false` 다. 원본은 그 값을 버리므로 **봇이 죽어 있는 동안 누른 승인도 화면상 `✅ 승인 전송됨` 으로 보인다.** 사람은 승인했다고 믿고 기다리는데 세션은 계속 멈춰 있다 — 이 기능이 해결하려던 바로 그 상황으로 되돌아간다.

**해결**: 반환값을 읽어 §C 의 세 번째 갈래 문구를 낸다. 이탈의 범위는 **결과 문구 하나**이고, 채널 계약(메시지 타입·필드·`behavior` 값)은 건드리지 않는다. 원본 테스트도 결과 본문을 단언하지 않으므로 깨지지 않는다.

이 이탈이 필요 없다고 판단되면 REQ-PERM-009 의 두 번째 문단과 AC-PERM-011 을 함께 지우면 된다. 다른 요구사항은 영향받지 않는다.

### 4. [미해결 — 리드 판정 대기] 작성 지시서의 네 항목이 원본에 없다

이 SPEC 의 작성 지시서는 전용 승인/거절 HTTP 엔드포인트, 방 멤버십 검사, 미응답 타임아웃, 봇 연결 해제 시 대기 정리를 요구했다. 넷 다 `plan-v2.md` Task 10 과 `spec-v2.md` 7·9장 어디에도 없다.

| 항목 | 원본의 실제 설계 | 만들지 않은 이유 |
|------|-----------------|-----------------|
| 전용 엔드포인트 | 판정은 평범한 채팅 메시지이고 `POST /api/rooms/:id/messages` 가 가로챈다. UI 버튼도 입력창을 채우는 방식 | 두 번째 진입점이 생기면 "판정이 대화에 남는다"는 성질이 깨진다 |
| 방 멤버십 | 멤버십 모델 자체가 없다. `spec-v2.md` 2장이 방별 접근 권한을 YAGNI 로 배제 | 스키마에 소유자·멤버 컬럼이 없어 검사할 대상이 없다 |
| 타임아웃 | 없다. 대기 항목은 재시작까지 남는다 | 만료 시 어떤 `behavior` 를 보낼지가 채널 계약 결정이다 — Global Constraints 가 금지한 영역 |
| 연결 해제 정리 | 게이트웨이 `ws.on('close')` 가 연결 목록만 지운다 | 게이트웨이는 `SPEC-GATEWAY-001` 소유다. 이 SPEC 은 그 상태의 **관측 가능한 결과**만 확정한다 (§D 3번) |

Global Constraints 가 "계약 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다"고 지시하므로 만들지 않고 `spec.md` §5 에 소유자와 함께 기록했으며, 리드에 보고했다. 넷 중 어느 것이든 하기로 결정되면 별도 SPEC 이 맞다 — 타임아웃은 채널 계약을, 멤버십은 스키마를 건드린다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 표의 **"방 멤버십" 행은 뒤집혔다.** 스키마에 검사할 대상이 없다는 근거가 사라졌다 — `SPEC-ROOMAUTHZ-001` 이 `room_members` 표와 `rooms.created_by` 를 더했고, 같은 SPEC 이 `tryHandleUserReply` 시그니처를 개정했다(§C 참조 대상은 그쪽 문서다). 나머지 세 항목(전용 엔드포인트·타임아웃·연결 해제 정리)은 여전히 만들지 않는다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

### 5. `setPermissionHandler` 의 `params` 가 `any`

게이트웨이 쪽 타입은 `(info: ConnInfo, params: any) => void` 이고, 게이트웨이는 수신한 WebSocket 메시지 **전체**(즉 `type: 'permission_request'` 필드를 포함한 객체)를 넘긴다. 브로커 쪽은 네 필드만 선언한 좁은 타입으로 받는다.

이것은 모순이 아니라 의도된 좁히기다 — 브로커는 `type` 을 쓰지 않는다. 다만 게이트웨이가 보내는 필드 이름이 바뀌면 타입 검사로는 잡히지 않고 런타임에 `undefined` 가 문자열에 박힌다. AC-PERM-001·002 가 본문 내용을 단언해 그것을 잡는다.

### 6. [차단급] 원본 테스트 하네스가 `set-cookie` 를 배열로 가정한다

`plan-v2.md` Task 10 Step 1 의 `build()` 는 로그인 응답에서 쿠키를 이렇게 꺼낸다.

```ts
cookie: login.headers['set-cookie']![0].split(';')[0]
```

`light-my-request`(= `app.inject`)는 `set-cookie` 를 배열이 아니라 **문자열 하나**로 돌려준다. 문자열에 `[0]` 을 적용하면 첫 글자 `"m"` 이 나오고 `.split(';')[0]` 도 `"m"` 이라, 그 값을 쿠키로 보내는 모든 요청이 `requireAuth` 에서 `401` 이 된다. 판정 경로를 타는 기준 열 개(AC-PERM-003·004·005·006·007·008·009·010·011·012)가 **구현이 완벽해도 실패한다.**

**해결**: 형제 SPEC 세 곳이 각각 교정하며 쓴 `setCookieOf` 헬퍼(`server/test/rooms-bots.test.ts`)를 그대로 하네스에 두고 `cookie: setCookieOf(login).split(';')[0]` 으로 바꿨다.

**이 결함이 SPEC 경계를 넘어 살아남은 경위를 기록해 둔다.** 같은 결함이 `SPEC-MSG-001` 에서 M1 으로 지적됐으나, 그 SPEC 과 이 SPEC 을 서로 다른 감사자가 봐서 부류가 전파되지 않았다. `SPEC-SSE-001` 은 자체 훑기로 스스로 찾아 고쳤고 이 SPEC 만 남았다. 교훈은 결함 부류를 자기 SPEC 안에서만 훑으면 부족하다는 것이다 — 형제 SPEC 이 이미 고친 부류를 자기 하네스에 대조하는 단계가 있어야 했다. §D 1번과 함께, 원본 하네스를 그대로 옮길 때 생기는 같은 종류의 위험이다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| `index.ts` 의 데코레이션 한 줄 누락 | 권한 릴레이 전체가 아무 오류 없이 죽는다. 옵셔널 체이닝이 조용히 `undefined` 를 낸다 | REQ-PERM-004 가 요구사항 층에 올렸고, AC-PERM-006 이 `consumed_by` 로 관측한다 |
| 판정어를 읽지 않고 늘 `allow` 를 보냄 | 거절이 승인으로 뒤집힌다. 이 SPEC 에서 가장 비싼 오작동 | AC-PERM-005 가 봇 소켓이 받은 `behavior` 를 직접 단언 |
| 방 대조(`info.roomId !== roomId`) 누락 | 다른 방에서 남의 승인 요청을 승인할 수 있다 | AC-PERM-008 이 부정 관측(`nextMessage → null`)으로 잡는다 |
| 가로채기를 `requireAuth` 앞에 둠 | 미인증 요청이 판정을 소모한다. 상태 코드는 그대로여서 눈에 안 띈다 | AC-PERM-009 가 판정 미전송을 단언 |
| 전송 실패 시 대기 항목을 남김 | 같은 답을 무한 재시도할 수 있고 "이미 판정했다"는 사실이 사라진다 | §B 의 해제 시점을 "시도 직후"로 고정. AC-PERM-011 의 재시도 단언 |
| 답과 함께 파일이 첨부된 경우 | 가로채기가 multipart 파싱 뒤라 파일은 이미 디스크에 저장됐고, 어느 메시지에도 붙지 않은 채 남는다 | **미검증 — 수용.** 원본과 같은 동작이며, 판정 문자열과 파일을 함께 보내는 것은 실사용에서 나타나지 않는다 |
| 실 WebSocket 을 쓰는 테스트가 불안정 | 포트 0 바인딩·비동기 수신 타이밍으로 간헐 실패 가능 | `nextMessage` 의 타임아웃을 1.5초로 두고, 정리는 `build()`·`wsConnect`·`openStream` 이 등록한 `cleanups` 를 `afterEach` 가 일괄 실행한다. 간헐 실패가 나면 원인을 규명하고 기록한다 — 타임아웃만 늘려 덮지 않는다 |
| listen 중인 서버·소켓·스트림이 열린 채 남는다 | vitest 프로세스가 종료되지 않는다. 개별 테스트가 정리를 맡으면 한 곳만 빠뜨려도 재발한다 | 정리 책임을 개별 테스트에서 걷어 `cleanups` 로 옮겼다. 시나리오 본문에 정리 코드가 없으므로 빠뜨릴 자리 자체가 없다 (v0.2.0 교정 — MF-5) |
| 비동기 스트림을 읽는 기준이 정상 구현을 거짓 실패시킨다 | 브로커를 의심하며 run 단계 시간을 태운다. 부류 훑기는 공허한 기준만 걸러 내므로 이 방향은 잡히지 않는다 | AC-PERM-003 이 `readFrame` 으로 연결 확인 주석을 먼저 소비한다. 비동기 수신을 재는 기준을 새로 쓸 때 같은 점검을 한다 (v0.2.0 교정 — MF-1) |
| 부정 관측이 실제로는 늦게 도착한 것 | `toBeNull()` 이 통과했는데 판정이 타임아웃 직후 도착했을 수 있다 | 수용. 1.5초는 로컬 인메모리 소켓 왕복(수 ms)의 수백 배다 |
| 대기 레지스트리가 무한히 자란다 | 아무도 답하지 않은 요청이 프로세스 수명 동안 쌓인다 | 수용. 단일 사용자·소수 봇 전제이며, 정리 경로는 §D 4번의 미해결 항목이다 |
| 선행 SPEC 미완료 상태에서 착수 | `createGateway` 도 `registerMessageRoutes` 도 없어 하네스가 import 단계에서 깨진다 | §A 의 의존 표를 M1 시작 전 체크리스트로 쓴다 |

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다 — M2 의 판정 테스트가 M1 의 요청 등록 경로를 쓴다.

### M1 — 요청 도착과 방 표시 (우선순위 High)

원본: `plan-v2.md` Task 10 Step 1-3 중 `onGatewayRequest` 경로.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-PERM-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` §E.1 에 적는다. M2 단계 5 의 범위 경계 검사가 이 값을 기준으로 비교한다.
1. `server/test/permissions.test.ts` 를 만들고 `acceptance.md` 의 공통 하네스와 `describe('permission relay', ...)` 를 쓴다. 이 마일스톤의 테스트는 원본의 `gateway request creates a system message in the room`, 그리고 AC-PERM-002 / AC-PERM-003 의 추가 테스트다.
2. **RED 확인**: `npm test -w server` → `Cannot find module '../src/permissions.js'` 로 실패. 출력 원문 기록.
3. `server/src/permissions.ts` 를 만든다 — `PERMISSION_REPLY_RE`, `PermissionBroker` 인터페이스, `createPermissionBroker`, `onGatewayRequest` 구현(대기 등록 → system 메시지 저장 → `hub.publish`). `tryHandleUserReply` 는 이 단계에서 `false` 만 돌려주는 껍데기로 둔다.
4. `server/src/index.ts` 에 배선 세 줄 — 브로커 생성, `app.decorate('permissions', broker)`, `gateway.setPermissionHandler(...)`. `declare module 'fastify'` 에 `permissions: PermissionBroker` 를 더한다.
5. **GREEN 확인**: `npm test -w server` → M1 테스트 통과. `npm run typecheck -w server` → 종료 코드 `0`.
6. 커밋: `feat: permission request broker surfacing tool approvals in the room`

수용 기준: AC-PERM-001, 002, 003, AC-PERM-014(전이 1-2).

### M2 — 판정 해석과 전송 (우선순위 High)

원본: `plan-v2.md` Task 10 Step 1-3 중 `tryHandleUserReply` 경로.

1. 같은 테스트 파일에 판정 테스트를 추가한다 — 원본의 `user yes reply sends verdict to the bot and is not stored as user message`, `non-matching text is not consumed`, `yes with unknown id is not consumed (falls through as chat)`, 그리고 AC-PERM-004 / 005 / 007 / 008 / 009 / 010 / 011 / 012 의 추가 테스트. 원본의 뒤 두 테스트는 회귀 방지선으로 파일에 남지만, REQ-PERM-010 의 판정은 AC-PERM-010 의 새 테스트가 진다 — 원본 두 개는 `ok: true` 하나만 단언해 가로채기 없는 구현도 통과시킨다.
2. **RED 확인**: `npm test -w server` → 새 단언 실패. **모듈 부재가 아니라 단언 실패임을 출력에서 확인하고 기록한다** (AC-PERM-014 전이 3).
3. `permissions.ts` 의 `tryHandleUserReply` 를 구현한다 — 정규식 판정 → 대기 조회 → **방 대조** → 항목 제거 → `behavior` 산출 → `sendToBot` 호출과 **반환값 수신** → 결과 system 메시지 저장·발행 → `true` 반환. 정규식에 안 맞거나 항목이 없거나 방이 다르면 `false`.
4. `server/src/routes-messages.ts` 의 POST 핸들러에 가로채기 한 갈래를 넣는다 — §D 2번의 자리(활성 방 확인 뒤, multipart 파싱 직후, 멘션 파싱 앞). 소비되면 `{ ok: true, consumed_by: 'permission' }` 반환. `registerMessageRoutes` 의 시그니처는 바꾸지 않는다.
5. **GREEN 확인**: `npm test -w server` → 전체 통과. typecheck 종료 코드 `0`.
6. **범위 경계 확인** (AC-PERM-013): `git rev-parse --verify "$(cat .moai/specs/SPEC-PERM-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 먼저 확인하고, 그 뒤에만 두 `git diff` 로 넘어간다. **기준 커밋 없이 `git diff` 를 쓰지 않는다** — M1 커밋 이후라 `HEAD` 기준으로는 아무것도 잡히지 않는다. **빈 출력 하나만 보고 통과로 적지도 않는다** — 기준 SHA 가 없어도 표준 출력은 비어 있다.
7. 커밋: `feat: permission verdict relay with allow/deny and delivery reporting`

수용 기준: AC-PERM-004, 005, 006, 007, 008, 009, 010, 011, 012, 013, AC-PERM-014(전이 3-4).

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-PERM-001..014 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` §E.2 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **판정이 "도착했다"만 관측하기** — 이 SPEC 에서 가장 위험한 실수다. 항상 `allow` 를 보내는 구현도 그 기준을 통과한다. `behavior` 값을 직접 단언한다 (AC-PERM-005).
- **"예외가 나지 않았다"를 통과로 적기** — 봇 오프라인·다른 방·미인증 세 경로 모두 예외 없이 조용히 잘못될 수 있다. 부정 관측(`nextMessage → null`)으로 잰다.
- **스키마 변경** — 대기 레지스트리를 테이블로 만들지 않는다. REQ-PERM-014 가 금지하고, 필요해 보이면 중단하고 보고한다.
- **전용 승인/거절 엔드포인트 만들기** — §D 4번의 미해결 항목이다. 리드 판정 없이 만들지 않는다.
- **타임아웃 타이머 넣기** — 같은 이유다. 만료 시 어떤 `behavior` 를 보낼지가 채널 계약 결정이라 이 SPEC 에서 정할 수 없다.
- **새 SSE 이벤트 이름 만들기** — `permission_request` 같은 이벤트를 새로 내면 카드 `t5` 의 UI 가 `message` 만 듣고 있어 화면에 아무것도 안 뜬다. 기존 `message` 로 보낸다 (REQ-PERM-013).
- **`registerMessageRoutes` 의 시그니처 바꾸기** — 브로커를 인자로 받게 고치면 그 SPEC 의 테스트가 전부 깨진다. `app` 데코레이터로 닿는다.
- **데코레이션 없이 배선했다고 적기** — `app.permissions` 가 없어도 옵셔널 체이닝 때문에 오류가 나지 않는다. 배선의 증거는 AC-PERM-006 의 `consumed_by` 관측이다 (§D 1번).
- **전송 실패를 성공 문구로 표시하기** — 원본이 그렇게 되어 있고, 그 상태로는 사람이 승인했다고 믿으며 멈춘 세션을 기다린다 (§D 3번).
- **대기 항목을 성공 시에만 해제하기** — 실패 시 남기면 같은 답을 무한 재시도할 수 있게 된다 (§B).
- **정규식 완화** — `l` 을 다시 넣거나 길이를 늘리지 않는다. 공식 문서 형식이 계약이다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-PERM-014 의 전이 증거를 만들 수 없다. 특히 전이 3 은 **모듈 부재가 아닌 단언 실패**여야 한다.
- **간헐 실패를 타임아웃 연장으로 덮기** — WebSocket 테스트가 흔들리면 원인을 규명해 §E 에 적는다. 1.5초는 로컬 소켓 왕복의 수백 배다.
- **정리 책임을 개별 테스트로 되돌리기** — 각 테스트 끝에 `ws.close(); await app.close()` 를 쓰는 형태로 돌아가지 않는다. 한 곳만 빠뜨려도 vitest 가 종료되지 않고, 그 누락은 리뷰에서 눈에 띄지 않는다. `cleanups` 등록이 유일한 정리 경로다 (MF-5).
- **SSE 라우트에서 `reply.hijack()` 빼기** — `SPEC-SSE-001` `REQ-SSE-003` 이 확정한 형태다. 원본 `plan-v2.md` Task 7 에는 없어서 그대로 옮기기 쉬운데, 그러면 테스트 하네스의 배선이 프로덕션과 갈라져 테스트가 실제 동작을 재지 않게 된다 (MF-3).
- **스칼라를 배열로 취급하기** — `app.inject` 의 `set-cookie` 는 문자열 하나다. `[0]` 을 붙이면 첫 글자를 집어내고, 그 값은 조용히 `401` 을 만든다(오류가 아니라 잘못된 값이라 눈에 띄지 않는다). 헤더·프레임·응답 본문을 인덱싱하기 전에 그 API 가 정말 배열을 돌려주는지 확인한다 (R-1).
- **형제 SPEC 이 이미 고친 결함 부류를 자기 하네스에 대조하지 않기** — 자기 SPEC 안에서만 훑으면 부족하다. R-1 은 `SPEC-MSG-001` 에서 이미 지적된 부류였는데 감사자가 달라 전파되지 않았다.
- **비동기 스트림을 한 번만 읽고 판정하기** — `subscribe` 는 `: connected` 주석을 먼저 쓴다. 첫 읽기를 본 프레임으로 착각하면 정상 구현이 거짓 실패한다. `readFrame` 으로 주석을 먼저 소비한다 (MF-1).
- **부정 기준을 부정 단언 하나로 끝내기** — "소비되지 않았다"는 가로채기가 아예 없는 구현도 통과시킨다. 부정 기준에는 반드시 양성 짝(저장 행 수, 이후 진짜 판정의 성립)을 붙인다 (MF-2).
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡힌다. `spec_base_sha` 를 기준으로 비교한다.
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 의 종료 코드 `0` 을 먼저 확인한다.
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않는다. 이름 붙은 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다.

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 10 — **이 SPEC 의 원본**(읽기 전용). Task 8 이 게이트웨이 계약
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 7·9장 — 권한 릴레이 흐름, 보안
- `spec.md` — GEARS 요구사항(REQ-PERM-001..014)과 범위 경계
- `acceptance.md` — AC-PERM-001..014, 공통 테스트 하네스
- `progress.md` — 단계별 증거 기록처
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC
- `.moai/specs/SPEC-AUTH-001/` — 인증·`requireAuth`
- `.moai/specs/SPEC-SSE-001/` — SSE 허브 (`publish`)
- `.moai/specs/SPEC-GATEWAY-001/` — 게이트웨이 (`setPermissionHandler`, `sendToBot`, `ConnInfo`)
