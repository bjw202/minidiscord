# 카드 `t22` — sync 단계 델타 재감사 (3회차) · `SPEC-GWAUTH-002`

- **감사관**: sync-auditor (독립·회의적 판정자)
- **대상 나무**: `.claude/worktrees/t22`, 브랜치 `WT-gateway-mutual-auth`, HEAD `bc265a4` + 미커밋 편집 **12건**
- **렌즈**: `--security --deep`
- **일자**: 2026-08-31
- **판정**: **PASS** — 조화평균 **0.854** ≥ 통과선 **0.85**

> 1·2회차 보고의 수치는 이 판정의 입력이 아니다. 네 차원을 이 나무에서 다시 재고 다시 매겼다. 인용한 명령은 전부 이 감사가 직접 실행했고, 원문은 `.moai/state/verify/t22-audit3/` 아래에 있다.
>
> **여유가 0.004 다.** §1.3 에 어느 판단이 뒤집히면 FAIL 이 되는지를 명시한다.

---

## 0. 통과선 — 내가 읽은 자리

디스패치가 전한 값도, 앞선 두 보고의 값도 쓰지 않고 규정 원본에서 직접 읽었다.

| 근거 | 파일 : 줄 | 읽은 내용 |
|---|---|---|
| 티어 | `.moai/specs/SPEC-GWAUTH-002/spec.md:15` | `tier: L` |
| 티어별 통과선 | `.claude/rules/moai/workflow/spec-workflow.md:142` | `L (Large) … 0.85` |
| 같은 값의 재진술 | `.claude/rules/moai/workflow/spec-workflow.md:329-330` | Tier S `0.75` · Tier M `0.80` · **Tier L `0.85`** |

**통과선 = 0.85** (`spec-workflow.md:142`).

프로파일: `spec.md` frontmatter 에 `evaluator_profile` 이 없으므로 `default` — 가중치 40/25/20/15, must-pass 는 Functionality·Security, hard threshold 는 「커버리지 85% 미만 = Craft FAIL」.

---

## 1. 판정 요약

### 1.1 네 차원 — 이 나무에서 재도출

| 차원 | 가중 | 점수 | 판정 | 증거(이 감사가 직접 실행) |
|---|---|---|---|---|
| Functionality | 40% | **0.90** | PASS | `npm test` **3회 전부 EXIT=0**, `188 passed` + `95 passed` = 283. `npm run typecheck --workspaces` EXIT=0 |
| Security | 25% | **0.86** | PASS | `gateway.ts:56` `unbound` 유지 · `grep -c https server/src/index.ts` → `0` · `t23` 배포 경고 README `:5 :225 :236` + CHANGELOG `:57` · `CHANGELOG.md:238` 이 반대 방향 과장을 명시 차단 |
| Craft | 20% | **0.82** | PASS | 커버리지 server `93.78%` / channel `88.62%` (둘 다 85% 초과) · 하네스 사본 `diff` **exit 0, 147줄 완전 일치** |
| Consistency | 15% | **0.84** | PASS | 교체 공시 **6건**(`:70 :209 :225 :238 :317 :371`) · `npm run typecheck --workspaces` EXIT=0 |

**조화평균** = 4 / (1/0.90 + 1/0.86 + 1/0.82 + 1/0.84)
= 4 / (1.111111 + 1.162791 + 1.219512 + 1.190476)
= 4 / 4.683890 = **0.85399 → 0.854**

**0.854 ≥ 0.85 → PASS.** must-pass 방화벽(Functionality 0.90 · Security 0.86) 통과. **차단 발견 0건.**

### 1.2 왜 2회차(0.822)보다 높은가 — 산술로 잇지 않은 근거

2회차의 차단 둘이 실제로 닫혔고, 닫힘을 내 실행으로 확인했다.

- **R1** — 2회차는 전체 `npm test` 1회에서 **EXIT=1** 을 관측했다. 나는 같은 명령을 **3회 돌려 3회 모두 EXIT=0** 을 관측했다. 더 중요한 것은 회수가 아니라 **기제**다: 대기 술어가 `sendInner` 가 요구하는 **바로 그 맵**을 읽도록 바뀌었다(§2.1). 타임아웃을 늘려 초록을 산 것이 아니다.
- **R2** — 2회차가 지목한 두 절(`:227`·`:313`, 현재 `:229`·`:321`)에 공시가 붙었고, 레인이 스스로 두 자리를 더 찾아 붙였다. **v2 가 교체한 프로토콜을 «서술하는» 절 가운데 공시가 없는 절은 이제 없다**(§3, 내 어간으로 재훑음).

2회차 대비 올라간 두 자리는 그 둘이고, **내려간 자리도 있다**(§4.6 — 이번 라운드의 작업 기록이 디스크에 없다). 순증이 조화평균 +0.032 다.

### 1.3 [HARD] 무엇이 뒤집히면 FAIL 인가 — 여유 0.004 의 공시

이 PASS 는 얇다. 다음 중 **하나라도** 달리 판단되면 FAIL 이다.

| 뒤집히는 판단 | 바뀐 값 | 조화평균 | 판정 |
|---|---|---|---|
| Craft 를 2회차 값 0.80 으로 본다면 | 0.82 → 0.80 | **0.848** | **FAIL** |
| Consistency 를 2회차 값 0.82 로 본다면 | 0.84 → 0.82 | **0.846** | **FAIL** |
| 아래 F-11(`CHANGELOG.md:148`)을 **차단**으로 세운다면 | — | — | **FAIL** (차단 방화벽) |

내가 Craft 를 0.78 → 0.82 로 올린 근거는 둘이며 둘 다 실측이다: ① 2회차가 결론 불가로 남긴 하네스 사본 순서 일치를 **완전 일치**로 확정했다(§4.1) ② 하네스 경합이 타임아웃 상향이 아니라 **술어 교체**로 닫혔다(§2.1). 내린 근거 하나는 §4.6 이다. Consistency 를 0.82 → 0.84 로 올린 근거는 §3 이고, 내린 근거는 §4.6 과 F-11 이다.

**F-11 을 차단으로 세우지 않은 이유는 §5 에 따로 적는다** — 이 판정에서 가장 논쟁적인 자리이기 때문이다.

---

## 2. R1 — 하네스 경합 수정에 대한 판정

### 2.1 (가) 새 술어가 `sendInner` 가 요구하는 것을 「재는가」, 아니면 「상관될 뿐인가」 → **잰다**

`sendInner` 가 요구하는 조건과 `establishedCount()` 가 읽는 대상이 **같은 객체**임을 소스로 확인했다.

```
$ sed -n '54,56p;77,78p;91p' channel/test/gateway-client.test.ts
 54:  const sendInner = (ws: WebSocket, inner: object): void => {
 55:    const s = sessions.get(ws)
 56:    if (!s) throw new Error('하네스: 확립되지 않은 소켓으로 sendInner 를 불렀다')
 77:        // auth 통과 — 이 소켓의 세션을 세우고 …
 78:        sessions.set(ws, { sessKey: sessKeyOf('tok123', p.cn, p.sn, 1, 2), seq: 0 })
 91:    establishedCount: () => sessions.size,
```

`sendInner` 의 전제는 `sessions.get(ws)` 이고 술어가 읽는 것은 같은 `sessions` 의 `size` 다. **간접 지표가 아니라 같은 사실의 다른 사영이다.** 2회차의 `messages.some(m => m.type === 'hello')` 는 `sessions` 와 아무 관계가 없었고 — `hello` 도착 뒤 `challenge`→`auth` 두 왕복이 더 남아 있었다 — 그것이 경합의 전부였다.

**남는 간극은 하나뿐이고 정직하게 적는다: 개수는 재고 「신원」 은 재지 않는다.** `sendInner` 는 특정 `ws` 를 요구하는데 술어는 어느 소켓이 섰는지 묻지 않는다. 아래 (나)에서 이 간극이 현재 호출처에서 닫혀 있음을 보인다.

### 2.2 (나) 델타 형태가 두 클라이언트 경우에 옳은가 · 영원히 기다릴 자리가 있는가 → **옳다 · 없다**

**영원한 대기의 유일한 기제는 `sessions` 의 감소인데, 감소가 존재하지 않는다.**

```
$ grep -n "sessions.delete\|sessions.set\|sessions.size\|sessions.get" channel/test/gateway-client.test.ts
56:    const s = sessions.get(ws)
78:        sessions.set(ws, { … })
91:    establishedCount: () => sessions.size,
```

`sessions.delete` 는 **0건**이다. 소켓이 끊겨도 항목이 남으므로 `sessions.size` 는 **단조 증가**한다. 따라서 `establishedBefore` 를 찍은 뒤 새 세션이 하나라도 서면 술어는 반드시 참이 되고, 「앞 클라이언트가 죽어 개수가 되돌아가 영영 넘지 못하는」 경로는 구조적으로 없다. 이것이 델타 형태의 안전을 지탱하는 사실이며, `sessions.delete` 가 나중에 추가되면 그 순간 이 안전은 사라진다 — F-10 으로 남긴다.

**두 클라이언트 자리**(`:418`·`:419`, 디스패치가 `:405`·`:406` 으로 전한 자리):

```
$ sed -n '416,420p' channel/test/gateway-client.test.ts
    const srv = startServer()
    const stopped = await connected(srv)
    const control = await connected(srv)                 // 대조군: 멈추지 않는다
    await waitFor(() => srv.sockets.length === 2)
```

두 `connected()` 가 **직렬로 await** 된다. 첫 호출은 `before=0` 에서 1 을 기다리고, 둘째는 `before=1` 에서 2 를 기다린다. 절대 개수(`>= 1`)였다면 둘째가 첫째의 확립을 자기 것으로 착각하고 즉시 반환했을 것이다 — **델타가 필요한 이유가 정확히 이 자리이고, 레인의 설명(`:132-133` 주석)은 참이다.**

신원 간극이 발화하려면 `connected()` 대기 중에 **다른 소켓이 확립**해야 한다. 14개 호출처 전건을 읽었고, 재접속 루프가 도는 중에 `connected()` 를 부르는 자리는 **없다**(`:351` 은 그 시험의 첫 클라이언트, `:418`·`:419` 는 어떤 절단보다 앞선다). 현재 트리에서 간극은 도달 불가다.

### 2.3 (다) 위험하다고 지목된 세 자리 — 내가 다시 도출

| 자리 | 레인의 우려 | 내 판정 |
|---|---|---|
| `:167` `autoWelcome: false` | welcome 을 안 보내는 서버에서 확립을 기다리면 멈추지 않는가 | **문제없다 — 오히려 이 자리가 R1 의 진앙이었다.** `sessions.set`(`:78`)은 `auth` 처리에서 무조건 일어나고, `autoWelcome` 은 그 **다음 줄**의 welcome 발신만 가른다. 그래서 확립은 온다. 그리고 2회차가 붉은 것을 관측한 시험이 **바로 이 시험**이다(`:172` 의 `srv.sendInner(srv.sockets[0], frame)`) — 옛 술어에서 확립 전에 반환해 두 왕복의 창을 경주했다. 새 술어가 그 창을 없앤다 |
| `:200-215` 프레임 순서 | 확립을 기다리면 welcome 이 먼저 와서 순서 단언이 깨지지 않는가 | **문제없다, 그리고 결정적이 됐다.** 하네스가 `auth` 처리에서 welcome 봉투를 보내므로(`:79`), 확립을 기다린 시점에 welcome 은 **이미 발신됐다.** 시험 본문 주석(`:213-215`)이 「welcome 이 먼저 온다」를 전제하는데, 옛 술어에서는 그 전제가 경합에 걸려 있었다. 새 술어가 전제를 참으로 고정한다 |
| `:309-311` 가짜 타이머 전환 | 확립을 실제 타이머로 마치기 전에 `vi.useFakeTimers()` 가 들어오면 악수가 멈추지 않는가 | **문제없고, 이 자리도 개선됐다.** `await connected(srv)` 가 **확립까지** 실제 타이머로 마친 뒤에야 `:311` 이 타이머를 바꾼다. 옛 술어는 `hello` 도착에서 반환했으므로 `challenge`→`auth` 왕복이 가짜 타이머 위로 넘어갈 수 있었다 |

**세 자리 모두, 레인의 「옛 동작이 필요한 호출처는 없다」는 보고가 참이다.** 더해 셋 다 새 술어에서 **더 결정적**이 된다 — 레인이 「없다」고만 적은 것보다 사실이 강하다.

### 2.4 실행 확인 — 실패한 명령을 통째로, 부분집합이 아니라

```
$ npm test ; echo "EXIT=$?"          (3회 반복, 원문 .moai/state/verify/t22-audit3/fulltest-{1,2,3}.txt)
  RUN  v4.1.11 …/worktrees/t22/server
  Test Files  15 passed (15)      Tests  188 passed (188)
  RUN  v4.1.11 …/worktrees/t22/channel
  Test Files   6 passed (6)       Tests   95 passed (95)
EXIT=0   (1회차)
EXIT=0   (2회차)
EXIT=0   (3회차)

$ npm run typecheck --workspaces ; echo "EXIT=$?"     (원문 typecheck.txt)
> typecheck
> tsc --noEmit
> @minidiscord/channel@0.1.0 typecheck
> tsc --noEmit
EXIT=0
```

**2회차가 붉은 것을 본 나무와 이 나무는 같은 baseline 이 아니다** — 그 사이에 네 시험 파일이 바뀌었다. 두 결과를 같은 실험의 두 표본으로 세지 않는다.

---

## 3. R2 — 공시 비대칭에 대한 판정

### 3.1 공시는 다섯이 아니라 **여섯**이다

디스패치는 「다섯」이라 전하면서 여섯 자리를 열거했다. 내가 셌다 — **여섯이 맞다.**

```
$ grep -n "카드 `t22`가 교체했습니다" CHANGELOG.md      → :70 :209 :225 :317 :371   (5건)
$ sed -n '238p' CHANGELOG.md                            → 「… 카드 `t22`가 부분적으로 뒤집었습니다 …」 (1건)
```

여섯째(`:238`)는 「교체」가 아니라 「부분적으로 뒤집었다」로 적혀 있어 같은 어간으로 잡히지 않는다. 그 문언 선택 자체는 옳다 — 그 절이 감사 기록이고 결론이 전부 뒤집힌 것이 아니기 때문이다.

### 3.2 (나) `:238` 공시가 반대 방향 과장을 만드는가 → **아니다. 명시적으로 막는다**

```
$ sed -n '238p' CHANGELOG.md
> **[이 감사 기록의 인증 비대칭 판단은 … 카드 `t22`가 부분적으로 뒤집었습니다.]** … v2에서는 서버가
  `challenge`의 `server_proof`로 자신을 먼저 증명하고 … 다만 **F-01이 닫혔다는 뜻은 아닙니다** —
  채널 바인딩이 오늘 배치에서 `unbound`라 중계형 중간자는 여전히 배제되지 않고, 그 갈래는 후속 카드
  `t23`(서버 TLS 종단)의 몫입니다(`README.md`).
```

「F-01이 닫혔다는 뜻은 아닙니다」가 **한 문장으로 반대 과장을 차단한다.** 이것은 요구된 것 이상이다 — 2회차 처방은 「반증된 주장을 특정하라」였지 「반대 과장까지 막으라」가 아니었다. 이 문단은 §1.2 의 Security +0.01 의 근거다.

### 3.3 (가) 집합이 완전한가 — **내 어간으로 다시 훑었다**

레인의 어간(`hello { token }` 계열)을 쓰지 않고, **v2 가 바꾼 것에서 어간을 도출**했다: 프레임 형태(`hello`·`welcome`·`challenge`·`auth`·`악수`·`봉투`·`env`·`mac`·`seq`) + 저장 형태(`token_hash`·`sha256`·`해시`·`verifier_pub`) + 신뢰 모형(`평문 토큰`·`proof`·`nonce`·`하위 호환`·`토큰 인증`).

공시가 없는 절 전 구간(`:101-206` 카드 `t11`·`t10`, `:259-314` 카드 `t5`·`t7`, `:403-` 카드 `t1`)에 그 집합을 걸었다.

```
$ grep -n "<위 어간 집합>" CHANGELOG.md | awk -F: '$1>=101 && $1<207 || $1>=259 && $1<315 || $1>=403'
   → 적중 12줄. 전건을 읽고 v2 대조로 분류했다.
```

| 분류 | 줄 | 판정 근거 |
|---|---|---|
| **지금도 참** | `:107 :113 :120 :141 :162 :172 :174 :180 :182 :184 :262` (11줄) | `:120` 「그 토큰으로 게이트웨이에 붙으면」 — 토큰은 v2 에서도 채널이 키쌍을 유도하는 자격 증명이므로 참이다. `:182` 는 `meta.sender`(카드 `t16` 소유)로 v2 와 무관. 나머지는 방 인가·주입 방어·웹 토큰으로 v2 무관 |
| **v2 가 반증** | **`:148`** (1줄) | 아래 F-11 |

**README 도 같은 집합으로 훑었다.** `:114 :147-155 :223-236 :291` 은 전부 v2 서술로 갱신돼 있다(직접 읽음). 반증되는 자리는 `:5` 의 삽입구 하나뿐이며(F-12), 같은 문장 뒷부분이 스스로 정정하므로 Low 다.

**결론: 프로토콜을 「서술하는」 절 가운데 공시 없는 절은 0건이다.** 남은 것은 아래 F-11 하나이고, 그것은 서술이 아니라 「무변경 단언」 이다.

---

## 4. 그 밖의 확인

### 4.1 하네스 문서 사본 — 2회차가 결론 못 낸 자리를 확정했다

2회차는 「누락 0줄」까지는 재현했으나 순서 일치를 중복 줄 인덱싱 인공물 때문에 결론짓지 못했다. **완전한 순서 대조로 확정한다.**

```
$ sed -n '2,148p'   channel/test/gateway-client.test.ts            > /tmp/src_harness.txt
$ sed -n '56,202p'  .moai/specs/SPEC-CHANCLIENT-001/acceptance.md  > /tmp/mirror_harness.txt
$ wc -l /tmp/src_harness.txt /tmp/mirror_harness.txt
     147 /tmp/src_harness.txt
     147 /tmp/mirror_harness.txt
$ diff /tmp/src_harness.txt /tmp/mirror_harness.txt ; echo "DIFF_EXIT=$?"
DIFF_EXIT=0
```

**출력 0줄, exit 0 — 147줄이 바이트 단위로 완전히 같다.** 누락도 없고 순서도 같다. 경계도 확인했다(`acceptance.md:55` 가 여는 `ts` 펜스, `:203` 이 닫는 펜스). **1회차의 「충실」이 옳았고 2회차의 미결은 방법의 인공물이었다.** 레인의 `MIRROR-IDENTICAL-FINAL` 주장은 참이다.

기계 대조 장치가 여전히 없다는 사실은 그대로다(F5 생존).

### 4.2 범위 규율 — 승인된 범위 밖 변경 없음

```
$ git diff --stat
 .claude/agent-memory/sync-auditor/MEMORY.md   |   2 +
 .moai/specs/SPEC-CHANCLIENT-001/acceptance.md | 142 ++++++++++++------
 .moai/specs/SPEC-CHANCLIENT-001/spec.md       |  41 ++++---
 .moai/specs/SPEC-GWAUTH-002/progress.md       |  59 +++++++++
 .moai/specs/SPEC-GWAUTH-002/spec.md           |   4 +-
 CHANGELOG.md                                  |  73 +++++++++++
 README.md                                     |  37 ++++---
 channel/src/gateway-client.ts                 |   2 +-
 channel/test/gateway-client.test.ts           |  19 +++-
 channel/test/index-wiring.test.ts             |   7 +-
 channel/test/permission-relay.test.ts         |   5 +-
 channel/test/transport-auth.test.ts           |  14 ++-
 12 files changed, 336 insertions(+), 69 deletions(-)
```

2회차가 기록한 수정 파일은 **7건**이었다(CHANCLIENT spec/acceptance · GWAUTH-002 progress/spec · CHANGELOG · README · `channel/src/gateway-client.ts`). 지금은 12건이고 **델타는 정확히 네 시험 파일 + 감사관 메모리 파일**이다. 승인 범위(시험 4 + `acceptance.md` + `CHANGELOG.md`) 밖으로 새로 들어온 파일은 없다.

### 4.3 `src/` 무변경 주장과 커버리지 — **레인의 논거는 불완전하다. 내가 재서 닫았다**

`src/` 변경은 정확히 한 줄이고, 2회차가 이미 채점한 그 줄과 같다.

```
$ git diff -- channel/src server/src
-  onWelcome?: (w: { room_id: number; bot_id: number; bot_name: string }) => void
+  onWelcome?: (w: { type: 'welcome'; room_id: number; bot_id: number; bot_name: string; missed_after_id?: number }) => void
```

**그러나 「`src/` 를 안 건드렸으니 커버리지를 다시 잴 필요가 없다」는 논거는 성립하지 않는다.** 커버리지는 `src` 만의 함수가 아니라 `src × 시험`의 함수이고, 이번 라운드는 **시험 네 파일을 바꿨다.** 특히 `connected()` 의 술어 교체는 어느 코드 경로가 실행되는지를 실제로 바꾼다(악수가 항상 끝까지 간다). channel 은 2회차에 88.62% 로 기준선 위 3.6%p 였고, `index.ts` 는 63.63% 였다 — 흔들릴 여지가 있는 폭이다.

**그래서 내가 쟀다.**

```
$ cd channel && npx vitest run --coverage   ; echo EXIT=$?      (원문 coverage-channel.txt)
All files          |   88.62 |    80.17 |   97.77 |      90 |
 gateway-client.ts |   93.93 |    88.73 |     100 |   95.53 | 74-78,215
 index.ts          |   63.63 |    54.83 |     100 |   64.86 | 98-123
Statements   : 88.62% ( 187/211 )      EXIT=0

$ cd server && npx vitest run --coverage    ; echo EXIT=$?      (원문 coverage-server.txt)
All files          |   93.78 |    86.13 |   96.36 |   95.61 |
  gateway.ts       |   94.88 |    86.95 |   96.87 |   96.12 | 60-64,233
  routes-bots.ts   |   95.91 |    85.71 |      90 |   97.61 | 17
Statements   : 93.78% ( 573/611 )      EXIT=0
```

**결과는 두 워크스페이스 모두 2회차와 같은 값이고 둘 다 85% 를 넘는다.** hard threshold 충족. 결론이 같다고 해서 논거가 옳았던 것은 아니다 — **논거는 공백이었고, 그 공백은 내가 실측으로 닫았다.** F-13 으로 남긴다.

`gateway.ts` 미커버 `60-64` 는 TLS exporter 갈래이며, 도구가 「이 배치에서 그 코드가 실행되지 않는다」를 독립으로 증언한다 — `unbound` 주장의 방증이다.

### 4.4 F7 — 「완화이지 수정이 아니다」라는 틀은 정직한가 → **정직하다. 다만 형제 하나가 남았다**

```
$ sed -n '728p' channel/test/transport-auth.test.ts
    await waitFor(() => w.notes.length === 1 && w.verdicts.length === 1, '첫 소켓 기준선', 4500)
```

레인이 R1 과 분리해 「완화」로 명명한 것은 옳다. 이 자리는 확립 후 두 봉투의 도착을 기다리는 벽시계 대기이고, 술어를 바꿔 없앨 수 있는 성질의 것이 아니다.

**「다른 형제는 전부 명시값」이라는 주장은 참이 아니다.** 재접속 계열 대기를 전건 나열했다:

```
$ grep -n "waitFor(" channel/test/transport-auth.test.ts | grep "connections()\|기준선\|재접속\|접속"
450:    await waitFor(() => stub.authSeen().length === 1, '재접속 확립 (auth 발신)')          ← 기본 3000
465:    await waitFor(() => stub.connections() === 1, '첫 접속')                              ← 기본 3000 (음성 갈래)
470:    await waitFor(() => stub.connections() === 2, '재접속', 5000)
568:    await waitFor(() => stubB.connections() === 1, '루프백 접속')                          ← 기본 3000 (자식 프로세스)
609:    await waitFor(() => stub.connections() === 1, '대조 갈래의 루프백 접속')                ← 기본 3000 (자식 프로세스)
728:    await waitFor(() => …, '첫 소켓 기준선', 4500)
733:    await waitFor(() => stub.connections() === 2, '재접속', 4500)
759:    await waitFor(() => stub.connections() >= 2, '거절 뒤 재접속', 4500)
904:    await waitFor(() => stub.connections() >= 2, '거절 뒤 재접속', 4500)
```

`:450` 은 **재접속 뒤 확립을 기다리는** 대기인데 기본 3000ms 다 — `:733` 과 같은 부류이면서 상향을 받지 못했다. F-14 로 남긴다(비차단).

덧붙여 `:450` 은 확립을 `sessions` 가 아니라 **`auth` 수신 개수**로 대리한다. 지금은 안전하다 — 스텁의 메시지 핸들러가 `authSeenList.push`(`:184`)와 `sessions.set`(`:206`)을 **같은 동기 호출 안에서** 처리하므로, 폴링 루프가 `authSeen()` 을 보게 되는 시점에는 세션이 이미 서 있다. 그 논거는 어디에도 적혀 있지 않다 — F-14 의 두 번째 절반이다.

### 4.5 회귀 — 앞선 라운드가 PASS 를 준 자리 전건

| 항목 | 상태 | 이 감사가 실행한 확인 |
|---|---|---|
| **0.86 귀속** | **유지** | `grep -rn "0\.86" README.md CHANGELOG.md .moai/specs/SPEC-GWAUTH-002/spec.md` → `spec.md:25` 한 곳뿐이고 「이 수정 **이전** 나무에서 측정된 4회차 판정」이라 적혀 있다. README·CHANGELOG **0회** |
| **`unbound` 주장** | **유지, 재실측** | `sed -n '56p' server/src/gateway.ts` → `if (!(sock instanceof TLSSocket)) return 'unbound'` · `grep -c "https" server/src/index.ts` → `0` · 커버리지가 `gateway.ts` 의 `60-64` 를 미실행으로 독립 증언 |
| **F-01 처분 · `t23` 경고 위치** | **유지** | `grep -n t23 README.md` → `:5 :225 :236` · `CHANGELOG.md` → `:57`. `:225` 가 `(F-01, Critical — 중계 갈래 미종결)` 을 유지하고, `:236` 배포 경계 블록이 배치 안내 옆에 있다. SPEC Definition of Done `acceptance.md:915`(「채널 바인딩의 배치 조건이 README·CHANGELOG 에 적혔다」) **충족** |
| **날짜 박힌 정정 블록 보존** | **유지** | `SPEC-CHANCLIENT-001/spec.md:149` 의 v0.6.0 기록(「토큰 또는 `token_hash` 를 아는 상대」)이 그대로 있고 `:151-156` 의 v0.7.0 블록이 「그 부류 자체가 없어졌다」를 진다. 보존+추가 패턴 유지 |
| **F1 공시 판정(2회차)** | **유지** | `CHANGELOG.md:371` 공시 그대로. `grep -n "verifier_pub\|server_confirm_key" server/src/db.ts` → `:35 :36` 두 컬럼 실재. 공시 내용 참 |

**회귀 0건.**

### 4.6 이번 라운드의 작업 기록이 디스크에 없다 — 새 결함

```
$ git diff -- .moai/specs/SPEC-GWAUTH-002/progress.md | grep -c "^+"
59        ← 전부 §F.3 (1차 sync 패스). R1·R2 수정 라운드의 절이 없다

$ find .moai/state/verify -newermt "2026-08-31 01:00" -type f
.moai/state/verify/t22-sync/r1-fulltest-{1,2,3,4}.txt
.moai/state/verify/t22-sync/r1-typecheck.txt
.moai/state/verify/t22-sync/lead-verify-1.txt
        ← R1 증거는 있다. **R2 훑기 분류(CHANGELOG 44건 + README 22건, 미처리 0)의 증거 파일은 없다**
```

디스패치가 전한 「44건·22건 분류, 미처리 0」은 **디스크의 어떤 파일로도 재도출되지 않는다.** `verification-claim-integrity.md` §2 의 귀속 요건(명령 + 관측 출력)을 만족하지 않는 주장이다. 그리고 나는 그 주장을 **한 건의 적중으로 반증했다**(F-11).

더해, 1차 패스의 `progress.md` §F.3 잔여 위험 절이 이 결함의 원인을 미리 적어 두고 있다:

```
(progress.md §F.3 Residual-risk)
- **README 는 여러 카드의 서술이 겹쳐 있는 문서다.** 이 패스는 `t22` 가 낡게 만든 자리를 훑었으나,
  `t10`·`t11`·`t16` 소유의 문장은 그 카드들의 소유로 두었다 — 그중 하나가 이미 낡아 있었다면
  이 패스는 그것을 잡지 못한다.
```

**레인은 카드 소유 경계에서 훑기를 멈추기로 「의식적으로」 정했고, F-11 은 정확히 그 경계 밖(카드 `t11` 절)에 있다.** 이 자기 공시는 결함을 변명하지 않지만, 「미처리 0」이라는 상위 보고와 정면으로 어긋난다.

### 4.7 떠도는 워크트리 — 유일 사본을 위협하지 않는다

```
$ git worktree list
…/.claude/worktrees/agent-a448b5b2e00e411bb  51c6ffc [worktree-agent-a448b5b2e00e411bb]
…/.claude/worktrees/t22                      bc265a4 [WT-gateway-mutual-auth]

$ ls …/worktrees/agent-a448b5b2e00e411bb
CLAUDE.md   docs   ROADMAP.md   web

$ diff …/agent-a448b5b2e00e411bb/channel/test/gateway-client.test.ts  …/t22/channel/test/gateway-client.test.ts
diff: …/agent-a448b5b2e00e411bb/channel/test/gateway-client.test.ts: No such file or directory
```

떠도는 나무는 **main(`51c6ffc`) 위의 희소 체크아웃**이고 `channel/`·`server/` 를 아예 담지 않는다. `WT-gateway-mutual-auth` 를 체크아웃하지도 않았다. 따라서:

- **split-brain 중복본 없음** — t22 의 편집이 유일본이다(§4.2 의 diff 가 그 편집이 여기 있음을 직접 보인다).
- **유일 사본 위협 없음** — 같은 브랜치를 두 나무가 물고 있지 않으므로 git 의 배타 체크아웃 규칙이 발화할 자리도 없다.
- 남는 것은 **레지스트리 잡동사니**뿐이다. 다만 t22 브랜치가 여전히 미푸시 유일 사본이라는 사실은 그대로이고, 이 나무의 폐기 금지는 유효하다.

---

## 5. 발견 (구조화 결함 목록)

**차단 발견 0건.** 아래는 전부 비차단이며, 하나도 조용히 지우지 않는다.

### 신규

**F-11 — [Medium] [optional] `CHANGELOG.md:148` 이 v1 게이트웨이 토큰 인증을 현재형으로 단언한다 (확신: 높음)**

```
$ sed -n '148p' CHANGELOG.md
- **봇 경로의 인가는 한 글자도 바뀌지 않았습니다.** 게이트웨이 토큰 인증, `bot_tokens`를 통한
  (방, 봇) 결합, `deliver`·`sendToBot`·`closeRoom`·`history_request` 전부 그대로입니다. …

$ grep -n "verifier_pub" server/src/db.ts
35:  verifier_pub TEXT UNIQUE NOT NULL,   -- 조회 열쇠이자 검증자 — Ed25519 공개키 64자 hex
$ sed -n '149p' server/src/gateway.ts
  // 방과 봇은 요청이 아니라 저장된 검증자가 결정한다 — verifier_pub 로 bot_tokens 를 조회해 …
```

「게이트웨이 토큰 인증 … 그대로입니다」는 v2 가 없앤 모형이다. 방·신원은 토큰이 아니라 `verifier_pub` 조회가 정하고(`gateway.ts:149`·`:159-160`), `bot_tokens` 에는 토큰도 그 해시도 없다(`db.ts:35`). **카드 `t11` 절에는 공시가 없다.**

**요구되는 수정**(권고): `CHANGELOG.md:101` 절 머리에 `:225`·`:317` 과 같은 형태의 공시를 붙이고, 반증된 구절(「게이트웨이 토큰 인증 … 그대로입니다」)을 원문 인용한 뒤 지금 참인 것을 적는다.

**왜 차단이 아닌가 — 이 판정에서 가장 논쟁적인 자리이므로 논거를 전부 적는다.**

1. **SPEC 이 요구하지 않는다.** `acceptance.md:894-915` 의 Definition of Done 에서 문서 항목은 **`:915` 하나뿐**이고(「채널 바인딩의 배치 조건이 README·CHANGELOG 에 적혔다」) 그것은 충족됐다. 「v1 이 반증한 모든 과거 절에 공시를 걸라」는 요건은 **SPEC 이 아니라 1·2회차 감사관의 처방**이 만든 것이다.
2. **부류가 다르다.** 2회차가 차단으로 세운 `:229`·`:321` 은 **프로토콜을 서술하는** 문장이었다(「`hello { token }` 하나로 토큰이 그 봇의 방과 신원을 결정하고」 — 독자에게 현행 인증 모형을 가르친다). F-11 은 **「이 카드가 무엇을 바꾸지 않았는가」라는 카드 범위 진술**이다. 해악이 같지 않다.
3. **자기 생성 기준의 무한 톱니를 경계한다.** 매 라운드 같은 처방의 「한 건 더」를 찾아 차단으로 세우면, 감사가 카드를 닫지 못하게 만드는 기제가 된다. 2회차가 이름으로 지목한 두 자리는 닫혔고 레인이 두 자리를 더 스스로 찾았다 — **처방은 이행됐다.**

이 셋 가운데 ①이 결정적이다. 코드 정확성에 닿지 않고 SPEC 이 명시하지 않은 요건은 optional 이다.

**F-12 — [Low] [optional] `README.md:5` 의 「토큰 인증」 삽입구가 낡았다 (확신: 높음, 해악: 낮음)**

`봇 세션이 붙는 WebSocket 게이트웨이(**토큰 인증**·재접속…)까지 동작하고` — v2 는 토큰 인증이 아니다. 다만 **같은 문장 뒷부분이 「카드 `t22`가 … 상호 인증 v2(평문 토큰을 프레임에서 없애고…)」로 스스로 정정한다.** 문장을 끝까지 읽는 독자는 오도되지 않는다. 삽입구를 「상호 인증」으로 고치면 끝난다.

**F-13 — [Low] [optional] 커버리지 미재측정의 논거가 공백이었다 (확신: 확정 — 내가 닫았다)**

§4.3. 「`src/` 무변경」은 커버리지 불변의 근거가 되지 못한다(커버리지는 `src × 시험`). 결론은 같았으나 그것은 운이었다. **이 감사가 실측으로 닫았으므로 상태는 종결이지만, 논거의 형태는 기록해 둔다** — 다음 라운드가 같은 논거로 건너뛰면 그때는 운이 없을 수 있다.

**F-14 — [Low] [optional] F7 완화가 형제 하나를 남겼고, 그 자리의 안전 논거가 적혀 있지 않다 (확신: 높음)**

§4.4. `transport-auth.test.ts:450` 이 재접속 확립 대기인데 기본 3000ms 이고, 확립을 `sessions` 가 아니라 `auth` 수신 개수로 대리한다. 지금 안전한 이유(핸들러가 동기라 `authSeen` 이 보이는 시점에는 세션이 이미 서 있다)는 어디에도 적혀 있지 않다.

**F-10 — [Low] [optional] 새 술어의 안전이 「`sessions` 는 줄지 않는다」에 암묵적으로 얹혀 있다 (확신: 중간)**

§2.2. `establishedCount() > establishedBefore` 가 영원히 기다리지 않는 이유는 `sessions.delete` 가 0건이라는 사실이다. 그 사실은 **어디에도 적혀 있지 않다.** 나중에 누가 정리 목적으로 `ws.on('close', () => sessions.delete(ws))` 를 넣으면, 앞 소켓이 끊긴 뒤의 `connected()` 는 옛 기준선을 영영 넘지 못하고 vitest 타임아웃으로 죽는다 — 증상이 「경합」이 아니라 「멈춤」이라 진단이 더 어렵다. `establishedCount` 주석에 「이 맵은 지우지 않는다 — 델타 술어가 그 단조성에 의존한다」 한 줄을 권고한다.

**F-15 — [Low] [optional] 두 하네스의 미확립 증상이 갈린다 (확신: 높음)**

`transport-auth.test.ts:127` 의 `sendInner` 는 미확립 소켓을 **조용히 무시**하고, `gateway-client.test.ts:56` 의 형제는 **던진다**. 미래에 같은 결함이 재발하면 전자는 붉은 실패가 아니라 흔들리는 초록으로 나타난다 — 진단이 더 어려운 쪽이다. 레인의 주석(`:230-232`)이 이 비대칭을 알고 적어 두었다는 점은 craft 로 인정한다.

### `willEstablish()` 조건부 수정에 대한 판정 — **수용 가능**

**요청받은 대로 이 자리만 따로 판정한다.**

```
$ sed -n '96,97p;229,230p' channel/test/transport-auth.test.ts
 96:  function challengeFrame(cn: string, sn: string, pub: string) …
 97:    const branch = state.proof ?? state.challenge ?? 'valid'            ← 프레임을 짓는 식
229:    willEstablish: () => state.welcome === true && !state.deferChallenge &&
230:      (state.proof ?? state.challenge ?? 'valid') === 'valid',          ← 술어가 쓰는 식
```

**수용하는 근거 — 술어가 프레임 생성기의 판단식을 「재진술」 하지 않고 「같은 식」 을 쓴다.** 조건부 술어의 통상적 위험은 원본과 사본이 갈리는 것인데, 여기서는 `state.proof ?? state.challenge ?? 'valid'` 가 글자 그대로 같다. 그래서 「`proof:'valid'` 와 `challenge:'wrong'` 을 함께 준다」 같은 조합에서도 술어와 프레임이 어긋나지 않는다(프레임도 `proof` 를 택하므로 실제로 확립한다). 호출처 전건을 확인했고 두 축을 함께 주는 자리는 현재 0건이다.

**세 갈래가 확립을 막고 술어가 그 셋을 정확히 가른다:**

| 상태 | 확립하는가 | `willEstablish` | 일치 |
|---|---|---|---|
| `welcome: false` | 아니다 — `hello` 에 답하지 않아 `challenge` 도 `auth` 도 없다(`:186`) | false | 일치 |
| `deferChallenge: true` | 나중에 — 시험이 `pushChallenge()` 로 시점을 고른다 | false | 일치 |
| `challenge: 'echoed'` / `'oracle'` | 아니다 — `pending` 이 세워지지 않아 `auth` 처리가 `if (!p) return` 로 빠진다(`:203-205`) | false | 일치 |
| `welcome: true` + 유효 갈래 | 그렇다 | true | 일치 |

**「구성 중 뒤집힘」 우려에 대해**: 술어는 생성 시점이 아니라 **호출 시점의 `state` 를 읽는 게터**이므로, `attachWireTo` 전에 `stub.welcome = false` 로 뒤집어 넘겨도 옳게 false 를 낸다. 레인이 잔여 위험으로 인정한 「접속 도중 뒤집힘」은 **`attachWireTo` 가 await 되는 구간 안에서는 시험 코드가 끼어들 수 없으므로** 현재 호출처에서 도달 불가다. 뒤집힘은 전부 `attachWireTo` 가 반환한 **뒤**에 일어나고, 그때는 첫 소켓이 이미 확립돼 있다.

**판정: 조건부 `willEstablish()` 수정은 건전하다.** 음성 갈래를 함께 태우는 하네스에서 무조건 대기는 실제로 영원한 대기를 만들며, 조건부가 옳은 형태다. 술어를 프레임 생성기와 **같은 식**으로 묶은 것이 이 수정을 재진술 표류로부터 지킨다. 남는 위험은 F-15 하나이고 비차단이다.

### 앞선 라운드의 비차단 발견 — 현재 상태 (하나도 지우지 않는다)

| 발견 | 상태 | 이 감사가 실행한 확인 |
|---|---|---|
| **F2** `sha256Hex` 호출자 0 | **생존, 미수정** | `grep -rn "sha256Hex" server/src server/test` → 정의 `routes-bots.ts:16` + 「부르지 않는다」 주석 `gateway.test.ts:182` 둘뿐. 커버리지가 `routes-bots.ts` 의 `17` 을 미커버로 재확인 |
| **F4** `SPEC-CHANCLIENT-001/plan.md` v1 프레임 계약 표 | **생존, 미수정** | `grep -n` → `plan.md:60` 의 `{ "type": "hello", "token": "<opts.token>" }` · `:91` 같은 형태의 단언. 1·2회차 판정(계획 문서는 계획 시점 기록이므로 남기는 것이 옳다) 유지 |
| **F5** `acceptance.md` 하네스 손뜬 사본 | **사본은 완전 일치로 확정(§4.1), 기계 대조 장치는 여전히 없음** | `diff` exit 0. 대조를 강제하는 스크립트·훅·시험은 0건 |
| **F6** `pretest` 부재 | **생존, 미수정** | `grep -n "pretest" package.json channel/package.json server/package.json` → 적중 0. 깨끗한 체크아웃의 첫 실행은 여전히 `dist` 부재에 취약 |
| **F7** `transport-auth.test.ts` 기본 타임아웃 | **부분 완화** | `:729`(옛 `:716`)가 4500 으로 상향됨(§4.4). 형제 `:450` 은 기본값 그대로 → **F-14** |
| **F8 / R4** `established` 주석이 코드보다 좁다 | **생존, 미수정** | `sed -n '186,194p' channel/src/gateway-client.ts` → 주석은 「봉투 welcome 이 왔을 때만」인데 코드는 `mac`·`seq` 를 통과한 **첫 봉투이기만 하면** 확립한다. 보안 영향 없음(게이트는 `mac`·`seq` 가 진다) |
| **R3** `CHANGELOG.md:211`(카드 `t9`) 세션 게이트 기제 | **닫힘** | 2회차가 Low 로 남긴 자리에 레인이 공시를 붙였다 — `:209` 가 「그 게이트를 세우는 것은 `welcome` 도착이 아닙니다」를 적고 `gateway-client.ts:186-196` 을 지목한다. 내용 참(§4.5 확인) |

---

## 6. 5절 증거

### 6.1 주장 (Claim)

1. 통과선은 `spec-workflow.md:142` 에서 읽은 **0.85** 이고 티어는 `spec.md:15` 의 `L` 이다.
2. `npm test` 는 이 나무에서 **3회 전부 EXIT=0**, 283개(188+95) 전건 통과다.
3. `npm run typecheck --workspaces` 는 EXIT=0 이다.
4. 커버리지는 server **93.78%** / channel **88.62%** 로 둘 다 85% 를 넘는다 — 시험 파일이 바뀐 나무에서 **내가 다시 쟀다.**
5. R1 은 기제로 닫혔다 — `establishedCount()` 가 `sendInner` 가 요구하는 **같은 맵**을 읽고, `sessions` 는 단조 증가하므로 영원한 대기 경로가 없으며, 델타 형태는 두 클라이언트 자리에서 필요하고 옳다.
6. `willEstablish()` 조건부 수정은 건전하다 — 술어가 프레임 생성기와 **같은 식**을 쓴다.
7. 하네스 문서 사본은 **147줄 바이트 단위 완전 일치**다(`diff` exit 0) — 2회차의 미결을 확정했다.
8. 교체 공시는 **여섯**이고, v2 가 교체한 프로토콜을 서술하는 절 가운데 공시 없는 절은 0건이다.
9. 「CHANGELOG 44건·README 22건 분류, 미처리 0」은 디스크 증거로 재도출되지 않으며, 한 건의 적중(`CHANGELOG.md:148`)으로 반증된다.
10. 떠도는 워크트리는 main 위 희소 체크아웃이며 t22 의 유일 사본을 위협하지 않는다.
11. 회귀 0건 — 0.86 귀속·`unbound`·F-01/`t23`·날짜 블록·F1 공시 전건 유지.

### 6.2 증거 (Evidence) — 명령과 관측 원문

```
$ git rev-parse --short HEAD      → bc265a4
$ git branch --show-current       → WT-gateway-mutual-auth
$ git status --short              → M 12건 (§4.2 표)

$ npm test ; echo "EXIT=$?"                              [3회, 원문 fulltest-{1,2,3}.txt]
  Test Files  15 passed (15)      Tests  188 passed (188)      ← server
  Test Files   6 passed (6)       Tests   95 passed (95)       ← channel
EXIT=0 / EXIT=0 / EXIT=0

$ npm run typecheck --workspaces ; echo "EXIT=$?"        [원문 typecheck.txt]
EXIT=0

$ cd channel && npx vitest run --coverage                [원문 coverage-channel.txt]
All files          |   88.62 |    80.17 |   97.77 |      90 |
Statements   : 88.62% ( 187/211 )

$ cd server && npx vitest run --coverage                 [원문 coverage-server.txt]
All files          |   93.78 |    86.13 |   96.36 |   95.61 |
Statements   : 93.78% ( 573/611 )

$ diff /tmp/src_harness.txt /tmp/mirror_harness.txt ; echo "DIFF_EXIT=$?"
DIFF_EXIT=0                                              ← 147줄, 출력 0줄

$ grep -n "sessions.delete" channel/test/gateway-client.test.ts
(출력 없음)                                               ← 단조성의 근거

$ grep -n "카드 `t22`가 교체했습니다" CHANGELOG.md        → :70 :209 :225 :317 :371
$ sed -n '238p' CHANGELOG.md | grep -c "부분적으로 뒤집었습니다"  → 1
                                                          ← 합 6건

$ sed -n '148p' CHANGELOG.md
- **봇 경로의 인가는 한 글자도 바뀌지 않았습니다.** 게이트웨이 토큰 인증, … 전부 그대로입니다.
$ sed -n '35p' server/src/db.ts
  verifier_pub TEXT UNIQUE NOT NULL,   -- 조회 열쇠이자 검증자 — Ed25519 공개키 64자 hex

$ grep -n "lint" package.json channel/package.json server/package.json
(출력 없음)                                               ← 린터 부재

$ ls …/worktrees/agent-a448b5b2e00e411bb
CLAUDE.md   docs   ROADMAP.md   web                       ← channel/·server/ 없음
```

### 6.3 Baseline 귀속

- 테스트·타입검사·커버리지·`diff` 수치는 전부 **이 나무(`.claude/worktrees/t22`), HEAD `bc265a4` + 미커밋 편집 12건**에서 **이 감사가 이 실행으로** 낸 값이며, 원문은 `.moai/state/verify/t22-audit3/` 에 남겼다.
- 레인의 `r1-fulltest-{1..4}.txt`·`r1-typecheck.txt` 와 리드의 `lead-verify-1.txt` 는 **존재와 내용을 확인했으나 내 주장의 근거로 쓰지 않았다.** 같은 명령을 다시 돌렸고 같은 결과를 얻었다.
- **2회차의 EXIT=1 과 내 EXIT=0 은 같은 baseline 이 아니다** — 그 사이에 네 시험 파일이 바뀌었다. 두 결과를 같은 실험의 표본으로 세지 않는다.
- 네 차원 점수는 1·2회차 값을 산술로 잇지 않고 이 나무에서 새로 매겼다(§1.2 에 상향·하향의 근거를 각각 적었다).
- plan 감사 `PASS 0.86` 은 이 판정의 입력이 아니다.

### 6.4 Gaps (미검증)

- **경합(R1)의 재발 확률을 재지 않았다.** 전체 `npm test` 3회에서 0회 관측. 부하를 새로 만들지 않았다 — 이 저장소가 배경 부하 생성을 명시적으로 금지한다. **초록 3회는 부재의 증명이 아니다**; 내 확신은 회수가 아니라 §2.1 의 기제에서 온다.
- **린터가 존재하지 않는다.** 세 `package.json` 어디에도 `lint` 스크립트가 없다(적중 0). `quality.yaml` 의 sync 단계 LSP 게이트를 **잴 도구가 없다** — 통과가 아니라 공백이고 Craft 에 반영했다.
- **변이 32건을 재실행하지 않았다.** 감사 중 변이 실험은 이 저장소의 금지 사항이다.
- **게이트웨이를 실제로 띄워 프레임을 눈으로 보지 않았다.** 그 관측은 run M2 프로브(15/15)와 스위트가 진다.
- **`t1`~`t11` 소유 문장 전건의 「정확성」 은 재지 않았다.** 내 훑기는 **v2 가 낡게 만든 자리**만 겨눴다.
- **`web/`·`ROADMAP.md` 는 열지 않았다.** 디스패치 범위 밖이다.
- **`transport-auth.test.ts` 의 음성 갈래 스텁 전건을 실행으로 확립 여부에 따라 재분류하지는 않았다** — `willEstablish` 를 네 갈래로 가른 표(§5)는 소스 판독이지 실행 관측이 아니다.
- **떠도는 나무의 git 인덱스 상태는 확인하지 않았다** — 워크트리 격리 가드가 교차 나무 git 명령을 거부하므로 파일 시스템 판독으로 대신했다. 희소 체크아웃에 `channel/`·`server/` 가 아예 없다는 사실이 split-brain 배제에 충분하다고 판단했다.

### 6.5 잔여 위험 (Residual-risk)

- **여유가 0.004 다.** §1.3 의 세 판단 중 하나만 달리 보면 FAIL 이다. 이 PASS 는 「넉넉히 통과」가 아니라 「간신히 통과」로 읽어야 한다.
- **하네스 술어의 안전이 문서화되지 않은 불변식에 얹혀 있다**(F-10). `sessions` 에 삭제가 들어오는 순간 이 카드가 두 라운드 겪은 결함이 「멈춤」이라는 더 어려운 증상으로 재발한다.
- **`willEstablish` 의 미래 회귀는 조용하다**(F-15). `transport-auth` 의 `sendInner` 는 던지지 않고 무시하므로, 이 파일에서 같은 결함이 재발하면 붉은 실패가 아니라 흔들리는 초록으로 나타난다.
- **문서 훑기의 소유 경계가 그대로 남았다**(§4.6). 카드별 소유로 훑기를 자르는 관행이 유지되는 한, v2 가 낡게 만든 다른 카드 절은 다음 라운드에도 잡히지 않는다. F-11 은 그 관행의 첫 인스턴스이지 마지막이 아닐 수 있다.
- **배치 위험은 이 판정과 무관하게 그대로다.** 채널 바인딩은 모든 배치에서 `unbound` 이고 F-01 의 중계 갈래는 열려 있다. **`t23`(서버 TLS 종단)이 닫히기 전까지 생산 배치 불가** — 이 PASS 는 그 경고를 조금도 완화하지 않는다.
- **이 나무는 미푸시 유일 사본이다.** sync 편집 12건이 커밋되지 않은 채로 남아 있고, 어느 워크트리도 폐기해서는 안 된다.

---

## 7. 판정

**PASS — 조화평균 0.854 ≥ 통과선 0.85** (`spec-workflow.md:142`, Tier L)

- must-pass 방화벽: Functionality **0.90** PASS · Security **0.86** PASS
- 차단 발견: **0건**. 2회차의 R1·R2 는 둘 다 닫혔고, 닫힘을 내 실행으로 확인했다.
- 비차단 발견 12건(신규 F-10·F-11·F-12·F-13·F-14·F-15, 생존 F2·F4·F5·F6·F7·F8) — 전부 optional 이며, 자동으로 수정 라운드를 부르지 않는다.
- **무엇이면 FAIL 이었나**: §1.3 의 셋 중 하나. 특히 **F-11 을 차단으로 세웠다면 즉시 FAIL** 이었고, 세우지 않은 이유는 §5 에 세 논거로 적었다 — 그중 결정적인 것은 **SPEC 의 Definition of Done(`acceptance.md:915`)이 요구하는 문서 항목이 하나뿐이고 그것은 충족됐다**는 사실이다.
