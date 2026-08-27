# SPEC-CHANPERM-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 14(선행 계약은 Task 11·12·13)와 `spec-v2.md` 4-B·7장이며, 그 두 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M4`(카드 `t4`)와는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t4` 는 채널 패키지 전체를 낸다. 이 SPEC 은 그중 **마지막**이다 — 앞의 셋이 없으면 이 SPEC 의 테스트는 import 단계에서 전부 깨진다.

```
SPEC-CHANNEL-001 → SPEC-CHANCLIENT-001 → SPEC-CHANWIRE-001 → SPEC-CHANPERM-001
                                                   ↑
                                   SPEC-PERM-001 (서버, 이미 구현됨 — 계약만 소비)
```

이 SPEC 이 선행 산출물에서 **정확히 무엇을 받아 쓰는지**:

| 출처 | 받아 쓰는 것 | 이 SPEC 에서의 쓰임 |
|------|-------------|-------------------|
| `SPEC-CHANNEL-001` | `createChannelServer` 내부의 `mcp` 서버 인스턴스 | `setNotificationHandler` 등록처, `notification()` 발신처 |
| `SPEC-CHANNEL-001` | `ChannelDeps.sendPermissionRequest?` | 요청을 밖으로 내보내는 유일한 출구 |
| `SPEC-CHANNEL-001` | `ChannelHandle` 반환 객체 | `handlePermissionVerdict` 를 **더한다**. 기존 멤버는 건드리지 않는다 |
| `SPEC-CHANCLIENT-001` | `GatewayClient.send(payload): boolean` | 요청 프레임 전송 |
| `SPEC-CHANCLIENT-001` | `GatewayClientOpts.onVerdict` | 판정 수신 진입점 |
| `SPEC-CHANWIRE-001` | `wire(opts)` | 이 SPEC 이 그 함수 **안에 두 줄**을 더한다. 시그니처는 바꾸지 않는다 |
| `SPEC-PERM-001` (서버) | 봇 소켓 `permission_verdict` payload 형태, `switch (msg.type)` 분기 | 프레임에 `type` 을 반드시 붙여야 하는 이유 |

선행 산출물이 아직 없으면 이 SPEC 의 어떤 테스트도 실행할 수 없다. run 단계 진입 전 확인 대상이다.

## §B 되돌리기 어려운 결정 — 채널은 대기 맵을 두지 않는다

이 SPEC 에서 가장 되돌리기 비싼 결정이다. 여기서 정한 것이 "모르는 판정이 오면 어떻게 되는가", "중복 판정을 걸러낼 수 있는가", "`request_id` 대소문자 결함을 채널에서 보상할 수 있는가"를 전부 결정한다.

| 항목 | 값 | 왜 이렇게 정하는가 |
|------|-----|-------------------|
| 대기 중인 요청 기록 | **두지 않는다** | Global Constraints 의 무상태 원칙. 채널은 세션당 하나씩 뜨고 죽으며, 짝짓기는 Claude Code 가 이미 하고 있다 |
| 모르는 `request_id` 판정 | 그대로 Claude Code 로 넘긴다 | 채널이 "모른다"고 판단하려면 알고 있는 목록이 있어야 하고, 그 목록이 곧 상태다 |
| 중복 판정 | 걸러내지 않는다. 두 번 오면 두 번 나간다 | 위와 같다. 해소된 id 를 기억해야만 걸러낼 수 있다 |
| `request_id` 정규화 | 하지 않는다 (양방향) | `spec.md` §3.1 가정-3. 채널이 원본 id 를 복원하려면 나갈 때의 값을 기억해야 하고, 그것도 상태다 |
| 게이트웨이 끊김 중 도착한 요청 | 버퍼링하지 않는다. `send` 가 `false` 를 내고 요청은 사라진다 | 큐가 곧 상태다. 재전송은 `spec.md` §5 범위 밖 |

검토 시 이 표가 확인 대상이다. **다섯 칸이 전부 같은 이유 하나("그것이 곧 상태다")로 묶여 있다** — 한 칸을 뒤집으면 무상태 원칙이 무너지고 나머지 넷도 따라 뒤집힌다. 특히 세 번째 칸(`request_id` 정규화)은 서버 쪽 결함(카드 `t7`)을 여기서 덮고 싶은 유혹이 실제로 생기는 자리라, 요구사항 층(REQ-CHANPERM-007)에 올려 두었다.

## §C 되돌리기 어려운 결정 — 두 방향의 프레임 형태

세 계약이 여기서 맞물린다. 확정 뒤에는 서버 게이트웨이·Claude Code·채널 셋이 이 형태에 결합한다.

### 들어오는 알림 (Claude Code → 채널)

```
method: notifications/claude/channel/permission_request
params: { request_id, tool_name, description, input_preview }
```

zod 스키마로 받는다. `method` 는 `z.literal` 로 고정한다 — 문자열 비교를 느슨하게 하면 **자기가 보낸 판정 알림**(`…/permission`, 한 단어 짧다)까지 이 경로를 타서 승인 요청을 게이트웨이로 되쏜다.

### 나가는 게이트웨이 프레임 (채널 → 서버)

```jsonc
{ "type": "permission_request", "request_id": "…", "tool_name": "…", "description": "…", "input_preview": "…" }
```

`type` 이 반드시 붙는다. 서버 `gateway.ts` 는 `switch (msg.type)` 로 분기하고 `permission_request` 케이스에서 **메시지 전체**를 핸들러에 넘기며, 서버 브로커는 거기서 `params.request_id` 등을 읽는다. `type` 을 빼면 어느 분기도 타지 않고 **오류 없이 사라진다**.

### 나가는 판정 알림 (채널 → Claude Code)

```
method: notifications/claude/channel/permission
params: { request_id, behavior }   // behavior ∈ 'allow' | 'deny'
```

두 필드뿐이다. 게이트웨이가 보낸 payload 에는 `type: 'permission_verdict'` 도 들어 있는데, 그것을 그대로 펼쳐 실으면 계약에 없는 필드가 Claude Code 로 간다. 두 필드만 골라 담는다.

### 순환 배선을 어디서 끊는가

`sendPermissionRequest` 는 `gw` 를 필요로 하고 `onVerdict` 는 `channel` 을 필요로 한다 — 한쪽은 늦게 묶일 수밖에 없다. 두 가지 형태가 가능하다.

| 형태 | 모습 | 판단 |
|------|------|------|
| (권장) 생성 시 전달 | `channel` 을 먼저 만들고, `createGatewayClient({ …, onVerdict: v => channel.handlePermissionVerdict(v) })` | `channel` 이 이미 존재하므로 늦은 대입이 필요 없다. `opts` 가 공개 가변 필드라는 사실에 기대지 않는다 |
| (원본) 생성 후 대입 | `gw.opts.onVerdict = v => channel.handlePermissionVerdict({ … })` | Task 14 원본 형태. `GatewayClient.opts` 가 테스트용으로 공개돼 있다는 성질에 결합한다 |

권장 형태를 쓴다. 어느 쪽이든 AC-CHANPERM-010 이 회로가 실제로 도는지로 판정하므로, 관측 결과는 같다. `sendPermissionRequest` 쪽은 화살표 함수 본문에서 `gw` 를 **호출 시점에** 읽으므로 선언 순서 문제가 없다.

## §D 원본 문서 모순과 해결

### 1. [차단급] 원본 테스트가 유사 객체를 알림 스키마로 넘긴다

Task 14 Step 1(과 Task 13)의 테스트는 이렇게 쓴다.

```ts
client.setNotificationHandler({ method: 'notifications/claude/channel/permission' } as any, n => verdicts.push(n))
```

MCP SDK 의 `setNotificationHandler` 는 **zod 스키마**를 받아 `schema.shape.method.value` 로 메서드 이름을 꺼내고, 도착한 알림을 `schema.parse` 한 뒤 핸들러를 부른다. 위 유사 객체에는 `shape` 가 없어 등록 단계에서 깨진다 — **구현이 완전히 옳아도 이 테스트는 실패한다.** `as any` 가 타입 검사를 통과시키므로 컴파일 시점에는 아무 신호도 없다.

**해결**: `acceptance.md` 의 공통 하네스가 진짜 zod 스키마(`PermissionVerdictNotification`)를 쓴다. 원본 계약을 바꾸는 것이 아니라 원본 테스트의 배선 결함을 고치는 것이라, 계약 변경이 아니다.

**이 결함이 조용한 이유를 기록해 둔다** — `as any` 로 지운 타입 정보는 런타임에 되살아나지 않는다. 형제 SPEC(`SPEC-CHANWIRE-001`)의 테스트도 같은 형태를 쓰므로, 그쪽에서 이미 고쳤다면 같은 헬퍼를 맞춰 쓴다.

### 2. [차단급] zod 는 모르는 키를 조용히 걷어낸다

위 스키마로 알림을 `parse` 하면 `params` 의 계약 밖 필드가 사라진 객체가 핸들러에 온다. 그 상태에서 "params 에 두 필드만 있다"(AC-CHANPERM-005)를 단언하면 **필드를 더 실어 보내는 구현도 통과한다** — 기준이 재려던 것을 재지 못한다.

**해결**: 하네스의 `params` 스키마에 `.passthrough()` 를 붙였다. 관측용 스키마에만 붙이는 것이고, 구현이 등록하는 수신 스키마는 계약대로 좁게 둔다.

### 3. [의도적 이탈] 원본 구현이 프로미스를 버린다

원본 Task 14 Step 3 은 이렇게 쓴다.

```ts
function handlePermissionVerdict(v: { request_id: string; behavior: 'allow' | 'deny' }): void {
  void mcp.notification({ … })
}
```

`Protocol.notification` 은 transport 가 없으면 **거부된 프로미스**를 돌려준다. `void` 는 그것을 버리므로 처리되지 않은 거부가 되고, Node 는 거기서 프로세스를 끝낸다. 게이트웨이 판정은 stdio 연결 전이나 종료 중에도 도착할 수 있으므로 가상의 경로가 아니다 — 권한 릴레이 한 줄 때문에 세션의 모든 기능이 함께 죽는다.

**해결**: 거부 경로를 명시적으로 받는다(`.catch(...)`). 이탈의 범위는 **그 한 줄**이고, 알림 메서드·필드·`behavior` 값은 그대로다. 삼킨 오류를 어디에 적을지는 stdio 가 프로토콜 채널이라는 제약이 정한다 — `console.log` 는 프로토콜을 깨므로 쓰지 않고, 필요하면 `console.error` 만 쓴다.

### 4. 원본의 "Consumes" 가 Task 11 만 적는다

Task 14 의 Interfaces 는 `Consumes: Task 11의 ChannelDeps…` 라고만 적는다. 그런데 같은 Task 의 Step 3 배선은 `gw.send`(Task 12)와 `wire`(Task 13)를 모두 쓴다.

**해결**: `depends_on` 에 세 채널 SPEC 을 모두 적었다. 원본 기술의 누락이며 계약 변경이 아니다. 실행 순서에도 영향이 있다 — Task 13 이 끝나기 전에는 M2 를 시작할 수 없다(§F).

### 5. 수신 스키마가 네 필드를 모두 필수로 요구한다

원본 스키마는 `request_id`·`tool_name`·`description`·`input_preview` 를 전부 `z.string()` 필수로 둔다. Claude Code 가 그중 하나를 생략하면 `parse` 가 실패하고 **알림이 조용히 사라진다** — 승인 요청이 방에 뜨지 않고 세션은 멈춘 채로 남는다.

**해결**: 원본 그대로 둔다. `spec-v2.md` 4-B 와 공식 channels-reference 가 네 필드를 계약으로 정했고, 스키마를 느슨하게 하는 것은 Global Constraints 가 금지한 계약 변경이다. 대신 `§E 알려진 위험`에 관측 가능한 결과를 적어 둔다.

### 6. 서버 쪽 `request_id` 결함 두 건 — 이 SPEC 에서 고치지 않는다

`spec.md` §3.1 가정-2(전역 키 하나로 된 대기 맵 — 같은 `request_id` 를 두 방이 동시에 대기시키면 앞 요청이 덮여 고아가 된다)·가정-3(등록은 원본 키·조회는 소문자 키라 대문자 섞인 id 는 조회가 빗나가 판정이 전송되지 않는다). 둘 다 `SPEC-PERM-001` / 카드 `t7` 소유다.

**해결**: 고치지도, 채널에서 보상하지도 않는다. 보상하려면 계약을 바꾸거나(가정-2 는 방 정보를 채널이 실어 보내는 것) REQ-CHANPERM-007 을 어겨야 한다(가정-3 은 나가는 id 를 소문자로 낮추는 것). 이 SPEC 이 하는 일은 가정을 문서에 드러내고(§3.1), 채널이 그 결함의 **두 번째 원인이 되지 않도록** 못 박는 것이다(REQ-CHANPERM-007, AC-CHANPERM-007).

**v0.2.0 교정 (M2·M3)**: v0.1.0 은 두 고장을 "다른 방의 판정이 섞인다"·"돌아온 id 가 원본과 다르다"로 적었는데, 감사자가 `server/src/permissions.ts` 원문과 대조해 둘 다 틀렸음을 지적했다. 방 대조는 `:49` 에 이미 있고, 대소문자 불일치는 `:47` 의 조회에서 먼저 걸린다. 잘못된 기술은 카드 `t7` 의 수정 범위를 엉뚱한 곳으로 보낸다 — **다른 SPEC 의 결함을 기술할 때는 그 파일을 열어 줄 번호와 함께 인용한다**는 규칙을 §H 안티패턴에 올렸다.

### 7. [v0.2.0 교정] 고정 시간 대기가 정상 구현을 거짓 실패시킨다

v0.1.0 하네스는 고정 50ms `tick()` 하나로 모든 비동기를 기다리면서 "형제 SPEC 하네스와 같은 형태"라고 적었다. 사실이 아니었다 — 형제 셋은 고정 대기를 대표 결함으로 지목하고 전부 `waitFor` 로 바꿨다. 특히 AC-CHANPERM-010 은 그 50ms 안에 TCP·WebSocket 핸드셰이크와 프레임 왕복이 끝나야 해서 부하 걸린 기계에서 배선이 완벽해도 실패하고, 그 실패가 "배선이 안 됐다"와 구분되지 않는다.

**해결**: 소켓을 건너는 세 자리를 `waitFor(조건, 라벨, 3000)` 로 바꿨다(형제 하네스와 같은 헬퍼). `tick()` 은 인프로세스 왕복과 부정 관측 전용으로 남겼다. 하네스 서문의 "같은 형태다" 주장도 사실에 맞게 고쳤다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| 알림을 이름으로 가르지 않음 | 자기가 보낸 판정 알림을 승인 요청으로 오인해 게이트웨이로 되쏜다. 무한 왕복이 될 수 있다 | `z.literal` 로 고정. AC-CHANPERM-002 가 이름이 다른 두 알림에서 부정 관측 |
| 판정어를 읽지 않고 늘 `allow` 를 보냄 | 사람이 거절했는데 세션이 그 도구를 실행한다. 이 SPEC 에서 가장 비싼 오작동 | AC-CHANPERM-006 이 Claude Code 쪽이 받은 `behavior` 를 직접 단언 |
| 프레임에 `type` 누락 | 서버 게이트웨이의 `switch` 가 아무 분기도 타지 않아 **오류 없이** 사라진다. 승인 요청이 방에 안 뜨고 세션만 멈춘다 | AC-CHANPERM-010 이 프레임을 통째로 `toEqual` 로 고정 |
| SDK 가 미선언 capability 의 알림을 거부한다 | 나가는 `notifications/claude/channel/permission` 이 `assertNotificationCapability` 에서 막혀 판정이 한 건도 Claude Code 에 닿지 않는다. 채널 코드는 완벽한데 회로만 열려 있다 | **run 단계 M1 에서 가장 먼저 확인한다** (§F M1 단계 2b). `SPEC-CHANNEL-001` 이 `capabilities.experimental['claude/channel']` 에 무엇을 선언하는지 읽고, 판정 알림 메서드가 그 선언에 덮이는지 본다. 덮이지 않으면 **계약 차원의 문제이므로 중단하고 보고한다** — capabilities 선언은 `SPEC-CHANNEL-001` 소유라 이 SPEC 에서 바꾸지 않는다. `SPEC-CHANNEL-001` 은 들어오는 알림에 대해 같은 위험을 이미 등록했다 |
| `void` 로 버린 프로미스 | 미연결·종료 중 판정이 프로세스를 죽인다. 다음 tick 에 일어나므로 `not.toThrow()` 로는 안 잡힌다 | §D 3번의 `.catch`. AC-CHANPERM-009 가 `unhandledRejection` 수집으로 관측 |
| 배선을 한 방향만 이음 | 요청은 방에 뜨는데 승인이 세션에 닿지 않거나, 그 반대. 두 경우 다 조용하다 | REQ-CHANPERM-004 가 두 방향을 요구사항으로. AC-CHANPERM-010 이 왕복 전체를 관측 |
| `params` 필드 누락으로 알림이 사라짐 | 승인 요청이 방에 뜨지 않고 세션이 멈춘 채 남는다. 로그도 남지 않는다 | **미검증 — 수용.** 계약이 네 필드를 정했고 완화는 금지다(§D 5번). 관측되면 계약 차원 결정이 필요하므로 중단하고 보고한다 |
| 게이트웨이 끊김 중 도착한 요청 | `send` 가 `false` 를 내고 요청이 사라진다. 세션은 멈춘 채 남는다 | **미검증 — 수용.** 큐잉은 §B 가 배제했고 재전송은 `spec.md` §5 범위 밖. 사람은 세션 터미널에서 직접 승인할 수 있다 |
| `stdout` 에 로그를 씀 | stdio 가 MCP 프로토콜 채널이라 한 줄만 섞여도 세션과의 대화가 깨진다 | §D 3번 — `console.log` 금지, `console.error` 만 |
| 원본 테스트 형태를 그대로 옮김 | 유사 객체 스키마(§D 1번)로 정상 구현이 거짓 실패한다. `as any` 라 타입 검사도 통과한다 | 하네스가 진짜 zod 스키마를 쓴다. 형제 SPEC 하네스와 형태를 대조한다 |
| 선행 SPEC 미완료 상태에서 착수 | `createChannelServer` 도 `wire` 도 없어 테스트가 import 단계에서 깨진다 | §A 의 의존 표를 M1 시작 전 체크리스트로 쓴다 |

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다 — M2 의 배선 테스트가 M1 의 두 진입점을 쓴다.

### M1 — 채널 서버의 두 진입점 (우선순위 High)

원본: `plan-v2.md` Task 14 Step 1-3 중 `channel/src/channel-server.ts` 부분.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-CHANPERM-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` §E.1 에 적는다. M2 단계 5 의 범위 경계 검사가 이 값을 기준으로 비교한다.
1. `channel/test/permission-relay.test.ts` 를 만들고 `acceptance.md` 의 공통 하네스와 `describe('permission relay', …)` 를 쓴다. 이 마일스톤의 테스트는 AC-CHANPERM-001·002·003·004·005·006·007·008·009 다. **원본 Task 14 Step 1 의 테스트 코드를 그대로 옮기지 않는다** — 그 형태의 `setNotificationHandler({ method: … } as any)` 는 정상 구현을 거짓 실패시킨다(§D 1번). 정본은 `acceptance.md` 의 공통 하네스다.
2. **RED 확인**: `npm test -w channel` → `handlePermissionVerdict is not a function` 계열로 실패. **모듈 부재가 아님을 출력에서 확인하고 기록한다** (AC-CHANPERM-012 전이 1). `channel-server.ts` 는 선행 SPEC 이 이미 만들었으므로 모듈 부재로 실패할 이유가 없다.
2b. **capability 선언 확인** (구현보다 먼저): `SPEC-CHANNEL-001` 이 선언한 `capabilities.experimental` 의 키를 읽고, 나가는 `notifications/claude/channel/permission` 이 SDK 의 `assertNotificationCapability` 를 통과하는지 확인한다. AC-CHANPERM-005 가 `verdicts.length === 0` 으로 실패한다면 원인이 여기일 수 있으므로, 구현 전에 먼저 본다. 선언이 그 메서드를 덮지 않으면 **중단하고 보고한다** — capabilities 는 `SPEC-CHANNEL-001` 소유이고, 계약 변경은 Global Constraints 가 금지한다. 확인 결과(통과든 블로커든)를 `progress.md` §E.2 에 남긴다.
3. `channel/src/channel-server.ts` 에 더한다 — `zod` 임포트, `PermissionRequestSchema`(§C 의 들어오는 알림 형태), `mcp.setNotificationHandler(...)` 등록(`deps.sendPermissionRequest?.(params)`), `handlePermissionVerdict` 함수(§C 의 나가는 판정 형태 + §D 3번의 `.catch`), 그리고 `return` 객체에 그 함수 추가.
4. `ChannelDeps.sendPermissionRequest?` 와 `ChannelHandle.handlePermissionVerdict` 선언을 맞춘다. **기존 멤버의 이름·타입은 건드리지 않는다** — 형제 SPEC 의 테스트가 전부 그것에 결합한다.
5. **GREEN 확인**: `npm test -w channel` → M1 테스트 통과. `npm run typecheck -w channel` → 종료 코드 `0`.
6. 커밋: `feat: channel permission request handler and verdict notification`

수용 기준: AC-CHANPERM-001, 002, 003, 004, 005, 006, 007, 008, 009, AC-CHANPERM-012(전이 1-2).

### M2 — 배선과 범위 경계 (우선순위 High)

원본: `plan-v2.md` Task 14 Step 3 중 `channel/src/index.ts` 부분.

1. 같은 테스트 파일에 AC-CHANPERM-010 의 배선 테스트를 추가한다 (게이트웨이 스텁 왕복).
2. **RED 확인**: `npm test -w channel` → 배선 단언 실패(`permission_request` 프레임이 스텁에 도착하지 않음). 출력 원문 기록 (AC-CHANPERM-012 전이 3).
3. `channel/src/index.ts` 의 `wire` 에 두 줄을 더한다 — `createChannelServer` 인자에 `sendPermissionRequest: params => { gw.send({ type: 'permission_request', ...params }) }`, 게이트웨이 클라이언트 생성 인자에 `onVerdict: v => channel.handlePermissionVerdict({ request_id: v.request_id, behavior: v.behavior })` (§C 의 권장 형태). `wire` 의 시그니처와 반환 형태는 바꾸지 않는다.
4. **GREEN 확인**: `npm test -w channel` → 전체 통과. typecheck 종료 코드 `0`.
5. **범위 경계 확인** (AC-CHANPERM-011): `git rev-parse --verify "$(cat .moai/specs/SPEC-CHANPERM-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 먼저 확인하고, 그 뒤에만 두 `git diff` 로 넘어간다. **기준 커밋 없이 `git diff` 를 쓰지 않는다** — M1 커밋 이후라 `HEAD` 기준으로는 아무것도 잡히지 않는다. **빈 출력 하나만 보고 통과로 적지도 않는다** — 기준 SHA 가 없어도 표준 출력은 비어 있다.
6. 커밋: `feat: channel permission relay wiring`

수용 기준: AC-CHANPERM-010, 011, AC-CHANPERM-012(전이 3-4).

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-CHANPERM-001..012 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` §E.2 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **판정 알림이 "나갔다"만 관측하기** — 항상 `allow` 를 보내는 구현도 그 기준을 통과한다. `behavior` 값을 직접 단언한다 (AC-CHANPERM-006).
- **알림을 이름으로 가르지 않기** — 모든 알림을 받아 넘기면 자기가 보낸 판정 알림까지 요청으로 오인한다. `z.literal` 로 고정한다 (AC-CHANPERM-002).
- **`params` 를 "정리"해서 넘기기** — 빈 `description` 을 기본 문구로 채우거나 `input_preview` 를 자르지 않는다. 중계기는 번역만 하고 판단하지 않는다 (AC-CHANPERM-003).
- **`request_id` 를 정규화하기** — `.toLowerCase()`·`.trim()`·재생성 어느 것도 넣지 않는다. 서버 쪽 대소문자 결함(카드 `t7`)을 여기서 덮으려는 유혹이 실제로 생기는 자리다 (REQ-CHANPERM-007).
- **채널에 대기 맵 두기** — 모르는 판정을 걸러내거나 중복을 막으려면 상태가 필요하다. Global Constraints 의 무상태 원칙이 금지한다 (§B).
- **프레임에서 `type` 빼기** — 서버 `switch` 가 아무 분기도 타지 않고 오류 없이 사라진다. 승인 요청이 방에 안 뜨는데 아무 신호도 없다 (§C).
- **게이트웨이 payload 를 그대로 펼쳐 알림에 싣기** — `type: 'permission_verdict'` 가 Claude Code 로 새 나간다. 두 필드만 골라 담는다 (§C).
- **`void` 로 프로미스 버리기** — 미연결 상태의 거부가 프로세스를 죽인다. `.catch` 로 받는다 (§D 3번).
- **`console.log` 로 로그 찍기** — stdio 가 MCP 프로토콜 채널이다. 한 줄만 섞여도 세션과의 대화가 깨진다. `console.error` 만 쓴다.
- **`wire` 의 시그니처나 반환 형태 바꾸기** — `SPEC-CHANWIRE-001` 의 테스트가 전부 깨진다. 안에 두 줄만 더한다.
- **`ChannelDeps`/`ChannelHandle` 의 기존 멤버 손대기** — 형제 SPEC 세 곳이 그것에 결합한다. 더하기만 한다.
- **서버 쪽 결함을 채널에서 고치기** — 카드 `t7` 소유다. `server/` 아래 파일을 이 SPEC 에서 열지 않는다 (AC-CHANPERM-011).
- **원본 테스트의 유사 객체 스키마를 그대로 옮기기** — `{ method: '…' } as any` 는 SDK 등록 단계에서 깨져 정상 구현을 거짓 실패시킨다. `as any` 라 타입 검사도 통과한다 (§D 1번).
- **소켓을 건너는 대기를 고정 시간으로 두기** — 부하 걸린 기계에서 정상 구현이 거짓 실패하고, 그 실패가 배선 결함과 구분되지 않는다. 그리고 관례대로 대기 시간을 늘려 덮는 순간 그 기준은 아무것도 재지 않게 된다. `waitFor(조건, 라벨)` 를 쓴다 (§D 7번).
- **서버 결함의 고장 경로를 코드 대조 없이 적기** — v0.1.0 이 `request_id` 가정 두 개의 고장을 실제 `permissions.ts` 와 다르게 적었고, 그대로 두면 카드 `t7` 이 존재하지 않는 결함을 고치게 된다. 다른 SPEC 의 결함을 기술할 때는 그 파일을 열어 줄 번호와 함께 인용한다 (§D 6번).
- **`.passthrough()` 없이 "필드가 두 개뿐"을 단언하기** — zod 가 모르는 키를 걷어내 기준이 무의미해진다 (§D 2번).
- **미연결 경로를 `not.toThrow()` 하나로 끝내기** — 처리되지 않은 거부는 다음 tick 에 터진다. `unhandledRejection` 수집으로 함께 잰다 (AC-CHANPERM-009).
- **부정 기준을 부정 단언 하나로 끝내기** — "불리지 않았다"는 아무것도 안 하는 구현도 통과시킨다. 부정 기준에는 반드시 양성 짝(정확한 이름에서의 호출, 이후 정상 판정의 성립)을 붙인다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-CHANPERM-012 의 전이 증거를 만들 수 없다. 특히 전이 1 은 **모듈 부재가 아닌 단언·타입 실패**여야 한다.
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡힌다. `spec_base_sha` 를 기준으로 비교한다.
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 의 종료 코드 `0` 을 먼저 확인한다.
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않는다. 이름 붙은 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다.

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 14 — **이 SPEC 의 원본**(읽기 전용). Task 11·12·13 이 선행 계약
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B·7장 — 채널 계약, 권한 릴레이 흐름
- `spec.md` — GEARS 요구사항(REQ-CHANPERM-001..010), §3.1 `request_id` 가정, 범위 경계
- `acceptance.md` — AC-CHANPERM-001..012, 공통 테스트 하네스
- `progress.md` — 단계별 증거 기록처
- `.moai/specs/SPEC-CHANNEL-001/` — 채널 서버 코어
- `.moai/specs/SPEC-CHANCLIENT-001/` — 게이트웨이 클라이언트
- `.moai/specs/SPEC-CHANWIRE-001/` — 배선 (`wire`)
- `.moai/specs/SPEC-PERM-001/` — 서버 쪽 권한 릴레이. §3.1 가정-2·가정-3 의 소유자 (카드 `t7`)
