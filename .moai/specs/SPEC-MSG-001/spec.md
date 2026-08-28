---
id: SPEC-MSG-001
title: "minidiscord 메시지 API — multipart 전송·멘션 팬아웃·목록 커서·첨부 다운로드"
version: "0.2.0"
status: completed
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P0
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "messages, multipart, mention-fanout, sse, gateway-deliver, attachments, path-traversal, cursor"
tier: M
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001, SPEC-MENTION-001, SPEC-SSE-001, SPEC-GATEWAY-001]
---

# SPEC-MSG-001 — 메시지 API (multipart 전송 + 목록 + 첨부 다운로드)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.2.0 | 2026-08-27 | **plan-audit 교정 라운드.** `.moai/reports/t3-plan-audit-a.md` 가 이 SPEC 을 **CONDITIONAL PASS** 로 판정하고 must-fix 4건을 지적했다. 전부 반영했다. **M1** — 공통 테스트 하네스의 `set-cookie` 처리가 `light-my-request` 의 실제 반환(배열이 아닌 문자열 하나)과 어긋나 열두 기준이 통째로 실행 불가능했다. 기존 `server/test/rooms-bots.test.ts:21-26` 과 같은 `setCookieOf` 정규화로 바꿨다. **M2·M4** — 프로덕션 배선을 규범으로도 관측으로도 두지 않아, 실서버에 라우트가 등록되지 않아도 완료로 판정되는 상태였다. REQ-MSG-015(배선 + `registerMessageRoutes` 시그니처 + multipart 등록 순서)와 AC-MSG-015(실제 `buildServer()` 기동 관측)를 신설하고, REQ-MSG-006·007·009 의 "업로드 디렉터리"를 `req.server.uploadsDir` 기준으로 정정했다. **M3** — AC-MSG-009 가 `Gateway.deliver` 의 `msg` 인자를 단언하지 않아 빈 객체를 넘기는 구현이 통과했다. `msg.id`·`body`·`author_name` 과 SSE 페이로드까지 단언한다. 여기에 nice-to-have 7(MIME 표를 SPEC 본문으로 이관)을 더했다. 요구사항 14→15개, 수용 기준 14→15개. 경위는 `progress.md` §Audit Response 에 있다. | manager-spec |
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 9 에서 도출 (칸반 카드 `t3`, 마일스톤 M3). 원본 Task 9 를 `spec-v2.md` 7·8·9장과 대조하면서 모순 7건을 찾아 `plan.md` §D 에 기록했다 — 그중 3건(실패 상태 코드, 업로드 파일명 경로 이탈, 테스트 하네스의 `uploadsDir` 누락)은 원본을 그대로 옮겨 적으면 각각 계약 불일치·보안 결함·테스트 실패를 낳는다. 요구사항 14개, 수용 기준 14개 (Tier M 상한 16/16). | manager-spec |

---

## 1. 배경과 목적

카드 `t3` (마일스톤 M3)는 서버의 실시간 계층을 완성한다. 멘션 파서(`SPEC-MENTION-001`), SSE 허브(`SPEC-SSE-001`), 봇 게이트웨이(`SPEC-GATEWAY-001`)가 각자 만들어져 있고, 이 SPEC 은 그 셋을 **하나의 HTTP 요청 안에서 엮는 마지막 조각**이다.

```
SPEC-MENTION-001 (parseMentions)   ┐
SPEC-SSE-001     (SseHub.publish)  ├─→  SPEC-MSG-001 (이 SPEC — routes-messages.ts)
SPEC-GATEWAY-001 (Gateway.deliver) ┘
```

이 SPEC 이 끝나면 브라우저에서 보낸 한 번의 `POST` 가 다음을 **한 흐름으로** 수행한다.

```
multipart 수신 (body + files)
  → 파일을 디스크에 저장 (MINIDISCORD_DATA_DIR/uploads 아래)
  → 멘션 파싱 → 그 방에 초대된 봇으로만 매핑
  → messages / message_targets / attachments 기록
  → SseHub.publish 로 브라우저에 전파
  → Gateway.deliver 로 지목된 봇의 채널에만 전달
```

**이 SPEC 이 확정하는 가장 비싼 계약은 메시지 `id` 다.** `spec-v2.md` 6장이 정한 대로 `id` 는 재접속 재전송(`missed_after_id`)과 대화 따라잡기(`fetch_history` 의 `since_id`)와 브라우저 목록 조회(`?after=`)가 **모두 같은 번호 체계**를 쓴다. 이 SPEC 이 그 번호를 만들어 내는 쪽이므로, 여기서 채번 방식을 바꾸면 게이트웨이의 커서 로직과 웹 UI 의 폴링이 함께 깨진다.

두 번째로 비싼 것은 **업로드 파일이 디스크에 놓이는 자리**다. 원본 구현은 사용자가 보낸 파일명을 저장 경로에 그대로 이어 붙이는데, 그 문자열이 `../` 를 담고 있으면 업로드 디렉터리 밖에 파일이 쓰인다. 이 SPEC 은 그 경로를 봉인한다 (REQ-MSG-007, REQ-MSG-012).

근거 문서: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 9, `spec-v2.md` 5장(데이터 모델)·7장(파일 — 로컬 경로 직접 전달)·8장(에러 처리)·9장(보안).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 사용자 메시지 | `messages` 의 `author_type='user'` 인 행. 이 SPEC 이 만드는 유일한 종류다 |
| 전달 대상 | `message_targets` 의 한 행. `(message_id, bot_id, delivery)`. `delivery` 는 `'to'` 또는 `'cc'` |
| 초대된 봇 | 그 방에 `bot_tokens` 활성 행(`revoked_at IS NULL`)이 있는 봇. `SPEC-BOT-001` 이 만든다 |
| 커서 | 메시지 `id`. 방 안에서 단조 증가하며, `?after=`·`missed_after_id`·`since_id` 가 같은 값을 쓴다 |
| 업로드 디렉터리 | `config.uploadsDir` (= `MINIDISCORD_DATA_DIR/uploads`). `SPEC-CORE-001` 이 만든 게터다 |
| 저장 경로 | `attachments.stored_path`. 서버가 만든 절대/상대 경로이며 사용자가 지정하지 않는다 |
| 팬아웃 | 저장된 메시지를 SSE 허브와 게이트웨이 양쪽으로 내보내는 것 |

## 3. 선행 SPEC 에서 받아 쓰는 것

이 SPEC 은 아래를 그대로 소비하며, 어느 것도 새로 만들거나 수정하지 않는다.

| 출처 | 받아 쓰는 것 | 쓰임 |
|------|-------------|------|
| `SPEC-CORE-001` | `openDb`, `messages`/`message_targets`/`attachments` 를 포함한 여덟 테이블, `config.uploadsDir`, `buildServer` | 저장처와 업로드 경로 |
| `SPEC-AUTH-001` | `requireAuth` preHandler, `md_session` 쿠키, `req.user`, `req.server.db` | 세 라우트의 인증 |
| `SPEC-ROOM-001` | `rooms.status` 계약(`'active'` / `'archived'`) | 보관된 방으로의 전송 차단 |
| `SPEC-BOT-001` | `bot_tokens` 활성 행, `sha256Hex` | "이 방에 초대된 봇" 판정, 테스트 seed |
| `SPEC-MENTION-001` | `parseMentions(body): Mention[]`, `Mention = { bot: string; delivery: 'to' \| 'cc' }` | 멘션 추출 |
| `SPEC-SSE-001` | `createSseHub()` 와 `hub.publish(roomId, event, data)` | 브라우저 전파 |
| `SPEC-GATEWAY-001` | `createGateway(app, { uploadsDir })` 와 `gateway.deliver(roomId, msg, targets)` | 봇 채널 전달 |

---

## 4. 요구사항 (GEARS)

### 4.1 메시지 전송

**REQ-MSG-001** (When — 이벤트 구동)
`POST /api/rooms/:id/messages` 가 활성 방에 대해 multipart 요청으로 호출되면, 서버는 `body` 필드를 `messages` 에 `author_type='user'`, `author_user_id=req.user.id` 로 한 행 저장하고 상태 코드 `200` 과 `{ ok: true, message }` 를 응답해야 한다. `message` 는 저장된 행에 `author_name`(보낸 사람의 `username`)과 `attachments` 배열을 더한 객체이며, `message.id` 는 그 행의 `id` 와 같아야 한다.

**REQ-MSG-002** (When — 멘션 감지)
전송된 `body` 에서 `parseMentions` 가 멘션을 하나 이상 찾아내면, 서버는 각 멘션마다 `message_targets` 에 `(message_id, bot_id, delivery)` 한 행을 기록해야 한다. `bot_id` 는 **그 방에 초대된 봇** 중 이름이 일치하는 것으로 해석한다. 멘션이 하나도 없으면 `message_targets` 에 어떤 행도 기록해서는 안 된다.

**REQ-MSG-003** (When — 초대되지 않은 봇 감지)
멘션된 이름 가운데 그 방에 초대된 봇이 아닌 것이 하나라도 있으면, 서버는 상태 코드 `400` 과 **그 이름을 포함한** 한국어 오류 문구를 응답해야 한다. 이 경우 `messages`·`message_targets`·`attachments` 어디에도 행을 남기지 않아야 한다.

**REQ-MSG-004** (When — 전송 대상 방이 유효하지 않음)
전송 요청의 실패는 두 경우를 서로 구분해야 한다.

| 감지된 상황 | 상태 코드 | 응답 본문 |
|-------------|-----------|-----------|
| 그 `id` 의 방이 없다 | `404` | "방을 찾을 수 없다"는 한국어 문구 |
| 방은 있으나 `status='archived'` 다 | `409` | "보관된 방에는 메시지를 보낼 수 없다"는 한국어 문구 — 방 없음과 **다른 문구** |

두 경우 모두 어떤 테이블에도 행을 남기지 않아야 한다.

상태 코드의 의미는 `SPEC-ROOM-001`·`SPEC-BOT-001` 과 같은 규칙을 쓴다 — `404` 는 "지목한 대상이 없다", `409` 는 "대상은 있으나 그 상태에서는 할 수 없다". 원본 `plan-v2.md` Task 9 는 두 경우를 `403` 하나로 합쳤으나, 그러면 클라이언트가 구분할 수 없고 `403`(인증됐으나 권한 없음)이 가리킬 권한 차원이 이 시스템에는 없다. **의도적 이탈이며 근거는 `plan.md` §D 1번에 있다.**

**REQ-MSG-005** (When — 빈 전송 감지)
`body` 가 공백뿐이고 첨부 파일도 하나도 없으면, 서버는 상태 코드 `400` 과 "내용이나 파일이 필요하다"는 한국어 문구를 응답하고 어떤 행도 기록해서는 안 된다.

### 4.2 파일 첨부

**REQ-MSG-006** (When — 파일 파트 감지)
multipart 요청에 파일 파트가 있으면, 서버는 각 파일을 **업로드 디렉터리** 아래에 충돌하지 않는 이름으로 저장하고, `attachments` 에 `(message_id, filename, stored_path, size, mime)` 한 행을 기록해야 한다. `filename` 은 사용자가 보낸 이름(경로 성분 제거 후)이고, `size` 는 저장된 파일의 실제 바이트 수이며, `mime` 은 아래 확장자 표로 판정하되 표에 없으면 `application/octet-stream` 이다.

| 확장자 | `mime` |
|--------|--------|
| `.txt`, `.log` | `text/plain` |
| `.md` | `text/markdown` |
| `.png` | `image/png` |
| `.jpg`, `.jpeg` | `image/jpeg` |
| `.gif` | `image/gif` |
| `.pdf` | `application/pdf` |
| `.json` | `application/json` |
| `.csv` | `text/csv` |
| `.zip` | `application/zip` |
| 그 밖의 모든 확장자 | `application/octet-stream` |

확장자 비교는 소문자로 정규화한 뒤 한다. 이 표는 `plan-v2.md:1758-1762` 의 `MIME` 상수를 옮겨 온 것이며, 이 SPEC 이 그 내용의 소유자다.

> **업로드 디렉터리의 정의.** 이 SPEC 에서 "업로드 디렉터리"는 `req.server.uploadsDir` 데코레이터가 가리키는 경로다. 프로덕션에서는 `buildServer()` 가 그 값을 `config.uploadsDir`(= `MINIDISCORD_DATA_DIR/uploads`)로 설정하고(REQ-MSG-015), 테스트에서는 하네스가 임시 디렉터리로 설정한다. 구현은 `config.uploadsDir` 을 직접 읽어서는 안 된다 — 그러면 테스트가 실제 `./data/uploads` 에 쓰게 되어 격리가 깨진다. REQ-MSG-007 과 REQ-MSG-009 의 "업로드 디렉터리"도 같은 뜻이다.

**REQ-MSG-007** (Unwanted — shall not)
업로드된 파일은 업로드 디렉터리 밖에 저장되어서는 안 된다. 사용자가 보낸 파일명은 저장 경로를 구성하기 전에 경로 성분이 제거되어야 하며(`basename`), 그 결과 `attachments.stored_path` 를 절대 경로로 해석한 값은 언제나 업로드 디렉터리를 절대 경로로 해석한 값 아래에 있어야 한다. 파일명이 `../` 를 담고 있어도 마찬가지다.

**REQ-MSG-008** (When — 다운로드 요청)
`GET /api/attachments/:id` 가 호출되면, 서버는 그 첨부의 내용을 `content-disposition: attachment` 헤더(파일명은 RFC 5987 의 `filename*=UTF-8''` 형식)와 기록된 `mime` 으로 응답해야 한다. 그 `id` 의 첨부가 없으면 `404` 와 "파일을 찾을 수 없다"는 한국어 문구를 응답한다.

**REQ-MSG-009** (Unwanted — shall not)
다운로드는 업로드 디렉터리 밖의 파일을 내보내서는 안 된다. `attachments.stored_path` 를 절대 경로로 해석한 값이 업로드 디렉터리(REQ-MSG-006 의 정의) 밖을 가리키면, 서버는 그 파일을 읽지 않고 `404` 를 응답해야 한다. REQ-MSG-007 이 쓰기 시점을 막고 이 요구사항이 읽기 시점을 막는다 — 어느 한쪽이 뚫려도 다른 쪽이 남는다.

### 4.3 팬아웃과 목록

**REQ-MSG-010** (Ubiquitous)
메시지 저장이 끝나면 서버는 두 가지를 **각각 정확히 한 번씩** 수행해야 한다 — `SseHub.publish(roomId, 'message', payload)` 로 브라우저에 전파하고, `Gateway.deliver(roomId, msg, targets)` 로 지목된 봇에게 전달한다. `targets` 는 REQ-MSG-002 가 만든 `{ botId, delivery }` 목록과 같아야 하며, 멘션이 없으면 빈 배열이다. 두 호출의 `roomId` 는 전송된 방이어야 한다.

**REQ-MSG-011** (When — 이벤트 구동)
`GET /api/rooms/:id/messages?after=<id>` 가 호출되면, 서버는 **그 방의** 메시지 중 `id` 가 `after` 보다 큰 것을 `id` 오름차순으로 최대 200개까지 `{ messages: [...] }` 로 응답해야 한다. `after` 가 없으면 `0` 으로 본다. 각 메시지는 `author_name` 과 `attachments` 배열을 포함해야 한다. `author_name` 은 `author_type` 에 따라 사용자의 `username` / 봇의 `name` / `'시스템'` 이다.

**REQ-MSG-012** (Ubiquitous)
메시지 `id` 는 방 안에서 단조 증가하는 커서이며, 이 SPEC 의 `?after=` 조회와 `SPEC-GATEWAY-001` 의 `missed_after_id` / `bot_tokens.last_delivered_id` 가 **같은 번호 체계**를 쓴다. 이 SPEC 은 `messages.id`(`SPEC-CORE-001` 의 AUTOINCREMENT 기본 키) 외의 별도 방별 번호를 만들어서는 안 된다.

### 4.4 프로덕션 배선

**REQ-MSG-015** (Ubiquitous)
이 SPEC 은 `server/src/routes-messages.ts` 에서 `registerMessageRoutes(app: FastifyInstance): void` 를 이 시그니처 그대로 내보내야 하고, `buildServer()` 가 그것을 실제로 배선해야 한다. 배선은 다음 네 가지를 모두 포함한다.

1. `app.decorate('uploadsDir', config.uploadsDir)` — REQ-MSG-006 의 업로드 디렉터리가 프로덕션에서 가리킬 값을 정한다.
2. `await app.register(multipart)` — `@fastify/multipart` 등록.
3. `registerMessageRoutes(app)` — 세 라우트 등록.
4. `declare module 'fastify'` 의 `FastifyInstance` 에 `uploadsDir: string` 추가.

**등록 순서가 계약의 일부다.** multipart 등록(2)이 라우트 등록(3)보다 **앞서야** 한다 — 뒤에 오면 요청 시점에 `req.parts()` 가 없어 모든 전송이 실패한다.

이 요구사항이 없으면 이 SPEC 의 완료 판정이 손으로 조립한 테스트 앱 안에서만 성립한다 — 실제 서버에 라우트가 하나도 등록되지 않아도 나머지 요구사항이 전부 충족된 것처럼 보인다. 관측은 AC-MSG-015 가 실제 `buildServer()` 를 띄워서 한다.

### 4.5 인증과 범위 경계

**REQ-MSG-013** (Ubiquitous)
이 SPEC 이 등록하는 세 라우트(`POST /api/rooms/:id/messages`, `GET /api/rooms/:id/messages`, `GET /api/attachments/:id`)는 모두 `preHandler: [requireAuth]` 를 달아야 한다. 세션 쿠키 없는 요청은 세 라우트 모두 `401` 로 거부되어야 한다.

**방별 접근 권한은 이 시스템에 존재하지 않는다.** `rooms` 에 소유자 컬럼이 없고 구성원 테이블도 없으며(`SPEC-CORE-001` 의 `SCHEMA`), `req.user` 는 `{ id, username }` 두 필드로 고정돼 있다. 방별 권한은 `spec-v2.md` 12장이 YAGNI 로 배제했고 선행 세 SPEC 이 모두 같은 판단을 이어받았다. 따라서 이 SPEC 이 강제할 수 있는 것은 **로그인 여부**뿐이며, 로그인한 사람은 어느 방에든 보내고 어느 방이든 읽고 어느 첨부든 내려받을 수 있다. 이 경계는 `plan.md` §D 2번에 기록돼 있고 §E 의 잔여 위험 표에도 올라 있다.

**REQ-MSG-014** (Unwanted — shall not)
이 SPEC 의 구현은 `server/src/db.ts` 의 `SCHEMA` 상수를 변경해서는 안 되고, `server/src/permissions.ts` 를 만들어서도 안 되며, 권한 릴레이 라우트를 등록해서도 안 된다. 이 SPEC 이 새로 만드는 소스 파일은 `server/src/routes-messages.ts` 하나이고, 수정하는 기존 소스 파일은 `server/src/index.ts` 하나다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자를 명시한다.

### Out of Scope — 토대와 인증 (SPEC-CORE-001, SPEC-AUTH-001)

- `SCHEMA` 의 여덟 테이블과 두 인덱스, `openDb`, `config` 게터 — 이 SPEC 은 읽어 쓰기만 한다
- 회원가입·로그인·로그아웃, 비밀번호 해싱, `md_session` 쿠키 발급, `requireAuth` 자체의 구현

### Out of Scope — 방과 봇 (SPEC-ROOM-001, SPEC-BOT-001)

- `GET`/`POST /api/rooms`, `POST /api/rooms/:id/archive`, 보관 트랜잭션
- `GET`/`POST /api/bots`, 봇 초대 세 라우트, 토큰 발급·철회, `sha256Hex`

### Out of Scope — 멘션·SSE·게이트웨이 내부 (SPEC-MENTION-001, SPEC-SSE-001, SPEC-GATEWAY-001)

- `parseMentions` 의 정규식과 파싱 규칙 — 이 SPEC 은 반환값만 소비한다
- `createSseHub` 의 구독 관리·하트비트·연결 정리, `GET /api/rooms/:id/events` 라우트
- `createGateway` 의 WebSocket 서버, `hello` 토큰 인증, `welcome`, `missed_after_id` 재전송, `bot_message` 수신 저장, `last_delivered_id` 갱신
- 봇이 **보내는** 메시지의 저장 경로(`author_type='bot'`) — 게이트웨이가 소유한다. 이 SPEC 은 `author_type='user'` 행만 만든다

### Out of Scope — 권한 릴레이 (카드 `t3` 후속, plan-v2 Task 10)

- `server/src/permissions.ts`, 승인 요청 브로커, `yes/no <ID>` 파싱, `permission_verdict` 전달
- `author_type='system'` 메시지의 생성 — 이 SPEC 은 목록 응답에서 `author_name` 을 `'시스템'` 으로 표시할 뿐 만들지 않는다

### Out of Scope — 채널 플러그인과 웹 UI (카드 `t4`·`t5`)

- `channel/` 아래 어떤 파일도 만들지 않는다
- `web/index.html`, `web/app.js`, `web/style.css` — 메시지 입력창, 파일 드래그, 멘션 자동완성, 다운로드 링크

### Out of Scope — 파일 처리 심화

- 봇→사람 방향의 로컬 경로 복사 (`spec-v2.md` 7장) — `SPEC-GATEWAY-001` 의 `bot_message` 경로가 소유한다
- 업로드 원자적 이동(임시 저장 후 rename), 바이러스 검사, 썸네일 생성, 파일 크기 쿼터, 중복 제거
- 첨부 삭제 API, 만료 정책, 보관된 방의 첨부 정리

### Out of Scope — 목록 조회 심화

- 페이지네이션의 반대 방향(`before=`), 전체 개수, 검색, 필터
- 방 존재 여부에 따른 목록 조회 실패 — 없는 방을 조회하면 빈 배열 `[]` 이며 오류가 아니다. REQ-MSG-011 은 방 상태도 존재 여부도 보지 않는다 (`acceptance.md` 엣지 케이스 표)

---

## 6. 제약

- Node.js 20 이상, TypeScript strict 모드, `module: NodeNext`. 상대 import 는 `.js` 확장자를 붙인다.
- 의존성은 이미 설치된 것만 쓴다: `fastify ^5`, `@fastify/cookie`, `@fastify/multipart`, `better-sqlite3`, `vitest`. 새 의존성을 추가하지 않는다. multipart 파싱은 `@fastify/multipart` 의 `req.parts()` 스트리밍 API 만 쓴다.
- 파일 경로 조작은 Node 표준 `node:path` 만 쓴다(`basename`, `join`, `resolve`, `extname`, `sep`). 경로 정규화를 직접 문자열로 구현하지 않는다.
- 서버 데이터는 전부 `MINIDISCORD_DATA_DIR`(기본 `./data`) 아래. 테스트는 `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다.
- UI 문구(오류 메시지 포함)는 한국어. 코드 주석도 한국어.
- 커밋 메시지는 영어 관례(`feat:`, `test:`).
- 채널 계약(capabilities·notification 메서드·reply 도구·권한 릴레이)은 `spec-v2.md` 4-B 와 공식 channels-reference 를 그대로 따른다. 이 SPEC 은 그 계약을 건드리지 않는다. 변경이 필요해 보이면 임의로 바꾸지 말고 중단하고 보고한다.
- **모듈 순환 참조 금지.** `routes-messages.ts` 는 `gateway.ts` 를 import 하지 않는다 — 게이트웨이는 `req.server.gateway` 데코레이터로만 접근한다. `displayName` 이 `gateway.ts` 의 `authorName` 과 같은 로직인 것은 순환 참조를 피하기 위한 의도적 중복이며(원본 Task 9 의 판단), 공용 모듈로 추출하지 않는다.

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 명령 하나와 관측 가능한 결과 하나로 이루어진다.

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Global Constraints, 파일 구조, Task 9 (원본, 읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 5장 데이터 모델, 6장 게이트웨이 프로토콜(커서), 7장 파일 흐름, 8장 에러 처리, 9장 보안
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (`buildServer`, `openDb`, 스키마, `config`)
- `.moai/specs/SPEC-AUTH-001/` — 인증 SPEC (`requireAuth`, 세션 쿠키)
- `.moai/specs/SPEC-ROOM-001/` — 방 SPEC (`rooms.status`, 보관)
- `.moai/specs/SPEC-BOT-001/` — 봇 초대 SPEC (`bot_tokens`, `sha256Hex`, 404/409 상태 코드 계약)
- `.moai/specs/SPEC-MENTION-001/` — 멘션 파서 SPEC (`parseMentions`)
- `.moai/specs/SPEC-SSE-001/` — SSE 허브 SPEC (`createSseHub`)
- `.moai/specs/SPEC-GATEWAY-001/` — 봇 게이트웨이 SPEC (`createGateway`, 커서 재전송)
- 칸반 카드 `t3` (마일스톤 M3)
