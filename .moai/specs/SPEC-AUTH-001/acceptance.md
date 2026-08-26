# SPEC-AUTH-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 테스트 이름은 `plan-v2.md` Task 3 의 원본 테스트 본문을 따른다.

**규범 근거는 `plan-v2.md` 와 `spec-v2.md` 뿐이다.** 같은 디렉터리의 `plan.md` 와 `spec.md` 는 초기 커밋(`edd982e`)에 담긴 **폐기된 v1** 이며 이 SPEC 의 참조 대상이 아니다 — 파일 이름이 비슷해 혼동하기 쉬우므로 여기 못 박아 둔다.

세 가지를 미리 못 박아 둔다.

- **`GET /api/me` 는 이 SPEC 의 라우트가 아니다.** 아래 여러 시나리오가 이 경로를 쓰지만, 등록하는 곳은 테스트의 `build()` 헬퍼 하나뿐이다. `server/src` 의 어떤 파일에도 이 경로를 등록하지 않는다 — 등록하면 AC-AUTH-011 의 `grep` 이 `3` 을 넘겨 실패한다 (REQ-AUTH-013).
- **`build()` 는 이 SPEC 의 테스트 헬퍼이며 `app` 하나만 돌려준다.** `server/test/auth.test.ts` 안에만 있고 내보내지 않는다. `SPEC-ROOM-001` 과 `SPEC-BOT-001` 이 쓰는 `{ app, cookie }` 헬퍼는 `SPEC-ROOM-001` 이 `server/test/rooms-bots.test.ts` 에 따로 만드는 별개의 헬퍼다.
- **`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다.** run 단계 첫 동작으로 `git rev-parse HEAD` 를 실행해 그 값을 `progress.md` `§E.1` 에 기록하고, 아래 범위 경계 명령들은 그 값을 기준으로 비교한다. `HEAD` 를 기준으로 비교하면 이미 커밋된 변경을 볼 수 없어 검사가 무력해진다.
- **이름 붙은 기존 테스트의 통과는 `--reporter=verbose` 출력의 `✓` 줄로 판정한다.** 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그래서 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고, 둘 다 종료 코드 `0` 이다 — 요약 줄로도 종료 코드로도 두 경우를 가를 수 없다. 그래서 그런 기준의 명령은 `npm test -w server -- --reporter=verbose` 이고, 관측 대상은 `✓ test/<파일> > <describe 이름> > <테스트 이름>` 줄이 출력에 실제로 나타나는가 하나다. 그 줄이 없으면 **실패**다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 하나도 없으면 전부 건너뛴 채 종료 코드 `0` 이 되어 같은 결함이 되살아난다 (v0.5.0 교정 — 3차 보고서 D1).
- **기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 실패다.** 범위 경계 명령은 반드시 `git rev-parse --verify` 로 기준 SHA 가 실제 커밋으로 풀리는지 먼저 확인하고, 그 확인이 **종료 코드 `0`** 으로 끝난 뒤에만 `git diff` 로 넘어간다. 기록 단계를 건너뛴 실행이 "출력이 비어 있다"만으로 통과하는 길을 남기지 않기 위해서다 (v0.4.0 교정 — R1).

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-AUTH-001 | REQ-AUTH-005 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/auth.test.ts > … > registers a user` 줄이 나타남 |
| AC-AUTH-002 | REQ-AUTH-006 | 아래 AC-AUTH-002 본문 참조 | 여섯 입력 모두 `400`, `users` 행 수 `0` |
| AC-AUTH-003 | REQ-AUTH-007 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/auth.test.ts > … > rejects duplicate username` 줄이 나타남 |
| AC-AUTH-004 | REQ-AUTH-008 | 아래 AC-AUTH-004 본문 참조 | `Set-Cookie` 에 `md_session=`, `HttpOnly`, `SameSite=Lax`, `Path=/` |
| AC-AUTH-005 | REQ-AUTH-011, REQ-AUTH-003(테스트 인스턴스 한정) | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/auth.test.ts > … > login sets session cookie and /api/me works` 줄이 나타남 |
| AC-AUTH-006 | REQ-AUTH-009 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/auth.test.ts > … > wrong password returns 401` 줄이 나타남 |
| AC-AUTH-007 | REQ-AUTH-012 | `npm test -w server -- --reporter=verbose` | 출력에 `✓ test/auth.test.ts > … > protected route without cookie returns 401` 줄이 나타남 |
| AC-AUTH-008 | REQ-AUTH-004 | 아래 AC-AUTH-008 본문 참조 | `password_hash` 가 `<32hex>:<128hex>` 이고 평문을 포함하지 않음 |
| AC-AUTH-009 | REQ-AUTH-001, REQ-AUTH-002 | 아래 AC-AUTH-009 본문 참조 | 네 개의 내보내기 각각 `1`, `user?:` 선언 `1` |
| AC-AUTH-010 | REQ-AUTH-010 | 아래 AC-AUTH-010 본문 참조 | 로그아웃 후 보호 라우트가 `401` |
| AC-AUTH-011 | REQ-AUTH-013 | 아래 AC-AUTH-011 본문 참조 | 인증 예외 경로가 정확히 세 개, 보호 라우트는 `401` |
| AC-AUTH-012 | REQ-AUTH-014, REQ-AUTH-015 | 아래 AC-AUTH-012 본문 참조 | `server/src` 에 네 파일만, 기준 SHA 확인이 종료 코드 `0`, `spec_base_sha` 대비 `db.ts` diff 가 종료 코드 `0` + 빈 출력 |
| AC-AUTH-013 | RED→GREEN 전이 | 아래 AC-AUTH-013 본문 참조 | 두 전이가 순서대로 관측됨 |
| AC-AUTH-014 | REQ-AUTH-003, REQ-AUTH-013 | 아래 AC-AUTH-014 본문 참조 | `buildServer()` 가 조립한 서버에서 `app.db` 존재, 가입 `201`, 로그인이 `md_session` 쿠키 발급, `/api/health` `200` |

---

## Given-When-Then 시나리오

### AC-AUTH-001 — 회원가입 성공

**Given** 빈 임시 DB 위에 `registerAuthRoutes` 가 등록된 Fastify 인스턴스가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/auth.test.ts > <describe 이름> > registers a user` 줄이 나타난다 — `<describe 이름>` 은 `auth.test.ts` 가 선언한 describe 블록 이름 그대로다. 판정은 출력에 `✓ test/auth.test.ts > ` 로 시작해 ` > registers a user` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 테스트는 `POST /api/auth/register` 에 `{ username: 'alice', password: 'pw123456' }` 를 보낸 응답의 `statusCode` 가 `201` 임을 단언한다.

### AC-AUTH-002 — 유효하지 않은 가입 입력 거절

**Given** 빈 임시 DB 위의 서버가 있다.
**When** `server/test/auth.test.ts` 에 다음 테스트를 추가하고 `npm test -w server` 를 실행한다.

```ts
it('rejects invalid registration input', async () => {
  const app = await build()
  const cases = [
    { username: '', password: 'pw123456' },
    { username: 'bob' },
    { username: 'bob', password: 'short7' },
    { username: 'bob', password: 12345678 },
    { username: 'bob', password: ['pw123456'] },
    { username: ['bob'], password: 'pw123456' },
  ]
  for (const payload of cases) {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload })
    expect(res.statusCode).toBe(400)
  }
  const c = db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number }
  expect(c.c).toBe(0)
})
```

**Then** 테스트가 통과한다 — 여섯 입력 모두 `400` 이고, `users` 테이블에 행이 하나도 생기지 않는다. 첫 건(빈 `username`)은 REQ-AUTH-006 의 빈 문자열 조건이 잡고, 뒤의 세 건은 같은 요구사항의 타입 검사가 문자열이 아닌 값이 길이 검사를 그대로 통과하는 것을 막는다. 두 조건은 어느 하나가 빠지면 통과하지 못하도록 함께 걸려 있다.

### AC-AUTH-003 — 중복 사용자 이름 거절

**Given** `alice` 가 이미 가입돼 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/auth.test.ts > <describe 이름> > rejects duplicate username` 줄이 나타난다 — `<describe 이름>` 은 `auth.test.ts` 가 선언한 describe 블록 이름 그대로다. 판정은 출력에 `✓ test/auth.test.ts > ` 로 시작해 ` > rejects duplicate username` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 테스트는 같은 이름으로 다시 가입한 응답의 `statusCode` 가 `409` 임을 단언한다.

### AC-AUTH-004 — 세션 쿠키 속성

**Given** `alice` 가 가입돼 있다.
**When** `server/test/auth.test.ts` 에 다음 테스트를 추가하고 `npm test -w server` 를 실행한다.

```ts
it('sets an httpOnly lax session cookie', async () => {
  const app = await build()
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const raw = login.headers['set-cookie']![0]
  expect(raw).toMatch(/^md_session=/)
  expect(raw).toMatch(/HttpOnly/i)
  expect(raw).toMatch(/SameSite=Lax/i)
  expect(raw).toMatch(/Path=\//)
})
```

**Then** 테스트가 통과한다 — 쿠키 이름이 `md_session` 이고 세 속성이 모두 붙어 있다.

### AC-AUTH-005 — 로그인 후 보호 라우트 통과

**Given** 테스트의 `build()` 가 `app.db = db` 로 DB 를 주입하고 같은 `db` 를 `registerAuthRoutes` 에 넘긴다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/auth.test.ts > <describe 이름> > login sets session cookie and /api/me works` 줄이 나타난다 — `<describe 이름>` 은 `auth.test.ts` 가 선언한 describe 블록 이름 그대로다. 판정은 출력에 `✓ test/auth.test.ts > ` 로 시작해 ` > login sets session cookie and /api/me works` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다. 그 테스트는 로그인 응답의 쿠키를 실어 `GET /api/me` 를 호출한 결과가 `statusCode` `200` 이고 `json().user.username` 이 `alice` 임을 단언한다.

이 기준이 관측하는 것은 **테스트가 조립한 인스턴스**에서 `registerAuthRoutes` 의 DB 와 `req.server.db` 가 같은 연결이라는 사실뿐이다(다르면 세션 조회가 실패해 `401` 이 된다). `buildServer` 가 실제로 같은 배선을 하는지는 여기서 관측하지 않는다 — 그것은 AC-AUTH-014 가 맡는다. 테스트 헬퍼의 배선을 보고 `buildServer` 의 배선을 추론하지 않는다.

### AC-AUTH-006 — 잘못된 비밀번호 거절

**Given** `alice` 가 가입돼 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/auth.test.ts > <describe 이름> > wrong password returns 401` 줄이 나타난다 — `<describe 이름>` 은 `auth.test.ts` 가 선언한 describe 블록 이름 그대로다. 판정은 출력에 `✓ test/auth.test.ts > ` 로 시작해 ` > wrong password returns 401` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다.

### AC-AUTH-007 — 쿠키 없는 보호 라우트 접근 거절

**Given** 로그인하지 않은 클라이언트가 있다.
**When** `npm test -w server -- --reporter=verbose` 를 실행한다.
**Then** 출력에 `✓ test/auth.test.ts > <describe 이름> > protected route without cookie returns 401` 줄이 나타난다 — `<describe 이름>` 은 `auth.test.ts` 가 선언한 describe 블록 이름 그대로다. 판정은 출력에 `✓ test/auth.test.ts > ` 로 시작해 ` > protected route without cookie returns 401` 로 끝나는 줄(끝에 붙는 소요 시간은 제외)이 있는가 하나로 한다. 그 줄이 없으면 이 기준은 **실패**다.

### AC-AUTH-008 — 비밀번호 저장 형식

**Given** `alice` 가 비밀번호 `pw123456` 으로 가입돼 있다.
**When** `server/test/auth.test.ts` 에 다음 테스트를 추가하고 `npm test -w server` 를 실행한다.

```ts
it('stores a salted scrypt hash, never the plaintext', async () => {
  const app = await build()
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const row = db.prepare('SELECT password_hash FROM users WHERE username=?').get('alice') as { password_hash: string }
  expect(row.password_hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/)
  expect(row.password_hash).not.toContain('pw123456')
})
```

**Then** 테스트가 통과한다 — 저장값이 `<salt 32hex>:<key 128hex>` 형식이고 평문을 포함하지 않는다.

### AC-AUTH-009 — `auth.ts` 내보내기와 타입 선언

**Given** `server/src/auth.ts` 가 있다.
**When** 다음을 실행한다.

```bash
grep -c "export function hashPassword" server/src/auth.ts
grep -c "export function verifyPassword" server/src/auth.ts
grep -c "export function registerAuthRoutes" server/src/auth.ts
grep -c "export async function requireAuth" server/src/auth.ts
grep -c "user?: { id: number; username: string }" server/src/auth.ts
```

**Then** 다섯 명령이 각각 `1` 을 출력한다. 명령을 심볼별로 따로 실행하는 이유는 실패했을 때 **어느 내보내기가 없는지가 명령 자체로 드러나게** 하기 위해서다. 한 반복문으로 묶으면 출력 다섯 줄의 순서로만 원인을 짚어야 한다.

### AC-AUTH-010 — 로그아웃이 세션을 무효화

**Given** `alice` 가 로그인해 쿠키를 갖고 있다.
**When** `server/test/auth.test.ts` 에 다음 테스트를 추가하고 `npm test -w server` 를 실행한다.

```ts
it('logout invalidates the session', async () => {
  const app = await build()
  await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  const c = login.headers['set-cookie']![0].split(';')[0]
  const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: c } })
  expect(out.statusCode).toBe(200)
  const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie: c } })
  expect(me.statusCode).toBe(401)
  const n = db.prepare('SELECT COUNT(*) c FROM sessions').get() as { c: number }
  expect(n.c).toBe(0)
})
```

**Then** 테스트가 통과한다 — 로그아웃 후 같은 쿠키로는 `401` 이고 `sessions` 가 비어 있다.

### AC-AUTH-011 — 인증 예외 경로는 정확히 세 개

**Given** 로그인하지 않은 클라이언트가 있다.
**When** `server/test/auth.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다. 이어서 아래 `grep` 도 실행한다.

```ts
it('only the three /api/auth routes are reachable without a session', async () => {
  const app = await build()
  const open: Array<[string, string]> = [
    ['POST', '/api/auth/register'],
    ['POST', '/api/auth/login'],
    ['POST', '/api/auth/logout'],
  ]
  for (const [method, url] of open) {
    const res = await app.inject({ method: method as any, url, payload: {} })
    expect(res.statusCode, `${method} ${url}`).not.toBe(401)
  }
  const guarded = await app.inject({ method: 'GET', url: '/api/me' })
  expect(guarded.statusCode).toBe(401)
})
```

```bash
grep -c "app\.\(get\|post\|put\|delete\)(" server/src/auth.ts
```

**Then** 테스트가 통과한다 — 세 예외 경로는 세션 없이도 `401` 이 아니고, `requireAuth` 를 단 라우트는 `401` 이다. 그리고 `grep` 출력이 `3` 이다 — `auth.ts` 가 등록하는 라우트가 그 세 개뿐이라는 증거다.

경계를 정확히 적어 둔다. 이 기준이 판정하는 것은 **이 SPEC 이 등록하는 라우트 집합**이고, `GET /api/health` 는 그 집합 밖이다. 그 경로는 `SPEC-CORE-001` 이 `index.ts` 에 이미 인증 없이 등록해 두었으며 이 SPEC 은 그것을 지우지 않는다. 실제 서버에서 그 경로가 인증 없이 `200` 을 내는지는 **AC-AUTH-014** 가 관측한다 — `build()` 헬퍼는 그 경로를 등록하지 않으므로 여기서 확인할 수 없다.

### AC-AUTH-012 — 범위 경계와 스키마 불변

**Given** 이 SPEC 의 구현이 끝났다.
**When** 다음 세 명령을 차례로 실행한다.

```bash
ls server/src
git rev-parse --verify "$(cat .moai/specs/SPEC-AUTH-001/.spec-base-sha)^{commit}"
git diff --stat <둘째 명령이 출력한 40자리 SHA> -- server/src/db.ts
```

`.spec-base-sha` 는 run 단계 진입 시 `git rev-parse HEAD > .moai/specs/SPEC-AUTH-001/.spec-base-sha` 로 만들고, 같은 값을 `progress.md` `§E.1` 에도 적는다. `HEAD` 를 기준으로 비교하면 **이미 커밋된 스키마 변경을 볼 수 없어** 이 검사가 아무것도 잡지 못한다.

**둘째 명령이 앞에 있어야 하는 이유.** 기준 SHA 를 기록하지 않은 채 `git diff --stat "$(cat …)"` 를 그대로 돌리면 `$(cat …)` 이 빈 문자열로 펼쳐지고, git 은 `fatal: bad revision ''` 을 **표준 오류**로 내보낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 관측 조건을 "출력이 비어 있다" 하나로 두면 기록 단계를 건너뛴 실행이 이 기준을 통과한다 — 검사가 아무것도 검사하지 않는 상태다. `--verify` 확인이 그 경우를 종료 코드로 드러낸다.

셋째 명령에 SHA 를 직접 적는 것도 같은 이유의 연장이다. `$(cat …)` 을 `git diff` 안에 두면 그 명령은 워크트리 격리 세션의 가드가 정적으로 검증하지 못해 **실행 자체가 거부된다**(이 교정 라운드에서 이 워크트리에서 확인했다). 둘째 명령이 이미 SHA 를 눈에 보이게 내놓으므로, 셋째 명령은 그 값을 그대로 쓴다.

**Then** 세 관측이 모두 성립한다.

1. 첫 출력이 정확히 `auth.ts`, `config.ts`, `db.ts`, `index.ts` **네 항목**이다 — `routes-rooms.ts`, `routes-bots.ts`, `mention.ts`, `routes-messages.ts`, `sse.ts`, `gateway.ts`, `permissions.ts` 중 어느 것도 없다. 앞의 두 파일은 `SPEC-ROOM-001` 과 `SPEC-BOT-001` 의 소관이라 이 SPEC 에서 미리 만들지 않는다.
2. 둘째 명령이 **종료 코드 `0`** 으로 끝나고 40자리 SHA 한 줄을 출력한다. 종료 코드가 `0` 이 아니거나 `fatal:` 이 나오면 `.spec-base-sha` 가 없거나 읽히지 않는다는 뜻이고, **이 기준은 실패**다. 셋째 명령으로 넘어가지 않는다.
3. 셋째 명령이 **종료 코드 `0`** 으로 끝나고 **출력이 비어 있다** — `db.ts` 가 한 줄도 바뀌지 않았다. 두 조건이 함께 성립해야 통과이며, 빈 출력 하나만으로는 통과가 아니다.

### AC-AUTH-013 — RED → GREEN 전이 증거

**Given** 테스트 파일을 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 두 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | `auth.test.ts` 가 실패하고, 실패 원인이 `src/auth` 모듈 부재임이 출력에 나타난다 |
| 2 | M1 | GREEN | `auth.ts` + `index.ts` 수정 후 `npm test -w server` 전부 통과 |

RED 단계의 판정 기준을 도구가 내는 특정 문구(`Cannot find module '...'`)에 묶지 않는다. vitest 는 해석 경로에 따라 `Failed to load url ...` 로도 같은 상황을 보고하므로, 그 문구를 단언하면 기준이 도구 버전에 흔들린다. 판정은 "모듈이 없어서 실패했다"는 원인이 출력에서 확인되는가 하나다.

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 **원문 그대로** 기록한다. 그 원문이 이 기준의 증거다.

### AC-AUTH-014 — `buildServer` 가 조립한 서버가 실제로 동작

이 기준이 없으면 `index.ts` 를 한 줄도 고치지 않고도 나머지 13개 기준이 전부 통과한다. 다른 기준은 모두 테스트가 직접 `Fastify()` 를 만들어 배선하기 때문이다. 그 경우 `npm test` 는 초록불인데 실제로 띄운 서버는 모든 요청에 `401` 을 낸다. REQ-AUTH-003 의 `buildServer` 절반을 관측하는 유일한 기준이다.

**Given** `MINIDISCORD_DATA_DIR` 이 임시 디렉터리를 가리킨다.
**When** `server/test/auth.test.ts` 에 다음 테스트를 추가하고 `npm test -w server` 를 실행한다.

```ts
it('buildServer wires cookie, db and auth routes', async () => {
  process.env.MINIDISCORD_DATA_DIR = mkdtempSync(join(tmpdir(), 'md-buildserver-'))
  const { buildServer } = await import('../src/index.js')
  const app = await buildServer()
  await app.ready()

  expect(app.db).toBeDefined()

  const health = await app.inject({ method: 'GET', url: '/api/health' })
  expect(health.statusCode).toBe(200)

  const reg = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'alice', password: 'pw123456' } })
  expect(reg.statusCode).toBe(201)

  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'alice', password: 'pw123456' } })
  expect(login.statusCode).toBe(200)
  expect(login.headers['set-cookie']![0]).toMatch(/^md_session=/)

  await app.close()
})
```

**Then** 테스트가 통과한다. 관측되는 것은 네 가지다 — `app.db` 데코레이터가 실제로 설정돼 있고(`openDb` 호출), 로그인이 쿠키를 내려보내며(`@fastify/cookie` 등록 없이는 불가능하다), `registerAuthRoutes` 가 `buildServer` 안에서 호출됐고, `GET /api/health` 가 인증 없이 `200` 이다(REQ-AUTH-013 이 그 경로를 이 SPEC 의 범위 밖으로 두고 그대로 남긴다는 것의 증거).

**이 기준이 임시 디렉터리에서 도는 근거 (v0.4.0 교정 — R2).** 첫 줄의 `process.env.MINIDISCORD_DATA_DIR` 대입이 `buildServer()` 에 반영되는 것은 `server/src/config.ts` 의 `dataDir` 이 **게터**이기 때문이다 — 환경변수를 다시 읽는 것은 그 게터이지 `buildServer` 가 아니다. `config.dbPath` 는 `this.dataDir` 에서 파생되므로 같은 시점에 결정된다. 교정 전에는 `dataDir` 이 모듈 로드 시점에 값이 굳는 평범한 속성이었고, 이 기준이 지금 안전한 것은 `auth.test.ts` 가 `config.js` 를 끌어오는 모듈을 아직 정적으로 import 하지 않는다는 우연 덕분이었다. 그 우연은 `auth.ts` 가 `config` 를 import 하는 순간 끝난다. `config.ts` 를 게터로 고친 경위와 남은 한계(`port` 는 여전히 즉시 평가)는 `SPEC-ROOM-001` 의 `plan.md` §D 8번에 있다 — 형제 SPEC 의 AC-ROOM-011 이 같은 지연 평가에 기댄다.

**이 기준이 관측하지 않는 것**: `buildServer` 로 조립한 서버에서 `requireAuth` 가 보호 라우트를 실제로 막는지. 이 SPEC 시점에는 `buildServer` 가 등록하는 보호 라우트가 하나도 없어(`/api/me` 는 테스트 전용) 관측할 대상 자체가 없다. 그 절반은 `SPEC-ROOM-001` 의 `AC-ROOM-011` 이 방 라우트가 붙은 뒤에 관측한다. 여기서 추론으로 메우지 않는다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 같은 사용자가 여러 번 로그인 | `sessions` 에 행이 여러 개 쌓이고 모두 유효하다. 기기별 로그인을 허용하는 자연스러운 결과다 | 범위 밖 — 세션 관리는 spec.md §5 |
| `md_session` 쿠키에 존재하지 않는 토큰 | `401`. 오류 본문은 쿠키 없음과 동일하다 | AC-AUTH-007 이 쿠키 없음까지 다룬다 |
| 사용자 이름 앞뒤 공백 | 현재 구현은 `username` 을 trim 하지 않는다. `' alice'` 와 `'alice'` 는 다른 계정이 된다 | 범위 밖 — 원본 동작 유지. UI 에서 정형화한다 |
| 비밀번호가 정확히 8자 | 통과한다. 경계 조건이 `< 8` 이라 8자는 유효하다 | AC-AUTH-002 의 `short7`(7자)이 아래쪽 경계를 잡는다 |
| `password` 가 문자열이 아닌 타입 | `400`. REQ-AUTH-006 의 타입 검사가 길이 검사보다 먼저 실행된다 | AC-AUTH-002 의 뒤 세 케이스 |
| `username` 이 빈 문자열 | `400`. 빈 문자열은 타입 검사를 통과하므로 REQ-AUTH-006 이 별도 조건으로 거른다 | AC-AUTH-002 의 첫 케이스 |
| 로그아웃을 쿠키 없이 호출 | `200` 과 `{ ok: true }`. 지울 세션이 없어도 오류가 아니다 | REQ-AUTH-010 이 명시하고, AC-AUTH-011 의 예외 경로 확인이 이 경로를 지나간다 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트가 전부 통과 (기존 3 + 이 SPEC 추가분) | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), `auth.ts` 는 인증만 담당 | 리뷰 |
| Unified | TypeScript strict, NodeNext, 상대 import 에 `.js` 확장자 | `npm run typecheck -w server` |
| Secured | 비밀번호는 salt+scrypt 해시, 세션 토큰은 32바이트 난수, 로그인 실패 본문이 두 경우를 구분하지 않음 | AC-AUTH-006, AC-AUTH-008 |
| Trackable | 커밋 메시지가 Conventional Commits (`feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-AUTH-001 부터 AC-AUTH-014 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `auth.ts`, `config.ts`, `db.ts`, `index.ts` 네 파일만 존재
- [ ] `spec_base_sha` 가 `progress.md` `§E.1` 에 기록됨
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-AUTH-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함 — 기준 SHA 가 실제 커밋으로 풀림
- [ ] 그 SHA 로 실행한 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이고 출력이 비어 있음 — `db.ts` 가 이 SPEC 에서 한 줄도 변경되지 않음. **빈 출력만으로 통과 처리하지 않는다** — 기준 SHA 가 없을 때도 표준 출력은 비어 있다
- [ ] `server/src` 에 `GET /api/me` 를 등록하는 코드가 없음 (테스트 전용 경로)
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 1개 (`feat: auth with register/login/session cookie`)
