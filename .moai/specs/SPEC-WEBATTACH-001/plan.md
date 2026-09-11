# SPEC-WEBATTACH-001 — 실행 계획 (Tier M)

> 0.2.0 — 계획 감사(`.moai/reports/plan-audit/SPEC-WEBATTACH-001-2026-09-11.md`, FAIL 0.71) 반영. 이 문서에서 바뀐 것은 넷이다: **B-2** 가 세운 「`URL.createObjectURL` 이 없어 모듈이 터진다」는 전제를 철회했고(시험 환경에는 **있다** — `spec.md` §1.1 실측), **B-5** 의 완화책이 실패 모드를 막지 못한다는 것을 실측으로 확인해 다시 썼으며, **§A.7** 이 PRESERVE 경로 집합을 한 줄로 못박아 `acceptance.md` 와 갈라지지 않게 했고, **§C** 의 기준선 측정을 다섯 어간으로 넓혔다.

## §A Context

### A.1 배경 요약

작성기에 붙여넣기·끌어놓기 처리가 전혀 없다(실측: `grep -nE "paste|drop|dragover|clipboard|DataTransfer" web/*.js` → 무관한 1건뿐). 이 계획은 **앱 한 파일·스타일 한 블록·시험 한 파일**로 세 가지를 더한다: 붙여넣기 편입, 영역 드롭 편입, 이미지 썸네일. 전송·서버·보낸 뒤 표시는 이미 작동하므로 손대지 않는다.

### A.2 Tier 판정 — M (근거)

| 축 | 실측 | 가리키는 Tier |
|----|------|---------------|
| 파일 수 | 3 (`web/app.js`, `web/style.css`, `server/test/web-chat.test.ts`) | S (<5) |
| LOC 추정 | 구현 약 140~180 + 시험 약 200~260 = 약 340~440 | **M** (300~1000) |
| 요구사항 수 | 15 | **M** — Tier S 상한 8 초과 |
| 수용 기준 수 | 13 (기계) | **M** — Tier S 상한 8 초과 |

**판정 M.** 파일 수만 보면 S 지만 REQ/AC 예산이 S 의 8/8 상한을 넘는다. `spec-workflow.md` § SPEC Complexity Tier 는 예산 초과를 「상한을 완화할 신호가 아니라 Tier 를 올리거나 SPEC 을 쪼갤 신호」로 규정한다. 쪼개기(붙여넣기 / 끌어놓기 / 썸네일 셋으로)는 **기각**한다 — 셋이 같은 공용 편입 경로와 같은 `renderPickedFiles()` 를 공유해서, 따로 내면 같은 함수를 세 SPEC 이 연달아 고치는 충돌 표면이 된다. 그래서 M 으로 올리고 산출물 셋(spec/plan/acceptance)을 낸다.

### A.3 검토할 결정 — D6 영역 밖 드롭 (가장 뒤집히기 쉬운 결정)

셋을 비교했다:

| 안 | 영역 밖에 파일을 떨구면 | 판정 |
|----|-------------------------|------|
| 아무것도 안 한다 (가드 없음) | 브라우저가 그 파일로 **페이지를 이동** — 쓰던 본문·메시지 목록·SSE 연결이 사라진다 | 기각: 조용하고 값비싼 사고. 오늘의 상태이기도 하다 |
| 어디에 떨궈도 받는다 | 사고는 막히나 D1(드롭 범위=입력창 주변)을 뒤집는다 | 기각: 운영자 결정 침범 |
| **밖은 기본 동작만 막고 받지는 않는다** — 채택 | 아무 일도 일어나지 않는다. 본문이 살아 있다 | D1 을 지키면서 사고만 없앤다 |

채택안의 비용은 한 가지다 — 「떨궜는데 아무 반응이 없다」가 사용자에게는 고장으로 보일 수 있다. 그러나 그 대안이 「본문이 통째로 날아간다」이므로 비교 대상이 아니다. 파일이 아닌 끌기는 가드가 손대지 않으므로(REQ-WEBATT-009) 글자 끌어놓기 같은 멀쩡한 기본 동작은 살아 있다.

### A.4 검토할 결정 — D7 붙여넣기의 중복 제거 (두 번째로 뒤집히기 쉬움)

`isSameFile()`(이름·크기·`lastModified`)을 붙여넣기에도 적용하면, 같은 밀리초에 두 번 붙인 같은 캡쳐가 **조용히 하나로 줄어든다.** 운영자 결정 D2 가 「같은 초에 여러 번 붙여도 조용히 겹치면 안 된다」고 못박은 지점이 정확히 이곳이다. 그래서 붙여넣기는 중복 제거를 건너뛰고 항상 잇되, **이름 충돌만 `-2`/`-3` 접미로 푼다.** 고르기 경로의 중복 제거는 한 글자도 바뀌지 않는다(REQ-WEBATT-014).

### A.5 검토할 결정 — D8 썸네일 자격과 코드 재사용

`isImageFilename` 은 **이미 `web/rich.js` 가 export** 하고 `web/rich.d.ts` 가 선언하며, `web/app.js` 는 944행에서 이미 `./rich.js` 에서 다섯 이름을 import 하고 있다. 판정 함수를 새로 쓰지 않고 **그 import 목록에 이름 하나를 더한다.** `rich.js` 의 export 집합은 그대로이므로 형제 SPEC 의 계약을 건드리지 않는다. 자격은 `file.type.startsWith('image/') || isImageFilename(file.name)` — 합집합인 이유는 `spec.md` §1.3 D8 이 갖는다.

### A.6 파일 목록 (3개)

| 파일 | 변경 |
|------|------|
| `web/app.js` | 공용 편입 경로 추출 + `paste`/`dragenter`/`dragover`/`dragleave`/`drop` 청취자(`chatReady` 블록) + 문서 가드 + `renderPickedFiles()` 의 썸네일 분기 + 객체 URL 맵. `./rich.js` import 에 `isImageFilename` 추가 |
| `web/style.css` | 파일 끝에 `/* SPEC-WEBATTACH-001 */` 구획(사람이 읽는 표지) 신설 — 그 안에 세 규칙: `.file-chip-image`(칩 모양), `.file-chip-thumb`(약 56px 정사각 + `opacity: 1` 로 `#file-chosen` 의 `0.8` 상속 되돌리기), `#composer-box.drop-target`(드롭 표시). **관측은 주석 표지가 아니라 이 셋의 셀렉터로 한다** — `cssRuleBlock` 이 주석을 먼저 벗기기 때문이다(`server/test/css-rule.ts:15`). 〔0.2.1 — N4〕 **세 규칙은 각각 «단독 규칙» 으로 쓴다 — 쉼표로 묶으면 `cssRuleBlock` 이 잡지 못한다.** 그 헬퍼는 「셀렉터 다음에 여백 + `{`」만 받으며(`css-rule.ts:8-9`), 이는 접두가 겹치는 셀렉터를 걸러내기 위한 의도된 성질이다. `#composer-box.drop-target,\n#composer-box.drop-target * { … }` 처럼 쓰면 단언이 **영원히 실패**한다(2회차 감사 실측 `P4 comma-form=FAILED`) |
| `server/test/web-chat.test.ts` | §A 헬퍼 셋 + `AC-WEBATT-001`~`013` describe 블록 추가 (기존 블록 무변경) |

### A.7 PRESERVE 목록 (한 줄도 고치지 않는다)

- `server/src/` 전체 — 특히 `routes-messages.ts`(100MB 상한·`basename()` 봉인·MIME 표는 읽기만)
- `web/rich.js`, `web/rich.d.ts` — `isImageFilename` 을 소비만 한다
- `web/markdown.js`, `web/markdown.d.ts`, `web/design-tokens.css`
- `web/index.html` — 드롭 영역은 이미 있는 `#composer-box` 이고 표시는 클래스 토글이므로 마크업 변경이 없다
- `web/app.js` 의 `sendMessage()`, `isSameFile()`, `refreshSendState()`, `clearPickedFiles()` 의 **의미** — 편입 경로 추출 외에 동작을 바꾸지 않는다
- `server/test/` 의 기존 describe 블록 전부와 그 밖의 모든 시험 파일

**[HARD] PRESERVE 경로 집합 (정본).** 아래 한 줄이 `acceptance.md` AC-WEBATT-013 의 `git diff --stat` 과 `git log --oneline` 두 명령에 **그대로** 들어간다. 두 문서가 서로 다른 집합을 쓰면 어느 쪽도 전체를 덮지 못한다.

```
server/src web/rich.js web/rich.d.ts web/markdown.js web/markdown.d.ts web/design-tokens.css web/index.html
```

## §B Known Issues (Tier M 필터)

- **B-1 jsdom 이 세 생성자를 안 준다** — `ClipboardEvent`/`DataTransfer`/`DragEvent` 전부 `undefined`(실측). 구현이 `instanceof DragEvent` 같은 판정을 쓰면 시험에서 영원히 거짓이 된다. **타입 판정을 쓰지 말고 `ev.clipboardData`/`ev.dataTransfer` 의 존재와 모양만 읽는다.**
- **B-2 `URL.createObjectURL` 은 이 시험 환경에 «있다» 〔0.2.0 정정〕** — 0.1.0 은 「부재라서 심지 않은 시험이 이미지를 넣는 순간 모듈이 터진다」고 적었는데 **전제가 틀렸다.** 시험이 실제로 도는 vitest jsdom 환경(jsdom 29.1.1 / Node v24.12.0)에서 두 함수는 `function` 이고 실제로 불러도 `blob:nodedata:…` 를 돌려준다(`spec.md` §1.1 실측). 0.1.0 이 잰 것은 맨 `new JSDOM()` 창이고 시험은 거기서 돌지 않는다. 여기서 따라 나오는 것은 셋이다. ① 호출 **횟수**를 세려면 시험이 반드시 `vi.fn()` 으로 덮어써야 한다 — 안 덮으면 진짜가 불려 `create` 계수가 0 이다(AC-011). ② 덮어썼으면 **되돌려야** 한다 — 전역이라 안 되돌리면 같은 파일의 뒤따르는 55개 `loadApp` 시험이 오염된다. ③ REQ-WEBATT-012 의 가드는 **유지한다.** 근거는 「jsdom 에 없다」가 아니라 「`renderPickedFiles()` 안에서 던진 예외 하나가 첨부 목록 표시 전체를 무너뜨린다」이며, AC-012 는 그 상황을 **명시적으로 지워서** 만든다.
- **B-2b 0.1.0 이 이 전제 위에 세운 잘못된 압력** — 「심지 않으면 터진다」를 믿고 AC-012 의 Given 을 「지운 상태(기본값)」로 적으면, 구현이 옳게 썸네일을 그리는 순간 그 기준이 붉어지고 구현자는 **이미지에 썸네일을 안 그리는** 반대 방향으로 끌려간다. 기준이 구현을 반대로 모는 모양이다 — 0.2.0 에서 제거했다.
- **B-3 객체 URL 을 그릴 때마다 만들면 샌다** — `renderPickedFiles()` 는 변화마다 목록 전체를 다시 그린다. 파일→URL `Map` 으로 한 번만 만들고, ✕ 와 `clearPickedFiles()` 두 자리에서 회수한다. 회수 자리를 하나만 두면 나머지 하나가 샌다.
- **B-4 `dragleave` 는 자식마다 발화한다** — 깊이 세기 없이 `dragleave` 에서 바로 표시를 끄면, 끌기가 `#msg-input` 위를 지날 때마다 깜빡인다. 카운터는 `drop` 에서 0 으로 강제 초기화해야 한다(떨구면 `dragleave` 가 오지 않는 경로가 있다).
- **B-5 문서 청취자는 `chatReady` 안에 걸어도 쌓인다 〔0.2.0 정정〕** — 0.1.0 의 완화책(「문서 가드도 `chatReady` 블록 안에서 건다」)은 이 하네스에서 **실패 모드를 막지 못한다.** 실측한 두 사실이 그 이유다(`spec.md` §1.1): ① `document.body.innerHTML = …`(`web-chat.test.ts:96`)는 `body` 안쪽만 갈아끼우고 `document` 노드는 그대로다. ② `vi.resetModules()`(`:98`) 뒤 새로 적재된 모듈은 `chatReady = false`(`app.js:434`)로 시작한다. 둘을 합치면 **문서 수준 청취자는 `chatReady` 가드 안에 두어도 `loadApp` 마다 하나씩 쌓인다** — 이 파일의 `await loadApp(` 은 55회다. 탐침으로 직접 쟀다: loadApp 을 두 번 흉내내고 `drop` 을 한 번 발화시키니 모듈 플래그로만 가드한 청취자는 **2회** 발화했고, 문서에 남는 표지로 가드한 청취자는 **1회**만 발화했다.
  **그래서 요구하는 성질과 그 기제:** 문서 가드는 `document.documentElement.dataset.webattachGuard` 를 보고 두 번째 배선을 스스로 거른다(D10 / REQ-WEBATT-014). 요소 수준 청취자(`#msg-input` 의 `paste`, `#composer-box` 의 네 끌기 이벤트)는 `chatReady` 블록 그대로 두어도 안전하다 — 그 요소들은 body 교체로 매번 새로 만들어지므로 쌓일 대상이 없다.
  **관측 수단:** jsdom 에 청취자 개수를 읽는 수단이 없으므로, 두 번째 적재 직전에 `document.addEventListener` 를 감싸 **등록 호출 자체를 센다**(`acceptance.md` §A `countDocListeners`). 이 수법이 이 환경에서 실제로 잡힌다는 것은 탐침으로 확인했다. 원문 문자열 세기는 보조로만 남긴다 — 한 번 적힌 호출이 런타임에 몇 번 도는지는 세어지지 않는다.
- **B-6 텍스트 파트는 정확히 하나** — 서버는 파일이 아닌 파트를 전부 `body` 로 이어 붙인다. 붙여넣기·드롭 경로가 `FormData` 를 만지지 않으므로 지켜지지만, 전송 경로에 손대는 유혹이 생기면 이 불변이 깨진다.
- **B-7 파일명 XSS 경계** — 파일명은 사용자가 고르는 값이다. 썸네일 분기가 `alt`·`title`·`aria-label` 을 새로 채우므로 경계 면적이 늘어난다. 전부 대입·`textContent`·`append` 로만 채운다.
- **B-8 `git add` 는 명시 경로로만** — 작업 나무에 무관한 untracked 파일이 많다(`.moai/logs/`, `.moai/state/`, 세션 보고서). `git add -A` 금지.

## §C Pre-flight (구현 시작 전 실행)

첫 줄이 찍는 SHA 가 **pre-flight HEAD** — AC-WEBATT-013 의 모든 diff/log 비교가 도는 기준선이다. 이 SHA 를 §E 보고에 그대로 인용한다(VCI baseline-attribution). 작업 나무 대 HEAD 비교만으로는 **이미 커밋된** PRESERVE 위반을 못 잡으므로 기준선을 이렇게 명명한다.

```bash
git branch --show-current && git rev-parse HEAD   # ← 이 SHA 를 pre-flight HEAD 로 §E 에 기록
npm run typecheck -w server                        # 베이스라인 녹색 확인
npx vitest run server/test/web-chat.test.ts        # 기존 블록 전부 녹색 확인
grep -cE "paste|dragover|dragenter|dragleave|createObjectURL" web/app.js   # 0 — 중복 구현 부재 확인
# AC-WEBATT-005 기준선 — 다섯 어간 전부 0 이어야 한다 (0.2.0: 둘에서 다섯으로 넓혔다. 실측으로 전부 0 확인)
for p in navigator.platform navigator.userAgent navigator.vendor metaKey ctrlKey; do \
  printf "%-22s %s\n" "$p" "$(grep -c -- "$p" web/app.js)"; done
```

**시험 환경 사실 (0.2.0 — 반대로 적혀 있던 것)**: 이 환경에는 `URL.createObjectURL`·`revokeObjectURL` 이 **있다.** 「없어서 터진다」를 전제로 한 구현·기준을 쓰지 않는다. 확인하려면 `server/test/` 에 `// @vitest-environment jsdom` 도크블록을 단 한 줄짜리 탐침을 두고 `npx vitest run` 한 뒤 **지운다**(`git status --short server/test/` 로 잔여 0 확인).

## §D Constraints

- §A.7 PRESERVE 목록의 파일은 무변경. `git add` 는 명시적 경로로만(`web/app.js web/style.css server/test/web-chat.test.ts .moai/specs/SPEC-WEBATTACH-001`).
- 새 클라이언트 상한 금지(D4). 새 디자인 토큰·16진수 색 리터럴 금지.
- 마크업 조립 API 금지 — 노드는 `createElement` + `className`/`textContent`/`alt` 로만.
- 커밋 주제: `feat(SPEC-WEBATTACH-001): M{N} …`. `--no-verify` 금지.

## §E Self-Verification (manager-develop 보고 서약)

AC-WEBATT-001~013 의 이분 PASS/FAIL 표. 각 행에 (a) 실행 명령 (b) 관측된 출력 (c) HEAD SHA 귀속 세 쌍을 VCI 5단 형식으로 붙인다. 판정 명령:

```bash
npx vitest run server/test/web-chat.test.ts
npm run typecheck -w server
npm test
# §A.7 의 PRESERVE 경로 집합 정본을 두 명령이 «같이» 쓴다 (0.2.0 — 두 문서가 갈라져 있던 것을 통일)
PRESERVE="server/src web/rich.js web/rich.d.ts web/markdown.js web/markdown.d.ts web/design-tokens.css web/index.html"
git diff --stat -- $PRESERVE                          # 0줄이어야 함
git log --oneline <pre-flight HEAD>..HEAD -- $PRESERVE # 무출력이어야 함
```

TDD 이므로 RED 실패 출력(구현 전)을 그대로 보여야 한다(E8). `acceptance.md` §C 의 HO-1~HO-3 은 사람 관측 항목이므로, 관측하지 않았으면 **「미검증」으로 적고 PASS 로 적지 않는다**(VCI §3.4 Gaps). **[HARD] HO-1 은 차단 관문이다** — `acceptance.md` §D.2 가 주체(운영자)·시점(run 종료 후 sync 진입 전)·관계(미검증이면 `status: completed` 에 이르지 못한다)를 표로 적는다. HO-2·HO-3 은 미검증이어도 막지 않되 잔여 위험으로 함께 올린다.

## §F Milestones (3개 — 뒤집히기 쉬운 결정부터)

- **M1 편입 경로와 붙여넣기 (D7·D2 가 사는 곳)** — RED: §A 헬퍼 + AC-WEBATT-001~005 추가 후 실패 확인 → 공용 편입 경로 추출(기존 `onFilePicked` 이 그것을 부르도록 고치되 의미 무변경) + `#msg-input` `paste` 청취자 + 시각 이름 생성 + 이름 충돌 접미 → GREEN. 파일: `web/app.js`, 시험 파일.
- **M2 끌어놓기와 문서 가드 (D6·D10 이 사는 곳)** — RED: AC-WEBATT-006~009 → `#composer-box` 의 `dragenter`/`dragover`/`dragleave`/`drop`(전부 **파일 끌기일 때만** 반응) + 깊이 카운터 + `drop-target` 토글 + 문서 수준 가드(밖의 `dragenter`·`dragover`·`drop` **셋 다** 막는다) + `document.documentElement.dataset.webattachGuard` 1회성 표지 + `style.css` `#composer-box.drop-target` 규칙 → GREEN.
- **M3 썸네일과 회귀 (D8·D9·B-3 가 사는 곳)** — RED: AC-WEBATT-010~013 → `renderPickedFiles()` 썸네일 분기(`span.file-chip-image` > `img.file-chip-thumb` + `.file-chip-remove`, `.file-chip` 은 달지 않는다) + 파일→객체 URL `Map` + **두 자리 회수(✕ / `clearPickedFiles()`)이고 전송 실패 경로에서는 회수하지 않는다** + `typeof` 가드 + `style.css` 썸네일 규칙(`opacity: 1` 포함) → GREEN. 이어서 PRESERVE diff 0줄 + `npm test` 전체 초록 + typecheck 0 + HO-1~HO-3 관측(또는 미검증 기록; HO-1 은 sync 진입 전 차단 관문).

## §G Anti-Patterns

- `instanceof DragEvent` / `instanceof ClipboardEvent` 로 판정하기 — jsdom 에 생성자가 없어 영원히 거짓이 된다(B-1).
- `renderPickedFiles()` 안에서 그릴 때마다 `createObjectURL` 부르기 — 그린 횟수만큼 샌다(B-3).
- 문서 가드가 영역 밖 드롭의 파일을 **받아** 목록에 넣기 — D1 을 뒤집는다.
- 붙여넣기에 `isSameFile()` 중복 제거를 그대로 적용하기 — D2 가 금지한 「조용한 겹침」이다(D7).
- 「제한을 하나쯤 두는 게 안전하지 않나」 — D4 가 닫은 결정이다. 새 상한도 그 시험도 만들지 않는다.
- 기존 `.file-chip` 규칙이나 `chipNames()` 가 읽는 모양을 바꿔 통과시키기 — REQ-WEBATT-014 위반이자 설계 오류 신호.
- 서버에 「이미지 전용 엔드포인트」를 더하기 — 서버는 이미 받는다(§A.1).
- 문서 가드를 모듈 수준 플래그(`chatReady`)로만 막기 — 모듈이 다시 적재되면 초기화되어 쌓인다(B-5 실측).
- 영역 밖 드롭을 `drop` 에만 `preventDefault` 하기 — `dragover` 를 막지 않으면 그 `drop` 이 애초에 발화하지 않아 막으려던 사고가 그대로 난다(REQ-WEBATT-008).
- 썸네일 칩에 `.file-chip` 을 함께 달기 — 기존 `chipNames()` 가 이미지 항목을 빈 이름으로 읽어 그 헬퍼의 의미가 조용히 바뀐다(D9).
- CSS 관측을 `/* SPEC-WEBATTACH-001 */` **주석 표지**로 하기 — `cssRuleBlock` 이 주석을 먼저 벗기므로 영원히 실패한다(`server/test/css-rule.ts:15`).
- 세 CSS 규칙을 **쉼표로 묶어** 쓰기 — 셀렉터 바로 뒤에 `{` 가 오지 않아 `cssRuleBlock` 이 잡지 못한다(N4, §A.6).
- 자기 SPEC 의 pre-flight HEAD 를 **영구 시험 파일에 상수로 박아** 그 기준선 이후 특정 경로에 커밋이 없음을 단언하기 — run 단계에서만 참인 명제가 영구 회귀 시험이 되어, 뒤따르는 어떤 SPEC 이 그 경로를 정당하게 고쳐도 붉어진다. 기준선 비교는 **§E 보고의 명령**으로 남기고 시험 파일에는 두지 않는다(이 SPEC 의 AC-WEBATT-013 두 git 불릿이 그 자리다).

## §H Cross-References

- 요구사항 전문: `.moai/specs/SPEC-WEBATTACH-001/spec.md` §3 · 수용 기준 전문: 같은 디렉터리 `acceptance.md`
- 첨부 목록 소유자: `SPEC-WEBCHAT-001` (`pickedFiles` 단일 출처, `chatReady` 1회 배선)
- `aria-disabled` 계약·작성기 레이아웃: `SPEC-WEBUI-001` (REQ-WEBUI-009·011)
- `isImageFilename` 소유자: `SPEC-WEBRICH-001` (`web/rich.js`, `web/rich.d.ts`)
- 서버 멀티파트 계약: `SPEC-MSG-001` (`server/src/routes-messages.ts`)
