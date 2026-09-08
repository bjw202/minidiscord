# minidiscord — 구조 개요

> 설계 원문: `.moai/plan/2026-08-26-minidiscord/spec-v2.md` §3~6, `plan-v2.md`. 이 문서는 **2026-09-07 v2 리팩토링 병합 뒤의 실제 코드**(코드 기준 커밋 `74ff7c9`, 브랜치 `WT-v2-model` 을 main 에 합침)를 반영한다. 무엇을 왜 바꿨는지는 `.moai/reports/v2-review.md`, 어떤 순서로 했는지는 `.moai/reports/v2-refactoring-guide.md` 에 있다. 파일 단위의 상세 카탈로그·의존 그래프·API 표·흐름 추적은 `.moai/project/codemaps/` 다섯 문서에 있다 — [overview](./codemaps/overview.md) · [modules](./codemaps/modules.md) · [dependencies](./codemaps/dependencies.md) · [entry-points](./codemaps/entry-points.md) · [data-flow](./codemaps/data-flow.md).

## 세 컴포넌트

| 컴포넌트 | 위치 | 역할 | 규모 |
|---|---|---|---|
| **서버** | `server/` — 단일 Node 프로세스 | 웹 UI 정적 서빙, REST API, SSE 실시간 push, 봇 게이트웨이(WebSocket `/bot`, 토큰 인증·맨몸 JSON 프레임), 권한 릴레이, SQLite/파일 저장 | 소스 13개 1,121줄 |
| **채널 플러그인** (`minidiscord-channel`) | `channel/` — Claude Code 세션마다 하나 | 공식 Channels 계약을 구현한 MCP 서버(stdio). 위로는 세션에 알림을 push 하고, 아래로는 게이트웨이에 WebSocket 으로 붙는다 | 소스 4개 592줄 |
| **웹 UI** | `web/` — 브라우저 | 디스코드형 2단 레이아웃. 이름 로그인, 방·봇 목록, 채팅(SSE), `@` 자동완성, 첨부, 봇 등록·참여 다이얼로그, 권한 승인 버튼. 빌드 없음 | 6개 1,582줄 |

여기에 종단 간 러너 `scripts/e2e.mts`(477줄)와 `server/test/` 의 헬퍼 셋(203줄)이 있다. 옛 라이브 검증 도구 넷은 `scripts/_archive/` 에 보관돼 있고 어떤 명령에도 걸려 있지 않다. 세 컴포넌트 사이에 코드 import 는 없고, 만나는 자리는 프로토콜뿐이다.

### 연결 흐름

```
브라우저 ──HTTP/SSE──▶ minidiscord 서버 ◀──WebSocket /bot── 채널 플러그인 ◀──stdio(MCP)── Claude Code 세션
                              │
                              └── SQLite (data/minidiscord.db, WAL) + data/uploads/
```

배치 전제는 **같은 PC 또는 서로 믿는 사내망**이다. 서버의 기본 바인드는 `127.0.0.1`, 채널의 기본 게이트웨이 주소는 `ws://127.0.0.1:3000/bot` 이고, 이 전제 덕분에 파일 전달은 로컬 경로를 그대로 넘기는 방식으로 단순하다. 서버는 TLS 를 종단하지 않고 봇 토큰은 전선과 표 양쪽에서 평문이다 — 그 밖으로 내가는 배치의 조건은 `README.md` 「채널 플러그인을 붙이기 전에」와 보류 카드 t23(서버 TLS 종단)에 있다.

## 핵심 원칙 (세 가지)

이 세 원칙은 설계 결정 전반을 관통하므로 코드를 건드리기 전에 먼저 이해해야 한다.

1. **봇은 신원이고, 방은 프레임이 실어 온다.** 봇마다 토큰 하나(`bots.token`)로 게이트웨이에 한 번 접속하고, 참여한 방(`room_bots`)이 여럿이면 같은 소켓으로 그 방들의 메시지를 전부 받는다. 방을 가르는 것은 접속이 아니라 프레임의 `room_id` 다 — 채널 알림의 `meta.chat_id` 가 방 번호이고, 세션의 `reply` 가 그 `chat_id` 로 돌아온다. (v1 의 「세션은 정확히 한 방에만」 원칙은 방별 토큰과 함께 v2 에서 사라졌다 — 경위는 `v2-review.md`.)
2. **서버는 세션을 직접 조종하지 않는다.** 채널 플러그인이 등록 때 받은 토큰을 들고 `hello` 를 보내면 그 봇이 있는 것으로 취급한다. 세션이 죽으면 서버는 봇을 오프라인으로 표시할 뿐 메시지는 계속 DB 에 쌓고, 재접속하면 놓친 메시지를 방마다 커서 뒤부터 다시 보낸다.
3. **서버는 페르소나를 모른다.** 봇의 성격·지식은 각 봇의 작업 디렉터리(`CLAUDE.md`, `.claude/`)가 책임진다. 서버가 갖는 봇 정보는 표시용 이름·설명과 역할 이름표(`orchestrator`/`worker` — 서버가 전달을 거르는 데 쓰지 않는 기록)뿐이다.

### 다중 봇 접속이 어떻게 가능한가

「한 방에 여러 클로드코드 봇이 접속할 수 없다」는 통념은 서로 다른 세 제약이 섞인 것이다.

| 실제 제약 | 출처 | 이 시스템의 대책 |
|---|---|---|
| 봇 자격증명 하나는 프로세스 하나만 쓸 수 있다 | 디스코드 게이트웨이 규칙 | 해당 없음 — 봇마다 토큰 하나(`bots.token`)이고, 봇 하나가 세션 하나다. 같은 방에 봇 여럿은 `room_bots` 행 여럿이다 |
| 공식 채널 플러그인이 고정 상태 파일을 쓴다 | 공식 플러그인이 `~/.claude/channels/<이름>/.env` 에 상태 저장 | 채널 플러그인은 **무상태·환경변수 기반**이다. `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 만 받고 디스크에 아무것도 쓰지 않는다 |
| 한 세션이 여러 방을 받으면 기록이 섞인다 | 채널 이벤트는 세션 안에서 순차 처리된다 | v2 는 한 세션이 여러 방을 받는 쪽을 택했다. 알림마다 `chat_id`(방 번호)가 붙고, 배선(`channel/src/index.ts`)이 «마지막 `to` 방» 을 기억해 `chat_id` 없는 답을 그 방으로 보낸다 |

## 디렉터리 구조 (실제)

```
minidiscord/
├── package.json                  # npm workspaces: server, channel · 스크립트 e2e / test
├── .nvmrc                        # Node 24 — 로컬과 CI 의 단일 출처
├── .github/workflows/ci.yml      # npm ci → typecheck(server, channel) → npm test
├── server/
│   ├── package.json              # pretest = typecheck
│   ├── src/
│   │   ├── index.ts              # buildServer(): 조립 순서가 계약 (multipart 는 메시지 라우트 앞, static 은 맨 뒤)
│   │   ├── config.ts             # 환경변수 → 설정 (지연 getter)
│   │   ├── db.ts                 # SQLite 열기 + DDL(테이블 8) + 옛 파일 거절 둘
│   │   ├── auth.ts               # 이름 로그인/로그아웃, md_session 쿠키, requireAuth
│   │   ├── mention.ts            # @TO/@CC 파서 (import 0, 순수 함수)
│   │   ├── targets.ts            # 멘션 → 그 방의 room_bots 대조 (사람 경로·봇 경로 공유)
│   │   ├── sse.ts                # 방별 SSE 허브
│   │   ├── routes-events.ts      # GET /api/rooms/:id/events
│   │   ├── routes-rooms.ts       # 방 목록(모든 방)/생성/보관
│   │   ├── routes-bots.ts        # 봇 등록(토큰 발급 한 번)/목록, 참여 추가/목록/제거
│   │   ├── routes-messages.ts    # multipart 전송, 멘션 팬아웃, 목록 커서, 첨부 다운로드
│   │   ├── gateway.ts            # WebSocket /bot — hello/welcome, 방별 재전송, 봇 글 전달·연속 봇 글 상한, 이력, 봇 첨부 봉인
│   │   └── permissions.ts        # 권한 릴레이 브로커
│   └── test/                     # .test.ts 17개 + 헬퍼 3개 (wsupgrade-judgment, probe-db, no-listen)
├── channel/
│   ├── package.json              # bin: minidiscord-channel → dist/index.js · pretest = tsc (실빌드)
│   ├── vitest.config.ts          # v8 커버리지 (임계값 없음)
│   ├── src/
│   │   ├── index.ts              # wire(): MCP 서버 + 게이트웨이 클라이언트 · «마지막 to 방» · 진입 가드
│   │   ├── channel-server.ts     # MCP 도구 reply/fetch_history · 알림 · 지시문(신뢰 경계) · 봉투 중화 · 권한 릴레이
│   │   ├── gateway-client.ts     # hello/welcome · 지수 백오프 재접속 · history RPC
│   │   └── truncate.ts           # 바이트 예산 절단 · 시질 이스케이프
│   └── test/                     # .test.ts 6개
├── web/
│   ├── index.html · app.js · rich.js · rich.d.ts · style.css · design-tokens.css
├── scripts/
│   ├── e2e.mts                   # 15단계 E2E «봇 하나·방 둘» (실제 서버 프로세스)
│   └── _archive/                 # 퇴역한 라이브 검증 도구 (live-env.sh · live-dryrun.mts · live-extract.mts · live-extract/)
├── README.md · ROADMAP.md · CHANGELOG.md
└── .moai/                        # SPEC 19개(`specs/`) + 보관 11개(`specs/_archive/`), 설계 원문(`plan/`), 이 문서들(`project/`)
```

`bot-01/`(봇 세션 작업 폴더)과 `data/` 는 `.gitignore` 대상이다.

## 서버 책임 경계와 계층

서버는 클래스나 서비스 계층 없이 **Fastify 데코레이터를 의존성 주입 컨테이너로** 쓴다. `app.db`, `app.hub`, `app.gateway`, `app.uploadsDir`, `app.permissions` 다섯이 `buildServer()` 에서 붙고, 각 기능은 `registerXRoutes(app)` 함수 하나다. ORM 은 없고 모듈마다 prepared SQL 을 직접 쓴다.

```
index.ts                                          ← 조립
  ├─ permissions.ts                               ← 횡단: 승인 요청 ↔ 판정 중계
  ├─ gateway.ts · routes-*.ts                     ← 기능
  ├─ targets.ts                                   ← 공유: 멘션 → room_bots 대조
  ├─ auth.ts · mention.ts · sse.ts                ← 원시 부품
  └─ config.ts · db.ts                            ← 잎
```

- `gateway.ts` 가 import 하는 내부 모듈은 `targets.ts` 하나다. 그 밖은 ws·node 내장뿐이다.
- `routes-messages.ts` 와 `permissions.ts` 는 게이트웨이를 `req.server.gateway` 데코레이터로만 부른다. 순환 import 는 없다.
- `mention.ts` 는 import 0 을 요구사항(REQ-MENTION-006)으로 갖는다.
- 멘션 대조(`targets.ts resolveTargets`)는 사람 경로와 봇 경로가 함께 지나지만, 연속 봇 글 상한(`MINIDISCORD_BOT_RUN_LIMIT` → `config.botRunLimit`, 기본 6, `0` 이면 끔; 닿으면 `@TO` 를 `cc` 로 강등)은 봇 경로(`gateway.ts handleBotMessage`)에만 있다. 발신 봇의 역할로 타깃을 거르지는 않는다(2026-09-08 운영자 결정으로 역할 필터 삭제 — `bots.role` 은 기록).
- 팬인이 높은 모듈: `auth.ts`(5), `db.ts`(4), `gateway.ts`(3). 이들의 시그니처 변경은 라우트 전부에 번진다.

## 인가 경계

- **사람**: 이름 하나로 로그인한다(비밀번호 없음, 처음 보는 이름은 그 자리에서 계정 생성). 세션 쿠키(`md_session`)가 신원이고, 그 뒤의 검사는 `requireAuth` 하나다 — **방 사이에 경계가 없다.** 로그인한 사람은 모든 방을 읽고 쓰고 보관하고, 어느 방의 봇 승인 요청에도 답한다 (v2 결정 ④, 되돌리는 자리는 가이드 §0).
- **봇**: 등록 때 받은 평문 토큰(`bots.token`)을 `hello` 에 실어 접속한다. 접속 뒤 프레임마다 `room_id` 와 `room_bots` 참여 행을 검사하고, 참여하지 않은 방의 프레임은 조용히 버린다 — 이 참여 행이 봇 쪽의 유일한 경계다.
- **보관된 방은 읽기 전용이다**: 사람의 전송·참여 추가는 409, 봇의 `bot_message`·`status` 는 조용히 버림(소켓 유지), 다음 `welcome` 의 방 목록에서 빠진다. 봇의 이력 조회(`history_request`)는 보관 뒤에도 답한다 (t43).

## 데이터 모델 (SQLite, 테이블 8개)

| 테이블 | 용도 |
|---|---|
| `users` | 로그인 계정 (이름 ≤ 32자, 비밀번호 없음) |
| `sessions` | 로그인 세션 (쿠키 토큰 → 사용자) |
| `rooms` | 대화방. `status` 가 `active`/`archived`, `archived_at` |
| `bots` | 봇 신원. 표시용 `name`(UNIQUE)·`description`, 접속 토큰 `token`(UNIQUE, 평문), `role`(`orchestrator`/`worker`) |
| `room_bots` | 방 참여. PK (room_id, bot_id), 방별 재전송 커서 `last_delivered_id` |
| `messages` | 방의 모든 메시지. `author_type` 이 `user`/`bot`/`system` |
| `message_targets` | 메시지가 어느 봇에게 `to`/`cc` 로 갔는지 (PK 없음 — 같은 봇이 둘 다면 두 행) |
| `attachments` | 첨부 메타 (실제 파일은 `uploads/<uuid>-<basename>`) |

인덱스 `idx_messages_room(room_id, id)`, `idx_targets_bot(bot_id, message_id)`. 봇의 온라인/오프라인은 DB 가 아니라 게이트웨이의 접속 맵(메모리)으로 판단하며 봇 단위(방 무관)다. `openDb` 는 옛 파일을 만나면 변환 없이 거부한다 — `bots` 에 `token` 열이 없으면 방별 토큰 시대, `users` 열 수가 3 이 아니면 비밀번호 시대다. 이전 경로는 없다: 개발용 DB 파일을 지우고 봇을 다시 등록한다.

## 봇 게이트웨이 프로토콜 (WebSocket `/bot`, JSON)

v2 봇 모델(SPEC-BOTMODEL-001). 모든 프레임은 `type` 을 가진 **맨몸 JSON** 이다 — 핸드셰이크·봉투·순번은 없다.

```
채널 → 서버   hello {token}                                          ← 등록 때 받은 평문 토큰, 방 번호 없음
서버 → 채널   welcome {bot_id, bot_name, rooms:[{room_id, room_name}]} ← 참여한 활성 방만
서버 → 채널   message {room_id, …} × 놓친 메시지                       ← 방마다 last_delivered_id 이후
```

모르는 토큰에는 아무 응답 없이 접속을 닫는다. 확립 뒤 채널 → 서버 프레임은 전부 `room_id` 가 필수이고, 그 방에 참여하지 않았으면 버린다(소켓은 유지).

| 방향 | type | 용도 |
|---|---|---|
| 채널 → 서버 | `bot_message` | 봇 글. 저장 → 발행 → 멘션 대조 → 연속 봇 글 상한 → 다른 봇에게 전달(역할과 무관). `files[].local_path` 는 `MINIDISCORD_BOT_FILES_DIR` 아래일 때만 복사 |
| 채널 → 서버 | `status` | `working`/`idle` → 그 방의 SSE `bot_status` (「입력 중」 표시) |
| 채널 → 서버 | `history_request` | `rid`·`since_id`·`speaker`·`since`·`until`·`limit(≤500)` |
| 채널 → 서버 | `permission_request` | 도구 승인 요청 (요청한 접속의 `connId` 와 함께 브로커로) |
| 서버 → 채널 | `message` | 사람 또는 봇의 메시지 전달 (`delivery: 'to'|'cc'`) |
| 서버 → 채널 | `history_response` | 이력 응답 — `rid` 로 대기 중인 요청과 짝짓는다 |
| 서버 → 채널 | `permission_verdict` | 사람의 판정 — **요청한 접속에만** 되돌아간다 |

메시지 `id` 는 방마다 단조 증가하는 커서로, 재접속 복구(`room_bots.last_delivered_id`), `fetch_history` 의 `since_id`(결과 JSON 의 `cursor` 필드), 웹 목록의 `?after=` 가 같은 번호를 쓴다. 커서를 올리는 자리는 `replayMissed` 와 `deliverTo` 둘이고 양쪽 다 `advanceCursor` 한 함수를 지난다. 전체 흐름 추적은 [codemaps/data-flow.md](./codemaps/data-flow.md).

## 코드 밖에서 함께 바꿔야 하는 결합

| 결합 | 자리 |
|---|---|
| 게이트웨이 프레임 `type` 집합과 필드명 (`room_id`·`rid`·`local_path`) | `server/src/gateway.ts` ↔ `channel/src/gateway-client.ts`·`index.ts` ↔ `scripts/e2e.mts` — 알 수 없는 프레임은 양쪽 다 조용히 무시되므로 E2E 만 잡는다 |
| 권한 시스템 메시지 문구 ↔ 브라우저 정규식 | `server/src/permissions.ts` ↔ `web/rich.js` (`전달하지 못했습니다 (<id>)` 꼬리는 `[HARD]`) |
| 알림 `meta` 여섯 키 (`chat_id`=방 번호, `message_id`, `delivery`, `sender`, `author_type`, `room_name`) | `channel/src/channel-server.ts` ↔ 세션이 `reply`/`fetch_history` 에 되돌리는 `chat_id` |
| `rich.js` 시그니처 ↔ 수기 선언 | `web/rich.js` ↔ `web/rich.d.ts` |

전체 목록은 [codemaps/dependencies.md](./codemaps/dependencies.md) §6.

## 더 읽을 것

- 파일별 책임·내보내는 심볼·의존: `.moai/project/codemaps/modules.md`, `dependencies.md`
- HTTP API 전표·프레임 목록·MCP 계약·환경변수: `.moai/project/codemaps/entry-points.md`
- 흐름 일곱 가지(멘션 전달, 봇 응답, 재접속, 권한 릴레이, 이력, 보관, 등록·참여)와 DDL: `.moai/project/codemaps/data-flow.md`
- v2 에서 무엇을 왜 지웠는지: `.moai/reports/v2-review.md` · 단계별 착지 기록: `.moai/reports/v2-refactoring-guide.md`
- 설계 의도와 에러 처리 표: `.moai/plan/2026-08-26-minidiscord/spec-v2.md` §4, §7, §8
- 제품 요구사항: `.moai/project/product.md` · 기술 스택/테스트: `.moai/project/tech.md`
