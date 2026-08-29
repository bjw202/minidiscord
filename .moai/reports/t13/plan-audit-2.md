# SPEC 계획 감사 보고 (2회차) — 카드 `t13` / `SPEC-COVERAGE-001`

| 항목 | 값 |
|---|---|
| 감사 대상 | `.moai/specs/SPEC-COVERAGE-001/` (spec.md · plan.md · acceptance.md · progress.md), 버전 `0.1.1` |
| 반복 | 2회차 / 3 — **델타 한정**(Retry Loop Contract) |
| 트리 | `.claude/worktrees/t13`, 브랜치 `WT-coverage-tool`, HEAD `34b8107` |
| Tier | S (PASS 임계 **0.75**) |
| **판정** | **PASS** |
| 종합 점수 | **0.88** (조화평균) · 산술평균 0.8875 |
| 1회차 차단 7건 | **7건 전부 종결** |
| 1회차 비차단 8건 | 7건 종결 · 1건 부분(N-07) |
| 새 발견 | 차단 **2건** (Major 1 · Minor 1) · 비차단 1건 |

> M1 Context Isolation — 작성자의 추론 맥락은 무시했다. 판단 근거는 디스크의 산출물과 이 감사가 **직접 실행한 명령의 출력**뿐이다.

---

## 0. 쉬운 말 요약

1회차에서 막았던 문제 일곱 가지가 **전부 실제로 고쳐졌다.** 말로만 고쳤다고 적은 것이 아니라, 이 감사가 그 고친 것들을 하나씩 돌려 봤다.

가장 중요한 것부터 말하면, 1회차에서 "이 기준은 아무것도 재지 않는다"고 지적했던 임계 검사가 이제 **진짜로 잰다.** 설정 파일의 숫자를 잠깐 98로 올려 돌렸더니 명령이 정확히 문서에 적힌 그 문장(`does not meet global threshold (98%)`)을 내며 실패했고, 되돌리니 통과했다. 아무도 실행해 본 적 없던 회귀 짝 테스트 코드도 이 감사가 파일을 실제로 만들어 돌려 봤는데 **일곱 단언이 전부 통과**했고, 문서가 지정한 변이 세 가지가 각각 겨냥한 단언을 정확히 하나씩 무너뜨렸다. 문서가 변이를 지정하지 않은 주석 검사(단언 7)까지 따로 시험해 봤는데 그것도 이빨이 있었다.

덤으로, 개정본이 "확인하지 못했고 대신 우회했다"고 적어 둔 질문 하나를 이 감사가 풀었다. **테스트가 하나라도 실패하면 vitest 는 커버리지 임계 검사를 아예 하지 않는다** — 커버리지 보고서 자체를 찍지 않는다. 즉 개정본이 넣은 우회책(프로브 돌릴 때 계약 테스트를 잠시 빼기)은 군더더기가 아니라 **없으면 그 기준이 성립하지 않는** 필수 장치였다. 우회가 옳았다.

그런데도 고쳐야 할 것이 둘 남았다. 하나는 범위 경계 기준의 명령 **모양**이다. 내용은 맞는데(이 감사가 현실적인 파일 목록으로 돌려 봤더니 정확히 네 줄이 나온다), 그 명령을 카드 워크트리 안에서 실행하면 도구가 **거부한다** — 이 감사가 세 번 재현했다. 다른 하나는 계획서의 단계 순서 탓에, "제외해도 커버리지 총계가 안 변한다"는 확인이 정작 확인할 대상이 없는 시점에 이뤄져 **아무것도 재지 않게** 되는 자리다.

둘 다 값싸게 고칠 수 있고, 무엇을 만들어야 하는지에 대한 판단은 **하나도 바꿀 필요가 없다.** 1회차 결함과 결정적으로 다른 점은, 남은 둘은 잘못된 구현을 **통과시키지 못한다는 것**이다 — 하나는 즉시 시끄럽게 거부되고, 하나는 곁가지 관측이다. 1회차의 AC-003 은 기능이 통째로 없어도 초록이었다. 그 차이가 이번 판정이 갈린 이유다.

---

## 1. Claim (주장)

| # | 주장 |
|---|------|
| B1 | 1회차 차단 7건(F-01..F-07)이 **전부 종결**됐다 — 5건은 이 감사가 실행으로 재확인했다 |
| B2 | **AC-COVERAGE-004 의 테스트 코드는 지금 형태 그대로 통과한다** — 일곱 단언 전부. 아무도 실행한 적 없던 버전을 이 감사가 처음 돌렸다 |
| B3 | 변이 셋이 **각각 겨냥한 단언을 정확히 하나씩** 실패시킨다. 매번 실패 테스트는 계약 테스트 하나뿐이다 |
| B4 | 문서가 변이를 지정하지 않은 **단언 7(주석 검사)도 이빨이 있다** — 주석을 지우니 그 테스트만 실패했다 |
| B5 | `--exclude 'test/coverage-contract.test.ts'` 는 이 vitest 버전(4.1.11)에서 **작동하며**, 그 제외는 커버리지 총계를 **바꾸지 않는다**(양쪽 다 `97.01% (325/335)`) |
| B6 | **테스트가 실패하면 vitest 는 임계 검사를 아예 하지 않는다.** 따라서 `--exclude` 우회는 불필요한 복잡성이 아니라 **필수**다 — 개정본의 미해결 질문을 이 감사가 해소했다 |
| B7 | `major()` 파싱은 `^4.1.11`→`4`, `^3.0.0`→`3` 을 정확히 낸다 |
| B8 | AC-COVERAGE-005 의 제외 규칙은 현실적 파일 목록에서 **정확히 선언된 네 줄**을 낸다 |
| B9 | 그러나 **AC-COVERAGE-005 의 관측 2·3 은 카드 워크트리 안에서 실행이 거부된다** (새 발견 NEW-01) |
| B10 | `plan.md` 단계 순서 탓에 `acceptance.md`:143 의 «제외의 무해함» 관측이 **공허해진다** (새 발견 NEW-02) |
| B11 | 개정본이 새로 넣은 서술 중 **실행하지 않은 것을 검증했다고 적은 자리는 없다** — 인용된 1회차 관측 다섯 자리를 전부 원 보고서와 대조했다 |
| B12 | 필수 통과 기준: MP-1·3·5·7 PASS(델타에서 교란 없음), MP-2 PASS, MP-4·6 N/A. 실패 없음 |

---

## 2. 종결 표 (1회차 발견 15건)

### 2.1 차단 7건

| ID | 판정 | 근거 |
|---|---|---|
| **F-01** 임계 프로브가 아무것도 재지 않음 | **종결** | 주·부 경로가 맞바뀌었다(`acceptance.md`:110-147). 이 감사가 설정에 `lines: 98` 을 심고 **오버라이드 없이** 실행 → `PROBE_A_EXIT=1` + `ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)` (E3). `85` 로 되돌려 실행 → `PROBE_B_EXIT=0` (E2). 이제 이 기준은 설정 파일이 없으면 통과할 수 없다. CLI 오버라이드는 `acceptance.md`:141 에서 «REQ-004 의 근거가 아니다» 로 명시 강등됐다 |
| **F-02** `json-summary` 리포터를 요구하는 REQ 부재 | **종결** | 세 자리가 함께 갔다 — `spec.md`:113(REQ-002 에 `reporter: ['text','json-summary']`), `acceptance.md`:182(단언 3b), `plan.md`:160(변이 3행). 이 감사가 그 설정으로 돌리니 `server/coverage/coverage-summary.json` 이 **실제로 생겼고**, AC-002 판독 명령이 원문 그대로 `LINES_PCT=97.01 / HAS_INDEX=true / FILE_COUNT=11` 을 냈다 (E2). 변이 3 은 단언 3b 만 무너뜨렸다 (E6) |
| **F-03** 테스트 코드가 임포트 없이 죽음 | **종결** | `acceptance.md`:163 첫 줄 `import { it, expect } from 'vitest'`. 이 감사가 그 코드 블록을 **문서에서 그대로 추출**해 실행했고 `✓ test/coverage-contract.test.ts > coverage tooling contract holds` 가 나왔다 (E4) |
| **F-04** 범위 경계가 신규 파일을 못 봄 | **종결** (단 NEW-01 참조) | `acceptance.md`:230-231 이 «추적 ∪ 미추적» 합집합 + `grep -v '^\.moai/'` 로 교체됐다. 현실적 파일 목록에 규칙을 적용하니 **정확히 선언된 네 줄**이 정렬 순서까지 일치했다 (E8). 거짓 실패는 사라졌다. 다만 그 **명령의 형태**가 실행 거부된다 — 별건 발견 NEW-01 |
| **F-05** Q1 낡은 기록 17군데 | **종결** | 1회차와 **같은 grep** 재실행: `grep -n "Q1\|판정 대기\|무르면\|승인 시" .moai/specs/SPEC-COVERAGE-001/*.md` → 출력 없음, `EXIT=1` (E1). 추가로 조건부 어휘(`조건부·미결·보류·반려·철회·택일·기다`)를 훑었으나 남은 것은 전부 «조건부 아님» 을 **부정하는** 서술뿐이다. 승인 기록 9군데가 전부 무조건형이다 |
| **F-06** 한국어 주석 조항을 아무도 재지 않음 | **종결** | (나) 선택. `spec.md`:140 이 «상단 다섯 줄 안 + `index.ts`·`process.argv` 병기» 로 관측 가능한 형태로 좁혔고, `acceptance.md`:25 가 문자열 검사 금지의 **유일한 예외**로 사유와 범위를 못 박았다. 문서가 변이를 지정하지 않았으므로 이 감사가 직접 변이했다 — 주석 3줄을 삭제하니 `AssertionError: expected 'import { defineConfig } from ...' to contain 'index.ts'` 로 **그 테스트만** 실패했다 (E7). 조항에 이빨이 있다 |
| **F-07** 메이저 대역 조항을 아무도 재지 않음 | **종결** | `acceptance.md`:189-190(단언 6) + `plan.md`:159(`^3.0.0` 변이). `major()` 파싱을 직접 돌려 `^4.1.11→4`·`^3.0.0→3` 확인(E9), 변이를 실제로 넣으니 `expected '3' to be '4'` 로 **그 테스트만** 실패했다 (E5). `server/package.json` 이 `vitest: "^4.1.11"` 을 선언하고 있어 단언 6 의 우변도 해결된다 |

### 2.2 비차단 8건

| ID | 판정 | 근거 |
|---|---|---|
| N-01 미커버 8행 → 5행 | **종결** | `plan.md`:54 «미커버 5행(66·67·68·71·72 — 라인 25/30 = 83.33%)» |
| N-02 블록 범위 66-73 → 65-74 | **종결** | `spec.md`:69·140 이 «블록 65-74행, 미커버로 잡히는 구간은 66-68·71-72» 로 형제 형식을 따랐다. 원문 대조: `server/src/index.ts` 65행이 `if (process.argv[1]?...)`, 74행이 닫는 `}` (E10). 55행 구문 예외도 `spec.md`:144 · `plan.md`:56 에 명시됐다 |
| N-03 `npm ERR!` → `npm error` | **종결** | `acceptance.md`:274 로 교정. 이 감사가 복원 도중 재현: `npm error Missing script: "coverage"` (E11) |
| N-04 고아 AC-006 | **종결** (제3안, 아래 §3 에서 별도 평가) | `acceptance.md`:267 + `progress.md`:41 에 «의도적 무매핑» 사유가 기록됐다 |
| N-05 Tier S 산출물 이탈 | **종결** | `progress.md`:12 가 `spec-workflow.md § SPEC Complexity Tier` 를 명시 인용하고 이탈 사유와 REQ/AC 상한 준수를 함께 적었다 |
| N-06 «값으로 읽으면 두 방향이 닫힌다» 과잉 주장 | **종결** | `acceptance.md`:204 가 «해석된 설정이 아니라 원본 객체를 읽는다», «두 기준이 함께 있어야 닫힌다» 로 정정했다 |
| N-07 `echo "EXIT=$?"` 가 아무것도 안 잼 | **부분** | `acceptance.md`:229 가 `test -z "$(git diff --stat ...)"` 로 **의미는 교정**했다. 그러나 그 형태 역시 워크트리 안에서 실행 거부된다 (E12) → NEW-01 에 흡수 |
| N-08 «셋» / «집합» 용어 불일치 | **종결** | `spec.md`:170 이 «코드 산출물로 손대는 파일은 정확히 **넷**» 으로 고쳐 `package-lock.json` 을 포함시켰고, `acceptance.md`:259 가 같은 낱말로 «같은 집합» 임을 적었다. 두 자리의 네 줄이 문자 단위로 일치한다 |

### 2.3 1회차 §9 잔여 위험 4건

| 위험 | 판정 | 근거 |
|---|---|---|
| R1 — F-02 교정이 세 자리를 함께 가야 한다 | **해소** | REQ-002(`spec.md`:113) · 단언 3b(`acceptance.md`:182) · 변이 3행(`plan.md`:160) 이 전부 존재하고 서로를 인용한다. 이 저장소가 이름 붙인 «하나를 고치며 요약표를 못 따라감» 부류가 재발하지 않았다 |
| R2 — `.moai/` 제외 규칙의 형태 민감성 | **해소(의미)** | `acceptance.md`:253-257 이 규칙을 «경로가 `.moai/` 여섯 글자로 시작하는 줄만 버린다» 한 줄로 못 박고, 넓게/좁게 잡을 때 각각 무엇이 깨지는지 적었다. 실측으로 네 줄 일치 확인(E8). 형태 문제는 NEW-01 |
| R3 — `FILE_COUNT=11` 사유가 acceptance 본문에 없음 | **해소** | `acceptance.md`:105 가 사유·대가·갱신 책임 소재를 본문에 담았다. «나중에 이 기준만 읽는 사람» 이라는 1회차 지적의 표현까지 반영됐다 |
| R4 — 계약 테스트가 임계 판정을 가림 | **해소, 그리고 강화됨** | `acceptance.md`:143 + `plan.md`:120 이 `--exclude` 로 대응. 이 감사가 그 우회의 **필요성 자체를 실행으로 확정**했다 — 테스트가 실패하면 vitest 는 임계 검사를 아예 하지 않으므로(E13), 우회가 없으면 프로브 A' 는 임계 미달 메시지 **없이** 종료 1 을 내고 `acceptance.md`:132 의 관측 1 이 성립하지 않는다. 우회는 군더더기가 아니다 |

---

## 3. N-04 제3안에 대한 평가 (요청 항목)

개정본은 이 감사가 제시한 두 갈래(«REQ 로 승격» / «`plan.md` 절차로 강등») 중 어느 것도 고르지 않고 **제3안** — AC-006 을 무매핑으로 두되 그 무매핑이 절차 관측이라는 사유를 명시 기록 — 을 택했다. 근거로 판단한다.

**타당하다. 두 원안보다 낫다.** 이유 셋.

1. **범주 오류를 피한다.** REQ 집합은 «완성된 시스템이 만족해야 할 상태» 다. «run 단계가 전이 2 를 관측했다» 는 시스템의 성질이 아니라 절차의 사실이다. 승격안은 요구사항 집합에 다른 종류의 것을 섞는 대가를 치른다 — 이 감사가 그 대가를 충분히 따지지 않았다.
2. **강등안은 자기모순이었다.** 전이 2 가 잡으려는 것이 정확히 «그 단계를 건너뜀» 인데, 그것을 실행 절차로만 내리면 건너뛰어도 아무 기준도 빨개지지 않는다. `acceptance.md`:267 이 이 자기모순을 정확히 짚었다.
3. **기록이 두 자리에 일관되게 남았다.** `acceptance.md`:267(사유 전문)과 `progress.md`:41(매핑표의 «의도적 무매핑»)이 같은 사실을 적는다. 매핑표에 맨 `—` 만 남은 1회차 상태와는 다르다 — **침묵한 고아**와 **기록된 예외**는 다른 것이다.

부수 확인: AC-006 자신은 이분법으로 판정 가능하다. 전이 1 의 기대 문자열은 이 감사가 재현했고(E11), 전이 2 는 종료 코드 `1`, 전이 3 은 다른 네 기준의 통과로 정의된다.

---

## 4. 새 발견 (델타 회귀 훑기)

1회차와 **같은 결함 부류**로 개정된 문단만 훑었다 — 아무것도 재지 않는 기준, 굵은 변이, 자명하게 참인 단언, 실행하지 않고 검증했다고 적은 주장, 정정이 남긴 낡은 기록.

### 4.1 차단 (2건)

#### NEW-01 — AC-COVERAGE-005 의 관측 2·3 은 카드 워크트리 안에서 **실행이 거부된다** · Major · Class: blocking

- **위치**: `acceptance.md`:229(관측 2), :230-231(관측 3)
- **결함**: 두 명령의 **셸 형태**가 워크트리 격리 세션의 가드에 걸려 실행 자체가 거부된다. 이 감사가 문서에 적힌 형태 그대로, 이 워크트리에서 세 번 재현했다 (E12).
  - 관측 3 의 `{ …; …; } | grep | sort` 중괄호 그룹 파이프라인 → 거부
  - 관측 2 의 `test -z "$(git diff …)"` → 거부
  - 대조: git 을 전혀 쓰지 않는 `{ echo a; echo b; } | grep -v x | sort -u` 도 **동일하게 거부**된다 → 원인은 git 이 아니라 **복합 형태 자체**다
- **왜 차단인가**: AC-005 는 REQ-COVERAGE-007 의 **유일한** 수용 기준이고, DoD(`acceptance.md`:308)는 여섯 기준 전부의 원문 출력을 요구한다. 적힌 대로는 그 원문을 만들 수 없다. 더 나쁜 것은 이 결함이 `acceptance.md`:257 이 스스로 세운 목적 — «run 단계가 매번 다르게 해석할 여지를 남기지 않기» — 을 정면으로 무너뜨린다는 점이다. 거부당한 run 단계는 즉석에서 형태를 지어내게 되고, 그것이 바로 이 문단이 막으려던 상태다.
- **교정** (이 감사가 실행해 작동을 확인한 형태 — E12):
  ```bash
  # 관측 3 — 평범한 명령 셋으로 분해한다
  git diff --name-only <BASE_SHA> > /tmp/t13_scope.txt
  git ls-files --others --exclude-standard >> /tmp/t13_scope.txt
  grep -v '^\.moai/' /tmp/t13_scope.txt | sort -u

  # 관측 2 — 출력을 파일로 받고 크기로 판정한다
  git diff --stat <BASE_SHA> -- channel server/src > /tmp/t13_untouched.txt
  test -s /tmp/t13_untouched.txt; echo "NONEMPTY=$?"   # 1 이어야 통과
  ```
  `<BASE_SHA>` 는 **문자 그대로 박아 넣는다** — `SHA=$(…); git … > file` 형태도 거부됨을 확인했다. 2단 파이프(`grep … | sort -u`)는 허용된다(실행 확인).
- **주의(범위)**: 이 거부는 **워크트리 격리 세션**의 성질이다. 이 감사 세션이 그러하고, 칸반 규약상 카드 `t13` 의 run 레인도 같은 워크트리에서 돈다. 다만 run 레인 세션이 동일한 격리 플래그를 갖는지는 이 감사가 직접 관측하지 않았다(§6 Gaps).

#### NEW-02 — «제외의 무해함» 관측이 단계 순서 때문에 아무것도 재지 않는다 · Minor · Class: blocking

- **위치**: `acceptance.md`:143 ↔ `plan.md`:150·152 (단계 6 → 단계 7 순서)
- **결함**: `acceptance.md`:143 은 «제외되는 파일이 총계에 영향이 없다는 것은 가정이 아니라 **관측 대상**이다 — 프로브 출력의 `Lines :` 값이 기준선 `97.01% (325/335)` 와 같은지 함께 확인» 이라고 적었다. 그런데 `plan.md` 는 임계 프로브를 **단계 6**, 계약 테스트 생성을 **단계 7** 에 둔다. 즉 프로브를 돌리는 시점에 `server/test/coverage-contract.test.ts` 는 **아직 존재하지 않는다.** 없는 파일을 제외했으니 총계가 같은 것은 당연하고, 그 확인은 **자명하게 참**이 된다. 1회차가 F-01 로 지적한 것과 같은 부류이며(다만 곁가지 관측이라 파급은 훨씬 작다), «관측 대상이다» 라는 문장이 실제로는 거짓이 된다.
- **부수**: 같은 이유로 `acceptance.md`:133 의 관측 2(«실패한 테스트가 없다»)도 그 시점에는 자명하게 참이다. 그 항목은 계약 테스트가 존재할 때 의미가 생기는 안전장치이므로 별건으로 세지 않는다.
- **참고 — 사실 자체는 참이다**: 이 감사가 계약 테스트가 **있는** 상태에서 양쪽을 재 봤고, 제외 유무와 무관하게 `Lines : 97.01% (325/335)` 로 동일했다(E3·E2). 결함은 사실이 틀렸다는 것이 아니라 **문서가 재겠다고 선언한 자리에서 재지 못한다**는 것이다.
- **교정**: 둘 중 하나. (가) `acceptance.md`:143 에 «이 확인은 계약 테스트가 **존재하는 상태**에서 한다 — 단계 7 이후 프로브를 한 번 더 돌리거나, 단계 6 을 단계 7 뒤로 옮긴다» 를 명시한다. (나) 단계 순서를 바꿔 프로브를 단계 7 뒤에 둔다. (가)가 싸다.

### 4.2 비차단 (1건)

| ID | 심각도 | 위치 | 내용 / 교정 |
|---|---|---|---|
| NEW-03 | Low · Class: optional | `spec.md`:146 ↔ `acceptance.md`:196 | `spec.md`:146 은 «형제 `channel/vitest.config.ts` … 선례를 **그대로 따른다**» 고 적는데, 단언 7 은 주석에 `process.argv` 가 나타날 것을 요구한다. 실측: `channel` 의 주석 3줄에 `index.ts` 는 있으나 **`process.argv` 는 없다**(E14). 선례를 글자 그대로 베낀 구현은 단언 7 에서 실패한다. 규범 문장(`spec.md`:140)이 명확하므로 오구현 위험은 낮으나, «그대로 따른다» 를 «선례의 **방식**(제외 없이 주석)을 따르되 주석의 내용 요건은 §4.4 가 더 좁힌다» 로 한 줄 고치면 정정이 자기 기록을 낡게 두는 부류를 피한다 |

### 4.3 재발하지 않은 것 (명시)

- **실행하지 않은 것을 검증했다고 적은 자리 — 없다.** 개정본이 «plan 감사가 실행으로 확인했다» 로 인용한 다섯 자리(`acceptance.md`:132·139·200·251, `plan.md`:102)를 1회차 보고서의 E3·E6·E8 과 대조했고 전부 실제 관측과 일치했다. `spec.md`:23 의 HISTORY 행이 주장하는 «설계 결정 셋을 감사가 실행으로 확인» 도 1회차 E4·E7 에 근거가 있다.
- **굵은 변이 — 없다.** 변이 셋이 전부 한 줄 단위이고, 이 감사가 셋 다 돌려 실패 테스트가 매번 하나뿐임을 확인했다.
- **정정이 남긴 낡은 기록 — 발견되지 않음(NEW-03 제외).** 1회차 F-05 가 지적한 «한 곳에만 있다» 류의 자기반증 단언은 제거됐다. `plan.md`:74 의 «두 자리는 같은 사실을 적으며» 는 배타성 주장이 아니므로 같은 부류가 아니다.

---

## 5. Evidence (증거 — 실행한 명령과 원문 출력)

모든 명령은 `.claude/worktrees/t13`, HEAD `34b8107`, 2026-08-29 에 실행했다.

### E1 — F-05 재현 (1회차와 동일 명령)

```
$ grep -n "Q1\|판정 대기\|무르면\|승인 시" .moai/specs/SPEC-COVERAGE-001/*.md
GREP_EXIT=1
(출력 없음)
```

### E2 — 프로브 B' + AC-002 (정상 상태, 임계 85)

이 감사가 `server/vitest.config.ts`(제공자 v8 · `include: ['src/**']` · `reporter: ['text','json-summary']` · `thresholds: { lines: 85 }` · 상단 3줄 한국어 주석), `server/package.json` 의 `coverage` 스크립트와 `@vitest/coverage-v8` 선언, 그리고 `acceptance.md`:163-197 에서 **그대로 추출한** 계약 테스트를 만든 상태.

```
$ npm run coverage -w server
PROBE_B_EXIT=0

 Test Files  11 passed (11)
      Tests  105 passed (105)
Statements   : 96.5% ( 387/401 )
Branches     : 89.24% ( 166/186 )
Functions    : 97.43% ( 76/78 )
Lines        : 97.01% ( 325/335 )

$ ls -1 server/coverage/
coverage-summary.json                      ← 리포터 조항이 실제로 이 파일을 만든다 (F-02)

$ node -e "const s=require('./server/coverage/coverage-summary.json'); …"
LINES_PCT=97.01
HAS_INDEX=true
FILE_COUNT=11
EXIT=0
```

`acceptance.md`:300 이 새로 적은 «회귀 짝이 더해진 뒤 11 파일 / 105 테스트» 가 그대로 맞다.

### E3 — 프로브 A' (설정 임계 98, 오버라이드 없음, `--exclude` 동반)

```
$ npm run coverage -w server -- --exclude 'test/coverage-contract.test.ts'
PROBE_A_EXIT=1

> vitest run --coverage --exclude test/coverage-contract.test.ts
 Test Files  10 passed (10)              ← --exclude 가 실제로 작동한다 (11→10)
      Tests  104 passed (104)            ← 실패한 테스트 0 (관측 2 성립)
Lines        : 97.01% ( 325/335 )        ← 제외해도 총계가 기준선과 동일
ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)
```

`acceptance.md`:132 의 기대 문자열과 **글자 그대로** 일치한다. 네 관측 중 1·2·3 을 실행으로 확인했고, 4(해시 대조)는 §7 에서 증명했다.

### E4 — AC-004 테스트 코드, 지금 형태 그대로 (아무도 실행한 적 없던 버전)

`acceptance.md`:163-197 을 `sed` 로 **문서에서 직접 추출**해 파일로 만들었다(전사 오류 배제).

```
$ npm test -w server -- --reporter=verbose
EXIT=0
 ✓ test/coverage-contract.test.ts > coverage tooling contract holds 2ms
 Test Files  11 passed (11)
      Tests  105 passed (105)
```

**일곱 단언(1·2·3·3b·4·5·6·7)이 올바른 구현에서 전부 통과한다.** `import viteConfig from '../vitest.config.js'` 해석, `major()` 호출, 주석 첫 5줄 읽기까지 모두 문제없다.

### E5 — 변이 2 (`^3.0.0`) → 단언 6

```
$ npm test -w server -- --reporter=verbose
EXIT=1
 × test/coverage-contract.test.ts > coverage tooling contract holds 6ms
   → expected '3' to be '4' // Object.is equality
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)
```

### E6 — 변이 1(선언 줄 삭제) → 단언 1 · 변이 3(`json-summary` 삭제) → 단언 3b

```
[변이 1]  AssertionError: expected undefined to be truthy
          Test Files  1 failed | 10 passed (11)   Tests  1 failed | 104 passed (105)

[변이 3]  AssertionError: expected [ 'text' ] to include 'json-summary'
          (실패 지점: 20|   expect(cov.reporter).toContain('json-summary'))
          Test Files  1 failed | 10 passed (11)   Tests  1 failed | 104 passed (105)
```

세 변이 모두 **실패 테스트가 계약 테스트 하나뿐**이다 — `acceptance.md`:214 의 조준 요구를 만족한다.

### E7 — 문서가 지정하지 않은 변이: 주석 삭제 → 단언 7

```
$ (vitest.config.ts 의 한국어 주석 3줄 삭제 후)
$ npm test -w server -- --reporter=verbose
EXIT=1
AssertionError: expected 'import { defineConfig } from \'vitest…' to contain 'index.ts'
     33|   expect(head).toContain('index.ts')
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)
```

F-06 의 (나) 선택이 실제로 이빨을 갖는다.

### E8 — `major()` 파싱 · AC-005 제외 규칙

```
$ node -e "const major=(r)=>r.replace(/^[^\d]*/,'').split('.')[0]; …"
"^4.1.11" -> "4"     "^3.0.0" -> "3"     "~4.1.11" -> "4"     ">=4.0.0" -> "4"
EQ(^3.0.0,^4.1.11)= false

$ (현실적 run 단계 파일 목록 14줄에 규칙 적용)
$ grep -v '^\.moai/' /tmp/t13_union.txt | sort -u
package-lock.json
server/package.json
server/test/coverage-contract.test.ts
server/vitest.config.ts
줄 수: 4
```

`acceptance.md`:242-245 의 선언 집합과 **정렬 순서까지 정확히** 일치한다. 입력에 넣은 `.moai/` 항목 10건(SPEC 4파일 · `.spec-base-sha` · 감사 보고서 2건 · 트레이스 · 상태 2건)이 전부 걸러졌다.

### E9 — 실제 트리에서의 합집합 구성 요소

```
$ git diff --name-only HEAD
(출력 없음)

$ git ls-files --others --exclude-standard
.moai/logs/trace-5a341559-….jsonl
.moai/reports/t13/plan-audit.md
.moai/specs/SPEC-COVERAGE-001/{acceptance,plan,progress,spec}.md
.moai/state/config-cache.json
.moai/state/context-usage.json
```

`git ls-files --others` 가 디렉터리가 아니라 **개별 파일**을 낸다는 점, `--exclude-standard` 가 `.gitignore` 의 `coverage/` 를 존중한다는 점이 확인된다 — `acceptance.md`:251 의 서술대로다.

### E10 — 진입점 블록 범위 (N-02)

```
$ sed -n '63,76p' server/src/index.ts
63: }
64:
65: if (process.argv[1]?.includes('index.ts')) {
…
74: }
```

블록은 **65-74행**. `spec.md`:69·140 의 값이 맞다.

### E11 — AC-006 전이 1 기대 문자열 (N-03)

복원 과정에서 `coverage` 스크립트를 제거한 직후 재현.

```
$ npm run coverage -w server
EXIT=1
npm error Missing script: "coverage"
```

`acceptance.md`:274 와 일치한다.

### E12 — NEW-01: 실행 거부 재현과 교정안 검증

```
$ SHA=$(git rev-parse HEAD); { git diff --name-only "$SHA"; git ls-files --others --exclude-standard; } | grep -v '^\.moai/' | sort -u
→ 거부: "This session is isolated in the worktree …, but this command is too complex
   to verify that it stays inside the worktree. Refusing to run it …"

$ SHA=$(git rev-parse HEAD); test -z "$(git diff --stat "$SHA" -- channel server/src)"; echo "EMPTY=$?"
→ 거부 (동일 메시지)

$ { echo alpha; echo .moai/beta; } | grep -v '^\.moai/' | sort -u
→ 거부 (동일 메시지) — git 이 전혀 없는데도 거부되므로 원인은 복합 형태 자체다

[대조 — 허용되는 형태]
$ git rev-parse --verify "$SHA^{commit}"; echo "EXIT=$?"      → 34b81079…  EXIT=0   (관측 1 은 정상)
$ git diff --stat HEAD -- channel server/src; echo "RAW_EXIT=$?"  → RAW_EXIT=0 (단, 내용 유무와 무관 = N-07 이 지적한 그 문제)

[교정안 검증]
$ git diff --name-only HEAD > /tmp/t13_fix.txt;               STEP1=0
$ git ls-files --others --exclude-standard >> /tmp/t13_fix.txt; STEP2=0
$ grep -v '^\.moai/' /tmp/t13_fix.txt | sort -u;             STEP3_LINES=0   (현 트리에 코드 변경 없음 — 정상)
```

### E13 — 개정본이 미해결로 남긴 질문의 해소: 테스트가 실패하면 임계 검사가 **아예 없다**

설정 `lines: 98`, `--exclude` **없이** 실행(계약 테스트의 단언 4 가 필연적으로 깨지는 상태).

```
$ npm run coverage -w server
EXIT=1
 FAIL  test/coverage-contract.test.ts > coverage tooling contract holds
     22|   expect(cov.thresholds.lines).toBe(85)
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)
npm error command sh -c vitest run --coverage
```

출력 어디에도 `Statements/Branches/Functions/Lines` 요약도, `does not meet global threshold` 도 **없다.** vitest 4.1.11 은 테스트가 실패하면 커버리지 보고와 임계 판정을 건너뛴다. 따라서 `acceptance.md`:143 의 `--exclude` 우회는 **불필요한 복잡성이 아니라, 없으면 관측 1 이 성립하지 않는 필수 장치**다.

### E14 — NEW-03: 형제 선례와 단언 7 의 어긋남

```
$ sed -n '1,3p' channel/vitest.config.ts | grep -c 'process.argv'
0
$ sed -n '1,3p' channel/vitest.config.ts | grep -c 'index.ts'
1
```

### E15 — 필수 통과 기준 재확인 (델타 교란 여부)

```
$ grep -n "^\*\*REQ-COVERAGE" .moai/specs/SPEC-COVERAGE-001/spec.md
105,112,121,128,139,152,161 → REQ-COVERAGE-001..007  (결번·중복 없음, 3자리 영패딩)

$ sed -n '1,15p' spec.md      → id·title·version("0.1.1")·status·created·updated·author·
                                priority·phase·module·lifecycle·tags 12필드 + tier: S
$ grep -Eoh 'SPEC-([A-Z][A-Z0-9]+-)+[0-9]+' *.md | sort -u
  → SPEC-CHANNEL-001, SPEC-CHANWIRE-001, SPEC-COVERAGE-001
$ grep -H '^status:' .moai/specs/SPEC-CHANNEL-001/spec.md .moai/specs/SPEC-CHANWIRE-001/spec.md
  → 둘 다 in-progress                    (retired/superseded/archived 없음)
$ grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-COVERAGE-001/     → 매치 0 (exit 1)
$ grep -c syscall spec.md                                          → 0
```

---

## 6. 필수 통과 기준 (M5 Firewall)

| 기준 | 판정 | 근거 |
|---|---|---|
| MP-1 REQ 번호 일관성 | **PASS** | 개정이 REQ 집합을 건드리지 않았다. `spec.md`:105·112·121·128·139·152·161 → 001..007 연속 (E15) |
| MP-2 GEARS 형식 | **PASS** | 요구사항 계층 기준. REQ-002 는 리포터 조항이, REQ-005 는 주석 조항이 더해졌으나 둘 다 Ubiquitous(«…해야 한다») 형태를 유지한다. 004 Event-driven, 007 Unwanted. `acceptance.md` 의 Given-When-Then 은 검증 계층이므로 이 기준으로 감점하지 않았다 |
| MP-3 프론트매터 유효성 | **PASS** | `version` 이 `"0.1.0"`→`"0.1.1"` 로 인용부호를 유지한 채 올랐고 12필드가 그대로다. 스네이크케이스 별칭 없음 (E15) |
| MP-4 언어 중립성 | **N/A** | 단일 언어(TypeScript/Node) 워크스페이스 한정 |
| MP-5 D7 교차 SPEC 조정 | **PASS** | 참조 2건 모두 `in-progress` — BLOCKING 없음 (E15) |
| MP-6 D8 크로스플랫폼 | **N/A** | `grep -c syscall` → 0 |
| MP-7 미해결 [NEEDS CLARIFICATION] | **PASS** | 매치 0. 1회차에 산문 형태로 남아 있던 Q1 분기도 전부 제거됐다 (E1) |

**필수 통과 실패 없음.**

---

## 7. 차원별 점수

| 차원 | 1회차 | 2회차 | 밴드 | 근거 |
|---|---|---|---|---|
| Clarity | 0.75 | **0.90** | 0.75↔1.0 | 1회차 감점 사유 둘이 모두 사라졌다 — REQ-002 가 리포터를 명시하고(F-02), REQ-005 의 주석 조항이 «상단 다섯 줄 + 낱말 둘» 로 관측 가능하게 좁혀졌다(F-06). 제외 규칙이 경로 접두 한 줄로 못 박혔고(`acceptance.md`:255) 승인 기록이 아홉 자리 전부 무조건형이다. 잔여는 NEW-03 의 «그대로 따른다» 한 표현 |
| Completeness | 0.75 | **0.95** | 0.75↔1.0 | 1회차의 유일한 감점(«AC 가 의존하는 설정 조항이 REQ 집합에 없음»)이 닫혔다. 필수 절 전부 존재, 범위 밖 6개 H3 + 불릿 근거, 프론트매터 12필드, HISTORY 행 추가. `FILE_COUNT` 사유(R3)와 Tier 이탈 근거(N-05)가 본문에 들어왔다 |
| Testability | 0.45 | **0.80** | 0.75↔1.0 | 여섯 기준 중 **다섯이 이 감사의 실행으로 건전함이 확인**됐다 — AC-002 실행됨(E2), AC-003 이 설정을 실제로 잼(E3), AC-004 코드가 통과하고 변이 셋이 조준됨(E4·E5·E6), AC-006 전이 1 재현됨(E11), AC-001 은 1회차에서 확인. 감점은 AC-005 의 관측 2·3 이 실행 거부되는 것(NEW-01)과 «제외의 무해함» 관측이 공허해지는 것(NEW-02) |
| Traceability | 0.65 | **0.90** | 0.75↔1.0 | 조항 수준 누락 둘이 닫혔다 — 대역 조항은 단언 6 + `^3.0.0` 변이가(F-07), 주석 조항은 단언 7 이(F-06, 이빨을 E7 로 확인) 잰다. 고아 AC-006 은 기록된 의도적 예외가 됐다(§3). 매핑표가 개정 내용을 따라갔다. 잔여는 단언 7 에 지정된 변이가 없다는 것(문서가 Gap 으로 선언했고, 이 감사가 대신 확인) |

**종합 = 조화평균(0.90, 0.95, 0.80, 0.90) = 0.88** (산술평균 0.8875)

Tier S PASS 임계 **0.75**. 0.88 ≥ 0.75 → **PASS**.

점수 궤적: **0.62 → 0.88** (회귀 아님, STOP 신호 해당 없음).

### 판정에 대한 반론과 그에 대한 답

차단 발견 2건을 안고 PASS 를 주는 것이 옳은가. 이 감사의 답은 **그렇다**이며, 근거는 1회차 결함과의 **성질 차이**다.

1회차의 F-01 은 **기능이 통째로 없어도 기준이 초록**이었다 — 잘못된 구현을 통과시키는 결함이다. NEW-01 은 정반대로 **즉시 시끄럽게 거부**되어 run 단계가 모르고 지나칠 수 없고, 무엇을 재야 하는지(네 줄의 정확한 집합)는 완전히 못 박혀 있으며 교정안까지 이 감사가 실행으로 검증해 두었다. NEW-02 는 곁가지 관측 하나가 공허해지는 것이고, 그 관측이 주장하려던 사실 자체는 이 감사가 실행으로 확정했다(E3·E2). **둘 다 잘못된 구현을 통과시키지 못한다.**

동시에 이 둘은 M6 분류상 **blocking** 이며 optional 이 아니다. run 진입 전에 고쳐야 한다 — 특히 NEW-01 은 고치지 않으면 DoD 를 적힌 대로 만족시킬 수 없다.

---

## 8. Gaps (이 감사가 확인하지 **않은** 것)

1. **`npm install` 을 돌리지 않았다.** 계약 테스트 검증을 위해 `server/package.json` 에 의존성을 **선언만** 하고 설치는 생략했다(루트 `node_modules` 의 끌어올려진 사본으로 vitest 가 돌기 때문에 가능했다). 따라서 `plan.md` §E 둘째 위험(«잠금 파일이 예상보다 크게 바뀐다»)은 1회차에 이어 **여전히 미검증**이다.
2. **`npm test -w channel` 을 돌리지 않았다.** 형제 무회귀 항목(`acceptance.md`:302)은 관측하지 않았다.
3. **AC-COVERAGE-001 을 이번에 재실행하지 않았다.** 1회차에서 확인했고 개정이 그 기준을 건드리지 않았으므로 델타 범위 밖으로 두었다.
4. **run 레인 세션의 격리 플래그를 직접 관측하지 않았다.** NEW-01 의 거부는 이 감사 세션(워크트리 격리)에서 세 번 재현했고 칸반 규약상 run 레인도 같은 워크트리에서 돌지만, 그 세션이 동일한 가드를 받는지는 관측하지 않았다.
5. **`channel` 이 나중에 `@vitest/coverage-v8` 을 빼는 시나리오**를 재현하지 않았다(`acceptance.md`:288 이 이미 미검증으로 표시).
6. **단언 2·3·4·5 에 대한 개별 변이**를 돌리지 않았다. 문서가 지정한 셋(단언 1·3b·6)과 이 감사가 추가한 하나(단언 7)만 확인했다. `acceptance.md`:220 이 이 자리를 Gap 으로 선언해 두었고 이 감사도 같은 자리를 열어 둔다.
7. **`.moai/reports/t7/sync-audit.md` §T5** 는 1회차와 마찬가지로 읽지 않았다(다른 워크트리에 있다).

---

## 9. Residual-risk (잔여 위험)

- **NEW-01 의 교정이 «어떤 형태로 분해할 것인가» 를 다시 열어 놓는다.** 이 감사가 검증한 3단 분해를 문서에 **그대로 박아** 두지 않으면, `acceptance.md`:257 이 막으려던 «run 단계가 매번 다르게 해석» 이 형태 층위에서 재발한다. 교정할 때 명령을 산문으로 설명하지 말고 실행 가능한 블록으로 적어야 한다.
- **`--exclude` 는 프로브 시점에 계약 테스트가 있을 때만 의미가 있다.** NEW-02 를 (나)안(단계 순서 교체)으로 고치면 프로브 A' 상태에서 계약 테스트가 실제로 실패 대상이 되므로 `--exclude` 가 살아나지만, 동시에 단계 6 의 «게이트가 서는지 먼저 확인» 이라는 배치 의도가 흐려진다. (가)안(프로브 1회 추가)이 두 목적을 다 지킨다.
- **`FILE_COUNT=11` 은 여전히 다음 카드에서 거짓 실패한다.** 개정본이 사유와 갱신 책임을 본문에 적었지만, 그 책임은 **아직 존재하지 않는 카드**에 지운 것이라 이 SPEC 이 강제할 수단이 없다. 문서화된 의식적 대가이므로 결함으로 세지 않았으나, 위험 자체는 남는다.
- **단언 6 은 `pkg.devDependencies.vitest` 가 있다는 전제 위에 선다.** 오늘 `server/package.json` 이 `vitest: "^4.1.11"` 을 선언하므로 성립하지만, 그 선언이 사라지면 `major(undefined)` 가 `TypeError` 로 죽는다 — 계약 위반을 단언 실패가 아니라 예외로 알리게 된다. SPEC 이 다루겠다고 선언한 시나리오가 아니므로 발견으로 세지 않았다.
- **커버리지 실행 ~7.2초, 테스트 스위트 ~7.2초.** 이 감사가 커버리지 4회·테스트 스위트 5회를 돌렸고 모두 정상 종료했다. 배경 프로세스나 좀비는 남기지 않았다(`plan.md` §D 5 의 서술대로 이 카드의 검증은 부하를 만들지 않는다).

---

## 10. 권고 (run 진입 전 순서)

1. **NEW-01** — `acceptance.md`:229·230-231 의 두 명령을 §4.1 의 3단 분해로 교체한다. 기준 SHA 는 변수가 아니라 문자 그대로 박는다. 가장 중요한 교정이며, 고치지 않으면 DoD 를 적힌 대로 만족시킬 수 없다.
2. **NEW-02** — `acceptance.md`:143 에 «이 확인은 계약 테스트가 존재하는 상태에서 한다» 한 줄을 더한다((가)안).
3. **NEW-03** — `spec.md`:146 의 «그대로 따른다» 를 «선례의 방식을 따르되 주석 내용 요건은 §4.4 가 더 좁힌다» 로 고친다.
4. **선택 — 사실 반영**: `plan.md` §E 의 «계약 테스트가 판정을 가린다» 위험 행에, 이 감사가 확정한 사실(E13 — 테스트가 실패하면 vitest 는 임계 검사를 아예 하지 않는다)을 근거로 적어 두면 그 완화책이 왜 필수인지가 문서에 남는다. 지금은 «가릴 수 있다» 로만 적혀 있어 나중에 «군더더기 아닌가» 로 읽힐 여지가 있다.

**설계 결정과 관측 설계는 하나도 바꿀 필요가 없다.** 전역 라인 85, 진입점 미제외, 회귀 짝, 설정 파일 임시 변경 프로브, 세 변이, `.moai/` 제외 규칙 — 이 감사가 전부 실행으로 확인했다.

3회차 감사가 필요하다면 **위 세 교정에 한정**해 수행한다.

---

## 11. 트리 무변경 증명

이 감사는 프로브를 위해 임시로 다음을 만들었다가 전부 되돌렸다.

| 대상 | 조치 | 복원 증명 |
|---|---|---|
| `server/package.json` (추적) | `coverage` 스크립트 + `@vitest/coverage-v8` 선언 추가, 이후 변이 2회(`^3.0.0`, 줄 삭제) | 변이 전 `git hash-object` = `e17e74445839954cc3b2fcef12e65ca7cd2e8576` · `shasum -a 256` = `58dfe70d…1fed9d` → **복원 후 동일** (1회차 기록값과도 동일) |
| `server/vitest.config.ts` (신규) | 임시 생성 + 변이 2회(리포터·주석·임계) 후 삭제 | 아래 `git status --short` 에 없음 |
| `server/test/coverage-contract.test.ts` (신규) | `acceptance.md` 에서 추출해 생성 후 삭제 | 아래 `git status --short` 에 없음 |
| `server/coverage/` (산출물) | 커버리지 실행 산출 후 `rm -rf` | `.gitignore` 의 `coverage/` 가 덮으며 현재 부재 |
| `/tmp/t13*` | 감사 전용 로그·목록 | 저장소 밖 |

```
$ echo "AFTER_BLOB_pkg=$(git hash-object server/package.json)"
AFTER_BLOB_pkg=e17e74445839954cc3b2fcef12e65ca7cd2e8576
EXPECT_BLOB=e17e74445839954cc3b2fcef12e65ca7cd2e8576
AFTER_SHA256_pkg=58dfe70dce91678dc1cc10f857864b1db6d159eca6819eb71942251a5a1fed9d
EXPECT_SHA256=58dfe70dce91678dc1cc10f857864b1db6d159eca6819eb71942251a5a1fed9d

$ git status --short
?? .moai/logs/trace-5a341559-db33-4637-9156-f88538dc6137.jsonl
?? .moai/reports/t13/
?? .moai/specs/SPEC-COVERAGE-001/
?? .moai/state/config-cache.json
?? .moai/state/context-usage.json
```

감사 시작 시점의 `git status --short` 와 **완전히 동일**하다. SPEC 파일 넷은 **읽기만 했고 수정하지 않았다.** 커밋·브랜치 전환·워크트리 생성은 하지 않았다.
