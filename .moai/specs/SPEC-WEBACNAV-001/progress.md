# SPEC-WEBACNAV-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-WEBACNAV-001` |
| Tier | S (spec.md + plan.md; 이 SPEC 은 acceptance.md 도 함께 둔다) |
| 원본 계획 | `.moai/plans/floating-stargazing-hamming.md` (승인된 구현 계획) |
| 선행 SPEC | `SPEC-WEBCHAT-001`(완료) · `SPEC-MENTION-001`(완료) |
| 관련 SPEC | `SPEC-WEBRICH-001` (같은 파일 `web/app.js`·`web/style.css` 를 공유, 범위는 겹치지 않음) |
| 손대는 파일 | `web/app.js` · `web/style.css` · `server/test/web-chat.test.ts` |
| 개발 방식 | TDD — M1 이 RED (`quality.yaml` `development_mode: tdd`) |
| 현재 상태 | `completed` — run 커밋 `323d239` · sync 감사 PASS 0.92 · sync 커밋 대기(오케스트레이터) |
| spec_base_sha | `5087a49` (`git rev-parse --short HEAD`, run 단계 시작 시점) |

---

## §E.1 Plan-phase Audit-Ready Signal

- plan_complete_at: 2026-09-08T00:00:00+09:00
- plan_status: audit-ready
- plan_audit: `.moai/reports/webacnav/plan-audit.md` — CONDITIONAL PASS 0.91 (Tier S 통과선 0.75); MUST-FIX D1·D2 는 v0.2.0 교정 라운드에서 종결, 관찰 O-1~O-3 반영
- verified_by_orchestrator: `moai spec lint` → «No findings»; REQ 8 / AC 8 / `it` 8 / NEEDS CLARIFICATION 0 (명령으로 재확인)

---

## §E.2 Run-phase Evidence

실행 환경: 격리 워크트리 `.claude/worktrees/agent-a722b267af9ecf932` (브랜치 `worktree-agent-a722b267af9ecf932`, `main` HEAD `5087a49` 에서 갈라짐). 런타임 가드가 기본 체크아웃의 편집·git 을 거부해 모든 작업이 이 워크트리에서 이뤄졌다. 의존성은 기본 체크아웃의 `node_modules` 를 심볼릭 링크로 끌어왔다(`ls -la node_modules` → `-> /Users/byunjungwon/Dev/my-project-04/minidiscord/node_modules`). 증거 파일은 전부 `.moai/state/verify/webacnav/` 아래에 있다.

### RED (M1) — 새 `it` 8개 실패, 기존 23개 통과

명령: `cd server && npx vitest run test/web-chat.test.ts` → `.moai/state/verify/webacnav/red.txt`, 종료 코드 1. 요약 줄 원문:

```
     × renders TO/CC badges with listbox roles and selects the first item 4ms
     × ArrowDown then Enter (or Tab) commits the selected CC candidate without sending 2ms
     × Tab with no selectable candidate only closes the dropdown 3ms
     × wraps the selection at both ends 3ms
     × Escape hides the dropdown without touching the value; a following Enter sends normally 2ms
     × does not intercept arrows/Tab/Escape when closed, nor while composing 2ms
     × never selects a disabled row while cycling 2ms
     × mouseenter moves the selection to that item and Enter commits it 2ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected null to be 'listbox' // Object.is equality
AssertionError: expected undefined to be 'CC' // Object.is equality
AssertionError: expected false to be true // Object.is equality
AssertionError: expected [] to deeply equal [ <div class="ac-item"></div> ]
AssertionError: expected false to be true // Object.is equality
AssertionError: expected undefined to be 'TO' // Object.is equality
AssertionError: expected +0 to be 1 // Object.is equality
AssertionError: expected [] to deeply equal [ <div class="ac-item"></div> ]
 Test Files  1 failed (1)
      Tests  8 failed | 23 passed (31)
```

첫 실패 단언 여덟이 감사 보고서 §2 의 표와 같다(AC-002 둘째 `it` 은 v0.2.0 O-3 로 추가된 것이라 감사 표엔 없고, `expected false to be true` — `Tab` 의 `defaultPrevented` — 에서 떨어졌다).

### GREEN (M2~M4) + REFACTOR

명령: `cd server && npx vitest run test/web-chat.test.ts` → `.moai/state/verify/webacnav/green.txt`, 종료 코드 0(리팩터 뒤 재실행한 결과로 덮어씀). 요약 줄 원문:

```
 Test Files  1 passed (1)
      Tests  31 passed (31)
```

리팩터 한 걸음: `Tab` 분기와 `Enter` 분기가 같은 «선택된 항목 확정, 없으면 닫기» 를 두 번 들고 있어 `commitSelected()` 하나로 뽑았다. 계획서 §B.2 의 동작은 그대로다.

### 전체 게이트 (M5)

명령: `npm test -w server` → `.moai/state/verify/webacnav/full.txt`, 종료 코드 0. `pretest` 가 `tsc --noEmit` 을 먼저 돌렸다. 요약 줄 원문:

```
 Test Files  17 passed (17)
      Tests  210 passed (210)
```

### AC 매트릭스

| AC | 판정 명령 | 관측 (원문) | 상태 |
|----|-----------|-------------|------|
| AC-WEBACNAV-001 | vitest (green.txt) | `✓ renders TO/CC badges with listbox roles and selects the first item` | PASS |
| AC-WEBACNAV-002 | vitest (green.txt) | `✓ ArrowDown then Enter (or Tab) commits the selected CC candidate without sending` · `✓ Tab with no selectable candidate only closes the dropdown` | PASS |
| AC-WEBACNAV-003 | vitest (green.txt) | `✓ wraps the selection at both ends` | PASS |
| AC-WEBACNAV-004 | vitest (green.txt) | `✓ Escape hides the dropdown without touching the value; a following Enter sends normally` | PASS |
| AC-WEBACNAV-005 | vitest (green.txt) | `✓ does not intercept arrows/Tab/Escape when closed, nor while composing` | PASS |
| AC-WEBACNAV-006 | vitest (green.txt) | `✓ never selects a disabled row while cycling` | PASS |
| AC-WEBACNAV-007 | vitest (green.txt) | `✓ mouseenter moves the selection to that item and Enter commits it` | PASS |
| AC-WEBACNAV-008 | vitest + bash (ac008.txt) | (1) `5` · (2) `1` · (3) exit=0, `31 passed (31)`, `failed` 0건 · (4) 블록 `39` 줄, 16진수 `0` · (5) `git status --short` 추적 변경 = 세 파일 | PASS |

### 불변 조건

| 불변 조건 | 관측 | 상태 |
|-----------|------|------|
| 기존 AC-WEBCHAT-009~012·D-6 본문 무변경 | `git diff -U0 server/test/web-chat.test.ts \| grep '^@@'` → `@@ -125,0 +126,7 @@` (pressKey 헬퍼) · `@@ -717,0 +725,182 @@` (파일 끝 describe) 두 덩어리뿐 | PASS |
| `[HARD]` IME 가드가 `preventDefault` 앞 (두 경로) | `web/app.js` 615행 `if (e.isComposing \|\| e.keyCode === 229) return` → 616행 `e.preventDefault()`(새 분기); 630행 → 631행(기존 Enter 경로, 그 자리 그대로) | PASS |
| `commitMention` · `mention.ts` · `index.html` · `rich.js` · `design-tokens.css` 무변경 | `git diff --stat` 에 세 파일만 | PASS |
| `app.js` 에서 지워진 줄은 계획된 둘뿐 | `git diff -U0 web/app.js \| grep '^-[^-]'` → 8줄: 옛 `item.textContent = …` 1줄 + 옛 «첫 항목 클릭» Enter 블록 7줄 | PASS |

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-09-08T14:10:00+09:00
run_commit_sha: 323d239
run_status: audit-ready
ac_pass_count: 8
ac_fail_count: 0
preserve_list_post_run_count: 5   # commitMention · mention.ts · index.html · rich.js · design-tokens.css — 전부 무변경
l44_pre_commit_fetch: not-run     # 격리 워크트리에서 작업, 커밋은 오케스트레이터 몫
l44_post_push_fetch: not-run
new_warnings_or_lints_introduced: 0   # tsc --noEmit 통과 (full.txt); 별도 JS 린터는 프로젝트에 없음
cross_platform_build:
  attempted: false
  note: 바닐라 JS + jsdom, 플랫폼별 빌드 없음
total_run_phase_files: 3          # web/app.js · web/style.css · server/test/web-chat.test.ts
m1_to_mN_commit_strategy: single-commit   # RED→GREEN→REFACTOR 를 한 커밋으로; RED 증거는 red.txt 와 이 절이 보존
evidence:
  red: .moai/state/verify/webacnav/red.txt
  green: .moai/state/verify/webacnav/green.txt
  full: .moai/state/verify/webacnav/full.txt
  ac008: .moai/state/verify/webacnav/ac008.txt
worktree: .claude/worktrees/agent-a722b267af9ecf932
```

---

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_complete_at: 2026-09-08T00:00:00+09:00
sync_commit_sha: (이 항목을 담은 sync 커밋)
sync_status: audit-ready
sync_audit: .moai/reports/webacnav/sync-audit.md   # 회차 1, 감사 대상 323d239
sync_audit_verdict: PASS
sync_audit_score: 0.92
sync_audit_blocking: 0
sync_audit_nonblocking: 8   # F1~F8 기록만, 코드 변경 없음
docs_touched:
  - README.md            # «`@` 자동완성» 항목 확장 + 설치 절차 ⑧ 힌트
  - CHANGELOG.md         # [Unreleased] 2026-09-08 절 첫 항목
docs_commit_sha: (이 항목을 담은 sync 커밋)
b12_self_test_a: pass   # grep -c 'SPEC-WEBACNAV-001' CHANGELOG.md → 0 (기입 전)
b12_self_test_b: pass   # acceptance.md 의 AC-WEBACNAV-NNN 고유 8개 = CHANGELOG «시험 8개»·spec.md §7 8행
b12_self_test_c: pass   # web/app.js · web/style.css · server/test/web-chat.test.ts · web/design-tokens.css ls 확인
changelog_entry_position: '[Unreleased] › ### 2026-09-08 절 첫 번째 항목'
frontmatter_status_transitions:
  spec.md: in-progress → completed (version 0.2.0 → 1.0.0, HISTORY 1.0.0 행 추가)
  plan.md: n/a   # frontmatter 없음
  acceptance.md: n/a   # frontmatter 없음
```
