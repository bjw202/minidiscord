# SPEC-CORE-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CORE-001` |
| 칸반 카드 | `t1` (마일스톤 M1) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan.md` Task 1-2 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec.md` 5장 (데이터 모델) |
| 워크트리 | `.claude/worktrees/t1` (브랜치 `WT-scaffold-db-schema`) |
| 현재 상태 | `draft` — plan 단계 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-CORE-001
tier: M
card: t1
source_plan: .moai/plan/2026-08-26-minidiscord/plan.md (Task 1-2)
```

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-CORE-001/spec.md` | GEARS 요구사항 15개 (REQ-CORE-001..015), 범위 밖 7개 항목, 제약, HISTORY |
| `.moai/specs/SPEC-CORE-001/plan.md` | 되돌리기 어려운 결정(데이터 모델 / 타입 계약) 우선 배치, 마일스톤 M1-M2, 위험 4건, 안티패턴 5건 |
| `.moai/specs/SPEC-CORE-001/acceptance.md` | 수용 기준 14개 (AC-CORE-001..014), Given-When-Then 시나리오, 엣지 케이스, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-CORE-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-CORE-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### 이 단계에서 하지 않은 것 (Gaps)

- 코드는 한 줄도 작성하지 않았다. `server/src/*`, 루트 `package.json`, `.gitignore` 모두 미생성 — run 단계 소관이다.
- 의존성 설치를 시도하지 않았으므로 `better-sqlite3` 네이티브 빌드 가능 여부는 **미검증**이다 (plan.md §D 위험 1번).
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. 전부 run 단계에서 처음 실행된다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
