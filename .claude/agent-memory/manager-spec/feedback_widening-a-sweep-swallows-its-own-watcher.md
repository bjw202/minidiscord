---
name: widening-a-sweep-swallows-its-own-watcher
description: Widening a sweep's file list from prose to a command pulled the SPEC documents into scope, turning the criterion red on a clean tree; fix by class exclusion, never by self-exemption
metadata:
  type: feedback
---

When a sweep-based criterion's target list is widened (prose list → command output, "added files" → "added or modified"), re-run it on a clean tree **before** committing. A widened list tends to swallow the documents that declare the sweep, because those documents must quote the watched stems verbatim.

**Why:** SPEC-WSUPGRADE-001 round 2. The round-1 repair widened AC-007's list from "added files" to `git diff --name-only <base>`, which pulled `acceptance.md` into scope; sweeping it for the declared stems (`spawn`, `exec`, …) hit the stem list itself and the mutation description — 2 hits on an unmutated tree, so the criterion was already failing. The same round, the sibling AC-008 had explicitly dodged this trap by removing the quoted phrase from its own prose. Knowing the trap in one criterion did not transfer to its sibling.

**How to apply:** fix by **class exclusion with a stated reason** ("markdown is not executed"), never by self-exemption ("this document is exempt") — an exemption clause grows until it swallows the watched space, a failure this repo already recorded. Prefer excluding the narrow non-executing class over an allowlist of extensions: an allowlist silently drops a future harness written in an unlisted language. Then prove both directions with commands: 0 hits clean, ≥1 hit with the declared mutation. Related: [[feedback_verification-layer-inverts-the-verdict]], [[feedback_sweep-the-measuring-sites]].
