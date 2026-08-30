---
name: line-pinned-check-breaks-itself
description: A prescribed verification command pinned to a line number (sed -n '75p') is falsified by the very edit it verifies, because the same pass must also add a HISTORY row above it
metadata:
  type: feedback
---

A verification command that addresses a line by number — `sed -n '75p' spec.md` — is invalidated by the edit it is meant to check, whenever that same pass is also required to prepend anything (a HISTORY row, a frontmatter line, a new paragraph above the site). Report the check output verbatim AND the anchor-resolved equivalent, and say which line the content actually moved to. Never satisfy a line-pinned check by declining the prepend or by deleting a line above it to keep the number stable.

**Why:** on SPEC-GWAUTH-002 t22 the 4th audit wrote `sed -n '75p' spec.md` must contain «봉투». The mandated HISTORY row pushed that line to 76, so the literal command returned the ⑤ line and read as a FAIL while the prescription was fully executed. The check was written against the pre-fix tree; it could not survive its own remedy. Two further drifts confirmed the shape in the same card: the prescription's `acceptance.md:368` and `plan.md:120` were already at 368 and **121** before I touched anything.

**How to apply:** locate every prescribed site by searching its text, never by arithmetic on the audit's numbers. When reporting, give both readings — the literal command as written, and the anchored `grep -n '<anchor>'` that shows where it went — and state the shift and its cause. A check whose only failure is a line offset is a passing check with a stale address; a check that fails on content is a real failure. Do not conflate them, and do not quietly substitute the anchored form for the literal one.

Related: [[sweep-the-measuring-sites]], [[an-index-checks-existence-not-truth]].
