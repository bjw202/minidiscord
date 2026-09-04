---
name: reverse-sweep-answers-a-different-question
description: A bidirectional cross-check whose reverse half is answered with "everything I edited was in the table" measures over-editing, not under-detection — the two are not the same question
metadata:
  type: feedback
---

When a SPEC carries a bidirectional cross-check ("(ㄱ) every table row landed, (ㄴ) of the places
that became false, zero are absent from the table"), the (ㄴ) half is routinely satisfied with a
sentence of this shape:

> "Every place this pass edited is a place the table already lists — zero edits outside the table."

That is a different question. (ㄴ) asks about **under-detection** (what became false and was never
found). The sentence answers **over-editing** (what was touched that should not have been). A pass
that never looked outside the table scores a perfect zero on the second question while telling you
nothing about the first — indeed the cheapest way to edit nothing outside the table is to never
look there.

**Why:** t34 / SPEC-PERMROUTE-001. `progress.md:645` recorded `(ㄴ) 뒤집힌 자리 중 표에 없는 것:
이 회차가 편집한 SPEC 자리는 전부 표 1~12행의 자리다 — 표 밖 편집 0건` and `§E.3` carried it as an
observation. The same section's Gaps admitted the exhaustive reverse classification had not been
done. Running it found 23 places that became false and were absent from the table — including three
that falsified a lead disposition's own premise ("GWAUTH-002 열거 7자리", when at least ten exist).

**How to apply:** when auditing any bidirectional or exhaustive-coverage criterion, read the
reported sentence for its *subject* before its number. If the subject is the actor's own edits,
outputs, or touched files, the reverse direction is unmeasured no matter what number follows.
The reverse direction is only measured by enumerating the full candidate set independently and
classifying every member — which is why it is expensive and why it gets silently substituted.

A second, cheaper tell: the same document says elsewhere that the work was deferred. Two statements
that cannot both be true is faster to spot than the missing sweep. See
[[sample-match-does-not-size-the-list]].
