# SPEC-AUTH-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-AUTH-001` |
| 칸반 카드 | `t2` (마일스톤 M2) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 3 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·5·9장 |
| 워크트리 | `.claude/worktrees/t2` (브랜치 `WT-auth-room-bot`) |
| 선행 SPEC | `SPEC-CORE-001` (카드 `t1`, `completed`) |
| 후행 SPEC | `SPEC-ROOM-001` → `SPEC-BOT-001` (같은 카드, 순차 진행) |
| 현재 상태 | `draft` — plan 단계 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-AUTH-001
tier: M
card: t2
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 3)
split_from: SPEC-AUTH-001 v0.1.0 (33 REQ / 27 AC)
siblings: [SPEC-ROOM-001, SPEC-BOT-001]
```

### 3분할 기록

버전 0.1.0 의 이 SPEC 은 요구사항 33개·수용 기준 27개를 담고 있었다. `.claude/rules/moai/workflow/spec-workflow.md:146-152` 의 Tier 예산은 Tier M 을 16/16, Tier L 을 25/25 로 묶고, 상한을 넘으면 예산을 늘리지 말고 쪼개라고 지시한다. 33/27 은 Tier L 상한도 넘는다. 그래서 카드 `t2` 를 그대로 둔 채 SPEC 만 셋으로 나눴다.

| SPEC | 범위 | 원본 REQ |
|------|------|----------|
| `SPEC-AUTH-001` (이 문서) | 인증 — 가입·로그인·로그아웃·세션 쿠키·진입 검사 | REQ-AUTH-001..013 |
| `SPEC-ROOM-001` | 방 API + 봇 등록 API | 원본 REQ-AUTH-014..024 |
| `SPEC-BOT-001` | 봇 초대·토큰 발급 API | 원본 REQ-AUTH-025..031 |

원본의 범위 경계 요구사항(REQ-AUTH-032·033)은 각 SPEC 이 자기 범위에 맞게 다시 쓴다. 이 SPEC 에서는 REQ-AUTH-014(네 파일만)·REQ-AUTH-015(`SCHEMA` 불변)가 그 자리다. 요구사항 번호 001..013 은 AUTH 접두사를 유지하므로 **원본 번호 그대로** 두었다.

실행 순서는 의존 순서와 같다: `SPEC-AUTH-001` → `SPEC-ROOM-001` → `SPEC-BOT-001`. 뒤의 두 SPEC 이 이 SPEC 의 `requireAuth` 와 세션 쿠키 계약을 소비한다(`plan.md` §A).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-AUTH-001/spec.md` | GEARS 요구사항 15개 (REQ-AUTH-001..015), 범위 밖 8개 항목(형제 SPEC 3개 포함), 제약, HISTORY 0.2.0 |
| `.moai/specs/SPEC-AUTH-001/plan.md` | 의존 순서와 내보내는 계약(§A) 우선 배치, DB 주입 결정(§B), 사람이 보는 계약(§C), 원본 모순 2건(§D), 위험 5건, 마일스톤 M1, 안티패턴 6건 |
| `.moai/specs/SPEC-AUTH-001/acceptance.md` | 수용 기준 13개 (AC-AUTH-001..013), Given-When-Then 시나리오, 엣지 케이스 6건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-AUTH-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-AUTH-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

15개 REQ 전부가 하나 이상의 AC 에 매핑됐다. 빠진 요구사항은 없다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-AUTH-001 | `auth.ts` 네 개의 내보내기 | AC-AUTH-009 |
| REQ-AUTH-002 | `FastifyRequest.user` 타입 선언 | AC-AUTH-009 |
| REQ-AUTH-003 | `@fastify/cookie` 등록 + `app.db` 데코레이터 | AC-AUTH-005 |
| REQ-AUTH-004 | salt + scrypt 비밀번호 해시 | AC-AUTH-008 |
| REQ-AUTH-005 | 회원가입 성공 201 | AC-AUTH-001 |
| REQ-AUTH-006 | 유효하지 않은 가입 입력 400 | AC-AUTH-002 |
| REQ-AUTH-007 | 중복 사용자 이름 409 | AC-AUTH-003 |
| REQ-AUTH-008 | 로그인 성공 + 세션 쿠키 속성 | AC-AUTH-004 |
| REQ-AUTH-009 | 로그인 실패 401 (본문 구분 없음) | AC-AUTH-006 |
| REQ-AUTH-010 | 로그아웃이 세션 삭제 + 쿠키 제거 | AC-AUTH-010 |
| REQ-AUTH-011 | 진입 검사 통과 시 `req.user` 설정 | AC-AUTH-005 |
| REQ-AUTH-012 | 미인증 요청 401, 핸들러 미실행 | AC-AUTH-007 |
| REQ-AUTH-013 | 인증 예외 경로는 세 개뿐 | AC-AUTH-011 |
| REQ-AUTH-014 | `server/src` 는 네 파일만 | AC-AUTH-012 |
| REQ-AUTH-015 | `db.ts` 의 `SCHEMA` 불변 | AC-AUTH-012 |
| (전 구간) | RED→GREEN 전이 증거 | AC-AUTH-013 |

역방향도 확인했다. AC-AUTH-001..012 는 각각 최소 하나의 REQ 를 검증하고, AC-AUTH-013 만 요구사항이 아닌 개발 절차(테스트 우선)를 검증한다.

### 이 단계에서 하지 않은 것 (Gaps)

- 코드는 한 줄도 작성하지 않았다. `server/src/auth.ts` 와 `server/test/auth.test.ts` 모두 미생성 — run 단계 소관이다.
- `server/src/index.ts` 의 `buildServer` 수정도 하지 않았다. 현재는 `GET /api/health` 하나만 등록한 SPEC-CORE-001 상태 그대로다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. 전부 run 단계에서 처음 실행된다. `npm test -w server` 가 현재 몇 개 통과하는지도 **미검증**이다(기존 3개로 추정하나 이 세션에서 관측하지 않았다).
- 형제 SPEC 두 개(`SPEC-ROOM-001`, `SPEC-BOT-001`)의 파일은 읽지도 만들지도 않았다. 다른 에이전트가 같은 시각에 작성 중이며, 이 문서는 그 SPEC 들을 **ID 로만** 참조한다. 두 SPEC 이 실제로 어떤 REQ 번호를 쓰는지는 이 세션에서 관측하지 않았다.
- 원본 `plan-v2.md` Task 6 이후(메시지·멘션·SSE·게이트웨이)는 읽지 않았다. 카드 범위 밖이다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
