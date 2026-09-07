# minidiscord v2 전환 판정 보고서

- 검토 기준 커밋: `1da609c` (main, 2026-09-07)
- 검토 방식: 읽기 전용. server/src 13개·channel/src 4개·web 6개 파일은 전문을 직접 읽었고, `.moai/specs` 28개 SPEC 과 테스트 26개 파일은 조사원 둘이 전문을 읽어 파일:줄 근거와 함께 돌려준 것을 표본 재확인했다. 코드는 한 줄도 고치지 않았다.
- 판정 전제: 사용자가 준 운영 환경(사내망 한 대의 PC, 회사 인증을 거친 사람 몇 명, 봇 다섯, 첨부는 같은 PC 의 폴더 경로)과 v2 모델 세 문장을 그대로 전제로 삼았다. 남길 보안은 (a) 첨부 허용 뿌리 검사, (b) 봇 문맥 보호(봉투 무력화·잘림 예산) 둘뿐이라는 조건도 그대로 적용했다.

## 쉬운 말 요약

1. **새로 쓰는 양**: 소스 3,662줄 가운데 5개 파일 979줄(게이트웨이 374·게이트웨이 클라이언트 274·DB 123·봇 라우트 114·사람 인증 94)을 새로 쓰면 되고, 새로 쓴 뒤 크기는 절반 이하(약 470줄)로 줄어든다. 705줄은 손대지 않고, 1,956줄은 군데군데 조금 고치며, 22줄(방 구성원 술어)은 지운다.
2. **걷어내는 양**: 핸드셰이크(Ed25519 서명·HMAC 증명·봉투 MAC·순번), 방별 토큰 발급·철회·재초대, 비밀번호 가입·로그인, 전송 스킴 검사·채널 바인딩(TLS)을 전부 뺄 수 있다. 빼도 사용자 전제 아래서 깨지는 기능은 없다. HTTPS 와 CORS 는 애초에 코드에 없어서 뺄 것이 없다.
3. **살아남는 것**: SPEC 28개 중 18개가 v2 에서도 살아 있고(그중 11개는 조항 몇 개를 고쳐야 한다), 6개는 모델 변경으로, 4개는 인증 삭제로 죽는다. 죽은 10개는 `_archive/` 로 옮긴다. 테스트 10,958줄 중 6,128줄은 그대로 또는 조금 고쳐 남고, 2,532줄은 새로 쓰며, 2,298줄은 버린다.
4. **가장 큰 위험 셋**: 봇의 권한 요청 프레임에 방 번호가 없어서 v2 에서는 채널이 «어느 방에 띄울지» 를 정해야 한다는 것, `chat_id` 를 방 번호로 바꾸면 지시문 한 문장(`channel-server.ts:30`)이 봇에게 방 번호를 이력 커서로 넘기라고 가르치게 된다는 것, 봇 글의 멘션을 전달하기 시작하면 봇끼리 무한히 부를 수 있다는 것이다.
5. **작업 순서**: 삭제를 통째로 먼저 하는 것은 이득이 절반뿐이다. 게이트웨이와 클라이언트는 어차피 새로 쓰므로 그 안의 핸드셰이크 삭제는 모델 변경(SPEC-A)에 합치고, 게이트웨이 밖의 삭제(사람 인증·방 구성원·전송 검사)만 먼저 떼어 SPEC-C1 로 하면 된다. 순서는 C1 → A → B → C2(SPEC·테스트 정리).

## 0. 「지금 알고 있는 것」 대조 — 정정

| 항목 | 판정 | 근거 |
|---|---|---|
| 크기 1,316 / 740 / 10,958 / SPEC 30 / web 있음 | 줄 수는 전부 일치. **SPEC 은 30개가 아니라 28개**다 | `ls .moai/specs \| wc -l` = 30 = 디렉터리 28 + `_archive/`(GWAUTH-001 보관본) + 안내 파일 `SPEC-GWAUTH-001.md`. web 은 1,606줄(app.js 698·style.css 490·rich.js 212·index.html 107·design-tokens.css 59·rich.d.ts 40) |
| 토큰이 (방, 봇) 쌍에 묶임 | 맞다 | `server/src/db.ts:31-41`, 초대 `routes-bots.ts:75-92` |
| 접속 시 verifier_pub 으로 (방, 봇) 확정 `gateway.ts:162-218` | 맞다. 조회는 `:162-170`, 등록은 auth 서명 통과 뒤 `:209-219` | `gateway.ts:155-188`(hello)·`:191-232`(auth) |
| 배달 프레임에 방 id 없음 `:337-349` | 맞다 | `gateway.ts:343-346` 의 payload 에 `room_id` 없음. 재전송 프레임 `:241-246` 도 없음 |
| MCP 알림 meta 에 방 없음 `channel-server.ts:188-199` | 맞다. `chat_id` 는 메시지 id 문자열 | `channel-server.ts:194` `chat_id: String(msg.id)` |
| reply {text, files} `:129-140`, welcome 을 wire() 가 버림 | 맞다. `wire()` 는 `onWelcome` 을 넘기지 않아 `gateway-client.ts:197` 의 호출이 빈손 | `channel/src/index.ts:47-63` |
| 멘션 파싱은 사람 HTTP 경로에만 | 맞다 | `routes-messages.ts:79-89`, `gateway.ts:278-312` 에 `parseMentions` 호출 없음 |
| 재접속 커서 · 첨부 뿌리 · 권한 응답 | 맞다 | `gateway.ts:223-231`, `:285-294`, `routes-messages.ts:66-68` → `permissions.ts:89-118` |
| 사람 인증 내용 미확인 | 읽었다. scrypt 비밀번호 해시·`sessions` 표·`md_session` 쿠키(HttpOnly·Lax) | `auth.ts:13-25`, `:57-74`, `:86-94` |
| HTTPS·CORS·원격 접속 설정 | **서버에는 둘 다 없다.** 네트워크 경계를 전제한 코드는 세 곳뿐 | 채널 전송 판정 `channel/src/index.ts:21-40`·거부 사유 `:130-147`, 채널 바인딩 `gateway.ts:55-70`·`gateway-client.ts:71-80`, 루프백 기본 바인드 `config.ts:7` |
| `chat_id` 가 web/ 에 미치는 범위 | **0줄.** `grep -rln chat_id web` 결과 없음 | 등장 자리는 `channel/src/channel-server.ts`(24·30·176·194행)와 테스트 2개 파일 13줄뿐 |

## 1. 모듈 목록과 처분

처분 뜻: **그대로** = 한 줄도 안 바꿈 · **조금 고침** = 파일의 1/3 미만 · **새로 씀** = 파일을 대체 · **삭제**.

### server/src (1,316줄)

| 파일 | 줄 | 하는 일 | 처분 | 이유 |
|---|---|---|---|---|
| gateway.ts | 374 | 봇 WebSocket 창구: 핸드셰이크, 봉투, 배달, 재전송, 이력, 권한 요청 중계 | **새로 씀** | 접속 상태가 `{roomId, botId}` 한 쌍이고(`:21`, `:38`) 모든 분기가 `info.roomId` 를 읽는다(`:139`, `:280`, `:317`, `:340`). 핸드셰이크·봉투 약 150줄(`:35-83`, `:153-232`, `:262-275`)은 §2 로 사라진다. 남길 것은 첨부 뿌리 검사 `:285-294`, 없는 파일 건너뛰기 `:303-305`, 커서 재전송 `:223-231`, `sendToOrigin` `:368-371` 의 의미다 |
| db.ts | 123 | 스키마 10표·v1 스키마 거절·`created_by`·`room_members` 백필 | **새로 씀** | `bot_tokens` 가 방 단위(`:31-41`)라 표 자체가 바뀌고, `users.password_hash`(`:10`)·`room_members`(`:64-69`)·`schema_migrations`(`:70-73`)·백필(`:106-120`)·v1 거절(`:93-96`)이 §2·§3 로 사라진다. 새 표는 `bots.token` 과 `room_bots(room_id, bot_id, last_delivered_id)` |
| routes-bots.ts | 114 | 봇 등록·목록, 방별 초대(토큰 발급·철회·목록) | **새로 씀** | 초대 = 토큰 발급(`:75-92`)이 v2 문장 2 와 정면 충돌. `sha256Hex`(`:16`, 호출자 0 — 주석 `:9` 자백)·`deriveBotKeys`(`:26-35`)·`inviteCommand`(`:38-48`) 가 사라지고, 토큰은 봇 등록(`:57-67`)에서 한 번 낸다. 초대 세 라우트는 참여 추가·목록·제거로 바뀐다 |
| auth.ts | 94 | 가입·로그인·로그아웃·`requireAuth` | **새로 씀** | 비밀번호 해시(`:13-25`)·가입 검증(`:36-55`)·401 열거 방지(`:66-69`) 가 전제 위에서 근거를 잃는다. `requireAuth`(`:86-94`) 의 «쿠키 → `req.user`» 계약만 남기면 약 30줄 |
| routes-messages.ts | 187 | 사람 메시지 저장·첨부·멘션 매핑·팬아웃·목록·다운로드 | **조금 고침** | 봇 매핑 SQL `:80-83` 이 `bot_tokens` 를 본다 → `room_bots` 로. `requireRoomMember`(`:32`, `:128`) 제거. 멘션 → 타깃 변환(`:77-89`)은 봇 경로(SPEC-B)도 써야 하므로 함수로 뽑아 공유한다 |
| permissions.ts | 120 | 승인 요청을 system 메시지로, yes/no 답을 판정으로 | **조금 고침** | `ConnInfo.roomId` 가 접속이 아니라 프레임에서 온다(`onGatewayRequest` `:62`, `gateway.ts:147`). `isRoomMember` 백스톱(`:96`) 제거. 합성키·문구·`sendToOrigin` 경로(`:52`, `:78-85`, `:107-115`)는 그대로 |
| routes-rooms.ts | 92 | 방 생성·목록·구성원 추가·보관 | **조금 고침** | 보관의 토큰 철회(`:81`) 제거, `created_by`(`:36`) 제거, 구성원 라우트(`:48-66`)와 목록의 구성원 필터(`:19`) 제거. 보관 → `closeRoom` 훅(`:89`)은 그대로 |
| index.ts | 83 | 서버 조립 순서 | **조금 고침** | 등록 순서 계약(`:33-34`)은 그대로. `registerAuthRoutes` 가 최소형으로 바뀌고 `botFilesDir` 경고(`:80-82`)는 그대로 |
| sse.ts | 58 | 방별 SSE 허브 | **그대로** | 방 id 로만 동작(`:7-9`). v2 에서 바뀔 이유 없음 |
| room-members.ts | 22 | 방 구성원 술어·게이트 | **삭제** | §2 항목 6. 호출부 여덟 자리(주석 `:2`)가 사라지면 호출자 0 |
| routes-events.ts | 18 | SSE 구독 라우트 | **조금 고침** | `requireRoomMember`(`:13`) 한 자리만 |
| mention.ts | 16 | `@TO(봇)/@CC(봇)` 파서 | **그대로** | 순수 함수(`:3`, `:10-16`). SPEC-B 가 봇 경로에서 같은 함수를 부른다 |
| config.ts | 15 | 환경변수 6키 | **조금 고침** | 기본 바인드 `127.0.0.1`(`:7`)은 사람들이 다른 PC 에서 붙는 전제와 맞지 않는다. 주석 `:5-6` 의 근거(가입 게이트 없음)는 §2 뒤에도 남지만 전제가 «회사 인증을 거친 사람만» 이므로 기본값을 LAN 바인드로 바꾸거나 README 에 `MINIDISCORD_HOST` 지정을 필수로 적는다 |

### channel/src (740줄)

| 파일 | 줄 | 하는 일 | 처분 | 이유 |
|---|---|---|---|---|
| gateway-client.ts | 274 | 게이트웨이 접속·핸드셰이크·봉투 검증·재접속·이력 요청 | **새로 씀** | 열쇠 유도(`:38-66`), 바인딩(`:71-80`), challenge 대조·서명(`:140-164`), 봉투 mac·seq(`:165-186`), 확립 게이트(`:189-219`) 가 §2 로 사라진다. 남는 것은 접속·백오프·`stop` 가드(`:105-130`, `:233-245`, `:264-273`)·`requestHistory` rid 대조(`:247-262`)로 약 100줄 |
| channel-server.ts | 236 | MCP 채널 서버: 도구 둘·알림·권한 릴레이 | **조금 고침** | `meta.chat_id` 를 방 번호로(`:194`), 메시지 번호는 `meta` 에 별도 키로 유지(`fetch_history` 커서의 출처). `reply`·`fetch_history` 입력 스키마(`:132-139`, `:146-155`)에 `chat_id` 추가. 지시문 `:24`·`:30` 개정(§6 위험 2). `sendPermissionRequest`(`:57`, `:208`)에 방 번호가 실려야 한다(§6 위험 1). 중화(`:42-44`, `:184-186`)·절단·발신 집합은 그대로 |
| index.ts | 148 | 배선 `wire()`·진입점·전송 판정 | **조금 고침** | `isTransportAllowed`(`:21-40`)와 거부 사유 세 갈래(`:130-147`) 삭제. `fetchHistory`(`:82-114`)가 `chat_id` 를 게이트웨이로 넘기고, `onMessage`(`:54-57`)가 «마지막으로 `to` 를 받은 방» 을 기억해 권한 요청에 실어야 한다 |
| truncate.ts | 82 | 절단 원시함수·상한 상수 | **그대로** | 순수 함수. 남길 보안 (b) 의 절반 |

### web (1,606줄)

| 파일 | 줄 | 하는 일 | 처분 | 이유 |
|---|---|---|---|---|
| app.js | 698 | 웹 셸·채팅 화면·리치 배선 | **조금 고침** | 로그인·가입(`:123-165`)이 이름 하나로, 가입 폼 제거. `pickInvite`(`:665-674`)가 토큰 대신 참여 추가 응답을 받고, `createBot`(`:199-207`)이 등록 응답의 명령을 초대 다이얼로그 자리에 보여 준다. `chat_id` 는 0줄이라 무관. 나머지 SSE·자동완성·전송(`:437-630`)은 그대로 |
| style.css | 490 | 스타일 | **그대로** | 화면 구조가 바뀌지 않는다 |
| rich.js | 212 | 첨부 노드·권한 버튼·초대 다이얼로그 조립 | **조금 고침** | `applyInviteResult`·`clearInviteResult`·`copyText`(`:186-212`)는 봇 등록 명령 표시에 그대로 재사용. 권한 정규식(`:53`, `:69`)은 `permissions.ts` 문구가 안 바뀌므로 그대로 |
| index.html | 107 | 마크업 | **조금 고침** | 가입 폼(`:26-33`) 제거·비밀번호 입력(`:22-23`) 제거, 초대 다이얼로그(`:92-102`)의 «토큰은 다시 보여지지 않습니다» 문구를 봇 등록 쪽으로 옮김 |
| design-tokens.css | 59 | 색·간격 토큰 | **그대로** | 무관 |
| rich.d.ts | 40 | rich.js 형 선언 | **조금 고침** | `InviteResult`(`:23`) 가 토큰 대신 참여 결과가 되므로 형 이름·필드만 |

### 합계

| 처분 | 줄 수 | 파일 |
|---|---|---|
| 새로 씀 | **979** | gateway.ts 374 · gateway-client.ts 274 · db.ts 123 · routes-bots.ts 114 · auth.ts 94 |
| 그대로 | **705** | style.css 490 · truncate.ts 82 · design-tokens.css 59 · sse.ts 58 · mention.ts 16 |
| 조금 고침 | 1,956 | 나머지 12개 파일 |
| 삭제 | 22 | room-members.ts |
| 계 | 3,662 | = 1,316 + 740 + 1,606 |

새로 쓴 뒤 크기 추정: gateway ≈ 200 · gateway-client ≈ 100 · db ≈ 70 · routes-bots ≈ 70 · auth ≈ 30, 합계 **약 470줄** (979 → 470). 추정이며 실측이 아니다.

## 2. 걷어낼 인증·보안 장치

각 항목은 «이걸 빼면 무엇이 깨지나» 로 판정했다. 빼도 깨지는 것을 적지 못하면 삭제다. **남기라고 한 둘 — 첨부 허용 뿌리 검사(`gateway.ts:285-294`)·봉투 무력화와 잘림 예산(`channel-server.ts:42-44`, `:184-186`, `truncate.ts`) — 은 아래 어디에도 넣지 않았다.**

한 가지 용어 주의. 이 저장소에는 «봉투» 가 둘 있다. 하나는 채널이 사람 글의 `<channel` 을 `&lt;channel` 로 바꾸는 **문맥 봉투 무력화**(`channel-server.ts:42-44`)이고 — 이것은 남긴다. 다른 하나는 서버가 프레임에 HMAC 과 순번을 씌우는 **전선 봉투** `env{seq, payload, mac}`(`gateway.ts:270-275`, `gateway-client.ts:165-186`)이고 — 이것은 아래 항목 1 로 뺀다.

### 2.1 verifier_pub / server_confirm_key 핸드셰이크 (봇 접속 증명) — 삭제

- 무엇을 막았나: 전선 위 위조 종단과 재생(`gateway.ts:2-4`, `SPEC-GWAUTH-002 spec.md:120,186`). DB 를 읽은 상대가 봇을 사칭하는 것(`routes-bots.ts:69-72`).
- 빼면 깨지는 것: 없다. 사용자 전제에서 전선 위 상대는 사내 PC 한 대 안의 봇 다섯과 사람 몇 명뿐이고, DB 파일은 같은 PC 에 있다.
- 함께 빠지는 것: Ed25519 유도 `routes-bots.ts:26-35`·`gateway-client.ts:44-66`, 전사 `gateway.ts:76-83`, challenge/auth 프레임 `gateway.ts:155-232`·`gateway-client.ts:140-164`, 전선 봉투 `gateway.ts:266-275`·`gateway-client.ts:165-186`, 확립 게이트 `gateway-client.ts:189-219`, `bot_tokens.verifier_pub`·`server_confirm_key`(`db.ts:35-36`), v1 스키마 거절(`db.ts:93-96`), 테스트 하네스 사본 `server/test/gateway-v2.ts`(121줄).
- 겸하는 역할과 최소 형태: hello 가 «누구인지» 를 정하는 역할(`gateway.ts:162-170`)은 남아야 한다. 최소 형태는 `hello{token}` → `bots.token` 조회 → `welcome{bot_id, bot_name, rooms:[…]}` 한 왕복이다. 그 뒤 프레임은 맨몸 JSON.

### 2.2 토큰 발급·철회·재초대 절차 — 삭제(방 단위) → 봇 단위 1회 발급으로 대체

- 무엇을 했나: 초대마다 새 토큰(`routes-bots.ts:86-91`), 재초대는 이전 것 철회(`:87`), 초대 삭제(`:108-113`), 보관 시 그 방 토큰 전부 철회(`routes-rooms.ts:81`), `revoked_at`·`last_seen_at` 열(`db.ts:38-39`).
- 빼면 깨지는 것: 방별 토큰은 v2 문장 1·2 와 정의상 충돌하므로 «빼면» 이 아니라 «바꾼다». 철회 절차를 통째로 빼면 깨지는 것은 «봇 하나를 서버에서 내보내는» 수단뿐이다.
- 최소 형태: `POST /api/bots` 응답에 토큰과 실행 명령을 한 번 싣는다(지금 `inviteCommand` `routes-bots.ts:38-48` 의 문안 재사용). 내보내기가 필요하면 `DELETE /api/bots/:id` 하나. `revoked_at`·`last_seen_at` 은 없앤다 — `last_seen_at` 은 지금도 쓰는 곳이 없다(`gateway.ts:220` 에서 쓰기만, 읽는 곳 0 — `grep -rn last_seen_at server/src` 2건 전부 정의·쓰기).
- 참여(초대)는 `POST /api/rooms/:id/bots {bot_id}` → `room_bots` 삽입(멱등), 제거는 `DELETE`. 보관은 `closeRoom` 만 부른다.

### 2.3 auth.ts 의 사람 인증 — 삭제(비밀번호·가입) → 이름 로그인으로 축소

- 무엇을 했나: scrypt 해시(`auth.ts:13-25`), 가입 검증 8자·32자·제어문자(`:39-48`), 로그인 401 열거 방지(`:66-69`), 세션 토큰 쿠키(`:70-73`), 로그아웃(`:76-81`), `requireAuth`(`:86-94`).
- 빼면 깨지는 것: 비밀번호를 빼도 깨지는 기능은 없다. 그러나 **`req.user` 자체는 빼면 깨진다** — 메시지 작성자(`routes-messages.ts:91-92`, `:114`), 권한 답변자(`permissions.ts:89`), 방 목록(`routes-rooms.ts:21`) 이 `req.user.id` 를 읽는다. 사람의 «이름» 은 문맥 보호 (b) 의 일부이기도 하다(봇 알림의 `sender`, `channel-server.ts:196`).
- 최소 형태: `POST /api/auth/login {username}` 이 `users` 에 이름을 upsert 하고 `sessions` 에 토큰을 넣어 쿠키를 준다. `requireAuth` 는 지금 그대로. `password_hash` 열·`/register`·`hashPassword`·`verifyPassword` 삭제. 이름 상한·제어문자 검사(`:28-32`, `:43-48`)는 표시 안전용이라 남겨도 6줄이다 — 이것은 문맥 보호 (b) 쪽으로 분류한다.
- 웹: `index.html:18-33` 두 폼이 이름 입력 하나로, `app.js:123-165` 두 함수가 하나로.

### 2.4 봇 신원 위조 방지 장치 — 부분 유지

있는 것은 셋이다.
1. 핸드셰이크(2.1) — 삭제.
2. `bots.name UNIQUE`(`db.ts:27`)와 토큰 → 봇 역조회(`gateway.ts:162-170`) — **유지**. 빼면 두 봇이 같은 이름을 갖거나 아무 소켓이나 봇이 되어 v2 문장 1(봇은 신원이다)이 서지 않는다. 이것은 네트워크 보안이 아니라 신원 정의다.
3. 사람 이름과 봇 이름의 이름공간 충돌 — 지금 방어가 **없다**. `users.username` 과 `bots.name` 은 별개 UNIQUE 이고, 봇 알림의 `meta.sender` 는 `author_name` 문자열뿐이라(`channel-server.ts:196`) 봇 이름과 같은 사람 이름이 봇 문맥에서 구별되지 않는다(카드 t38 의 «신원 충돌» 판정, `SPEC-CHANINJECT-001`). 사용자 전제에서 사람이 고의로 그러지는 않겠지만, 이것은 (b) 문맥 보호에 속하므로 v2 에서 `meta` 에 `author_type` 을 싣는 것을 SPEC-A 의 한 줄로 권한다. 삭제 후보가 아니다.

### 2.5 네트워크 경계를 전제로 한 것들 — 삭제

- 코드에 **HTTPS 종단·CORS 플러그인·원격 허용 목록은 없다**(`server/src` 전체 grep: `cors`·`https`·`tls` 는 `gateway.ts:7` 의 TLS import 뿐). 뺄 것은 아래 셋이다.
- 전송 스킴 판정 `isTransportAllowed`(`channel/src/index.ts:21-40`)와 거부 사유(`:130-147`): 루프백 밖은 `wss://` 만 허용. 빼면 깨지는 것: 없다. 오히려 사내 LAN 주소 `ws://192.168.x.x:3000/bot` 은 지금 **거부된다**(`:39`). v2 전제에서는 이 검사가 있으면 봇이 못 붙는다.
- 채널 바인딩 `channelBinding`(`gateway.ts:55-70`, `gateway-client.ts:71-80`)과 TLS import: 서버가 TLS 를 종단하지 않아 지금도 항상 `'unbound'`(`gateway.ts:53-54` 주석, README 첫 문단). 빼면 깨지는 것: 없다. 이미 아무것도 하지 않는다.
- 루프백 기본 바인드 `config.ts:7`: 사람이 다른 PC 에서 붙으려면 바뀌어야 한다. 환경변수는 이미 있으므로 기본값 한 줄 또는 README 한 줄이다.
- 쿠키 속성 `httpOnly·sameSite:'lax'`(`auth.ts:72`)와 `credentials:'same-origin'`(`app.js:30`): 네트워크 보안이 아니라 브라우저 기본 위생이고 비용이 0 이라 그대로 둔다.
- 테스트 자산 `server/test/fixtures/tls-test-*.pem` 과 `channel/test/gateway-mutual-auth.test.ts` 의 TLS 중계 시험(`:308-414`)은 함께 버린다.

### 2.6 (추가) 방 구성원 인가 SPEC-ROOMAUTHZ-001 — 삭제 권고, 단 운영자 결정

사용자 목록에 없지만 인증·보안 장치의 가장 큰 덩어리라 판정에 넣는다.

- 무엇을 했나: 방마다 구성원 명단(`db.ts:64-69`), 비멤버에게 없는 방과 같은 404(`room-members.ts:16-22`), 라우트 일곱 자리 게이트, 방 목록 필터(`routes-rooms.ts:19`), 브로커 백스톱(`permissions.ts:96`), 백필 이행(`db.ts:106-120`), `created_by`(`db.ts:101-104`).
- 빼면 깨지는 것: 기능은 없다. 바뀌는 것은 «모든 사람이 모든 방을 본다» 는 사용 경험이다. 사용자 전제(«들어오는 사람은 이미 회사 인증을 거친 사람뿐», «아는 사람 몇 명»)는 사람 사이의 방 단위 칸막이를 요구하지 않는다.
- 규칙대로면 «빼면 X 가 깨진다» 를 못 쓰므로 삭제다. 다만 이것은 보안이 아니라 제품 결정(비공개 방을 둘 것인가)이므로, 삭제 SPEC(C1) 착수 전에 운영자 확인 한 번을 권한다. 남기기로 하면 22줄 파일과 호출부 여덟 자리는 v2 에서 그대로 살고, 테스트 `room-members.test.ts` 718줄은 «조금 고침» 으로 옮겨진다.

### 삭제 뒤 남는 최소 형태 (문장 셋)

1. 봇은 등록 때 받은 토큰 하나를 `hello{token}` 에 대면 들어오고, 서버는 그 봇이 든 방 목록을 welcome 에 실어 준다.
2. 사람은 이름 하나를 대면 쿠키를 받고, 그 이름으로 글을 쓰고 승인에 답한다.
3. 서버가 지키는 것은 봇 첨부의 허용 뿌리, 사람 글의 봉투 무력화와 잘림 예산, 그리고 봇·사람 이름의 유일성뿐이다.

## 3. 살아 있지 않은 기능

v2 모델과 운영 환경에서 쓰이지 않을 코드. §2 에서 이미 다룬 큰 덩어리(핸드셰이크·방별 토큰·비밀번호·전송 검사·구성원 인가)는 반복하지 않는다.

| 기능 | 자리 | 빼면 무엇이 깨지나 | 처분 |
|---|---|---|---|
| `sha256Hex` v1 토큰 해시 | `routes-bots.ts:16-18` | 없음. 호출자 0 (주석 `:9` 가 자백) | 삭제 |
| `last_seen_at` 열 | `db.ts:38`, `gateway.ts:220` | 없음. 읽는 곳 0 | 삭제 |
| `revoked_at` 열과 `IS NULL` 조건 6곳 | `db.ts:39`, `routes-bots.ts:87,100,111`, `routes-rooms.ts:81`, `routes-messages.ts:82`, `gateway.ts:165` | 없음. 봇 단위 토큰에서는 «철회» 가 행 삭제다 | 삭제 |
| `missed_after_id` 와 `onWelcome` 콜백 | `gateway.ts:222`, `gateway-client.ts:15,197` | 없음. `wire()` 가 `onWelcome` 을 넘기지 않아 지금도 버려진다(`channel/src/index.ts:47-63`) | v2 에서 welcome 은 방 목록을 실어야 하므로 **재설계**(삭제 아님). `missed_after_id` 는 방마다 달라지므로 단일 값은 삭제 |
| 접속 상태 `status{working\|idle}` 프레임의 방 부재 | `gateway.ts:136-142`, `channel/src/index.ts:55,69` | v2 에서 봇이 여러 방에 있으면 어느 방 칩을 켤지 모른다 | 프레임에 `room_id` 추가(SPEC-A) |
| v1 스키마 거절 검사 | `db.ts:88-96` | 없음. v2 는 새 DB 파일이다 | 삭제(대신 v2 표 존재 검사 한 줄) |
| `schema_migrations` 표·백필 | `db.ts:70-73`, `:79`, `:106-120` | 없음(구성원 인가 삭제 시) | 삭제 |
| `rooms.created_by` | `db.ts:101-104`, `routes-rooms.ts:36` | 없음. 권한이 아니라 기록(`room-members.ts:8` 주석) | 삭제 |
| `POST /api/rooms/:id/members` | `routes-rooms.ts:48-66` | 없음(구성원 인가 삭제 시) | 삭제 |
| `GET /api/rooms/:id/invites` 의 `online` | `routes-bots.ts:96-104` | 웹 봇 칩(`app.js:414-426`)이 깨진다 | 유지하되 `room_bots` 기반으로 «참여 목록» 라우트가 됨 |
| `Gateway.isOnline(roomId, botId)` | `gateway.ts:355-358` | 위 칩 | 유지, 시그니처는 `isOnline(botId)` 로 단순화 가능(봇 접속은 방과 무관) |
| `Gateway.sendToBot(roomId, botId)` | `gateway.ts:361-365` | 없음. `permissions.ts:102` 주석대로 판정 경로는 `sendToOrigin` 만 쓴다. 호출자는 테스트뿐 | 삭제 — `grep -rn "sendToBot(" server/src` 실행 결과 정의 2줄(`gateway.ts:29`, `:361`)뿐, 소스 호출자 0. 테스트 3개 파일만 부른다 |
| `onConnection` 관측 옵션 | `gateway.ts:89-91`, `:107` | 시험 하네스 `recordSocket` 만(`SPEC-GWAUTH-002 acceptance`) | 삭제(GWAUTH-002 와 함께) |
| `SseHub.subscriberCount` | `sse.ts:53-56` | 시험만(`sse.test.ts`) | 유지(4줄, 누수 시험에 유용) |
| 지시문 «커서로는 chat_id 를 쓰세요» | `channel-server.ts:30` | 지금도 `:145` 의 «cursor 필드를 넘긴다» 와 **모순**. v2 에서 `chat_id` 가 방 번호가 되면 해로운 문장 | 삭제·재작성(§6 위험 2) |
| 초대 명령의 `ws://127.0.0.1:${port}` | `routes-bots.ts:45` | 사내 다른 PC 의 봇은 이 주소로 못 붙는다. 다만 전제는 «봇은 서버 PC 에서 실행»(ROADMAP 한 줄 요약) | 봇 등록 명령으로 옮기고 주소는 `config.host` 를 반영 |
| `scripts/live-env.sh` 의 `invite`·`token-sweep` | 696줄, `SPEC-LIVEENV-001`(in-progress) | 없음 — 방별 초대 토큰 절차(`spec.md:53,392-393`) 위에 서 있어 v2 에서 성립하지 않는다 | SPEC 과 함께 보관(§4) |
| `scripts/e2e.mts` ④·⑮ 단계, `REQ-E2E-002` v2 4프레임 | `SPEC-E2E-001 spec.md:65,70` | 러너가 핸드셰이크 사본(`server/test/gateway-v2.ts` import, `e2e.mts:3-5`)을 쓴다 | C2 에서 v2 프레임으로 재작성 |

## 4. SPEC 28개 정리

상태 뜻: **살아 있음** = v2 에서 그대로 유효 · **살아 있음(개정)** = 조항 몇 개만 고침 · **모델 변경으로 죽음** · **§2·§3 삭제로 죽음** · **흡수됨**. 통째 흡수는 이미 보관된 GWAUTH-001 → GWAUTH-002 한 건뿐이고, 나머지는 조항 단위 이관이라 «흡수됨» 으로 표시한 SPEC 은 없다.

| SPEC | 무엇을 만들었나 | v2 상태 | 근거·개정 조항 |
|---|---|---|---|
| CORE-001 | config·openDb 8표·buildServer·/api/health | 살아 있음(개정) | AC-CORE-005 표 목록(`acceptance.md:61`)이 `bot_tokens`·`sessions` 를 요구 → v2 표로 개정. AC-CORE-015 루프백 기본(`:34`) 재검토 |
| AUTH-001 | 가입·로그인·세션 쿠키 | **§2 삭제로 죽음** | 본체가 비밀번호(`spec.md:103`, `acceptance.md:132`). 이름 로그인은 C1 의 새 조항 |
| ROOM-001 | 방 생성·목록·보관, 봇 등록·목록 | 살아 있음(개정) | AC-ROOM-003 «보관 = 방 갱신 + 토큰 철회 한 트랜잭션»(`acceptance.md:26`) → 토큰 철회 삭제 |
| BOT-001 | 방별 초대·토큰·철회 | **모델 변경으로 죽음** | «(방, 봇) 조합 하나에 대한 자격증명»(`spec.md:61`)이 v2 문장 1 과 충돌 |
| MENTION-001 | `parseMentions` | 살아 있음 | 의존 0 (`spec.md:42,62`) |
| SSE-001 | SSE 허브·이벤트 라우트 | 살아 있음 | `requireAuth` 만 전제(`spec.md:74`), 쿠키는 남는다 |
| GATEWAY-001 | WebSocket 게이트웨이·프레임 8종 | **모델 변경으로 죽음** | 토큰이 (방, 봇) 을 결정(`acceptance.md:218`), 프레임에 방 없음. 불변식은 아래 «지켜야 할 것» 으로 이관 |
| MSG-001 | 메시지 라우트·첨부·팬아웃 | 살아 있음(개정) | «초대된 봇 = `bot_tokens` 활성 행»(`spec.md:62`) → `room_bots`. 나머지 봉인·팬아웃 1회는 그대로 |
| PERM-001 | 권한 릴레이 브로커 | 살아 있음(개정) | `ConnInfo={roomId,botId}`(`spec.md:81`)의 roomId 출처가 프레임으로 |
| CHANNEL-001 | MCP 채널 서버·도구 둘·알림 | 살아 있음(개정) | AC-CHANNEL-013 `chat_id = String(msg.id)`(`acceptance.md:486`, `spec.md:64,192`) → 방 번호로 개정, 메시지 번호는 별도 meta 키 |
| CHANCLIENT-001 | 게이트웨이 클라이언트 | **모델 변경으로 죽음** | 첫 프레임 키 `{type,pub,client_nonce}`(`acceptance.md:234`), 토큰이 방 하나에 결속(`spec.md:65`). 백오프·rid·stop 불변식은 이관 |
| CHANPERM-001 | 권한 요청·판정 릴레이 | 살아 있음(개정) | «params 에 type 만 붙인다»(`spec.md:149-155`) → 방 번호도 붙인다 |
| CHANWIRE-001 | `wire()` 배선 | 살아 있음(개정) | `meta.chat_id` 가 `id` 를 담는다(`spec.md:145`) → 개정. `fetchHistory` 에 방 번호 |
| WEBSHELL-001 | 웹 셸·정적 서빙 | 살아 있음(개정) | 로그인·가입 화면(`spec.md:79-81`) → 이름 하나 |
| WEBCHAT-001 | 채팅 화면 | 살아 있음 | 의존 0 (`spec.md:90,290`) |
| WEBRICH-001 | 첨부·초대 다이얼로그·승인 버튼 | 살아 있음(개정) | 초대 → `{token,command}`(`spec.md:72`) → 참여 추가. 명령 표시는 봇 등록으로 이동. 승인 버튼·첨부 조항 그대로 |
| E2E-001 | 15단계 러너·재시작 영속성 | **모델 변경으로 죽음** | ④ 초대 토큰·같은 토큰 재접속(`spec.md:70`), REQ-E2E-002 v2 4프레임 필수(`spec.md:65`). C2 에서 v2 러너로 재작성 |
| CI-001 | GitHub Actions | 살아 있음 | 의존 0 |
| LIVEVERIFY-001 | t32 실세션 관측 기록 | **모델 변경으로 죽음(기록)** | 관측 자체가 방별 토큰·보관 철회 위(`spec.md:78`). 증거는 보관, v2 는 재관측 |
| CHANAUTH-001 | 전송 검사·welcome 게이트·발신 집합 | **§2 삭제로 죽음** | 12행 판정표(`acceptance.md:207`)·TLS 가 유일한 서버 인증(`spec.md:57,73`). 발신 `request_id` 집합(REQ-007/008)만 CHANPERM 불변식으로 남긴다 |
| CHANINJECT-001 | 봉투 중화·구조화 이력·지시문 | 살아 있음(개정) | REQ-CHANINJECT-013 스킴 강제(`spec.md:406,412`) 삭제, `chat_id` 를 커서로 쓴다는 문장(`spec.md:125,361`) 개정. 나머지는 남길 보안 (b) 의 정본 |
| GWAUTH-002 | 상호 인증 v2 | **§2 삭제로 죽음** | 전부 핸드셰이크·봉투(`spec.md:120,186,412`) |
| ROOMAUTHZ-001 | 방 구성원 인가 | **§2 삭제로 죽음**(운영자 확인 조건) | §2.6 |
| BOTSTAB-001 | 재접속 가드·바이트 상한·truncate.ts | 살아 있음 | 의존 0 (`acceptance.md:136` 은 meta 무변형만) |
| PERMROUTE-001 | `connId`·`sendToOrigin` | 살아 있음 | 봇 하나가 접속 여럿일 수 있다는 근거(`spec.md:36`)는 v2 에서도 성립 |
| WSUPGRADE-001 | 404 관측 하네스·판정표 | 살아 있음 | `server/src` 무변경 조항(`acceptance.md:88`), 순수 분류 |
| GATECHECKS-001 | `pretest` 타입 검사 | 살아 있음 | 의존 0 |
| LIVEENV-001 | 라이브 환경 스크립트·추출기 | **모델 변경으로 죽음**(in-progress 인 채) | 재초대·`bot_tokens` 소재(`spec.md:53,392-393`). 7회차 FAIL 0.742 상태 그대로 보관 |

집계: 살아 있음 18(그대로 7 · 개정 11) / 모델 변경으로 죽음 6 / §2 삭제로 죽음 4. 계 28.

### 살아 있는 SPEC 이 지키는 불변식 — v2 설계 문서 «지켜야 할 것»

테스트로 굳어 있고 v2 에서도 그대로 참이어야 하는 규칙. 출처는 살아 있는 SPEC 과, 죽지만 규칙만 이관하는 SPEC(GATEWAY·CHANCLIENT·CHANAUTH) 이다.

1. 사람 글의 팬아웃은 SSE 발행과 게이트웨이 배달 각 정확히 1회, 같은 메시지 id 로 (MSG AC-009, `routes-messages.ts:118-119`).
2. 첨부 쓰기 봉인(파일명의 경로 성분 제거)과 읽기 봉인(업로드 폴더 밖이면 404)은 서로의 백스톱이다 (MSG AC-007/008, `routes-messages.ts:53`, `:158-160`).
3. 봇 첨부는 허용 뿌리 안의 realpath 만 복사하고, 없는 파일은 그 첨부만 건너뛴다 (GATEWAY REQ-011·sync-audit F-01, `gateway.ts:285-305`). 응답·SSE 프레임에 `stored_path` 를 싣지 않는다 (F-02, `gateway.ts:308-310`).
4. 재접속 재전송은 «그 봇이 타깃인 메시지 중 커서 이후» 를 id 오름차순으로, 커서는 배달한 접속의 것만 올린다 (GATEWAY AC-003·REQ-007/008, `gateway.ts:223-231`, `:347`). v2 에서는 «방마다» 가 붙는다.
5. 이력 응답은 요청한 봇의 접속에만 간다 (GATEWAY REQ-017, `gateway.ts:331-333`).
6. 온라인 판정은 접속의 존재이지 마지막 status 값이 아니다 (GATEWAY REQ-013, `gateway.ts:355-358`).
7. 권한 판정은 요청한 접속 하나(`connId`)로만 되돌아가고, 못 찾으면 대체 발신하지 않으며 두 실패 문구는 꼬리 «전달하지 못했습니다 (<id>)» 를 유지한다 (PERMROUTE AC-005·REQ-007, `permissions.ts:102-115`; `web/rich.js:69` 가 결합).
8. 대기 항목 키는 `방:소문자id` 합성키라 다른 방의 답은 조회 자체가 놓친다 (PERM REQ-006·011, `permissions.ts:52`).
9. system 메시지 네 줄에서 접두 없는 줄은 서버가 쓴 줄뿐이고, 봇 텍스트의 줄바꿈과 `│` 는 중화된다 (PERM T7-F-01/09, `permissions.ts:21-30`, `:78-85`).
10. 사람 유래 조각(본문·이름·첨부 경로)의 `<channel` 은 `&lt;channel` 로, `meta` 는 무변형 (CHANINJECT AC-001, `channel-server.ts:42-44`, `:175-186`).
11. 절단은 중화 뒤, 시길 탈출은 절단 앞, «남은 본문 + 표시 ≤ 예산», 코드포인트 경계 (BOTSTAB, `truncate.ts:40-65`, `channel-server.ts:179-185`).
12. 이력은 `{cursor, messages}` JSON 한 건, cursor 는 실린 원소 id 의 최댓값, 넘치면 새것부터 버린다 (CHANINJECT AC-004/005·BOTSTAB AC-008, `channel/src/index.ts:87-113`).
13. `delivery="to"` 알림에는 답변 유발 접미가 붙고 `cc` 에는 붙지 않는다; `to` 이면 세션에 넘기기 전에 `working` 을 보내고 `reply` 뒤에 `idle` 이 나간다 (CHANNEL·CHANWIRE AC-005, `channel-server.ts:188`, `channel/src/index.ts:55-56`, `:68-69`).
14. 판정 릴레이는 자기가 내보낸 `request_id` 에만, 정확히 1회 (CHANPERM AC-008·CHANAUTH REQ-007, `channel-server.ts:222-224`).
15. 재접속 백오프는 1초에서 배증·상한 30초·open 시 복귀, `stop()` 뒤에는 새 소켓을 열지 않는다 (CHANCLIENT AC-012/013·BOTSTAB AC-001, `gateway-client.ts:92`, `:240-245`).
16. 서버 조립 순서: 게이트웨이는 허브 뒤, multipart 는 메시지 라우트 앞, 정적 서빙은 맨 끝 (CORE/MSG/WEBSHELL, `index.ts:33-34`).
17. 웹은 사용자·봇·시스템 문자열을 전부 `textContent` 로만 넣고, 판정 버튼은 첫 클릭에서 잠기며 이미 끝난 요청은 버튼 없이 그린다 (WEBCHAT REQ-004·WEBRICH REQ-009/010, `app.js:376-389`, `rich.js:139-156`).

### `_archive/` 로 옮길 목록 (지우지 않는다)

`SPEC-AUTH-001`, `SPEC-BOT-001`, `SPEC-GATEWAY-001`, `SPEC-CHANCLIENT-001`, `SPEC-CHANAUTH-001`, `SPEC-GWAUTH-002`, `SPEC-ROOMAUTHZ-001`(운영자 확인 뒤), `SPEC-E2E-001`, `SPEC-LIVEVERIFY-001`, `SPEC-LIVEENV-001` — 10개. 각각 GWAUTH-001 방식대로 원 자리에 «대체됨 → …» 안내 파일 한 줄을 남긴다(`.moai/specs/SPEC-GWAUTH-001.md` 선례). 개정 대상 11개는 옮기지 않고 HISTORY 에 v2 개정을 적는다.

## 5. 테스트 처분

처분 뜻: **그대로** = 손대지 않아도 통과할 것 · **고침** = 하네스·fixture 나 단언 몇 자리만 · **다시 씀** = 파일 절반 이상 · **버림**. «통과할 것» 은 읽기 기반 판단이며 실행하지 않았다.

| 파일 | 줄 | 시험하는 모듈 | 처분 | 근거 |
|---|---|---|---|---|
| server/test/gateway.test.ts | 1,667 | gateway.ts | **다시 씀** | 하네스 `wsConnect`·`invite()` 가 v2 핸드셰이크·`bot_tokens`(`:157-164`, `:267-315`); GWAUTH2 절 `:1245-1362`·`:1366-1604` 약 360줄은 버림. 첨부 뿌리(`:625-782`)·이력(`:831-968`)·권한 경로(`:997-1196`)·절대 경로(`:1620-1666`)는 프레임에 `room_id` 만 더해 남긴다 |
| channel/test/transport-auth.test.ts | 929 | index.ts·gateway-client.ts | **버림** | 30건 중 (b) 직접 18·(d) 4·게이트 정의 6. 독립 6건(fs import 부재 `:532`, stdout 침묵 `:917`)만 새 파일로 옮긴다 |
| server/test/room-members.test.ts | 718 | room-members.ts 외 | **버림** | 전부 구성원 인가(§2.6). 남기기로 하면 «고침»(하네스 `signUp` `:41-55` 와 `seedBot` `:155-162`) |
| server/test/web-chat.test.ts | 717 | web/app.js·mention.ts | **그대로** | 인증·토큰·chat_id 의존 0. 자동완성 ↔ 파서 결합(`:463-511`)은 v2 에서도 참 |
| server/test/live-extract.test.ts | 686 | test/live-extract-lib.ts | **그대로** | 순수 추출기. 단 LIVEENV 가 보관되면 함께 보관 대상 |
| channel/test/index-wiring.test.ts | 676 | channel/src/index.ts | **고침** | 스텁 핸드셰이크(`:22-34`, `:73-88`)를 `hello{token}`→`welcome` 으로; `chat_id` 단언 `:189`; welcome `room_id:1` 고정(`:86`) |
| server/test/permissions.test.ts | 593 | permissions.ts | **고침** | 하네스 `seedRoomAndBot`(`:74-77`)·`connectV2`(`:84`); `permission_request` 프레임에 `room_id` 추가. 27건 본체는 그대로 |
| channel/test/channel-server.test.ts | 580 | channel-server.ts | **고침** | `meta.chat_id` 스키마·단언 6자리(`:54`, `:204`, `:255`, `:294`, `:430`), 지시문 문장 `:240`·`:340`, `pushChatMessage` 입력에 방 번호 |
| channel/test/gateway-client.test.ts | 565 | gateway-client.ts | **다시 씀** | 열쇠 헬퍼·스텁 봉투(`:11-21`, `:55-80`) 전면; (b) 직접 3건(`:207`, `:401`, `:554`) 버림. 재접속·백오프·rid·stop(`:341-549`) 약 250줄은 맨몸 프레임으로 남긴다 |
| server/test/web-shell.test.ts | 555 | web/app.js·index.html | **고침** | 로그인·가입 흐름 약 10건(`:214-258`, `:348-365`, `:396-544`)이 이름 로그인으로. 정적 서빙·export·방·봇 은 그대로 |
| channel/test/gateway-mutual-auth.test.ts | 453 | 핸드셰이크 종단간·TLS 중계 | **버림** | 5건 전부 (b)(d). 배달 content 등식(`:231`)은 index-wiring 에 이미 있다 |
| server/test/messages.test.ts | 420 | routes-messages.ts | **고침** | `seed()` 의 `bot_tokens`(`:59-61`) → `room_bots`; `deliver` 인자(`:302-308`). 봉인·커서·격리 15건 본체 그대로 |
| channel/test/permission-relay.test.ts | 406 | channel-server.ts 권한 릴레이 | **고침** | 스텁 핸드셰이크 한 자리(`:107-119`, `:295-320`)만 |
| server/test/rooms-bots.test.ts | 300 | routes-rooms.ts·routes-bots.ts | **다시 씀** | `invites` 절(`:150-278`, 약 130줄)이 방별 토큰·재초대·철회. 방·봇 등록 절(`:43-147`)은 남고, 봇 등록 응답의 토큰·명령 시험이 새로 든다 |
| server/test/web-permission-contract.test.ts | 263 | permissions.ts ↔ rich.js | **고침** | 하네스(`:76-87`); AC-004 «초대 명령의 토큰으로 접속»(`:242-262`)은 봇 등록 명령으로 |
| channel/test/truncate.test.ts | 245 | truncate.ts | **그대로** | 의존 0 |
| server/test/sse.test.ts | 240 | sse.ts·routes-events.ts | **고침** | 하네스 로그인(`:34-36`)만. 401(`:192-205`)은 쿠키가 남으므로 유지 |
| server/test/web-rich.test.ts | 235 | web/rich.js | **고침** | 초대 명령 표시·소거(`:46-90`)가 봇 등록 명령으로. 첨부·버튼 그대로 |
| server/test/auth.test.ts | 198 | auth.ts | **버림** | 13건 전부 비밀번호·가입. 이름 상한·제어문자(`:91-129`)만 이름 로그인 기준으로 다시 쓴다(약 40줄) |
| server/test/restart-persistence.test.ts | 137 | index.ts 재시작 | **고침** | 초대 토큰(`:79-81`)→봇 등록 토큰, `connectV2`(`:107`)→맨몸 hello. 동일성 대조는 그대로 |
| server/test/web-visual.test.ts | 125 | web (실브라우저) | **고침** | 가입 폼 제출(`:82-87`)만 |
| server/test/wsupgrade-judgment.test.ts | 123 | test/wsupgrade-judgment.ts | **그대로** | 순수 분류 |
| server/test/mention.test.ts | 44 | mention.ts | **그대로** | 의존 0 |
| server/test/config.test.ts | 39 | config.ts | **고침** | 기본 호스트(`:13-15`)를 바꾸면 그 단언만 |
| server/test/db.test.ts | 32 | db.ts | **고침** | 표 목록(`:18`) |
| server/test/health.test.ts | 12 | index.ts | **그대로** | — |

| 처분 | 줄 수 |
|---|---|
| 그대로 | 1,827 (6개 파일) |
| 고침 | 4,301 (13개) |
| 다시 씀 | 2,532 (3개 — 그중 약 640줄은 버려지는 내용) |
| 버림 | 2,298 (4개) |
| 계 | 10,958 |

남는 줄 수 **6,128**(그대로 + 고침) + 다시 쓰는 파일에서 살아남는 약 1,900 ≈ 8,000 · 버리는 줄 수 약 **2,900**(버림 2,298 + 다시 씀 안의 약 640). 뒤 두 수는 추정이다.

테스트 보조 파일: `server/test/gateway-v2.ts`(121줄, 핸드셰이크 사본) 버림 · `fixtures/tls-test-*.pem` 버림 · `wsupgrade-judgment.ts`(188)·`live-extract-lib.ts`(460) 유지. `truncate.test.ts:205-209` 와 `transport-auth.test.ts:867` 이 `.moai/state/verify/` 아래 파일에 의존하는데, 전자는 남는 테스트이므로 그 의존 파일이 저장소에 있는지 C2 에서 확인해야 한다.

## 6. 위험

### 위험 1 — 권한 요청 프레임에 방이 없다 (가장 큼)

Claude Code 가 채널에 주는 `permission_request` 알림은 `request_id·tool_name·description·input_preview` 뿐이고(`channel-server.ts:68-76`), 채널은 그것을 그대로 게이트웨이에 보낸다(`channel/src/index.ts:72-74`). 지금은 접속이 곧 방이라 서버가 `info.roomId` 로 띄웠다(`gateway.ts:147`, `permissions.ts:77`). v2 에서 봇 하나가 방 셋에 있으면 **서버는 어느 방에 system 메시지를 띄울지 알 수 없다.**

- 깨지는 자리: `permissions.ts:62-86` 의 `postSystem(info.roomId, …)`, 합성키 `keyOf(info.roomId, …)`(`:52`, `:77`), 웹의 승인 버튼(`rich.js:127`)은 그 방의 SSE 로 온 메시지에만 붙는다.
- 답변 경로: 사람이 `yes <id>` 를 보내는 방(`routes-messages.ts:66`)과 대기 키의 방이 같아야 판정이 `sendToOrigin` 으로 간다(`permissions.ts:98`, `:107-108`). 방이 어긋나면 «모르는 ID» 로 흘러 사용자 메시지로 저장된다(`:99`).
- 제안: 채널이 «마지막으로 `delivery="to"` 알림을 넘긴 방» 을 기억해(`channel/src/index.ts:54-57` 의 `onMessage` 안, 변수 하나) 권한 요청 프레임에 `room_id` 로 싣는다. 봇이 여러 방에서 동시에 일하는 경우 이 근사가 틀릴 수 있으므로, 서버는 대기 키를 `봇:id` 로도 찾을 수 있게 두어 어느 방에서 답해도 같은 요청이 닫히게 한다. 이것은 SPEC-A 의 설계 결정으로 명시해야 한다.

### 위험 2 — `chat_id` 의 뜻 변경 (메시지 id → 방 id)

- 범위: 소스 `channel-server.ts` 4자리(24·30·176·194), 테스트 13줄(`channel-server.test.ts` 9·`index-wiring.test.ts` 4), **web/ 0줄**, server/ 0줄.
- 깨지는 것 ①: 지시문 `channel-server.ts:30` 「커서로는 chat_id 를 쓰세요… since_id 로 넘기면」. 이 문장은 지금도 `:145` 의 «cursor 필드를 넘긴다» 와 모순인 채 남아 있는데(카드 t10 이 도구 설명만 고쳤다), v2 에서 `chat_id` 가 방 번호가 되면 봇이 **방 번호를 `since_id` 로 넘겨** 이력이 조용히 비게 된다. 이 문장은 v2 첫 커밋에서 지워야 한다. 테스트 `channel-server.test.ts:240`·`:340` 이 이 문장을 글자 그대로 단언하므로 함께 바뀐다.
- 깨지는 것 ②: `fetch_history` 의 커서 출처. 지금 `cursor` 는 메시지 id 최댓값(`channel/src/index.ts:88-89`)이라 v2 에서도 메시지 id 가 봇에게 보여야 한다. `meta` 에 `message_id` 키를 더하거나 content 에 싣는다.
- 깨지는 것 ③: `reply`·`fetch_history` 도구에 `chat_id` 인자가 생긴다(`channel-server.ts:132-139`, `:146-155`). 봇이 인자를 빠뜨리면 서버가 어느 방인지 모른다. 서버 쪽은 `room_id` 없는 `bot_message`·`history_request` 를 거부하고, 채널 쪽은 위험 1 의 «마지막 to 방» 을 기본값으로 채우는 두 겹이 필요하다.

### 위험 3 — 재접속 재전달의 방별 순서

지금 쿼리는 방 하나·봇 하나·커서 하나다(`gateway.ts:224-227`). v2 에서 봇이 방 셋에 있으면 커서가 셋이다.

- 깨질 수 있는 곳: 커서를 `bot_tokens.id` 로 갱신하는 자리 둘(`gateway.ts:230`, `:347`) — «채우는 자리는 둘» 이라는 주석(`:238`)과 같은 모양으로, 한쪽만 고치면 다른 쪽이 조용히 옛 방의 커서를 올린다.
- 안전한 형태: `messages.id` 가 전역 단조 증가(`db.ts:43`)이므로 `JOIN room_bots rb ON rb.room_id = m.room_id AND rb.bot_id = ? WHERE m.id > rb.last_delivered_id ORDER BY m.id` 한 쿼리가 방마다 순서를 지키면서 전역 순서도 지킨다. 갱신은 배달한 메시지의 `(room_id, bot_id)` 행만. `AC-GW-003`(커서 이후 1건만)을 «방 둘, 커서 서로 다름» 으로 변이해 두어야 한다.

### 위험 4 — 첨부 경로가 방을 넘어 새는가

- 봇 프레임의 `local_path` 는 `resolve(stored_path)` 로 서버 절대 경로(`gateway.ts:245`, `:345`) — 같은 PC 전제라 봇이 읽을 수 있고, 그것이 설계다(`:234-237`).
- 방 경계: `deliver` 가 `c.roomId !== roomId` 로 걸렀다(`:340`). v2 에서는 접속에 방이 없으므로 **`room_bots` 로 걸러야 한다** — 타깃 봇이 그 방에 없으면 보내지 않는다. 이 검사가 빠지면 사람 글의 첨부 경로가 그 방에 없는 봇에게 간다. 봇 발신 첨부(`:287-306`)는 방과 무관하게 뿌리 검사만 하므로 v2 에서도 그대로.
- 웹 다운로드 `GET /api/attachments/:id` 는 지금도 방 검사가 없다(`routes-messages.ts:147`, 보류 카드 t17). §2.6 삭제 뒤에는 방 검사 자체가 없어지므로 새 구멍은 아니다.

### 위험 5 — 봇 → 봇 멘션 전달의 되먹임 (SPEC-B)

`handleBotMessage`(`gateway.ts:278-312`)가 `parseMentions` 를 부르고 `deliver` 를 타기 시작하면, orchestrator 가 `@TO(worker)` 를 쓰고 worker 가 답에 `@TO(orchestrator)` 를 쓰는 순환이 사람 개입 없이 돈다. 지금은 봇 글이 어떤 봇에게도 알림으로 가지 않아 이 문제가 없었다. 역할 규칙(worker 는 orchestrator 와 사람만 부른다)은 방향을 제한할 뿐 순환을 끊지 않는다. SPEC-B 에 «봇 글의 `to` 는 `working`/`idle` 과 무관하게 답변 의무를 지지 않는다» 같은 정지 조건 하나가 필요하다. 이것은 보안이 아니라 비용 문제라 설계 결정으로 남긴다.

### 위험 6 — 프레임 형태 변경이 테스트 fixture 에 미치는 범위

프레임에 필드를 **더하는** 방향이면 채널 테스트 fixture(방 번호 없는 `message` push 약 40자리, §5 조사원 표 (f))는 그대로 통과한다. 필드를 **필수** 로 만드는 순간 그 자리가 전부 실패한다. SPEC-A 는 «`room_id` 는 서버→채널 방향에서 항상 실리고, 채널→서버 방향에서 없으면 거부» 로 방향을 갈라 적어야 fixture 수정 범위가 채널→서버 자리(`bot_message`·`history_request`·`permission_request`·`status`)로 좁혀진다.

### 위험 7 — 웹 봇 칩과 `status` 프레임

`status{working|idle}` 은 접속의 방으로 발행된다(`gateway.ts:139`). v2 에서 방이 없으면 `hub.publish` 의 방을 정할 수 없어 칩(`app.js:478-496`)이 안 켜진다. 채널이 `working` 을 보내는 자리(`channel/src/index.ts:55`)는 `to` 알림 직후라 그 메시지의 방을 알고, `idle`(`:69`)은 `reply` 직후라 `reply` 의 `chat_id` 를 안다 — 둘 다 방 번호를 실을 수 있다.

## 7. SPEC 분할 제안

### 판정: 삭제(C)를 통째로 먼저 하면 A 가 작아지는가 — 절반만 그렇다

- A 가 새로 쓰는 다섯 파일 가운데 gateway.ts·gateway-client.ts·db.ts·routes-bots.ts 는 **핸드셰이크 삭제와 모델 변경이 같은 줄에 얽혀 있다**(예: `gateway.ts:155-232` 의 hello/auth 가 곧 (방, 봇) 결정 자리, `routes-bots.ts:86-91` 의 재초대가 곧 유도·저장 자리). 이 넷에서 삭제를 먼저 하면 v1 (방, 봇) 모델 위에 «맨몸 hello» 를 한 번 만들고 그 테스트(gateway.test.ts 1,667줄·gateway-client 565줄)를 고친 뒤, A 에서 다시 전부 고치게 된다 — 같은 테스트를 두 번 쓴다.
- 반면 auth.ts·room-members.ts·routes-rooms.ts 의 구성원 부분·channel/src/index.ts 의 전송 검사·config.ts 는 **A 가 건드리지 않거나 조금만 건드린다**. 이 부분의 삭제를 먼저 하면 A 의 테스트 하네스(모든 서버 테스트의 `build()` 가 가입→로그인→쿠키로 시작, 조사원 표 (c))가 처음부터 이름 로그인으로 서므로 A 가 확실히 작아진다.
- 따라서 C 를 둘로 가른다: **C1**(게이트웨이 밖의 삭제)을 A 앞에, **C2**(SPEC·테스트·스크립트 정리)를 B 뒤에.

### 순서와 끝 조건

**SPEC-C1 — 사람 인증 축소·방 구성원 인가 삭제·전송 검사 삭제** (A 앞)
- 범위: `auth.ts` 새로 씀, `room-members.ts` 삭제와 호출부 여덟 자리, `routes-rooms.ts` 구성원 라우트·`created_by`, `db.ts` 의 `password_hash`·`room_members`·`schema_migrations`·백필, `channel/src/index.ts:21-40, 130-147`, `config.ts:7`, web 로그인 폼.
- 끝 조건: `npm test` 초록. `auth.test.ts`·`room-members.test.ts`·`transport-auth.test.ts` 가 버려지거나 대체됐고, 남은 서버 테스트 하네스가 전부 이름 로그인으로 시작한다. `grep -rn "password\|requireRoomMember\|isTransportAllowed" server/src channel/src` 가 0건. 운영자가 §2.6 을 확인했다.
- 앞에 두는 이유: A 의 테스트 하네스를 한 번만 쓰게 한다. 게이트웨이는 건드리지 않으므로 A 와 충돌하지 않는다.

**SPEC-A — 봇 단위 신원·방 참여·방 명시 프레임** (핵심)
- 범위: `db.ts`(`bots.token`, `room_bots`), `routes-bots.ts`(등록 시 토큰, 참여 추가·목록·제거), `gateway.ts`(맨몸 `hello{token}`·welcome 에 방 목록·모든 프레임 `room_id`·`room_bots` 기반 deliver·방별 커서), `gateway-client.ts`(맨몸 프레임·재접속), `channel-server.ts`(`chat_id`=방·`message_id` 추가·도구 인자·지시문 개정·권한 요청에 방), `channel/src/index.ts`(마지막 `to` 방 기억), `permissions.ts`(프레임의 방), `routes-messages.ts`(`room_bots` 매핑), web 초대·봇 등록 화면.
- 끝 조건 (검증 가능한 것만): ① 봇 하나가 토큰 하나로 붙어 방 둘의 `to` 알림을 각각 그 방의 `chat_id` 로 받는다. ② `reply{chat_id}` 가 그 방에만 저장·발행된다. ③ 방 둘에 커서를 달리 심고 재접속하면 각 방의 커서 이후만, id 오름차순으로 온다(위험 3 변이). ④ 방 A 에서만 참여한 봇은 방 B 의 첨부 경로를 받지 못한다(위험 4). ⑤ 권한 요청이 마지막 `to` 방에 뜨고 그 방의 `yes` 가 요청 접속으로 돌아간다(위험 1). ⑥ `grep -rn "verifier_pub\|server_confirm_key\|handshakeTranscript\|'env'" server/src channel/src` 0건. ⑦ 지시문에 «chat_id 를 since_id 로» 문장이 없다.
- 이 SPEC 안에서 핸드셰이크·전선 봉투·방별 토큰이 함께 사라진다(C 의 나머지 절반).

**SPEC-B — 봇 → 봇 멘션 전달 + 역할 규칙** (A 뒤)
- 범위: `bots.role`(orchestrator|worker) 열과 등록 인자, `handleBotMessage` 에 `parseMentions` → 타깃 해석(`routes-messages.ts:77-89` 를 공용 함수로 추출) → `deliver`, 역할 필터(worker 의 타깃은 orchestrator 봇만; 사람 멘션은 타깃이 아니라 무시 — 사람은 SSE 로 전부 본다), 되먹임 정지 조건(위험 5).
- 끝 조건: ① orchestrator 의 `@TO(worker)` 가 worker 에게 `to` 알림으로 간다. ② worker 의 `@TO(다른 worker)` 는 거부되거나 무시되며 사람 화면에는 글이 남는다. ③ 그 방에 참여하지 않은 봇을 멘션하면 사람 경로와 같은 규칙으로 처리된다(400 대응 — 봇 경로는 응답이 없으므로 system 메시지 한 줄). ④ 되먹임 정지 조건의 변이 테스트 하나.

**SPEC-C2 — SPEC·테스트·스크립트 정리** (B 뒤)
- 범위: §4 보관 목록 10개 이동과 안내 파일, 개정 대상 11개의 HISTORY 한 줄, §5 «버림» 잔여 파일과 `gateway-v2.ts`·TLS fixture 삭제, `scripts/e2e.mts` 러너를 v2 프레임으로, `scripts/live-*` 처분, README·ROADMAP·codemaps 갱신, `.moai/state/verify/` 의존 확인.
- 끝 조건: `find .moai/specs -maxdepth 1 -type d -name 'SPEC-*' | wc -l` = 18, `_archive` = 11. CI 초록. README 첫 문단에 핸드셰이크·TLS·t23 서비스화 문장이 없다.

## 확인 못 한 것

1. **테스트 «그대로 통과»·«깨질 건수» 는 전부 읽기 판단이다.** 어느 기제도 실제로 변이시켜 `npm test` 를 돌리지 않았다. 특히 §5 의 «다시 씀 안의 약 640줄»·«남는 약 8,000줄» 은 줄 범위 산술 추정이다.
2. **새로 쓴 뒤 크기 «약 470줄»** 은 추정이다. 실측 근거가 없다.
3. (닫힘) `Gateway.sendToBot` 소스 호출자 0 은 `grep -rn "sendToBot(" server/src` 로 확인했다 — §3 표에 반영.
4. **위험 1 의 «마지막 `to` 방» 근사가 실제 세션에서 맞는지** — Claude Code 가 방 둘의 `to` 를 연달아 받은 뒤 어느 것에 대해 권한을 요청하는지는 실세션 관측이 필요하다. 이 보고서는 코드만 읽었다.
5. **Claude Code 채널 계약에서 `chat_id` 를 세션이 `reply` 인자로 되돌려 주는지** — 저장소 안에 그 계약 문서가 없어(`channel-server.ts:1` 「공식 Channels 계약」 참조만) 확인하지 못했다. 되돌려 주지 않는다면 도구 인자 `chat_id` 는 봇이 스스로 적어야 하고, 위험 2 ③ 의 기본값 겹이 필수가 된다.
6. **SPEC 인용 줄 번호** 는 조사원이 낸 것 중 16자리를 표본으로 재확인했고 그중 1자리(CHANAUTH (d))가 틀려 정정했다. 표본 밖 인용은 같은 비율의 오차가 있을 수 있다. 소스 파일:줄 인용은 내가 전문을 읽은 파일에서 직접 적었다.
7. **`SPEC-LIVEVERIFY-001`** 은 frontmatter `completed` 와 HISTORY 「in-progress 유지」(`spec.md:25`)가 어긋난다. 어느 쪽이 맞는지 판정하지 않았다.
8. **§2.6 방 구성원 인가 삭제** 는 규칙(«빼면 깨지는 것을 못 쓰면 삭제»)을 적용한 결과이지 제품 결정이 아니다. 운영자가 비공개 방을 원하면 판정이 뒤집힌다.
9. **web/ 의 CSS 490줄이 «그대로»** 인 것은 화면 구조가 안 바뀐다는 가정이다. 가입 폼을 지우면 `#register-form` 관련 규칙이 죽은 규칙으로 남을 수 있으나 세지 않았다.
10. `scripts/` 네 파일(1,402줄)은 머리 주석만 읽었다. 처분은 §3 표의 두 줄이 전부이며 본문 판정은 하지 않았다.
