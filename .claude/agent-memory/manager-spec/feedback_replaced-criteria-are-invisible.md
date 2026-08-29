---
name: replaced-criteria-are-invisible
description: A sibling criterion that is REPLACED (not broken) never turns red, so execution evidence cannot count it; count invalidated separately from red
metadata:
  type: feedback
---

When a SPEC amends a sibling contract, count **invalidated** sibling criteria separately from criteria that **go red**. A criterion whose test body is replaced wholesale — old `it()` name and assertions deleted, new ones written in its place — never fails. If the old assertions remain true under the new implementation, no suite run on earth turns it red. Execution evidence is structurally blind to it.

**Why:** On card `t10` I enumerated sibling breakage by applying the contract change and running the suite: 3 failures, confirmed by execution. That number was correct and the audit verified it. But the real count of invalidated sibling criteria was **4**. The fourth (`AC-CHANAUTH-010`) had its 9-row decision table replaced by a 12-row one; the old 9 rows stayed correct under the new implementation, so it passed right up until it was deleted. Because I trusted the execution number, the `status: completed` sibling SPEC would have been left describing an `it()` name that no longer exists in the suite — exactly the "fix the body, miss the measuring site" class this project keeps reproducing. See [[feedback_sweep-the-measuring-sites]] and [[feedback_contract-amendment-sweeps-siblings]] for the adjacent failures.

**How to apply:** Whenever a SPEC says "replace" / "대체" about a sibling test, that criterion goes on the invalidated list even though it will never appear in a failure log. Two consequences follow, both mandatory:
- The owning sibling SPEC document must be amended in the same pass (table row, criterion body, HISTORY), and the plan must carry an explicit milestone step for that amendment — no transition can cover it, because there is no failure to record.
- The suite-integrity criterion must compare **test-name sets**, not counts: capture the pre-change name set, subtract the literally-declared replacement exceptions, and assert the remainder is a subset of the post-change set. A count threshold has slack and cannot see a name vanish; a name-set subset check has none. Keep the count as a floor only, and keep the exception list literal — growing it is the cheap way to cheat the check.
