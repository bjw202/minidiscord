---
name: lookalike-control-is-not-the-judgment
description: A positive control written in shell does not exercise a judgment implemented in code; check whether the recorded control runs the same expression the program runs, and look for in-program nonzero values as the real vacuity exclusion
metadata:
  type: feedback
---

A recorded positive control proves only what its own commands executed. When the
criterion's judgment lives in program code, a control written as shell is a
**lookalike**: it can establish that the probe command detects its target and
that a comparison flips, but not that the program's own expression flips.

**Why:** t35 2회차 — `AC-LIVEENV-014 ㉢`. The judgment is
`narrowAfter === narrowBefore` in `scripts/live-dryrun.mts:165`. The evidence file
recorded `test "$B" -eq "$D"; echo exit=$?` in bash. Two different pieces of code.
The bash control was sound for what it covered (pgrep catches a newly spawned
match, 1→2; equality flips) and silent about the program.

**How to apply:**
1. Read the judgment expression in the code, then read the control. If they are
   not the same expression, say so — do not accept the control as evidence the
   judgment discriminates.
2. Look for the real exclusion in the program's own output. The vacuity path is
   usually an error-swallowing wrapper (`catch { return 0 }`). **A nonzero value
   emitted by that wrapper during the run proves the silent path did not fire.**
   In t35 `narrow_before=1`, `narrow_after=1`, `descendant_any=2` did that work,
   and a machine-written report file corroborated the human-written one.
3. Separate "this run was not vacuous" (a fact about the run) from "the judgment
   cannot be vacuous" (a property of the code). The latter needs the positive
   control folded INTO the pass expression — a reported-but-unjudged control
   value leaves the vacuity live for every future run.

Related: [[criterion-rogue-weaker-than-real-attacker]],
[[sibling-criterion-makes-a-criterion-vacuous]].
