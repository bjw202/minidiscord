// server/test/e2e-lib.test.ts — 두 러너가 나눠 쓰는 도우미(scripts/e2e-lib.mts)의 인프로세스 시험 (REQ-E2ESCEN-014).
//
// 실제 서버를 띄우지 않는다. 침묵 관측·프레임 시한·HTTP 도우미 셋만 가짜 소켓과 가짜 fetch 로 잰다.
// 이 파일이 scripts/e2e-lib.mts 를 import 하므로 server 의 pretest(tsc --noEmit, strict)가 그 파일까지 검사한다.
//
// import 경로가 `.mjs` 인 것과 그 위의 억제 주석은 둘 다 module: NodeNext 의 요구다.
//  - `.mjs`: NodeNext 에서는 «내보낸 뒤의 확장자» 로 적어야 한다(`.mts` 로 적으면 TS5097). 해소되는 파일은 e2e-lib.mts 다.
//  - @ts-ignore: server/tsconfig.json 이 outDir 을 두고 rootDir 을 server/ 로 추론하는데, 이 도우미는 그 밖(scripts/)에
//    있어 «출력 자리» 를 정할 수 없다는 TS6059 가 import 자리에 뜬다. 억제하는 것은 그 배치 불평 하나뿐이고,
//    e2e-lib.mts 안의 타입 검사는 그대로 돈다 — 도우미에 타입 오류를 심는 변이로 확인했다(TS2322 가 잡힌다).

import { describe, expect, it, vi } from 'vitest'
// @ts-ignore TS6059 — scripts/ 는 server 의 추론 rootDir 밖이다 (위 주석 참고)
import { E2eError, QUIET_MS, api, expectQuiet, nextFrame, registerInbox } from '../../scripts/e2e-lib.mjs'

describe('e2e-lib', () => {
  it('expectQuiet 는 큐에 프레임이 있으면 거부하고, 침묵 창 동안 아무것도 없으면 해소된다', async () => {
    // 갈래 ①: 이미 큐에 쌓인 프레임도 실패다 — «오지 않았다» 는 도착 시점과 무관하다
    const noisy = {}
    registerInbox(noisy).queue.push({ type: 'message', id: 1 })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(expectQuiet(noisy, '큐에 이미 있다')).rejects.toBeInstanceOf(E2eError)

    // 갈래 ②: 빈 큐 + 아무것도 오지 않음 → 해소되며, 걸린 시간이 침묵 창 길이다
    const quiet = {}
    registerInbox(quiet)
    const t0 = performance.now()
    await expectQuiet(quiet, '조용하다')
    const elapsed = performance.now() - t0
    // setTimeout 은 예약 시각보다 1 ms 남짓 일찍 깰 수 있다(실측 599.87 ms, 2026-09-08 커밋 게이트) — 5 ms 여유를 둔다
    expect(elapsed).toBeGreaterThanOrEqual(QUIET_MS - 5)
    expect(elapsed).toBeLessThan(QUIET_MS + 200)
    errSpy.mockRestore()
  })

  it('nextFrame 은 시한을 넘기면 exitCode 1 의 E2eError 로 거부하고 [fail] 한 줄을 남긴다', async () => {
    const silent = {}
    registerInbox(silent)
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let caught: unknown
    try {
      await nextFrame(silent, '오지 않는 프레임', () => true, 50)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(E2eError)
    expect((caught as E2eError).exitCode).toBe(1)
    expect(errSpy.mock.calls.some(call => String(call[0]).startsWith('[fail] '))).toBe(true)
    errSpy.mockRestore()
  })

  it('api 는 cookie 를 헤더에 싣고 json 과 multipart 를 갈라 보낸다', async () => {
    const calls: { url: string; init: any }[] = []
    vi.stubGlobal('fetch', async (url: string, init: any) => {
      calls.push({ url, init })
      return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
    })

    const jsonCall = await api(4321, 'POST', '/api/x', { cookie: 'md_session=x', json: { a: 1 } })
    expect(jsonCall.status).toBe(200)
    expect(calls[0].url).toBe('http://127.0.0.1:4321/api/x')
    expect(calls[0].init.headers.cookie).toBe('md_session=x')
    expect(calls[0].init.headers['content-type']).toBe('application/json')
    expect(calls[0].init.body).toBe(JSON.stringify({ a: 1 }))

    const form = new FormData()
    form.append('body', '본문')
    await api(4321, 'POST', '/api/y', { cookie: 'md_session=x', form })
    expect(calls[1].init.body).toBeInstanceOf(FormData)
    // multipart 의 content-type 은 경계 문자열을 담아야 하므로 손수 넣지 않는다 — fetch 가 채운다
    expect(calls[1].init.headers['content-type']).toBeUndefined()

    vi.unstubAllGlobals()
  })
})
