---
id: SPEC-AUTH-001
title: "minidiscord 인증 — 회원가입·로그인·세션 쿠키·보호 라우트 진입 검사"
version: "0.6.0"
status: completed
created: 2026-08-26
updated: 2026-09-03
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "auth, session-cookie, scrypt, require-auth"
tier: M
depends_on: [SPEC-CORE-001]
---

# SPEC-AUTH-001 — minidiscord 인증

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-26 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 3-5 에서 도출 (칸반 카드 `t2`, 마일스톤 M2). | manager-spec |
| 0.2.0 | 2026-08-26 | **3분할.** 요구사항 33개·수용 기준 27개가 Tier L 상한(25/25, `.claude/rules/moai/workflow/spec-workflow.md:146-152`)을 넘어, 예산을 늘리는 대신 세 SPEC 으로 쪼갰다. 이 SPEC 은 인증만 남기고 방·봇 등록은 `SPEC-ROOM-001`, 봇 초대·토큰 발급은 `SPEC-BOT-001` 로 옮겼다. 요구사항 15개·수용 기준 13개로 Tier M(16/16) 안에 들어온다. | manager-spec |
| 0.3.0 | 2026-08-26 | **plan-audit 교정 라운드.** `.moai/reports/plan-audit/t2-3spec-audit.md` 가 이 SPEC 을 **FAIL**(0.62, Tier M 기준선 0.80)로 판정했고, 차단 3건(AUTH-B1·B2·B3)·중대 4건·경미 3건을 지적했다. 그 지적을 전부 반영했다. REQ-AUTH-013 을 이 SPEC 이 등록하는 라우트로 한정하고(`GET /api/health` 는 SPEC-CORE-001 소관), REQ-AUTH-006 에 빈 문자열 거절을 되살리고, REQ-AUTH-003 에 `registerAuthRoutes(app, app.db)` 호출 규칙을 명시했다. 수용 기준에는 `buildServer` 를 실제로 부르는 AC-AUTH-014 를 더해 13→14개가 됐다(Tier M 상한 이내). | manager-spec |
| 0.4.0 | 2026-08-26 | **plan-audit 2차 교정 라운드 (소규모).** `.moai/reports/plan-audit/t2-3spec-audit-iter2.md` 가 **PASS**(0.90, Tier M 기준선 0.80, 차단 0건)로 판정했고, 남은 중대 2건만 닫았다. **R1** — 범위 경계 기준(AC-AUTH-012)의 관측 조건이 "출력이 비어 있다" 하나뿐이라, `.spec-base-sha` 를 기록하지 않은 실행에서도 통과했다(git 이 오류를 표준 오류로 내고 표준 출력을 비우기 때문). `git rev-parse --verify` 로 기준 SHA 확인을 앞에 두고, 두 명령 모두 **종료 코드 `0`** 을 관측 조건에 넣었다. **R2** — AC-AUTH-014 가 기대는 `MINIDISCORD_DATA_DIR` 지연 반영이 우연에 기대고 있었다. `server/src/config.ts` 의 `dataDir` 을 게터로 고쳤고(카드 교차 수정 — 경위는 `SPEC-ROOM-001` `plan.md` §D 8번), 기준 본문이 그 근거를 게터로 명시한다. 요구사항 15개·수용 기준 14개로 개수는 그대로다. | manager-spec |
| 0.5.0 | 2026-08-26 | **plan-audit 3차 교정 라운드 (기준 관측성 한정).** `.moai/reports/plan-audit/t2-3spec-audit-iter3.md` 가 이 SPEC 을 **FAIL**(0.87, Tier M 기준선 0.80, 차단 2건)로 판정했다 — 점수는 기준선을 넘었고 실패 사유는 차단 결함이다. 리드 지시에 따라 **D1 하나만** 닫는다. "이름 붙은 기존 테스트가 통과한다"를 관측으로 삼은 기준 다섯 개(AC-AUTH-001·003·005·006·007)가 명령을 `npm test -w server` 로 지정하고 있었는데, 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그 결과 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같았다 — 둘 다 종료 코드 `0` 이라 검사가 아무것도 검사하지 못했다. 명령을 `npm test -w server -- --reporter=verbose` 로 바꾸고, 관측 대상을 `✓ test/auth.test.ts > <describe 이름> > <테스트 이름>` 줄이 출력에 실제로 나타나는가로 바꿨다. `plan.md` §H 에 같은 결함이 되돌아오는 것을 막는 안티패턴을 더했다. 요구사항 15개·수용 기준 14개로 개수는 그대로다. D2(원본 `plan-v2.md` 부재)는 리드 판단 대기라 이번 범위 밖이다. | manager-spec |
| 0.6.0 | 2026-09-03 | **사후 개정 — 사용자 이름 상한 (칸반 카드 `t33`, B급·plan 없음).** t25 sync 감사가 2만 글자 사용자 이름으로 `POST /api/auth/register` 를 호출해 `201` 과 `users.username` 20000 글자 저장을 재현했다 — 이 SPEC 은 빈 문자열만 거절했고 길이·글자 상한이 없었다(`.moai/reports/t33/run-done.md` §1). run 레인이 `server/src/auth.ts` 에 상한(코드 포인트 32 이하, C0/C1 제어문자·앞뒤 공백 금지)과 `server/test/auth.test.ts` 의 테스트 1건을 먼저 착지시켰고, 이 개정은 그 동작을 요구사항으로 되받는다. **REQ-AUTH-016 과 AC-AUTH-015 를 신설**했다. REQ-AUTH-006 에 상한이 뒤따른다는 문장을, §5 「사용자 이름 정형화」에 앞뒤 공백은 정형화가 아니라 거절이라는 단서를 붙였다. `acceptance.md` 엣지 케이스 표의 「앞뒤 공백은 다른 계정이 된다」 행이 거짓이 되어 고쳤고, `plan.md` §C 의 400 사유와 §G·§I 의 개수 참조를 맞췄다. 요구사항 15→16개·수용 기준 14→15개(Tier M 상한 16/16 이내). status 는 `completed` 그대로 — 코드와 테스트가 이미 착지한 동작의 사후 기술이다. | manager-spec |

---

## 1. 배경과 목적

SPEC-CORE-001 이 만든 토대(`buildServer`, `openDb`, 여덟 개 테이블) 위에 **사람을 식별하는 계층**을 얹는다. 이 SPEC 이 끝나면 사람이 계정을 만들고 로그인해 세션 쿠키를 받으며, 그 쿠키를 검사하는 진입 검사 함수 `requireAuth` 가 생긴다.

이 SPEC 은 **세 SPEC 사슬의 첫 번째**다.

```
SPEC-AUTH-001 (여기) → SPEC-ROOM-001 → SPEC-BOT-001
```

뒤의 두 SPEC 이 등록할 모든 도메인 라우트는 여기서 만드는 `requireAuth` 를 `preHandler` 로 쓴다. 방을 만들 주체가 없으면 방 API 가 성립하지 않고, 방이 없으면 봇을 초대할 대상이 없다. 그래서 인증이 먼저다.

이 SPEC 이 만드는 **가장 중요한 계약**은 두 가지다. 하나는 세션 쿠키 이름 `md_session` 과 그 검사 경로이고, 다른 하나는 `requireAuth` 통과 후 요청에 붙는 `req.user` 의 형태다. 두 계약 모두 뒤의 두 SPEC 이 그대로 소비하므로, 여기서 확정한 뒤에 바꾸면 두 SPEC 의 라우트가 함께 깨진다. 정확한 시그니처는 `plan.md` §A 에 있다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 3, `spec-v2.md` 2장(기능 요구사항)·5장(데이터 모델)·9장(보안).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 세션 쿠키 | 이름이 `md_session` 인 HttpOnly 쿠키. 값은 `sessions.token` 이고, 사람의 로그인 상태를 나타낸다 |
| 진입 검사 | 보호 라우트의 `preHandler` 로 실행되는 `requireAuth`. 쿠키를 세션 테이블과 대조해 통과 여부를 정한다 |
| 인증 주체 | 진입 검사를 통과한 요청의 `req.user` 값. `{ id, username }` 두 필드뿐이다 |
| 보호 라우트 | `requireAuth` 를 `preHandler` 로 단 라우트. `/api/auth/*` 세 개를 뺀 모든 도메인 라우트가 여기 해당한다 |

---

## 3. 요구사항 (GEARS)

### 3.1 인증 모듈 계약

**REQ-AUTH-001** (Ubiquitous)
`server/src/auth.ts` 는 `registerAuthRoutes(app: FastifyInstance, db: Db): void`, `requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void>`, `hashPassword(pw: string): string`, `verifyPassword(pw: string, stored: string): boolean` 네 개를 이름 붙은 내보내기로 제공해야 한다.

**REQ-AUTH-002** (Ubiquitous)
`auth.ts` 는 Fastify 모듈 선언 병합으로 `FastifyRequest.user?: { id: number; username: string }` 를 선언해야 한다. `requireAuth` 를 통과한 요청은 이 속성으로 인증 주체를 노출한다.

**REQ-AUTH-003** (Ubiquitous)
`buildServer` 는 `@fastify/cookie` 를 등록하고, `openDb(config.dbPath)` 의 결과를 `app.db` 데코레이터로 노출해야 한다. `requireAuth` 와 모든 라우트는 `req.server.db` 로 이 하나의 연결을 공유한다. `buildServer` 는 인증 라우트를 `registerAuthRoutes(app, app.db)` 로 등록해, 인자로 받는 연결과 `req.server.db` 가 같은 객체를 가리켜야 한다.

**REQ-AUTH-004** (Ubiquitous)
비밀번호는 평문으로 저장되어서는 안 된다. `hashPassword` 는 16바이트 난수 salt 와 `scrypt` 64바이트 파생 키를 `<salt-hex>:<key-hex>` 형식으로 만들고, `verifyPassword` 는 `timingSafeEqual` 로 비교해야 한다.

### 3.2 회원가입·로그인·로그아웃

**REQ-AUTH-005** (When — 이벤트 구동)
클라이언트가 `POST /api/auth/register` 를 유효한 `{ username, password }` 로 호출하면, 서버는 `users` 에 한 행을 넣고 상태 코드 `201` 을 응답해야 한다.

**REQ-AUTH-006** (When — 유효하지 않은 입력 감지)
`username` 이 문자열이 아니거나 빈 문자열이거나, `password` 가 문자열이 아니거나, `password` 의 길이가 8 미만인 요청이 감지되면, 서버는 상태 코드 `400` 과 한국어 오류 메시지를 응답하고 `users` 에 아무 행도 넣지 않아야 한다. 타입 검사는 길이 검사보다 먼저 수행한다 — 값이 없는 경우(`undefined`)와 문자열이 아닌 경우(배열·객체·숫자)를 모두 이 한 검사로 거른다. 빈 문자열은 타입 검사를 통과하므로 별도의 조건으로 거른다. 길이·글자 상한은 이 검사 뒤에 REQ-AUTH-016 이 이어서 건다(v0.6.0, 카드 `t33`).

**REQ-AUTH-016** (When — 사용자 이름 형식 위반 감지) — v0.6.0 신설, 카드 `t33`
REQ-AUTH-006 의 타입·빈 문자열 검사를 통과한 `POST /api/auth/register` 요청의 `username` 이 다음 셋 중 하나에 해당하면, 서버는 상태 코드 `400` 과 어느 규칙을 어겼는지 이름 붙인 한국어 오류 메시지를 응답하고 `users` 에 아무 행도 넣지 않아야 한다.

1. **길이** — 코드 포인트 수(`[...username].length`)가 `USERNAME_MAX_LENGTH`(= 32)를 넘는다. 메시지는 `username은 32자 이하여야 합니다`. 단위가 UTF-16 코드 유닛이 아니라 코드 포인트인 것은 의도다 — 한글·이모지 한 글자가 한 글자로 센다.
2. **제어문자** — C0(`U+0000`–`U+001F`) 또는 C1(`U+007F`–`U+009F`) 범위의 문자를 하나라도 포함한다.
3. **앞뒤 공백** — `username !== username.trim()`. 서버는 공백을 잘라 주지 않고 거절한다.

2·3 은 같은 메시지 `username에 제어문자나 앞뒤 공백을 쓸 수 없습니다` 를 쓴다. 길이 검사가 제어문자·공백 검사보다 먼저 수행되어, 두 규칙을 동시에 어긴 이름은 길이 메시지를 받는다. 상수 `USERNAME_MAX_LENGTH` 는 `auth.ts` 의 이름 붙은 내보내기이고 테스트가 경계값을 잴 때 import 한다 — 값을 바꾸려면 이 한 자리만 바꾼다.

**범위 — 가입 라우트에만 건다.** 이 상한은 `POST /api/auth/register` 의 새 가입에만 적용된다. 이미 저장된 `users` 행은 검사하지도 정리하지도 않으며, 로그인은 상한을 넘는 이름으로도 저장된 행이 있으면 그대로 성립한다. **봇 이름은 이 SPEC 의 범위 밖이고 상한이 없다** — `server/src/routes-bots.ts` 의 `POST /api/bots` 는 이름이 비어 있지 않은지만 본다(`SPEC-ROOM-001` 소관). 그래서 메시지의 `author_name` 이 사용자 이름 **또는** 봇 이름인 자리에서는 이 요구사항이 길이 상한을 보장하지 않는다. 이 요구사항을 전역 이름 상한으로 읽지 않는다.

**하지 않는 것 (의도된 비목표).** 허용 문자 집합(allowlist)은 두지 않는다. `홍길동` 같은 한글·비ASCII 이름은 그대로 통과해야 하며, ASCII 영숫자로 좁히는 것은 이 요구사항이 요청받지 않은 축소다. 대소문자 통일·내부 공백 정리 같은 정형화도 하지 않는다(§5 「운영 관심사」).

**REQ-AUTH-007** (When — 중복 감지)
이미 존재하는 `username` 으로 가입 요청이 오면, 서버는 상태 코드 `409` 를 응답해야 한다.

**REQ-AUTH-008** (When — 이벤트 구동)
`POST /api/auth/login` 이 저장된 자격증명과 일치하면, 서버는 32바이트 난수 토큰을 `sessions` 에 저장하고 그 값을 `md_session` 쿠키로 내려야 한다. 쿠키는 `httpOnly: true`, `sameSite: 'lax'`, `path: '/'` 여야 한다.

**REQ-AUTH-009** (When — 인증 실패 감지)
존재하지 않는 사용자 이름이거나 비밀번호가 틀린 로그인 요청이 감지되면, 서버는 상태 코드 `401` 을 응답해야 한다. 응답 본문은 두 경우를 구분해서는 안 된다.

**REQ-AUTH-010** (When — 이벤트 구동)
`POST /api/auth/logout` 이 호출되면, 서버는 해당 토큰의 `sessions` 행을 삭제하고 `md_session` 쿠키를 지워야 한다. 쿠키가 없는 요청에도 오류 없이 `{ ok: true }` 를 응답한다.

### 3.3 보호 라우트 진입 검사

**REQ-AUTH-011** (When — 이벤트 구동)
`requireAuth` 가 preHandler 로 실행되고 `md_session` 쿠키의 토큰이 `sessions` 에서 조회되면, `req.user` 에 `{ id, username }` 을 설정하고 요청을 통과시켜야 한다.

**REQ-AUTH-012** (When — 미인증 감지)
`md_session` 쿠키가 없거나 그 토큰이 `sessions` 에 없는 요청이 감지되면, `requireAuth` 는 상태 코드 `401` 을 응답하고 핸들러를 실행시키지 않아야 한다.

**REQ-AUTH-013** (Unwanted — shall not)
이 SPEC 이 등록하는 라우트 가운데 인증 없이 접근 가능한 경로는 `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` 세 개뿐이어야 한다. `GET /api/health` 는 `SPEC-CORE-001` 이 이미 인증 없이 등록해 둔 경로로 이 SPEC 의 범위 밖이며, 그대로 둔다 — 이 요구사항은 그 경로의 삭제를 요구하지 않는다. 이 SPEC 은 그 밖의 어떤 도메인 라우트도 등록하지 않으며, 뒤따르는 SPEC 이 등록할 도메인 라우트는 `requireAuth` 를 preHandler 로 달지 않고 동작해서는 안 된다.

`GET /api/me` 는 이 SPEC 의 라우트가 아니다. 원본 Task 3 의 테스트가 `requireAuth` 를 걸어 볼 대상으로 쓰는 **테스트 전용 경로**이며, 테스트의 `build()` 헬퍼 안에서만 등록된다. `server/src` 의 어떤 파일에도 이 경로를 등록해서는 안 된다.

### 3.4 범위 경계 (금지)

**REQ-AUTH-014** (Unwanted — shall not)
이 SPEC 의 구현은 방·봇 등록·봇 초대·메시지·멘션 파서·SSE·WebSocket 게이트웨이·권한 릴레이 라우트를 등록해서는 안 된다. 구현 후 `server/src` 에는 `config.ts`, `db.ts`, `index.ts`, `auth.ts` **네 파일만** 존재한다. `routes-rooms.ts` 는 `SPEC-ROOM-001`, `routes-bots.ts` 는 `SPEC-ROOM-001`(등록)과 `SPEC-BOT-001`(초대)의 소관이며 이 SPEC 에서 만들지 않는다.

**REQ-AUTH-015** (Unwanted — shall not)
이 SPEC 의 구현은 `server/src/db.ts` 의 `SCHEMA` 상수를 변경해서는 안 된다. 필요한 여덟 테이블과 두 인덱스는 SPEC-CORE-001 이 이미 만들었다. 스키마 변경이 필요해 보이면 진행을 멈추고 보고한다.

---

## 4. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 SPEC-CORE-001 이 설치한 것을 그대로 쓴다: `fastify ^5`, `@fastify/cookie`, `better-sqlite3`, `vitest`. 이 SPEC 은 새 의존성을 추가하지 않는다.
- 비밀번호 해싱과 세션 토큰 생성은 Node 표준 `node:crypto` 만 쓴다(`randomBytes`, `scryptSync`, `timingSafeEqual`). 외부 해싱 라이브러리를 도입하지 않는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- 서버 데이터는 전부 `MINIDISCORD_DATA_DIR`(기본 `./data`) 아래. 테스트는 `mkdtempSync` 임시 디렉터리를 쓴다.
- UI 문구(오류 메시지 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 앞의 세 항목은 같은 카드 `t2` 의 형제 SPEC 이, 나머지는 이후 카드(t3-t6)가 담당한다.

### Out of Scope — 방 API

- `server/src/routes-rooms.ts` 와 `registerRoomRoutes` — 방 목록·생성·보관
- `GET /api/rooms`, `POST /api/rooms`, `POST /api/rooms/:id/archive`
- 보관 시 토큰 일괄 철회, `onArchive` 훅
- 소관: **SPEC-ROOM-001**

### Out of Scope — 봇 등록 API

- `server/src/routes-bots.ts` 와 `registerBotRoutes` — 봇 정의 등록·목록
- `GET /api/bots`, `POST /api/bots`
- 소관: **SPEC-ROOM-001**

### Out of Scope — 봇 초대·토큰 발급 API

- `POST /api/rooms/:id/invites`, `GET /api/rooms/:id/invites`, `DELETE /api/rooms/:id/invites/:botId`
- 32바이트 난수 토큰 발급, `sha256Hex`, `bot_tokens.token_hash` 저장, 재초대 시 기존 토큰 철회
- 세션 실행 명령 안내 문자열(`MINIDISCORD_TOKEN` / `MINIDISCORD_SERVER` export 문)
- 소관: **SPEC-BOT-001**

### Out of Scope — 메시지와 멘션

- 메시지 전송(multipart)/목록/다운로드 라우트, 첨부 파일 저장 (`routes-messages.ts`)
- `@TO` / `@CC` 멘션 파서 (`mention.ts`)
- `messages` / `message_targets` / `attachments` 테이블 위의 어떤 로직도 만들지 않는다

### Out of Scope — 실시간 전송 계층

- SSE 허브 (`sse.ts`) — 브라우저 실시간 push
- 봇 게이트웨이 WebSocket 서버 (`gateway.ts`) — 토큰 인증, 방 구독, `missed_after_id` 커서 재전송
- 권한 릴레이 브로커 (`permissions.ts`)

### Out of Scope — 채널 플러그인 워크스페이스

- `channel/` 패키지의 어떤 파일도 만들지 않는다
- MCP 채널 계약 구현, 게이트웨이 클라이언트, 재접속 백오프

### Out of Scope — 웹 UI

- `web/index.html`, `web/app.js`, `web/style.css`
- 로그인 화면, 방 목록 사이드바
- `@fastify/static` 정적 서빙 설정

### Out of Scope — 인증 심화

- 세션 만료·회전, 로그인 시도 제한(rate limit), CSRF 토큰
- 비밀번호 변경·재설정, 계정 삭제, 관리자 역할
- 방별 접근 권한(원본 `spec-v2.md` 2장이 YAGNI 로 명시적으로 배제)

  > **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 이 항목은 뒤집혔다 — `SPEC-ROOMAUTHZ-001` 이 방별 접근 권한을 만들었다. 이 SPEC 의 `requireAuth` 는 바뀌지 않으며, 멤버십 검사는 그 **뒤에** 오는 별도 preHandler 다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.
- HTTPS 및 `secure` 쿠키 속성 — 평문 HTTP 를 수용하는 것이 원본 설계의 결정이다

### Out of Scope — 운영 관심사

- 마이그레이션 도구, 배포 스크립트, 로깅 설정
- 사용자 이름 정형화(trim·대소문자 통일)

  > **단서 (2026-09-03, 카드 `t33`, v0.6.0).** 정형화는 여전히 하지 않는다. 다만 앞뒤 공백을 **잘라 주는** 대신 **거절**하고, 길이·제어문자 상한도 건다 — REQ-AUTH-016. 「범위 밖」은 서버가 이름을 고쳐 쓰지 않는다는 뜻이지, 어떤 이름이든 받는다는 뜻이 아니다.

---

## 6. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다(AC-AUTH-001..015). 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 7. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 3(인증)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 2장 기능 요구사항, 5장 데이터 모델, 9장 보안
- `.moai/specs/SPEC-CORE-001/` — 이 SPEC 이 올라서는 토대 (`buildServer`, `openDb`, 여덟 테이블)
- `SPEC-ROOM-001` — 방 API·봇 등록 API (이 SPEC 의 `requireAuth` 를 소비한다)
- `SPEC-BOT-001` — 봇 초대·토큰 발급 API (`SPEC-ROOM-001` 뒤에 온다)
- 칸반 카드 `t2` (마일스톤 M2)
