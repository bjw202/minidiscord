# Plan Audit — Card `t2`, 3-SPEC Chain — Iteration 3 (final)

Auditor: plan-auditor (adversarial, independent)
Date: 2026-08-26
Worktree: `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t2` (branch `WT-auth-room-bot`, HEAD `b60f8be`, spec artifacts uncommitted)
Iteration: **3 / 3 — final Retry Loop iteration**
Tier: M (all three) — PASS threshold `0.80`, budgets 16 REQ / 16 AC independent

**Reasoning context ignored per M1 Context Isolation.** No author reasoning, draft history, or conversation transcript was consulted. Inputs: iteration 2's report, the Tier M artifact set of each SPEC (`spec.md` + `plan.md` + `acceptance.md` + `progress.md`), and the committed + working-tree `server/` source.

Scope per the lead's instruction: the R1 / R2 / R4 closure delta, regressions introduced by this round, a verification-claim-integrity sweep, and a disposition statement on the deliberately-carried-over R3 / R5. Not a from-scratch re-read.

### Evidence method

`[CMD]` = verified by running a command in this worktree; the command and its output are quoted. `[READ]` = assessed by reading the artifacts. No claim below is asserted without one or the other.

---

## Verdict summary

| SPEC | Blocking open | Major open | Minor open | Score | Verdict |
|------|---------------|-----------|-----------|-------|---------|
| SPEC-AUTH-001 | **2** | 0 | 2 | 0.87 | **FAIL** |
| SPEC-ROOM-001 | **2** | 0 | 3 | 0.88 | **FAIL** |
| SPEC-BOT-001 | **2** | 0 | 2 | 0.90 | **FAIL** |
| **Overall** | **2 distinct** | **0** | — | **0.88** | **FAIL** |

**All three scores clear the 0.80 threshold. All three FAIL on blocking findings, not on score.**

The scoped correction round did what it was asked to do. **R1, R2 and R4 are all genuinely closed** — closed by changing the mechanism, not by rewording the claim — and the R2 fix was verified by running the code, not merely by reading the record. The command-form deviation the author reported is **true**, and I reproduced both halves of it in this worktree. No regression was introduced by this round.

The FAIL comes from the verification-claim-integrity sweep the lead asked for. It surfaced **two blocking defects of exactly the class this chain keeps regenerating** — criteria that appear to verify something while observing nothing. Both are pre-existing (present in iterations 1 and 2, missed by both audits), both affect all three SPECs, and both sit on the run-phase critical path. They are not regressions and they are not the correction author's doing; they are what a sweep aimed at this defect class was always going to find.

---

## Part 1 — R1 closure

**Verdict: CLOSED. The observable is now genuinely bound to exit codes.**

### What changed `[READ]`

The scope-boundary criteria in all three SPECs were rewritten from a single `git diff --stat "$(cat …)"` whose only observable was "output is empty" into a **command sequence whose observable includes exit code 0 on the precheck**:

- `AUTH/acceptance.md:207-223` (AC-AUTH-012), DoD `:311-312`
- `ROOM/acceptance.md:191-203` (AC-ROOM-009), DoD `:297-298`
- `BOT/acceptance.md:190-198` (AC-BOT-009), DoD `:152-154`

Each now reads (AUTH form, the other two identical in structure):

```bash
ls server/src
git rev-parse --verify "$(cat .moai/specs/SPEC-AUTH-001/.spec-base-sha)^{commit}"
git diff --stat <둘째 명령이 출력한 40자리 SHA> -- server/src/db.ts
```

with the Then clause requiring, verbatim (`AUTH/acceptance.md:222-223`):

> 2. 둘째 명령이 **종료 코드 `0`** 으로 끝나고 40자리 SHA 한 줄을 출력한다. … **이 기준은 실패**다. 셋째 명령으로 넘어가지 않는다.
> 3. 셋째 명령이 **종료 코드 `0`** 으로 끝나고 **출력이 비어 있다** … 두 조건이 함께 성립해야 통과이며, 빈 출력 하나만으로는 통과가 아니다.

The DoD copies carry the same binding and the explicit warning "**빈 출력만으로 통과 처리하지 않는다** — 기준 SHA 가 없을 때도 표준 출력은 비어 있다". Both plans' §H gained a matching anti-pattern (`ROOM/plan.md:258`, `BOT/plan.md:269`), and the plan step that runs the check was rewritten to the same form (`AUTH/plan.md:125`).

### The failure path is now caught `[CMD]`

The precheck runs, and it fails loudly when `.spec-base-sha` is absent:

```
$ git rev-parse --verify "$(cat .moai/specs/SPEC-AUTH-001/.spec-base-sha)^{commit}"
cat: .moai/specs/SPEC-AUTH-001/.spec-base-sha: No such file or directory
fatal: Needed a single revision
exit=128
```

Exit 128 ≠ 0, so observation 2 fails and the criterion fails. The R1 false-pass path is closed. Note the diagnostic differs from the one iteration 2 predicted (`fatal: Needed a single revision`, not `fatal: bad revision ''`) — because the empty operand is now `^{commit}` rather than bare. The criterion text predicts the latter string in its rationale paragraph, but it does **not** assert it; the observable is the exit code. That is the right way round, and no correction is needed.

### The split form runs here `[CMD]`

All three commands execute under this worktree's isolation guard:

```
$ git rev-parse --verify "b60f8be^{commit}"
b60f8be570dc0e9ae20124601ca8ef3463686aa8
exit=0

$ git diff --name-only b60f8be -- server/src
server/src/config.ts
exit=0
```

A wrong or truncated SHA pasted into command 3 is rejected, so the manual paste step is itself guarded:

```
$ git diff --stat b60f8be6b1c9 -- server/src/db.ts
fatal: bad revision 'b60f8be6b1c9'
exit=128
```

---

## Part 2 — the command-form deviation, judged on its merits

**Verdict: the claim is TRUE, reproduced in this worktree. The deviation is SOUND and the lead's approval was correct.**

Iteration 2 offered two fix forms. I ran both. **Both are refused outright by the worktree-isolation guard.**

```
$ git diff --stat "$(cat .moai/specs/SPEC-AUTH-001/.spec-base-sha)" -- server/src/db.ts
This session is isolated in the worktree …, but this command is too complex to verify
that it stays inside the worktree. Refusing to run it …

$ BASE=$(cat .moai/specs/SPEC-AUTH-001/.spec-base-sha) && git rev-parse --verify "$BASE^{commit}" >/dev/null && git diff --stat "$BASE" -- server/src/db.ts
This session is isolated in the worktree …, but this command is too complex to verify
that it stays inside the worktree. Refusing to run it …
```

Neither ever reaches git. The guard rejects the compound `&&` chain **and** the `$(cat …)` substitution inside `git diff`. Meanwhile the form the author chose does run, as shown in Part 1.

Judged on merits, three things make this the right call rather than a convenient dodge:

1. **The rejected forms are not merely awkward here — they are unexecutable.** A criterion that cannot be run is worse than one that observes weakly: it produces no evidence at all, and the implementer will substitute something ad hoc.
2. **The deviation preserves the property R1 existed to restore.** The exit-code binding is intact; only the plumbing changed. Splitting into separately-runnable commands did not weaken the observable — Part 1 shows the failure path still fails.
3. **It is documented at the point of use, not buried.** Each criterion states why the SHA is pasted rather than substituted, and says the constraint was confirmed in this round (`AUTH/acceptance.md:217`, `ROOM/acceptance.md:197`, `BOT/acceptance.md:190`). A future reader who "simplifies" it back will hit the guard and find the reason already written down.

One residual, recorded not charged: `git rev-parse --verify "$(cat …)^{commit}"` **does** run, so the guard's refusal is specific to `git diff` with substitution, not to substitution generally. The criteria's rationale text says "`$(cat …)` 을 품은 `git diff` 가 … 가드에 걸려" — which is precisely accurate. No overclaim.

---

## Part 3 — R2 closure

**Verdict: CLOSED, and verified by execution rather than by reading. All four sub-checks the lead asked for pass.**

### (a) The getter is there, and `dbPath` / `uploadsDir` still derive from it `[CMD]`

```
$ cat -n server/src/config.ts
     1  // 서버 설정: 포트와 데이터 경로
     2  export const config = {
     3    port: Number(process.env.MINIDISCORD_PORT ?? 3000),
     4    // 지연 평가: 테스트가 import 이후에 MINIDISCORD_DATA_DIR 을 설정해도 반영되도록 게터로 둔다
     5    get dataDir() { return process.env.MINIDISCORD_DATA_DIR ?? './data' },
     6    get dbPath() { return `${this.dataDir}/minidiscord.db` },
     7    get uploadsDir() { return `${this.dataDir}/uploads` },
     8  }
```

`dbPath` and `uploadsDir` read `this.dataDir`, so all three are late-bound together. The comment is in Korean per `code_comments: ko`.

### (b) The SPEC records describe the mechanism accurately `[READ]` + `[CMD]`

The records say the getter re-reads the environment variable **per access**, and explicitly attribute the late binding to the getter rather than to `buildServer`:

> `AUTH/acceptance.md:272` — "환경변수를 다시 읽는 것은 그 게터이지 `buildServer` 가 아니다"
> `ROOM/acceptance.md:258` — "환경변수를 매 호출마다 다시 읽는 것은 그 게터이지 `buildServer` 가 아니다"

I verified that description is literally true by executing it (probe script importing `server/src/config.js`, run under `npx tsx`):

```
before: ./data | ./data/minidiscord.db | 3000
after : /tmp/md-late | /tmp/md-late/minidiscord.db | /tmp/md-late/uploads | port= 3000
```

The environment variable was mutated **after** import and the three derived values changed; `port` did not. That is exactly what the records claim, on both halves.

The cross-card deviation record at `ROOM/plan.md:159-186` (§D 8) is accurate and complete: it names the file, the card boundary crossed, the reason (`AC-ROOM-011` hermetic guarantee), the lead's ruling, the before/after code, the impact list, and the residual. Its self-verification claim — "`npm test -w server` 가 3파일 5테스트 통과" — I re-ran `[CMD]`:

```
$ npm test -w server
 Test Files  3 passed (3)
      Tests  5 passed (5)
```

Claim confirmed, not taken on trust.

### (c) AC-ROOM-011 and AC-AUTH-014 are now true rather than aspirational `[READ]`

Both criteria assign `process.env.MINIDISCORD_DATA_DIR = mkdtempSync(…)` and then `await import('../src/index.js')` (`ROOM/acceptance.md:233-234`, `AUTH/acceptance.md:249-250`). With the getter, `buildServer()`'s later read of `config.dbPath` resolves through `this.dataDir` at call time — after the assignment. The hazard iteration 2 identified (`routes-bots.ts` gaining a static `config.js` import, freezing `dataDir` at `'./data'` before any test body runs) no longer exists, because there is nothing left to freeze.

Both criteria now carry a paragraph naming the dependency so a future reader cannot silently break it (`ROOM/acceptance.md:258`, `AUTH/acceptance.md:272`), and **both plans' §H forbid reverting it** — `ROOM/plan.md:261`: "**`config.dataDir` 을 다시 평범한 속성으로 되돌리기** — … 되돌리면 AC-ROOM-011 과 AC-AUTH-014 가 저장소의 진짜 `data/` 를 열면서도 통과한다." `BOT/plan.md:264` carries the forward-looking half: BOT's own `config.js` import is named as the thing that makes the check necessary, with an instruction to confirm the getter is still in place. `AUTH/plan.md:108` carries it as a §E risk row. This is the correct shape — the fix is protected at all three consumption sites, not just where it was made.

### (d) The `port` residual is recorded and invalidates no criterion `[CMD]`

The residual is recorded in four places: `ROOM/plan.md:186` (§D 8 남은 한계), `ROOM/plan.md:199` (§E risk row, with the mitigation "필요해지는 시점에 `port` 도 게터로 바꾼다"), `ROOM/progress.md:72`, `AUTH/progress.md:73`, `BOT/progress.md:72`.

**The lead asked specifically whether anything sets `MINIDISCORD_PORT` after import. One thing does, and it is safe** `[CMD]`:

```
$ grep -rn "MINIDISCORD_PORT" --include=*.ts .
server/test/config.test.ts:16:    process.env.MINIDISCORD_PORT = '4100'
```

Reading the surrounding lines, the assignment is paired with a module reset **before** the import:

```
15    it('env overrides', async () => {
16      process.env.MINIDISCORD_PORT = '4100'
17      process.env.MINIDISCORD_DATA_DIR = '/tmp/md'
18      vi.resetModules()
19      const { config } = await import('../src/config.js')
20      expect(config.port).toBe(4100)
```

Because `vi.resetModules()` precedes the import, the eagerly-evaluated `port` is recomputed and the assertion holds — confirmed by the passing run in (b). This file is a `SPEC-CORE-001` artifact, so the three SPECs' claim ("이 세 SPEC 중 어느 것도 import 이후에 `MINIDISCORD_PORT` 를 바꾸지 않는다") is both true and correctly scoped. `BOT/progress.md:72` separately notes that AC-BOT-002 only *reads* `config.port`. **The residual invalidates no criterion.**

---

## Part 4 — R4 closure

**Verdict: CLOSED. The table and the note now state the same condition, the contradiction survives nowhere else, and the relaxation did not go too far.**

### The table and the note agree `[READ]`

`ROOM/acceptance.md:215` and `:217` were rewritten from the tool string to the cause:

| Before (iteration 2 quoted `:207`) | After (`:215`, `:217`) |
|---|---|
| `rooms-bots.test.ts` 추가 후 실패, 메시지에 `Cannot find module '../src/routes-rooms.js'` 포함 | `rooms-bots.test.ts` 추가 후 실패, 실패 원인이 `routes-rooms.js` 모듈 부재임이 출력에서 확인됨 |
| `describe('bots', …)` 추가 후 실패, 메시지에 `routes-bots.js` 모듈 없음 포함 | `describe('bots', …)` 추가 후 실패, 실패 원인이 `routes-bots.js` 모듈 부재임이 출력에서 확인됨 |

The note at `:220` reads "RED 판정은 도구가 내는 특정 문구가 아니라 '그 모듈이 없어서 실패했다'는 원인이 출력에서 확인되는가로 한다." Table and note now state one condition. Rows 2 and 4 are GREEN rows and were untouched, correctly.

### The contradiction survives nowhere else `[CMD]`

```
$ grep -n "Cannot find module" .moai/specs/SPEC-*/plan.md .moai/specs/SPEC-*/acceptance.md
.moai/specs/SPEC-AUTH-001/plan.md:119
.moai/specs/SPEC-AUTH-001/acceptance.md:236
.moai/specs/SPEC-ROOM-001/plan.md:214
```

Three survivors, none of them a contradiction inside a criterion:

- `AUTH/acceptance.md:236` quotes the string **as the thing not to bind to** — "판정 기준을 도구가 내는 특정 문구(`Cannot find module '...'`)에 묶지 않는다 … vitest 는 … `Failed to load url ...` 로도 같은 상황을 보고하므로". This is the note doing its job, not a competing pass condition.
- `AUTH/plan.md:119` and `ROOM/plan.md:214` are the two R3 instances — plan-step prose, deliberately carried over. Disposition in Part 7.

BOT's transition rows (`BOT/acceptance.md:88-91`) were already cause-phrased at iteration 2 and still are, with the matching note at `:93`. **All three SPECs now judge RED by cause, uniformly.**

### The relaxation did not over-relax `[READ]`

The rewritten cells still name the **specific missing module** (`routes-rooms.js`, `routes-bots.js`), and the note requires the cause be *confirmed in the output*. A test failing for an unrelated reason — a wrong assertion, a type error, a DB lock — does not put "that module is missing" into the output, so it does not satisfy the row. The relaxation moved the binding from a tool-version-fragile literal to a cause statement without widening what counts as RED. This is the correct distance.

---

## Part 5 — Verification-claim-integrity sweep (the highest-value target)

I swept all 36 criteria across the three `acceptance.md` files for observables satisfiable by a failure, a skipped setup step, or a command that cannot run here. **Two blocking defects surfaced.** Both are pre-existing — present at iteration 1 and iteration 2, missed by both audits — and both compound each other.

### D1 — blocking — 9 criteria state "the named test passes", and the specified command cannot show that

**Files:** `AUTH/acceptance.md:20,22,25,26,43,76,110,116` (AC-AUTH-001, 003, 006, 007) · `ROOM/acceptance.md:25,26,134,140` (AC-ROOM-005, 006) · `BOT/acceptance.md:21,24,41` (AC-BOT-001, 004) · and AC-ROOM-001's base test
**Class: blocking** — the observable cannot be observed with the command the criterion specifies

These criteria differ in kind from the rest. Every other criterion **supplies the test body to add**, so the test's existence is established by the act of writing it, and a failure turns `npm test` non-zero. These nine instead reference a *pre-existing original test by name* and make its passing the entire observable:

> `AUTH/acceptance.md:43` — **Then** `auth.test.ts` 의 `registers a user` 가 통과한다.
> `ROOM/acceptance.md:134` — **Then** `rooms-bots.test.ts` 의 `calls onArchive hook when provided` 가 통과한다.
> `BOT/acceptance.md:41` — **Then** `rooms-bots.test.ts` 의 `invites a bot and returns one-time token + command` 가 통과한다.

The specified command is `npm test -w server`. Its output does not contain test names `[CMD]`:

```
$ npm test -w server
> vitest run

 Test Files  3 passed (3)
      Tests  5 passed (5)
```

Contrast with the same suite under an explicit reporter `[CMD]`:

```
$ npm test -w server -- --reporter=verbose
 ✓ test/config.test.ts > config > defaults (no env) 6ms
 ✓ test/config.test.ts > config > env overrides 0ms
 ✓ test/db.test.ts > openDb > creates all tables 8ms
 ✓ test/db.test.ts > openDb > is idempotent (reopen same file) 4ms
 ✓ test/health.test.ts > health > GET /api/health returns ok 70ms
```

**No SPEC anywhere specifies a reporter** `[CMD]`: `grep -rn "reporter\|verbose"` over all three SPEC directories returns nothing.

The consequence is exact. If the implementer never writes `calls onArchive hook when provided`, `npm test -w server` still exits 0 and still prints an output byte-identical in shape to the passing case. §G's obligation to record the **verbatim** output into `progress.md` §E.2 — the procedural mitigation that let iteration 2 classify R1 as major rather than blocking — **does not fire here**, because the verbatim output contains no test name to record. Pass and never-written are indistinguishable in the evidence.

This is strictly worse than R1. R1's skipped-setup path at least put `fatal:` on the operator's screen; this one produces no signal at all. It is the same defect class as iteration 1's six blocking findings — a check that does not check — and it is the largest remaining instance in the chain.

A `-t` filter is **not** a valid fix `[CMD]`:

```
$ npm test -w server -- -t nonexistenttestname
 Test Files  3 skipped (3)
      Tests  5 skipped (5)
```

Exit 0 on a name that matches nothing. Filtering would reproduce the defect.

**Required fix** (one edit per criterion, plus one shared clause):

1. Change the command in all nine criteria and their AC-matrix rows from `npm test -w server` to `npm test -w server -- --reporter=verbose`.
2. Add to each Then clause: "기록된 출력에 `✓ … > <테스트 이름>` 줄이 실제로 나타나야 한다. 그 줄이 없으면 이 기준은 **실패**다 — 이름 붙은 테스트가 없어도 `npm test` 는 종료 코드 `0` 이다."
3. Add the matching anti-pattern to all three §H lists: "**이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않는다. 이름 붙은 테스트의 통과는 `--reporter=verbose` 출력에서 그 줄을 보고 판정한다."

### D2 — blocking — the normative source document is absent from this worktree and untracked in git

**Files:** all 12 artifacts; 47 references. Declared normative at `AUTH/plan.md:3`, `ROOM/plan.md:3`, `BOT/plan.md:3` ("원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` … 그 문서는 읽기 전용이다"), and cited in each §I. Each `acceptance.md:5` states "테스트 이름은 `plan-v2.md` Task N 의 원본 테스트 본문을 따른다."
**Class: blocking** — the run phase cannot read the document its criteria bind to

```
$ ls .moai/plan/2026-08-26-minidiscord/
plan.md    spec.md    user-context

$ ls /Users/byunjungwon/Dev/my-project-04/minidiscord/.moai/plan/2026-08-26-minidiscord/
plan-v2.md    plan.md    spec-v2.md    spec.md    user-context    v2-프롬프트.md

$ git log --all --oneline -- '.moai/plan/2026-08-26-minidiscord/plan-v2.md'
(no output)

$ git check-ignore -v .moai/plan/2026-08-26-minidiscord/plan-v2.md
exit=1        # not ignored — simply never added
```

`plan-v2.md` exists **only as an untracked file in the primary checkout**. It is in no branch, no commit, no clone. The card `t2` run phase happens in this worktree, where the path resolves to a directory that does not contain it.

Three concrete consequences:

- The nine D1 criteria name original tests whose bodies live only in that file. The implementer cannot transcribe what they cannot read, and D1 guarantees the omission is not detected.
- Line-precise citations used as deviation evidence — `plan-v2.md:733`, `:886`, `:888` in `ROOM/plan.md:133-134` and `BOT/plan.md:171-173`, and quoted again in `ROOM/acceptance.md:128` and `BOT/acceptance.md:126` — are unverifiable from the repository. The ratified 404/409 contract's entire "what the original said" record rests on them.
- Iteration 2 itself cited this file via `[CMD]` `sed -n '394,401p' .moai/plan/…/plan-v2.md` with a repo-relative path. That command cannot have run in this worktree. The evidence for iteration 2's Deviation 1 and BOT-M2 judgments is not reproducible here.

D1 and D2 reinforce each other: D2 removes the implementer's ability to write the named tests, and D1 removes the chain's ability to notice.

**Required fix** — either is sufficient, the first is cheaper:

1. **Commit `plan-v2.md` (and `spec-v2.md`, which the plans also cite at `AUTH/plan.md:84`, `ROOM/plan.md:115`, `BOT/plan.md:96`) to the repository** so every worktree and clone resolves the path. They are declared read-only source; committing them changes nothing but availability.
2. Or inline the nine referenced original test bodies into their criteria, matching the self-contained style the other 27 criteria already use, and rewrite the `acceptance.md:5` sentence and each §I entry to stop pointing at an unavailable file. This also closes D1 for those nine.

### Criteria that survived the sweep clean `[READ]`

| Criterion | Why it holds |
|---|---|
| AC-AUTH-012 / AC-ROOM-009 / AC-BOT-009 | Exit code 0 required on the precheck **and** on each diff (R1 fix, Part 1) |
| AC-AUTH-014 / AC-ROOM-011 | Temp-dir binding is now mechanical, not incidental (R2 fix, Part 3); `401` chosen over `404` precisely because an unregistered route yields `404` — the stronger observable |
| AC-BOT-003 | Runtime key-set + substring assertions; cannot be satisfied by source formatting. The grep it replaced could not pass at all |
| AC-AUTH-009 | Five separate `grep -c` lines each expecting `1`; absence yields `0`, not a silent pass |
| AC-ROOM-003 second command | `grep -c 'db\.transaction('` with the dot escaped; `:96` states why the escape is a correctness matter, `:98` splits what it proves from what it does not and names AC-BOT-008 as the executing half |
| AC-AUTH-002 / AC-ROOM-004 / AC-BOT-005 | Supply their own test bodies with explicit status-code and differing-body assertions |
| AC-BOT-006 | `typeof` assertion; `0 AS online` fails it |
| AC-AUTH-013 / AC-ROOM-010 / AC-BOT-010 | Require a RED observation before GREEN, so the implementation cannot be written first |

---

## Part 6 — Regressions introduced by this round

**None found.** Checked explicitly:

| Check | Result |
|---|---|
| Tier M budgets, counted independently `[CMD]` | `grep -c "^\*\*REQ-"` → AUTH **15**, ROOM **14**, BOT **9**; `grep -c "^### AC-"` → AUTH **14**, ROOM **11**, BOT **11**. All six ≤ 16, unchanged from iteration 2 |
| REQ ID contiguity `[CMD]` | Enumerated: AUTH `001`–`015`, ROOM `001`–`014`, BOT `001`–`009`. Sequential, no gaps, no duplicates, uniform 3-digit padding |
| REQ → AC coverage `[CMD]` + `[READ]` | Every REQ maps to ≥1 criterion. `REQ-ROOM-002` and `REQ-ROOM-011` appear only in the matrix's comma shorthand (`REQ-ROOM-001, 002, 003` at `:21`; `REQ-ROOM-008, 009, 011` at `:26`) — covered, not orphaned. No orphan criteria |
| 404/409 symmetric contract `[READ]` | Intact and identical on both sides. `ROOM/plan.md:153` and `BOT/plan.md:192` both state the one-sentence rule verbatim; `403` excluded in both. §B route tables agree (`ROOM/plan.md:51`, `BOT/plan.md:59`). Both §D before/after tables cover **both** routes (`ROOM/plan.md:148,150`; `BOT/plan.md:187,190`) with mutual cross-references |
| Both §H anti-patterns forbidding reversion `[READ]` | Present: `ROOM/plan.md:255` ("보관 실패를 `404` 하나로 되돌리기"), `BOT/plan.md:266` ("실패 코드를 `403` 하나로 되돌리기"). Both cite their §D record |
| Deferred `--token`/`--server` record `[CMD]` | Present and **unresolved** in both, both pointing at card `t4`: `AUTH/plan.md:93` ("기록은 지우지 않고 남겨 **카드 t4 착수 시 다시 확인한다**"), `BOT/plan.md:156` ("카드 `t4` 에서 … 재확인 대상이다"), reinforced as §H anti-pattern at `BOT/plan.md:264`. **Correct; not a defect** |
| Frontmatter schema `[CMD]` | 12 canonical fields present in all three; `tier: M` and `depends_on` are schema-listed optional fields; no rejected snake_case alias. `phase: "v0.1.0 target"` — a release target in all three |
| Versions and HISTORY `[CMD]` | AUTH `0.4.0`, ROOM `0.3.0`, BOT `0.3.0`. Each has a new HISTORY row citing `t2-3spec-audit-iter2.md`, its PASS score, and the R1/R2 closures. See D3 for ROOM's omission |
| MP-7 clarification gate `[CMD]` | `grep -rn "NEEDS CLARIFICATION"` over all three directories → exit 1, no matches |
| D7 cross-SPEC `[CMD]` | `SPEC-CORE-001` exists, `status: completed`. Not in {retired, superseded, archived}. Siblings all exist. No BLOCKING |
| D8 cross-platform `[CMD]` | `grep -rn "syscall"` → exit 1. Auto-PASS |
| Out of Scope `[CMD]` | AUTH 9, ROOM 6, BOT 7 H3 blocks with specific bullets |
| Suite still green `[CMD]` | `npm test -w server` → 3 files, 5 tests passed. The `config.ts` edit broke nothing |
| Cross-SPEC contract drift `[READ]` | None. The getter change strengthens the `config` contract both siblings consume; `SPEC-CORE-001`'s requirements are unchanged in meaning, as `ROOM/plan.md:184` states |

The `config.ts` edit is the only source-file change in the working tree `[CMD]`: `git diff --name-only b60f8be -- server/src` → `server/src/config.ts`. Scope discipline held.

---

## Part 7 — R3 and R5 (carried over by the lead — not re-litigated)

Both remain open, exactly as the lead scoped, and **both are correctly recorded as unresolved in the progress files** rather than quietly dropped:

> `AUTH/progress.md:75` — "2차 보고서의 R3 … 이번 지시 범위 밖이라 그대로 둔다 — **미해결**이다."
> `ROOM/progress.md:76` — "2차 보고서의 R3 … R5 는 경미로 분류돼 있고 리드가 의도적으로 이월했다 — **미해결**이다."
> `BOT/progress.md:74` — "2차 보고서의 R5 … 와 `POST` 초대 응답 키 집합 단언 제안은 경미·선택으로 분류돼 있고 … — **미해결**이다."

That record-don't-drop discipline is itself worth noting; it is what makes the carry-over auditable.

**Should either block? No — for both, and for the same reason, verified rather than assumed.**

- **R3** (`AUTH/plan.md:119`, `ROOM/plan.md:214` still say "→ `Cannot find module '../src/auth.js'` 로 실패") — a plan step is not the pass/fail authority. The authority is `AUTH/acceptance.md:236` and `ROOM/acceptance.md:220`, both of which now judge by cause and, in AUTH's case, explicitly warn against binding to that literal. The worst outcome is an implementer who expects a string, sees `Failed to load url`, and checks the criterion — which tells them the right rule. **Minor. Does not block.**
- **R5** (`BOT/acceptance.md:27` lists `REQ-BOT-008, REQ-BOT-009` while `:76` cites REQ-BOT-001) — under-reporting in the traceability matrix. The observation itself exists and is executed; only the index is incomplete. REQ-BOT-001 is separately covered by AC-BOT-001 and AC-BOT-011, so it is not an uncovered requirement. **Minor. Does not block.**

Neither is why this audit fails. The lead's carry-over decision was sound on both.

---

## Defects Found (structured defect-list)

```
D1. iter3-D1 — AUTH/acceptance.md:20,22,25,26,43,76,110,116 · ROOM/acceptance.md:25,26,134,140 ·
    BOT/acceptance.md:21,24,41 — Nine criteria state "the named test passes" as their entire
    observable, but the specified command `npm test -w server` prints no test names, so a
    never-written test and a passing test produce identical output; §E.2 verbatim recording
    cannot distinguish them. Verified: default reporter shows only "Tests 5 passed (5)";
    `--reporter=verbose` shows each name; no SPEC specifies a reporter; `-t <no-match>` exits 0.
    — Severity: critical — Class: blocking — Required fix: change the command in all nine
    criteria and their AC-matrix rows to `npm test -w server -- --reporter=verbose`; add to each
    Then clause the requirement that the `✓ … > <test name>` line appear in the recorded output,
    with absence stated as FAILURE; add the matching anti-pattern to all three §H lists.

D2. iter3-D2 — all 12 artifacts, 47 references; declared normative at AUTH/plan.md:3,
    ROOM/plan.md:3, BOT/plan.md:3 and at each acceptance.md:5 — `.moai/plan/2026-08-26-minidiscord/
    plan-v2.md` is absent from this worktree and untracked in every branch, so the run phase cannot
    read the document its criteria bind to; the nine D1 test bodies and the line-precise 404/409
    deviation evidence (plan-v2.md:733/:886/:888) are unreachable. Verified: `ls` shows the file
    only in the primary checkout; `git log --all -- <path>` returns nothing; not gitignored.
    — Severity: critical — Class: blocking — Required fix: commit `plan-v2.md` and `spec-v2.md`
    to the repository (they are read-only source; committing changes only availability); or inline
    the nine original test bodies into their criteria and rewrite acceptance.md:5 and each §I entry
    to stop citing an unavailable file.

D3. iter3-D3 — ROOM/spec.md:27 — the v0.3.0 HISTORY row says "남은 중대 2건만 닫았다" and
    describes only R1 and R2, but R4 was also closed this round (recorded at ROOM/progress.md:74
    with the lead's scope-extension rationale). ROOM/plan.md:269 has the same omission. The HISTORY
    under-reports what changed. — Severity: minor — Class: optional — Required fix: append to the
    v0.3.0 row "**R4** — AC-ROOM-010 전이표 1·3행이 도구 문구를 요구해 네 줄 아래 주석과 충돌하던
    것을 원인 서술로 고쳤다 (리드가 범위를 R1·R2·R4 로 확장)", and add R4 to ROOM/plan.md:269.

D4. iter3-D4 — ROOM/acceptance.md:233 · AUTH/acceptance.md:249 — neither criterion restores or
    deletes `MINIDISCORD_DATA_DIR` after its test. Before R2 the value was frozen at module load,
    so a leak was inert; now that `dataDir` is read per access, every later `config.dataDir` read
    in the same file resolves to the temp directory. Vitest's default per-file isolation contains
    it across files, so no criterion is currently invalidated, but the getter widened the blast
    radius and no record notes it. — Severity: minor — Class: optional — Required fix: add
    `const prev = process.env.MINIDISCORD_DATA_DIR` before the assignment and restore it in the
    test's cleanup, or note in both criteria that intra-file ordering after this test is affected.

D5. iter3-D5 — ROOM/acceptance.md:233 · AUTH/acceptance.md:249 — both snippets call
    `mkdtempSync(join(tmpdir(), …))` without stating that `mkdtempSync`, `join` and `tmpdir` must
    be imported; the surrounding plan steps do not list them either. A transcribed snippet will not
    compile. — Severity: minor — Class: optional — Required fix: add the import line
    `import { mkdtempSync } from 'node:fs'; import { join } from 'node:path'; import { tmpdir } from 'node:os'`
    to both snippets, or state it in the file-skeleton plan step (ROOM/plan.md:213, AUTH/plan.md:118).

D6. iter3-R3 (carried over, lead decision) — AUTH/plan.md:119 · ROOM/plan.md:214 — the literal RED
    string survives in two plan steps. Not the pass/fail authority. — Severity: minor —
    Class: optional — Required fix: rewrite both to "→ 모듈 부재로 실패. 출력 기록 (판정 기준은
    AC-AUTH-013 / AC-ROOM-010 참조)".

D7. iter3-R5 (carried over, lead decision) — BOT/acceptance.md:27 — matrix row omits REQ-BOT-001,
    which BOT/acceptance.md:76 explicitly observes. — Severity: minor — Class: optional —
    Required fix: change the row to `REQ-BOT-001(등록 위치), REQ-BOT-008, REQ-BOT-009`.
```

---

## Regression Check (iteration 2 defect delta)

| ID | Iteration 2 severity | Status | Evidence |
|----|---------------------|--------|----------|
| R1 | major | **RESOLVED** | Exit-code binding added to all three criteria + all three DoD copies + both §H lists. Failure path reproduced `[CMD]`: precheck exits 128 when `.spec-base-sha` is absent. Part 1 |
| R2 | major | **RESOLVED** | `dataDir` is a getter (`config.ts:5`); late binding verified by execution `[CMD]`; records accurate on the mechanism; reversion forbidden in both §H lists; `port` residual recorded in five places and verified harmless `[CMD]`. Part 3 |
| R4 | minor | **RESOLVED** | `ROOM/acceptance.md:215,217` rewritten to cause; note at `:220` agrees; `grep "Cannot find module"` shows no surviving contradiction inside any criterion. Part 4 |
| R3 | minor | **UNRESOLVED** (deliberate) | `AUTH/plan.md:119`, `ROOM/plan.md:214` `[CMD]`. Correctly recorded as 미해결 in both progress files. Does not block |
| R5 | minor | **UNRESOLVED** (deliberate) | `BOT/acceptance.md:27` `[CMD]`. Correctly recorded as 미해결. Does not block |
| `POST` invite key-set (optional) | minor | **UNRESOLVED** (deliberate) | Recorded at `BOT/progress.md:74`. Optional |

**Stagnation check:** no defect appears unchanged across all three iterations. Every finding the lead scoped into a round was closed in that round. The correction author has made real progress each time.

---

## Category Scores (0.0–1.0, rubric-anchored)

| Dimension | AUTH | ROOM | BOT | Evidence |
|---|---|---|---|---|
| Clarity | 0.90 | 0.92 | 0.95 | AUTH deducted for D6/R3. ROOM's self-contradicting row is gone (R4) and it gains back what iteration 2 deducted; deducted for D3's incomplete HISTORY. BOT unambiguous throughout |
| Completeness | 0.95 | 0.95 | 0.95 | All sections present, 12/12 frontmatter, substantive Out of Scope (9/6/7), HISTORY rows citing the iter2 report, both §D deviation records complete with mutual cross-references |
| Testability | 0.70 | 0.72 | 0.75 | **D1 costs all three heavily** — 4/2/2 criteria whose observable cannot be observed with the specified command. R1 and R2 closures pull back up: the scope-boundary and hermetic-temp-dir defects are gone, both verified by execution. ROOM additionally carries D4/D5 |
| Traceability | 0.88 | 0.90 | 0.86 | Full REQ→AC coverage, no orphans, contiguous IDs. All three deducted for **D2** — the normative source 47 references point at is unreachable, so the deviation evidence chain cannot be walked. BOT further deducted for D7/R5 |
| Consistency | 0.92 | 0.90 | 0.95 | The 404/409 rule is stated identically on both sides with both §H reversion guards intact; the getter dependency is recorded at all three consumption sites. AUTH deducted for D6/R3; ROOM for D3 |
| **Aggregate** | **0.87** | **0.88** | **0.90** | Threshold 0.80 — all three clear it |

**Overall: 0.88.**

### Score movement and the LEAN STOP clause

| | iter1 | iter2 | iter3 |
|---|---|---|---|
| AUTH | 0.62 | 0.90 | 0.87 |
| ROOM | 0.74 | 0.88 | 0.88 |
| BOT | 0.66 | 0.92 | 0.90 |
| Overall | 0.67 | 0.90 | **0.88** |

The overall aggregate dipped 0.90 → 0.88, which technically arms the LEAN STOP-on-regression clause. **I do not recommend the lead read it as deterioration, and I state the reason plainly:** the artifacts strictly improved this round — three findings closed, zero regressions, one source fix verified by execution. The dip is entirely an **audit-coverage effect**: D1 and D2 are pre-existing defects that iterations 1 and 2 did not surface, and scoring them now lowers the number without anything having gotten worse. ROOM, which absorbed the most fixes, did not move at all.

The STOP clause's remedy (scope reduction, or PASS-with-debt) is in any case subsumed by the iteration-3 cap below.

### Must-pass results

- **[PASS] MP-1 REQ number consistency** `[CMD]` — AUTH `REQ-AUTH-001`…`015`, ROOM `001`…`014`, BOT `001`…`009`. Sequential, no gaps, no duplicates, uniform padding.
- **[PASS] MP-2 GEARS format compliance** — judged against the **requirement layer** (`REQ-XXX` in `spec.md`) only, per M3 § Scope. All 38 requirements carry an explicit pattern label and match it; new-this-round requirements: none. No legacy `If/Then` form anywhere. The Given-When-Then entries in the three `acceptance.md` files are verification-layer `AC-XXX` and are graded under Group 4, not here.
- **[PASS] MP-3 YAML frontmatter validity** `[CMD]` — 12/12 canonical fields in each; no rejected snake_case alias; `phase` is a release target (`"v0.1.0 target"`), not a lifecycle value; `tier` and `depends_on` are schema-listed optional fields.
- **[N/A] MP-4 language neutrality** — single-language project (TypeScript/Node). Auto-passes.
- **[PASS] MP-5 D7 cross-SPEC reconciliation** `[CMD]` — `SPEC-CORE-001` exists with `status: completed`; the three siblings all exist. No retired/superseded/archived reference. No BLOCKING.
- **[PASS] MP-6 D8 cross-platform discipline** `[CMD]` — no `syscall` occurrence in any of the three directories. Auto-PASS.
- **[PASS] MP-7 clarification gate** `[CMD]` — no `[NEEDS CLARIFICATION` marker in any of the three directories.

**All seven must-pass criteria pass.** The FAIL is driven by D1 and D2 under the blocking rule, not by the must-pass firewall and not by score.

---

## Verdicts

- **SPEC-AUTH-001 — FAIL** (0.87, threshold 0.80). R1 and R2 closed cleanly. Blocking: D1 (4 criteria), D2. Minor open: D5, D6/R3.
- **SPEC-ROOM-001 — FAIL** (0.88, threshold 0.80). R1, R2 and R4 all closed; the most-corrected SPEC and the one whose §D record is the strongest in the set. Blocking: D1 (2 criteria), D2. Minor open: D3, D4, D5, D6/R3.
- **SPEC-BOT-001 — FAIL** (0.90, threshold 0.80). R1 closed; R2's forward dependency correctly recorded in §E and §H. Blocking: D1 (2 criteria), D2. Minor open: D7/R5.
- **Overall — FAIL** (0.88). Two distinct blocking findings, both spanning all three SPECs.

---

## Minimum remaining work (this is the final Retry Loop iteration)

Two items. Nothing else on this list is a gate.

1. **D2 — make the source document reachable.** Cheapest form: `git add .moai/plan/2026-08-26-minidiscord/plan-v2.md .moai/plan/2026-08-26-minidiscord/spec-v2.md` and commit. One command. This is the higher-priority of the two because D1's fix is partly moot without it — a verbose reporter that proves a test is missing does not help an implementer who cannot read what the test should contain.

2. **D1 — make the nine named-test criteria observable.** Nine command-cell edits (`npm test -w server` → `npm test -w server -- --reporter=verbose`), nine Then-clause sentences, nine matching AC-matrix rows, and one §H bullet per SPEC. Mechanical; no judgment calls; no requirement changes; no REQ or AC count changes, so all six Tier M budgets stay where they are.

Neither touches a requirement, a status code, the ratified 404/409 contract, or `config.ts`. Estimated blast radius: three `acceptance.md` files and three `plan.md` §H lists.

**D3 through D7 are optional** and are surfaced for the lead's discretion, not routed. D3 (one HISTORY sentence) and D5 (one import line) are near-free if the files are open anyway; D4, D6 and D7 can carry into run phase without risk. Routing all five would be over-correction on a set this close to done.

## Lead decisions pending

1. **Fix-and-close, or PASS-with-debt?** Iteration 3 is the cap. The two blocking items are both mechanical — no design question, no contract change, no re-planning. My recommendation is **fix D2 and D1, then close**, rather than a scope reduction: the SPECs' content is sound and their scores clear the threshold comfortably; what fails is two verification-plumbing defects with known one-line fixes. A scope split would discard genuinely good work to solve a problem that is not a scope problem.

2. **Should the re-check be a fourth audit iteration?** Not necessarily. Both fixes are mechanically verifiable without judgment: `git log --all -- <path>` returning a commit for D2, and `grep -c "reporter=verbose"` returning 9 across the three `acceptance.md` files for D1. The lead can read that evidence directly. If the lead prefers an auditor verdict on the closed delta, the cap must be extended explicitly per the Retry Loop Contract — a conscious choice, not silent drift.

3. **Deviation 3 (symmetric 404/409)** — iteration 2 recommended RATIFY and the lead has not reversed it. I re-verified it this round and it survives intact on both sides with both §H reversion guards in place (Part 6). **Recommendation stands: ratify.** The reversal cost, if the lead still disagrees, is enumerated in iteration 2's report, Part 2, Deviation 3.
