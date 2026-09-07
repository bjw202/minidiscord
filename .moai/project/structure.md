# minidiscord — 구조 개요

> 설계 원문: `.moai/plan/2026-08-26-minidiscord/spec-v2.md` §3~6, `plan-v2.md`. 이 문서는 **2026-09-07 기준 실제 코드**(main `6418b31`)를 반영한다. 파일 단위의 상세 카탈로그·의존 그래프·API 표·흐름 추적은 `.moai/project/codemaps/` 다섯 문서에 있다 — [overview](./codemaps/overview.md) · [modules](./codemaps/modules.md) · [dependencies](./codemaps/dependencies.md) · [entry-points](./codemaps/entry-points.md) · [data-flow](./codemaps/data-flow.md).

## 세 컴포넌트

| 컴포넌트 | 위치 | 역할 | 규모 |
|---|---|---|---|
| **서버** | `server/` — 단일 Node 프로세스 | 웹 UI 정적 서빙, REST API, SSE 실시간 push, 봇 게이트웨이(WebSocket `/bot`, 상호 인증 v2), 권한 릴레이, SQLite/파일 저장 | 소스 13개 1,305줄 |
| **채널 플러그인** (`minidiscord-channel`) | `channel/` — Claude Code 세션마다 하나 | 공식 Channels 계약을 구현한 MCP 서버(stdio). 위로는 세션에 알림을 push 하고, 아래로는 게이트웨이에 WebSocket 으로 붙는다 | 소스 4개 740줄 |
| **웹 UI** | `web/` — 브라우저 | 디스코드형 2단 레이아웃. 로그인, 방·봇 목록, 채팅(SSE), `@` 자동완성, 첨부, 봇 초대 다이얼로그, 권한 승인 버튼. 빌드 없음 | 6개 1,602줄 |

여기에 검증 도구 `scripts/`(E2E 러너·가짜 채널 예행·증거 추출기·라이브 환경 셸, 1,403줄)와 `server/test/` 의 헬퍼 다섯(784줄)이 있다. 세 컴포넌트 사이에 코드 import 는 없고, 만나는 자리는 프로토콜뿐이다.

### 연결 흐름

```
브라우저 ──HTTP/SSE──▶ minidiscord 서버 ◀──WebSocket /bot── 채널 플러그인 ◀──stdio(MCP)── Claude Code 세션
                              │
                              └── SQLite (data/minidiscord.db, WAL) + data/uploads/
```

서버와 채널 플러그인은 같은 머신에서 도는 것이 전제다. 채널의 기본 게이트웨이 주소는 `ws://127.0.0.1:3000/bot` 이고, 이 전제 덕분에 파일 전달은 로컬 경로를 그대로 넘기는 방식으로 단순하다. 서버는 TLS 를 종단하지 않으므로 상호 인증의 채널 바인딩은 항상 `unbound` 이며, 원격 배치(서비스화)는 보류 카드 t23(서버 TLS 종단)이 닫히기 전까지 하지 않는다.

## 핵심 원칙 (세 가지)

이 세 원칙은 설계 결정 전반을 관통하므로 코드를 건드리기 전에 먼저 이해해야 한다.

1. **세션은 정확히 한 방에만 접속한다 (세션→방 N:1). 방에는 여러 세션이 접속한다 (방→세션 1:N).** 세션이 여러 방의 메시지를 동시에 받으면 대화 맥락이 섞이므로 금지한다. 공식 Channels 는 「한 세션에 이벤트가 순차로 줄 선다」는 특성이 있는데, 줄 서는 이벤트가 전부 같은 방의 것이므로 무해하다.
2. **서버는 세션을 직접 조종하지 않는다.** 채널 플러그인이 토큰으로 유도한 키를 들고 게이트웨이에 접속해 오면 그 방에 봇이 있는 것으로 취급한다. 세션이 죽으면 서버는 봇을 오프라인으로 표시할 뿐 메시지는 계속 DB 에 쌓고, 재접속하면 놓친 메시지를 커서 뒤부터 다시 보낸다.
3. **서버는 페르소나를 모른다.** 봇의 성격·지식은 각 봇의 작업 디렉터리(`CLAUDE.md`, `.claude/`)가 책임진다. 서버가 갖는 봇 정보는 표시용 이름·설명뿐이다. 과제가 바뀌면 방을 새로 만들고 봇을 다시 초대한다.

### 다중 봇 접속이 어떻게 가능한가

「한 방에 여러 클로드코드 봇이 접속할 수 없다」는 통념은 서로 다른 세 제약이 섞인 것이다.

| 실제 제약 | 출처 | 이 시스템의 대책 |
|---|---|---|
| 봇 자격증명 하나는 프로세스 하나만 쓸 수 있다 | 디스코드 게이트웨이 규칙 | 해당 없음 — (방, 봇) 조합마다 별도 토큰을 발급한다 (`bot_tokens` 1행) |
| 공식 채널 플러그인이 고정 상태 파일을 쓴다 | 공식 플러그인이 `~/.claude/channels/<이름>/.env` 에 상태 저장 | 채널 플러그인은 **무상태·환경변수 기반**이다. `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 만 받고 디스크에 아무것도 쓰지 않는다 |
| 한 세션이 여러 방을 받으면 기록이 섞인다 | 채널 이벤트는 세션 안에서 순차 처리된다 | 핵심 원칙 1 로 원천 해결 |

## 디렉터리 구조 (실제)

```
minidiscord/
├── package.json                  # npm workspaces: server, channel · 스크립트 e2e / live-dryrun / test
├── .nvmrc                        # Node 24 — 로컬과 CI 의 단일 출처
├── .github/workflows/ci.yml      # npm ci → typecheck(server, channel) → npm test
├── server/
│   ├── package.json              # pretest = typecheck
│   ├── src/
│   │   ├── index.ts              # buildServer(): 조립 순서가 계약 (multipart 는 메시지 라우트 앞, static 은 맨 뒤)
│   │   ├── config.ts             # 환경변수 → 설정 (지연 getter)
│   │   ├── db.ts                 # SQLite 열기 + DDL(테이블 10) + 마이그레이션 3
│   │   ├── auth.ts               # scrypt 해시, 가입/로그인/로그아웃, requireAuth
│   │   ├── room-members.ts       # isRoomMember / requireRoomMember — 인가의 단일 출처
│   │   ├── mention.ts            # @TO/@CC 파서 (import 0, 순수 함수)
│   │   ├── sse.ts                # 방별 SSE 허브
│   │   ├── routes-events.ts      # GET /api/rooms/:id/events
│   │   ├── routes-rooms.ts       # 방 목록/생성/구성원 초대/보관
│   │   ├── routes-bots.ts        # 봇 등록/목록, 초대(v2 키 유도·토큰 발급)/목록/철회
│   │   ├── routes-messages.ts    # multipart 전송, 멘션 팬아웃, 목록 커서, 첨부 다운로드
│   │   ├── gateway.ts            # WebSocket /bot — 상호 인증 v2, 봉투 송신, 재전송, 이력, 봇 첨부 봉인
│   │   └── permissions.ts        # 권한 릴레이 브로커
│   └── test/                     # .test.ts 18개 + 헬퍼 5개 (gateway-v2, live-extract-lib, wsupgrade-judgment, probe-db, no-listen)
├── channel/
│   ├── package.json              # bin: minidiscord-channel → dist/index.js · pretest = tsc (실빌드)
│   ├── vitest.config.ts          # v8 커버리지 (임계값 없음)
│   ├── src/
│   │   ├── index.ts              # wire(): MCP 서버 + 게이트웨이 클라이언트 · 전송 정책 · 진입 가드
│   │   ├── channel-server.ts     # MCP 도구 reply/fetch_history · 알림 · 지시문(신뢰 경계) · 권한 릴레이
│   │   ├── gateway-client.ts     # v2 핸드셰이크 · 봉투 검증 · 지수 백오프 재접속 · history RPC
│   │   └── truncate.ts           # 바이트 예산 절단 · 시질 이스케이프
│   └── test/                     # .test.ts 7개
├── web/
│   ├── index.html · app.js · rich.js · rich.d.ts · style.css · design-tokens.css
├── scripts/
│   ├── e2e.mts                   # 15단계 E2E (실제 서버 프로세스)
│   ├── live-dryrun.mts           # 가짜 채널로 라이브 검증 순서 예행
│   ├── live-extract.mts          # 증거 추출 CLI
│   └── live-env.sh               # 라이브 환경: paths·up·down·status·invite·bot·token-sweep (종료 코드 0/1/2)
├── README.md · ROADMAP.md · CHANGELOG.md
└── .moai/                        # SPEC 28개(`specs/`), 설계 원문(`plan/`), 이 문서들(`project/`)
```

`bot-01/`(봇 세션 작업 폴더)과 `data/` 는 `.gitignore` 대상이다.

## 서버 책임 경계와 계층

서버는 클래스나 서비스 계층 없이 **Fastify 데코레이터를 의존성 주입 컨테이너로** 쓴다. `app.db`, `app.hub`, `app.gateway`, `app.uploadsDir`, `app.permissions` 다섯이 `buildServer()` 에서 붙고, 각 기능은 `registerXRoutes(app)` 함수 하나다. ORM 은 없고 모듈마다 prepared SQL 을 직접 쓴다.

```
index.ts                                          ← 조립
  ├─ permissions.ts                               ← 횡단: 승인 요청 ↔ 판정 중계
  ├─ gateway.ts · routes-*.ts                     ← 기능
  ├─ auth.ts · room-members.ts · mention.ts · sse.ts   ← 원시 부품
  └─ config.ts · db.ts                            ← 잎
```

- `gateway.ts` 는 내부 모듈을 하나도 import 하지 않는다 (fastify·ws·node 내장만).
- `routes-messages.ts` 와 `permissions.ts` 는 게이트웨이를 `req.server.gateway` 데코레이터로만 부른다. 순환 import 는 없다.
- `mention.ts` 는 import 0 을 요구사항(REQ-MENTION-006)으로 갖는다.
- 팬인이 높은 모듈: `auth.ts`(5), `room-members.ts`(5), `db.ts`(4), `gateway.ts`(3). 이들의 시그니처 변경은 라우트 전부에 번진다.

## 인가 경계

- **사람**: 세션 쿠키(`md_session`)로 신원을 세우고, 방 단위 접근은 `room_members` 테이블만 본다 (`rooms.created_by` 는 기록용). 비구성원에게는 없는 방과 같은 404 를 돌려 방의 실재를 숨긴다.
- **봇**: (방, 봇) 조합 토큰에서 유도한 Ed25519 키로 게이트웨이에 인증한다. 서버는 `verifier_pub` 과 `server_confirm_key` 만 저장하고 평문 토큰은 갖지 않는다.
- **알려진 예외 둘**: `POST /api/rooms/:id/archive` 와 `GET /api/attachments/:id` 는 로그인만 요구하고 구성원 검사를 건너뛴다 (README 「보안에 대해 알아둘 점」, 보류 카드 t17 — 서비스화 시점에 닫는다).

## 데이터 모델 (SQLite, 테이블 10개)

| 테이블 | 용도 |
|---|---|
| `users` | 로그인 계정 (아이디 ≤ 32자, scrypt 해시) |
| `sessions` | 로그인 세션 (쿠키 토큰 → 사용자) |
| `rooms` | 대화방. `status` 가 `active`/`archived`. `created_by` 는 기록용 |
| `room_members` | 방 구성원. PK (room_id, user_id) — 동시 초대가 읽기-쓰기 없이 멱등 |
| `bots` | 봇 정의(표시용 이름·설명만) |
| `bot_tokens` | 「봇 초대」 1건 = 1행. `verifier_pub`(UNIQUE)·`server_confirm_key`·재접속 커서 `last_delivered_id`·`revoked_at` |
| `messages` | 방의 모든 메시지. `author_type` 이 `user`/`bot`/`system` |
| `message_targets` | 사용자 메시지가 어느 봇에게 `to`/`cc` 로 갔는지 (PK 없음 — 같은 봇이 둘 다면 두 행) |
| `attachments` | 첨부 메타 (실제 파일은 `uploads/<uuid>-<basename>`) |
| `schema_migrations` | 마이그레이션 표식 (`roomauthz-001-backfill`) |

인덱스 `idx_messages_room(room_id, id)`, `idx_targets_bot(bot_id, message_id)`. 봇의 온라인/오프라인은 DB 가 아니라 게이트웨이의 접속 맵(메모리)으로 판단하고, `last_seen_at` 은 표시용이다. `openDb` 는 v1 스키마(`token_hash`)를 만나면 변환 없이 거부한다 — 서버가 평문을 가진 적이 없어 유도할 수 없기 때문이다.

## 봇 게이트웨이 프로토콜 (WebSocket `/bot`, JSON)

상호 인증 v2(SPEC-GWAUTH-002). 토큰 자체는 절대 회선에 실리지 않는다.

```
채널 → 서버   hello {pub, client_nonce}
서버 → 채널   challenge {server_nonce, room_id, bot_id, server_proof}     ← 유일하게 봉투 없는 송신
채널 → 서버   auth {signature}                                           ← Ed25519
서버 → 채널   env{ welcome {room_id, bot_id, bot_name, missed_after_id} }
서버 → 채널   env{ message … } × 놓친 메시지
```

확립 뒤 서버 → 채널 프레임은 전부 `{type:'env', seq, payload, mac}` 봉투에 담긴다 (HMAC-SHA256, `seq` 단조 증가). 클라이언트는 검증에 실패한 프레임만 버리고 소켓은 유지한다. 채널 → 서버 프레임은 봉투가 없다.

| 방향 | type | 용도 |
|---|---|---|
| 채널 → 서버 | `bot_message` | 봇 응답 (`files[].local_path` 는 `MINIDISCORD_BOT_FILES_DIR` 아래일 때만 복사) |
| 채널 → 서버 | `status` | `working`/`idle` → SSE `bot_status` (「입력 중」 표시) |
| 채널 → 서버 | `history_request` | `since_id`·`speaker`·`since`·`until`·`limit(≤500)` |
| 채널 → 서버 | `permission_request` | 도구 승인 요청 (요청한 접속의 `connId` 와 함께 브로커로) |
| 서버 → 채널 | `message` | 사람 메시지 전달 (`delivery: 'to'|'cc'`) |
| 서버 → 채널 | `history_response` | 이력 응답 |
| 서버 → 채널 | `permission_verdict` | 사람의 판정 — **요청한 접속에만** 되돌아간다 |

메시지 `id` 는 방마다 단조 증가하는 커서로, 재접속 복구(`missed_after_id` = `bot_tokens.last_delivered_id`), `fetch_history` 의 `since_id`(결과 JSON 의 `cursor` 필드), 웹 목록의 `?after=` 가 같은 번호를 쓴다. 전체 흐름 추적은 [codemaps/data-flow.md](./codemaps/data-flow.md).

## 코드 밖에서 함께 바꿔야 하는 결합

| 결합 | 자리 |
|---|---|
| v2 암호 규칙(유도 라벨·트랜스크립트 구분자) | `server/src/routes-bots.ts`+`gateway.ts` · `channel/src/gateway-client.ts` · `server/test/gateway-v2.ts` — 세 독립 복사본 |
| 권한 시스템 메시지 문구 ↔ 브라우저 정규식 | `server/src/permissions.ts` ↔ `web/rich.js` (`전달하지 못했습니다 (<id>)` 꼬리는 `[HARD]`) |
| `rich.js` 시그니처 ↔ 수기 선언 | `web/rich.js` ↔ `web/rich.d.ts` |

## 더 읽을 것

- 파일별 책임·내보내는 심볼·의존: `.moai/project/codemaps/modules.md`, `dependencies.md`
- HTTP API 전표·프레임 목록·MCP 계약·환경변수: `.moai/project/codemaps/entry-points.md`
- 흐름 일곱 가지(멘션 전달, 봇 응답, 재접속, 권한 릴레이, 이력, 보관, 초대)와 DDL: `.moai/project/codemaps/data-flow.md`
- 설계 의도와 에러 처리 표: `.moai/plan/2026-08-26-minidiscord/spec-v2.md` §4, §7, §8
- 제품 요구사항: `.moai/project/product.md` · 기술 스택/테스트: `.moai/project/tech.md`
