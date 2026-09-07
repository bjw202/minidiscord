# SPEC 감사 보고서: SPEC-BOTMODEL-001

Iteration: 1/3
Verdict: FAIL
Overall Score: 0.71 (Tier L 통과선 0.85)

작성자 추론 맥락은 M1 Context Isolation 에 따라 무시했다 (Reasoning context ignored per M1 Context Isolation). 판정은 `.moai/specs/SPEC-BOTMODEL-001/` 의 다섯 산출물과 출처 보고서 원문, 그리고 저장소의 실제 파일에서만 세웠다.

---

## 쉬운 말 요약

이 SPEC 은 이제껏 본 것 중 가장 꼼꼼하게 쓰였다. 「글자 그대로 옮겼다」는 주장을 명령으로 대조했더니 계약 16줄이 **완전히 일치**했고, 17개 불변식이 지목한 테스트 파일 16개가 **전부 실재**했으며, 필수 관문 일곱은 모두 통과했다. 그런데도 통과시킬 수 없다.

세 가지 이유다. 첫째, 수용 기준 AC-004 의 전제가 **같은 문서의 AC-024 에 의해 불가능해진다** — 「사람이 R2 에서 @TO(B) 를 보내 타깃 행이 생긴다」고 썼는데, AC-024 는 바로 그 경로가 400 을 내고 어떤 행도 남기지 않는다고 못 박는다. 둘째, 이 SPEC 의 간판 끝 조건 ①②(AC-001·002)는 서버와 채널이 **동시에 실제로 떠 있어야** 재는데, 그런 하네스가 저장소에 없고 유일한 통합 러너 `scripts/e2e.mts` 는 이 SPEC 이 「빨간 채로 둔다」고 스스로 범위 밖으로 밀어냈다. 셋째, plan.md 의 마일스톤 판정 목록이 25개 기준 중 4개(001·002·019·020)를 아무 마일스톤에도 배정하지 않았다.

점수 0.71 은 통과선 0.85 에 못 미친다. 차단 3건을 고치면 재감사에서 통과할 것으로 본다 — 구조가 아니라 이음매의 문제다.

---

## Must-Pass Results

| 관문 | 판정 | 근거 |
|---|---|---|
| MP-1 REQ 번호 일관성 | **PASS** | `grep -o 'REQ-BOTMODEL-[0-9]*' spec.md \| sort \| uniq -c` → 001~025 각 1회, 결번·중복 0, 3자리 zero-padding 균일 |
| MP-2 GEARS 형식 준수 | **PASS** | 요구사항 계층(`spec.md` §6 의 REQ-BOTMODEL-001~025)에 대해 판정. 25개 전부 「…해야 한다」(ubiquitous/event-driven) 또는 「…않아야 한다」(unwanted) 주절을 가진다. 예: spec.md:165 `채널이 hello{token} 을 보낼 때, 게이트웨이는 … 답해야 한다`(event-driven), spec.md:151 `openDb 는 … 만들지도 실행하지도 않아야 한다`(unwanted). **검증 계층**(`acceptance.md` 의 AC-BOTMODEL-001~025)의 Given-When-Then 은 M3 §Scope 에 따라 이 관문에서 감점하지 않았고 Group 4 에서 채점했다. 다만 D6 참조 |
| MP-3 YAML frontmatter 유효성 | **PASS** | spec.md:1-16. canonical 12필드 전부 존재·형식 적합: `id: SPEC-BOTMODEL-001`(정규식 `^SPEC-[A-Z][A-Z0-9]+-[0-9]{3}$` 적합) · `version: "0.1.0"`(따옴표 semver) · `status: draft`(8값 enum 내) · `created`/`updated: 2026-09-07`(ISO) · `priority: P0`(enum 내) · `phase: "v2.0.0 target"`(금지된 lifecycle 토큰 아님) · `module: "server/, channel/, web/"` · `lifecycle: spec-anchored` · `tags` 쉼표 구분. snake_case 별칭(`created_at`·`updated_at`·`labels`·`spec_id`) 0건. 선택 필드 `tier: L`·`depends_on`(스키마 §Optional Fields:148·152 에 등재) 적법 |
| MP-4 §22 언어 중립성 | **N/A** | 이 SPEC 은 TypeScript/Node 단일 언어 저장소(`server/` · `channel/` · `web/`)에 한정된다. 다국어 툴링 표면을 다루지 않으므로 기준 적용 대상이 아니며 자동 통과 |
| MP-5 D7 cross-SPEC 조정 | **PASS** | frontmatter `depends_on` 13개 + 본문 참조를 합쳐 17개 SPEC-ID 를 추출해 각각 `.moai/specs/<ID>/spec.md` 존재와 `status:` 를 읽었다. 부재 0건, `status ∈ {retired, superseded, archived}` **0건**(전부 `completed`, 자기 자신만 `draft`). BLOCKING 없음 |
| MP-6 D8 크로스플랫폼 규율 | **PASS** | `grep -c syscall` 을 산출물 7개 전부에 실행 → 전부 0. D8-4 에 따라 자동 통과 |
| MP-7 clarification 게이트 | **PASS** | `grep -rn "NEEDS CLARIFICATION" .moai/specs/SPEC-BOTMODEL-001/` → 2건 적중하나 둘 다 **마커가 아니다**: spec.md:92 는 「`[NEEDS CLARIFICATION]` 이 아니며」라는 메타 언급, progress.md:36 은 `needs_clarification: []` 라는 빈 목록 선언. `[NEEDS CLARIFICATION: <topic>]` 형태의 미해결 마커 0건 |

**필수 관문 일곱 전부 통과.** FAIL 은 관문이 아니라 아래 차원 점수와 차단 결함에서 온다.

---

## Category Scores

| 차원 | 점수 | 밴드 | 근거 |
|---|---|---|---|
| Clarity | 0.75 | 0.75 밴드 | 용어절(§2)이 「전선 봉투 ↔ 문맥 봉투」를 명시 분리하고, 델타 표기(§6 머리)가 [NEW]/[MODIFY]/[REMOVE]/[EXISTING] 넷을 정의한다. 감점: D5(§3 「해석 금지」 대 REQ-014 의 해석), D6(REQ-003 의 서법 혼재), D7(「취지를 담는다」 두 자리) |
| Completeness | 0.75 | 0.75 밴드 | Tier L 산출물 5종 전부 + `spec-compact.md`·`progress.md`. HISTORY·§1 배경(WHY)·§2·§3(WHAT)·§6 REQUIREMENTS·acceptance.md·§5 Out of Scope 모두 존재. Out of Scope 는 `### Out of Scope — <주제>` H3 **셋**(spec.md:122·129·137)에 각각 `-` 항목이 붙어 `OutOfScopeRule` 관례를 만족. 감점: D3(plan.md 마일스톤이 AC 넷을 배정하지 않음), D4(acceptance.md:5 의 자기 계수 오류) |
| Testability | 0.65 | 0.50 밴드 초과·0.75 밴드 미달 | 25개 중 23개는 명령 또는 인프로세스 단언으로 판정 가능(§C 표 참조). 감점: D1(AC-004 전제 도달 불가), D2(AC-001·002 하네스 부재), D7(AC-010·AC-008 짝의 「취지」 판단), D8(AC-025 넷째 명령은 설계상 이분 판정이 없음) |
| Traceability | 0.70 | 0.75 밴드 근처, 미달 | 25 REQ 전부가 실질적으로 대응 AC 를 가진다(§B 표). 그러나 `grep -n 'REQ' acceptance.md` → **0건** — 25개 AC 중 어느 것도 REQ 번호를 명시하지 않는다. 대응은 spec.md §7(AC 8개 인용)·plan.md §F(AC 11개 인용)로 부분 복원될 뿐이고, plan.md §B 판정 목록은 4개를 누락한다(D3) |

집계(조화평균, `agent-common-protocol.md` § Skeptical Evaluation Stance): 4 ÷ (1/0.75 + 1/0.75 + 1/0.65 + 1/0.70) = **0.710**. 산술평균도 0.713 으로 같은 결론이다. Tier L 통과선 0.85(`spec-workflow.md` § SPEC Complexity Tier 표) 미달.

---

## 기계적으로 검증한 것 (통과 항목의 증거)

주장을 그대로 받지 않고 명령으로 다시 잰 것들이다.

### 1. 「글자 그대로」 주장 — 참

spec.md:54 는 §3 의 다섯 덩어리가 `.moai/reports/v2-refactoring-guide.md` §2 A-1 문안을 「글자 그대로」 옮긴 것이라고 주장한다. 대조:

```bash
sed -n '82,106p' .moai/reports/v2-refactoring-guide.md | grep -v '^\*\*' | grep -v '^```' | grep -v '^$' > /tmp/guide.txt
sed -n '58,88p'  .moai/specs/SPEC-BOTMODEL-001/spec.md   | grep -v '^###'  | grep -v '^```' | grep -v '^$' > /tmp/spec.txt
wc -l /tmp/guide.txt /tmp/spec.txt   # → 16  16
diff /tmp/guide.txt /tmp/spec.txt    # → 출력 없음 (exit 0)
```

계약 16줄 **바이트 단위 동일**. DDL 두 줄, HTTP 세 줄, 프레임 두 줄, MCP 세 줄, 게이트웨이 규칙 세 줄, `role` 괄호 주석 한 줄, 재전송 SQL 포함. 이 주장은 참이다.

### 2. 17 불변식이 지목한 테스트 파일 — 전부 실재

spec.md:192 는 「그 파일이 저장소에 있는지 확인했다」고 주장한다. 표가 이름을 적은 파일 12개 + DoD·AC 짝이 적은 4개, 합 16개를 `[ -e ]` 로 확인:

`server/test/{messages,web-permission-contract,permissions,restart-persistence,health,web-chat,web-rich,db}.test.ts` · `channel/test/{channel-server,truncate,index-wiring,permission-relay,gateway-client}.test.ts` · `server/test/gateway-v2.ts` · `channel/test/gateway-mutual-auth.test.ts` · `.moai/state/verify/t25-plan/sibling-sweep.mjs` → **16/16 OK, 부재 0**. `server/test/fixtures/` 에 `tls-test-cert.pem`·`tls-test-key.pem` 도 실재(DoD 삭제 대상과 일치).

§7 표 행 수를 세었다: `sed -n '196,213p' spec.md | grep -c '^| [0-9]'` → **17**. 「17개」 주장 참. 보고서 §4 원문 17항과 항목별 대조했고 의미 왜곡 없음(7번의 「권한 판정」 → 「판정」 축약은 같은 대상).

### 3. 끝 조건 명령의 판별력 — 현재 트리에서 실측

- AC-007 grep(6패턴): 현재 **35건** 적중 → 구현 후 0건이 되면 실제로 변화를 잰다. 공허하지 않다.
- `'env'` 단독: **2건** (`server/src/gateway.ts:274` 의 `send(ws, { type: 'env', … })`, `channel/src/gateway-client.ts:165` 의 `msg.type === 'env'`) — 삭제 대상 그 자리다. 오탐 위험 낮음.
- `grep -rn "since_id 로" channel/src`: **2건** (`channel-server.ts:30` 지시문 문장, `:145` 도구 설명) → AC-008 이 잡으려는 문장이 실재한다.
- `npm test` = `npm test --workspaces` (루트 `package.json`), 워크스페이스는 `server`·`channel` 둘 → 30개 테스트 파일 전부 포함. AC-025 실행 가능.

### 4. A-0 실측 인용 — 원문과 일치

spec.md:100-110 의 결정 ②가 인용한 `.moai/state/verify/a0/result.md` 를 원문 대조했다. 「알림 chat_id="1" → reply{chat_id:"1"}」·「알림 chat_id="3" → reply{chat_id:"3"}」·「둘째 값 3 이 방 id 1 과 달라 구별됨」 전부 원문에 있고, 한정(세션 하나·모델 하나·2회)도 축소 없이 §8 로 옮겨졌다. 원 기록이 스스로 적은 한정을 SPEC 이 강화하지 않았다 — **출처의 추론을 사실로 굳히는 패턴 없음**.

### 5. D7 상태 — 조정 필요 없음

참조 SPEC 17개 전부 실재, `retired`/`superseded`/`archived` 0건. plan.md §H 가 형제 넷을 「죽음」이라 부르지만 frontmatter 는 `completed` 이고, 보관 이동 소유자를 C2 로 명시(plan.md:179)해 두었다 — 명시적 조정이 있으므로 D7-4 는 발동하지 않는다.

---

## Defects Found

### D1. AC-004 의 전제가 같은 문서의 AC-024 에 의해 도달 불가 — `acceptance.md:33` 대 `acceptance.md:187`

**Severity: critical · Class: blocking**

AC-BOTMODEL-004(위험 4 — 방 A 에만 참여한 봇이 방 B 의 첨부 경로를 못 받는다)의 When 절:

> **When** 사람이 `R2` 에서 첨부를 붙여 `@TO(B)` 로 보낸다(**즉 `message_targets` 에는 `B` 행이 생긴다**)  — acceptance.md:33

AC-BOTMODEL-024(멘션 매핑이 `room_bots` 를 본다)의 Then 절:

> **Then** … `R2` 는 `400` 이고 본문이 «… 봇은 이 방에 초대되지 않았습니다» 이며 **어떤 행도 남지 않는다**.  — acceptance.md:187

두 기준의 배치가 동일하다(둘 다 「B 가 R1 에만 참여, 사람이 R2 에서 @TO(B)」). REQ-BOTMODEL-025(spec.md:188)가 멘션→타깃 매핑을 `room_bots` 조회로 바꾸므로, AC-004 가 서술한 사람 경로는 400 을 내고 `message_targets` 행을 만들지 **않는다**. AC-004 의 When 은 구현이 옳게 착지한 트리에서 재현 불가능하다.

파급이 하나 더 있다. AC-004 의 변이 확인(`acceptance.md:35` — 「`deliver` 에서 `room_bots` 참여 검사를 지우면 이 기준이 붉어져야 한다」)은 타깃 행이 존재해야만 `deliver` 에 도달한다. 행이 생기지 않으면 변이를 넣어도 기준이 붉어지지 않는다 — **자기를 잡을 판정자가 원리적으로 발동하지 않는 변이**가 된다. 이 SPEC 이 §E 에서 「변이로 지킨다」고 선언한 방어 중 하나가 여기서 무력화된다.

**Required fix**: AC-004 의 When 을 사람 라우트가 아닌 경로로 다시 쓴다 — 예: 「`message_targets` 에 `(R2 메시지, B)` 행을 **직접 심고**(멘션 라우트를 우회한다 — AC-024 가 그 경로를 400 으로 닫기 때문이다) `deliver(R2, msg, [B])` 를 부른다」. 그리고 우회하는 이유를 한 줄로 적어 AC-024 와의 관계를 명시한다. 이렇게 하면 AC-004 는 **라우트가 뚫려도 `deliver` 가 막는다**는 이중 방어를 재는 기준으로 정확히 서고, 변이도 발동한다.

---

### D2. 간판 끝 조건 ①②(AC-001·002)를 실행할 하네스가 저장소에 없다 — `acceptance.md:11-21` · `plan.md:126`

**Severity: critical · Class: blocking**

acceptance.md:3 은 「각 기준은 **명령 하나 또는 인프로세스 단언 하나**로 판정한다」고 선언한다. AC-001·002 는 이 선언을 만족하지 못한다.

- **AC-001** Then(acceptance.md:15)은 두 계층을 한 시나리오에서 요구한다: (a) 서버측 — 한 접속에 `message` 프레임 둘이 각각 `room_id: R1`·`R2` 로 도착, (b) 채널측 — 「채널이 세션에 넘긴 알림의 `meta.chat_id` 가 각각 `String(R1)`·`String(R2)`」.
- **AC-002** Then(acceptance.md:21)도 마찬가지다: (a) 채널측 — 세션이 `reply{chat_id:String(R2)}` 호출, (b) 서버측 — `messages` 에 `room_id=R2` 행이 1행 증가 + SSE 발행 1회.

저장소에 실제 서버와 실제 채널을 함께 띄우는 인프로세스 하네스가 있는지 확인했다:

```bash
grep -rln "channel/" server/test/*.ts        # → gateway-v2.ts(삭제 대상), live-extract.test.ts
grep -rln "server/src" channel/test/*.ts     # → (적중 없음; 앞선 'server' 적중은 WebSocketServer·serverInfo 문자열)
grep -n "^import" channel/test/index-wiring.test.ts   # → ws 의 WebSocketServer 스텁 + ../src/index.js
```

`channel/test/index-wiring.test.ts:78` 은 **스텁 `WebSocketServer`** 로 게이트웨이를 흉내 낸다 — 실제 `server/src/gateway.ts` 를 부르지 않는다. 두 프로세스를 실제로 잇는 유일한 러너는 `scripts/e2e.mts` 이고, 이 SPEC 은 그것을 스스로 범위 밖으로 밀어냈다:

> `npx tsx scripts/e2e.mts`   # 이 시점엔 **빨갛다** — C2 에서 다시 쓴다. 빨간 것을 확인만 하고 넘어간다  — plan.md:126 · acceptance.md:199 · spec.md:133

결과: 이 SPEC 의 §1 이 「이 SPEC 이 끝나면」이라고 선언한 바로 그 결과(spec.md:40)를 재는 두 기준이, 어느 초록 스위트에서도 실행되지 않는다. 반쪽씩 나눠 재는 것은 가능하지만(서버측은 `gateway.test.ts`, 채널측은 스텁으로 `index-wiring.test.ts`), 그렇게 나누면 **이음매 — 서버가 실은 `room_id` 가 채널이 낸 `meta.chat_id` 와 같은가 — 를 재는 기준이 하나도 없다**. 그리고 acceptance.md 는 그 분할을 지시하지 않는다.

**Required fix**: 둘 중 하나를 택해 명시한다.
1. AC-001·002 를 각각 **두 기준으로 쪼개고**, 각 쪽이 어느 파일에서 어떤 단언으로 서는지 적는다. 그리고 이음매(채널이 서버의 `room_id` 를 `meta.chat_id` 로 옮긴다)를 재는 세 번째 단언을 채널측에 둔다 — 스텁 게이트웨이가 `message{room_id:R2}` 를 밀어 넣고 `pushChatMessage` 가 낸 `meta.chat_id === "R2"` 를 확인하면 인프로세스로 선다.
2. 또는 `scripts/e2e.mts` 의 **A 단계 최소 시나리오만** 이 SPEC 범위로 당겨 오고(전면 재작성은 C2 에 남긴 채), AC-001·002 의 판정 명령으로 지목한다.

어느 쪽이든 Tier L 상한 25/25 에 이미 닿아 있으므로(§주의 참조), 1안의 분할은 기준 수를 늘린다 — 쪼개는 대신 **기존 AC-001·002 의 Then 안에 판정 파일과 단언을 명시**하는 편이 상한을 지킨다.

---

### D3. plan.md 마일스톤 판정 목록이 AC 넷을 아무 데도 배정하지 않는다 — `plan.md:28·44·56·66·77`

**Severity: major · Class: blocking**

plan.md §B 는 마일스톤마다 「판정: **AC-…**」 한 줄을 두어 그 마일스톤이 무엇으로 닫히는지 선언한다. 여섯 줄을 합집합하면:

| 마일스톤 | 판정 AC |
|---|---|
| M1 (plan.md:28) | 009 · 010 |
| M2 (plan.md:44) | 014 · 015 · 016 |
| M3 (plan.md:56) | 003 · 004 · 016 · 018 |
| M4 (plan.md:66) | 005 · 006 · 017 · 021 · 022 · 023 |
| M5 (plan.md:77) | 011 · 012 · 013 · 024 |
| M6 (plan.md:81) | (AC 명시 없음 — §D 끝 조건 명령 넷) |

합집합 = 18개. **배정되지 않은 7개**: 001 · 002 · 007 · 008 · 019 · 020 · 025. 이 중 007·008·025 는 §D 의 끝 조건 명령이 실질적으로 덮는다(AC 번호로 부르지는 않는다). 그러나 **001 · 002 · 019 · 020 은 어느 마일스톤에도, §D 에도, §F 위험표에도 없다**.

- 001·002 는 이 SPEC 의 간판 끝 조건 ①② 다 (D2 와 겹친다 — 하네스도 없고 소유 마일스톤도 없다).
- 019·020 은 acceptance.md §E 가 「남기는 보안 둘 (변이로 지킨다)」로 따로 절을 뗀 기준이고, DoD(acceptance.md:207)가 세는 변이 넷 중 **둘**이 AC-019 것이다. 그 변이를 실행할 마일스톤이 계획에 없다.

이것은 「대책이 완료 정의에만 착지하고 실행 단계에는 없는」 형태다 — 검사 가능한 조건인데 실행 주체가 지정되지 않았다.

**Required fix**: M3 판정 줄에 `019 · 020` 을 더하고(첨부·`stored_path` 는 M3 의 `deliver`/`handleBotMessage` 자리다), M4 또는 새 판정 줄에 `001 · 002` 를 더한다. 그리고 M6 판정 줄에 `007 · 008 · 025` 를 AC 번호로 명시해 여섯 마일스톤의 합집합이 25 가 되게 한다. 「AC-025 는 §D」라고만 적지 말고 번호를 쓴다 — 번호가 없으면 다음 회차가 다시 센다.

---

### D4. acceptance.md 머리말이 자기 문서를 잘못 센다 — `acceptance.md:5`

**Severity: minor · Class: blocking**

> 관측면 규칙: 셸 grep 으로만 서는 기준(**AC-007·008·009**)은 회귀 스위트가 다시 실행하지 못하므로, **각각** 인프로세스 짝을 함께 둔다(`server/test/db.test.ts` 표 목록 · `channel/test/channel-server.test.ts` 지시문 단언).

두 곳이 틀렸다.

1. **AC-009 는 셸 grep 기준이 아니다.** acceptance.md:75 의 When 은 `PRAGMA table_info(bots)` · `PRAGMA table_info(room_bots)` — 처음부터 인프로세스 단언이다. 「회귀 스위트가 다시 실행하지 못한다」는 서술이 이 기준에는 거짓이다.
2. **「각각」이 성립하지 않는다.** `grep -n "인프로세스 짝" acceptance.md` → 본문 적중 **2건**(:59 AC-007, :66 AC-008). 셋을 호명하고 짝을 둘만 달았으며, 괄호 안 짝 목록도 둘뿐이다.

셋을 둘로 세는 문장이라 다음 회차나 run 단계가 「AC-009 의 짝이 빠졌다」는 존재하지 않는 결함을 쫓게 된다.

**Required fix**: `(AC-007·008)` 로 고치고 「각각 인프로세스 짝을 함께 둔다 — `server/test/db.test.ts` 표 목록(AC-007) · `channel/test/channel-server.test.ts` 지시문 단언(AC-008)」 로 귀속을 명시한다. AC-009 를 이 문장에서 뺀다.

---

### D5. §3 의 「해석 금지」와 REQ-014 의 해석이 충돌한다 — `spec.md:54·76` 대 `spec.md:168`

**Severity: minor · Class: blocking**

spec.md:54 는 §3 에 대해 「구현은 이 문안을 **해석하지 말고 그대로 실현한다**」고 명령한다. 그 §3.3(spec.md:76)의 문안은:

> 서버 → 채널: `welcome{bot_id, bot_name, rooms:[…]}` · `message{room_id, …}` · `history_response{room_id, …}` · `permission_verdict{request_id, behavior}`. **서버 → 채널 방향은 `room_id` 를 항상 싣는다.**

같은 줄이 `welcome` 과 `permission_verdict` 의 형태를 `room_id` **없이** 적어 놓고, 곧바로 「항상 싣는다」고 전칭한다 — 원 가이드에서 물려받은 내부 모순이다. REQ-BOTMODEL-014(spec.md:168)는 이를 조용히 좁힌다:

> 서버 → 채널 프레임(`message` · `history_response`)은 `room_id` 를 **항상** 실어야 한다. `welcome` 은 `rooms` 배열로, `permission_verdict` 는 `request_id` 로 방을 대신 식별한다.

이 좁힘은 옳다. 문제는 SPEC 이 어디에서도 「§3 과 §6 이 어긋나면 §6 이 이긴다」고 적지 않은 것이다. 「해석하지 말라」는 명령을 받은 구현자가 §3.3 을 글자 그대로 실현하면 `welcome`·`permission_verdict` 에 `room_id` 를 억지로 붙이게 되고, 그것은 plan.md:167 이 안티패턴으로 지목한 「서버→채널 방향에서도 필수로 만들기」에 가까워진다.

**Required fix**: spec.md:54 문장에 우선순위를 한 줄 더한다 — 「§3 은 출처 문안이며, §6 요구사항이 그 문안을 좁히는 자리(REQ-014 의 `welcome`·`permission_verdict` 예외)에서는 §6 이 이긴다」. 또는 §3.3 뒤에 각주 한 줄로 그 전칭이 두 프레임에 적용되지 않음을 적는다(원 문안은 그대로 두고 각주만 단다 — 「글자 그대로」 주장을 깨지 않는다).

---

### D6. REQ-BOTMODEL-003 이 한 요구사항 안에 두 서법을 섞는다 — `spec.md:151`

**Severity: minor · Class: blocking**

> **REQ-BOTMODEL-003** [REMOVE] `openDb` 는 `bot_tokens` 표와 … 검사를 만들지도 실행하지도 **않아야 한다**. 대신 v2 표 존재 검사 한 줄로 옛 DB 파일을 큰 소리로 **거절한다**.

앞 문장은 GEARS unwanted 형(「…않아야 한다」)이고, 뒤 문장은 **별개의 긍정 의무**(v2 표 존재 검사를 새로 넣는다)를 평서형으로 적는다. 그 의무는 AC-BOTMODEL-010(acceptance.md:78-82)이 실제로 판정하므로 장식이 아니라 요구사항이다.

MP-2 는 통과 처리했다 — 이 관문이 겨냥하는 실패(「should」·「가능하면」 같은 완화어, REQ 자리에 놓인 Given-When-Then)는 여기에 없고, 각 REQ 는 GEARS 주절을 정확히 하나씩 가진다. 그러나 요구사항 계층의 형식 일탈이므로 기록한다. 나머지 24개 중 다수도 주절 뒤에 em-dash 로 평서형 부연을 단다(예: spec.md:159 「— 다른 방의 같은 봇 참여는 남는다」). 그것들은 결과 설명이라 무해하지만, REQ-003 만은 부연이 아니라 **새 의무**다.

**Required fix**: REQ-003 을 「`openDb` 는 … 않아야 하며, **대신 v2 표 존재 검사로 옛 DB 파일을 거절해야 한다**」로 한 문장 두 절의 shall 형으로 합친다. 나머지 REQ 의 em-dash 부연은 손대지 않아도 된다.

---

### D7. 「취지를 담는다」류 판정 — `acceptance.md:66·82` · `spec.md:188`

**Severity: minor · Class: blocking**

세 자리가 문구의 **의미**를 판정 기준으로 삼는다.

- acceptance.md:82 (AC-010 Then): 「그 메시지가 «개발용 DB 파일을 지우고 새로 만들 것» **취지를 담는다**」
- acceptance.md:66 (AC-008 인프로세스 짝): 「`INSTRUCTIONS` 에 «chat_id 는 방 번호» **취지의 문장**이 있고」
- spec.md:188 (REQ-025): 「«…이력 커서는 결과 JSON 의 `cursor`» 라는 **뜻의 문장**으로 바뀌어야 하며」

「취지/뜻」은 판정자의 해석을 요구한다. acceptance.md:3 이 스스로 「«통과했다» 는 판정이 아니다 — 명령과 그 출력이 판정이다」라고 선언한 기준을 이 세 자리가 만족하지 못한다. 반대편에 AC-008 의 부정 단언(「«커서로는 chat_id 를 쓰세요» 문장이 없음」)은 문자열 일치라 이분 판정이 선다 — 같은 줄 안에서 두 강도가 섞여 있고, **약한 쪽이 기준의 강도를 정한다**.

**Required fix**: 판정할 문자열을 못 박는다. AC-010 은 「예외 메시지가 부분문자열 `개발용 DB 파일` 을 포함한다」처럼 `includes()` 로 설 수 있게 쓴다. AC-008 짝과 REQ-025 는 새 `INSTRUCTIONS` 문장을 **글자 그대로** SPEC 에 적고(§3.4 가 이미 「chat_id 는 방 번호, 이력 커서는 결과 JSON 의 cursor」를 가지고 있다), 단언을 그 문자열 일치로 바꾼다.

---

### D8. AC-025 의 넷째 명령에 이분 판정이 없다 — `acceptance.md:193·199`

**Severity: minor · Class: optional**

> **Then** 앞의 셋이 통과·0건·0건이고, 넷째는 **빨간 것을 확인만 한다**(C2 에서 다시 쓴다).

「확인만 한다」는 PASS/FAIL 을 낳지 않는다. 초록이어도, 다른 이유로 빨개도, 아예 실행 실패로 죽어도 이 기준의 Then 은 만족된다 — 즉 넷째 명령은 어떤 상태도 배제하지 못한다.

의도된 범위 밖 선언(spec.md:133 이 C2 소유로 명시)이라 optional 로 분류한다. 다만 이 SPEC 이 스스로 「명령 하나 또는 인프로세스 단언 하나로 판정한다」고 선언한 문서 안에, 아무것도 판정하지 않는 명령이 기준 본문에 들어 있다는 점은 기록해 둔다.

**제안(선택)**: 넷째 명령을 Then 에서 빼고 「참고 — 이 시점 `npx tsx scripts/e2e.mts` 는 빨갛다(C2 소유). 판정에 쓰지 않는다」로 기준 밖 각주로 옮긴다. 또는 「종료 코드가 0 이 **아님**을 확인한다」로 이분화한다(초록으로 바뀌었다면 그 자체가 알아야 할 사실이다).

---

### D9. 25 AC 중 REQ 번호를 인용하는 것이 0개 — `acceptance.md` 전체

**Severity: minor · Class: optional**

```bash
grep -n 'REQ' .moai/specs/SPEC-BOTMODEL-001/acceptance.md   # → 적중 없음
```

25개 AC 어느 것도 대응 REQ 를 명시하지 않는다. 역방향은 부분적으로 있다 — spec.md §7 표가 AC 8개를, plan.md §F 위험표가 AC 11개를 인용한다. 실질 대응은 절 구조(§B↔6.1, §C↔6.2, §D↔6.3, …)로 복원 가능하고, 감사에서 25 REQ 전부가 대응 AC 를 가짐을 확인했다(고아 REQ 0). 그래서 optional 이다.

**제안(선택)**: 각 AC 제목 줄 끝에 `(REQ-BOTMODEL-0NN)` 를 단다. 문서 길이를 거의 늘리지 않으면서 run 단계와 sync 감사가 대응을 다시 도출하지 않게 한다.

---

### D10. 요구사항이 구현 세부를 못 박는다 — `spec.md:178` 외

**Severity: minor · Class: optional**

REQ-BOTMODEL-021 은 `realpath` 검사와 `startsWith(filesRoot + sep)` 를 요구사항 본문에 박고, AC-019 의 변이 확인이 정확히 그 두 식별자를 변이한다. 일반 규칙(RQ-4: 요구사항에 함수명·API 스키마 금지)의 위반이다.

다만 이 SPEC 은 **행동 보존 리팩토링**이고 REQ-021 은 `[EXISTING]` — 「지금 의미 그대로 유지」가 요구사항 자체다. 보존 대상 기제를 이름으로 지목하는 것이 그 요구사항을 검사 가능하게 만드는 유일한 방법이므로, 여기서는 정당화된다. 파급 하나만 적어 둔다: 구현자가 동등하게 안전한 **다른** 기제를 골랐을 때 AC-019 의 변이가 실행 불가능해진다.

**제안(선택)**: REQ-021 에 「기제를 바꾸려면 AC-019 의 변이 두 개도 함께 다시 쓴다」는 단서 한 줄. 고치지 않아도 무방하다.

---

## 주의 — Tier L 상한에 정확히 닿아 있다

`spec-workflow.md` § SPEC Complexity Tier 의 REQ/AC 예산표는 Tier L 을 **25 / 25** 로 정한다. 이 SPEC 은 25 / 25 다(실측 확인). 상한 초과는 아니므로 위반이 아니다.

다만 **수리 여지가 0 이다.** D2 의 1안(AC-001·002 를 서버측/채널측으로 쪼개기)은 기준 수를 27 로 만들어 상한을 깬다. 그래서 D2 의 Required fix 는 「쪼개기」가 아니라 「기존 기준 안에 판정 파일과 단언을 명시하기」로 썼다. 2회차 수리가 새 기준을 더하는 방향으로 가면 상한 위반이 되고, 그때는 tier up 이 아니라 **SPEC 분할** 신호다(그 표가 명시하는 대로).

---

## Recommendation

FAIL. 2회차에서 아래 일곱(D1~D7, 전부 blocking)을 닫고 재감사한다. D8~D10 은 optional 이며 리드 재량이다 — **optional 을 전부 라우팅해 새 요구사항을 만들지 말 것**(과잉 설계 제동, `moai-constitution.md` § Agent Core Behaviors #4).

수리 순서 — 앞의 셋이 점수를 움직인다.

1. **D1** `acceptance.md:33` — AC-004 의 When 을 「`message_targets` 에 행을 직접 심고 `deliver` 를 부른다」로 다시 쓰고, 사람 라우트를 우회하는 이유(AC-024 가 그 경로를 400 으로 닫는다)를 한 줄로 적는다. 변이 확인 줄은 그대로 두면 이제 실제로 발동한다.
2. **D2** `acceptance.md:11-21` — AC-001·002 의 Then 안에 판정 파일과 단언을 명시한다(기준 수를 늘리지 않는다). 이음매를 재는 단언 — 채널 스텁 게이트웨이가 `message{room_id:R2}` 를 밀어 넣었을 때 `pushChatMessage` 가 낸 `meta.chat_id === "R2"` — 을 AC-001 Then 안에 넣으면 `channel/test/channel-server.test.ts` 에서 인프로세스로 선다.
3. **D3** `plan.md:28·44·56·66·77·81` — 마일스톤 판정 줄의 합집합이 25 가 되게 한다. M3 에 `019 · 020`, M4(또는 새 줄)에 `001 · 002`, M6 에 `007 · 008 · 025`.
4. **D4** `acceptance.md:5` — `(AC-007·008)` 로 고치고 짝 둘을 AC 번호에 귀속시킨다.
5. **D5** `spec.md:54` — §3 과 §6 의 우선순위 한 줄, 또는 §3.3 전칭에 각주.
6. **D6** `spec.md:151` — REQ-003 을 shall 형 한 문장 두 절로 합친다.
7. **D7** `acceptance.md:66·82` · `spec.md:188` — 「취지/뜻」 셋을 판정 문자열로 못 박는다. §3.4 의 문안을 그대로 쓰면 새 결정이 필요 없다.

재감사는 위 일곱의 delta 에만 범위를 두고, 1회차 통과 항목(계약 16줄 일치·테스트 파일 16개 실재·필수 관문 일곱)은 산출물이 그 자리에서 바뀐 경우에만 다시 잰다.

**점수 회복 추정**: D1·D2 가 Testability 를 0.65 → 0.85 근처로, D3·D4 가 Completeness 를 0.75 → 0.90 근처로, D5·D6·D7 이 Clarity 를 0.75 → 0.90 근처로 올린다. D9 를 함께 처리하면 Traceability 도 0.70 → 0.90 이 되어 조화평균 0.88 대가 나온다 — 통과선 0.85 를 넘는다. D9 를 건너뛰면 0.85 경계에 아슬하게 걸리므로, optional 중 D9 **하나만** 은 함께 처리하기를 권한다.

---

**감사 방법 주기**: 이 보고서의 모든 수치는 워크트리 `.claude/worktrees/v2-model`(브랜치 `WT-v2-model`)에서 실행한 명령의 출력이다. 인용한 명령은 전부 그 형태 그대로 돌렸고, 계수는 축약 옵션(`sort -u` · `head`) 없이 냈다. 다시 세려면 § 기계적으로 검증한 것의 명령을 그대로 실행하면 된다.
