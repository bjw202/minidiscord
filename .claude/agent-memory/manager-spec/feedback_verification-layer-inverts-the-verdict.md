---
name: verification-layer-inverts-the-verdict
description: A harness helper that recomputes the spec's rule can silently drop a term, inverting which implementation passes; only a mutation shows the inversion is gone
metadata:
  type: feedback
---

When a criterion layer recomputes the spec's rule independently (the point of not sharing code with the implementation), a term dropped from that copy does not merely weaken the criterion — it **inverts** it. The correct implementation fails and the defective one passes, and every count still looks healthy.

Closing such a defect is therefore not "make the helper match the spec." That is evidence about two documents. The defect is about which implementations pass, so the closure claim must rest on a **mutation**: remove the term from one site of the implementation, name in advance which criterion that reddens, and require the run phase to record the observed result. If no criterion reddens once the helper is fixed, the criterion set is still wrong — add a criterion, do not re-adjust the helper.

**Why:** t22 round 2 added channel binding (`cb`) to three transcripts in spec.md but omitted it from the three harness helpers in acceptance.md. Element ④ — the whole answer to the round-1 Critical — was measured nowhere; a correct implementation failed AC-005 while an implementation omitting `cb` entirely passed eleven criteria green. Round 2 also predicted "no criterion breaks" for a mutation that, once the helpers were fixed, does break one — the prediction had been true only because of the defect.

**How to apply:** whenever a spec adds a term to a rule the harness recomputes (a transcript, a key derivation, a signature message, a canonical form), grep the harness copies by stem in the same edit. Then pair the fix with per-site mutations — one per site the term was added to — each naming the criterion it reddens. Treat any "no criterion breaks" prediction as suspect until you have checked it is not an artifact of the very gap you are closing. See [[replaced-criteria-are-invisible]] and [[sweep-the-measuring-sites]].
