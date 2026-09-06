# t42 — 감사 4차원 루브릭 조사 보고서

- 카드: t42 (감사 4차원 루브릭의 채점 공백)
- 회차 범위: **읽기 전용 조사만.** `.claude/` 아래 수정 0건, 수리 설계 0건.
- 판본: **2회차** (리드 판독 후 갱신 — 과대주장 1건 정정 §4.1, 미검증 3건 종결 §5)
- 나무: `.claude/worktrees/t42`, 브랜치 `WT-audit-rubric`
- 관측 시점(귀속 SHA): **`0775b4ef6b229bb87295683397e7497b48839317`** (= `origin/main`)
- 이 보고서의 모든 계수는 위 SHA 의 트리에서 아래 명령을 실제로 돌려 얻은 값입니다. 명령은 각 항목에 축자로 붙였습니다.

---

## 0. 쉬운 말 요약

「감사 4차원」이라는 말이 이 저장소 안에서 **한 가지를 가리키지 않습니다.** 계획 단계 감사관(plan-auditor)이 쓰는 4차원과 동기화 단계 감사관(sync-auditor)이 쓰는 4차원은 이름도 대상도 완전히 다른 별개의 잣대이고, 그 외에 서로 어긋나는 계정이 두 개 더 있습니다. 즉 카드가 의심한 「4차원이 두 개의 다른 것」은 사실이며, 그 자체가 이번 회차의 첫 번째 발견입니다.

「사실 정확성」에 대해서는 — 계획 단계 4차원(명료성·완결성·시험가능성·추적성)의 **정의 문장을 한 줄씩 읽어 확인한 결과, 어느 차원도 SPEC 이 적은 주장이 참인지를 재지 않습니다.** 넷 다 문서의 *형태*(모호한가·빠진 절이 있는가·판정 가능한가·이어져 있는가)를 재고, 내용의 *진위*는 재지 않습니다. 루브릭 표면 여섯 파일 전부에서 사실성 어휘(accuracy/factual/overclaim/unsupported 등)를 훑었더니 유의미한 적중이 0건이었습니다.

그리고 「차단으로는 잡히는데 점수에는 안 잡히는」 자리는 과대주장 하나가 아니었습니다. **필수 통과 항목과 검사 목록 중 최소 열 자리가 점수 칸을 갖고 있지 않습니다.** 그중 여섯(요구사항 간 모순·구현 세부 혼입·AC 형식 등)은 필수 통과 항목도 아니어서 **점수도 차단도 없는 상태**입니다 — 감사관이 발견해도 판정을 움직일 기계적 경로가 없습니다.

**2회차 갱신 (리드 판독 후):** 초판의 과대주장 하나를 정정했습니다 — "plan-auditor 는 집계식이 아예 정의돼 있지 않다"는 **한 파일만 본 grep 으로 저장소 전체의 부재를 선언한 것**이었고, 실제로는 `agent-common-protocol.md:123` 이 조화평균을 정의합니다. 정확한 결함은 「미정의」가 아니라 「plan-auditor.md 가 그 자리를 가리키지 않는다」입니다(§4.1). 부재 주장에는 그것을 찾았을 명령이 붙어야 한다는 것 — 이 카드가 겨눈 바로 그 부류를 보고서 자신이 저질렀습니다.

그리고 미검증 셋을 읽기 전용으로 닫았습니다(§5): 차원 목록을 기계적으로 강제하는 자리는 헌법도 Go 코드도 아니고 **`.claude/` 안의 JS 워크플로 한 줄**뿐입니다(즉 수리 회차가 편집할 수 있는 자리). 어긋나는 계정 C 는 **읽으라고 지시받은 주체가 없는 죽은 표**라 심각도가 낮습니다. `moai spec audit` 은 점수를 내지 않습니다.

수리는 하지 않았습니다(회차 범위 밖). 아래는 규명 결과와 남은 미검증입니다.

---

## 1. 루브릭 SSOT — 어디가 진짜 정의 자리인가

리드가 준 시작점을 실물 대조한 결과입니다.

| 리드가 준 시작점 | 실제로 무엇이었나 |
|---|---|
| `agent-common-protocol.md:123` | 4차원을 **정의하지 않음.** § Skeptical Evaluation Stance 의 한 줄 원칙 — "Score quality as the harmonic mean of dimensions, not the average". 어느 차원인지는 말하지 않음 |
| `agent-patterns.md:276` | 정의 아님. 파이프라인 표의 한 칸("sync-auditor 4-dimension scoring")으로 **언급만** |
| `.claude/agents/moai/plan-auditor.md` | **계획 단계 4차원의 SSOT 맞음.** M3 Rubric Anchoring 절(L85–L123)이 각 차원의 0.25/0.50/0.75/1.0 앵커를 축자로 정의 |
| `.claude/agents/moai/sync-auditor.md` | **동기화 단계 4차원의 SSOT 맞음.** § Evaluation Dimensions 표(L36–L41)가 차원·가중치·FAIL 조건을 정의 |

즉 **SSOT 는 두 에이전트 파일에 나뉘어 있고, 둘을 묶는 상위 정의 파일은 없습니다.**

### 발견 1 — 「4차원」은 서로 다른 넷이다

| # | 계정 | 차원 | 정의 자리 | 척도 |
|---|---|---|---|---|
| A | 계획 단계 감사 | Clarity / Completeness / Testability / Traceability | `plan-auditor.md` L85–L123, 보고 표 L378–L384 | 0.0–1.0, 앵커 4단 |
| B | 동기화 단계 감사 | Functionality / Security / Craft / Consistency | `sync-auditor.md` L36–L41 | 0–100, 가중 40/25/20/15 |
| C | 평가자 프로파일이 말하는 "Plan-Auditor Dimension" | **D7 Cross-SPEC (50%) / D8 Cross-Platform (50%)** | `.moai/config/evaluator-profiles/default.md` L79–L90 | 이분(BLOCKING/PASS) + 가중치 표기 |
| D | SPEC 품질 체크리스트 | Clarity / Completeness / Testability / **Consistency** | `.claude/skills/moai-workflow-spec/references/reference.md` L444–L466 | 0–100 |

A 와 B 가 다르다는 것은 카드의 추측대로입니다. 추가로:

- **C 는 A 와 정면 충돌합니다.** default.md 는 "Plan-Auditor Dimension" 이 D7·D8 둘이고 각 50% 라고 적어 합이 100% 입니다. 그러면 A 의 네 차원에 남는 가중치가 없습니다. 그런데 `plan-auditor.md` 에서 D7·D8 은 차원이 아니라 **필수 통과(MP-5·MP-6)** 이며 "never absorbed into the aggregate score"(L329, L355)라고 명시돼 있습니다. 같은 대상을 한쪽은 「점수의 100%」, 다른 쪽은 「점수에 절대 안 들어감」이라고 적고 있습니다.
- **D 는 Traceability 자리에 Consistency 를 넣습니다.** 그리고 그 Consistency 의 첫 항목이 "No conflicting requirements" 입니다 — 아래 §3 에서 나올 **계획 감사 최대 공백(요구사항 간 모순)** 을 바로 그 자리가 덮고 있습니다. 다만 D 는 구속력 있는 감사 표면이 아니라 스킬 참고 문서입니다.

계수(축자 명령·SHA 0775b4e):

```
grep -rliE "4.?dimension|four.?dimension" .claude/ .moai/config/ | wc -l
→ 20
```

20개 파일이 「4차원」을 말하지만 정의는 두 곳(+어긋나는 계정 둘)에만 있습니다.

---

## 2. 「사실 정확성」은 어느 차원에도 들어가지 않는다 — 축자 확인

문서가 그렇게 주장하는지가 아니라, 각 차원의 **정의 문장이 무엇을 재는지** 읽고 판단했습니다. 아래는 `plan-auditor.md` 의 Score 1.0 앵커 원문입니다.

| 차원 | Score 1.0 앵커 축자 (출처) | 실제로 재는 것 |
|---|---|---|
| Clarity | "Every requirement has a single, unambiguous interpretation. No pronoun reference ambiguity. Measurable acceptance criteria." (`plan-auditor.md:87`) | **해석의 일의성.** 문장이 한 뜻으로 읽히는가 |
| Completeness | "All required sections present (HISTORY, WHY, WHAT, HOW, REQUIREMENTS, ACCEPTANCE CRITERIA, Out of Scope). All YAML frontmatter fields present. At least one `### Out of Scope — <topic>` H3 sub-heading with a `-` bullet entry." (`plan-auditor.md:97`) | **구성 요소의 존재.** 있어야 할 절과 필드가 있는가 |
| Testability | "Every AC is binary-testable: a human tester can determine PASS or FAIL without ambiguity. No ACs use 'appropriate', 'reasonable', 'adequate', or similar weasel words." (`plan-auditor.md:107`) | **판정 가능성.** 사람이 합불을 가릴 수 있는가 |
| Traceability | "Every REQ-XXX has at least one AC. Every AC references a valid REQ-XXX that exists in the document. No orphaned ACs. No uncovered REQs." (`plan-auditor.md:117`) | **연결 관계.** REQ 와 AC 가 서로 이어져 있는가 |

넷 다 **문서 내부의 형태·구조**를 재는 술어입니다. 어느 앵커도 "SPEC 이 인용한 외부 사실이 참인가", "출처가 실제로 그렇게 말했는가", "주장이 근거보다 세지 않은가"를 묻지 않습니다.

운영자 처분(2026-09-06)이 옳다는 것을 이 원문이 뒷받침합니다: Clarity 의 술어는 「한 뜻으로 읽히는가」이므로, **완벽히 한 뜻으로 읽히면서 그 뜻이 거짓인 문장**은 Clarity 1.0 을 받습니다. 과대주장은 Clarity 의 정의역 밖입니다.

어휘 훑기(축자 명령):

```
for f in plan-auditor.md sync-auditor.md evaluator-profiles/{default,strict,lenient,frontend}.md; do
  grep -niE "accura|factual|overclaim|over-claim|unsupported|misstat|verifiab|falsif|truth|사실" "$f"
done
```

결과: 여섯 파일 중 다섯이 **0건**. 유일한 적중은 `default.md:27` "Mark unverifiable criteria as UNVERIFIED, not PASS" — 이것은 **감사관 자신의 판정에 증거가 있느냐**를 규율하는 문장이지, **SPEC 본문의 주장이 참이냐**를 재는 기준이 아닙니다. 방향이 반대입니다.

### 덧 — 교리는 있는데 채점 칸이 없다

`verification-claim-integrity.md`(항상 적재) §1.1 은 미관측 주장을 **네 표면**에 구속합니다: ①오케스트레이터 자기보고 ②매니저 완료 보고 ③결함 주장 ④권고 전제. **SPEC 문서 본문의 사실 주장은 이 넷 중 어디에도 명시적으로 들어 있지 않습니다.** 그리고 `plan-auditor.md` 는 이 규약 파일을 한 번도 참조하지 않습니다(`grep -n "verification-claim-integrity" plan-auditor.md` → 0건; 참조하는 것은 agent-common-protocol 의 § Tool Selection 과 § Parallel Execution 둘뿐, L182·L248).

즉 **교리는 존재하나, 계획 감사가 그것을 SPEC 본문에 적용할 채점 경로가 배선돼 있지 않습니다.**

---

## 3. 필수 통과(MP)와 4차원 사이의 간극 — 목록

계수(축자 명령·SHA 0775b4e):

```
grep -cE '^\*\*\(MP-[0-9]+\)' .claude/agents/moai/plan-auditor.md          → 7
awk '/^## Category Scores/,/^## Defects Found/' .claude/agents/moai/plan-auditor.md \
  | grep -cE '^\| (Clarity|Completeness|Testability|Traceability) '        → 4
grep -cE '^\*\*Score 1\.0\*\*' .claude/agents/moai/plan-auditor.md         → 5
```

필수 통과는 **7개**, 점수 표의 행은 **4개**, 앵커가 정의된 루브릭은 **5개**(넷 + GEARS 형식). 세 수가 서로 다릅니다.

### 3.1 필수 통과 ↔ 점수 대응표

| 항목 | 점수 칸이 있는가 | 근거 |
|---|---|---|
| MP-1 REQ 번호 일관성 | **없음** | 네 앵커 어디에도 번호 연속성·중복·zero-padding 을 재는 문장이 없음 |
| MP-2 GEARS 형식 준수 | **앵커는 있으나 표에 행이 없음** | L66 에 Score 1.0/0.75/0.50/0.25 앵커가 완비돼 있는데 보고서 Category Scores 표(L381–L384)에는 행이 없음 — **고아 루브릭** |
| MP-3 YAML frontmatter | 있음 | Completeness 앵커가 "All YAML frontmatter fields present" 포함 |
| MP-4 언어 중립성 | **없음** | 16개 언어 열거 여부를 재는 앵커 없음 |
| MP-5 D7 교차 SPEC | **없음(의도적)** | L329 "never absorbed into the aggregate score" |
| MP-6 D8 크로스플랫폼 | **없음(의도적)** | L355 동문 |
| MP-7 [NEEDS CLARIFICATION] | **없음(의도적)** | L149 "This gate is score-independent" |

MP-5·6·7 의 공백은 **설계된 것**입니다(점수로 상쇄되면 안 되므로). MP-1·MP-2·MP-4 의 공백은 그런 선언이 없습니다.

### 3.2 검사 목록 ↔ 점수·차단 대응표 (Audit Checklist Group 1–8)

여기가 카드 ③의 핵심입니다. **점수도 없고 차단도 없는** 줄이 존재합니다.

| 검사 항목 | 점수 칸 | 필수 통과 | 상태 |
|---|---|---|---|
| SC-1..SC-6 문서 구조 | Completeness | — | 정상 |
| FC-ALL frontmatter | Completeness | MP-3 | 정상 |
| RQ-1, RQ-2 번호 | 없음 | MP-1 | 차단만 |
| RQ-6 GEARS | 고아 앵커 | MP-2 | 차단만 |
| **RQ-3 요구가 WHAT/WHY 인가 (HOW 혼입)** | **없음** | **없음** | **둘 다 없음** |
| **RQ-4 함수명·클래스명·라이브러리 버전·API 스키마 혼입** | **없음** | **없음** | **둘 다 없음** |
| **RQ-5 REQ 정규문의 정밀성("should"/"may"/"reasonable")** | **부분**(Testability 는 AC 만 규율) | **없음** | **거의 없음** |
| **AC-1 AC 가 Given-When-Then 인가** | **없음** | **없음** | **둘 다 없음** |
| AC-2, AC-3 이분 판정·weasel word | Testability | — | 정상 |
| AC-4, AC-5 REQ↔AC | Traceability | — | 정상 |
| LN-1..LN-3 언어 중립성 | 없음 | MP-4 | 차단만 |
| **CN-1 두 요구가 서로 모순되지 않는가** | **없음** | **없음** | **둘 다 없음** |
| **CN-2 제외 항목이 포함 요구와 충돌하지 않는가** | **없음** | **없음** | **둘 다 없음** |
| **CN-3 우선순위·라벨이 범위와 일관된가** | **없음** | **없음** | **둘 다 없음** |
| D7-1..D7-5 | 없음(의도) | MP-5 | 차단만 |
| D8-1..D8-4 | 없음(의도) | MP-6 | 차단만 |

**「점수도 차단도 없는」 부류: RQ-3, RQ-4, AC-1, CN-1, CN-2, CN-3 — 여섯 줄.** 여기에 RQ-5(부분)와 사실 정확성(§2, 검사 항목조차 없음)을 더하면, 감사관이 결함을 발견하더라도 판정을 기계적으로 움직일 경로가 없는 자리가 **최소 여덟**입니다.

이 여섯은 M6 의 `blocking` 분류로만 흘러갈 수 있는데, `plan-auditor.md` L163 은 판정의 귀속을 이렇게 못박습니다: **"The verdict remains anchored to the M5 must-pass firewall and the rubric scores."** blocking 분류 자체는 판정을 강제하지 않습니다. 과대주장이 두 회차 연속 차단됐다면 그 경로는 **M6 blocking 분류에 의한 감사관의 재량 판단**이었을 가능성이 큽니다 — 이는 규약이 기계적으로 보장하는 경로가 아니라는 뜻입니다. (t40 보고서 원문 미열람 — §5 미검증 참조.)

특히 **CN-1(요구사항 간 모순)** 이 점수도 차단도 없다는 것은 눈에 띕니다. §1 의 계정 D 는 바로 이 항목("No conflicting requirements")을 Consistency 라는 **차원**으로 갖고 있습니다 — 개념은 harness 안에 이미 존재하는데, 구속력 있는 감사관의 채점표에만 없습니다.

---

## 4. 부수 발견 (수리 대상 아님 — 기록만)

### 4.1 집계 공식이 두 갈래이고, 계획 쪽은 정의 자체가 없다

- `agent-common-protocol.md:123` (모든 에이전트에 적재): "Score quality as the **harmonic mean** of dimensions, not the average"
- `sync-auditor.md:36-41`: **가중 백분율** 40/25/20/15 — 조화평균이 아님
- `.claude/workflows/sync-audit-4dim.js:221`: **비가중 조화평균**, `THRESHOLD = 0.85`. 가중치 검색 0건(`grep -niE "weight|0\.4|0\.25|0\.2|0\.15"` → 0)
- `.claude/skills/moai/workflows/sync.md:71`: happy path 에서는 **워크플로의 조화평균 판정이 BINDING** 이고 cold sync-auditor 를 아예 스폰하지 않음

즉 **경로에 따라 서로 다른 집계식이 각각 구속력을 갖습니다.** 같은 점수 넷이 경로 A 에서는 가중평균, 경로 B 에서는 비가중 조화평균으로 합쳐집니다.

계획 쪽에 대해서는 **이 보고서 초판이 과대주장을 했고, 여기서 정정합니다.**

초판은 "plan-auditor 는 집계식이 아예 정의돼 있지 않습니다"라고 적었습니다. 근거로 든 부정 확인은 이것이었습니다:

```
grep -niE "weight|average|mean|harmonic|가중" .claude/agents/moai/plan-auditor.md
```
적중 4건 전부 무관한 맥락입니다 — L143 "equal weight"(16개 언어 열거), L153 "counterweight"(M6 서술), L290 "equal weight"(LN-1), L466 "TRUST 5 dimensions"(스킬 로딩).

**그러나 이 명령은 파일 하나만 봤으므로 「이 파일에 없다」까지만 세웁니다.** 「어디에도 없다」는 그보다 넓은 주장이고, 그 폭의 명령을 돌리지 않았습니다. 그리고 실제로 넓혀 보면 **집계식은 정의돼 있습니다** — 이 보고서 §1 이 스스로 인용한 그 줄입니다:

> `agent-common-protocol.md:123` — "Score quality as the **harmonic mean** of dimensions, not the average"

§1 에서 이 줄을 「차원을 정의하지 않는다」고 판정한 것은 맞지만, 그것이 **집계식은 정의한다**는 사실을 가리지 않습니다. 이 줄은 「어느 차원인가」에 침묵하고 「어떻게 합치는가」에 답합니다. 그리고 그 절(§ Skeptical Evaluation Stance)은 감사관 전원에 적재됩니다.

**정확한 결함은 「미정의」가 아니라 「`plan-auditor.md` 가 그 자리를 가리키지 않는다」입니다** — 훨씬 약한 결함입니다. 계획 감사관은 자기 파일 안에서 Overall Score 의 산출법을 지시받지 않고, 항상 적재되는 공통 규약의 한 줄에 암묵적으로 의존합니다. 그 Overall Score 는 Tier 별 통과선(S 0.75 / M 0.80 / L 0.85, `spec-workflow.md:138-141`)과 비교되고 run 단계 게이트 skip 자격까지 결정합니다(`spec-workflow.md:334`).

관례가 실제로 그 줄에서 왔다는 방증: 이 저장소의 계획 감사 둘(t35 `plan-audit-2.md:41`, t40 `plan-audit-2.md`)이 조화평균으로 계산했다고 리드가 확인했습니다. (리드 관측 인용 — 이 나무에서 직접 재확인하지 않았습니다.)

**이 정정 자체가 이 카드가 겨눈 부류의 실례입니다.** 「없다」는 부재 주장이고, 부재 주장에는 **그것을 찾았을 명령**이 붙어야 합니다. 한 파일만 훑은 grep 으로 저장소 전체의 부재를 선언한 것이 이 보고서 초판의 결함이었습니다. §2 의 사실성 어휘 부재 주장도 같은 위험을 지므로, 그 범위를 여섯 파일로 명시해 두었습니다 — 그 여섯 파일 밖은 세우지 않습니다.

### 4.2 FROZEN 인용이 인용처와 맞지 않는다

`sync-auditor.md:46` 은 이렇게 적습니다: "The dimension enum is **FROZEN (design-constitution §12 Mechanism 3)** at exactly `Functionality`, `Security`, `Craft`, `Consistency`".

그런데 `.claude/rules/moai/design/constitution.md:366` 의 §12 Mechanism 3 원문은 **차원 enum 을 얼지 않습니다**:

> "### Mechanism 3: Must-Pass Firewall — Must-pass criteria cannot be compensated by high scores in other areas. A project with perfect nice-to-have scores but a failing must-pass criterion still fails. This is FROZEN and cannot be evolved."

얼어 있는 것은 **필수 통과 방화벽**이지 차원 목록이 아닙니다. 실측: `constitution.md` 전문에서 `Functionality|Consistency|dimension` 검색 시 적중 2건뿐이고(L311, L329), 그중 L329 는 **다른 차원 집합**("Design Quality, Originality, Completeness, Functionality")이며 그 절은 자체적으로 `(RETIRED)` 로 표시돼 있습니다(L321–323). Craft·Security 는 constitution.md 에 한 번도 나오지 않습니다.

**이 점이 수리 회차에 직접 걸립니다:** 「다섯째 차원 신설은 헌법이 금지한다」는 전제는 인용된 자리에서 확인되지 않습니다.

그 전제가 다른 자리(Go 코드의 enum 검증)에 실재하는지는 **§5.1 에서 조사했고, 증거를 찾지 못했습니다** — Go 심볼은 바이너리에 있으나 네 차원 이름을 묶은 Go 리터럴은 나오지 않았고, 프로파일 로더는 미지의 차원을 거부가 아니라 **건너뛰기**로 처리한다고 규약 자신이 적습니다. 유일한 기계적 강제는 `.claude/workflows/sync-audit-4dim.js:105` 의 JSON 스키마 `enum` 한 줄입니다. 다만 §5.1 의 방법적 한계 때문에 「Go 에 절대 없다」로는 단정하지 않습니다.

부수적으로 `moai-meta-harness/SKILL.md:182` 는 "design constitution §11.5" 를 인용하는데, constitution.md 의 §11 에는 번호 붙은 11.5 하위 절이 없고 해당 내용(Sprint Contract Protocol)은 `(RETIRED)` 로 표시돼 있습니다.

### 4.3 렌더 표면이 낡았다

`plan-auditor.md` 의 필수 통과는 7개인데, 출력 스타일의 Plan Audit 배너(`.claude/output-styles/moai/moai.md:415`)는 **MP-1..MP-4 넷만** 표기합니다.

```
grep -oE "MP-[0-9]+" .claude/output-styles/moai/moai.md | sort -u
→ MP-1 MP-2 MP-3 MP-4
```

MP-5(D7)·MP-6(D8)·MP-7(clarification gate)은 배너에 자리가 없습니다. 운영자가 화면에서 읽는 감사 결과에 세 개의 필수 통과 결과가 표시되지 않습니다.

---

## 5. 2회차에 닫은 미검증 셋

리드 지시로 초판의 미검증 2·3·4 를 읽기 전용으로 닫았습니다. 셋 다 닫혔고, 그중 하나는 §4.2 의 결론을 **뒤집지 않고 오히려 굳혔습니다.**

### 5.1 (닫힘) 차원 enum 을 코드가 강제하는가 — **강제하는 곳은 Go 가 아니라 JS 워크플로 하나**

먼저 규약이 인용하는 Go 경로가 **이 저장소에 없습니다.** 실측:

```
ls internal          → No such file or directory
ls go.mod            → No such file or directory
find . -name '*.go' -not -path './.git/*' | wc -l   → 0
```

minidiscord 는 Node/TypeScript 저장소이고 Go 파일이 0개입니다. `internal/runtime.FourDimVerdict`, `SkipEligibleByScore`, `manager_lead_depth_test.go` 같은 인용은 **상류 MoAI-ADK 저장소**를 가리키며 이 체크아웃에서는 열람 불가입니다.

그래서 설치된 바이너리를 읽기 전용으로 조사했습니다 (`/Users/byunjungwon/.local/bin/moai`, `moai-adk 3.1.2`, 2026-08-21):

```
strings /Users/byunjungwon/.local/bin/moai > <scratchpad>/moai-strings.txt   → 221,503 줄
grep -c "FourDimVerdict"       → 2
grep -c "SkipEligibleByScore"  → 2
grep -c "must_pass_dimensions" → 4
```

Go 심볼 자체는 존재합니다. 그런데 **네 차원 이름이 함께 나오는 문자열을 전수로 뽑아 보면 전부 임베드된 문서·JS 텍스트입니다** — 에이전트 `.md`, `CLAUDE.md`, 그리고 `sync-audit-4dim.js` 소스. Go 리터럴 블롭 안에 네 이름이 묶여 있는 자리는 나오지 않았습니다. 구조체 태그는 이렇게 생겼습니다:

```
MustPassDimensions%yaml:"must_pass_dimensions,omitempty"
```

`[]string` 성격의 필드이고, 값을 특정 넷으로 제한하는 열거형 타입이 아닙니다.

그리고 결정적으로, **규약 자신이 강제하지 않는다고 적고 있습니다.** `sync-auditor.md:46` 축자:

> "a non-canonical dimension name in a profile is **loaded best-effort (unknown dims skipped)**"

거부가 아니라 건너뛰기입니다. 강제의 반대입니다.

**실제로 enum 을 기계적으로 강제하는 자리는 하나뿐이고, Go 가 아니라 JS 입니다** — `.claude/workflows/sync-audit-4dim.js:100-106`:

```js
const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    dimension: {
      type: 'string',
      enum: ['Functionality', 'Security', 'Craft', 'Consistency'],
```

이것은 판정자 응답의 스키마 검증이고, 같은 파일 L67 의 `const DIMENSIONS = [...]` 와 짝을 이룹니다.

**결론:** 차원 enum 은 (a) 헌법이 얼리지 않고(§4.2), (b) Go 타입이 강제하지 않으며(위), (c) 프로파일 로더는 미지의 차원을 건너뛰고, (d) 유일한 기계적 강제는 `.claude/` 안의 JS 워크플로 파일 한 곳입니다 — 즉 **수리 회차가 편집 가능한 자리**입니다.

**잔여 한계 (이 방법이 못 보는 것):** `strings` 는 런타임에 조립되는 이름을 못 봅니다. Go 문자열 테이블은 리터럴을 이어 붙여 저장하므로 줄 단위 정확 일치는 신뢰할 수 없습니다(그래서 부분 일치로 셌습니다). 그리고 바이너리는 3.1.2(2026-08-21)로 이 저장소의 규약 문서보다 오래됐을 수 있습니다. 따라서 정확한 주장은 **"이 방법으로는 Go 측 enum 강제의 증거를 찾지 못했다"**이지, "Go 에 절대 없다"가 아닙니다.

### 5.2 (닫힘) 계정 C 는 소비되는가 — **읽으라고 지시받은 주체가 없다**

```
grep -rn "evaluator-profiles|evaluator_profile" .claude/ .moai/config/ CLAUDE.md   (프로파일 디렉터리 자신 제외)
```

로드를 **지시받은** 주체는 `sync-auditor.md` 하나뿐입니다(§ Evaluator Profile Loading, 4단계). 나머지 적중은 스킬 참고 문서와 `harness.yaml` 설정 키입니다.

그런데 문제의 표(`default.md` L79-L90)는 제목이 **"D7/D8 Plan-Phase Dimensions"** 이고 열 이름이 **"Plan-Auditor Dimension"** 입니다 — plan-auditor 를 향한 표입니다. 그리고:

```
grep -cn "evaluator" .claude/agents/moai/plan-auditor.md   → 0
```

**plan-auditor 는 이 디렉터리를 한 번도 참조하지 않습니다.** 유일한 독자인 sync-auditor 는 그 표를 읽더라도 표 자신이 "do NOT contribute to sync-auditor's 4-dimension overall score" 라고 적어 스스로를 배제합니다.

**결론: 죽은 표입니다.** 따라서 §1 계정 C 의 충돌은 **문서 정합성 문제이지 채점 동작을 바꾸는 결함이 아닙니다** — 심각도를 낮춰 읽어야 합니다. 다만 「plan-auditor 의 차원이 D7·D8 둘이고 각 50%」라고 읽는 사람(또는 에이전트)을 오도할 수 있는 문서는 남아 있습니다.

### 5.3 (닫힘) `moai spec audit` 은 별도 채점 축을 갖는가 — **점수를 내지 않는다**

읽기 전용으로 실행했습니다 — **나무 `.claude/worktrees/t42` @ `0775b4e` 에서**:

```
moai spec audit --json
→ {"audited_at":"2026-09-05T17:35:56.079921Z","total_specs":26,
   "grandfathered":11,"modern_era_clean":15,"drift_findings":[...]}
```

**이 수는 시점에 귀속됩니다.** 리드가 같은 명령을 주 체크아웃에서 돌렸을 때 `total_specs` 는 **24** 였습니다 — 그 체크아웃이 `origin/main` 보다 99 커밋 뒤져 있기 때문입니다. 어느 쪽도 틀리지 않았고, **시점을 떼면 둘 다 거짓이 되는** 수입니다. 이 보고서의 26 은 `0775b4e` 트리에 대한 값입니다. (24 는 리드 관측 인용이며 제가 재현하지 않았습니다.)

출력 스키마에 **점수 필드가 없습니다.** 이 도구는 SPEC 을 시대(V2.x / V3R2-R4 / V3R5 / V3R6 / unclassified)로 분류하고 V3R6 에 한해 표류 패턴(`Y_N_N_Y` 등)을 severity(INFO/MUST-FIX)로 내는 **수명주기 표류 탐지기**입니다. 품질 채점 축이 아니므로 §3 의 간극 목록에 아무것도 더하거나 빼지 않습니다.

---

## 6. 남은 미검증

1. **t40 에서 과대주장이 어느 경로로 두 번 차단됐는가 — 열지 않습니다.** 리드 지시로 lane-2 나무를 읽지 않습니다(중간 상태 열람 위험, t40 곧 머지). §3 말미의 "M6 blocking 재량 판단이었을 가능성"은 규약 구조에서 나온 **추정**이며 관측이 아닙니다.
2. **바이너리 조사의 방법적 한계** — §5.1 잔여 한계 문단 참조. Go 측 enum 강제의 **부재를 증명한 것이 아니라 증거를 찾지 못한 것**입니다.
3. **상류 MoAI-ADK 저장소 원본 미열람.** 이 체크아웃에 Go 소스가 없으므로 `internal/runtime` 원문은 확인할 수 없었습니다.
4. **다른 브랜치·나무의 상태는 보지 않았습니다.** 모든 문서 관측은 `0775b4e` 한 시점, 바이너리 관측은 3.1.2 한 판본입니다.
5. **t35·t40 감사 보고서가 조화평균을 썼다는 사실은 리드 관측을 인용한 것**이며 이 나무에서 재확인하지 않았습니다(§4.1).

---

## 7. 회차 범위 준수 확인

- `.claude/` 아래 수정: **0건** (검증: `git status --short` 에 `.claude/` 경로 변경 없음)
- 신규 파일: 이 보고서 하나 (`.moai/reports/t42/rubric-survey.md`)
- 수리 설계: 하지 않음. 다섯째 차원 신설 여부, 완결성 확장 여부, 차단 전용 유지 여부 — 어느 것도 제안하지 않았습니다. §4.2 와 §5.1 은 「수리 회차의 전제가 어디에서 서고 어디에서 안 서는가」에 대한 **사실 보고**이지 처방이 아닙니다
- 2회차에 실행한 것: grep/sed/awk/wc/find/ls/git 읽기 명령, 설치 바이너리의 `strings` 덤프(스크래치패드에 기록, 저장소 밖), `moai spec audit --json`(읽기 전용 조회 — 파일을 쓰지 않음)
- 배경 부하 프로세스: 없음

---

## 8. 리드에게 남기는 한 줄

카드의 세 물음은 모두 **그렇다**로 확인됐습니다: 4차원은 두 개(실은 넷)의 다른 것이고, 사실 정확성은 어느 차원의 정의에도 없으며, 「차단되나 채점 안 되는」 자리는 과대주장 하나가 아니라 최소 여덟입니다.

2회차에서 초판의 과대주장 하나를 정정했고(§4.1 — 「집계식이 없다」는 한 파일만 본 grep 으로 저장소 전체의 부재를 선언한 것이었습니다), 미검증 셋을 닫았습니다: 차원 enum 의 유일한 기계적 강제는 JS 워크플로 한 줄이고(§5.1), 계정 C 충돌은 죽은 표라 심각도가 낮으며(§5.2), `moai spec audit` 은 채점 축이 없습니다(§5.3). t40 의 실제 차단 경로는 지시대로 열지 않았습니다.
