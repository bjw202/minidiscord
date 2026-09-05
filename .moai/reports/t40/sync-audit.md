# sync 감사 보고서: SPEC-GATECHECKS-001 (카드 t40)

| 항목 | 값 |
|---|---|
| 대상 | 나무 `.claude/worktrees/t40` · 브랜치 `WT-quiet-green` · HEAD `da38362` + 미커밋 sync 편집 4파일 |
| 렌즈 | `--consistency --docs` |
| Tier | **M** (`spec.md` frontmatter `tier: M`) |
| 통과선 | **0.80** — SSOT `.claude/rules/moai/workflow/spec-workflow.md:335` (「Tier S `0.75`, Tier M `0.80`, Tier L `0.85`」). 디스패치가 준 값이 아니라 내가 직접 읽었다 |
| 총점 | **0.897** (가중 조화평균) |
| 판정 | **PASS** |
| 차단 발견 | **0건** |
| 비차단 발견 | 6건 |

감사관은 트리를 편집하지 않았다. 이 보고서 파일 하나만 썼다. `moai gate` 와 전체 `npm test` 는 지시대로 돌리지 않았다.

---

## 1. Claim (주장)

이 감사가 세우는 주장은 다섯이다.

1. **C-1.** `server`/`channel` 의 `pretest` 모양 비대칭은 **의도이고 정당하다**. 베끼면 REQ-GATECHECKS-005 를 어긴다.
2. **C-2.** 게이트가 도는 타입 검사와 CI 가 도는 타입 검사는 **같은 스크립트 한 자리**(`server/package.json:9`)를 참조한다. 명령 본문의 표류는 구조적으로 막혔다 — 다만 **호출 자리의 제거**는 막히지 않았다(F-N1).
3. **C-3.** `spec.md` §5 의 열린 항목은 **열림 4 · 미검증 4 · 기록 1**이고, sync 회차가 그중 하나도 닫지 않았다. 지목된 두 항목((a) C 의 편집 0줄 종결 · (b) 계획 감사 0.800 의 `53fa29a` 귀속)은 **둘 다 열린 채로 명시**돼 있다.
4. **C-4.** `CHANGELOG.md` · `README.md` 어느 쪽도 **조용한 초록 문제가 해결됐다고 읽히지 않는다.** 게이트 종료 코드의 몫이 t41 이라는 경계가 `CHANGELOG.md` 본문에 명시돼 있다.
5. **C-5.** 게이트 실행 넷은 **전부 실재하는 `.exit` 파일**을 인용하고, server/channel 판별 명령은 **대조군과 함께 실제로 판별한다**(재실행으로 재현).

---

## 2. Evidence (증거 — 명령과 축자 출력)

### 2-1. 초점 1 — 일관성: CI 와 게이트가 같은 자리를 보는가

```
$ sed -n '27p' .github/workflows/ci.yml
      - run: npm run typecheck -w server

$ grep -nE '"(pre)?test"|"typecheck"|"build"' server/package.json channel/package.json
server/package.json:7:    "pretest": "npm run typecheck",
server/package.json:8:    "test": "vitest run",
server/package.json:9:    "typecheck": "tsc --noEmit"
channel/package.json:11:    "build": "tsc",
channel/package.json:12:    "pretest": "tsc",
channel/package.json:13:    "test": "vitest run",
channel/package.json:14:    "typecheck": "tsc --noEmit"
```

CI(`ci.yml:27`)와 `server` 의 `pretest`(`:7`)가 **둘 다 `server/package.json:9` 의 이름 붙은 `typecheck` 를 부른다.** 명령 본문을 고치면 양쪽이 함께 움직인다 — C-2 의 앞부분이 선다.

**비대칭의 판정(추측 아님).** 세 사실이 겹친다.

```
$ sed -n '6,8p' channel/package.json      →  "bin": { "minidiscord-channel": "./dist/index.js" }
$ sed -n '8,12p' server/tsconfig.json     →  "outDir": "dist" ... "include": ["src", "test"]
$ ls -d server/dist                       →  ls: server/dist: No such file or directory
$ ls -d channel/dist                      →  channel/dist
```

`channel` 은 `bin` 이 `dist/index.js` 를 가리키므로 그 훅이 **실제로 emit 해야** 한다. `server` 는 `include` 에 `test` 가 들어 있고 `outDir` 이 `dist` 라, 인자 없는 `tsc` 를 그대로 베끼면 **시험까지 컴파일한 `server/dist/` 가 생긴다** — REQ-GATECHECKS-005(`spec.md:82`, "`shall not emit`")를 정면으로 어긴다. 따라서 `--noEmit` 을 거치는 `npm run typecheck` 형태는 **비대칭이 아니라 요구사항의 귀결**이다. 비대칭은 사고가 아니라 설계다.

### 2-2. 초점 2 — 문서 무결성: 열린 항목 계수(내가 직접 셈)

```
$ S=.moai/specs/SPEC-GATECHECKS-001/spec.md
$ grep -cF '[열림]'   "$S"   → 4
$ grep -cF '[미검증]' "$S"   → 4
$ grep -cF '[기록]'   "$S"   → 1

[대조군 — 없어야 하는 표지]
$ grep -cF '[해결됨]' "$S"   → 0
$ grep -cF '[종결]'   "$S"   → 0
$ grep -cF '[닫힘]'   "$S"   → 0
```

**대조군이 이 `0` 을 「없다」로 만든다.** 같은 형태의 있는 표지가 4·4·1 을 내고 없는 표지 셋이 0 을 내므로, `0` 이 「패턴이 고장났다」가 아니라 「그 표지가 없다」의 뜻이다.

HEAD `da38362` 사본에서도 같다.

```
$ git show da38362:.moai/specs/SPEC-GATECHECKS-001/spec.md > /tmp/t40head_spec.md
$ grep -cF '[열림]' /tmp/t40head_spec.md   → 4
$ grep -cF '[미검증]' /tmp/t40head_spec.md → 4
$ grep -cF '[기록]' /tmp/t40head_spec.md   → 1
$ grep -cF '[해결됨]' /tmp/t40head_spec.md → 0
$ grep -cF '[종결]' /tmp/t40head_spec.md   → 0
```

작업 트리와 HEAD 가 동일하다. §E.4 의 계수 주장은 **재현된다.**

표지가 붙은 아홉 줄의 자리도 확인했다 — 전부 §5 안이다.

```
$ grep -nF -e '[열림]' -e '[미검증]' -e '[기록]' "$S"
122 · 123 · 130 · 136 · 141 · 142 · 143 · 144 · 145
```

**지목된 두 항목이 살아 있는가:**

- **(a) C 의 편집 0줄 종결** → `spec.md:122` 「**[열림]** 지시에 의한 완화 ≠ 구성에 의한 완화 … 닫으려면 완결 SPEC 의 본문을 편집해야 하고, 운영자가 그것을 배제했다.」 **열림.**
- **(b) 0.800 의 `53fa29a` 귀속** → `spec.md:123-129` 「**[열림]** plan 단계 최종 감사 점수는 이 트리를 잰 값이 아니다. … 커밋 `53fa29a` 에 귀속된다. 그 뒤의 `1fe923c` … 와 `d367db2` 의 변경은 **측정되지 않았다.**」 **열림.**

귀속이 사실인지도 확인했다.

```
$ git log --oneline -6
da38362 fix(SPEC-GATECHECKS-001): 증거 귀속 교정 2건 …
5993b7d feat(SPEC-GATECHECKS-001): run 완료 …
d367db2 docs(t40): 2회차 계획 감사 보고 …
1fe923c fix(SPEC-GATECHECKS-001): 감사 2회차 차단 B-1r 교정 …
53fa29a feat(SPEC-GATECHECKS-001): plan 종결 — 감사 PASS 0.80 …
```

0.800 이후 커밋 넷이 미측정 — §5 의 서술 그대로다. `CHANGELOG.md:26` 도 같은 말을 같은 SHA 로 반복한다.

### 2-3. 초점 2 — 「조용한 초록을 풀었다」로 읽히는가

과대주장 어휘를 t40 항목에 대고 훑되, **대조군을 같은 파일에서 잡았다.**

```
$ sed -n '5,33p' CHANGELOG.md | grep -nE '해결|닫았|닫혔|고쳤|끝났|완전|더 이상|이제'
7: … 이제 server 도 그 목록에 들어갑니다.        ← 적중 1건
$ grep -cE '해결|닫았|닫혔' CHANGELOG.md        → 17   ← 대조군: 이 패턴은 이 파일에서 실제로 적중한다
$ grep -n '조용한 초록' CHANGELOG.md README.md  → (없음)
```

유일한 적중은 「이제 server 도 그 목록에 들어갑니다」로, 범위가 정확하다. 그리고 경계는 `CHANGELOG.md:17` 에 **명시적으로** 적혀 있다:

> 「게이트는 지금도 「돌 것을 찾지 못해서 통과」와 「전부 돌고 통과」를 똑같은 `0` 으로, 똑같은 0바이트 침묵으로 냅니다. 그 둘은 밖에서 구분되지 않습니다. `moai` 는 이 저장소 밖의 바이너리라 여기서 고칠 수 없고, 그 몫은 카드 `t41` 입니다.」

`README.md:261` 의 새 문단도 범위가 좁다 — 「**타입 오류가 있는 트리에서도** 게이트가 조용히 통과했습니다」이지 「조용한 초록이 없어졌습니다」가 아니다. **C-4 가 선다.**

### 2-4. 초점 3 — 증거 귀속

`.exit` 파일 다섯이 전부 실재하고 값이 §E.2 표와 일치한다.

```
$ for f in *.exit; do printf '%s: ' "$f"; cat "$f"; done   (in .moai/reports/t40/evidence/run/)
AC001-typecheck.exit: exit=1
G1-precondition4.exit: exit=0
G2-forward.exit: exit=1
G3-reverse.exit: exit=0
G4-regression.exit: exit=0
```

**판별 명령을 내가 다시 돌렸다 — 재현된다.**

```
$ grep -c 'RUN  v.*/server$'  run/G2-forward.err     → 0
$ grep -c 'RUN  v.*/channel$' run/G2-forward.err     → 1
[대조군]
$ grep -c 'RUN  v.*/server$'  gate-failtest.err      → 1   ← 패턴이 server 를 실제로 찾아낸다
$ grep -c 'RUN  v.*/channel$' gate-failtest.err      → 1
```

**대조군이 있으므로 G2 의 `0` 은 「server 가 vitest 를 돌지 않았다」의 뜻이다.** 패턴 고장이 아니다. `G2-forward.err` 축자에도 실패 사슬이 그대로 있다 — `pretest → npm run typecheck → tsc --noEmit → error TS2322 ×2`.

**재실행이 싼 AC 를 다시 돌렸다.**

```
AC-004  $ ls -d server/dist                                         → No such file or directory        PASS
AC-006  $ git diff --stat origin/main -- .github/workflows/ci.yml   → 빈 출력                          PASS
        $ sed -n '27p' .github/workflows/ci.yml                     → npm run typecheck -w server      PASS
AC-007  $ grep -c '무인용 단어 분리에 기댄다' SPEC-PERMROUTE-001/spec.md      → 1
        $ grep -c '재현 시 셸 주의' SPEC-PERMROUTE-001/progress.md            → 1
        $ grep -c 'bash 로 돌릴 것' reports/t34/evidence/round4-…txt          → 1
        $ git merge-base --is-ancestor c3d1d09 83c3078 && echo YES            → YES                     PASS
AC-008  $ git diff --stat origin/main -- .moai/specs/SPEC-PERMROUTE-001/      → 빈 출력                 PASS
AC-010  $ sed -n '7p' server/package.json → "pretest": "npm run typecheck",                             PASS
[덤]    $ npm run typecheck -w server → tsc --noEmit ; exit=0   (깨끗한 트리 · 탐침 파일 부재 확인)
        $ ls server/test/t40-typeerror.probe.ts → No such file or directory
```

**범위 가드 전수.** 카드가 `origin/main` 대비 건드린 것 전부:

```
$ git diff --stat origin/main   (42 files changed, 2048 insertions(+), 0 deletions)
  server/package.json | 1 +
  README.md           | 2 +
  CHANGELOG.md        | 27 +
  … 나머지는 전부 .moai/specs/SPEC-GATECHECKS-001/ · .moai/reports/t40/ · .claude/agent-memory/
```

**삭제 0줄. 완결 SPEC 본문 0줄. `ci.yml` 0줄.** 코드 변경은 `server/package.json` 한 줄이 전부다.

### 2-5. 보안 · 공예 기계 검사

```
[보안 — 카드 diff 대상 훑기 + 대조군]
$ grep -cEi 'password|secret|token|api[_-]?key|BEGIN .*PRIVATE KEY' /tmp/t40_card.diff  → 0
$ grep -cEi 'typecheck' /tmp/t40_card.diff                                             → 6   ← 대조군
[의존성 추가 여부]
$ git diff origin/main -- */package.json package.json | grep '^+' | grep -v '^+++'
+    "pretest": "npm run typecheck",        ← 추가된 것은 이 한 줄뿐. 새 의존성 0
[공예]
$ node -e "JSON.parse(...)"  → server ok / channel ok
$ ls -a | grep -iE 'eslint|prettier'; grep -rn '"lint"' */package.json package.json  → (없음)
```

새 의존성 0 · 셸 메타문자 0 · 비밀 0(대조군 6 이 패턴 작동을 증명) · 네트워크 표면 0. 이 변경은 커밋 전 검사를 **늘리기만** 한다.

린터는 이 저장소에 **설치돼 있지 않다**(eslint/prettier 설정 부재 · `lint` 스크립트 부재). 이것은 PASS 가 아니라 **갭**으로 기록한다(§4). 다만 `spec.md:143` 의 「[미검증] lint 단계가 안 보이는 이유」를 SPEC 이 **닫지 않고 열어 둔 것은 옳다** — 내 관측은 후보 둘(설정 부재 / 툴체인에 단계 없음) 중 하나와 양립할 뿐 가르지 못한다.

---

## 3. Baseline-attribution (기준선 귀속)

- **트리 상태**: `git rev-parse HEAD` → `da38362db0633017159dbdc2db99d1c1940dbfce`, 브랜치 `WT-quiet-green`, `git status --short` 에 추적 파일 수정 4건(`CHANGELOG.md` · `README.md` · `spec.md` · `progress.md`) + 미추적 로그·상태 파일. **§2 의 모든 명령은 이 상태의 작업 트리에서 돌았다.**
- 예외 하나: §2-2 의 두 번째 블록은 `git show da38362:…` 로 뜬 HEAD 사본(`/tmp/t40head_spec.md`)에 귀속된다.
- **재실행하지 않고 파일을 읽기만 한 값**: G1~G4 와 AC001 의 종료 코드·바이트·경과. 출처는 run 회차가 남긴 `.moai/reports/t40/evidence/run/*.exit` · `*.err` 이고, **이 감사 회차가 새로 측정한 값이 아니다.** `moai gate` 재실행은 지시로 금지됐다.
- **통과선 0.80** 은 `.claude/rules/moai/workflow/spec-workflow.md:335` 에서 직접 읽었고, `spec.md` frontmatter `tier: M` 과 짝지었다. 디스패치 문구를 근거로 쓰지 않았다.
- 배점·필수통과는 `.moai/config/evaluator-profiles/default.md`(`harness.default_profile: "default"`, `harness.yaml:7`)에서 읽었다. `evaluator_mode: hierarchical` 이 없으므로 **평면 가중 방식**으로 채점한다.

---

## 4. Gaps (미검증 — 추론으로 채우지 않는다)

- **G-1. 게이트를 이 회차에 돌리지 않았다.** AC-001(양팔)·AC-002·AC-005 의 판정은 run 회차의 `.exit`·`.err` 를 **읽은** 것이고, 내가 잰 것이 아니다. 지시가 `moai gate` 실행을 금지했다. 따라서 「지금 이 트리에서 게이트가 RC 1 을 낸다」는 이 감사의 관측이 아니다.
- **G-2. `npm test` 전체 스위트를 돌리지 않았다.** CI 의 몫이다. 「server pretest 가 실제로 `npm test` 사슬에 끼어든다」는 `G2-forward.err` 축자에서 **읽은** 것이고 이 회차의 실행이 아니다.
- **G-3. 린터·커버리지 측정 없음.** 이 저장소에 린터 설정이 없어 Craft 의 「린트 청결」·「커버리지 ≥ 85%」 축을 기계적으로 재지 못했다. **건너뛴 검사를 PASS 로 세지 않았다.**
- **G-4. `.exit` 파일의 생성 경위를 검증할 수 없다.** 파일 내용·수정 시각(02:33~02:40, 게이트 1회 ≈ 81초와 정합)이 일관되지만, 그 파일이 실제 실행에서 나왔다는 것은 **파일 자신 외의 출처로 확인되지 않는다.**
- **G-5. plan-audit-2 의 비차단 미해결 다섯(N-1 · N-2 · N-3 · N-4 · N-7)의 현재 상태를 전수 확인하지 않았다.** 표본으로 N-3(`spec.md:62` — 여전히 그 문장 존재)과 N-7(`acceptance.md:123` — `# 기대: 27행` 여전히 존재)만 확인했다. 나머지 셋은 미확인.
- **G-6. `--passWithNoTests` 가 워크스페이스 스크립트에 전달되는지** 재지 않았다 — SPEC 이 t41 소관으로 열어 둔 그대로다.

---

## 5. Residual-risk (잔여 위험)

- **R-1. 관측한 것에도 남는 위험**: `pretest` 훅의 방어는 **호출 자리 둘이 모두 살아 있을 때만** 성립한다. 누군가 `server/package.json:7` 한 줄을 지우면 CI(`ci.yml:27`)는 계속 잡지만 **게이트는 다시 조용해진다** — 그리고 그 회귀를 잡는 회귀 시험은 없다(AC-001 은 사람이 손으로 주입해 재는 절차다).
- **R-2.** 게이트의 「통과 = 0바이트 침묵」 설계는 그대로다. 이 카드는 목록에 항목 하나를 더했을 뿐, 목록이 비었을 때의 초록은 여전히 통과와 구분되지 않는다(→ t41). SPEC·CHANGELOG 가 이것을 정직하게 적고 있으나, **위험 자체는 남는다.**
- **R-3.** `spec.md` §6 의 계수와 `progress.md:93` 의 AC-009 적중 수는 자기 산출물을 훑기 범위에 포함하므로 문서가 자랄 때마다 움직인다(F-N4 참조). 시점 없이 인용하면 언제든 거짓이 된다.
- **R-4.** 계획 감사 점수 0.800 은 `53fa29a` 것이고 이후 커밋 넷이 미측정이다. 이 sync 감사(0.897)는 **sync 회차의 4차원 점수이지 계획 감사 점수의 갱신이 아니다.** 둘을 합치거나 대체 관계로 읽으면 안 된다.
- **R-5.** `moai gate` 의 타임아웃 설정은 `gate.yaml` 의 `test: 120`(초)이고 관측된 게이트 실행은 81~83초다. **여유가 40초 남짓**이라, server 스위트가 더 느려지면 게이트가 타임아웃으로 갈릴 수 있다. 이 카드가 만든 위험은 아니나 `pretest` 가 그 시간을 조금 늘린다.

---

## 6. 차원별 점수

| 차원 | 가중 | 점수 | 판정 | 증거(§2 참조) |
|---|---:|---:|---|---|
| Functionality | 40% | **92**/100 | PASS | AC 10/10. 재실행 가능한 여섯(AC-004·006·007·008·010 + 깨끗한 트리 `typecheck` exit=0)을 내가 다시 돌려 재현. AC-001/002/005 는 `.exit` 파일 인용(G-1). 감점: `progress.md:93` 의 AC-009 적중 수가 25 → **현재 26**(F-N4) |
| Security | 25% | **100**/100 | PASS | 새 의존성 0(diff 전체에 추가된 줄이 `pretest` 한 줄뿐) · 비밀 적중 0(대조군 6) · 셸 메타문자 0 · 네트워크 표면 0. 변경은 커밋 전 검사를 늘리기만 한다 |
| Craft | 20% | **88**/100 | PASS | 1파일 1줄, 과공학 없음. JSON 유효. 증거 규율이 이례적으로 강함(`.exit` 파일 · 대조군 동반). 감점: 낡은 `evidence/ac009-widened-classification.txt` 가 새 `run/AC009-classification.txt` 옆에 대체 표시 없이 남음(F-N5). 커버리지·린트는 **미측정**(G-3), PASS 로 세지 않음 |
| Consistency | 15% | **74**/100 | PASS | 비대칭은 정당(REQ-005 의 귀결) · CI ↔ 게이트가 같은 스크립트 자리 참조. 감점 넷: F-N1(절대적 표류 주장) · F-N2(`spec.md:62` 현재형이 `README.md:261` 과 모순) · F-N3(`[기록]` 항목이 CHANGELOG 의 열린 목록에 없음) · F-N6(channel 은 자기 `typecheck` 를 우회해 같은 표류 모양을 유지) |

**필수 통과 방화벽**(`default.md` § Must-Pass Criteria): Functionality — 전 AC 충족 **통과** · Security — Critical/High 0건 **통과**. 방화벽 위반 없음.

**가중 조화평균**

```
H = (0.40+0.25+0.20+0.15) / (0.40/0.92 + 0.25/1.00 + 0.20/0.88 + 0.15/0.74)
  = 1 / (0.43478 + 0.25000 + 0.22727 + 0.20270)
  = 1 / 1.11475
  = 0.897
```

**0.897 ≥ 0.80 (Tier M) → 판정 PASS.**

---

## 7. 발견 목록

### 차단 (blocking) — **0건**

정지시킬 이유를 찾지 못했다. 코드 변경은 한 줄이고, 그 한 줄의 변별력은 같은 회차·같은 트리의 G2/G3 쌍으로 서 있으며, 범위 가드는 전수로 깨끗하고(삭제 0줄·완결 SPEC 0줄), 문서는 열린 항목을 닫았다고 주장하지 않는다.

### 비차단 (optional) — 6건

**F-N1. 표류가 「구조적으로」 막혔다는 것은 명령 본문에만 참이다** — `CHANGELOG.md:19` · (같은 뿌리: `spec.md:83` REQ-GATECHECKS-006) · 심각도 **minor** · 확신 **높음**
> 「… 같은 자리 하나를 참조하게 되어, 한쪽만 바뀌는 표류가 **구조적으로 생기지 않습니다**.」

두 호출자가 같은 스크립트 본문을 부르는 것은 사실이다(§2-1). 그러나 「표류」의 한 갈래 — **호출 자리 자체의 제거**(`server/package.json:7` 삭제, 또는 `ci.yml:27` 삭제) — 는 여전히 한쪽만 바뀌는 표류이고 막혀 있지 않다. 「구조적으로」라는 절대어가 실제 방어 범위보다 넓다. 이 저장소의 감사 이력이 반복해 잡아 온 부류(사실 과대주장)와 같은 모양이나, 정도가 가볍고 **SPEC 자신의 REQ-006 문구를 충실히 옮긴 것**이라 sync 회차가 새로 만든 결함은 아니다 → 비차단.
**요구되는 수정**: `CHANGELOG.md:19` 의 「구조적으로 생기지 않습니다」를 「**명령이 바뀔 때** 한쪽만 바뀌는 표류는 생기지 않습니다(두 호출 자리 중 하나가 지워지는 것은 별개입니다)」로 범위를 붙인다.

**F-N2. `completed` SPEC 본문이 현재형으로 수리 이전 상태를 말한다** — `spec.md:62` · 심각도 **minor~medium** · 확신 **높음**
> 「`server` 에는 `pretest` 가 없다 — 그래서 server 의 타입 오류는 게이트에 보이지 않는다.」

이 문장은 이제 거짓이다. 같은 트리의 `README.md:261` 이 정반대를 말한다. §2 가 「배경 — 실측된 세 가지 모양」이라는 진단 절이고 HISTORY 0.2.0/0.3.0 이 착지를 적고 있어 맥락 안에서 읽으면 「수리 전」으로 읽히지만, **시점 표지가 없다.** 이 저장소의 기록된 규약(「본문은 지금 참, HISTORY 는 그때 참」)과 어긋난다. sync 회차가 「§1~§8 본문 한 글자도 안 고침」을 규율로 삼은 것이 이 자리를 남겼다 — 규율 자체는 공개돼 있어 은폐가 아니다 → 비차단.
**요구되는 수정**: `spec.md:62` 에 시점 절 한 개를 붙인다 — 「(**수리 전 · `5993b7d` 이전 시점**) `server` 에는 `pretest` 가 없었다 …」. 같은 부류로 `spec.md:216`(「당장의 위험을 덮고 있는 것이 이것이다」)도 함께 본다.

**F-N3. `[기록]` 항목 하나가 CHANGELOG 의 「열어 둔 채로 남긴 것」 목록에 없다** — `CHANGELOG.md:21-27` · 심각도 **minor** · 확신 **높음**
CHANGELOG 는 `[열림]` 넷과 `[미검증]` 넷을 정확히 옮겼으나, `spec.md:130` 의 `[기록]` 항목(과대주장의 채점 자리 · 루브릭 공백 → **카드 t42**)은 옮기지 않았다. `grep -n 't42' CHANGELOG.md README.md` → 적중 0. 운영자 처분 「현행 유지」로 닫힌 항목이라 열린 목록에 안 넣은 것은 방어 가능하지만, t42 로 분리된 후속이 사용자 대면 기록에서 사라진다.
**요구되는 수정**: 「열어 둔 채로 남긴 것」에 한 줄 — 「4차원 루브릭에 「사실 정확성」을 담을 자리가 없다는 공백은 카드 `t42` 로 분리했습니다」.

**F-N4. AC-009 적중 수 25 가 이미 26 으로 움직였고, 그 값에 시점이 없다** — `progress.md:93` · 심각도 **minor** · 확신 **높음(재현)**
```
$ grep -rnE '(^|[^0-9.])(21|23|25|28|32|37|46|53)([^0-9.]|$)' .moai/specs/SPEC-GATECHECKS-001/*.md | wc -l
      26          ← run 회차 기록은 25
$ grep -nE '…' .moai/specs/SPEC-GATECHECKS-001/progress.md
93: | AC-GATECHECKS-009 | PASS | 적중 25 · (가)23 · (나)2 · 미분류 0 |
```
**늘어난 한 자리는 이 93행 자신이다** — 자기 참조가 값을 움직인, `spec.md` §6 이 다루는 바로 그 현상. §E.4 는 §6 의 다섯 수에 대해서는 「다시 세지 않았다」를 명시했으나 이 수에는 시점을 붙이지 않았다. 분류표가 줄 번호가 아니라 **내용 앵커**로 적혀 있어 분류 자체는 살아 있다.
**요구되는 수정**: `progress.md:93` 의 「적중 25」에 시점을 붙인다 — 「적중 25 (**`5993b7d` 시점 · 이 표 자신이 훑기 범위 안이라 이후 증가**)」.

**F-N5. 대체된 증거 파일이 대체 표시 없이 남아 있다** — `.moai/reports/t40/evidence/ac009-widened-classification.txt` · 심각도 **minor** · 확신 **중간**
plan-audit-2 의 N-2r 가 이 파일의 줄 번호 표류를 잡았고, run 회차가 앵커 기반의 `run/AC009-classification.txt` 를 새로 만들었다. 그러나 낡은 파일이 같은 증거 트리에 그대로 남아 있고 「대체됨」 표시가 없다 — 나중에 읽는 사람이 어느 쪽이 유효한지 파일만 보고 가를 수 없다.
**요구되는 수정**: 낡은 파일 첫 줄에 `# [SUPERSEDED by run/AC009-classification.txt — 줄 번호 표류(N-2r)]` 한 줄을 넣는다.

**F-N6. `channel` 은 자기 `typecheck` 를 우회해 같은 표류 모양을 유지한다** — `channel/package.json:12` 대 `.github/workflows/ci.yml:28` · 심각도 **minor** · 확신 **높음** · **범위 밖(선재)**
`channel` 의 `pretest` 는 `tsc`(emit)이고 CI 는 `npm run typecheck -w channel`(`tsc --noEmit`)을 돈다 — **서로 다른 명령**이다. server 에 대해 「같은 자리 하나를 참조」를 성취한 논거가 channel 에는 적용되지 않는다. 이 카드가 만든 결함이 아니고 REQ-005 대칭 논거상 불가피한 면도 있으나, F-N1 의 절대적 표현이 **저장소 전체 성질처럼 읽히게** 만드는 배경이다.
**요구되는 수정**: 수정 대상 아님. 후속 카드 후보로만 기록(`channel` 의 `pretest` 를 `npm run build` 로 이름 붙이면 `build`/`pretest` 중복도 함께 정리된다).

---

## 8. 판정

**PASS · 0.897 (Tier M 통과선 0.80) · 차단 0건 · 비차단 6건.**

이 카드는 한 줄을 넣고, 그 한 줄이 판정을 갈랐다는 것을 **같은 회차·같은 트리의 역변이 쌍**으로 세웠으며, 자기가 고치지 않은 것을 사용자 대면 문서에 **명시적으로 적었다.** 열린 아홉 항목 중 하나도 닫혔다고 주장되지 않았고, 그 계수를 대조군과 함께 재현할 수 있다. 비차단 여섯은 전부 문장 수준의 시점·범위 표기이며, 어느 것도 이 수리의 정당성이나 측정을 흔들지 않는다.

---

*감사관: sync-auditor · 프로필 `default` · 평면 가중 방식 · HEAD `da38362` + 미커밋 sync 편집*
