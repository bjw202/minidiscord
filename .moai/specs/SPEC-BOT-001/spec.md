---
id: SPEC-BOT-001
title: "minidiscord 봇 초대 API — 게이트웨이 토큰 발급과 세션 실행 명령 안내"
version: "0.1.0"
status: draft
created: 2026-08-26
updated: 2026-08-26
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "bot-invite, bot-token, sha256, one-time-token, invite-command, gateway-credential"
tier: M
---

# SPEC-BOT-001 — 봇 초대 API (게이트웨이 토큰 발급 + 세션 실행 명령 안내)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-26 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5 에서 도출 (칸반 카드 `t2`, 마일스톤 M2). 원본 초안이 요구사항 33개·수용 기준 27개로 Tier L 상한(25/25)을 넘겨 운영자 승인 아래 3분할했고, 이 SPEC은 그 세 번째 조각이다. | manager-spec |

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

이 SPEC이 끝나면, 로그인한 사람이 자기가 만든 활성 방에 등록된 봇을 초대해서 **(방, 봇) 조합 하나에 대한 게이트웨이 접속 토큰**과 **터미널에 그대로 붙여 넣을 실행 명령 안내**를 한 번 받는다.

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

**REQ-BOT-002** (Unwanted — shall not)
평문 토큰은 초대 생성 응답 이외의 어떤 경로로도 다시 노출되어서는 안 된다. 목록 조회 응답에 `token` 필드가 있어서는 안 되고, 어떤 라우트도 `token_hash` 를 반환해서는 안 된다.

**REQ-BOT-003** (When — 재초대 감지)
같은 (방, 봇) 조합에 대한 초대 요청이 다시 감지되면, 서버는 기존 활성 토큰을 먼저 철회한 뒤 새 토큰을 발급해야 한다. 처리 후 그 조합의 활성 토큰 수는 정확히 1이다.

**REQ-BOT-004** (When — 유효하지 않은 대상 감지)
보관된 방이거나 존재하지 않는 방에 대한 초대 요청이 감지되면 상태 코드 `403` 을, 존재하지 않는 `bot_id` 가 감지되면 상태 코드 `404` 를 응답해야 한다.

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
