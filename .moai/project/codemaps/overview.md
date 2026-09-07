# minidiscord 코드맵 — 전체 개요

> 기준 커밋 `6418b31` (main, 2026-09-07). 생성 방법: Explore 에이전트의 전수 판독 + `grep` import 그래프 + `wc -l`. 줄 수와 파일 수는 이 커밋 시점의 값이며, 코드가 바뀌면 이 문서를 다시 생성한다 (`/moai codemaps --force`).
>
> 다른 코드맵: [modules.md](./modules.md) (모듈 카탈로그) · [dependencies.md](./dependencies.md) (의존 그래프) · [entry-points.md](./entry-points.md) (진입점·API·프로토콜) · [data-flow.md](./data-flow.md) (핵심 흐름·데이터 모델)

## 한 문단 요약

minidiscord 는 npm workspaces 로 묶인 TypeScript 모노레포다. **서버**(`server/`, Fastify + better-sqlite3 + ws)가 REST API·SSE·정적 웹·봇 게이트웨이를 한 프로세스에서 제공하고, **채널 플러그인**(`channel/`, MCP stdio 서버)이 Claude Code 세션을 봇으로 게이트웨이에 붙이며, **웹 UI**(`web/`, 빌드 없는 바닐라 ES 모듈)가 사람 쪽 화면을 맡는다. `scripts/` 는 E2E 시나리오와 라이브 검증 환경 도구다. 세 런타임 컴포넌트 사이에 코드 의존은 없고, 오직 HTTP/SSE 와 WebSocket 프로토콜로만 만난다.

## 구성 요소

| 구성 요소 | 경로 | 소스 줄 수 | 역할 |
|---|---|---|---|
| 서버 | `server/src/` (13 파일) | 1,305 | Fastify 앱 조립, 인증, 방·봇·메시지 API, SSE 허브, WebSocket 봇 게이트웨이(상호 인증 v2), 권한 릴레이 브로커 |
| 채널 플러그인 | `channel/src/` (4 파일) | 740 | 공식 Channels 계약을 구현한 MCP 서버, 게이트웨이 WebSocket 클라이언트(재접속·봉투 검증), 바이트 예산 절단 |
| 웹 UI | `web/` (6 파일) | 1,602 | 로그인·방 목록·채팅·SSE 수신·`@` 자동완성·첨부·봇 초대 다이얼로그·권한 승인 버튼 |
| 스크립트 | `scripts/` (4 파일) | 1,403 | 15단계 E2E 러너, 가짜 채널 예행, 증거 추출기, 라이브 환경 관리 셸 |
| 테스트 헬퍼 | `server/test/*.ts` (`.test.ts` 제외 5 파일) | 784 | v2 핸드셰이크 하네스, 증거 추출 순수 라이브러리, 404 응답자 판정기 등 — 스크립트가 가져다 쓰는 사실상의 공유 라이브러리 |

테스트: `server/test` 18개 `.test.ts` (7,175줄), `channel/test` 7개 (3,854줄). 제품 코드보다 테스트가 두 배 이상 많다.

## 연결 흐름

```
브라우저 ──HTTP/SSE──▶ server (Fastify, :3000) ◀──WebSocket /bot── channel (MCP stdio) ◀── Claude Code 세션
                              │
                              └── SQLite (data/minidiscord.db, WAL) + data/uploads/
```

- 서버와 채널은 같은 머신에서 도는 것이 전제다. 기본 바인드는 `127.0.0.1`, 채널의 기본 게이트웨이 주소는 `ws://127.0.0.1:3000/bot`.
- 서버는 TLS 를 종단하지 않는다. 그래서 상호 인증 v2 의 채널 바인딩은 항상 `unbound` 이고, 중계형 중간자는 어떤 배치에서도 배제되지 않는다 (README 「채널 플러그인을 붙이기 전에」, 보류 카드 t23).

## 서버 내부 계층

서버는 클래스나 서비스 계층 없이 **Fastify 데코레이터를 의존성 주입 컨테이너로** 쓴다. `app.db`, `app.hub`, `app.gateway`, `app.uploadsDir`, `app.permissions` 다섯 개가 조립 시점에 붙고, 각 기능은 `registerXRoutes(app)` 함수 하나다. ORM 이나 저장소 계층은 없고 모든 모듈이 하나의 `better-sqlite3` 연결에 prepared SQL 을 직접 던진다.

```
index.ts                         ← 조립 (순서가 계약이다 — entry-points.md 참고)
  ├─ permissions.ts              ← 횡단: 봇 승인 요청 ↔ 사람 판정 중계
  ├─ gateway.ts · routes-*.ts    ← 기능: WebSocket 게이트웨이, 방/봇/메시지/이벤트 라우트
  ├─ auth.ts · room-members.ts · mention.ts · sse.ts   ← 원시 부품
  └─ config.ts · db.ts           ← 잎 (내부 import 없음)
```

`gateway.ts` 는 내부 모듈을 하나도 import 하지 않고, `permissions.ts`·`routes-bots.ts` 는 게이트웨이를 타입 import 와 런타임 데코레이터로만 만난다. 순환 import 는 없다. 어떻게 끊었는지는 [dependencies.md](./dependencies.md) 「순환을 끊은 자리」에 있다.

## 채널 플러그인 내부

```
index.ts   wire()  ──▶ channel-server.ts (MCP 도구 reply/fetch_history · 알림 · 지시문)
                   ──▶ gateway-client.ts (v2 핸드셰이크 · 봉투 검증 · 지수 백오프 재접속 · history RPC)
                   ──▶ truncate.ts (바이트 예산 · 시질 이스케이프)
```

`channel/` 은 `server/` 소스에 의존하지 않는다. v2 암호 규칙(키 유도 라벨, 트랜스크립트 구분자)은 서버 쪽과 **독립 복사본**으로 존재한다.

## 눈에 띄는 점 (검토 시 먼저 볼 자리)

1. **암호 규칙 삼중 복제.** v2 키 유도·트랜스크립트 규칙이 `server/src/routes-bots.ts`+`gateway.ts`, `channel/src/gateway-client.ts`, `server/test/gateway-v2.ts` 세 곳에 따로 있다. 워크스페이스 격리와 하네스 독립성을 위한 의도적 선택이지만, 한 글자 어긋나면 단위 시험은 전부 초록인 채 왕복 수용 시험(AC-GWAUTH2-020)에서만 드러난다.
2. **인가 검사가 빠진 경로 둘.** `POST /api/rooms/:id/archive` 와 `GET /api/attachments/:id` 는 로그인만 요구하고 방 구성원 검사를 거치지 않는다. README 가 알려진 예외로 적어 두었고, 보류 카드 t17 이 담당한다.
3. **서버 문자열과 브라우저 정규식의 결합.** `permissions.ts` 가 만드는 한국어 시스템 메시지를 `web/rich.js` 가 정규식으로 읽는다. `전달하지 못했습니다 (<id>)` 꼬리는 코드에 `[HARD]` 로 표시돼 있다 — 문구를 바꾸면 승인 버튼 잠금이 조용히 깨진다.
4. **스크립트가 다른 워크스페이스의 test 디렉터리를 import 한다.** `scripts/e2e.mts`·`live-dryrun.mts` → `server/test/gateway-v2.ts`·`live-extract-lib.ts`. 한 방향 규칙(스크립트는 `server/src/**` 를 절대 import 하지 않음)으로 관리한다.
5. **부분 조립을 견디기 위한 옵셔널 체이닝.** `req.server.permissions?.`, `gateway?.isOnline` 은 테스트용 부분 서버를 위한 것인데, 실제 조립에서 데코레이션이 빠지면 권한 릴레이가 오류 없이 죽는다.
6. **낡은 코드.** `routes-bots.ts` 의 `sha256Hex` 는 v1 잔재로 `server/src` 안에서 호출자가 없다 (주석이 스스로 삭제 대상이라고 적음).
7. **커버리지는 보고만 하고 강제하지 않는다.** `channel/vitest.config.ts` 만 v8 커버리지를 켜고 임계값은 없다. `server/` 에는 vitest 설정 파일 자체가 없다. CI 는 `npm run e2e`·`live-dryrun` 을 돌리지 않는다.
