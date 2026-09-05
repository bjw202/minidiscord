---
name: mechanism-reproduced-is-not-what-happened
description: Reproducing a failure mechanism raises a hypothesis to "possible", never to "this is what occurred" — an investigation SPEC must keep rival branches open after a successful probe
metadata:
  type: feedback
---

When a probe reproduces a failure signature, record it as **mechanism reproduced**, not as the answer. Say plainly, in the SPEC body, what the measurement does NOT establish, and keep every rival branch in the branch table.

**Why:** On SPEC-WSUPGRADE-001 (card t39) a probe reproduced the exact 404 signature by forcing two Fastify apps onto one port number. It was tempting to let the repair narrow the branch table to that one story. Two things were still unmeasured and both are load-bearing: nobody had observed *who answered* in the actual failing run, and the *frequency* with which the mechanism fires was never measured. The lead's instruction was explicit — "possibility ≠ what occurred; do not let the repair turn this investigation SPEC into a SPEC that has already chosen its answer." A branch removed because it was never tested is a choice, not an observation.

**How to apply:** In any investigation SPEC, after folding in a successful probe: (1) split the write into "what this establishes" / "what this does not establish"; (2) leave untested branches in the table with an explicit note that they are *untested*, not *disproven*; (3) put the frequency/platform gaps into the unverified section rather than dropping them. Pairs with [[discriminator-domain-is-unreachable]] — a branch that survives in the table still needs evidence that its input can actually occur, or the criterion measuring it passes on synthetic inputs alone.
