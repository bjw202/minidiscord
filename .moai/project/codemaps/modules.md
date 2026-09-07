# minidiscord 코드맵 — 모듈 카탈로그

> 기준 커밋 `6418b31` (2026-09-07). 「내보내는 것」은 `export` 된 심볼, 「내부 의존」은 같은 워크스페이스 안의 상대 경로 import 다 (`(타입)` 표시는 `import type` 만 있음을 뜻한다). 전체 그래프는 [dependencies.md](./dependencies.md).

## server/src — 13 파일, 1,305 줄

| 파일 | 줄 | 책임 | 내보내는 것 | 내부 의존 |
|---|---|---|---|---|
| `index.ts` | 81 | Fastify 앱 조립(`buildServer`)과 진입 가드. 데코레이터 `db`·`hub`·`gateway`·`uploadsDir`·`permissions` 를 붙이는 유일한 자리 | `buildServer(): Promise<FastifyInstance>` | db, auth, routes-rooms, routes-bots, routes-messages, routes-events, sse, gateway, permissions, config |
| `config.ts` | 14 | 환경변수 기반 설정. `dataDir`·`dbPath`·`uploadsDir`·`botFilesDir` 는 **지연 getter** (테스트가 import 뒤에 env 를 바꿀 수 있게) | `config` | 없음 |
| `db.ts` | 121 | SQLite 열기, DDL(테이블 10개·인덱스 2개), WAL, v1 스키마 거부, `rooms.created_by` 추가, `room_members` 백필 마이그레이션 | `openDb(path): Db`, `type Db` | 없음 |
| `auth.ts` | 94 | scrypt 비밀번호 해시, 가입/로그인/로그아웃 라우트, `md_session` 쿠키, `requireAuth` preHandler | `hashPassword`, `verifyPassword`, `USERNAME_MAX_LENGTH = 32`, `registerAuthRoutes(app, db)`, `requireAuth(req, reply)` | db (타입) |
| `mention.ts` | 15 | `@TO(봇)`/`@CC(봇)` 파서. **import 0** 은 요구사항(REQ-MENTION-006) | `parseMentions(body): Mention[]`, `interface Mention` | 없음 |
| `room-members.ts` | 20 | 방 구성원 술어 하나와 preHandler 게이트. 인가의 단일 출처 (`rooms.created_by` 는 기록용일 뿐) | `isRoomMember(db, roomId, userId)`, `requireRoomMember(req, reply)` | db (타입) |
| `sse.ts` | 58 | 방별 인메모리 SSE 허브 (구독·발행·구독자 수) | `createSseHub(): SseHub`, `interface SseHub` | 없음 |
| `routes-events.ts` | 18 | `GET /api/rooms/:id/events` 등록 한 자리. `reply.hijack()` 후 허브에 구독 | `registerEventRoute(app)` | auth, room-members |
| `routes-rooms.ts` | 92 | 방 목록(구성원 방만)·생성(생성자 자동 가입)·구성원 초대·보관(토큰 일괄 철회 트랜잭션 + `onArchive` 훅) | `registerRoomRoutes(app, opts?: {onArchive})` | auth, room-members |
| `routes-bots.ts` | 114 | 봇 등록·목록, v2 키 유도(`deriveBotKeys`), 초대 발급(평문 토큰은 한 번만 반환)·목록(`online` 포함)·철회 | `deriveBotKeys(token)`, `sha256Hex(s)`(v1 잔재), `registerBotRoutes(app)` | auth, room-members, config, gateway (타입) |
| `routes-messages.ts` | 187 | multipart 전송, 권한 회신 가로채기, 멘션→대상 매핑, SSE+게이트웨이 팬아웃, 커서 목록, 첨부 다운로드 | `registerMessageRoutes(app)` | auth, room-members, mention, db (타입) |
| `gateway.ts` | 374 | `/bot` WebSocket 서버. v2 상호 인증(hello→challenge→auth→welcome), 봉투(`env`) 서명 송신, 놓친 메시지 재전송, 이력 조회, 봇 첨부 경로 봉인, 방 닫기 | `createGateway(app, opts): Gateway`, `interface Gateway`, `interface ConnInfo`, `interface MessageRow` | 없음 (fastify·ws·node 내장만) |
| `permissions.ts` | 117 | 권한 릴레이 브로커. 봇의 `permission_request` → 시스템 메시지, 사람의 `yes/no <id>` → 요청한 접속(`connId`)에만 판정 회신 | `createPermissionBroker(app)`, `PERMISSION_REPLY_RE`, `interface PermissionBroker` | gateway (타입), room-members |

## channel/src — 4 파일, 740 줄

| 파일 | 줄 | 책임 | 내보내는 것 | 내부 의존 |
|---|---|---|---|---|
| `index.ts` | 148 | `wire()` 로 MCP 서버와 게이트웨이 클라이언트를 묶음. 전송 정책(`ws://` 루프백 또는 `wss://`), 이력 문서 예산, CLI 진입 가드. env `MINIDISCORD_TOKEN`·`MINIDISCORD_SERVER` 를 읽는 유일한 자리 | `wire(opts)`, `resolveUrl(env?)`, `isTransportAllowed(url)`, `DEFAULT_SERVER`, `interface WireOpts` | channel-server, gateway-client, truncate |
| `channel-server.ts` | 236 | MCP 서버 본체. 도구 `reply`·`fetch_history`, 알림 `notifications/claude/channel`·`…/permission`, 지시문(신뢰 경계), 봉투 중화, 권한 요청 `request_id` 집합(128 상한) | `createChannelServer(deps): ChannelHandle`, `INSTRUCTIONS`, `TO_REPLY_NOTE`, `neutralizeEnvelope`, `interface ChannelDeps/ChannelHandle/ChatMessage` | truncate |
| `gateway-client.ts` | 274 | WebSocket 클라이언트. 토큰→Ed25519 키 유도, v2 핸드셰이크, 봉투 MAC·seq 검증(실패 시 그 프레임만 버림), 1초→30초 지수 백오프 재접속, `history_request` RPC(10초 타임아웃) | `createGatewayClient(input): GatewayClient`, `interface GatewayClient/GatewayClientOpts`, `type UrlRef` | 없음 |
| `truncate.ts` | 82 | 바이트 예산 절단 원시 함수와 상수. 시질(`⟪` `⟫`)을 먼저 이스케이프하고 코드포인트 경계에서 자른 뒤 `⟪잘림: N바이트 생략⟫` 표식 | `truncateToBudget`, `escapeSigils`, `formatMarker`, `MAX_BODY_BYTES=4000`, `MAX_ATTACHMENTS=20`, `MAX_PATH_BYTES=512`, `MAX_HISTORY_BYTES=16000`, `MAX_NAME_BYTES=256`, 시질·표식 상수, `SIBLING_SWEEP_ASSERT_REGEX` | 없음 |

## web/ — 6 파일, 1,602 줄 (빌드 없음, 서버가 그대로 서빙)

| 파일 | 줄 | 책임 | 비고 |
|---|---|---|---|
| `index.html` | 107 | 껍데기 마크업. 인라인 `<script type="module">` 이 `/app.js` 의 `initApp()` 을 호출 | `/style.css` 링크 |
| `app.js` | 696 | 인증·방·봇 상태(`state`), `api()` fetch 래퍼, 채팅 뷰(`EventSource` 구독, `renderMessage`, `@` 자동완성, `sendMessage`), 메시지 장식자 등록(`registerMessageDecorator`) | 파일 맨 아래에서 `./rich.js` import (의도적, SPEC-WEBRICH-001) |
| `rich.js` | 210 | 첨부 노드(이미지 인라인/링크), 권한 요청·판정 정규식과 승인/거절 버튼, 봇 초대 다이얼로그 헬퍼, 클립보드 복사 | 내보내기: `createRichContext`, `buildAttachmentNode`, `permissionRequestId`, `verdictForm`, `buildInviteChoices`, `applyInviteResult`, `copyText` 등 |
| `rich.d.ts` | 40 | `server/tsconfig.json` 이 `allowJs` 없이 `rich.js` 를 타입 검사하기 위한 수기 선언 | `rich.js` 와 어긋나도 시험이 잡지 못한다 |
| `style.css` | 490 | 레이아웃·컴포넌트 스타일 | 6행에서 `./design-tokens.css` `@import` |
| `design-tokens.css` | 59 | `--md-*` 색·간격·글꼴 토큰 (Discord 스크린샷 분석 결과) | 근거: `.moai/project/design-dna-discord.md` |

## scripts/ — 4 파일, 1,403 줄

| 파일 | 줄 | 책임 | 호출 |
|---|---|---|---|
| `e2e.mts` | 489 | 실제 서버 프로세스를 띄워 15단계 시나리오(가입→방·봇→초대→v2 접속→멘션 전달→봇 응답→권한 릴레이→첨부→재시작 영속성→보관 후 접속 거부)를 돈다. 내보내기: `acquirePort`, `spawnServer`, `waitForBoot`, `stopServer`, `api`, `step`, `checkDependencies`, `main` | `npm run e2e` |
| `live-dryrun.mts` | 175 | SPEC-LIVEENV-001 §A 순서를 **가짜 채널**로 예행 (실 Claude 세션·API 비용 없음). `e2e.mts` 헬퍼 5개 재사용 | `npm run live-dryrun` |
| `live-extract.mts` | 43 | 증거 추출 라이브러리의 CLI 껍데기 (`capture` / `extract`). 종료 코드 0/1/2 | `npx tsx scripts/live-extract.mts …` (package.json 미등록) |
| `live-env.sh` | 696 | 라이브 검증 환경 관리. 하위 명령 `paths·up·down·status·invite·bot·token-sweep`. **종료 코드가 셋** — 0 재서 통과, 1 재서 실패, 2 재지 못함 | `scripts/live-env.sh <명령>` |

## server/test 헬퍼 (`.test.ts` 아님) — 5 파일, 784 줄

| 파일 | 줄 | 책임 | 쓰는 곳 |
|---|---|---|---|
| `gateway-v2.ts` | 121 | v2 핸드셰이크 하네스. `server/src` 와 **독립적으로** 키를 다시 유도한다 (`skOf`, `pubOf`, `ksrvHexOf`, `connectV2`, `innerOf`, `recordSocket`) | 서버 시험 대부분, `scripts/e2e.mts`·`live-dryrun.mts` (동적 import) |
| `live-extract-lib.ts` | 460 | 증거 추출 순수 라이브러리 (트랜스크립트 파싱, DB 판독, 항목 판정, 매니페스트, Playwright 캡처). 외부 `sqlite3`·브라우저 바이너리를 셸로 호출 | `scripts/live-extract.mts`·`live-dryrun.mts`, `live-extract.test.ts` |
| `wsupgrade-judgment.ts` | 188 | SPEC-WSUPGRADE-001 의 404 응답자 판정기 (지문표, H-1/H-2/H-3/미분류 판정). `server/src` 무변경을 스스로 단언 | `gateway.test.ts`, `wsupgrade-judgment.test.ts` |
| `probe-db.ts` | 13 | WAL 모드와 `idx_*` 인덱스 이름 출력 | 수동 |
| `no-listen.ts` | 2 | `index.ts` import 만으로는 listen 하지 않음을 증명 (AC-CORE-015) | 시험 |

## 팬인이 높은 모듈 (소스 기준 import 하는 파일 3개 이상)

| 모듈 | 팬인 | import 하는 파일 |
|---|---|---|
| `server/src/auth.ts` | 5 | index, routes-events, routes-rooms, routes-bots, routes-messages |
| `server/src/room-members.ts` | 5 | routes-events, routes-rooms, routes-bots, routes-messages, permissions |
| `server/src/db.ts` | 4 | index, auth, room-members, routes-messages |
| `server/src/gateway.ts` | 3 | index, routes-bots (타입), permissions (타입) |
| `server/test/gateway-v2.ts` | 시험 대부분 + 스크립트 2 | — |

이들은 `@MX:ANCHOR` 후보다. `auth.ts` 의 `requireAuth` 와 `room-members.ts` 의 `requireRoomMember` 시그니처를 바꾸면 라우트 모듈 전부가 영향을 받는다.
