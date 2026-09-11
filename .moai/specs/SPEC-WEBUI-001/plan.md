# SPEC-WEBUI-001 구현 계획

## §A 맥락

승인된 4-아트보드 디자인 캔버스(`spec.md` §1.1)를 `web/` 세 파일에 옮기고, 계정 바를 세우는 읽기 전용 라우트 하나를 `server/src/auth.ts` 에 더한다(운영자 승인 범위 확장 — §B.1). DB 변경 없음, 스키마 변경 없음, 기존 아홉 셸 함수의 네트워크 호출 변경 없음. 방법론은 `tdd`(`.moai/config/sections/quality.yaml` — `test_first_required: true`).

**Tier 판정: M — 서버 라우트가 범위에 들어온 뒤 다시 재어도 M 이다.**

이미 M 을 배정했다는 이유로 M 을 유지하는 것이 아니라, 라우트가 들어온 상태에서 세 기준을 다시 쟀다.

| 기준 | Tier M 구간 | 지금 값 | 판정 |
|------|------------|---------|------|
| 바뀌는 파일 수 | 5~15 | **9** — 소스 넷(`web/app.js`·`web/index.html`·`web/style.css`·`server/src/auth.ts`) + 시험 넷(`web-shell`·`web-chat`·`web-visual`·`auth-name`) + 공유 헬퍼 하나(`server/test/css-rule.ts`, M0 이 만든다) | 구간 안 |
| LOC | 300~1000 | 대략 600~700 — CSS 약 150, `app.js` 약 100, HTML 약 40, `auth.ts` **약 4**, 시험 약 400 | 구간 안 |
| 구조적 성격 | 아키텍처·헌법 변경 아님 | 새 라우트는 기존 `preHandler` 를 소비하는 4줄이다. 새 질의·새 테이블·새 인증 경로 **0** | Tier L 아님 |

Tier L 로 올릴 근거를 따로 찾아봤고 없었다 — 파일 15개를 넘지 않고, 1000 LOC 을 넘지 않으며, 스키마도 마이그레이션도 없고, `requireAuth` 라는 공유 계약은 **읽기만** 한다. 라우트가 파일 수를 셋에서 넷으로 올렸을 뿐 구간을 벗어나지 않았다. 마일스톤은 여섯이다(M0~M5).

작성 시점에 실제 코드로 대조해 확인한 것:

| 확인한 것 | 결과 |
|-----------|------|
| `web/style.css` 의 16진수 색 리터럴 수 | **0건** (`grep -cE ':[^;{]*#[0-9a-fA-F]{3,8}\b' web/style.css`) |
| `web/style.css` 의 px 단위 `font-size` 수 | **1건** — 69행 `#auth-view h1 { font-size: 20px }`. 이 SPEC 이 만지지 않는 자리다 |
| 메시지 payload 에 `author_user_id` 가 실리는가 | **실린다** — `server/src/routes-messages.ts` 가 목록은 `SELECT *` 뒤 `{...m}`, 전송 팬아웃은 `{...row}` 로 내보낸다 |
| `.file-chip` 계열을 소유한 SPEC | **없다** — `.moai/specs/` 전수 grep 0건. 카드 `t32` D-7 로 들어온 표면이다 |
| `sendMessage()` 가 빈 전송을 막는가 | **막는다** — `if (!body.trim() && files.length === 0) return` |
| 영속 id 목록에 `logout-btn` 이 있는가 | **있다** — `server/test/web-shell.test.ts` `REQUIRED_IDS` |
| `requireAuth` 가 이미 사용자를 해석하는가 | **한다** — `server/src/auth.ts` 가 쿠키를 `sessions`/`users` 조인으로 풀어 `req.user = {id, username}` 에 담고, 실패 시 `401 {error}` 를 낸다. 새 라우트는 새 질의를 만들지 않는다 |
| `registerAuthRoutes` 가 라우트를 등록하는 자리인가 | **그렇다** — `/api/auth/login`·`/api/auth/logout` 이 그 함수 안에 있다. 새 라우트도 거기 붙는다 |
| `requireAuth` 를 고쳐도 되는가 | **안 된다** — 바로 위 `@MX:REASON` 이 "시그니처 변경은 형제 SPEC 의 라우트를 전부 깨뜨린다" 고 적어 두었다 |
| `initApp()` 을 실제로 부르는 기존 시험이 있는가 | **없다** — `web-shell.test.ts` 는 `initApp` 을 정적 문자열로만 단언하고, 로그인 시험은 `app.login()` 을 직접 부른다. 부트스트랩 사슬에 호출을 더해도 기존 단언이 붉어지지 않는다 |
| 장식 훅이 붙이는 노드가 `.message` 의 어디에 오는가 | **직계 자식** — `web/rich.js` 의 `el.appendChild(...)` 두 자리(`grep -n 'el.appendChild' web/rich.js`)에서 `el` 은 훅이 받는 `.message` 그 자체다. 「메시지 안쪽」이 아니다 (감사 F5) |
| 두 시험 파일이 헬퍼를 공유하는가 | **안 한다** — 서로 import 하지 않는다. `loadDom` 은 `web-shell.test.ts` 에만, `flush` 는 `web-chat.test.ts` 에만 있다. `server/tsconfig.json` 이 `test` 를 include 하므로 교차 호출은 `TS2304` 다 (감사 F1·F2) |
| CSS 규칙 블록을 꺼내는 기존 헬퍼가 있는가 | **있다** — `web-shell.test.ts` 의 `cssRuleBlock(css, selector)`. 원문 선택자를 부분 문자열로 찾고, **주석을 먼저 벗기고**, 중괄호 깊이를 센다. 세 함정을 이미 막아 둔 구현이다. **단 첫 매치를 돌려준다** — §B.6 이 그 성질에 맞는 편집 방식을 정한다 (감사 F3·N3) |
| `web-visual.test.ts` 에 재사용 가능한 기동 헬퍼가 있는가 | **없다** — 서버 기동·chromium·로그인 절차가 유일한 `it` 안에 인라인돼 있다. 새 `it` 셋이 그대로 복제하면 40여 줄이 네 벌이 된다 (감사 F4) |
| 토큰이 아닌 `font-size` 선언 수 | **11** — `35 - 24`(`grep -c 'font-size:'` 빼기 `grep -c 'font-size: var('`). `20px` 1 + `em` 10. 감사 보고서의 「9」는 em 둘을 빠뜨린 값이다 |
| `web/index.html`·`web/app.js` 의 SVG 색 리터럴 | **0** — `grep -cE '(stroke|fill)="#[0-9a-fA-F]'` 두 파일 모두 0 |
| `--md-role-color-4` 와 `--md-accent` | **같은 값** `#5865f2`. 봇 이름 색이 지금도 `.bot-color-4` 로 그 색을 쓴다(`grep -n 'bot-color-4' web/style.css`) — **기존 동작**이지 이 SPEC 이 만든 것이 아니다 |

---

## §B 되돌리기 어려운 결정부터 — 검토는 여기부터

아래는 바뀔 가능성이 높은 순서다. 실행 순서(§F)와 다르다 — 검토는 이 순서로, 실행은 그 순서로 한다.

### B.1 계정 바의 «현재 사용자 이름» 출처 — 운영자가 서버 라우트를 골랐다 (해소됨)

**결정: `GET /api/auth/me` 를 더한다.** 운영자가 선택지 셋을 받고 이것을 골랐다. 이 SPEC 의 "서버 변경 없음" 전제는 여기서 **의도적으로** 한 뼘 열렸다 — 조용히 스며든 것이 아니라, 선택지로 올라가 승인된 범위 확장이다.

미결이었던 이유(측정한 사실 넷): `state` 에 사용자 필드가 없고, `login()` 은 입력받은 이름을 저장하지 않으며, 부트스트랩의 세션 복구 경로(`loadRooms → loadBots → showMain`)에 이름을 되찾을 자리가 없고, `md_session` 쿠키는 `httpOnly` 라 자바스크립트가 읽지 못한다.

기각된 둘과 그 이유:

| 기각안 | 왜 기각됐나 |
|--------|------------|
| `localStorage` 에 로그인 시 이름을 적어 둔다 | 쿠키가 만료된 뒤에도 `localStorage` 는 남아 **틀린 이름**을 띄운다. 게다가 `login()` 은 §4.8 계약 6 이 동결한 아홉 함수 가운데 하나라 본문 수정 자체가 계약의 가장자리다 |
| 이름 없이 계정 바만 만든다 | 계정 바의 목적 절반("내가 누구로 들어와 있는가")이 사라진다. 아트보드와도 다르다 |

**되돌리기 어려운 정도**: 낮다. 라우트는 4줄이고 기존 `preHandler` 를 읽기만 한다. 그래도 이 항목을 §B 맨 앞에 두는 이유는 되돌리기 비용이 아니라 **범위 경계를 옮겼기 때문**이다 — 검토자가 가장 먼저 확인해야 할 것은 "서버를 건드린 것이 맞나"이지 CSS 배치가 아니다.

구현 형태와 배선 자리는 `spec.md` §4.5(REQ-WEBUI-013·014)에 있다. 여기서 한 번 더 못 박을 것 하나: **`requireAuth` 는 고치지 않는다.** `server/src/auth.ts` 의 `@MX:REASON` 이 그 이유를 이미 적어 두었고, 시그니처든 401 본문이든 `req.user` 모양이든 바꾸는 순간 `SPEC-ROOM-001`·`SPEC-BOT-001`·`SPEC-MSG-001` 의 보호 라우트 기준이 함께 붉어진다.

### B.2 메시지 DOM 계약 개정 — 중간 컨테이너를 쓰지 않는다 (되돌리기 가장 어려움)

`spec.md` §5.2 가 새 계약이다. 갈림길은 하나였다: 아바타를 붙이려고 머리글·본문을 `div.msg-main` 같은 컨테이너로 감쌀 것인가.

**감싸지 않는 쪽을 골랐다.** 감싸면 `server/test/web-chat.test.ts` 의 `$$('#messages .message > .msg-head > strong')` 과 `> .msg-body` 개수 단언이 **0을 세어** 붉어지고, `SPEC-WEBRICH-001` 의 장식 훅이 받는 `el` 의 자손 구조 전제도 흔들린다. CSS 그리드로 세 형제를 2열에 배치하면 DOM 은 그대로 두고 화면만 바뀐다 — 계약 표면을 최소로 깬다.

되돌리기 어려운 이유: 이 구조 위에 아바타 규칙·이어짐 행 규칙·호버 규칙이 전부 얹힌다. 나중에 컨테이너 방식으로 바꾸면 C2 전체를 다시 쓴다.

### B.3 아바타 색 배정 키 — 사람은 `author_user_id`

봇은 이미 `author_bot_id` 로 다섯 색을 순환한다(`web/app.js`). 사람에게 필요한 안정 키를 `author_user_id` 로 정했다 — payload 에 실려 있음을 서버 코드로 확인했다(§A).

폴백을 둔 이유가 이 결정의 핵심이다. 키가 `undefined` 면 `(undefined ?? 0) % 5 + 1` 이 **모든 사람을 1번 색**으로 만들고, 화면은 멀쩡해 보이는데 "개인을 가른다"는 목적만 조용히 사라진다. 그래서 이름 코드 단위 합 폴백을 요구사항에 못 박고(REQ-WEBUI-006), AC-WEBUI-007 이 `author_user_id: null` 인 사람 둘로 그것을 관측한다.

**이름 색은 건드리지 않는다.** 봇=역할색·사람=흰색이라는 지금 규칙이 봇/사람을 가르고, 아바타 색이 개인을 가른다. 두 축을 합치면 어느 하나가 다른 하나를 덮는다.

### B.4 «보낼 것 없음» 은 `aria-disabled` 이고 `disabled` 가 아니다

`sendMessage()` 가 이미 빈 전송을 막고 있으므로(§A) 남은 문제는 **표시**뿐이다. `disabled` 를 쓰면 버튼이 탭 순서에서 빠져, 키보드 사용자는 "왜 안 보내지"를 확인할 대상 자체를 잃는다. `aria-disabled="true"` 는 상태를 알리면서 초점은 남긴다.

### B.5 보관 버튼 감춤은 `opacity` 하나뿐이다

`display:none`·`visibility:hidden`·`hidden` 속성·DOM 제거는 넷 다 요소를 탭 순서에서 뺀다. 지금 `보관` 은 항상 탭으로 닿는 `<button>` 이므로, 그 넷 중 어느 것을 쓰든 **접근성 후퇴**다. AC-WEBUI-004 가 CSS 정적으로 그 넷의 부재를 관측한다.

### B.6 CSS 편집 방식 — [HARD] 기존 선택자는 제자리, 새 선택자만 끝 블록

`web/style.css` 는 이미 `/* SPEC-WEBRICH-001 */ … /* /SPEC-WEBRICH-001 */` 꼴 블록 규약을 쓴다. 이 SPEC 도 파일 끝에 `/* SPEC-WEBUI-001 */ … /* /SPEC-WEBUI-001 */` 를 연다(§4.8 계약 5-1 — `@import` 앞에 블록을 넣지 않는다). **다만 그 안에 들어가는 것은 «새 선택자» 뿐이다.**

| 편집 대상 | 어디에 쓰나 | 예 |
|-----------|------------|-----|
| `web/style.css` 에 **없던** 선택자 | 파일 끝 블록 | `.room-prefix`·`.room-name`·`.message`·`.message > :not(.msg-avatar)`·`.avatar-color-1..5`·`.bot-badge`·`#composer-box`·`.account-bar`·`.account-avatar`·`#new-room-btn, #new-bot-btn` |
| **이미 있는** 선택자에 선언을 **더할** 때 | **그 규칙을 제자리에서 고친다** | `.room-item`(`height: 26px` 등)·`.room-item.active`(inset box-shadow)·`.archive-btn`(`opacity: 0`) |
| **이미 있는** 선택자에서 선언을 **없앨** 때 | 제자리에서 지운다 (덮어쓰기 금지) | `.message:not(.turn-cont)` 의 `border-top`, `#logout-btn` 의 `margin-top: auto`, `#send-btn, #attach-btn` 의 `align-self` |

[HARD] **둘째 행이 이번 라운드에 새로 못 박은 것이고, 이유는 기계적이다.** 수용 기준이 쓰는 `cssRuleBlock` 은 **첫 매치**를 돌려준다(`at = i; break`). 기존 선택자를 끝 블록에 다시 쓰면 헬퍼가 **옛 블록**을 읽고, CSS 를 올바로 쓴 구현이 「그 규칙에 `height: 26px` 가 없다」로 떨어진다. 구현자는 자기 CSS 를 계속 고치게 되고 — 이것은 감사 1회차의 F3 과 **정확히 같은 형태의 시간 낭비**다(원인만 이스케이프에서 매치 순서로 옮겨 갔다).

제자리 편집은 부수 효과도 좋다. 덮어쓰기 층이 쌓이지 않아 「왜 켰다가 껐지」가 남지 않는데, 그것이 원래 §B.6 의 의도였다.

실측으로 확인한 자리: 이 SPEC 의 기준이 관측하는 선택자 가운데 `style.css` 에 이미 규칙 블록이 있는 것은 일곱이다 — `.room-item`(블록 둘: 자기 자신 + `#archived-list .room-item`)·`.room-item.active`·`.archive-btn`·`#msg-input`·`.message:not(.turn-cont)`·`#autocomplete`·`.ac-kind.to`. 그 가운데 **다섯이 이 SPEC 이 고치는 자리**다 — 앞 넷은 위 2행(선언 추가: `height: 26px`·inset box-shadow·`opacity: 0`·`background: none; border: none`), `.message:not(.turn-cont)` 는 위 3행(`border-top` 삭제). 다섯 다 **제자리 편집이므로 첫 매치가 곧 고쳐진 블록**이다. 남은 둘(`#autocomplete`·`.ac-kind.to`)은 이 SPEC 이 손대지 않는 `SPEC-WEBACNAV-001` 소유라 첫 매치가 그대로 관측 대상이다.

관측: AC-WEBUI-015 (4) 가 「끝 블록에 기존 선택자가 재정의되지 않았다」를 기계적으로 센다 — 개별 결함이 아니라 **부류**를 막는 가드다.

### B.7 리터럴 길이 셋을 토큰으로 승격하지 않는다

행 높이 `26px`, 아바타 `40px`/`28px` 은 `web/design-tokens.css` 에 대응이 없다. 토큰을 새로 만드는 대신 리터럴로 적는다 — `web/style.css` 가 이미 `min-height: 44px`·`min-width: 240px`·`max-height: 200px` 를 그렇게 쓰고 있고, 디자인 토큰 파일은 **색·타이포·간격 체계**의 집이지 개별 컴포넌트 치수의 집이 아니다. 결과적으로 `web/design-tokens.css` 는 **한 줄도 바뀌지 않는다.**

---

### B.8 예산을 병합으로 맞춘 것에 대한 판단 (감사 F16) — Tier 는 M 을 유지한다

감사가 옳게 지적했다: 0.2.0 라운드에서 요구사항 둘·기준 둘을 **Tier 상한을 맞추려고** 합쳤고, 그 결과 REQ-001 과 REQ-009 가 복합 요구사항이 되었으며, **관측 없는 하위 주장**(F11 의 폭, F12 의 초기 상태)이 정확히 그 안에서 생겼다. 예산은 「합쳐서 맞춰라」가 아니라 「올리거나 쪼개라」는 신호다.

**이번 라운드는 합치지 않았다.** 요구사항 16·기준 16 그대로이며, 늘어난 것은 기준의 **단언 수**다. 그리고 F11·F12 가 가리킨 두 하위 주장에는 각각 자기 관측이 생겼다 — 감사가 제시한 F16 해법 둘 중 「현행 유지하되 복합 요구사항의 각 주장이 각각 떨어질 수 있게 한다」를 골랐다.

정직하게 적는 잔여 비용 셋:

| 남는 비용 | 무엇이 흐려지나 |
|-----------|----------------|
| REQ-001 이 「DOM 구조 + 행 높이·생략 규칙」 둘을 진다 | 실패 메시지가 어느 쪽 주장인지 즉시 말해 주지 않는다. AC-001(구조)·002(꼬리)·003(높이) 셋으로 갈라 관측하므로 **판정은 갈라지지만**, 요구사항 문서를 읽는 사람에게는 한 덩어리로 보인다 |
| REQ-009 가 「컨테이너 + 초점 + 칩 배치 + 자동완성 불변 + 폭」 다섯을 진다 | 같은 문제. AC-010 이 다섯을 각각 단언하지만 요구사항 하나에 다섯 주장이 얹혀 있다 |
| 하위 주장이 나중에 하나 더 붙으면 다시 관측 없이 지나갈 여지 | 이번에 F11·F12 가 그렇게 생겼다. 다음 라운드에서 REQ-001·009 에 무엇을 더할 때는 **그 주장의 관측을 같은 편집에서** 붙여야 한다 |

**Tier 재판정: M 유지.** 근거는 셋이다. ① 감사 자신이 파일 수 재측정을 「정직하다」고 확인했고 마일스톤이 실제로 여는 파일과 일치한다 — **9개**(소스 4 + 시험 4 + M0 이 만드는 공유 헬퍼 `server/test/css-rule.ts`), Tier M 구간(5~15) 안. ② LOC 약 600~700 으로 Tier M 구간(300~1000) 안. ③ 스키마·마이그레이션·아키텍처 변경이 없다.

Tier L 로 올리면 얻는 것은 예산 25/25 뿐이고, 치르는 것은 산출물 둘(`design.md`·`research.md`) 추가와 통과선 상향(0.80 → 0.85)이다. **이 SPEC 에 부족한 것은 예산이 아니라 관측이었다** — 이번 라운드가 고친 열둘 가운데 예산 부족 때문에 생긴 것은 F11·F12 둘뿐이고, 그 둘은 요구사항 본문 한 줄씩과 단언 몇 개로 닫혔다. 예산이 25 였어도 F1~F5 는 그대로 났을 것이다.

**다만 다음 라운드에서 요구사항을 하나라도 더 쪼개야 한다면 그때는 Tier L 로 올리는 것이 옳다.** 지금 16/16 은 상한에 정확히 닿아 있어 여유가 0 이고, REQ-001·009 를 각각 둘로 되돌리면 18 이 되어 상한을 넘는다. 그 시점의 선택지는 「Tier L(예산 25/25, 산출물 5개, 통과선 0.85)」 또는 「사이드바(C1+C4+라우트) / 메시지(C2) / 작성기(C3) 세 SPEC 으로 분할」이다. 이번에 그 둘 중 어느 것도 하지 않은 이유는 감사가 F16 을 **optional/minor** 로 분류했고, 재감사 범위를 F1~F12 로 한정했기 때문이다.

---

## §C 사전 점검 (구현 착수 전)

```bash
# 기준 SHA 를 박아 둔다 — 없으면 AC-WEBUI-015 의 (3)·(4)가 조용히 통과한다
git rev-parse HEAD > .moai/specs/SPEC-WEBUI-001/.spec-base-sha
git rev-parse --verify "$(cat .moai/specs/SPEC-WEBUI-001/.spec-base-sha)"

# 기준선 실측 — 이 두 수가 마감 때 그대로여야 한다
grep -cE ':[^;{]*#[0-9a-fA-F]{3,8}\b' web/style.css     # 0
grep -cE 'font-size:\s*[0-9.]+px' web/style.css         # 1

# 회귀 기준선 — 지금 무엇이 푸른지 먼저 안다
cd server && npm test

# 계약 주석 두 자리를 행 번호가 아니라 내용으로 찾는다 (행 번호는 편집으로 밀린다)
grep -n 'room-item / .archive-btn' web/app.js
grep -n 'div.message.<author_type>' web/app.js

# 라우트를 붙일 자리와, 건드리면 안 되는 공유 계약의 자리
grep -n 'registerAuthRoutes' server/src/auth.ts
grep -n '@MX:REASON' server/src/auth.ts

# 시험 파일이 이미 갖고 있는 대역 — 새 기준이 이것을 찌르면 안 된다 (AC-WEBUI-013)
grep -n "app.get('/api/me'" server/test/auth-name.test.ts

# M0 이 옮길 헬퍼와, 되쓸 계약 주석 둘의 현재 자리 (행 번호가 아니라 내용으로)
grep -n 'function cssRuleBlock' server/test/web-shell.test.ts
grep -n '라우트는 login·logout' server/src/auth.ts server/test/auth-name.test.ts

# 장식 노드가 .message 직계 자식이라는 사실 — F5 의 근거
grep -n 'el.appendChild' web/rich.js

# 기준선 셋 (AC-WEBUI-015)
grep -cE '(stroke|fill)="#[0-9a-fA-F]' web/index.html web/app.js          # 0 · 0
echo $(( $(grep -c 'font-size:' web/style.css) - $(grep -c 'font-size: var(' web/style.css) ))   # 11
```

---

## §D 제약

| 제약 | 출처 |
|------|------|
| 새 색 리터럴·새 색 토큰 금지, 폰트 크기는 세 토큰뿐 | 운영자 제약 1, `REQ-WEBSHELL-004`, §4.8 계약 5-2 |
| `requireAuth` 본문·시그니처·401 응답 모양 불변 | `server/src/auth.ts` `@MX:ANCHOR`+`@MX:REASON`; `SPEC-ROOM-001`·`SPEC-BOT-001`·`SPEC-MSG-001` 이 공유한다 |
| 서버 변경은 `registerAuthRoutes` 안의 라우트 등록 한 곳뿐 | §B.1 운영자 승인 범위. 스키마·마이그레이션·다른 라우트는 그대로 |
| 시험 파일이 `/api/auth/me` 를 스스로 등록하지 않는다 | 대역을 찌르면 진짜 라우트를 지워도 초록으로 남는다 — AC-WEBUI-013 둘째 `it` 이 `hasRoute` 로 관측한다 |
| 한 시험 파일에서 다른 파일의 헬퍼를 부르지 않는다 | 두 파일은 서로 import 하지 않고 `tsconfig` 가 `test` 를 include 한다 — `TS2304` 로 죽는다 (감사 F1·F2) |
| CSS 정적 관측용 헬퍼를 새로 만들지 않는다 | 기존 `cssRuleBlock` 이 주석 제거·중괄호 깊이·접두 겹침 셋을 이미 막아 두었다 (감사 F3) |
| 새 인라인 SVG 다섯은 `fill="none" stroke="currentColor"` | 색 리터럴이 `style.css` 밖으로 새 나가는 유일한 경로다 (감사 F13) |
| 다크 테마 유지 | 운영자 제약 2 |
| 사이드바 + 채팅 열(헤더/메시지/작성기) 구조 유지 | 운영자 제약 3 |
| 색은 `var(--md-*)` 참조로만 | 운영자 제약 4, `REQ-WEBSHELL-004` |
| 영속 id 20개 유지 | `REQ-WEBSHELL-003` 관측 2 |
| 아홉 셸 함수의 네트워크 호출 동결 | `SPEC-WEBSHELL-001` §4.8 계약 6 |
| `#autocomplete` 계열 규칙 불변 | `SPEC-WEBACNAV-001` |
| 장식 훅 계약 불변 | `SPEC-WEBCHAT-001` REQ-WEBCHAT-003 / `SPEC-WEBRICH-001` REQ-WEBRICH-002 |
| `.md-*` 규칙 불변 | `SPEC-WEBMD-001` |
| 새 규칙은 `@import` 줄보다 뒤 | §4.8 계약 5-1 |
| 새 선택자 이름의 앞 세 글자가 전부 16진 문자이면 안 된다 | §4.8 계약 5-3 (`room-`·`msg-`·`avatar-`·`bot-`·`composer-`·`account-` 전부 안전) |

---

## §E 자기 검증

구현자는 마일스톤마다 아래를 실행하고 결과를 `progress.md` §E.2 에 **명령 + 관측 출력**으로 남긴다.

```bash
cd server && npm run typecheck    # 맨 먼저 — 헬퍼 오용은 여기서 TS2304 로 드러난다
cd server && npx vitest run test/web-shell.test.ts test/web-chat.test.ts
cd server && npx vitest run test/web-visual.test.ts
cd server && npx vitest run test/auth-name.test.ts
cd server && npm test
```

[HARD] `npm run typecheck` 를 **AC 코드를 넣은 직후** 한 번 돌린다. 이번 감사가 잡은 결함 여섯 중 둘(F1·F2)은 그 한 번으로 즉시 드러났을 것이다 — 시험을 돌리기도 전에.

[HARD] **Playwright 가 있는 환경에서 J3 을 한 번 이상 실제로 돌린다.** AC-003·006·010 의 뒤 겹은 skip 으로 넘기면 관측이 아니라 공백이고, 그중 AC-006 뒤 겹은 이 SPEC 에서 유일하게 「시험은 초록인데 화면이 깨진」 상태를 잡는 관측이다. 돌리지 못했다면 그 사실을 `progress.md` §E.2 에 **Gap 으로 적는다** — 「돌렸을 것」은 기록이 아니다.

tdd 규약: 새 `it` 을 먼저 넣고 **붉은 것을 눈으로 확인한 뒤** 구현한다. "붉었을 것"은 기록이 아니다 — 붉은 출력이 기록이다.

---

## §F 마일스톤 (실행 순서)

우선순위 표기만 쓰고 기간은 적지 않는다.

### M0 (우선순위 High) — 시험 골격 정비 (감사 F1·F2·F3·F4 의 전제)

기준 여섯이 실행되지 못한 원인은 전부 여기 있다. **먼저 고치지 않으면 뒤의 모든 마일스톤이 붉은 화면을 잘못 읽는다.**

1. `web-shell.test.ts` 의 `cssRuleBlock`(`grep -n 'function cssRuleBlock'`)을 `server/test/css-rule.ts` 로 옮겨 `export` 한다. 기존 호출 세 자리(`grep -n 'cssRuleBlock(css'`)를 import 로 바꾼다. **시그니처는 그대로다** — 그 세 단언의 의미가 바뀌지 않았다는 증거는 `npm test` 가 여전히 초록인 것이다.
   - [HARD] **`import { expect } from 'vitest'` 를 함께 가져간다.** 그 함수 본문이 `expect(at, …).toBeGreaterThanOrEqual(0)` 를 쓴다. 빠뜨리면 `TS2304: Cannot find name 'expect'` 로 **M0 자체가 실패한다.**
   - `server/test/` 에 비-테스트 `.ts` 를 두는 것은 선례가 있다(`no-listen.ts`·`probe-db.ts`·`wsupgrade-judgment.ts`) — vitest 기본 include 에 걸리지 않아 시험으로 수집되지 않는다.
   - [HARD] **동작을 바꾸지 않는다.** 이 함수는 **첫 매치**를 돌려주며 그 성질은 그대로 둔다 — 기존 호출 세 자리가 그 의미에 기대고 있다. 새 기준이 첫 매치와 어긋나지 않게 하는 것은 헬퍼가 아니라 **§B.6 의 편집 방식**이 진다.
2. `server/test/web-visual.test.ts` 의 서버 기동·chromium 기동·로그인 절차(그 파일의 유일한 `it` 안)를 같은 파일 안의 `bootVisual()` 로 뽑는다. 기존 `it` 도 그것을 쓰게 바꾸되 **단언 넷(`authBox` null, `mainBox` 존재·폭·높이)은 한 글자도 건드리지 않는다.** `skipReason` 규약도 그대로다.
3. 두 시험 파일의 `describe('SPEC-WEBUI-001 …')` 블록 첫머리에 그 파일에 없는 헬퍼를 지역 정의한다 — `web-shell.test.ts` 에는 `const flush = () => new Promise(r => setTimeout(r, 0))`.
4. `cd server && npm run typecheck` 와 `npm test` 를 돌려 **둘 다 초록**임을 확인한다.

[HARD] **M0 의 초록은 M0 시점의 트리만 말한다.** 타입 오류는 M1·M2·M4 가 AC 코드를 **넣는 순간** 난다 — 특히 실브라우저 겹 셋은 `page: any` 때문에 콜백 매개변수가 암묵적 `any` 가 되고(`TS7006`), 콜백 안의 DOM 조회는 널 가능이다(`TS18047`/`TS2531`). `acceptance.md` 의 AC 코드에는 그 타입 주석과 `!` 가 **이미 들어 있다** — 구현자는 그것을 지우지 말고 그대로 옮긴다. 지우면 `pretest` 를 통해 `npm test` 가 통째로 죽는다.

산출: 골격만 바뀌고 관측은 하나도 안 바뀐 상태. `npm test` 초록. 이 마일스톤은 새 기준을 하나도 통과시키지 않는다 — 뒤의 기준들이 **실행될 수 있게** 만들 뿐이다.

### M1 (우선순위 High) — 계약 개정과 메시지 표면 (C2)

가장 되돌리기 어려운 결정(§B.2·B.3)이 여기 있고, 나머지 셋은 이것에 의존하지 않는다. 먼저 못 박는다.

1. `server/test/web-chat.test.ts` 끝에 `describe('SPEC-WEBUI-001 메시지 표면')` 을 열고 AC-006~009 의 `it` 넷을 넣는다. **붉은 것을 확인한다.**
2. `web/app.js` `renderMessage` 를 고친다 — `span.msg-avatar` 생성, 아바타 색 키 함수, `span.bot-badge`, `.msg-time` 클래스 유지.
3. `web/app.js` 의 메시지 구조 계약 주석(`grep -n 'div.message.<author_type>' web/app.js`)을 `spec.md` §5.2 의 새 계약문으로 되쓴다(REQ-WEBUI-015).
4. `web/style.css` — `.message:not(.turn-cont)` 의 `border-top` 을 제자리에서 지우고, 새 규칙(그리드·아바타·배지·호버·이어짐 행)을 파일 끝 블록에 넣는다.
5. `spec.md` §5.3 표의 **모든** 자리(작성 시점 열 행)를 **전부 열어 보고** 결과를 적는다. 특히 `web-markdown.test.ts` 의 `.msg-body` 정규식.

5-b. `server/test/web-visual.test.ts` 에 AC-006 의 **뒤 겹**(장식 노드 렌더 폭)을 넣는다. M0 이 뽑은 `bootVisual()` 을 쓴다.

산출: AC-WEBUI-006(앞·뒤 겹)·007·008·009 통과. 형제 시험 회귀 없음. **뒤 겹을 실제로 돌린 출력**을 `progress.md` §E.2 에 남긴다 — 이 SPEC 에서 「시험은 초록인데 화면이 깨진」 상태를 잡는 유일한 관측이다.

### M2 (우선순위 High) — 방 목록과 계정 바 (C1 + C4)

둘 다 사이드바이고, 계정 바가 `#logout-btn` 을 옮기면서 사이드바 세로 레이아웃(`margin-top: auto`)을 건드리므로 한 마일스톤으로 묶는다.

1. `server/test/web-shell.test.ts` 끝에 AC-001·002·004·005·012 의 `it` 다섯을 넣는다. **붉은 것을 확인한다.**
2. `web/app.js` `renderRooms()` 를 고친다 — 이름 분해 함수, 세 span, 아이콘 `.archive-btn`(`aria-label` 포함).
3. `web/app.js` 의 방 목록 계약 주석(`grep -n 'room-item / .archive-btn' web/app.js`)을 `spec.md` §5.1 의 새 계약문으로 되쓴다.
4. `web/index.html` — 사이드바 맨 아래 `div.account-bar` 를 만들고 `#logout-btn` 을 **그 안으로 옮긴다**(새로 만들지 않는다). `#new-room-btn`·`#new-bot-btn` 의 글자 라벨을 SVG + `aria-label` 로 바꾼다.
5. `web/style.css` — `#logout-btn { margin-top: auto }` 를 제자리에서 지우고, 새 규칙을 끝 블록에 넣는다.
6. AC-003 을 **두 겹**으로 넣는다 — 앞 겹(CSS 정적)은 `web-shell.test.ts`, 뒤 겹(실브라우저, 실 API 로 방 둘 생성)은 `web-visual.test.ts` 의 `bootVisual()` 위에. 앞 겹은 브라우저가 없어도 돌아 C1 의 시각 계약이 무보증으로 남지 않게 한다.

산출: AC-WEBUI-001·002·003·004·005·012 통과.

계정 바의 **이름 칸은 이 마일스톤에서 비워 둔다** — 구조와 로그아웃 생존만 여기서 관측하고, 이름을 채우는 것은 M3 이다. 순수 프런트엔드 작업이라 서버를 기다릴 이유가 없어 순서를 이렇게 두었다.

[F17] **AC-WEBUI-012 는 이름 칸이 빈 상태로 통과한다.** 그 기준은 계정 바의 구조(`#sidebar` 마지막 자식, `#logout-btn` 이 그 안에 있음, `aria-label`, SVG)와 로그아웃 호출 한 번만 본다 — 이름 문자열을 보지 않는다. 스텁에 `'GET /api/auth/me'` 가 들어 있지만 M3 이전에는 `initApp()` 이 그것을 부르지 않으므로 그냥 쓰이지 않을 뿐이다. **구현자는 M3 을 기다리지 말고 M2 를 닫는다.**

### M3 (우선순위 High) — 이름의 출처: 라우트와 배선 (§4.5)

M2 가 만든 계정 바의 빈 이름 칸을 채운다. 서버를 건드리는 유일한 마일스톤이라 따로 세운다 — 프런트엔드 변경과 한 커밋에 섞이면 나중에 "서버는 무엇이 왜 바뀌었나"를 되짚을 때 diff 를 갈라 읽어야 한다.

1. `server/test/auth-name.test.ts` 끝에 AC-013 의 `describe` 를 넣는다. **붉은 것을 확인한다.** 그 파일의 기존 `build()` 가 이미 등록해 둔 시험 전용 `/api/me` 대역을 찌르지 않는다 — 경로는 `/api/auth/me` 이고 등록은 `registerAuthRoutes` 안에만 있어야 한다.
2. `server/src/auth.ts` `registerAuthRoutes` 에 `app.get('/api/auth/me', { preHandler: [requireAuth] }, async req => req.user)` 를 더한다. **`requireAuth` 는 한 글자도 고치지 않는다.**
3. `server/test/web-shell.test.ts` 에 AC-014 의 `it` 둘을 넣는다. **붉은 것을 확인한다.** 둘째 `it` 은 `/api/auth/me` 를 **일부러 스텁하지 않는다** — `login()` 본문에 호출이 들어가면 그 자리에서 던지게 하는 것이 목적이다.
4. `web/app.js` — `loadMe()` 를 만들고 export 한다. `initApp()` 첫 줄에서 `state.user = null` 을 초기화하고, 부트스트랩 사슬의 `showMain()` **앞**과 `#login-form` submit 핸들러의 `login()` 성공 뒤에서 부른다. `login()` 본문은 건드리지 않는다.
5. `web/index.html`·`web/style.css` — 계정 바의 이름·아바타 칸을 `state.user` 로 채우는 렌더를 잇는다(`.account-avatar` 클래스는 AC-014 가 관측한다).
6. **거짓이 된 계약 주석 둘을 되쓴다**(REQ-WEBUI-015 3·4번) — `server/src/auth.ts` 의 `@MX:NOTE`(작성 시점 20행, 「라우트는 login·logout 둘뿐」)와 `server/test/auth-name.test.ts` 의 같은 문장(작성 시점 126행). 어느 시험도 이것으로 붉어지지 않으므로(`:128` 단언은 `'regist'` 만 본다) **AC-016 의 grep 앵커가 유일한 관측이다.**

산출: AC-WEBUI-013·014 통과. `cd server && npm test` 로 보호 라우트 형제 시험(`rooms-bots`·`messages`·`permissions`·`sse`) 회귀 없음을 함께 확인한다 — `requireAuth` 를 읽기만 했다는 증거는 그 실행뿐이다.

### M4 (우선순위 Medium) — 작성기 (C3)

앞의 셋과 겹치는 파일이 있으나 겹치는 **규칙**이 없어 마지막에 둔다. 기계적 재배치가 대부분이다.

1. `server/test/web-chat.test.ts` 에 AC-010·011 의 `it` 셋을 넣는다(AC-010 은 `it` 둘). **붉은 것을 확인한다.**
2. `web/index.html` — `#composer` 안에 `#composer-box` 를 만들고 `#file-chosen`·`#attach-btn`·`#msg-input`·`#send-btn` 을 그 안으로 옮긴다. `#autocomplete` 은 `#composer` 직계로 **남긴다**. 📎 를 인라인 SVG 로 교체(`<label>` 유지).
3. `web/app.js` — `refreshSendState()` 를 만들고 `onComposerInput`·`renderPickedFiles`·`clearPickedFiles` 세 자리에서 부른다. 네트워크 호출은 더하지 않는다.
4. `web/style.css` — `#composer`·`#msg-input`·`#send-btn, #attach-btn`·`#file-chosen`·`.file-chip` 의 옛 규칙을 제자리에서 정리하고 새 규칙을 끝 블록에 넣는다. `SPEC-WEBACNAV-001` 블록(370~408행)은 **손대지 않는다**.

5. `server/test/web-visual.test.ts` 에 AC-010 의 **뒤 겹**(컨테이너 폭 ≈ footer 폭)을 넣는다.

산출: AC-WEBUI-010(앞·뒤 겹)·011 통과.

### M5 (우선순위 Medium) — 마감 검사

1. AC-WEBUI-015 의 아홉 관측을 실행하고 출력을 기록한다.
2. AC-WEBUI-016 의 아홉 관측을 실행하고 출력을 기록한다.
2-b. J3 을 Playwright 가 있는 환경에서 한 번 이상 돌린 출력을 기록한다. 돌리지 못했으면 Gap 으로 적는다.
3. `cd server && npm test` 와 `npm run typecheck` 가 종료 코드 0.

---

## §G 안티패턴 (하지 말 것)

| 하지 말 것 | 왜 |
|-----------|-----|
| `.archive-btn` 을 `display: none` 으로 감추기 | 키보드 접근성을 도로 뺏는다. 눈으로는 옳아 보이므로 CSS 정적 관측이 필요하다(AC-004) |
| 머리글·본문을 컨테이너로 감싸 아바타 붙이기 | 형제 구조 단언 둘이 0을 세어 붉어진다(§B.2) |
| `#send-btn` 에 `disabled` 속성 달기 | 탭 순서에서 빠져 이유를 읽을 대상이 사라진다(§B.4) |
| `#attach-btn` 을 `<button>` 으로 바꾸기 | 파일 선택창이 조용히 안 열린다 — 오류도 안 난다(REQ-WEBUI-010) |
| `#logout-btn` 을 지우고 새로 만들기 | 영속 id 가 깨지고 `initApp()` 의 핸들러가 허공에 걸린다 |
| `border-top: 0` 으로 덮어쓰기 | 지울 수 있는 것을 층으로 쌓지 않는다(§B.6) |
| 새 테스트 파일 만들기 | 같은 DOM 을 두 골격이 세우면 어긋날 때 어느 쪽이 옳은지 판정할 수단이 없다 |
| `web/design-tokens.css` 에 치수 토큰 추가 | §B.7 |
| 아트보드에 그려졌다는 이유로 동적 placeholder·보내기 화살표·보관 접기를 함께 넣기 | `spec.md` §6 이 명시적으로 뺐다 |
| 형제 SPEC 문서(`SPEC-WEBSHELL-001`·`SPEC-WEBCHAT-001`)를 직접 고치기 | 운영자 결정은 **이 SPEC 안에서 개정**이다. 형제 문서는 «그때 참» 으로 남는다 |
| `requireAuth` 의 시그니처·401 본문·`req.user` 모양을 고치기 | `@MX:REASON` 이 이미 경고한다 — 형제 SPEC 의 보호 라우트가 전부 깨진다 |
| 새 기준을 `auth-name.test.ts` 의 기존 `/api/me` 대역에 걸기 | 진짜 라우트를 지워도 초록으로 남는다 (AC-WEBUI-013 [HARD]) |
| `login()` 본문에 `loadMe()` 를 넣기 | §4.8 계약 6 이 동결한 아홉 함수다. 배선은 `initApp()` 안에 둔다 |
| 승인된 라우트를 빌미로 서버를 더 고치기 | 열린 범위는 `registerAuthRoutes` 안의 등록 한 곳뿐이다(§B.1) |
| `.message` 를 그리드로 만들되 넷째 이후 직계 자식을 배치하지 않기 | `web/rich.js` 의 첨부·권한 버튼이 40px 칸에서 뭉갠다. **형제 시험은 전부 초록으로 남는다** — 개수만 세기 때문이다 (감사 F5) |
| `#composer-box` 에 배경만 주고 grow 선언을 빼먹기 | 「폭을 그대로 쓴다」가 성립하지 않는데 배경 단언은 통과한다 (감사 F11) |
| `index.html` 에 `aria-disabled="true"` 만 박고 갱신 함수를 안 부르기 | 화면상 옳아 보이면서 상태와 표시가 영원히 어긋난다 (감사 F12) |
| `web-visual.test.ts` 의 기동 절차를 `it` 마다 복제하기 | 40여 줄이 네 벌이 된다. M0 이 `bootVisual()` 로 뽑는다 (감사 F4) |
| 되쓰기 대상 주석을 안 고치고 클래스 이름만 코드에 넣기 | 옛 AC-016 은 그것으로 전부 통과했다 — 「이름 없는 통과」 (감사 F7) |

---

## §H 상호 참조

- `spec.md` §1.1 — 승인된 디자인 캔버스와 자립성 규정
- `spec.md` §5 — 계약 개정 전문(폐기되는 원문 + 새 계약 + 형제 시험 대조표)
- `acceptance.md` — 수용 기준 16개와 판정 명령 넷
- `.moai/specs/SPEC-WEBSHELL-001/spec.md` §4.8 — 여섯 계약(이 SPEC 이 계약 4의 한 행을 개정한다)
- `.moai/specs/SPEC-WEBCHAT-001/spec.md` REQ-WEBCHAT-003 — 메시지 구조(이 SPEC 이 개정한다)
- `.moai/specs/SPEC-WEBACNAV-001/spec.md` — `#autocomplete` 소유(불변)
- `.moai/specs/SPEC-WEBRICH-001/spec.md` — 리치 표면 소유(불변)
- `web/design-tokens.css` — 시각 토큰(불변)
