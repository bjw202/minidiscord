# minidiscord

내 PC에서 도는 자체 호스팅 채팅 서버예요. 사람은 웹 화면에서 대화하고, Claude Code 세션은 봇으로 같은 방에 들어와 함께 이야기합니다.

> **지금 상태: 계정·방·봇까지 됩니다.** 회원가입과 로그인, 방 만들기와 보관, 봇 등록과 방 초대(1회용 토큰 발급)가 동작합니다. 아직 없는 것은 메시지 주고받기와 실시간 전송, 채널 플러그인, 웹 화면이에요. 전체 그림과 남은 단계는 [ROADMAP.md](./ROADMAP.md)에 있어요.

## 필요한 것

- Node.js 20 이상 (개발·검증은 v24에서 했습니다)
- npm 9 이상

## 시작하기

```bash
npm install          # 의존성 설치 (워크스페이스 전체)
npm run dev -w server   # 서버 실행 — 기본 http://127.0.0.1:3000
```

서버가 떴는지 확인하는 방법:

```bash
curl http://127.0.0.1:3000/api/health
# {"ok":true}
```

## 설정

값은 모두 환경변수로 넘깁니다. 안 넘기면 괄호 안의 기본값을 씁니다.

| 환경변수 | 뜻 | 기본값 |
|---|---|---|
| `MINIDISCORD_PORT` | 서버가 열 포트 | `3000` |
| `MINIDISCORD_DATA_DIR` | 데이터가 쌓이는 폴더 | `./data` |

데이터베이스 파일(`minidiscord.db`)과 업로드 파일 폴더(`uploads/`)는 항상 이 데이터 폴더 안에 생깁니다. 코드가 있는 폴더에는 아무것도 쓰지 않아요.

## API

### 로그인 없이 부를 수 있는 경로

이 네 개가 전부입니다. 나머지 경로는 전부 로그인 쿠키를 요구합니다.

| 메서드·경로 | 하는 일 | 응답 |
|---|---|---|
| `GET /api/health` | 서버가 살아 있는지 확인 | `200 {"ok":true}` |
| `POST /api/auth/register` | 회원가입 (`username`, 8자 이상 `password`) | `201` / 입력 오류 `400` / 이름 중복 `409` |
| `POST /api/auth/login` | 로그인 — 성공하면 `md_session` 쿠키를 심습니다 | `200` / 실패 `401` |
| `POST /api/auth/logout` | 로그아웃 — 서버의 세션 기록을 지우고 쿠키를 비웁니다 | `200` |

로그인 실패 응답은 "없는 사용자"와 "비밀번호 틀림"을 구분하지 않습니다. 구분하면 어떤 사용자 이름이 존재하는지 바깥에서 알아낼 수 있기 때문이에요.

### 로그인이 필요한 경로

| 메서드·경로 | 하는 일 | 응답 |
|---|---|---|
| `GET /api/rooms` | 방 목록 — `{ active: [...], archived: [...] }` | `200` |
| `POST /api/rooms` | 방 만들기 (`name`) | `201` / 빈 이름 `400` |
| `POST /api/rooms/:id/archive` | 방 보관 — 그 방의 봇 토큰도 함께 철회됩니다 | `200` / 없는 방 `404` / 이미 보관됨 `409` |
| `GET /api/bots` | 등록된 봇 목록 | `200` |
| `POST /api/bots` | 봇 등록 (`name`, `description`) | `201` / 빈 이름 `400` / 이름 중복 `409` |
| `POST /api/rooms/:id/invites` | 봇을 방에 초대 — 1회용 토큰과 실행 명령을 돌려줍니다 | `201` / 없는 방·봇 `404` / 보관된 방 `409` |
| `GET /api/rooms/:id/invites` | 그 방의 활성 초대 목록 (토큰은 들어 있지 않습니다) | `200` |
| `DELETE /api/rooms/:id/invites/:botId` | 초대 철회 — 몇 번을 불러도 같은 결과입니다 | `200` |

쿠키 없이 이 경로들을 부르면 전부 `401`입니다.

### 봇 초대 토큰

초대를 만들면 응답에 **평문 토큰이 딱 한 번** 실립니다. 서버는 이 토큰의 sha256 해시만 저장하기 때문에, 창을 닫으면 다시 볼 수 없어요. 잃어버렸다면 같은 봇을 다시 초대하면 됩니다 — 그러면 이전 토큰은 철회되고 새 토큰이 나옵니다.

초대 응답의 `command` 필드는 그 봇 세션을 띄우는 명령을 그대로 담고 있습니다:

```bash
# 1회 등록 (최초 한 번만):
claude mcp add --scope user minidiscord-channel -- minidiscord-channel

# 세션 실행 (원하는 페르소나 디렉터리에서):
export MINIDISCORD_TOKEN=<발급된 토큰>
export MINIDISCORD_SERVER=ws://127.0.0.1:3000/bot
claude --dangerously-load-development-channels server:minidiscord-channel
```

> 이 명령을 받는 게이트웨이(`ws://.../bot`)는 아직 없습니다. 지금은 토큰 발급과 철회까지만 동작합니다.

## 보안에 대해 알아둘 점

이건 **내 PC에서만 도는** 서버라는 전제로 만들어졌어요. 그래서 다음은 일부러 넣지 않았습니다.

- **HTTPS와 `secure` 쿠키 속성** — 평문 HTTP를 씁니다. 세션 쿠키에는 `httpOnly`와 `SameSite=Lax`가 걸려 있어요.
- **세션 만료·회전** — 로그아웃하기 전까지 세션이 유지됩니다.
- **로그인 시도 횟수 제한, CSRF 토큰**
- **사용자별 권한 구분** — 로그인한 사람은 누구나 모든 방과 봇을 다룰 수 있습니다.

비밀번호는 평문으로 저장하지 않습니다. 16바이트 난수 소금(salt)을 섞은 `scrypt` 해시로 저장하고, 비교는 상수 시간 비교를 씁니다.

## 명령어

| 명령 | 하는 일 |
|---|---|
| `npm run dev -w server` | 서버 실행 |
| `npm test -w server` | 서버 테스트 실행 |
| `npm test` | 전체 워크스페이스 테스트 실행 |
| `npm run typecheck -w server` | 타입 검사 (코드 실행 없이 타입만 확인) |

## 폴더 구조

```
minidiscord/
├─ server/          Fastify + SQLite 서버
│  ├─ src/
│  │  ├─ index.ts         서버 조립 + GET /api/health
│  │  ├─ config.ts        포트·데이터 경로 설정
│  │  ├─ db.ts            SQLite 연결과 스키마
│  │  ├─ auth.ts          회원가입·로그인·세션 쿠키·requireAuth
│  │  ├─ routes-rooms.ts  방 생성·목록·보관
│  │  └─ routes-bots.ts   봇 등록·목록 + 방 초대 발급·목록·철회
│  └─ test/               vitest 테스트
├─ web/            웹 UI (아직 비어 있음)
└─ .moai/          SPEC 문서와 작업 기록
```

`channel/`(Claude Code 채널 플러그인)은 루트 `package.json`에 워크스페이스로 선언만 되어 있고, 폴더는 아직 만들어지지 않았습니다.

## 데이터베이스

`server/src/db.ts`의 `openDb(경로)`를 부르면 표 8개와 색인 2개가 만들어집니다. 이미 있으면 그대로 두기 때문에(멱등) 몇 번을 다시 열어도 기존 데이터는 그대로예요.

| 표 | 담는 것 | 지금 쓰이나요 |
|---|---|---|
| `users` / `sessions` | 계정과 로그인 세션 | 예 |
| `rooms` | 방 (활성 / 보관됨) | 예 |
| `bots` / `bot_tokens` | 봇 등록 정보와 방별 접속 토큰(해시) | 예 |
| `messages` / `message_targets` | 메시지와 `@TO`/`@CC` 수신 대상 | 아직 |
| `attachments` | 첨부 파일 | 아직 |

## 문서

- [ROADMAP.md](./ROADMAP.md) — 6단계 전체 계획
- `.moai/specs/SPEC-CORE-001/` — 저장소 토대와 SQLite 스키마
- `.moai/specs/SPEC-AUTH-001/` — 회원가입·로그인·세션 쿠키·보호 라우트 진입 검사
- `.moai/specs/SPEC-ROOM-001/` — 방 생성·목록·보관과 봇 등록
- `.moai/specs/SPEC-BOT-001/` — 봇 초대 토큰 발급·목록·철회
- [CHANGELOG.md](./CHANGELOG.md) — 버전별 변경 내역
