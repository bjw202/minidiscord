---
name: harmonic-mean-can-cap-a-card-below-threshold
description: Run the sensitivity analysis before reporting a FAIL — a harmonic mean over dimensions with structural caps can make the threshold unreachable regardless of the findings, and the lead needs that number to decide
metadata:
  type: feedback
---

Before reporting a score-based FAIL, compute what the score becomes if each
dimension is raised, including to 1.00. The harmonic mean is dragged by its
lowest value, so two dimensions capped for reasons **outside the card's scope**
can put the threshold out of reach no matter how the findings are dispositioned.

**Why:** t35 2회차 — Security capped at 0.75 (a documented, deliberately-open
`ps eww` channel; the 1.00 anchor requires "no findings of any severity") and
Craft capped at 0.75 (no coverage tooling wired anywhere in the repo, so the
1.00 anchor "Coverage >= 85%" is unmeasurable). With those two fixed, even
Functionality = 1.00 yields 0.785 — under 0.80. Reporting "FAIL, fix the
findings" without that table would have sent the lane to chase a threshold the
rubric could not deliver.

**How to apply:**
- Emit a small table: current, each dimension raised, and the theoretical
  ceiling with the structural caps held.
- State plainly which dimensions are capped and **why the cap is structural**
  (scope exclusion, absent tooling) rather than a defect the card can fix.
- Say which threshold is still reachable and which is not. In t35 the next round
  can clear 0.80 but essentially cannot clear 0.85 — which converts a dormant
  SSOT threshold ambiguity into a decision the lead must make now.
- This is not an argument for lowering the bar. The score stands; what changes
  is that the lead learns whether the remaining work can move it.

Related: [[frozen-citation-followed-the-wrong-claim]] (the aggregation formula
lives in the common protocol, not the auditor file — read it before computing).
