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

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
