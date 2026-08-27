# SPEC-CHANWIRE-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CHANWIRE-001` |
| 칸반 카드 | `t4` (마일스톤 M4) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 13 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B |
| 워크트리 | `.claude/worktrees/t4` |
| 선행 SPEC | `SPEC-CHANNEL-001` → `SPEC-CHANCLIENT-001` → (이 SPEC) |
| 후행 SPEC | `SPEC-CHANPERM-001` (이 SPEC 의 `wire()` 를 확장) |
| 요구사항 / 수용 기준 | 13 / 14 |

---

## §E.1 Plan-phase Audit-Ready Signal

| 항목 | 값 |
|------|-----|
| 작성 단계 | plan (manager-spec) |
| 산출물 | `spec.md`, `plan.md`, `acceptance.md`, `progress.md` |
| SPEC ID 정규식 검사 | `PASS` (`[[ "SPEC-CHANWIRE-001" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` 실행 결과) |
| 원본 모순 | 7건 기록 (`plan.md` §D 1..7), 그중 1건(토큰 없는 실행의 진단 문구)은 리드 판정 대기 |
| plan-audit 교정 | `.moai/reports/t4/plan-audit.md` 의 B1·M1·M6 (차단급 1 + 주요 2) + 사소 m2·m4·m5 를 v0.2.0 에서 닫음 |
| 계약 개정 | REQ-CHANWIRE-003·004 — stdio 연결은 토큰과 무관, 토큰은 게이트웨이 접속만 잠근다 (`plan.md` §D 3) |
| REQ↔AC 매핑표 | run 단계 진입 시 이 절에 표로 남긴다 |

_<run 단계 진입 전까지 이 절은 위 표로 충분하다. REQ↔AC 매핑표는 run 단계 시작 시 채운다.>_

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
