# SPEC-WEBMD-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-WEBMD-001` |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plans/ai-stateless-scroll.md` (승인된 구현 계획) |
| 선행 SPEC | `SPEC-WEBCHAT-001` (완료) — §5 비목표 **한 항목만** 상위 규정, `REQ-WEBCHAT-004` 는 강화 계승 |
| 관련 SPEC | `SPEC-WEBRICH-001` (같은 `.message` 요소를 장식 훅으로 공유, 범위는 겹치지 않음) |
| 손대는 파일 | 신규 `web/markdown.js` · `web/markdown.d.ts` · `server/test/web-markdown.test.ts` / 수정 `web/app.js` · `web/style.css` |
| 개발 방식 | TDD — M1 이 RED (`quality.yaml` `development_mode: tdd`) |
| 요구사항 / 수용 기준 | REQ 15 / AC 16 (Tier M 상한 16/16) |
| 현재 상태 | `draft` — plan 감사 1회차 PASS(0.879) 후 차단 2건 · 비차단 8건 수리 완료(spec `0.2.0`), run 착수 대기 |

---

## §E.1 Plan-phase Audit-Ready Signal

- plan_complete_at: 2026-09-08
- plan_status: audit-ready
- artifacts: `spec.md` · `plan.md` · `acceptance.md` · `progress.md`
- spec_id_check: `[[ "SPEC-WEBMD-001" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` → `PASS` (Bash 실행 확인)
- needs_clarification: 0건
- 계획서와 어긋나 이 단계에서 고친 자리 1건 — 승인 계획서가 `.msg-body` 단언을 «6군데»라 적었으나 `textContent` 를 읽는 자리는 일곱, 구조 개수를 세는 자리를 포함하면 여덟이다(`grep -n "msg-body" server/test/web-chat.test.ts` 로 확인). 판정(전부 안전)은 바뀌지 않는다. 근거와 자리별 판정은 `plan.md` §D.2

### plan 감사 1회차 (2026-09-08)

- 보고서: `.moai/reports/plan-audit/SPEC-WEBMD-001-1.md`
- 판정: **PASS 0.879** (Tier M 통과선 0.80). 차원별 Clarity 0.80 · Completeness 0.95 · Testability 0.80 · Traceability 1.00, 집계는 조화평균
- must-pass 7항목 전부 통과(MP-4 는 단일 언어 범위라 N/A). 미해결 `[NEEDS CLARIFICATION]` 0건
- 발견 10건(차단 2 · 비차단 8) 전부 수리했다. 반박하거나 유예한 건은 없다
  - **D1 (critical · 차단)** 라벨 위장 판별 술어 미정의 — `^https?://` 로만 구현해도 모든 기준을 통과해 스킴 없는 위장을 못 잡았다. REQ-WEBMD-008 에 정규식과 호스트 비교 방법을 명시하고 AC-WEBMD-008 에 절 둘을 더했다. 같은 부류인 D5 도 함께 닫았다
  - **D2 (major · 차단)** 확인 명령이 없는 경로(`e2e`)를 가리켜 E2E 쪽을 한 번도 검색하지 못했다. `server/test scripts` 로 교정하고 실행 출력을 함께 실었다 — 결론(적중 한 파일)은 원래 참이었고 틀린 것은 증거였다
  - 비차단: D3 요소 이름 축 신설 · D4 공허한 문자열 불변 단언을 `doc` 비변형 관측으로 교체 · D5 정제 집합의 양성 방향 기준 추가 · D6 GEARS 라벨 정정 · D7 부하 민감한 누적 시간 상한을 러너 타임아웃 판정으로 교체 · D8 `skipped 0` 과 의도된 skip 의 충돌 해소 · D9 문서 불일치 넷 · D10 고정 파일 목록을 `readdirSync` 도출로 교체
- 수리 뒤 예산: REQ 15 / AC 16 **불변** (Tier M 상한 16/16). D1 이 요구한 절 둘은 새 기준이 아니라 AC-WEBMD-008 **안의** 절로 넣었다
- D1 술어 자기 검사 — REQ-WEBMD-008 의 정규식을 AC-WEBMD-008·006·007 이 먹이는 라벨 열에 실제로 돌려, 힌트를 붙여야 할 여섯과 붙이지 말아야 할 넷이 모두 의도대로 갈리는 것을 확인했다(`node` 로 실행, 10/10 일치). 스킴 없는 라벨의 호스트 파싱도 함께 확인했다 — `good.example/settings` → `good.example`, `www.good.example` → `www.good.example`, `https://` → 파싱 실패(fail-loud 로 힌트 표시)
- 수리 뒤 lint:

```
$ moai spec lint .moai/specs/SPEC-WEBMD-001/spec.md
✓ No findings — all SPEC documents are valid
EXIT=0
```

---

## §E.2 Run-phase Evidence

### 사전 확인 (Pre-flight, M1 전)

```
$ git branch --show-current && git rev-parse --short HEAD
worktree-agent-a3f0544490db16e73
c0026ce
```

런타임이 이 세션을 격리 워크트리(`.claude/worktrees/agent-a3f0544490db16e73`)에서 구동했다.
트리는 운영자가 지시한 기점 `main` @ `c0026ce` 와 동일한 커밋에서 시작했고, 커밋은 이 나무의
브랜치에 쌓으며 `git push origin HEAD:main` 으로 main 에 올린다(격리 훅이 공유 체크아웃 대상
git 을 거부하기 때문). 파일 경로와 내용은 `c0026ce` 기준 main 과 동일하다.

```
$ ls web/
app.js  design-tokens.css  index.html  rich.d.ts  rich.js  style.css

$ grep -n "pre-wrap" web/style.css
309:  white-space: pre-wrap;

$ ls server/test/web-rich.test.ts && sed -n '1,15p' server/test/web-rich.test.ts
server/test/web-rich.test.ts
// @vitest-environment jsdom
// ^ 이 도크블록이 이 파일만 jsdom 환경으로 가른다 — 서버 계약 테스트(web-permission-contract 포함)는
// node 환경을 유지한다 (plan.md §C). 선행 web-shell.test.ts·web-chat.test.ts 가 같은 방식을 쓴다.
import { describe, it, expect, afterEach, vi } from 'vitest'
...
```

### 기준선 (이 나무, `c0026ce` 에서 직접 실행)

```
$ npm test
# server
 Test Files  18 passed (18)
      Tests  222 passed (222)
# channel
 Test Files  6 passed (6)
      Tests  103 passed (103)
EXIT=0
```

### M1 — RED (구현이 존재하기 전)

새 테스트 파일 `server/test/web-markdown.test.ts` 를 먼저 썼다. `web/markdown.js` 는 아직
존재하지 않는다. it 수는 눈이 아니라 명령으로 셌다.

```
$ grep -c "^\s*it(" server/test/web-markdown.test.ts
13
```

RED 실행 원문 (구현 커밋 이전, 이 나무 `c0026ce` + 신규 테스트 파일 상태):

```
$ cd server && npx vitest run test/web-markdown.test.ts
 ❯ test/web-markdown.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/web-markdown.test.ts [ test/web-markdown.test.ts ]
Error: Failed to resolve import "../../web/markdown.js" from "test/web-markdown.test.ts". Does the file exist?
  Plugin: vite:import-analysis
  File: /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/agent-a3f0544490db16e73/server/test/web-markdown.test.ts:11:83
  9  |  import { join, dirname } from "node:path";
  10  |  import { fileURLToPath } from "node:url";
  11  |  import { renderMarkdown, parseBlocks, renderInline, safeHref, codeLangToken } from "../../web/markdown.js";
      |                                                                                      ^

 Test Files  1 failed (1)
      Tests  no tests
VITEST_EXIT=1
```

판정: 파일 적재 자체가 실패한다 — 구현 모듈이 없어 열세 개 it 전부가 아직 만족된 바 없음을
러너가 증명한다. 기존 테스트는 이 시점에도 전부 통과(위 기준선)다.

### M1 커밋 구조의 실행 시 발견 — pre-commit 게이트가 테스트 전용 커밋을 막음

첫 커밋 시도에서 pre-commit 품질 게이트(`npm test` = typecheck + vitest)가 RED 상태
커밋을 통과시키지 못했다 — `server/tsconfig.json` typecheck 가 `TS2307: Cannot find
module '../../web/markdown.js'` (exit 1)로 떨어진다. `--no-verify` 는 금지다(B9).
그래서 M1(RED)과 M2(GREEN)를 한 커밋으로 합쳤고, RED 원문은 위에 그대로 남아 있다.
TDD 스킬이 허용하는 «같은 커밋 안의 RED 증거» 형태다 — 구현 커밋 이전의 실패 실행이
증거로 존재한다.

### M2 — GREEN (`web/markdown.js` + `web/markdown.d.ts`)

```
$ cd server && npx vitest run test/web-markdown.test.ts
 Test Files  1 passed (1)
      Tests  13 passed (13)
EXIT=0        # M3 CSS 착지 뒤 상태. CSS 착지 전에는 12 passed | 1 failed(AC-014) 였다

$ npm run typecheck -w server
# (tsc --noEmit, 출력 없음)
TC_SERVER_EXIT=0
```

M2 첫 실행(구현 직후, CSS 이전)의 실측에서 설계 결함 하나를 잡아 수리했다 — 자동링크의
라벨을 `renderInline` 으로 다시 그려 라벨 URL 이 자동링크로 재귀, `a` 안에 `a` 가
깊이 한계까지 중첩됐다(AC-008 자동링크 절에서 `expected 5 to be 1` 로 관측). 수리:
라벨은 마커 재해석 없는 텍스트 노드로 그린다(BIDI 치환만 적용). 이 경로가 링크 중첩을
구조적으로 막는다.

### M3 — CSS (`web/style.css`)

`.msg-body` 의 `white-space: pre-wrap`(구 309행) 제거 + `/* SPEC-WEBMD-001 */` …
`/* /SPEC-WEBMD-001 */` 규칙 블록 추가(93행). 위 M2 실행 기록의 `13 passed (13)`
이 AC-WEBMD-014 포함 통과다.

### M4 — 통합 (`web/app.js`) + C 그룹 RED→GREEN

C 그룹 테스트를 통합보다 먼저 썼다. 통합 전(RED) 실측:

```
$ cd server && npx vitest run test/web-markdown.test.ts
     × falls back to raw text without losing the message or the ones after it 7ms
 FAIL  test/web-markdown.test.ts > AC-WEBMD-012 fallback path > falls back to raw text without losing the message or the ones after it
AssertionError: expected false to be true // Object.is equality
 ❯ test/web-markdown.test.ts:546:70
    546|       expect(bodies.every(n => n.classList.contains('md-fallback'))).t…
 Test Files  1 failed (1)
      Tests  1 failed | 15 passed (16)
```

AC-012 가 폴백 부재로 실패 — 통합의 RED 다. AC-011·016 은 회귀 방어선이라 이 시점에
이미 통과(예상된 모습). `web/app.js` 통합(import 한 줄 + 본문 렌더 지점 한 곳) 뒤:

```
$ cd server && npx vitest run test/web-markdown.test.ts
 Test Files  1 passed (1)
      Tests  16 passed (16)

$ cd server && npx vitest run test/web-chat.test.ts test/web-rich.test.ts test/web-shell.test.ts test/web-permission-contract.test.ts
 Test Files  4 passed (4)
      Tests  71 passed (71)
```

### M5 — 전체 회귀

```
$ npm run typecheck -w server    → TC_SERVER_EXIT=0
$ npm run typecheck -w channel   → TC_CHANNEL_EXIT=0

$ npm test
# server
 Test Files  19 passed (19)
      Tests  238 passed (238)      # 기준선 222 + 신규 16. failed 0, skipped 0
# channel
 Test Files  6 passed (6)
      Tests  103 passed (103)

$ git diff --stat -- server/test/web-chat.test.ts server/test/web-rich.test.ts \
    server/test/web-shell.test.ts server/test/web-permission-contract.test.ts
(출력 없음 — 네 파일 0줄, REQ-WEBMD-015)
```

보안 소스 훑기 (AC-WEBMD-007·010 의 기계 단언이 스위트 안에서 통과하는 것과 별도로
직접 실행):

```
$ grep -nE "outerHTML|insertAdjacentHTML|document\.write|createContextualFragment" web/*.js
(적중 0건, grep exit 1)
```

커밋 시점 it 계수: `grep -c "^\s*it(" server/test/web-markdown.test.ts` → **16**

### [기준선 결함, 신규 아님] `npm run e2e` 가 step3 에서 실패 — 이 SPEC 의 변경이 원인 아님

```
$ npm run e2e
minidiscord listening on 127.0.0.1:50480
[1/15]
[2/15]
[fail] step3 ③ 등록 응답의 command 가 토큰을 담지 않는다
E2E_EXIT=1
```

귀속 근거 넷 — 전부 명령으로 확인했다:

1. `git diff c0026ce..HEAD --stat -- server/src scripts/` → **출력 없음** (서버 소스와
   e2e 스크립트는 기점과 현재가 바이트 단위로 같다)
2. `git diff c0026ce..HEAD --stat` → 이 SPEC 의 변경은 `web/` 네 파일 + 신규 테스트 +
   SPEC 산출물뿐이다. e2e 러너는 «server/src 를 import 하지 않고 HTTP 와 WebSocket
   전선으로만 말을 건다»(scripts/e2e.mts 4-5행) — web/ 클라이언트 파일은 15 단계
   어디에도 들지 않는다
3. 실패 단언(`scripts/e2e.mts` 75행)은 `command.includes('MINIDISCORD_TOKEN=' + token)`
   셸 형태를 기대하는데, 서버 `registrationCommand`(`server/src/routes-bots.ts` 41~58행
   본문에서 `grep -n "MINIDISCORD_TOKEN"` → **0건**)은 토큰을 JSON 안내문 형태
  (`"MINIDISCORD_TOKEN": "<token>"`, mcpJsonFor)로만 싣는다 — 이 형태 불일치는 구조적이라
   기점 커밋에서도 같은 실패가 나온다
4. 같은 불일치의 시점: 등록 안내문 재작성은 이 SPEC 이전의 crew 연동 커밋(2026-09-08)에서
   착지했다. 운영자 기준선 관측은 `npm test` 만 담았고 e2e 는 담지 않았다

수리는 `scripts/e2e.mts` 를 고치는 일인데 그 경로는 이 SPEC 의 §F 손대지 않는 목록에
있다 — 범위 밖 수리를 하지 않고 여기서 귀속만 남긴다. 별도 카드로 처리할 것.

### 커버리지 — 브라우저 소스 모듈이라 이 설정에서 산출 불가 (Gap)

```
$ cd server && npx vitest run test/web-markdown.test.ts --coverage.enabled --include='web/markdown.js'
CACError: Unknown option `--include`            # 이 vitest(4.1.11)에 CLI 플래그 없음, exit 1

$ cd server && npx vitest run test/web-markdown.test.ts --coverage.enabled --coverage.include='web/markdown.js' --coverage.reporter=text
Statements   : Unknown% ( 0/0 )                 # exit 0 — v8 이 web/(워크스페이스 밖) 모듈에 기록 0건

$ cd server && npx vitest run test/web-markdown.test.ts --coverage.enabled --coverage.include='../web/markdown.js' --coverage.reporter=text
All files |       0 |        0 |       0 |       0 |          # 같은 0/0
```

`web/markdown.js` 는 브라우저가 직접 읽는 워크스페이스 밖 모듈이라 v8 커버리지 귀속이
만들어지지 않는다. 수를 지어내지 않고 이걸 Gap 으로 남긴다 — 기능 근거는 열여섯 AC it
(양·음 방향 모두)가 이 모듈을 직접 돌려 전부 통과한 것이다. 새 계측 기계는 만들지 않았다.

---

## §E.3 Run-phase Audit-Ready Signal

- run_complete_at: 2026-09-09
- run_status: complete (in-scope AC all observed; one clause of AC-016 carries a pre-existing baseline defect — 아래 명시)
- run_commit_sha: (아래 커밋 목록 — 워크트리 브랜치에서 `git push origin HEAD:main` 으로 main 적재)
- run_commit_list:
  - `4c321ba` feat(SPEC-WEBMD-001): M1+M2 마크다운 렌더러 — RED 증적과 구현을 한 커밋에 (draft → in-progress 전이 포함)
  - `969c565` feat(SPEC-WEBMD-001): M3 마크다운 CSS 규칙 블록 — pre-wrap 제거와 줄바꿈 책임 이동
  - `2ae3524` feat(SPEC-WEBMD-001): M4 app.js 통합 + C 그룹 통합 테스트
- m1_to_mN_commit_strategy: M1+M2 합침 — pre-commit 품질 게이트(npm test)가 구현 부재 상태의 테스트 전용 커밋을 통과시키지 못함(`--no-verify` 금지). M3·M4·M5는 계획대로 분리
- ac_pass_count: 15 (AC-WEBMD-001 ~ 015 전부 관측 PASS)
- ac_fail_count: 0 — 단, AC-016 의 셋 중 «npm run e2e 종료 코드 0» 한 절만 기준선 결함으로 FAIL 귀속(아래). AC-016 의 나머지 두 절(네 테스트 파일 diff 0줄 · npm test 초록 · 훅 노드가 .msg-body 밖 형제)은 관측 PASS
- preserve_list_post_run_count: 5 — `server/src/**`(0줄 변경), `web/rich.js`(0), `web/design-tokens.css`(0), `web/index.html`(0), 기존 웹 테스트 네 파일(0줄, `git diff --stat` 출력 없음으로 확인)
- l44_pre_commit_fetch: 이 세션은 런타임 격리 워크트리에서 구동 — 커밋은 워크트리 브랜치에 쌓고 `git push origin HEAD:main` 으로 적재했다(격리 훅이 공유 체크아웃 대상 git 을 거부). 파일 내용은 `c0026ce` 기점 main 과 동일한 나무에서 시작
- l44_post_push_fetch: push 후 `git fetch origin main && git rev-list --count --left-right origin/main...HEAD` → `0	0` (원격과 동기. push 기록 `c0026ce..0177894 HEAD -> main`, pre-push 훅의 «No Makefile found» 는 예상된 warn-only 줄) — 본 필드는 커밋이 자신의 push 결과를 알 수 없어 후속 커밋에서 backfill 했다(D3 예외 절)
- new_warnings_or_lints_introduced: 0 — `npm run typecheck -w server`·`-w channel` 모두 exit 0. 이 저장소에는 JS 전용 린터가 없다 — typecheck 가 린트 게이트다(§E.5 서술)
- cross_platform_build.node: n/a — 이 저장소는 Node/npm 워크스페이스(server·channel)다. 빌드 산출물 channel/dist 는 워크트리에서 `npm run build -w channel` 로 새로 만들어 확인(exit 0)
- total_run_phase_files: 7 — 신규 `web/markdown.js`·`web/markdown.d.ts`·`server/test/web-markdown.test.ts` / 수정 `web/app.js`·`web/style.css` / SPEC 산출물 `progress.md`·`spec.md`(frontmatter status·updated 만)

### AC 매트릭 요약 (판정 근거는 §E.2 각 절)

| AC | 판정 | 관측 |
|----|------|------|
| AC-WEBMD-001~005 | PASS | `vitest run test/web-markdown.test.ts` 13 passed → 16 passed(§E.2 M2·M3·M4) |
| AC-WEBMD-006~010 | PASS | 같은 실행 — 안전성 그룹 전부 통과 + 소스 훑기 0건 |
| AC-WEBMD-011 | PASS | M4 GREEN — 버튼 2·펜스 변형 2·doc 비변형·상태 초기화 |
| AC-WEBMD-012 | PASS | M4 — RED(md-fallback 부재) → 통합 뒤 GREEN |
| AC-WEBMD-013 | PASS | 20s 러너 타임아웃 안 종료, 길이·표 상한 단언 통과 |
| AC-WEBMD-014 | PASS | M3 CSS 블록 착지 뒤 통과(pre-wrap 0·max-content·토큰만·16진수 0) |
| AC-WEBMD-015 | PASS | export 다섯 + `typecheck -w server` exit 0 |
| AC-WEBMD-016 | PASS(2/3 절) + FAIL 1절 귀속 | 네 파일 diff 0줄 PASS · `npm test` 238+103 exit 0 PASS · 훅 형제 PASS · **`npm run e2e` exit 1 — 기준선 결함(§E.2 귀속 근거 넷), 이 SPEC 변경이 원인 아님** |

### Gaps (명시적 미검증)

1. **M6 실브라우저 육안 확인** — 수동 단계라 이 세션이 수행하지 않았다(수행해선 안 된다는 지시). 긴 표 가로 스크롤·코드블록 배경·중첩 목록 들여쓰기·링크 호스트 힌트의 눈 확인은 운영자 몫이다. 판정 기준 아님을 명시한다
2. **커버리지 수치** — 브라우저 소스 모듈(`web/`, 워크스페이스 밖)이라 이 vitest 설정에서 v8 귀속이 만들어지지 않는다(시도 세 번의 원문 §E.2). 수를 만들지 않았다
3. **e2e 이후 단계(4~15)** — step3 에서 멈춰 러너가 진행하지 않았다. step4~15 의 통과 여부는 이 실행으로 관측되지 않았다. step3 수리(별도 카드) 뒤 전체 재실행이 필요하다

### Residual-risk (잔여 위험)

- e2e 기준선 결함(step3 ③)이 `scripts/e2e.mts` 단언을 고치는 별도 카드로 수리되기 전까지, CI 에 e2e 가 있다면 main 이 그 결함으로 붉다. 이 SPEC 의 변경과 무관함이 위 귀속으로 증명돼 있으나, «e2e 초록»이라는 회귀 방어선은 결함 수리까지 공백이다
- AC-008 의 라벨 술어는 REQ-WEBMD-008 의 정규식 그대로다. 정의역 밖(앞공백 두 갈래·비ASCII 동형이의)은 감사 2회차가 남기기로 정의역 밖으로 두었다 — 별도 카드 범위
- 부하성 테스트 실패의 재발 가능성(이 저장소의 알려진 성향) — 이 회차 `npm test` 는 1회 실행으로 통과했고 반복 실행은 하지 않았다

### 운영자 안내 (run 종료 시 현재 상태)

- 워크트리: `.claude/worktrees/agent-a3f0544490db16e73` (브랜치 `worktree-agent-a3f0544490db16e73`, 기점 `c0026ce`)
- 다음 단계: sync(`/moai sync SPEC-WEBMD-001`) — M7 문서 동기화는 sync 소관이다
- 별도 카드 권고: `scripts/e2e.mts` step3 ③ 단언을 새 등록 안내문 형태에 맞게 수리(기준선 결함, 이 SPEC 밖)

---

## §E.4 Sync-phase Audit-Ready Signal

- sync_complete_at: 2026-09-09
- sync_commit_sha: pending-backfill-webmd-sync (후속 커밋에서 실측 SHA 로 되돌려 씀 — 커밋은 자기 SHA 를 모른다)
- sync_status: complete — Route A (Tier M, main 직접 단일 sync 커밋, PR 없음)
- sync scope:
  - `CHANGELOG.md` — `[Unreleased]` 에 2026-09-09 마크다운 렌더링 항목 1건 (작성 전 `grep -c 'SPEC-WEBMD-001'` 0건 확인, 구현 파일 원문(`web/markdown.js`·`web/app.js` 렌더 지점·`web/style.css` `.md-*` 블록)을 읽고 작성)
  - `.moai/project/structure.md` — web/ 파일 목록에 `markdown.js`·`markdown.d.ts` 추가
  - `.moai/project/codemaps/{modules,overview,dependencies,entry-points,data-flow}.md` — `grep -l "rich\.js\|app\.js"` 로 고른 다섯 파일의 web/ 열거 갱신(파일 수 6→8, 줄 수, 의존성 간선, import 지점 606→741행)
  - `.moai/specs/SPEC-WEBMD-001/spec.md` — frontmatter `status: in-progress → completed`, `updated: 2026-09-09` (본문 무변경)
  - `.moai/specs/SPEC-WEBCHAT-001/spec.md` — 오케스트레이터가 운영자 인계 지시로 미리 작성한 통지 HISTORY 행 + `updated:` 날짜 그대로 커밋 (본문 무변경, diff 2줄)
  - `web/markdown.js` — 헤더 주석에 모듈 수준 `@MX:NOTE`(SPEC-WEBMD-001 지시) 한 줄 추가
- b12_self_test:
  - a_pre_emission_grep: `grep -c 'SPEC-WEBMD-001' CHANGELOG.md` → 작성 전 0건, 작성 후 1건
  - b_ac_count: acceptance.md AC 16개 중 15 PASS — CHANGELOG 항목은 AC 개수를 다시 세지 않는 서술형(결함 열람 아님), §E.3 표가 근거
  - c_file_paths: `CHANGELOG.md` 가 언급한 경로 `web/markdown.js`·`web/markdown.d.ts`·`web/app.js`·`web/style.css`·`server/test/web-markdown.test.ts` 전부 실존 확인
- mx_validation: P1(내보낸 함수 fan_in≥3 @MX:ANCHOR)·P2(비동기/goroutine 패턴) 훑기 결과 위반 0건. `renderMarkdown` 호출부는 `web/app.js` + 시험 파일 둘뿐(<3, ANCHOR 불요). 기존 `@MX:ANCHOR` 3개(`safeHref`·`renderInline`·`renderMarkdown`) 유효. 모듈 수준 `@MX:NOTE` 1건 추가
- changelog_entry_position: `[Unreleased]` 섹션 최상단 신설 `### 2026-09-09` 소제목 아래 첫 항목

### 차이(Divergence) 결산 — 갭 넷

1. **AC-WEBMD-016 `npm run e2e` 절 FAIL** — 기준선 결함(e2e step3 ③, 이전 crew 연동 작업이 바꾼 봇 등록 안내 형식). 이 SPEC 변경이 원인 아님 — 귀속 근거는 §E.2 넷. 수리는 백로그 카드 `t44` 로 큐에 들어 있음. 나머지 두 절(네 파일 diff 0줄·`npm test` 238+103)은 PASS
2. **커버리지 수치 미산출** — 브라우저 소스 모듈(`web/`, 워크스페이스 밖)이라 이 vitest 설정에서 v8 귀속이 만들어지지 않음(§E.3 Gaps 2번, 시도 세 번의 원문 §E.2). 제한 문서화로 종결
3. **M6 수동 브라우저 확인** — 운영자 대기 중 (§E.2 M6)
4. **sync_commit_sha 자기참조** — 위 placeholder, 후속 커밋에서 되돌려 씀

frontmatter_status_transitions: in-progress → completed (단일 sync 커밋, 3-phase close)
canary_compliance_check: 해당 없음 — 이 SPEC 은 앞으로의 정책을 정의하지 않는다

### plan 감사 2회차 — 수리 검증 (2026-09-08)

- 보고서: `.moai/reports/plan-audit/SPEC-WEBMD-001-2.md`
- 범위: 새 전면 감사가 아니라 **1회차 수리가 실제로 착지했는지**만 본다. 고친 사람과 확인한 사람이 같다는 것이 1회차가 남긴 공백이었다
- 판정: **PASS 0.936** (1회차 0.879). 남은 차단 **0건**
- D1·D2 는 감사관이 직접 재현했다 — 정규식을 실행해 스킴 없는 위장 라벨이 잡히는 것을, 교정된 명령을 다시 돌려 문서 기재와 바이트 단위로 일치하는 것을 확인했다. 인용 경로 30개 전수 확인, 미해소 셋은 전부 이 SPEC 이 만들 산출물이라 부재가 정상이다
- **1회차 권고를 따르지 않은 두 자리(D4·D5)는 수리자가 옳았다고 판정됐다.** D4 는 1회차가 제안한 대체안 자체가 어떤 구현에서도 참이라 공허했고(`renderMarkdown` 은 객체가 아니라 문자열 값을 받는다), D5 는 음성 방향이 fail-closed 라 정제 유무를 가르지 못한다는 것이 실행으로 확인됐다
- 회귀 검사: 불가검 절 신설 0건 · 요구사항 약화 0건 · 자기 훑기 범위 안 고정 숫자 0건

### 2회차 잔여 둘 반영 (2026-09-08, v0.2.1)

감사관이 optional 로 분류한 넷 가운데 둘을 얹었다. 나머지 둘(앞공백 축 두 갈래, 비ASCII 동형이의 위장)은 정의역 밖으로 남긴다 — 전자는 어느 방향이든 안전 쪽이고, 후자는 별도 카드가 다룰 범위다.

- **AC-WEBMD-008 에 「맨 호스트」 절 추가.** 기존 절은 스킴 없는 방향으로 슬래시형과 `www.`형만 먹였다. 술어를 그 둘로 좁힌 구현은 `[good.example](https://evil.example)` 를 놓치면서도 모든 절을 통과한다 — REQ-WEBMD-008 위반이 기계로 잡히지 않는 상태였다. 술어의 정의역 전체를 기준 안으로 들였다
- **Definition of Done 의 과대주장 정정.** 「테스트가 하나도 실행되지 않아도 종료 코드가 0 이 되는 경로를 이 조건이 막는다」는 거짓이었다 — 0건 실행은 `failed` 0 과 skip 조건을 그대로 만족한다. 이 조건이 실제로 막는 것(목록 밖 skip)과 0건 실행을 떨어뜨리는 자리(AC 각각의 노드 계수)를 갈라 적었다
- 예산 불변: REQ 15 / AC 16. 새 절은 AC-WEBMD-008 **안**이다

### plan 감사 3회차 — run 게이트 재실행 (2026-09-08)

- 보고서: `.moai/reports/plan-audit/SPEC-WEBMD-001-3.md`
- 촉발: 2회차 판정(0.2.0 대상) **뒤에** 잔여 둘이 반영돼(0.2.1) «판정 뒤 산출물 무변경» 건너뛰기 조건이 어긋남 → 스티키 캐시 미스, 게이트 재실행. delta 재검증(적용 수리 둘) + 현재 산출물 새 판정 병행
- 판정: **PASS 0.949** (2회차 0.936 대비 상승, Tier M 통과선 0.80 이상). must-pass 7항목 통과(MP-4 N/A), 남은 차단 0건
- 수리 둘 착지 확인 — 맨 호스트 절은 «좁힌 술어» 실행으로 REQ 위반이 이제 기계로 잡힘까지 검증; DoD 문장은 정확한 서술로 교체. 경계 넷(평문 무힌트·같은 호스트 무힌트·자동링크 무힌트·파싱 실패 fail-loud) 전부 생존
- 신규 발견 1건(minor·optional): HISTORY 표 0.2.1 행이 빈 줄(spec.md:27)에 가로막혀 표에서 분리 — 내용 온전, 렌더링만 파손. **판정 뒤 오케스트레이터가 기계 수리 1줄(빈 줄 제거)을 별도 커밋(docs(SPEC-WEBMD-001), c0026ce)으로 착지** — 본 판정은 수리 전 본문 기준임을 여기에 명시
- 한때 제기됐던 «스킴 없는 위장 절 둘 = 낡은 계수» 의심은 열거 검증으로 기각(허위 발견 회피 기록은 보고서 3회차 참조)
- 코드 앵커 12부류 전부 내용 앵커로 재탐색해 현행 나무와 일치 확인

## §F Phase 4 Mode Selection

Decision: Scale-based mode: serial (files: 5, domains: 1) — Standard envelope, cycle_type=tdd

- 기록 시점: 2026-09-08, run 세션 0eb896e5. Kickoff 게이트 통과(운영자 승인: run 진입 + 표준 진행) 직후, 첫 run-phase `Agent()` 스폰 전.
- 이 기록은 워크트리 갈라짐으로 유실됐다가 재결합됐다 — 구현 에이전트가 c0026ce 기점 워크트리에서 §E.2/§E.3 만 실어 push 했고, 본 절과 위 감사 3회차 기록은 공유 체크아웃에 미커밋으로 남아 `git merge --ff-only` 를 막았다. 복사본 `.moai/state/verify/webmd-run/progress-local-pre-ff.md` 보관 뒤 ff(d008b8f) 하고 이 자리에 재결합했다.

### Input parameters

- tier: M · scope: 5파일 (신규 3 — `web/markdown.js`, `web/markdown.d.ts`, `server/test/web-markdown.test.ts`; 수정 2 — `web/app.js`, `web/style.css`)
- domain count: 1 (웹 프런트 — vanilla JS DOM 렌더러와 그 테스트)
- file language mix: JS(바닐라 ES 모듈) + TS(선언·테스트) + CSS
- concurrency benefit: LOW (코딩 중심 — Anthropic coding-task parallelism caveat)
- agent-team 사전조건: 해당 없음 (요청 플래그 없음)

### Mode evaluation table

| mode | 선택 | 근거 |
|---|---|---|
| direct | not selected | 한 줄·오타 수준이 아님 — 신규 모듈 구현 |
| serial | **selected** | 코딩 중심 단일 도메인 — 순차 서브에이전트 기본 |
| fanout | not selected | 조사 중심 다중 도메인이 아님; 코딩 병렬화 caveat |
| sweep | not selected | 5파일, 균일 기계 변형 아님, 파일 간 의존 존재 |

### Justification

구현이 서로 의존하는 소수 파일(렌더러 → 형 선언 → 테스트 → 통합 → CSS)의 신규 작성이고 TDD RED-GREEN 순서(M1→M5)가 스스로 직렬 의존을 갖는다. Anthropic 의 코딩 과제 병렬화 caveat 에 따라 serial 이 기본이다. fanout 의 전제(조사 중심 ≥3 도메인), sweep 의 전제(≥~30파일 균일 기계 변형·파일 간 무의존)가 어느 쪽도 성립하지 않는다. harness level = standard (Complexity Estimator: 파일 >3·feature) — 자동 선택 그대로. Implementation Kickoff Approval 통과 + 선호 drained(진행축: 표준 진행) 확인.
