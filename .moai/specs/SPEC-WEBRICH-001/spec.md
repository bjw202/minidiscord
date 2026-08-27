---
id: SPEC-WEBRICH-001
title: "minidiscord 웹 UI — 첨부 표시·봇 초대 다이얼로그·권한 승인 버튼"
version: "0.3.0"
status: in-progress
created: 2026-08-27
updated: 2026-08-27
author: manager-spec
priority: P1
phase: "v0.1.0 target"
module: "web/"
lifecycle: spec-anchored
tags: "web-ui, attachments, bot-invite, permission-relay, one-time-token, jsdom, contract-agreement"
tier: M
depends_on: [SPEC-WEBSHELL-001, SPEC-WEBCHAT-001, SPEC-MSG-001, SPEC-PERM-001, SPEC-BOT-001, SPEC-GATEWAY-001]
---

# SPEC-WEBRICH-001 — 웹 UI 리치 표면 (첨부·초대·권한 버튼)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-27 | 최초 작성. `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 17 에서 도출 (칸반 카드 `t5`, 마일스톤 M5). 요구사항 16개·수용 기준 16개로 Tier M 상한(16/16)을 정확히 채운다. 원본 Task 17 의 코드 블록을 실제 서버 코드(`permissions.ts`·`routes-messages.ts`·`routes-bots.ts`)와 대조해 결함 열 건을 찾았고 전부 `plan.md` §D 에 기록한 뒤 의도적으로 이탈했다 — 그 가운데 **가장 무거운 것은 권한 요청 ID 파서**다. 원본의 `/[a-km-z]{5}/.exec(m.body)?.[0]` 는 요청 본문 아무 곳의 첫 다섯 글자를 집으므로 실제 `request_id` 가 아닌 값을 보내고, 서버는 그 답을 조용히 흘려보내 **대기 중인 Claude Code 세션이 영원히 멈춘다**. | manager-spec |
| 0.2.0 | 2026-08-27 | **plan 단계 감사 교정 라운드.** 근거: `.moai/reports/t5/plan-audit.md` (plan-auditor 독립 감사, 2026-08-27, HEAD `6e9a167`). 이 SPEC 판정은 **CONDITIONAL PASS**, 카드 `t5` 세 SPEC 을 잇는 통합 표면 판정은 **FAIL**. 이 SPEC 에 배정된 MUST-FIX 세 건(MF-5·MF-7·MF-8)과 관찰 O-2·O-3·O-5·O-6 을 고쳤고, `SPEC-WEBSHELL-001` v0.2.0 `spec.md` §4.8(REQ-WEBSHELL-015)의 여섯 계약에 합치시켰다. ① **MF-5** — `rich.decorate` 이음매를 소비자가 일방적으로 발명한 상태였다. 이제 **호출 자리와 등록 지점은 `SPEC-WEBCHAT-001` 이 소유**하고, 이 SPEC 은 그 훅에 끼울 함수만 공급한다. REQ-001 이 `decorate` 를 이름·시그니처·요소 계약까지 명시하고 `RichContext` 를 비롯한 형 여덟 개를 정의한다. ② **MF-7** — AC-014 가 토큰 로딩을 `web/index.html` 에서 확인했다. 계약 5는 로딩 경로를 `web/style.css` 의 `@import` 하나로 확정하고 `index.html` 에는 그 문자열이 **없다**고 못 박으므로, 옳은 구현이 항상 실패하는 기준이었다. 대상을 `web/style.css` 로 바꿨다. ③ **MF-8** — REQ-002 를 관측하는 기준이 없었다. AC-016 에 `renderMessage` 범위 diff 관측을 더해 REQ-002 가 실제로 관측되게 했다(기준 수는 16 그대로 — 새 AC 를 만들지 않고, 이미 REQ-002 에 매핑돼 있으면서 아무것도 관측하지 않던 AC-016 을 강화했다). ④ **O-2** — `<script type="module">` 배선이 범위 밖 절과 `plan.md` §F M3 에 이중으로 적혀 모순이었다. 소관은 `SPEC-WEBSHELL-001` 이며 `plan.md` M3 항목과 §E 위험 3을 삭제했다. ⑤ **O-3** — REQ-006 이 "마지막 일치"를 말하면서 정규식에 `g` 가 없었다. `gm` + `matchAll` 로 문면과 동작을 일치시켰다. ⑥ **O-5** — §H 8번이 `vitest.config.ts` 생성을 금지해 `SPEC-WEBSHELL-001` 의 대안 경로와 어긋났다. "새로 만들지 않는다 / 형제가 이미 만들었으면 바꾸지 않고 따른다"로 고쳤다. ⑦ **O-6** — `applyInviteResult`·`buildAttachmentNode` 의 형이 수용 기준의 테스트 코드와 어긋나 `typecheck` 게이트가 붉어질 수 있었다. `InviteNodes` 를 구조적 형으로 정의하고 AC-009 의 null 처리를 명시했다. 그리고 열여섯 기준을 **카드 전체 범위에서 두 방향으로** 다시 훑었다(`plan.md` §E.2). 코드로 확인된 drift 네 건(권한 `request_id` 의 `comma` 오파싱, 첨부 `mime` 부재, 판정 결과 재렌더로 되살아나는 버튼, 비보안 오리진 클립보드 실패)은 감사가 서버 코드 대조로 사실임을 확인했으므로 **전부 그대로 유지한다**. | manager-spec |
| 0.3.0 | 2026-08-27 | **plan 단계 감사 교정 라운드 3 (최종).** 근거: `.moai/reports/t5/plan-audit-b.md` (plan-auditor 독립 재감사, 2026-08-27). 이 SPEC 판정은 **FAIL**, 카드 `t5` 통합 표면 판정도 **FAIL**. 델타 세 건을 고쳤다. ① **MF-9 (BLOCKING)** — 장식 훅의 마지막 한 줄(배선)이 어느 SPEC 의 요구사항에도 수용 기준에도 없었고, 이 문서가 적어 둔 배선은 **넘기는 값이 형제 계약과 어긋났다.** 형제는 `registerMessageDecorator(factory)` 에 팩토리를 요구하는데 이 문서는 세 곳에서 `createRichContext({ api, doc }).decorate`(이미 만들어진 함수)를 넘긴다고 적었다 — 그대로 구현하면 `openRoom` 이 `decorate({api, doc}, undefined)` 를 부르고 그 반환 `undefined` 가 방의 컨텍스트가 되어 첫 메시지에서 `TypeError` 로 죽거나, 널 가드가 있으면 첨부와 권한 버튼이 **아무 오류 없이 영원히 안 뜬다.** 게다가 인스턴스가 하나뿐이라 `resolved`·`pending` 이 방을 넘어 살아남아 팩토리를 둔 목적 자체가 무효가 된다. 값을 `createRichContext` **그 자체**로 정정하고, 배선을 REQ-WEBRICH-002 본문으로 승격했으며(새 REQ 를 만들지 않았다 — Tier M 16/16), `AC-WEBRICH-016` 관측 4가 정적·행위 양쪽으로 그것을 관측한다. 같은 문장을 `SPEC-WEBCHAT-001` v0.3.0 이 글자 그대로 함께 싣는다. ② **MF-10** — `AC-WEBRICH-016` 이 기준 SHA 없이 **조용히 통과**했다. `.spec-base-sha` 가 없으면 `git diff` 가 `fatal:` 을 표준 오류로 내고 표준 출력은 비므로 세 관측이 전부 성립해 버린다. 형제 둘이 이미 쓰던 `git rev-parse --verify` 가드를 관측 0 으로 올리고, base 시점 `web/app.js` 존재와 `renderMessage` 범위 비어 있지 않음을 관측 3 의 선행 조건으로 못 박았다(감사 O-10·O-11 의 미완성 awk 와 좁은 정규식도 함께 고쳤다). ③ **MF-11** — 허용 집합에 `server/vitest.config.ts` 를 더하고 `§6` DOM 환경 행에 대체 경로를 명시했다(형제 둘과 동일). 그리고 감사 권고 3에 따라 열여섯 기준을 **세 번째 물음 — "이 기준이 실패가 아니라 *공허*로 무너지는 입력이 있는가"** — 로 전수 훑고 결과를 `plan.md` §E.3 에 남겼다. | manager-spec |

---

## 1. 배경과 목적

카드 `t5` (마일스톤 M5)는 `plan-v2.md` 의 Task 15·16·17 을 담는다. 이 SPEC 은 그 가운데 **Task 17 하나**만 맡는다.

Task 15(`SPEC-WEBSHELL-001`)가 로그인·방 목록·`api()`·`state` 라는 바닥을 깔고, Task 16(`SPEC-WEBCHAT-001`)이 채팅 영역·SSE 수신·`@` 자동완성·기본 `renderMessage` 를 올린다. 그 위에 이 SPEC 이 세 가지를 얹는다.

1. **첨부 표시** — 메시지에 딸려 온 파일을 화면에 보여 준다. 이미지는 그 자리에 펼쳐 보이고, 그 밖의 파일은 눌러서 받는 링크로 보여 준다.
2. **봇 초대 다이얼로그** — 방에 봇을 부르고, 서버가 딱 한 번 내려 주는 세션 실행 명령(토큰 포함)을 보여 주고 복사시킨다.
3. **권한 승인 버튼** — 봇이 도구 사용 승인을 구할 때 방에 뜨는 system 메시지에 `승인`·`거절` 버튼을 붙인다.

세 가지 가운데 **권한 승인 버튼이 이 SPEC 에서 가장 위험한 표면**이다. 나머지 둘은 틀리면 화면에서 바로 보이지만, 권한 버튼은 틀려도 화면상으로는 멀쩡해 보인다 — 버튼은 눌리고, 요청은 200 으로 돌아오고, 그런데 저 반대편에서 승인을 기다리던 Claude Code 세션은 아무 소식도 받지 못한 채 멈춰 있다. 이 SPEC 의 수용 기준이 화면 관찰이 아니라 **실제 서버·실제 WebSocket 을 지나는 계약 합치 검사**로 짜인 이유가 그것이다.

이 SPEC 이 끝나면 이런 상태가 된다.

```
봇 세션 ──permission_request──▶ 게이트웨이 ──▶ 브로커 ──system 메시지──▶ 방
                                                                        │
                                                          [승인] [거절] │ ← 이 SPEC
                                                                        ▼
방 ──POST /messages "yes <id>"──▶ 브로커 ──permission_verdict──▶ 봇 세션
```

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 첨부(attachment) | 메시지에 딸린 파일. 서버가 메시지 봉투에 `attachments: [{ id, filename }]` 로 실어 보낸다 |
| 요청 메시지 | 브로커가 만든 `author_type: 'system'` 메시지 중 승인 요청 템플릿과 일치하는 것 |
| 판정 결과 메시지 | 브로커가 판정 전송 뒤 남기는 system 메시지 (`✅ 승인 전송됨 (…)` 부류) |
| `request_id` | 다섯 글자 소문자 ID. 알파벳 `l` 을 뺀 `[a-km-z]{5}` |
| 이음매(seam) | `SPEC-WEBCHAT-001` 의 `renderMessage` 안에 **그 SPEC 이 선언·소유하는** 장식 훅 호출 지점. 이 SPEC 은 그 훅에 끼울 함수(`decorate`)를 공급할 뿐, 호출 자리를 만들지 않는다 |
| 장식 훅(decoration hook) | `renderMessage` 가 요소를 `#messages` 에 붙이기 직전 정확히 한 번 부르는 `(el, m) => void` 함수. 등록되지 않았으면 아무 일도 일어나지 않는다(그 무동작 성질도 `SPEC-WEBCHAT-001` 이 규정한다) |
| 계약 합치 검사 | UI 가 만든 페이로드를 실제 서버 엔드포인트에 그대로 먹여, 의도한 결과가 나는지 보는 검사 |

## 3. 선행 SPEC에서 받아 쓰는 것

| 출처 | 받아 쓰는 것 | 이 SPEC 이 하는 일 |
|------|--------------|--------------------|
| `SPEC-WEBSHELL-001` (Task 15) | 필수 18개 export 가운데 셋 — `api(path, opts)`, `state`(읽기만: `currentRoomId`), `$(id)` | 그대로 import 해 호출한다. 고치지 않는다 |
| `SPEC-WEBCHAT-001` (Task 16) | `renderMessage(m)` 안의 **장식 훅 호출 자리와 그 등록 지점**, `#invite-btn`, `#messages` | 그 훅에 끼울 함수를 공급한다. `renderMessage` 본체는 한 줄도 건드리지 않는다 (REQ-WEBRICH-002) |
| `SPEC-MSG-001` | `POST /api/rooms/:id/messages` (multipart), `GET /api/attachments/:id`, 메시지 봉투의 `attachments` | 소비만 한다 |
| `SPEC-PERM-001` | 요청 system 메시지 본문 형식, `PERMISSION_REPLY_RE`, 판정 결과 메시지 형식 | 본문을 읽어 ID 를 뽑고, 정규식이 받는 형식으로 답을 만든다 |
| `SPEC-BOT-001` | `POST /api/rooms/:id/invites` → `{ bot_id, bot_name, token, command }` | `command` 만 화면에 쓴다 |
| `SPEC-GATEWAY-001` | `permission_verdict` 가 봇에 닿는 경로 | 계약 합치 검사의 관측점으로만 쓴다 |

`refreshRoomBots()` 는 0.1.0 의 의존 표에 있었으나 **뺐다.** 이 SPEC 의 어떤 요구사항도 수용 기준도 그것을 부르지 않고, `SPEC-WEBCHAT-001` 의 `spec.md` 에 계약으로 선언된 이름도 아니었다(감사 MF-5 항목 3). 쓰지 않는 이름을 의존 표에 적어 두면 형제에게 없는 의무를 지운다.

> **표면 전문은 여기에 없다.** 카드 `t5` 의 공유 표면(모듈 형식 · `state` 확장 방식 · export 최소 집합 · 요소 소유권 · 토큰 로딩 경로 · 액션 함수 네트워크 호출 동결)은 `SPEC-WEBSHELL-001` `spec.md` §4.8(REQ-WEBSHELL-015)의 여섯 계약이 **유일한 자리**다. 이 SPEC 은 그것을 다시 적지 않고 참조한다. 세 SPEC 이 각자 자기 문서에 표면을 적었기 때문에 서로 다른 약속이 생겼다는 것이 plan 단계 감사의 진단이다(`.moai/reports/t5/plan-audit.md` 권고 1번).

이 SPEC 이 그 계약에서 직접 지는 항목은 다섯이다.

| 계약 | 이 SPEC 이 지는 의무 |
|------|---------------------|
| 1 — `app.js` 는 ES 모듈 | 이 SPEC 의 테스트도 `await import(...)` 로 모듈을 적재한다. `window.eval` 로 파일 원문을 감싸는 골격을 쓰지 않는다 |
| 2 — `state` 필드 소유 | 이 SPEC 은 `state` 에 **어떤 필드도 더하지 않는다.** 판정 완료 상태는 `state` 가 아니라 `createRichContext` 인스턴스 안에 산다(§4.1). 나중에 필드가 필요해지면 이 SPEC 이 스스로 선언·초기화한다 |
| 3 — export 최소 집합 | `$(id)` 는 실재하는 export 이므로 그대로 import 해 쓴다. 이 SPEC 은 셋(`api`·`state`·`$`) 밖의 이름을 쓰지 않는다. `enterMain()` 은 **존재하지 않는 이름**이며 이 SPEC 은 그것을 참조하지 않는다(원래도 없었다) — 실재하는 전환 함수는 `showMain()` 이다 |
| 4 — 요소 소유권 | `#chat` **요소**는 `SPEC-WEBSHELL-001` 소유라 지우지 않는다. `#messages` 를 비롯한 `#chat` **내용물**은 `SPEC-WEBCHAT-001` 소유라 이 SPEC 은 거기에 노드를 붙이기만 한다. 이 SPEC 이 새로 더하는 id(`invite-dialog`·`invite-command`·`invite-result`·`copy-command`)는 문서 전체에서 유일해야 한다. 새 `<script src>` 태그는 더하지 않는다 — `rich.js` 는 `app.js` 가 `import` 한다 |
| 6 — 액션 함수 네트워크 호출 동결 | `POST /api/rooms/:id/invites` 호출은 이 SPEC 자신의 함수 안에 둔다. `api`·`login`·`register`·`logout`·`loadRooms`·`loadBots`·`createRoom`·`archiveRoom`·`createBot` 아홉 함수 본문에 네트워크 호출을 더하지 않는다 |

계약 5(토큰 로딩 경로)는 §4.5 REQ-WEBRICH-016 이 지며, 그 관측은 AC-WEBRICH-014 다.

> **주의 — 인증은 쿠키다.** `requireAuth` 는 `md_session` httpOnly 쿠키를 본다(`server/src/auth.ts`). 따라서 `<img src="/api/attachments/3">` 와 `<a href="/api/attachments/3">` 는 **웹 UI 가 서버와 같은 오리진에서 서빙될 때만** 동작한다. 그 전제는 `SPEC-WEBSHELL-001` 이 진다.

## 4. 요구사항 (GEARS)

### 4.1 모듈 경계와 이음매

**REQ-WEBRICH-001** (Ubiquitous)
`web/rich.js` 는 아래 **값 열두 개**를 이름 그대로 내보내야 하며, 같은 디렉터리의 `web/rich.d.ts` 가 아래 **형 여덟 개**를 함께 선언해야 한다. 이 두 파일이 이 SPEC 이 새로 만드는 소스 전부다.

```ts
// ── 형 (rich.d.ts 가 선언한다. 이름이 계약이다) ─────────────────────────────
export type Attachment = { id: unknown; filename: string }
export type AuthorType = 'user' | 'bot' | 'system'
export type MessageEnvelope = {
  id?: number
  room_id: number
  author_type: AuthorType
  body: string
  attachments?: Attachment[]        // 없거나 빈 배열일 수 있다 — 필수가 아니다
}
export type Bot = { id: number; name: string; description?: string }
export type InviteNodes = {
  commandEl: { textContent: string | null }
  resultEl: { hidden: boolean }
}
export type InviteResult = { command: string }
export type CopyDeps = { nav?: unknown; onFail: (e: unknown) => void }
export type RichContext = {
  decorate(el: Element, m: MessageEnvelope): void
}

// ── 값 (rich.js 가 내보낸다) ────────────────────────────────────────────────
export function isImageFilename(filename: string): boolean
export function attachmentUrl(id: unknown): string | null
export function buildAttachmentNode(att: Attachment, doc: Document): Element | null
export function permissionRequestId(body: string): string | null
export function permissionResolutionId(body: string): string | null
export function verdictBody(requestId: string, decision: 'allow' | 'deny'): string
export function verdictForm(requestId: string, decision: 'allow' | 'deny'): FormData
export function createRichContext(deps: { api: Function; doc: Document }): RichContext
export function buildInviteChoices(args: { bots: Bot[]; doc: Document; onPick: (bot: Bot) => void }): Element
export function applyInviteResult(nodes: InviteNodes, res: InviteResult): void
export function clearInviteResult(nodes: InviteNodes): void
export function copyText(text: string, deps: CopyDeps): Promise<boolean>
```

`createRichContext` 가 **팩토리인 것이 계약이다.** 판정 완료 여부는 모듈 수준 변수가 아니라 이 팩토리가 만든 인스턴스 안에만 산다 — 모듈 전역에 두면 방을 옮겨도 상태가 남고, 테스트끼리 상태가 샌다(`plan.md` §B). `decorate` 를 모듈 수준 함수로 내보내지 **않는** 이유가 그것이다. `decorate` 는 `RichContext` 형의 유일한 멤버로 위 export 블록에 이름과 시그니처가 그대로 적혀 있고, `rich.d.ts` 가 그 형을 내보내므로 형제 SPEC 은 이 한 곳만 보고 이음매를 배선할 수 있다.

`InviteNodes` 를 `Element` 가 아니라 **구조적 형**(`textContent` 와 `hidden` 만 요구)으로 정의한 것은 의도다. `applyInviteResult` 와 `clearInviteResult` 는 두 속성 말고 아무것도 만지지 않으므로, 계약을 그만큼만 요구하면 수용 기준이 실제 `Element` 없이도 이 함수를 부를 수 있고 `npm run typecheck -w server` 가 통과한다(감사 O-6).

**REQ-WEBRICH-002** (Unwanted — shall not · Ubiquitous 배선 절 포함)
이 SPEC 의 구현은 `SPEC-WEBCHAT-001` 의 `renderMessage` 본체를 **한 줄도 추가·삭제·수정해서는 안 된다.** 그리고 이 SPEC 의 구현은 아래 「배선 계약」의 한 줄을 `renderMessage` **밖**에 정확히 한 번 두어야 한다. 두 절은 같은 경계의 안팎이라 한 요구사항에 함께 있다 — 0.3.0 에서 배선 절을 새 REQ 로 만들지 않고 여기에 더한 이유는 Tier M 상한이 16/16 으로 차 있기 때문이며, 배선을 관측하는 `AC-WEBRICH-016` 도 이미 REQ-002 에 매핑돼 있어 자리가 맞기 때문이다(감사 MF-9).

이음매의 소유가 이렇게 갈린다.

| 조각 | 소유자 |
|------|--------|
| `renderMessage` 안의 장식 훅 호출 자리 (요소를 `#messages` 에 붙이기 직전, 정확히 한 번, `(el, m)` 인자) | `SPEC-WEBCHAT-001` |
| 훅이 등록되지 않았을 때의 무동작 성질 | `SPEC-WEBCHAT-001` |
| 훅 등록 지점(방마다 새 컨텍스트를 만들어 등록하는 자리) — 즉 `registerMessageDecorator` 함수 자체와 `openRoom` 이 그 팩토리를 부르는 자리 | `SPEC-WEBCHAT-001` |
| 그 훅에 등록되는 값 = 팩토리 함수 `createRichContext` **그 자체** | **이 SPEC** |
| 그 등록을 실제로 수행하는 배선 한 줄과 그 `import` | **이 SPEC** (아래 「배선 계약」) |

**배선 계약 (이음매의 마지막 한 줄).** `web/app.js` 의 **모듈 최상위**(어떤 함수 본체도 아닌 자리)에서 `registerMessageDecorator(createRichContext)` 를 **정확히 한 번** 호출한다. 넘기는 값은 팩토리 함수 `createRichContext` **그 자체**이며, 그것을 호출한 결과(`createRichContext({ ... }).decorate`)가 아니다 — 결과를 넘기면 `openRoom` 이 `factory({ api, doc })` 를 부를 때 실제로는 `decorate({ api, doc }, undefined)` 가 불리고, 그 반환 `undefined` 가 그 방의 컨텍스트가 된다. 그 호출 줄과 그것을 가능하게 하는 `import { createRichContext } from './rich.js'` 는 **`SPEC-WEBRICH-001` 이 소유**하며, `SPEC-WEBCHAT-001` 은 등록 지점을 만들 뿐 그 줄을 쓰지 않는다. 관측은 `AC-WEBRICH-016` 관측 4가 진다.

[HARD] **이 SPEC 의 구현은 위 배선 한 줄과 그 `import` 를 `renderMessage` 본체 밖에, `web/app.js` 모듈 최상위에 둔다.** 새 `<script>` 태그를 `web/index.html` 에 더하지 않고(§4.8 계약 4·5), `SPEC-WEBSHELL-001` 이 소유한 아홉 액션 함수 본문에도 넣지 않는다(§4.8 계약 6). 모듈 최상위는 그 셋 어디에도 걸리지 않는 유일한 자리다.

0.1.0 은 이 이음매를 **소비자 쪽에서 일방적으로 발명했다** — 형제가 동의한 적 없는 한 줄을 형제의 함수 안에 넣겠다고 적었고, 그 `decorate` 라는 이름은 이 SPEC 자신의 export 목록에도 없었다(감사 MF-5). 한쪽만 아는 이음매는 run 단계에서 반드시 블로커가 되고, 그 블로커의 해결자는 이미 카드에서 손을 뗀 형제다. 그래서 **호출 자리를 생산자에게 넘기고**, 이 SPEC 은 끼울 함수만 공급한다.

원본 `plan-v2.md` Task 17 은 "Task 16 의 `renderMessage` 를 다음 완성본으로 교체한다"고 지시한다. 그 지시는 형제 SPEC 이 소유한 함수의 소유권을 빼앗으므로 따르지 않는다(`plan.md` §D 1번). 이 이탈은 AC-WEBRICH-016 의 `renderMessage` 범위 diff 관측이 기계적으로 판정한다.

**`decorate` 의 요소 계약 — 건네받은 `el` 에 무엇을 해도 되고 무엇을 하면 안 되는가**

`decorate(el, m)` 는 `renderMessage` 가 만든 메시지 요소 `el` 과 그 메시지 봉투 `m` 을 받는다. 호출 시점에 **`el` 은 아직 문서에 붙어 있지 않다** — `#messages` 삽입 직전이다.

해도 되는 것:

- `el` 에 **자식 노드를 덧붙인다** (첨부 노드, 승인·거절 버튼 줄).
- `m` 의 `id`·`room_id`·`author_type`·`body`·`attachments` 를 읽는다.
- 같은 `RichContext` 인스턴스가 **이전 호출에서 스스로 만든** 버튼의 `disabled` 를 바꾼다 (REQ-WEBRICH-010 의 후도착 경로).
- 주입된 `api` 로 네트워크를 부른다 (버튼 클릭 시점. `decorate` 호출 자체는 네트워크를 부르지 않는다).

해서는 안 되는 것:

- `el` 의 **기존 자식을 지우거나 순서를 바꾸는 것** — `.msg-head`·`.msg-body` 는 `SPEC-WEBCHAT-001` 소유다.
- `el` 의 기존 속성·`class`·`id`·`textContent` 를 고치는 것.
- `el` 을 문서에 삽입하거나 옮기는 것 — `#messages` 삽입은 `renderMessage` 가 한다.
- `el` 이 문서에 연결돼 있다고 가정하는 것 (`el.closest(...)`·`getComputedStyle` 따위).
- 자기가 만들지 않은 문서의 다른 부분을 읽거나 고치는 것.
- 던지는 것 — 어떤 봉투에 대해서도 **정상 반환**해야 한다. `attachments` 가 없는 메시지, 사용자·봇 메시지, 요청이 아닌 system 메시지는 전부 아무 노드도 만들지 않고 조용히 끝난다.
- `Promise` 를 돌려주는 것 — 동기 함수이며 반환값은 `void` 다. `renderMessage` 는 동기 렌더 경로에서 이것을 부른다.
- 전역 `fetch` 를 직접 부르는 것 — 네트워크는 주입된 `api` 로만 나간다.

### 4.2 첨부 표시

**REQ-WEBRICH-003** (When — 이벤트 구동)
메시지가 그려질 때, 구현은 그 메시지의 `attachments` 배열 각 항목마다 노드를 **정확히 하나** 만들어 메시지 요소에 붙여야 한다. 파일명 확장자가 이미지(`.png`·`.jpg`·`.jpeg`·`.gif`·`.webp`, 대소문자 무시)면 `<img class="attachment-image">` 를, 그 밖이면 `<a class="attachment">` 다운로드 링크를 만든다. `attachments` 가 없거나 빈 배열이면 아무 노드도 만들지 않는다.

`<img>` 를 고를 판단 근거는 파일명뿐이다. 서버가 메시지 봉투에 싣는 첨부 항목은 `{ id, filename }` 두 필드이며 **`mime` 은 실려 오지 않는다**(`routes-messages.ts` — `stored_path` 와 함께 의도적으로 뺀 값이다). 서버 응답에 없는 필드를 읽는 구현은 항상 `undefined` 를 보고 조용히 전부 링크로 떨어진다(`plan.md` §D 4번).

**REQ-WEBRICH-004** (Ubiquitous)
첨부 노드의 주소는 `/api/attachments/<id>` 이며 `<id>` 는 `Number(att.id)` 가 **유한한 음이 아닌 정수일 때 그 정수를 십진수로 적은 것**이어야 한다. 그 조건을 만족하지 않으면 구현은 노드를 만들지 않고 `null` 을 돌려주어야 한다.

**REQ-WEBRICH-005** (Unwanted — shall not)
`web/rich.js` 는 `innerHTML`·`outerHTML`·`insertAdjacentHTML`·`document.write`·`eval`·`new Function` 을 써서는 안 된다. 파일명·메시지 본문·봇 이름·서버가 준 명령 문자열은 모두 `textContent` 또는 `alt` 속성으로만 화면에 놓는다.

첨부 파일명은 공격자가 고르는 값이다. 서버는 쓰기 시점에 `basename()` 으로 경로 성분만 벗겨 낼 뿐(`REQ-MSG-007`) 파일명 안의 문자는 그대로 보존한다 — `<img src=x onerror=…>.txt` 라는 이름의 파일은 정상적으로 저장되고 정상적으로 목록에 실려 온다.

### 4.3 권한 승인 버튼

**REQ-WEBRICH-006** (When — 이벤트 구동)
system 메시지 본문에서 `request_id` 를 뽑을 때, 구현은 `SPEC-PERM-001` 브로커가 만든 **마지막 줄 템플릿 전체와의 일치**로만 뽑아야 한다. 다음 정규식을 `gm` 플래그로 적용하고 `matchAll` 로 모든 일치를 받아 **마지막 일치**의 캡처 그룹 1 을 쓴다. 일치가 없으면 `null` 이다.

```js
/^승인하려면 "yes ([a-km-z]{5})", 거절하려면 "no \1" 라고 답해주세요\.$/gm
```

역참조 `\1` 이 계약의 핵심이다. 앞뒤 ID 가 같은 줄만 요청 줄로 인정하므로, `input_preview` 안에 우연히 비슷한 문장이 들어 있어도 걸리지 않는다.

`g` 플래그가 함께 필요하다. 0.1.0 은 `m` 플래그만 적고 "마지막 일치"를 쓰라고 했는데, `g` 없는 `.exec` 는 **첫 일치만** 준다 — 문면이 스스로 성립하지 않았다(감사 O-3). 실제 서버 본문에서는 요청 줄이 하나뿐이라 결과는 같지만, 이 요구사항이 방어의 근거로 든 성질(오염된 `input_preview` 가 요청 줄 형태까지 흉내 내는 경우)은 마지막 일치를 실제로 고를 수 있어야 성립한다.

**REQ-WEBRICH-007** (Unwanted — shall not)
구현은 요청 본문의 임의 위치에서 다섯 글자 덩어리를 집어 `request_id` 로 삼아서는 안 된다.

원본 Task 17 의 `/[a-km-z]{5}/.exec(m.body)?.[0]` 가 정확히 이 금지 대상이다. 브로커가 만드는 본문은 `🔒 … : {tool_name}` / `{description}` / `{input_preview}` / 요청 줄 순서이고, 앞 세 조각은 봇이 보낸 임의 문자열이다. `input_preview` 에 `command` 라는 단어 하나만 있어도 첫 일치는 `comma` 가 되어 **실제 `request_id` 대신 `comma` 를 보낸다**. 서버 `tryHandleUserReply` 는 모르는 ID 를 만나면 `false` 를 돌려 흘려보내고(`permissions.ts`), 그 답은 평범한 사용자 메시지로 방에 남으며, 진짜 대기 항목은 열린 채로 남는다. 실패가 **어디에도 보이지 않는다**는 것이 이 결함의 성질이다(`plan.md` §D 2번).

**REQ-WEBRICH-008** (When — 이벤트 구동)
승인 또는 거절 버튼이 눌리면, 구현은 `POST /api/rooms/<m.room_id>/messages` 를 **정확히 한 번** 호출해야 하며, 그 본문은 `body` 필드 하나만 담은 `FormData` 이고 그 값은 정확히 `yes <request_id>` 또는 `no <request_id>` — 앞뒤 공백 없이 한 칸 띄운 두 토큰 — 이어야 한다.

이 형식은 서버 `PERMISSION_REPLY_RE = /^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$/i` 와 문자 그대로 합치해야 한다. 이 정규식은 **양끝이 고정**이라 접두어·접미어·다른 필드가 하나라도 더 붙으면 판정이 성립하지 않고 그 답은 평범한 메시지가 된다.

**REQ-WEBRICH-009** (Unwanted — shall not)
한 요청 메시지의 승인·거절 버튼은 같은 요청에 대해 두 번 이상 전송해서는 안 된다. 어느 한쪽이 눌린 즉시 두 버튼 모두 `disabled` 가 되어야 하며, 비활성은 요청 결과를 기다리지 않고 클릭 처리의 **첫 동작**으로 이뤄져야 한다.

**REQ-WEBRICH-010** (While — 이미 판정된 상태)
어떤 `request_id` 의 판정 결과 메시지가 이미 화면에 그려진 동안, 그 `request_id` 의 요청 메시지는 **살아 있는 버튼 없이** 그려져야 한다. 반대로 요청 메시지가 먼저 그려진 뒤 그 ID 의 판정 결과 메시지가 도착하면, 이미 그려진 버튼이 그때 비활성되어야 한다.

방을 다시 열면 과거 메시지가 REST 로 전부 다시 그려진다(`SPEC-WEBCHAT-001` `openRoom`). 이 요구사항이 없으면 이미 끝난 요청에 살아 있는 버튼이 다시 뜨고, 누르면 서버가 모르는 ID 라 흘려보내 방에 `yes abcde` 라는 쓰레기 메시지만 남는다.

판정 결과 메시지의 ID 는 `permissionResolutionId` 가 브로커의 세 결과 템플릿(`✅ 승인 전송됨 (…)`·`⛔ 거절 전송됨 (…)`·`⚠️ … 판정을 전달하지 못했습니다 (…)`)에서 뽑는다.

**REQ-WEBRICH-011** (Unwanted — shall not)
구현은 `author_type` 이 `system` 이 아닌 메시지, 또는 `permissionRequestId` 가 `null` 을 돌려주는 system 메시지에 승인·거절 버튼을 붙여서는 안 된다.

### 4.4 봇 초대 다이얼로그

**REQ-WEBRICH-012** (When — 이벤트 구동)
초대 다이얼로그에서 봇 하나가 선택되면, 구현은 `POST /api/rooms/<현재 방>/invites` 를 `{ bot_id }` 본문으로 호출하고, 응답의 `command` 필드 **문자열 그대로**를 `#invite-command` 의 `textContent` 에 넣은 뒤 `#invite-result` 를 드러내야 한다. 명령 문자열을 자르거나 다시 조립하지 않는다.

`command` 는 서버 `inviteCommand()` 가 `config.port` 를 포함해 조립한 완성된 안내다(`routes-bots.ts`). 클라이언트가 포트나 명령을 다시 만들면 서버 설정과 갈라진다.

**REQ-WEBRICH-013** (Unwanted — shall not)
구현은 초대 응답의 `token` 또는 `command` 를 `localStorage`·`sessionStorage`·`document.cookie`·`IndexedDB`·URL(주소 표시줄·`history` API)·`console` 어디에도 써서는 안 된다. 화면의 DOM 노드가 이 값이 사는 유일한 자리다.

평문 토큰은 발급 응답에 **딱 한 번** 실린다. 서버는 `sha256Hex` 해시만 저장하므로 다시 볼 방법이 없고(`routes-bots.ts`), 그래서 UI 화면은 "지금 복사하세요"라고 경고한다. 남기면 편해 보이지만, 남긴 자리는 곧 봇 게이트웨이에 그대로 붙을 수 있는 자격 증명이 평문으로 놓인 자리가 된다.

**REQ-WEBRICH-014** (When — 이벤트 구동)
복사 동작이 실행되면, 구현은 `#invite-command` 에 표시된 **문자열 전체**를 클립보드에 써야 한다. 클립보드 API 를 쓸 수 없으면(`navigator.clipboard` 부재 또는 `writeText` 거부) 구현은 실패를 사용자에게 보이게 알려야 하며, 성공한 것처럼 조용히 넘어가서는 안 된다.

`navigator.clipboard` 는 보안 컨텍스트에서만 존재한다. 기본값인 `127.0.0.1` 접속은 보안 컨텍스트지만, 같은 서버를 LAN 주소로 열면 `undefined` 가 되어 원본 코드의 `navigator.clipboard.writeText(...)` 는 처리되지 않은 예외로 끝난다 — 버튼은 눌렸고, 아무 일도 없었고, 사용자는 토큰을 복사했다고 믿는다(`plan.md` §D 6번).

**REQ-WEBRICH-015** (When — 이벤트 구동)
초대 다이얼로그가 닫히면, 구현은 `#invite-command` 의 내용을 비우고 `#invite-result` 를 다시 숨겨야 한다.

### 4.5 스타일과 범위 경계

**REQ-WEBRICH-016** (Ubiquitous)
`web/style.css` 에 이 SPEC 이 더하는 규칙은 `SPEC-WEBSHELL-001` §4.8 계약 5의 세 조건을 모두 지켜야 한다.

1. 규칙은 파일 **끝에 덧붙인다.** `@import url('./design-tokens.css')` 줄보다 앞에 선택자 블록을 넣지 않는다.
2. 색·간격·모양 값은 `web/design-tokens.css` 의 `var(--md-*)` 변수만 쓰고, **원시 16진 색상 리터럴을 새로 적지 않는다.**
3. 새 id·클래스 선택자의 **앞 세 글자가 모두 16진 문자(`0-9a-f`)인 이름을 쓰지 않는다.** 이 SPEC 이 쓰는 이름은 `.attachment`·`.attachment-image`·`#invite-dialog`·`#invite-command`·`#invite-result`·`#copy-command` 이며, 전부 앞 세 글자에 비-16진 문자가 있어 이 조건에 걸리지 않는다.

그리고 이 SPEC 의 구현은 `server/src` 아래 어떤 파일도 고쳐서는 안 된다 — 손대는 파일은 `web/rich.js`·`web/rich.d.ts`·`web/index.html`·`web/app.js`·`web/style.css` 와 `server/test/` 아래 새 테스트 파일, `jsdom` 설치가 바꾸는 `server/package.json`·`package-lock.json`, 그리고 §6 의 대체 경로를 쓴 경우에만 `server/vitest.config.ts` 뿐이다.

토큰 파일은 `web/style.css` 첫머리의 `@import` 하나로만 실린다(계약 5). **`web/index.html` 에는 `design-tokens.css` 라는 문자열이 나타나지 않는다** — 따라서 로딩을 확인하는 명령의 대상은 `web/style.css` 이고, `index.html` 에 `<link>` 를 더해 "고치는" 것은 금지된다.

원본 Task 17 의 CSS 는 `#2b2d31`·`#00a8fc`·`#1e1f22`·`#4e5058` 을 직접 적는다. 앞의 셋은 `design-tokens.css` 에 이름이 있는 값이고, `#4e5058` 은 그 파일에 없는 값이다(`plan.md` §D 8번).

## 5. 범위 밖 (Exclusions)

이 절은 이 SPEC 이 **만들지 않는 것**을 못 박는다.

### Out of Scope — 로그인·방 목록·`api()` 바닥 (SPEC-WEBSHELL-001, Task 15)

- 로그인·가입 화면, `showAuth`/`showMain` 전환, `promptText` 다이얼로그
- `api(path, opts)` fetch 래퍼와 그 401 처리, `state` 객체 정의
- 방 생성·목록·보관 UI, 봇 등록 UI
- `web/index.html` 의 뼈대와 `web/style.css` 의 기존 규칙(`@import` 줄 포함), `app.js` 를 모듈로 불러오는 `<script type="module">` 배선 — **이 SPEC 은 그 배선을 만들지도 바꾸지도 않는다**(§4.8 계약 1)

### Out of Scope — 채팅 영역과 SSE (SPEC-WEBCHAT-001, Task 16)

- `openRoom(id)`, `EventSource` 구독과 `message`·`bot_status` 처리
- `renderMessage` 본체(머리·본문 노드 구성) **전부** — 장식 훅 호출 자리, 훅이 없을 때의 무동작 성질, 훅 등록 지점을 포함한다. 이 SPEC 은 훅에 끼울 함수만 공급한다(REQ-WEBRICH-002)
- `refreshRoomBots()`, 봇 칩 표시
- `sendMessage()` 와 `#file-input` 을 `FormData` 에 싣는 **업로드** 경로 — 이 SPEC 은 이미 올라간 첨부를 **보여 주기만** 한다
- `@` 자동완성 드롭다운

### Out of Scope — 서버 쪽 전부

- `POST /api/rooms/:id/invites` 의 토큰 발급·해시·철회 (`SPEC-BOT-001`)
- `GET /api/attachments/:id` 의 경로 봉인·MIME·`content-disposition` (`SPEC-MSG-001`)
- 권한 브로커의 대기 레지스트리·정규식·판정 전송 (`SPEC-PERM-001`)
- 게이트웨이 프로토콜 (`SPEC-GATEWAY-001`)

### Out of Scope — 이번 카드에서 하지 않는 UI 심화

- 첨부 이미지의 확대(라이트박스)·썸네일 생성·지연 로딩
- 봇 이름별 역할 색 배정(디자인 DNA 의 "역할 색상") — 채팅 영역의 성질이라 `SPEC-WEBCHAT-001` 쪽이다
- 메시지 그룹핑(같은 작성자 연속 메시지 압축)
- 권한 요청의 만료 표시·타임아웃 카운트다운 — 서버가 만료 개념을 두지 않는다

### Out of Scope — E2E 시나리오 (Task 18)

- `scripts/e2e.mjs` 전체 흐름 자동 검증과 재시작 영속성 확인

## 6. 제약

| 제약 | 값 |
|------|-----|
| 프레임워크 | 없음. 바닐라 ES 모듈 (`Global Constraints`) |
| 모듈 형식 | `web/app.js`·`web/rich.js` 둘 다 ES 모듈. 테스트는 `await import(...)` 로 적재한다 (§4.8 계약 1) |
| 테스트 러너 | vitest (`server` 워크스페이스, 현재 `^4.1.11`) |
| DOM 환경 | 1순위: 파일 단위 `// @vitest-environment jsdom` 도크블록. **`jsdom` 개발 의존성 추가가 선행 조건이다** (`plan.md` §C). **대체 경로**: 도크블록이 듣지 않으면 `server/vitest.config.ts` 를 쓴다 — 형제 둘(`SPEC-WEBSHELL-001` `plan.md` §C, `SPEC-WEBCHAT-001` `acceptance.md` AC-015 허용 예외)이 이미 적어 둔 같은 경로이며, 이 SPEC 의 허용 집합(AC-WEBRICH-016 관측 2)에도 들어 있다. 이 SPEC 은 두 환경을 동시에 쓰는 유일한 SPEC 이므로(골격 A `node`, 골격 B `jsdom`) 그 파일을 손대야 할 가능성이 형제보다 높다. 형제가 먼저 만들었으면 지우거나 바꾸지 않고 따르고, 이 SPEC 이 만들거나 고쳤으면 그 사실과 이유를 `progress.md` 에 적는다 |
| 타입 검사 | `server/tsconfig.json` 의 `include` 는 `["src","test"]`, `allowJs` 없음 → `web/rich.d.ts` 가 있어야 `tsc --noEmit` 이 통과한다 |
| UI 문구 | 한국어 |
| 인증 | `md_session` httpOnly 쿠키. 같은 오리진 전제 |
| 디자인 | `web/design-tokens.css` 변수 (`.moai/project/design-dna-discord.md`) |

## 7. 수용 기준

`acceptance.md` 참조 — AC-WEBRICH-001 … AC-WEBRICH-016 (16개).

## 8. 참조

- `.moai/plan/2026-08-26-minidiscord/plan-v2.md` — Task 17 (원본), Task 15·16 (선행)
- `.moai/plan/2026-08-26-minidiscord/spec-v2.md` — 4-C 웹 UI, 7장 봇 초대·권한 릴레이, 9장 보안
- `.moai/project/design-dna-discord.md`, `web/design-tokens.css`
- `server/src/permissions.ts`, `server/src/routes-bots.ts`, `server/src/routes-messages.ts`, `server/src/gateway.ts`, `server/src/auth.ts`
- `.moai/specs/SPEC-PERM-001/`, `.moai/specs/SPEC-MSG-001/`, `.moai/specs/SPEC-SSE-001/`
