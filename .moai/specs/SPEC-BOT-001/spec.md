---
id: SPEC-BOT-001
title: "minidiscord 봇 초대 API — 게이트웨이 토큰 발급과 세션 실행 명령 안내"
version: "0.4.0"
status: completed
created: 2026-08-26
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "bot-invite, bot-token, sha256, one-time-token, invite-command, gateway-credential"
tier: M
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]
---

# SPEC-BOT-001 — 봇 초대 API (게이트웨이 토큰 발급 + 세션 실행 명령 안내)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-26 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5 에서 도출 (칸반 카드 `t2`, 마일스톤 M2). 원본 초안이 요구사항 33개·수용 기준 27개로 Tier L 상한(25/25)을 넘겨 운영자 승인 아래 3분할했고, 이 SPEC은 그 세 번째 조각이다. | manager-spec |
| 0.2.0 | 2026-08-26 | **plan-audit 교정 라운드.** `.moai/reports/plan-audit/t2-3spec-audit.md` 가 이 SPEC을 **FAIL**(0.66, Tier M 기준선 0.80)로 판정했고, 차단 2건(BOT-B1·B2)·중대 4건·경미 3건을 지적했다. 전부 반영했다. 초대 실패 응답을 `404`(방 없음)·`409`(보관된 방)·`404`(봇 없음, 본문으로 구분)로 나눠 `SPEC-ROOM-001` 과 의미를 맞췄고(의도적 이탈 — `plan.md` §D 5번), 초대 라우트가 `registerBotRoutes` **안에서** 등록된다는 것을 REQ-BOT-001 에 명시했으며, §1 의 "자기가 만든 방"이라는 스키마에 없는 소유권 서술을 지웠다. 요구사항 9개·수용 기준 11개로 개수는 그대로다. | manager-spec |
| 0.3.0 | 2026-08-26 | **plan-audit 2차 교정 라운드 (소규모).** `.moai/reports/plan-audit/t2-3spec-audit-iter2.md` 가 **PASS**(0.92, Tier M 기준선 0.80, 차단 0건)로 판정했고, 남은 중대 2건만 닫았다. **R1** — 범위 경계 기준(AC-BOT-009)의 `db.ts` diff 관측이 "비어 있음" 하나뿐이라, M1 단계 0 을 건너뛴 실행에서 그 관측만 조용히 무력해졌다. `git rev-parse --verify` 로 기준 SHA 확인을 앞에 두고, `--stat` 과 `--name-only` 두 검사 모두 **종료 코드 `0`** 을 관측 조건에 넣었다. **R2** — 이 SPEC 이 `routes-bots.ts` 에 더하는 `config.js` import 가 `SPEC-ROOM-001` 의 AC-ROOM-011 을 비-hermetic 으로 만들 예정이었다. `server/src/config.ts` 의 `dataDir` 이 게터로 고쳐졌고(`SPEC-ROOM-001` `plan.md` §D 8번), 이 SPEC 은 §E·§H 에 그 의존을 기록한다. 요구사항 9개·수용 기준 11개로 개수는 그대로다. | manager-spec |
| 0.4.0 | 2026-08-26 | **plan-audit 3차 교정 라운드 (기준 관측성 한정).** `.moai/reports/plan-audit/t2-3spec-audit-iter3.md` 가 이 SPEC 을 **FAIL**(0.90, Tier M 기준선 0.80, 차단 2건)로 판정했다 — 점수는 기준선을 넘었고 실패 사유는 차단 결함이다. 리드 지시에 따라 **D1 하나만** 닫는다. "이름 붙은 기존 테스트가 통과한다"를 관측으로 삼은 기준 두 개(AC-BOT-001·004)가 명령을 `npm test -w server` 로 지정하고 있었는데, 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그 결과 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같았다 — 둘 다 종료 코드 `0` 이라 검사가 아무것도 검사하지 못했다. 명령을 `npm test -w server -- --reporter=verbose` 로 바꾸고, 관측 대상을 `✓ test/rooms-bots.test.ts > <describe 이름> > <테스트 이름>` 줄이 출력에 실제로 나타나는가로 바꿨다. `plan.md` §H 에 같은 결함이 되돌아오는 것을 막는 안티패턴을 더했다. 요구사항 9개·수용 기준 11개로 개수는 그대로다. D2(원본 `plan-v2.md` 부재)는 리드 판단 대기라 이번 범위 밖이다. | manager-spec |

---

## 1. 배경과 목적

카드 `t2` 는 원래 인증·방·봇 등록·봇 초대를 한 SPEC으로 묶으려 했다. 그 초안이 요구사항 33개와 수용 기준 27개가 되어 `.claude/rules/moai/workflow/spec-workflow.md` 의 Tier 상한(Tier M 16/16, Tier L 25/25)을 넘겼다. 상한을 늘리는 대신 규칙이 지시하는 대로 쪼갰고, 카드는 그대로 하나이면서 Tier M SPEC 세 개를 순서대로 낸다.

```
SPEC-AUTH-001  (인증·세션 쿠키·requireAuth)
      ↓
SPEC-ROOM-001  (방 생성·목록·보관 + 봇 등록·목록)
      ↓
SPEC-BOT-001   (이 SPEC — 봇 초대 토큰 발급)
```

이 SPEC이 끝나면, 로그인한 사람이 활성 방에 등록된 봇을 초대해서 **(방, 봇) 조합 하나에 대한 게이트웨이 접속 토큰**과 **터미널에 그대로 붙여 넣을 실행 명령 안내**를 한 번 받는다.

"자기가 만든 방"이라는 제한은 없다. `rooms` 테이블에 소유자 컬럼이 없고(`server/src/db.ts` 의 `SCHEMA`), `POST /api/rooms` 는 만든 사람을 기록하지 않으며, `req.user` 는 `{ id, username }` 두 필드로 고정돼 있다. 방별 접근 권한은 세 SPEC 이 모두 YAGNI 로 명시 배제했다. 로그인한 사람은 누구나 모든 활성 방에 초대할 수 있다 — 단일 사용자와 소수 그룹을 전제한 설계다.

이 SPEC이 만드는 토큰은 다음 카드로 넘어가는 가장 중요한 계약이다. 카드 `t3` 의 게이트웨이는 채널 플러그인이 들고 온 평문 토큰의 SHA-256 해시로 `bot_tokens` 를 조회해 방과 봇을 판정한다. 따라서 토큰 형식(소문자 hex 64자)과 해시 방식(`sha256Hex`)은 여기서 확정된다. 나중에 바꾸면 이미 발급된 초대가 전부 무효가 된다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5, `spec-v2.md` 5장(데이터 모델)·7장(봇 초대 흐름)·9장(보안).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 초대 | `bot_tokens` 의 한 행. (방, 봇) 조합 하나에 대한 접속 자격증명 |
| 평문 토큰 | `randomBytes(32).toString('hex')` 로 만든 소문자 hex 64자 문자열. 초대 생성 응답에만 한 번 실린다 |
| 활성 토큰 | `bot_tokens` 중 `revoked_at IS NULL` 인 행 |
| 철회 | `revoked_at` 을 채워 토큰을 무효화하는 것. 삭제하지 않는다 |
| 실행 명령 안내 | 초대 응답의 `command` 필드. 사용자가 페르소나 디렉터리에서 그대로 붙여 넣어 세션을 띄우는 여러 줄 문자열 |
| 온라인 | 초대 목록 응답의 `online` 필드. 이 SPEC 범위에서는 항상 불리언 `false` 이며, 실제 판정은 카드 `t3` 게이트웨이가 채운다 |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC은 아무것도 새로 만들지 않고 다음을 그대로 소비한다.

| 출처 | 받아 쓰는 것 |
|------|-------------|
| `SPEC-CORE-001` | `buildServer`, `openDb`, `bot_tokens` / `rooms` / `bots` 를 포함한 여덟 테이블 스키마, `config.port` |
| `SPEC-AUTH-001` | `requireAuth` preHandler, `md_session` 세션 쿠키, `req.server.db` 데코레이터 |
| `SPEC-ROOM-001` | `registerBotRoutes(app)` 모듈과 그 안의 `GET`/`POST /api/bots`, `registerRoomRoutes` 의 방 생성·보관 라우트 |

`server/src/routes-bots.ts` 는 `SPEC-ROOM-001` 이 만든 파일이다. 이 SPEC은 그 파일에 초대 라우트를 **추가**할 뿐 새 소스 파일을 만들지 않는다.

---

## 4. 요구사항 (GEARS)

### 4.1 초대 발급

**REQ-BOT-001** (When — 이벤트 구동)
`POST /api/rooms/:id/invites` 가 활성 방과 존재하는 `bot_id` 로 호출되면, 서버는 32바이트 난수 토큰을 만들고 그 **SHA-256 해시만** `bot_tokens.token_hash` 에 저장한 뒤, 상태 코드 `201` 과 `{ bot_id, bot_name, token, command }` 를 응답해야 한다. `token` 은 소문자 hex 64자다.

세 초대 라우트는 `SPEC-ROOM-001` 이 만든 `registerBotRoutes(app)` **안에서** 등록되어야 한다. 새 등록 함수를 만들거나 `server/src/index.ts` 를 고쳐서는 안 된다. REQ-BOT-008 이 "이 SPEC이 손대는 소스 파일은 `routes-bots.ts` 하나뿐"이라고 못 박기 때문에, 이 조건이 지켜져야 그 요구사항을 만족할 수 있다 — `index.ts` 에 등록 줄을 더하면 두 요구사항이 정면으로 충돌한다.

**REQ-BOT-002** (Unwanted — shall not)
평문 토큰은 초대 생성 응답 이외의 어떤 경로로도 다시 노출되어서는 안 된다. 목록 조회 응답에 `token` 필드가 있어서는 안 되고, 어떤 라우트도 `token_hash` 를 반환해서는 안 된다.

**REQ-BOT-003** (When — 재초대 감지)
같은 (방, 봇) 조합에 대한 초대 요청이 다시 감지되면, 서버는 기존 활성 토큰을 먼저 철회한 뒤 새 토큰을 발급해야 한다. **단일 요청 처리 기준으로** 처리 후 그 조합의 활성 토큰 수는 정확히 1이다. 철회와 삽입이 별개 문장이라 같은 조합을 동시에 두 번 초대하면 이론적으로 활성 토큰이 둘이 될 수 있다 — 단일 사용자·소수 그룹 전제로 수용한 위험이며 `plan.md` §E 에 기록돼 있다.

**REQ-BOT-004** (When — 유효하지 않은 대상 감지)
초대 요청의 실패는 세 경우를 서로 구분해야 한다.

| 감지된 상황 | 상태 코드 | 응답 본문 |
|-------------|-----------|-----------|
| 그 `id` 의 방이 없다 | `404` | "방을 찾을 수 없다"는 한국어 문구 |
| 방은 있으나 `status='archived'` 다 | `409` | "보관된 방에는 초대할 수 없다"는 한국어 문구 |
| 그 `bot_id` 의 봇이 없다 | `404` | "봇을 찾을 수 없다"는 한국어 문구 — 방 없음과 **다른 문구**여야 한다 |

세 경우 모두 `bot_tokens` 에 어떤 행도 넣거나 고치지 않아야 한다.

상태 코드의 의미는 `SPEC-ROOM-001` 과 같은 규칙을 쓴다 — `404` 는 "지목한 대상이 없다", `409` 는 "대상은 있으나 그 상태에서는 할 수 없다"다. 원본 `plan-v2.md` 는 없는 방과 보관된 방을 `403` 하나로 합쳤으나, 그러면 클라이언트가 두 경우를 구분할 수 없고 `403`(인증됐으나 권한 없음)이 가리킬 권한 차원도 이 시스템에는 없다. 의도적 이탈이며 근거는 `plan.md` §D 5번에 있다.

**REQ-BOT-005** (Ubiquitous)
초대 응답의 `command` 는 여러 줄 문자열이며, `MINIDISCORD_TOKEN` 에 발급된 평문 토큰을, `MINIDISCORD_SERVER` 에 `ws://127.0.0.1:<config.port>/bot` 을 넣는 export 문과, `--dangerously-load-development-channels` 플래그를 포함한 `claude` 실행 줄, 그리고 최초 1회 등록용 `claude mcp add --scope user minidiscord-channel` 줄을 담아야 한다. 포트는 하드코딩된 `3000` 이 아니라 `config.port` 에서 온다.

### 4.2 초대 목록과 철회

**REQ-BOT-006** (When — 이벤트 구동)
`GET /api/rooms/:id/invites` 가 호출되면, 서버는 그 방의 활성 초대를 `{ bot_id, bot_name, online }` 객체 배열로 봇 이름 오름차순으로 응답해야 한다. `online` 은 **불리언**이며, 이 SPEC 범위에서는 항상 `false` 다. SQLite 가 돌려주는 정수 `0` 을 그대로 흘려보내서는 안 된다.

**REQ-BOT-007** (When — 이벤트 구동)
`DELETE /api/rooms/:id/invites/:botId` 가 호출되면, 서버는 그 조합의 활성 토큰을 철회하고 `{ ok: true }` 를 응답해야 한다. 철회할 활성 토큰이 없어도 같은 응답을 낸다(멱등).

### 4.3 범위 경계 (금지)

**REQ-BOT-008** (Unwanted — shall not)
이 SPEC의 구현은 메시지·멘션 파서·SSE·WebSocket 게이트웨이·권한 릴레이 라우트를 등록해서는 안 되며, 새 소스 파일을 만들어서도 안 된다. 구현 후 `server/src` 에는 `config.ts`, `db.ts`, `index.ts`, `auth.ts`, `routes-rooms.ts`, `routes-bots.ts` 여섯 파일만 존재한다. 이 SPEC이 손대는 소스 파일은 `routes-bots.ts` 하나뿐이다.

**REQ-BOT-009** (Unwanted — shall not)
이 SPEC의 구현은 `server/src/db.ts` 의 `SCHEMA` 상수를 변경해서는 안 된다. `bot_tokens` 를 포함한 여덟 테이블과 두 인덱스는 `SPEC-CORE-001` 이 이미 만들었고 그 SPEC이 소유한다. 스키마 변경이 필요해 보이면 진행을 멈추고 보고한다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC에서 **만들지 않는다**. 각 항목에 소유자를 명시한다.

### Out of Scope — 인증과 세션 (SPEC-AUTH-001)

- 회원가입·로그인·로그아웃 라우트, 비밀번호 해싱, `md_session` 세션 쿠키 발급
- `requireAuth` preHandler 자체의 구현 — 이 SPEC은 그것을 초대 라우트에 붙여 쓰기만 한다
- `req.server.db` 데코레이터 설정과 `@fastify/cookie` 등록

### Out of Scope — 방과 봇 등록 (SPEC-ROOM-001)

- `GET`/`POST /api/rooms`, `POST /api/rooms/:id/archive` — 방 생성·목록·보관
- 보관 트랜잭션 자체의 구현. 이 SPEC은 그 결과(활성 토큰 0)를 수용 기준으로 관측만 한다
- `GET`/`POST /api/bots` — 봇 정의 등록과 목록
- `registerBotRoutes` / `registerRoomRoutes` 모듈의 최초 생성과 `buildServer` 등록

### Out of Scope — 봇 게이트웨이와 그 이후 (카드 `t3`, 마일스톤 M3)

- `server/src/gateway.ts` — WebSocket 서버, `hello { token }` 인증, 방 구독, `missed_after_id` 커서 재전송
- 봇이 접속한 뒤에 하는 모든 것 — 메시지 수신, 답장, 권한 릴레이
- 실제 온라인/오프라인 판정. `GET /api/rooms/:id/invites` 의 `online` 은 이 SPEC에서 항상 `false` 로 고정한다
- `bot_tokens.last_delivered_id` / `last_seen_at` 컬럼을 읽거나 쓰지 않는다

### Out of Scope — 메시지·실시간 계층 (카드 `t3` 이후)

- `routes-messages.ts` 메시지 전송(multipart)/목록/다운로드, `mention.ts` `@TO`/`@CC` 파서
- `sse.ts` SSE 허브, `permissions.ts` 권한 릴레이 브로커

### Out of Scope — 채널 플러그인 (카드 `t4`)

- `channel/` 패키지의 어떤 파일도 만들지 않는다. MCP 채널 계약 구현, 게이트웨이 클라이언트, 재접속 백오프
- 이 SPEC은 채널이 읽을 **환경변수 이름과 값**을 안내 문자열로 만들어 낼 뿐, 채널 계약 자체를 정의하거나 변경하지 않는다

### Out of Scope — 웹 UI (카드 `t5`)

- `web/index.html`, `web/app.js`, `web/style.css`
- 봇 초대 화면, 토큰 복사 UI, 실행 명령 안내를 보여 주는 화면

### Out of Scope — 토큰 운영 심화

- 토큰 만료(TTL)와 자동 회전. 원본 데이터 모델에 만료 컬럼이 없고, 스키마 변경은 REQ-BOT-009 가 금지한다
- 초대 발급 이력 조회, 발급 횟수 제한(rate limit), 감사 로그
- 방별 접근 권한 — 원본 `spec-v2.md` 2장이 YAGNI 로 명시적으로 배제했다

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 `SPEC-CORE-001` 이 설치한 것을 그대로 쓴다: `fastify ^5`, `@fastify/cookie`, `better-sqlite3`, `vitest`. 이 SPEC은 새 의존성을 추가하지 않는다.
- 토큰 생성과 해싱은 Node 표준 `node:crypto` 만 쓴다(`randomBytes`, `createHash`, `timingSafeEqual`). 외부 라이브러리를 도입하지 않는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- 서버 데이터는 전부 `MINIDISCORD_DATA_DIR`(기본 `./data`) 아래. 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다.
- UI 문구(오류 메시지 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).
- 채널 계약(capabilities·notification 메서드·reply 도구·권한 릴레이)은 `spec-v2.md` 4-B 와 공식 channels-reference 를 그대로 따른다. 이 SPEC이 만드는 것은 그 계약이 소비할 **토큰과 실행 명령 문자열**뿐이며, 계약 자체를 건드리지 않는다. 계약 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다.

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 5
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 5장 데이터 모델, 7장 봇 초대 흐름, 9장 보안
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `openDb`, 스키마)
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (인증·세션 쿠키·`requireAuth`)
- `.moai/specs/SPEC-ROOM-001/` — 선행 SPEC (방 API·봇 등록 API)
- 칸반 카드 `t2` (마일스톤 M2)
