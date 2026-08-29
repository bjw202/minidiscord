# SPEC-COVERAGE-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-COVERAGE-001` |
| 칸반 카드 | `t13` |
| Tier | S — 산출물 계약에서 **의도적으로 이탈**했다(아래) |
| 워크트리 | `.claude/worktrees/t13` (브랜치 `WT-coverage-tool`) |
| 선행 SPEC | 없음 |
| 요구사항 / 수용 기준 | 7 / 6 |

**Tier S 산출물 계약과의 차이 (명시 이탈).** `.claude/rules/moai/workflow/spec-workflow.md` § SPEC Complexity Tier 의 표는 Tier S 를 **2파일**(`spec.md` + `plan.md`, AC 는 `spec.md` §3 에 인라인)로 정한다. 이 SPEC 은 `acceptance.md` 를 별도 파일로 두어 **3파일**(+ 모든 Tier 공통인 `progress.md`)로 냈다. 사유는 형제 SPEC(`SPEC-CHANNEL-001` 계열)이 전부 별도 `acceptance.md` 를 쓰고 있어 한 저장소 안에서 읽는 자리가 갈리지 않게 하기 위해서다. 같은 규칙의 REQ/AC 상한(Tier S = 8 / 8)은 지켰다 — 이 SPEC 은 7 / 6 이다.

---

## §E.1 Plan-phase Audit-Ready Signal

| 항목 | 값 |
|------|-----|
| 작성 단계 | plan (manager-spec) |
| 산출물 | `spec.md`, `plan.md`, `acceptance.md`, `progress.md` |
| SPEC ID 정규식 검사 | `PASS` (`ID="SPEC-COVERAGE-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` 실행 결과 `PASS`) |
| 운영자 결정 반영 | D1(임계 강제·라인 85) → REQ-COVERAGE-004 · D2(server 한정, 루트 합산 없음, channel 무변경) → REQ-COVERAGE-007 |
| 기준선 실측 출처 | 오케스트레이터가 이 워크트리에서 실행 (`spec.md` §3). plan 단계는 재측정하지 않고 그 값을 인용했다 |
| plan 단계 자체 실측 | `npm ls @vitest/coverage-v8 -w server --depth=0` → `EXIT=1` · `-w channel --depth=0` → `EXIT=0` · `-w server`(depth 제한 없음) → `EXIT=0` (`plan.md` §D 2) |
| 열린 질문 | 없음 — 회귀 짝 파일 추가는 리드 판정으로 **승인**됐다 (2026-08-29. 기록은 `spec.md` §4.5, 대안 비교는 `plan.md` §D 1) |
| plan 감사 반영 | 1회차 감사(`.moai/reports/t13/plan-audit.md`, FAIL 0.62) 의 차단 7건(F-01..F-07)과 비차단 8건(N-01..N-08)을 반영해 네 산출물을 개정했다(v0.1.1). 이어 2회차 감사(`.moai/reports/t13/plan-audit-2.md`, **PASS 0.88**, 궤적 0.62→0.88, 1회차 15건 전부 종결)의 차단 2건(NEW-01 명령 형태 · NEW-02 공허한 관측)과 비차단 1건(NEW-03 선례 인용)을 반영해 다시 개정했다(v0.1.2). NEW-01 교정으로 1회차 N-07 의 «부분» 종결도 닫혔다 |
| REQ↔AC 매핑표 | 아래 표 |

### REQ↔AC 매핑표

| REQ | 매핑 AC | 비고 |
|-----|---------|------|
| REQ-COVERAGE-001 (의존성 선언 + 메이저 대역) | AC-001, AC-004(단언 1, **단언 6**) | `--depth=0` 이 우연한 해결과 직접 선언을 가른다. 대역 조항은 단언 6 + `^3.0.0` 변이가 잰다 |
| REQ-COVERAGE-002 (제공자·측정 대상·**리포터**) | AC-002, AC-004(단언 3, **단언 3b**) | 리포터 조항이 없으면 AC-002 가 읽을 파일이 만들어지지 않는다 |
| REQ-COVERAGE-003 (`coverage` 스크립트) | AC-002, AC-004(단언 2) | |
| REQ-COVERAGE-004 (임계 강제) | AC-003, AC-004(단언 4) | AC-003 은 **설정 파일의** 임계를 임시 변경해 게이트에 이빨이 있는지 직접 관측한다 |
| REQ-COVERAGE-005 (진입점 미제외 + 사유 주석) | AC-002(`HAS_INDEX`·`FILE_COUNT`), AC-004(단언 5, **단언 7**) | 주석 조항은 값으로 읽을 수 없어 단언 7 이 문자열 검사 금지의 명시 예외로 잰다 |
| REQ-COVERAGE-006 (회귀 짝) | AC-004 | 리드 승인으로 확정 — 조건부 아님 |
| REQ-COVERAGE-007 (범위 경계) | AC-005 | 변경 파일 목록은 추적 ∪ 미추적 합집합에서 `.moai/` 를 뺀 것 |
| — (매핑 없음: 절차 관측) | AC-006 | **의도적 무매핑.** RED→GREEN 전이는 완성된 시스템의 성질이 아니라 run 단계가 결함을 지나왔다는 관측이다. 사유 전문은 `acceptance.md` AC-COVERAGE-006 절 머리말 |

## §E.2 Run-phase Evidence

아래 원문은 모두 이 워크트리(`.claude/worktrees/t13`)에서 run 단계가 직접 실행해 관측한 값이다. 명령과 출력의 쌍으로 남긴다.

### 단계 0 — 전제 확인

`git rev-parse HEAD` → `362d17d0d346b3631fa4c5e6868ec55e907d2939` (기대값과 일치). 이 값을 `.moai/specs/SPEC-COVERAGE-001/.spec-base-sha` 에 기록했다.

```
$ npm ls @vitest/coverage-v8 -w server --depth=0
minidiscord@ /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t13
└── (empty)

EXIT=1                                    ← spec.md §3 의 실측값과 동일 — 결함이 있는 상태에서 출발

$ npm ls @vitest/coverage-v8 -w channel --depth=0
minidiscord@ /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t13
└─┬ @minidiscord/channel@0.1.0 -> ./channel
  └── @vitest/coverage-v8@4.1.11

EXIT=0                                    ← 대조군 — 명령 형식은 옳다
```

### 단계 1 (RED — 전이 1): 스크립트 부재

```
$ npm run coverage -w server
npm error Lifecycle script `coverage` failed with error:
npm error workspace @minidiscord/server
npm error location /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t13/server
npm error Missing script: "coverage"
npm error
npm error To see a list of scripts, run:
npm error   npm run --workspace=@minidiscord/server
EXIT=1
```

### 단계 2 — 설정과 스크립트 생성

`server/vitest.config.ts` 를 새로 만들고(provider `v8`·include `src/**`·reporter `['text','json-summary']`·thresholds `lines: 85`, 제외 없음, 상단 다섯 줄 안에 진입점 사유 주석) `server/package.json` 의 `scripts` 에 `"coverage": "vitest run --coverage"` 를 더했다. **의존성 선언은 아직 하지 않았다.**

### 단계 3 (RED — 전이 2): 돌지만 아직 결함이 남은 중간 상태

```
$ npm run coverage -w server
EXIT=0
      Coverage enabled with v8

 Test Files  10 passed (10)
      Tests  104 passed (104)

=============================== Coverage summary ===============================
Statements   : 96.5% ( 387/401 )
Branches     : 89.24% ( 166/186 )
Functions    : 97.43% ( 76/78 )
Lines        : 97.01% ( 325/335 )
================================================================================

$ npm ls @vitest/coverage-v8 -w server --depth=0
minidiscord@ /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t13
└── (empty)

EXIT=1                                    ← 커버리지가 돌아도 선언은 여전히 없다 — channel 의 끌어올려진 사본으로 해결되는 우연한 성공
```

### 단계 4 — 의존성 선언

`server/package.json` 의 `devDependencies` 에 `"@vitest/coverage-v8": "^4.1.11"` 을 더하고 워크트리 루트에서 `npm install` → 종료 `0`. `package-lock.json` 의 변경은 세 곳뿐이다 — `@vitest/coverage-v8` 과 `vitest` 항목에서 `"peer": true` 표시가 사라진 것(이제 server 의 직접 devDependency) 두 곳, server 워크스페이스의 devDependencies 목록에 새 항목 하나.

### 단계 5 (GREEN — 전이 3): AC-COVERAGE-001·002

```
$ npm ls @vitest/coverage-v8 -w server --depth=0
minidiscord@ /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t13
└─┬ @minidiscord/server@ -> ./server
  └── @vitest/coverage-v8@4.1.11

EXIT=0                                    ← @minidiscord/server 의 직접 자식(└──)으로 나타난다

$ npm ls @vitest/coverage-v8 -w channel --depth=0
minidiscord@ /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t13
└─┬ @minidiscord/channel@0.1.0 -> ./channel
  └── @vitest/coverage-v8@4.1.11

EXIT=0                                    ← 대조군
```

```
$ npm run coverage -w server
EXIT=0

=============================== Coverage summary ===============================
Statements   : 96.5% ( 387/401 )
Branches     : 89.24% ( 166/186 )
Functions    : 97.43% ( 76/78 )
Lines        : 97.01% ( 325/335 )
================================================================================

$ node -e "const s=require('./server/coverage/coverage-summary.json');
>   console.log('LINES_PCT=' + s.total.lines.pct);
>   console.log('HAS_INDEX=' + Object.keys(s).some(k => k.endsWith('src/index.ts')));
>   console.log('FILE_COUNT=' + (Object.keys(s).length - 1));"
LINES_PCT=97.01
HAS_INDEX=true
FILE_COUNT=11
```

`LINES_PCT` 97.01 ≥ 85, `HAS_INDEX=true`, `FILE_COUNT=11` — 세 값 모두 AC-COVERAGE-002 의 Then 을 만족한다.

### 단계 6 — 임계 프로브 (AC-COVERAGE-003, 관측 1·3·4)

이 시점에는 계약 테스트가 아직 없으므로 `--exclude 'test/coverage-contract.test.ts'` 는 없는 파일을 빼는 무동작이다. 이 단계가 재는 것은 관측 1·3·4 다; 관측 2 와 «제외해도 `Lines :` 가 기준선과 같다» 는 단계 7 뒤 재프로브가 잰다.

```
# 변이 전 해시
$ shasum -a 256 server/vitest.config.ts
8e1d6367705badb9e88383aaf0a4b52156e66f70440f1ff4321d22af2a7dd7ea  server/vitest.config.ts

# 설정의 lines: 85 → 98 로 임시 변경 뒤
$ npm run coverage -w server -- --exclude 'test/coverage-contract.test.ts'
PROBE_A_EXIT=1
ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)
npm error Lifecycle script `coverage` failed with error:
npm error code 1
npm error workspace @minidiscord/server
npm error command failed

# 설정을 85 로 되돌린 뒤
$ npm run coverage -w server
PROBE_B_EXIT=0
Lines        : 97.01% ( 325/335 )

# 되돌림 증명
$ shasum -a 256 server/vitest.config.ts
8e1d6367705badb9e88383aaf0a4b52156e66f70440f1ff4321d22af2a7dd7ea  server/vitest.config.ts   ← 변이 전과 동일
```

프로브 A' 는 **실제로 실패**했고 그 실패가 `does not meet global threshold (98%)` 메시지를 동반했다 — `global` 이라는 낱말이 임계가 전역으로 걸렸음을 함께 보인다. 프로브 B' 는 종료 `0`, 되돌림 해시는 변이 전과 같다.

**보조 관측 (CLI 오버라이드 — REQ-COVERAGE-004 의 근거가 아니다).**

```
$ npm run coverage -w server -- --coverage.thresholds.lines=98
AUX_EXIT=1
npm error command sh -c vitest run --coverage --coverage.thresholds.lines=98
```

vitest 의 임계 기능 자체가 이 버전에서 살아 있음을 보일 뿐, 설정 파일을 재지 않으므로 REQ-COVERAGE-004 의 근거로 쓰지 않는다.

### 단계 7 — 회귀 짝 (AC-COVERAGE-004)

`server/test/coverage-contract.test.ts` 를 `acceptance.md` AC-COVERAGE-004 의 코드 블록 그대로(임포트 줄과 한국어 주석 포함) 새로 만들었다.

```
$ npm test -w server -- --reporter=verbose
EXIT=0
 ✓ test/coverage-contract.test.ts > coverage tooling contract holds 1ms
 Test Files  11 passed (11)
      Tests  105 passed (105)
```

`✓ test/coverage-contract.test.ts > coverage tooling contract holds` 줄이 나타났고 스위트는 11 파일 / 105 테스트(품질 게이트 표의 착지 후 값)다.

### 단계 7 변이 셋 — 각 변이의 실패 테스트 집합 원문

**변이 1 — `server/package.json` 의 devDependencies 에서 `@vitest/coverage-v8` 줄 하나만 삭제 (단언 1 조준).**

```
$ npm test -w server -- --reporter=verbose
EXIT=1
 × test/coverage-contract.test.ts > coverage tooling contract holds 2ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)

$ shasum -a 256 server/package.json          # 되돌림 전
93d66587ae419e3d2138e8824e14752cf7e856208c632f8396f4177b37b3431c  server/package.json
$ shasum -a 256 server/package.json          # 되돌림 후 — 동일
93d66587ae419e3d2138e8824e14752cf7e856208c632f8396f4177b37b3431c  server/package.json
```

**변이 2 — 같은 파일에서 `"@vitest/coverage-v8"` 범위를 `"^3.0.0"` 으로 변경 (단언 6 조준).**

```
$ npm test -w server -- --reporter=verbose
EXIT=1
 × test/coverage-contract.test.ts > coverage tooling contract holds 3ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)

$ shasum -a 256 server/package.json          # 되돌림 전
93d66587ae419e3d2138e8824e14752cf7e856208c632f8396f4177b37b3431c  server/package.json
$ shasum -a 256 server/package.json          # 되돌림 후 — 동일
93d66587ae419e3d2138e8824e14752cf7e856208c632f8396f4177b37b3431c  server/package.json
```

**변이 3 — `server/vitest.config.ts` 의 reporter 배열에서 `'json-summary'` 하나만 삭제 (단언 3b 조준).**

```
$ npm test -w server -- --reporter=verbose
EXIT=1
 × test/coverage-contract.test.ts > coverage tooling contract holds 3ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)

$ shasum -a 256 server/vitest.config.ts      # 되돌림 전
8e1d6367705badb9e88383aaf0a4b52156e66f70440f1ff4321d22af2a7dd7ea  server/vitest.config.ts
$ shasum -a 256 server/vitest.config.ts      # 되돌림 후 — 동일
8e1d6367705badb9e88383aaf0a4b52156e66f70440f1ff4321d22af2a7dd7ea  server/vitest.config.ts
```

세 변이 모두에서 실패한 테스트는 **계약 테스트 하나뿐**이다 — 다른 10개 파일의 테스트는 매번 전부 통과했다.

### 단계 7 마무리 — 재프로브 (감사 2회차 NEW-02)

변이 셋을 모두 되돌린 뒤, 설정의 `lines` 를 다시 98 로 올려 같은 형태로 한 번 더 돌렸다. 이번에는 계약 테스트가 **존재하므로** `--exclude` 가 실제로 동작한다.

```
$ npm run coverage -w server -- --exclude 'test/coverage-contract.test.ts'
REPROBE_EXIT=1
 Test Files  10 passed (10)
      Tests  104 passed (104)
Lines        : 97.01% ( 325/335 )
ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)

$ shasum -a 256 server/vitest.config.ts      # 85 로 되돌린 뒤 — 변이 전과 동일
8e1d6367705badb9e88383aaf0a4b52156e66f70440f1ff4321d22af2a7dd7ea  server/vitest.config.ts
```

재프로브 출력으로 판정한 것 둘 — **관측 2**: `Test Files 10 passed (10)` · `Tests 104 passed (104)` 로 **실패한 테스트가 없다**(계약 테스트가 제외돼 임계 판정을 오염시키지 않았으므로, 0 이 아닌 종료 코드를 임계 미달 하나로 귀속할 수 있다). **«제외해도 `Lines :` 가 기준선과 같다»**: `97.01% (325/335)` 로 단계 3·5 의 기준선과 같다 — 제외된 파일이 `src/**` 를 임포트하지 않아 총계에 영향이 없음을 관측했다.

### 단계 8 — 품질 게이트

```
$ npm run typecheck -w server
> tsc --noEmit
EXIT=0

$ npm test -w server
EXIT=0
 Test Files  11 passed (11)
      Tests  105 passed (105)

$ npm test -w channel
EXIT=0
 Test Files  5 passed (5)
      Tests  70 passed (70)
```

형제 워크스페이스 `channel` 도 종료 `0` — 잠금 파일 변경이 형제를 흔들지 않았다.

### 단계 8 — AC-COVERAGE-005 범위 경계 (네 관측, 명령 여덟 줄)

`<BASE_SHA>` 는 `.spec-base-sha` 의 값 `362d17d0d346b3631fa4c5e6868ec55e907d2939` 를 문자 그대로 박아 실행했다. `acceptance.md` 의 블록을 그대로 썼다 — 명령 치환·중괄호 그룹 없음, 중간 결과는 `/tmp` 파일로.

```
# 관측 0 — 기준 파일
$ cat .moai/specs/SPEC-COVERAGE-001/.spec-base-sha
362d17d0d346b3631fa4c5e6868ec55e907d2939

# 관측 1 — 기준 SHA 가 실재하는 커밋
$ git rev-parse --verify "362d17d0d346b3631fa4c5e6868ec55e907d2939^{commit}"
362d17d0d346b3631fa4c5e6868ec55e907d2939
EXIT=0

# 관측 2 — channel 과 server/src 무변경 (두 줄)
$ git diff --stat 362d17d0d346b3631fa4c5e6868ec55e907d2939 -- channel server/src > /tmp/t13_untouched.txt
$ test -s /tmp/t13_untouched.txt
NONEMPTY=1                                    ← 출력 파일이 비어 있다 = channel 전체와 server/src 전체 무변경

# 관측 3 — 변경 파일 목록 (세 줄: 추적 ∪ 미추적, .moai/ 제외)
$ git diff --name-only 362d17d0d346b3631fa4c5e6868ec55e907d2939 > /tmp/t13_scope.txt
$ git ls-files --others --exclude-standard >> /tmp/t13_scope.txt
$ grep -v '^\.moai/' /tmp/t13_scope.txt | sort -u
package-lock.json
server/package.json
server/test/coverage-contract.test.ts
server/vitest.config.ts

# 관측 4 — 산출물이 작업 트리로 새어 나오지 않음
$ git status --porcelain
 M .moai/specs/SPEC-COVERAGE-001/progress.md
 M package-lock.json
 M server/package.json
?? .moai/logs/trace-5a341559-db33-4637-9156-f88538dc6137.jsonl
?? .moai/logs/trace-fc080515-1134-4d8e-95a7-ab5a83f3f0bb.jsonl
?? .moai/specs/SPEC-COVERAGE-001/.spec-base-sha
?? .moai/state/config-cache.json
?? .moai/state/context-usage.json
?? .moai/state/goal/
?? server/test/coverage-contract.test.ts
?? server/vitest.config.ts
```

관측 3 의 목록은 `acceptance.md` 가 선언한 네 줄과 **정확히** 같다(정렬 순서 동일, 루트 `package.json` 없음). 관측 4 에 `server/coverage/` 는 나타나지 않는다 — `.gitignore` 의 `coverage/` 가 덮는 대로다.

### AC-COVERAGE-006 — 세 전이

| 전이 | 관측 | 위 단계 |
|------|------|---------|
| 1 (RED) | `npm run coverage -w server` → `Missing script: "coverage"`, 종료 1 | 단계 1 |
| 2 (RED) | 커버리지는 종료 0 으로 돌지만 `npm ls --depth=0` 은 종료 1 — 우연한 성공 상태를 명시 관측 | 단계 3 |
| 3 (GREEN) | AC-001·002·003·004 전부 통과 | 단계 5·6·7·재프로브 |

세 전이의 원문은 위 단계 1·3·5 절에 순서대로 있다.

### Gaps — 검증하지 않은 것

- **AC-COVERAGE-004 단언 2·3·4·5·7 은 개별 변이로 확인하지 않았다.** 변이 셋은 단언 1·6·3b 만 조준했다(계획 §F 단계 7 표). 단언 2(스크립트 형태)·3(provider/include)·4(임계값 85)·5(제외 부재·전역)·7(상단 주석)은 스위트 통과로만 덮인다.
- **«channel 이 의존성을 빼는» 시나리오는 재현하지 않았다.** `acceptance.md` 엣지 케이스 표가 처음부터 «실제로 재현해 보지는 않는다» 로 못 박은 미검증이다.
- **`npm test -w server` 단독으로는 임계를 강제하지 않는다.** 설계대로다(`spec.md` §4.2 — `test` 는 커버리지를 켜지 않는다). 임계 강제는 `npm run coverage -w server` 만의 역할이다.
- **AC-COVERAGE-002 의 `FILE_COUNT=11` 은 이 카드 착지 시점의 값이다.** 다음 카드가 `server/src/` 에 파일을 더하면 이 기준은 거짓 실패하며, 갱신 의무는 그 카드에 있다(`acceptance.md` AC-002 본문의 계약).
- **AC-005 관측 4 의 untracked `.moai/` 항목들**(트레이스 로그·상태 파일)은 이 카드가 만든 것이 아니며 코드 산출물 집합 밖이다 — 관측 3 의 제외 규칙이 걸러 낸다.

## §E.3 Run-phase Audit-Ready Signal

| 항목 | 값 |
|------|-----|
| 상태 | run_status: audit-ready |
| 마일스톤 | M1 완료 — 커버리지 도구 도입 |
| AC 판정 | AC-COVERAGE-001..006 전부 PASS (원문 §E.2) |
| 코드 산출물 | 4 파일 — `server/package.json` · `server/vitest.config.ts`(신규) · `server/test/coverage-contract.test.ts`(신규) · `package-lock.json` |
| 품질 게이트 | typecheck 종료 0 · server 11 파일/105 테스트 · channel 종료 0 · `npm run coverage -w server` 종료 0, Lines 97.01% ≥ 85 |
| 임계 프로브 | 프로브 A' 종료 1 + `does not meet global threshold (98%)` · 프로브 B' 종료 0 · 재프로브(계약 테스트 존재) 종료 1 + 실패 테스트 0 + `Lines :` 기준선 동일 · 되돌림 해시 대조 전부 일치 |
| run_commit_sha | 9b86dd8963669d51cb563c1c11c46fff10b2ffda |

## §E.4 Sync-phase Audit-Ready Signal

| 항목 | 값 |
|------|-----|
| 상태 | sync_status: audit-ready |
| 산출물 | 문서 3 파일 — `CHANGELOG.md`(`[Unreleased]` 아래 «추가됨 — server 커버리지 도구 (카드 `t13`)» 절 신설, 기존 `t10` 절 **위**) · `README.md`(명령어 표에 `npm run coverage -w server` 한 행 추가) · `.moai/specs/SPEC-COVERAGE-001/progress.md`(이 §E.4). **더해서 코드 1 파일** — `server/test/coverage-contract.test.ts` (sync 감사 F-01 을 닫으며 단언 2 를 강화). **코드 산출물 «집합» 은 여전히 4 파일이며 늘지 않았다** — 그 파일은 이미 run 단계의 네 산출물 중 하나이므로, 변경 파일 목록을 다시 세도 네 줄 그대로다(이 단계가 AC-COVERAGE-005 관측 3 을 재실행해 확인: `package-lock.json` · `server/package.json` · `server/test/coverage-contract.test.ts` · `server/vitest.config.ts`). 달라진 것은 «집합의 크기» 가 아니라 «누가 손댔는가» 다 — 그래서 **「sync 단계는 문서만 건드렸다」는 서술은 이제 거짓**이고, 아래에서 그 취지의 문장을 전부 고쳤다 |
| 상태 전이 | `spec.md` frontmatter `status: in-progress → completed`, `updated: 2026-08-29`, `version: 0.1.2 → 0.2.0` + HISTORY 한 행. `plan.md`·`acceptance.md`·`progress.md` 에는 frontmatter 블록 자체가 없어 전이할 필드가 없다(없는 필드를 새로 만들지 않았다) |
| 검증 재실행 | run 단계의 숫자를 옮겨 적지 않고 이 트리에서 **다시 실행해** 같은 값이 나오는 것을 관측했다. 명령과 원문은 아래 표 |
| 증거 디렉터리 | `.moai/state/verify/t13-sync/` (`typecheck.log` · `coverage.log` · `channel-test.log` · `hash-before.txt` · `hash-after.txt`) |
| 귀속 기준선 | HEAD `4222a5520e229e621ecd882f166b37ea5b58975b`(짧게 `4222a55`), 워크트리 `.claude/worktrees/t13`, 브랜치 `WT-coverage-tool`. 측정 전후로 HEAD 불변, 소스 세 파일 해시 불변 |
| sync 감사 판정 | `sync-auditor --deep` → **PASS 85.2** (Functionality 92 / Security 88 / Craft 80 / Consistency 82, 가중 조화평균) · **차단 0건** · 보고서 `.moai/reports/t13/sync-audit.md` |
| 감사 지적 반영 | 비차단 3건(F-03·F-04·F-05)을 이 트리에서 정정했다 — ① `CHANGELOG.md` 의 «CI 배선이 없다» 를 «커버리지를 부르는 CI 가 없다» 로 좁혔다(`.github/workflows/label-sync.yml` 과 `.git_hooks/pre-commit` 이 실재한다는 감사 실측을 이 단계가 `ls`·`head` 로 재확인) ② 계약 단언 개수를 «일곱» → «여덟» 로 고치고 열거 순서를 계약 테스트의 주석 번호(`1·2·3·3b·4·5·6·7`)와 같은 묶음으로 재정렬했다 ③ 아래 Residual-risk 의 `AC-001` 등장 횟수를 «한 번» → «두 번(`:222`·`:299`)» 으로 고쳤다(`grep -n` 으로 직접 재확인). **차단 아님이었으나 운영자가 이 카드에서 닫기로 확정한 F-01 은 코드 강화로 종결했다** — 아래 «이 카드에서 닫은 것» 절 |
| sync_commit_sha | 1cd94ad1809618b2563ba06392a54ad4524c177c |

### 재실행 검증 — 명령과 관측 원문

| 명령 | 관측 |
|------|------|
| `npm run typecheck -w server` | 종료 `0` (`> tsc --noEmit`, 출력 없음) |
| `npm run coverage -w server` | 종료 `0` · `Test Files  11 passed (11)` · `Tests  105 passed (105)` · `All files` 행 `% Stmts 96.5 \| % Branch 89.24 \| % Funcs 97.43 \| % Lines 97.01` · 커버리지 요약 `Statements : 96.5% ( 387/401 )` `Branches : 89.24% ( 166/186 )` `Functions : 97.43% ( 76/78 )` `Lines : 97.01% ( 325/335 )` · 파일별 `index.ts` 행 `82.35 \| 25 \| 83.33 \| 83.33 \| 66-72` |
| `npm test -w channel` | 종료 `0` · `Test Files  5 passed (5)` · `Tests  70 passed (70)` — 형제 워크스페이스 무회귀 |
| `npm ls @vitest/coverage-v8 -w server --depth=0` | 종료 `0` · `└─┬ @minidiscord/server@ -> ./server` / `  └── @vitest/coverage-v8@4.1.11` — 끌어올려진 사본이 아니라 **직접 자식**으로 나타난다 |
| `shasum -a 256 server/vitest.config.ts server/package.json server/test/coverage-contract.test.ts` (측정 전후 2회) | 두 회 동일 — `8e1d6367…7dd7ea` · `93d66587…3431c` · `a70dec5f…ee866`. 측정이 트리를 오염시키지 않았다 |

이 표의 `Lines 97.01% (325/335)` 는 §E.2 단계 3·5 와 `spec.md` §3 의 기준선과 같은 값이다 — run 단계의 관측이 이 트리에서 재현된다.

### Gaps — 이 sync 단계가 관측하지 않은 것

- **AC 여섯 건을 다시 판정하지 않았다.** AC-COVERAGE-001..006 의 PASS 근거는 §E.2 의 run 단계 원문이고, 이 단계가 재실행한 것은 품질 게이트 + 의존성 선언 + 오염 대조 + AC-COVERAGE-005 관측 3(변경 파일 목록)이다. **§E.2 의 임계 프로브(설정 `lines` 85→98 변이)와 회귀 짝 변이 셋(단언 1·6·3b 조준)은 재현하지 않았다** — 그 넷은 여전히 run 단계의 관측이다. 다만 **이 단계도 변이 프로브를 돌렸다**(F-01 우회 프로브 2종, 위 «이 카드에서 닫은 것»). 즉 「문서 동기화 단계는 트리를 변이시키지 않는다」는 처음의 판단은 F-01 을 이 카드에서 닫기로 하면서 **뒤집혔고**, 그 사실을 여기 남긴다.
- **«라인 85 미만이면 커버리지 명령이 실패한다» 를 이 단계에서 관측하지 않았다.** 그 근거는 여전히 §E.2 단계 6 의 프로브 A' 와 단계 7 재프로브이며 이 단계의 관측이 아니다. 이 단계가 빨간불을 본 것은 **계약 테스트의 실패**(F-01 우회 프로브 2종, `npm test -w server` 종료 1)이지 **커버리지 임계 게이트의 실패**가 아니다 — 서로 다른 두 게이트이며 한쪽의 실증이 다른 쪽을 덮지 않는다.
- **CI 배선의 «존재» 는 확인했으나 «동작» 은 관측하지 않았다.** 감사 지적(F-03)을 정정하며 `ls .github/workflows/` 와 `head .github/workflows/label-sync.yml` 로 워크플로 파일이 실재하고 `workflow_dispatch` + `push: main` 트리거를 가진 것까지는 확인했다. 그러나 **그 워크플로를 실제로 돌려 보지 않았고**, `.git_hooks/pre-commit` 이 `moai gate` 를 부르는 것도 감사 실측을 인용한 것이지 이 단계가 훅을 발화시켜 본 것은 아니다. 「커버리지 명령을 부르지 않는다」는 서술의 근거는 파일 내용이지 실행이 아니다. (`t21` 후속 관측 — 이 단계가 읽은 트리거 서술은 불완전했다: push 트리거에는 `paths:` 경로 필터가 걸려 있고, 설치된 훅은 `pre-commit` 외에 `pre-push` 도 있다. 정정본은 `spec.md` §5 `0.2.2`. 위 문장은 그때 이 단계가 관측한 범위를 적은 기록이므로 그대로 둔다.)
- **`CHANGELOG.md`·`README.md` 의 문장이 사실인지는 이 단계가 실행한 명령이 덮는 범위까지만 검증됐다.** 두 문서에 적힌 숫자는 전부 위 표에서 왔으나, 서술문(끌어올리기 메커니즘 설명, F-10 선례 인용, 회귀 짝이 무엇을 잠그는지)은 `spec.md`·`acceptance.md`·`server/vitest.config.ts` 를 읽어 옮긴 것이지 실행으로 잰 것이 아니다.
- **`sync_commit_sha` 는 자리표시자다.** 커밋이 자기 SHA 를 모르는 물리적 한계이며, D3 관례대로 후속 백필 커밋이 채운다.

### 이 카드에서 닫은 것 — sync 감사 F-01 (계약 테스트 우회 경로)

**결정 근거.** F-01 은 감사 판정상 **비차단**이었고 이 단계는 처음에 후속 카드로 넘겼으나, **운영자가 2026-08-29 (리드 전달) 로 «이 카드에서 닫기» 를 확정**했다. 사유는 이 결함이 이 SPEC 이 §4.4 에서 스스로 막겠다고 선언한 부류(제외로 헤드라인을 예쁘게 만드는 일)의 **다른 입구**라는 것 — 카드를 넘기면 «막았다» 는 문서와 실제가 갈린 채로 닫힌다.

**결함.** 단언 2 가 `expect(pkg.scripts.coverage).toMatch(/--coverage|coverage\.enabled/)` 라는 **포함 검사**여서, `coverage` 스크립트 뒤에 인자를 덧붙여도 정규식이 여전히 맞았다. 감사 실측: `--coverage.exclude=src/index.ts` 를 붙이면 스위트가 완전히 초록인 채 헤드라인이 `97.01% → 98.36%`, `FILE_COUNT=10`, `HAS_INDEX=false` 가 된다. `--coverage.thresholds.lines=0` 이면 임계 자체가 무력해진다. 설정 파일이 아니라 **스크립트 인자**를 통한 경로이므로 단언 4·5(임계값·제외 부재)는 이것을 잡지 못한다.

**조치.** 단언 2 를 **완전 일치**로 좁혔다 — `expect(pkg.scripts.coverage).toBe('vitest run --coverage')`. 사유 주석 4줄을 단언 위에 붙였다. 항목을 더한 것이 아니라 기존 한 항목의 **형태**를 좁힌 것이므로 계약 항목 수는 여덟 그대로다.

**실효 증거 (변이 프로브 2종).** 통과 관측만으로는 «단언이 살아 있다» 를 얻을 수 없으므로 우회를 실제로 시도했다.

| 상태 | 명령 | 관측 |
|------|------|------|
| 강화 후 정상 | `npm test -w server` | 종료 `0` · `Test Files  11 passed (11)` · `Tests  105 passed (105)` |
| 우회 프로브 1 — `coverage` 를 `"vitest run --coverage --coverage.exclude=src/index.ts"` 로 변이 | `npm test -w server` | 종료 **`1`** · `Test Files  1 failed \| 10 passed (11)` · `Tests  1 failed \| 104 passed (105)` · `AssertionError: expected 'vitest run --coverage --coverage.excl…' to be 'vitest run --coverage'` |
| 우회 프로브 2 — `"vitest run --coverage --coverage.thresholds.lines=0"` 로 변이 | `npm test -w server` | 종료 **`1`** · `1 failed \| 104 passed` · `Received: "vitest run --coverage --coverage.thresholds.lines=0"` |
| 되돌림 증명 | `shasum -a 256 server/package.json` · `git diff server/package.json` | 변이 전후 `93d66587…3431c` 일치, diff 빈 출력 |

**두 프로브 모두 실패한 테스트는 계약 테스트 하나뿐**(`1 failed | 104 passed`)이다 — 나머지 104 개가 통과한 채이므로 비정상 종료를 이 단언 하나에 귀속할 수 있다. 로그: `.moai/state/verify/t13-sync/f01-green.log` · `f01-probe.log` · `f01-probe2.log`.

**강화 후 최종 게이트.** `npm run typecheck -w server` 종료 `0` · `npm run coverage -w server` 종료 `0` (11 파일 / 105 테스트, `Lines : 97.01% ( 325/335 )`, All files Stmts 96.5 / Branch 89.24 / Funcs 97.43) · `npm test -w channel` 종료 `0` (5 파일 / 70 테스트, 형제 무회귀). 로그: `typecheck-final.log` · `coverage-final.log` · `channel-final.log`. **커버리지 수치는 강화 전후로 같다** — 단언을 좁힌 것이 측정 대상을 바꾸지 않았다는 뜻이다.

### 후속 카드로 넘어가는 비차단 발견 (sync 감사)

- **F-02 — `FILE_COUNT=11` 은 `server/src/` 의 파일 수와 정의상 같은 값이다.** 다음 카드가 소스 파일을 하나 더하면 AC-COVERAGE-002 가 거짓 실패하고, 그 실패는 «환경 탓» 으로 읽히기 쉽다. 갱신 의무는 파일을 더하는 카드에 있다(§E.2 Gaps 4 와 같은 항목이며, 감사가 «정의상 동치» 라는 성격을 명시했다).

### Residual-risk

- **문서가 게이트를 대신하지 않는다.** `README.md` 에 명령을 적는 것은 사람이 그것을 부르게 만들 확률을 높일 뿐이고, 부르지 않으면 임계는 여전히 조용하다. 커버리지를 부르는 CI 가 설 때까지 이 위험은 그대로다 — 배선 자체(워크플로 `.github/workflows/label-sync.yml`, 설치된 훅 `.git_hooks/pre-commit`·`.git_hooks/pre-push`)는 이미 있으므로, 후속 카드가 할 일은 `.git_hooks/pre-push` 에 명령을 얹거나 `.github/workflows/` 에 잡을 새로 더하는 것이다. **`label-sync.yml` 은 재사용 대상이 아니다** — push 트리거에 경로 필터가 걸려 있어 `server/` 코드 변경으로는 발화하지 않으므로, 거기에 얹으면 이 문단이 경고하는 «조용한 임계» 를 그대로 재생산한다. (`t21` 정정 — `spec.md` §5 개정본 `0.2.2`)
- **`acceptance.md` 안에 `AC-001` 이라는 축약 표기가 두 번 등장한다** — `acceptance.md:222` 와 `acceptance.md:299`(둘 다 REQ↔AC 대응 서술의 줄임말이며, `grep -n 'AC-001'` 로 두 자리를 직접 확인했다). 정식 식별자는 `AC-COVERAGE-001..006` 여섯 건이며, 기계적으로 AC 식별자를 세면 축약형까지 잡혀 7 로 읽힌다. 이 sync 단계는 축약형을 정정하지 않았다 — 본문 수정은 manager-docs 의 권한 밖이다. **정정하는 사람은 두 자리를 함께 고쳐야 한다**; 한 자리만 고치고 «정정했다» 고 적으면 그 기록이 다시 거짓이 되는 부류다.

### 감사가 반증한 것 — 위험이 아니라 확인된 정상

이 두 항목은 sync 단계가 처음에 소프트 스팟으로 적었으나, 감사가 실측으로 반증했다. 다음에 이 문서를 읽는 사람이 같은 의심을 반복하지 않도록 결론을 남긴다.

- **`spec.md` §4.4 의 미커버 구간 표기 `66-68·71-72` 는 틀린 것이 아니라 리포터보다 정확하다.** `coverage-final.json` 원문이 미커버 구문의 시작줄을 `55,66,67,68,71,72` 로 내고, 69·70 행은 주석이라 애초에 계측 대상이 아니다. 텍스트 리포터가 출력하는 `66-72` 쪽이 **연속 범위로 접은 표시**다. 두 표기는 모순이 아니며 SPEC 본문을 고칠 이유가 없다.
- **`plan.md`·`acceptance.md`·`progress.md` 에 frontmatter 가 없는 것은 반쪽 전이가 아니라 이 저장소의 관례다.** 감사가 `SPEC-AUTH-001`·`SPEC-CORE-001`·`SPEC-GATEWAY-001`·`SPEC-CHANINJECT-001` 을 확인한 결과 네 SPEC 모두 세 문서에 frontmatter 를 두지 않는다. `spec.md` 하나만 상태를 들고 있는 것이 정상 형태이며, 없는 필드를 새로 만들지 않은 이 단계의 처리가 관례에 맞다.

## §F Phase 4 Mode Selection

Decision: **serial** — 단일 마일스톤(M1), 순서 의존 절차형 실행(단계 0..9), 코딩 중심 작업의 기본값(Anthropic coding-task caveat).

| 항목 | 값 |
|------|-----|
| 티어 / 코드 산출물 | S / 4 파일 (`server/package.json`, `server/vitest.config.ts` 신규, `server/test/coverage-contract.test.ts` 신규, `package-lock.json`) |
| 도메인 수 | 1 (server 워크스페이스 설정 + 계약 테스트) |
| 파일 언어 혼합 | TypeScript 설정 1 + 테스트 1 + JSON 2 |
| 동시성 이점 | 낮음 — 단계마다 원문 증거를 남기는 직렬 절차, 쓰기 경합 이득 없음 |
| Implementation Kickoff Approval | 통과 — 운영자 승인(리드 디스패치 2026-08-29, 카드 t13, 자율 진행 + goal 등록 포함) |
| Phase 1 Plan Audit Gate | **생략**(스킵 계약 3조건 충족) — ① 최종 판정 `plan-audit-2.md` **PASS 0.88** ② Tier S 임계 0.75 이상 ③ 산출물 해시 불변(판정 이후 개정 없음, plan 커밋 `362d17d`) |

| 모드 | 선택 | 근거 |
|------|------|------|
| direct | 아니오 | 설정·테스트 신설 + 30여 명령의 원문 증거 수집 — 단일 응답 범위 초과 |
| **serial** | **예** | 단일 마일스톤 + 순서 의존 — 카드 워크트리 안에서 general-purpose 역할 위임([[feedback_manager-develop-in-card-worktree]]) |
| fanout | 아니오 | 연구 다발 아님; 병렬 쓰기 경합만 위험 |
| sweep | 아니오 | 단일 균일 변형이 아니라 절차형 관측 |
