# SPEC-CORE-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan.md` Task 1-2 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 와 §B 가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.

---

## §A 되돌리기 어려운 결정 — 데이터 모델

DB 스키마는 이 SPEC에서 가장 되돌리기 비싼 결정이다. 여덟 개 테이블이 이후 여섯 개 카드 전부의 기반이 되고, 한 번 데이터가 들어간 뒤에는 마이그레이션 도구 없이 바꿀 수 없다(이 SPEC은 마이그레이션 도구를 만들지 않는다).

확정된 사항 — 원본 `spec.md` 5장과 `plan.md` Task 2 의 SQL을 **그대로** 쓴다.

| 테이블 | 이 SPEC에서 고정하는 것 | 이후 카드가 쓰는 방식 |
|--------|------------------------|----------------------|
| `users` | `username UNIQUE`, `password_hash` | t2 인증 |
| `sessions` | `token PRIMARY KEY`, `user_id` FK | t2 세션 쿠키 |
| `rooms` | `status CHECK ('active','archived')` | t3 방 보관 |
| `bots` | `name UNIQUE`, 페르소나 내용 없음 | t3 봇 등록 |
| `bot_tokens` | `(room_id, bot_id)` 조합 + `token_hash UNIQUE` + `last_delivered_id` 커서 | t3 초대, t5 재접속 재전송 |
| `messages` | `author_type CHECK ('user','bot','system')` | t4 메시지 |
| `message_targets` | `delivery CHECK ('to','cc')` | t4 멘션 라우팅 |
| `attachments` | `stored_path` — 파일 본문은 DB에 넣지 않음 | t4 첨부 |

검토 시 이 표가 확인 대상이다. 여기서 컬럼 하나를 놓치면 이후 카드가 스키마 변경을 요구하게 된다.

**의도적으로 넣지 않은 것** — 봇 온라인/오프라인 상태 컬럼. 원본 spec 5장이 명시하듯 접속 여부는 게이트웨이의 메모리(WebSocket 연결)로 판단하고 DB에 두지 않는다. `last_seen_at` 은 표시용일 뿐 상태 판정에 쓰지 않는다.

## §B 되돌리기 어려운 결정 — 두 개의 타입 계약

이후 모든 카드가 이 두 시그니처에 결합된다. 시그니처를 바꾸면 그 카드 전부가 영향을 받는다.

```ts
// server/src/index.ts
export async function buildServer(): Promise<FastifyInstance>

// server/src/db.ts
export type Db = Database.Database
export function openDb(path: string): Db
```

세 가지 결정이 여기 묻혀 있다.

1. **`buildServer` 는 비동기다.** 지금은 동기여도 되지만, 이후 카드가 플러그인 등록(`@fastify/cookie`, `@fastify/multipart`, `@fastify/static`)을 `await` 해야 한다. 나중에 `FastifyInstance` → `Promise<FastifyInstance>` 로 바꾸면 모든 호출부가 깨진다. 처음부터 비동기로 둔다.
2. **`buildServer` 는 DB를 인자로 받지 않는다.** Task 3부터 DB 주입 방식이 정해진다. 이 SPEC에서 인자를 추가하면 아직 근거 없는 결정을 굳히는 셈이므로, 인자 없는 형태로 시작한다.
3. **`openDb` 는 경로를 인자로 받는다** — `config.dbPath` 를 내부에서 읽지 않는다. 테스트가 임시 디렉터리를 넘길 수 있어야 하고, 실제로 `db.test.ts` 가 그렇게 한다.

## §C 되돌리기 쉬운 결정 — 설정 객체 형태

`config` 는 `dbPath` / `uploadsDir` 를 getter 로 파생시킨다. 원본 plan.md 의 형태를 그대로 쓴다.

```ts
export const config = {
  port: Number(process.env.MINIDISCORD_PORT ?? 3000),
  dataDir: process.env.MINIDISCORD_DATA_DIR ?? './data',
  get dbPath() { return `${this.dataDir}/minidiscord.db` },
  get uploadsDir() { return `${this.dataDir}/uploads` },
}
```

이 결정은 되돌리기 쉽다. 소비자가 아직 없고, 나중에 함수 형태(`loadConfig()`)로 바꿔도 호출부가 한두 곳이다. 지금은 원본을 따른다.

## §D 알려진 이슈와 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| `better-sqlite3` 는 네이티브 모듈이라 Node 버전/플랫폼에 따라 빌드가 필요하다 | 설치 실패 시 M2 전체가 막힌다 | M1 설치 단계에서 즉시 확인. 실패 시 진행하지 말고 차단 보고 |
| `NodeNext` + `type: module` 조합에서 상대 import 는 `.js` 확장자를 붙여야 한다 (`'../src/index.js'`) | 확장자 누락 시 모듈 해석 실패 | 원본 테스트 코드가 이미 `.js` 를 쓴다. 그대로 복사 |
| vitest 가 TypeScript 를 별도 설정 없이 처리하는지 | 테스트 실행 실패 | vitest 는 esbuild 로 TS 를 처리한다. 별도 설정 파일 없이 시작하고, 실패하면 최소 `vitest.config.ts` 추가 |
| AC-CORE-007 의 인라인 `tsx -e` 실행이 워크스페이스 경로 해석에 걸릴 수 있다 | 수용 기준 검증 방법 변경 | `acceptance.md` AC-CORE-007 에 대체 경로(테스트 파일화)를 이미 명시 |

## §E 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-CORE-001..015 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다(M2 의 테스트가 M1 의 워크스페이스 위에서 돈다).

### M1 — 워크스페이스 스캐폴드와 헬스 체크 (우선순위 High)

원본: `plan.md` Task 1 Step 1-6.

1. 루트 `package.json` (`private`, `workspaces: ["server","channel"]`), `server/package.json`, `server/tsconfig.json`, `.gitignore` 작성.
2. 의존성 설치:
   ```bash
   npm install -w server fastify @fastify/cookie @fastify/multipart @fastify/static better-sqlite3 ws
   npm install -w server -D typescript tsx vitest @types/node @types/better-sqlite3 @types/ws
   ```
   `better-sqlite3` 빌드 실패는 즉시 차단 보고 대상이다.
3. `server/test/health.test.ts` 작성 (원본 Task 1 Step 2 의 본문 그대로).
4. **RED 확인**: `npm test -w server` → `Cannot find module '../src/index.js'` 로 실패. 출력 기록.
5. `server/src/config.ts` + `server/src/index.ts` 구현 (원본 Task 1 Step 4 본문 그대로).
6. **GREEN 확인**: `npm test -w server` → 1 test 통과. `npm run typecheck -w server` → 종료 코드 0.
7. 커밋: `chore: scaffold workspace with server health endpoint`

수용 기준: AC-CORE-001, 002, 003, 004, 008, 013, 014(전이 1-2), 015.

### M2 — SQLite 스키마 (우선순위 High)

원본: `plan.md` Task 2 Step 1-5.

1. `server/test/db.test.ts` 작성 (원본 Task 2 Step 1 본문 그대로 — `creates all tables`, `is idempotent (reopen same file)` 두 테스트).
2. **RED 확인**: `npm test -w server` → `Cannot find module '../src/db.js'` 로 실패. 출력 기록.
3. `server/src/db.ts` 구현 — `SCHEMA` 상수의 SQL은 원본 Task 2 Step 3 을 **한 글자도 바꾸지 않고** 복사한다. `openDb` 는 연결 → `pragma('journal_mode = WAL')` → `exec(SCHEMA)` 순서.
4. **GREEN 확인**: `npm test -w server` → 3 tests (health 1 + db 2) 통과.
5. 커밋: `feat: sqlite schema for users/rooms/bots/tokens/messages`

수용 기준: AC-CORE-005, 006, 007, 009, 010, 011, 012, 014(전이 3-4).

## §G 안티패턴 (하지 말 것)

- **스키마 "개선"** — 원본 SQL 에 컬럼을 더하거나 이름을 다듬지 않는다. 이후 카드가 그 이름에 결합된다. 개선이 필요해 보이면 진행을 멈추고 보고한다.
- **범위 선반영** — "어차피 다음 카드에서 필요하니까" 인증 라우트나 SSE 스텁을 미리 만들지 않는다. AC-CORE-012 가 이것을 기계적으로 잡는다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰고 테스트를 나중에 붙이면 AC-CORE-014 의 전이 증거를 만들 수 없다.
- **`config` 를 `db.ts` 에서 읽기** — `openDb` 는 경로를 인자로 받는다. 내부에서 `config.dbPath` 를 읽으면 테스트가 임시 DB 를 못 쓴다.
- **데이터 디렉터리를 코드 디렉터리에 두기** — `data/` 는 `.gitignore` 대상이고, 그 밖 어디에도 DB 파일을 만들지 않는다.

## §H 상호 참조

- `spec.md` — 이 SPEC의 GEARS 요구사항과 범위 경계
- `acceptance.md` — AC-CORE-001..015
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan.md` Task 1-2 — 원본 (읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec.md` 5장 — 데이터 모델 근거
