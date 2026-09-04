---
name: mutation-across-a-package-boundary-cannot-fail
description: A mutation in package B whose pass value is "zero criteria break in package A" proves nothing when A imports nothing from B — the result was fixed by module topology before the mutation ran
metadata:
  type: feedback
---

Before accepting a mutation as evidence for an independence claim, check whether the mutated code
is reachable from the suite that judges it. A mutation whose declared pass value is "the other
package's criteria break zero times" is vacuous when the two packages share no import edge: the
zero was decided by the dependency graph, not by the mutation.

**Why:** t34 / SPEC-PERMROUTE-001. `REQ-PERMROUTE-010` claimed verdict-delivery correctness no
longer depends on the `channel/` `emitted` guard, and cited mutation M6 (delete the guard, observe
`서버 쪽 0건`). `grep -rn "from .*channel" server/src server/test` returns nothing — the server
package cannot observe the guard under any mutation. The SPEC's own §7 success definition had the
same shape ("measured inside the server package, and that measurement holds regardless of the
guard"), making it unfalsifiable by construction.

The conclusion was nonetheless true — established independently by single-target routing plus a
mechanically verified zero-caller broadcast method. So the finding is evidence integrity, not a
functional defect, and the fix is to re-attribute the measurement rather than to re-run anything.

**How to apply:** for any cross-package mutation, run the import check first
(`grep -rn "from .*<other-package>" <judging-suite-path>`). Empty output means the mutation's
expected result is a topology fact. Then ask which criterion *would* go red if the claim were
false, and demand that criterion instead. Sibling lessons on the same failure class:
[[spec-criteria-that-verify-nothing]], [[criterion-rogue-weaker-than-real-attacker]].
