---
name: sweep-by-the-value-not-the-object
description: After a correction changes a number or a set, sweep the tree for that VALUE, not for the object you edited — t15 missed a sibling table three rounds running
metadata:
  type: feedback
---

When a correction changes a **value** (a count, a set of ids, a line number), sweep the tree for **that value**, not for the object you just edited. Sweeping by object finds the places you were already thinking about; sweeping by value finds the ones you were not.

**Why:** t15 reproduced this three rounds in a row. Round 3 corrected the mutation table's O row from five criteria to six (adding `005`), and swept two further sites (`plan.md:278`, `acceptance.md:458`) — all three found by asking "where else did I write about the O row?". It missed `acceptance.md:60`, a different table (§검증 원칙 4번) whose H row under-lists the same way. Grepping for `005` would have surfaced it; grepping for "O 행" could not. The project's own auto-memory already names the sibling pattern (`sweep-by-stem-not-by-phrase`, `one-file-sweep-leaves-the-other-two`); this is the object-vs-value axis of it, and it is the axis that kept slipping.

**How to apply:** as an auditor, after any correction lands, run the sweep yourself with the changed value as the pattern before accepting closure — the lane's sweep is object-shaped by construction, because the lane was editing an object. Also expect the miss to land in a *different table in the same file*: a document that explains one thing twice (once as principle, once as measurement) has two tables carrying the same numbers, and corrections reach the authoritative one first.

Related: [[harness-splits-one-capability-across-fields]] — the same t15 card, the same failure shape one level up (splitting by field instead of by capability).
