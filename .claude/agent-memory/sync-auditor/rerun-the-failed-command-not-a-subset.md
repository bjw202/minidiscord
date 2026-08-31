---
name: rerun-the-failed-command-not-a-subset
description: A green re-run of the failing subset is not evidence that the failing command passes; t22's lane re-ran one test file after a full-suite failure and the flake resurfaced elsewhere
metadata:
  type: feedback
---

When a command fails, the recovery evidence must be **that same command, re-run whole**. A green run of the failing subset is not evidence.

**Why:** in card t22's sync pass, `.moai/state/verify/t22-sync/gate-test.txt` recorded a full `npm test` failure (`transport-auth.test.ts:716`, a 3000ms `waitFor` timeout). The evidence filed as the resolution, `gate-retest-1.txt`, shows `Test Files 1 passed (1) / Tests 30 passed (30)` — only the one failing file, re-run in isolation. The full command was never re-run to green. When the auditor ran `npm test` whole, it exited 1 again, this time on a *different* test with a different race. Isolating the file removed the very load condition that produced the failure, so the subset run could not have observed the defect it was filed against.

**How to apply:** on a failing gate, fix the cause, then re-run the exact failing invocation (not a narrowed one) and cite its output. If the failure is intermittent, re-run it several times and say how many. Related: this repo's `verification-claim-integrity` §2 — a claim is attributed to the command actually run, and a subset is a different command.
