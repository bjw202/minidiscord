# SPEC-WEBACNAV-001 구현 계획

> 이 문서는 `spec.md` 에서 도출된다. 원본은 승인된 구현 계획 `.moai/plans/floating-stargazing-hamming.md` 이며, 아래 행 번호는 전부 2026-09-08 의 `main`(HEAD `5087a49`) 에서 직접 읽어 확인한 것이다.
>
> 순서는 **바뀔 가능성이 큰 결정을 먼저** 놓았다. §A·§B 가 검토 대상이고, §C 의 마일스톤은 그 결정이 선 뒤의 실행 절차다.

---

## §A 손대는 자리 (읽어서 확인한 앵커)

| 파일 | 자리 | 지금 모양 | 무엇을 |
|------|------|-----------|--------|
| `web/app.js` | 494~499행 `// ── @ 자동완성 ──` 절 머리, `MENTION_TOKEN_RE`·`MENTIONABLE_RE` | 정규식 둘 | 아래에 선택 상태 변수 하나 추가 |
| `web/app.js` | 510~538행 `onComposerInput` | 529~535행이 TO/CC 항목을 `textContent` 한 줄로 만들고 `click` 만 건다; 537행 `box.hidden = false` | 배지 `span` + 텍스트 노드, `role`/`data-kind`, `mouseenter`, 렌더 끝에 선택 상태 적용 |
| `web/app.js` | 542~552행 `commitMention` | 547행이 `@${kind}(${name}) ` 로 치환 | **바꾸지 않는다** |
| `web/app.js` | 556~574행 `onComposerKeyDown` | 557행 `if (e.key !== 'Enter' \|\| e.shiftKey) return` · 564행 IME 가드 · 565행 `preventDefault` · 566~572행 열린 드롭다운의 `Enter` 가 첫 항목 클릭 | 557행 **앞에** 방향키·Esc·Tab 분기; 568행의 «첫 항목»을 «선택된 항목»으로 |
| `web/app.js` | 429~431행 `hideAutocomplete` | `hidden = true` 한 줄 | 선택 상태를 `0` 으로 되돌리는 한 줄 추가 |
| `web/app.js` | 346~348행 이벤트 배선 | `input`·`keydown` 을 `initChat()` 에서 한 번 건다 | **바꾸지 않는다** — 새 리스너 없음 |
| `web/style.css` | 341~346행 `.ac-item`, 348행 `:hover`, 351~356행 `.disabled` | 배지 없음, 선택 강조 없음 | `.ac-item` 을 flex 로, `.ac-item.selected`·`.ac-kind`·`.ac-kind.to`·`.ac-kind.cc` 추가 |
| `web/style.css` | 373~375행 | «색은 `var(--md-*)` 만» 규약 주석 (`/* SPEC-WEBRICH-001 */` 블록 머리) | 따른다. 승인 계획서는 371행이라 적었으나 실제는 373~375행이다 |
| `web/design-tokens.css` | `:root` | 쓸 토큰 11개가 전부 있음 | **바꾸지 않는다** |
| `web/index.html` | 57행 `<div id="autocomplete" hidden></div>` | 속성 없음 | **바꾸지 않는다** — `role` 은 JS 가 붙인다 |
| `server/test/web-chat.test.ts` | 86~108행 `loadApp`, 111~125행 헬퍼, 431~535행 AC-WEBCHAT-009~012, 543~584행 D-6, 파일 끝 717행 | 봇 목록 키는 `/api/rooms/1/bots` | 파일 끝에 새 `describe` 하나 + `pressKey` 헬퍼 |

계획서와 코드가 어긋난 자리는 하나였다 — `style.css` 의 색 규약 주석을 371행이라 적었지만 실제는 373~375행이다(내용은 같다). 나머지 행 번호는 전부 맞았다. 계획서가 적지 않아 여기서 정한 것 둘은 §B 에 있다.

## §B 결정 — 바뀔 가능성이 큰 순서

### B.1 선택 상태의 모양 (가장 먼저 검토)

| 결정 | 값 | 근거 |
|------|-----|------|
| 상태 | 모듈 수준 `let acIndex = 0` — **선택 가능한 항목들**(`.ac-item:not(.disabled)`) 사이의 인덱스 | DOM 의 `selected` 클래스만으로 들면 렌더 때마다 다시 찾아야 하고, 전체 `.ac-item` 인덱스로 들면 disabled 행을 건너뛰는 산술이 매번 필요하다 |
| 되돌리는 자리 | `onComposerInput` 의 렌더 시작과 `hideAutocomplete` | 후보 집합이 바뀌면 옛 인덱스는 뜻이 없다. 이전 위치 기억은 범위 밖(§5) |
| 마우스 동기화 | 선택 가능한 항목의 `mouseenter` 가 `acIndex` 를 그 항목으로 맞추고 강조를 다시 적용 | 마우스 강조(`:hover`)와 키보드 강조(`.selected`)가 다른 항목을 가리키면 `Enter` 가 어느 쪽을 고르는지 알 수 없다 |
| 도우미 셋 | `acItems()` · `applySelection()` · `moveSelection(delta)` — `commitMention` 근처 | 계획서 §2 그대로. `moveSelection` 은 `(acIndex + delta + n) % n` 으로 감긴다. `scrollIntoView?.()` 는 옵셔널 호출이다 — **jsdom 에는 `scrollIntoView` 가 없다** |

### B.2 키의 뜻 — 열린 상태에서만, IME 가드가 먼저

```js
// onComposerKeyDown 의 557행 `if (e.key !== 'Enter' || e.shiftKey) return` 보다 앞에
const box = $('autocomplete')
if (!box.hidden && ['ArrowDown', 'ArrowUp', 'Escape', 'Tab'].includes(e.key)) {
  if (e.isComposing || e.keyCode === 229) return   // [HARD] preventDefault 보다 앞
  e.preventDefault()
  if (e.key === 'Escape') { hideAutocomplete(); return }
  if (e.key === 'Tab') { /* Shift 여부와 무관 — 선택된 항목 확정, 없으면 닫기 */ return }
  moveSelection(e.key === 'ArrowDown' ? 1 : -1)
  return
}
```

| 결정 | 값 | 근거 |
|------|-----|------|
| 닫힌 상태 | 분기 전체가 `!box.hidden` 안에 있어 아무것도 하지 않는다 | REQ-006. 닫혀 있으면 557행이 그대로 `return` 한다 |
| `Enter` | 566~572행에서 `box.querySelector('.ac-item:not(.disabled)')` 대신 `acItems()[acIndex] ?? acItems()[0]` | 「첫 항목」→「선택된 항목」. 없으면 기존처럼 `hideAutocomplete()` |
| `Tab` (Shift 여부 무관) | `Enter` 와 같은 확정 경로. `Shift+Tab` 도 확정이다 — `Shift` 는 `Enter` 에서만 줄바꿈의 뜻이 있고 `Tab` 에서는 «역방향 포커스 이동»인데, 드롭다운이 열린 동안 포커스 이동은 어느 방향이든 가로챈다. **선택 가능한 항목이 없으면 드롭다운을 닫는다** | 계획서는 `acItems()[acIndex]?.click()` 만 적었다 — 항목이 없을 때 `preventDefault` 만 하고 아무것도 안 하면 `Tab` 이 «삼켜진» 채 드롭다운이 남는다. `Enter` 의 기존 처리(570행)와 같은 모양으로 닫는다. **계획서 밖에서 이 SPEC 이 정한 것 1** |
| 열린 상태의 방향키, 선택 가능한 항목 0 | `moveSelection` 이 `n === 0` 에서 조기 반환. `preventDefault` 는 이미 불렸다 | disabled 행만 있는 드롭다운에서 방향키가 커서를 옮기지 않는다. 드물고(멘션 불가 이름만 접두사 일치) 해롭지 않아 그대로 둔다. **계획서 밖에서 확인한 가장자리 1** |
| `Escape` | `hideAutocomplete()` 만. 입력값·커서 불변 | REQ-005 |

### B.3 마크업 — 배지가 앞, 텍스트가 뒤

```js
const badge = document.createElement('span')
badge.className = `ac-kind ${kind.toLowerCase()}`
badge.textContent = kind
item.appendChild(badge)
item.appendChild(document.createTextNode(` ${bot.bot_name}`))
```

| 결정 | 값 | 근거 |
|------|-----|------|
| 순서 | 배지 → `" 이름"` 텍스트 노드 | `textContent` 가 `TO pm` 그대로 → AC-WEBCHAT-010 의 `startsWith('TO')` 유지 |
| 속성 | 컨테이너 `role=listbox`(렌더 때마다 붙여도 무해), 항목 `role=option`·`data-kind`·`aria-selected` | REQ-002. `aria-selected` 는 `applySelection()` 이 매번 갱신 |
| 봇 이름 | 텍스트 노드 | REQ-WEBCHAT-004 (innerHTML 금지) |

### B.4 CSS — 토큰만, 기존 규칙 위에 덧붙임

계획서 §4 의 블록 그대로(`spec.md` REQ-008 표). `.ac-item` 의 기존 선언(padding·radius·cursor·font-size)은 남기고 `display:flex; align-items:center; gap` 을 **더한다**. 새 규칙은 `.ac-item.disabled:hover`(356행) 바로 아래, `/* SPEC-WEBACNAV-001 */` 주석으로 시작해 **`/* /SPEC-WEBACNAV-001 */` 주석으로 끝나는** 블록에 둔다 — AC-008 (4) 의 `sed` 범위가 이 두 주석을 앵커로 블록을 잘라 내므로, 닫는 주석이 없으면 범위가 파일 끝까지 늘어나 검사가 다른 SPEC 의 규칙까지 재게 된다.

## §C 마일스톤 (TDD — 실패하는 테스트가 먼저)

`quality.yaml` 이 `development_mode: tdd` 이므로 M1 이 RED 다. M1 의 실패 출력을 그대로 `progress.md` §E.2 에 남긴다(`manager-develop-prompt-template.md` E8).

### M1 — 새 `it` 블록 전부를 먼저 쓴다 (RED) · 우선순위 High

1. `server/test/web-chat.test.ts` 파일 끝(현재 717행 뒤)에 `describe('SPEC-WEBACNAV-001 keyboard navigation and TO/CC badges', …)` 를 더한다. `acceptance.md` 의 코드를 그대로 쓴다.
2. 헬퍼 `pressKey(key, init)` 하나를 `pressEnter`(123행) 아래에 더한다 — keydown 을 만들어 보내고 **이벤트 객체를 돌려준다**(`defaultPrevented` 관측용).
3. `cd server && npx vitest run test/web-chat.test.ts` 를 돌려 새 `it` 블록 전부(`grep -c "^it('" acceptance.md` 로 센 수 — 지금 8개, AC-002 가 `it` 둘을 가진다)가 **실패**하고 기존 테스트가 **전부 통과**함을 확인한다. 실패 출력을 캡처한다.

완료 기준: 새 `it` 전부 실패(수는 `grep -c "^it('" acceptance.md` 로 센다 — 지금 8개; 수용 기준 8개와 같은 수이지만 다른 셈이다: AC-002 는 `it` 둘, AC-008 은 파일 전체 실행 + bash 검사라 `it` 이 없다), 기존 전부 통과, RED 출력 파일 존재.

### M2 — 렌더에 선택 상태와 배지 (`onComposerInput`) · 우선순위 High

1. 자동완성 절 머리(499행 아래)에 `let acIndex = 0`.
2. `onComposerInput` 시작에서 `acIndex = 0`; `box.setAttribute('role', 'listbox')`.
3. 529~535행 루프를 §B.3 모양으로: 배지 `span` + 텍스트 노드, `role=option`, `data-kind`, `click`(그대로) + `mouseenter`.
4. `box.hidden = false` 앞에 `applySelection()`.
5. `hideAutocomplete`(429행)에 `acIndex = 0`.

완료 기준: AC-001 초록.

### M3 — 선택 도우미 셋 · 우선순위 High

`commitMention` 근처에 `acItems()` · `applySelection()` · `moveSelection(delta)` (§B.1). `applySelection` 은 `selected` 클래스와 `aria-selected` 를 함께 토글한다.

완료 기준: AC-007(mouseenter) 초록. (M2 의 `applySelection()` 호출이 여기서 정의된다 — M2·M3 는 한 커밋에 묶어도 된다.)

### M4 — keydown 분기와 `Enter` 변경 · 우선순위 High

1. `onComposerKeyDown` 557행 앞에 §B.2 블록.
2. 568행 `const first = box.querySelector(...)` → `const pick = acItems()[acIndex] ?? acItems()[0]`; `pick ? pick.click() : hideAutocomplete()`.
3. IME 가드 564행은 **그 자리 그대로**. 새 분기의 가드도 `preventDefault` 앞.

완료 기준: AC-002 · 003 · 004 · 005 · 006 초록.

### M5 — CSS 와 전체 검증 · 우선순위 Medium

1. `web/style.css` 356행 아래에 `/* SPEC-WEBACNAV-001 */` 로 시작해 `/* /SPEC-WEBACNAV-001 */` 로 끝나는 블록(§B.4). 닫는 주석을 빠뜨리지 않는다.
2. `cd server && npx vitest run test/web-chat.test.ts` → 전부 초록, 종료 코드 0.
3. `npm test -w server` → pretest 타입 검사 포함 통과.
4. AC-008 의 색 리터럴 검사(블록이 비어 있지 않음 → 16진수 0건).
5. 브라우저 실확인(수동, 판정 기준은 아님): 서버를 띄우고 방에서 `@` → ↓↑ 로 강조 이동, `Enter` 로 `@CC(이름) ` 삽입, TO 배지 채움·CC 배지 테두리.

완료 기준: AC-008 초록. 세 파일 밖의 변경 0(`git status --short` 로 확인).

## §D 검증 명령

```bash
cd server && npx vitest run test/web-chat.test.ts     # 새 it 전부(지금 8개) + AC-WEBCHAT-009~012 + D-6 전부 초록
npm test -w server                                    # pretest 타입 검사 포함
git status --short                                    # web/app.js · web/style.css · server/test/web-chat.test.ts 셋뿐
```

색 리터럴 검사(AC-008)는 `acceptance.md` 에 명령 그대로 있다.

## §E 손대지 않는 것

- `server/src/mention.ts` 와 삽입 문법 `@TO(이름) ` / `@CC(이름) ` — `commitMention` 을 고치지 않는다.
- 멘션 불가 이름의 `.ac-item.disabled` 행(519~528행)과 그 CSS(351~356행).
- `web/rich.js` 의 목록들, `web/index.html`, `web/design-tokens.css`.
- 기존 테스트의 단언. AC-WEBCHAT-009~012·D-6 는 한 글자도 바꾸지 않고 통과해야 한다.
- 작성기 이벤트 배선(346~348행) — 새 리스너를 걸지 않는다.

## §F 알려진 위험

| 위험 | 어떻게 드러나나 | 대응 |
|------|----------------|------|
| jsdom 에 `scrollIntoView` 가 없다 | `moveSelection` 에서 `TypeError` | 옵셔널 호출 `?.()` (§B.1). AC-003 이 이 경로를 지난다 |
| `mouseenter` 가 jsdom 에서 버블하지 않는다 | 위임 방식이면 테스트가 못 잡는다 | 항목마다 직접 `addEventListener('mouseenter', …)`. AC-007 은 항목에 직접 `dispatchEvent` 한다 |
| 새 분기가 557행 **뒤**에 들어가면 | 방향키가 557행에서 걸러져 아무 일도 안 한다 | AC-002·003 이 즉시 붉어진다 |
| IME 가드를 `preventDefault` 뒤에 두면 | 한글 조합이 깨지지만 테스트는 통과할 수 있다 | AC-005 후반이 `isComposing: true` 의 ↓ 에서 `defaultPrevented === false` 를 본다 |
| «전부 막기» 구현(드롭다운 상태와 무관하게 키를 삼킴) | 커서 이동이 죽는다 | AC-005 전반(닫힌 상태 통과)과 AC-004 후반(Esc 뒤 `Enter` 전송)이 배제한다 |

## §G 상호 참조

- `spec.md` §4 (REQ-WEBACNAV-001~008), §5 범위 밖, §7 AC 매트릭스
- `acceptance.md` — AC-WEBACNAV-001~008 의 Given-When-Then 과 테스트 코드
- `.moai/plans/floating-stargazing-hamming.md` — 승인된 원 계획
- `.moai/specs/SPEC-WEBCHAT-001/plan.md` §B·§C — 삽입 계약과 jsdom 골격의 결정 근거
