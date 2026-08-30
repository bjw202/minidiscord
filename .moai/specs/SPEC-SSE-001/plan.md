# SPEC-SSE-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 7 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M3`(카드 `t3`)와는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t3` 는 `plan-v2.md` 의 Task 7·8·9·10 을 담고, 이 SPEC 은 그중 Task 7 하나다. 카드 안에서의 순서는 고정이다.

```
SPEC-SSE-001 (이 SPEC — Task 7)
      ↓ publish/subscribe 계약
Task 8 게이트웨이 → Task 9 메시지 라우트 → Task 10 권한 릴레이
```

이 SPEC 이 선행 SPEC에서 **정확히 무엇을 받아 쓰는지**:

| 선행 SPEC | 받아 쓰는 것 | 이 SPEC에서의 쓰임 |
|-----------|-------------|-------------------|
| `SPEC-CORE-001` | `buildServer()` 와 그 안의 `declare module 'fastify'` 블록 | 허브 데코레이터와 이벤트 라우트를 여기에 더한다 |
| `SPEC-CORE-001` | `config.dataDir` (게터로 지연 평가됨) | AC-SSE-009 가 `buildServer()` 를 부를 때 열리는 데이터 경로 |
| `SPEC-AUTH-001` | `requireAuth(req, reply)` preHandler | 이벤트 라우트의 `preHandler: [requireAuth]` |
| `SPEC-AUTH-001` | `registerAuthRoutes` + `md_session` 쿠키 흐름 | `sse.test.ts` 가 자체 헬퍼로 쿠키를 얻을 때 |
| `SPEC-AUTH-001` | `app.db` 데코레이터 | `requireAuth` 가 세션을 조회하는 경로 (이 SPEC 은 DB 를 직접 쓰지 않는다) |
| `SPEC-ROOM-001` | — | **직접 소비하지 않는다.** 방 존재 검증을 하지 않으므로 방 라우트도 쓰지 않는다 |

`SPEC-BOT-001` 은 의존이 아니다. 이 SPEC 은 봇 토큰도 초대도 읽지 않는다. `depends_on` 에 `SPEC-ROOM-001` 이 남아 있는 이유는 카드 `t2` 세 SPEC 이 한 덩어리로 완료되기 때문이며, 코드 결합은 없다.

**이 SPEC 은 자기 테스트 헬퍼를 스스로 만든다.** `SPEC-ROOM-001` 이 `rooms-bots.test.ts` 에 둔 `build()` 헬퍼는 그 파일 안에 있고 내보내지 않는다. `sse.test.ts` 는 `acceptance.md` § 공통 테스트 골격의 `startServer()` 를 자기 파일 안에 새로 둔다 — 이름이 달라야 두 헬퍼가 혼동되지 않는다.

## §B 되돌리기 어려운 결정 — 허브 계약

이 SPEC 에서 가장 되돌리기 비싼 결정이다. Task 8·9·10 이 이 두 메서드에 직접 결합하고, 세 파일이 쓰인 뒤에 시그니처를 바꾸면 셋이 함께 바뀐다.

| 항목 | 값 | 왜 여기서 고정하는가 |
|------|-----|---------------------|
| 구독 | `subscribe(roomId: number, res: ServerResponse): void` | `plan-v2.md` Task 7 원문 그대로. 라우트가 `reply.raw` 를 넘긴다 |
| 발행 | `publish(roomId: number, event: string, data: unknown): void` | Task 8·9·10 의 호출부가 전부 이 모양이다 (`plan-v2.md` 1472·1545·1868·2083행) |
| 관측 | `subscriberCount(roomId: number): number` | **원본에 없는 추가.** 구독자 누수를 관측할 다른 경로가 없다 — §D 4번 |
| 내부 구조 | `Map<number, Set<ServerResponse>>` | 방당 다중 구독자(브라우저 탭 여럿)를 지원하려면 집합이어야 한다 |
| 팩토리 | `createSseHub(): SseHub` | 프로세스당 하나. `buildServer` 가 한 번 부르고 `app.decorate('hub', …)` |
| 상태 | 순수 메모리. DB·디스크 접근 없음 | 재시작하면 구독은 전부 사라지고 브라우저가 다시 연결한다. `spec-v2.md` 8장이 그 복원 경로를 REST 로 정해 뒀다 |

**의도적으로 넣지 않은 것** — `unsubscribe(roomId, res)` 공개 메서드. 정리는 `res.on('close')` 안에서 자동으로 일어나고, 외부에서 손으로 끊을 호출자가 없다. 공개 메서드로 두면 뒤 태스크가 그것에 결합할 여지만 생긴다.

검토 시 이 표가 확인 대상이다. 여기서 시그니처 하나를 바꾸면 Task 8·9·10 의 호출부가 함께 바뀐다.

## §C 되돌리기 어려운 결정 — 사람과 브라우저가 보는 계약

### 프레임 형식

```
event: <이름>\ndata: <JSON>\n\n
```

Task 11 의 웹 UI 가 `EventSource` 로 이 형식을 파싱한다. 끝의 빈 줄이 없으면 브라우저는 이벤트를 방출하지 않는다 — 그래서 AC-SSE-004 가 `toContain` 이 아니라 `toBe` 로 바이트 일치를 본다.

이벤트명은 두 개로 고정한다. `plan-v2.md` Task 7 이 "이후 태스크에서 쓰는 이벤트명: `message`, `bot_status`" 라고 명시한다.

| 이벤트명 | 발행자 | 어느 태스크 |
|----------|--------|------------|
| `message` | 메시지 라우트, 게이트웨이(봇 답장), 권한 릴레이(system 메시지) | Task 9·8·10 |
| `bot_status` | 게이트웨이 | Task 8 |

허브는 이벤트명을 검증하지 않는다 — `event: string` 을 그대로 받아 프레임에 쓴다. 화이트리스트를 두면 Task 8·10 이 이벤트를 늘릴 때마다 이 파일을 고쳐야 한다.

### 연결 확인 주석은 하트비트가 아니다

구독 직후 한 번 `: connected\n\n` 을 보낸다. SSE 주석 줄이라 브라우저 이벤트로 잡히지 않고, 서버가 실제로 스트림을 열었다는 신호로만 쓴다. **주기적으로 반복하지 않는다.**

`plan-v2.md` 도 `spec-v2.md` 도 하트비트를 규정하지 않는다. 서버와 브라우저가 같은 PC 에서 돌고 사이에 유휴 연결을 끊을 프록시가 없다는 것이 근거다. AC-SSE-002 가 첫 프레임을 `toBe` 로 못 박아 프리앰블이 늘어나는 것을 막고, AC-SSE-012 가 `setInterval` 부재를 본다.

### HTTP 엔드포인트 표

| 라우트 | 성공 | 실패와 코드 |
|--------|------|-------------|
| `GET /api/rooms/:id/events` | `200` + `text/event-stream`, 열린 채 유지 | 미인증 `401` (그 외 없음) |

**방이 없어도 `404` 를 내지 않는다.** 방 존재 검증은 이 SPEC 범위 밖이다(`spec.md` §5). 선행 SPEC 셋 어디에도 방별 접근 권한이 없고 `spec-v2.md` 2장이 그것을 YAGNI 로 배제했으므로, 여기서 새 검증 계층을 만들지 않는다. 나중에 필요해지면 그때 별도 SPEC 이 정한다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 문단은 더 이상 참이 아니다. `SPEC-ROOMAUTHZ-001` 이 이 라우트에 멤버십 게이트를 걸었고, 비멤버와 미실재 방 모두 `404` 를 받는다(두 응답은 글자 그대로 같다 — 방의 실재를 숨기기 위해서다). 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

## §D 원본 문서 모순과 해결

원본 `plan-v2.md` Task 7 의 테스트 골격과 `spec-v2.md` 를 대조하면서 발견한 것들이다. 1~4번은 여기서 해소하고, **5번은 의도적으로 미해결 상태로 보존한다.** 6·7번은 v0.2.0 교정 라운드에서 더해졌다 — 7번이 감사 지적(MF-4)이고, 6번은 그 교정 중 자체 훑기에서 나온 같은 부류의 결함이다. 둘 다 **정상 구현을 거짓 실패시키는** 기준이었다.

### 1. `app.inject` 로 SSE 를 열면 테스트가 멈춘다

원본 테스트에는 다음 호출이 있다.

```ts
await app.inject({
  method: 'GET', url: '/api/rooms/1/events', headers: { cookie: ck },
}) // inject는 SSE를 소비하지 않으므로 아래처럼 실제 서버로 검증한다
chunks.length = 0
```

주석이 말하는 것과 코드가 하는 것이 다르다. `app.inject` 는 **응답이 끝나기를 기다리는데** 이벤트 스트림은 끝나지 않는다. 이 `await` 는 반환하지 않고, 그 아래 코드는 실행되지 않는다. 뒤따르는 `chunks.length = 0` 도 이미 비어 있는 배열을 비우는 죽은 문장이다.

**해결**: 이 `inject` 호출과 `chunks` 배열을 삭제한다. 스트림 검증은 처음부터 `app.listen({ port: 0 })` + `fetch` 로만 한다. `inject` 는 AC-SSE-008 의 `401` 검증처럼 **응답이 즉시 끝나는 경우에만** 쓴다 — 그 경우에는 `requireAuth` 가 스트림이 시작되기 전에 끊으므로 안전하다.

### 2. 라우트에 `reply.hijack()` 이 없다

원본 라우트 등록은 이렇다.

```ts
app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
  hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
})
```

핸들러가 `reply.raw` 에 직접 헤더와 본문을 쓰고 `undefined` 를 반환한다. Fastify 는 핸들러가 끝나면 자기 응답을 보내려 하는데, 그때는 이미 헤더가 나간 뒤다. `reply.hijack()` 이 "이 응답은 내가 소켓에 직접 쓸 테니 관여하지 마라"고 알리는 문서화된 방법이다.

**해결**: `hub.subscribe(...)` **앞에** `reply.hijack()` 을 넣는다.

```ts
app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
  reply.hijack()
  app.hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
})
```

**정직하게 적어 둔다 — Fastify v5 가 하이재킹 없이도 이 형태를 견디는지는 실행으로 확인하지 않았다.** 견딘다 해도 `hijack()` 은 소켓 소유권을 넘기는 정식 경로이므로 넣는 편이 옳고, AC 관측은 어느 쪽이든 달라지지 않는다. 만약 run 단계에서 `hijack()` 때문에 오히려 문제가 생기면 블로커로 보고한다 — 임의로 지우지 않는다.

### 3. 방 격리 검사가 아무것도 단언하지 않는다

원본 테스트의 마지막 세 줄이다.

```ts
hub.publish(2, 'message', { id: 9 }) // 다른 방은 안 옴
await new Promise(r => setTimeout(r, 100))
await reader.cancel()
```

주석은 "다른 방은 안 옴"이라고 말하는데 **그것을 확인하는 단언이 한 줄도 없다.** 발행하고, 100밀리초 기다리고, 리더를 닫는다. 전역 브로드캐스트 구현도 이 세 줄을 그대로 통과하고, `publish` 가 통째로 빈 함수여도 통과한다. 이 SPEC 이 지키려는 핵심 성질 하나가 검사되지 않은 채였다.

**해결**: 부재가 아니라 **도착 순서**로 관측한다. 방 `2` 로 먼저 발행하고 방 `1` 로 나중에 발행한 뒤, 방 `1` 구독자가 받는 다음 프레임이 방 `1` 것인지 `toBe` 로 본다(AC-SSE-003). 전역 브로드캐스트라면 다음 프레임이 방 `2` 것이 되어 실패한다.

이것이 카드 `t2` 에서 세 번 재생산된 결함 부류다 — **본문이 비어 있어도 통과하는 수용 기준.** `acceptance.md` 서두가 그 부류를 명시하고, 이 SPEC 의 기준 전체를 그 관점으로 훑었다.

### 4. 구독자 누수를 관측할 수단이 없다

원본 `SseHub` 인터페이스에는 `subscribe` 와 `publish` 둘뿐이다. 그런데 이 SPEC 이 지켜야 할 성질 가운데 하나가 "연결이 끊기면 구독자가 집합에서 제거된다"이고, 그것을 밖에서 볼 방법이 없다. 볼 수 없는 성질은 검사할 수 없고, 검사할 수 없는 성질은 조용히 깨진다.

**해결**: `subscriberCount(roomId: number): number` 를 인터페이스에 **추가**한다.

```ts
export interface SseHub {
  subscribe(roomId: number, res: ServerResponse): void
  publish(roomId: number, event: string, data: unknown): void
  subscriberCount(roomId: number): number   // 관측 표면 — 프로덕션 경로는 호출하지 않는다
}
```

**이것은 원본 계약의 변경이 아니라 확장이다.** `subscribe` 와 `publish` 는 한 글자도 바뀌지 않으므로 Task 8·9·10 의 호출부는 그대로다. 새 메서드를 쓰는 것은 `sse.test.ts` 뿐이다.

대안으로 "publish 를 보내고 안 오는 것을 확인한다"를 검토했지만 버렸다 — 부재 검사라 3번과 같은 결함 부류가 된다. 구독자 수를 직접 세는 것만이 **구독이 실제로 등록됐다는 것(`1`)과 실제로 제거됐다는 것(`0`)을 둘 다** 보여 준다.

### 5. [미해결 — 보존] `spec-v2.md` 4-B 의 채널 설정 전달 방식

`spec-v2.md` 4-B 는 채널이 `--token` / `--server` **실행 인자**로 설정을 받는다고 쓰는데, 같은 문서의 Global Constraints 20행과 `plan-v2.md` Task 5 의 명령 문자열은 **환경변수만** 쓴다.

**이 SPEC 의 범위 밖이다.** SSE 허브는 채널 설정을 읽지도 만들지도 않는다. 이 모순은 `SPEC-BOT-001` `plan.md` §D 3번에 이미 기록돼 있고 카드 `t4`(채널 플러그인 구현)에서 재확인 대상이다. 여기서 다르게 해소하지 않는다 — **미해결**로 남긴다.

### 6. [v0.2.0 교정] `set-cookie` 는 배열이 아니라 문자열이다

원본 `plan-v2.md` Task 7 의 테스트는 로그인 응답에서 쿠키를 이렇게 꺼낸다.

```ts
const ck = login.headers['set-cookie']![0].split(';')[0]
```

`light-my-request`(Fastify 의 `inject` 구현체)는 `set-cookie` 를 **배열이 아니라 문자열 하나**로 돌려준다. 문자열에 `[0]` 을 하면 첫 글자, 즉 `"m"` 이 나오고 `.split(';')[0]` 도 `"m"` 이다. 그 값을 쿠키로 보내면 `requireAuth` 가 세션을 못 찾아 전부 `401` 을 낸다 — **구현이 완전히 옳아도 이 SPEC 의 스트림 기준 전부가 실패한다.**

**해결**: 이미 머지된 `server/test/rooms-bots.test.ts:21-26` 이 같은 문제를 `setCookieOf` 헬퍼로 해소해 뒀다(직접 읽어 확인). 같은 정규화를 `acceptance.md` 공통 골격에 넣고, 두 곳의 호출부를 `setCookieOf(login).split(';')[0]` 으로 바꿨다.

**이 항목은 감사가 지적한 것이 아니라 MF-4 교정 중 자체 훑기에서 나왔다.** MF-4 와 정확히 같은 부류 — 공허한 기준이 아니라 **정상 구현을 거짓 실패시키는** 기준이다. 형제 SPEC 둘(`SPEC-MSG-001` `plan.md` §D 8번, `SPEC-GATEWAY-001` AC-GW-018)도 같은 교정을 적용했다.

### 7. [v0.2.0 교정] `server/src` 파일 목록을 절대 열거로 단언할 수 없다

이전 판의 REQ-SSE-010 과 AC-SSE-010 관측 1은 구현 후 `server/src` 에 정확히 일곱 파일만 있고 `mention.ts` 가 없어야 한다고 못 박았다. 그런데 카드 `t3` 안의 실행 순서가 그것을 허용하지 않는다.

- `SPEC-MENTION-001` `plan.md` §E — 자신을 카드 `t3` 의 **첫 번째**로 못 박는다.
- `SPEC-GATEWAY-001` `spec.md` — `SPEC-MENTION-001` 과 `SPEC-SSE-001` 이 먼저 끝나야 한다고 쓴다.

즉 이 SPEC 이 실행될 때 `mention.ts` 는 이미 존재할 공산이 크고, 그러면 목록이 여덟 항목이 되어 관측 1이 실패한다. **이 SPEC 이 통제하지 않는 다른 SPEC 의 산출물을 자기 요구사항으로 삼은 것**이 원인이다.

**해결**: 형제 SPEC 파일을 목록 검사에서 **완전히 뺀다.** 관측 1은 `sse.ts` 가 있는지만 본다(양성 확인). "이 SPEC 이 만들지 않았다"는 판정은 관측 4 — `spec_base_sha` 기준 `git diff --name-only` 가 정확히 두 줄 — 이 진다. 상대 비교이므로 형제 SPEC 이 진입 시점 이전에 무엇을 만들어 뒀든 흔들리지 않으면서, 이 SPEC 의 구현자가 `gateway.ts` 를 미리 만들면 세 번째 줄로 즉시 드러난다.

**감사가 제안한 음성 열거를 쓰지 않은 이유.** 보고서는 관측 1을 "`gateway.ts`·`routes-messages.ts`·`permissions.ts` 가 없을 것"이라는 음성 열거로 바꾸라고 제안했다. 그것도 MF-4 를 닫지만 두 가지가 약하다. 첫째, 여전히 실행 순서에 매여 있다 — 형제 셋 중 하나가 이 SPEC 보다 먼저 도는 순서가 생기면 같은 결함이 되살아난다. 둘째, 부재 검사라 이 카드의 주 결함 부류(빈 구현이 통과하는 기준)에 그대로 해당한다. 형제 `SPEC-MSG-001` 의 AC-MSG-013 이 쓰는 모양 — 형제 파일 면제 + 기준 SHA diff 가 판정 — 이 두 문제를 모두 피하므로 그쪽을 택했다. 리드 지시와도 일치한다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| 선행 SPEC 미완료 상태에서 착수 | `requireAuth` 도 `registerAuthRoutes` 도 없어 `startServer()` 헬퍼가 준비 단계에서 실패한다 | §A 의 의존 표를 M1 시작 전 체크리스트로 쓴다 |
| 방 격리를 부재 검사로 되돌림 | "발행하고 기다린 뒤 닫는" 형태는 전역 브로드캐스트도 통과시킨다 | AC-SSE-003 이 도착 순서를 `toBe` 로 단언 (§D 3번) |
| `subscriberCount` 를 "끊긴 뒤 0" 하나만 보게 축소 | `subscribe` 가 아무 일도 하지 않는 구현이 가장 잘 통과한다 | AC-SSE-006 이 **구독 직후 `1` 과 끊긴 뒤 `0` 을 둘 다** 단언 |
| `close` 이벤트 타이밍을 고정 `setTimeout` 으로 기다림 | 기계 부하에 따라 간헐 실패하고, 그 실패를 "불안정한 테스트"로 오해해 단언을 지우게 된다 | `waitFor` 로 상한(2초) 안에서 폴링하고, 상한 초과 시 `false` 를 단언해 명시적으로 실패시킨다 |
| 열어 둔 서버·리더를 안 닫음 | vitest 프로세스가 종료되지 않고 CI 가 멈춘다 | `startServer()`·`openStream()` 이 `cleanups` 에 등록하고 `afterEach` 가 일괄 정리 |
| AC-SSE-009 가 `buildServer()` 를 부르며 진짜 `data/` 를 연다 | 저장소의 실제 데이터 디렉터리에 테스트 사용자 행이 남는다 | `config.dataDir` 이 게터로 지연 평가되므로(`SPEC-ROOM-001` `plan.md` §D 8번) `MINIDISCORD_DATA_DIR` 을 임시 경로로 설정해 격리할 수 있다. **격리 방법 확정은 run 단계 M2 의 첫 작업이다** — 격리 없이 통과시키지 않는다 |
| `sse.ts` 만 완벽하고 `index.ts` 배선이 없음 | 앞선 기준들이 전부 손으로 조립한 앱을 쓰므로 배선 부재를 잡지 못한다 | AC-SSE-009 가 프로덕션 조립 경로(`buildServer()`)로 같은 것을 관측 |
| `reply.hijack()` 도입이 예상 밖 부작용을 냄 | Fastify 버전에 따라 동작 차이가 있을 수 있다 (§D 2번 — 실행으로 확인하지 않음) | AC 관측은 하이재킹 유무와 무관하게 성립한다. 문제가 생기면 블로커로 보고하고 임의로 지우지 않는다 |
| 이미 끊긴 응답에 `write` 하는 경합 | `close` 정리와 `publish` 가 겹치면 예외 가능성이 이론적으로 있다 | 단일 사용자·소수 그룹 전제로 수용. 발생하면 run 단계에서 블로커로 보고 |
| 빈 집합이 된 방 항목이 `Map` 에 남음 | 방 수만큼 빈 `Set` 이 쌓인다. 실질 누수는 아니지만 원본 구현이 `rooms.delete` 를 한다 | REQ-SSE-008 이 삭제를 요구하되, AC-SSE-006 은 `subscriberCount === 0` 만 관측한다. 두 상태를 구분할 관측 가치가 없어 의도적으로 구분하지 않았다 |
| 하트비트를 "있는 게 낫다"며 추가 | 원본 어디에도 없고, 첫 프레임 `toBe` 단언과 충돌한다 | REQ-SSE-009 가 금지하고 AC-SSE-002·012 가 기계적으로 잡는다 |
| 형제 SPEC 산출물을 이 SPEC 의 기준에 절대 목록으로 넣음 | 카드 `t3` 실행 순서에 따라 **정상 구현이 거짓 실패**한다. 이 SPEC 이 통제하지 않는 것을 자기 요구사항으로 삼은 결과다 | 목록 검사는 `sse.ts` 존재만 보고, 판정은 `spec_base_sha` 기준 상대 diff 가 진다 (§D 7번, 감사 지적 MF-4) |
| `set-cookie` 를 배열로 다룸 | 문자열에 `[0]` 을 하면 첫 글자 `"m"` 이 나와 모든 스트림 기준이 `401` 로 실패한다. 구현 결함으로 오진해 시간을 태우게 된다 | `setCookieOf` 정규화를 공통 골격에 넣었다 (§D 6번). 이미 머지된 `rooms-bots.test.ts:21-26` 과 같은 형태다 |

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다 — M2 의 배선 테스트가 M1 의 허브를 쓴다.

### M1 — 허브 자체 (우선순위 High)

원본: `plan-v2.md` Task 7 Step 1-4 중 `sse.ts` 본문.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-SSE-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` `§E.1` 에 적는다. M2 단계 5 의 범위 경계 검사 두 개가 이 값을 기준으로 비교한다.
1. `server/test/sse.test.ts` 를 만들고 `acceptance.md` § 공통 테스트 골격의 헬퍼 넷(`startServer`·`openStream`·`readFrame`·`waitFor`)과 AC-SSE-001~008·012 의 테스트를 쓴다. 라우트 등록은 헬퍼 안에서 손으로 한다(아직 `index.ts` 를 고치지 않는다).
2. **RED 확인**: `npm test -w server` → 새 테스트가 `../src/sse.js` 모듈 부재로 실패. 출력 기록.
3. `server/src/sse.ts` 를 만든다 — `SseHub` 인터페이스(`subscribe`·`publish`·`subscriberCount`)와 `createSseHub()`. 내부는 `Map<number, Set<ServerResponse>>`. `subscribe` 는 헤더 → `: connected` → 집합 등록 → `close` 핸들러 순서(REQ-SSE-002). `publish` 는 집합이 없으면 즉시 반환(REQ-SSE-007). import 는 `node:http` 타입 한 줄만(AC-SSE-012).
4. **GREEN 확인**: `npm test -w server` → 허브 테스트 전부 통과. `npm run typecheck -w server` → 종료 코드 0.
5. 커밋: `feat: SSE hub with per-room subscription`

수용 기준: AC-SSE-001, 002, 003, 004, 005, 006, 007, 008, 012, AC-SSE-011(전이 1-2).

### M2 — `buildServer` 배선과 범위 경계 (우선순위 High)

원본: `plan-v2.md` Task 7 Step 3 중 `index.ts` 변경분.

1. **데이터 디렉터리 격리 방법을 먼저 정한다** (§E 위험 항목). `buildServer()` 를 부르는 AC-SSE-009 테스트가 저장소의 진짜 `data/` 를 열지 않도록 `MINIDISCORD_DATA_DIR` 을 임시 경로로 설정하는 방식을 확정하고 테스트에 반영한다. 격리 없이 통과시키지 않는다.
2. `sse.test.ts` 에 AC-SSE-009 의 배선 테스트를 추가한다.
3. **RED 확인**: `npm test -w server` → 배선 테스트가 실패. 원인이 라우트 미등록(`404`) 또는 `app.hub` 미정의로 출력에 보이는지 확인하고 기록.
4. `server/src/index.ts` 를 고친다 — `createSseHub` import, `declare module 'fastify'` 의 `FastifyInstance` 에 `hub: ReturnType<typeof createSseHub>` 추가, `buildServer` 안에서 `const hub = createSseHub()` + `app.decorate('hub', hub)` + `GET /api/rooms/:id/events` 등록(§D 2번에 따라 `reply.hijack()` 먼저).
5. **GREEN 확인**: `npm test -w server` → 전체 통과. typecheck 0.
6. 범위 경계 확인 (AC-SSE-010): `ls server/src` 에 `sse.ts` 가 있는지 본다 — **파일 개수를 세지 않는다.** 형제 SPEC 이 이미 만들어 둔 `mention.ts` 등의 존재는 이 SPEC 의 판정 대상이 아니다(§D 7번). 이어서 `git rev-parse --verify "$(cat .moai/specs/SPEC-SSE-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 확인하고, 그 SHA 를 넣은 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이면서 비어 있는지, `git diff --name-only <SHA> -- server/src` 가 종료 코드 `0` 이면서 정확히 `server/src/index.ts` + `server/src/sse.ts` 두 줄인지 본다. **기준 커밋 없이 `git diff` 를 쓰지 않는다.** **빈 출력 하나만 보고 통과로 적지도 않는다** — 기준 SHA 가 없을 때도 표준 출력은 비어 있다.
7. 커밋: `feat: wire SSE event stream route into buildServer`

수용 기준: AC-SSE-009, 010, AC-SSE-011(전이 3-4).

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-SSE-001..012 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **`server/src` 파일 개수 세기** — `ls server/src` 가 정확히 몇 개인지를 이 SPEC 의 기준으로 되돌리지 않는다. 형제 SPEC 이 먼저 돌면 정상 구현이 거짓 실패한다. `sse.ts` 존재만 보고, 나머지는 `spec_base_sha` 기준 diff 에 맡긴다 (§D 7번).
- **`login.headers['set-cookie']![0]` 그대로 쓰기** — `light-my-request` 는 문자열을 돌려주므로 `[0]` 은 첫 글자 `"m"` 이다. 그 쿠키로는 전부 `401` 이 난다. `setCookieOf` 를 거친다 (§D 6번).
- **부재로 쓴 수용 기준** — "다른 방에 안 온다", "누수가 없다"를 단언 없이 적지 않는다. 아무 일도 하지 않는 구현이 가장 잘 통과한다. 존재로 다시 쓴다: 도착 순서(AC-SSE-003), 구독자 수 `1` → `0`(AC-SSE-006).
- **`subscriberCount` 의 앞 단언 지우기** — "끊긴 뒤 `0`"만 보면 `subscribe` 가 빈 함수인 구현이 통과한다. 구독 직후 `1` 을 먼저 관측한다.
- **`app.inject` 로 이벤트 스트림 열기** — 응답이 끝나지 않아 테스트가 멈춘다. 스트림은 `app.listen({ port: 0 })` + `fetch` 로만 검증한다. `inject` 는 `401` 처럼 응답이 즉시 끝나는 경우 전용이다 (§D 1번).
- **`reply.hijack()` 빼기** — 원본에 없다는 이유로 지우지 않는다. 소켓 소유권을 넘기는 정식 경로이며, 문제가 생기면 블로커로 보고한다 (§D 2번).
- **하트비트 추가** — 원본 어디에도 없다. `: connected` 는 한 번만 보내는 연결 개시 신호이지 주기 신호가 아니다. REQ-SSE-009 가 금지한다.
- **`data` 페이로드 모양 정하기** — 이 SPEC 은 `unknown` 을 그대로 `JSON.stringify` 한다. `message` 이벤트의 필드 구성은 Task 9 가 정한다. 여기서 타입을 좁히면 그 태스크가 이 파일을 고쳐야 한다.
- **이벤트명 화이트리스트** — `event: string` 을 그대로 쓴다. 허용 목록을 두면 Task 8·10 이 이벤트를 늘릴 때마다 이 파일이 바뀐다.
- **방 존재 검증 추가** — `:id` 가 실재하는 방인지 확인하지 않는다. 방별 접근 권한은 `spec-v2.md` 2장이 YAGNI 로 배제했다 (§C).

  > **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 이 항목은 `SPEC-ROOMAUTHZ-001` 이 처리했다. 별도의 존재 검증 계층을 만든 것이 아니라, 멤버십 게이트가 없는 방을 함께 거른 결과다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.
- **스키마 변경** — `db.ts` 의 `SCHEMA` 를 건드리지 않는다. SSE 는 어떤 테이블도 읽거나 쓰지 않는다. REQ-SSE-011 이 금지하고, 필요해 보이면 진행을 멈추고 보고한다.
- **새 소스 파일 생성** — `gateway.ts`·`routes-messages.ts` 스텁을 미리 만들지 않는다. "어차피 같은 카드에서 필요하니까"가 가장 흔한 이유이고, AC-SSE-010 이 기계적으로 잡는다.
- **새 의존성 추가** — SSE 는 Node 표준 `http.ServerResponse` 만으로 구현된다. SSE 라이브러리를 끌어오지 않는다. AC-SSE-012 가 import 줄 수로 잡는다.
- **`toContain` 으로 프레임 검사** — 끝의 빈 줄(`\n\n`)이 없어도 통과한다. 브라우저 `EventSource` 는 그것 없이 이벤트를 방출하지 않으므로 `toBe` 로 바이트를 못 박는다 (AC-SSE-004).
- **테스트에서 서버·리더 안 닫기** — vitest 프로세스가 종료되지 않는다. `cleanups` 배열과 `afterEach` 를 반드시 쓴다.
- **고정 `setTimeout` 으로 `close` 기다리기** — 기계 부하에 따라 간헐 실패한다. `waitFor` 로 상한 안에서 폴링하고, 상한 초과를 명시적 실패로 만든다.
- **AC-SSE-009 를 진짜 `data/` 로 통과시키기** — `buildServer()` 는 `config.dataDir` 를 연다. 임시 경로로 격리한 뒤 통과시킨다 (§F M2 단계 1).
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-SSE-011 의 전이 증거를 만들 수 없다.
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡히고, 스테이지된 변경은 `--cached` 없이는 보이지 않는다. `spec_base_sha` 를 기준으로 비교한다 (M1 단계 0).
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 가 종료 코드 `0` 으로 SHA 를 내는 것을 먼저 확인한다 (AC-SSE-010).
- **`npm test -w server` 종료 코드만 보고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않으므로, 테스트를 하나도 안 쓴 실행도 종료 코드 `0` 이다. 이 SPEC 의 기준들은 모두 자기 테스트 본문을 직접 제시하므로 이름 확인이 필수는 아니지만, 특정 테스트의 통과를 근거로 삼을 때는 `--reporter=verbose` 로 `✓` 줄을 직접 본다.

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md`, `spec-v2.md` — **이 SPEC 의 유일한 규범 근거**(읽기 전용). 같은 디렉터리의 `plan.md`·`spec.md` 는 폐기된 v1 이며 참조하지 않는다.
- `spec.md` — 이 SPEC 의 GEARS 요구사항(REQ-SSE-001..011)과 범위 경계
- `acceptance.md` — AC-SSE-001..012, 공통 테스트 골격, 엣지 케이스
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 7 — 원본 (읽기 전용). Task 8·9·10 은 이 SPEC 의 `publish` 소비자
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-A·4-C·7장 — 서버 모듈, 웹 UI, 사람→봇 흐름
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `config`)
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (인증·`requireAuth`)
- `.moai/specs/SPEC-ROOM-001/` — 선행 SPEC. `plan.md` §D 8번이 `config.dataDir` 지연 평가 기록이며, AC-SSE-009 의 데이터 디렉터리 격리가 그것에 의존한다
- `.moai/specs/SPEC-BOT-001/` — 같은 저장소의 직전 SPEC. `plan.md` §D 3번이 §D 5번(채널 설정 전달 방식)의 원 기록이고, `acceptance.md` 의 기준 강화 경위가 이 SPEC 의 `acceptance.md` 서두와 같은 결함 부류를 다룬다
