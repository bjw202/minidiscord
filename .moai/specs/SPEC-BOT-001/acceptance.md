# SPEC-BOT-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 테스트 이름은 `plan-v2.md` Task 5 의 원본 테스트 본문을 따른다.

이 SPEC은 `SPEC-AUTH-001` 과 `SPEC-ROOM-001` 이 먼저 끝난 상태를 전제한다. 아래 모든 시나리오의 `build()` 헬퍼는 `SPEC-AUTH-001` 이 만든 로그인 헬퍼이고, 방·봇 생성은 `SPEC-ROOM-001` 의 라우트를 쓴다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-BOT-001 | REQ-BOT-001 | `npm test -w server` | `rooms-bots.test.ts` 의 `invites a bot and returns one-time token + command` 통과 |
| AC-BOT-002 | REQ-BOT-005 | 아래 AC-BOT-002 본문 참조 | `command` 가 네 조각을 모두 포함하고 포트가 `config.port` |
| AC-BOT-003 | REQ-BOT-002 | 아래 AC-BOT-003 본문 참조 | 목록 응답에 `token` 키 없음, 평문 토큰을 읽는 SELECT `0` 건 |
| AC-BOT-004 | REQ-BOT-003 | `npm test -w server` | `rooms-bots.test.ts` 의 `re-inviting same bot revokes old token and issues new one` 통과 |
| AC-BOT-005 | REQ-BOT-004 | 아래 AC-BOT-005 본문 참조 | 보관 방 `403`, 없는 봇 `404` |
| AC-BOT-006 | REQ-BOT-006 | 아래 AC-BOT-006 본문 참조 | `typeof online === 'boolean'` 이고 값이 `false` |
| AC-BOT-007 | REQ-BOT-007 | 아래 AC-BOT-007 본문 참조 | `DELETE` 두 번 모두 `200`, 활성 토큰 수 `0` |
| AC-BOT-008 | REQ-BOT-001 (교차 검증: `SPEC-ROOM-001` 의 "방 보관 시 활성 토큰 일괄 철회" 요구사항) | 아래 AC-BOT-008 본문 참조 | 보관 전 활성 토큰 `1`, 보관 후 `0` |
| AC-BOT-009 | REQ-BOT-008, REQ-BOT-009 | 아래 AC-BOT-009 본문 참조 | `server/src` 에 여섯 파일만, `db.ts` diff 비어 있음 |
| AC-BOT-010 | RED→GREEN 전이 | 아래 AC-BOT-010 본문 참조 | 네 전이가 순서대로 관측됨 |
| AC-BOT-011 | REQ-BOT-001 (저장 형식) | 아래 AC-BOT-011 본문 참조 | `token_hash` 가 발급 토큰의 `sha256Hex` 값과 정확히 일치 |

---

## Given-When-Then 시나리오

### AC-BOT-001 — 초대가 1회용 토큰을 발급

**Given** 활성 방과 등록된 봇이 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `rooms-bots.test.ts` 의 `invites a bot and returns one-time token + command` 가 통과한다. 응답 상태 코드가 `201` 이고, `token` 이 `/^[0-9a-f]{64}$/` 에 맞으며, `command` 가 `--dangerously-load-development-channels` 와 그 토큰 값을 모두 포함한다.

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
**When** `npm test -w server` 를 실행하고, 이어서 다음을 실행한다.

```bash
grep -c "token_hash" server/src/routes-bots.ts
grep -c "SELECT .*token[^_]" server/src/routes-bots.ts || echo 0
```

**Then** `rooms-bots.test.ts` 의 `lists invites without token` 이 통과한다 — 목록 응답이 정확히 `[{ bot_id, bot_name, online }]` 이라 `token` 키가 없다. 그리고 두 번째 grep 출력이 `0` 이다 — 어떤 SELECT 도 토큰 컬럼을 읽지 않는다(저장된 것이 해시뿐이므로 읽을 평문 자체가 없다).

### AC-BOT-004 — 재초대 시 활성 토큰은 정확히 하나

**Given** 같은 (방, 봇) 조합에 초대가 두 번 이루어졌다.
**When** `npm test -w server` 를 실행한다.
**Then** `rooms-bots.test.ts` 의 `re-inviting same bot revokes old token and issues new one` 이 통과한다. 두 토큰 값이 서로 다르고, `SELECT COUNT(*) FROM bot_tokens WHERE room_id=? AND revoked_at IS NULL` 이 `1` 이다.

### AC-BOT-005 — 초대 실패 경로

**Given** 보관된 방 하나와, 존재하지 않는 `bot_id` 가 있다.
**When** `npm test -w server` 를 실행하고, 아래 추가 테스트도 함께 실행한다.

```ts
it('invite with unknown bot returns 404', async () => {
  const { app, cookie } = await build()
  const room = (await app.inject({ method: 'POST', url: '/api/rooms', headers: { cookie }, payload: { name: 'A' } })).json()
  const res = await app.inject({ method: 'POST', url: `/api/rooms/${room.id}/invites`, headers: { cookie }, payload: { bot_id: 9999 } })
  expect(res.statusCode).toBe(404)
})
```

**Then** 원본 테스트 `invite to archived room returns 403` 이 통과하고, 위 추가 테스트가 통과한다.

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
**When** 다음을 실행한다.

```bash
ls server/src
git diff --stat HEAD -- server/src/db.ts
```

**Then** 첫 출력이 정확히 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 항목이다 — `mention.ts`, `routes-messages.ts`, `sse.ts`, `gateway.ts`, `permissions.ts` 중 어느 것도 없다. 둘째 출력이 비어 있다 — `db.ts` 가 한 줄도 바뀌지 않았다.

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

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다.

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
| `bot_id` 가 문자열로 오는 경우 | `db.prepare(...).get(bot_id ?? -1)` 이 조회에 실패해 `404` | AC-BOT-005 와 같은 경로 |
| `bot_id` 가 아예 없는 본문 | `?? -1` 로 조회에 실패해 `404` | AC-BOT-005 와 같은 경로 |
| 존재하지 않는 방 `id` 로 초대 | `403`. "활성 방이 아니다"라는 한 조건으로 없는 방과 보관된 방을 함께 거절한다 | AC-BOT-005 |
| 초대가 없는 방의 목록 조회 | 빈 배열 `[]`. 오류가 아니다 | AC-BOT-006 과 같은 라우트 |
| 동시에 같은 (방, 봇) 조합을 두 번 초대 | 철회와 삽입이 별개 문장이라 이론적으로 활성 토큰 2개가 생길 수 있다 | 단일 사용자·소수 그룹 전제로 수용 (`plan.md` §E) |
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
- [ ] `server/src/db.ts` 가 이 SPEC에서 한 줄도 변경되지 않음
- [ ] 이 SPEC이 수정한 소스 파일이 `server/src/routes-bots.ts` 하나뿐임 (`git diff --name-only` 로 확인)
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 2개 (`feat: bot invite API issuing one-time gateway token`, `feat: bot invite listing and idempotent revocation`)
