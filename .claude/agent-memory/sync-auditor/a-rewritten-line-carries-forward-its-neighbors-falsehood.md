---
name: a-rewritten-line-carries-forward-its-neighbors-falsehood
description: SPEC-BOTMODEL-001 sync — the sync commit re-authored ROADMAP.md:53 for the v2 token model and re-emitted a clause about room-membership authorization that C1 had already deleted; check every re-authored line against the current tree, not only the words the SPEC changed
metadata:
  type: feedback
---

When a sync commit rewrites a whole paragraph, audit the whole paragraph against the current code — not only the phrases the SPEC's own change touched. A re-authored line inherits every falsehood its author chose to keep, and the author is the one who now owns it.

**Why:** SPEC-BOTMODEL-001 (2026-09-07) rewrote the ROADMAP M2 «지금» paragraph to describe bot registration / `room_bots`, and kept the trailing clause "카드 t11 에서 뒤집혀 방마다 구성원 명단이 생겼고, 구성원이 아니면 그 방을 읽지도 쓰지도 승인하지도 못한다" — which C1 (`2f6cd3f`) had removed (`routes-rooms.ts:11` says "방 구성원 인가 삭제"; `db.ts` has no `room_members`). The SPEC-changed words were all correct; the carried clause was the false one. `progress.md left_for_C2` listed other ROADMAP spots but not this clause, because the author swept by "what this SPEC changed", not by "what this line now claims".

**How to apply:** for every `+` line a docs commit produced, ask "is each claim in this line true in the tree at HEAD?" — one grep per named mechanism (`grep -rn <mechanism> server/src`). Distinguish in the report: the falsehood's *origin* (a sibling stage) from its *re-author* (this commit). Score it as this commit's Consistency finding, non-blocking, and name the sibling stage that removed the mechanism.

Related: [[quoted-canon-labeled-correct-escapes-sweeps]], [[correction-leaves-its-own-record-stale]], [[a-finding-must-be-swept-against-the-criteria]].
