# SPEC-CI-001 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t27` (N4 — CI 테스트 배선, P2 소형).
- 나무: `.claude/worktrees/t27`, 브랜치 `WT-ci-test-wiring`, 기준 `main @2a19d7d`.
- 계획 단계 산출물: `spec.md` · `plan.md` · `acceptance.md` · 이 파일. Tier **M** (3파일 집합) — 도출과 감사관 이견은 `plan.md` §0.
- 요구사항 **12건** (REQ-CI-001 ~ 012) · 수용 기준 **11건** (AC-CI-001 ~ 011). **계획 감사 3회차 PASS 0.838 — 귀속은 커밋 `073bc22` 트리(§E.1.3).** Tier M 상한 16/16 이내, **Tier S 상한 8/8 은 양쪽 다 초과** — 줄여서 S 로 남는 셋째 길의 검토는 `plan.md` §0.2.1.
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

### §E.1.2 2회차 계획 감사 대응 (FAIL 0.788 → 개정 v0.4.0)

- 보고서: `.moai/reports/t27/plan-audit-2.md` (대상 트리 HEAD `91487dc`). Clarity 0.78 · Completeness 0.84 · Testability 0.74 · Traceability 0.80.
- **[HARD] 0.788 은 이 개정 이전 트리의 값이며 재채점이 따르지 않는다.** 통과선 0.80 에 **0.012 미달 — 얇은 실패**. 궤적 0.761 → 0.788(+0.027).
- **1회차 차단 7건 전건 CLOSED** 판정. **감사관이 1회차 O1(Tier S)을 스스로 철회** — `:152` vs `:154` 논증에 반론 둘을 시도했으나 깨지 못했다고 적었다. **Tier M · 통과선 0.80 확정.**
- 차단 4건(R2-1~R2-4) 전건 대응. 비차단 R2-5·6·7·8·9·10 반영, **R2-11 보류**(사유 `plan.md` §G-2).
- 수용 기준 10 → **11** (AC-CI-011 신설). 요구 12 변동 없음.

#### R2-1 — 감사관의 가설을 측정으로 승격

감사관은 `moai gate` 가 JS 스위트를 돌린다는 고리를 **가설로 표시**했다. 이 개정에서 직접 쟀다.

```
$ moai gate                      (깨끗한 나무)          → exit=0        [moai-gate.log]
$ moai gate                      (실패 테스트 1건 존재)  → exit=1        [moai-gate-probe.log]
  quality gate failed: npm test
   FAIL  test/zz-gate-probe.test.ts > gate-probe > probe: 의도적 실패
  AssertionError: expected 1 to be 2
```

탐침 파일 `server/test/zz-gate-probe.test.ts` 는 측정 직후 삭제했다(`git status` 로 확인). 훅 자체도 직접 읽었다 — `$(git rev-parse --git-common-dir)/hooks/pre-commit`, 3245 bytes, `moai` 는 `/Users/byunjungwon/.local/bin/moai` 에 있어 훅의 조건이 성립한다. **AC-CI-006 의 커밋은 실제로 거부된다**가 이제 관측이다.

#### R2-5·R2-6·R2-7 — 적대적 재탐침 (2회차에 뚫렸던 것 포함)

```
탐침 E (펜스 안 미끼 + 진짜 줄 삭제)
  2회차: CLOSED 1           ← 뚫림
  이번:  AssertionError: ('각 OD 절에 결정됨: 은 정확히 1줄', '### OD-3 …', [])

탐침 F (펜스 안 '#' 셸 주석)
  2회차: AssertionError     ← 정당한 편집이 장치를 깨뜨림
  이번:  CLOSED 0           ← 취약성 해소

탐침 G (근거가 한 글자: "결정됨: (a) —")
  2회차: CLOSED 3           ← 한 글자를 근거로 셈
  이번:  CLOSED 0           ← 최소 길이 10자 단언

실제 문서: CLOSED 0 (세 결정 전부 미결, 기대대로)
```

#### R2-4 — 파급표 완전성 검사 (AC-CI-011) 실행

```
$ python3 <AC-CI-011 명령>
declared: {1: 5, 2: 5, 3: 7}
actual  : {1: 5, 2: 5, 3: 7}
FALLOUT TABLE COMPLETE
```

#### R2-3 — 어간 재훑기

9종 어간으로 훑어 **지목된 9자리 + 재훑기가 스스로 찾은 10자리**를 고쳤다. 적중표는 `plan.md` §G-3, 스크립트는 `.moai/state/verify/t27-plan/sweep.py`. 마감 훑기의 잔여 적중은 전부 HISTORY(그때 참·보존) 또는 현재 정합값이다.

### §E.1.3 3회차 계획 감사 — PASS 0.838 과 그 귀속

**[HARD] 0.838 은 커밋 `073bc22`(v0.4.0) 트리의 값이다.** 감사관이 읽은 트리가 그것이고, 그 뒤의 **진입 전 정리 커밋(v0.5.0)은 재채점되지 않았다.** 그러므로 **0.838 을 정리 이후 트리의 점수로 제시해서는 안 된다** — 아무도 그 트리를 채점하지 않았다. 정리가 점수를 올렸는지 내렸는지도 측정이 없어 모른다. 재채점을 원하면 4회차가 필요하며 이 카드는 그것을 요구하지 않는다. (같은 형태의 선례: 카드 `t22` 의 「0.86 은 수정 전 트리 값」·「PASS 0.854 는 F-11 공시 이전 트리 값」.)

- 보고서: `.moai/reports/t27/plan-audit-3.md`. Clarity 0.85 · Completeness 0.88 · Testability 0.78 · Traceability 0.85 · 종합 **0.838** ≥ 통과선 0.80.
- 궤적 **0.761 → 0.788 → 0.838**, 단조 개선. 2회차 findings 10건 전건 CLOSED 또는 수용.
- 감사관이 **자기 2회차 주장 하나를 철회**했다 — §C 사전 점검은 결정에 종속되지 않는다(결정의 *수*는 변하지 않는다). 종속 장치에서 §C 를 뺀 판단이 옳았음이 확인됐다.

#### 이 PASS 가 열지 **않는** 것 (run 레인이 오독하지 않도록)

1. **원격 절반은 미관측이다.** AC-CI-005·006·007·010 은 원격 실행이 있어야 판정된다. 이 통과는 **계획의 품질**에 대한 것이지 「CI 가 실제로 붉어질 수 있다」는 관측이 아니다.
2. **세 결정이 전부 미결이다.** AC-CI-009 는 `CLOSED 0` 이고 `plan.md` §D 의 [HARD] 「결정이 닫히기 전에는 run 진입 금지」는 살아 있다. **이 PASS 는 그 게이트를 열지 않는다.**
3. **흔들림 실패율은 미측정이다.** 「과거 2회 실패」는 카드 `t6` 의 인계 기록이며 우리의 관측이 아니다 — 세 회차 어느 감사도 `t6/run-done.md` 를 열지 않았다.

#### 진입 전 정리 5건의 실행 확인

```
R3-1  AC-CI-011 의 명령을 이름에 맞게 넓힘 → 감사관의 세 공격 재실행:
      epsilon (표 삭제)       exit=1 CAUGHT  AssertionError: §D-2 파급표 절이 없다
      zeta    (셀 비움)       exit=1 CAUGHT  AssertionError: ('(b)/(c) 행의 「그 밖의 자리」 셀이 비었다', …)
      alpha   (미끼+선언상향)  exit=1 CAUGHT  AssertionError: ('선언 != 자리 목록', {1: 6, …}, {1: 5, …})
      baseline                        FALLOUT TABLE COMPLETE

R3-2  set -euo pipefail 추가 → 단언이 차단으로 바뀜 (직접 재현):
      $ bash d1.sh   →  AssertionError: (1, 2)  /  block exit=1   ("SHOULD NOT PRINT" 미출력)
      함정 하나를 함께 고쳤다 — `grep -c` 는 적중 0 에 종료 코드 1 을 내므로
      set -e 아래에서 「제거 확인」 줄이 블록을 죽인다(재현 확인). `! grep -q` 로 뒤집었다.

R3-3  §G-3 의 재현 불가능한 「1차 적중」 열 삭제 + 자기제외 적용 후 재측정
      (명령·측정 시점·자기제외 구간을 표 머리에 명기)

R3-4  `§7` dangling 수정 + sweep.py 에 절 번호 참조 어간(J) 추가 → 실재 검사로 구현
      $ python3 sweep.py --refs   →   존재하지 않는 절 참조: 0
      (그 새 검사가 감사관 지목 1건 외에 `§0-1` · `§F0` · `§6-1` 셋을 더 찾았다)

R3-5  AC-CI-011 을 M1 산출에 배정
```

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
