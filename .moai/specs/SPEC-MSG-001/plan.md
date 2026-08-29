# SPEC-MSG-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 9 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2`/`M3` 은 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M3`(카드 `t3`)과는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t3` 는 하나이지만 Tier M SPEC 네 개를 낸다. 이 SPEC 은 그 마지막 조각이며, 앞 세 SPEC 이 끝나야 시작할 수 있다.

```
SPEC-MENTION-001 ┐
SPEC-SSE-001     ├─→ SPEC-GATEWAY-001 ─→ SPEC-MSG-001 (이 SPEC)
                 ┘
```

이 SPEC 이 선행 SPEC 에서 **정확히 무엇을 받아 쓰는지**:

| 선행 SPEC | 받아 쓰는 것 | 이 SPEC 에서의 쓰임 |
|-----------|-------------|-------------------|
| `SPEC-AUTH-001` | `requireAuth(req, reply)` preHandler | 세 라우트의 `preHandler: [requireAuth]` (REQ-MSG-013) |
| `SPEC-AUTH-001` | `req.user` = `{ id, username }` | `author_user_id`, 응답의 `author_name` |
| `SPEC-AUTH-001` | `registerAuthRoutes` + 로그인 흐름 | `messages.test.ts` 의 `build()` 가 쿠키를 얻는 경로 |
| `SPEC-CORE-001` | `messages` / `message_targets` / `attachments` 테이블, `config.uploadsDir` | 저장처와 업로드 경로 |
| `SPEC-ROOM-001` | `rooms.status` 계약 | 보관된 방 `409` (REQ-MSG-004) |
| `SPEC-BOT-001` | `bot_tokens` 활성 행, `sha256Hex` | "초대된 봇" 판정(REQ-MSG-002), 테스트 seed |
| `SPEC-MENTION-001` | `parseMentions(body): { bot, delivery }[]` | 멘션 추출 |
| `SPEC-SSE-001` | `createSseHub()`, `hub.publish(roomId, event, data)` | 브라우저 전파 (REQ-MSG-010) |
| `SPEC-GATEWAY-001` | `createGateway(app, { uploadsDir })`, `gateway.deliver(roomId, msg, targets)` | 봇 전달 (REQ-MSG-010) |

선행 SPEC 의 산출물이 실제로 존재하지 않으면 이 SPEC 의 어떤 테스트도 import 단계에서 실패한다. run 단계 진입 전 확인 대상이다 (§F M1 단계 0).

## §B 되돌리기 어려운 결정 — 메시지 커서

이 SPEC 에서 가장 되돌리기 비싼 결정이다. `SPEC-GATEWAY-001` 의 재전송 로직과 웹 UI 의 폴링이 이 번호에 직접 결합한다.

| 항목 | 값 | 왜 여기서 고정하는가 |
|------|-----|---------------------|
| 채번 | `messages.id` — `SPEC-CORE-001` 의 `INTEGER PRIMARY KEY AUTOINCREMENT` | 별도 방별 번호를 만들면 스키마 변경이 필요하고 REQ-MSG-014 가 금지한다 |
| 방 안에서의 성질 | 단조 증가 (연속은 아님) | 다른 방의 메시지가 사이에 끼면 번호가 건너뛴다. `WHERE room_id=? AND id>?` 조회는 그래도 정확하다 |
| 목록 조회 | `?after=<id>` → `id > after` | `after` 부재 시 `0` |
| 정렬·상한 | `ORDER BY id ASC LIMIT 200` | 원본 Task 9 그대로 |
| 게이트웨이와 공유 | `missed_after_id`, `bot_tokens.last_delivered_id`, `fetch_history` 의 `since_id` 가 같은 값 | `spec-v2.md` 6장 — "재접속 복구와 대화 따라잡기가 하나의 커서 체계를 쓴다" |

**"방마다 단조 증가"의 정확한 뜻.** `spec-v2.md` 6장은 `id` 를 "방마다 단조 증가하는 커서"라고 쓴다. 전역 AUTOINCREMENT 는 각 방 안에서도 단조 증가하므로 이 서술을 만족한다 — 방마다 1부터 다시 세는 번호가 아니다. 이 차이는 UI 에 노출되지 않지만, 나중에 "방 안의 몇 번째 메시지"를 보여 주고 싶어지면 여기서 다시 세야 한다. 지금은 만들지 않는다 (YAGNI).

검토 시 이 표가 확인 대상이다. 여기서 채번을 바꾸면 `SPEC-GATEWAY-001` 의 커서 코드가 함께 바뀐다.

## §C 되돌리기 어려운 결정 — 업로드 파일이 놓이는 자리

두 번째로 비싼 결정이자, 이 SPEC 의 유일한 보안 표면이다.

| 항목 | 값 |
|------|-----|
| 저장 디렉터리 | `req.server.uploadsDir` (= `config.uploadsDir` = `MINIDISCORD_DATA_DIR/uploads`) |
| 저장 파일명 | `${randomUUID()}-${basename(part.filename)}` |
| DB 에 남기는 표시 이름 | `basename(part.filename)` — 경로 성분을 제거한 이름 |
| 쓰기 시점 봉인 | `basename` 이 `../` 를 제거한다 (REQ-MSG-007) |
| 읽기 시점 봉인 | `resolve(stored_path)` 가 `resolve(uploadsDir) + sep` 로 시작하지 않으면 `404` (REQ-MSG-009) |
| 파일 크기 상한 | `req.parts({ limits: { fileSize: 100 * 1024 * 1024 } })` — 원본 그대로 |

**왜 두 겹인가.** 쓰기 봉인만 있으면 이미 DB 에 들어간 나쁜 `stored_path`(다른 경로로 들어온 행, 수동 삽입, 미래의 봇→사람 첨부 경로)를 막지 못한다. 읽기 봉인만 있으면 파일이 이미 디렉터리 밖에 쓰인 뒤다. 두 요구사항은 서로의 백스톱이며 AC-MSG-007 과 AC-MSG-008 이 각각 관측한다.

## §D 원본 문서 모순과 해결

원본 `plan-v2.md` Task 9 를 `spec-v2.md` 및 이미 확정된 선행 SPEC 계약과 대조하면서 찾은 것들이다. 1·3·4·8번은 원본을 그대로 옮겨 적으면 각각 계약 불일치·보안 결함·테스트 실패·**전 기준 실행 불능**을 낳는다. 9번은 원본의 결함이 아니라 이 SPEC 초판 자신의 공백이며, plan-audit 이 지적해 닫았다.

### 1. 실패 상태 코드 `403` — 선행 SPEC 계약과 충돌하는 의도적 이탈

**이 기록을 남기는 이유: 뒤에 이 문서를 읽는 사람이 원본과 다른 것을 보고 "원상 복구"하지 않게 하기 위해서다.**

원본은 전송 실패를 이렇게 정한다.

```
plan-v2.md:1836  const room = db.prepare("SELECT id FROM rooms WHERE id=? AND status='active'").get(roomId)
plan-v2.md:1837  if (!room) return reply.code(403).send({ error: '활성 방이 아닙니다' })
plan-v2.md:1766  it('rejects message to archived room', ...) → expect(res.statusCode).toBe(403)
```

이것은 `SPEC-BOT-001` §D 5번이 초대 라우트에서 **이미 결함으로 판정하고 고친 것과 똑같은 형태**다. 세 가지가 잘못돼 있다.

1. **없는 방과 보관된 방이 한 분기로 합쳐져 있다.** 조건이 `id=? AND status='active'` 하나라 둘을 구분할 수 없고 본문도 같다.
2. **`403` 이 가리킬 대상이 없다.** 인증됐으나 권한이 없다는 뜻인데, 방별 접근 권한이 이 시스템에 없다 (REQ-MSG-013 의 서술, `spec-v2.md` 12장).

   > **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 근거가 사라졌다 — 그 SPEC 이 `room_members` 로 방별 접근 권한을 만들었다. 다만 **그 SPEC 도 `403` 을 쓰지 않는다**: 비멤버에게 `403` 을 주면 방의 실재를 확인해 주게 되어 방 번호 열거가 열리므로, 없는 방과 구별되지 않는 `404` 를 쓴다(REQ-ROOMAUTHZ-013). 따라서 이 항목의 결론(이 SPEC 에서 `403` 을 쓰지 않는다)은 근거만 바뀐 채 그대로 유효하다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.
   >
   > **왜 이 자리에만 늦게 붙었는가.** 같은 문장이 형제 네 곳(`SPEC-ROOM-001/plan.md:140`, `SPEC-BOT-001/plan.md:70`·`:181`, `SPEC-BOT-001/acceptance.md:130`)에 있고 그쪽은 1차에 개정됐는데, 같은 파일 `:106` 을 개정하면서 이 한 자리를 놓쳤다. 1차 계획 감사(`.moai/reports/t11/plan-audit.md` F-11)가 잡았다.
3. **같은 서버 안에서 같은 상황에 다른 코드를 쓰게 된다.** 초대는 `404`/`409`, 전송은 `403` — UI(카드 `t5`)가 상태 코드로 문구를 고를 수 없다.

**해결: 선행 SPEC 과 같은 규칙으로 통일한다.** `404` = 지목한 대상이 없다, `409` = 대상은 있으나 그 상태에서는 할 수 없다. `403` 은 쓰지 않는다.

| 상황 | 원본 | 교정 후 |
|------|------|---------|
| 전송 — 방 없음 | `403` (보관됨과 합침) | `404` + "방을 찾을 수 없다" |
| 전송 — 방이 보관됨 | `403` (없음과 합침) | `409` + "보관된 방에는 메시지를 보낼 수 없다" |

영향 범위: REQ-MSG-004, AC-MSG-004, 원본 테스트 이름 `rejects message to archived room` (상태 코드가 바뀌므로 본문도 함께 바뀐다). 이 이탈은 `SPEC-BOT-001` §D 5번과 `SPEC-ROOM-001` §D 7번의 선례를 그대로 따르므로 새로운 근거가 필요하지 않다.

### 2. "방 구성원 검사"는 구현 가능한 대상이 아니다

카드 지시는 "모든 엔드포인트에 인증 + 방 구성원 검사"를 요구했다. **구성원이라는 개념이 스키마에 없다.**

- `rooms` 에 소유자 컬럼이 없다 (`db.ts` 의 `SCHEMA`)
- 구성원 테이블이 없다
- `req.user` 는 `{ id, username }` 두 필드로 고정돼 있다 (`SPEC-AUTH-001`)
- 방별 접근 권한은 `spec-v2.md` 12장이 YAGNI 로 배제했고 선행 세 SPEC 이 모두 그 판단을 이어받았다
- 컬럼이나 테이블을 더하려면 `SCHEMA` 를 바꿔야 하는데 REQ-MSG-014 가 금지한다

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 다섯 항목 중 넷이 뒤집혔다 — `SPEC-ROOMAUTHZ-001` 이 `rooms.created_by` 컬럼과 `room_members` 표를 더하고 방별 접근 권한을 만들었다. `req.user` 만 여전히 `{ id, username }` 두 필드다(멤버십은 표로 조회하므로 필드를 늘리지 않았다). 마지막 항목의 REQ-MSG-014 금지는 **이 SPEC 의 구현**을 구속하는 조항이지 이후 SPEC 을 구속하는 선언이 아니었다 — 그렇게 읽으면 스키마가 영구 동결된다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

**해결: 강제 가능한 것만 요구사항으로 쓴다.** REQ-MSG-013 은 세 라우트 전부에 `requireAuth` 를 요구하고 미인증 `401` 을 관측한다(AC-MSG-012). "구성원"이 아니라 "로그인 여부"다. 로그인한 사람이 남의 방을 읽는 것은 **이 시스템에서 의도된 동작**이며, §E 잔여 위험 표와 `spec.md` REQ-MSG-013 본문에 명시했다.

방별 권한이 정말 필요해지면 그것은 스키마 변경이므로 별도 SPEC 이다. 이 SPEC 안에서 우회로를 만들지 않는다.

### 3. 업로드 파일명이 저장 경로로 그대로 들어간다 — 경로 이탈

원본 구현:

```
plan-v2.md:1815  import { createWriteStream, renameSync, mkdirSync, statSync } from 'node:fs'
plan-v2.md:1817  import { basename, join, extname } from 'node:path'      ← basename 을 import 하지만
plan-v2.md:1845  const stored = join(req.server.uploadsDir, `${randomUUID()}-${part.filename}`)   ← 쓰지 않는다
```

`basename` 이 import 되어 있고 한 번도 쓰이지 않는다. 의도는 있었으나 실행되지 않았다는 뜻이다. `part.filename` 은 클라이언트가 보내는 문자열이므로 값이 `../../../../tmp/pwned` 이면 `join` 이 그것을 정규화해 업로드 디렉터리 **밖**에 파일을 쓴다. `renameSync` 도 import 만 되고 쓰이지 않는다(원자적 이동은 `spec-v2.md` 8장이 요구하지만 구현에 없다 — 이 SPEC 범위 밖으로 명시 배제).

**해결**: 저장 경로를 만들기 전에 `basename` 을 적용하고, DB 의 `filename` 에도 같은 값을 넣는다. 여기에 읽기 시점 봉인(§C)을 더한다.

```ts
const safeName = basename(part.filename)
const stored = join(req.server.uploadsDir, `${randomUUID()}-${safeName}`)
```

AC-MSG-007 이 `../../../../etc/passwd` 라는 **구체적 입력**으로 이 방어를 관측한다.

### 4. 원본 테스트 하네스가 `uploadsDir` 을 데코레이트하지 않는다 — 테스트가 실패한다

원본 `messages.test.ts` 의 `build()` 는 `uploadsDir` 을 `createGateway` 에만 넘긴다.

```
plan-v2.md:1706  const gateway = createGateway(app, { uploadsDir: join(dir, 'up') })
plan-v2.md:1707  app.decorate('gateway', gateway)                ← uploadsDir 데코레이트가 없다
```

그런데 구현은 `req.server.uploadsDir` 을 읽는다 (`plan-v2.md:1844`). 테스트 앱에는 그 데코레이터가 없으므로 값이 `undefined` 가 되고, `mkdirSync(undefined, …)` 가 던진다. 원본을 그대로 옮기면 **`saves uploaded file as attachment and serves download` 테스트가 반드시 실패한다.** `index.ts` 쪽에는 `app.decorate('uploadsDir', config.uploadsDir)` 가 있어서(`plan-v2.md:1908`) 실제 서버에서는 동작한다 — 테스트 하네스만 빠져 있다.

**해결**: `build()` 에 한 줄을 더한다.

```ts
const uploadsDir = join(dir, 'up')
app.decorate('uploadsDir', uploadsDir)
const gateway = createGateway(app, { uploadsDir })
```

같은 `uploadsDir` 값을 게이트웨이와 데코레이터가 공유해야 한다 — 갈라지면 경로 봉인 검사(AC-MSG-008)가 무엇을 재는지 불분명해진다.

### 5. `SELECT last_insert_rowid()` — 타입이 없고 자리도 잘못됐다

원본:

```
plan-v2.md:1863  return { filename: f.filename, stored_path: f.stored_path,
                           id: db.prepare('SELECT last_insert_rowid() id').get().id }
```

두 문제가 있다. `.get()` 의 반환 타입이 `unknown` 이라 strict 모드에서 `.id` 접근이 컴파일되지 않는다. 그리고 INSERT 를 `.map()` 콜백 안에서 하면서 반환값을 만들고 있어 부수 효과와 변환이 섞인다.

**해결**: `run()` 의 `lastInsertRowid` 를 그대로 쓴다.

```ts
const attachments: { id: number; filename: string; stored_path: string }[] = []
for (const f of savedFiles) {
  const r = db.prepare('INSERT INTO attachments (message_id, filename, stored_path, size, mime) VALUES (?, ?, ?, ?, ?)')
    .run(messageId, f.filename, f.stored_path, f.size, MIME[extname(f.filename).toLowerCase()] ?? 'application/octet-stream')
  attachments.push({ id: r.lastInsertRowid as number, filename: f.filename, stored_path: f.stored_path })
}
```

### 6. `if (!body.trim() && savedFiles.length === 0)` 가 파일 저장 뒤에 온다

빈 전송 판정(REQ-MSG-005)이 multipart 루프 **뒤에** 있으므로, 파일만 있고 body 가 빈 요청은 정상 처리되고(요구사항대로다) body 도 파일도 없는 요청은 아무것도 저장하지 않은 채 `400` 이 된다. 원본대로 두면 맞다 — 다만 파일이 있고 멘션이 잘못된 경우(REQ-MSG-003 의 `400`)에는 **이미 디스크에 파일이 쓰인 뒤**다. DB 행은 남지 않지만 디스크에는 고아 파일이 남는다.

**판정: 수용한다.** 고아 파일 정리는 `spec-v2.md` 8장의 "원자적 이동"과 함께 이 SPEC 범위 밖(§ 범위 밖 — 파일 처리 심화)이다. AC-MSG-003 의 관측 대상은 **DB 세 테이블에 행이 없다**이지 디스크가 깨끗하다가 아니다 — 기준 본문에 그 경계를 적어 둔다. §E 위험 표에도 올린다.

### 7. `@fastify/multipart` 버전이 계획서와 다르다

`plan-v2.md` Global Constraints 는 `@fastify/multipart ^9` 를 적었으나 실제 설치본은 `^10.1.1` 이다(`server/package.json`). `req.parts()` 스트리밍 API 는 두 메이저에서 동일하다. **의존성을 바꾸지 않는다** — 계획서의 버전은 하한선이라고 같은 문단이 명시하고 있다.

### 8. 원본 하네스의 `set-cookie` 처리가 실제 런타임과 어긋난다 — 정상 구현도 통과할 수 없다

> plan-audit M1. 이 SPEC 에서 가장 싸고 가장 치명적인 결함이다 — 고치지 않으면 run 단계가 첫 테스트에서 멈춘다.

원본 `messages.test.ts` 의 `build()` 마지막 줄:

```
plan-v2.md:1712  return { app, cookie: login.headers['set-cookie']![0].split(';')[0] }
```

`app.inject` 뒤에 있는 `light-my-request` 는 `set-cookie` 를 **배열이 아니라 문자열 하나**로 돌려준다. 문자열에 `[0]` 을 적용하면 첫 글자 `"m"` 이 나오고 `.split(';')[0]` 도 `"m"` 이다. 그 값을 쿠키로 보내면 `requireAuth` 가 전부 `401` 을 낸다.

**이것은 구현이 아니라 하네스의 결함이라 방향이 반대다** — 스텁이 통과하는 것이 아니라 **정상 구현조차 통과할 수 없다.** 열두 기준(AC-MSG-001..012)이 전부 `build()` 단계에서 무력해진다.

이미 머지된 `server/test/rooms-bots.test.ts:21-26` 이 같은 문제를 만나 `setCookieOf` 헬퍼로 해소해 두었고("`SPEC-AUTH-001` 과 같은 적응"이라는 주석까지 달려 있다), 형제 SPEC `SPEC-GATEWAY-001` 의 AC-GW-018 도 같은 교정(`Array.isArray(raw) ? raw[0] : raw`)을 적용했다. 이 SPEC 만 원본을 그대로 옮겨 적어, 같은 카드 안에서 한쪽에만 교정이 들어간 상태였다.

**해결**: `acceptance.md` 공통 하네스에 `setCookieOf` 를 두고 `setCookieOf(login).split(';')[0]` 을 쓴다 — 기존 스위트와 글자 단위로 같은 형태다.

### 9. 프로덕션 배선이 어느 요구사항에도 어느 기준에도 없다

> plan-audit M2·M4. 원본 문서 사이의 모순이 아니라 **이 SPEC 자신의 공백**이므로 §D 의 다른 항목과 성격이 다르다. 같은 자리에 두는 이유는 해소 방식이 같기 때문이다 — 규범 문언을 고친다.

`plan-v2.md:1902-1911` 은 `index.ts` 에 multipart 등록, `uploadsDir` 데코레이트, 라우트 등록, `declare module` 확장을 지시한다. 초판은 이것을 `plan.md` §F M1 단계 3 의 **절차**로만 적었고, `spec.md` 에 요구사항이 없었으며 열네 기준 전부가 손으로 조립한 `build()` 앱을 썼다. `buildServer()` 를 부르는 테스트가 하나도 없었다.

그 상태의 결과는 이렇다. `index.ts` 를 **아무 한 줄이나** 건드리기만 하면 AC-MSG-013 4번의 "변경 파일 정확히 두 줄"이 성립하고, 나머지 열세 기준은 손으로 조립한 앱에서 통과한다. **실제 서버에서 라우트가 등록되지 않아도, multipart 가 등록되지 않아도, `uploadsDir` 이 데코레이트되지 않아도 이 SPEC 이 완료로 판정된다.** 형제 SPEC `SPEC-GATEWAY-001` 은 AC-GW-018 에서 정확히 이것을 막았다 — 같은 카드 안의 비대칭이었다.

여기에 붙은 두 번째 문제가 **업로드 디렉터리의 규범 문언**이다. 초판 REQ-MSG-006·007·009 는 디렉터리를 `config.uploadsDir` 로 못 박았는데, 실제 구현은 `req.server.uploadsDir` 을 읽고(`plan-v2.md:1844`) AC-MSG-007 은 `build()` 가 데코레이트한 임시 디렉터리를 기준으로 단언한다. **요구사항을 글자 그대로 구현하면**(`config.uploadsDir` 직독) 테스트 환경에서 `./data/uploads` 에 쓰게 되어 AC-MSG-007 이 실패한다 — 여기서는 스텁이 아니라 **성실한 구현이 벌을 받는** 방향의 결함이다.

**해결**: 둘을 한 요구사항으로 묶어 REQ-MSG-015 를 신설했다. `registerMessageRoutes` 의 시그니처, `uploadsDir` 데코레이터의 존재, 그리고 multipart 등록이 라우트 등록보다 앞선다는 순서를 규범으로 고정한다. REQ-MSG-006·007·009 의 문언은 "`req.server.uploadsDir` 데코레이터가 가리키는 디렉터리(프로덕션에서는 `config.uploadsDir` 이 그 값)"로 정정했다. 관측은 AC-MSG-015 가 맡는다 — AC-GW-018 과 같은 형태로 실제 `buildServer()` 를 띄워 그 서버를 통해 본다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| 선행 SPEC 미완료 상태에서 착수 | `parseMentions`·`createSseHub`·`createGateway` 가 없어 테스트가 import 단계에서 실패한다 | §A 의존 표를 M1 시작 전 체크리스트로 쓴다 (§F M1 단계 0) |
| `basename` 을 다시 빼기 | 경로 이탈이 조용히 되살아난다. 평상시 파일명으로는 아무 증상이 없다 | AC-MSG-007 이 `../../../../etc/passwd` 라는 구체적 입력으로 관측 |
| 읽기 시점 봉인을 "중복이니까" 지우기 | 이미 DB 에 들어간 나쁜 경로를 막을 수단이 없어진다 | AC-MSG-008 이 손으로 넣은 바깥 경로 행으로 관측 |
| 실패 코드를 `403` 하나로 되돌리기 | 원본 형태이지만 §D 1번의 세 결함이 그대로 되살아난다 | AC-MSG-004 가 두 코드와 두 본문을 모두 단언 |
| `uploadsDir` 데코레이터 누락 | 테스트가 `mkdirSync(undefined)` 로 던진다. 원인이 라우트가 아니라 하네스라 진단이 오래 걸린다 | §D 4번을 M1 단계 1 절차로 못 박음. 프로덕션 쪽은 REQ-MSG-015 항목 1 + AC-MSG-015 1번이 관측 |
| 원본 하네스의 `set-cookie` 를 그대로 옮겨 적음 | `requireAuth` 가 전부 `401` 을 내어 **정상 구현도** 열두 기준을 통과할 수 없다. 실패가 라우트 쪽으로 보여 진단이 가장 비싸다 | §D 8번. `acceptance.md` 공통 하네스가 `setCookieOf` 를 쓰고, 기존 `rooms-bots.test.ts:21-26` 과 같은 형태임을 명시 |
| 배선을 빠뜨린 채 완료 판정 | 실서버에 라우트가 없어도 손으로 조립한 앱에서 열네 기준이 통과한다 | §D 9번. REQ-MSG-015 가 배선을 규범으로, AC-MSG-015 가 실제 `buildServer()` 로 관측 |
| `config.uploadsDir` 직독 | 요구사항을 글자 그대로 구현하면 테스트가 저장소의 진짜 `data/uploads` 에 쓴다 | §D 9번. REQ-MSG-006 의 "업로드 디렉터리" 정의 상자가 `req.server.uploadsDir` 을 규범으로 못 박음 |
| 멘션 오류 시 고아 업로드 파일 | 디스크에 파일이 남는다 (DB 행은 없음) | 수용 — §D 6번. 범위 밖(원자적 이동)과 짝을 이룬다 |
| SSE·게이트웨이 호출을 테스트가 관측하지 못함 | `publish`/`deliver` 를 아예 부르지 않아도 다른 기준이 전부 통과한다 | AC-MSG-009 가 스파이 객체로 호출 횟수·인자를 직접 단언 |
| 로그인한 누구나 남의 방 첨부를 내려받음 | 인가 부재. 단일 사용자·소수 그룹 전제에서 의도된 범위 | 수용. §D 2번에 근거, `spec.md` REQ-MSG-013 본문에 명시. 방별 권한은 별도 SPEC. **→ 재판정 (2026-08-29, `SPEC-ROOMAUTHZ-001` §9): 「수용」이 아니라 「수용하지 않음 — 후속 카드 필요」.** 권한 릴레이가 들어오면서 방을 읽을 수 있다는 것이 남의 세션에 명령 실행을 허가하는 힘이 됐고, 그 SPEC 이 방 범위 라우트를 닫았다. `GET /api/attachments/:id` 는 방이 아니라 첨부 번호로 조회되어 그 게이트 밖에 남았을 뿐, 더 이상 「의도된 범위」가 아니다 |
| `index.ts` 수정이 다른 SPEC 의 등록 순서를 흔듦 | multipart 등록이 늦으면 `req.parts()` 가 없다 | `await app.register(multipart)` 를 `registerMessageRoutes(app)` **앞**에 둔다 (§F M1 단계 3) |
| 범위 경계 검사가 `HEAD` 기준이라 아무것도 관측하지 못함 | M1 커밋 이후 M2 에서 검사가 돌면 이미 커밋된 변경을 못 본다. `--cached` 없는 `git diff` 는 스테이지된 변경도 보고하지 않는다 | 두 검사 모두 `spec_base_sha`(M1 단계 0 에 기록) 기준. `SPEC-BOT-001` BOT-B2 가 차단 결함으로 지적한 것과 같은 형태다 |
| 이름 붙은 테스트의 통과를 요약 줄로 판정 | 기본 리포터는 테스트 이름을 출력하지 않아, 테스트를 아예 안 쓴 실행과 통과한 실행의 출력이 같고 둘 다 종료 코드 `0` | 모든 테스트 기반 기준이 `--reporter=verbose` 의 `✓` 줄을 관측 대상으로 삼는다 (`SPEC-BOT-001` 3차 감사 D1) |

## §F 마일스톤

우선순위 순서다. M1 → M2 → M3 이며 앞이 끝나야 뒤를 시작할 수 있다 — M2 의 목록 테스트가 M1 의 전송 라우트로 메시지를 만들고, M3 의 경계 검사가 두 마일스톤의 결과를 함께 본다.

### M1 — 전송 경로 (우선순위 High)

원본: `plan-v2.md` Task 9 Step 1-3 중 `POST` 경로.

0. **선행 확인과 `spec_base_sha` 기록** (다른 어떤 변경보다 먼저):
   - `ls server/src` 로 `mention.ts`·`sse.ts`·`gateway.ts` 가 있는지 확인한다. 없으면 진행하지 말고 블로커로 보고한다.
   - `git rev-parse HEAD > .moai/specs/SPEC-MSG-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` `§E.1` 에 적는다. M3 의 경계 검사 두 개가 이 값을 기준으로 비교한다.
1. `server/test/messages.test.ts` 를 만든다. `build()` 헬퍼는 원본 Task 9 를 따르되 **교정 두 곳을 반드시 포함한다** — §D 8번의 `setCookieOf` 정규화(빠뜨리면 모든 요청이 `401` 이라 테스트가 하나도 통과하지 않는다)와 §D 4번의 `uploadsDir` 데코레이트 한 줄. 전송 관련 테스트를 쓴다 — 원본의 `stores a plain user message with no targets`, `stores targets for mentioned bots`, `rejects mention of bot not invited to the room`, `saves uploaded file as attachment and serves download`, 그리고 AC-MSG-004 / AC-MSG-005 / AC-MSG-007 / AC-MSG-009 의 추가 테스트. 원본의 `rejects message to archived room` 은 §D 1번에 따라 AC-MSG-004 의 두 경우 구분 테스트로 대체된다.
2. **RED 확인**: `npm test -w server` → 새 테스트가 모듈 부재로 실패. 출력 기록.
3. `server/src/routes-messages.ts` 를 만들고 `POST /api/rooms/:id/messages` 를 구현한다. 실패 분기는 §D 1번에 따라 방 조회 → 없으면 `404`, 보관됐으면 `409` 순서로 가른다. 파일명은 §D 3번에 따라 `basename` 을 적용한다. 첨부 INSERT 는 §D 5번에 따라 `run().lastInsertRowid` 를 쓴다.
   이어서 `server/src/index.ts` 를 고친다 — `import multipart from '@fastify/multipart'`, `app.decorate('uploadsDir', config.uploadsDir)`, `await app.register(multipart)`, `registerMessageRoutes(app)` 순서로 넣고 `declare module 'fastify'` 에 `uploadsDir: string` 을 더한다. **등록 순서를 지킨다** — multipart 등록이 라우트 등록보다 앞이어야 한다 (§E).
4. **GREEN 확인**: `npm test -w server -- --reporter=verbose` → 전송 테스트 전부 통과. `npm run typecheck -w server` → 종료 코드 0.
5. 커밋: `feat: message send API with multipart upload and mention fan-out`

수용 기준: AC-MSG-001, 002, 003, 004, 005, 006, 007, 009, AC-MSG-014(전이 1-2).

### M2 — 목록과 다운로드 (우선순위 High)

원본: `plan-v2.md` Task 9 Step 1-3 중 `GET` 두 경로.

1. 같은 테스트 파일에 목록·다운로드 테스트를 추가한다 — 원본의 `lists messages after cursor`, 그리고 AC-MSG-008 / AC-MSG-011 / AC-MSG-012 의 테스트.
2. **RED 확인**: `npm test -w server` → 새 테스트 실패. 출력 기록.
3. `routes-messages.ts` 에 `GET /api/rooms/:id/messages` 와 `GET /api/attachments/:id` 를 더한다. 다운로드는 §C 의 읽기 시점 봉인을 포함한다 — `resolve(stored_path)` 가 `resolve(uploadsDir) + sep` 로 시작하지 않으면 파일을 열지 않고 `404`.
4. **GREEN 확인**: `npm test -w server -- --reporter=verbose` → 전체 통과. typecheck 0.
5. 커밋: `feat: message listing with cursor and guarded attachment download`

수용 기준: AC-MSG-008, 010, 011, 012, 015, AC-MSG-014(전이 3-4).

> AC-MSG-015(배선)는 M2 GREEN 이후에 판정한다 — 세 라우트가 모두 있어야 실제 `buildServer()` 왕복이 성립한다. `index.ts` 수정 자체는 M1 단계 3 에서 이미 끝나 있다.

### M3 — 범위 경계 확인 (우선순위 Medium)

1. 경계 확인 (AC-MSG-013): `ls server/src` 에 열 파일(`auth.ts`, `config.ts`, `db.ts`, `gateway.ts`, `index.ts`, `mention.ts`, `routes-bots.ts`, `routes-messages.ts`, `routes-rooms.ts`, `sse.ts`)이 모두 있는지 본다. `permissions.ts` 의 존재 여부는 보지 않는다 — 형제 SPEC `SPEC-PERM-001` 이 같은 카드에서 만들 수 있다. "이 SPEC 이 만들지 않았다"의 판정은 아래 `git diff --name-only` 가 한다. 이어서 `git rev-parse --verify "$(cat .moai/specs/SPEC-MSG-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 SHA 를 내는지 확인하고, 그 SHA 를 **직접 적어 넣은** `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이면서 비어 있는지, `git diff --name-only <SHA> -- server/src` 가 종료 코드 `0` 이면서 정확히 두 줄(`server/src/index.ts`, `server/src/routes-messages.ts`)인지 본다.
   **기준 커밋 없는 `git diff` 를 쓰지 않는다** — M1·M2 커밋 이후라 `HEAD` 기준으로는 아무것도 잡히지 않는다. **빈 출력 하나만 보고 통과로 적지도 않는다** — 단계 0 을 건너뛰어 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다.
2. 커밋이 필요하면: `chore(SPEC-MSG-001): scope boundary evidence`

수용 기준: AC-MSG-013.

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-MSG-001..015 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **스키마 변경** — `db.ts` 의 `SCHEMA` 에 컬럼이나 테이블을 더하지 않는다. 방 구성원 테이블이 필요해 보여도 마찬가지다. REQ-MSG-014 가 금지하고, 필요하면 진행을 멈추고 보고한다.
- **`basename` 없이 파일명을 경로에 이어 붙이기** — 원본 형태이며 경로 이탈이다. 평상시 파일명으로는 증상이 없어 조용히 되살아난다 (§D 3번).
- **읽기 시점 봉인을 중복으로 여겨 지우기** — 쓰기 봉인과 읽기 봉인은 서로의 백스톱이다. 한쪽만 남기면 다른 쪽 구멍이 열린다 (§C).
- **실패 코드를 `403` 하나로 되돌리기** — 없는 방과 보관된 방을 구분할 수 없고, `403` 은 이 시스템에 없는 권한 차원을 가리킨다. `SPEC-BOT-001` §D 5번과 같은 결정이다 (§D 1번).
- **"방 구성원 검사"를 지어내기** — 구성원 개념이 스키마에 없다. 없는 개념을 임시 컬럼이나 관례로 흉내 내지 않는다. 필요하면 별도 SPEC 이다 (§D 2번).
- **`uploadsDir` 데코레이트를 빼고 테스트 작성** — `mkdirSync(undefined)` 로 던지며, 원인이 하네스라 진단이 오래 걸린다 (§D 4번).
- **`login.headers['set-cookie']![0]` 를 그대로 쓰기** — `light-my-request` 는 문자열 하나를 돌려주므로 `[0]` 은 첫 글자다. 모든 요청이 `401` 이 되고, 실패가 라우트 쪽으로 보인다. `setCookieOf` 를 쓴다 (§D 8번).
- **`config.uploadsDir` 을 라우트에서 직접 읽기** — 테스트가 저장소의 진짜 `data/uploads` 에 쓰게 되어 격리가 깨진다. `req.server.uploadsDir` 만 읽는다 (REQ-MSG-006 의 정의 상자).
- **배선을 손으로 조립한 테스트 앱으로만 확인하기** — 실서버에 라우트가 하나도 없어도 나머지 기준이 전부 통과한다. AC-MSG-015 가 실제 `buildServer()` 를 띄워 그 서버를 통해 본다 (§D 9번).
- **라우트 등록 여부를 상태 코드로만 판정하기** — 미등록 라우트도 Fastify 가 `404` 를 낸다. 등록됨과 미등록이 같은 값이라 아무것도 가르지 못한다. 응답 본문이 `Route GET:… not found` 가 아닌지까지 본다 (AC-MSG-015 4번).
- **`SELECT last_insert_rowid()` 로 첨부 id 받기** — strict 모드에서 컴파일되지 않는다. `run().lastInsertRowid` 를 쓴다 (§D 5번).
- **`gateway.ts` 를 import 하기** — 모듈 순환 참조가 생긴다. 게이트웨이는 `req.server.gateway` 로만 접근하고, `displayName` 중복은 의도된 것이다 (`spec.md` §6).
- **`publish`/`deliver` 호출을 눈으로만 확인하기** — 두 호출을 아예 빼도 나머지 기준이 전부 통과한다. AC-MSG-009 의 스파이 단언이 이것을 막는다.
- **multipart 를 라우트 뒤에 등록하기** — `req.parts()` 가 없어 전송이 전부 실패한다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-MSG-014 의 전이 증거를 만들 수 없다.
- **테스트에서 실제 `data/` 쓰기** — 모든 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다. `config.dataDir` 은 게터라 import 시점에 굳지 않는다 (`SPEC-ROOM-001` `plan.md` §D 8번).
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡히고, 스테이지된 변경은 `--cached` 없이는 보이지 않는다. `spec_base_sha` 를 기준으로 비교한다 (M1 단계 0).
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 가 종료 코드 `0` 으로 SHA 를 내는 것을 먼저 확인한다 (AC-MSG-013).
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않으므로, 이름 붙은 테스트를 하나도 쓰지 않아도 `npm test -w server` 는 종료 코드 `0` 이다. 판정은 `npm test -w server -- --reporter=verbose` 출력의 `✓ test/messages.test.ts > messages > <테스트 이름>` 줄을 직접 보고 한다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다 (`SPEC-BOT-001` 3차 감사 D1).
- **권한 릴레이 미리 만들기** — `permissions.ts` 스텁을 "어차피 다음 Task 에서 필요하니까" 만들지 않는다. AC-MSG-013 이 기계적으로 잡는다.

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md`, `spec-v2.md` — **이 SPEC 의 유일한 규범 근거**(읽기 전용). 같은 디렉터리의 `plan.md`·`spec.md` 는 폐기된 v1 이며 참조하지 않는다.
- `spec.md` — 이 SPEC 의 GEARS 요구사항(REQ-MSG-001..014)과 범위 경계
- `acceptance.md` — AC-MSG-001..014
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 9 — 원본 (읽기 전용). Task 10(권한 릴레이)은 이 SPEC 범위 밖이다
- `.moai/specs/SPEC-CORE-001/` — 스키마·`config` 소유
- `.moai/specs/SPEC-AUTH-001/` — `requireAuth`·`req.user` 소유
- `.moai/specs/SPEC-ROOM-001/` — `rooms.status` 소유. `plan.md` §D 7번이 실패 코드 계약의 짝이다
- `.moai/specs/SPEC-BOT-001/` — `bot_tokens`·`sha256Hex` 소유. `plan.md` §D 5번이 이 문서 §D 1번의 선례다
- `.moai/specs/SPEC-MENTION-001/`, `.moai/specs/SPEC-SSE-001/`, `.moai/specs/SPEC-GATEWAY-001/` — 카드 `t3` 의 형제 SPEC. 이 SPEC 이 셋 다 소비한다
