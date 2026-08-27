# SPEC-SSE-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-SSE-001` |
| 칸반 카드 | `t3` (마일스톤 M3) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 7 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-A·4-C·7장 |
| 워크트리 | `.claude/worktrees/t3` |
| 선행 SPEC | `SPEC-CORE-001` → `SPEC-AUTH-001` → `SPEC-ROOM-001` (카드 `t1`·`t2`) |
| 실행 순서 | 카드 `t3` 의 첫 SPEC — Task 8·9·10 이 이 SPEC 의 `publish` 계약에 결합한다 |
| 현재 상태 | `in-progress` — run 단계 완료 (M1·M2, AC 12/12 PASS, §E.3 audit-ready) |
| spec_base_sha | `ca6b841e2986a10ddcc7592f615234f75a3f8f7c` |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-SSE-001
tier: M
card: t3
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 7)
spec_version: "0.2.0"
req_count: 11
ac_count: 12
tier_budget: "16 REQ / 16 AC"
spec_base_sha: ca6b841e2986a10ddcc7592f615234f75a3f8f7c
plan_audit: .moai/reports/t3-plan-audit-b.md
plan_audit_verdict: "CONDITIONAL PASS — 필수 수정 1건(MF-4) 반영 완료, 공허한 기준 0/12"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-SSE-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 기준점 위에 검사 **두 개**가 올라간다 — `db.ts` 불변(REQ-SSE-011)과 "손댄 소스 파일은 `index.ts` + `sse.ts` 둘"(REQ-SSE-010).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-SSE-001/spec.md` | GEARS 요구사항 11개 (REQ-SSE-001..011), 범위 밖 6개 항목, 제약, HISTORY 0.1.0 |
| `.moai/specs/SPEC-SSE-001/plan.md` | 의존, 되돌리기 어려운 결정(허브 계약 / 프레임 형식·엔드포인트), 원본 모순 5건(5번은 미해결 보존), 위험 12건, 마일스톤 M1-M2, 안티패턴 18건 |
| `.moai/specs/SPEC-SSE-001/acceptance.md` | 수용 기준 12개 (AC-SSE-001..012), 공통 테스트 골격, 엣지 케이스 7건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-SSE-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-SSE-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

11개 REQ 전부가 하나 이상의 AC 에 매핑됐다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-SSE-001 | 허브 계약 — `createSseHub` + 세 메서드 시그니처 | AC-SSE-001(publish/subscribe 실동작), AC-SSE-006(`subscriberCount`), AC-SSE-012(순수 메모리) |
| REQ-SSE-002 | 구독 — 헤더 3개 + `: connected` + 집합 등록 + close 핸들러 | AC-SSE-002(헤더·첫 프레임), AC-SSE-006(등록과 정리) |
| REQ-SSE-003 | 이벤트 라우트가 `buildServer` 안에서 `hijack` 후 `subscribe` | AC-SSE-009 |
| REQ-SSE-004 | 미인증은 스트림을 열지 않는다 | AC-SSE-008 |
| REQ-SSE-005 | 발행 — 프레임 형식 + 그 방 전 구독자 | AC-SSE-001, AC-SSE-004(바이트 일치), AC-SSE-005(다중 구독자) |
| REQ-SSE-006 | 방 격리 | AC-SSE-003 (도착 순서 단언) |
| REQ-SSE-007 | 구독자 없는 방 발행은 no-op | AC-SSE-007 (실제 전달 단언과 한 테스트에 묶음) |
| REQ-SSE-008 | 연결 종료 시 구독자 제거 | AC-SSE-006 (`1` → `0` 두 값 모두) |
| REQ-SSE-009 | 하트비트·재접속 필드 금지 | AC-SSE-002(첫 프레임 `toBe`), AC-SSE-012(`setInterval` 부재) |
| REQ-SSE-010 | 범위 경계 — `sse.ts` 존재, 손댄 소스 파일은 `index.ts`+`sse.ts` 둘 | AC-SSE-010 (관측 1은 `sse.ts` 존재, 판정은 `spec_base_sha` 기준 `--name-only` 두 줄 — v0.2.0 교정) |
| REQ-SSE-011 | `SCHEMA` 불변 | AC-SSE-010 (`spec_base_sha` 기준 diff — 기준 SHA 확인과 diff 둘 다 종료 코드 `0`) |
| (전 구간) | RED→GREEN 전이 증거 | AC-SSE-011 |

### 수용 기준 훑기 — "빈 구현에서도 통과하는가?"

카드 `t2` 에서 세 번 재생산된 결함 부류(본문이 비어 있어도 통과하는 수용 기준)를 개별이 아니라 **부류로** 훑었다. 12개 기준 전부를 다시 읽고 같은 질문 하나를 던졌다.

| 기준 | 빈 구현에서 통과하는가 | 막는 장치 |
|------|----------------------|-----------|
| AC-SSE-001 | 아니다 | `readFrame` 이 프레임을 못 받고 vitest 타임아웃으로 실패 |
| AC-SSE-002 | 아니다 | 헤더 미설정 시 `content-type` 단언 실패, `: connected` 부재 시 타임아웃 |
| AC-SSE-003 | 아니다 | 도착 순서 `toBe` — 전역 브로드캐스트도 빈 publish 도 실패 |
| AC-SSE-004 | 아니다 | 프레임 바이트 일치 `toBe` |
| AC-SSE-005 | 아니다 | `subscriberCount === 2` + 두 리더 모두 수신 |
| AC-SSE-006 | 아니다 | **구독 직후 `1`** 단언이 빈 `subscribe` 를 걸러낸다 |
| AC-SSE-007 | 앞 절반만 보면 통과한다 | 같은 테스트에 실제 전달 단언을 묶어 전체가 실패하게 만듦 |
| AC-SSE-008 | 아니다 | preHandler 부재 시 `200`+`text/event-stream` 이 나와 실패, `inject` 도 멈춤 |
| AC-SSE-009 | 아니다 | `app.hub` 미정의 `TypeError` 또는 `404` |
| AC-SSE-010 | 아니다 | 네 관측 모두 종료 코드까지 확인, 기준 SHA 존재 자체가 관측 대상 |
| AC-SSE-011 | 아니다 | 전이 원인이 출력에 보이는지로 판정 |
| AC-SSE-012 | 부분적으로 그렇다 | 셋째 관측(부재 검사)은 빈 파일에서도 성립. 첫째·둘째(import 줄이 **정확히 1**이고 그 줄이 `node:http`)가 빈 파일을 걸러낸다 — 그 한계를 기준 본문에 적었다 |

원본 `plan-v2.md` Task 7 의 테스트에서 이 부류에 해당하던 것은 방 격리 검사 하나였다(단언이 아예 없었다). `plan.md` §D 3번에 경위를 기록하고 도착 순서 단언으로 바꿨다.

### 이 단계에서 하지 않은 것 (Gaps)

- 이 SPEC 의 산출물 코드는 한 줄도 작성하지 않았다. `server/src/sse.ts`, `server/test/sse.test.ts`, `server/src/index.ts` 배선 모두 미생성 — run 단계 소관이다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. `npm test -w server` 가 현재 몇 개 통과하는지 **미검증**이다.
- **`reply.hijack()` 없이 Fastify v5 가 이 형태를 견디는지 실행으로 확인하지 않았다** (`plan.md` §D 2번). 하이재킹을 넣는 판단의 근거는 문서화된 소켓 소유권 이양 경로라는 것이며, 부작용 유무는 run 단계에서 관측된다 — **미검증**이다.
- **AC-SSE-009 의 데이터 디렉터리 격리 방법을 확정하지 않았다.** `buildServer()` 가 `config.dataDir` 를 여는데, `MINIDISCORD_DATA_DIR` 환경변수를 언제 어떻게 설정할지는 run 단계 M2 단계 1 에서 정한다 — **미해결**이다.
- `plan-v2.md` Task 8·9·10(게이트웨이·메시지·권한 릴레이)의 본문은 `publish` 호출부 확인 목적으로만 훑었고 전체를 읽지 않았다. 이 SPEC 범위 밖이다.
- `plan.md` §D 5번(채널 설정 전달 방식: 실행 인자 대 환경변수)은 이 SPEC 범위 밖이라 **미해결**로 보존한다. `SPEC-BOT-001` `plan.md` §D 3번이 원 기록이고 카드 `t4` 에서 재확인한다.
- plan-audit 을 아직 받지 않았다. 이 SPEC 의 수용 기준 강도는 자체 훑기로만 판정됐다 — **미검증**이다.

---

## §Audit Response (v0.2.0 — 2026-08-27)

근거 보고서: `.moai/reports/t3-plan-audit-b.md` (감사자 B, 1회차). 이 SPEC 판정은 **CONDITIONAL PASS** — 수용 기준 12개 중 공허한 것 0건, 필수 수정 1건(MF-4).

### 고친 것

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 | 바뀐 파일 |
|------|----------------|--------------|-----------|
| **MF-4** (major, blocking) | `REQ-SSE-010` 과 `AC-SSE-010` 관측 1이 구현 후 `server/src` 에 정확히 일곱 파일만 있고 `mention.ts` 가 **없어야** 한다고 못 박았다. 그런데 `SPEC-MENTION-001` 은 자신을 카드 `t3` 의 첫 번째로 명시하고 `SPEC-GATEWAY-001` 은 MENTION·SSE 가 먼저 끝나야 한다고 쓴다 — 이 SPEC 이 실행될 때 `mention.ts` 는 이미 있을 공산이 크고, 그러면 **구현이 완전히 옳아도** 관측 1이 실패한다. 이 SPEC 이 통제하지 않는 산출물을 자기 요구사항으로 삼은 것이 원인 | 형제 SPEC 파일(`mention.ts`·`gateway.ts`·`routes-messages.ts`·`permissions.ts`)을 목록 검사에서 **완전히 면제**했다. 관측 1은 `sse.ts` 가 있는지만 본다(양성 확인). "이 SPEC 이 만들지 않았다"는 판정은 관측 4 — `spec_base_sha` 기준 `git diff --name-only` 가 정확히 `index.ts`+`sse.ts` 두 줄 — 이 진다. 형제 `SPEC-MSG-001` 의 `AC-MSG-013` 과 같은 모양이며 리드 지시와 일치한다 | `spec.md` REQ-SSE-010, `acceptance.md` AC 매트릭스·관측 1·관측 4·DoD, `plan.md` §D 7번·§E·§F M2 단계 6·§H |
| **자체 발견** (blocking, 감사 지적 아님) | `acceptance.md` 공통 골격의 `login.headers['set-cookie']![0].split(';')[0]` 이 원본 `plan-v2.md` 형태 그대로였다. `light-my-request` 는 `set-cookie` 를 **배열이 아니라 문자열**로 돌려주므로 `[0]` 은 첫 글자 `"m"` 이고, 그 쿠키로는 `requireAuth` 가 전부 `401` 을 낸다 — **정상 구현조차 이 SPEC 의 스트림 기준 전부를 통과할 수 없었다.** MF-4 와 정확히 같은 부류다 | 이미 머지된 `server/test/rooms-bots.test.ts:21-26` 의 `setCookieOf` 정규화를 직접 읽어 확인하고 같은 헬퍼를 공통 골격에 넣었다. 호출부 두 곳(`startServer`, AC-SSE-009 본문)을 `setCookieOf(login).split(';')[0]` 으로 바꿨다. 형제 `SPEC-MSG-001` §D 8번·`SPEC-GATEWAY-001` AC-GW-018 도 같은 교정을 적용했다 | `acceptance.md` 공통 골격 + 호출부 2곳, `plan.md` §D 6번·§E·§H |

### 감사 제안을 그대로 쓰지 않은 지점 (근거 명시)

보고서는 MF-4 의 수정 방법으로 관측 1을 **음성 열거**(`gateway.ts`·`routes-messages.ts`·`permissions.ts` 가 없을 것)로 바꾸라고 제안했다. 그 방법도 MF-4 를 닫지만 두 가지가 약하다.

1. **여전히 실행 순서에 매여 있다.** 형제 셋 중 하나가 이 SPEC 보다 먼저 도는 순서가 생기면 같은 결함이 되살아난다. MF-4 는 절대 목록이라는 형태 자체의 문제이지 목록에 든 이름의 문제가 아니다.
2. **부재 검사라 이 카드의 주 결함 부류에 해당한다.** "없어야 한다"는 검사는 빈 구현이 가장 잘 통과한다.

리드가 지시한 `AC-MSG-013` 모양(형제 파일 면제 + 기준 SHA diff 가 판정)은 두 문제를 모두 피한다. 관측 4는 **양성** 단언("정확히 두 줄")이라 구현자가 `gateway.ts` 를 미리 만들면 세 번째 줄로 즉시 드러나고, 상대 비교라 형제 SPEC 의 실행 시점과 무관하다. 절대 열거가 하려던 일을 관측 4가 이미 더 정확하게 하고 있었으므로, 관측 1을 존재 확인으로 줄이는 것이 검증 강도를 낮추지 않는다.

### 재-스텁 훑기 (손댄 기준 전수)

이번 교정으로 관측이 바뀐 기준과, 헬퍼 변경으로 영향을 받은 기준을 다시 훑었다. 판정 질문은 그대로다 — **"본문이 빈 구현에서도 이 기준이 통과하는가?"**

| 기준 | 이번에 바뀐 것 | 빈 구현에서 통과하는가 | 근거 |
|------|---------------|----------------------|------|
| AC-SSE-010 | 관측 1이 절대 열거 → `sse.ts` 존재 확인 | **아니다** | 관측 1은 `sse.ts` 부재를 잡고(빈 구현은 파일 자체가 없다), 관측 4는 변경 파일이 **정확히 두 줄**이라는 양성 단언이라 아무것도 안 고친 트리에서 `0` 줄로 실패한다. 관측 2·3(기준 SHA 확인·`db.ts` diff)은 손대지 않았다 |
| AC-SSE-001·002·003·004·005·006·007 | 헬퍼의 쿠키 획득 경로만 바뀜(관측 내용 불변) | **아니다** | 관측은 한 줄도 바뀌지 않았다. 오히려 이전 판에서는 `401` 때문에 정상 구현도 실패했고, 이번 교정으로 **빈 구현만 실패하는 상태가 됐다** |
| AC-SSE-008 | 헬퍼 변경 영향 없음(쿠키를 쓰지 않는 미인증 경로) | **아니다** | `401` 을 양성으로 단언하므로 라우트가 아예 없는 구현(`404`)도 잡는다 |
| AC-SSE-009 | 호출부 쿠키 획득 경로가 바뀜 | **아니다** | `app.hub` 미정의 `TypeError` 또는 라우트 미등록 `404` 로 실패. 이전 판은 `401` 로 먼저 막혀 배선 유무를 아예 관측하지 못했다 |
| AC-SSE-011·012 | 손대지 않음 | **아니다** (012 는 부분적) | AC-SSE-012 셋째 관측의 한계는 v0.1.0 판정 그대로이며, 앞의 두 양성 관측이 빈 파일을 거른다 |

교정 후에도 12개 중 11개가 빈 구현에서 실패하고, 유일한 부분 예외(AC-SSE-012 셋째 관측)는 기준 본문이 그 한계를 명시한 상태 그대로다. 감사가 확인한 "공허한 기준 0건"은 유지된다.

**이번 교정으로 새로 닫힌 것**: 이전 판에는 *정상 구현을 거짓 실패시키는* 기준이 둘 있었다(파일 목록, 쿠키). 둘 다 닫혔다.

### 이번 라운드에서 닫지 않은 것

- MF-1·MF-2·MF-3·MF-5 는 `SPEC-PERM-001` 소관이라 손대지 않았다. 지시 범위 밖이다.
- `reply.hijack()` 없이 Fastify v5 가 견디는지는 여전히 **미검증**이다 (`plan.md` §D 2번). 감사도 이 판단을 뒤집지 않았다.
- AC-SSE-009 의 데이터 디렉터리 격리 방법 확정은 여전히 run 단계 M2 단계 1 소관으로 **미해결**이다.
- `plan.md` §D 5번(채널 설정 전달 방식)은 범위 밖이라 **미해결**로 보존한다.
- 이 교정 이후 재감사를 받지 않았다. 위 재-스텁 훑기는 자체 판정이다 — **미검증**이다.

---

## §E.2 Run-phase Evidence

모든 명령은 워크트리 루트 `.claude/worktrees/t3` (브랜치 `WT-msg-gateway-relay`) 에서 실행했다. 진입 기준선: HEAD `ca6b841` — `npm test -w server -- --run` → **6파일 / 43테스트 통과** (SPEC-MENTION-001 완료 직후 상태). 최종 상태 검증(AC 매트릭스 GREEN 근거 전부)은 **HEAD `3b890c8`** 에서 캡처했다.

### AC 매트릭스 — 12/12 PASS

| AC | 판정 | 관측 근거 (아래 원문 블록 참조) | 캡처 HEAD |
|----|------|-------------------------------|-----------|
| AC-SSE-001 | PASS | `✓ delivers a published event to the room subscriber` | `3b890c8` |
| AC-SSE-002 | PASS | `✓ opens the stream with SSE headers and a connected comment` | `3b890c8` |
| AC-SSE-003 | PASS | `✓ never leaks another room event into this room stream` | `3b890c8` |
| AC-SSE-004 | PASS | `✓ frames events exactly as event/data/blank-line` | `3b890c8` |
| AC-SSE-005 | PASS | `✓ delivers to every subscriber of the room` | `3b890c8` |
| AC-SSE-006 | PASS | `✓ removes the subscriber when the connection closes` | `3b890c8` |
| AC-SSE-007 | PASS | `✓ publishing to a room with no subscribers is a silent no-op` | `3b890c8` |
| AC-SSE-008 | PASS | `✓ rejects an unauthenticated event-stream request` | `3b890c8` |
| AC-SSE-009 | PASS | `✓ wires the hub and the events route into buildServer` | `3b890c8` |
| AC-SSE-010 | PASS | 네 관측 모두 성립 (`sse.ts` 존재·기준 SHA 확인 exit 0·`db.ts` diff 빈 출력·변경 파일 정확히 2줄) | `3b890c8` |
| AC-SSE-011 | PASS | 네 전이(RED-1·GREEN-2·RED-3·GREEN-4) 순서대로 관측, 원문 아래 | 각 단계 |
| AC-SSE-012 | PASS | import 정확히 1줄 = `node:http` 타입 import, 금지 패턴 일치 없음 (exit 1) | `3b890c8` |

AC-SSE-001~009 의 명령은 공통으로 `npm test -w server -- --run --reporter=verbose` 다. 관측 대상 줄(`sse.test.ts` `✓` 9줄 + 요약)만 발췌했다 — 발췌하지 않은 줄은 전부 이 SPEC 이 손대지 않은 기존 테스트의 `✓` 줄이다.

### AC-SSE-011 전이 1 — M1 RED (모듈 부재)

명령: `npm test -w server -- --run` (sse.test.ts 작성 직후, sse.ts 부재). 종료 코드 `1`.

```
 ❯ test/sse.test.ts (0 test)
⎯⎯⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯
 FAIL  test/sse.test.ts [ test/sse.test.ts ]
Error: Cannot find module '../src/sse.js' imported from /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/server/test/sse.test.ts
 ❯ test/sse.test.ts:7:1
      5| import { tmpdir } from 'node:os'
      6| import { join } from 'node:path'
      7| import { createSseHub } from '../src/sse.js'
       | ^
      8| import { registerAuthRoutes, requireAuth } from '../src/auth.js'
      9| import { openDb } from '../src/db.js'
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯⎯
 Test Files  1 failed | 6 passed (7)
      Tests  43 passed (43)
```

원인이 출력에 직접 보인다 — `Cannot find module '../src/sse.js'`.

### AC-SSE-011 전이 2 — M1 GREEN (허브 구현)

명령: `npm test -w server -- --run --reporter=verbose` (sse.ts 생성 직후, 커밋 `3260beb` 직전 작업 트리 — 내용은 커밋과 동일). 이어서 `npm run typecheck -w server` → 종료 코드 `0`.

```
 ✓ test/sse.test.ts > sse > delivers a published event to the room subscriber 116ms
 ✓ test/sse.test.ts > sse > opens the stream with SSE headers and a connected comment 48ms
 ✓ test/sse.test.ts > sse > never leaks another room event into this room stream 47ms
 ✓ test/sse.test.ts > sse > frames events exactly as event/data/blank-line 50ms
 ✓ test/sse.test.ts > sse > delivers to every subscriber of the room 46ms
 ✓ test/sse.test.ts > sse > removes the subscriber when the connection closes 55ms
 ✓ test/sse.test.ts > sse > publishing to a room with no subscribers is a silent no-op 45ms
 ✓ test/sse.test.ts > sse > rejects an unauthenticated event-stream request 45ms
 Test Files  7 passed (7)
      Tests  51 passed (51)
```

### AC-SSE-011 전이 3 — M2 RED (배선 부재)

명령 1: `npx vitest run --run test/sse.test.ts -t 'wires the hub'` (AC-SSE-009 테스트 추가 직후, index.ts 미변경). 종료 코드 `1`.

```
 ❯ server/test/sse.test.ts (9 tests | 1 failed | 8 skipped) 131ms
     × wires the hub and the events route into buildServer 130ms
⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯
 FAIL  server/test/sse.test.ts > sse > wires the hub and the events route into buildServer
Error: 스트림이 프레임 없이 닫혔다
 ❯ readFrame server/test/sse.test.ts:59:21
     57|   for (;;) {
     58|     const { value, done } = await reader.read()
     59|     if (done) throw new Error('스트림이 프레임 없이 닫혔다')
       |                     ^
     60|     buf += Buffer.from(value).toString()
     61|     if (buf.endsWith('\n\n')) return buf
 ❯ server/test/sse.test.ts:215:12
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯⎯
 Test Files  1 failed (1)
      Tests  1 failed | 8 skipped (9)
```

명령 2 (같은 RED 상태에서 원인을 출력에 직접 보이게 한 보조 관측 — `server/` 안에서 `MINIDISCORD_DATA_DIR=$(mktemp -d) npx tsx probe-red-404.mts`, 프로브는 관측 후 즉시 삭제):

```
GET /api/rooms/1/events → 404 | content-type: application/json; charset=utf-8
app.hub → undefined
```

라우트 미등록(`404`)과 `app.hub` 미정의 둘 다 AC-SSE-011 이 명시한 원인이고, 프로브 원문에 그대로 보인다.

### AC-SSE-011 전이 4 — M2 GREEN (최종 상태, HEAD `3b890c8`)

명령: `npm test -w server -- --run --reporter=verbose` → 종료 코드 `0`. 이어서 `npm run typecheck -w server` → 종료 코드 `0`.

```
 ✓ test/sse.test.ts > sse > delivers a published event to the room subscriber 116ms
 ✓ test/sse.test.ts > sse > opens the stream with SSE headers and a connected comment 51ms
 ✓ test/sse.test.ts > sse > never leaks another room event into this room stream 49ms
 ✓ test/sse.test.ts > sse > frames events exactly as event/data/blank-line 49ms
 ✓ test/sse.test.ts > sse > delivers to every subscriber of the room 51ms
 ✓ test/sse.test.ts > sse > removes the subscriber when the connection closes 57ms
 ✓ test/sse.test.ts > sse > publishing to a room with no subscribers is a silent no-op 45ms
 ✓ test/sse.test.ts > sse > rejects an unauthenticated event-stream request 46ms
 ✓ test/sse.test.ts > sse > wires the hub and the events route into buildServer 46ms
 Test Files  7 passed (7)
      Tests  52 passed (52)
```

### AC-SSE-010 — 범위 경계와 스키마 불변 (HEAD `3b890c8`)

관측 1 — `ls server/src` (종료 코드 `0`):

```
auth.ts config.ts db.ts index.ts mention.ts routes-bots.ts routes-rooms.ts sse.ts
```

`sse.ts` 가 있다. `mention.ts` 는 형제 SPEC(SPEC-MENTION-001) 산출물로 이 관측의 판정 대상이 아니다 (v0.2.0 교정, 감사 지적 MF-4). 항목 수는 세지 않는다.

관측 2 — `git rev-parse --verify "$(cat .moai/specs/SPEC-SSE-001/.spec-base-sha)^{commit}"` (종료 코드 `0`):

```
ca6b841e2986a10ddcc7592f615234f75a3f8f7c
```

관측 3 — `git diff --stat ca6b841e2986a10ddcc7592f615234f75a3f8f7c -- server/src/db.ts` (종료 코드 `0`, **출력 없음**):

```
(빈 출력)
```

관측 4 — `git diff --name-only ca6b841e2986a10ddcc7592f615234f75a3f8f7c -- server/src` (종료 코드 `0`):

```
server/src/index.ts
server/src/sse.ts
```

정확히 두 줄이다. (관측 3·4 에 SHA 를 직접 적은 것은 `$(cat …)` 을 품은 `git diff` 가 워크트리 격리 가드에 걸리기 때문이라 acceptance.md 본문이 명시한다 — 실제로 이번 실행에서도 해당 형태는 가드가 거부했다.)

### AC-SSE-012 — 순수 메모리 구조이며 하트비트가 없다 (HEAD `3b890c8`)

명령 1 — `grep -c "^import" server/src/sse.ts` (종료 코드 `0`):

```
1
```

명령 2 — `grep -n "^import" server/src/sse.ts` (종료 코드 `0`):

```
2:import type { ServerResponse } from 'node:http'
```

명령 3 — `grep -nE "setInterval|setTimeout|^retry:|\\nretry:|\\nid:" server/src/sse.ts` (종료 코드 `1`, 일치 없음):

```
(빈 출력 — 일치 없음)
```

### 데이터 디렉터리 격리 결정 (M2 단계 1 — plan.md §E 에서 run 단계로 위임된 항목)

**결정**: AC-SSE-009 테스트 안에서 `process.env.MINIDISCORD_DATA_DIR` 을 `mkdtempSync` 임시 경로로 설정하고, `cleanups` 에 이전 값 복원 + 임시 디렉터리 삭제를 등록한다. `buildServer()` 는 그 뒤에 호출한다.

**근거**: `config.dataDir` 은 게터로 지연 평가된다 (`server/src/config.ts` 4-5행 — "테스트가 import 이후에 MINIDISCORD_DATA_DIR 을 설정해도 반영되도록"). 모듈 import 시점이 아니라 `buildServer()` 호출 시점에 값을 읽으므로, 테스트 본문에서 설정한 환경변수가 그대로 반영된다. vitest 는 파일별 격리(`isolate`)로 실행되므로 다른 테스트 파일로의 누출이 없고, 복원 코드가 같은 테스트 안에서 값을 되돌린다. 저장소의 진짜 `data/` 디렉터리는 AC-SSE-009 실행 중 한 번도 열리지 않는다 — 임시 경로 아래 `minidiscord.db`·`uploads/` 가 만들어지고 `cleanups` 가 삭제한다.

### Gaps (미관측)

- **커버리지 수치를 측정하지 않았다.** 이 워크스페이스에 커버리지 도구 배선(vitest coverage provider)이 없고, `acceptance.md` 품질 게이트도 이 SPEC 에 커버리지 명령을 요구하지 않는다. 85% 기준의 기계적 측정값은 없다.
- **verbose 전체 출력(약 55줄) 중 관측 대상 줄(`sse.test.ts` `✓` 9줄 + 요약 2줄)만 발췌해 기록했다.** 발췌하지 않은 줄은 전부 이 SPEC 이 손대지 않은 기존 테스트의 `✓` 줄이다.
- **전이 2(M1 GREEN) 출력은 커밋 `3260beb` 직전 작업 트리에서 캡처했다.** 내용은 커밋과 동일하지만, 커밋된 SHA 에서 재실행한 것은 아니다 — 최종 상태(전이 4)는 HEAD `3b890c8` 에서 재검증했으므로 이 차이는 매트릭스 판정에 영향을 주지 않는다.
- **보조 프로브 2건(`probe-sse-close.mts`, `probe-red-404.mts`)은 커밋하지 않고 삭제했다.** 원문 출력은 이 §E.2 에 보존했지만 재현 스크립트는 보존하지 않았다. 첫 프로브는 구현 착수 전 `app.close()` 가 열린 SSE 연결과 함께 완료되는지 확인한 것으로, 골격의 `afterEach` 정리 순서(app.close 먼저, abort 나중)가 이 환경(Fastify 5.12 / Node 24)에서 교착 없이 끝남을 관측했다 — 골격을 한 글자도 바꾸지 않은 근거다.

### Residual-risk (잔여 위험)

- **이미 끊긴 응답에 `publish` 하는 경합** — `close` 정리와 `publish` 가 겹치는 창은 이론적으로 남는다 (plan.md §E 수용 항목). 이번 실행 전체에서 해당 예외는 관측되지 않았다.
- **`app.close()` 가 열린 SSE 연결과 함께 완료된다는 관측은 이 환경(Fastify 5.12.1 / Node 24.12)에서만 확인했다.** 다른 Node/Fastify 판에서의 재관측은 하지 않았다 — 구버전 조합에서 골격의 정리 순서가 교착될 수 있다면 그때 블로커로 보고한다.
- **비숫자 `:id`(NaN 방 번호) 동작** — `Number('abc')` → `NaN` 이 `Map` 키로 쓰이는 경로는 엣지 케이스 표로 문서화만 했고 별도 테스트는 없다 (acceptance 엣지 케이스 표가 "수용"으로 명시한 설계).
- **빈 집합 방 항목 삭제(`rooms.delete`)와 빈 집합 잔존을 구분하지 않는다** — `subscriberCount` 는 둘 다 `0` 을 돌려준다. acceptance 본문이 관측 가치가 없어 의도적으로 구분하지 않았다고 명시한 상태 그대로다.
- **구현의 `reply.hijack()` 필수성** — 하이재킹 없이도 견디는지는 여전히 확인하지 않았다(확인할 이유가 없어졌다). 하이재킹을 넣은 채 52 테스트가 통과했다는 관측만 있다 (plan.md §D 2번의 "미검증" 항목이 실제 문제를 일으키지 않았음을 관측한 상태).

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-SSE-001
tier: M
card: t3
milestone: M3
cycle_type: tdd
spec_base_sha: ca6b841e2986a10ddcc7592f615234f75a3f8f7c
run_commit_sha: 3b890c8973e84d2705f249b400a3628736d43340
evidence_head_sha: 3b890c8973e84d2705f249b400a3628736d43340
evidence: .moai/specs/SPEC-SSE-001/progress.md §E.2 (RED 2건·GREEN 2건 원문 + AC 매트릭스 12/12 PASS)
files_created:
  - server/src/sse.ts
  - server/test/sse.test.ts
files_modified:
  - server/src/index.ts        # 배선만 — createSseHub import·declare module hub·decorate·이벤트 라우트 등록
files_unchanged_invariant:
  - server/src/db.ts           # SCHEMA 불변 — AC-SSE-010 관측 3 (기준 SHA 대비 diff 빈 출력·exit 0)
test_result: "52 passed / 52 (7 files; 진입 기준선 6파일 43테스트 포함, 이 SPEC 신규 9)"
typecheck: "exit 0"
boundary: "git diff --name-only <spec_base_sha> -- server/src → 정확히 2줄 (index.ts, sse.ts) · exit 0"
data_dir_isolation: "AC-SSE-009 테스트 안에서 MINIDISCORD_DATA_DIR 을 mkdtemp 임시 경로로 설정·복원 (config.dataDir 게터 지연 평가) — 진짜 data/ 미개방"
commits:
  - 3260bebf4987958c8a38e5db26517c6dff23b1ab  # feat: SSE hub with per-room subscription (card t3) — 구현 + 프론트매터 draft→in-progress
  - 3b890c8973e84d2705f249b400a3628736d43340  # feat: wire SSE event stream route into buildServer (card t3)
  - baba5c53c8163f539561998d79b6ba9c36c4e553  # docs(SPEC-SSE-001): run-phase 증거 기록 (§E.2·§E.3) — SHA 백필 커밋이 이 줄을 채움
```

---

## §E.4 Sync-phase Audit-Ready Signal

> 이 절은 최초 마감 시점의 기록이다. 그 뒤 sync-audit 이 FAIL 을 내 마감이 되돌려졌고,
> 수정 3라운드와 감사 3회를 거쳐 §E.7 에서 다시 닫혔다. **현재 유효한 판정은 §E.7 이다.**

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-27
sync_commit_sha: "309fcb78747e928421992c71a710e1e28fb99352"
spec_id: SPEC-SSE-001
card: t3
milestone: M3
worktree: .claude/worktrees/t3 (WT-msg-gateway-relay)
head_at_sync_evidence: "8c4798a"
sync_session: 9d51afd1-8226-4e22-946e-2ed4574a878e
lens: "--security --deep"
docs_updated: [README.md, CHANGELOG.md]
status_transition: "in-progress → implemented → completed (단일 sync 커밋)"
# --- 아래 4줄은 3차 감사 PASS 후 갱신 (§E.7). 위 sync_commit_sha 는 최초 마감 커밋이며,
# 그 마감은 sync-audit FAIL 로 되돌려졌다가 이 재마감으로 다시 닫혔다.
revalidated_at_head: "<재마감 커밋 직후 백필>"
revalidated_verdict: "PASS — .moai/reports/t3/sync-audit-3.md (기준 HEAD 8c15698)"
revalidated_tests: "104 passed / 104, exit 0 · typecheck exit 0 (sync 세션 직접 실행)"
revalidated_evidence: .moai/state/verify/9d51afd1/test-final.txt · typecheck-final.txt
```

### Claim (주장)

`SPEC-SSE-001` 의 run 단계 산출물이 sync 세션의 **독립 재실행**으로 확인되었다. SSE 허브 테스트 9건이 전부 통과하고 타입 검사가 깨끗하며, 실시간 스트림의 인증 경계와 방 격리에 대한 보안 렌즈 검토에서 차단 사항이 나오지 않았다.

### Evidence (증거)

sync 세션이 직접 실행해 관측했다. 원문은 `.moai/state/verify/9d51afd1/test-verbose.txt` 에 남겼다.

```
$ npm test -w server -- --run --reporter=verbose
 ✓ test/sse.test.ts > sse > delivers a published event to the room subscriber 134ms
 ✓ test/sse.test.ts > sse > opens the stream with SSE headers and a connected comment 51ms
 ✓ test/sse.test.ts > sse > never leaks another room event into this room stream 49ms
 ✓ test/sse.test.ts > sse > frames events exactly as event/data/blank-line 51ms
 ✓ test/sse.test.ts > sse > delivers to every subscriber of the room 50ms
 ✓ test/sse.test.ts > sse > removes the subscriber when the connection closes 60ms
 ✓ test/sse.test.ts > sse > publishing to a room with no subscribers is a silent no-op 48ms
 ✓ test/sse.test.ts > sse > rejects an unauthenticated event-stream request 51ms
 ✓ test/sse.test.ts > sse > wires the hub and the events route into buildServer 61ms
 Test Files  10 passed (10)
      Tests  98 passed (98)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

보안 렌즈 — 이벤트 라우트의 진입 검사를 코드에서 직접 확인했다.

```
$ grep -n "preHandler" server/src/index.ts
57:  app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
```

방 격리는 `never leaks another room event into this room stream` 한 줄이 양성으로 지킨다 — 다른 방 이벤트가 흘러들면 실패하는 테스트다.

### Baseline-attribution (baseline 귀속)

- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `8c4798a`.
- run 단계 §E.3 은 `52 passed / 52 (신규 9)` 를 기록했다. sync 시점 `test/sse.test.ts` 자체 건수는 **9 로 변함이 없다** — 총계 98 은 형제 SPEC 3벌이 위에 얹힌 결과다.
- 스키마 불변 주장(AC-SSE-010)은 §E.2 의 기준 SHA 대비 diff 관측이 근거이며, sync 세션이 다시 재지 않았다.

### Gaps (미검증)

- 커버리지 수치 미측정 (`@vitest/coverage-v8` 미설치).
- **방 멤버십은 검사하지 않는다.** 로그인한 사용자면 누구나 임의의 방 이벤트 스트림을 열 수 있다. 이 프로젝트에 아직 멤버십 모델 자체가 없어 이번 범위 밖이며, `SPEC-PERM-001` spec.md §5 의 미결 질문과 같은 부류다 — 리드 판정 대기.
- 프록시·역방향 프록시 뒤에서의 버퍼링 동작은 실환경에서 관측하지 않았다.

### Residual-risk (잔여 위험)

- 하트비트가 없다(AC-SSE-012, 의도된 설계). 중간 장비가 유휴 연결을 끊으면 브라우저 재연결에 기대야 한다 — 카드 `t5` 웹 UI 에서 실제로 확인할 항목이다.
- 구독자 맵은 프로세스 메모리다. 서버 재시작이면 전부 사라지고 클라이언트가 다시 붙어야 한다.
- 이 분기는 아직 머지되지 않았다.

---

## §F Phase 4 Mode Selection

- 입력: tier M / 범위 3개 파일 (sse.ts 신규, index.ts 수정, sse.test.ts 신규) / 도메인 1 (server) / 언어 TypeScript / 병렬 이득 낮음
- direct: 미선택 — 다중 파일 신규 코드+테스트 작성
- serial: 선택 — 코딩 중심 구현의 기본값; 선행 SPEC-MENTION-001 산출물(mention.ts)을 계약으로 소비하고 후행 GATEWAY가 이 SPEC의 publish 계약에 결합
- fanout: 미선택 — 단일 도메인 구현 작업 (코딩 병렬성 경고)
- sweep: 미선택 — 30파일 미만, 기계적 일괄 변환 아님

Decision: serial
Implementation Kickoff Approval: 통과 — 리드 디스패치 gate 필드로 운영자 승인 전달됨 (2026-08-27)
기록 시점 HEAD: ca6b841 (SPEC-MENTION-001 run 완료 직후)

---

## §E.5 Sync-audit Response — 감사 FAIL 대응 라운드

sync 단계 독립 감사(`.moai/reports/t3/sync-audit.md`, `--security --deep`)가 **FAIL** 을 냈다
(Security 45/100, 임계 70). 리드가 판정을 채택하고 차단 3건 수정 + 재감사를 지시했다.
그에 따라 `status` 를 `completed` → `in-progress` 로 되돌렸고, §E.4 는 **재감사 PASS 전까지 유효하지 않다.**

### 이 SPEC 에서 바뀐 것

없다. 차단 3건 중 이 SPEC 이 소유한 항목은 없고, `sse.ts` 는 손대지 않았다.
다만 F-03 의 근거인 '루프백 전용' 전제는 이 SPEC 이 방 멤버십을 뺀 근거와 같다.

### 프로젝트 전역에서 바뀐 것 — F-03 (High)

`server/src/index.ts` 가 `0.0.0.0` 에 바인드했다. README 는 "내 PC에서만 도는 서버"라는 전제 위에서
HTTPS·CSRF·세션 만료·권한 구분을 뺐다고 명시하는데, 코드가 그 전제를 지키지 않았다. 개방 가입과
겹치면 같은 네트워크의 누구나 계정을 만들어 모든 방을 읽고, 쓰고, 봇의 도구 승인까지 할 수 있었다.

수정: `config.host` 를 추가하고 기본을 `127.0.0.1` 로 두었다. 넓히려면 `MINIDISCORD_HOST` 를 명시해야 한다.

### 재실행 결과

```
$ unset MOAI_KANBAN … && npm test -w server -- --run
 Test Files  10 passed (10)
      Tests  100 passed (100)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

진입 98 → 100 (경로 봉인 1건 + 저장 경로 비노출 1건).

### 이 라운드에서 닫지 않은 것

- **비차단 8건(F-04..F-11)** 은 손대지 않았다. 리드가 F-04·F-05 를 별도 백로그 카드로 적립했고
  나머지는 그대로 남는다.
- **방 멤버십 모델**은 여전히 없다. F-03 수정은 그 부재가 기대는 전제(루프백 전용)를 코드로 되돌린
  것이지, 인가를 넣은 것이 아니다.
- **spec.md 본문에 새 요구사항 항목을 추가하지 않았다.** 출처 경로 봉인은 감사 대응으로 들어간
  코드이고 `spec.md` 본문은 manager-spec 소유라, 요구사항 번호 부여는 후속 몫으로 남긴다 —
  현재 근거는 이 §E.5 와 감사 보고서다.
- **재감사를 아직 받지 않았다.** 이 절을 쓰는 시점에 판정은 여전히 FAIL 이다.

---

## §E.6 Re-audit Response — 재감사 CONDITIONAL PASS 대응

재감사(`.moai/reports/t3/sync-reaudit.md`, HEAD `2a3c0fc`)가 **CONDITIONAL PASS** 를 냈다
(가중 조화평균 74.8, 직전 66.8; Functionality 74 / Security 72 / Craft 78 / Consistency 78, 임계 70·70·60·60).
직전 차단 3건 중 F-01·F-03 은 CLOSED, F-02 는 **PARTIALLY CLOSED** 판정이었다.

새 지적 6건(N-01..N-06) 중 5건을 이 라운드에서 닫았다.

| # | 내용 | 처리 |
|---|------|------|
| N-01 | 봇 첨부 메시지의 SSE 발행 프레임이 `stored_path` 를 그대로 내보냄 (`gateway.ts:166`) | 닫음 — SELECT 를 `id, filename` 으로 축소 |
| N-02 | `resolve()` 는 어휘적 정규화라 심볼릭 링크를 따라가지 않는데 `copyFileSync` 는 따라감 → 뿌리 안 링크로 바깥 내용을 끌어옴 | 닫음 — 뿌리와 출처 양쪽을 `realpathSync` 로 비교 |
| N-03 | fail-closed 기본값이 아무 신호 없이 봇 첨부를 끔 | 닫음 — 기동 시 `console.warn` 한 줄 |
| N-04 | `SPEC-CORE-001` REQ-CORE-010 이 여전히 `0.0.0.0` 을 요구 (status 도 `completed`) | **닫지 않음 — 리드 판정 대기.** SPEC 본문 개정은 manager-spec 소유이며 이 카드 범위 밖이다 |
| N-05 | README 한 문장이 코드보다 넓게 약속 | 닫음 — N-01 수정으로 참이 되었고, SSE·봇 프레임의 비대칭을 문장에 명시 |
| N-06 | `2a3c0fc` 이 `.moai/specs/.moai/state/` 잔여물 3개를 **추적 대상으로** 만듦 | 닫음 — `git rm --cached` + `.gitignore` 에 `**/.moai/state/` (루트 `.moai/state/` 는 예외) |

**N-01 은 직전 감사가 이름 붙인 결함 부류가 같은 카드 안에서 재생산된 것이다.** F-02 를 고치면서
`routes-messages.ts` 의 HTTP 응답 두 곳만 보고 `gateway.ts` 의 허브 발행 프레임을 놓쳤다 —
"한 파일 안에서 봉인을 확인하면 그 파일의 입구만 확인된다"는 지적을 읽고도 같은 모양으로 반복했다.
`attachments` 표를 읽어 밖으로 내보내는 자리를 전수 조사하는 것이 옳은 검사였다.

### 재실행 결과

```
$ unset MOAI_KANBAN … && npm test -w server -- --run
      Tests  102 passed (102)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

98 → 102. 새 테스트 2건(`AC-GW-023` 심볼릭 링크, `AC-GW-024` 허브 프레임)은 **수정을 되돌려
실패하는 것까지 관측했다.**

```
# realpathSync → resolve 로 되돌린 상태
AssertionError: expected [ '겉보기정상.txt', '진짜.txt' ] to deeply equal [ '진짜.txt' ]
# 허브 SELECT 에 stored_path 를 되돌린 상태
AssertionError: expected { id: 1, filename: '첨부.txt', …(1) } to not have property "stored_path"
      Tests  1 failed | 101 skipped (102)
```

### 이 라운드에서 닫지 않은 것

- **N-04 (SPEC-CORE-001 REQ-CORE-010)** — 리드 판정 대기. 코드가 이제 그 요구사항을 위반한다.
- **비차단 F-04..F-11** — 리드가 F-04·F-05 를 별도 백로그 카드로 적립했고 나머지는 그대로다.
- **세 번째 재감사를 받지 않았다.** 이 절을 쓰는 시점의 최신 판정은 CONDITIONAL PASS 이며,
  그 판정이 관측한 트리에는 위 5건의 수정이 아직 들어 있지 않다.

---

## §E.7 Third-Audit Response — 3차 감사 PASS 및 잔여 처리

3차 감사(`.moai/reports/t3/sync-audit-3.md`, 기준 HEAD `8c15698`)가 **PASS** 를 냈다.
차단 findings 잔여 0건 — Functionality 82 / Security 84 / Craft 78 / Consistency 78 (임계 70·70·60·60).
감사 3회의 궤적: FAIL 66.8 (`eaebe1e`) → CONDITIONAL PASS 74.8 (`2a3c0fc`) → **PASS** (`8c15698`).

직전 findings 전원 처리 결과 (전부 3차 감사가 이번 트리에서 관측):

| ID | 3차 판정 | 근거 |
|----|----------|------|
| F-01 봇 첨부 임의 파일 읽기 | **CLOSED (무조건)** | 검사식 8경우 프로브 전원 fail-closed |
| F-02 `stored_path` 노출 | **CLOSED** | 실제 HTTP 소켓에 도착한 SSE 프레임 원문 관측 — `{id, filename}` 만 |
| F-03 `0.0.0.0` 바인드 | **CLOSED** | 실행 관측 `minidiscord listening on 127.0.0.1:4321` |
| N-01 SSE 경로 노출 | **CLOSED** | 위 프레임 관측 + 변이 검증 |
| N-02 심볼릭 링크 우회 | **CLOSED** | 8경우 프로브 |
| N-03 조용한 fail-closed | **CLOSED** | 출하 경로에서 경고 실제 출력 확인 |
| N-04 SPEC-CORE-001 `0.0.0.0` | **CLOSED** | 리드가 `b2d4b4a` 로 REQ-CORE-010 개정 (+ `8c15698` REQ-CORE-005 정렬) |
| N-05 README 문장 | **CLOSED (거의)** | N-07 만큼만 여전히 넓음 |
| N-06 `.moai` 잔여물 추적 | **CLOSED** | `.gitignore` 규칙 실동작 확인 |

### 이 라운드에서 닫은 것 — N-08 (Medium)

감사가 변이 검증으로 **출하 기본값 세 가지에 회귀 테스트가 없다**는 것을 드러냈다. 되돌려도
102개가 전부 초록이었다 — 앞선 두 감사가 "출하 기본 경로에서는 도달 불가능"을 근거로 잔여 위험을
낮게 매겼는데, **그 근거 자체를 지키는 테스트가 없었다.**

테스트 3건 추가 (102 → 104; `config.test.ts` 는 기존 두 케이스에 단언을 얹어 건수가 늘지 않는다):

- `config.test.ts` — `config.host` 기본 `127.0.0.1` · `config.botFilesDir` 기본 `undefined`,
  그리고 `MINIDISCORD_HOST` / `MINIDISCORD_BOT_FILES_DIR` 재정의 관측 (기존 `vi.resetModules()` 패턴)
- `AC-GW-025` — `botFilesDir` 미설정이면 뿌리 안의 정상 파일도 첨부되지 않는다 (본문은 저장됨)
- `AC-GW-026` — 허용 뿌리와 문자열 접두사가 겹치는 **형제 디렉터리**(`<root>evil`)는 거부된다.
  `gateway.ts` 주석이 방어한다고 적어 둔 `+ sep` 를 실제로 고정한다

세 건 모두 **변이 검증으로 분별력을 확인했다** — 구현을 하나씩 되돌려 정확히 해당 테스트 하나만 운다.

```
# 변이 A — 기본 호스트를 0.0.0.0 으로 되돌림
AssertionError: expected '0.0.0.0' to be '127.0.0.1'
      Tests  1 failed | 103 passed (104)

# 변이 B — botFilesDir 미설정 시 fail-open 으로 되돌림
AssertionError: expected { c: 1 } to deeply equal { c: +0 }
      Tests  1 failed | 103 passed (104)

# 변이 C — `+ sep` 제거 (형제 접두사 통과)
AssertionError: expected [ 'secret.txt', '진짜뿌리안.txt' ] to deeply equal [ '진짜뿌리안.txt' ]
      Tests  1 failed | 103 passed (104)
```

### 최종 재실행 결과

```
$ unset MOAI_KANBAN … && npm test -w server -- --run
      Tests  104 passed (104)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

증거 원문: `.moai/state/verify/9d51afd1/test-final.txt`, `typecheck-final.txt`.

### 이 라운드에서 닫지 않은 것

- **N-07 (Low)** — 첨부 행은 있고 디스크의 파일이 없을 때 `GET /api/attachments/:id` 의 500 본문에
  `stored_path` 가 실린다(감사자 재현). **후속 카드로 넘긴다** — 운영자 결정. 원격 공격자가
  유발할 수 없는 경로이나, 새는 정보는 F-02 와 같은 종류이고 받는 사람도 같다.
  닫는 값은 `existsSync` 한 줄 + 테스트 1건.
- **N-09 (Low)** — `SPEC-CORE-001` AC-CORE-012(`ls server/src` → 정확히 3파일)가 현재 트리에서
  실패한다(파일 11개). 시점 한정이 없는 AC 의 문제이며 **SPEC 소유권상 리드 판정 사항**이다.
- **F-04..F-08 (비차단)** — 심각도 변화 없음. F-04·F-05 는 리드가 백로그 카드로 적립.
- **F-09 재발** — §E.6 의 RED 블록도 `-t` 로 필터링한 실행 결과인데 발췌라고 밝히지 않았다.
  이 §E.7 의 변이 검증 블록 세 개도 전체 실행 결과이며 `Tests` 줄만 인용한 발췌다 — 밝혀 둔다.

### 이 카드가 남긴 방법론

같은 결함 부류가 이 카드에서 **세 번** 나왔고, 세 번 다 "훑었다"고 믿은 뒤에 나왔다.
1차는 한 파일의 출구만, 2차는 두 파일의 정상 출구까지, 3차는 **오류 출구**(N-07).
열거로는 매번 한 칸씩 모자랐고, 실제로 부류를 닫은 것은 **변이 검증** 이었다 —
테스트를 읽는 대신 구현을 되돌려 테스트가 우는지 보는 것.
물어야 할 질문은 "이 값을 읽는 자리가 어디인가"가 아니라 **"이 값이 어떤 봉투에 담겨 나갈 수 있는가"** 다.
