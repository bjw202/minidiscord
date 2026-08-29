---
name: harness-route-copies-mask-gates
description: A test harness registering its own copy of a production route makes any new gate on that route untestable — require a shared registration function in the requirement itself
type: feedback
---

When a SPEC adds a guard (auth, membership, rate limit) to a route, first check how the test harnesses obtain that route. A harness that re-declares the route inline instead of calling the production registration function will stay green even if the guard is deleted entirely — the criterion measures a copy, not the shipped code.

Make the shared registration function part of the requirement, not a plan note. Then count the second-order blast radius separately: extracting the function deletes the harness copy, so every test that used the copy now hits the guard too.

**Why:** In SPEC-ROOMAUTHZ-001 (card t11), `server/test/sse.test.ts:30` and `permissions.test.ts:51` each registered their own `GET /api/rooms/:id/events`. Gating the real route in `index.ts` would have left both files passing with the gate removed. Requiring `registerEventRoute(app)` fixed it — and moved the breakage count from 26 to 34, because 8 tests opening streams on a nonexistent room id had been shielded by the copies.

**How to apply:** During plan-phase, grep the test tree for the route path being gated. If it appears as an `app.get(` / `app.post(` literal outside `server/src/`, the harness has a copy. Write the shared-registration requirement, then split the breaking-test enumeration into "gate direct" and "second-order (copy removal)" columns so the run phase is not surprised by the larger number. Related: [[sweep-the-measuring-sites]], [[contract-amendment-sweeps-siblings]].
