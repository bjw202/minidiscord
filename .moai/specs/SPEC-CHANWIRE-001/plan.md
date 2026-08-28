# SPEC-CHANWIRE-001 구현 계획

> 이 문서는 `spec.md` 의 요구사항을 **어떻게** 세울지를 정한다. 무엇을 만들지는 `spec.md`, 무엇으로 판정할지는 `acceptance.md` 가 소유한다.

바꾸기 어려운 결정을 앞에 둔다 — 사람이 검토할 때 되돌리기 비싼 것부터 보게 하려는 배치다. §B·§C 가 계약이고, §D 부터는 그 계약을 지키기 위한 기술적 처리다.

---

## §A 실행 순서와 의존

| 선행 | 이 SPEC 이 받아 쓰는 것 | 없으면 |
|------|------------------------|--------|
| `SPEC-CHANNEL-001` | `createChannelServer`, `ChatMessage`, `reply`·`fetch_history` 도구 | 배선할 대상이 없다. 이 SPEC 은 시작할 수 없다 |
| `SPEC-CHANCLIENT-001` | `createGatewayClient`, `send`/`start`/`stop`/`requestHistory` | 같음 |
| `SPEC-GATEWAY-001` (서버) | 프레임을 받아 줄 상대 | 테스트는 스텁으로 대신할 수 있으므로 **차단되지 않는다**. 실사용 검증만 미뤄진다 |

두 채널 SPEC 이 `channel/src/` 에 실제 파일을 남긴 뒤에 이 SPEC 의 run 단계가 시작된다. 세 SPEC 이 같은 패키지를 나눠 갖되 파일은 겹치지 않는다 — 이 SPEC 이 만지는 파일은 `channel/src/index.ts` 와 `channel/test/index-wiring.test.ts` 둘뿐이다(REQ-CHANWIRE-013).

후행: `SPEC-CHANPERM-001` 이 이 SPEC 의 `wire()` 를 확장한다. 그래서 `wire()` 의 반환 형태는 그 SPEC 이 손댈 자리를 남겨 두어야 한다 — §B 참조.

---

## §B 되돌리기 어려운 결정 — `wire()` 가 두 핸들을 모두 내준다

`wire()` 는 배선을 세우기만 하고 **시작하지 않는다.** 접속(`gw.start()`)과 stdio 연결(`channel.server.connect(...)`)은 호출자의 몫이다.

이 결정이 되돌리기 어려운 이유는 세 소비자가 서로 다른 방식으로 이 함수를 쓰기 때문이다.

| 소비자 | 필요한 것 |
|--------|----------|
| 진입점(이 SPEC) | 둘 다 시작한다 |
| 이 SPEC 의 테스트 | `gw.start()` 는 부르지만 stdio 대신 `InMemoryTransport` 를 붙인다 |
| `SPEC-CHANPERM-001` | 같은 `channel` 핸들에 권한 콜백을 더 얹는다 |

`wire()` 가 안에서 `start()` 까지 해 버리면 테스트가 접속 시점을 제어할 수 없고, `channel` 만 돌려주면 권한 릴레이가 게이트웨이로 나갈 길을 잃는다. 그래서 **시작하지 않고, 둘 다 돌려준다**가 계약이다.

`sendPermissionRequest` 자리는 비워 둔다. 이 SPEC 에서 임시 구현을 넣어 두면 후행 SPEC 이 그것을 지우는 일부터 해야 하고, 그 사이 어떤 테스트도 그 자리를 지키지 않는다.

---

## §C 되돌리기 어려운 결정 — 봇 밖으로 나가는 계약

이 배선이 게이트웨이로 내보내는 프레임은 서버 SPEC 이 이미 읽는 형식이다. 여기서 한 글자라도 다르면 서버가 조용히 무시한다 — 오류가 나지 않는다는 것이 이 자리의 위험이다.

### 게이트웨이로 나가는 프레임 세 종류

```jsonc
{ "type": "bot_message", "body": "<reply 의 text 그대로>", "files": [{ "local_path": "<경로>" }] }
{ "type": "status", "state": "working" }   // TO 수신 시
{ "type": "status", "state": "idle" }      // bot_message 전송 직후
```

`files` 의 원소는 `{ local_path }` 다. 서버의 `handleBotMessage` 는 `f.local_path` 를 읽어 파일을 복사하고, `f.name` 이 없으면 경로의 basename 을 파일명으로 쓴다 — 그래서 `name` 을 싣지 않는 원본 매핑은 서버 계약과 어긋나지 않는다. 반대로 경로 문자열을 그대로 배열에 넣으면 `f.local_path` 가 `undefined` 가 되어 **모든 첨부가 조용히 사라진다**(첨부 실패는 서버에서 try/catch 로 삼켜진다).

### 세션 쪽으로 나가는 이력 텍스트

```
#<id> [<created_at>] <author_name>: <body>
```

줄 사이는 개행 하나, 빈 결과는 `'(기록 없음)'`. 이 형식은 채널 지시문과 짝이다 — 지시문이 봇에게 "각 줄 앞의 `#번호` 를 기억해 두었다가 다음에 `since_id` 로 넘기라"고 시키므로, 번호를 빼면 지시문이 가리키는 것이 사라진다. 번호는 서버의 `missed_after_id` 커서와 같은 원시어라 새 개념을 들이지 않는다.

### 진입점의 환경변수

```
MINIDISCORD_TOKEN   — 없으면 게이트웨이에 붙지 않는다 (stdio 는 그대로 연결한다)
MINIDISCORD_SERVER  — 없으면 'ws://127.0.0.1:3000/bot'
```

두 부작용은 **서로 다른 조건에 걸린다**. stdio 연결은 진입점 가드(직접 실행인가)만 통과하면 되고, 게이트웨이 접속은 그 안쪽에서 토큰 게이트를 한 번 더 통과해야 한다. 근거는 §D 3번이다.

기본 주소는 문자열 하나까지 계약이다. 서버를 기본 포트로 띄우고 환경변수 없이 봇을 붙이는 것이 표준 사용법이기 때문이다. 그 해석은 `resolveUrl(env)` 로 끌어내 **포트를 점유하지 않고** 잰다 — 3000 번은 이 프로젝트 서버 자신의 기본 포트라, 거기에 테스트 스텁을 바인딩하면 서버를 띄워 둔 개발자에게 정상 구현이 거짓 실패한다.

---

## §D 원본 문서 모순과 해결

### 1. [차단급] 원본 테스트 하네스가 `setNotificationHandler` 에 zod 스키마가 아닌 객체를 넘긴다

`plan-v2.md` Task 13 Step 1 의 원본은 이렇게 쓴다.

```ts
obs.setNotificationHandler({ method: 'notifications/claude/channel' } as any, n => notified.push(n))
```

MCP SDK 의 `Protocol.setNotificationHandler` 는 인자에서 `schema.shape.method.value` 를 읽어 등록 키를 만든다. 평범한 객체에는 `shape` 가 없으므로 그 자리에서 `TypeError` 가 나고, **배선이 완벽해도 알림을 관측하는 기준이 전부 실패한다.** `as any` 가 붙어 있어 타입 검사도 이 실수를 가려 준다.

해결: `acceptance.md` 공통 하네스에서 zod 스키마(`ChannelNotification`)로 교정했다. 형제 SPEC 들이 하네스 결함(`set-cookie` 를 배열로 가정한 건)을 각각 교정하며 남긴 것과 같은 부류 — **스텁·하네스가 정상 구현을 거짓 실패시키는** 결함이라, 요구사항 훑기로는 걸러지지 않는다. 같은 부류(SDK 객체에 `as any` 를 씌워 형태 가정을 우회하는 자리)를 이 SPEC 의 하네스 전체에서 훑어 다른 자리가 없음을 확인한다 — M1 단계 0 의 점검 항목이다.

### 2. 원본 테스트가 "cc 에는 working 이 없다"를 재지 않는다

원본 테스트의 세 번째 절은 주석에 "cc 메시지는 전달되지만 status working 없음"이라고 적어 두고, 정작 단언은 `expect(notified.length).toBe(before + 1)` 하나뿐이다. 부재를 재는 단언이 없으므로 **모든 수신에 `working` 을 보내는 구현이 그대로 통과한다.** 주석이 의도를 밝히고 있으니 요구사항은 명확하다 — 빠진 것은 검증이다.

해결: AC-CHANWIRE-002 가 cc push 전후의 `working` 프레임 **수**를 비교한다. 요구사항 쪽에도 REQ-CHANWIRE-010(Unwanted)으로 못 박았다.

### 3. [차단급 — 계약 개정으로 해결] 토큰 게이트가 형제 SPEC 의 stdio 프로브를 무력화한다

원본 진입점은 두 부작용을 **한 조건에 묶는다**.

```ts
if (process.env.MINIDISCORD_TOKEN && process.argv[1]?.includes('index')) {
  ... gw.start(); await channel.server.connect(new StdioServerTransport())
}
```

v0.1.0 은 이것을 그대로 요구사항으로 옮겼다(토큰 없으면 stdio 도 연결하지 않음). 그런데 형제 SPEC `SPEC-CHANNEL-001` 의 세 기준(AC-CHANNEL-002·004·005)은 `node channel/dist/index.js` 를 **토큰 없이** 띄워 stdout 의 `initialize` 응답을 읽는다. 즉 이 SPEC 이 착지하는 순간 그 세 기준은 응답을 한 줄도 받지 못하고 실행 불가가 된다 — 조용한 회귀이고, `npm test` 는 계속 전부 통과한다.

**대안 두 가지를 비교했다.**

| 안 | 내용 | 판정 |
|----|------|------|
| (가) | 토큰 게이트를 그대로 두고, 이 SPEC 에 "토큰 있는 dist 실행" 기준만 추가 | **기각.** 형제 SPEC 의 세 기준이 실행 불가로 남는다. 리드가 "형제 AC 와 모순되지 않아야 한다"고 못 박았다 |
| (나) | stdio 연결은 토큰과 무관하게, 토큰은 게이트웨이 접속만 잠근다 | **채택.** 형제 기준이 그대로 살고, "토큰 없으면 인증이 필요한 접속을 하지 않는다"는 원래 의도도 지켜진다 |

(나)를 채택해 REQ-CHANWIRE-003·004 를 개정했다. 근거는 **토큰이 무엇을 지키는 자물쇠인가**다 — `MINIDISCORD_TOKEN` 은 게이트웨이가 봇을 인증하는 자격증명이지, "이 프로세스가 MCP 로 말해도 되는가"를 정하는 스위치가 아니다. 원본이 둘을 한 줄에 묶은 것은 임포트 부작용을 막으려는 의도였고, 그 역할은 `process.argv[1]` 가드가 이미 혼자 해낸다.

부수 효과 하나: 토큰 없이 띄운 프로세스는 이제 **종료하지 않고** stdio 를 잡은 채 남는다. v0.1.0 이 "자원 없이 정상 종료"로 적었던 관측은 폐기했고, AC-CHANWIRE-014 (b)가 그 자리를 대신한다(응답은 나오고 게이트웨이 연결은 0건).

**남는 미해결 항목(리드 판정 대기).** 토큰을 빠뜨린 사람은 여전히 아무 안내를 받지 못한다 — 봇이 방에 나타나지 않을 뿐이다. stderr 는 stdio 전송(stdout)과 섞이지 않으므로 진단 문구를 stderr 로 내보내는 것은 기술적으로 가능하지만, 문구 신설은 원본에 없는 동작이라 임의로 만들지 않는다(Global Constraints). 리드에게 보고했고, 채택되면 별도 카드가 된다.

### 4. 원본이 고정 `setTimeout(100)` 으로 비동기를 기다린다

원본 테스트는 접속·왕복마다 100ms 를 잰다. 지금 통과하더라도 부하 걸린 기계에서 간헐적으로 무너지고, 무너질 때의 실패 사유가 "배선이 없다"와 구분되지 않는다. 이 프로젝트에서 병렬 세션이 도는 것을 감안하면 실제 위험이다.

해결: 하네스의 `waitFor(조건, 라벨)` 로 바꿨다. 조건이 서면 즉시 진행하고, 서지 않으면 라벨이 붙은 명시적 타임아웃으로 실패한다. 부정 단언(무언가가 **오지 않았다**)에만 고정 여유 시간을 남겨 둔다 — 그 자리는 기다림이 곧 검증이라 대체할 조건이 없다.

### 5. `onMessage` 콜백의 거부가 처리되지 않는다

`gateway-client` 는 `opts.onMessage?.(msg)` 를 await 하지 않고 부른다. 배선의 `onMessage` 는 `async` 이고 안에서 `pushChatMessage` 를 await 하므로, 그 promise 가 거부하면 처리되지 않은 거부가 된다. Node 20 의 기본 설정에서 처리되지 않은 거부는 프로세스를 끝낸다 — 봇이 조용히 죽는다.

이 SPEC 에서는 **원본 형태를 유지하고 위험으로 기록한다.** 콜백 안에 try/catch 를 넣는 것은 오류를 삼키는 쪽이라 진단성이 더 나빠지고, `gateway-client` 쪽을 고치는 것은 선행 SPEC 소유 파일 변경이라 REQ-CHANWIRE-013 이 금지한다. §E 에 남기고 엣지 케이스 표에 "미검증"으로 적었다.

### 6. `gw.send` 의 반환값을 배선이 버린다

`send` 는 연결이 없으면 `false` 를 돌려주는데 배선은 그 값을 보지 않는다. 게이트웨이가 끊긴 동안 세션이 `reply` 를 부르면 도구는 성공으로 끝나고 답변은 어디에도 도착하지 않는다.

형제 SPEC(`SPEC-PERM-001`)은 같은 부류를 **의도적 확장**으로 닫았다 — 전달 실패를 사람이 읽을 수 있게 드러냈다. 여기서 같은 확장을 하려면 "도구 결과 텍스트에 실패를 적을 것인가, 오류를 던질 것인가"를 정해야 하는데 그 문구는 채널 계약이 정하는 자리다. 임의로 만들지 않고 §E 위험으로 남긴다. 재접속 백오프가 붙어 있어 끊긴 상태 자체는 짧다는 것이 이 판단의 근거다.

### 7. `wire()` 안의 상호 참조는 TDZ 를 건드리지 않는다 (확인 결과)

`createGatewayClient` 의 `onMessage` 클로저가 아직 선언되지 않은 `const channel` 을 참조하고, `createChannelServer` 의 콜백이 `gw` 를 참조한다. 선언 전 참조처럼 보이지만 두 콜백 모두 **호출 시점**에야 그 이름을 읽고, 호출은 `gw.start()` 이후에만 일어난다 — `wire()` 가 반환될 때 두 상수는 이미 초기화돼 있다. 지금은 안전하다.

깨지는 조건은 하나다 — `createGatewayClient` 나 `createChannelServer` 가 **생성 중에** 콜백을 동기로 부르게 바뀌는 것. 그러면 `ReferenceError` 가 난다. §E 위험에 적어 둔다.

---

## §E 알려진 위험

| 위험 | 증상 | 완화 |
|------|------|------|
| `onMessage` 거부가 처리되지 않는다 (§D 5) | `pushChatMessage` 가 거부하면 봇 프로세스가 조용히 끝난다 | 미완화. 엣지 케이스에 "미검증"으로 기록. 선행 SPEC 소유 파일이라 이 SPEC 에서 고칠 수 없다 |
| `send` 실패가 드러나지 않는다 (§D 6) | 게이트웨이가 끊긴 동안의 답변이 사라진다 | 미완화. 재접속 백오프가 창을 좁힌다. 문구 신설은 계약 변경이라 리드 판정 대기 |
| 선행 SPEC 이 콜백을 동기로 부르게 바뀐다 (§D 7) | `wire()` 가 `ReferenceError` 로 터진다 | 세 SPEC 이 같은 run 단계에 있으므로 M1 단계 0 에서 실제 시그니처를 읽어 확인한다 |
| 기본 주소 경로가 실제 접속에 쓰이는지는 직접 보지 않는다 | `resolveUrl` 을 우회해 주소를 직접 만드는 구현이 AC-CHANWIRE-011 을 통과한다 | 호출 지점을 하나로 유지한다. 3000 번을 점유하지 않고 이보다 강하게 재는 방법을 찾지 못했으므로 §E.2 Gaps 에 남긴다 |
| 형제 SPEC 이 `tsconfig` 를 `include: ["src"]` 로 좁힌다 | `typecheck` 가 `channel/test/**` 를 검사하지 않아, 하네스의 타입 오류가 조용히 남는다 | 품질 게이트에 단서로 적고 §E.2 Gaps 에 기록한다 (감사 지적 m5) |
| 검증이 띄운 자식 프로세스가 살아남는다 | 좀비가 스텁 포트로 백오프 재접속을 계속 시도해(상한 30초) 뒤따르는 기준의 프레임 계수를 오염시킨다. 증상은 결함이 아니라 간헐 실패로 나타나 진단이 어렵다 | `spawnChild()` 가 `spawn` 직후 `SIGKILL` 정리를 등록하고 `afterEach` 가 모든 경로에서 실행한다. 품질 게이트의 `pgrep` 관측이 사후 확인 |
| `MINIDISCORD_TOKEN` 없이 띄운 프로세스가 종료하지 않는다 | 사람이 토큰을 빠뜨리면 아무 안내 없이 프로세스만 떠 있다 | 계약 개정의 수용된 귀결(§D 3). 진단 문구 신설은 리드 판정 대기 |
| 세 채널 SPEC 이 같은 패키지를 동시에 고친다 | `channel/package.json`·`tsconfig.json` 충돌 | 이 SPEC 은 두 파일만 만진다. 패키지 파일은 `SPEC-CHANNEL-001` 소유 |

---

## §F 마일스톤

시간 추정은 쓰지 않는다. 우선순위와 순서만 정한다.

### M1 — `wire()` 의 세 갈래: 수신·상태·송신 (우선순위 High)

**단계 0 — 전제 확인 (구현 전).**
1. `git rev-parse HEAD` 를 `.moai/specs/SPEC-CHANWIRE-001/.spec-base-sha` 에 기록한다.
2. `channel/src/channel-server.ts` 와 `channel/src/gateway-client.ts` 의 실제 시그니처를 읽어 §3 의 계약과 같은지 확인한다. 다르면 멈추고 보고한다.
3. 하네스에 `as any` 로 SDK 객체 형태를 가정한 자리가 남아 있지 않은지 훑는다 (§D 1번의 부류 점검).

**단계 1 (RED).** `channel/test/index-wiring.test.ts` 에 공통 하네스와 AC-CHANWIRE-001·002·003·004·005 의 다섯 테스트를 쓴다. `npm test -w channel` 이 `wire` 미수출로 실패하는 것을 확인한다.

**단계 2 (GREEN).** `channel/src/index.ts` 를 전면 교체해 `wire()` 를 세운다 — `onMessage` 에서 TO 이면 `working` 을 먼저 보내고 `pushChatMessage` 로 넘기며, `sendToChat` 에서 `bot_message` 를 보낸 뒤 `idle` 을 보낸다. 이력 갈래는 이 단계에서 임시 구현을 넣지 않는다 — M2 의 RED 가 실제 단언 실패여야 하므로, `fetchHistory` 는 `gw.requestHistory` 를 부르되 렌더링은 M2 에서 세운다.

**단계 3.** `npm test -w channel` 통과 + `npm run typecheck -w channel` 종료 코드 `0`.

**단계 4.** 커밋: `feat: wire channel server to gateway client`.

### M2 — 이력 갈래와 진입점 (우선순위 High)

**단계 1 (RED).** AC-CHANWIRE-006·007·008·010·011·014 의 테스트와 명령을 준비하고 실행한다. 실패 사유가 **단언 실패**인지(수출·모듈 부재가 아닌지) 확인해 기록한다.

**단계 2 (GREEN).** 세 가지를 세운다.
- 이력 렌더링 — `#<id> [<created_at>] <author_name>: <body>`, 빈 결과 `'(기록 없음)'`
- 주소 해석 — `DEFAULT_SERVER` 상수와 `resolveUrl(env)` 를 내보내고, 진입점은 그 함수로만 주소를 정한다
- 진입점 가드 — 직접 실행이면 stdio 를 연결하고, **그 안쪽에서** 토큰이 있을 때만 `gw.start()` 를 부른다 (§D 3번의 계약 개정)

**단계 3.** `npm test -w channel` 전체 통과 + typecheck 종료 코드 `0` + `npm run build -w channel` 종료 코드 `0`.

**단계 3b — 빌드 산출물 관측.** AC-CHANWIRE-010(임포트 부작용)과 AC-CHANWIRE-014(dist 가 MCP 를 말하는가, 토큰 유무 두 갈래)는 vitest 안에서 **자식 프로세스로** `channel/dist/index.js` 를 띄운다. 그래서 **빌드가 이 둘의 전제**다 — 빌드하지 않고 테스트만 돌리면 두 기준은 산출물 부재로 실패하며, 그 실패를 배선 결함으로 읽어서는 안 된다. 단계 3 의 빌드가 끝난 뒤 실행하고, 끝나면 `pgrep -f 'channel/dist/index.js'` 로 남은 프로세스가 없음을 확인한다.

**단계 4 — 변이 검증.** AC-CHANWIRE-009 의 네 변이를 하나씩 적용·실행·되돌린다. 각 실행의 실패 테스트 이름 집합을 `progress.md` §E.2 에 원문으로 남기고, 표와 어긋나면 기준이나 구현 중 어느 쪽이 틀렸는지 판정한 뒤 진행한다. 마지막에 `git diff -- channel/src/index.ts` 로 되돌림을 확인한다.

**단계 5 — 범위 경계.** AC-CHANWIRE-012 의 네 명령을 실행해 관측을 남긴다.

**단계 6.** 커밋: `feat: channel entry point with env config and history rendering`.

---

## §G 자기 검증

run 단계가 끝나기 전에 다음이 모두 참이어야 한다. 하나라도 아니면 완료가 아니다.

- [ ] AC-CHANWIRE-001..014 전부 통과했고, 각 명령의 **원문 출력**이 `progress.md` §E.2 에 있다.
- [ ] 형제 SPEC 계약 확인: AC-CHANWIRE-014 (b)가 통과해, `SPEC-CHANNEL-001` 의 토큰 없는 dist 프로브(AC-CHANNEL-002·004·005)가 이 SPEC 착지 후에도 성립한다.
- [ ] REQ-CHANWIRE-001..013 각각이 최소 하나의 AC 에 매핑된 표가 §E.1 에 있다.
- [ ] AC-CHANWIRE-009 의 네 변이 결과가 표와 일치하고, 변이가 모두 되돌려졌다.
- [ ] `git diff --stat <base> -- channel/src/channel-server.ts channel/src/gateway-client.ts server` 가 빈 출력이다.
- [ ] `git status --porcelain` 에 테스트가 만든 파일이 없다.
- [ ] §D 3번(토큰 없는 실행의 진단성)에 대해 리드의 판정을 받았거나, 받지 못했다면 그 사실이 §E.2 에 남았다.
- [ ] 미검증 항목이 §E.2 Gaps 절에 명시적으로 기록됐다.

---

## §H 안티패턴 (하지 말 것)

- **선행 소유 파일을 "잠깐만" 고치기.** `channel-server.ts` 나 `gateway-client.ts` 를 한 줄이라도 고치면 AC-CHANWIRE-012 가 실패한다. 고쳐야 할 것 같으면 멈추고 보고한다.
- **`wire()` 안에서 `start()` 부르기.** 테스트가 접속 시점을 잃고, 임포트 부작용 검사(AC-CHANWIRE-010)가 무너진다.
- **`files` 를 문자열 배열 그대로 싣기.** 오류가 나지 않고 첨부만 조용히 사라진다.
- **이력 줄에서 `#번호` 빼기.** 봇의 따라잡기 커서가 통째로 사라진다. 사람 눈에는 "봇이 좀 느리다"로만 보인다.
- **`idle` 을 먼저 보내기.** 방에서 "끝났다"고 표시된 뒤에 답변이 온다.
- **cc 에도 `working` 보내기.** 참고 메시지마다 봇이 일하는 중으로 표시되어 상태 표시가 무의미해진다.
- **고정 `sleep` 으로 비동기 기다리기.** 간헐 실패의 사유가 진짜 결함과 구분되지 않는다 (§D 4).
- **stdio 연결까지 토큰으로 잠그기.** 형제 SPEC 의 토큰 없는 dist 프로브가 조용히 실행 불가가 된다 (§D 3). 토큰은 게이트웨이 접속만 잠근다.
- **임포트 부작용을 같은 프로세스 안에서 재기.** 테스트 파일이 이미 임포트한 모듈을 다시 `import()` 해도 ES 모듈 캐시가 돌아올 뿐이라, 최상단에서 무조건 접속하는 구현도 통과한다. 자식 프로세스로만 잰다 (감사 지적 B1).
- **기본 주소를 재려고 3000 번 포트를 점유하기.** 서버를 띄워 둔 개발자에게 정상 구현이 거짓 실패하고, 그 실패가 반복되면 기준이 "환경 탓"으로 무시된다 (감사 지적 M6). `resolveUrl` 로 잰다.
- **자식 프로세스 수거를 명령 끝의 `kill` 한 줄에 맡기기.** 단언이 먼저 실패하거나 예외가 나면 그 줄에 닿지 않는다. 수거는 `spawn` **직후** 등록해 `afterEach` 가 모든 경로에서 실행하게 한다.
- **`node --eval` 에서 `--input-type=module` 빼기.** 최상위 `await` 가 ESM 판정에 의존하므로, 선언한 하한선(Node 20)에서 정상 구현이 거짓 실패한다.
- **소스만 `tsx` 로 돌려 보고 끝내기.** `bin` 이 가리키는 `dist/index.js` 가 어긋나도 드러나지 않는다. 증상은 사용자가 봇을 등록한 뒤에야, "아무 반응이 없다"로 나타난다 (감사 지적 M1).
- **포트 점유로 관측할 수 없는 기준을 건너뛰고 통과로 적기.** 관측하지 못한 것은 통과가 아니라 Gap 이다.
- **디스크에 파일 쓰기.** 채널 플러그인은 무상태다 (Global Constraints).

---

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, Task 11·12·13·14, Task 8(서버 쪽 `handleBotMessage`·`handleHistory`)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-B 채널 계약
- `.moai/specs/SPEC-CHANNEL-001/` · `.moai/specs/SPEC-CHANCLIENT-001/` — 선행 계약
- `.moai/specs/SPEC-CHANPERM-001/` — 이 SPEC 의 `wire()` 를 확장하는 후행 SPEC
- `.moai/specs/SPEC-PERM-001/` — 하네스 결함 교정과 "의도적 확장" 판단의 선례
