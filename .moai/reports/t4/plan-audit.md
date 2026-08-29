# 카드 t4 — M4 채널 SPEC 4종 계획 단계 감사

감사 대상: `SPEC-CHANNEL-001`, `SPEC-CHANCLIENT-001`, `SPEC-CHANWIRE-001`, `SPEC-CHANPERM-001` (네 SPEC 을 **한 벌로** 훑음)
기준 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` L1–78(Global Constraints), L2143–2943(Task 11–14)
대조 구현: `server/src/gateway.ts`, `server/src/permissions.ts`, `package.json`, `server/tsconfig.json`
감사자 입장: 적대적. 결함을 찾는 것이 목적이며, "괜찮아 보인다"는 결론으로 삼지 않는다.

**판정: CONDITIONAL PASS** — 아래 §7 의 7건(차단급 1 + 주요 6)이 고쳐져야 run 단계에 들어갈 수 있다.

---

## 0. 쉬운 말 요약

네 SPEC 은 전반적으로 **드물게 좋은 수준**이다. 저자들이 원본 계획서의 결함을 스스로 찾아 교정한 자리가 많고, "구현이 비어 있어도 통과하는 기준"을 막는 장치도 SPEC 마다 명시적으로 들어 있다. 리드가 지목한 네 개의 이음매 중 **둘은 이미 닫혀 있었고**(MCP 알림 핸들러 등록, `handlePermissionVerdict` 소유권), 하나는 문서화된 채로 남아 있으며(`depends_on`), 하나는 **실제 서버 코드와 대조해 보니 SPEC 이 적어 둔 고장 시나리오가 틀렸다**(`request_id` 가정 두 건).

그것과 별개로, 감사에서 **아무것도 재지 않는 기준 한 건**(차단급)과 **정상 구현을 거짓 실패시키거나 이미 통과한 기준을 조용히 무력화하는 자리 다섯 건**을 찾았다. 전부 국소적이고, 각각 한 문단짜리 수정으로 닫힌다. SPEC 을 다시 쓸 필요는 없다.

---

## 1. 리드가 지목한 네 이음매 — 확인 또는 반박

### 이음매 1 — MCP 알림 핸들러 등록: **반박 (세 SPEC 모두 교정됨)**

**Claim.** 원본 계획서의 `setNotificationHandler({ method: '...' } as any, ...)` 형태가 SPEC-CHANWIRE-001 에 그대로 상속됐을 수 있다.

**Evidence.** 세 SPEC 의 공통 하네스를 직접 읽었다.

- `SPEC-CHANWIRE-001/acceptance.md:78-84` — 진짜 zod 스키마로 교정. 교정 사유가 명시돼 있다: *"MCP SDK 의 `Protocol.setNotificationHandler` 는 인자에서 `schema.shape.method.value` 를 읽어 등록 키를 만드는데, 평범한 객체에는 `shape` 가 없어 그 자리에서 `TypeError` 가 난다"* (`acceptance.md:60`)
- `SPEC-CHANNEL-001/acceptance.md:76-88` — 동일하게 zod `ChannelNotification` 선언 + `nextNotification()` 도착 대기
- `SPEC-CHANPERM-001/acceptance.md:57-60` — `PermissionVerdictNotification` zod 선언, `.passthrough()` 이유까지 주석에 적음

**결론.** 세 SPEC 모두 교정했다. 결함 없음.

### 이음매 2 — `depends_on` 불일치: **확인 (문서화됨, 그러나 고쳐야 함)** → 발견 M5

`SPEC-CHANCLIENT-001/spec.md:15` 이 `depends_on: []` 이고, 같은 파일 `spec.md:26`(HISTORY)·`spec.md:75-78`(§3)이 그 이유를 명시한다 — 코드 의존이 아니라 **실행 전제**라는 것. 저자가 이미 리드에 보고했다고 적혀 있다. 판단은 §7 M5.

### 이음매 3 — `ChannelHandle.handlePermissionVerdict` 소유권: **닫혀 있음**

**Evidence.**
- `SPEC-CHANNEL-001/spec.md:230` — 명시적 제외: *"원본 Interfaces 블록에는 있으나 'Task 14 에서 추가' 로 명시돼 있다. 이 SPEC 의 `ChannelHandle` 은 `server` 와 `pushChatMessage` 둘만 노출한다"*
- `SPEC-CHANPERM-001/spec.md:174` (REQ-CHANPERM-010) — *"이 SPEC 이 손대는 소스 파일은 정확히 둘이다 — 핸들러와 `handlePermissionVerdict` 를 더하는 `channel/src/channel-server.ts`, 배선 두 줄을 더하는 `channel/src/index.ts`"*
- `SPEC-CHANPERM-001/acceptance.md` AC-CHANPERM-012 전이 1 — RED 사유가 `handlePermissionVerdict is not a function` 계열이어야 하고 *모듈 부재가 아니어야* 한다고 못 박음
- 실행 순서 보증: `SPEC-CHANPERM-001/spec.md:15` `depends_on: [SPEC-CHANNEL-001, SPEC-CHANCLIENT-001, SPEC-CHANWIRE-001, SPEC-PERM-001]`

**결론.** 틈으로 빠지지 않는다. CHANPERM 이 생성을 소유한다. 잔여 minor 는 §7 m6.

### 이음매 4 — `request_id` 가정: **두 건 모두 실제 서버 코드와 어긋남** → 발견 M2, M3

`SPEC-CHANPERM-001/spec.md:110-114` 의 가정표를 `server/src/permissions.ts` 원문과 대조했다. 상세는 §7 M2·M3.

---

## 2. Claim / Evidence — 계약 표류(contract drift) 훑기

**Claim.** 네 SPEC 이 쓰는 게이트웨이 프레임의 `type` 값과 필드 이름이 이미 구현된 서버와 글자 그대로 일치한다.

**Evidence.** `server/src/gateway.ts` 를 직접 읽어 대조.

| 프레임 / 필드 | 서버 원문 | SPEC 쪽 | 일치 |
|---|---|---|---|
| `hello` 분기 | `gateway.ts:64` `msg?.type === 'hello'` | REQ-CHANCLIENT-001 `{type:'hello', token}` | ✓ |
| `welcome` 발행 | `gateway.ts:100` `{ type:'welcome', room_id, bot_id, bot_name, missed_after_id }` | REQ-CHANCLIENT-003 (프레임 객체 그대로 전달) | ✓ |
| `message` 배달 | `gateway.ts:206`, `:118` `{ type, id, body, author_name, delivery, files:[{name, local_path}] }` | CHANNEL `ChatMessage`, CHANCLIENT `onMessage` 타입 | ✓ |
| `bot_message` 수신 | `gateway.ts:69`, `:149` `f.local_path` / `f.name ?? basename(src)` | REQ-CHANWIRE-011 `files: [{local_path}]` | ✓ (`name` 생략은 서버가 basename 으로 보정) |
| `status` | `gateway.ts:70-74` `'working'`\|`'idle'` 만 발행 | REQ-CHANWIRE-008·009·010 | ✓ |
| `history_request` → `history_response` | `gateway.ts:177-189` `{ type:'history_response', rid, messages:[{id, author_name, body, created_at}] }` | REQ-CHANWIRE-012 렌더 `#<id> [<created_at>] <author_name>: <body>` | ✓ |
| `permission_request` | `gateway.ts:78-81` — 핸들러에 **`msg` 통째로** 전달 | CHANPERM §3 이 그 사실을 명시적으로 소비 | ✓ |
| `permission_verdict` | `permissions.ts:52` `{ type:'permission_verdict', request_id, behavior }` | REQ-CHANPERM-005·006 | ✓ |

**Baseline-attribution.** 위 표의 모든 행은 이 워크트리의 `server/src/gateway.ts`(13,437 B, `ls -la` 로 확인)와 `server/src/permissions.ts`(4,243 B) 원문을 `sed`/`grep` 으로 직접 읽어 대조했다. 요약이나 SPEC 의 재진술을 근거로 쓰지 않았다.

**결론: 계약 표류 없음.** 이름·값 어느 것도 어긋나지 않는다.

---

## 3. Claim / Evidence — Global Constraints 준수

| 조항 | 관측 | 판정 |
|---|---|---|
| Node 20+ | `node --version` → `v24.12.0` | ✓ |
| TypeScript strict, `module: NodeNext` | 네 SPEC §6 이 모두 명시 | ✓ |
| 채널 플러그인 무상태 | CHANNEL AC-002 는 **빈 임시 디렉터리에서 실행 후 그 디렉터리가 비어 있는가**를 잰다 (`acceptance.md:174-186`) — 소스 grep 만이 아니라 실행 후 관측이라 우회 경로도 잡는다. CHANCLIENT AC-015 는 `fs`/`process.env` grep, CHANWIRE AC-012 는 `git status --porcelain` | ✓ (CHANPERM 만 전용 무상태 관측이 없으나 REQ-CHANPERM-010 이 금지하고 형제 기준이 같은 패키지를 덮음) |
| 설정은 `MINIDISCORD_TOKEN`/`MINIDISCORD_SERVER` 만 | REQ-CHANNEL-002, REQ-CHANWIRE-003·005, REQ-CHANCLIENT §6 | ✓ |
| vitest | 네 SPEC 모두 `npm test -w channel` | ✓ |
| UI 문구 한국어 | CHANNEL INSTRUCTIONS·도구 description, CHANWIRE `'(기록 없음)'`, CHANPERM 없음(문구 미생성) | ✓ |
| 루트 워크스페이스에 `channel` 이미 존재 | `package.json:4` `"workspaces": ["server", "channel"]` — CHANNEL REQ-015 의 주장 **검증됨** | ✓ |

**추가 검증 — CHANNEL 이 잡아낸 `tsconfig` 결함이 실재하는가.** `SPEC-CHANNEL-001/plan.md:105` 는 *"`server/tsconfig.json` 은 `include: ["src","test"]` 이고 `rootDir` 이 없다. 그대로 복사하면 산출물이 `dist/src/index.js` 에 놓이고 `bin` 이 존재하지 않는 파일을 가리킨다"* 고 주장한다. `server/tsconfig.json` 원문을 읽어 확인: `"outDir": "dist"`, `"include": ["src", "test"]`, `rootDir` 없음. **주장은 사실이다.** AC-CHANNEL-004 의 `test -f channel/dist/index.js` 가 이것을 실제로 잡는다.

---

## 4. Claim / Evidence — 공허한 수용 기준 훑기 (부류로)

이 프로젝트에서 세 번 재발한 결함 부류다. 네 SPEC 전부를 이 렌즈 하나로 훑었다.

**전반적으로 매우 강하다.** 네 SPEC 모두 acceptance.md 첫머리에 "위험한 자리 / 순진한 기준이 왜 무의미한가 / 대신 관측하는 것" 3열 표를 두고, 스텁이 어떻게 뚫는지를 자리마다 적어 두었다. 대표적으로 잘 막은 자리:

- **CHANNEL capabilities** — 원본은 `tools/list` 로 우회 확인한다. 그러면 `experimental['claude/channel']` 을 통째로 뺀 구현이 통과하고, 그 구현은 Claude Code 가 채널로 인식하지 않아 채팅이 한 건도 오지 않는데 오류가 나지 않는다. AC-CHANNEL-004 는 빌드된 바이너리에 stdio 로 `initialize` 를 던져 **응답 JSON 의 `result.capabilities.experimental`** 을 직접 읽는다 (`acceptance.md:207-230`). 이 SPEC 에서 가장 비싼 실패를 정확히 조준한다.
- **CHANNEL `fetch_history` 반환** — 하네스의 `fetchHistory` 가 인자에서 파생된 `H:${since_id}:${limit}` 를 돌려주게 해, 반환을 하드코딩한 구현을 잡는다 (`acceptance.md:53-57`, AC-011).
- **CHANWIRE cc 상태 억제** — 원본 테스트는 주석에 "cc 에는 working 이 없음"이라 적고 **그것을 재는 단언이 없다**. AC-CHANWIRE-002 가 `countOf` 로 부정 단언을 더해 닫았다.
- **CHANCLIENT `rid` 매칭** — 두 요청을 띄우고 응답을 **역순**으로 보내, 순서로 채우는 구현을 잡는다 (AC-008).
- **CHANCLIENT 백오프** — 주입된 `sleep` 이 받은 **인자 수열** `[1000,2000,4000,8000,16000,30000,30000,30000]` 을 잰다 (AC-012). 원본 계획서 구현(`retry()` 의 `Math.min(backoff*2, maxBackoff)`)을 손으로 추적해 이 수열이 맞음을 확인했다.
- **CHANPERM 판정 값** — AC-006 이 `deny` 를 따로 잰다. `behavior:'allow'` 를 상수로 박은 구현은 AC-005 를 온전히 통과하며, 그것이 *사람이 거절했는데 세션이 `rm -rf` 를 실행하는* 경로다.

**그럼에도 공허한 기준 두 건을 찾았다** — §7 B1(차단급), m1(minor).

---

## 5. Claim / Evidence — 거짓 실패 기준 훑기 (별도 패스)

공허한 기준과 반대 방향의 결함이라, 앞 패스로는 걸러지지 않아 따로 훑었다.

**세 SPEC 이 이 부류를 스스로 인지하고 고정 대기를 제거했다.** CHANCLIENT `acceptance.md:24` — *"이 문서의 시나리오에는 고정 시간 대기가 한 줄도 없다"*. CHANWIRE 도 `waitFor(조건, 라벨, 3000)` 로 교체. 그러나 **CHANPERM 은 하지 않았다** — §7 M4.

그 밖에 찾은 거짓 실패 자리: §7 M6(3000 포트), M1(빌드 산출물 회귀), m5(typecheck 가 테스트를 덮지 않음).

---

## 6. Claim / Evidence — 커버리지 공백 / 파일 이중 소유

**파일 생성 소유권 — 충돌 없음.**

| 파일 | 생성 | 수정 |
|---|---|---|
| `channel/package.json`, `tsconfig.json`, `src/channel-server.ts`, `test/channel-server.test.ts` | CHANNEL | — |
| `channel/src/index.ts` | CHANNEL(껍데기) | CHANWIRE(전면 교체) → CHANPERM(두 줄 추가) |
| `channel/src/gateway-client.ts`, `test/gateway-client.test.ts` | CHANCLIENT | — |
| `channel/test/index-wiring.test.ts` | CHANWIRE | — |
| `channel/test/permission-relay.test.ts` | CHANPERM | — |

두 SPEC 이 같은 파일을 **생성**하는 자리는 없다. `index.ts` 와 `channel-server.ts` 의 다중 수정은 `depends_on` 이 순서를 강제하므로 각 SPEC 의 `spec_base_sha` 기준 범위 검사와 충돌하지 않는다.

**Task 11–14 요구사항 커버리지 — 한 건의 미소유 항목.**
`missed_after_id` 를 **실제로 소비하는 일**을 아무도 소유하지 않는다. CHANCLIENT §5 는 그것을 CHANWIRE 소유로 미루는데(`spec.md` §5 "채널 배선" 항목), CHANWIRE 의 REQ-CHANWIRE-001..013 어디에도 `onWelcome` 이나 `missed_after_id` 가 없다. → §7 m3. 실제 영향은 없다: `gateway.ts:101-108` 이 `welcome` 직후 놓친 메시지를 **서버가 스스로** 재전송하므로 클라이언트가 그 커서를 쓸 필요가 없다.

---

## 7. 발견 목록

### 차단급 (1건)

**B1 — `SPEC-CHANWIRE-001/acceptance.md:328-336` (AC-CHANWIRE-010 첫째 관측) — 아무것도 재지 않는 기준. Severity: blocker. Class: blocking.**

기준 본문:

```ts
it('importing the module opens no connection', async () => {
  expect(process.argv[1]).not.toContain('index')
  const stub = gatewayStub()
  process.env.MINIDISCORD_TOKEN = 'tok'
  process.env.MINIDISCORD_SERVER = `ws://127.0.0.1:${stub.port()}/bot`
  await import('../src/index.js')
  await new Promise(r => setTimeout(r, 300))
  expect(stub.sent.length).toBe(0)
})
```

같은 파일 상단에 이미 `import { wire } from '../src/index.js'` 가 있다(`acceptance.md:71`). 따라서 `../src/index.js` 는 **테스트 파일 로드 시점에 이미 평가가 끝났고**, 여기서의 `await import(...)` 는 ES 모듈 캐시를 돌려줄 뿐 모듈 본문을 한 줄도 실행하지 않는다. 그 시점은 `gatewayStub()` 이 뜨기 전이고 `process.env` 를 세팅하기 전이다.

결과: **모듈 최상단에서 조건 없이 접속하는 구현도 이 기준을 통과한다.** 그 구현은 파일 로드 시점에 기본 주소 `ws://127.0.0.1:3000/bot` 로 붙으려다 실패하고 백오프 재시도에 들어가는데, 스텁은 그 트래픽을 보지 못하므로 `stub.sent.length` 는 그대로 `0` 이다. 기준의 "Then" 절이 *"모듈 최상단에서 조건 없이 접속하는 구현은 `toBe(0)` 에서 걸린다"* 고 단언하지만 **그 단언은 거짓이다.**

*하류 실패:* REQ-CHANWIRE-002(임포트가 접속을 일으켜서는 안 됨)가 검증되지 않은 채 통과로 기록된다. 배선이 임포트만으로 소켓을 여는 구현이 나가면, `SPEC-CHANPERM-001` 의 AC-CHANPERM-010 을 포함해 `index.ts` 를 임포트하는 모든 테스트가 유령 소켓을 열게 되고, vitest 프로세스가 종료되지 않는 형태로 나중에 드러난다.

*필요한 수정:* 임포트 부작용은 같은 프로세스 안에서 잴 수 없다. 별도 프로세스로 바꾼다 — 스텁을 띄운 뒤 `MINIDISCORD_TOKEN` 을 **주지 않고** `node -e "import('./channel/src/index.js')"`(또는 `npx tsx -e`) 를 자식 프로세스로 실행하고, 그 프로세스가 종료 코드 `0` 으로 끝나며 스텁이 받은 연결이 0건임을 관측한다. 둘째 관측(토큰 없는 실행)이 이미 그 형태이므로 첫째도 같은 형태로 맞추면 된다.

### 주요 (6건)

**M1 — `SPEC-CHANWIRE-001/spec.md:117` (REQ-CHANWIRE-003) ↔ `SPEC-CHANNEL-001/acceptance.md:207-230, 174-186` — 빌드 산출물 관측의 조용한 회귀. Severity: major. Class: blocking.**

CHANNEL 의 **주 관측**(AC-CHANNEL-004)과 무상태 관측(AC-CHANNEL-002)은 둘 다 `node channel/dist/index.js` 를 **환경변수 없이** 실행해 stdout 의 `initialize` 응답을 읽는다. CHANWIRE 의 REQ-CHANWIRE-003 은 진입점을 *"`MINIDISCORD_TOKEN` 이 설정돼 있는 경로에서만"* stdio 에 연결하도록 바꾸고, REQ-CHANWIRE-004 는 토큰이 없으면 stdio 를 연결해서도 안 된다고 못 박는다.

즉 **CHANWIRE 가 착지하는 순간 CHANNEL 의 두 기준은 실행 불가가 된다** — 프로브가 응답을 한 줄도 받지 못한다. 그런데 CHANWIRE 는 그 관측을 대체하지 않는다: AC-CHANWIRE-011 은 `npx tsx channel/src/index.ts` 로 **소스**를 실행해 WebSocket `hello` 프레임만 보고, AC-CHANWIRE-010 둘째 관측도 소스다. 네 SPEC 을 통틀어 **배선 이후 `channel/dist/index.js` 가 실제로 MCP 를 말하는지 재는 기준이 하나도 없다.**

*하류 실패:* CHANNEL `plan.md:105` 가 잡아낸 바로 그 결함 — `bin` 이 가리키는 산출물이 어긋나는 것 — 이 CHANWIRE 단계에서 되살아나도 `npm test` 는 전부 통과한다. 사용자가 `.claude.json` 에 봇을 등록하고 세션을 띄울 때 처음 드러나며, 증상은 "봇이 그냥 아무 반응이 없다"이다.

*필요한 수정:* CHANWIRE 에 기준 하나를 더한다 — `npm run build -w channel` 후 `MINIDISCORD_TOKEN=tok MINIDISCORD_SERVER=ws://127.0.0.1:$PORT/bot` 를 준 채 `node channel/dist/index.js` 를 실행해 (a) 스텁이 `hello` 를 받고 (b) stdin 의 `initialize` 에 stdout 으로 응답이 나오는 것을 함께 관측한다. 두 갈래가 같은 프로세스에서 동시에 성립해야 한다는 것이 이 배선의 핵심 주장이므로, 한 기준으로 묶는 것이 맞다.

**M2 — `SPEC-CHANPERM-001/spec.md:113` (§3.1 가정-2) — 서버 코드가 이미 반박하는 고장 시나리오. Severity: major. Class: blocking.**

SPEC 이 적은 것: *"깨지면 — 서버의 대기 맵이 방으로 나뉘어 있지 않아 **다른 방의 판정이 섞여 들어올 수 있다** — 미해결. 카드 `t7` 소유"*.

실제 코드 (`server/src/permissions.ts:49`):

```ts
if (info.roomId !== roomId) return false   // 다른 방의 답은 소비도 전송도 하지 않고 항목을 남긴다 (REQ-PERM-011)
```

브로커는 방을 **대조한다**. 다른 방에서 친 `yes <id>` 는 소비되지도 전송되지도 않는다. 따라서 "다른 방의 판정이 섞여 들어올 수 있다"는 기술은 **현재 서버 코드에 대해 거짓**이다.

남아 있는 진짜 결함은 훨씬 좁다: `open` 맵의 키가 `request_id` 하나이므로(`permissions.ts:21, 33`), 서로 다른 두 방이 **같은 `request_id`** 를 동시에 대기시키면 뒤엣것이 앞엣것의 `ConnInfo` 를 덮어써 앞 요청이 영구히 고아가 된다. 그것은 "판정이 섞인다"가 아니라 "판정이 사라진다"이다.

*하류 실패:* t7 이 이 SPEC 의 기술을 근거로 수정 범위를 잡으면 존재하지 않는 누출을 막느라 방별 라우팅을 다시 짜고, 실재하는 키 충돌은 그대로 남는다. 감사 원칙상 **검증하지 않은 결함 주장**이다.

*필요한 수정:* §3.1 가정-2 의 "깨지면" 칸을 `permissions.ts:49` 를 인용해 다시 쓴다 — 방 대조는 이미 있고, 남은 결함은 전역 키 충돌로 인한 대기 항목 유실 하나다.

**M3 — `SPEC-CHANPERM-001/spec.md:114` (§3.1 가정-3) — 고장 시나리오가 실제 코드와 다르다. Severity: major. Class: blocking.**

SPEC 이 적은 것: *"서버는 사람이 친 답의 `request_id` 를 `.toLowerCase()` 로 정규화해 되돌린다. Claude Code 가 대문자를 포함한 id 를 만들면 **돌아온 id 가 원본과 달라 Claude Code 가 짝을 못 찾는다**"*.

실제 코드 (`server/src/permissions.ts:33, 46-48`):

```ts
open.set(params.request_id, info)          // L33 — 원본 id 그대로 등록
...
const requestId = m[2].toLowerCase()       // L46 — 소문자로 정규화
const info = open.get(requestId)           // L47 — 소문자 키로 조회
if (!info) return false                    // L48
```

등록은 **원본**으로, 조회는 **소문자**로 한다. 대문자가 섞인 `request_id` 는 L47 에서 **조회가 먼저 빗나가** L48 이 `false` 를 돌려주고, `tryHandleUserReply` 는 그 줄을 평범한 채팅 메시지로 흘려보낸다. 즉 **판정은 애초에 전송되지 않는다** — 돌아온 id 가 다른 것이 아니라, 돌아오는 것이 없다.

사용자에게 보이는 증상도 다르다. SPEC 의 기술대로라면 "세션이 재개되지 않는다"이지만, 실제로는 방에 `✅ 승인 전송됨` 도 `⚠️ 전달하지 못했습니다` 도 뜨지 않고 사용자가 친 `yes AbC12` 가 **그냥 일반 메시지로 남는다**. 진단 난이도가 크게 다르다.

*하류 실패:* M2 와 같다 — t7 이 잘못된 지점을 고친다. 또한 CHANPERM 의 AC-CHANPERM-007 은 채널 쪽 무변형만 재므로 이 오기를 잡지 못한다.

*필요한 수정:* 가정-3 의 "깨지면" 칸을 `permissions.ts:47-48` 을 인용해 "등록은 원본 키, 조회는 소문자 키라 **조회가 빗나가 판정이 전송되지 않는다**"로 고친다. §5 의 t7 위임 항목도 같은 문장으로 맞춘다.

**M4 — `SPEC-CHANPERM-001/acceptance.md:104, 335-345` (`tick()` 과 AC-CHANPERM-010) — 정상 구현을 거짓 실패시킬 수 있는 고정 대기. Severity: major. Class: blocking.**

CHANPERM 하네스는 `const tick = () => new Promise<void>(r => setTimeout(r, 50))` 하나로 모든 비동기를 기다리고, 하네스 서문은 *"형제 SPEC 들의 하네스와 같은 형태다"* (`acceptance.md:38`) 라고 적는다. **같은 형태가 아니다.** 형제 셋은 고정 대기를 이 부류의 대표 결함으로 지목하고 전부 제거했다 (CHANCLIENT `acceptance.md:24`, CHANWIRE `acceptance.md:63`).

인프로세스 `InMemoryTransport` 왕복에는 50 ms 가 넉넉하다. 문제는 **AC-CHANPERM-010** 이다:

```ts
gw.start()
cleanups.push(() => { gw.stop() })
await tick()                    // ← 50ms 안에 TCP+WS 핸드셰이크가 끝나야 한다
...
await sendRequest(client, REQ)  // 내부에서 또 tick()
await tick()                    // ← 50ms 안에 프레임이 소켓을 건너야 한다
const out = gwStub.sent.find(m => m.type === 'permission_request')
```

부하 걸린 기계에서 `gw.start()` 후 50 ms 안에 소켓이 열리지 않으면, 배선이 완벽해도 `out` 이 `undefined` 가 되어 실패한다. 그리고 그 실패 사유는 "배선이 안 됐다"와 구분되지 않는다. 형제 SPEC 이 정확히 이 이유로 `waitFor` 를 쓴다.

*하류 실패:* 카드 t4 의 유일한 권한-릴레이 통합 기준이 간헐 실패하고, 관례대로 `tick` 을 200 ms 로 늘려 덮이면 그때부터는 반대로 **아무것도 재지 않는 대기**가 된다.

*필요한 수정:* AC-CHANPERM-010 에서 소켓을 건너는 두 자리를 조건 대기로 바꾼다 — `await waitFor(() => gwStub.sent.some(m => m.type === 'hello'))`, `await waitFor(() => gwStub.sent.some(m => m.type === 'permission_request'))`. 형제 하네스의 `waitFor` 를 그대로 가져오면 된다. 인프로세스 전용 `tick()` 은 남겨도 무방하나, 하네스 서문의 "같은 형태다" 주장은 사실에 맞게 고친다.

**M5 — `SPEC-CHANCLIENT-001/spec.md:15` — `depends_on: []` 이 실행 순서를 보증하지 않는다. Severity: major. Class: blocking.**

CHANCLIENT 스스로 `spec.md:75-78` 에서 인정한다: *"`channel/` 워크스페이스 스캐폴드 … **실행 전제.** 이것이 없으면 `npm test -w channel` 자체가 없는 워크스페이스를 가리켜 이 SPEC 의 어떤 기준도 실행되지 않는다"*.

`depends_on` 은 문서 취향이 아니라 **오케스트레이터가 읽는 순서 선언**이다. 형제 SPEC 들이 그렇게 쓴다 — CHANWIRE 는 `[SPEC-CHANNEL-001, SPEC-CHANCLIENT-001]`, CHANPERM 은 네 개를 모두 적는다. CHANCLIENT 만 비어 있으면, 병렬 스케줄러는 CHANCLIENT 를 CHANNEL 보다 먼저(또는 동시에) 띄울 수 있고 그러면 AC 16 개가 전부 실행 불가가 된다.

"코드 의존이 아니다"는 맞는 관찰이지만 결론이 틀렸다. `depends_on` 이 표현하는 것은 import 그래프가 아니라 **착수 가능 조건**이다.

*필요한 수정:* `depends_on: [SPEC-CHANNEL-001]` 로 고치고, §3 의 "코드 의존이 아닌 실행 전제" 설명은 그대로 둔다(그 구분은 유용하다).

**M6 — `SPEC-CHANWIRE-001/acceptance.md:355-365` (AC-CHANWIRE-011 (b)) — 프로젝트 서버의 기본 포트를 점유하는 기준. Severity: major. Class: blocking.**

기본 주소 `ws://127.0.0.1:3000/bot` 를 재기 위해 스텁을 **127.0.0.1:3000** 에 바인딩한다. 3000 은 이 프로젝트 서버 자신의 기본 포트다(`plan-v2.md` Global Constraints, `server/src/config.ts`). 개발자가 서버를 띄워 둔 채 테스트를 돌리면 바인딩이 실패한다.

SPEC 은 이것을 알고 *"바인딩이 실패하면 통과가 아니라 **실패**로 기록하고 사유를 Gaps 에 남긴다"* 고 적는다. 정직한 처리이고 건너뛰기보다 낫다. 그러나 결과적으로 **정상 구현이 환경 때문에 실패하는 기준**이며, 그 실패가 반복되면 곧 "환경 탓이니 통과로 치자"로 무너진다 — 그러면 기본 주소 문자열은 아무 값이어도 되는 것이 된다.

*필요한 수정:* 기본값 검증을 포트 점유에서 떼어 낸다. `MINIDISCORD_SERVER` 를 주지 않은 채 진입점을 실행하고, **연결 시도 대상 주소** 자체를 관측하면 된다 — 예: 3000 에 바인딩할 수 있을 때만 (b) 를 돌리고, 그렇지 않으면 `wire()` 를 직접 불러 `gw.opts.url` 이 정확히 `'ws://127.0.0.1:3000/bot'` 인지 단언하는 인프로세스 대체 관측을 둔다. 어느 쪽이든 "3000 이 비어 있어야만 계약이 검증된다"는 상태를 없앤다.

### 사소 (6건)

**m1 — `SPEC-CHANPERM-001/acceptance.md:148-155` (AC-CHANPERM-001) — 이름만 재는 기준. Severity: minor. Class: optional.**
관측 대상이 `--reporter=verbose` 출력에 특정 테스트 **이름**이 나타나는가 하나다. 그 테스트가 단언하는 내용은 AC-002·003·005·006 이 이미 더 강하게 덮으므로, 이 기준이 단독으로 잡는 결함이 없다. 게다가 본문이 *"그 테스트는 `plan-v2.md` Task 14 Step 1 **원본**이며"* 라고 적어, 구현자가 원본을 글자 그대로 옮기면 이음매 1 의 `as any` 결함이 되살아난다(하네스는 교정본을 주므로 모순). 원본 참조 문구를 "하네스의 zod 스키마를 쓴 교정본"으로 바꾸거나, 기준을 002·005 에 흡수시키는 편이 낫다.

**m2 — `SPEC-CHANWIRE-001/acceptance.md:331-332` — `process.env` 오염 후 복원 없음. Severity: minor. Class: optional.**
`process.env.MINIDISCORD_TOKEN`/`MINIDISCORD_SERVER` 를 세팅하고 되돌리지 않는다. vitest 기본 격리가 파일 간 누출은 막지만, 같은 파일의 뒤 테스트에는 남는다. `afterEach` 에서 복원하는 한 줄이면 닫힌다. (B1 을 자식 프로세스 방식으로 고치면 함께 사라진다.)

**m3 — `SPEC-CHANCLIENT-001/spec.md:120` — 존재하지 않는 소비자를 근거로 든 문장. Severity: minor. Class: optional.**
REQ-CHANCLIENT-003 의 근거가 *"그 커서를 쓰는 `SPEC-CHANWIRE-001` 쪽에서 조용히 `undefined` 가 된다"* 인데, CHANWIRE 의 REQ 13 개 어디에도 `onWelcome`·`missed_after_id` 가 없다. 실제로는 `gateway.ts:101-108` 이 `welcome` 직후 놓친 메시지를 서버가 스스로 재전송하므로 클라이언트가 그 커서를 소비할 필요가 없다. **요구사항 자체(프레임 그대로 전달)는 옳다** — 근거 문장만 검증되지 않은 전제다. 근거를 "장래 소비자를 위해 손실 없이 통과시킨다"로 낮추면 된다.

**m4 — `SPEC-CHANWIRE-001/spec.md:138` ↔ `acceptance.md:200-210` — 순서 조항이 관측되지 않음. Severity: minor. Class: optional.**
REQ-CHANWIRE-008 은 `working` 을 *"세션에 넘기기 전에"* 보내라고 하지만, AC-CHANWIRE-003 은 두 사건의 발생만 보고 **순서를 재지 않는다**. AC-CHANWIRE-005 가 `idle` 순서를 `toBeGreaterThan` 으로 재는 것과 대비된다. 실사용 영향은 작으나(둘 다 밀리초 안), 요구사항에 쓴 조항이 어디에서도 관측되지 않는 것은 그 조항이 사실상 없는 것과 같다.

**m5 — 네 SPEC 공통 품질 게이트 — `typecheck` 가 테스트 파일을 덮지 않는다. Severity: minor. Class: optional.**
CHANNEL `plan.md:107` 이 tsconfig 를 `include: ["src"]` + `rootDir: "src"` 로 고치기로 했다(M1 결함을 막기 위해 필요한 교정이다). 그 결과 `tsc --noEmit` 이 `channel/test/**` 를 타입 검사하지 않는다. CHANNEL 은 DoD 에 이 사실을 Gaps 로 기록하지만, CHANCLIENT·CHANWIRE·CHANPERM 은 "typecheck 종료 코드 `0`" 을 단서 없이 품질 게이트로 올린다. 하필 이 부류의 대표 결함(이음매 1)이 **`as any` 로 타입 검사를 가린 것**이었으므로, 세 SPEC 도 같은 Gaps 를 기록하거나 테스트 전용 tsconfig 를 두는 편이 낫다.

**m6 — `SPEC-CHANPERM-001/spec.md:96-101` — 인터페이스 블록의 소유자 표기 오기. Severity: minor. Class: optional.**
§3 의 코드 블록이 `handlePermissionVerdict` 를 포함한 `ChannelHandle` 을 `// SPEC-CHANNEL-001 소유` 주석 아래 둔다. REQ-CHANPERM-010 은 이 SPEC 이 그것을 **추가한다**고 옳게 적는다. 소유권 자체는 §7 이음매 3 에서 확인한 대로 닫혀 있으므로 표기만의 문제다. 주석을 `// 확장 후 최종 형태 (handlePermissionVerdict 는 이 SPEC 이 더한다)` 로 고치면 된다.

---

## 8. Gaps — 검증하지 **않은** 것

이 감사가 관측하지 못한 것을 명시한다. 아래는 통과가 아니라 미검증이다.

1. **MCP SDK 의 실제 동작을 실행으로 확인하지 못했다.** `ls node_modules` 가 비어 있어(의존성 미설치, 설치는 지시에 따라 하지 않음) `Protocol.setNotificationHandler` 가 정말 `schema.shape.method.value` 를 읽는지, `Server.assertNotificationCapability` 가 미선언 메서드의 알림을 거부하는지 **직접 실행해 확인하지 못했다.** 이음매 1 에 대한 내 판정은 "세 SPEC 이 서로 독립적으로 같은 교정을 했고 그 근거를 같은 메커니즘으로 설명한다"는 문서 대조에 기반한다 — SDK 실측이 아니다. CHANNEL 이 이 위험을 엣지 케이스 표에 등록해 둔 것(`SDK 가 미선언 capability 의 알림을 거부` → AC-013 이 `null` 로 실패)은 적절하다. CHANPERM 은 **나가는 `notifications/claude/channel/permission` 에 대해 같은 등록을 하지 않았다** — run 단계 M1 에서 먼저 확인할 것을 권한다.
2. **테스트를 한 건도 실행하지 않았다.** `channel/` 디렉터리는 아직 존재하지 않는다(`ls channel/` → No such file or directory). 모든 판정은 SPEC 문서와 이미 구현된 `server/` 코드의 정적 대조다.
3. **AC-CHANCLIENT-012 의 백오프 수열은 손 추적으로만 확인**했다(원본 `retry()` 의 `Math.min(backoff*2, maxBackoff)` 를 8 회 전개). 실행 검증이 아니다.
4. **`spec-v2.md` 4-B 원문을 읽지 않았다.** 리드가 지정한 근거 범위가 `plan-v2.md` L1–78 과 L2143–2943 이었고, 채널 계약의 리터럴은 그 범위 안의 Task 11 구현 블록에서 대조했다. 공식 channels-reference 문서와의 대조도 하지 않았다 — capabilities 키 문자열(`claude/channel`, `claude/channel/permission`)과 알림 메서드 이름의 **대외 정확성**은 이 감사의 관측 대상 밖이다.
5. **`SPEC-PERM-001`·`SPEC-GATEWAY-001` 의 SPEC 문서 자체를 읽지 않았다.** 서버 쪽은 SPEC 이 아니라 **구현 코드**(`gateway.ts`, `permissions.ts`)를 근거로 삼았다. 코드가 SPEC 을 벗어난 자리가 있다면 이 감사는 그것을 보지 못한다.
6. **각 SPEC 의 `plan.md` §E·§F(마일스톤 절차·알려진 위험)를 전수 읽지 않았다.** CHANNEL 의 §D 만 결함 대조를 위해 읽었다. 마일스톤 절차의 내부 모순은 미검증이다.
7. **네 SPEC 의 `progress.md` 를 읽지 않았다.** 계획 단계 감사이므로 진행 기록은 판정 근거가 아니라고 보았다.

---

## 9. Residual-risk — 관측한 것에도 불구하고 남는 위험

- **CHANWIRE 의 진입점 가드가 `process.argv[1]?.includes('index')` 에 의존한다.** 이 판정은 실행기·번들러·심볼릭 링크에 따라 흔들린다. AC-CHANWIRE-010 이 그 전제를 먼저 단언하는 것은 좋은 방어지만, 실제 사용 경로(`.claude.json` 이 `minidiscord-channel` 을 spawn)에서 `argv[1]` 이 무엇이 되는지는 어느 기준도 재지 않는다. `bin` 이 `dist/index.js` 이므로 통과할 가능성이 높지만 확인된 바 없다 — M1 의 수정이 이 위험도 함께 덮는다.
- **네 SPEC 이 모두 `spec_base_sha` 기반 범위 검사를 쓴다.** 카드 t4 를 워크트리 하나에서 순차 실행하면 성립하지만, 네 SPEC 을 한 커밋으로 합치거나 순서를 바꾸면 AC-CHANWIRE-012 #3(변경 파일 정확히 두 줄)·AC-CHANPERM-011 #3 이 서로를 실패시킨다. 실행 순서는 `depends_on` 에 달려 있으므로 M5 의 수정이 이 위험의 전제 조건이다.
- **`request_id` 형식.** Claude Code 가 만드는 `request_id` 의 실제 형식을 아무도 모른다. 서버 정규식은 `[a-km-z]{5}` 만 받는다(`permissions.ts:7`). 형식이 다르면 권한 릴레이는 **채널이 완벽해도** 끝까지 닫히지 않는다. CHANPERM 이 이것을 §5 에서 t7 소유로 옮긴 것은 옳지만, 카드 t4 완료 시점에 릴레이가 실제로 도는지는 t7 이 끝나기 전에는 확인할 수 없다 — t4 의 DoD 를 "회로가 닫힌다"로 읽지 말 것.
- **`tick()` 을 M4 대로 고쳐도 CHANPERM 의 인프로세스 부정 관측(`requests.length === 0`)은 여전히 50 ms 고정 대기 위에 선다.** 부정 관측에서 고정 대기는 원리상 완벽할 수 없다(늦게 오는 것과 오지 않는 것을 구분할 수 없다). 인프로세스 전송이므로 실제 위험은 낮다.

---

## 10. 판정

**CONDITIONAL PASS.**

아래 7건(B1, M1, M2, M3, M4, M5, M6 — 차단급 1 + 주요 6)이 **전부** 고쳐진 뒤 run 단계에 들어간다. 사소 6건은 리드 재량이다.

네 SPEC 의 구조·범위 경계·계약 대조는 손댈 곳이 없다. 위 항목은 전부 국소 수정이며, SPEC 을 다시 쓰거나 범위를 나눌 이유는 없다.
