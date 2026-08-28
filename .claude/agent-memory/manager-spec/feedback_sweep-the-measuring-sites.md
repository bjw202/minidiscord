---
name: sweep-the-measuring-sites
description: A correction is not done when the passage is fixed — sweep the four producer classes (statement, restatement, measuring criterion, sibling reference), because the measuring sites are where corrections silently die
metadata:
  type: feedback
---

When correcting a SPEC finding, enumerate and sweep four classes of site before calling it done: (1) the passage that states the thing, (2) every passage that restates or summarizes it, (3) every criterion, mutation-table row, transition step, or **milestone assignment** that *measures* it, and (4) every cross-SPEC reference. Class 3 is the one that gets missed, and it is the one that makes the correction inert.

**Why:** SPEC-CHANAUTH-001 failed plan-audit twice in a row on exactly this shape. Round 1 withdrew a false premise from `spec.md` and left it verbatim in `plan.md`'s risk table — the document the run phase reads more often. Round 2's own corrections then reproduced the shape three more times: a mutation table grew 6→8 while the three lines consuming it stayed at 6; an AC's RED→GREEN transitions still said "one sibling criterion fails" after the plan had been amended to five; a criterion was pinned as "final" while calling a symbol that does not exist in the tree. Sweeping class 3 properly in round 3 surfaced defects no auditor had named: the two new mutations were assigned to **no milestone at all** (fixing the count alone would have left nothing to run them), a shell-only sibling criterion was being demanded in a `✓`-line list, and the mutation that removes the gate breaks four criteria, not the three the audit counted.

**How to apply:** Write the four classes down before editing, then grep for each. Two traps: (a) when an auditor says document A is stale relative to document B, check both directions — in round 3 the drift was in the *plan*, and the criterion the auditor called stale was correct; (b) a count fix is not a wiring fix — after changing "6 種" to "8", ask where the two new items actually get executed. Report per finding which classes were swept and what each turned up; a correction reported without that is what produced two FAILs. Related: [[contract-amendment-sweeps-siblings]], [[correction-may-not-cover-whole-card]], [[criteria-outside-the-regression-suite]].
