---
name: rederive-when-scope-widens
description: When an operator widens scope mid-plan, re-run the blast-radius enumeration from scratch instead of adding a delta; an unchanged total is a result, not a shortcut
metadata:
  type: feedback
---

When a scope decision is amended mid-plan (new routes/files pulled into the gate), re-run the impact enumeration **from scratch against the new scope**. Do not patch the old number by adding "the new portion" on top of it. And when the recount lands on the same total, say so explicitly and show the per-item table — a reader cannot otherwise tell a genuine recount from a skipped one.

**Why:** t11 round 2. The operator extended D2 to cover three bot-invite routes after the audit; the 34-test blast radius had been derived under the narrower scope. Adding a delta would have carried forward anything the first enumeration missed, and the first enumeration had already been shown wrong in four other places by the same audit. The recount produced 34 again — identical value, different calculation — and the only thing separating "I recounted" from "I left it alone" was the 11-row per-callsite table.

**Also load-bearing:** separate the *method* per number. The denominator (current green suite) was executed; the numerator (what will break once the gate lands) could only be read, because the gate does not exist yet. Writing "verified by running the tests" over both would claim an observation never made. Record the method beside each figure and forbid the merged phrasing in the plan's anti-pattern list.

**Second-order:** a criterion that copies the figure into a second document (acceptance.md restating "34") goes stale the moment the figure is re-derived. Point the criterion at the owning table instead of duplicating the value — see [[sweep-the-measuring-sites]].

**How to apply:** any time a `D<N>` decision gains a v2, or the operator says "this is in scope now" after the plan artifacts exist. Re-derive, publish the per-item judgment table, state the delta explicitly (including zero), and name which figures were executed vs read.
