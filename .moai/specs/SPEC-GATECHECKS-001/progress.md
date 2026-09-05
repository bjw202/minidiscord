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

원본 출력 전부: `.moai/reports/t40/evidence/run/`. 아래 RC·바이트·경과는 그 파일들에서 나온 값이다.

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

G2 의 같은 출력이 `plan.md` §B 의 두 주장을 실물로 세운다: server 의 `vitest` 실행 줄이 **없고**(pretest 가 막았다), `channel` 은 **126개 시험을 끝까지 돌았다**. 리드 이월 ①(귀속 보강)을 이것으로 닫았다 — `plan.md` §B 의 인용이 이제 `evidence/run/G2-forward.err` 를 가리킨다. 장난감 측정 자체는 **요약으로만 남은 기록**으로 유지한다(지우면 그때의 판단 근거가 사라진다).

### 기준별 결과

| 기준 | 결과 | 근거 |
|---|---|---|
| AC-GATECHECKS-001 ★ | **PASS** (양팔) | 정방향 G2 RC=1 · 역변이 G3 RC=0 |
| AC-GATECHECKS-002 | PASS | G4 RC=0 · 82.58초 (대역 안) |
| AC-GATECHECKS-003 | **PASS (관측)** | `G2-forward.err` 의 `error TS2322` 2건 + 실패 사슬 |
| AC-GATECHECKS-004 | PASS | `test -d server/dist` → 부재 (`PASS: no emit`) |
| AC-GATECHECKS-005 | PASS (양방향) | 오류 있음 1/1(G2) · 오류 없음 0/0(G4) |
| AC-GATECHECKS-006 | PASS | ci.yml 대비 origin/main 차이 빈 출력 · `ci.yml:27` 그대로 |
| AC-GATECHECKS-007 | PASS | 앵커 셋 각 1건 · `merge-base --is-ancestor` YES |
| AC-GATECHECKS-008 | PASS | SPEC-PERMROUTE-001 대비 origin/main 차이 빈 출력 |
| AC-GATECHECKS-009 | PASS | 적중 25 · (가)23 · (나)2 · **미분류 0** (`evidence/run/AC009-classification.txt`) |
| AC-GATECHECKS-010 | PASS | `pretest` = `"npm run typecheck"` · 키 1개 · OD-1 처분값과 글자 단위 일치 |

### 코드 변경 전부

`server/package.json` — **1개 파일 · 1줄 추가**(diff --stat 실측). 이 카드의 코드 변경은 이것이 전부다.

## §E.3 Run-phase Audit-Ready Signal

**상태: run 완료. AC 10/10 PASS.** 코드 편집은 `server/package.json` 1줄.

**닫힌 이월 (리드 처분):** ① 귀속 보강 — `G2-forward.err` 축자로 대체 · ② AC-001 정방향 — G2 에서 실제로 섰다 · ③ AC-003 — 관측으로 확정 · ④ AC-010 — 글자 단위 일치 확인.

**닫지 않은 것 (§5 그대로 열림):** 지시에 의한 완화 ≠ 구성에 의한 완화 · plan 감사 점수의 트리 귀속 · §6 계수의 시점 의존 · 미검증 넷(다른 언어 게이트 · lint 단계 부재 이유 · `--passWithNoTests` 네 번째 모양 · t39 M6 원 스크립트). **run 이 이 중 어느 것도 닫지 않았다.**

**run 단계가 새로 만든 미검증:** `G2-forward.err` 에 `npm warn Unknown cli config "--passWithNoTests"` 가 **이 저장소에서도** 찍혔다(계획 단계에는 장난감에서만 봤다). 그 플래그가 워크스페이스 스크립트까지 전달되는지는 **여전히 재지 않았다** — t41 소관.

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
