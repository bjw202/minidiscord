---
name: forwardable-transcript
description: An exclusion claim against a relay is false unless the signed transcript contains a value the relay cannot forward; nonces and secrecy do not help
metadata:
  type: feedback
---

Before writing "we exclude the man-in-the-middle" in a threat table, check whether the signed transcript is **forwardable**. If every component of it is identical on both of the relay's connections, the relay wins by passing frames through unchanged — and the claim is false.

**Why:** SPEC-GWAUTH-002's first plan audit returned FAIL on exactly this. Two findings (F-01, F-02) looked separate but were one root cause. The design bound the transcript to two fresh nonces, the room, the bot, and the public key — all good against forgery, all useless here, because a relay does not forge and does not replay: it **forwards**. Freshness is a property of values the attacker must produce; the relay produces nothing. The channel's own signature, made over a transcript byte-identical to the one on the relay's upstream socket, registered the relay's socket as the bot.

The fix shape is always the same: put into the transcript a value the two endpoints derive independently from **their own transport connection** (RFC 5705 TLS exporter), and never transmit it — transmitting it restores substitutability and the defence evaporates.

**How to apply:** whenever a SPEC claims to exclude a relaying/proxying adversary, enumerate the transcript components and ask of each "is this the same on both of the relay's connections?" If the answer is yes for all of them, either add a channel-binding value or rewrite the claim as a disclosed residual. Also check the session-key KDF separately from the signature — binding only the signature leaves the frame layer resting on the handshake layer succeeding, which violates "no element substitutes for another".

Related: [[not-knowing-the-key-is-not-an-exclusion]], [[defence-claim-needs-threat-model]]
