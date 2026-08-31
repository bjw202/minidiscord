---
name: index-checks-existence-not-truth
description: An amendment index (a "what did I touch" table) plus a DoD that checks an annotation *exists* will pass a state where the annotation says the exact opposite of current scope; verify table claims against the target file's live text, both directions
metadata:
  type: feedback
---

When a SPEC keeps a table of "statements in sibling documents this SPEC falsifies", never treat the table as evidence that the sibling was actually edited, and never write a Definition-of-Done item that checks an annotation *exists*. Check that the annotation is *true*, in both directions:

- table → file: open each target and confirm the claimed post-state is readable there now
- file → table: `grep -rn "<SPEC-ID>" .moai/specs/` to enumerate every annotation this SPEC left, and judge each against the *current* scope; a site missing from the table means the table is incomplete

**Why:** t11 round 2 (SPEC-ROOMAUTHZ-001) FAILed on exactly this. An operator widened the scope (D2 v1 → v2), which turned two round-1 sibling annotations into the precise opposite of the truth ("the invite routes are NOT gated, a follow-on card is needed"). The §6 amendment table recorded that those sites had been reversed; `git status` on that sibling showed zero changes for the round. The DoD passed the state because an annotation was present. The auditor called it "the index tells a lie", and one further site (a stale gate count) fell out of the same re-sweep.

**How to apply:** any round where scope widens, re-sweep *every* annotation this SPEC previously wrote — not only the ones a finding names. Reverse an annotation by appending a second one, never by editing the first (decision history). And when writing a completion criterion over documentation edits, phrase it as a truth check with a named command, not a presence check. See [[contract-amendment-sweeps-siblings]], [[rederive-when-scope-widens]], [[sweep-the-measuring-sites]].
