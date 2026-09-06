# t41 — `moai gate` 종료 코드 합류: upstream 이슈 문안

- 나무: `.claude/worktrees/t41` · 브랜치 `WT-gate-exitcode` · base `20c7177` (= origin/main, t40 머지 후)
- 측정 시점: 2026-09-06 · 이 나무의 HEAD `20c7177` 에서 직접 실행
- 바이너리: `/Users/byunjungwon/.local/bin/moai` · `moai-adk 3.1.2` · Mach-O arm64 · 35,970,082바이트
- 환경: macOS 26.5.2 (Darwin 25.5.0) · zsh 5.9 · Claude Code 2.1.261 · `CLAUDE_PROJECT_DIR` 빈 값
- 증거 원본: `.moai/reports/t41/evidence/`
- 코드 변경: **0줄**

---

## 0. 머리 — 제출처와 제출 여부, 그리고 중복 경고

### 제출처: **확정되었습니다.**

리드는 「제출처를 모른다, 못 찾으면 못 찾았다고 적으라」고 했습니다. 찾았고, 근거는 셋입니다.

| 근거 | 관측 |
|---|---|
| 바이너리에 박힌 Go 모듈 경로 | `strings` 로 `modu-ai/moai-adk` 가 **6,508회**. 내부 패키지 경로가 그대로 남아 있습니다: `modu-ai/moai-adk/internal/cli`, `.../internal/settings`, `.../internal/worktree` 등 |
| 바이너리에 박힌 설치 안내 축자 | `go install github.com/modu-ai/moai-adk/cmd/moai@latest` — `grep -c` 로 **5회**(앞 공백을 무시하면 3가지 모양) |
| 저장소 실재 확인 | `gh repo view modu-ai/moai-adk` → `PUBLIC` · `isArchived: false` · **`hasIssuesEnabled: true`** |

**제출처 = `https://github.com/modu-ai/moai-adk`** · 이슈 양식 있음 (`.github/ISSUE_TEMPLATE/bug_report.md`, 라벨 `type:fix`, 영어·한국어·일본어·중국어 허용).

경합 후보 하나를 기각합니다: 바이너리 안에 `https://github.com/moai-adk/docs` 라는 문자열이 **1회** 있으나, 이는 템플릿 문서의 「MoAI-ADK Documentation」 링크이고 모듈 경로가 아닙니다. 코드가 자기 자신을 부르는 이름은 `modu-ai/moai-adk` 입니다.

### 제출 여부: **하지 않았습니다.**

카드의 [HARD] 금지대로 이슈를 올리지 않았습니다. 이 파일이 산출물이고, 제출은 운영자 소관입니다.

### ⚠️ 중복 경고 — 이게 이 카드의 가장 큰 발견입니다

**upstream 에 이미 열려 있는 이슈 셋이 이 문안과 겹칩니다.** 카드가 지시한 요청 둘 중 **하나는 그대로 중복**입니다.

| 이슈 | 상태 | 겹치는 자리 | 판정 |
|---|---|---|---|
| **#1639** — `moai gate: passing run prints 0 bytes; …` | OPEN (2026-08-24) | **카드의 요청 ② 와 같은 요청.** 본문이 `runStep` 의 `if err == nil { return true, "" }` 를 지목하고 「pass-side summary 를 내보내라」고 이미 제안 | **요청 ② 는 신규가 아님.** 재진술하지 않고 참조만 함 |
| **#1680** — `Heavy gate … nested modules get silently zero toolchain coverage` | OPEN (2026-08-27) | 「툴체인 미검출 → 통과」 경로를 소스 수준까지 규명(`tc == nil { return true, gfNotice }`). 그러나 **고치자는 것은 검출 범위**이지 종료 코드가 아님. 본문이 fail-open 을 「genuinely non-software trees 를 위한 의도된 설계」라 인정하고 넘어감 | **요청 ① 은 여전히 신규.** #1680 의 수리가 다 들어가도 「진짜로 돌 게 없는 트리」의 종료 코드 합류는 남음 |
| **#1631** — `moai gate silently skips lint entirely on non-eslint JS projects` | OPEN | t40 이 「규명 안 함」으로 남긴 lint 단계 부재의 원인 | 별건. 이 문안에서 참조만 함 |

**따라서 문안의 모양이 바뀝니다.** 새 이슈로 낼 값어치가 있는 축은 **요청 ① 하나**이고, 요청 ② 는 #1639 에 붙일 보강 자료입니다. 두 갈래 처분을 §5 에 올립니다 — **리드 소관이라 여기서 정하지 않습니다.**

**또 하나 주의**: #1680 의 재현 전사(2026-08-27, `v3.1.3-rc.5` 빌드)에는 게이트가 `quality gate steps (3 configured): …` 라는 **단계 요약을 찍고 있습니다.** 제 3.1.2 는 0바이트를 냅니다. 공개 릴리스는 v3.1.2 가 최신이라(`gh release list`) rc.5 는 main 빌드로 보이며, **요청 ② 는 main 에서 이미 고쳐졌을 수 있습니다.** 이것은 **미검증 추론**입니다 — rc.5 를 제 손으로 돌린 적이 없습니다.

---

## 1. 이 카드가 직접 실측한 것

t40 의 수를 옮겨 적지 않고, 같은 바이너리로 **A/B 대조를 새로 만들어** 잤습니다. 샌드박스는 세션 스크래치패드에 지었고 저장소를 건드리지 않습니다.

| 사례 | 트리 | 검사가 실제로 돌았나 | RC | stdout | stderr | 경과 |
|---|---|---|---|---|---|---|
| **A** | `package.json` (`test: touch RAN_TEST_MARKER`) + `.moai/config/sections` | **돌았음** — 표지 파일 생성됨 | **0** | **0바이트** | **0바이트** | 0.173초 |
| **B** | 언어 표지 없음 + `.moai/config/sections` | 돌 것이 없음 | **0** | **0바이트** | **0바이트** | 0.035초 |
| **C** | t40 원 사례 재현 (`cd .moai && moai gate`) | 돌 것이 없음 | **0** | **0바이트** | 416바이트 (설정 경고) | 0.030초 |

```
$ diff A.out B.out && echo "stdout: 동일"
stdout: 동일
$ diff A.err B.err && echo "stderr: 동일"
stderr: 동일
```

**A 와 B 는 종료 코드·stdout·stderr 세 채널 모두 바이트 단위로 같습니다.**

### 이 실측이 t40 의 두 자리를 고쳤습니다

**(가) 리드가 「재현된 적 없다」고 못 박은 자리를 닫았습니다.**
카드는 「`.moai/config/sections` 가 있는 디렉터리에서는 stderr 도 0바이트가 될 것으로 **추론**되지만 그 조건은 재현된 적이 없다」고 적었습니다. 사례 B 가 정확히 그 조건입니다 — 설정 디렉터리를 갖춘 트리에서 툴체인만 없게 만들었고, **stderr 는 실제로 0바이트였습니다.** 추론이 관측이 되었습니다.

**(나) t40 의 「유일한 판별자는 경과 시간」은 과대주장이었습니다.**
t40 은 81초 대 0.03초를 보고 시간을 판별자로 지목했습니다. 그러나 A 는 **0.173초**입니다 — 검사가 실제로 돌았는데도. B 와의 간격은 0.14초뿐입니다. 프로젝트의 검사가 빠르면 **시간조차 두 경우를 가르지 못합니다.** 판별자는 시간이 아니라, 이 실험이 일부러 심은 표지 파일 하나였습니다. 밖에서 게이트를 부르는 쪽에는 그런 표지가 없습니다.

### `--passWithNoTests` — 절반만 재현됐습니다

카드가 「후보로만 언급하라, 재현 전에는 주장하지 말라」고 한 자리입니다. 재현을 **시도했고, 절반만 섰습니다.**

**선 것**: 게이트는 `--passWithNoTests` 를 시험 스크립트 문자열 **뒤에 그대로 이어 붙입니다.** 실패 출력에 npm 이 축자로 되울려 줍니다:

```
> test
> echo GOT >> ARGLOG.txt; exit 3 --passWithNoTests
```

즉 이 깃발은 「시험 러너에게 주는 인자」가 아니라 **스크립트 명령줄의 마지막 낱말**로 들어갑니다. 스크립트의 마지막 명령이 러너가 아니면 엉뚱한 데로 갑니다 (위 사례에서는 `sh: line 0: exit: too many arguments`).

**서지 않은 것**: 이 깃발이 **시험 0건 워크스페이스를 조용한 초록으로 바꾸는지**는 재현하지 못했습니다. 그러려면 그 깃발을 실제로 구현한 러너(jest·vitest 등)가 깔린 트리가 필요한데, 이 샌드박스에는 없습니다. **따라서 「네 번째 조용한 초록」은 여전히 미검증이고, 문안에서 주장하지 않습니다.**

---

## 2. 경계 — 이 저장소는 이미 뭘 했고 뭘 못 하나

문안이 「minidiscord 는 이미 해결했다」로 읽히지 않게, 카드가 지시한 경계를 그대로 적습니다.

t40 이 고친 것은 **이 저장소가 게이트에 넘기는 검사 목록**입니다 (`server/package.json` 에 `pretest: tsc` 한 줄 — 이제 server 의 타입 검사가 `npm test` 를 타고 게이트 안으로 들어옵니다). **게이트 자체는 고치지 않았고, 고칠 수 없습니다** — `moai` 는 이 저장소 밖의 외부 바이너리이고 소스가 이 기계에 없습니다.

종료 코드를 「통과」와 「못 찾음」으로 가르는 일은 **upstream 에서만 됩니다.** 그래서 이 카드가 이슈 문안입니다.

---

## 3. 이슈 문안 (제출용, 영문)

> upstream 의 최근 이슈가 대부분 영어라 영문으로 씁니다. 양식은 `bug_report.md` 를 따르되, 결함 성격상 «Expected/Actual» 절을 실측 표로 대체했습니다.

---

**Title**

```
moai gate: exit 0 means both "all checks passed" and "no toolchain found" — the two are byte-identical on every observable channel (3.1.2)
```

**Labels**: `type:fix`

**Body**

````markdown
## Summary

`moai gate` returns exit code 0 for two outcomes that a caller must be able to tell apart:

1. every configured check ran and passed, and
2. no recognized language toolchain was found, so **nothing ran at all**.

This is not an inferred hazard — the command's own help text states the conflation
verbatim:

```
Exit code 0: gate passed (or no recognized language toolchain detected).
Exit code 1: gate failed; diagnostic output on stderr.
```

Because a passing gate also prints zero bytes, the two outcomes are identical on
**all three** observable channels: exit code, stdout, and stderr. A caller — the
pre-commit hook, CI, or a human reading a terminal — has nothing to branch on.

### Relationship to existing issues (please read before triaging as duplicate)

- **#1639** already reports that a passing gate prints 0 bytes and proposes carrying a
  pass-side summary out of `runStep`. **That request is not restated here.** This issue
  asks for something #1639 does not: a distinct *exit code* for the
  nothing-to-run outcome.
- **#1680** analyses the `tc == nil → return true, gfNotice` fail-open in depth, but its
  repair targets **detection scope** (nested module markers). It explicitly treats the
  fail-open itself as intended for genuinely non-software trees. Even with #1680's
  three-layer repair fully landed, a tree that genuinely has no toolchain still exits 0
  indistinguishably from a full green run. That residue is what this issue is about.
- **#1631** (lint silently skipped on non-eslint JS projects) is the same family and is
  referenced only for context.

## Reproduction

Measured on `moai-adk 3.1.2` (the current published release; prebuilt arm64 binary,
`~/.local/bin/moai`, 35,970,082 bytes), macOS 26.5.2 (Darwin 25.5.0), zsh 5.9,
`CLAUDE_PROJECT_DIR` unset so the project dir resolves to cwd.

Two sandboxes, each carrying a populated `.moai/config/sections/` so that no
configuration warning pollutes stderr:

```
A/                       B/
  .moai/config/sections/   .moai/config/sections/
  package.json             (no language marker at all)
```

`A/package.json` is `{"name":"p","private":true,"scripts":{"test":"touch RAN_TEST_MARKER"}}`.
The marker file is the discriminator: the gate's green path is silent, so absence of
output cannot by itself establish whether a step ran.

```
$ cd A && rm -f RAN_TEST_MARKER && moai gate > A.out 2> A.err ; echo RC=$?
RC=0
$ test -e RAN_TEST_MARKER && echo "test step DID run"
test step DID run
$ wc -c A.out A.err
       0 A.out
       0 A.err
# elapsed: 0.173s

$ cd ../B && moai gate > B.out 2> B.err ; echo RC=$?
RC=0
$ wc -c B.out B.err
       0 B.out
       0 B.err
# elapsed: 0.035s

$ diff A.out B.out && diff A.err B.err && echo "identical on both streams"
identical on both streams
```

**Elapsed time is not a usable discriminator either.** A previous report of this defect in
our project observed 81s (real run) vs 0.03s (nothing detected) and concluded that wall
time distinguishes them. The sandbox above falsifies that as a general rule: a project
whose checks are fast passes in 0.173s, which is 0.14s away from the do-nothing path. And
no caller of `moai gate` inspects elapsed time in any case.

## Impact

The gate is invoked by the git pre-commit hook to enforce quality at commit time. When a
project's markers are not where detection looks — see #1680 for one concrete family of
causes — every commit passes with zero coverage and no signal anywhere. The failure is
silent by construction: there is no output to notice, and the exit code is the same one a
fully green run produces.

Our own project hit this: a workspace whose type-check was not reachable from the gate's
single `npm test` step passed the gate while `npm run typecheck` exited 1. We repaired our
side (adding the missing `pretest` hook so the check is reachable), but that repair is
project-local — it changes *what we hand the gate*, not what the gate reports. The
conflation stays for every other project.

## Request

**A distinct exit code for "no recognized language toolchain detected"** — for example
exit 2, leaving 0 for "checks ran and passed" and 1 for "checks ran and failed". Callers
that today cannot branch would then be able to.

If a new exit code is judged too breaking for existing callers, the minimum viable
alternative is **one line on stdout** naming the outcome (e.g. `gate: no recognized
language toolchain detected — 0 checks ran`), so that at least a human and a log grep can
tell the two apart. Note that this minimum overlaps with #1639's pass-side-summary
request; the exit-code ask is the part that #1639 does not cover.

## Not claimed here

Stated explicitly so triage does not have to guess what was verified:

- **Whether current `main` already prints a step summary.** #1680's transcript (dated
  2026-08-27, `v3.1.3-rc.5`) shows a `quality gate steps (N configured):` block that our
  3.1.2 does not print. If that landed after 3.1.2, the stdout half of this report may
  already be addressed on `main` — but the **exit-code** conflation is still documented in
  `moai gate --help` and would remain. We did not build or run `main`; this is inference,
  not observation.
- **`--passWithNoTests` as a further silent-green source.** We confirmed the gate appends
  `--passWithNoTests` to the test script's command line verbatim (npm echoes
  `> echo GOT >> ARGLOG.txt; exit 3 --passWithNoTests`), i.e. it is concatenated onto the
  script string rather than passed to a runner. We did **not** reproduce whether this
  converts a zero-test workspace into a passing gate — that needs a runner implementing
  the flag, which our sandbox lacks. Reported as an observation, not a claim.
- **Behaviour on non-Node toolchains.** All measurements above are Node/npm. The help text
  quoted at the top is language-agnostic, but we measured one toolchain.

## Environment

- **OS**: macOS 26.5.2 (Darwin 25.5.0), arm64
- **MoAI-ADK Version**: 3.1.2 (prebuilt binary; latest published release as of filing)
- **Go Version**: n/a — prebuilt binary, not built locally
- **Claude Code Version**: 2.1.261
- **Shell**: zsh 5.9
````

---

## 4. 미검증 (Gaps)

이 보고서가 **관측하지 않은** 것들입니다.

- **`main` 브랜치의 현재 동작.** 소스를 받아 빌드하지 않았습니다. #1680 의 전사에 근거한 「rc.5 는 단계 요약을 찍는다」는 **남의 보고를 읽은 것**이지 제 관측이 아닙니다.
- **Node 이외의 툴체인.** A/B/C 전부 Node/npm 입니다. `--help` 문구는 언어 무관하지만, 잰 것은 한 툴체인입니다.
- **`--passWithNoTests` 가 시험 0건을 초록으로 바꾸는지.** §1 에 적은 대로 절반만 섰습니다.
- **전체 통과(81초) 재현.** 이 나무는 `origin/main` 에서 갓 떠서 `node_modules` 가 없습니다. 의존성을 설치하지 않았고(카드 범위 밖), 따라서 이 저장소의 **실제 81초 통과**는 이번에 다시 재지 않았습니다. §1 의 A 는 그 대역이 아니라 **별도의 최소 샌드박스**입니다 — 이 둘을 섞어 읽으면 안 됩니다.
- **`.moai/config/sections` 가 30개 yaml 을 담는다**는 것은 셌지만, 그 내용이 게이트 동작을 바꾸는지는 검사하지 않았습니다. B 사례에서 설정이 있어도 툴체인이 없으면 통과라는 것만 관측했습니다.

## 5. 잔여 위험 (Residual risk)

- **문안이 중복으로 닫힐 위험.** #1639·#1680 과 주제가 인접해서, 읽는 쪽이 「이미 있는 이야기」로 판단할 수 있습니다. 문안 머리에 두 이슈와의 경계를 먼저 적어 이 위험을 낮췄지만 없애지는 못합니다.
- **`main` 이 이미 고쳤을 위험.** 위 미검증 1번이 현실이면 문안의 stdout 관련 절반이 낡습니다. 제출 전에 `main` 을 한 번 받아 `moai gate --help` 와 통과 출력만 확인하면 이 위험은 사라집니다 — **제출 결정과 함께 리드/운영자가 정할 일**입니다.
- **버전 시점.** 3.1.2 는 공개 최신 릴리스지만 2026-08-21 판이고 오늘은 2026-09-06 입니다. 보름 사이의 main 변화는 모릅니다.

---

## 6. 리드 처분을 구하는 자리 (블로커 아님, 판단 요청)

카드가 「범위 질문은 리드에게」라 했으므로 결정하지 않고 올립니다.

**처분 1 — 문안을 어디로 낼 것인가.** §0 의 중복 경고 때문에 갈래가 둘입니다.
- (a) **새 이슈 하나**로 낸다 — 축을 종료 코드 하나로 좁히고, #1639·#1680 을 본문에서 명시적으로 구분. (지금 문안이 이 모양입니다)
- (b) **#1639 에 댓글**로 붙인다 — A/B 바이트 동일 실측과 「시간도 판별자가 아니다」 반증을 보강 자료로. 대신 종료 코드 요청이 남의 이슈 안에 묻힙니다.

**처분 2 — 제출 전에 `main` 을 받아 확인할 것인가.** §5 의 두 번째 위험을 없애는 유일한 방법입니다. 하려면 이 저장소 밖에 소스를 받아 빌드해야 하니 별도 카드감입니다.

**처분 3 — 제출 여부 자체.** 카드의 [HARD] 대로 올리지 않았습니다. 운영자 승인이 있어야 나갑니다.

---

## 7. 쓴 명령 (축자) — 위의 모든 수는 여기서 다시 나옵니다

숫자를 기억에서 옮겨 적지 않도록, 값이 아니라 **값을 내는 명령**을 남깁니다. 아래는 전부 `20c7177` 에서, 2026-09-06 에 직접 돌린 것입니다.

### 제출처 근거

```bash
B=/Users/byunjungwon/.local/bin/moai
strings -a "$B" | grep -cE 'modu-ai/moai-adk'                 # 모듈 경로 총 등장 수
strings -a "$B" | grep -cE 'go install .*modu-ai/moai-adk'    # 설치 안내 총 등장 수
strings -a "$B" | grep -cE 'moai-adk/docs'                    # 경합 후보 등장 수
wc -c < "$B"                                                  # 바이너리 크기
gh repo view modu-ai/moai-adk --json nameWithOwner,isArchived,hasIssuesEnabled,visibility
```

> **[기록] 초고의 계수 오류 1건.** 초고는 설치 안내를 「3자리」로 적었습니다. 그 값은 `sort -u`
> 를 거친 뒤의 줄 수였고, 원 등장 수는 5입니다(앞 공백만 다른 같은 문자열이 겹칩니다).
> `sort -u` 를 붙인 채 세면 「몇 가지 모양인가」를 재게 되지 「몇 번 나오는가」를 재지 않습니다.

### 중복 확인

```bash
gh issue list --repo modu-ai/moai-adk --state all --search "toolchain" --limit 15 --json number,title,state
gh issue list --repo modu-ai/moai-adk --state all --search "gate exit code" --limit 15 --json number,title,state
gh issue view 1639 --repo modu-ai/moai-adk --json number,title,state,createdAt,body
gh issue view 1680 --repo modu-ai/moai-adk --json number,title,state,createdAt,body
gh release list --repo modu-ai/moai-adk --limit 8     # 공개 최신이 v3.1.2 임을 확인
```

### `--help` 축자

```bash
moai gate --help          # → evidence/gate-help.txt
```

### A/B/C 실측

`$S` 는 세션 스크래치패드의 샌드박스 뿌리입니다 (저장소 밖).

```bash
# 사전 준비 — 두 트리 모두 .moai/config/sections 를 갖춰 설정 경고를 없앤다
mkdir -p "$S/pass/.moai/config/sections" "$S/notool/.moai/config/sections"
cp <프로젝트>/.moai/config/sections/*.yaml "$S/pass/.moai/config/sections/"
cp <프로젝트>/.moai/config/sections/*.yaml "$S/notool/.moai/config/sections/"
printf '%s\n' '{"name":"p","private":true,"scripts":{"test":"touch RAN_TEST_MARKER"}}' > "$S/pass/package.json"

# A — 검사가 실제로 돌고 통과
rm -f "$S/pass/RAN_TEST_MARKER"
cd "$S/pass" && time moai gate > A.out 2> A.err ; echo RC=$?
test -e "$S/pass/RAN_TEST_MARKER" && echo "시험 단계가 돌았다"    # ← 판별자

# B — 돌 것을 못 찾고 통과
cd "$S/notool" && time moai gate > B.out 2> B.err ; echo RC=$?

# 두 결과가 같은지
diff A.out B.out && diff A.err B.err && echo "두 스트림 모두 동일"

# C — t40 원 사례 재현
cd <프로젝트>/.moai && time moai gate > C.out 2> C.err ; echo RC=$?
```

증거 파일: `evidence/{A,B,C}.{out,err}` · `evidence/gate-help.txt`

### `--passWithNoTests` 가 스크립트 뒤에 이어 붙는 것

```bash
# 루트 test 스크립트를 일부러 실패시켜 npm 이 명령줄을 되울리게 한다
printf '%s\n' '{"name":"root","private":true,"workspaces":["pkg"],"scripts":{"test":"echo GOT >> ARGLOG.txt; exit 3"}}' > "$S/args/package.json"
cd "$S/args" && moai gate 2> args2.err ; echo RC=$?
```

증거 파일: `evidence/passwithnotests-append.err`

### t40 에서 인용한 값 — 출처 경로

이 보고서가 t40 의 수를 그대로 옮긴 자리는 **없습니다.** t40 을 참조한 자리는 「t40 이 무엇을 주장했는가」이고, 원본은 다음과 같습니다.

| 참조 | 원본 경로 |
|---|---|
| 81초 통과 / 0.029초 미검출 / 416바이트 stderr | `.moai/reports/t40/reproduction.md` §2 |
| 통과 시 0바이트 증거 파일 | `.moai/reports/t40/evidence/gate-baseline.{out,err}` (둘 다 0바이트) |
| 「유일한 판별자는 경과 시간」 주장 | `.moai/reports/t40/reproduction.md` §2 사례 ② — **이 보고서 §1 이 반증함** |
| `server/package.json` 의 `pretest` 수리 | `.moai/specs/SPEC-GATECHECKS-001/` |
