---
name: a-count-is-not-an-attribution
description: A window-level counter delta cannot say the captured event was mine; require a correlating value tying the observation to that one event
metadata:
  type: feedback
---

An observation that counts events over a window cannot answer "did this happen to **this** request". Before writing a discriminator, name the correlating value that binds one observation to one captured event — a socket identity, a request path, a sequence number — and require it in the criterion.

**Why:** SPEC-WSUPGRADE-001 v0.2.0 replaced a dead discriminator (socket tuple, constant) with "did my app receive it", implemented as an `onRequest` counter delta across the capture window. Two failures at once: the counter could never rise for the captured event (upgrade requests bypass the request pipeline entirely once an `upgrade` listener exists), and the only way it *could* rise was unrelated concurrent traffic — a confound biased toward "my app answered". Worse, the acceptance criterion accepted "a real capture that produced that branch" as reachability evidence, so one confounded capture would certify itself. Same defect class as the round-1 finding, reproduced on the replacement's own axis.

**How to apply:** whenever a criterion asks whether an actor observed a specific event, reject count-deltas, before/after totals, and "the log grew" as evidence. Ask what makes the observation attributable, and put that value in the criterion. Also probe that the chosen window actually fires for the event class in question — [[feedback_criterion-never-checks-its-own-domain]] is the sibling failure where the mapping is fine but the domain is unreachable. Related: [[feedback_mechanism-reproduced-is-not-what-happened]].
