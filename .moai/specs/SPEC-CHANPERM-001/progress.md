# SPEC-CHANPERM-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CHANPERM-001` |
| 칸반 카드 | `t4` (마일스톤 M4) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 14 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B, 7장 |
| 워크트리 | `.claude/worktrees/t4` |
| 선행 SPEC | `SPEC-CHANNEL-001` → `SPEC-CHANCLIENT-001` → `SPEC-CHANWIRE-001` (+ 서버 쪽 `SPEC-PERM-001` 계약 소비) |
| 실행 순서 | 카드 `t4` 의 SPEC 중 **마지막** |
| 현재 상태 | `draft` — plan 단계 산출물 작성 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-CHANPERM-001
tier: M
card: t4
depends_on: [SPEC-CHANNEL-001, SPEC-CHANCLIENT-001, SPEC-CHANWIRE-001, SPEC-PERM-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 14)
source_spec: .moai/plan/2026-08-26-minidiscord/spec-v2.md (4-B, 7장)
spec_version: "0.2.1"
req_count: 10
ac_count: 12
tier_budget: "16 REQ / 16 AC"
spec_base_sha: "<pending run-phase M1 step 0>"
plan_audit: .moai/reports/t4/plan-audit.md
plan_audit_verdict: "CONDITIONAL PASS (채널 SPEC 4종 일괄) — 이 SPEC 몫 주요 3건(M2·M3·M4) 반영 완료, 부기(SDK capability 위험)도 plan.md §E·§F M1 에 등록"
cross_spec_dependency: "spec.md §3.1 가정-2(전역 키 충돌로 인한 대기 항목 유실)·가정-3(등록 원본키/조회 소문자키 불일치로 판정 미전송) — SPEC-PERM-001 / 카드 t7 소유. 이 SPEC 에서 고치지도 보상하지도 않는다"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

## §E.2 Run-phase Evidence

_&lt;pending run-phase&gt;_

## §E.3 Run-phase Audit-Ready Signal

_&lt;pending run-phase&gt;_

## §E.4 Sync-phase Audit-Ready Signal

_&lt;pending sync-phase&gt;_
