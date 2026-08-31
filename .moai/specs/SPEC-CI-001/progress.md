# SPEC-CI-001 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t27` (N4 — CI 테스트 배선, P2 소형).
- 나무: `.claude/worktrees/t27`, 브랜치 `WT-ci-test-wiring`, 기준 `main @2a19d7d`.
- 계획 단계 산출물: `spec.md` · `plan.md` · `acceptance.md` · 이 파일. Tier **M** (3파일 집합) — 도출과 감사관 이견은 `plan.md` §0.
- 요구사항 **13건** (REQ-CI-001 ~ 013, 004·005 는 004′·005′ 로 교체됨) · 수용 기준 **12건** (AC-CI-001 ~ 012). v0.5.0 까지는 12건·11건이었고, **리드 결정 OD-1 = (b) 가 각각 하나씩 더했다**(§E.1.4). **계획 감사 3회차 PASS 0.838 — 귀속은 커밋 `073bc22` 트리(§E.1.3).** Tier M 상한 16/16 이내, **Tier S 상한 8/8 은 양쪽 다 초과** — 줄여서 S 로 남는 셋째 길의 검토는 `plan.md` §0.2.1.
- 실측 원문: `.moai/state/verify/t27-plan/` (npm-ci · build · test-no-build · test-with-build · typecheck×2 · flake×3).
- **미결 3건 → 전부 닫힘 (v0.6.0)**: `plan.md` §D 의 OD-1(typecheck 편입) = **(b)** · OD-2(Node 버전 저장소 커밋) = **(b)** · **OD-3(`channel` `pretest` — 카드 `t22` F6 이월) = (b)**. AC-CI-009 는 이제 **`CLOSED 3`** 을 낸다(§E.1.4). **「리드 결정 전 run 진입 금지」 조건은 해소됐다.**
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
2. **세 결정이 전부 미결이다** (3회차 감사 시점의 상태). AC-CI-009 는 `CLOSED 0` 이고 `plan.md` §D 의 [HARD] 「결정이 닫히기 전에는 run 진입 금지」는 살아 있다. **이 PASS 는 그 게이트를 열지 않는다.** → **v0.6.0 에서 리드 결정이 그 게이트를 열었다(§E.1.4). 연 것은 감사 PASS 가 아니라 리드다.**
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

### §E.1.4 리드 결정 종결 (v0.6.0) — 무엇이 정해졌고 무엇이 함께 움직였나

**리드 결정: OD-1 = (b) · OD-2 = (b) · OD-3 = (b).** 근거는 `plan.md` §D 의 각 `결정됨:` 줄에 있다. 이 개정 커밋 **하나**가 결정 세 줄과 §D-2.1 이 선언한 **종속 17자리**(OD-1 5 · OD-2 5 · OD-3 7)를 함께 고쳤다.

| 결정 | 값 | 이 커밋이 함께 움직인 것 |
|---|---|---|
| OD-1 | (b) typecheck 편입 | `spec.md` §3.4 **REQ-CI-013 신설** · `acceptance.md` **AC-CI-012 신설** · AC-CI-002 순서 단언 확대 · DoD 1 **열한 건 → 열두 건** · `plan.md` §E 「단계 순서」 행 · §F M5 기준 개수 줄 |
| OD-2 | (b) `.nvmrc` | REQ-CI-008 의 「하나의 출처」 확정(문언 교체 불필요) · **AC-CI-004 를 `node-version-file == '.nvmrc'` 로 좁힘** · DoD 4 에 `.nvmrc` · `plan.md` §E 「Node」 행 · §F M5 변경 파일 줄 |
| OD-3 | (b) `channel` `pretest` | `spec.md` §3.2 **REQ-CI-004·005 → 004′·005′ 교체** · §5 배제 충돌 공시를 **닫힌 기록**으로 재작성 · **AC-CI-002 재작성** · **AC-CI-007 변이 대상을 `pretest` 로 이전** · DoD 4 에 `channel/package.json` · `plan.md` §E 「단계 순서」 행 · §F M5 변경 파일 줄 |

**두 검사의 재실행 출력 (이 트리에서 직접 실행):**

```
$ python3 <AC-CI-009 명령>
### OD-1 — `npm run typecheck` 를 워크플로에 넣 -> (b) — 리드 결정. 두 워크스페이스가 지금 초록으로 실측됐으므로(위 관측) 즉시 붉어지
### OD-2 — 고정한 Node 버전을 저장소에도 커밋하는가? -> (b) — 리드 결정. `.nvmrc` 를 추가하고 워크플로가 `node-version-f
### OD-3 — `channel/package.json` 에 `pre -> (b) — 리드 결정. `channel/package.json` 에 `"pretest":
CLOSED 3

$ python3 <AC-CI-011 명령>
declared: {1: 5, 2: 5, 3: 7}
markers : {1: 5, 2: 5, 3: 7}
listed  : {1: 5, 2: 5, 3: 7}
D-2 (b)/(c) rows with non-empty last cell: 5
FALLOUT TABLE COMPLETE
```

**[HARD] 이 개정에서 철회한 주장 하나를 명시한다.** v0.5.0 의 `acceptance.md` 는 「**AC-CI-007 은 게이트를 우회하지 않는다** — 그 파괴 커밋은 `ci.yml` 만 담아 로컬 스위트가 초록이고 게이트를 통과한다」고 단정했다. OD-3 = (b) 로 **AC-CI-007 의 변이 대상이 `channel/package.json` 으로 옮겨지면서 그 전제가 사라졌다.** 게이트 통과 여부는 그 시점 `channel/dist` 의 존재에 달렸고 **우리는 그것을 관측하지 않았다** — 그러므로 어느 쪽도 주장하지 않고, 기준의 명령열이 **실제로 관측해 `ac007-gate.txt` 에 적게** 했다. 「정정이 스스로 낡은 기록을 남긴다」의 방어이자, 「부재를 통과로 읽지 않는다」의 적용이다.

**[HARD] 마커 5/5/7 과 선언은 그대로 두었다.** 결정이 닫힌 뒤 이 장치는 **앞을 보는 예고**에서 **뒤를 보는 감사 흔적**으로 성격이 바뀐다(사유 `plan.md` §D-2.1). 결정의 *결과로* 새로 생긴 자리(REQ-CI-013 · AC-CI-012)에는 마커를 **심지 않았다** — 심으면 선언과 어긋나 AC-CI-011 이 붉어지고, 그것들은 「닫히기를 기다리는 종속」이 아니라 이미 닫힌 결정의 산물이기 때문이다.

**[HARD] 이 개정도 재채점되지 않았다.** 감사 3회차 PASS 0.838 은 커밋 `073bc22` 트리의 값이며(§E.1.3), v0.5.0 정리 커밋도 v0.6.0 결정 종결 커밋도 채점된 적이 없다. **0.838 을 이 트리의 점수로 제시해서는 안 된다.**

## §E.2 Run-phase Evidence

### AC-CI-006 — 테스트가 깨지면 결론이 `failure` 다 (변별 · M4, 2026-08-31)

`acceptance.md` §C AC-CI-006 명령열을 그대로 이행했다. 나무 `.claude/worktrees/t27` · 브랜치 `WT-ci-test-wiring` · 진입 head `eb68257` (AC-CI-005·010 이 관측된 그 SHA).

**1) 파괴 커밋** — `server/test/zz-scratch-fail.test.ts` 하나만 경로 명시로 스테이징했다(`git add server/test/zz-scratch-fail.test.ts` — `-a` 미사용, `git diff --cached --name-only` 로 스테이지 집합 1파일 확인).

- **[HARD] 게이트 우회 공시**: 이 한 커밋에서만 `SKIP_MOAI_PRECOMMIT=1` 을 사용했다. pre-commit 훅의 heavy gate(`moai gate`)가 방금 만든 실패 테스트를 붉게 만들어 커밋이 거부되기 때문이며, 붉음이 측정 대상 자체라 게이트를 통과시키면 잴 것이 사라진다. 이유는 커밋 메시지 본문에도 적었다. 훅 출력 원문: `[pre-commit] SKIP_MOAI_PRECOMMIT=1 -- bypass requested`.
- 커밋 결과 원문:
  ```
  [WT-ci-test-wiring b6ec899] scratch: CI 변별 — 의도적 실패 (병합 금지)
   1 file changed, 7 insertions(+)
   create mode 100644 server/test/zz-scratch-fail.test.ts
  ```

**2) 관측 (BAD)** — push(`eb68257..b6ec899`) 후 아래 명령(폴링으로 completed 대기):

```bash
gh run list --repo bjw202/minidiscord --commit b6ec8998ccd8c4fca1f3639dbcf3c3bc27551607 \
  --workflow ci.yml --json conclusion,status --jq '.[0] | select(.status=="completed") | .conclusion'
```

출력 원문:
```
failure
```

- run id `33394386914` (event push). 원문 파일: `.moai/state/verify/t27-run/ac006-bad.txt` · sha 기록: `ac006-sha.txt`.

**3) 되돌림** — `git revert --no-edit b6ec8998ccd8c4fca1f3639dbcf3c3bc27551607` → push(`b6ec899..89cc137`). 원문:
```
[WT-ci-test-wiring 89cc137] Revert "scratch: CI 변별 — 의도적 실패 (병합 금지)"
 1 file changed, 7 deletions(-)
 delete mode 100644 server/test/zz-scratch-fail.test.ts
```

**4) 원상 확인 (GOOD)** — 같은 명령을 GOOD sha 로:

```
success
```

- run id `33394645385` (event push). 원문 파일: `.moai/state/verify/t27-run/ac006-good.txt`.

기대(`failure` → 되돌림 → `success`) 성립. 파괴 커밋과 그 revert 는 이 브랜치에만 살고 병합 대상은 revert 이후 head 다. 이 증거 기록 커밋은 되돌림 **뒤에** 별도 커밋으로 착지한다(DoD 2). 이 섹션의 나머지 기준 원문 기록은 후속 마일스톤(M4 의 AC-CI-007, M5 의 잔여 기준)이 채운다.

### AC-CI-007 — `pretest` 를 빼면 채널 6건이 실패한다 (변별 · M4, 2026-08-31)

`acceptance.md` §C AC-CI-007 명령열을 그대로 이행했다. 시작 head `e321368`(AC-CI-006 증거 커밋).

**1) 파괴 (변이 폭 단언 원문)** — `channel/package.json` 에서 `pretest` 키 하나만 제거하는 python 변이. 출력 원문(`.moai/state/verify/t27-run/ac007-mutation.txt`):
```
scripts: 5 -> 4
removed exactly: pretest = tsc
survivors: ['build', 'dev', 'test', 'typecheck']
MUTATION EXACT
```
세 단언(①키 수 차이 정확히 1 ②지워진 것이 pretest ③`scripts.test` 글자 그대로 보존) 전부 통과. `! grep -q '"pretest"' channel/package.json` 통과.

**게이트 경로 관측 ([HARD] 예단 금지)** — 우회 없이 커밋을 먼저 시도했다. 결과 원문(`.moai/state/verify/t27-run/ac007-gate.txt`):
```
gate=passed (우회 없음)
```
커밋 `cd7e983` — 1 file changed, 1 deletion(-). **우회를 쓰지 않았다** — 이 나무에 `channel/dist` 가 남아 있어(M2 가 만든 것) 로컬 `npm test` 가 붉지 않았기 때문이다. acceptance.md 가 예고한 두 경로 중 통과 쪽이 실측됐다.

**2) 관측 (BAD)** — push(`e321368..cd7e983`) 후 `gh run list --commit cd7e9833466615f59080da8721a2fd8e473c80b9 --workflow ci.yml` → run id `33395356613` (event push), 결론:
```
failure
```
`gh run view 33395356613 --log` 의 실패 요약 원문(`.moai/state/verify/t27-run/ac007-bad.txt`):
```
❯ test/transport-auth.test.ts (30 tests | 3 failed) 73233ms
❯ test/index-wiring.test.ts (14 tests | 2 failed) 3752ms
❯ test/gateway-mutual-auth.test.ts (5 tests | 1 failed) 5769ms
Tests  6 failed | 89 passed (95)
```
채널 워크스페이스 실패 **6건**(3+2+1)과 세 파일 이름(`gateway-mutual-auth` · `index-wiring` · `transport-auth`)이 모두 보인다. 공정 비고: 본문 명령의 grep 패턴 `Tests +6 failed` 는 요약 줄의 ANSI 색상 코드(`Tests [22m [1m[31m6 failed`) 사이에서 적중하지 못했다 — 요약 줄은 같은 로그에서 별도 추출로 보완해 위에 원문으로 옮겼다(기준의 실질인 «6건 + 세 파일 이름»은 두 근거로 성립).

**3) 되돌림** — `git revert --no-edit cd7e9833466615f59080da8721a2fd8e473c80b9` → push(`cd7e983..e296163`). 원문:
```
[WT-ci-test-wiring e296163] Revert "scratch: CI 변별 — channel pretest 제거 (병합 금지)"
 1 file changed, 1 insertion(+)
```
[HARD] 잔여 검사: `git status --porcelain` 에 `channel/package.json` 행 **없음** — `json.dumps` 재출력을 revert 가 온전히 복구했다. `grep -c '"pretest"' channel/package.json` → `1` (복구 확인).

**4) 원상 확인 (GOOD)** — `gh run list --commit e2961631e99f740fb1d75eec19d71b3954abc6ab --workflow ci.yml` → run id `33395698553` (event push), 결론:
```
success
```
원문 파일: `.moai/state/verify/t27-run/ac007-good.txt`.

기대(`failure` + 채널 6건 → 되돌림 → `success`) 성립. 로컬 절반(`.moai/state/verify/t27-plan/test-no-build.log` — `Tests 6 failed | 89 passed (95)`, exit 1)과 원격 절반이 서로를 대체하지 않고 함께 성립한다. 파괴 커밋과 그 revert 는 이 브랜치에만 살고 병합 대상은 revert 이후 head 다.

### AC-CI-001 — 파일이 존재하고, 파싱되고, 두 트리거를 선언한다 (M2, 2026-08-31)

`acceptance.md` §A AC-CI-001 의 python3 명령을 그대로 실행했다. 나무 `.claude/worktrees/t27` · M2 저작 커밋 `eb68257` 트리 상태. 원문 파일: `.moai/state/verify/t27-run/m2-ac001.log`.

```
triggers: ['pull_request', 'push']
push filter-free: {}
pull_request filter-free: {}
TRIGGERS OK
```

종료 코드 0. 기대(마지막 줄 `TRIGGERS OK`, 두 트리거 모두 `paths`/`branches` 필터 부재) 성립.

### AC-CI-002 — 파이프라인이 선언된 순서로 존재하고, 빌드 단계는 워크플로에 없으며, `npm test` 가 자족한다 (M2, 2026-08-31)

`acceptance.md` §A AC-CI-002 의 python3 명령을 그대로 실행했다. 같은 나무·트리 상태. 원문 파일: `.moai/state/verify/t27-run/m2-ac002.log`.

```
indices: 2 3 4 5
channel pretest: tsc
PIPELINE OK
```

종료 코드 0. 네 인덱스 `npm ci`(2) < typecheck server(3) < typecheck channel(4) < `npm test`(5) 의 강한 순서, 워크플로 빌드 단계 적중 0, `channel` `pretest` 존재 — 세 단언 모두 성립.

### AC-CI-003 — 재시도·실패 억제 장치가 하나도 없다 (M2, 2026-08-31)

`acceptance.md` §A AC-CI-003 의 python3 명령을 그대로 실행했다. 같은 나무·트리 상태. 원문 파일: `.moai/state/verify/t27-run/m2-ac003.log`.

```
hits: []
NO SUPPRESSION
```

종료 코드 0. 금지 어휘(`continue-on-error` · `nick-fields/retry` · `retry-on` · `|| true` · `set +e`) 적중 0 — REQ-CI-006 의 정적 절반 성립(DoD 5).

### AC-CI-004 — 실행 환경·권한·동시성·시간 제한이 명시적으로 고정돼 있다 (M2, 2026-08-31)

`acceptance.md` §A AC-CI-004 의 python3 명령을 그대로 실행했다. 같은 나무·트리 상태. 원문 파일: `.moai/state/verify/t27-run/m2-ac004.log`.

```
node pin: .nvmrc -> 24
runs-on/timeout/permissions/concurrency/node/cache 모두 고정됨
HYGIENE OK
```

종료 코드 0. runs-on/timeout/permissions/concurrency/node/cache 전부 고정, `node-version` 키 부재 + `node-version-file: .nvmrc`(OD-2 (b) 의 좁힌 단언) 성립.

### AC-CI-012 — typecheck 가 두 워크스페이스를 모두 덮고, 어느 쪽도 억제되지 않는다 (M2, 2026-08-31)

`acceptance.md` §A AC-CI-012 의 python3 명령을 그대로 실행했다. 같은 나무·트리 상태. 원문 파일: `.moai/state/verify/t27-run/m2-ac012.log`.

```
server step: npm run typecheck -w server
channel step: npm run typecheck -w channel
TYPECHECK COVERAGE OK
```

종료 코드 0. 두 워크스페이스의 typecheck 단계가 각각 정확히 하나, `if:`/`continue-on-error` 부재 — REQ-CI-013 성립.

### AC-CI-005 — 이 브랜치 head SHA 에서 결론이 `success` 다 (원격 push 관측 · M3, 2026-08-31)

`acceptance.md` §B AC-CI-005 명령을 그대로 실행했다. push 된 SHA 는 `eb682571d953e5a7679cbfe848f838e3b6076b77`(M2 커밋 `eb68257`). 절차 전체 원문: `.moai/state/verify/t27-run/m3-ac005.log`.

관측 명령 출력(폴링 1~4 회의 출력은 비었고 그때마다 **미관측**으로 기록했다; 5 회째 출력):

```
success
```

run 식별 원문:

```
{"conclusion":"success","createdAt":"2026-08-31T12:39:57Z","databaseId":33392889584,"event":"push","headSha":"eb682571d953e5a7679cbfe848f838e3b6076b77","status":"completed"}
```

run id `33392889584` · event `push` · headSha 가 push 된 SHA 와 일치. 보조 근거(`gh run view 33392889584 --log`): 서버 188 통과 + 채널 95 통과 = **283** (`m3-ac005.log`, 전체 로그 꼬리 `m3-ac005-log-tail.log`). 빈 출력을 통과로 세지 않았다.

### AC-CI-010 — pull_request 트리거에서도 실행이 관측된다 (원격 PR 관측 · M3, 2026-08-31)

`acceptance.md` §B AC-CI-010 절차를 그대로 실행했다. 원문 파일: `.moai/state/verify/t27-run/m3-ac010.log`.

1. draft PR 생성 → `https://github.com/bjw202/minidiscord/pull/1` (head SHA `eb682571…` — push 관측과 같은 SHA 이므로 두 트리거의 실행은 `event` 필드로만 갈린다. 그래서 필터가 하중을 진다).
2. 관측(`event=="pull_request"` 필터; 폴링 1~4 회 빈 출력은 미관측 기록, 5 회째):

```
success
```

run 식별 원문(같은 SHA 의 두 실행 — event 가 다르다):

```
{"conclusion":"success","createdAt":"2026-08-31T12:43:59Z","databaseId":33393227672,"event":"pull_request","status":"completed"}
{"conclusion":"success","createdAt":"2026-08-31T12:39:57Z","databaseId":33392889584,"event":"push","status":"completed"}
```

3. 정리: PR #1 을 닫았고 병합하지 않았다 — `gh pr view 1 --json state,mergedAt,mergeCommit,isDraft` →

```
{"isDraft":true,"mergeCommit":null,"mergedAt":null,"state":"CLOSED"}
```

**공시된 두 표기 편차**(gh 버전 차이; 원문 로그에 기록): 문서의 인자 없는 `gh pr view --repo …` 형태는 이 gh 에서 명시적 인자를 요구해 PR 번호를 create 출력 URL 에서 취했고, 문서의 `--json state,merged` 의 `merged` 필드가 이 gh 에 없어 같은 사실을 담는 `state,mergedAt,mergeCommit` 으로 대체했다. 둘 다 절차의 의미(관측·비병합 확인)를 바꾸지 않는다.

### AC-CI-008 — 스위트 실행이 작업 트리를 더럽히지 않는다 (위생 재실행 · M5, 2026-08-31)

`acceptance.md` §D AC-CI-008 의 세 명령을 이 나무에서 그대로 재실행했다. 나무 `.claude/worktrees/t27` · 브랜치 `WT-ci-test-wiring` · 재실행 시점 head `014ed37`. 원문 파일: `.moai/state/verify/t27-run/m5-ac008.log`.

- `$ rm -rf channel/dist` → exit=0
- `$ npm test` → **exit=0** — pretest 빌드 선행, 서버 15파일 188 통과 + 채널 6파일 95 통과(합계 283)
- `$ git status --porcelain` → exit=0, 출력 원문:

```
?? .moai/logs/prepush-bypass.log
?? .moai/logs/trace-44047cb1-51b2-4d7c-95bd-ba24361f36d3.jsonl
?? .moai/logs/trace-8e506da8-db0e-49e9-bc49-89636ef17ea1.jsonl
?? .moai/logs/trace-da9c2d22-6289-489c-bc67-c565061e81c7.jsonl
?? .moai/reports/session-8e506da8-db0e-49e9-bc49-89636ef17ea1.md
?? .moai/state/config-cache.json
?? .moai/state/context-usage.json
?? .moai/state/github/
?? .moai/state/verify/t27-run/m5-ac008.log
```

- 기계 판정: `git status --porcelain | grep -E "server/data|channel/dist|coverage" | wc -l` → `0`

`server/data` · `channel/dist` · `coverage` 가 한 줄도 없다 — 기대 성립. 위 9줄은 전부 세션 산출물(.moai 로그·상태 캐시)과 이 재실행의 증거 파일 자신으로, 기준이 이름 붙인 세 경로와 무관하다.

### AC-CI-009 — 열려 있는 리드 결정이 run 진입 전에 닫혔다 (재실행 · M5, 2026-08-31)

`acceptance.md` §D AC-CI-009 의 python3 명령을 이 나무에서 그대로 재실행했다. 재실행 시점 head `014ed37`. 원문 파일: `.moai/state/verify/t27-run/m5-ac009.log` (run 진입 직전의 첫 실행은 `ac009-entry-gate.log`).

```
### OD-1 — `npm run typecheck` 를 워크플로에 넣 -> (b) — 리드 결정. 두 워크스페이스가 지금 초록으로 실측됐으므로(위 관측) 즉시 붉어지지 않고, 타입 회귀를 사람이 아니라 CI 가 잡게 된다. 카드 범위를 스스로 넓히는 대가는 요구 1건·기준 1건의 증가이며, `spec.md` §3.4 REQ-CI-013 과 `acceptance.md` AC-CI-012 로 지불했다. 단계 위치는 `npm ci` → typecheck → `npm test` — `tsc --noEmit` 은 `dist` 를 필요로 하지 않으므로 `pretest` 빌드보다 앞에 서도 안전하고, 타입 오류가 있을 때 스위트를 돌리기 전에 멈춘다(fail fast).
### OD-2 — 고정한 Node 버전을 저장소에도 커밋하는가? -> (b) — 리드 결정. `.nvmrc` 를 추가하고 워크플로가 `node-version-file: .nvmrc` 로 그것을 가리킨다. 로컬 도구(nvm/fnm)와 CI 가 **같은 파일 하나**를 읽으므로 REQ-CI-008 의 「하나의 출처」가 저장소 안의 실체로 내려앉는다. (c) 는 루트 `package.json` 을 건드려 §5 배제와 여전히 충돌하므로 배제됐고, (a) 는 로컬·CI 의 조용한 갈라짐을 알려 주는 것이 아무것도 없다. 대가는 파일 1개 추가(`.nvmrc`, 내용은 고정 메이저 `24`).
### OD-3 — `channel/package.json` 에 `pre -> (b) — 리드 결정. `channel/package.json` 에 `"pretest": "tsc"` 를 넣어 `npm test` 한 명령이 자족하게 만든다. 고쳐지는 범위가 **CI 만**이 아니라 **모든 깨끗한 체크아웃**이며, §2.2 가 재현한 거짓 실패 6건은 사람과 에이전트가 새 나무를 열 때마다 겪는 증상이다(프로젝트 기억 `fresh-worktree-needs-channel-build` 가 반복 발생으로 기록). 워크플로에서 빌드 단계는 **삭제**되고 REQ-CI-004·005 는 **REQ-CI-004′·005′ 로 교체**된다. (c)(둘 다)를 고르지 않은 이유: 빌드가 두 번 도는 중복이 CI 시간을 늘리는 반면, 워크플로가 `pretest` 존재에 의존하지 않는다는 이점은 AC-CI-007 의 변별이 이미 잰다. 형제 카드 제약(§D-1)은 **문언 위반이 아니며**, 취지에 주는 압력은 리드가 읽고 수용했다.
CLOSED 3
```

종료 코드 0. 세 결정 전부 닫힘 — 기대 `CLOSED 3` 성립(DoD 6 전반).

### AC-CI-011 — 선언·마커·자리 목록 세 출처가 정합하고, §D-2 파급표가 살아 있다 (재실행 · M5, 2026-08-31)

`acceptance.md` §D AC-CI-011 의 python3 명령을 이 나무에서 그대로 재실행했다. 재실행 시점 head `014ed37`, 측정 대상은 M5 문서 편집(§E.2 전체 기록·§E.3 신호)이 반영된 작업 나무의 네 문서 상태다 — 커밋이 담는 내용과 동일하다. 원문 파일: `.moai/state/verify/t27-run/m5-ac011.log`.

```
declared: {1: 5, 2: 5, 3: 7}
markers : {1: 5, 2: 5, 3: 7}
listed  : {1: 5, 2: 5, 3: 7}
§D-2 (b)/(c) rows with non-empty 그 밖의 자리: 5
FALLOUT TABLE COMPLETE
```

종료 코드 0. 선언·마커·자리 목록 세 출처가 정합하고 §D-2 표가 살아 있다 — 기대 성립(DoD 6 후반). 본 절 삽입 뒤 최종 문서 상태에서 같은 명령을 한 번 더 돌려 같은 출력을 확인했고 그 실행이 같은 로그 파일 뒤에 이어져 있다(본 절이 `[OD-DEP:*]` 마커를 새로 심지 않음을 포함한 재확인).

## §E.3 Run-phase Audit-Ready Signal

- 카드 `t27` (N4 — CI 테스트 배선). 나무 `.claude/worktrees/t27` · 브랜치 `WT-ci-test-wiring`.
- **종료 head**: 본 신호가 담기는 M5 커밋이다 (커밋 이전 head `014ed37`; 커밋 자신은 자신의 해시를 알 수 없으므로 이 자리는 커밋 이후 `git log` 로 확정된다). push 후 `origin/WT-ci-test-wiring` 과 동기.
- run 진입 게이트(직접 실행): AC-CI-009 `CLOSED 3` (`ac009-entry-gate.log`) · baseline build+test exit 0·283 통과 (`baseline-build.log`·`baseline-test.log`).

**12/12 수용 기준 판정표** — 증거 경로는 모두 `.moai/state/verify/t27-run/` 아래다.

| 기준 | 판정 | 증거 |
|---|---|---|
| AC-CI-001 | PASS | `m2-ac001.log` |
| AC-CI-002 | PASS | `m2-ac002.log` |
| AC-CI-003 | PASS | `m2-ac003.log` |
| AC-CI-004 | PASS | `m2-ac004.log` |
| AC-CI-005 | PASS | `m3-ac005.log` (run 33392889584 · event push) |
| AC-CI-006 | PASS | `ac006-sha.txt`·`ac006-bad.txt`·`ac006-good.txt` |
| AC-CI-007 | PASS | `ac007-sha.txt`·`ac007-mutation.txt`·`ac007-gate.txt`·`ac007-bad.txt`·`ac007-good.txt` |
| AC-CI-008 | PASS | `m5-ac008.log` (M5 재실행) |
| AC-CI-009 | PASS | `m5-ac009.log` (M5 재실행) + `ac009-entry-gate.log` |
| AC-CI-010 | PASS | `m3-ac010.log` (run 33393227672 · event pull_request · PR #1 닫힘·비병합) |
| AC-CI-011 | PASS | `m5-ac011.log` (M5 재실행) |
| AC-CI-012 | PASS | `m2-ac012.log` |

**커밋 궤적**: `eb68257`(M2 — ci.yml 저작·.nvmrc·channel pretest) → `b6ec899`/`89cc137`(AC-CI-006 파괴+revert) → `e321368`(AC-CI-006 증거) → `cd7e983`/`e296163`(AC-CI-007 파괴+revert) → `014ed37`(AC-CI-007 증거) → **M5 커밋**(§E.2 전체 원문 기록·§E.3·run-done 보고). 파괴 커밋과 그 revert 넷은 병합 금지이며 **리드의 통합 대상은 revert 이후 head** 다.

**게이트 우회 회계 (공시)**: AC-CI-006 의 파괴 커밋 한 곳에서만 `SKIP_MOAI_PRECOMMIT=1` 을 사용했고 사유를 커밋 메시지 본문에 적었다(§E.2 AC-CI-006 절 — 붉음이 측정 대상 자체). AC-CI-007 은 **우회를 쓰지 않았다** — 우회 없이 시도한 커밋이 게이트를 통과했고 그 관측이 `ac007-gate.txt`(`gate=passed (우회 없음)`)에 남는다. 그 밖의 어떤 커밋도 우회를 쓰지 않았다.

**DoD 상태**:
1. 열두 기준 전부 통과 + §E.2 원문 기록 — **성립** (위 표 + §E.2 전체).
2. 파괴 커밋 되돌림 + success 재관측 + 증거 커밋이 revert 뒤 — **성립** (`e321368` 은 `89cc137` 뒤, `014ed37` 은 `e296163` 뒤 — `git log` 순서로 확인).
3. draft PR 닫힘·비병합 — **성립** (`m3-ac010.log` — PR #1 `state=CLOSED`·`mergedAt=null`).
4. 변경 파일 집합이 확정 집합과 일치 — **성립** (`m5-dod4.txt` — `main...HEAD` diff(=2a19d7d) + M5 스테이지 집합의 합집합 검사, 허용 집합 외 0파일).
5. 재시도 장치 부재 — **성립** (AC-CI-003 `NO SUPPRESSION`, `m2-ac003.log`).
6. `CLOSED 3` + `FALLOUT TABLE COMPLETE` — **성립** (`m5-ac009.log`·`m5-ac011.log`).

**Gaps (미검증)**: 열두 기준의 명령 출력은 전부 원문으로 관측·기록됐고 남은 미관측 항목은 없다. 단, AC-CI-011 의 최종 실행은 **커밋 전 작업 나무의 문서 상태**(= 이 커밋이 담는 내용과 동일)를 재는 것이며, 커밋 이후 트리에 대한 별도 재실행은 하지 않았다.

**Residual-risk (잔여 위험)**:
- `spec.md` §2.6 의 흔들림 실패율은 이 카드가 측정하지 않았다(배제 공시 유지) — 향후 CI 실패가 흔들림인지 판단할 데이터가 없다.
- AC-CI-006·007 의 파괴 커밋과 그 revert 넷이 브랜치 이력에 남는 것은 설계대로다 — 통합 시 스쿼시 여부 판단은 리드의 몫이다.
- `ac007-bad.txt` 에 ANSI 색상 이스케이프가 원문 보존을 위해 그대로 남아 있다 — 이 파일을 grep 에 쓸 때는 이스케이프가 매칭을 가릴 수 있음을 알 것.

## §E.4 Sync-phase Audit-Ready Signal

- 카드 `t27` (N4 — CI 테스트 배선) · SPEC `SPEC-CI-001` · Tier M. 나무 `.claude/worktrees/t27` · 브랜치 `WT-ci-test-wiring`.
- 측정 head: `ce4431bed8eacbfb00a2fc75eb2ba5151c91d5d3` (= run 단계 M5 종료 커밋). 아래 모든 관측은 **sync 커밋이 착지하기 전** 이 트리에서 이루어졌다.
- sync 단계 증거 뿌리: `.moai/state/verify/t27-sync/`.

### Claim (주장)

1. **run 단계가 남긴 단 하나의 열린 Gap — 「M5 종료 head 의 원격 CI 실행은 아직 관측되지 않았다」 — 이 닫혔다.** 그 head 의 원격 실행을 직접 관측했고 결론은 `success` 다.
2. **푸시가 확인됐다** — `origin/WT-ci-test-wiring` 이 로컬 head 와 같은 커밋을 가리킨다.
3. **문서가 동기화됐다** — `CHANGELOG.md` 에 카드 `t27` 항목을 더하고, `README.md` 의 「명령어」 절과 「문서」 목록을 이 변경에 맞춰 고쳤다.
4. **상태 전이를 sync 가 수행했다** — `spec.md` 프런트매터의 `status` 가 `draft` 로 남아 있던 것을 `completed` 로 옮겼다.

### Evidence (증거)

**① 푸시 확인** — `git ls-remote origin WT-ci-test-wiring` 의 출력:

```
ce4431bed8eacbfb00a2fc75eb2ba5151c91d5d3	refs/heads/WT-ci-test-wiring
```

같은 회차의 `git rev-parse HEAD` 가 `ce4431bed8eacbfb00a2fc75eb2ba5151c91d5d3` 이다 — 두 값이 같으므로 run 단계 `run-done.md` 가 스스로 남긴 「푸시 확인 출력이 본 보고서 안에 없다」는 Gap 이 이 자리에서 닫힌다.

**② run 단계의 열린 Gap 종결 — M5 종료 head 의 원격 CI 초록** — `gh run list --commit ce4431bed8eacbfb00a2fc75eb2ba5151c91d5d3 --json conclusion,createdAt,databaseId,event,headSha,status,updatedAt,url,workflowName` 의 출력을 `.moai/state/verify/t27-sync/sync-head-ci.json` 에 원문으로 남겼다. 실행은 **한 건**이고 필드는 다음과 같다:

| 필드 | 값 |
|---|---|
| `databaseId` | `33398053285` |
| `workflowName` | `CI` |
| `event` | `push` |
| `status` | `completed` |
| `conclusion` | **`success`** |
| `headSha` | `ce4431bed8eacbfb00a2fc75eb2ba5151c91d5d3` |
| `createdAt` | `2026-08-31T13:38:10Z` |
| `updatedAt` | `2026-08-31T13:40:30Z` |
| `url` | `https://github.com/bjw202/minidiscord/actions/runs/33398053285` |

`headSha` 가 위 ①의 head 와 글자 그대로 같다 — 곧 이 초록은 M2 시점의 `eb68257` 이 아니라 **파괴·되돌림·증거·M5 커밋이 전부 얹힌 종료 head** 에 대한 관측이다. run 단계 §E.3 과 `run-done.md` Gaps 둘째 항이 sync 의 첫 확인 사항으로 남긴 바로 그 관측이며, 이로써 run 단계 Gaps 는 원격 관측 축에서 남는 것이 없다.

**③ sync 가 찾은 결함 — `status` 전이 누락** — `spec.md` 프런트매터의 `status` 가 이 시점까지 `draft` 였다(`.moai/specs/SPEC-CI-001/spec.md:5`, 프런트매터 5행). **`draft → in-progress` 전이는 run 단계가 소유하는 행위인데 run 단계가 그것을 수행하지 않았다** — `run-done.md` 도 §E.3 도 이 전이를 언급하지 않으며, 열두 기준·DoD 여섯 항 어느 것도 프런트매터를 재지 않으므로 **모든 기준이 통과한 채로 이 누락이 살아남았다.** sync 단계가 3단계 종결(in-progress → implemented → completed)의 몫으로 같은 자리를 `completed` 로 옮기면서 이 결함을 흡수했다. 「기준이 통과했다」가 「전이가 수행됐다」를 함의하지 않는다는 사실을 기록으로 남긴다.

형제 문서 `plan.md`·`acceptance.md`·`progress.md` 에는 **YAML 프런트매터가 아예 없다**(각 파일의 첫 12행 판독으로 확인). 이 SPEC 의 원래 형태이므로 없는 프런트매터를 새로 만들지 않았다.

**④ 문서 동기화 — 손댄 자리**

| 파일 | 편집 |
|---|---|
| `CHANGELOG.md` | `## [Unreleased]` 아래, 카드 `t22` 항목 앞에 카드 `t27` 항목 신설 |
| `README.md` | 「명령어」 표 뒤에 CI 자동 실행·`pretest` 자족성 안내 문단 추가 · 「문서」 목록에 `SPEC-CI-001` 한 줄 추가 · 「필요한 것」 절에 `.nvmrc` 안내 추가(sync 레인 판독으로 더함 — 「Node.js 20 이상」은 여전히 참이라 고치지 않았고, 저장소가 `24` 를 적어 둔 사실이 어디에도 없던 간극만 메웠다) |
| `.moai/specs/SPEC-CI-001/spec.md` | 프런트매터 `status: draft → completed` · `updated: 2026-08-31`(값 불변) |
| `.moai/specs/SPEC-CI-001/progress.md` | 본 §E.4 절 |

`plan.md` 와 `acceptance.md` 는 손대지 않았다.

**⑤ sync 레인이 판독했으나 이 카드가 고치지 않은 것 둘** — 둘 다 소유권이 sync 밖이라 리드·감사 회부로 남긴다.

- **`spec.md` §1.1 「테스트를 돌리는 워크플로는 **없다**」가 현재형으로 거짓이 됐다.** 절 제목이 「지금 무엇이 없는가 (실측)」이라 현재 상태 서술로 읽힌다. 이 프로젝트가 이름 붙인 부류 「정정이 스스로 낡은 기록을 남긴다」의 한 사례다. **고치지 않은 이유는 소유권이다** — `spec.md` 본문은 `manager-spec` 의 것이고 sync 단계는 프런트매터 `status`·`updated` 만 만진다. 판단은 감사·리드에 회부한다.
- **`.moai/state/verify/t27-run/m5-final-head-ci.txt`(추적 안 됨, 30바이트, 내용 `observed: success 33398053285`)가 나무에 있다.** 파일 시각은 22:40 으로 M5 커밋(보고서 22:36) 이후다. 내용은 위 ②가 독립으로 관측한 사실과 일치하지만 **누가 언제 만들었는지 이 세션은 관측하지 않았다.** 귀속할 수 없는 증거를 커밋에 넣지 않는다는 원칙대로 추적에 넣지 않았고, ②의 주장은 이 파일이 아니라 이 세션이 직접 실행한 `gh run list` 출력(`sync-head-ci.json`)에 귀속한다.

### Baseline-attribution (baseline 귀속)

**[HARD] 이 절의 모든 관측은 나무 `.claude/worktrees/t27` · 브랜치 `WT-ci-test-wiring` · head `ce4431bed8eacbfb00a2fc75eb2ba5151c91d5d3` 트리에서, sync 커밋이 착지하기 **전에** 수행됐다.** sync 커밋이 착지하면 head 가 바뀌지만 위 값들은 다시 재지 않았다 — 어떤 점수·관측도 sync 커밋 이후 트리의 값으로 제시해서는 안 된다.

- 푸시 확인과 원격 CI 관측: 위 head 에 귀속. 명령은 각각 `git ls-remote origin WT-ci-test-wiring` 과 `gh run list --commit ce4431b… --json …`.
- 열두 수용 기준의 통과 판정은 **run 단계의 값**이며 sync 가 재측정하지 않았다 — 귀속은 §E.2·§E.3 과 `run-done.md` 가 적은 대로 M2 는 `eb68257`, M3 원격 관측은 `eb682571d953…`, M4 는 파괴/revert 쌍, M5 재실행은 `014ed37` + 문서 편집 상태다.
- 이 카드에는 sync 단계의 자체 테스트 재실행 기록이 없다 — sync 가 인용하는 초록은 위 ②의 **원격 CI 실행 하나**이며, 그 실행이 곧 `npm ci → typecheck ×2 → npm test` 를 깨끗한 러너에서 돌린 결과다. 로컬 재실행을 별도로 하지 않았다는 사실을 여기 적는다.

### Gaps (미검증)

- **흔들림(flake) 실패율은 여전히 측정돼 있지 않다.** `spec.md` §2.6·§5 가 이를 명시적으로 배제한다. plan 단계의 3회 반복 실행이 깨끗했다는 기록(`t27-plan/flake-run1~3.log`)은 **측정이지 실패율이 아니다** — 향후 CI 가 간헐적으로 붉어질 때 그것이 흔들림인지 판단할 데이터는 이 카드가 남기지 않는다.
- **`pull_request` 트리거는 head `ce4431b` 에서 다시 관측하지 않았다.** AC-CI-010 의 통과는 `eb68257` 에 개설했던 draft PR #1(run `33393227672`)의 관측이고, 그 PR 은 닫혔으므로 종료 head 에서 같은 트리거를 재관측할 PR 이 존재하지 않는다. **AC-CI-010 의 귀속은 `eb68257` 로 남는다** — 종료 head 의 초록(②)은 `event: push` 한 건이며 pull_request 축을 대신 증명하지 않는다. `ci.yml` 의 `on:` 블록이 M2 이후 바뀌지 않았다는 사실이 그 간극을 좁히지만, 그것은 정적 대조이지 원격 관측이 아니다.
- **sync 커밋 자신의 원격 CI 실행은 관측할 수 없다** — 커밋이 아직 존재하지 않기 때문이다. 관측 주체는 **sync 레인**(이 커밋을 만들고 푸시하는 쪽)이며, 방법은 착지 후 `gh run list --commit <sync-커밋-SHA>` 로 `conclusion: success` 를 새로 읽는 것이다. 이 문서는 그 값을 갖지 않는다.
- **AC-CI-011 은 여전히 커밋 전 작업 나무 상태의 측정이다** — run 단계가 남긴 그대로이며 sync 가 재실행하지 않았다.
- **README 낡은 기록 훑기는 어간 기준 판독이지 전수 증명이 아니다** — 훑은 어간과 결과는 sync 보고에 적었고, 어간 목록은 하한이지 상한이 아니다(`plan.md` §G-3.1 이 같은 성질을 기록한다).

### Residual-risk (잔여 위험)

- **`ac007-bad.txt` 에 ANSI 색상 이스케이프가 원문 보존을 위해 그대로 남아 있다** — 이 파일을 `grep` 으로 다룰 때 이스케이프가 매칭을 가릴 수 있다(§E.2 AC-CI-007 절·§E.3 의 공시와 같다).
- **AC-CI-006·007 의 파괴 커밋과 그 revert 넷이 브랜치 이력에 남는 것은 설계대로다** — 통합 대상은 revert 이후 head 이며, **스쿼시 여부 판단은 리드의 몫**이다. sync 는 이 결정을 하지 않는다.
- **원격 CI 관측 세 건(AC-CI-005·010 과 위 ②)은 GitHub Actions 의 실행 이력에 의존한다** — 보존 기간이 지나면 `33392889584`·`33393227672`·`33398053285` 는 조회되지 않고, 재확인은 `git log` 와 본 기록으로만 가능해진다.
- 흔들림이 실제로 존재하면 이 CI 는 간헐적으로 붉어질 수 있고, 그때 「코드가 깨졌다」와 「흔들렸다」를 가를 데이터가 없다(위 Gaps 첫 항과 같은 뿌리).

## §F Phase 4 Mode Selection

- 카드 `t27` run 레인. 나무 `.claude/worktrees/t27` · 브랜치 `WT-ci-test-wiring` · 진입 head `2e76f8a`.
- 입력: tier **M** · 범위 3파일(`ci.yml`·`.nvmrc`·`channel/package.json`)+`.moai/` 증거 · 도메인 1(CI YAML 저작+원격 관측) · 파일 언어 YAML/JSON/Markdown · 병렬 이득 **낮음**(마일스톤이 강한 순서 — M3 은 M2 의 커밋을, M4 는 M3 의 push 를 전제).
- 진입 게이트 확인(직접 실행): AC-CI-009 → `CLOSED 3`(원문 `.moai/state/verify/t27-run/ac009-entry-gate.log`) · baseline build+test exit 0 · 283 통과(`baseline-build.log`·`baseline-test.log`). plan 레인의 독립 재실행 판독과 일치.
- 평가: `direct` — 결정이 닫힌 지금 남은 것은 지정된 명령열의 이행이라 단순하지만, Tier M 위임 템플릿 요건과 커밋 저작이 있어 스폰이 맞다. `fanout` — 쓰기 충돌이 같은 나무 3파일 위에서 나므로 배제. `sweep` — 파일 3개로 임계 미달, 배제. `agent-team` — 요청 없음, 배제.
- Decision: serial — 마일스톤당 순차 스폰(M2 → M3 → M4 → M5), 각 마일스톤의 증거를 레인이 판독한 뒤 다음을 스폰한다.
- Justification: 마일스톤 사이에 강한 데이터 의존(커밋→push→파괴/revert→기록)이 있어 Anthropic coding-task 병렬화 경고가 그대로 적용된다. 순차 단일 스폰이 유일하게 안전한 형태다.
