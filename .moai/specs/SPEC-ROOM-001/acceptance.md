# SPEC-ROOM-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 테스트 이름은 `plan-v2.md` Task 4 의 원본 테스트 본문을 따른다.

이 SPEC 의 모든 테스트는 SPEC-AUTH-001 이 만든 `requireAuth` 와 로그인 흐름 위에서 돈다. `build()` 헬퍼가 가입·로그인해 세션 쿠키를 얻고, 그 쿠키를 모든 요청에 실어 보낸다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-ROOM-001 | REQ-ROOM-001, 002, 003 | `npm test -w server` | `rooms-bots.test.ts` 의 `creates and lists rooms` 통과 |
| AC-ROOM-002 | REQ-ROOM-004 | 아래 AC-ROOM-002 본문 참조 | 상태 코드 `400` |
| AC-ROOM-003 | REQ-ROOM-005 | 아래 AC-ROOM-003 본문 참조 | 방이 `archived` 목록으로 이동 + `archived_at` 채워짐 + 두 UPDATE 가 한 트랜잭션 |
| AC-ROOM-004 | REQ-ROOM-006 | 아래 AC-ROOM-004 본문 참조 | 두 번째 보관 요청이 `404` |
| AC-ROOM-005 | REQ-ROOM-007 | `npm test -w server` | `rooms-bots.test.ts` 의 `calls onArchive hook when provided` 통과 |
| AC-ROOM-006 | REQ-ROOM-008, 009, 011 | `npm test -w server` | `rooms-bots.test.ts` 의 `registers and lists bots` 통과 |
| AC-ROOM-007 | REQ-ROOM-010 | 아래 AC-ROOM-007 본문 참조 | 중복 `409`, 공백 이름 `400` |
| AC-ROOM-008 | REQ-ROOM-001, REQ-ROOM-008 | 아래 AC-ROOM-008 본문 참조 | 다섯 경로 전부 `401` |
| AC-ROOM-009 | REQ-ROOM-012, REQ-ROOM-013 | 아래 AC-ROOM-009 본문 참조 | `server/src` 에 여섯 파일만, `db.ts` 변경 없음 |
| AC-ROOM-010 | RED→GREEN 전이 | 아래 AC-ROOM-010 본문 참조 | 네 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-ROOM-001 — 방 생성과 목록

**Given** 로그인한 사용자가 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `rooms-bots.test.ts` 의 `creates and lists rooms` 가 통과한다. 생성 응답이 `201` 과 `status: 'active'` 이고, 목록의 `active` 길이가 `1`, `archived` 길이가 `0` 이다.

### AC-ROOM-002 — 빈 방 이름 거절

**Given** 로그인한 사용자가 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('rejects a blank room name', async () => {
  const { app, cookie } = await build()
  const res = await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: '   ' } })
  expect(res.statusCode).toBe(400)
})
```

**Then** 테스트가 통과한다 — 상태 코드가 `400` 이다.

### AC-ROOM-003 — 보관이 목록을 옮기고, 두 UPDATE 가 한 트랜잭션이다

REQ-ROOM-005 는 두 가지를 요구한다. 하나는 **방의 이동**(관측 가능), 다른 하나는 **토큰 철회가 같은 트랜잭션에서 일어난다는 것**(이 SPEC 시점에는 발급 경로가 없어 행 수로 관측할 수 없다). 그래서 관측 가능한 절반만 여기서 판정하고, 나머지 절반은 구조로 판정한다.

> **토큰 철회의 실제 동작 검증은 SPEC-BOT-001 이 맡는다.** 활성 토큰을 만들려면 초대 API 가 필요한데 그 API 는 SPEC-BOT-001 의 산출물이다. SPEC-BOT-001 의 수용 기준이 "초대된 방을 보관하면 활성 토큰 수가 1 에서 0 이 된다"를 실행으로 확인한다. 이 SPEC 시점에 그 기준을 여기에 두면 통과할 수 없는 기준이 되므로 두지 않는다.

**Given** 활성 방 하나가 있고, 그 방에는 아직 어떤 봇 토큰도 없다(이 SPEC 은 발급 경로를 만들지 않는다).
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고, 아래 두 명령을 차례로 실행한다.

```ts
it('archiving moves the room and stamps archived_at', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const res = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
  expect(res.statusCode).toBe(200)
  const list = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
  expect(list.json().active).toHaveLength(0)
  expect(list.json().archived[0].id).toBe(room.id)
  expect(list.json().archived[0].archived_at).toBeTruthy()
  const after = db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room.id) as { c: number }
  expect(after.c).toBe(0)
})
```

```bash
npm test -w server
grep -c "db.transaction(" server/src/routes-rooms.ts
```

**Then** 첫 명령에서 테스트가 통과한다 — 방이 `active` 에서 사라져 `archived[0]` 이 되고, `archived_at` 이 비어 있지 않으며, 그 방의 활성 토큰 수가 `0` 이다. 둘째 명령의 출력이 `1` 이다 — 보관 핸들러의 두 UPDATE 가 `db.transaction()` 하나로 묶여 있다.

### AC-ROOM-004 — 이미 보관된 방의 재보관 거절

**Given** 이미 보관된 방이 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('re-archiving returns 404', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
  const again = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
  expect(again.statusCode).toBe(404)
})
```

**Then** 테스트가 통과한다 — 두 번째 보관 요청의 상태 코드가 `404` 다.

### AC-ROOM-005 — `onArchive` 훅 호출

**Given** `registerRoomRoutes(app, { onArchive })` 로 훅이 주입돼 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `rooms-bots.test.ts` 의 `calls onArchive hook when provided` 가 통과한다. 보관 후 수집 배열이 정확히 `[방 id]` 다 — 한 번만 호출됐다는 증거다.

### AC-ROOM-006 — 봇 등록과 목록

**Given** 로그인한 사용자가 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `rooms-bots.test.ts` 의 `registers and lists bots` 가 통과한다. 목록 응답이 정확히 `[{ id, name: '코드리뷰어', description: '리뷰 전문' }]` 이다 — 페르소나 필드가 없다는 증거다.

### AC-ROOM-007 — 중복·공백 봇 이름 거절

**Given** 봇 `pm` 이 이미 등록돼 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('rejects duplicate and blank bot names', async () => {
  const { app, cookie } = await build()
  await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })
  const dup = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })
  expect(dup.statusCode).toBe(409)
  const blank = await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: '  ' } })
  expect(blank.statusCode).toBe(400)
})
```

**Then** 테스트가 통과한다 — 중복이 `409`, 공백 이름이 `400` 이다.

### AC-ROOM-008 — 이 SPEC 의 모든 라우트가 인증을 요구

이 기준이 확인하는 것은 `requireAuth` 의 구현(그것은 SPEC-AUTH-001 소관)이 아니라, **이 SPEC 이 만든 다섯 경로가 그것을 실제로 달았는가**다.

**Given** 로그인하지 않은 클라이언트가 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('every room and bot route requires a session', async () => {
  const { app } = await build()
  const calls: Array<[string, string]> = [
    ['GET', '/api/rooms'],
    ['POST', '/api/rooms'],
    ['POST', '/api/rooms/1/archive'],
    ['GET', '/api/bots'],
    ['POST', '/api/bots'],
  ]
  for (const [method, url] of calls) {
    const res = await app.inject({ method: method as any, url, payload: {} })
    expect(res.statusCode, `${method} ${url}`).toBe(401)
  }
})
```

**Then** 테스트가 통과한다 — 다섯 경로 전부 `401` 이다. 초대 경로 세 개는 이 SPEC 에 존재하지 않으므로 목록에 넣지 않는다. SPEC-BOT-001 이 자기 경로를 같은 방식으로 확인한다.

### AC-ROOM-009 — 범위 경계와 스키마 불변

**Given** 이 SPEC 의 구현이 끝났다.
**When** 다음을 실행한다.

```bash
ls server/src
git diff --stat HEAD -- server/src/db.ts
```

**Then** 첫 출력이 정확히 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 항목이다 — `mention.ts`, `routes-messages.ts`, `sse.ts`, `gateway.ts`, `permissions.ts` 중 어느 것도 없다. 둘째 출력이 비어 있다 — `db.ts` 가 한 줄도 바뀌지 않았다.

### AC-ROOM-010 — RED → GREEN 전이 증거

**Given** 각 마일스톤에서 테스트 파일을 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 네 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | `rooms-bots.test.ts` 추가 후 실패, 메시지에 `Cannot find module '../src/routes-rooms.js'` 포함 |
| 2 | M1 | GREEN | `routes-rooms.ts` 구현 + `buildServer` 등록 후 rooms 테스트 전부 통과 |
| 3 | M2 | RED | `describe('bots', …)` 추가 후 실패, 메시지에 `routes-bots.js` 모듈 없음 포함 |
| 4 | M2 | GREEN | `routes-bots.ts` 구현 + 등록 후 전체 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 방 이름 중복 | 허용한다. `rooms.name` 에 `UNIQUE` 가 없다 — 같은 이름의 프로젝트 방을 여러 번 만들 수 있다 | 의도된 동작 |
| 방 이름 앞뒤 공백 | `trim()` 후 저장한다. `'  A  '` 와 `'A'` 는 같은 이름이 된다 | AC-ROOM-001 과 같은 경로 (REQ-ROOM-003) |
| 존재하지 않는 방 `id` 로 보관 | `404`. 이미 보관된 방과 같은 응답이다 — 두 경우를 구분하지 않는다 | AC-ROOM-004 와 같은 경로 |
| 숫자가 아닌 방 `id` | `Number(...)` 가 `NaN` 이 되어 UPDATE 가 0행 → `404` | AC-ROOM-004 와 같은 경로 |
| 보관 시 활성 토큰이 하나도 없음 | 정상. 토큰 철회 UPDATE 가 0행이어도 보관은 성공한다 | AC-ROOM-003 이 바로 이 상황이다 |
| `bots.name` 의 `UNIQUE` 위반이 아닌 다른 DB 오류 | `try/catch` 가 전부 `409` 로 바꾼다 | 수용(원본 그대로). 이 테이블에 다른 제약이 없어 실제 오분류 경로가 없다 |
| `description` 이 없는 봇 등록 | 빈 문자열로 저장한다. `null` 이 아니다 | AC-ROOM-006 (REQ-ROOM-009) |
| 봇 이름 오름차순의 한글 정렬 | SQLite 기본 이진 정렬을 따른다. 사전 순이 아닐 수 있다 | 수용. 원본 `ORDER BY name` 그대로. 정렬 규칙 변경은 범위 밖 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (선행 SPEC 분 + 이 SPEC 추가분) | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), 파일당 단일 책임 (`routes-rooms.ts` 방만 / `routes-bots.ts` 봇 등록만) | 리뷰 |
| Unified | TypeScript strict, NodeNext, 상대 import 에 `.js` 확장자 | `npm run typecheck -w server` |
| Secured | 모든 도메인 라우트가 `requireAuth` preHandler 를 단다. 보관은 원자적이라 "보관됐는데 토큰은 살아 있는" 중간 상태를 남기지 않는다 | AC-ROOM-008, AC-ROOM-003 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-ROOM-001 부터 AC-ROOM-010 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 파일만 존재
- [ ] `server/src/db.ts` 가 이 SPEC 에서 한 줄도 변경되지 않음
- [ ] `server/src/routes-bots.ts` 에 초대 라우트(`/invites`)와 `sha256Hex` 가 없음 — SPEC-BOT-001 이 같은 파일에 뒤이어 추가한다
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 2개 (`feat: room API with archive and onArchive hook`, `feat: bot registry API`)
