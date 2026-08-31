# 카드 `t22` — sync 단계 델타 재감사 (2회차) · `SPEC-GWAUTH-002`

- **감사관**: sync-auditor (독립·회의적 판정자)
- **대상 나무**: `.claude/worktrees/t22`, 브랜치 `WT-gateway-mutual-auth`, HEAD `bc265a4` + 미커밋 편집 **7건**
- **렌즈**: `--security --deep`
- **일자**: 2026-08-31
- **판정**: **FAIL** — 조화평균 **0.822** < 통과선 **0.85**

> 1회차 보고(`sync-audit.md`)의 수치는 이 판정의 입력이 아니다. 네 차원을 **이 나무에서 다시 재고 다시 매겼다**. 인용한 명령은 전부 이 감사가 직접 실행했다.

---

## 0. 통과선 — 내가 읽은 자리

디스패치가 전한 값도, 1회차 보고의 값도 쓰지 않고 규정 원본에서 직접 읽었다.

| 근거 | 파일 : 줄 | 읽은 내용 |
|---|---|---|
| 티어 | `.moai/specs/SPEC-GWAUTH-002/spec.md:15` | `tier: L` |
| 티어별 통과선 | `.claude/rules/moai/workflow/spec-workflow.md:142` | `L (Large) … 0.85` |
| 같은 값의 재진술 | `.claude/rules/moai/workflow/spec-workflow.md:329-330` | Tier S `0.75` · Tier M `0.80` · **Tier L `0.85`** |

**통과선 = 0.85** (`spec-workflow.md:142`).

평가 프로파일: `spec.md` frontmatter(`:1-17`)에 `evaluator_profile` 필드가 없으므로 `harness.default_profile` 의 `default` 를 쓴다 — 가중치 40/25/20/15, must-pass 는 Functionality·Security, hard threshold 는 「커버리지 85% 미만 = Craft FAIL」.

---

## 1. 판정 요약 — 네 차원 재도출

| 차원 | 가중 | 점수 | 판정 | 증거(이 감사가 직접 실행) |
|---|---|---|---|---|
| Functionality | 40% | **0.84** | PASS | `npm test` → **EXIT=1**, `Tests 1 failed \| 94 passed (95)` (server 188/188 초록). 격리 재실행 3회 전부 95/95 |
| Security | 25% | **0.85** | PASS | `grep -rc "https" server/src/*.ts` → 13개 파일 전건 `0`; `server/src/gateway.ts:56` `if (!(sock instanceof TLSSocket)) return 'unbound'` |
| Craft | 20% | **0.78** | PASS | `npx vitest run --coverage` → server `Statements 93.78%` · channel `88.62%` (둘 다 85% 초과) — 그러나 하네스 경합 2건·`pretest` 부재·린터 부재 |
| Consistency | 15% | **0.82** | PASS | `npm run typecheck --workspaces` → `EXIT=0`; `onWelcome` 선언 SPEC 과 **글자 단위 일치**; 그러나 CHANGELOG 공시가 비대칭 |

**조화평균** = 4 / (1/0.84 + 1/0.85 + 1/0.78 + 1/0.82) = 4 / 4.86851 = **0.8216**

**0.8216 < 0.85 → FAIL.**

must-pass 방화벽(Functionality·Security)은 **통과**한다 — Critical/High 발견이 없다. 판정을 뒤집는 것은 방화벽이 아니라 조화평균이며, 이번에 조화평균을 끌어내린 것은 **Craft** 다.

### 왜 1회차보다 낮은가 — 산술로 잇지 않고 다시 매긴 근거

1회차 보고는 「F1 + F3 을 닫으면 0.874」라고 적었다. 그 예측은 **두 발견만이 남은 결함의 전부라는 전제** 위에 서 있었고, 그 전제가 이번 실측으로 깨졌다. 두 발견은 실제로 처리됐다(F3 완전 종결, F1 은 아래 §2 의 판단으로 부분 종결). 그러나 같은 실행에서 **새 차단 발견 2건**이 나왔고, 그중 하나는 **`npm test` 를 실제로 붉게 만든다.** 1회차는 초록 실행 하나를 보고 Functionality 0.88 을 줬고, 나는 붉은 실행 하나를 봤다. 같은 나무에서 결과가 갈린다는 사실 자체가 새 정보다.

---

## 2. F1 처분에 대한 명시적 판정

### 사실관계 — 내가 관측한 것

레인은 `CHANGELOG.md:370`(현재 트리에서는 공시 블록이 2줄을 밀어 **`:372`**)의 문장을 **고치지 않았다.** 대신 그 절 머리(`:363`)에 교체 공시를 붙였다.

```
$ sed -n '361,363p;372p' CHANGELOG.md
361:### 앞서 반영된 계정·방·봇 (카드 `t2`)
363:> **[이 항목의 봇 토큰 저장 형태는 카드 `t22`가 교체했습니다.]** 아래 "봇 초대 API"의
     "서버에는 sha256 해시만 저장합니다"는 **그때의 기록이며 지금 코드의 서술이 아닙니다.**
     현재 `bot_tokens`는 토큰도 그 해시도 저장하지 않고 검증자 `verifier_pub`(Ed25519 공개키)과
     `server_confirm_key`만 저장합니다(`server/src/db.ts`). 현재 서술은 위 "게이트웨이 상호 인증 v2" 항목입니다.
372:- **봇 초대 API** — … 서버에는 sha256 해시만 저장합니다. … (`SPEC-BOT-001`)
```

### 판정 ① — 「과거 릴리스 절은 역사 기록인가」

**부분적으로만 그렇다. 레인의 논거는 내가 검증한 사실 하나에서 약해진다.**

이 CHANGELOG 에는 **릴리스된 버전이 하나도 없다.** 문서 전체가 `## [Unreleased]`(`:5`) 아래에 있고, `t22`·`t15`·`t11`·`t10`·`t9`·`t4`·`t3`·`t2`·`t1` 절은 전부 그 **하나의 미출시 묶음** 안의 `###` 하위 절이다(`grep -n "^#\{1,4\} " CHANGELOG.md` 로 전건 확인). Keep-a-Changelog 관례에서 `[Unreleased]` 는 「지금까지 쌓인 다음 릴리스의 내용」이며, 독자에게는 **날짜가 박힌 과거 기록이 아니라 아직 출시되지 않은 하나의 변경 묶음**으로 읽힌다. 레인이 인용한 「본문은 지금 참, HISTORY는 그때 참」 원칙의 HISTORY 쪽 — **날짜가 박혀 그 날짜에 대해 참인 기록** — 에 이 절들이 깔끔하게 들어가지는 않는다.

레인 자신이 그 사실을 알고 있다. `t15` 절에 붙인 공시(`:70`)가 「**같은 미출시 묶음 안에서** 카드 `t22`가 교체했습니다」라고 적는다.

**그러나 논거가 약하다는 것이 처분이 틀렸다는 뜻은 아니다.** 이 저장소의 CHANGELOG 는 관례적 릴리스 노트가 아니라 **카드별 서사 로그**로 설계돼 있고(각 절이 「이 항목이 이렇게 적힌 경위」·「이걸로 닫히지 않는 것」 같은 당시 판단 기록을 진다), 그 서사를 현재형으로 덮어쓰면 「그때 무엇을 왜 틀렸는가」가 사라진다. 그것은 이 카드가 `SPEC-CHANCLIENT-001` §4.2·§5 에서 **보존+추가**로 옳게 처리한 것과 같은 구조다. 그러므로 **공시로 처리하는 것 자체는 허용 가능한 처분**이며, 나는 「반드시 문장을 고쳐야 한다」는 1회차의 처방을 강제하지 않는다.

### 판정 ② — 「공시가 반증된 주장을 충분히 특정하는가」

**그렇다.** `:363` 은 반증된 문장을 **원문 그대로 인용하고**(「서버에는 sha256 해시만 저장합니다」 — `:372` 의 문자열과 일치), 지금 참인 것을 **구체적으로**(컬럼 이름 둘) 적고, **소스 파일까지 지목한다**(`server/src/db.ts`). 나는 그 현재 서술을 코드로 대조했다:

```
$ grep -n "verifier_pub\|server_confirm_key" server/src/db.ts
35:  verifier_pub TEXT UNIQUE NOT NULL,   -- 조회 열쇠이자 검증자 — Ed25519 공개키 64자 hex
36:  server_confirm_key TEXT NOT NULL,    -- 서버가 자신을 증명하는 대칭 비밀
$ grep -n "token_hash" server/src/db.ts
86:  // SPEC-GWAUTH-002 §D-3 — v1 token_hash 에서 v2 검증자로 가는 변환은 존재하지 않는다…
```

공시의 내용은 참이다. 독자가 `:372` 를 읽고 9줄 위 절 머리로 눈을 올리면 정정에 도달한다. **F1 의 그 인스턴스는 닫혔다.**

### 판정 ③ — 「처리가 내부적으로 일관되는가」 → **아니다. 이것이 새 결함이다.**

공시라는 처분을 택한 순간, 그 처분은 **v2 가 반증한 모든 과거 절**에 걸려야 한다. 내가 훑었더니 **두 절이 빠졌다.**

```
$ grep -n "hello { token }" CHANGELOG.md
227:- **게이트웨이 클라이언트** — `channel/src/gateway-client.ts`가 … 접속하자마자 첫 프레임으로
     `hello { token }`을 보내고, … (`SPEC-CHANCLIENT-001`)        ← 카드 `t4` 절, 공시 없음
313:- **봇 게이트웨이** — `server/src/gateway.ts`가 … `hello { token }` 하나로 토큰이 그 봇의
     방과 신원을 결정하고, … (`SPEC-GATEWAY-001`)                  ← 카드 `t3` 절, 공시 없음
```

두 문장 모두 **v2 가 정면으로 없앤 프로토콜**을 현재형으로 서술한다. 코드로 반증했다:

```
$ sed -n '2p;153p;156p;212p' server/src/gateway.ts
2:  // v2 상호 인증 (SPEC-GWAUTH-002): hello{pub, client_nonce} → challenge → auth → 봉투(env) welcome.
153:  // pub 이 없는 hello — v1 형태 { type:'hello', token } 을 포함해 — 형식 검사 하나에서 같이 닫힌다.
156:  if (!/^[0-9a-f]{64}$/.test(pub) || !/^[0-9a-f]{64}$/.test(clientNonce)) { dropConn(ws); return }
212:  conns.set(ws, conn)   // 등록이 옮겨 온 자리 — v1 은 hello 조회 성공에서 등록해 인증이 등록보다 늦었다
```

`:313` 의 「`hello { token }` 하나로 토큰이 그 봇의 방과 신원을 결정하고」는 두 겹으로 거짓이다 — 그 프레임 형태가 **거절되고**(`:156`), 신원 결정은 `verifier_pub` 조회가 하며(`:158-161`), 무엇보다 **등록이 `auth` 검증 뒤로 옮겨졌다**(`:212`). 이것은 `:372` 의 저장 형태 오류보다 **보안적으로 더 민감한 서술**이다 — 「평문 토큰 하나가 곧 인증」이라는 v1 의 취약 모형을 현재형으로 적고 있기 때문이다.

**왜 살아남았는가 — 레인의 어간 집합을 재현해 원인을 확정했다.**

```
$ grep -c "token_hash\|sha256\|해시만\|해시로 저장\|평문 토큰\|하위 호환\|후속 카드\|proof\|nonce" CHANGELOG.md
18
$ (같은 패턴의 적중 줄) 9 13 15 20 21 26 46 70 76 78 80 84 85 87 139 182 363 372
$ sed -n '227p;313p' CHANGELOG.md | grep -c "<같은 패턴>"
0
```

레인의 어간 집합은 `:372` 를 **잡았고**(그래서 「살아남은 적중은 전부 공시가 덮는 절 안」이라는 레인의 보고는 **그 집합에 대해서는 참**이다), `:227`·`:313` 은 **한 건도 잡지 못한다.** 빠진 어간은 `hello`·`welcome`·`악수`·`token` 이다.

**즉 1회차가 지목한 뿌리 — 「어간 집합이 파일마다 달랐다」 — 는 고쳐졌지만(양쪽에 같은 집합을 걸었다), 더 근본인 「어간 집합이 무엇을 겨누는가」는 고쳐지지 않았다.** 집합이 **저장 형태**만 겨누고 **프레임 형태**를 겨누지 않았고, v2 는 둘 다 바꿨다.

### 무엇이면 충분한가 (요구되는 수정)

1. `CHANGELOG.md` `:221`(카드 `t4`)과 `:309`(카드 `t3`) 절 머리에 `:70`·`:363` 과 **같은 형태의 교체 공시**를 붙인다. 반증된 문장을 원문으로 인용하고(「`hello { token }`」), 지금 참인 것을 적는다(`hello{pub, client_nonce}` → `challenge` → `auth` → 봉투 `welcome`, 등록은 `auth` 검증 뒤).
2. 그 뒤 **프레임 어간**(`hello`·`welcome`·`challenge`·`auth`·`악수`·`env`)을 더한 집합으로 `README.md`·`CHANGELOG.md` 를 다시 훑고, 적중 전건을 「v2 서술 / 공시가 덮는 절 / 미처리」 셋으로 분류한 표를 증거로 남긴다.

---

## 3. 발견 (구조화 결함 목록)

### R1 — [Medium] [**blocking**] 하네스 경합으로 `npm test` 가 붉다 — 카드가 공표한 「종료 코드 0」이 재현되지 않는다

**위치**: `channel/test/gateway-client.test.ts:125-137`(`connected()`) · `:161`(실패 지점)

**실행한 명령과 관측 원문**:

```
$ npm test ; echo "EXIT=$?"
 RUN  …/worktrees/t22/server
      Tests  188 passed (188)

 RUN  …/worktrees/t22/channel
 ❯ test/gateway-client.test.ts (17 tests | 1 failed) 221ms
     × passes the welcome frame through untouched, extra fields included 7ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/gateway-client.test.ts > gateway client > passes the welcome frame through untouched, extra fields included
Error: 하네스: 확립되지 않은 소켓으로 sendInner 를 불렀다
 ❯ Object.sendInner test/gateway-client.test.ts:56:19
 ❯ test/gateway-client.test.ts:161:9

 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 94 passed (95)
EXIT=1
```

**기제를 확정했다 — 추측이 아니다.**

```
$ grep -n "async function connected" -A 12 channel/test/gateway-client.test.ts
135:  await waitFor(() => srv.messages.some(m => m.type === 'hello'))     ← hello 도착만 기다린다
136:  return { client, sleeps }

$ sed -n '54,56p;76,78p' channel/test/gateway-client.test.ts
54:  const sendInner = (ws: WebSocket, inner: object): void => {
55:    const s = sessions.get(ws)
56:    if (!s) throw new Error('하네스: 확립되지 않은 소켓으로 sendInner 를 불렀다')
76:        const p = pending.get(ws)!
77:        sessions.set(ws, { sessKey: …, seq: 0 })                       ← auth 처리에서만 세워진다
```

`connected()` 는 **`hello` 가 서버에 도착하면 반환한다.** 그러나 `sendInner` 가 요구하는 `sessions` 항목은 그 뒤 **두 왕복 더**(`challenge` → `auth`) 지나야 세워진다. 그래서 `:161` 의 `srv.sendInner(...)` 는 세션이 설 때까지의 창을 **경주하고**, 부하가 걸리면 진다.

**이것은 이 카드가 반복해 온 결함의 정확한 재현이다.** v1 에서는 `hello` 가 **클라이언트가 보내는 마지막 악수 프레임**이었으므로 「`hello` 도착 = 확립」이 참이었다. v2 가 악수를 네 프레임으로 늘리면서 그 등식이 깨졌는데, **`connected()` 의 대기 술어는 v1 그대로 남았다.** 프로토콜을 넓히면서 그것을 재는 하네스의 술어를 함께 넓히지 않았다 — 「**정정이 자기 형제를 남긴다**」의 하네스판이며, 1회차가 「훑기가 문서에서 멈추고 코드로 내려가지 않았다」로 예고한 자리다.

**영향 범위**: `connected()` 호출 14곳, `srv.sendInner` 직접 호출 13곳. 경합은 그 교집합 전부에 있다.

```
$ grep -c "await connected(" channel/test/gateway-client.test.ts   → 14
$ grep -c "srv.sendInner\|\.sendInner(" channel/test/gateway-client.test.ts → 13
```

**구현 결함이 아님을 분리 확인했다.** 격리 실행은 통과하고, 연속 3회 채널 스위트 재실행도 전건 통과한다.

```
$ cd channel && npx vitest run test/gateway-client.test.ts
      Tests  17 passed (17)   Duration 343ms
$ (채널 스위트 3회 반복)
      Tests  95 passed (95) / 95 passed (95) / 95 passed (95)
```

**왜 차단인가.** `CHANGELOG.md:63` 이 사용자 대면 문서에서 이렇게 단언한다: 「`npm test` → **server 188개 + channel 95개 = 283개 전부 통과**, 종료 코드 0」. 나는 같은 나무에서 같은 명령을 돌려 **EXIT=1** 을 관측했다. 그 주장은 「그때 한 번은 참」일 수 있으나, **문서가 재현 가능한 사실로 적고 있다.** 더해 붉어진 시험은 하필 **AC-CHANCLIENT-002 를 재는 기준**이고, 그것은 이번 라운드가 F3 로 고친 바로 그 계약이다 — 그 기준이 부하에 따라 붉어지면 「선언이 다시 좁아졌나」를 사람이 손으로 가려야 한다.

**요구되는 수정**: `connected()` 의 대기 술어를 확립까지 넓힌다 — `waitFor(() => srv.sessions.has(srv.sockets[0]))` 또는 `srv.messages.some(m => m.type === 'auth')` 로. 그리고 **`hello` 도착을 확립의 대용으로 쓰는 자리를 어간으로 훑는다**(`transport-auth.test.ts:257` 의 `attachWireTo` 도 같은 형태의 술어를 쓴다 — 함께 본다).

---

### R2 — [Medium] [**blocking**] 교체 공시가 v2 가 반증한 절 넷 중 둘에만 걸려 있다

§2 판정 ③ 참조. `CHANGELOG.md:227`(카드 `t4`)·`:313`(카드 `t3`)이 `hello { token }` 을 현재형으로 서술하고 공시가 없다. 원인은 레인의 어간 집합이 **프레임 형태를 겨누지 않은 것**이며, 재현으로 확정했다(적중 0). 요구되는 수정은 §2 말미.

**비대칭 자체가 결함인 이유**: 공시가 붙은 절과 안 붙은 절이 한 문서에 공존하면, 독자는 **공시 없는 절을 「검토돼서 여전히 참인 절」로 읽는다.** 아무 절에도 공시가 없을 때보다 오독의 신뢰도가 높아진다.

---

### R3 — [Low] [non-blocking] `:211`(카드 `t9`)의 세션 게이트 서술이 v2 기제와 어긋난다 — **낮은 확신**

`CHANGELOG.md:211` 이 「서버가 `welcome`으로 답해 오기 전까지 도착한 프레임은 어느 콜백에도 넘기지 않습니다」로 적는다. 결과 진술로는 여전히 대체로 참이나, v2 에서 그 게이트를 세우는 것은 `welcome` 도착이 아니라 **`challenge` 대조 + 봉투 `mac`·`seq` 통과**다(`channel/src/gateway-client.ts:142-154`·`:186-196`). R2 를 처리할 때 같은 절을 함께 보기를 권한다. **차단으로 세우지 않는다** — 문장의 관측 가능한 귀결이 지금도 참이기 때문이다.

---

### R4 — [Low] [non-blocking] `established` 주석이 코드보다 좁다 (1회차 F8, **생존**)

```
$ sed -n '186,196p' channel/src/gateway-client.ts
186:  if (!established) {
187:    established = true   // 확립 — 봉투 welcome 이 왔을 때만이다 …
194:    if (inner.type === 'welcome') opts.onWelcome?.(inner)
```

mac·seq 를 통과한 **첫 봉투이기만 하면** 확립한다. 보안 영향 없음(§4 ③ 참조). 상태 변화 없음.

---

### 1회차 비차단 발견의 현재 상태 — 하나도 조용히 지우지 않는다

| 1회차 | 상태 | 이 감사가 실행한 확인 |
|---|---|---|
| **F2** `sha256Hex` 호출자 0 | **생존** | `grep -rn "sha256Hex" server/src server/test` → 정의 `routes-bots.ts:16` + 「부르지 않는다」 주석 `gateway.test.ts:182` 둘뿐. 커버리지가 `routes-bots.ts \| … \| 17` 을 미커버로 재확인 |
| **F4** `SPEC-CHANCLIENT-001/plan.md` v1 프레임 계약 표 | **생존** | 1회차 판정(「남겨 둔 것은 옳다, 포인터 한 줄 권고」) 유지. 이번 라운드가 CHANGELOG 에서 **공시 관행을 더 굳혔으므로** 이 자리의 비대칭은 R2 와 같은 부류로 커졌다 |
| **F5** `acceptance.md` 하네스 손뜬 사본 | **사본 충실성 재확인, 대조 장치 여전히 없음** | 스크립트 재대조 → 문서 블록 125줄 **MISSING LINES: 0**. (순서 지표는 중복 줄의 첫 인덱스 해석 탓에 이번 방법으로는 결론 불가 — §5.4 Gap) |
| **F6** `pretest` 부재 | **생존, 미수정** | `python3 -c "…channel/package.json…scripts"` → `{'dev','build','test','typecheck'}` — `pretest` 없음. 깨끗한 체크아웃 재현 불가 그대로 |
| **F7** `transport-auth.test.ts:716` 3000ms | **생존, 미수정** | `sed -n '716p;721p'` → `:716` 기본 3000, `:721` 명시 4500. 형제 `:458`(5000)·`:747`·`:892`(4500)도 확인 — **`:716` 만 기본값이다.** 더해 레인 자신의 `gate-test.txt`(23:59)가 **바로 이 시험의 실패를 기록**하고 있고, 그 뒤 재실행(`gate-retest-1.txt`)은 **전체 스위트가 아니라 이 파일 하나(30건)만** 돌렸다 |
| **F4-prev `plan.md` v1 표** | 위와 동일 | — |

**F7 에 대한 추가 관측 — 레인의 복구 절차가 좁았다.** `gate-test.txt` 는 전체 `npm test` 의 실패다. 그 실패를 「해소」한 증거로 남은 `gate-retest-1.txt` 는 `Test Files 1 passed (1) / Tests 30 passed (30)` — **실패한 파일만 격리 재실행한 것**이다. 실패한 명령을 다시 돌리지 않고 그 부분집합을 돌려 초록을 얻는 것은, 이 저장소가 「감사 보고서도 증거가 아니다」로 이미 한 번 배운 형태의 얕은 복구다. 이번에 내가 **다른 시험(R1)에서 같은 종류의 붉음을 만난 것**이 그 절차의 대가다.

---

## 4. 1회차가 PASS 를 준 자리 — 회귀 확인

### ① 감사 점수 0.86 귀속 — **유지**

```
$ grep -rn "0\.86" .moai/specs/SPEC-GWAUTH-002/spec.md .moai/reports/t22/run-done.md README.md CHANGELOG.md
spec.md:25: … 0.86 은 이 수정 **이전** 나무에서 측정된 4회차 판정이고 …
```
`README.md`·`CHANGELOG.md` 에는 `0.86` 이 **여전히 0회 등장**한다. 최종 트리 점수로 제시하는 자리 없음. 회귀 없음.

### ② `unbound` 채널 바인딩 주장 — **재실측, 참**

```
$ grep -rc "https" server/src/*.ts
server/src/auth.ts:0  gateway.ts:0  db.ts:0  config.ts:0  room-members.ts:0  index.ts:0
permissions.ts:0  mention.ts:0  routes-bots.ts:0  routes-messages.ts:0  routes-rooms.ts:0
sse.ts:0  routes-events.ts:0                                      ← 13개 파일 전건 0
$ sed -n '56p' server/src/gateway.ts
    if (!(sock instanceof TLSSocket)) return 'unbound'
$ (server 커버리지) gateway.ts | … | 60-64,233        ← TLS exporter 갈래 미실행을 도구가 독립 증언
```
회귀 없음.

### ③ F-01 처분과 `t23` 배포 경고 — **유지**

```
$ grep -n 't23' README.md   → :5 · :225 · :236
$ grep -n 't23' CHANGELOG.md → :57
$ sed -n '223p;225p' README.md
223:- **갈래 하나는 닫혔고, 갈래 하나는 지금 어떤 배치에서도 열려 있습니다.**
225:  … 그 자리를 닫는 것은 후속 카드 **`t23`(서버 TLS 종단)**이며, **그때까지 생산 배치는 안 됩니다.**
      … (F-01, Critical — 중계 갈래 미종결)
```
심각도 `Critical` 유지, 갈래 구분 유지, 배포 경고가 배치 안내 바로 옆(`README.md:236`). 회귀 없음.

### ④ 날짜 박힌 정정 블록 보존 — **유지**

`SPEC-CHANCLIENT-001/spec.md:149`(v0.6.0 의 「토큰 또는 `token_hash` 를 아는 상대」)가 그대로 있고, 바로 뒤 `:153-155` 의 v0.7.0 블록이 「그 부류 자체가 없어졌다」를 진다. 보존+추가 패턴 유지.

### ⑤ 하네스 사본 충실성 — **재확인(0줄 누락)**

§3 표 F5 행 참조.

### ⑥ F3 수정 자체 — **완전 종결**

```
$ (gateway-client.ts:15 과 spec.md:96 을 앞공백 제거 후 문자열 비교)
CODE:[onWelcome?: (w: { type: 'welcome'; room_id: number; bot_id: number; bot_name: string; missed_after_id?: number }) => void]
SPEC:[onWelcome?: (w: { type: 'welcome'; room_id: number; bot_id: number; bot_name: string; missed_after_id?: number }) => void]
IDENTICAL
$ sed -n '194p' channel/src/gateway-client.ts
          if (inner.type === 'welcome') opts.onWelcome?.(inner)     ← 넘기는 값과도 일치
$ npm run typecheck --workspaces ; echo EXIT=$?     → EXIT=0
```

**다른 곳이 함께 바뀌어야 했는가 — 확인했고, 아니다.** `channel/src/index.ts` 는 `onWelcome` 을 쓰지 않고(`grep -rn "onWelcome" channel/src` → `gateway-client.ts` 두 자리뿐), 소비자가 넓어진 선언에 깨질 자리는 typecheck 0 이 배제한다. **F3 은 최소 변경으로 정확히 닫혔다.**

---

## 5. 5절 증거

### 5.1 주장 (Claim)

1. 통과선은 `spec-workflow.md:142` 에서 읽은 **0.85** 다.
2. `npm test` 는 이 나무에서 **EXIT=1** 이며(channel 1건 실패), 격리·반복 실행에서는 초록이다.
3. `npm run typecheck --workspaces` 는 EXIT=0 이다.
4. 커버리지는 server 93.78% / channel 88.62% 로 85% 기준을 넘는다.
5. F3 는 SPEC 과 글자 단위로 일치하게 닫혔다.
6. F1 의 그 인스턴스는 공시로 닫혔으나, 같은 처분이 `CHANGELOG.md:227`·`:313` 에는 걸리지 않았다.
7. `:227`·`:313` 이 살아남은 원인은 레인의 어간 집합이 프레임 형태를 겨누지 않았기 때문이다(적중 0 으로 확정).
8. `gateway-client.test.ts` 의 `connected()` 가 확립이 아니라 `hello` 도착을 기다려 13개 `sendInner` 자리에 경합을 만든다.

### 5.2 증거 (Evidence) — 명령과 출력 원문

```
$ npm test ; echo "EXIT=$?"
 RUN  v4.1.11 …/worktrees/t22/server
 Test Files  15 passed (15)      Tests  188 passed (188)      Duration  7.9s
 RUN  v4.1.11 …/worktrees/t22/channel
 ❯ test/gateway-client.test.ts (17 tests | 1 failed) 221ms
     × passes the welcome frame through untouched, extra fields included 7ms
 FAIL  … Error: 하네스: 확립되지 않은 소켓으로 sendInner 를 불렀다
 ❯ Object.sendInner test/gateway-client.test.ts:56:19
 ❯ test/gateway-client.test.ts:161:9
 Test Files  1 failed | 5 passed (6)     Tests  1 failed | 94 passed (95)
EXIT=1
```

```
$ cd channel && npx vitest run test/gateway-client.test.ts
 Test Files  1 passed (1)      Tests  17 passed (17)      Duration  343ms
$ cd channel && (npx vitest run) x3
 Tests  95 passed (95) / 95 passed (95) / 95 passed (95)
```

```
$ npm run typecheck --workspaces ; echo "EXIT=$?"
> typecheck
> tsc --noEmit
> @minidiscord/channel@0.1.0 typecheck
> tsc --noEmit
EXIT=0
```

```
$ cd server && npx vitest run --coverage
All files          |   93.78 |    86.13 |   96.36 |   95.61 |
  gateway.ts       |   94.88 |    86.95 |   96.87 |   96.12 | 60-64,233
  routes-bots.ts   |   95.91 |    85.71 |      90 |   97.61 | 17
Statements : 93.78% ( 573/611 )   Lines : 95.61% ( 480/502 )

$ cd channel && npx vitest run --coverage
All files          |   88.62 |    80.17 |   97.77 |      90 |
 gateway-client.ts |   93.93 |    88.73 |     100 |   95.53 | 74-78,215
 index.ts          |   63.63 |    54.83 |     100 |   64.86 | 98-123
Statements : 88.62% ( 187/211 )   Lines : 90% ( 162/180 )
```

```
$ grep -n "hello { token }" CHANGELOG.md
227:… 첫 프레임으로 `hello { token }`을 보내고 …
313:… `hello { token }` 하나로 토큰이 그 봇의 방과 신원을 결정하고 …
$ sed -n '227p;313p' CHANGELOG.md | grep -c "<레인 어간 집합>"
0
$ grep -c "<레인 어간 집합>" CHANGELOG.md
18            ← :372 는 잡히고 :227·:313 은 잡히지 않는다
```

```
$ git rev-parse --short HEAD      → bc265a4
$ git branch --show-current       → WT-gateway-mutual-auth
$ git status --short               → M 7건 (CHANCLIENT spec/acceptance, GWAUTH-002 progress/spec,
                                     CHANGELOG, README, channel/src/gateway-client.ts)
```

### 5.3 Baseline 귀속

- 테스트·타입검사·커버리지 수치는 전부 **이 나무(`.claude/worktrees/t22`), HEAD `bc265a4` + 미커밋 편집 7건**의 상태에서 **이 감사가 이 실행으로** 낸 값이다.
- 레인의 `.moai/state/verify/t22-sync/fix-test.txt`(`Tests 95 passed (95)`, 00:45)와 `fix-typecheck.txt` 의 **존재를 확인했고 내용도 읽었으나**, 내 주장의 근거로 쓰지 않았다. 나는 같은 명령을 다시 돌렸고 **다른 결과**(EXIT=1)를 얻었다 — 그 차이가 R1 의 본체다.
- 레인의 `gate-test.txt`·`gate-retest-1.txt` 는 **결함의 증거로서** 인용했다(§3 F7 행) — 그 두 파일이 「전체 실패 → 부분집합 재실행」이라는 절차를 기록하고 있기 때문이며, 내용을 통과 근거로 옮겨 적지 않았다.
- 네 차원 점수는 **1회차 값을 산술로 잇지 않고** 이 나무에서 새로 매겼다(§1 「왜 1회차보다 낮은가」).
- plan 감사 `PASS 0.86` 은 이 판정의 입력이 아니다.

### 5.4 Gaps (미검증)

- **린터가 존재하지 않는다.** `.moai/state/verify/t22-sync/gate-lint.txt` 가 두 워크스페이스 모두 `Missing script: "lint"` 를 기록한다. `quality.yaml` 의 sync 단계 LSP 게이트를 **잴 도구가 없다** — 통과가 아니라 공백이고, Craft 에 반영했다.
- **하네스 사본의 순서 일치를 이번 방법으로는 결론짓지 못했다.** 누락 0줄은 재현했으나, 순서 지표는 `}`·`return` 같은 중복 줄이 첫 인덱스로 해석돼 위반 9건을 보고했다 — 방법의 인공물일 가능성이 높고 분리하지 않았다. 1회차의 「위반 0」과 갈리므로 **어느 쪽도 확정으로 쓰지 않는다.**
- **경합(R1)의 발생 확률을 재지 않았다.** 전체 `npm test` 1회에서 1회 관측, 채널 단독 4회에서 0회 관측. 부하를 새로 만들지 않았다(이 저장소의 명시적 금지).
- **변이 32건을 재실행하지 않았다.** 감사 중 변이 실험은 금지 사항이다.
- **게이트웨이를 실제로 띄워 프레임을 눈으로 보지 않았다.**
- **`t1`~`t11` 소유 문장 전건의 정확성은 재지 않았다.** 이 훑기는 **v2 가 낡게 만든 자리**를 겨눴다 — `hello`·`welcome`·저장 형태·하위 호환.
- **`web/` 에 대해서는 어간 훑기만 했고**(적중 0), 화면 문안을 읽지 않았다.

### 5.5 잔여 위험 (Residual-risk)

- **R1 을 고쳐도 같은 부류가 더 있을 수 있다.** 내가 확인한 것은 `connected()` 하나이며, `transport-auth.test.ts` 의 `attachWireTo` 도 `hello` 도착을 기다린다(`:257`). 어간으로 훑지 않으면 다음 라운드에서 세 번째 인스턴스가 나온다.
- **F6·F7 이 남는 한 CI 와 새 체크아웃의 첫 실행은 계속 흔들린다.** 이제 흔들리는 자리가 **둘**(`transport-auth:716`, `gateway-client connected()`)이고, 둘 다 「AC 가 붉어졌는데 방어는 멀쩡하다」는 잘못된 방향의 비용을 낸다.
- **배치 위험은 이 감사가 줄이지 않았다.** 채널 바인딩은 모든 배치에서 `unbound`, 중계형 중간자 미배제. **`t23` 종결 전 생산 배치 불가**는 유효하다.
- **`server_confirm_key` 를 쥔 상대의 게이트웨이 사칭**은 소유 카드가 없다(`README.md:227`). 소유자 없는 잔여다.
- **이 나무는 미푸시 유일 사본이다.** 원격이 없고 sync 편집도 미커밋이다. 나무를 폐기하면 유일 사본이 사라진다.

---

## 6. 판정과 되돌리는 최소 변경

### 판정: **FAIL** — 조화평균 0.822 < Tier L 통과선 0.85 (`spec-workflow.md:142`)

must-pass 방화벽(Functionality·Security)은 통과했다. FAIL 은 **차단 발견 2건이 Craft·Consistency 를 끌어내렸고 조화평균이 낮은 쪽을 벌하기 때문**이다.

### PASS 로 뒤집는 최소 집합 (차단 2건)

1. **R1** — `channel/test/gateway-client.test.ts` 의 `connected()` 대기 술어를 **확립까지** 넓힌다(`hello` 도착 → `auth` 도착 또는 세션 등록). 그리고 「`hello` 도착을 확립의 대용으로 쓰는 자리」를 **어간으로 훑어** `transport-auth.test.ts:257` 을 함께 본다. 고친 뒤 **전체 `npm test` 를 원문 그대로 여러 회 돌려** EXIT=0 을 증거로 남긴다 — 부분집합 재실행은 증거가 아니다.
2. **R2** — `CHANGELOG.md:221`(카드 `t4`)·`:309`(카드 `t3`) 절 머리에 `:70`·`:363` 과 같은 형태의 교체 공시를 붙이고, **프레임 어간을 더한 집합**으로 두 문서를 다시 훑어 적중 전건 분류표를 증거로 남긴다.

### 함께 처리하기를 강하게 권하지만 판정 조건은 아닌 것

- **F6** — `channel/package.json` 에 `"pretest": "tsc"`. R1 을 고치면 남는 재현 불가 요인이 이것 하나다.
- **F7** — `transport-auth.test.ts:716` 의 대기를 형제(`:458`/`:721`/`:747`/`:892`)와 같은 넓이로.
- **F2** — `sha256Hex` 제거.
- **R3·R4·F4·F5** — 포인터 한 줄 / 주석 정정 / 대조 장치.

### 이 라운드를 뒤집어 적는다

레인은 1회차의 두 처방을 **성실히** 처리했다. F3 는 한 줄로 정확히 닫혔고 — SPEC 과 글자 단위 일치, 넘기는 값과도 일치, typecheck 0 — F1 은 처방을 그대로 따르는 대신 **이 저장소의 원칙에 비추어 다시 판단했고, 그 판단 자체는 존중받을 만하다.** 판정자의 처방을 무비판적으로 집행하지 않고 근거를 대며 다른 처분을 택하는 것은 이 프로젝트가 여러 번 옳게 해 온 일이다. 나는 그 처분을 **받아들인다.**

무너진 것은 처분이 아니라 **처분의 적용 범위**다. 「고치는 대신 공시한다」를 택한 순간 그것은 **문서 전체에 대한 정책**이 되는데, 레인은 그 정책을 **자기 어간 집합이 짚어 준 두 절에만** 적용했다. 그리고 어간 집합은 저장 형태만 겨누고 프레임 형태를 겨누지 않았다.

같은 형태가 코드에서 한 번 더 났다. v2 가 악수를 두 프레임에서 네 프레임으로 늘렸는데, 그것을 재는 하네스의 「확립됐는가」 술어는 v1 그대로 `hello` 를 기다린다. **프로토콜을 넓히면서 그 프로토콜을 재는 술어를 함께 넓히지 않았다.**

다음 라운드에 넘길 한 줄: **어간 집합은 「무엇을 고쳤는가」가 아니라 「무엇이 바뀌었는가」에서 도출한다.** 이 카드가 바꾼 것은 저장 형태만이 아니라 **프레임 형태와 확립 시점**이었고, 어간 집합에 그 둘이 없었기 때문에 문서에서 두 자리, 코드에서 한 자리가 함께 살아남았다.

---

*판정자: sync-auditor. 이 판정은 구속력이 있으며, 여기 인용된 모든 명령은 이 감사가 이 나무에서 직접 실행했다.*
