# SPEC-WEBMD-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**다. 판정은 이분법이다.

주 판정 명령은 셋이다.

```bash
cd server && npx vitest run test/web-markdown.test.ts   # AC-001 ~ AC-013
npm run typecheck -w server                             # AC-015 후반
npm test                                                # AC-016 (워크스페이스 전체, CI 와 같다)
```

새 테스트 파일은 `server/test/web-markdown.test.ts` 다. **1행에 `// @vitest-environment jsdom` 도크블록**을 두고 `web/` 소스를 직접 import 한다 — `server/test/web-rich.test.ts` 11행 관례 그대로다.

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderMarkdown, parseBlocks, renderInline, safeHref, codeLangToken } from '../../web/markdown.js'

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web')

// 프래그먼트를 붙일 자리 하나 — 선택자로 관측하기 위해서다
function render(src: string): HTMLElement {
  const host = document.createElement('div')
  host.appendChild(renderMarkdown(src, document))
  return host
}
```

## 이 문서가 지키려는 것 — 빈 구현과 «전부 막기» 구현이 둘 다 떨어지게

| 잘못된 구현 | 통과할 뻔한 기준 | 막는 관측 |
|-------------|-----------------|-----------|
| `safeHref` 가 **항상** `null`(전부 막기) | AC-006 전반 | AC-006 후반이 정상 `https://good.example` 에 대해 `a` 1개와 `href` 일치를 본다 |
| 차단된 링크를 **조용히 삼킴** | AC-006 전반(“`a` 0개”) | AC-006 이 같은 `it` 에서 원문 텍스트 잔존을 함께 본다 |
| 마크다운을 아예 그리지 않고 `textContent` 만 넣음(오늘의 동작) | AC-005 평문 항등 · AC-010 · AC-016 | AC-001~004 가 실제 요소를 세고, AC-014 가 `pre-wrap` 제거를 본다 |
| 폴백이 예외를 **조용히** 삼킴 | AC-012 전반(“메시지가 남는다”) | AC-012 가 `.md-fallback` 클래스 **와** 후속 렌더 지속을 함께 본다 |
| 링크 힌트를 **한 번도** 붙이지 않음 | — | AC-008 이 위장 입력에서 힌트 존재를, 자동링크에서 힌트 부재를 **양쪽으로** 본다 |
| 힌트를 **항상** 붙임 | AC-008 전반 | 같은 `it` 의 자동링크 절과 「URL 형이 아닌 라벨」 절이 `.md-link-host` 0개를 본다 |
| 라벨 판별을 `^https?://` 로만 구현(스킴 없는 위장을 못 잡음) | AC-008 의 스킴 붙은 절 전부 | AC-008 이 `[good.example/settings](https://evil.example/x)` 를 직접 먹여 힌트 1개를 본다 — 실제 피싱에 가장 흔한 형태다 |
| `safeHref` 가 **사전 정제를 건너뜀** | AC-006 의 적대적 목록(전부 fail-closed 라 통과한다) | AC-006 의 **양성 방향** 절이 BOM·제로폭·방향 제어가 앞에 붙은 정상 URL 의 통과를 본다 — 정제하지 않으면 `^https?://` 에 걸려 `null` 이 된다 |

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 | 판정 |
|----|----------|------|-------------|------|
| AC-WEBMD-001 | REQ-003 | vitest | 제목 6단 · `#######` 문단 · 강조 3종 · 미닫힘 리터럴 · 코드스팬 우선 | 자동 |
| AC-WEBMD-002 | REQ-003, REQ-009 | vitest | 펜스: `md-lang-js` · 미닫힘 자동종료 · 코드 안 마커 미해석 · 본문 정확 일치 | 자동 |
| AC-WEBMD-003 | REQ-003 | vitest | `ul`/`ol`(`start`) · 중첩 2단 · 인용 중첩 · `---`→`hr`, `--`→문단 | 자동 |
| AC-WEBMD-004 | REQ-003, REQ-014 | vitest | 표 정렬 3종 · `.md-table-wrap` 존재 · 구분 행 없으면 문단 | 자동 |
| AC-WEBMD-005 | REQ-010 | vitest | `p` 2 / `p`1+`br`1 · 앞뒤 공백 노드 0 · 평문 항등 | 자동 |
| AC-WEBMD-006 | REQ-006 | vitest | 적대적 입력 전부 `null`(BOM·제로폭·방향 제어 변형 포함) · **보이지 않는 문자가 앞에 붙은 정상 URL 은 정제 뒤 통과** · 차단 시 `a` 0 **그리고** 원문 잔존 · 정상은 통과 | 자동 |
| AC-WEBMD-007 | REQ-007, REQ-005 | vitest + 소스 읽기 | `noopener`·`noreferrer` 각각 · `target` · `title`; 소스에 리터럴 아닌 `setAttribute` 이름 0건 **그리고** 리터럴 아닌 `createElement` 태그 이름 0건 | 자동 |
| AC-WEBMD-008 | REQ-008 | vitest | 스킴 있는·**스킴 없는** 위장 라벨 둘 다 `.md-link-host`=진짜 호스트 · **URL 형이 아닌 라벨 0개** · 같은 호스트 0개 · 자동링크 0개 · 파싱 실패 시 표시 · bidi 치환 | 자동 |
| AC-WEBMD-009 | REQ-009 | vitest | `hidden msg-body`→`hidden`; `<script>`·21자·빈 문자열·공백·`undefined` → `null`; `JS`→`js` · `c++`→`c++` | 자동 |
| AC-WEBMD-010 | REQ-004, REQ-005 | vitest + 소스 읽기 | `img` 0 · `__pwned` undefined · `![]()` 리터럴 · `web/` 의 **모든** `.js`(`readdirSync` 로 도출)에 금지 API 0건 | 자동 |
| AC-WEBMD-011 | REQ-012 | vitest | 브로커 4줄 → 버튼 2개; 미닫힘 펜스 접두 변형도 2개; **`doc` 비변형**(노드는 반환 fragment 안에만); 메시지 간 파서 상태 초기화 | 자동 |
| AC-WEBMD-012 | REQ-011 | vitest | 던지는 렌더러 → `.md-fallback`+원문, 메시지 생존, 후속 렌더 지속 | 자동 |
| AC-WEBMD-013 | REQ-013 | vitest | 깊이 폭탄 둘 · 인라인 폭탄 · 30,000자가 **종료**(판정자는 러너 타임아웃) · 길이 상한 적용; 표 열/행 상한 | 자동 |
| AC-WEBMD-014 | REQ-010, REQ-014 | vitest(readFileSync) | `.msg-body` 에 `pre-wrap` 0 · `.md-fallback` 있음 · `overflow-x:auto` · `max-content` · 16진수 0건 | 자동 |
| AC-WEBMD-015 | REQ-001 | vitest + bash | export 다섯 · `DocumentFragment` 반환 · `markdown.d.ts` 존재 · typecheck 종료 코드 0 | 자동 |
| AC-WEBMD-016 | REQ-002, REQ-015 | bash + vitest | 기존 웹 테스트 네 파일 diff 0줄 · `npm test` 초록 · 훅 노드가 `.msg-body` 밖 형제 | 자동 |

---

## Given-When-Then 시나리오

### AC-WEBMD-001 — 제목과 인라인 강조, 그리고 리터럴화

**Given** 렌더러가 제목과 강조를 해석한다.
**When** 아래를 추가하고 판정 명령을 실행한다.

```ts
it('renders headings and inline emphasis, and leaves unclosed markers literal', () => {
  const h = render('# 하나\n\n###### 여섯\n\n####### 일곱')
  expect(h.querySelectorAll('h1').length).toBe(1)
  expect(h.querySelector('h1')!.textContent).toBe('하나')
  expect(h.querySelectorAll('h6').length).toBe(1)
  // 7개는 제목이 아니다 — 원문 그대로 문단
  expect(h.querySelectorAll('h7' as never).length).toBe(0)
  expect(h.textContent).toContain('####### 일곱')

  const e = render('**굵게** *기울임* ~~취소~~')
  expect(e.querySelectorAll('strong').length).toBe(1)
  expect(e.querySelectorAll('em').length).toBe(1)
  expect(e.querySelectorAll('s').length).toBe(1)
  // 굵게는 b 가 아니다 — web-chat.test.ts:313 의 `#messages b` 0 단언이 이것에 기댄다
  expect(e.querySelectorAll('b').length).toBe(0)

  // 닫는 마커가 없으면 즉시 리터럴 (백트래킹 없음)
  const u = render('**안 닫힘 그리고 *이것도')
  expect(u.querySelectorAll('strong, em').length).toBe(0)
  expect(u.textContent).toBe('**안 닫힘 그리고 *이것도')

  // 코드스팬이 강조보다 우선한다
  const c = render('`**코드 안**`')
  expect(c.querySelectorAll('code').length).toBe(1)
  expect(c.querySelectorAll('strong').length).toBe(0)
  expect(c.querySelector('code')!.textContent).toBe('**코드 안**')
})
```

**Then** 통과한다. 마크다운을 그리지 않는 구현은 첫 단언에서, `b` 를 만드는 구현은 다섯째에서, 백트래킹하는 구현은 리터럴 단언에서, 코드스팬 우선순위가 틀린 구현은 마지막 셋에서 떨어진다.

### AC-WEBMD-002 — 펜스 코드블록

**Given** 코드블록 안의 마커는 문법이 아니다.
**When**:

```ts
it('renders fenced code with a validated language token and never parses inside it', () => {
  const src = '```js\n# 제목 아님\n| a | b |\n--- \n```'
  const h = render(src)
  const pre = h.querySelector('pre.md-pre')!
  expect(pre).not.toBeNull()
  expect(h.querySelectorAll('h1, table, hr').length).toBe(0)   // 코드 안 마커 전부 미해석
  // 코드 본문은 원문 그대로 (앞뒤 개행이 덧붙지 않는다)
  expect(pre.querySelector('code')!.textContent).toBe('# 제목 아님\n| a | b |\n--- ')
  expect(pre.querySelector('code')!.className).toContain('md-lang-js')

  // 미닫힘 펜스는 입력 끝에서 자동 종료된다 — 뒤 내용을 삼키지 않고 코드로 담는다
  const open = render('```\n닫히지 않음\n계속')
  expect(open.querySelectorAll('pre').length).toBe(1)
  expect(open.textContent).toContain('닫히지 않음')
  expect(open.textContent).toContain('계속')

  // 언어 토큰이 없으면 클래스도 라벨도 없다
  const plain = render('```\nx\n```')
  expect(plain.querySelectorAll('[class*="md-lang-"]').length).toBe(0)
})
```

**Then** 통과한다. `scanFence` 가 최우선이 아닌 구현은 둘째 단언(`h1, table, hr` 0개)에서 즉시 떨어진다.

### AC-WEBMD-003 — 목록 · 인용 · 수평선

**Given** 목록과 인용은 안쪽에 다시 블록을 담는다.
**When**:

```ts
it('renders lists (nested, ordered with start), quotes, and horizontal rules', () => {
  const l = render('- 하나\n- 둘\n  - 둘의 하위\n')
  expect(l.querySelectorAll('ul').length).toBe(2)          // 바깥 + 중첩
  expect(l.querySelector('ul li ul li')).not.toBeNull()

  const o = render('3. 셋\n4. 넷')
  const ol = o.querySelector('ol') as HTMLOListElement
  expect(ol).not.toBeNull()
  expect(ol.getAttribute('start')).toBe('3')

  const q = render('> 바깥\n> > 안쪽')
  expect(q.querySelectorAll('blockquote').length).toBe(2)
  expect(q.querySelector('blockquote blockquote')).not.toBeNull()

  expect(render('---').querySelectorAll('hr').length).toBe(1)
  expect(render('-----').querySelectorAll('hr').length).toBe(1)
  // 두 개는 수평선이 아니다 — 문단
  const two = render('--')
  expect(two.querySelectorAll('hr').length).toBe(0)
  expect(two.textContent).toBe('--')
})
```

**Then** 통과한다. 중첩을 평탄화하는 구현은 `ul` 개수 2 에서, `start` 를 버리는 구현은 셋째에서 떨어진다.

### AC-WEBMD-004 — GFM 표와 가로 스크롤 상자

**Given** 다음 줄이 구분 행일 때만 표다.
**When**:

```ts
it('renders GFM tables with alignment inside a scroll wrapper, and only with a delimiter row', () => {
  const t = render('| 왼 | 가운데 | 오른 |\n|:---|:---:|---:|\n| 1 | 2 | 3 |')
  expect(t.querySelectorAll('div.md-table-wrap > table.md-table').length).toBe(1)
  expect(t.querySelectorAll('thead th').length).toBe(3)
  expect(t.querySelectorAll('tbody td').length).toBe(3)
  const heads = [...t.querySelectorAll('thead th')].map(n => n.className)
  expect(heads[1]).toContain('md-al-center')
  expect(heads[2]).toContain('md-al-right')
  expect(heads[0]).not.toContain('md-al-')

  // 구분 행이 없으면 표가 아니다 — | 를 쓴 평범한 문장이 표가 되면 안 된다
  const p = render('| 이건 | 표가 아니다 |\n| 그냥 문장 |')
  expect(p.querySelectorAll('table').length).toBe(0)
})
```

**Then** 통과한다. `.md-table-wrap` 없이 `table` 만 만드는 구현은 첫 단언에서 떨어진다(가로 스크롤 상자가 사라지기 때문이다).

### AC-WEBMD-005 — 줄바꿈 계약과 평문 항등

**Given** 줄바꿈 책임이 `white-space: pre-wrap` 에서 `p`/`br` 노드로 옮겨졌다.
**When**:

```ts
it('expresses line breaks as nodes and adds no stray whitespace', () => {
  const blank = render('a\n\nb')
  expect(blank.querySelectorAll('p').length).toBe(2)
  expect(blank.querySelectorAll('br').length).toBe(0)

  const single = render('a\nb')
  expect(single.querySelectorAll('p').length).toBe(1)
  expect(single.querySelectorAll('br').length).toBe(1)   // 채팅 관례 — Enter 한 번이 무시되지 않는다

  // 프래그먼트 앞뒤에 공백 텍스트 노드가 없다.
  // web-chat.test.ts:226 의 정확 일치 단언(toBe('사람'))이 이것에 기댄다.
  const frag = renderMarkdown('사람', document)
  expect(frag.firstChild!.nodeType).toBe(Node.ELEMENT_NODE)
  expect(frag.lastChild!.nodeType).toBe(Node.ELEMENT_NODE)
  expect(frag.textContent).toBe('사람')                   // 평문 항등

  // [주의] 여러 줄 본문은 br 이 되므로 textContent 에서 '\n' 이 사라진다.
  // 나중에 다중 줄 .msg-body 단언을 추가하는 사람이 이 사실을 먼저 읽도록 여기 못박는다.
  expect(renderMarkdown('a\nb', document).textContent).toBe('ab')
})
```

**Then** 통과한다. 블록 사이에 개행 텍스트 노드를 남기는 구현은 `firstChild`/`lastChild` 단언에서 떨어지고, 그것이 기존 `web-chat.test.ts:226` 을 깨는 것을 여기서 먼저 잡는다.

### AC-WEBMD-006 — URL 스킴 세 겹 검사

**Given** `a.href = 공격자문자열` 하나로 `javascript:` 가 살아난다. 브라우저가 스킴 안의 TAB/LF/CR 을 무시하므로 정제가 판정보다 **먼저** 와야 한다.
**When**:

```ts
it('rejects every non-http(s) href, and leaves the source text instead of a dead link', () => {
  for (const bad of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>1</script>',
    'vbscript:msgbox',
    '//evil.example/x',
    '/relative',
    '#frag',
    '\uFEFFjavascript:alert(1)',      // BOM
    '\u200Bjavascript:alert(1)',      // 제로폭 공백
    '\u202Ejavascript:alert(1)',      // 방향 제어 (RTL override)
  ]) {
    expect(safeHref(bad)).toBeNull()
  }
  // 전부 막기 구현을 배제한다 — 정상 URL 은 통과해야 한다
  expect(safeHref('https://good.example/a?b=1')).toBe('https://good.example/a?b=1')
  expect(safeHref('http://good.example/')).toBe('http://good.example/')

  // [양성 방향] REQ-WEBMD-006 1단계의 정제 집합이 실제로 지워지는지는 여기서만 갈린다.
  // 위 목록은 전부 fail-closed 라(정제를 안 해도 2단계 화이트리스트가 막는다) 판별력이 없다.
  // 아래 셋은 반대 방향이다 — 정제하지 않는 구현에서는 ^https?:// 에 걸리지 않아 null 이 된다.
  expect(safeHref('\uFEFFhttps://good.example/a')).toBe('https://good.example/a')   // BOM
  expect(safeHref('\u200Bhttps://good.example/a')).toBe('https://good.example/a')   // 제로폭
  expect(safeHref('\u202Ehttps://good.example/a')).toBe('https://good.example/a')   // 방향 제어

  // 차단된 링크: a 를 만들지 않고 [텍스트](url) 원문을 텍스트로 남긴다 (삼키지 않는다)
  const h = render('앞 [누르세요](javascript:alert(1)) 뒤')
  expect(h.querySelectorAll('a').length).toBe(0)
  expect(h.textContent).toContain('[누르세요](javascript:alert(1))')

  const ok = render('[링크](https://good.example/x)')
  expect(ok.querySelectorAll('a').length).toBe(1)
  expect(ok.querySelector('a')!.getAttribute('href')).toBe('https://good.example/x')
})
```

**Then** 통과한다. 정제 없이 접두만 보는 구현은 `java\tscript:` 에서 떨어지고, 정제 집합에서 BOM·제로폭·방향 제어를 빼먹은 구현은 **양성 방향 절 셋**에서 떨어진다(그 셋이 없으면 REQ-WEBMD-006 1단계의 절반을 재는 기준이 하나도 없다 — 음성 목록은 전부 fail-closed 라 정제 유무를 가르지 못한다). 전부 막는 구현은 정상 URL 두 단언에서, 조용히 삼키는 구현은 원문 잔존 단언에서 떨어진다.

### AC-WEBMD-007 — 앵커 속성과 속성 이름 화이트리스트

**Given** `noopener` 가 없으면 새 탭이 `window.opener` 로 원본 창을 조작한다.
**When**:

```ts
it('sets the anchor safety attributes and never uses an attacker-controlled attribute name', () => {
  const a = render('[링크](https://good.example/x)').querySelector('a')!
  const rel = (a.getAttribute('rel') ?? '').split(/\s+/)
  expect(rel).toContain('noopener')        // 각각 본다 — 하나만 있는 구현을 배제
  expect(rel).toContain('noreferrer')
  expect(a.getAttribute('target')).toBe('_blank')
  expect(a.getAttribute('title')).toBe('https://good.example/x')

  // 속성 이름이 변수인 형태가 모듈 전체에 없다 (REQ-WEBMD-005)
  const src = readFileSync(join(webDir, 'markdown.js'), 'utf8')
  expect(src.length).toBeGreaterThan(0)                       // 빈 파일로 공허하게 통과하지 않게
  expect(src).not.toMatch(/setAttribute\s*\(\s*[^'"`)]/)      // 리터럴 아닌 첫 인자 금지
  expect(src).not.toMatch(/dataset\s*\[/)

  // 요소 «이름» 축도 같은 방식으로 묶는다 (REQ-WEBMD-005) — 속성 이름만 묶고
  // 태그 이름을 열어 두면 입력 유래 문자열이 createElement 로 흘러갈 구멍이 남는다.
  expect(src).not.toMatch(/createElement\s*\(\s*[^'"`)]/)     // 리터럴 아닌 태그 이름 금지
  for (const banned of ['img', 'script', 'iframe', 'object', 'embed', 'style', 'form']) {
    expect(src).not.toMatch(new RegExp(`createElement\\s*\\(\\s*['"\`]${banned}['"\`]`, 'i'))
  }
})
```

**Then** 통과한다. `rel="noreferrer"` 만 두는 구현은 첫 단언에서 떨어진다 — 두 토큰을 하나의 문자열 비교로 묶으면 이 구별이 사라지므로 **각각** 본다. 마지막 두 단언은 속성 이름 축과 **대칭을 맞춰** 요소 이름 축을 기계로 묶는다 — `createElement(변수)` 를 쓰거나 금지 요소를 직접 만드는 구현은 여기서 떨어진다.

### AC-WEBMD-008 — 라벨 위장과 진짜 호스트 힌트

**Given** `[https://good.example](https://evil.example)` 는 정상 마크다운이라 파서로는 막을 수 없다. 방어는 표시층이다.
**When**:

```ts
it('reveals the real host when the label impersonates a different URL', () => {
  const spoof = render('[https://good.example/settings](https://evil.example/x)')
  const hint = spoof.querySelector('.md-link-host')
  expect(hint).not.toBeNull()
  expect(hint!.textContent).toContain('evil.example')       // 진짜 호스트

  // 라벨과 호스트가 같으면 힌트가 없다 — 항상 붙이는 구현을 배제
  const same = render('[https://good.example/a](https://good.example/b)')
  expect(same.querySelectorAll('.md-link-host').length).toBe(0)

  // 자동링크는 라벨 == href 이므로 힌트가 없다
  const auto = render('https://good.example/x')
  expect(auto.querySelectorAll('a').length).toBe(1)
  expect(auto.querySelectorAll('.md-link-host').length).toBe(0)

  // [스킴 없는 위장] 실제 피싱에 가장 흔한 형태다. 판별 술어를 ^https?:// 로만
  // 구현한 렌더러는 위 절들을 전부 통과하면서 여기서만 떨어진다.
  const bare = render('[good.example/settings](https://evil.example/x)')
  expect(bare.querySelectorAll('.md-link-host').length).toBe(1)
  expect(bare.querySelector('.md-link-host')!.textContent).toContain('evil.example')
  const www = render('[www.good.example](https://evil.example)')
  expect(www.querySelectorAll('.md-link-host').length).toBe(1)
  // [맨 호스트] 슬래시도 www 도 없는 형태. 위 두 절만 보고 술어를 «슬래시형 또는
  // www 형» 으로 좁힌 구현은 REQ-008 을 위반하면서도 여기가 없으면 기계로 잡히지
  // 않는다 — 술어의 정의역 전체를 기준 안으로 들인다 (감사 2회차 D1 잔여).
  const host = render('[good.example](https://evil.example)')
  expect(host.querySelectorAll('.md-link-host').length).toBe(1)
  expect(host.querySelector('.md-link-host')!.textContent).toContain('evil.example')

  // [URL 형이 아닌 라벨] 평범한 문장은 URL 을 흉내 내지 않으므로 힌트가 없다.
  // 이 절이 없으면 «모든 링크에 힌트» 구현이 다시 들어오고, 힌트가 흔해져
  // 정작 위장 사례에서 눈에 띄지 않는다.
  const prose = render('[보고서 보기](https://evil.example/x)')
  expect(prose.querySelectorAll('a').length).toBe(1)
  expect(prose.querySelectorAll('.md-link-host').length).toBe(0)

  // URL 처럼 생겼지만 파싱되지 않는 라벨 → fail-loud (표시하는 쪽)
  const broken = render('[https://](https://evil.example/x)')
  expect(broken.querySelectorAll('.md-link-host').length).toBe(1)

  // 라벨의 방향 제어 문자는 치환된다 (라벨에만)
  const bidi = render('[a\u202Eb](https://good.example/x)')
  expect(bidi.querySelector('a')!.textContent).not.toContain('\u202E')
})
```

**Then** 통과한다. 힌트를 한 번도 안 붙이는 구현은 첫 절에서, 항상 붙이는 구현은 둘째·셋째 절과 「URL 형이 아닌 라벨」 절에서 떨어진다 — 양방향이라 어느 쪽 상수 함수도 통과하지 못한다. 그리고 양방향 배제만으로는 부족하다 — 정의역이 실제 위협보다 좁으면 양쪽 끝이 다 맞아도 방어에 구멍이 남으므로, **스킴 없는 위장 절 둘**이 그 정의역을 넓힌다.

### AC-WEBMD-009 — 코드블록 언어 토큰 검증

**Given** 검증이 없으면 공격자가 이 앱의 기존 클래스를 얻고, 빈/공백 토큰이 `classList.add` 에서 `DOMException` 을 던져 렌더 전체가 폴백으로 떨어진다.
**When**:

```ts
it('validates the code fence language token', () => {
  expect(codeLangToken('hidden msg-body')).toBe('hidden')   // 첫 단어만 — 공백으로 두 클래스를 얻지 못한다
  expect(codeLangToken('<script>')).toBeNull()
  expect(codeLangToken('  ')).toBeNull()
  expect(codeLangToken('')).toBeNull()
  expect(codeLangToken(undefined)).toBeNull()
  expect(codeLangToken('a'.repeat(21))).toBeNull()          // 20자 초과
  expect(codeLangToken('-nope')).toBeNull()                 // 첫 글자 제약
  expect(codeLangToken('JS')).toBe('js')
  expect(codeLangToken('c++')).toBe('c++')

  // 사용부는 고정 접두사로만 클래스를 만든다 — 기존 앱 클래스를 얻을 수 없다
  const h = render('```hidden msg-body\nx\n```')
  const code = h.querySelector('pre code')!
  expect(code.classList.contains('hidden')).toBe(false)
  expect(code.classList.contains('msg-body')).toBe(false)
  expect(code.classList.contains('md-lang-hidden')).toBe(true)
})
```

**Then** 통과한다. `첫 단어만` 규칙이 없는 구현은 첫 단언에서, 접두사를 안 붙이는 구현은 마지막 세 단언에서 떨어진다.

### AC-WEBMD-010 — 이미지 금지와 마크업 API 금지

**Given** 이미지 생성은 `SPEC-WEBRICH-001` 첨부 경로가 독점한다.
**When**:

```ts
it('never creates an img and never uses a markup-parsing API', () => {
  const h = render('![alt](https://good.example/x.png)')
  expect(h.querySelectorAll('img').length).toBe(0)
  expect(h.querySelectorAll('a').length).toBe(0)            // ! 뒤 링크로 새지도 않는다
  expect(h.textContent).toBe('![alt](https://good.example/x.png)')

  const evil = render('<img src=x onerror="window.__pwned=1"><b>굵게</b>')
  expect(evil.querySelectorAll('img').length).toBe(0)
  expect(evil.querySelectorAll('b').length).toBe(0)
  expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
  expect(evil.textContent).toBe('<img src=x onerror="window.__pwned=1"><b>굵게</b>')

  // web/ 소스 «전체»에 금지 API 가 없다 — innerHTML = '' 만 허용.
  // REQ-WEBMD-005 는 «web/ 아래 어떤 파일도» 라는 전칭이므로 목록을 박아 두지 않고
  // 디렉터리에서 도출한다 — 넷째 .js 가 생기는 순간 조용히 사각이 되는 것을 막는다.
  const jsFiles = readdirSync(webDir).filter(f => f.endsWith('.js'))
  expect(jsFiles.length).toBeGreaterThan(0)      // 빈 목록으로 공허하게 통과하지 않게
  expect(jsFiles).toContain('markdown.js')       // 이 SPEC 이 더하는 파일이 범위 안에 있음을 못박는다
  for (const f of jsFiles) {
    const src = readFileSync(join(webDir, f), 'utf8')
    expect(src.length).toBeGreaterThan(0)
    expect(src).not.toMatch(/outerHTML|insertAdjacentHTML|document\.write|createContextualFragment/)
    // innerHTML 은 = '' 형태만
    for (const m of src.match(/innerHTML\s*=\s*[^\n]*/g) ?? []) {
      expect(m).toMatch(/innerHTML\s*=\s*(''|""|``)\s*$/)
    }
  }
})
```

**Then** 통과한다. 둘째 절은 기존 `web-chat.test.ts:313`(AC-WEBCHAT-003)의 승계 방어선을 렌더러 층에서 다시 세운 것이다.

### AC-WEBMD-011 — 권한 릴레이 회귀 (원문 파싱 불변)

**Given** `web/rich.js` 의 `permissionRequestId` 는 서버 페이로드 **원본 `m.body`** 를 읽는다. `renderMarkdown` 은 인자를 읽기만 한다.
**When** — 이 `it` 은 `server/test/web-chat.test.ts` 의 jsdom 골격(`loadApp` · `baseHandler` · `flush` · `msg`)을 같은 모양으로 갖춘 뒤 `web/rich.js` 의 `createRichContext` 를 등록하고 실행한다.

```ts
it('keeps the permission verdict buttons regardless of markdown in the body', async () => {
  const rid = 'abcde'
  const request = [
    '봇 pm 이 도구 사용 권한을 요청했습니다.',
    '도구: Bash',
    '명령: ls -la',
    `승인하려면 "yes ${rid}", 거절하려면 "no ${rid}" 라고 답해주세요.`,
  ].join('\n')

  // (1) 실물 4줄 요청 — 버튼 둘
  const app = await loadApp(baseHandler({
    '/api/rooms/1/messages': { messages: [msg({ id: 1, author_type: 'system', body: request })] },
  }))
  app.registerMessageDecorator(createRichContext)
  await app.openRoom(1); await flush()
  expect(document.querySelectorAll('#messages .verdict-row button').length).toBe(2)
  // 버튼은 .msg-body 밖 형제다 (장식 훅 계약 불변)
  expect(document.querySelectorAll('#messages .msg-body .verdict-row').length).toBe(0)

  // (2) 미닫힘 펜스를 앞에 붙인 변형 — 요청 줄이 코드블록 안에 그려져도 버튼은 그대로
  const fenced = '```\n' + request
  document.body.innerHTML = ''
  const app2 = await loadApp(baseHandler({
    '/api/rooms/1/messages': { messages: [msg({ id: 1, author_type: 'system', body: fenced })] },
  }))
  app2.registerMessageDecorator(createRichContext)
  await app2.openRoom(1); await flush()
  expect(document.querySelectorAll('#messages .verdict-row button').length).toBe(2)

  // (3) renderMarkdown 은 인자로 받은 doc 를 변형하지 않는다 — 만든 노드는 반환하는
  //     fragment 안에만 들어간다. (문자열 축은 검사하지 않는다: 자바스크립트 문자열은
  //     불변이라 `expect(src).toBe(before)` 류는 어떤 구현에서도 참이고, 잡는 구현이
  //     존재하지 않는 단언은 커버리지가 아니라 공허한 확신이다.)
  const probe = document.createElement('div')
  probe.id = 'md-doc-probe'
  document.body.appendChild(probe)
  const bodyChildrenBefore = document.body.childElementCount
  const frag = renderMarkdown('# 제목\n\n본문 [링크](https://good.example/x)', document)
  expect(document.body.childElementCount).toBe(bodyChildrenBefore)          // doc 에 직접 붙이지 않았다
  expect(document.getElementById('md-doc-probe')!.childElementCount).toBe(0)
  expect(frag.childNodes.length).toBeGreaterThan(0)                          // 빈 fragment 로 공허하게 통과하지 않게

  // (4) 파서 상태는 메시지마다 초기화된다 — 크로스-메시지 펜스 오염이 구조적으로 불가능하다
  renderMarkdown('```\n열린 채 끝남', document)
  const after = render('# 다음 메시지')
  expect(after.querySelectorAll('h1').length).toBe(1)
  expect(after.querySelectorAll('pre').length).toBe(0)
})
```

**Then** 통과한다. `m.body` 를 렌더 결과로 덮어쓰는 구현은 (1) 또는 (2) 에서 버튼 0개로 떨어지고, 노드를 `doc` 에 먼저 붙였다가 옮기는 구현은 (3) 에서, 모듈 수준에 펜스 상태를 들고 있는 구현은 (4) 에서 떨어진다.

### AC-WEBMD-012 — 폴백 경로

**Given** `renderMessage` 는 이력 루프와 SSE 수신의 **동기 경로**다. 여기서 예외가 나가면 메시지 한 개가 아니라 그 뒤 전부가 사라진다.
**When** — 던지는 렌더러를 주입한다(`vi.mock` 으로 `web/markdown.js` 의 `renderMarkdown` 을 대체한다).

```ts
it('falls back to raw text without losing the message or the ones after it', async () => {
  // renderMarkdown 이 던지도록 대체한 상태에서 메시지 둘을 그린다
  const app = await loadApp(baseHandler({
    '/api/rooms/1/messages': { messages: [msg({ id: 1, body: '첫째' }), msg({ id: 2, body: '둘째' })] },
  }))
  await app.openRoom(1); await flush()

  const bodies = [...document.querySelectorAll('#messages .msg-body')]
  expect(bodies.length).toBe(2)                                   // 뒤 메시지가 사라지지 않는다
  expect(bodies[0].textContent).toBe('첫째')                       // 원문이 남는다
  expect(bodies[1].textContent).toBe('둘째')
  expect(bodies.every(n => n.classList.contains('md-fallback'))).toBe(true)   // 조용히 삼키지 않는다
  expect(warn).toHaveBeenCalled()                                  // console.warn 스파이
})
```

**Then** 통과한다. `try`/`catch` 가 없는 구현은 `bodies.length` 2 에서, 예외를 **조용히** 삼키는 구현은 `md-fallback`·`warn` 두 단언에서 떨어진다.

### AC-WEBMD-013 — 입력 상한 (DoS 방어)

**Given** 상한은 성능 최적화가 아니라 적대적 입력 방어다.
**When**:

```ts
// 「유한 시간」의 판정자는 이 it 의 타임아웃이지 본문 안의 벽시계가 아니다.
// 누적 Date.now() 상한은 부하 걸린 기계에서 코드가 아니라 기계를 재게 되고, 이 저장소는
// 병렬 세션이 도는 개발 기계에서 부하성 실패를 겪은 기록이 있다. 20초는 일부러 넉넉하다 —
// 선형 구현은 밀리초 단위로 끝나고 백트래킹 폭발은 이 값으로 돌아오지 못하므로,
// 네 자릿수 차이가 부하를 판정에서 몰아낸다.
it('returns in finite time on adversarial input', () => {
  expect(() => renderMarkdown('>'.repeat(500) + ' 깊음', document)).not.toThrow()
  expect(() => renderMarkdown('- '.repeat(500) + '깊음', document)).not.toThrow()
  expect(() => renderMarkdown('*'.repeat(10000), document)).not.toThrow()
  const long = renderMarkdown('가'.repeat(30000), document)
  expect(long.textContent!.length).toBeLessThanOrEqual(20100)     // 상한 20,000 + 잘림 표시

  // 표 상한
  const wide = '|' + ' c |'.repeat(80) + '\n|' + ' --- |'.repeat(80) + '\n|' + ' 1 |'.repeat(80)
  const h = document.createElement('div')
  h.appendChild(renderMarkdown(wide, document))
  expect(h.querySelectorAll('thead th').length).toBeLessThanOrEqual(50)
}, 20_000)   // ← 이 값이 「유한 시간」의 판정자다
```

**Then** 통과한다. 재귀 깊이 제한이 없는 구현은 스택 오버플로로 첫 두 단언에서, 길이 상한이 없는 구현은 `20100` 단언에서, 백트래킹하는 인라인 스캐너는 `'*'.repeat(10000)` 에서 러너 타임아웃으로 떨어진다.

### AC-WEBMD-014 — CSS 계약

**Given** jsdom 은 레이아웃을 계산하지 않으므로 `overflow-x` 의 **동작**은 기계로 판정할 수 없다. 여기서는 **선언의 존재**를 계약으로 읽는다.

**When**:

```ts
it('holds the CSS contract: line-break responsibility moved, scroll wrapper present, tokens only', () => {
  const css = readFileSync(join(webDir, 'style.css'), 'utf8')

  // .msg-body 블록 안에 pre-wrap 이 없다 (책임이 p/br 노드로 옮겨졌다)
  const msgBody = /\.msg-body\s*\{[^}]*\}/.exec(css)
  expect(msgBody).not.toBeNull()
  expect(msgBody![0]).not.toContain('pre-wrap')

  // 폴백에만 되살아난다
  expect(/\.md-fallback\s*\{[^}]*white-space:\s*pre-wrap/.test(css)).toBe(true)

  // 가로 스크롤은 두 선언이 함께 만든다 — max-content 가 없으면 셀이 눌려 스크롤이 안 생긴다
  expect(/\.md-table-wrap\s*\{[^}]*overflow-x:\s*auto/.test(css)).toBe(true)
  expect(/\.md-table\s*\{[^}]*width:\s*max-content/.test(css)).toBe(true)

  // 새 블록에 16진수 색 리터럴 0건 (블록이 비어 있지 않음을 먼저 확인)
  const block = css.slice(css.indexOf('/* SPEC-WEBMD-001 */'), css.indexOf('/* /SPEC-WEBMD-001 */'))
  expect(block.length).toBeGreaterThan(200)
  expect(block.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
  expect(block).toContain('var(--md-')
})
```

**Then** 통과한다. 닫는 주석 `/* /SPEC-WEBMD-001 */` 이 없으면 `block` 이 음수 길이 슬라이스가 되어 `block.length` 단언에서 떨어진다 — 검사 범위가 파일 끝까지 새는 대신 붉어진다.

### AC-WEBMD-015 — 모듈 표면과 형 검사

**Given** `server/tsconfig.json` 에 `allowJs` 가 없으므로 형 선언 파일이 없으면 CI 가 빨간불이다.
**When**:

```ts
it('exposes exactly the five documented exports and ships a type declaration', () => {
  expect(typeof renderMarkdown).toBe('function')
  expect(typeof parseBlocks).toBe('function')
  expect(typeof renderInline).toBe('function')
  expect(typeof safeHref).toBe('function')
  expect(typeof codeLangToken).toBe('function')
  expect(renderMarkdown('x', document)).toBeInstanceOf(DocumentFragment)
  expect(renderInline('x', document)).toBeInstanceOf(DocumentFragment)
  expect(Array.isArray(parseBlocks(['x'], 0))).toBe(true)
  expect(readFileSync(join(webDir, 'markdown.d.ts'), 'utf8').length).toBeGreaterThan(0)
})
```

그리고 별도 명령:

```bash
npm run typecheck -w server     # 종료 코드 0. markdown.d.ts 가 없거나 시그니처가 어긋나면 여기서 잡힌다
```

**Then** 둘 다 통과한다.

### AC-WEBMD-016 — 기존 테스트 무수정 회귀

**Given** 기존 웹 테스트 네 파일을 통과시키려고 단언을 바꾸는 것은 금지다. 수정이 필요해지면 그것은 설계 오류 신호다.
**When**:

```bash
git diff --stat -- \
  server/test/web-chat.test.ts server/test/web-rich.test.ts \
  server/test/web-shell.test.ts server/test/web-permission-contract.test.ts
# → 출력 없음 (0줄)

grep -n "msg-body" server/test/web-chat.test.ts   # 자리와 단언이 그대로임을 눈으로 대조

npm test                                          # 워크스페이스 전체, 종료 코드 0
npm run e2e                                       # 실제 서버 프로세스
```

그리고 장식 훅 공존을 인프로세스로 한 번 더 본다.

```ts
it('keeps decorator nodes as siblings outside .msg-body', async () => {
  // 훅이 더한 figure 는 .message 의 직계 자식이고 .msg-body 안에 있지 않다
  expect(document.querySelectorAll('#messages .message > figure').length).toBe(2)
  expect(document.querySelectorAll('#messages .msg-body figure').length).toBe(0)
  expect(document.querySelectorAll('#messages .message > .msg-body').length).toBe(2)
})
```

**Then** `git diff --stat` 이 아무것도 출력하지 않고 `npm test` 가 종료 코드 0 이다. 마지막 단언 셋은 기존 `web-chat.test.ts:269` 의 구조 개수 단언이 왜 안전한지를 새 파일에서 다시 확인하는 것이다.

---

## Definition of Done

- [ ] AC-WEBMD-001 ~ 016 전부 초록
- [ ] `npm run typecheck -w server` · `npm run typecheck -w channel` 종료 코드 0
- [ ] `npm test` 종료 코드 0 — **`Tests` 요약에 `failed` 0, 그리고 `skipped` 는 «의도된 skip» 뿐**. 이 조건이 막는 것은 «목록 밖 skip 이 초록에 섞여 드는 것» 이다 — 0건 실행 경로를 막지는 못한다(0건 실행도 `failed` 0 과 skip 조건을 그대로 만족한다). 그 경로는 AC-WEBMD-001~016 이 각자 노드를 세어 떨어뜨린다.
  - 이 저장소에서 의도된 skip 은 현재 하나다 — `server/test/web-visual.test.ts` 는 Playwright 가 없는 환경에서 `{ skip: skipReason !== null }` 로 건너뛰며, 그 파일의 `// 브라우저 의존 trade-off:` 주석절이 그것이 설계임을 밝히고 「조용한 skip 은 금지다」라고 못박아, skip 할 때 stderr 한 줄로 사유를 남긴다. 따라서 CI 러너에서는 `skipped 1` 이 정상이고 로컬(npx 캐시에 playwright 가 있는 기계)에서는 `skipped 0` 이 정상이다 — **둘 다 통과**다.
  - 판정 절차: `skipped` 가 0 이 아니면 그 skip 이 위 목록에 있는지 확인하고, skip 사유 출력을 `progress.md` 에 남긴다. 목록 밖 skip 이 하나라도 있으면 실패다.
  - 이 예외를 «환경 한정»으로 쓰지 않는 이유: 「playwright 캐시가 있는 로컬」로 판정 환경을 좁히면 CI 가 판정에서 빠지는데, CI 야말로 이 SPEC 의 회귀를 실제로 잡는 자리다.
- [ ] `npm run e2e` 종료 코드 0
- [ ] 기존 웹 테스트 네 파일 `git diff --stat` 출력 0줄
- [ ] `web/` 새 규칙에 16진수 색 리터럴 0건, `web/design-tokens.css` 변경 0줄
- [ ] M6 실브라우저 육안 확인 결과가 `progress.md` 에 기록됨 (**판정 기준 아님을 명시**)
- [ ] `progress.md` §E.2 에 RED 출력 원문, §E.3 에 최종 검증 명령과 종료 코드
