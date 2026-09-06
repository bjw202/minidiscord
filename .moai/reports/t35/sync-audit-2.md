# 카드 t35 · SPEC-LIVEENV-001 — 동기화 단계 독립 감사 (2회차)

- 감사자: sync-auditor (독립·읽기 전용). 산출물·SPEC·증거 어느 파일도 **한 글자도 고치지 않았다.**
- 감사 일자: 2026-09-06
- 대상 트리: `.claude/worktrees/t35`, 가지 `WT-live-env`, **HEAD `951f7fd`**. 아래 모든 측정은 이 SHA 의 트리에서 직접 실행했다.
- 1회차: `.moai/reports/t35/sync-audit.md` — **FAIL 0.656**
- 판정: **FAIL** — 총점 **0.724**. **0.80 에서도 0.85 에서도 미달**이므로 통과선 모호성은 판정을 움직이지 않는다.

---

## 0. 쉬운 말 요약

지난 회차가 막았던 세 가지는 **전부 실제로 닫혔습니다.** 가짜 채널 예행은 기준의 자기모순을 고친 뒤 다시 초록이 됐고, 빠져 있던 측정은 실제로 돌아갔으며, 잘못된 귀속은 근거와 함께 정정됐습니다. 제가 직접 다시 재 봤고, 전부 사실이었습니다. 시험 369건도 이 트리에서 제가 직접 돌려 초록을 봤습니다.

`AC-008` 을 「통과」가 아니라 「미관측」으로 내린 판단은 **옳습니다.** 그리고 그 미관측이 문서 네 곳에 빠짐없이 적혀 있는지 제가 훑었는데, **빠진 곳이 없었습니다.** 「16개 전부 통과」로 남은 문장도 하나도 못 찾았습니다. 이 부분은 아주 잘 됐습니다.

그런데 이번 수리가 **자기 기록을 두 자리에서 낡게 만들었습니다.** 완료 기록이 「버전은 0.5.0 그대로다」라고 적었는데 같은 커밋이 0.6.0 으로 올렸고, 「CHANGELOG 에는 기준 합계를 싣지 않았다」라고 적었는데 같은 커밋이 그 합계를 실었습니다. 두 문장 다 지금 거짓입니다. 이 카드가 겨눈 결함 부류가 이 카드의 수리 안에서 다시 나온 셈이라, 이것을 차단 사항으로 올립니다.

점수가 통과선에 못 미친 이유는 그 두 문장 때문만이 아닙니다. **커버리지를 잴 도구가 이 저장소에 배선돼 있지 않고**(Craft 상한 0.75), **`ps eww` 통로가 공시된 채 열려 있어**(Security 상한 0.75), 나머지 둘이 만점이어도 총점이 0.785 로 0.80 에 닿지 않습니다. 즉 이번 FAIL 은 남은 결함 때문만이 아니라 **채점표와 이 카드가 맞물리는 방식** 때문이기도 합니다 — 그 계산을 §7 에 그대로 적어 두었습니다.

---

## 1. 채점 근거를 어디서 읽었는가 (지시받지 않고 직접 찾았다)

| 무엇 | 어디서 읽었나 | 값 |
|---|---|---|
| 프로파일 선택 | `spec.md` 프런트매터에 `evaluator_profile` 이 **없다**(직접 판독, 1~16행). `.moai/config/sections/harness.yaml:7` `default_profile: "default"` 로 해소 | `.moai/config/evaluator-profiles/default.md` |
| 차원·가중치 | `default.md` § Evaluation Dimensions | Functionality 40 / Security 25 / Craft 20 / Consistency 15 |
| 채점 앵커 | `default.md` § Scoring Rubric — 차원별 1.00/0.75/0.50/0.25 서술 | 아래 §2 에 인용 |
| 집계식 | `.claude/rules/moai/core/agent-common-protocol.md` § Skeptical Evaluation Stance — "Score quality as the **harmonic mean** of dimensions, not the average". 코드 확인: `.claude/workflows/sync-audit-4dim.js:220-221` `const reciprocalSum = scores.reduce((acc, s) => acc + 1 / s, 0)` · `const harmonicMean = DIMENSIONS.length / reciprocalSum` | **비가중 조화평균** (가중치는 등급 서술에만 쓰이고 집계에는 들어가지 않는다) |
| 통과선 | `.claude/rules/moai/workflow/spec-workflow.md:138-142` § SPEC Complexity Tier — S `0.75` / M `0.80` / L `0.85`. `spec.md` 프런트매터 `tier: M` | **0.80** |
| 필수 통과 | `default.md` § Must-Pass Criteria — Functionality(모든 AC 충족, no partial credit) · Security(Critical/High 0) | 방화벽 |

### 1.1 통과선 모호성 — 전임자의 단서를 확인했고, 이번에도 판정을 움직이지 않는다

전임자의 단서는 **옳다.** 두 가지를 직접 확인했다:

- `spec-workflow.md:138` 의 표 열 이름은 글자 그대로 **"plan-auditor PASS threshold"** 이고, 같은 파일 `:334-335` 도 그 값을 plan-auditor 판정에 쓴다. **동기화 감사 전용 계층별 통과선은 SSOT 어디에도 따로 적혀 있지 않다.**
- `.claude/workflows/sync-audit-4dim.js:63` — `const THRESHOLD = (args && typeof args.threshold === 'number') ? args.threshold : 0.85`. 호출자가 주지 않으면 **0.85**. 같은 파일 `:64` 가 `tier` 를 **별도 인자**로 받는 것으로 보아 계층→통과선 해소는 호출자 몫으로 남아 있다.

**해소 방식:** Tier 로부터 유도되는 유일한 SSOT 값은 `0.80` 이므로 그것을 주 통과선으로 삼되, **양쪽 모두에 대고 판정한다.** 총점 **0.724 는 0.80 미만이고 0.85 미만**이다. 리드가 이름댄 두 조건 가운데 **「0.80~0.85 사이」에 해당하지 않으므로 에스컬레이션 조건이 아니고**, 모호성은 이 판정을 바꾸지 않는다.

### 1.2 두 번째 모호성 — 「미관측」이 필수 통과 방화벽을 건드리는가 (이번에는 판정을 움직이지 않는다)

`default.md` 는 같은 파일 안에서 서로 다른 두 가지를 말한다:

- § Must-Pass Criteria — "Functionality: All SPEC acceptance criteria **must be met (no partial credit)**"
- § Evaluation Rules — "Mark unverifiable criteria as **UNVERIFIED, not PASS**"
- § Scoring Rubric / Functionality 0.50 — "1-2 acceptance criteria **fail or are unverified**"

앞의 것을 글자 그대로 읽으면 `AC-008` 의 UNVERIFIED 하나로 방화벽이 걸려 점수와 무관하게 FAIL 이다. 뒤의 둘을 함께 읽으면 UNVERIFIED 는 방화벽 사유가 아니라 **점수 사유**다 — 그렇지 않다면 Functionality 앵커의 0.75·0.50·0.25 세 칸이 전부 사문이 된다(어차피 FAIL 이므로).

**이 감사는 이 모호성을 해소하지 않는다.** 총점이 이미 두 통과선 모두에 미달하므로 어느 쪽으로 읽어도 판정은 FAIL 이고, 결정적이지 않은 자리에서 SSOT 를 대신 정하지 않는다. **다만 리드에게 올린다** — 다음 회차에서 나머지 결함이 닫히면 이 모호성이 곧바로 결정적이 된다.

---

## 2. 차원 점수

각 차원에 **기계 검증 명령을 최소 하나** 돌리고 그 출력을 그대로 실었다.

| 차원 | 점수 | 판정 | 실행한 명령과 관측 |
|---|---|---|---|
| Functionality (40%) | **70**/100 | PASS (점수), 방화벽은 §1.2 | `npm test` → `exit=0` · `Test Files 19 passed (19)` `Tests 243 passed (243)` + `Test Files 7 passed (7)` `Tests 126 passed (126)` = **369**. 형제 울타리 다섯 재실행 전부 성립(§4.3). 16 기준 중 15 PASS · 0 FAIL · 1 UNVERIFIED |
| Security (25%) | **75**/100 | PASS | 교정 diff 전문에 자격증명 7패턴 **전부 0**(대조군 `MINIDISCORD_TOKEN` **9건**) · 더해진 줄의 64자 hex **0**(대조군: 같은 정규식이 `.moai/state/verify/t15-run/mutation-A.txt` 에서 **1** 적중) · `data/live-env/token` `-rw-------` · `git ls-files data bot-01 \| wc -l` → **0** |
| Craft (20%) | **75**/100 | PASS | `npx tsc --noEmit -p server` → `exit=0`, 출력 **0줄** · `npm run typecheck -w channel` → `exit=0` · `bash -n scripts/live-env.sh` → `exit=0` · 변이 ⑤ 복원 해시 두 쌍을 제가 직접 대조해 일치 확인(§4.4) · **커버리지 미측정(Gap)** |
| Consistency (15%) | **70**/100 | PASS | `git diff origin/main..HEAD -- .moai/specs/SPEC-LIVEVERIFY-001 \| wc -l` → **0**, `SPEC-E2E-001` → **0**(대조군 `.moai/specs` 전체 → **4647**) · 그러나 개정 잔재 **여섯**, 그중 **셋이 이번 교정 커밋이 스스로 만든 것**(§5) |

**총점 = 비가중 조화평균 = 4 / (1/0.70 + 1/0.75 + 1/0.75 + 1/0.70) = 4 / 5.523810 = `0.724`**

### 앵커 인용 (`default.md` § Scoring Rubric)

- **Functionality 0.70** — 0.75 앵커 "All primary acceptance criteria pass; minor edge cases missing" 와 0.50 앵커 "Core functionality works; **1-2 acceptance criteria fail or are unverified**" 사이. 0.50 보다 **높은** 이유: 실패가 0건이고, 미관측 한 건의 실질 주장(항목 무편집)은 이번에 실제로 측정돼 통과했다. 0.75 에 **못 미치는** 이유: 빠진 것은 「사소한 엣지 케이스」가 아니라 번호 붙은 기준의 **[HARD] 조항**이다.
- **Security 0.75** — 앵커 "No Critical/High findings; **Medium findings documented with mitigations**". 해당 Medium 은 같은 사용자의 `ps eww` 통로이며 README·CHANGELOG·`spec.md` §5·§6 네 자리에 **닫지 않았다고** 명시돼 있다.
- **Craft 0.75** — 앵커 "Coverage >= 80%, minor style issues". **커버리지는 재지 못했으므로 이 앵커에 대고 잰 값이 아니다**(§6-1). 게이트 초록·타입검사 0오류·변이 10/10 에 근거한 값이며, 아래 F5(잠재 공허)·F7(`scripts/` 미검사)이 감점 요인이다.
- **Consistency 0.70** — 0.75 앵커 "Minor deviations from conventions; **no structural inconsistencies**" 를 살짝 밑돈다. 구조적 위반은 없으나, 잔재 여섯 중 셋이 **교정 자신이 만든 자기모순**이라 「개정이 자기 기록을 낡게 만든다」는 이 카드의 표제 부류가 재현됐다.

---

## 3. F1 / F2 / F3 — 하나씩, 닫힘·부분 닫힘·열림

### F1 — `AC-LIVEENV-014` : **닫혔다**

세 갈래 공격을 모두 걸었다.

**(a) 새 기준이 자기 제목이 말하는 것을 재는가 — 대체로 그렇다. 제목은 이제 부정확하지만 본문이 그 간극을 명시한다.**

제목은 「판별자는 「이 예행이 띄운 것」이지 「기계의 모든 claude」가 아니다」이고, 세 판별자는 이렇다(`acceptance.md` `AC-014 ㉢`):

```
NARROW_AFTER=$(pgrep -f 'dangerously-load-development-channels' | wc -l)
test "$NARROW_BEFORE" -eq "$NARROW_AFTER"        # 증분 — 정의역은 기계 전체
pgrep -P "$DRYRUN_PID" -x claude | wc -l         # 자손 — 정의역이 예행의 자식. 절대 0
CLAUDE_AFTER=$(pgrep -x claude | wc -l); test "$CLAUDE_BEFORE" -eq "$CLAUDE_AFTER"   # 증분
```

셋 중 **자손 판별자 하나만** 제목의 뜻을 글자 그대로 잰다. 나머지 둘은 기계 전체를 재되 **증분**으로 판정한다. 증분은 「이 예행이 띄운 것」의 근사이지 동치가 아니다 — 관측 창 안에서 무관한 프로세스가 하나 뜨면 거짓 빨강이 되고, 예행이 띄운 것과 무관한 것이 하나 죽으면 상쇄돼 거짓 초록이 된다.

**그러나 이것은 1회차 F1 의 재발이 아니다.** 1회차의 결함은 「이 카드가 제 일을 하는 한 **원리적으로** 초록이 될 수 없다」였다. 지금 판정선은 도달 가능하고, 실제로 도달했다. 그리고 `AC-014` 본문이 「왜 증분인가」·「자손 판별자가 무엇을 승계하는가」를 [HARD] 로 두 문단에 걸쳐 적는다. **제목이 세 판별자 전체를 정확히 요약하지 못하는 것은 남지만, 그것은 표제 부정확이지 기준의 자기모순이 아니다.** → §5 F6(Low, 비차단).

**(b) 판정이 판별력을 갖는가 — 이번 실행은 확실히 공허하지 않다. 다만 리드가 물은 대로, 기록된 대조군은 스크립트가 실제로 돌리는 판정이 아니라 그것을 닮은 bash 다.**

기록된 대조군(`E14-dry-run.txt:81-91`)의 판정 줄은 이렇다:

```
$ test "$B" -eq "$D"; echo "narrow-delta-zero exit=$?"
narrow-delta-zero exit=1
```

스크립트가 실제로 돌리는 판정은 `scripts/live-dryrun.mts:165` 의 `narrowAfter === narrowBefore` 다. **둘은 다른 코드다.** 그러므로 그 대조군이 세우는 것은 두 가지로 한정된다: ① `pgrep -f 'dangerously-load-development-channels'` 가 새로 뜬 일치 프로세스를 실제로 잡아 `1 → 2` 로 움직인다, ② 두 정수의 동일성 비교가 그때 뒤집힌다. **스크립트 자신의 판정식이 뒤집힌다는 것은 세우지 않는다.** 리드의 의심은 정당하다.

**그럼에도 이 실행이 공허하지 않다는 것은 스크립트 자신의 출력이 독립적으로 세운다.** 공허의 유일한 경로는 `pgrepCount`(`:30-37`)의 `catch { return 0 }` 다 — `pgrep` 이 어떤 이유로든 실패하면 0 을 돌려준다. 그런데 기계가 쓴 `evidence/dryrun/dryrun-report.txt` 를 그대로 읽으면:

```
pgrep_narrow_before=1
pgrep_narrow_after=1
pgrep_descendant_any=2
```

**세 값이 모두 0 이 아니다.** 즉 `-f` 형태와 `-P` 형태가 **스크립트 안에서** 실제로 실행돼 적중을 돌려줬고, 침묵 경로는 이번 실행에서 발동하지 않았다. 그리고 그 기계 파일은 사람이 쓴 `E14-dry-run.txt` 의 대응 줄과 **한 글자도 다르지 않다**(제가 두 파일을 나란히 읽어 대조했다).

**남는 것은 미래 회차의 잠재 공허다** — `ok`(`:164-167`)에 `descendantAny >= 1` 이 들어 있지 않으므로, `pgrep` 이 고장난 기계에서는 `narrowBefore = narrowAfter = 0`·`descendantClaude = 0`·`claudeDuring = claudeBefore = 0` 이 되어 **프로세스 판별자 셋이 함께 조용히 초록**이 된다. `AC-014` 는 자손 양성 대조군(`pgrep -P` ≥ 1)을 [HARD] 로 요구하지만 스크립트는 그것을 **보고만 하고 판정에 넣지 않는다.** → §5 F5(Medium, 비차단).

**(c) `narrowBefore` 포착 지점이 겨누는 창을 진짜로 앞서는가 — 앞선다. 다만 창의 «뒤쪽»이 예행보다 먼저 닫힌다.**

```
:51  const claudeBefore  = pgrepCount(['-x','claude'])
:55  const narrowBefore  = pgrepCount(['-f','dangerously-load-development-channels'])
:59  const port = await acquirePort()
:60  spawnServer(...)                    ← 예행이 프로세스를 만들기 시작하는 첫 자리
```

포착은 첫 spawn 보다 **네 줄 앞**이다. ✅ 그러나 관측은 `:113-116` 에서 끝나고, 그 뒤에 **⑧ 방 보관(`:119`) · ⑨ 추출기 구동(`:124`) · 마지막 `stopServer`(`:133`)** 가 남는다. 기준 본문은 「**예행 실행 동안** 아래 셋이 모두 성립」이라 적으므로, 마지막 세 단계는 판정 창 밖이다. 추출기가 프로세스를 띄우면 그것은 재어지지 않는다. → §5 F8(Low, 비차단).

**F1 종합 판정: 닫혔다.** 기준의 자기모순은 실제로 사라졌고, 예행은 도달 가능한 판정선 위에서 초록을 냈으며, 그 초록이 침묵이 아님이 스크립트 자신의 출력으로 선다. 남은 셋(F5·F6·F8)은 전부 비차단이다.

### F2 — `AC-LIVEENV-008` : **측정 부재는 닫혔다. 기준 자체는 미관측이고, 그 처분과 공시는 옳다.**

**(가) 「미관측」이 옳은 처분인가 — 옳다. FAIL 이 아니다.**

`default.md` § Evaluation Rules 가 글자 그대로 요구한다: "Mark unverifiable criteria as **UNVERIFIED, not PASS**". 그리고 FAIL 이 아닌 이유는 기준의 **Then 절이 실제로 측정돼 통과**했기 때문이다 — 상시 여섯 자리 적중, `entry-unchanged exit=0`. 서지 않은 것은 Given 절이 요구하는 **양성 대조군 하나**다. 측정된 것이 통과했는데 FAIL 로 적으면 그것도 재지 않고 적는 것이다.

**(나) 「같은 파일」 요구에 대한 sync 레인의 독해가 옳은가 — 옳다.**

`acceptance.md` `AC-008` 원문:

> **Then** 상시 소재 여섯에서 평문 토큰 적중이 **0건**이고, **같은 파일 안에** 그 시각 봇 세션이 실제로 접속해 있었다는 관측(`status` 의 `principal` 줄)이 함께 있다.
> **[HARD] 양성 대조군이 같은 파일에 있어야 한다.** 봇이 붙어 있지 않은 시각의 「0건」은 「상시 소재에 없다」와 「토큰이 아예 없다」를 가르지 못한다.

요구는 **「같은 파일」과 「그 시각」 둘**이다. 두 조건 모두 다른 파일의 관측으로는 채워지지 않는다.

**(다) 놓친 것이 이미 그 요구를 채우고 있지는 않은가 — 아니다. 직접 훑었다.**

```
$ grep -rn 'api=true' .moai/specs/SPEC-LIVEENV-001/evidence/
  M01-mutation.txt:66   principal=pm:api=true:conn=1 measured=yes
  M01-mutation.txt:87   principal=pm:api=true:conn=1 measured=yes
  E08-ambient-sweep.txt:70   (산문 인용 — 관측이 아니다)
  E09-mcp-attribution.txt:37 principal=pm:api=true:conn=1 measured=yes
$ grep -rl 'token-sweep --ambient' .moai/specs/SPEC-LIVEENV-001/evidence/
  E08-ambient-sweep.txt        ← 훑기가 실린 파일은 이 하나뿐이다
$ grep -rn 'token-sweep' .moai/specs/SPEC-LIVEENV-001/evidence/   (대조군 — 이 grep 은 대상을 찾는다)
  E07-inventory.txt:3 · E08:9 · E08:45
```

**붙어 있던 관측 셋은 전부 훑기가 실리지 않은 파일에 있고, 훑기가 실린 유일한 파일에는 붙어 있던 관측이 없다.** 두 면이 한 파일에서 만나는 자리는 존재하지 않는다. sync 레인의 판단이 맞다.

**(라) 셈 내림이 필요한 곳에 전부 전파됐는가 — 전파됐다. 「16/16」은 한 자리도 살아남지 않았다.**

값으로 훑었다(대상을 읽어 훑지 않았다):

```
$ grep -rnE '(열여섯|16)[^0-9]{0,12}(전부|모두|다) *(통과|초록)|수용 기준.{0,20}(전부|모두) *통과|기준 16 *(건)? *통과|미관측 *0' \
    .moai/specs/SPEC-LIVEENV-001/ CHANGELOG.md README.md
$ grep -rn '통과 16\|16 / 16\|16/16\|미관측 0' .moai/specs/SPEC-LIVEENV-001/ CHANGELOG.md README.md .moai/reports/t35/
```

적중을 전건 분류했다:

| 자리 | 문자열 | 분류 |
|---|---|---|
| `progress.md:78` `:135` `:161` | `통과 15 / 실패 0 / 미관측 1` | ✅ 현행값 (§E.2 · §E.3 · §E.4 셋 다) |
| `progress.md:86` | `M8 인도 시점 (120469d) \| 통과 16 / 실패 0 / 미관측 0` | ✅ **회차 열이 붙은 이력 표의 행** — 시점 귀속이 있으므로 낡은 값이 아니다 |
| `progress.md:186` | `§E.3 의 「통과 16 …」은 그 행에서 값을 물려받는다` | ✅ 진단 서술의 인용 — 그 아래 「동기화 단계가 고친 것」이 처분을 적는다 |
| `spec.md:25` | HISTORY 0.6.0 행의 `16 … 에서 15 … 로 바뀌었다` | ✅ 변경 서술 |
| `CHANGELOG.md:31` | `열여섯 가운데 열다섯이 통과했고 하나는 미관측입니다 — 16/16 이 아닙니다` | ✅ 현행값이며 부정형까지 명시 |
| `spec.md:38` · `CHANGELOG.md:132` `:201` | `통과 12 / 실패 0 / 미관측 0` | ✅ **`SPEC-LIVEVERIFY-001` 의 열두 항 셈** — 이 카드의 셈이 아니다 |
| `plan-audit.md:15` · `plan-audit-2.md:14` `:179` · `acceptance.md:286` | `16/16 으로 정확히 상한` | ✅ **REQ 16 / AC 16 예산 상한** — 통과 셈이 아니다 |
| `README.md` | (적중 없음) | ✅ README 는 애초에 셈을 싣지 않는다 (`grep -nE '수용 기준\|통과 [0-9]\|미관측' README.md` → `exit=1`) |

**낡은 채로 남은 「16/16」은 0건이다.** 리드의 전파 주장은 검증됐다.

**(마) 공시가 완전한가 — 네 자리 모두에서 완전하다. 다만 「사람이 수용하기로 정했다」는 아직 어디에도 없다.**

리드가 제시한 네 항목(무엇을 쟀나 · 무엇을 못 쟀나 · 왜 못 쟀나 · 사람이 수용했나)으로 각 자리를 재면:

| 자리 | 쟀나 | 못 쟀나 | 왜 | 사람 수용 |
|---|---|---|---|---|
| `progress.md` §E.2 `AC-008` 행 | ✅ `entry-unchanged exit=0`, 반대 방향 `exit=1` | ✅ 「양성 대조군이 반대쪽」 | ✅ 「사람 손 다섯을 밟아야 해 무인으로 불가」 | ❌ |
| `progress.md` §E.3 | — (§E.2 를 지목) | ✅ | ✅ (요약) | ❌ |
| `progress.md` §E.4 처분 34 | ✅ | ✅ | ✅ | ❌ |
| `CHANGELOG.md:34` | ✅ | ✅ | ✅ | ❌ |
| `E08` 「미검증 ②」 절 | ✅ | ✅ | ✅ + 재시도 실패 기록(`status exit=2`) | ❌ |

**앞의 세 항은 다섯 자리 전부에서 채워져 있다. 「조용히 빠진 자리」는 없다.** 네 번째 항이 비어 있는 것은 결함이 아니다 — 운영자 처분은 커밋 `951f7fd` **이후에** 도착했고, 오히려 `progress.md:162` 가 「`implemented → completed` 전이는 `AC-008` 의 처분이 정해진 뒤의 커밋이 진다」로 그 처분을 **기다리고 있다고** 미리 적었다. 처분이 내려온 지금, **그 수용 사실과 근거를 위 다섯 자리 가운데 최소 §E.2 행과 `E08` 절에 적는 것이 다음 커밋의 숙제**다. → §5 F9(Medium, 비차단, 후속).

**F2 종합 판정: 측정 부재는 닫혔다. 기준은 미관측이며 그 처분·공시는 옳다. 「사람이 수용했다」의 기록만 후속으로 남는다.**

### F3 — §E.4 의 둘째 jsonl 오귀속 : **닫혔다**

`progress.md` §E.4 「관측으로만 적는 것」에 `[정정]` 절이 들어갔고, 표지별 `grep -c` 표(존재하지 않는 표지 대조군 포함)로 둘째 파일이 **복원 회차**의 것임을 세운다. 1회차에서 제가 독립적으로 잰 값(`19c548af…` 이 `7Kq3ZmR8` 을 2, `q7Rm2XbK` 를 0)과 정확히 일치한다.

**그리고 요구되지 않은 것을 하나 더 했다** — 틀린 전제의 출처가 **카드 지시 메시지**였고 그것을 재지 않고 실어 날랐다는 사실을 함께 적었다. 「디스패치가 전한 전제도 증거를 진다」는 이 저장소의 반복 부류를 정확히 이름댄 기록이다. 이 정정은 요구를 넘어선다.

---

## 4. 리드가 재측정했다는 값 — 검증 또는 반증

전부 이 트리(`951f7fd`)에서 제가 다시 돌렸다.

### 4.1 게이트 — **검증됨**

```
$ npm test    → exit=0
  server  : Test Files 19 passed (19)   Tests 243 passed (243)
  channel : Test Files  7 passed  (7)   Tests 126 passed (126)
  합 369
$ npx tsc --noEmit -p server         → exit=0, 출력 0줄
$ npm run typecheck -w channel       → exit=0
$ bash -n scripts/live-env.sh        → exit=0
```

원문: `.moai/state/verify/t35-sync2/gate.txt`. 1회차가 관측한 `channel/test/transport-auth.test.ts` 흔들림은 **이번 실행에서 재발하지 않았다**(초록 5회 · 빨강 1회로 갱신).

### 4.2 증거 디렉터리의 64자 hex — **검증됨 (대조군 포함)**

```
$ grep -rEl '[0-9a-f]{64}' .moai/specs/SPEC-LIVEENV-001/evidence/ ; echo "exit=$?"
exit=1
$ grep -rEl '[0-9a-f]{64}' .moai/state/verify/ | head -5        ← 대조군
.moai/state/verify/t4-retrial-run/mut-index-original-hash.txt
.moai/state/verify/t4-sync-2/30-orig-hashes.txt
…                                                    exit=0
```

정규식은 대상을 찾는다. 증거 디렉터리 적중 0 은 침묵이 아니다.

### 4.3 형제 울타리 `AC-E2E-016` 다섯 측정 — **검증됨. 다만 증거 파일의 귀속이 낡았다.**

형제 원문(`SPEC-E2E-001/acceptance.md:214-245`)에서 명령을 그대로 옮겨 이 트리에서 다시 돌렸다:

```
①    grep -rEn "수동 검증(을)? ?(수행|완료)|실 세션으로 (확인|검증)|사람이 (직접 )?확인했" \
       README.md scripts/ .moai/specs/SPEC-E2E-001/ | grep -v 'AC-016-EXEMPT'   → exit=1
①-b  같은 패턴 | grep -c 'AC-016-EXEMPT'                                        → 7      (상한 7 이하)
①-c  grep -rc 'AC-016-EXEMPT' README.md scripts/                                → README.md:0 · live-env.sh:0
                                                                                   live-extract.mts:0 · live-dryrun.mts:0 · e2e.mts:0
②    grep -rEn "anthropic|claude\.ai|api\.anthropic|spawn\(['\"]claude" scripts/ → exit=1
③    grep -c '수동 체크리스트' README.md                                         → 0  (해당 없음)
```

**다섯 값이 리드가 보고한 것과 정확히 일치한다.** 그러나 `evidence/E16-sibling-e2e016.txt` 의 머리글은 `# head=4f5bd69` 이고, 그 뒤로 커밋 둘(`120469d` M8, `951f7fd` 교정)이 착지했으며 그중 교정 커밋이 **`README.md` 에 25줄을 더했다** — 측정 ①·①-b·①-c 의 정의역에 든 파일이다. 값은 안 움직였지만 **인용된 SHA 는 두 커밋 낡았다.** → §5 F4.

### 4.4 변이 ⑤ 「복원 확인」 절 — **검증됨, 그리고 해시를 생략한 판단이 옳다**

리드가 해시 원문을 싣지 않은 근거를 검사했다. `acceptance.md` `AC-011 ㉠` 원문:

> ㉠ 이 카드가 만든 산출 디렉터리의 적중이 **절대 0건**이고 … `grep -rEl '[0-9a-f]{64}' .moai/specs/SPEC-LIVEENV-001/evidence/ ; echo "exit=$?"  # → exit=1`

`M01-mutation.txt` 는 **그 정의역 안**에 있고 SHA-256 은 64자 hex 다. **해시 원문을 실었다면 `AC-011 ㉠` 이 실제로 빨개진다.** 판단은 옳다. (같은 이유로 이 보고서도 64자 hex 를 싣지 않는다 — `AC-011 ㉡` 의 정의역은 추적 트리 전체이고 이 파일이 그 안에 든다.)

**절이 실질적인가 — 그렇다. 제가 직접 대조해 봤다:**

```
$ shasum -a 256 data/live-env/mcp.json.premut bot-01/.mcp.json      | awk '{print substr($1,1,8)"…", $2}'
cd84110a… data/live-env/mcp.json.premut
cd84110a… bot-01/.mcp.json                                          ← 일치
$ shasum -a 256 data/live-env/live-env.sh.premut scripts/live-env.sh | awk '{print substr($1,1,8)"…", $2}'
f8b77536… data/live-env/live-env.sh.premut
f8b77536… scripts/live-env.sh                                       ← 일치
```

**두 쌍 모두 실제로 같다.** 절은 명령·대상 둘·대조군·재확인 경로를 적으므로 「비어 있지 않기만 한」 상태가 아니다. **다만 두 가지가 남는다**: 기록된 줄(`unchanged=yes …`)은 명령의 축자 출력이 아니라 **요약**이고, 대조 대상인 `data/live-env/*.premut` 는 `.gitignore:2 data/` 로 **커밋되지 않으므로** 새로 받은 트리에서는 이 대조를 재현할 수 없다. → §5 F10(Low, 비차단).

### 4.5 형제 SPEC diff · REQ/AC 수 · §7 이름 집합 — **검증됨**

```
$ git diff origin/main..HEAD -- .moai/specs/SPEC-LIVEVERIFY-001 | wc -l   → 0
$ git diff origin/main..HEAD -- .moai/specs/SPEC-E2E-001       | wc -l   → 0
$ git diff origin/main..HEAD -- .moai/specs                     | wc -l   → 4647   ← 대조군
$ grep -oE 'REQ-LIVEENV-[0-9]{3}' .moai/specs/…/spec.md | sort -u | wc -l → 16
$ grep -cE '^### AC-LIVEENV-[0-9]{3}' .moai/specs/…/acceptance.md         → 16
$ grep -oE 'sweep_site [a-z_]+' scripts/live-env.sh | awk '{print $2}' | sort -u | wc -l → 12
$ grep -cE '^site=' .moai/specs/…/evidence/E07-inventory.txt              → 12
$ spec.md §7 표 본문 행 (:238-249)                                        → 12 (1~12번)
```

---

## 5. 발견 — 심각한 순서

### F1 [High · **차단**] 이번 교정이 자기 완료 기록을 두 자리에서 거짓으로 만들었다

`progress.md:162` · `progress.md` §E.4 「쓴 문서」 표

교정 커밋 `951f7fd` 가 `spec.md` 프런트매터를 `0.5.0 → 0.6.0` 으로 올리고 `CHANGELOG.md` 에 기준 합계를 실었다. 그런데 **같은 커밋 안의 완료 기록 두 문장이 교정 이전 상태를 현재형으로 단언한 채 남았다.**

```
$ grep -n 'version: "0.5.0"' .moai/specs/SPEC-LIVEENV-001/progress.md
162:- 프런트매터: … `updated: 2026-09-06` · `version: "0.5.0"` 는 그대로다.
$ sed -n '4p' .moai/specs/SPEC-LIVEENV-001/spec.md          ← 대조: 실제 프런트매터
version: "0.6.0"
```

```
progress.md §E.4 「쓴 문서」 표 · CHANGELOG.md 행:
  「**수용 기준 합계는 싣지 않았다** — 위 「동기화 단계가 찾은 것」의 다툼이 처분되기 전이라 …」
$ sed -n '31p' CHANGELOG.md                                  ← 대조: 실제 CHANGELOG
**수용 기준은 열여섯 가운데 열다섯이 통과했고 하나는 미관측입니다 — `16/16` 이 아닙니다.**
```

**두 문장 모두 지금 거짓이고, 둘 다 이 커밋이 스스로 만들었다.** `verification-claim-integrity.md` §1.1 표면 2(관리자 에이전트 완료 보고) 위반이며, 부류가 1회차 F2 와 같다 — **사실과 어긋난 것을 완료 기록에 적었다.** 규모는 작지만 이 카드의 표제 주장이 「기록이 사실과 어긋나는 자리를 잡는다」이므로, 그 기록 자신이 어긋난 채 닫는 것은 앞뒤가 맞지 않는다.

**요구되는 수리** ① `:162` 를 `version: "0.6.0"` 으로 고치고 왜 올렸는지 한 줄. ② 「쓴 문서」 표의 CHANGELOG 행을 「감사 뒤 처분이 내려와 합계를 실었다(`통과 15 / 실패 0 / 미관측 1`)」로. 소유: sync.

### F2 [Medium · **차단**] §E.4 의 「처분 대기」 절이 현재형으로 남아, 바로 아래 절이 그것을 뒤집는다

`progress.md` §E.4 「동기화 단계가 찾은 것 — … (리드 처분 대기)」

그 절은 현재형으로 이렇게 적는다: 「**어느 쪽이든 이 절이 집행하지 않는다**」 · 「**이 절도, `CHANGELOG.md` 도 수용 기준 합계를 적지 않는다**」 · 후보 셋이 「**리드에게 올라가 있다**」. 그러나 **바로 다음 절**(「동기화 단계가 고친 것」)이 그 셋을 이미 집행했고, `CHANGELOG.md` 는 합계를 실었다.

이력을 보존하려는 의도는 옳다 — 이 카드는 「덮인 값을 지우지 않는다」를 규율로 삼는다. **문제는 그 절의 머리에 「이 아래는 처분 전 상태의 기록이다」라는 시점 표지가 없다는 것이다.** 그래서 §E.2 의 셈 이력 표(회차 열이 붙어 있어 오독되지 않는다)와 달리, 이 절은 처음 읽는 사람에게 **현행 상태로 읽힌다.** 제 1회차 기억 기록(`superseded-value-may-be-the-pass`)이 이름댄 부류의 거울상이다.

**요구되는 수리** 절 제목이나 첫 줄에 시점 표지 한 줄 — 예: 「**[처분 전 기록]** 아래는 리드 처분 33·34·35 가 내려오기 전의 관측이다. 처분과 집행은 다음 절이 진다.」 소유: sync.

### F3 [Medium · 비차단] `E14-dry-run.txt` 가 인용한 SHA 에서 그 파일의 판정이 재현되지 않는다

`evidence/E14-dry-run.txt:2` — `# head=0a88b77 (sync 단계 재실행 — 리드 처분 33)`

예행은 `0a88b77` 커밋이 아니라 **`0a88b77` + 미커밋 변경**(고쳐진 `live-dryrun.mts`) 위에서 돌았다. 커밋 `0a88b77` 의 스크립트는 아직 이렇다:

```
$ git diff 0a88b77..951f7fd -- scripts/live-dryrun.mts
-    && narrow === 0 && descendantClaude === 0
+    && narrowAfter === narrowBefore && descendantClaude === 0
```

즉 **인용된 SHA 를 체크아웃해 예행을 돌리면 `VERDICT=FAIL` 이 나온다.** 파일이 기록한 `VERDICT=PASS` 는 그 SHA 에서 재현되지 않는다. 측정 자체는 옳고 그 코드는 지금 `951f7fd` 에 들어 있으므로 **실질에는 문제가 없다** — 틀린 것은 귀속 문자열이다. `E08-ambient-sweep.txt:33` 도 같은 형태이나 그 측정은 코드에 의존하지 않아 재현이 깨지지 않는다.

이 카드의 중심 주장이 귀속이므로 기록해 둔다. **요구되는 수리** 머리글을 「`951f7fd` 에 착지한 트리에서 실행(실행 시점 HEAD 는 `0a88b77`, 작업 트리에 이 교정이 얹힌 상태)」으로. 소유: sync.

### F4 [Low · 비차단] `E16-sibling-e2e016.txt` 의 귀속이 두 커밋 낡았다

머리글 `# head=4f5bd69`. 그 뒤 `120469d`·`951f7fd` 가 착지했고 후자가 `README.md` 에 25줄을 더했는데, `README.md` 는 측정 ①·①-b·①-c 의 정의역이다. **§4.3 에서 제가 다섯 값을 이 트리에서 다시 돌려 전부 불변임을 확인했으므로 판정은 바뀌지 않는다.** 갱신 대상은 머리글과 §E.2 `AC-016` 행의 인용 SHA 다.

### F5 [Medium · 비차단] `pgrepCount` 가 모든 오류를 0 으로 삼켜, 프로세스 판별자 셋이 함께 조용해질 수 있다

`scripts/live-dryrun.mts:30-37` · 판정식 `:164-167`

```
function pgrepCount(args: string[]): number {
  try { … } catch { return 0 }   // ← 적중 없음(rc=1)과 실행 실패를 구별하지 않는다
}
```

`pgrep` 이 없거나 실패하면 `narrowBefore = narrowAfter = 0` (동일 → 성립) · `descendantClaude = 0` (성립) · `claudeDuring = claudeBefore = 0` (성립) 로 **세 판별자가 함께 초록**이 된다. `AC-014` 는 자손 양성 대조군(`pgrep -P "$DRYRUN_PID"` ≥ 1)을 [HARD] 로 요구하지만 스크립트는 `descendantAny` 를 **보고만 하고 `ok` 에 넣지 않는다.**

**이번 실행에는 발동하지 않았다** — `narrow_before=1` · `narrow_after=1` · `descendant_any=2` 셋이 0 이 아니므로 두 형태 모두 스크립트 안에서 실제로 적중을 냈다(§3 F1(b)). 그러나 그것은 이번 실행의 사실이지 판정식의 성질이 아니다.

**권고(선택)** `ok` 에 `descendantAny >= 1` 을 더한다 — 예행은 서버를 spawn 하므로 그 값은 정상 실행에서 항상 1 이상이고, `pgrep` 이 죽으면 그때만 빨개진다. 한 줄이며 기준의 뜻을 바꾸지 않는다. 소유: 별도 카드 또는 다음 회차.

### F6 [Low · 비차단] `AC-014 ㉢` 의 제목이 이제 세 판별자를 정확히 요약하지 않는다

제목은 「판별자는 「이 예행이 띄운 것」이지 「기계의 모든 claude」가 아니다」인데, 셋 중 **둘은 기계 전체를 재는 증분**이다. 본문 두 [HARD] 문단이 그 사정을 상세히 적으므로 독자가 오도될 위험은 낮고, 1회차 F1(원리적 도달 불가)의 재발은 **아니다**. 다만 제목만 읽는 훑기가 다시 같은 자리를 「자손 판별」로 오분류할 수 있다. **권고** 제목을 「판별자는 「이 예행이 만든 증분·자손」이지 「기계의 절대값」이 아니다」류로. 소유: plan.

### F7 [Low · 비차단] `scripts/` 는 어떤 타입 검사에도 들어 있지 않다

```
$ grep -rn 'scripts' server/tsconfig.json channel/tsconfig.json tsconfig.json ; echo "exit=$?"
exit=2                       ← 루트 tsconfig.json 자체가 없다
$ cat server/tsconfig.json | tail -1
  "include": ["src", "test"]
```

교정된 `scripts/live-dryrun.mts` 는 **게이트의 타입 검사 정의역 밖**이고, 그 정확성을 세우는 것은 `E14` 에 기록된 `npx tsx` 실행 한 번뿐이다. 리드가 별도 카드로 옮긴 「커버리지 배선 부재」와 같은 부류(게이트 정의역의 구멍)이며, 카드 `t40`·`t41` 이 다룬 부류이기도 하다. **관측으로만 적는다.**

### F8 [Low · 비차단] ㉢ 의 관측 창이 예행의 마지막 세 단계보다 먼저 닫힌다

관측은 `:113-116`, 그 뒤 ⑧ 방 보관(`:119`) · ⑨ 추출기(`:124`) · `stopServer`(`:133`)가 남는다. 기준 본문은 「예행 실행 **동안**」이라 적으므로 그 셋은 창 밖이다. **권고** 관측을 `:133` 뒤로 옮기거나, 기준 본문에 「관측 시점은 ⑦ 직후」를 명시. 소유: run + plan.

### F9 [Medium · 비차단 · **후속 필수**] 운영자의 `AC-008` 수용 사실이 아직 어디에도 없다

§3 F2(마) 참조. 커밋 `951f7fd` 시점에는 처분이 도착하지 않았으므로 **이 커밋의 결함이 아니다.** 그러나 `progress.md:162` 가 스스로 「`AC-008` 의 처분이 정해진 뒤의 커밋이 진다」고 적어 두었으므로, 다음 커밋이 최소한 §E.2 `AC-008` 행과 `E08` 「미검증 ②」 절에 **누가·무엇을 근거로 수용했는지**를 적어야 그 약속이 지켜진다. 프런트매터 `status` 전이도 같은 커밋의 몫이다.

### F10 [Low · 비차단] 변이 ⑤ 복원 대조가 새 트리에서 재현되지 않는다 + 기록이 요약형이다

`data/live-env/*.premut` 는 `.gitignore:2 data/` 로 커밋되지 않으므로, 이 저장소를 새로 받은 사람은 절이 지목한 두 `shasum` 을 다시 돌릴 수 없다. 그리고 기록된 `unchanged=yes …` 줄은 명령의 축자 출력이 아니라 요약이다(`verification-claim-integrity.md` §3.2 는 축자를 요구한다). **`AC-011 ㉠` 이 축자 해시를 금하므로 이 자리는 두 요구가 실제로 충돌한다** — 리드의 절충은 합리적이다. **권고** 두 파일의 해시 **앞 8글자**를 싣는다(64자 hex 정규식에 걸리지 않으면서 축자성 일부를 회복한다). §4.4 에서 제가 그 형태로 실제 대조해 일치를 확인했다. 소유: sync (선택).

### F11 [Low · 비차단] 현행 토큰의 앞 8글자가 이제 추적 파일 하나에 들어 있다

```
$ cut -c1-8 data/live-env/token > /tmp/t35-h8
$ git grep -lIf /tmp/t35-h8                       → .moai/reports/t35/sync-audit-2.md 를 뺀 적중 1건
                                                     = .moai/reports/t35/sync-audit.md
$ git grep -lI 'live-dryrun' | wc -l              → 11        ← 대조군: git grep 은 대상을 찾는다
```

1회차 감사 보고서가 자기 F8 항목에서 **현행** 토큰의 접두 8글자를 인용했고, 교정 커밋이 그 보고서를 커밋했다. 1회차 시점에는 추적 트리에 **폐기된** 토큰의 접두만 있었다(그쪽은 `AC-005 ㉣` 이 요구하는 설계상 양성 대조군이다). 256비트 중 32비트, 로컬 개발 전용 토큰이며 어떤 기준도 이를 금하지 않는다(`AC-011` 은 64자, `AC-005` 는 `invite` 표준출력을 겨눈다). **조치 불요 · 기록만.** 이 보고서는 같은 값을 싣지 않는다.

### F12 [Low · 비차단] §E.4 머리글이 「처분 33~36」이라 적는데 본문은 33·34·35 셋만 열거한다

`progress.md` §E.4 첫 항목의 `리드 처분 33~36 으로 차단 셋을 닫았다` vs 아래 절 제목 셋(처분 33 · 34 · 35). 처분 36 이 무엇인지 문서 어디에도 없다. 한 글자 수정.

---

## 6. 확인하지 못한 것 (명시)

1. **커버리지를 재지 못했다 — 통과로도 실패로도 적지 않는다.** `grep -rn 'coverage' package.json server/package.json channel/package.json` → `channel/package.json:19` 의 devDependency `@vitest/coverage-v8` **하나뿐**이고, 어떤 `test` 스크립트에도 `--coverage` 가 없으며 임계값 설정도 없다(`server/vitest.config.*` 는 존재하지 않는다). 도구 부재는 Gap 이지 PASS 가 아니다. Craft 0.75 는 프로파일의 커버리지 앵커에 대고 잰 값이 **아니다.**
2. **예행(`npm run live-dryrun`)을 다시 돌리지 않았다.** 그 실행은 `evidence/dryrun/` 아래 산출물을 덮어쓰므로 「산출물 읽기 전용」 제약을 넘는다. 대신 **기계가 쓴 `dryrun-report.txt` 와 사람이 쓴 `E14-dry-run.txt` 를 대조**하고, 그 값들이 HEAD 의 스크립트가 낼 수 있는 값인지 판정식을 직접 읽어 확인했다. 「이 트리에서 다시 돌려도 PASS 가 나온다」는 **재현하지 않았다.**
3. **`AC-001`~`AC-004` 를 스크립트 재실행으로 다시 세우지 않았다.** 서버 기동·포트 점유가 필요해 감사 범위를 넘는다. 증거 파일 판독과 §E.2 서술의 일치까지만 확인했다.
4. **변이 ⑤ 의 「승인 창」 관측 세 건은 여전히 재현 불가**다 — 운영자 눈 관측이고 디스크에 산출물이 없다.
5. **`AC-008` 의 양성 대조군을 제가 대신 세우지도 않았다.** 봇 세션이 필요하고 그것은 사람 손 다섯을 요구한다. `scripts/live-env.sh status` 를 돌려 서버가 내려가 있음을 확인하는 데 그쳤다(리드 기록의 `exit=2` 와 일치).
6. **게이트 흔들림의 원인을 규명하지 않았다.** 이번 실행은 초록이었다. 제가 세운 것은 「이 카드가 원인일 수 없다」까지이고(§4.1 + `git diff origin/main..HEAD -- channel server/src` → 0), 「원인이 부하다」는 재현하지 못했다 — 별도 카드로 이월.
7. **추적 트리 전체의 64자 hex 절대 수를 값으로 적지 않았다.** 그 명령(`AC-011 ㉡`)의 정의역에 이 보고서 파일이 들어가므로, 값을 적는 문장이 스스로 자기 분모를 움직인다. 재확인은 `acceptance.md AC-011` 의 측정 블록을 그대로 다시 돌려서 한다. (이 보고서가 더한 문언에 64자 hex 는 없다 — 그래서 §4.4 의 해시를 앞 8글자로 잘라 실었다.)
8. **`moai update` 가 `template_managed` 파일을 어떻게 다루는지 재현하지 않았다.** 형제 SPEC 편집 금지는 `AC-016` 자신의 [HARD] 에 근거한 것이지 도구 동작 관측이 아니다.

---

## 7. 왜 점수가 통과선에 닿지 않는가 — 감도 분석

조화평균은 낮은 값에 끌리므로, **어느 차원을 얼마나 올려야 통과선에 닿는지**를 계산해 둔다. 리드가 판단할 때 이 숫자가 필요하다.

| 가정 | 총점 | 0.80 | 0.85 |
|---|---|---|---|
| 현행 (F .70 / S .75 / C .75 / Co .70) | **0.724** | ✗ | ✗ |
| Functionality 를 0.75 로 | 0.737 | ✗ | ✗ |
| Functionality 를 0.85 로 | 0.759 | ✗ | ✗ |
| **Functionality 를 1.00 으로** (미관측 0 · 전부 통과) | **0.785** | ✗ | ✗ |
| 이론적 상한 (F 1.00 / S .75 / C .75 / Co 1.00) | 0.857 | ✓ | ✓(간신히) |

**읽어야 할 것 셋.**

1. **Functionality 점수는 이 판정에서 결정적이지 않다.** `AC-008` 을 통과로 올려 16/16 을 만들어도 총점은 0.785 로 0.80 에 닿지 않는다. 그러므로 §1.2 의 방화벽 모호성도, 리드가 물은 「미관측이 FAIL 인가」도 이번 판정을 바꾸지 않는다.
2. **끌어내리는 것은 Security·Craft 의 구조적 상한 0.75 다.** Security 는 `ps eww` 통로가 공시된 채 열려 있어 앵커상 0.75 가 최대이고(1.00 은 "No findings of any severity" 를 요구한다), Craft 는 **커버리지를 잴 도구가 없어** 1.00 앵커("Coverage >= 85%")를 원리적으로 만족시킬 수 없다. 둘 다 이 카드가 **범위 밖으로 명시한** 항목이다(`spec.md` §5).
3. **따라서 이번 FAIL 은 남은 결함만의 결과가 아니라, 채점표와 이 카드의 맞물림의 결과이기도 하다.** 통과선을 넘으려면 Functionality 와 Consistency 를 **둘 다 사실상 만점**으로 만들어야 하는데, 그것은 §5 의 차단 둘(F1·F2)과 잔재 넷을 전부 닫는 것으로 Consistency 는 0.85~0.90 까지 갈 수 있어도 — F 1.00 / Co 0.90 조합의 총점이 **0.837** 이라 0.80 은 넘고 0.85 는 넘지 못한다. **즉 이 카드는 0.80 선에서는 다음 회차에 통과 가능하지만, 0.85 선에서는 `ps eww` 또는 커버리지 배선 가운데 하나를 이 카드 범위 안으로 들이지 않는 한 통과가 사실상 불가능하다.** 이것이 §1.1 의 통과선 모호성이 **다음 회차에는 결정적이 되는** 이유이며, 리드가 지금 정해 두어야 할 값이다.

---

## 8. 처분 요약

**차단 (가장 심각한 순서)**

| # | 발견 | 심각도 | 소유 | 요구되는 수리 |
|---|---|---|---|---|
| **F1** | 교정 커밋이 자기 완료 기록 두 문장을 거짓으로 만들었다 (`progress.md:162` 의 `version: "0.5.0"` · §E.4 「CHANGELOG 에 합계를 싣지 않았다」) | **High** | sync | 두 문장을 현재 사실로 고친다 (각 한 줄) |
| **F2** | §E.4 「처분 대기」 절이 시점 표지 없이 현재형으로 남아 바로 아래 절과 모순된다 | **Medium** | sync | 절 머리에 `[처분 전 기록]` 시점 표지 한 줄 |

**비차단** — F3(E14 SHA 귀속) · F4(E16 SHA 귀속) · F5(`pgrepCount` 잠재 공허) · F6(㉢ 제목) · F7(`scripts/` 미검사) · F8(㉢ 관측 창) · **F9(운영자 수용 기록 — 다음 커밋 필수)** · F10(복원 대조 재현성) · F11(토큰 접두 8글자) · F12(처분 번호 33~36)

**관측으로만 이월 (리드 지시대로 재론하지 않음)** — 형제 울타리 측정 ②가 `live-env.sh` 의 `exec claude` 를 보지 못함 · 커버리지 배선 부재 · 빨간 게이트 1회(이번 회차 초록, 「이 카드가 원인일 수 없다」까지만 성립)

---

## 9. 리드가 명시적으로 물은 것들에 대한 답

| 물음 | 답 |
|---|---|
| **F1 은 닫혔나** | **닫혔다.** (a) 제목이 세 판별자를 정확히 요약하지는 않으나 자기모순은 사라졌고 판정선이 도달 가능하다 → F6(Low). (b) 기록된 대조군은 **bash 닮은꼴이 맞다** — 스크립트의 `===` 가 아니라 bash 의 `test` 를 시험한다. 그러나 이번 실행의 비공허성은 스크립트 자신의 출력 셋(`narrow_before=1`·`narrow_after=1`·`descendant_any=2`)이 독립적으로 세운다. 남는 것은 미래 회차의 잠재 공허 → F5(Medium, 비차단). (c) `narrowBefore` 포착(`:55`)은 첫 spawn(`:60`)을 **앞선다** ✅. 다만 창의 뒤쪽이 ⑧⑨보다 먼저 닫힌다 → F8(Low). |
| **F2 는 닫혔나** | **측정 부재는 닫혔다.** 기준은 미관측이며 그것이 **옳은 처분**이다(FAIL 아님 — Then 이 측정돼 통과했고 Given 의 대조군만 미성립). **「같은 파일」 독해도 옳다** — 원문이 「같은 파일」과 「그 시각」 둘을 요구하고, 제가 훑은 결과 두 면이 한 파일에서 만나는 자리는 없다. **셈 전파는 완전하다** — 낡은 「16/16」 0건, 값으로 훑어 확인. **남는 것은 운영자 수용 기록**(F9, 후속). |
| **F3 은 닫혔나** | **닫혔다.** 정정에 대조군 붙은 실측 표가 있고, 요구되지 않은 것(틀린 전제의 출처가 카드 지시였다는 기록)까지 했다. |
| **미관측이 옳은 처분인가, FAIL 인가** | **미관측이 옳다.** `default.md` § Evaluation Rules 가 "Mark unverifiable criteria as UNVERIFIED, not PASS" 로 못박고, FAIL 이 아닌 이유는 측정된 부분이 통과했기 때문이다. |
| **놓친 무언가가 이미 대조군을 채우고 있나** | **없다.** `api=true` 관측 셋(M01 두 자리 · E09 하나)은 전부 훑기가 실리지 않은 파일에 있고, 훑기가 실린 유일한 파일(E08)에는 붙어 있던 관측이 없다. |
| **`16/16` 이 어딘가 살아 있나** | **없다.** 값으로 훑은 적중 전건을 §3 F2(라)에 분류표로 실었다 — 남은 것은 이력 표 행(시점 귀속 있음) · 형제 SPEC 의 12항 셈 · REQ/AC **예산** 상한 셋뿐이다. |
| **해시 원문을 뺀 판단이 옳았나** | **옳다.** `M01-mutation.txt` 는 `AC-011 ㉠` 의 정의역(`evidence/`) 안이고 SHA-256 은 64자 hex 다. 실었으면 실제로 빨개진다. 절도 실질적이다 — 제가 두 해시 쌍을 직접 대조해 일치를 확인했다. 다만 앞 8글자를 싣는 절충을 권고한다(F10). |
| **`0.5.0 → 0.6.0` 버전 올림이 옳았나** | **옳았다.** 이 파일의 HISTORY 규약 자신이 그렇게 요구한다 — 0.2.0(plan 감사 수리) · 0.3.0(2회차 수리) · 0.4.0(run 실측 개정) · 0.5.0(M8) 이 모두 「본문이 바뀐 회차마다 한 행」이다. 이번 회차는 `spec.md`·`plan.md`·`acceptance.md` 세 본문 + 스크립트 + 증거 넷이 바뀐 개정이므로 조용히 넘기면 다음 회차가 왜 바뀌었는지 재구성할 수 없다. **다만 값을 치렀다** — 그 올림이 `progress.md:162` 를 거짓으로 만들었고 그 자리를 함께 훑지 않았다(F1). 「정정은 스스로 낡은 기록을 남긴다」의 교과서적 사례다. |
| **통과선 모호성이 판정을 바꾸나** | **바꾸지 않는다.** 0.724 는 0.80 미만이고 0.85 미만이다. 리드가 정한 에스컬레이션 조건(0.80~0.85 사이)에 **해당하지 않는다.** 다만 §7 이 보이듯 **다음 회차에는 결정적이 된다** — 남은 결함을 전부 닫아도 0.837 근처가 상한이라 0.80 은 넘고 0.85 는 못 넘는다. 그 값을 지금 정해 두기를 권고한다. |

---

## 10. sync 레인의 자기 신고에 대한 평가

**이번에도 정직했고, 이번에는 더 나아갔다.** 리드는 세 가지를 스스로 올렸다 — `AC-008` 을 통과에서 미관측으로 **내렸고**(자기에게 불리한 방향이다), 대조군이 bash 닮은꼴인지 **직접 물었으며**, 셈 전파를 「내가 했다고 주장하는 것이니 시험하라」고 명시했다. 셋 다 감사가 파고들 자리를 미리 열어 준 것이고, 제가 시험한 결과 **세 주장 모두 사실이었다.**

제가 다시 잰 값 가운데 **반증된 것은 하나도 없다.** 게이트 369, 형제 울타리 다섯, 증거 64자 hex 0건, 형제 SPEC 0줄, REQ/AC 16·16, `site=` 12·12, 변이 ⑤ 복원 해시 두 쌍 — 전부 일치했다.

**리드가 놓친 것은 자기 교정이 만든 자국이다.** F1(완료 기록 두 문장) · F2(시점 표지 없는 처분 대기 절) · F3(E14 의 SHA 귀속) 셋은 모두 **이번 교정 커밋이 스스로 만들었거나 스스로 낡게 만든 자리**다. 1회차가 F3(D-1 낡은 자리 셋)에서 이름댄 것과 정확히 같은 부류이고, 그 회차의 교훈이 **한 회차 만에 같은 커밋 안에서 재현됐다.**

이것이 이번 FAIL 의 성격이다. 남은 결함은 전부 한 줄짜리 문서 수정이고, 실질은 대부분 서 있다. 그러나 **「기록이 사실과 어긋난다」를 잡겠다는 카드의 완료 기록이 사실과 어긋난 채로는 닫을 수 없다.**
