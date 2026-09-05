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

**범위는 한 자리가 아니다.** 따옴표 없는 `$F` 확장은 25자리:

```
$ grep -rnE 'grep [^|]*[^"]\$F\b' --include='*.md' . | grep -v node_modules | wc -l
25
$ grep -rn 'grep .*"\$F"' --include='*.md' . | grep -v node_modules | wc -l
2                       ← 따옴표 친 안전한 형태
$ grep -rlE 'grep [^|]*[^"]\$F\b' --include='*.md' . | grep -v node_modules
.moai/specs/SPEC-PERMROUTE-001/progress.md
.moai/specs/SPEC-PERMROUTE-001/spec.md
.moai/reports/t34/sync-audit.md
.moai/reports/t34/sync-audit-3.md
.claude/agent-memory/sync-auditor/documented-command-can-return-a-silent-zero.md
```

뒤의 셋은 이 결함을 **예시로 인용**하는 문서다(감사 보고 둘·에이전트 기억 하나). 살아 있는 위험은
앞의 두 파일 — `SPEC-PERMROUTE-001` 의 `spec.md` 와 `progress.md` 다. 자리별 계수는 run 단계에서 확정한다.

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
- **25자리의 자리별 분류** (실행용 명령인지 인용인지)를 세지 않았다. 파일 단위까지만 갈랐다.
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
