---
name: scoring-mode-decides-which-rubric-rule-binds
description: "「앵커 네 값만 합법·보간 금지」는 계층형 채점 모드의 규칙이다 — 평문 백분율 모드에 끌어오면 근거가 무너진다 (t35 5회차)"
metadata:
  type: feedback
---

sync-auditor 의 채점 규칙은 **두 모드로 갈라져 있고, 어느 모드인지가 어느 규칙이 걸리는지를 정한다.**

- **평문 가중 백분율(기본)** — `harness.yaml` 이 `evaluator_mode: hierarchical` 을 설정하지 **않으면** 이것이다. 보고 형식이 `{n}/100` 이고, 프로파일의 `## Scoring Rubric` 앵커표는 **보정 루브릭**이지 허용값 열거가 아니다. `70/100` 은 합법이다.
- **계층형** — 그 모드에서만 「점수는 0.25/0.50/0.75/1.00 이어야 하고 중간값은 거부된다(`ErrFlatScoreCardProhibited`)」가 걸린다.

**Why:** t35 에서 리드가 4회차의 Functionality `0.70` 을 「앵커 목록에 없는 근거 없는 보간값」이라며 `0.75` 로 올렸다. 그 「보간 금지」는 계층형 규칙이고, 실측하면 이 저장소에 `hierarchical` 은 0건이다 — `grep -rn evaluator_mode .moai/config/` 가 내는 것은 `final-pass`·`per-sprint` 뿐이고 **그 둘은 개입 «시점» 축이지 채점 «입도» 축이 아니다.** 결론이 틀렸다는 뜻은 아니지만 근거가 무너지고, 그 근거는 선례로 승계된다.

**How to apply:**
- 회차 시작에 모드를 **실측으로** 확정한다: `grep -rn "evaluator_mode\|aggregation:" .moai/config/`. `hierarchical` 이 없으면 백분율 모드다.
- 앵커표는 **문언 적합성**으로 쓴다("0.75 는 «All primary AC pass» 를 요구하는데 이 SPEC 엔 primary/secondary 구분이 없다") — 값의 정의역으로 쓰지 않는다.
- 리드가 앵커를 이유로 점수를 움직이면, **그 규칙이 이 SPEC 에 걸리는지부터** 확인한다. 걸리지 않으면 「따라 나온다」가 아니라 「이 저장소는 이렇게 정한다」로 다시 적게 한다.
- **부수 효과를 계산해 보일 것**: 앵커 양자화를 진짜로 채택하면 Functionality 만 오르는 게 아니라 Craft·Consistency 도 아래 앵커로 끌려 내려가, 총점이 오히려 낮아질 수 있다.

관련: [[dimension-threshold-may-be-written-per-criterion]] · [[frozen-citation-followed-the-wrong-claim]] · [[precedent-citation-must-discriminate]]
