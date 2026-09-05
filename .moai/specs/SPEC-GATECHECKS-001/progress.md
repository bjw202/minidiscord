# SPEC-GATECHECKS-001 — 진행 기록

- 카드: **t40** — 조용한 초록을 잡는다
- 나무: `.claude/worktrees/t40` · 브랜치 `WT-quiet-green` · base `0775b4e`
- 근거: `.moai/reports/t40/reproduction.md` @`05fef76`

## §E.1 Plan-phase Audit-Ready Signal

**상태: plan 산출물 작성 완료 (`status: draft`).**

| 항목 | 값 |
|---|---|
| Tier | M (spec.md · plan.md · acceptance.md · progress.md) |
| REQ | 9 (REQ-GATECHECKS-001 ~ REQ-GATECHECKS-009) |
| AC | 9 (AC-GATECHECKS-001 ~ AC-GATECHECKS-009) |
| 변별 변이를 진 기준 | **AC-GATECHECKS-001** (역변이 필수) |
| 미결 결정 | **없음** — OD-1=(a) · OD-2=(a) 로 리드 처분 7 종결(2026-09-05). 남은 미결은 §run 이월 셋(귀속 보강 · AC-GATECHECKS-001 정방향 · AC-GATECHECKS-003 확정) |
| 코드 편집 예정 | `server/package.json` **1줄** |
| 범위 밖 | B(`.git_hooks` 래퍼) · 게이트 종료 코드 → 카드 t41 |

**계획 단계에 직접 측정한 것:**

- `server` 에 `pretest` 부재 · `channel` 에 존재 — `grep -c '"pretest"'` 로 확인
- `.github/workflows/ci.yml:27` 이 `npm run typecheck -w server` 를 돈다 — grep 확인
- `server/tsconfig.json` 이 `outDir: "dist"` · `include: ["src","test"]` — 인자 없는 `tsc` 가 시험까지 emit 함의 근거 (OD-1 (c) 배제 근거)
- **npm 워크스페이스가 `pretest` 실패를 종료 코드로 옮긴다** — 장난감 워크스페이스 실측 RC=1, 실패 워크스페이스의 `test` 는 건너뛰고 다른 워크스페이스는 계속 돈다 (`plan.md` §B)
- `SPEC-PERMROUTE-001` 의 `[HARD]` 경고 세 자리 존재 + `git merge-base --is-ancestor c3d1d09 83c3078` → YES

**계획 단계에서 닫지 않은 것:** `spec.md` §5 의 열린 위험 2건 + 미검증 4건. **닫혔다고 주장하지 않는다.**

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
