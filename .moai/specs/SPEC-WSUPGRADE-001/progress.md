# SPEC-WSUPGRADE-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-09-04
spec_version: "0.5.0"
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
  - iteration: 4
    kind: post-audit-amendment      # 감사 회차 아님 — 기준 실측에 따른 범위 재작도
    verdict: n/a                    # 4회차 감사를 돌리지 않았다 (미실시, 통과 아님)
    trigger: "AC-WSUPGRADE-008 이 변이 없는 깨끗한 트리에서 빨감 — 토큰 없는 적중 1건 .moai/reports/t39/plan-audit.md:236 (566b87a 시점 기존)"
    change: "AC-008 범위를 부류로 재작도 — 감사 보고서 부류 plan-audit*.md 제외 / .moai/reports/t39/ 통째 제외는 거부(변이 C 실측)"
    sibling_rederivation: 4         # 「면제 0건」 → 「범위 안 줄 단위 면제 0건」 (spec.md §2.1 · REQ-011 · acceptance.md AC-008 · plan.md DoD)
    scope_note: "REQ-011 「모든 줄」에 §2.1 정의역을 붙임 — 한 조항보다 한 걸음 넓은 의도적 확장(리드 승인 2026-09-05)"
    residual: "제외 경계가 파일명 패턴 — 다른 이름의 감사 문서는 범위 안에 남아 기준을 다시 빨갛게 만든다(의도된 시끄러운 실패)"
    branches_unchanged: [H-1, H-2, H-3]
    commits: [4218429]              # 본문 변경 커밋. 이 §E.1 항목·version·HISTORY 를 담은 기록 마감 커밋이 뒤따른다
    repaired_in: "spec.md/plan.md/acceptance.md v0.5.0 (기록 마감: version·HISTORY·progress §E.1)"
```

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
