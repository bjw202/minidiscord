---
paths: ".moai/specs/**,.moai/reports/**"
---

# 감사 루브릭의 범위 — 무엇을 재고 무엇을 재지 않는가

> Loading scope: `paths:` 로 `.moai/specs/**` · `.moai/reports/**` 에 한정 — 감사가 SPEC 산출물이나 감사 보고서를 읽고 쓸 때만 적재되고, 항상 적재되는 표면에서는 빠집니다.
>
> Origin: card t42 (2026-09-06). 근거 보고서 `.moai/reports/t42/rubric-survey.md`(조사) · `.moai/reports/t42/repair-scope.md`(수리 회차 관측). 운영자 처분 「현행 유지」(2026-09-06) 및 리드 처분 19·21·22.
>
> **왜 이 내용이 `plan-auditor.md` / `sync-auditor.md` 본문이 아니라 여기 있는가:** 그 파일들은 `.moai/manifest.json` 에 `template_managed` 로 등재돼 있어, 본문을 고치면 다음 `moai update` 가 템플릿 원본으로 되돌립니다(`.claude/rules/moai/development/skill-authoring.md` [HARD] — "If the user modifies it directly, the next `moai update` overwrites it — user customizations are lost"). 되돌아온 파일에는 아래 §2 가 반증한 문장이 다시 적혀 있고 반증 기록은 남지 않으므로, 정정을 **새 파일에** 둡니다. 이 파일은 매니페스트에 없어 덮어쓸 대상이 없습니다.

---

## 0. 이 문서가 세우는 것

감사관이 「4차원 루브릭」이라는 말을 만났을 때 알아야 할 네 가지입니다.

1. **「4차원」은 이 저장소에서 한 가지를 가리키지 않습니다** (§1)
2. **차원 목록이 헌법으로 동결돼 있다는 문장은 근거가 없습니다** (§2)
3. **plan-auditor 의 집계식은 자기 파일이 아니라 공통 규약에 있습니다** (§3)
4. **점수 칸이 없는 검사 부류가 최소 여덟 있고, 그것이 의도인지 누락인지는 규명되지 않았습니다** (§4)

---

## 1. 「4차원」은 서로 다른 넷이다

| 계정 | 차원 | 정의 자리 | 척도 |
|---|---|---|---|
| **A — 계획 단계 감사** | Clarity / Completeness / Testability / Traceability | `plan-auditor.md` § M3: Rubric Anchoring | 0.0–1.0, 앵커 4단 |
| **B — 동기화 단계 감사** | Functionality / Security / Craft / Consistency | `sync-auditor.md` § Evaluation Dimensions | 0–100, 가중 40/25/20/15 |
| **C — 평가자 프로파일의 "Plan-Auditor Dimension"** | D7 Cross-SPEC (50%) / D8 Cross-Platform (50%) | `.moai/config/evaluator-profiles/default.md` § D7/D8 Plan-Phase Dimensions | 이분 + 가중치 표기 |
| **D — SPEC 품질 체크리스트** | Clarity / Completeness / Testability / **Consistency** | `.claude/skills/moai-workflow-spec/references/reference.md` | 0–100 |

**A 와 B 는 이름도 대상도 척도도 다른 별개의 잣대입니다.** 한 감사의 점수를 다른 감사의 통과선과 비교하지 마십시오.

**C 는 죽은 표입니다 — 읽으라고 지시받은 주체가 없습니다.** 그 표는 제목과 열 이름으로 plan-auditor 를 향하는데, `plan-auditor.md` 는 evaluator-profiles 디렉터리를 한 번도 참조하지 않습니다:

```
$ grep -c "evaluator" .claude/agents/moai/plan-auditor.md
0
```

유일한 프로파일 독자인 sync-auditor 가 그 표를 읽더라도, 표 자신이 "do NOT contribute to sync-auditor's 4-dimension overall score" 라고 적어 스스로를 배제합니다. **따라서 C 가 A 와 충돌하는 것은 문서 정합성 문제이지 채점 동작을 바꾸는 결함이 아닙니다.** 다만 「plan-auditor 의 차원이 D7·D8 둘이고 각 50%」로 읽는 독자를 오도할 수 있으므로, C 를 근거로 계획 감사의 가중치를 판단하지 마십시오.

**D 는 구속력 있는 감사 표면이 아닌 스킬 참고 문서**입니다. 다만 D 의 Consistency 첫 항목이 "No conflicting requirements" 라는 점은 §4 와 함께 읽을 값어치가 있습니다 — 그 개념은 harness 안에 이미 있는데, 구속력 있는 감사관의 채점표에만 없습니다.

---

## 2. 차원 목록의 「동결」 주장은 근거가 없다

`sync-auditor.md` 의 § Scoring Model 은 이렇게 적습니다(앵커: "The dimension enum is FROZEN"):

> The dimension enum is FROZEN (design-constitution §12 Mechanism 3) at exactly `Functionality`, `Security`, `Craft`, `Consistency`

**인용처가 그렇게 말하지 않습니다.** `.claude/rules/moai/design/constitution.md` §12 Mechanism 3(앵커: "### Mechanism 3: Must-Pass Firewall")의 원문이 얼리는 것은 **필수 통과 방화벽**입니다:

> "Must-pass criteria cannot be compensated by high scores in other areas. … This is FROZEN and cannot be evolved."

차원 목록에 대한 언급이 없고, 두 차원 이름은 그 문서에 아예 나오지 않습니다:

```
$ grep -c "Craft" .claude/rules/moai/design/constitution.md      → 0
$ grep -c "Security" .claude/rules/moai/design/constitution.md   → 0
```

### 2.1 인용이 네 줄 아래 다른 주장까지 따라갔다

같은 절에 FROZEN 이 두 번 나오고 처지가 다릅니다. 앞의 것(앵커: "HARD must-pass firewall (FROZEN")은 **방화벽**을 얼리며 인용처와 맞습니다. 뒤의 것이 **차원 목록**으로 주어를 바꾸면서 같은 인용을 그대로 가져갔습니다. 원래 인용이 틀린 것이 아니라, 인용이 다른 주장에까지 딸려 간 것입니다.

그리고 그 문장은 스스로 반대 증거를 담고 있습니다 — 같은 줄이 "a non-canonical dimension name in a profile is loaded best-effort (**unknown dims skipped**)" 라고 적습니다. **건너뛰기는 거부가 아닙니다.** 강제의 반대입니다.

### 2.2 실제로 넷을 지키는 것은 규약이 아니라 결합이다

`.claude/workflows/sync-audit-4dim.js` 가 네 이름을 **세 자리에 손으로** 적어 둡니다(앵커: `const DIMENSIONS`, `enum: ['Functionality'`, `const judges = await parallel(`), 여기에 판정자 프롬프트의 설명 목록(앵커: `Dimension focus for`)이 더해집니다.

결정적으로 **판정자 배열은 `DIMENSIONS.map` 이 아니라 손으로 쓴 네 개짜리 리터럴**입니다. `DIMENSIONS` 는 판정자를 만들지 않고 결과를 번호로 맞춰 읽는 데만 쓰입니다. 그래서 이름 목록만 다섯으로 늘리면 다섯째 판정자가 `undefined` 가 되어 스크립트 **자신의** 결측 가드가 `INCOMPLETE` 를 냅니다.

card t42 가 판정 블록을 축자로 떼어 내 에이전트 0개로 실측한 결과(`.moai/reports/t42/evidence/coupling.out`):

```
control  (4 dims, 4 judges): {"verdict":"PASS","harmonic_mean":0.8999999999999999}
mutation (5 dims, 4 judges): {"verdict":"INCOMPLETE","missing":["Rigor"]}
repaired (5 dims, 5 judges): {"verdict":"PASS","harmonic_mean":0.9}
```

세 번째 줄이 결론입니다 — **판정자를 함께 넣으면 다섯 차원이 아무 저항 없이 통과합니다.**

### 2.3 감사관이 이 절에서 가져갈 것

- **「다섯째 차원은 헌법이 금지한다」를 전제로 쓰지 마십시오.** 그 전제는 인용된 자리에서 확인되지 않습니다.
- **동시에, 차원 목록을 임의로 바꾸지도 마십시오.** 이유는 동결이 아니라 결합입니다 — 네 자리를 함께 고쳐야 하고, 그 파일은 템플릿 관리라 로컬 편집이 `moai update` 에 되돌아갑니다.
- **「이름 목록만 늘려 보는」 변이 실험은 판별력이 없습니다.** 바깥의 강제가 아니라 스크립트 자신의 산술이 먼저 깨지므로, 그 INCOMPLETE 를 「무언가가 넷을 강제한다」로 읽으면 거짓 결론입니다.

---

## 3. plan-auditor 의 집계식은 자기 파일에 없다

`plan-auditor.md` 는 Overall Score 의 산출법을 자기 본문에 적지 않습니다:

```
$ grep -c "harmonic" .claude/agents/moai/plan-auditor.md
0
```

집계식은 **모든 에이전트에 적재되는 공통 규약**에 있습니다 — `.claude/rules/moai/core/agent-common-protocol.md` § Skeptical Evaluation Stance(앵커: "Score quality as the harmonic mean of dimensions"):

> Score quality as the harmonic mean of dimensions, not the average

**결함은 「미정의」가 아니라 「가리키지 않음」입니다.** 계획 감사관은 통과선(Tier S 0.75 / M 0.80 / L 0.85)과 비교될 점수를 내면서, 그 산출법을 자기 파일 안에서 지시받지 않고 공통 규약의 한 줄에 암묵적으로 의존합니다.

**감사관이 가져갈 것:** Overall Score 는 **비가중 조화평균**입니다. 산술평균으로 계산하지 마십시오 — 한 차원이 낮을 때 두 값이 크게 갈립니다.

---

## 4. 점수 칸이 없는 검사 부류 — 관측과 미결을 나눠 적는다

여기는 **세 문단을 섞지 말고 나눠 읽어야 하는 자리**입니다.

### (a) 관측 — 판정 산술에 칸이 없다

`plan-auditor.md` 의 검사 목록 중 아래 여섯은 네 차원 어느 앵커에도 대응 문장이 없고, 필수 통과 일곱 중 어느 것도 아닙니다:

| 검사 | 무엇을 보는가 |
|---|---|
| RQ-3 | 요구가 WHAT/WHY 인가 (HOW 혼입) |
| RQ-4 | 함수명·클래스명·라이브러리 버전·API 스키마 혼입 |
| AC-1 | AC 가 Given-When-Then 형태인가 |
| CN-1 | 두 요구가 서로 모순되지 않는가 |
| CN-2 | 제외 항목이 포함 요구와 충돌하지 않는가 |
| CN-3 | 우선순위·라벨이 범위와 일관된가 |

여기에 RQ-5(부분 — Testability 는 AC 만 규율하고 REQ 정규문은 규율하지 않음)와 **SPEC 본문 주장의 사실 정확성**(검사 항목조차 없음)을 더하면 최소 여덟입니다.

「칸이 없다」의 정확한 뜻: **판정 산술을 움직이지 못합니다.** `plan-auditor.md` § M6(앵커: "The verdict remains anchored to")이 판정을 필수 통과 방화벽과 루브릭 점수에 못박습니다.

다만 **결과가 아예 없는 것은 아닙니다.** 같은 절(앵커: "blocking findings are fixed before")이 blocking 분류에 재작업 경로를 줍니다 — 판정을 다시 보기 전에 고치라는 것입니다. **점수를 못 움직일 뿐 재작업은 시킵니다.** 「죽은 검사」가 아니라 「판정 산술 밖에서 도는 검사」입니다.

### (b) 미결 — 의도인지 누락인지 규명되지 않았다

**이 상태가 심의된 설계라는 증거를 card t42 는 찾지 못했습니다.** 그러므로 이 문서는 그것을 「설계다」라고 적지 않습니다. 확인되지 않은 의도를 사실로 적는 것은 이 카드가 겨눈 결함 부류 그 자체입니다.

운영자 처분 「현행 유지」(2026-09-06)는 **채점 규칙을 지금 바꾸지 않는다**는 뜻이며, **현 상태가 옳다고 확정한다**는 뜻이 아닙니다.

미결로 남는 물음: 이 여덟에 점수 칸을 주어야 하는가, 필수 통과로 올려야 하는가, 아니면 현행대로 blocking 전용으로 두는 것이 옳은가. **이는 감사 게이트의 동작 변경이므로 별도 카드의 처분 사항입니다.**

### (c) 대조 — 명시된 것과 안 된 것

이 미결을 「누락 쪽」으로 기울게 하는 대조가 같은 문서 안에 있습니다. **필수 통과 셋은 점수와 무관하다고 명시돼 있습니다:**

- MP-5 (D7) — 앵커: "never be silently absorbed into the aggregate score"
- MP-6 (D8) — 같은 문장
- MP-7 (clarification gate) — 앵커: "This gate is score-independent"

**위 여섯은 아무 데도 그렇게 적혀 있지 않습니다.** 명시된 것과 안 된 것이 같은 문서에 나란히 있다는 사실은, 여섯이 심의된 적이 없다는 쪽을 가리킵니다 — 다만 이것은 **정황이지 증거가 아닙니다.** (b) 는 여전히 미결입니다.

### (d) 과대주장에 대해 — 명료성 점수에서 깎지 않는다

SPEC 본문의 사실 부정확성(과대주장)은 **명료성(Clarity) 점수에서 깎지 않습니다.** Clarity 의 술어는 「한 뜻으로 읽히는가」이므로(앵커: "single, unambiguous interpretation"), **완벽히 한 뜻으로 읽히면서 그 뜻이 거짓인 문장은 Clarity 1.0 을 받습니다.** 과대주장은 Clarity 의 정의역 밖입니다.

과대주장은 차단으로 다루십시오 — M6 blocking 분류로 올리고, 재작업 경로로 보냅니다. **명료함과 참임은 다른 술어이고, 하나를 다른 하나의 점수로 대신 재면 둘 다 흐려집니다.**

---

## 5. 상류에서 고쳐야 할 자리 (여기서는 못 고침)

아래 셋은 템플릿 원본(상류 MoAI-ADK 저장소)에서만 고칠 수 있습니다. 이 저장소에서 고치면 `moai update` 가 되돌립니다. **자리를 적어 두기만 합니다.**

| 자리 | 무엇을 | 근거 |
|---|---|---|
| `.claude/agents/moai/sync-auditor.md` § Scoring Model (앵커: "The dimension enum is FROZEN") | 차원 목록 동결 주장을 §2 대로 사실에 맞게 | §2 |
| `.claude/agents/moai/plan-auditor.md` | 집계식 자리(`agent-common-protocol.md` § Skeptical Evaluation Stance)를 가리키는 한 줄 + §4 (a)(c) 를 적는 한 절 | §3 · §4 |
| `.moai/config/evaluator-profiles/default.md` § D7/D8 Plan-Phase Dimensions | 죽은 표임을 표시하거나 제거 | §1 |

---

## 6. 이 문서가 세우지 못한 것 (열린 채로 둠)

1. **`moai update` 를 실제로 돌려 덮어쓰기를 재현하지 않았습니다.** 근거는 규약 두 자리(하나는 [HARD])와 매니페스트 provenance 단일값입니다.
2. **덮어쓰기인지 3방향 병합인지 확정하지 못했습니다.** `moai update --verbose` 도움말은 "3-way merge fallback notices" 를, `constitution.md` 는 「user file is preserved」 경로를 적는 반면 `skill-authoring.md` 는 [HARD] 로 「overwrites … lost」라고 적습니다. 겹치는 자리를 규명하지 못했습니다.
3. **Go 측 차원 enum 강제의 부재는 「증거를 찾지 못함」입니다** — 부재를 증명한 것이 아닙니다. 이 저장소에는 Go 소스가 없고, 설치 바이너리 `strings` 조사는 런타임 조립 문자열을 보지 못합니다.

**1·2 를 닫는 경로:** 이 저장소 밖 별도 클론에서 `moai update` 를 실제로 돌려 template_managed 파일의 로컬 편집이 어떻게 되는지 관측하는 것. 이 나무에서 돌리지 마십시오 — `moai update` 는 워크트리 밖 공유 자리까지 쓸 수 있어 격리가 서지 않습니다.

**3 을 닫는 경로:** 상류 MoAI-ADK 저장소의 `internal/runtime` 원문 열람.

---

Version: 1.0.0
Classification: Evolvable — 감사 루브릭의 범위 기술. 채점 규칙을 바꾸지 않으며, 어떤 게이트의 의미도 변경하지 않습니다.
