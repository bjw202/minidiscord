---
id: SPEC-ROOM-001
title: "minidiscord 방 API와 봇 등록 API"
version: "0.1.0"
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
related_specs: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-BOT-001]
---

# SPEC-ROOM-001 — minidiscord 방 API와 봇 등록 API

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-26 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 4 에서 도출 (칸반 카드 `t2`). 원래 카드 `t2` 는 인증·방·봇 등록·봇 초대를 한 SPEC(요구사항 33개, 수용 기준 27개)으로 묶었는데, `.claude/rules/moai/workflow/spec-workflow.md` 의 Tier 상한(Tier M 16/16, Tier L 25/25)을 넘겼다. 상한을 늘리는 대신 규칙이 지시하는 대로 쪼개서, 카드 `t2` 가 `SPEC-AUTH-001` → `SPEC-ROOM-001` → `SPEC-BOT-001` 세 개의 Tier M SPEC 을 의존 순서대로 내놓는다. 이 문서는 그 가운데 두 번째다. | manager-spec |

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
`POST /api/rooms` 가 공백이 아닌 `name` 으로 호출되면, 서버는 앞뒤 공백을 제거한 이름으로 방을 만들고 상태 코드 `201` 과 `status` 가 `active` 인 방 객체를 응답해야 한다.

**REQ-ROOM-004** (When — 빈 이름 감지)
`name` 이 없거나 공백뿐인 방 생성 요청이 감지되면, 서버는 상태 코드 `400` 을 응답해야 한다.

**REQ-ROOM-005** (When — 이벤트 구동)
`POST /api/rooms/:id/archive` 가 활성 방에 대해 호출되면, 서버는 한 트랜잭션 안에서 (1) 방의 `status` 를 `archived` 로, `archived_at` 을 현재 시각으로 바꾸고, (2) 그 방의 모든 활성 `bot_tokens` 의 `revoked_at` 을 채운 뒤, 상태 코드 `200` 을 응답해야 한다.

**REQ-ROOM-006** (When — 대상 없음 감지)
존재하지 않는 방이거나 이미 보관된 방에 대한 보관 요청이 감지되면, 서버는 상태 코드 `404` 를 응답하고 어떤 토큰도 철회하지 않아야 한다.

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
| `md_session` 세션 쿠키 계약 | SPEC-AUTH-001 | 테스트의 `build()` 헬퍼가 로그인해 쿠키를 얻는다 |
| `app.db` 데코레이터와 `req.server.db` | SPEC-AUTH-001 (`buildServer` 수정분) | 두 라우트 모듈의 모든 쿼리 |
| `rooms` / `bots` / `bot_tokens` 테이블 | SPEC-CORE-001 (`db.ts` 의 `SCHEMA`) | 읽기·쓰기 대상 |

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
