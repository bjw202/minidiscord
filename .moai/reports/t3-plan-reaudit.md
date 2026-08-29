# 카드 t3 계획 재감사 — 적용된 12건 검증

- 감사자: plan-auditor (독립 재감사, 읽기 전용)
- 감사 일자: 2026-08-27
- 범위: `.moai/reports/t3-plan-audit-a.md` §2 (M1..M7) + `.moai/reports/t3-plan-audit-b.md` §4 (MF-1..MF-5) = 12건
- 대상: `.moai/specs/SPEC-MSG-001/`, `SPEC-GATEWAY-001/`, `SPEC-PERM-001/`, `SPEC-SSE-001/` (+ 회귀 대조용 `SPEC-MENTION-001/`)
- 대조 기준: `.moai/plan/2026-08-26-minidiscord/plan-v2.md`, `spec-v2.md`, 머지된 `server/src`·`server/test`

---

## 0. 쉬운 말 요약

지적받은 12건은 **전부 실제로 고쳐져 있었습니다.** 저자들이 `progress.md` 에 적은 주장을 믿지 않고 `spec.md`·`plan.md`·`acceptance.md` 의 현재 본문을 하나씩 대조해 확인했습니다. 특히 주 결함 두 건 — 실서버 배선을 관측하지 않던 M2 와, 가로채기가 없어도 통과하던 MF-2 — 은 형식적으로만 고친 것이 아니라 **잘못된 구현이 실제로 걸리는 형태**로 바뀌었습니다.

다만 회귀 훑기에서 **새로 막아야 할 것 한 건**을 찾았습니다. `SPEC-PERM-001` 의 공통 테스트 하네스가 M1 과 **똑같은 `set-cookie` 결함**을 그대로 안고 있습니다. M1 교정은 MSG·GATEWAY·SSE 세 곳에 적용됐는데 PERM 한 곳만 빠졌고, 그 결과 PERM 의 수용 기준 14개 중 10개가 정상 구현에서도 `401` 로 실패합니다. 감사자 B 가 PERM 을 볼 때 이 결함 부류가 아직 보고되기 전이라 훑기 대상이 아니었던 것으로 보입니다. 한 줄 수정이면 닫힙니다.

그래서 카드 전체 판정은 **CONDITIONAL PASS** 입니다 — 12건은 닫혔고, 새로 찾은 blocking 1건만 닫으면 run 단계로 넘어갈 수 있습니다.

---

## 1. 12건 해소 판정표

| # | 대상 | 판정 | 확정 근거 (현재 본문) |
|---|------|------|----------------------|
| M1 | MSG 하네스 `set-cookie` | **RESOLVED** | `acceptance.md:63-66` 에 `setCookieOf` 가 `rooms-bots.test.ts:21-26` 과 같은 형태로 있고, `:84` 가 `cookie: setCookieOf(login).split(';')[0]` 를 돌려준다 |
| M2 | MSG 프로덕션 배선 미관측 | **RESOLVED** | `spec.md` §4.4 **REQ-MSG-015** 신설(시그니처 고정 + 배선 4항목 + "multipart 등록이 라우트 등록보다 앞선다"), `acceptance.md:568-601` **AC-MSG-015** 가 `await import('../src/index.js')` → `buildServer()` 로 **실제 서버를 띄운다**. 손조립 앱이 아니다 |
| M3 | AC-MSG-009 `deliver` 2번째 인자 | **RESOLVED** | `expect((delivered[0][1] as any).id).toBe(messageId)` · `.body` · `.author_name`, 그리고 `published[0][2].id`·`.author_name` 까지 단언 |
| M4 | REQ-MSG-006/007/009 의 `config.uploadsDir` 모순 | **RESOLVED** | `spec.md:132` "업로드 디렉터리의 정의" 상자 — `req.server.uploadsDir` 기준, "구현은 `config.uploadsDir` 을 직접 읽어서는 안 된다" 금지 명시. 데코레이터 존재는 REQ-MSG-015 항목 1 로 승격, AC-MSG-015 1번이 관측 |
| M5 | GW 하네스가 `welcome` 직후 프레임을 흘림 | **RESOLVED** | `acceptance.md:105-155` — `Inbox`(`WeakMap`) 큐. `wsConnect` 가 접속 시점부터 쌓고, `nextMessage` 는 큐를 먼저 비우며, `expectNoMessage` 는 **큐에 이미 쌓인 프레임도 실패**로 다룬다 |
| M6 | REQ-GW-001 `last_seen_at` 미관측 | **RESOLVED** | AC-GW-001 에 `seenAt()` 헬퍼 + `expect(seenAt()).toBeNull()` (접속 전) → `expect(seenAt()).not.toBeNull()` (접속 후) 전후 분별 |
| M7 | 엣지 표가 인용 코드로 나오지 않는 동작을 기술 | **RESOLVED** | 표만 고치지 않고 계약을 고쳤다 — `spec.md` REQ-GW-004 에 "파싱 예외가 처리되지 않은 채 새어 나가서는 안 된다" 명문화, `plan.md` §D 8번이 `try { msg = JSON.parse(...) } catch { ws.close(); return }` 지시, `plan.md` §H 안티패턴, **AC-GW-002 5번**이 `'{이건 JSON 이 아니다'` 로 직접 관측 |
| MF-1 | AC-PERM-003 이 정상 구현도 실패시킴 | **RESOLVED** | 하네스에 `openStream`/`readFrame`(`\n\n` 까지 수집) 추가. AC-PERM-003 이 `readFrame` 을 두 번 부르고 첫 번째로 `connected` 주석을 소비한 **뒤에** `onGatewayRequest` 를 일으킨다(순서가 load-bearing 임을 본문에 기록) |
| MF-2 | AC-PERM-010 이 가로채기 없는 구현도 통과 | **RESOLVED** | 새 테스트 `falls through non-matching text and unknown ids without touching the pending request` — 마지막 두 단언(`author_type='user'` 행 수 `2`, 그리고 이어지는 `yes abcde` 가 `consumed_by === 'permission'`)이 **가로채기 없는 구현·항상 false 껍데기를 실제로 배제**한다. 원본 두 테스트는 회귀선으로만 남고 판정 대상이 아님을 명시 |
| MF-3 | PERM 하네스에 `reply.hijack()` 누락 | **RESOLVED** | `acceptance.md:79` — `reply.hijack()` 이 `hub.subscribe` **앞**에 있고 `SPEC-SSE-001 REQ-SSE-003` 근거 주석이 붙었다. 머리말도 "세 가지"→"네 가지"로 동기화 |
| MF-4 | AC-SSE-010 절대 파일 열거 | **RESOLVED** | `REQ-SSE-010`(`spec.md:151-156`)에서 절대 열거를 걷어내고 판정을 `spec_base_sha` 상대 diff(관측 4)로 이관. AC-SSE-010 관측 1은 `sse.ts` 존재만 보고 형제 파일은 판정 대상에서 제외 |
| MF-5 | PERM 하네스가 listen 서버를 정리하지 않음 | **RESOLVED** | `cleanups` 목록 + `afterEach` 역순 실행(`acceptance.md:58-65`), `build()`/`wsConnect`/`openStream` 이 각자 등록. 시나리오 본문에 `app.close()`·`ws.close()` 가 **한 줄도 남아 있지 않음**(grep 결과 하네스 내부 2건뿐) |

**12건 중 RESOLVED 12, PARTIALLY RESOLVED 0, NOT RESOLVED 0.**

리드가 특히 지목한 두 건에 대한 별도 확인:

- **M2** — AC-MSG-015 는 `const { buildServer } = await import('../src/index.js'); const app = await buildServer()` 로 **진짜 프로덕션 조립 경로**를 탄다. 네 관측이 배선 조각을 하나씩 맡고, 특히 4번은 상태 코드 `404` 만 보면 "등록됨"과 "미등록"이 같은 값이 되는 것을 스스로 짚어 `dl.json().message` 가 Fastify 기본 미등록 응답이 아닌지까지 본다. `buildServer` 는 `server/src/index.ts:18` 에 실재하고 `config.dataDir`·`uploadsDir` 이 게터라 `MINIDISCORD_DATA_DIR` 주입도 성립한다(`server/src/config.ts:5-7` 확인).
- **MF-2** — 가로채기가 통째로 없는 구현은 마지막 `expect(real.json().consumed_by).toBe('permission')` 에서 반드시 걸린다. 앞의 부정 단언만으로는 못 걸린다는 것을 기준 본문이 스스로 적어 두었다. 요구했던 "잘못된 구현이 실제로 실패하는가"를 충족한다.

---

## 2. 회귀 및 새로 찾은 결함

### R-1 (blocking, critical) — `SPEC-PERM-001` 하네스가 M1 과 같은 `set-cookie` 결함을 그대로 갖고 있다

- **대상**: `.moai/specs/SPEC-PERM-001/acceptance.md:91` (`build()` 의 반환)
- **현재 본문**:

```ts
return { app, broker, gateway, port, cookie: login.headers['set-cookie']![0].split(';')[0] }
```

- **왜 결함인가**: `light-my-request` 는 `set-cookie` 를 배열이 아니라 **문자열 하나**로 돌려준다 — 이미 머지된 `server/test/rooms-bots.test.ts:21-26` 이 `setCookieOf` 헬퍼와 주석으로 그 사실을 기록해 두었다. 문자열에 `[0]` 을 적용하면 `"m"` 한 글자가 나오고 `.split(';')[0]` 도 `"m"` 이므로, 그 값을 쿠키로 보내는 모든 요청이 `requireAuth` 에서 `401` 이 된다. M1 과 **글자 단위로 같은 결함**이다.
- **영향 범위**: `post(app, …)` 또는 `openStream(…)` 을 쓰는 기준 열 개 — **AC-PERM-003·004·005·006·007·008·009·010·011·012**. 구현이 완벽해도 실패한다. MF-1·MF-2 로 이번에 고친 두 기준도 이 결함 아래에서는 실행되지 못한다.
- **왜 지금까지 안 잡혔나**: M1 은 감사 보고서 A(MSG·GATEWAY 담당)의 지적이고 PERM 은 보고서 B 담당이라, 결함 부류가 SPEC 경계를 넘어 전파되지 않았다. MSG·GATEWAY·SSE 세 곳은 각각 교정됐다(`SPEC-SSE-001/acceptance.md:50-54` 는 자체 훑기로 스스로 찾아 고쳤다). PERM 만 남았다.
- **고칠 것**: 형제 세 SPEC 과 같은 `setCookieOf` 헬퍼를 하네스에 두고 `cookie: setCookieOf(login).split(';')[0]` 으로 바꾼다. 한 줄 수정이다.

### 회귀 훑기 결과 — 나머지

편집으로 **약해진 기준은 없다.** 확인 방식은 아래와 같다.

| 확인 대상 | 결과 |
|---|---|
| GW 하네스 교체(M5)가 `expectNoMessage` 를 쓰는 AC-GW-003·004·005·015 에 미친 영향 | **강해졌다.** 이전에는 대기 시작 전에 도착한 과잉 전송을 못 봤으나, 이제 큐에 쌓인 프레임도 실패로 다룬다 |
| AC-GW-019 관측 1 의 의도적 약화 | **수용 가능.** 절대 열거를 뺀 대신 판정은 관측 4(`git diff --name-only` 가 정확히 `gateway.ts`·`index.ts`·`routes-bots.ts` 세 줄)가 진다. 양성 단언이라 검증력이 유지된다 |
| AC-SSE-010 관측 1 의 의도적 약화 | **수용 가능.** 같은 구조로 관측 4(정확히 `index.ts`·`sse.ts` 두 줄)가 판정을 진다. 감사가 제안한 음성 열거를 쓰지 않은 이유(그것도 실행 순서에 매이고 빈 구현을 통과시킨다)가 본문에 기록돼 있고, 그 판단이 옳다 |
| PERM 정리 일원화(MF-5)가 개별 시나리오에 미친 영향 | **문제 없음.** 시나리오 본문에서 `ws.close()`·`app.close()` 가 전부 제거됐고, 남은 두 건은 하네스 내부의 `cleanups.push` 뿐이다. `afterEach` 가 역순 실행 후 `db.close()` 로 넘어가는 순서도 옳다 |
| MSG 하네스 교정이 나머지 열네 기준에 미친 영향 | **문제 없음.** `build()` 반환 형태만 바뀌었고 호출부는 그대로다 |
| PERM AC-PERM-011·012 (NH-3·NH-4 반영) | **강해졌다.** 011 에 `toContain('전달하지 못했습니다')` 양성 단언, 012 에 `N FGHIJ → behavior: 'deny'` 갈래 추가 |
| REQ 번호 연속성 (편집 후) | **이상 없음.** `REQ-MSG-001..015`(15개, 결번·중복 없음), `REQ-SSE-001..011`, `REQ-PERM-001..014`, AC-MSG 15개 |

---

## 3. 남아 있는 공허하거나 약한 기준

R-1 을 제외하면 **정상 구현을 통과시키면서 스텁도 통과시키는 기준은 찾지 못했다.** 아래 셋은 공허하지는 않으나 검증력이 상대적으로 얇은 자리이며, 전부 optional 로 분류한다.

| ID | 분류 | 내용 |
|---|---|---|
| AC-PERM-001 | optional | 판정 관측 대상이 `plan-v2.md` Task 10 **원본 테스트의 `✓` 줄**이다. 본문이 그 테스트의 단언(`body` 가 `'abcde'`·`'Bash'` 포함)을 서술하지만 SPEC 이 그 코드를 소유하지 않는다 — MF-2 가 지적한 것과 같은 형태의 의존이다. 다만 그 원본 테스트에는 실제 단언이 있으므로 MF-2 만큼 공허하지는 않다 |
| AC-MSG-004 | optional | 감사 A §3-5 그대로 미해결 — `messages` 개수만 세고 `message_targets`·`attachments` 는 보지 않는다. 저자가 `progress.md` 에 미해결로 명시 |
| AC-MSG-006 | optional | 감사 A §3-4 그대로 미해결 — `content-disposition` 을 접두사(`filename*=UTF-8''`)로만 본다. 파일명을 하드코딩한 헤더도 통과 |

또한 감사 A §3-2(REQ-GW-010 이 `attachments.size`·`mime` 을 지정하지 않는데 두 컬럼이 `NOT NULL` — `server/src/db.ts:60-61`)는 **리드 범위 밖으로 미반영**이며, GATEWAY 저자가 `progress.md` 에 판단 요청으로 올려 두었다. 이것은 공허한 기준이 아니라 **run 단계에서 AC-GW-007 이 실패할 실질 위험**이다(첨부 행이 없어 `att` 가 `undefined`). 판단이 필요하다.

---

## 4. 교차 SPEC 계약 드리프트

**편집으로 생긴 드리프트는 한 건도 없다.** 세 계약면을 소유 SPEC 본문과 소비 SPEC 본문에서 각각 다시 읽어 대조했다(`SPEC-MENTION-001` 포함 — 이 SPEC 의 `spec.md`·`plan.md`·`acceptance.md` 는 이번 라운드에 **수정되지 않았다**. 갱신된 것은 `progress.md` 뿐이다).

| 계약면 | 소유 | 소비 | 결과 |
|---|---|---|---|
| `parseMentions(body: string): Mention[]`, `Mention = { bot; delivery: 'to' \| 'cc' }` | MENTION `spec.md:90` | MSG `spec.md:78`·REQ-MSG-002 | **일치** |
| `SseHub.subscribe(roomId, res)` / `publish(roomId, event, data)` | SSE `spec.md:92-93` | GATEWAY `spec.md:68`, MSG `spec.md:79`·REQ-MSG-010, PERM `spec.md:69` | **일치** |
| `Gateway` 5개 메서드 + `ConnInfo` + `MessageRow` | GATEWAY REQ-GW-021 (`spec.md:169-184`) | PERM `spec.md:77-79`(축약 없이 그대로 인용), MSG REQ-MSG-010 | **일치** — `setPermissionHandler` 의 `params: any` 완화까지 같다 |
| `reply.hijack()` → `hub.subscribe` 순서 (SSE REQ-SSE-003) | SSE | PERM 하네스 | **일치로 복구** (MF-3) |
| `uploadsDir` 배선 | MSG REQ-MSG-015 항목 1 (`app.decorate('uploadsDir', config.uploadsDir)`) | GATEWAY REQ-GW-022 (`createGateway(app, { uploadsDir: config.uploadsDir })`) | **일치** — 같은 값을 가리키며 서로 덮어쓰지 않는다 |
| `POST /api/rooms/:id/messages` 응답 | MSG REQ-MSG-001 (`{ ok, message }`) | PERM REQ-PERM-005 (`{ ok: true, consumed_by: 'permission' }` 로 가로채기) | **모순 없음** — PERM 이 저장 전에 가로채는 별도 경로이고, AC-PERM-010 의 `consumed_by).toBeUndefined()` 도 MSG 의 정상 응답과 정합 |

---

## 5. 최종 판정

**카드 t3 전체: CONDITIONAL PASS**

- 지적 12건은 전부 닫혔고, 그중 주 결함 부류 두 건(M2·MF-2)은 형식이 아니라 **검증력** 기준으로도 닫혔다.
- 남은 blocking 은 **R-1 한 건**이다. `SPEC-PERM-001` 하네스 한 줄을 `setCookieOf` 형태로 바꾸면 닫힌다. 그 전에는 PERM 의 열 기준이 정상 구현에서도 실패하므로 run 단계 진입을 권하지 않는다.
- 그 외에 판단이 필요한 것: 감사 A §3-2(`attachments.size`·`mime` 미지정)는 run 단계 실패 위험이 실재하므로 리드 판단이 필요하다. §3 표의 세 항목은 optional 이며 진입을 막지 않는다.

---

## 6. 검증하지 않은 것 (명시)

- **어떤 명령도 실행하지 않았다.** `npm test -w server`·`npm run typecheck` 를 돌리지 않았고, 이 워크트리에 `node_modules` 도 없다. R-1 의 판정은 `server/test/rooms-bots.test.ts:21-26` 의 기존 코드·주석과 문서 대조에 근거한 것이며 **실행 관측이 아니다.**
- **M5·MF-1 의 타이밍 결함은 재현하지 않았다.** 두 프레임이 한 TCP 세그먼트로 합쳐지는지는 환경에 달려 있다. 큐/`readFrame` 교정이 두 경우 모두에서 옳다는 것은 코드 논리로만 확인했다.
- **`gateway.ts`·`sse.ts`·`mention.ts`·`routes-messages.ts`·`permissions.ts` 는 아직 존재하지 않는다.** `server/src` 에는 `auth.ts`·`config.ts`·`db.ts`·`index.ts`·`routes-bots.ts`·`routes-rooms.ts` 여섯 파일뿐이다(직접 확인). 이 SPEC 들이 형제 산출물에 거는 가정은 **문서만** 대조했다.
- **전수 스텁 훑기를 61개 기준 전부에 새로 적용하지는 않았다.** 편집이 닿은 기준과 그 이웃(MSG 15개 전부, GW 001·002·003·004·007·008·019, PERM 001·002·003·010·011·012, SSE 010)은 본문까지 읽었고, 나머지(GW 005·006·009~018, PERM 004~009·013·014, SSE 001~009·011·012)는 두 원 감사가 전수 훑기를 마쳤다는 기록에 의존해 **편집 영향 여부만** 확인했다. 편집이 공통 하네스와 개별 기준 본문에 국한되므로 이 범위가 회귀를 덮는다고 판단했으나, 전수 재검이 아님을 명시한다.
- **`plan.md` 는 전문을 읽지 않았다.** M7·MF-1·MF-5 관련 §D·§E·§H 항목과 MSG §D 8·9번의 존재는 grep 으로 확인했고, 각 SPEC 의 `plan.md` 전체를 통독하지는 않았다.
- **`spec-v2.md`·`plan-v2.md` 는 이번 라운드에 다시 읽지 않았다.** 원 감사 두 건이 이미 대조한 결과를 근거로 삼았고, 재감사는 편집 델타에 한정했다(감사 B 가 명시한 "MF 델타만 보면 된다"는 재감사 범위 권고를 따랐다).
- **SPEC 파일은 하나도 수정하지 않았다.** 읽기 전용 감사다.
