# SPEC-CHANPERM-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CHANPERM-001` |
| 칸반 카드 | `t4` (마일스톤 M4) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 14 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B, 7장 |
| 워크트리 | `.claude/worktrees/t4` |
| 선행 SPEC | `SPEC-CHANNEL-001` → `SPEC-CHANCLIENT-001` → `SPEC-CHANWIRE-001` (+ 서버 쪽 `SPEC-PERM-001` 계약 소비) |
| 실행 순서 | 카드 `t4` 의 SPEC 중 **마지막** |
| 현재 상태 | `in-progress` — run 단계 완료 (M1·M2, AC 12/12 통과) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-CHANPERM-001
tier: M
card: t4
depends_on: [SPEC-CHANNEL-001, SPEC-CHANCLIENT-001, SPEC-CHANWIRE-001, SPEC-PERM-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 14)
source_spec: .moai/plan/2026-08-26-minidiscord/spec-v2.md (4-B, 7장)
spec_version: "0.2.1"
req_count: 10
ac_count: 12
tier_budget: "16 REQ / 16 AC"
spec_base_sha: "323df7ff7025226f8ee658e150f71f05f7565211"
plan_audit: .moai/reports/t4/plan-audit.md
plan_audit_verdict: "CONDITIONAL PASS (채널 SPEC 4종 일괄) — 이 SPEC 몫 주요 3건(M2·M3·M4) 반영 완료, 부기(SDK capability 위험)도 plan.md §E·§F M1 에 등록"
cross_spec_dependency: "spec.md §3.1 가정-2(전역 키 충돌로 인한 대기 항목 유실)·가정-3(등록 원본키/조회 소문자키 불일치로 판정 미전송) — SPEC-PERM-001 / 카드 t7 소유. 이 SPEC 에서 고치지도 보상하지도 않는다"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

### REQ→AC 매핑 (run 완료 시점 확정)

| 요구사항 | 매핑된 AC |
|----------|-----------|
| REQ-CHANPERM-001 (승인 요청 릴레이) | AC-CHANPERM-001, 002, 003 |
| REQ-CHANPERM-002 (params 무변형·메서드 리터럴) | AC-CHANPERM-002, 003, 007 |
| REQ-CHANPERM-003 (의존 부재 생존) | AC-CHANPERM-004 |
| REQ-CHANPERM-004 (양방향 배선) | AC-CHANPERM-010 |
| REQ-CHANPERM-005 (판정 알림 계약) | AC-CHANPERM-001, 005 |
| REQ-CHANPERM-006 (behavior 무변형) | AC-CHANPERM-001, 006 |
| REQ-CHANPERM-007 (request_id 무변형) | AC-CHANPERM-007 |
| REQ-CHANPERM-008 (불일치 판정 무상태 처리) | AC-CHANPERM-008 |
| REQ-CHANPERM-009 (미연결 전송 안전) | AC-CHANPERM-009 |
| REQ-CHANPERM-010 (범위 경계) | AC-CHANPERM-011 |

## §E.2 Run-phase Evidence

모든 항목은 (a) 실행한 명령 원문 (b) 출력 원문 (c) 귀속(this run, this tree + HEAD)의 삼중 근거로 남긴다.

### 1. Pre-flight (baseline)

- (a) `npm test -w channel 2>&1 | tail -4`
- (b) `Tests  36 passed (36)` / `Duration  1.16s`
- (c) this run, this tree — HEAD `323df7f` (spec_base_sha). run 착수 전 기존 스위트 전량 녹색 확인.

### 2. M1 단계 0 — spec_base_sha 기록

- (a) `git rev-parse HEAD > .moai/specs/SPEC-CHANPERM-001/.spec-base-sha && cat .moai/specs/SPEC-CHANPERM-001/.spec-base-sha`
- (b) `323df7ff7025226f8ee658e150f71f05f7565211`
- (c) this run, this tree — HEAD `323df7f`. M1 커밋(`2f2c994`)에 함께 반영.

### 3. M1 단계 2b — capability 선언 확인 (SDK assertNotificationCapability)

- (a) `grep -rn "assertNotificationCapability" node_modules/@modelcontextprotocol/sdk/dist/esm/ | grep -v "\.map"` 후 `sed -n 163,198p node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.js`
- (b) `Server.assertNotificationCapability` 의 switch 는 `notifications/message`, `notifications/resources/updated|list_changed`, `notifications/tools/list_changed`, `notifications/prompts/list_changed`, `notifications/elicitation/complete`, `notifications/cancelled`, `notifications/progress` 만 검사한다. `notifications/claude/channel/permission` 은 어느 case 에도 해당하지 않아 **무검사 통과**다. `SPEC-CHANNEL-001` 이 `capabilities.experimental` 에 `'claude/channel'`·`'claude/channel/permission'` 을 이미 선언했다(channel/src/channel-server.ts:43-44, run 착수 시점 확인).
- (c) this run, this tree — HEAD `323df7f`. 결론: SDK capability 위험(plan.md §E)은 발화하지 않음. 블로커 없음.

### 4. M1 RED — AC-CHANPERM-012 전이 1

- (a) `npm test -w channel 2>&1 | grep -E "FAIL|✓|×|passed|failed"`
- (b) 원문(요약):
  ```
  ❯ test/permission-relay.test.ts (9 tests | 8 failed) 477ms
     × relays a request out and carries the matching verdict back, correlated by the forwarded id 60ms
     × only the exact permission_request method reaches sendPermissionRequest 154ms
     × forwards params verbatim, adding and dropping nothing 53ms
     × emits exactly one permission notification with exactly two params 1ms
     × delivers deny as deny 1ms
     × passes request_id through untouched in both directions 52ms
     × an unknown or already-resolved verdict resolves nothing else and does not crash 52ms
     × a verdict before transport connect throws nothing and leaves no unhandled rejection 1ms
   Test Files  1 failed | 3 passed (4)
        Tests  8 failed | 37 passed (45)
  ```
  실패 사유 원문(대표 2건):
  ```
  TypeError: handle.handlePermissionVerdict is not a function
   ❯ test/permission-relay.test.ts:172:12
  TypeError: Cannot read properties of undefined (reading 'request_id')
   ❯ test/permission-relay.test.ts:159:24
  ```
- (c) this run, this tree — 워킹트리(구현 전, base `323df7f`). **모듈 부재 아님**: `Cannot find module` 없이 `channel-server.ts` 가 정상 임포트되어 메서드 부재로 실패 — 전이 1 의 요구(단언·타입 실패) 충족. `survives a wiring without sendPermissionRequest`(AC-004) 는 이 시점에도 통과: 의존 부재 경로는 현재도 조용히 지나가고 `reply` 도구가 동작하는 타당한 사전 상태다(부정 기준의 양성 짝이 다른 8건의 RED 로 커버된다).

### 5. M1 GREEN — AC-CHANPERM-012 전이 2

- (a) `npm test -w channel 2>&1 | tail -8` 및 `npm test -w channel -- --reporter=verbose 2>&1 | grep "permission-relay"`
- (b)
  ```
   Test Files  4 passed (4)
        Tests  45 passed (45)
  ```
  verbose 9줄 전부 `✓`(이름별 목록은 §E.2-11 매트릭스 참조).
- (c) this run, this tree — 워킹트리(M1 구현 후, 커밋 `2f2c994` 직전 상태). typecheck: `npm run typecheck -w channel` → `exit=0`.

### 6. M1 커밋

- (a) `git add channel/test/permission-relay.test.ts channel/src/channel-server.ts .moai/specs/SPEC-CHANPERM-001/.spec-base-sha .moai/specs/SPEC-CHANPERM-001/spec.md .moai/specs/SPEC-CHANPERM-001/progress.md && git commit …`
- (b) `[WT-channel-plugin 2f2c994] feat(SPEC-CHANPERM-001): 채널 서버 승인 릴레이 양방향 진입점 — AC 9/12 통과 (card t4)` — 5 files changed, 250 insertions(+), 3 deletions(-). frontmatter `draft → in-progress` 전환 포함.
- (c) this run, this tree — HEAD `2f2c994`.

### 7. M2 RED — AC-CHANPERM-012 전이 3

- (a) `npm test -w channel 2>&1 | grep -B 3 -A 14 "wire relays"`
- (b) 원문:
  ```
  ❯ test/permission-relay.test.ts (10 tests | 1 failed) 4013ms
     × wire relays a request out to the gateway and a verdict back to Claude Code 3081ms

  FAIL  test/permission-relay.test.ts > permission relay > wire relays a request out to the gateway and a verdict back to Claude Code
  Error: waitFor timeout: 요청 프레임 도착
   ❯ waitFor test/permission-relay.test.ts:61:37
  ```
- (c) this run, this tree — 워킹트리(배선 전, base `2f2c994`). 실패 사유가 `permission_request` 프레임 부재(배선 단언 실패)로 정확히 일치.

### 8. M2 GREEN — AC-CHANPERM-012 전이 4

- (a) `npm test -w channel 2>&1 | tail -6` 및 `npm run typecheck -w channel`
- (b)
  ```
   Test Files  4 passed (4)
        Tests  46 passed (46)
  ```
  typecheck → `exit=0`.
- (c) this run, this tree — 워킹트리(M2 배선 후, 커밋 `72d7b1f` 직전 상태).

### 9. AC-CHANPERM-011 — 범위 경계 4관측

- (a) `SHA=$(cat .moai/specs/SPEC-CHANPERM-001/.spec-base-sha)`; `git rev-parse --verify "$SHA^{commit}"`; `git diff --stat "$SHA" -- server`; `git diff --name-only "$SHA" -- channel/src`
- (b) 관측 1: `323df7ff7025226f8ee658e150f71f05f7565211` 출력, 종료 코드 `0`. 관측 2: `git diff --stat … -- server` → **빈 출력**(종료 코드 0). 관측 3: `git diff --name-only … -- channel/src` → 정확히 두 줄 `channel/src/channel-server.ts` / `channel/src/index.ts`(정렬 일치). 관측 4: `gateway-client.ts` 는 목록에 없음.
- (c) this run, this tree — HEAD `72d7b1f` 기준. 기준 SHA 확인을 먼저 실행했다(빈 출력만 보고 통과로 적지 않기 위함).

### 10. 커버리지 (품질 게이트 ≥85%)

- (a) `npm test -w channel -- --coverage`
- (b) 원문(요약):
  ```
  -------------------|---------|----------|---------|---------|
  File               | % Stmts | % Branch | % Funcs | % Lines |
  -------------------|---------|----------|---------|---------|
  All files          |   97.46 |    93.75 |    90.9 |     100 |
   gateway-client.ts |   96.42 |    92.3  |   85.71 |     100 | 41,67
  ```
  `coverage-final.json` 직접 집계로 text 테이블에서 생략된 `channel-server.ts`(100% 파일은 v8 text 리포터가 행을 숨긴다) 확인:
  `src/channel-server.ts stmts 23/23 (100.0%) branch 6/6 (100.0%) funcs 8/8 (100.0%)`
- (c) this run, this tree — HEAD `72d7b1f`. 이 SPEC 이 손대 두 파일 중 `channel-server.ts` 는 100%, `src/index.ts` 는 기존 vitest.config.ts 의 측정 제외 대상(진입점). 미커버 2문(41·67줄)은 `gateway-client.ts`(SPEC-CHANCLIENT-001 소유, 이 SPEC 미변경)의 error 핸들러·retry 경로다.

### 11. 최종 AC 매트릭스 (검증 명령 = `npm test -w channel -- --reporter=verbose`, HEAD `72d7b1f`, this run, this tree)

| AC | 판정 | 검증 | verbose `✓` 테스트 이름 (`test/permission-relay.test.ts > permission relay >` …) |
|----|------|------|--------------------------------------------------------------------------------|
| AC-CHANPERM-001 | PASS | 테스트 | `relays a request out and carries the matching verdict back, correlated by the forwarded id` |
| AC-CHANPERM-002 | PASS | 테스트 | `only the exact permission_request method reaches sendPermissionRequest` |
| AC-CHANPERM-003 | PASS | 테스트 | `forwards params verbatim, adding and dropping nothing` |
| AC-CHANPERM-004 | PASS | 테스트 | `survives a wiring without sendPermissionRequest` |
| AC-CHANPERM-005 | PASS | 테스트 | `emits exactly one permission notification with exactly two params` |
| AC-CHANPERM-006 | PASS | 테스트 | `delivers deny as deny` |
| AC-CHANPERM-007 | PASS | 테스트 | `passes request_id through untouched in both directions` |
| AC-CHANPERM-008 | PASS | 테스트 | `an unknown or already-resolved verdict resolves nothing else and does not crash` |
| AC-CHANPERM-009 | PASS | 테스트 | `a verdict before transport connect throws nothing and leaves no unhandled rejection` |
| AC-CHANPERM-010 | PASS | 테스트 | `wire relays a request out to the gateway and a verdict back to Claude Code` |
| AC-CHANPERM-011 | PASS | git 4관측 | §E.2-9 (rev-parse exit 0 · server diff 빈 · channel/src 두 줄 · gateway-client.ts 부재) |
| AC-CHANPERM-012 | PASS | 전이 기록 | §E.2-4(RED)→§E.2-5(GREEN)→§E.2-7(RED)→§E.2-8(GREEN), 네 전이 순서대로 관측 |

verbose 확인 명령의 출력 근거: `grep -c "✓ test/permission-relay"` → `10`.

### 12. M2 커밋 및 최종 상태

- (a) `git add channel/src/index.ts channel/test/permission-relay.test.ts && git commit …`; `git log --oneline -3`
- (b) `[WT-channel-plugin 72d7b1f] feat(SPEC-CHANPERM-001): wire 승인 릴레이 양방향 배선 — AC 12/12 통과 (card t4)` — 2 files changed, 57 insertions(+). push 시도 없음(카드 브랜치는 미푸시 워크트리 유일 사본).
- (c) this run, this tree — HEAD `72d7b1f`. 최종 재확인: `npm test -w channel` → `Tests 46 passed (46)`, `npm run typecheck -w channel` → `exit 0`.

### 13. Gaps (명시적 미검증)

- **게이트웨이 끊김 중 도착한 승인 요청** — 미검증·수용. `GatewayClient.send` 가 `false` 를 내면 요청은 사라진다(버퍼링 없음, plan.md §B·§E). 재전송은 spec.md §5 범위 밖.
- **params 필드 누락 시 알림 조용히 사라짐** — 미검증·수용. 계약이 네 필드를 필수로 정했고 스키마 완화는 금지다(plan.md §D 5번). 관측되면 계약 차원 결정 필요.
- **서버 쪽 `request_id` 결함 2건(가정-2 전역 키 충돌·가정-3 등록/조회 대소문자 불일치)** — 이 SPEC 에서 고치지도 보상하지도 않았다. `SPEC-PERM-001`/카드 `t7` 소유. 채널은 받은 문자열을 양방향 그대로 전달한다(AC-CHANPERM-007).
- **무상태 게이트** — 테스트 실행 중 채널이 만든 새 파일은 없다. 다만 커버리지 측정의 `channel/coverage/`(v8 생성 산출물, untracked)는 커밋하지 않았다(오케스트레이터가 이후 gitignore 예정).

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-CHANPERM-001
tier: M
card: t4
cycle_type: tdd
milestones: "M1=2f2c994, M2=72d7b1f"
ac_total: 12
ac_passed: 12
coverage: "All files 97.46% stmts / 100% lines (channel-server.ts 100% — 이 SPEC 변경 파일; src/index.ts 기존 제외)"
typecheck: "npm run typecheck -w channel → exit 0"
run_commit_sha: "72d7b1f"
gaps: "게이트웨이 끊김 중 요청(버퍼링 없음)·params 필드 누락 시 알림 소실 — 계약상 수용; 서버 쪽 request_id 결함 2건(가정-2·3)은 카드 t7 소유, 이 SPEC 미보상"
```

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-fail-open
sync_evaluated_at: 2026-08-27
spec_id: SPEC-CHANPERM-001
card: t4
sync_head_sha: 651b033
audit_verdict: FAIL
audit_score: 62.1        # 가중 조화평균 (Functionality 82 / Security 38 FAIL / Craft 72 / Consistency 80)
audit_report: .moai/reports/t4/sync-audit.md
tests: "4 files / 50 tests passed"
coverage: "stmts 93.39% (99/106) · branch 84.31% (43/51) · funcs 93.75% (30/32) · lines 95.5% (85/89)"
build_exit: 0
typecheck_exit: 0
remediated_here: []      # 이 SPEC 에 귀속된 차단 발견은 이 카드에서 닫지 않았다
open_findings:
  - "F-01 (Critical) — 채널이 자기가 내보낸 적 없는 request_id 의 판정도 그대로 중계한다. 이는 REQ-CHANPERM-008 이 요구하고 AC-CHANPERM-008 이 정상 동작으로 못 박은 계약이므로, 코드만 고치면 AC 가 깨진다 — SPEC 바디 개정이 선행돼야 하는 항목"
  - "F-14 (High, out-of-diff) — 서버에 방 멤버십 개념이 없어 계정이 있는 누구나 임의 방의 도구 승인을 대신 누를 수 있음 (server/src/routes-messages.ts:29,62 + server/src/permissions.ts:43-58). t7 에 인계된 request_id 결함 2건과는 다른 항목(인가)이라 별도 카드 필요"
status_transition: none   # in-progress 유지
```

- 검증 명령과 관측 원문 (본 sync 단계에서 manager-docs 가 이 트리·이 HEAD 에서 직접 실행):
  - `npm test -w channel -- --coverage` → `Test Files 4 passed (4)` / `Tests 50 passed (50)`, `Statements 93.39% (99/106)` · `Branches 84.31% (43/51)` · `Functions 93.75% (30/32)` · `Lines 95.5% (85/89)`
  - `npm run build -w channel` → 종료 코드 0
  - `npm run typecheck -w channel` → 종료 코드 0
  - `channel/dist/index.js` MCP `initialize` 프로브 → `serverInfo.name = minidiscord-channel`, capabilities `experimental["claude/channel"]`·`experimental["claude/channel/permission"]` — **오케스트레이터 관측값**(manager-docs 는 재실행하지 않음)
- 증거 경로: `.moai/state/verify/t4-sync/`, `.moai/state/verify/t4-sync-fix/`, `.moai/state/verify/t4-sync-audit/`, 감사 전문 `.moai/reports/t4/sync-audit.md`
- 상태 전이 없음: 감사 판정이 FAIL 이고 Critical 원인(F-01)이 열려 있어 `status: in-progress` 를 유지한다. `implemented`/`completed` 로 올리면 기록이 사실과 달라진다.
