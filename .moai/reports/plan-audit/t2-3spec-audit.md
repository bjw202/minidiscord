# Plan Audit — Card `t2`, 3-SPEC Chain (SPEC-AUTH-001 → SPEC-ROOM-001 → SPEC-BOT-001)

Auditor: plan-auditor (adversarial, independent)
Date: 2026-08-26
Worktree: `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t2` (branch `WT-auth-room-bot`, HEAD `b60f8be`)
Iteration: 1
Tier: M (all three) — PASS threshold `0.80` (`.claude/rules/moai/workflow/spec-workflow.md:330`)

**Reasoning context ignored per M1 Context Isolation.** No author reasoning, draft history, or conversation transcript was consulted. Inputs were the Tier M artifact set for each SPEC (`spec.md` + `plan.md` + `acceptance.md`, plus `progress.md`), `SPEC-CORE-001/`, the committed `server/src/*.ts`, and the read-only source documents in the primary checkout.

---

## Verdict summary

| SPEC | Blocking | Major | Minor | Score | Verdict |
|------|----------|-------|-------|-------|---------|
| SPEC-AUTH-001 | 3 | 4 | 3 | **0.62** | **FAIL** |
| SPEC-ROOM-001 | 1 | 3 | 4 | **0.74** | **FAIL** |
| SPEC-BOT-001 | 2 | 4 | 3 | **0.66** | **FAIL** |
| **Overall** | **6 distinct** | — | — | **0.67** | **FAIL** |

A single blocking finding is a FAIL regardless of score. All three SPECs carry at least one.

The chain is *well-constructed* — the split boundary is clean, the Tier budgets hold, every requirement has a criterion, the deliberately-unresolved contradiction is genuinely preserved, and the two most-feared cross-SPEC hazards (the shared file and the deferred token-revocation check) are both handled correctly and consistently. The failures are concentrated in **verification machinery that does not verify what it claims**: three acceptance criteria cannot pass, one requirement is factually false against code already in the tree, and the wiring that makes the assembled server actually work is required by no criterion in any of the three SPECs.

### Evidence method

Findings below are marked `[CMD]` (verified by running a command — the command and its output are quoted) or `[READ]` (assessed by reading the artifacts). No finding is asserted without one or the other.

---

## Part 1 — The three declared gaps

### Gap 1 — 404 vs 403 asymmetry between SPEC-ROOM-001 and SPEC-BOT-001

**Answer: the two SPECs are mutually consistent and both trace faithfully to the source plan, but the resulting client-facing contract is incoherent. This is a real defect, severity major — not blocking.**

What each SPEC declares:

| Condition | SPEC-ROOM-001 (`POST /api/rooms/:id/archive`) | SPEC-BOT-001 (`POST /api/rooms/:id/invites`) |
|---|---|---|
| room does not exist | `404` (`spec.md:77` REQ-ROOM-006) | `403` (`spec.md:84` REQ-BOT-004) |
| room exists but archived | `404` (same REQ, same body) | `403` (same REQ, same body) |
| bot does not exist | n/a | `404` (REQ-BOT-004) |
| bot not invited (`DELETE`) | n/a | `200`, idempotent (REQ-BOT-007) |

They do not contradict each other. Both plans record the asymmetry deliberately, in near-identical wording — `SPEC-ROOM-001/plan.md:60` and `SPEC-BOT-001/plan.md:62` — and both state the cross-SPEC coupling ("여기서 바꾸면 SPEC-BOT-001 도 함께 바꿔야 한다"). The claim that the source is the origin is true `[CMD]`:

```
$ grep -n "403\|404" .moai/plan/2026-08-26-minidiscord/plan-v2.md
733:    if (r.changes === 0) return reply.code(404).send({ error: '활성 방을 찾을 수 없습니다' })
886:    if (!room) return reply.code(403).send({ error: '활성 방이 아닙니다' })
888:    if (!bot) return reply.code(404).send({ error: '봇을 찾을 수 없습니다' })
```

Three things are nonetheless wrong with the resulting contract, and none is a source-fidelity question:

1. **A client cannot distinguish "room does not exist" from "room is archived" on the invite path at all.** Both return `403` with the byte-identical body `{ error: '활성 방이 아닙니다' }`. `SPEC-BOT-001/acceptance.md:217` states this outright as intended ("`403`. '활성 방이 아니다'라는 한 조건으로 없는 방과 보관된 방을 함께 거절한다"). But `SPEC-BOT-001/plan.md:62` justifies the `403` on the premise that the archived case is *the dominant one* — that premise is exactly what makes the two indistinguishable, so the justification argues for a distinction the design then refuses to make.
2. **`403` has no referent in this system.** `403` means authenticated-but-not-permitted. Per-room permissions are explicitly YAGNI-excluded in all three SPECs (`SPEC-ROOM-001/spec.md:172`, `SPEC-BOT-001/spec.md:150`). There is no permission dimension for a `403` to report, so the code is semantically empty; the UI (card `t5`) will have to special-case it.
3. **`404` carries two different subjects across the two SPECs.** From `archive` it means "no such room"; from `invites` it means "no such bot" while "no such room" is `403`. A UI that maps status codes to messages generically will produce wrong text on one of the two routes.

**Correction (pick one, and record it in both `plan.md` §D sections):**
- *(preferred)* `POST /api/rooms/:id/invites` → `404` when the room row does not exist, `409` when it exists with `status='archived'` (a state conflict, which is what this actually is), `404` when the bot does not exist with a distinct error body. Update `SPEC-BOT-001/spec.md:84` REQ-BOT-004, the status table at `plan.md:58`, `acceptance.md:19` AC-BOT-005 and the edge-case row at `acceptance.md:217`. This is a deliberate deviation from the source, of exactly the same kind that `SPEC-BOT-001/plan.md:110-129` §D-2 already takes for the hardcoded port — so the precedent for deviating is already set inside this SPEC.
- *(minimum)* Keep `403`, but require distinct error bodies for missing-vs-archived and add a requirement that fixes the body strings, so the client has *something* to branch on. Amend REQ-BOT-004 and add the assertion to AC-BOT-005.

---

### Gap 2 — Shared ownership of `server/src/routes-bots.ts`

**Answer: the two SPECs do not contradict each other; no symbol is declared twice or zero times; and the file-boundary requirements are mutually satisfiable in dependency order. One real defect remains, severity major: the `spec.md` layer never states *where* the invite routes are registered — only `plan.md` does.**

Verified point by point.

**Symbol ownership is clean and stated on both sides `[READ]`:**

| Symbol | SPEC-ROOM-001 | SPEC-BOT-001 | Collision? |
|---|---|---|---|
| `registerBotRoutes(app)` | declares + exports (REQ-ROOM-008, `spec.md:85`) | consumes, does not redeclare (`spec.md:64`, `plan.md:26`) | No |
| `GET`/`POST /api/bots` | owns (REQ-ROOM-009/011) | excludes (`spec.md:121`) | No |
| `sha256Hex` | explicitly excludes (`spec.md:145`), and its DoD asserts absence (`acceptance.md:218`) | owns definition + implementation (`plan.md:42`, §D-4 `plan.md:144-148`) | No |
| `inviteCommand` | silent | owns (`plan.md:171`) | No |
| 3 invite routes | excludes (`spec.md:143-144`) | owns (REQ-BOT-001/006/007) | No |

Both sides independently reached the same conclusion about `sha256Hex` and each cites the other's document: `SPEC-ROOM-001/plan.md:88` moves it out because it would be dead code without an issuer; `SPEC-BOT-001/plan.md:144-148` takes it and names ROOM's exclusion clause. This is the strongest part of the split.

**File-boundary requirements are mutually satisfiable in dependency order `[READ]`:**

```
after AUTH: config.ts db.ts index.ts auth.ts                                  (REQ-AUTH-014, 4 files)
after ROOM: + routes-rooms.ts routes-bots.ts                                  (REQ-ROOM-012, 6 files)
after BOT : unchanged — BOT adds no file, only edits routes-bots.ts           (REQ-BOT-008,  6 files)
```

No requirement demands a file that a later requirement forbids. `ls` output ordering matches the enumerated lists in AC-AUTH-012 / AC-ROOM-009 / AC-BOT-009.

**The registration question is answered — but only in `plan.md`.** `REQ-BOT-008` (`spec.md:100`) forbids new source files *and* states "이 SPEC이 손대는 소스 파일은 `routes-bots.ts` 하나뿐이다", which forbids editing `index.ts`. That makes registration possible only if the invite routes go *inside* the already-wired `registerBotRoutes`. `SPEC-BOT-001/plan.md:26` says exactly that ("이 함수 **안에** 초대 라우트를 추가한다"), and the source confirms it is the original shape `[CMD]`:

```
$ sed -n '878,882p' .moai/plan/2026-08-26-minidiscord/plan-v2.md
export function registerBotRoutes(app: FastifyInstance): void {
  // ...기존 GET/POST /api/bots 그대로...
  app.post('/api/rooms/:id/invites', { preHandler: [requireAuth] }, async (req, reply) => {
```

So the symbol is neither doubled nor missing. **But no requirement in either SPEC says it.** `REQ-ROOM-008` describes `registerBotRoutes` as registering bot-definition routes and does not declare it an extension point; `REQ-BOT-001/006/007` name the three routes without naming their registrar. A run-phase implementer reading `spec.md` alone — which is the document `manager-develop` treats as normative — can legitimately add `export function registerInviteRoutes(app)` and wire it in `index.ts`, which then violates REQ-BOT-008's own single-file clause and breaks BOT's Definition of Done. See finding **BOT-M3**.

---

### Gap 3 — SPEC-ROOM-001's consumption list vs SPEC-AUTH-001's actual output

**Answer: every contract SPEC-ROOM-001 claims to consume is actually produced by SPEC-AUTH-001, with matching names and signatures. No compile-breaking mismatch. Two secondary defects surfaced instead — one in SPEC-BOT-001's parallel claim, one about a contract nobody verifies.**

Cross-check of `SPEC-ROOM-001/spec.md:121-126` and `plan.md:22-27` against what SPEC-AUTH-001 declares it produces `[READ]`:

| ROOM claims to consume | AUTH actually declares | Match |
|---|---|---|
| `requireAuth(req, reply): Promise<void>` | `requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void>` — REQ-AUTH-001 (`spec.md:60`), plan §A table row (`plan.md:23`) | ✅ exact |
| `md_session` session-cookie contract | `md_session`, `httpOnly`/`sameSite:'lax'`/`path:'/'`, value = `sessions.token` — REQ-AUTH-008 (`spec.md:83`) | ✅ exact |
| `POST /api/auth/{register,login}` for the test login flow | REQ-AUTH-005 (`201`), REQ-AUTH-008 (`200` + `Set-Cookie`) | ✅ |
| `app.db` decorator + `req.server.db` | REQ-AUTH-003 (`spec.md:66`) — "`openDb(config.dbPath)` 의 결과를 `app.db` 데코레이터로 노출", "`req.server.db` 로 이 하나의 연결을 공유" | ✅ |
| `declare module 'fastify'` `db` declaration | AUTH `plan.md:45-48` places it in `index.ts` | ✅ (see minor ROOM-m4) |
| `@fastify/cookie` registration | REQ-AUTH-003 | ✅ |
| `req.user` shape `{ id, username }` | REQ-AUTH-002 (`spec.md:63`) | ✅ (ROOM never reads it — no ownership model) |
| `rooms`/`bots`/`bot_tokens` from CORE | present in `server/src/db.ts:18-40` | ✅ |

Two divergences that are *documented rather than mismatched*: `registerAuthRoutes(app, db)` takes a `db` argument while `registerRoomRoutes`/`registerBotRoutes` do not (`SPEC-ROOM-001/spec.md:111`); AUTH's `plan.md:62-67` names this asymmetry explicitly and propagates it forward. Not a defect.

**What did surface:**

1. **SPEC-BOT-001 misattributes the test helper.** `SPEC-BOT-001/acceptance.md:7` states "아래 모든 시나리오의 `build()` 헬퍼는 `SPEC-AUTH-001` 이 만든 로그인 헬퍼이고". It is not. AUTH's helper returns a bare app `[CMD]`:

   ```
   $ sed -n '396,401p' .moai/plan/2026-08-26-minidiscord/plan-v2.md
   async function build() {
     const app = Fastify()
     await app.register(cookie)
     registerAuthRoutes(app, db)
     app.get('/api/me', { preHandler: [requireAuth] }, async req => ({ user: req.user }))
     return app
   ```

   whereas every ROOM and BOT scenario destructures `const { app, cookie } = await build()`. The `{ app, cookie }` helper is a *separate* helper that SPEC-ROOM-001 creates in `rooms-bots.test.ts` (`SPEC-ROOM-001/plan.md:123` step 1), confirmed against source `plan-v2.md:636-647`. AUTH's helper lives in `auth.test.ts` and is never exported. See **BOT-M2**.

2. **The one contract nobody verifies is `buildServer` itself.** REQ-AUTH-003 requires `buildServer` to register `@fastify/cookie`, open the DB, and expose `app.db`; `SPEC-AUTH-001/plan.md:116` step 4 spells out the `index.ts` edit. But every AUTH, ROOM and BOT test constructs its *own* `Fastify()` instance and does its own wiring — no criterion in any of the three SPECs ever calls `buildServer()`. An implementation that never touches `index.ts` passes all 34 criteria and produces a server binary that 401s on every request. See **AUTH-B3** — this is the most consequential finding in the audit and it is a direct consequence of the same "derived from the plan, not from the sibling's output" pattern the lead flagged.

---

## Part 2 — Findings

### SPEC-AUTH-001

**AUTH-B1 — blocking — `spec.md:100` (REQ-AUTH-013) is factually false against code already in the tree.**
REQ-AUTH-013 states "인증 없이 접근 가능한 경로는 `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` 세 개뿐이어야 한다." `GET /api/health` is registered unauthenticated by SPEC-CORE-001 `[CMD]`:

```
$ cat -n server/src/index.ts
     3  export async function buildServer(): Promise<FastifyInstance> {
     4    const app = Fastify({ logger: false })
     5    app.get('/api/health', async () => ({ ok: true }))
```

The requirement is unsatisfiable without deleting `/api/health`, which SPEC-CORE-001 owns and which no requirement here authorizes removing. Compounding it, AC-AUTH-011 (`acceptance.md:167-187`) tests only the three named routes and so passes while the requirement it traces to is false — the criterion does not verify its requirement.
**Fix:** rewrite REQ-AUTH-013 to "이 SPEC 이 등록하는 라우트 가운데 인증 없이 접근 가능한 경로는 …세 개뿐이어야 한다. `GET /api/health`(SPEC-CORE-001 소관)는 이 SPEC 의 범위 밖이며 그대로 둔다." and add `['GET','/api/health']` to AC-AUTH-011's `open` array with an expectation of `200`, so the criterion states the true boundary.

**AUTH-B2 — blocking — `acceptance.md:45` (AC-AUTH-002, case 1) cannot pass against its own requirement.**
AC-AUTH-002 asserts `400` for `{ username: '', password: 'pw123456' }`. REQ-AUTH-006 (`spec.md:77`) mandates rejection only when "`username` 이 문자열이 아니거나, `password` 가 문자열이 아니거나, `password` 의 길이가 8 미만" — an empty string *is* a string, and the password is valid. An implementation written literally against REQ-AUTH-006 returns `201`, the case-1 assertion fails, and the trailing `expect(c.c).toBe(0)` fails too. (The source implementation happens to reject it via `!username`, but the requirement dropped that clause when it added the type checks: `plan-v2.md:481` reads `if (!username || !password || password.length < 8)`.)
**Fix:** amend REQ-AUTH-006 to "`username` 이 문자열이 아니거나 빈 문자열이거나, `password` 가 문자열이 아니거나, `password` 의 길이가 8 미만인 요청이 감지되면…".

**AUTH-B3 — blocking — REQ-AUTH-003's `buildServer` half is verified by no criterion, and `acceptance.md:94` claims otherwise.**
REQ-AUTH-003 requires `buildServer` to register `@fastify/cookie` and expose `app.db`. No criterion invokes `buildServer()`. AC-AUTH-005's Then clause states "이 통과가 곧 `registerAuthRoutes` 의 DB 와 `req.server.db` 가 같은 연결이라는 증거다" — but its Given (`acceptance.md:92`) is "테스트의 `build()` 가 `app.db = db` 로 DB 를 주입하고", i.e. the criterion observes the *test helper's* wiring and infers `buildServer`'s. That is an unobserved-verification claim (`verification-claim-integrity.md` §1.1 surface 2). Skipping `index.ts` entirely leaves all 13 AUTH criteria green and the shipped server non-functional. The same hole exists for `registerRoomRoutes`/`registerBotRoutes` (see ROOM-M2).
**Fix:** add one criterion, AC-AUTH-014, that imports `buildServer` from `../src/index.js` against a `MINIDISCORD_DATA_DIR` temp dir, registers `alice`, logs in, and asserts a `200` on a `requireAuth`-guarded route — plus `expect(app.db).toBeDefined()`. Correct AC-AUTH-005's Then clause to claim only what it observes. Note this pushes AUTH to 14 criteria, still inside the Tier M ceiling of 16.

**AUTH-M1 — major — `acceptance.md:224` contradicts REQ-AUTH-006 and AC-AUTH-002 in the same document.**
The edge-case row reads "`password` 가 문자열이 아닌 타입 | `password.length` 가 `undefined` 라 `< 8` 비교가 거짓이 되어 통과할 수 있다 | 미해결". REQ-AUTH-006 explicitly closes this ("타입 검사는 길이 검사보다 먼저 수행한다") and AC-AUTH-002 cases 4-6 assert `400` for exactly these inputs. The row describes the *source* behaviour, which this SPEC deliberately fixed.
**Fix:** replace the row's 기대 동작/검증 cells with "`400`. REQ-AUTH-006 의 타입 검사가 길이 검사보다 먼저 실행된다 | AC-AUTH-002 의 뒤 세 케이스".

**AUTH-M2 — major — `/api/me` is load-bearing for four criteria but authorized by no requirement.**
AC-AUTH-005/007/010/011 all exercise `GET /api/me`. `spec.md` never mentions it; REQ-AUTH-013's clause "이 SPEC 은 그 밖의 어떤 도메인 라우트도 등록하지 않으며" reads as forbidding it. Only `plan.md:105` discloses it is test scaffolding. An implementer who resolves the ambiguity by adding `/api/me` to `auth.ts` breaks AC-AUTH-011's `grep -c "app\.\(get\|post\|put\|delete\)(" server/src/auth.ts` == 3.
**Fix:** state in `acceptance.md` (preamble, near line 5) that `/api/me` is registered by the test `build()` helper only and must not appear in `server/src/`; add the clause to REQ-AUTH-013 or to the `plan.md` §H anti-pattern list.

**AUTH-M3 — major — `acceptance.md:196` schema-immutability check is defeatable in the sibling SPECs (see ROOM-B1); benign here.**
For AUTH specifically the check runs at `plan.md:119` step 7, *before* the single commit at step 8, so `git diff --stat HEAD -- server/src/db.ts` does observe an uncommitted mutation. Recorded here only because the identical command is copied into ROOM and BOT where it is not safe. No fix needed in AUTH; consider adding `git diff --stat <spec-base-sha> -- server/src/db.ts` for uniformity.

**AUTH-M4 — major — AC-AUTH-013's RED transition is unreproducible as written.**
`acceptance.md:209` expects the RED failure message to contain `Cannot find module '../src/auth.js'`. Under vitest with an unresolvable ESM specifier the message is typically `Failed to load url ../src/auth.js` / `Cannot find module` depending on resolver path. Asserting a specific substring of a tool's error text makes the criterion brittle and not binary-testable in the strict sense.
**Fix:** relax to "테스트가 실패하고, 실패 원인이 `src/auth` 모듈 부재임이 출력에 나타난다", and record the verbatim output in `progress.md` §E.2 as the evidence (which `plan.md:130-132` already requires).

**AUTH-m1 — minor — `acceptance.md:131` uses a shell `for` loop whose output is five lines but whose per-line attribution is positional only.** Prefer `grep -c` per named symbol on separate lines so a failure names the missing export.

**AUTH-m2 — minor — `spec.md:60` declares `registerAuthRoutes(app, db)` while REQ-AUTH-003 also decorates `app.db`, giving two paths to the same connection.** `plan.md:62-67` records the hazard and its mitigation; no requirement does. Consider a REQ clause: "`buildServer` 는 `registerAuthRoutes(app, app.db)` 로 호출해 두 경로가 같은 객체를 가리키게 해야 한다."

**AUTH-m3 — minor — module augmentation is split across two files** (`FastifyRequest.user` in `auth.ts` per REQ-AUTH-002; `FastifyInstance.db` in `index.ts` per `plan.md:45-48`). This compiles only while `index.ts` is inside the tsconfig `include` set. No criterion type-checks the test directory specifically; the `npm run typecheck -w server` quality gate covers it incidentally. Worth a note in `plan.md` §E.

---

### SPEC-ROOM-001

**ROOM-B1 — blocking — `acceptance.md:162` (AC-ROOM-009) cannot detect a schema change, so REQ-ROOM-013's only verification is vacuous.**
AC-ROOM-009 runs `git diff --stat HEAD -- server/src/db.ts` and expects empty output. Per `plan.md:141` this check runs at M2 step 6 — *after* M1's commit at M1 step 6. `git diff HEAD -- <path>` compares the working tree to `HEAD`; once a mutation is committed, `HEAD` contains it and the output is empty. Demonstrated on this very tree, where `db.ts` was authored inside a commit `[CMD]`:

```
$ git diff --stat HEAD -- server/src/db.ts
[exit=0 — empty output]
$ git log --oneline -- server/src/db.ts
a97d36c feat: sqlite schema for users/rooms/bots/tokens/messages
```

Empty output despite the file having 72 lines of authored content. A run-phase agent that adds a column during M1 and commits it produces the same empty output at M2, and REQ-ROOM-013 — a `shall not` scope-boundary requirement — passes falsely.
**Fix:** pin the comparison to the SPEC's entry commit. Record `spec_base_sha` in `progress.md` §E.1 at plan close and change the command to `git diff --stat <spec_base_sha> -- server/src/db.ts`, or equivalently `git diff --stat "$(git merge-base HEAD origin/main)" -- server/src/db.ts`. Apply the same fix to AC-BOT-009 and, for uniformity, AC-AUTH-012.

**ROOM-M1 — major — no requirement mandates wiring the two modules into `buildServer`.**
REQ-ROOM-001 and REQ-ROOM-008 require the two exports; `spec.md:110` mentions in prose that "`server/src/index.ts` 는 라우트 등록 두 줄만 고친다" and `plan.md:126`/`plan.md:139` list it as a step. Nothing in the requirement layer requires it, and no criterion observes it — every ROOM test registers the routes itself. Same hole as AUTH-B3; downgraded to major here because ROOM's requirement layer never claimed the wiring in the first place.
**Fix:** add a requirement — "REQ-ROOM-014 (Ubiquitous): `buildServer` 는 `registerRoomRoutes(app)` 와 `registerBotRoutes(app)` 를 `registerAuthRoutes` 뒤에 등록해야 한다" — and cover it with the AC-AUTH-014 style `buildServer` smoke criterion. ROOM has room: 13→14 requirements, 10→11 criteria, both under 16.

**ROOM-M2 — major — the 403/404 incoherence (Gap 1). Fix at `spec.md:77` / `SPEC-BOT-001/spec.md:84` jointly.** Detail in Part 1.

**ROOM-M3 — major — `plan.md:99` §D-4's resolution is verified by nothing.**
§D-4 resolves that `POST /api/rooms` must return `archived_at` (value `null`) so the create and list shapes match. REQ-ROOM-003 (`spec.md:68`) requires only "상태 코드 `201` 과 `status` 가 `active` 인 방 객체", and AC-ROOM-001 asserts only `statusCode` and `status`. The resolution can silently regress. The §D record itself notes "원본 테스트는 `status` 만 보므로 깨지지 않는다" — which is precisely the problem.
**Fix:** amend REQ-ROOM-003 to name the five-key `Room` shape, and add to AC-ROOM-001's Then clause `expect(Object.keys(create.json()).sort()).toEqual(['archived_at','created_at','id','name','status'])`.

**ROOM-m1 — minor — `spec.md:15` carries `related_specs:`, which is not in the schema's Optional Fields table.**
`.claude/rules/moai/development/spec-frontmatter-schema.md:141-152` lists `issue_number`, `depends_on`, `lint.skip`, `bc_id`, `amendment_of`, `tier`. The canonical field for this purpose is `depends_on`. The other two SPECs omit the field entirely, so the three are inconsistent. Not a `FrontmatterInvalid` (the 12 required fields are all present and correctly named — verified `[CMD]`, `grep -cE "^(id|title|…|tags):"` → `12` for all three).
**Fix:** rename to `depends_on: [SPEC-CORE-001, SPEC-AUTH-001]` (drop the forward reference to SPEC-BOT-001, which is a dependent, not a dependency), or drop the field and rely on `spec.md` §7.

**ROOM-m2 — minor — `acceptance.md:77`'s `grep -c "db.transaction("` is a structural proxy with an unescaped metacharacter.** The `.` matches any character, so `dbXtransaction(` would also count. Use `grep -c 'db\.transaction('`. Also note the criterion proves a call exists, not that *both* UPDATEs are inside it — the behavioural half is correctly deferred to AC-BOT-008.

**ROOM-m3 — minor — `acceptance.md:191` claims a non-numeric room `id` yields `404` via `Number(...) → NaN → 0 rows`.** With `db.transaction()` wrapping the UPDATE (§C), `better-sqlite3` binds `NaN` as a REAL and the UPDATE matches nothing, so the claim holds — but it is a behaviour of the binding layer, not of the requirement. No criterion covers it. Acceptable as a documented edge case; consider adding the case to AC-ROOM-004.

**ROOM-m4 — minor — `plan.md:26` lists the `declare module 'fastify'` `db` declaration as consumed from SPEC-AUTH-001, but AUTH places it in `index.ts` while ROOM's route modules live elsewhere.** Works under a project-wide tsconfig `include`; brittle if the build is ever split. Worth a line in `plan.md` §E.

---

### SPEC-BOT-001

**BOT-B1 — blocking — `acceptance.md:65` (AC-BOT-003) cannot pass against the implementation its own `plan.md` prescribes.**
The criterion runs `grep -c "SELECT .*token[^_]" server/src/routes-bots.ts` and expects `0`. Every invite query reads `FROM bot_tokens`, and `bot_tokens` contains `token` followed by `s`, which matches `[^_]`. Run against the exact SQL that `SPEC-BOT-001/plan.md:103` prescribes `[CMD]`:

```
$ cat /tmp/sample.txt
const rows = req.server.db.prepare(`SELECT t.bot_id, b.name AS bot_name FROM bot_tokens t JOIN bots b ON b.id=t.bot_id WHERE t.room_id=? AND t.revoked_at IS NULL`)
$ grep -c "SELECT .*token[^_]" /tmp/sample.txt
1
```

Expected `0`, got `1`. The criterion fails whenever the `FROM bot_tokens` clause shares a line with `SELECT` — which the SPEC's own prescribed snippet does. Worse, it is not testing what it claims: it is testing source *line formatting*, not token exposure. An implementer would "fix" it by inserting a newline, which changes nothing about security.
**Fix:** delete the second grep and replace it with an assertion that actually bears on the claim — either a source check that no column named exactly `token` is selected (`grep -cE 'SELECT[^;]*\btoken\b[^_]' ` still has the same flaw; prefer the behavioural form) or, better, a runtime assertion: issue an invite, then `GET /api/rooms/:id/invites` and assert `expect(JSON.stringify(list)).not.toContain(body.token)` plus `expect(Object.keys(list[0]).sort()).toEqual(['bot_id','bot_name','online'])`. AC-BOT-011 already proves the stored value is a hash; that pair fully covers REQ-BOT-002.

**BOT-B2 — blocking — `acceptance.md:167` (AC-BOT-009) and `acceptance.md:243` (DoD) are both vacuous at their scheduled execution point.**
Same mechanism as ROOM-B1, and one worse case. `plan.md:185` runs the checks at M2 step 5, after M1's commit at M1 step 5. `git diff --stat HEAD -- server/src/db.ts` cannot see an M1-committed schema change (REQ-BOT-009 unverified), and the DoD's `git diff --name-only` cannot see M1's committed edit to `routes-bots.ts` — and, since `git diff` without `--cached` reports unstaged changes only, it reports nothing at all once M2's edits are staged. So the "exactly one source file modified" gate never observes anything.
**Fix:** as ROOM-B1 for `db.ts`; for the single-file claim use `git diff --name-only <spec_base_sha> -- server/src` and assert the output is exactly `server/src/routes-bots.ts`.

**BOT-M1 — major — `spec.md:39` asserts room ownership that the schema cannot express and no requirement implements.**
"로그인한 사람이 **자기가 만든** 활성 방에 등록된 봇을 초대해서". `rooms` has no owner column `[CMD]`:

```
$ sed -n '18,24p' server/src/db.ts
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);
```

`POST /api/rooms` (REQ-ROOM-003) records no creator, `req.user` is fixed at `{ id, username }` (REQ-AUTH-002), and per-room access control is YAGNI-excluded in all three SPECs. Any implementer taking the sentence literally needs a schema change, which REQ-BOT-009 forbids — the sentence and the constraint are in direct collision.
**Fix:** strike "자기가 만든" from `spec.md:39`. The system is single-tenant by design; the phrase promises a scoping rule that does not exist.

**BOT-M2 — major — `acceptance.md:7` misattributes the `build()` helper to SPEC-AUTH-001.** Detail in Part 1, Gap 3. AUTH's helper returns a bare `app`; the `{ app, cookie }` helper is created by SPEC-ROOM-001 in `rooms-bots.test.ts`.
**Fix:** rewrite as "아래 모든 시나리오의 `build()` 헬퍼는 `SPEC-ROOM-001` 이 `server/test/rooms-bots.test.ts` 에 만든 `{ app, cookie }` 헬퍼이며, 그 안에서 `SPEC-AUTH-001` 의 `registerAuthRoutes` / `requireAuth` 와 로그인 흐름을 쓴다." Mirror the correction in `plan.md:24`.

**BOT-M3 — major — no requirement states that the invite routes are registered inside `registerBotRoutes`.** Detail in Part 1, Gap 2. `plan.md:26` says it; `spec.md` does not, while REQ-BOT-008 simultaneously forbids touching `index.ts`.
**Fix:** amend REQ-BOT-001 (or add a Ubiquitous requirement) — "세 초대 라우트는 `SPEC-ROOM-001` 이 만든 `registerBotRoutes(app)` **안에서** 등록되어야 한다. 새 등록 함수를 만들거나 `index.ts` 를 고치지 않는다." This is what makes REQ-BOT-008's single-file clause satisfiable.

**BOT-M4 — major — the 403/404 incoherence (Gap 1).** Joint fix with ROOM-M2.

**BOT-m1 — minor — `acceptance.md:65`'s `|| echo 0` produces a doubled result.** `grep -c` prints `0` and exits `1` on no match, so the fallback appends a second `0`. The Then clause says "두 번째 grep 출력이 `0` 이다" — which output? Moot once BOT-B1 is fixed, but the pattern recurs; drop the `|| echo 0`.

**BOT-m2 — minor — `acceptance.md:64`'s first grep (`grep -c "token_hash"`) has no expected value in the Then clause.** It is executed and never observed, so it contributes nothing. Either state the expectation or delete the line.

**BOT-m3 — minor — `acceptance.md:219` accepts a concurrent double-issue race ("이론적으로 활성 토큰 2개") while REQ-BOT-003 states "처리 후 그 조합의 활성 토큰 수는 정확히 1이다" without qualification.** `plan.md:157` records the acceptance. Add "(단일 요청 처리 기준)" to REQ-BOT-003 so the requirement and the edge case do not read as contradictory.

---

## Part 3 — Cross-cutting checks

### Schema immutability against the eight existing tables `[CMD] + [READ]`

Read `server/src/db.ts` in full (72 lines): eight tables (`users`, `sessions`, `rooms`, `bots`, `bot_tokens`, `messages`, `message_targets`, `attachments`) and two indexes (`idx_messages_room`, `idx_targets_bot`).

Every requirement across the three SPECs was checked against the available columns:

| Requirement | Columns needed | Present? |
|---|---|---|
| REQ-AUTH-005/007 | `users(username, password_hash)`, UNIQUE on `username` | ✅ `db.ts:9-10` |
| REQ-AUTH-004 `<salt>:<key>` in one column | `password_hash TEXT` | ✅ |
| REQ-AUTH-008/010/011/012 | `sessions(token PK, user_id)` | ✅ `db.ts:13-17` |
| REQ-ROOM-002/003/005/006 | `rooms(id, name, status, created_at, archived_at)` | ✅ `db.ts:18-24` |
| REQ-ROOM-005 token revocation | `bot_tokens(room_id, revoked_at)` | ✅ `db.ts:33,38` |
| REQ-ROOM-009/010/011 | `bots(name UNIQUE, description DEFAULT '')` | ✅ `db.ts:25-30` |
| REQ-BOT-001/003/006/007 | `bot_tokens(room_id, bot_id, token_hash UNIQUE, revoked_at)` | ✅ `db.ts:31-40` |
| REQ-BOT-006 `online` always false | — (computed in the route, not stored) | ✅ no column needed |

**No requirement needs a column that does not exist.** One near-miss and one collision:
- REQ-BOT-002's "평문 토큰은 …다시 노출되어서는 안 된다" is satisfiable precisely because there is no plaintext column — the schema enforces it structurally.
- **BOT-M1** above is the one collision: `spec.md:39`'s ownership prose would need `rooms.created_by`. It is prose, not a requirement, which is why it is major rather than blocking — but it must be struck.
- TTL/expiry is correctly identified as needing a schema change and correctly excluded (`SPEC-BOT-001/spec.md:148`, `plan.md:46`).

### REQ → AC coverage and criterion verifiability `[CMD] + [READ]`

```
$ grep -c "^\*\*REQ-AUTH-" .../SPEC-AUTH-001/spec.md   → 15
$ grep -c "^\*\*REQ-ROOM-" .../SPEC-ROOM-001/spec.md   → 13
$ grep -c "^\*\*REQ-BOT-"  .../SPEC-BOT-001/spec.md    →  9
$ grep -c "^### AC-AUTH-"  .../SPEC-AUTH-001/acceptance.md → 13
$ grep -c "^### AC-ROOM-"  .../SPEC-ROOM-001/acceptance.md → 10
$ grep -c "^### AC-BOT-"   .../SPEC-BOT-001/acceptance.md  → 11
```

**Tier M budget (16/16, applied independently per `spec-workflow.md:149,152`): all six counts pass.** 15/13, 13/10, 9/11.

**Coverage: every requirement maps to at least one criterion in all three SPECs.** Traced individually from the AC matrices (`SPEC-AUTH-001/acceptance.md:13-25`, `SPEC-ROOM-001/acceptance.md:15-24`, `SPEC-BOT-001/acceptance.md:15-25`) — no gaps, no orphan criteria. AC-AUTH-013 / AC-ROOM-010 / AC-BOT-010 trace to "RED→GREEN 전이" rather than a REQ-ID, which is a process criterion rather than an orphan; acceptable.

**But coverage is not verification.** Three requirement halves are traced-but-unobserved:
- REQ-AUTH-003 `buildServer` half → **AUTH-B3**
- REQ-ROOM-013 / REQ-BOT-009 schema immutability → **ROOM-B1 / BOT-B2**
- REQ-ROOM-003's `archived_at` resolution → **ROOM-M3**
- REQ-BOT-002's exposure half → **BOT-B1**

**Criteria that cannot pass at their own SPEC's completion time:** exactly one class was checked and handled correctly. `SPEC-ROOM-001/acceptance.md:53-55` explicitly refuses to place the token-revocation observation in ROOM (no issuer exists yet), defers it to SPEC-BOT-001, and `plan.md:165` lists "통과할 수 없는 수용 기준 추가" as an anti-pattern. `SPEC-BOT-001/acceptance.md:133-158` (AC-BOT-008) picks it up, names REQ-ROOM-005 as the requirement it verifies, and directs a failure to `routes-rooms.ts` rather than `routes-bots.ts` (`plan.md:190`). **This deferral is correct, complete, and mutually cited on both sides — the best-handled item in the audit.** ROOM's `plan.md:156` even instructs the run agent to record "미검증" in `progress.md` §E.2 rather than overclaim. No other criterion depends on a later SPEC's code.

### §D contradiction records `[READ]`

Ten records across the three plans. Each resolution checked against the requirements and criteria in the same SPEC:

| Record | Resolution | Consistent with own SPEC? |
|---|---|---|
| AUTH §D-1 (`plan.md:88`) | env-vars win over `--token`/`--server` | ✅ deferred, see below |
| AUTH §D-2 (`plan.md:89`) | register returns `{ok:true}` without `id` | ✅ no AC reads an id |
| ROOM §D-1 (`plan.md:96`) | drop the dead `archivedId` assertion | ✅ `plan.md:123` step 1 restates it; source dead assertion confirmed at `plan-v2.md:670` |
| ROOM §D-2 (`plan.md:97`) | wrap both UPDATEs in `db.transaction()` | ✅ REQ-ROOM-005 + AC-ROOM-003 grep |
| ROOM §D-3 (`plan.md:98`) | `opts?` optional | ✅ REQ-ROOM-001 signature matches |
| ROOM §D-4 (`plan.md:99`) | create response includes `archived_at` | ⚠️ **ROOM-M3** — no REQ, no AC |
| ROOM §D-5 (`plan.md:100`) | widen auth check to all five routes | ✅ AC-ROOM-008 lists exactly five |
| ROOM §D-6 (`plan.md:101`) | split revocation verification across SPECs | ✅ AC-ROOM-003 + AC-BOT-008 |
| BOT §D-1 (`plan.md:84-108`) | map `online` to boolean in the route | ✅ REQ-BOT-006 + AC-BOT-006 `typeof` |
| BOT §D-2 (`plan.md:110-129`) | pass `config.port` | ✅ REQ-BOT-005 + AC-BOT-002 |
| BOT §D-4 (`plan.md:144-148`) | `sha256Hex` belongs to BOT | ✅ matches ROOM `spec.md:145` + `acceptance.md:218` |

**No two SPECs resolve the same contradiction in opposing directions.** The one contradiction that spans SPECs — the 403/404 asymmetry — is recorded identically in both (`SPEC-ROOM-001/plan.md:60`, `SPEC-BOT-001/plan.md:62`), same direction, same rationale, with the cross-SPEC coupling stated. `sha256Hex` ownership likewise reaches the same conclusion from both sides. AUTH §D-1 and BOT §D-3 are the *same* record carried in two places; both name the lead's deferral, both point at card `t4`, neither decides it.

**The deliberately-unresolved record is genuinely preserved.** `SPEC-BOT-001/plan.md:131-142` §D-3 is headed "[미해결 — 보존]", states the conflict (`spec-v2.md` 4-B execution arguments vs Global Constraints line 20 environment-variables-only), records the lead's interim ruling, explicitly declines to close it, and names card `t4` as the re-check point. `plan.md:212` reinforces it as an anti-pattern ("§D 3번은 미해결로 보존된 기록이다"). `SPEC-AUTH-001/plan.md:93-95` carries the same preservation instruction and notes that the consumption point moved to SPEC-BOT-001 while the record stays. **Confirmed preserved as unresolved, not silently decided. Not counted as a defect, per instruction.** The Global-Constraints-line-20 text is quoted accurately (verified against `plan-v2.md:20`).

### Frontmatter `[CMD] + [READ]`

```
$ grep -cE "^(id|title|version|status|created|updated|author|priority|phase|module|lifecycle|tags):" <each spec.md>
SPEC-AUTH-001/spec.md:12   SPEC-ROOM-001/spec.md:12   SPEC-BOT-001/spec.md:12
```

All 12 canonical fields present in all three, with canonical names — no rejected snake_case aliases (`created_at` / `updated_at` / `labels` / `spec_id` absent). Types check against `spec-frontmatter-schema.md:36-48`: `id` matches `^SPEC-[A-Z][A-Z0-9]+-[0-9]{3}$`; `version` quoted semver; `status: draft` is a valid enum member; dates ISO; `priority: P0` valid; `lifecycle: spec-anchored` valid; `tags` comma-separated string; `tier: M` is a valid optional field.

`phase: "v0.1.0 target"` in all three — a release target, **not** one of the prohibited lifecycle-stage values (`plan`/`run`/`sync`/`mx`, `spec-frontmatter-schema.md:52-58`). Correct.

One deviation: **ROOM-m1** (`related_specs` is not a schema-listed optional field).

### `[NEEDS CLARIFICATION]` gate `[CMD]`

```
$ grep -rn "NEEDS CLARIFICATION" .moai/specs/SPEC-AUTH-001/ .moai/specs/SPEC-ROOM-001/ .moai/specs/SPEC-BOT-001/
exit=1
```

No matches. Gate passes.

### Out of Scope sections `[CMD]`

```
$ grep -n "Out of Scope" <the three spec.md files> | wc -l   → 22
```

AUTH 8, ROOM 5, BOT 6 (plus 3 §5 headings). Each is an `### Out of Scope — <topic>` H3 with specific `-` bullets and, in ROOM and BOT, a named owning SPEC per entry. Complete and non-vague.

---

## Category scores

| Dimension | AUTH | ROOM | BOT | Evidence |
|---|---|---|---|---|
| Clarity | 0.75 | 0.85 | 0.70 | AUTH: `/api/me` undisclosed at the spec layer (AUTH-M2), REQ-AUTH-006 gap (AUTH-B2). BOT: ownership prose (BOT-M1), registrar unstated (BOT-M3). ROOM: unambiguous throughout. |
| Completeness | 0.85 | 0.80 | 0.85 | All sections present; frontmatter complete; Out of Scope substantive. Deducted for the missing `buildServer` requirement (AUTH-B3 / ROOM-M1). |
| Testability | 0.45 | 0.70 | 0.50 | AUTH: AC-AUTH-002 unpassable, AC-AUTH-005 overclaims, AC-AUTH-013 brittle. ROOM: AC-ROOM-009 vacuous. BOT: AC-BOT-003 unpassable, AC-BOT-009 + DoD vacuous. |
| Traceability | 0.80 | 0.80 | 0.80 | Full REQ→AC coverage in all three; deducted because four traced requirement-halves are not actually observed by the criterion that claims them. |
| Consistency | 0.55 | 0.65 | 0.60 | AUTH: REQ-AUTH-013 false vs `index.ts:5`; edge-case row contradicts REQ-AUTH-006. ROOM/BOT: 403/404 incoherence; BOT helper misattribution. |
| **Aggregate** | **0.62** | **0.74** | **0.66** | Threshold 0.80 |

**Overall: 0.67.** Below the Tier M threshold of 0.80 on every SPEC independently, and six blocking findings across the three.

---

## Verdicts

- **SPEC-AUTH-001 — FAIL** (0.62). Blocking: AUTH-B1 (REQ-AUTH-013 false against `server/src/index.ts:5`), AUTH-B2 (AC-AUTH-002 case 1 unpassable against REQ-AUTH-006), AUTH-B3 (`buildServer` wiring unverified; AC-AUTH-005 overclaims).
- **SPEC-ROOM-001 — FAIL** (0.74). Blocking: ROOM-B1 (schema-immutability check vacuous at its scheduled execution point). Closest to passing; fix ROOM-B1 and ROOM-M1/M3 and it clears the threshold.
- **SPEC-BOT-001 — FAIL** (0.66). Blocking: BOT-B1 (AC-BOT-003 grep cannot return 0 against the SPEC's own prescribed SQL — verified by command), BOT-B2 (scope-boundary and single-file checks both vacuous).
- **Overall — FAIL** (0.67).

## Fix route, in priority order

1. **BOT-B1** — replace AC-BOT-003's second grep with a runtime non-exposure assertion. *(verified broken by command; highest confidence)*
2. **ROOM-B1 / BOT-B2** — pin all `git diff` scope checks to a recorded `spec_base_sha`, in all three SPECs. *(one mechanical change, three files)*
3. **AUTH-B1** — rewrite REQ-AUTH-013 to scope its claim to this SPEC's own routes and add `/api/health` to AC-AUTH-011.
4. **AUTH-B2** — add the empty-string clause to REQ-AUTH-006.
5. **AUTH-B3 / ROOM-M1** — add a `buildServer` smoke criterion to SPEC-AUTH-001 and a `buildServer` registration requirement to SPEC-ROOM-001; correct AC-AUTH-005's Then clause.
6. **ROOM-M2 / BOT-M4** — decide the 403/404 contract jointly and update both SPECs in the same edit.
7. **BOT-M1, BOT-M2, BOT-M3, AUTH-M1, AUTH-M2, ROOM-M3** — documentation and requirement-layer corrections, each local to one file.
8. Minors as convenient.

Re-audit scope on iteration 2 is this enumerated defect delta plus a regression check over it — not a from-scratch re-read.
