# SPEC-ROOM-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-ROOM-001` |
| 칸반 카드 | `t2` (3분할 중 두 번째) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·5장 |
| 워크트리 | `.claude/worktrees/t2` (브랜치 `WT-auth-room-bot`) |
| 선행 SPEC | `SPEC-CORE-001` (완료), `SPEC-AUTH-001` (같은 카드, 먼저 실행) |
| 후행 SPEC | `SPEC-BOT-001` (같은 카드, 나중 실행) |
| 실행 순서 | `SPEC-AUTH-001` → **`SPEC-ROOM-001`** → `SPEC-BOT-001` |
| 현재 상태 | `draft` — plan 단계 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-ROOM-001
tier: M
card: t2
split_of: "카드 t2 원본 SPEC (요구사항 33 / 수용 기준 27 — Tier L 상한 25/25 초과)"
depends_on: SPEC-AUTH-001
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 4)
```

### 왜 쪼갰는가

카드 `t2` 의 원본 SPEC 은 인증·방·봇 등록·봇 초대를 한 문서에 담아 요구사항 33개, 수용 기준 27개가 됐다. `.claude/rules/moai/workflow/spec-workflow.md` 는 Tier M 을 16/16, Tier L 을 25/25 로 상한을 두고, 넘치면 상한을 늘리지 말고 쪼개라고 지시한다. 카드는 하나로 두고 SPEC 만 셋으로 나눴다.

| SPEC | 범위 | 요구사항 |
|------|------|----------|
| `SPEC-AUTH-001` | 인증 모듈, 가입·로그인·로그아웃, 세션 쿠키, `requireAuth` | 원본 REQ-AUTH-001..013 계열 |
| **`SPEC-ROOM-001`** (이 문서) | 방 API, 봇 등록 API | 원본 REQ-AUTH-014..024 → REQ-ROOM-001..011 로 재번호 + 범위 경계 2개 |
| `SPEC-BOT-001` | 봇 초대, 토큰 발급·철회, `sha256Hex`, 실행 명령 안내 | 원본 REQ-AUTH-025..031 계열 |

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-ROOM-001/spec.md` | GEARS 요구사항 13개 (REQ-ROOM-001..013), 범위 밖 6개 항목, 제약과 선행 SPEC 소비 목록, HISTORY |
| `.moai/specs/SPEC-ROOM-001/plan.md` | 의존 순서와 SPEC 간 계약(§A), 되돌리기 어려운 결정 2건(§B HTTP 계약 / §C 트랜잭션·훅·파일 분할), 원본 모순 6건과 해결(§D), 위험 5건, 마일스톤 M1-M2, 안티패턴 8건 |
| `.moai/specs/SPEC-ROOM-001/acceptance.md` | 수용 기준 10개 (AC-ROOM-001..010), Given-When-Then 시나리오, 엣지 케이스 8건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-ROOM-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-ROOM-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

13개 REQ 전부가 하나 이상의 AC 에 매핑됐다. 매핑되지 않은 REQ 는 없다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-ROOM-001 | `registerRoomRoutes` 계약 + `requireAuth` 부착 | AC-ROOM-001, AC-ROOM-008 |
| REQ-ROOM-002 | `GET /api/rooms` 응답 형태 | AC-ROOM-001 |
| REQ-ROOM-003 | `POST /api/rooms` 생성 | AC-ROOM-001 |
| REQ-ROOM-004 | 빈 방 이름 400 | AC-ROOM-002 |
| REQ-ROOM-005 | 보관 = 한 트랜잭션(방 이동 + 토큰 철회) | AC-ROOM-003 (부분 — 아래 주석) |
| REQ-ROOM-006 | 없는 방·이미 보관된 방 404 | AC-ROOM-004 |
| REQ-ROOM-007 | `onArchive` 훅 1회 호출 | AC-ROOM-005 |
| REQ-ROOM-008 | `registerBotRoutes` 계약 + `requireAuth` 부착 | AC-ROOM-006, AC-ROOM-008 |
| REQ-ROOM-009 | `POST /api/bots` 생성 | AC-ROOM-006 |
| REQ-ROOM-010 | 중복 409 / 공백 400 | AC-ROOM-007 |
| REQ-ROOM-011 | `GET /api/bots` 목록 | AC-ROOM-006 |
| REQ-ROOM-012 | `server/src` 여섯 파일 | AC-ROOM-009 |
| REQ-ROOM-013 | `SCHEMA` 불변 | AC-ROOM-009 |
| (전 구간) | RED→GREEN 전이 증거 | AC-ROOM-010 |

**REQ-ROOM-005 의 부분 검증 주석.** 이 요구사항은 두 가지를 요구하고, 이 SPEC 시점에 실행으로 관측할 수 있는 것은 하나뿐이다.

- 관측 가능 — 방이 `archived` 목록으로 이동하고 `archived_at` 이 채워진다. AC-ROOM-003 의 테스트가 확인한다.
- 구조로만 확인 — 두 UPDATE 가 `db.transaction()` 하나에 묶여 있다. AC-ROOM-003 의 `grep -c` 가 확인한다.
- **이 SPEC 에서 미검증** — 활성 토큰이 실제로 철회되는 동작. 토큰을 만들려면 초대 API 가 필요하고 그것은 `SPEC-BOT-001` 의 산출물이다. 해당 검증은 `SPEC-BOT-001` 의 수용 기준이 맡는다.

### 이 단계에서 하지 않은 것 (Gaps)

- 코드는 한 줄도 작성하지 않았다. `server/src/routes-rooms.ts`, `server/src/routes-bots.ts`, `server/test/rooms-bots.test.ts` 모두 미생성 — run 단계 소관이다.
- `server/src/index.ts` 의 `buildServer` 에 라우트 등록 두 줄을 더하는 작업도 하지 않았다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. 전부 run 단계에서 처음 실행된다. `npm test -w server` 가 현재 몇 개 통과하는지 이 세션에서 관측하지 않았다 — **미검증**이다.
- `SPEC-AUTH-001` 의 산출물이 실제로 존재하는지 확인하지 않았다. 이 세션과 동시에 다른 에이전트가 그 문서를 쓰는 중이라 읽지 않았고, 코드는 아직 어느 쪽도 만들지 않았다. §A 의 소비 목록은 원본 `plan-v2.md` Task 3-4 의 인터페이스 명세에서 도출한 것이지 실물 확인이 아니다 — **미검증**.
- `SPEC-BOT-001` 의 문서도 읽지 않았다. 두 SPEC 사이의 경계(§B 의 404/403 비대칭, §C 의 `sha256Hex` 이관)는 이 문서 쪽에서 선언한 것이며, 상대 문서와 대조하지 않았다 — **미검증**. 두 SPEC 이 다 나온 뒤 plan-audit 에서 대조가 필요하다.
- 원본 `plan-v2.md` Task 5 이후(초대·메시지·SSE·게이트웨이)는 경계 확인에 필요한 만큼만 읽었다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
