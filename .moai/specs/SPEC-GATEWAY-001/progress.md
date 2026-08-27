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
| 현재 상태 | `in-progress` — run 완료 (M1-M3, AC 20/20 PASS, §E.3 audit-ready) |

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

**기준과 커밋** — `spec_base_sha` `cb90fb3c80e33c25f5e8cf05d9f0a8ce8550350c` (진입 시점 HEAD, `.spec-base-sha` 에 기록). 구현 커밋 셋: `c28d9d3` (M1), `41e4188` (M2), `0a6e2d7` (M3). 최종 HEAD `0a6e2d7e325980b41c92bb35591e99f0fb9a4739`.

**진입 baseline (cb90fb3 에서 직접 실행)**: `npm test -w server -- --run` → 종료 코드 0, `Test Files 7 passed (7)` / `Tests 52 passed (52)`. 기존 52 테스트는 전 과정에서 한 번도 깨지지 않았다 (각 단계 요약 참조).

### RED → GREEN 전이 증거 (AC-GW-020)

모든 명령은 `npm test -w server -- --run --reporter=verbose` 다.

**전이 1 — M1 RED** (cb90fb3 + 테스트 파일 추가, 구현 없음). 종료 코드 1.

```
 FAIL  test/gateway.test.ts [ test/gateway.test.ts ]
Error: Cannot find module '../src/gateway.js' imported from /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/server/test/gateway.test.ts
 ❯ test/gateway.test.ts:11:1
Serialized Error: { code: 'ERR_MODULE_NOT_FOUND' }

 Test Files  1 failed | 7 passed (8)
      Tests  52 passed (52)
```

원인이 `../src/gateway.js` 부재임이 출력에서 직접 확인된다.

**전이 2 — M1 GREEN** (gateway.ts 작성 후). 종료 코드 0. 여섯 `✓` 줄 (아래 매트릭스 AC-GW-001~006 행과 같은 이름):

```
 ✓ test/gateway.test.ts > gateway > welcomes each token as its own (room, bot) and only on /bot 61ms
 ✓ test/gateway.test.ts > gateway > rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames 9ms
 ✓ test/gateway.test.ts > gateway > replays only missed messages targeted at that bot and advances the cursor 407ms
 ✓ test/gateway.test.ts > gateway > never redelivers a message after reconnect 610ms
 ✓ test/gateway.test.ts > gateway > deliver reaches only targeted bots in that room and moves only their cursor 812ms
 ✓ test/gateway.test.ts > gateway > deliver carries per-bot delivery and the message attachments 7ms

 Test Files  8 passed (8)
      Tests  58 passed (58)
```

`npm run typecheck -w server` → 종료 코드 0. 커밋 `c28d9d3`.

**전이 3 — M2 RED** (c28d9d3 + AC-GW-007~017 테스트 열한 개 추가, 핸들러 없음). 종료 코드 1. 열한 개 중 열 개 실패 — 원인은 전부 해당 핸들러 부재다:

```
 FAIL  test/gateway.test.ts > gateway > stores bot_message, copies files into uploadsDir and publishes to the hub
TypeError: Cannot read properties of undefined (reading 'body')
 ❯ test/gateway.test.ts:332:16

 FAIL  test/gateway.test.ts > gateway > bot_message skips only the missing attachment
TypeError: Cannot read properties of undefined (reading 'body')
 ❯ test/gateway.test.ts:377:16

 FAIL  test/gateway.test.ts > gateway > status publishes bot_status for working and idle only
AssertionError: expected [] to deeply equal [ 'working', 'idle' ]

 FAIL  test/gateway.test.ts > gateway > history_request returns the room messages in id order and echoes rid
 FAIL  test/gateway.test.ts > gateway > history_request with since_id returns only later messages
 FAIL  test/gateway.test.ts > gateway > history_request applies limit before since_id, speaker, since and until
 FAIL  test/gateway.test.ts > gateway > history_response carries id, author_name, body and created_at
 FAIL  test/gateway.test.ts > gateway > history_response goes only to the requesting bot
 FAIL  test/gateway.test.ts > gateway > closeRoom disconnects only that room
Error: timeout waiting ws message
 ❯ Timeout._onTimeout test/gateway.test.ts:97:14

 FAIL  test/gateway.test.ts > gateway > relays permission_request to the handler and sendToBot reports delivery
AssertionError: expected [] to have a length of 1 but got +0
```

유일한 통과 `✓ isOnline follows the connection, per room and bot` — `isOnline` 은 plan.md §F M1 3단계 범위라 이미 구현돼 있었고, 그 테스트만 M2 배치에 속한다 (plan.md §F M1 은 테스트 여섯 개, M2 는 열한 개로 나눈다). `closeRoom` 테스트는 방 A 절반은 통과하지만 방 B 왕복(`history_request`)이 2000ms 시간 초과로 실패한다 — 원인은 역시 history 핸들러 부재다.

**전이 4 — M2 GREEN 후 M3 배선까지**. M2 GREEN (핸들러 추가 후): 종료 코드 0, `Test Files 8 passed (8)` / `Tests 69 passed (69)`, typecheck 종료 코드 0, 커밋 `41e4188`. M3 RED (AC-GW-018 테스트 추가, 배선 없음): 종료 코드 1 —

```
 FAIL  test/gateway.test.ts > gateway > buildServer wires the gateway, archive hook and invite online flag
TypeError: Cannot read properties of undefined (reading 'deliver')
 ❯ test/gateway.test.ts:644:21
```

`app.gateway` 부재가 직접 확인된다. M3 GREEN (index.ts·routes-bots.ts 배선 후): 종료 코드 0, `Test Files 8 passed (8)` / `Tests 70 passed (70)`, typecheck 종료 코드 0, 커밋 `0a6e2d7`.

### AC 매트릭스 — 20행 전부 (최종 HEAD 0a6e2d7 에서)

명령 (전 행 동일): `npm test -w server -- --run --reporter=verbose` → 종료 코드 0, `Test Files 8 passed (8)` / `Tests 70 passed (70)`. 행동 기준 18개의 근거는 이 실행의 `✓` 줄 원문이다.

| AC | 상태 | 관측 근거 (✓ 줄 원문) |
|----|------|----------------------|
| AC-GW-001 | PASS | `✓ test/gateway.test.ts > gateway > welcomes each token as its own (room, bot) and only on /bot 54ms` |
| AC-GW-002 | PASS | `✓ … > rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames 8ms` |
| AC-GW-003 | PASS | `✓ … > replays only missed messages targeted at that bot and advances the cursor 407ms` |
| AC-GW-004 | PASS | `✓ … > never redelivers a message after reconnect 607ms` |
| AC-GW-005 | PASS | `✓ … > deliver reaches only targeted bots in that room and moves only their cursor 813ms` |
| AC-GW-006 | PASS | `✓ … > deliver carries per-bot delivery and the message attachments 9ms` |
| AC-GW-007 | PASS | `✓ … > stores bot_message, copies files into uploadsDir and publishes to the hub 310ms` |
| AC-GW-008 | PASS | `✓ … > bot_message skips only the missing attachment 309ms` |
| AC-GW-009 | PASS | `✓ … > status publishes bot_status for working and idle only 408ms` |
| AC-GW-010 | PASS | `✓ … > isOnline follows the connection, per room and bot 108ms` |
| AC-GW-011 | PASS | `✓ … > history_request returns the room messages in id order and echoes rid 9ms` |
| AC-GW-012 | PASS | `✓ … > history_request with since_id returns only later messages 6ms` |
| AC-GW-013 | PASS | `✓ … > history_request applies limit before since_id, speaker, since and until 7ms` |
| AC-GW-014 | PASS | `✓ … > history_response carries id, author_name, body and created_at 8ms` |
| AC-GW-015 | PASS | `✓ … > history_response goes only to the requesting bot 408ms` |
| AC-GW-016 | PASS | `✓ … > closeRoom disconnects only that room 7ms` |
| AC-GW-017 | PASS | `✓ … > relays permission_request to the handler and sendToBot reports delivery 813ms` |
| AC-GW-018 | PASS | `✓ … > buildServer wires the gateway, archive hook and invite online flag 76ms` |
| AC-GW-019 | PASS | 아래 네 명령 원문 출력 참조 |
| AC-GW-020 | PASS | 위 "RED → GREEN 전이 증거" — 네 전이의 원문 출력 |

`npm run typecheck -w server` (HEAD 0a6e2d7) → 종료 코드 0 (출력 없음).

### AC-GW-019 범위 경계 — 네 관측의 원문 출력 (HEAD 0a6e2d7)

```
$ ls server/src
auth.ts
config.ts
db.ts
gateway.ts
index.ts
mention.ts
routes-bots.ts
routes-rooms.ts
sse.ts
```

관측 1 성립 — `gateway.ts` 존재, 선행 SPEC 산출물 여섯(`auth.ts`·`config.ts`·`db.ts`·`index.ts`·`routes-bots.ts`·`routes-rooms.ts`) 그대로. `mention.ts`·`sse.ts` 는 형제 SPEC 산출물로 관측 대상 밖이다.

```
$ git rev-parse --verify "$(cat .moai/specs/SPEC-GATEWAY-001/.spec-base-sha)^{commit}"
cb90fb3c80e33c25f5e8cf05d9f0a8ce8550350c
EXIT: 0
```

관측 2 성립 — 종료 코드 0, 40자리 SHA 출력.

```
$ git diff --stat cb90fb3c80e33c25f5e8cf05d9f0a8ce8550350c -- server/src/db.ts
EXIT: 0
```

관측 3 성립 — 종료 코드 0 **및 표준 출력 빈 출력** (`db.ts` 무변경, REQ-GW-023). 기준 SHA 확인을 먼저 통과했으므로 빈 출력이 통과로 성립한다.

```
$ git diff --name-only cb90fb3c80e33c25f5e8cf05d9f0a8ce8550350c -- server/src
server/src/gateway.ts
server/src/index.ts
server/src/routes-bots.ts
EXIT: 0
```

관측 4 성립 — 정확히 세 줄, 그 밖의 파일 없음.

### Gaps (미검증)

- **커버리지 수치를 측정하지 않았다.** 이 카드의 형제 SPEC(MENTION·SSE)과 같은 기준(전체 스위트 통과 + verbose `✓` 줄)을 적용했고, `acceptance.md` 품질 게이트가 커버리지 수치를 요구하지 않아 `--coverage` 실행은 하지 않았다.
- **실제 채널 플러그인(카드 t4) 과의 상호동작은 관측하지 않았다.** 범위 밖이며, `Gateway` 시그니처 계약(REQ-GW-021)이 그 소비자를 위한 유일한 결합면이다.
- **같은 토큰 두 프로세스 동시 접속** 엣지 케이스는 실행으로 관측하지 않았다 — `spec.md` §5 가 수용으로 명시한 항목이다.
- **M2 RED 에서 AC-GW-010 이 통과했다** (위 전이 3 참조) — plan.md §F 가 `isOnline` 구현은 M1·테스트는 M2 에 배치했기 때문이며, 결함이 아니라 계획의 배치 그대로다. 증거 정확성을 위해 그대로 기록한다.

### Residual-risk (잔여 위험)

- **`ws.close()` 직후의 `isOnline` 관측 경합** — 서버가 소켓을 닫을 때 클라이언트 close 이벤트가 서버 소켓 close 이벤트보다 먼저 관측될 수 있어, 게이트웨이가 서버 주도로 닫는 모든 경로(파싱 실패·미인증·closeRoom·onClose)에서 `conns.delete` 를 `ws.close()` 보다 먼저 동기 실행한다. 클라이언트 주도 종료(AC-GW-010)는 비동기 close 정리 + 테스트의 100ms 대기에 의존한다 — 루프백에서 안정적이지만 극단적으로 느린 환경에서는 이론적 경합이 남는다.
- **타이밍 의존 테스트** — `bot_message`·`status`·`permission_request` 검증은 200~300ms 고정 대기를 쓴다(acceptance.md 원문 그대로). 구현은 프레임 도착 즉시 동기 처리하므로 로컬에서 안정적이나, 극단적으로 느린 CI 에서는 대기 시간이 부족할 수 있다. plan.md §E 의 완화(가능한 곳은 이벤트 대기)를 적용해 이력·전달 경로는 전부 이벤트 대기다.
- **`history_request` 의 `limit` 비정상 입력** — `Number(...) || 100` 가디드로 `NaN`·`0` 을 기본값 100 으로 돌린다. 스펙은 기본 100·상한 500 만 정의했고 비정상 입력의 처우는 규정하지 않아, 이 해석이 남는다.

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-GATEWAY-001
tier: L
card: t3
spec_base_sha: cb90fb3c80e33c25f5e8cf05d9f0a8ce8550350c
head_sha: 0a6e2d7e325980b41c92bb35591e99f0fb9a4739
implementation_commits:
  - "c28d9d3 — M1: feat: bot gateway with token auth and cursor replay (card t3)"
  - "41e4188 — M2: feat: gateway bot_message, status, history and permission relay (card t3)"
  - "0a6e2d7 — M3: feat: wire gateway into buildServer and invite online flag (card t3)"
evidence:
  test_command: "npm test -w server -- --run --reporter=verbose"
  test_result: "exit 0 — Test Files 8 passed (8), Tests 70 passed (70); gateway 18/18 ✓ 줄 원문 §E.2 에 기록"
  typecheck_command: "npm run typecheck -w server"
  typecheck_result: "exit 0"
  red_green_transitions: "4/4 관측 — §E.2 RED → GREEN 전이 증거 (원문 출력)"
  boundary_check: "AC-GW-019 네 관측 통과 — §E.2 범위 경계 원문 출력"
ac_matrix: "20/20 PASS — §E.2 AC 매트릭스"
changed_files: "server/src/gateway.ts (신규) · server/src/index.ts · server/src/routes-bots.ts · server/test/gateway.test.ts (신규)"
docs_commit_sha: "33f536dee5d7b12d3e26ed7608153124eddd630b"
```

---

## §E.4 Sync-phase Audit-Ready Signal

> 이 절은 최초 마감 시점의 기록이다. 그 뒤 sync-audit 이 FAIL 을 내 마감이 되돌려졌고,
> 수정 3라운드와 감사 3회를 거쳐 §E.7 에서 다시 닫혔다. **현재 유효한 판정은 §E.7 이다.**

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-27
sync_commit_sha: "43eb27a1fdce2633cce97801e44052dcba2059a5"
spec_id: SPEC-GATEWAY-001
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

`SPEC-GATEWAY-001` 의 run 단계 산출물이 sync 세션의 **독립 재실행**으로 확인되었다. 봇 게이트웨이 테스트 18건이 전부 통과하고 타입 검사가 깨끗하며, 토큰 인증·재접속 커서·이력 조회에 대한 보안 렌즈 검토에서 차단 사항이 나오지 않았다.

### Evidence (증거)

sync 세션이 직접 실행해 관측했다. 원문은 `.moai/state/verify/9d51afd1/test-verbose.txt` 에 남겼다.

```
$ npm test -w server -- --run --reporter=verbose
 ✓ test/gateway.test.ts > gateway > welcomes each token as its own (room, bot) and only on /bot 59ms
 ✓ test/gateway.test.ts > gateway > rejects unknown, revoked and archived-room tokens, unauthenticated and malformed frames 14ms
 ✓ test/gateway.test.ts > gateway > replays only missed messages targeted at that bot and advances the cursor 407ms
 ✓ test/gateway.test.ts > gateway > never redelivers a message after reconnect 608ms
 ✓ test/gateway.test.ts > gateway > deliver reaches only targeted bots in that room and moves only their cursor 813ms
 ✓ test/gateway.test.ts > gateway > deliver carries per-bot delivery and the message attachments 9ms
 ✓ test/gateway.test.ts > gateway > stores bot_message, copies files into uploadsDir and publishes to the hub 309ms
 ✓ test/gateway.test.ts > gateway > bot_message skips only the missing attachment 306ms
 ✓ test/gateway.test.ts > gateway > status publishes bot_status for working and idle only 408ms
 ✓ test/gateway.test.ts > gateway > isOnline follows the connection, per room and bot 106ms
 ✓ test/gateway.test.ts > gateway > history_request returns the room messages in id order and echoes rid 6ms
 ✓ test/gateway.test.ts > gateway > history_request with since_id returns only later messages 5ms
 ✓ test/gateway.test.ts > gateway > history_request applies limit before since_id, speaker, since and until 6ms
 ✓ test/gateway.test.ts > gateway > history_response carries id, author_name, body and created_at 4ms
 ✓ test/gateway.test.ts > gateway > history_response goes only to the requesting bot 408ms
 ✓ test/gateway.test.ts > gateway > closeRoom disconnects only that room 9ms
 ✓ test/gateway.test.ts > gateway > relays permission_request to the handler and sendToBot reports delivery 812ms
 ✓ test/gateway.test.ts > gateway > buildServer wires the gateway, archive hook and invite online flag 76ms
 Test Files  10 passed (10)
      Tests  98 passed (98)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

보안 렌즈 — 토큰을 평문으로 보관하지 않는 것을 코드에서 직접 확인했다.

```
$ grep -n "sha256Hex" server/src/gateway.ts
7:import { sha256Hex } from './routes-bots.js'
88:    ).get(sha256Hex(String(token ?? ''))) as
```

접속 프레임의 토큰은 sha256 해시로 조회한다 — 서버에 평문 토큰이 남지 않는다. 철회된 토큰과 보관된 방의 토큰을 함께 거절하는 것은 `rejects unknown, revoked and archived-room tokens…` 한 줄이 양성으로 지킨다.

### Baseline-attribution (baseline 귀속)

- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `8c4798a`.
- run 단계 §E.3 은 `70 passed / 70`, `gateway 18/18` 을 기록했다. sync 시점 `test/gateway.test.ts` 자체 건수는 **18 로 변함이 없다** — 총계 98 은 형제 SPEC 2벌(MSG 13·PERM 15)이 위에 얹힌 결과다.
- AC 20/20 판정과 범위 경계 네 관측은 §E.2 의 run 시점 기록이며, sync 세션이 다시 재지 않았다.

### Gaps (미검증)

- 커버리지 수치 미측정 (`@vitest/coverage-v8` 미설치).
- **실제 Claude Code 세션이 붙은 적은 없다.** 게이트웨이 상대편(채널 플러그인)은 카드 `t4` 의 몫이고, 프로토콜이 실제로 맞물리는지는 카드 `t6` E2E 에서 처음 관측된다. 지금까지의 근거는 전부 테스트 하네스가 흉내 낸 클라이언트다.
- 토큰 해시 조회는 상수 시간 비교가 아니다. 조회 키가 해시값이라 타이밍으로 새어 나갈 원본 토큰이 없다고 판단했으나, 이 판단 자체를 계측으로 확인하지는 않았다.

### Residual-risk (잔여 위험)

- 재접속 커서는 봇별로 전진한다. 같은 토큰으로 두 프로세스가 동시에 붙는 경우는 이번 범위에서 정의하지 않았다 — 한쪽이 커서를 밀면 다른 쪽이 놓친다.
- `since_id` 이력 조회의 커서 의미는 카드 `t4` MCP 도구와 `t6` 검증이 같은 해석을 공유해야 한다.
- 이 분기는 아직 머지되지 않았다.

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

---

## §E.5 Sync-audit Response — 감사 FAIL 대응 라운드

sync 단계 독립 감사(`.moai/reports/t3/sync-audit.md`, `--security --deep`)가 **FAIL** 을 냈다
(Security 45/100, 임계 70). 리드가 판정을 채택하고 차단 3건 수정 + 재감사를 지시했다.
그에 따라 `status` 를 `completed` → `in-progress` 로 되돌렸고, §E.4 는 **재감사 PASS 전까지 유효하지 않다.**

### 이 SPEC 에서 바뀐 것 — F-01 (Critical, 이 SPEC 소유)

`handleBotMessage` 가 `files[].local_path` 를 아무 검증 없이 `copyFileSync` 로 복사했다.
`basename()` 은 **목적지 이름**에만 걸리고 **출처 경로**에는 걸리지 않아, 봇 토큰 하나로
서버가 읽을 수 있는 임의 파일을 업로드 디렉터리 안으로 끌어올 수 있었다. 그 결과
`SPEC-MSG-001` 의 읽기 시점 봉인은 **통과한다** — 파일이 실제로 업로드 디렉터리 안에 있기 때문이다.
감사자가 uploads 밖 카나리 파일의 유출을 HTTP 200 으로 재현했다.

수정: `createGateway` 에 `botFilesDir` 옵션을 추가하고, 복사 전에
`resolve(local_path).startsWith(resolve(botFilesDir) + sep)` 를 확인한다. 미지정이면 모든 봇 첨부를
거부한다(fail-closed). 벗어난 경로는 **그 첨부만** 건너뛴다 — 기존 REQ-GW-011 의 "없는 파일은
건너뛴다" 와 같은 자리다. `sep` 를 붙여 비교하므로 `<root>-evil` 같은 접두사 일치가 통과하지 않는다.

재현 테스트: `test/gateway.test.ts` — `bot_message refuses a local_path outside botFilesDir
while still attaching one inside`. 대조군(뿌리 안 정상 파일 1건)을 같은 테스트에서 함께 관측해
"전부 거부"하는 구현도 걸러낸다. 파일명뿐 아니라 **복사본의 내용**에 카나리 문자열이 없는지까지 본다.

RED → GREEN 전이를 관측했다.

```
# 수정 전 (RED)
$ npx vitest run --root server -t "refuses a local_path outside botFilesDir"
- Expected
+ Received
  [
+   "harmless.txt",
    "정상.txt",
  ]
 Test Files  1 failed | 9 skipped (10)

# 수정 후 (GREEN)
 ✓ test/gateway.test.ts > gateway > bot_message refuses a local_path outside botFilesDir while still attaching one inside 344ms
```

`MessageRow.attachments` 의 원소 타입에서 `stored_path` 를 뺐다 (F-02 와 짝). `deliver` 는
첨부를 DB 에서 다시 읽으므로 봇 프레임의 `local_path` 는 영향을 받지 않는다.

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
