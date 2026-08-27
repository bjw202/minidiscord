# SPEC-PERM-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-PERM-001` |
| 칸반 카드 | `t3` (마일스톤 M3) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 10 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 7·9장 |
| 워크트리 | `.claude/worktrees/t3` |
| 선행 SPEC | `SPEC-CORE-001` → `SPEC-AUTH-001` → `SPEC-SSE-001` → `SPEC-GATEWAY-001` → (메시지 라우트) |
| 실행 순서 | 카드 `t3` 의 SPEC 중 **마지막** |
| 현재 상태 | `in-progress` — run 단계 완료 (§E.2 증거·§E.3 audit-ready) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-PERM-001
tier: M
card: t3
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-SSE-001, SPEC-GATEWAY-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 10)
source_spec: .moai/plan/2026-08-26-minidiscord/spec-v2.md (7장, 9장)
spec_version: "0.3.0"
plan_audit: .moai/reports/t3-plan-audit-b.md
plan_audit_verdict: "CONDITIONAL PASS — 필수 수정 4건(MF-1·2·3·5) 반영 완료, NH-3·NH-4 함께 반영"
plan_reaudit: .moai/reports/t3-plan-reaudit.md
plan_reaudit_verdict: "MF-1·2·3·5 RESOLVED 확인, 차단급 회귀 R-1(set-cookie) 반영 완료"
req_count: 14
ac_count: 14
tier_budget: "16 REQ / 16 AC"
spec_base_sha: "398b584fb763cce25c5f92802993c425c994484e"
open_questions: 4   # spec.md §5 첫 항목 — 지시서의 네 기능이 원본에 없음, 리드 판정 대기
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-PERM-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 SPEC 에서는 그 기준점 위에 검사 **두 개**가 올라간다 — `db.ts` 불변(REQ-PERM-014)과 "손댄 소스 파일은 셋"(REQ-PERM-013).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-PERM-001/spec.md` | GEARS 요구사항 14개 (REQ-PERM-001..014), 범위 밖 7개 절, 제약, HISTORY 0.3.0 |
| `.moai/specs/SPEC-PERM-001/plan.md` | 의존 순서, 되돌리기 어려운 결정(대기 레지스트리 수명 / 사람이 보는 계약), 원본 모순 6건(1·6번 차단급·3번 의도적 이탈·4번 미해결), 위험 12건, 마일스톤 M1-M2, 안티패턴 22건 |
| `.moai/specs/SPEC-PERM-001/acceptance.md` | 수용 기준 14개 (AC-PERM-001..014), 공통 테스트 하네스, Given-When-Then 시나리오, 엣지 케이스 7건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-PERM-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-PERM-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

14개 REQ 전부가 하나 이상의 AC 에 매핑됐다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-PERM-001 | 요청 도착 — 대기 등록 + system 메시지 + SSE 발행 | AC-PERM-001, AC-PERM-003 |
| REQ-PERM-002 | system 메시지 네 조각과 `yes/no <ID>` 안내 | AC-PERM-002 |
| REQ-PERM-003 | 대기 레지스트리는 메모리, 재시작 시 유실 수용 | AC-PERM-010 (재시작 후 답은 "모르는 ID" 와 같은 경로) |
| REQ-PERM-004 | `setPermissionHandler` 배선 + `permissions` 데코레이터 | AC-PERM-006 (`consumed_by` 가 배선의 관측 증거) |
| REQ-PERM-005 | 가로채기 위치·정규식·소비 시 미저장 | AC-PERM-006, AC-PERM-012 |
| REQ-PERM-006 | 승인 판정 전송 | AC-PERM-004 |
| REQ-PERM-007 | 거절 판정 전송 (`behavior === 'deny'`) | AC-PERM-005 |
| REQ-PERM-008 | 1회용 — 두 번째 답은 흘려보냄, 두 번째 판정 없음 | AC-PERM-007 |
| REQ-PERM-009 | 결과 system 메시지, 전달 실패 시 다른 문구 | AC-PERM-011 |
| REQ-PERM-010 | 형식 불일치·모르는 ID 는 흘려보냄 | AC-PERM-010 |
| REQ-PERM-011 | 다른 방의 답은 소비도 전송도 안 됨 | AC-PERM-008 |
| REQ-PERM-012 | 미인증 요청은 판정 불가, 대기 항목 보존 | AC-PERM-009 |
| REQ-PERM-013 | 범위 경계 — 전용 엔드포인트·새 이벤트 없음, 손댄 파일 셋 | AC-PERM-013, AC-PERM-003(`event: message` 단언) |
| REQ-PERM-014 | `SCHEMA` 불변 | AC-PERM-013 |
| (전 구간) | RED→GREEN 전이 | AC-PERM-014 |

### 검증 강도 자기 점검 (스텁 통과 여부)

작성 지시서가 지목한 결함 부류 — "구현 본문이 비어 있어도 통과하는 기준" — 를 개별이 아니라 **부류로** 훑었다. 14개 기준 각각에 대해 "이 기준을 통과시키는 가장 게으른 구현은 무엇인가"를 적고, 그 구현이 다른 기준에 걸리는지 확인했다.

| 게으른 구현 | 걸리는 기준 |
|------------|------------|
| `onGatewayRequest` 가 아무것도 안 함 | AC-PERM-001 (system 행 없음), AC-PERM-003 (SSE 무응답 → 타임아웃) |
| system 본문에 자리표시자 `yes <ID>` 를 그대로 둠 | AC-PERM-002 (`'yes abcde'` 단언) |
| `tryHandleUserReply` 가 늘 `true` | AC-PERM-010 (일반 텍스트가 저장되지 않음) |
| `tryHandleUserReply` 가 늘 `false` | AC-PERM-006 (`consumed_by` 없음) |
| 판정어를 읽지 않고 늘 `allow` 전송 | AC-PERM-005 (`behavior === 'deny'`) |
| `sendToBot` 호출 누락 | AC-PERM-004 (수신 `null`) |
| 방 대조 누락 | AC-PERM-008 (다른 방 답이 봇에 도달) |
| 대기 항목 미제거 | AC-PERM-007 (두 번째 판정이 도달) |
| 가로채기를 `requireAuth` 앞에 둠 | AC-PERM-009 (미인증 판정이 봇에 도달) |
| `sendToBot` 반환값 무시 | AC-PERM-011 (두 결과 문구가 같음) |
| `startsWith('yes ')` 로 정규식 대체 | AC-PERM-012 (`Y ABCDE` 미소비, `yes abcdl` 소비) |
| 새 소스 파일을 미리 만들거나 스키마 변경 | AC-PERM-013 (변경 파일 목록·`db.ts` diff) |
| 가로채기가 라우트에 아예 없음 (v0.2.0 추가) | AC-PERM-010 (흘려보낸 뒤 진짜 판정이 성립하지 않음), AC-PERM-006 |
| `startsWith('y')` 로 승인·거절 축약형을 뭉뚱그림 (v0.2.0 추가) | AC-PERM-012 (`N FGHIJ` 가 `deny` 로 도달하는지) |
| 전달 실패 문구가 비어 있거나 실패인지 알 수 없음 (v0.2.0 추가) | AC-PERM-011 (`toContain('전달하지 못했습니다')` 양성 단언) |

"파일이 존재한다", "함수가 export 돼 있다", "테스트 스위트가 통과한다(이름 없이)" 형태의 기준은 **하나도 쓰지 않았다.** 이름 붙은 기존 테스트를 인용하는 기준은 AC-PERM-001 하나뿐이며, `--reporter=verbose` 의 `✓` 줄을 관측 대상으로 삼아 그 테스트를 아예 쓰지 않은 실행과 구분된다. AC-PERM-010 도 v0.1.0 에서는 같은 형태였으나, 인용하던 원본 테스트가 `ok: true` 하나만 단언해 검증력이 없다는 지적(MF-2)에 따라 실행 단언으로 바꿨다.

### 이 단계에서 하지 않은 것 (Gaps)

- 이 SPEC 의 산출물 코드는 한 줄도 작성하지 않았다. `server/src/permissions.ts` 와 `server/test/permissions.test.ts` 모두 미생성 — run 단계 소관이다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. `npm test -w server` 가 현재 몇 개 통과하는지 **미검증**이다.
- 선행 SPEC(`SPEC-SSE-001`, `SPEC-GATEWAY-001`, 메시지 라우트 SPEC)의 산출물 파일을 읽지 않았다. 그 SPEC 들이 이 세션과 **동시에** 작성되고 있어, 계약은 원본 `plan-v2.md` Task 8·9 의 코드 본문에서 직접 인용했다. 선행 SPEC 이 원본에서 벗어난 결정을 했다면 이 SPEC 의 §A 의존 표를 다시 맞춰야 한다 — run 단계 진입 전 확인 대상이다.
- `spec.md` §5 첫 절의 네 항목(전용 승인/거절 엔드포인트, 방 멤버십, 타임아웃, 연결 해제 정리)은 **리드 판정 대기**다. 원본 두 문서 어디에도 근거가 없어 만들지 않았고, 그 사실을 리드에 보고했다.
- `plan.md` §D 3번(`sendToBot` 반환값 활용)은 원본으로부터의 **의도적 이탈**이다. 이탈 범위는 결과 문구 하나이며 채널 계약은 건드리지 않는다. 리드가 되돌리기로 하면 REQ-PERM-009 두 번째 문단과 AC-PERM-011 을 함께 지우면 된다.
- 엣지 케이스 표의 두 줄("답과 함께 파일이 첨부됨", "보관된 방에 온 답")은 의도적으로 **미검증**으로 남겼다. 근거는 `plan.md` §E 에 있다.

---

## §E.2 Run-phase Evidence

실행 환경: 워크트리 `.claude/worktrees/t3`, 브랜치 `WT-msg-gateway-relay`. 기준점(`spec_base_sha`) = `398b584fb763cce25c5f92802993c425c994484e` (M1 단계 0 에 `.spec-base-sha` 로 기록).

**시작 baseline (398b584, 직접 실행 확인):**

```
$ npm test -w server -- --run
 Test Files  9 passed (9)
      Tests  83 passed (83)
```

테스트 하네스와 시나리오 본문은 `acceptance.md` 를 그대로 옮겼다 — `setCookieOf` 헬퍼(R-1 교정), `cleanups` 일괄 정리(MF-5), `reply.hijack()` 선행(MF-3), `app.decorate('permissions', broker)`(plan.md §D 1번), `readFrame` 두 번 호출 순서(MF-1)까지 글자 단위로 지켰다. 구현은 `server/src/permissions.ts` (신규)·`server/src/routes-messages.ts` (가로채기 한 갈래)·`server/src/index.ts` (배선 세 줄) 정확히 세 파일이다.

### RED → GREEN 전이 증거 (AC-PERM-014)

**전이 1 — M1 RED (permissions.test.ts 하네스+M1 3건 작성 직후, 커밋 전):**

```
$ npm test -w server
 ❯ test/permissions.test.ts (0 test)
⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯
 FAIL  test/permissions.test.ts [ test/permissions.test.ts ]
Error: Cannot find module '../src/permissions.js' imported from /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/server/test/permissions.test.ts
 ❯ test/permissions.test.ts:15:1
     13| import { createSseHub } from '../src/sse.js'
     14| import { createGateway } from '../src/gateway.js'
     15| import { createPermissionBroker } from '../src/permissions.js'
       | ^
 Test Files  1 failed | 9 passed (10)
      Tests  83 passed (83)
```

사유가 출력에서 확인된다: `../src/permissions.js` 모듈 부재. npm 종료 코드 1.

**전이 2 — M1 GREEN (`permissions.ts` onGatewayRequest + `index.ts` 배선 후, 커밋 `d60bffb`):**

```
$ npm test -w server -- --run
 Test Files  10 passed (10)
      Tests  86 passed (86)

$ npm run typecheck -w server
> tsc --noEmit
typecheck exit: 0
```

과정 기록: 첫 typecheck 시도는 `src/permissions.ts(27,38): error TS2698: Spread types may only be created from object types.` 로 실패했다 — `db.prepare(...).get()` 의 반환형이 `unknown` 인데 스프레드했기 때문이다. 형제 파일들과 같은 캐스트(`as Record<string, unknown>`)로 고쳤고, M1 커밋 전에 위 GREEN·typecheck exit 0 을 확인했다.

**전이 3 — M2 RED (판정 테스트 12건 추가 직후, 커밋 전 — 모듈 부재가 아닌 단언 실패):**

```
$ npm test -w server
 ❯ test/permissions.test.ts (15 tests | 10 failed) 12898ms
     × user yes reply sends verdict to the bot and is not stored as user message 53ms
     × delivers an allow verdict to the connected bot 1552ms
     × delivers a deny verdict as deny, not as allow 1563ms
     × consumes the reply instead of storing it as a user message 57ms
     × accepts a verdict once and lets a repeat fall through as chat 1548ms
     × never resolves a request from a different room 3057ms
     × refuses an unauthenticated verdict and leaves the request pending 3071ms
     × falls through non-matching text and unknown ids without touching the pending request 1570ms
     × marks an undelivered verdict differently from a delivered one 67ms
     × accepts all four verdict words, normalizes case, and rejects ids containing l 47ms

 FAIL  test/permissions.test.ts > permission relay > user yes reply sends verdict to the bot and is not stored as user message
AssertionError: expected undefined to be 'permission' // Object.is equality
 ❯ test/permissions.test.ts:165:36
    164|     const res = await post(app, roomId, cookie, 'yes abcde')
    165|     expect(res.json().consumed_by).toBe('permission')

 FAIL  test/permissions.test.ts > permission relay > delivers an allow verdict to the connected bot
AssertionError: expected null to deeply equal { type: 'permission_verdict', …(2) }
 ❯ test/permissions.test.ts:191:24
    191|     expect(await seen).toEqual({ type: 'permission_verdict', request_i…

 FAIL  test/permissions.test.ts > permission relay > delivers a deny verdict as deny, not as allow
AssertionError: expected null not to be null
 ❯ test/permissions.test.ts:202:19

 Test Files  1 failed | 9 passed (10)
      Tests  10 failed | 88 passed (98)
```

실패 사유가 **단언 실패**임이 출력에서 확인된다 — `permissions.test.ts` 는 import 되어 15개 테스트로 실행됐고(모듈 부재가 아님), `expected undefined to be 'permission'` / `expected null to deeply equal` / `expected null not to be null` 이다. 이 시점의 `tryHandleUserReply` 는 M1 껍데기(항상 `false`)라 가로채기가 일어나지 않았다. 원본 회귀 방지선 두 개(`non-matching text…`·`yes with unknown id…`)가 이 RED 에서도 통과한 것은 MF-2 가 문서화한 대로다 — 그 둘의 기대값이 정상 경로 기본값과 같아서다. REQ-PERM-010 의 판정은 통과하지 못한 `falls through…` 테스트가 진다.

**전이 4 — M2 GREEN (`tryHandleUserReply` 구현 + 라우트 가로채기 후, 커밋 `d11e53e`):**

```
$ npm test -w server -- --run
 Test Files  10 passed (10)
      Tests  98 passed (98)

$ npm run typecheck -w server
> tsc --noEmit
typecheck exit: 0
```

### AC 매트릭스 (판정 시점 HEAD `d11e53e`, 명령 `npm test -w server -- --reporter=verbose` 원문 `✓` 줄)

| AC | 판정 | 명령 | 관측된 원문 출력 |
|----|------|------|-----------------|
| AC-PERM-001 | PASS | `npm test -w server -- --reporter=verbose` | ` ✓ test/permissions.test.ts > permission relay > gateway request creates a system message in the room 124ms` |
| AC-PERM-002 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > system message carries all four parts and both reply forms 49ms` |
| AC-PERM-003 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > publishes the request to the room SSE stream 67ms` |
| AC-PERM-004 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > delivers an allow verdict to the connected bot 53ms` |
| AC-PERM-005 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > delivers a deny verdict as deny, not as allow 52ms` |
| AC-PERM-006 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > consumes the reply instead of storing it as a user message 47ms` |
| AC-PERM-007 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > accepts a verdict once and lets a repeat fall through as chat 1547ms` |
| AC-PERM-008 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > never resolves a request from a different room 1548ms` |
| AC-PERM-009 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > refuses an unauthenticated verdict and leaves the request pending 1560ms` |
| AC-PERM-010 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > falls through non-matching text and unknown ids without touching the pending request 1571ms` |
| AC-PERM-011 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > marks an undelivered verdict differently from a delivered one 66ms` |
| AC-PERM-012 | PASS | 〃 | ` ✓ test/permissions.test.ts > permission relay > accepts all four verdict words, normalizes case, and rejects ids containing l 47ms` |
| AC-PERM-013 | PASS | 아래 네 명령 | 아래 "범위 경계 관측" 절의 원문 출력 |
| AC-PERM-014 | PASS | 각 마일스톤 `npm test -w server -- --run` | 위 "RED → GREEN 전이 증거" 절의 원문 출력 4개 |

전체 스위트 요약 (같은 실행, 원문):

```
 Test Files  10 passed (10)
      Tests  98 passed (98)
   Start at  10:43:40
   Duration  7.12s (transform 605ms, setup 0ms, import 1.26s, tests 13.99s, environment 0ms)
```

`$ npm run typecheck -w server` → `typecheck exit: 0`.

### 범위 경계 관측 (AC-PERM-013, 판정 시점 `d11e53e`)

```
$ git rev-parse --verify "$(cat .moai/specs/SPEC-PERM-001/.spec-base-sha)^{commit}"
398b584fb763cce25c5f92802993c425c994484e
exit: 0

$ git diff --stat 398b584fb763cce25c5f92802993c425c994484e -- server/src/db.ts
exit: 0        ← 출력 없음 (빈 출력 + 종료 코드 0 동시 성립)

$ git diff --name-only 398b584fb763cce25c5f92802993c425c994484e -- server/src
server/src/index.ts
server/src/permissions.ts
server/src/routes-messages.ts
exit: 0
```

네 관측 전부 성립 — 기준 SHA 해석 exit 0, `db.ts` 불변(REQ-PERM-014), 변경 소스 정확히 세 줄이고 정렬 시 `index.ts`·`permissions.ts`·`routes-messages.ts` (REQ-PERM-013), 목록에 `gateway.ts`·`sse.ts`·`routes-rooms.ts`·`routes-bots.ts`·`mention.ts` 없음. 세 확인은 M2 커밋 전(작업 트리)과 후(`398b584…HEAD`) 양쪽에서 같은 결과를 냈다. 실행 참고: 워크트리 가드가 `git diff` 안의 `$(cat …)` 치환을 거부해 두·세 번째 명령은 `.spec-base-sha` 에 기록된 같은 값을 리터럴로 넣어 실행했다.

품질 게이트 나머지: `git status --porcelain data/` → 빈 출력 (데이터 격리 성립).

### Gaps (미검증 명시)

- **엣지 케이스 "답과 함께 파일이 첨부된다" — 미검증.** 가로채기가 multipart 파싱 뒤라 파일은 이미 디스크에 저장된 상태로 소비되며, 그 첨부는 어느 메시지에도 붙지 않는다. `plan.md` §E 가 수용한 위험이고 어떤 AC 도 이 경로를 관측하지 않는다.
- **엣지 케이스 "보관된 방에 온 답" — 이 SPEC 에서 미검증.** 라우트 소유 SPEC(`SPEC-MSG-001`)의 기존 동작에 맡긴다 — 실제 라우트는 방 검사에서 없는 방 404·보관 방 409 로 가르며(`routes-messages.ts` 구현 확인), 그 검사가 multipart 파싱이자 가로채기보다 앞이라 판정까지 오지 않는다. 이 경로의 테스트는 이 SPEC 의 파일에 없다.
- **판정 결과 system 메시지의 SSE 발행 — 간접 관측만.** REQ-PERM-009 는 결과 메시지도 "SSE 로 발행"을 요구한다. 구현은 `postSystem` 이 요청·결과 양쪽을 같은 경로로 발행하지만, SSE 프레임을 직접 관측하는 AC 는 AC-PERM-003(요청 쪽)뿐이고 AC-PERM-011 은 DB 본문만 잰다. 결과 쪽 SSE 발행이 프레임으로 관측된 적은 없다.
- **서버 재시작 후 답 — 문자 그대로의 재시작 테스트 없음.** `acceptance.md` 엣지 케이스 표가 규정한 대로 "모르는 ID 와 같은 경로"(AC-PERM-010)로 환산 관측했다. 대기 레지스트리가 프로세스 메모리 맵임은 구현에서 직접 확인된다.
- **부정 관측의 1.5초 창.** `nextMessage → null` 단언(AC-PERM-007·008·009·010)은 1.5초 안에 오지 않았음을 잰다. `plan.md` §E 가 수용한 대로 타임아웃 직후 도착한 판정은 못 잡는다.
- **원본 회귀 방지선 두 개의 RED 통과.** 전이 3 관측 경계에 적은 대로 `non-matching text…`·`yes with unknown id…` 는 M2 RED 에서도 통과했다(MF-2 가 문서화한 공허함). REQ-PERM-010 의 판정은 `falls through…` 테스트가 진다.
- **네 개 범위 밖 항목(전용 엔드포인트·방 멤버십·타임아웃·연결 해제 정리)은 리드 판정 대기다.** `spec.md` §5 첫 절에 소유자와 함께 기록했고 만들지 않았다 — plan 단계(§E.1)에서 리드에 보고한 상태 그대로다.

### Residual-risk (잔여 위험)

- **대기 레지스트리 무한 증식.** 아무도 답하지 않은 요청이 프로세스 수명 동안 쌓인다. 단일 사용자·소수 봇 전제로 수용했다(REQ-PERM-003, plan.md §E).
- **전송 실패 후 판정 소실.** 봇 오프라인 시 해제가 이미 일어났으므로 그 판정은 되돌릴 수 없다 — 세션 쪽 대화상자가 살아 있어 터미널 승인이 대체 경로다(plan.md §B·§D 3번).
- **봇 재접속 시 놓친 요청 재전송 없음.** `spec.md` §5 가 명시 배제한 항목이다.
- **`yes abcde` 에 파일을 함께 보내면 고아 파일이 디스크에 남는다.** 위 Gaps 첫 항목과 같은 사실의 디스크 쪽 면이다.
- **같은 `request_id` 의 두 번째 승인 요청.** 게이트웨이가 같은 ID 를 다시 보내면 `open.set` 이 기존 항목을 덮어쓴다(값은 같은 (방,봇)이므로 무해하다). 다른 (방,봇) 이 같은 ID 를 쓰면 나중 등록이 이긴다 — 공식 ID 공간(5글자, l 제외)에서 우연 충돌은 가능하나 이 SPEC 의 AC 어디도 다루지 않는다.

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-PERM-001
card: t3
tier: M
cycle_type: tdd
milestones: [M1, M2]
spec_base_sha: 398b584fb763cce25c5f92802993c425c994484e
m1_commit_sha: d60bffb44e33470a836df82912698b0f7dc0410a
m2_commit_sha: d11e53e0deb37a66d3eaf9d739e25cdcb804c766
run_head_at_signal: d11e53e0deb37a66d3eaf9d739e25cdcb804c766
evidence: .moai/specs/SPEC-PERM-001/progress.md §E.2
test_files_before: 9
test_files_after: 10
tests_before: 83
tests_after: 98
typecheck: "npm run typecheck -w server → exit 0"
data_isolation: "git status --porcelain data/ → 빈 출력"
boundary: "db.ts 불변 + 변경 소스 3파일 (index.ts·permissions.ts·routes-messages.ts)"
ac_total: 14
ac_pass: 14
ac_fail: 0
open_questions: 4   # 리드 판정 대기 — 전용 엔드포인트·멤버십·타임아웃·연결 해제 정리 (spec.md §5)
```

---

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-27
sync_commit_sha: "<sync 커밋 직후 백필>"
spec_id: SPEC-PERM-001
card: t3
milestone: M3
worktree: .claude/worktrees/t3 (WT-msg-gateway-relay)
head_at_sync_evidence: "8c4798a"
sync_session: 9d51afd1-8226-4e22-946e-2ed4574a878e
lens: "--security --deep"
docs_updated: [README.md, CHANGELOG.md]
status_transition: "in-progress → implemented → completed (단일 sync 커밋)"
open_questions_carried: 4   # spec.md §5 — 리드 판정 대기, sync 가 닫지 않음
```

### Claim (주장)

`SPEC-PERM-001` 의 run 단계 산출물이 sync 세션의 **독립 재실행**으로 확인되었다. 권한 릴레이 테스트 15건이 전부 통과하고 타입 검사가 깨끗하다. 다만 승인 권한을 누가 가지는가라는 미결 질문 4건은 **닫히지 않은 채 그대로 넘어간다** — 아래 Gaps 에 명시한다.

### Evidence (증거)

sync 세션이 직접 실행해 관측했다. 원문은 `.moai/state/verify/9d51afd1/test-verbose.txt` 에 남겼다.

```
$ npm test -w server -- --run --reporter=verbose
 ✓ test/permissions.test.ts > permission relay > gateway request creates a system message in the room 102ms
 ✓ test/permissions.test.ts > permission relay > system message carries all four parts and both reply forms 48ms
 ✓ test/permissions.test.ts > permission relay > publishes the request to the room SSE stream 66ms
 ✓ test/permissions.test.ts > permission relay > user yes reply sends verdict to the bot and is not stored as user message 53ms
 ✓ test/permissions.test.ts > permission relay > non-matching text is not consumed 49ms
 ✓ test/permissions.test.ts > permission relay > yes with unknown id is not consumed (falls through as chat) 48ms
 ✓ test/permissions.test.ts > permission relay > delivers an allow verdict to the connected bot 52ms
 ✓ test/permissions.test.ts > permission relay > delivers a deny verdict as deny, not as allow 52ms
 ✓ test/permissions.test.ts > permission relay > consumes the reply instead of storing it as a user message 49ms
 ✓ test/permissions.test.ts > permission relay > accepts a verdict once and lets a repeat fall through as chat 1549ms
 ✓ test/permissions.test.ts > permission relay > never resolves a request from a different room 1560ms
 ✓ test/permissions.test.ts > permission relay > refuses an unauthenticated verdict and leaves the request pending 1559ms
 ✓ test/permissions.test.ts > permission relay > falls through non-matching text and unknown ids without touching the pending request 1558ms
 ✓ test/permissions.test.ts > permission relay > marks an undelivered verdict differently from a delivered one 48ms
 ✓ test/permissions.test.ts > permission relay > accepts all four verdict words, normalizes case, and rejects ids containing l 48ms
 Test Files  10 passed (10)
      Tests  98 passed (98)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

보안 렌즈 — 판정 경로를 코드에서 직접 읽었다. 확인한 것 네 가지:

1. **미인증 판정은 닿지 않는다.** 판정 가로채기는 `POST /api/rooms/:id/messages` 안에 있고 그 라우트는 `preHandler: [requireAuth]` 를 단다 — 쿠키 없는 요청은 `401` 로 끝나며 대기 항목이 손상되지 않는다. `refuses an unauthenticated verdict and leaves the request pending` 이 양성으로 지킨다.
2. **방 경계를 넘지 않는다.** `if (info.roomId !== roomId) return false` — 다른 방의 답은 소비도 전송도 하지 않는다.
3. **재사용되지 않는다.** `open.delete(requestId)` 가 전송 시도 **직후** 실행돼, 같은 판정을 두 번 쓸 수 없다.
4. **전달 실패를 성공으로 위장하지 않는다.** `sendToBot` 의 반환값을 읽어 봇이 끊겨 있으면 `⚠️ … 전달하지 못했습니다` 로 표시한다.

### Baseline-attribution (baseline 귀속)

- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `8c4798a`.
- run 단계 §E.3 은 `tests_before: 83 → tests_after: 98`, `test_files 9 → 10` 을 기록했다. sync 재실행이 **정확히 그 최종 수치**(10 파일 / 98 테스트)를 관측했다 — run 시점 주장과 일치한다.
- AC 14/14 판정은 §E.2 의 run 시점 기록이며, sync 세션이 개별 AC 를 다시 판정하지는 않았다.
- §G·§G.2 감사 라운드에서 닫힌 결함(MF-1·2·3·5, R-1)의 교정 자체는 sync 가 재현하지 않았다 — 확인한 것은 교정 이후 트리의 최종 GREEN 상태다.

### Gaps (미검증)

- 커버리지 수치 미측정 (`@vitest/coverage-v8` 미설치).
- **미결 질문 4건이 열린 채다** (`spec.md` §5, 리드 판정 대기):
  1. 판정 전용 엔드포인트를 따로 둘 것인가 — 지금은 메시지 전송 경로에서 텍스트를 가로챈다.
  2. **승인 권한을 방 멤버로 제한할 것인가** — 지금은 로그인한 사용자면 누구나 승인할 수 있다. 보안 관점에서 이 넷 중 가장 무거운 항목이다.
  3. 대기 요청에 시간 제한을 둘 것인가 — 지금은 무기한이며 서버 재시작으로만 비워진다.
  4. 봇 연결이 끊길 때 그 봇의 대기 항목을 정리할 것인가 — 지금은 남는다.
- 실제 Claude Code 세션의 승인 대화상자와 맞물리는지는 관측하지 않았다. 카드 `t6` E2E 의 몫이다.

### Residual-risk (잔여 위험)

- **대기 레지스트리는 프로세스 메모리다.** 서버가 재시작하면 대기 중이던 승인 요청이 전부 사라진다. 수용된 설계이며(세션 쪽 대화상자는 살아 있어 터미널에서 직접 승인 가능), 사용자에게는 "모르는 ID" 경로로 보인다.
- `PERMISSION_REPLY_RE` 는 카드 `t5` 웹 UI 파서와 형식을 공유한다. 한쪽만 바꾸면 승인 버튼이 조용히 동작하지 않는다.
- 요청 ID 는 5글자(`l` 제외 소문자)다. 같은 방에 동시 대기가 많아지면 충돌 가능성이 생기지만, 이번 규모에서는 관측되지 않았다.
- 이 분기는 아직 머지되지 않았다.

---

## §F Phase 4 Mode Selection

- 입력: tier M / 범위 3개 파일 (permissions.ts·테스트 신규, 배선·가로채기 수정) / 도메인 1 (server) / 언어 TypeScript / 병렬 이득 낮음
- direct: 미선택 — 다중 파일 신규 코드+테스트 작성
- serial: 선택 — 코딩 중심 구현의 기본값; 카드 t3 다섯 SPEC의 마지막. 선행 GATEWAY(setPermissionHandler 창구)·MSG(메시지 라우트 가로채기 지점) 산출물을 계약으로 소비
- fanout: 미선택 — 단일 도메인 구현 작업 (코딩 병렬성 경고)
- sweep: 미선택 — 30파일 미만, 기계적 일괄 변환 아님

Decision: serial
Implementation Kickoff Approval: 통과 — 리드 디스패치 gate 필드로 운영자 승인 전달됨 (2026-08-27)
기록 시점 HEAD: 398b584 (SPEC-MSG-001 run 완료 직후)

---

## §G Audit Response (v0.2.0)

감사 보고서 `.moai/reports/t3-plan-audit-b.md` 의 판정은 **CONDITIONAL PASS** 였다. 유예 4건·의도적 이탈 1건·원본 차단급 결함 주장은 모두 옳다고 확인됐고, 필수 수정 4건은 전부 기술적인 것이다. 넷 다 닫았고 있으면 좋은 것 2건도 함께 반영했다. **요구사항 14개와 수용 기준 14개는 개수도 내용도 그대로다** — 바뀐 것은 두 기준이 무엇을 보고 판정하는가와 테스트 하네스의 배선이다.

### MF-1 — `AC-PERM-003` 이 올바른 구현도 실패시켰다 (critical, blocking) → 닫음

**무엇이 잘못됐나.** 스트림을 열자마자 `reader.read()` 를 한 번만 하고 그 청크에 `event: message` 가 있기를 기대했다. `subscribe` 는 `SPEC-SSE-001` `REQ-SSE-002` 에 따라 `: connected\n\n` 을 먼저 쓰므로 첫 청크는 그 주석이고, 브로커가 완벽해도 실패한다. 감사자가 Node v24.12.0 에서 재현해 첫 청크가 정확히 `": connected\n\n"` 임을 관측했다.

**무엇을 고쳤나.** 하네스에 `openStream`(AbortController + 정리 등록)과 `readFrame`(`\n\n` 까지 모아 프레임 하나를 반환, `SPEC-SSE-001` 과 같은 형태)을 더했다. `AC-PERM-003` 은 이제 `readFrame` 을 두 번 부른다 — 첫 번째로 연결 확인 주석을 소비하고(`toContain('connected')`), 그 반환 **뒤에** `onGatewayRequest` 를 일으킨 다음 두 번째 프레임을 잰다. 순서가 load-bearing 이라 하네스 아래 문단과 기준 본문 양쪽에 이유를 적었다 — 발행을 먼저 하면 두 프레임이 한 청크로 합쳐져 두 번째 `readFrame` 이 멈춘다.

**부류로 확장했나.** 했다. 이 결함은 공허한 기준의 **반대 방향**(정상 구현을 거짓 실패시키는 기준)이라 기존 부류 훑기가 걸러 내지 못했다. `acceptance.md` 서두에 그 방향을 따로 명시하고, `plan.md` §E 에 위험 항목으로, §H 에 안티패턴으로 올렸다. 이 문서 안에서 비동기 수신을 재는 자리는 AC-PERM-003 하나뿐임을 확인했다 — 나머지 부정 관측은 `nextMessage` 를 쓰는데, 그쪽은 `null` 반환이 곧 기대값이라 같은 함정이 없다.

### MF-2 — `AC-PERM-010` 이 가로채기 없는 구현도 통과시켰다 (major, blocking) → 닫음

**무엇이 잘못됐나.** 두 가지가 겹쳐 있었다. 첫째, 판정 관측 대상이 원본 테스트 두 개의 `✓` 줄이었는데 그 테스트들이 실제로 단언하는 것은 `expect(res.json().ok).toBe(true)` 하나뿐이라, `tryHandleUserReply` 가 항상 `false` 인 껍데기에서도, 가로채기가 라우트에 아예 없어도 통과했다. 부정 기준의 기대값이 정상 경로의 기본값과 같기 때문이다. 둘째, 기준 본문이 그 원본 테스트를 "평범한 메시지로 **저장되며**"를 단언한다고 서술했는데 저장 단언은 없었다 — 원본의 검증력을 실제보다 크게 적었고, 같은 문서 서두의 자기 선언과 어긋났다.

**무엇을 고쳤나.** 감사자가 권한 쪽 — 서술을 낮추는 대신 **기준 자체를 올리는** 쪽 — 을 택했다. 새 테스트 `falls through non-matching text and unknown ids without touching the pending request` 가 네 가지를 함께 잰다: 두 텍스트 모두 `consumed_by` 없음, 어느 쪽도 봇에 판정을 보내지 않음(`nextMessage → null`), `author_type='user'` 행 수가 `2`, 그리고 그 뒤 진짜 판정 `yes abcde` 가 여전히 `consumed_by === 'permission'` 으로 성립. 마지막 두 개가 검증력의 전부다 — 저장 행 수는 항상 `true` 인 껍데기를, 마지막 성립은 항상 `false` 인 껍데기와 배선 없는 구현을 잡는다. 원본 두 테스트는 회귀 방지선으로 파일에 남지만 판정 대상이 아님을 기준 본문과 `plan.md` §F M2 단계 1 양쪽에 적었다.

**부류로 확장했나.** 했다. "부정 기준의 기대값이 정상 경로의 기본값과 같다"를 위험한 자리로 `acceptance.md` 서두 표에 한 행 추가했고, §H 에 "부정 기준을 부정 단언 하나로 끝내지 말 것 — 반드시 양성 짝을 붙일 것" 안티패턴을 올렸다. 나머지 부정 기준 세 개(AC-PERM-007·008·009)를 다시 훑어 확인한 결과 모두 이미 양성 짝을 갖고 있다 — 007 은 저장 행 수 `1`, 008 과 009 는 "원래 방/인증된 답에서는 여전히 전달된다"는 후속 단언이다. AC-PERM-010 만 그 짝이 없었다.

### MF-3 — 하네스가 `reply.hijack()` 을 빠뜨렸다 (major, blocking) → 닫음

**무엇이 잘못됐나.** 하네스의 SSE 라우트가 `hub.subscribe` 를 바로 불렀다. `SPEC-SSE-001` `REQ-SSE-003` 은 그 앞에 `reply.hijack()` 을 두라고 확정했고, 같은 SPEC 의 `plan.md` §D 2번이 이 형태를 원본 `plan-v2.md` Task 7 의 결함으로 지목했는데 그것을 그대로 재생산했다. 하네스가 원본에 세 가지를 더했다고 밝히면서 정작 형제 SPEC 이 확정한 한 줄을 놓친 것이다.

**무엇을 고쳤나.** `reply.hijack()` 을 `hub.subscribe` 앞에 넣고 근거 주석(`SPEC-SSE-001 REQ-SSE-003`)을 달았다. 하네스 머리말의 "세 가지가 더해졌다"를 "네 가지"로 고치고 그 항목에 근거를 적었다. §H 에 "SSE 라우트에서 `reply.hijack()` 빼지 말 것" 안티패턴을 올렸다 — 원본에 없어서 그대로 옮기기 쉬운 자리라는 점을 함께 적었다.

**부류로 확장했나.** 했다. 이것은 공허한 기준이 아니라 **소비자가 소유 SPEC 의 확정 계약을 다르게 쓴** 계약 이탈이다. 그래서 하네스가 선행 SPEC 에서 가져다 쓰는 나머지 계약을 다시 대조했다 — `createSseHub`/`publish`, `createGateway`/`setPermissionHandler`/`sendToBot`/`ConnInfo`, `requireAuth`, `registerMessageRoutes`, `sha256Hex`. `reply.hijack()` 외에 어긋난 곳은 찾지 못했다. 다만 이 대조는 원본 `plan-v2.md` 의 코드 본문 기준이며 형제 SPEC 본문 기준이 아니다(아래 미검증 참조).

### MF-5 — 하네스가 listen 중인 서버를 정리하지 않았다 (major, blocking) → 닫음

**무엇이 잘못됐나.** `build()` 가 `app.listen({ port: 0 })` 을 하면서 정리를 등록하지 않았고, `afterEach` 는 `db.close()` 와 임시 디렉터리 삭제만 했다. 각 테스트가 스스로 `app.close()` 를 불러야 했는데 `AC-PERM-002` 와 `AC-PERM-003` 이 부르지 않아 서버가 열린 채 남고 vitest 프로세스가 종료되지 않는다. 더해서 `plan.md` §E 가 WebSocket 불안정 위험의 완화책으로 "각 테스트가 `app.close()` 로 정리한다"고 적었는데 자기 문서의 두 기준이 그렇지 않았다 — 관측되지 않은 완화 주장이었다.

**무엇을 고쳤나.** 정리 책임을 개별 테스트에서 걷어 냈다. `cleanups` 목록을 두고 `build()`(서버)·`wsConnect`(소켓)·`openStream`(스트림)이 각자 자기 정리를 등록하며, `afterEach` 가 **등록 역순**으로 실행한 뒤 `db.close()` 와 디렉터리 삭제로 넘어간다(서버가 DB 보다 먼저 닫혀야 한다). 시나리오 본문 여덟 곳의 `ws.close(); await app.close()` 는 전부 지웠다 — 빠뜨릴 수 있는 자리 자체를 없앤 것이 요점이다. `plan.md` §E 의 완화 문구를 실제 형태로 고치고 위험 항목을 한 줄 추가했으며, §H 에 "정리 책임을 개별 테스트로 되돌리지 말 것" 안티패턴을 올렸다.

**부류로 확장했나.** 했다. 지적은 두 기준을 짚었지만 고침은 열네 기준 전체에 적용했다 — 개별 테스트에 정리를 맡기는 형태가 남아 있으면 다음 기준을 추가할 때 같은 누락이 재발한다.

### NH-3 — 전달 실패 문구의 양성 단언 → 반영

`AC-PERM-011` 은 `expect(dropped.body).not.toBe(delivered.body.replace('abcde','fghij'))` 로 "성공 문구와 다르다"만 봤다. 그것만으로는 실패 쪽 문구가 빈 문자열이든 사람이 읽고 실패인지 알 수 없는 문구든 통과한다. `plan.md` §C 가 확정한 문구의 핵심 어절을 직접 재는 `expect(dropped.body).toContain('전달하지 못했습니다')` 를 더했고, 기준 본문의 관측 항목을 둘에서 셋으로 고쳤다. `acceptance.md` 서두 표의 해당 행도 함께 갱신했다.

### NH-4 — 판정어 `n` 축약형 → 반영

`PERMISSION_REPLY_RE` 의 네 갈래 중 `n` 을 덮는 기준이 없었다 — `AC-PERM-005` 는 `no` 만, `AC-PERM-012` 는 `Y` 만 쟀다. `AC-PERM-012` 에 대기 항목 `fghij` 를 하나 더 두고 `N FGHIJ` 가 `behavior: 'deny'` 로 도달하는지 재는 갈래를 더했다. 축약형 두 개가 서로 다른 `behavior` 로 가는 것을 한 테스트에서 함께 재므로 `startsWith('y')` 로 둘을 뭉뚱그린 구현이 걸린다. 네 갈래가 문서 전체에서 어디에 덮이는지(`yes`→004, `no`→005, `y`/`n`→012)를 기준 본문에 적어 두었다.

### 이번 라운드에서 하지 않은 것 (v0.2.0)

- **MF-4 는 이 SPEC 의 것이 아니다.** `AC-SSE-010` / `REQ-SSE-010` 의 절대 파일 열거 문제이며 `SPEC-SSE-001` 소관이다. 리드가 지시한 범위도 넷(MF-1·2·3·5)이었다.
- **NH-1·NH-2·NH-5 는 다른 SPEC 것이다.** 각각 `SPEC-SSE-001` 의 표기 오류, `SPEC-MENTION-001` 의 개수 표기, `SPEC-MSG-001` 에서 확인할 항목이다.
- **`spec.md` 의 요구사항은 한 줄도 고치지 않았다.** 지적 넷 다 검증 방법과 테스트 배선의 문제였고 계약의 문제가 아니었다. REQ-PERM-001..014 그대로, 수용 기준 14개 그대로다.
- **어떤 명령도 실행하지 않았다.** 이 라운드에서 고친 테스트 코드는 여전히 문서상의 것이고, `npm test -w server` 는 돌려 보지 않았다 — run 단계 소관이다. MF-1 의 재현 증거는 감사자가 관측한 것이고 내가 다시 관측하지는 않았다.
- **형제 SPEC 본문 대조는 여전히 미검증이다.** MF-3 은 소비자가 소유 SPEC 의 계약을 어긴 사례인데, 나는 그 계약들을 원본 `plan-v2.md` Task 8·9 의 코드 본문에서 인용했지 형제 SPEC 본문에서 읽지 않았다. 같은 부류의 이탈이 더 있을 가능성은 닫히지 않았다 — run 단계 진입 전 §A 의존 표 대조가 그것을 잡는 자리다.

---

---

## §G.2 Audit Response — 재감사 라운드 (v0.3.0)

재감사 보고서 `.moai/reports/t3-plan-reaudit.md` 가 MF-1·2·3·5 네 건을 **RESOLVED** 로 확인하고(MF-2 의 새 형태는 공허하지 않다고 판정), 차단급 회귀 한 건(R-1)을 새로 지적했다.

### R-1 — 하네스가 `set-cookie` 를 배열로 가정했다 (critical, blocking) → 닫음

**무엇이 잘못됐나.** `build()` 의 반환이 `login.headers['set-cookie']![0].split(';')[0]` 이었다. `light-my-request`(= `app.inject`)는 그 헤더를 배열이 아니라 **문자열 하나**로 돌려주므로, `[0]` 은 첫 글자 `"m"` 을 집어내고 `.split(';')[0]` 도 `"m"` 이다. 그 값을 쿠키로 보내는 모든 요청이 `requireAuth` 에서 `401` 이 되어, 판정 경로를 타는 기준 **열 개**(AC-PERM-003·004·005·006·007·008·009·010·011·012)가 구현이 완벽해도 실패한다. 이번 라운드에 고친 두 기준(003·010)도 이 결함 아래에서는 실행되지 못했다.

**무엇을 고쳤나.** 형제 SPEC 세 곳이 각각 교정하며 쓴 `setCookieOf` 헬퍼를 그 형태 그대로(주석 포함) 하네스에 두고, 반환을 `cookie: setCookieOf(login).split(';')[0]` 으로 바꿨다. 하네스 머리말의 "네 가지가 더해졌다"를 "다섯 가지"로 고치고, 왜 이것이 조용히 실패하는지를 머리말 아래 문단에 적었다. `plan.md` §D 에 6번 항목으로, §H 에 안티패턴 두 줄로 올렸다.

**부류로 훑었나.** 했다. 지적이 "한 줄 수정"이라고 했지만 부류로 다뤘다 — 하네스 전체에서 헤더·프레임·응답 본문을 인덱싱하는 자리를 기계적으로 찾아 각각 판정했다.

```
$ grep -n '\[0\]\|\[1\]\|\[2\]' acceptance.md
91:  return { app, broker, gateway, port, cookie: login.headers['set-cookie']![0].split(';')[0] }
$ grep -n "headers\[" acceptance.md
91:  return { app, broker, gateway, port, cookie: login.headers['set-cookie']![0].split(';')[0] }
```

인덱싱하는 자리는 그 한 곳뿐이었다. 인덱싱은 아니지만 스칼라/객체 형태를 가정하는 자리 네 종류를 함께 확인했다.

| 자리 | 판정 |
|------|------|
| `(app.server.address() as { port: number }).port` | **이상 없음.** `address()` 는 `AddressInfo \| string \| null` 이지만 TCP `listen({ port: 0 })` 에서는 항상 객체다. 형제 게이트웨이 테스트와 원본 `plan-v2.md` Task 8 이 같은 형태를 쓴다 — 맞추는 쪽이 옳다 |
| `db.prepare(...).get() as { body: string }` (다섯 곳) | **이상 없음.** 행이 없으면 `undefined` 라 속성 접근에서 던지고 테스트가 실패한다 — 원하는 방향이다 |
| `readFrame` 의 반환 | **이상 없음.** 문자열 하나를 돌려주고 `toContain` 으로만 쓴다. 인덱싱하지 않는다 |
| `openStream` 의 `fetch` 응답 헤더 | **이상 없음.** 실제 HTTP 라 `Headers` 객체이며 이 문서는 그 헤더를 읽지 않는다 |

**왜 첫 감사에서 살아남았나 — 이 부분이 교훈이다.** 같은 결함이 `SPEC-MSG-001` 에서 M1 으로 이미 지적됐는데, 그 SPEC 과 이 SPEC 을 서로 다른 감사자가 봐서 결함 부류가 SPEC 경계를 넘어 전파되지 않았다. `SPEC-SSE-001` 은 자체 훑기로 스스로 찾아 고쳤고 이 SPEC 만 남았다. 내 부류 훑기가 **자기 SPEC 안에서만** 돌았다는 것이 원인이다 — 형제 SPEC 이 이미 고친 부류를 자기 하네스에 대조하는 단계가 없었다. `plan.md` §H 에 그 단계를 안티패턴으로 올렸다.

### 이번 라운드에서 하지 않은 것

- **명령은 여전히 하나도 실행하지 않았다.** `setCookieOf` 가 실제로 `401` 을 없애는지는 관측하지 않았다 — 근거는 형제 SPEC 세 곳의 교정과 이미 머지된 `server/test/rooms-bots.test.ts` 의 주석이며, 내가 다시 잰 것이 아니다.
- **요구사항과 수용 기준은 이번에도 그대로다.** REQ-PERM-001..014, AC-PERM-001..014. 바뀐 것은 하네스 한 줄과 헬퍼 하나다.

---
