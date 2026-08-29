---
id: SPEC-CORE-001
title: "minidiscord 저장소 스캐폴드와 SQLite 스키마 기반"
version: "0.3.0"
status: completed
created: 2026-08-26
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "scaffold, workspaces, fastify, sqlite, schema, foundation"
tier: M
---

# SPEC-CORE-001 — minidiscord 저장소 스캐폴드와 SQLite 스키마 기반

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-26 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan.md` Task 1-2 에서 도출 (칸반 카드 `t1`, 마일스톤 M1). | manager-spec |
| 0.2.0 | 2026-08-27 | REQ-CORE-010 개정 — 수신 호스트를 `0.0.0.0` 고정에서 `127.0.0.1` 기본 + `MINIDISCORD_HOST` 확장으로 바꿨다. 근거: `.moai/reports/t3/sync-audit.md` F-03, `.moai/reports/t3/sync-reaudit.md` N-04. 구현(`server/src/config.ts:6`, `server/src/index.ts:67`)은 이미 개정 내용을 따르고 있어 SPEC 을 코드에 맞춘 개정이다. AC-CORE-015 에 3단계(호스트 관측)를 추가했다. | manager-spec |
| 0.3.0 | 2026-08-27 | REQ-CORE-005 정렬 — 설정 객체 열거를 실제 export 6개(`port`, `host`, `dataDir`, `dbPath`, `uploadsDir`, `botFilesDir`)로 맞췄다. 근거: `server/src/config.ts` 실제 export 관측. 새 요구사항이 아니라 관측 사실 정렬이다. AC-CORE-007 에 키 열거 확인을 추가했다. | manager-spec |

---

## 1. 배경과 목적

minidiscord는 내 PC에서 도는 자체 호스팅 채팅 서버다. 서버는 단일 Node 프로세스(Fastify + SQLite)로 동작하고, 이후 인증·방·봇·메시지·게이트웨이가 모두 이 하나의 서버 인스턴스와 하나의 SQLite 연결 위에 얹힌다.

이 SPEC은 그 **토대**만 만든다. 두 가지 산출물이 이후 모든 작업의 진입점이 된다.

- `buildServer(): Promise<FastifyInstance>` — 이후 모든 라우트가 이 인스턴스에 등록된다.
- `openDb(path: string): Db` — 이후 모든 데이터 접근이 이 연결을 공유한다.

토대가 흔들리면 뒤따르는 모든 카드가 흔들린다. 그래서 이 SPEC은 범위를 좁게 잡되, 두 산출물의 계약(시그니처·테이블 목록·설정 키)은 정확히 고정한다.

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan.md` Task 1-2 및 `spec.md` 5장(데이터 모델).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 워크스페이스 루트 | `workspaces: ["server", "channel"]` 을 선언한 저장소 최상단 `package.json` |
| 데이터 디렉터리 | 서버가 쓰는 모든 상태(DB 파일, 업로드 파일)가 놓이는 경로. 기본값 `./data` |
| `Db` | `better-sqlite3` 의 `Database.Database` 타입 별칭 |
| 멱등한 스키마 | 같은 DB 파일에 대해 몇 번을 다시 열어도 기존 데이터가 보존되는 스키마 생성 |

---

## 3. 요구사항 (GEARS)

### 3.1 워크스페이스와 빌드 설정

**REQ-CORE-001** (Ubiquitous)
저장소 루트의 `package.json` 은 `private: true` 이고 `workspaces` 가 정확히 `["server", "channel"]` 인 npm workspaces 루트여야 한다.

**REQ-CORE-002** (Ubiquitous)
`server/package.json` 은 `type: "module"` 이고, `dev` / `test` / `typecheck` 세 개의 스크립트를 노출해야 한다.

**REQ-CORE-003** (Ubiquitous)
`server/tsconfig.json` 은 `strict: true`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `target: "ES2022"` 를 선언하고 `src` 와 `test` 를 모두 컴파일 대상에 포함해야 한다.

**REQ-CORE-004** (Ubiquitous)
`.gitignore` 는 `node_modules/`, `data/`, `dist/` 를 추적 대상에서 제외해야 한다.

### 3.2 설정 (config)

**REQ-CORE-005** (Ubiquitous)
`server/src/config.ts` 는 `port`, `host`, `dataDir`, `dbPath`, `uploadsDir`, `botFilesDir` 여섯 개의 값을 가진 설정 객체를 내보내야 한다.

> `host` 의 기본값·확장 규칙은 REQ-CORE-010 이 정한다. `botFilesDir` 는 봇 첨부의 허용 뿌리이며 미설정이면 봇 첨부를 전부 거부하는 fail-closed 값이다(`.moai/reports/t3/sync-audit.md` F-01) — 이 SPEC 은 두 값이 설정 객체에 존재한다는 사실만 규정하고, 그 의미는 각 소관 요구사항이 정한다.

**REQ-CORE-006** (Where — 환경변수 설정 여부)
`MINIDISCORD_PORT` 가 설정된 환경에서 설정 객체의 `port` 는 그 값의 수치 변환 결과여야 하고, `MINIDISCORD_DATA_DIR` 가 설정된 환경에서 `dataDir` 는 그 값이어야 한다. 두 변수가 없으면 각각 `3000` 과 `./data` 여야 한다.

**REQ-CORE-007** (Ubiquitous)
`dbPath` 와 `uploadsDir` 는 `dataDir` 로부터 파생되어야 한다. 서버는 코드 디렉터리에 데이터 파일을 쓰지 않는다.

### 3.3 서버 조립과 헬스 체크

**REQ-CORE-008** (Ubiquitous)
`server/src/index.ts` 는 `buildServer(): Promise<FastifyInstance>` 를 이름 붙은 내보내기로 제공해야 한다. 이 함수는 서버를 조립만 하고 포트를 열지 않는다.

**REQ-CORE-009** (When — 이벤트 구동)
클라이언트가 `GET /api/health` 를 호출하면, 서버는 상태 코드 `200` 과 본문 `{ "ok": true }` 를 응답해야 한다.

**REQ-CORE-010** (Where — 진입점 직접 실행)
`server/src/index.ts` 가 프로세스 진입점으로 직접 실행된 경우, 서버는 `config.port` 와 `config.host` 로 수신을 시작해야 한다. `config.host` 는 `MINIDISCORD_HOST` 가 설정된 환경에서는 그 값이어야 하고, 설정되지 않으면 루프백 `127.0.0.1` 이어야 한다. 테스트가 모듈을 가져오기만 할 때는 수신하지 않는다.

> 기본값이 `0.0.0.0` 이 아니라 `127.0.0.1` 인 이유: README 가 선언한 "내 PC에서만 도는 서버" 전제 위에서 HTTPS·세션 만료·CSRF·방 멤버십을 범위 밖으로 두었으므로, 코드가 그 전제를 스스로 지켜야 한다. 모든 인터페이스 바인드는 같은 네트워크의 누구나 가입해 모든 방을 읽을 수 있게 만든다(`.moai/reports/t3/sync-audit.md` F-03). 넓혀야 할 때는 `MINIDISCORD_HOST` 로 운영자가 명시적으로 연다.

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 문단이 범위 밖으로 둔 넷 중 **방 멤버십은 `SPEC-ROOMAUTHZ-001` 이 만들었다.** 그러나 **루프백 기본값은 그대로 유지한다** — 나머지 셋(HTTPS·세션 만료·CSRF)이 여전히 범위 밖이고, 멤버십은 방 단위 인가일 뿐 전송 계층을 보호하지 않기 때문이다. 인용된 F-03(모든 인터페이스 바인드 시 누구나 가입해 모든 방을 읽는다)의 뒷부분은 이제 좁아졌다 — 가입해도 자기가 멤버인 방만 읽는다. 하지만 첨부 다운로드 경로는 아직 열려 있다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.

### 3.4 데이터베이스 스키마

**REQ-CORE-011** (Ubiquitous)
`server/src/db.ts` 는 `openDb(path: string): Db` 와 타입 `Db` 를 내보내야 한다.

**REQ-CORE-012** (When — 이벤트 구동)
`openDb` 가 호출되면, 해당 DB에 `users`, `sessions`, `rooms`, `bots`, `bot_tokens`, `messages`, `message_targets`, `attachments` 여덟 개 테이블과 인덱스 `idx_messages_room`, `idx_targets_bot` 이 존재해야 한다.

**REQ-CORE-013** (When — 기존 파일 재열기)
이미 스키마가 생성된 DB 파일에 대해 `openDb` 가 다시 호출되면, 기존 행이 하나도 손실되지 않아야 한다(멱등).

**REQ-CORE-014** (Ubiquitous)
`openDb` 는 연결 직후 저널 모드를 `WAL` 로 설정해야 한다.

### 3.5 범위 경계 (금지)

**REQ-CORE-015** (Unwanted — shall not)
이 SPEC의 구현은 인증·방·봇·메시지·멘션·SSE·WebSocket 게이트웨이·권한 릴레이 라우트를 등록해서는 안 된다. `buildServer` 가 등록하는 경로는 `GET /api/health` 하나뿐이다.

---

## 4. 제약

- Node.js 20 이상, TypeScript strict 모드.
- 의존성 버전은 하한선으로 명시한다: `fastify ^5`, `better-sqlite3 ^11`, `vitest ^2`, `typescript ^5`, `tsx ^4`, `@types/node`, `@types/better-sqlite3`.
- 테스트 프레임워크는 vitest. 실행 명령은 워크스페이스 루트에서 `npm test -w server`.
- 커밋 메시지는 영어 관례(`chore:`, `feat:`, `test:`).
- 서버 데이터는 전부 `MINIDISCORD_DATA_DIR` 아래에 둔다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC에서 **만들지 않는다**. 각 항목은 이후 별도 카드(t2-t6)가 담당한다.

### Out of Scope — 인증과 세션

- 회원가입·로그인 라우트, 비밀번호 해싱, `md_session` 쿠키, `requireAuth` preHandler (plan.md Task 3)
- `users` / `sessions` 테이블은 **스키마만** 만들고 그 위의 어떤 로직도 만들지 않는다

### Out of Scope — 방·봇·토큰 도메인

- 방 생성/목록/보관 라우트, 봇 등록/목록 라우트, 방 초대와 봇 토큰 발급 (plan.md Task 4)

### Out of Scope — 메시지와 멘션

- 메시지 전송(multipart)/목록/다운로드 라우트, 첨부 파일 저장 (plan.md Task 6)
- `@TO` / `@CC` 멘션 파서 (`mention.ts`)

### Out of Scope — 실시간 전송 계층

- SSE 허브 (`sse.ts`), 봇 게이트웨이 WebSocket 서버 (`gateway.ts`), 권한 릴레이 브로커 (`permissions.ts`)

### Out of Scope — 채널 플러그인 워크스페이스

- `channel/` 패키지의 어떤 파일도 만들지 않는다. 루트 `package.json` 의 `workspaces` 배열에 이름만 선언한다
- MCP 채널 계약 구현, 게이트웨이 클라이언트, 재접속 백오프

### Out of Scope — 웹 UI와 E2E

- `web/index.html`, `web/app.js`, `web/style.css`
- `@fastify/static` 을 통한 정적 파일 서빙 설정
- `scripts/e2e.mjs` 전체 시나리오 자동 검증

### Out of Scope — 운영 관심사

- HTTPS, 배포 스크립트, 로깅 설정(`Fastify({ logger: false })` 고정), 마이그레이션 도구

---

## 6. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 7. 참조

- `.moai/plan/2026-08-26-minidiscord/plan.md` — Global Constraints, 파일 구조, Task 1, Task 2
- `.moai/plan/2026-08-26-minidiscord/spec.md` — 5장 데이터 모델, 비기능 요구사항
- 칸반 카드 `t1` (마일스톤 M1)
