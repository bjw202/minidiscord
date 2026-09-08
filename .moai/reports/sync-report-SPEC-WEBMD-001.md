# Sync Report — SPEC-WEBMD-001

날짜: 2026-09-09 · Route A (Tier M, main 직접 단일 sync 커밋) · 수행: manager-docs

## 산출물

| 파일 | 변경 |
|---|---|
| `CHANGELOG.md` | `[Unreleased]` 에 2026-09-09 마크다운 렌더링 항목 1건 신설 |
| `.moai/project/structure.md` | web/ 파일 목록에 `markdown.js`·`markdown.d.ts` 추가 |
| `.moai/project/codemaps/modules.md` | web/ 표 6→8 파일, 1,582→2,471줄, markdown 두 행 신설, app.js/style.css 줄 수 갱신 |
| `.moai/project/codemaps/overview.md` | 구성요소 표 web/ 행 갱신 + 본문 마크다운 기능 표기 |
| `.moai/project/codemaps/dependencies.md` | web/ 의존성 간선에 `./markdown.js` 추가, `web/markdown.js -> (없음)` 신설 |
| `.moai/project/codemaps/entry-points.md` | 웹 로딩 절 — import 지점 606→741행, `./markdown.js` 병기 |
| `.moai/project/codemaps/data-flow.md` | 8단계에 `renderMessage → renderMarkdown` 폴백 계약 한 문장 |
| `.moai/specs/SPEC-WEBMD-001/spec.md` | frontmatter만: `status: in-progress → completed`, `updated: 2026-09-09` |
| `.moai/specs/SPEC-WEBMD-001/progress.md` | §E.4 Sync-phase Audit-Ready Signal 신설 (갭 넷 결산 포함) |
| `.moai/specs/SPEC-WEBCHAT-001/spec.md` | 오케스트레이터가 미리 작성한 통지 HISTORY 행 + updated 날짜(diff 2줄) 그대로 커밋 |
| `web/markdown.js` | 헤더 주석에 모듈 수준 `@MX:NOTE` 1줄 (본문 코드 무변경) |

## 사용한 점검

- B12 사전 점검: `grep -c 'SPEC-WEBMD-001' CHANGELOG.md` → 작성 전 **0**, 작성 후 **1**
- 코드맵 선별: `grep -l "rich\.js\|app\.js" .moai/project/codemaps/*.md` → 5파일(modules·overview·dependencies·entry-points·data-flow) 적중, 전부 갱신
- MX P1/P2 훑기: `renderMarkdown` 호출부는 `web/app.js` + 시험 파일 둘뿐(<3 → ANCHOR 불요), 비동기 패턴 없음 → 위반 0건. 기존 `@MX:ANCHOR` 3개(safeHref·renderInline·renderMarkdown) 유효 확인

## 커밋

- sync 커밋: `4125944` (41259446b9fd36140aadc79cd795e611b8cb6f1d) — push 완료 (521ba31 → 4125944)
- SHA backfill 커밋: §E.4 `sync_commit_sha` 를 실측 SHA 로 교체 (본 보고서와 함께)

## 남은 것 (갭 넷 — progress.md §E.4 결산과 동일)

1. AC-WEBMD-016 `npm run e2e` 절 — 기준선 결함(봇 등록 안내 형식), 수리 카드 `t44` 큐 대기
2. 커버리지 수치 not-producible (브라우저 소스 모듈, vitest v8 귀속 미생성)
3. M6 수동 브라우저 확인 — 운영자 대기
4. sync_commit_sha 자기참조 — backfill 커밋으로 해소
