# 카드 t9 plan 단계 완료 보고

| 항목 | 값 |
|------|-----|
| 카드 | `t9` — 감사 F-01(Critical, blocking) 정정 |
| 트리 | `.claude/worktrees/t9`, 브랜치 `WT-chanperm-gate` |
| 단계 | plan (문서만). **구현·테스트 코드는 한 줄도 쓰지 않았다** |
| 신규 SPEC | `SPEC-CHANAUTH-001` (Tier M, `status: draft`) |
| 결합 개정 | `SPEC-CHANPERM-001` v0.2.2 → **v0.3.0** |
| 근거 | `.moai/reports/t4/sync-audit.md` F-01 · F-07, 프로브 `.moai/state/verify/t4-sync-audit/probe-rogue.ts` |

---

## 1. 만든 것

### 1.1 신규 SPEC — `SPEC-CHANAUTH-001` (전송 인증)

`.moai/specs/SPEC-CHANAUTH-001/` 에 네 파일. 요구사항 13개·수용 기준 13개로 Tier M 상한(16/16) 안이다.

| 파일 | 내용 |
|------|------|
| `spec.md` | GEARS 요구사항 13개. §4.1 `welcome` 게이트(001~004), §4.2 발신 `request_id` 집합(005~009), §4.3 `wss://` 강제(010~012), §4.4 범위 경계(013). §3.1 이 `SPEC-CHANPERM-001` 과의 계약 충돌과 그 해소를 표로 못 박는다 |
| `plan.md` | §B 무상태 개정 결정(두 갈래와 고르지 않은 이유), §C 상태를 `channel-server.ts` 에 두는 결정, §D 전송 검사를 `resolveUrl` 밖에 두는 결정, §F 마일스톤 M1(게이트)→M2(`wss`)→M3(발신 집합), §H 안티패턴 17개 |
| `acceptance.md` | 수용 기준 13개. 전부 vitest 안에서 실행된다 |
| `progress.md` | §E.1 채워짐(계약 질문 해소 기록), §E.2~§E.4 는 자리표시자 |

**세 겹으로 닫는다.** ① `welcome` 게이트(`gateway-client.ts`) — 인증 전 소켓의 `message`/`permission_verdict`/`history_response` 를 버린다. ② 발신 id 대조(`channel-server.ts`) — 채널이 내보낸 적 없는 `request_id` 의 판정을 중계하지 않는다. ③ `wss://` 강제(`index.ts`) — 비루프백 호스트에 평문으로 붙지 않는다. 어느 하나도 단독으로는 F-01 을 닫지 못한다.

### 1.2 수용 기준이 세 가지 실패 부류를 어떻게 피하는가

**(1) 아무것도 재지 않는 단언.** 기준마다 본문 끝에 **"이 기준을 무너뜨리는 변이"** 를 한 줄로 적었고, 품질 게이트에 변이 6종(A~F)과 각각의 예상 실패 기준을 표로 묶었다. 표와 어긋나면 실패한 것은 구현이 아니라 기준이다.

핵심 기준은 **짝으로만 성립한다**:

| 짝 | 한쪽만 있으면 통과하는 구현 |
|----|---------------------------|
| AC-001(welcome 없음 → 0건) ↔ AC-002(welcome 있음 → 각 1건) | 001 만: 모든 프레임을 버리는 구현 / 002 만: 게이트가 없는 현재 구현 |
| AC-006(발신 안 한 id → 0건) ↔ AC-007(발신한 id → 정확히 1건) | 006 만: 판정 릴레이를 통째로 끊은 구현 |
| AC-010(판정표) ↔ AC-011(진입점이 실제로 부르는가) | 010 만: 판정 함수를 아무도 안 부르는 구현 |

AC-004(재접속 시 게이트가 다시 닫히는가)가 이 중 가장 값이 크다 — 인증 상태를 프로세스 단위로 두는 구현은 001·002 를 **둘 다 통과하면서** F-01 을 그대로 되살린다.

**(2) 회귀 스위트 밖 기준.** 셸 명령으로만 관측하는 기준을 하나도 두지 않았다. 진입점 관측(AC-011)조차 vitest 안에서 자식 프로세스를 띄우는 형태다(형제 AC-CHANWIRE-010·014 와 같은 하네스). 범위 경계(AC-012)만 git 명령인데, 그것은 회귀 대상이 아니라 이 카드 한 번의 경계 확인이다. F-01 프로브(`probe-rogue.ts`)는 이미 거의 테스트였고, AC-001 하네스가 그것을 vitest 로 옮긴 것이다.

**(3) 접두로 만족되는 단언.** `toContain`·`indexOf`·`not.toContain` 을 전부 금지했다. 배열은 `map(...)` 뒤 `toEqual` 로 통째로 잰다 — 무엇이 없는지가 아니라 **무엇만 있는지**를 재야 "그 밖에는 아무것도 없다"가 성립하기 때문이다.

---

## 2. REQ/AC-CHANPERM-008 개정 — before/after

카드 `t4` 는 이 충돌을 **열린 계약 질문으로 기록하고 판단을 미뤘다**(v0.2.2 §4.3 + `acceptance.md` AC-008 아래의 "미해소" 블록). 그 판단이 이 카드의 몫이었고, **발신 id 를 기억하는 쪽으로 답했다**.

### 2.1 REQ-CHANPERM-008 (`spec.md` §4.3)

**Before (v0.2.2):**

> 채널이 알지 못하거나 이미 해소된 `request_id` 에 대한 판정이 도착하더라도, 채널 프로세스가 죽어서는 안 되고 **다른 `request_id` 의 판정 알림을 만들어서도 안 된다**. 채널은 대기 중인 요청을 기억하지 않으므로(무상태), 판정과 요청을 짝짓는 일은 전적으로 Claude Code 의 몫이다 — 채널은 받은 `request_id` 를 그대로 실어 보내고 판단하지 않는다.
>
> 같은 `request_id` 로 판정이 두 번 오면 알림도 두 번 나간다. 두 번째를 채널이 삼키려면 해소된 id 목록을 기억해야 하는데, 그것이 곧 상태다. Global Constraints 의 무상태 원칙이 이 선택을 고정한다.

**After (v0.3.0):**

> 채널 서버는 **자신이 `deps.sendPermissionRequest` 로 내보낸 `request_id` 의 집합**을 기억해야 하며, 그 집합에 없는 `request_id` 의 판정이 도착하면 Claude Code 로 판정 알림을 보내서는 안 된다. 집합에 있는 `request_id` 의 판정은 정확히 한 번 중계하고 그 id 를 집합에서 지워야 한다 — 같은 id 로 두 번째 판정이 오면 그 판정은 중계되지 않는다. 어떤 경우에도 채널 프로세스가 죽어서는 안 되고, **다른 `request_id` 의 판정 알림을 만들어서도 안 된다**.

죽지 않는다는 견고성 조항은 그대로 살아 있고, 중계 여부만 뒤집혔다.

### 2.2 무상태 원칙을 어디까지 개정하는가 (경계를 좁게 못 박았다)

폐기가 아니라 **축소**다. 개정 뒤에도 그대로인 것:

- 디스크에 아무 파일도 쓰지 않는다. 설정은 환경변수 두 개로만 받는다.
- 요청 내용(`tool_name`·`description`·`input_preview`)도, 판정 값도, 요청 시각도 기억하지 않는다.
- 만료 타임아웃·재전송 큐·버퍼링은 여전히 없다.
- 프로세스가 죽으면 집합은 사라진다. 복구도 영속화도 하지 않는다.

**새로 인정되는 것은 `request_id` 문자열들의 상한(128, FIFO 축출) 있는 목록 하나뿐이다.** 이 문장이 개정의 경계이며, 이보다 넓은 상태를 들이려는 변경은 새 SPEC 의 일이다.

**왜 굽혔는가.** 대안은 "무상태를 지키고 인증은 전송 계층에서만 해결한다"였다. 그 길은 **서버 자신이 손상되거나 토큰이 유출된 경우의 승인 주입을 막지 못한다.** 값의 비용이 비대칭이다 — 잘못 막으면 사람이 승인을 한 번 더 눌러야 하고, 잘못 통과시키면 `rm -rf` 가 승인 없이 실행된다.

**상태를 어디에 두는가.** `channel/src/channel-server.ts` 다. 발신(`deps.sendPermissionRequest` 호출)과 수신(`handlePermissionVerdict`)을 둘 다 보는 유일한 지점이고, `SPEC-CHANPERM-001` 의 기존 하네스(`attach()` → `handle.handlePermissionVerdict`)가 그 게이트를 관측할 수 있는 유일한 자리이기도 하다. 배선(`index.ts`)에 두면 AC-CHANPERM-008 이 그 방어를 재지 못하고, **기준이 재지 못하는 방어는 회귀에서 사라진다**(감사 §3.2 가 이 프로젝트에서 이미 확인한 부류다).

### 2.3 AC-CHANPERM-008 (`acceptance.md`)

**Before** — 모르는 id 의 판정이 알림으로 나가는 것을 **정상 동작으로 못 박았다**:

```ts
const ids = verdicts.map(v => v.params.request_id)
expect(ids).toEqual(['zzzzz', 'abcde', 'abcde'])     // 받은 id 그대로, 순서 그대로, 셋 다
expect(ids).not.toContain('abcde-1')                 // 어떤 id 도 만들어내지 않는다
```

**After** — 발신하지 않은 id 의 판정이 **한 건도 나가지 않는 것**을 잰다. 네 관측이 서로를 가릴 수 없게 짜였다:

```ts
await sendRequest(client, REQ)                                             // 발신은 'abcde' 하나
expect(requests.map(r => r.request_id)).toEqual(['abcde'])

handle.handlePermissionVerdict({ request_id: 'zzzzz', behavior: 'allow' }) // 발신한 적 없다
expect(verdicts).toEqual([])                                               // ① 한 건도 나가지 않는다

handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'allow' })
expect(verdicts.map(v => v.params)).toEqual([{ request_id: 'abcde', behavior: 'allow' }])  // ② 그 id 그대로 1건

handle.handlePermissionVerdict({ request_id: 'abcde', behavior: 'deny' })  // 이미 소진된 id
expect(verdicts.length).toBe(1)                                            // ③ 두 번째는 나가지 않는다

await sendRequest(client, { ...REQ, request_id: 'qqqqq' })                 // ④ 새 발신은 여전히 성립
handle.handlePermissionVerdict({ request_id: 'qqqqq', behavior: 'deny' })
expect(verdicts.map(v => v.params)).toEqual([
  { request_id: 'abcde', behavior: 'allow' }, { request_id: 'qqqqq', behavior: 'deny' },
])
```

①만 있으면 릴레이를 통째로 끊은 구현이, ③이 없으면 집합에서 지우지 않는 구현이 통과한다. REQ-CHANPERM-007 의 무변형 조항도 ②의 `toEqual` 이 함께 지킨다 — 정규화하면 조회가 빗나가 0건이 되거나 값이 어긋난다.

### 2.4 "열려 있는 계약 질문 (미해소)" 블록 — 두 파일 모두에서 제거

- `spec.md` §4.3 의 두 문단 인용 블록 → **제거**. 자리에 "개정 경위 (v0.3.0)" + "무상태 원칙은 폐기되지 않고 좁혀진다" + "상태를 어디에 두는가" 세 문단이 들어갔다.
- `acceptance.md` AC-008 아래 블록 → **제거**. 자리에 "v0.3.0 개정 기록 (감사 F-01)" 과 run 단계 순서 주의가 들어갔다.

`grep "열려 있는 계약 질문"` 은 이제 `acceptance.md` 개정 이력 행 하나(경위 설명 속 인용)만 잡는다.

### 2.5 함께 손댄 곳 (스테일 방지)

| 파일 | 위치 | 내용 |
|------|------|------|
| `spec.md` | 프론트매터 | `version: 0.3.0`, `updated: 2026-08-28` |
| `spec.md` | HISTORY | v0.3.0 행 신설 |
| `spec.md` | §2 용어 | "무상태" 정의를 디스크 무상태로 좁힘 |
| `spec.md` | §4.3 제목 | "불일치와 무상태" → "발신 대조와 무상태" |
| `spec.md` | §5 범위 밖 | "프로세스 메모리 상태 배제" 한 줄 개정 |
| `spec.md` | §5 F-14 | 발신 대조가 F-14 를 좁히지 않는다는 문장 추가 |
| `spec.md` | §6 제약 | 무상태 제약 한 줄 개정 |
| `spec.md` | §8 참조 | `SPEC-CHANAUTH-001` · 감사 보고 · 카드 `t9` 추가 |
| `acceptance.md` | 최상단 | **개정 이력** 섹션 신설(v0.3.0 행) — 이 문서에는 HISTORY 가 없었다 |
| `acceptance.md` | 검증 원칙 표 | "불일치 판정" 행 → "발신하지 않은 판정" 행 |
| `acceptance.md` | AC 매트릭스 | AC-008 행 |
| `acceptance.md` | 엣지 케이스 표 | 두 행(두 번째 요청 / 같은 id 두 번) |
| `acceptance.md` | DoD | 개정분 증거 한 줄 추가 |
| `plan.md` | §B 표 | 세 칸 취소선 + 개정값. 뒤집히지 않은 두 칸(정규화·버퍼링)을 명시 |
| `plan.md` | §H | "채널에 대기 맵 두기" 안티패턴 철회 + 여전히 금지되는 상태 열거 |

`plan.md` 는 지시된 산출물은 아니었으나, §B 표와 §H 안티패턴이 개정 전 문언을 그대로 들고 있으면 run 단계가 정반대 지침을 읽게 되므로 함께 고쳤다.

---

## 3. 테스트 파일 충돌 — run 단계로 넘긴다

**`channel/test/permission-relay.test.ts:185~206`** 의 `it('an unknown or already-resolved verdict resolves nothing else and does not crash')` 블록이 개정 전 문언으로 **이미 구현돼 있다.** 위 2.3 의 before 코드가 그 파일에 그대로 있다.

교체 순서를 `SPEC-CHANAUTH-001` `plan.md` §F M3 단계 1 에 못 박았다:

1. 새 기준 AC-CHANAUTH-006·007·008·009 를 **추가**한다. 기존 AC-CHANPERM-008 테스트는 아직 손대지 않는다.
2. 네 새 기준이 단언 실패로 실패하는 것을 확인한다.
3. 발신 집합 구현을 넣은 **직후** 다시 돌려, **기존 AC-CHANPERM-008 이 실패하는 것을 눈으로 관측**하고 그 원문을 `progress.md` §E.2 에 남긴다.
4. 그 실패를 확인한 뒤에야 개정본으로 교체한다.

3번이 이 카드에서 가장 중요한 관측이다 — 개정본을 먼저 넣으면 계약 충돌이 실재했다는 증거가 영원히 남지 않는다. `acceptance.md` AC-CHANAUTH-013 전이 5 와 §H 안티패턴에도 같은 문장을 걸어 두었다.

부수 영향 하나: `permission-relay.test.ts` 의 다른 테스트 중 `sendRequest` 없이 `handlePermissionVerdict` 만 부르는 것이 있으면 함께 깨진다. AC-CHANPERM-009(미연결 판정)가 그 형태이므로 M3 단계 1 에서 확인 대상이다 — 이 기준은 "예외·미처리 거부가 없는가"를 재므로, 발신 집합 게이트에 걸려 알림이 0건이 되어도 **첫 두 단언은 여전히 성립한다.** 다만 마지막 양성 짝(`verdicts.length === 1`)은 발신 기록이 필요해질 수 있다. 개정하지 않고 남겨 둔 이유는, 그 판단이 실제 실패 원문을 보고 내려야 하는 것이기 때문이다 — 아래 잔여 위험 1번.

---

## 4. 잔여 위험과 열린 질문 (run 단계 인계)

1. **AC-CHANPERM-009 의 마지막 양성 짝.** 위 3절 마지막 문단. M3 단계 1 에서 실제 실패 원문을 보고 판단한다. 기준 본문 수정이 필요하면 `manager-spec` 재위임 사안이지, run 단계가 임의로 고칠 것이 아니다.

2. **AC-CHANAUTH-002·003 의 최종 형태가 M3 에서 확정된다.** `welcome` 뒤 판정이 세션에 도달하려면 그 `request_id` 가 발신 집합에도 있어야 한다 — 즉 §4.1 과 §4.2 를 합친 최종 단언은 **채널이 먼저 승인 요청을 내보낸 뒤** 같은 id 의 판정을 되돌리는 왕복이다(AC-CHANPERM-010 과 같은 형태). 두 기준 본문에 이 사실과 확정 시점을 명시했고, DoD 에 §E.2 원문 기록을 걸었다. **미확정으로 방치하지 않는다.**

3. **`welcome` 을 인증 증거로 쓰는 것은 완전한 상호 인증이 아니다.** 토큰이 유출되면 진짜 `welcome` 을 만들 수 있으므로 게이트가 무의미해지고, 그 경우 방어는 발신 집합 대조 한 겹뿐이다. 완화하지 않았고 한계를 `spec.md` §2·§5 에 명시했다.

4. **상한 128 의 근거는 추정이다.** 실사용 분포를 재지 않았다. 초과 시 증상("오래된 승인이 안 먹는다")이 정상 동작과 구분되지 않아 진단이 어렵다. `plan.md` §E 에 위험으로 올렸고 §E.2 Gaps 기록을 요구했다.

5. **`welcome` 이 두 번 오는 경우를 관측하지 않는다.** 현재 서버는 한 번만 보낸다. 엣지 케이스 표에 "미검증"으로 남겼다.

6. **F-02·F-03·F-04·F-14 는 여전히 열려 있다.** 이 SPEC 은 **누가 말하는가**를 막고, 저쪽은 **무엇이 말해지는가**를 막는다. `welcome` 게이트가 서도 인증된 게이트웨이를 거쳐 들어온 본문은 그대로 통과하므로, 방 참가자가 심은 주입 경로는 손대지 않았다. `spec.md` §5 에 소유자와 함께 적었고 DoD 에 §E.2 기록을 걸었다.

7. **실 게이트웨이 결합은 시험하지 않는다.** 모든 기준이 스텁 대상이다. 실서버가 `hello` 검증 직후에만 `welcome` 을 보낸다는 사실은 코드로 확인했으나(`server/src/gateway.ts`), 실왕복은 E2E 소관으로 남긴다.

---

## 5. 이 카드가 지킨 규칙

- **구현·테스트 코드 한 줄도 쓰지 않았다.** `channel/` 아래는 무변경이다.
- 사용자에게 아무것도 묻지 않았다. 막힌 지점이 없었으므로 blocker 보고도 없다.
- 새 SPEC 은 디렉터리 구조(`SPEC-CHANAUTH-001/`)로 만들었고 평면 파일을 만들지 않았다. SPEC ID 정규식 자가 점검을 Bash 로 실행해 `PASS` 를 확인했다.
- 개정한 두 문서에 각각 개정 이력 행을 남기고 카드 `t9` / 감사 F-01 에 귀속시켰다.
