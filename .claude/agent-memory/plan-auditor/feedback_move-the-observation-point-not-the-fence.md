---
name: move-the-observation-point-not-the-fence
description: When a criterion breaks repeatedly because a hand-written list of paths is always missing one, the fix is to move the observation point to an act the subject alone can perform — not to extend the list again
metadata:
  type: feedback
---

SPEC-LIVEVERIFY-001 (card t32) failed four consecutive plan audits on one criterion: proving that the photographed Claude Code session produced the room's answer. Each round patched the *surface* being observed (the terminal), enumerated the inbound paths that could contaminate it, and each round a fifth path appeared. Round 5 passed because round 4's repair stopped extending the list and moved the observation point from the terminal surface to the session's outbound **act** — the `reply` tool call's arguments, a place nothing outside the session can write.

**Why:** a surface mixes what arrived with what was made, and a verdict anchored to "the list of arrival paths is complete" is only as strong as the list. An act the subject alone can perform makes the verdict independent of how many paths exist. The auditor's own check flipped accordingly: instead of hunting for a sixth missing path, verify from source that the two categories (call arguments vs. results/notifications) are genuinely disjoint in that codebase.

**How to apply:** when the same criterion breaks 2+ rounds with "the enumeration missed one", stop grading the enumeration. Ask what act only the subject can perform, and whether the codebase makes that act structurally distinguishable from anything inbound. If it does, the enumeration becomes explanation rather than defence — and say so in the criterion, so the next round's verdict is not re-hung on list completeness.

Related hazard seen in the same SPEC: a correction that moves the observation point must sweep its own document by **stem**, not by the places it remembers editing. Five rounds running, one summary sentence restating the superseded predicate survived in a section nobody thought to re-read. See [[correction-leaves-its-own-record-stale]].
