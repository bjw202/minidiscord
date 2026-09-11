// @vitest-environment jsdom
// SPEC-WEBMD-001 수용 기준 — AC-WEBMD-001 ~ AC-WEBMD-016 (acceptance.md 테스트 코드 그대로).
// [예외 1건] AC-014 표 계약은 2026-09-09 운영자 결정으로 폭 맞춤(width:100%·셀 줄바꿈)으로 개편됐다 —
// acceptance.md 원문은 완결 시점 기록으로 그대로 둔다(완결 SPEC 형제 개정 금지 — completed-spec-semantics).
// 이 도크블록이 이 파일만 jsdom 환경으로 가른다 — web/ 소스를 직접 import 한다
// (server/test/web-rich.test.ts 11행 관례 그대로).
// A 그룹 = 문법별 렌더(AC-001~005·013), B 그룹 = 안전성(AC-006~010·014·015),
// C 그룹 = 통합·회귀(AC-011·012·016, M4 에서 더한다).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// ── A 그룹 — 문법별 렌더 ─────────────────────────────────────────────

describe('AC-WEBMD-001 headings and inline emphasis', () => {
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
})

describe('AC-WEBMD-002 fenced code blocks', () => {
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
})

describe('AC-WEBMD-003 lists quotes and horizontal rules', () => {
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

  // 불릿 항목의 텍스트까지 관측한다 — 구조(ul 개수·중첩)만 보던 AC-003 의 검사 빈틈.
  // M6 육안에서 불릿 텍스트가 전부 undefined 로 그려진 결함(2026-09-09)의 재현이다.
  it('renders bullet item text verbatim, never undefined', () => {
    const t = render('- 하나\n- 둘\n  - 둘의 하위')
    const texts = [...t.querySelectorAll('li')].map(li => li.textContent)
    expect(texts[0]).toBe('하나')
    expect(texts[2]).toBe('둘의 하위')
    expect(texts.join(' ')).not.toContain('undefined')
  })
})

describe('AC-WEBMD-004 GFM tables', () => {
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
})

describe('AC-WEBMD-005 line break contract', () => {
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
})

describe('AC-WEBMD-013 input limits (DoS defence)', () => {
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
})

// ── B 그룹 — 안전성 ──────────────────────────────────────────────────

describe('AC-WEBMD-006 URL scheme triple check', () => {
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
})

describe('AC-WEBMD-007 anchor attributes and name whitelists', () => {
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
})

describe('AC-WEBMD-008 label spoofing and real host hint', () => {
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
})

describe('AC-WEBMD-009 code fence language token', () => {
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
})

describe('AC-WEBMD-010 no images no markup APIs', () => {
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
})

// ── CSS 계약과 모듈 표면 ─────────────────────────────────────────────

describe('AC-WEBMD-014 CSS contract', () => {
  it('holds the CSS contract: line-break responsibility moved, table fits width, tokens only', () => {
    const css = readFileSync(join(webDir, 'style.css'), 'utf8')

    // .msg-body 블록 안에 pre-wrap 이 없다 (책임이 p/br 노드로 옮겨졌다)
    const msgBody = /\.msg-body\s*\{[^}]*\}/.exec(css)
    expect(msgBody).not.toBeNull()
    expect(msgBody![0]).not.toContain('pre-wrap')

    // 폴백에만 되살아난다
    expect(/\.md-fallback\s*\{[^}]*white-space:\s*pre-wrap/.test(css)).toBe(true)

    // 표는 컨테이너 폭에 맞춘다 — 2026-09-09 운영자 결정으로 max-content 가로 스크롤 계약을 대체.
    // wrap 의 overflow-x:auto 는 안전망으로 남고, 셀이 anywhere 로 줄바꿈 책임을 진다
    expect(/\.md-table-wrap\s*\{[^}]*overflow-x:\s*auto/.test(css)).toBe(true)
    expect(/\.md-table\s*\{[^}]*width:\s*100%/.test(css)).toBe(true)
    expect(/\.md-table th, \.md-table td\s*\{[^}]*overflow-wrap:\s*anywhere/.test(css)).toBe(true)
    // 옛 스크롤 계약의 흔적(nowrap·max-content)이 표 블록에 남지 않았는지도 관측한다
    expect(/\.md-table[^{]*\{[^}]*white-space:\s*nowrap/.test(css)).toBe(false)
    expect(/\.md-table\s*\{[^}]*width:\s*max-content/.test(css)).toBe(false)

    // 새 블록에 16진수 색 리터럴 0건 (블록이 비어 있지 않음을 먼저 확인)
    const block = css.slice(css.indexOf('/* SPEC-WEBMD-001 */'), css.indexOf('/* /SPEC-WEBMD-001 */'))
    expect(block.length).toBeGreaterThan(200)
    expect(block.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
    expect(block).toContain('var(--md-')
  })
})

describe('AC-WEBMD-015 module surface and type declaration', () => {
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
})

// ── C 그룹 — 통합·회귀 (M4) ──────────────────────────────────────────
// server/test/web-chat.test.ts 의 jsdom 골격(loadApp·baseHandler·flush·msg)을
// 같은 모양으로 갖춘다 —
// AC-WEBMD-011·012·016 이 app.js 통합 경로를 실제로 도는지 보는 그룹이다.
// (골격은 web-chat.test.ts 가 소유한 헬퍼를 부를 수 없어 각 테스트 파일이
// 자기 복제본을 갖는다 — 두 파일이 서로를 import 하지 않는 것이 관례다.)
import { createRichContext } from '../../web/rich.js'

// ── 가짜 EventSource (web-chat.test.ts 골격과 같은 모양) ────────────
class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  closed = false
  onerror: ((e: unknown) => void) | null = null
  onopen: ((e: unknown) => void) | null = null
  private ls: Record<string, ((e: { data: string }) => void)[]> = {}
  constructor(url: string) { this.url = url; FakeEventSource.instances.push(this) }
  addEventListener(type: string, fn: (e: { data: string }) => void) { (this.ls[type] ??= []).push(fn) }
  close() { this.closed = true }
  emit(type: string, data: unknown) { for (const f of this.ls[type] ?? []) f({ data: JSON.stringify(data) }) }
  static last() { return FakeEventSource.instances[FakeEventSource.instances.length - 1] }
}

// ── 가짜 fetch (web-chat.test.ts 골격과 같은 모양) ──────────────────
interface Call { url: string; method: string; body: unknown }
let calls: Call[] = []
type Handler = (url: string, opts: { method?: string; body?: unknown }) =>
  unknown | Promise<unknown>

function installFetch(handler: Handler) {
  calls = []
  ;(globalThis as { fetch: unknown }).fetch = async (url: unknown, opts: { method?: string; body?: unknown } = {}) => {
    calls.push({ url: String(url), method: opts.method ?? 'GET', body: opts.body })
    const out = (await handler(String(url), opts)) as { ok?: boolean; status?: number; data?: unknown } | undefined
    return {
      ok: out?.ok !== false,
      status: out?.status ?? (out?.ok === false ? 400 : 200),
      json: async () => out?.data ?? {},
    }
  }
}

async function flush(times = 20) { for (let i = 0; i < times; i++) await Promise.resolve() }

interface AppModule {
  state: Record<string, unknown>
  openRoom: (id: number) => Promise<void>
  renderMessage: (m: unknown, prev?: unknown) => void
  sendMessage: () => Promise<void>
  refreshRoomBots: () => Promise<void>
  registerMessageDecorator: (factory: unknown) => void
  loadRooms: () => Promise<void>
}

async function loadApp(handler: Handler, opts: { decorator?: unknown } = {}) {
  FakeEventSource.instances = []
  installFetch(handler)
  ;(globalThis as { EventSource?: unknown }).EventSource = FakeEventSource

  const html = readFileSync(join(webDir, 'index.html'), 'utf8')
  document.body.innerHTML = html.replace(/[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '')

  vi.resetModules()
  // @ts-expect-error web/app.js 는 브라우저가 직접 읽는 ES 모듈이라 타입 선언을 두지 않는다
  const mod = (await import('../../web/app.js')) as unknown as AppModule

  await mod.loadRooms()
  if (opts.decorator) mod.registerMessageDecorator(opts.decorator)
  await flush()
  return mod
}

// 메시지 하나 만들기 — 실제 서버 페이로드 모양
function msg(over: Record<string, unknown> = {}) {
  return {
    id: 1, room_id: 1, author_type: 'user', author_user_id: 1, author_bot_id: null,
    body: '본문', created_at: '2026-08-27 10:00:00', author_name: 'u', attachments: [],
    ...over,
  }
}

// 방 하나만 있는 기본 핸들러. 필요한 응답만 덮어쓴다.
function baseHandler(over: Record<string, unknown> = {}): Handler {
  return url => {
    for (const [k, v] of Object.entries(over)) if (url.startsWith(k)) return { data: v }
    if (url.startsWith('/api/rooms/1/messages')) return { data: { messages: [] } }
    if (url.startsWith('/api/rooms/2/messages')) return { data: { messages: [] } }
    if (/^\/api\/rooms\/[0-9]+\/bots/.test(url)) return { data: [] }
    if (url.startsWith('/api/rooms')) return { data: { active: [{ id: 1, name: '방1' }, { id: 2, name: '방2' }], archived: [] } }
    if (url.startsWith('/api/bots')) return { data: [] }
    return { data: {} }
  }
}

describe('AC-WEBMD-011 permission relay regression', () => {
  let warn: ReturnType<typeof vi.spyOn>
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => {
    warn.mockRestore()
    document.body.innerHTML = ''
    FakeEventSource.instances = []
  })

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
})

describe('AC-WEBMD-012 fallback path', () => {
  let warn: ReturnType<typeof vi.spyOn>
  beforeEach(() => { warn = vi.spyOn(console, 'warn').mockImplementation(() => {}) })
  afterEach(() => {
    warn.mockRestore()
    document.body.innerHTML = ''
    FakeEventSource.instances = []
  })

  it('falls back to raw text without losing the message or the ones after it', async () => {
    // renderMarkdown 이 던지도록 대체한다 — app.js 의 폴백 경로(REQ-WEBMD-011)만 격리해 본다.
    // doMock 은 끌어올려지지 않으므로 이 it 안에서만 유효하고, finally 로 반드시 푼다.
    vi.doMock('../../web/markdown.js', async importOriginal => {
      const actual = await importOriginal<typeof import('../../web/markdown.js')>()
      return { ...actual, renderMarkdown: () => { throw new Error('주입된 실패') } }
    })
    try {
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
    } finally {
      vi.doUnmock('../../web/markdown.js')
    }
  })
})

describe('AC-WEBMD-016 existing tests untouched and hook coexistence', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    FakeEventSource.instances = []
  })

  it('keeps decorator nodes as siblings outside .msg-body', async () => {
    // 준비 — web-chat.test.ts 의 대역 장식 훅과 같은 모양으로 figure 를 더한다
    const factory = (deps: { api: unknown; doc: Document }) => {
      expect(deps.doc).toBe(document)
      return {
        decorate(el: Element, m: { id: number }) {
          el.appendChild(document.createElement('figure'))   // 훅은 자손을 더할 수 있다
        },
      }
    }
    const app = await loadApp(baseHandler({
      '/api/rooms/1/messages': { messages: [msg({ id: 1, body: '그림 하나' }), msg({ id: 2, body: '그림 둘' })] },
    }), { decorator: factory })
    await app.openRoom(1); await flush()

    // 훅이 더한 figure 는 .message 의 직계 자식이고 .msg-body 안에 있지 않다
    expect(document.querySelectorAll('#messages .message > figure').length).toBe(2)
    expect(document.querySelectorAll('#messages .msg-body figure').length).toBe(0)
    expect(document.querySelectorAll('#messages .message > .msg-body').length).toBe(2)
  })
})

// ── D 그룹 — SPEC-WEBMD-002 본문 @TO/@CC 배지 (AC-WEBMD2-001~008) ─────
// 기존 describe(AC-WEBMD-001~016) 은 한 줄도 고치지 않는다 — 이 그룹은 파일
// 끝에만 더한다 (REQ-WEBMD2-007). 자격 문법 = 서버 문법(REQ-WEBMD2-003),
// 코드 표면 제외(REQ-WEBMD2-004), 즉시 리터럴·선형 시간(REQ-WEBMD2-005·008)의
// 계약 문면은 spec.md §3.1 이 소유한다.
import { execSync } from 'node:child_process'

describe('AC-WEBMD2-001 TO token renders as chip plus name text', () => {
  it('renders the most common measured form: chip first, then the name as a text node', () => {
    const h = render('@TO(orchestrator) 처음 접속이다')
    const p = h.querySelector('p')!
    expect(p).not.toBeNull()

    // 문단 첫 노드가 종류 칩이다
    const first = p.firstChild as HTMLElement
    expect(first.nodeType).toBe(Node.ELEMENT_NODE)
    expect(first.tagName).toBe('SPAN')
    expect(first.classList.contains('md-mention')).toBe(true)
    expect(first.classList.contains('to')).toBe(true)
    expect(first.textContent).toBe('TO')

    // 칩 뒤에 이름이 텍스트 노드로 붙고 나머지 문장이 이어진다
    expect((first.nextSibling as Text).nodeType).toBe(Node.TEXT_NODE)
    expect(first.nextSibling!.textContent).toBe('orchestrator')
    expect(p.textContent).toBe('TOorchestrator 처음 접속이다')

    // 토큰 문법(@TO( 와 닫는 )) 은 표시 어디에도 남지 않는다
    expect(h.textContent).not.toContain('@TO(')
    expect(h.textContent).not.toContain(')')
  })
})

describe('AC-WEBMD2-002 roll-call line renders every chip in order', () => {
  it('renders second-and-later tokens on the same line too, each followed by its name', () => {
    const h = render('@TO(analyst) @TO(archivist) @CC(researcher) 출석체크다')
    const chips = [...h.querySelectorAll('.md-mention')]
    expect(chips.length).toBe(3)
    expect(chips.map(c => c.classList.contains('to'))).toEqual([true, true, false])
    expect(chips.map(c => c.classList.contains('cc'))).toEqual([false, false, true])
    expect(chips.map(c => c.textContent)).toEqual(['TO', 'TO', 'CC'])

    // 각 칩 바로 뒤에 이름이 텍스트 노드로 남는다 — 칩·이름·칩·이름 순서
    expect(chips[0].nextSibling!.textContent).toBe('analyst')
    expect(chips[1].nextSibling!.textContent).toBe('archivist')
    expect(chips[2].nextSibling!.textContent).toBe('researcher')
    expect(h.textContent).toBe('TOanalyst TOarchivist CCresearcher 출석체크다')
  })
})

describe('AC-WEBMD2-003 out-of-grammar forms stay fully literal', () => {
  it('renders the five out-of-grammar forms with zero chips and exact source identity', () => {
    // 전부 줄 시작에서 각각 렌더한다 — 위치는 자격에 무관하고(REQ-WEBMD2-003)
    // «문법 밖» 형태만 가른다 (REQ-WEBMD2-005 과대 매칭 거부)
    for (const bad of ['@to(bot)', '@TO()', '@TO(이 름)', '@TO(안닫힘', '@TO(a(b)']) {
      const h = render(bad)
      expect(h.querySelectorAll('.md-mention').length).toBe(0)
      expect(h.textContent).toBe(bad)          // 한 글자도 삼키지 않는다
    }
  })

  // 2026-09-11 sync 감사 F1 — 문법에 «맞는» 이름에 HTML 메타문자가 들어가면 칩이 만들어진다.
  // 이름은 텍스트 노드로만 흘러가므로 재해석이 구조적으로 불가능해야 한다: 칩 딱 하나,
  // 어떤 태그도 태어나지 않고, 이름 원문이 텍스트 그대로 산다.
  it('keeps a grammar-valid metacharacter name inert — one chip, no elements born, raw name as text', () => {
    for (const name of ['<b>x</b>', `a"b'c`]) {
      const h = render(`@TO(${name}) 뒷말`)
      expect(h.querySelectorAll('.md-mention').length).toBe(1)
      expect(h.querySelectorAll('b, img, svg, script, i').length).toBe(0)
      expect(h.textContent).toContain(name)
    }
  })
})

describe('AC-WEBMD2-004 code surfaces stay literal', () => {
  it('renders exactly one chip outside code, and none inside a code span or fence', () => {
    const src = '@TO(a) 설명 `@TO(b) 예시`\n\n```\n@TO(x)\n```'
    const h = render(src)

    // 칩은 줄의 첫 토큰 하나뿐
    const chips = h.querySelectorAll('.md-mention')
    expect(chips.length).toBe(1)
    expect(chips[0].classList.contains('to')).toBe(true)

    // 코드스팬의 textContent 는 원문 그대로
    const span = h.querySelector('p code')
    expect(span).not.toBeNull()
    expect(span!.textContent).toBe('@TO(b) 예시')

    // 펜스 코드블록 안에 .md-mention 이 없고 원문이 그대로 담긴다
    expect(h.querySelectorAll('pre .md-mention').length).toBe(0)
    expect(h.querySelector('pre')!.textContent).toBe('@TO(x)')
  })
})

describe('AC-WEBMD2-005 token on a later line renders right after the break', () => {
  it('places the chip and name at the start of the line following the br', () => {
    // 실측 메시지 형태 — 둘째 줄이 토큰으로 시작한다
    const h = render('…출석 확인. (3/4)\n@TO(reporter) 너만 남았다')
    const p = h.querySelector('p')!
    expect(p.querySelectorAll('br').length).toBe(1)

    const br = p.querySelector('br')!
    const after = br.nextSibling as HTMLElement
    expect(after.nodeType).toBe(Node.ELEMENT_NODE)
    expect(after.tagName).toBe('SPAN')
    expect(after.classList.contains('md-mention')).toBe(true)
    expect(after.classList.contains('to')).toBe(true)
    expect(after.textContent).toBe('TO')
    expect(after.nextSibling!.textContent).toBe('reporter')
  })
})

describe('AC-WEBMD2-008 linear time on adversarial mention input', () => {
  // 「유한 시간」의 판정자는 AC-WEBMD-013(web-markdown.test.ts:171) 과 같은
  // 방식으로 it 옵션에 못박는다. 닫을 수 없는 토큰 나열에서 이름 스캔이 '(' 를
  // 멈춤 글자로 삼기에 스캔 구간이 겹치지 않는다 — 선형 구현은 밀리초에 끝나고
  // 백트래킹 폭발은 이 값으로 돌아오지 못한다.
  it('returns in finite time on unclosed tokens and five thousand valid tokens', () => {
    const unclosed = render('@TO(x'.repeat(10000))
    expect(unclosed.querySelectorAll('.md-mention').length).toBe(0)   // 닫힘이 없으면 전부 리터럴

    const many = render(('@TO(a) ').repeat(5000))
    expect(many.querySelectorAll('.md-mention').length).toBeGreaterThan(0)
  }, 20_000)
})

// ── pre-flight 기준선(AC-WEBMD2-006·007 공용) ─────────────────────────
// plan.md §C 가 명명한 pre-flight HEAD — 구현 시작 전 HEAD 이며, 작업 나무 비교로는
// 이미 커밋된 PRESERVE 위반을 못 잡으므로 git show/log/diff 의 기준선이 된다.
const PRE_FLIGHT_HEAD = '67db21a03e40ffb135b2eac24a93199d5802b883'
const repoRoot = join(webDir, '..')

describe('AC-WEBMD2-006 CSS contract — same color language as the ac badge', () => {
  it('uses only .ac-kind tokens in the SPEC-WEBMD-002 block and keeps .ac-kind byte-identical', () => {
    const css = readFileSync(join(webDir, 'style.css'), 'utf8')
    const start = css.indexOf('/* SPEC-WEBMD-002 */')
    const block = css.slice(start, css.indexOf('/* /SPEC-WEBMD-002 */'))
    expect(start).toBeGreaterThanOrEqual(0)                 // 블록이 존재한다
    expect(block.length).toBeGreaterThan(200)               // 비어 있지 않음 — 공허 합격 차단

    // .md-mention.to — 채운 강조색 배경 + 본문 글자색
    const toRule = /\.md-mention\.to\s*\{[^}]*\}/.exec(block)
    expect(toRule).not.toBeNull()
    expect(toRule![0]).toContain('background: var(--md-accent)')
    expect(toRule![0]).toContain('color: var(--md-text-primary)')

    // .md-mention.cc — 흐린 글자 + 가는 테두리
    const ccRule = /\.md-mention\.cc\s*\{[^}]*\}/.exec(block)
    expect(ccRule).not.toBeNull()
    expect(ccRule![0]).toContain('color: var(--md-text-muted)')
    expect(ccRule![0]).toContain('border: var(--md-border-width) solid var(--md-divider)')

    // 블록 안 16진수 색 리터럴 0건·var(--md- 사용 1건 이상
    expect(block.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([])
    expect((block.match(/var\(--md-/g) ?? []).length).toBeGreaterThanOrEqual(1)

    // .ac-kind 세 규칙은 pre-flight HEAD 의 같은 규칙과 한 글자 차이 없이 동일 —
    // 커밋된 위반이 거짓 합급하지 못하게 하는 기준선 지정 비교다
    const before = execSync(`git show ${PRE_FLIGHT_HEAD}:web/style.css`, { cwd: repoRoot }).toString()
    for (const rule of [/\.ac-kind\s*\{[^}]*\}/, /\.ac-kind\.to\s*\{[^}]*\}/, /\.ac-kind\.cc\s*\{[^}]*\}/]) {
      const now = rule.exec(css)
      const was = rule.exec(before)
      expect(was).not.toBeNull()                            // 기준선에 규칙이 있다 — 비교가 공허하지 않게
      expect(now).not.toBeNull()
      expect(now![0]).toBe(was![0])
    }
  })

  // 2026-09-11 화면 확인 반영 — 인라인 배치의 본체 두 속성: 칩이 줄에서 비스듬히 뜨지
  // 않게(vertical-align) 칩과 뒤따르는 봇 이름이 바짝 붙지 않게(margin) 하는 회귀 가드
  it('keeps the chip vertically aligned and spaced inside the inline flow', () => {
    const css = readFileSync(join(webDir, 'style.css'), 'utf8')
    const base = /\.md-mention\s*\{[^}]*\}/.exec(css)
    expect(base).not.toBeNull()
    expect(base![0]).toContain('vertical-align: middle')
    expect(base![0]).toMatch(/margin:\s*0 var\(--md-space-1\)/)
  })
})

// export 다섯 고정 검사는 모듈 표면을 통째로 본다 — describe 밖 최상위 import (관례: 390행)
import * as markdownModule from '../../web/markdown.js'

describe('AC-WEBMD2-007 integration and preserve baseline', () => {
  // 통합 경로 관측 + PRESERVE 위반 검사. PRESERVE 는 «커밋돼도» 잡히게 pre-flight HEAD
  // 기준선으로 돌린다 — 작업 나무 diff 만으로는 이미 커밋된 위반을 못 본다.
  // 기존 블록 AC-WEBMD-001~016 의 초록은 이 파일과 같은 vitest 실행이 곧 증거다.
  afterEach(() => {
    document.body.innerHTML = ''
    FakeEventSource.instances = []
  })

  it('renders the badge through the real app path and keeps every PRESERVE surface intact', async () => {
    // (1) jsdom 앱 통합 경로 — app.js 무변경, renderMarkdown 호출 한 줄이 배지까지 그린다
    const app = await loadApp(baseHandler({
      '/api/rooms/1/messages': { messages: [msg({ id: 1, body: '@TO(orchestrator) 출석체크' })] },
    }))
    await app.openRoom(1); await flush()
    const chip = document.querySelector('#messages .msg-body .md-mention.to')
    expect(chip).not.toBeNull()
    expect(chip!.textContent).toBe('TO')
    expect(chip!.nextSibling!.textContent).toBe('orchestrator')

    // (2) PRESERVE — pre-flight HEAD 이후 이 경로들에 커밋이 없다
    const git = (args: string) => execSync(`git ${args}`, { cwd: repoRoot }).toString()
    expect(git(`log --oneline ${PRE_FLIGHT_HEAD}..HEAD -- web/app.js web/rich.js web/markdown.d.ts server/src`)).toBe('')

    // (3) PRESERVE — 작업 나무도 0줄
    expect(git('diff --stat -- web/app.js web/rich.js web/markdown.d.ts server/src')).toBe('')

    // (4) 시험 파일은 추가 라인만 — 기존 describe 블록 무수정(제거·변경 0줄)
    const diff = git(`diff ${PRE_FLIGHT_HEAD} -- server/test/web-markdown.test.ts`)
    const removed = diff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---'))
    expect(diff).not.toBe('')            // 비교가 공허하지 않게 — 추가분이 실제로 있다
    expect(removed).toEqual([])

    // (5) export 다섯 그대로 (REQ-WEBMD-001, B-2)
    expect(Object.keys(markdownModule).sort()).toEqual(
      ['codeLangToken', 'parseBlocks', 'renderInline', 'renderMarkdown', 'safeHref'])
  })
})
