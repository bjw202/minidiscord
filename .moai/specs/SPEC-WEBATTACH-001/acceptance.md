# SPEC-WEBATTACH-001 — 수용 기준 (Tier M)

시험은 기존 파일 `server/test/web-chat.test.ts` 에 `AC-WEBATT-*` describe 블록으로 **추가**한다. 기존 describe 블록(고르기·여러 개·빼기·전송)은 한 줄도 고치지 않는다.

> 0.2.0 — 계획 감사(FAIL 0.71)가 「적힌 그대로는 돌지 않는다」고 지목한 다섯(AC-007·010·012, AC-013 의 청취자·CSS 불릿)을 전부 다시 썼다. 바뀐 이유는 각 기준 밑에 적는다.

## §A 시험 이음매 (jsdom 이 못 하는 것을 어떻게 메우는가)

`spec.md` §1.1 이 **시험이 실제로 도는 vitest jsdom 환경에서** 실측했듯, `ClipboardEvent`·`DataTransfer`·`DragEvent` 는 **없고** `URL.createObjectURL`·`revokeObjectURL` 은 **있다**. 그래서 앞의 셋은 «심어서» 메우고, 뒤의 둘은 «덮어써서» 세거나 «지워서» 부재를 재현한다. 네 헬퍼 모두 이 저장소가 이미 쓰는 수법(읽기 전용 `picker.files` 를 `Object.defineProperty` 로 심기, `web-chat.test.ts:730`)의 연장이다. 새 러너·새 의존성을 들이지 않는다.

```ts
// 가짜 DataTransfer — 생성자가 없으므로 객체 리터럴로 만든다.
// types 는 브라우저와 같은 규약을 따른다: 파일을 실으면 'Files' 가 들어 있다.
function fakeDT(files: File[], types = files.length ? ['Files'] : ['text/plain']) {
  return { files, items: files.map(f => ({ kind: 'file', type: f.type, getAsFile: () => f })), types }
}

// 이벤트를 만들고 읽기 전용 자리에 심는다 — cancelable:true 여야 defaultPrevented 를 읽을 수 있다.
function fireWith(target: EventTarget, type: string, prop: string, value: unknown) {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(ev, prop, { value, configurable: true })
  target.dispatchEvent(ev)
  return ev            // ← 반환값의 defaultPrevented 가 «가로챘는가» 의 관측 수단이다
}

// 객체 URL 을 «세는» 이음매 — 이 환경에는 진짜가 있으므로(실측) 덮어쓰고,
// 되돌리기를 돌려준다. 되돌리지 않으면 같은 파일의 뒤따르는 시험이 오염된다.
function stubObjectURL() {
  const origCreate = URL.createObjectURL
  const origRevoke = URL.revokeObjectURL
  let n = 0
  const create = vi.fn(() => `blob:stub/${++n}`)
  const revoke = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true })
  const restore = () => {
    Object.defineProperty(URL, 'createObjectURL', { value: origCreate, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: origRevoke, configurable: true })
  }
  return { create, revoke, restore }
}

// 「객체 URL 을 못 만드는 환경」을 «만들어» 재현한다 — jsdom 의 기본값이 아니다(0.2.0 정정).
function withoutObjectURL() {
  const origCreate = URL.createObjectURL
  Object.defineProperty(URL, 'createObjectURL', { value: undefined, configurable: true })
  return () => Object.defineProperty(URL, 'createObjectURL', { value: origCreate, configurable: true })
}

// 문서 수준 배선을 «세는» 이음매 — jsdom 에 청취자 개수를 읽는 수단이 없으므로
// 등록 호출 자체를 가로채 센다. 반환된 stop() 으로 원상 복구한다.
// 〔0.2.1 — N2〕 document 만 감싸면 가드를 window.addEventListener 로 건 구현이 loadApp 마다
// 쌓여도 이 기준이 붉어지지 않는다: ① types 가 비어 「재배선 0회」가 통과하고 ② dataset 표지를
// 그냥 찍어 두면 그 단언도 통과하며 ③ document.body 에서 발화한 이벤트는 window 까지 버블하므로
// AC-WEBATT-008 도 통과한다. 그래서 window 쪽 등록도 함께 감싸 두 목록을 합쳐 돌려준다.
function countDocListeners() {
  const origDoc = document.addEventListener.bind(document)
  const origWin = window.addEventListener.bind(window)
  const types: string[] = []
  ;(document as unknown as Record<string, unknown>).addEventListener =
    (t: string, ...rest: unknown[]) => { types.push(t); return (origDoc as (...a: unknown[]) => void)(t, ...rest) }
  ;(window as unknown as Record<string, unknown>).addEventListener =
    (t: string, ...rest: unknown[]) => { types.push(t); return (origWin as (...a: unknown[]) => void)(t, ...rest) }
  return {
    types,
    stop: () => {
      ;(document as unknown as Record<string, unknown>).addEventListener = origDoc
      ;(window as unknown as Record<string, unknown>).addEventListener = origWin
    },
  }
}
```

[HARD] `fireWith` 가 이벤트 객체를 **돌려주어야** 한다. `defaultPrevented` 를 읽지 못하면 REQ-WEBATT-004·008·009 의 「가로채지 않는다」는 관측할 수 없는 주장이 되고, 그 셋은 전부 「아무 일도 안 일어난다」가 정답이라 다른 관측 수단이 없다.

[HARD] `stubObjectURL()`·`withoutObjectURL()` 을 쓴 `it` 은 반드시 되돌린다(`afterEach` 또는 `try/finally`). 이 환경의 두 함수는 **진짜**이고 전역이므로, 되돌리지 않으면 같은 파일의 뒤따르는 55개 `loadApp` 시험이 오염된다.

CSS 관측은 이 파일이 이미 갖고 있는 `const rule = (sel: string) => cssRuleBlock(css(), sel)`(`web-chat.test.ts:1141`)을 그대로 쓴다 — `it` 본문 안에서만 부른다(모듈 최상위 `const` 의 TDZ).

시각을 고정하는 자리(AC-WEBATT-002·003)는 `vi.useFakeTimers()` + `vi.setSystemTime(new Date(2026, 8, 11, 14, 30, 5))` 로 못박는다 — 현지 시각으로 포맷하므로 `Date` 생성자에 현지 성분을 그대로 넘긴다.

[HARD] **§B 의 모든 기준은 `await loadApp(baseHandler())` → `await app.openRoom(1)` 을 Given 앞에 세운다.** 〔0.2.1 — N1〕 `#file-input` 의 `change` 청취자와 `#msg-input` 의 청취자는 `initChat()` 이 걸고, `initChat()` 을 부르는 곳은 `openRoom` 의 0단계 한 곳뿐이다(`web/app.js:314`). 이 전제를 세우지 않으면 `pickFiles()` 도 `paste` 도 아무 일을 하지 않아 칩이 0개가 되고, 기준은 구현이 아니라 자기 누락을 관측한다. 같은 파일의 기존 시험 55개가 예외 없이 이 두 줄로 시작한다.

## §B 기계 판정 수용 기준 (13개)

**AC-WEBATT-001** (REQ-001 — 붙여넣기가 목록에 들어온다)
Given 앱을 띄우고 방을 연 상태에서, When `#msg-input` 에 `paste` 를 `clipboardData = fakeDT([new File([bytes],'',{type:'image/png'})])` 로 발화시키면, Then 첨부 칩이 하나 늘고, 그 뒤 Enter 로 보낸 `FormData` 의 파일 파트가 정확히 하나이며, 텍스트 파트는 여전히 하나뿐이다(`fd.getAll('body')` 의 길이 1). 그리고 그 `paste` 이벤트의 `defaultPrevented` 가 `true` 다.

**AC-WEBATT-002** (REQ-002 — 캡쳐 파일명이 세 자리에서 같다)
Given 시각을 `2026-09-11 14:30:05` 로 고정하고 `stubObjectURL()` 을 심고, When `image/png` 항목을 이름 없이 붙여넣으면, Then (a) 보내진 파일 파트의 `name`, (b) 그려진 `img.file-chip-thumb` 의 `alt`, (c) 그 칩 ✕ 의 `aria-label` 이 가리키는 이름이 **모두 같은 문자열** `스크린샷-20260911-143005.png` 다. 이어서 `image/jpeg` 항목을 붙이면 확장자가 `.jpg`, `image/gif` 는 `.gif` 다. 〔0.2.0 — 세 자리가 같다는 것을 관측한다. 이름이 `File` 자체에 붙지 않고 라벨에만 붙으면 (a) 가 어긋난다〕

**AC-WEBATT-003** (REQ-003 — 같은 초에 두 번 붙이기)
Given 시각을 같은 초에 고정한 채, When 같은 `image/png` 항목을 두 번 붙여넣으면, Then 칩이 **둘**이고(조용한 누락 없음) 이름은 `스크린샷-20260911-143005.png` 와 `스크린샷-20260911-143005-2.png` 로 서로 다르다(같은 이름 없음). 이어서 **고르기 경로로** 같은 이름의 파일을 골라도 시험은 그 결과를 단언하지 않는다 — 고르기 경로는 이 규칙의 적용 대상이 아니다(D7, `spec.md` §6).

**AC-WEBATT-004** (REQ-004 — 평문 붙여넣기를 삼키지 않는다)
Given 방을 연 상태에서, When `clipboardData = fakeDT([], ['text/plain'])` 로 `paste` 를 발화시키면, Then 그 이벤트의 `defaultPrevented` 가 `false` 이고 첨부 칩 개수가 0 그대로다.

**AC-WEBATT-005** (REQ-005 — 운영체제·조합키 분기 없음)
Given `web/app.js` 원문을, Then `navigator.platform`·`navigator.userAgent`·`navigator.vendor`·`metaKey`·`ctrlKey` 다섯 어간의 출현 횟수가 **각각 0** 이다. (오늘 값도 전부 0 — `grep -c` 로 실측했다. 그래서 이 기준은 「늘지 않았다」를 재는 기준선 비교다.) 조합키 정보를 싣지 않은 합성 `paste` 가 AC-WEBATT-001 을 그대로 통과한다는 사실이 같은 성질의 행동 쪽 증거이며, 그 관측은 AC-WEBATT-001 이 이미 갖는다. 〔0.2.0 — 세던 어간을 둘에서 다섯으로 늘렸고, 「`paste` 청취자는 하나뿐이어서」라는 관측 불가능한 후반절을 지웠다. jsdom 에는 청취자를 세는 수단이 없다〕

**AC-WEBATT-006** (REQ-006 — 영역에 떨군 모든 파일)
Given 방을 연 상태에서, When `#composer-box` 에 `drop` 을 `dataTransfer = fakeDT([note.txt(text/plain), shot.png(image/png), data.bin(빈 type)])` 로 발화시키면, Then 칩이 셋 생기고 그 `drop` 의 `defaultPrevented` 가 `true` 이며, Enter 로 보낸 `FormData` 의 파일 파트 이름이 `['note.txt','shot.png','data.bin']` 이다 — 이미지만 걸러내지 않는다.

**AC-WEBATT-007** (REQ-007 — 표시가 깜빡이지 않는다)
Given 방을 연 상태에서, When `#composer-box` 에 `dragenter`(파일 끌기) → 자식 `#msg-input` 에 `dragenter` → 같은 자식에 `dragleave` 를 차례로 발화시키면, Then 그 시점까지 `#composer-box.classList.contains('drop-target')` 가 `true` 를 **유지**한다. 이어서 `#composer-box` 에 `dragleave` 를 한 번 더 발화시키면 `false` 가 된다. 또한 `#composer-box` 의 `dragover`(파일 끌기)는 `defaultPrevented` 가 `true` 이고, 파일 끌기의 `drop` 뒤에는 `drop-target` 이 남지 않는다. 〔0.2.0 — 「드롭 표시 클래스」라는 이름 없는 대상을 `drop-target` 으로 못박았다(D9). 이름이 없으면 시험이 구현을 검사하지 못하고 받아 적는다〕

**AC-WEBATT-008** (REQ-008 — 영역 밖 파일 끌기는 세 이벤트를 모두 삼키되 받지 않는다)
Given 칩이 하나 있는 상태에서, When `document.body` 에 `dragenter`·`dragover`·`drop` 을 각각 `dataTransfer = fakeDT([outside.png])` 로 발화시키면, Then **세 이벤트 모두** `defaultPrevented` 가 `true` 이고(페이지 이동 사고 차단 — `dragover` 를 막지 않으면 `drop` 은 애초에 발화하지 않는다) 칩 개수는 **여전히 하나**다(목록 무변경). 그리고 `document.body` 에는 `drop-target` 이 붙지 않는다. 〔0.2.0 — 요구사항 쪽이 `drop` 만 말해 기준보다 약했다. 요구사항을 세 이벤트로 넓히고 기준도 셋을 전부 본다〕

**AC-WEBATT-009** (REQ-009 — 파일 아닌 끌기는 영역 안팎 어디서도 손대지 않는다)
Given 방을 연 상태에서, When `dataTransfer = fakeDT([], ['text/plain'])` 로 (a) `document.body` 의 `dragover`, (b) `#composer-box` 의 `dragover`, (c) **`#composer-box` 의 `drop`**, (d) `#composer-box` 의 `dragenter` 를 각각 발화시키면, Then **네 이벤트 모두** `defaultPrevented` 가 `false` 다. 아울러 칩 개수는 0 그대로이고 `#composer-box` 에 `drop-target` 이 붙지 않는다. 〔0.2.0 — (c) 의 `defaultPrevented` 가 이 기준의 핵심이다. 이것이 없으면 「영역 안에 글자를 끌어다 놓는 멀쩡한 기본 동작을 망가뜨린 구현」이 13개 기준을 전부 통과한다〕

**AC-WEBATT-010** (REQ-010, REQ-013 — 썸네일과 이름 칩의 갈림, 그리고 파일명 경계)
셋으로 나눠 관측한다.
- **① 갈림** — Given `stubObjectURL()` 을 심고 `shot.png(image/png)` 와 `note.txt(text/plain)` 를 함께 고르면, Then `#file-chosen` 안에 `span.file-chip-image` 가 정확히 하나, `span.file-chip` 이 정확히 하나 있다. 썸네일 쪽은 `img.file-chip-thumb` 를 품고 그 `src` 가 심어 둔 blob 값이며 `alt` 가 `shot.png` 이고 `.file-chip-remove` ✕ 를 함께 갖는다. **썸네일 칩에는 `.file-chip` 클래스가 없다.** 이름 칩 쪽은 `.file-chip` 이며 첫 텍스트 노드가 `note.txt` 다 — 기존 `chipNames()` 가 읽는 모양 그대로이고, `chipNames()` 의 결과는 `['note.txt']` 로 이미지 항목을 포함하지 않는다.
- **② 이미지가 아닌 항목의 파일명 경계** — Given 파일명이 `<img src=x onerror=1>.txt` 인 텍스트 파일을 고르면, Then `#file-chosen` 안의 `img`·`script` 개수가 **0** 이고 그 칩의 첫 텍스트 노드가 그 글자 그대로다.
- **③ 이미지 항목의 파일명 경계** — Given `stubObjectURL()` 을 심고 파일명이 `<img src=x onerror=1>.png` 인 이미지 파일을 고르면, Then `#file-chosen` 안의 `img` 가 **정확히 하나**(썸네일 그 자체)이고 그 `alt` 가 그 글자 그대로이며 `src` 가 심어 둔 blob 값이고, `script` 개수는 **0** 이다.

〔0.2.0 — 0.1.0 은 한 문장 안에서 「`alt` 에 그 글자가 들어 있다」와 「새 `img` 가 생기지 않는다」를 함께 요구해 어떤 구현으로도 만족시킬 수 없었다. ②·③ 으로 갈라 각각 성립하게 했다〕

**AC-WEBATT-011** (REQ-011 — 객체 URL 수명, 실패 경로 포함)
Given `stubObjectURL()` 을 심고 이미지 하나를 고른 뒤 다른 파일을 두 번 더 고르면(= `renderPickedFiles()` 가 세 번 돈다), Then `create` 호출 횟수가 **1** 이다. When 그 이미지의 ✕ 를 누르면 `revoke` 가 그 URL 로 정확히 한 번 불린다. 이어서 이미지를 다시 고르고 전송에 성공시켜 목록이 비워지면, `revoke` 가 그 새 URL 로도 불린다 — 총 회수 횟수가 총 생성 횟수와 같다. **그리고 전송이 실패하는 경우**(`fetch` 핸들러가 `ok:false`): 칩이 그대로 남고 `revoke` 는 그 URL 로 **불리지 않으며**, 곧바로 다시 보내 성공시키면 그때 한 번 불린다. 〔0.2.0 — 실패 경로를 더했다. 기존 코드는 실패 시 선택을 일부러 남기므로(`sendMessage()` 는 성공했을 때만 `clearPickedFiles()` 를 부른다), 전송 뒤에 회수를 두는 구현은 화면에 남은 썸네일이 죽은 URL 을 가리키는데 0.1.0 기준으로는 어느 것도 붉어지지 않았다〕

**AC-WEBATT-012** (REQ-012 — 객체 URL 을 못 만드는 환경)
Given `const restore = withoutObjectURL()` 로 `URL.createObjectURL` 을 **명시적으로 지운 뒤**(이 환경의 기본값은 「있음」이다 — `spec.md` §1.1 실측) 이미지 파일을 고르면, Then 예외가 나지 않고 `#file-chosen` 안에 `.file-chip` 이름 칩 하나가 그려지며 그 첫 텍스트 노드가 파일명이고 `img` 는 0개다. Finally `restore()` 로 되돌린다 — 되돌리지 않으면 같은 파일의 뒤따르는 시험이 오염된다. 〔0.2.0 — 0.1.0 의 Given 은 「지운 상태(jsdom 의 기본값)」였는데 그 괄호가 사실이 아니었다. 그대로 두면 구현자는 「이미지에 썸네일을 안 그리는」 반대 방향으로 끌려간다〕

**AC-WEBATT-013** (REQ-014, REQ-015 — 비회귀·경계)
Then 아래가 모두 성립한다.
- 기존 describe 블록 전부 초록이며, `git diff <plan.md §C 의 pre-flight HEAD> -- server/test/web-chat.test.ts` 가 **추가 라인만** 갖는다(제거·변경 0줄).
- `git diff --stat -- <PRESERVE 경로 집합>` 이 0줄이고, `git log --oneline <pre-flight HEAD>..HEAD -- <PRESERVE 경로 집합>` 이 아무것도 출력하지 않는다(커밋된 위반까지 잡는 기준선 비교). **`<PRESERVE 경로 집합>` 은 `plan.md §A.7` 이 한 줄로 못박은 그 집합이며 두 명령이 같은 집합을 쓴다.** 〔0.2.0 — 0.1.0 은 이 문서와 `plan.md` 가 서로 다른 경로 집합을 썼다〕
- 붙여넣기 직후 `#send-btn` 의 `aria-disabled` 가 `'false'` 이고, 시험 전 구간 어느 시점에도 `#send-btn` 에 `disabled` 속성이 붙지 않는다(REQ-WEBUI-011 [HARD]).
- **문서 배선이 두 번 걸리지 않는다 (실제로 잰다).** 같은 문서에서 `loadApp` → `openRoom` 을 한 번 끝낸 뒤 `const spy = countDocListeners()` 를 설치하고, 다시 `loadApp` → `openRoom` 을 한다. Then `spy.types` 에 `'dragenter'`·`'dragover'`·`'drop'` 이 **하나도 없다**(문서 수준 재배선 0회). 아울러 `document.documentElement.dataset.webattachGuard` 가 `'1'` 이다. Finally `spy.stop()`. 보조로 원문 세기도 남긴다 — `web/app.js` 안에서 `addEventListener('paste'`·`'drop'`·`'dragover'`·`'dragenter'`·`'dragleave'` 의 각 출현이 1회씩이다. **다만 원문 세기는 결론의 근거가 아니다**: 원문에 한 번 적힌 호출이 런타임에 몇 번 도는지는 세어지지 않는다. 〔0.2.0 — 0.1.0 은 원문 세기만으로 「겹쳐 붙지 않는다」를 결론지었고, 그 결론은 이 하네스에서 **거짓**이다. `document` 는 시험 사이를 넘어 살아남고 `vi.resetModules()` 는 `chatReady` 를 되돌린다 — 실측(`spec.md` §1.1). 세는 목록에 빠져 있던 `dragenter`·`dragleave` 도 더했다〕
- **CSS 는 셀렉터 단위로 관측한다.** `rule('.file-chip-image')`·`rule('.file-chip-thumb')`·`rule('#composer-box.drop-target')` 셋이 각각 비어 있지 않고, 셋의 본문을 합쳐 `var(--md-` 를 포함하며 `/#[0-9a-fA-F]{3,8}\b/` 가 0건이다. 그리고 `rule('.file-chip-thumb')` 는 `opacity` 를 1 로 되돌리는 선언을 갖는다(`#file-chosen { opacity: 0.8 }` 상속 — `web/style.css:472` 실측). 〔0.2.0 — 0.1.0 은 `/* SPEC-WEBATTACH-001 */` **주석 표지**를 `cssRuleBlock` 에 넘기라고 적었는데, 그 헬퍼는 본문 첫 줄에서 주석을 전부 벗긴다(`server/test/css-rule.ts:15`). 통과할 수도 실패할 수도 없는 기준이었다. 주석 표지는 사람이 읽는 구획으로만 남기고 관측은 셀렉터로 한다〕
- `npm run typecheck -w server` 종료 코드 0, `npm test` 전체 초록.

## §C 사람이 봐야 하는 것 (기계로 못 가는 곳 — 3건)

[HARD] 아래 셋은 **기계 판정 기준으로 쓰지 않는다.** jsdom 에 진짜 클립보드도, 진짜 끌기도, 그리는 화면도 없기 때문이다. 이 SPEC 은 「돌릴 방법을 보일 수 없는 수용 기준은 쓰지 않는다」는 규율을 지키기 위해 이것들을 AC 번호 밖에 둔다. 닫는 방법은 관측 대본과 그 결과를 `progress.md §E.2` 에 적는 것이다. **관측 주체와 관문은 §D 가 정한다.**

**HO-1 — 맥과 윈도우에서 실제 캡쳐 붙이기 (REQ-001·002·005 의 진짜 확인)**
대본: (1) `npm run dev -w server` 로 띄우고 브라우저로 방을 연다. (2) macOS 에서 `Cmd+Shift+4` 로 화면 일부를 캡쳐한다. (3) 입력칸을 누르고 `Cmd+V`. (4) 썸네일이 뜨고 이름이 `스크린샷-<오늘>-<지금>.png` 인지 본다. (5) 보내고 메시지에 이미지가 뜨는지 본다. (6) Windows 에서 `Win+Shift+S` → `Ctrl+V` 로 같은 것을 반복한다. 기록: 두 운영체제의 스크린샷 각 1장 + 만들어진 파일명.

**HO-2 — 드롭 표시와 썸네일의 생김새 (REQ-007·010 의 시각 확인)**
대본: 파일 탐색기에서 이미지 두 개와 PDF 하나를 함께 끌어 작성기 위로 가져간다. `drop-target` 표시가 켜지는지, 자식 요소 위를 지날 때 깜빡이지 않는지 본다. 떨구고 나서 썸네일이 약 56px 정사각으로 보이는지, **흐려 보이지 않는지**(`#file-chosen` 의 `opacity: 0.8` 상속을 되돌렸는지), PDF 는 이름 칩 그대로인지, ✕ 가 눌리는지 본다. 기록: 끌기 중 1장 + 떨군 뒤 1장.

**HO-3 — 폴더 드롭 (spec.md §6 의 한계 확인)**
대본: 폴더 하나를 작성기에 떨군다. 기록: 아무 일도 없었는지, 0바이트 항목이 생겼는지, 브라우저 이름과 버전. 어느 쪽이든 **결함이 아니다** — 관측 결과를 §6 에 한 줄로 확정하는 것이 이 항목의 목적이다.

## §D 완료의 정의 (Definition of Done)

### D.1 기계 판정

- AC-WEBATT-001~013 전부 PASS, 각 행에 (a) 실행 명령 (b) 관측된 출력 (c) HEAD SHA 귀속의 세 쌍이 붙는다
- TDD 이므로 구현 전 RED 실패 출력을 그대로 보인다
- `npm test` 전체 초록, `npm run typecheck -w server` 종료 코드 0
- `plan.md §A.7` PRESERVE 목록의 파일이 전부 무변경

### D.2 사람 관측의 주체·시점·관문 〔0.2.0 신설〕

0.1.0 의 완료 정의는 「HO-1~HO-3 의 결과가 기록된다(미관측이면 «미검증» 으로 남긴다)」만 적어, **셋 다 «미검증» 이어도 완료가 성립**했다. 정직하게 공시된 공백이 관문 없이 남으면 그 공백은 그대로 굳는다. 그래서 셋을 갈라 적는다.

| 항목 | 관측 주체 | 시점 | **강제 주체** 〔0.2.1 — N3〕 | **검사 동사** 〔0.2.1 — N3〕 | 완료와의 관계 |
|------|------|------|------|------|----------------|
| **HO-1** 실제 OS 클립보드 붙여넣기 | **운영자(사람).** 에이전트가 대신 관측할 수도, 대신 기록할 수도 없다 — jsdom 에는 진짜 클립보드가 없고 브라우저를 띄우는 수단도 이 하네스 밖이다 | run 단계가 끝나고 **sync 단계에 들어가기 전** | **sync 단계 진입을 실행하는 주체(오케스트레이터).** `status: completed` 로 올리기 «직전» 에 스스로 확인한다. `manager-docs` 도 `sync-auditor` 도 아니다 — 전이를 실행하는 손이 확인하는 손이어야 확인을 건너뛸 수 없다 | 아래 명령의 출력이 **다섯 값을 모두** 포함하지 않으면 전이하지 않는다 | **차단 관문.** HO-1 이 «미검증» 인 동안 이 SPEC 은 `status: completed` 에 이르지 못한다. 이유: HO-1 은 REQ-001·002·005 가 **실제 브라우저에서 작동한다는 유일한 증거**이고, 기계 기준 13개는 전부 합성 이벤트 위에서만 돈다. 「맥·윈도우 모두에서 캡쳐가 붙는다」는 운영자 요청의 본문이기도 하다 |
| **HO-2** 드롭 표시·썸네일 생김새 | 운영자(사람) | 같음 | — | — | **차단하지 않는다.** 미관측이면 `progress.md §E.2` 에 «미검증» 으로 적고 **잔여 위험으로 함께 올린다**. 근거: 클래스 존재·치수 토큰·불투명도 되돌림은 AC-007·013 이 기계로 덮고, HO-2 가 더하는 것은 「사람 눈에 그럴듯한가」뿐이다 |
| **HO-3** 폴더 드롭 | 운영자(사람) | 같음 | — | — | **차단하지 않는다.** 이 항목은 판정이 아니라 **관측 기록**이다 — 어떤 결과든 결함이 아니며(`spec.md` §6), 목적은 §6 의 한 줄을 확정하는 것이다. 미관측이면 §6 이 「미확정」으로 남는다 |

**HO-1 관문의 검사 동사 (정본).** 저장소의 상태 전이 훅은 강제가 아니다 — `.claude/hooks/moai/status-transition-ownership.sh` 가 스스로 「Advisory hook (never blocks)」라 적고 `exit 0` 으로 끝난다. 즉 오늘 기계적으로 막는 것은 아무것도 없으므로, 관문은 **전이를 실행하는 주체가 스스로 도는 한 줄**이어야 한다:

```bash
grep -n "HO-1" .moai/specs/SPEC-WEBATTACH-001/progress.md
```

[HARD] 그 출력이 아래 **다섯 값을 모두** 담고 있지 않으면 `status: completed` 로 전이하지 않는다.

1. **관측자** — 관측한 사람의 이름 또는 식별자
2. **관측일** — `YYYY-MM-DD`
3. **macOS 스크린샷 증거 경로** — 저장소 안에서 열리는 경로
4. **Windows 스크린샷 증거 경로** — 같음
5. **생성된 파일명** — 실제로 붙은 캡쳐의 이름(예: `스크린샷-20260911-143005.png`)

다섯을 열거해 두는 이유는 하나다: 「PASS」 두 글자만 적고 넘어갈 수 없게 하는 것. 값 하나라도 비면 관문은 열리지 않는다.

[HARD] 세 항목 중 어느 것도 관측하지 않은 채 **PASS 로 적지 않는다**(VCI §3.4 Gaps). «미검증» 은 정직한 기록이고, PASS 는 관측했을 때만 쓴다.
