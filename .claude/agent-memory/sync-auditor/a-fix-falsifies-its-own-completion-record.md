---
name: a-fix-falsifies-its-own-completion-record
description: After a correction, sweep the completion record for statements about the state the correction just changed — the record is written before the last edits land and goes false silently
metadata:
  type: feedback
---

A correction commit's completion record (progress §E, a "what I wrote" table, a
frontmatter note) is usually authored **before** the final edits land. Statements
in it that describe the pre-correction state then become false, inside the same
commit, with nothing to contradict them.

**Why:** t35 2회차 found two, both self-inflicted by the fix under audit:
`progress.md:162` said `version: "0.5.0"` 는 그대로다 while the same commit bumped
the frontmatter to `0.6.0`; the §E.4 "쓴 문서" table said the CHANGELOG carried no
acceptance tally while the same commit added one. Neither is caught by a sweep of
the *changed* files — both live in a file the commit also changed, in sentences
about a *different* file.

**How to apply:** after making the corrections, list every value the correction
moved (a version string, a tally, a "did not do X" claim), then grep the
completion record for **each moved value and its negation**, not for the files
edited. Two shapes recur:
- "X is unchanged / X stays N" where the same commit changed X.
- "I deliberately did NOT do Y" where a later disposition in the same commit did Y.

Also check whether a "pending disposition" section still reads in present tense
after the disposition was executed further down the same file — it needs a
`[처분 전 기록]`-style time marker, the way a tally history table earns its
old row by carrying a 회차 column.

Related: [[insertion-invalidates-its-own-anchors]] (line anchors — different
mechanism, same reflex), [[superseded-value-may-be-the-pass]],
[[sweep-by-the-value-not-the-object]].
