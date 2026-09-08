// @vitest-environment jsdom
// SPEC-WEBMD-001 수용 기준 — AC-WEBMD-001 ~ AC-WEBMD-016 (acceptance.md 테스트 코드 그대로).
// 이 도크블록이 이 파일만 jsdom 환경으로 가른다 — web/ 소스를 직접 import 한다
// (server/test/web-rich.test.ts 11행 관례 그대로).
// A 그룹 = 문법별 렌더(AC-001~005·013), B 그룹 = 안전성(AC-006~010·014·015),
// C 그룹 = 통합·회귀(AC-011·012·016, M4 에서 더한다).
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
