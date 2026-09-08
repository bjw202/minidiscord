# minidiscord 코드맵 — 모듈 카탈로그

> 기준 커밋 `74ff7c9` (WT-v2-model, 2026-09-07). 생성 방법: 소스 전수 판독 + `wc -l`. 「내보내는 것」은 `export` 된 심볼, 「내부 의존」은 같은 워크스페이스 안의 상대 경로 import 다 (`(타입)` 표시는 `import type` 만 있음을 뜻한다). 전체 그래프는 [dependencies.md](./dependencies.md).
>
> 다른 코드맵: [overview.md](./overview.md) (전체 개요) · [dependencies.md](./dependencies.md) (의존 그래프) · [entry-points.md](./entry-points.md) (진입점·API·프로토콜) · [data-flow.md](./data-flow.md) (핵심 흐름·데이터 모델)

## server/src — 13 파일, 1,121 줄

| 파일 | 줄 | 책임 | 내보내는 것 | 내부 의존 |
|---|---|---|---|---|
| `index.ts` | 83 | Fastify 앱 조립(`buildServer`)과 진입 가드. 데코레이터 `db`·`hub`·`gateway`·`uploadsDir`·`permissions` 를 붙이는 유일한 자리 | `buildServer(): Promise<FastifyInstance>` | db, auth, routes-rooms, routes-bots, routes-messages, routes-events, sse, gateway, permissions, config |
| `config.ts` | 15 | 환경변수 기반 설정. `dataDir`·`dbPath`·`uploadsDir`·`botFilesDir` 는 **지연 getter** (테스트가 import 뒤에 env 를 바꿀 수 있게) | `config` | 없음 |
| `db.ts` | 89 | SQLite 열기, DDL(테이블 8개·인덱스 2개), WAL, 옛 파일 거절 둘(`bots.token` 열 부재 → v1 방별 토큰 시대, `users` 열 수 ≠ 3 → 비밀번호 시대) | `openDb(path): Db`, `type Db` | 없음 |
| `auth.ts` | 62 | 이름 로그인(처음 보는 이름은 `INSERT OR IGNORE` 로 생성)·로그아웃 두 라우트, `md_session` 쿠키, `requireAuth` preHandler. 라우트는 이 둘뿐이다 | `USERNAME_MAX_LENGTH = 32`, `registerAuthRoutes(app, db)`, `requireAuth(req, reply)` | db (타입) |
| `mention.ts` | 16 | `@TO(봇)`/`@CC(봇)` 파서. **import 0** 은 요구사항(REQ-MENTION-006) | `parseMentions(body): Mention[]`, `interface Mention` | 없음 |
| `targets.ts` | 28 | 멘션 → 그 방 `room_bots` 참여 봇 대조. 사람 경로와 봇 경로가 같은 함수를 지난다. 순수 조회, 행을 남기지 않음 | `resolveTargets(db, roomId, body): {targets: Target[], unknown: string[]}`, `interface Target {botId, name, role, delivery}` | mention, db (타입) |
| `sse.ts` | 58 | 방별 인메모리 SSE 허브 (구독·발행·구독자 수) | `createSseHub(): SseHub`, `interface SseHub` | 없음 |
| `routes-events.ts` | 16 | `GET /api/rooms/:id/events` 등록 한 자리. `reply.hijack()` 후 허브에 구독 | `registerEventRoute(app)` | auth |
| `routes-rooms.ts` | 55 | 방 목록(모든 방, `{active, archived}`)·생성·보관(상태 전이 UPDATE 하나 + 커밋 뒤 `onArchive` 훅) | `registerRoomRoutes(app, opts?: {onArchive})` | auth |
| `routes-bots.ts` | 83 | 봇 등록(`role` 은 `orchestrator`\|`worker`, 비우면 `worker`; 평문 토큰과 세션 실행 명령은 이 응답 한 번)·목록, 참여 추가(멱등)·참여 목록(`online` 포함)·참여 제거 | `registerBotRoutes(app)` | auth, config, gateway (타입) |
| `routes-messages.ts` | 176 | multipart 전송, 권한 회신 가로채기, `resolveTargets` 로 대상 매핑(미참여 이름 있으면 400), SSE+게이트웨이 팬아웃, 커서 목록, 첨부 다운로드 | `registerMessageRoutes(app)` | auth, targets, db (타입) |
| `gateway.ts` | 308 | `/bot` WebSocket 서버. `hello{token}` → `welcome`, 프레임마다 `room_id`·참여 검사, 봇 글 저장 → 발행 → 멘션 대조 → 연속 봇 글 상한(`BOT_RUN_LIMIT = 6`, 역할 필터는 2026-09-08 삭제) → 전달, 방별 커서 재전송, 이력 조회, 봇 첨부 경로 봉인(`realpathSync`), 판정 회신 통로 | `createGateway(app, opts): Gateway`, `interface Gateway`, `interface ConnInfo`, `interface MessageRow` | targets |
| `permissions.ts` | 132 | 권한 릴레이 브로커. 봇의 `permission_request` → 시스템 메시지 4줄, 사람의 `yes/no <id>` → 요청한 접속(`connId`)에만 판정 회신. 대기 맵은 `방:id` 와 `봇:id` 두 색인 | `createPermissionBroker(app)`, `PERMISSION_REPLY_RE`, `interface PermissionBroker` | gateway (타입) |

## channel/src — 4 파일, 592 줄

| 파일 | 줄 | 책임 | 내보내는 것 | 내부 의존 |
|---|---|---|---|---|
| `index.ts` | 128 | `wire()` 로 MCP 서버와 게이트웨이 클라이언트를 묶음. «마지막 to 방» 기억, `chat_id` → `room_id` 세 겹 결정, 이력 문서 예산(16,000바이트, 최신부터 버림), CLI 진입 가드. env `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 를 읽는 유일한 자리. 전송 스킴 검사 없음 (125행 주석) | `wire(opts)`, `resolveUrl(env?)`, `DEFAULT_SERVER`, `interface WireOpts` | channel-server, gateway-client, truncate |
| `channel-server.ts` | 247 | MCP 서버 본체. 도구 `reply`·`fetch_history`, 알림 `notifications/claude/channel`·`…/permission`, 지시문(신뢰 경계 포함), 봉투 중화, 권한 요청 `request_id` 집합(128 상한) | `createChannelServer(deps): ChannelHandle`, `INSTRUCTIONS`, `TO_REPLY_NOTE`, `neutralizeEnvelope`, `interface ChannelDeps/ChannelHandle/ChatMessage` | truncate |
| `gateway-client.ts` | 135 | WebSocket 클라이언트. `open` 마다 `hello{token}`, `message`·`permission_verdict`·`history_response` 세 종류만 분기, 1초→30초 지수 백오프 재접속, `history_request` RPC(`rid` 대조, 10초 타임아웃) | `createGatewayClient(input): GatewayClient`, `interface GatewayClient/GatewayClientOpts/GatewayMessage/HistoryParams`, `type UrlRef` | 없음 |
| `truncate.ts` | 82 | 바이트 예산 절단 원시 함수와 상수. 시질(`⟪` `⟫`)을 먼저 이스케이프하고 코드포인트 경계에서 자른 뒤 `⟪잘림: N바이트 생략⟫` 표식 | `truncateToBudget`, `escapeSigils`, `formatMarker`, `MAX_BODY_BYTES=4000`, `MAX_ATTACHMENTS=20`, `MAX_PATH_BYTES=512`, `MAX_HISTORY_BYTES=16000`, `MAX_NAME_BYTES=256`, 시질·표식 상수, `SIBLING_SWEEP_ASSERT_REGEX` | 없음 |

## web/ — 6 파일, 1,582 줄 (빌드 없음, 서버가 그대로 서빙)

| 파일 | 줄 | 책임 | 비고 |
|---|---|---|---|
| `index.html` | 98 | 껍데기 마크업. 인라인 `<script type="module">` 이 `/app.js` 의 `initApp()` 을 호출 | `/style.css` 링크 |
| `app.js` | 680 | 인증·방·봇 상태(`state`), `api()` fetch 래퍼, 채팅 뷰(`openStream` 의 `EventSource` 구독, `renderMessage`, `@` 자동완성, 전송), 참여 목록 칩(`refreshRoomBots`), 메시지 장식자 등록(`registerMessageDecorator`), 봇 다이얼로그 배선(참여 추가·등록 명령 표시) | 606행에서 `./rich.js` import (의도적, SPEC-WEBRICH-001). 봇 등록 폼은 `name`·`description` 만 보내므로 웹에서 등록한 봇은 항상 `worker` 다 |
| `rich.js` | 214 | 첨부 노드(이미지 인라인/링크), 권한 요청·판정 정규식과 승인/거절 버튼, 봇 고르기 목록·등록 결과 표시 헬퍼, 클립보드 복사 | 내보내기: `createRichContext`, `buildAttachmentNode`, `permissionRequestId`, `permissionResolutionId`, `verdictBody`, `verdictForm`, `buildInviteChoices`, `applyInviteResult`, `clearInviteResult`, `copyText`, `isImageFilename`, `attachmentUrl` |
| `rich.d.ts` | 41 | `server/tsconfig.json` 이 `allowJs` 없이 `rich.js` 를 타입 검사하기 위한 수기 선언 | `rich.js` 와 어긋나도 시험이 잡지 못한다 |
| `style.css` | 490 | 레이아웃·컴포넌트 스타일 | 6행에서 `./design-tokens.css` `@import` |
| `design-tokens.css` | 59 | `--md-*` 색·간격·글꼴 토큰 | 근거: `.moai/project/design-dna-discord.md` |

## scripts/ — 실행 대상 1 파일, 477 줄

| 파일 | 줄 | 책임 | 호출 |
|---|---|---|---|
| `e2e.mts` | 477 | 실제 서버 프로세스를 띄워 «봇 하나·방 둘» 15단계 시나리오(이름 로그인 → 방 둘 → 봇 등록 → 두 방 참여 → hello/welcome → 모르는 토큰 → 방별 전달 → 봇 답변+첨부 → 내려받기 → 멘션 없는 글 → 방별 이력 → 권한 릴레이 → 오프라인 재전송 → 재시작 영속성 → 보관)를 돈다. `server/src`·`server/test` 를 import 하지 않고 HTTP·WebSocket 전선으로만 말한다. 내보내기: `acquirePort`, `spawnServer`, `waitForBoot`, `stopServer`, `api`, `step`, `checkDependencies`, `main` | `npm run e2e` |

`scripts/_archive/` 에는 퇴역한 라이브 검증 도구 4 파일(`live-dryrun.mts`, `live-env.sh`, `live-extract`, `live-extract.mts`)이 남아 있다. package.json 에 등록되지 않았고 실행 대상이 아니다.

## server/test 헬퍼 (`.test.ts` 아님) — 3 파일, 203 줄

| 파일 | 줄 | 책임 | 쓰는 곳 |
|---|---|---|---|
| `wsupgrade-judgment.ts` | 188 | SPEC-WSUPGRADE-001 의 404 응답자 판정기 (지문표, H-1/H-2/H-3/미분류 판정, 귀속 대조). `server/src` 무변경을 스스로 단언하는 순수 모듈 | `gateway.test.ts`, `wsupgrade-judgment.test.ts` |
| `probe-db.ts` | 13 | WAL 모드와 `idx_*` 인덱스 이름 출력 | 수동 (`tsx server/test/probe-db.ts`) |
| `no-listen.ts` | 2 | `index.ts` import 만으로는 listen 하지 않음을 증명 (AC-CORE-015) | 시험 |

## 팬인이 높은 모듈 (소스 기준 import 하는 파일 3개 이상)

| 모듈 | 팬인 | import 하는 파일 |
|---|---|---|
| `server/src/auth.ts` | 5 | index, routes-events, routes-rooms, routes-bots, routes-messages |
| `server/src/db.ts` | 4 | index, auth (타입), targets (타입), routes-messages (타입) |
| `server/src/gateway.ts` | 3 | index, routes-bots (타입), permissions (타입) |
| `channel/src/truncate.ts` | 2 (+ 시험 4) | index, channel-server |

시험 쪽 팬인: `db.ts` 를 서버 시험 8 파일 + `probe-db.ts` 가, `gateway.ts` 를 5 파일이 import 한다 (`grep -l "from '../src/<m>.js'" server/test/*.ts`). `targets.ts` 를 직접 import 하는 시험은 없다 — 라우트·게이트웨이 시험을 통해서만 덮인다.

이들은 `@MX:ANCHOR` 후보다. `auth.ts` 의 `requireAuth` 시그니처를 바꾸면 라우트 모듈 넷이, `gateway.ts` 의 `Gateway` 인터페이스를 바꾸면 소비자 셋이 함께 영향을 받는다.
