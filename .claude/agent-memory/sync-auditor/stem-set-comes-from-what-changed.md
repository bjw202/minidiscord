---
name: stem-set-comes-from-what-changed
description: Derive a staleness-sweep stem set from what the change altered, not from what was already corrected; t22 lost two doc sites and one test site because the set covered storage form but not frame form
metadata:
  type: feedback
---

A staleness sweep's stem set must be derived from **what the change altered**, not from **what a prior round happened to correct**.

**Why:** card t22 (SPEC-GWAUTH-002) changed three things — bot-token storage form, the handshake frame shape, and the moment of session establishment. The sync lane's shared stem set (`token_hash|sha256|해시만|해시로 저장|평문 토큰|하위 호환|후속 카드|proof|nonce`) covered only the storage axis, because that is what the previous audit's named finding was about. Reproducing that exact set gave 18 hits in `CHANGELOG.md` and **0 hits** on `:227` and `:313`, both of which describe `hello { token }` in the present tense — a protocol the change had deleted. The same blind spot cost a third site in code: the test helper `connected()` still waited on `hello` arrival as a proxy for establishment, a v1 equivalence the four-frame v2 handshake broke, which made `npm test` exit 1 under load.

**How to apply:** before sweeping, enumerate the axes the change touched and put at least one stem per axis in the set. Then classify every hit into three buckets — describes the new behavior / covered by a supersession disclosure / unhandled — and keep that table as evidence. Extend the same set into test code, not just docs and SPECs: a harness predicate is a claim about the protocol and goes stale exactly like a sentence does.

Sibling lessons: [[sweep-by-the-value-not-the-object]], [[sweep-by-stem-not-by-phrase]]. This is the third instance of the family; the distinguishing move here is deriving the set from the change's blast radius rather than from the finding's wording.
