# SPEC-WSUPGRADE-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-09-04
spec_version: "0.4.0"
tier: M
requirements: 11
acceptance_criteria: 12
criteria_with_mutation: 12
open_decisions: []            # A-1=(a) wsConnect 한 곳 / A-2=(a) 개발 기계 — 리드 처분 2026-09-04, plan.md §A
spec_kind: investigation   # 규명 카드 — 수리 설계 없음
audit_rounds:
  - iteration: 1
    verdict: FAIL
    score: 0.58
    threshold: 0.80
    report: .moai/reports/t39/plan-audit.md
    must_pass_violations: 0
    repaired_in: "spec.md/plan.md/acceptance.md v0.2.0 (D1~D10 + P2)"
  - iteration: 2
    verdict: FAIL
    score: 0.761
    threshold: 0.80
    report: .moai/reports/t39/plan-audit-2.md
    must_pass_violations: 0
    closed_from_round_1: 7          # D1~D10 중 D3·D4·D6·D7·D8·D9·D10 종결 / D1·D2·D5 부분 종결
    partially_closed_from_round_1: 3
    regressions_from_round_1: 0
    repaired_in: "spec.md/plan.md/acceptance.md v0.3.0 (N1~N6)"
    new_evidence: .moai/reports/t39/probe-upgrade-window.{mjs,log}
  - iteration: 3
    verdict: PASS
    score: 0.84
    threshold: 0.80
    report: .moai/reports/t39/plan-audit-3.md
    must_pass_violations: 0
    closed_from_round_2: 6          # N1~N6 전건 종결
    regressions: 0
    repaired_in: "spec.md/plan.md/acceptance.md v0.4.0 (D1 ㉮ 창별 분리 · D2 포획 창 정의 · 충돌 탐지 조항 · §A 미결 2건 결정화)"
```

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
