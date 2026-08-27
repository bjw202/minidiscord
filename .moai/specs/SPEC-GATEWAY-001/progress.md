# SPEC-GATEWAY-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-GATEWAY-001` |
| 칸반 카드 | `t3` (마일스톤 M3) |
| Tier | L |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 8 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 3·6·8·9·10장 |
| 워크트리 | `.claude/worktrees/t3` |
| 선행 SPEC | `SPEC-CORE-001` → `SPEC-BOT-001` (카드 `t2`) → `SPEC-MENTION-001` → `SPEC-SSE-001` |
| 실행 순서 | 카드 `t3` 의 세 SPEC 중 **세 번째(마지막)** |
| 현재 상태 | `in-progress` — M1(접속·인증·재전송·deliver) 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-GATEWAY-001
tier: L
card: t3
depends_on: [SPEC-CORE-001, SPEC-BOT-001, SPEC-MENTION-001, SPEC-SSE-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 8)
source_spec: .moai/plan/2026-08-26-minidiscord/spec-v2.md (3·6·8·9·10장)
spec_version: "0.3.0"
req_count: 23
ac_count: 20
tier_budget: "25 REQ / 25 AC"
spec_base_sha: "cb90fb3c80e33c25f5e8cf05d9f0a8ce8550350c"
plan_audit: .moai/reports/t3-plan-audit-a.md
plan_audit_verdict: "CONDITIONAL PASS — 차단 3건(M5·M6·M7) + §3-1 반영 완료; 재감사에서 셋 다 RESOLVED, 잔여 §3-2 도 v0.3.0 에서 반영 (§Audit Response)"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-GATEWAY-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 기준점 위에 검사 **두 개**가 올라간다 — `db.ts` 불변과 "손댄 소스 파일은 `gateway.ts`·`index.ts`·`routes-bots.ts` 셋"(둘 다 REQ-GW-023, AC-GW-019).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `spec.md` | GEARS 요구사항 REQ-GW-001..023, 범위 밖 7개 묶음, 제약, 원본 모순 6건 기록 |
| `plan.md` | §A 의존 · §B `Gateway` 시그니처 고정 · §C 단일 커서 · §D 모순 해결 9건 · §E 위험 13건 · §F 마일스톤 M1-M3 · §H 안티패턴 24건 |
| `acceptance.md` | AC-GW-001..020, 공통 테스트 하네스(`expectNoMessage` 포함), 엣지 케이스 11건, 품질 게이트, Definition of Done |
| `progress.md` | 이 문서 |

Tier L 의 표준 산출물 집합은 `design.md`·`research.md` 를 더하지만, 리드 지시(4파일)와 형제 SPEC(`SPEC-BOT-001` 등)의 구성에 맞춰 네 파일로 낸다. 설계 판단은 `plan.md` §B·§C 가, 조사 결과는 `spec.md` §7 과 `plan.md` §D 가 담는다.

### SPEC-ID 검증

```bash
ID="SPEC-GATEWAY-001"
[[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
```

출력:

```
PASS
```

### REQ → AC 커버리지

| REQ | 내용 | 검증 AC |
|-----|------|---------|
| REQ-GW-001 | `hello` → `welcome`, 토큰이 방·봇을 결정, `last_seen_at` 갱신 | AC-GW-001 |
| REQ-GW-002 | 미상·철회·보관 토큰 거절 | AC-GW-002 |
| REQ-GW-003 | 미인증 프레임 거절 | AC-GW-002 |
| REQ-GW-004 | `/bot` 경로, JSON `type`, 파싱 실패 시 종료, `onClose` 정리 | AC-GW-001, AC-GW-002 |
| REQ-GW-005 | 놓친 메시지 재전송 + 커서 이동 | AC-GW-003 |
| REQ-GW-006 | 중복 없음 | AC-GW-003, AC-GW-004 |
| REQ-GW-007 | `deliver` 타깃 전송 + 커서 | AC-GW-005 |
| REQ-GW-008 | `deliver` 비타깃·타방 금지 | AC-GW-005 |
| REQ-GW-009 | `delivery` 봇별, `files` 매핑 | AC-GW-006 |
| REQ-GW-010 | `bot_message` 저장·복사·발행 | AC-GW-007 |
| REQ-GW-011 | 없는 파일 하나만 건너뜀 | AC-GW-008 |
| REQ-GW-012 | `status` → `bot_status` (두 값만) | AC-GW-009 |
| REQ-GW-013 | `isOnline` | AC-GW-010, AC-GW-018 |
| REQ-GW-014 | 이력 기본형 (`rid`·오름차순·`limit`) | AC-GW-011, AC-GW-013 |
| REQ-GW-015 | `since_id` 커서 필터 | AC-GW-012 |
| REQ-GW-016 | 이력의 네 필드 | AC-GW-014 |
| REQ-GW-017 | 이력 응답의 수신자 격리 | AC-GW-015 |
| REQ-GW-018 | `speaker`·`since`·`until` | AC-GW-013 |
| REQ-GW-019 | `closeRoom` 범위 | AC-GW-016 |
| REQ-GW-020 | 권한 릴레이 창구 | AC-GW-017 |
| REQ-GW-021 | `Gateway` 시그니처 | AC-GW-018 |
| REQ-GW-022 | `buildServer` 배선 + `online` | AC-GW-018 |
| REQ-GW-023 | 범위 경계·스키마 불변 | AC-GW-019 |
| (전 구간) | RED→GREEN 전이 | AC-GW-020 |

미커버 요구사항 없음.

### 수용 기준 자기 점검 — "스텁에도 통과하는 기준이 있는가"

작성 후 스무 기준을 **부류로 한 번에** 훑었다. 판정 질문은 하나다: *구현 본문이 비어 있거나 상수를 돌려줘도 이 단언이 통과하는가?*

| 위험 부류 | 해당 기준 | 넣은 방어 |
|-----------|-----------|-----------|
| 상수 반환 | AC-GW-001, 010, 011, 014, 017, 018 | 한 테스트 안에서 **서로 다른 입력이 서로 다른 답**을 내는지 대조 (토큰 둘 / 방·봇 조합 넷 / `rid` 둘 / 작성자 셋 / 온라인·오프라인 / `false`→`true`) |
| 필터 부재 | AC-GW-012, 013 | **대조군** — 같은 테스트에서 필터 없는 요청도 보내고, 건수 차이가 DB 의 실제 제외 대상 수와 같은지 확인 |
| 과잉 전송 | AC-GW-003, 004, 005, 015 | **부정 관측** `expectNoMessage` — 오지 말아야 할 것이 오지 않음을 관측 |
| 전부 거절 / 전부 허용 | AC-GW-002, 016 | 같은 테스트 안에 **정상 경로 대조군**(정상 토큰 환영 / 다른 방 왕복 성공) |
| 처리 자체를 생략 | AC-GW-007, 008, 009 | 건수 단언(`toHaveLength`)과 정상·비정상 혼합 입력 |
| 이름만 있고 실행되지 않음 | 전 기준 | 명령을 `--reporter=verbose` 로 고정하고 `✓ …` 줄 자체를 1차 관측 대상으로 삼음 |

"파일이 있다", "함수가 export 됐다", "스위트가 통과한다"만으로 이루어진 기준은 없다. 재작성한 항목은 AC-GW-008(원본 테스트가 없는 파일 하나만 보내 첨부 수 `0` 을 단언 → 정상 파일을 섞어 "하나만" 을 관측)과 AC-GW-007·009(원본이 허브 발행 관측을 포기 → 하네스에서 `publish` 를 감싸 건수까지 관측) 두 부류다.

### 이 단계에서 하지 않은 것 (Gaps)

- **테스트를 실행하지 않았다.** plan 단계이므로 `npm test -w server` 를 한 번도 돌리지 않았다. `acceptance.md` 의 테스트 본문은 아직 **검증되지 않은 초안**이며, run 단계에서 실제로 실행해 봐야 문법·타이밍 문제가 드러난다.
- **`server/src/sse.ts` 의 반환 형태를 확인하지 못했다.** 이 SPEC 작성 시점에 `SPEC-SSE-001` 은 아직 작성 중이었다. `plan.md` §D 7번의 감싸기가 성립하는지는 M1 단계 0-b 에서 확인한다.
- **`SPEC-MENTION-001`·`SPEC-SSE-001` 의 최종 요구사항 번호를 상호 참조하지 못했다.** 형제 SPEC 이 동시에 작성돼 서로의 최종본을 보지 못했다. 참조는 SPEC-ID 수준까지만 걸었다.
- **끊김 시 `system` 메시지의 처리 방침은 리드 판단 대기다.** `plan.md` §D 1번에 근거를 적었고, 이 SPEC 은 만들지 않는 쪽으로 갔다.

---

## §Audit Response — plan-audit 교정 라운드 (2026-08-27, v0.2.0)

감사 보고서: `.moai/reports/t3-plan-audit-a.md` — 판정 CONDITIONAL PASS, 차단 3건(M5·M6·M7) + 있으면 좋은 것 §3-1.

리드 지시 범위는 **M5·M6·M7 + §3-1** 네 건이다. 아래는 각 건별로 무엇을 어디서 바꿨는지다.

### M5 — 하네스가 `welcome` 직후 프레임을 흘린다

무엇이 문제였나: `wsConnect` 가 `welcome` 을 받은 리스너 안에서 `resolve` 하고, 테스트는 `await` **이후에** `nextMessage` 로 리스너를 붙였다. `handleHello` 는 `welcome` 과 재전송 `message` 를 같은 동기 블록에서 보내므로 루프백에서 두 프레임이 한 TCP 세그먼트로 합쳐질 수 있고, 그러면 재전송 프레임이 리스너가 붙기 전에 지나가 AC-GW-003 이 `timeout waiting ws message` 로 실패한다. **구현이 옳은데도** 실패하는 형태다.

| 파일 | 변경 |
|------|------|
| `acceptance.md` 공통 하네스 | `wsConnect` 가 접속 시점부터 프레임을 큐(`Inbox`, `WeakMap` 으로 소켓별 보관)에 쌓도록 재작성. `nextMessage` 는 큐가 비어 있지 않으면 즉시 꺼내 쓰고, 비어 있을 때만 대기자로 등록한다. `expectNoMessage` 는 **큐에 이미 쌓인 프레임도 실패로** 다룬다 — 대기 시작 전에 도착한 것을 못 본 채 통과하는 것을 막는다 |
| `plan.md` §E | 위험 표에 이 경로를 별도 행으로 추가(기존 "타이밍 의존" 행은 `setTimeout` 만 다뤘다) |
| `plan.md` §H | 안티패턴 추가 — "`await wsConnect(...)` 뒤에 리스너를 붙여 프레임을 기다리기" |

부수 효과로 AC-GW-004(재접속 중복 없음)의 `expectNoMessage` 도 강해졌다 — 이전에는 대기 시작 전에 도착한 중복 프레임을 못 봤을 수 있다.

감사가 명시한 대로 **테스트를 실행해 재현한 것은 아니다.** 코드 대조로 판단했고, 두 프레임이 합쳐지지 않는 환경에서는 이전 하네스도 통과한다. 큐 방식은 두 경우 모두에서 옳다.

### M6 — `last_seen_at` 갱신을 관측하는 기준이 없다

무엇이 문제였나: REQ-GW-001 이 `bot_tokens.last_seen_at` 갱신을 명시적으로 요구하는데 스무 기준 어디에도 그 컬럼을 읽는 단언이 없었다. 갱신을 통째로 생략한 구현이 전부 통과한다.

| 파일 | 변경 |
|------|------|
| `acceptance.md` AC-GW-001 | `seenAt()` 헬퍼를 두고 **접속 전 `toBeNull()` → 접속 후 `not.toBeNull()`** 분별 단언 추가. 값 하나만 보면 스키마 기본값과 갱신을 구분할 수 없어 전후 대조로 했다 |
| `acceptance.md` AC 매트릭스 | AC-GW-001 행의 관측 결과에 `last_seen_at` 항목 추가 |
| `acceptance.md` AC-GW-001 본문 | 관측 개수를 넷 → 다섯으로 고치고, 왜 전후 대조인지 적음 |
| `plan.md` §F M1 3단계 | `handleHello` 구현 지시에 `last_seen_at` 갱신 명시 |
| `plan.md` §H | 안티패턴 추가 — "`last_seen_at` 갱신 생략하기" |
| `progress.md` REQ→AC 표 | REQ-GW-001 행에 `last_seen_at` 명시 |

### M7 — 엣지 케이스 표가 인용한 코드로는 나올 수 없는 동작

무엇이 문제였나: 표는 파싱 불가 프레임에 대해 "예외가 나고 접속이 닫힌다"고 적으면서 `handleWsMessage(ws, JSON.parse(...)).catch(() => ws.close())` 를 근거로 인용했다. 인자는 호출 전에 평가되므로 파싱 예외는 프로미스 체인 **바깥에서 동기적으로** 던져지고 `.catch` 가 잡지 못한다. 관측하는 기준도 없어 **틀린 서술이 계약처럼 남아 있었다.**

감사 권고대로 표만 고치지 않고 **구현 지시를 고쳤다.**

| 파일 | 변경 |
|------|------|
| `plan.md` §D 8번 (신설) | 원본 코드와 결함 메커니즘을 적고, `let msg; try { msg = JSON.parse(String(raw)) } catch { ws.close(); return }` 형태를 지시 |
| `spec.md` REQ-GW-004 | "파싱할 수 없는 프레임은 접속을 닫는 것으로 처리하고, 파싱 예외가 처리되지 않은 채 새어 나가서는 안 된다"를 요구사항으로 명문화 |
| `spec.md` §7 | 원본 모순 표에 6번 행 추가 |
| `acceptance.md` AC-GW-002 | **다섯 번째 거절 경로로 관측 추가** — 인증된 접속에 `'{이건 JSON 이 아니다'` 를 보내고 소켓이 닫히는지, `messages` 가 여전히 0행인지, `isOnline` 이 `false` 인지 본다. vitest 가 unhandled error 를 보고하면 그것도 실패로 다룬다 |
| `acceptance.md` AC-GW-002 | 테스트 이름을 `… unauthenticated and malformed frames` 로 바꾸고 매트릭스·본문·요구사항 매핑(REQ-GW-004 추가) 동기화 |
| `acceptance.md` 엣지 케이스 표 | 해당 행을 실제 동작으로 고치고 검증 열을 "AC-GW-002 의 5번이 직접 관측"으로 바꿈 |
| `plan.md` §H | 안티패턴 추가 — "인자 위치에서 `JSON.parse` 하기" |

### §3-1 (있으면 좋은 것) — AC-GW-019 파일 목록이 형제 SPEC 과 어긋난다

무엇이 문제였나: 1번 관측이 `server/src` 에 정확히 아홉 항목이고 `routes-messages.ts`·`permissions.ts` 가 없어야 통과였다. 카드 `t3` 안의 SPEC 실행 순서가 달라지면 이 SPEC 이 **자기 통제 밖의 이유로** 실패한다.

형제 SPEC 의 AC-MSG-013 서술을 채택했다.

| 파일 | 변경 |
|------|------|
| `acceptance.md` AC-GW-019 1번 | `gateway.ts` 존재 + 선행 SPEC 산출물 여섯만 관측하고, **형제 SPEC 파일(`mention.ts`·`sse.ts`·`routes-messages.ts`·`permissions.ts`)의 존재 여부는 관측 대상에서 제외**. "이 SPEC 이 만들지 않았다"의 판정은 4번의 base-SHA diff 가 전담한다 |
| `acceptance.md` AC 매트릭스 · Definition of Done | 같은 취지로 문구 동기화 |
| `plan.md` §E · §F M3 5단계 | 위험 표 행과 실행 절차를 새 서술에 맞춤 |

### 손댄 기준에 대한 스텁 훑기 재실행

| 기준 | 스텁 통과 가능? | 근거 |
|------|-----------------|------|
| AC-GW-001 | 아니오 | 토큰 둘 분별 + `last_seen_at` 전후 대조. 갱신 생략도 상수 `welcome` 도 여기서 깨진다 |
| AC-GW-002 | 아니오 | 거절 넷 + **정상 토큰 환영 대조군**. "전부 닫는" 구현과 "전부 여는" 구현 양쪽이 배제된다. 5번은 닫힘 + `messages` 0행 + `isOnline false` 세 관측 |
| AC-GW-003·004·005·015 | 아니오 (더 강해짐) | `expectNoMessage` 가 이제 **대기 시작 전에 도착한 프레임도** 실패로 다룬다 — 이전에는 그 창에서 온 과잉 전송을 놓칠 수 있었다 |
| AC-GW-019 | 1번은 약해짐 (의도적) | 1번만 보면 빈 `gateway.ts` 도 통과한다. 다만 1번은 원래 판정을 지는 검사가 아니다 — 범위 경계는 3번(`db.ts` diff 빈 출력)과 4번(변경 파일 정확히 세 줄)이, 내용은 열여덟 개 동작 테스트가 진다. 1번을 강하게 두면 형제 SPEC 순서에 따라 통제 밖 실패가 나므로 맞바꿈이 옳다고 판단했다 |

### 이번 범위에서 적용하지 않은 것 (판단 필요) — §3-2 는 이후 라운드에서 닫힘

> **후속 처리 (v0.3.0, 아래 § 재감사 후속 라운드 참조).** 아래 §3-2 는 리드 판단을 받아 반영했다. §3-3 은 여전히 범위 밖이다.

- **감사 §3-2 — REQ-GW-010 이 `attachments.size`·`mime` 을 지정하지 않는다.** 두 컬럼 모두 `NOT NULL` 이라, 요건대로만 구현하면 INSERT 가 제약 위반으로 던지고 `handleBotMessage` 의 `catch` 에 삼켜져 **첨부가 조용히 사라진다**(원본은 `statSync().size` 와 `'application/octet-stream'` 을 쓴다). 리드 지시 범위(M5·M6·M7 + §3-1) 밖이라 손대지 않았다. 실질 결함으로 보이므로 판단을 요청한다 — AC-GW-007 이 첨부 행을 읽으므로 관측은 되지만, 요구사항이 값을 지정하지 않는 한 구현자가 빠뜨릴 여지가 남는다.
- 감사 §3-3(검증되지 않는 잔여 요건 — `limit` 기본값 `100`/상한 `500`, `author_name` 대체값, 빈 `files` 배열)도 범위 밖이라 그대로 두었다.

### 재감사 후속 라운드 — §3-2 첨부 컬럼 (2026-08-27, v0.3.0)

재감사에서 M5·M6·M7 세 건은 **RESOLVED** 로 확인됐고, 하네스 교체는 AC-GW-003·004·005·015 를 약화가 아니라 **강화**한 것으로 판정됐다. 남은 것은 v0.2.0 에서 판단 요청으로 올려 둔 §3-2 하나였고, 리드가 원본 근거(`plan-v2.md:1534`, `:1537-1538`)와 스키마(`server/src/db.ts:60-61`)를 직접 확인해 회신했다. 설계 결정이 필요한 자리가 아니라 원본이 이미 답을 갖고 있는 자리였다.

무엇이 문제였나: `attachments` 의 `size` 와 `mime` 은 `NOT NULL` 인데 REQ-GW-010 이 그 출처를 말하지 않았다. 요건대로만 구현하면 INSERT 가 제약 위반으로 던지고, 그 예외를 REQ-GW-011 의 "없는 파일은 그 첨부만 건너뛴다" `catch` 가 그대로 삼킨다 — 파일이 멀쩡한데도 **메시지는 저장되고 첨부만 조용히 사라지며 로그도 남지 않는다.** 침묵하는 실패라 발견이 가장 늦는 부류다.

| 파일 | 변경 |
|------|------|
| `spec.md` REQ-GW-010 | 다섯 컬럼 출처 표 추가 — `size` 는 복사 시점에 읽은 원본의 바이트 크기(`statSync(local_path).size`), `mime` 은 상수 `'application/octet-stream'`, 나머지 셋(`filename`·`stored_path`·`message_id`)도 함께 명시. `NOT NULL` 이라 빠뜨리면 첨부가 사라진다는 이유도 요구사항 본문에 적음 |
| `spec.md` REQ-GW-010 | 게이트웨이의 상수 `mime` 이 **의도된 것**이고 `SPEC-MSG-001` 의 확장자 판정과 다르다는 것을 명시 — 두 경로가 같은 테이블에 다른 규칙으로 쓰는 것이 정상이며 "통일" 하려 해서는 안 된다 |
| `plan.md` §D 9번 (신설) | 결함 메커니즘, 원본 근거 두 줄, `mime` 상수의 설계 의도를 기록 |
| `plan.md` §E | 위험 표에 "`NOT NULL` 컬럼을 빠뜨림 — 침묵하는 실패" 행 추가 |
| `plan.md` §F M2 3단계 | `handleBotMessage` 구현 지시에 "첨부 다섯 컬럼 전부" 와 두 값의 출처 명시 |
| `plan.md` §H | 안티패턴 두 건 추가 — "`size`·`mime` 을 비워 두기", "게이트웨이에서 확장자로 `mime` 판정하기" |
| `acceptance.md` AC-GW-007 | 관측 추가 — `expect(att).toBeDefined()`(침묵하는 실패를 깨는 단언), `att.size` 가 원본의 실제 바이트 길이와 일치, `att.mime` 이 상수와 일치 |
| `acceptance.md` AC 매트릭스 · AC-GW-007 본문 | 관측 개수를 여섯 → 여덟로 고치고, `size` 단언이 왜 두 번째 무게 중심인지 적음 |

### 스텁 훑기 — AC-GW-007 (이번에 손댄 유일한 기준)

| 넣은 단언 | 배제하는 구현 |
|-----------|---------------|
| `expect(att).toBeDefined()` | `size`/`mime` 을 빠뜨려 INSERT 가 던지고 `catch` 에 삼켜진 구현. 이 줄이 없으면 아래 단언들이 `undefined` 접근으로 깨지긴 하나, 실패 원인이 "첨부가 아예 없다"임이 드러나지 않는다 |
| `expect(srcBytes).toBe(15)` | 테스트 자체가 틀린 경우. 본문 `'# 결과\n완료'` 는 문자 8개지만 UTF-8 로 15바이트이며, 이 줄이 그 전제를 고정한다 |
| `expect(att.size).toBe(srcBytes)` | `size: 0`, `size: 1`, 상수 아무 값, 그리고 **문자 길이(8)를 넣은 구현** — 세 부류가 모두 깨진다. 한글이 섞인 본문을 고른 이유가 마지막 부류 때문이다 |
| `expect(att.mime).toBe('application/octet-stream')` | 확장자 판정(`.md` → `text/markdown`)으로 "개선" 한 구현. `SPEC-MSG-001` 규칙을 게이트웨이에 가져오는 것을 여기서 막는다 |

빈 구현·상수 반환으로 통과하는 경로는 남아 있지 않다.

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

- 입력: tier L / 범위 4개 파일 (gateway.ts·테스트 신규, index.ts·routes-bots.ts 수정) / 도메인 1 (server) / 언어 TypeScript / 병렬 이득 낮음
- direct: 미선택 — 대규모 신규 코드+테스트 작성 (23 REQ / 20 AC)
- serial: 선택 — 코딩 중심 구현의 기본값; 선행 MENTION·SSE 산출물을 계약으로 소비하고 후행 MSG·PERM이 이 SPEC의 deliver·커서 계약에 결합
- fanout: 미선택 — 단일 도메인 구현 작업 (코딩 병렬성 경고)
- sweep: 미선택 — 30파일 미만, 기계적 일괄 변환 아님

Decision: serial
Implementation Kickoff Approval: 통과 — 리드 디스패치 gate 필드로 운영자 승인 전달됨 (2026-08-27)
기록 시점 HEAD: cb90fb3 (SPEC-SSE-001 run 완료 직후)
