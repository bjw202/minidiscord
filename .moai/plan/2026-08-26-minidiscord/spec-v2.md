# minidiscord — 자체 호스팅 채팅 서버 + 클로드코드 봇 연동 설계

작성일: 2026-08-26

## 1. 배경과 목표

### 문제

Claude Code의 공식 Channels 기능을 쓰면 클로드코드 세션을 봇으로 디스코드·텔레그램에 접속시킬 수 있다. 그러나 회사에서 디스코드를 쓸 수 없어 이 흐름을 쓰지 못한다.

### 목표

내 PC(항상 켜진 머신)에서 디스코드의 역할을 하는 채팅 서버(minidiscord)를 띄운다. 나는 어디서든(`http://<내PC주소>:3000`) 접속해 내 클로드코드 세션들과 대화한다. 클로드코드 세션은 공식 Channels 계약을 구현한 커스텀 채널 플러그인을 통해 이 서버에 봇으로 참여한다.

```
브라우저(회사 PC 등) ──HTTP/SSE──▶ minidiscord 서버(내 PC) ◀──WebSocket── 커스텀 채널 플러그인 ◀──stdio(MCP)── Claude Code 세션들
```

### 성공 기준

1. 방을 만들고 봇을 초대(세션 접속)해 대화가 오간다.
2. 긴 대화가 서버 재시작·브라우저 재접속 후에도 그대로 남아 있다.
3. 파일을 올리고 받을 수 있다(사람↔봇 양방향).
4. 한 방에 여러 봇이 동시에 접속해 각자 독립적으로 답변한다.
5. `@TO`/`@CC` 멘션으로 누가 답할지 제어한다.
6. 봇이 세션을 초기화(`clear`)했어도 스스로 대화 기록을 다시 가져올 수 있다.

## 2. 요구사항

### 기능 요구사항

- **계정**: 소수 그룹이 각자 계정으로 로그인한다. (방별 접근 권한은 없음 — YAGNI)

> **개정 (2026-08-29, `SPEC-ROOMAUTHZ-001`).** 위 괄호의 **"방별 접근 권한은 없음 — YAGNI" 판단은 뒤집혔다.** 그 판단은 권한 릴레이(`SPEC-PERM-001`) 이전의 시스템에 대한 것이었고, 그때는 "동료가 내 방 대화를 볼 수 있다"가 편의였다. 릴레이가 들어오면서 방 안의 문자열 하나가 봇 세션의 도구 실행을 승인하는 행위가 됐고, 같은 읽기 권한이 실행 권한으로 승격됐다 — `.moai/reports/t4/sync-audit.md` §F-14. YAGNI 는 "아직 필요 없다"는 판단이지 영구 선언이 아니며, 그것이 적용되던 시스템은 더 이상 존재하지 않는다. 지금은 `SPEC-ROOMAUTHZ-001` 이 방 멤버십 인가를 만든다. 원문은 지우지 않는다 — 결정의 역사가 읽혀야 한다.
- **방**: 대화방을 만들고 이름을 붙인다. 프로젝트(과제)마다 방을 새로 만든다. 끝난 프로젝트의 방은 보관(archive)한다.
- **방 보관**: 방을 닫으면 대화·파일은 읽기 전용으로 보존되고(나중에 검토 가능), 그 방의 봇 토큰이 일괄 무효화되어 채널 접속이 끊기며, 새 메시지는 금지된다. 사이드바에서 보관 방은 접어서 보여준다.
- **봇 등록/초대**: 봇 정의(이름, 설명)를 등록한다. 방에서 봇을 초대하면 (방, 봇) 조합의 접속 토큰이 발급되고, 세션 실행 명령 안내가 표시된다. 사용자가 원하는 페르소나 디렉터리에서 그 명령으로 세션을 띄우면 봇이 온라인으로 표시된다.
- **메시지**: 방에서 긴 대화를 한다. 접속 전 메시지도 포함해 전부 서버 DB에 저장되고, 이후 접속했을 때 불러온다.
- **@TO/@CC 라우팅**: `@TO <봇>`은 지정 봇에게 직접 전달하고 응답을 의무로 한다. `@CC <봇>`은 전달만 하고 응답을 금지한다. 멘션 없는 메시지는 봇에게 전달하지 않는다. 복수 지정을 허용한다. 입력창에 봇 자동완성이 붙는다.
- **파일**: 사람은 업로드/다운로드, 봇은 첨부 발신과 업로드된 파일 읽기가 가능하다.
- **권한 릴레이**: 봇이 도구 승인이 필요하면 방에 승인 요청이 뜨고, 방에서 승인/거절할 수 있다.
- **기록 조회**: 봇이 `fetch_history` 도구로 방 대화 기록(전체/부분/발화자별)을 가져올 수 있다. 조회 결과의 각 줄에는 **메시지 번호**가 붙고, `since_id`로 "그 번호 다음부터"를 요청할 수 있다. 멘션 없는 메시지는 봇에게 전달되지 않으므로(위 @TO/@CC 항목), 봇이 놓친 대화를 스스로 따라잡는 유일한 경로다.
- **봇 상태**: 각 봇의 온라인/오프라인, "입력 중" 상태가 방에 표시된다.

### 비기능 요구사항

- 구현: Node.js + TypeScript, 단일 서버 프로세스, SQLite 저장소.
- 봇 응답은 완성 답변 방식(스트리밍 아님).
- 통신은 HTTP + 로그인(단순). HTTPS는 이후 업그레이드 경로로만 남긴다.

## 3. 전체 아키텍처

### 세 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|---|---|---|
| **minidiscord 서버** | 내 PC, 단일 Node 프로세스 | 웹 UI 서빙, REST API, SSE 실시간 push, 봇 게이트웨이(WebSocket), SQLite/파일 저장 |
| **채널 플러그인**(`minidiscord-channel`) | 각 Claude Code 세션마다 spawn | 공식 Channels 계약을 구현한 MCP 서버(stdio). 위로는 세션에 이벤트 push, 아래로는 게이트웨이에 WebSocket 접속 |
| **웹 UI** | 브라우저 | 디스코드형 2단 레이아웃(방 목록 + 채팅). 로그인, 메시지, 파일, 봇 초대/상태 |

### 핵심 원칙

1. **세션은 정확히 한 방에만 접속한다(세션→방 N:1). 방에는 여러 세션이 접속한다(방→세션 1:N).** 세션이 여러 방 메시지를 받으면 기억이 섞이므로 금지. 공식 Channels의 "한 세션에 이벤트가 줄 선다"는 특성은 이 원칙 아래 무해하다(줄 서는 이벤트가 전부 같은 방의 것이므로).
2. **서버는 세션을 직접 조종하지 않는다.** 채널 플러그인이 토큰을 들고 게이트웨이에 접속해 오면 그 방에 봇이 있는 것으로 취급한다. 세션 프로세스가 죽으면 봇 오프라인 표시만 하고 메시지는 DB에 쌓아둔다.
3. **서버는 페르소나를 모른다.** 봇의 성격·지식은 각 봇의 작업 디렉터리(CLAUDE.md, `.claude/`)가 책임진다. 서버의 봇 정보는 표시용 이름·설명뿐이다. 과제가 바뀌면 방을 새로 만들고 봇을 다시 초대하며, 세션 기억은 방마다 리셋이 기본이다(산출물·자료의 연속성은 봇들의 공유 레포가 담당 — 이 설계의 범위 밖).

### 다중 봇 접속 — 제약 분해와 대책

"한 방에 여러 클로드코드 봇이 안 된다"는 통념은 셋으로 분해되며, 각각 다르게 대응한다.

| 실제 제약 | 출처 | 이 시스템에서의 대책 |
|---|---|---|
| 봇 자격증명(토큰) 하나는 프로세스 하나만 | 디스코드 게이트웨이 규칙 | 해당 없음. 우리 서버가 플랫폼이라 규칙을 우리가 정한다. (방, 봇) 조합마다 별도 토큰 발급 |
| 공식 채널 플러그인의 고정 상태 파일 충돌 | 공식 디스코드/텔레그램 플러그인이 `~/.claude/channels/<이름>/.env`에 상태 저장 | 채널 플러그인을 **무상태·인자 기반**으로 만든다. 방 ID·토큰·서버 주소는 전부 실행 인자/환경변수로 받고 디스크 상태를 쓰지 않는다 |
| 한 세션이 여러 방을 받으면 기록이 섞임 | 채널 이벤트는 세션 안에서 순차 처리 | 세션→방 N:1 원칙으로 원천 해결 |

각 세션이 자기만의 채널 프로세스를 spawn하므로(세션마다 독립 인스턴스), 방 A에 세션 2개는 완전히 독립된 프로세스 2개가 각자 토큰으로 게이트웨이에 접속하는 것이다. Claude Code 쪽에는 막을 메커니즘이 없다.

## 4. 컴포넌트 상세

### 4-A. minidiscord 서버

하나의 프로세스가 다음 모듈을 담는다.

| 모듈 | 하는 일 |
|---|---|
| **웹 서버**(Fastify 등) | 로그인(세션 쿠키), REST API(방·메시지·파일·계정·봇), 웹 UI 정적 파일 서빙 |
| **실시간 push**(SSE) | 브라우저에 새 메시지·봇 상태 변화 전달 |
| **봇 게이트웨이**(WebSocket 서버) | 채널 플러그인 접속 창구. 토큰 인증 → 방 구독 → 메시지 송수신. `room_id`별 접속 목록 관리, 다중 동시 접속 허용 |
| **저장소**(SQLite) | 사용자·방·봇·토큰·메시지·첨부 메타 |
| **파일 저장소**(디스크 폴더) | 업로드 원본 보관. DB에는 메타만 |
| **멘션 파서** | 메시지 본문에서 `@TO(봇)`/`@CC(봇)` 파싱 → 수신 봇 결정 → 대응 채널에만 전달 |

### 4-B. 채널 플러그인 (`minidiscord-channel`)

공식 Channels 계약을 구현한 MCP 서버(TypeScript). 하나의 프로그램을 모든 세션이 재사용하며, 실행 인자로 방·토큰·서버 주소를 받는다. Claude Code는 세션마다 이것을 subprocess로 spawn한다(stdio transport).

세션 실행 예시(전체 명령 형태는 페르소나 디렉터리 설계 시 확정). 채널 서버는 사용자 전역 `.claude.json`에 한 번 등록하고(커맨드 고정), 세션마다 달라지는 토큰은 환경변수로 주입한다:

```bash
# .claude.json 등록(1회): mcpServers.minidiscord-channel =
#   minidiscord-channel --token $MINIDISCORD_TOKEN --server $MINIDISCORD_SERVER
MINIDISCORD_TOKEN=<토큰> MINIDISCORD_SERVER=ws://127.0.0.1:3000/bot \
  claude --dangerously-load-development-channels server:minidiscord-channel
```

채널과 서버는 같은 머신(내 PC)에서 돌므로 접속 주소는 항상 로컬이다.

- **capabilities**: `experimental['claude/channel'] = {}`(필수), `experimental['claude/channel/permission'] = {}`(권한 릴레이 옵트인), `tools = {}`(reply/fetch_history 도구 노출).
- **instructions**(세션의 시스템 프롬프트에 추가): 방의 채팅이라는 설명, TO는 반드시 reply로 응답·CC는 절대 응답 금지, 답변·파일 첨부·기록 조회는 각각 reply/fetch_history 도구 사용, 게이트웨이에서 온 메시지만 신뢰.
- **노출 도구**:
  - `reply { text, files? }` — 방으로 답변 전송. `files`는 내 PC 로컬 경로 목록.
  - `fetch_history { since_id?, since?, until?, speaker?, limit? }` — 서버에서 방 기록 조회. `since_id`는 그 번호보다 큰 메시지만(정확한 커서), `since`/`until`은 시각 범위. 결과의 각 줄은 `#<번호> [시각] 작성자: 본문` 형식이라 봇이 마지막으로 읽은 번호를 알 수 있다.
- **무상태**: 디스크에 아무것도 쓰지 않는다. 재접속 시 게이트웨이의 커서(`missed_after_id`)로 놓친 메시지를 이어받는다.

### 4-C. 웹 UI

- 왼쪽 사이드바: 방 목록, 방별 봇 온라인 표시.
- 오른쪽 채팅: 메시지 목록(과거는 REST로, 접속 후는 SSE로), 파일 첨부·다운로드, `@` 자동완성 드롭다운, 권한 승인 요청 표시.
- 봇 초대 화면: 토큰 발급 + 세션 실행 명령 안내 복사.

## 5. 데이터 모델 (SQLite)

```
users        (id, username, password_hash, created_at)
rooms        (id, name, status, created_at, archived_at)   -- status: 'active' | 'archived'
bots         (id, name, description, created_at)        -- 표시용 등록 정보만. 페르소나 내용 없음
bot_tokens   (id, room_id, bot_id, token_hash, created_at, last_seen_at, revoked_at,
              last_delivered_id)   -- "봇 초대" 1건 = 1행. (방, 봇) 조합의 접속 자격증명.
                                  -- last_delivered_id: 그 봇에게 전달 완료한 마지막 메시지 커서(재접속 재전송 기준)
messages     (id, room_id, author_type, author_user_id, author_bot_id, body, created_at)
             -- author_type: 'user' | 'bot' | 'system'(입장/승인요청 등)
message_targets (message_id, bot_id, delivery)          -- 사용자 메시지의 봇 전달 대상(to/cc) 기록
attachments  (id, message_id, filename, stored_path, size, mime)
```

- 봇 온라인/오프라인은 DB가 아니라 게이트웨이의 WebSocket 접속 여부(메모리)로 판단한다. `last_seen_at`은 "마지막 접속" 표시용.
- 토큰은 해시로만 저장하고 초대 철회(revoke)가 가능하다.

## 6. 봇 게이트웨이 프로토콜 (WebSocket, JSON)

```
채널 → 서버   hello             { token }
서버 → 채널   welcome           { room_id, bot_id, bot_name, missed_after_id }
서버 → 채널   message           { id, body, author_name, delivery: "to"|"cc",
                                  files: [{ name, local_path }] }
채널 → 서버   bot_message       { body, files: [{ local_path }] }
채널 → 서버   status            { state: "working" | "idle" }
채널 → 서버   permission_request { request_id, tool_name, description, input_preview }
서버 → 채널   permission_verdict { request_id, behavior: "allow" | "deny" }
채널 → 서버   history_request   { since_id?, since?, until?, speaker?, limit? }
서버 → 채널   history_response  { messages: [...] }
```

- 서버는 `room_id`별 접속 목록을 관리하고, 메시지는 **멘션 파싱 결과에 따라 지정 봇의 채널에만** 전달한다.
- `id`는 방마다 단조 증가하는 커서로, 재접속 시 `missed_after_id` 이후만 재전송해 중복을 막는다. 같은 번호를 `fetch_history`의 `since_id`가 재사용한다 — 재접속 복구와 대화 따라잡기가 하나의 커서 체계를 쓴다.

## 7. 주요 흐름

### 사람 → 봇

```
브라우저 POST /api/rooms/:id/messages
→ 서버: 멘션 파싱(@TO/@CC) → DB 저장 → SSE로 브라우저 전파
→ 언급된 봇의 채널에만 message 이벤트(delivery: to|cc) 전달
→ 채널: notifications/claude/channel 알림으로 세션에 push
→ 세션: TO면 작업 후 reply 도구 호출 / CC면 읽고 응답하지 않음
→ 채널: bot_message → 서버가 DB 저장 → SSE로 브라우저 표시
```

### 봇 초대

```
웹 UI에서 봇 초대 → 서버가 bot_tokens에 토큰 발급
→ 화면에 세션 실행 명령 안내 표시(토큰·서버 주소 포함)
→ 사용자가 원하는 페르소나 디렉터리에서 그 명령으로 claude 세션 실행
→ 채널이 spawn되어 게이트웨이에 hello → welcome → 봇 온라인 표시
```

### 파일 (로컬 경로 직접 전달)

Claude Code 세션과 서버가 같은 머신에서 돈다는 점을 활용한다.

- **사람→봇**: 브라우저 업로드 → 서버 디스크 저장 → `message` 이벤트의 `files[].local_path`로 전달 → 봇이 그 경로를 Read 도구로 직접 읽는다.
- **봇→사람**: 봇이 reply 도구에 로컬 경로 첨부 → 채널이 `bot_message`에 경로를 실어 보내면 **서버가 같은 머신의 그 경로를 직접 복사** → 방 메시지에 첨부되어 다운로드 가능. (채널·서버가 같은 PC에서 돈다는 전제를 활용해 업로드 API를 두지 않는다.)

### 프로젝트 전환 (방 보관 → 새 방 시작)

```
프로젝트 종료 → 방 보관: 대화·파일 읽기 전용 보존, 그 방의 토큰 일괄 무효화(채널 접속 끊김, 봇 오프라인 처리)
→ 새 방 생성
→ 기존 봇 정의를 선택해 재초대 (봇 정의는 전역 등록이라 다시 만들지 않는다)
→ 새 토큰 발급 + 세션 실행 명령 안내
→ 사용자가 원하는 페르소나 디렉터리에서 세션 실행 → 새 방에서 봇 온라인 (기억은 빈 상태로 시작)
```

### 권한 릴레이

```
봇이 승인 필요 도구 호출 → Claude Code가 채널에 permission_request 알림
→ 채널 → 게이트웨이 → 방에 system 메시지("Bash 승인 요청: … / yes|no <ID>")
→ 사용자가 답 → 역경로로 permission_verdict 전달 → Claude Code에 적용
```

## 8. 에러 처리

| 상황 | 동작 |
|---|---|
| 채널/세션 죽음 | WebSocket 끊김 → 봇 오프라인 표시 + 방에 system 메시지. 메시지는 DB에 계속 쌓임. 재접속 시 `missed_after_id` 이후 재전송 |
| 서버 재시작 | SQLite 덕에 대화·파일·토큰 보존. 채널들은 끊김 후 자동 재접속(지수 백오프) |
| 봇 응답 없음 | 채널의 `status: working` 보고로 UI에 "입력 중…" 표시. 타임아웃(설정값) 후 "응답 없음" 안내 |
| 중복 전달 | 방별 증가 커서 `id`로 재접속 시 중복 없이 이어받기 |
| 알 수 없는 봇 멘션 | 서버가 거부하고 안내(자동완성으로 정형 입력 유도) |
| 파일 무결성 | 업로드는 임시 저장 후 원자적 이동. 봇 발신 경로가 없으면 해당 첨부만 건너뛰고 안내 |

## 9. 보안

- **사람 단위 인증 원칙**: 웹은 계정 로그인, 봇 게이트웨이는 (방, 봇) 조합 토큰. 방 ID가 아니라 토큰으로 식별한다.
- 토큰은 해시 저장, 철회 가능.
- 채널 instructions로 "게이트웨이에서 온 메시지만 신뢰"를 고정 — 세션이 외부 주입에 열린 표면 최소화.
- HTTP 평문의 위험(공용망 도청)을 인지하고 감수한다. HTTPS(자체 서명) 업그레이드 경로를 남긴다.
- 권한 릴레이는 게이트웨이 토큰 인증 위에서만 동작하므로 안전하게 켠다.

## 10. 테스트 전략

- **게이트웨이 프로토콜 테스트**: 가짜 채널 클라이언트로 토큰 인증, 재접속, 놓친 메시지 재전송, 멘션 라우팅 검증(실 Claude 없음).
- **채널 플러그인 테스트**: 가짜 게이트웨이 서버로 MCP 알림→WebSocket 전송, reply→업로드, fetch_history 흐름 검증.
- **E2E**: fakechat 참고 구현과 실 Claude 세션 1개로 방 하나에서 송수신 1사이클 확인(API 비용 최소화).
- **영속성 테스트**: 서버 재시작 후 대화·파일·토큰 복원 확인.

## 11. 리스크와 제약

| 리스크 | 내용 | 대응 |
|---|---|---|
| research preview | Channels는 연구 단계 기능. `--channels` 문법과 프로토콜 계약이 바뀔 수 있다 | 채널 계약 구현을 채널 플러그인 하나에 국한해, 변경 시 서버는 손대지 않고 플러그인만 고치면 되게 한다 |
| 개발 플래그 | 커스텀 채널은 허용 목록에 없어 `--dangerously-load-development-channels`로 실행해야 한다 | 세션 실행 명령 안내에 플래그를 포함하고, 이 플래그는 허용 목록 우회일 뿐 보안을 약화하지 않음을 문서화 |
| 세션 상시 실행 필요 | "Events only arrive while the session is open" — 세션이 꺼져 있으면 봇 오프라인 | 상시 실행은 사용자 관리(페르소나 디렉터리 설계와 함께 확정). 서버는 오프라인을 정상 상태로 다룬다 |
| HTTP 평문 | 공용망에서 도청 가능 | 수용. 필요 시 자체 서명 HTTPS로 업그레이드 |
| Claude 인증 제약 | Channels는 Bedrock/Vertex 등에서 불가. Team/Enterprise는 관리자 활성화 필요 | 개인 계정(claude.ai 또는 Console) 사용이 전제 |

## 12. 범위 밖 (이후 별도 설계)

- **페르소나 디렉터리 구조**: 각 봇의 CLAUDE.md·`.claude/` 구성, 공유 레포(github/로컬) 운영 방식.
- **봇 간 세션 통신**: PM봇이 다른 봇에게 지시하는 session 간 통신. 현재는 이 서버의 @TO/@CC 규칙으로 대체.
- **스트리밍 응답**: 완성 답변 후 추가 확장 여지만 남긴다.
- **방 종료 시 핸드오프 요약 이월**: 산출물 연속성을 공유 레포가 담당하므로 v1에서 제외.
- **HTTPS, 도메인, 모바일 최적화 UI**.

## 13. 참고 자료

- `user-context/docs/01-research.md` — 채널 제약, 세션 계속성, 토큰 계산 등 사전 조사
- `user-context/docs/02-eli5-architecture.md` — 이전 브리지 프로젝트(cc-bot-handoff) 설계 해설
- `user-context/docs/03-runbook.md` — 이전 프로젝트 운영 매뉴얼
- 공식 문서: Claude Code Channels(`code.claude.com/docs/en/channels`), Channels reference(`code.claude.com/docs/en/channels-reference`)
- 참고 구현: fakechat(`anthropics/claude-plugins-official/external_plugins/fakechat`)
