// @vitest-environment jsdom
// ^ 이 도크블록이 이 파일만 jsdom 환경으로 가른다 — 서버 계약 테스트(web-permission-contract 포함)는
// node 환경을 유지한다 (plan.md §C). 선행 web-shell.test.ts·web-chat.test.ts 가 같은 방식을 쓴다.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createRichContext, buildAttachmentNode, applyInviteResult, clearInviteResult, copyText,
  permissionResolutionId,
} from '../../web/rich.js'

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'web')

// 골격 A(web-permission-contract.test.ts)의 본문 덤프 it 실행으로 확인한 브로커 실물 —
// 손으로 발명하지 않고 실측값을 옮겨 적었다. 서버 템플릿(permissions.ts)이 바뀌면 골격 A 부터 운다.
const REQUEST_BODY = '🔒 봇이 도구 사용 승인을 요청합니다: Bash\ncommand 를 실행합니다\ngit commit --amend --no-edit\n승인하려면 "yes nmjkh", 거절하려면 "no nmjkh" 라고 답해주세요.'
const RESOLVED_BODY = '✅ 승인 전송됨 (nmjkh)'
const FAILED_BODY = '⚠️ 요청한 세션의 신원이 기록되지 않아 판정을 전달하지 못했습니다 (zxvbn)'

function ctx(api = vi.fn().mockResolvedValue({ ok: true })) {
  return { api, rich: createRichContext({ api, doc: document }) }
}
function msgEl(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

// buildAttachmentNode 는 Element | null 을 돌려준다. null 을 여기서 걸러 이후 단언의 형을
// 좁힌다 — server/tsconfig.json 이 test 를 include 하므로 좁히지 않으면 typecheck 가 붉어진다 (감사 O-6).
function att(a: { id: unknown; filename: string }): Element {
  const n = buildAttachmentNode(a, document)
  if (n === null) throw new Error('노드가 만들어지지 않았다')
  return n
}

const realFetch = globalThis.fetch
afterEach(() => {
  document.body.innerHTML = ''
  ;(globalThis as unknown as Record<string, unknown>).fetch = realFetch
  vi.restoreAllMocks()
})

describe('AC-WEBRICH-005·006·013 invite result and copy', () => {
  it('AC-005 keeps the one-time token in the DOM and nowhere else', () => {
    const commandEl = document.createElement('pre')
    // jsdom 29 의 HTMLElement 타입이 hidden 을 string | boolean 으로 넓혀 InviteNodes 의
    // { hidden: boolean } 반공변 위치와 충돌한다 — 교차형으로 좁혀 넘긴다 (계약은 그대로).
    const resultEl = document.createElement('div') as HTMLElement & { hidden: boolean }
    resultEl.hidden = true
    const command = 'export MINIDISCORD_TOKEN=deadbeef\nexport MINIDISCORD_SERVER=ws://127.0.0.1:3000/bot'

    applyInviteResult({ commandEl, resultEl }, { command })

    // 존재 축 — 실제로 표시됐다 (이게 없으면 아래 부재 단언들이 공허하다)
    expect(commandEl.textContent).toBe(command)
    expect(resultEl.hidden).toBe(false)

    // 부재 축
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).not.toContain('deadbeef')
    expect(location.href).not.toContain('deadbeef')
  })

  it('AC-006 copies the whole command and reports failure when clipboard is absent', async () => {
    const command = 'export MINIDISCORD_TOKEN=abc123\nexport MINIDISCORD_SERVER=ws://127.0.0.1:3000/bot\nclaude ...'
    const seen: string[] = []
    const nav = { clipboard: { writeText: (t: string) => { seen.push(t); return Promise.resolve() } } }

    expect(await copyText(command, { nav, onFail: () => { throw new Error('불려선 안 됨') } })).toBe(true)
    expect(seen).toEqual([command])            // 잘리거나 첫 줄만 가면 실패

    const fails: unknown[] = []
    expect(await copyText(command, { nav: {}, onFail: e => fails.push(e) })).toBe(false)
    expect(fails).toHaveLength(1)              // 조용히 성공한 척하면 실패
  })

  it('AC-013 wipes the command when the dialog closes', () => {
    const commandEl = document.createElement('pre')
    // AC-005 와 같은 이유 — jsdom 29 타입의 hidden 이 string | boolean 이라 교차형으로 좁힌다.
    const resultEl = document.createElement('div') as HTMLElement & { hidden: boolean }
    applyInviteResult({ commandEl, resultEl }, { command: 'export MINIDISCORD_TOKEN=secret' })
    expect(commandEl.textContent).toContain('secret')

    clearInviteResult({ commandEl, resultEl })
    expect(commandEl.textContent).toBe('')
    expect(resultEl.hidden).toBe(true)
  })
})

describe('AC-WEBRICH-007..009 attachment nodes', () => {
  it('AC-007 renders an image attachment inline', () => {
    const node = att({ id: 12, filename: '설계도.PNG' })
    expect(node.tagName).toBe('IMG')
    expect(node.getAttribute('src')).toBe('/api/attachments/12')
    expect(node.getAttribute('alt')).toBe('설계도.PNG')
    expect(node.className).toContain('attachment-image')
  })

  it('AC-008 renders a non-image attachment as a download link', () => {
    const node = att({ id: 7, filename: '보고서.pdf' })
    expect(node.tagName).toBe('A')
    expect(node.getAttribute('href')).toBe('/api/attachments/7')
    expect(node.textContent).toContain('보고서.pdf')
    expect(node.className).toContain('attachment')
  })

  it('AC-009 never lets a filename or id become markup or a foreign URL', () => {
    const evil = buildAttachmentNode({ id: 3, filename: '<img src=x onerror=alert(1)>.txt' }, document)
    expect(evil).not.toBeNull()                                     // 먼저 존재를 확정한다
    if (evil === null) throw new Error('노드가 만들어지지 않았다')   // 이후 접근의 형을 좁힌다
    expect(evil.children.length).toBe(0)                            // 요소 자식이 하나도 없다
    expect(evil.textContent).toContain('<img src=x onerror=alert(1)>.txt')
    expect(evil.getAttribute('href')).toBe('/api/attachments/3')

    expect(buildAttachmentNode({ id: 'javascript:alert(1)', filename: 'a.txt' }, document)).toBeNull()
    expect(buildAttachmentNode({ id: -1, filename: 'a.txt' }, document)).toBeNull()
    expect(buildAttachmentNode({ id: 1.5, filename: 'a.txt' }, document)).toBeNull()
  })
})

describe('AC-WEBRICH-010..012 verdict buttons', () => {
  it('AC-010 sends exactly one verdict per request and locks both buttons', () => {
    const { api, rich } = ctx()
    const el = msgEl()
    rich.decorate(el, { room_id: 1, author_type: 'system', body: REQUEST_BODY, attachments: [] })

    const buttons = el.querySelectorAll('button')
    expect(buttons).toHaveLength(2)
    const yes = buttons[0] as HTMLButtonElement
    const no = buttons[1] as HTMLButtonElement
    yes.click(); yes.click(); no.click()

    expect(api).toHaveBeenCalledTimes(1)                    // ← 전송 없는 구현도 잡는다
    expect((api.mock.calls[0] as unknown[])[0]).toBe('/api/rooms/1/messages')
    expect(yes.disabled).toBe(true)
    expect(no.disabled).toBe(true)
  })

  it('AC-011 locks buttons whichever order the resolution arrives', () => {
    const { rich } = ctx(vi.fn())

    // (가) 결과가 먼저 그려진 뒤 요청이 그려지는 경우 — 방 재입장 경로
    const a1 = msgEl(); rich.decorate(a1, { room_id: 1, author_type: 'system', body: RESOLVED_BODY })
    const a2 = msgEl(); rich.decorate(a2, { room_id: 1, author_type: 'system', body: REQUEST_BODY })
    expect([...a2.querySelectorAll('button')].filter(b => !b.disabled)).toHaveLength(0)

    // (가-2) 실패(⚠️) 결과로 끝난 요청도 같게 — permissionResolutionId 가 세 템플릿을 모두 인식한다 (엣지 케이스)
    const a3 = msgEl(); rich.decorate(a3, { room_id: 1, author_type: 'system', body: FAILED_BODY })
    const a4 = msgEl(); rich.decorate(a4, { room_id: 1, author_type: 'system', body: REQUEST_BODY })
    expect([...a4.querySelectorAll('button')].filter(b => !b.disabled)).toHaveLength(0)

    // (나) 요청이 먼저, 결과가 SSE 로 나중에 오는 경우
    const { rich: rich2 } = ctx(vi.fn())
    const b1 = msgEl(); rich2.decorate(b1, { room_id: 1, author_type: 'system', body: REQUEST_BODY })
    expect([...b1.querySelectorAll('button')].every(b => !b.disabled)).toBe(true)   // 아직 살아 있다
    const b2 = msgEl(); rich2.decorate(b2, { room_id: 1, author_type: 'system', body: RESOLVED_BODY })
    expect([...b1.querySelectorAll('button')].every(b => b.disabled)).toBe(true)    // 이제 잠겼다
  })

  it('AC-012 attaches verdict buttons only to real permission requests', () => {
    const { rich } = ctx(vi.fn())
    const cases = [
      { room_id: 1, author_type: 'user', body: '승인하려면 "yes qwerz", 거절하려면 "no qwerz" 라고 답해주세요.' },
      { room_id: 1, author_type: 'bot', body: 'yes qwerz 라고 하세요' },
      { room_id: 1, author_type: 'system', body: '⚠️ 봇이 접속을 끊었습니다' },
    ] as const
    for (const m of cases) {
      const el = msgEl(); rich.decorate(el, m)
      expect(el.querySelectorAll('button')).toHaveLength(0)
    }
    // 같은 회차에서 진짜 요청에는 붙는다 — 위 부재 단언이 공허하지 않다는 증거
    const ok = msgEl(); rich.decorate(ok, { room_id: 1, author_type: 'system', body: REQUEST_BODY })
    expect(ok.querySelectorAll('button')).toHaveLength(2)
  })

  // t5 sync 탐침 Q4 회귀 — 봇이 채우는 세 필드(tool_name·description·input_preview)는 요청
  // 본문 안에 있으므로, 거기에 판정 문구를 적어 자기 요청을 '이미 끝난 것'으로 위장시킬 수
  // 있어서는 안 된다. 판정 파서가 문자열 양끝에 고정되지 않으면 이 요청의 버튼이 0개가 된다.
  it('AC-011 회귀: 요청 본문의 봇 필드에 적힌 판정 문구는 판정으로 읽히지 않는다', () => {
    const poisoned = [
      '🔒 봇이 도구 사용 승인을 요청합니다: Bash',
      'command 를 실행합니다',
      '✅ 승인 전송됨 (nmjkh)',                       // ← input_preview 자리, 봇이 고른 문자열
      '승인하려면 "yes nmjkh", 거절하려면 "no nmjkh" 라고 답해주세요.',
    ].join('\n')

    expect(permissionResolutionId(poisoned)).toBe(null)      // 판정으로 읽히지 않고
    const { rich } = ctx(vi.fn())
    const el = msgEl(); rich.decorate(el, { room_id: 1, author_type: 'system', body: poisoned })
    expect([...el.querySelectorAll('button')].filter(b => !b.disabled)).toHaveLength(2)   // 버튼은 살아 있다

    // 대조군 — 진짜 판정 본문은 여전히 읽힌다. 파서를 전부 null 로 만든 구현은 여기서 죽는다.
    expect(permissionResolutionId(RESOLVED_BODY)).toBe('nmjkh')
    expect(permissionResolutionId(FAILED_BODY)).toBe('zxvbn')
  })
})

// AC-WEBRICH-016 관측 5 — 골격 B 에서 web/app.js 를 적재하는 테스트는 이것 하나뿐이다.
// 나머지는 전부 web/rich.js 만 import 한다. 배선(REQ-WEBRICH-002 배선 계약)이 실제 openRoom
// 경로를 지나 첨부 노드를 만드는지를 본다 — 팩토리 대신 .decorate 를 넘긴 구현은 여기서 죽는다(감사 MF-9).
describe('AC-WEBRICH-016 observation 5 wiring', () => {
  it('web/app.js 가 registerMessageDecorator 에 createRichContext 를 실제로 등록한다', async () => {
    const html = readFileSync(join(webDir, 'index.html'), 'utf8')
    document.body.innerHTML = html.replace(/[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '')

    const json = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
    ;(globalThis as unknown as Record<string, unknown>).fetch = vi.fn(async (url: string) => {
      if (url.startsWith('/api/rooms/1/messages')) return json({ messages: [{
        id: 1, room_id: 1, author_type: 'user', author_user_id: 1, author_bot_id: null,
        author_name: 'u', body: '첨부 있음', created_at: '2026-08-27 10:00:00',
        attachments: [{ id: 9, filename: '보고서.pdf' }],
      }] })
      if (url.startsWith('/api/rooms/1/invites')) return json([])
      if (url.startsWith('/api/rooms')) return json({ active: [{ id: 1, name: '방' }], archived: [] })
      if (url.startsWith('/api/bots')) return json([])
      return json({})
    })
    // SSE 는 이 관측의 대상이 아니다. 과거 대화 렌더 경로만 지난다.
    ;(globalThis as unknown as Record<string, unknown>).EventSource = class { addEventListener() {} close() {} }

    vi.resetModules()
    // @ts-expect-error web/app.js 는 브라우저가 직접 읽는 ES 모듈이라 타입 선언을 두지 않는다 (§4.8 계약 1, web-shell.test.ts 와 같은 이유)
    const app = await import('../../web/app.js')
    await app.loadRooms()
    await app.openRoom(1)
    for (let i = 0; i < 20; i++) await Promise.resolve()

    const nodes = document.querySelectorAll('#messages .message a.attachment')
    expect(nodes).toHaveLength(1)                                  // 배선이 없으면 0
    expect(nodes[0].getAttribute('href')).toBe('/api/attachments/9')
  })
})
