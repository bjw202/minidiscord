# SPEC-ROOM-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §D 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤과는 다른 층위다.

---

## §A 의존 순서와 SPEC 사이의 계약

카드 `t2` 는 세 개의 Tier M SPEC 을 **의존 순서대로** 내놓는다. 순서를 바꿀 수 없다.

```
SPEC-AUTH-001  →  SPEC-ROOM-001 (이 문서)  →  SPEC-BOT-001
   인증·세션          방·봇 등록                봇 초대·토큰
```

### 이 SPEC 이 SPEC-AUTH-001 에서 소비하는 것

| 소비 대상 | 형태 | 없으면 생기는 일 |
|-----------|------|------------------|
| `requireAuth(req, reply): Promise<void>` | `server/src/auth.ts` 의 이름 붙은 내보내기 | 두 라우트 모듈이 import 에서 컴파일 실패 |
| `md_session` 쿠키와 `POST /api/auth/{register,login}` | HTTP 계약 | 테스트의 `build()` 헬퍼가 쿠키를 못 얻어 전 테스트가 `401` |
| `app.db` 데코레이터 + `declare module 'fastify'` 의 `db` 선언 | `buildServer` 안에서 설정 | `req.server.db` 가 타입 오류이자 런타임 `undefined` |
| `@fastify/cookie` 등록 | `buildServer` 안에서 `await app.register(cookie)` | `req.cookies` 가 없어 `requireAuth` 가 항상 `401` |

**이 SPEC 은 위 넷 중 어느 것도 정의하지 않는다.** 전부 가져다 쓴다. SPEC-AUTH-001 이 완료되지 않은 상태에서 이 SPEC 의 run 단계를 시작하면 첫 테스트부터 실패하며, 그 실패는 이 SPEC 의 결함이 아니다.

### 이 SPEC 이 SPEC-BOT-001 에게 남기는 것

| 산출물 | 형태 | SPEC-BOT-001 이 쓰는 방식 |
|--------|------|---------------------------|
| `rooms` 행과 `POST /api/rooms` | 활성 방 | 초대의 대상 방. 초대는 `status='active'` 인 방만 받는다 |
| `bots` 행과 `POST /api/bots` | 봇 정의 | 초대의 대상 봇. `bot_id` 가 여기 없으면 `404` |
| `server/src/routes-bots.ts` | 파일 자체 | 같은 파일에 초대 라우트 세 개와 `sha256Hex` 를 **덧붙인다** |
| 보관 시 `bot_tokens` 일괄 철회 | `POST /api/rooms/:id/archive` 안의 트랜잭션 | 초대된 방을 보관하면 토큰이 죽는다는 것을 실행으로 검증 |
| `registerRoomRoutes` 의 `onArchive` 훅 자리 | 선택 인자 | 아직 아무도 쓰지 않는다. 게이트웨이(이후 카드)가 연결 끊기에 쓴다 |

`routes-bots.ts` 가 두 SPEC 에 걸쳐 자라는 것이 이 분할에서 가장 어색한 지점이다. §C 에서 왜 파일을 나누지 않았는지 설명한다.

## §B 되돌리기 어려운 결정 — 사람이 보는 HTTP 계약

브라우저(이후 카드)와 사용자가 직접 마주하는 표면이라, 확정 뒤에는 UI 코드가 여기에 결합한다.

| 라우트 | 성공 | 실패와 코드 |
|--------|------|-------------|
| `GET /api/rooms` | 200 | 미인증 401 |
| `POST /api/rooms` | 201 | 빈 이름 400 / 미인증 401 |
| `POST /api/rooms/:id/archive` | 200 | 방 없음 404 / 이미 보관됨 409 / 미인증 401 |
| `GET /api/bots` | 200 | 미인증 401 |
| `POST /api/bots` | 201 | 빈 이름 400 / 중복 409 / 미인증 401 |

여기서 굳는 형태가 두 개 더 있다.

- **`GET /api/rooms` 의 응답은 배열이 아니라 `{ active, archived }` 객체다.** 서버가 한 번 `SELECT` 해서 상태로 나눠 준다. 클라이언트가 필터링하지 않는다. UI 사이드바가 두 목록을 그대로 두 섹션에 매핑하는 것을 전제한 형태다.
- **`Room` 은 `archived_at` 을 활성 방에서도 키로 갖는다**(값은 `null`). 목록 응답이 상태에 따라 모양이 달라지지 않게 하려는 것이다.

**상태 코드의 의미는 이 SPEC 과 SPEC-BOT-001 이 같은 규칙으로 쓴다.**

| 코드 | 뜻 | 보관에서 | 초대에서 (SPEC-BOT-001) |
|------|-----|----------|------------------------|
| `404` | 지목한 대상이 없다 | 그 `id` 의 방이 없다 | 그 방이 없다 / 그 `bot_id` 의 봇이 없다 (본문으로 구분) |
| `409` | 대상은 있으나 그 상태에서는 할 수 없다 | 이미 보관된 방이다 | 보관된 방에는 초대할 수 없다 |

이 규칙은 v0.2.0 교정 라운드에서 확정됐다. 이전 판은 보관이 "없는 방"과 "보관된 방"을 `404` 하나로 합치고, 초대는 같은 두 경우를 `403` 하나로 합쳤다 — 두 라우트가 같은 상황에 다른 코드를 쓰면서 어느 쪽도 두 경우를 구분하지 못했다. 경위와 근거는 §D 7번에 있다.

**두 SPEC 에 걸친 결정이므로 여기서 바꾸면 SPEC-BOT-001 도 함께 바꿔야 한다.** 두 문서는 같은 편집에서 함께 고쳐졌고, 앞으로도 그래야 한다.

## §C 되돌리기 어려운 결정 — 보관의 원자성, 훅 경계, 파일 분할

### 보관은 한 트랜잭션이다

보관 핸들러는 UPDATE 를 두 번 한다. 방 상태를 바꾸고, 그 방의 활성 토큰을 철회한다. 원본 Task 4 의 코드는 두 문장을 그냥 나란히 둔다.

**결정: `better-sqlite3` 의 `db.transaction()` 으로 묶는다.**

중간에 실패하면 "보관됐는데 토큰은 살아 있는" 상태가 남고, 그 방의 봇이 계속 접속 가능해진다. 보관은 되돌릴 수 없는 전이라 이 중간 상태를 수습할 경로도 없다 — unarchive 는 범위 밖이다. 그래서 REQ-ROOM-005 가 한 트랜잭션을 요구한다.

실패 판정은 트랜잭션 **안에서 방을 먼저 조회**하는 형태로 한다. `UPDATE ... changes === 0` 만 보는 원본 형태로는 "방이 없다"와 "이미 보관됐다"가 똑같이 0행이라 구분할 수 없는데, REQ-ROOM-006 이 그 둘을 다른 코드로 요구하기 때문이다.

```
트랜잭션 안에서:
  SELECT status FROM rooms WHERE id = ?
  행이 없음        → 'missing'  플래그 반환 (UPDATE 를 하지 않는다)
  status='archived' → 'conflict' 플래그 반환 (UPDATE 를 하지 않는다)
  그 외            → UPDATE rooms ... ; UPDATE bot_tokens ... ; 'ok' 반환
트랜잭션 밖에서:
  'missing'  → 404
  'conflict' → 409
  'ok'       → 200, 이어서 onArchive 훅 호출
```

두 실패 경로 모두 UPDATE 를 한 번도 실행하지 않으므로 REQ-ROOM-006 의 "어떤 토큰도 철회하지 않아야 한다"가 구조적으로 지켜진다. 두 번째 UPDATE 가 단독으로 실행되는 경로도 없다. 예외로 롤백하지 않고 플래그로 갈라 쓰는 것은 §E 의 위험 항목과 같은 이유다 — `better-sqlite3` 의 트랜잭션 함수에서 예외를 응답 분기로 쓰면 진단이 어려워진다.

### `onArchive` 훅은 자리만 만든다

`registerRoomRoutes(app, opts?)` 의 `onArchive` 는 이 SPEC 에서 **호출자가 없다.** `buildServer` 는 `registerRoomRoutes(app)` 로 인자 없이 부른다. 테스트만 훅을 주입한다.

미래를 위한 코드를 미리 만드는 것은 보통 안티패턴이지만, 여기서는 원본 Task 4 의 인터페이스 명세가 훅을 요구하고 원본 테스트가 그것을 검증한다. 훅을 나중에 붙이면 시그니처가 바뀌어 호출부를 다시 손봐야 한다. **자리만 만들고 동작은 만들지 않는다** — 훅 안에서 게이트웨이 연결을 끊는 일은 이후 카드 소관이고, 그 사실을 `spec.md` §5 에 명시했다.

훅은 트랜잭션 **밖**, 커밋 이후에 호출한다. 훅이 던지는 예외로 이미 확정된 보관이 되돌아가면 안 된다.

### `routes-bots.ts` 를 두 SPEC 이 나눠 쓴다

이 SPEC 은 `routes-bots.ts` 에 `registerBotRoutes` 와 등록·목록 두 라우트만 넣는다. SPEC-BOT-001 이 같은 파일에 초대 라우트 세 개와 `sha256Hex` 를 덧붙인다.

대안은 초대를 `routes-invites.ts` 로 떼는 것이었다. 채택하지 않은 이유: 원본 `plan-v2.md` 의 파일 구조가 `routes-bots.ts` 를 "봇 등록/목록 + 방 초대(토큰 발급)"로 못 박고 있고, 이 SPEC 의 REQ-ROOM-012 가 `server/src` 의 파일 목록을 여섯 개로 고정한다. 파일을 더 만들면 그 요구사항과 정면으로 부딪친다. **SPEC 분할이 파일 구조를 바꾸게 두지 않는다** — 분할은 문서의 사정이지 코드의 사정이 아니다.

여기서 파생되는 판단 하나를 명시한다. 원본 `REQ-AUTH-021` 은 `routes-bots.ts` 가 `registerBotRoutes` 와 `sha256Hex` 를 **함께** 내보낼 것을 요구했다. 이 SPEC 은 `sha256Hex` 를 가져오지 않는다. 그 함수는 토큰 해시 계약의 일부이고, 토큰 발급이 없는 상태에서 해시 함수만 내보내면 소비자 없는 죽은 코드가 된다. `sha256Hex` 의 정의와 그 계약(게이트웨이가 같은 함수를 재사용한다는 것)은 SPEC-BOT-001 이 통째로 가져간다.

## §D 원본 문서 모순과 해결

원본 `plan-v2.md` Task 4 와 `spec-v2.md` 를 대조하면서 발견한 것들 가운데 **방·봇 등록 범위 안에 드는 것만** 옮겼다. 인증 관련 모순은 SPEC-AUTH-001 의 `plan.md` 가, 초대·토큰 관련 모순은 SPEC-BOT-001 의 `plan.md` 가 가져간다.

| # | 모순 | 해결 |
|---|------|------|
| 1 | Task 4 의 `archives a room` 테스트에 `let archivedId = -1` 이 선언되고 `expect(archivedId).toBe(-1)` 로 끝난다. 어떤 코드도 이 변수를 바꾸지 않으므로 이 단언은 아무것도 검증하지 않는다 | 그 단언을 지우고, 훅 검증은 바로 다음 테스트 `calls onArchive hook when provided` 에 맡긴다. 죽은 단언을 남기면 "훅이 호출되지 않음"을 검증한다는 오해를 부른다 |
| 2 | 방 보관의 두 UPDATE(방 상태 / 토큰 철회)가 원본에서는 별개 문장이다 | `db.transaction()` 으로 묶는다 (§C). REQ-ROOM-005 가 한 트랜잭션을 요구하는 이유다 |
| 3 | Task 4 의 인터페이스 명세는 `opts: { onArchive?… }` 를 **필수** 인자로 쓰는데, 구현 코드는 `opts: {…} = {}` 기본값을 두고 `buildServer` 는 `registerRoomRoutes(app)` 로 인자 없이 부른다 | 구현 쪽을 따른다. 시그니처를 `opts?: { onArchive?: (roomId: number) => void }` 로 확정한다 (REQ-ROOM-001) |
| 4 | `POST /api/rooms` 의 응답 SELECT 가 `archived_at` 을 뽑지 않는데(`SELECT id, name, status, created_at`), `GET /api/rooms` 는 뽑는다. 같은 `Room` 타입인데 모양이 다르다 | 생성 응답도 `archived_at` 을 포함하도록 SELECT 를 맞춘다 (§B). 활성 방이므로 값은 `null` 이다. **이 해소를 지키는 장치를 요구사항과 기준 양쪽에 뒀다** — REQ-ROOM-003 이 다섯 키를 명시하고, AC-ROOM-001 이 `Object.keys(...).sort()` 로 단언한다. v0.1.0 에서는 "원본 테스트가 `status` 만 보므로 깨지지 않는다"에 기대고 있었는데, 그것이 바로 이 해소가 조용히 되돌아갈 수 있는 조건이었다 |
| 5 | 원본 테스트 `requires auth` 는 `GET /api/rooms` 하나만 확인한다. 나머지 네 경로의 `requireAuth` 누락은 잡히지 않는다 | AC-ROOM-008 이 다섯 경로 전부를 확인하도록 확장한다. 원본 테스트는 그대로 두고 새 테스트를 더한다 |
| 6 | 보관 시 토큰 철회를 요구하는데, 이 SPEC 에는 토큰을 만들 경로가 없다 — 요구사항은 있으나 이 SPEC 만으로는 실행 검증이 불가능하다 | 요구사항(REQ-ROOM-005)은 여기 둔다. 보관 라우트가 이 SPEC 의 산출물이기 때문이다. 검증은 둘로 나눈다 — 관측 가능한 절반(방 이동·`archived_at`)과 구조(트랜잭션 grep)는 AC-ROOM-003 이, 토큰이 실제로 죽는지는 `SPEC-BOT-001` 의 AC-BOT-008 이 맡는다. 통과할 수 없는 기준을 여기에 두지 않는다 |

### 7. [v0.2.0 교정] 보관과 초대의 실패 코드 — 원본으로부터의 의도적 이탈

**이 기록을 남기는 이유: 뒤에 이 문서를 읽는 사람이 원본과 다른 것을 보고 "원상 복구"하지 않게 하기 위해서다.** 아래는 실수가 아니라 판단이다.

원본은 두 라우트의 실패를 이렇게 정한다.

```
plan-v2.md:733  보관: if (r.changes === 0) return reply.code(404).send({ error: '활성 방을 찾을 수 없습니다' })
plan-v2.md:886  초대: if (!room)          return reply.code(403).send({ error: '활성 방이 아닙니다' })
```

여기에 세 가지 문제가 있다.

1. **어느 쪽도 "방이 없다"와 "방이 보관됐다"를 구분하지 못한다.** 두 조건이 한 분기로 합쳐져 있고 본문도 하나다. 사용자에게 보여 줄 문장을 클라이언트가 고를 수 없다.
2. **`403` 이 가리킬 대상이 이 시스템에 없다.** `403` 은 인증은 됐으나 권한이 없다는 뜻인데, 방별 접근 권한은 세 SPEC 이 모두 YAGNI 로 명시 배제했다(`spec.md` §5). 권한 차원이 없으므로 그 코드는 의미가 비어 있다.
3. **`404` 의 주어가 두 라우트에서 다르다.** 보관에서는 "방이 없다"인데, 초대에서는 "봇이 없다"이고 방이 없는 경우는 `403` 이었다. 상태 코드를 문구에 매핑하는 UI 가 한쪽에서 반드시 틀린 문장을 낸다.

**리드의 판정: 원본 계약 자체가 결함이다. 초대 실패는 "방이 없다"와 "방이 보관됐다"를 구분할 수 있어야 한다.** 그에 따라 두 SPEC 을 **같은 편집에서 함께** 고쳤다.

| 상황 | 원본 | 교정 후 |
|------|------|---------|
| 보관 — 방 없음 | `404` (보관됨과 합침) | `404` + "방을 찾을 수 없다" |
| 보관 — 이미 보관됨 | `404` (없음과 합침) | `409` + "이미 보관된 방" |
| 초대 — 방 없음 | `403` (보관됨과 합침) | `404` + "방을 찾을 수 없다" |
| 초대 — 방이 보관됨 | `403` (없음과 합침) | `409` + "보관된 방에는 초대할 수 없다" |
| 초대 — 봇 없음 | `404` | `404` + "봇을 찾을 수 없다" (본문으로 방 없음과 구분) |

규칙은 한 줄로 줄어든다 — **`404` 는 지목한 대상이 없다, `409` 는 대상은 있으나 그 상태에서는 할 수 없다.** `403` 은 이 시스템에서 쓰지 않는다.

영향 범위: 이 SPEC 의 REQ-ROOM-006·AC-ROOM-004·엣지 케이스 표·§B·§C, 그리고 `SPEC-BOT-001` 의 REQ-BOT-004·AC-BOT-005·엣지 케이스 표·§C·§D 5번. 원본 테스트 이름 `re-archiving returns 404` 와 `invite to archived room returns 403` 도 새 계약에 맞춰 바뀐다.

이것은 `SPEC-BOT-001` 이 §D 2번(하드코딩된 포트)에서 이미 한 것과 같은 종류의 이탈이다 — 원본의 의도는 지키고 그 의도를 무너뜨리는 구현 세부만 고친다.

### 8. [v0.3.0 교정] `config.dataDir` 지연 평가 — `SPEC-CORE-001` 산출물을 카드 `t2` 에서 수정

**카드 교차 이탈 기록. 이 카드의 소관이 아닌 파일을 이 카드에서 고쳤다.** 요약하면 이렇다 — **`SPEC-CORE-001` 산출물을 `t2` 에서 수정, 사유: `AC-ROOM-011` hermetic 보장.**

무엇이 문제였나. `server/src/config.ts` 에서 `dataDir` 만 게터가 아닌 **평범한 속성**이라 모듈이 처음 평가되는 순간 값이 굳었다. `dbPath` 와 `uploadsDir` 은 게터였으므로, 이 비대칭이 눈에 띄지 않았다.

```ts
// 교정 전
port: Number(process.env.MINIDISCORD_PORT ?? 3000),
dataDir: process.env.MINIDISCORD_DATA_DIR ?? './data',   // ← 모듈 로드 시점에 확정
get dbPath() { return `${this.dataDir}/minidiscord.db` },
```

그 결과 AC-ROOM-011 이 하는 일 — `process.env.MINIDISCORD_DATA_DIR = mkdtempSync(...)` 를 먼저 대입하고 `await import('../src/index.js')` 로 `buildServer` 를 부르는 것 — 이 **이 SPEC 시점에는 우연히 성립하고, `SPEC-BOT-001` 이 끝나는 순간 조용히 성립하지 않게** 된다. `rooms-bots.test.ts` 는 `../src/routes-bots.js` 를 정적으로 import 하고, `SPEC-BOT-001` 은 그 파일이 `config.js` 를 import 하도록 요구한다(§D 2번의 `inviteCommand(token, config.port)`). 정적 import 는 어떤 테스트 본문보다 먼저 평가되므로, 그때부터 `config.dataDir` 은 이미 `'./data'` 로 굳은 채이고 `buildServer()` 는 저장소 안의 진짜 데이터베이스를 연다. 이 SPEC 자신의 §H 안티패턴 "테스트에서 실제 `data/` 쓰기"를 이 SPEC 의 기준 하나가 어기는 상태가 된다.

**리드의 판정: 지금 고친다.** 카드 경계보다 hermetic 보장이 앞선다 — 뒤 카드로 미루면 `SPEC-BOT-001` 이 착수되는 순간 기준이 말없이 다른 것을 재기 시작한다. 고친 형태는 게터 한 줄이다.

```ts
// 교정 후 (server/src/config.ts, 이미 적용됨)
// 지연 평가: 테스트가 import 이후에 MINIDISCORD_DATA_DIR 을 설정해도 반영되도록 게터로 둔다
get dataDir() { return process.env.MINIDISCORD_DATA_DIR ?? './data' },
```

`dbPath` 와 `uploadsDir` 이 `this.dataDir` 을 읽으므로 세 값이 함께 지연 평가된다. 확인한 것: `npm test -w server` 가 3파일 5테스트 통과, 그리고 import 직후에는 `./data`, 이후 환경변수를 바꾸면 그 값이 반영되고 `dbPath` 가 거기서 파생되는 것을 직접 관측했다.

영향 범위: `SPEC-ROOM-001` 의 AC-ROOM-011, `SPEC-AUTH-001` 의 AC-AUTH-014(같은 지연 평가에 기대는 기준 — 그쪽 `acceptance.md` 가 이 항목을 참조한다), 그리고 `server/src/config.ts` 한 파일. **`SPEC-CORE-001` 의 요구사항 자체는 바뀌지 않는다** — 값의 의미는 그대로이고 평가 시점만 늦춘 것이다.

**남은 한계 (이번 라운드 범위 밖, 기록만).** 같은 파일 3행의 `port` 는 여전히 즉시 평가된다. 이 세 SPEC 중 어느 것도 import 이후에 `MINIDISCORD_PORT` 를 바꾸지 않으므로 — `SPEC-BOT-001` 의 AC-BOT-002 는 `config.port` 를 **읽어서 대조할 뿐** 설정하지 않는다 — 지금은 아무 기준도 이 한계에 걸리지 않는다. 뒤 카드에서 포트를 테스트가 바꿔 가며 서버를 띄우려 들면 그때 같은 결함이 재발하며, 그것은 새로 발견된 버그가 아니라 여기 적어 둔 알려진 한계다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| SPEC-AUTH-001 이 `app.db` 데코레이터를 선언하지 않은 채 이 SPEC 을 시작 | 두 라우트 모듈의 `req.server.db` 가 타입 오류. 전 테스트 실패 | §A 의 소비 목록을 run 단계 진입 전 체크리스트로 쓴다. `git log` 에서 SPEC-AUTH-001 의 커밋 3개를 먼저 확인한다 |
| 보관 트랜잭션 안에서 `404` 판정을 하다 `better-sqlite3` 트랜잭션 함수가 예외를 요구하는 형태와 어긋남 | 보관이 항상 500 이 되거나, 반대로 롤백 없이 진행 | `db.transaction()` 안에서 `changes === 0` 이면 플래그를 반환하고, 트랜잭션 밖에서 그 플래그로 응답을 갈라 쓴다. 예외로 롤백하지 않는다 |
| `onArchive` 훅이 던진 예외가 보관을 취소한 것처럼 보임 | 보관은 이미 커밋됐는데 응답은 500 — 사용자가 재시도하면 `404` | 훅은 트랜잭션 밖·커밋 이후 호출 (§C). 이 SPEC 에서 훅 주입자는 테스트뿐이라 실사용 노출은 없다 |
| `routes-bots.ts` 를 두 SPEC 이 나눠 쓰면서 SPEC-BOT-001 이 이 SPEC 의 코드를 덮어씀 | 봇 등록 테스트가 조용히 깨짐 | SPEC-BOT-001 은 파일을 **덧붙이는** 작업임을 §A 에 명시. `rooms-bots.test.ts` 의 기존 테스트가 회귀 감지기 역할을 한다 |
| `bots.name` 의 `UNIQUE` 위반을 `try/catch` 로 잡아 409 로 바꾸는데, 다른 DB 오류도 같이 409 가 된다 | 오진단 | 수용(원본 그대로). 이 테이블에 다른 제약이 없어 실제 오분류 경로가 없다. 보관의 상태 충돌 `409`(§D 7번)와는 다른 라우트이므로 뒤섞이지 않는다 |
| 범위 경계 검사를 `git diff HEAD` 로 하면 이미 커밋된 변경을 못 본다 | 이 SPEC 은 M1 이 커밋한 뒤 M2 에서 검사가 돌아 **실제로 무력하다.** M1 에서 컬럼을 더해 커밋하면 REQ-ROOM-013 이 거짓 통과한다 | `spec_base_sha`(M1 단계 0 에 기록) 기준으로 비교한다. plan-audit 이 이 SPEC 의 유일한 차단 결함(ROOM-B1)으로 지적한 항목이다 |
| 두 라우트 모듈을 내보내기만 하고 `buildServer` 에 등록하지 않음 | 테스트는 각자 인스턴스를 배선하므로 전부 통과하는데, 실제로 띄운 서버에는 방·봇 라우트가 없어 모든 요청이 `404` | REQ-ROOM-014 가 요구사항 층에서 요구하고, AC-ROOM-011 이 `buildServer()` 를 직접 불러 관측한다 |
| `config.port` 가 즉시 평가라 import 이후에 `MINIDISCORD_PORT` 를 바꿔도 반영되지 않는다 | 이 세 SPEC 은 포트를 바꾸지 않으므로 지금은 영향 없다. 뒤 카드가 포트를 테스트마다 달리 띄우려 들면 `dataDir` 이 겪은 것과 같은 결함이 재발한다 | 수용하되 기록. 필요해지는 시점에 `port` 도 게터로 바꾼다. 경위는 §D 8번에 있다 |
| `declare module 'fastify'` 의 `db` 선언이 `index.ts` 에 있는데 이 SPEC 의 라우트 모듈은 다른 파일에 있다 | 지금은 프로젝트 전체를 한 tsconfig 가 덮어서 문제없지만, 빌드를 나누면 `req.server.db` 가 타입 오류가 된다 | 수용하되 기록. 빌드를 나누게 되면 선언을 공용 타입 파일로 옮겨야 한다. `SPEC-AUTH-001` `plan.md` §E 에 같은 항목이 있다 |

## §F 마일스톤

우선순위 순서다. 앞 단계가 끝나야 다음을 시작할 수 있다 — M2 의 테스트가 M1 의 `build()` 헬퍼를 쓴다.

**진입 조건: SPEC-AUTH-001 이 `implemented` 이상이어야 한다.** `server/src/auth.ts` 가 없으면 M1 의 첫 테스트가 import 단계에서 죽고, 그 실패는 RED 증거가 아니라 순서 위반이다.

### M1 — 방 API (우선순위 High)

원본: `plan-v2.md` Task 4 Step 1-3 의 rooms 부분.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-ROOM-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` `§E.1` 에 적는다. M2 단계 6 의 범위 경계 검사가 이 값을 기준으로 비교한다 — `HEAD` 기준으로는 M1 커밋 이후 아무것도 잡지 못한다.
1. `server/test/rooms-bots.test.ts` 작성 — 파일 뼈대(`beforeEach` / `afterEach` / `build()`)와 `describe('rooms', …)` 4건. §D 1번에 따라 `archivedId` 죽은 단언은 옮겨 적지 않는다. AC-ROOM-002 / 003 / 004 / 008 의 테스트도 여기서 함께 넣는다. **`build()` 는 `{ app, cookie }` 를 돌려주는 이 SPEC 의 헬퍼다** — `SPEC-BOT-001` 의 모든 시나리오가 이것을 이어 쓴다. `SPEC-AUTH-001` 이 `auth.test.ts` 에 둔 동명의 헬퍼(`app` 만 반환)를 가져다 쓰는 것이 아니다.
2. **RED 확인**: `npm test -w server` → `Cannot find module '../src/routes-rooms.js'` 로 실패. 출력 기록.
3. `server/src/routes-rooms.ts` 구현 — 목록/생성/보관. 보관은 §C 에 따라 트랜잭션 안에서 방을 먼저 조회해 `missing`/`conflict`/`ok` 로 갈라 `404`/`409`/`200` 을 내고(§D 7번), 커밋 후 `onArchive` 훅을 호출한다. 생성 응답 SELECT 는 §D 4번에 따라 `archived_at` 을 포함해 다섯 키를 채운다.
4. `buildServer` 에 `registerRoomRoutes(app)` 등록 (REQ-ROOM-014).
5. **GREEN 확인**: `npm test -w server` → rooms 테스트 전부 통과. `npm run typecheck -w server` → 종료 코드 0.
6. 커밋: `feat: room API with archive and onArchive hook`

수용 기준: AC-ROOM-001..005, AC-ROOM-008(방 경로 세 개), AC-ROOM-010(전이 1-2).

### M2 — 봇 등록 API (우선순위 High)

원본: `plan-v2.md` Task 4 Step 1-3 의 bots 부분.

1. `server/test/rooms-bots.test.ts` 에 `describe('bots', …)` 추가 — 원본 1건 + AC-ROOM-007 의 1건. AC-ROOM-008 의 목록에 봇 경로 두 개를 더한다.
2. **RED 확인**: `npm test -w server` → `routes-bots.js` 모듈 없음으로 실패. 출력 기록.
3. `server/src/routes-bots.ts` 구현 — `GET`/`POST /api/bots` 만. §C 에 따라 `sha256Hex` 와 초대 라우트는 넣지 않는다.
4. `buildServer` 에 `registerBotRoutes(app)` 등록 (REQ-ROOM-014). AC-ROOM-011 의 테스트를 여기서 함께 넣는다 — 두 모듈이 다 등록된 뒤라야 관측할 수 있다.
5. **GREEN 확인**: `npm test -w server` → 전체 통과. typecheck 0.
6. 범위 경계 확인 (AC-ROOM-009): `ls server/src` 가 여섯 파일만 보이는지 본다. 이어서 `git rev-parse --verify "$(cat .moai/specs/SPEC-ROOM-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 확인하고, 그 SHA 를 넣은 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이면서 비어 있는지 본다. **`HEAD` 를 기준으로 쓰지 않는다** — M1 이 이미 커밋했으므로 그 기준으로는 아무것도 잡히지 않는다. **빈 출력 하나만 보고 통과로 적지 않는다** — 단계 0 을 건너뛰어 기준 SHA 가 없을 때도 표준 출력은 비어 있다.
7. 커밋: `feat: bot registry API`

수용 기준: AC-ROOM-006, 007, 009, 011, AC-ROOM-008(봇 경로 두 개), AC-ROOM-010(전이 3-4).

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-ROOM-001..011 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

AC-ROOM-003 의 토큰 철회 절반은 이 SPEC 에서 **구조로만** 확인한다. `§E.2` 에 "토큰 철회 동작은 SPEC-BOT-001 에서 검증 — 이 SPEC 에서는 미검증"으로 남긴다. 관측하지 않은 것을 관측했다고 적지 않는다.

## §H 안티패턴 (하지 말 것)

- **스키마 변경** — `db.ts` 의 `SCHEMA` 에 컬럼을 더하지 않는다. REQ-ROOM-013 이 금지하고, 필요하면 진행을 멈추고 보고한다.
- **인증 재정의** — `requireAuth` 를 이 SPEC 안에서 다시 만들거나 고치지 않는다. SPEC-AUTH-001 의 산출물을 그대로 import 한다. 고쳐야 할 것이 보이면 멈추고 보고한다.
- **범위 선반영** — "어차피 다음 SPEC 에서 필요하니까" `sha256Hex` 나 초대 라우트 스텁을 미리 만들지 않는다. AC-ROOM-009 와 Definition of Done 이 기계적으로 잡는다.
- **`onArchive` 훅에 동작 채우기** — 훅은 자리만이다. 게이트웨이 연결 끊기를 여기서 구현하지 않는다.
- **보관의 두 UPDATE 를 분리** — 편의를 위해 트랜잭션을 풀지 않는다. §C 가 그 이유다.
- **보관 실패를 `404` 하나로 되돌리기** — `if (r.changes === 0) return 404` 는 원본 형태이지만, 그렇게 하면 "방이 없다"와 "이미 보관됐다"를 구분할 수 없다. §D 7번이 의도적 이탈로 기록한 결정이고, AC-ROOM-004 가 두 코드와 두 본문을 모두 단언한다.
- **`buildServer` 등록 건너뛰기** — 테스트가 각자 `registerRoomRoutes(app)` 를 부르므로 등록을 빼먹어도 대부분의 기준이 통과한다. 그러면 실제로 띄운 서버에 방·봇 라우트가 없다. AC-ROOM-011 이 이 경로를 막는다.
- **`git diff HEAD` 로 범위 경계 검사** — M1 커밋 뒤에는 항상 빈 출력이라 아무것도 잡지 못한다. `spec_base_sha` 를 기준으로 비교한다 (M1 단계 0).
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 가 종료 코드 `0` 으로 SHA 를 내는 것을 먼저 확인한다 (AC-ROOM-009).
- **통과할 수 없는 수용 기준 추가** — 토큰 발급이 없는 상태에서 "활성 토큰 1 → 0" 을 이 SPEC 의 기준으로 쓰지 않는다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-ROOM-010 의 전이 증거를 만들 수 없다.
- **테스트에서 실제 `data/` 쓰기** — 모든 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다.
- **`config.dataDir` 을 다시 평범한 속성으로 되돌리기** — 게터여야 테스트가 import 이후에 설정한 `MINIDISCORD_DATA_DIR` 이 반영된다. 되돌리면 AC-ROOM-011 과 AC-AUTH-014 가 저장소의 진짜 `data/` 를 열면서도 통과한다. §D 8번이 의도적 수정으로 기록한 결정이다.
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않으므로, 이름 붙은 테스트를 하나도 쓰지 않아도 `npm test -w server` 는 종료 코드 `0` 이다. 이름 붙은 테스트의 통과는 `npm test -w server -- --reporter=verbose` 출력에서 `✓ test/<파일> > <describe 이름> > <테스트 이름>` 줄을 직접 보고 판정한다. `--reporter=verbose` 를 불필요한 플래그로 여겨 빼지 않는다. `-t <이름>` 필터로 대신하지도 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다 (3차 보고서 D1).

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md`, `spec-v2.md` — **이 SPEC 의 유일한 규범 근거**(읽기 전용). 같은 디렉터리의 `plan.md`·`spec.md` 는 폐기된 v1 이며 참조하지 않는다.
- `spec.md` — 이 SPEC 의 GEARS 요구사항(REQ-ROOM-001..014)과 범위 경계
- `acceptance.md` — AC-ROOM-001..011
- `.moai/reports/plan-audit/t2-3spec-audit.md` — 이 SPEC 을 FAIL(0.74)로 판정한 1차 plan-audit 보고서. v0.2.0 교정 라운드의 근거다
- `.moai/reports/plan-audit/t2-3spec-audit-iter2.md` — 이 SPEC 을 PASS(0.88)로 판정한 2차 plan-audit 보고서. v0.3.0 교정 라운드(R1·R2)의 근거다
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 — 원본 (읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·5장 — 기능 요구사항, 데이터 모델
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `openDb`, 스키마)
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (`requireAuth`, 세션 쿠키, `app.db`)
- `.moai/specs/SPEC-BOT-001/` — 후행 SPEC (초대·토큰 발급, `sha256Hex`)
