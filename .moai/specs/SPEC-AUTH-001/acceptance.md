# SPEC-AUTH-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다. 테스트 이름은 `plan-v2.md` Task 3 의 원본 테스트 본문을 따른다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-AUTH-001 | REQ-AUTH-005 | `npm test -w server` | `auth.test.ts` 의 `registers a user` 통과 |
| AC-AUTH-002 | REQ-AUTH-006 | 아래 AC-AUTH-002 본문 참조 | 여섯 입력 모두 `400`, `users` 행 수 `0` |
| AC-AUTH-003 | REQ-AUTH-007 | `npm test -w server` | `auth.test.ts` 의 `rejects duplicate username` 통과 |
| AC-AUTH-004 | REQ-AUTH-008 | 아래 AC-AUTH-004 본문 참조 | `Set-Cookie` 에 `md_session=`, `HttpOnly`, `SameSite=Lax`, `Path=/` |
| AC-AUTH-005 | REQ-AUTH-003, REQ-AUTH-011 | `npm test -w server` | `auth.test.ts` 의 `login sets session cookie and /api/me works` 통과 |
| AC-AUTH-006 | REQ-AUTH-009 | `npm test -w server` | `auth.test.ts` 의 `wrong password returns 401` 통과 |
| AC-AUTH-007 | REQ-AUTH-012 | `npm test -w server` | `auth.test.ts` 의 `protected route without cookie returns 401` 통과 |
| AC-AUTH-008 | REQ-AUTH-004 | 아래 AC-AUTH-008 본문 참조 | `password_hash` 가 `<32hex>:<128hex>` 이고 평문을 포함하지 않음 |
| AC-AUTH-009 | REQ-AUTH-001, REQ-AUTH-002 | 아래 AC-AUTH-009 본문 참조 | 네 개의 내보내기 각각 `1`, `user?:` 선언 `1` |
| AC-AUTH-010 | REQ-AUTH-010 | 아래 AC-AUTH-010 본문 참조 | 로그아웃 후 보호 라우트가 `401` |
| AC-AUTH-011 | REQ-AUTH-013 | 아래 AC-AUTH-011 본문 참조 | 인증 예외 경로가 정확히 세 개, 보호 라우트는 `401` |
| AC-AUTH-012 | REQ-AUTH-014, REQ-AUTH-015 | 아래 AC-AUTH-012 본문 참조 | `server/src` 에 네 파일만, `db.ts` 변경 없음 |
| AC-AUTH-013 | RED→GREEN 전이 | 아래 AC-AUTH-013 본문 참조 | 두 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-AUTH-001 — 회원가입 성공

**Given** 빈 임시 DB 위에 `registerAuthRoutes` 가 등록된 Fastify 인스턴스가 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `auth.test.ts` 의 `registers a user` 가 통과한다. 이 테스트는 `POST /api/auth/register` 에 `{ username: 'alice', password: 'pw123456' }` 를 보낸 응답의 `statusCode` 가 `201` 임을 단언한다.

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

**Then** 테스트가 통과한다 — 여섯 입력 모두 `400` 이고, `users` 테이블에 행이 하나도 생기지 않는다. 뒤의 세 건은 문자열이 아닌 값이 길이 검사를 그대로 통과하는 것을 막는다.

### AC-AUTH-003 — 중복 사용자 이름 거절

**Given** `alice` 가 이미 가입돼 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `auth.test.ts` 의 `rejects duplicate username` 이 통과한다. 같은 이름으로 다시 가입한 응답의 `statusCode` 가 `409` 다.

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
**When** `npm test -w server` 를 실행한다.
**Then** `auth.test.ts` 의 `login sets session cookie and /api/me works` 가 통과한다. 로그인 응답의 쿠키를 실어 `GET /api/me` 를 호출하면 `statusCode` 가 `200` 이고 `json().user.username` 이 `alice` 다. 이 통과가 곧 `registerAuthRoutes` 의 DB 와 `req.server.db` 가 같은 연결이라는 증거다(다르면 세션 조회가 실패해 `401` 이 된다).

### AC-AUTH-006 — 잘못된 비밀번호 거절

**Given** `alice` 가 가입돼 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `auth.test.ts` 의 `wrong password returns 401` 이 통과한다.

### AC-AUTH-007 — 쿠키 없는 보호 라우트 접근 거절

**Given** 로그인하지 않은 클라이언트가 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `auth.test.ts` 의 `protected route without cookie returns 401` 이 통과한다.

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
for s in "export function hashPassword" "export function verifyPassword" "export function registerAuthRoutes" "export async function requireAuth"; do
  grep -c "$s" server/src/auth.ts
done
grep -c "user?: { id: number; username: string }" server/src/auth.ts
```

**Then** 출력이 다섯 줄 모두 `1` 이다.

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

### AC-AUTH-012 — 범위 경계와 스키마 불변

**Given** 이 SPEC 의 구현이 끝났다.
**When** 다음 두 명령을 실행한다.

```bash
ls server/src
git diff --stat HEAD -- server/src/db.ts
```

**Then** 첫 출력이 정확히 `auth.ts`, `config.ts`, `db.ts`, `index.ts` **네 항목**이다 — `routes-rooms.ts`, `routes-bots.ts`, `mention.ts`, `routes-messages.ts`, `sse.ts`, `gateway.ts`, `permissions.ts` 중 어느 것도 없다. 앞의 두 파일은 `SPEC-ROOM-001` 과 `SPEC-BOT-001` 의 소관이라 이 SPEC 에서 미리 만들지 않는다. 둘째 출력이 비어 있다 — `db.ts` 가 한 줄도 바뀌지 않았다.

### AC-AUTH-013 — RED → GREEN 전이 증거

**Given** 테스트 파일을 먼저 쓰고 구현을 나중에 쓴다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 두 전이가 순서대로 관측된다.

| 단계 | 마일스톤 | 상태 | 관측 |
|------|----------|------|------|
| 1 | M1 | RED | `auth.test.ts` 실패, 메시지에 `Cannot find module '../src/auth.js'` 포함 |
| 2 | M1 | GREEN | `auth.ts` + `index.ts` 수정 후 `npm test -w server` 전부 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| 같은 사용자가 여러 번 로그인 | `sessions` 에 행이 여러 개 쌓이고 모두 유효하다. 기기별 로그인을 허용하는 자연스러운 결과다 | 범위 밖 — 세션 관리는 spec.md §5 |
| `md_session` 쿠키에 존재하지 않는 토큰 | `401`. 오류 본문은 쿠키 없음과 동일하다 | AC-AUTH-007 이 쿠키 없음까지 다룬다 |
| 사용자 이름 앞뒤 공백 | 현재 구현은 `username` 을 trim 하지 않는다. `' alice'` 와 `'alice'` 는 다른 계정이 된다 | 범위 밖 — 원본 동작 유지. UI 에서 정형화한다 |
| 비밀번호가 정확히 8자 | 통과한다. 경계 조건이 `< 8` 이라 8자는 유효하다 | AC-AUTH-002 의 `short7`(7자)이 아래쪽 경계를 잡는다 |
| `password` 가 문자열이 아닌 타입 | `password.length` 가 `undefined` 라 `< 8` 비교가 거짓이 되어 통과할 수 있다 | 미해결 — 단일 사용자·소수 그룹 전제로 수용. 필요하면 zod 검증을 별도 카드로 |
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

- [ ] AC-AUTH-001 부터 AC-AUTH-013 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server` 가 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `auth.ts`, `config.ts`, `db.ts`, `index.ts` 네 파일만 존재
- [ ] `server/src/db.ts` 가 이 SPEC 에서 한 줄도 변경되지 않음
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 1개 (`feat: auth with register/login/session cookie`)
