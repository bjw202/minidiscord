# SPEC-CI-001 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t27` (N4 — CI 테스트 배선, P2 소형).
- 나무: `.claude/worktrees/t27`, 브랜치 `WT-ci-test-wiring`, 기준 `main @2a19d7d`.
- 계획 단계 산출물: `spec.md` · `plan.md` · `acceptance.md` · 이 파일. Tier **M** (3파일 집합) — 도출과 감사관 이견은 `plan.md` §0.
- 요구사항 **12건** (REQ-CI-001 ~ 012) · 수용 기준 **10건** (AC-CI-001 ~ 010). Tier M 상한 16/16 이내, **Tier S 상한 8/8 은 양쪽 다 초과**.
- 실측 원문: `.moai/state/verify/t27-plan/` (npm-ci · build · test-no-build · test-with-build · typecheck×2 · flake×3).
- **미결 3건**: `plan.md` §D 의 OD-1(typecheck 편입) · OD-2(Node 버전 저장소 커밋) · **OD-3(`channel` `pretest` — 카드 `t22` F6 이월)**. **리드 결정 전 run 진입 금지** (AC-CI-009, 현재 `0`).
- **이월 출처**: `.moai/reports/t22/sync-audit.md:207`(F6) · `.moai/reports/t22/sync-done.md:70`(리드 인계 4번).
- **형제 제약 공시**: `SPEC-E2E-001` AC-E2E-011(미병합 `WT-e2e-persist-readme` 브랜치, `acceptance.md:143-152`) — OD-3 (b) 는 문언은 만족하고 취지에 압력을 준다. `plan.md` §D 형제 카드 제약 절 참조.
- **증거 추적**: `.moai/state/verify/t27-plan/` 을 이 개정에서 커밋해 SPEC 이 인용하는 경로가 병합 후에도 풀린다.

### §E.1.1 1회차 계획 감사 대응 (FAIL 0.761 → 개정 v0.3.0)

- 보고서: `.moai/reports/t27/plan-audit.md` (대상 트리 HEAD `f0124e6`). 차원 Clarity 0.80 · Completeness 0.85 · **Testability 0.62** · Traceability 0.82.
- **[HARD] 0.761 은 이 개정 이전 트리의 값이며 재채점이 따르지 않는다.** Tier M 통과선 0.80 미달, Tier S 통과선 0.75 는 상회 — 이 산술은 Tier 선택의 근거가 **아니다**(`plan.md` §0.3).
- 차단 7건(D1~D7) 전건 대응. 비차단 O2·O3·O4·O5·O6·O7·O8·O11 반영, O1 은 이견과 함께 도출 명시(`plan.md` §0.4), O9·O10·O12 는 사유를 적고 보류.
- 요구 10 → **12** (REQ-CI-010 의 ①②③ 분해), 수용 기준 9 → **10** (AC-CI-010 신설).

#### D1 적대적 재탐침 — 새 AC-CI-009 형태의 실행 확인

감사관이 v0.2.0 을 무너뜨린 것과 **같은 공격**을 새 형태에 가했다. 원문 출력:

```
# 대조 — 같은 미끼 파일에 v0.2.0 의 옛 형태
$ sed -n '/^## D\./,/^## E\./p' probe.md | grep '^결정됨:' | grep -v '(대기)' | wc -l
3            ← 거짓 통과 (OD 셋이 전부 (대기) 인데도)

# 공격 1 — 형제 제약 절(§D-1)에 미끼 3줄
$ python3 <새 AC-CI-009 명령> probe.md
전체 결정됨: 줄 수 = 6 (미끼 3 + 진짜 3)
### OD-1 … -> (대기)
### OD-2 … -> (대기)
### OD-3 … -> (대기)
CLOSED 0     ← 미끼를 세지 않는다

# 공격 2 — OD 절 *안에* 미끼
AssertionError -> ('각 OD 절에 결정됨: 은 정확히 1줄', '### OD-1 …', ['결정됨: (a) 절 안의 미끼', '결정됨: (대기)'])

# 공격 3 — (대기) 만 지우고 값을 안 적음
CLOSED 0     ← 빈 값을 닫힘으로 세지 않는다

# 실제 문서 (미끼 없음)
CLOSED 0     ← 세 결정 전부 미결, 기대대로
```

세 공격 모두 막혔고, 옛 형태와의 대조가 **같은 입력에서 3 vs 0** 으로 갈린다.

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
