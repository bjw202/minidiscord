# SPEC-CI-001 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t27` (N4 — CI 테스트 배선, P2 소형).
- 나무: `.claude/worktrees/t27`, 브랜치 `WT-ci-test-wiring`, 기준 `main @2a19d7d`.
- 계획 단계 산출물: `spec.md` · `plan.md` · `acceptance.md` · 이 파일. Tier **M** (3파일 집합).
- 요구사항 **10건** (REQ-CI-001 ~ 010) · 수용 기준 **9건** (AC-CI-001 ~ 009). Tier M 상한 16/16 이내.
- 실측 원문: `.moai/state/verify/t27-plan/` (npm-ci · build · test-no-build · test-with-build · typecheck×2 · flake×3).
- **미결 2건**: `plan.md` §D 의 OD-1(typecheck 편입 여부) · OD-2(Node 버전 저장소 커밋 여부). **리드 결정 전 run 진입 금지** (AC-CI-009).

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
