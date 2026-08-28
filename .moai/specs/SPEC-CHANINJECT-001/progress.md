# SPEC-CHANINJECT-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC | `SPEC-CHANINJECT-001` — 채널 주입 방어 (봉투 중화 · 구조화 이력 · 지시문 신뢰 경계) |
| 카드 | `t10` |
| 원본 근거 | `.moai/reports/t4/sync-audit.md` F-02 · F-03 · F-04 (전부 High · blocking) |
| 이월 근거 | `.moai/reports/t9/sync-audit.md` §5 · `sync-audit-2.md` §6·§7·§8 — F-A3·F-A4·F-A5·F-A6·F-A7·F-A10·F-B3·J2 |
| 재현 프로브 | `.moai/state/verify/t4-sync-audit/probe-inject.test.ts` (P1 · P3) |
| 워크트리 | `.claude/worktrees/t10` (브랜치 `WT-injection-hardening`, plan 진입 HEAD `124b0f7`) |
| 선행 SPEC | `SPEC-CHANNEL-001` · `SPEC-CHANCLIENT-001` · `SPEC-CHANWIRE-001` · `SPEC-CHANPERM-001` · `SPEC-CHANAUTH-001` |
| 결합 개정 | `SPEC-CHANNEL-001` v0.3.0 · `SPEC-CHANWIRE-001` v0.4.0 · `SPEC-CHANCLIENT-001` v0.5.0 · `SPEC-CHANAUTH-001` v0.4.0 — 전부 이 카드 plan 단계에서 적용 |
| 인계 카드 | `t15` — 전송 계층 상대의 신원(사칭 채팅 주입 · 이력 오염 · 판정 주입의 잔여 절반 · F-A8) · `t11` — 서버 쪽 방 인가(감사 F-14) |
| 계획 감사 | 1회차 `.moai/reports/t10/plan-audit.md` — **FAIL(0.75 < Tier M 0.80)**, 차단 8건 · 비차단 5건. 교정 대장 `.moai/reports/t10/plan-done-2.md` (F-01~F-13 전건 처리), 2회차 판정 대기 |
| 현재 상태 | **`draft`** v0.1.0 — plan 단계 산출물 작성 완료 + 감사 1회차 교정 반영, 2회차 감사 대기 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_authored_at: 2026-08-28
plan_corrected_at: 2026-08-28   # 계획 감사 1회차 FAIL(0.75) 교정 반영
plan_audit_iterations: 1        # .moai/reports/t10/plan-audit.md (FAIL), 교정 대장 plan-done-2.md
spec_id: SPEC-CHANINJECT-001
card: t10
plan_head_sha: 124b0f7
branch: WT-injection-hardening
worktree: .claude/worktrees/t10
tier: M
requirements: 15        # REQ-CHANINJECT-001..015
acceptance_criteria: 14 # AC-CHANINJECT-001..014
mutations: 15           # M-A..M-O
artifacts:
  - .moai/specs/SPEC-CHANINJECT-001/spec.md
  - .moai/specs/SPEC-CHANINJECT-001/plan.md
  - .moai/specs/SPEC-CHANINJECT-001/acceptance.md
  - .moai/specs/SPEC-CHANINJECT-001/progress.md
coupled_revisions:
  - "SPEC-CHANNEL-001 v0.3.0 — REQ/AC-CHANNEL-005(일곱→아홉 항목) · REQ/AC-CHANNEL-010(#번호→cursor) · REQ-CHANNEL-013(중화 절)"
  - "SPEC-CHANWIRE-001 v0.4.0 — REQ-CHANWIRE-012(줄 형식→구조화 JSON) · AC-CHANWIRE-007·008 · §5 F-03 소유자 · §6 제약"
  - "SPEC-CHANCLIENT-001 v0.5.0 — spec.md:208 범위 밖 줄의 옛 형식 리터럴 · :228 잔여 소유 분리. 계약 무변경"
  - "SPEC-CHANAUTH-001 v0.4.0 — §5 F-02·F-03·F-04 소유권 3줄 이관 · REQ-004/008/010/011 관측 참조 4줄 · §2 루프백 «네 값»→«세 값» · progress.md 정정 2자리(F-B3·J2) · **AC-CHANAUTH-010 개정(9행→12행 판정표 + 새 it() 이름, 계획 감사 F-04)** · HISTORY 0.4.0 에 «네 조항의 관측이 CHANINJECT 착지 전까지 미이행» 명시(계획 감사 F-09)"
sibling_breakage:
  measured_by: "npm run build -w channel && npm test -w channel -- --reporter=verbose 를 이 트리에서 실행해 파일별 it( 블록 수를 실측하고(12/16/12/14/7 = 61), 각 블록의 단언을 네 표면(content · INSTRUCTIONS · 도구 설명 · 이력 렌더링)과 원문 대조"
  measured_log: .moai/state/verify/t10-plan2/verbose.log
  total: 61
  red: 3            # 스위트가 빨개지는 것
  replaced: 1       # 대체되어 사라지는 것 — 실행으로는 잡히지 않는다 (계획 감사 F-04)
  invalidated: 4    # red + replaced. 이 카드가 무효화하는 형제 수용 기준의 수
  unaffected: 57
  red_items:
    - "channel/test/channel-server.test.ts:128 AC-CHANNEL-010 — expect(d).toContain('#번호')"
    - "channel/test/index-wiring.test.ts:207 AC-CHANWIRE-007 — toBe('#1 [2026-08-01] alice: 과거')"
    - "channel/test/index-wiring.test.ts:217 AC-CHANWIRE-008 — toBe('(기록 없음)')"
  replaced_items:
    - "channel/test/transport-auth.test.ts:236-250 AC-CHANAUTH-010 — it('isTransportAllowed decides by scheme and host only') 9행 표가 12행으로 대체된다. 옛 9행은 새 구현 아래에서도 전부 옳아 실행으로 빨개지지 않는다"
  confirmation: "red 3건은 AC-CHANINJECT-014 전이 1b·2b 가 run 단계에서 실행으로 확인한다. replaced 1건은 전이로 덮을 수 없어 AC-CHANINJECT-012 의 부분집합·대체 조건(이름 집합 대조)과 SPEC-CHANAUTH-001 v0.4.0 문서 개정 착지로 확인한다"
carried_forward_unresolved:
  - "Claude Code 호스트의 실제 봉투 처리 — 감사 §5.4 미확정. 이 트리에도 호스트가 없어 관측 불가. 요구사항은 두 갈래 어느 쪽에서도 성립하도록 작성(spec.md §1.2)"
gaps:
  - "변이 15종(M-A~M-O)을 한 번도 실행하지 않았다 — 겨냥하는 신규 기준이 아직 코드로 존재하지 않아 적용 대상이 없다. 변이표는 소스 대조로 도출한 예측이다. (스위트 자체는 실행 가능하고 기준선 61/61 초록을 실측했다)"
  - "빨개지는 3건은 계획 감사 1회차가 네 표면을 소스에 적용해 실행 관측했다(plan-audit.md §2 E3). 이 카드가 그 변이를 재실행하지는 않았다 — 인용이다"
  - "신규 AC 코드를 실제 테스트 파일에 넣어 실행하지 않았다. 하네스 시그니처는 원문(transport-auth.test.ts:34·120-128, index-wiring.test.ts:56)으로 대조했으나 컴파일·실행으로 확인하지 않았다"
  - "AC-CHANINJECT-012 의 기대 하한 70 은 산출식(61 − 4 + 4 + 9)으로 도출한 예측이다. 실측은 run 단계 착지 후에만 가능하다"
  - "모델이 지시문을 따르는지 관측하지 않았고 관측할 수단이 없다 — 기준은 문자열의 존재·부재만 잰다"
  - "카드 t15 의 큐 본문이 이 SPEC 이 인계한 범위 셋 중 둘(위조 permission_verdict·선착 판정, F-A8)을 담지 않는다 (계획 감사 F-10). 큐에 편집 verb 가 없어 SPEC 이 닫을 수 없다 — 리드 조치 항목이다"
lead_action_required:
  - id: F-10
    what: "큐 카드 t15 의 본문이 이 SPEC 이 t15 소유로 넘긴 범위와 일치하지 않는다"
    spec_says: "① welcome 위조 불가능화 · ② 위조 permission_verdict 와 «먼저 도착한 판정이 이긴다» · ③ F-A8(128 축출) — spec.md §5"
    card_says: "① 과 «사칭 message·history_response» 만. ②·③ 없음"
    why_spec_cannot_close: "moai todo 에 편집 verb 가 없다. done + add 는 id 재발급이라 기존 참조가 깨진다"
    owner: "리드"
not_closed_by_this_card:
  - "F-01 잔여 셋 + F-A8 — 카드 t15"
  - "F-14 서버 쪽 방 인가 — 카드 t11"
  - "F-05 — 별도 카드 (감사 §6 권고 3번)"
  - "카드 t4 sync 재감사 — 이 카드의 sync 는 그 선행 조건이지 재감사 자체가 아니다 (spec.md §5)"
```

## §E.2 Run-phase Evidence

모든 관측은 **원문 인용**이다. 요약은 증거가 아니다(verification-claim-integrity §3.2). 증거 로그 전문은 `.moai/state/verify/t10-run/` 에 있다.

### 0. 실행 환경과 규약

| 항목 | 값 |
|------|-----|
| `spec_base_sha` | `bbd21cd80e5d9b78baf2a00eee33bd386943fd28` — M1 단계 0, `git rev-parse HEAD` (AC-CHANINJECT-013 조건 1 의 대상) |
| 실행 규약 | **모든** 테스트 실행 전 `npm run build -w channel` 선행 (리드 지시 + plan.md §F M1.1 — dist 부재 시 3건이 환경 사유로 실패) |
| 증거 파일 | `baseline.log` · `names-before.txt`(61행) · `replaced.txt`(4행) · `m1-red.log` · `m1-post-impl.log` · `m1-green.log` · `m1-mut-{A,B,C,D,E,F,J}.log` · `m2-pre.log` · `m2-post-impl.log` · `m2-green.log` · `m2-mut-{G,H,I}.log` · `m3-pre.log` · `m3-green.log` · `m3-mut-{K,L,M,N,O}.log` · `after.log` · `names-after.txt`(70행) · `coverage.log` · `clean-hashes-m1.txt` · `clean-hash-m2-index.txt` · `clean-hashes-m3.txt` |

### 1. 기준선 (M1 단계 0b, AC-CHANINJECT-012 의 좌변)

명령: `npm run build -w channel && npm test -w channel -- --reporter=verbose` → `baseline.log`

```
 Test Files  5 passed (5)
      Tests  61 passed (61)
```
`wc -l < names-before.txt` → `61`. 대체 예외 4건의 **옛** 이름이 전부 포함됨: `grep -c 'documents the #번호 …\|history lines carry …\|empty history renders the Korean placeholder\|isTransportAllowed decides by scheme and host only'` → `4`.

Attribution: (this run, this tree @ `bbd21cd` 작업트리, 구현 착지 전)

### 2. 전이 다섯 건 (AC-CHANINJECT-014) — 원문

**전이 1 — M1 RED** (`m1-red.log`, 구현 전): `Tests  3 failed | 62 passed (65)`, exit=1

```
× test/channel-server.test.ts > channel server > points the cursor at the JSON field and never at a #번호 in line text
× test/channel-server.test.ts > channel server > neutralizes channel envelope sequences in the body, the author name and the file path
× test/channel-server.test.ts > channel server > states the trust boundary and keeps every pre-existing instruction fragment
✓ test/channel-server.test.ts > channel server > leaves a body without envelope sequences byte-identical, and never touches meta
✓ test/channel-server.test.ts > channel server > documents the #번호 numbering and the since_id cursor in the tool description
```

> **어긋남 판정 (전이 1).** acceptance.md 전이표는 001·002·003·006 네 건의 실패를 예고했으나 실측은 **3건**이다 — AC-002(`leaves a body …`)는 «중화가 무해한 본문을 건드리지 않는다» 를 재므로, 중화가 **없는** 구현 전 코드에서도 본문은 글자 그대로 통과해 구조상 실패할 수 없다. 판정: **기준이 틀린 것이 아니라 전이표의 행이 과대 예고했다.** AC-002 는 과잉 중화(M-C)를 잡는 유일한 자리이므로 기준·구현 모두 유지하고 본문 없이 진행했다. (같은 원리로 AC-002 는 RED 를 갖지 않는 채 GREEN 에서 첫 발화한다 — 전이 2 원문에서 ✓ 로 관측된다.)

**전이 1b — M1 형제 개정 전 실패** (§3.5 파손 목록 1번의 실행 확인). 두 반쪽이 한 쌍이다.

- (i) 개정 **전** 형태는 통과했다 — 위 전이 1 원문의 마지막 줄 (`✓ … documents the #번호 numbering …`, `m1-red.log`) 과 기준선 `baseline.log`.
- (ii) 구현 뒤 같은 개정 전 형태가 **실패했다** (`m1-post-impl.log`: `Tests  1 failed | 64 passed (65)`):

```
 FAIL  test/channel-server.test.ts > channel server > documents the #번호 numbering and the since_id cursor in the tool description
AssertionError: expected '채팅 서버에서 이 방의 대화 기록을 가져온다. 멘션 없이 오간 대화…' to contain '#번호'
Expected: "#번호"
Received: "채팅 서버에서 이 방의 대화 기록을 가져온다. 멘션 없이 오간 대화를 따라잡거나 컨텍스트를 잃었을 때 맥락을 복구할 때 사용. 결과는 JSON 한 건이고, 다음 요청의 since_id 로는 결과 JSON 의 cursor 필드 값을 그대로 넘긴다."
 ❯ test/channel-server.test.ts:128:15
```

이 원문이 «실패의 원인은 환경이 아니라 **계약 개정**(REQ-CHANINJECT-007 의 #번호 안내 삭제)임» 을 증명한다. 그 뒤 AC-006 이 그 자리를 대체했다.

**전이 2 — M1 GREEN** (`m1-green.log`): `Test Files  5 passed (5)`, `Tests  64 passed (64)`, exit=0. AC-001·002·003·006 전부 ✓.

**전이 2b — M2 형제 개정 전 실패** (§3.5 파손 목록 2·3번의 실행 확인).

- (i) 신규 AC-004·005 만 넣고 기존 AC-CHANWIRE-007·008 은 손대지 않은 실행 (`m2-pre.log`): `Tests  2 failed | 64 passed (66)` —

```
× test/index-wiring.test.ts > channel wiring > a single poisoned message stays a single structured element
× test/index-wiring.test.ts > channel wiring > derives the cursor from ids only, never from body text, and nulls it when empty
✓ test/index-wiring.test.ts > channel wiring > empty history renders the Korean placeholder
✓ test/index-wiring.test.ts > channel wiring > history lines carry the #id cursor prefix
```

- (ii) `fetchHistory` 를 구조화 JSON 으로 바꾼 직후의 실행 (`m2-post-impl.log`): `Tests  2 failed | 64 passed (66)` —

```
 FAIL  test/index-wiring.test.ts > channel wiring > history lines carry the #id cursor prefix
AssertionError: expected '{"cursor":1,"messages":[{"id":1,"at":…' to be '#1 [2026-08-01] alice: 과거' // Object.is equality
Expected: "#1 [2026-08-01] alice: 과거"
Received: "{"cursor":1,"messages":[{"id":1,"at":"2026-08-01","author":"alice","body":"과거"}]}"

 FAIL  test/index-wiring.test.ts > channel wiring > empty history renders the Korean placeholder
AssertionError: expected '{"cursor":null,"messages":[]}' to be '(기록 없음)' // Object.is equality
Expected: "(기록 없음)"
Received: "{"cursor":null,"messages":[]}"
```

(i)→(ii) 의 쌍이 «기존 두 건의 실패는 개정(구현) 때문» 임을 증명한다. 그 뒤 두 기준을 개정된 형태로 교체했다.

**전이 3 — M3 GREEN** (`m3-green.log`): `Test Files  5 passed (5)`, `Tests  70 passed (70)`, exit=0. AC-CHANINJECT-004~012 전건 포함 전체 초록.

**넷째 형제 기준(AC-CHANAUTH-010)에는 전이가 없다** — 대체되어 사라지는 기준이라 «개정 전 실패» 원문은 존재하지 않는다(F-04). 대신 «통과한 채 사라졌다» 는 사실을 기록한다: 교체 직전 실행(`m3-pre.log`)에서 `✓ test/transport-auth.test.ts > transport auth > isTransportAllowed decides by scheme and host only` (`Tests  68 passed (68)`, exit=0), 교체 뒤 옛 이름은 `names-after.txt` 에 0건(§5 참조). 소멸 관측의 정본은 AC-CHANINJECT-012 조건 3 + `SPEC-CHANAUTH-001` v0.4.0 문서 개정 착지(§7)다.

### 3. AC-CHANINJECT-001..014 매트릭스

AC-001~011 의 명령은 `npm run build -w channel && npm test -w channel -- --reporter=verbose`(최종 실행 `after.log`)이고, 원문은 최종 ✓ 줄이다. Attribution: (this run, this tree @ `087ad3d`).

| AC | 관측 원문 (after.log) |
|----|----------------------|
| 001 | `✓ test/channel-server.test.ts > channel server > neutralizes channel envelope sequences in the body, the author name and the file path` |
| 002 | `✓ test/channel-server.test.ts > channel server > leaves a body without envelope sequences byte-identical, and never touches meta` |
| 003 | `✓ test/channel-server.test.ts > channel server > states the trust boundary and keeps every pre-existing instruction fragment` |
| 004 | `✓ test/index-wiring.test.ts > channel wiring > a single poisoned message stays a single structured element` |
| 005 | `✓ test/index-wiring.test.ts > channel wiring > derives the cursor from ids only, never from body text, and nulls it when empty` |
| 006 | `✓ test/channel-server.test.ts > channel server > points the cursor at the JSON field and never at a #번호 in line text` |
| 007 | `✓ test/transport-auth.test.ts > transport auth > a gated frame raises neither an unhandled rejection nor an uncaught exception` |
| 008 | `✓ test/transport-auth.test.ts > transport auth > imports no filesystem module anywhere under channel/src` |
| 009 | `✓ test/transport-auth.test.ts > transport auth > refuses an unparseable address, stays alive, says nothing on stdout, and explains truthfully` |
| 010 | `✓ test/transport-auth.test.ts > transport auth > decides transport by scheme and host in every branch, loopback included` |
| 011 | `✓ test/transport-auth.test.ts > transport auth > keeps bracketed IPv6 loopback working after the unreachable bare ::1 entry is dropped` |
| 012 | §5 파이프라인 원문 — 네 조건 전부 성립 |
| 013 | §6 다섯 조건 원문 — 전부 성립 |
| 014 | §2 의 전이 다섯 건 원문 (1·1b·2·2b·3) — 전부 순서대로 관측됨 |

**착지 순서 기록 (TDD Invariant i·ii).** 전건이 RED 원문을 갖는 것은 아니다 — AC-002 는 위 판정대로 구조상 RED 를 갖지 못하고, AC-007 은 «구현이 이미 옳다» 고 plan.md §F M3.2 가 예고한 대로 **첫 실행부터 통과했다**(`m3-pre.log`: ✓, 이 기준의 값은 변이 M-K 가 증명한다). 나머지 아홉 신설 기준(001·003·004·005·006·008·009·010·011 중 010 은 교체형이라 RED 가 구현 후 첫 실행)은 전이 1·2b 원문의 실패를 먼저 갖는다.

### 4. 변이 15종 실측표 (M-A..M-O)

절차: 하나씩 적용 → `npm run build -w channel && npm test -w channel -- --reporter=verbose` → 되돌림. 되돌림 확인은 **`git diff` 가 아니라 `shasum` 대조**로 이중화했다(같은 나무의 동시 변이 교훈) — `clean-hashes-m1.txt` / `clean-hash-m2-index.txt` / `clean-hashes-m3.txt` 의 기준 해시와 전건 일치(`shasum -c` → 모두 `OK`). 실패 집합의 판정 기준은 `×` 줄의 테스트 이름이다.

| 변이 | 로그 | 실측 실패 집합 (테스트 이름 → AC) | 예상 (acceptance.md) | 판정 |
|------|------|--------------------------------|---------------------|------|
| M-A | `m1-mut-A.log` | neutralizes channel envelope… → **001** | 001 | 일치 |
| M-B | `m1-mut-B.log` | neutralizes channel envelope… → **001** | 001 | 일치 |
| M-C | `m1-mut-C.log` | leaves a body without envelope… → **002** | 002 | 일치 |
| M-D | `m1-mut-D.log` | neutralizes channel envelope… → **001** ((c) meta 절) | 001 (F-01 정정 후) | 일치 |
| M-E | `m1-mut-E.log` | states the trust boundary… → **003** | 003 | 일치 |
| M-F | `m1-mut-F.log` | states the trust boundary… → **003** | 003 | 일치 |
| M-J | `m1-mut-J.log` | points the cursor at the JSON field… → **006** | 006 | 일치 |
| M-G | `m2-mut-G.log` | single poisoned… **004** · derives the cursor… **005** · empty history renders the same JSON… **CHANWIRE-008(개정)** · history renders as one structured… **CHANWIRE-007(개정)** | 004 · 005 · CHANWIRE-007·008(개정) | 일치 |
| M-H | `m2-mut-H.log` | derives the cursor… **005** · history renders as one structured… **CHANWIRE-007(개정)** | 005 · CHANWIRE-007(개정) | 일치 |
| M-I | `m2-mut-I.log` | derives the cursor… **005** · history renders as one structured… **CHANWIRE-007(개정)** | 005 · CHANWIRE-007(개정) | 일치 |
| M-K | `m3-mut-K.log` | a gated frame raises neither… **007** · a history_response before welcome… **CHANAUTH-003** | 007 · CHANAUTH-003(나), **CHANAUTH-005 는 실패하지 않음** | 일치 |
| M-L | `m3-mut-L.log` | imports no filesystem module… → **008** | 008 | 일치 |
| M-M | `m3-mut-M.log` | refuses an unparseable address… → **009** | 009 | 일치 |
| M-N | `m3-mut-N.log` | decides transport by scheme and host… → **010** | 010 | 일치 |
| M-O | `m3-mut-O.log` | keeps bracketed IPv6 loopback… → **011** | 011 | 일치 |

**M-K 의 비대칭이 F-A3 흡수의 증거다**: 게이트를 `throw` 로 바꿨을 때 새 기준 007 은 실패하고 감사가 «잡지 못한다» 고 실측했던 `AC-CHANAUTH-005`(`gated frames leave no unhandled rejection…`)는 여전히 통과했다 — 예상 표 그대로다. M-K 는 `channel/src/gateway-client.ts` 를 일시적으로 건드리는 유일한 변이라 되돌림을 특별히 확인했다: `shasum -c clean-hashes-m3.txt` → `channel/src/gateway-client.ts: OK`, 최종 `git diff spec_base_sha -- channel/src` 에 없음(§6 조건 3).

### 5. 형제 비회귀 — AC-CHANINJECT-012 파이프라인 원문

명령(acceptance.md 그대로): `npm run build -w channel` → `npm test -w channel -- --reporter=verbose 2>&1 | tee after.log` → `grep -oE '✓ test/[a-z-]+\.test\.ts > .*' after.log | sed 's/ [0-9]*ms$//' | sort > names-after.txt`

```
# (2) 부분집합 조건 — grep -vFf replaced.txt names-before.txt | comm -23 - names-after.txt
(빈 출력 — 57건 전부 names-after.txt 에 있다)

# (3) 대체 조건
grep -cFf replaced.txt names-after.txt   → 0        (옛 이름 4건 전부 소멸)
새 이름 4건 존재 확인                      → 4        (points the cursor… · history renders as one structured…
                                                     empty history renders the same JSON shape… · decides transport…)

# (4) 하한 조건
wc -l < names-after.txt                  → 70       (≥ 70; 산출식 61 − 4 + 4 + 9 = 70 과 정확히 일치)
```
`after.log` 요약 원문: `Test Files  5 passed (5)` / `Tests  70 passed (70)`. Attribution: (this run, this tree @ `087ad3d`).

### 6. 범위 경계와 문서 정정 — AC-CHANINJECT-013 다섯 조건 원문

`SPEC_BASE_SHA=bbd21cd80e5d9b78baf2a00eee33bd386943fd28`

```
(1) test -n "$SPEC_BASE_SHA"            → cond1 exit=0
(2) git diff --name-only $BASE -- server web
    → (빈 출력)
(3) git diff --name-only $BASE -- channel/src
    → channel/src/channel-server.ts
      channel/src/index.ts                (정확히 두 줄 — gateway-client.ts 없음)
(4) git diff --name-only $BASE -- channel/package.json package.json
    → (빈 출력 — 새 의존성 없음)
(5) grep -n '계획 감사' .moai/specs/SPEC-CHANAUTH-001/progress.md | head -1
    → 13:| 계획 감사 | 1차 … 3차 `.moai/reports/t9/plan-audit-3.md` — **마지막 라운드, 마감 완료**
      (교정 대장 `plan-done-4.md`, 커밋 `7e4834b` «계획 감사 3회차 마감»). 계획 감사는 3회로
      종료됐고 이후는 run·sync 단계다 |   ← «예정» 서술 없음 — F-B3 정정 착지
    grep -n 'F-01 .*열림·t15 소유가 §E.2 에' .moai/specs/SPEC-CHANAUTH-001/progress.md
    → 660:| F-01 잔여 **셋** 열림·t15 소유가 §E.2 에 | PASS — … **라벨 정정 (카드 `t10`, 감사 J2)** …
      ← «절반» 이 아니라 «셋» — J2 정정 착지, PASS 판정 값 무변경
```

### 7. M3 단계 3b·7 — 형제 문서 개정의 착지 상태 (검증 전용)

plan.md §F M3.3b(F-B3·J2·AC-CHANAUTH-010 문서 개정)와 단계 7은 **plan 단계에서 이미 착지되어 있었다**(progress.md §E.1 `coupled_revisions` 선언과 일치 — run 단계가 개정을 다시 하지 않는다는 plan.md §A 원칙). run 단계가 한 일은 **재적용이 아니라 원문 대조 검증**이다:

- `SPEC-CHANAUTH-001/spec.md` `version: "0.4.0"` + HISTORY 0.4.0 행 — «④ 형제 수용 기준 1건 개정 — AC-CHANAUTH-010 (계획 감사 F-04)» 명시 확인.
- `SPEC-CHANAUTH-001/acceptance.md:207` 표 행 — «**12행** 판정표 … **v0.4.0 개정, 카드 `t10`**» 확인.
- `SPEC-CHANAUTH-001/acceptance.md` §AC-CHANAUTH-010 본문 — 새 `it()` 이름(`decides transport by scheme and host in every branch, loopback included`) + 12행 표 확인. 이 새 이름은 실제로 스위트에 존재한다(§3 AC-010 행의 ✓).
- 형제 개정 네 건 버전 확인: `SPEC-CHANNEL-001` 0.3.0 · `SPEC-CHANWIRE-001` 0.4.0 · `SPEC-CHANCLIENT-001` 0.5.0 · `SPEC-CHANAUTH-001` 0.4.0 (`grep -m1 '^version:'` 실측).

따라서 이 카드가 `SPEC-CHANAUTH-001/` 에 **직접 쓴 것은 0바이트**이고, §6 조건 5 의 grep 원문이 정정 두 건의 착지 증거다.

### 8. 커버리지 (품질 게이트 «커버리지» 행)

명령: `npm test -w channel -- --coverage` → `coverage.log`

```
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
All files          |   91.11 |     82.6 |   97.22 |   90.59 |
 channel-server.ts  |     100 |    92.85 |      90 |     100 | 160
 gateway-client.ts  |     100 |    96.42 |     100 |     100 | 78
 index.ts           |   69.23 |    62.96 |     100 |   67.64 | 88-108
```

stmts **91.11%** ≥ 85% 하한 통과. `t9` 마감 93.75% 대비 **−2.64pp 하락** — 사유는 §E.3 에 기록했다. Attribution: (this run, this tree @ `087ad3d`).

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_completed_at: 2026-08-28
spec_id: SPEC-CHANINJECT-001
card: t10
spec_base_sha: bbd21cd80e5d9b78baf2a00eee33bd386943fd28
run_head_sha: 087ad3d          # M3 커밋. §E.2 착지 커밋은 이 값 뒤에 온다
branch: WT-injection-hardening
worktree: .claude/worktrees/t10
commits:
  - 0d10507   # M1 봉투 중화·지시문·커서 안내 + frontmatter draft→in-progress
  - f7c7040   # M2 구조화 이력과 분리된 커서
  - 087ad3d   # M3 t9 이월 여덟 건 흡수
quality_gate:
  build:        "PASS — npm run build -w channel 종료 코드 0 (직접 실행)"
  typecheck:    "PASS — npm run typecheck -w channel 종료 코드 0 (직접 실행)"
  tests:        "PASS — Tests 70 passed (70), exit 0, ✓ 줄 70 ≥ 70 (after.log 원문)"
  coverage:     "PASS — channel/src stmts 91.11% ≥ 85% (coverage.log 원문)"
  scope:        "PASS — AC-013 다섯 조건 전부 (§E.2 §6 원문). channel/src 변경 두 파일, gateway-client.ts 무변경"
  mutations:    "PASS — 15종 M-A..M-O 개별 적용·실행·되돌림, 실측 실패 집합이 예상 표와 15/15 일치 (§E.2 §4)"
  sibling:      "PASS — AC-012 네 조건 전부 (§E.2 §5 원문)"
  stateless:    "PASS — git status --porcelain 새 런타임 산출물 0건 (추적 파일 수정 없음) + AC-008 인프로세스 짝"
transitions:
  t1_red: "001·003·006 실패 (002 는 구조상 RED 불가 — §E.2 §2 판정), 1b 쌍 원문, 2 GREEN 64/64"
  t2b: "2b (i) 신규 2건 실패+기존 2건 통과 → (ii) 구현 뒤 기존 2건 실패 원문 → 교체 → GREEN 66/66"
  t3_green: "70/70 — 예상 하한 70 과 정확히 일치 (61 − 4 + 4 + 9)"
coverage_delta:
  from: 93.75   # t9 마감 실측
  to: 91.11
  delta_pp: -2.64
  reason: "index.ts 의 자식 프로세스 전용 진입점 블록(88-108행)이 길어졌기 때문이다 — v8 커버리지는 vitest 부모 프로세스만 재므로 그 블록은 원래 관측 밖이고(거부 갈래 stderr·해석 실패 갈래는 AC-CHANAUTH-011·AC-CHANINJECT-009 가 dist 자식 프로세스로 실제 실행한다), 블록이 12행에서 21행으로 늘며 index.ts 내부 비율이 69.23% 로 내려갔다. 방어 코드의 미관측이 아니라 측정 계층의 한계다. 전체 합계는 85% 하한 위에 있다."
red_green_discipline:
  red_evidence: "전이 1(m1-red.log 3건)·2b(m2-pre/m2-post-impl.log) 원문 존재. 예외 둘은 §E.2 §2·§3 에 판정과 함께 기록 — AC-002(구조상 RED 불가), AC-007(구현이 이미 옳아 첫 실행 통과, 값은 M-K 가 증명)"
  no_skipped_tests: "grep 'it.skip|xit|.todo(' → exitCode 오탐 7건뿐, 실제 skip 0건"
lead_action_required: []   # §E.1 의 F-10(t15 카드 본문 갱신)은 plan 단계 기록 그대로 유효 — run 이 추가로 요구하지 않는다
gaps:
  - "모델이 지시문의 신뢰 경계 두 문장을 따르는지는 관측하지 못했다 — 관측 불가능하며(spec.md §5), 이 카드의 어떤 기준도 «모델이 따랐다» 를 재지 않는다"
  - "Claude Code 호스트의 봉투 처리 미확정은 그대로 인계된다 (spec.md §1.2) — 이 카드도 호스트가 없어 관측하지 못했다"
  - "AC-009 의 «(가)가 접속을 시작하지 않았다» 는 (나)의 접속 수로만 관측된다 — 해석 불가 주소에는 겨냥할 호스트가 없는 원리적 한계(acceptance.md 가 명시한 대로)"
  - "커버리지 수치는 자식 프로세스 분을 포함하지 않는다 — 분리 집계 공구를 이 카드에 들이지 않았다 (§8 사유 참조)"
residual_risk:
  - "M-K 관측에서 AC-CHANAUTH-003 의 실패 양상(소켓·프로세스 수준)은 감사 변이 C 와 동일한 «런 수준 오염» 이었으나, vitest 워커 격리 덕에 후속 기준 오염은 없었다 — 다만 그 실패 내부의 정확한 전파 경로까지는 추적하지 않았다"
  - "index.ts 88-108행(진입점)은 스위트 부모 프로세스에서 영구 관측 밖이다 — dist 자식 기준(AC-CHANAUTH-011·AC-009)이 행동을 잠그지만 커버리지로는 안 보인다"
```

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

## §F Phase 4 Mode Selection

| 항목 | 값 |
|------|-----|
| 기록 시점 | 2026-08-28 — run 진입 (카드 `t10`, 리드 재진입 신호 수령 후) |
| 티어 | M |
| scope (파일 수) | ~4 (channel-server.ts · index.ts + 테스트 3종 + 형제 SPEC 문서 개정) |
| 도메인 수 | 2 (channel 소스·테스트 + 형제 SPEC 문서) |
| 언어 혼합 | TypeScript + Markdown |
| 동시성 이득 | 낮음 — coding-heavy (Anthropic coding-task parallelism caveat) |
| Kickoff 승인 | 운영자 직접 승인 2026-08-28 (본 세션 AskUserQuestion «리드 신호대로 진행») + 리드 «운영자 키오프 승인 유지(2026-08-28)» 통지 |

| 모드 | 선택 | 근거 |
|------|------|------|
| `direct` | 미선택 | 오타·한 줄 수정이 아니다 — 3 마일스톤·15 REQ·변이 15종 |
| `serial` | **선택됨** | coding-heavy TDD — 전이 관측(RED→GREEN 5건)이 순서 의존이고 테스트 파일 단일 작성자가 필요 |
| `fanout` | 미선택 | 연구 다중 도메인 작업이 아니다 — 병렬 스폰이 전이 순서를 깬다 |
| `sweep` | 미선택 | 균일 기계 변형이 아니다 — semantic 신규 코드다 |

**Decision: serial**

근거: 이 SPEC의 핵심 증거는 다섯 전이(RED→GREEN)의 순차 관측이며(plan.md §F, AC-CHANINJECT-014), 각 마일스톤이 이전 마일스톤의 착지 위에 쌓인다. 병렬 스폰은 전이 관측 순서를 깨뜨리고 테스트 파일에 쓰기 경쟁을 만든다. Anthropic의 coding-task parallelism caveat과 §B.2 타이브레이커(coding-heavy → serial)에 따라 serial이 기본이자 올바른 선택이다.

**Plan Audit Gate skip 기록 (3조건 모두 충족)**: ① 2회차 판정 PASS(`.moai/reports/t10/plan-audit-2.md`) ② 0.86 ≥ Tier M 임계 0.80 ③ 산출물 해시 무변경 — 2회차 감사 시점(HEAD `124b0f7` + 미커밋 산출물) 이후 산출물은 커밋 `696d09d`로 착지했고 그 뒤 수정 없음(`git status --short .moai/specs/SPEC-CHANINJECT-001/` 빈 출력, 2026-08-28 직접 관측). `bbd21cd`는 증거 로그 추가뿐 산출물 무변경.
