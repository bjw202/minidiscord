# SPEC 감사 보고서: SPEC-GATECHECKS-001

- 회차: 1/3
- 판정: **PASS**
- 종합 점수: **0.80** (Tier M 통과선 **0.80** — 여유 0)
- 차단(blocking) 발견: **2건** · 비차단(optional): **7건**
- 감사 나무: `.claude/worktrees/t40` · 브랜치 `WT-quiet-green` · HEAD `05fef76`
- 감사 시각 기준 트리 상태: SPEC 산출물 4개 미추적(`git status --porcelain -uall`), 그 외 편집 없음

> **M1 맥락 격리.** 이 감사는 `spec.md` · `plan.md` · `acceptance.md` · `progress.md` 파일만 입력으로 삼았다. 리드 지시문이 전달한 작성자 추론·경위 설명은 **판정 근거로 쓰지 않았다**. 다만 지시문이 지목한 *검증 대상*(전제·수치·경로)은 파일과 명령으로 다시 확인했다.

---

## 0. 통과선을 어디서 읽었는가

| 항목 | 값 | 출처 |
|---|---|---|
| Tier | **M** | `.moai/specs/SPEC-GATECHECKS-001/spec.md:14` — `tier: M` |
| Tier M 통과선 | **0.80** | `.claude/rules/moai/workflow/spec-workflow.md:138` 표 「plan-auditor PASS threshold」 열 (재확인: 같은 파일 `:334-335`) |
| REQ/AC 상한 | 16 / 16 | 같은 파일 REQ/AC budget 표 — 실측 9 / 9, 여유 있음 |
| Tier M 산출물 집합 | spec + plan + acceptance | 같은 파일 `:138`. 넷째 `progress.md` 는 추가분이며 위반 아님 |

지시문은 통과선을 주지 않았고, 위 SSOT 에서 직접 읽었다.

---

## 1. 필수 통과 항목 (M5 Must-Pass Firewall)

| # | 항목 | 판정 | 증거 |
|---|---|---|---|
| MP-1 | REQ 번호 일관성 | **PASS** | `grep -rohE '(AC\|REQ)-[A-Z]+-[0-9]+' | sort | uniq -c` → `REQ-GATECHECKS-001`~`009` 연속·중복 0·자리수 통일. `grep -cE '^\s*-\s+\*\*REQ-' spec.md` → 9 |
| MP-2 | GEARS 형식 준수 (요구 계층) | **PASS** | 9개 REQ 전부가 다섯 GEARS 유형 중 하나에 든다. Ubiquitous 4(001·004·006·007) · event-driven 2(002·003) · unwanted 3(005·008·009). `spec.md:70-88`. **판정 계층 명시: 요구(`REQ-`) 계층에 대고 잰 것이며, `AC-`의 Given-When-Then 은 검증 계층 형식이므로 여기서 감점하지 않았다** |
| MP-3 | YAML frontmatter 유효성 | **PASS** | `spec.md:1-17` — 정식 12필드(`id`·`title`·`version`(따옴표 semver)·`status`·`created`·`updated`·`author`·`priority`·`phase`·`module`·`lifecycle`·`tags`) 전부 존재·형 일치. 거부 별칭(`created_at`·`updated_at`·`labels`·`spec_id`) 0건 |
| MP-4 | 언어 중립성 | **N/A** | 이 SPEC 은 이 저장소의 JS/TS 워크스페이스 하나에 범위가 묶여 있고 템플릿 배포 대상 문서가 아니다. 단일 언어 범위 → 자동 통과 |
| MP-5 | D7 교차 SPEC 화해 | **PASS** | 참조 SPEC 3개 전부 존재하고 `status: completed` — `retired`/`superseded`/`archived` 0건이므로 화해 요구가 발동하지 않는다. `for S in SPEC-CI-001 SPEC-PERMROUTE-001 SPEC-WSUPGRADE-001; do grep -m1 '^status:' .moai/specs/$S/spec.md; done` → `completed` ×3 |
| MP-6 | D8 교차 플랫폼 규율 | **PASS** | `grep -rn 'syscall' .moai/specs/SPEC-GATECHECKS-001/*.md` → rc=1 (0건). 자동 통과 |
| MP-7 | 미해결 명료화 표지 | **PASS** | `grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-GATECHECKS-001/` → rc=1 (0건) |

**필수 항목 실패 0건.**

---

## 2. 차원별 점수

| 차원 | 점수 | 대역 근거 | 증거 |
|---|---|---|---|
| 명료성 (Clarity) | **0.75** | 「요구 한둘에 사소한 모호성, 합리적 기술자가 일관되게 해소」 | 요구 9개는 명확. 감점은 배경·계수 서술의 미해소 참조 3건 (B-2 · N-3 · N-4) |
| 완결성 (Completeness) | **1.00** | 「필수 절 전부 + frontmatter 완비 + Out of Scope H3 + 불릿」 | HISTORY(`spec.md:21`) · WHY(§1·§2) · WHAT(§3) · HOW(`plan.md` §C) · REQUIREMENTS(§3) · AC(`acceptance.md` 9개) · Out of Scope H3 **5개** 전부 `-` 불릿 동반(`spec.md:146·151·155·160·165`) |
| 시험가능성 (Testability) | **0.75** | 「한 기준이 정확히 이분 판정은 아니나 사소한 해석으로 측정 가능」 | AC-001·003·005·006·007·008 은 이분 판정. AC-009 만이 눈 확인을 요구하고(스스로 `acceptance.md:177` 에 명시) 그 명령이 자기 Then 절을 덮지 못한다(B-2). 「적절한·합리적」류 애매어 0건 |
| 추적성 (Traceability) | **0.75** | 「REQ 하나가 미포괄」 | AC 9개 전부 실재 REQ 를 인용. 그러나 **REQ-GATECHECKS-001 을 표적으로 인용하는 AC 가 없다**(N-1) |

**종합 = 네 값의 조화 평균 = 4 ÷ (1/0.75 + 1/1.00 + 1/0.75 + 1/0.75) = 4 ÷ 5.000 = 0.800**

(조화 평균은 `agent-common-protocol.md` § Skeptical Evaluation Stance 의 「산술 평균이 아니라 조화 평균」 규정에 따른다. 산술 평균이었다면 0.8125.)

**0.800 ≥ 0.80 → PASS. 다만 여유가 0이다** — 어느 한 차원이 반 대역만 내려가도 FAIL 로 넘어간다.

---

## 3. 리드가 지목한 6개 항목에 대한 판정

### 3-1. AC 가 실제로 변별하는가 (지목 1)

**AC-GATECHECKS-001 의 변별 주장은 선다.** 세 근거:

1. **역변이 팔이 필수로 못 박혀 있다.** `acceptance.md:35-41` 이 역변이를 별도 Given-When-Then 으로 세우고 `[HARD] 두 방향을 모두 실행해 출력을 기록한다` 를 붙였으며, Definition of Done 첫 항목(`acceptance.md:183`)이 「한쪽만이면 미완」으로 잠근다. 이 프로젝트가 반복 생산한 「공허한 기준」 부류에 대한 실효 방어다.
2. **역변이 쪽 RED 가 이미 실측돼 있다.** 수리 없는 트리에서 타입 오류 2건이 서 있는데도 게이트가 RC=0 임 — `.moai/reports/t40/evidence/gate-typeerror.{out,err}` 양쪽 0바이트, `tc-mutated.out` 에 `error TS2322` 2건 축자.
3. **굵은 변이가 명시적으로 금지돼 있다**(`acceptance.md:43-45`). 주입은 `server/test/` 안 **타입 오류**로 한정되고 시험 실패·파일 삭제는 배제된다. 실제로 주입 파일명이 `t40-typeerror.probe.ts` 로 vitest 기본 include(`*.{test,spec}.ts`)에 걸리지 않으므로, 주입이 시험 실패로 새어 게이트를 막는 경로가 구조적으로 닫혀 있다. 대조 실측(`gate-failtest.err` 2081바이트)이 「시험 실패는 수리 이전에도 RC=1」을 이미 세워 둔 것과 짝을 이룬다.

**의도적 비변별로 표시된 셋(002·004·006)은 정직하게 표시돼 있다.** `acceptance.md:7-17` 의 표가 각 기준의 변별 대상과 「수리 없을 때」 결과를 한 칸에 적고, 002·006 은 `— (대조·가드)`, 004 는 `수리의 형태`로 구분해 둔다. 조용히 공허한 기준은 없다. 다만 004 의 실질은 아래 N-2 를 보라.

### 3-2. 수리 없이 만족되거나 수리가 있어도 불만족인 기준이 있는가 (지목 2)

**「수리가 있어도 불만족」 후보 하나를 실측으로 닫았다 — AC-GATECHECKS-003.**

AC-003 은 `grep -c 'error TS' gate-ac001.err` 로 게이트의 **stderr** 에서 tsc 진단을 찾는다. 그런데 `tsc` 는 진단을 **stdout** 에 쓴다. 게이트가 자식의 stdout 을 자기 stdout 으로 흘려보낸다면 이 기준은 수리가 정상 작동해도 0건을 세고 실패한다.

**실측으로 닫힌다.** `gate-failtest.err`(2081바이트)에 npm 의 lifecycle 배너(`> test` / `> vitest run`, 35-40·54-59행)와 vitest 의 요약(`Test Files 1 failed | 18 passed`, 48행)이 들어 있다 — 둘 다 자식의 **stdout** 이다. 그리고 짝이 되는 `gate-failtest.out` 은 **0바이트**다.

```
$ wc -c .moai/reports/t40/evidence/gate-failtest.out
       0
```

⇒ `moai gate` 는 자식의 stdout 을 **자기 stderr 로 합류시킨다.** 따라서 tsc 의 `error TS` 는 `gate-ac001.err` 에 들어온다. **AC-003 은 안전하다.**

**「수리 없이 만족」 쪽은 AC-004 하나** — 다만 `acceptance.md:12` 가 「수리 없을 때: 통과」로 스스로 적고 있어 은폐가 아니다(N-2 참조).

### 3-3. OD-1 — `pretest` 형태 (지목 3)

**작성자의 배제 논거는 파일에서 참이다.**

```
$ cat server/tsconfig.json     → "outDir": "dist" · "include": ["src","test"]   (8·11행)
$ cat server/package.json      → scripts: dev · test · typecheck("tsc --noEmit")  — pretest 없음 (5-9행)
$ cat channel/package.json     → "bin": {"minidiscord-channel":"./dist/index.js"} · "pretest":"tsc"  (6-12행)
$ ls -d server/dist            → No such file or directory
$ grep -n dist .gitignore      → 3:dist/
```

세 사실이 모두 확인된다: server 의 `tsconfig` 는 인자 없는 `tsc` 면 `test/` 까지 `dist/` 로 emit 하고, server 에는 `bin` 도 `build` 도 없어 그 산출물이 쓸모가 없으며, channel 의 `tsc` 는 `bin` 이 가리키는 진짜 빌드다. **(c) 배제 논거는 성립한다.**

**권고 (a) `"pretest": "npm run typecheck"` 가 자기 문제를 만드는가 — 직접 측정했다.**

작성자가 재지 않은 위험이 하나 있었다. `npm test --workspaces` 아래에서 워크스페이스의 `pretest` 가 다시 `npm run` 을 부르면, 중첩 npm 이 `--workspaces` 설정을 환경으로 물려받아 엉뚱하게 확장될 수 있다. 작성자의 장난감 실측(`plan.md:45-52`)은 `pretest` 가 **직접 exit 1** 하는 형태였고, **권고안의 중첩 `npm run` 형태는 재지 않았다.**

저장소 밖 임시 워크스페이스에서 권고안 그대로의 형태를 직접 돌렸다:

```
$ cat /tmp/od1t9/pkga/package.json
{"name":"pkga","version":"1.0.0","scripts":{"pretest":"npm run typecheck",
 "typecheck":"node -e \"console.log(1); process.exit(1)\"","test":"node -e \"console.log(2)\""}}
$ cd /tmp/od1t9 && npm test --workspaces --if-present --passWithNoTests
RC=1
stdout:
  > pkga@1.0.0 pretest        > npm run typecheck
  > pkga@1.0.0 typecheck      > node -e "console.log(1); process.exit(1)"
  1
  > pkgb@1.0.0 test           > node -e "console.log(3)"
  3
stderr:
  npm error Lifecycle script `typecheck` failed with error: code 1 · workspace pkga@1.0.0
  npm error Lifecycle script `test` failed with error: code 1 · command sh -c npm run typecheck
```

**결론: 중첩 `npm run` 은 워크스페이스 확장을 물려받지 않고 자기 워크스페이스의 스크립트를 부른다.** RC=1 이 전파되고, 실패 워크스페이스의 `test` 는 건너뛰며, 다른 워크스페이스(`pkgb`)는 계속 돈다. **(a) 는 안전하다.**

부수 관측 둘:
- 같은 실행에서 npm 이 `Unknown cli config "--passWithNoTests"` **와** `Unknown env config "passwithnotests"` 를 냈다. 중첩 npm 이 한 줄을 더 낸다 — AC-003 의 판정에는 영향 없다(`error TS`·`pretest` 문자열만 본다).
- **(a) 는 REQ-GATECHECKS-006 이 이미 강제하고 있다.** (b) 는 같은 문자열을 두 자리에 두어 REQ-006 을 정면으로 어기고, (c) 는 REQ-005 를 어긴다. 즉 OD-1 은 실질적으로 **열린 3지 선택이 아니라 요구사항이 이미 (a) 로 좁혀 놓은 결정**이다. 이 점을 `plan.md` §A 가 적으면 리드 처분이 한 줄로 끝난다(N-5).

### 3-4. OD-2 — 역변이 실행 시점 (지목 4)

**권고 (a)(같은 회차 재실행)는 타당하고, 작성자가 든 것보다 강한 이유가 있다.**

작성자의 이유는 「같은 트리·같은 회차 귀속」이다. 실제 이유는 더 무겁다: **(b) 가 인용하려는 RC=0 은 어떤 증거 파일에도 들어 있지 않다.**

```
$ wc -c .moai/reports/t40/evidence/gate-typeerror.out .moai/reports/t40/evidence/gate-typeerror.err
       0 gate-typeerror.out
       0 gate-typeerror.err
```

두 파일은 **0바이트**다. 즉 「역변이 RC=0」이라는 값의 유일한 운반체는 `reproduction.md` §2 사례 ③ 의 **산문**이지 캡처된 산출물이 아니다. `acceptance.md:41` 은 이를 `gate-typeerror.*` 를 근거로 제시하지만, 그 파일들이 세우는 것은 「출력이 0바이트였다」뿐이고 RC 는 세우지 못한다. **(b) 를 고르면 이 카드의 중심 주장이 미귀속 값 위에 서게 된다.** (a) 로 확정할 것을 지지한다.

### 3-5. 장난감 워크스페이스 전제 (지목 5)

**전제는 참이다 — 내가 독립적으로 재현했다**(3-3 의 실행). ①「pretest 실패는 그 워크스페이스의 test 를 막고 전체 RC 를 1 로 만든다」와 ②「다른 워크스페이스는 계속 돈다」가 둘 다 재현됐고, 더 나아가 **작성자가 재지 않은 중첩 `npm run` 형태에서도** 성립한다.

**그러나 SPEC 안의 귀속은 기준 미달이다.** `plan.md:45-52` 의 블록은 축자 출력이 아니라 **요약**이다(`stdout: pkga 의 test 는 실행되지 않음`). 명령은 적혀 있으나 원본 출력이 `evidence/` 에 없고, 임시 트리의 경로도 남아 있지 않다. `verification-claim-integrity.md` §3.2 는 요약을 증거로 인정하지 않는다.

**의존은 안전하다**(전제가 실제로 참이므로). **귀속은 보강이 필요하다**(N-6). 이 감사가 재현한 위 출력을 `plan.md` §B 나 `evidence/` 에 붙이면 닫힌다.

### 3-6. §4 의 C 종결 논거 (지목 6)

**정정된 주장은 참이고, 두 자리로도 C 종결은 선다.**

```
$ grep -c '무인용 단어 분리에 기댄다' .moai/specs/SPEC-PERMROUTE-001/spec.md      → 1
$ grep -c '재현 시 셸 주의' .moai/specs/SPEC-PERMROUTE-001/progress.md            → 1
$ grep -c 'bash 로 돌릴 것' .moai/reports/t34/evidence/round4-section6-web-scope.txt → 1
$ ls .moai/specs/SPEC-PERMROUTE-001/   → acceptance.md plan.md progress.md spec.md   (evidence/ 없음)
$ git merge-base --is-ancestor c3d1d09 83c3078 && echo YES                          → YES
```

네 확인 전부 통과한다. **`SPEC-PERMROUTE-001/` 에 `evidence/` 디렉터리가 없다는 정정은 사실이고**, 따라서 셋째 자리를 「SPEC 독자의 필수 경로」로 셌던 원래 셈은 틀렸다. 현재 줄 번호도 실측과 일치한다(`spec.md:255` · `progress.md:421`) — 다만 AC-007 이 `[HARD]` 로 줄 번호가 아닌 내용 앵커를 쓰라고 못 박은 것은 옳은 판단이고, 세 앵커가 각각 **정확히 1건**을 맞히는 것도 확인했다.

**두 자리로 ① 논거가 서는가 — 선다.** `spec.md:255` 는 재현 명령 표 **바로 앞**, `progress.md:421` 은 표 **바로 뒤**에 있어, 두 표 어느 쪽을 읽으러 온 사람도 경고를 지나친다. 「완화가 이미 존재하고 지시된 것보다 강하다」는 주장은 이 두 자리만으로 성립한다.

**②·③ 논거도 확인된다.** 조상 관계 YES 로 경고가 감사보다 먼저 착지했음이 서고, 그 위에서 「H-01 이 미검증 전제 위에 선 권고」라는 판단이 선다.

**그리고 §5 가 잔여 위험을 실제로 열어 두었다.** `spec.md:114` 가 「지시에 의한 완화 ≠ 구성에 의한 완화」를 `[열림]` 으로 명시하고, `acceptance.md:188` 의 Definition of Done 마지막 항목이 「열린 위험이 닫혔다고 주장되지 않았다」를 요구한다. **리드가 요구한 OPEN 기록은 이행돼 있다.**

### 3-7. 식별자 개명 (80건 치환)

**잔여물 0건.**

```
$ grep -rnE '(^|[^-A-Z])(AC|REQ)-[0-9]{3}' .moai/specs/SPEC-GATECHECKS-001/          → rc=1 (단형 잔여 0)
$ grep -rnE '(AC|REQ)-GATECHECKS-GATECHECKS|GATECHECKS-GATECHECKS' …                 → rc=1 (이중 접두 0)
$ grep -rohE '(AC|REQ)-[A-Z]+-[0-9]+' … | sort | uniq -c
   → AC-GATECHECKS-001..009 · REQ-GATECHECKS-001..009 각 1회 이상, 결번·중복 없음
```

---

## 4. 발견 목록

### 차단 (blocking) — 2건

**B-1. 「사례 ②는 정상 통과와 바이트 단위로 같다」는 주장이 자기 증거에 의해 반증된다**
- 자리: `spec.md:64` · 파급: `acceptance.md:59`
- `spec.md:64` — 「정상 통과는 RC=0 · stdout 0바이트 · **stderr 0바이트** · 81초다 … 이것이 ②와 정상 통과를 **바이트 단위로 같게** 만든다」
- 실측:
  ```
  $ wc -c .moai/reports/t40/evidence/gate-baseline.err .moai/reports/t40/evidence/gate-p3.err
         0 gate-baseline.err
       416 gate-p3.err
  ```
  사례 ②는 stderr 416바이트를 냈다. **바이트 단위로 같지 않다.**
- 출처는 정직했다. `reproduction.md:84` 는 「`.moai/config/sections` 가 있는 디렉터리에서 같은 일이 벌어지**면** stderr 도 0바이트가 된다」라는 **조건부 추론**으로 적었다. `spec.md:64` 가 그 추론을 **측정된 사실로 굳혔다.** 이 프로젝트가 반복 기록한 「추론을 관측으로 승격」 부류다(`verification-claim-integrity.md` §1.1).
- 파급이 실질적이다. `acceptance.md:59` 는 AC-GATECHECKS-002 가 경과 시간을 재는 이유를 「경과 시간이 **유일한** 국소 판별자**였다**」로 적는데, 실제 수행된 측정에서는 stderr 도 판별자였다. 기준 자체(RC=0 + 시간 대역)는 건전하나 **그 존재 이유가 거짓 근거 위에 있다.**
- 필요한 수리: `spec.md:64` 를 측정된 것(RC·stdout 동일, stderr 416바이트는 합성 재현이 만든 설정 경고)과 추론된 것(정상 디렉터리라면 stderr 도 0)으로 가르고, `acceptance.md:59` 의 「유일한」을 실측 범위에 맞게 고칠 것. AC-002 의 명령은 바꿀 필요가 없다.

**B-2. SPEC 이 자기 [HARD] 서술 규율(REQ-GATECHECKS-009)을 어기고, 그 위반을 잡도록 만든 AC-GATECHECKS-009 가 그것을 잡지 못한다**
- 자리: `spec.md:140` (위반) · `acceptance.md:170·174` (기준의 공백)
- `spec.md:140` — `| 합 | **18** (`46 − 18 = 28` ✓) |`. **`46` 은 이 SPEC 어디에도 정의가 없다.**
  ```
  $ grep -rn '46' .moai/specs/SPEC-GATECHECKS-001/*.md
  spec.md:140:| 합 | **18** (`46 − 18 = 28` ✓) |          ← 유일한 등장
  ```
  §6 표(`spec.md:126-130`)가 정의하는 네 값은 25·37·28·23 이고 46 은 그중에 없다. 출처를 보면 이유가 있다 — `reproduction.md:244` 가 「§6 이 이 보고서를 쓰는 동안 **37 → 46 으로 늘었다**」고 적는다. 즉 SPEC 은 표에 37 을 싣고 산술에는 46 을 쓰면서 그 사이를 잇는 문장을 옮기지 않았다. `spec.md` 만 읽는 사람은 「37 − 18 = 19 ≠ 28」로 막힌다.
  이는 REQ-GATECHECKS-009(`spec.md:88`)의 「정의를 붙이지 않은 자리 수를 단독으로 서술하지 않아야 한다」에 대한 **정면 위반**이며, 하필 그 규율을 세운 절 안에서 일어났다.
- 그리고 **AC-GATECHECKS-009 는 이 위반을 구조적으로 못 잡는다.** 기준의 명령은
  ```
  $ grep -rnE '\b(25|37|28|23)자리' .moai/specs/SPEC-GATECHECKS-001/
  spec.md:121:## 6. 계수 규율 — 「37자리」를 단독으로 쓰지 않는 이유
  plan.md:112:- 「37자리」 단독 서술 금지(REQ-GATECHECKS-009)
  ```
  두 결함이 겹쳐 있다. **① 값 목록에 46 이 없다.** **② 패턴이 「N자리」 형태만 잡아, 「자리」를 달지 않은 맨 숫자를 전부 놓친다.** 실제로 규율이 겨냥한 자리들이 이 명령에 안 걸린다:
  ```
  $ grep -rnE '(^|[^0-9])(25|37|28|23)([^0-9]|$)' .moai/specs/SPEC-GATECHECKS-001/*.md
  spec.md:132:  … 리드의 28 은 §6 집합의 진부분집합이고 …
  spec.md:140:  | 합 | **18** (`46 − 18 = 28` ✓) |
  spec.md:142:  **[HARD] 23 도 확정값으로 단독 서술하지 않는다.** …
  ```
  기준의 Then 절은 「각 값이 명령 또는 정의와 같은 표·문단 안에 있다」인데, 그 명령이 검사하는 집합은 Then 절이 말하는 집합보다 **훨씬 작다**. 통과해도 Then 절이 세워지지 않는다 — 이 프로젝트가 이름 붙인 「검증하지 않는 수용 기준」 부류다.
- 필요한 수리: (1) `spec.md` §6 에 46 의 정의·명령·37 과의 관계(자기 참조로 값이 자란 것)를 한 행으로 넣거나, 산술을 표가 정의한 값으로 다시 쓸 것. (2) `acceptance.md:174` 의 패턴을 값 목록에 46 을 포함하고 「자리」 접미 요구를 떼는 형태로 고치되, 잡히는 행이 늘어나므로 **적중 목록 보존** 요구(`acceptance.md:177`)를 그대로 유지할 것.

### 비차단 (optional) — 7건

**N-1. REQ-GATECHECKS-001 을 표적으로 인용하는 AC 가 없다** — `acceptance.md` 의 REQ 인용 9행(`:23·51·65·82·98·115·132·153·167`)은 REQ-002·004·003·005·002·006·006·007·008·009 를 가리키고 **REQ-001 은 없다**. REQ-001(`server/package.json` 에 pretest 존재)은 AC-001·004 의 **Given** 에만 나타나는데, Given 은 전제이지 단언이 아니다. `grep -c '"pretest"' server/package.json → 1` 한 줄짜리 기준을 추가하면 닫힌다. 실질 위험은 낮다(AC-001 이 pretest 없이는 통과할 수 없다).

**N-2. AC-GATECHECKS-004 는 아무것도 하지 않고도 통과한다** — `test -d server/dist && FAIL || PASS`. 현재 `server/dist` 는 없고(`ls -d server/dist` → No such file), `dist/` 는 `.gitignore:3` 에 있다. 수리가 아예 없어도, `npm test -w server` 를 돌리지 않아도 「PASS: no emit」이 나온다. `acceptance.md:12` 가 「수리 없을 때: 통과」로 정직하게 표시했으므로 은폐는 아니지만, 기준을 **의미 있게** 만들려면 실행 전 `server/dist` 부재를 확인하고 `npm test -w server` 를 실제로 돌린 **뒤** 다시 확인하는 두 시점 형태여야 한다.

**N-3. `spec.md:60` 「단계는 이 하나뿐이다」는 증거가 세울 수 있는 것보다 강하다** — 근거인 `gate-failtest.err` 는 **실패한** 실행의 출력이고, 조용히 통과한 단계는 그 안에 흔적을 남기지 않는다. 이 증거는 「npm test 가 유일한 단계」와 「npm test 가 유일하게 시끄러운 단계」를 가르지 못한다. `spec.md:117` 이 「`disabled_steps: {}` 인데도 lint 가 안 보이는 이유 미검증」으로 이미 인접하게 헤지하고 있으므로 §2 의 문장을 「관측된 단계는」으로 낮추면 충분하다.

**N-4. `spec.md:56-58` 이 인접하지 않은 두 행을 하나의 축자 블록으로 제시한다** — 인용된 `quality gate failed: npm test` 와 `> npm test --workspaces --if-present --passWithNoTests` 는 `gate-failtest.err` 에서 각각 **1행과 36행**이고, 36행 앞에는 `> test` 가 온다. 「축자로 찍힌다」는 표현과 어긋난다. 두 발췌임을 표시하거나 행 번호를 붙이면 된다.

**N-5. OD-1 은 실질적으로 열린 결정이 아니다** — (b) 는 REQ-GATECHECKS-006(같은 명령 참조)을, (c) 는 REQ-GATECHECKS-005(emit 금지)를 어긴다. 요구사항이 이미 (a) 하나만 남긴다. `plan.md:9` 의 「셋 다 REQ-001·002 를 만족한다」는 참이나, **다른 REQ 가 둘을 떨어뜨린다**는 사실이 빠져 있어 리드가 실재하지 않는 선택지를 검토하게 된다.

**N-6. 중심 전제의 귀속이 요약이다** — `plan.md:45-52` 의 장난감 워크스페이스 블록은 축자 출력이 아니라 요약이고, 원본이 `evidence/` 에 없다. 전제 자체는 이 감사가 독립 재현으로 확인했다(§3-5). 이 감사의 출력을 붙이면 귀속이 닫힌다.

**N-7. AC-GATECHECKS-006 이 줄 번호를 기대값으로 쓴다** — `acceptance.md:123` 의 `# 기대: 27행`. `plan.md:110` 이 「줄 번호 인용」을 안티 패턴으로 올리고 AC-007 이 내용 앵커를 `[HARD]` 로 요구하는 것과 어긋난다. 현재는 실제로 27행이 맞으나(`grep -n 'npm run typecheck -w server' .github/workflows/ci.yml` → 27), ci.yml 에 한 줄만 들어가면 어긋난다. `grep -c` 로 바꾸면 된다.

**N-8(참고, 규율 위반 아님). SPEC 디렉터리 안에 부산물 트리가 있다** — `.moai/specs/SPEC-GATECHECKS-001/.moai/state/{config-cache,context-usage}.json` 과 빈 `.claude/` 가 있다(에이전트가 SPEC 디렉터리를 cwd 로 돌아 생긴 것). `git check-ignore` 로 확인한 결과 `.gitignore:7 **/.moai/state/` 에 걸려 **커밋 대상이 아니다**(`git status --porcelain -uall` 이 `.md` 4개만 낸다). 다만 AC-009 의 `grep -r` 이 이 JSON 을 훑어 잡음을 만든다 — 기준 명령에 `--include='*.md'` 를 붙이는 편이 낫다.

---

## 5. 감사 자신의 미검증 (Gaps)

「확인하지 못한 것」을 추론으로 메우지 않았다. 다음은 **열린 채로 남는다**:

1. **AC-GATECHECKS-001 정방향을 실제로 돌리지 않았다.** 그러려면 `server/package.json` 에 `pretest` 를 넣고 `server/test/` 에 타입 오류를 심어야 하는데, 감사자는 트리를 편집하지 않는다. 정방향이 실제로 RC≠0 을 내는지는 **run 단계에서만 세워진다.** 이 감사가 세운 것은 그 경로가 **닫혀 있지 않다**는 것(중첩 npm 전파 실측 + 게이트 stderr 합류 실측)까지다.
2. **`moai gate` 를 타입 오류가 서 있는 상태로 돌려 보지 않았다.** 따라서 `error TS` 가 `gate-ac001.err` 에 실제로 들어오는지는 **직접 관측이 아니라 출력 라우팅 실측에서의 추론**이다. 근거는 강하지만(자식 stdout 이 stderr 로 합류함을 세 종류의 stdout 원본으로 확인) 관측은 아니다.
3. **사례 ②의 「정상 디렉터리에서는 stderr 도 0바이트」는 아무도 측정하지 않았다** — 출처도, 이 감사도. B-1 은 이 미측정을 사실로 굳힌 것을 지적하는 것이지, 반대 사실을 세우는 것이 아니다.
4. **`disabled_steps: {}` 인데 lint 단계가 보이지 않는 이유**를 이 감사도 규명하지 않았다. N-3 은 증거의 한계를 지적할 뿐 단계 수를 세지 않았다.
5. **t34 감사 발견 H-01 의 본문을 읽지 않았다.** `spec.md:106` 의 「H-01 본문이 경고를 한 번도 언급하지 않는다(grep 계수 0)」는 재확인하지 않았다 — §4 논거 ②·③ 중 조상 관계만 직접 확인했다.

**baseline 귀속.** 아래 값은 이 감사가 이 나무(HEAD `05fef76`)에서 직접 실행해 관측했다:

```
$ npm run typecheck -w server ; echo RC=$?
RC=0                                        ← 깨끗한 트리 확인 (AC-002·AC-005 둘째 행의 전제)

$ time moai gate > /tmp/od1t9/gate.out 2> /tmp/od1t9/gate.err ; echo RC=$?
RC=0
real 1:21.65                                ← 작성자 기준선 1:21.75 와 일치, AC-002 의 81±30초 대역 안
$ wc -c /tmp/od1t9/gate.out /tmp/od1t9/gate.err
       0       0                            ← 「통과는 침묵」 확인
```

게이트는 감사 중 **1회만** 실행했다. 배경 부하는 만들지 않았다.

**잔여 위험.** 위 기준선은 SPEC 산출물 4개가 미추적 상태로 놓인 트리에서 잰 값이다. `server/package.json` 이 수정되는 순간(M1) 이 기준선은 다시 재야 한다 — AC-002 가 요구하는 것이 바로 그 재측정이다.

---

## 6. 권고

**PASS 이나 여유가 0이므로, 아래 두 차단 발견을 run 단계 진입 전에 닫을 것을 권고한다.** 둘 다 문서 편집이고 코드 편집을 늘리지 않는다(범위 A+C 불변).

1. **B-2 를 먼저 닫을 것.** `spec.md:140` 의 `46` 에 정의를 붙이거나 산술을 표의 값으로 다시 쓰고, `acceptance.md:174` 의 패턴을 Then 절이 말하는 집합에 맞춰 넓힐 것. 이 SPEC 이 스스로 세운 규율을 스스로 어긴 자리이므로, 남겨 두면 REQ-GATECHECKS-009 는 착지하는 순간 이미 실패한 요구가 된다.
2. **B-1 을 닫을 것.** `spec.md:64` 에서 측정된 것과 추론된 것을 가르고, `acceptance.md:59` 의 「유일한 국소 판별자」를 실측 범위로 낮출 것. AC-002 의 명령은 그대로 두어도 된다.
3. **OD-1 = (a) 로 확정할 것.** 배제 논거는 파일에서 참이고, 권고안의 중첩 `npm run` 형태는 이 감사가 직접 측정해 안전을 확인했다(§3-3). N-5 에 따라 「REQ-005·006 이 (b)·(c) 를 떨어뜨린다」를 `plan.md` §A 에 한 행 추가하면 처분이 명확해진다.
4. **OD-2 = (a) 로 확정할 것.** 인용 대상인 역변이 RC=0 이 **어떤 증거 파일에도 없다**(§3-4). (b) 는 미귀속 값 인용이 된다.
5. 비차단 N-1·N-2·N-6·N-7 은 각각 한두 줄 수정이며 run 단계에 함께 처리해도 된다. N-3·N-4·N-8 은 리드 재량.

**회차 기록.** 이번이 1회차다. 위 수리 후 재감사는 **열거된 발견 델타에 한정**되며 전면 재감사가 아니다(Retry Loop Contract). 상한은 3회차다.
