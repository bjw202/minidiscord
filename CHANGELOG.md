# 변경 내역

이 프로젝트의 주요 변경 사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따릅니다.

## [Unreleased]

### 추가됨

- **npm workspaces 저장소 구조** — 루트가 `server`와 `channel` 두 워크스페이스를 선언합니다. (`SPEC-CORE-001`)
- **Fastify 서버 뼈대** — `server/src/index.ts`가 `buildServer()`를 내보냅니다. 이 함수는 서버를 조립만 하고 포트는 열지 않아서, 테스트가 포트 충돌 없이 서버를 가져다 쓸 수 있습니다.
- **헬스 체크 엔드포인트** — `GET /api/health`가 `200`과 `{"ok":true}`를 응답합니다. 현재 등록된 유일한 경로입니다.
- **설정 모듈** — `server/src/config.ts`가 `port`·`dataDir`·`dbPath`·`uploadsDir`를 제공합니다. `MINIDISCORD_PORT`(기본 `3000`)와 `MINIDISCORD_DATA_DIR`(기본 `./data`)로 재정의할 수 있고, DB·업로드 경로는 데이터 폴더에서 파생됩니다.
- **SQLite 스키마** — `server/src/db.ts`의 `openDb(path)`가 표 8개(`users`, `sessions`, `rooms`, `bots`, `bot_tokens`, `messages`, `message_targets`, `attachments`)와 색인 2개(`idx_messages_room`, `idx_targets_bot`)를 만듭니다. 연결 직후 저널 모드를 WAL로 설정하고, 같은 파일을 다시 열어도 기존 데이터를 보존합니다(멱등).
- **테스트 기반** — vitest 테스트 5개(헬스 체크 1, 스키마 2, 설정 2)와 `typecheck` 스크립트.
- **문서** — `README.md`, 이 `CHANGELOG.md`.

### 알아둘 점

- `server/tsconfig.json`에 `skipLibCheck: true`를 켰습니다. 상류 의존성(`fastify` → `pino` → `thread-stream`)의 타입 선언이 최신 `@types/node`와 맞지 않아 타입 검사가 실패했기 때문입니다. `strict`·`NodeNext`·`ES2022` 설정은 그대로입니다.
- 루트 `package.json`에 `test` 스크립트(`npm test --workspaces --if-present`)를 추가했습니다. 커밋 전 품질 게이트가 루트에서 `npm test`를 부르기 때문입니다.

### 아직 없는 것

로그인·세션, 방과 봇 관리, 메시지 전송과 멘션, SSE·WebSocket 실시간 전송, 채널 플러그인, 웹 UI는 이번 범위 밖입니다. 표는 만들어졌지만 그 위의 기능은 다음 단계에서 붙습니다. 자세한 순서는 [ROADMAP.md](./ROADMAP.md)를 보세요.
