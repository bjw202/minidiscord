# 카드 t21 — sync 감사 보고

| 항목 | 값 |
|---|---|
| 카드 | `t21` — `SPEC-COVERAGE-001` CI 배선 문언 정정 (문서 전용) |
| 감사 대상 HEAD | `3c6137260ad2c728fd3502065e3124ec23576a78` (브랜치 `WT-ci-wiring-words`) |
| 정정 커밋 | `9e7280e` (2 파일, +4/-3) |
| 감사 축 | 정정된 «CI 배선» 명제의 참·거짓 |
| 감사 방식 | 원자료 재측정. `plan-done.md` 의 어떤 수치도 인용하지 않고 이 트리에서 다시 실행했다 |

---

## 쉬운 말 요약

이 카드는 「이 저장소엔 CI 배선이 없다」는 **거짓 문장** 두 자리를 「배선은 있는데 그중 어느 것도 커버리지를 부르지 않는다」로 고쳤습니다. 저는 감사 보고서나 카드 보고서를 믿지 않고 파일을 직접 뒤져 다시 쟀고, **고쳐 쓴 핵심 명제는 참**이라는 결론을 얻었습니다. 배선은 실제로 존재하고(GitHub Actions 워크플로 1개 + 설치된 git 훅 2개), 그중 어디에도 `coverage` 라는 글자가 없습니다.

다만 **참인 문장에 딸려 붙은 조언 한 줄이 사람을 잘못 이끌 수 있습니다.** 새 문장은 「기존 배선에 명령 한 줄만 얹으면 된다」고 적었는데, 이름을 박아 놓은 그 워크플로(`label-sync.yml`)는 **라벨 파일이 바뀔 때만 도는** 워크플로입니다. 코드가 바뀌어도 안 돕니다. 그래서 후속 카드가 이 조언대로 그 워크플로에 커버리지를 얹으면 **영영 안 도는 게이트**가 만들어집니다 — 이 SPEC 이 애초에 걱정하던 「소리 없이 대기하는 게이트」와 똑같은 모양입니다. 이 점을 F-01 로 적었습니다.

그리고 정정이 **한 자리를 놓쳤습니다.** 같은 거짓 문장이 `.moai/reports/t13/run-done.md:65` 에 현재형으로 살아 있고, 하필 그 문장이 이번에 고친 §5 를 근거로 지목하고 있습니다. 카드의 훑기 범위가 SPEC 폴더 4개 파일뿐이어서 보고서 폴더까지 닿지 않았습니다(F-02).

차단 결함은 없습니다. **PASS 80.1** — 다만 아슬아슬한 통과이고, F-01 은 문장 한 절만 고치면 닫힙니다.

---

## 1. 차원 점수

| 차원 | 점수 | 판정 | 증거 (기계 검증 원문) |
|---|---|---|---|
| Functionality (40%) — 고쳐 쓴 명제가 참인가 | **82**/100 | PASS | `find .github -type f` → 4건, `label-sync.yml` 실재 / `grep -rn "coverage" .github .git_hooks` → `EXIT=1` (적중 0) / `.git/hooks/pre-commit` `-rwxr-xr-x 3245` 설치·실행권한 확인. 핵심 명제 참. 감점 사유: 트리거 서술의 `paths:` 누락과 그로부터 파생된 처방 문장(F-01), 배선 열거 누락(F-03) |
| Security (25%) | **85**/100 | PASS | 보안 관련 서술·코드 변경 없음. 변경 2 파일 전부 마크다운 산문. 비밀정보·입력 검증·권한 서술 무변경 — 중립 처리 |
| Craft (20%) — 문언 정밀도·표/기록 정합 | **76**/100 | PASS | `sed -n '308,320p' acceptance.md` 로 표 3열(상황/기대 동작/덮는 기준) 확인 → 새 셀은 «기대 동작» 이 아니라 현재 사실이며 «상황» 셀과 정면 충돌(F-04). HISTORY 「본문 문언 정정 1건」 vs 「두 자리」 자기모순(F-05) |
| Consistency (15%) — SPEC·보고서·CHANGELOG 일치 | **78**/100 | PASS | `CHANGELOG.md:56` 과 `spec.md:206`·`acceptance.md:317` 3자 서술 일치 확인. 감점: `run-done.md:65` 미정정(F-02), `spec.md` HISTORY `0.2.0`↔`0.2.1` 상호 모순 무표시(F-06) |

**조화평균 = 4 / (1/82 + 1/85 + 1/76 + 1/78) = 4 / 0.0499382 = 80.10**

Must-pass 방화벽: Functionality 82 ≥ 80 **통과**, Security 85 ≥ 80 **통과**.

## 최종 판정: **PASS (80.1)** — 차단 0건 · 비차단 6건

차단 0건의 근거는 셋입니다. ① 고친 두 자리의 **핵심 명제가 재측정으로 참**임을 확인했다(§3). ② 커밋 전문 판독 결과 **요구사항·수용 기준·설계 결정·범위 경계가 하나도 바뀌지 않았다**(F-07 판정). ③ 잔여 거짓 문장 훑기 결과 **현재 상태를 서술하는 SPEC 본문에는 0건**이다(§4). F-01 은 심각도 High 이나, 이름 박힌 두 배선 중 하나(`pre-commit`)에 대해서는 그 처방이 참이므로 차단으로 올리지 않았습니다.

---

## 2. 발견 (Findings)

### F-01 — 「기존 배선에 한 줄 얹으면 된다」는 처방이 `label-sync.yml` 에 대해 거짓이다 · **비차단** · 심각도 High · 확신 높음

**주장**: `spec.md:206` 은 배선을 이름으로 적으며 트리거를 「`workflow_dispatch` + `main` push」라고만 서술하고, 이어서 「명령이 서면 **이미 있는 배선에 그것을 한 줄 얹기만 하면 되므로**」 그리고 「후속 카드가 할 일도 워크플로 디렉터리를 새로 만드는 것이 아니라 **기존 배선에 명령을 얹는 것**」이라고 처방한다. 그러나 그 push 트리거는 **경로 필터가 걸려 있어** 라벨 파일과 워크플로 자기 자신이 바뀔 때만 발화한다.

**실행한 명령**: `cat -n .github/workflows/label-sync.yml`

**관측 원문 (13~29행)**:
```
    13	on:
    14	  workflow_dispatch:
    ...
    24	  push:
    25	    branches:
    26	      - main
    27	    paths:
    28	      - ".github/labels.yml"
    29	      - ".github/workflows/label-sync.yml"
```

**왜 중요한가**: 후속 카드가 이 처방을 GitHub Actions 방향으로 읽고 `label-sync.yml` 에 커버리지 잡을 더하면, `server/` 코드가 아무리 바뀌어도 그 잡은 **한 번도 발화하지 않는다**. 즉 「소리 없이 대기하는 게이트」— 이 SPEC 이 §5 와 CHANGELOG 에서 스스로 경고한 바로 그 실패 모양 — 를 새로 만든다. F-03 이 지적한 해악(「후속 카드가 잘못 판단한다」)이 **반대 방향으로 재생산**된 형태다. `paths:` 를 생략한 트리거 서술이 이 오독을 직접 가능하게 한다.

**과소·과대 판정**: 이 대목은 **OVERCLAIM** 이다. 「배선이 있다」에서 「그 배선을 재사용하면 된다」로 넘어가는 추론을 검증 없이 실었다(VCI §1.1 surface 4 — 권고의 전제 미검증).

**위치**: `.moai/specs/SPEC-COVERAGE-001/spec.md:206` (동일 처방이 `CHANGELOG.md:56` 에도 있으나 그것은 `t13` 산출물로 이 카드의 범위 밖)

**필요한 수정**: 트리거 서술을 「`workflow_dispatch` + `main` push(단, `.github/labels.yml` 경로 필터)」로 정확히 적고, 처방 절을 「기존 `.github/workflows/` 디렉터리에 잡을 더하거나 `.git_hooks/pre-push` 에 명령을 얹으면 된다 — `label-sync.yml` 은 경로 필터가 걸려 있어 재사용 대상이 아니다」로 좁힌다.

---

### F-02 — 같은 거짓 명제가 `run-done.md:65` 에 현재형으로 살아 있고, 하필 고쳐진 §5 를 근거로 지목한다 · **비차단** · 심각도 Medium · 확신 높음

**주장**: 카드의 잔여 훑기는 `.moai/specs/SPEC-COVERAGE-001/` 4개 파일로만 범위를 잡았고(`plan-done.md:60` Gaps 가 스스로 밝힘), 보고서 폴더까지 닿지 않았다. 그 결과 `t13` run 단계 보고의 Residual-risk 에 「CI 배선이 **아직 없어**」가 현재형으로 남았다.

**실행한 명령**: `grep -rn --include="*.md" -e "배선이 없" -e "배선이 아직" -e "아직 그 배선" -e "CI 배선" . --exclude-dir=node_modules --exclude-dir=.git`

**관측 원문 (해당 행)**:
```
.moai/reports/t13/run-done.md:65:- **임계 게이트는 `coverage` 스크립트를 부르는 사람만 지나간다.** CI 배선이 아직 없어(이 카드 범위 밖, `spec.md` §5) 로컬에서 `npm run coverage -w server` 를 습관적으로 부르지 않으면 게이트는 소리 없이 대기한다. CI 배선이 후속 카드다.
```

**왜 중요한가**: 이 문장은 단순한 낡은 기록이 아니라 **`spec.md` §5 를 자기 근거로 인용**한다. §5 가 이제 정반대를 말하므로 그 포인터는 모순된 것을 가리킨다. 「정정이 스스로 낡은 기록을 남긴다」 부류의 정확한 재현이며, `t13` sync 단계가 `CHANGELOG.md`·`sync-done.md` 에서는 이 부류를 훑었으나 `run-done.md` 는 훑지 않았음이 드러난다.

**분류 판단**: 보고서는 단계 시점에 동결된 기록이므로 「그때 참이었던 자기 기록」으로 볼 여지가 있다. 그러나 ① 서술이 현재형(「아직 없어」)이고 ② 현재 문서를 근거로 지목한다는 두 성질 때문에, `spec.md` HISTORY 행과 같은 순수 자기 행위 기록과는 다르다. 그래서 **결함으로 분류**하되, 산출물이 아닌 동결 보고서라는 점에서 비차단으로 둔다.

**위치**: `.moai/reports/t13/run-done.md:65`

**필요한 수정**: 해당 행에 한 줄 각주 — 「(`t21` 정정 후: 배선은 있으나 커버리지를 부르는 CI 가 없다 — `spec.md` §5 개정본)」 — 을 덧붙인다.

---

### F-03 — 배선 열거가 설치된 훅 `pre-push` 를 빠뜨렸다 · **비차단** · 심각도 Low · 확신 높음

**주장**: `spec.md:206` 과 `acceptance.md:317` 은 자동 실행 배선을 「`label-sync.yml`·`pre-commit`」 **둘**로 괄호 안에 열거한다. 그러나 이 저장소에는 설치·실행권한을 가진 git 훅이 **둘** 있다.

**실행한 명령**: `ls -la /Users/byunjungwon/Dev/my-project-04/minidiscord/.git/hooks` · `grep -n "moai\|npm\|test\|go " .git_hooks/pre-push`

**관측 원문 (발췌)**:
```
-rwxr-xr-x@  1 byunjungwon  staff  3245  8월 26 17:00 pre-commit
-rwxr-xr-x@  1 byunjungwon  staff  2923  8월 26 17:00 pre-push
```
```
48:    printf '[pre-push] Hint: make fmt && make lint && make test\n' >&2
74:        printf '%s\n' "$SUBJECTS" | moai hook pre-push
```

**왜 중요한가**: 「그중 어느 것도 커버리지 명령을 부르지 않는다」는 **참**이다(`grep -rn "coverage" .git_hooks` 적중 0건이 `pre-push` 까지 덮는다). 따라서 명제는 무너지지 않는다. 그러나 괄호 열거가 **전수인 것처럼 읽히면서 실제로는 2/3** 이므로, 후속 카드가 「얹을 수 있는 자리」를 셀 때 하나를 놓친다. `pre-push` 는 `pre-commit` 보다 커버리지를 얹기에 오히려 적합한 자리다(커밋마다가 아니라 푸시마다 돈다).

**위치**: `.moai/specs/SPEC-COVERAGE-001/spec.md:206`, `.moai/specs/SPEC-COVERAGE-001/acceptance.md:317`

**필요한 수정**: 괄호에 `.git_hooks/pre-push` 를 더하거나, 열거를 「예: …」로 바꿔 전수가 아님을 밝힌다.

---

### F-04 — 표의 「기대 동작」 칸에 현재 사실이 들어갔고, 그것이 「상황」 칸과 충돌한다 · **비차단** · 심각도 Medium · 확신 높음

**주장**: `acceptance.md` 엣지 케이스 표의 열은 `상황 | 기대 동작 | 덮는 기준` 이다. 정정된 행의 「기대 동작」 칸은 **기대 동작이 아니라 현재 사실 서술**이며, 더구나 「상황」 칸의 전제를 부정한다 — 상황은 「CI 가 이 명령을 **부른다**」인데 기대 동작은 「기존 배선이 커버리지 명령을 **부르지 않는다**」이다.

**실행한 명령**: `sed -n '308,320p' .moai/specs/SPEC-COVERAGE-001/acceptance.md`

**관측 원문**:
```
310	| 상황 | 기대 동작 | 덮는 기준 |
...
316	| `npm test -w server` 만 돌린다 | 커버리지가 꺼져 있어 임계를 강제하지 않는다 (설계대로) | 미검증 — `spec.md` §4.2 가 계약으로 밝혔다 |
317	| CI 가 이 명령을 부른다 | 기존 배선(`.github/workflows/label-sync.yml`·`.git_hooks/pre-commit`)이 커버리지 명령을 부르지 않는다 | 범위 밖 (`spec.md` §5) |
```

**선행 여부 판정 (리드가 요구한 항목)**: 열-의미 불일치는 **정정 이전부터 있었다** — 옛 셀 「배선이 아직 없다」 역시 기대 동작이 아니라 사실 서술이었다. 그러나 **정정이 불일치를 악화시켰다**: 옛 셀은 상황에 답하지 않는 사실이었을 뿐이지만, 새 셀은 상황의 전제를 **정면으로 부정**한다. 같은 표의 316행이 진짜 기대 동작(「…임계를 강제하지 않는다 (설계대로)」)을 담고 있어 대조가 뚜렷하다.

**위치**: `.moai/specs/SPEC-COVERAGE-001/acceptance.md:317`

**필요한 수정**: 상황 칸을 「CI 에 이 명령을 태우려 한다」로, 기대 동작 칸을 「기존 배선 어디에도 커버리지 호출이 없으므로 새 잡·새 훅 단계를 더해야 한다 (이 카드 범위 밖)」로 고쳐 열 의미를 복원한다.

---

### F-05 — HISTORY 행이 「정정 1건」이라 적고 같은 문장에서 「두 자리」라 적는다 · **비차단** · 심각도 Low · 확신 높음

**주장**: `spec.md:23` 의 `0.2.1` 행은 「**본문 문언 정정 1건**」으로 열고 같은 행에서 「**두 자리**를 함께 고쳤다」고 적는다. 또한 고친 두 자리 중 하나는 `acceptance.md` 이므로 「**본문**」이라는 한정도 정확하지 않다.

**실행한 명령**: `git show 9e7280e --stat` · `grep -n "Out of Scope — CI 배선" .moai/specs/SPEC-COVERAGE-001/spec.md`

**관측 원문**:
```
 .moai/specs/SPEC-COVERAGE-001/acceptance.md | 2 +-
 .moai/specs/SPEC-COVERAGE-001/spec.md       | 5 +++--
 2 files changed, 4 insertions(+), 3 deletions(-)
```

**왜 중요한가**: 이 SPEC 은 스스로 세어 적은 숫자를 감사에서 두 번(F-04 단언 개수, F-05 등장 횟수) 틀린 이력이 있다. 세 번째 재현이다. 게이트 동작에는 영향이 없다.

**위치**: `.moai/specs/SPEC-COVERAGE-001/spec.md:23`

**필요한 수정**: 「문언 정정 1건(적용 자리 2곳 — `spec.md` §5, `acceptance.md` 엣지 케이스 표)」로 연다.

---

### F-06 — HISTORY `0.2.0` 은 F-03 을 「닫았다」고 적고, 바로 위 `0.2.1` 은 「닫히지 않아 이월됐다」고 적는다 · **비차단** · 심각도 Low · 확신 중간

**주장**: 인접한 두 HISTORY 행이 같은 발견에 대해 반대로 말하는데, 상호 참조 표시가 없다.

**실행한 명령**: `grep -rn "0\.2\.0" .moai/specs/SPEC-COVERAGE-001/ .moai/reports/t13/ .moai/reports/t21/ CHANGELOG.md`

**관측 원문 (`spec.md:24`, `0.2.0` 행 발췌)**:
```
비차단 3건(F-03 CI 부재 서술·F-04 단언 개수·F-05 등장 횟수)은 문서 정정으로 닫았다.
```
(`spec.md:23`, `0.2.1` 행은 같은 F-03 에 대해 「`t13` 이 `CHANGELOG.md` 에서만 좁히고 SPEC 본문에는 남겨 둔 채 카드 `t21` 로 이월한 건」이라고 적는다.)

**분류 판단**: `0.2.0` 행은 `t13` 의 **그때 자기 인식 기록**이므로 소급 수정 대상이 아니다(「본문은 지금 참, HISTORY 는 그때 참」). 이 저장소의 관례상 **올바르게 그대로 둔 것**에 가깝다. 다만 `0.2.1` 행이 그 모순을 명시적으로 지목하지 않아, 두 행을 순서대로 읽는 사람이 F-03 상태를 오독할 수 있다.

**위치**: `.moai/specs/SPEC-COVERAGE-001/spec.md:23`, `:24`

**필요한 수정**: `0.2.1` 행에 「(`0.2.0` 행의 «F-03 닫았다» 는 `CHANGELOG.md` 한 자리에 한정된 서술이었다)」 한 절을 더한다.

---

### F-07 — 범위 규율: 위반 없음 (판정 결과) · **비차단** · 확신 높음

**주장**: `9e7280e` 는 요구사항·수용 기준·설계 결정·범위 경계를 바꾸지 않았다 — 카드의 자기 주장이 아니라 이 감사가 diff 전문을 읽고 내린 의미 판정이다.

**실행한 명령**: `git show 9e7280e`

**의미 델타 판정 (줄 수가 아니라 뜻으로)**:
- `spec.md:205` (배제 **대상** — 「GitHub Actions 등에서 `npm run coverage -w server` 를 자동 실행하게 하는 일…」): **무변경**. 무엇이 범위 밖인지는 그대로다.
- `spec.md:206` (배제 **근거**): 변경. 근거만 바뀌고 결론(「이 카드의 선행 조건이 아니다」)은 동일하다. 단 처방 절이 새로 들어왔다 — F-01.
- `acceptance.md:317`: 「덮는 기준」 칸 「범위 밖 (`spec.md` §5)」 **무변경**. 어떤 AC 도 이 행에 걸려 있지 않으므로 검증 의무 변화 없음.
- frontmatter: `version` 만 이동, `status: completed` **유지**. 문언 정정이 SPEC 을 다시 열지 않는다는 판단은 타당하다.
- REQ / AC 블록: diff 에 한 줄도 없다.

**판정**: 범위 규율 **준수**. 새로 들어온 처방 절(F-01)은 범위 변경이 아니라 근거 문장의 과잉 확장이다.

---

## 3. 사실 재측정 — 고쳐 쓴 명제는 참인가

| 하위 명제 | 실행한 명령 | 관측 원문 | 판정 |
|---|---|---|---|
| 「자동 실행 배선 자체는 이 저장소에 있다」 | `find .github -type f` | `.github/labels.yml` `.github/branch-protection.json.gtmpl` `.github/workflows/label-sync.yml` `.github/actions/detect-language/action.yml` | **참** |
| 그 워크플로가 실제 트리거를 갖는가 | `cat -n .github/workflows/label-sync.yml` | `13 on:` `14 workflow_dispatch:` `24 push:` `26 - main` `27 paths:` | **참** (단 `paths:` 필터 — F-01) |
| `pre-commit` 이 `moai gate` 를 부르는가 | `grep -n "moai gate" .git_hooks/pre-commit` | `65:    if ! moai gate; then` | **참** (인용된 `:65` 정확) |
| 그 훅이 **실제로 발화하는가** (카드가 재지 않은 항목) | `git config --get core.hooksPath` → `EXIT=1` (미설정) · `ls -la .../.git/hooks` | `-rwxr-xr-x@ 1 byunjungwon staff 3245 8월 26 17:00 pre-commit` | **참** — `.git/hooks` 에 설치·실행권한 있음(추적본과 3245 바이트 동일). 「배선이 죽어 있다」는 제 가설은 **반증됐다** |
| 「그중 어느 것도 커버리지 명령을 부르지 않는다」 | `grep -rn "coverage" .github .git_hooks` → `EXIT=1` · `grep -rni` 도 `EXIT=1` | 출력 없음 | **참** (단 전이 호출은 grep 이 못 봄 — Gaps 1) |
| 하드코딩된 식별자가 이 트리에서 해석되는가 | 위 전부 + `sed -n '200,212p' spec.md`, `sed -n '308,320p' acceptance.md` | `spec.md:203` §5 제목 / `:206` 정정 문장 / `acceptance.md:317` 정정 행 | **전건 해석됨** — `plan-done.md` 의 `spec.md:205→206`·`acceptance.md:317` 행번호도 정확 |

**종합**: 핵심 명제 「배선은 있다 / 그중 어느 것도 커버리지를 부르지 않는다」는 **TRUE as written**. 과소주장(UNDERCLAIM)은 없다. 과대주장(OVERCLAIM)은 명제 자체가 아니라 **딸린 처방 절**에 있다(F-01), 그리고 열거 전수성에 있다(F-03).

## 4. 잔여 거짓 명제 훑기 — 적중 분류

**실행한 명령**:
```
grep -rn --include="*.md" --include="*.yml" --include="*.yaml" --include="*.json" --include="*.ts" \
  -e "배선이 없" -e "배선이 아직" -e "아직 그 배선" -e "배선 자체가 없" \
  -e "CI가 없" -e "CI 가 없" -e "CI 배선" -e "no CI" -e "No CI" -e "CI wiring" \
  . --exclude-dir=node_modules --exclude-dir=.git
```

**적중 총 26건. 분류**:

| 분류 | 건수 | 대표 위치 |
|---|---|---|
| (a) **현재형 거짓 주장 = 결함** | **1** | `.moai/reports/t13/run-done.md:65` — F-02 |
| (b) 과거형 자기 기록 = 올바르게 둠 | 6 | `spec.md:23`·`:24`, `progress.md:382`·`:401`, `sync-done.md:137`·`:146` |
| (c) 정정 **후** 문언 = 참 | 3 | `CHANGELOG.md:56`, `spec.md:206`(§5 본문), `acceptance.md:317` |
| (d) 감사 보고서의 F-03 원문 = 결함 기술이므로 정상 | 6 | `sync-audit.md:23`·`:261`·`:274`·`:379`·`:384`·`:456` |
| (e) `t21` 자기 보고서 = 이 카드 기록 | 6 | `plan-done.md:13`·`:21`·`:26`·`:34`·`:35`·`:48` |
| (f) **다른 주제 오탐** — 「배선」이 코드 wiring, 「CI 가 없어」가 원격 CI 부재(참) | 10 | `SPEC-SSE-001/plan.md:205`, `SPEC-CHANWIRE-001/*`, `SPEC-PERM-001/acceptance.md:420`, `.moai/reports/t10/*`(전부 「원격 CI 가 없어 재현 불가」 — 미푸시 브랜치 사실로 **참**), `.claude/skills/*` |

**현재 상태를 서술하는 SPEC 본문 자리의 거짓 명제: 0건.** 유일한 (a) 는 SPEC 본문이 아니라 동결 보고서다.

## 5. `plan-done.md` 진실성 표본 재현 (5건)

「돌리지 않은 grep 을 인용한」 이 저장소의 기록된 사고를 되풀이하지 않기 위해, 인용된 명령을 **글자 그대로 다시 실행**했다.

| 출처 | 인용된 관측 | 제가 재실행한 결과 | 재현 |
|---|---|---|---|
| §2 1행 `find .github -type f` | 4개 파일 열거 | 4개 파일, 이름·순서 완전 일치 | **일치** |
| §2 4행 `grep -rn "coverage" .github .git_hooks` | 「적중 0건 (출력 없음)」 | 출력 없음, `EXIT=1`. 대소문자 무시(`-i`)로도 0건 | **일치** |
| §2 3행 `grep -n "moai gate\|coverage" .git_hooks/pre-commit` | 「`:65` `    if ! moai gate; then`」 | 적중 **4건**(`:2` `:61` `:65` `:66`). `:65` 원문은 인용과 공백까지 동일 | **일치하나 주의** — 셀이 4건 중 1건만 보였다. 건수를 주장하지 않았으므로 거짓은 아니지만 「관측한 원문」 칸으로는 선택 인용이다 |
| §5 3행 변경 규모 | 「2 파일, +4/-3」 | `git show 9e7280e --stat` → `2 files changed, 4 insertions(+), 3 deletions(-)` | **일치** |
| §5 1행 잔여 훑기 | 「적중 2건, 둘 다 과거 기록」 | 동일 패턴 재실행 → `progress.md:382`, `spec.md:23` 정확히 2건, 둘 다 과거 기록 | **일치** |

**재현되지 않은 수치: 0건.** `plan-done.md` §2·§5 는 진실하다. 다만 §5 1행의 훑기 **범위**가 SPEC 폴더로 한정된 사실이 표에 드러나지 않아 F-02 를 놓쳤다 — §6 Gaps 3번째 항목이 그 한정을 스스로 밝히고 있으므로 은폐는 아니다.

---

## 5절 증거 블록

### Claim (주장)
카드 `t21` 의 커밋 `9e7280e` 는 `SPEC-COVERAGE-001` 두 자리의 「이 저장소에 CI 배선이 없다」는 거짓 명제를 「배선은 있으나 그중 어느 것도 커버리지 명령을 부르지 않는다」로 정정했고, **정정된 핵심 명제는 이 트리의 독립 재측정으로 참이며**, 요구사항·수용 기준·설계 결정·범위 경계는 바뀌지 않았다. 차단 결함 0건, 비차단 6건, 조화평균 80.1 로 **PASS**.

### Evidence (증거)
```
$ git rev-parse HEAD
3c6137260ad2c728fd3502065e3124ec23576a78

$ find .github -type f
.github/labels.yml
.github/branch-protection.json.gtmpl
.github/workflows/label-sync.yml
.github/actions/detect-language/action.yml

$ grep -rn "coverage" .github .git_hooks ; echo EXIT=$?
EXIT=1

$ grep -rni "coverage" .github .git_hooks ; echo EXIT=$?
EXIT=1

$ grep -n "moai gate" .git_hooks/pre-commit
2:# MoAI-ADK pre-commit hook — fast subset (gofmt + go vet) + heavy gate (moai gate)
61:# --- Heavy gate: vet + lint + test via 'moai gate' (16-language toolchain detection) ---
65:    if ! moai gate; then
66:        printf '\n[pre-commit] FAILED: moai gate reported errors above.\n' >&2

$ git config --get core.hooksPath ; echo EXIT=$?
EXIT=1

$ ls -la <git-common-dir>/hooks   # 발췌
-rwxr-xr-x@  1 byunjungwon  staff  3245  8월 26 17:00 pre-commit
-rwxr-xr-x@  1 byunjungwon  staff  2923  8월 26 17:00 pre-push

$ cat -n .github/workflows/label-sync.yml   # 발췌
    24	  push:
    25	    branches:
    26	      - main
    27	    paths:
    28	      - ".github/labels.yml"
    29	      - ".github/workflows/label-sync.yml"

$ git show 9e7280e --stat
 .moai/specs/SPEC-COVERAGE-001/acceptance.md | 2 +-
 .moai/specs/SPEC-COVERAGE-001/spec.md       | 5 +++--
 2 files changed, 4 insertions(+), 3 deletions(-)

$ sed -n '308,320p' .moai/specs/SPEC-COVERAGE-001/acceptance.md   # 발췌
310	| 상황 | 기대 동작 | 덮는 기준 |
317	| CI 가 이 명령을 부른다 | 기존 배선(`.github/workflows/label-sync.yml`·`.git_hooks/pre-commit`)이 커버리지 명령을 부르지 않는다 | 범위 밖 (`spec.md` §5) |

$ sed -n '200,212p' .moai/specs/SPEC-COVERAGE-001/spec.md   # 발췌
203	### Out of Scope — CI 배선
206	- 배제 근거: 자동 실행 배선 **자체는 이 저장소에 있다** — … **다만 그중 어느 것도 커버리지 명령을 부르지 않는다.** …

$ grep -rn "배선이 없다\|배선이 아직 없다\|아직 그 배선" .moai/specs/SPEC-COVERAGE-001/
.moai/specs/SPEC-COVERAGE-001/progress.md:382  (과거 기록)
.moai/specs/SPEC-COVERAGE-001/spec.md:23       (과거 기록)
→ 적중 2건, 현재 상태 서술 자리 0건

$ grep -rn ... (전체 저장소 확대 훑기)
.moai/reports/t13/run-done.md:65: … CI 배선이 아직 없어(이 카드 범위 밖, `spec.md` §5) …   ← 유일한 (a) 분류
```

### Baseline-attribution (기준선 귀속)
- **감사 HEAD**: `3c6137260ad2c728fd3502065e3124ec23576a78` (브랜치 `WT-ci-wiring-words`)
- **판정 대상 커밋**: `9e7280e1633921bccd706b27b8b3a1d856d3ba83`
- **작업 트리**: `.claude/worktrees/t21` (`git rev-parse --git-dir` → `…/.git/worktrees/t21` 로 워크트리 확인)
- 위 모든 관측은 **이 감사 세션이 이 HEAD 의 이 트리에서 직접 실행**했다. `plan-done.md`·`sync-audit.md`(t13)·`sync-done.md` 의 어떤 수치도 근거로 승계하지 않았고, §5 는 오히려 그 수치를 **반증 목적으로 재실행**한 것이다.

### Gaps (미검증 — 명시적으로 관측하지 않은 것)
1. **`moai gate` 를 실행하지 않았다.** `pre-commit:65` 가 `moai gate` 를 부르는 것은 확인했으나, `moai gate` **내부**가 커버리지를 호출하지 않는다는 것은 재지 않았다. 「어느 것도 커버리지 명령을 부르지 않는다」의 근거인 `grep` 은 **파일 텍스트만 보므로 전이 호출을 못 본다**. `server/package.json` 의 `test: "vitest run"`(커버리지 없음) / `coverage: "vitest run --coverage"` 분리를 읽어 개연성은 높다고 판단했으나, 이는 추론이지 관측이 아니다.
2. **GitHub Actions 를 실제로 발화시키지 않았다.** `label-sync.yml` 의 트리거는 파일 내용으로만 판정했다. 원격이 없어(미푸시 브랜치) 실행 관측 수단 자체가 없다.
3. **`.git_hooks/pre-commit` 을 실제로 발화시키지 않았다.** 설치·실행권한·바이트 크기 일치까지만 관측했고, 훅을 돌려 보지는 않았다.
4. **`.git/hooks/pre-commit` 내용을 바이트 대조하지 않았다.** 크기(3245)만 일치를 확인했고 해시 대조는 하지 않았다 — 워크트리 격리 가드가 교차 경로 명령을 거부해 단순 `ls` 로만 관측했다.
5. **`.github/actions/detect-language/action.yml` 을 읽지 않았다.** 어떤 워크플로도 이것을 참조하지 않는다는 것(유일 워크플로가 `label-sync.yml` 뿐)까지만 확인했고, 파일 본문은 열지 않았다.
6. **다른 SPEC 폴더의 유사 거짓 명제는 문자열 훑기로만 판정했다.** `SPEC-SSE-001`·`SPEC-CHANWIRE-001`·`SPEC-PERM-001` 적중은 「배선」이 코드 wiring 을 뜻하는 오탐으로 문맥 판독했으나, 각 SPEC 의 CI 서술 전수는 훑지 않았다.
7. **`.moai/reports/` 전체는 훑지 않았다.** 훑은 것은 위 grep 패턴에 걸린 파일뿐이며, 같은 명제를 다른 표현으로 적은 자리가 있을 가능성은 배제하지 못했다.
8. **테스트·빌드·커버리지를 돌리지 않았다.** 문서 전용 카드이므로 의도적으로 생략했다 — 코드 변경이 0 임을 `git show` 로 확인한 데 근거한다.

### Residual-risk (잔여 위험)
1. **F-01 이 방치되면 후속 카드가 안 도는 게이트를 만든다.** 이 SPEC 이 스스로 경고한 「소리 없이 대기하는 게이트」와 같은 실패 모양이며, 만들어진 뒤에는 **초록으로 보이기 때문에** 발견이 늦다. 감사 시점에는 그 코드가 없어 실행으로 재현할 수 없었다.
2. **하드코딩된 파일 이름의 부패 위험.** `spec.md:206`·`acceptance.md:317` 이 `label-sync.yml` 을 문자 그대로 박았다. 그 파일이 이름이 바뀌거나 삭제되면 정정 문장이 **다시 거짓**이 되며, 이를 잡아 줄 기계 검증은 없다. 카드가 §7 에서 이 맞바꿈을 인지하고 구체성을 택했다고 밝힌 점은 적절하다.
3. **`moai gate` 의 향후 변경.** `moai gate` 는 저장소 밖 바이너리다. 그것이 훗날 커버리지를 부르도록 바뀌면, SPEC 본문의 「어느 것도 커버리지 명령을 부르지 않는다」가 **저장소를 한 줄도 고치지 않은 채** 거짓이 된다.
4. **브랜치 미푸시 — 이 워크트리가 유일 사본이다.** `WT-ci-wiring-words` 에는 원격이 없다. 리드가 통합하기 전에 나무를 지우면 정정과 이 감사 보고가 함께 사라진다.
5. **F-02 의 분류가 판단이다.** 동결 보고서의 현재형 서술을 「결함」으로 볼지 「그때 기록」으로 볼지는 규칙이 명시하지 않는 경계다. 운영자가 후자로 판단하면 F-02 는 소멸하고 Consistency 점수가 올라간다.

---

## 권고 (우선순위 순)

1. **F-01 을 닫는다** — `spec.md:206` 의 트리거 서술에 `paths:` 필터를 명시하고, 「기존 배선에 한 줄」 처방을 「`.github/workflows/` 에 새 잡을 더하거나 `.git_hooks/pre-push` 에 명령을 얹는다」로 좁힌다. 한 문장 수정이며 이것만으로 가장 큰 실질 위험이 사라진다.
2. **F-02 를 닫는다** — `run-done.md:65` 에 `t21` 정정 각주를 단다. 이 저장소가 이미 여러 번 대가를 치른 「정정이 스스로 낡은 기록을 남긴다」 부류다.
3. **F-04 를 닫는다** — `acceptance.md:317` 의 상황·기대 동작 칸을 열 의미에 맞게 다시 쓴다.
4. **F-03·F-05·F-06 은 묶어서 처리 가능** — 배선 열거에 `pre-push` 추가, HISTORY 「1건/두 자리」 표현 통일, `0.2.1` 행에 `0.2.0` 모순 각주. 셋 다 한 줄씩이다.
5. **후속 카드 발급 시 F-01 의 내용을 카드 본문에 옮겨 적는다** — 「CI 에 커버리지 배선」 카드가 발급되면, `label-sync.yml` 이 재사용 대상이 아니라는 사실을 카드가 직접 들고 가야 §5 를 다시 읽고 오독하는 일이 없다.

---

*감사자*: `sync-auditor` (독립 회의적 평가) · *감사 일시*: 2026-08-29 · *HEAD*: `3c61372`
