# 변경 내역

이 프로젝트의 주요 변경 사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따릅니다.

## [Unreleased]

### 추가됨 — 계정·방·봇 (카드 `t2`)

- **회원가입·로그인·세션 쿠키** — `server/src/auth.ts`가 `POST /api/auth/register`·`login`·`logout` 세 경로를 등록합니다. 로그인에 성공하면 `md_session` 쿠키(`httpOnly`, `SameSite=Lax`, `path=/`)를 심고, 로그아웃은 `sessions` 행을 지운 뒤 쿠키를 비웁니다. (`SPEC-AUTH-001`)
- **비밀번호 해시** — `hashPassword`가 16바이트 난수 salt와 `scrypt` 64바이트 파생 키를 `<salt-hex>:<key-hex>`로 저장하고, `verifyPassword`가 `timingSafeEqual`로 비교합니다. 평문은 어디에도 남지 않습니다. (`SPEC-AUTH-001`)
- **보호 라우트 진입 검사** — `requireAuth`가 `md_session` 쿠키를 `sessions` 테이블과 대조해 통과하면 `req.user`를 채웁니다. 방·봇 라우트 8개가 전부 이 검사를 `preHandler`로 답니다. (`SPEC-AUTH-001`)
- **방 API** — `GET /api/rooms`(활성/보관 두 목록), `POST /api/rooms`, `POST /api/rooms/:id/archive`. 보관은 한 트랜잭션 안에서 방 상태 전이와 그 방 봇 토큰 철회를 함께 처리하고, 커밋 이후에만 `onArchive` 훅을 부릅니다. (`SPEC-ROOM-001`)
- **봇 등록 API** — `GET /api/bots`, `POST /api/bots`. 봇은 표시용 정보(`name`, `description`)만 가집니다 — 페르소나는 각 세션 디렉터리가 담당합니다. (`SPEC-ROOM-001`)
- **봇 초대 API** — `POST /api/rooms/:id/invites`가 1회용 토큰과 세션 실행 명령을 돌려주고, 서버에는 sha256 해시만 저장합니다. `GET /api/rooms/:id/invites`는 토큰 없이 활성 초대만 보여주고, `DELETE /api/rooms/:id/invites/:botId`는 몇 번을 불러도 같은 결과를 냅니다(멱등). 같은 봇을 다시 초대하면 이전 토큰이 먼저 철회됩니다. (`SPEC-BOT-001`)
- **테스트** — vitest 테스트가 5개에서 37개로 늘었습니다(인증 11, 방·봇·초대 21, 기존 5).

### 알아둘 점

- **오류 코드 구분** — `404`는 "지목한 대상이 없다", `409`는 "대상은 있으나 그 상태에서는 할 수 없다"로 나눕니다. `403`은 쓰지 않습니다.
- **로그인 실패 응답** — "없는 사용자"와 "비밀번호 틀림"을 같은 `401` 본문으로 처리합니다. 사용자 이름 열거를 막기 위해서입니다.
- **초대 목록의 `online`** — SQLite가 돌려주는 정수 `0`을 그대로 흘리지 않고 불리언 `false`로 매핑합니다. 실제 접속 여부 판정은 게이트웨이가 붙는 다음 단계의 몫입니다.
- **구현 중 문서에서 벗어난 3건** (각 SPEC `progress.md` §E.2에 근거와 함께 기록):
  1. 로그인 핸들러에 문자열 타입 가드를 추가했습니다. 없으면 빈 페이로드 로그인이 `401`로 흘러 "인증 없이 닿는 경로는 셋뿐" 기준이 깨집니다.
  2. 테스트 4건의 `set-cookie` 헤더 추출 표현만 정규화 헬퍼로 바꿨습니다. 이 환경의 `light-my-request`가 단일 헤더를 배열이 아닌 문자열로 돌려주기 때문입니다. 단언과 테스트 이름은 그대로입니다.
- **봇 등록의 `409`** — `INSERT` 실패를 전부 `409`로 바꿉니다. 이 표에 `UNIQUE` 말고 다른 제약이 없어 오분류 경로가 없다고 판단한 수용 항목입니다.

### 범위 밖으로 남긴 것 (의도적)

`minidiscord`는 내 PC에서만 도는 서버를 전제로 합니다. HTTPS와 `secure` 쿠키 속성, 세션 만료·회전, 로그인 시도 제한, CSRF 토큰, 사용자별 권한 구분은 넣지 않았습니다.

측정하지 못한 것: 테스트 커버리지 수치(`@vitest/coverage-v8` 미설치, 새 의존성 설치 금지). 대신 테스트와 라우트를 일대일로 대조한 표를 각 `progress.md`에 남겼습니다.

### 아직 없는 것

메시지 전송과 멘션(`@TO`/`@CC`), SSE·WebSocket 실시간 전송, 봇 게이트웨이(`ws://.../bot`), 채널 플러그인, 웹 UI. 자세한 순서는 [ROADMAP.md](./ROADMAP.md)를 보세요.

### 앞서 반영된 토대 (카드 `t1`)

#### 추가됨

- **npm workspaces 저장소 구조** — 루트가 `server`와 `channel` 두 워크스페이스를 선언합니다. (`SPEC-CORE-001`)
- **Fastify 서버 뼈대** — `server/src/index.ts`가 `buildServer()`를 내보냅니다. 이 함수는 서버를 조립만 하고 포트는 열지 않아서, 테스트가 포트 충돌 없이 서버를 가져다 쓸 수 있습니다.
- **헬스 체크 엔드포인트** — `GET /api/health`가 `200`과 `{"ok":true}`를 응답합니다.
- **설정 모듈** — `server/src/config.ts`가 `port`·`dataDir`·`dbPath`·`uploadsDir`를 제공합니다. `MINIDISCORD_PORT`(기본 `3000`)와 `MINIDISCORD_DATA_DIR`(기본 `./data`)로 재정의할 수 있고, DB·업로드 경로는 데이터 폴더에서 파생됩니다.
- **SQLite 스키마** — `server/src/db.ts`의 `openDb(path)`가 표 8개(`users`, `sessions`, `rooms`, `bots`, `bot_tokens`, `messages`, `message_targets`, `attachments`)와 색인 2개(`idx_messages_room`, `idx_targets_bot`)를 만듭니다. 연결 직후 저널 모드를 WAL로 설정하고, 같은 파일을 다시 열어도 기존 데이터를 보존합니다(멱등).
- **테스트 기반** — vitest 테스트 5개(헬스 체크 1, 스키마 2, 설정 2)와 `typecheck` 스크립트.
- **문서** — `README.md`, 이 `CHANGELOG.md`.

#### 알아둘 점

- `server/tsconfig.json`에 `skipLibCheck: true`를 켰습니다. 상류 의존성(`fastify` → `pino` → `thread-stream`)의 타입 선언이 최신 `@types/node`와 맞지 않아 타입 검사가 실패했기 때문입니다. `strict`·`NodeNext`·`ES2022` 설정은 그대로입니다.
- 루트 `package.json`에 `test` 스크립트(`npm test --workspaces --if-present`)를 추가했습니다. 커밋 전 품질 게이트가 루트에서 `npm test`를 부르기 때문입니다.
