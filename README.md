# minidiscord

내 PC에서 도는 자체 호스팅 채팅 서버예요. 사람은 웹 화면에서 대화하고, Claude Code 세션은 봇으로 같은 방에 들어와 함께 이야기합니다.

> **지금 상태: 토대만 있어요.** 서버 뼈대와 데이터베이스 표(테이블)까지 만들어졌고, 로그인·방·메시지·봇 접속은 아직 없습니다. 전체 그림과 남은 단계는 [ROADMAP.md](./ROADMAP.md)에 있어요.

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
├─ server/          Fastify + SQLite 서버 (지금 만들어진 부분)
│  ├─ src/
│  │  ├─ index.ts   서버 조립 + GET /api/health
│  │  ├─ config.ts  포트·데이터 경로 설정
│  │  └─ db.ts      SQLite 연결과 스키마
│  └─ test/         vitest 테스트
├─ channel/         Claude Code 채널 플러그인 (아직 비어 있음)
├─ web/             웹 UI (아직 비어 있음)
└─ .moai/           SPEC 문서와 작업 기록
```

## 데이터베이스

`server/src/db.ts`의 `openDb(경로)`를 부르면 표 8개와 색인 2개가 만들어집니다. 이미 있으면 그대로 두기 때문에(멱등) 몇 번을 다시 열어도 기존 데이터는 그대로예요.

| 표 | 담는 것 |
|---|---|
| `users` / `sessions` | 계정과 로그인 세션 |
| `rooms` | 방 (활성 / 보관됨) |
| `bots` / `bot_tokens` | 봇 등록 정보와 방별 접속 토큰 |
| `messages` / `message_targets` | 메시지와 `@TO`/`@CC` 수신 대상 |
| `attachments` | 첨부 파일 |

지금은 표만 있고, 이 표를 읽고 쓰는 기능은 다음 단계에서 붙습니다.

## 문서

- [ROADMAP.md](./ROADMAP.md) — 6단계 전체 계획
- `.moai/specs/SPEC-CORE-001/` — 이번 토대 작업의 요구사항·수용 기준·진행 기록
- [CHANGELOG.md](./CHANGELOG.md) — 버전별 변경 내역
