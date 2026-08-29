# SPEC-CHANAUTH-001 계획 감사 보고 (카드 t9)

| 항목 | 값 |
|------|-----|
| 감사 대상 | `.moai/specs/SPEC-CHANAUTH-001/` (신규) + `.moai/specs/SPEC-CHANPERM-001/` v0.3.0 (결합 개정) |
| 감사 대상 커밋 | `f1507ea` (브랜치 `WT-chanperm-gate`, 워크트리 `.claude/worktrees/t9`) |
| 감사자 | plan-auditor (독립 감사, 작성자 추론 맥락 배제 — M1 Context Isolation) |
| 반복 회차 | 1 / 3 |
| **판정** | **FAIL** |
| 종합 점수 | 0.55 |

> 작성자 보고서 `.moai/reports/t9/plan-done.md` 는 **감사 근거가 아니라 감사 대상**으로만 읽었다. 그 문서의 자기 평가는 판정에 반영하지 않았다 (M1 Context Isolation).

---

## 1. 주장 (Claim)

이 계획은 감사 F-01(Critical)을 닫지 **못한다**. 세 겹 중 두 겹(발신 id 대조 ②, `wss://` 강제 ③)은 설계가 성립하지만, 첫 겹인 `welcome` 게이트 ①은 **F-01 이 지목한 바로 그 위협 주체가 한 줄로 무력화할 수 있다**. 그 결과 F-01 의 절반(사칭 채팅 주입·이력 오염)은 13개 요구사항을 전부 구현한 뒤에도 그대로 열려 있다.

그리고 계약 개정이 절반만 적용됐다. 카드가 개정한 것은 `REQ/AC-CHANPERM-008` 하나뿐인데, 병합된 트리에서 새 계약과 충돌하는 형제 기준이 **최소 11건** 더 있다 — `permission-relay.test.ts` 4건, `gateway-client.test.ts` 7건. 그중 `gateway-client.test.ts` 는 세 문서와 작성자 보고서 어디에도 **한 번도 등장하지 않는다**. 이것은 이 프로젝트가 카드 `t7` 에서 이미 한 번 맞은 실패 형태(교정이 카드의 절반만 덮고, 덮지 못한 절반이 sync 에서 High 로 재현)와 같다.

수용 기준 층에서는 네 건이 "아무것도 재지 못하거나, 정상 구현을 거짓 실패시킨다".

## 2. 증거 (Evidence)

관측은 전부 병합된 작업 트리(`f1507ea`)에서 직접 읽거나 실행했다. 실행 가능한 것은 실행했고, 실행할 수 없는 것은 §4 미검증에 적었다.

### 2.1 `welcome` 위조 가능성 (C-01)

`spec.md:73` 의 근거 문장:

> `welcome` 은 **"내가 네 토큰을 알아보는 서버다"** 라는 진술이고, 토큰을 모르는 상대는 그 진술을 위조할 수 없다 — 위조하려면 토큰을 알아야 하는데, 알면 이미 게이트웨이다.

`welcome` 프레임의 실제 형태 (`spec.md:67`, `channel/src/gateway-client.ts:65`):

```
{ type: 'welcome', room_id, bot_id, bot_name }        # 토큰 지식의 증거가 한 조각도 없다
```

재현 프로브 `.moai/state/verify/t4-sync-audit/probe-rogue.ts:17-22` 의 로그 서버는 `hello` 를 **받는다**:

```ts
wss.on('connection', ws => {
  // hello 에 응답하지 않는다 — welcome 도, 토큰 검증도 없다. 그냥 밀어 넣는다.
  ws.send(JSON.stringify({ type: 'permission_verdict', ... }))
```

`hello` 를 받는 자리에 서 있는 상대는 `hello` 에 답할 수도 있다. 챌린지도 논스도 서명도 없으므로 `ws.send(JSON.stringify({ type:'welcome', room_id:1, bot_id:2, bot_name:'pm' }))` 한 줄이면 게이트가 열린다 — 토큰을 읽을 필요조차 없다.

### 2.2 permission-relay.test.ts 형제 기준 4건 붕괴 (C-02)

새 계약(`SPEC-CHANPERM-001` v0.3.0 §4.3: 발신 집합에 없는 id 는 중계하지 않는다) 아래에서 아래 네 테스트는 실패한다. 전부 병합된 파일에서 직접 읽었다.

| 위치 | 기준 | 붕괴 사유 |
|---|---|---|
| `channel/test/permission-relay.test.ts:157-166` | AC-CHANPERM-005 | `attach()` 직후 발신 없이 `handlePermissionVerdict({request_id:'abcde'})` → `expect(verdicts.length).toBe(1)` 가 0 을 본다 |
| 같은 파일 `:168-174` | AC-CHANPERM-006 | 동일. `verdicts[0].params.behavior` 가 `undefined` 접근 |
| 같은 파일 `:176-185` | AC-CHANPERM-007 | 나가는 id `'AbC12'`, 돌아오는 id `'abc12'` — **의도적 대소문자 불일치**. 발신 집합 대조에서 미스 → `verdicts[0]` undefined |
| 같은 파일 `:209-230` | AC-CHANPERM-009 | 마지막 양성 짝 `expect(verdicts.length).toBe(1)`, 그 앞에 발신 기록 없음 |

AC-CHANPERM-007 은 테스트 문구 수정으로 끝나지 않는다. 그 기준의 **설계 자체**(REQ-CHANPERM-007 무변형을 두 방향에서 서로 다른 값으로 재는 형태)가 발신 집합 대조와 원리상 양립하지 않는다. 그런데 `SPEC-CHANPERM-001/spec.md` v0.3.0 HISTORY 는 이렇게 적었다:

> **요구사항 10개·수용 기준 12개는 개수 그대로이고, REQ-008 과 AC-008 의 내용만 바뀌었다.**

그리고 같은 카드의 품질 게이트가 정반대를 요구한다 — `acceptance.md:569` 및 `plan.md:158`:

> AC-CHANWIRE-011·014, AC-CHANNEL-002·004·005, **AC-CHANPERM-001..012** 의 `✓` 줄이 `--reporter=verbose` 출력에 있다.

12건 전부 `✓` 는 위 네 건이 깨진 채로는 성립할 수 없다. 문서가 스스로와 충돌한다.

### 2.3 SPEC-CHANCLIENT-001 미개정 (C-03)

`.moai/specs/SPEC-CHANCLIENT-001/spec.md:132-136` — 조건 없는 When 구동 의무:

> **REQ-CHANCLIENT-004** `type: 'message'` 프레임이 도착하면 `onMessage` 를, `type: 'permission_verdict'` 프레임이 도착하면 `onVerdict` 를, 각각 그 프레임 객체 **그대로 호출해야 한다**.
> **REQ-CHANCLIENT-005** `type: 'history_response'` 프레임이 도착하면 … **resolve 해야 한다**.

`.moai/specs/SPEC-CHANAUTH-001/spec.md:119` — 정면 부정:

> **REQ-CHANAUTH-001** … `message`·`permission_verdict`·`history_response` 프레임은 **어떤 콜백에도 전달되어서는 안 되고**, 대기 중인 이력 요청(`pending` 맵의 rid)을 **해소해서도 안 된다**.

`SPEC-CHANPERM-001` 과 **같은 부류의 충돌**인데, 이쪽은 개정되지 않았다:

```
version: "0.3.0"   ← .moai/specs/SPEC-CHANCLIENT-001/spec.md:4 (커밋 f1507ea 에서 무변경)
```

병합된 회귀 스위트의 부수 피해. `channel/test/gateway-client.test.ts:23-50` 의 `startServer()` 는 `welcome` 을 **한 번도 보내지 않는다**(`ws.on('message')` 에서 `messages.push` 와 훅 호출만 한다):

| 위치 | 기준 | 게이트에 걸리는 프레임 |
|---|---|---|
| `gateway-client.test.ts:111` | AC-CHANCLIENT-003 | `message` |
| `:125` | AC-CHANCLIENT-004 | `permission_verdict` |
| `:135` | AC-CHANCLIENT-005 | `message` |
| `:162` | AC-CHANCLIENT-007 | `message` (파싱 실패 뒤 정상 프레임) |
| `:200` | AC-CHANCLIENT-009 | `history_response` (미해소 → 10초 대기 후 reject) |
| `:220` | AC-CHANCLIENT-010 | `history_response` ×2 |
| `:257` | AC-CHANCLIENT-011 | `history_response` |

`grep` 결과: 문자열 `gateway-client.test` 는 `spec.md`·`plan.md`·`acceptance.md`·`plan-done.md` 어디에도 없다. 형제 비회귀 점검 목록(`acceptance.md:569`, `plan.md:158`)에도 `AC-CHANCLIENT` 는 **한 항목도 없다** — 이 카드가 소스를 고치는 형제 SPEC 이 바로 그것인데도.

비교 대조로, `channel/test/index-wiring.test.ts:47` 과 `permission-relay.test.ts:83` 의 스텁은 `hello` 에 `welcome` 으로 답하므로 그 두 파일은 게이트의 영향을 받지 않는다. 즉 이 부수 피해는 `gateway-client.test.ts` 하나에 집중돼 있고, 그 하나가 누락됐다.

### 2.4 AC-CHANAUTH-004 가 아무것도 재지 못한다 (H-01)

`acceptance.md` AC-CHANAUTH-004 본문의 유일한 판정 단언:

```ts
stub.push({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
await settle()
expect(w.verdicts.length).toBe(before)      // 두 번째 소켓은 미인증이다
```

이 테스트에서 채널은 `'abcde'` 를 **발신한 적이 없다**(승인 요청을 보내는 줄이 없다). 따라서 M3 이후에는 ② 발신 집합 대조가 이 판정을 먼저 버리고, ① 이 있든 없든 `verdicts.length` 는 변하지 않는다. 변이표(`acceptance.md:581`)의

| B. 인증 상태를 소켓이 아니라 클라이언트 단위로 | AC-CHANAUTH-004 |

는 M1 시점에만 참이고, M3 이 끝나는 순간 거짓이 된다. AC-CHANAUTH-004 는 REQ-CHANAUTH-003(소켓 단위 인증)의 **유일한** 기준이며, 그 요구사항에 대해 `spec.md:131` 은 이렇게 적었다 — "그 구현은 §4.1 의 다른 두 조항을 모두 만족하면서 **F-01 을 되살린다**". 되살리는 구현을 잡는 기준이 조용히 무력해진다.

### 2.5 스스로 틀렸다고 적힌 기준 (H-02)

`acceptance.md` AC-CHANAUTH-002 는 다음 단언을 싣고,

```ts
expect(verdicts.map(v => v.params)).toEqual([{ request_id: 'abcde', behavior: 'allow' }])
```

바로 아래 본문에서 그 단언이 틀렸다고 적는다:

> 그래서 위 단언은 실제로는 `expect(verdicts).toEqual([])` 가 맞다 — **run 단계는 §4.1 과 §4.2 를 모두 세운 뒤 이 기준의 판정 갈래를 최종 형태로 확정하고**…

AC-CHANAUTH-003 도 같은 형태다 — "**미검증으로 남기는 것**: `welcome` 뒤 같은 응답이 해소되는 갈래는 … M3 에서 합쳐 관측한다." 그 결과 REQ-CHANAUTH-002 의 이력 갈래를 재는 기준이 계획 단계에 없다.

그런데 `progress.md` §E.1 은 기계 판독 신호로 이렇게 선언한다:

```yaml
open_questions: 0
```

실제로 열려 있는 결정은 최소 넷이다 — AC-002 최종 형태, AC-003 양성 갈래, AC-010 판정표 행 추가(`acceptance.md`: "표에 그 행을 넣는 것을 M2 단계 1 에서 확정한다"), AC-CHANPERM-009 처리(`plan-done.md:166`).

### 2.6 AC-CHANAUTH-011 하네스의 경로 결함 (H-03)

```ts
const a = spawnChild(['channel/dist/index.js'], { … })
```

실행 명령은 `npm test -w channel`(`spec.md:229`)이고 `channel/package.json:12` 의 `test` 는 `vitest run` 이므로 프로세스 cwd 는 `channel/` 이다. 상대 경로 `channel/dist/index.js` 는 `channel/channel/dist/index.js` 로 풀린다. 형제 하네스는 이 자리를 다르게 쓴다 — `channel/test/index-wiring.test.ts:62`:

```ts
const DIST = fileURLToPath(new URL('../dist/index.js', import.meta.url))
```

귀결: (a) 갈래의 `expect(stubA.connections()).toBe(0)` 은 **자식이 아예 뜨지 않아서** 통과하고(잘못된 이유의 통과), `expect(a.stderr()… .length).toBe(1)` 은 Node 의 여러 줄 `ERR_MODULE_NOT_FOUND` 로 실패한다. (b) 갈래는 `waitFor` 타임아웃으로 실패한다.

부수로, `isTransportAllowed` 와 `resolveUrl` 이 AC-010·011 에서 쓰이는데 `acceptance.md` 의 공통 하네스 import 목록에는 `wire` 만 있다.

### 2.7 `[::1]` 판정 불일치 (M-01)

`spec.md:70` 용어표와 `plan.md` §F M2 단계 2 의 구현 처방:

> 루프백 호스트 | `127.0.0.1`, `localhost`, `::1` 세 값
> 호스트가 루프백 셋 중 하나면 `true`

실측 (이 트리에서 `node -e` 로 직접 실행):

```
$ node -e "const u=new URL('ws://[::1]:3000/bot'); console.log(JSON.stringify(u.hostname))"
"[::1]"
```

`'[::1]' ∉ {'127.0.0.1','localhost','::1'}` 이고 스킴은 `ws:` 이므로 처방대로 만든 구현은 `false` 를 낸다. 그런데 AC-CHANAUTH-010 판정표는 `['ws://[::1]:3000/bot', true]` 를 요구한다. 처방과 기준이 어긋난다.

### 2.8 AC-CHANAUTH-010 의 변이 방어가 표에 없다 (M-02)

`acceptance.md` 가 스스로 적은 변이:

> 호스트 검사를 문자열 포함(`url.includes('127.0.0.1')`)으로 바꾼다 — `ws://127.0.0.1.evil.com/bot` 이 통과하게 되므로, **그 행을 표에 추가해 둔다면** 이 기준이 잡는다.

실측:

```
$ node -e "console.log(new URL('ws://127.0.0.1.evil.com/bot').hostname)"
127.0.0.1.evil.com
```

8행 표에 그 행이 없으므로, 문자열 포함 구현은 현재 표의 8행을 **전부 통과한다**. 즉 이 기준이 방어한다고 적은 변이를 실제로는 방어하지 못하며, 문서는 그 사실을 "M2 단계 1 에서 확정한다"로 미뤘다.

### 2.9 기준에 닿지 않는 요구사항 조항 (M-03)

- `spec.md:134` REQ-CHANAUTH-004 — "**stdout 에 아무것도 써서는 안 된다**". AC-CHANAUTH-005 는 unhandled rejection 과 `connections()` 만 잰다. stdout 을 보는 기준이 없다.
- `spec.md:168` REQ-CHANAUTH-012 — "stdio 연결을 가로막아서도 안 된다". AC-CHANAUTH-011 (c)는 `resolveUrl` 비회귀만 관측한다. stdio 갈래를 보는 기준이 없다(형제 AC-CHANWIRE-014 에 기대지만 그 기준은 이 SPEC 의 매트릭스 밖이다).

### 2.10 개정 전 계약의 남은 생산자 (L-01)

`grep` 으로 `.moai/specs/` 트리 전체와 사용자 문서를 훑은 결과, 개정된 계약과 어긋나는 문언이 아래에 남아 있다:

- `CHANGELOG.md:15` — "…채널은 대기 중인 요청을 기억하지 않습니다(무상태). (`SPEC-CHANPERM-001`)"
- `CHANGELOG.md:41` — "**채널은 아무것도 기억하지 않습니다.** 대기 중인 승인 요청도 …"
- `channel/src/channel-server.ts:136` 주석 — "채널은 대기 중인 요청을 기억하지 않으므로(무상태) … (REQ-CHANPERM-008)"
- `.moai/specs/SPEC-CHANPERM-001/progress.md:51` — "REQ-CHANPERM-008 (불일치 판정 무상태 처리)"

`channel-server.ts` 주석은 run 단계가 그 함수를 고치며 자연히 닿지만, `CHANGELOG.md` 두 줄은 어느 문서에도 정정 대상으로 적혀 있지 않다.

**한편 개정이 제대로 덮은 범위도 기록해 둔다.** `.moai/specs/` 와 `.moai/plan/` 전체에서 `무상태|기억하지 않|대기 맵|stateless` 를 훑었고, **릴레이 무상태**를 주장하는 다른 SPEC 은 없었다. 다른 SPEC 의 "무상태" 는 전부 **디스크 무상태**이며, 이는 개정이 명시적으로 보존한 성질이다(`plan-v2.md:20` Global Constraints 원문도 디스크만 말한다). 이 축에서는 개정이 완전하다.

## 3. 기준선 귀속 (Baseline-attribution)

| 관측 | 명령 / 방법 | 기준 |
|---|---|---|
| 감사 대상 트리 | `git log --oneline -5`, `git show --stat HEAD` | `f1507ea`, 브랜치 `WT-chanperm-gate` |
| 개정 diff | `git show HEAD -- .moai/specs/SPEC-CHANPERM-001/` | 같은 커밋 |
| 형제 기준 붕괴 | `channel/test/permission-relay.test.ts` · `gateway-client.test.ts` 직접 읽기 (`sed -n`) | 같은 커밋의 작업 트리 |
| 계약 충돌 | `.moai/specs/SPEC-CHANCLIENT-001/spec.md:123-170` 직접 읽기 | 같은 커밋 |
| 개정 잔여물 | `grep -rn "무상태\|기억하지 않\|대기 맵\|stateless" .moai/specs/ .moai/plan/`, `grep -rn "CHANPERM-008" .moai/` | 같은 커밋 |
| URL 의미론 | `node -e "…new URL(…)…"` (이 워크트리에서 실행, 출력 §2.7·§2.8 에 원문) | Node (시스템 설치본) |
| D7 교차 SPEC | `grep -m1 '^status:'` × 6 SPEC | 전부 `in-progress` 또는 `completed` — retired/superseded/archived 없음 |
| D8 syscall | `grep -c syscall` × 3 아티팩트 | 전부 `0` |
| MP-7 | `grep -rn "NEEDS CLARIFICATION" .moai/specs/SPEC-CHANAUTH-001/` | 종료 코드 1 (일치 없음) |

## 4. 미검증 (Gaps)

명시적으로 관측하지 **못한** 것들이다. 통과로 읽어서는 안 된다.

1. **테스트 실행 결과 전부.** 이 워크트리에 `node_modules` 가 없어 `npm test -w channel` 을 실행하지 못했다. §2.2·§2.3 의 "실패한다"는 **소스 대조에 근거한 판정**이며, 실행으로 관측한 값이 아니다. 다만 판정의 근거(발신 없는 `handlePermissionVerdict` 호출, `welcome` 을 보내지 않는 스텁)는 코드에서 직접 읽은 사실이다.
2. **`welcome` 위조의 실행 재현.** §2.1 은 프로토콜 구조에서 도출한 판정이며, `probe-rogue.ts` 에 한 줄을 더해 실행하지는 않았다(감사는 읽기 전용이고, 감사 중 변이 실험은 금지). 실행 재현은 run 단계 M1 단계 0-3 이 프로브를 돌릴 때 **`welcome` 을 보내는 변형도 함께** 돌려 확정할 것을 권한다.
3. **`gateway-client.test.ts` 붕괴 7건의 정확한 실패 형태.** AC-CHANCLIENT-009·010·011 은 `history_response` 미해소이므로 실패가 아니라 **10초 타임아웃 후 reject** 일 수 있다. 개수(7건)는 프레임 종류로 센 것이고, 실패/타임아웃 구분은 실행해야 확정된다.
4. **`SPEC-CHANNEL-001`·`SPEC-CHANWIRE-001` 의 계약 충돌 여부.** 두 SPEC 의 REQ 본문 전문을 읽지 않았고, 릴레이·분배 계약과 무관해 보이는 범위만 확인했다. 완전한 배제는 아니다.
5. **커버리지·타입 검사.** 실행 불가.
6. **Tier M 의 PASS 임계값 수치.** `spec-workflow.md` 의 SSOT 표를 이 감사에서 열지 않았다. 판정은 임계값이 아니라 blocking 결함(§5 Critical 3건)으로 내렸으므로 이 미검증이 판정을 바꾸지 않는다.

## 5. 잔여 위험 (Residual-risk)

- **①을 고치면 범위가 커진다.** `welcome` 을 위조 불가능한 증거로 만들려면 서버 쪽 서명·논스가 필요하고, 그것은 `spec.md` §5 가 명시적으로 범위 밖에 둔 "완전한 상호 인증"이며 `server/` 를 건드린다(REQ-CHANAUTH-013 이 금지). 즉 이 카드가 택할 수 있는 정직한 길은 **범위 재선언**(①은 "hello 에 답하지 않는 상대"만 막으며 F-01 의 사칭 채팅 주입 절반은 열린 채 남는다고 적고, 그 절반을 F-02·F-03·F-04 와 함께 별도 카드에 인계)이지, ①을 강화하는 것이 아닐 수 있다. 그 재선언은 카드의 성과 서술 자체를 바꾸므로 되돌리기 비싼 결정이다.
- **AC-CHANPERM-007 은 run 단계가 임의로 고칠 수 없다.** 기준 본문 개정은 `manager-spec` 재위임 사안이다(작성자 자신이 `plan-done.md:166` 에서 같은 원칙을 적었다). run 에 들어간 뒤 이것이 드러나면 카드가 plan 으로 되돌아간다.
- **부정 관측의 400ms `settle()`.** 소켓 왕복 + 자식 프로세스 spawn 이 섞인 자리(AC-CHANAUTH-011)에서 부하 걸린 기계의 거짓 실패 여지가 있다. 문서가 이 위험을 §E 에 적어 두었으나, 자식 프로세스 갈래에는 그 완화 논리(양성 짝이 수십 ms 안에 통과)가 적용되지 않는다.
- **개정이 회귀 스위트에 남긴 자국을 sync 가 다시 잰다.** C-02·C-03 을 run 단계에서 임기응변으로 덮으면(테스트를 조용히 고치면) sync 감사에서 "개정되지 않은 SPEC 과 실제 동작의 괴리"로 되돌아온다 — 카드 `t4` → `t9` 로 넘어온 것과 같은 경로다.

---

## 6. 발견 목록

| ID | 위치 | 내용 | 심각도 | 분류 |
|----|------|------|--------|------|
| C-01 | `spec.md:73`, `:53-58`, `:204` | `welcome` 은 토큰 지식의 증거가 아니다. 소켓 상대는 `hello` 를 받는 자리에 있으므로 `{type:'welcome'}` 한 줄로 게이트를 연다. F-01 의 사칭 채팅 주입·이력 오염 절반이 13개 요구사항 구현 후에도 살아남는다. §5 의 "토큰이 유출되면 무력해진다"는 위험을 과소 기술한다 — 유출이 필요 없다 | **Critical** | blocking |
| C-02 | `channel/test/permission-relay.test.ts:157·168·176·209` vs `acceptance.md:569`, `plan.md:158`, `SPEC-CHANPERM-001/spec.md` v0.3.0 HISTORY | 계약 개정이 AC-008 하나만 덮었다. 같은 파일의 AC-CHANPERM-005·006·007·009 가 새 계약에서 깨진다. 007 은 설계상 양립 불가(양방향 대소문자 불일치)라 테스트 수정이 아니라 기준 개정이 필요하다. 그런데 품질 게이트는 `AC-CHANPERM-001..012` 전부 `✓` 를 요구한다 — 문서가 스스로와 충돌 | **Critical** | blocking |
| C-03 | `SPEC-CHANCLIENT-001/spec.md:132-136` vs `SPEC-CHANAUTH-001/spec.md:119`; `channel/test/gateway-client.test.ts:23-50, 111·125·135·162·200·220·257` | REQ-CHANCLIENT-004·005 의 무조건 분배 의무와 REQ-CHANAUTH-001 이 정면 충돌하는데 CHANCLIENT 는 개정되지 않았다(`version: "0.3.0"` 무변경). `welcome` 을 보내지 않는 스텁을 쓰는 형제 기준 7건이 깨진다. `gateway-client.test.ts` 는 세 문서와 작성자 보고서 어디에도 등장하지 않고, 형제 비회귀 목록에 `AC-CHANCLIENT` 가 한 항목도 없다 | **Critical** | blocking |
| H-01 | `acceptance.md` AC-CHANAUTH-004, 변이표 `:581` | `verdicts` 만 재므로 ② 발신 집합 대조가 서면 ①의 유무를 구분하지 못한다. 변이 B 는 M3 이후 잡히지 않는다. REQ-CHANAUTH-003 의 유일한 기준이 무력해진다. 정정: 같은 갈래에서 `notes`(채팅 프레임)를 함께 단언할 것 — ②가 방어하지 않는 축이다 | **High** | blocking |
| H-02 | `acceptance.md` AC-CHANAUTH-002·003, `progress.md` §E.1 | AC-002 는 단언을 싣고 바로 아래에서 그 단언이 틀렸다고 적으며 최종 형태를 run 으로 미룬다. AC-003 은 양성 갈래를 "미검증"으로 남겨 REQ-CHANAUTH-002 의 이력 갈래에 기준이 없다. `open_questions: 0` 은 사실이 아니다(열린 결정 최소 4건) | **High** | blocking |
| H-03 | `acceptance.md` AC-CHANAUTH-011 vs `channel/test/index-wiring.test.ts:62`, `channel/package.json:12` | `spawnChild(['channel/dist/index.js'])` 가 cwd `channel/` 에서 `channel/channel/dist/…` 로 풀린다. (a)는 잘못된 이유로 통과하고 stderr 단언은 실패, (b)는 타임아웃. `isTransportAllowed`·`resolveUrl` 이 공통 하네스 import 에 없다 | **High** | blocking |
| M-01 | `spec.md:70`, `plan.md` §F M2 단계 2 vs `acceptance.md` AC-CHANAUTH-010 | 처방대로 만든 구현이 `ws://[::1]` 에 `false` 를 낸다(실측: `hostname === "[::1]"`). AC 는 `true` 를 요구한다 | **Medium** | blocking |
| M-02 | `acceptance.md` AC-CHANAUTH-010 변이 문단 | 문서가 방어한다고 적은 변이(문자열 포함 호스트 검사)를 8행 표가 실제로는 잡지 못한다(실측: `127.0.0.1.evil.com`). 방어 행 추가를 run 으로 미뤘다 | **Medium** | optional |
| M-03 | `spec.md:134`, `:168` | REQ-CHANAUTH-004 의 stdout 침묵 조항과 REQ-CHANAUTH-012 의 stdio 비차단 조항에 대응하는 관측이 없다 | **Medium** | optional |
| L-01 | `CHANGELOG.md:15`, `:41`; `channel/src/channel-server.ts:136`; `SPEC-CHANPERM-001/progress.md:51` | 개정 전 계약("채널은 아무것도 기억하지 않습니다")이 사용자 문서에 그대로 남아 있고, 정정 대상으로 어느 문서에도 적혀 있지 않다 | **Low** | optional |
| L-02 | `acceptance.md` AC-CHANAUTH-003 | `requestHistory` 의 10,000ms 타이머(`gateway-client.ts:96`)가 회수되지 않은 채 테스트가 끝난다 | **Low** | optional |

집계: **Critical 3 · High 3 · Medium 3 · Low 2** (총 11건, 그중 blocking 7건).

---

## 7. Must-Pass 판정

| 항목 | 결과 | 근거 |
|------|------|------|
| MP-1 REQ 번호 일관성 | PASS | `REQ-CHANAUTH-001..013` 연속, 중복·결번 없음 (`grep -o` 후 `sort -u`) |
| MP-2 GEARS 형식 (요구사항 층) | PASS | 13개 REQ 전부 패턴 라벨을 달고 있고(While/When/Unwanted/Ubiquitous) 본문이 그 패턴을 따른다. 검증 층(`AC-…` Given-When-Then)은 이 항목에서 채점하지 않았다 |
| MP-3 YAML frontmatter | PASS | 12개 정규 필드 전부 존재·타입 일치 (`spec.md:2-13`), snake_case 별칭 없음. `tier: M` 은 추가 필드 |
| MP-4 언어 중립성 | N/A | 단일 언어(TypeScript/Node) 범위의 SPEC — 자동 통과 |
| MP-5 D7 교차 SPEC | PASS | 참조된 6개 SPEC 전부 존재, status 는 `in-progress`(4) / `completed`(2). retired·superseded·archived 없음 |
| MP-6 D8 크로스 플랫폼 | N/A | 세 아티팩트에서 `syscall` 0건 — 자동 통과 |
| MP-7 해소되지 않은 clarification 마커 | PASS | `grep -rn "NEEDS CLARIFICATION"` 종료 코드 1 (`research.md` 없음, `plan.md` 청결). 다만 `progress.md` 의 `open_questions: 0` 은 마커와 별개로 사실이 아니다 — H-02 참조 |

Must-Pass 는 전부 통과했다. **판정 FAIL 은 Must-Pass 실패가 아니라 blocking 결함 7건(그중 Critical 3건)에 근거한다.**

## 8. 차원 점수

| 차원 | 점수 | 대역 | 근거 |
|------|------|------|------|
| 명확성 (Clarity) | 0.75 | 0.75 | 문장은 대체로 한 가지로만 읽힌다. 다만 `spec.md:70` 의 루프백 정의가 URL 의미론과 어긋나 구현이 갈린다(M-01) |
| 완전성 (Completeness) | 0.75 | 0.75 | 필수 절 전부 존재, `### Out of Scope — …` H3 네 개에 구체 항목. 감점 사유는 개정 범위의 누락(C-02·C-03) |
| 검증가능성 (Testability) | 0.50 | 0.50 | 13개 중 넷이 재지 못하거나 거짓 실패한다 — AC-002(스스로 틀렸다고 적음), AC-003(절반 미검증), AC-004(②에 가려짐), AC-011(경로 결함) |
| 추적성 (Traceability) | 0.75 | 0.75 | 13 REQ ↔ 13 AC 매트릭스가 존재하고 고아 없음. 다만 REQ-004·012 의 일부 조항이 어떤 관측에도 닿지 않는다(M-03) |

종합(조화 평균 근사): **0.55**

---

## 9. 권고 — run 단계 진입 전 처리 순서

1. **C-01 을 먼저 결정한다.** `welcome` 게이트가 막는 위협을 정직하게 다시 적을 것: "`hello` 에 응답하지 않는 상대"만 막으며, 응답하는 상대(= F-01 이 재현한 그 자리에 설 수 있는 모든 상대)에게는 사칭 채팅 주입과 이력 오염이 그대로 열려 있다. 그 절반을 어느 카드가 소유하는지 §5 에 적고, `spec.md:73` 의 "위조할 수 없다" 문장을 철회한다. 이 결정이 카드의 성과 서술을 바꾸므로 가장 먼저 온다.
2. **C-03 을 개정한다.** `SPEC-CHANCLIENT-001` 을 v0.4.0 으로 올려 REQ-CHANCLIENT-004·005 에 인증 전제를 달고, AC-CHANCLIENT-003·004·005·007·009·010·011 의 하네스가 `welcome` 을 보내도록 기준 본문을 개정한다. `SPEC-CHANPERM-001` 에 한 것과 **같은 절차**다.
3. **C-02 를 개정한다.** `SPEC-CHANPERM-001` AC-CHANPERM-005·006·007·009 를 새 계약에 맞춰 개정한다. 특히 AC-007 은 두 방향 무변형을 **같은 id 로** 재는 형태로 재설계해야 한다(발신 `'Ab-C12'` → 판정 `'Ab-C12'`, 서버 쪽 대소문자 결함은 카드 `t7` 소관임을 명시). 그 뒤 `acceptance.md:569`·`plan.md:158` 의 형제 비회귀 목록을 개정 후 기준으로 갱신하고 `AC-CHANCLIENT-*` 를 추가한다.
4. **H-01 정정.** AC-CHANAUTH-004 에 `expect(w.notes.length).toBe(notesBefore)` 를 더한다 — 채팅 축은 ②가 방어하지 않으므로 ①만을 잰다.
5. **H-02 정정.** AC-CHANAUTH-002·003 의 최종 단언 형태를 **plan 단계에서** 확정한다(승인 요청 발신 → 같은 id 판정 왕복). run 으로 미루지 않는다. `progress.md` 의 `open_questions` 를 실제 값으로 고친다.
6. **H-03 정정.** `spawnChild` 경로를 `fileURLToPath(new URL('../dist/index.js', import.meta.url))` 로 바꾸고 하네스 import 에 `isTransportAllowed`·`resolveUrl` 을 추가한다.
7. **M-01·M-02 정정.** 루프백 판정을 `hostname` 의 대괄호 형태까지 포함하도록 `{'127.0.0.1','localhost','::1','[::1]'}` 로 못 박고, AC-010 표에 `['ws://127.0.0.1.evil.com/bot', false]` 행을 지금 추가한다(run 으로 미루지 않는다).
8. **L-01.** `CHANGELOG.md:15`·`:41` 을 sync 단계 정정 대상으로 어느 문서에든 적어 둔다.

optional 3건(M-02 는 표 한 줄이라 위에 포함, M-03·L-02)은 오케스트레이터 재량이다. blocking 7건이 닫히기 전에는 run 진입을 권하지 않는다.

---

_감사자: plan-auditor · 반복 1/3 · 대상 커밋 `f1507ea` · 작성자 추론 맥락 배제(M1 Context Isolation)_
