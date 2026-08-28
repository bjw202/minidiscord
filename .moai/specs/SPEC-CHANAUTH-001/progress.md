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
| 결합 개정 | `SPEC-CHANPERM-001` v0.3.0 — REQ/AC-CHANPERM-008 (같은 패스에서 완료) |
| 현재 상태 | `draft` — plan 단계 완료, run 단계 대기 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
spec_id: SPEC-CHANAUTH-001
card: t9
tier: M
artifacts: [spec.md, plan.md, acceptance.md, progress.md]
requirements: 13     # REQ-CHANAUTH-001..013
criteria: 13         # AC-CHANAUTH-001..013
coupled_revision:
  spec: SPEC-CHANPERM-001
  version: 0.3.0
  items: [REQ-CHANPERM-008, AC-CHANPERM-008]
  reason: "감사 F-01 이 요구한 발신 id 대조가 기존 무상태 계약과 충돌 — 카드 t4 가 열어 둔 계약 질문을 이 카드가 답함"
open_questions: 0
```

**계약 질문 해소 기록.** 카드 `t4` 가 "무상태를 지킬 것인가, 발신 id 를 기억할 것인가"를 열린 채 넘겼고(`SPEC-CHANPERM-001` v0.2.2 §4.3), 이 카드가 **후자로 답했다**. 근거와 개정 경계는 `plan.md` §B, 상태를 둘 자리의 근거는 §C 에 있다.

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
