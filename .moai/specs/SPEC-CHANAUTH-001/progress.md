# SPEC-CHANAUTH-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CHANAUTH-001` |
| 칸반 카드 | `t9` |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 근거 | `.moai/reports/t4/sync-audit.md` F-01(Critical) · F-07(Medium) |
| 재현 프로브 | `.moai/state/verify/t4-sync-audit/probe-rogue.ts` · `p6-rogue.log` |
| 워크트리 | `.claude/worktrees/t9` (브랜치 `WT-chanperm-gate`) |
| 선행 SPEC | `SPEC-CHANNEL-001` · `SPEC-CHANCLIENT-001` · `SPEC-CHANWIRE-001` · `SPEC-CHANPERM-001` (전부 카드 `t4` 에서 착지) |
| 결합 개정 | `SPEC-CHANPERM-001` v0.3.0 (REQ/AC-008) + v0.4.0 (AC-005·006·007·009, **REQ 무변경**) · `SPEC-CHANCLIENT-001` v0.4.0 (REQ-004·005 + 하네스) — 전부 같은 패스에서 완료 |
| 계획 감사 | 1차 `.moai/reports/t9/plan-audit.md` — FAIL 0.55, 차단 7건 (대장 `plan-done-2.md`). 2차 `.moai/reports/t9/plan-audit-2.md` — FAIL 0.74, 차단 7건 + optional 3건 (대장 `plan-done-3.md`). 3차 판정 예정 `.moai/reports/t9/plan-audit-3.md` — **마지막 라운드** |
| 인계 카드 | `t15` — F-01 잔여 절반(사칭 채팅 주입·이력 오염) |
| 현재 상태 | `draft` v0.3.0 — plan 단계 교정 2회차 완료, 3차(최종) 재감사 대기 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
spec_id: SPEC-CHANAUTH-001
card: t9
spec_version: 0.3.0
tier: M
artifacts: [spec.md, plan.md, acceptance.md, progress.md]
requirements: 13     # REQ-CHANAUTH-001..013
criteria: 13         # AC-CHANAUTH-001..013
plan_audit:
  round_1: { report: ".moai/reports/t9/plan-audit.md", verdict: FAIL, score: 0.55, blocking: 7 }
  round_1_response: ".moai/reports/t9/plan-done-2.md"
  round_2: { report: ".moai/reports/t9/plan-audit-2.md", verdict: FAIL, score: 0.74, blocking: 7, optional: 3 }
  round_2_response: ".moai/reports/t9/plan-done-3.md"
  round_3_expected: ".moai/reports/t9/plan-audit-3.md"   # 최종 라운드 (3/3)
coupled_revision:
  - spec: SPEC-CHANPERM-001
    version: 0.3.0
    items: [REQ-CHANPERM-008, AC-CHANPERM-008]
    reason: "발신 id 대조가 기존 무상태 계약과 정면 충돌 — 요구사항 층 개정"
  - spec: SPEC-CHANPERM-001
    version: 0.4.0
    items: [AC-CHANPERM-005, AC-CHANPERM-006, AC-CHANPERM-007, AC-CHANPERM-009]
    reason: "v0.3.0 계약 아래에서 거짓 실패하는 형제 기준 넷 — 검증 층에서만 일어난 개정이며 REQ 는 한 건도 바뀌지 않았다(그쪽 HISTORY v0.4.0, 계획 감사 C-02·N-10)"
  - spec: SPEC-CHANCLIENT-001
    version: 0.4.0
    items: [REQ-CHANCLIENT-004, REQ-CHANCLIENT-005, AC-CHANCLIENT-002, AC-CHANCLIENT-005]
    reason: "무조건 분배 의무가 REQ-CHANAUTH-001 과 정면 충돌 — 세션 확립 전제 추가 + 하네스 autoWelcome(계획 감사 C-03)"
open_questions: 0
deferred:
  - id: L-01
    item: "CHANGELOG.md:15·:41 의 개정 전 무상태 문언"
    to: sync
    reason: "구현 착지 뒤에야 참이 되는 문언이고, CHANGELOG 는 manager-docs 소유"
handoff:
  - card: t15
    scope: "F-01 잔여 절반 — 사칭 채팅 주입(message{delivery:'to'})과 이력 오염(history_response)"
    reason: "welcome 은 토큰 지식의 증거가 아니므로 hello 에 답할 수 있는 상대에게는 ①이 방어가 되지 않는다 (spec.md §2.1·§5)"
```

**`open_questions` 를 실제 값으로 다시 셌다 (계획 감사 H-02).** v0.1.0 도 `0` 을 적었으나 그때는 **사실이 아니었다** — AC-002 의 최종 형태, AC-003 의 양성 갈래, AC-010 판정표의 행 추가, AC-CHANPERM-009 처리, 넷이 열려 있었다. v0.2.0 이 그 넷을 **전부 계획 단계에서 확정했으므로** 이제 `0` 이 참이다. 확정 위치: AC-002 왕복 형태(`acceptance.md`), AC-003 (나) 갈래(같은 문서), AC-010 9행 표(같은 문서), AC-CHANPERM-005·006·007·009 개정(`SPEC-CHANPERM-001` v0.4.0).

**계약 질문 해소 기록.** 카드 `t4` 가 "무상태를 지킬 것인가, 발신 id 를 기억할 것인가"를 열린 채 넘겼고(`SPEC-CHANPERM-001` v0.2.2 §4.3), 이 카드가 **후자로 답했다**. 근거와 개정 경계는 `plan.md` §B, 상태를 둘 자리의 근거는 §C 에 있다.

**이 카드가 닫지 않는 것 (성과 서술의 경계).** F-01 은 **절반만** 닫힌다. 승인 판정 주입은 §4.2·§4.3 이 닫고, **사칭 채팅 주입과 이력 오염은 13개 요구사항을 전부 구현한 뒤에도 열려 있으며 카드 `t15` 가 소유한다**(`spec.md` §5). run·sync 단계의 어떤 보고도 이 카드를 "F-01 을 닫았다"로 적어서는 안 된다.

**run 단계가 먼저 확인할 것.** M1 단계 0-3 — 현재 트리에서 F-01 이 여전히 재현되는지. 재현되지 않으면 그 사실이 먼저 설명되어야 한다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
