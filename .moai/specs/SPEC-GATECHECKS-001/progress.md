# SPEC-GATECHECKS-001 — 진행 기록

- 카드: **t40** — 조용한 초록을 잡는다
- 나무: `.claude/worktrees/t40` · 브랜치 `WT-quiet-green` · base `0775b4e`
- 근거: `.moai/reports/t40/reproduction.md` @`05fef76`

## §E.1 Plan-phase Audit-Ready Signal

**상태: plan 산출물 작성 완료 (`status: draft`).**

| 항목 | 값 |
|---|---|
| Tier | M (spec.md · plan.md · acceptance.md · progress.md) |
| REQ | 9 (REQ-GATECHECKS-001 ~ REQ-GATECHECKS-009) |
| AC | 9 (AC-GATECHECKS-001 ~ AC-GATECHECKS-009) |
| 변별 변이를 진 기준 | **AC-GATECHECKS-001** (역변이 필수) |
| 미결 결정 | **없음** — OD-1=(a) · OD-2=(a) 로 리드 처분 7 종결(2026-09-05). 남은 미결은 §run 이월 셋(귀속 보강 · AC-GATECHECKS-001 정방향 · AC-GATECHECKS-003 확정) |
| 코드 편집 예정 | `server/package.json` **1줄** |
| 범위 밖 | B(`.git_hooks` 래퍼) · 게이트 종료 코드 → 카드 t41 |

**계획 단계에 직접 측정한 것:**

- `server` 에 `pretest` 부재 · `channel` 에 존재 — `grep -c '"pretest"'` 로 확인
- `.github/workflows/ci.yml:27` 이 `npm run typecheck -w server` 를 돈다 — grep 확인
- `server/tsconfig.json` 이 `outDir: "dist"` · `include: ["src","test"]` — 인자 없는 `tsc` 가 시험까지 emit 함의 근거 (OD-1 (c) 배제 근거)
- **npm 워크스페이스가 `pretest` 실패를 종료 코드로 옮긴다** — 장난감 워크스페이스 실측 RC=1, 실패 워크스페이스의 `test` 는 건너뛰고 다른 워크스페이스는 계속 돈다 (`plan.md` §B)
- `SPEC-PERMROUTE-001` 의 `[HARD]` 경고 세 자리 존재 + `git merge-base --is-ancestor c3d1d09 83c3078` → YES

**계획 단계에서 닫지 않은 것:** `spec.md` §5 의 열린 위험 2건 + 미검증 4건. **닫혔다고 주장하지 않는다.**

## §E.2 Run-phase Evidence

원본 출력 전부: `.moai/reports/t40/evidence/run/`. 아래 바이트·경과는 그 파일들에서 나온 값이고, **RC 는 각 실행의 `.exit` 파일에 축자로 있다** — `G1-precondition4.exit` · `G2-forward.exit` · `G3-reverse.exit` · `G4-regression.exit` · `AC001-typecheck.exit`.

> **[교정 · 리드 지적]** 초판은 RC 를 이 산문에만 적었다. 그것은 이 SPEC 이 OD-2 를 (a) 로 닫은 바로 그 이유 — 「인용 대상 RC 가 어떤 증거 파일에도 없으면 미귀속 인용이 된다」 — 를 스스로 어긴 것이다. 네 팔을 **같은 트리에서 다시 떠서** `echo "exit=$?"` 를 파일로 남겼다. 재실행은 원 측정을 재현했다: `G2-forward.err` 는 **1813바이트로 동일**하고, 차이는 vitest 의 `Start at` 시각과 `Duration` 두 줄뿐이다.

### 게이트 실행 넷 (같은 회차 · 같은 트리)

| # | 트리 상태 | RC | stdout | stderr | 경과 | 세우는 것 |
|---|---|---|---|---|---|---|
| G1 | 깨끗 · `pretest` **없음** | 0 | 0바이트 | 0바이트 | 81.63초 | `plan.md` §B 전제 4 (이 트리에서 재측정) |
| **G2** | `pretest` **있음** · 타입 오류 2건 | **1** | 0바이트 | **1813바이트** | 66.73초 | **AC-001 정방향** · AC-003 · AC-005 첫 행 |
| **G3** | `pretest` **없음** · 타입 오류 2건 | **0** | 0바이트 | 0바이트 | 81.68초 | **AC-001 역변이 (RED 복귀)** |
| G4 | 깨끗 · `pretest` 있음 | 0 | 0바이트 | 0바이트 | 82.58초 | AC-002 회귀 가드 (81±30초 대역) |

**G2 대 G3 이 이 카드의 중심 측정이다.** 트리에서 다른 것은 `server/package.json` 의 `pretest` **한 줄**뿐이고, 그 한 줄이 RC 를 1 과 0 으로 가른다. 계획 단계에 같은 주입으로 잰 값은 RC=0 이었다(`evidence/gate-typeerror.*` — 0바이트 · 81초). **AC-001 은 공허하지 않다.**

### 주입의 성질 (굵은 변이 아님)

주입은 `server/test/t40-typeerror.probe.ts` 의 **타입 오류 2건**이다(`npm run typecheck -w server` → RC=1 · `error TS` 적중 **2**). 시험 실패가 아니다 — 시험 실패는 수리 이전에도 게이트를 RC=1 로 만들므로(계획 단계 대조 실측 stderr 2081바이트) 그 변이로는 `pretest` 의 기여가 측정되지 않는다.

### AC-003 — 추론이 관측으로 바뀌었다

계획 감사 2회차까지 AC-003 은 「tsc 는 stdout 에 쓰고 게이트가 그것을 자기 stderr 로 합류시킨다」는 **추론**이었다. G2 가 그것을 관측으로 바꿨다 — `G2-forward.err` 축자:

```
npm error Lifecycle script `typecheck` failed with error:
npm error command sh -c tsc --noEmit
test/t40-typeerror.probe.ts(3,7): error TS2322: Type 'string' is not assignable to type 'number'.
test/t40-typeerror.probe.ts(4,44): error TS2322: Type 'string' is not assignable to type 'number'.
```

실패 사슬이 `pretest → typecheck → tsc --noEmit` 로 찍히고 `error TS` 진단이 파일·줄·열과 함께 나온다. **시험 실패와 구분된다** — 시험 실패 출력에는 `FAIL … AssertionError` 와 vitest 요약이 나오고 `error TS` 는 없다.

### 덤 — 장난감으로만 재던 전제가 이 저장소에서 관측됐다

G2 의 같은 출력이 `plan.md` §B 의 두 주장을 실물로 세운다. **부재를 보이는 명령은 무엇이 없는지를 스스로 가려야 하므로**(리드 지적), 워크스페이스를 이름으로 다는 `RUN v…` 배너로 잰다 — `evidence/run/AC003-vitest-discriminator.txt`:

```
[G2 · 수리 후 · 타입오류 2건]
$ grep -c 'RUN  v.*/server$'  G2-forward.err   → 0    ← server 는 vitest 를 돌지 않았다
$ grep -c 'RUN  v.*/channel$' G2-forward.err   → 1    ← channel 은 돌았다

[대조군 · 계획 단계 시험실패 출력 · 수리 전]
$ grep -c 'RUN  v.*/server$'  gate-failtest.err  → 1  ← 같은 패턴이 server 를 찾아낸다
$ grep -c 'RUN  v.*/channel$' gate-failtest.err  → 1
```

**대조군이 이 부재를 증거로 만든다.** 안 맞는 패턴도 `0` 을 내므로, 패턴이 server 를 **찾을 수 있음**을 먼저 보여야 `0` 이 「없다」의 뜻이 된다. 초판의 `grep -c vitest` 는 적중 **1** 을 낼 뿐 그 하나가 server 것인지 channel 것인지 가르지 못했다. 리드 이월 ①(귀속 보강)을 이것으로 닫았다 — `plan.md` §B 의 인용이 이제 `evidence/run/G2-forward.err` 를 가리킨다. 장난감 측정 자체는 **요약으로만 남은 기록**으로 유지한다(지우면 그때의 판단 근거가 사라진다).

### 기준별 결과

| 기준 | 결과 | 근거 |
|---|---|---|
| AC-GATECHECKS-001 ★ | **PASS** (양팔) | 정방향 G2 RC=1 · 역변이 G3 RC=0 |
| AC-GATECHECKS-002 | PASS | G4 RC=0 · 82.58초 (대역 안) |
| AC-GATECHECKS-003 | **PASS (관측)** | `G2-forward.err` 의 `error TS2322` 2건 + 실패 사슬 + 워크스페이스 판별(`AC003-vitest-discriminator.txt`, 대조군 동반) |
| AC-GATECHECKS-004 | PASS | `test -d server/dist` → 부재 (`PASS: no emit`) |
| AC-GATECHECKS-005 | PASS (양방향) | 오류 있음 1/1(G2) · 오류 없음 0/0(G4) |
| AC-GATECHECKS-006 | PASS | ci.yml 대비 origin/main 차이 빈 출력 · `ci.yml:27` 그대로 |
| AC-GATECHECKS-007 | PASS | 앵커 셋 각 1건 · `merge-base --is-ancestor` YES |
| AC-GATECHECKS-008 | PASS | SPEC-PERMROUTE-001 대비 origin/main 차이 빈 출력 |
| AC-GATECHECKS-009 | PASS | 적중 25 · (가)23 · (나)2 · **미분류 0** — **§E.2 작성 시점 귀속** (`evidence/run/AC009-classification.txt`). 그 명령의 훑기 범위가 `SPEC-GATECHECKS-001/*.md` 전부라 이 행 자신이 범위 안이고, 지금 다시 돌리면 적중이 하나 늘어 **26** 이 된다 — 늘어난 자리가 이 행이다. §5 의 「계수는 시점에 귀속된다」가 여기서도 성립한다 |
| AC-GATECHECKS-010 | PASS | `pretest` = `"npm run typecheck"` · 키 1개 · OD-1 처분값과 글자 단위 일치 |

### 코드 변경 전부

`server/package.json` — **1개 파일 · 1줄 추가**(diff --stat 실측). 이 카드의 코드 변경은 이것이 전부다.

## §E.3 Run-phase Audit-Ready Signal

**상태: run 완료. AC 10/10 PASS.** 코드 편집은 `server/package.json` 1줄.

**닫힌 이월 (리드 처분):** ① 귀속 보강 — `G2-forward.err` 축자로 대체 · ② AC-001 정방향 — G2 에서 실제로 섰다 · ③ AC-003 — 관측으로 확정 · ④ AC-010 — 글자 단위 일치 확인.

**닫지 않은 것 (§5 그대로 열림):** 지시에 의한 완화 ≠ 구성에 의한 완화 · plan 감사 점수의 트리 귀속 · §6 계수의 시점 의존 · 미검증 넷(다른 언어 게이트 · lint 단계 부재 이유 · `--passWithNoTests` 네 번째 모양 · t39 M6 원 스크립트). **run 이 이 중 어느 것도 닫지 않았다.**

**run 단계가 새로 만든 미검증:** `G2-forward.err` 에 `npm warn Unknown cli config "--passWithNoTests"` 가 **이 저장소에서도** 찍혔다(계획 단계에는 장난감에서만 봤다). 그 플래그가 워크스페이스 스크립트까지 전달되는지는 **여전히 재지 않았다** — t41 소관.

## §E.4 Sync-phase Audit-Ready Signal

**상태: sync 완료. 이 단계는 열린 위험·미검증 항목을 하나도 닫지 않았다.**

### sync 가 만든 것

| 산출물 | 내용 |
|---|---|
| `CHANGELOG.md` | `[Unreleased]` 맨 위에 카드 `t40` 항목 1건. 중심 측정(G2/G3 RC 1 대 0)과 t41 경계, 열어 둔 항목 넷을 함께 적었다 |
| `README.md` | 검사 표 아래 문단 1개 추가 — `npm test` 가 server 타입 검사도 돈다는 것과 `channel` 과 훅 모양이 다른 이유 |
| `spec.md` frontmatter | `version 0.2.0 → 0.3.0` · `status in-progress → completed` · `updated 2026-09-06` + HISTORY 행 1건 |
| `progress.md` | 이 §E.4 |

`spec.md` §1~§8 본문 · `plan.md` · `acceptance.md` 는 **한 글자도 고치지 않았다**(둘은 frontmatter 자체가 없다).

### 열린 항목 계수 — HEAD `da38362` 귀속

명령과 출력을 축자로 적는다. **대조군을 함께 둔다** — 안 맞는 패턴도 `0` 을 내므로, 같은 형태의 없는 표지가 `0` 을 내고 실제 표지는 0 아닌 값을 내는 것을 함께 보여야 `0` 이 「없다」의 뜻이 된다.

```
$ S=.moai/specs/SPEC-GATECHECKS-001/spec.md
$ grep -cF '[열림]'   "$S"   → 4
$ grep -cF '[미검증]' "$S"   → 4
$ grep -cF '[기록]'   "$S"   → 1

[대조군 — 없어야 하는 표지]
$ grep -cF '[해결됨]' "$S"   → 0
$ grep -cF '[종결]'   "$S"   → 0
```

`grep -F` 를 쓴다. `[열림]` 을 그냥 `grep` 에 주면 대괄호가 문자 부류로 읽혀 다른 것을 센다.

**같은 수가 커밋된 `da38362` 에서도 나온다.** 이 sync 회차가 `spec.md` 에 HISTORY 한 행을 더했으므로 작업 트리와 HEAD 를 갈라서 확인했다 — HEAD 사본을 떠서 같은 명령을 돌려도 4 · 4 · 1 · 0 이다. 그래서 그 HISTORY 행에는 표지 문자열을 옮겨 적지 않았다. 적었다면 그 행이 스스로 세 수를 5 · 5 · 2 로 올렸을 것이고(실제로 한 번 그렇게 됐다가 되돌렸다), 그것이 `spec.md` §6 이 경고하는 자기 참조다.

이 넷·넷·하나는 §E.3 이 「그대로 열림」이라 적은 것과 **같은 집합**이다. sync 는 여기에서 아무것도 빼지 않았고 아무것도 「해결」로 옮기지 않았다. §E.3 이 run 단계에서 새로 만든 미검증(`--passWithNoTests` 가 워크스페이스 스크립트까지 전달되는지)도 그대로 열려 있다 — t41 소관.

### 이 회차에 다시 확인한 사실

```
$ grep -n 'pretest' server/package.json channel/package.json
  server/package.json:7:    "pretest": "npm run typecheck",
  channel/package.json:12:    "pretest": "tsc",
$ sed -n '27p' .github/workflows/ci.yml
        - run: npm run typecheck -w server
$ ls -d server/dist
  ls: server/dist: No such file or directory
$ git diff --stat origin/main -- server/package.json
   server/package.json | 1 +
   1 file changed, 1 insertion(+)
$ cat .moai/reports/t40/evidence/run/G2-forward.exit  → exit=1
$ cat .moai/reports/t40/evidence/run/G3-reverse.exit  → exit=0
$ grep -oE 'AC-([A-Z0-9]+-)*[0-9]+' .moai/specs/SPEC-GATECHECKS-001/acceptance.md | sort -u | wc -l  → 10
$ grep -c 'SPEC-GATECHECKS-001' CHANGELOG.md  → 0   (기재 전 · 중복 방지 확인)
```

AC 10건은 §E.2 의 기준별 결과표 10행과 일치한다.

### sync 가 재지 않은 것

- **게이트를 다시 돌리지 않았다.** RC 1 대 0 은 run 회차의 `.exit` 파일을 **읽은** 값이고, 이 sync 회차가 새로 측정한 값이 아니다. 이 단계의 변경은 문서뿐이라 게이트 결과를 바꿀 수 없다고 판단했으나, 그 판단 자체는 실행으로 확인하지 않았다.
- **`npm test` 도 돌리지 않았다.** 스위트 전체는 CI 의 몫이다.
- **`spec.md` §6 의 계수 다섯을 다시 세지 않았다.** §5 가 적은 대로 그 값들은 시점에 매달려 있고, 이 sync 가 `CHANGELOG.md`·`README.md`·`spec.md`·`progress.md` 를 늘렸으므로 §6 의 명령을 지금 다시 돌리면 **다른 수가 나온다**. §6 의 수는 각각 자기 시점에 귀속된 기록이고, 이 회차는 그것을 갱신하지 않는다.
- **계획 감사 점수를 이 트리에서 재지 않았다.** §5 의 열린 항목 그대로다.

### sync 감사 후 교정 3건 (비차단 발견)

감사 보고서 `.moai/reports/t40/sync-audit.md` — **PASS 0.897** (Tier M 통과선 0.80) · **차단 0건** · 비차단 6건.
그중 셋을 이 회차에서 닫았다. 각 발견은 감사 보고를 받은 뒤 **직접 명령을 다시 걸어** 확인하고 고쳤다.

| 발견 | 자리 | 교정 |
|---|---|---|
| F-N1 | `CHANGELOG.md` | 「표류가 **구조적으로** 생기지 않습니다」는 과대주장이었다. 이름 붙은 스크립트가 막는 것은 **명령 본문**의 표류뿐이고, `pretest` 줄이나 `ci.yml:27` 자체를 지우면 두 자리는 다시 갈라진다. 범위를 명시하는 문장으로 바꿨다 |
| F-N3 | `CHANGELOG.md` | 열어 둔 항목 목록이 `spec.md` §5 의 `[기록]` 항목(감사 루브릭에 사실 정확성 자리가 없음 → 카드 `t42`)을 빠뜨렸다. `grep -c 't42' CHANGELOG.md` → **0** 이었다. 항목을 더했다 |
| F-N4 | 이 파일 §E.2 AC-009 행 | 「적중 25」가 시점 없이 단독으로 서 있었다. 그 명령의 훑기 범위가 `SPEC-GATECHECKS-001/*.md` 전부이고 그 행 자신이 범위 안이라, 지금 다시 돌리면 **26** 이다. 시점 귀속을 붙였다 |

**F-N4 교정 자체는 계수 중립이었다 — 그러나 이 교정 기록이 다시 계수를 움직였다.**

교정 직전과 직후에 같은 명령을 돌려 **둘 다 26** 을 얻었다. 교정문에 훑기 패턴이 잡는 수를 새로 넣지 않았으므로 그 교정은 중립이었다. 두 값은 각각 그 시점에 귀속된 관측이다.

**그러나 이 절을 쓰자 값이 다시 움직였다.** 이 절은 훑기 패턴을 축자로 인용하므로 스스로 범위 안의 적중이 된다 — 「무엇이 계수를 움직이는가」를 설명하는 문장이 그 자체로 계수를 움직인 것이다. 실제로 이 절의 초고와 정정본은 서로 다른 값을 냈다.

**그래서 이 절은 현재 값을 숫자로 적지 않는다.** 여기에 적는 순간 그 숫자는 그 문장 자신을 세지 못한 낡은 값이 되고, 다음 편집 한 번에 다시 틀린다. 값이 필요하면 그때 명령을 돌린다:

```
$ grep -rnE '(^|[^0-9.])(21|23|25|28|32|37|46|53)([^0-9.]|$)' .moai/specs/SPEC-GATECHECKS-001/*.md | wc -l
```

이것은 실수가 아니라 `spec.md` §5·§6 이 열린 위험으로 적어 둔 성질의 재현이다. **어떤 계수도 시점 없이 인용하지 않는다** — 그리고 자기 자신을 세는 계수는 아예 고정값으로 적지 않는다.

### 감사가 남긴 비차단 3건 — 닫지 않는다

- **F-N2** `spec.md:62`·`:216` — §2 가 「`server` 에는 `pretest` 가 없다」를 현재형으로 말해, 같은 트리의 `README.md` 와 시제가 어긋난다. **본문 편집이라 sync 소관이 아니다**(§2 는 수리 이전의 실측 기록이고 `spec.md` 본문 소유는 plan 단계에 있다). 리드에 보고한다.
- **F-N5** `evidence/ac009-widened-classification.txt` — 앵커판 `run/AC009-classification.txt` 에 대체됐으나 그 표시가 없다. 증거 파일은 그때의 판단 근거이므로 지우지 않는다.
- **F-N6** `channel/package.json:12`(`pretest: tsc`) 대 `ci.yml:28`(`npm run typecheck -w channel` → `--noEmit`) — channel 쪽은 두 자리가 **다른 명령**이다. 이 카드가 만든 것이 아니고(선재) server 만이 이 카드의 범위다. 열린 채로 보고한다.

### 감사 자신이 적은 갭 여섯

게이트 미실행(G-1 — AC-001/002/005 의 RC 는 run 회차 `.exit` 를 **읽은** 값) · 전체 스위트 미실행(G-2) · 이 저장소에 린터·커버리지 도구 부재로 Craft 두 축 기계 측정 불가(G-3, 건너뛴 검사를 PASS 로 세지 않음) · `.exit` 가 실제 실행 산물이라는 것을 파일 밖 출처로 확인 불가(G-4) · plan-audit-2 비차단 미해결 다섯 중 둘만 표본 확인(G-5) · `--passWithNoTests` 전달 여부(G-6, t41). **이 여섯도 닫지 않는다.**

### 리드 처분 17 — F-N2 교정 (본문 시제)

리드 지시로 sync 가 `spec.md` 본문 두 자리를 고쳤다. **소관 판단의 정정을 함께 적는다**: 초판에서 sync 는 「본문 편집은 plan 소관」이라며 손대지 않았고, 리드가 그 원칙은 옳으나 **이 SPEC 은 완결 SPEC 이 아니라 지금 이 sync 가 닫는 중인 문서**이고 고칠 것이 결정 기록이 아니라 **현재 상태 서술**이므로 sync 가 하라고 처분했다.

| 자리 | 고치기 전 (현재형 · 지금 거짓) | 고친 뒤 |
|---|---|---|
| §2 | 「`server` 에는 `pretest` 가 없다 — 그래서 … 보이지 않는다」 | 「**이 카드 이전에는** `server` 에 `pretest` 가 없었다 … 보이지 않았다」 + 그것이 이 카드의 존재 이유이고 A 가 고치는 부재임을 명시 + 「지금 트리에는 `pretest` 가 있다」 |
| §8 | 「CI … **당장의 위험을 덮고 있는 것이 이것이다**」 | 「**이 카드 이전에는** server 타입 오류를 잡는 자리가 여기뿐이었다 … A 를 착지시킨 뒤로는 게이트도 같은 오류를 잡는다」 |

**처방의 형태가 §6 에서 배운 것과 같다.** 통째로 과거형으로 바꾸면 문제 진술이 사라지므로, **시점을 붙여서** 문제 진술을 지킨 채 참으로 남게 했다 — 「값이 시점에 매인 서술은 시점을 적으면 참으로 남는다」.

확인 (대조군 동반 — 패턴이 대상을 찾을 수 있음을 먼저 보인다):

```
$ grep -c '`pretest` 가 없다'      spec.md   → 0     (현재형 잔존 없음)
$ grep -c 'pretest'                spec.md   → 6     (대조군 — 패턴은 살아 있다)
$ grep -c '당장의 위험을 덮고'      spec.md   → 0
```

**이 교정도 §6 의 계수를 움직인다** — `spec.md` 가 자랐기 때문이다. 위에 적은 대로 이 절은 그 값을 숫자로 적지 않는다.

### 리드가 자기 계수 오류를 정정했다 — 같은 부류의 세 번째 사례

리드가 sync 지시문에 적은 「열린 위험 **셋**」과 「미검증 **다섯**」이 둘 다 틀렸음을 스스로 파일에 대고 다시 세어 확인하고 정정했다(실제 열림 4 · 미검증 4). 앞선 회차 메시지에서 수를 옮겨 오고 파일에 대고 다시 세지 않은 것이 원인이다 — **REQ-GATECHECKS-009 가 금지하는 바로 그 형태**이며, 이 회차에 재현된 계수 사고 셋 중 셋째다(앞의 둘은 위 §E.4 기록).
