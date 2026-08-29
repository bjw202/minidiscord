# SPEC 계획 감사 보고 — 카드 `t13` / `SPEC-COVERAGE-001`

| 항목 | 값 |
|---|---|
| 감사 대상 | `.moai/specs/SPEC-COVERAGE-001/` (spec.md · plan.md · acceptance.md · progress.md) |
| 반복 | 1회차 / 3 |
| 트리 | `.claude/worktrees/t13`, 브랜치 `WT-coverage-tool`, HEAD `3633bd3` |
| Tier | S (PASS 임계 **0.75** — `spec-workflow.md` §SPEC Complexity Tier) |
| **판정** | **FAIL** |
| 종합 점수 | **0.62** (조화평균) · 산술평균 0.65 |
| 차단 발견 | **7건** (Critical 1 · High 3 · Medium 3) |
| 비차단 발견 | 8건 |

> M1 Context Isolation — 작성자의 추론 맥락은 무시했다. 판단 근거는 트리에 있는 산출물 파일과 이 감사가 **직접 실행한 명령의 출력**뿐이다.

---

## 0. 쉬운 말 요약

이 SPEC 의 **설계 방향은 옳다.** 커버리지 임계를 파일마다가 아니라 전체 합계에 거는 선택, 진입점을 제외하지 않는 선택, 그리고 "설정이 지워지면 테스트가 빨개져야 한다"는 회귀 짝 — 셋 다 이 감사가 실제로 돌려 보고 맞다는 것을 확인했다. 특히 작성자가 "확인하지 못했다"고 솔직히 적어 둔 위험 하나(임계값을 명령줄에서 덮어쓰는 형식이 이 vitest 버전에서 되는가)를 이 감사가 실행해 봤는데 **된다.** 그 위험은 좋은 쪽으로 해소됐다.

그런데도 FAIL 이다. 이유는 **수용 기준 여섯 개 중 넷이 지금 형태 그대로는 작동하지 않거나, 작동해도 이 카드가 만드는 것을 재지 않기 때문**이다.

가장 심각한 것은 세 번째 기준이다. "게이트에 이빨이 있는지 확인한다"고 적혀 있지만, 그 명령은 **설정 파일이 아예 없는 지금 이 순간에도 그대로 통과한다** — 이 감사가 실제로 그렇게 해 봤다. 임계값을 명령줄로 직접 넘겨 주니 vitest 가 그 값으로 판정할 뿐이고, 이 카드가 설정 파일에 심을 «85» 는 한 번도 읽히지 않는다. 이 저장소가 이미 세 번 넘게 겪은 「아무것도 재지 않는 기준」 부류이고, 아이러니하게도 문서가 «대체 경로» 로 밀어 둔 방법(설정 파일을 잠시 98 로 바꿔 보기)이야말로 제대로 재는 방법이다.

나머지 셋도 실행하면 그대로 터진다. 두 번째 기준은 없는 파일을 읽고(기본 설정은 그 파일을 만들지 않는다), 네 번째 기준의 테스트 코드는 첫 줄에서 `it is not defined` 로 죽고, 다섯 번째 기준은 새로 만든 파일 두 개를 **볼 수 없는** 명령으로 파일 목록을 잰다.

그리고 문서 전체가 아직 «Q1 은 열려 있다» 는 전제로 쓰여 있다. 리드가 이미 승인했으므로 17군데가 낡은 기록이다. 심지어 문서가 스스로 "이 질문은 한 곳에만 있다"고 적어 놓았는데 실제로는 네 파일에 흩어져 있다.

전부 계획 단계에서 값싸게 고칠 수 있고, 설계 결정(전역 임계 · 제외 없음 · 회귀 짝)은 **하나도 바꿀 필요가 없다.**

---

## 1. Claim (주장)

| # | 주장 |
|---|------|
| A1 | `spec.md` §3 의 기준선 수치 **네 개 전부 정확하다** — 이 감사가 재측정해 바이트 단위로 일치했다 |
| A2 | `--coverage.thresholds.lines=<n>` CLI 오버라이드는 **인식된다** (`plan.md` §E 첫 위험은 해소) — npm 스크립트 경유 경로까지 실행 확인 |
| A3 | 그러나 **AC-COVERAGE-003 프로브 A 는 이 카드가 만드는 것을 재지 않는다** — 설정 파일이 존재하지 않는 상태에서도 동일하게 실패(exit 1)한다. 실행으로 확인 |
| A4 | **AC-COVERAGE-002 는 실행되지 않는다** — 기본 리포터가 `coverage-summary.json` 을 만들지 않고, 어떤 REQ 도 `json-summary` 리포터를 요구하지 않는다 |
| A5 | **AC-COVERAGE-004 의 테스트 코드는 그대로 두면 죽는다** — `ReferenceError: it is not defined` |
| A6 | **AC-COVERAGE-005 관측 3 은 거짓 실패한다** — `git diff --name-only` 는 미추적 신규 파일 둘을 보지 못한다 |
| A7 | AC-COVERAGE-004 의 **변이 설계는 정확하다** — 실제로 돌려 보니 딱 1건 실패 / 104건 통과 |
| A8 | 전역 임계 선택(§4.3)은 **옳다** — 설정 파일 임계가 전역으로 걸리고 오늘 트리에서 통과함을 실행 확인 |
| A9 | Q1 이 닫혔음에도 **17군데가 «열려 있음» 전제로 남아 있다**. `spec.md`:148 의 자기 주장("여기 한 곳에만 있다")은 자기 문서가 반증한다 |
| A10 | `REQ-COVERAGE-001` 의 «메이저 대역» 조항과 `REQ-COVERAGE-005` 의 «한국어 주석» 조항은 **어떤 AC 도 재지 않는다** |
| A11 | `plan.md`:54 의 «미커버 8행» 은 실측 **5행**이다 |
| A12 | 필수 통과 기준: MP-1·2·3·5·7 PASS, MP-4·6 N/A — 실패 없음 |

---

## 2. Evidence (증거 — 실행한 명령과 원문 출력)

### E1 — 트리 확인

```
$ pwd && git branch --show-current
/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t13
WT-coverage-tool
```

### E2 — 기준선 재측정: `spec.md` §3 의 수치는 전부 정확하다 (A1)

```
$ npx vitest run --root server --coverage.enabled --coverage.provider=v8 \
    --coverage.include='src/**' --coverage.reporter=json-summary --coverage.reporter=text-summary \
    --coverage.reportsDirectory=/tmp/t13cov
EXIT=0

 Test Files  10 passed (10)
      Tests  104 passed (104)

=============================== Coverage summary ===============================
Statements   : 96.5% ( 387/401 )
Branches     : 89.24% ( 166/186 )
Functions    : 97.43% ( 76/78 )
Lines        : 97.01% ( 325/335 )
================================================================================
```

파일별(json-summary 파싱):

```
$ node -e "...coverage-summary.json..."
KEYS=12
FILE_COUNT=11
HAS_INDEX=true
src/auth.ts 100 36/36        src/config.ts 100 5/5          src/db.ts 100 5/5
src/gateway.ts 98.83 85/86   src/index.ts 83.33 25/30       src/mention.ts 100 5/5
src/permissions.ts 100 23/23 src/routes-bots.ts 100 32/32   src/routes-messages.ts 94.02 63/67
src/routes-rooms.ts 100 27/27 src/sse.ts 100 19/19
```

`spec.md` §3 의 표(Statements 96.5%/387·401, Branches 89.24%, Functions 97.43%, Lines 97.01%/325·335)와 파일별 목록, `FILE_COUNT=11`, `HAS_INDEX=true` 가 **전부 일치**한다.

### E3 — CLI 오버라이드는 인식된다 (A2) — 그리고 바로 그 이유로 AC-003 이 아무것도 재지 않는다 (A3)

**이 관측은 `server/vitest.config.ts` 가 존재하지 않는 상태**(구현 전, 오늘의 트리)에서 실행했다.

```
$ npx vitest run --root server --coverage.enabled --coverage.provider=v8 \
    --coverage.include='src/**' --coverage.thresholds.lines=98
PROBE_A_EXIT=1

Lines        : 97.01% ( 325/335 )
ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)

$ npx vitest run ... --coverage.thresholds.lines=85
PROBE_B_EXIT=0
```

`acceptance.md`:114 가 «예» 로 적어 둔 메시지 문자열이 **글자 그대로 맞다.** 그런데 이 두 관측은 **설정 파일이 하나도 없는 상태에서 나왔다.** 즉 AC-COVERAGE-003 의 두 프로브는 이 카드가 착지하기 **전에 이미 전부 통과**한다.

npm 스크립트 경유 경로도 확인했다(임시 프로브 파일 사용, §5 에서 복원 증명).

```
$ npm run coverage -w server -- --coverage.thresholds.lines=98
PROBE_A_EXIT=1
npm error command sh -c vitest run --coverage --coverage.thresholds.lines=98
(로그에 "does not meet global threshold (98%)" 1회 포함)

$ npm run coverage -w server -- --coverage.thresholds.lines=85
PROBE_B_EXIT=0
```

### E4 — 설정 파일 임계는 전역으로 실제 작동한다 (A8) — «대체 경로» 가 옳은 경로다

임시 `server/vitest.config.ts` 의 `thresholds: { lines: 98 }` 로 두고 **오버라이드 없이** 실행:

```
$ npx vitest run --root server --coverage.enabled
CONFIG98_EXIT=1
Lines        : 97.01% ( 325/335 )
ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)
```

`thresholds: { lines: 85 }` 로 두고 실행하면 `index.ts` 가 83.33% 여도 종료 0 이다(E5 의 `PROBE_B_EXIT=0`). **전역 임계 선택(§4.3 · plan §B)이 옳다는 실행 증거**이며, 동시에 «설정을 잠시 98 로 바꿔 재는» 경로가 게이트를 실제로 재는 유일한 경로라는 증거다.

### E5 — `coverage-summary.json` 은 기본 설정으로 만들어지지 않는다 (A4)

임시 `server/vitest.config.ts`(provider·include·thresholds 만, 리포터 미지정) + `"coverage": "vitest run --coverage"` 스크립트로 실행한 뒤:

```
$ ls -1 server/coverage/
auth.ts.html   base.css   block-navigation.js   clover.xml   config.ts.html
coverage-final.json   db.ts.html   favicon.png   gateway.ts.html   index.html
index.ts.html   mention.ts.html   permissions.ts.html   prettify.css   prettify.js
routes-bots.ts.html   routes-messages.ts.html   routes-rooms.ts.html
sort-arrow-sprite.png   sorter.js   sse.ts.html
```

`coverage-summary.json` 이 **없다**(있는 것은 `coverage-final.json`). AC-COVERAGE-002 의 명령을 원문 그대로 실행하면:

```
$ node -e "const s=require('./server/coverage/coverage-summary.json'); ..."
EXIT=1
Error: Cannot find module './server/coverage/coverage-summary.json'
```

### E6 — AC-004 의 테스트 코드는 원문 그대로면 죽는다 (A5)

`acceptance.md`:135-157 의 코드를 그대로 `server/test/coverage-contract.test.ts` 로 두고 실행:

```
$ npx vitest run --root server test/coverage-contract.test.ts
EXIT=1

 FAIL  test/coverage-contract.test.ts [ test/coverage-contract.test.ts ]
ReferenceError: it is not defined
 ❯ test/coverage-contract.test.ts:5:1
      5| it('coverage tooling contract holds', async () => {
       | ^

 Test Files  1 failed (1)
      Tests  no tests
```

기존 `server/test/*.test.ts` 10개는 **전부** `import { describe, it, expect } from 'vitest'` 로 시작한다(globals 미사용). 첫 줄에 `import { it, expect } from 'vitest'` 를 더하면 통과한다:

```
$ npx vitest run --root server test/coverage-contract.test.ts --reporter=verbose
EXIT=0
 ✓ test/coverage-contract.test.ts > coverage tooling contract holds 1ms
```

부수 확인 — `import viteConfig from '../vitest.config.js'` 의 **해석은 문제없다**(위 실행이 5행까지 도달했다는 것이 증거이며, 임포트 수정판은 완주한다).

### E7 — AC-004 의 변이 설계는 정확하다 (A7)

`server/package.json` 의 `devDependencies` 에서 `@vitest/coverage-v8` 한 줄만 지우고 전체 스위트 실행:

```
$ npm test -w server -- --reporter=verbose
EXIT=1
 × test/coverage-contract.test.ts > coverage tooling contract holds 2ms
 FAIL  test/coverage-contract.test.ts > coverage tooling contract holds
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)
```

**정확히 그 테스트 하나만** 실패한다. `acceptance.md`:161 의 조준 요구를 만족한다.

### E8 — `git diff --name-only` 는 신규 파일을 보지 못한다 (A6)

프로브 파일 셋이 트리에 있는 상태(= run 단계 `plan.md` §F 단계 8 시점과 같은 상태: 신규 2 파일 미추적, `server/package.json` 수정):

```
$ git diff --name-only HEAD
server/package.json

$ git status --short
 M server/package.json
?? .moai/specs/SPEC-COVERAGE-001/
?? server/test/coverage-contract.test.ts
?? server/vitest.config.ts
```

AC-COVERAGE-005 관측 3 이 «정확히» 나와야 한다고 선언한 네 항목 중 **둘(`server/vitest.config.ts`, `server/test/coverage-contract.test.ts`)과 `.moai/specs/SPEC-COVERAGE-001/` 문서 전부가 목록에 없다.** `plan.md` §F 는 단계 8(AC-005)을 단계 9(커밋)보다 **먼저** 두므로 이 상태가 관측 시점이다.

### E9 — 진입점 미커버 행은 5행이다 (A11)

```
$ node -e "...coverage-final.json 의 statementMap 파싱..."
stmts 6 uncovered /34
uncovered start-lines: 66,67,68,71,72 count 5 total distinct lines 30
```

`index.ts` 는 25/30 = 83.33%, 즉 **미커버 5행**(66·67·68·71·72). `plan.md`:54 의 «미커버 8행» 과 다르다. 또한 미커버 «구문» 6개 중 하나는 **55행**(`setPermissionHandler` 콜백 본문)으로 진입점 블록 **밖**이다.

원문 대조 — 진입점 블록의 실제 범위:

```
$ cat -n server/src/index.ts | tail -20
    65	if (process.argv[1]?.includes('index.ts')) {
    66	  const app = await buildServer()
    ...
    73	  }
    74	}
```

블록 자체는 **65-74행**이고, `spec.md`:68·135 가 적은 «66-73행» 은 블록이 아니라 그 안쪽이다.

### E10 — AC-006 전이 1 의 기대 문자열은 틀렸다

```
$ npm run coverage -w server
EXIT=1
npm error Lifecycle script `coverage` failed with error:
npm error workspace @minidiscord/server
npm error Missing script: "coverage"
```

`acceptance.md`:193 은 `npm ERR! Missing script: "coverage"` 를 기대한다. 실제 접두는 `npm error` 다(`Missing script: "coverage"` 부분은 맞다).

### E11 — Q1 낡은 기록 17군데 (A9)

```
$ grep -n "Q1\|판정 대기\|무르면\|승인 시" .moai/specs/SPEC-COVERAGE-001/*.md
progress.md:24, progress.md:36
plan.md:60, 66, 70, 72, 114, 127, 142, 154, 162, 178
acceptance.md:124, 181, 227, 230
spec.md:148, 158, 161
```

`spec.md`:148 은 "이 질문은 이 문서에서 여기 한 곳에만 있고" 라고 적었고 `plan.md`:72 는 "Q1 의 본문은 `spec.md` §4.5 한 곳에만 있다" 라고 적었다. 그러나 `plan.md`:60 의 **제목 자체**가 `### 1. [운영자 판정 대기] …` 이고, `plan.md`:127·142·154·162·178 이 판정 유무에 따라 분기하는 실행 지시를 담는다.

### E12 — 그 밖의 사실 대조 (전부 SPEC 기술대로 참)

```
$ npm ls @vitest/coverage-v8 -w server --depth=0
minidiscord@ /Users/.../t13
└── (empty)
EXIT=1

$ grep -n coverage .gitignore
4:coverage/

$ grep -n "coverage-v8" channel/package.json
18:    "@vitest/coverage-v8": "^4.1.11",

$ npm run typecheck -w server        # 프로브 파일 둘이 트리에 있는 상태
EXIT=0
```

`server/tsconfig.json` 의 `include` 는 `["src","test"]` 이며 신규 테스트가 `../vitest.config.js` 를 임포트해도 타입 검사는 통과한다 — **이 자리에 지뢰는 없다.**

---

## 3. Baseline-attribution (기준 귀속)

- 모든 측정은 이 워크트리(`.claude/worktrees/t13`), HEAD `3633bd3`, 2026-08-29 에 실행했다.
- 커버리지 수치는 `/tmp/t13cov/coverage-summary.json` · `/tmp/t13cov2/coverage-final.json`(감사 전용, 저장소 밖).
- 임시 변이는 `server/package.json`(추적 파일) 1건 + 신규 미추적 파일 2건이며 §5 에서 해시 대조로 복원을 증명했다.
- `spec.md` §3 의 값은 **인용하지 않고 재측정**했다. 일치했으므로 통과 근거로 쓴다.

---

## 4. 차단 발견 (7건)

### F-01 — AC-COVERAGE-003 프로브 A 는 이 카드가 만드는 것을 재지 않는다 · **Critical**

- **위치**: `acceptance.md`:104-118 (특히 106-112), `plan.md`:94-98, `spec.md`:124
- **무엇이 잘못됐나**: 프로브가 임계값을 **CLI 로 직접 넘긴다.** 그러면 vitest 는 넘겨받은 값으로 판정하며, 이 카드가 `server/vitest.config.ts` 에 심을 `thresholds: { lines: 85 }` 는 **한 번도 읽히지 않는다.** E3 이 그것을 실행으로 보였다 — 설정 파일이 존재하지 않는 오늘의 트리에서 프로브 A 는 `exit 1`, 프로브 B 는 `exit 0` 으로 **이미 둘 다 «통과»** 한다. 즉 REQ-COVERAGE-004(임계 강제)를 통째로 지워도 이 기준은 초록이다. `acceptance.md`:18 이 스스로 세운 원칙("게이트에 이빨이 있는지 직접 확인")을 이 기준이 위반한다.
- **변이 대조**: 설정에서 `thresholds` 블록 전체를 삭제하는 변이 → 프로브 A 는 **여전히 실패(=통과 판정)** 한다. 어떤 변이도 이 기준을 실패시키지 못한다.
- **역설**: `acceptance.md`:120 이 «대체 경로» 로 밀어 둔 방법(설정 파일 임계를 임시로 98 로 바꿔 실행 → 되돌린 뒤 해시 대조)이 **유일하게 설정을 재는 경로**다. E4 가 그 경로의 작동을 실행 확인했다.
- **교정**: 주·부 경로를 맞바꾼다.
  - 프로브 A' (**주경로**): `server/vitest.config.ts` 의 `lines: 85` 를 임시로 `98` 로 바꾸고 **오버라이드 없이** `npm run coverage -w server` → `exit ≠ 0` + `ERROR: Coverage for lines (97.01%) does not meet global threshold (98%)` 관측. 되돌린 뒤 `shasum -a 256 server/vitest.config.ts` 대조.
  - 프로브 B' : 되돌린 상태에서 **오버라이드 없이** `npm run coverage -w server` → `exit 0`.
  - CLI 오버라이드 프로브는 «vitest 의 임계 기능이 산다» 는 보조 관측으로만 남기고, REQ-COVERAGE-004 의 근거로 쓰지 않는다고 명시한다.
  - `plan.md` §E 첫 행(«CLI 오버라이드 미확인» 위험)은 E3 으로 해소됐으므로 «확인됨 — 그러나 그 형식은 설정을 재지 않는다» 로 고쳐 적는다.

### F-02 — AC-COVERAGE-002 는 실행되지 않는다: `json-summary` 리포터를 요구하는 REQ 가 없다 · **High**

- **위치**: `acceptance.md`:80-91(명령), 36(AC 매트릭스) ↔ `spec.md`:111-114 (REQ-COVERAGE-002)
- **무엇이 잘못됐나**: AC-002 는 `./server/coverage/coverage-summary.json` 을 읽는다. 그런데 REQ-COVERAGE-002 는 «제공자를 `v8` 로, 측정 대상을 `include: ['src/**']` 로» 만 요구하고 **리포터를 한 마디도 요구하지 않는다.** vitest 의 기본 리포터는 `coverage-final.json` 만 만든다(E5). 따라서 **모든 REQ 를 완전히 만족한 구현에서 AC-002 가 `Cannot find module` 로 실패한다.** AC-002 는 REQ-002·003·005 **세 요구사항의 유일한 실행 기준**이므로 파급이 크다.
- **교정**: REQ-COVERAGE-002 에 리포터 조항을 더한다 — 예: `reporter: ['text', 'json-summary']`. `coverage` 스크립트 쪽 플래그로 넣어도 되나, 그 경우 REQ-COVERAGE-003 이 그 사실을 명시해야 한다. 아울러 AC-COVERAGE-004 의 단언 목록에 `expect(cov.reporter).toContain('json-summary')` 를 더해 리포터가 지워지면 스위트가 빨개지게 한다(그렇지 않으면 F-02 를 고쳐도 그 설정만 회귀 짝 밖에 남는다).

### F-03 — AC-COVERAGE-004 의 테스트 코드는 그대로면 죽는다 · **High**

- **위치**: `acceptance.md`:135-157
- **무엇이 잘못됐나**: 코드가 `it` / `expect` 를 임포트하지 않는다. `server` 에는 `globals: true` 설정이 없고 기존 테스트 10개는 전부 명시 임포트를 쓴다. 실행하면 `ReferenceError: it is not defined` 로 **스위트 자체가 실패**하며 «테스트 0개» 가 된다(E6). 이 상태에서는 `acceptance.md`:133 이 요구하는 `✓ test/coverage-contract.test.ts > ` 줄이 아예 나오지 않고, 161행의 변이 조준 판정(«실패가 이 하나뿐인가»)도 성립하지 않는다.
- **교정**: 첫 줄에 `import { it, expect } from 'vitest'` 를 더한다. 이 감사가 그 한 줄만 더해 실행했고 통과했으며(E6), 변이 조준도 정확했다(E7).

### F-04 — AC-COVERAGE-005 관측 3 은 신규 파일을 볼 수 없는 명령으로 파일 목록을 잰다 · **High**

- **위치**: `acceptance.md`:173(명령), 181(판정)
- **무엇이 잘못됐나**: `git diff --name-only "$SHA"` 는 **추적 중인 파일의 변경만** 나열한다. 이 카드가 만드는 파일 넷 중 **둘(`server/vitest.config.ts`, `server/test/coverage-contract.test.ts`)이 신규 미추적**이고, 선언 집합에 함께 적힌 `.moai/specs/SPEC-COVERAGE-001/` 문서들도 현재 전부 미추적이다. E8 이 실행으로 보였다 — 같은 상태에서 목록은 `server/package.json` 한 줄뿐이었다. `plan.md` §F 는 AC-005(단계 8)를 커밋(단계 9)보다 **먼저** 두므로 이것이 실제 관측 시점이다. 결과적으로 이 기준은 **올바른 구현을 거짓 실패**시킨다 — 문서가 `acceptance.md`:25 에서 스스로 경고한 «반대 방향» 결함이다.
- **반대 방향도 깨진다**: 커밋 후에 재면 이번에는 `.moai/reports/t13/*`, `.moai/logs/trace-*.jsonl` 등이 목록에 섞여 «정확히» 일치가 다시 깨진다.
- **교정**: 관측 대상을 «추적 변경 ∪ 미추적» 합집합으로 바꾼다. 예:
  - `git diff --name-only "$SHA"` 와 `git ls-files --others --exclude-standard` 의 합집합을 정렬해 비교한다.
  - 비교 대상 집합에서 `.moai/` 이하를 **명시적 제외 규칙**으로 빼고(문서·보고서·로그는 카드 산출물이 아니라 절차 산출물이므로), 코드 쪽 집합 `{server/package.json, server/vitest.config.ts, server/test/coverage-contract.test.ts, package-lock.json}` 과 **정확히** 일치를 요구한다.
  - 또는 단계 순서를 바꿔 커밋 후 `git diff --name-only "$SHA" HEAD` 로 재되, 제외 규칙은 그대로 둔다.

### F-05 — Q1 이 닫혔는데 문서 17군데가 «열려 있음» 전제로 남았다 · **Medium**

- **위치**: `spec.md`:148·158·161 · `plan.md`:60·66·70·72·114·127·142·154·162·178 · `acceptance.md`:124·181·227·230 · `progress.md`:24·36
- **무엇이 잘못됐나**: 리드가 Q1 을 **승인**으로 종결했다. 그런데 문서는 여전히 «운영자 판정 대기», «무르면 REQ-006 과 AC-004 를 함께 지운다», «(Q1 승인 시)» 로 분기한다. 실행 지시(`plan.md`:127 단계 0 항목 2, :142 단계 7)와 완료 정의(`acceptance.md`:227·230)가 존재하지 않는 판정을 기다리게 만든다. 더 나쁜 것은 `spec.md`:148 과 `plan.md`:72 가 **"이 질문은 한 곳에만 있다"** 고 단언하는데 실제로는 네 파일 17군데라는 점이다 — 문서가 자기 주장을 스스로 반증한다(이 저장소가 이미 이름 붙인 부류: `correction-leaves-its-own-record-stale`).
- **교정**: 17군데를 **전건** 다시 쓴다. Q1 조항은 «승인됨(리드 판정, 2026-08-29)» 한 줄 기록으로 바꾸고, 조건 분기(«무르면 …», «(승인 시)»)를 전부 제거한다. `plan.md`:60 의 제목에서 `[운영자 판정 대기]` 를 뗀다. `plan.md`:114 의 위험 행과 `plan.md`:178 의 안티패턴 항목은 **삭제**한다 — 닫힌 질문에 대한 위험·금지는 잡음이다. `acceptance.md`:181 의 «Q1 이 무르면 세 번째 항목이 빠진 집합» 도 삭제한다. 고친 뒤 같은 grep 을 다시 돌려 잔여 0 을 확인한다.

### F-06 — REQ-COVERAGE-005 의 «한국어 주석» 조항을 어떤 AC 도 재지 않는다 · **Medium**

- **위치**: `spec.md`:135 ↔ `acceptance.md`:36(AC-002 매핑), 149-155(AC-004 단언)
- **무엇이 잘못됐나**: REQ-005 는 두 가지를 요구한다 — (a) 진입점을 제외하지 않는다, (b) **그 사실과 사유를 한국어 주석으로 파일 상단에 적는다**. AC-002 는 (a)만 재고(`HAS_INDEX`·`FILE_COUNT`), AC-004 단언 5 도 (a)만 잰다(`cov.exclude` undefined). **(b)는 어떤 기준도 관측하지 않는다** — 주석을 통째로 지워도 여섯 기준이 전부 초록이다. 게다가 `acceptance.md`:95·159 가 «설정 파일에 대한 문자열 검사» 를 명시적으로 금지하므로, 유일하게 (b)를 잴 수 있는 방법이 문서 자신에 의해 막혀 있다.
- **교정**: 둘 중 하나를 고른다.
  - (가) (b)를 REQ 에서 빼고 `plan.md` 의 구현 지침으로 내린다 — 규범이 아니라 관례로 만든다.
  - (나) (b)를 유지하고, 문자열 검사 금지에 **명시적 예외**를 둔 AC 를 더한다 — 예: 회귀 짝 테스트가 `readFileSync('../vitest.config.ts')` 의 첫 5줄에 `index.ts` 와 `process.argv` 가 함께 나타나는지 단언. 금지 원칙(§ 검증 원칙)에 «주석 존재 확인은 값으로 읽을 수 없는 유일한 조항이므로 예외» 라고 사유를 적는다.

### F-07 — REQ-COVERAGE-001 의 «메이저 대역» 조항을 어떤 AC 도 재지 않는다 · **Medium**

- **위치**: `spec.md`:105 ↔ `acceptance.md`:35(AC-001), 145(AC-004 단언 1)
- **무엇이 잘못됐나**: REQ-001 은 선언 **그리고** «버전 범위가 `vitest` 와 같은 메이저 대역» 을 요구한다. AC-001 의 `npm ls --depth=0` 은 해결되기만 하면 어떤 범위든 종료 0 이고, AC-004 단언 1 은 `toBeTruthy()` 로 값의 존재만 본다. 변이 대조: `"@vitest/coverage-v8": "^3.0.0"` 으로 선언하면 두 기준 모두 통과한다 — 즉 대역 조항은 계약에만 있고 관측에는 없다.
- **교정**: AC-COVERAGE-004 에 단언을 하나 더한다 — 두 범위의 메이저를 파싱해 같은지 비교(예: `expect(major(pkg.devDependencies['@vitest/coverage-v8'])).toBe(major(pkg.devDependencies.vitest))`). 그리고 이 단언을 조준하는 변이(범위를 `^3.0.0` 으로 바꿈)를 `plan.md` §F 단계 7 에 명시한다.

---

## 5. 비차단 발견 (8건)

| ID | 심각도 | 위치 | 내용 / 교정 |
|---|---|---|---|
| N-01 | Low | `plan.md`:54 | «`index.ts` 의 미커버 8행» → 실측 **5행**(66·67·68·71·72, 25/30). 숫자를 5로 고치거나 «미커버 구간» 으로 바꿔 쓴다 |
| N-02 | Low | `spec.md`:68 · :135 | «진입점 블록(66-73행)» → 블록 자체는 **65-74행**이고 미커버 계상은 66-68·71-72 다. 형제 `channel/vitest.config.ts` 는 «블록(97-125), 미커버 구간은 98-123» 으로 둘을 구분해 적었다 — 같은 형식을 따른다. 아울러 **55행**(콜백 본문)도 미커버 구문이므로 «`index.ts` 의 부족분 = 진입점» 이라는 서술은 구문 수준에서는 정확하지 않다 |
| N-03 | Low | `acceptance.md`:193 | 기대 문자열 `npm ERR! Missing script:` → 실제는 `npm error Missing script: "coverage"`. `npm ERR!` 접두는 구버전 형식이다 |
| N-04 | Low | `acceptance.md`:40 · `progress.md`:38 | AC-COVERAGE-006 이 어떤 REQ 에도 매핑되지 않는다(매핑표에 `—`). 고아 AC 를 없애려면 «RED→GREEN 전이 관측» 을 REQ 로 올리거나, AC-006 을 `plan.md` §F 의 실행 절차로 내린다 |
| N-05 | Low | `progress.md`:7 · frontmatter `tier: S` | Tier S 의 산출물 계약은 **2파일**(AC 는 `spec.md` §3 인라인)인데 3파일로 냈다. `progress.md`:7 이 사유를 적어 두었으므로 의도적 이탈이나, `spec-workflow.md` §SPEC Complexity Tier 와의 차이를 그 자리에 명시 인용해 두면 좋다. REQ 7 / AC 6 은 Tier S 상한(8/8) 안이다 |
| N-06 | Low | `acceptance.md`:138·159 | AC-004 는 **내보낸 원본 설정 객체**를 읽는다. vitest 가 실제로 적용하는 «해석된» 설정이 아니므로, 제외가 다른 자리(루트 워크스페이스 설정 등)에서 들어오면 이 단언은 통과한다. AC-002 의 `FILE_COUNT`·`HAS_INDEX` 가 실효 측면을 덮으므로 잔여 위험은 작다 — 그 사실을 §159 사유 문단에 한 줄 적어 두면 «값으로 읽으면 두 방향이 모두 닫힌다» 는 과잉 주장이 정정된다 |
| N-07 | Low | `acceptance.md`:172 | 관측 2 의 `echo "EXIT=$?"` 는 `git diff --stat` 이 내용 유무와 무관하게 0 을 내므로 아무것도 재지 않는다. 판정은 «빈 출력» 이므로 `echo` 를 빼거나 `test -z "$(git diff --stat …)"` 형태로 바꾼다 |
| N-08 | Low | `spec.md`:161 | «손대는 파일은 정확히 셋» 은 F-02 교정 후에도 유지되지만(리포터는 같은 설정 파일), AC-005 관측 3 의 선언 집합에는 `.moai/specs/…` 문서가 포함돼 있어 두 자리의 «집합» 이 서로 다르다. 한쪽을 «코드 산출물» 로 한정해 용어를 맞춘다 |

---

## 6. 필수 통과 기준 (M5 Firewall)

| 기준 | 판정 | 근거 |
|---|---|---|
| MP-1 REQ 번호 일관성 | **PASS** | `spec.md`:104·111·116·123·134·143·152 — REQ-COVERAGE-001..007, 결번·중복 없음, 3자리 영패딩 일관 |
| MP-2 GEARS 형식 | **PASS** | 요구사항 계층(REQ-XXX) 기준. 001·002·003·005 Ubiquitous(«…해야 한다»), 004 Event-driven(«…검출되면, … 끝나야 한다»), 006 Ubiquitous, 007 Unwanted(«…해서는 안 된다»). 각 항목에 패턴명이 병기돼 있다. Given-When-Then 은 `acceptance.md` 의 검증 계층이므로 이 기준으로 감점하지 않았다 |
| MP-3 프론트매터 유효성 | **PASS** | `spec.md`:2-14 — id·title·version·status·created·updated·author·priority·phase·module·lifecycle·tags 12개 전부 존재, 스네이크케이스 별칭 없음. `phase: "v0.1.0 target"` 은 금지된 생명주기 토큰이 아니다. 선택 필드 `tier: S` |
| MP-4 언어 중립성 | **N/A** | 단일 언어(TypeScript/Node) 워크스페이스 한정 SPEC — 다중 언어 도구 서술 없음 |
| MP-5 D7 교차 SPEC 조정 | **PASS** | 참조 2건. `SPEC-CHANNEL-001` → `status: in-progress`, `SPEC-CHANWIRE-001` → `status: in-progress`. retired/superseded/archived 없음 → BLOCKING 없음 |
| MP-6 D8 크로스플랫폼 | **N/A** | `grep -c syscall spec.md` → `0`. 검증 동사 대상 없음 |
| MP-7 미해결 [NEEDS CLARIFICATION] | **PASS** | `grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-COVERAGE-001/` → 매치 0 (exit 1). Q1 은 마커 규약이 아닌 산문 형태이며 리드가 승인으로 종결했다 — 다만 문서 반영이 남았다(F-05) |

**필수 통과 실패 없음.** 이 FAIL 은 firewall 이 아니라 **점수와 차단 발견**에서 나온다.

---

## 7. 차원별 점수 (rubric 기준)

| 차원 | 점수 | 밴드 | 근거 |
|---|---|---|---|
| Clarity | 0.75 | 0.75 | 서술은 정밀하고 결정마다 사유가 붙는다. 다만 REQ-002 가 리포터를 말하지 않아 «무엇을 만들어야 AC 가 도는가» 가 불명(F-02), REQ-005 의 주석 조항은 재는 방법이 문서 자신에 의해 막혀 있다(F-06) |
| Completeness | 0.75 | 0.75 | 필수 절 전부 존재, 범위 밖 6개 H3 + 불릿 근거, 프론트매터 12필드 완비. 감점은 «AC 가 의존하는 설정 조항이 REQ 집합에 없음»(F-02) 하나 |
| Testability | 0.45 | 0.25↔0.50 | 여섯 기준 중 **넷이 실행 결함**을 갖는다 — AC-003 은 아무것도 재지 않고(F-01), AC-002 는 실행 불가(F-02), AC-004 는 코드가 죽고(F-03), AC-005 는 거짓 실패(F-04). AC-001 과 AC-006 은 건전하다 |
| Traceability | 0.65 | 0.50↔0.75 | REQ↔AC 매핑표가 `progress.md` 에 있고 REQ 7건 전부 매핑됐다. 감점은 조항 수준 누락 둘(F-06·F-07)과 고아 AC 하나(N-04) |

**종합 = 조화평균(0.75, 0.75, 0.45, 0.65) = 0.62** (산술평균 0.65)

Tier S PASS 임계는 **0.75**. 0.62 < 0.75 → **FAIL**.

---

## 8. Gaps (이 감사가 확인하지 **않은** 것)

1. **`.moai/reports/t7/sync-audit.md` §T5 를 읽지 않았다.** 그 파일은 카드 `t7` 워크트리(`WT-perm-request-id`)에 있어 이 워크트리에서 접근하지 않았다. 따라서 «Craft 85% 가 네 라운드 연속 UNVERIFIED» 라는 배경 주장은 **검증하지 않았다.** SPEC 자신도 같은 사실을 §1.1 에 명시했으므로 이 갭은 SPEC 의 결함이 아니라 이 감사의 범위다.
2. **`package-lock.json` 의 실제 변경 규모를 재지 않았다.** `server` 에 devDependency 를 선언하고 `npm install` 을 돌리는 실제 절차는 실행하지 않았다(잠금 파일을 건드리지 않기 위해). `plan.md` §E 둘째 위험은 미검증으로 남는다.
3. **`npm test -w channel` 을 돌리지 않았다.** 형제 무회귀 항목은 관측하지 않았다.
4. **`channel` 이 나중에 `@vitest/coverage-v8` 을 빼는 시나리오**를 재현하지 않았다(`acceptance.md`:207 이 이미 미검증으로 표시).
5. **AC-004 의 나머지 네 단언에 대한 개별 변이**를 실행하지 않았다. 단언 1(의존성 선언)만 변이로 조준을 확인했다. `acceptance.md`:163 이 이 사실을 미리 갭으로 선언해 두었고, 이 감사도 같은 자리를 열어 둔다.
6. **F-01 교정안(프로브 A')의 되돌림 절차 자체**는 이 감사가 설계만 했고 run 단계 형태로 실행하지는 않았다 — 다만 그 경로가 작동한다는 것은 E4 로 확인했다.
7. **Q1 승인의 출처**는 이 감사의 위임 프롬프트에 적힌 리드 판정이며, 디스크의 산출물에서 확인한 것이 아니다. 문서 어디에도 승인 기록이 없다(그것이 F-05 의 일부다).

---

## 9. Residual-risk (잔여 위험)

- **F-02 교정이 F-01 교정과 얽힌다.** 리포터를 설정에 더하면 AC-004 의 단언 집합도 함께 커져야 하고(리포터 지움 감지), 그러면 `plan.md` §F 단계 7 의 변이 목록도 늘어난다. 세 자리를 함께 고치지 않으면 이 저장소가 이미 이름 붙인 부류 — 「하나를 고치면서 그것을 요약해 둔 표를 따라가지 못함」 — 가 재발한다.
- **F-04 교정은 `.moai/` 제외 규칙의 형태에 민감하다.** 제외를 너무 넓게 잡으면(`.moai/` 전부) SPEC 문서 변경도 안 보이고, 너무 좁게 잡으면 감사 보고서·트레이스 로그가 계속 섞인다. 규칙을 명시적으로 적지 않으면 run 단계가 매번 다르게 해석한다.
- **`FILE_COUNT=11` 은 다음 카드가 `server/src/` 에 파일을 더하는 순간 거짓 실패한다.** `plan.md` §E 가 «이 카드의 착지 시점을 재는 값» 이라고 사유를 달아 두었으나, 그 사유는 `acceptance.md` 본문에는 없다 — 나중에 이 기준만 읽는 사람은 이유를 알 수 없다.
- **커버리지 실행 시간 ~7.2초 · 테스트 15.7초.** 회귀 짝 테스트가 스위트에 들어가면 커버리지 실행에도 함께 포함되어 `coverage-contract.test.ts` 가 `src/**` 밖이라 총계에는 영향이 없으나, 이 감사가 E4 에서 겪었듯 **계약 테스트의 실패가 임계 판정 결과를 가릴 수 있다.** 프로브를 돌릴 때 그 파일을 어떻게 다룰지 run 단계가 정해야 한다.

---

## 10. 권고 (run 진입 전 순서)

1. **F-05 부터** 고친다(17군데 Q1 일괄). 다른 교정이 같은 문단을 건드리므로 먼저 정리하는 편이 싸다. 고친 뒤 `grep -n "Q1\|판정 대기\|무르면\|승인 시"` 잔여 0 을 확인한다.
2. **F-01** — AC-COVERAGE-003 의 주·부 경로를 맞바꾼다. 이 카드에서 가장 중요한 교정이다.
3. **F-02** — REQ-COVERAGE-002 에 리포터 조항 + AC-004 에 리포터 단언.
4. **F-03** — `acceptance.md`:136 에 `import { it, expect } from 'vitest'` 한 줄.
5. **F-04** — AC-COVERAGE-005 관측 3 의 명령을 «추적 ∪ 미추적» 합집합으로, `.moai/` 제외 규칙을 명문화.
6. **F-06 · F-07** — 조항 수준 누락 둘. (가)/(나) 중 택일 후 AC 반영.
7. 비차단 N-01~N-08 은 위 교정과 같은 문단을 손대는 김에 함께 정리한다.
8. 2회차 감사는 **위 델타 한정**으로 수행한다(Retry Loop Contract).

설계 결정 — 전역 임계 85, 진입점 미제외, 회귀 짝 도입 — 은 **하나도 바꿀 필요가 없다.** 이 감사가 셋 다 실행으로 확인했다.

---

## 11. 트리 무변경 증명

이 감사는 프로브를 위해 임시로 다음을 만들었다가 전부 되돌렸다.

| 대상 | 조치 | 복원 증명 |
|---|---|---|
| `server/package.json` (추적) | `coverage` 스크립트 + `@vitest/coverage-v8` devDependency 임시 추가, 이후 변이로 그 줄 삭제 | 변이 전 `git hash-object` = `e17e74445839954cc3b2fcef12e65ca7cd2e8576` / `shasum -a 256` = `58dfe70dce91678dc1cc10f857864b1db6d159eca6819eb71942251a5a1fed9d` → 복원 후 **동일** |
| `server/vitest.config.ts` (신규) | 임시 생성 후 삭제 | 아래 `git status --short` 에 없음 |
| `server/test/coverage-contract.test.ts` (신규) | 임시 생성 후 삭제 | 아래 `git status --short` 에 없음 |
| `server/coverage/` (산출물) | 커버리지 실행 산출 후 `rm -rf` | `.gitignore` 가 덮으며 현재 부재 |
| `/tmp/t13*` | 감사 전용 로그·리포트 | 저장소 밖 |

```
$ git status --short
?? .moai/logs/trace-5a341559-db33-4637-9156-f88538dc6137.jsonl
?? .moai/specs/SPEC-COVERAGE-001/
?? .moai/state/config-cache.json
?? .moai/state/context-usage.json
```

감사 시작 시점의 `git status --short` 와 **완전히 동일**하다(위 네 항목은 감사 이전부터 있던 미추적 항목이며, 이 보고서 `.moai/reports/t13/plan-audit.md` 는 작성 후 추가로 나타난다). SPEC 파일 넷은 **읽기만 했고 수정하지 않았다.**
