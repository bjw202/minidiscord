# SPEC-ROOMAUTHZ-001 진행 기록

칸반 카드 `t11` / 워크트리 `.claude/worktrees/t11` / 브랜치 `WT-room-authz`

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-29
tier: M
requirements: 16      # REQ-ROOMAUTHZ-001..016 (Tier M 상한 16 이내)
acceptance_criteria: 16   # AC-ROOMAUTHZ-001..016 (Tier M 상한 16 이내)
artifacts: [spec.md, plan.md, acceptance.md, progress.md]
open_questions: 0     # 설계 결정 3건은 운영자가 확정 (spec.md §3)
```

**플랜 단계에서 확정된 것**

- 발단: `.moai/reports/t4/sync-audit.md` §F-14 (High, out-of-diff). 코드베이스에 방 멤버십 개념이 없어 계정 하나로 남의 방 도구 승인을 대신 누를 수 있다.
- 운영자 결정 3건(획득 방식 · 게이트 범위 · 기존 데이터)은 `spec.md` §3 에 기각안과 함께 부호화했다. 재검토 대상이 아니다.
- `spec-v2.md:32` 의 "방별 접근 권한은 없음 — YAGNI" 판단을 뒤집으며, 원문을 지우지 않고 주석으로 뒤집는다.
- 형제 문서 19개 자리의 진술이 거짓이 된다 (`spec.md` §6 표). 전제가 무효화되는 수용 기준 둘(AC-MSG-012 · AC-PERM-009)은 이름을 불러 기록했다.
- 기존 테스트 34개가 깨질 것으로 열거했다 (`plan.md` §D, grep 근거 포함). run 단계는 이 목록 밖의 실패만 결함으로 본다.

**플랜 단계에서 관측하지 못한 것 (미검증)**

- 34개 목록은 소스 읽기와 grep 으로 만든 것이며, **실제로 테스트를 돌려 확인하지 않았다.** M4 단계 1이 실제 실패 목록을 받아 대조한다.
- 백필·`ALTER TABLE` 동작은 SQLite 문서와 현재 `db.ts` 구조를 근거로 설계했으며, 실행해 보지 않았다.

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
