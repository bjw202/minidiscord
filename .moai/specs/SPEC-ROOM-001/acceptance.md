# SPEC-ROOM-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 테스트 이름은 `plan-v2.md` Task 4 의 원본 테스트 본문을 따른다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 디렉터리의 `plan.md` 와 `spec.md` 는 초기 커밋(`edd982e`)에 담긴 **폐기된 v1** 이며 이 SPEC 의 참조 대상이 아니다 — 파일 이름이 비슷해 혼동하기 쉬우므로 여기 못 박아 둔다.

이 SPEC 의 모든 테스트는 SPEC-AUTH-001 이 만든 `requireAuth` 와 로그인 흐름 위에서 돈다. `build()` 헬퍼가 가입·로그인해 세션 쿠키를 얻고, 그 쿠키를 모든 요청에 실어 보낸다.

두 가지를 미리 못 박아 둔다.

- **`{ app, cookie }` 를 돌려주는 `build()` 헬퍼는 이 SPEC 이 만든다.** `server/test/rooms-bots.test.ts` 안에 두고, `SPEC-BOT-001` 의 모든 시나리오가 같은 헬퍼를 이어 쓴다. `SPEC-AUTH-001` 이 `auth.test.ts` 에 둔 `build()` 는 `app` 하나만 돌려주는 별개의 헬퍼이며 내보내지 않는다.
- **`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다.** M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. `HEAD` 기준 비교는 **이미 커밋된 변경을 볼 수 없어** 금지 요구사항을 거짓 통과시킨다 — 이 SPEC 은 마일스톤이 둘이라 M1 커밋 뒤에 M2 에서 검사가 돌므로, 실제로 무력해지는 배치였다.
- **이름 붙은 기존 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다 — 요약 줄로도 종료 코드로도 두 경우를 가를 수 없다. 그래서 그런 기준의 명령은 `npm test -w server -- --reporter=verbose` 이고, 관측 대상은 `✓ test/<파일> > <describe 이름> > <테스트 이름>` 줄이 출력에 실제로 나타나는가 하나다. 그 줄이 없으면 **실패**다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다 (v0.4.0 교정 — 3차 보고서 D1).
- **기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 실패다.** 범위 경계 명령은 `git rev-parse --verify` 로 기준 SHA 가 실제 커밋으로 풀리는지 먼저 확인하고, 그 확인이 **종료 코드 `0`** 으로 끝난 뒤에만 `git diff` 로 넘어간다. 단계 0 을 건너뛴 실행이 빈 표준 출력만으로 통과하는 길을 남기지 않기 위해서다 (v0.3.0 교정 — R1).

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-ROOM-001 | REQ-ROOM-001, 002, 003 | 아래 AC-ROOM-001 본문 참조 | 출력에 `✓ test/rooms-bots.test.ts > rooms > creates and lists rooms` 줄이 나타남 + 생성 응답의 키가 `Room` 다섯 개와 일치 |
| AC-ROOM-002 | REQ-ROOM-004 | 아래 AC-ROOM-002 본문 참조 | 상태 코드 `400` |
| AC-ROOM-003 | REQ-ROOM-005 | 아래 AC-ROOM-003 본문 참조 | 방이 `archived` 목록으로 이동 + `archived_at` 채워짐 + 두 UPDATE 가 한 트랜잭션 |
| AC-ROOM-004 | REQ-ROOM-006 | 아래 AC-ROOM-004 본문 참조 | 이미 보관된 방 `409`, 없는 방 `404`, 두 오류 본문이 서로 다름 |
| AC-ROOM-005 | REQ-ROOM-007 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/rooms-bots.test.ts > rooms > calls onArchive hook when provided` 줄이 나타남 |
| AC-ROOM-006 | REQ-ROOM-008, 009, 011 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/rooms-bots.test.ts > bots > registers and lists bots` 줄이 나타남 |
| AC-ROOM-007 | REQ-ROOM-010 | 아래 AC-ROOM-007 본문 참조 | 중복 `409`, 공백 이름 `400` |
| AC-ROOM-008 | REQ-ROOM-001, REQ-ROOM-008 | 아래 AC-ROOM-008 본문 참조 | 다섯 경로 전부 `401` |
| AC-ROOM-009 | REQ-ROOM-012, REQ-ROOM-013 | 아래 AC-ROOM-009 본문 참조 | `server/src` 에 여섯 파일만, 기준 SHA 확인이 종료 코드 `0`, `spec_base_sha` 대비 `db.ts` diff 가 종료 코드 `0` + 빈 출력 |
| AC-ROOM-010 | RED→GREEN 전이 | 아래 AC-ROOM-010 본문 참조 | 네 전이가 순서대로 관측됨 |
| AC-ROOM-011 | REQ-ROOM-014 | 아래 AC-ROOM-011 본문 참조 | `buildServer()` 서버에서 `GET /api/rooms` 가 쿠키 없이 `401`, 쿠키를 실으면 `200` |

---

## Given-When-Then 시나리오

### AC-ROOM-001 — 방 생성과 목록

**Given** 로그인한 사용자가 있다.
**When** `rooms-bots.test.ts` 의 `creates and lists rooms` 에 아래 한 줄을 더하고 `npm test -w server -- --reporter=verbose` 를 실행한다.

```ts
expect(Object.keys(create.json()).sort()).toEqual(['archived_at', 'created_at', 'id', 'name', 'status'])
```

**Then** 출력에 `✓ test/rooms-bots.test.ts > rooms > creates and lists rooms` 줄이 나타난다 — `plan.md` §F M1 1단계가 이 테스트를 `describe('rooms', …)` 안에 두므로 가운데 칸은 `rooms` 다. 판정은 출력에 `✓ test/rooms-bots.test.ts > ` 로 시작해 ` > creates and lists rooms` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 줄이 있을 때 관측되는 것은 생성 응답이 `201` 과 `status: 'active'` 이고, 목록의 `active` 길이가 `1`, `archived` 길이가 `0` 이며, **생성 응답의 키 집합이 `Room` 다섯 개와 정확히 일치한다**는 것이다.

마지막 단언이 있어야 하는 이유: REQ-ROOM-003 이 요구하는 것은 상태 코드와 `status` 만이 아니라 생성 응답과 목록 응답의 **모양이 같다는 것**이다. `status` 만 보는 단언은 `archived_at` 이 빠진 응답도 통과시키므로, `plan.md` §D 4번이 해소한 모양 불일치가 조용히 되살아난다.

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
grep -c 'db\.transaction(' server/src/routes-rooms.ts
```

**Then** 첫 명령에서 테스트가 통과한다 — 방이 `active` 에서 사라져 `archived[0]` 이 되고, `archived_at` 이 비어 있지 않으며, 그 방의 활성 토큰 수가 `0` 이다. 둘째 명령의 출력이 `1` 이다 — 보관 핸들러의 두 UPDATE 가 `db.transaction()` 하나로 묶여 있다.

`grep` 패턴에서 점을 `\.` 로 이스케이프한 것은 형식이 아니라 판정에 영향을 준다. 이스케이프하지 않은 `.` 은 아무 문자에나 맞아 `dbXtransaction(` 같은 무관한 문자열까지 세므로, 검사가 통과해도 트랜잭션이 있다는 증거가 되지 못한다.

이 `grep` 이 증명하는 것과 못 하는 것을 갈라 둔다. 증명하는 것은 **`db.transaction()` 호출이 이 파일에 있다**는 사실 하나뿐이다. 두 UPDATE 가 실제로 그 안에 들어 있는지는 구조 검사로 알 수 없고, 그 절반은 `SPEC-BOT-001` 의 AC-BOT-008 이 실행으로 관측한다.

### AC-ROOM-004 — 보관 실패는 "방이 없다"와 "이미 보관됐다"를 구분한다

**Given** 이미 보관된 방 하나와, 존재하지 않는 방 `id` 가 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('archiving distinguishes a missing room (404) from an archived one (409)', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })

  const again = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
  expect(again.statusCode).toBe(409)

  const missing = await app.inject({ method: 'POST', url: '/api/rooms/9999/archive', headers: { cookie } })
  expect(missing.statusCode).toBe(404)

  const notANumber = await app.inject({ method: 'POST', url: '/api/rooms/abc/archive', headers: { cookie } })
  expect(notANumber.statusCode).toBe(404)

  expect(again.json().error).not.toBe(missing.json().error)
})
```

**Then** 테스트가 통과한다 — 이미 보관된 방의 재보관은 `409`, 없는 방은 `404`, 숫자가 아닌 `id` 도 `404`(조회 결과가 없으므로 "방이 없다"와 같은 경우다) 이고, 두 오류 본문의 문구가 서로 다르다.

마지막 단언이 이 기준의 핵심이다. 상태 코드만 갈라 두고 본문을 같게 두면 클라이언트가 코드로는 구분해도 사용자에게 같은 문장을 보여 주게 된다. REQ-ROOM-006 이 요구하는 것은 두 경우가 **끝까지** 구분되는 것이다.

> **원본으로부터의 의도적 이탈.** 원본 `plan-v2.md:733` 은 `if (r.changes === 0) return reply.code(404)` 하나로 두 경우를 합쳤다. 그 형태로는 "방이 없다"와 "보관됐다"를 구분할 수 없고, 같은 상황을 `SPEC-BOT-001` 의 초대 라우트는 `403` 으로 답해 두 라우트의 코드 의미가 어긋났다. 이 SPEC 과 `SPEC-BOT-001` 이 같은 편집에서 함께 바뀌었다. 근거와 판단 경위는 `plan.md` §D 7번에 있다.

### AC-ROOM-005 — `onArchive` 훅 호출

**Given** `registerRoomRoutes(app, { onArchive })` 로 훅이 주입돼 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/rooms-bots.test.ts > rooms > calls onArchive hook when provided` 줄이 나타난다 — `plan.md` §F M1 1단계가 이 테스트를 `describe('rooms', …)` 안에 두므로 가운데 칸은 `rooms` 다. 판정은 출력에 `✓ test/rooms-bots.test.ts > ` 로 시작해 ` > calls onArchive hook when provided` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 테스트는 보관 후 수집 배열이 정확히 `[방 id]` 임을 단언한다 — 한 번만 호출됐다는 증거다.

### AC-ROOM-006 — 봇 등록과 목록

**Given** 로그인한 사용자가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/rooms-bots.test.ts > bots > registers and lists bots` 줄이 나타난다 — `plan.md` §F M2 1단계가 이 테스트를 `describe('bots', …)` 안에 두므로 가운데 칸은 `bots` 다. 판정은 출력에 `✓ test/rooms-bots.test.ts > ` 로 시작해 ` > registers and lists bots` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 테스트는 목록 응답이 정확히 `[{ id, name: '코드리뷰어', description: '리뷰 전문' }]` 임을 단언한다 — 페르소나 필드가 없다는 증거다.

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
**When** 다음 세 명령을 차례로 실행한다.

```bash
ls server/src
git rev-parse --verify "$(cat .moai/specs/SPEC-ROOM-001/.spec-base-sha)^{commit}"
git diff --stat <둘째 명령이 출력한 40자리 SHA> -- server/src/db.ts
```

**둘째 명령이 앞에 있어야 하는 이유.** M1 단계 0 을 건너뛴 실행에서는 `.spec-base-sha` 가 없고, `git diff --stat "$(cat …)"` 는 `$(cat …)` 이 빈 문자열이 되어 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 관측을 "출력이 비어 있다" 하나로 두면 기준점을 기록하지 않은 실행이 그대로 통과한다 — ROOM-B1 이 지적한 "검사가 검사하지 않는" 결함이 자리만 옮긴 꼴이다. `--verify` 확인이 그 경우를 종료 코드로 드러낸다. 셋째 명령에 SHA 를 직접 적는 것은 `$(cat …)` 을 품은 `git diff` 가 워크트리 격리 세션의 가드에 걸려 실행되지 않기 때문이다(이 교정 라운드에서 확인).

**Then** 세 관측이 모두 성립한다.

1. 첫 출력이 정확히 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 항목이다 — `mention.ts`, `routes-messages.ts`, `sse.ts`, `gateway.ts`, `permissions.ts` 중 어느 것도 없다.
2. 둘째 명령이 **종료 코드 `0`** 으로 끝나고 40자리 SHA 한 줄을 출력한다. 종료 코드가 `0` 이 아니거나 `fatal:` 이 나오면 **이 기준은 실패**다.
3. 셋째 명령이 **종료 코드 `0`** 으로 끝나고 **출력이 비어 있다** — `db.ts` 가 이 SPEC 의 진입 시점 이후 한 줄도 바뀌지 않았다. 두 조건이 함께 성립해야 통과다.

기준 커밋을 `HEAD` 가 아니라 `spec_base_sha` 로 잡는 것이 이 검사가 실제로 무언가를 잡는 조건이다. 이 검사는 M2 단계 6 에서 도는데 M1 은 이미 단계 6 에서 커밋을 했으므로, `HEAD` 기준으로 비교하면 M1 에서 컬럼을 더해 커밋한 스키마 변경이 `HEAD` 안에 들어가 **출력이 비어 있게** 된다. 금지 요구사항(REQ-ROOM-013)이 거짓으로 통과하는 것이다.

### AC-ROOM-010 — RED → GREEN 전이 증거

**Given** 각 마일스톤에서 테스트 파일을 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 네 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | `rooms-bots.test.ts` 추가 후 실패, 실패 원인이 `routes-rooms.js` 모듈 부재임이 출력에서 확인됨 |
| 2 | M1 | GREEN | `routes-rooms.ts` 구현 + `buildServer` 등록 후 rooms 테스트 전부 통과 |
| 3 | M2 | RED | `describe('bots', …)` 추가 후 실패, 실패 원인이 `routes-bots.js` 모듈 부재임이 출력에서 확인됨 |
| 4 | M2 | GREEN | `routes-bots.ts` 구현 + 등록 후 전체 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다. RED 판정은 도구가 내는 특정 문구가 아니라 "그 모듈이 없어서 실패했다"는 원인이 출력에서 확인되는가로 한다.

### AC-ROOM-011 — `buildServer` 가 두 라우트 모듈을 실제로 등록한다

이 기준이 없으면 `buildServer` 에 등록 두 줄을 넣지 않고도 나머지 열 개 기준이 전부 통과한다. 다른 기준의 테스트는 모두 자기 인스턴스에 직접 `registerRoomRoutes(app)` 를 부르기 때문이다. 그 경우 실제로 띄운 서버에는 방·봇 라우트가 없어 모든 요청이 `404` 다. REQ-ROOM-014 를 관측하는 유일한 기준이다.

`SPEC-AUTH-001` 의 AC-AUTH-014 가 관측하지 못하고 남긴 절반 — `buildServer` 로 조립한 서버에서 `requireAuth` 가 보호 라우트를 실제로 막는가 — 도 여기서 함께 관측된다. 그 SPEC 시점에는 `buildServer` 에 보호 라우트가 하나도 없어 관측할 대상이 없었고, 이 SPEC 이 방 라우트를 붙이면서 비로소 관측 가능해진다.

**Given** `MINIDISCORD_DATA_DIR` 이 임시 디렉터리를 가리킨다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('buildServer registers room and bot routes behind requireAuth', async () => {
  process.env.MINIDISCORD_DATA_DIR = mkdtempSync(join(tmpdir(), 'md-buildserver-rooms-'))
  const { buildServer } = await import('../src/index.js')
  const app = await buildServer()
  await app.ready()

  const guarded = await app.inject({ method: 'GET', url: '/api/rooms' })
  expect(guarded.statusCode).toBe(401)

  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const cookie = login.headers['set-cookie']![0].split(';')[0]

  const rooms = await app.inject({ method: 'GET', url: '/api/rooms', headers: { cookie } })
  expect(rooms.statusCode).toBe(200)
  const bots = await app.inject({ method: 'GET', url: '/api/bots', headers: { cookie } })
  expect(bots.statusCode).toBe(200)

  await app.close()
})
```

**Then** 테스트가 통과한다. 관측되는 것은 세 가지다 — `registerRoomRoutes` 와 `registerBotRoutes` 가 `buildServer` 안에서 실제로 호출됐고(등록이 없으면 `401` 이 아니라 `404` 가 난다), 두 모듈의 라우트가 `requireAuth` 뒤에 있으며, 로그인 뒤에는 같은 라우트가 `200` 을 낸다.

`401` 단언이 `404` 단언보다 강한 이유를 적어 둔다. 라우트가 등록되지 않았다면 Fastify 는 `404` 를 낸다. 그러므로 쿠키 없이 `401` 이 났다는 것은 **라우트가 존재하고 그 앞에 진입 검사가 걸려 있다**는 두 사실을 한 번에 보인다.

**이 기준이 임시 디렉터리에서 도는 근거 (v0.3.0 교정 — R2).** 첫 줄의 `process.env.MINIDISCORD_DATA_DIR` 대입이 `buildServer()` 에 실제로 반영되는 것은 `server/src/config.ts` 의 `dataDir` 이 **게터**이기 때문이다 — 환경변수를 매 호출마다 다시 읽는 것은 그 게터이지 `buildServer` 가 아니다. `dbPath` 는 `this.dataDir` 에서 파생되므로 같은 시점에 함께 결정된다. 교정 전에는 `dataDir` 이 모듈 로드 시점에 값이 굳는 평범한 속성이었고, `SPEC-BOT-001` 이 `routes-bots.ts` 에 `config.js` import 를 더하는 순간 이 대입이 아무 효과도 내지 못하게 될 예정이었다 — 이 기준은 통과하면서 저장소 안의 진짜 `data/minidiscord.db` 를 열었을 것이다. 그 수정과 경위는 `plan.md` §D 8번에 있다. 게터를 평범한 속성으로 되돌리면 이 기준은 **통과하면서 다른 것을 재기 시작한다.**

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 방 이름 중복 | 허용한다. `rooms.name` 에 `UNIQUE` 가 없다 — 같은 이름의 프로젝트 방을 여러 번 만들 수 있다 | 의도된 동작 |
| 방 이름 앞뒤 공백 | `trim()` 후 저장한다. `'  A  '` 와 `'A'` 는 같은 이름이 된다 | AC-ROOM-001 과 같은 경로 (REQ-ROOM-003) |
| 존재하지 않는 방 `id` 로 보관 | `404` 와 "방을 찾을 수 없다"는 본문. 이미 보관된 방(`409`)과 **구분한다** | AC-ROOM-004 가 두 코드와 두 본문을 모두 단언한다 |
| 이미 보관된 방의 재보관 | `409` 와 "이미 보관된 방"이라는 본문. 대상은 있는데 그 상태에서 할 수 없는 일이므로 상태 충돌이다 | AC-ROOM-004 |
| 숫자가 아닌 방 `id` | 조회 결과가 없어 `404`. "그런 방이 없다"와 같은 경우로 다룬다 | AC-ROOM-004 가 `/api/rooms/abc/archive` 로 직접 확인한다 |
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

- [ ] AC-ROOM-001 부터 AC-ROOM-011 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 파일만 존재
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-ROOM-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함 — 기준 SHA 가 실제 커밋으로 풀림
- [ ] 그 SHA 로 실행한 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이고 출력이 비어 있음 — `db.ts` 가 이 SPEC 에서 한 줄도 변경되지 않음. **빈 출력만으로 통과 처리하지 않는다** — 기준 SHA 가 없을 때도 표준 출력은 비어 있다
- [ ] `buildServer` 가 `registerRoomRoutes(app)` 와 `registerBotRoutes(app)` 를 등록함 (AC-ROOM-011)
- [ ] `server/src/routes-bots.ts` 에 초대 라우트(`/invites`)와 `sha256Hex` 가 없음 — SPEC-BOT-001 이 같은 파일에 뒤이어 추가한다
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 2개 (`feat: room API with archive and onArchive hook`, `feat: bot registry API`)
