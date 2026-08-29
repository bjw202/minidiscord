# 카드 t3 plan 감사 보고서 (감사자 B)

- 대상: `SPEC-MENTION-001`, `SPEC-SSE-001`, `SPEC-PERM-001`
- 반복 회차: 1
- 감사 일자: 2026-08-27
- 감사자: plan-auditor (adversarial, 읽기 전용)
- 근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md`, `.moai/plan/2026-08-26-minidiscord/spec-v2.md`, 그리고 이미 머지된 `server/src` · `server/test` 실물

---

## 0. 쉬운 말 요약

SPEC 세 벌을 적대적으로 감사했습니다. 결론은 **CONDITIONAL PASS** — 반드시 고쳐야 할 결함 5건이 있고, 그중 4건이 `SPEC-PERM-001` 에 몰려 있습니다. 가장 심각한 것은 권한 릴레이의 `AC-PERM-003` 이 **구현이 완전히 옳아도 실패하는** 검사라는 점이고(실제 Node 로 재현해 확인했습니다), `AC-PERM-010` 은 이번 감사의 주 축인 "아무것도 검증하지 않는 수용 기준" 부류에 정확히 해당합니다. `SPEC-MENTION-001` 은 결함이 없고, `SPEC-SSE-001` 은 파일 목록 검사 하나만 고치면 됩니다. 리드가 물은 네 가지 유예 판단과 한 가지 의도적 이탈은 **전부 저자의 읽기가 맞았고**, 원본 `plan-v2.md` Task 10 테스트 하네스의 차단급 결함 주장도 원문에서 그대로 확인됐습니다.

---

## 1. 최종 판정

**전체: CONDITIONAL PASS**

| SPEC | 판정 | 사유 |
|---|---|---|
| `SPEC-MENTION-001` | **PASS** | 필수 검사 전부 통과. 수용 기준 8개 중 공허한 것 0건. 원본 `plan-v2.md` Task 6 의 부정 테스트 결함을 식별해 강화했고, 근거 문서 모순 3건을 판정 가능성 기준으로 해소했으며, 리드 지시와 다른 선택(`mention.ts` 단수형, `Mention[]` 반환)을 보고 대상으로 명시함 |
| `SPEC-SSE-001` | **CONDITIONAL PASS** | 필수 수정 1건(MF-4). 나머지 11개 기준은 세 SPEC 중 가장 견고하며, 원본 Task 7 의 결함 네 건(소비되지 않는 `app.inject`, `reply.hijack()` 누락, 아무것도 단언하지 않는 방 격리 검사, 구독자 관측 수단 부재)을 모두 잡아냈음 |
| `SPEC-PERM-001` | **CONDITIONAL PASS** | 필수 수정 4건(MF-1, MF-2, MF-3, MF-5). 다만 결함의 성격이 설계가 아니라 **테스트 하네스와 두 기준의 기술적 오류**이며, 요구사항 계층(`REQ-PERM-001..014`)과 유예 판단은 전부 근거 문서·실소스에 부합함. 네 건 모두 국소 수정으로 해소됨 |

필수 검사(MP-1..MP-7) 실패는 없으므로 FAIL 이 아닙니다. 그러나 MF-1 과 MF-4 는 **올바른 구현을 실패시키는** 기준이고 MF-2 는 **잘못된 구현을 통과시키는** 기준이라, 이번 카드의 주 결함 부류에 직결됩니다. 수정 없이 run 단계로 넘기는 것은 권하지 않습니다.

**재감사 범위**: MF-1..MF-5 다섯 항목의 델타만 보면 됩니다. 전면 재감사는 불필요합니다.

---

## 2. 필수 검사 (Must-Pass)

| 항목 | 결과 | 근거 |
|---|---|---|
| MP-1 REQ 번호 연속성 | PASS | `REQ-MENTION-001..007`(문서 내 배치 순서는 001·002·005·003·004·006·007 이나 결번·중복 없음), `REQ-SSE-001..011`, `REQ-PERM-001..014` |
| MP-2 GEARS 형식 | PASS | 요구사항 계층(`REQ-*`) 전수 확인. 각 항목이 `(Ubiquitous)` / `(When …)` / `(Where …)` / `(Unwanted — shall not)` 을 명시. Given-When-Then 은 검증 계층(`AC-*`)에만 존재하며 §4 로 별도 채점 |
| MP-3 프론트매터 12필드 | PASS | 세 파일 모두 `id`/`title`/`version`/`status`/`created`/`updated`/`author`/`priority`/`phase`/`module`/`lifecycle`/`tags` 존재. snake_case 별칭(`created_at`·`updated_at`·`labels`·`spec_id`) 없음 |
| MP-4 언어 중립성 | N/A | 단일 언어(TypeScript) 프로젝트 |
| MP-5 D7 교차 SPEC 정합 | PASS | 참조된 `SPEC-CORE-001`·`SPEC-AUTH-001`·`SPEC-ROOM-001`·`SPEC-SSE-001`·`SPEC-GATEWAY-001` 모두 `.moai/specs/` 에 실재. retired/superseded/archived 상태 없음 |
| MP-6 D8 크로스플랫폼 | N/A | 세 SPEC 어디에도 `syscall` 문자열 없음 (grep 일치 0건) |
| MP-7 미해결 clarification | PASS | `grep -rn '\[NEEDS CLARIFICATION' .moai/specs/SPEC-{MENTION,SSE,PERM}-001/` → 종료 코드 `1`, 일치 0건 |

---

## 3. 제1축 — "검증하지 않는 수용 기준" 부류 훑기

기준 34개(MENTION 8 · SSE 12 · PERM 14)에 **전수**로 스텁 테스트를 적용했습니다. 판정 질문: "본문이 빈 구현, 또는 상수만 돌려주는 구현에서도 이 기준이 통과하는가?"

### MENTION 8개 — 결함 없음

`AC-MENTION-001`~`005`·`008` 이 스텁을 거릅니다. `AC-MENTION-006`(타입 계약)과 `AC-MENTION-007`(경계)은 동작을 재지 않으며, 그 사실이 `acceptance.md` 「스텁 대조」 표에 명시돼 있어 오독 여지가 없습니다. 특히 원본 `plan-v2.md` Task 6 의 부정 테스트 두 개(기대값 `[]`)를 정상 멘션 혼합형으로 강화한 것은 이 부류에 대한 정확한 대응입니다 — 원본 형태였다면 빈 스텁조차 잡지 못했습니다.

### SSE 12개 — 결함 없음

리드가 미리 지목한 고위험 지점 세 곳을 집중 확인했습니다.

- `AC-SSE-006`(구독자 정리): `subscriberCount` 가 **`1` 을 거쳐 `0`** 임을 둘 다 단언합니다. "누수 없음"의 공허한 형태(`0 → 0`)를 정확히 피했습니다.
- `AC-SSE-003`(방 격리): 부재가 아니라 **도착 순서**로 관측합니다(방 2 먼저 발행 → 방 1 발행 → 다음 프레임이 방 1 것). 전역 브로드캐스트 구현을 잡습니다.
- `AC-SSE-007`(구독자 없는 방 발행): 단독으로는 공허하다는 것을 문서가 스스로 인정하고 같은 테스트에 실제 전달 단언을 묶어 두었습니다.
- `AC-SSE-012` 셋째 관측(하트비트 부재)도 단독으로는 공허하나, 앞의 두 양성 관측(import 정확히 1줄 + 그 줄의 내용)이 빈 파일을 먼저 거릅니다. 이 한계를 문서가 명시합니다.
- `AC-SSE-008`(미인증): `401` 을 **양성으로** 단언하므로 라우트가 아예 없는 구현(`404`)도 걸립니다.

### PERM 14개 — 1건 결함 (`AC-PERM-010`)

나머지 13개는 견고합니다. `AC-PERM-005`(deny 를 deny 로), `AC-PERM-009`(미인증 시 `nextMessage → null` 부정 관측), `AC-PERM-011`(전달 실패 문구가 성공 문구와 다름)은 리드가 지목한 세 고위험 지점을 정확히 덮습니다. `AC-PERM-010` 의 결함은 §4 MF-2 에 기술합니다.

---

## 4. 필수 수정 목록 (Must-fix)

### MF-1 — `AC-PERM-003` 은 올바른 구현에 대해서도 실패한다

- **대상**: `SPEC-PERM-001/acceptance.md` → `AC-PERM-003` (요구사항 `REQ-PERM-001` SSE 절)
- **심각도**: critical
- **분류**: blocking

**결함**: 테스트가 스트림을 연 직후 `reader.read()` 를 **한 번만** 하고 그 청크에 `event: message` 와 `abcde` 가 있기를 기대합니다.

```ts
const chunk = new TextDecoder().decode((await reader.read()).value!)
expect(chunk).toContain('event: message')
expect(chunk).toContain('abcde')
```

그런데 `subscribe` 는 규정상 `: connected\n\n` 을 먼저 씁니다(`SPEC-SSE-001` `REQ-SSE-002` 단계 2). 첫 `read()` 는 그 주석을 받습니다.

**실행 증거**: Node v24.12.0 에서 `res.writeHead(200, {...})` + `res.write(': connected\n\n')` 서버를 띄우고 `fetch` 로 붙어 첫 청크를 읽으면 정확히 `": connected\n\n"` 입니다(직접 실행해 관측). 따라서 이 기준은 브로커가 완벽해도 실패합니다. 운 좋게 두 쓰기가 한 TCP 세그먼트로 합쳐지면 우연히 통과하므로, 최선의 경우에도 **간헐 결함**입니다.

**스텁 테스트 관점**: 이 기준은 공허하지 않습니다 — 반대 방향의 결함, 즉 **정상 구현을 거짓 실패시키는** 기준입니다. 그대로 두면 run 단계에서 브로커를 의심하며 시간을 태우게 됩니다.

**고칠 방법**: `SPEC-SSE-001` 의 `readFrame` 헬퍼처럼 연결 확인 주석을 먼저 소비한 뒤 다음 프레임을 읽습니다.

---

### MF-2 — `AC-PERM-010` 은 가로채기가 통째로 없는 구현도 통과시킨다

- **대상**: `SPEC-PERM-001/acceptance.md` → `AC-PERM-010` (요구사항 `REQ-PERM-010`)
- **심각도**: major
- **분류**: blocking

**결함**: `AC-PERM-010` 이 지목하는 두 테스트는 `plan-v2.md` Task 10 원본이며, 실제로 단언하는 것은 `expect(res.json().ok).toBe(true)` **하나뿐**입니다.

**스텁 테스트**: `tryHandleUserReply` 가 항상 `false` 를 돌려주는 껍데기 — 즉 `plan.md` §F M1 단계 3 이 만드는 바로 그 중간 상태 — 에서도 두 테스트는 통과합니다. 더 나아가 권한 릴레이 가로채기가 라우트에 아예 없어도 통과합니다. 부정 기준의 기대값이 정상 경로의 기본값과 같기 때문입니다.

**부수 결함(문서 정확성)**: `acceptance.md` 는 이 두 테스트를 이렇게 서술합니다 — *"앞은 `'그냥 대화'` 가, 뒤는 대기 항목에 없는 `'yes xxxxx'` 가 **평범한 메시지로 저장되며** 응답이 `ok: true` 임을 단언한다."* 원문 테스트에는 **저장을 확인하는 단언이 없습니다.** 원본 테스트의 검증력을 실제보다 크게 서술한 것이고, 이는 같은 문서 서두의 자기 선언("이 SPEC 의 수용 기준은 구현 본문이 비어 있어도 통과하는 기준을 하나도 두지 않는다")을 반증합니다.

**고칠 방법**: 두 테스트에 `author_type='user'` 행 수가 `1` 이 되었다는 양성 단언을 더하거나, 서술을 실제 단언에 맞춰 내리고 이 기준이 부류상 약하다는 것을 「스텁 대조」 형태로 명시합니다. 전자를 권합니다 — 후자는 문서 정확성만 회복하고 검증력은 그대로입니다.

---

### MF-3 — PERM 테스트 하네스가 `reply.hijack()` 을 빠뜨렸다

- **대상**: `SPEC-PERM-001/acceptance.md` → 「공통 테스트 하네스」의 `build()` 안 SSE 라우트 등록
- **심각도**: major
- **분류**: blocking
- **위배 대상**: `SPEC-SSE-001` `REQ-SSE-003`

**결함**: 하네스가 이렇게 씁니다.

```ts
app.get('/api/rooms/:id/events', { preHandler: [requireAuth] }, async (req, reply) => {
  hub.subscribe(Number((req.params as { id: string }).id), reply.raw)
})
```

`SPEC-PERM-001` 은 `depends_on` 에 `SPEC-SSE-001` 을 선언하고 있으며, 그 SPEC 의 `REQ-SSE-003` 은 `hub.subscribe` **앞에** `reply.hijack()` 을 부르라고 못 박습니다. 더욱이 `SPEC-SSE-001` `plan.md` §D 2번은 이 형태를 원본 `plan-v2.md` Task 7 의 결함으로 지목했는데, PERM 하네스가 그것을 그대로 재생산했습니다. 하네스는 원본에 세 가지를 더했다고 밝히면서(데코레이터·`listen`·SSE 라우트) 정작 형제 SPEC 이 확정한 이 한 줄을 빠뜨렸습니다.

**스텁 테스트 관점**: 공허한 기준이 아니라 **계약 이탈**입니다. 소유 SPEC 이 확정한 요구사항을 소비자가 다르게 쓰면, 프로덕션 코드와 테스트 하네스의 배선이 갈라져 테스트가 실제 동작을 재지 않게 됩니다.

**고칠 방법**: `hub.subscribe` 앞에 `reply.hijack()` 을 넣습니다.

---

### MF-4 — `AC-SSE-010` 관측 1은 카드 안 실행 순서에 따라 올바른 구현에서도 실패한다

- **대상**: `SPEC-SSE-001/acceptance.md` → `AC-SSE-010` 관측 1, 및 `SPEC-SSE-001/spec.md` → `REQ-SSE-010`
- **심각도**: major
- **분류**: blocking

**결함**: `REQ-SSE-010` 과 `AC-SSE-010` 관측 1은 구현 후 `server/src` 에 정확히 일곱 파일(`auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts`, `sse.ts`)만 존재하고 그중 `mention.ts` 가 **없어야** 한다고 못 박습니다.

그런데 카드 `t3` 안의 실행 순서가 그것을 허용하지 않습니다.

- `SPEC-GATEWAY-001` `spec.md:41` — *"`SPEC-MENTION-001`(`mention.ts` 순수 파서)과 `SPEC-SSE-001`(`sse.ts` 허브)이 먼저 끝나야 한다."*
- `SPEC-MENTION-001` `plan.md` §E — 자신을 *"카드 `t3` 의 **첫 번째**"* 로 못 박음.

즉 SSE 가 실행될 때 `mention.ts` 는 이미 존재할 공산이 크고, 그러면 `ls server/src` 가 여덟 항목이 되어 이 관측이 실패합니다. 원인은 **이 SPEC 이 통제하지 않는 다른 SPEC 의 산출물을 절대 목록으로 단언한 것**입니다. 같은 기준의 관측 3·4(`spec_base_sha` 기준 상대 diff)는 영향이 없습니다 — 상대 비교라 정확합니다.

**스텁 테스트 관점**: MF-1 과 같은 부류로, 공허한 것이 아니라 **정상 구현을 거짓 실패시키는** 기준입니다.

**고칠 방법**: 관측 1을 절대 열거에서 **음성 열거**로 바꿉니다 — `gateway.ts`·`routes-messages.ts`·`permissions.ts` 가 없을 것, 그리고 `sse.ts` 가 있을 것. `mention.ts` 는 이 SPEC 의 통제 밖이므로 목록에서 뺍니다. `REQ-SSE-010` 본문의 "일곱 파일만 존재한다" 문장도 함께 고쳐야 합니다.

---

### MF-5 — PERM 하네스가 listen 중인 서버를 정리하지 않는다

- **대상**: `SPEC-PERM-001/acceptance.md` → 「공통 테스트 하네스」의 `build()`, 및 `AC-PERM-002`·`AC-PERM-003`
- **심각도**: major (실행 안정성)
- **분류**: blocking

**결함**: `build()` 는 `await app.listen({ port: 0 })` 을 하지만 정리를 등록하지 않고, `afterEach` 는 `db.close()` 와 임시 디렉터리 삭제만 합니다. 각 테스트가 스스로 `app.close()` 를 불러야 하는데 `AC-PERM-002` 와 `AC-PERM-003` 은 부르지 않습니다. 열린 채 남은 서버는 vitest 프로세스를 종료시키지 않습니다.

**부수 결함(검증되지 않은 완화 주장)**: `SPEC-PERM-001` `plan.md` §E 는 WebSocket 테스트 불안정 위험의 완화책으로 *"각 테스트가 `app.close()` 로 정리한다"* 고 적었습니다. 자기 문서의 두 기준이 그렇지 않으므로, 이는 관측되지 않은 완화 주장입니다.

**고칠 방법**: `SPEC-SSE-001` 하네스처럼 `build()` 안에서 `cleanups.push(async () => app.close())` 를 등록해 `afterEach` 가 일괄 정리하게 합니다. 그러면 개별 테스트의 `app.close()` 누락이 결함이 되지 않습니다.

---

## 5. 있으면 좋은 것 (Nice-to-have)

- **NH-1** — `SPEC-SSE-001` `spec.md:177` 이 `server/src/mention.ts` 를 *"메시지 계층(Task 9)"* 소유로 적었으나 실제 소유자는 Task 6 / `SPEC-MENTION-001` 입니다. 표기만 고치면 됩니다. 분류: optional.
- **NH-2** — `SPEC-MENTION-001` `acceptance.md` `AC-MENTION-006` 이 "다음 **세 줄**" 이라 쓰고 네 줄(`import type` + 계약 고정 3개)을 보여 줍니다. 분류: optional.
- **NH-3** — `AC-PERM-011` 의 `expect(dropped.body).not.toBe(delivered.body.replace('abcde','fghij'))` 은 간접적입니다. `plan.md` §C 가 전달 실패 문구를 `⚠️ 봇이 접속해 있지 않아 판정을 전달하지 못했습니다 (<request_id>)` 로 확정했으므로, "성공 문구와 다르다"에 더해 그 본문이 실패를 뜻하는 표식을 담는다는 양성 단언을 하나 더 두면 더 단단합니다. 분류: optional.
- **NH-4** — `PERMISSION_REPLY_RE` 의 판정어 네 갈래(`y`/`yes`/`n`/`no`) 중 `n` 축약형을 덮는 기준이 없습니다. `AC-PERM-005` 는 `no` 만, `AC-PERM-012` 는 `Y`(승인 축약·대문자)만 잽니다. 분류: optional.
- **NH-5** — `SPEC-MENTION-001` 이 남긴 미해결 항목(봇 이름의 대소문자 구분을 파서가 정하지 않고 Task 9 로 넘김)은 판단이 옳고 기록도 명시적입니다. `SPEC-MSG-001` 이 그 결정을 실제로 내리는지는 MSG 감사에서 확인할 항목입니다. 분류: optional.

---

## 6. 제2축 — 유예 4건과 의도적 이탈 1건 (근거 문서·실소스 대조)

리드 지시대로 저자의 진술을 신뢰하지 않고 각각 원문에서 확인했습니다.

### 6.1 전용 승인/거절 HTTP 엔드포인트

- **저자 주장**: 원본에 없고, 판정은 `POST /api/rooms/:id/messages` 가 가로채는 평범한 채팅 메시지다.
- **검증 결과 — 맞다.** `plan-v2.md` Task 10 Step 3 은 `routes-messages.ts` POST 핸들러 안에 `(app as any).permissions?.tryHandleUserReply(roomId, body)` 한 줄을 넣으라고만 적고 새 라우트를 만들지 않습니다. `spec-v2.md` §7 권한 릴레이 흐름도 *"방에 system 메시지(… `yes|no <ID>`) → 사용자가 답 → 역경로로 `permission_verdict` 전달"* 로 채팅 경로를 명시합니다.
- **유예가 옳았나 — 옳다.** 두 번째 진입점을 만들면 대기 레지스트리에 진입점이 둘 생기고 "판정이 그 방의 대화에 남는다"는 성질이 깨집니다. Global Constraints 의 "계약 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다"에 부합합니다. `REQ-PERM-013` 이 이를 금지 조항으로 못 박은 것도 적절합니다.

### 6.2 방 멤버십 검사

- **저자 주장**: 멤버십 모델 자체가 없다(소유자 컬럼도 멤버 테이블도 없음). `spec-v2.md` §2 가 방별 접근 권한을 YAGNI 로 배제했다.
- **검증 결과 — 맞다.** `server/src/db.ts` 의 `SCHEMA` 실물을 확인했습니다. `rooms` 테이블은 `id` / `name` / `status` / `created_at` / `archived_at` 뿐이고 소유자 컬럼이 없으며, 멤버 테이블도 여덟 테이블 어디에도 없습니다. `spec-v2.md:32` — *"(방별 접근 권한은 없음 — YAGNI)"*.
- **유예가 옳았나 — 옳다.** 검사할 대상 자체가 존재하지 않습니다. 대신 `REQ-PERM-012`(로그인)와 `REQ-PERM-011`(방 대조) 두 경계를 세웠고, `AC-PERM-009` 와 `AC-PERM-008` 이 각각 **부정 관측**(`nextMessage → null`)으로 잽니다. 리드가 요구한 "접근 통제의 부정 사례 단언"은 충족됐습니다.

### 6.3 미응답 타임아웃

- **저자 주장**: 원본에 타이머가 없다.
- **검증 결과 — 맞다.** `plan-v2.md` Task 10 전체와 `spec-v2.md` §7·§8 에 타이머·만료 관련 서술이 전무합니다.
- **유예가 옳았나 — 옳다.** 만료 시 어떤 `behavior` 를 보낼지는 채널 계약 차원의 결정이고, Global Constraints 가 임의 계약 변경을 금지합니다. 별도 SPEC 이 맞습니다.

### 6.4 봇 연결 해제 시 대기 항목 정리

- **저자 주장**: 원본 게이트웨이의 `ws.on('close')` 는 연결 목록만 지우고 대기 레지스트리는 건드리지 않는다.
- **검증 결과 — 맞다.** `plan-v2.md:1461` — `ws.on('close', () => conns.delete(ws))`. 대기 레지스트리를 건드리지 않습니다.
- **유예가 옳았나 — 옳다. 네 유예 중 가장 잘 처리된 축이다.** 게이트웨이는 `SPEC-GATEWAY-001` 소유이고, PERM 은 그 상태의 **관측 가능한 결과**(판정 전송 실패 + 그 사실이 system 메시지에 드러남)만 확정했습니다. 소유권을 침범하지 않으면서 결과를 검증 가능하게 만든 것이 정확한 판단입니다.

### 6.5 의도적 이탈 — `Gateway.sendToBot` 의 boolean 반환값 읽기 (`REQ-PERM-009` / `AC-PERM-011`)

- **저자 주장**: 원본 구현은 반환값을 버리므로 봇이 죽어 있는 동안 누른 승인도 화면상 `✅ 승인 전송됨` 으로 보인다. 반환값을 읽어 전달 실패를 별도 문구로 밝힌다.
- **검증 결과 — 맞다. 그리고 이탈의 정도는 저자가 말한 것보다 작다.** `plan-v2.md:1192` 원문 주석이 `sendToBot(roomId: number, botId: number, payload: object): boolean  // Task 11 권한 verdict가 사용` 입니다. 즉 **반환값을 권한 릴레이가 쓰라고 원본이 직접 지시**한 셈이고, 원본 구현 코드가 그 값을 버린 것이 오히려 원본 내부의 불일치입니다.
- **이탈이 옳았나 — 옳다.** 이탈 범위는 결과 문구 하나이고 채널 계약(메시지 타입·필드 이름·`behavior` 값)은 손대지 않습니다. 원본 테스트도 결과 본문을 단언하지 않아 깨지지 않습니다.
- **권고**: 저자는 이것을 "의도적 이탈"로만 적었는데, `plan-v2.md:1192` 주석을 근거로 인용하면 **이탈이 아니라 원본 의도의 복원**으로 더 강하게 정당화할 수 있습니다. `spec.md` `REQ-PERM-009` 둘째 문단과 `plan.md` §D 3번에 이 인용을 추가하기를 권합니다.

---

## 7. 제3축 — 원본 `plan-v2.md` Task 10 Step 1 테스트 하네스의 차단급 결함

**저자의 주장은 그대로 성립합니다. 원문에서 직접 확인했습니다.**

`plan-v2.md` Task 10 Step 1 의 `build()` 는 다음 순서로 조립합니다.

```ts
registerMessageRoutes(app)
const broker = createPermissionBroker(app)
gateway.setPermissionHandler((info, params) => broker.onGatewayRequest(info, params))
```

`app.decorate('permissions', broker)` 가 **없습니다.** 반면 같은 Task 의 Step 3 라우트 삽입 지시는 이렇습니다.

```ts
if ((app as any).permissions?.tryHandleUserReply(roomId, body)) {
  return { ok: true, consumed_by: 'permission' }
}
```

그리고 같은 Step 3 의 `index.ts` 배선 지시에는 `app.decorate('permissions', broker)` 가 분명히 있습니다. 즉 **테스트 하네스와 프로덕션 배선 지시가 서로 어긋납니다.**

데코레이터가 없으면 `(app as any).permissions` 는 `undefined` 이고, 옵셔널 체이닝이 오류 없이 `undefined` 를 냅니다. 따라서 원본 테스트 `user yes reply sends verdict to the bot and is not stored as user message` 는 **브로커 구현이 완전히 옳아도 실패합니다** — 답이 평범한 메시지로 저장되어 `res.json().consumed_by` 가 나오지 않고 `userMsgs.c` 가 `1` 이 됩니다.

**저자의 대응 판정: 적절함.** `acceptance.md` 공통 하네스가 그 줄을 채우고, 데코레이션 자체를 `REQ-PERM-004` 로 요구사항 계층에 올렸습니다. 특히 이 결함이 **조용한** 이유(옵셔널 체이닝이 오류 대신 `undefined` 를 냄)를 기록하고, 같은 이유로 운영 코드에서 그 한 줄이 빠지면 권한 릴레이 전체가 무오류로 죽는다는 점을 요구사항으로 승격한 판단이 정확합니다. `AC-PERM-006` 의 `consumed_by` 관측이 배선의 유일한 증거라는 서술도 맞습니다.

---

## 8. 제4축 — 완결성과 교차 SPEC 계약 드리프트

### 8.1 Task 6 / 7 / 10 커버리지

세 SPEC 이 원본 태스크의 파일 목록·인터페이스·테스트를 빠짐없이 덮습니다. 원본이 제공한 각 테스트가 어느 AC 로 흡수됐는지 추적 가능하고, 이탈한 곳(멘션 부정 테스트 2개, SSE 방 격리 테스트, SSE `subscriberCount` 추가, PERM 하네스 3줄)은 전부 각 `plan.md` §D 에 근거와 함께 기록돼 있습니다.

### 8.2 시그니처·필드·타입 대조 — 소유자 대 소비자

| 계약 | 소유 SPEC | 소비 SPEC 의 기재 | 판정 |
|---|---|---|---|
| `parseMentions(body: string): Mention[]`, `Mention = { bot: string; delivery: 'to' \| 'cc' }` | MENTION `REQ-MENTION-003` | `SPEC-MSG-001` `spec.md:77` 이 글자 그대로 동일하게 기재 | 일치 |
| `SseHub.subscribe(roomId: number, res: ServerResponse): void` | SSE `REQ-SSE-001` | GATEWAY·MSG·PERM 모두 직접 호출하지 않음 | 일치 |
| `SseHub.publish(roomId: number, event: string, data: unknown): void` | SSE `REQ-SSE-001` | GATEWAY `spec.md:67`·`118`·`126`, MSG `spec.md:78`·`128`, PERM `spec.md:68` — 인자 수·순서·이름 모두 동일 | 일치 |
| `SseHub.subscriberCount(roomId: number): number` (SSE 의 추가분) | SSE `REQ-SSE-001` | 소비자 없음. `index.ts` 가 `hub: ReturnType<typeof createSseHub>` 로 선언하므로 메서드 추가가 소비자를 깨지 않음 | 안전한 확장 |
| `ConnInfo { roomId: number; botId: number }` | GATEWAY `spec.md:174` | PERM `spec.md:75` 축약 없이 동일 | 일치 |
| `sendToBot(roomId: number, botId: number, payload: object): boolean` | GATEWAY `spec.md:179` | PERM `spec.md:78` 동일 | 일치 |
| `setPermissionHandler(fn: ((info: ConnInfo, params: any) => void) \| null): void` | GATEWAY `spec.md:180` | PERM `spec.md:79` 동일. 브로커 쪽에서 네 필드로 좁혀 받고 그 좁히기를 `plan.md` §D 5번에 기록 | 일치 |
| `createGateway(app: FastifyInstance, opts: { uploadsDir: string }): Gateway` | GATEWAY `spec.md:182` | PERM 하네스가 `createGateway(app, { uploadsDir: join(dir,'up') })` | 일치 |
| `POST /api/rooms/:id/messages` 응답 `{ ok: true, message }` | MSG `spec.md:88` | PERM 이 `res.json().ok` / `res.json().consumed_by` 로 소비 | 일치 |
| `routes-messages.ts` 소유권 | MSG `spec.md:144` (새 파일 하나 + `index.ts` 수정, `permissions.ts` 를 만들지 않음) | PERM `REQ-PERM-013` (가로채기 한 갈래만 추가, `registerMessageRoutes` 시그니처 불변) | 충돌 없음 |

**시그니처·필드 이름·타입의 드리프트는 0건입니다.**

### 8.3 드리프트가 아니지만 기록할 것

- **`setPermissionHandler` 의 `params` 타입** — `plan-v2.md` 원본은 `PermissionRequestParams` 로 쓰는데 `SPEC-GATEWAY-001` `spec.md:180` 은 `any` 로 확정했습니다. PERM 은 GATEWAY 의 `any` 를 정확히 소비하므로 **PERM 의 결함이 아닙니다.** 이는 GATEWAY 소유의 결정이며, GATEWAY 감사자가 볼 항목입니다. PERM 은 이 좁히기의 위험(게이트웨이가 보내는 필드 이름이 바뀌면 타입 검사로 잡히지 않고 런타임에 `undefined` 가 문자열에 박힘)을 `plan.md` §D 5번에 기록하고 `AC-PERM-001`·`AC-PERM-002` 의 본문 내용 단언으로 잡도록 설계했습니다 — 적절한 처리입니다.
- **MF-3 은 계약 드리프트로도 분류됩니다** — `SPEC-SSE-001` `REQ-SSE-003` 이 확정한 `reply.hijack()` 을 소비자 하네스가 다르게 씀. §4 MF-3 참조.
- **MF-4 는 파일 소유권 드리프트입니다** — `SPEC-SSE-001` 이 자신이 통제하지 않는 `mention.ts` 의 부재를 단언함. §4 MF-4 참조.

---

## 9. 검증하지 않은 것 (Gaps) — 명시

정직하게 적습니다.

1. **어떤 테스트도 실행하지 않았습니다.** 이 워크트리에는 `node_modules` 가 없고(`SPEC-MENTION-001` `plan.md` §E 가 `sh: vitest: command not found`, 종료 코드 `127` 로 이미 관측해 기록해 둠), 세 SPEC 모두 구현 파일(`mention.ts`·`sse.ts`·`permissions.ts`·`gateway.ts`·`routes-messages.ts`)이 아직 존재하지 않습니다. 수용 기준의 명령을 실제로 돌려 본 것이 아니라 **문서 대조와 코드 읽기**로 판정했습니다.
2. **예외 하나 — MF-1 의 근거는 실행 관측입니다.** Node v24.12.0 에서 `res.writeHead(200, {'content-type':'text/event-stream','cache-control':'no-cache',connection:'keep-alive'})` + `res.write(': connected\n\n')` 서버에 `fetch` 로 붙어 첫 청크를 읽으면 `": connected\n\n"` 임을 확인했습니다. 같은 실행에서 `res.headers.get('connection')` 이 `keep-alive` 를 돌려주는 것도 확인해, `AC-SSE-002` 의 `connection` 헤더 단언이 undici 에서 관측 불가능할 위험은 **없다**고 판정했습니다(사전에 의심했던 항목이므로 밝힙니다). 이 확인용 임시 스크립트는 삭제했고 워크트리에 남기지 않았습니다.
3. **`app.inject` 에 `FormData` 를 `payload` 로 넘기는 형태**(`SPEC-PERM-001` 하네스의 `post()` 헬퍼)가 이 워크스페이스의 light-my-request 판에서 동작하는지 확인하지 못했습니다. 원본 `plan-v2.md` Task 10 에서 그대로 물려받은 형태입니다 — **미검증**.
4. **`reply.hijack()` 도입이 Fastify v5 에서 부작용을 내는지** 확인하지 못했습니다. `SPEC-SSE-001` `plan.md` §D 2번이 스스로 미검증으로 기록한 항목이며, 이 감사도 그 판단을 실행으로 뒤집지 못했습니다 — **미검증**.
5. **`SPEC-GATEWAY-001` 과 `SPEC-MSG-001` 자체는 감사하지 않았습니다.** 계약 대조에 필요한 범위(시그니처·소유 파일·응답 형태)만 읽었습니다. 두 SPEC 의 내부 수용 기준 품질은 이 보고서의 판정 대상이 아닙니다.
6. **`AC-SSE-009` 의 데이터 디렉터리 격리 방법**은 `SPEC-SSE-001` `plan.md` §F M2 단계 1 이 "run 단계의 첫 작업"으로 미룬 항목입니다. 계획대로 미룬 것이며, 그 격리가 실제로 가능한지는 확인하지 않았습니다 — **미검증**. (`config.dataDir` 이 게터로 지연 평가된다는 전제는 `server/src/config.ts:5` 실물에서 확인했습니다.)
7. **`vitest --reporter=verbose` 의 `✓` 줄 형식**이 이 워크트리에서 실제로 그 모양인지 확인하지 못했습니다. 세 SPEC 모두 앞 카드(`SPEC-BOT-001` `progress.md` §E.2)의 관측 출력을 근거로 삼았고, 저 역시 그 근거의 존재만 확인했을 뿐 재현하지 않았습니다 — **미검증**.
8. `.moai/plan/2026-08-26-minidiscord/.moai/` 라는 중첩 디렉터리가 워크트리에 추적되지 않은 상태로 존재합니다. 이 감사의 범위 밖이라 열어 보지 않았습니다.

---

## 10. 감사 대상 파일 (절대 경로)

- `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/.moai/specs/SPEC-MENTION-001/` — `spec.md`, `plan.md`, `acceptance.md`, `progress.md`
- `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/.moai/specs/SPEC-SSE-001/` — 동일 4종 (MF-4: `acceptance.md` `AC-SSE-010` 관측 1, `spec.md` `REQ-SSE-010`)
- `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/.moai/specs/SPEC-PERM-001/` — 동일 4종 (MF-1 `acceptance.md` `AC-PERM-003`, MF-2 `AC-PERM-010`, MF-3·MF-5 「공통 테스트 하네스」 `build()`)
- 근거: `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/.moai/plan/2026-08-26-minidiscord/plan-v2.md` (Task 6 · 7 · 10, Global Constraints, 파일 구조, 3869행 타입 일관성 주석), `spec-v2.md` (§2 · §7 · §8 · §9)
- 실소스: `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/server/src/` (`index.ts`, `db.ts`, `config.ts`, `auth.ts`, `routes-bots.ts`), `server/tsconfig.json`, `server/package.json`
