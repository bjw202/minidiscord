---
name: dimension-threshold-may-be-written-per-criterion
description: 「방화벽은 차원에 걸리지 개별 기준에 안 걸린다」는 기제 서술로는 맞지만, 그 차원의 통과선이 기준 단위로 쓰여 있으면 결론을 못 옮긴다 — default.md:9·:16 이 그렇다 (t35 4회차)
metadata:
  type: feedback
---

필수 통과 방화벽이 **차원** 단위로 작동한다는 사실은, 기준 하나가 미관측일 때 그 차원이 통과선을 넘는다는 것을 뜻하지 않는다. 차원의 통과선 자체가 기준 단위로 쓰여 있을 수 있다.

**Why:** t35 4회차에서 리드가 「미관측은 방화벽을 트지 않는다」의 첫 근거로 「방화벽은 `must_pass_dimensions` 에 걸리지 개별 기준에 걸리지 않는다」를 들었다. 기제 서술로는 맞다. 그런데 `.moai/config/evaluator-profiles/default.md:9` 의 Pass Threshold 열이 `All acceptance criteria PASS` 이고 `:16` 의 Must-Pass 항목이 `Functionality: All SPEC acceptance criteria must be met (no partial credit)` 다. **차원 통과선을 그 차원 자신의 문언에 대고 읽으면 기준 하나로 트인다.** 게다가 같은 파일 `:27` 은 `Mark unverifiable criteria as UNVERIFIED, not PASS` 로 UNVERIFIED 의 존재를 전제한다 — **프로파일이 자기와 모순된다.**

**How to apply:** 방화벽 논증을 검증할 때 기제(무엇에 걸리는가)와 문언(그 무엇의 통과 조건이 어떻게 쓰였는가)을 따로 읽는다. 결론이 정책적으로 옳더라도 「문언에서 따라 나온다」와 「문언에 반해 정한다」는 다른 주장이고, 후자로 적어야 다음 카드가 근거를 다시 세우지 않는다. 규약을 첫 확정하는 카드에는 그 구분을 명시적으로 요구할 것 — [[precedent-citation-must-discriminate]] 와 같은 부류(근거가 결론을 실제로 옮기는지)다.
