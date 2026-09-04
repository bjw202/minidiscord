# Completed SPEC Semantics

> Loading scope: `paths:`-scoped to `.moai/specs/**` — loads when SPEC artifacts are read or edited; excluded from the always-loaded surface (rule-authoring.md duty (d)). Origin: card t37 SPEC triage, operator-confirmed 2026-09-04. Evidence: `.moai/reports/t37/integration.md`.

A `completed` SPEC is a record of the decision made at its completion time. It carries NO standing obligation to be amended when later work changes the behavior it described:

- **The current-state source of truth is the CODE**, not the completed SPEC body. Read a completed SPEC to learn why the code is the way it is — never as a description of the present.
- **A replacement is recorded as ONE HISTORY line in the new SPEC.** When a later SPEC supersedes or narrows a completed SPEC's behavior, the new SPEC states it once (e.g. "supersedes SPEC-X — REQ-Y revokes REQ-Z"). Sibling amendments — editing the completed SPEC's body, or retroactively rewriting its acceptance criteria — are PROHIBITED.
- **Line-anchor tables are PROHIBITED.** Do not build tables mapping old-SPEC line numbers to their successors: they go stale at the next edit and have repeatedly produced false drift findings. Locate citations by grep anchor, not by line arithmetic.
