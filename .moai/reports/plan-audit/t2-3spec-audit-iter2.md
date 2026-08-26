# Plan Audit — Card `t2`, 3-SPEC Chain — Iteration 2 (re-audit)

Auditor: plan-auditor (adversarial, independent)
Date: 2026-08-26
Worktree: `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t2` (branch `WT-auth-room-bot`, HEAD `b60f8be`)
Iteration: 2 / 3
Tier: M (all three) — PASS threshold `0.80` (`.claude/rules/moai/workflow/spec-workflow.md:330`; budgets 16/16 independent, `:152`)

**Reasoning context ignored per M1 Context Isolation.** No author reasoning, draft history, or conversation transcript was consulted. Inputs were iteration 1's report, the Tier M artifact set of each SPEC (`spec.md` + `plan.md` + `acceptance.md` + `progress.md`), the committed `server/src/*.ts`, `SPEC-CORE-001/spec.md`, and the read-only source documents in the primary checkout.

Scope per the retry-loop contract: the enumerated defect delta from iteration 1, plus a regression check over the correction round. Not a from-scratch re-read.

---

## Verdict summary

| SPEC | Blocking open | Major open | Minor open | Score | Verdict |
|------|---------------|-----------|-----------|-------|---------|
| SPEC-AUTH-001 | 0 | 1 | 2 | **0.90** | **PASS** |
| SPEC-ROOM-001 | 0 | 2 | 2 | **0.88** | **PASS** |
| SPEC-BOT-001 | 0 | 1 | 2 | **0.92** | **PASS** |
| **Overall** | **0** | **3 distinct** | — | **0.90** | **PASS** |

All six iteration-1 blocking findings are closed, and closed by doing what the finding said had to be done — not by relocating the defect. Every major and every minor is closed as well. Three new findings surfaced, all introduced by the correction round; none is blocking, and none makes a criterion unpassable when the artifacts are executed as written.

The correction round did the hard thing rather than the cheap thing in three places worth naming: `AC-BOT-003` was rewritten as a runtime assertion instead of a differently-worded grep; `AC-AUTH-005` was demoted to claim only what it observes rather than being left to overclaim; and the `403` question was answered by changing the contract on both routes instead of on the one the direction literally named.

### Evidence method

Findings are marked `[CMD]` (verified by running a command — command and output quoted) or `[READ]` (assessed by reading the artifacts). No claim below is asserted without one or the other.

---

## Part 1 — Closure table for every iteration-1 finding

Legend: **CLOSED** = the artifact now does what the finding said it must. **CLOSED-DIFFERENTLY** = the defect is gone but by a route other than the one prescribed (each is judged on its merits in Part 2). **NOT CLOSED** = the defect survives, or a differently-broken substitute took its place.

### SPEC-AUTH-001

| ID | Sev | Status | Evidence |
|----|-----|--------|----------|
| AUTH-B1 | blocking | **CLOSED-DIFFERENTLY** | `spec.md:101-102` REQ-AUTH-013 now reads "이 SPEC 이 등록하는 라우트 가운데 …" and names `GET /api/health` as `SPEC-CORE-001` 소관, explicitly not requiring its removal. The `/api/health` **observation** moved to AC-AUTH-014 (`acceptance.md:246-247`) rather than into AC-AUTH-011; `acceptance.md:199` states the boundary and points at AC-AUTH-014. Judged in Part 2, Deviation 1. `[READ]` |
| AUTH-B2 | blocking | **CLOSED** | `spec.md:79` REQ-AUTH-006 now reads "`username` 이 문자열이 아니거나 **빈 문자열이거나**, …" and the closing sentence states "빈 문자열은 타입 검사를 통과하므로 별도의 조건으로 거른다". AC-AUTH-002 case 1 (`acceptance.md:53`) is now satisfiable; `acceptance.md:69` names which clause catches which case. `[READ]` |
| AUTH-B3 | blocking | **CLOSED** | New AC-AUTH-014 (`acceptance.md:230-262`) imports `buildServer` from `../src/index.js`, calls it, and asserts `app.db`, `/api/health` `200`, register `201`, login `200` + `md_session`. AC-AUTH-005's Then clause was corrected (`acceptance.md:103`): "…`buildServer` 가 실제로 같은 배선을 하는지는 여기서 관측하지 않는다 — 그것은 AC-AUTH-014 가 맡는다." The AC-matrix row for AC-AUTH-005 now reads `REQ-AUTH-003(테스트 인스턴스 한정)` (`acceptance.md:23`). Coverage completeness assessed separately below. `[READ]` |
| AUTH-M1 | major | **CLOSED** | The contradicting edge-case row is gone. `acceptance.md:274` now reads "`400`. REQ-AUTH-006 의 타입 검사가 길이 검사보다 먼저 실행된다 \| AC-AUTH-002 의 뒤 세 케이스" — verbatim the prescribed replacement. A new row at `:275` covers the empty-string case. `[READ]` |
| AUTH-M2 | major | **CLOSED** | `/api/me` is now disclosed at the requirement layer (`spec.md:104`, a dedicated paragraph under REQ-AUTH-013: "테스트의 `build()` 헬퍼 안에서만 등록된다. `server/src` 의 어떤 파일에도 이 경로를 등록해서는 안 된다"), in the acceptance preamble (`acceptance.md:9`), and in the plan anti-pattern list (`plan.md:144`). `[READ]` |
| AUTH-M3 | major | **CLOSED** | AC-AUTH-012 now uses `git diff --stat "$(cat .moai/specs/SPEC-AUTH-001/.spec-base-sha)"` (`acceptance.md:208`), matching the sibling SPECs. The uniformity AUTH-M3 asked for is present. `[READ]` |
| AUTH-M4 | major | **CLOSED** | `acceptance.md:223` row 1 now reads "실패 원인이 `src/auth` 모듈 부재임이 출력에 나타난다"; `:226` explains why the literal `Cannot find module` string is not asserted. The literal is gone from the criterion itself. (A residual copy survives in `plan.md:118` — see R3.) `[READ]` |
| AUTH-m1 | minor | **CLOSED** | `acceptance.md:139-145` is five separate `grep -c` lines, one per symbol; `:147` states the reason ("어느 내보내기가 없는지가 명령 자체로 드러나게"). The `for` loop is gone. `[READ]` |
| AUTH-m2 | minor | **CLOSED** | REQ-AUTH-003 (`spec.md:68`) now carries the call rule: "`buildServer` 는 인증 라우트를 `registerAuthRoutes(app, app.db)` 로 등록해, 인자로 받는 연결과 `req.server.db` 가 같은 객체를 가리켜야 한다." `[READ]` |
| AUTH-m3 | minor | **CLOSED** | `plan.md:107` records the split module augmentation, its failure condition, and the mitigation. `[READ]` |

### SPEC-ROOM-001

| ID | Sev | Status | Evidence |
|----|-----|--------|----------|
| ROOM-B1 | blocking | **CLOSED-DIFFERENTLY** | `acceptance.md:192` is now `git diff --stat "$(cat .moai/specs/SPEC-ROOM-001/.spec-base-sha)" -- server/src/db.ts`, with the recording step at `plan.md:182` M1 단계 0 and the rationale at `acceptance.md:197`. Pinned to a recorded entry SHA rather than `git merge-base`; judged in Part 2, Deviation 2. The demonstrated vacuity is gone: `.spec-base-sha` will hold `b60f8be`-or-later, and `db.ts` was last touched at `a97d36c`, an ancestor — so a correct run yields empty output for the right reason, and an M1 schema commit is inside the diff range. `[CMD]` (see Deviation 2) |
| ROOM-M1 | major | **CLOSED** | New **REQ-ROOM-014** (`spec.md:109-110`, Ubiquitous) requires `buildServer` to register both modules after `registerAuthRoutes`, and names AC-ROOM-011 as its observer. New AC-ROOM-011 (`acceptance.md:214-248`) calls `buildServer()` directly. `[READ]` |
| ROOM-M2 | major | **CLOSED** | REQ-ROOM-006 (`spec.md:77-80`) now splits `404` (방 없음) from `409` (이미 보관됨) and states the shared rule. Joint fix with BOT-M4; judged in Part 2, Deviation 3. `[READ]` |
| ROOM-M3 | major | **CLOSED** | REQ-ROOM-003 (`spec.md:69`) now names all five keys explicitly; AC-ROOM-001 (`acceptance.md:42`) asserts `expect(Object.keys(create.json()).sort()).toEqual(['archived_at','created_at','id','name','status'])` — verbatim the prescribed assertion. `plan.md:122` §D-4 was rewritten and now says the old "원본 테스트가 `status` 만 보므로 깨지지 않는다" reliance "was exactly the condition under which this resolution could silently regress". `[READ]` |
| ROOM-m1 | minor | **CLOSED** | `related_specs:` is gone. `spec.md:15` is `depends_on: [SPEC-CORE-001, SPEC-AUTH-001]` — the canonical optional field (`spec-frontmatter-schema.md:145`), with the forward reference to SPEC-BOT-001 correctly dropped. `[CMD]`: `grep -nE "^(created_at\|updated_at\|labels\|spec_id\|related_specs):"` over all three `spec.md` → exit 1, no matches. |
| ROOM-m2 | minor | **CLOSED** | `acceptance.md:90` is `grep -c 'db\.transaction(' server/src/routes-rooms.ts` — dot escaped, single-quoted. `:95` explains that the escape "형식이 아니라 판정에 영향을 준다". `:97` splits what the grep proves from what it does not, deferring the behavioural half to AC-BOT-008. `[READ]` |
| ROOM-m3 | minor | **CLOSED** | The non-numeric `id` case is no longer documentation-only: `acceptance.md:116-117` adds `POST /api/rooms/abc/archive` → `404` inside AC-ROOM-004, and `:260` cites that criterion. `[READ]` |
| ROOM-m4 | minor | **CLOSED** | `plan.md:170` records the `declare module 'fastify'` placement risk and cross-references AUTH's identical §E row. `[READ]` |

### SPEC-BOT-001

| ID | Sev | Status | Evidence |
|----|-----|--------|----------|
| BOT-B1 | blocking | **CLOSED** | The unpassable grep is gone. AC-BOT-003 (`acceptance.md:67-80`) is now a runtime test: it issues an invite, lists invites, and asserts `Object.keys(list.json()[0]).sort()` equals `['bot_id','bot_name','online']` and `expect(list.body).not.toContain(body.token)`. `:84` records why the grep was wrong on both counts (unpassable, and measuring line formatting rather than exposure). Passability and fitness verified below. `[READ]` |
| BOT-B2 | blocking | **CLOSED-DIFFERENTLY** | AC-BOT-009 (`acceptance.md:199-203`) now runs three commands, both diffs pinned to `.spec-base-sha`, including `git diff --name-only "$(cat …)" -- server/src` expected to be exactly `server/src/routes-bots.ts` — verbatim the prescribed form. `:211` records the two-part reason the old checks observed nothing (committed-change blindness plus `--cached`-less staging blindness). DoD `:286` carries the same command and an explicit prohibition on `HEAD`-based comparison. `[READ]` |
| BOT-M1 | major | **CLOSED** | "자기가 만든" is struck. `spec.md:41` now reads "로그인한 사람이 활성 방에 등록된 봇을 초대해서", and `:43` adds a paragraph stating the limitation does not exist and giving the three reasons (no owner column, `POST /api/rooms` records no creator, `req.user` fixed at two fields). `[READ]` |
| BOT-M2 | major | **CLOSED** | `acceptance.md:9` now attributes `build()` to `SPEC-ROOM-001`/`rooms-bots.test.ts` and states that AUTH's same-named helper "는 `app` 하나만 돌려주는 **다른 헬퍼**" on which `const { app, cookie } = await build()` "성립하지 않는다". Mirrored at `plan.md:25`. The claim is correct against source `[CMD]`: `sed -n '390,401p' plan-v2.md` shows AUTH's helper returning a bare `app`; `sed -n '616,628p'` shows ROOM's returning `{ app, cookie }`. `[CMD]` |
| BOT-M3 | major | **CLOSED** | REQ-BOT-001 (`spec.md:81`) now carries the registrar constraint in the requirement layer: "세 초대 라우트는 … `registerBotRoutes(app)` **안에서** 등록되어야 한다. 새 등록 함수를 만들거나 `server/src/index.ts` 를 고쳐서는 안 된다", with the REQ-BOT-008 collision spelled out. `plan.md:76` notes this moved up from plan to spec in v0.2.0. `[READ]` |
| BOT-M4 | major | **CLOSED** | REQ-BOT-004 (`spec.md:89-100`) is a three-row table: 방 없음 `404`, 보관된 방 `409`, 봇 없음 `404` with a distinct body. Joint with ROOM-M2. `[READ]` |
| BOT-m1 | minor | **CLOSED** | The `\|\| echo 0` construct is gone with the grep it belonged to. `[CMD]`: no `echo 0` remains in `SPEC-BOT-001/acceptance.md`. |
| BOT-m2 | minor | **CLOSED** | The unobserved `grep -c "token_hash"` line is gone. `[READ]` |
| BOT-m3 | minor | **CLOSED** | REQ-BOT-003 (`spec.md:87`) now reads "**단일 요청 처리 기준으로** 처리 후 그 조합의 활성 토큰 수는 정확히 1이다" and folds the race acceptance into the requirement. The edge-case row (`acceptance.md:261`) now closes with "요구사항과 이 행은 서로 모순되지 않는다". `[READ]` |

**Closure tally: 19 / 19 findings closed** (6 blocking, 11 major, 3 minor as counted by iteration 1's own severity labels — 6 blocking + 11 major + 10 minor across the three tables above; every row reads CLOSED or CLOSED-DIFFERENTLY, none NOT CLOSED).

---

## Part 2 — The four deviations, judged individually

### Deviation 1 — `/api/health` placed in AC-AUTH-014 rather than added to AC-AUTH-011

**Judgment: SOUND. The claim is true and the boundary is now stated truthfully.**

The claim verified `[CMD]` — AUTH's `build()` helper registers exactly four things, and `/api/health` is not among them:

```
$ sed -n '394,401p' .moai/plan/2026-08-26-minidiscord/plan-v2.md
async function build() {
  const app = Fastify()
  await app.register(cookie)
  registerAuthRoutes(app, db)
  app.get('/api/me', { preHandler: [requireAuth] }, async req => ({ user: req.user }))
  return app
}
```

`/api/health` is registered in `buildServer` (`server/src/index.ts:5`), which `build()` never calls. Iteration 1 prescribed adding `['GET','/api/health']` to AC-AUTH-011's `open` array **"with an expectation of `200`"**; against this helper that request returns `404`, so the prescribed criterion would have been unpassable. Replacing one unpassable criterion with another is exactly the failure iteration 1 was punishing, so declining the literal instruction was correct.

Worth noting for precision: had the route merely been appended to the `open` array without the `200` expectation, it would have *passed* — the loop asserts `.not.toBe(401)` (`acceptance.md:186`) and `404 !== 401`. That is the worse outcome: a criterion that passes while observing nothing. The chosen route avoids both.

The boundary is now stated truthfully in three places and the statements agree: `spec.md:102` (REQ-AUTH-013 scopes its claim to this SPEC's own routes and disclaims deleting `/api/health`), `acceptance.md:199` (AC-AUTH-011 states `/api/health` is outside its set, names the reason — "`build()` 헬퍼는 그 경로를 등록하지 않으므로 여기서 확인할 수 없다" — and points at AC-AUTH-014), and `acceptance.md:246-247, 260` (AC-AUTH-014 asserts `200` on the real assembled server). No document claims an observation it does not make.

### Deviation 2 — `git diff` pinned to a recorded per-SPEC base SHA rather than `git merge-base`

**Judgment: SOUND on the stated reason, and the mechanism works — with one residual failure mode (finding R1 below).**

The claim verified `[CMD]`:

```
$ git merge-base HEAD main
edd982e375dffdfc2015a1f4b71130e5750745db
$ git log --oneline -- server/src/db.ts
a97d36c feat: sqlite schema for users/rooms/bots/tokens/messages
$ git diff --stat edd982e375dffdfc2015a1f4b71130e5750745db -- server/src/db.ts
 server/src/db.ts | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 1 file changed, 72 insertions(+)
```

A `merge-base` comparison reports the whole 72-line file as added and would fail permanently, in every run, regardless of whether the SPEC touched the schema — the mirror-image uselessness of the `HEAD` form. The rejection is correct.

The recorded-SHA mechanism itself works. `.spec-base-sha` is written at run-phase step 0 (`SPEC-AUTH-001/plan.md:116`, `SPEC-ROOM-001/plan.md:182`, `SPEC-BOT-001/plan.md:220`), mirrored into `progress.md` §E.1 (`spec_base_sha:` field present in all three, currently a placeholder `[CMD]`: `grep -n "spec_base_sha"` → `AUTH/progress.md:32`, `ROOM:33`, `BOT:32`), and read by the criteria. Because the recorded SHA is at or after `b60f8be` and `db.ts` last changed at `a97d36c` (an ancestor), a correct run yields empty output for the right reason, while an M1-committed schema change falls inside the diff range and is caught. Unlike `git diff HEAD`, `git diff <sha>` also reports staged content, closing BOT-B2's second half.

Failure modes examined:

| Failure mode | Behaviour | Verdict |
|---|---|---|
| `.spec-base-sha` missing (step 0 skipped) | `[CMD]` `git diff --stat "" -- server/src/db.ts` → `fatal: bad revision ''`, exit `128`, **stdout empty** | **Defect — see R1.** The criterion's observable is "출력이 비어 있다"; stdout is empty in both the pass case and this case |
| `.spec-base-sha` stale (left from a prior run) | Diff range widens → over-detection → false FAIL, never a false pass | Acceptable. Fails safe |
| `.spec-base-sha` untracked | `[CMD]` `git check-ignore` → not ignored; it lives under `.moai/specs/…`, outside the `-- server/src` pathspec, so it cannot pollute AC-BOT-009's `--name-only` output | Not a defect |
| A brand-new untracked file under `server/src` | `git diff --name-only` does not list untracked files, so AC-BOT-009 check 3 would miss it — but check 1 (`ls server/src`) catches it | Covered |

### Deviation 3 — the 404/409 split applied to ROOM's archive route as well as BOT's invite route

**Judgment: the symmetric rule is BETTER than fixing invite alone. Applied consistently across both SPECs. Recorded as a deliberate deviation in both plans' §D. Recommend ratification.**

Why better, concretely. Iteration 1's Gap 1 listed three defects. Fixing invite alone closes defects 1 and 2 (invite could not distinguish missing from archived; `403` has no referent) but leaves defect 3 open in a new shape: archive's `404` would mean "missing **or** archived" while invite's `404` would mean "missing" and `409` "archived". A UI mapping status codes to messages generically — which is exactly the failure mode Gap 1 named — would print "그런 방이 없습니다" on a re-archive of an existing room. The symmetric change is what actually retires the finding.

The cost is one additional deviation from source (`plan-v2.md:733`'s single `404` becomes `404`/`409`) and one renamed source test (`re-archiving returns 404`). Both are recorded. That is a small price for a contract that reduces to one sentence.

Consistency of application, checked route by route `[READ]`:

| Situation | ROOM | BOT | Same rule? |
|---|---|---|---|
| named room does not exist | `404` (`ROOM/spec.md:78`) | `404` (`BOT/spec.md:94`) | yes |
| room exists, `status='archived'` | `409` (`ROOM/spec.md:78`) | `409` (`BOT/spec.md:95`) | yes |
| named bot does not exist | n/a | `404`, distinct body (`BOT/spec.md:96`) | yes |
| non-numeric room id | `404` (`ROOM/acceptance.md:116`) | `404` via room lookup miss | yes |
| `403` used anywhere | no | no (`BOT/plan.md:70`: "`403` 은 이 시스템에서 쓰지 않는다") | yes |

The rule is stated identically in four places: `ROOM/spec.md:80`, `ROOM/plan.md:60-68`, `BOT/spec.md:100`, `BOT/plan.md:65-70`. Both plans carry a full §D record — `ROOM/plan.md:126-157` (§D 7) and `BOT/plan.md:164-196` (§D 5) — each with the source lines quoted, the three defects enumerated, a before/after table covering **all five** situations (both SPECs' tables cover both routes, not just their own), the lead's ruling, and an impact list naming the sibling's sections. Each cross-references the other by section number: `ROOM/plan.md:155` names "`SPEC-BOT-001` 의 REQ-BOT-004·AC-BOT-005·엣지 케이스 표·§C·§D 5번", and `BOT/plan.md:194` names ROOM's counterparts. Both §I sections link the pair (`BOT/plan.md:279`). Both §H anti-pattern lists forbid reverting (`ROOM/plan.md:225`, `BOT/plan.md:266`). The deviation is also carried into the implementation instructions, not left at the contract layer: `ROOM/plan.md:83-93` gives the in-transaction `missing`/`conflict`/`ok` branch, and `BOT/plan.md:223` gives the ordered failure branching.

Both `spec.md` HISTORY rows disclose the deviation with a pointer to the §D record (`ROOM/spec.md:25`, `BOT/spec.md:25`).

**If the lead reverses this and wants invite-only:** revert `ROOM/spec.md:77-80` REQ-ROOM-006 to a single `404` for both cases; delete the `409` assertion and the differing-body assertion from `ROOM/acceptance.md:110-111, 119` and the AC-matrix row at `:23`; revert the two `ROOM/acceptance.md:258-259` edge-case rows; delete `ROOM/plan.md` §D 7 and the `409` column of the §B table at `:62-68`; revert the §C branch pseudo-code at `:83-93` to `changes === 0 → 404`; drop the §H anti-pattern at `:225`; and rewrite `BOT/plan.md` §D 5's before/after table so its ROOM rows describe the unchanged source. Iteration 1's Gap 1 defect 3 then reopens and must be re-recorded as accepted debt.

### Deviation 4 — `depends_on` on all three, and the relaxed RED wording on all three

**Judgment: `depends_on` is in-scope hygiene, directly responsive to the finding. The RED relaxation is proportionate hygiene but was applied incompletely — see R4.**

`depends_on` — iteration 1's ROOM-m1 named two defects: `related_specs` is not a schema field, **and** "The other two SPECs omit the field entirely, so the three are inconsistent." Adding it to AUTH and BOT is the second half of the stated finding, not creep. The values are correct and directional `[READ]`: AUTH `[SPEC-CORE-001]`, ROOM `[SPEC-CORE-001, SPEC-AUTH-001]`, BOT `[SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]` — dependencies only, no dependents, matching the AUTH→ROOM→BOT order.

RED relaxation — AUTH-M4 was raised against AUTH only, but the identical brittleness (asserting a literal vitest error string) existed verbatim in ROOM and BOT. Fixing all three is proportionate. BOT's rows were already phrased by cause (`BOT/acceptance.md:221-224`, "`POST /api/rooms/:id/invites` 미등록으로 `404`") and gained the relaxation note at `:226`. ROOM gained the note at `:212` but its table row 1 still hardcodes the string — R4 below.

---

## Part 3 — Regressions and new findings

### R1 — major — the base-SHA criteria pass silently when step 0 was skipped

**Files:** `SPEC-AUTH-001/acceptance.md:208,213` · `SPEC-ROOM-001/acceptance.md:192,195` · `SPEC-BOT-001/acceptance.md:201-202,208-209` (and the three DoD copies: `AUTH:299`, `ROOM:287`, `BOT:285-286`)
**Class:** blocking-adjacent, classified **major** (see disposition)

Verified `[CMD]`:

```
$ git diff --stat "" -- server/src/db.ts
fatal: bad revision ''
exit=128
$ git diff --stat "" -- server/src/db.ts 2>/dev/null
STDOUT_ABOVE exit=128        # ← stdout was empty
```

When `.spec-base-sha` does not exist, `$(cat …)` expands to the empty string, git aborts, the diagnostic goes to **stderr**, and **stdout is empty**. Every one of these criteria states its observable as "출력이 비어 있다" / "비어 있음". Read literally, a run that never recorded the base SHA satisfies the criterion — which is the same shape of defect as ROOM-B1 and BOT-B2, relocated from "always vacuous" to "vacuous iff the recording step was skipped".

**Why major rather than blocking.** Executed as written, the criteria are correct: step 0 is the first step of M1 in all three plans, its rationale is restated four times per SPEC, the DoD carries a checkbox for it, and §G requires the *verbatim* command output to be recorded in `progress.md` §E.2 — a verbatim record reading `fatal: bad revision ''` is not "empty output". The false pass requires both skipping an explicitly ordered step and summarizing rather than recording the output. That is a deviation from the procedure, not a defect in it.

**Required fix** (one edit per SPEC, in `acceptance.md` and the matching DoD line): make the base SHA's existence part of the observable. Either bind the exit code —

> **Then** 둘째 명령이 **종료 코드 `0`** 으로 끝나고 출력이 비어 있다. `fatal: bad revision` 이 나오면 `.spec-base-sha` 가 없다는 뜻이고, 이 기준은 **실패**다.

— or guard the command:

```bash
BASE=$(cat .moai/specs/SPEC-<X>-001/.spec-base-sha) && git rev-parse --verify "$BASE^{commit}" >/dev/null && git diff --stat "$BASE" -- server/src/db.ts
```

### R2 — major — AC-ROOM-011 stops using its temp directory once SPEC-BOT-001 lands

**File:** `SPEC-ROOM-001/acceptance.md:225-226`
**Class:** blocking-adjacent, classified **major**

AC-ROOM-011 sets `process.env.MINIDISCORD_DATA_DIR = mkdtempSync(...)` and then `await import('../src/index.js')`, relying on `config.ts` reading the variable *after* the assignment. `config.ts` reads it at module-evaluation time `[CMD]`:

```
$ cat -n server/src/config.ts
     2  export const config = {
     3    port: Number(process.env.MINIDISCORD_PORT ?? 3000),
     4    dataDir: process.env.MINIDISCORD_DATA_DIR ?? './data',
     5    get dbPath() { return `${this.dataDir}/minidiscord.db` },
```

`dataDir` is a plain property, not a getter (`dbPath` and `uploadsDir` are getters, `dataDir` is not). So whichever import loads `config.js` first freezes the value for the whole test file.

`rooms-bots.test.ts` statically imports `../src/routes-bots.js` `[CMD]`:

```
$ sed -n '622,623p' .moai/plan/2026-08-26-minidiscord/plan-v2.md
import { registerRoomRoutes } from '../src/routes-rooms.js'
import { registerBotRoutes } from '../src/routes-bots.js'
```

and SPEC-BOT-001 requires `routes-bots.ts` to import `config.js` (`BOT/plan.md:138`, `import { config } from './config.js'`, needed for `inviteCommand(token, config.port)` per §D 2). Static imports evaluate before any test body runs. Therefore, **after SPEC-BOT-001 lands**, `config.dataDir` is already `'./data'` when AC-ROOM-011's assignment happens, `buildServer()` opens `./data/minidiscord.db` in the repository, and the temp directory is never used. AC-ROOM-011 passes at SPEC-ROOM-001's own completion time (`routes-bots.ts` does not yet import `config.js`) and silently changes behaviour later — the class of cross-SPEC incoherence this correction round existed to remove.

Consequences: `SPEC-ROOM-001/plan.md:230`'s own anti-pattern ("테스트에서 실제 `data/` 쓰기") is violated by one of that SPEC's own criteria; the repository accumulates an untracked `data/` directory that no DoD checks; and the criterion becomes environment-dependent — a pre-existing `data/minidiscord.db` carrying a different `alice` makes login return `401`, `login.headers['set-cookie']![0]` throw, and the test fail for a reason unrelated to what it verifies.

AC-AUTH-014 is safe today for a reason that is luck rather than design: `auth.test.ts` imports only `../src/db.js` and `../src/auth.js`, neither of which imports `config.js`, so the dynamic `import('../src/index.js')` is the first load. The moment `auth.ts` gains a `config` import, AC-AUTH-014 acquires the same defect.

**Required fix** (pick one, and apply the reasoning to both criteria):
1. *(preferred, removes the hazard permanently)* Make `dataDir` a getter in `server/src/config.ts` — `get dataDir() { return process.env.MINIDISCORD_DATA_DIR ?? './data' }` — and add a `SPEC-AUTH-001` requirement clause authorizing and requiring it. `config.ts` is inside `server/src`; only `db.ts`'s `SCHEMA` is frozen (REQ-AUTH-015), so no scope boundary blocks this.
2. *(test-local)* Insert `vi.resetModules()` immediately before the dynamic import in both AC-ROOM-011 (`ROOM/acceptance.md:226`) and AC-AUTH-014 (`AUTH/acceptance.md:240`), and state in each Then clause that the assertion depends on a fresh `config` module.

Either way, add a sentence to `ROOM/acceptance.md` §AC-ROOM-011 naming the dependency, so a future reader does not reintroduce it.

### R3 — minor — the literal RED message survives in two plan steps

**Files:** `SPEC-AUTH-001/plan.md:118` · `SPEC-ROOM-001/plan.md:184`

Both still read "`npm test -w server` → `Cannot find module '../src/auth.js'` 로 실패" (resp. `routes-rooms.js`), the exact string AUTH-M4 removed from the criterion. The plan step is not the pass/fail authority — `acceptance.md:226` / `:212` is — so this cannot fail a criterion, but it reads as an instruction to expect that string.

**Required fix:** rewrite both to "→ 모듈 부재로 실패. 출력 기록 (판정 기준은 AC-AUTH-013 / AC-ROOM-010 참조)".

### R4 — minor — AC-ROOM-010's table contradicts its own relaxation note

**File:** `SPEC-ROOM-001/acceptance.md:207` vs `:212`

Row 1 still reads "실패, 메시지에 `Cannot find module '../src/routes-rooms.js'` 포함" while the note four lines below says "RED 판정은 도구가 내는 특정 문구가 아니라 '그 모듈이 없어서 실패했다'는 원인이 출력에서 확인되는가로 한다." One criterion states two different pass conditions; row 3 and BOT's rows are already cause-phrased, and AUTH's equivalent row was rewritten (`AUTH/acceptance.md:223`), so ROOM row 1 is the only survivor.

**Required fix:** rewrite row 1's 관측 cell as "`rooms-bots.test.ts` 추가 후 실패하고, 실패 원인이 `src/routes-rooms` 모듈 부재임이 출력에 나타난다" — matching `AUTH/acceptance.md:223`.

### R5 — minor — AC-BOT-009's matrix row omits the requirement its third command verifies

**File:** `SPEC-BOT-001/acceptance.md:27` vs `:209`

The matrix row lists `REQ-BOT-008, REQ-BOT-009`, but the third command's Then clause (`:209`) explicitly cites REQ-BOT-001 ("초대 라우트는 `registerBotRoutes` 안에서 등록되므로 `index.ts` 를 고칠 이유가 없다 (REQ-BOT-001)"), and this is the only mechanical observation of REQ-BOT-001's registrar clause anywhere in the chain. The traceability matrix under-reports its own coverage.

**Required fix:** change the row to `REQ-BOT-001(등록 위치), REQ-BOT-008, REQ-BOT-009`.

### Regressions explicitly checked and NOT found

| Check | Result |
|---|---|
| Tier M budgets, counted independently `[CMD]` | `grep -c "^\*\*REQ-…"` → AUTH **15**, ROOM **14**, BOT **9**; `grep -c "^### AC-…"` → AUTH **14**, ROOM **11**, BOT **11**. All six ≤ 16. Matches the pre-audit measurement exactly |
| REQ ID continuity `[CMD]` | Enumerated all IDs: AUTH `001-015`, ROOM `001-014`, BOT `001-009` — sequential, no gaps, no duplicates, uniform 3-digit padding. New REQ-ROOM-014 appended at the end under a new `### 3.4 서버 조립` heading rather than inserted |
| REQ → AC coverage | Every requirement in all three still maps to ≥1 criterion; no orphan criteria. New REQ-ROOM-014 → AC-ROOM-011; REQ-AUTH-003 and REQ-AUTH-013 now each have two |
| Internal count references | `AUTH/spec.md:191` "AC-AUTH-001..014", `AUTH/plan.md:126,130,153`, `ROOM/plan.md:208,234-235`, `BOT/plan.md:246,272-273` — all consistent with the measured counts. Three HISTORY rows state the deltas correctly (13→14, 13→14 / 10→11, 9/11 unchanged) |
| Cross-references between the six §D records and criteria | All resolve: `ROOM/plan.md` §D 7 ↔ `BOT/plan.md` §D 5; `AUTH/acceptance.md:262` → AC-ROOM-011 (exists); `ROOM/acceptance.md:218` → AC-AUTH-014 (exists); `ROOM/acceptance.md:68,97` → AC-BOT-008 (exists); all three `plan.md` §I rows citing the iteration-1 report path (exists) |
| New unpassable criteria | None found. AC-BOT-003, AC-AUTH-014 and AC-ROOM-011 all analysed below and are passable |
| Cross-SPEC contract drift | Nothing SPEC-ROOM-001 or SPEC-BOT-001 claims to consume diverged from what SPEC-AUTH-001 declares. The new REQ-AUTH-003 sentence (`registerAuthRoutes(app, app.db)`) strengthens, not changes, the `app.db` contract ROOM/BOT depend on |
| Deferred `--token`/`--server` record `[CMD]` | Present and unresolved in **both** places, both pointing at card `t4`: `AUTH/plan.md:88,93,95` ("기록은 지우지 않고 남겨 **카드 t4 착수 시 다시 확인한다**") and `BOT/plan.md:145-156` (heading "### 3. [미해결 — 보존]", `:156` "카드 `t4` 에서 … 재확인 대상이다"), reinforced as an anti-pattern at `BOT/plan.md:264`. Neither closes it. **Correct; not a defect** |
| Frontmatter `[CMD]` | 12 canonical fields present in all three; no rejected snake_case alias anywhere (`grep -nE "^(created_at\|updated_at\|labels\|spec_id\|related_specs):"` → exit 1). `phase: "v0.1.0 target"` in all three — a release target, not one of the prohibited lifecycle values `plan`/`run`/`sync`/`mx` (`spec-frontmatter-schema.md:55`). `tier: M` and `depends_on` are both schema-listed optional fields (`:145,:148`) |
| `[NEEDS CLARIFICATION]` gate `[CMD]` | `grep -rn "NEEDS CLARIFICATION"` over all three directories → exit 1, no matches |
| D7 cross-SPEC reconciliation `[CMD]` | Referenced SPEC-CORE-001 exists; `grep -n "^status:"` → `completed`. Not in {retired, superseded, archived}. The three siblings reference each other and all exist. No BLOCKING |
| D8 cross-platform `[CMD]` | `grep -rn "syscall"` over all three directories → exit 1. Auto-PASS |
| Out of Scope `[CMD]` | `grep -c "^### Out of Scope"` → AUTH 9, ROOM 6, BOT 7 H3 sub-headings, each with specific `-` bullets and (ROOM/BOT) a named owning SPEC |

---

## Part 4 — Independent verification requested

### Do AC-AUTH-014 + AC-ROOM-011 actually close AUTH-B3?

**Yes.** Element by element against the `buildServer` assembly `AUTH/plan.md:120` prescribes:

| Assembly element | Observed by | How |
|---|---|---|
| `@fastify/cookie` registered | AC-AUTH-014 + **AC-ROOM-011** | AC-AUTH-014 asserts `Set-Cookie: md_session=` — suggestive but not conclusive, since a raw header write would also satisfy it. AC-ROOM-011 closes it: it sends the cookie back and requires `200`, and `requireAuth` reads `req.cookies`, which only the plugin populates. **Covered by the pair, not by either alone** |
| `app.db = openDb(config.dbPath)` | AC-AUTH-014 `:244` | `expect(app.db).toBeDefined()`, plus register `201` / login `200` proving the connection is real |
| `registerAuthRoutes(app, app.db)` — *same object* as `app.db` | **AC-ROOM-011** `:233-238` | Login writes the session row through the argument connection; `requireAuth` reads it through `req.server.db`. Two different connections ⇒ `401` ⇒ the `expect(rooms.statusCode).toBe(200)` assertion fails. This mechanically observes REQ-AUTH-003's new same-object sentence |
| `registerRoomRoutes(app)` registered | AC-ROOM-011 `:230-231,237-238` | Cookie-less `GET /api/rooms` → `401` (an unregistered route gives `404`), cookie-bearing → `200`. `:248` states this reasoning explicitly |
| `registerBotRoutes(app)` registered | AC-ROOM-011 `:239-240` | `GET /api/bots` → `200` |
| `requireAuth` guards routes on the *real* server | AC-ROOM-011 `:231` | The half AC-AUTH-014 explicitly declines to claim (`AUTH/acceptance.md:262`) and hands over |

The honesty of the handoff is the notable part: `AUTH/acceptance.md:262` names precisely what it does not observe and why ("이 SPEC 시점에는 `buildServer` 가 등록하는 보호 라우트가 하나도 없어 … 관측할 대상 자체가 없다"), and `ROOM/acceptance.md:218` picks up exactly that half by name. No unobserved-verification claim survives on this path.

**What remains unobserved by execution:**

1. **The three invite routes on a `buildServer` instance.** No BOT criterion calls `buildServer()`. Coverage is structural — AC-BOT-009 check 3 asserts `index.ts` is unmodified, so the invite routes must live inside the already-registered `registerBotRoutes`. Sound inference, not an observation. Low risk (a route registered inside an already-wired function cannot be missing from the assembled server), so no fix is required; recorded so no one later reads it as observed.
2. **`mkdirSync(config.dataDir)` / `mkdirSync(config.uploadsDir)`** (`AUTH/plan.md:120`). AC-AUTH-014's `mkdtempSync` directory already exists, so a missing `mkdirSync(dataDir)` would not fail; `uploadsDir` is never touched. No requirement covers either — they are plan steps with no requirement and no criterion. Harmless now (`uploadsDir` first matters for attachments, a later card); worth a REQ clause when that card lands.
3. **The `onClose` hook closing `app.db`** (`AUTH/plan.md:120`). Not required by any REQ, not asserted. A leaked handle would not fail any criterion.
4. **`app.db` identity beyond "defined".** `expect(app.db).toBeDefined()` alone would accept any truthy value; the register/login/list flow is what makes it load-bearing. Adequate as a pair.

### Can AC-BOT-003 pass, and does it test token non-exposure?

**Yes to both** `[READ]`.

Passability: the GET route returns rows mapped to `{ bot_id, bot_name, online }` (`BOT/plan.md:117-119`, §D 1's prescribed implementation), so `Object.keys(...).sort()` yields `['bot_id','bot_name','online']` — matching the expectation, correctly pre-sorted alphabetically. The test creates a room, a bot and an invite first, so `list.json()[0]` exists. `list.body` is the raw response string, and a 64-hex token that was never selected cannot appear in it. Nothing in the criterion depends on source formatting.

Fitness: the two assertions attack the claim from both directions — the key-set assertion proves no `token` or `token_hash` field is present, and the substring assertion proves the issued value does not leak through any other key or through a nested structure. Neither can be satisfied by inserting a newline, which was the fatal property of the grep it replaced. Paired with AC-BOT-011 (`:241`, `expect(row.token_hash).toBe(sha256Hex(body.token))` and `not.toBe(body.token)`), REQ-BOT-002 is covered on both halves: nothing plaintext is stored, and nothing is re-exposed.

One residual, minor and pre-existing: REQ-BOT-002's clause "어떤 라우트도 `token_hash` 를 반환해서는 안 된다" is observed on the list route only. The `POST` invite response's key set is asserted nowhere. Adding `expect(Object.keys(body).sort()).toEqual(['bot_id','bot_name','command','token'])` to AC-BOT-001 would close it. Optional.

---

## Part 5 — Category scores

| Dimension | AUTH | ROOM | BOT | Evidence |
|---|---|---|---|---|
| Clarity | 0.90 | 0.90 | 0.95 | Every iteration-1 ambiguity closed. AUTH deducted for R3; ROOM for R4's self-contradicting row. BOT's ownership prose and registrar clause are now unambiguous (`spec.md:43`, `:81`) |
| Completeness | 0.95 | 0.95 | 0.95 | All sections present, 12/12 frontmatter fields, substantive Out of Scope (9/6/7 H3 blocks), `buildServer` now present in the requirement layer of both SPECs that assemble it |
| Testability | 0.80 | 0.75 | 0.85 | R1 costs all three: the scope-boundary observable does not distinguish success from an absent mechanism. ROOM additionally carries R2 (non-hermetic after BOT lands) and R4. BOT's AC-BOT-003 went from unpassable to a genuine runtime assertion |
| Traceability | 0.95 | 0.95 | 0.90 | Full REQ→AC coverage, no orphans; the traced-but-unobserved halves that drove iteration 1's deduction are now either observed (AUTH-B3, ROOM-M3, BOT-B1) or explicitly declared unobserved with a named successor. BOT deducted for R5 |
| Consistency | 0.90 | 0.85 | 0.95 | The 404/409 rule is identical across both SPECs and recorded in both plans. AUTH deducted for R3; ROOM for R2 (a criterion that violates its own SPEC's anti-pattern) and R3/R4 |
| **Aggregate** | **0.90** | **0.88** | **0.92** | Threshold 0.80 |

**Overall: 0.90** (mean of the three).

Movement from iteration 1: AUTH 0.62 → 0.90, ROOM 0.74 → 0.88, BOT 0.66 → 0.92, overall 0.67 → 0.90. No score regressed, so the LEAN STOP-on-regression clause does not fire.

### Must-pass results

- **[PASS] MP-1 REQ number consistency** — `[CMD]` enumerated all IDs: AUTH `REQ-AUTH-001`…`015`, ROOM `001`…`014`, BOT `001`…`009`. Sequential, no gaps, no duplicates, uniform padding.
- **[PASS] MP-2 GEARS format compliance** — judged against the **requirement layer** (`REQ-XXX` in `spec.md`) only. All 38 requirements carry an explicit pattern label and match it: Ubiquitous (`AUTH-001/002/003/004`, `ROOM-001/008/014`, `BOT-005`), When/event-driven (the bulk), Where (`ROOM-007`, "`onArchive` 훅이 주어진 경우"), Unwanted/shall-not (`AUTH-013/014/015`, `ROOM-012/013`, `BOT-002/008/009`). New `REQ-ROOM-014` is correctly labelled Ubiquitous. No `If/Then` legacy form anywhere. The Given-When-Then entries in the three `acceptance.md` files are verification-layer `AC-XXX` and are graded under Group 4, not here.
- **[PASS] MP-3 YAML frontmatter validity** — `[CMD]` 12/12 canonical fields in each; no rejected alias; `phase` is a release target; `tier`/`depends_on` are schema-listed optional fields.
- **[N/A] MP-4 language neutrality** — single-language project (TypeScript/Node). Auto-passes.
- **[PASS] MP-5 D7 cross-SPEC reconciliation** — `[CMD]` SPEC-CORE-001 exists with `status: completed`; the three siblings all exist. No retired/superseded/archived reference. No BLOCKING.
- **[PASS] MP-6 D8 cross-platform discipline** — `[CMD]` no `syscall` occurrence. Auto-PASS.
- **[PASS] MP-7 clarification gate** — `[CMD]` no `[NEEDS CLARIFICATION` marker in any of the three directories.

---

## Verdicts

- **SPEC-AUTH-001 — PASS** (0.90). All three blocking findings closed. Open: R1 (major), R3 (minor), plus four `buildServer` sub-elements recorded as unobserved.
- **SPEC-ROOM-001 — PASS** (0.88). ROOM-B1 closed. Open: R1 and R2 (major), R3 and R4 (minor). Lowest of the three, and R2 is the one finding a reviewer should not wave through — it is a criterion that will quietly stop doing what it says once the next sibling lands.
- **SPEC-BOT-001 — PASS** (0.92). Both blocking findings closed, and AC-BOT-003 is the cleanest repair in the round. Open: R1 (major), R5 and the `POST` key-set gap (minor).
- **Overall — PASS** (0.90). Zero blocking findings across the three.

## Fix route, in priority order

1. **R1** — bind the base-SHA criteria to exit code 0 (or guard with `git rev-parse --verify`), in all three `acceptance.md` files and their three DoD copies. One mechanical change, six lines.
2. **R2** — make `config.dataDir` a getter (preferred) or add `vi.resetModules()` to AC-ROOM-011 and AC-AUTH-014; state the dependency in both criteria.
3. **R4** — rewrite `ROOM/acceptance.md:207` row 1 to match `AUTH/acceptance.md:223`.
4. **R3, R5** — two one-line documentation corrections.
5. Optional: assert the `POST` invite response key set in AC-BOT-001.

None of these is a gate on run-phase entry. Items 1 and 2 should land before `/moai run SPEC-ROOM-001`, since both bind criteria that SPEC executes.

## Lead decision pending

**Deviation 3 (symmetric 404/409) — recommend RATIFY.** It is better than the invite-only fix, applied consistently across both SPECs, and recorded as a deliberate deviation in both plans' §D with mutual cross-references. The reversal cost, if the lead disagrees, is enumerated in Part 2, Deviation 3.
