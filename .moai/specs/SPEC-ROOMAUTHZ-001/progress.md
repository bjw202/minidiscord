# SPEC-ROOMAUTHZ-001 진행 기록

칸반 카드 `t11` / 워크트리 `.claude/worktrees/t11` / 브랜치 `WT-room-authz`

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_round: 3            # 2차 감사 FAIL 0.84 (.moai/reports/t11/plan-audit-2.md) 반영본 — 1차는 FAIL 0.75
plan_complete_at: 2026-08-29
tier: M
requirements: 17         # REQ-ROOMAUTHZ-001..017 — Tier M 상한 16 초과 (리드 승인: spec.md §5 머리말)
acceptance_criteria: 18  # AC-ROOMAUTHZ-001..018 — Tier M 상한 16 초과 (같은 승인)
tier_ceiling_exceeded: true
tier_ceiling_waiver: lead-approved   # 2026-08-29 리드 결정 — tier M 유지, 기준선 0.80 (2차 감사 N-06)
artifacts: [spec.md, plan.md, acceptance.md, progress.md]
open_questions: 0        # 설계 결정 3건은 운영자가 확정 (spec.md §3), D2 는 v2 로 확대 확정
```

**플랜 단계에서 확정된 것**

- 발단: `.moai/reports/t4/sync-audit.md` §F-14 (High, out-of-diff). 코드베이스에 방 멤버십 개념이 없어 계정 하나로 남의 방 도구 승인을 대신 누를 수 있다.
- 운영자 결정 3건(획득 방식 · 게이트 범위 · 기존 데이터)은 `spec.md` §3 에 기각안과 함께 부호화했다. 재검토 대상이 아니다.
- **D2 는 v2 로 확대됐다** (2026-08-29, 1차 감사 F-01 을 읽은 뒤 운영자 확정). 봇 초대 라우트 셋(`POST`·`GET`·`DELETE /api/rooms/:id/invites*`)이 이 카드 안에서 게이트 범위에 들어온다. 원인은 그 라우트가 평문 봇 토큰을 발급하고 그 토큰이 게이트웨이 `history_request` 로 방 대화 전체를 넘겨받는다는 관측이다 — 읽기를 막으면서 같은 크기의 문을 남기는 셈이었다. v1 원문은 지우지 않고 `spec.md` §3 에 남겼다.
- 그 확대로 REQ-ROOMAUTHZ-017 과 AC-ROOMAUTHZ-018 이, 감사 F-06(REQ-007 미커버) 대응으로 AC-ROOMAUTHZ-017 이 생겼다. **Tier M 상한(16/16)을 넘겼고, 압축 대신 초과를 명시했다** — 요구사항을 합쳐 상한을 맞추면 측정되지 않는 절반이 생긴다.
- **상한 초과는 리드가 승인했다** (2026-08-29, 2차 감사 N-06). 티어 상향도 SPEC 분할도 아니라 «이 카드에 한한 명시적 초과 승인»이며, 기준선은 `0.80` 을 유지한다. 결정 원문은 `spec.md` §5 머리말에 있다. 더 이상 리드 판정 대기 항목이 아니다.
- **2차 감사(FAIL 0.84)가 잡은 새 결함 일곱(N-01..N-07)을 3차에 반영했다.** 가장 큰 것은 N-01 — D2 v2 확대가 이 SPEC 이 1차에 써 넣은 형제 주석 두 자리를 정반대의 거짓으로 만들었는데 §6 표는 그것이 정정됐다고 적고 있었다. 3차에 2차 개정 주석을 덧붙였고, 같은 기준으로 형제 주석 전건을 다시 훑어 하나(N-04)를 더 찾았다. 완료 정의에 **§6 표 ↔ 대상 파일 양방향 대조**를 더해, 「주석이 존재한다」가 아니라 「주석이 참이다」를 판정하도록 고쳤다.
- 형제 문서 25개 자리의 진술이 거짓이 된다 (`spec.md` §6 표 — 1차 감사가 잡은 누락 둘과 선택 등급 셋을 더해 19 → 25). 전제가 무효화되는 수용 기준 둘(AC-MSG-012 · AC-PERM-009)은 이름을 불러 기록했다.
- 기존 테스트 34개가 깨질 것으로 열거했다 (`plan.md` §D). **이 숫자는 D2 v2 이후 처음부터 다시 세었고 결과가 같았다** — 초대 라우트를 부르는 기존 테스트 11건은 전부 방을 `POST /api/rooms` 로 만들고 그 생성자가 호출자라 게이트를 통과한다(`plan.md` §D.0.1). run 단계는 이 목록 밖의 실패만 결함으로 본다.

**플랜 단계에서 관측한 것 (실행)**

- `npm test` → 서버 104개 · 채널 70개 전건 통과. 워크트리에 의존성이 설치돼 실행이 가능해졌다.
- `npx vitest run --reporter=verbose` → `✓` 줄 104 줄. 파일별 테스트 이름 목록을 실제로 받아 §D 의 분모로 썼다.
- 증거 파일: `.moai/state/verify/t11-plan2/npm-test-baseline.txt`, `.moai/state/verify/t11-plan2/server-verbose.txt`

**플랜 단계에서 관측하지 못한 것 (미검증)**

- **34개 목록의 「깨진다」는 소스 판독이다.** 게이트가 아직 구현되지 않아 실행으로 확인할 수 없다. 위 실행이 확정한 것은 분모(현재 초록 104개)뿐이며 분자는 아니다. M4 단계 1이 실제 실패 목록을 받아 대조한다.
- 백필·`ALTER TABLE` 동작은 SQLite 문서와 현재 `db.ts` 구조를 근거로 설계했으며, 실행해 보지 않았다.
- 새로 쓴 수용 기준(AC-004 트랜잭션 트리거, AC-008 업로드 디렉터리, AC-010 `buildServer` 판, AC-017 게이트 훑기, AC-018 초대 라우트)의 **코드가 실제로 컴파일·실행되는지 확인하지 않았다.** 구현 대상이 아직 없으므로 M1~M3 의 RED 단계가 첫 확인이다.
- REQ-ROOMAUTHZ-003 의 백필 트랜잭션은 어느 기준도 재지 않는다 — `spec.md` §9 에 미검증으로 적었다.

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
