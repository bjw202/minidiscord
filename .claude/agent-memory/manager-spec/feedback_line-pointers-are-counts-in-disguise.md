---
name: line-pointers-are-counts-in-disguise
description: A `file:line` pointer in a SPEC decays exactly like a hardcoded count; replace it with a content-matched grep anchor and prove each anchor resolves to exactly one line
metadata:
  type: feedback
---

A `file:line` citation inside a SPEC is a count in disguise: any insertion above it silently
invalidates it, and nothing turns red. Write the pointer as a **content-matched grep anchor**
instead — and prove each anchor resolves to **exactly 1** line by running it.

**Why:** on card t34 (SPEC-PERMROUTE-001) a sync repair inserted 22 amendment comment lines
into sibling documents. The same edit established a new [HARD] rule saying "a scope pointer
decays exactly like a count" — while making 50 of its own **point** pointers stale. Two of them
landed on a *different* item's amendment comment, so a reader following the pointer saw an
amendment and concluded "landed" for the wrong item: a false confirmation, worse than a dead
pointer. The rows that survived every insertion were precisely the ones already carrying grep
anchors. A full enumeration then showed the decay was older and larger than the audit reported —
79 pointers, 52 stale, and the audit had attributed all of them to the last edit without
checking their content at the baseline commit.

**How to apply:**
- Whenever a SPEC cites a place in another file, write `grep -nF '<stable text>' <path>`, not `:N`.
- Draw the pattern from **stable content** — a requirement id, a test name, a contract sentence.
  Never from an amendment comment: the comment restates the stem it amends, so an anchor drawn
  from it hangs on the very edit that caused the decay, and it also makes the naive pattern
  match twice.
- **Run every anchor and confirm the count is 1.** 0 or ≥2 is not an anchor. Land the per-anchor
  output as evidence and cite that path from the section, so a later reader re-runs rather than
  re-derives.
- Prefer `grep -F` (fixed string): patterns carry `( ) | *`, and some environments alias grep to
  ugrep where `-E` reads those as regex and errors out. Keep `|` out of patterns entirely when the
  anchor lives inside a markdown table cell.
- When the pointer's disposition is "remove", a 0-hit anchor is the *correct* outcome — say so in
  the row, or the next auditor reads the landing as a defect.

Related: [[sample-match-does-not-size-the-list]] (a sample never sizes the list — enumerate),
[[index-checks-existence-not-truth]] (a table's claim is verified against the target's live text).
