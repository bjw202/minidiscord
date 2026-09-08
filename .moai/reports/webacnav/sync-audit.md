# SPEC-WEBACNAV-001 sync 단계 감사 보고서

- 회차: 1
- 감사 대상: 커밋 `323d239` (`main` HEAD, `git rev-parse --short HEAD` → `323d239`), Tier S
- 감사 일자: 2026-09-08
- 통과선: SSOT `.claude/rules/moai/workflow/spec-workflow.md` L140 「S (Simple) … PASS threshold 0.75」·L334 「Tier S `0.75`」 에서 직접 읽었다. 프로파일 `.moai/config/evaluator-profiles/default.md` (harness.yaml `default_profile: "default"`) — 필수 통과: Functionality(AC 전부)·Security(Critical/High 0). `harness.yaml` 에 `evaluator_mode: hierarchical` 없음 → 평면 채점.
- 집계식: `agent-common-protocol.md` § Skeptical Evaluation Stance 의 조화평균.
- 매니저의 매트릭스는 주장으로만 취급했고 전부 명령으로 다시 쟀다. 세 소스 파일은 감사 끝에 `git status --short` 로 무변경을 확인했다(변이 실험은 git 객체 `323d239:web/app.js` 로 복원, `cmp` 일치).

## 판정

**PASS** — 종합 **0.92** (통과선 0.75). 차단 결함 0건. 필수 통과 두 차원 모두 통과.

```
H = 4 / (1/0.95 + 1/0.95 + 1/0.90 + 1/0.90)
  = 4 / (1.0526 + 1.0526 + 1.1111 + 1.1111) = 4 / 4.3274 = 0.924
```

## 차원 점수

| 차원 | 점수 | 판정 | 증거(원문) |
|------|------|------|-----------|
| Functionality (40%) | 0.95 | PASS (필수) | `cd server && npx vitest run test/web-chat.test.ts` → `Tests  31 passed (31)`; `npm test -w server` → `> tsc --noEmit` … `Test Files  17 passed (17)` / `Tests  210 passed (210)`. 구현 되돌림(5087a49 app.js) → `Tests  8 failed \| 23 passed (31)`, 여덟 `×` 가 새 `it` 여덟과 일치. 표적 변이 9건 중 8건 포착(아래 §3) |
| Security (25%) | 0.95 | PASS (필수) | `grep -n innerHTML web/app.js` → 6건 전부 기존 `= ''` 비우기(67·88·107·260·412·519), 새 코드 0건; 봇 이름은 `createTextNode`(app.js:546); `data-kind`·`className` 은 상수 `TO`/`CC`. CSS 블록 16진수 리터럴 `grep -c` → `0`(블록 39줄, 비어 있지 않음) |
| Craft (20%) | 0.90 | PASS | 커버리지(전체 스위트, `--coverage.allowExternal=true --coverage.include='**/web/app.js'`): SPEC 영역 428~660행 **153/153 = 100.0%**, 미적중 0; 파일 전체 `app.js \| 79.86 \| 67.74 \| 65.75 \| 82.47` (미적중 106-227·279-320·704-763 은 전부 영역 밖, 기존 코드). `tsc --noEmit` 통과. JS 린터 없음(`ls node_modules/.bin \| grep eslint` → 0건) — Gap. 생존 변이 1건(M5) |
| Consistency (15%) | 0.90 | PASS | 새 주석 전부 한국어(`git show 323d239 -- web/app.js \| grep '^+' \| grep '//'` 에서 한글 없는 줄 0); 토큰 11개 전부 `design-tokens.css` 에 존재(각 `grep -c` → 1); IME 가드 순서 app.js:615→616(새 분기)·630→631(기존) — progress.md 의 행 인용과 일치; AC-008(1) `5`·(2) `1`; 회귀 AC-WEBCHAT-009~012·D-6 두 건 이름으로 `✓` 확인 |

## §1 progress.md §E.2·§E.3 대조

| 주장 | 재실행 결과 | 일치 |
|------|-------------|------|
| RED 8 failed / 23 passed | red.txt 원문 `Tests  8 failed \| 23 passed (31)`; 되돌림 재현(M0) 동일 | ✓ |
| GREEN 31/31 | 재실행 `Tests  31 passed (31)` | ✓ |
| 전체 210/210, pretest tsc | 재실행 `210 passed (210)`, `> tsc --noEmit` 선행 | ✓ |
| IME 615→616 / 630→631 | `grep -n "isComposing\|preventDefault()"` → 615·616·630·631 | ✓ |
| run_commit_sha 323d239 | HEAD 323d239 | ✓ |
| `textContent` 가 `TO pm`/`CC pm` | AC-001 단언 `['TO pm','CC pm']` 통과, AC-WEBCHAT-010 `startsWith` 통과 | ✓ |

## §2 AC 별 판정 (코드에 대고)

| AC | 판정 | 근거 |
|----|------|------|
| 001 배지·role·초기 선택 | PASS | app.js:522 `role=listbox`, :538~546 배지 span 앞 + 텍스트 노드, :571 `applySelection`; M8(aria 토글 제거) 이 AC-001 을 붉힘 |
| 002 ↓+Enter/Tab → CC, 항목 0 이면 닫기 | PASS | :580~584 `commitSelected`, :619 Tab; M3(첫 항목 고정)·M7(Tab 무동작) 포착 |
| 003 감김 | PASS | :590 `(acIndex + delta + n) % n`; M1(클램프) 포착 |
| 004 Esc | PASS | :618; M9(Esc 무동작) 포착 |
| 005 닫힌 상태·조합 중 통과 | PASS | :612 `!ac.hidden`, :615 가드; M2(가드를 preventDefault 뒤로)·M4(전부 막기) 둘 다 이 `it` 하나가 포착 |
| 006 disabled 미선택 | PASS | `acItems()` 가 `:not(.disabled)` 만; M1·M8 이 붉힘 |
| 007 mouseenter | PASS | :548~551; M6(리스너 제거) 포착 |
| 008 회귀·CSS | PASS | (1) 5 (2) 1 (3) exit 0 (4) 39/0 (5) 세 파일 무변경 |

## §3 변이 실험 (`web/app.js`, 매 건 뒤 git 객체로 복원)

| 변이 | 결과 | 붉어진 테스트 |
|------|------|--------------|
| M0 구현 전체 되돌림(5087a49) | 8 failed | 새 `it` 여덟 전부 |
| M1 감김 제거(모듈로 → 클램프) | 1 failed | wraps the selection at both ends |
| M2 새 분기 IME 가드를 preventDefault 뒤로 | 1 failed | does not intercept … nor while composing |
| M3 Enter 가 선택 대신 첫 항목 | 2 failed | ArrowDown then Enter… · mouseenter… |
| M4 `!ac.hidden` 조건 삭제(전부 막기) | 1 failed | does not intercept … when closed |
| **M5 `hideAutocomplete` 의 `acIndex = 0` 삭제** | **0 failed (생존)** | — |
| M6 mouseenter 리스너 삭제 | 1 failed | mouseenter moves the selection… |
| M7 Tab 이 preventDefault 만 | 2 failed | ArrowDown then Enter… · Tab with no selectable… |
| M8 aria-selected 토글 삭제 | 4 failed | AC-001·003·006·007 |
| M9 Esc 가 preventDefault 만 | 1 failed | Escape hides… |

## §4 결함 목록

- F1 [low] [optional] `web/app.js:431` — `hideAutocomplete` 의 `acIndex = 0` 은 관측 가능한 효과가 없다(M5 생존). 드롭다운을 여는 경로는 `onComposerInput` 하나뿐이고 그 경로가 :520 에서 먼저 0 으로 되돌린다. REQ-001 이 두 자리 되돌림을 명시하므로 코드는 규격 준수이며 삭제 권고가 아니다 — 기록만. 확신 높음. 필요 시 수정: 없음(규격이 요구), 또는 REQ-001 을 «렌더 시작에서» 하나로 좁히는 것은 다음 SPEC 몫.
- F2 [low] [optional] `Shift+Tab` 확정(REQ-004 가 명시)에 단언이 없다. 코드(:619)는 `shiftKey` 를 보지 않아 규격대로다. 확신 높음. 필요 시 AC-002 에 `pressKey('Tab', { shiftKey: true })` 한 줄.
- F3 [info] [optional] `web/app.js` 파일 전체 커버리지 82.47%(<85%). 미적중 구간(106-227·279-320·704-763)은 전부 이 SPEC 영역 밖의 기존 코드이며 SPEC 영역은 100%. 기준선(5087a49) 전체 수치는 재지 않았다 — Gap. 이 SPEC 에 귀속되는 결함이 아니다.
- F4 [info] [optional] AC-008(5) 「손댄 파일 셋뿐」은 run 시점 추적 변경 기준으로 참이었으나, 커밋 `323d239` 자체는 문서 5개를 함께 싣는다(`git show --stat` 8 files). 기준 문장이 «추적 변경»과 «커밋 내용»을 가르지 않는다. 판정 영향 없음.
- F5 [info] [optional] disabled 행만 있는 열린 드롭다운에서 ↑/↓ 는 `preventDefault` 만 하고 움직이지 않는다(plan.md §B.2 가 이미 적은 가장자리). 단언 없음. 해롭지 않음.
- F6 [gap] `Skill("moai-ref-owasp-checklist")` → `Unknown skill`(미설치). 보안 검토는 grep 기반 수동 점검으로 대체했다. JS 린터도 프로젝트에 없다.
- F7 [info] `spec.md` `status: in-progress`, progress.md §E.4 `<pending sync-phase>` — sync 단계 전이라 예상되는 상태. manager-docs 가 닫을 자리.
- F8 [info] plan.md §B.2 는 Enter/Tab 확정을 인라인으로 적었고 구현은 `commitSelected()` 로 뽑았다(TDD REFACTOR 한 걸음, progress.md §E.2 에 명시). 동작 동일(M3·M7 이 두 경로 모두를 붉힘) — 수용 가능한 이탈.

## §5 미검증(Gaps)·잔여 위험

- 브라우저 실확인(plan.md M5-5, 수동·판정 아님)은 하지 않았다. jsdom 은 `scrollIntoView` 가 없어 `?.()` 경로만 지났다.
- OWASP 체크리스트 스킬 부재(F6). 커버리지 기준선(F3).
- 잔여 위험: 실제 IME 에서 `isComposing` 이 실리는 시점은 브라우저마다 다르나, 기존 D-6 경로와 같은 가드라 새 위험은 아니다.

## §6 권고

- sync 단계에서 `spec.md` status → completed, progress.md §E.4 기입(F7).
- 선택: AC-002 에 Shift+Tab 단언 한 줄(F2).
