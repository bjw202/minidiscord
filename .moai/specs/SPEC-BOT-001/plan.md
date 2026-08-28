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
| `SPEC-AUTH-001` | `md_session` 쿠키와 로그인 흐름 | `SPEC-ROOM-001` 이 `rooms-bots.test.ts` 에 만든 `{ app, cookie }` 헬퍼가 그 흐름으로 쿠키를 얻는다 |
| `SPEC-ROOM-001` | 테스트 헬퍼 `build()` (`{ app, cookie }` 반환) | 이 SPEC의 모든 시나리오가 그대로 이어 쓴다. `SPEC-AUTH-001` 이 `auth.test.ts` 에 둔 동명의 헬퍼는 `app` 만 반환하는 **다른 것**이며 내보내지 않는다 |
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
| `POST /api/rooms/:id/invites` | 201 | 방 없음 404 / 방이 보관됨 409 / 봇 없음 404(본문으로 구분) / 미인증 401 |
| `GET /api/rooms/:id/invites` | 200 | 미인증 401 |
| `DELETE /api/rooms/:id/invites/:botId` | 200 | 미인증 401 (그 외 없음 — 멱등) |

**상태 코드의 의미는 `SPEC-ROOM-001` 과 같은 규칙으로 쓴다.** 두 라우트가 같은 상황에 다른 코드를 쓰면 UI 가 코드로 문구를 고를 수 없다.

| 코드 | 뜻 | 초대에서 | 보관에서 (SPEC-ROOM-001) |
|------|-----|----------|--------------------------|
| `404` | 지목한 대상이 없다 | 그 방이 없다 / 그 봇이 없다 (본문으로 구분) | 그 `id` 의 방이 없다 |
| `409` | 대상은 있으나 그 상태에서는 할 수 없다 | 보관된 방에는 초대할 수 없다 | 이미 보관된 방이다 |

`403` 은 이 시스템에서 쓰지 않는다 — 인증됐으나 권한이 없다는 뜻인데 방별 접근 권한이 YAGNI 로 배제돼 있어 가리킬 대상이 없다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 근거가 사라졌다 — `SPEC-ROOMAUTHZ-001` 이 권한 차원을 만들었다. 다만 그 SPEC 도 `403` 대신 `404` 를 쓴다(방의 실재를 숨기기 위해서다, REQ-ROOMAUTHZ-013). 결론(이 SPEC 에서 `403` 을 쓰지 않는다)은 근거만 바뀐 채 유효하다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

이 규칙은 v0.2.0 교정 라운드에서 확정됐다. 경위와 원본으로부터의 이탈 근거는 §D 5번에 있다. **두 SPEC 에 걸친 결정이므로 여기서 바꾸면 `SPEC-ROOM-001` 도 함께 바꿔야 한다.**

### 초대 라우트가 등록되는 자리

세 초대 라우트는 `SPEC-ROOM-001` 이 만든 `registerBotRoutes(app)` **안에** 추가한다. 새 등록 함수(`registerInviteRoutes` 같은)를 만들지 않고 `index.ts` 도 고치지 않는다. REQ-BOT-008 이 "이 SPEC이 손대는 소스 파일은 `routes-bots.ts` 하나뿐"이라고 못 박으므로, 다른 방식은 그 요구사항과 충돌한다. 이 제약은 v0.2.0 에서 REQ-BOT-001 본문으로 올라갔다 — 이전에는 이 `plan.md` 만 알고 있어서, `spec.md` 만 읽는 실행자가 새 등록 함수를 만들 여지가 있었다.

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

원본 `plan-v2.md` Task 5 와 `spec-v2.md` 를 대조하면서 발견한 것들이다. 1·2·4·5번은 여기서 해소하고, **3번은 의도적으로 미해결 상태로 보존한다.** 5번은 v0.2.0 교정 라운드에서 더해진 항목이다.

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

### 5. [v0.2.0 교정] 초대와 보관의 실패 코드 — 원본으로부터의 의도적 이탈

**이 기록을 남기는 이유: 뒤에 이 문서를 읽는 사람이 원본과 다른 것을 보고 "원상 복구"하지 않게 하기 위해서다.** 아래는 실수가 아니라 판단이다.

원본은 두 라우트의 실패를 이렇게 정한다.

```
plan-v2.md:886  초대: if (!room) return reply.code(403).send({ error: '활성 방이 아닙니다' })
plan-v2.md:888        if (!bot)  return reply.code(404).send({ error: '봇을 찾을 수 없습니다' })
plan-v2.md:733  보관: if (r.changes === 0) return reply.code(404).send({ error: '활성 방을 찾을 수 없습니다' })
```

세 가지가 잘못돼 있다.

1. **클라이언트가 "방이 없다"와 "방이 보관됐다"를 구분할 수 없다.** 두 조건이 `!room` 한 분기로 합쳐져 있고 본문도 바이트 단위로 같다. 그런데 이 SPEC의 이전 판은 `403` 을 고르는 근거로 "보관된 경우가 주된 경우"라고 적었다 — 구분을 전제로 한 논리로 구분하지 않는 설계를 정당화하고 있었다.
2. **`403` 이 가리킬 대상이 없다.** `403` 은 인증됐으나 권한이 없다는 뜻인데, 방별 접근 권한은 세 SPEC 이 모두 YAGNI 로 명시 배제했다(이 SPEC `spec.md` §5, `SPEC-ROOM-001` `spec.md` §5). 권한 차원이 없으므로 의미가 비어 있고, UI(카드 `t5`)가 이 코드만 따로 처리해야 한다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위와 같다 — 권한 차원은 생겼으나 `SPEC-ROOMAUTHZ-001` 도 `404` 를 쓰므로 이 문단의 결론은 유효하다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.
3. **`404` 의 주어가 두 라우트에서 다르다.** 초대에서는 "봇이 없다"인데 보관에서는 "방이 없다"이고, 초대에서 방이 없는 경우는 `403` 이었다. 상태 코드로 문구를 고르는 UI 가 한쪽에서 반드시 틀린 문장을 낸다.

**리드의 판정: 원본 계약 자체가 결함이다. 초대 실패는 "방이 없다"와 "방이 보관됐다"를 구분할 수 있어야 한다.** 그에 따라 두 SPEC 을 **같은 편집에서 함께** 고쳤다.

| 상황 | 원본 | 교정 후 |
|------|------|---------|
| 초대 — 방 없음 | `403` (보관됨과 합침) | `404` + "방을 찾을 수 없다" |
| 초대 — 방이 보관됨 | `403` (없음과 합침) | `409` + "보관된 방에는 초대할 수 없다" |
| 초대 — 봇 없음 | `404` | `404` + "봇을 찾을 수 없다" (방 없음과 다른 문구) |
| 보관 — 방 없음 | `404` (보관됨과 합침) | `404` + "방을 찾을 수 없다" |
| 보관 — 이미 보관됨 | `404` (없음과 합침) | `409` + "이미 보관된 방" |

규칙은 한 줄로 줄어든다 — **`404` 는 지목한 대상이 없다, `409` 는 대상은 있으나 그 상태에서는 할 수 없다.** `403` 은 쓰지 않는다.

영향 범위: 이 SPEC의 REQ-BOT-004·AC-BOT-005·엣지 케이스 표·§C, 그리고 `SPEC-ROOM-001` 의 REQ-ROOM-006·AC-ROOM-004·엣지 케이스 표·§B·§C. 원본 테스트 이름 `invite to archived room returns 403` 과 `re-archiving returns 404` 도 새 계약에 맞춰 바뀐다.

이것은 §D 2번(하드코딩된 포트)과 같은 종류의 이탈이다 — 원본의 의도는 지키고, 그 의도를 무너뜨리는 구현 세부만 고친다. 이 SPEC 안에 이미 선례가 있으므로 이탈의 근거가 새로 필요한 것은 아니다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| 선행 SPEC 미완료 상태에서 착수 | `build()` 헬퍼도 `POST /api/rooms` 도 없어 모든 테스트가 준비 단계에서 실패한다 | §A 의 의존 표를 M1 시작 전 체크리스트로 쓴다 |
| `online` 을 SQL 로 되돌림 | `toEqual` 은 통과시키는 다른 형태가 있을 수 있어 조용히 재발할 수 있다 | AC-BOT-006 이 `typeof` 를 직접 단언 |
| `inviteCommand` 포트를 기본 인자로 되돌림 | 기본 포트 환경에서는 테스트가 통과해 버려 발견이 늦다 | AC-BOT-002 가 `config.port` 를 import 해 대조 |
| 철회와 삽입이 별개 문장 | 동시에 같은 (방, 봇) 을 두 번 초대하면 이론적으로 활성 토큰 2개 | 단일 사용자·소수 그룹 전제로 수용. 원본 그대로 |
| 테스트가 `bot_tokens` 를 직접 SQL 로 세는 단언을 쓴다 | 구현 세부(테이블 이름)에 결합 | 수용. 토큰이 응답에 안 나오므로 활성 토큰 수를 볼 다른 경로가 없다 |
| AC-BOT-008 이 다른 SPEC의 버그로 실패 | 이 SPEC 구현자가 `routes-bots.ts` 를 고치려 들 수 있다 | AC-BOT-008 본문이 "고칠 곳은 `routes-rooms.ts`" 라고 못 박는다 |
| 범위 경계 검사가 `HEAD` 기준이라 아무것도 관측하지 못함 | M1 이 이미 커밋한 뒤 M2 에서 검사가 돌므로, `db.ts` 스키마 변경도 `routes-bots.ts` 외 파일 수정도 잡히지 않는다. 게다가 `--cached` 없는 `git diff` 는 스테이지된 변경도 보고하지 않아 관문이 사실상 없었다 | 두 검사 모두 `spec_base_sha`(M1 단계 0 에 기록) 기준으로 바꿨다. plan-audit 이 차단 결함(BOT-B2)으로 지적한 항목이다 |
| 초대 라우트를 새 등록 함수로 만들고 `index.ts` 에 배선 | REQ-BOT-008 의 "소스 파일 하나만" 조항을 어기고 Definition of Done 이 깨진다 | REQ-BOT-001 이 "`registerBotRoutes` 안에서 등록"을 요구사항으로 못 박고, AC-BOT-009 의 세 번째 명령이 `index.ts` 수정을 기계적으로 잡는다 |
| 이 SPEC 이 `routes-bots.ts` 에 `config.js` import 를 더하면서 `rooms-bots.test.ts` 의 정적 import 사슬에 `config` 가 들어온다 | 교정 전 `config.dataDir` 은 모듈 로드 시점에 값이 굳는 평범한 속성이었다. 그대로였다면 이 SPEC 이 끝나는 순간 `SPEC-ROOM-001` 의 AC-ROOM-011 이 임시 디렉터리 대신 저장소의 진짜 `data/` 를 열면서 통과했을 것이다 | `config.dataDir` 을 게터로 바꿨다(`SPEC-ROOM-001` `plan.md` §D 8번 — `SPEC-CORE-001` 산출물의 카드 교차 수정). 이 SPEC 은 `config.port` 를 **읽기만** 하므로(AC-BOT-002) `port` 가 즉시 평가인 채로 남은 한계에는 걸리지 않는다 |
| 소스 `grep` 으로 보안 속성을 판정 | 줄바꿈 위치 같은 형식을 재게 되어, 구현자가 개행 하나로 "고칠" 수 있다 — 보안은 그대로인데 검사만 통과한다 | AC-BOT-003 을 실행 단언으로 바꿨다. 구조 검사는 AC-ROOM-003 의 트랜잭션 확인처럼 **보조** 로만 쓰고, 그 한계를 기준 본문에 적는다 |

## §F 마일스톤

우선순위 순서다. M1 이 끝나야 M2 를 시작할 수 있다 — M2 의 목록·철회 테스트가 M1 의 발급 라우트를 쓴다.

### M1 — 초대 발급 (우선순위 High)

원본: `plan-v2.md` Task 5 Step 1-4 중 발급 경로.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-BOT-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` `§E.1` 에 적는다. M2 단계 5 의 범위 경계 검사 두 개가 이 값을 기준으로 비교한다.
1. `server/test/rooms-bots.test.ts` 에 `describe('invites', ...)` 를 추가하고 발급 관련 테스트를 쓴다 — 원본의 `invites a bot and returns one-time token + command`, `re-inviting same bot revokes old token and issues new one`, 그리고 AC-BOT-002 / AC-BOT-005 / AC-BOT-011 의 추가 테스트. 원본의 `invite to archived room returns 403` 은 §D 5번에 따라 AC-BOT-005 의 세 경우 구분 테스트로 대체된다.
2. **RED 확인**: `npm test -w server` → 새 테스트가 `404`(라우트 미등록)로 실패. 출력 기록.
3. `server/src/routes-bots.ts` 에 추가 — `sha256Hex`, `inviteCommand(token, port)`, `POST /api/rooms/:id/invites`. 세 라우트 모두 `registerBotRoutes` **안에** 넣는다(REQ-BOT-001) — 새 등록 함수를 만들거나 `index.ts` 를 고치지 않는다. 실패 분기는 §D 5번에 따라 방 조회 → 없으면 `404`, 보관됐으면 `409`, 봇 조회 → 없으면 `404`(다른 문구) 순서로 가른다. 포트는 §D 2번에 따라 `config.port` 를 넘긴다.
4. **GREEN 확인**: `npm test -w server` → 발급 테스트 전부 통과. `npm run typecheck -w server` → 종료 코드 0.
5. 커밋: `feat: bot invite API issuing one-time gateway token`

수용 기준: AC-BOT-001, 002, 004, 005, 011, AC-BOT-010(전이 1-2).

### M2 — 초대 목록·철회와 교차 검증 (우선순위 High)

원본: `plan-v2.md` Task 5 Step 1-4 중 목록·철회 경로.

1. 같은 테스트 파일에 목록·철회 테스트를 추가한다 — 원본의 `lists invites without token`, 그리고 AC-BOT-003 / AC-BOT-006 / AC-BOT-007 / AC-BOT-008 의 테스트.
2. **RED 확인**: `npm test -w server` → 새 테스트 실패. 출력 기록.
3. `routes-bots.ts` 에 추가 — `GET /api/rooms/:id/invites`(§D 1번에 따라 `online` 을 불리언으로 매핑), `DELETE /api/rooms/:id/invites/:botId`.
4. **GREEN 확인**: `npm test -w server` → 전체 통과. typecheck 0.
5. 범위 경계 확인 (AC-BOT-009): `ls server/src` 가 여섯 파일만 보이는지 본다. 이어서 `git rev-parse --verify "$(cat .moai/specs/SPEC-BOT-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 확인하고, 그 SHA 를 넣은 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이면서 비어 있는지, `git diff --name-only <SHA> -- server/src` 가 종료 코드 `0` 이면서 정확히 `server/src/routes-bots.ts` 한 줄인지 본다. **기준 커밋 없이 `git diff` 를 쓰지 않는다** — M1 커밋 이후이고 M2 편집이 스테이지된 시점이라 두 이유로 아무것도 잡히지 않는다. **빈 출력 하나만 보고 통과로 적지도 않는다** — 단계 0 을 건너뛰어 기준 SHA 가 없을 때도 표준 출력은 비어 있다.
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
- **테스트에서 실제 `data/` 쓰기** — 모든 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다. 이 SPEC 이 `routes-bots.ts` 에 더하는 `config.js` import 가 `rooms-bots.test.ts` 의 정적 import 사슬을 통해 `config` 를 먼저 평가시키므로, `config.dataDir` 이 게터로 남아 있는지 확인한다 (`SPEC-ROOM-001` `plan.md` §D 8번).
- **채널 계약 손대기** — §D 3번은 미해결로 보존된 기록이다. 이 SPEC에서 `--token` / `--server` 실행 인자 방식으로 바꾸지 않는다.
- **새 등록 함수 만들기** — 초대 라우트를 `registerInviteRoutes` 같은 새 함수로 빼고 `index.ts` 에 배선하지 않는다. REQ-BOT-001 이 `registerBotRoutes` 안을 지정하고, REQ-BOT-008 의 "소스 파일 하나만" 조항이 그것과 짝을 이룬다.
- **실패 코드를 `403` 하나로 되돌리기** — 원본 형태이지만 없는 방과 보관된 방을 구분할 수 없고, `403` 은 이 시스템에 없는 권한 차원을 가리킨다. §D 5번이 의도적 이탈로 기록한 결정이다.
- **소스 `grep` 으로 보안 판정하기** — 토큰이 노출되지 않는다는 것은 실행으로 관측한다. 소스 패턴 검사는 줄바꿈 위치를 재는 일이 되기 쉽고, 그렇게 통과한 검사는 아무것도 보장하지 않는다.
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡히고, 스테이지된 변경은 `--cached` 없이는 보이지 않는다. `spec_base_sha` 를 기준으로 비교한다 (M1 단계 0).
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 가 종료 코드 `0` 으로 SHA 를 내는 것을 먼저 확인하고, 각 `git diff` 도 종료 코드 `0` 임을 함께 확인한다 (AC-BOT-009).
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않으므로, 이름 붙은 테스트를 하나도 쓰지 않아도 `npm test -w server` 는 종료 코드 `0` 이다. 이름 붙은 테스트의 통과는 `npm test -w server -- --reporter=verbose` 출력에서 `✓ test/<파일> > <describe 이름> > <테스트 이름>` 줄을 직접 보고 판정한다. `--reporter=verbose` 를 불필요한 플래그로 여겨 빼지 않는다. `-t <이름>` 필터로 대신하지도 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다 (3차 보고서 D1).

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md`, `spec-v2.md` — **이 SPEC 의 유일한 규범 근거**(읽기 전용). 같은 디렉터리의 `plan.md`·`spec.md` 는 폐기된 v1 이며 참조하지 않는다.
- `spec.md` — 이 SPEC의 GEARS 요구사항(REQ-BOT-001..009)과 범위 경계
- `acceptance.md` — AC-BOT-001..011
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5 — 원본 (읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 5·7·9장 — 데이터 모델, 봇 초대 흐름, 보안
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (인증)
- `.moai/specs/SPEC-ROOM-001/` — 선행 SPEC (방·봇 등록). `plan.md` §D 7번이 이 문서 §D 5번과 짝을 이루는 실패 코드 기록이고, §D 8번이 이 SPEC 의 `config.js` import 때문에 필요해진 `config.dataDir` 지연 평가 기록이다
- `.moai/reports/plan-audit/t2-3spec-audit.md` — 이 SPEC을 FAIL(0.66)로 판정한 1차 plan-audit 보고서. v0.2.0 교정 라운드의 근거다
- `.moai/reports/plan-audit/t2-3spec-audit-iter2.md` — 이 SPEC을 PASS(0.92)로 판정한 2차 plan-audit 보고서. v0.3.0 교정 라운드(R1·R2)의 근거다
