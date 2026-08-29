---
name: naming-manufactures-justification
description: Naming a state "authenticated" led a SPEC to invent a false security proof; check the actual wire payload before claiming any frame proves identity
metadata:
  type: feedback
---

When a SPEC claims a protocol message proves something (identity, authorization, freshness), read the actual payload the producer sends and enumerate which fields could only be produced by a party holding the secret. If none can, the claim is false — retract it rather than soften it.

**Why:** In SPEC-CHANAUTH-001 v0.1.0 I named a socket state `authenticated` because it flipped on the `welcome` frame, then wrote a justification for why `welcome` could not be forged ("forging it requires the token"). The plan auditor checked `server/src/gateway.ts:100` and found the frame carries `{type, room_id, bot_id, bot_name, missed_after_id}` — zero evidence of token knowledge. The attacker sits at the receiving end of `hello`, so it can just answer. The name came first and the reasoning was back-filled to fit it. That single sentence made the card's whole success claim wrong: it closed only half of the Critical finding it was written for.

**How to apply:** Two habits. (1) Before writing a rationale for a security property, run the grep that shows the producing line and paste the literal payload into the SPEC. (2) Pick state names that describe the observation, not the conclusion — `established` for "a welcome arrived", never `authenticated`. Retraction belongs in the HISTORY row verbatim, so the withdrawn premise cannot be re-derived by a later reader. Related: [[spec-criteria-that-verify-nothing]], [[contract-amendment-sweeps-siblings]].
