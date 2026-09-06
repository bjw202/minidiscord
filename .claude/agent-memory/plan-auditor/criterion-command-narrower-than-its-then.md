---
name: criterion-command-narrower-than-its-then
description: A criterion's Then clause names a set, but its command matches a strictly smaller set — it passes without establishing what it claims
type: feedback
metadata:
  type: feedback
---

When an acceptance criterion pairs a prose **Then** clause with a shell command, compare the two sets before scoring it. If the command's pattern matches a strictly smaller set than the Then clause names, the criterion is void in a new way: it passes cleanly while establishing nothing it claims.

**Why:** t40 `AC-GATECHECKS-009`. Then clause: "every count value (25 · 37 · 28 · 23) appears inside the same table or paragraph as its command or definition; standalone statements = 0". Command: `grep -rnE '\b(25|37|28|23)자리' <spec dir>`. Two independent narrowings — the value list omitted `46` (the value the SPEC's own arithmetic actually used at `spec.md:140`, undefined anywhere in the SPEC), and the `자리` suffix requirement skipped every bare numeral. The command returned 2 in-context hits and would have reported clean; a pattern matching what the Then clause actually names surfaced three uncovered sites, one of which was a live violation of the SPEC's own `[HARD]` requirement. The criterion was authored specifically to enforce that requirement and could not detect its breach.

This is distinct from [[spec-criteria-that-verify-nothing]] (criterion passes with or without the repair) and from [[negative-assertion-is-green-on-absence]] (criterion green because the target is absent). Here the criterion *does* discriminate — just over the wrong domain.

**How to apply:** for any AC carrying a command, run the command AND run a deliberately wider variant, then diff the hit sets. A non-empty difference that the Then clause covers is a finding. Watch two generators specifically: an enumerated value list that has drifted from the values used elsewhere in the document, and a suffix or literal in the regex that the prose never required. Related: [[sweep-table-counts-itself]] (the same t40 §6 counts drifted 37→46 by self-reference), [[quoted-a-command-i-did-not-run.md]].
