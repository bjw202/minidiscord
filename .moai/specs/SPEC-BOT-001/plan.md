# SPEC-BOT-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5 이며, 그 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M2`(카드 `t2`)와는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t2` 는 하나이지만 Tier M SPEC 세 개를 낸다. 순서는 고정이고, 앞 SPEC이 끝나야 다음이 시작된다.

```
SPEC-AUTH-001 → SPEC-ROOM-001 → SPEC-BOT-001 (이 SPEC)
```

이 SPEC이 선행 SPEC에서 **정확히 무엇을 받아 쓰는지**:

| 선행 SPEC | 받아 쓰는 것 | 이 SPEC에서의 쓰임 |
|-----------|-------------|-------------------|
| `SPEC-AUTH-001` | `requireAuth(req, reply)` preHandler | 초대 세 라우트의 `preHandler: [requireAuth]` |
| `SPEC-AUTH-001` | `md_session` 쿠키와 로그인 흐름 | 테스트 헬퍼 `build()` 가 돌려주는 `cookie` |
| `SPEC-AUTH-001` | `app.db` / `req.server.db` 데코레이터 | 초대 라우트가 쓰는 유일한 DB 접근 경로 |
| `SPEC-ROOM-001` | `registerBotRoutes(app)` 모듈 (`server/src/routes-bots.ts`) | 이 SPEC은 이 함수 **안에** 초대 라우트를 추가한다 |
| `SPEC-ROOM-001` | `POST /api/bots`, `POST /api/rooms`, `POST /api/rooms/:id/archive` | 모든 테스트의 사전 준비 단계 |
| `SPEC-CORE-001` | `bot_tokens` 테이블, `config.port` | 토큰 저장처, 실행 명령 안내의 포트 |

선행 SPEC이 아직 `implemented` 가 아니면 이 SPEC의 어떤 테스트도 실행할 수 없다. run 단계 진입 전 확인 대상이다.

## §B 되돌리기 어려운 결정 — 봇 토큰 계약

이 SPEC에서 가장 되돌리기 비싼 결정이다. 카드 `t3` 의 게이트웨이가 이 계약에 직접 결합하고, 한 번 토큰을 발급한 뒤에 형식을 바꾸면 이미 발급된 모든 초대가 무효가 된다.

확정 사항:

| 항목 | 값 | 왜 여기서 고정하는가 |
|------|-----|---------------------|
| 평문 토큰 | `randomBytes(32).toString('hex')` → 소문자 hex 64자 | 게이트웨이 `hello { token }` 의 값 형식이 된다 |
| 저장 형식 | `sha256Hex(token)` 만 `bot_tokens.token_hash` 에 저장 | `spec-v2.md` 9장 "토큰은 해시 저장, 철회 가능" |
| 조회 함수 | `sha256Hex(s: string): string` 을 `routes-bots.ts` 에서 내보냄 | 게이트웨이가 같은 함수를 재사용해야 해시 방식이 갈라지지 않는다 |
| 노출 시점 | 초대 생성 응답 **한 번만** | 목록 조회에 토큰이 없으므로 유출 표면이 발급 순간으로 제한된다 |
| 유효성 판정 | `revoked_at IS NULL` | 만료 시각 컬럼이 없다 — 철회만이 무효화 경로다 |

**의도적으로 넣지 않은 것** — 토큰 만료(TTL). 원본 데이터 모델에 만료 컬럼이 없고, 무효화 경로는 두 가지(재초대 시 자동 철회, 방 보관 시 일괄 철회)로 충분하다. TTL 을 넣으려면 스키마를 바꿔야 하는데 그것은 REQ-BOT-009 가 금지한다.

검토 시 이 표가 확인 대상이다. 여기서 형식 하나를 바꾸면 `t3` 의 게이트웨이 인증 코드가 함께 바뀐다.

## §C 되돌리기 어려운 결정 — 사람이 보는 계약

브라우저(카드 `t5`)와 사용자가 직접 마주하는 표면이라, 확정 뒤에는 UI 코드가 여기에 결합한다.

### HTTP 상태 코드 표

| 라우트 | 성공 | 실패와 코드 |
|--------|------|-------------|
| `POST /api/rooms/:id/invites` | 201 | 활성 방 아님 403 / 봇 없음 404 / 미인증 401 |
| `GET /api/rooms/:id/invites` | 200 | 미인증 401 |
| `DELETE /api/rooms/:id/invites/:botId` | 200 | 미인증 401 (그 외 없음 — 멱등) |

의도적 비대칭 하나: 방이 없을 때 `SPEC-ROOM-001` 의 보관은 `404` 인데 이 SPEC의 초대는 `403` 이다. 보관은 "그런 활성 방이 없다"는 조회 실패이고, 초대는 "방은 있는데 보관돼서 안 된다"가 주된 경우라 권한 거절로 읽는 편이 사용자에게 맞다. 원본 Task 4-5 의 코드와 테스트가 그렇게 돼 있어 그대로 따른다.

### 실행 명령 안내 문자열

초대 응답의 `command` 는 사용자가 터미널에 그대로 붙여 넣는 여러 줄 문자열이다. 형태:

```
# 1회 등록 (최초 한 번만):
claude mcp add --scope user minidiscord-channel -- minidiscord-channel

# 세션 실행 (원하는 페르소나 디렉터리에서):
export MINIDISCORD_TOKEN=<64자리 hex>
export MINIDISCORD_SERVER=ws://127.0.0.1:<port>/bot
claude --dangerously-load-development-channels server:minidiscord-channel
```

`<port>` 는 **`config.port` 에서 읽는다** — §D 2번의 결정이다.

## §D 원본 문서 모순과 해결

원본 `plan-v2.md` Task 5 와 `spec-v2.md` 를 대조하면서 발견한 것들이다. 1번과 2번은 여기서 해소하고, 3번은 **의도적으로 미해결 상태로 보존**한다.

### 1. 타입 불일치 — `online: false` 대 `0 AS online`

Task 5 의 `lists invites without token` 테스트는 다음을 기대한다.

```ts
expect(list.json()).toEqual([{ bot_id: bot.id, bot_name: 'pm', online: false }])
```

그런데 같은 Task 의 구현 SQL 은 정수를 반환한다.

```sql
SELECT t.bot_id, b.name AS bot_name, 0 AS online ...
```

SQLite 에는 불리언 타입이 없어 `0 AS online` 은 자바스크립트로 정수 `0` 이 되어 나온다. `toEqual` 은 값 동등성을 엄격히 보므로 `0 !== false` 로 실패한다. **원본 코드를 그대로 옮겨 적으면 테스트가 깨진다.**

**해결**: 라우트가 SQL 결과를 매핑해 `online` 을 불리언으로 바꿔 내보낸다. 원본 테스트는 손대지 않는다.

```ts
const rows = req.server.db.prepare(`SELECT t.bot_id, b.name AS bot_name FROM bot_tokens t ...`).all(roomId) as { bot_id: number; bot_name: string }[]
// 이 SPEC 범위에서 online 은 항상 false — 실제 판정은 카드 t3 게이트웨이가 채운다
return rows.map(r => ({ ...r, online: false }))
```

그리고 AC-BOT-006 이 `typeof list[0].online === 'boolean'` 을 단언한다. `toEqual` 만으로는 나중에 누군가 SQL 로 되돌려도 다른 방식으로 통과할 여지가 있어서, 타입 자체를 못 박는 단언을 따로 둔다.

### 2. 하드코딩된 포트 — `inviteCommand(token, port = 3000)`

원본 구현은 포트를 기본 인자로 두고 호출부에서 넘기지 않는다.

```ts
function inviteCommand(token: string, port = 3000): string { ... }
// 호출부: inviteCommand(token)   ← 포트를 넘기지 않는다
```

`MINIDISCORD_PORT` 를 3000 이 아닌 값으로 띄운 서버에서는 사용자에게 **틀린 `ws://` 주소를 안내**하게 되고, 채널이 접속에 실패한 뒤에야 드러난다.

**해결**: 호출부에서 `config.port` 를 넘긴다.

```ts
import { config } from './config.js'
// ...
return reply.code(201).send({ ..., command: inviteCommand(token, config.port) })
```

**이것은 원본 코드로부터의 의도적 이탈이다.** 원본의 의도(같은 머신, 로컬 접속, `127.0.0.1`)는 그대로 유지하고 포트만 실제 설정에서 가져온다. AC-BOT-002 가 `config.port` 를 import 해 문자열과 대조하므로 하드코딩으로 되돌아가면 즉시 실패한다.

### 3. [미해결 — 보존] 채널 설정 전달 방식: 실행 인자 대 환경변수

`spec-v2.md` 4-B 는 채널이 `--token` / `--server` **실행 인자**로 설정을 받는다고 쓴다. 그런데 같은 문서의 Global Constraints 20행과 Task 5 의 명령 문자열은 **환경변수만** 쓴다.

```
- 채널 플러그인은 무상태: ... 설정(토큰·서버 주소)은 환경변수
  MINIDISCORD_TOKEN, MINIDISCORD_SERVER(기본 ws://127.0.0.1:3000/bot)로만 받는다.
```

**리드의 판정: 지금은 Global Constraints 가 우선한다.** 제약이 4-B 의 예시보다 강한 규범이고, Task 5 의 실제 코드도 환경변수 쪽이다. 이 SPEC의 `command` 문자열은 `export MINIDISCORD_TOKEN=...` / `export MINIDISCORD_SERVER=...` 형태로 간다.

**이 기록은 지우지 않고 그대로 남긴다.** 카드 `t4` 에서 채널 계약을 실제로 구현할 때 재확인 대상이다. 그 시점에 채널이 실행 인자를 받도록 만들어지면 이 SPEC의 안내 문자열도 함께 바뀌어야 하고, 그때는 계약 변경이므로 Global Constraints 24행에 따라 임의로 바꾸지 말고 중단하고 보고해야 한다. 이 SPEC 안에서 다르게 해소하지 않는다.

### 4. `sha256Hex` 의 소유권이 두 SPEC에 걸쳐 있다

원본 Task 4 의 Interfaces 항목은 "`routes-bots.ts` 는 `registerBotRoutes` 와 `sha256Hex` 를 내보낸다"고 선언한다. 그런데 `sha256Hex` 의 **실제 본문은 Task 5**, 즉 이 SPEC에 있다.

**해결**: 함수 선언과 구현 모두 이 SPEC이 작성한다. `SPEC-ROOM-001` 은 `sha256Hex` 를 자신의 범위 밖으로 명시해 이 SPEC에 넘겼다(그 SPEC `spec.md` §5 `### Out of Scope — 봇 초대와 토큰 발급`). 그 단계에는 토큰 발급 경로가 없어 호출자도 없으므로, 거기 두면 소비자 없는 죽은 코드가 된다. 두 SPEC 의 결론이 일치하므로 중복 구현 위험은 없다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| 선행 SPEC 미완료 상태에서 착수 | `build()` 헬퍼도 `POST /api/rooms` 도 없어 모든 테스트가 준비 단계에서 실패한다 | §A 의 의존 표를 M1 시작 전 체크리스트로 쓴다 |
| `online` 을 SQL 로 되돌림 | `toEqual` 은 통과시키는 다른 형태가 있을 수 있어 조용히 재발할 수 있다 | AC-BOT-006 이 `typeof` 를 직접 단언 |
| `inviteCommand` 포트를 기본 인자로 되돌림 | 기본 포트 환경에서는 테스트가 통과해 버려 발견이 늦다 | AC-BOT-002 가 `config.port` 를 import 해 대조 |
| 철회와 삽입이 별개 문장 | 동시에 같은 (방, 봇) 을 두 번 초대하면 이론적으로 활성 토큰 2개 | 단일 사용자·소수 그룹 전제로 수용. 원본 그대로 |
| 테스트가 `bot_tokens` 를 직접 SQL 로 세는 단언을 쓴다 | 구현 세부(테이블 이름)에 결합 | 수용. 토큰이 응답에 안 나오므로 활성 토큰 수를 볼 다른 경로가 없다 |
| AC-BOT-008 이 다른 SPEC의 버그로 실패 | 이 SPEC 구현자가 `routes-bots.ts` 를 고치려 들 수 있다 | AC-BOT-008 본문이 "고칠 곳은 `routes-rooms.ts`" 라고 못 박는다 |

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다 — M2 의 목록·철회 테스트가 M1 의 발급 라우트를 쓴다.

### M1 — 초대 발급 (우선순위 High)

원본: `plan-v2.md` Task 5 Step 1-4 중 발급 경로.

1. `server/test/rooms-bots.test.ts` 에 `describe('invites', ...)` 를 추가하고 발급 관련 테스트를 쓴다 — 원본의 `invites a bot and returns one-time token + command`, `re-inviting same bot revokes old token and issues new one`, `invite to archived room returns 403`, 그리고 AC-BOT-002 / AC-BOT-005 / AC-BOT-011 의 추가 테스트.
2. **RED 확인**: `npm test -w server` → 새 테스트가 `404`(라우트 미등록)로 실패. 출력 기록.
3. `server/src/routes-bots.ts` 에 추가 — `sha256Hex`, `inviteCommand(token, port)`, `POST /api/rooms/:id/invites`. 포트는 §D 2번에 따라 `config.port` 를 넘긴다.
4. **GREEN 확인**: `npm test -w server` → 발급 테스트 전부 통과. `npm run typecheck -w server` → 종료 코드 0.
5. 커밋: `feat: bot invite API issuing one-time gateway token`

수용 기준: AC-BOT-001, 002, 004, 005, 011, AC-BOT-010(전이 1-2).

### M2 — 초대 목록·철회와 교차 검증 (우선순위 High)

원본: `plan-v2.md` Task 5 Step 1-4 중 목록·철회 경로.

1. 같은 테스트 파일에 목록·철회 테스트를 추가한다 — 원본의 `lists invites without token`, 그리고 AC-BOT-003 / AC-BOT-006 / AC-BOT-007 / AC-BOT-008 의 테스트.
2. **RED 확인**: `npm test -w server` → 새 테스트 실패. 출력 기록.
3. `routes-bots.ts` 에 추가 — `GET /api/rooms/:id/invites`(§D 1번에 따라 `online` 을 불리언으로 매핑), `DELETE /api/rooms/:id/invites/:botId`.
4. **GREEN 확인**: `npm test -w server` → 전체 통과. typecheck 0.
5. 범위 경계 확인: `ls server/src` 가 여섯 파일만 보이는지, `git diff --stat HEAD -- server/src/db.ts` 가 비어 있는지, `git diff --name-only` 의 소스 변경이 `routes-bots.ts` 하나뿐인지 (AC-BOT-009).
6. 커밋: `feat: bot invite listing and idempotent revocation`

수용 기준: AC-BOT-003, 006, 007, 008, 009, AC-BOT-010(전이 3-4).

> AC-BOT-008 이 실패하면 이 SPEC이 아니라 `SPEC-ROOM-001` 의 보관 트랜잭션 결함이다. 그 경우 `routes-bots.ts` 를 고치지 말고 블로커로 보고한다.

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-BOT-001..011 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문
- 그 명령의 출력(요약이 아닌 실제 출력)
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **스키마 변경** — `db.ts` 의 `SCHEMA` 에 컬럼을 더하지 않는다. 토큰 만료가 필요해 보여도 마찬가지다. REQ-BOT-009 가 금지하고, 필요하면 진행을 멈추고 보고한다.
- **새 소스 파일 생성** — `gateway.ts` 스텁을 미리 만들지 않는다. "어차피 `t3` 에서 필요하니까"가 가장 흔한 이유이고, AC-BOT-009 가 기계적으로 잡는다.
- **평문 토큰 저장** — 편의를 위해 `bot_tokens` 에 평문 컬럼을 두지 않는다. 해시만 저장하고, 평문은 응답 이후 서버 메모리에도 남기지 않는다.
- **`online` 을 SQL 결과 그대로 흘려보내기** — `0 AS online` 은 정수 `0` 이다. 매핑을 생략하면 §D 1번의 불일치가 그대로 재발한다.
- **포트 하드코딩** — `inviteCommand(token)` 처럼 포트를 안 넘기면 기본 포트 환경에서만 맞는 안내가 나간다.
- **다른 SPEC의 결함을 이 SPEC에서 고치기** — AC-BOT-008 이 실패하면 `routes-rooms.ts` 의 문제다. 여기서 우회 코드를 넣지 않는다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-BOT-010 의 전이 증거를 만들 수 없다.
- **테스트에서 실제 `data/` 쓰기** — 모든 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다.
- **채널 계약 손대기** — §D 3번은 미해결로 보존된 기록이다. 이 SPEC에서 `--token` / `--server` 실행 인자 방식으로 바꾸지 않는다.

## §I 상호 참조

- `spec.md` — 이 SPEC의 GEARS 요구사항(REQ-BOT-001..009)과 범위 경계
- `acceptance.md` — AC-BOT-001..011
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5 — 원본 (읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 5·7·9장 — 데이터 모델, 봇 초대 흐름, 보안
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (인증)
- `.moai/specs/SPEC-ROOM-001/` — 선행 SPEC (방·봇 등록)
