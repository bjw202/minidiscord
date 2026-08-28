---
name: contract-amendment-sweeps-siblings
description: Amending one REQ/AC pair is never the whole edit — grep the merged test suite for every criterion that assumes the old contract before calling the amendment done
metadata:
  type: feedback
---

When a SPEC amendment changes a behavioral contract, the edit is not finished until the merged test suite has been swept for every sibling criterion that encodes the old behavior — in the amended SPEC *and* in every other SPEC whose tests exercise the same code path.

**Why:** SPEC-CHANAUTH-001 v0.1.0 amended REQ/AC-CHANPERM-008 only. Under the new emitted-id contract, four more criteria in the same file (AC-CHANPERM-005/006/007/009) broke, and seven in a SPEC that was never mentioned at all (SPEC-CHANCLIENT-001, whose harness never sends `welcome`) — 12 tests would have gone red on a correct implementation, while the card's own quality gate demanded all of them pass. The document contradicted itself. One of the four was not fixable by wording: AC-CHANPERM-007 measured id-invariance using *different* values in each direction, which the new lookup makes impossible — it needed a redesign, not an edit.

**How to apply:** After drafting any contract amendment, run two sweeps before writing the report: grep `.moai/specs/` for the old contract's phrasing, and read every test file that touches the changed function, mapping `it(` blocks to AC numbers from their comments (line→AC maps in audit reports drift — verify against the file). Enumerate both the criteria that break and the ones that do not, so the run phase is not over-diagnosed. Sequence the sibling fixes into separate milestones — a dozen simultaneous red tests destroys the evidence of which amendment closed which failure. Related: [[correction-may-not-cover-whole-card]], [[naming-manufactures-justification]].
