# F1 수리 — GREEN 증거 (수리 적용 후)

- 수리 내용 (channel/src/index.ts, diff 전문은 커밋에):
  - `:7` 수입에 `MAX_NAME_BYTES` 추가 — `import { MAX_BODY_BYTES, MAX_HISTORY_BYTES, MAX_NAME_BYTES, truncateToBudget } from './truncate.js'`
  - `:93` 한 줄 수리 — `author: neutralizeEnvelope(m.author_name)` → `author: truncateToBudget(neutralizeEnvelope(m.author_name), MAX_NAME_BYTES)` (알림 통로와 같은 OD-5 상수 · truncate.ts 신규 상수·함수 0 · 기존 원시함수 재사용)
  - `:86-91` 낡은 주석 갱신 — «id·at·author 는 무변형» → «id·at 은 무변형 · author 는 OD-5 로 절단(알림 통로와 같은 상수)» + 근거(sync 감사 F1 · auth.ts:32 무검증)
  - channel/test/index-wiring.test.ts `:469` 인접 낡은 주석 갱신 — «절단의 대상은 body 뿐이다» → «author 는 OD-5 를 넘을 때만 잘린다(엣지 E-12) · 이 fixture 의 'alice' 는 상한 이하라 원문 그대로» (정정이 스스로 낡은 기록을 남기지 않게 — 같은 파일 내 정발)
- shasum 귀속: 수리 전 `860d1dac…` → 수리 후 `eec03e23…` (shasums.txt 전문)

## GREEN 1 — 단일 파일 (E-12 + 홍수 포함 19건)

- 파일: `green-raw.txt` (전문), 종료 코드 **0**

```
 RUN  v4.1.11 /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t25/channel

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Start at  10:12:09
   Duration  1.57s (transform 39ms, setup 0ms, import 138ms, tests 1.37s, environment 0ms)
```

- 19 = 기존 17 + 엣지 E-12 + 홍수 회귀. RED 에서 실패하던 두 테스트가 같은 단언으로 통과했다.

## GREEN 2 — 전체 스위트 (산술: 121 + 신규 2 = 123)

- 파일: `full-suite.txt` (전문), 종료 코드 **0**, 환경 스크럽 후 `npx vitest run --root channel --reporter=dot`

```
 Test Files  7 passed (7)
      Tests  123 passed (123)
   Start at  10:12:21
   Duration  64.91s (transform 400ms, setup 0ms, import 1.20s, tests 70.10s, environment 0ms)
```

- 산술: 기준선 121 (sync 레인·감사관 공동 관측치, 이 감사 보고서 C-1 동일) + 이 수리의 신규 2건 = **123**. 파일 수 7 불변.
- 두 신규 테스트의 실행 흔적이 full-suite.txt 에 있다 (stderr 라인):
  - `test/index-wiring.test.ts > channel wiring > an element whose author alone exceeds the limits still survives with a progressing cursor (E-12, AC-BOTSTAB-007 ㉢ family)`
  - `test/index-wiring.test.ts > channel wiring > a flood where the huge-author element is the oldest keeps every element and progresses the cursor (E-12 flood)`

## 홍수 회귀 GREEN 의 의미 (요지)

- 큰 author 원소(id 1, 가장 낮은 id) + 정상 원소 넷(id 2~5): 수리 전에는 루프가 5→4→3→2→1 순으로 **전원 소진**(RED 2차 — keptIds.length = 0)이었다.
- 수리 후 author 가 OD-5 로 절단되어 문서가 OD-4 를 넘지 않아 **다섯 원소가 모두 실리고** cursor 는 실린 집합의 최댓값(5)이다 — ㉠ kept ≥ 1 · 큰 author 원소 생존·author ≤ MAX_NAME_BYTES·표시 포함, ㉡ cursor === max(keptIds)·null 아님, ㉢ 정상 원소의 body·author 원문 불변 — 세 단언 모두 통과.

## 게이트 — typecheck · 형제 훑기

- typecheck: `npm run typecheck -w channel` → `tsc --noEmit` 오류 0, 종료 코드 0 (`typecheck.txt`)
- 형제 훑기: `node .moai/state/verify/t25-plan/sibling-sweep.mjs` → **36 블록** (기준선 34 + 신규 2). `sweep-after.txt` 전문.
  - 신규 블록 두 개가 assert_lines 와 함께 착지:
    ```
    channel/test/index-wiring.test.ts:540	an element whose author alone exceeds the limits still survives with a progressing cursor (E-12, AC-BOTSTAB-007 ㉢ family)	assert_lines=554,556,561
    channel/test/index-wiring.test.ts:568	a flood where the huge-author element is the oldest keeps every element and progresses the cursor (E-12 flood)	assert_lines=587,591,594,598,599
    ```
  - AC-BOTSTAB-013 (truncate.test.ts, 상수 식별자 적중 파생 규식 검증) 은 이 스위트 안에서 함께 돌아 **123 passed 에 흡수 통과** — 신규 블록은 MAX_NAME_BYTES·MAX_HISTORY_BYTES·TRUNC_MARKER_HEAD 식별자로 상수 적중을 진다. 스위트 초록이 곧 AC-013 초록이다.
  - 비고(감사 F4 재확인): 훑기의 assert_lines 규식은 `.toBeLessThanOrEqual(` 류 파생 단언을 여전히 누락한다(예: E-12 의 :559 미표기) — 이 수리가 고치는 범위 밖이며, 블록 수 증가라는 이 디스패치의 요구(«출력이 이긴다»)는 그대로 성립한다.
