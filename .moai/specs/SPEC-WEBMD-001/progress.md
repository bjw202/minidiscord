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

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

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
