# SPEC-BOT-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-BOT-001` |
| 칸반 카드 | `t2` (마일스톤 M2) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 5·7·9장 |
| 워크트리 | `.claude/worktrees/t2` (브랜치 `WT-auth-room-bot`) |
| 선행 SPEC | `SPEC-CORE-001` (카드 `t1`) → `SPEC-AUTH-001` → `SPEC-ROOM-001` |
| 실행 순서 | 카드 `t2` 의 세 SPEC 중 **세 번째(마지막)** |
| 현재 상태 | `draft` — plan 단계 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-BOT-001
tier: M
card: t2
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 5)
split_reason: "원본 초안 33 REQ / 27 AC — Tier L 상한 25/25 초과. 운영자 승인 아래 3분할."
```

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-BOT-001/spec.md` | GEARS 요구사항 9개 (REQ-BOT-001..009), 범위 밖 7개 항목, 제약, HISTORY |
| `.moai/specs/SPEC-BOT-001/plan.md` | 의존 순서, 되돌리기 어려운 결정(토큰 계약 / 사람이 보는 계약), 원본 모순 4건(3번은 미해결 보존), 위험 6건, 마일스톤 M1-M2, 안티패턴 9건 |
| `.moai/specs/SPEC-BOT-001/acceptance.md` | 수용 기준 11개 (AC-BOT-001..011), Given-When-Then 시나리오, 엣지 케이스 8건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-BOT-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-BOT-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

9개 REQ 전부가 하나 이상의 AC 에 매핑됐다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-BOT-001 | 초대 발급, 해시만 저장, `201` + 4필드 | AC-BOT-001, AC-BOT-008, AC-BOT-011 |
| REQ-BOT-002 | 평문 토큰 재노출 금지 | AC-BOT-003 |
| REQ-BOT-003 | 재초대 시 기존 토큰 철회, 활성 토큰 정확히 1 | AC-BOT-004 |
| REQ-BOT-004 | 실패 경로 — 보관/없는 방 `403`, 없는 봇 `404` | AC-BOT-005 |
| REQ-BOT-005 | 실행 명령 안내 4조각 + `config.port` | AC-BOT-002 |
| REQ-BOT-006 | 초대 목록, `online` 불리언 | AC-BOT-006 |
| REQ-BOT-007 | 철회 멱등 | AC-BOT-007 |
| REQ-BOT-008 | 범위 경계 — 여섯 파일, 새 소스 파일 없음 | AC-BOT-009 |
| REQ-BOT-009 | `SCHEMA` 불변 | AC-BOT-009 |
| (전 구간) | RED→GREEN 전이 증거 | AC-BOT-010 |

교차 SPEC 검증 하나: **AC-BOT-008** 은 `SPEC-ROOM-001` 의 "방 보관 시 그 방의 활성 봇 토큰을 한 트랜잭션 안에서 일괄 철회한다"는 요구사항을 검증한다. 그 요구사항의 토큰 철회 절반은 초대가 존재해야만 관측할 수 있고 초대를 만드는 것이 이 SPEC이라, 검증만 여기로 옮겨 왔다. 구현 책임은 `SPEC-ROOM-001` 에 남는다.

### 이 단계에서 하지 않은 것 (Gaps)

- 코드는 한 줄도 작성하지 않았다. `server/src/routes-bots.ts` 의 초대 라우트와 대응 테스트 모두 미생성 — run 단계 소관이다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. `npm test -w server` 가 현재 몇 개 통과하는지 **미검증**이다.
- `SPEC-AUTH-001` 과 `SPEC-ROOM-001` 의 파일을 읽지 않았다. 두 SPEC은 이 세션과 동시에 다른 에이전트가 작성 중이라, 참조는 SPEC-ID 와 내용 서술로만 했다. 따라서 `SPEC-ROOM-001` 의 보관 요구사항 **번호는 미확정**이며 AC-BOT-008 에 내용으로만 기술했다 — 그 SPEC 확정 후 번호를 채워야 한다.
- 원본 `plan-v2.md` Task 6 이후(메시지·멘션·SSE·게이트웨이)는 읽지 않았다. 이 SPEC 범위 밖이다.
- `plan.md` §D 3번(채널 설정 전달 방식: 실행 인자 대 환경변수)은 **의도적으로 미해결**이다. 리드 판정에 따라 Global Constraints 를 따르되 기록을 보존했고, 카드 `t4` 에서 재확인한다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
