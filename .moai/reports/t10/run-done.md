# run-done — 카드 `t10` / `SPEC-CHANINJECT-001`

| 항목 | 값 |
|------|-----|
| 판정 | **run 단계 완료** — 품질 게이트 PASS (구현 위임 + 오케스트레이터 독립 검증 배치) |
| 날짜 | 2026-08-28 |
| 워크트리 | `.claude/worktrees/t10` · 브랜치 `WT-injection-hardening` |
| plan 진입 HEAD | `bbd21cd` (=`spec_base_sha` `bbd21cd80e5d9b78baf2a00eee33bd386943fd28`) |
| run 커밋 | `0d10507` (M1) · `f7c7040` (M2) · `087ad3d` (M3) · `63dc294` (§E.2/§E.3 증거) |
| 검증 HEAD | `63dc294` — **푸시 없음** (sync 감사 통과까지 금지, 워크트리 유일 사본) |
| 상태 전이 | `draft → in-progress` (첫 run 커밋 `0d10507`에서 frontmatter만) |

## 구현 요약 (manager-develop 위임, cycle_type=tdd)

- **M1** — `neutralizeEnvelope` 부분 문자열 중화(`pushChatMessage` 안), `INSTRUCTIONS` 두 문장 추가, `fetch_history` 도구 설명 `#번호`→`cursor` 개정
- **M2** — `fetchHistory` 클로저를 `{cursor, messages}` 구조화 JSON으로, 커서는 id 최댓값·빈 이력 `null`
- **M3** — t9 이월 여덟 건 흡수: uncaught 수집기·스킴 검사·맨 `::1` 제거·stderr 사유 분리 + `SPEC-CHANAUTH-001` 문서 개정(12행 판정표)·F-B3·J2 정정

## 오케스트레이터 독립 검증 배치 (2026-08-28, 직접 실행 관측)

| 항목 | 결과 | 증거 |
|------|------|------|
| 품질 게이트 — `npm run build -w channel` | **exit 0** | 직접 재실행 |
| 품질 게이트 — `npm test -w channel` | **exit 0 · Tests 70 passed (70) · ✓ 70행** (하한 70 충족) | `.moai/state/verify/t10-run/lead-verify-verbose.log` |
| AC-013 c2 — server/web diff | **0줄** | `git diff bbd21cd..HEAD -- server/ web/` |
| AC-013 c3 — channel/src 변경 | **정확히 2파일** (channel-server.ts · index.ts) | `git diff --name-only` |
| AC-013 c4 — package.json diff (2곳) | **0줄** | `git diff` |
| 금지 파일 (gateway-client.ts · CHANGELOG.md) | **0건** | `git diff --name-only` |
| AC-012 — 이름 집합 대조 | **before 61 / after 70 / 제거 4(대체 대상과 정확 일치) / 추가 13(신규 9 + 대체 새 이름 4) / 옛 이름 잔여 0** | `names-before.txt`·`names-after.txt` comm 대조 |
| AC-013 c5 — 문서 정정 F-B3·J2 | **착지** (CHANAUTH progress.md:15·:660 정정 행) | grep 직접 관측 |
| AC-013 c1 — spec_base_sha | `bbd21cd80…` 기록 (progress.md §E.2 §0) | 원문 |
| 커버리지 | **stmts 91.11% ≥ 85%** (t9 마감 93.75% 대비 −2.64pp, 사유 §E.3 기록: index.ts 88-108 자식 프로세스 전용 블록 증가 — v8 부모 프로세스 관측 밖) | `coverage.log` |
| 작업 트리 | **무상태** (tracked 변경 0건) | `git status --short` |

## 원문 증거 위치

- 구현 단계 증거 전문: `.moai/state/verify/t10-run/` (baseline·m1/m2/m3 전이·변이 15종·after·coverage)
- §E.2 원문 인용: `.moai/specs/SPEC-CHANINJECT-001/progress.md`
- 오케스트레이터 독립 재실행 로그: `.moai/state/verify/t10-run/lead-verify-verbose.log`

## 특기 사항 (판정 기록 2건 — §E.2 원문)

1. **전이 1 예외**: 전이표가 예고한 4건 실패 → 실측 3건. AC-002는 «중화가 없는 구현»에서도 구조상 실패 불가 — 기준 유지, 전이표 행의 과대 예고로 판정 (§E.2 전이 1 각주)
2. **AC-007 첫 실행 통과**: plan.md §F M3.2 예고대로 (구현이 이미 옳음) — 변이 M-K가 방어 존재를 증명

## 남은 단계

- **sync 단계** (`/moai sync SPEC-CHANINJECT-001`) — manager-docs + sync-auditor, 이어서 t4 재판정 재료 제공
- **푸시 금지 유지** — sync 감사 통과까지
- **리드 조치 항목** (run 소유 아님): F-10 — 큐 카드 t15 본문과 SPEC §5 인계 범위 불일치 (progress.md §E.1 `lead_action_required`)

## Gaps / Residual-risk

- §E.3에 기록된 것과 동일: 모델 지시문 준수는 관측 불가(규범 존재만 검증), 호스트 봉투 처리 미확정 인계, AC-009 (가) 무접속은 간접 관측, 커버리지의 dist 자식 프로세스분 미포함
- 오케스트레이터 독립 검증이 커버리지를 재실행하지 않았다 — `coverage.log` attributable 관측(HEAD 동일 `63dc294`) 소비. 테스트 스위트·범위 경계·이름 대조는 독립 재실행으로 직접 관측함
