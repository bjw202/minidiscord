---
id: SPEC-ROOM-001
title: "minidiscord 방 API와 봇 등록 API"
version: "0.4.0"
status: draft
created: 2026-08-26
updated: 2026-08-26
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "rooms, archive, bots, registration, routes"
tier: M
depends_on: [SPEC-CORE-001, SPEC-AUTH-001]
---

# SPEC-ROOM-001 — minidiscord 방 API와 봇 등록 API

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-26 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 에서 도출 (칸반 카드 `t2`). 원래 카드 `t2` 는 인증·방·봇 등록·봇 초대를 한 SPEC(요구사항 33개, 수용 기준 27개)으로 묶었는데, `.claude/rules/moai/workflow/spec-workflow.md` 의 Tier 상한(Tier M 16/16, Tier L 25/25)을 넘겼다. 상한을 늘리는 대신 규칙이 지시하는 대로 쪼개서, 카드 `t2` 가 `SPEC-AUTH-001` → `SPEC-ROOM-001` → `SPEC-BOT-001` 세 개의 Tier M SPEC 을 의존 순서대로 내놓는다. 이 문서는 그 가운데 두 번째다. | manager-spec |
| 0.2.0 | 2026-08-26 | **plan-audit 교정 라운드.** `.moai/reports/plan-audit/t2-3spec-audit.md` 가 이 SPEC 을 **FAIL**(0.74, Tier M 기준선 0.80)로 판정했고, 차단 1건(ROOM-B1)·중대 3건·경미 4건을 지적했다. 전부 반영했다. 보관 실패 응답을 `404`(방 없음) 와 `409`(이미 보관됨)로 나눠 `SPEC-BOT-001` 의 초대 실패 응답과 의미를 맞췄고(원본으로부터의 의도적 이탈 — `plan.md` §D 7번), `buildServer` 등록을 요구사항 층에 올렸으며(REQ-ROOM-014), `POST /api/rooms` 응답의 다섯 키를 REQ-ROOM-003 에 못 박았다. 요구사항 13→14개, 수용 기준 10→11개로 Tier M(16/16) 이내다. | manager-spec |
| 0.3.0 | 2026-08-26 | **plan-audit 2차 교정 라운드 (소규모).** `.moai/reports/plan-audit/t2-3spec-audit-iter2.md` 가 **PASS**(0.88, Tier M 기준선 0.80, 차단 0건)로 판정했고, 남은 중대 2건만 닫았다. **R1** — 범위 경계 기준(AC-ROOM-009)의 관측 조건이 "출력이 비어 있다" 하나뿐이라, M1 단계 0 을 건너뛴 실행에서도 통과했다. `git rev-parse --verify` 로 기준 SHA 확인을 앞에 두고 두 명령 모두 **종료 코드 `0`** 을 관측 조건에 넣었다. **R2** — AC-ROOM-011 이 쓰는 임시 `MINIDISCORD_DATA_DIR` 이 `SPEC-BOT-001` 착수 이후 반영되지 않게 될 예정이었다. `server/src/config.ts` 의 `dataDir` 을 게터로 고쳤다 — `SPEC-CORE-001` 산출물을 카드 `t2` 에서 수정한 것이며, 사유는 `AC-ROOM-011` hermetic 보장이다(`plan.md` §D 8번). 요구사항 14개·수용 기준 11개로 개수는 그대로다. | manager-spec |
| 0.4.0 | 2026-08-26 | **plan-audit 3차 교정 라운드 (기준 관측성 한정).** `.moai/reports/plan-audit/t2-3spec-audit-iter3.md` 가 이 SPEC 을 **FAIL**(0.88, Tier M 기준선 0.80, 차단 2건)로 판정했다 — 점수는 기준선을 넘었고 실패 사유는 차단 결함이다. 리드 지시에 따라 **D1 하나만** 닫는다. "이름 붙은 기존 테스트가 통과한다"를 관측으로 삼은 기준 세 개(AC-ROOM-001·005·006)가 명령을 `npm test -w server` 로 지정하고 있었는데, 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않는다. 그 결과 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같았다 — 둘 다 종료 코드 `0` 이라 검사가 아무것도 검사하지 못했다. 명령을 `npm test -w server -- --reporter=verbose` 로 바꾸고, 관측 대상을 `✓ test/rooms-bots.test.ts > <describe 이름> > <테스트 이름>` 줄이 출력에 실제로 나타나는가로 바꿨다. `plan.md` §H 에 같은 결함이 되돌아오는 것을 막는 안티패턴을 더했다. 요구사항 14개·수용 기준 11개로 개수는 그대로다. D2(원본 `plan-v2.md` 부재)는 리드 판단 대기라 이번 범위 밖이다. | manager-spec |

---

## 1. 배경과 목적

SPEC-CORE-001 이 서버 토대(`buildServer`, `openDb`, 여덟 테이블)를 놓았고, SPEC-AUTH-001 이 그 위에 사람을 식별하는 계층(세션 쿠키와 `requireAuth`)을 얹었다. 이 SPEC 은 **인증된 사람이 다룰 대상**을 만든다.

이 SPEC 이 끝나면 다음이 가능해진다.

1. 로그인한 사람이 방을 만들고, 활성 방과 보관된 방을 나눠 본다.
2. 끝난 방을 보관한다. 보관은 되돌릴 수 없고, 그 방의 활성 봇 토큰을 한 트랜잭션 안에서 함께 철회한다.
3. 봇 정의(표시용 이름과 설명)를 전역으로 등록하고 목록으로 본다.

세 가지 모두 **다음 SPEC 이 딛고 설 대상**이다. SPEC-BOT-001 의 초대 API 는 "어느 방에" "어느 봇을" 부를지를 여기서 만들어진 두 행에서 가져온다. 방이 없으면 초대할 자리가 없고, 봇 정의가 없으면 초대할 상대가 없다.

경계를 하나 분명히 해 둔다. 이 SPEC 은 **인증을 정의하지 않고 소비한다.** `requireAuth` 와 `md_session` 쿠키 계약은 SPEC-AUTH-001 의 산출물이고, 여기서 등록하는 모든 라우트는 그것을 preHandler 로 가져다 쓸 뿐이다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4, `spec-v2.md` 2장(기능 요구사항)·5장(데이터 모델).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 방 | `rooms` 테이블의 한 행. `status` 는 `active` 또는 `archived` 둘 중 하나다 |
| 보관 | 방의 `status` 를 `archived` 로 바꾸는 되돌릴 수 없는 전이. 그 방의 활성 봇 토큰이 함께 철회된다 |
| 봇 정의 | `bots` 테이블의 한 행. 표시용 이름과 설명뿐이며 페르소나 내용은 담지 않는다 |
| 활성 토큰 | `bot_tokens` 중 `revoked_at IS NULL` 인 행. 이 SPEC 은 토큰을 발급하지 않고 철회만 한다 |
| `onArchive` 훅 | `registerRoomRoutes` 가 선택적으로 받는 콜백. 보관 직후 방 `id` 로 호출된다 |
| 보호 라우트 | `requireAuth` 를 preHandler 로 다는 라우트. 이 SPEC 이 등록하는 다섯 경로가 전부 여기 해당한다 |

---

## 3. 요구사항 (GEARS)

### 3.1 방 API

**REQ-ROOM-001** (Ubiquitous)
`server/src/routes-rooms.ts` 는 `registerRoomRoutes(app: FastifyInstance, opts?: { onArchive?: (roomId: number) => void }): void` 를 내보내야 한다. 이 함수가 등록하는 모든 경로는 `requireAuth` 를 preHandler 로 달아야 한다.

**REQ-ROOM-002** (When — 이벤트 구동)
`GET /api/rooms` 가 호출되면, 서버는 `{ active: Room[], archived: Room[] }` 형태로 응답해야 한다. `Room` 은 `{ id, name, status, created_at, archived_at }` 이고, 두 배열 모두 `id` 내림차순이다.

**REQ-ROOM-003** (When — 이벤트 구동)
`POST /api/rooms` 가 공백이 아닌 `name` 으로 호출되면, 서버는 앞뒤 공백을 제거한 이름으로 방을 만들고 상태 코드 `201` 과 `status` 가 `active` 인 방 객체를 응답해야 한다. 응답 객체의 키 집합은 `GET /api/rooms` 가 돌려주는 `Room` 과 **정확히 같아야** 한다 — `id`, `name`, `status`, `created_at`, `archived_at` 다섯 개다. 활성 방이므로 `archived_at` 의 값은 `null` 이지만, 키 자체는 있어야 한다. 생성 응답과 목록 응답의 모양이 갈라지면 클라이언트가 두 형태를 따로 다뤄야 한다.

**REQ-ROOM-004** (When — 빈 이름 감지)
`name` 이 없거나 공백뿐인 방 생성 요청이 감지되면, 서버는 상태 코드 `400` 을 응답해야 한다.

**REQ-ROOM-005** (When — 이벤트 구동)
`POST /api/rooms/:id/archive` 가 활성 방에 대해 호출되면, 서버는 한 트랜잭션 안에서 (1) 방의 `status` 를 `archived` 로, `archived_at` 을 현재 시각으로 바꾸고, (2) 그 방의 모든 활성 `bot_tokens` 의 `revoked_at` 을 채운 뒤, 상태 코드 `200` 을 응답해야 한다.

**REQ-ROOM-006** (When — 대상 없음 또는 상태 충돌 감지)
존재하지 않는 방에 대한 보관 요청이 감지되면 서버는 상태 코드 `404` 를, 방은 존재하지만 이미 `archived` 인 방에 대한 보관 요청이 감지되면 상태 코드 `409` 를 응답해야 한다. 두 경우 모두 어떤 토큰도 철회하지 않아야 하며, 오류 본문은 두 경우를 서로 다른 한국어 문구로 구분해야 한다.

두 코드의 의미를 이 SPEC 과 `SPEC-BOT-001` 이 같은 규칙으로 쓴다 — `404` 는 "지목한 대상이 없다", `409` 는 "대상은 있으나 그 상태에서는 할 수 없다"다. 원본 `plan-v2.md` 는 두 경우를 `404` 하나로 합쳤으나, 그러면 클라이언트가 "방이 없다"와 "방이 보관됐다"를 구분할 수 없다. 의도적 이탈이며 근거는 `plan.md` §D 7번에 있다.

**REQ-ROOM-007** (Where — `onArchive` 훅이 주어진 경우)
`registerRoomRoutes` 에 `onArchive` 가 주어진 구성에서, 보관이 성공하면 서버는 그 방 `id` 를 인자로 훅을 정확히 한 번 호출해야 한다. 훅이 주어지지 않은 구성에서 보관은 훅 없이 성공해야 한다.

### 3.2 봇 등록 API

**REQ-ROOM-008** (Ubiquitous)
`server/src/routes-bots.ts` 는 `registerBotRoutes(app: FastifyInstance): void` 를 내보내야 한다. 이 함수가 등록하는 모든 경로는 `requireAuth` 를 preHandler 로 달아야 한다.

**REQ-ROOM-009** (When — 이벤트 구동)
`POST /api/bots` 가 공백이 아닌 `name` 으로 호출되면, 서버는 봇 정의를 만들고 상태 코드 `201` 과 `{ id, name, description }` 을 응답해야 한다. `description` 이 없으면 빈 문자열로 저장한다.

**REQ-ROOM-010** (When — 중복 또는 빈 이름 감지)
이미 존재하는 봇 이름이 감지되면 상태 코드 `409` 를, 이름이 없거나 공백뿐이면 상태 코드 `400` 을 응답해야 한다.

**REQ-ROOM-011** (When — 이벤트 구동)
`GET /api/bots` 가 호출되면, 서버는 `{ id, name, description }` 객체의 배열을 이름 오름차순으로 응답해야 한다. 응답에는 페르소나에 해당하는 어떤 필드도 포함되지 않는다.

### 3.3 범위 경계 (금지)

**REQ-ROOM-012** (Unwanted — shall not)
이 SPEC 의 구현은 메시지·멘션 파서·SSE·WebSocket 게이트웨이·권한 릴레이 라우트를 등록해서는 안 된다. 구현 후 `server/src` 에는 `config.ts`, `db.ts`, `index.ts`, `auth.ts`, `routes-rooms.ts`, `routes-bots.ts` 여섯 파일만 존재한다.

**REQ-ROOM-013** (Unwanted — shall not)
이 SPEC 의 구현은 `server/src/db.ts` 의 `SCHEMA` 상수를 변경해서는 안 된다. 필요한 여덟 테이블과 두 인덱스는 SPEC-CORE-001 이 이미 만들었다. 스키마 변경이 필요해 보이면 진행을 멈추고 보고한다.

### 3.4 서버 조립

**REQ-ROOM-014** (Ubiquitous)
`buildServer` 는 `registerRoomRoutes(app)` 와 `registerBotRoutes(app)` 를 `registerAuthRoutes` 호출 뒤에 등록해야 한다. 두 모듈을 내보내기만 하고 조립하지 않으면, 테스트는 각자 인스턴스를 배선하므로 전부 통과하는데 실제로 띄운 서버에는 방·봇 라우트가 없어 모든 요청이 `404` 가 된다. 등록은 `AC-ROOM-011` 이 `buildServer()` 를 직접 호출해 관측한다.

---

## 4. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 SPEC-CORE-001 이 설치한 것을 그대로 쓴다: `fastify ^5`, `@fastify/cookie`, `better-sqlite3`, `vitest`. 이 SPEC 은 새 의존성을 추가하지 않는다.
- 이 SPEC 이 만드는 파일은 `server/src/routes-rooms.ts`, `server/src/routes-bots.ts`(등록 부분만), `server/test/rooms-bots.test.ts` 셋이다. `server/src/index.ts` 는 라우트 등록 두 줄만 고친다.
- 모든 데이터 접근은 `req.server.db` 하나의 연결을 쓴다. `registerRoomRoutes` / `registerBotRoutes` 는 DB 를 인자로 받지 않는다.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- 서버 데이터는 전부 `MINIDISCORD_DATA_DIR`(기본 `./data`) 아래. 테스트는 `mkdtempSync` 임시 디렉터리를 쓴다.
- UI 문구(오류 메시지 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).

### 4.1 선행 SPEC 에서 소비하는 것

이 SPEC 은 아래를 **정의하지 않고 가져다 쓴다.** 셋 중 하나라도 없으면 이 SPEC 의 테스트는 실행되지 않는다.

| 소비 대상 | 출처 | 쓰이는 곳 |
|-----------|------|-----------|
| `requireAuth(req, reply)` preHandler | SPEC-AUTH-001 (`server/src/auth.ts`) | 이 SPEC 이 등록하는 다섯 경로 전부 |
| `md_session` 세션 쿠키 계약 | SPEC-AUTH-001 | 이 SPEC 이 만드는 `{ app, cookie }` 헬퍼가 그 계약으로 로그인해 쿠키를 얻는다 |
| `app.db` 데코레이터와 `req.server.db` | SPEC-AUTH-001 (`buildServer` 수정분) | 두 라우트 모듈의 모든 쿼리 |
| `rooms` / `bots` / `bot_tokens` 테이블 | SPEC-CORE-001 (`db.ts` 의 `SCHEMA`) | 읽기·쓰기 대상 |

테스트 헬퍼 하나는 이 SPEC 이 **만든다**. `server/test/rooms-bots.test.ts` 의 `build()` 는 가입·로그인까지 마친 `{ app, cookie }` 를 돌려주며, `SPEC-BOT-001` 의 모든 시나리오가 같은 헬퍼를 쓴다. `SPEC-AUTH-001` 이 `auth.test.ts` 에 둔 `build()` 는 `app` 하나만 돌려주는 **다른 헬퍼**이고 내보내지 않는다 — 두 헬퍼를 같은 것으로 다루면 안 된다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목 뒤에 그것을 담당하는 SPEC 을 적었다.

### Out of Scope — 인증과 세션 (SPEC-AUTH-001)

- 회원가입·로그인·로그아웃 라우트, 비밀번호 해싱(`hashPassword` / `verifyPassword`)
- `md_session` 쿠키 발급과 삭제, `sessions` 테이블 위의 로직
- `requireAuth` preHandler 자체의 구현과 `FastifyRequest.user` 선언
- `app.db` 데코레이터 선언과 `@fastify/cookie` 등록 — 이 SPEC 은 이미 있는 것을 쓴다

### Out of Scope — 봇 초대와 토큰 발급 (SPEC-BOT-001)

- `POST /api/rooms/:id/invites` 초대 생성과 1회용 평문 토큰 발급
- `GET /api/rooms/:id/invites` 초대 목록, `DELETE /api/rooms/:id/invites/:botId` 철회
- `sha256Hex(s: string): string` 과 `bot_tokens.token_hash` 저장 형식
- 세션 실행 명령 안내 문자열(`command`)과 그 안의 환경변수 이름
- `online` 필드와 그 판정
- 이 SPEC 은 보관 시 `bot_tokens` 를 **철회만** 한다. 발급 경로는 만들지 않는다

### Out of Scope — 메시지와 멘션 (이후 카드 t3 이후)

- 메시지 전송(multipart)/목록/다운로드 라우트, 첨부 파일 저장 (`routes-messages.ts`)
- `@TO` / `@CC` 멘션 파서 (`mention.ts`)
- `messages` / `message_targets` / `attachments` 테이블 위의 어떤 로직도 만들지 않는다

### Out of Scope — 실시간 전송 계층 (이후 카드 t3 이후)

- SSE 허브 (`sse.ts`), 봇 게이트웨이 WebSocket 서버 (`gateway.ts`), 권한 릴레이 브로커 (`permissions.ts`)
- `bot_tokens.last_delivered_id` / `last_seen_at` 컬럼을 읽거나 쓰지 않는다
- `onArchive` 훅은 **자리만** 만든다. 훅이 실제로 게이트웨이 연결을 끊는 동작은 이후 카드 소관이다

### Out of Scope — 채널 플러그인과 웹 UI (이후 카드 t4-t5)

- `channel/` 패키지의 어떤 파일도 만들지 않는다
- `web/index.html`, `web/app.js`, `web/style.css`, 방 목록 사이드바, 봇 등록 화면
- `@fastify/static` 정적 서빙 설정

### Out of Scope — 운영 관심사

- 보관 방의 되돌리기(unarchive), 방 삭제, 방 이름 변경
- 봇 정의 수정·삭제
- 방별 접근 권한 — 원본 `spec-v2.md` 2장이 YAGNI 로 명시적으로 배제했다
- 마이그레이션 도구, 배포 스크립트, 로깅 설정

---

## 6. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 7. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 4
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 2장 기능 요구사항, 5장 데이터 모델
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `openDb`, 여덟 테이블)
- `.moai/specs/SPEC-AUTH-001/` — 선행 SPEC (`requireAuth`, 세션 쿠키, `app.db`)
- `.moai/specs/SPEC-BOT-001/` — 후행 SPEC (봇 초대와 토큰 발급)
- 칸반 카드 `t2`
