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
| 현재 상태 | `in-progress` — run 단계 (M1 허브 완료, M2 배선 대기) |
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

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_

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
