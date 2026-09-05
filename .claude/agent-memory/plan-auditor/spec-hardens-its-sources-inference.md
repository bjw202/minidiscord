---
name: spec-hardens-its-sources-inference
description: A SPEC restates its research report's hedged conditional as a measured fact — check background claims against the evidence file, not the report prose
type: feedback
metadata:
  type: feedback
---

When a SPEC cites a research report, the defect is rarely in the report. It is in the **transfer**: a conditional the report hedged arrives in the SPEC as a flat measured fact, and downstream criteria then rest on it.

**Why:** t40. `reproduction.md:84` wrote "**if** the same thing happens in a directory that has `.moai/config/sections`, stderr would also be 0 bytes" — an explicit inference. `spec.md:64` restated it as measured background: "this is what makes ② and a normal pass **byte-identical**". The only actual measurement of case ② was `gate-p3.err` at **416 bytes** against a `gate-baseline.err` of **0** — so the claim is falsified by the SPEC's own cited evidence. It had already propagated: `acceptance.md:59` justified AC-002's elapsed-time measurement with "elapsed time **was** the only local discriminator", past tense, when stderr had in fact discriminated in the run performed.

**How to apply:** for each factual claim in a SPEC's background section, do not stop at the report that backs it. Open the evidence artifact and measure (`wc -c`, `grep -c`, the recorded RC). Then check whether the source stated it as measurement or as inference — a hedge word in the source paired with a flat assertion in the SPEC is the signature. Look downstream too: the hardened claim is usually load-bearing for some AC's stated rationale, which is where it does real damage. Related: [[audit-report-is-not-evidence-either]], [[quoted-a-command-i-did-not-run]], [[criterion-command-narrower-than-its-then]].
