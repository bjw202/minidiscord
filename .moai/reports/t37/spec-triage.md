# SPEC 26개 분류 목록 — (a)폐기 · (b)흡수 · (c)종결

카드 `t37` plan 단계 산출물. **문서만 만들었다 — 코드도 SPEC 본문도 한 글자 고치지 않았다.**

| 항목 | 값 |
|---|---|
| 작성 나무 | `.claude/worktrees/t37` (브랜치 `WT-spec-triage-merge`) |
| 기준 트리 | `f5cb336e5e8d57b0374452ee08ddfbe4d4d63e88` (main 기준선) |
| 측정 시각 | 2026-09-04T04:03:05Z |
| 분모 | **26** = main 의 24 + 미병합 2 |

---

## 1. 한눈에 보는 결론

**폐기할 SPEC 은 하나도 없다.** 26개를 전부 코드로 대조한 결과, 코드에 흔적이 없는 설계는 **0건**이었다. 이 저장소의 SPEC 은 전부 실제로 구현돼 있고, 그 구현이 지금도 살아 있다.

- **(a) 폐기 — 0건**
- **(b) 흡수 — 1건**: `SPEC-GWAUTH-001` → `SPEC-GWAUTH-002`. v1 악수(평문 토큰 + HMAC 증명)는 코드에서 사라졌고, v2 SPEC 본문이 v1 조항의 폐기를 명시적으로 선언한다.
- **(c) 종결 — 22건**
- **미정 — 3건**: `SPEC-CHANINJECT-001`(상태 `in-progress`·잔여를 사라진 카드에 이월) · `SPEC-PERMROUTE-001`·`SPEC-LIVEVERIFY-001`(둘 다 구현은 끝났으나 main 미병합)

**이 목록이 답하지 않는 것**: 어느 SPEC 을 `_archive/` 로 옮길지는 운영자 확정 사항이다. 이 문서는 분류와 그 근거만 제출한다.

### 분모에 관한 관측 하나

카드 `t37` 본문은 «SPEC 24개» 라 적었고, 리드 디스패치는 «26개(main 24 + 미병합 2)» 로 지정했다. **리드가 지정한 26을 분모로 썼다.** 차이는 미병합 둘(`SPEC-PERMROUTE-001`·`SPEC-LIVEVERIFY-001`)이며, 어느 쪽이 옳은지는 이 문서가 판정하지 않는다 — 운영자·리드 몫이다.

분모 검증:

```
$ ls .moai/specs | wc -l
24
$ git worktree list
/Users/…/minidiscord                        f5cb336 [main]
/Users/…/.claude/worktrees/t32  9c7d51b [WT-m6-real-session]
/Users/…/.claude/worktrees/t33  832c1cc [WT-username-length]
/Users/…/.claude/worktrees/t34  b1a6907 [WT-perm-verdict-socket]
/Users/…/.claude/worktrees/t37  f5cb336 [WT-spec-triage-merge] locked
$ ls /Users/…/.claude/worktrees/t33/.moai/specs | wc -l
24
```

`t33`(`WT-username-length`)은 SPEC 을 새로 만들지 않았다 — 그 나무의 SPEC 은 main 과 같은 24개다. 그러므로 미병합 SPEC 은 `t34`·`t32` 의 둘뿐이고 분모 26이 성립한다.

---

## 2. 분류 요약표

| # | SPEC | 상태(frontmatter) | 분류 | 근거 한 줄 |
|---|---|---|---|---|
| 1 | SPEC-CORE-001 | completed | **(c) 종결** | `buildServer`·`openDb`·8표 스키마·`/api/health` 가 `server/src/{index,db}.ts` 에 실재 |
| 2 | SPEC-AUTH-001 | completed | **(c) 종결** | `registerAuthRoutes`·`requireAuth`·`md_session` 쿠키가 `server/src/auth.ts` 에 실재 |
| 3 | SPEC-ROOM-001 | completed | **(c) 종결** | `registerRoomRoutes`·`registerBotRoutes` 가 실재하고 `buildServer` 에 배선 |
| 4 | SPEC-MSG-001 | completed | **(c) 종결** | `registerMessageRoutes` + RFC-5987 다운로드 헤더가 `routes-messages.ts` 에 실재 |
| 5 | SPEC-SSE-001 | completed | **(c) 종결** | `createSseHub`·`subscriberCount`·`: connected` 가 `server/src/sse.ts` 에 실재 |
| 6 | SPEC-PERM-001 | completed | **(c) 종결** | `createPermissionBroker`·`PERMISSION_REPLY_RE`·`tryHandleUserReply` 실재 |
| 7 | SPEC-MENTION-001 | completed | **(c) 종결** | `parseMentions` 가 `mention.ts` 에 실재하고 `routes-messages.ts` 가 호출 |
| 8 | SPEC-ROOMAUTHZ-001 | completed | **(c) 종결** | `room_members`·`schema_migrations` 표와 `isRoomMember` 술어 실재 |
| 9 | SPEC-BOT-001 | completed | **(c) 종결** | `/api/rooms/:id/invites` 세 라우트 + `sha256Hex` 실재 |
| 10 | SPEC-GATEWAY-001 | completed | **(c) 종결** | `createGateway` 와 `Gateway` 인터페이스 다섯 메서드가 글자 그대로 실재 |
| 11 | SPEC-CHANNEL-001 | completed | **(c) 종결** | `createChannelServer`·`notifications/claude/channel` 실재 |
| 12 | SPEC-CHANCLIENT-001 | completed | **(c) 종결** | `createGatewayClient`·`requestHistory` 실재 |
| 13 | SPEC-CHANWIRE-001 | completed | **(c) 종결** | `wire()` 와 `MINIDISCORD_TOKEN` 진입점 실재 |
| 14 | SPEC-CHANPERM-001 | completed | **(c) 종결** | `sendPermissionRequest`·`handlePermissionVerdict` 양방향 실재 |
| 15 | SPEC-CHANAUTH-001 | completed | **(c) 종결** ※개정 겹침 | 세 생산자 전부 실재. 단 본문 일부가 후속 둘에 의해 개정됨 — §4.1 |
| 16 | SPEC-CHANINJECT-001 | **in-progress** | **미정** | 상태가 미완이고 §5 잔여를 사라진 카드 `t16` 에 이월 — §4.2 |
| 17 | SPEC-GWAUTH-001 | completed | **(b) 흡수 → SPEC-GWAUTH-002** | v1 악수가 코드에서 제거·거절되고 v2 가 조항 폐기를 명시 — §3 |
| 18 | SPEC-GWAUTH-002 | completed | **(c) 종결** | `hello`/`challenge`/`auth`/`env` 네 프레임 전부 실재 |
| 19 | SPEC-WEBSHELL-001 | completed | **(c) 종결** | `initApp`·`api()`·`@fastify/static` 배선 실재 |
| 20 | SPEC-WEBCHAT-001 | completed | **(c) 종결** | 계약 id 10개 + `openRoom`/`initChat`/`renderMessage` 실재 |
| 21 | SPEC-WEBRICH-001 | completed | **(c) 종결** | `web/rich.js` 값 12개·`rich.d.ts` 형 8개 실재 |
| 22 | SPEC-CI-001 | completed | **(c) 종결** | `.github/workflows/ci.yml` 이 SPEC 의 세 결정을 문자 그대로 반영 |
| 23 | SPEC-E2E-001 | completed | **(c) 종결** | `scripts/e2e.mts`·`restart-persistence.test.ts`·`npm run e2e` 실재 |
| 24 | SPEC-BOTSTAB-001 | completed | **(c) 종결** | `truncate.ts`·`stopped` 재접속 가드 실재, 병합 커밋 `7f0b02a` 관측 |
| 25 | SPEC-PERMROUTE-001 | completed | **(c) 종결 확정** | main 통합 완료(병합 `b8658ba`) — §4.3 재분류 조건 충족, 갱신 기록 §7 |
| 26 | SPEC-LIVEVERIFY-001 | completed | **(c) 종결 확정** | main 통합 완료(병합 `556dfd1`) — §4.3 재분류 조건 충족, 갱신 기록 §7 |

집계(2026-09-04 run 갱신): **(a) 0 · (b) 1 · (c) 24 · 미정 1 = 26** — 갱신 내역 §7

---

## 3. (b) 흡수 — 유일한 한 건

### SPEC-GWAUTH-001 → SPEC-GWAUTH-002

이 판정은 리드 회신에 실릴 유일한 「지우자」 계열 판정이므로, **조사원 결과를 그대로 받지 않고 이 세션이 직접 네 자리를 재현했다.**

**① 생산 코드가 v2 를 구현한다고 스스로 적는다**

```
$ sed -n '1,3p' server/src/gateway.ts
// 봇 게이트웨이: 채널 플러그인의 WebSocket 접속 창구 (spec 6장)
// v2 상호 인증 (SPEC-GWAUTH-002): hello{pub, client_nonce} → challenge → auth → 봉투(env) welcome.
// 서버는 한 번도 평문 토큰을 본 적 없는 검증자(verifier_pub)로 조회하고, 저장한 server_confirm_key 로
```

**② v1 형태 `hello` 는 이제 받는 게 아니라 끊는다**

```
$ sed -n '150,156p' server/src/gateway.ts
  function handleHello(ws: WebSocket, msg: any): void {
    const pub = typeof msg.pub === 'string' ? msg.pub : ''
    const clientNonce = typeof msg.client_nonce === 'string' ? msg.client_nonce : ''
    // pub 이 없는 hello — v1 형태 { type:'hello', token } 을 포함해 — 형식 검사 하나에서 같이 닫힌다.
    // 갈래를 나눠 다르게 대하지 않는 것은 응답 차이로 상대가 어느 갈래에 걸렸는지 알아내지 않게 하기 위해서다
    // (REQ-GWAUTH2-017 — 하향 협상 경로를 남기지 않는다)
    if (!/^[0-9a-f]{64}$/.test(pub) || !/^[0-9a-f]{64}$/.test(clientNonce)) { dropConn(ws); return }
```

**③ v2 SPEC 본문이 v1 조항의 폐기를 명시한다**

```
$ grep -n "SPEC-GWAUTH-001" .moai/specs/SPEC-GWAUTH-002/spec.md | grep -i "폐기"
349:| `SPEC-GWAUTH-001` 의 기준 | **15건 중 대부분** | v1 프로토콜을 재는 기준 전부 | 폐기·교체 대상 — `plan.md` §F |
469:**`SPEC-GWAUTH-001` REQ-GWAUTH-004 는 이 조항으로 폐기된다.** …
    v2 는 채널도 자신을 증명하게 하므로 서버 역시 보호받는 쪽이며, 서버가 옛 `hello` 를
    계속 환영하면 **평문 토큰을 싣는 경로가 살아남아** … 그것이 하향 협상(downgrade)이며 …
```

**④ v2 의 네 프레임이 실측으로 관측된다** (조사원 실행)

```
$ grep -n "arrayContaining(\['hello', 'challenge', 'auth', 'env'\])" server/test/gateway.test.ts
993: expect(kinds).toEqual(expect.arrayContaining(['hello', 'challenge', 'auth', 'env']))
```

**판정**: v1 의 기제는 코드에서 제거됐을 뿐 아니라 **적극적으로 거절**되며, 후속 SPEC 이 그 조항을 문서상으로도 폐기했다. 「흡수」의 조건 — 후속 SPEC 이 범위를 통째로 넘겨받고 원 기제가 살아 있지 않다 — 이 둘 다 성립한다.

**남는 자리에 적을 한 줄 제안**: `SPEC-GWAUTH-001` → 대체됨: `SPEC-GWAUTH-002` (REQ-GWAUTH2-017 이 REQ-GWAUTH-004 를 폐기)

---

## 4. 미정 3건 — 무엇을 세우지 못했는가

### 4.1 (참고) SPEC-CHANAUTH-001 은 종결이되 본문이 겹쳐 개정됐다

이 SPEC 은 **(c)종결**로 분류했다 — 세 생산자(`established` 게이트 · 발신 `request_id` 집합 · `isTransportAllowed`/`resolveUrl`)가 전부 코드에 실재한다.

```
$ grep -n "established\b" channel/src/gateway-client.ts
108:    let established = false   // ③ SPEC-CHANAUTH-001 의 강제 지점이 거는 플래그
186:        if (!established) {
187:          established = true   // 확립 — 봉투 welcome 이 왔을 때만이다 (REQ-GWAUTH2-017 — 맨몸 welcome 은 받지 않는다)
$ grep -n "isTransportAllowed\|resolveUrl" channel/src/index.ts
17:export function resolveUrl(env: NodeJS.ProcessEnv = process.env): string {
30:export function isTransportAllowed(url: string): boolean {
```

다만 **흡수는 아니되 개정이 겹쳐 있다**는 사실을 함께 적는다 — 이 SPEC 자신이 그렇게 기록해 두었다:

```
$ grep -n "거짓이 된다" .moai/specs/SPEC-CHANAUTH-001/spec.md
203:> **v0.6.0 개정 (카드 `t15`, `SPEC-GWAUTH-001` 열세 번째 자리).** v0.5.0 까지 이 조항은
    «`welcome` 프레임이 도착하면» 을 무조건 구동 조건으로 적었고, `SPEC-GWAUTH-001` 이
    착지하면 그 문장은 **거짓이 된다** …
```

그리고 코드 주석(`gateway-client.ts:187`)은 오늘의 확립 조건이 `REQ-GWAUTH2-017`(즉 `SPEC-GWAUTH-002`)임을 가리킨다. 즉 이 SPEC 을 「지금 무엇이 참인가」로 읽으면 틀린다. **`_archive` 로 옮기지 않고 두더라도, 읽는 이가 오독하지 않도록 §2.1·REQ-CHANAUTH-002 자리에 «현재 조건은 SPEC-GWAUTH-002» 포인터가 필요하다** — 다만 그 편집은 이 카드의 범위 밖이므로 운영자 결정 항목으로 올린다.

### 4.2 SPEC-CHANINJECT-001 — 미정 (종결로 밀 수 없다)

**구현은 실재한다:**

```
$ grep -rn "neutralizeEnvelope" channel/src channel/test --include='*.ts'
channel/src/channel-server.ts:34:export function neutralizeEnvelope(s: string): string {
channel/src/channel-server.ts:173:    const nameFrag = truncateToBudget(neutralizeEnvelope(msg.author_name), MAX_NAME_BYTES)
channel/src/channel-server.ts:174:    const bodyFrag = truncateToBudget(neutralizeEnvelope(msg.body), MAX_BODY_BYTES)
channel/test/truncate.test.ts:12: import { neutralizeEnvelope } from '../src/channel-server.js'
channel/test/channel-server.test.ts:6: import { createChannelServer, neutralizeEnvelope } from '../src/channel-server.js'
```

**그럼에도 종결이 아닌 이유 둘:**

**① 상태 자체가 미완이다.**

```
$ sed -n '1,6p' .moai/specs/SPEC-CHANINJECT-001/spec.md
---
id: SPEC-CHANINJECT-001
title: "minidiscord 채널 주입 방어 — 채팅 내용이 모델 지시로 승격되는 경로를 닫는다"
version: "0.3.4"
status: in-progress
amendment_of: SPEC-CHANINJECT-001
```

**② §5 가 잔여 하나를 «후속 카드 t16» 에 넘겨 두었는데, 그 카드가 큐에 없다.**

```
$ grep -n "t16" .moai/specs/SPEC-CHANINJECT-001/spec.md
469:- **작성자 이름이 나가는 셋째 통로.** 작성자 이름은 `params.meta.sender` 로도 나가며
    **그 자리는 중화하지 않는다** … 종결은 후속 카드 `t16` 소유이며, 닫으려면
    REQ-CHANINJECT-002 의 `meta` 무변형 조항과 `AC-CHANINJECT-001/002` 의 무변형 단언을
    함께 개정해야 하므로 이 카드의 범위를 넘는다 (`.moai/reports/t10/sync-audit-2.md` G-01).
$ moai todo      # 큐 전량
t35  queued  …
t36  queued  …
t37  picked  …
```

큐에 `t16` 은 없다. 카드는 닫히면 사라지므로, **이 이월 포인터는 이미 끊어졌다** — 셋째 통로가 닫혔는지 아직 열려 있는지 이 문서는 세울 수 없다.

**세우지 못한 것**: (ㄱ) `status: in-progress` 가 실제 미완인지 갱신 누락인지, (ㄴ) `params.meta.sender` 중화(셋째 통로)가 어딘가에서 닫혔는지. 둘 다 확인 없이는 「종결」이 거짓 주장이 된다.

> **관측 하나 (판정 아님)**: 미병합 나무 `t33`(`WT-username-length`)이 사용자 이름 길이를 다뤘다. §5 잔여의 근거 문장이 «사용자 이름에는 글자 종류·길이 제한이 없으므로» 인 만큼 관련이 있을 수 있으나, **그 나무의 변경 내용을 이 카드에서 대조하지 않았다.** 관련 여부는 미확인이다.

### 4.3 SPEC-PERMROUTE-001 · SPEC-LIVEVERIFY-001 — 미정 (미병합)

둘 다 자기 나무에서는 구현이 완결됐고, **main 기준선에는 흔적이 0이다.** 「코드에 흔적 없음」의 글자만 보면 (a)폐기의 형태를 띠지만, **원인이 다르다 — 폐기된 것이 아니라 아직 병합되지 않았다.**

**SPEC-PERMROUTE-001** (나무 `t34`, 브랜치 `WT-perm-verdict-socket`)

```
$ grep -rn "sendToOrigin" server --include='*.ts' --exclude-dir=node_modules --exclude-dir=dist    # main 기준선
(출력 없음)

$ grep -n "sendToOrigin" …/worktrees/t34/server/src/gateway.ts …/worktrees/t34/server/src/permissions.ts
…/t34/server/src/permissions.ts:105:  ? app.gateway.sendToOrigin(info.connId, { type: 'permission_verdict', request_id: requestId, behavior })
…/t34/server/src/gateway.ts:31:  sendToOrigin(connId: string, payload: object): boolean
…/t34/server/src/gateway.ts:368:    sendToOrigin(connId, payload) {

$ grep -rn "SPEC-PERMROUTE-001" server channel web scripts docs README.md CHANGELOG.md ROADMAP.md    # main 기준선
(출력 없음)
```

**SPEC-LIVEVERIFY-001** (나무 `t32`, 브랜치 `WT-m6-real-session`)

```
$ grep -n "사내망\|과제원" README.md          # main 기준선
(출력 없음)

$ grep -n "사내망\|과제원" …/worktrees/t32/README.md
3:사내망·과제원에서 쓸 것을 전제로 만든 자체 호스팅 채팅 서버예요. …
192:이건 **사내망·과제원에서 쓸 것을 전제로** 만들어졌어요. …

$ grep -n "AC-LIVEVERIFY-015" channel/test/index-wiring.test.ts     # main 기준선
(출력 없음)
$ grep -n "AC-LIVEVERIFY-015" …/worktrees/t32/channel/test/index-wiring.test.ts
635:  // AC-LIVEVERIFY-015 — 배선이 중화를 절단보다 먼저 한다 (경계 fixture, SPEC-LIVEVERIFY-001 §C).
```

**분류가 정해지는 조건**: 카드 `t37` ①(main 통합)이 끝나 두 나무가 main 에 들어오면, 둘 다 곧바로 **(c)종결**로 재분류할 수 있다. 통합 전에는 분류를 확정할 수 없다.

> **경고 (분류와 무관하게 유효)**: 두 브랜치는 **미푸시 유일 사본**이다. 병합 완료 전 나무 폐기는 유일한 사본을 없앤다.

---

## 5. 조사 방법과 그 한계

### 5.1 방법

26개를 6묶음으로 나눠 읽기 전용 조사원에게 병렬 위임했고, 각 묶음은 SPEC 마다 다음을 실행했다.

1. spec.md 의 frontmatter + 요구사항·범위 절만 읽는다 (HISTORY 표는 읽지 않는다 — 최대 630줄이다)
2. 그 SPEC 의 구현이 코드에 남겼을 **고유 식별자** 5~10개를 뽑는다 (export 함수명 · 라우트 경로 · 프레임 `type` 값 · 표·컬럼명 · 환경변수 · 오류 문자열)
3. `server/ channel/ web/ scripts/ .github/` 에 `grep -rn` 하고 **명령과 출력을 그대로** 기록한다
4. SPEC-ID 자체를 두 방향으로 훑는다 — 코드·문서 쪽, 그리고 다른 SPEC 이 이 SPEC 을 흡수/대체한다고 적었는지
5. 네 라벨 중 하나로 분류하고, 근거가 모자라면 **미정**으로 남긴다

훑기는 **SPEC-ID 와 기능 어간 둘 다**로 잡았다 — ID 만으로 잡으면 코드가 ID 를 적지 않는 자리를 통째로 놓친다.

### 5.2 이 세션이 직접 재현한 자리

조사원 결과를 그대로 옮기지 않고 다음을 이 세션에서 다시 실행했다:

- `SPEC-GWAUTH-001` 흡수 판정의 네 자리 전부 (§3 ①~③ + SPEC 본문 :349·:469)
- `SPEC-CHANINJECT-001` 의 frontmatter 상태와 `t16` 이월 문장 (§4.2)
- `SPEC-CHANAUTH-001` 의 v0.6.0 개정 주석 (§4.1)
- 분모 26 성립 근거 — `git worktree list` · `t33` 의 SPEC 개수 · 두 미병합 SPEC 의 frontmatter
- 두 번째 출처로서의 전역 SPEC-ID 교차 참조 계수 (아래)

**전역 교차 참조 계수** — 각 SPEC-ID 가 코드·문서·다른 SPEC 에서 몇 파일에 언급되는지. 분류의 근거가 아니라 **조사원 결과와 어긋나는 행이 있는지 보는 대조표**다:

```
$ (SPEC-ID 별 grep -rl 계수)
SPEC                  code  docs  specs
SPEC-CI-001              0     2      0     ← 다른 SPEC 이 한 번도 언급 않음
SPEC-CORE-001            0     3     12
SPEC-GATEWAY-001         0     2     14
SPEC-MENTION-001         0     2      5
SPEC-GWAUTH-002         15     2      5
SPEC-PERMROUTE-001       0     0      0     ← 미병합
SPEC-LIVEVERIFY-001      0     0      0     ← 미병합
(그 외 24행 생략 — 전부 1 이상)
```

`code` 열이 0인 네 행(`CI`·`CORE`·`GATEWAY`·`MENTION`)은 **SPEC-ID 문자열이 코드 주석에 안 적혔다는 뜻일 뿐**이며, 넷 다 구현 자체는 실측으로 확인됐다(§2 표 1·10·7·22행). **ID 언급 계수를 분류 근거로 쓰면 이 네 건이 거짓 폐기가 된다** — 그래서 이 표는 대조용으로만 쓴다.

### 5.3 세우지 못한 것 (Gaps)

이 문서가 **관측하지 않은** 것을 명시한다:

1. **테스트를 실행하지 않았다.** 분류는 코드의 **존재**로 세웠지 **동작**으로 세우지 않았다. 「구현이 실재한다」는 「구현이 옳다」가 아니다.
2. **HISTORY 표를 통독하지 않았다.** SPEC 당 최대 630줄 중 요구사항·범위 절만 읽었다. 흡수 선언이 HISTORY 안쪽에만 적힌 SPEC 이 있다면 놓쳤을 수 있다 — 다만 흡수 훑기는 `흡수·대체·승계·이월` 어간으로 파일 전체에 걸었다.
3. **`t33`(`WT-username-length`) 나무의 변경 내용을 대조하지 않았다.** §4.2 의 셋째 통로와 관련될 수 있으나 미확인이다.
4. **`.moai/reports/` 의 과거 감사 보고서를 대조하지 않았다.** 분류 근거는 코드와 SPEC 본문 둘뿐이다.
5. **미병합 둘의 브랜치 전체 diff 를 보지 않았다.** 대표 식별자 몇 개의 존재/부재만 확인했다.
6. **22건의 (c)종결 각각을 이 세션이 재현하지는 않았다.** §5.2 에 적은 자리만 직접 실행했고, 나머지는 조사원이 실행한 명령과 출력을 그대로 옮겼다.

### 5.4 남는 위험 (Residual risk)

- **(c)종결 22건에 오분류가 섞였다면 그 방향은 「종결로 과대 판정」이다.** 조사원 여섯이 전부 종결로 수렴한 것은 SPEC 이 실제로 구현됐다는 신호이기도 하지만, 「식별자가 코드에 있다」는 검사가 종결 쪽으로 기우는 검사이기도 하다. `_archive` 이동은 되돌릴 수 있는 조작이므로 이 위험은 감당 가능하다 — **삭제라면 감당할 수 없다.**
- **§4.1 의 `SPEC-CHANAUTH-001` 이 가장 조용한 위험이다.** 종결로 분류돼 보존되지만 본문 일부가 현재형으로 거짓이며, 읽는 이가 그것을 알 방법이 문서 안에 있긴 해도(v0.6.0 주석) 눈에 띄지 않는다.
- **`t16` 포인터 끊김은 이 저장소에서 반복되는 부류다.** `SPEC-CHANAUTH-001` v0.5.0 이 같은 이유로 카드 id 옆에 SPEC 번호를 덧붙이는 처방을 이미 내렸는데, `SPEC-CHANINJECT-001` §5 는 그 처방을 받지 못한 채 남았다.

---

## 6. 운영자·리드 결정이 필요한 항목

이 문서는 판정하지 않고 올리기만 한다.

| # | 항목 | 무엇을 정해야 하나 |
|---|---|---|
| OD-1 | 분모 24 vs 26 | 카드 본문과 리드 디스패치가 다르다 (§1) |
| OD-2 | `SPEC-CHANINJECT-001` 의 `t16` 잔여 | 셋째 통로(`params.meta.sender`)를 새 SPEC 으로 세울지, 「닫지 않는다」로 확정할지 |
| OD-3 | `SPEC-CHANAUTH-001` 오독 방지 | 현재 조건이 `SPEC-GWAUTH-002` 임을 가리키는 포인터를 넣을지 (본문 수정이므로 이 카드 범위 밖) |
| OD-4 | 미병합 둘의 재분류 시점 | main 통합(카드 `t37` ①) 이후 (c)종결로 확정하는 절차 |
| OD-5 | `_archive` 이동 대상 | 이 목록 기준이라면 **`SPEC-GWAUTH-001` 한 건**뿐이다 |

→ **2026-09-04 처분 기록**: OD-1(분모 26)·OD-4(통합 후 재분류)·OD-5(GWAUTH-001 한 건)는 운영자 확정으로 카드 `t37` 에서 집행됐고, OD-2 는 후속 카드 `t38` 로 발급됐으며, OD-3 는 `ROADMAP.md` «후속 후보» 절에 등재됐다. 증거: `.moai/reports/t37/integration.md`

---

## 7. 갱신 기록 — run 단계 (2026-09-04, card t37 ① 완료 직후)

§4.3 이 정해둔 재분류 조건(«카드 t37 ① main 통합이 끝나면 (c)종결로 재분류»)이 충족됐다.

- `SPEC-LIVEVERIFY-001` — 병합 `556dfd1` 로 main 계통에 편입. §2 표 26행을 **(c) 종결 확정**으로 갱신.
- `SPEC-PERMROUTE-001` — 병합 `b8658ba` 로 main 계통에 편입. §2 표 25행을 **(c) 종결 확정**으로 갱신.
- §2 집계를 **(a) 0 · (b) 1 · (c) 24 · 미정 1 = 26** 으로 고침. §1 의 «(c) 22 · 미정 3» 은 plan 시점 기록으로 그대로 둔다 — 본문은 지금 참, 작성 시점 기록은 그때 참.
- 남는 미정 1건은 `SPEC-CHANINJECT-001` — 후속 카드 `t38` 소유.
- 갱신 주체: run 레인(card t37). 증거: `.moai/reports/t37/integration.md`

---

*카드 `t37` plan 단계. 코드·SPEC 본문 무수정. 기준 트리 `f5cb336`.* (§7 갱신은 run 단계)
