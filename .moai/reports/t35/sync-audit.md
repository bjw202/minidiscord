# 카드 t35 · SPEC-LIVEENV-001 — 동기화 단계 독립 감사

- 감사자: sync-auditor (독립·읽기 전용). 산출물·SPEC 4종은 **한 글자도 고치지 않았다**.
- 감사 일자: 2026-09-06
- 대상 트리: `.claude/worktrees/t35`, 가지 `WT-live-env`, HEAD `0a88b77` (`origin/main` `271815b` 병합 후)
- 범위: `git diff origin/main..HEAD` 62파일 + **미커밋 문서 둘**(`CHANGELOG.md`·`README.md`) + 증거 17종 + 드라이버 10종
- 판정: **FAIL** — 총점 **0.656** / 통과선 **0.80** (Tier M). 그리고 필수 통과 차원 하나가 독립적으로 떨어져 점수와 무관하게 FAIL 이다.

---

## 0. 쉬운 말 요약

이 카드는 손으로 하던 검증 환경을 스크립트로 옮겼고, 그 일을 아주 성실하게 했습니다. 토큰이 새지 않는지 제가 직접 훑어봤는데 깨끗했고, 시험 369건이 전부 통과하는 것도 제가 직접 돌려서 확인했습니다. 기준이 진짜로 판별력을 갖는지 확인하는 「변이」 실험 열 건도 실제로 서 있습니다.

그런데 기준 하나(`AC-LIVEENV-014`, 가짜 채널 예행)가 **실제로 실패했습니다.** sync 레인이 이미 그 점을 스스로 신고했고, 제가 따로 확인한 결과 그 신고는 옳습니다. 더 나아가 **언제 어떻게 빨개졌는지까지 커밋 이력에서 못 박았습니다** — M8(실 세션) 직전까지는 진짜로 통과였고, M8 이 봇 세션을 띄우는 순간 빨개졌습니다. 그러니 「나중 실행이 이 실패를 덮었을 것」이라는 가능성은 없습니다. 오히려 **덮인 쪽은 통과입니다.**

그리고 sync 레인이 찾지 못한 것을 하나 더 찾았습니다. **기준 하나(`AC-LIVEENV-008`)는 「통과」라고 적혀 있는데, 그 기준이 반드시 재라고 못 박은 측정이 증거 파일에 아예 없습니다.** 제가 그 측정을 대신 돌려 봤더니 결과 자체는 통과였습니다 — 즉 사실이 틀린 것은 아니고, **재지 않고 적은 것**입니다. 이 카드가 겨눈 결함 부류가 이 카드 안에서 한 번 더 나온 셈입니다.

사람 손이 줄었다고 오독될 문장은 문서 어디에도 없었습니다. 이 점은 아주 잘 지켜졌습니다.

---

## 1. 채점 근거를 어디서 읽었는가 (지시받지 않고 직접 찾았다)

| 무엇 | 어디서 읽었나 | 값 |
|---|---|---|
| 차원과 가중치 | `.moai/config/evaluator-profiles/default.md` § Evaluation Dimensions. SPEC 프런트매터에 `evaluator_profile` 이 **없으므로** `.moai/config/sections/harness.yaml:7` `default_profile: "default"` 로 해소했다 | Functionality 40 / Security 25 / Craft 20 / Consistency 15 |
| 집계식 | `.claude/rules/moai/core/agent-common-protocol.md` § Skeptical Evaluation Stance — "Score quality as the **harmonic mean** of dimensions, not the average". 코드로도 확인: `.claude/workflows/sync-audit-4dim.js:221` `DIMENSIONS.length / reciprocalSum` | **비가중 조화평균** |
| 통과선 | `.claude/rules/moai/workflow/spec-workflow.md` § SPEC Complexity Tier 표 — S `0.75` / M `0.80` / L `0.85`. SPEC 프런트매터 `tier: M` | **0.80** |
| 필수 통과 | `default.md` § Must-Pass Criteria — Functionality(모든 AC 충족) · Security(Critical/High 0). 하나라도 떨어지면 점수와 무관하게 FAIL | 방화벽 |

**통과선에 대한 정직한 단서.** 위 표의 열 이름은 글자 그대로 「**plan-auditor** PASS threshold」이고, **동기화 감사 전용 계층별 통과선은 SSOT 어디에도 따로 적혀 있지 않다.** `.claude/workflows/sync-audit-4dim.js:63` 은 호출자가 주지 않으면 `0.85` 를 쓴다. 그래서 이 판정을 **양쪽 모두에 대고** 냈다 — 총점 0.656 은 **0.80 에서도 0.85 에서도 FAIL** 이므로 이 모호성은 결론을 바꾸지 않는다.

또한 `.claude/rules/moai/core/audit-rubric-scope.md` §2 가 기록한 대로 「차원 목록이 헌법으로 동결」이라는 문장은 반증됐고, §3 이 기록한 대로 집계식은 감사관 파일이 아니라 공통 규약에 있다. 위 표는 그 정정을 반영해 읽은 결과다.

---

## 2. 차원 점수

| 차원 | 점수 | 판정 | 증거 (실행한 명령의 출력) |
|---|---|---|---|
| Functionality (40%) | **50**/100 | **FAIL (필수 통과 위반)** | `AC-014` 는 자기 예행이 기계로 `VERDICT=FAIL`·`# exit=1` 을 적었다. `AC-008` 은 못 박힌 측정이 증거 파일에 부재. 나머지 14 는 인용 파일과 일치 |
| Security (25%) | **75**/100 | PASS | 64자 hex 증분 0 (합성 항목 심어 침묵 아님을 배제) · 자격증명 패턴 7종 전부 0 (대조군 `MINIDISCORD_TOKEN` 38건) · 현재 토큰 접두 추적 파일 0건 (대조군 적중) · 토큰 파일 `0600`·미추적·무시됨 |
| Craft (20%) | **75**/100 | PASS | 게이트 직접 실행 `exit=0` · server 243 + channel 126 = 369 · `tsc --noEmit -p server` `exit=0` 출력 0줄 · `npm run typecheck -w channel` `exit=0` · 변이 10/10 · **커버리지는 측정 도구 부재로 미검증(Gap)** |
| Consistency (15%) | **70**/100 | PASS | 형제 SPEC diff 0줄 (대조군 4360줄) · `e2e.mts` 는 `export` 다섯만, `[n/15]` 표지 변경 0줄 · 배치 관행 일치 · 다만 개정 잔재 넷 |

**총점 = 비가중 조화평균 = 4 / (1/0.50 + 1/0.75 + 1/0.75 + 1/0.70) = 4 / 6.09524 = `0.656`**

**필수 통과 방화벽:** `default.md` § Must-Pass Criteria 는 Functionality 를 "All SPEC acceptance criteria must be met (**no partial credit**)" 로 못 박는다. `AC-LIVEENV-014` 가 충족되지 않았으므로 **Functionality 는 점수와 무관하게 필수 통과에서 떨어지고, 그것만으로 전체 판정이 FAIL** 이다. Security 는 Critical/High 0건이므로 방화벽을 통과한다.

---

## 3. 차단 발견 — 심각한 순서

### F1 [Critical · 차단] `AC-LIVEENV-014` 는 통과하지 않았다 — 그리고 언제 빨개졌는지까지 못 박았다

`.moai/specs/SPEC-LIVEENV-001/progress.md` §E.2 `AC-014` 행 · `acceptance.md:302-305` · `scripts/live-dryrun.mts:109,158-159`

**sync 레인의 신고는 옳다.** 독립 확인:

```
$ scripts/live-dryrun.mts:158-159 판정식
  const ok = missing.length === 0 && forbidden.length === 0
    && narrow === 0 && descendantClaude === 0 …
$ scripts/live-dryrun.mts:109
  const narrow = pgrepCount(['-f', 'dangerously-load-development-channels'])   ← -P 없음
$ evidence/dryrun/dryrun-report.txt
  pgrep_narrow_flag=1   (나머지 연언지는 전부 만족: expected_missing=0 forbidden_present=0
                         pgrep_descendant_claude=0 claude_during=claude_before=15 a01_status=UNMEASURED)
$ pgrep -f 'dangerously-load-development-channels'  →  64918   rc=0
$ pgrep -f 'ZZ-no-such-process-audit-t35'           →  (없음)  rc=1     ← 대조군
```

`ok` 의 다섯 연언지 가운데 **`narrow === 0` 하나만 거짓**이고, 그것이 `VERDICT=FAIL` 을 만든다.

**(a) 나중 실행이 덮었는가 — 아니다. 덮인 쪽은 통과다.** 커밋 이력을 전수로 폈다:

| 커밋 | `pgrep_narrow_flag` | `claude_before` | VERDICT |
|---|---|---|---|
| `84546a7` (M5~M7) | **0** | 14 | **PASS** (`# exit=0`) |
| `4f5bd69` (재측정) | **0** | 14 | **PASS** (`# exit=0`) |
| `120469d` (**M8**) | **1** | **15** | **FAIL** (`# exit=1`) |

두 값이 **함께** 0→1, 14→15 로 움직였고, 늘어난 그 하나가 M8 이 띄운 봇 세션이다 (`ps -o lstart=,command= -p 64918` → `--dangerously-load-development-channels`). **`AC-014` 는 M8 직전까지 진짜로 통과였고, M8 이 그것을 뒤집었다.** 그러므로 §E.2 의 「예행 `VERDICT=PASS`」는 거짓말이 아니라 **M8 이전 상태에서 옮겨진 이월값**이다 — 같은 커밋(`120469d`)이 증거 파일은 갱신하면서 그 파일을 인용하는 표 행은 갱신하지 않았다. `verification-claim-integrity.md` §2 가 이름댄 carry-over 다.

**뿌리는 스크립트가 아니라 기준 본문에 있다.** `acceptance.md:302-305` 는 제목에서 「판별자는 「이 예행이 띄운 것」이지 「기계의 모든 claude」가 아니다」라고 적어 놓고, 바로 아래 측정 블록에서 **여전히** `pgrep -f 'dangerously-load-development-channels' | wc -l # → 0` 을 「아래 셋이 **모두** `0`」의 첫째로 요구한다. 처분 14 는 **넓은** 판별자(`pgrep -x claude`)만 증분으로 옮겼고 **좁은** 판별자는 절대 0 요구로 남겼다. 스크립트는 기준이 적은 대로 충실히 구현했을 뿐이다.

**요구되는 수리** — sync 레인의 후보 ㉡ 이 옳다. `acceptance.md` `AC-014 ㉢` 의 좁은 판별자를 나머지 셋과 같은 **자손·증분** 형태로 옮기고(`pgrep -P "$DRYRUN_PID" -f 'dangerously-load-development-channels'`, 또는 before/after 증분 대조), `scripts/live-dryrun.mts:109` 를 그에 맞추고, 예행을 다시 돌린다. 후보 ㉢(프로세스를 죽인다)에 대한 sync 레인의 반대에 **동의한다** — F-13 선례에 어긋나고 판별자의 형태 결함을 증상으로 가린다. 후보 ㉠(15/1 로 적고 닫는다)은 사실에는 맞으나, **판정선이 원리적으로 도달 불가능한 채로 남는다**는 점을 기록에 함께 남겨야 정직하다.

`acceptance.md` 는 plan 단계 소유이므로 이 수리는 plan 단계 커밋이 진다.

---

### F2 [High · 차단] `AC-LIVEENV-008` 은 **재지 않고** 통과라고 적혔다 — sync 레인이 찾지 못한 둘째 자리

`progress.md` §E.2 `AC-008` 행 · `acceptance.md:203-213` · `evidence/E08-ambient-sweep.txt`

이것이 「§E.2 의 다른 행 가운데 인용 파일과 어긋나는 것이 있는가」에 대한 답이다. **있다.**

`acceptance.md:203` 은 [HARD] 로 못 박는다 — 「무편집의 판별자는 파일의 **수정 시각이 아니라** `minidiscord-channel` **항목의 내용**이다」. 그리고 `:205-213` 의 측정 블록이 `evidence/E08-ambient-sweep.txt` 를 그 대조가 실릴 자리로 지목하며 `diff … ; echo "entry-unchanged exit=$?" # → exit=0` 을 요구한다.

**E08 에 그 측정이 없다:**

```
$ grep -c "entry-unchanged" evidence/E08-ambient-sweep.txt      →  0   (rc=1)
$ grep -rl "entry-unchanged" evidence/                          →  evidence/M01-mutation.txt   ← 대조군: grep 은 작동한다
```

E08 이 대신 담고 있는 것은 **폐기된 v0.3.0 판별자**뿐이다 — `# ~/.claude.json 수정 시각 (실행 전): 1788630392` · `(실행 후): 1788630396` 와, 그 아래 「**두 값이 같으면** 이 카드가 그 파일을 편집하지 않았다는 뜻이다」라는 주석. **그 두 값은 같지 않다.** 즉 증거 파일은 (i) 요구된 판별자를 담지 않고 (ii) 담고 있는 판별자로는 자기 주석의 기준에 걸린다. 그런데 §E.2 는 그 파일을 인용하며 「전역 **항목 내용 불변**」이라고 적는다.

**M01 변이 ⑧ 이 이 구멍을 메우지 못한다.** 그 절의 「복원 후 초록」은 `entry-unchanged exit=0` 이지만 그것은 **원본 대 원본**을 한 시점에 비교한 것이라 항상 참이다 — 「훑기 실행 전후로 항목이 안 바뀌었다」를 세우지 않는다.

**감사자가 그 측정을 대신 수행했다** (읽기 전용, 원본 무편집):

```
$ ENTRY > before ; scripts/live-env.sh token-sweep --ambient ; ENTRY > after
  site=global_claude_json … hits=0    site=project_mcp_json … hits=0
  site=bot_mcp_json … hits=0          site=settings_env … hits=0
  site=shell_rc … hits=0              site=tracked_repo_files … hits=36
  sweep exit=0
$ diff before after ; echo "entry-unchanged exit=$?"      →  entry-unchanged exit=0     ← 통과
$ stat -f %m ~/.claude.json  before=1788696287 after=1788696287                          (참고값)
$ 대조군: after 사본의 t32→t99 한 자리를 바꿔 같은 diff   →  entry-unchanged exit=1     ← 상수 함수 아님
```

**그러므로 `AC-008` 의 실질은 참이다** — 항목에 토큰이 없고(`env` 는 `MINIDISCORD_SERVER` 하나), 훑기가 그 파일을 편집하지 않는다. **결함은 사실이 아니라 귀속이다:** run 단계가 재지 않은 것을 「통과」로 적었고, 그 진술이 §E.3 의 「통과 16 / 실패 0 / 미관측 0」에 그대로 흘러들었다. `verification-claim-integrity.md` §1.1 표면 2(관리자 에이전트 완료 보고)의 위반이다.

**요구되는 수리** `E08` 에 위 대조를 실제로 실행해 덧붙이고(요구된 형태 그대로), 그 파일에 남은 「두 값이 같으면 …」 주석을 폐기 판별자로 표시한다. 판정 자체는 뒤집히지 않는다.

---

### F3 [Medium · 차단] D-1 의 낡은 자리는 둘이 아니라 **셋**이다

sync 레인의 분류를 **확인하되 목록은 반증한다.** 값(「넷」)으로 훑었다:

```
$ grep -nE '(셋이 아니라 넷|넷이다|넷에서|넷이 되|사람 손이 (셋|넷)|넷으로 출발)' spec.md plan.md acceptance.md
```

| 자리 | 문장 | 분류 | sync 레인 |
|---|---|---|---|
| `spec.md:130` | 「셋이 아니라 **넷**이다」 | **낡음** — 현재형 단언, 상한 개방 없음 | 낡음 ✅ 일치 |
| `plan.md:239` | 「**실측된 자리는 넷이다**(F-12)」 | **낡음** — 같은 형태 | 낡음 ✅ 일치 |
| `plan.md:180` | 「사람 손은 셋이 아니라 넷이다」 + 「셋이라고 적었지만 **넷이다.**」 | **낡음** — `:239` 와 정확히 같은 형태. 현재형 단언 2회, 시점 귀속 없음, 상한 개방 없음 | **분류 안 됨 — 이것이 셋째다** |
| `plan.md:68` | 「셋이 아니라 넷**에서 출발한다** … 넷보다 늘었다면 늘어난 것도 적는다」 | 낡지 않음 — 출발점 + 상한 개방 | 낡지 않음 ✅ 일치 |
| `acceptance.md:395` | 「넷**으로 출발한다** … 그 밖의 사람 손이 남았다면 그것도 적는다」 | 낡지 않음 — 같은 형태 | 낡지 않음 ✅ 일치 |
| `plan.md:21` | 「사람 손이 셋이 아니라 넷**이 되어** … 네 자리가 함께 **움직였다**」 | 낡지 않음 — B-7 발견의 결과를 적은 과거형 서술 | 물음 → **낡지 않음** |
| `plan.md:224` | 「**넷에서 출발한다**(§D-5)」 | 낡지 않음 — `:68` 과 같은 형태 | 열거 안 됨 |
| `spec.md:159` · `spec.md:224` · `progress.md:16` | 「F-12 가 드러낸 **넷째** 사람 손」 / 「카드가 셋이라 적은 …」 | 낡지 않음 — 서수 귀속 또는 카드 문언에 대한 서술 | 열거 안 됨 |

**물음에 대한 답:** `plan.md:21` 은 낡은 쪽이 **아니고**, `plan.md:180` 은 낡은 쪽이 **맞다**. 다만 `:21` 은 낡지 않은 넷 가운데 가장 약하다 — 상한 개방 문구도 명시적 시점 귀속도 없이 과거형 어미 하나에만 기댄다.

이 발견 자체가 `.moai/reports/t34` 계열이 반복해 기록한 부류다 — **표본을 읽어 목록의 크기를 세우면 안 된다.** sync 레인은 두 자리를 읽어 찾았고, 값으로 훑으니 셋이었다.

---

## 4. 비차단 발견

### F4 [Medium · 비차단] §E.4 가 둘째 대화 기록을 변이 ⑤ 에 잘못 귀속시킨다

`progress.md` §E.4 「관측으로만 적는 것」은 「**변이 ⑤ 가 둘째를 만들었다**」고 적는다. 산출물이 반증한다:

```
$ ls ~/.claude/projects/…-t35-bot-01/
  19c548af-….jsonl  (mtime 20:11)      3dabf75d-….jsonl  (mtime 20:05)
$ grep -c '7Kq3ZmR8' 19c548af-….jsonl  →  2       ← 복원 표지 (DB 4번 행)
$ grep -c 'q7Rm2XbK' 19c548af-….jsonl  →  0
$ (구조 파싱) 19c548af: sessionId 단일값 · channel tool_use 1건 · 결과 짝 1건
```

둘째 파일은 **복원 회차**(세 번째 기동)의 것이지 변이 회차의 것이 아니다. 오히려 `M01-mutation.txt` 변이 ⑤ 의 「이 세션은 대화 기록 파일을 «한 개도» 남기지 않았다」가 옳고, §E.4 의 귀속 문장이 그것과 직접 모순된다.

**판정에 영향 없음** — §E.4 의 실제 결론(후보가 둘이라 오늘 추출기를 걸면 `exit=2`, `E09` 는 후보가 하나이던 시점에 귀속)은 그대로 선다. 다만 귀속 규율을 중심 주장으로 삼는 카드에서 한 문장이 귀속을 틀렸다.

### F5 [Medium · 비차단] 형제 울타리 측정 ②의 초록이 이 카드 때문에 **약해졌다**

`AC-LIVEENV-016` 은 형제 `AC-E2E-016` 다섯 측정을 그대로 재실행한다. 제가 전부 재실행했고 sync 레인의 값과 **정확히 일치**한다:

```
①   exit=1        ①-b  7 (상한 7 이하 — 초과 아님, 정당)      ①-c  README.md:0 · live-env.sh:0 · e2e.mts:0 · live-extract.mts:0 · live-dryrun.mts:0
②   exit=1        ③   해당 없음 (grep -c '수동 체크리스트' README.md → 0)
```

그러나 측정 ②의 패턴은 `anthropic|claude\.ai|api\.anthropic|spawn\(['\"]claude` 이고, 이 카드는 `scripts/` 에 **claude 를 띄우는 파일**을 새로 놓았다:

```
$ grep -nE '(^|[^a-z])claude([^a-z]|$)' scripts/live-env.sh
  538:  claude --dangerously-load-development-channels …
  559:  exec claude --dangerously-load-development-channels …
$ grep -rEn "spawn\(['\"]claude" scripts/         →  exit=1   (안 잡힌다)
$ grep -rEn "spawn\(['\"]claude" <합성 probe>     →  exit=0   ← 대조군: 패턴은 작동한다
```

즉 **패턴이 고장난 것이 아니라, 이 카드가 쓴 셸 `exec claude` 형태를 볼 수 없다.** 측정 ②의 의도(「유료 API 무호출」)를 겨누면 `scripts/` 는 이제 그 의도를 어기는 파일을 담고 있고, 글자만 만족한다. `AC-014` 본문이 이미 「`exec claude …` 형태는 실재한다」고 적어 놓고도 그 사실을 측정 ②의 맹점과 잇지 않았다.

**이 카드가 고칠 수 없다** — `AC-016` 자신의 [HARD] 가 형제 SPEC 편집을 금한다. **별도 카드의 처분 사항**으로 올린다. 기만은 아니다: `bot` 이 실 세션을 띄우는 것은 카드의 목적이고 문서에 공시돼 있다.

### F6 [Low · 비차단] `M01-mutation.txt` 변이 ⑤ 의 「복원 확인 (바이트 대조)」 절이 **비어 있다**

```
94: ### 복원 확인 (바이트 대조)
95: []                                   ← 빈 줄 하나
96: ## 변이 ⑥ — …
```

제목이 약속한 대조가 없다. 파일 끝의 잔존 확인 절은 `scripts/live-env.sh`·`live-extract-lib.ts`·`spec.md` 셋만 담고, 변이 ⑤ 의 대상인 `bot-01/.mcp.json` 은 목록에 없다. §E.2 변이 행의 「잔존 확인은 해시 대조로 전부 동일」은 그 세 파일에 대해서만 참이다.

감사자 확인: `bot-01/.mcp.json` 은 현재 존재하고 토큰을 담지 않으며(`grep -cE '[0-9a-f]{64}|MINIDISCORD_TOKEN'` → 0, 대조군 `MINIDISCORD_SERVER` → 1) 이 트리의 `channel/dist/index.js` 를 가리킨다. **실질은 복원돼 있다** — 빠진 것은 그것을 보이는 줄이다.

### F7 [Low · 비차단] `README.md` 는 넷째 사람 손은 적고 **다섯째는 적지 않는다**

새 절은 「이 항목은 첫 사용에 사람 승인(`⏸ Pending approval`)을 요구하므로 **첫 기동은 무인으로 붙지 않습니다**」로 넷째를 정확히 적는다. 그러나 **다섯째(`--dangerously-load-development-channels` 확인 창)는 없다:**

```
$ grep -nE 'dangerously|확인 창|매 기동|다섯' README.md   →  127행 하나뿐 (t35 절 밖의 기존 블록)
$ grep -c 'Pending approval' README.md                     →  1        ← 대조군: 넷째는 적혀 있다
```

`bot` 을 문서대로 따라 하는 독자는 **매 기동마다** 그 창을 만나는데 README 는 말해 주지 않는다. 이 카드의 표제 발견(F-15)이 정작 그 명령을 설명하는 사용자 표면에서만 빠졌다. **CHANGELOG 에는 온전히 실려 있다.**

### F8 [Low · 비차단] 폐기된 토큰의 앞 8글자가 증거 파일 둘에 남는다

```
$ cut -c1-8 data/live-env/token                →  c6367bd1        (현재 토큰)
$ git grep -lI 'c6367bd1'                      →  (없음) rc=1     ← 현재 토큰은 어디에도 없다
$ git grep -lI 'd0fa37c6'                      →  E05-token-file.txt · E06-bot-launch.txt
$ git grep -lI 'live-dryrun'                   →  8파일 rc=0      ← 대조군: grep 은 작동한다
```

`d0fa37c6` 는 **이미 교체된** 토큰의 접두이고, 8글자 노출은 설계상 양성 대조군으로 의도된 것이다(`AC-005 ㉣` 이 그 대조를 요구한다). 그래도 256비트 가운데 32비트이며 로컬 개발 전용 토큰이다. **조치 불요, 기록만.**

---

## 5. 렌즈별 결론

### 5.1 보안 — 이 카드에서 가장 큰 표면이었고, 깨끗하다

**커밋된 트리 전체**를 대상으로 재고, 모든 부재 주장에 대조군을 붙였다.

| 검사 | 명령 | 관측 |
|---|---|---|
| 64자 hex 증분 (PR 프레임) | `git grep -lIE '[0-9a-f]{64}' origin/main` vs `HEAD` (`:!package-lock.json`) 후 `comm` | **새 적중 0 · 사라진 적중 0** (base 36 = head 36) |
| 위의 대조군 | 합성 64자 hex 한 줄을 심어 스테이징 후 같은 `comm -13` | `AUD-SYNTH-PROBE.txt` 를 **정확히 내놓았다** → 침묵이 아니다. 되돌림 확인 `git status \| grep -c` → 0 |
| 자격증명 패턴 7종 | `sk-…` `ghp_…` `AKIA…` `BEGIN … PRIVATE KEY` `eyJ….` `Authorization: Bearer` `xox[baprs]-` 를 PR diff 전문에 | **전부 0** |
| 위의 대조군 | 같은 diff 에 `MINIDISCORD_TOKEN` | **38건** → 루프가 작동한다 |
| 현재 토큰 접두 | `git grep -lI c6367bd1` | **0건** (대조군 적중 확인) |
| 토큰 파일 | `ls -l` · `git ls-files data/` | `-rw-------` (0600) · 추적 **0** |
| `bot-01/` | `git ls-files bot-01` · `.mcp.json` 판독 | 추적 **0** · 토큰 **없음**(대조군 `MINIDISCORD_SERVER` 1) |
| 쿠키·세션 물질 | `grep -cEi 'set-cookie\|connect\.sid\|session=\|sid='` | 6건 — **전부 셸/스크립트의 변수 참조**, 리터럴 값 0 |
| UUID | diff 전수 | 합성 둘(`1111…`·`9999…`) + 실 Claude 세션 UUID 하나 — 자격증명이 아닌 로컬 경로 식별자 |
| 스크립트 위생 | `scripts/live-env.sh` 판독 + `bash -n` | `set -u` · `set -o pipefail` · `eval` 0 · 토큰은 argv 아닌 env 로 · 표준출력 8글자 마스킹 · `bash -n exit=0` |

**공시되고 닫히지 않은 통로 하나:** 같은 사용자의 `ps eww`. README·CHANGELOG·`spec.md` §5 세 자리에 **닫지 않았다고** 명시돼 있다. 이것이 Security 를 1.00 이 아닌 0.75(「Critical/High 없음, Medium 은 완화책과 함께 문서화」)에 놓는 이유다.

절대 경로 노출 39건은 `origin/main` 에서 이미 569파일이 갖는 저장소 관행이므로 이 카드의 신규 노출이 아니다.

### 5.2 일관성 — 개정이 남긴 잔재 넷

**관행 준수는 좋다.** `live-extract-lib.ts` 는 `server/test/` 의 기존 비시험 헬퍼들(`gateway-v2.ts`·`no-listen.ts`·`probe-db.ts`·`wsupgrade-judgment.ts`) 옆에 놓였고 배치 근거(rootDir)가 그 형제들로 뒷받침된다. `@MX` 부재는 이탈이 아니다 — 기준선을 재 보니 `server/test` 는 24파일 중 1, `scripts/` 는 4파일 중 1만 쓴다(대조군: `server/src` 는 10파일). **지역 관행과 일치한다.** `e2e.mts` 변경은 `export` 다섯 낱말뿐이고 `[n/15]` 표지 변경 0줄이다.

**「절대값 → 증분」 개정이 판정 줄을 비운 자리가 있는가 — 물음의 답: 넷 중 둘이 다치고 그중 하나는 완전히 비었다.**

| 개정 대상 | 새 판정 줄 | 증거에 실렸나 |
|---|---|---|
| `AC-006 ㉢` | 이력 증분 0 (19 → 19) | ✅ `E06` |
| `AC-011 ㉡` | 추적 파일 증분 0 (`comm -13` 0줄) | ✅ `E11` (+ 반대 방향 변이 ⑨) |
| **`AC-008`** | `entry-unchanged exit=0` | ❌ **부재** — E08 은 폐기된 시각 판별자만 담는다 → **F2** |
| **`AC-014 ㉢`** | 셋 중 좁은 판별자가 **절대 0 요구로 남음** | ⚠️ 실렸으나 **이동을 못 받아 도달 불가** → **F1** |

여기에 D-1 낡은 자리 셋(F3)과 §E.4 오귀속(F4)을 더해 0.70 으로 놓았다. 전부 문서 정합성이고 구조적 위반은 없다.

### 5.3 문서 — 「사람 손을 줄였다」로 읽히는 문장은 **없다**

어간으로 훑었다:

```
$ grep -nE '줄이|줄였|줄었|줄인|줄어|감소|단축|덜 |자동화|손이 적|없어도 된|생략' README.md CHANGELOG.md
```

t35 절 안의 적중은 **전부 부정형**이다 — 「남은 사람 손은 **줄지 않았습니다** — 한 자리가 더 늘었습니다」, 「이 카드는 사람 손을 **줄이지 못했고, 줄였다고 적지 않습니다**」. 나머지 적중은 다른 카드의 기존 항목이다. CHANGELOG 의 제목 자체가 「사람 손이 **다섯 자리라는 것을 찾았습니다**」로, 찾은 것이지 없앤 것이 아님을 앞세운다.

README 의 「사람이 기억하지 않아도 되게 하는 것이 목적이에요」는 **기억 부담**에 대한 목적 진술이고 사람 손 개수를 말하지 않는다. 이 문장이 「사람 손이 줄었다」로 읽힌다고 보지 않는다.

**§5 배제와 F-13·F-14·F-15 의 처지도 옳게 적혔다.** `progress.md` §E.4 「이 카드가 하지 않은 것」이 다섯 배제를 전건 열거하고, 「F-13·F-14·F-15 는 **관측 기록이지 해결 기록이 아니다**」를 명시한다. CHANGELOG 도 「셋 다 관측 기록이지 해결 기록이 아닙니다」로 같은 말을 한다. 수용 기준 합계를 **일부러 싣지 않은** 처분은 이 감사가 보기에 옳다 — 다투어지는 값을 확정값으로 옮기지 않았다.

남는 것은 README 의 다섯째 누락(F7) 하나다.

### 5.4 깊이 — M8 이 유일 공급원인 셋을 **직접 다시 유도했다**

「파일이 있다」로 판정하지 않고, 살아남은 산출물에서 다시 세웠다.

**`AC-009` (귀속) — 선다.**
```
㉠ 전역 항목 args[0] = …/worktrees/t32/channel/dist/index.js   os.path.exists → False
   대조군: 존재하는 경로에 test -e → exit=0                    ← 판별자가 상수 함수 아님
㉡ 3dabf75d….jsonl 구조 파싱:
   sessionId 집합 = {3dabf75d-cd20-4371-85cc-503ee2531af9}      ← 단일값
   cwd 집합       = {…/worktrees/t35/bot-01}                    ← 단일값
   채널 tool_use = 1 · 결과와 짝 지어진 것 = 1
   그 호출 id = toolu_01U3h1ALKwJG2adbsERsf2yZ                  ← E09 발췌와 축자 일치
   input = {'text': '무작위 영숫자 8자리입니다: q7Rm2XbK'}
```
E09 의 「호출 1 · 짝 1」은 **정확하다.** (원시 문자열 `grep -c` 는 7 을 내지만 그것은 도구 정의 등을 포함한 값이고, 구조 파싱이 옳은 척도다.) 관측 시각 `11:04:39Z` = KST 20:04:39 이고 그때 후보는 하나였다 — 둘째 파일은 20:11 에 생겼다. **「후보가 하나이던 시점」 귀속이 시각으로 확인된다.**

**`AC-010` 대화 기록 표면 — 선다.** `reply` 호출 인자의 `q7Rm2XbK` 와 DB 2번 행의 `q7Rm2XbK` 가 두 면에서 각각 읽힌다(DB 대조군: 없는 표지 조회 → 0행).

**변이 ⑤ — 기계로 확인 가능한 부분은 선다.**
```
$ sqlite3 … "select id,author_type,substr(body,1,80) from messages order by id"
  1|user|@TO(pm) 무작위 영숫자 8자리를 지어내 답 끝에 붙여줘
  2|bot |무작위 영숫자 8자리입니다: q7Rm2XbK
  3|user|@TO(pm) 변이 확인용 — …                    ← 변이 중 답을 못 받은 그 메시지
  4|bot |변이 확인 요청 받았어요 … 7Kq3ZmR8         ← 복원 뒤 그 메시지가 받은 답
```
네 행이 서술과 **정확히 일치**하고, 「새 메시지가 아니라 **같은 메시지**가 처리됐다」는 인과 좁히기가 행 번호로 선다. 둘째 jsonl 이 `7Kq3ZmR8` 을 담는 것이 복원 회차의 존재를 독립적으로 뒷받침한다.

**다만 이 부분은 확인할 수 없다 (§6 에 다시 적는다):** 「승인 창이 떴다 / 뜨지 않았다 / 다시 떴다」는 **운영자 눈 관측**이고 디스크에 산출물이 없다. 변이 ⑤ 의 인과 사슬 가운데 그 고리는 제가 재현하지도 반증하지도 못한다.

### 5.5 흔들린 게이트 — 「부하성」 분류를 시험했고, **뒷받침된다**

```
$ git diff --name-only origin/main..HEAD -- channel server/src | wc -l   →  0
$ (대조군)                                  -- server/test | wc -l       →  4
```

**이 카드는 `channel/` 과 `server/src` 를 한 줄도 건드리지 않았다.** 실패한 시험(`channel/test/transport-auth.test.ts`)의 코드 경로는 이 카드의 변경 집합과 교집합이 없다. 더해서 실패 모양이 단언 불일치가 아니라 `Error: waitFor timeout` 이고, 그 파일이 그 회차에 **67,794ms** 를 썼다(30개 시험). 그리고 제가 방금 돌린 실행을 포함해 **초록 4회 · 빨강 1회**다.

**분류 「부하성 흔들림」을 지지한다.** 다만 정확히 말하면 제가 세운 것은 「이 카드가 원인일 수 없다」이지 「원인이 부하다」가 아니다 — 후자는 재현하지 못했다.

**이 카드에 기록할 것인가:** 관측 한 줄로 남기되(실행 시각·원시 경로 `.moai/state/verify/t35-sync/gate-test-2.txt`), **조사는 별도 카드**로 넘기기를 권고한다. 근거 셋 — (i) 코드가 이 카드 밖이고, (ii) 고치려면 `channel/test/` 를 건드려야 하는데 이 SPEC 의 범위가 아니며, (iii) 이 저장소는 이미 카드 `t36` 에 「server 스위트 부하성 실패」 항목을 갖고 있어 같은 부류의 집이 있다.

---

## 6. 확인하지 못한 것 (명시)

1. **커버리지를 재지 못했다 — 통과로도 실패로도 적지 않는다.** `server/package.json` 의 `test` 는 `vitest run` 이고 `--coverage` 도 커버리지 설정 파일도 없다(`grep -rn 'coverage' package.json server/package.json channel/package.json` → 적중 없음). 도구 부재는 Gap 이지 PASS 가 아니다. Craft 0.75 는 커버리지가 아니라 **변이 10/10 + 게이트 초록 + 타입 검사 0오류**에 근거한 값이며, 프로파일의 커버리지 앵커에 대고 잰 값이 아니다.
2. **변이 ⑤ 의 「승인 창」 관측 세 건을 재현하지 못했다.** 운영자 눈 관측이고 산출물이 없다. 그 고리를 뺀 나머지(DB 네 행 · `api=false:conn=0` · jsonl 부재/존재)는 전부 다시 유도했다.
3. **`AC-001`~`AC-004` 를 스크립트 재실행으로 다시 세우지 않았다.** 서버를 띄우고 포트를 점유시키는 실행이 필요해 감사 범위(읽기 전용·배경 부하 금지)를 넘는다. 이 넷은 **증거 파일 판독으로만** 대조했고, 인용 파일과 §E.2 서술이 일치함을 확인한 데까지다.
4. **`E14` 의 대조군 프로세스(pid 73955)를 재현하지 못했다.** 이미 종료됐다. 다만 그 절의 `2 → 1` 기록과 남은 1의 정체(pid 64918)는 `ps` 로 확인했다.
5. **`moai update` 가 `template_managed` 파일을 어떻게 다루는지 재현하지 않았다.** F5 의 「형제 SPEC 을 못 고친다」는 `AC-016` 자신의 [HARD] 에 근거한 것이지 도구 동작 관측이 아니다.
6. **`CHANGELOG.md` 와 `README.md` 는 아직 커밋되지 않았다.** `git diff --name-only origin/main..HEAD -- README.md CHANGELOG.md` → **0**, 작업 트리 diff 는 `CHANGELOG.md | 38 +` · `README.md | 12 +`. 즉 **문서 심사는 PR 프레임이 아니라 작업 트리 상태에 대고 한 것**이며, 착지 형태가 달라지면 F7 은 다시 재야 한다.
7. **64자 hex 훑기의 절대 수를 값으로 적지 않았다** — 그 명령의 정의역에 이 보고서가 들어가므로 값을 적는 문장이 스스로 분모를 움직인다. 위 §5.1 의 명령을 다시 돌려서 확인할 것.

---

## 7. 처분 요약

| # | 발견 | 심각도 | 성격 | 소유 단계 |
|---|---|---|---|---|
| **F1** | `AC-014` 미충족 — 좁은 판별자가 절대 0 요구로 남아 M8 중에는 도달 불가. 이력으로 M8 이 뒤집은 것을 확정 | **Critical** | **차단** | plan (`acceptance.md:302-305`) + run (`live-dryrun.mts:109`) + run (§E.2 이월 정정) |
| **F2** | `AC-008` 이 못 박은 측정이 `E08` 에 부재한 채 「통과」로 기록됨 (감사자가 대신 재니 실질은 통과) | **High** | **차단** | run (`E08` 보강 + §E.2 문언) |
| **F3** | D-1 낡은 자리는 셋 (`plan.md:180` 누락) | Medium | **차단** | plan |
| F4 | §E.4 가 둘째 jsonl 을 변이 ⑤ 에 오귀속 | Medium | 비차단 | sync |
| F5 | 형제 울타리 측정 ②가 이 카드의 `exec claude` 를 못 본다 | Medium | 비차단 | **별도 카드** |
| F6 | `M01` 변이 ⑤ 「복원 확인 (바이트 대조)」 절이 빈 채로 남음 | Low | 비차단 | run |
| F7 | `README.md` 가 다섯째 사람 손을 적지 않음 | Low | 비차단 | sync |
| F8 | 폐기된 토큰 접두 8글자가 증거 둘에 잔존 | Low | 비차단 | 조치 불요 (기록) |
| — | 게이트 흔들림 1건 | 관측 | 비차단 | **별도 카드** (또는 `t36` 에 병합) |

**차단 셋(F1·F2·F3)이 처분되고 F1 의 예행이 다시 초록을 내기 전까지 이 카드는 닫히지 않는다.** 프런트매터를 `in-progress` 로 잡아 둔 sync 레인의 처분에 **동의한다** — 다투어지는 판정 위에 `completed` 를 세우면 그것 자체가 이 카드가 겨눈 결함이 된다.

---

## 8. sync 레인의 자기 신고에 대한 평가

이 감사가 확인한 범위에서 **sync 레인의 자기 신고는 정직했고 정확했다.** F1 은 스스로 찾아 올렸고, 그 진단(좁은 판별자가 처분 14 의 이동을 못 받았다)과 권고(후보 ㉡)가 둘 다 옳다. 후보 ㉢ 에 대한 반대도 옳다. 형제 울타리 다섯 값, 게이트 369, 토큰 훑기, 울타리 diff, 깊이 재유도 — **제가 다시 잰 것은 전부 일치했고 반증된 값은 하나도 없다.**

레인이 놓친 것은 셋이다: §E.2 다른 행의 어긋남 하나(**F2** — 레인 자신이 「열일곱을 다 읽지는 않았다」고 밝힌 자리), D-1 목록의 셋째 자리(**F3**), 그리고 §E.4 자신의 오귀속(**F4**). 셋 다 **더 읽어서** 나온 것이지 레인의 주장이 틀려서 나온 것이 아니다.

---

감사자: sync-auditor · 읽기 전용 · 산출물 무편집 · 배경 부하 없음 · 커밋/푸시/PR 없음
