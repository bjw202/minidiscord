---
id: SPEC-WEBACNAV-001
title: "@ 멘션 헬퍼 — 키보드 이동(↑/↓/Enter/Esc/Tab)과 TO/CC 배지"
version: "0.2.0"
status: in-progress
created: 2026-09-08
updated: 2026-09-08
author: manager-spec
priority: P2
phase: "v2.1.0 target"
module: "web/"
lifecycle: spec-anchored
tags: "web-ui, mention-autocomplete, keyboard-navigation, a11y, vanilla-js, jsdom"
tier: S
depends_on: [SPEC-WEBCHAT-001, SPEC-MENTION-001]
related_specs: [SPEC-WEBRICH-001]
---

# SPEC-WEBACNAV-001 — @ 멘션 헬퍼의 키보드 이동과 TO/CC 배지

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-09-08 | 최초 작성. 승인된 구현 계획 `.moai/plans/floating-stargazing-hamming.md` 를 GEARS 요구사항 8개와 수용 기준 8개로 옮겼다(Tier S 상한 8/8). 계획서가 적은 행 번호는 전부 현재 코드와 대조해 확인했다 — `web/app.js` 494~574행(자동완성 절), 429~431행(`hideAutocomplete`), 346~348행(이벤트 배선), `web/style.css` 324~356행, `web/index.html` 57행. 계획서가 따로 적지 않은 것 하나를 못 박았다: 선택 가능한 후보가 하나도 없는 채로 드롭다운이 열려 있을 때의 `Tab` 은 기존 `Enter` 와 같이 드롭다운을 닫는다(REQ-WEBACNAV-004). 수용 기준은 오케스트레이터가 열거한 관측 열 가지를 여덟으로 묶었다 — 배지 마크업과 초기 선택(AC-001), 닫힌 상태 통과와 IME 조합 중 통과(AC-005), `Tab` 확정은 AC-002 안에. | manager-spec |
| 0.2.0 | 2026-09-08 | **plan 단계 감사 교정 라운드.** 근거: `.moai/reports/webacnav/plan-audit.md` (plan-auditor, CONDITIONAL PASS 0.91, 통과선 0.75). MUST-FIX 둘 — **D1** `plan.md`·`acceptance.md` 다섯 자리의 «새 8개 실패»는 수용 기준 수를 `it` 수로 잘못 옮긴 것이었다(감사 시점 `it` 은 7개 — AC-008 은 파일 전체 실행 + bash 검사라 `it` 이 없다). 다섯 자리를 «`it` 블록 전부, `grep -c "^it('" acceptance.md` 로 센 수»로 고쳤다. O-3 가 `it` 하나를 더해 지금 그 수는 8이며, 수용 기준 8개와 같은 수이지만 다른 셈임을 자리마다 적었다. **D2** `plan.md` 두 자리에 CSS 블록의 닫는 주석 `/* /SPEC-WEBACNAV-001 */` 지시를 더해 AC-008 (4) 의 `sed` 범위가 닫히게 했다. 관찰 셋 — **O-1** `style.css` 색 규약 주석의 행 번호를 371~373 에서 실제 373~375 로 고쳤다(승인 계획서의 371 이 틀린 것이었고 `plan.md` §A 의 «어긋난 자리 없음» 문장도 그에 맞게 고쳤다). **O-2** `Tab` 은 `Shift` 여부와 무관하게 가로챈다(`Shift+Tab` 도 확정)고 REQ-004 와 `plan.md` §B.2 에 명시했다. **O-3** 선택 가능한 항목이 없을 때의 `Tab`(닫기만)에 관측이 없던 것을 AC-002 에 둘째 `it` 으로 접어 넣었다(봇 `['코드 리뷰어']` 만 있을 때 `@코` → disabled 행 하나, `Tab` → 숨김·값 불변·POST 0). 요구사항 8개·수용 기준 8개 불변. | manager-spec |

---

## 1. 배경과 목적

입력창(`#msg-input`)에서 `@` 를 치면 뜨는 자동완성 팝업(`#autocomplete`)은 지금 **마우스로만** 쓸 수 있다. `Enter` 는 항상 **첫 번째** 후보를 고르고(`web/app.js` 568행 `box.querySelector('.ac-item:not(.disabled)')`), 방향키는 아무 일도 하지 않으며, `Escape` 도 아무 일도 하지 않는다. 각 후보는 `TO pm` / `CC pm` 처럼 글자만으로 구분돼(532행의 `item.textContent` 가 `"TO pm"` 꼴 문자열 하나를 넣는다), 어느 쪽이 «직접 요청»(TO)이고 어느 쪽이 «참고»(CC)인지 한눈에 들어오지 않는다.

이 SPEC 이 끝나면 이렇게 된다.

```
사용자가 '@p' 입력
   → 후보 [TO] pm  ← 첫 항목이 강조돼 있다
          [CC] pm
   ↓ 키           → 강조가 [CC] pm 으로 내려간다 (끝에서 처음으로 감김)
   Enter 또는 Tab → 강조된 항목이 '@CC(pm) ' 으로 삽입된다
   Esc            → 팝업이 닫히고 입력값 '@p' 는 그대로다
   팝업이 닫힌 상태의 ↑↓/Tab/Esc → 브라우저 기본 동작 그대로 (커서 이동, 포커스 이동)
```

TO 와 CC 는 색이 다른 작은 배지가 된다 — TO 는 브랜드 강조색(블러플)으로 채우고, CC 는 흐린 글자에 테두리만. 색은 `web/design-tokens.css` 의 `--md-*` 변수만 쓴다.

### 이 SPEC 이 지키는 가장 중요한 성질 둘

1. **삽입 계약은 그대로다.** 키보드로 고르든 마우스로 고르든, 입력창에 들어가는 문자열은 `SPEC-WEBCHAT-001` 이 세운 `@TO(이름) ` / `@CC(이름) ` 그대로이며, `server/src/mention.ts` 의 `parseMentions()` 가 그 봇·그 전달 종류로 해석해야 한다. 수용 기준은 문자열 비교가 아니라 **실제 파서를 import 해서** 왕복 대조한다(AC-WEBCHAT-010 과 같은 방식).
2. **한글 입력을 깨지 않는다.** `web/app.js` 562~564행의 `[HARD]` 주석 — IME 조합 중(`isComposing` 또는 `keyCode === 229`) 의 `return` 은 `preventDefault` 보다 앞이어야 한다 — 을 새 방향키 분기에도 그대로 적용한다. 조합 중의 방향키를 가로채면 조합이 깨진다.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 드롭다운 | `#autocomplete`. `hidden` 속성이 없을 때 «열려 있다», 있을 때 «닫혀 있다» |
| 후보 항목 | 드롭다운 안의 `.ac-item` 하나 |
| 선택 가능한 항목 | `.ac-item` 가운데 `disabled` 클래스가 없는 것. 멘션 불가 이름의 행(`REQ-WEBCHAT-011`)은 선택 가능하지 않다 |
| 선택 상태 | 선택 가능한 항목 가운데 지금 강조된 하나. 클래스 `selected` 와 `aria-selected="true"` 로 드러난다 |
| 배지 | 후보 항목 맨 앞의 `<span class="ac-kind to|cc">TO|CC</span>` |
| 확정 | 선택 상태의 항목으로 `commitMention(kind, name)` 이 불려 입력창에 멘션 문자열이 삽입되고 드롭다운이 닫히는 것 |
| 감김 | 마지막 항목에서 ↓ 를 누르면 첫 항목으로, 첫 항목에서 ↑ 를 누르면 마지막 항목으로 가는 것 |
| 조합 중 | `KeyboardEvent.isComposing === true` 이거나 `keyCode === 229` 인 keydown |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 은 **서버 코드를 한 줄도 고치지 않는다.** 아래를 그대로 소비한다.

| 출처 | 받아 쓰는 것 | 실제 코드에서 확인한 자리 |
|------|-------------|--------------------------|
| `SPEC-WEBCHAT-001` | `onComposerInput`(렌더), `commitMention`(확정), `onComposerKeyDown`(키 처리), `hideAutocomplete`, 멘션 불가 행의 `disabled` 처리, `Enter` 미전송 규칙(REQ-WEBCHAT-012), IME 가드(D-6) | `web/app.js` 510~538 · 542~552 · 556~574 · 429~431 · 519~528 행 |
| `SPEC-WEBCHAT-001` | 작성기 이벤트 배선 — `input` 과 `keydown` 을 `initChat()` 에서 한 번만 건다 | `web/app.js` 346~348행. 새 리스너를 더하지 않고 기존 두 핸들러 안에서 처리한다 |
| `SPEC-WEBCHAT-001` | `#autocomplete` 컨테이너(초기 `hidden`) | `web/index.html` 57행. 이 파일은 고치지 않는다 — `role="listbox"` 는 JS 가 붙인다 |
| `SPEC-WEBCHAT-001` | jsdom 테스트 골격 — `loadApp`, `$$`/`el`/`input`/`type`/`pressEnter`, 가짜 `fetch` 호출 기록 `calls` | `server/test/web-chat.test.ts` 86~125행. 봇 목록 응답 키는 `/api/rooms/1/bots` (v2) |
| `SPEC-MENTION-001` | `parseMentions()` 와 정규식 `@(TO|CC)\(([^()\s]+)\)` | `server/src/mention.ts` 4행 |
| `web/design-tokens.css` | `--md-accent` · `--md-text-primary` · `--md-text-muted` · `--md-divider` · `--md-bg-hover` · `--md-font-size-label` · `--md-font-weight-name` · `--md-space-1` · `--md-space-2` · `--md-radius-badge` · `--md-border-width` | 전부 `:root` 에 있음을 읽어 확인했다. 새 토큰은 만들지 않는다 |

---

## 4. 요구사항 (GEARS)

### 4.1 선택 상태와 마크업

**REQ-WEBACNAV-001** (Ubiquitous — 선택 상태)
드롭다운이 열려 있는 동안 선택 가능한 항목 가운데 **정확히 하나**가 선택 상태여야 한다. 후보 목록을 다시 그릴 때마다(`onComposerInput` 이 돌 때마다) 그리고 드롭다운을 숨길 때마다(`hideAutocomplete`) 선택 상태는 **첫 번째 선택 가능한 항목**으로 되돌아간다. 선택 가능한 항목 위로 마우스가 들어오면(`mouseenter`) 그 항목이 선택 상태가 된다 — 마우스 강조와 키보드 강조가 서로 다른 항목을 가리키는 순간이 없어야 한다.

선택 상태는 모듈 수준 정수 하나(선택 가능한 항목들 사이의 인덱스)로 들고, 렌더 끝과 숨김에서 `0` 으로 되돌린다. 이름은 `plan.md` §B 가 정한다.

**REQ-WEBACNAV-002** (Ubiquitous — 마크업과 접근성)
`onComposerInput` 이 그리는 후보 목록은 아래 구조여야 한다.

```
div#autocomplete[role=listbox]
  ├ div.ac-item.selected[role=option][data-kind=TO][aria-selected=true]
  │     ├ span.ac-kind.to  ── "TO"
  │     └ 텍스트 노드       ── " pm"
  ├ div.ac-item[role=option][data-kind=CC][aria-selected=false]
  │     ├ span.ac-kind.cc  ── "CC"
  │     └ 텍스트 노드       ── " pm"
  └ div.ac-item.disabled[aria-disabled=true]   ── 멘션 불가 이름 행, 바뀌지 않음
```

- 배지 `span` 이 **맨 앞**이고 그 뒤에 `" <봇 이름>"` 텍스트 노드가 온다. 그래서 항목의 `textContent` 는 지금과 똑같이 `TO pm` / `CC pm` 이며, 기존 AC-WEBCHAT-010 의 `textContent.startsWith('TO')` 탐색이 그대로 맞는다.
- `role="listbox"` 는 컨테이너에, `role="option"` · `data-kind` · `aria-selected` 는 선택 가능한 항목에만 붙는다.
- 멘션 불가 이름 행(`REQ-WEBCHAT-011`, `web/app.js` 519~528행)은 **한 글자도 바꾸지 않으며** 결코 선택 상태가 되지 않는다.
- 봇 이름은 지금처럼 텍스트 노드로만 넣는다(`REQ-WEBCHAT-004` — `innerHTML` 금지는 이 SPEC 에도 그대로다).

### 4.2 키보드 — 드롭다운이 열려 있는 동안

**REQ-WEBACNAV-003** (While 드롭다운이 열려 있음 · When `ArrowDown` 또는 `ArrowUp` keydown)
구현은 keydown 의 기본 동작을 막고(`preventDefault`) 선택 상태를 한 칸 옮겨야 한다 — `ArrowDown` 은 다음 선택 가능한 항목으로, `ArrowUp` 은 이전 항목으로. **끝에서는 감긴다**: 마지막에서 ↓ 는 첫 항목으로, 첫 항목에서 ↑ 는 마지막으로. 멘션 불가 행은 건너뛴다(선택 가능한 항목만 센다).

**REQ-WEBACNAV-004** (While 드롭다운이 열려 있음 · When `Shift` 없는 `Enter`, 또는 `Shift` 여부와 무관한 `Tab` keydown)
구현은 keydown 의 기본 동작을 막고 **선택 상태의 항목**을 확정해야 한다. 선택 상태가 유효하지 않으면 첫 번째 선택 가능한 항목으로 대신하고, 선택 가능한 항목이 하나도 없으면 드롭다운만 닫는다(`Enter` 의 기존 동작, 570행). 메시지는 전송되지 않는다(REQ-WEBCHAT-012 유지).

- 확정으로 삽입되는 문자열은 `@TO(이름) ` / `@CC(이름) ` 그대로다(`commitMention`, 547행). **이 SPEC 은 `commitMention` 을 고치지 않는다.**
- `Shift+Enter` 의 동작(줄바꿈, 557행 조기 `return`)은 바뀌지 않는다. `Tab` 은 `Shift` 여부를 보지 않는다 — `Shift+Tab` 도 확정이다(드롭다운이 열린 동안 포커스 이동은 어느 방향이든 가로챈다).

**REQ-WEBACNAV-005** (While 드롭다운이 열려 있음 · When `Escape` keydown)
구현은 keydown 의 기본 동작을 막고 드롭다운을 숨겨야 한다. **입력창의 값과 커서 위치는 바뀌지 않는다.** 그 뒤 드롭다운이 닫힌 상태에서 오는 `Enter` 는 평소대로 전송이다.

### 4.3 가로채지 않는 두 경우

**REQ-WEBACNAV-006** (While 드롭다운이 닫혀 있음 — shall not)
구현은 `ArrowDown` · `ArrowUp` · `Escape` · `Tab` keydown 을 **가로채서는 안 된다** — `preventDefault` 를 부르지 않고, 선택 상태도 건드리지 않는다. 방향키는 커서를 옮기고 `Tab` 은 포커스를 옮기는 브라우저 기본 동작 그대로여야 한다.

지금의 `onComposerKeyDown` 은 첫 줄(557행)에서 `Enter` 가 아니면 곧바로 돌아간다. 새 분기는 그 앞에 들어가되 **드롭다운이 열려 있을 때만** 살아야 하며, 닫혀 있으면 기존 첫 줄로 흘러가 아무것도 하지 않는다.

**REQ-WEBACNAV-007** (While IME 조합 중 — shall not)
`isComposing === true` 이거나 `keyCode === 229` 인 keydown 에 대해 구현은 새 방향키·`Escape`·`Tab` 분기에서도 `preventDefault` 를 부르거나 선택 상태를 옮겨서는 **안 된다** — 브라우저에 맡기고 돌아간다. 기존 `Enter` 경로의 IME 가드(564행)는 **그 자리 그대로**(`preventDefault` 보다 앞) 남는다. `[HARD]` 주석(562~563행)이 말하는 순서를 새 분기가 같은 모양으로 지킨다.

### 4.4 시각

**REQ-WEBACNAV-008** (Ubiquitous — 배지와 선택 강조, 토큰만 사용)
`web/style.css` 는 아래 규칙을 가져야 하며, 색은 **전부 `web/design-tokens.css` 의 `var(--md-*)`** 로만 적는다(16진수 색 리터럴 금지 — 373~375행의 기존 규약).

| 선택자 | 무엇을 |
|--------|--------|
| `.ac-item` | `display: flex; align-items: center; gap: var(--md-space-2)` — 배지와 이름이 한 줄에 나란히 |
| `.ac-item.selected` | `background: var(--md-bg-hover); outline: 1px solid var(--md-accent)` — 키보드 강조 |
| `.ac-kind` | 작은 배지: `font-size: var(--md-font-size-label)`, `font-weight: var(--md-font-weight-name)`, `border-radius: var(--md-radius-badge)`, 가로 여백 `var(--md-space-1)`, 고정 `min-width` 로 이름이 세로로 정렬되게 |
| `.ac-kind.to` | `background: var(--md-accent); color: var(--md-text-primary)` — 채운 블러플 |
| `.ac-kind.cc` | `color: var(--md-text-muted); border: var(--md-border-width) solid var(--md-divider)` — 흐린 테두리 |

기존 `.ac-item:hover` · `.ac-item.disabled` 규칙(348~356행)은 그대로 둔다. `web/design-tokens.css` 는 고치지 않는다.

---

## 5. 범위 밖 (Exclusions)

이 SPEC 이 **하지 않는 것**이다. 아래 항목이 구현에 섞여 들면 범위 위반이다.

### Out of Scope — 서버 파서와 삽입 문법 (`SPEC-MENTION-001` · `SPEC-WEBCHAT-001`)

- `server/src/mention.ts` 는 한 글자도 고치지 않는다. 정규식 `@(TO|CC)\(([^()\s]+)\)` 이 계약이며 UI 가 맞춘다.
- `commitMention` 이 만드는 `@TO(이름) ` / `@CC(이름) ` 형식은 바꾸지 않는다.
- 멘션 불가 이름 행의 `.ac-item.disabled` 처리(REQ-WEBCHAT-011)는 바꾸지 않는다.

### Out of Scope — 다른 목록과 다른 파일

- `web/rich.js` 의 클릭 전용 목록(참여 모달 등)에는 키보드 이동을 넣지 않는다. 이 SPEC 은 `#autocomplete` 하나만 다룬다.
- `web/index.html` 은 고치지 않는다. `role="listbox"` 는 JS 가 렌더 때 붙인다.
- `server/` · `channel/` 아래 소스 파일은 고치지 않는다. 손대는 파일은 `web/app.js` · `web/style.css` · `server/test/web-chat.test.ts` 셋뿐이다.

### Out of Scope — 상호작용 심화

- 타이핑으로 후보를 좁힐 때 이전 선택 위치를 기억하는 것(렌더마다 첫 항목으로 돌아간다).
- `Home`/`End`/`PageUp`/`PageDown` 키, 첫 글자 점프, 마우스 휠 스크롤 동기화.
- 스크린리더용 실시간 안내(`aria-live`)와 `aria-activedescendant` — `role`/`aria-selected` 까지만 붙인다.
- 배지의 애니메이션·툴팁. 색·크기·간격은 위 표가 전부다.

## 6. 제약

| 제약 | 내용 |
|------|------|
| 개발 방식 | TDD (`quality.yaml` `development_mode: tdd`). `server/test/web-chat.test.ts` 에 실패하는 테스트를 먼저 쓰고(RED 출력을 `progress.md` 에 남긴다) 구현한다 |
| 테스트 환경 | 기존 jsdom 골격을 그대로 쓴다. 새 리스너를 걸지 않고 기존 `input`/`keydown` 핸들러 안에서 처리하므로 골격의 `loadApp` 이 그대로 통한다 |
| 파일 경계 | `web/app.js` 자동완성 절(494~574행)과 `hideAutocomplete`(429~431행), `web/style.css` 의 자동완성 블록, 테스트 파일 — 셋뿐 |
| 색 | `var(--md-*)` 만. 16진수 리터럴 0건 |
| IME | 조합 중 keydown 은 새 분기·기존 분기 모두 `preventDefault` 앞에서 돌아간다 |
| 회귀 | AC-WEBCHAT-009~012 와 D-6 테스트가 수정 없이 그대로 통과해야 한다. 그 테스트의 단언을 바꿔 맞추는 것은 금지다 |

## 7. 수용 기준

전문은 `acceptance.md` 에 있다(Given-When-Then 과 테스트 코드). 전부 `cd server && npx vitest run test/web-chat.test.ts` 한 명령으로 기계 판정한다.

| ID | 요구사항 | 관측할 결과 |
|----|----------|-------------|
| AC-WEBACNAV-001 | REQ-001, REQ-002 | `@p` 입력 후 `.ac-item .ac-kind.to` 1개·`.ac-kind.cc` 1개, 컨테이너 `role=listbox`, 항목 `role=option`+`data-kind`; 첫 항목만 `.selected`+`aria-selected="true"`, 둘째는 `"false"` |
| AC-WEBACNAV-002 | REQ-004 | ↓ 뒤 `Enter` → 입력값이 `@CC(pm) ` 로 끝나고 `parseMentions` 가 `[{bot:'pm', delivery:'cc'}]`, POST 0회; ↓ 뒤 `Tab` 도 같은 결과; 선택 가능한 항목이 없을 때(`['코드 리뷰어']` 만, `@코`) `Tab` → 숨김·값 불변·POST 0 |
| AC-WEBACNAV-003 | REQ-003 | 첫 항목에서 ↑ → 마지막 항목 선택; 마지막에서 ↓ → 첫 항목 선택 |
| AC-WEBACNAV-004 | REQ-005 | `Escape` → `#autocomplete` 가 `hidden`, 입력값 `@p` 그대로; 이어지는 `Enter` → POST 1회 |
| AC-WEBACNAV-005 | REQ-006, REQ-007 | 닫힌 상태의 ↓ keydown `defaultPrevented === false`; 열린 상태 `isComposing: true` 의 ↓ 는 `defaultPrevented === false` 이고 선택이 옮겨지지 않음 |
| AC-WEBACNAV-006 | REQ-002, REQ-003 | 봇 `['코드 리뷰어','pm']` 에서 ↓/↑ 를 여러 번 눌러도 `.selected` 는 항상 정확히 1개이며 결코 `disabled` 가 아님 |
| AC-WEBACNAV-007 | REQ-001 | 둘째 선택 가능 항목에 `mouseenter` → 그 항목이 `.selected`, 첫 항목은 아님; 이어지는 `Enter` 가 그 항목을 확정 |
| AC-WEBACNAV-008 | §6 회귀 · REQ-008 | 기존 AC-WEBCHAT-009~012·D-6 포함 파일 전체 통과(종료 코드 0, `failed` 0건); `style.css` 의 새 블록에 16진수 색 리터럴 0건(블록이 비어 있지 않음을 먼저 확인) |

## 8. 참조

- 승인된 구현 계획: `.moai/plans/floating-stargazing-hamming.md`
- 자동완성의 원 계약: `.moai/specs/SPEC-WEBCHAT-001/spec.md` §4.3 (REQ-WEBCHAT-009~012), `acceptance.md` AC-WEBCHAT-010~012
- 서버 파서: `server/src/mention.ts`, `.moai/specs/SPEC-MENTION-001/spec.md`
- 디자인 토큰: `web/design-tokens.css`, `.moai/project/design-dna-discord.md`
- IME 결함 기록(D-6): `server/test/web-chat.test.ts` 537~584행 주석
