# SPEC-WEBUI-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**다. 판정은 이분법이다. `development_mode` 가 `tdd` 이므로 열여섯 기준은 전부 구현보다 먼저 쓰이고, 먼저 붉어지는 것이 확인된 뒤에 푸르러진다.

## 판정 명령

| # | 명령 | 어떤 기준이 쓰나 |
|---|------|-----------------|
| J1 | `cd server && npx vitest run test/web-shell.test.ts` | AC-001·002·003(전반)·004·005·012·014 |
| J2 | `cd server && npx vitest run test/web-chat.test.ts` | AC-006(전반)·007·008·009·010(전반)·011 |
| J3 | `cd server && npx vitest run test/web-visual.test.ts` | AC-003(후반)·006(후반)·010(후반) |
| J4 | `cd server && npm test` + bash | AC-015·016 |
| J5 | `cd server && npx vitest run test/auth-name.test.ts` | AC-013 |

새 `it` 은 전부 기존 파일 끝의 `describe('SPEC-WEBUI-001 …')` 블록 안에 들어간다. 새 테스트 **파일**은 만들지 않는다 — 같은 DOM 을 두 골격이 세우면 둘이 어긋나는 순간 어느 쪽이 옳은지 판정할 수단이 없어진다.

### [HARD] 파일마다 쓸 수 있는 헬퍼가 다르다

두 시험 파일은 서로를 import 하지 않는다. **한쪽 헬퍼를 다른 쪽에서 부르면 `npm run typecheck` 가 `TS2304` 로 죽는다** — `server/tsconfig.json` 이 `test` 를 include 하기 때문이다. 아래는 실측한 파일 스코프 헬퍼 목록이며, 이 표 밖의 이름을 쓰려면 그 파일 안에 **지역 정의**해야 한다.

| 파일 | 쓸 수 있는 것 (실측) | 없는 것 — 부르면 죽는다 |
|------|---------------------|------------------------|
| `web-shell.test.ts` | `loadDom` · `stubFetch` · `loadApp` · `cssRuleBlock` · `REQUIRED_IDS` | **`flush` 없음** · `baseHandler` 없음 · `$$`/`el`/`type` 없음 · `msg` 없음 |
| `web-chat.test.ts` | `FakeEventSource` · `installFetch` · `flush` · `loadApp(handler)` · `$$` · `el` · `input` · `type` · `pressEnter` · `pressKey` · `msg` · `baseHandler` · `pickFiles` | **`loadDom` 없음** · `stubFetch` 없음 · `cssRuleBlock` 없음 |
| `web-visual.test.ts` | `loadPlaywrightCandidates` · `playwrightCandidates` · `skipReason` | 재사용 가능한 기동 헬퍼 **없음** — 서버 기동·로그인 절차가 유일한 `it` 안에 인라인돼 있다 |
| `auth-name.test.ts` | `build` · `login` · `setCookieOf` · `userCount` · `db`·`dir` | — |

[N6] **이 표에는 행 번호를 적지 않는다.** 이 저장소의 `completed-spec-semantics.md` 가 「Line-anchor tables are PROHIBITED … Locate citations by grep anchor, not by line arithmetic」를 못 박고 있고, 실제로 초판의 다섯 인용이 1~2 줄씩 어긋나 있었다(편집으로 밀린 것이다). 자리를 확인해야 하면 이름으로 찾는다:

```bash
grep -n 'function loadDom\|function stubFetch\|async function loadApp\|function cssRuleBlock\|const REQUIRED_IDS' server/test/web-shell.test.ts
grep -n 'const flush\|async function loadApp\|function baseHandler\|function pickFiles' server/test/web-chat.test.ts
grep -n 'function loadPlaywrightCandidates\|let skipReason' server/test/web-visual.test.ts
grep -n 'async function build\|const login\|function setCookieOf' server/test/auth-name.test.ts
```

두 파일이 각자 지역 정의해야 하는 것:

```ts
// web-chat.test.ts — 이 파일에는 loadDom 이 없다. index.html 본문을 세우는 일은
// loadApp() 이 이미 한다(`loadApp` 이 `document.body.innerHTML` 을 index.html 본문으로 채운다). 문서 구조만 볼 때는 loadApp 을 부르고 document 를 그대로 읽는다.
//   const app = await loadApp(baseHandler())   // document.body 가 index.html 본문으로 채워진다
//   const doc = document
```

```ts
// web-shell.test.ts — 이 파일에는 flush 가 없다. 마이크로태스크 한 바퀴를 도는 최소 정의를
// SPEC-WEBUI-001 블록 안에 둔다 (`web-chat.test.ts` 의 `const flush` 와 같은 형태).
const flush = () => new Promise(r => setTimeout(r, 0))
```

### [HARD] CSS 정적 관측은 기존 `cssRuleBlock` 을 쓴다 — 새 헬퍼를 만들지 않는다

`server/test/web-shell.test.ts` 의 `cssRuleBlock(css, selector)`(`grep -n 'function cssRuleBlock'`)가 이미 이 일을 하고, 직접 쓴 정규식이 놓치는 함정 셋을 이미 막아 두었다.

| `cssRuleBlock` 이 하는 것 | 왜 필요한가 |
|---|---|
| **원문 그대로의 선택자**를 부분 문자열로 찾는다 (정규식 아님) | 호출부가 이스케이프할 것이 없다. `cssRuleBlock(css, '.room-name')` — 역슬래시를 넣지 않는다 |
| 찾기 전에 **CSS 주석을 벗긴다** | 그 파일의 주석이 이유를 적어 두었다: 규칙 설명 주석이 선택자 문법을 인용하면 주석 속 문자열이 진짜 규칙보다 먼저 잡힌다(실제로 한 번 물렸다) |
| **중괄호 깊이를 세어** 짝을 맞춘다 | `[^}]*` 는 미디어쿼리 안의 규칙을 잡지 못한다 |
| 선택자 뒤에 여백+`{` 가 바로 오는 자리만 고른다 | `#auth-view` 가 `#auth-view form` 을 잡지 않는다 |

[HARD] **호출부는 이스케이프하지 않은 원문 선택자를 넘긴다.** `cssRuleBlock(css, '.room-item.active')` 이지 `'\.room-item\.active'` 가 아니다. 양쪽이 다 이스케이프하면 패턴이 「리터럴 역슬래시 다음에 점」을 요구하게 되어 **올바른 CSS 에서 언제나 실패한다.**

run 단계는 이 함수를 `server/test/css-rule.ts` 로 옮겨 `export` 하고, `web-shell.test.ts` 의 기존 호출 세 자리(`grep -n 'cssRuleBlock(css' server/test/web-shell.test.ts`)를 import 로 바꾼다. 시그니처는 그대로이므로 그 세 단언의 의미는 바뀌지 않는다 — 옮겼다는 증거는 `npm test` 가 여전히 초록인 것이다. 복사본을 만들지 않는 이유는 위 세 함정을 한쪽에서만 고치는 상황을 애초에 만들지 않기 위해서다.

```ts
// server/test/css-rule.ts — 옮겨 담을 모듈
// [HARD] cssRuleBlock 본문이 expect(at, …).toBeGreaterThanOrEqual(0) 로 vitest 의 expect 를 쓴다.
//        옮길 때 이 import 를 함께 가져가지 않으면 TS2304: Cannot find name 'expect' 로 M0 자체가 실패한다.
import { expect } from 'vitest'
export function cssRuleBlock(css: string, selector: string): string { /* 본문 그대로 */ }
```

```ts
// 두 시험 파일 모두 이렇게 쓴다
import { cssRuleBlock } from './css-rule.js'
const css = () => readFileSync(join(webDir, 'style.css'), 'utf8')
const rule = (sel: string) => cssRuleBlock(css(), sel)   // 편의 별칭 — 이스케이프 없음
```

[HARD] **`cssRuleBlock` 은 «첫 매치» 를 돌려준다** (`at = i; break`). 마지막 매치가 아니다. 따라서 **이미 `web/style.css` 에 있는 선택자에 선언을 더할 때는 그 규칙을 제자리에서 고쳐야 한다** — 끝 블록에 같은 선택자를 다시 쓰면 이 헬퍼가 옛 블록을 읽고, 올바른 구현이 「선언이 없다」로 떨어진다. 편집 방식은 `plan.md` §B.6 이 규범으로 정하고, AC-WEBUI-015 (4) 가 그것을 기계적으로 관측한다.

이 SPEC 의 기준이 관측하는 선택자 가운데 `style.css` 에 **이미 있는** 것은 실측으로 **일곱**이다 — `.room-item`(규칙 블록 2개: 자기 자신과 `#archived-list .room-item`)·`.room-item.active`·`.archive-btn`·`.message:not(.turn-cont)`·`#msg-input`·`#autocomplete`·`.ac-kind.to`. 일곱 모두 **첫 매치가 곧 관측 대상**이지만 이유는 둘로 갈린다.

- **다섯은 이 SPEC 이 고치는 자리이며, `plan.md` §B.6 이 그것을 «제자리 편집» 으로 못 박기 때문에** 첫 매치가 곧 고쳐진 블록이다 — `.room-item`·`.room-item.active`·`.archive-btn`·`#msg-input` 은 선언을 **더하고**(§B.6 2행), `.message:not(.turn-cont)` 는 `border-top` 을 **지운다**(§B.6 3행).
- **둘은 이 SPEC 이 손대지 않는 자리라서** 첫 매치가 그대로 관측 대상이다 — `#autocomplete`·`.ac-kind.to`(`SPEC-WEBACNAV-001` 소유, REQ-WEBUI-009 이 불변을 요구한다).

즉 «바꾸지 않아서 안전한 것» 은 뒤의 둘뿐이고, 앞의 다섯이 안전한 이유는 **끝 블록에 다시 쓰지 않기 때문**이다. 끝 블록에 재정의하면 다섯 전부가 옛 블록을 읽는다.

### [HARD] 실브라우저 기준은 기동 절차를 공유한다

`web-visual.test.ts` 의 서버 기동·chromium 기동·로그인 절차는 지금 유일한 `it` 안에 인라인돼 있다(그 파일의 유일한 `it` 안). 새 `it` 셋이 그것을 복제하면 40여 줄이 네 벌이 된다. run 단계는 그 절차를 같은 파일 안의 헬퍼 하나로 뽑는다:

```ts
// 임시 데이터 디렉터리 + 포트 0 서버, chromium, 로그인, #main-view 대기까지.
// 돌려주는 dispose() 는 browser·app·디렉터리를 기존 finally 절과 같은 순서로 정리한다.
async function bootVisual(): Promise<{ page: any; base: string; dispose: () => Promise<void> }>
```

기존 `it` 도 이 헬퍼를 쓰도록 바꾼다 — 그 `it` 의 단언 넷(`authBox` null, `mainBox` 존재·폭·높이)은 한 글자도 바뀌지 않는다. Playwright 부재 시 `skip` 규약(`skipReason` 확인 + 표준 오류 한 줄)은 그대로다.

[HARD] **`page` 가 `any` 이므로 `page.evaluate(cb)`·`page.$$eval(sel, cb)` 에 넘기는 콜백의 매개변수는 문맥 타입을 받지 못한다** — `server/tsconfig.json` 의 `strict: true` 아래에서 `TS7006: implicitly has an 'any' type` 이 난다. 기존 `it` 이 이 문제를 겪지 않는 이유는 콜백을 **하나도 넘기지 않기** 때문이다(전부 `page.locator(...)` 형태). 새 겹 셋은 넘기므로:

- 콜백 매개변수에 타입을 명시한다 — `(name: string) =>`, `(els: Element[]) =>`, `(e: Element) =>`
- 콜백 **안**의 `document.querySelector(...)`·`getElementById(...)` 반환은 `!` 로 널을 좁힌다 (`TS18047`/`TS2531`)

`pretest` 가 `npm run typecheck` 를 돌리므로, 이 둘을 빠뜨리면 **`npm test` 자체가 죽는다** — 기준 하나가 아니라 판정 명령 전체가 무너진다.

## 이 문서가 지키려는 것 — 빈 구현과 «전부 막기» 구현이 둘 다 떨어지게

형제 `SPEC-WEBCHAT-001/acceptance.md` 가 세운 부류 넷(존재만 보기·이름 없는 통과·부재 보기·깨진 구현과 양립)을 열여섯 기준에 그대로 적용했다. 이 SPEC 에서 특히 가까운 세 형태:

| 잘못된 구현 | 통과할 뻔한 기준 | 막는 관측 |
|-------------|-----------------|-----------|
| 보관 버튼을 `display: none` 으로 감춘다(호버 시 보이므로 눈으로는 옳아 보인다) | AC-004 전반(호버 시 보임) | AC-004 후반 — CSS 정적으로 `display: none`·`visibility: hidden` 부재를 보고, `:focus-visible` 규칙 존재를 본다 |
| 아바타 색을 `Math.random()` 이나 렌더 순번으로 배정한다 | AC-008 전반(다섯 색 안) | AC-008 후반 — 같은 작성자를 두 번 그려 **같은** 클래스가 나오는지, 두 사람이 **다른** 클래스인지 |
| 사람 아바타 키를 `author_user_id` 로 쓰되 없을 때 무방비 | AC-008 대부분 | AC-008 셋째 관측 — `author_user_id` 를 뺀 사람 둘이 서로 다른 색 |
| 첨부 label 을 `<button>` 으로 바꾸고 클릭 핸들러를 안 단다(화면상 똑같다) | AC-010 전반(아이콘 존재) | AC-010 둘째 `it` — `tagName === 'LABEL'` 과 `getAttribute('for') === 'file-input'` |
| 시험 파일이 `/api/auth/me` 를 스스로 등록해 두고 그것을 찌른다(진짜 라우트를 지워도 초록이다) | AC-013 전반 | AC-013 의 [HARD] 절 — 등록은 `registerAuthRoutes` 안에만, 시험은 그 앱을 그대로 쓴다 |
| `login()` 이 받은 이름으로 `state.user` 를 직접 채워 왕복을 아낀다(`id` 가 빈다) | AC-014 전반(이름이 보인다) | AC-014 둘째 `it` — `/api/auth/me` 를 스텁에 넣지 않아, `login()` 이 그것을 부르면 그 자리에서 던진다 |
| `.message` 를 그리드로 만들되 네 번째 이후 직계 자식을 배치하지 않는다(형제 시험은 개수만 세므로 전부 초록) | AC-006 전반(직계 자식 셋) | AC-006 의 `grid-column: 2` 단언 + 뒤 겹의 렌더 폭 관측 |
| `#composer-box` 에 배경만 주고 grow 선언을 빼먹는다(좁은 컨테이너가 그대로 통과) | AC-010 전반(배경·구성) | AC-010 의 `flex: 1`/`min-width: 0` 단언 + 뒤 겹의 폭 비교 |
| `index.html` 에 `aria-disabled="true"` 만 박고 JS 갱신을 안 단다 | AC-011 첫 단언 | AC-011 둘째 `it` — 속성을 뒤집어 놓고 다음 입력에서 되돌아오는지 본다 |
| 되쓰기 대상 주석을 안 고치고 클래스 이름만 코드에 넣는다 | 옛 AC-016 셋 전부 | AC-016 의 주석 앵커 넷 — 구현 코드가 만들어 낼 수 없는 문장 조각을 `^[[:space:]]*//` 로 찾는다 |
| CSS 관측 헬퍼를 새로 만들어 주석·중괄호 깊이를 빠뜨린다 | 모든 CSS 정적 단언 | § CSS 정적 관측은 기존 `cssRuleBlock` 을 쓴다 — 복사본 금지 |
| 꼬리에도 생략기호를 걸어 둘 다 줄어들게 한다 | AC-002 전반(꼬리 문자열 존재) | AC-002 후반 — `.room-name` 에 `flex-shrink: 0`, `.room-prefix` 에만 `text-overflow: ellipsis` |

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 | 판정 |
|----|----------|------|-------------|------|
| AC-WEBUI-001 | REQ-001 | J1 | 방 행이 `.room-hash`+`.room-prefix`+`.room-name` 셋을 갖고, 이름 분해가 `/` 유무·말미 `/` 세 경우에서 규칙대로 | 자동 |
| AC-WEBUI-002 | REQ-001 | J1 | 긴 이름에서도 `.room-name` 의 `textContent` 가 꼬리 **전체**; CSS 상 줄어드는 것은 `.room-prefix` 뿐 | 자동 |
| AC-WEBUI-003 | REQ-001 | J1+J3 | 앞: `.room-item` 에 `height: 26px`·`min-height` 부재, `.room-name`·`.room-prefix` 에 `nowrap`. 뒤(실브라우저): 실제 API 로 만든 방 둘의 행 높이가 둘 다 26 이고 꼬리가 잘리지 않음 | 자동(뒤 겹은 브라우저 부재 시 명시적 skip) |
| AC-WEBUI-004 | REQ-003 | J1 | `.archive-btn` 이 `<button>`·`aria-label` 보유·탭 가능; CSS 에 `display:none`/`visibility:hidden` 없음, `:focus-visible` 로 `opacity: 1` | 자동 |
| AC-WEBUI-005 | REQ-002, REQ-004 | J1 | 보관된 방에 `.archive-btn` 없음(회귀), 현재 방에 inset 강조 막대 CSS 존재; `#new-room-btn`·`#new-bot-btn` 에 `--md-accent` 배경 없음·`aria-label` 보유 | 자동 |
| AC-WEBUI-006 | REQ-005 | J2+J3 | `.message` 직계 자식이 `.msg-avatar`+`.msg-head`+`.msg-body` 셋; 직계 유지(회귀); 턴 `border-top` 부재; `.message > :not(.msg-avatar)` 가 `grid-column: 2`. 뒤(실브라우저): 넷째 직계 자식의 렌더 폭 > 200px(40px 칸이 아님) | 자동(뒤 겹은 skip 가능) |
| AC-WEBUI-007 | REQ-006 | J2 | 아바타 클래스가 `avatar-color-[1-5]`; 같은 작성자 재렌더 시 동일; 다른 두 사람 상이; `author_user_id` 부재 시에도 상이; system 은 색 클래스 없음 | 자동 |
| AC-WEBUI-008 | REQ-007 | J2 | 봇 메시지에 `.bot-badge`("BOT"), 사람·system 에는 없음; 이름 색 `bot-color-[1-5]` 유지(회귀) | 자동 |
| AC-WEBUI-009 | REQ-008 | J2 | `.turn-cont` 에도 `.msg-avatar` 가 DOM 에 있고, CSS 가 `visibility: hidden` 으로만 감춘다 | 자동 |
| AC-WEBUI-010 | REQ-009, REQ-010 | J2+J3 | `#composer-box` 가 넷을 품고 `#autocomplete` 은 `#composer` 직계; `#composer-box` 에 `flex: 1`(또는 `width: 100%`)+`min-width: 0`; `#attach-btn` 이 `LABEL`·`for="file-input"`·`<svg>`·📎 없음. 뒤(실브라우저): 컨테이너 폭 ≈ footer 폭 | 자동(뒤 겹은 skip 가능) |
| AC-WEBUI-011 | REQ-011 | J2 | 빈↔있음 전이가 `aria-disabled` 를 뒤집고, 속성을 **일부러 뒤집어 놔도** 다음 입력에서 되돌아온다(정적 문자열 구현 배제); 파일만 골라도 `"false"`; `disabled` 속성 끝까지 없음 | 자동 |
| AC-WEBUI-012 | REQ-012 | J1 | 계정 바가 `#sidebar` 마지막 자식이고 `#logout-btn` 을 품는다; `#logout-btn` id·`aria-label` 보유; 클릭 시 `POST /api/auth/logout` 정확히 1회 | 자동 |
| AC-WEBUI-013 | REQ-013 | J5 | 쿠키 없이 401·쿠키와 함께 200 + `{id, username}`; **대역 없는 bare 앱**에서 `hasRoute({method:'GET', url:'/api/auth/me'})` 가 true(등록 출처가 `registerAuthRoutes` 임을 명령으로 관측) | 자동 |
| AC-WEBUI-014 | REQ-014 | J1 | 부트스트랩이 `/api/auth/me` 를 정확히 1회 부르고 `state.user` 를 채운다; 계정 바에 이름이 보인다; `login()` 본문은 그 호출을 하지 않는다 | 자동 |
| AC-WEBUI-015 | REQ-016 | J4 | 색 리터럴 0(style.css)·0(html·js SVG); 토큰 아닌 `font-size` ≤ 11 이고 **더한 줄** 에는 0; `server/src` 변경은 `auth.ts` 하나; 영속 id 시험의 **종료 코드 0** | 자동 |
| AC-WEBUI-016 | REQ-015 | J4 | 옛 계약문 넷 0건; 새 계약문 넷이 **주석 줄**(`^[[:space:]]*// …§5.1 — 꼬리는 줄이지 않는다` 등, 선행 공백 허용)로 각 1건; `npm test` 종료 코드 0 | 자동 |

---

## Given-When-Then 시나리오

### AC-WEBUI-001 — 방 행 세 조각과 이름 분해

**Given** 활성 방 셋이 있다: `prodev-a/보고`(`/` 있음), `prodev-a`(`/` 없음), `prodev-a/`(`/` 로 끝남).
**When** 다음을 `server/test/web-shell.test.ts` 끝에 추가하고 J1 을 실행한다.

```ts
it('splits a room name into hash / prefix / tail spans', async () => {
  const app = await loadApp(); loadDom()
  app.state.rooms = {
    active: [
      { id: 1, name: 'prodev-a/보고', status: 'active', created_at: 'x', archived_at: null },
      { id: 2, name: 'prodev-a', status: 'active', created_at: 'x', archived_at: null },
      { id: 3, name: 'prodev-a/', status: 'active', created_at: 'x', archived_at: null },
    ],
    archived: [],
  }
  app.renderRooms()
  const rows = [...document.getElementById('room-list')!.querySelectorAll('.room-item')]
  const parts = (i: number) => ({
    hash: rows[i].querySelector('.room-hash')!.textContent,
    prefix: rows[i].querySelector('.room-prefix')!.textContent,
    name: rows[i].querySelector('.room-name')!.textContent,
  })
  expect(parts(0)).toEqual({ hash: '#', prefix: 'prodev-a/', name: '보고' })
  // '/' 가 없으면 전체가 꼬리 — prefix span 은 비어 있어도 DOM 에 있다
  expect(parts(1)).toEqual({ hash: '#', prefix: '', name: 'prodev-a' })
  // '/' 로 끝나면 나누지 않는다 — 구별되는 부분이 사라지는 행을 만들지 않는다
  expect(parts(2)).toEqual({ hash: '#', prefix: '', name: 'prodev-a/' })
})
```

**Then** 세 `toEqual` 이 통과한다.

### AC-WEBUI-002 — 꼬리는 줄어들지 않는다

**Given** 사이드바 폭(240px)에 결코 들어가지 않는 긴 이름 방 하나가 있다.
**When** 다음을 추가하고 J1 을 실행한다.

```ts
it('keeps the whole tail in the DOM and shrinks only the prefix', async () => {
  const app = await loadApp(); loadDom()
  const long = 'prodev-worktogether-2026-장기프로젝트/분기별-수율-보고서-최종'
  app.state.rooms = { active: [{ id: 1, name: long, status: 'active', created_at: 'x', archived_at: null }], archived: [] }
  app.renderRooms()
  const row = document.querySelector('#room-list .room-item')!
  // DOM 의 꼬리는 생략되지 않은 원문 전체다 — 생략은 화면에서만 일어난다
  expect(row.querySelector('.room-name')!.textContent).toBe('분기별-수율-보고서-최종')
  expect(row.querySelector('.room-prefix')!.textContent).toBe('prodev-worktogether-2026-장기프로젝트/')

  // 줄어드는 쪽은 앞머리뿐이다
  const prefix = rule('.room-prefix')
  expect(prefix).toMatch(/text-overflow:\s*ellipsis/)
  expect(prefix).toMatch(/overflow:\s*hidden/)
  expect(prefix).toMatch(/white-space:\s*nowrap/)
  expect(prefix).toMatch(/min-width:\s*0/)
  expect(rule('.room-name')).toMatch(/flex-shrink:\s*0/)
  expect(rule('.room-name')).not.toMatch(/text-overflow/)
})
```

**Then** 여섯 단언이 통과한다.

### AC-WEBUI-003 — 행 높이는 이름 길이와 무관하다

이 기준은 **두 겹**이다. 앞 겹은 브라우저 없이 언제나 돌고, 뒤 겹은 실제 렌더를 잰다. Playwright 가 없는 환경에서 뒤 겹이 skip 되어도 앞 겹은 남는다 — 그렇지 않으면 C1 의 시각 계약이 통째로 무보증이 된다.

**Given(앞 겹)** `web/style.css` 를 읽을 수 있다.
**When** 다음을 `server/test/web-shell.test.ts` 끝 블록에 추가하고 J1 을 실행한다.

```ts
it('pins the row height and forbids wrapping in the stylesheet', () => {
  const src = readFileSync(join(webDir, 'style.css'), 'utf8')
  const item = cssRuleBlock(src, '.room-item')
  // min-height 가 아니라 height — 이름이 두 줄이 되어도 행이 자라지 않는다
  expect(item).toMatch(/(^|[^-])height:\s*26px/)
  expect(item).not.toMatch(/min-height/)
  // 세 span 이 전부 한 줄에 머문다
  expect(cssRuleBlock(src, '.room-name')).toMatch(/white-space:\s*nowrap/)
  expect(cssRuleBlock(src, '.room-prefix')).toMatch(/white-space:\s*nowrap/)
})
```

**Given(뒤 겹)** Playwright 로 띄운 실브라우저에 임시 서버가 붙어 있다.
**When** `bootVisual()`(§ 실브라우저 기준은 기동 절차를 공유한다)을 써서 다음을 추가하고 J3 을 실행한다. **`window.__app` 같은 전역은 쓰지 않는다** — `web/app.js` 는 ES 모듈이고 전역을 심지 않으며, 그것을 심으라고 요구하는 요구사항도 없다. 방은 **실제 API 로** 만든다.

```ts
it('renders every room row at the same fixed height (real browser)', { skip: skipReason !== null, timeout: 60_000 }, async () => {
  const { page, dispose } = await bootVisual()
  try {
    // 방 둘을 실제 서버에 만든다 — 페이지의 세션 쿠키를 그대로 쓰는 fetch 다
    await page.evaluate(async () => {
      const mk = (name: string) => fetch('/api/rooms', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
      })
      await mk('a')
      await mk('prodev-worktogether-2026-장기/분기별-수율-보고서-최종본')
    })
    await page.reload()
    await page.waitForSelector('#room-list .room-item')

    const heights = await page.$$eval('#room-list .room-item',
      (els: Element[]) => els.map((e: Element) => e.getBoundingClientRect().height))
    expect(heights).toHaveLength(2)
    expect(heights[0]).toBe(26)
    expect(heights[1]).toBe(heights[0])   // 이름 길이가 행 높이를 바꾸지 않는다
    // 꼬리는 화면에서도 잘리지 않는다 — 줄어드는 것은 앞머리뿐이다
    const tail = await page.$$eval('#room-list .room-item .room-name',
      (els: Element[]) => els.map((e: Element) => e.scrollWidth <= e.clientWidth))
    expect(tail).toEqual([true, true])
  } finally { await dispose() }
})
```

**Then** 앞 겹 네 단언 + 뒤 겹 네 단언이 통과한다. Playwright 가 없으면 뒤 겹만 **명시적 skip** 이며 사유가 표준 오류에 남는다(조용한 skip 은 그 파일에서 이미 금지돼 있다). 앞 겹은 어떤 환경에서도 돈다.

### AC-WEBUI-004 — 보관 컨트롤은 키보드로 닿는다

**Given** 활성 방 하나가 그려져 있다.
**When** 다음을 추가하고 J1 을 실행한다.

```ts
it('keeps the archive control reachable by keyboard', async () => {
  const app = await loadApp(); loadDom()
  app.state.rooms = { active: [{ id: 1, name: 'prj', status: 'active', created_at: 'x', archived_at: null }], archived: [] }
  app.renderRooms()
  const btn = document.querySelector('#room-list .room-item .archive-btn') as HTMLButtonElement
  expect(btn.tagName).toBe('BUTTON')                       // 탭 순서에 있는 요소여야 한다
  expect(btn.getAttribute('aria-label')).toBeTruthy()      // 아이콘만 남으므로 이름을 속성으로 갖는다
  expect(btn.querySelector('svg')).not.toBeNull()          // 글자가 아니라 아이콘
  expect(btn.textContent).not.toContain('보관')             // 글자 라벨은 사라졌다
  btn.focus(); expect(document.activeElement).toBe(btn)    // 초점이 실제로 간다

  // 감춤은 opacity 로만 한다 — 나머지 넷은 요소를 탭 순서에서 빼 버린다
  const hidden = rule('.archive-btn')
  expect(hidden).not.toMatch(/display:\s*none/)
  expect(hidden).not.toMatch(/visibility:\s*hidden/)
  expect(hidden).toMatch(/opacity:\s*0/)
  const src = css()
  expect(src).toMatch(/\.archive-btn:focus-visible[^{]*\{[^}]*opacity:\s*1/)
  expect(src).toMatch(/\.room-item:hover\s+\.archive-btn[^{]*\{[^}]*opacity:\s*1/)
})
```

**Then** 열 단언이 통과한다.

### AC-WEBUI-005 — 사이드바의 나머지: 보관된 방·현재 방·조용해진 생성 버튼

**Given** 활성 방 둘(그중 하나가 현재 방)과 보관된 방 하나가 있고, `index.html` 과 `style.css` 를 읽을 수 있다.
**When** 다음을 추가하고 J1 을 실행한다.

```ts
it('keeps archived rooms controlless and marks the current room with an accent bar', async () => {
  const app = await loadApp(); loadDom()
  app.state.rooms = {
    active: [
      { id: 1, name: 'a', status: 'active', created_at: 'x', archived_at: null },
      { id: 2, name: 'b', status: 'active', created_at: 'x', archived_at: null },
    ],
    archived: [{ id: 3, name: '옛방', status: 'archived', created_at: 'x', archived_at: 'y' }],
  }
  app.state.currentRoomId = 2
  app.renderRooms()
  // REQ-WEBSHELL-009 회귀 — 보관된 방에는 보관 컨트롤이 없다
  expect(document.querySelector('#archived-list .room-item .archive-btn')).toBeNull()
  expect(document.querySelector('#room-list .room-item .archive-btn')).not.toBeNull()
  const rows = [...document.querySelectorAll('#room-list .room-item')]
  expect(rows[1].classList.contains('active')).toBe(true)
  expect(rows[0].classList.contains('active')).toBe(false)
  // 강조 막대는 폭을 먹지 않는 inset box-shadow 다
  expect(rule('.room-item.active')).toMatch(/box-shadow:\s*inset 2px 0 0 var\(--md-accent\)/)
  expect(rule('.room-item.active')).not.toMatch(/border-left/)
})
```

그리고 같은 블록에 생성 버튼 관측을 함께 넣는다.

```ts
it('demotes the two creation buttons out of the accent color', () => {
  const doc = loadDom()
  for (const id of ['new-room-btn', 'new-bot-btn']) {
    const b = doc.getElementById(id)!
    expect(b.getAttribute('aria-label')).toBeTruthy()   // 글자 라벨이 아이콘으로 바뀌어도 이름은 남는다
    expect(b.querySelector('svg')).not.toBeNull()
  }
  // [F15] 선택자 문자열 `#new-room-btn, #new-bot-btn` 은 REQ-WEBUI-004 가 규범으로 못 박았다 —
  // 직접 쓴 정규식 대신 공용 cssRuleBlock 을 쓴다(주석 제거·중괄호 깊이가 함께 온다).
  const quiet = rule('#new-room-btn, #new-bot-btn')
  expect(quiet).toMatch(/background:\s*none/)
  expect(quiet).not.toMatch(/--md-accent/)
})
```

**Then** 두 `it` 의 열두 단언이 모두 통과한다.

### AC-WEBUI-006 — 메시지 세 직계 자식과 사라진 구분선

**Given** 사람 메시지 하나, 봇 메시지 둘, system 메시지 하나가 있다.
**When** 다음을 `server/test/web-chat.test.ts` 끝에 추가하고 J2 를 실행한다.

```ts
it('adds an avatar column while keeping head and body as direct children', async () => {
  const app = await loadApp(baseHandler({ '/api/rooms/1/messages': { messages: [
    msg({ id: 1, author_name: 'jw', author_user_id: 7, body: '사람' }),
    msg({ id: 2, author_type: 'bot', author_name: 'a', author_bot_id: 1, body: '봇1' }),
    msg({ id: 3, author_type: 'system', author_name: '시스템', body: '알림' }),
  ] } }))
  await app.openRoom(1); await flush()

  const first = document.querySelector('#messages .message') as HTMLElement
  // 새 계약: 직계 자식 셋 (SPEC-WEBUI-001 §5.2)
  expect([...first.children].map(c => c.className.split(' ')[0]))
    .toEqual(['msg-avatar', 'msg-head', 'msg-body'])
  // 형제 계약 회귀 — 감싸는 컨테이너를 넣지 않았다
  expect($$('#messages .message > .msg-head > strong').length).toBe(3)
  expect($$('#messages .message > .msg-body').length).toBe(3)
  // 아바타는 이름 첫 글자 하나
  expect(first.querySelector('.msg-avatar')!.textContent).toBe('j')

  // 턴 구분선은 사라졌다 — 경계는 간격과 아바타가 진다
  expect(rule('.message:not(.turn-cont)')).not.toMatch(/border-top:\s*var\(--md-border-width\)/)
  expect(rule('.message')).toMatch(/display:\s*grid/)

  // [F5] 형제 SPEC 의 장식 노드는 .message 의 «직계 자식» 이다 (web/rich.js 의 el.appendChild 두 자리).
  // 명시 배치가 없으면 넷째 이후 직계 자식이 40px 아바타 칸으로 자동 배치된다.
  expect(rule('.message > :not(.msg-avatar)')).toMatch(/grid-column:\s*2/)
})
```

**Then** 일곱 단언이 통과한다.

**Given(뒤 겹 — 실브라우저)** 그리드 자동 배치는 CSS 사양 동작이라 jsdom 이 재지 못한다. 위 CSS 정적 단언은 「규칙이 적혀 있다」까지만 보고, **적힌 규칙이 실제로 듣는지**는 보지 못한다.
**When** `bootVisual()` 로 다음을 추가하고 J3 을 실행한다.

```ts
it('keeps a decoration node out of the 40px avatar column (real browser)', { skip: skipReason !== null, timeout: 60_000 }, async () => {
  const { page, dispose } = await bootVisual()
  try {
    await page.evaluate(async () => {
      await fetch('/api/rooms', { method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'probe' }) })
    })
    await page.reload()
    await page.click('#room-list .room-item')
    // 메시지 하나를 실제로 보낸다 — 렌더 경로를 그대로 지난다
    await page.fill('#msg-input', '레이아웃 탐침')
    await page.click('#send-btn')
    await page.waitForSelector('#messages .message')

    // SPEC-WEBRICH-001 이 붙이는 것과 «같은 자리»에 노드를 하나 붙인다 (el.appendChild(node))
    const width = await page.evaluate(() => {
      const m = document.querySelector('#messages .message')!
      const probe = document.createElement('div')
      probe.className = 'attachment-probe'
      probe.textContent = '첨부 자리 탐침'
      m.appendChild(probe)                      // rich.js 의 el.appendChild 와 같은 직계 자식 추가
      return probe.getBoundingClientRect().width
    })
    // 40px 칸으로 밀려 들어갔으면 이 값이 40 언저리다. 2열이면 본문 폭을 받는다.
    expect(width).toBeGreaterThan(200)
  } finally { await dispose() }
})
```

**Then** 뒤 겹 한 단언이 통과한다. 이 단언이 이 SPEC 에서 **유일하게** 「시험은 초록인데 화면이 깨진」 상태를 잡는 관측이다 — 형제 시험 셋(`web-chat.test.ts` 와 `web-markdown.test.ts` 의 `.message > figure` 개수 단언 둘 + `.msg-body .verdict-row` 부재 단언 하나)은 전부 노드 **개수**만 세므로 레이아웃 붕괴에 침묵한다.

### AC-WEBUI-007 — 아바타 색은 작성자마다 고정이다

**Given** 같은 사람이 두 번, 다른 사람이 한 번, `author_user_id` 없는 사람 둘이, system 이 한 번 말한다.
**When** 다음을 추가하고 J2 를 실행한다.

```ts
it('assigns a deterministic role color per author', async () => {
  const app = await loadApp(baseHandler())
  const cls = (i: number) => ($$('#messages .msg-avatar')[i] as HTMLElement).className
  const color = (i: number) => /avatar-color-[1-5]/.exec(cls(i))?.[0]

  app.renderMessage(msg({ id: 1, author_name: 'jw', author_user_id: 7, created_at: '2026-09-11 10:00:00' }))
  app.renderMessage(msg({ id: 2, author_name: 'pm', author_user_id: 8, created_at: '2026-09-11 11:00:00' }))
  app.renderMessage(msg({ id: 3, author_name: 'jw', author_user_id: 7, created_at: '2026-09-11 12:00:00' }))
  app.renderMessage(msg({ id: 4, author_type: 'system', author_name: '시스템', created_at: '2026-09-11 13:00:00' }))
  app.renderMessage(msg({ id: 5, author_name: '가나다', author_user_id: null, created_at: '2026-09-11 14:00:00' }))
  app.renderMessage(msg({ id: 6, author_name: '라마바', author_user_id: null, created_at: '2026-09-11 15:00:00' }))

  expect(color(0)).toMatch(/avatar-color-[1-5]/)   // 다섯 토큰 안
  expect(color(2)).toBe(color(0))                  // 같은 사람은 다시 그려도 같은 색
  expect(color(1)).not.toBe(color(0))              // 다른 사람은 다른 색
  expect(cls(3)).not.toMatch(/avatar-color-/)      // system 은 역할 색을 쓰지 않는다
  // author_user_id 가 없어도 모두가 한 색으로 뭉치지 않는다
  expect(color(5)).not.toBe(color(4))

  // 다섯 클래스가 전부 역할 색 토큰만 소비한다 — 새 색을 만들지 않았다
  for (const n of [1, 2, 3, 4, 5]) {
    expect(rule(`.avatar-color-${n}`)).toMatch(new RegExp(`background:\\s*var\\(--md-role-color-${n}\\)`))
  }
})
```

**Then** 열 단언이 통과한다.

### AC-WEBUI-008 — 봇은 색 없이도 봇으로 읽힌다

**Given** 봇 메시지 하나, 사람 메시지 하나, system 메시지 하나가 있다.
**When** 다음을 추가하고 J2 를 실행한다.

```ts
it('marks bots with a non-color badge and keeps the name colors unchanged', async () => {
  const app = await loadApp(baseHandler({ '/api/rooms/1/messages': { messages: [
    msg({ id: 1, author_type: 'bot', author_name: 'jarvis', author_bot_id: 2 }),
    msg({ id: 2, author_name: 'jw', author_user_id: 7 }),
    msg({ id: 3, author_type: 'system', author_name: '시스템' }),
  ] } }))
  await app.openRoom(1); await flush()

  expect($$('#messages .message.bot .bot-badge').length).toBe(1)
  expect(($$('#messages .message.bot .bot-badge')[0] as HTMLElement).textContent).toBe('BOT')
  expect($$('#messages .message.user .bot-badge').length).toBe(0)
  expect($$('#messages .message.system .bot-badge').length).toBe(0)
  // 이름 색 규칙은 개정되지 않았다 (형제 회귀)
  expect(($$('#messages .message.bot .msg-head > strong')[0] as HTMLElement).className).toMatch(/\bbot-color-[1-5]\b/)
  // 시각은 이제 클래스로 지목한다 — 배지가 먼저 오므로 span 순서에 기대지 않는다
  expect($$('#messages .message.bot .msg-time').length).toBe(1)
})
```

**Then** 여섯 단언이 통과한다.

### AC-WEBUI-009 — 이어짐 행의 아바타 기둥

**Given** 같은 사람의 2분 간격 메시지 둘이 있다(`sameTurn` 이 참인 입력).
**When** 다음을 추가하고 J2 를 실행한다.

```ts
it('keeps the avatar in the DOM on continuation rows and hides it visually only', async () => {
  const app = await loadApp(baseHandler())
  app.renderMessage(msg({ id: 1, author_name: 'jw', author_user_id: 7, created_at: '2026-09-11 10:00:00' }))
  app.renderMessage(msg({ id: 2, author_name: 'jw', author_user_id: 7, created_at: '2026-09-11 10:02:00' }))
  const rows = $$('#messages .message')
  expect(rows[1].classList.contains('turn-cont')).toBe(true)
  // DOM 모양은 첫 줄과 같다 — 구조 시험이 입력에 따라 갈라지지 않는다
  expect(rows[1].querySelector('.msg-avatar')).not.toBeNull()
  // 감춤은 시각적으로만. display:none 은 40px 기둥을 무너뜨려 본문 정렬이 어긋난다
  const src = css()
  expect(src).toMatch(/\.turn-cont\s+\.msg-avatar[^{]*\{[^}]*visibility:\s*hidden/)
  expect(/\.turn-cont\s+\.msg-avatar[^{]*\{[^}]*display:\s*none/.test(src)).toBe(false)
})
```

**Then** 다섯 단언이 통과한다.

### AC-WEBUI-010 — 작성기는 한 덩어리이고 첨부는 여전히 label 이다

**Given** `index.html` 이 로드돼 있다.
**When** 다음을 추가하고 J2 를 실행한다.

```ts
// [F1] 이 파일에는 loadDom 이 없다. index.html 본문을 세우는 일은 loadApp() 이 이미 한다(`loadApp` 이 `document.body.innerHTML` 을 index.html 본문으로 채운다).
it('puts attach, input, send and chips inside one bounded container', async () => {
  await loadApp(baseHandler())
  const doc = document
  const box = doc.getElementById('composer-box')!
  expect(box).not.toBeNull()
  for (const id of ['attach-btn', 'msg-input', 'send-btn', 'file-chosen']) {
    expect(box.contains(doc.getElementById(id)), `#${id} 는 컨테이너 안에 있어야 한다`).toBe(true)
  }
  // 자동완성은 컨테이너 밖 #composer 직계로 남는다 — bottom:100% 기준이 바뀌면 뜨는 자리가 어긋난다
  expect(doc.getElementById('autocomplete')!.parentElement!.id).toBe('composer')
  // SPEC-WEBACNAV-001 블록은 한 줄도 바뀌지 않았다
  expect(rule('#autocomplete')).toMatch(/bottom:\s*100%/)
  expect(rule('.ac-kind.to')).toMatch(/background:\s*var\(--md-accent\)/)
  // [N5] `#msg-input { flex: 1 }` 은 style.css 에 **이미** 있어 구현 전에도 참이다 — 판별력 0 이라 뺐다.
  // 대신 이 SPEC 이 실제로 «더하는» 선언을 본다: 입력칸이 자기 배경·테두리를 버리고 컨테이너에 넘긴다.
  const inputRule = rule('#msg-input')
  expect(inputRule).toMatch(/background:\s*none/)
  expect(inputRule).toMatch(/border:\s*none/)
  expect(rule('#composer-box')).toMatch(/background:\s*var\(--md-bg-input\)/)

  // [F11] «폭을 그대로 쓴다» 는 선언 없이는 성립하지 않는다. #composer 는 display:flex 로 남으므로
  // grow 선언이 없으면 컨테이너가 내용 폭까지만 늘어난다 — 그래도 위 background 단언은 통과한다.
  // [N2] 이 it 안에는 이미 `box`(DOM 요소)가 있다. 같은 이름을 다시 선언하면 TS2451 이고
  // 런타임 SyntaxError 다 — server/package.json 의 pretest 때문에 npm test 자체가 죽는다.
  const boxRule = rule('#composer-box')
  expect(boxRule.replace(/\s/g, '')).toMatch(/flex:1|width:100%/)
  expect(boxRule).toMatch(/min-width:\s*0/)
})
```

그리고 같은 블록에 첨부 컨트롤 관측을 함께 넣는다.

```ts
it('replaces the paperclip emoji with an icon without breaking the file picker', async () => {
  await loadApp(baseHandler())
  const doc = document
  const attach = doc.getElementById('attach-btn')!
  // 스크립트 없이 파일 선택창을 여는 유일한 수단이다 — button 으로 바꾸면 조용히 죽는다
  expect(attach.tagName).toBe('LABEL')
  expect(attach.getAttribute('for')).toBe('file-input')
  expect(attach.querySelector('svg')).not.toBeNull()
  expect(attach.textContent).not.toContain('📎')
  expect(attach.getAttribute('aria-label')).toBeTruthy()
  expect(doc.getElementById('file-input')!.hasAttribute('hidden')).toBe(true)
})
```

**Given(뒤 겹 — 실브라우저)** 선언이 적혀 있다는 것과 폭이 실제로 나온다는 것은 다른 사실이다.
**When** `bootVisual()` 로 다음을 추가하고 J3 을 실행한다.

```ts
it('lets the composer container span the chat column (real browser)', { skip: skipReason !== null, timeout: 60_000 }, async () => {
  const { page, dispose } = await bootVisual()
  try {
    await page.evaluate(async () => {
      await fetch('/api/rooms', { method: 'POST', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'probe' }) })
    })
    await page.reload()
    await page.click('#room-list .room-item')
    await page.waitForSelector('#composer-box')

    const [boxW, footerW] = await page.evaluate(() => {
      const b = document.getElementById('composer-box')!.getBoundingClientRect()
      const f = document.getElementById('composer')!.getBoundingClientRect()
      return [b.width, f.width]
    })
    // 바깥 footer 의 좌우 패딩(--md-space-4 = 16px 씩)을 뺀 만큼을 컨테이너가 다 쓴다
    expect(boxW).toBeGreaterThan(footerW - 40)
  } finally { await dispose() }
})
```

**Then** 앞 겹 두 `it` 의 열일곱 단언 + 뒤 겹 한 단언이 통과한다.

### AC-WEBUI-011 — 보낼 것이 없을 때의 보내기 버튼

**Given** 방이 열려 있고 입력칸이 비어 있다. 초기값의 출처는 REQ-WEBUI-011 이 정한다 — `web/index.html` 이 `aria-disabled="true"` 를 싣고, `initChat()` 이 `refreshSendState()` 를 한 번 불러 그 값을 **실제 상태로 확정**한다.
**When** 다음을 추가하고 J2 를 실행한다.

```ts
it('quiets the send button when there is nothing to send, without disabling it', async () => {
  const app = await loadApp(baseHandler())
  await app.openRoom(1); await flush()
  const send = el('send-btn') as HTMLButtonElement

  expect(send.getAttribute('aria-disabled')).toBe('true')
  type('안녕'); await flush()
  expect(send.getAttribute('aria-disabled')).toBe('false')
  type(''); await flush()
  expect(send.getAttribute('aria-disabled')).toBe('true')
  // 공백만으로는 보낼 것이 생기지 않는다
  type('   '); await flush()
  expect(send.getAttribute('aria-disabled')).toBe('true')
  // disabled 속성은 끝까지 쓰지 않는다 — 탭 순서에서 빠지면 이유를 읽을 대상이 사라진다
  expect(send.hasAttribute('disabled')).toBe(false)
  expect(send.disabled).toBe(false)
})
```

[F12] 위 `it` 만으로는 **정적 문자열 구현**(`index.html` 에 `aria-disabled="true"` 만 박고 JS 는 없음)이 첫 단언을 통과한다. 그래서 «전이» 를 직접 보는 `it` 을 하나 더 둔다 — 이것이 이 기준의 핵심이다.

```ts
it('drives aria-disabled from state, not from a hardcoded attribute', async () => {
  const app = await loadApp(baseHandler())
  await app.openRoom(1); await flush()
  const send = el('send-btn') as HTMLButtonElement

  // 초기값을 일부러 «틀리게» 뒤집어 놓는다. JS 가 상태를 반영한다면 다음 input 에서 되돌아온다.
  send.setAttribute('aria-disabled', 'false')
  type(''); await flush()
  expect(send.getAttribute('aria-disabled')).toBe('true')   // 정적 문자열 구현은 여기서 붉어진다

  // 파일만 골라도 «보낼 것» 이 생긴다 — 본문 없이도 false 여야 한다 (sendMessage 의 가드와 같은 기준)
  pickFiles('a.txt')   // 가변인자 — 문자열이면 그 이름의 텍스트 파일을 만든다 (web-chat.test.ts 의 pickFiles)
  await flush()
  expect(send.getAttribute('aria-disabled')).toBe('false')
})
```

**Then** 두 `it` 의 아홉 단언이 모두 통과한다. 둘째 `it` 의 `pickFiles` 는 `web-chat.test.ts` 의 기존 헬퍼다(`grep -n 'function pickFiles'`).

### AC-WEBUI-012 — 계정 바와 살아 있는 로그아웃

> [F2] 이 기준과 AC-014 는 `web-shell.test.ts` 에서 돈다. **그 파일에는 `flush` 가 없다** — 블록 첫머리에 `const flush = () => new Promise(r => setTimeout(r, 0))` 를 지역 정의한다(§ 파일마다 쓸 수 있는 헬퍼가 다르다).

**Given** 로그인된 상태이고 `POST /api/auth/logout` 스텁이 준비돼 있다.
**When** 다음을 추가하고 J1 을 실행한다.

```ts
it('demotes logout into an account bar without breaking it', async () => {
  const doc = loadDom()
  const bar = doc.querySelector('#sidebar .account-bar')!
  expect(bar).not.toBeNull()
  expect(doc.getElementById('sidebar')!.lastElementChild).toBe(bar)   // 사이드바 맨 아래
  const out = doc.getElementById('logout-btn')!
  expect(bar.contains(out)).toBe(true)                                // 같은 id 가 그 안으로 옮겨졌다
  expect(out.getAttribute('aria-label')).toBeTruthy()                 // 아이콘만 남으므로
  expect(out.querySelector('svg')).not.toBeNull()

  // 클릭이 여전히 로그아웃을 부른다 — §4.8 계약 6 대로 호출은 정확히 한 번.
  // 부트스트랩 사슬(rooms → bots → me)을 전부 스텁한다 — 하나라도 빠지면 스텁이 그 자리에서 던진다
  const app = await loadApp()
  const calls = stubFetch({
    'GET /api/rooms': { status: 200, body: { active: [], archived: [] } },
    'GET /api/bots': { status: 200, body: [] },
    'GET /api/auth/me': { status: 200, body: { id: 7, username: '김피엘' } },
    'POST /api/auth/logout': { status: 200, body: { ok: true } },
  })
  app.initApp()
  await flush()
  ;(document.getElementById('logout-btn') as HTMLButtonElement).click()
  await flush()
  expect(calls.filter(c => c.path === '/api/auth/logout')).toHaveLength(1)
})
```

**Then** 일곱 단언이 통과한다.

### AC-WEBUI-013 — `GET /api/auth/me` 는 세션을 그대로 되비춘다

**Given** `server/test/auth-name.test.ts` 의 기존 골격(임시 디렉터리 sqlite + `Fastify()` + `@fastify/cookie` + `registerAuthRoutes(app, db)`)이 있다.
**When** 그 파일 끝에 다음을 추가하고 J5 를 실행한다.

```ts
describe('SPEC-WEBUI-001 — GET /api/auth/me', () => {
  it('401s without a cookie and mirrors the session user with one', async () => {
    const app = await build()
    // 쿠키 없이 — requireAuth 가 이미 하던 401 을 그대로 낸다
    const anon = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(anon.statusCode).toBe(401)
    expect(anon.json()).toEqual({ error: '로그인이 필요합니다' })

    // 로그인 뒤 — 세션이 가리키는 사용자를 그대로 돌려준다
    const res = await login(app, 'alice')
    const me = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { cookie: setCookieOf(res).split(';')[0] },
    })
    expect(me.statusCode).toBe(200)
    const row = db.prepare('SELECT id, username FROM users WHERE username = ?').get('alice')
    expect(me.json()).toEqual(row)          // req.user 를 다시 빚지 않는다 — {id, username} 그대로
    expect(Object.keys(me.json()).sort()).toEqual(['id', 'username'])   // 키가 늘지 않았다
  })

  // [F8] 위 it 은 build() 가 만든 앱을 찌른다. 누군가 build() 에 /api/auth/me 를 한 줄 더하면
  // server/src/auth.ts 의 라우트를 통째로 지워도 위 it 은 초록이다 — 산문 금지로는 못 막는다.
  // 그래서 «대역이 있을 수 없는» 앱을 따로 세워 라우트의 출처를 직접 묻는다.
  it('registers /api/auth/me inside registerAuthRoutes itself, not in the test harness', async () => {
    const bare = Fastify()
    bare.db = db
    await bare.register(cookie)
    registerAuthRoutes(bare, db)          // 이 한 줄이 등록하는 것만 있는 앱
    await bare.ready()
    expect(bare.hasRoute({ method: 'GET', url: '/api/auth/me' })).toBe(true)
    // 기존 두 라우트도 그대로다 — 새 라우트가 무언가를 밀어내지 않았다
    expect(bare.hasRoute({ method: 'POST', url: '/api/auth/login' })).toBe(true)
    expect(bare.hasRoute({ method: 'POST', url: '/api/auth/logout' })).toBe(true)
    await bare.close()
  })
})
```

[HARD] 경로는 반드시 `/api/auth/me` 이고 등록은 `registerAuthRoutes` 안에만 있다. 같은 파일의 `build()` 가 이미 시험 전용 대역 `/api/me` 를 등록해 두고 있으므로(`grep -n "app.get('/api/me'" server/test/auth-name.test.ts`) — Fastify 라우팅상 두 경로는 별개라 첫 `it` 은 진짜 라우트를 찌른다 — **금지는 유효하지만 산문만으로는 관측되지 않는다.** 둘째 `it` 이 그 산문을 명령으로 바꾼다.

**Then** 두 `it` 의 아홉 단언이 모두 통과한다.

### AC-WEBUI-014 — 이름이 새로고침을 넘긴다

> [F2] AC-012 와 마찬가지로 `web-shell.test.ts` 에서 돈다 — **그 파일에는 `flush` 가 없다.** 같은 블록에 지역 정의한 `flush` 를 쓴다(§ 파일마다 쓸 수 있는 헬퍼가 다르다). 이 기준은 이 SPEC 이 「가장 강하게 방어했다」고 주장하는 자리이므로, 실행되지 않으면 방어도 없다.

**Given** 살아 있는 세션이 있고 `/api/rooms`·`/api/bots`·`/api/auth/me` 스텁이 준비돼 있다.
**When** 다음을 `server/test/web-shell.test.ts` 끝에 추가하고 J1 을 실행한다.

```ts
it('restores the account-bar name after a reload', async () => {
  const app = await loadApp(); loadDom()
  const calls = stubFetch({
    'GET /api/rooms': { status: 200, body: { active: [], archived: [] } },
    'GET /api/bots': { status: 200, body: [] },
    'GET /api/auth/me': { status: 200, body: { id: 7, username: '김피엘' } },
  })
  // 로그인 폼을 거치지 않는 «새로고침» 경로 — 부트스트랩만 돈다
  app.initApp()
  await flush()

  // 이름의 출처는 라우트 하나뿐이고, 정확히 한 번 물어본다
  expect(calls.filter(c => c.path === '/api/auth/me')).toHaveLength(1)
  expect(app.state.user).toEqual({ id: 7, username: '김피엘' })
  // 계정 바가 그 이름을 그린다 — 아바타는 첫 글자
  const bar = document.querySelector('#sidebar .account-bar')!
  expect(bar.textContent).toContain('김피엘')
  expect(bar.querySelector('.account-avatar')!.textContent).toBe('김')
  // 메인 화면이 뜬 시점에 이미 채워져 있다 (빈 칸이 깜빡이지 않는다)
  expect(document.getElementById('main-view')!.hasAttribute('hidden')).toBe(false)
})

it('does not put the /me call inside login()', async () => {
  const app = await loadApp()
  const calls = stubFetch({
    'POST /api/auth/login': { status: 200, body: { ok: true } },
    'GET /api/rooms': { status: 200, body: { active: [], archived: [] } },
    'GET /api/bots': { status: 200, body: [] },
  })
  await app.login('alice')
  // §4.8 계약 6 — 아홉 함수의 호출 순번은 그대로다. /me 는 initApp 의 폼 핸들러가 부른다
  expect(calls.map(c => c.path)).toEqual(['/api/auth/login', '/api/rooms', '/api/bots'])
})
```

**Then** 두 `it` 의 일곱 단언이 모두 통과한다. 두 번째 `it` 이 이 기준의 핵심이다 — 스텁에 `/api/auth/me` 를 **일부러 등록하지 않았으므로**, 구현이 `login()` 본문에 그 호출을 넣으면 스텁이 그 자리에서 던진다.

### AC-WEBUI-015 — 금지 목록은 기준선으로 잰다

[N8] 아래 관측도 AC-016 과 같은 `chk` 형태다 — 기대값 0 인 `grep -c` 가 종료 코드 1 을 내므로, 파이프라인 종료 코드가 아니라 **각 줄의 자기 판정**을 읽는다.

**Given** 작업 트리가 이 SPEC 의 변경만 담고 있고, `.spec-base-sha` 가 박혀 있다.
**When** 다음을 실행한다.

```bash
chk() { if [ "$2" = "$3" ]; then echo "PASS  $1  ($3)"; else echo "FAIL  $1  (기대 $2, 실제 $3)"; fi; }
le()  { if [ "$3" -le "$2" ]; then echo "PASS  $1  ($3 ≤ $2)"; else echo "FAIL  $1  ($3 > $2)"; fi; }
BASE="$(cat .moai/specs/SPEC-WEBUI-001/.spec-base-sha)"

# (0) 기준 SHA 가드 — 이것이 없으면 아래 diff 관측들이 «조용히 통과» 한다
git rev-parse --verify "$BASE" >/dev/null && echo "PASS  base-sha" || echo "FAIL  base-sha"

# (1) style.css 16진수 색 리터럴 — 기준선 0 (실측)
chk 'style.css 색 리터럴' 0 "$(grep -cE ':[^;{]*#[0-9a-fA-F]{3,8}\b' web/style.css || true)"

# (2) [F13] style.css 밖의 색 리터럴 — 인라인 SVG 다섯이 새로 들어온다. 기준선 0·0 (실측)
chk 'index.html SVG 색' 0 "$(grep -cE '(stroke|fill)="#[0-9a-fA-F]' web/index.html || true)"
chk 'app.js SVG 색'     0 "$(grep -cE '(stroke|fill)="#[0-9a-fA-F]' web/app.js || true)"

# (3) [F14] 토큰이 아닌 font-size — 단위를 가리지 않는다. 기준선 11 (실측: 35 - 24)
le  '토큰 아닌 font-size 총량' 11 "$(( $(grep -c 'font-size:' web/style.css) - $(grep -c 'font-size: var(' web/style.css) ))"

# (3-b) 방향이 정확한 관측 — 이 SPEC 이 «더한» 줄에 위반이 있는가
chk '더한 줄의 비-토큰 font-size' 0 "$(git diff "$BASE"...HEAD -- web/ | grep '^+' | grep -v '^+++' | grep 'font-size:' | grep -vc 'var(' || true)"
chk '더한 줄의 색 리터럴'         0 "$(git diff "$BASE"...HEAD -- web/ | grep '^+' | grep -v '^+++' | grep -cE '#[0-9a-fA-F]{3,8}\b' || true)"

# (4) [N3 계열 가드] 기존 선택자를 끝 블록에서 «재정의» 하지 않았다.
#     cssRuleBlock 은 첫 매치를 돌려주므로, 기존 선택자를 끝 블록에 다시 쓰면
#     AC-003·004·005 가 옛 블록을 읽고 올바른 구현에서 떨어진다 (plan.md §B.6).
chk '끝 블록에 기존 선택자 재정의' 0 "$(awk '/\/\* SPEC-WEBUI-001 \*\//,/\/\* \/SPEC-WEBUI-001 \*\//' web/style.css | grep -cE '^[[:space:]]*(\.room-item|\.room-item\.active|\.archive-btn|\.message:not\(\.turn-cont\)|#composer|#msg-input|#file-chosen|\.file-chip|#logout-btn|#autocomplete)[[:space:]]*\{' || true)"

# (5) 서버·채널 — 승인된 범위 확장은 auth.ts 하나뿐이다
echo "--- server/src·channel 변경 목록 (기대: server/src/auth.ts 한 줄) ---"
git diff --name-only "$BASE"...HEAD -- server/src channel | sort
chk 'requireAuth 본체 변경' 0 "$(git diff "$BASE"...HEAD -- server/src/auth.ts | grep -E '^[-+]' | grep -v '^[-+][-+]' | grep -c 'requireAuth[[:space:]]*(req' || true)"

# (6) 바뀐 파일 집합 (기대: auth.ts · app.js · index.html · style.css 넷)
echo "--- 바뀐 파일 (.moai/ 와 server/test/ 제외) ---"
git diff --name-only "$BASE"...HEAD | grep -v '^\.moai/' | grep -v '^server/test/' | sort

# (7) [F6·N9] 영속 id 20개 — «시험이 통과했는가» 를 종료 코드로 본다.
#     vitest 기본 리포터는 «통과한» 시험 이름을 출력하지 않으므로 이름 grep 은 부호가 뒤집혀 있었다.
#     -t 필터가 0개를 잡았을 때의 종료 코드는 이 저장소에서 «측정하지 않았다» — 그래서 필터에 기대지 않고
#     ① 필터가 겨눌 describe 가 실재하는지 따로 세고 ② 파일 전체를 돌려 종료 코드를 본다.
chk 'id hygiene describe 실재' 1 "$(grep -cE \"describe\\('AC-WEBSHELL-003 id hygiene'\" server/test/web-shell.test.ts || true)"
( cd server && npx vitest run test/web-shell.test.ts >/dev/null 2>&1 ); echo "web-shell exit=$?"   # 기대: exit=0
```

**Then** `chk` 여덟 줄 + `le` 한 줄이 전부 `PASS` 이고, `base-sha` 가 `PASS` 이고, (5)·(6) 의 목록이 기대와 같고, `web-shell exit=0` 이다.

기준선 셋은 이 문서를 쓴 시점에 실측한 값이다 — 색 리터럴 0(`style.css`), SVG 색 0·0(`index.html`·`app.js`), 토큰 아닌 `font-size` **11**(`35 - 24`; 내역은 `20px` 1건 + `em` 10건, 전부 이 SPEC 이 만지지 않는 자리). (3) 과 (3-b) 를 함께 두는 이유는 방향이 다르기 때문이다 — (3) 은 **총량이 늘지 않았음**을, (3-b) 는 **이 SPEC 이 더한 줄에 위반이 없음**을 본다. 기존 규칙을 지우는 올바른 구현이 (3) 에서 억울하게 붉어지지 않도록 (3) 은 「이하」다.

(4) 는 개별 결함이 아니라 **결함 부류**를 막는다. N3 은 「`cssRuleBlock` 이 첫 매치를 돌려주는데 새 선언은 파일 끝에 간다」는 어긋남이었고, 그 어긋남은 **선택자가 style.css 에 이미 있을 때만** 발생한다. (4) 는 그 조건 자체를 금지한다 — 기존 선택자는 제자리에서 고치고 끝 블록에는 새 선택자만 둔다(`plan.md` §B.6).

### AC-WEBUI-016 — 계약문이 코드에 되쓰였다

[F7] 옛 관측 셋(`grep -c 'SPEC-WEBUI-001'`, `'room-hash'`, `'msg-avatar'`)은 **구현 코드만으로 전부 충족됐다** — `span.className = 'room-hash'` 한 줄이면 통과했다. 그래서 관측 대상을 **코드에 나타날 수 없는 한국어 문장 조각**으로 바꾸고, 그것이 **주석 줄**인지까지 본다.

[N1] **네 앵커 전부 선행 공백을 허용한다.** 넷 중 하나(`auth-name.test.ts` 의 주석)는 `describe` → `it` 안에 있어 **열 0 이 아니다** — 실측으로 선행 공백 넷이다. `^//` 로 쓰면 되쓰기를 **정확히 수행한** 구현이 붉어진다. 나머지 셋은 오늘 열 0 이지만, 나중에 누가 블록으로 감싸면 같은 함정에 빠지므로 **넷 다 `^[[:space:]]*//` 로 통일한다.** (`\s` 는 POSIX ERE 가 아니라 BSD `grep -E` 에서 보장되지 않는다 — `[[:space:]]` 를 쓴다.)

[N8] **기대값이 0 인 `grep -c` 는 종료 코드 1 을 낸다.** 관측을 스크립트로 묶어 돌리면(`set -e`) 성공이 실패로 읽힌다. 아래는 그 함정을 없앤 형태다 — 각 줄이 **자기 판정을 직접 출력**하므로 파이프라인 종료 코드에 기대지 않는다.

**Given** run 단계가 끝났다. 되쓰기 대상은 네 자리다(REQ-WEBUI-015).
**When** 다음을 실행한다.

```bash
chk() { # chk <라벨> <기대> <실제>
  if [ "$2" = "$3" ]; then echo "PASS  $1  ($3)"; else echo "FAIL  $1  (기대 $2, 실제 $3)"; fi
}

# ── 옛 계약문 넷이 사라졌다 ────────────────────────────────────────
chk '옛 계약 1 (app.js 방 행)'      0 "$(grep -c '형제가 바꾸지 않는다 (§4.8 계약 4)' web/app.js || true)"
chk '옛 계약 2 (app.js 메시지)'     0 "$(grep -c 'div.message.<author_type> > (.msg-head > strong+span, .msg-body)' web/app.js || true)"
chk '옛 계약 3 (auth.ts)'           0 "$(grep -c '라우트는 login·logout 둘뿐' server/src/auth.ts || true)"
chk '옛 계약 4 (auth-name.test.ts)' 0 "$(grep -c '라우트는 login·logout 둘뿐이다' server/test/auth-name.test.ts || true)"

# ── 새 계약문 넷이 «주석 줄» 로 들어왔다 (선행 공백 허용) ──────────
chk '새 계약 1' 1 "$(grep -cE '^[[:space:]]*// .*SPEC-WEBUI-001 §5\.1 — 꼬리는 줄이지 않는다' web/app.js || true)"
chk '새 계약 2' 1 "$(grep -cE '^[[:space:]]*// .*SPEC-WEBUI-001 §5\.2 — 직계 자식 셋' web/app.js || true)"
chk '새 계약 3' 1 "$(grep -cE '^[[:space:]]*// @MX:NOTE: .*/api/auth/me' server/src/auth.ts || true)"
chk '새 계약 4' 1 "$(grep -cE '^[[:space:]]*// .*/api/auth 라우트는 셋' server/test/auth-name.test.ts || true)"

# ── 회귀 ──────────────────────────────────────────────────────────
( cd server && npm test ); echo "npm test exit=$?"      # 기대: exit=0
```

**Then** `chk` 여덟 줄이 전부 `PASS` 이고 `npm test exit=0` 이다.

[F9] 셋째·넷째 앵커가 필요한 이유: `server/src/auth.ts` 의 `@MX:NOTE` 와 `server/test/auth-name.test.ts` 의 계약 주석은 둘 다 「이 모듈이 등록하는 라우트는 login·logout 둘뿐」이라고 적는데, 라우트가 셋이 되는 순간 **코드 옆에 남은 거짓 계약**이 된다. 그리고 아무 시험도 붉어지지 않는다 — 그 파일의 라우트 단언은 `'regist'` 만 보기 때문이다. **이 grep 이 유일한 관측이라, 앵커가 구조적으로 실패하면 관측 자체가 없어진다** — 그것이 N1 을 [critical] 로 다룬 이유다.

마지막 명령은 `SPEC-WEBSHELL-001`·`SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001`·`SPEC-WEBACNAV-001`·`SPEC-WEBMD-001`·`SPEC-AUTH-001` 계열 기준을 **전부** 함께 돌린다 — 계약 개정이 형제를 조용히 부수지 않았다는 증거는 그 실행뿐이다.

## Definition of Done

- [ ] 열여섯 기준이 전부 푸르다. 각 기준이 **구현 전에 붉었던 것**이 `progress.md` §E.2 에 기록돼 있다
- [ ] `cd server && npm run typecheck` 가 종료 코드 0 — **AC 코드를 넣은 직후 한 번**. 다른 파일의 헬퍼 호출(`TS2304`)·변수 재선언(`TS2451`)·콜백 매개변수 암묵 `any`(`TS7006`)·널 역참조(`TS18047`/`TS2531`)가 전부 여기서 먼저 드러난다
- [ ] `cd server && npm test` 가 종료 코드 0 (`pretest` 가 위 typecheck 를 먼저 돌린다)
- [ ] AC-WEBUI-015 의 `chk`/`le` 아홉 줄이 전부 `PASS`
- [ ] AC-WEBUI-016 의 `chk` 여덟 줄이 전부 `PASS`
- [ ] `cssRuleBlock` 이 `server/test/css-rule.ts` 로 옮겨졌고 **`import { expect } from 'vitest'` 를 함께 가져갔으며**, `web-shell.test.ts` 의 기존 호출 세 자리가 import 로 바뀐 뒤에도 `npm test` 가 초록이다
- [ ] `web/style.css` 에서 **기존 선택자는 제자리 편집**됐고 끝 블록에는 새 선택자만 있다(`plan.md` §B.6) — AC-015 (4) 가 이것을 센다
- [ ] `web-visual.test.ts` 의 `bootVisual()` 추출이 끝났고, 기존 `it` 의 단언 넷이 한 글자도 바뀌지 않았다
- [ ] Playwright 가 있는 환경에서 J3 을 한 번 이상 실제로 돌렸다 — AC-003·006·010 의 뒤 겹은 skip 으로 넘기면 관측이 아니라 공백이다. 돌리지 못했다면 그 사실을 `progress.md` §E.2 에 **Gap 으로 적는다**
- [ ] `spec.md` §5.3 표의 **모든** 자리(작성 시점 열 행)를 전부 열어 보고 결과(통과/수정)를 `progress.md` §E.2 에 적었다 — "안 깨질 것 같다"는 기록으로 치지 않는다
- [ ] `plan.md` 에 미해소 clarification 마커가 남아 있지 않다
