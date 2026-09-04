---
name: criterion-never-checks-its-own-domain
description: A criterion fed only synthetic inputs measures the function, never whether its inputs can occur — pair every mapping check with a domain-reachability clause
metadata:
  type: feedback
---

When an acceptance criterion checks that a rule maps N inputs to N distinct names, add a second, separately-failing clause: **for each branch, recorded evidence that an input yielding that branch can actually occur in a real capture.** Synthetic inputs alone must not suffice.

**Why:** SPEC-WSUPGRADE-001's central criterion (AC-004) fed three hand-written inputs to a discriminator and passed when they produced three different names. The function genuinely discriminated — but two of the three inputs could never arise in a real observation, because the two socket values it compared were a constant "equal" (a client's `remotePort` is its own port, by TCP definition) and a constant "mismatch" (the app binds `::1`, the client dials literal `127.0.0.1`). All three branches therefore produced the same observed pair, and the criterion could not see it. The audit named this the repo's recurring shape: the criterion measures the function and never asks whether the function's domain is reachable.

**How to apply:** In any criterion of the form "inputs X1..Xn map to names Y1..Yn", write the binary judgment as two conditions that fail independently — (1) the mapping, (2) reachability evidence per branch, admitting only a real capture record or the output path of an actually-executed probe. Add a mutation that fills a reachability slot with a path that does not exist; the criterion must go red, or clause (2) is prose rather than a machine. State honestly which branches currently have reachability evidence and which do not. Pairs with [[mechanism-reproduced-is-not-what-happened]].
