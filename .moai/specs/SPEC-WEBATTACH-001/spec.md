---
id: SPEC-WEBATTACH-001
title: "대화 입력창 이미지 붙여넣기·드래그앤드롭·썸네일 미리보기 — 캡쳐를 곧바로 첨부하고 무엇이 나갈지 눈으로 본다"
version: "0.2.0"
status: in-progress
created: 2026-09-11
updated: 2026-09-11
author: manager-spec
priority: P2
phase: "v2.3.0 target"
module: "web/, server/test/"
lifecycle: spec-anchored
tags: "web-ui, composer, clipboard-paste, drag-and-drop, thumbnail, object-url, vanilla-js, jsdom"
tier: M
depends_on: [SPEC-WEBCHAT-001, SPEC-WEBUI-001]
related_specs: [SPEC-WEBRICH-001, SPEC-MSG-001]
---

# SPEC-WEBATTACH-001 — 대화 입력창 이미지 붙여넣기·드래그앤드롭·썸네일 미리보기

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-09-11 | 최초 작성. 운영자 요청(스크린 캡쳐 바로 붙이기·모든 파일 드래그앤드롭·이미지는 작은 미리보기와 삭제)을 Tier M 요구사항 15개·수용 기준 13개(기계)와 사람 관측 3건으로 옮겼다. 운영자가 이미 내린 결정 네 가지(D1 드롭 범위=입력창 주변, D2 캡쳐 파일명=시각 이름, D3 이미지만 썸네일, D4 새 제한 없음)를 §1.2 에 그대로 싣고 다시 열지 않는다. 이 SPEC 이 스스로 내린 결정 넷(D5 붙여넣기 청취 자리, D6 영역 밖 드롭 삼키기, D7 붙여넣기는 중복 제거를 거치지 않는다, D8 썸네일 자격 판정)은 §1.3 에 근거와 함께 적었다. | manager-spec |
| 0.2.0 | 2026-09-11 | 계획 감사(`.moai/reports/plan-audit/SPEC-WEBATTACH-001-2026-09-11.md`, 판정 FAIL 0.71) 지적 반영. **실측 정정**: §1.1 4행의 「`URL.createObjectURL` 부재」는 **틀렸다** — 맨 `new JSDOM()` 창을 쟀고 시험은 그 창에서 돌지 않는다. 시험이 실제로 도는 vitest jsdom 환경에서 다시 재니 **함수로 존재**했다(아래 §1.1). REQ-012 는 유지하되 근거를 바꿨고 AC-012 는 「명시적으로 지운 뒤 되돌린다」로 고쳤다. 그 밖에 REQ-006 전건을 「파일을 실은 끌기」로 좁히고(REQ-009 와의 모순 제거), REQ-008 을 `dragenter`·`dragover`·`drop` 으로 넓히고(막겠다고 한 사고가 `drop` 만으로는 안 막힌다), REQ-007·010 이 관측 대상 클래스 이름을 글자로 못박고, REQ-014 에 「문서 청취자는 문서에 남는 표지로 1회만」을 더했다(모듈 수준 플래그는 `vi.resetModules()` 를 넘지 못한다 — 실측). D6·D7·D8 을 각각 범위·적용 범위·문장 정확성에서 개정했고 D9·D10 을 새로 세웠다. §6 의 `.webp` 문장과 §1.3 D8 의 import 문장은 사실이 틀려 고쳤다. REQ-005·014·015 는 **번호를 옮기지 않는다** — 대신 각 요구의 서술을 「시스템의 행동」으로 다시 쓰고, 그 안에 섞여 있던 **저장소 쪽 금지**(어간이 늘지 않는다 / `server/src` 무변경)를 §5 제약으로 옮겼다. 번호를 재배열하면 이미 작성된 AC 13개의 추적이 통째로 흔들리는데, 그 비용이 얻는 것보다 크다. 운영자 결정 D1~D4 는 열지 않았다. | manager-spec |

---

## 1. 배경과 목적

운영자 요청 그대로다: 「대화입력창에 이미지 삽입기능 개발. (맥, 윈도우 모두) 스크린캡쳐 바로 붙이기 가능. Drag & Drop 가능 (이건 모든 파일 가능). 이미지 파일이나 캡쳐가 붙는 경우 첨부파일 자리에 작은 미리보기 형태 (삭제도 가능).」

오늘은 파일을 넣는 길이 클립 버튼(`#attach-btn` → `#file-input`) 하나뿐이다. 스크린샷을 찍어 클립보드에 담아도 붙여넣을 자리가 없어, 사람은 파일로 저장했다가 다시 고르는 우회로를 거친다. 끌어다 놓는 것도 안 된다 — 그뿐 아니라 브라우저 기본 동작이 남아 있어, 파일을 창 안에 떨구면 **그 파일로 페이지가 통째로 넘어가며 쓰던 본문이 사라진다.**

이 SPEC 이 끝나면 (1) 입력칸에 붙여넣은 캡쳐가 첨부 목록에 바로 들어오고, (2) 작성기 영역에 떨군 파일이 종류를 가리지 않고 목록에 들어오며, (3) 이미지는 이름 칩 대신 작은 정사각 썸네일로 보이고 ✕ 로 지울 수 있다.

### 1.1 판단 근거 (전부 실측)

**붙여넣기·끌어놓기 처리는 지금 전혀 없다** — `grep -nE "paste|drop|dragover|dragenter|dragleave|clipboard|DataTransfer|createObjectURL" web/*.js` 의 출력은 단 한 줄, `web/rich.js:202` 의 클립보드 **복사**(`deps.nav?.clipboard`)뿐이다. 이 SPEC 이 손댈 부류의 코드는 0줄이다.

**보낼 목록의 단일 출처는 `pickedFiles` 배열이다** (`web/app.js`). 주석이 그것을 글자로 못박는다 — 「`picker.files` 는 항목 하나만 빼는 수단이 없으므로 «무엇이 나갈지» 의 단일 출처는 이 배열이고, picker 는 고르는 창구로만 쓴다」. 따라서 붙여넣기도 끌어놓기도 **새 경로를 만들지 않고 이 배열에 잇는다.** `onFilePicked()` 가 하는 일(중복 판정 → push → `renderPickedFiles()`)이 그대로 공용 경로가 된다.

**기존 시험 픽스처에 이미지가 없다** — `server/test/web-chat.test.ts` 의 `pickFiles`/`pickFile` 은 전부 `type: 'text/plain'` 이다. `grep -c "image/\|\.png\|\.jpg\|\.gif" server/test/web-chat.test.ts` 는 0건. 그래서 썸네일 분기를 더해도 기존 단언(`chipNames()` 가 `.file-chip` 의 첫 텍스트 노드를 읽는 방식)은 흔들리지 않는다 — 다만 그 성질이 유지되는 것은 우연이 아니라 REQ-010 이 **썸네일 칩에 `.file-chip` 을 달지 않기로** 결정했기 때문이다.

**jsdom 이 무엇을 못 하는지 «시험이 실제로 도는 환경에서» 탐침했다.** 0.1.0 은 `node -e` 로 맨 `new JSDOM(...)` 창을 만들어 쟀는데, **시험은 그 창에서 돌지 않는다.** 다시 쟀다 — `server/test/` 에 `// @vitest-environment jsdom` 도크블록을 단 임시 탐침 파일을 두고 `npx vitest run` 으로 돌린 뒤 삭제했다(`git status --short server/test/` 로 잔여 없음 확인). 관측된 출력은 다음과 같다.

```
$ cd server && npx vitest run test/<임시 탐침>.test.ts      # @vitest-environment jsdom
{"ClipboardEvent":"undefined","DataTransfer":"undefined","DragEvent":"undefined",
 "File":"function","Blob":"function","FileList":"function",
 "create":"function","revoke":"function","node":"v24.12.0","jsdom":"29.1.1"}
 called=blob:nodedata:9d1d5dac-25ca-4fe0-9aca-7328fddb41d2 | revoke=ok
```

| API | vitest jsdom 환경 (jsdom 29.1.1 / Node v24.12.0) | 이 SPEC 에 미치는 영향 |
|-----|--------------------------------------------------|------------------------|
| `ClipboardEvent` | **undefined** — 생성자 아님 | 시험은 `new Event('paste', {cancelable:true})` + `Object.defineProperty(ev,'clipboardData',…)` 로 심는다 |
| `DataTransfer` | **undefined** — 생성자 아님 | 가짜 객체 리터럴(`{items, files, types}`)을 심는다 |
| `DragEvent` | **undefined** — 생성자 아님 | `new Event('drop'|'dragover'|…)` + `dataTransfer` 심기 |
| `URL.createObjectURL` / `revokeObjectURL` | **둘 다 `function` — 존재한다.** 실제로 불러도 되고 `blob:nodedata:…` 를 돌려준다 (0.1.0 의 「undefined」는 맨 JSDOM 창을 잰 오측이다) | 호출 횟수를 세려면 시험이 `vi.fn()` 으로 **덮어써야** 하고, 「없는 환경」을 재현하려면 **명시적으로 지웠다가 되돌려야** 한다. 기본값에 기대는 기준을 쓰지 않는다 → REQ-WEBATT-012 / AC-WEBATT-012 |
| `File` / `FileList` / `Blob` | function — 정상 | 픽스처 제작은 문제 없다 |

이 심기(defineProperty) 수법은 **새로 발명한 것이 아니다.** 기존 시험이 읽기 전용 `picker.files` 를 같은 방식으로 심고 있다(`Object.defineProperty(picker, 'files', { value: files, configurable: true })`, `web-chat.test.ts:730`). 이 SPEC 은 그 이음매를 그대로 넓혀 쓴다.

**문서 수준 청취자는 시험 사이를 넘어 살아남는다 — 실측.** 같은 탐침 파일에서 잰 결과다: `document.body.innerHTML = …` 는 `body` 안쪽만 갈아끼우고 `document` 노드는 그대로이며, `vi.resetModules()` 뒤 새로 적재된 모듈은 모듈 수준 플래그(`chatReady`)를 `false` 로 되돌린다. 그래서 「모듈 플래그 안에서 걸면 한 번만 걸린다」는 **문서 수준 청취자에 대해서는 거짓**이다.

```
# loadApp 을 두 번 흉내내고(각 사이 vi.resetModules() + body 교체) drop 을 한 번만 발화
모듈 플래그로만 가드한 청취자 + 문서에 남는 표지로 가드한 청취자 = 총 3회 발화
   → 모듈 플래그 쪽 2회(쌓였다) + 문서 표지 쪽 1회(안 쌓였다)
문서 표지(document.documentElement.dataset) 는 body 교체를 넘어 살아남았다
```

`server/test/web-chat.test.ts` 의 `await loadApp(` 호출은 **55회**(`grep -c`)다. 그래서 문서 가드의 1회성은 **문서 자신이 지니는 표지**로 보장해야 한다(D10 / REQ-WEBATT-014).

**서버는 손댈 것이 없다** — `server/src/routes-messages.ts` 의 `req.parts({ limits: { fileSize: 100 * 1024 * 1024 } })` 가 이미 파일 파트를 필드명과 무관하게 받고, 파일명은 `basename()` 으로 봉인하며(REQ-MSG-007), MIME 표(`:12`)가 `.png`/`.jpg`/`.jpeg`/`.gif` 를 이미 덮는다. 보내는 쪽 `sendMessage()` 는 `pickedFiles` 를 그대로 `file` 파트로 싣는다 — 배열에 들어오기만 하면 전송은 이미 작동한다.

**보낸 뒤 그려지는 쪽도 이미 있다** — `web/rich.js` `buildAttachmentNode` 가 `isImageFilename(att.filename)` 이 참일 때 `img.attachment-image` 를 만든다. 이 SPEC 은 **보내기 전 작성기 쪽**만 다룬다.

### 1.2 운영자가 이미 내린 결정 (다시 열지 않는다)

| 결정 | 내용 | 출처 |
|------|------|------|
| **D1 드롭 범위** | 떨어뜨리는 자리는 작성기 영역(`#composer` / `#composer-box`)뿐이다. 채팅 화면 전체가 아니다. | 운영자 |
| **D2 캡쳐 파일명** | `스크린샷-YYYYMMDD-HHMMSS.png` (현지 시각). 확장자는 클립보드 항목의 MIME 에서 뽑는다. 같은 초에 여러 번 붙여도 조용히 겹치면 안 된다. | 운영자 |
| **D3 미리보기 모양** | 이미지 파일과 붙여넣은 캡쳐만 작은 정사각 썸네일(약 56px)로, 기존 ✕ 를 그대로 달고. 이미지가 아닌 파일은 지금의 `.file-chip` 이름 칩 그대로 — 다시 설계하지 않는다. | 운영자 |
| **D4 제한** | 새 클라이언트 쪽 크기·개수 제한을 두지 않는다. 서버의 파일당 100MB 멀티파트 상한이 유일한 경계다. 새 규칙도 새 시험도 만들지 않는다. | 운영자 |

### 1.3 이 SPEC 이 내린 결정 (근거와 함께)

**D5 — 붙여넣기를 어디서 듣는가: `#msg-input`.** `paste` 는 초점이 있는 편집 가능 요소에서 발화한다. `document` 에 걸면 화면 어디서 눌러도 잡히지만, 「대화입력창에 삽입」이라는 요청 범위를 넘고 다른 표면(자동완성 목록, 메시지 본문 선택)의 붙여넣기까지 가로챈다. 입력칸에 건다 — 배선 자리는 기존 `chatReady` 블록 한 곳뿐이다(REQ-WEBCHAT-016). `#msg-input` 은 `loadApp` 마다 새로 만들어지는 요소이므로(body 교체) 여기 건 청취자는 쌓이지 않는다 — 쌓이는 것은 문서 수준뿐이다(D10).

**D6 — 영역 밖 파일 드롭: 삼킨다(막는다). 〔0.2.0 개정 — 막는 이벤트를 셋으로 넓혔다〕** D1 이 드롭 «대상» 을 작성기로 좁혔으나, 그것만으로는 영역 밖 드롭이 브라우저 기본 동작으로 넘어간다 — **떨군 파일로 페이지가 이동해 쓰던 본문·목록·SSE 연결이 통째로 사라진다.** 그래서 문서 수준에 가드를 하나 둔다. 0.1.0 은 이 가드를 「`drop` 의 기본 동작만 막는다」로 적었는데 **그 범위로는 막으려는 사고가 그대로 일어난다**: HTML 드래그앤드롭 규약에서 `dragenter`·`dragover` 의 기본 동작을 막지 않은 요소는 애초에 유효한 드롭 대상이 아니고, 그 위에 파일을 놓으면 브라우저가 탐색을 수행하며 `drop` 은 그 대상에 발화하지 않는다 — 즉 `drop` 에만 거는 `preventDefault` 는 결코 불리지 않는다. 그래서 가드의 범위는 **파일을 실은 끌기의 `dragenter`·`dragover`·`drop` 기본 동작**이고, 그동안 **첨부 목록은 한 항목도 바뀌지 않는다.** 「받지 않음」과 「페이지가 날아감」은 다르다 — 이 가드가 그 둘을 가른다. 파일이 아닌 끌기는 네 이벤트 어느 것도 손대지 않는다(REQ-WEBATT-009).

**D7 — 붙여넣기는 중복 제거를 거치지 않는다. 〔0.2.0 개정 — 이름 규칙의 적용 범위를 좁혔다〕** `isSameFile()` 은 이름·크기·`lastModified` 로 같은 파일을 본다. 이 판정은 **고르는 창구**를 위한 것이다 — OS 대화상자에서 같은 파일을 다시 고르는 것은 사고에 가깝다. 붙여넣기는 다르다: 사람이 두 번 누른 것은 두 번 넣겠다는 뜻이다. 게다가 클립보드에서 나온 `File` 은 붙일 때마다 `lastModified` 가 새로 찍히므로 판정 자체가 우연에 맡겨진다. 그래서 붙여넣기는 항상 잇고, 대신 **붙여넣기로 들어오는 항목의 이름이 기존 목록의 어떤 이름과도 겹치지 않도록** `-2`, `-3` … 을 붙인다. 0.1.0 은 이것을 「목록 안에서 이름이 겹치지 않는다」는 **목록 전체 불변식**으로 적었는데 그것은 거짓이다 — 고르기 경로는 `isSameFile` 만 보고 이름을 보지 않으며(`onFilePicked`), REQ-WEBATT-014 가 그 경로의 무변경을 요구한다. 그러므로 불변식의 범위는 **붙여넣기로 들어오는 항목**이다. 붙여넣은 캡쳐 뒤에 사용자가 디스크에서 같은 이름의 파일을 고르면 같은 이름 둘이 공존할 수 있고, 그것은 결함이 아니라 이 결정의 알려진 귀결이다(§6).

**D8 — 무엇을 썸네일로 보는가: MIME 또는 확장자. 〔0.2.0 개정 — 사실이 틀린 문장을 고쳤다〕** `file.type` 이 `image/` 로 시작하거나 `isImageFilename(file.name)` 이 참이면 이미지로 본다. 둘의 합집합인 이유: 붙여넣은 캡쳐는 `type` 이 권위 있는 근거이고, 끌어온 파일은 플랫폼에 따라 `type` 이 빈 문자열일 수 있어 확장자가 유일한 근거다. `isImageFilename` 은 **이미 `web/rich.js:14` 가 export** 하고 `web/rich.d.ts:30` 이 선언한다. `web/app.js` 는 944행에서 이미 `./rich.js` 를 import 하고 있으므로(그 줄이 지금 가져오는 이름은 `createRichContext`·`buildInviteChoices`·`applyInviteResult`·`clearInviteResult`·`copyText` 다섯이고 `isImageFilename` 은 **그 안에 없다**) **그 목록에 이름 하나를 더하기만 한다** — 새 판정 함수를 만들지 않는다. 그래서 작성기의 미리보기 판정과 보낸 뒤의 표시 판정이 같은 자를 쓴다.

**D9 — 관측 대상의 이름을 SPEC 이 정한다. 〔0.2.0 신설〕** 「눈에 보이는 표시」나 「썸네일 칩」처럼 이름 없는 대상은 시험이 구현을 **검사**하지 못하고 **기록**하게 만든다(구현자가 고른 이름을 시험이 뒤따라 적는다). 그래서 세 이름을 여기서 글자로 못박는다: 드롭 표시는 `#composer-box` 에 붙는 클래스 **`drop-target`**, 썸네일 칩은 **`span.file-chip-image`**, 그 안의 그림은 **`img.file-chip-thumb`**. ✕ 버튼은 기존 `.file-chip-remove` 를 그대로 쓴다. 기존 코드의 상태 클래스가 `active`·`selected`·`turn-cont` 처럼 접두 없는 형용사이므로 `drop-target` 도 그 결을 따른다. 그리고 **썸네일 칩은 `.file-chip` 을 달지 않는다** — 달면 기존 `chipNames()`(`#file-chosen .file-chip` 의 첫 텍스트 노드, `web-chat.test.ts:741`)가 이미지 항목을 빈 이름으로 읽어 그 헬퍼의 의미가 조용히 바뀐다.

**D10 — 문서 가드의 1회성은 «문서에 남는 표지» 로 보장한다. 〔0.2.0 신설〕** §1.1 의 실측대로 문서 수준 청취자는 `loadApp` 마다 쌓인다 — 모듈 수준 플래그(`chatReady`)는 `vi.resetModules()` 를 넘지 못하기 때문이다. 그러므로 문서 가드는 **`document` 자신이 지니는 표지**를 보고 두 번째 배선을 스스로 거른다. 표지의 자리는 `document.documentElement.dataset.webattachGuard` 로 고정한다(실측: `document.body.innerHTML` 교체를 넘어 살아남는다). 기제를 고정하는 이유는 성질만 요구하면 관측할 방법이 남지 않기 때문이다 — jsdom 에는 청취자 개수를 세는 수단이 없고, 표지와 「두 번째 적재에서 `document.addEventListener` 가 다시 불리지 않았다」 두 가지가 관측 가능한 전부다(AC-WEBATT-013).

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 첨부 목록 | `web/app.js` 의 `pickedFiles` 배열. 「무엇이 나갈지」의 단일 출처 |
| 공용 편입 경로 | 파일 하나를 첨부 목록에 잇고 `renderPickedFiles()` 를 부르는 한 함수. 고르기·붙여넣기·끌어놓기 셋이 모두 여기로 들어온다 |
| 드롭 영역 | `#composer-box` 와 그 후손. D1 이 정한 유일한 받는 자리 |
| 파일 끌기 | `dataTransfer.types` 에 `Files` 가 들어 있는 끌기. 그렇지 않은 것은 「파일 아닌 끌기」 |
| 문서 가드 | 드롭 영역 밖에서 일어나는 **파일 끌기**의 `dragenter`·`dragover`·`drop` 기본 동작을 막되 첨부 목록은 바꾸지 않는 문서 수준 청취자 (D6). `document` 에 남는 표지로 한 번만 걸린다 (D10) |
| 이름 칩 | 오늘의 `span.file-chip` — 이름 텍스트 + `.file-chip-remove` ✕ |
| 썸네일 칩 | 이미지 항목의 표시. `span.file-chip-image` — `img.file-chip-thumb` + 같은 ✕. `.file-chip` 을 달지 않는다 (D9) |
| 드롭 표시 클래스 | `#composer-box` 에 붙는 `drop-target` (D9) |
| 객체 URL | `URL.createObjectURL(file)` 이 만든 blob URL. 회수하지 않으면 탭이 닫힐 때까지 메모리에 남는다 |

## 3. 요구사항 (GEARS)

주체 `<작성기>` 는 `web/app.js` 의 작성기 블록을 가리킨다. 번호 접두 `WEBATT` 는 `SPEC-WEBCHAT-001`(`REQ-WEBCHAT-*`)·`SPEC-WEBUI-001`(`REQ-WEBUI-*`)과의 충돌을 피하는 선택이다. 수용 기준 전문은 `acceptance.md` 가 갖는다.

### 3.1 붙여넣기

**REQ-WEBATT-001** (When — 이미지 붙여넣기)
**When** `#msg-input` 에 `paste` 가 발화하고 그 `clipboardData` 가 파일 항목을 하나 이상 실었으면, `<작성기>`는 그 파일들을 **공용 편입 경로**로 첨부 목록에 이어야 하고 그 붙여넣기의 기본 동작을 막아야 한다. 새 전송 경로를 만들지 않는다 — `sendMessage()` 는 한 글자도 바뀌지 않는다.

**REQ-WEBATT-002** (Ubiquitous — 캡쳐 파일명)
클립보드에서 나온 파일에 쓸 만한 이름이 없으면(`name` 이 비었거나 `image.png` 같은 기본값이면) `<작성기>`는 `스크린샷-YYYYMMDD-HHMMSS.<ext>` 형태의 이름을 현지 시각으로 만들어야 한다. `<ext>` 는 그 항목의 MIME 에서 뽑는다(`image/png`→`png`, `image/jpeg`→`jpg`, `image/gif`→`gif`, 그 밖은 MIME 의 서브타입). **그 이름은 첨부 목록에 들어가는 항목 자체가 갖는다** — 칩 라벨·`img.file-chip-thumb` 의 `alt`·전송 파트 이름 셋이 같은 문자열이다. `sendMessage()` 가 `pickedFiles` 를 그대로 싣고 한 글자도 바뀌지 않으므로(REQ-001·014), 이름을 갈아 끼우는 유일한 길은 편입 시점에 `File` 을 그 이름으로 다시 만드는 것이다. 확장자가 근거 없이 붙으면 서버가 확장자로 MIME 을 정하므로(`routes-messages.ts` MIME 표) 내려받기와 보낸 뒤 표시가 함께 어긋난다.

**REQ-WEBATT-003** (Ubiquitous — 붙여넣기의 겹침 규칙)
붙여넣기로 들어오는 파일은 `isSameFile()` 중복 제거를 거치지 않고 **항상** 첨부 목록에 이어야 한다(D7). 다만 **붙여넣기로 들어오는 항목의** 이름이 그 시점 목록의 어떤 이름과도 같지 않도록, 겹치면 `-2`, `-3` … 을 확장자 앞에 붙여야 한다. 같은 초에 두 번 붙여도 항목은 둘이고 이름은 서로 다르다. 이 규칙은 붙여넣기 경로에만 적용된다 — 고르기 경로는 이름을 보지 않으며 그 동작은 바뀌지 않는다(REQ-014, D7).

**REQ-WEBATT-004** (Unwanted — 평문 붙여넣기)
파일 항목이 없는 붙여넣기(평문·서식 있는 글)는 가로채서는 안 된다 — 기본 동작을 막지 않고 첨부 목록도 건드리지 않는다. 글자를 붙여넣는 일은 지금과 똑같이 작동한다.

**REQ-WEBATT-005** (Ubiquitous — 운영체제 분기 없음)
붙여넣기 처리는 표준 `paste` 이벤트와 그 `clipboardData` 만 읽어야 하며, 운영체제·브라우저·조합키를 가리는 분기를 두어서는 안 된다 — 즉 `navigator.platform`·`navigator.userAgent`·`navigator.vendor` 를 읽지 않고, 키 이벤트의 `metaKey`·`ctrlKey` 도 읽지 않는다. macOS 의 `Cmd+V` 와 Windows 의 `Ctrl+V` 는 같은 `paste` 를 만들므로 가를 것이 없다. (이 요구의 저장소 쪽 금지 — 「`web/app.js` 에 그 어간이 늘어나서는 안 된다」 — 는 §5 제약이 함께 싣는다.)

### 3.2 끌어놓기

**REQ-WEBATT-006** (When — 드롭 영역의 파일 드롭)
**When** 드롭 영역(`#composer-box` 또는 그 후손)에 `drop` 이 발화하고 **그 끌기가 파일을 실었으면**, `<작성기>`는 `dataTransfer.files` 의 **모든** 파일을 종류를 가리지 않고 공용 편입 경로로 첨부 목록에 이어야 하고 기본 동작을 막아야 한다. 이미지만 받지 않는다(운영자 지시: 드래그앤드롭은 모든 파일). 전건의 「파일을 실었으면」은 REQ-009 의 예외 조항이 아니라 이 요구 자체의 조건이다 — 영역 안에 글자를 끌어다 놓는 것은 여기에 해당하지 않는다.

**REQ-WEBATT-007** (While — 파일 끌기가 영역 위에 있는 동안)
**While** **파일을 실은** 끌기가 드롭 영역 위에 있는 동안, `<작성기>`는 (a) `dragover` 의 기본 동작을 막아 떨어뜨릴 수 있게 만들고 (b) `#composer-box` 에 클래스 **`drop-target`** 을 두어야 한다(D9). 들어옴(`dragenter`)과 나감(`dragleave`)은 깊이를 세어 짝을 맞춰야 한다 — 자식 요소 위를 지날 때마다 표시가 깜빡여서는 안 된다. 파일을 실은 `drop` 은 깊이를 0 으로 되돌리고 클래스를 걷는다. 파일이 아닌 끌기는 깊이도 표시도 건드리지 않는다.

**REQ-WEBATT-008** (When — 영역 밖의 파일 끌기)
**When** 파일을 실은 끌기가 드롭 영역 **밖** 문서 어딘가에서 `dragenter`·`dragover`·`drop` 을 발화시키면, `<작성기>`는 그 **세 이벤트의 기본 동작을 모두** 막아야 하고 첨부 목록을 바꾸어서는 안 된다(D6). `drop` 에만 막으면 그 `drop` 이 애초에 발화하지 않아 「페이지가 떨군 파일로 넘어가 쓰던 본문이 사라지는 사고」가 그대로 일어난다 — 세 이벤트를 함께 막는 것이 이 요구의 전부다. 「받지 않음」이지 「받음」이 아니다.

**REQ-WEBATT-009** (Unwanted — 파일이 아닌 끌기)
끌기가 파일을 싣지 않았으면(`dataTransfer.types` 에 `Files` 가 없으면) `<작성기>`는 **영역 안이든 밖이든** `dragenter`·`dragover`·`dragleave`·`drop` 어느 것도 가로채서는 안 되고, 드롭 표시도 깊이 카운터도 건드려서는 안 된다. 선택한 글자를 입력칸으로 끄는 것 같은 기본 동작이 그대로 살아 있어야 한다.

### 3.3 썸네일 미리보기

**REQ-WEBATT-010** (When — 이미지 항목의 표시)
**When** 첨부 목록의 항목이 이미지로 판정되면(`file.type` 이 `image/` 로 시작하거나 `isImageFilename(file.name)` 이 참 — D8), `<작성기>`는 이름 칩 대신 **썸네일 칩**을 그려야 한다: `span.file-chip-image` 안에 객체 URL 을 `src` 로 가진 `img.file-chip-thumb`, 그 뒤에 지금과 같은 `.file-chip-remove` ✕ 버튼. 썸네일 칩은 **`.file-chip` 클래스를 달지 않는다**(D9). `img` 의 `alt` 는 그 항목의 파일명이다. 썸네일 규칙은 `#file-chosen` 의 `opacity: 0.8`(실측: `web/style.css:472`)을 상속해 흐려지지 않도록 자기 불투명도를 1 로 되돌려야 한다. 이미지가 아닌 항목은 오늘의 `.file-chip` 이름 칩 그대로다(D3 — 기존 칩을 다시 설계하지 않는다).

**REQ-WEBATT-011** (Ubiquitous — 객체 URL 수명)
객체 URL 은 파일당 한 번만 만들어야 하고(다시 그린다고 새로 만들지 않는다), 그 항목이 ✕ 로 빠지거나 목록이 통째로 비워질 때 `URL.revokeObjectURL` 로 회수해야 한다. `renderPickedFiles()` 는 바뀔 때마다 목록 전체를 다시 그리므로, 그릴 때마다 새로 만들면 지운 만큼 새는 것이 아니라 **그린 횟수만큼** 샌다. 전송이 실패해 선택이 화면에 남는 경로(`sendMessage()` 의 `catch` — 성공했을 때만 `clearPickedFiles()` 를 부른다)에서는 회수해서는 안 된다. 회수하면 화면에 남은 썸네일이 죽은 URL 을 가리킨다.

**REQ-WEBATT-012** (Where — 객체 URL 을 못 만드는 환경)
**Where** `URL.createObjectURL` 이 없는 환경이면, `<작성기>`는 예외를 던지지 않고 그 항목을 이름 칩으로 되돌려 그려야 한다. 근거는 「jsdom 에 그 API 가 없다」가 **아니다** — 시험이 도는 vitest jsdom 환경에는 있다(§1.1 실측, 0.2.0 정정). 근거는 그리기 경로의 폭발 반경이다: `renderPickedFiles()` 는 목록 전체를 다시 그리는 한 함수이므로 그 안에서 던진 예외 하나가 **첨부 목록 표시 전체**를 무너뜨리고, 그 상태에서는 사용자가 무엇이 나갈지 볼 수도 ✕ 로 뺄 수도 없다. 이 API 가 없거나 던지는 실제 런타임을 이 SPEC 은 **관측하지 못했다** — 관측되지 않은 환경을 근거로 들지 않고, 「그리기 경로는 어떤 이유로도 던지지 않는다」는 성질 자체를 요구한다.

**REQ-WEBATT-013** (Ubiquitous — 파일명은 글자로만)
파일명이 화면에 닿는 모든 자리(이름 텍스트, `img.file-chip-thumb` 의 `alt`, `title`, ✕ 의 `aria-label`)는 `textContent`·`append`·`alt` 대입으로만 채워야 하고 마크업 조립 API 를 써서는 안 된다. 파일명은 사용자가 고르는 값이다 — 오늘 `renderPickedFiles()` 가 지키는 경계(REQ-WEBRICH-005 와 같은 부류)를 썸네일 분기도 그대로 지킨다.

### 3.4 비회귀와 경계

**REQ-WEBATT-014** (Ubiquitous — 기존 표면 무변경과 배선 1회성)
기존 경로는 한 글자도 달라지지 않아야 한다: 클립 버튼 → `#file-input` → `onFilePicked()` 의 고르기, 여러 번 나눠 고르기, `isSameFile()` 중복 제거, ✕ 하나만 빼기, 전송 성공 뒤 비우기, 그리고 `refreshSendState()` 의 `aria-disabled` 전용 의미(`disabled` 속성은 끝까지 쓰지 않는다 — REQ-WEBUI-011 [HARD]). 요소 수준의 새 청취자는 기존 `chatReady` 블록 안에서 걸어야 한다(REQ-WEBCHAT-016). **문서 수준 청취자는 `document` 자신이 지니는 표지(`document.documentElement.dataset.webattachGuard`)를 보고 같은 문서에 두 번 걸리지 않아야 한다** — 모듈 수준 플래그는 모듈이 다시 적재되면 초기화되므로 이 성질을 보장하지 못한다(§1.1 실측, D10). 또한 썸네일 칩이 `.file-chip` 을 달지 않으므로(D9) 기존 시험 헬퍼 `chipNames()` 의 의미는 「이미지가 아닌 칩의 이름들」로 그대로 유지된다.

**REQ-WEBATT-015** (Unwanted — 새 상한 없음)
`<작성기>`는 파일의 크기나 개수를 이유로 어떤 항목도 거절해서는 안 된다(D4). 서버의 파일당 100MB 멀티파트 상한이 유일한 경계이며 이미 존재한다. (이 요구의 저장소 쪽 금지 — 「`server/src` 를 한 줄도 고치지 않는다」 — 는 §5 제약이 함께 싣는다.)

## 4. 범위 밖 (Exclusions)

### Out of Scope — 서버 계층

- `server/src/` 전체 무변경 — `routes-messages.ts` 의 100MB 상한·`basename()` 봉인·MIME 표를 읽기만 한다
- 새 업로드 엔드포인트, 조각 업로드, 진행률 보고
- 서버 쪽 이미지 리사이즈·썸네일 생성·EXIF 처리
- 서버 MIME 표에 `.webp` 를 더하는 일 (§6 이 그 갈림을 기록만 한다)

### Out of Scope — 보낸 뒤의 표시

- 메시지 목록 안 첨부 렌더링(`web/rich.js` `buildAttachmentNode`, `img.attachment-image`) — 이미 있고 이 SPEC 이 고치지 않는다
- 이미지 확대 보기(라이트박스), 내려받기 UI, 첨부 삭제 API

### Out of Scope — 작성기의 다른 기능

- 붙여넣은 이미지의 편집(자르기·주석·회전)
- 본문 안 인라인 이미지 삽입(마크다운 `![]()` 자동 작성) — 첨부 목록에만 들어간다
- 붙여넣기 진행 표시·업로드 미리보기 진척바
- 폴더 드롭의 재귀 펼치기 — 떨군 폴더는 브라우저가 `dataTransfer.files` 에 주는 그대로만 다룬다(§6 알려진 한계)
- 고르기 경로에 이름 유일성을 강제하는 일 — REQ-014 와 충돌한다(D7, §6)
- 자동완성 드롭다운(`#autocomplete`)·멘션 배지·마크다운 렌더러 표면

### Out of Scope — 새 제한과 새 토큰

- 클라이언트 쪽 파일 크기·개수·총합 상한 (D4 — 운영자 지시로 두지 않는다)
- 새 디자인 토큰 추가 — `web/design-tokens.css` 무변경. 썸네일 치수·모서리는 기존 `var(--md-*)` 토큰으로만 짠다

## 5. 제약

| 제약 | 내용 |
|------|------|
| 의존성 | 외부 라이브러리 없음. 빌드 단계 없는 바닐라 ES 모듈 |
| 개발 방식 | TDD(`quality.yaml` `constitution.development_mode: tdd` — 실측 확인) — AC 블록이 먼저 붉게 실패한다 |
| 테스트 | 기존 파일 `server/test/web-chat.test.ts` 에 추가. 새 시험 파일을 만들지 않는다 |
| 시험 환경 | vitest + jsdom 29.1.1 / Node v24.12.0. `ClipboardEvent`·`DataTransfer`·`DragEvent` 는 **없고**, `URL.createObjectURL`·`revokeObjectURL` 은 **있다**(§1.1 실측). 셋은 `Object.defineProperty` 로 심고, 객체 URL 은 세려면 덮어쓰고 「없는 환경」을 보려면 지웠다 되돌린다 |
| 저장소 무변경 (REQ-005) | `web/app.js` 안의 `navigator.platform`·`navigator.userAgent`·`navigator.vendor`·`metaKey`·`ctrlKey` 출현 횟수는 전부 **0 을 유지한다**(오늘도 0 — 실측) |
| 저장소 무변경 (REQ-015) | `server/src` 를 한 줄도 고치지 않는다. `plan.md §A.7` PRESERVE 목록 전체가 같은 성질을 갖는다 |
| 형 검사 | `npm run typecheck -w server` 종료 코드 0 |
| 색·치수 | `var(--md-*)` 토큰만. 새 토큰 0개, 16진수 색 리터럴 0건 |
| 언어 | 코드 주석 한국어. 커밋 메시지 한국어(`language.yaml`) |

## 6. 알려진 한계 (결함이 아니라 기록)

- **폴더 드롭.** 브라우저마다 떨군 폴더를 `dataTransfer.files` 에 0바이트 유사 파일로 넣거나 아예 빼놓는다. 이 SPEC 은 `webkitGetAsEntry()` 로 펼치지 않으므로, 폴더를 떨구면 「아무 일도 안 일어나거나」 「0바이트 항목이 하나 생긴다」. jsdom 에서 재현할 수 없어 기계 판정 기준을 두지 않는다 — `acceptance.md` HO-3 의 사람 관측 항목이다.
- **`type` 이 빈 파일과 `.webp` 의 갈림.** 확장자도 이미지가 아니면 이름 칩으로 남는다. 작성기의 판정표(`web/rich.js:11` `IMAGE_EXTENSIONS`)와 서버의 MIME 표(`server/src/routes-messages.ts:12-23`)는 `.png`/`.jpg`/`.jpeg`/`.gif` 에서 **일치하고 `.webp` 에서 갈린다** — 앞은 `.webp` 를 포함하고 뒤는 포함하지 않아 `.webp` 는 `application/octet-stream` 으로 내려간다(실측: `grep -rn webp server/src` 0건). 그래서 `.webp` 는 작성기에서 썸네일로 보이지만 보낸 뒤에는 이미지로 그려지지 않는다. 서버 MIME 표는 이 SPEC 의 범위 밖이다(§4).
- **붙여넣기와 고르기 사이의 이름 겹침.** 이름 유일성은 붙여넣기 경로에만 강제된다(D7·REQ-003). 붙여넣은 `스크린샷-….png` 뒤에 사용자가 디스크에서 같은 이름의 파일을 고르면 목록에 같은 이름 둘이 남는다 — 고르기 경로는 `isSameFile` 만 보고 이름을 보지 않으며, 그 경로의 무변경이 REQ-014 다.
- **문서 가드의 사정거리.** 가드는 문서 전체의 «파일 끌기» 에 조건 없이 걸린다. 오늘은 무해하다 — 유일한 파일 입력 `#file-input` 이 드롭 영역 안에 있다(`web/index.html:77`, 실측). 그러나 앞으로 드롭 영역 밖에 파일 입력이나 파일 드롭을 받는 표면이 생기면 이 가드가 그 기본 동작을 조용히 삼킨다. **결정: 오늘은 예외를 두지 않는다** — 예외(예: `input[type=file]` 을 대상으로 하는 드롭을 통과시키기)는 존재하지 않는 표면을 위한 분기이고, 그 표면을 만드는 SPEC 이 이 한 줄을 근거로 함께 다루는 것이 옳다.
- **실제 OS 클립보드.** jsdom 은 진짜 `ClipboardEvent` 를 만들 수 없으므로 「맥·윈도우에서 실제로 캡쳐가 붙는다」는 사람이 눈으로 봐야 한다(HO-1). 이것이 이 SPEC 의 **가장 큰 잔여 위험**이며, `acceptance.md §D` 가 그 관문을 글자로 적는다.

## 7. 참조

- 첨부 목록 소유자·기존 고르기 경로: `SPEC-WEBCHAT-001` (`pickedFiles`, `onFilePicked`, `isSameFile`, `renderPickedFiles`, `clearPickedFiles`)
- 작성기 레이아웃·`aria-disabled` 계약: `SPEC-WEBUI-001` (REQ-WEBUI-009 `#composer-box`, REQ-WEBUI-011 [HARD])
- 보낸 뒤 첨부 표시·`isImageFilename`: `SPEC-WEBRICH-001` (`web/rich.js`, `web/rich.d.ts`)
- 서버 멀티파트 계약: `SPEC-MSG-001` (`server/src/routes-messages.ts` — 100MB 상한, `basename()` 봉인, MIME 표)
- 기존 시험: `server/test/web-chat.test.ts` (`pickFiles`/`chipNames` 이음매 — 수정 없이 초록 유지가 전제), `server/test/css-rule.ts` (`cssRuleBlock` — 주석을 먼저 벗기므로 관측은 셀렉터 단위로만 가능하다)
- 계획 감사 보고서: `.moai/reports/plan-audit/SPEC-WEBATTACH-001-2026-09-11.md` (0.2.0 개정의 출처)
