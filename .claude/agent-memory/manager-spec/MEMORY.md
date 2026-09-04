# Memory Index

- [The verification layer inverts the verdict](feedback_verification-layer-inverts-the-verdict.md) — a helper that drops a term makes the correct implementation fail and the defective one pass; close it with a mutation, not a helper edit

- [Naming manufactures justification](feedback_naming-manufactures-justification.md) — calling a state "authenticated" led me to invent a false proof; read the wire payload first
- [Contract amendments sweep siblings](feedback_contract-amendment-sweeps-siblings.md) — one amended REQ/AC is never the whole edit; 12 tests broke across two unmentioned SPECs
- [Sweep the measuring sites](feedback_sweep-the-measuring-sites.md) — fixing the passage is not the fix; two consecutive FAILs came from untouched criteria, transitions, and milestone assignments
- [Replaced criteria are invisible](feedback_replaced-criteria-are-invisible.md) — a sibling criterion that is replaced never turns red; count invalidated separately from red, and check name sets not counts
- [Harness route copies mask gates](feedback_harness-route-copies-mask-gates.md) — a test file registering its own copy of a route stays green with the new gate deleted; require shared registration
- [Closing pass takes all findings](feedback_closing-pass-takes-all-findings.md) — on a final-round audit close, optional findings are mandatory too; one pass, one commit, no deferrals
- [An index checks existence, not truth](feedback_index-checks-existence-not-truth.md) — the amendment table said a sibling was reversed while git showed zero changes; verify table claims against the target's live text, both directions
- [A line-pinned check breaks itself](feedback_line-pinned-check-breaks-itself.md) — `sed -n '75p'` was falsified by the HISTORY row the same pass had to add; report the literal AND the anchored reading
- [Re-derive when scope widens](feedback_rederive-when-scope-widens.md) — an amended scope decision voids the old enumeration; recount from scratch and say when the total is unchanged
- [A forwardable transcript excludes no relay](feedback_forwardable-transcript.md) — nonces stop forgery and replay, not forwarding; bind the transport into the transcript AND the KDF, or disclose the residual
- [A line pointer is a count in disguise](feedback_line-pointers-are-counts-in-disguise.md) — `file:line` citations decay silently and can even confirm the wrong item; use content-matched grep anchors and prove each hits exactly 1
- [A criterion never checks its own domain](feedback_criterion-never-checks-its-own-domain.md) — synthetic inputs proved the mapping while two of three could never occur; pair every mapping check with per-branch reachability evidence
- [Mechanism reproduced is not what happened](feedback_mechanism-reproduced-is-not-what-happened.md) — a probe that recreates the signature raises a branch to "possible", never to "the answer"; keep untested branches marked untested, not disproven
