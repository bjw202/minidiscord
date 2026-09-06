---
name: bare-filename-inherits-a-neighbors-directory
description: A path cited as a bare filename in a list reads as sharing its neighbors' directory; resolve every cited path before it becomes a criterion
metadata:
  type: feedback
---

A path cited without its directory inherits, in the reader's eye, the directory of the entries listed beside it. Resolve every cited path against the filesystem before writing it into a SPEC or an acceptance criterion.

**Why:** In t40, three `[HARD]` caution sites were listed together. Two were `SPEC-PERMROUTE-001/spec.md` and `.../progress.md`; the third was written as `evidence/round4-section6-web-scope.txt` in both the lead's brief and the plan-phase report. It read as `SPEC-PERMROUTE-001/evidence/…` — a directory that does not exist (that SPEC has four files and no `evidence/`). The file actually lives under `.moai/reports/t34/evidence/`. The `grep` in AC-007 failed on a `No such file or directory`, which is the only reason it was caught.

The cost was not just a broken command. The argument built on that list was "all three sit on the path a reader must cross to reach the commands" — true of the two inside the SPEC, false of the third, which sits in a different card's report. A wrong path quietly inflated the strength of a closure argument from two to three.

**How to apply:** When a source hands you a list of citation sites, run each one — `ls` or `grep -c` — before it becomes a criterion or a premise. Then check whether the corrected location changes the claim the list was supporting, not only whether the command now resolves. Related: [[line-pointers-are-counts-in-disguise]], [[index-checks-existence-not-truth]].
