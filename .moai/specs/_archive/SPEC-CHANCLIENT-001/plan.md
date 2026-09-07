# SPEC-CHANCLIENT-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 12 와 Global Constraints 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M4`(카드 `t4`)와는 다른 층위다.

---

## §A 실행 순서와 의존

원본 Task 12 의 `Consumes` 는 "없음(독립)" 이고, 이 SPEC 은 실제로 다른 SPEC 의 코드를 하나도 import 하지 않는다.

그러나 **테스트를 실행하려면 `channel/` 워크스페이스가 존재해야 한다.** 그 스캐폴드는 `SPEC-CHANNEL-001`(원본 Task 11) 소유이고, `spec.md` 의 `depends_on: [SPEC-CHANNEL-001]` 이 그 선행을 선언한다. **코드 import 가 아니라 패키지 스캐폴드 선행**이라는 구분은 유효하지만, `depends_on` 이 표현하는 것은 import 그래프가 아니라 착수 가능 조건이다 — 비워 두면 스케줄러가 이 SPEC 을 먼저 띄울 수 있고, 그러면 아래 세 확인이 전부 실패한다. 착수 전 확인 대상이다.

```bash
# 착수 전 확인. 셋 다 성립해야 M1 을 시작한다.
test -f channel/package.json                                  # 워크스페이스가 있다
node -e "require('./package.json').workspaces.includes('channel')||process.exit(1)"
npm ls -w channel ws vitest                                   # ws 와 vitest 가 설치돼 있다
```

세 확인 중 하나라도 실패하면 **직접 만들지 않는다.** `channel/package.json` 을 이 SPEC 에서 만들면 AC-CHANCLIENT-015 의 범위 경계 검사가 형제 SPEC 소유 파일을 잡아내고, 그것이 옳은 판정이다. 스캐폴드가 없으면 중단하고 리드에 보고한다.

| 출처 | 받아 쓰는 것 | 성격 |
|------|-------------|------|
| `SPEC-CHANNEL-001` | `channel/package.json`, `channel/tsconfig.json`, `ws`·`vitest`·`@types/ws` | **실행 전제 — `depends_on` 에 선언됨.** 없으면 어떤 기준도 실행되지 않는다 |
| `SPEC-GATEWAY-001` | 프레임의 `type` 값과 필드 이름 | **상대편 계약.** 이 SPEC 은 해석하지 않고 통과시킨다 |
| (없음) | 코드 의존 | 테스트는 가짜 `WebSocketServer` 를 상대한다 |

이 SPEC 의 **소비자**는 `SPEC-CHANWIRE-001`(원본 Task 13)이다. 그쪽이 `createGatewayClient` 를 조립하므로, §C 의 계약 표는 확정 뒤 그 SPEC 이 결합하는 면이다.

## §B 되돌리기 어려운 결정 — 백오프 산술과 그 관측 방법

이 SPEC 에서 가장 되돌리기 비싼 결정이다. 여기서 정한 산술이 "봇이 얼마나 빨리 돌아오는가"와 "그 사실을 어떻게 재는가"를 함께 결정한다.

| 항목 | 값 | 왜 이렇게 정하는가 |
|------|-----|-------------------|
| 초기 대기 | `1000ms` | 원본 그대로. 서버 재시작(수 초)을 몇 번의 시도로 덮는다 |
| 증가 규칙 | 시도할 때마다 두 배 | 원본 그대로. 서버가 오래 죽어 있을 때 연결 시도로 로그를 채우지 않는다 |
| 상한 | `maxBackoffMs`, 기본 `30000ms` | 원본 그대로. 30초는 "사람이 서버를 고치고 기다릴 수 있는" 상한이다 |
| 대기 실행 주체 | 주입된 `sleep`, 없으면 `setTimeout` 기본 구현 | 테스트가 시간을 통제하는 유일한 경로다. 이 주입점이 없으면 §D 1번의 결함이 되살아난다 |
| 리셋 시점 | 소켓 `open` 시 `1000` 으로 | 리셋이 없으면 짧게 끊겼다 붙기를 반복하는 동안 대기가 계속 자란다. 그 변화는 어느 순간에도 오류로 드러나지 않는다 |
| 재시도 상한 | 없다 (무한) | 원본 그대로. 세션이 살아 있는 한 계속 붙으려 하는 것이 이 플러그인의 존재 이유다 |
| 지터 | 없다 | 원본에 없다. 봇 수가 소수라 동시 재접속 몰림이 문제가 되지 않는다 |

`sleep` 이 받는 인자값의 수열은 `[1000, 2000, 4000, 8000, 16000, 30000, 30000, …]` 이다. 여섯 번째가 `32000` 이 아니라 `30000` 인 것이 상한의 관측점이며, AC-CHANCLIENT-012 가 그 자리를 단언한다.

검토 시 이 표가 확인 대상이다. "리셋 시점"을 지우면 AC-CHANCLIENT-013 이 깨지고, 상한을 지우면 AC-CHANCLIENT-012 의 여섯 번째 값이 어긋난다.

## §C 되돌리기 어려운 결정 — 프레임 계약

이 소켓을 오가는 프레임의 모양이다. 확정 뒤에는 서버 게이트웨이(`SPEC-GATEWAY-001`)와 채널 배선(`SPEC-CHANWIRE-001`)이 양쪽에서 여기에 결합한다. 이 SPEC 은 계약을 **정하지 않고 따른다** — 아래는 원본에서 옮긴 것이며, 바꿔야 할 것처럼 보이면 중단하고 보고한다.

### 나가는 프레임 (클라이언트 → 게이트웨이)

| 시점 | 프레임 |
|------|--------|
| 소켓 `open` 직후, 첫 프레임 | `{ "type": "hello", "token": "<opts.token>" }` |
| `send(payload)` | `payload` 를 그대로 직렬화 |
| `requestHistory(params)` | `{ "type": "history_request", "rid": "<uuid>", ...params }` — 다섯 키는 **최상위** |

### 들어오는 프레임 (게이트웨이 → 클라이언트)

| `type` | 처리 |
|--------|------|
| `welcome` | `onWelcome(msg)` — 객체 그대로. `missed_after_id` 를 포함한다 |
| `message` | `onMessage(msg)` — 객체 그대로. `files`·`delivery` 를 포함한다 |
| `permission_verdict` | `onVerdict(msg)` — 객체 그대로 |
| `history_response` | `rid` 로 대기 맵 조회 → 타이머 해제 → 맵에서 제거 → **프레임 전체**로 resolve |
| 그 외 | **아무것도 하지 않는다.** `else` 로 흘려보내지 않는다 |

### 타임아웃

```ts
const HISTORY_TIMEOUT_MS = 10_000
```

원본 그대로다. 완화도 강화도 하지 않는다. AC-CHANCLIENT-009 가 9,999ms 와 10,000ms 양쪽에서 이 값을 조인다.

## §D 원본 문서 모순과 해결

### 1. [차단급] 원본 테스트가 고정 시간 대기로 결과를 기다린다

`plan-v2.md` Task 12 Step 1 의 네 테스트는 모두 이 형태를 쓴다.

```ts
client.start()
await new Promise(r => setTimeout(r, 100))
expect(srv.messages[0]).toEqual({ type: 'hello', token: 'tok123' })
```

100ms 는 로컬 소켓 왕복(수 ms)의 여유분이지 보장이 아니다. CI 나 부하가 걸린 개발 기계에서 이 형태는 **구현이 완벽해도 실패한다** — 공허한 기준의 반대 방향, 즉 정상 구현을 거짓 실패시키는 기준이다. 그리고 그 실패는 거의 항상 "100 을 300 으로" 늘려 덮이며, 그때부터 그 테스트는 아무것도 재지 않으면서 실행 시간만 먹는다.

**해결**: `acceptance.md` 의 공통 하네스가 조건 폴링 `waitFor` 를 제공하고, 모든 시나리오가 그것을 쓴다. 조건이 성립하지 않으면 반환하지 않고 vitest 테스트 타임아웃으로 실패한다 — 실패의 의미가 "오지 않았다" 하나로 좁혀진다. 원본을 고치는 것이 아니라 같은 관측을 흔들리지 않는 방법으로 하는 것이라, 계약 변경이 아니다.

**이 부류가 이 SPEC 에 특히 위험한 이유를 기록해 둔다** — 이 부품의 관측 대상 대부분(연결, 재접속, 프레임 도착)이 비동기 I/O 라, 고정 시간 대기를 쓸 자리가 아홉 군데가 넘는다. 한 곳만 남겨도 그 파일 전체가 간헐 실패하는 파일이 된다.

### 2. [차단급] `wss.close()` 만으로는 기존 연결이 끊기지 않을 수 있다

원본의 재접속 테스트는 `srv.wss.close()` 한 줄로 클라이언트가 절단을 감지하기를 기대한다.

```ts
srv.wss.close()   // 연결 끊김
await new Promise(r => setTimeout(r, 50))
```

`ws` 의 `WebSocketServer.close()` 는 **리스닝을 멈추고 서버를 닫는 것**이 주 동작이며, 이미 수립된 연결의 종료는 그 뒤 소켓 상태에 달려 있다. 클라이언트가 `close` 이벤트를 받지 못하면 재접속 경로 자체가 시작되지 않고, 그 테스트는 `sleeps.length >= 1` 에서 실패한다 — 역시 구현이 옳아도 실패하는 자리다.

**해결**: 하네스에 `stopServer(srv)` 를 두어 **수립된 소켓을 먼저 `terminate()` 한 뒤** 서버를 닫는다. 재접속 기준의 전제는 "클라이언트가 `close` 를 본다" 이고, 그 전제를 우연에 맡기지 않는다.

### 3. [차단급] 원본의 재접속 테스트가 재접속을 검증하지 않는다

원본의 마지막 테스트는 이렇게 끝난다.

```ts
const srv2 = startServer(() => {})
;(client as any).opts.url = `ws://127.0.0.1:${srv2.port()}/bot`
await new Promise(r => setTimeout(r, 300))
expect(sleeps.length).toBeGreaterThanOrEqual(1)
```

단언은 하나뿐이고, 그것은 **"대기를 한 번 이상 했다"** 이다. 두 번째 서버가 실제로 연결을 받았는지, hello 가 다시 갔는지, 대기 시간이 얼마였는지는 아무것도 보지 않는다. 그래서 다음이 모두 이 테스트를 통과한다 — 재접속을 아예 시도하지 않고 대기만 하는 구현, `url` 을 캐시해 죽은 첫 주소로만 시도하는 구현, 백오프가 즉시(0ms)인 구현.

같은 파일의 첫 테스트에도 같은 부류가 있다.

```ts
expect(got.map(g => g.type ?? 'message')).toContain('message')
```

`?? 'message'` 때문에 `type` 이 없는 무엇이든 `'message'` 로 매핑된다. 콜백에 빈 객체를 하나 밀어 넣는 구현도 통과한다.

**해결**: `acceptance.md` 가 이 자리를 셋으로 나눠 각각 관측 가능한 결과를 붙였다 — AC-CHANCLIENT-011(새 주소로 재접속 + hello 재전송 + 첫 대기 `1000`), AC-CHANCLIENT-012(대기 수열 전체), AC-CHANCLIENT-013(성공 뒤 리셋). 원본 테스트를 회귀 방지선으로 파일에 남기더라도 **판정은 새 기준이 진다**.

### 4. 원본 테스트의 `url` 옵션 형태가 주석과 어긋난다

원본은 `url: () => \`ws://…${srv.port()}/bot\`` 로 함수를 주며 주석에 "url은 함수도 허용(재접속 시 재평가)" 이라 적고, 세 줄 뒤에 같은 필드에 **문자열**을 대입한다. 두 형태를 한 테스트에서 섞은 셈이라 어느 쪽이 검증됐는지 알 수 없다.

**해결**: 모순이 아니라 계약이 두 형태를 모두 허용하는 것이므로(REQ-CHANCLIENT-002), 기준을 둘로 갈라 각각 하나씩 덮는다 — AC-CHANCLIENT-011 이 **문자열 교체**를, AC-CHANCLIENT-013 이 **함수 재평가**를 관측한다. `opts` 가 인터페이스에 선언돼 있으므로 원본의 `(client as any)` 캐스팅은 필요 없다.

### 5. [의도적 이탈] `requestHistory` 안의 `this.send`

원본 구현은 반환 객체 리터럴 안에서 형제 메서드를 `this` 로 부른다.

```ts
return {
  send(payload) { /* … */ },
  requestHistory(params) {
    /* … */
    if (!this.send({ type: 'history_request', rid, ...params })) { /* … */ }
  },
}
```

호출자가 `const { requestHistory } = client` 처럼 구조 분해하면 `this` 가 `undefined` 가 되어 런타임에 깨진다. 이 클라이언트의 소비자는 `SPEC-CHANWIRE-001` 이고, 그쪽이 구조 분해를 쓸지 여부는 이 SPEC 이 통제하지 못한다.

**해결**: `send` 를 클로저 안의 지역 함수로 두고 반환 객체는 그것을 위임하게 한다. `this` 를 쓰지 않으면 호출 형태와 무관하게 동작한다.

```ts
function send(payload: object): boolean { /* … */ }
return { opts, start, stop, send, requestHistory }   // requestHistory 도 지역 send 를 부른다
```

이탈의 범위는 **함수를 어디에 두는가** 하나이고, 공개 계약(시그니처·반환값·프레임)은 그대로다. 원본 테스트도 깨지지 않는다. 이 이탈이 불필요하다고 판단되면 원본 형태로 되돌려도 어떤 수용 기준도 바뀌지 않는다 — 다만 구조 분해 사용이 금지된다는 사실이 `SPEC-CHANWIRE-001` 로 전파돼야 한다.

### 6. `requestHistory` 의 반환형이 `any`

`Promise<any>` 는 원본 계약 그대로다. 이력 응답의 모양은 게이트웨이가 정하고 그것을 문자열로 빚는 일은 `SPEC-CHANWIRE-001` 이 하므로, 이 SPEC 이 좁혀 선언하면 필드가 늘 때마다 두 곳을 고쳐야 한다.

대가는 명확하다 — 응답 필드가 바뀌어도 타입 검사로 잡히지 않는다. 그래서 AC-CHANCLIENT-008 이 resolve 된 값을 **프레임 전체**로 단언해, `messages` 만 꺼내는 구현과 필드를 잃는 구현을 런타임에서 잡는다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| 재접속을 아예 하지 않는다 | 세션은 살아 있는데 방에서만 사라진다. 사람은 멘션을 계속 보내고 어떤 오류도 뜨지 않는다 | AC-CHANCLIENT-011 이 두 번째 서버가 실제로 연결을 받았는지 관측 |
| 상한 없이 두 배씩 증가 | 서버가 오래 죽어 있으면 대기가 분 단위로 자라, 서버가 살아난 뒤에도 봇이 한참 돌아오지 않는다 | AC-CHANCLIENT-012 의 여섯 번째 값(`30000`) 단언 |
| `open` 에서 백오프를 리셋하지 않음 | 짧게 끊겼다 붙기를 반복하는 동안 서서히 30초를 기다리는 봇이 된다. 어느 순간에도 오류가 아니다 | AC-CHANCLIENT-013 이 2차 절단 직후의 대기값을 직접 관측 |
| `stop()` 뒤에도 재접속 | 세션이 끝났는데 소켓이 살아 있고, 프로세스가 종료되지 않는다 | AC-CHANCLIENT-014 가 대조군 기준선으로 부정 관측 |
| 모르는 프레임을 `else` 로 `onMessage` 에 흘림 | 서버가 나중에 새 프레임을 추가하면 봇이 그것을 사람의 메시지로 착각해 답한다 | AC-CHANCLIENT-005 가 순서를 이용해 부정 관측 |
| `rid` 를 보지 않고 도착 순서로 매칭 | 두 이력 요청이 겹치면 서로의 답을 받는다. 봇은 엉뚱한 구간의 대화를 자기 맥락으로 삼는다 | AC-CHANCLIENT-008 이 응답을 역순으로 보내 관측 |
| `since_id` 누락 | 시각 기반 근사 커서로 되돌아가 같은 메시지를 다시 받거나 건너뛴다. 오류로 드러나지 않는다 | AC-CHANCLIENT-007 이 프레임 최상위를 `toEqual` 로 단언 |
| `welcome` 을 세 필드만 추려 넘김 | 해석하지 않는 필드가 채널 경계에서 소리 없이 사라진다 — 지금의 `missed_after_id` 도, 나중에 늘어날 필드도. 타입 검사로 잡히지 않는다 | AC-CHANCLIENT-002 가 그 필드를 직접 단언 |
| 실 WebSocket 을 쓰는 테스트가 불안정 | 포트 0 바인딩·비동기 수신 타이밍으로 간헐 실패 가능 | 고정 시간 대기를 전부 `waitFor` 로 바꾸고(§D 1번), 정리는 `cleanups` 가 일괄 실행한다. 간헐 실패가 나면 원인을 규명하고 기록한다 — 대기를 늘려 덮지 않는다 |
| 열린 소켓·서버가 남아 vitest 가 종료되지 않는다 | CI 가 매달린다. 개별 테스트가 정리를 맡으면 한 곳만 빠뜨려도 재발한다 | 정리 책임을 `cleanups` 로 옮겼다. 시나리오 본문에 정리 코드가 없으므로 빠뜨릴 자리 자체가 없다 |
| 가짜 타이머가 정리 경로를 막는다 | AC-CHANCLIENT-009 뒤의 `afterEach` 가 서버 종료 콜백을 기다리며 멈춘다 | `afterEach` 가 `vi.useRealTimers()` 를 **정리보다 먼저** 부른다 |
| 죽은 주소 재시도가 빠르게 돌아 CPU 를 태운다 | 주입된 `sleep` 이 즉시 반환하면 연결 실패 루프가 조인다 | 하네스의 주입 `sleep` 이 1ms 를 실제로 기다린다. 8회 관측에 드는 실제 시간은 수십 밀리초다 |
| 타임아웃된 요청의 늦은 응답 | 이미 지워진 `rid` 라 무시된다 | 수용. 대기 맵 조회가 실패하면 아무 일도 일어나지 않는다 |
| `start()` 중복 호출 | 소켓이 두 개 열린다 | **미검증 — 수용.** 원본에 가드가 없고, 호출자는 조립 시 한 번만 부른다 |
| 스캐폴드 미완료 상태에서 착수 | `npm test -w channel` 이 없는 워크스페이스를 가리켜 import 단계에서 깨진다 | §A 의 세 확인을 M1 시작 전 체크리스트로 쓴다 |

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다 — M2 의 이력·재접속 테스트가 M1 의 연결 경로를 쓴다.

### M1 — 연결·분배·송신 (우선순위 High)

원본: `plan-v2.md` Task 12 Step 1-3 중 `connect`/`hello`/수신 분배/`send` 경로.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` §E.1 에 적는다. M2 단계 6 의 범위 경계 검사가 이 값을 기준으로 비교한다. 같은 단계에서 §A 의 세 확인을 실행하고 출력을 남긴다.
1. `channel/test/gateway-client.test.ts` 를 만들고 `acceptance.md` 의 공통 하네스와 `describe('gateway client', ...)` 를 쓴다. 이 마일스톤의 테스트는 AC-CHANCLIENT-001 부터 006 까지다.
2. **RED 확인**: `npm test -w channel` → `Cannot find module '../src/gateway-client.js'` 로 실패. 출력 원문 기록.
3. `channel/src/gateway-client.ts` 를 만든다 — `UrlRef`·`GatewayClientOpts`·`GatewayClient` 타입, `createGatewayClient`, `connect()`(open 시 hello 전송), 수신 분배(`welcome`/`message`/`permission_verdict` 세 갈래, 그 외는 무시), 지역 `send`(§D 5번), `start`/`stop`, `opts` 노출. `requestHistory` 는 이 단계에서 `Promise.reject` 만 돌려주는 껍데기로 두고, 재접속은 아직 붙이지 않는다.
4. **GREEN 확인**: `npm test -w channel` → M1 테스트 통과. `npm run typecheck -w channel` → 종료 코드 `0`.
5. 커밋: `feat: gateway websocket client with handshake and frame routing`

수용 기준: AC-CHANCLIENT-001, 002, 003, 004, 005, 006, AC-CHANCLIENT-016(전이 1-2).

### M2 — 이력 요청과 재접속 백오프 (우선순위 High)

원본: `plan-v2.md` Task 12 Step 1-3 중 `requestHistory`/`retry` 경로.

1. 같은 테스트 파일에 AC-CHANCLIENT-007 부터 014 까지의 테스트를 추가한다. 원본의 `requestHistory matches rid and resolves` 와 `reconnects with injected sleep after server close` 두 테스트를 회귀 방지선으로 남길 수 있으나, **판정은 새 기준이 진다** — 원본 두 개는 §D 3번의 이유로 잘못된 구현을 통과시킨다.
2. **RED 확인**: `npm test -w channel` → 새 단언 실패. **모듈 부재가 아니라 단언 실패임을 출력에서 확인하고 기록한다** (AC-CHANCLIENT-016 전이 3).
3. `requestHistory` 를 구현한다 — `randomUUID()` 로 `rid` 생성 → 10초 타이머 등록 → 대기 맵 등록 → `send({ type:'history_request', rid, ...params })` → `false` 면 타이머 해제·맵 제거 후 즉시 reject. 수신 분배에 `history_response` 갈래를 더한다(맵 조회 → 타이머 해제 → 제거 → 프레임 전체로 resolve).
4. 재접속을 붙인다 — `close` 핸들러에서 `stopped` 가 아니면 `retry()`; `retry()` 는 `sleep(backoff)` 뒤 `backoff = Math.min(backoff * 2, maxBackoff)` 하고 `connect()`; `open` 에서 `backoff = 1000` 리셋; `error` 핸들러는 비워 두고 재접속은 `close` 경로 하나로만 일어나게 한다. `stop()` 은 `stopped = true` 뒤 소켓을 닫는다.
5. **GREEN 확인**: `npm test -w channel` → 전체 통과. typecheck 종료 코드 `0`. **명령이 스스로 종료하는지** 확인한다 — 매달리면 정리 경로가 새는 것이다.
6. **범위 경계 확인** (AC-CHANCLIENT-015): `git rev-parse --verify "$(cat .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 먼저 확인하고, 그 뒤에만 `git diff --name-only` 와 무상태 `grep` 으로 넘어간다. **기준 커밋 없이 `git diff` 를 쓰지 않는다** — M1 커밋 이후라 `HEAD` 기준으로는 아무것도 잡히지 않는다. **빈 출력 하나만 보고 통과로 적지도 않는다** — 기준 SHA 가 없어도 표준 출력은 비어 있다.
7. 커밋: `feat: history request matching and reconnect backoff for gateway client`

수용 기준: AC-CHANCLIENT-007, 008, 009, 010, 011, 012, 013, 014, 015, AC-CHANCLIENT-016(전이 3-4).

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-CHANCLIENT-001..016 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` §E.2 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **고정 시간 대기로 결과를 기다리기** — 이 SPEC 에서 가장 위험한 실수다. `await new Promise(r => setTimeout(r, 100))` 뒤에 단언을 두면 그 테스트는 느린 기계에서 정상 구현을 거짓 실패시키고, 그 실패는 대기를 늘리는 방향으로 덮인다. `waitFor` 로 조건을 기다린다 (§D 1번).
- **간헐 실패를 대기 연장으로 덮기** — 흔들리면 원인을 규명해 §E 에 적는다. 대기 시간을 늘리는 수정은 원인을 지우는 것이 아니라 증상을 숨기는 것이다.
- **실제로 30초를 기다려 상한을 확인하기** — 백오프 기준은 주입된 `sleep` 이 받은 **인자값**으로만 잰다. 벽시계는 어느 기준에서도 판정 근거가 아니다.
- **`sleeps.length >= 1` 만 단언하고 재접속을 검증했다고 적기** — 원본 테스트가 그렇게 되어 있고, 재접속을 아예 시도하지 않는 구현도 그 단언을 통과한다 (§D 3번).
- **`?? 기본값` 을 끼운 단언 쓰기** — `g.type ?? 'message'` 는 `type` 이 없는 무엇이든 통과시킨다. 기본값으로 메운 값을 단언하지 않는다.
- **수신 분배의 마지막 갈래를 `else` 로 두기** — 모르는 프레임이 `onMessage` 로 새면 봇이 그것을 사람의 말로 착각해 답한다. `type` 값에 의한 배타 분기로 쓴다 (REQ-CHANCLIENT-006).
- **콜백에 넘길 객체를 새로 만들기** — `{ room_id, bot_id, bot_name }` 처럼 필드를 추려 넘기면 `missed_after_id` 가 조용히 사라진다. 받은 프레임을 그대로 넘긴다 (REQ-CHANCLIENT-003).
- **`resolve` 할 때 `messages` 만 꺼내기** — 프레임 전체로 resolve 한다. 소비자가 `rid` 나 뒤에 추가될 필드를 볼 수 있어야 한다.
- **`params` 를 중첩 객체로 감싸기** — 다섯 키는 프레임 최상위에 그대로 편다. `since_id` 를 빠뜨리는 것도 같은 부류다 (REQ-CHANCLIENT-008).
- **`rid` 없이 도착 순서로 매칭하기** — 대기 자리를 하나만 두는 구현도 여기에 속한다. 두 요청이 겹치면 서로의 답을 받는다.
- **타임아웃 값 조정** — 10초는 계약이다. 테스트를 빨리 끝내려고 줄이지 않는다. 가짜 타이머를 쓰면 실제 시간은 들지 않는다.
- **가짜 타이머를 연결 전에 켜기** — 하네스의 `waitFor` 가 `setTimeout` 위에 서 있어 스스로 진행하지 못한다. 연결을 마친 뒤에 켠다 (AC-CHANCLIENT-009).
- **`vi.useRealTimers()` 를 정리 뒤로 미루기** — 가짜 타이머 위에서 서버 종료 콜백을 기다리면 `afterEach` 가 멈춘다. 정리보다 먼저 부른다.
- **정리 책임을 개별 테스트로 되돌리기** — 각 테스트 끝에 `client.stop(); srv.wss.close()` 를 쓰는 형태로 돌아가지 않는다. 한 곳만 빠뜨려도 vitest 가 종료되지 않고, 그 누락은 리뷰에서 눈에 띄지 않는다. `cleanups` 등록이 유일한 정리 경로다.
- **`wss.close()` 하나로 절단을 재현하기** — 기존 연결이 남으면 클라이언트가 `close` 를 보지 못해 재접속 경로가 시작되지 않는다. 소켓을 먼저 끊는다 (§D 2번).
- **`this.send` 로 형제 메서드 부르기** — 소비자가 구조 분해하면 런타임에 깨진다. 지역 함수로 둔다 (§D 5번).
- **보내지 못한 payload 를 큐에 쌓기** — 원본에 없다. 재전송 책임은 서버의 `missed_after_id` 커서에 있고, 큐를 만들면 무상태 조항과도 부딪힌다.
- **`process.env` 를 직접 읽기** — `url` 과 `token` 은 오직 `opts` 로 들어온다. 환경변수를 읽는 일은 `SPEC-CHANWIRE-001` 소유다. AC-CHANCLIENT-015 의 `grep` 이 이것을 잡는다.
- **디스크에 무엇이든 쓰기** — 채널 플러그인은 무상태다. Global Constraints 조항이며 예외가 없다.
- **형제 SPEC 소유 파일 만들기** — `channel/package.json` 이 없다고 직접 만들지 않는다. 중단하고 보고한다 (§A).
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-CHANCLIENT-016 의 전이 증거를 만들 수 없다. 특히 전이 3 은 **모듈 부재가 아닌 단언 실패**여야 한다.
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡힌다. `spec_base_sha` 를 기준으로 비교한다.
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 의 종료 코드 `0` 을 먼저 확인한다.
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않는다. 이름 붙은 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다.

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 12 — **이 SPEC 의 원본**(읽기 전용). Task 8 이 게이트웨이 계약, Task 11·13·14 가 형제 SPEC 의 원본
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B — 채널 계약
- `spec.md` — GEARS 요구사항(REQ-CHANCLIENT-001..014)과 범위 경계
- `acceptance.md` — AC-CHANCLIENT-001..016, 공통 테스트 하네스
- `progress.md` — 단계별 증거 기록처
- `.moai/specs/SPEC-CHANNEL-001/` — 채널 패키지 스캐폴드 (실행 전제)
- `.moai/specs/SPEC-CHANWIRE-001/` — 이 클라이언트의 소비자
- `.moai/specs/SPEC-CHANPERM-001/` — 채널 권한 릴레이
- `.moai/specs/SPEC-GATEWAY-001/` — 서버 쪽 게이트웨이 (상대편 계약)
