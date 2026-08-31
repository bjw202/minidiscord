# SPEC-MSG-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-MSG-001` |
| 칸반 카드 | `t3` (마일스톤 M3) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 9 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 5·6·7·8·9장 |
| 워크트리 | `.claude/worktrees/t3` |
| 선행 SPEC | `SPEC-CORE-001` → `SPEC-AUTH-001` → `SPEC-ROOM-001` → `SPEC-MENTION-001` / `SPEC-SSE-001` → `SPEC-GATEWAY-001` |
| 실행 순서 | 카드 `t3` 의 네 SPEC 중 **네 번째(마지막)** |
| 현재 상태 | `in-progress` — run 단계 완료 (AC 15/15 PASS, audit-ready) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-MSG-001
tier: M
card: t3
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001, SPEC-MENTION-001, SPEC-SSE-001, SPEC-GATEWAY-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 9)
spec_version: "0.2.0"
req_count: 15
ac_count: 15
tier_budget: "16 REQ / 16 AC"
plan_audit: .moai/reports/t3-plan-audit-a.md
plan_audit_verdict: "CONDITIONAL PASS — must-fix 4건(M1..M4) + nice-to-have 7 반영 완료 (v0.2.0)"
spec_base_sha: "f7bccbdc5d85b41aa42d5dc7c71c1af75e5cd814"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-MSG-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 SPEC 에서는 이 기준점 위에 검사 **두 개**가 올라간다 — `db.ts` 불변과 "손댄 소스 파일은 `index.ts`·`routes-messages.ts` 둘뿐"(REQ-MSG-014).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-MSG-001/spec.md` | GEARS 요구사항 14개 (REQ-MSG-001..014), 범위 밖 7개 항목, 제약, HISTORY 0.1.0 |
| `.moai/specs/SPEC-MSG-001/plan.md` | 의존 표, 되돌리기 어려운 결정 2건(메시지 커서 / 업로드 경로), 원본 모순 7건, 위험 12건, 마일스톤 M1-M3, 안티패턴 15건 |
| `.moai/specs/SPEC-MSG-001/acceptance.md` | 수용 기준 14개 (AC-MSG-001..014), 테스트 본문 포함 Given-When-Then, 엣지 케이스 11건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-MSG-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-MSG-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

15개 REQ 전부가 하나 이상의 AC 에 매핑됐다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-MSG-001 | 전송 성공 — `200` + `{ ok, message }`, `message.id` 가 저장 행 | AC-MSG-001 |
| REQ-MSG-002 | 멘션 → `message_targets` (to/cc) | AC-MSG-002 |
| REQ-MSG-003 | 미초대 봇 멘션 → `400` + 이름 포함, 무쓰기 | AC-MSG-003 |
| REQ-MSG-004 | 없는 방 `404` / 보관된 방 `409`, 본문 구분 | AC-MSG-004 |
| REQ-MSG-005 | 빈 전송 `400` | AC-MSG-005 |
| REQ-MSG-006 | 첨부 저장 (`filename`/`stored_path`/`size`/`mime`) | AC-MSG-006 |
| REQ-MSG-007 | 업로드 경로 이탈 금지 (쓰기 시점 `basename`) | AC-MSG-007 |
| REQ-MSG-008 | 다운로드 — 헤더·MIME, 없으면 `404` | AC-MSG-006 |
| REQ-MSG-009 | 업로드 디렉터리 밖 첨부 제공 금지 (읽기 시점 봉인) | AC-MSG-008 |
| REQ-MSG-010 | SSE `publish` + 게이트웨이 `deliver` 각 1회, 페이로드가 실제 그 메시지 | AC-MSG-009 |
| REQ-MSG-011 | 목록 — 방 한정, `id > after`, 오름차순, `author_name`·`attachments` | AC-MSG-010, AC-MSG-011 |
| REQ-MSG-012 | 커서 = `messages.id`, 게이트웨이와 공유 | AC-MSG-010 (`ids[1] > ids[0]` 단조성), AC-MSG-009 (`deliver` 의 `msg.id` 가 실제 그 메시지) |
| REQ-MSG-013 | 세 라우트 `requireAuth`, 미인증 `401` | AC-MSG-012 |
| REQ-MSG-014 | 범위 경계 — 새 파일 하나, 수정 파일 하나, `SCHEMA` 불변, `permissions.ts` 없음 | AC-MSG-013 |
| REQ-MSG-015 | 프로덕션 배선 — `registerMessageRoutes` 시그니처, `uploadsDir` 데코레이터, multipart 가 라우트보다 먼저 등록 | AC-MSG-015 |
| (전 구간) | RED→GREEN 전이 증거 | AC-MSG-014 |

### 수용 기준 자기 점검 — "스텁에도 통과하는 기준이 있는가"

카드 `t2` 에서 같은 결함 부류(아무것도 검증하지 않는 수용 기준)가 세 번 재생산됐다. 그래서 개별 확인이 아니라 **부류로 한 번 훑었다.** 열네 기준 각각에 대해 "구현 본문이 비어 있어도 이 단언이 성립하는가"를 물었고, 성립하는 것은 전부 다시 썼다.

| 걸러 낸 형태 | 어디에 있었나 | 어떻게 고쳤나 |
|--------------|--------------|--------------|
| "이름 붙은 테스트가 통과한다"를 기본 리포터로 판정 | 열두 기준 전부의 후보 형태 | 명령을 `npm test -w server -- --reporter=verbose` 로 고정하고, 관측 대상을 `✓ … > messages > <이름>` 줄의 실제 출현으로 못 박았다. 테스트를 안 썼든 이름이 다르든 건너뛰었든 전부 실패로 드러난다 |
| `statusCode === 200` 만 보는 성공 기준 | AC-MSG-001 초안 | `res.json().message.id` 가 실제 저장 행의 `id` 와 같은지 단언을 더했다. 아무것도 저장하지 않고 `{ ok: true }` 만 돌려주는 구현이 걸린다 |
| "거부된다"만 보는 실패 기준 | AC-MSG-003, AC-MSG-005 | 각각에 **대조군**(정상 요청이 같은 라우트에서 통과한다)을 더했다. 모든 요청을 `400` 으로 막는 구현이 걸린다 |
| 인증 기준이 긍정 사례만 관측 | AC-MSG-012 초안 | 부정 사례를 본체로 삼았다 — 쿠키 없는 세 요청이 `[401, 401, 401]`. 여기에 대조군과 "거부된 전송이 저장되지 않았다"를 더해 세 겹으로 만들었다 |
| 경로 이탈 방어를 "파일이 존재한다"로 관측 | AC-MSG-007 초안 | 구체적 입력(`../../../../etc/passwd`)을 명시하고, `filename === 'passwd'` + `resolve(stored_path)` 가 업로드 디렉터리 아래 + 그 경로에 파일 존재, 세 단언으로 나눴다 |
| 읽기 시점 봉인을 상태 코드만으로 관측 | AC-MSG-008 초안 | `404` 와 함께 `dl.body` 에 파일 내용이 없다는 단언을 더했다. `404` 를 내면서 본문을 실어 보내는 구현이 걸린다 |
| 목록 기준이 한 방만 확인 | AC-MSG-011 초안 | 방 두 개를 교차 확인하도록 바꿨다. `WHERE room_id=?` 를 빠뜨린 구현이 걸린다 |
| 팬아웃이 어느 기준에도 관측되지 않음 | 초안 전체 | AC-MSG-009 를 신설했다. `publish`/`deliver` 를 아예 부르지 않아도 나머지 열세 기준은 전부 통과한다 — DB 에는 다 들어가기 때문이다. 스파이로 호출 횟수와 인자를 직접 관측한다 |
| "파일이 존재한다"만 보는 범위 경계 | AC-MSG-013 초안 | `spec_base_sha` 기준 `git diff` 두 개로 바꾸고, 기준 SHA 가 실제 커밋으로 풀리는 것(`git rev-parse --verify` 종료 코드 `0`)을 선행 관측으로 올렸다. 빈 출력만 보고 통과로 적는 경로를 막는다 (`SPEC-BOT-001` BOT-B2·R1 의 교훈) |

남은 기준 가운데 구현 본문이 빈 채로 통과하는 것은 없다. AC-MSG-014(RED→GREEN)만은 성질상 절차 증거이며, 관측 대상을 "실패 원인이 출력에서 확인되는가"로 두어 형식적 통과를 막았다.

### 이 단계에서 하지 않은 것 (Gaps)

- 이 SPEC 의 산출물 코드는 한 줄도 작성하지 않았다. `server/src/routes-messages.ts` 도 `server/test/messages.test.ts` 도 미생성이며, `server/src/index.ts` 도 수정하지 않았다 — run 단계 소관이다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. `npm test -w server` 가 현재 몇 개 통과하는지 **미검증**이다. 이 워크트리에는 `node_modules` 가 없어 지금 실행해도 의미 있는 관측이 나오지 않는다.
- **형제 SPEC 세 개(`SPEC-MENTION-001`·`SPEC-SSE-001`·`SPEC-GATEWAY-001`)의 문서를 읽지 않았다.** 같은 세션에서 다른 에이전트가 동시에 쓰고 있었기 때문이다. 이 SPEC 이 인용하는 세 인터페이스(`parseMentions` 의 반환 형태, `hub.publish` 시그니처, `gateway.deliver` 시그니처)는 형제 SPEC 문서가 아니라 **원본 `plan-v2.md` Task 6·7·8 의 Interfaces 절**에서 직접 가져왔다. 형제 SPEC 이 원본에서 이탈했다면 §A 의존 표와 AC-MSG-009 의 스파이 단언이 어긋날 수 있다 — plan-audit 단계에서 교차 확인이 필요한 항목이다.
- `plan-v2.md` Task 10(권한 릴레이) 이후는 읽지 않았다. 이 SPEC 범위 밖이다.
- `plan.md` §D 6번(멘션 오류 시 디스크에 남는 고아 업로드 파일)은 **의도적으로 미해결**이다. 원자적 이동과 함께 범위 밖으로 두었고, AC-MSG-003 본문에 관측 경계를 적어 두었다.
- **형제 SPEC `SPEC-PERM-001` 과의 파일 경계는 관측 방식으로만 분리했다.** 그 SPEC 이 `server/src/permissions.ts` 를 만들 예정이므로, AC-MSG-013 은 그 파일의 존재 여부를 보지 않고 `git diff --name-only <spec_base_sha>` 출력에 나타나는가만 본다. 두 SPEC 이 같은 카드에서 `index.ts` 를 함께 수정할 가능성은 **미검증**이다 — 순서가 겹치면 넷째 관측(정확히 두 줄)이 깨질 수 있고, plan-audit 단계에서 실행 순서 확인이 필요하다.
- `plan.md` §D 2번(방별 인가 부재)은 **해결이 아니라 경계 선언**이다. 스키마에 구성원 개념이 없어 이 SPEC 이 강제할 수 없고, 필요해지면 별도 SPEC 이다.

---

## §Audit Response — plan-audit 교정 라운드 (v0.2.0)

근거 보고서: `.moai/reports/t3-plan-audit-a.md` (감사 일자 2026-08-27). 판정은 **CONDITIONAL PASS**, must-fix 4건(M1..M4)이다. 네 건 전부와 nice-to-have 7번을 반영했다. 요구사항 14→15개, 수용 기준 14→15개로 각각 하나씩 늘었고 Tier M 상한 16 이내다.

### M1 — 공통 하네스의 `set-cookie` 처리 (열두 기준 실행 불능)

**확인한 사실.** `server/test/rooms-bots.test.ts:21-26` 을 직접 읽어 `setCookieOf` 헬퍼와 그 주석("light-my-request 는 set-cookie 값을 배열이 아니라 문자열 하나로 돌려준다")이 실재함을 확인했다. 초판 하네스의 `login.headers['set-cookie']![0]` 은 문자열의 첫 글자 `"m"` 을 집어내므로 모든 요청이 `401` 이 된다 — 스텁이 통과하는 방향이 아니라 **정상 구현조차 통과할 수 없는** 방향의 결함이다.

**고친 것.** `acceptance.md` 공통 하네스에 `setCookieOf` 를 기존 스위트와 글자 단위로 같은 형태로 두고, `build()` 의 반환을 `setCookieOf(login).split(';')[0]` 으로 바꿨다. 하네스 서두에 교정 두 곳의 근거를 적었다. `plan.md` §D 에 **8번** 항목으로 경위를 남겼고(감사 보고서가 지정한 번호), §E 위험 표와 §H 안티패턴에 각각 한 행을 더했으며, §F M1 단계 1 이 이 교정을 절차로 요구하도록 고쳤다.

### M2 — 프로덕션 배선을 관측하는 기준이 없음

**고친 것 (a) 규범.** `spec.md` 에 §4.4 를 신설하고 **REQ-MSG-015** 를 추가했다. `registerMessageRoutes(app: FastifyInstance): void` 시그니처를 글자 그대로 고정하고, 배선 네 가지(`uploadsDir` 데코레이트 / multipart 등록 / 라우트 등록 / `declare module` 확장)를 열거했으며, **multipart 등록이 라우트 등록보다 앞선다는 순서가 계약의 일부**임을 명시했다. 기존 §4.4 는 §4.5 로 밀렸다.

**고친 것 (b) 관측.** **AC-MSG-015** 를 신설했다. 형제 SPEC 의 AC-GW-018 과 같은 형태로 실제 `buildServer()` 를 띄우고, 네 관측이 각각 배선의 한 조각을 맡는다 — `uploadsDir` 데코레이터가 `config.uploadsDir` 과 같은지, multipart 를 태운 실제 form 전송이 왕복하는지, 목록 라우트가 방금 것을 돌려주는지, 다운로드 라우트가 등록돼 있는지.

**스텁 훑기를 새 기준에 적용한 결과 하나를 더 막았다.** 네 번째 관측을 `dl.statusCode === 404` 로만 두면 아무것도 검증하지 못한다 — **라우트를 등록하지 않아도 Fastify 가 `404` 를 내기 때문**에 "등록됨"과 "미등록"이 같은 값이 된다. 그래서 응답 본문이 Fastify 기본 미등록 응답(`Route GET:… not found`)이 아닌지까지 단언한다. 두 번째 관측도 상태 코드만 보지 않고 `sent.json().message.body` 가 보낸 문자열과 같은지 본다.

`plan.md` §D 에 **9번** 항목으로 경위를 적고, §E 위험 표 두 행·§H 안티패턴 두 항목·§F M2 수용 기준 목록을 함께 고쳤다.

### M3 — AC-MSG-009 가 `Gateway.deliver` 의 두 번째 인자를 단언하지 않음

**고친 것.** 세 단언을 더했다 — `delivered[0][1].id` 가 실제 저장된 `message id`, `.body` 가 보낸 문자열, `.author_name` 이 `'alice'`. 감사 보고서가 같은 문단에서 지적한 SSE 쪽 구멍도 함께 막아 `published[0][2].id` 와 `.author_name` 을 단언한다. 기준 본문에 이유를 적었다 — 게이트웨이가 그 `msg.id` 로 `bot_tokens.last_delivered_id` 를 올리므로(`plan-v2.md:1580`), 빈 객체가 넘어가면 REQ-MSG-012 의 커서 체계가 조용히 깨지고 봇의 재접속 복구가 잘못된 지점에서 시작한다.

### M4 — REQ-MSG-006 / 007 / 009 의 `config.uploadsDir` 이 수용 기준과 모순

**고친 것.** REQ-MSG-006 본문의 `(config.uploadsDir)` 을 빼고, 그 아래에 **"업로드 디렉터리의 정의"** 상자를 두었다 — `req.server.uploadsDir` 데코레이터가 가리키는 경로이며, 프로덕션에서는 `buildServer()` 가 그 값을 `config.uploadsDir` 로 설정하고(REQ-MSG-015) 테스트에서는 하네스가 임시 디렉터리로 설정한다. **구현이 `config.uploadsDir` 을 직접 읽어서는 안 된다**는 금지도 함께 적었다. REQ-MSG-007 과 REQ-MSG-009 는 "업로드 디렉터리"라는 같은 용어를 쓰므로 정의 상자가 셋을 함께 덮고, REQ-MSG-009 에는 정의 위치를 명시적으로 가리키는 참조를 넣었다.

감사가 권고한 "데코레이터의 존재 자체를 REQ 로 승격"은 M2 와 함께 처리했다 — REQ-MSG-015 항목 1 이 그것이고, AC-MSG-015 1번이 관측한다.

### nice-to-have 7 — MIME 표가 SPEC 안에 없음

**고친 것.** `plan-v2.md:1758-1762` 의 `MIME` 상수를 REQ-MSG-006 본문의 표로 옮겼다. 열 행 전부(`.txt`·`.log` → `text/plain` 포함)와 기본값 `application/octet-stream`, 그리고 확장자를 소문자로 정규화해 비교한다는 규칙을 적었고, 이 SPEC 이 그 내용의 소유자임을 명시했다.

### 곁들여 고친 것 (감사 지적 아님)

`spec.md` §5 와 `acceptance.md` 엣지 케이스 표의 "없는 방 목록 조회" 행이 `plan.md §D 5번`(`last_insert_rowid`)을 가리키고 있었다 — 초판 작성 시의 잘못된 상호 참조다. 각각 REQ-MSG-011 과 `spec.md §5` 를 가리키도록 고쳤다.

### 이번 라운드에서 닫지 않은 것 (미해결)

감사 보고서 §3 의 나머지 일곱 항목은 리드 재량으로 분류돼 있고 이번 지시 범위 밖이라 그대로 둔다. 그중 SPEC-MSG-001 에 해당하는 것은 다음 다섯이며, 전부 **미해결**이다.

- **항목 3** — 검증되지 않는 잔여 요건: REQ-MSG-011 의 `LIMIT 200`, REQ-MSG-001 응답의 `attachments` 배열, REQ-MSG-008 의 응답 `content-type`. 매핑된 AC 는 있으나 그 절을 실제로 관측하지 않는 부분 미검증 상태다.
- **항목 4** — AC-MSG-006 의 `content-disposition` 단언이 접두사(`filename*=UTF-8''`)만 본다. 파일명을 하드코딩한 헤더도 통과한다. `encodeURIComponent('첨부.txt')` 결과 포함 여부를 보는 편이 낫다.
- **항목 5** — AC-MSG-004 가 `messages` 개수만 센다. REQ-MSG-004 는 "어떤 테이블에도"이므로 `message_targets`·`attachments` 도 함께 봐야 AC-MSG-003 과 대칭이 맞는다.
- **항목 6** — 이 SPEC 의 어느 테스트도 `await app.close()` 를 부르지 않는다(신설한 AC-MSG-015 만 예외). `createGateway` 가 연 `WebSocketServer` 의 `onClose` 정리가 실행되지 않아 vitest 종료가 지연될 수 있다.
- **항목 8** — AC-MSG-007 의 테스트 이름 `refuses to store an upload outside the uploads directory` 가 동작과 반대다. 본문은 `200`(정상 저장, 이름만 소독)을 단언하므로 `sanitizes an upload filename so it cannot escape…` 쪽이 정확하다.

항목 4·5·8 은 각각 한두 줄 수정이고 항목 6 은 하네스 한 줄이라, 리드가 지시하면 같은 라운드에서 닫을 수 있다.

**감사가 명시한 미검증 항목은 그대로 남는다.** 감사자는 테스트를 실행하지 않았고(`§7`), M1 은 코드 대조와 기존 주석에 근거한 판정이다. 나도 실행하지 않았다 — 이 워크트리에 `node_modules` 가 없어 지금 실행해도 의미 있는 관측이 나오지 않는다. 다만 M1 의 근거인 `rooms-bots.test.ts:21-26` 은 직접 읽어 확인했고, M2 의 참조 형태인 AC-GW-018 도 직접 읽었다.

---

## §E.2 Run-phase Evidence

실행 환경: 워크트리 `.claude/worktrees/t3`, 브랜치 `WT-msg-gateway-relay`. 기준점(`spec_base_sha`) = `f7bccbdc5d85b41aa42d5dc7c71c1af75e5cd814` (M1 단계 0 에 `.spec-base-sha` 로 기록).

**시작 baseline (f7bccbd, 직접 실행 확인):**

```
$ npm test -w server -- --run
 Test Files  8 passed (8)
      Tests  70 passed (70)
```

테스트 파일 본문은 `acceptance.md` 의 Given-When-Then 시나리오를 그대로 옮겼다 (이름·본문 글자 단위 동일). 구현 파일은 `server/src/routes-messages.ts` (신규) 와 `server/src/index.ts` (배선만) 두 곳이다.

### RED → GREEN 전이 증거 (AC-MSG-014)

**전이 1 — M1 RED (messages.test.ts M1 7건 추가 직후):**

```
$ npm test -w server -- --run
 FAIL  test/messages.test.ts [ test/messages.test.ts ]
Error: Cannot find module '../src/routes-messages.js' imported from …/server/test/messages.test.ts
 ❯ test/messages.test.ts:14:1
     12| import { createGateway } from '../src/gateway.js'
     13| import { registerAuthRoutes, requireAuth } from '../src/auth.js'
     14| import { registerMessageRoutes } from '../src/routes-messages.js'
       | ^
 Test Files  1 failed | 8 passed (9)
      Tests  70 passed (70)
```

원인이 출력에서 확인된다: `../src/routes-messages.js` 모듈 부재. npm 종료 코드 1.

**전이 2 — M1 GREEN (`routes-messages.ts` POST + `index.ts` 배선 후, 커밋 `2677d78`):**

```
$ npm test -w server -- --run --reporter=verbose
 ✓ test/messages.test.ts > messages > stores a plain user message with no targets 101ms
 ✓ test/messages.test.ts > messages > stores targets for mentioned bots 48ms
 ✓ test/messages.test.ts > messages > rejects mention of bot not invited to the room 48ms
 ✓ test/messages.test.ts > messages > send failures distinguish missing room from archived room 46ms
 ✓ test/messages.test.ts > messages > rejects an empty send with neither body nor file 46ms
 ✓ test/messages.test.ts > messages > refuses to store an upload outside the uploads directory 53ms
 ✓ test/messages.test.ts > messages > publishes to the sse hub and delivers to the gateway exactly once 47ms
 Test Files  9 passed (9)
      Tests  77 passed (77)

$ npm run typecheck -w server
> tsc --noEmit
typecheck exit: 0
```

**전이 3 — M2 RED (목록·다운로드 6건 추가 직후):**

```
$ npm test -w server -- --run
 ❯ test/messages.test.ts (13 tests | 5 failed) 663ms
     × saves uploaded file as attachment and serves download 52ms
     × lists messages after cursor 47ms
     × list is scoped to the room and carries author_name 46ms
     × all three message routes reject unauthenticated requests 45ms
     × buildServer wires the message routes, multipart and uploadsDir 47ms
 Test Files  1 failed | 8 passed (9)
      Tests  5 failed | 78 passed (83)
```

실패 원인이 전부 `GET` 두 라우트 미등록이다 — 대표 원문:

```
 FAIL … > saves uploaded file as attachment and serves download
AssertionError: expected 404 to be 200        ← GET /api/attachments/:id 미등록
 FAIL … > lists messages after cursor
AssertionError: Target cannot be null or undefined.   ← list.json().messages 가 없음 (미등록 404 본문)
 FAIL … > all three message routes reject unauthenticated requests
AssertionError: expected [ 401, 404, 404 ] to deeply equal [ 401, 401, 401 ]
```

> **관측 경계.** M2 6건 중 `refuses to serve an attachment whose stored path escapes…`(AC-MSG-008) 는 이 단계에서 **공히 통과했다** — 라우트가 미등록이어도 Fastify 가 `404` 를 내기 때문이다 (acceptance.md AC-MSG-015 4번이 경고한 바로 그 형태). 이 기준의 유효 판정은 전이 4(라우트가 실재하는 상태)에서 이루어진다.

**전이 4 — M2 GREEN (GET 두 라우트 + 읽기 시점 봉인 구현 후, 커밋 `f9a8fb6`):** 아래 AC 매트릭스의 전체 통과 출력이 그 증거다.

### AC 매트릭스 — 15/15 PASS (판정 시점 트리 = 커밋 `f9a8fb6`)

행동 기준(001–012, 015)의 명령은 전부 동일하다: `npm test -w server -- --reporter=verbose`. 관측 대상은 그 출력의 `✓` 줄. 범위 경계(013)와 전이(014)는 별도 명령.

| AC | 판정 | 명령 | 관측된 출력 (원문) |
|----|------|------|-------------------|
| AC-MSG-001 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > stores a plain user message with no targets 101ms` |
| AC-MSG-002 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > stores targets for mentioned bots 48ms` |
| AC-MSG-003 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > rejects mention of bot not invited to the room 48ms` |
| AC-MSG-004 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > send failures distinguish missing room from archived room 46ms` |
| AC-MSG-005 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > rejects an empty send with neither body nor file 46ms` |
| AC-MSG-006 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > saves uploaded file as attachment and serves download 52ms` |
| AC-MSG-007 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > refuses to store an upload outside the uploads directory 48ms` |
| AC-MSG-008 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > refuses to serve an attachment whose stored path escapes the uploads directory 48ms` |
| AC-MSG-009 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > publishes to the sse hub and delivers to the gateway exactly once 47ms` |
| AC-MSG-010 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > lists messages after cursor 47ms` |
| AC-MSG-011 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > list is scoped to the room and carries author_name 45ms` |
| AC-MSG-012 | PASS | 〃 | ` ✓ test/messages.test.ts > messages > all three message routes reject unauthenticated requests 46ms` |
| AC-MSG-013 | PASS | 아래 네 명령 | 아래 "범위 경계 관측" 절의 원문 출력 |
| AC-MSG-014 | PASS | 각 마일스톤 `npm test -w server -- --run` | 위 "RED → GREEN 전이 증거" 절의 원문 출력 4개 |
| AC-MSG-015 | PASS | `npm test -w server -- --reporter=verbose` | ` ✓ test/messages.test.ts > messages > buildServer wires the message routes, multipart and uploadsDir 48ms` |

전체 스위트 요약 (같은 실행, 원문):

```
 Test Files  9 passed (9)
      Tests  83 passed (83)
   Start at  10:25:09
   Duration  4.59s
```

`$ npm run typecheck -w server` → `typecheck exit: 0`.

### 범위 경계 관측 (AC-MSG-013, 판정 시점 `f9a8fb6`)

```
$ ls server/src
auth.ts
config.ts
db.ts
gateway.ts
index.ts
mention.ts
routes-bots.ts
routes-messages.ts
routes-rooms.ts
sse.ts

$ git rev-parse --verify "$(cat .moai/specs/SPEC-MSG-001/.spec-base-sha)^{commit}"
f7bccbdc5d85b41aa42d5dc7c71c1af75e5cd814
exit: 0

$ git diff --stat f7bccbdc5d85b41aa42d5dc7c71c1af75e5cd814 -- server/src/db.ts
exit: 0        ← 출력 없음 (빈 출력 + 종료 코드 0 동시 성립)

$ git diff --name-only f7bccbdc5d85b41aa42d5dc7c71c1af75e5cd814 -- server/src
server/src/index.ts
server/src/routes-messages.ts
exit: 0
```

네 관측 전부 성립 — 열 파일 존재, 기준 SHA 해석 exit 0, `db.ts` 불변, 변경 소스 정확히 두 줄. 보조 확인: `git diff --name-only <기준 SHA> | grep -E "^(channel|web|scripts)/"` → 일치 없음 (exit 1) — `channel/`·`web/`·`scripts/` 아래 생성된 파일 없다.

### Gaps (미검증 명시)

- **감사 이월 항목 3** — `LIMIT 200` 상한, REQ-MSG-001 응답의 `attachments` 배열 내용, REQ-MSG-008 응답의 `content-type` 헤더는 매핑된 AC 안에서 직접 관측되지 않는다. 구현은 넣었다 (`LIMIT 200`·`attachments`·`reply.header('content-type', att.mime)`).
- **감사 이월 항목 4** — AC-MSG-006 의 `content-disposition` 단언은 접두사(`filename*=UTF-8''`)만 본다. 구현은 `encodeURIComponent(att.filename)` 까지 실어 보낸다.
- **감사 이월 항목 5** — AC-MSG-004 는 `messages` 개수만 센다. 구현은 multipart 소비 **앞에서** 방을 가르므로 `message_targets`·`attachments` 에도 행이 생길 수 없으나, 그 두 테이블의 무쓰기는 이 기준이 관측하지 않는다.
- **감사 이월 항목 6** — `build()` 기반 12개 테스트는 `app.close()` 를 부르지 않는다 (AC-MSG-015 만 예외). 이번 실행에서 vitest 종료 지연은 관측되지 않았다(전체 Duration 4.59s)만 `onClose` 정리가 무관측인 앱이 12개 있다.
- **감사 이월 항목 8** — AC-MSG-007 의 테스트 이름(`refuses to store…`)이 동작(200 정상 저장 + 이름 소독)과 어긋나나 acceptance.md 본문 그대로 유지했다.
- **AC-MSG-008 의 RED 공히 통과** — 전이 3 관측 경계에 적은 대로, M2 RED 에서 이 기준만은 실패하지 않았다(미등록 라우트도 404). 라우트 실재 상태(GREEN)의 통과가 유효 판정이다.

### Residual-risk (잔여 위험)

- **멘션 오류·방 오류 시 디스크 고아 파일** — 방 검사를 multipart 소비 앞으로 당겨 404/409 경로의 고아는 없앴으나, 미초대 멘션(REQ-MSG-003)은 파일 저장 뒤에 거부되므로 디스크에 파일이 남는다. plan.md §D 6번이 수용한 위험이고 AC-MSG-003 의 관측 경계는 DB 세 테이블이다.
- **방별 인가 부재** — 로그인한 누구나 모든 방을 읽고 모든 첨부를 내려받는다. 이 시스템의 의도된 경계다 (REQ-MSG-013 본문, plan.md §D 2번).
- **업로드 스트림 오류 미처리** — 디스크 가득 참 등으로 `pipeline` 이 던지면 Fastify 기본 500 로 흘린다. 어떤 AC 도 이 경로를 관측하지 않는다.
- **100MB 파일 상한 초과 동작** — `limits.fileSize` 를 걸었으나 `truncated` 플래그를 검사하지 않는다(원본과 동일). 초과분은 잘린 채 저장된다.
- **AC-MSG-015 의 환경 변수 미복원** — 그 테스트는 `process.env.MINIDISCORD_DATA_DIR` 을 바꾸고 복원하지 않는다. 파일 마지막에 두어 이번에는 영향이 없으나, 이후 테스트를 그 아래에 추가하면 임시 경로를 물려받는다.

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-MSG-001
card: t3
cycle_type: tdd
head_commit: f9a8fb6bdb7ce772a03d43216c81ab5c2d5d3be0
commits:
  - "2677d7826b2be3f61df66dd11d6a72e8263333a4 — feat: message send API with multipart upload and mention fan-out (card t3)"
  - "f9a8fb6bdb7ce772a03d43216c81ab5c2d5d3be0 — feat: message listing with cursor and guarded attachment download (card t3)"
tests: "9 files / 83 passed (baseline 8 / 70 + 13 신규) — npm test -w server -- --run 직접 실행 확인"
typecheck: "npm run typecheck -w server exit 0"
boundary_base_sha: f7bccbdc5d85b41aa42d5dc7c71c1af75e5cd814
evidence: .moai/specs/SPEC-MSG-001/progress.md §E.2
ac_matrix: "AC-MSG-001..015 전부 PASS (15/15)"
gaps: "감사 이월 5건(3·4·5·6·8) + AC-MSG-008 RED 공히 통과 — §E.2 Gaps 참조"
```

---

## §E.4 Sync-phase Audit-Ready Signal

> 이 절은 최초 마감 시점의 기록이다. 그 뒤 sync-audit 이 FAIL 을 내 마감이 되돌려졌고,
> 수정 3라운드와 감사 3회를 거쳐 §E.7 에서 다시 닫혔다. **현재 유효한 판정은 §E.7 이다.**

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-27
sync_commit_sha: "26e8d90339503320e4d5635f72c782208b0580a6"
spec_id: SPEC-MSG-001
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
revalidated_at_head: "ed7566b3bc12e0b7ce9d86597a61ca79aa226bff"
revalidated_verdict: "PASS — .moai/reports/t3/sync-audit-3.md (기준 HEAD 8c15698)"
revalidated_tests: "104 passed / 104, exit 0 · typecheck exit 0 (sync 세션 직접 실행)"
revalidated_evidence: .moai/state/verify/9d51afd1/test-final.txt · typecheck-final.txt
```

### Claim (주장)

`SPEC-MSG-001` 의 run 단계 산출물이 sync 세션의 **독립 재실행**으로 확인되었다. 메시지 API 테스트 13건이 전부 통과하고 타입 검사가 깨끗하며, 첨부 업로드·다운로드 경로에 대한 보안 렌즈 검토에서 차단 사항이 나오지 않았다.

### Evidence (증거)

sync 세션이 직접 실행해 관측했다. 원문은 `.moai/state/verify/9d51afd1/test-verbose.txt` 에 남겼다.

```
$ npm test -w server -- --run --reporter=verbose
 ✓ test/messages.test.ts > messages > stores a plain user message with no targets 103ms
 ✓ test/messages.test.ts > messages > stores targets for mentioned bots 49ms
 ✓ test/messages.test.ts > messages > rejects mention of bot not invited to the room 49ms
 ✓ test/messages.test.ts > messages > send failures distinguish missing room from archived room 49ms
 ✓ test/messages.test.ts > messages > rejects an empty send with neither body nor file 48ms
 ✓ test/messages.test.ts > messages > saves uploaded file as attachment and serves download 53ms
 ✓ test/messages.test.ts > messages > refuses to store an upload outside the uploads directory 49ms
 ✓ test/messages.test.ts > messages > refuses to serve an attachment whose stored path escapes the uploads directory 48ms
 ✓ test/messages.test.ts > messages > publishes to the sse hub and delivers to the gateway exactly once 49ms
 ✓ test/messages.test.ts > messages > lists messages after cursor 48ms
 ✓ test/messages.test.ts > messages > list is scoped to the room and carries author_name 44ms
 ✓ test/messages.test.ts > messages > all three message routes reject unauthenticated requests 45ms
 ✓ test/messages.test.ts > messages > buildServer wires the message routes, multipart and uploadsDir 47ms
 Test Files  10 passed (10)
      Tests  98 passed (98)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

보안 렌즈 — 경로 탈출 봉인이 **쓰기와 읽기 양쪽에** 있는 것을 코드에서 직접 확인했다.

```
$ grep -n "basename\|resolve(.*startsWith\|preHandler" server/src/routes-messages.ts
29:  app.post('/api/rooms/:id/messages', { preHandler: [requireAuth] }, async (req, reply) => {
49:        const safeName = basename(part.filename)
121:  app.get('/api/rooms/:id/messages', { preHandler: [requireAuth] }, async req => {
139:  app.get('/api/attachments/:id', { preHandler: [requireAuth] }, async (req, reply) => {
150:    if (!resolve(att.stored_path).startsWith(resolve(req.server.uploadsDir) + sep)) {
```

쓰기 시점에는 사용자 파일명의 경로 성분을 `basename` 으로 잘라내고, 읽기 시점에는 저장 경로를 절대 경로로 펼쳐 업로드 디렉터리 안인지 다시 확인한다. `+ sep` 이 붙어 있어 `uploads-evil/` 같은 접두사 우회도 막힌다. 두 방향 모두 양성 테스트가 지킨다(`refuses to store an upload outside…`, `refuses to serve an attachment whose stored path escapes…`).

### Baseline-attribution (baseline 귀속)

- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `8c4798a`.
- run 단계 §E.3 은 `83 passed (baseline 70 + 13 신규)` 를 기록했다. sync 시점 `test/messages.test.ts` 자체 건수는 **13 으로 변함이 없다** — 총계 98 은 `SPEC-PERM-001` 15건이 위에 얹힌 결과다.
- AC 15/15 판정과 범위 경계 관측은 §E.2 의 run 시점 기록이며, sync 세션이 다시 재지 않았다.

### Gaps (미검증)

- 커버리지 수치 미측정 (`@vitest/coverage-v8` 미설치).
- **업로드 크기 상한과 MIME 허용 목록은 이번 범위에 없다.** §E.2 의 nice-to-have 7 로 이미 기록된 이월 항목이며 sync 에서도 닫지 않았다.
- **방 멤버십 검사가 없다.** 로그인만 하면 임의의 방에 메시지를 보내고 목록을 읽을 수 있다. 프로젝트에 멤버십 모델 자체가 없어 범위 밖이며, `SPEC-PERM-001` spec.md §5 의 미결 질문과 같은 부류다 — 리드 판정 대기.
- §E.2 Gaps 에 기록된 감사 이월 5건(3·4·5·6·8)은 이번 sync 에서도 닫지 않았다.

### Residual-risk (잔여 위험)

- 커서 목록은 `id` 단조 증가에 기댄다. 카드 `t4` MCP `fetch_history` 의 `since_id` 와 이 커서가 같은 의미를 공유해야 하며, 어긋나면 봇이 메시지를 건너뛴다.
- 첨부 파일은 지워지지 않는다. 방을 보관해도 업로드 디렉터리에 남는다 — 의도된 수용이나 장기 운영에서 용량 관리가 필요하다.
- 이 분기는 아직 머지되지 않았다.

---

## §F Phase 4 Mode Selection

- 입력: tier M / 범위 3개 파일 (routes-messages.ts·테스트 신규, index.ts 수정) / 도메인 1 (server) / 언어 TypeScript / 병렬 이득 낮음
- direct: 미선택 — 다중 파일 신규 코드+테스트 작성
- serial: 선택 — 코딩 중심 구현의 기본값; 선행 MENTION(parseMentions)·SSE(hub.publish)·GATEWAY(gateway.deliver) 산출물을 계약으로 소비하고 후행 PERM이 메시지 라우트에 가로채기를 결합
- fanout: 미선택 — 단일 도메인 구현 작업 (코딩 병렬성 경고)
- sweep: 미선택 — 30파일 미만, 기계적 일괄 변환 아님

Decision: serial
Implementation Kickoff Approval: 통과 — 리드 디스패치 gate 필드로 운영자 승인 전달됨 (2026-08-27)
기록 시점 HEAD: f7bccbd (SPEC-GATEWAY-001 run 완료 직후)

---

## §E.5 Sync-audit Response — 감사 FAIL 대응 라운드

sync 단계 독립 감사(`.moai/reports/t3/sync-audit.md`, `--security --deep`)가 **FAIL** 을 냈다
(Security 45/100, 임계 70). 리드가 판정을 채택하고 차단 3건 수정 + 재감사를 지시했다.
그에 따라 `status` 를 `completed` → `in-progress` 로 되돌렸고, §E.4 는 **재감사 PASS 전까지 유효하지 않다.**

### 이 SPEC 에서 바뀐 것 — F-02 (High, 이 SPEC 소유)

전송 응답(`POST /api/rooms/:id/messages`)과 목록 응답(`GET /api/rooms/:id/messages`)의
`attachments` 에 서버 파일시스템 **절대 경로**(`stored_path`)가 그대로 실렸다. 클라이언트는
`id` 하나면 내려받을 수 있으므로 이 값은 쓸모가 없고, 서버 디렉터리 구조·임시 경로·사용자명을 노출했다.

수정: 전송 응답의 `attachments` 배열에서 `stored_path` 를 빼고, 목록 응답의 SELECT 를
`SELECT id, filename` 으로 좁혔다. 봇 프레임의 `local_path` 는 봇이 로컬 파일을 여는 설계상
표면이므로 **유지**한다 — 그 비대칭은 README 에 적었다.

가드 테스트: `test/messages.test.ts` — `never puts stored_path in the send or list response
while keeping the id usable`. 이 테스트가 실제로 무언가를 잡는지 **되돌려서 확인했다**.

```
# 수정을 일시적으로 되돌린 상태
AssertionError: expected { id: 1, filename: '첨부.txt', …(1) } to not have property "stored_path"
    192|     expect(sent.attachments[0]).not.toHaveProperty('stored_path')
      Tests  1 failed | 99 skipped (100)
```

대조군으로 `id`·`filename` 이 실려 있는지, 그리고 그 `id` 로 실제 다운로드가 되는지를 함께 본다 —
없으면 "첨부를 통째로 빼먹은" 구현도 통과한다. 응답 본문 문자열 전체에 저장 경로가 없는지도
확인해, 다른 필드 이름으로 새는 경우까지 잡는다. F-01 수정과 맞물려
CHANGELOG 의 "다운로드도 업로드 디렉터리 밖은 내주지 않습니다" 가 이제 내용에 대해서도 참이 된다.

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

---

## 이후 갱신 — 이 장부 밖에서 난 판정

> 아래는 이 카드가 끝난 뒤에 다른 카드에서 확정된 사실이다. **위 장부 원문은 고치지 않는다** — 장부는 그 시점에 관측한 것의 기록이고, 나중에 참이 된 것을 소급해 적으면 무엇을 언제 알았는지가 사라진다.

- **§E.2 Gaps 의 「방 멤버십 검사가 없다 … — 리드 판정 대기」의 판정이 났다** (2026-08-29, 카드 `t11`). 리드는 방 멤버십을 만들기로 결정했고, `SPEC-ROOMAUTHZ-001` 이 그것을 소유한다 — `room_members` 표, `rooms.created_by`, 멤버십 술어, 그리고 `POST`·`GET /api/rooms/:id/messages` 를 포함한 여덟 라우트의 게이트. 「대기」는 더 이상 참이 아니다.
- **AC-MSG-012 의 전제가 무효화된다.** 그 기준의 대조군 사용자는 방을 직접 `INSERT` 로 만든 비멤버라, 게이트 착지 이후에는 정상 구현에서도 준비 단계가 실패한다. 기준의 의도(인증 경계)는 유효하므로 폐기하지 않고 하네스가 대조군 사용자를 멤버로 만들도록 고친다 — `SPEC-ROOMAUTHZ-001` plan.md §F M4 의 작업이다. 상세와 정확한 실패 지점은 그 SPEC 의 `spec.md` §6 말미에 있다.
