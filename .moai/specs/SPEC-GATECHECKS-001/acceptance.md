# SPEC-GATECHECKS-001 — 수용 기준

## 0. 이 파일의 규율

**[HARD] 공허한 기준을 쓰지 않는다.** 이 프로젝트에는 「수리가 있어도 통과하고 없어도 통과하는」 기준을 반복 생산한 기록이 있다(`.claude/agent-memory/` 의 *criteria that verify nothing*, *coarse mutation hides halves*). 그래서 아래 각 기준은 **무엇에 대해 변별하는지**를 명시하고, 변별하지 않는 것은 **대조·가드로 명시적으로 표시**한다. 표시 없이 변별하지 않는 기준은 없다.

| 기준 | 변별 대상 | 수리 없을 때 |
|---|---|---|
| **AC-GATECHECKS-001 ★** | 수리 유무 | **RED (실측: RC=0)** |
| AC-GATECHECKS-002 | — (대조: 회귀 가드) | 통과 |
| AC-GATECHECKS-003 | 수리 유무 + 실패 종류 | RED (pretest 자체가 없음) |
| AC-GATECHECKS-004 | **수리의 형태** (OD-1 (c) 배제) | 통과 |
| AC-GATECHECKS-005 | 수리 유무 (양방향 쌍) | RED |
| AC-GATECHECKS-006 | — (범위 가드) | 통과 |
| AC-GATECHECKS-007 | C 근거의 존속 | 해당 없음 |
| AC-GATECHECKS-008 | 범위 위반 유무 | 해당 없음 |
| AC-GATECHECKS-009 | 서술 규율 위반 유무 | 해당 없음 |
| AC-GATECHECKS-010 | 수리의 **착지 자체** | RED (`pretest` 키 부재) |

---

## AC-GATECHECKS-001 ★ — 변별 변이 (이 SPEC 의 중심 기준)

> **REQ-GATECHECKS-002.** 이 기준 하나가 「수리가 실제로 무언가를 바꿨는가」를 진다.

**Given** `server/package.json` 에 REQ-GATECHECKS-001 의 `pretest` 가 착지해 있고, 트리가 그 외에는 깨끗하다
**When** `server/test/` 아래 파일에 타입 오류 2건을 심고 `moai gate` 를 돌린다
**Then** `moai gate` 의 종료 코드가 **0 이 아니다**

```bash
# 주입 → 측정 → 복원
npm run typecheck -w server; echo "typecheck RC=$?"    # 기대: RC=1 (주입이 실제로 타입 오류임을 확인)
moai gate > /dev/null 2> gate-ac001.err; echo "gate RC=$?"   # 기대: RC≠0
```

### 역변이 (이 기준이 공허하지 않음의 증명 — 필수)

**Given** 같은 타입 오류 2건이 심어진 트리
**When** `server/package.json` 에서 `pretest` 줄만 **제거하고** `moai gate` 를 돌린다
**Then** `moai gate` 의 종료 코드가 **0 이다** — 즉 AC-GATECHECKS-001 이 **RED 로 되돌아간다**

**[HARD] 두 방향을 모두 실행해 출력을 기록한다.** 정방향만 통과시키면 이 기준은 「게이트가 어떤 이유로든 실패했다」만 말하고 pretest 의 기여를 말하지 못한다. 역변이 쪽 RC=0 은 이미 계획 단계에 실측되어 있다(`.moai/reports/t40/evidence/gate-typeerror.*` — RC=0 · 0바이트 · 81초).

### 굵은 변이 금지

주입은 **`server/test/` 안 타입 오류**여야 하며, 시험을 실패시키거나 파일을 지우는 형태여서는 안 된다. 시험 실패는 수리 이전에도 게이트를 RC=1 로 만든다(대조 실측: stderr 2081바이트) — 그 변이로는 pretest 의 기여가 측정되지 않는다.

---

## AC-GATECHECKS-002 — 회귀 가드 (대조 · 의도적 비변별)

> **REQ-GATECHECKS-004.** 이 기준은 수리 유무를 **변별하지 않는다.** 수리 전에도 통과했다. 존재 이유는 「초록을 되찾는 대가로 초록을 잃지 않았음」의 확인이다.

**Given** REQ-GATECHECKS-001 의 `pretest` 가 착지해 있고 타입 오류가 없다
**When** `moai gate` 를 돌린다
**Then** RC=0 이고, 경과 시간이 기준선 대역(81초 ± 30초)에 있다

기준선: `.moai/reports/t40/evidence/gate-baseline.*` — RC=0 · stdout 0바이트 · stderr 0바이트 · `real 1:21.75`.

경과 시간을 함께 재는 이유: 사례 ②는 **RC 와 stdout 만으로는** 정상 통과와 구분되지 않았고, 그 둘만 보는 호출자에게는 **경과 시간이 남는 유일한 판별자**다. (실측에서는 stderr 도 416바이트 달랐다 — 그러나 그 416바이트는 설정 경고이지 「툴체인을 못 찾았다」는 말이 아니므로 판별자로 쓸 수 없다. `spec.md` §2 의 [주의] 를 보라.) 0.03초대 RC=0 은 통과가 아니라 「아무것도 안 돌았다」이다.

---

## AC-GATECHECKS-003 — 실패의 종류가 구분된다

> **REQ-GATECHECKS-003.** 게이트가 막았다는 사실만으로는 「타입 검사가 막았다」가 서지 않는다.

**Given** AC-GATECHECKS-001 정방향의 주입 상태
**When** `moai gate` 의 stderr 을 읽는다
**Then** stderr 이 **`error TS` 형태의 tsc 진단**과 `pretest` 문자열을 포함한다

```bash
grep -c 'error TS' gate-ac001.err      # 기대: ≥ 1
grep -c 'pretest' gate-ac001.err       # 기대: ≥ 1
```

**대조:** 시험 실패로 게이트가 막힌 출력(`gate-failtest.err`)에는 `error TS` 가 없다. 두 실패는 출력으로 갈린다.

---

## AC-GATECHECKS-004 — 수리의 형태 가드 (빌드 산출물 없음)

> **REQ-GATECHECKS-005.** 이 기준은 **수리 유무가 아니라 수리의 형태**를 변별한다 — OD-1 의 (c)(`channel` 문자 그대로 모방)를 배제한다.

**Given** REQ-GATECHECKS-001 의 `pretest` 가 착지해 있다
**When** 깨끗한 트리에서 `npm test -w server` 를 돌린다
**Then** `server/dist/` 가 생성되지 않는다

```bash
test -d server/dist && echo "FAIL: dist emitted" || echo "PASS: no emit"
```

`server/tsconfig.json` 은 `outDir: "dist"` 와 `include: ["src", "test"]` 를 갖는다. `pretest: "tsc"` (인자 없음)를 쓰면 **시험 파일까지 `dist/` 로 컴파일**된다. server 에는 빌드가 없으므로 그 산출물은 전부 쓰레기다. `channel` 이 `tsc` 를 쓰는 것은 `bin` 이 `dist/index.js` 를 가리키는 **진짜 빌드**이기 때문이며, 이 차이는 모방하면 안 되는 차이다.

---

## AC-GATECHECKS-005 — 게이트와 단독 typecheck 의 방향 일치 (양방향)

> **REQ-GATECHECKS-002 · REQ-GATECHECKS-006.** AC-GATECHECKS-001 을 대상 축으로 일반화한 쌍 기준.

**Given** REQ-GATECHECKS-001 의 `pretest` 가 착지해 있다
**When** 아래 두 상태 각각에서 `npm run typecheck -w server` 와 `moai gate` 의 RC 를 함께 잰다
**Then** 두 RC 의 **0/비0 방향이 두 상태 모두에서 일치**한다

| 상태 | `npm run typecheck -w server` | `moai gate` |
|---|---|---|
| 타입 오류 있음 | RC≠0 | **RC≠0** |
| 타입 오류 없음 | RC=0 | RC=0 |

수리 이전에는 첫 행이 `RC=1` 대 `RC=0` 으로 **어긋나 있었다** — 이 어긋남이 카드 t40 의 사례 ③이다.

---

## AC-GATECHECKS-006 — 범위 가드: CI 불변

> **REQ-GATECHECKS-006.** 이 기준은 수리 유무를 변별하지 않는다. CI 를 건드리지 않았음의 확인이다.

**Given** 이 SPEC 의 실행이 끝났다
**When** `.github/workflows/ci.yml` 의 변경을 확인한다
**Then** 변경이 없고, 27·28행이 그대로다

```bash
git diff --stat origin/main -- .github/workflows/ci.yml   # 기대: 빈 출력
grep -n 'npm run typecheck -w server' .github/workflows/ci.yml   # 기대: 27행
```

CI 는 이미 typecheck 를 실제로 돌고 있고 **당장의 위험을 덮고 있는 것이 이것이다**. 이 SPEC 은 게이트를 CI 에 맞추는 것이지 그 반대가 아니다.

---

## AC-GATECHECKS-007 — C 종결 근거의 존속

> **REQ-GATECHECKS-007.** C 를 편집 0줄로 닫는 근거가 실제로 파일에 있는지 확인한다. 「있다고 기억한다」로는 서지 않는다.

**Given** 이 SPEC 의 실행이 끝났다
**When** 세 자리의 경고와 시간 순서를 확인한다
**Then** 셋 다 존재하고, 경고가 감사 발견보다 앞선다

```bash
grep -c '무인용 단어 분리에 기댄다' .moai/specs/SPEC-PERMROUTE-001/spec.md          # 기대: ≥ 1
grep -c '재현 시 셸 주의' .moai/specs/SPEC-PERMROUTE-001/progress.md                 # 기대: ≥ 1
grep -c 'bash 로 돌릴 것' .moai/reports/t34/evidence/round4-section6-web-scope.txt      # 기대: ≥ 1
git merge-base --is-ancestor c3d1d09 83c3078 && echo YES                             # 기대: YES
```

**셋째 경로 주의.** 셋째 자리는 `SPEC-PERMROUTE-001/evidence/` 가 **아니라** `.moai/reports/t34/evidence/` 다(`SPEC-PERMROUTE-001/` 에는 `evidence/` 가 없다). 따라서 이 기준이 세우는 것은 「경고 세 자리 존재」이고, 「셋 다 SPEC 독자의 경로 위에 있다」가 아니다 — 그것은 **앞 두 자리에만** 해당한다(`spec.md` §4 정정).

**[HARD] 줄 번호가 아니라 내용 앵커로 찾는다.** `spec.md:255` · `progress.md:421` 은 작성 시점의 값이고, 같은 파일에 한 줄이라도 들어가면 어긋난다. 계수는 grep 으로 내고 각 앵커가 **1건**을 맞히는지 확인한다.

---

## AC-GATECHECKS-008 — 범위 가드: 완결 SPEC 불변

> **REQ-GATECHECKS-008.**

**Given** 이 SPEC 의 실행이 끝났다
**When** 완결 SPEC 들의 변경을 확인한다
**Then** 변경이 **0줄**이다

```bash
git diff --stat origin/main -- .moai/specs/SPEC-PERMROUTE-001/   # 기대: 빈 출력
```

---

## AC-GATECHECKS-009 — 서술 규율: 정의 없는 자리 수 금지

> **REQ-GATECHECKS-009.**

**Given** 이 SPEC 의 산출물(`spec.md` · `plan.md` · `acceptance.md` · `progress.md`)
**When** 자리 수로 쓰일 수 있는 값(25 · 37 · 28 · 23 · 46 · **21 · 32 · 53**)이 나오는 **모든** 행을 훑는다 — 「자리」 접미가 붙지 않은 맨 숫자와 산술 안의 피연산자를 포함한다
**Then** 각 적중이 (가) 명령 또는 정의와 같은 표·문단 안에 있거나, (나) 자리 수가 아닌 값(줄 번호 · 날짜 · 바이트 수 · 점수)임이 분류표에 기록된다. **미분류 0건**

```bash
grep -rnE '(^|[^0-9.])(21|23|25|28|32|37|46|53)([^0-9.]|$)' .moai/specs/SPEC-GATECHECKS-001/*.md
```

**[HARD] 「자리」 접미를 요구하지 않는다.** 접미를 요구한 초판 명령은 `spec.md` 의 산술 `46 − 18 = 28` 을 놓쳤고, 값 목록에 46 이 없어 좌변도 놓쳤다 — **명령이 자기 Then 절보다 좁으면 통과해도 Then 절이 서지 않는다**(계획 감사 차단 발견 B-2). 넓힌 명령은 거짓 양성(줄 번호 등)을 내며, 그것을 (나) 로 **분류하는 것이 이 기준의 작업**이다.
**[HARD] 값 목록은 SPEC 이 새 자리 수를 들일 때마다 함께 넓힌다.** 이 기준은 그 규율을 두 번 어긴 전력이 있다 — 초판이 46 을 빠뜨렸고(감사 1회차 B-2), 그 교정이 도입한 21·32·53 을 다시 빠뜨렸다(감사 2회차 B-1r 교정). **목록에 없는 값은 이 기준에 보이지 않는다** — 명령을 고칠 때마다 이 문장을 다시 읽을 것. 계수만으로는 판정되지 않으므로 **적중 목록과 분류를 증거에 남긴다**.

---

## AC-GATECHECKS-010 — 수리가 착지했다

> **REQ-GATECHECKS-001.** 이 기준은 REQ-GATECHECKS-001 을 **직접** 진다. 나머지 기준은 수리의
> *효과*(RC · 실패 종류 · 형태)를 재고, 이 기준만이 **키의 존재 자체**를 잰다.

**Given** M2 가 완료됐다
**When** `server/package.json` 의 `scripts` 를 읽는다
**Then** `pretest` 키가 **정확히 하나** 있고 그 값이 OD-1 처분값 `npm run typecheck` 이다

```bash
node -e 'const s=require("./server/package.json").scripts; console.log(JSON.stringify(s.pretest))'
# 기대: "npm run typecheck"
```

**수리 없을 때**: `undefined` 가 찍힌다 — RED. 이 기준은 변별한다.

---

## Definition of Done

- [ ] AC-GATECHECKS-001 정방향 **및 역변이** 두 출력이 모두 기록됐다 (한쪽만이면 미완)
- [ ] AC-GATECHECKS-002 ~ AC-GATECHECKS-006 이 통과하고 각 명령의 출력이 남았다
- [ ] AC-GATECHECKS-007 ~ AC-GATECHECKS-009 의 문서 기준이 통과했다
- [ ] AC-GATECHECKS-010 이 통과했다 — `pretest` 값이 OD-1 처분값과 글자 단위로 일치한다
- [ ] `git status --short` 에 탐침 파일(주입한 타입 오류·임시 디렉터리)이 남아 있지 않다
- [x] OD-1 이 운영자·리드 처분으로 확정됐다 — **(a) `"pretest": "npm run typecheck"`** (리드 처분 7, 2026-09-05)
- [ ] §5 의 **열린 위험**이 닫혔다고 주장되지 않았다 — 열린 채로 기록됐다
