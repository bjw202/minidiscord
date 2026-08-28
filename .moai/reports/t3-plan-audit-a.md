# 카드 t3 계획 감사 — SPEC-GATEWAY-001 · SPEC-MSG-001

감사자: plan-auditor (독립 감사, M1 Context Isolation 적용)
감사 일자: 2026-08-27
대상: `.moai/specs/SPEC-GATEWAY-001/`, `.moai/specs/SPEC-MSG-001/`
대조 기준: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` (Task 8·9), `spec-v2.md` (§5·6·7·8·9), 그리고 이미 머지된 `server/src/`·`server/test/`

---

## 1. 판정

| SPEC | 판정 | 근거 요약 |
|------|------|-----------|
| **SPEC-GATEWAY-001** | **CONDITIONAL PASS** | 요구사항 23개 / 수용 기준 20개, 번호 연속·중복 없음. GEARS 패턴 준수. 고위험 기준 두 곳(`since_id`, 재접속 중복)이 실제로 방어됨. 반드시 고칠 것 3건 |
| **SPEC-MSG-001** | **CONDITIONAL PASS** | 요구사항 14개 / 수용 기준 14개, 번호 연속·중복 없음. 경로 이탈 방어가 쓰기·읽기 양쪽에 있음. 다만 하네스 결함 하나가 14개 중 12개를 실행 불가능하게 만듦. 반드시 고칠 것 4건 |

두 SPEC 모두 must-pass 방화벽(REQ 번호 일관성, GEARS 형식, YAML frontmatter 12필드, 언어 중립성 N/A, 교차 SPEC 정합, 크로스플랫폼 N/A, `[NEEDS CLARIFICATION]` 미해결 0건)은 통과했다. CONDITIONAL PASS 는 구조가 아니라 개별 기준의 실행 가능성과 관측 범위에서 나온 판정이다.

### 1.1 1축(검증하지 않는 수용 기준) 총평 — 지목된 네 곳은 모두 방어에 성공

리드가 사전 지목한 고위험 지점 네 곳을 스텁 테스트("본문이 빈 구현, 상수를 돌려주는 구현이 이 기준을 통과하는가")로 검사한 결과, **네 곳 모두 통과하지 못한다**. 결함이 아니라 잘 쓴 사례로 기록한다.

- **AC-GW-012 (`since_id` 커서 필터)** — 무필터 대조군을 먼저 보내 걸러 낼 대상이 실재함을 보이고(`control.messages.some(m => m.id <= cursor)`), 응답 전부가 `id > since_id` 인지 `every` 로 확인하며, **대조군과의 건수 차이가 DB 의 커서 이하 건수와 정확히 같은지**까지 단언한다. 필터가 없는 구현도, 빈 배열로 전부 걸러 버리는 구현도 통과할 수 없다.
- **AC-GW-004 (`missed_after_id` 재접속 복구)** — `expectNoMessage(again.ws, 600)` 으로 **오지 않음**을 직접 관측하고 커서 불변까지 본다. "전달됐다" 단언만으로는 중복을 볼 수 없다는 점을 정확히 짚었다.
- **AC-MSG-012 (메시지 API 인증)** — 세 라우트 미인증 `401` 부정 사례에 인증 대조군("모든 요청을 401 로 막는" 구현 배제)과 "거부된 전송은 저장되지 않았다"를 함께 붙였다.
- **AC-MSG-007 / AC-MSG-008 (경로 이탈 방어)** — 크래프트된 입력을 `../../../../etc/passwd` 로 **명시**하고, 쓰기 시점(`basename` 적용 + `resolve(stored_path)` 가 업로드 디렉터리 안 + 파일이 실제로 존재)과 읽기 시점(`404` + 응답 본문에 비밀 내용 부재)을 각각 막는다.

이 부류에서 남은 실질 구멍은 **M3(AC-MSG-009 의 `deliver` 두 번째 인자)** 하나이며, 나머지는 §3 의 부분 미검증 항목이다.

---

## 2. 반드시 고쳐야 할 것 (must-fix)

### SPEC-MSG-001

#### M1 — 공통 하네스의 `set-cookie` 처리가 실제 런타임과 어긋난다 (AC-MSG-001 ~ AC-MSG-012, 열두 기준 전부)

`acceptance.md` 공통 테스트 하네스:

```ts
return { app, cookie: login.headers['set-cookie']![0].split(';')[0], uploadsDir }
```

이미 머지된 `server/test/rooms-bots.test.ts:21-26` 이 이 문제를 명시적으로 기록해 두었다.

```ts
// light-my-request 는 set-cookie 값을 배열이 아니라 문자열 하나로 돌려준다 —
// 원본 테스트가 가정한 첫 값 형태로 정규화 (SPEC-AUTH-001 과 같은 적응, 이탈은 §E.2 에 기록)
function setCookieOf(res: { headers: { 'set-cookie'?: string | string[] } }): string {
  const h = res.headers['set-cookie'] ?? ''
  return Array.isArray(h) ? h[0] : h
}
```

문자열에 `[0]` 을 적용하면 `"m"` 한 글자가 나오고 `.split(';')[0]` 도 `"m"` 이다. 그 값을 쿠키로 보내면 `requireAuth` 가 전부 `401` 을 낸다.

**스텁 테스트 관점**: 이 기준들은 스텁 구현이 통과하는 게 아니라 그 반대다 — **정상 구현조차 통과할 수 없다.** 열두 기준 전부가 `build()` 단계에서 무력화되므로, 이 SPEC 의 수용 기준 체계가 통째로 실행 불가능하다.

**고칠 것**: 하네스를 `const raw = login.headers['set-cookie'] ?? ''; const ck = (Array.isArray(raw) ? raw[0] : raw).split(';')[0]` 형태로 바꾸고, `plan.md §D` 에 8번 항목으로 근거를 남긴다. 형제 SPEC 의 AC-GW-018 은 이 교정을 이미 적용했다(`Array.isArray(raw) ? raw[0] : raw`, "rooms-bots.test.ts 의 build() 와 같다"는 주석까지) — 같은 카드 안에서 한쪽에만 적용된 교정이다.

#### M2 — 프로덕션 배선을 관측하는 기준이 하나도 없다 (REQ-MSG-014 주변의 공백, AC-MSG-013)

`plan.md` M1 단계 3 은 `index.ts` 에 `import multipart from '@fastify/multipart'`, `app.decorate('uploadsDir', config.uploadsDir)`, `await app.register(multipart)`, `registerMessageRoutes(app)`, `declare module 'fastify'` 추가를 지시한다. 그런데

- `spec.md` 에 이를 요구하는 REQ 가 없다. REQ-MSG-014 는 "`index.ts` 하나만 수정한다"는 **금지** 요건일 뿐 배선 요건이 아니다.
- `acceptance.md` 14개 AC 전부가 손으로 조립한 `build()` 앱을 쓴다. **`buildServer()` 를 부르는 테스트가 하나도 없다.**
- `registerMessageRoutes(app: FastifyInstance): void` 시그니처도 어느 REQ 에도 고정돼 있지 않다(형제 SPEC 은 REQ-GW-021 로 `Gateway` 시그니처를 글자 그대로 고정했다).

**스텁 테스트 관점**: `index.ts` 를 **아무 한 줄이나** 건드리기만 하면 AC-MSG-013 4번의 "변경 파일 정확히 두 줄" 조건이 성립하고, 나머지 열세 기준은 손으로 조립한 앱에서 통과한다. 즉 **실제 서버에서 라우트가 등록되지 않아도, multipart 가 등록되지 않아도, `uploadsDir` 이 데코레이트되지 않아도 이 SPEC 은 완료로 판정된다.** 형제 SPEC-GATEWAY-001 은 AC-GW-018 에서 정확히 이것을 막았다(실제 `buildServer()` 기동 → `app.gateway` 다섯 메서드 확인 → HTTP 왕복 → 보관 훅 관측). 같은 카드 안의 비대칭이다.

**고칠 것**: (a) `registerMessageRoutes` 시그니처와 `buildServer` 배선(멀티파트 등록이 라우트 등록보다 앞선다는 순서 포함)을 REQ 로 고정한다. (b) AC-GW-018 과 같은 형태의 배선 AC 를 하나 추가한다 — `buildServer()` 로 띄운 서버가 `POST /api/rooms/:id/messages` 에 `404` 가 아닌 응답을 내는지, `GET /api/attachments/:id` 가 등록돼 있는지.

#### M3 — AC-MSG-009 가 `Gateway.deliver` 의 두 번째 인자를 전혀 단언하지 않는다 (REQ-MSG-010, REQ-MSG-012)

```ts
expect(delivered).toHaveLength(1)
expect(delivered[0][0]).toBe(roomId)
expect(delivered[0][2]).toEqual([{ botId, delivery: 'to' }])
```

인덱스 `1`, 즉 `msg` 객체가 빠져 있다. 게이트웨이는 그 `msg.id` 로 `bot_tokens.last_delivered_id` 를 올린다(`plan-v2.md:1580`).

**스텁 테스트 관점**: `gateway.deliver(roomId, {}, targets)` 처럼 **빈 객체를 넘기는 구현이 이 기준을 통과한다.** 그러면 SPEC-MSG-001 이 스스로 "이 SPEC 이 확정하는 가장 비싼 계약"이라 부른 커서 체계(REQ-MSG-012)가 조용히 깨지고, 봇의 재접속 복구가 잘못된 지점에서 시작한다. 두 SPEC 이 만나는 유일한 이음매인데 그 이음매만 관측되지 않는다. 같은 이유로 `published[0][2]`(SSE 페이로드)도 단언되지 않아 `hub.publish(roomId, 'message', {})` 가 통과한다.

**고칠 것**: `expect(delivered[0][1].id).toBe(저장된 message id)`, `expect(delivered[0][1].author_name).toBe('alice')`, `expect(published[0][2].id).toBe(같은 id)` 를 추가한다.

#### M4 — REQ-MSG-006 · REQ-MSG-007 · REQ-MSG-009 의 "`config.uploadsDir`" 가 수용 기준과 모순된다

세 요건은 업로드 디렉터리를 `config.uploadsDir` 로 규범화한다. 그런데 실제 구현은 `req.server.uploadsDir` 을 읽고(`plan-v2.md:1844`, `plan.md §D 4번`이 이를 확인), AC-MSG-007 은 `build()` 가 데코레이트한 임시 디렉터리(`join(dir, 'up')`)를 기준으로 `resolve(att.stored_path).startsWith(resolve(uploadsDir) + sep)` 를 단언한다.

**스텁 테스트 관점**: 여기서는 반대 방향의 결함이다 — REQ 를 **글자 그대로** 구현하면(`config.uploadsDir` 직독) 테스트 환경에서 `./data/uploads` 에 쓰게 되어 AC-MSG-007 2번·3번이 실패한다. `plan.md` 에만 있는 해소가 `spec.md` 의 규범 문언에 반영되지 않은 상태다.

**고칠 것**: REQ 본문을 "`req.server.uploadsDir` 데코레이터가 가리키는 디렉터리(프로덕션에서는 `config.uploadsDir` 이 그 값)" 로 정정하고, 데코레이터의 존재 자체를 REQ 로 승격한다(M2 와 함께 처리 가능).

### SPEC-GATEWAY-001

#### M5 — 하네스의 `wsConnect` 가 `welcome` 직후 프레임을 흘린다 (AC-GW-003)

`wsConnect` 는 `welcome` 을 받은 `ws.on('message', …)` 리스너 안에서 `resolve` 하고, 테스트는 `await` 이후에야 `nextMessage(ws)` 로 새 리스너를 붙인다. 그런데 `handleHello`(`plan-v2.md:1490-1499`)는 `welcome` 과 재전송 `message` 를 **같은 동기 블록에서** 연속으로 보낸다. 루프백에서 두 프레임은 한 TCP 세그먼트로 합쳐지기 쉽고, `ws` 수신기는 한 청크에 든 프레임들을 같은 스택에서 연속 emit 한다. `resolve()` 의 후속 실행은 마이크로태스크라 그 뒤에 오므로, 재전송 프레임은 `nextMessage` 가 리스너를 붙이기 전에 이미 지나가고 `wsConnect` 의 리스너(=`welcome` 이 아니면 무시)에 삼켜진다 → `timeout waiting ws message`.

**스텁 테스트 관점**: 구현이 틀려서가 아니라 하네스가 틀려서 실패하는 형태다. 정상 구현에서 간헐적으로 실패하고, 재현이 환경에 달려 있어 진단 비용이 가장 비싸다. `plan.md §E` 의 "WebSocket 테스트의 타이밍 의존" 행은 `setTimeout` 만 다루고 이 경로를 다루지 않는다.

**고칠 것**: `wsConnect` 가 접속 시점부터 프레임을 큐에 쌓고, `nextMessage` / `expectNoMessage` 가 그 큐를 먼저 비우게 한다.

```ts
const queue: any[] = []
const waiters: ((m: any) => void)[] = []
ws.on('message', d => {
  const m = JSON.parse(String(d))
  if (m.type === 'welcome') { resolve({ ws, welcome: m }); return }
  waiters.length ? waiters.shift()!(m) : queue.push(m)
})
```

#### M6 — REQ-GW-001 의 `last_seen_at` 갱신을 관측하는 기준이 없다

REQ-GW-001 은 `bot_tokens.last_seen_at` 갱신을 명시적으로 요구한다. 그런데 AC-GW-001 부터 AC-GW-020 까지 어디에도 그 컬럼을 읽는 단언이 없다.

**스텁 테스트 관점**: **`last_seen_at` 갱신을 통째로 생략한 구현이 20개 기준을 전부 통과한다.** 요구사항 하나가 검증되지 않은 채 남는다.

**고칠 것**: AC-GW-001 에 접속 전 `null` → 접속 후 비어 있지 않음의 분별 단언을 더한다.

```ts
expect(db.prepare('SELECT last_seen_at v FROM bot_tokens WHERE room_id=? AND bot_id=?').get(roomA, pm).v).not.toBeNull()
```

#### M7 — 엣지 케이스 표가 인용한 코드로는 나올 수 없는 동작을 적고 있다

`acceptance.md` 엣지 케이스 표:

> 파싱 불가한 JSON 프레임 → 예외가 나고 그 접속이 닫힌다 (`handleWsMessage(...).catch(() => ws.close())`)

인용된 코드는 다음과 같다.

```ts
ws.on('message', raw => { handleWsMessage(ws, JSON.parse(String(raw))).catch(() => ws.close()) })
```

`JSON.parse` 는 `handleWsMessage` 가 **호출되기 전에 인자로 평가**되므로, 그 예외는 프로미스 체인 바깥에서 동기적으로 던져진다. `.catch` 는 잡지 못하고 `ws` 리스너에서 uncaught 로 새어 나간다(vitest 에서는 unhandled error 로 스위트를 오염시킨다).

**스텁 테스트 관점**: 표가 주장하는 동작이 인용한 코드에서 나오지 않으며, 이를 관측하는 AC 도 없다 — 검증되지 않는 채로 **틀린 것이 계약처럼 기록돼 있다.**

**고칠 것**: 구현 지시를 `let msg; try { msg = JSON.parse(String(raw)) } catch { ws.close(); return }` 로 바꾸는 편을 권한다. 표만 고치는 것은 차선이다.

---

## 3. 있으면 좋은 것 (nice-to-have)

1. **AC-GW-019 1번의 파일 목록이 형제 SPEC 과 어긋난다.** `server/src` 에 정확히 아홉 항목이고 `routes-messages.ts` · `permissions.ts` 가 **없어야** 통과다. 반면 AC-MSG-013 1번은 같은 상황을 명시적으로 면제한다("`permissions.ts` 의 존재 여부는 이 기준의 관측 대상이 아니다"). 실행 순서가 어긋나면 GATEWAY 가 자기 통제 밖의 이유로 실패한다. `plan.md §E` 의 마지막 행은 `mention.ts` · `sse.ts` 만 다루고 이 경우를 다루지 않는다. AC-MSG-013 쪽 서술을 채택하는 편이 안전하다 — "이 SPEC 이 만들지 않았다"의 판정은 이미 4번의 base-SHA diff 가 한다.
2. **REQ-GW-010 이 `attachments.size` · `mime` 을 지정하지 않는다.** 두 컬럼 모두 `NOT NULL` 이다(`server/src/db.ts:60-61`). 요건대로만 구현하면 INSERT 가 제약 위반으로 던지고 `handleBotMessage` 의 `catch` 에 삼켜져 첨부가 조용히 사라진다. 원본은 `statSync().size` 와 `'application/octet-stream'` 을 쓴다.
3. **검증되지 않는 잔여 요건들** — REQ-GW-014 의 `limit` 기본값 `100` 과 상한 `500`, REQ-GW-016 의 `author_name` 대체값(`'사용자'` / `'봇'`), REQ-GW-009 의 "첨부가 없으면 빈 배열", REQ-MSG-011 의 `LIMIT 200`, REQ-MSG-001 응답의 `attachments` 배열, REQ-MSG-008 의 응답 `content-type`.
4. **AC-MSG-006 의 `content-disposition` 단언이 접두사만 본다.** `toContain("filename*=UTF-8''")` 는 파일명을 하드코딩한 헤더도 통과시킨다. `encodeURIComponent('첨부.txt')` 결과를 포함하는지 보는 편이 낫다 — 약한 형태의 같은 결함 부류다.
5. **AC-MSG-004 는 `messages` 개수만 센다.** REQ-MSG-004 는 "두 경우 모두 어떤 테이블에도 행을 남기지 않아야 한다"이므로 `message_targets` · `attachments` 도 함께 봐야 AC-MSG-003 과 대칭이 맞는다.
6. **SPEC-MSG-001 의 어느 테스트도 `await app.close()` 를 부르지 않는다.** `createGateway` 가 `WebSocketServer` 를 열고 `onClose` 훅에 정리를 걸어 두는데 그 훅이 실행되지 않는다. 열린 핸들이 남아 vitest 종료가 지연될 수 있다. GATEWAY 는 모든 테스트가 `ws.close()` + `await app.close()` 로 끝나며 `plan.md §E` 가 좀비 프로세스 위험으로 명시했다 — 같은 카드 안의 비대칭이다.
7. **REQ-MSG-006 이 존재하지 않는 표를 참조한다.** "`mime` 은 확장자로 판정하되 **표에 없으면** `application/octet-stream`" — 그 표는 `plan-v2.md:1758-1762` 에만 있고 SPEC 안에는 없다. AC-MSG-006 이 `.txt → text/plain` 을 단언하므로 최소한 그 항목은 SPEC 본문으로 옮겨야 한다.
8. **AC-MSG-007 의 테스트 이름이 동작과 반대다.** `refuses to store an upload outside the uploads directory` 인데 본문은 `200`(정상 저장, 이름만 소독)을 단언한다. `sanitizes an upload filename so it cannot escape the uploads directory` 쪽이 정확하다.

---

## 4. 교차 SPEC 계약 드리프트 (2축)

**한 건도 발견하지 못했다.** 세 계약면을 각각 소유 SPEC 의 시그니처 블록과 대조했다.

| 계약면 | 소유 SPEC | 소비 SPEC | 결과 |
|--------|-----------|-----------|------|
| `parseMentions(body: string): Mention[]`, `Mention = { bot: string; delivery: 'to' \| 'cc' }` | SPEC-MENTION-001 REQ-MENTION-003 | SPEC-MSG-001 §3 | **일치** — 반환 배열, 리터럴 유니온, 소문자 값 매핑까지 글자 단위로 같다 |
| `SseHub.publish(roomId: number, event: string, data: unknown): void` / `subscribe(roomId, res)` | SPEC-SSE-001 REQ-SSE-001 | SPEC-GATEWAY-001 §3 · REQ-GW-010 · REQ-GW-012, SPEC-MSG-001 §3 · REQ-MSG-010 | **일치** — 시그니처와 이벤트 이름(`'message'`, `'bot_status'`) 모두 같다 |
| `Gateway` 다섯 메서드 + `ConnInfo { roomId, botId }` + `MessageRow` | SPEC-GATEWAY-001 REQ-GW-021 | SPEC-PERM-001 §(69-79행), SPEC-MSG-001 §3 · REQ-MSG-010 | **일치** — `plan-v2.md:1188-1197` 과도 같고, `PermissionRequestParams → any` 완화도 세 곳 모두 동일하다 |

**`spec-v2.md` §6 와이어 프로토콜 대조** — 필드 이름 차이 세 건을 찾았으나 **세 건 모두 SPEC-GATEWAY-001 `spec.md §7` 모순 표에 기록되고 해소 방침이 명시돼 있다.** 은폐된 드리프트가 아니라 문서화된 의도적 이탈이다.

| # | 차이 | 처리 |
|---|------|------|
| 1 | `message` 페이로드에 `type` 필드 추가 (`spec-v2.md` §6 에는 없음) | 모든 프로토콜 메시지가 `type` 을 갖는다는 REQ-GW-004 의 일반 규칙 — 계약 위반 아님 |
| 2 | `bot_message.files[]` 가 `{ local_path }`(spec-v2) 대 `{ local_path, name }`(plan-v2) | `spec.md §7` 모순 2번 — `plan-v2` 를 따르되 `name` 은 선택, 상위 호환 |
| 3 | `history_request` / `history_response` 의 `rid` (spec-v2 에는 없음) | `spec.md §7` 모순 3번 — `plan-v2` 를 따름. 한 접속에서 여러 이력 요청을 짝지을 유일한 수단 |

그 밖에 `welcome { room_id, bot_id, bot_name, missed_after_id }`, `message` 의 `files: [{ name, local_path }]`, `status { state }`, `permission_request { request_id, tool_name, description, input_preview }`, `permission_verdict { request_id, behavior }` 는 `spec-v2.md` §6 과 두 SPEC 이 모두 일치한다.

---

## 5. 완전성 (3축) — Task 8 · Task 9 대비

**Task 8 (`plan-v2.md:1174-1644`)**: 누락 없이 덮였다. `spec-v2.md` 8장의 "접속이 끊기면 방에 system 메시지"가 Task 8 의 구현(`ws.on('close', () => conns.delete(ws))`)과 테스트에 전혀 없다는 불일치를 찾아, 계획서를 따라 만들지 않기로 하고 §5 범위 밖으로 명시한 뒤 §7 모순 1번으로 리드 보고 대상에 올린 처리가 적절하다.

**Task 9 (`plan-v2.md:1645-1929`)**: SPEC 이 덮지 못한 것은 두 가지다.

- **프로덕션 배선** — §2 M2 로 보고. `plan.md` 에는 있으나 REQ 도 AC 도 없다.
- **MIME 표** — §3 항목 7 로 보고.

`limits: { fileSize: 100 * 1024 * 1024 }` 누락은 `spec.md §5` 의 "파일 크기 쿼터 범위 밖" 선언과 정합하므로 결함이 아니다.

**요구사항 ↔ 수용 기준 추적성**: REQ-GW-001~023 이 모두 최소 하나의 AC 에 매핑되고, REQ-MSG-001~014 도 마찬가지다. 고아 AC 도 없다. 다만 REQ-GW-001 의 `last_seen_at` 절과 §3 항목 3 의 요건들은 매핑된 AC 가 그 절을 실제로 관측하지 않는 **부분 미검증** 상태다.

---

## 6. 확인한 코드 사실 (근거)

두 SPEC 이 기존 구현에 대해 주장한 확장점은 **모두 실재한다.**

| SPEC 의 주장 | 확인 결과 |
|--------------|-----------|
| `registerRoomRoutes` 가 `onArchive` 훅을 받는다 (REQ-GW-022) | `server/src/routes-rooms.ts:10` — `registerRoomRoutes(app: FastifyInstance, opts?: { onArchive?: (roomId: number) => void }): void` **존재**. `:49` 가 트랜잭션 커밋 뒤 `opts?.onArchive?.(id)` 를 부른다 |
| `GET /api/rooms/:id/invites` 의 `online` 이 상수 `false` 다 (REQ-GW-022) | `server/src/routes-bots.ts:71` — `return rows.map(r => ({ ...r, online: false }))`. `:70` 에 "이 SPEC 범위에서 online 은 항상 false — 실제 판정은 카드 t3 게이트웨이가 채운다" 주석이 그대로 있다 |
| `sha256Hex` 를 `routes-bots.ts` 가 내보낸다 (§3) | `server/src/routes-bots.ts:9` — `export function sha256Hex(s: string): string` **존재** |
| AC-GW-018 이 쓰는 라우트들 | `POST /api/auth/register` · `/login`(auth.ts:29,43), `POST /api/rooms`(routes-rooms.ts:19), `POST /api/rooms/:id/archive`(:28, 성공 시 `{ ok: true }` 200), `POST /api/bots`(routes-bots.ts:33), `POST /api/rooms/:id/invites`(:46, `{ bot_id, bot_name, token, command }` 201) — **전부 존재** |
| 의존성이 이미 설치돼 있다 (§6) | `server/package.json` — `@fastify/multipart ^10.1.1`, `ws ^8.21.3`, `@types/ws ^8.18.1`, `fastify ^5.12.1`, `better-sqlite3 ^13.0.3` **확인** |
| `attachments.size` · `mime` 이 `NOT NULL` 이다 | `server/src/db.ts:60-61` **확인** (§3 항목 2 의 근거) |

---

## 7. 검증하지 않은 것 (명시)

- **테스트를 실행하지 않았다.** `npm test -w server` 도 `npm run typecheck -w server` 도 돌리지 않았다. M1(`set-cookie`)과 M5(프레임 경합)는 코드 대조와 `server/test/rooms-bots.test.ts:21-26` 의 기존 주석에 근거한 판정이며 **실행 관측이 아니다.** 특히 M5 는 두 프레임이 한 TCP 세그먼트로 합쳐지는지에 달려 있어 환경에 따라 재현되지 않을 수 있다.
- **`mention.ts` · `sse.ts` · `gateway.ts` · `routes-messages.ts` 는 아직 존재하지 않는다.** `server/src` 에는 `auth.ts`, `config.ts`, `db.ts`, `index.ts`, `routes-bots.ts`, `routes-rooms.ts` 여섯 파일뿐이다. 두 SPEC 이 형제 SPEC 산출물에 거는 가정은 그 SPEC **문서만** 읽고 판정했고, 실제 코드로는 확인할 수 없었다.
- **`progress.md` 두 개를 열어 보지 않았다.** 아직 run 단계 진입 전이라 `§E.1`(`spec_base_sha`)과 `§E.2`(Run-phase Evidence)가 비어 있을 것으로 보이나, 내용을 확인하지 않았다. `.spec-base-sha` 파일의 존재 여부도 확인하지 않았다.
- **선행 SPEC 본문 전체**(SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001, SPEC-BOT-001)를 읽지 않았다. 두 SPEC 의 §3 "받아 쓰는 것" 표는 실제 소스 코드로 대조했고, 선행 SPEC **문서**와의 문구 일치까지는 대조하지 않았다.
- **`spec-v2.md` 5 · 7 · 8 · 9장과 `plan-v2.md` 1-77행(Global Constraints)** 은 부분적으로만 읽었다. §6 와이어 프로토콜과 Task 8 · Task 9 본문은 전문을 읽었다.
- **SPEC-PERM-001 의 `index.ts` 수정 범위**를 확인하지 않았다. 세 SPEC(GATEWAY · MSG · PERM)이 모두 `index.ts` 를 고치므로 base-SHA diff 의 줄 수 기준이 실행 순서에 의존하는데, PERM 쪽 기대 파일 목록은 열어 보지 않았다. §3 항목 1 은 이 미확인 위에 선 판단이다.
- **`createSseHub()` 의 반환 형태**(하네스가 `hub.publish` 를 재할당으로 감쌀 수 있는지)를 코드로 확인하지 않았다. `sse.ts` 가 아직 없어 확인할 수 없었다. 다만 GATEWAY `plan.md §D 7번`과 `§E` 위험 표가 이 위험(프로토타입 메서드 · frozen 객체)을 이미 식별하고 프록시 대안을 준비해 두었으므로 결함으로 보고하지 않는다.
- **SPEC 파일은 하나도 수정하지 않았다.** 읽기 전용 감사다.

---

## 8. 후속 조치 권고

1. M1 을 먼저 고친다 — 가장 싸고, 고치지 않으면 SPEC-MSG-001 의 run 단계 전체가 첫 테스트에서 멈춘다.
2. M2 · M3 을 함께 처리한다 — 둘 다 "이음매를 관측하지 않는다"는 같은 뿌리이고, 배선 AC 하나가 M2 를 닫으면서 M3 의 커서 계약도 실서버에서 한 번 더 확인된다.
3. M5 는 M1 다음으로 우선한다 — 간헐적 실패는 진단 비용이 가장 비싸며, 하네스 열 줄 수정으로 원천 차단된다.
4. M4 · M6 · M7 은 문서·단언 한두 줄 수정이므로 위 셋과 같은 커밋에 묶어도 무방하다.
5. §3 의 여덟 항목은 리드 재량이다. 그중 항목 1(AC-GW-019 파일 목록)과 항목 2(`size` · `mime` 미지정)는 run 단계에서 실제 실패를 낼 수 있으므로 우선순위가 높다.

---

감사 종료. 판정: **SPEC-GATEWAY-001 CONDITIONAL PASS**, **SPEC-MSG-001 CONDITIONAL PASS**.
