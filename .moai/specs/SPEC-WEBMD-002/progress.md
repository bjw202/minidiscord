# SPEC-WEBMD-002 — progress

Tier S · plan-phase 산출물: spec.md(REQ 8 · AC 인라인 8) + plan.md(마일스톤 3 · 파일 3). 감사 대기.

## §E.1 Plan-phase Audit-Ready Signal

- plan_status: audit-ready
- plan_complete_at: 2026-09-11
- artifacts: spec.md, plan.md (Tier S — 수용 기준은 spec.md §3.2 인라인)
- 근거 실측: DB 토큰 분포(시작 128 / 전역 133 / 나중 줄 3 / `@CC` 0), 서버 문법 `server/src/mention.ts` 3행 `MENTION_RE`, `web/markdown.js` `renderInline` 회독, `web/style.css` `.ac-kind` 규칙 확인, 기존 시험 `server/test/web-markdown.test.ts` 회독(기존 픽스처에 토큰 없음 확인) — spec.md §1·HISTORY 0.1.0 에 기록
- 핵심 결정: 매칭 범위 = 서버 문법 전역(코드 표면 제외), 조립 위치 = `renderInline` 안(app.js 무변경) — plan.md §A.2·§A.3
- commit: 미실행 — 오케스트레이터가 git 을 처리한다

**plan 감사 (Tier S 단일 패스 + 발견 반영 후 재실행 1회)**

- audit_verdict: PASS (re-run #2 최종 판정)
- audit_report: .moai/specs/SPEC-WEBMD-002/plan-audit.md
- audit_at: 2026-09-11T06:13:47Z (재실행)
- auditor_version: plan-auditor
- audit_score: 1회차 0.9231 → 발견 F-1·F-2 반영 후 재실행 **1.00** (Testability 0.75→1.0, 회귀 없음; Tier S 통과선 0.75)
- plan_artifact_hash: 2f2c6e635576a669edcff9e8913aeb2b1f7cce850bc60331242ea6eef7c21e7c
- 발견 처분: F-1 (AC-006/007 관측 기준 — 사전 점검 HEAD 명시로 해소) · F-2 (AC-008 `{ timeout: 20_000 }` 명시로 해소 — 근거 관행 web-markdown.test.ts:171 확인됨)
- Implementation Kickoff Approval: 운영자 승인 (2026-09-11 — 지금 시작 · 자율 진행 · 발견 반영 후 진행 선택)

## §E.2 Run-phase Evidence

**Pre-flight (plan.md §C — 구현 시작 전, 어떤 편집보다 먼저 측정)**

- pre-flight HEAD: `67db21a03e40ffb135b2eac24a93199d5802b883` (branch: worktree-agent-a1eb5be106c638c3e — Route A 커밋은 main 으로 push) — AC-WEBMD2-006·007 의 모든 diff/show 비교가 도는 기준선
- `npm run typecheck -w server` → exit 0 (베이스라인 녹색)
- `npx vitest run server/test/web-markdown.test.ts` → 기존 블록 전부 녹색 (17 passed)
- `grep -c 'md-mention' web/markdown.js web/style.css` → 0, 0 (중복 구현 부재)
- `server/src/mention.ts:3` `MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g` 확인 (자격 문법의 원천)

**M1 렌더러 (AC-WEBMD2-001~005·008) — TDD**

- RED (구현 전, 워킹트리 = 테스트 추가만): `npx vitest run server/test/web-markdown.test.ts` → `Tests  5 failed | 18 passed (23)` — 실패 5건 전부 AC-WEBMD2-001·002·004·005·008 (칩 0개). AC-WEBMD2-003(과대 매칭 거부)은 구현 없이는 공허하게 통과(칩 0·원문 항등) — 이 AC 는 «배지를 만드는» 구현이 들어온 뒤에만 실패할 수 있는 거부 기준이다. 기존 AC-WEBMD-001~016 전부 초록.
- GREEN: `renderInline` 말미(리터럴 폴백 직전)에 `@` 분기 추가 — 고정 문법 한 번 시도(`@TO(`/`@CC(` 대문자만), 이름 스캔은 `(`·`)`·공백 멈춤(`MENTION_NAME_STOP_RE`), 실패 즉시 한 글자 리터럴. 칩은 `createElement('span')`+`className`+`textContent` 로만 조립, 이름은 텍스트 노드(재해석 없음). export 다섯 무변경.
- GREEN 확인: `npx vitest run server/test/web-markdown.test.ts` → `Tests  23 passed (23)`, exit 0.

**M2 스타일 (AC-WEBMD2-006) — TDD**

- RED (스타일 블록 추가 전): `npx vitest run server/test/web-markdown.test.ts` → `Tests  1 failed | 23 passed (24)` — `AssertionError: expected -1 to be greater than or equal to 0`(SPEC-WEBMD-002 블록 부재). 시험은 `git show 67db21a…:web/style.css` 기준선과 `.ac-kind` 세 규칙을 비교한다.
- GREEN: `web/style.css` 말미에 `/* SPEC-WEBMD-002 */` 블록 신설 — `.md-mention` 공통(inline-block·min-width·간격·모서리·타이포를 `.ac-kind` 와 같은 토큰으로 미러) + `.to`(강조색 배경) + `.cc`(흐린 글자·가는 테두리). `.ac-kind` 세 규칙 무수정, hex 0건, `var(--md-*` 만 사용.
- GREEN 확인: `npx vitest run server/test/web-markdown.test.ts` → `Tests  24 passed (24)`, exit 0.

**M3 회귀·통합 (AC-WEBMD2-007) — 회귀 게이트(plan §F M3 은 RED 단계 없음: 구현 완료 상태를 통합 경로로 관측하는 AC)**

- AC-WEBMD2-007 describe 추가 — jsdom `loadApp` 골격으로 실제 app.js 경로 관측 + pre-flight HEAD 기준선 PRESERVE 검사. 첫 실행에서 최상위가 아닌 describe 안의 import 구문 오류(`Cannot use import statement outside a module`) → 390행 관례(최상위 import)로 수정 후 통과. 구현물 결함이 아니라 시험 코드 배치 오류였고 수정은 시험 파일 안에서만 일어났다.
- GREEN: `npx vitest run server/test/web-markdown.test.ts` → `Tests  25 passed (25)`, exit 0.
- 전체 회귀: `npm test`(workspaces 전체) → exit 0, `Test Files  6 passed (6)`, `Tests  103 passed (103)`.
- 형 검사: `npm --prefix server run typecheck` → exit 0.

**§E AC 이분 판정 행렬 (E1 — 판정 명령은 spec.md §3.2 관측 명령 그대로)**

명령(전 행 공통): `npx vitest run server/test/web-markdown.test.ts` — 관측: `Tests  25 passed (25)` (파일 안 AC-WEBMD2-001~008 describe 각각 초록; 기존 AC-WEBMD-001~016 도 같은 실행 안에서 초록). PRESERVE/diff 행만 별도 명령.

| AC | 판정 | 관측 명령 | 관측 출력 | HEAD 귀속 |
|----|------|-----------|-----------|-----------|
| AC-WEBMD2-001 | PASS | `npx vitest run server/test/web-markdown.test.ts` | `Tests  25 passed (25)`, exit 0 | 작업 나무 == M3 커밋 내용(시험 영향 파일은 동일) |
| AC-WEBMD2-002 | PASS | 〃 | 〃 | 〃 |
| AC-WEBMD2-003 | PASS | 〃 | 〃 | 〃 |
| AC-WEBMD2-004 | PASS | 〃 | 〃 | 〃 |
| AC-WEBMD2-005 | PASS | 〃 | 〃 | 〃 |
| AC-WEBMD2-006 | PASS | 〃 (`.ac-kind` 기준선 비교는 시험 안에서 `git show 67db21a…:web/style.css` 대비) | 〃 | 〃 |
| AC-WEBMD2-007 | PASS | 〃 + `git log 67db21a..HEAD -- web/app.js web/rich.js web/markdown.d.ts server/src` / `git diff --stat -- (같은 경로)` / `git diff 67db21a -- server/test/web-markdown.test.ts \| grep -c '^-[^-]'` | 시험 초록; log 빈 출력; diff --stat 빈 출력(0줄); 제거 라인 0 | 〃 |
| AC-WEBMD2-008 | PASS | 〃 (`{ timeout: 20_000 }` 안쪽 종료 — Duration 838ms 전체 실행) | 〃 | 〃 |

**E4 기준선 대비** — §C 사전 측정(편집 전): web-markdown.test.ts 17 passed·0 failed, typecheck exit 0. 실행 후: 같은 파일 25 passed·0 failed, 전체 스위트 103 passed·0 failed, typecheck exit 0. 사전 결함 0 → 신규 결함 0.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-09-11T06:27:39Z
run_commit_sha: pending-backfill-M3   # M3 커밋 SHA 를 후속 커밋으로 백필한다(자기 참조 물리 불가 — D3 관례)
run_status: complete
ac_pass_count: 8
ac_fail_count: 0
preserve_list_post_run_count: 0       # plan §A.5 PRESERVE 위반 관측 0건 (git log/diff 기준선 비교)
l44_pre_commit_fetch: origin/main == pre-flight 67db21a (push 직전 fetch 확인)
l44_post_push_fetch: pending-backfill-M3   # push 후 기록(백필 커밋에서 확정)
new_warnings_or_lints_introduced: 0   # tsc --noEmit exit 0; 저장소에 별도 lint runner 부재(§C 사전·사후 동일 명령면)
cross_platform_build: n/a             # 빌드 단계 없는 바닐라 ES 모듈·CSS (spec §5 제약)
total_run_phase_files: 5              # web/markdown.js, web/style.css, server/test/web-markdown.test.ts, spec.md(frontmatter), progress.md
m1_to_mN_commit_strategy: 마일스톤별 커밋 M1(b374dc8)·M2(45a98de)·M3(이 커밋) + run_commit_sha 백필 후속 커밋, 종료 시 일괄 push(origin HEAD:main)
```

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

## §F Phase 4 Mode Selection

(2026-09-11T06:13:47Z — Implementation Kickoff Approval 승인 직후. 사용자 선택: 지금 시작 · 자율 진행)

**입력 변수** — tier: S · scope: 3 files (markdown.js·style.css·web-markdown.test.ts) · domains: 1 (본문 렌더) · 언어: TypeScript/JavaScript/CSS · concurrency benefit: 낮음(단일 렌더 경로, 파일 간 강결합)

**모드 평가** — direct: 미선택(신규 기능 + TDD 사이클, 한 줄 수정 아님) · serial: **선택**(코딩 작업 표준 — 마일스톤 3을 한 manager-develop 가 순차 수행, Tier S 최소 위임 형식) · fanout/sweep: 미선택(도메인 1·3파일, 병렬 이득 없음)

Decision: serial (Tier S minimal envelope — files: 3, domains: 1)
