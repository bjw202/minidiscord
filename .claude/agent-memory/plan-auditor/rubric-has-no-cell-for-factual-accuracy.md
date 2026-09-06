---
name: rubric-has-no-cell-for-factual-accuracy
description: 네 차원은 문서의 형태만 재고 주장의 참임은 재지 않는다 — 과대주장은 Clarity 에서 깎지 말고 blocking 으로 올린다; 점수 칸 없는 검사 여덟은 관측이고, 의도인지 누락인지는 미규명
metadata:
  type: feedback
---

계획 감사의 네 차원(Clarity / Completeness / Testability / Traceability)은 **문서의 형태**를 재고 **주장의 참임**은 재지 않는다. 네 앵커의 술어를 그대로 읽으면 각각 「한 뜻으로 읽히는가」·「있어야 할 절이 있는가」·「합불을 가릴 수 있는가」·「REQ 와 AC 가 이어져 있는가」이고, 어느 것도 「SPEC 이 적은 사실이 참인가」를 묻지 않는다.

따라서 **과대주장을 Clarity 점수에서 깎지 마라.** Clarity 1.0 앵커가 "single, unambiguous interpretation" 이므로, **완벽히 한 뜻으로 읽히면서 그 뜻이 거짓인 문장은 Clarity 1.0 을 받는다.** 과대주장은 그 차원의 정의역 밖이다. 대신 M6 blocking 으로 올려 재작업 경로로 보낸다 — 명료함과 참임은 다른 술어이고, 하나를 다른 하나의 점수로 대신 재면 둘 다 흐려진다.

**Why:** card t42(2026-09-06). 네 앵커의 정의 문장을 한 줄씩 읽어 확인했고, 루브릭 표면 여섯 파일에서 사실성 어휘(accura/factual/overclaim/unsupported/verifiab 등)를 훑어 유의미한 적중이 0건이었다(범위: `plan-auditor.md` · `sync-auditor.md` · evaluator-profiles 넷). 운영자가 2026-09-06 「현행 유지」로 처분했고, 그 근거를 조사가 원문으로 뒷받침했다.

**같은 카드의 짝 관측 — 점수 칸이 없는 검사 부류:** RQ-3(HOW 혼입) · RQ-4(구현 세부 혼입) · AC-1(Given-When-Then) · CN-1(요구 간 모순) · CN-2(제외 항목 충돌) · CN-3(우선순위 일관성) 여섯은 네 앵커 어디에도 대응이 없고 필수 통과도 아니다. RQ-5(부분)와 사실 정확성을 더하면 최소 여덟. 「칸이 없다」의 정확한 뜻은 **판정 산술을 못 움직인다**이다(M6 앵커: "The verdict remains anchored to"). 다만 결과가 아예 없지는 않다 — 같은 절(앵커: "blocking findings are fixed before")이 재작업 경로를 준다. 죽은 검사가 아니라 **산술 밖에서 도는 검사**다.

**이것이 의도인지 누락인지는 규명되지 않았다.** 심의된 설계라는 증거를 찾지 못했으므로 「설계다」라고 읽지 마라. 정황은 누락 쪽을 가리킨다 — MP-5 · MP-6 은 "never be silently absorbed into the aggregate score", MP-7 은 "This gate is score-independent" 라고 **명시**돼 있는데 위 여섯은 아무 데도 그렇게 적혀 있지 않다. 명시된 것과 안 된 것이 같은 문서에 나란히 있다는 사실은 정황이지 증거가 아니다.

**부수 관측:** `plan-auditor.md` 는 자기 집계식을 적지 않는다(`grep -c "harmonic"` → 0). Overall Score 는 **비가중 조화평균**이며 정의 자리는 `agent-common-protocol.md` § Skeptical Evaluation Stance(앵커: "Score quality as the harmonic mean of dimensions")다. 산술평균으로 계산하지 마라 — 한 차원이 낮을 때 두 값이 크게 갈린다. 그리고 `.moai/config/evaluator-profiles/` 의 "Plan-Auditor Dimension" 표(D7/D8 각 50%)는 **죽은 표**다: `grep -c "evaluator" plan-auditor.md` → 0, 즉 이 감사관은 그 디렉터리를 읽으라고 지시받은 적이 없다. 그 표를 근거로 계획 감사의 가중치를 판단하지 마라.

**How to apply:** SPEC 을 감사할 때 ① 사실 부정확성을 발견하면 차원 점수를 건드리지 말고 blocking 으로 분류해 근거와 함께 올린다, ② 위 여섯 부류를 발견하면 점수 칸을 찾지 말고 blocking 으로 올리되 「판정을 강제하지 못한다」는 것을 보고서에 명시한다, ③ Overall Score 는 조화평균으로 계산하고 그 근거 자리를 인용한다. 전체 기술은 `.claude/rules/moai/core/audit-rubric-scope.md`. 관련: [[disclosed-gap-without-a-criterion]], [[criterion-command-narrower-than-its-then]], [[decision-table-ignores-its-own-division-of-labour]]
