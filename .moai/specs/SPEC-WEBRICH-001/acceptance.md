# SPEC-WEBRICH-001 수용 기준

카드 `t5` / 마일스톤 M5 / Tier M — 기준 16개 (상한 16).

---

## 이 문서가 지키려는 것 — 빈 구현으로 통과하는 기준을 두지 않는다

이 프로젝트에는 **구현이 옳든 그르든 통과하는 수용 기준**이 반복해서 나온 기록이 있다. 그래서 아래 열여섯 기준은 하나씩이 아니라 부류로 훑었고, 훑은 축과 고친 자리는 `plan.md` §E 「공허한 수용 기준 부류 훑기」에 남겼다. 여기서는 그 결과만 옮긴다.

- **부재만 보는 기준을 단독으로 두지 않았다.** AC-005(토큰이 어디에도 없다)와 AC-014(원시 hex 가 없다)는 부재 축이라 빈 파일에서도 성립한다. 그래서 각각 존재 축 관측을 함께 실었다.
- **AC-010 과 AC-012 는 초안이 공허했고 고쳤다.** AC-010 은 "버튼이 비활성됐다"만 보면 아무것도 전송하지 않는 구현을 통과시켰으므로 전송 횟수 `1` 을 함께 단언한다. AC-012 는 "버튼이 없다"만 보면 `decorate` 가 아무 일도 안 해도 통과하므로, 같은 시나리오에서 정상 요청에는 버튼이 붙는 것을 함께 관측한다.
- **사람 눈 기준은 정확히 하나(AC-015)이고 `[MANUAL]` 로 표기했다.** 자동처럼 보이게 위장하지 않았다.
- **서버가 만드는 문자열을 테스트에 손으로 타이핑하지 않는다.** 요청 본문·판정 결과 본문은 전부 실제 브로커가 만든 값을 그대로 입력으로 쓴다. 리터럴을 옮겨 적으면 이모지 변이 선택자 하나로 조용히 어긋난다.

## 0.2.0 에서 더 지키는 것 — 형제가 옳게 구현하면 실패하는 기준을 두지 않는다

위 다섯 항목은 전부 **"빈 구현이 통과하는가"** 한 방향만 물은 것이고, 독립 감사는 그 방향에서 0건을 확인했다(`.moai/reports/t5/plan-audit.md`). 감사가 잡은 것은 반대 방향이었다 — **형제 SPEC 이 자기 요구사항대로 옳게 구현했을 때 이 기준이 실패하는가.** 그 방향은 정의상 자기 SPEC 안에서는 보이지 않는다.

그래서 열여섯 기준을 **카드 전체 범위에서** 두 방향으로 다시 훑었고, 결과는 `plan.md` §E.2 에 있다. 이 문서에 반영된 것은 둘이다.

- **AC-014** — 토큰 로딩 확인 대상을 `web/index.html` 에서 `web/style.css` 로 바꿨다. 세 SPEC 이 전부 옳게 구현되면 `index.html` 에는 그 문자열이 **없다**(감사 MF-7).
- **AC-016** — `renderMessage` 범위 diff 관측을 더했다. 0.1.0 에서 REQ-WEBRICH-002 를 관측하는 기준이 하나도 없었다(감사 MF-8).

## 0.3.0 에서 더 지키는 것 — 실패가 아니라 *공허*로 무너지는 기준을 두지 않는다

두 번째 독립 감사(`.moai/reports/t5/plan-audit-b.md`)는 앞의 두 물음으로도 안 잡히는 세 번째 부류를 짚었다. **이 기준이 실패가 아니라 공허로 무너지는 입력이 있는가** — 절차를 건너뛴 실행, 파일이 없는 base, 표준 오류로만 나가고 표준 출력은 비는 명령. 0.2.0 이 관측을 더하면서 그 관측의 **선행 조건**은 더하지 않은 자리가 정확히 그 부류였다.

열여섯 기준을 그 물음으로 전수 훑었고 결과는 `plan.md` §E.3 에 있다. 이 문서에 반영된 것은 셋이다.

- **AC-016** — 기준 SHA 유효성(관측 0), base 시점 `web/app.js` 존재와 `renderMessage` 범위 비어 있지 않음(3-a·3-b)을 선행 조건으로 올렸다. 형제 둘이 이미 갖고 있던 가드다(감사 MF-10).
- **AC-016** — 이음매 배선을 관측하는 관측 4·5 를 더했다. 0.2.0 까지 세 SPEC 48개 기준 가운데 실제 배선을 지나는 것이 **하나도 없었다**(감사 MF-9).
- **AC-014** — `web/index.html` 부재 시 `grep -c` 가 빈 출력을 내는 길을 `test -s` 선행 검사로 막았다.

---

## 공통 테스트 골격

### 골격 A — 계약 합치 (`server/test/web-permission-contract.test.ts`, `node` 환경)

`server/test/permissions.test.ts` 의 `build()` 하네스를 그대로 재사용한다. 실제 Fastify · 실제 SQLite · 실제 WebSocket 게이트웨이 위에서 돈다.

```ts
import { describe, it, expect } from 'vitest'
import WebSocket from 'ws'
import {
  permissionRequestId, permissionResolutionId, verdictForm,
} from '../../web/rich.js'
// build(), setCookieOf(), 방·봇·초대 준비 헬퍼는 permissions.test.ts 와 동일한 형태로 옮겨 쓴다.

// 봇을 접속시키고 승인 요청을 하나 띄운 뒤,
// 방에 실제로 저장된 요청 system 메시지 본문을 돌려준다.
async function raisePermissionRequest(ctx, params) {
  ctx.bot.send(JSON.stringify({ type: 'permission_request', ...params }))
  await waitFor(() => lastSystemBody(ctx) !== null)
  return lastSystemBody(ctx)          // ← 손으로 타이핑한 문자열이 아니라 브로커가 만든 실물
}
```

`verdictForm(rid, 'allow')` 이 만든 `FormData` 를 그대로 `POST /api/rooms/:id/messages` 에 실어 보내고, 가짜 봇 WebSocket 이 받는 프레임을 관측한다. `app.inject` 대신 실제 `listen` 한 포트로 `fetch` 한다 — `FormData` 를 multipart 로 직렬화하는 것이 이 검사의 대상이기 때문이다.

### 골격 B — DOM 조립 (`server/test/web-rich.test.ts`, `jsdom` 환경)

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRichContext, buildAttachmentNode, applyInviteResult, clearInviteResult, copyText } from '../../web/rich.js'

// AC-016 관측 5 만 쓴다. 나머지 열넷은 rich.js 만 있으면 돈다.
const webDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web')

function ctx(api = vi.fn().mockResolvedValue({ ok: true })) {
  return { api, rich: createRichContext({ api, doc: document }) }
}
function msgEl() { const el = document.createElement('div'); document.body.appendChild(el); return el }

// buildAttachmentNode 는 Element | null 을 돌려준다. null 을 여기서 걸러
// 이후 단언의 형을 좁힌다 — server/tsconfig.json 이 test 를 include 하므로
// 좁히지 않으면 npm run typecheck -w server 가 붉어진다 (감사 O-6).
function att(a) { const n = buildAttachmentNode(a, document); if (n === null) throw new Error('노드가 만들어지지 않았다'); return n }
```

**모듈 적재 형식.** `web/app.js` 와 `web/rich.js` 는 둘 다 ES 모듈이다(§4.8 계약 1). 이 SPEC 의 두 골격은 정적 `import` 로 `rich.js` 만 적재하며, `window.eval` 로 파일 원문을 감싸 실행하는 클래식 스크립트 골격은 쓰지 않는다.

### 선행 설치 (run 단계 첫 스텝)

```bash
npm install
npm i -D jsdom -w server
```

이 두 줄 없이는 골격 B 가 실행되지 않는다 (`plan.md` §C).

---

## AC 매트릭스

| AC | 검증 REQ | 층 | 관측 |
|----|----------|-----|------|
| AC-WEBRICH-001 | REQ-008 | 계약 | 가짜 봇이 `permission_verdict {request_id: 원본, behavior:'allow'}` 를 실제로 받음 + 응답 `consumed_by:'permission'` + `messages` 에 `yes …` 사용자 행 없음 |
| AC-WEBRICH-002 | REQ-008 | 계약 | 같은 경로로 `behavior:'deny'` |
| AC-WEBRICH-003 | REQ-006·007 | 계약 | `input_preview` 에 `command` 가 든 실제 요청 본문에서 뽑은 ID 가 원본 `request_id` 와 일치 |
| AC-WEBRICH-004 | REQ-012 | 계약 | 화면에 표시되는 `command` 안의 토큰으로 게이트웨이 `hello` 가 실제로 `welcome` 을 받음 |
| AC-WEBRICH-005 | REQ-013 | DOM+정적 | 초대 흐름 뒤 저장소 전부 비어 있음 **+ 명령이 실제로 표시됨** |
| AC-WEBRICH-006 | REQ-014 | DOM | 스텁 클립보드가 받은 문자열 == 표시된 명령 전체 / 클립보드 부재 시 `false` + `onFail` 호출 |
| AC-WEBRICH-007 | REQ-003 | DOM | `.png` 첨부 → `IMG`, `src == /api/attachments/<id>` |
| AC-WEBRICH-008 | REQ-003 | DOM | `.pdf` 첨부 → `A`, `href` 동일, `textContent` 에 파일명 |
| AC-WEBRICH-009 | REQ-004·005 | DOM | 주입형 파일명이 요소 자식을 만들지 않음 + 비정수 `id` 는 노드 미생성 |
| AC-WEBRICH-010 | REQ-009 | DOM | 두 번 클릭 → `api` 호출 정확히 1회 **+** 두 버튼 `disabled` |
| AC-WEBRICH-011 | REQ-010 | DOM | 결과 선렌더 시 살아 있는 버튼 0개 / 요청 후 결과 도착 시 비활성 전이 |
| AC-WEBRICH-012 | REQ-011 | DOM | 사용자·봇 메시지와 요청 아닌 system 에 버튼 0개 **+** 같은 회차 정상 요청에는 2개 |
| AC-WEBRICH-013 | REQ-015 | DOM | 닫기 뒤 `#invite-command` 가 빈 문자열, `#invite-result` 숨김 |
| AC-WEBRICH-014 | REQ-016 | 정적 | 추가 규칙이 존재하고 `var(--md-` 를 참조 **+** 토큰이 `web/style.css` 에서 로드됨 **+** `index.html` 에는 없음 **+** `@import` 뒤에 위치 **+** 그 블록에 원시 hex 없음 |
| AC-WEBRICH-015 | REQ-003·012 | **[MANUAL]** | 사람 눈 — 아래 관찰식 참조 |
| AC-WEBRICH-016 | REQ-002·016 | 정적+DOM | 기준 SHA 유효 + `server/src` 상대 diff 빈 출력 + 변경 파일 목록이 허용 집합 안 + `renderMessage` 범위 안 추가·삭제 줄 0 **+ `registerMessageDecorator(createRichContext)` 배선 한 줄이 실재하고 실제 `openRoom` 경로에서 첨부 노드가 생김** |

REQ 커버리지: REQ-001 은 열두 값 export 를 import 하는 모든 기준이 함께 진다(모듈이나 export 하나가 없으면 골격 A·B 가 import 단계에서 실패). `RichContext`·`MessageEnvelope` 를 비롯한 형 선언은 `npm run typecheck -w server` 가 진다 — 형이 없으면 `web/rich.d.ts` 부재로 테스트 파일의 import 가 타입 오류가 된다. `decorate` 는 AC-010·011·012 가 실제로 부른다 — 다만 그 셋은 `createRichContext` 를 **테스트가 직접** 부르므로 배선을 지나지 않는다. 배선(REQ-002 의 배선 절)은 AC-016 관측 4·5 가 따로 관측한다(감사 MF-9). 나머지 REQ-002…016 은 위 표에 각각 매핑돼 있다.

**REQ-002 는 0.1.0 에서 어떤 기준으로도 관측되지 않았다**(감사 MF-8). AC-016 관측 3이 그것을 메운다 — 자세한 것은 AC-016 항목 아래에 적었다.

---

## Given-When-Then 시나리오

### AC-WEBRICH-001 — 승인 판정이 실제로 봇에 닿는다

**Given** 방 `1` 에 봇이 초대돼 게이트웨이에 접속해 있고, 그 봇이 `permission_request` 를 보내 방에 요청 system 메시지가 떠 있다.

**When** `server/test/web-permission-contract.test.ts` 에 다음을 추가하고 `npm test -w server` 를 실행한다.

```ts
it('delivers an approve verdict to the bot with the exact request_id', async () => {
  const c = await build()
  const body = await raisePermissionRequest(c, {
    request_id: 'qwerz', tool_name: 'Bash',
    description: '명령을 실행합니다', input_preview: 'ls -al',
  })

  const rid = permissionRequestId(body)
  expect(rid).toBe('qwerz')

  const res = await fetch(`http://127.0.0.1:${c.port}/api/rooms/1/messages`, {
    method: 'POST', headers: { cookie: c.cookie }, body: verdictForm(rid, 'allow'),
  })
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true, consumed_by: 'permission' })

  const frame = JSON.parse(await c.nextBotFrame())
  expect(frame).toMatchObject({ type: 'permission_verdict', request_id: 'qwerz', behavior: 'allow' })

  // 소비된 답은 사용자 메시지로 남지 않는다
  const rows = c.db.prepare("SELECT body FROM messages WHERE author_type='user'").all()
  expect(rows).toEqual([])
})
```

**Then** 테스트가 통과한다.

이 기준이 무엇을 잡는가: `verdictForm` 이 필드 이름을 `body` 가 아닌 것으로 쓰거나, 값에 접두어를 붙이거나, `yes` 대신 `approve` 를 쓰거나, `FormData` 대신 JSON 을 보내면 서버 정규식 `^\s*(y|yes|n|no)\s+([a-km-z]{5})\s*$` 가 불일치해 `tryHandleUserReply` 가 `false` 를 돌리고 — 응답은 여전히 `200` 이지만 `consumed_by` 가 없고 `nextBotFrame()` 이 오지 않아 타임아웃으로 **실패**한다. 마지막 단언은 그 실패 경로에서 방에 남는 쓰레기 메시지까지 잡는다.

### AC-WEBRICH-002 — 거절 판정도 같은 경로로 닿는다

**Given** AC-001 과 같은 상태.

**When** 같은 파일에 `verdictForm(rid, 'deny')` 로 같은 흐름을 한 번 더 실행한다.

```ts
it('delivers a deny verdict', async () => {
  const c = await build()
  const body = await raisePermissionRequest(c, {
    request_id: 'zxcvb', tool_name: 'Write', description: '파일을 씁니다', input_preview: '/tmp/x',
  })
  await fetch(`http://127.0.0.1:${c.port}/api/rooms/1/messages`, {
    method: 'POST', headers: { cookie: c.cookie }, body: verdictForm(permissionRequestId(body), 'deny'),
  })
  expect(JSON.parse(await c.nextBotFrame())).toMatchObject({ behavior: 'deny', request_id: 'zxcvb' })
})
```

**Then** 테스트가 통과한다. `verdictBody` 가 두 결정을 같은 문자열로 만들면(복사·붙여넣기 실수의 전형) 여기서 `allow` 가 나와 실패한다.

### AC-WEBRICH-003 — 오염된 요청 본문에서도 ID 가 정확하다 (회귀)

**Given** 봇이 보낸 `input_preview` 안에 다섯 글자 이상 소문자 러닝이 들어 있다.

**When** 다음을 추가하고 실행한다.

```ts
it('extracts the real request_id even when the preview contains lookalike runs', async () => {
  const c = await build()
  const body = await raisePermissionRequest(c, {
    request_id: 'nmjkh', tool_name: 'Bash',
    description: 'command 를 실행합니다',
    input_preview: 'git commit --amend --no-edit',
  })
  expect(permissionRequestId(body)).toBe('nmjkh')

  // 그리고 그 ID 로 보낸 판정이 실제로 닿는다
  await fetch(`http://127.0.0.1:${c.port}/api/rooms/1/messages`, {
    method: 'POST', headers: { cookie: c.cookie }, body: verdictForm('nmjkh', 'allow'),
  })
  expect(JSON.parse(await c.nextBotFrame())).toMatchObject({ request_id: 'nmjkh' })
})
```

**Then** 테스트가 통과한다.

이것이 `plan.md` §D 2번의 회귀 검사다. 원본의 `/[a-km-z]{5}/.exec(body)?.[0]` 를 넣으면 `descrip`… 이 아니라 `comma`(`command` 안)가 먼저 잡혀 첫 단언에서 실패한다. **입력 본문을 손으로 적지 않고 브로커가 만든 실물을 쓰는 것**이 이 기준의 무게를 지는 부분이다 — 템플릿이 바뀌면 여기서 즉시 드러난다.

### AC-WEBRICH-004 — 화면에 뜬 초대 명령의 토큰이 실제로 붙는다

**Given** 방 `1` 과 봇 하나가 등록돼 있다.

**When** 다음을 추가하고 실행한다.

```ts
it('shows an invite command whose token actually authenticates', async () => {
  const c = await build()
  const res = await c.post('/api/rooms/1/invites', { bot_id: c.botId })   // 201
  const commandEl = { textContent: '' }, resultEl = { hidden: true }
  applyInviteResult({ commandEl, resultEl }, res)                          // UI 가 하는 일 그대로

  expect(resultEl.hidden).toBe(false)
  expect(commandEl.textContent).toBe(res.command)

  // 화면 문자열에서 토큰을 되뽑아 그 토큰만으로 게이트웨이에 붙는다
  const token = /MINIDISCORD_TOKEN=([0-9a-f]{64})/.exec(commandEl.textContent)[1]
  const ws = new WebSocket(`ws://127.0.0.1:${c.port}/bot`)
  await once(ws, 'open')
  ws.send(JSON.stringify({ type: 'hello', token }))
  expect(JSON.parse(await once(ws, 'message'))).toMatchObject({ type: 'welcome', room_id: 1 })
})
```

**Then** 테스트가 통과한다.

`commandEl`·`resultEl` 자리에 평범한 객체 리터럴을 넘기는 것은 의도다. `InviteNodes` 는 `Element` 가 아니라 `{ textContent }`·`{ hidden }` 만 요구하는 **구조적 형**으로 정의돼 있으므로(REQ-WEBRICH-001), 이 골격은 `node` 환경에서 DOM 없이 돌면서도 `npm run typecheck -w server` 를 통과한다(감사 O-6).

이 기준은 "명령이 표시된다"가 아니라 **"표시된 명령이 실제로 작동한다"** 를 잰다. `applyInviteResult` 가 문자열을 자르거나 다시 조립하거나 `res.token` 으로 명령을 손수 만들면, 그 토큰은 `sha256Hex` 대조를 통과하지 못하거나 명령 형식이 어긋나 `welcome` 이 오지 않는다.

### AC-WEBRICH-005 — 토큰이 화면 밖 어디에도 남지 않는다

**Given** 골격 B (jsdom).

**When** 다음을 추가하고 실행한다.

```ts
it('keeps the one-time token in the DOM and nowhere else', () => {
  const commandEl = document.createElement('pre')
  const resultEl = document.createElement('div'); resultEl.hidden = true
  const command = 'export MINIDISCORD_TOKEN=deadbeef\nexport MINIDISCORD_SERVER=ws://127.0.0.1:3000/bot'

  applyInviteResult({ commandEl, resultEl }, { command })

  // 존재 축 — 실제로 표시됐다 (이게 없으면 아래 부재 단언들이 공허하다)
  expect(commandEl.textContent).toBe(command)
  expect(resultEl.hidden).toBe(false)

  // 부재 축
  expect(localStorage.length).toBe(0)
  expect(sessionStorage.length).toBe(0)
  expect(document.cookie).not.toContain('deadbeef')
  expect(location.href).not.toContain('deadbeef')
})
```

그리고 정적 검사 한 줄을 함께 실행한다.

```bash
grep -nE "localStorage|sessionStorage|document\.cookie|indexedDB|history\.(push|replace)State|console\." web/rich.js
```

**Then** 테스트가 통과하고, `grep` 이 아무것도 출력하지 않는다(종료 코드 1).

`plan.md` §E 훑기에 따라 **존재 축 두 줄을 먼저 둔** 이유: 부재 단언만 있으면 `applyInviteResult` 가 빈 함수여도 전부 통과한다.

### AC-WEBRICH-006 — 복사는 명령 전체를 옮기고, 못 하면 실패를 알린다

**Given** 골격 B.

**When** 다음을 추가하고 실행한다.

```ts
it('copies the whole command and reports failure when clipboard is absent', async () => {
  const command = 'export MINIDISCORD_TOKEN=abc123\nexport MINIDISCORD_SERVER=ws://127.0.0.1:3000/bot\nclaude ...'
  const seen = []
  const nav = { clipboard: { writeText: t => { seen.push(t); return Promise.resolve() } } }

  expect(await copyText(command, { nav, onFail: () => { throw new Error('불려선 안 됨') } })).toBe(true)
  expect(seen).toEqual([command])            // 잘리거나 첫 줄만 가면 실패

  const fails = []
  expect(await copyText(command, { nav: {}, onFail: e => fails.push(e) })).toBe(false)
  expect(fails).toHaveLength(1)              // 조용히 성공한 척하면 실패
})
```

**Then** 테스트가 통과한다. 원본의 `navigator.clipboard.writeText(...)` 를 그대로 쓰면 두 번째 블록이 `TypeError` 로 던져 실패한다.

### AC-WEBRICH-007 — 이미지 첨부는 인라인 이미지가 된다

**When**

```ts
it('renders an image attachment inline', () => {
  const node = att({ id: 12, filename: '설계도.PNG' })
  expect(node.tagName).toBe('IMG')
  expect(node.getAttribute('src')).toBe('/api/attachments/12')
  expect(node.getAttribute('alt')).toBe('설계도.PNG')
  expect(node.className).toContain('attachment-image')
})
```

**Then** 통과한다. 확장자 비교를 소문자로 정규화하지 않으면 `.PNG` 가 링크로 떨어져 첫 단언에서 실패한다.

### AC-WEBRICH-008 — 그 밖의 파일은 다운로드 링크가 된다

**When**

```ts
it('renders a non-image attachment as a download link', () => {
  const node = att({ id: 7, filename: '보고서.pdf' })
  expect(node.tagName).toBe('A')
  expect(node.getAttribute('href')).toBe('/api/attachments/7')
  expect(node.textContent).toContain('보고서.pdf')
  expect(node.className).toContain('attachment')
})
```

**Then** 통과한다.

### AC-WEBRICH-009 — 파일명과 id 를 신뢰하지 않는다

**When**

```ts
it('never lets a filename or id become markup or a foreign URL', () => {
  const evil = buildAttachmentNode({ id: 3, filename: '<img src=x onerror=alert(1)>.txt' }, document)
  expect(evil).not.toBeNull()                                     // 먼저 존재를 확정한다
  if (evil === null) throw new Error('노드가 만들어지지 않았다')   // 이후 접근의 형을 좁힌다
  expect(evil.children.length).toBe(0)                            // 요소 자식이 하나도 없다
  expect(evil.textContent).toContain('<img src=x onerror=alert(1)>.txt')
  expect(evil.getAttribute('href')).toBe('/api/attachments/3')

  expect(buildAttachmentNode({ id: 'javascript:alert(1)', filename: 'a.txt' }, document)).toBeNull()
  expect(buildAttachmentNode({ id: -1, filename: 'a.txt' }, document)).toBeNull()
  expect(buildAttachmentNode({ id: 1.5, filename: 'a.txt' }, document)).toBeNull()
})
```

그리고 함께 실행한다.

```bash
grep -nE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" web/rich.js
```

**Then** 테스트가 통과하고 `grep` 이 아무것도 출력하지 않는다.

`children.length === 0` 이 무게를 진다 — `innerHTML` 로 만들면 `<img>` 요소가 실제로 생겨 이 단언이 깨진다. 문자열 부재 검사만으로는 잡히지 않는다.

### AC-WEBRICH-010 — 같은 요청에 두 번 보내지 않는다

**When**

```ts
it('sends exactly one verdict per request and locks both buttons', () => {
  const api = vi.fn().mockResolvedValue({ ok: true })
  const rich = createRichContext({ api, doc: document })
  const el = msgEl()
  rich.decorate(el, { room_id: 1, author_type: 'system', body: REQUEST_BODY, attachments: [] })

  const [yes, no] = el.querySelectorAll('button')
  yes.click(); yes.click(); no.click()

  expect(api).toHaveBeenCalledTimes(1)                    // ← 전송 없는 구현도 잡는다
  expect(api.mock.calls[0][0]).toBe('/api/rooms/1/messages')
  expect(yes.disabled).toBe(true)
  expect(no.disabled).toBe(true)
})
```

`REQUEST_BODY` 는 골격 A 가 실제 브로커에서 뽑아 이 파일에 상수로 공유한 본문이다.

**Then** 통과한다. `toHaveBeenCalledTimes(1)` 이 없으면 "아무것도 전송하지 않고 버튼만 잠그는" 구현이 통과한다 — `plan.md` §E 훑기에서 고친 자리다.

### AC-WEBRICH-011 — 이미 끝난 요청에는 살아 있는 버튼이 없다

**When**

```ts
it('locks buttons whichever order the resolution arrives', () => {
  const api = vi.fn(); const rich = createRichContext({ api, doc: document })

  // (가) 결과가 먼저 그려진 뒤 요청이 그려지는 경우 — 방 재입장 경로
  const a1 = msgEl(); rich.decorate(a1, { room_id: 1, author_type: 'system', body: RESOLVED_BODY })
  const a2 = msgEl(); rich.decorate(a2, { room_id: 1, author_type: 'system', body: REQUEST_BODY })
  expect([...a2.querySelectorAll('button')].filter(b => !b.disabled)).toHaveLength(0)

  // (나) 요청이 먼저, 결과가 SSE 로 나중에 오는 경우
  const rich2 = createRichContext({ api, doc: document })
  const b1 = msgEl(); rich2.decorate(b1, { room_id: 1, author_type: 'system', body: REQUEST_BODY })
  expect([...b1.querySelectorAll('button')].every(b => !b.disabled)).toBe(true)   // 아직 살아 있다
  const b2 = msgEl(); rich2.decorate(b2, { room_id: 1, author_type: 'system', body: RESOLVED_BODY })
  expect([...b1.querySelectorAll('button')].every(b => b.disabled)).toBe(true)    // 이제 잠겼다
})
```

`RESOLVED_BODY` 도 **실제 브로커가 발행한 판정 결과 본문**이다 — 골격 A 가 판정을 한 번 보낸 뒤 방에 남은 system 메시지를 뽑아 공유한다. 이모지 변이 선택자를 손으로 옮겨 적지 않는다 (`plan.md` §E 위험 2).

**Then** 통과한다. (나) 의 중간 단언이 "처음부터 다 잠그는" 구현을 잡는다.

### AC-WEBRICH-012 — 버튼이 붙지 않아야 할 곳에는 붙지 않는다

**When**

```ts
it('attaches verdict buttons only to real permission requests', () => {
  const rich = createRichContext({ api: vi.fn(), doc: document })
  const cases = [
    { room_id: 1, author_type: 'user', body: '승인하려면 "yes qwerz", 거절하려면 "no qwerz" 라고 답해주세요.' },
    { room_id: 1, author_type: 'bot',  body: 'yes qwerz 라고 하세요' },
    { room_id: 1, author_type: 'system', body: '⚠️ 봇이 접속을 끊었습니다' },
  ]
  for (const m of cases) {
    const el = msgEl(); rich.decorate(el, m)
    expect(el.querySelectorAll('button')).toHaveLength(0)
  }
  // 같은 회차에서 진짜 요청에는 붙는다 — 위 부재 단언이 공허하지 않다는 증거
  const ok = msgEl(); rich.decorate(ok, { room_id: 1, author_type: 'system', body: REQUEST_BODY })
  expect(ok.querySelectorAll('button')).toHaveLength(2)
})
```

**Then** 통과한다. 첫 케이스는 `author_type` 검사가 없는 구현을 잡는다 — 사용자가 요청 문구를 그대로 따라 쳐도 버튼이 생기면 안 된다.

### AC-WEBRICH-013 — 다이얼로그를 닫으면 토큰이 DOM 에서 사라진다

**When**

```ts
it('wipes the command when the dialog closes', () => {
  const commandEl = document.createElement('pre')
  const resultEl = document.createElement('div')
  applyInviteResult({ commandEl, resultEl }, { command: 'export MINIDISCORD_TOKEN=secret' })
  expect(commandEl.textContent).toContain('secret')

  clearInviteResult({ commandEl, resultEl })
  expect(commandEl.textContent).toBe('')
  expect(resultEl.hidden).toBe(true)
})
```

**Then** 통과한다.

### AC-WEBRICH-014 — 스타일은 디자인 토큰만 쓴다

**When** 이 SPEC 이 `web/style.css` 에 추가한 블록에 대해 다음을 실행한다. 블록은 주석 표지 `/* SPEC-WEBRICH-001 */` 로 시작하고 `/* /SPEC-WEBRICH-001 */` 로 끝난다.

```bash
# 존재 축 — 블록이 실제로 있고 토큰을 참조한다
awk '/SPEC-WEBRICH-001 \*\//,/\/SPEC-WEBRICH-001/' web/style.css | tee /tmp/webrich-css.txt
grep -c "var(--md-" /tmp/webrich-css.txt          # 1 이상
grep -q "design-tokens.css" web/style.css          # 토큰 파일이 실제로 로드된다 (계약 5)

# 계약 5-1 — 이 SPEC 의 블록은 @import 줄보다 뒤에 있다
[ "$(grep -n '@import' web/style.css | head -1 | cut -d: -f1)" \
  -lt "$(grep -n 'SPEC-WEBRICH-001 \*/' web/style.css | head -1 | cut -d: -f1)" ]

# 계약 5-3 — index.html 에 토큰 <link> 를 더하지 않았다
test -s web/index.html                             # 선행: 파일이 실재하고 비어 있지 않다
grep -c "design-tokens.css" web/index.html         # 0 이어야 한다 (종료 코드 1 — 값으로 읽는다)

# 부재 축 — 그 블록 안에 원시 hex 가 없다
grep -nE "#[0-9a-fA-F]{3,8}\b" /tmp/webrich-css.txt   # 일치 없음(exit 1)
```

**Then** 존재 축 세 검사가 성립하고, `test -s web/index.html` 이 종료 코드 `0` 이며, `grep -c ... web/index.html` 이 **`0` 이라는 값을 출력**한다(그 명령의 종료 코드는 `1` 이다 — 값으로 읽고, 이 블록을 `set -e` 스크립트로 옮기지 않는다). 마지막 `grep` 은 아무것도 출력하지 않는다. 존재 축이 없으면 블록이 아예 없어도 통과한다.

**`test -s` 를 앞에 둔 이유 (0.3.0 공허 훑기).** `web/index.html` 이 아직 없으면 `grep -c` 는 표준 오류로 `No such file` 을 내고 표준 출력에는 **아무것도 쓰지 않는다.** "0 을 출력한다"를 눈으로 읽는 사람은 그 빈 출력을 `0` 으로 오해할 수 있다 — 실패해야 할 자리가 공허하게 통과하는 길이다. `test -s` 가 그 길을 막는다(감사 O-13 의 종료 코드 표기도 함께 명시했다).

**0.2.0 에서 고친 것 (감사 MF-7).** 0.1.0 은 토큰 로딩을 `grep -q "design-tokens.css" web/index.html` 로 확인했다. `SPEC-WEBSHELL-001` §4.8 계약 5는 로딩 경로를 `style.css` 의 `@import` **하나**로 확정하고 `index.html` 에는 그 문자열이 **없다**고 못 박는다. 즉 0.1.0 의 명령은 **세 SPEC 이 전부 옳게 구현됐을 때 정확히 그때 실패한다.** 대상을 `web/style.css` 로 바꾸고, 반대 방향(형제가 `index.html` 에 `<link>` 를 더해 "고치는" 경로)을 `grep -c ... = 0` 으로 함께 봉인했다. 두 경로로 토큰이 실리면 `AC-WEBSHELL-005` 관측 1(`@import` 정확히 한 줄)의 의미가 흐려진다.

### AC-WEBRICH-015 — [MANUAL] 사람 눈으로 보는 시각 확인

기계로 잴 수 없는 것만 남긴다. 이 기준은 **자동 검사가 아니며 그렇게 위장하지 않는다.**

**Given** `npm run dev -w server` 로 서버를 띄우고 브라우저로 `http://127.0.0.1:3000` 을 연 뒤 로그인해 방 하나에 들어간다.

**When** (1) `.png` 파일 하나와 `.pdf` 파일 하나를 함께 첨부해 메시지를 보낸다. (2) `🤖 봇 초대` 를 눌러 봇 하나를 고른다.

**Then** 아래 다섯 가지를 눈으로 확인하고, 각각 예/아니오로 `progress.md` §E.2 에 적는다.

1. `.png` 는 메시지 아래에 **그림 자체가** 보인다 (파일명 링크가 아니다). — `plan.md` §E 위험 7 이 여기서 판정된다.
2. `.pdf` 는 `📄 보고서.pdf` 칩으로 보이고, 눌렀을 때 다운로드가 시작된다.
3. 첨부 칩의 배경이 채팅 영역 배경보다 **어둡고**(`--md-bg-panel` 이 `--md-bg-main` 보다 어둡다), 글자가 링크색(하늘색)이다.
4. 초대 다이얼로그의 명령 상자가 가장 어두운 배경(`--md-bg-sidebar`)이고, 줄바꿈이 보존돼 네 줄 이상으로 표시된다.
5. `명령 복사` 를 누른 뒤 아무 텍스트 편집기에 붙여 넣으면 `export MINIDISCORD_TOKEN=…` 줄과 `claude …` 줄이 **모두** 들어 있다.

1번이 아니오면 run 단계에서 블로커로 보고한다(서버 `content-disposition` 조정은 이 SPEC 범위 밖).

### AC-WEBRICH-016 — 범위 경계와 `renderMessage` 불가침, 그리고 이음매 배선

**When**

```bash
# 관측 0 — 기준 SHA 가 실재한다. 이 줄이 실패하면 아래 관측은 전부 무의미하다.
BASE=$(cat .moai/specs/SPEC-WEBRICH-001/.spec-base-sha 2>/dev/null)
git rev-parse --verify "$BASE^{commit}"            # 종료 코드 0 + 40자리 SHA

# 관측 1 — 서버 소스 변경 없음
git diff --name-only "$BASE" -- server/src        # 빈 출력

# 관측 2 — 변경 파일이 허용 집합 안
git diff --name-only "$BASE" | sort               # 아래 허용 집합의 부분집합

# 관측 3 — renderMessage 본체를 한 줄도 건드리지 않았다 (REQ-WEBRICH-002 금지 절)
#   3-a 선행: base 시점 web/app.js 가 실재하고 비어 있지 않다
git show "$BASE:web/app.js" > /tmp/webrich-app-base.js
wc -l < /tmp/webrich-app-base.js                   # 0 보다 커야 한다
#   3-b 선행: 그 파일에서 renderMessage 의 줄 범위가 실제로 잡힌다
awk '/^(export[[:space:]]+)?(function[[:space:]]*renderMessage[[:space:]]*\(|const[[:space:]]+renderMessage[[:space:]]*=)/{s=NR}
     s&&/^\}/{print s","NR; exit}' /tmp/webrich-app-base.js | tee /tmp/webrich-range.txt
#   3-c 판정: 그 범위와 겹치는 헝크의 추가·삭제 줄 수를 센다
git diff -U0 "$BASE" -- web/app.js > /tmp/webrich-app.diff
awk -v range="$(cat /tmp/webrich-range.txt)" '
  BEGIN { split(range, r, ","); lo=r[1]+0; hi=r[2]+0; add=0; del=0 }
  /^@@/ { split($0, h, " "); o=h[2]; sub(/^-/, "", o); split(o, a, ",");
          st=a[1]+0; len=(a[2]=="" ? 1 : a[2]+0); en=st+len-1;
          inr = !(en < lo || st > hi); next }
  inr && /^\+/ && !/^\+\+\+/ { add++ }
  inr && /^-/  && !/^---/    { del++ }
  END { printf "add=%d del=%d\n", add, del }' /tmp/webrich-app.diff

# 관측 4 — 배선이 실재하고, 넘기는 값이 팩토리 그 자체다 (REQ-WEBRICH-002 배선 절)
grep -c "registerMessageDecorator(createRichContext)" web/app.js    # 정확히 1
grep -c "registerMessageDecorator(createRichContext(" web/app.js    # 0 — 호출 결과를 넘기면 안 된다
grep -c "registerMessageDecorator(" web/app.js                      # 정확히 2 — 형제의 정의 1 + 이 SPEC 의 배선 1
grep -c "createRichContext" web/app.js                              # 2 이상 — import 1 + 배선 1
```

관측 5 는 골격 B 에 넣는다. **골격 B 에서 `web/app.js` 를 적재하는 테스트는 이것 하나뿐이다** — 나머지 열넷은 `web/rich.js` 만 import 한다.

```ts
it('web/app.js 가 registerMessageDecorator 에 createRichContext 를 실제로 등록한다', async () => {
  const html = readFileSync(join(webDir, 'index.html'), 'utf8')
  document.body.innerHTML = html.replace(/[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '')

  const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
  ;(globalThis as Record<string, unknown>).fetch = vi.fn(async (url: string) => {
    if (url.startsWith('/api/rooms/1/messages')) return json({ messages: [{
      id: 1, room_id: 1, author_type: 'user', author_user_id: 1, author_bot_id: null,
      author_name: 'u', body: '첨부 있음', created_at: '2026-08-27 10:00:00',
      attachments: [{ id: 9, filename: '보고서.pdf' }],
    }] })
    if (url.startsWith('/api/rooms/1/invites')) return json([])
    if (url.startsWith('/api/rooms')) return json({ active: [{ id: 1, name: '방' }], archived: [] })
    if (url.startsWith('/api/bots')) return json([])
    return json({})
  })
  // SSE 는 이 관측의 대상이 아니다. 과거 대화 렌더 경로만 지난다.
  ;(globalThis as Record<string, unknown>).EventSource = class { addEventListener() {} close() {} }

  vi.resetModules()
  const app = await import(/* @vite-ignore */ new URL('../../web/app.js?wire=1', import.meta.url).href)
  await app.loadRooms()
  await app.openRoom(1)
  for (let i = 0; i < 20; i++) await Promise.resolve()

  const nodes = document.querySelectorAll('#messages .message a.attachment')
  expect(nodes).toHaveLength(1)                                  // 배선이 없으면 0
  expect(nodes[0].getAttribute('href')).toBe('/api/attachments/9')
})
```

허용 집합: `web/rich.js`, `web/rich.d.ts`, `web/app.js`, `web/index.html`, `web/style.css`, `server/package.json`, `package-lock.json`, `server/test/web-rich.test.ts`, `server/test/web-permission-contract.test.ts`, `server/vitest.config.ts`(§6 의 대체 경로를 쓴 경우에만), `.moai/specs/SPEC-WEBRICH-001/*`.

**Then** 여섯 가지가 모두 성립한다.

0. 관측 0 이 **종료 코드 `0`** 으로 40자리 SHA 한 줄을 출력한다. `fatal:` 이 나오면 **이 기준은 실패**이며 아래로 넘어가지 않는다.
1. 관측 1 이 종료 코드 `0` 이고 아무것도 출력하지 않는다.
2. 관측 2 의 모든 줄이 허용 집합 안에 든다.
3. 관측 3 의 선행 둘이 성립하고 — 3-a 가 `0` 보다 큰 수를, 3-b 가 `120,148` 같은 **두 수**를 출력한다 — 3-c 가 **`add=0 del=0`** 을 출력한다. 선행 둘 가운데 하나라도 비면 **실패**다. 통과가 아니다.
4. 관측 4 의 네 명령이 각각 `1`, `0`, `2`, `2 이상`을 출력한다. 네 수는 전부 **값으로** 읽는다 — 둘째 명령은 옳은 구현에서 종료 코드 `1` 로 끝나므로 이 블록을 `set -e` 스크립트로 옮기지 않는다.

   **판정의 무게는 첫째와 둘째 명령이 진다.** 첫째가 `1`(배선이 실재하고 값이 팩토리 그 자체), 둘째가 `0`(호출 결과를 넘기지 않았다) — 이 둘이 MF-9 의 두 얼굴을 정확히 가른다. 셋째·넷째는 보조 계수이며, `grep -c` 는 주석 안의 언급도 세므로 기대치와 다른 수가 나오면 **곧바로 실패로 읽지 말고 그 줄을 확인한다.** 형제가 자기 문서 주석에 이름을 한 번 더 적었다는 이유로 옳은 구현이 붉어지는 것은 이 문서가 두 라운드에 걸쳐 없앤 바로 그 부류다. 첫째·둘째가 각각 `1`·`0` 이고 셋째·넷째의 초과분이 전부 주석임을 확인했다면 이 관측은 성립한다.
5. 관측 5 의 테스트가 통과한다.

**관측 0 이 맨 앞에 있어야 하는 이유 (감사 MF-10).** `.spec-base-sha` 가 없으면 `BASE` 가 빈 문자열이 되고, `git diff --name-only "" -- server/src` 는 `fatal: bad revision ''` 을 **표준 오류**로 낸 뒤 종료 코드 `128` 로 끝난다. **표준 출력은 비어 있다.** 그러면 관측 1의 "빈 출력"이 성립하고, 관측 2도 빈 목록이 허용 집합의 부분집합이라 성립하고, 관측 3도 셀 입력이 없어 성립해 버린다. 즉 **run 단계 첫 동작을 건너뛴 실행에서 이 기준 전체가 조용히 통과한다.** 0.2.0 은 MF-8 을 메우려고 관측을 더하면서 그 관측의 선행 조건은 함께 더하지 않았고, 그것이 이번 라운드가 드러낸 부류다. 형제 둘(`SPEC-WEBSHELL-001/acceptance.md` AC-015 관측 2, `SPEC-WEBCHAT-001/acceptance.md` AC-015 관측 1)은 이미 같은 가드를 갖고 있었으므로, 여기서 한 일은 셋의 방어 수준을 맞춘 것뿐이다.

**3-a·3-b 가 선행 조건인 이유 (감사 MF-10 둘째 경로, O-10·O-11).** 같은 관측에 공허로 무너지는 길이 둘 더 있었다. 첫째, `plan.md` §A 는 두 선행 SPEC 이 아직 없을 때도 이 SPEC 의 일부는 진행할 수 있다고 적는데, 그 순서로 실행하면 base 시점에 `web/app.js` 가 없어 `git show` 가 실패하고 셀 입력이 비어 관측 3이 다시 공허해진다 — 3-a 가 그것을 **실패**로 바꾼다. 둘째, 0.2.0 의 awk 패턴은 `export function renderMessage (m)`(괄호 앞 공백)이나 `const renderMessage = (m) =>` 형태를 놓쳐 범위가 비고, 비면 역시 조용히 통과했다 — 패턴을 넓히고 3-b 를 선행 조건으로 올려 두 길을 함께 막았다. 그리고 0.2.0 은 "위 범위와 겹치는 헝크의 추가·삭제 줄 수"라는 주석만 있고 **실제로 세는 명령이 없었다**(감사 O-10). 3-c 가 그 자리를 메운다.

`renderMessage` 범위를 base 시점 파일에서 뽑는 것이 관측 3의 무게를 지는 부분이다. 구현 후 파일에서 뽑으면 함수를 통째로 다시 쓴 구현이 자기가 쓴 새 범위를 재게 되어 관측이 공허해진다.

**관측 4·5 를 더한 이유 (감사 MF-9).** 0.2.0 까지 세 SPEC 의 48개 기준 가운데 **실제 배선을 관측하는 것이 하나도 없었다.** `AC-WEBCHAT-002` 는 테스트가 만든 가짜 팩토리를 등록해 생산자 절반만 재고, `AC-WEBRICH-010`·`011`·`012` 는 `createRichContext` 를 테스트가 직접 부른다 — 어느 쪽도 배선을 지나지 않는다. 즉 48개가 전부 초록인 상태에서 실제 앱에는 첨부도 권한 버튼도 뜨지 않을 수 있었다. 관측 4는 배선 줄의 존재와 **넘기는 값의 형태**를 정적으로 못 박고(둘째 명령이 `createRichContext(...)` 호출 결과를 넘기는 오구현을 정확히 잡는다), 관측 5는 실제 `openRoom` 경로를 지나 첨부 노드가 생기는지를 본다. `.decorate` 를 넘긴 구현은 `factory({ api, doc })` 가 실제로는 `decorate({ api, doc }, undefined)` 를 부르게 되어, 관측 5에서 `TypeError` 로 죽거나 노드 0개로 실패한다.

**관측 5 는 형제 둘의 산출물을 요구한다.** `web/app.js` 와 `web/index.html` 이 트리에 있어야 하므로, 두 선행 SPEC 이 아직 착수되지 않았다면 이 관측은 **실패**한다 — 공허하게 통과하지 않는다. 그 경우 `plan.md` §A 대로 블로커로 보고한다.

**0.2.0 에서 관측 3을 더한 이유 (감사 MF-8, 유지).** 0.1.0 의 AC-016 은 변경 **파일 목록**만 봤고 허용 집합에 `web/app.js` 가 통째로 들어 있었다. 그래서 `renderMessage` 를 통째로 교체한 구현 — 이 SPEC 이 `plan.md` §D 1번에서 명시적으로 이탈하겠다고 선언한 원본 Task 17 의 지시를 그대로 따른 구현 — 이 열여섯 기준을 전부 초록으로 통과했다. 새 AC 를 만들지 않고 이미 REQ-002 에 매핑돼 있던 이 기준을 강화한 이유는 Tier M 상한이 16/16 으로 차 있기 때문이며, 그것이 옳은 자리이기도 하다. 0.3.0 의 관측 4·5 도 같은 이유로 여기 들어왔다 — REQ-002 의 배선 절을 관측하는 자리는 REQ-002 를 관측하는 기준이다.

`server/package.json` 과 `package-lock.json` 이 허용 집합에 있는 것은 `jsdom` 개발 의존성 추가 때문이다 (`plan.md` §C). `server/vitest.config.ts` 가 허용 집합에 있는 것은 §6 의 대체 경로 때문이다 — 이 SPEC 은 골격 A(`node`)와 골격 B(`jsdom`) 두 환경을 동시에 쓰는 유일한 SPEC 이라 도크블록이 듣지 않을 때 그 파일을 손대야 할 가능성이 형제보다 높은데, 0.2.0 의 허용 집합에만 그 파일이 빠져 있어 **옳은 구현이 자기 기준에서 실패할 수 있었다**(감사 MF-11). 형제 둘의 허용 집합과 이제 일치한다. 그 밖의 서버 변경은 없다.

기준점 `.spec-base-sha` 는 run 단계 첫 동작으로 채운다 — 절대 파일 목록이 아니라 **상대 diff** 로 판정하는 이유는 형제 SPEC 두 개가 같은 카드에서 `web/` 를 동시에 만들고 있어, 절대 열거로 못 박으면 구현이 옳아도 실행 순서에 따라 위반이 되기 때문이다(`SPEC-SSE-001` §D 7번의 같은 교훈).

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| `attachments` 가 없는 메시지 | 아무 노드도 만들지 않는다 | AC-012 의 세 케이스가 그대로 이 경우다 |
| 같은 방에 요청 두 개가 동시에 열림 | 각 요청 메시지가 자기 ID 의 버튼을 갖고, 판정은 각각 잠근다 | `pending` 이 `request_id` 로 키가 잡히므로 성립. AC-011 (나) 가 같은 경로 |
| 봇이 오프라인일 때 승인 | 서버가 `⚠️ … 전달하지 못했습니다 (id)` 를 남기고 대기 항목을 지운다 | `permissionResolutionId` 가 그 본문도 인식해 버튼을 잠근다 (AC-011 의 `RESOLVED_BODY` 를 이 형태로도 한 번 돌린다) |
| 첨부 파일명에 확장자가 없음 | 링크로 떨어진다 | `isImageFilename` 이 `false` |
| `.png` 인데 내용이 텍스트 | 깨진 이미지로 보인다 | 수용 — `mime` 이 응답에 없다 (`plan.md` §D 4·§E 5) |
| 다른 방의 요청 메시지 | 서버가 방 불일치를 걸러 판정도 소비도 하지 않는다 | 서버 쪽 성질(`REQ-PERM-011`). UI 는 `m.room_id` 를 그대로 쓰므로 정상 경로에서는 발생하지 않는다 |
| 클립보드 쓰기를 사용자가 거부 | `writeText` 가 거부 → `false` + `onFail` | AC-006 두 번째 블록과 같은 경로 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| 테스트 | 전부 통과, 실패 0 | `npm test -w server -- --run` |
| 타입 | 오류 0 | `npm run typecheck -w server` |
| 주입 경로 | 일치 없음 | `grep -nE "innerHTML\|outerHTML\|insertAdjacentHTML\|document\.write\|eval\(\|new Function" web/rich.js` |
| 토큰 영속 | 일치 없음 | `grep -nE "localStorage\|sessionStorage\|document\.cookie\|indexedDB" web/rich.js` |
| 범위 | `server/src` diff 빈 출력 | AC-016 |
| 변이 검증 | 네 건 모두 RED 로 전이 | `plan.md` §G |

---

## Definition of Done

- [ ] AC-001 … AC-014, AC-016 이 명령 실행으로 GREEN 이고 원문 출력이 `progress.md` §E.2 에 있다
- [ ] `git rev-parse --verify "$(cat .moai/specs/SPEC-WEBRICH-001/.spec-base-sha)^{commit}"` 이 종료 코드 `0` 으로 40자리 SHA 를 출력함. **빈 출력만으로 AC-016 의 diff 관측을 통과 처리하지 않음**
- [ ] AC-016 관측 3 의 선행 둘(base `web/app.js` 비어 있지 않음, `renderMessage` 범위 두 수)이 실제 출력으로 확인됨
- [ ] AC-016 관측 4 의 네 수(`1`·`0`·`2`·`2 이상`)와 관측 5 테스트 통과가 원문 출력으로 남아 있음 — **배선이 실제로 이어졌다는 유일한 증거**
- [ ] `npm test -w server -- --run --reporter=verbose` 출력에 이 SPEC 의 두 테스트 파일 이름이 나타나고, 요약 줄의 `skipped`·`todo` 가 **0** 이다. 파일이 없거나 `it.skip` 인 실행은 종료 코드 `0` 이어도 GREEN 이 아니다
- [ ] AC-015 다섯 항목이 예/아니오로 기록돼 있다 (아니오가 있으면 블로커로 보고)
- [ ] `plan.md` §G 변이 검증 네 건이 모두 RED 로 전이함을 관측했다 (4번은 `renderMessage` 통째 교체 → AC-016 관측 3)
- [ ] `npm test -w server` 와 `npm run typecheck -w server` 가 각각 종료 코드 0
- [ ] `server/src` 아래 변경 0
- [ ] `plan.md` §D 열 건의 이탈이 실제 구현에 반영돼 있다
