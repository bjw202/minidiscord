# SPEC-BOT-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 테스트 이름은 `plan-v2.md` Task 5 의 원본 테스트 본문을 따른다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 디렉터리의 `plan.md` 와 `spec.md` 는 초기 커밋(`edd982e`)에 담긴 **폐기된 v1** 이며 이 SPEC 의 참조 대상이 아니다 — 파일 이름이 비슷해 혼동하기 쉬우므로 여기 못 박아 둔다.

이 SPEC은 `SPEC-AUTH-001` 과 `SPEC-ROOM-001` 이 먼저 끝난 상태를 전제한다.

아래 모든 시나리오의 `build()` 헬퍼는 `SPEC-ROOM-001` 이 `server/test/rooms-bots.test.ts` 에 만든 `{ app, cookie }` 헬퍼이며, 그 안에서 `SPEC-AUTH-001` 의 `registerAuthRoutes` / `requireAuth` 와 로그인 흐름을 쓴다. `SPEC-AUTH-001` 이 `auth.test.ts` 에 둔 동명의 헬퍼는 `app` 하나만 돌려주는 **다른 헬퍼**이고 내보내지 않는다 — 아래 시나리오들이 하는 `const { app, cookie } = await build()` 는 그 헬퍼로는 성립하지 않는다. 방·봇 생성은 `SPEC-ROOM-001` 의 라우트를 쓴다.

`spec_base_sha` 는 이 SPEC의 run 단계 진입 시점 커밋이다. M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. `HEAD` 기준 비교는 이미 커밋된 변경을 볼 수 없어 금지 요구사항을 거짓 통과시킨다.

**이름 붙은 기존 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다 — 요약 줄로도 종료 코드로도 두 경우를 가를 수 없다. 그래서 그런 기준의 명령은 `npm test -w server -- --reporter=verbose` 이고, 관측 대상은 `✓ test/<파일> > <describe 이름> > <테스트 이름>` 줄이 출력에 실제로 나타나는가 하나다. 그 줄이 없으면 **실패**다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다 (v0.4.0 교정 — 3차 보고서 D1).

기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다. 범위 경계 명령은 `git rev-parse --verify` 로 기준 SHA 가 실제 커밋으로 풀리는지 먼저 확인하고, 그 확인이 **종료 코드 `0`** 으로 끝난 뒤에만 `git diff` 로 넘어간다 (v0.3.0 교정 — R1).

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-BOT-001 | REQ-BOT-001 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/rooms-bots.test.ts > invites > invites a bot and returns one-time token + command` 줄이 나타남 |
| AC-BOT-002 | REQ-BOT-005 | 아래 AC-BOT-002 본문 참조 | `command` 가 네 조각을 모두 포함하고 포트가 `config.port` |
| AC-BOT-003 | REQ-BOT-002 | 아래 AC-BOT-003 본문 참조 | 목록 응답의 키가 정확히 세 개, 응답 어디에도 발급 토큰 문자열이 없음 |
| AC-BOT-004 | REQ-BOT-003 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/rooms-bots.test.ts > invites > re-inviting same bot revokes old token and issues new one` 줄이 나타남 |
| AC-BOT-005 | REQ-BOT-004 | 아래 AC-BOT-005 본문 참조 | 없는 방 `404`, 보관된 방 `409`, 없는 봇 `404`, 두 `404` 의 본문이 서로 다름 |
| AC-BOT-006 | REQ-BOT-006 | 아래 AC-BOT-006 본문 참조 | `typeof online === 'boolean'` 이고 값이 `false` |
| AC-BOT-007 | REQ-BOT-007 | 아래 AC-BOT-007 본문 참조 | `DELETE` 두 번 모두 `200`, 활성 토큰 수 `0` |
| AC-BOT-008 | REQ-BOT-001 (교차 검증: `SPEC-ROOM-001` 의 "방 보관 시 활성 토큰 일괄 철회" 요구사항) | 아래 AC-BOT-008 본문 참조 | 보관 전 활성 토큰 `1`, 보관 후 `0` |
| AC-BOT-009 | REQ-BOT-008, REQ-BOT-009 | 아래 AC-BOT-009 본문 참조 | `server/src` 에 여섯 파일만, 기준 SHA 확인이 종료 코드 `0`, `db.ts` diff 가 종료 코드 `0` + 빈 출력, 변경 파일 목록이 `routes-bots.ts` 한 줄 |
| AC-BOT-010 | RED→GREEN 전이 | 아래 AC-BOT-010 본문 참조 | 네 전이가 순서대로 관측됨 |
| AC-BOT-011 | REQ-BOT-001 (저장 형식) | 아래 AC-BOT-011 본문 참조 | `token_hash` 가 발급 토큰의 `sha256Hex` 값과 정확히 일치 |

---

## Given-When-Then 시나리오

### AC-BOT-001 — 초대가 1회용 토큰을 발급

**Given** 활성 방과 등록된 봇이 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/rooms-bots.test.ts > invites > invites a bot and returns one-time token + command` 줄이 나타난다 — `plan.md` §F M1 1단계가 이 테스트를 `describe('invites', …)` 안에 두므로 가운데 칸은 `invites` 다. 판정은 출력에 `✓ test/rooms-bots.test.ts > ` 로 시작해 ` > invites a bot and returns one-time token + command` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 테스트는 응답 상태 코드가 `201` 이고, `token` 이 `/^[0-9a-f]{64}$/` 에 맞으며, `command` 가 `--dangerously-load-development-channels` 와 그 토큰 값을 모두 포함함을 단언한다.

### AC-BOT-002 — 실행 명령 안내의 구성 요소와 포트

**Given** 초대가 발급됐고 서버 설정 포트가 `config.port` 다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('command carries env vars, the dev flag and the configured port', async () => {
  const { config } = await import('../src/config.js')
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()
  const body = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })).json()
  expect(body.command).toContain(`export MINIDISCORD_TOKEN=${body.token}`)
  expect(body.command).toContain(`export MINIDISCORD_SERVER=ws://127.0.0.1:${config.port}/bot`)
  expect(body.command).toContain('--dangerously-load-development-channels')
  expect(body.command).toContain('claude mcp add --scope user minidiscord-channel')
})
```

**Then** 테스트가 통과한다 — 네 조각이 모두 들어 있고, 포트가 하드코딩된 `3000` 이 아니라 `config.port` 에서 온다. 이 단언이 `plan.md` §D 2번의 회귀 방지선이다.

### AC-BOT-003 — 평문 토큰이 다시 노출되지 않음

**Given** 초대가 발급돼 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('never exposes the issued token again', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()
  const body = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })).json()

  const list = await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie } })
  expect(Object.keys(list.json()[0]).sort()).toEqual(['bot_id', 'bot_name', 'online'])
  expect(list.body).not.toContain(body.token)
})
```

**Then** 테스트가 통과한다. 관측되는 것은 두 가지다 — 목록 응답의 키가 정확히 `bot_id`·`bot_name`·`online` 세 개라 `token` 도 `token_hash` 도 없고, **직전에 발급된 평문 토큰 문자열이 목록 응답 본문 어디에도 없다**.

`rooms-bots.test.ts` 의 원본 테스트 `lists invites without token` 도 함께 통과한다.

> **v0.2.0 교정 기록.** 이전 판은 소스에 `grep -c "SELECT .*token[^_]"` 를 걸고 `0` 을 기대했다. 그 검사는 두 가지가 잘못돼 있었다. 첫째, **통과할 수 없다** — 모든 초대 쿼리가 `FROM bot_tokens` 를 읽는데 `bot_tokens` 의 `token` 뒤에 오는 `s` 가 `[^_]` 에 맞으므로, `plan.md` §D 1번이 지시하는 SQL 을 그대로 쓰면 `1` 이 나온다(감사자가 명령으로 재현했다). 둘째, **주장과 다른 것을 잰다** — 그것은 토큰 노출이 아니라 소스의 줄바꿈 위치를 재는 검사여서, 구현자가 `SELECT` 뒤에 개행을 하나 넣으면 보안은 그대로인 채 통과한다. 실행 단언으로 바꾼 이유다. 저장된 값이 해시뿐이라는 나머지 절반은 AC-BOT-011 이 관측하며, 두 기준이 함께 REQ-BOT-002 를 덮는다.

### AC-BOT-004 — 재초대 시 활성 토큰은 정확히 하나

**Given** 같은 (방, 봇) 조합에 초대가 두 번 이루어졌다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/rooms-bots.test.ts > invites > re-inviting same bot revokes old token and issues new one` 줄이 나타난다 — `plan.md` §F M1 1단계가 이 테스트를 `describe('invites', …)` 안에 두므로 가운데 칸은 `invites` 다. 판정은 출력에 `✓ test/rooms-bots.test.ts > ` 로 시작해 ` > re-inviting same bot revokes old token and issues new one` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 테스트는 두 토큰 값이 서로 다르고 `SELECT COUNT(*) FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL` 이 `1` 임을 단언한다.

### AC-BOT-005 — 초대 실패는 세 경우를 구분한다

**Given** 보관된 방 하나, 존재하지 않는 방 `id`, 존재하지 않는 `bot_id` 가 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('invite failures distinguish missing room, archived room and missing bot', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()

  const missingRoom = await app.inject({ method: 'POST', url: '/api/rooms/9999/invites', headers: { cookie }, payload: { bot_id: bot.id } })
  expect(missingRoom.statusCode).toBe(404)

  const missingBot = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: 9999 } })
  expect(missingBot.statusCode).toBe(404)

  expect(missingRoom.json().error).not.toBe(missingBot.json().error)

  await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
  const archived = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
  expect(archived.statusCode).toBe(409)

  const c = db.prepare('SELECT COUNT(*) c FROM bot_tokens').get() as { c: number }
  expect(c.c).toBe(0)
})
```

**Then** 테스트가 통과한다 — 없는 방은 `404`, 없는 봇도 `404` 지만 **두 오류 본문의 문구가 서로 다르고**, 보관된 방은 `409` 이며, 세 실패 어느 것도 `bot_tokens` 에 행을 남기지 않는다.

두 `404` 의 본문을 대조하는 단언이 이 기준의 핵심이다. 같은 코드를 두 주어에 쓰는 것은 본문이 다를 때만 성립한다 — 본문까지 같으면 클라이언트는 "무엇을" 못 찾았는지 알 수 없다.

> **원본으로부터의 의도적 이탈.** 원본 `plan-v2.md:886` 은 `if (!room) return reply.code(403).send({ error: '활성 방이 아닙니다' })` 로 없는 방과 보관된 방을 `403` 하나로 합쳤다. 그 형태로는 두 경우를 구분할 수 없고, `403`(인증됐으나 권한 없음)이 가리킬 권한 차원이 이 시스템에는 없다 — 방별 접근 권한은 세 SPEC 이 모두 YAGNI 로 배제했다. 원본 테스트 이름 `invite to archived room returns 403` 도 새 계약에 맞춰 바뀐다. `SPEC-ROOM-001` 의 보관 실패와 **같은 편집에서 함께** 고쳤고, 경위는 양쪽 `plan.md` (여기 §D 5번, `SPEC-ROOM-001` §D 7번)에 기록했다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 주석의 "`403` 이 가리킬 권한 차원이 이 시스템에는 없다"는 근거는 사라졌다 — `SPEC-ROOMAUTHZ-001` 이 권한 차원을 만들었다. 그 SPEC 도 비멤버에게 `403` 대신 `404` 를 쓰므로(REQ-ROOMAUTHZ-013) 이 기준의 404/409 구분 계약은 그대로 유효하다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

### AC-BOT-006 — 초대 목록의 `online` 은 불리언

**Given** 방에 초대가 하나 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('online is a boolean false, not the integer 0', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()
  await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
  const list = (await app.inject({ method: 'GET', url: `/api/rooms/${room.id}/invites`, headers: { cookie } })).json()
  expect(typeof list[0].online).toBe('boolean')
  expect(list[0].online).toBe(false)
})
```

**Then** 테스트가 통과한다. SQLite 의 `0 AS online` 을 그대로 흘려보내면 `typeof` 가 `'number'` 가 되어 실패한다 — `plan.md` §D 1번이 잡으려는 불일치다.

### AC-BOT-007 — 초대 철회는 멱등

**Given** 초대가 하나 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('revoking an invite is idempotent', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()
  await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
  const first = await app.inject({ method: 'DELETE', url: `/api/rooms/${room.id}/invites/${bot.id}`, headers: { cookie } })
  const second = await app.inject({ method: 'DELETE', url: `/api/rooms/${room.id}/invites/${bot.id}`, headers: { cookie } })
  expect(first.statusCode).toBe(200)
  expect(second.statusCode).toBe(200)
  const c = db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room.id) as { c: number }
  expect(c.c).toBe(0)
})
```

**Then** 테스트가 통과한다 — 두 번 모두 `200` 이고 활성 토큰이 `0` 이다.

### AC-BOT-008 — 교차 SPEC 검증: 방 보관이 그 방의 활성 토큰을 일괄 철회

> **이 기준은 `SPEC-ROOM-001` 의 요구사항을 검증한다.** 해당 요구사항은 "`POST /api/rooms/:id/archive` 가 활성 방에 대해 호출되면 서버는 한 트랜잭션 안에서 방 상태를 `archived` 로 바꾸고 그 방의 모든 활성 `bot_tokens` 의 `revoked_at` 을 채운다"는 내용이다(`SPEC-ROOM-001 REQ-ROOM-005`).
>
> 그 요구사항의 **토큰 철회 절반은 초대가 존재해야만 관측할 수 있고**, 초대를 만드는 것은 이 SPEC이다. 그래서 검증을 여기에 둔다. 구현 책임은 `SPEC-ROOM-001` 에 있으므로, 이 기준이 실패하면 고칠 곳은 `routes-rooms.ts` 의 보관 트랜잭션이지 `routes-bots.ts` 가 아니다.

**Given** 활성 방 하나와 등록된 봇 하나가 있다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('archiving a room revokes that room bot tokens (verifies SPEC-ROOM-001 archive contract)', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()
  const invite = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })
  expect(invite.statusCode).toBe(201)
  const before = db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room.id) as { c: number }
  expect(before.c).toBe(1)
  const archived = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/archive`, headers: { cookie } })
  expect(archived.statusCode).toBe(200)
  const after = db.prepare('SELECT COUNT(*) c FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room.id) as { c: number }
  expect(after.c).toBe(0)
})
```

**Then** 테스트가 통과한다 — 방 생성 → 봇 등록 → 초대 → 활성 토큰 `1` → 보관 → 활성 토큰 `0` 이 한 흐름으로 관측된다.

### AC-BOT-009 — 범위 경계와 스키마 불변

**Given** 이 SPEC의 구현이 끝났다.
**When** 다음 네 명령을 차례로 실행한다.

```bash
ls server/src
git rev-parse --verify "$(cat .moai/specs/SPEC-BOT-001/.spec-base-sha)^{commit}"
git diff --stat <둘째 명령이 출력한 40자리 SHA> -- server/src/db.ts
git diff --name-only <같은 SHA> -- server/src
```

**둘째 명령이 앞에 있어야 하는 이유.** M1 단계 0 을 건너뛴 실행에서는 `.spec-base-sha` 가 없고, `git diff … "$(cat …)"` 는 `$(cat …)` 이 빈 문자열이 되어 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 그러면 셋째 명령의 "비어 있음"은 성립해 버리고, 넷째 명령의 "정확히 한 줄"은 성립하지 않아 실패로 나타난다 — 즉 셋째 관측만 조용히 무력해진다. BOT-B2 가 지적한 "관문이 한 번도 무언가를 검사한 적이 없었다"와 같은 종류의 결함이므로, 기준 SHA 의 존재 자체를 관측 대상으로 올린다. 셋째·넷째 명령에 SHA 를 직접 적는 것은 `$(cat …)` 을 품은 `git diff` 가 워크트리 격리 세션의 가드에 걸려 실행되지 않기 때문이다(이 교정 라운드에서 확인).

**Then** 네 관측이 모두 성립한다.

1. 정확히 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 항목 — `mention.ts`, `routes-messages.ts`, `sse.ts`, `gateway.ts`, `permissions.ts` 중 어느 것도 없다.
2. 둘째 명령이 **종료 코드 `0`** 으로 끝나고 40자리 SHA 한 줄을 출력한다. 종료 코드가 `0` 이 아니거나 `fatal:` 이 나오면 **이 기준은 실패**다. 셋째·넷째 명령으로 넘어가지 않는다.
3. 셋째 명령이 **종료 코드 `0`** 으로 끝나고 **출력이 비어 있다** — `db.ts` 가 이 SPEC의 진입 시점 이후 한 줄도 바뀌지 않았다 (REQ-BOT-009). 두 조건이 함께 성립해야 통과다.
4. 넷째 명령이 **종료 코드 `0`** 으로 끝나고 출력이 정확히 `server/src/routes-bots.ts` 한 줄이다 — 이 SPEC이 손댄 소스 파일이 그 하나뿐이다 (REQ-BOT-008). 특히 `server/src/index.ts` 가 여기 나타나면 안 된다. 초대 라우트는 `registerBotRoutes` 안에서 등록되므로 `index.ts` 를 고칠 이유가 없다 (REQ-BOT-001).

> **v0.2.0 교정 기록.** 이전 판은 `git diff --stat HEAD -- server/src/db.ts` 와 `git diff --name-only` 를 M2 단계 5 에서 실행했는데, 둘 다 그 시점에 아무것도 관측하지 못했다. `HEAD` 기준 비교는 M1 이 단계 5 에서 이미 커밋한 변경을 볼 수 없고, `--cached` 없는 `git diff` 는 **스테이지된 변경도 보고하지 않아** M2 의 편집을 `git add` 한 뒤에는 출력이 아예 비었다. 즉 "소스 파일 하나만 고쳤다"는 관문이 한 번도 무언가를 검사한 적이 없었다. 두 명령 모두 `spec_base_sha` 를 기준으로 바꿨다 — 커밋됐든 스테이지됐든 작업 트리에 있든 그 시점 이후의 모든 변경이 잡힌다.

### AC-BOT-010 — RED → GREEN 전이 증거

**Given** 각 마일스톤에서 테스트를 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 네 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | `describe('invites', …)` 추가 후 발급 관련 테스트가 실패 (`POST /api/rooms/:id/invites` 미등록으로 `404`) |
| 2 | M1 | GREEN | `sha256Hex` + `inviteCommand` + `POST` 라우트 구현 후 발급 테스트 전부 통과 |
| 3 | M2 | RED | 목록·철회·교차 검증 테스트 추가 후 그 항목들이 실패 |
| 4 | M2 | GREEN | `GET`/`DELETE` 라우트와 `online` 불리언 매핑 구현 후 전체 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다. RED 판정은 도구가 내는 특정 문구가 아니라 "그 라우트가 없어서 실패했다"는 원인이 출력에서 확인되는가로 한다.

### AC-BOT-011 — 저장된 것은 해시뿐이며 `sha256Hex` 와 일치

**Given** 초대가 한 번 발급됐다.
**When** `server/test/rooms-bots.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('stores only the sha256 hash of the issued token', async () => {
  const { sha256Hex } = await import('../src/routes-bots.js')
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const bot = (await app.inject({ method: 'POST', url: '/api/bots', headers: { cookie }, payload: { name: 'pm' } })).json()
  const body = (await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: bot.id } })).json()
  const row = db.prepare('SELECT token_hash FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL').get(room.id) as { token_hash: string }
  expect(row.token_hash).toBe(sha256Hex(body.token))
  expect(row.token_hash).not.toBe(body.token)
})
```

**Then** 테스트가 통과한다 — 저장된 값이 발급 토큰의 SHA-256 해시이고 평문과 다르다. 카드 `t3` 의 게이트웨이가 같은 `sha256Hex` 로 조회할 수 있다는 뜻이다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 보관된 방에 대한 `DELETE` 초대 | `200`. 보관이 이미 전부 철회했으므로 바꿀 것이 없다 | AC-BOT-007 의 멱등성과 같은 경로 |
| 다른 방의 `botId` 로 `DELETE` | `200` 이지만 아무것도 철회되지 않는다. `room_id` 와 `bot_id` 를 모두 조건에 넣기 때문이다 | AC-BOT-007 |
| `bot_id` 가 문자열로 오는 경우 | 봇 조회에 실패해 `404` + "봇을 찾을 수 없다" | AC-BOT-005 와 같은 경로 |
| `bot_id` 가 아예 없는 본문 | `?? -1` 로 조회에 실패해 `404` + "봇을 찾을 수 없다" | AC-BOT-005 와 같은 경로 |
| 존재하지 않는 방 `id` 로 초대 | `404` + "방을 찾을 수 없다". 보관된 방(`409`)과 **구분한다** | AC-BOT-005 가 두 코드와 두 본문을 모두 단언한다 |
| 보관된 방으로 초대 | `409` + "보관된 방에는 초대할 수 없다". 대상은 있는데 그 상태에서 할 수 없는 일이다 | AC-BOT-005 |
| 초대가 없는 방의 목록 조회 | 빈 배열 `[]`. 오류가 아니다 | AC-BOT-006 과 같은 라우트 |
| 동시에 같은 (방, 봇) 조합을 두 번 초대 | 철회와 삽입이 별개 문장이라 이론적으로 활성 토큰 2개가 생길 수 있다. REQ-BOT-003 의 "정확히 1"은 **단일 요청 처리 기준**이며 이 경우를 배제하지 않는다 | 단일 사용자·소수 그룹 전제로 수용 (`plan.md` §E). 요구사항과 이 행은 서로 모순되지 않는다 |
| 미인증 요청으로 초대 세 라우트 호출 | 전부 `401`. `requireAuth` preHandler 가 붙어 있다 | `SPEC-AUTH-001` 이 그 경로를 이미 검증한다 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (선행 SPEC 분 + 이 SPEC 추가분) | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), `routes-bots.ts` 는 봇 등록과 초대만 안다 | 리뷰 |
| Unified | TypeScript strict, NodeNext, 상대 import 에 `.js` 확장자 | `npm run typecheck -w server` |
| Secured | 토큰은 SHA-256 해시만 저장, 평문 토큰은 발급 응답 1회, 목록에 노출 없음 | AC-BOT-003, AC-BOT-011 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-BOT-001 부터 AC-BOT-011 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 파일만 존재
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-BOT-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함 — 기준 SHA 가 실제 커밋으로 풀림
- [ ] 그 SHA 로 실행한 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이고 출력이 비어 있음 — `db.ts` 가 이 SPEC에서 한 줄도 변경되지 않음. **빈 출력만으로 통과 처리하지 않는다** — 기준 SHA 가 없을 때도 표준 출력은 비어 있다
- [ ] 같은 SHA 로 실행한 `git diff --name-only <SHA> -- server/src` 가 종료 코드 `0` 이고 출력이 정확히 `server/src/routes-bots.ts` 한 줄임. **`HEAD` 기준이나 기준 커밋 없는 `git diff` 를 쓰지 않는다** — 둘 다 이 시점에 아무것도 관측하지 못한다
- [ ] 초대 세 라우트가 `registerBotRoutes` 안에서 등록됨 — `server/src/index.ts` 가 위 목록에 나타나지 않는 것이 그 증거다
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 2개 (`feat: bot invite API issuing one-time gateway token`, `feat: bot invite listing and idempotent revocation`)
