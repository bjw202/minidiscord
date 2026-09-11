---
id: SPEC-WEBUI-001
title: "웹 UI 개선 — 방 목록·메시지·입력창·로그아웃"
version: "0.4.2"
status: completed
created: 2026-09-11
updated: 2026-09-11
author: manager-spec
priority: P2
phase: "v2.2.0 target"
module: "web/, server/src/auth.ts"
lifecycle: spec-anchored
tags: "web-ui, visual-design, a11y, room-list, message-grouping, composer, auth-route, vanilla-js, jsdom"
tier: M
depends_on: [SPEC-WEBSHELL-001, SPEC-WEBCHAT-001, SPEC-AUTH-001]
related_specs: [SPEC-WEBRICH-001, SPEC-WEBACNAV-001, SPEC-WEBMD-001]
---

# SPEC-WEBUI-001 — 웹 UI 개선 (방 목록·메시지·입력창·로그아웃)

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-09-11 | 최초 작성. 운영자가 검토·승인한 4-아트보드 디자인 캔버스(§1.1)를 GEARS 요구사항 16개와 수용 기준 16개로 옮겼다(Tier M 상한 16/16). 아트보드가 정한 값은 전부 `web/design-tokens.css` 의 기존 토큰과 대조해 확인했고, 토큰에 없는 값(행 높이 26px·아바타 40px/28px)만 리터럴 길이로 남겼다 — 색은 한 건도 새로 만들지 않았다. 형제 SPEC 둘의 DOM 계약 두 건(`SPEC-WEBSHELL-001` §4.8 계약 4 의 `.room-item`/`.archive-btn` 행, `SPEC-WEBCHAT-001` REQ-WEBCHAT-003 의 메시지 구조)을 이 SPEC 이 **개정하고 인수한다**(§5). 개정은 형제 문서를 고치는 대신 이 문서가 새 계약을 보유하고, run 단계가 그 문장을 `web/app.js` 주석에 되쓰는 방식이다. | manager-spec |
| 0.2.0 | 2026-09-11 | **미결 해소 — 운영자가 «서버 라우트 추가» 를 골랐다.** 계정 바의 «현재 사용자 이름» 출처가 없다는 미결(구 `plan.md` §B.1)을 운영자가 선택지 셋 가운데 하나로 결정했다: 읽기 전용 라우트 `GET /api/auth/me` 를 더한다. 기각된 둘은 `localStorage`(쿠키가 죽은 뒤 **틀린 이름**을 띄운다)와 이름 없는 계정 바(목적 절반을 버린다)다. 새 §4.5 가 그 라우트(REQ-WEBUI-013)와 클라이언트 배선(REQ-WEBUI-014)을 담는다. **Tier M 상한 16/16 을 지키려고 둘을 합쳤다** — 구 REQ-002(행 한 줄 고정)를 REQ-001 안으로, 구 REQ-013(첨부 칩·자동완성 자리)을 작성기 컨테이너 요구사항 안으로 접었다. 수용 기준도 같은 이유로 둘을 합치고(사이드바 나머지, 작성기 컨테이너+첨부 label) 둘을 새로 넣었다(라우트 계약, 새로고침 생존). Tier 는 M 을 유지한다 — 근거는 `plan.md` §A. | manager-spec |
| 0.3.0 | 2026-09-11 | **plan 단계 감사 교정 라운드 (감사 판정 FAIL — Testability 0.25, 조화평균 0.52, 통과선 0.80).** 근거: `plan-audit.md`(plan-auditor 독립·적대적, HEAD `c1ea5fd`). blocking 열둘(F1~F12) 전부와 optional 셋(F13·F14·F17)을 고쳤다. ① **F1·F2** — 기준 셋이 지정된 파일에 **없는 헬퍼**(`loadDom`·`flush`)를 불러 `TS2304` 로 죽었다. 파일별 헬퍼 실측 표를 넣고 각 기준을 그 파일의 골격으로 다시 썼다. ② **F3** — 공통 `rule()` 이 이미 이스케이프된 인자를 다시 이스케이프해 **CSS 정적 관측 열둘 전부**가 올바른 구현에서 실패했다. 기존 `cssRuleBlock`(주석 제거 + 중괄호 깊이)을 공유 모듈로 옮겨 쓰고 호출부 이스케이프를 걷어냈다. ③ **F4** — AC-003 이 저장소에 없는 `window.__app` 을 「기존 파일이 쓰는 경로」라고 적었다. CSS 정적 앞 겹 + 실 API 로 방을 만드는 실브라우저 뒤 겹으로 다시 썼다. ④ **F5 (가장 위험)** — `web/rich.js` 의 `el.appendChild(...)` 두 자리가 장식 노드를 `.message` **직계 자식**으로 붙이므로 새 그리드가 그것을 40px 아바타 칸으로 민다. 형제 시험은 개수만 세어 **전부 초록으로 남는다.** `.message > :not(.msg-avatar) { grid-column: 2 }` 를 REQ-005 에 넣고, §5.4 의 「닿지 않는다」를 사실대로 고치고, 렌더 폭 관측을 AC-006 에 붙였다. ⑤ **F6·F7** — 마감 관측 둘이 통과를 재지 못했다(vitest 이름 grep, 구현만으로 충족되는 클래스명 grep). 종료 코드와 주석 앵커 문장으로 바꿨다. ⑥ **F8·F9** — 대역 금지를 `hasRoute` 명령으로 바꾸고, 되쓰기 대상을 둘에서 **넷**으로 늘렸다(+`server/src/auth.ts` 의 `@MX:NOTE`, `server/test/auth-name.test.ts` 의 같은 문장). ⑦ **F10** — 「강조색은 하나만」이 같은 문서에서 네 번 반증됐다. **디자인이 아니라 산문이 틀렸으므로** 실제 위계표로 다시 썼고, `--md-role-color-4 == --md-accent` 는 **기존 동작**으로 §1.2 에 기록했다(팔레트 불변). ⑧ **F11·F12** — 관측 없던 하위 주장 둘에 선언과 초기 상태를 못 박고(`#composer-box { flex: 1 }`, `initChat()` 의 넷째 갱신 자리) 각각 관측을 붙였다. ⑨ **F13·F14** — 새 인라인 SVG 다섯의 색 리터럴과 `em`/`rem`/`%` 단위 `font-size` 가 금지를 통째로 빠져나갔다. 둘 다 REQ-016·AC-015 에 넣었다(실측 기준선: SVG 색 0, 토큰 아닌 font-size 11). 요구사항 16개·수용 기준 16개 **불변** — 이번 라운드는 기준을 늘리지 않고 **기존 기준을 실행 가능하게** 만들었다. F16(예산을 병합으로 맞춘 방식)은 `plan.md` §B.8 에 판단과 잔여 비용을 적어 두었다. | manager-spec |
| 0.4.0 | 2026-09-11 | **plan 단계 감사 2회차 교정 (판정 CONDITIONAL PASS, 조화평균 0.80 — 통과선 0.80 에 정확히 닿음).** 근거: `plan-audit-2.md`. 1회차 blocking 열둘은 **전부 닫힌 것으로 검증**됐고, 교정 그 자체가 만든 새 blocking 넷을 고쳤다. ① **N1** — AC-016 의 넷째 주석 앵커가 `^//` 였는데 대상 주석은 `it` 안이라 **선행 공백 넷**이다. 되쓰기를 정확히 수행한 구현이 붉어졌다. **네 앵커 전부** `^[[:space:]]*//` 로 통일했다(`\s` 는 POSIX ERE 가 아니다). ② **N2** — AC-010 이 한 `it` 안에서 `const box` 를 두 번 선언해 `TS2451` 이었고, `pretest` 때문에 **`npm test` 자체가 죽었다.** `boxRule` 로 개명. ③ **N3 (가장 중요)** — `cssRuleBlock` 은 **첫 매치**를 돌려주는데 §B.6 은 새 선언을 파일 **끝**으로 보냈다. `.room-item`·`.room-item.active`·`.archive-btn` 셋이 이미 style.css 에 있어 AC-003·004·005 가 **옛 블록을 읽고 올바른 구현에서 떨어질** 상태였다 — 1회차 F3 과 같은 형태(원인만 이스케이프에서 매치 순서로 이동). §B.6 을 「**기존 선택자는 제자리, 새 선택자만 끝 블록**」으로 다시 쓰고, AC-015 (4) 에 그 부류를 막는 기계적 가드를 넣었다. ④ **N4** — 새 실브라우저 겹 셋이 `strict: true` 에서 `tsc` 를 통과하지 못했다(TS7006 ×3 · TS18047 · TS2531). 콜백 매개변수에 타입을 붙이고 DOM 조회에 `!` 를 넣었으며, 그 이유를 `bootVisual()` 계약에 [HARD] 로 적었다. 함께 닫은 것: **M0 의 `import { expect } from 'vitest'` 누락**(빠뜨리면 M0 자체가 실패), **N5**(판별력 0 인 `#msg-input flex:1` 단언을 이 SPEC 이 실제로 더하는 `background: none`·`border: none` 관측으로 교체), **F15 잔여**(`#new-room-btn, #new-bot-btn` 공동 규칙 형태를 REQ-004 에 규범으로 못 박고 정규식을 `cssRuleBlock` 호출로 교체), **N6**(행 번호 인용을 전부 grep 앵커로 — `completed-spec-semantics.md` 의 line-anchor 금지 준수), **N7**(파일 수 8→9, 마일스톤 다섯→여섯), **N8**(기대값 0 인 `grep -c` 가 종료 코드 1 을 내는 문제를 `chk` 판정 함수로 제거), **N9**(`-t` 필터 대신 describe 실재 확인 + 파일 전체 종료 코드). 요구사항 16·수용 기준 16 **불변**. | manager-spec |
| 0.4.1 | 2026-09-11 | **3회차 감사 PASS(조화평균 1.00, 통과선 0.80; 0.52 → 0.80 → 1.00) 뒤의 문장·숫자 정리.** 수용 기준·요구사항 본문·bash 블록은 **한 글자도 건드리지 않았다** — 감사가 「개정이 결함을 만든다」(12 → 4 → 0)는 자기 증거를 들어 이 항목들의 유예를 권했고, 오케스트레이터가 D4 하나만은 관측 손실 비용이 실재하므로 진행을 지시했다. **D4** — §5.3 표가 열 행인데 Definition of Done 두 자리가 「아홉 자리」라 체크리스트를 따르는 구현자가 한 자리를 조용히 빠뜨렸다. 두 자리를 「**모든** 자리(작성 시점 열 행)」로 바꿔 다시 낡지 않게 했다(하드코딩된 모집단 수가 어긋난 두 번째 사례라 수를 고치는 대신 표현을 바꿨다). **D2** — `#msg-input` 과 `.message:not(.turn-cont)` 를 「이 SPEC 이 바꾸지 않는 자리」로 적었는데 **둘 다 바뀐다**(전자는 `background: none; border: none` 추가, 후자는 `border-top` 삭제). 결론(일곱 전부 첫 매치가 곧 관측 대상)은 옳고 **이유가 틀렸으므로** 이유만 고쳤다 — 다섯은 §B.6 의 제자리 편집이라서, 둘은 손대지 않아서. **D1** — 같은 문장의 「여섯」이 일곱을 열거하고 있었다. **D3** — AC-016 매트릭스 칸이 옛 `^//` 표기를 남기고 있어 실행 블록의 `^[[:space:]]*//` 와 어긋났다(설명 칸 정렬이며 관측은 불변). **D5** — `progress.md` 의 모집단 셋(ts 블록 24, 선택자 열셋, 행 번호 인용 0)이 2회차 교정 **도중** 값이라 25·열넷·2 로 어긋나 있었다. 세 수를 바로잡고, 남아 있던 맨 행 번호 인용 둘(`plan.md` M1·M2 의 계약 주석 지시 두 줄)을 grep 앵커로 바꿔 N6 잔여를 닫았다. | manager-spec |
| 0.4.2 | 2026-09-11 | **앵커 표기 부류 정리 (3회차 감사 D2 와 같은 부류, 오케스트레이터 승인).** 세 자리의 네 군데가 옛 `^//` 표기를 남기고 있어 AC-WEBUI-016 의 실제 관측(`^[[:space:]]*//`)과 어긋났다. **① REQ-WEBUI-015 본문(§4.6)은 모순이었다** — 앵커가 `^//` 에 맞아야 한다고 요구하면서, 자기 되쓰기 대상 4번(`server/test/auth-name.test.ts`)은 `it` 안이라 들여쓰기가 있어 **그 요구를 만족할 수 없다.** 표현 선호가 아니라 요구사항 본문의 자기모순이므로, 뜻하는 바 그대로 「주석 줄에 있어야 한다 — 선행 공백은 허용된다(`^[[:space:]]*//`)」로 고치고 그 이유(자기 대상 하나가 들여쓰기 안에 있다)를 본문에 적었다. **②·③ §5.1 안내문과 `acceptance.md` 안티패턴 표 칸**은 「AC-016 이 `^//` 로 찾는다」는 **거짓 사실 주장**이었다 — 실제 표기로 정정했다. 관측·기준·bash 블록은 **하나도 바뀌지 않았다**(실행 블록의 앵커 넷은 2회차부터 이미 `^[[:space:]]*//` 였다). 남은 `^//` 넷(HISTORY 두 행 · `progress.md` 훑기 기록 · `acceptance.md` [N1] 설명)은 **그 표기가 왜 틀렸는지를 설명하려고 인용한 것**이라 그대로 둔다. 요구사항 16·수용 기준 16 불변. | manager-spec |

---

## 1. 배경과 목적

지금 화면에는 서로 무관해 보이는 결함 넷이 있지만, 원인은 하나다. **시각 위계가 없다** — 화면에서 가장 강한 색을 로그아웃 버튼이 쓰고, 정작 읽어야 할 것(누가 말했는가, 어느 방에 있는가, 무엇을 쓰는 중인가)은 전부 같은 밝기로 깔려 있다.

| # | 지금 | 현상 |
|---|------|------|
| C1 | `.room-item` 이 이름을 두 줄로 접는다 | 행 높이가 들쭉날쭉하고 접힌 이름이 `보관` 글자와 붙어 어디를 눌러야 하는지 모호하다 |
| C2 | 턴 경계가 `border-top` 가는 선 하나다 | "새 턴"이 아니라 "표의 줄"로 읽히고, 화자 구분이 이름 색 하나에만 걸려 있다 |
| C3 | 입력칸·첨부·보내기가 각자 떠 있는 flex 형제다 | 입력칸이 버튼에 폭을 떼어 줘 가운데가 좁고, 테두리가 없어 어디를 눌러 쓰는지 모호하다 |
| C4 | `#logout-btn` 이 사이드바 바닥의 전폭 강조색 버튼이다 | 화면에서 제일 강한 색이 "나가기"에 걸려 있다 |

이 SPEC 이 끝나면 이렇게 된다.

```
사이드바                        채팅
┌─────────────────┐  ┌──────────────────────────────┐
│ 방            + │  │ # 방 이름          [봇 참여] │
│ ▎# prj2         │  │                              │
│   # prj2/ files │  │ (아) prodev-비서 [BOT] 13:15 │
│   # prj/ 보고 🗄 │  │      본문…                   │
│ 보관된 방       │  │                              │
│                 │  │ (김) 김피엘        13:16     │
│ (김) 김피엘   ⇥ │  │      본문…                   │
└─────────────────┘  │ ┌──────────────────────────┐ │
                     │ │ 📎ᵃ  메시지…    [보내기] │ │
                     │ └──────────────────────────┘ │
                     └──────────────────────────────┘
```

바뀌는 것은 거의 전부 **표시 방식**이다. 데이터베이스도, 기존 아홉 셸 함수의 네트워크 호출 수·순서도 바뀌지 않는다(REQ-WEBUI-016). 서버 쪽 변경은 **딱 하나** — 운영자가 선택지로 제시받고 승인한 읽기 전용 라우트 `GET /api/auth/me` 다(§4.5). 그것 말고 서버·스키마·채널은 손대지 않는다.

### 1.1 승인된 디자인 출처

운영자가 검토·승인한 4-아트보드 디자인 캔버스가 이 SPEC 의 구속력 있는 시각 기준이다.

- 캔버스: `https://claude.ai/code/artifact/ecc34474-0861-4a32-82b0-cd70921284d9`
- 아트보드: `Main`(전체 화면), `Rooms`(C1 전/후 + 행 상태 4종), `Message`(C2 전/후), `Composer`(C3 전/후 + 상태 3종)

[HARD] **아트보드 원본은 세션 스크래치패드에 있어 영구 보존되지 않는다.** 그래서 이 문서는 캔버스를 가리키는 것으로 그치지 않고, 아트보드가 정한 값을 §4 요구사항 본문에 **전부 옮겨 적었다.** 구현자는 캔버스에 접근하지 못해도 이 문서만으로 화면을 만들 수 있어야 한다 — 캔버스가 사라져도 이 SPEC 은 자립한다.

### 1.2 아트보드가 쓴 값과 기존 토큰의 대조

아트보드는 16진수 리터럴로 그려졌지만, 그 값은 전부 `web/design-tokens.css` 에 이미 있는 토큰이다. 아래 대조표가 그 사실을 못 박는다 — 구현은 **리터럴이 아니라 토큰 이름**을 쓴다.

| 아트보드 리터럴 | 토큰 | 쓰이는 곳 |
|-----------------|------|-----------|
| `#1e1f22` | `--md-bg-sidebar` | C4 계정 바 배경 (이 앱에서 지금까지 안 쓰던 가장 어두운 층) |
| `#2b2d31` | `--md-bg-panel` | 사이드바, 첨부 칩, 꺼진 보내기 버튼 |
| `#313338` | `--md-bg-main` | 채팅 배경 |
| `#2e3035` | `--md-bg-hover` | 행·메시지 호버, 현재 방 |
| `#383a40` | `--md-bg-input` | 작성기 컨테이너, 보관 아이콘 호버 배경 |
| `#f2f3f5` | `--md-text-primary` | 또렷한 글자 |
| `#949ba4` | `--md-text-muted` | 앞머리·시각·라벨 |
| `#5865f2` | `--md-accent` | 현재 방 강조 막대, BOT 배지, 초점 테두리, 보내기 |
| `#3f4147` | `--md-divider` | 작성기 기본 테두리 |
| `#eb459e` 등 | `--md-role-color-1..5` | 아바타 배경, 봇 이름 색(현행 유지) |
| `11px` / `12px` / `15px` | `--md-font-size-label` / `-timestamp` / `-body` | 이 셋 밖의 폰트 크기는 쓰지 않는다 |
| `4px` / `8px` / `12px` / `16px` / `20px` | `--md-space-1..5` | 간격 |
| `50%` / `8px` / `4px` | `--md-radius-avatar` / `-input` / `-badge` | 모서리 |

> **관측 하나 (기존 동작, 이 SPEC 이 만든 것이 아니다).** `web/design-tokens.css` 의 `--md-role-color-4: #5865f2` 는 `--md-accent: #5865f2` 와 **같은 값**이다. 따라서 `avatar-color-4` 를 배정받은 작성자의 아바타는 강조색과 구분되지 않는다. 이것은 새 결함이 아니다 — 봇 이름 색은 지금도 `.bot-color-4` 로 그 색을 순환 배정받고 있다(`grep -n 'bot-color-4' web/style.css`). 팔레트는 **바꾸지 않는다**: 다섯 색 순환은 승인된 디자인이고, 색 하나를 새로 만드는 것은 운영자 제약 1 을 어긴다. 여기 적어 두는 이유는 나중에 「아바타 색이 강조색과 같다」는 관찰이 나왔을 때 그것이 **기존 상태**임을 알 수 있게 하기 위해서다.

토큰에 대응이 없는 값은 셋뿐이며, 전부 **길이**다: 방 행 높이 `26px`, 메시지 아바타 `40px`, 계정 바 아바타 `28px`. 이 셋은 `web/style.css` 가 이미 쓰는 리터럴 길이 선례(`min-height: 44px`, `min-width: 240px`, `max-height: 200px`)를 따라 리터럴로 적고, `web/design-tokens.css` 에 새 토큰을 만들지 않는다.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 앞머리(prefix) | 방 이름에서 **마지막 `/` 까지**의 부분. `prodev-a/보고` 의 앞머리는 `prodev-a/` 다 |
| 꼬리(tail) | 방 이름에서 앞머리를 뺀 나머지. 방들이 서로 구별되는 부분이라 결코 줄이지 않는다 |
| 턴(turn) | 같은 작성자의 5분 이내 연속 메시지 묶음. 기준과 판정은 `SPEC-WEBCHAT-001` 의 `sameTurn` 이 이미 소유한다 — 이 SPEC 은 그 **표시**만 바꾼다 |
| 이어짐 행 | 턴의 두 번째 이후 메시지. `.message.turn-cont` 이며 머리글이 CSS 로만 숨겨진다 |
| 아바타 | 작성자 이름의 첫 글자 하나를 담은 원. **이미지 업로드는 없다**(§6 범위 밖) |
| 작성기 컨테이너 | C3 이 새로 만드는 둥근 상자 하나. 첨부·입력·보내기·첨부 칩이 전부 그 안에 산다 |
| 계정 바 | C4 가 새로 만드는 사이드바 맨 아래 줄. 아바타 + 이름 + 조용한 로그아웃 아이콘 |
| 조용한 버튼 | 배경 없이 `--md-text-muted` 글자·아이콘만 있는 버튼. 강조색을 쓰지 않는다 |

## 3. 선행 SPEC에서 받아 쓰는 것

이 SPEC 이 서버에 더하는 것은 읽기 전용 라우트 하나뿐이고(§4.5), 그 라우트조차 아래의 기존 `preHandler` 를 **그대로 소비**한다. 나머지는 전부 이미 머지된 것을 소비하기만 한다.

| 출처 | 받아 쓰는 것 | 실제 코드로 확인한 모양 |
|------|-------------|------------------------|
| `SPEC-WEBSHELL-001` | `state`, `$(id)`, `renderRooms()`, `archiveRoom()`, `logout()`, 영속 id 20개 | `web/app.js` — 영속 id 목록은 `server/test/web-shell.test.ts` 의 `REQUIRED_IDS` 가 계속 단언한다 |
| `SPEC-WEBCHAT-001` | `renderMessage(m)`, `sameTurn()`, `.turn-cont`, `.bot-color-1..5`, 장식 훅 호출 자리 | `web/app.js` |
| `SPEC-ROOM-001` | `GET /api/rooms` → `{active, archived}`, `RoomRow = {id, name, status, created_at, archived_at}` | `server/src/routes-rooms.ts` |
| `SPEC-MSG-001` | 메시지 객체가 `author_type`·`author_name`·`author_user_id`·`author_bot_id` 를 **전부 싣는다** | `server/src/routes-messages.ts` — 목록은 `SELECT *` 뒤 `{...m}` 로, 전송 팬아웃은 `{...row}` 로 내보낸다. `author_user_id` 가 사람 아바타 색의 안정 키가 된다(REQ-WEBUI-006) |
| `SPEC-WEBRICH-001` | 첨부 링크 칩, 권한 판정 줄, 참여 다이얼로그 | `web/rich.js` — 이 SPEC 은 그 어느 것도 만지지 않는다(§5) |
| `SPEC-WEBACNAV-001` | `#autocomplete` 의 키보드 이동·TO/CC 배지 | `web/app.js` + `web/style.css` 370~408행 — 이 SPEC 은 그 규칙을 **한 줄도 고치지 않는다**(REQ-WEBUI-009) |
| `SPEC-AUTH-001` | `requireAuth` preHandler — 쿠키를 `sessions`/`users` 조인으로 풀어 `req.user = {id, username}` 을 채우고, 실패하면 `401 {error}` 를 낸다 | `server/src/auth.ts` — `@MX:ANCHOR` 가 붙은 공유 계약이다. `GET /api/auth/me` 는 이것을 **고치지 않고 쓴다**(REQ-WEBUI-013) |

## 4. 요구사항 (GEARS)

주체 표기: `<렌더러>` 는 `web/app.js` 의 그리기 함수(`renderRooms`·`renderMessage`·`renderPickedFiles`)를, `<화면>` 은 `web/index.html` + `web/style.css` 가 만드는 결과 화면을 가리킨다.

[HARD] **아래 요구사항이 CSS 선언 목록에서 적는 선택자 문자열은 규범이다.** `.room-item`·`.room-prefix`·`.room-name`·`.room-hash`·`.archive-btn`·`.message`·`.message > :not(.msg-avatar)`·`.msg-avatar`·`.avatar-color-1..5`·`.bot-badge`·`#composer-box`·`#new-room-btn, #new-bot-btn`·`.account-bar`·`.account-avatar` 는 **그 형태 그대로** 단일 선택자 규칙으로 쓴다 — `.room-item .room-name { }` 처럼 조상을 덧붙이거나 두 규칙으로 쪼개지 않는다. 수용 기준의 CSS 정적 관측이 이 문자열을 부분 문자열로 찾기 때문이며, 요구사항이 자유를 주고 기준이 그 자유를 뺏는 상태를 만들지 않기 위해 여기서 미리 못 박는다.

### 4.1 C1 — 방 목록: 한 행 한 줄

**REQ-WEBUI-001** (Ubiquitous)
`renderRooms()` 는 방 하나마다 아래 구조의 `li.room-item` 을 만들어야 한다.

```
li.room-item[.active]
  ├ span.room-hash    ── "#"
  ├ span.room-prefix  ── 앞머리 (마지막 '/' 까지, 없으면 빈 문자열)
  ├ span.room-name    ── 꼬리 (구별되는 부분)
  └ button.archive-btn ── 활성 방에만 (보관된 방에는 없다)
```

이름 분해 규칙은 이렇다. `name.lastIndexOf('/')` 가 `-1` 이면 앞머리는 빈 문자열, 꼬리는 이름 전체다. `-1` 이 아니면 앞머리는 `name.slice(0, i + 1)`(마지막 `/` 를 **포함**), 꼬리는 `name.slice(i + 1)` 이다. **다만 그렇게 나눈 꼬리가 빈 문자열이면**(이름이 `/` 로 끝날 때) 나누지 않고 이름 전체를 꼬리로 둔다 — 구별되는 부분이 하나도 안 보이는 행을 만들지 않기 위해서다.

`span.room-prefix` 는 앞머리가 빈 문자열이어도 **DOM 에 만든다.** 구조가 이름에 따라 달라지면 그 구조에 기대는 시험이 입력에 따라 붉어졌다 푸르렀다 한다.

세 span 의 문자열은 전부 `textContent` 로만 넣는다 — 방 이름은 다른 사용자가 등록할 수 있는 신뢰 경계 밖 문자열이다(`REQ-WEBCHAT-004` 와 같은 이유).

같은 요구사항이 정하는 화면 쪽: `<화면>` 은 방 행을 **높이 26px 한 줄**로 그려야 하며, 방 이름은 어떤 길이에서도 줄바꿈하지 않아야 한다.

- `.room-item` — `height: 26px`, `display: flex`, `align-items: center`, `gap: var(--md-space-1)`, `padding: 0 var(--md-space-2)`, `border-radius: var(--md-radius-badge)`, `min-width: 0`
- `.room-prefix` — `font-size: var(--md-font-size-label)`, `color: var(--md-text-muted)`, **그리고 줄어드는 쪽이다**: `min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap`
- `.room-name` — `font-size: var(--md-font-size-body)`, `flex-shrink: 0`, `white-space: nowrap`
- `.room-hash` — `flex-shrink: 0`

[HARD] **줄어드는 것은 앞머리뿐이다.** 폭이 모자라면 `prodev-worktogether/보고` 는 `prod…/보고` 로 보이고, 결코 `prodev-worktogether/보…` 로 보이지 않는다. 앞머리는 방들이 공유하는 부분이라 지워도 구별이 남지만, 꼬리를 지우면 어느 방인지 알 수 없게 된다.

**REQ-WEBUI-002** (While 현재 방 — `state.currentRoomId` 와 같은 방의 행)
`<화면>` 은 그 행을 `background: var(--md-bg-hover)` 와 `box-shadow: inset 2px 0 0 var(--md-accent)` 로 그리고, `.room-name` 을 `color: var(--md-text-primary)`, `font-weight: var(--md-font-weight-name)` 로 그려야 한다.

강조 막대에 `border-left` 대신 `inset box-shadow` 를 쓰는 이유는 기계적이다 — `border-left` 는 26px 고정 높이 안에서 콘텐츠 폭을 2px 밀어 현재 방만 글자 시작점이 어긋난다.

**REQ-WEBUI-003** (When 방 행에 마우스가 올라오거나 그 행의 보관 버튼이 키보드 초점을 받으면 — 감춤 방식 금지 조항 포함)
`<화면>` 은 그 행의 `.archive-btn` 을 보이게 하고, `.room-name` 을 `var(--md-text-primary)` 로 밝히고, 행 배경을 `var(--md-bg-hover)` 로 바꿔야 한다.

`.archive-btn` 은 20×20 아이콘 버튼이 된다 — `background: none`, `color: var(--md-text-muted)`, 안에 인라인 SVG(상자 아이콘) 하나 — `fill="none" stroke="currentColor"`(색 리터럴 금지, REQ-WEBUI-016), `margin-left: auto` 로 오른쪽 끝. 호버 시 `background: var(--md-bg-input)`, `color: var(--md-text-primary)`.

[HARD] (Unwanted — shall not) 구현은 `.archive-btn` 을 감출 때 `display: none`, `visibility: hidden`, `hidden` 속성, DOM 제거 **가운데 어느 것도 써서는 안 된다.** 감춤은 `opacity: 0` 으로만 하며, `.room-item:hover .archive-btn` 과 `.archive-btn:focus-visible` 둘 다 `opacity: 1` 로 되돌린다.

지금 `보관` 은 언제나 화면에 있는 `<button>` 이라 `Tab` 으로 닿는다. 아이콘화가 그 접근성을 도로 뺏으면 개선이 아니라 후퇴다. 위 넷은 전부 요소를 탭 순서와 접근성 트리에서 **제거**하지만 `opacity: 0` 은 제거하지 않는다.

`.archive-btn` 은 아이콘만 남으므로 접근 가능한 이름을 속성으로 갖는다 — `aria-label="방 보관"`, `title="방 보관"`.

**REQ-WEBUI-004** (Ubiquitous)
`<화면>` 은 보관된 방 행을 흐리게(`opacity: 0.55`, `color: var(--md-text-muted)`) 그리고 그 행에 보관 컨트롤을 두지 않아야 하며(`REQ-WEBSHELL-009` 보존), `#new-room-btn` 과 `#new-bot-btn` 은 강조색 배경을 쓰지 않는 조용한 아이콘 버튼으로 그려야 한다.

강조색은 **사라지지 않고 위계를 얻는다.** `--md-accent` 를 쓰는 자리는 이 SPEC 이 끝난 뒤 정확히 넷이며, 넷 다 「지금 어디에 있는가·무엇이 봇인가·지금 쓰는 중인가·이것을 누르면 나간다」를 말한다:

| 자리 | 요구사항 | 무엇을 말하는가 |
|------|----------|----------------|
| 현재 방의 2px 막대 | REQ-WEBUI-002 | 내가 지금 어느 방에 있는가 |
| `BOT` 배지 | REQ-WEBUI-007 | 이 작성자는 사람이 아니다 |
| 작성기 초점 테두리 | REQ-WEBUI-009 | 지금 여기에 쓰는 중이다 |
| 보내기 버튼 | REQ-WEBUI-011 | 보낼 것이 있을 때의 유일한 «누르는» 자리 |

계정 바 아바타(REQ-WEBUI-012)도 `--md-accent` 를 배경으로 쓰지만 그것은 **사람 아바타의 기본색**이지 강조 신호가 아니다.

[HARD] **여기서 빠지는 것은 「무엇이든 다 강조색」 이던 옛 상태다** — 전폭 로그아웃 버튼과 사이드바의 두 생성 버튼. 「강조색은 하나뿐」으로 읽어 위 넷 가운데 어느 것을 지우면 REQ-007·009·011 을 어기게 된다.

사이드바의 두 생성 버튼은 `background: none`, `color: var(--md-text-muted)`, 20×20 안에 `+` 모양 인라인 SVG(`fill="none" stroke="currentColor"` — 색 리터럴 금지, REQ-WEBUI-016).

[HARD] **두 버튼은 공동 규칙 하나로 쓴다 — 선택자 문자열은 `#new-room-btn, #new-bot-btn` 이며 이 순서와 이 형태가 규범이다.** 두 규칙으로 쪼개거나 순서를 뒤집지 않는다. §4 머리의 선택자 규범 조항과 같은 이유다 — 수용 기준이 이 문자열을 부분 문자열로 찾으므로, 요구사항이 자유를 주고 기준이 그 자유를 뺏는 상태를 만들지 않는다.

두 버튼의 글자 라벨(`+ 새 방`·`+ 봇 등록`)은 `aria-label` 로 옮겨 접근 가능한 이름을 유지한다.

### 4.2 C2 — 메시지: 구분선 대신 아바타 기둥

**REQ-WEBUI-005** (Ubiquitous)
`renderMessage(m)` 은 아래 구조의 요소 하나를 만들어 `#messages` 에 덧붙여야 한다. **세 요소는 전부 `.message` 의 직계 자식이다.**

```
div.message.<author_type>[.turn-cont]
  ├ span.msg-avatar.avatar-color-N  ── 작성자 이름 첫 글자 하나
  ├ div.msg-head ── strong(이름) [+ span.bot-badge] + span.msg-time
  └ div.msg-body ── 본문
```

[HARD] `.msg-head` 와 `.msg-body` 는 **직계 자식 자리를 유지한다.** 아바타를 붙이려고 머리글·본문을 중간 컨테이너로 감싸면 `SPEC-WEBCHAT-001` 이 못 박은 `.message > .msg-head > strong` 구조가 깨지고, 그 구조를 단언하는 형제 시험이 붉어진다(§5.3). 아바타 기둥은 감싸기가 아니라 **CSS 그리드**로 만든다.

```css
.message { display: grid; grid-template-columns: 40px 1fr; column-gap: var(--md-space-4); }
.msg-avatar { grid-column: 1; grid-row: 1 / span 2; }
.msg-head   { grid-column: 2; grid-row: 1; }
.msg-body   { grid-column: 2; grid-row: 2; }
/* [HARD] 형제 SPEC 의 장식 노드가 아바타 칸으로 밀려 들어가지 않게 하는 기본 배치 */
.message > :not(.msg-avatar) { grid-column: 2; }
```

[HARD] **마지막 한 줄이 없으면 `SPEC-WEBRICH-001` 의 첨부와 권한 버튼이 40px 아바타 칸에서 뭉갠다.** 실측: `web/rich.js` 는 장식 훅 안에서 `el.appendChild(...)` 를 두 번 부르고(`grep -n 'el.appendChild' web/rich.js`) 그 `el` 은 훅이 받는 `.message` **그 자체**다. 즉 첨부 노드와 `.verdict-row` 는 `.msg-body` 아래가 아니라 `.message` 의 **직계 자식**이다. 명시 배치가 없는 넷째 이후 직계 자식은 그리드 자동 배치로 1열(40px)에 들어간다.

이 결함은 **시험이 전부 초록인 채로 통과한다** — 형제 단언 셋(`web-chat.test.ts`·`web-markdown.test.ts` 의 `.message > figure` 개수 둘 + `.msg-body .verdict-row` 부재 하나)은 노드 **개수**만 센다. 그래서 AC-WEBUI-006 이 CSS 정적 단언 하나와 실브라우저 렌더 폭 관측 하나를 함께 진다.

같은 요구사항이 정하는 나머지:

- `.message:not(.turn-cont)` 의 `border-top` 을 **없앤다.** 턴 경계는 이제 간격과 아바타가 진다
- 턴 사이 간격은 `var(--md-space-5)`(20px), 이어짐 행 사이는 `0`
- 메시지 패딩 `var(--md-space-1) var(--md-space-2)`, `border-radius: var(--md-radius-badge)`
- 메시지에 마우스가 올라오면 `background: var(--md-bg-hover)`
- 본문의 문단 간격은 `var(--md-space-2)`(8px) — `web/style.css` 의 `.md-p { margin: 0 0 var(--md-space-2) }` 가 **이미** 그 값이다. 새 규칙을 더하지 않고 그대로 둔다
- `.msg-body` 의 `line-height: 1.7` 과 `letter-spacing: 0.02em` 은 **그대로 둔다** (2026-09-09 운영자 가독성 결정)
- `.msg-avatar` — `width: 40px; height: 40px; border-radius: var(--md-radius-avatar)`, 가운데 정렬, `font-size: var(--md-font-size-body)`, `font-weight: var(--md-font-weight-name)`, `color: var(--md-text-primary)`

**REQ-WEBUI-006** (Ubiquitous)
`renderMessage` 는 아바타 배경색을 작성자마다 **고정된** 값으로 배정해야 한다 — 같은 작성자는 다시 그려도, 새로고침해도 늘 같은 색이고, 서로 다른 두 작성자는 색이 부딪히지 않는 한 다른 색이다.

배정 키는 작성자 종류마다 다르다.

| `author_type` | 키 | 결과 |
|---------------|-----|------|
| `bot` | `m.author_bot_id ?? 0` | `avatar-color-((키 % 5) + 1)` — 이름 색과 같은 순환식(`bot-color-N`)을 그대로 쓴다 |
| `user` | `m.author_user_id`, 없으면 `m.author_name` 의 코드 단위 합 | `avatar-color-((키 % 5) + 1)` |
| `system` | 없음 | `avatar-color-N` 을 붙이지 않는다. `background: var(--md-bg-panel)`, `color: var(--md-text-muted)` |

사람에게 `author_user_id` 가 없을 때의 이름 해시가 필요한 이유는 방어적이다 — 키가 `undefined` 면 `(undefined ?? 0) % 5` 로 **모든 사람이 같은 색**이 되어 "개인을 가른다"는 목적 자체가 조용히 무너진다. 해시는 `[...name].reduce((h, c) => (h + c.codePointAt(0)) % 5, 0)` 처럼 결정적이면 충분하다.

`.avatar-color-1..5` 는 `--md-role-color-1..5` 를 `background` 로 소비하는 다섯 규칙이다. 새 색을 만들지 않는다.

**REQ-WEBUI-007** (Where `author_type` 이 `'bot'` 인 메시지)
`renderMessage` 는 이름 요소 바로 뒤에 `span.bot-badge` 를 두고 그 안에 `BOT` 을 넣어야 하며, `<화면>` 은 그것을 `background: var(--md-accent)`, `color: var(--md-text-primary)`, `font-size: var(--md-font-size-label)`, `font-weight: var(--md-font-weight-name)`, `border-radius: var(--md-radius-badge)` 로 그려야 한다.

**이것은 접근성 요구다.** 지금 사람과 봇을 가르는 유일한 단서는 이름 글자 색이고, 색각 이상이나 저대비 환경에서는 그 단서가 통째로 사라진다. 배지는 색에 기대지 않는 두 번째 단서다.

봇 이름 글자 색(`bot-color-1..5`)과 사람 이름 색(`--md-text-primary`)은 **지금과 똑같이 둔다.** 이름 색이 봇/사람을 가르고, 아바타 색이 개인을 가르고, 배지가 색 없이도 봇을 가른다 — 셋은 겹치는 신호가 아니라 서로 다른 축이다.

`.bot-badge` 는 `.msg-time` 보다 앞에 온다. 시각 요소를 찾는 코드는 `.msg-time` 클래스로 찾는다 — `.msg-head > span` 순서에 기대지 않는다(§5.3).

**REQ-WEBUI-008** (While 메시지가 이어짐 행일 때 — `.turn-cont`)
`<화면>` 은 아바타를 `visibility: hidden` 으로 감추어야 하며, 구현은 아바타 요소를 **DOM 에서 빼서는 안 된다.**

이유 셋이 모두 같은 방향을 가리킨다. ① 40px 기둥이 자리를 지켜야 이어짐 행의 본문이 턴 첫 줄의 본문과 세로로 맞는다. ② `visibility: hidden` 은 접근성 트리에서도 빠지므로, 화면낭독기가 같은 사람의 이름 첫 글자를 줄마다 되풀이 읽지 않는다. ③ DOM 모양이 첫 줄과 이어짐 줄에서 같으므로 구조 시험이 입력에 따라 갈라지지 않는다 — 머리글을 CSS 로만 숨기는 기존 결정(`.turn-cont .msg-head { display: none }`)과 같은 논리다.

### 4.3 C3 — 작성기: 테두리 하나 안의 한 덩어리

**REQ-WEBUI-009** (Ubiquitous · While `#msg-input` 이 초점을 가지고 있을 때 절 포함)
`<화면>` 은 첨부 컨트롤·입력칸·보내기 버튼·첨부 칩을 **하나의 컨테이너 `#composer-box`** 안에 두고, 그 컨테이너가 채팅 열의 폭을 그대로 쓰게 해야 한다.

- `#composer-box` — `background: var(--md-bg-input)`, `border-radius: var(--md-radius-input)`, `box-shadow: inset 0 0 0 var(--md-border-width) var(--md-divider)`, `padding: var(--md-space-2) var(--md-space-2) var(--md-space-2) var(--md-space-4)`, **그리고 폭 선언 `flex: 1; min-width: 0`**
- [HARD] 폭 선언이 **없으면 「폭을 그대로 쓴다」가 성립하지 않는다.** `#composer` 는 `display: flex` 로 남으므로(그 선언을 지우지 않는다) 자식은 grow 없이 내용 폭까지만 늘어난다. `width: 100%` 로 써도 되지만 둘 중 하나는 반드시 있어야 하고, AC-WEBUI-010 이 그것을 관측한다
- 그 안에 세로로 두 칸: 위쪽이 첨부 칩 줄(`#file-chosen`), 아래쪽이 입력 줄(첨부 label + `#msg-input` + `#send-btn`)
- 입력 줄은 `display: flex; align-items: flex-end; gap: var(--md-space-2)`
- `#msg-input` 은 `flex: 1; min-width: 0`, 자체 배경·테두리 없음(`background: none; border: none; outline: none`), `min-height: 44px` 유지, `resize: none` 유지
- `#composer` 는 컨테이너를 감싸는 바깥 `footer` 로 남는다 — `padding: var(--md-space-3) var(--md-space-4)`, `position: relative` 유지

테두리를 `border` 가 아니라 `inset box-shadow` 로 그리는 이유는 REQ-WEBUI-002 과 같다 — 테두리가 콘텐츠 폭을 먹지 않고, 초점 시 색만 바꾸면 되어 레이아웃이 흔들리지 않는다.

[HARD] (While `#msg-input` 이 초점을 가지고 있을 때) `<화면>` 은 `#composer-box` 의 inset 테두리 색을 `var(--md-accent)` 로 바꾸어야 한다.

`#composer-box:focus-within` 으로 표현한다. 기존 `input:focus { outline: 1px solid var(--md-accent) }` 전역 규칙은 `<textarea>` 에 걸리지 않으므로 충돌이 없다.

같은 요구사항이 정하는 컨테이너 내부 배치: `renderPickedFiles()` 가 그리는 `.file-chip` 들은 `#composer-box` **안쪽**, 입력 줄 **위**에 쌓여야 하며, `#autocomplete` 은 지금처럼 `#composer` 의 직계 자식으로 남아 입력칸 바로 위에 떠야 한다.

`#file-chosen` 은 `display: flex; flex-wrap: wrap; gap: var(--md-space-1)` 이고 칩이 하나도 없으면 자리를 차지하지 않는다(`#file-chosen:empty { display: none }`). `.file-chip` 배경은 `var(--md-bg-panel)` 로 바뀐다 — 이제 `--md-bg-input` 컨테이너 **안**에 있어서, 같은 색이면 칩이 보이지 않는다.

[HARD] `#autocomplete`·`.ac-item`·`.ac-kind` 의 규칙(`web/style.css` 의 `SPEC-WEBACNAV-001` 블록)은 **한 줄도 고치지 않는다.** `bottom: 100%` 는 `#composer` 기준이고 `#composer` 는 그대로 남으므로, 팝업은 지금과 같은 자리에 뜬다.

**REQ-WEBUI-010** (Ubiquitous)
첨부 컨트롤은 `<label id="attach-btn" for="file-input">` 로 남아야 하며, 그 안의 📎 이모지는 stroke 방식 인라인 SVG(클립 모양, 18×18, `stroke="currentColor"`)로 바뀌어야 한다.

[HARD] `label[for]` 은 **스크립트 없이** 파일 선택창을 연다. `web/index.html` 이 그 사실을 주석으로 못 박아 두었고, 여는 코드는 어디에도 없다. 이것을 `<button>` 으로 바꾸면 파일 첨부가 조용히 죽는다 — 클릭은 되는데 창이 안 열리고, 오류도 안 난다. 이모지를 아이콘으로 바꾸는 것은 `<label>` **안쪽** 내용의 교체이지 요소 종류의 교체가 아니다.

`role="button"`·`tabindex="0"`·`title="파일 첨부"` 는 그대로 두고 `aria-label="파일 첨부"` 를 더한다(글자 라벨이 사라지므로).

**REQ-WEBUI-011** (While 보낼 것이 하나도 없을 때 — `#msg-input` 값이 공백뿐이고 고른 파일이 0개)
`<화면>` 은 `#send-btn` 을 `background: var(--md-bg-panel)`, `color: var(--md-text-muted)` 로 그려야 하고, 구현은 그 버튼에 `aria-disabled="true"` 를 두어야 한다. 보낼 것이 생기면 `background: var(--md-accent)`, `color: var(--md-text-primary)`, `aria-disabled="false"` 로 돌아간다.

[HARD] 구현은 `#send-btn` 에 **`disabled` 속성을 쓰지 않는다.** 이유 둘. ① `disabled` 는 버튼을 탭 순서에서 빼므로, 키보드 사용자가 "보내기가 왜 안 되지"를 확인할 대상 자체가 사라진다 — 꺼진 이유를 읽을 수 없는 버튼보다 읽을 수 있는 버튼이 낫다. ② `sendMessage()` 는 **이미** `if (!body.trim() && files.length === 0) return` 으로 빈 전송을 막고 있다(`web/app.js`). 동작상의 차단은 이미 있고, 여기서 더할 것은 그 사실의 **표시**뿐이다.

[HARD] **초기값의 출처를 정한다.** `web/index.html` 이 `<button id="send-btn" … aria-disabled="true">` 로 초기값을 싣고, `initChat()` 이 `refreshSendState()` 를 **한 번 불러** 그 값을 실제 상태로 확정한다. 정적 속성만 두고 갱신 함수를 부르지 않는 구현은 금지다 — 그 구현은 화면상 옳아 보이면서 상태와 표시가 영원히 어긋난다.

상태 갱신은 **네 자리**에서 부른다:

| 자리 | 언제 |
|------|------|
| `initChat()` | 채팅 초기화 시 한 번 — 초기값을 상태로 확정한다 |
| `onComposerInput` | 입력이 바뀔 때마다 |
| `renderPickedFiles` | 첨부 목록이 다시 그려질 때마다 |
| `clearPickedFiles` | 전송 성공으로 선택이 비워질 때 |

`initChat()` 을 넣는 이유가 이 요구사항의 핵심이다. 나머지 셋 중 어느 것도 **방을 여는 시점에 반드시 도는 것이 아니어서**, 그 셋만으로는 「방금 방을 연 화면」의 상태가 정의되지 않는다. 그 함수들에 네트워크 호출을 더하지 않는다(REQ-WEBUI-016).

### 4.4 C4 — 로그아웃: 계정 바로 내리기

**REQ-WEBUI-012** (Ubiquitous)
`<화면>` 은 사이드바 맨 아래에 계정 바 하나를 두어야 하며, 그 안에 28px 아바타 · 현재 사용자 이름 · 오른쪽 끝의 조용한 로그아웃 아이콘 버튼이 이 순서로 들어가야 한다.

- 계정 바 — `background: var(--md-bg-sidebar)`, `margin: auto calc(-1 * var(--md-space-3)) calc(-1 * var(--md-space-3))`(사이드바 패딩을 상쇄해 바닥에 꽉 붙는다), `padding: var(--md-space-2) var(--md-space-3)`, `display: flex; align-items: center; gap: var(--md-space-2)`
- 아바타 — 28px 원, `background: var(--md-accent)`, `font-size: var(--md-font-size-timestamp)`, `font-weight: var(--md-font-weight-name)`, 이름 첫 글자
- 이름 — `font-size: var(--md-font-size-body)`, `font-weight: var(--md-font-weight-name)`, `color: var(--md-text-primary)`, 넘치면 생략기호
- `#logout-btn` — `margin-left: auto`, 28×28, `background: none`, `color: var(--md-text-muted)`, 안에 인라인 SVG(문에서 나가는 화살표, `fill="none" stroke="currentColor"` — 색 리터럴 금지), 호버 시 `color: var(--md-status-error)`

[HARD] **`#logout-btn` 은 id 를 그대로 유지한 채 자리와 모양만 바뀐다.** 그 id 는 `SPEC-WEBSHELL-001` 의 영속 20개 가운데 하나이고(`server/test/web-shell.test.ts` `REQUIRED_IDS`), `initApp()` 이 그 id 로 클릭 핸들러를 건다. 새 버튼을 만들고 옛것을 지우면 로그아웃이 조용히 죽는다.

아이콘만 남으므로 접근 가능한 이름을 속성으로 갖는다 — `aria-label="로그아웃"`, `title="로그아웃"`.

`logout()` 함수 본문은 **한 줄도 바뀌지 않는다**(§4.8 계약 6 — 아홉 함수의 네트워크 호출 동결).

이름의 출처는 §4.5 가 정한다 — 운영자가 명시적으로 승인한 **범위 확장**이다.

### 4.5 C4 를 세우는 서버 라우트 (승인된 범위 확장)

> **이 절은 운영자가 선택지로 제시받고 고른 결과다.** 계정 바에 현재 사용자 이름을 띄우려면 이름의 출처가 필요한데, 지금 프런트엔드에는 그것이 없다 — `state` 에 사용자 필드가 없고, `login()` 은 입력받은 이름을 저장하지 않으며, 새로고침 뒤 복구 경로에는 이름을 되찾을 자리가 없고, 세션 쿠키는 `httpOnly` 라 읽지 못한다. 세 안(서버 라우트 추가 / `localStorage` / 이름 없는 계정 바)을 대가와 함께 올렸고 운영자가 **서버 라우트 추가**를 골랐다. 나머지 둘은 기각됐다 — `localStorage` 는 쿠키가 죽은 뒤에도 남아 **틀린 이름**을 띄우고, 이름 없는 계정 바는 "내가 누구로 들어와 있는가"라는 목적 절반을 버린다. 이 SPEC 의 "서버 변경 없음" 전제는 이 한 라우트만큼 **의도적으로** 열렸다.

**REQ-WEBUI-013** (Ubiquitous)
`server/src/auth.ts` 의 `registerAuthRoutes(app, db)` 는 `GET /api/auth/me` 라우트를 등록해야 하며, 그 라우트는 `requireAuth` 를 `preHandler` 로 통과한 뒤 인증된 사용자를 그대로 돌려주어야 한다.

| 항목 | 값 |
|------|-----|
| 자리 | `registerAuthRoutes(app, db)` 안 — `/api/auth/login`·`/api/auth/logout` 이 이미 등록되는 그 함수다 |
| 인증 | `preHandler: [requireAuth]`. 미인증이면 `requireAuth` 가 **이미 하던 대로** `401 {error: '로그인이 필요합니다'}` 를 낸다 — 이 SPEC 은 401 경로를 새로 쓰지 않는다 |
| 성공 응답 | `req.user` 그대로 — `{ id: <number>, username: <string> }`. 모양을 다시 빚지 않는다 |
| 새 질의 | **없다.** `requireAuth` 가 이미 `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?` 로 사용자를 해석하고 `req.user` 에 담는다. 이 라우트는 그 결과를 읽기만 한다 |
| 새 테이블·새 인증 경로 | 없다 |

[HARD] 구현은 **`requireAuth` 를 고치지 않는다.** 그 함수는 `server/src/auth.ts` 에 `@MX:ANCHOR` 로 표시돼 있고, 바로 아래 `@MX:REASON` 이 이유를 적어 두었다 — "시그니처 변경은 형제 SPEC 의 라우트를 전부 깨뜨린다". `SPEC-ROOM-001`·`SPEC-BOT-001`·`SPEC-MSG-001` 의 보호 라우트가 전부 이 `preHandler` 를 공유하므로, 시그니처든 401 본문이든 `req.user` 모양이든 바꾸는 순간 그 SPEC 들의 기준이 함께 붉어진다. 새 라우트는 **있는 그대로 소비**한다.

**REQ-WEBUI-014** (When 부트스트랩이 살아 있는 세션을 복구하거나 로그인이 성공했을 때)
`web/app.js` 는 `GET /api/auth/me` 를 불러 그 응답을 `state.user` 에 담아야 하며, 계정 바는 `state.user.username` 의 첫 글자와 이름을 그려야 한다.

배선 자리와 그 이유:

| 항목 | 결정 |
|------|------|
| 새 함수 | `loadMe()` — `state.user = await api('/api/auth/me')`. 새 export 하나가 늘지만 형제의 export 단언은 **필수 부분집합** 방식이라 초과분을 문제 삼지 않는다(`SPEC-WEBSHELL-001` §4.8 계약 3) |
| 필드 초기화 | `initApp()` 이 첫 줄에서 `state.user = null` 로 선언·초기화한다. §4.8 계약 2 — 필드를 쓰는 SPEC 이 스스로 선언한다 |
| 복구 경로 | `initApp()` 의 `loadRooms() → loadBots() → showMain()` 사슬에 `loadMe()` 를 `showMain()` **앞**에 끼운다. 메인 화면이 뜨는 순간 이름이 이미 있어야 계정 바가 빈 채로 깜빡이지 않는다 |
| 로그인 경로 | `initApp()` 이 거는 `#login-form` submit 핸들러가 `login()` 성공 뒤 `loadMe()` 를 부른다 |
| 실패 방향 | `loadMe()` 가 던지면 기존 `.catch(() => showAuth())` 가 그대로 받는다. 여기까지 왔는데 `/api/auth/me` 가 401 이면 세션이 정말 죽은 것이므로 인증 화면이 옳은 방향이다 |

[HARD] **`login()` 본문에 `loadMe()` 를 넣지 않는다.** `login()` 은 §4.8 계약 6 이 네트워크 호출을 동결한 아홉 함수 가운데 하나이고, 형제 시험이 그 호출을 **순번으로** 단언한다. `initApp()` 은 그 아홉 밖이라고 `web/app.js` 주석이 명시하므로, 배선은 전부 `initApp()` 안에 둔다.

[HARD] **이름은 언제나 이 라우트를 지나 온다 — 한 경로뿐이다.** `login()` 이 받은 문자열로 `state.user` 를 직접 채우는 지름길은 쓰지 않는다. 이유 둘. ① `login()` 에는 `username` 문자열만 있고 `id` 가 없어, 직접 채우면 `state.user` 가 반쯤 빈 모양이 된다 — 나중에 `id` 를 읽는 코드가 조용히 `undefined` 를 만난다. ② 출처가 하나면 복구 경로와 로그인 경로가 어긋날 수 없다. 왕복 한 번이 더 드는 것은 사실이고, 그 값은 화면 전환 한 번에 이미 요청 둘이 나가는 자리에서 치른다.

### 4.6 가로지르는 요구사항

**REQ-WEBUI-015** (Ubiquitous)
run 단계는 이 SPEC 이 거짓으로 만드는 **네 자리의 계약 주석**을 전부 되쓴 뒤에야 이 SPEC 을 마감해야 한다.

계약이 문서에만 있고 코드에 없으면, 다음 사람이 코드만 읽고 옛 계약을 되살린다. **주석이 계약의 배포본**이다 — 개정했으면 배포본도 함께 바꾼다.

| # | 자리 (내용으로 찾는다) | 무엇이 거짓이 되나 | 되쓴 뒤 반드시 들어갈 앵커 문장 |
|---|----------------------|-------------------|------------------------------|
| 1 | `web/app.js` — `grep -n 'room-item / .archive-btn'` | 방 행이 `# 이름` 문자열 하나라는 전제 | `// … SPEC-WEBUI-001 §5.1 — 꼬리는 줄이지 않는다 …` |
| 2 | `web/app.js` — `grep -n 'div.message.<author_type>'` | `.message` 의 직계 자식이 둘이라는 전제 | `// … SPEC-WEBUI-001 §5.2 — 직계 자식 셋 …` |
| 3 | `server/src/auth.ts` — `grep -n '@MX:NOTE'` | 「이 모듈이 등록하는 라우트는 login·logout 둘뿐」 | `// @MX:NOTE: … /api/auth/me …` |
| 4 | `server/test/auth-name.test.ts` — `grep -n '라우트는 login·logout'` | 같은 문장 | `// … /api/auth 라우트는 셋 …` — **이 주석은 `it` 안이라 들여쓰기가 있다.** AC-016 의 앵커가 `^[[:space:]]*//` 인 이유다 |

[HARD] **앵커 문장은 구현 코드가 우연히 만들어 낼 수 없는 문자열이어야 하고, 반드시 주석 줄에 있어야 한다 — 선행 공백은 허용된다(`^[[:space:]]*//`).** 열 0 을 요구하지 않는 이유는 이 요구사항 자신의 대상 때문이다: 위 표의 4번(`server/test/auth-name.test.ts`)은 `describe` → `it` 안에 있어 **들여쓰기가 있고**, 열 0 을 요구하면 자기 대상 하나를 만족 불가능하게 만든다. 클래스 이름(`room-hash`·`msg-avatar`)이나 SPEC ID 만 세는 관측은 **구현만 해도 통과한다** — 이 SPEC 이 스스로 정의한 함정 부류 「이름 없는 통과」다. AC-WEBUI-016 이 위 네 앵커를 `^[[:space:]]*//` 로 찾는다.

3·4 가 목록에 있는 이유는 기계적이다. 라우트가 셋이 되는 순간 두 문장은 코드 옆에 남은 거짓 계약이 되는데, **아무 시험도 붉어지지 않는다** — 그 파일의 라우트 단언은 `'regist'` 만 본다.

**REQ-WEBUI-016** (Unwanted — shall not)
구현은 아래 가운데 어느 것도 해서는 안 된다.

| 금지 | 이유 |
|------|------|
| `web/style.css` 에 16진수 색 리터럴을 넣는 것 | `REQ-WEBSHELL-004`·§4.8 계약 5-2. 현재 파일의 리터럴은 0건이며 0건으로 남는다 |
| `--md-font-size-label`·`-timestamp`·`-body` 밖의 새 `font-size` 값을 **단위와 무관하게** 넣는 것 (`px`·`em`·`rem`·`%` 전부) | 기존의 토큰 아닌 선언 11건(`20px` 1 + `em` 10, 전부 `#auth-view h1`·`SPEC-WEBMD-001`·칩 계열)은 이 SPEC 이 만지지 않는 자리라 그대로 남는다. **새로** 더하는 규칙에는 세 토큰만 쓴다 — `px` 만 막으면 `1.1em`·`0.8rem`·`90%` 가 그대로 새 나간다 |
| `web/index.html`·`web/app.js` 의 인라인 SVG 에 색 리터럴(`stroke="#…"`·`fill="#…"`)을 넣는 것 | 이 SPEC 은 인라인 SVG 를 다섯 곳에 새로 넣는다(보관·새 방·봇 등록·첨부·로그아웃). 금지가 `web/style.css` 에만 걸려 있으면 운영자 제약 4(색은 `var(--md-*)` 로만)가 그 다섯 곳에서 통째로 새 나간다. 다섯 SVG 는 전부 `fill="none" stroke="currentColor"` 로 그리고 색은 CSS 의 `color` 가 준다 |
| `web/design-tokens.css` 에 새 색 토큰을 더하는 것 | 승인된 디자인이 기존 팔레트 안에서 그려졌다(§1.2) |
| `server/src/auth.ts` 의 `GET /api/auth/me` 등록 **한 곳을 뺀** `server/`·`channel/` 의 어떤 변경도 | 승인된 범위 확장은 그 한 라우트뿐이다(§4.5). 스키마·마이그레이션·다른 라우트·`requireAuth` 본문은 그대로다 |
| **아홉 셸 함수**(`api`·`login`·`register`·`logout`·`loadRooms`·`loadBots`·`createRoom`·`archiveRoom`·`createBot`) 본문에 `api()`/`fetch` 호출을 더하거나 빼거나 순서를 바꾸는 것 | §4.8 계약 6. 형제 시험이 호출을 순번으로 단언한다. `loadMe()` 의 호출은 그 아홉 밖 — 새 함수와 `initApp()` 안에만 산다(REQ-WEBUI-014) |
| 영속 id 20개 가운데 하나라도 지우거나 이름을 바꾸는 것 | `REQ-WEBSHELL-003` 관측 2 |
| `#autocomplete`·`.ac-item`·`.ac-kind`·`.message a.attachment`·`.verdict-row`·`#invite-dialog` 규칙을 고치는 것 | `SPEC-WEBACNAV-001`·`SPEC-WEBRICH-001` 소유. 이 SPEC 은 그 넷을 개정하지 않는다 |

---

## 5. 형제 SPEC 계약 개정 (이 SPEC 이 인수한다)

C1 과 C2 는 형제 SPEC 둘이 `web/app.js` 주석에 새겨 둔 DOM 계약 두 건을 깨뜨린다. 운영자 결정에 따라 **형제 문서를 고치는 대신 이 SPEC 이 그 계약을 개정하고 소유권을 인수한다.**

### 5.1 개정 1 — `.room-item` / `.archive-btn` (출처 `SPEC-WEBSHELL-001` §4.8 계약 4)

**폐기되는 계약 (원문 그대로).**

`web/app.js` — `grep -n 'room-item / .archive-btn' web/app.js` 로 찾는 자리(작성 시점 64행):

```
// 활성 방은 `# 이름` + 보관 버튼, 보관된 방은 버튼 없이 흐리게 (REQ-WEBSHELL-009).
// .room-item / .archive-btn 클래스 이름과 이 규칙은 형제가 바꾸지 않는다 (§4.8 계약 4).
```

`.moai/specs/SPEC-WEBSHELL-001/spec.md` §4.8 계약 4 표의 해당 행:

> | `.room-item` / `.archive-btn` | 이 SPEC | 클래스 이름과 "보관된 방에는 `.archive-btn` 이 없다"는 규칙을 바꾸지 않는다. 자식 요소를 더하는 것은 무해하다 |

**새 계약.** 소유자는 `SPEC-WEBUI-001` 이다.

| 항목 | 새 규칙 |
|------|---------|
| 클래스 이름 | `.room-item` 과 `.archive-btn` **둘 다 그대로 유지된다** — 이름은 개정되지 않는다 |
| 행 내용 | `li.room-item` 은 더 이상 `# 이름` 문자열 하나를 갖지 않는다. `span.room-hash` + `span.room-prefix` + `span.room-name` 세 자식으로 나뉜다(REQ-WEBUI-001) |
| `.archive-btn` | 글자 버튼이 아니라 아이콘 버튼이다. **활성 방에만 있고 보관된 방에는 없다는 규칙은 그대로다**(`REQ-WEBSHELL-009` 보존). 평소 `opacity: 0`, 호버·초점에서 `opacity: 1` — DOM 과 탭 순서에는 늘 있다(REQ-WEBUI-003) |
| 형제가 할 수 있는 것 | 자식 요소를 더하는 것은 여전히 무해하다. 세 span 의 클래스 이름과 "꼬리는 줄이지 않는다"는 규칙을 바꾸지 않는다 |

[HARD] **`web/app.js` 의 그 자리에 되쓸 주석은 아래 앵커 문장을 그대로 포함한다**(REQ-WEBUI-015 1번, AC-WEBUI-016 이 `^[[:space:]]*//` 로 찾는다):

```
// 방 행은 # + 앞머리 + 꼬리 세 span 이고 보관 버튼은 활성 방에만 있다.
// 이 구조와 클래스 이름은 SPEC-WEBUI-001 §5.1 — 꼬리는 줄이지 않는다 (줄어드는 것은 앞머리뿐).
```

깨지는 것과 깨지지 않는 것을 실제 시험으로 대조했다. `server/test/web-shell.test.ts` 의 `AC-WEBSHELL-010` 은 `active[0].textContent` 가 방 이름을 **포함**하는지만 보므로(`toContain`) 세 span 으로 나뉘어도 통과하고, `.archive-btn` 유무 단언도 그대로 통과한다. **이 개정으로 붉어지는 기존 단언은 없다.**

### 5.2 개정 2 — 메시지 DOM 구조 (출처 `SPEC-WEBCHAT-001` REQ-WEBCHAT-003)

**폐기되는 계약 (원문 그대로).**

`web/app.js` — `grep -n 'div.message.<author_type>' web/app.js` 로 찾는 자리(작성 시점 377행):

```
// div.message.<author_type> > (.msg-head > strong+span, .msg-body) (REQ-WEBCHAT-003).
```

`.moai/specs/SPEC-WEBCHAT-001/spec.md` REQ-WEBCHAT-003 의 구조 도식:

> ```
> div.message.<author_type>
>   ├ div.msg-head  ── strong(작성자 이름) + span(시각)
>   └ div.msg-body  ── 본문
> ```

**새 계약.** 소유자는 `SPEC-WEBUI-001` 이다.

```
div.message.<author_type>[.turn-cont]
  ├ span.msg-avatar[.avatar-color-1..5]  ── 작성자 이름 첫 글자 (새로 더해진 직계 자식)
  ├ div.msg-head ── strong(이름)[.bot-color-N] + [span.bot-badge] + span.msg-time
  └ div.msg-body ── 본문
```

개정된 것과 보존된 것:

| 항목 | 상태 |
|------|------|
| `.msg-head`·`.msg-body` 가 `.message` 의 **직계 자식** | **보존**. 중간 컨테이너를 넣지 않는다 — 그리드로 배치한다(REQ-WEBUI-005) |
| `.msg-head > strong` 이 작성자 이름 | **보존** |
| 봇 이름의 `.bot-color-1..5` 순환 배정 | **보존** — `author_bot_id` 기준, 지금 그대로 |
| 장식 훅 호출 자리·형태·횟수 (`ctx.decorate(el, m)`, 붙이기 직전 정확히 한 번) | **보존** — 이 SPEC 은 훅 계약을 건드리지 않는다. `SPEC-WEBRICH-001` 의 결합은 그대로 산다 |
| `.turn-cont` 판정(`sameTurn`)과 머리글 CSS 숨김 | **보존** |
| **시각 요소를 `.msg-head > span` 으로 지목하던 관행** | **개정**. 봇 메시지에서는 `span.bot-badge` 가 먼저 온다. 앞으로 시각은 **`.msg-time` 클래스로** 지목한다 |
| `.message` 의 직계 자식이 둘이라는 전제 | **개정**. 이제 셋이다(아바타 포함) |
| 턴 경계의 `border-top` | **폐기**. 간격과 아바타가 대신한다(REQ-WEBUI-005) |
| **장식 훅이 붙이는 노드의 자리** | **명시**. `web/rich.js` 가 `.message` 의 직계 자식으로 붙이므로, `.message > :not(.msg-avatar) { grid-column: 2 }` 가 그것들을 본문 열에 둔다(REQ-WEBUI-005) |

[HARD] **`web/app.js` 의 그 자리에 되쓸 주석은 아래 앵커 문장을 그대로 포함한다**(REQ-WEBUI-015 2번):

```
// div.message.<author_type> > (span.msg-avatar, div.msg-head, div.msg-body)
// SPEC-WEBUI-001 §5.2 — 직계 자식 셋. 그리드 2열 배치이며 감싸는 컨테이너를 넣지 않는다.
// 시각은 .msg-time 클래스로 지목한다 (봇 메시지에서는 .bot-badge 가 먼저 온다).
```

### 5.3 이 개정이 건드리는 형제 시험 — run 단계가 함께 쓸어야 한다

계약 개정은 개정된 문장 하나로 끝나지 않는다. 아래는 위 두 개정에 **직접 닿는** 기존 단언 전부이며, run 단계는 각 자리를 열어 보고 결과를 `progress.md` §E.2 에 적는다. "안 깨질 것 같다"로 넘기지 않는다.

| 자리 | 지금 무엇을 단언하나 | 개정 후 |
|------|---------------------|---------|
| `server/test/web-shell.test.ts` `AC-WEBSHELL-010` (`.room-item` 열거·`textContent` 포함·`.archive-btn` 유무·`.active`) | 방 행 구조 | **통과 유지 예상** — `toContain` 이라 span 분해에 둔감하다. 실행으로 확인한다 |
| `server/test/web-shell.test.ts` `REQUIRED_IDS`(영속 20개, `logout-btn` 포함) | id 존재 | **통과 유지 필수** — C4 는 `#logout-btn` 을 옮기기만 한다(REQ-WEBUI-012) |
| `server/test/web-chat.test.ts` `.msg-head > strong` / `.msg-head > span` 단언 | 사람 메시지의 이름·시각 | **통과 유지 예상** — 그 단언은 사람 메시지(배지 없음)를 본다. 봇 메시지 시각을 보는 새 단언은 `.msg-time` 을 쓴다 |
| `server/test/web-chat.test.ts` `.message > .msg-head > strong` / `.message > .msg-body` 개수 단언 | 직계 자식 구조 | **통과 유지 필수** — REQ-WEBUI-005 의 그리드 결정이 이것 때문이다 |
| `server/test/web-chat.test.ts` `bot-color-[1-5]` 단언 | 봇 이름 색 | **통과 유지 필수** — 이름 색은 개정되지 않는다 |
| `server/test/web-markdown.test.ts` 의 `/\.msg-body\s*\{[^}]*\}/` CSS 정규식(그 블록에 `pre-wrap` 이 없어야 한다) | 마크다운 줄바꿈 책임 | **주의** — C2 가 `.msg-body` 블록을 고치면 이 정규식이 **첫** `.msg-body { }` 블록을 잡는다. 새 규칙은 그 블록 안에 `white-space` 를 넣지 않는다 |
| `server/test/web-visual.test.ts` | 실브라우저 레이아웃(Playwright, 부재 시 명시적 skip) | **구조 변경 필요** — 기동 절차를 `bootVisual()` 로 뽑고 기존 `it` 도 그것을 쓰게 한다. AC-003·006·010 의 뒤 겹이 그 헬퍼를 공유한다. 기존 단언 넷은 한 글자도 바뀌지 않는다 |
| `web/rich.js` 의 `el.appendChild(...)` 두 자리와 그것을 세는 형제 단언 셋(`web-chat.test.ts`·`web-markdown.test.ts`) | 장식 노드가 `.message` 직계 자식이라는 사실 | **셋 다 통과 유지 — 그리고 그것이 문제다.** 개수만 세므로 레이아웃 붕괴에 침묵한다. REQ-WEBUI-005 의 `grid-column: 2` 한 줄과 AC-WEBUI-006 의 렌더 폭 관측이 그 침묵을 메운다 |
| `server/test/auth-name.test.ts` 의 `'regist'` 단언 | `registerAuthRoutes` 가 등록하는 라우트 집합 | **통과 유지 — 그리고 그것이 문제다.** `'regist'` 만 보므로 라우트가 셋이 되어도 침묵한다. REQ-WEBUI-015 가 그 파일의 계약 주석을 되쓰기 대상에 넣는다 |
| `server/src/auth.ts` 를 소비하는 보호 라우트 시험 전부(`SPEC-ROOM-001`·`SPEC-BOT-001`·`SPEC-MSG-001` 계열) | `requireAuth` 의 401·`req.user` 계약 | **통과 유지 필수** — 새 라우트는 `requireAuth` 를 읽기만 한다(REQ-WEBUI-013). `npm test` 전체 실행이 그 증거다 |

### 5.4 `SPEC-WEBRICH-001`·`SPEC-WEBACNAV-001` 대조 — 하나는 닿고 하나는 닿지 않는다

운영자 지시에 따라 두 형제의 소유물을 건드리는지 확인했고, **양방향으로 결과를 남긴다.** 초판은 이 표에서 `SPEC-WEBRICH-001` 을 「닿지 않는다」로 적었고 그것은 **사실이 아니었다** — 아래 첫 행이 그 정정이다.

| 형제 | 소유물 | C3 이 닿는가 | 근거 |
|------|--------|-------------|------|
| `SPEC-WEBRICH-001` | `.message a.attachment`, `.message img.attachment-image`, `.verdict-row` | **닿는다 — 그리드 자동 배치가 직계 자식을 지배한다** | 실측: `web/rich.js` 의 `el.appendChild(...)` 두 자리에서 `el` 은 `.message` 그 자체다(`grep -n 'el.appendChild' web/rich.js`). 즉 그 노드들은 「메시지 안쪽(`.msg-body` 아래)」이 아니라 **`.message` 의 직계 자식**이고, REQ-WEBUI-005 의 그리드 아래에서 명시 배치 없이는 40px 아바타 칸으로 자동 배치된다. **`web/style.css` 의 `/* SPEC-WEBRICH-001 */` 블록은 여전히 한 줄도 바뀌지 않는다** — 고치는 것은 이 SPEC 의 블록에 들어가는 `.message > :not(.msg-avatar) { grid-column: 2 }` 한 줄이고, 형제의 규칙은 그대로 산다 |
| `SPEC-WEBRICH-001` | `#invite-dialog` 일가 | **닿지 않는다** | 다이얼로그는 `.message` 밖이다 |
| `SPEC-WEBRICH-001` | 장식 훅 결합(`createRichContext`) | **닿지 않는다** | REQ-WEBUI-005 이 훅 계약을 명시적으로 보존한다(§5.2) |
| `SPEC-WEBACNAV-001` | `#autocomplete`, `.ac-item`, `.ac-kind.to/.cc`, 키보드 이동 | **닿지 않는다** | `#autocomplete` 은 `#composer` 직계 자식으로 남고 `#composer` 도 남는다. `bottom: 100%` 기준이 그대로라 뜨는 자리가 안 바뀐다(REQ-WEBUI-009) |
| **소유자 없음** | `.file-chip`, `.file-chip-remove`, `#file-chosen`, `#attach-btn` | **닿는다 — 개정 대상 아님** | 이 넷은 카드 `t32` 결함 D-7 로 들어왔고 **어느 SPEC 도 요구사항으로 소유하지 않는다**(`.moai/specs/` 전수 grep 결과 0건). 따라서 개정할 계약이 없다. 이 SPEC 이 그 표시를 인수한다(REQ-WEBUI-010·015) |

---

## 6. 범위 밖 (Exclusions)

아래는 이 SPEC 에서 **만들지 않는다.** 승인된 아트보드에 그려져 있으나 운영자가 이번 범위로 지시하지 않은 것도 여기에 적는다 — 그림에 있다는 이유로 슬며시 들어오는 것을 막기 위해서다.

### Out of Scope — 아바타 이미지

- 아바타 이미지 업로드·저장·표시. 운영자 결정으로 **이름 첫 글자만** 쓴다
- 그에 딸린 서버 엔드포인트·DB 컬럼·정적 파일 경로

### Out of Scope — 서버·데이터·채널

- 스키마 변경·마이그레이션·새 테이블. 승인된 라우트 하나는 기존 `sessions`/`users` 조인을 **읽기만** 하고 새 질의를 만들지 않는다(§4.5)
- `GET /api/auth/me` **말고 다른** 새 API 엔드포인트
- `requireAuth` 본문·시그니처·401 응답 모양의 변경 — `@MX:ANCHOR` 가 붙은 공유 계약이다
- `channel/` 의 어떤 변경도

### Out of Scope — 마크다운 렌더

- `web/markdown.js` 와 `web/style.css` 의 `/* SPEC-WEBMD-001 */` 블록. `.md-*` 규칙은 `SPEC-WEBMD-001` 소유이며 그대로 둔다
- 본문 문단 간격은 이미 `--md-space-2` 라 새 규칙을 만들지 않는다(REQ-WEBUI-005)

### Out of Scope — 봇 참여 다이얼로그와 리치 표면

- `#invite-dialog`, `.invite-choice`, `#invite-command`, `.verdict-row`, 첨부 링크 칩 — 전부 `SPEC-WEBRICH-001` 소유

### Out of Scope — 아트보드에 그려졌으나 이번에 만들지 않는 것

- 작성기의 방 이름 안내 문구(`#방이름 에 메시지 보내기` 꼴 동적 placeholder). 현행 `메시지 보내기` 를 그대로 둔다
- 보내기 버튼 안의 화살표 아이콘. 글자 `보내기` 만 둔다
- `보관된 방` 절의 접기/펼치기와 개수 배지
- 봇 목록(`#bot-list`)·방 헤더(`#room-header`)·봇 칩의 시각 개편. 이번 넷에 들어 있지 않다
- 메시지 본문의 "답을 기다리는 질문" 노란 왼쪽 막대. `SPEC-WEBRICH-001` 의 권한 표면과 겹칠 여지가 있어 별도 판단이 필요하다

### Out of Scope — 반응형·테마

- 좁은 화면(모바일) 레이아웃. 데스크톱 폭 하나만 본다
- 라이트 테마. 다크 테마를 유지한다(운영자 제약 2)

---

## 7. 판정

이 SPEC 의 수용 기준 16개는 `acceptance.md` 에 있다. 판정 명령은 셋이다.

```bash
cd server && npm run typecheck                                             # 헬퍼 오용을 가장 먼저 잡는다 (TS2304)
cd server && npx vitest run test/web-shell.test.ts test/web-chat.test.ts   # 구조·거동
cd server && npx vitest run test/web-visual.test.ts                        # 레이아웃(실브라우저, 부재 시 명시적 skip)
cd server && npx vitest run test/auth-name.test.ts                         # GET /api/auth/me (§4.5)
cd server && npm test                                                      # 회귀 전부
```

[HARD] `npm run typecheck` 를 맨 앞에 두는 이유는 기계적이다 — `server/tsconfig.json` 이 `test` 를 include 하므로, 한 시험 파일에서 다른 파일의 헬퍼를 부르면 vitest 를 돌리기도 전에 `TS2304` 로 드러난다. `acceptance.md` § 파일마다 쓸 수 있는 헬퍼가 다르다 가 그 목록을 파일별로 나눠 적었다.

`development_mode` 는 `tdd` 다(`.moai/config/sections/quality.yaml`). 열여섯 기준은 전부 **먼저 붉어지고 나서** 푸르러진다.
