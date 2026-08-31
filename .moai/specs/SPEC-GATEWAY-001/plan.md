# SPEC-GATEWAY-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본 근거는 `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 8 과 `spec-v2.md` 6장이며, 두 문서는 읽기 전용이다.
>
> 아래 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A 부터 §E 까지가 검토가 필요한 부분이고, §F 의 마일스톤은 그 결정이 확정된 뒤의 기계적 실행 절차다.
>
> 용어 주의: §F 의 `M1`/`M2`/`M3` 는 **이 SPEC 안의 내부 마일스톤**이다. 칸반 보드의 마일스톤 `M3`(카드 `t3`)와는 다른 층위다.

---

## §A 실행 순서와 의존

카드 `t3` 는 하나이지만 SPEC 셋을 낸다. 이 SPEC 이 마지막이다.

```
SPEC-MENTION-001 → SPEC-SSE-001 → SPEC-GATEWAY-001 (이 SPEC)
```

이 SPEC 이 선행 SPEC 에서 **정확히 무엇을 받아 쓰는지**:

| 선행 SPEC | 받아 쓰는 것 | 이 SPEC 에서의 쓰임 |
|-----------|-------------|-------------------|
| `SPEC-SSE-001` | `createSseHub()` 와 `app.hub.publish(roomId, event, data)` | `bot_message` 저장 후 `'message'` 발행, `status` 수신 시 `'bot_status'` 발행 |
| `SPEC-BOT-001` | `sha256Hex(s)` (`routes-bots.ts` 가 내보냄) | `hello { token }` 의 토큰 조회 키. **새로 만들지 않는다** |
| `SPEC-BOT-001` | `GET /api/rooms/:id/invites` 의 `online` 필드 | 상수 `false` 를 `gateway.isOnline(...)` 으로 바꾼다 |
| `SPEC-ROOM-001` | `registerRoomRoutes(app, { onArchive })` | 보관 시 `closeRoom(roomId)` 를 부르는 배선 지점 |
| `SPEC-CORE-001` | `bot_tokens` / `messages` / `message_targets` / `attachments` 스키마, `config.uploadsDir`, `buildServer` | 조회·저장·복사 대상과 조립 지점 |
| `SPEC-MENTION-001` | (직접 호출 없음) | 카드 안 순서 고정 목적. `deliver()` 의 호출자는 다음 SPEC 의 `routes-messages.ts` 다 |

`SPEC-SSE-001` 이 아직 `implemented` 가 아니면 `../src/sse.js` import 가 실패해 이 SPEC 의 **모든** 테스트가 준비 단계에서 죽는다. M1 시작 전 확인 대상이다.

## §B 되돌리기 어려운 결정 1 — `Gateway` 인터페이스 시그니처

이 SPEC 에서 가장 되돌리기 비싼 결정이다. 소비자가 셋이고, 그중 둘은 아직 존재하지 않으므로 여기서 고정하지 않으면 나중에 세 곳을 동시에 고쳐야 한다.

| 메서드 | 소비자 | 고정 이유 |
|--------|--------|-----------|
| `deliver(roomId, msg, targets)` | 다음 SPEC 의 `routes-messages.ts` | 멘션 파싱 결과 `{ bot, delivery }[]` 를 `{ botId, delivery }[]` 로 옮겨 넘긴다. 인자 순서와 이름이 바뀌면 호출부가 깨진다 |
| `closeRoom(roomId)` | `index.ts` 의 `onArchive` 훅 | `SPEC-ROOM-001` 이 이미 `(roomId: number) => void` 로 훅 시그니처를 확정했다 |
| `isOnline(roomId, botId)` | `routes-bots.ts` 초대 목록 | `SPEC-BOT-001` 이 "카드 `t3` 가 채운다"고 자리를 비워 뒀다 |
| `sendToBot(roomId, botId, payload)` | 다음 카드의 `permissions.ts` | 반환값 불리언이 "봇이 오프라인이라 못 보냈다"를 알리는 유일한 신호다 |
| `setPermissionHandler(fn \| null)` | 다음 카드의 `permissions.ts` | `null` 로 해제 가능해야 테스트가 서로 오염되지 않는다 |

`spec.md` REQ-GW-021 이 시그니처 전문을 담고 있다. **바꾸지 않는다.** 바꿔야 할 이유가 보이면 진행을 멈추고 보고한다.

## §C 되돌리기 어려운 결정 2 — 커서 하나로 두 가지를 한다

`messages.id` 는 방마다 단조 증가하는 번호이고, 이 SPEC 은 그 번호를 **두 곳**에서 쓴다.

| 쓰임 | 필드 | 뜻 |
|------|------|-----|
| 재접속 복구 | `welcome.missed_after_id` (= `bot_tokens.last_delivered_id`) | "이 번호 다음부터 못 받았다" |
| 대화 따라잡기 | `history_request.since_id` | "이 번호 다음부터 보여 달라" |

`spec-v2.md:154` 가 이것을 명시한다 — "같은 번호를 `fetch_history` 의 `since_id` 가 재사용한다. 재접속 복구와 대화 따라잡기가 하나의 커서 체계를 쓴다."

**두 번째 커서를 만들지 않는다.** 시각(`created_at`)을 커서로 쓰자는 유혹이 있는데, 같은 초에 여러 메시지가 들어오면 경계를 가를 수 없다. `since_id` 가 2026-08-26 에 추가된 이유가 정확히 그것이다(`plan-v2.md` 계획 자기 검토 결과). `since` 는 사람이 지정하는 대략적 범위 필터로 남고, 기계가 쓰는 정확한 커서는 `since_id` 다.

이 결정의 파급은 이 SPEC 밖까지 간다. 채널 플러그인(카드 `t4`)의 `fetch_history` 도구 스키마와 이력 줄 형식 `#<번호> [시각] 작성자: 본문` 이 여기 실린 `id` 를 그대로 쓴다. 그래서 REQ-GW-016 이 `id` 필드를 필수로 못 박는다 — 서버가 `id` 를 빼면 채널이 다음 커서를 만들 수 없어 따라잡기 기능 전체가 무너진다.

## §D 원본 문서 모순과 해결

`spec.md` §7 이 다섯 건을 표로 기록했다. 여기서는 각각을 어떻게 처리했는지와 그 근거를 남긴다.

### 1. 끊김 시 `system` 메시지 — 만들지 않는다 (리드 보고 대상)

`spec-v2.md` 8장 표는 "채널/세션 죽음 → WebSocket 끊김 → 봇 오프라인 표시 **+ 방에 system 메시지**" 라고 적었다. `plan-v2.md` Task 8 의 구현은 `ws.on('close', () => conns.delete(ws))` 한 줄이고, 테스트에도 system 메시지를 확인하는 것이 없다.

**계획서를 따라 만들지 않는다.** 근거는 셋이다.

- `messages` 스키마에 `author_type='system'` 은 있지만, 누가 언제 어떤 문구로 넣는지가 어디에도 정의돼 있지 않다. 임의로 정하면 그 문구가 계약이 되어 나중에 UI 와 어긋난다
- 끊김은 정상 상태다(`spec-v2.md` 11장 — "서버는 오프라인을 정상 상태로 다룬다"). 세션이 재시작할 때마다 방에 시스템 잡음이 쌓인다
- 온라인 표시(`isOnline`)가 같은 정보를 이미 전달한다

`spec.md` §5 에 범위 밖으로 명시했고, 리드에게 모순으로 보고한다. 필요하다는 판단이 서면 별도 SPEC 으로 만든다 — 이 SPEC 안에서 조용히 추가하지 않는다.

### 2. `bot_message.files` 의 `name` 필드

`spec-v2.md` 6장은 `files: [{ local_path }]`, `plan-v2.md` 는 `{ local_path, name }`. `plan-v2.md` 를 따르되 `name` 은 선택으로 둔다(`f.name ?? basename(f.local_path)`). 없어도 동작하므로 상위 호환이고, 채널 쪽이 표시 이름을 바꿔 보낼 여지를 남긴다.

### 3. `history_request`/`history_response` 의 `rid`

`spec-v2.md` 6장의 프로토콜 표에는 `rid` 가 없다. `plan-v2.md` 의 구현과 테스트에는 있다. **`plan-v2.md` 를 따른다** — 한 접속이 이력 요청 둘을 겹쳐 보냈을 때 어느 응답이 어느 요청의 것인지 가릴 방법이 `rid` 말고 없다. AC-GW-011 이 서로 다른 두 `rid` 를 한 테스트에서 대조해 하드코딩을 배제한다.

### 4. `statSync` 의 import 출처

`plan-v2.md:1428` 이 `import { randomUUID, statSync } from 'node:crypto'` 로 적었다. `statSync` 는 `node:fs` 다. 같은 문서 `plan-v2.md:1624-1629` 가 스스로 정정하므로 정정본을 따른다. 그대로 쓰면 타입 검사에서 즉시 걸린다.

### 5. `status updates online flag` 테스트의 이름과 내용 불일치

원본 테스트는 이름과 달리 `status` 메시지를 한 번도 보내지 않고, 접속·종료만으로 `isOnline` 을 검사한다. 두 성질은 다르다 — 하나는 프로토콜 메시지 처리(REQ-GW-012), 다른 하나는 접속 기반 판정(REQ-GW-013)이다. **테스트를 둘로 나눴다**: `status` 발행은 AC-GW-009, 온라인 판정은 AC-GW-010. 원본 테스트 이름은 쓰지 않는다.

### 6. `limit` 과 필터의 적용 순서 — 원본 구현을 계약으로 승격

원본 구현은 `SELECT … ORDER BY id DESC LIMIT ?` 로 최근 N 개를 자른 **뒤** `since_id`/`speaker`/`since`/`until` 을 자바스크립트에서 거른다. 그래서 `limit` 은 "조건에 맞는 것 N 개"가 아니라 "최근 N 개 중 조건에 맞는 것"이다. 방에 100건이 있고 `limit: 10, since_id: 1` 이면 답은 10건이지 99건이 아니다.

이 성질은 원본 테스트가 잡지 못한다 — 메시지 2건에 `limit: 10` 을 걸어서 두 해석이 같은 답을 낸다. **계약으로 승격해 AC-GW-013 이 두 해석을 가르는 단언을 둔다.** 바꾸지 않는 이유는 두 가지다: SQL 한 번으로 끝나 단순하고, 봇의 실사용(최근 대화 따라잡기)에서 원하는 답이 이쪽이다. 다르게 하고 싶으면 SPEC 을 고친 뒤 바꾼다.

### 7. 허브 발행을 테스트에서 관측하는 방법

원본 테스트는 "hub 에 직접 스파이 대신 … publish 가로채기는 힘드므로 DB 로 검증"이라는 주석과 함께 발행 관측을 **포기했다**. 그 결과 `hub.publish` 를 아예 부르지 않는 구현도 원본 테스트를 통과한다.

이 SPEC 은 `build()` 헬퍼에서 `hub.publish` 를 감싸 발행 내역을 배열에 기록한다(`acceptance.md` 공통 하네스). 이것은 `SseHub` 가 `publish` 를 **속성으로 갖는 평범한 객체**라는 데 의존한다. `SPEC-SSE-001` 이 `Object.freeze` 하거나 클래스 프로토타입 메서드로 만들면 이 감싸기가 실패한다 — **M1 시작 전에 `sse.ts` 의 반환 형태를 확인한다.** 프로토타입 메서드라면 `hub` 객체를 프록시로 감싼 뒤 `app.decorate('hub', proxy)` 하는 방식으로 바꾼다(관측 대상은 그대로).

### 8. [감사 M7] 프레임 파싱은 인자 위치가 아니라 `try/catch` 안에서 — 구현 지시를 고친다

`plan-v2.md:1460` 은 이렇게 적었다.

```ts
ws.on('message', raw => { handleWsMessage(ws, JSON.parse(String(raw))).catch(() => ws.close()) })
```

`JSON.parse` 는 `handleWsMessage` 가 **호출되기 전에 인자로 평가**되므로, 파싱 실패는 프로미스 체인 바깥에서 동기적으로 던져진다. `.catch` 는 그것을 잡지 못하고 예외가 `ws` 리스너에서 uncaught 로 새어 나가며, vitest 에서는 unhandled error 로 스위트를 오염시킨다. `acceptance.md` 의 엣지 케이스 표는 그 코드를 인용하면서 "예외가 나고 그 접속이 닫힌다"고 적었는데, **인용한 코드에서 나오지 않는 동작**이었다.

**표만 고치지 않고 구현 지시를 고친다.**

```ts
ws.on('message', raw => {
  let msg: any
  try { msg = JSON.parse(String(raw)) } catch { ws.close(); return }   // 인자 위치에서 파싱하지 않는다
  handleWsMessage(ws, msg).catch(() => ws.close())
})
```

관측은 AC-GW-002 의 5번이 한다 — 인증된 접속에 깨진 프레임을 보내고, 소켓이 닫히며 `messages` 에 행이 남지 않는지 본다. 이전 판에는 이 동작을 관측하는 기준이 하나도 없어서 **틀린 서술이 계약처럼 기록돼 있었다.**

### 9. [감사 §3-2] `attachments.size`·`mime` 의 출처를 요구사항으로 못 박는다

`attachments` 의 `size` 와 `mime` 은 스키마에서 **`NOT NULL`** 이다(`server/src/db.ts:60-61`). 그런데 REQ-GW-010 의 초판은 그 두 값이 어디서 오는지 말하지 않았다. 요건대로만 구현하면 INSERT 가 제약 위반으로 던지고, 그 예외를 REQ-GW-011 의 "없는 파일은 그 첨부만 건너뛴다" `catch` 가 그대로 삼킨다 — **메시지는 저장되고, 로그는 조용하고, 첨부만 사라진다.** 파일이 멀쩡히 있는데도 그렇다.

설계 판단이 필요한 자리가 아니다. 원본이 이미 답을 갖고 있다.

| 값 | 출처 | 원본 위치 |
|-----|------|-----------|
| `size` | 복사 시점에 읽은 원본 파일의 바이트 크기 (`statSync(f.local_path).size`) | `plan-v2.md:1534` |
| `mime` | 상수 `'application/octet-stream'` | `plan-v2.md:1537-1538` |

`mime` 이 상수인 것은 의도된 설계다. 게이트웨이는 봇이 준 로컬 경로를 복사만 하며 내용을 스니핑하지도 확장자를 보지도 않는다. **`SPEC-MSG-001` 의 HTTP 업로드 경로는 확장자로 `mime` 을 판정한다** — 두 경로가 같은 테이블에 서로 다른 규칙으로 쓰는 것이 정상이며, 게이트웨이 쪽을 확장자 판정으로 "통일" 하려 해서는 안 된다.

REQ-GW-010 에 다섯 컬럼의 출처 표를 넣었고, AC-GW-007 이 첨부 행의 존재와 `size` 의 실제 바이트 길이, `mime` 상수를 관측한다.

## §E 알려진 위험

| 위험 | 영향 | 완화 |
|------|------|------|
| `SPEC-SSE-001` 미완료 상태에서 착수 | `../src/sse.js` import 실패로 테스트 파일 전체가 죽는다 | §A 의존 표를 M1 시작 전 체크리스트로 쓴다 |
| `SseHub` 가 감쌀 수 없는 형태(프로토타입 메서드·frozen) | AC-GW-007·009 의 발행 관측이 불가능해진다 | §D 7번의 프록시 대안. 착수 전 `sse.ts` 반환 형태 확인 |
| WebSocket 테스트의 타이밍 의존 | `setTimeout(300)` 류가 느린 CI 에서 깨질 수 있다 | 가능한 곳은 `nextMessage`(이벤트 대기)로, 어쩔 수 없는 곳만 고정 지연. `expectNoMessage` 는 400ms 로 넉넉히 |
| **[감사 M5] `welcome` 직후 프레임을 하네스가 흘림** | `handleHello` 는 `welcome` 과 재전송 `message` 를 같은 동기 블록에서 보내고, 루프백에서 두 프레임은 한 TCP 세그먼트로 합쳐져 같은 스택에서 연속 emit 되기 쉽다. `await wsConnect(...)` **이후에** 리스너를 붙이는 구조라면 그 사이에 재전송 프레임이 지나가 AC-GW-003 이 `timeout waiting ws message` 로 실패한다 — **구현이 옳은데도** 간헐적으로 실패하는, 진단이 가장 비싼 형태다 | `wsConnect` 가 접속 시점부터 프레임을 큐에 쌓고 `nextMessage`/`expectNoMessage` 가 그 큐를 먼저 비운다(`acceptance.md` 공통 하네스). `expectNoMessage` 는 큐에 이미 쌓인 프레임도 실패로 다룬다 |
| 소켓·서버를 안 닫아 좀비 프로세스가 남음 | vitest 가 종료되지 않고 다음 카드 작업까지 막는다 | 모든 테스트가 `ws.close()` + `await app.close()` 로 끝난다. `onClose` 훅이 남은 접속을 닫는다(REQ-GW-004, AC-GW-001 이 관측) |
| `deliver` 가 방 전체 브로드캐스트로 퇴화 | 봇이 자기 앞으로 오지 않은 대화를 받아 기억이 섞인다 — `spec-v2.md` 3장의 핵심 원칙 위반 | AC-GW-005 의 부정 관측 두 건(`expectNoMessage`)과 커서 `0` 단언 |
| `since_id` 필터가 사실상 없어도 테스트가 통과 | v2 개정 전체가 무의미해진다. 봇이 이미 본 대화를 다시 읽고 중복 반응한다 | AC-GW-012 의 대조군(무필터 요청)과 건수 차이 단언. `spec.md` §7 이 아니라 이 위험이 이 SPEC 의 최대 위험이다 |
| 재접속 시 중복 전달 | 봇이 같은 지시를 두 번 수행한다. 부작용이 있는 도구라면 되돌릴 수 없다 | AC-GW-004 가 "오지 않음"을 직접 관측한다. "전달됐다" 단언만으로는 중복을 못 본다 |
| **[감사 §3-2] `attachments` 의 `NOT NULL` 컬럼을 빠뜨림** | `size`·`mime` 없이 INSERT 하면 제약 위반 예외가 나고, REQ-GW-011 의 건너뛰기 `catch` 가 그것을 삼킨다. 파일이 멀쩡한데도 첨부만 조용히 사라지고 로그도 남지 않는다 — 침묵하는 실패라 발견이 늦다 | REQ-GW-010 에 다섯 컬럼 출처 표를 넣고(§D 9번), AC-GW-007 이 첨부 행 존재 + `size` 의 실제 바이트 길이 + `mime` 상수를 관측한다 |
| 같은 토큰 두 프로세스 동시 접속 | 둘 다 받고 커서도 둘 다 갱신 — 한쪽이 놓칠 수 있다 | 단일 사용자·소수 그룹 전제로 수용. `spec.md` §5 에 명시 |
| `index.ts` 수정이 `SPEC-BOT-001` 의 AC-BOT-009 를 깨는 것으로 오해 | 그 기준은 **자기 SPEC 의 base SHA** 기준이라 영향이 없다 | 이 SPEC 의 base SHA 는 이 SPEC 진입 시점이며, AC-GW-019 의 기대 파일 목록은 세 줄(`gateway.ts`·`index.ts`·`routes-bots.ts`)이다 |
| 형제 SPEC(`mention.ts`·`sse.ts`·`routes-messages.ts`·`permissions.ts`)의 실행 순서에 따라 `ls server/src` 결과가 달라짐 | 고정 파일 목록을 요구하면 이 SPEC 이 **자기 통제 밖의 이유로** 실패한다 | [감사 §3-1] AC-GW-019 1번은 `gateway.ts` 존재와 선행 SPEC 산출물만 관측하고, 형제 SPEC 파일의 존재 여부는 **관측 대상에서 뺐다**. "이 SPEC 이 만들지 않았다"의 판정은 4번(base SHA 기준 diff)이 전담한다 — 형제가 만든 파일은 그 diff 에 나타나지 않는다. 형제 SPEC 의 AC-MSG-013 도 같은 서술을 쓴다 |

## §F 마일스톤

우선순위 순서다. 앞 마일스톤이 끝나야 다음을 시작한다.

### M1 — 접속·인증·재전송·`deliver` (우선순위 High)

원본: `plan-v2.md` Task 8 Step 1-3 중 `handleHello`/`sendStoredMessage`/`deliver` 경로.

0. **`spec_base_sha` 기록** (다른 어떤 변경보다 먼저): `git rev-parse HEAD > .moai/specs/SPEC-GATEWAY-001/.spec-base-sha` 를 실행하고 같은 값을 `progress.md` `§E.1` 에 적는다. M3 단계의 범위 경계 검사 두 개가 이 값을 기준으로 비교한다.
0-b. **선행 확인**: `server/src/sse.ts` 가 존재하고 `createSseHub()` 의 반환이 `publish` 를 속성으로 갖는 객체인지 본다 (§D 7번). 아니면 프록시 대안으로 하네스를 바꾼다.
1. `server/test/gateway.test.ts` 를 만들고 공통 하네스 + AC-GW-001~006 의 테스트 여섯 개를 쓴다.
2. **RED 확인**: `npm test -w server -- --reporter=verbose` → `../src/gateway.js` 부재로 실패. 출력 기록.
3. `server/src/gateway.ts` 를 만든다 — `WebSocketServer({ server: app.server, path: '/bot' })`, 접속 목록 `Map`, 프레임 파싱 가드(§D 8번 — **인자 위치에서 `JSON.parse` 하지 않는다**), `handleHello`(토큰 조회 → 등록 → `last_seen_at` 갱신 → `welcome` → 커서 이후 재전송 → 커서 갱신), `sendStoredMessage`, `authorName`, `deliver`, `closeRoom`, `isOnline`, `onClose` 정리. import 는 §D 4번의 정정본을 따른다.
4. **GREEN 확인**: 여섯 테스트의 `✓` 줄이 나타난다. `npm run typecheck -w server` → 종료 코드 0.
5. 커밋: `feat: bot gateway with token auth and cursor replay`

수용 기준: AC-GW-001~006, AC-GW-020(전이 1-2).

### M2 — `bot_message`·`status`·이력·권한 릴레이 (우선순위 High)

원본: `plan-v2.md` Task 8 Step 1-3 중 `handleBotMessage`/`handleHistory`/`permission_request` 경로.

1. 같은 테스트 파일에 AC-GW-007~017 의 테스트 열한 개를 추가한다.
2. **RED 확인**: 해당 핸들러 부재로 실패. 출력 기록.
3. `gateway.ts` 에 추가 — `handleBotMessage`(행 저장 → 파일 복사 → 첨부 **다섯 컬럼 전부**: `size` 는 `statSync(local_path).size`, `mime` 은 상수 `'application/octet-stream'` — §D 9번 → `hub.publish('message')`), `status` 분기(`working`/`idle` 만 `bot_status` 발행), `handleHistory`(§D 6번의 순서대로 `limit` → `speaker` → `since_id` → `since` → `until`), `sendToConn`, `permission_request` → `permissionHandler`, `sendToBot`, `setPermissionHandler`.
4. **GREEN 확인**: 열일곱 테스트 전부 `✓`. typecheck 0.
5. 커밋: `feat: gateway bot_message, status, history and permission relay`

수용 기준: AC-GW-007~017, AC-GW-020(전이 3-4).

### M3 — 조립과 범위 경계 (우선순위 High)

원본: `plan-v2.md` Task 8 Step 3 의 `index.ts`·`routes-bots.ts` 수정 지시.

1. AC-GW-018 의 테스트를 추가한다. **RED 확인** — `app.gateway` 부재로 실패.
2. `server/src/index.ts`: `createGateway(app, { uploadsDir: config.uploadsDir })` → `app.decorate('gateway', gateway)` → `registerRoomRoutes(app, { onArchive: roomId => gateway.closeRoom(roomId) })`. `declare module 'fastify'` 에 `gateway: Gateway` (그리고 `SPEC-SSE-001` 이 더한 `hub`) 를 추가한다.
3. `server/src/routes-bots.ts`: 초대 목록의 `online: false` 를 `(req.server as { gateway?: Gateway }).gateway?.isOnline(roomId, r.bot_id) ?? false` 로 바꾼다. **그 라우트 한 줄만** 고친다.
4. **GREEN 확인**: 전체 통과, typecheck 0.
5. 범위 경계 확인 (AC-GW-019): `ls server/src` → `gateway.ts` 와 선행 SPEC 산출물 여섯이 있는지만 본다(형제 SPEC 파일은 세지 않는다 — §E 의 실행 순서 행). `git rev-parse --verify "$(cat .moai/specs/SPEC-GATEWAY-001/.spec-base-sha)^{commit}"` 가 종료 코드 `0` 으로 SHA 를 내는지 확인하고, 그 SHA 를 넣은 `git diff --stat <SHA> -- server/src/db.ts` 가 종료 코드 `0` 이면서 비어 있는지, `git diff --name-only <SHA> -- server/src` 가 정확히 세 줄인지 본다. **기준 커밋 없이 `git diff` 를 쓰지 않는다.** **빈 출력만 보고 통과로 적지 않는다.**
6. 커밋: `feat: wire gateway into buildServer and invite online flag`

수용 기준: AC-GW-018, AC-GW-019.

## §G 자기 검증

구현 완료 판정은 `acceptance.md` 의 AC-GW-001..020 전부다. 별도 기준을 만들지 않는다.

실행자는 각 마일스톤 종료 시 다음을 `progress.md` `§E.2` 에 기록한다.

- 실행한 명령 원문 (`--reporter=verbose` 를 포함한 그대로)
- 그 명령의 출력 — 요약이 아니라 **`✓` 줄이 보이는 실제 출력**
- 관측하지 못한 항목(있다면 명시적으로 "미검증"으로 기록)

## §H 안티패턴 (하지 말 것)

- **스키마 변경** — `db.ts` 의 `SCHEMA` 를 건드리지 않는다. `bot_tokens.last_delivered_id` 도 `message_targets` 도 이미 있다. 필요해 보이면 멈추고 보고한다.
- **`sha256Hex` 를 게이트웨이에 새로 구현** — `routes-bots.ts` 의 것을 import 한다. 해시 방식이 갈라지면 발급된 토큰이 전부 무효가 된다.
- **`deliver` 를 방 브로드캐스트로 만들기** — 타깃 배열을 무시하고 방 전체에 보내면 세션 기억이 섞인다. `spec-v2.md` 3장의 핵심 원칙 1번 위반이다.
- **오프라인 봇의 커서를 미리 올리기** — "어차피 나중에 보낼 것"이라며 `deliver` 에서 타깃 전원의 커서를 올리면, 그 봇은 그 메시지를 **영원히** 못 받는다. 재전송의 유일한 근거가 커서다.
- **`since_id` 를 `since` 로 대신하기** — 시각은 같은 초 안의 경계를 가르지 못한다. 두 필드는 다른 목적이고 둘 다 있어야 한다 (§C).
- **`history_response` 에서 `id` 빼기** — 본문만 보내면 채널이 다음 커서를 만들 수 없고 `#<번호>` 줄도 만들 수 없다. 따라잡기 기능 전체가 무너진다 (REQ-GW-016).
- **이력 줄 문자열을 서버가 조립하기** — `#<번호> [시각] 작성자: 본문` 은 채널(카드 `t4`)의 표현 계층이다. 서버가 만들면 표현이 바뀔 때마다 서버를 고치게 된다.
- **`attachments` 의 `size`·`mime` 을 비워 두기** — 두 컬럼은 `NOT NULL` 이라 INSERT 가 던지고, 그 예외를 건너뛰기 `catch` 가 삼켜 **첨부가 조용히 사라진다**. `size` 는 `statSync().size`, `mime` 은 상수 `'application/octet-stream'` (§D 9번).
- **게이트웨이에서 확장자로 `mime` 을 판정하기** — 그것은 `SPEC-MSG-001` 의 HTTP 업로드 경로 규칙이다. 게이트웨이는 상수를 쓴다. 두 경로의 차이는 의도된 것이고, "통일" 은 이 SPEC 의 계약을 바꾸는 일이다.
- **첨부 하나가 실패하면 메시지 전체를 버리기** — `spec-v2.md` 8장은 "해당 첨부만 건너뛴다"다. AC-GW-008 이 정상 파일을 섞어 이 구멍을 막는다.
- **파일을 복사가 아니라 이동** — 봇의 작업 디렉터리에서 파일이 사라진다. `copyFileSync` 를 쓴다.
- **허브 발행 관측을 포기하기** — 원본 테스트는 "가로채기 힘들다"며 포기했고, 그래서 `publish` 를 안 부르는 구현도 통과했다. §D 7번의 감싸기로 반드시 관측한다.
- **RED 단계 건너뛰기** — 구현을 먼저 쓰면 AC-GW-020 의 전이 증거를 만들 수 없다.
- **테스트에서 실제 `data/` 쓰기** — `mkdtempSync` 임시 디렉터리를 쓰고 `afterEach` 에서 지운다. AC-GW-018 은 `process.env.MINIDISCORD_DATA_DIR` 을 임시 경로로 지정하고 끝나면 지운다 (`config.dataDir` 이 게터라 성립한다 — `SPEC-ROOM-001` `plan.md` §D 8번).
- **소켓·서버를 안 닫고 끝내기** — 좀비 프로세스가 남아 다음 카드까지 막는다. 모든 테스트가 `ws.close()` + `await app.close()` 로 끝난다.
- **이름만 대고 통과로 적기** — 기본 리포터는 테스트 이름을 출력하지 않으므로, 테스트를 하나도 쓰지 않아도 `npm test -w server` 는 종료 코드 `0` 이다. 통과는 `--reporter=verbose` 출력의 `✓ test/gateway.test.ts > gateway > <이름>` 줄을 직접 보고 판정한다. `-t <이름>` 필터로 대신하지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이다.
- **인자 위치에서 `JSON.parse` 하기** — `handleWsMessage(ws, JSON.parse(String(raw))).catch(…)` 는 파싱 예외를 `.catch` 로 잡지 못한다. 인자는 호출 전에 평가되므로 예외가 프로미스 체인 바깥에서 동기적으로 던져진다. `try/catch` 로 감싼다 (§D 8번).
- **`await wsConnect(...)` 뒤에 리스너를 붙여 프레임을 기다리기** — `welcome` 과 재전송 `message` 는 같은 동기 블록에서 나가고 한 세그먼트로 합쳐지기 쉬워, 그 사이에 프레임이 지나간다. 공통 하네스의 큐를 쓰고, `nextMessage`/`expectNoMessage` 를 우회해 `ws.on('message', …)` 를 직접 붙이지 않는다 (감사 M5).
- **`last_seen_at` 갱신 생략하기** — REQ-GW-001 이 요구하는데 눈에 띄지 않아 빠뜨리기 쉽다. AC-GW-001 이 접속 전 `null` → 접속 후 채워짐으로 관측한다 (감사 M6).
- **"메시지가 왔다"만 단언하기** — 이 SPEC 의 결함은 대부분 **오지 말아야 할 것이 온다**는 형태다(중복 전달, 브로드캐스트, 걸러지지 않은 이력). 긍정 단언만으로는 하나도 잡히지 않는다. `expectNoMessage` 와 대조군을 반드시 쓴다.
- **기준 커밋 없는 `git diff` 로 범위 경계 검사** — M1·M2 커밋 이후에는 `HEAD` 기준으로 아무것도 안 잡히고, 스테이지된 변경은 `--cached` 없이는 보이지 않는다. `spec_base_sha` 를 기준으로 비교한다.
- **빈 출력만 보고 범위 경계 통과로 적기** — 기준 SHA 가 없으면 git 은 오류를 표준 오류로 내고 표준 출력을 비운다. `git rev-parse --verify` 가 종료 코드 `0` 으로 SHA 를 내는 것을 먼저 확인한다.
- **끊김 system 메시지를 슬쩍 추가하기** — §D 1번이 만들지 않기로 기록한 항목이다. 필요하다는 판단은 리드가 한다.
- **`routes-messages.ts`·`permissions.ts` 스텁 만들기** — "어차피 다음에 필요하니까"가 가장 흔한 이유이고, AC-GW-019 가 기계적으로 잡는다.

## §I 상호 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md`, `spec-v2.md` — **이 SPEC 의 유일한 규범 근거**(읽기 전용). 같은 디렉터리의 `plan.md`·`spec.md` 는 폐기된 v1 이며 참조하지 않는다.
- `spec.md` — 이 SPEC 의 GEARS 요구사항(REQ-GW-001..023), 범위 경계, 원본 모순 기록(§7)
- `acceptance.md` — AC-GW-001..020 과 공통 테스트 하네스
- `progress.md` — 단계별 증거 기록처
- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 8 — 원본 (읽기 전용)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 3·6·8·9·10장 — 다중 봇 원칙, 프로토콜, 에러 처리, 보안, 테스트 전략
- `.moai/specs/SPEC-CORE-001/` — 토대 SPEC (스키마·`buildServer`·`config`)
- `.moai/specs/SPEC-BOT-001/` — 선행 SPEC. `plan.md` §B 가 이 SPEC 이 쓰는 토큰 계약을 확정했고, `spec.md` REQ-BOT-006 이 `online` 자리를 비워 뒀다
- `.moai/specs/SPEC-SSE-001/` — 같은 카드 형제 SPEC (`app.hub`). §D 7번의 감싸기가 그 반환 형태에 의존한다
- `.moai/specs/SPEC-MENTION-001/` — 같은 카드 형제 SPEC (`@TO`/`@CC` 파서)
