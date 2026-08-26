# SPEC-AUTH-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 3 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §D 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.

---

## §A 되돌리기 어려운 결정 — 이 SPEC 이 내보내는 계약

카드 `t2` 는 세 SPEC 을 **의존 순서대로** 차례로 진행한다.

```
SPEC-AUTH-001 (이 문서) → SPEC-ROOM-001 → SPEC-BOT-001
```

이 SPEC 은 그 사슬의 **첫 번째**이고, 뒤의 두 SPEC 은 여기서 만드는 진입 검사와 세션 쿠키 계약에 직접 결합한다. `SPEC-ROOM-001` 의 방·봇 라우트와 `SPEC-BOT-001` 의 초대 라우트는 모두 `requireAuth` 를 `preHandler` 로 달고, 통과한 요청의 `req.user` 로 인증 주체를 읽는다. 그래서 이 계약은 이 SPEC 안에서만 쓰이는 내부 구현이 아니라 **두 소비자를 가진 공개 계약**이고, 확정한 뒤에 바꾸면 두 SPEC 의 라우트가 함께 깨진다.

소비자가 의존하는 것을 정확히 적으면 다음 다섯 개다.

| 내보내는 것 | 시그니처 | 소비자가 어떻게 쓰는가 |
|-------------|----------|------------------------|
| `requireAuth` | `(req: FastifyRequest, reply: FastifyReply) => Promise<void>` | `app.get('/api/rooms', { preHandler: [requireAuth] }, handler)` 형태로 모든 도메인 라우트에 단다 |
| `req.user` | `{ id: number; username: string } \| undefined` | 진입 검사를 통과한 핸들러 안에서 인증 주체를 읽는다. Fastify 모듈 선언 병합으로 타입이 붙는다 |
| `app.db` | `Db` (`better-sqlite3` 연결, `db.ts` 의 `openDb` 결과) | `registerRoomRoutes` / `registerBotRoutes` 는 DB 인자를 받지 않고 `req.server.db` 로 이 연결을 읽는다 |
| 세션 쿠키 | 이름 `md_session`, 값은 `sessions.token`(32바이트 hex), `httpOnly` / `sameSite: 'lax'` / `path: '/'` | 브라우저(t5)가 이 쿠키 하나로 모든 도메인 API 를 호출한다 |
| `registerAuthRoutes` | `(app: FastifyInstance, db: Db) => void` | `buildServer` 가 도메인 라우트 등록보다 **먼저** 호출한다 |

세 가지는 특히 되돌리기 비싸다.

- **`req.user` 의 필드 집합.** `{ id, username }` 두 개뿐이다. 방 생성 라우트가 소유자를 기록하려 든다면 여기에 필드가 늘어야 하는데, 원본 데이터 모델의 `rooms` 에는 소유자 컬럼이 없다(`REQ-AUTH-015` 가 금지하는 스키마 변경 영역이다). 그래서 두 필드로 고정한다.
- **`app.db` 데코레이터.** `requireAuth` 가 인자로 DB 를 받지 않고 `req.server.db` 를 읽기 때문에, 이 데코레이터가 없으면 진입 검사가 아예 동작하지 않는다. §B 가 이 결정의 본문이다.
- **쿠키 이름 `md_session`.** 브라우저와 서버 양쪽에 하드코딩된다. 바꾸면 이미 로그인한 세션이 전부 무효가 된다.

검토 시 이 표가 확인 대상이다. 여기서 이름이나 형태 하나를 바꾸면 `SPEC-ROOM-001` 과 `SPEC-BOT-001` 의 라우트 코드가 함께 바뀐다.

## §B 되돌리기 어려운 결정 — DB 주입 방식

원본 `plan-v2.md` Task 3 은 `requireAuth` 를 **두 가지 버전**으로 제시한다. 첫 버전은 `req.server['db' as keyof typeof req.server]` 라는 우회 접근이고, 그 아래에서 "데코레이터 기반으로 단순화한다"며 두 번째 버전을 준다. 둘 다 채택하면 코드가 갈라진다.

**결정: 두 번째(데코레이터) 버전만 구현한다.**

```ts
// server/src/index.ts — buildServer 안에서
declare module 'fastify' {
  interface FastifyInstance { db: Db }
}
app.db = openDb(config.dbPath)

// server/src/auth.ts
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = req.cookies['md_session']
  if (!token) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  const row = req.server.db.prepare(
    'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
  ).get(token) as { id: number; username: string } | undefined
  if (!row) return void reply.code(401).send({ error: '로그인이 필요합니다' })
  req.user = row
}
```

여기에 남는 비대칭이 하나 있고, 그것도 원본을 따른다. `registerAuthRoutes(app, db)` 는 DB 를 **인자로** 받는데 `requireAuth` 는 `req.server.db` 를 읽는다. 두 경로가 같은 연결을 가리키지 않으면 로그인은 되는데 보호 라우트는 401 이 되는, 진단이 어려운 증상이 난다.

- 실행 시: `buildServer` 가 `app.db = openDb(...)` 로 만든 그 객체를 `registerAuthRoutes(app, app.db)` 에 그대로 넘긴다.
- 테스트에서: `app.db = db` 를 먼저 대입하고 같은 `db` 를 `registerAuthRoutes` 에 넘긴다. 원본 테스트 코드에 "`app.db = db` 이 줄 추가"가 명시돼 있다.

이 비대칭은 다음 두 SPEC 에도 그대로 이어진다. `registerRoomRoutes` / `registerBotRoutes` 는 DB 인자를 받지 않고 `req.server.db` 만 쓴다.

## §C 되돌리기 어려운 결정 — 사람이 보는 계약

브라우저(t5)와 사용자가 직접 마주하는 표면이라, 확정 뒤에는 UI 코드가 여기에 결합한다.

| 라우트 | 성공 | 실패와 코드 |
|--------|------|-------------|
| `POST /api/auth/register` | 201 | 입력 미달 400 / 중복 409 |
| `POST /api/auth/login` | 200 + `Set-Cookie` | 자격증명 불일치 401 |
| `POST /api/auth/logout` | 200 | 없음 (쿠키 없어도 200) |
| (모든 보호 라우트) | 각 라우트 소관 | 미인증 401 — `requireAuth` 가 핸들러 실행 전에 응답한다 |

오류 본문은 전부 한국어 한 줄이다. 로그인 실패의 401 본문은 "없는 사용자"와 "비밀번호 틀림"을 **구분하지 않는다** — 구분하면 사용자 이름 열거가 가능해진다(REQ-AUTH-009).

## §D 원본 문서 모순과 해결

원본 `plan-v2.md` Task 3 과 `spec-v2.md` 를 대조하면서 발견한 것들 가운데 **인증 범위 안에 있는 것**만 남겼다. 방·봇·초대 범위의 모순(원본 §D 1·2·4·6번)은 `SPEC-ROOM-001` 과 `SPEC-BOT-001` 로 함께 넘어갔다.

| # | (원본 §D) | 모순 | 해소 |
|---|-----------|------|------|
| 1 | 3번 | `spec-v2.md` 4-B 는 채널이 `--token` / `--server` **실행 인자**로 설정을 받는다고 쓰고, 같은 문서의 Global Constraints(20행)와 Task 5 의 명령 문자열은 **환경변수만** 쓴다 | Global Constraints 를 따른다 — 환경변수 `MINIDISCORD_TOKEN` / `MINIDISCORD_SERVER`. 제약이 4-B 의 예시보다 강한 규범이고, Task 5 의 실제 코드도 그쪽이다 |
| 2 | 5번 | Task 3 의 `POST /api/auth/register` 는 성공 응답이 `{ ok: true }` 뿐이라 만들어진 사용자 `id` 를 알 수 없다 | 원본 그대로 둔다. 가입 직후 로그인이 유일한 흐름이고 UI 가 `id` 를 쓰지 않는다 |

1번은 채널 계약에 닿는다. Global Constraints 24행은 "계약 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다"고 못 박는데, 여기서 정하는 것은 계약 자체가 아니라 **안내 문자열이 어떤 형태를 권하는가**다. 채널 플러그인(t4)이 실제로 환경변수를 읽도록 구현되므로 계약 위반이 아니다.

**이 판단은 리드가 보류 결정을 내린 항목이다.** 리드의 판정은 "지금은 Global Constraints 가 우선한다"이고, 기록은 지우지 않고 남겨 **카드 t4 착수 시 다시 확인한다.** 이 SPEC 에서 다르게 해소하지 않는다.

3분할로 이 기록의 소비 지점(초대 응답의 실행 명령 안내 문자열)은 `SPEC-BOT-001` 로 옮겨 갔지만, 리드의 보류 지시에 따라 기록 자체는 여기 남긴다. `SPEC-BOT-001` 이 안내 문자열을 만들 때 이 항목을 참조한다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| `app.db` 와 `registerAuthRoutes(app, db)` 가 다른 연결을 가리킴 | 로그인은 200 인데 보호 라우트가 401 — 원인 추적이 어렵다 | §B 의 주입 순서를 마일스톤 체크리스트로 고정. AC-AUTH-005 가 이 경로를 기계적으로 잡는다 |
| `scryptSync` 는 동기 호출이라 요청 스레드를 막는다 | 소수 그룹용 서버라 실사용 영향은 없다 | 수용. 원본 코드 그대로. 부하가 문제가 되면 별도 카드 |
| `sessions` 에 만료가 없어 세션이 영구적이다 | 쿠키 탈취 시 무기한 유효 | 범위 밖(spec.md §5)으로 명시. 평문 HTTP 를 수용한 원본 결정과 같은 층위의 리스크다 |
| `users.username` 의 `UNIQUE` 위반을 `try/catch` 로 잡아 409 로 바꾸는데, 다른 DB 오류도 같이 409 가 된다 | 오진단 | 수용(원본 그대로). 이 테이블에 다른 제약이 없어 실제 오분류 경로가 없다 |
| 이 SPEC 만으로는 `requireAuth` 를 쓰는 실제 도메인 라우트가 없다 | 진입 검사가 테스트 전용 `/api/me` 로만 검증된다 | 수용. `/api/me` 는 원본 Task 3 테스트가 이미 쓰는 경로이고, 실제 결합은 `SPEC-ROOM-001` 이 검증한다 |

## §F 마일스톤

이 SPEC 은 마일스톤 하나다. 원본 `plan-v2.md` Task 3 Step 1-5 를 그대로 따른다.

### M1 — 인증과 세션 쿠키 (우선순위 High)

1. `server/test/auth.test.ts` 작성 (원본 Task 3 Step 1 본문 그대로 — 5개 테스트). `build()` 에 `app.db = db` 한 줄을 포함한다.
2. **RED 확인**: `npm test -w server` → `Cannot find module '../src/auth.js'` 로 실패. 출력 기록.
3. `server/src/auth.ts` 구현 — `hashPassword` / `verifyPassword` / `registerAuthRoutes` / `requireAuth`. `requireAuth` 는 §B 의 데코레이터 버전 **하나만** 쓴다.
4. `server/src/index.ts` 의 `buildServer` 수정 — `declare module 'fastify'` 로 `db` 선언, `mkdirSync(config.dataDir)` / `mkdirSync(config.uploadsDir)`, `app.db = openDb(config.dbPath)`, `await app.register(cookie)`, `registerAuthRoutes(app, app.db)`, `onClose` 훅에서 `app.db.close()`.
5. AC-AUTH-002 / 004 / 008 / 010 / 011 의 추가 테스트를 `auth.test.ts` 에 넣는다.
6. **GREEN 확인**: `npm test -w server` 전부 통과. `npm run typecheck -w server` → 종료 코드 0.
7. 범위 경계 확인: `server/src` 가 네 파일인지, `db.ts` 가 안 바뀌었는지 (AC-AUTH-012).
8. 커밋: `feat: auth with register/login/session cookie`

수용 기준: AC-AUTH-001..013 전부.

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-AUTH-001..013 전부다. 별도 기준을 만들지 않는다.

실행자는 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **스키마 변경** — `db.ts` 의 `SCHEMA` 에 컬럼을 더하지 않는다. 세션 만료가 필요해 보여도 마찬가지다. REQ-AUTH-015 가 금지하고, 필요하면 진행을 멈추고 보고한다.
- **`requireAuth` 두 버전 병존** — 원본이 제시한 첫 번째(`req.server['db' as keyof …]`) 형태를 남기지 않는다. §B 의 데코레이터 버전 하나만 존재해야 한다.
- **다음 SPEC 선반영** — "어차피 `SPEC-ROOM-001` 에서 필요하니까" `routes-rooms.ts` / `routes-bots.ts` 스텁을 미리 만들지 않는다. AC-AUTH-012 가 기계적으로 잡는다.
- **오류 본문으로 존재 여부 흘리기** — 로그인 실패 응답이 "없는 사용자"와 "비밀번호 틀림"을 구분하면 사용자 이름 열거가 가능해진다. 두 경우 같은 401 본문을 쓴다 (REQ-AUTH-009).
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-AUTH-013 의 전이 증거를 만들 수 없다.
- **테스트에서 실제 `data/` 쓰기** — 모든 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다.

## §I 상호 참조

- `spec.md` — 이 SPEC 의 GEARS 요구사항(REQ-AUTH-001..015)과 범위 경계
- `acceptance.md` — AC-AUTH-001..013
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 3 — 원본 (읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·5·9장 — 기능 요구사항, 데이터 모델, 보안
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `openDb`, 스키마)
- `SPEC-ROOM-001` — 이 SPEC 다음. §A 의 `requireAuth` / `req.user` / `app.db` 계약을 소비한다
- `SPEC-BOT-001` — `SPEC-ROOM-001` 다음. 같은 계약을 소비하고, §D 1번의 안내 문자열 판단을 이어받는다
