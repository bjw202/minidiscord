# minidiscord 코드맵 — 전체 개요

> 기준 커밋 `74ff7c9` (WT-v2-model, 2026-09-07). 생성 방법: 소스 전수 판독 + `grep '^import'` import 그래프 + `wc -l`. 줄 수와 파일 수는 이 커밋 시점의 값이며, 코드가 바뀌면 이 문서를 다시 생성한다 (`/moai codemaps --force`).
>
> 다른 코드맵: [modules.md](./modules.md) (모듈 카탈로그) · [dependencies.md](./dependencies.md) (의존 그래프) · [entry-points.md](./entry-points.md) (진입점·API·프로토콜) · [data-flow.md](./data-flow.md) (핵심 흐름·데이터 모델)

## 한 문단 요약

minidiscord 는 npm workspaces 로 묶인 TypeScript 모노레포다. **서버**(`server/`, Fastify + better-sqlite3 + ws)가 REST API·SSE·정적 웹·봇 게이트웨이를 한 프로세스에서 제공하고, **채널 플러그인**(`channel/`, MCP stdio 서버)이 Claude Code 세션을 봇으로 게이트웨이에 붙이며, **웹 UI**(`web/`, 빌드 없는 바닐라 ES 모듈)가 사람 쪽 화면을 맡는다. `scripts/` 는 E2E 시나리오 러너 하나다. 세 런타임 컴포넌트 사이에 코드 의존은 없고, 오직 HTTP/SSE 와 WebSocket 프로토콜로만 만난다. 봇 모델은 v2 (SPEC-BOTMODEL-001) — **봇은 신원**이고 토큰 하나가 `bots` 행에 살며, 방 참여는 `room_bots` 행이고, 게이트웨이 접속은 봇 단위라 방은 프레임의 `room_id` 가 실어 온다.

## 구성 요소

| 구성 요소 | 경로 | 소스 줄 수 | 역할 |
|---|---|---|---|
| 서버 | `server/src/` (13 파일) | 1,121 | Fastify 앱 조립, 이름 로그인, 방·봇·참여·메시지 API, SSE 허브, WebSocket 봇 게이트웨이(맨몸 JSON 프레임, 연속 봇 글 상한), 권한 릴레이 브로커 |
| 채널 플러그인 | `channel/src/` (4 파일) | 592 | 공식 Channels 계약을 구현한 MCP 서버, 게이트웨이 WebSocket 클라이언트(`hello`/`welcome` 한 왕복·지수 백오프 재접속), 바이트 예산 절단 |
| 웹 UI | `web/` (6 파일) | 1,582 | 이름 로그인·방 목록·채팅·SSE 수신·`@` 자동완성·첨부·봇 등록/참여 다이얼로그·권한 승인 버튼 |
| 스크립트 | `scripts/e2e.mts` (1 파일) | 477 | 15단계 «봇 하나·방 둘» E2E 러너. `scripts/_archive/` 에 퇴역한 live-* 도구 4 파일이 남아 있다 (실행 대상 아님) |
| 테스트 헬퍼 | `server/test/*.ts` (`.test.ts` 제외 3 파일) | 203 | 404 응답자 판정기, WAL·인덱스 관측, import 만으로 listen 하지 않음 증명 |

테스트: `server/test` 17개 `.test.ts` (5,368줄), `channel/test` 6개 (2,551줄). 제품 코드(1,713줄)보다 테스트(7,919줄)가 네 배 이상 많다.

## 연결 흐름

```
브라우저 ──HTTP/SSE──▶ server (Fastify, :3000) ◀──WebSocket /bot── channel (MCP stdio) ◀── Claude Code 세션
                              │
                              └── SQLite (data/minidiscord.db, WAL) + data/uploads/
```

- 배치 전제는 사내망이다. 기본 바인드는 `127.0.0.1`, 채널의 기본 게이트웨이 주소는 `ws://127.0.0.1:3000/bot` 이며 채널은 전송 스킴을 검사하지 않는다 (`channel/src/index.ts` 진입 블록 주석).
- 토큰은 전선과 `bots.token` 열 양쪽에서 평문이다. 사람 인증은 이름 하나뿐이고, 로그인한 사람은 모든 방을 읽고 쓴다.
- v2 리팩토링(2026-09-07)에서 상호 인증 핸드셰이크·봉투·방별 토큰 표·방 구성원 인가·초대 라우트·비밀번호 가입이 제거됐다 — 경위는 `.moai/reports/v2-review.md`.

## 서버 내부 계층

서버는 클래스나 서비스 계층 없이 **Fastify 데코레이터를 의존성 주입 컨테이너로** 쓴다. `app.db`, `app.hub`, `app.gateway`, `app.uploadsDir`, `app.permissions` 다섯 개가 조립 시점에 붙고, 각 기능은 `registerXRoutes(app)` 함수 하나다. ORM 이나 저장소 계층은 없고 모든 모듈이 하나의 `better-sqlite3` 연결에 prepared SQL 을 직접 던진다.

```
index.ts                         ← 조립 (순서가 계약이다 — entry-points.md 참고)
  ├─ permissions.ts              ← 횡단: 봇 승인 요청 ↔ 사람 판정 중계
  ├─ gateway.ts · routes-*.ts    ← 기능: WebSocket 게이트웨이, 방/봇/메시지/이벤트 라우트
  ├─ targets.ts                  ← 공유: 멘션 → room_bots 대조 (사람 경로·봇 경로가 함께 지남)
  ├─ auth.ts · mention.ts · sse.ts   ← 원시 부품
  └─ config.ts · db.ts           ← 잎 (내부 import 없음)
```

`gateway.ts` 가 import 하는 내부 모듈은 `targets.ts` 하나이고, `permissions.ts`·`routes-bots.ts` 는 게이트웨이를 타입 import 와 런타임 데코레이터로만 만난다. 순환 import 는 없다. 어떻게 끊었는지는 [dependencies.md](./dependencies.md) 「순환을 끊은 자리」에 있다.

## 채널 플러그인 내부

```
index.ts   wire()  ──▶ channel-server.ts (MCP 도구 reply/fetch_history · 알림 · 지시문 · 봉투 중화)
                   ──▶ gateway-client.ts (hello/welcome · 지수 백오프 재접속 · history rid 대조)
                   ──▶ truncate.ts (바이트 예산 · 시질 이스케이프)
```

`channel/` 은 `server/` 소스에 의존하지 않는다. 채널 시험 6 파일도 서버 소스를 import 하지 않는다 (`grep -rn "server/src" channel/` 0건).

## 눈에 띄는 점 (검토 시 먼저 볼 자리)

1. **멘션 대조는 한 자리, 정책은 봇 경로에만.** `targets.ts` `resolveTargets` 를 사람 경로(`routes-messages.ts`)와 봇 경로(`gateway.ts handleBotMessage`)가 함께 지나지만, 연속 봇 글 상한(`BOT_RUN_LIMIT = 6`, `@TO` → `cc` 강등)은 봇 경로에만 있다. 발신 봇의 역할로는 거르지 않는다(역할 필터는 2026-09-08 삭제, `bots.role` 은 기록). 사람도 봇도 그 방의 어느 봇이든 `@TO` 할 수 있다.
2. **인가는 로그인뿐이다.** 방 구성원 표가 없으므로 모든 라우트가 `requireAuth` 하나로 열린다. `GET /api/rooms` 는 모든 방을 돌려주고, 보관·첨부 다운로드도 로그인만 본다. 봇 쪽은 `room_bots` 행이 유일한 경계다 — 참여하지 않은 방을 실은 프레임은 `handleWsMessage` 에서 조용히 버려진다.
3. **보관된 방은 봇에게도 읽기 전용이다.** `gateway.ts` 가 `rooms.status` 를 읽는 자리는 둘 — `handleHello` 의 `welcome.rooms` 조회와 `handleWsMessage` 의 `isActiveRoom`(t43). 후자는 `bot_message`·`status` 만 막고(조용히 버림, 소켓 유지) `history_request` 는 통과시킨다. `closeRoom` 은 빈 몸체다. 사람 경로는 409 로 막는다 (`routes-messages.ts`).
4. **서버 문자열과 브라우저 정규식의 결합.** `permissions.ts` 가 만드는 한국어 시스템 메시지를 `web/rich.js` 가 정규식(`REQUEST_LINE_RE`·`RESOLUTION_RE`)으로 읽는다. `전달하지 못했습니다 (<id>)` 꼬리는 코드에 `[HARD]` 로 표시돼 있다 — 문구를 바꾸면 승인 버튼 잠금이 조용히 깨진다.
5. **부분 조립을 견디기 위한 옵셔널 체이닝.** `req.server.permissions?.` (routes-messages.ts:63), `gateway?.isOnline` (routes-bots.ts:74) 은 테스트용 부분 서버를 위한 것인데, 실제 조립에서 데코레이션이 빠지면 권한 릴레이가 오류 없이 죽는다.
6. **커서를 채우는 자리가 둘이다.** `room_bots.last_delivered_id` 를 `replayMissed`(방별 마지막 id)와 `deliverTo`(배달한 행)가 올린다. 둘 다 `advanceCursor` 한 함수를 지나며, 코드에 `[HARD]` 로 짝을 적어 두었다.
7. **커버리지는 보고만 하고 강제하지 않는다.** `channel/vitest.config.ts` 만 v8 커버리지를 켜고 임계값은 없다. `server/` 에는 vitest 설정 파일 자체가 없다. CI(`.github/workflows/ci.yml`)는 `npm ci` → `typecheck` 둘 → `npm test` 만 돌리고 `npm run e2e` 는 돌리지 않는다.
