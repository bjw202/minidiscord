# 카드 t21 — plan 2회차 종료 보고

| 항목 | 값 |
|---|---|
| 카드 | `t21` — `SPEC-COVERAGE-001` CI 배선 문언 정정 (문서 전용) |
| 단계 | plan 2회차 (F-01 블로커 재소환 — 운영자 결정 (A), 리드 승인) |
| 브랜치 | `WT-ci-wiring-words` (미푸시) |
| 진입 HEAD | `3c61372` |
| 이 단계 커밋 | **`f7d95a8`** — 2 파일, +5/-4 |
| 소유 | `manager-spec` (SPEC 본문). 코드 변경 0 |

---

## 쉬운 말 요약

이 라운드가 고친 것은 **「고쳐 놓은 문장에 딸려 들어온 잘못된 조언」** 입니다. 지난 정정(`9e7280e`)은 「이 저장소엔 CI 배선이 없다」는 거짓 문장을 참으로 바꿨는데, 그러면서 「그러니 기존 배선에 명령 한 줄만 얹으면 된다」는 조언을 새로 달았습니다. 그런데 이름을 박아 둔 그 워크플로(`label-sync.yml`)는 **라벨 파일이 바뀔 때만 도는** 물건이라, 거기에 커버리지를 얹으면 코드가 아무리 바뀌어도 한 번도 안 도는 게이트가 됩니다 — 이 SPEC 이 애초에 경고한 「소리 없이 대기하는 게이트」와 똑같은 모양이죠.

그래서 트리거 서술에 빠져 있던 **경로 필터**를 적어 넣고, 조언을 「`pre-push` 훅에 얹거나 워크플로를 새로 더해라, `label-sync.yml` 은 재사용 대상이 아니다」로 좁혔습니다. 곁들여 빠져 있던 훅 하나(`pre-push`)를 열거에 더하고, 수용 기준 표에서 열 의미가 뒤집혀 있던 한 행과 HISTORY 의 숫자 모순·상호 참조 누락을 정리했습니다.

**감사가 지적한 5건이 전부 닫혔습니다. 요구사항·수용 기준·설계 결정은 한 줄도 건드리지 않았습니다.**

한 가지 **새로 발견해 넘기는 것**이 있습니다 — 같은 잘못된 조언이 `progress.md:432` 에 현재형으로 한 벌 더 살아 있습니다. 그 파일은 manager-spec 소유가 아니라 이번 범위 밖이라, 고치지 않고 §4 에 적어 sync 로 넘깁니다.

---

## 1. Claim (주장)

| # | 발견 | 주장 | 판정 |
|---|---|---|---|
| 1 | **F-01** (High) | `spec.md` §5 의 트리거 서술에 `paths:` 경로 필터를 명시했고, 「기존 배선에 한 줄 얹기만 하면 된다」 처방을 훅·새 잡 방향으로 좁혔으며, `label-sync.yml` 이 재사용 대상이 **아님**을 그 이유(경로 필터)와 함께 적었다 | 닫힘 |
| 2 | **F-03** (Low) | 같은 절의 배선 열거에 설치된 훅 `.git_hooks/pre-push` 를 더했다 | 닫힘 |
| 3 | **F-04** (Medium) | `acceptance.md:317` 의 「상황 / 기대 동작」 두 칸을 열 의미에 맞게 고쳤다. 「덮는 기준」 칸은 무변경 | 닫힘 |
| 4 | **F-05** (Low) | HISTORY `0.2.1` 행을 「문언 정정 1건(적용 자리 2곳 — `spec.md` §5, `acceptance.md` 엣지 케이스 표)」로 열어 「1건 ↔ 두 자리」 자기모순과 부정확한 「본문」 한정을 함께 없앴다 | 닫힘 |
| 5 | **F-06** (Low) | 같은 행 끝에 「`0.2.0` 행의 «F-03 을 닫았다» 는 `CHANGELOG.md` 한 자리에 한정된 서술이었다」 한 절을 더했다. `0.2.0` 행 자체는 **소급 수정하지 않았다** | 닫힘 |
| 6 | 개정 기록 | HISTORY `0.2.2` 행 신설, frontmatter `version: "0.2.1" → "0.2.2"`. `status: completed` **유지** | 완료 |

**범위 규율**: REQ / AC 블록, 설계 결정, 배제 **대상**(무엇이 범위 밖인가)은 diff 에 한 줄도 없다. 바뀐 것은 배제 **근거**의 처방 문언, 엣지 케이스 표 한 행의 열 의미, HISTORY 정합뿐이다.

## 2. Evidence (증거)

**정정 근거는 이 트리에서 직접 재측정했다. 감사 보고서의 수치를 옮겨 적지 않았다.**

### E-1 — `label-sync.yml` 의 경로 필터 (F-01 의 근거)

명령: `sed -n '10,34p' .github/workflows/label-sync.yml`

```
on:
  workflow_dispatch:
    inputs:
      dry_run:
        ...
  push:
    branches:
      - main
    paths:
      - ".github/labels.yml"
      - ".github/workflows/label-sync.yml"
```

push 트리거가 그 두 파일에만 걸려 있다. `server/` 변경으로는 발화하지 않는다 — 정정 전 서술이 이 6줄을 통째로 빠뜨렸다.

### E-2 — 설치된 훅은 둘이다 (F-03 의 근거)

명령: `ls -la "$(git rev-parse --git-common-dir)/hooks" | grep -E "pre-(commit|push)"`

```
-rwxr-xr-x@  1 byunjungwon  staff  3245  8월 26 17:00 pre-commit
-rwxr-xr-x@  1 byunjungwon  staff  2923  8월 26 17:00 pre-push
```

둘 다 실행권한을 가지고 설치돼 있다. 정정 전 열거는 `pre-commit` 하나뿐이었다.

### E-3 — 핵심 명제는 참이므로 건드리지 않았다

명령: `grep -rn "coverage" .github .git_hooks; echo "EXIT=$?"`

```
EXIT=1
```

적중 0건. 「배선은 있으나 그중 어느 것도 커버리지를 부르지 않는다」는 참이다 — **이 문장은 그대로 뒀다.** 고친 것은 트리거 서술과 처방 절뿐이다.

### E-4 — 착지 확인

명령: `git diff --cached --name-only` · `git commit`

```
.moai/specs/SPEC-COVERAGE-001/acceptance.md
.moai/specs/SPEC-COVERAGE-001/spec.md
[WT-ci-wiring-words f7d95a8] docs(SPEC-COVERAGE-001): CI 배선 처방 절 정정 — 경로 필터 명시·훅 열거 보강 (card t21)
 2 files changed, 5 insertions(+), 4 deletions(-)
```

**스테이징은 명시 경로 2개로만 했다.** 같은 나무의 sync 미커밋 산출물(`.moai/reports/t21/sync-audit.md`, `sync-done.md`)과 미추적 로그·상태 파일은 딸려 들어가지 않았다 — 위 `--name-only` 출력이 2행뿐인 것이 그 증거다.

### E-5 — 정정 후 본문 실측

명령: `grep -n "CI 에 이 명령" .moai/specs/SPEC-COVERAGE-001/acceptance.md` · `grep -n '^version:\|^status:' .moai/specs/SPEC-COVERAGE-001/spec.md`

```
317:| CI 에 이 명령을 태우려 한다 | 기존 배선 어디에도 커버리지 호출이 없으므로 새 잡·새 훅 단계를 더해야 한다 (이 카드 범위 밖) | 범위 밖 (`spec.md` §5) |
4:version: "0.2.2"
5:status: completed
```

## 3. Baseline-attribution (기준선 귀속)

| 항목 | 값 |
|---|---|
| 측정 트리 | `.claude/worktrees/t21` (브랜치 `WT-ci-wiring-words`) |
| 측정 시점 HEAD | `3c61372` — 편집 전. 커밋 후 `f7d95a8` |
| 인용 출처 | 위 E-1~E-5 는 **모두 이 세션이 이 트리에서 실행한 명령의 출력**이다. `sync-audit.md` 의 수치는 대조용으로만 읽었고 증거로 인용하지 않았다 |
| 대조 결과 | 감사가 보고한 세 수치(경로 필터 2행 · 훅 크기 3245/2923 · coverage 적중 0)가 재실행에서 모두 재현됐다 |

## 4. Gaps (미검증 · 범위 밖)

1. **같은 처방이 `progress.md:432` 에 현재형으로 한 벌 더 있다 — 이번에 고치지 않았다.** 정정 후 훑기(`grep -rn` 로 「배선이 없」·「아직 없」·「한 줄 얹기만」·「기존 배선에 명령을 얹」)에서 나왔다:

   ```
   .moai/specs/SPEC-COVERAGE-001/progress.md:432:- **문서가 게이트를 대신하지 않는다.** … 워크플로 배선 자체(`.github/workflows/label-sync.yml`)와 pre-commit 훅(`moai gate`)은 이미 있으므로, 후속 카드가 할 일은 새 디렉터리가 아니라 기존 배선에 명령을 얹는 것이다.
   ```

   F-01 이 지적한 처방과 **같은 문장**이며 현재형 Residual-risk 다. `progress.md` 는 manager-spec 소유가 아니고(§E.3/§E.4 는 manager-develop·manager-docs 소유) 이번 디스패치 범위에도 없어 손대지 않았다. **sync 가 `CHANGELOG.md:56`·`run-done.md:65` 를 맞출 때 함께 봐야 한다.**

   > **각주 (sync 후속, 2026-08-29)**: 넘겨받은 이 항목은 **닫혔다.** sync 가 `progress.md:432`(§E.4 Residual-risk — manager-docs 소유 확인) 를 `spec.md` §5 `0.2.2` 와 같은 사실로 정정했다. 위 「이번에 고치지 않았다」는 이 라운드 시점의 서술이므로 본문은 그대로 둔다. 근거: `.moai/reports/t21/sync-done.md` §4.

2. **`progress.md:401`** 도 트리거를 「`workflow_dispatch` + `push: main`」으로만 적어 경로 필터가 빠져 있다. 다만 그 문장은 「그때 확인한 범위」를 밝히는 Gaps 기록이라 동결 기록으로 볼 여지가 있다 — 판단을 sync 로 넘긴다.

   > **각주 (sync 후속, 2026-08-29)**: sync 는 **동결 기록으로 판단했다** — Gaps 는 그 단계가 무엇을 관측했는지 적는 자리이므로 본문을 고치면 그때의 관측 범위를 위조하게 된다. 대신 같은 행에 각주 한 절(경로 필터·`pre-push` 누락, 정정본은 `spec.md` §5 `0.2.2`)을 덧붙여 오독만 막았다. 근거: `.moai/reports/t21/sync-done.md` §4.

3. **워크플로를 실제로 돌려 보지 않았다.** 「경로 필터 때문에 `server/` 변경으로 발화하지 않는다」의 근거는 YAML 내용이지 실행이 아니다. GitHub Actions 의 `paths:` 의미론을 문서 지식으로 해석한 것이다.

4. **`.git_hooks/pre-push` 가 커버리지를 얹기에 적합하다**는 서술은 「푸시마다 돈다」는 훅 계약에서 나온 판단이지, 그 훅에 커버리지를 얹어 실행해 본 결과가 아니다.

5. `.moai/reports/t13/run-done.md:65`(F-02)는 이번 범위에 없었고 손대지 않았다.

## 5. Residual-risk (잔여 위험)

- **범위 밖 한 자리가 남아 있는 동안, 이 카드가 고치러 온 결함이 절반 살아 있다.** `progress.md:432` 는 후속 카드가 실제로 읽을 자리다. sync 가 닫기 전까지는 「거짓 처방 제거」가 완결되지 않았다.
- **`--exclude` 없이 「기존 배선」을 세는 서술은 앞으로도 낡기 쉽다.** 훅이 하나 더 설치되거나 워크플로가 추가되면 열거가 다시 2/3 가 된다. 이번에 「예: …」가 아니라 전수 열거를 유지했으므로, 배선이 늘면 이 절을 다시 봐야 한다.
- **`status: completed` 인 SPEC 을 두 번째로 개정했다.** 문언 정정은 SPEC 을 다시 열지 않는다는 `0.2.1` 의 판단을 이 라운드도 따랐다. 세 번째 정정이 필요해지면 그 판단 자체를 재검토할 신호로 읽어야 한다.

---

## 6. 다음 사람에게

- **sync [65e0fc]** 가 나무에 다시 들어가 `CHANGELOG.md:56` 을 같은 사실에 맞추고, `.moai/reports/t13/run-done.md:65` 에 각주를 달고, **위 §4-1 의 `progress.md:432` 를 함께 판단**한 뒤 보고서를 갱신·커밋한다.
- **리드**가 그 뒤 done 판정한다.
- 브랜치 `WT-ci-wiring-words` 는 **미푸시 유일 사본**이다. 나무 삭제 금지.
