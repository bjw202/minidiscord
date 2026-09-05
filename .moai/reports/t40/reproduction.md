# t40 — 조용한 초록 재현 보고 (plan 단계 사전 실측)

- 나무: `.claude/worktrees/t40` · 브랜치 `WT-quiet-green` · base `0775b4e` (= origin/main)
- 셸: `zsh 5.9` (`SHELL=/bin/zsh`) · `CLAUDE_PROJECT_DIR` 미설정(빈 값) → `moai gate` 는 cwd 로 프로젝트를 정한다
- 증거 원본: `.moai/reports/t40/evidence/`

## 1. 주장 (Claim)

카드가 든 세 사례는 **모두 재현된다.** 그러나 카드가 세운 두 갈래
(㉮ 검사가 돌았는데 통과 · ㉯ 돌 것을 못 찾아 통과)로는 셋이 갈리지 않는다.
실측이 낸 것은 **세 가지 서로 다른 모양**이고, 그중 하나는 카드의 두 갈래 어디에도 없다.

## 2. 증거 (Evidence)

### 기준선 — 정상 나무에서의 게이트

```
$ moai gate > gate-baseline.out 2> gate-baseline.err
RC=0
stdout=0 stderr=0
real 1:21.75
```

정상 통과는 **81초, 양쪽 스트림 0바이트, RC=0**. 통과 시 게이트는 아무 말도 하지 않는다.

### 게이트가 실제로 도는 것 (문서 주장이 아니라 실측)

실패 출력(`gate-failtest.err`, 2081바이트)에 도는 명령이 축자로 찍힌다:

```
quality gate failed: npm test
> npm test --workspaces --if-present --passWithNoTests
```

이 프로젝트에서 게이트의 단계는 **`npm test --workspaces --if-present --passWithNoTests` 하나뿐**이다.
lint·vet·type 단계는 돌지 않는다. `channel` 은 자기 `pretest: tsc` 를 갖고 있어 타입 검사가 npm test
안에 딸려 오지만(출력에 `@minidiscord/channel pretest > tsc` 가 찍힌다), `server` 에는 `pretest` 가 없다.

```
$ grep -n '"pretest"' server/package.json channel/package.json
channel/package.json:12:    "pretest": "tsc",
```

### 사례 ① — zsh 조용한 0 (t34 H-01 이월)

```
$ grep -rl 'ConnInfo' .moai/specs --include='*.md' > /tmp/t40/scope.txt; wc -l < /tmp/t40/scope.txt
10
$ F=$(cat /tmp/t40/scope.txt); set -- $F; echo $#
1                       ← zsh: 파일 10개가 이름 하나로 넘어간다
$ grep -n -- 'ConnInfo' $F 2>/dev/null | wc -l ; echo RC=$?
0
RC=0                    ← 조용한 0
$ /bin/bash -c 'F=$(cat /tmp/t40/scope.txt); set -- $F; echo argc=$#; grep -n -- "ConnInfo" $F 2>/dev/null | wc -l'
argc=10
74                      ← bash 는 74
$ xargs grep -n -- 'ConnInfo' < /tmp/t40/scope.txt | wc -l
74                      ← 제안된 수리 형식도 74
```

**범위는 한 자리가 아니다.** 계수와 분류는 §6 에서 확정한다 — **선재 37자리**이고,
그중 교정 대상은 25자리다.

> **[정정]** 이 보고서의 초판(커밋 `c4a3f51`)은 이 수를 **25자리**로 적었다. 그 값은 훑기 정규식이
> `[^|]*` 를 써서 **이스케이프된 파이프(`\|`)가 든 행을 통째로 놓친** 결과였다 — SPEC 표의
> `grep -nE '...\|...' $F` 형태 행들이 빠졌다. 교정된 계수는 §6 이다. 초판의 25 와 §6 의 교정 대상 25 가
> 우연히 같은 수이지만 **구성이 다르다** — 같은 값이 두 번 나왔다고 해서 확인된 것이 아니다.

### 사례 ② — 툴체인을 못 찾은 통과 (t39 M6 1차)

```
$ cd .moai && moai gate > gate-p3.out 2> gate-p3.err
RC=0
stdout=0 stderr=416
real 0.029
```

stderr 416바이트는 **설정 디렉터리 경고**일 뿐 「툴체인을 못 찾았다」는 말이 아니다:

```
level=WARN msg="config sections directory not found, using defaults" path=.../.moai/.moai/config/sections
```

즉 `.moai/config/sections` 가 있는 디렉터리에서 같은 일이 벌어지면 stderr 도 0바이트가 된다.
**exit code 도 stdout 도 정상 통과와 구분되지 않는다.** 유일한 국소 판별자는 경과 시간(81초 대 0.03초)이고,
그것을 보는 호출자는 없다.

### 사례 ③ — 타입 오류가 서 있는데 통과 [카드에서 «미검증 후보»였음 → 재현 성공]

`server/test/` 에 타입 오류 2건을 심었다:

```
$ npm run typecheck -w server ; echo RC=$?
RC=1                    ← 타입 검사는 이 오류를 잡는다
$ moai gate > gate-typeerror.out 2> gate-typeerror.err
RC=0
stdout=0 stderr=0
real 1:21.10            ← 정상 통과(1:21.75)와 시간까지 같다
```

대조 변이 — 실패하는 시험 하나를 심으면 게이트는 실제로 막는다:

```
$ moai gate ; echo RC=$?
RC=1
stderr=2081             ← 시험 단계는 실제로 돌고, 실제로 게이트한다
```

## 3. Baseline 귀속

위 모든 수치는 이 나무(`0775b4e`)에서 이번 회차에 직접 실행해 관측한 것이다.
탐침 파일 둘은 측정 후 제거했고 `git status --short` 는 런타임 산출물 셋만 남긴다.
`npm run typecheck -w server` 는 제거 후 RC=0 으로 되돌아왔다.

## 4. 미검증 (Gaps)

- **게이트가 다른 언어 프로젝트에서 무엇을 도는지** 는 재지 않았다. 위 「단계는 npm test 하나뿐」은
  이 저장소(`package.json` 워크스페이스)에 한정된 관측이다.
- **`disabled_steps` 가 비어 있는데도 lint 단계가 안 보이는 이유** 를 규명하지 않았다. eslint 설정 부재로
  건너뛴 것인지, 애초에 JS 툴체인에 lint 단계가 없는 것인지 갈리지 않았다.
- **`--passWithNoTests`** 가 만드는 네 번째 조용한 초록(시험 0건인 워크스페이스)은 재현하지 않았다.
- **t39 M6 1차의 원 스크립트** 를 직접 돌리지 않았다. 같은 모양을 `cd .moai` 로 합성 재현했다.

## 5. 잔여 위험

- 게이트는 통과 시 0바이트를 낸다. 이것은 사례 ②·③ 뿐 아니라 **모든** 조용한 초록의 공통 배경이다.
  세 사례를 개별로 고쳐도 이 배경은 남는다.
- `moai` 는 `~/.local/bin/moai` 의 외부 바이너리이고 소스는 이 기계에 없다. 게이트의 exit code 를
  「못 찾음」과 「통과」로 가르는 수리는 **이 저장소 안에서 할 수 없다.**
- 이 저장소 안에서 할 수 있는 것은 셋이다: `server/package.json` 에 `pretest` 추가(기능 결함 절반),
  `.git_hooks/pre-commit`(저장소가 추적하는 파일) 에서 게이트 호출을 감싸 「못 찾음」을 검출,
  그리고 25자리 명령 형식 교정.


## 6. 자리별 분류 — C 의 분모 (리드 처분 1 선행 조건)

계수 명령 (`$F` 를 낱말 경계로 잡고, 따옴표 친 `"$F"` 를 뺀다):

```
$ grep -rnE '\$F([^A-Za-z0-9_]|$)' --include='*.md' . | grep -v node_modules | grep -v '"\$F"' | wc -l
41                      ← 이 보고서 자신의 4자리 포함
$ ... | grep -v '.moai/reports/t40/' | wc -l
37                      ← 선재 자리
```

초판 정규식이 놓친 이유는 위 [정정] 에 적었다. `\$F` 만으로 훑으면 `$FILE`·`$FUNC`·`$FILE_PATH`·
`$FIGMA_KEY` 같은 **다른 변수**가 49자리로 부풀어 잡힌다 — 낱말 경계가 필수다.

| 부류 | 자리 | 파일 | 판정 |
|---|---|---|---|
| **1 — 실행 레시피** (교정 대상) | **25** | `SPEC-PERMROUTE-001/spec.md` 13 · `progress.md` 12 | 두 표 모두 독자에게 재실행을 **권한다** |
| **2 — 결함을 서술·인용하는 문서** (교정 금지) | **11** | `t34/sync-audit-3.md` 6 · `t34/sync-audit.md` 2 · `agent-memory/sync-auditor/documented-command-can-return-a-silent-zero.md` 2 · 같은 곳 `MEMORY.md` 1 | 이 자리들을 고치면 **결함의 증거 자체가 지워진다** |
| **3 — 거짓 양성** | **1** | `SPEC-LIVEVERIFY-001/plan-audit-5.md:128` | `F` 가 파일 **하나**를 담고 모든 사용이 `"$F"` 로 따옴표 쳐져 있다 |
| 합 | **37** | | |

**부류 1 판정 근거 — 두 표가 스스로 재실행을 권한다:**

- `spec.md:276` 열 머리글이 **「재현 명령」** 이고, 표 직전 문장이 「각 행의 명령을 `scope-ex-self.txt` 에
  대해 **그대로 돌린 출력**이다」라고 적는다.
- `progress.md:399` 표 머리글이 **「이 회차가 실행한 명령과 관측 (전건 재현 가능)」** 이다.

두 문장 다 「이 명령을 다시 돌리면 이 값이 나온다」는 약속이고, zsh 에서는 그 약속이 거짓이다.

**부류 2 판정 근거:** `sync-audit-3.md:377-389` 는 zsh 와 bash 를 **의도적으로 대조**하는 블록이다.
그 안의 `$F` 를 xargs 형으로 바꾸면 대조가 사라져 발견 H-01 이 스스로를 증명하지 못하게 된다.
`documented-command-can-return-a-silent-zero.md:27` 은 이미 xargs 를 **처방**하는 줄이다.

**부류 3 확인:**

```
$ sed -n '128,135p' .moai/specs/SPEC-LIVEVERIFY-001/plan-audit-5.md
$ F=$(ls -t *.jsonl | head -1); echo "file=$F"
file=e4e65020-....jsonl          ← 파일 하나
$ grep -o '...' "$F" | head -3   ← 따옴표 침
```

## 7. 처분 2 의 전제 반증 — 경고는 이미 세 자리에 있다

리드 처분 2 는 「해당 명령 옆에 `zsh 에서 조용한 0` 한 줄만 덧붙이라」고 지시했다.
**그 주석은 이미 있고, 지시된 것보다 강하다.**

| 자리 | 원문 (요약) |
|---|---|
| `spec.md:255` | **[HARD]** 「아래 명령의 `$F` 는 `bash` 의 무인용 단어 분리에 기댄다. `zsh` 는 … 전 어간이 `0` 으로 나온다 — 「적중 없음」이 아니라 **셸이 파일 목록을 한 덩어리 파일 이름으로 넘긴 것**이다. 재현은 `bash` 로 한다」 |
| `progress.md:421` | **[HARD]** 「재현 시 셸 주의. … 이 회차가 실제로 한 번 겪었고, 「할 수 없다/없다」를 관측으로 착각하지 않도록 `spec.md` §6.1 과 증거 파일 머리에 적어 두었다. 재현은 `bash` 로 한다」 |
| `evidence/round4-section6-web-scope.txt:12-13` | 「[주의] 아래 명령의 `$F` 는 bash 의 무인용 단어 분리에 기댄다 … bash 로 돌릴 것」 |

이 세 자리는 **재현 명령을 읽으려면 반드시 지나는 자리**다 — 표 직전, 표 직후, 증거 파일 머리.

**시간 순서가 결정적이다.**

```
$ git log --oneline -S'bash` 의 무인용 단어 분리에 기댄다' -- .moai/specs/SPEC-PERMROUTE-001/spec.md
c3d1d09  2026-09-03  feat(SPEC-PERMROUTE-001): plan 종결 … (card t34)
$ git log --format='%h %ad' --date=short -1 -- .moai/reports/t34/sync-audit-3.md
83c3078  2026-09-04
$ git merge-base --is-ancestor c3d1d09 83c3078 && echo YES
YES
```

**경고가 감사보다 하루 먼저 착지했다.** 그런데 H-01 본문은 이 경고를 한 번도 언급하지 않는다:

```
$ sed -n '371,405p' .moai/reports/t34/sync-audit-3.md | grep -c '재현은 bash 로 한다\|셸 주의\|무인용 단어 분리에 기댄다'
0
```

H-01 은 「다음 사람은 모든 어간에서 `0` 을 보고 「뒤집힌 자리가 없다」고 읽는다」고 적었지만,
문서는 **그 두 줄 위에서 [HARD] 로 정확히 그 오독을 금지하고 있었다.** H-01 자신이 미검증 전제 위에
선 권고다 — `verification-claim-integrity.md` §1.1 surface 4(권고 전제 주장).

### 그래도 남는 것 — 지시에 의한 완화 대 구성에 의한 완화

H-01 이 처방한 것은 `xargs grep -n -- '<어간>' < scope-ex-self.txt` 라는 **셸 무관 형식**이었다.
현재 경고가 처방하는 것은 「`bash` 로 돌려라」라는 **지시**다. 둘의 차이는 실재한다 —
지시는 복사·붙여넣기 하는 사람이 건너뛸 수 있고, 셸 무관 명령은 건너뛸 수가 없다.

그러나 명령 본문을 `xargs` 형으로 바꾸는 것은 **완결 SPEC 의 본문 편집**이고, 리드 처분 2 가
금지한 것이다. 따라서 C 에 남은 허용 행위는 **없거나 거의 없다.** 이 판단은 리드 소관이므로
여기서 설계하지 않고 되올린다.
