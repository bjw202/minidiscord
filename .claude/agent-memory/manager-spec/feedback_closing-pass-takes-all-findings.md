---
name: closing-pass-takes-all-findings
description: On a final-round audit closing pass, treat every finding — optional included — as mandatory, in one pass and one commit
type: feedback
metadata:
  type: feedback
---

When closing out a final-round plan audit (iteration N/N), apply **every** finding
the audit lists — blocking and optional alike — in a single edit pass and a single
commit. Do not defer a Minor finding, and do not treat "optional / at your
discretion" in the delegation as permission to skip.

**Why:** on t9's 3/3 closing pass the coordinator explicitly retracted its own
"F-05·F-06·F-07 are at your discretion" instruction mid-task and made all eight
findings mandatory. The reason is structural: the closing pass is the *last* time
anyone opens these files before run-phase — there is no fourth audit — so a
deferred Minor is not deferred, it is dropped. Splitting the work across commits
costs a second review of the same files for no gain.

**How to apply:** when the delegation names a subset as optional on a final round,
assume the full set. Where a finding needs judgement rather than a literal
replacement, make the minimum edit that closes it and record the reasoning in the
disposition report instead of deferring. Two related constraints from the same
incident: identifiers the operator spells out literally (a test `it` name that
persists into the repo) are copied verbatim, never re-worded; and where the audit
supplies replacement text in its findings section, use that text literally rather
than re-deriving it.

Verification for such a pass is `grep` with **verbatim output quoted**, because the
lead's grep is the only remaining check — see [[criteria-outside-the-regression-suite]]
and [[sweep-the-measuring-sites]].
