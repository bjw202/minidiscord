# SPEC-ROOMAUTHZ-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 발단은 `.moai/reports/t4/sync-audit.md` §F-14 이고, 설계 결정 3건은 운영자가 확정했다(`spec.md` §3) — 재검토 대상이 아니다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`~`M4` 는 **이 SPEC 안의 내부 마일스톤**이며 칸반 보드의 마일스톤과 다른 층위다.

---

## §A 되돌리기 가장 어려운 결정 — 스키마와 이행

이 SPEC 에서 유일하게 **데이터에 흔적을 남기는** 부분이다. 잘못 정하면 되돌리는 데 또 하나의 이행이 필요하다.

| 항목 | 값 | 왜 이렇게 정하는가 |
|------|-----|-------------------|
| 멤버 표 | `room_members(room_id, user_id, created_at)`, 복합 PK `(room_id, user_id)` | 중복을 표 차원에서 막는다. 조회-후-삽입은 동시 요청 둘을 모두 통과시킨다 |
| 생성자 컬럼 | `rooms.created_by INTEGER NULL REFERENCES users(id)` | 기존 행에는 만든 사람이 없다. NOT NULL 로 두면 `ALTER TABLE` 이 기본값을 요구하고, 지어낸 기본값은 거짓 기록이 된다 |
| 생성자의 역할 | **기록일 뿐 권한이 아니다** | 인가는 전부 `room_members` 로 한다. 생성자가 방을 떠나는 기능이 생겨도 게이트가 흔들리지 않는다 |
| 컬럼 추가 방식 | `PRAGMA table_info(rooms)` 로 확인 후 없을 때만 `ALTER TABLE` | `SCHEMA` 의 `CREATE TABLE IF NOT EXISTS` 는 **기존 표에 컬럼을 더하지 않는다.** 상수만 고치면 새 DB 에서만 동작하고 돌고 있는 DB 는 조용히 옛 모양으로 남는다 |
| 백필 범위 | 그 시점의 모든 방 × 모든 사용자 | D3. 넣지 않으면 상향 직후 전원이 자기 방에서 잠긴다 |
| 백필 1회성 | `schema_migrations(name PK)` 에 `roomauthz-001-backfill` 기록 | `db.ts` 는 기동마다 `SCHEMA` 를 무조건 실행한다. 표식이 없으면 탈퇴 기능이 생겼을 때 나간 사람이 재기동마다 되돌아온다 |
| 백필 트랜잭션 | 백필 + 표식 기록을 하나로 | 갈라지면 "백필했는데 표식 없음"(다음 기동에 또 돎) 또는 "표식만 있음"(백필 없이 완료 표시)이 생긴다 |

검토 시 이 표가 확인 대상이다. **"1회성 보장"을 `INSERT OR IGNORE` 하나로 줄이고 싶은 유혹이 크다** — 그러면 재기동마다 백필이 돌고, 탈퇴가 생기는 날 조용히 되살아난다. `OR IGNORE` 는 같은 실행 안의 충돌을 삼키는 도구이지 재실행을 막는 도구가 아니다. 둘 다 필요하다.

## §B 되돌리기 어려운 결정 — 비멤버에게 보이는 얼굴

한 번 정하면 UI(후속 카드)와 사람의 기대가 여기에 결합한다.

| 상황 | 응답 | 근거 |
|------|------|------|
| 비멤버의 방 범위 요청 | `404` + `{ error: '방을 찾을 수 없습니다' }` | 없는 방과 **구별 불가능**해야 한다 (REQ-ROOMAUTHZ-013) |
| 없는 방 | 같은 `404` + 같은 본문 | 위와 같은 응답이어야 성립한다 |
| 멤버의 보관된 방 요청 | 기존대로 `409` | 멤버에게는 상태를 숨길 이유가 없다 |
| 비멤버의 보관된 방 요청 | `404` | 멤버십 검사가 상태 검사보다 **앞**이다 |
| 비멤버의 봇 초대 발급(`POST …/invites`) | `404` + 같은 본문 | D2 v2. 평문 토큰이 나가지 않는다 |
| 비멤버의 봇 초대 목록(`GET …/invites`) | `404` + 같은 본문 — **빈 배열이 아니다** | 빈 배열은 "봇 없는 방"과 구별되지 않아 실재가 샌다 (REQ-ROOMAUTHZ-009 와 같은 논리) |
| 비멤버의 봇 초대 철회(`DELETE …/invites/:botId`) | `404` + 같은 본문, 토큰 불변 | 파괴적 쓰기다. 남의 방 봇 세션을 끊을 수 없다 |
| 멤버의 봇 초대 — 없는 봇 | 기존대로 `404` + `{ error: '봇을 찾을 수 없습니다' }` | 방 쪽 404 와 **본문이 달라야** 멤버에게 진단이 산다 |
| 멤버의 봇 초대 — 보관된 방 | 기존대로 `409` | 멤버에게는 상태를 숨길 이유가 없다 |

### 검사 순서가 계약이다

```
requireAuth  →  멤버십  →  방 상태(보관 여부)  →  본문 처리
```

순서를 뒤집으면 비멤버가 `409`(보관됨)와 `404`(없음)를 구별할 수 있고, 그 차이 하나로 방의 실재가 새어 나간다. **인가 SPEC 이 열거 통로를 열어 두는 꼴**이므로 순서 자체가 요구사항이다.

**이 순서가 실제로 위험한 라우트는 둘이다.** `GET /api/rooms/:id/messages` 는 지금도 방을 조회하지 않으므로(`routes-messages.ts:123-139`) 게이트만 얹으면 순서 문제가 생기지 않는다. 반면 `POST /api/rooms/:id/messages`(`:35-39`)와 `POST /api/rooms/:id/invites`(`routes-bots.ts:52-54`)는 **이미 방을 조회해 없음/보관됨으로 갈리고 있어**, 그 뒤에 멤버십을 넣으면 비멤버가 `409` 를 받는다. 1차 계획 감사(F-04)가 «순서를 뒤집은 구현이 16건 전건 통과»를 지적한 뿌리가 여기다 — 초판의 AC-013 은 `GET` 만 비교해 위험이 없는 자리를 재고 있었다. 지금은 AC-ROOMAUTHZ-013 이 `POST` 판을, AC-ROOMAUTHZ-018 이 초대 라우트 판을 각각 잰다.

### `403` 대신 `404` — 무엇을 포기했는가

| | `403` | `404` (채택) |
|---|---|---|
| 방의 실재 | 확인해 준다 | 숨긴다 |
| 열거 공격 | 계정 하나로 방 번호 스캔 가능 | 불가 |
| 진단 | "초대받지 못했다"를 알 수 있다 | "없다"와 구별 못 한다 |

포기한 것은 **진단 가능성**이다. 방 번호를 잘못 받은 사람은 스스로 원인을 알 수 없고 초대한 사람에게 물어야 한다. 그 비용을 받아들인 이유는 `spec.md` §1.2 사슬의 2단계가 정확히 열거이기 때문이다.

## §C 되돌리기 어려운 결정 — 브로커 시그니처 개정

```ts
// 지금 (SPEC-PERM-001 REQ-PERM-004 가 글자 그대로 고정)
tryHandleUserReply(roomId: number, text: string): boolean

// 개정 후
tryHandleUserReply(roomId: number, userId: number, text: string): boolean
```

`userId` 를 **두 번째**에 넣는 이유: `(roomId, userId)` 가 멤버십 술어의 인자 순서와 같아 호출부가 읽기 쉽다. 뒤에 붙이면 `(roomId, text, userId)` 가 되어 방-사람 짝이 텍스트로 갈린다.

**개정 대상이 요구사항이라는 점이 중요하다.** REQ-PERM-004 는 인터페이스를 코드 블록으로 못 박았으므로, 인자를 더하는 순간 그 요구사항 문장이 거짓이 된다. 코드만 고치고 문서를 두면 다음 감사자가 문서를 근거로 구현을 결함이라 판정한다. 문서 개정이 이 SPEC 의 산출물에 포함되는 이유다(§E).

**라우트가 이미 막는데 브로커가 또 보는 것**은 중복이 아니라 백스톱이다 — `spec.md` REQ-ROOMAUTHZ-012 말미에 근거가 있다. `SPEC-MSG-001` 의 쓰기 봉인·읽기 봉인이 이미 같은 형태를 쓴다.

## §D 계약 개정의 폭발 반경 — 깨질 기존 테스트

**추정이 아니라 열거다.** 아래 목록은 grep 으로 만들었고 명령과 결과를 함께 적는다. 이 SPEC 에서 가장 자주 틀리는 자리라 별도 절로 둔다 — 이전 카드에서 개정 하나가 형제 기준 11건을 깨뜨렸는데 문서는 1건만 인지한 적이 있다.

### D.0 이 절은 D2 v2 이후 **처음부터 다시 세었다**

초판의 열거는 D2 v1(게이트 다섯 곳)을 전제로 했다. 운영자가 초대 라우트 셋을 범위에 넣었으므로(D2 v2), 초판 숫자를 손보는 대신 **같은 절차를 확대된 범위에 대해 처음부터 다시 돌렸다.** 옛 숫자에 «초대 라우트 몫»을 더하는 방식은 쓰지 않았다 — 그렇게 하면 초판이 놓친 것이 있어도 그대로 이월된다.

**측정 방법을 정확히 적는다.**

| 무엇 | 방법 | 근거 |
|------|------|------|
| 현재 통과 상태(분모) | **실행했다.** `npm test` → 서버 104개 · 채널 70개 전건 통과 | 의존성이 설치돼 있어 실행이 가능해졌다. 초판(과 1차 감사)은 `better-sqlite3` 부재로 실행하지 못했다 |
| 파일별 테스트 이름·개수 | **실행했다.** `npx vitest run --reporter=verbose` 의 `✓` 줄 104 줄을 받아 파일별로 갈랐다 | 이름 없는 요약이 아니라 실제 이름 목록이다 |
| 게이트 이후 깨질 항목(분자) | **읽어서 판정했다 — 실행이 아니다.** 게이트가 아직 구현되지 않았으므로 실행으로는 확인할 수 없다. `it` 블록을 하나씩 열어 «방을 어떻게 만드는가 × 어떤 라우트를 부르는가»로 판정했다 | 표본이 아니라 전건이다. 실제 대조는 M4 단계 1 이 한다 (AC-ROOMAUTHZ-016) |

즉 **분모는 실행 관측이고 분자는 소스 판독이다.** 둘을 섞어 «실행으로 확인했다»고 적지 않는다.

```
$ npm test
 Test Files  10 passed (10)      Tests  104 passed (104)      ← server
 Test Files   5 passed (5)       Tests   70 passed (70)       ← channel
```

### D.0.1 D2 v2 가 숫자를 바꾸었는가 — **바꾸지 않았다 (34 → 34)**

새로 게이트가 걸리는 세 라우트를 부르는 기존 테스트를 전건 열거하고 하나씩 판정했다.

```bash
grep -rn "invites" server/test/
```

| 호출 지점 | 방을 어떻게 만드는가 | 호출자 | 게이트 이후 | 목록 합류? |
|---|---|---|---|---|
| `rooms-bots.test.ts:151` `invites a bot and returns one-time token + command` | `POST /api/rooms`(`:153`) | alice(생성자) | 그대로 `201` | ❌ |
| `rooms-bots.test.ts:165` `re-inviting same bot revokes old token` | `POST /api/rooms` | alice | 그대로 | ❌ |
| `rooms-bots.test.ts:176` `command carries env vars…` | `POST /api/rooms` | alice | 그대로 | ❌ |
| `rooms-bots.test.ts:186` `invite failures distinguish missing room, archived room and missing bot` | `POST /api/rooms`(`:188`) | alice | `:191` 없는 방은 게이트가 먼저 `404` 를 내지만 **본문이 `방을 찾을 수 없습니다` 로 같고**, `:197` 의 «두 오류 본문이 다르다»는 봇 쪽 `봇을 찾을 수 없습니다` 와 여전히 다르다. `:200` 보관 방 `409` 는 멤버라 그대로 | ❌ |
| `rooms-bots.test.ts:207` `stores only the sha256 hash` | `POST /api/rooms` | alice | 그대로 | ❌ |
| `rooms-bots.test.ts:218` `lists invites without token` | `POST /api/rooms` | alice | `GET` 게이트 통과 | ❌ |
| `rooms-bots.test.ts:227` `never exposes the issued token again` | `POST /api/rooms` | alice | 통과 | ❌ |
| `rooms-bots.test.ts:238` `online is a boolean false, not the integer 0` | `POST /api/rooms` | alice | 통과 | ❌ |
| `rooms-bots.test.ts:248` `revoking an invite is idempotent` | `POST /api/rooms` | alice | `DELETE` 게이트 통과 | ❌ |
| `rooms-bots.test.ts:261` `archiving a room revokes that room bot tokens` | `POST /api/rooms` | alice | 통과 | ❌ |
| `gateway.test.ts:797` `buildServer wires the gateway, archive hook and invite online flag` | `POST /api/rooms`(`:815`) | alice | `:817` 발급·`:820`·`:827` 목록 전부 통과 | ❌ |

**합류 0건.** 이유는 하나다 — `server/test/` 안에서 초대 라우트를 부르는 테스트는 **전부 방을 `POST /api/rooms` 로 만들고 그 생성자가 그대로 호출자**다. REQ-ROOMAUTHZ-004 가 생성자를 즉시 멤버로 넣으므로 이들은 모두 멤버 자격으로 초대 라우트에 들어간다. 직접 `INSERT INTO rooms` 로 방을 만들어 초대 라우트를 부르는 테스트는 없다(`permissions.test.ts` 의 `seedRoomAndBot`(`:68-74`)은 `bot_tokens` 에 직접 INSERT 하며 HTTP 초대 라우트를 타지 않는다).

**목록에서 빠진 것도 0건.** 게이트를 더하기만 했으므로 이미 깨질 것으로 센 항목이 살아나는 경로가 없다.

**주의할 자리 하나 — `rooms-bots.test.ts:186`.** 이 테스트는 게이트 이후 **`:191` 의 실패 주체가 바뀐다**(라우트 본문의 방 조회가 아니라 게이트가 `404` 를 낸다). 상태 코드와 본문이 같아 단언은 그대로 통과하지만, 「왜 통과하는가」가 달라진 유일한 항목이다. run 단계에서 이 테스트가 초록인 것을 **게이트가 없어도 초록인 것과 혼동하지 않도록** 여기 적는다.

### D.1 근거 명령

```bash
# (1) 테스트가 방을 어떻게 만드는가 — 직접 INSERT 는 멤버 행을 남기지 않는다
grep -rn "INSERT INTO rooms" server/test/

# (2) 파일별 테스트와 그 테스트가 부르는 라우트
grep -n "  it(\|postMessage(\|/api/rooms" server/test/messages.test.ts
grep -n "  it(\|post(app\|openStream(\|inject(" server/test/permissions.test.ts
grep -n "  it(\|openStream(\|/api/rooms" server/test/sse.test.ts

# (3) 파일별 테스트 총수
grep -c "^\s*it(" server/test/*.test.ts
```

(1) 의 출력:

```
server/test/db.test.ts:25:    db.prepare("INSERT INTO rooms (name) VALUES ('r1')").run()
server/test/messages.test.ts:52:  const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('A')").run().lastInsertRowid as number
server/test/messages.test.ts:307:    const otherRoom = db.prepare("INSERT INTO rooms (name) VALUES ('B')").run().lastInsertRowid as number
server/test/gateway.test.ts:51:  return db.prepare('INSERT INTO rooms (name) VALUES (?)').run(name).lastInsertRowid as number
server/test/permissions.test.ts:69:  const roomId = db.prepare('INSERT INTO rooms (name) VALUES (?)').run(roomName).lastInsertRowid as number
```

(3) 의 출력: `sse 9 / messages 14 / permissions 15 / rooms-bots 21 / gateway 23`.

### D.2 판정 규칙

테스트가 깨지는 조건은 둘 중 하나다.

1. **방을 `INSERT INTO rooms` 로 직접 만들고**, 로그인한 사용자로 **게이트가 걸린 라우트**를 부른다 → 그 사용자는 비멤버라 `404` 를 받는다.
2. `GET /api/rooms` 가 모든 방을 돌려준다고 단언한다.

**깨지지 않는 조건도 명시한다** — 하네스가 이벤트 라우트를 자기 파일 안에 **직접 등록**하면(`app.get('/api/rooms/:id/events', ...)`), `index.ts` 에 붙는 SSE 게이트가 그 사본에는 붙지 않는다. `sse.test.ts:30` 과 `permissions.test.ts:51` 이 그런 사본이다. 이것은 하네스가 프로덕션 배선과 갈라져 있다는 뜻이기도 하다 — §E 에 위험으로 올린다.

### D.3 깨질 테스트 — 파일·이름 단위

**`server/test/messages.test.ts` — 14개 중 13개.** `seed()`(`:52`)가 방을 직접 INSERT 하고 `alice` 가 그 방에 글을 쓰거나 읽는다.

| 줄 | 테스트 이름 | 왜 깨지는가 |
|----|------------|-----------|
| 68 | `stores a plain user message with no targets` | POST 게이트 |
| 89 | `stores targets for mentioned bots` | POST 게이트 |
| 103 | `rejects mention of bot not invited to the room` | POST 게이트 (400 기대가 404 로) |
| 121 | `send failures distinguish missing room from archived room` | 보관 방 케이스가 `409` 대신 `404` — 순서 규칙(§B)의 직접 결과 |
| 138 | `rejects an empty send with neither body nor file` | POST 게이트 |
| 152 | `saves uploaded file as attachment and serves download` | POST 게이트 |
| 177 | `never puts stored_path in the send or list response while keeping the id usable` | POST + GET 게이트 |
| 211 | `refuses to store an upload outside the uploads directory` | POST 게이트 |
| 232 | `refuses to serve an attachment whose stored path escapes the uploads directory` | POST 게이트 |
| 250 | `publishes to the sse hub and delivers to the gateway exactly once` | POST 게이트 |
| 284 | `lists messages after cursor` | POST + GET 게이트 |
| 304 | `list is scoped to the room and carries author_name` | POST + GET 게이트 (방 둘 다 직접 INSERT) |
| 321 | `all three message routes reject unauthenticated requests` | **설정 코드(`:329`)에서 던진다.** `:328` 의 준비용 전송이 게이트에 걸려 첨부가 생기지 않고, `:329` 의 `SELECT id FROM attachments` 가 `undefined` 를 돌려주어 `.id` 접근이 `TypeError` 로 터진다 = AC-MSG-012 |

> **이유 정정 (1차 감사 F-13).** 초판은 이 줄의 이유를 «대조군(인증된 요청은 성공한다)이 깨진다»로 적었다. **틀렸다.** 그 대조군은 `:343-348` 의 `expect(withAuth.every(r => r.statusCode !== 401)).toBe(true)` 이고, **`404` 는 `!== 401` 을 만족하므로 그 단언은 게이트가 걸려도 통과한다.** 깨지는 자리는 그보다 앞선 설정 코드다.
>
> 숫자(13/14)는 영향받지 않는다 — 어느 쪽이든 이 테스트는 깨진다. 그러나 정정하지 않으면 **더 유용한 사실이 가려진다: AC-MSG-012 의 대조군은 우리가 믿은 것보다 약하다.** `!== 401` 은 `401` 이 아닌 모든 것을 통과시키므로, M4 단계 3 에서 «의도를 유지한 채 멤버 사용자를 쓴다»로 고쳐도 그 기준은 여전히 인증 경계를 느슨하게 잰다. **M4 하네스 교정 시 그 단언을 실제 성공 코드(`200`)로 좁힌다** — 기준의 의도를 바꾸는 것이 아니라 원래 의도(인증된 요청은 성공한다)를 실제로 재게 만드는 것이다. `spec.md` §6 말미에도 같은 정정을 적었다.

살아남는 하나: `:354 buildServer wires the message routes, multipart and uploadsDir` — 방을 `POST /api/rooms` 로 만들어 생성자가 곧 멤버다.

**`server/test/permissions.test.ts` — 15개 중 12개.** `seedRoomAndBot()`(`:69`)이 직접 INSERT 하고 `post()`(`:117`)가 실제 메시지 라우트를 친다.

| 줄 | 테스트 이름 |
|----|------------|
| 159 | `user yes reply sends verdict to the bot and is not stored as user message` |
| 170 | `non-matching text is not consumed` |
| 177 | `yes with unknown id is not consumed (falls through as chat)` |
| 184 | `delivers an allow verdict to the connected bot` |
| 194 | `delivers a deny verdict as deny, not as allow` |
| 207 | `consumes the reply instead of storing it as a user message` |
| 217 | `accepts a verdict once and lets a repeat fall through as chat` |
| 234 | `never resolves a request from a different room` |
| 251 | `refuses an unauthenticated verdict and leaves the request pending` — **대조군**이 깨진다 = AC-PERM-009 |
| 268 | `falls through non-matching text and unknown ids without touching the pending request` |
| 290 | `marks an undelivered verdict differently from a delivered one` |
| 312 | `accepts all four verdict words, normalizes case, and rejects ids containing l` |

살아남는 셋: `:124`·`:133`(브로커를 직접 부르고 HTTP 를 타지 않는다), `:147`(하네스 사본 이벤트 라우트를 쓴다).

여기에 더해 **12개 전부가 `tryHandleUserReply` 시그니처 개정의 영향도 받는다** — 브로커를 직접 부르는 `:124`·`:133` 은 인자가 늘어도 그 호출을 하지 않으므로 무관하다.

**`server/test/sse.test.ts` — 9개 중 1개.**

| 줄 | 테스트 이름 | 왜 |
|----|------------|-----|
| 192 | `wires the hub and the events route into buildServer` | 진짜 `buildServer()` 를 쓰고 존재하지 않는 방 `1` 의 스트림을 연다 |

나머지 8개는 `:30` 의 하네스 사본 라우트를 쓰므로 게이트 자체는 닿지 않는다 — **다음 절의 2차 효과가 그것을 뒤집는다.** `:176`(미인증 거부)은 어차피 `401` 이라 무관하다.

### D.3.1 2차 효과 — 사본 라우트 제거가 8개를 더 깨뜨린다

REQ-ROOMAUTHZ-010 은 이벤트 라우트 등록을 `registerEventRoute(app)` 하나로 내보내고 **`server/test/` 아래의 모든 하네스**(`sse.test.ts:30`·`permissions.test.ts:51` 의 사본 둘을 이름으로 지목한다)가 같은 함수를 쓰도록 요구한다. 그래야 게이트가 통째로 빠졌을 때 테스트가 초록이 되는 상태를 막는다.

> **범위 한정 (1차 감사 F-14).** 초판의 REQ-010 은 「테스트 하네스」라고만 적어 어느 파일인지 정하지 않았고, 그 미정의 선택에 아래 8건이 통째로 매달려 있었다. 문면대로만 이행해 새 파일 하나만 새 함수를 쓰고 사본 둘을 남기면 실제 실패는 **26개**가 되고, AC-ROOMAUTHZ-016 이 「목록에 있는데 실패하지 않은 항목 8건」을 보고해 M4 가 정지한다. 어느 AC 도 사본 제거를 요구하지 않으므로 run 담당자는 자기 선택이 위반인지 알 수 없다. 지금은 요구사항 문면이 두 사본을 이름으로 지목하므로, 아래 8건의 근거가 요구사항 안에 있다.

그 요구를 이행하면 `sse.test.ts` 의 사본(`:30`)이 사라지고, 존재하지 않는 방 `1` 로 스트림을 여는 나머지 테스트가 전부 게이트에 걸린다.

| 줄 | 테스트 이름 |
|----|------------|
| 77 | `delivers a published event to the room subscriber` |
| 89 | `opens the stream with SSE headers and a connected comment` |
| 101 | `never leaks another room event into this room stream` |
| 114 | `frames events exactly as event/data/blank-line` |
| 127 | `delivers to every subscriber of the room` |
| 142 | `removes the subscriber when the connection closes` |
| 159 | `publishing to a room with no subscribers is a silent no-op` |
| 192 | (이미 D.3 에 계상 — 중복 계산하지 않는다) |

**8개 추가**(`:77`·`:89`·`:101`·`:114`·`:127`·`:142`·`:159`, 그리고 `permissions.test.ts:147 publishes the request to the room SSE stream` 이 같은 이유로 합류). 고치는 방법은 하네스가 방을 실제로 만들고 로그인 사용자를 그 방의 멤버로 넣은 뒤 그 번호로 스트림을 여는 것이다 — 임의의 `1` 을 쓰지 않는다.

**이 2차 효과를 "SSE 라우트 추출을 미루면 피할 수 있다"고 읽지 말 것.** 미루면 게이트가 테스트로 측정되지 않는 상태가 그대로 남고, 그것이 REQ-ROOMAUTHZ-010 이 존재하는 이유다.

**`server/test/rooms-bots.test.ts` — 21개 중 0개.** 모든 방을 `POST /api/rooms` 로 만들고 같은 사용자가 조회한다. `:50`·`:61`·`:91` 의 `active`/`archived` 길이 단언은 생성자가 곧 멤버라 그대로 성립한다.

**`server/test/gateway.test.ts` — 23개 중 0개.** 봇 토큰 인가만 쓴다. `:762`(권한 릴레이 중계)는 브로커가 아니라 게이트웨이의 `setPermissionHandler`/`sendToBot` 을 직접 재고, `:797`(buildServer 배선)은 방을 `POST /api/rooms` 로 만든다.

**`auth`·`db`·`mention`·`health`·`config` — 0개.** 방 범위 라우트를 부르지 않는다.

### D.4 합계와 그 쓰임

| 파일 | 게이트 직접 영향 | 2차(라우트 추출) | 초대 라우트(D2 v2) | 깨짐 / 전체 |
|------|-----------------|-----------------|-------------------|-----------|
| `messages.test.ts` | 13 | 0 | 0 | 13 / 14 |
| `permissions.test.ts` | 12 | 1 (`:147`) | 0 | 13 / 15 |
| `sse.test.ts` | 1 (`:192`) | 7 | 0 | 8 / 9 |
| `rooms-bots.test.ts` | 0 | 0 | **0** (§D.0.1 — 열 건 전부 생성자가 호출자) | 0 / 21 |
| `gateway.test.ts` | 0 | 0 | **0** (`:797` 도 생성자가 호출자) | 0 / 23 |
| 그 외 5개 파일 | 0 | 0 | 0 | 0 / 20 |
| **합계** | **26** | **8** | **0** | **34 / 104** |

**전체 104 는 실행으로 확인한 값이다**(`npm test` → 서버 104 통과). 깨짐 34 는 소스 판독값이다 — 두 숫자의 근거가 다르다는 점을 §D.0 이 적는다.

**D2 v2 의 델타: 0.** 확대 이전의 34 와 확대 이후의 34 는 같은 값이지만 **같은 계산이 아니다** — 재열거 결과이지 옛 숫자를 그대로 둔 것이 아니다. 합류한 테스트도, 목록을 떠난 테스트도 없다. 근거는 §D.0.1 의 11행 표다.

살아남는 것은 `messages.test.ts:354`, `permissions.test.ts:124`·`:133`, `sse.test.ts:176`, 그리고 `rooms-bots`·`gateway`·`auth`·`db`·`mention`·`health`·`config` 전부다.

이 목록의 쓰임은 하나다 — **run 단계에서 이 34개 밖의 실패만 결함으로 본다.** 목록 안의 실패는 예상된 것이고, 고치는 방법은 하네스가 사용자를 멤버로 만들도록 seed 를 바꾸는 것이다(§F M4).

**이 숫자를 손으로 센 채로 끝내지 말 것.** M4 시작 시 `npm test -w server -- --reporter=verbose` 를 돌려 실패 목록을 실제로 받아 이 표와 대조한다. 대조 결과가 다르면 표가 틀린 것이고, 그 차이가 곧 놓친 결합이다. 이 계획 단계에서 실행한 것은 **게이트 이전의 초록 상태**뿐이며, 그것은 분모를 확정할 뿐 분자를 확정하지 않는다.

## §E 원본·형제 문서와의 충돌과 해결

### 1. 형제 SPEC 네 곳이 스키마 변경을 금지하고 있다

`REQ-PERM-014`, `REQ-MSG-014`, `REQ-BOT-009`, `REQ-AUTH-015` 가 각각 `db.ts` 의 `SCHEMA` 변경을 금지한다. 이 SPEC 은 그것을 바꾼다.

**모순이 아니다.** 그 조항들은 "자기 SPEC 을 구현하는 사람이 스키마에 손대지 말 것"을 뜻한다 — 각 SPEC 의 §범위 밖과 안티패턴 문맥이 그것을 명시한다. 이후 SPEC 을 구속하는 선언이었다면 스키마는 영원히 동결되어 어떤 기능도 추가할 수 없다. 이 SPEC 은 스키마 변경을 자기 범위로 명시하고 방식을 REQ-ROOMAUTHZ-003 으로 못 박는다.

### 2. `spec-v2.md:32` 의 YAGNI 판단을 뒤집는다

`spec.md` §1.3 에 근거가 있다. 원문을 지우지 않고 주석을 단다 — 지우면 "원래 그랬던 것"이 되어 왜 바뀌었는지가 사라진다.

**같은 문장이 `.moai/plan/2026-08-26-minidiscord/spec.md:32` 에도 있다.** 그쪽은 v1 초안이고 `SPEC-PERM-001/acceptance.md` 머리말이 "v1 초안은 참조 대상이 아니다"라고 명시했으므로 규범 문서가 아니다. 이 SPEC 은 `spec-v2.md` 만 개정한다.

### 3. 수용 기준 둘의 전제가 무효화된다 — 조용히 고치지 않는다

AC-MSG-012 와 AC-PERM-009 다. 두 기준은 문장이 그대로여도 **무엇을 증명하는가**가 달라진다. `spec.md` §6 말미가 이름을 부르고 근거를 적는다. 하네스만 고치고 문서를 두면 다음 감사자가 왜 바뀌었는지 알 수 없다.

### 4. 개정할 문서 목록

`spec.md` §6 의 표가 전부다. 편집 방식은 **원문 유지 + 개정 주석 추가** 한 가지이며, 문장을 다시 쓰지 않는다.

**1차 계획 감사가 그 표의 불완전함을 지적했다(F-10·F-11).** sweep 은 `.moai/specs/` 전체를 훑었는데도 두 자리가 빠졌다 — `SPEC-CHANPERM-001/spec.md:212-218`(앵커는 «### Out of Scope — 서버 쪽 방 인가» 절 머리. 1차 감사는 `:209-215` 로 적었으나 그 시점 실제 위치는 `:211-217` 이었고, 카드 `t15` 의 v0.6.0 HISTORY 한 행이 한 줄 밀어 현재값이 된다 — 산술 이동만 적용해 기존 오차를 승계한 3회차 교정값을 앵커 재측정으로 정정한다)(규범 문서 **본문**이므로 「장부는 과거 관측」 면제가 적용되지 않는다)와 `SPEC-MSG-001/plan.md:87`(같은 문장을 형제 네 곳에서 개정하면서 이 한 자리만 놓쳤고, 같은 파일의 `:106` 은 개정했으므로 파일을 못 본 것이 아니다). 표가 불완전하면 `acceptance.md` 의 완료 조건(«§6 표의 형제 문서 전부에 개정 주석이 달렸다»)이 **불완전한 상태를 통과로 판정한다** — 목차가 곧 판정 기준이기 때문이다. 두 행을 표에 더했고, 감사가 선택 등급으로 남긴 세 자리(F-12·F-15·F-16)도 함께 올려 표를 「무엇을 손댔는가」의 참된 목차로 되돌렸다.

**두 부류를 구별해 적는다.** 대부분은 원문 옆에 개정 주석을 다는 편집이지만, `progress.md` 두 건(F-16)은 **장부**라서 원문을 고치지 않고 파일 말미에 현재 상태 한 줄을 더하는 방식만 쓴다. 「리드 판정 대기」는 과거 관측이 아니라 현재 상태 주장이므로 그대로 두면 거짓이 되고, 장부 원문을 고치면 장부의 성격이 무너진다 — 말미 추가가 둘 다 피하는 유일한 형태다.

## §F 마일스톤

우선순위 순서다. 앞 단계가 끝나야 뒤를 시작할 수 있다 — 게이트 테스트가 스키마를 쓰고, 하네스 교정이 게이트를 쓴다.

### M1 — 스키마와 이행 (우선순위 High)

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-ROOMAUTHZ-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` §E.1 에 적는다.
1. `server/test/room-members.test.ts` 를 만들고 `acceptance.md` 의 공통 하네스와 스키마·이행 기준(AC-ROOMAUTHZ-001·002·003)을 쓴다.
2. **RED 확인**: `npm test -w server` → 실패. 출력 원문 기록. **모듈 부재가 아니라 단언 실패인지 구별해 적는다.**
3. `server/src/db.ts` 에 `room_members`·`schema_migrations` 를 `SCHEMA` 로 더하고, `openDb` 에 `PRAGMA table_info` 기반 `ALTER TABLE` 과 표식 기반 1회성 백필을 넣는다.
4. **GREEN 확인**: `npm test -w server`, `npm run typecheck -w server` 종료 코드 `0`.
5. 커밋: `feat: room_members table, rooms.created_by and a one-shot membership backfill`

수용 기준: AC-ROOMAUTHZ-001, 002, 003.

### M2 — 술어와 멤버십 획득 (우선순위 High)

1. 같은 테스트 파일에 AC-ROOMAUTHZ-004·005·006·007 을 쓴다. AC-004 는 **두 시나리오**다 — 정상 경로와 트랜잭션 되돌림(트리거로 멤버 삽입을 실패시킨다). AC-005·006 은 없는 방·보관된 방 행까지 덮는다.
2. **RED 확인** 후 `server/src/room-members.ts` 를 만든다 — `isRoomMember`, `requireRoomMember`.
3. `server/src/routes-rooms.ts` 의 `POST /api/rooms` 를 **단일 트랜잭션**으로 바꿔 `created_by` 기록과 멤버 삽입을 함께 한다. `POST /api/rooms/:id/members` 를 더한다.
4. **GREEN 확인** + typecheck.
5. 커밋: `feat: room membership predicate, creator auto-join and invitation route`

수용 기준: AC-ROOMAUTHZ-004, 005, 006, 007. (REQ-ROOMAUTHZ-007 의 대응 기준은 AC-ROOMAUTHZ-017 이며, 게이트 전부를 훑으므로 M3 에 있다.)

### M3 — 게이트 여덟 곳 (우선순위 High)

D2 v2 로 초대 라우트 셋이 더해져 다섯이 아니라 여덟이다.

1. AC-ROOMAUTHZ-008·009·010·011·012·013·017·018 을 쓴다. **각 기준은 부정 사례와 대조군을 함께 갖는다.**
2. **RED 확인.**
3. 게이트를 건다.
   - `routes-messages.ts` 두 라우트 — 멤버십을 방 상태 검사 **앞**에.
   - 이벤트 라우트 — `server/src/routes-events.ts` 로 `registerEventRoute` 를 추출하고 `index.ts:57` 의 인라인 라우트를 **지운다.** 게이트는 `reply.hijack()` **앞**에. (지우지 않으면 AC-ROOMAUTHZ-010 두 번째 시나리오가 `buildServer()` 조립 서버에서 `200` 을 받아 걸린다.)
   - `routes-rooms.ts` 의 `GET /api/rooms` 좁히기.
   - `permissions.ts` 의 `tryHandleUserReply` 시그니처 개정과 호출부 수정.
   - **`routes-bots.ts` 초대 라우트 셋**(`:47`·`:65`·`:76`) — 멤버십을 **각 라우트의 기존 조회보다 앞**에. `POST` 는 `:52` 의 방 조회보다 앞이어야 비멤버에게 `409` 가 새지 않는다.
4. **GREEN 확인** — `server/test/room-members.test.ts` 전건 통과 + typecheck 종료 코드 `0`. 형제 파일은 아직 깨진 상태이며 그것이 §D 목록이다. 「전체 초록」은 M4 의 조건이지 M3 의 조건이 아니다.
5. 커밋: `feat: enforce room membership on message, stream, listing, verdict and bot-invite paths`

수용 기준: AC-ROOMAUTHZ-008..013, 017, 018.

**M3 이 §D 표를 흔드는 자리 하나.** 3번의 «인라인 라우트를 지운다»가 §D.3.1 의 2차 효과 8건을 발생시킨다. 그 8건은 M3 에서 깨진 채로 두고 M4 가 하네스를 고쳐 되살린다 — M3 종료 시점의 「전건 초록」은 **새 테스트 파일에 대해서만** 성립한다.

### M4 — 형제 하네스 교정과 문서 개정 (우선순위 High)

이 단계가 §D 목록을 소비한다.

1. `npm test -w server -- --reporter=verbose` 를 돌려 **실패 목록을 실제로 받는다.** §D.4 의 34개와 대조하고, 차이를 `progress.md` §E.2 에 적는다. **차이가 있으면 그것이 놓친 결합이며, 먼저 규명한 뒤 진행한다.**
2. `messages.test.ts`·`permissions.test.ts` 의 seed 함수가 방을 만든 뒤 그 방의 멤버로 로그인 사용자를 넣도록 고친다. `sse.test.ts` 는 `:30` 의 사본 라우트를 지우고 `registerEventRoute` 를 쓰며(REQ-ROOMAUTHZ-010 이 이름으로 지목한다), `:192` 는 `buildServer` 로 방을 만들어 그 번호로 스트림을 연다. `permissions.test.ts:51` 의 사본도 같이 지운다.
3. AC-MSG-012·AC-PERM-009 의 대조군은 **의도를 유지한 채** 멤버 사용자를 쓴다. 두 기준의 전제 변경 사실을 각 SPEC 문서에 주석으로 남긴다. **AC-MSG-012 는 여기서 대조군 단언도 좁힌다** — `messages.test.ts:347` 의 `statusCode !== 401` 을 실제 성공 코드 단언으로 바꾼다(§D.3 의 F-13 정정 상자가 근거). 이것은 기준의 의도를 바꾸는 것이 아니라 원래 의도를 실제로 재게 만드는 교정이며, 그 사실도 함께 주석으로 남긴다.
4. `spec.md` §6 표의 문서 전부에 개정 주석을 단다. 원문은 지우지 않는다. **`progress.md` 두 건은 말미 추가 방식**이다(§E 4번). 그리고 **양방향 대조를 실행한다** — 표가 이름을 부른 자리를 열어 주장이 현재 텍스트에 실재하는지 보고(표 → 파일), 반대로 `grep -rn "SPEC-ROOMAUTHZ-001" .moai/specs .moai/plan` 으로 이 SPEC 이 남긴 주석 전건을 뽑아 D2 v2 기준으로 아직 참인지 본다(파일 → 표). 실행한 명령과 판정을 `progress.md` §E.2 에 적는다. 판정 대상은 **주석의 존재가 아니라 참임**이다 — 2차 감사 N-01 이 「주석이 있다」만 보는 완료 조건을 통과한 자리다.
5. **전체 GREEN 확인**: `npm test -w server` 전건 통과 + typecheck 종료 코드 `0`.
6. 범위 경계 확인 (AC-ROOMAUTHZ-015): `git rev-parse --verify "$(cat .moai/specs/SPEC-ROOMAUTHZ-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 **먼저** 확인하고, 그 뒤에만 `git diff` 로 넘어간다. 빈 출력 하나만 보고 통과로 적지 않는다.
7. 커밋: `test: adapt sibling harnesses to room membership and annotate reversed decisions`

수용 기준: AC-ROOMAUTHZ-014, 015, 016.

## §G 자기 검증

구현 완료 판정은 `acceptance.md` **전부**다 — AC-ROOMAUTHZ-001..018 과 그 문서의 완료 정의 항목을 함께 포함한다. 별도 기준을 만들지 않는다. AC 18건으로만 좁히면 완료 정의에만 적힌 조건(§M4 4번의 양방향 대조 등)이 판정 밖으로 새어 나간다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` §E.2 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **부정 사례만으로 게이트를 재기** — 이 SPEC 에서 가장 위험한 실수다. "비멤버가 `404` 를 받는다"는 **모든 요청을 `404` 로 막는 구현**도 통과시킨다. 모든 게이트 기준에 대조군(멤버는 성공한다)을 붙인다.
- **대조군만으로 게이트를 재기** — 반대 방향이다. "멤버가 성공한다"는 **게이트가 아예 없는 구현**도 통과시킨다. 짝으로만 판정한다.
- **`403` 을 쓰기** — 방의 실재를 확인해 주면 열거가 다시 열린다. §B.
- **멤버십을 방 상태 검사 뒤에 두기** — 비멤버가 `409` 와 `404` 를 구별하게 되어 실재가 샌다. 순서가 요구사항이다.
- **`reply.hijack()` 뒤에서 멤버십 검사하기** — hijack 뒤에는 Fastify 가 상태 코드를 보내지 않아 비멤버가 응답 없는 열린 스트림을 쥔다.
- **비멤버에게 빈 배열 돌려주기** — `GET /api/rooms/:id/messages` 가 `{ messages: [] }` 를 내면 "메시지 없는 방"과 구별되지 않아 실재가 그대로 샌다.
- **`SCHEMA` 상수만 고치고 끝내기** — `CREATE TABLE IF NOT EXISTS` 는 기존 표에 컬럼을 더하지 않는다. 새 DB 에서만 동작하고 돌고 있는 DB 는 조용히 옛 모양으로 남는다.
- **백필을 무조건 실행하기** — 재기동마다 돈다. 탈퇴가 생기는 날 나간 사람이 되살아나고, 그때는 원인을 찾기 어렵다.
- **백필과 표식을 다른 트랜잭션으로 두기** — 한쪽만 남는 상태가 생긴다.
- **`created_by` 로 인가 판정하기** — 인가는 `room_members` 만 본다. 생성자가 방을 떠나는 기능이 생기면 즉시 깨진다.
- **판정 논리를 라우트마다 복사하기** — 술어를 부르는 자리는 **여덟**이다(게이트 preHandler 일곱 + 브로커 `permissions.ts` 의 판정 수용). 그중 하나만 고쳐지는 날이 오고, 그날 열리는 구멍은 아무 오류도 내지 않는다. 술어 하나를 쓴다 (REQ-ROOMAUTHZ-007). AC-ROOMAUTHZ-017 이 그 여덟 중 일곱(게이트 preHandler)을 한 사람으로 훑고, 나머지 하나(판정 수용)는 AC-012 가 잰다. 목록 `GET /api/rooms` 는 이 여덟에 들지 않는다 — 술어를 부르지 않고 인라인 SQL 로 같은 조건을 적으며 AC-011 이 잰다. (card t33 정정 — 이전 문언은 «아홉»이었고 목록을 호출부로 셌다)
- **브로커의 멤버십 검사를 "라우트가 이미 막으니 중복"이라며 빼기** — 두 번째 호출부가 생기는 날 그 경로는 보호되지 않는다. §C.
- **`tryHandleUserReply` 시그니처만 고치고 REQ-PERM-004 를 그대로 두기** — 문서가 인터페이스를 글자 그대로 못 박고 있어 구현이 결함으로 판정된다.
- **깨진 형제 테스트를 "원래 이랬다"며 다시 쓰기** — AC-MSG-012·AC-PERM-009 는 전제가 무효화된 것이지 처음부터 틀린 것이 아니다. 무엇이 왜 바뀌었는지 남긴다.
- **§D 의 34개를 세어만 보고 넘어가기** — M4 단계 1이 실제 실패 목록을 받아 대조한다. 대조하지 않은 숫자는 추정이지 열거가 아니다.
- **범위가 넓어졌을 때 옛 숫자에 «새로 늘어난 몫»을 더하기** — 초판이 놓친 것이 있으면 그대로 이월된다. D2 v2 때 §D 를 처음부터 다시 돌린 이유이며(§D.0), 결과가 같은 값(34)이어도 같은 계산이 아니다.
- **분모와 분자의 근거를 섞어 적기** — 「104 통과」는 실행 관측이고 「34 깨짐」은 소스 판독이다. 둘을 «실행으로 확인했다» 한 문장으로 묶으면, 실제로 관측하지 않은 것을 관측했다고 적는 것이 된다.
- **깨진 테스트를 지워서 초록 만들기** — 목록의 테스트는 전부 유효한 계약을 재고 있다. 하네스를 고치지 테스트를 없애지 않는다.
- **첨부 라우트(`GET /api/attachments/:id`)와 방 보관 라우트(`POST /api/rooms/:id/archive`)를 "겸사겸사" 함께 막기** — D2 **v2** 범위 밖이다. **REQ-ROOMAUTHZ-013 을 읽고 «보관 라우트에도 게이트를 걸어야 한다»로 이해하지 않는다** — 그 요구사항 본문 끝이 이 라우트를 «알려진 미준수»로 이름 붙여 안고 있으므로, 여기 적힌 대로 걸지 않는 것이 위반이 아니다(2차 감사 N-07). 운영자가 넓힌 것은 초대 라우트 셋까지이며, 이 둘이 열려 있음은 `spec.md` §7·§9 에 이름으로 적혀 있다. 닫는 것은 후속 카드이거나 운영자의 또 한 번의 결정이다. 범위를 넘는 수정은 이 카드의 감사 대상 밖에서 검증 없이 들어간다.
  - **반대로, 봇 초대 라우트 셋은 이제 범위 «안»이다.** 초판을 읽고 "초대 라우트는 건드리지 않는다"로 이해하면 REQ-ROOMAUTHZ-017 이 미이행으로 남는다.
- **초대 라우트의 게이트를 기존 방 조회 뒤에 두기** — `routes-bots.ts:52-54` 가 없음(`404`)과 보관됨(`409`)을 이미 가르고 있어, 뒤에 두면 비멤버가 `409` 를 받아 방 실재가 샌다. AC-ROOMAUTHZ-018 두 번째 시나리오가 정확히 그것을 잡는다.
- **`GET /api/rooms/:id/invites` 를 비멤버에게 빈 배열로 돌려주기** — `GET /api/rooms/:id/messages` 와 같은 결함이다. 빈 배열은 "봇이 없는 방"과 구별되지 않아 실재가 그대로 샌다.
- **`index.ts:57` 의 인라인 이벤트 라우트를 지우지 않고 새 모듈만 추가하기** — Fastify 는 중복 등록이 아닌 한 조용하므로 아무 오류도 나지 않고, 하네스는 새 함수를 쓰니 초록이다. 프로덕션만 게이트가 없다. AC-ROOMAUTHZ-010 의 `buildServer()` 시나리오가 그 상태를 잡는 유일한 장치다.
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡힌다.
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않는다. `--reporter=verbose` 의 `✓` 줄로 판정하며 `-t <이름>` 필터로 대신하지 않는다(맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0`).

## §I 상호 참조

- `.moai/reports/t4/sync-audit.md` §F-14 — 이 SPEC 의 발단
- `spec.md` — GEARS 요구사항(REQ-ROOMAUTHZ-001..017), 운영자 결정 3건, 개정 대상 문서 표
- `acceptance.md` — AC-ROOMAUTHZ-001..018, 공통 테스트 하네스
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2장 — 뒤집는 대상 원문
- `.moai/specs/SPEC-PERM-001/` — REQ-PERM-004 개정 대상, AC-PERM-009 전제 무효화
- `.moai/specs/SPEC-MSG-001/` — AC-MSG-012 전제 무효화
- `.moai/specs/SPEC-SSE-001/`, `SPEC-ROOM-001/`, `SPEC-BOT-001/`, `SPEC-AUTH-001/`, `SPEC-CORE-001/` — 개정 주석 대상
