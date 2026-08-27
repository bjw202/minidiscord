# SPEC-CHANNEL-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CHANNEL-001` |
| 칸반 카드 | `t4` (마일스톤 M4) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 11 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B (채널 플러그인) |
| 워크트리 | `.claude/worktrees/t4` (브랜치 `WT-channel-plugin`) |
| 현재 상태 | `draft` — plan 단계 완료 (§E.1 audit-ready) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-CHANNEL-001
tier: M
card: t4
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 11)
spec_base_head: cf9eebb
```

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-CHANNEL-001/spec.md` | GEARS 요구사항 15개 (REQ-CHANNEL-001..015), 범위 밖 6개 항목, 제약, HISTORY |
| `.moai/specs/SPEC-CHANNEL-001/plan.md` | 되돌리기 어려운 결정(계약 리터럴 / instructions 본문) 우선 배치, 원본 모순 6건, 위험 12건, 마일스톤 M1-M2, 안티패턴 15건 |
| `.moai/specs/SPEC-CHANNEL-001/acceptance.md` | 수용 기준 16개 (AC-CHANNEL-001..016), 공통 테스트 하네스, stdio 프로브, Given-When-Then, 엣지 케이스, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-CHANNEL-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-CHANNEL-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

| 요구사항 | 덮는 AC |
|----------|---------|
| REQ-CHANNEL-001 (패키지 계약) | AC-CHANNEL-001, 004 (`dist/index.js` 실존) |
| REQ-CHANNEL-002 (무상태) | AC-CHANNEL-002 |
| REQ-CHANNEL-003 (팩토리·핸들) | AC-CHANNEL-003, 004 (`serverInfo`) |
| REQ-CHANNEL-004 (capabilities) | AC-CHANNEL-004 |
| REQ-CHANNEL-005 (instructions) | AC-CHANNEL-005 |
| REQ-CHANNEL-006 (도구 둘) | AC-CHANNEL-006 |
| REQ-CHANNEL-007 (`reply` 스키마) | AC-CHANNEL-007 |
| REQ-CHANNEL-008 (`reply` 동작) | AC-CHANNEL-008 |
| REQ-CHANNEL-009 (`fetch_history` 스키마) | AC-CHANNEL-009 |
| REQ-CHANNEL-010 (`#번호` 커서 안내) | AC-CHANNEL-010 |
| REQ-CHANNEL-011 (`fetch_history` 동작) | AC-CHANNEL-011 |
| REQ-CHANNEL-012 (모르는 도구) | AC-CHANNEL-012 |
| REQ-CHANNEL-013 (채널 알림) | AC-CHANNEL-013, 014 |
| REQ-CHANNEL-014 (stdio 진입점) | AC-CHANNEL-004, 016 (전이 3-4) |
| REQ-CHANNEL-015 (범위 경계) | AC-CHANNEL-015 |

### 검증 강도 자기 점검 (스텁 통과 여부)

각 AC 에 대해 "어떤 구현 결함이 이 기준을 실패시키는가" 를 물었고, 답이 없던 기준은 다시 썼다. 원본에서 그대로 옮겼다면 무의미했을 자리는 넷이다.

| 자리 | 원본을 그대로 썼다면 | 이 문서가 관측하는 것 |
|------|---------------------|---------------------|
| capabilities | `tools/list` 로 대신 확인 → `experimental['claude/channel']` 삭제해도 통과 | `initialize` 응답 JSON 직접 검사 (AC-004) |
| `fetch_history` 반환 | 의존성이 상수 반환 → 하드코딩 구현도 통과 | 인자에서 파생된 문자열 (AC-011) |
| `delivery` | 알림 도착만 확인 → 항상 `'to'` 를 싣는 구현도 통과 | `'cc'` 갈래 별도 관측 (AC-014) |
| 진입점 | 파일 존재·빌드 성공 → 아무것도 재지 않음 | `node dist/index.js` 가 실제로 MCP 응답 (AC-004) |

반대 방향(정상 구현을 거짓 실패시키는 기준)도 셋 찾아 교정했다 — `setNotificationHandler` 의 `as any` 객체 리터럴, 알림 도착 미대기, `tsconfig` 복사로 인한 `bin` 경로 불일치. 경위는 `plan.md` §D 2·3번.

### 이 단계에서 하지 않은 것 (Gaps)

- 코드는 한 줄도 작성하지 않았다. `channel/` 디렉터리 자체가 아직 없다 — run 단계 소관이다.
- 의존성을 설치하지 않았으므로 `@modelcontextprotocol/sdk` 의 실제 API 표면은 **미검증**이다. 특히 두 가지가 run 단계 첫 확인 대상이다 — (a) `Client.getServerVersion()` 접근자의 존재 여부(`plan.md` §D 1번), (b) `Server.notification()` 이 미선언 capability 의 알림을 거부하는지(§E 위험표).
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. 전부 run 단계에서 처음 실행된다.
- `.spec-base-sha` 는 아직 만들지 않았다. `plan.md` §F M1 단계 0 에서 기록한다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
