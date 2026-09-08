# SPEC-WEBACNAV-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**다. 판정은 이분법이다.

판정 명령은 하나뿐이다 — `cd server && npx vitest run test/web-chat.test.ts`. 아래 테스트는 전부 그 파일 끝에 들어가는 `describe('SPEC-WEBACNAV-001 …')` 한 블록 안의 `it` 이며, 기존 골격(`loadApp` · `baseHandler` · `$$` · `el` · `input` · `type` · `pressEnter` · `flush` · `calls` · `parseMentions` import)을 그대로 쓴다. 봇 목록 응답 키는 현재 골격이 쓰는 **`/api/rooms/1/bots`** 다(형제 `acceptance.md` 의 `/invites` 는 v1 표기이며 현재 테스트 파일과 다르다).

## 이 문서가 지키려는 것 — 빈 구현과 «전부 막기» 구현이 둘 다 떨어지게

형제 `SPEC-WEBCHAT-001/acceptance.md` 가 세운 부류 넷(존재만 보기·이름 없는 통과·부재 보기·깨진 구현과 양립)을 그대로 적용해 여덟 기준을 훑었다. 이 SPEC 에서 특히 가까운 두 형태:

| 잘못된 구현 | 통과할 뻔한 기준 | 막는 관측 |
|-------------|-----------------|-----------|
| 드롭다운 상태와 무관하게 방향키·Esc·Tab 을 전부 `preventDefault` | AC-002·003·004 전반 | AC-005 전반(닫힌 상태 ↓ 가 `defaultPrevented === false`), AC-004 후반(Esc 뒤 `Enter` 가 POST 1회) |
| `applySelection` 이 클래스만 바꾸고 인덱스는 안 옮김(항상 첫 항목) | AC-001 | AC-002(↓ 뒤 `Enter` 가 **CC**), AC-003(감김), AC-007(mouseenter 뒤 `Enter` 가 그 항목) |

## 공통 헬퍼 (기존 `pressEnter` 아래에 하나 추가)

```ts
// keydown 하나를 보내고 이벤트를 돌려준다 — defaultPrevented 를 관측하는 기준(AC-005)이 쓴다
function pressKey(key: string, init: KeyboardEventInit = {}) {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  input().dispatchEvent(ev)
  return ev
}
const selectable = () => $$('#autocomplete .ac-item:not(.disabled)') as HTMLElement[]
const selected = () => $$('#autocomplete .ac-item.selected') as HTMLElement[]
const onePmBot = () => baseHandler({ '/api/rooms/1/bots': [{ bot_id: 1, bot_name: 'pm', online: true }] })
```

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 | 판정 |
|----|----------|------|-------------|------|
| AC-WEBACNAV-001 | REQ-001, REQ-002 | vitest | 배지 `.to` 1·`.cc` 1, `role=listbox`/`option`/`data-kind`, 첫 항목만 `selected`+`aria-selected=true` | 자동 |
| AC-WEBACNAV-002 | REQ-004 | vitest | ↓+`Enter` → `@CC(pm) `·파서 `cc`·POST 0; ↓+`Tab` 도 같음; 선택 가능 항목 0 일 때 `Tab` → 숨김·값 불변·POST 0 | 자동 |
| AC-WEBACNAV-003 | REQ-003 | vitest | ↑ 감김(첫→마지막), ↓ 감김(마지막→첫) | 자동 |
| AC-WEBACNAV-004 | REQ-005 | vitest | `Escape` → hidden·값 `@p` 불변; 이어진 `Enter` → POST 1 | 자동 |
| AC-WEBACNAV-005 | REQ-006, REQ-007 | vitest | 닫힌 상태 ↓ `defaultPrevented=false`; 조합 중 ↓ `defaultPrevented=false`·선택 불변 | 자동 |
| AC-WEBACNAV-006 | REQ-002, REQ-003 | vitest | disabled 행이 있어도 `.selected` 는 늘 1개·결코 disabled 아님 | 자동 |
| AC-WEBACNAV-007 | REQ-001 | vitest | 둘째 항목 `mouseenter` → 그 항목 `.selected`; `Enter` 가 그것을 확정 | 자동 |
| AC-WEBACNAV-008 | §6 회귀, REQ-008 | vitest + bash | 파일 전체 통과·`failed` 0; CSS 새 블록 비어 있지 않고 16진수 색 0건 | 자동 |

---

## Given-When-Then 시나리오

### AC-WEBACNAV-001 — 배지 마크업과 초기 선택

**Given** 방 `1` 에 봇 `pm` 하나가 참여해 있다.
**When** 다음을 추가하고 판정 명령을 실행한다.

```ts
it('renders TO/CC badges with listbox roles and selects the first item', async () => {
  const app = await loadApp(onePmBot())
  await app.openRoom(1); await flush()

  type('@p'); await flush()
  expect(el('autocomplete').hasAttribute('hidden')).toBe(false)
  expect(el('autocomplete').getAttribute('role')).toBe('listbox')

  expect($$('#autocomplete .ac-item .ac-kind.to').length).toBe(1)
  expect($$('#autocomplete .ac-item .ac-kind.cc').length).toBe(1)

  const items = selectable()
  expect(items.length).toBe(2)
  expect(items.map(n => n.getAttribute('role'))).toEqual(['option', 'option'])
  expect(items.map(n => n.dataset.kind)).toEqual(['TO', 'CC'])
  // 배지가 맨 앞 — 기존 AC-WEBCHAT-010 의 startsWith('TO') 탐색이 그대로 맞는다
  expect(items.map(n => n.textContent)).toEqual(['TO pm', 'CC pm'])

  expect(items[0].classList.contains('selected')).toBe(true)
  expect(items[0].getAttribute('aria-selected')).toBe('true')
  expect(items[1].classList.contains('selected')).toBe(false)
  expect(items[1].getAttribute('aria-selected')).toBe('false')
})
```

**Then** 테스트가 통과한다. 배지를 만들지 않는 구현은 셋째 단언에서, 배지를 이름 뒤에 두는 구현은 `textContent` 단언에서, 선택 상태를 적용하지 않는 구현은 마지막 네 단언에서 떨어진다.

### AC-WEBACNAV-002 — ↓ 뒤 Enter(그리고 Tab)가 선택된 CC 를 삽입한다; 선택 가능 항목이 없으면 Tab 은 닫기만 한다

**Given** `@p` 로 드롭다운이 열려 있고 첫 항목(TO)이 선택돼 있다. 둘째 테스트에서는 방에 멘션 불가 이름 `코드 리뷰어` 하나만 있어 드롭다운이 disabled 행 하나만 보여 준다.
**When** 다음을 추가하고 판정 명령을 실행한다.

```ts
it('ArrowDown then Enter (or Tab) commits the selected CC candidate without sending', async () => {
  const app = await loadApp(onePmBot())
  await app.openRoom(1); await flush()

  type('@p'); await flush()
  pressKey('ArrowDown'); await flush()
  expect(selected()[0]?.dataset.kind).toBe('CC')
  pressEnter(); await flush()

  expect(input().value.endsWith('@CC(pm) ')).toBe(true)
  // 실제 서버 파서가 그 봇·그 전달 종류로 해석한다 — 문자열 비교로 대체하지 않는다
  expect(parseMentions(input().value + 'x')).toEqual([{ bot: 'pm', delivery: 'cc' }])
  expect(calls.filter(c => c.method === 'POST').length).toBe(0)
  expect(el('autocomplete').hasAttribute('hidden')).toBe(true)

  // Tab 도 같은 확정 경로다
  type('@p'); await flush()
  pressKey('ArrowDown'); await flush()
  const tab = pressKey('Tab'); await flush()
  expect(tab.defaultPrevented).toBe(true)
  expect(parseMentions(input().value + 'x')).toEqual([{ bot: 'pm', delivery: 'cc' }])
  expect(calls.filter(c => c.method === 'POST').length).toBe(0)
})

it('Tab with no selectable candidate only closes the dropdown', async () => {
  const app = await loadApp(baseHandler({
    '/api/rooms/1/bots': [{ bot_id: 1, bot_name: '코드 리뷰어', online: true }],
  }))
  await app.openRoom(1); await flush()

  type('@코'); await flush()
  expect(el('autocomplete').hasAttribute('hidden')).toBe(false)   // 열려는 있다
  expect($$('#autocomplete .ac-item.disabled').length).toBe(1)   // disabled 행 하나뿐
  expect(selectable().length).toBe(0)

  const tab = pressKey('Tab'); await flush()
  expect(tab.defaultPrevented).toBe(true)
  expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
  expect(input().value).toBe('@코')
  expect(calls.filter(c => c.method === 'POST').length).toBe(0)
})
```

**Then** 두 테스트가 통과한다. «항상 첫 항목» 구현(현재 코드)은 `delivery: 'to'` 가 나와 떨어진다. `Tab` 을 처리하지 않는 구현은 `defaultPrevented` 단언에서 떨어진다. 둘째 테스트는 계획서 밖에서 이 SPEC 이 정한 가장자리(REQ-004 — 선택 가능한 항목이 없으면 닫기만)를 관측한다: 계획서의 `acItems()[acIndex]?.click()` 그대로면 드롭다운이 열린 채 남아 `hidden` 단언에서 떨어지고, 값을 건드리는 구현은 `'@코'` 단언에서 떨어진다. `Shift+Tab` 은 같은 분기를 지나므로 별도 관측을 두지 않는다.

### AC-WEBACNAV-003 — 끝에서 감긴다

**Given** 선택 가능한 항목이 둘(TO, CC)이고 첫 항목이 선택돼 있다.
**When** 다음을 추가하고 판정 명령을 실행한다.

```ts
it('wraps the selection at both ends', async () => {
  const app = await loadApp(onePmBot())
  await app.openRoom(1); await flush()
  type('@p'); await flush()
  const items = selectable()
  expect(items.length).toBe(2)

  pressKey('ArrowUp'); await flush()          // 첫 → 마지막
  expect(selected()).toEqual([items[items.length - 1]])
  expect(items[items.length - 1].getAttribute('aria-selected')).toBe('true')

  pressKey('ArrowDown'); await flush()        // 마지막 → 첫
  expect(selected()).toEqual([items[0]])
  expect(items[0].getAttribute('aria-selected')).toBe('true')
  expect(items[1].getAttribute('aria-selected')).toBe('false')
})
```

**Then** 테스트가 통과한다. 끝에서 멈추는 구현은 첫 `ArrowUp` 뒤 선택이 그대로 첫 항목이라 떨어진다. `toEqual([요소])` 는 «정확히 하나»도 함께 본다.

### AC-WEBACNAV-004 — Escape 는 닫기만 하고, 그 뒤 Enter 는 전송이다

**Given** `@p` 로 드롭다운이 열려 있다.
**When** 다음을 추가하고 판정 명령을 실행한다.

```ts
it('Escape hides the dropdown without touching the value; a following Enter sends normally', async () => {
  const app = await loadApp(onePmBot())
  await app.openRoom(1); await flush()
  type('@p'); await flush()
  expect(el('autocomplete').hasAttribute('hidden')).toBe(false)

  const esc = pressKey('Escape'); await flush()
  expect(esc.defaultPrevented).toBe(true)
  expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
  expect(input().value).toBe('@p')

  // AC-WEBCHAT-012 의 후반과 같은 뜻 — «전부 막기» 구현을 배제한다
  pressEnter(); await flush()
  expect(calls.filter(c => c.method === 'POST').length).toBe(1)
})
```

**Then** 테스트가 통과한다. `Escape` 를 처리하지 않는 구현은 `hidden` 단언에서, 값을 지우거나 확정해 버리는 구현은 `'@p'` 단언에서, 키를 전부 삼키는 구현은 마지막 POST 단언에서 떨어진다.

### AC-WEBACNAV-005 — 닫힌 상태와 IME 조합 중에는 가로채지 않는다

**Given** (전반) 드롭다운이 닫혀 있다. (후반) `@p` 로 열려 있고 조합 중이다.
**When** 다음을 추가하고 판정 명령을 실행한다.

```ts
it('does not intercept arrows/Tab/Escape when closed, nor while composing', async () => {
  const app = await loadApp(onePmBot())
  await app.openRoom(1); await flush()

  // 전반 — 닫힌 상태: 커서 이동·포커스 이동은 브라우저 몫
  type('그냥 텍스트'); await flush()
  expect(el('autocomplete').hasAttribute('hidden')).toBe(true)
  expect(pressKey('ArrowDown').defaultPrevented).toBe(false)
  expect(pressKey('ArrowUp').defaultPrevented).toBe(false)
  expect(pressKey('Tab').defaultPrevented).toBe(false)
  expect(pressKey('Escape').defaultPrevented).toBe(false)

  // 후반 — 열린 상태의 조합 중 keydown: 새 분기도 preventDefault 앞에서 돌아간다
  type('@p'); await flush()
  const before = selected()[0]
  expect(before?.dataset.kind).toBe('TO')
  const composing = pressKey('ArrowDown', { isComposing: true }); await flush()
  expect(composing.defaultPrevented).toBe(false)
  expect(selected()).toEqual([before])
  const legacy = pressKey('ArrowDown', { keyCode: 229 } as KeyboardEventInit); await flush()
  expect(legacy.defaultPrevented).toBe(false)
  expect(selected()).toEqual([before])
})
```

**Then** 테스트가 통과한다. 전반은 «전부 막기» 구현을, 후반은 IME 가드를 `preventDefault` 뒤에 둔 구현을 잡는다. 후반의 `before?.dataset.kind` 단언이 있어야 «선택이 안 옮겨졌다»가 «애초에 선택이 없었다»와 구별된다.

### AC-WEBACNAV-006 — 멘션 불가 행은 결코 선택되지 않는다

**Given** 방에 `코드 리뷰어`(공백 포함, 멘션 불가)와 `pm` 두 봇이 있다. `@` 를 치면 disabled 행 하나와 선택 가능한 행 둘이 함께 그려진다.
**When** 다음을 추가하고 판정 명령을 실행한다.

```ts
it('never selects a disabled row while cycling', async () => {
  const app = await loadApp(baseHandler({
    '/api/rooms/1/bots': [
      { bot_id: 1, bot_name: '코드 리뷰어', online: true },
      { bot_id: 2, bot_name: 'pm', online: true },
    ],
  }))
  await app.openRoom(1); await flush()
  type('@'); await flush()

  expect($$('#autocomplete .ac-item.disabled').length).toBe(1)   // disabled 행이 실제로 있다
  expect(selectable().length).toBe(2)

  const seen = new Set<string>()
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'ArrowUp', 'ArrowUp']) {
    pressKey(key); await flush()
    const cur = selected()
    expect(cur.length).toBe(1)
    expect(cur[0].classList.contains('disabled')).toBe(false)
    expect(cur[0].getAttribute('aria-selected')).toBe('true')
    seen.add(cur[0].dataset.kind ?? '')
  }
  expect([...seen].sort()).toEqual(['CC', 'TO'])   // 두 선택 가능 항목을 실제로 오갔다
})
```

**Then** 테스트가 통과한다. 첫 단언이 disabled 행의 존재를 먼저 확인하므로 «불가 이름이 아예 안 그려지는» 구현으로는 이 기준을 공허하게 통과할 수 없다. 마지막 단언은 선택이 실제로 움직였음을 본다 — 늘 첫 항목에 머무는 구현은 `['TO']` 만 남아 떨어진다.

### AC-WEBACNAV-007 — 마우스가 올라간 항목이 선택 상태가 된다

**Given** `@p` 로 드롭다운이 열려 있고 첫 항목이 선택돼 있다.
**When** 다음을 추가하고 판정 명령을 실행한다.

```ts
it('mouseenter moves the selection to that item and Enter commits it', async () => {
  const app = await loadApp(onePmBot())
  await app.openRoom(1); await flush()
  type('@p'); await flush()
  const items = selectable()
  expect(selected()).toEqual([items[0]])

  items[1].dispatchEvent(new MouseEvent('mouseenter'))
  await flush()
  expect(selected()).toEqual([items[1]])
  expect(items[0].getAttribute('aria-selected')).toBe('false')
  expect(items[1].getAttribute('aria-selected')).toBe('true')

  pressEnter(); await flush()
  expect(parseMentions(input().value + 'x')).toEqual([{ bot: 'pm', delivery: 'cc' }])
})
```

**Then** 테스트가 통과한다. `mouseenter` 를 걸지 않는 구현은 둘째 단언에서, 클래스만 바꾸고 인덱스를 안 옮기는 구현은 마지막 파서 단언(`to` 가 나옴)에서 떨어진다.

### AC-WEBACNAV-008 — 기존 테스트가 그대로 통과하고, CSS 는 토큰만 쓴다

**Given** M1~M5 가 끝난 트리.
**When** 아래를 차례로 실행한다.

```bash
# (1) 기존 기준이 파일 안에 실제로 있다 — «테스트를 지워서 통과»를 배제 (기대: 5)
grep -c "describe('AC-WEBCHAT-0\(09\|10\|11\|12\)\|describe('D-6" server/test/web-chat.test.ts

# (2) 새 describe 가 있다 (기대: 1)
grep -c "describe('SPEC-WEBACNAV-001" server/test/web-chat.test.ts

# (3) 파일 전체 실행 — 종료 코드 0, 출력에 'failed' 없음
(cd server && npx vitest run test/web-chat.test.ts); echo "exit=$?"

# (4) CSS 새 블록이 비어 있지 않음을 먼저 확인한 뒤(기대: 5 이상), 16진수 색 리터럴 0건
sed -n '/\/\* SPEC-WEBACNAV-001 \*\//,/\/\* \/SPEC-WEBACNAV-001 \*\//p' web/style.css | wc -l
sed -n '/\/\* SPEC-WEBACNAV-001 \*\//,/\/\* \/SPEC-WEBACNAV-001 \*\//p' web/style.css | grep -c '#[0-9a-fA-F]\{3,8\}\b'   # 기대: 0

# (5) 손댄 파일이 셋뿐
git status --short
```

**Then** (1) 이 `5`, (2) 가 `1`, (3) 이 `exit=0` 이고 `failed` 가 없으며, (4) 의 첫 명령이 `5` 이상·둘째가 `0`, (5) 에 `web/app.js` · `web/style.css` · `server/test/web-chat.test.ts` 외의 경로가 없다.

(4) 의 «비어 있지 않음» 확인이 먼저인 이유: `sed` 가 아무것도 못 잘라 내면 `grep -c` 는 `0` 을 내고 그 `0` 은 «블록이 없다»와 «리터럴이 없다»를 가르지 못한다. CSS 블록은 `/* SPEC-WEBACNAV-001 */` 로 시작해 `/* /SPEC-WEBACNAV-001 */` 로 끝나야 한다.

---

## 정의 — 완료 (Definition of Done)

- [ ] M1 의 RED 출력(새 `it` 전부 실패 — 수는 `grep -c "^it('" acceptance.md`, 지금 8; 기존 전부 통과)이 `progress.md` §E.2 에 그대로 있다
- [ ] `cd server && npx vitest run test/web-chat.test.ts` 종료 코드 `0`, `failed` 0건 (AC-008 (3))
- [ ] `npm test -w server` 통과 (pretest 타입 검사 포함)
- [ ] AC-WEBACNAV-001~008 전부 초록 — 각 테스트 이름이 출력에 보인다
- [ ] 기존 AC-WEBCHAT-009~012·D-6 테스트의 본문은 한 글자도 바뀌지 않았다 (`git diff` 로 해당 줄 범위 무변경)
- [ ] 손댄 파일이 `web/app.js` · `web/style.css` · `server/test/web-chat.test.ts` 셋뿐
- [ ] CSS 새 블록에 16진수 색 리터럴 0건, 블록은 비어 있지 않음
- [ ] `[HARD]` IME 가드(`web/app.js` 564행 자리)가 `preventDefault` 앞에 그대로 있고, 새 분기의 가드도 같은 순서다
