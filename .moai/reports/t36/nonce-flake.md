# t36 — 논스 시험 거짓 실패: 규명과 수리 (nonce-flake)

- 카드: t36 (B급 — 원인 미상 결함, plan 생략)
- 나무: `.claude/worktrees/t36` · 브랜치 `WT-nonce-flake` · 기준선 `c60e9c9` (origin/main)
- 대상: `channel/test/transport-auth.test.ts > both nonces are regenerated per socket and a replayed challenge is refused`
- 작성: run 레인, 2026-09-04

## 1. 주장 (Claim)

1. 이 시험의 거짓 실패 원인은 «논스 재생성의 결함»도 «시간 상한 부족»도 아니고, **기준이 엉뚱한 사건을 기다린 것**이다: `waitFor(() => stub.connections() === 2)` 는 «소켓 둘째 연결 수용»을 기다리는데, 단언이 읽는 `stub.nonceSeen()` 은 «둘째 hello 메시지 처리»에서만 갱신된다. 두 사건은 이벤트 루프의 별개 작업이라, 폴링이 그 사이에 끼면 낡은 논스를 읽어 «값 동일» 단언이 깨진다.
2. 수리는 대기 조건을 `stub.nonceSeen() !== nonce1` («새 논스 관측») 로 바꾸는 것으로 충분하다. 상한(4500ms)은 그대로 둔다.
3. 수리 후: 20회 연속 통과, channel 스위트 126개 전부 통과.

## 2. 근거 (Evidence)

### 2.1 CI 첫 노출 — 값 동일 단언 실패 (시간 초과 아님)

- CI run `33838590462` (병합 «t33 → WT-spec-triage-merge», head `a489378`) 1차 시도, job `100916041534`, `Run npm test` 단계 failure (04:55:27 → 05:01:34 UTC).
- 실패 본문 (보존 로그 `.moai/reports/t36/ci-attempt1-job100916041534.log` 527-543행):

```
FAIL test/transport-auth.test.ts > transport auth > both nonces are regenerated per socket and a replayed challenge is refused
AssertionError: expected '81cd789471c39a22e2f49d33e9025cfff9590…' not to be '81cd789471c39a22e2f49d33e9025cfff9590…'
❯ test/transport-auth.test.ts:744:24
742|     await waitFor(() => stub.connections() === 2, '재접속', 4500)
743|     const nonce2 = stub.nonceSeen()
744|     expect(nonce2).not.toBe(nonce1)
```

- 같은 시험 1027ms 만에 실패 — 4500ms 대기가 아니라 연결 수 2 달성 직후의 단언 실패다. 재실행(attempt 2) 같은 시험 통과 1428ms — 자가소멸.

### 2.2 코드 판독 — 두 사건은 별개다

- `connections` 는 접속 수용 시 `++` 되는 **누적값**이다 (`channel/test/transport-auth.test.ts:174-175`, «connections 는 누적값» 주석 `:241`).
- `nonceSeen` 은 **hello 메시지가 스텁에 도착해 처리될 때만** 갱신된다 (`:184-185`).
- 클라이언트는 `connect()` 마다 `randomBytes(32)` 로 논스를 새로 만들고 hello 를 open 직속으로 보낸다 (`channel/src/gateway-client.ts:119-128`, «논스는 connect() 마다 새로 만든다» 주석). 즉 **재생성 속성은 언제나 참**이고, 실패한 것은 관측 지점이었다.

### 2.3 무부하 유기적 재현 — 20회 중 2회, CI 와 같은 서명

- 명령: `npm test -w channel -- test/transport-auth.test.ts -t "both nonces"` × 20 (배경 부하 없음).
- 결과: **18 pass / 2 fail** (`.moai/reports/t36/baseline-old-20runs.txt`).
- 실패 2건(run 3·9) 모두 CI 와 동일 서명: `AssertionError: expected '…' not to be '…'` at `:744` (`.moai/reports/t36/t36-old-run-3.log`, `t36-old-run-9.log`).
- 부하는 불필요했다 — 불운한 폴링 끼임만으로 터진다. CI 단일 테넌트 실패와 정합.

### 2.4 결정적 재현 — «연결 수 2, 논스는 낡은 값» 상태의 인위적 관측

- 별도 재현 시험(`test/t36-repro.test.ts`, **커밋하지 않음** — 전문은 §6 부록)을 만들어, 진짜 `wire()` 클라이언트의 첫 hello 로 논스를 관측한 뒤 «붙기만 하고 hello 를 보내지 않는» 둘째 소켓을 열었다.
- 결과: `connections === 2` 인 상태에서 `nonceSeen === nonce1` 이 **결정적으로** 성립(구형 기준이 깨지는 바로 그 상태), 이어 hello 를 보내자 «새 논스 관측» 대기가 풀렸다. 실행 로그 `.moai/reports/t36/t36-repro-run.log` (1 passed).

### 2.5 변이 — 수리안의 이빨 확인

- 변이: `gateway-client.ts` 의 논스 생성을 모듈 스코프로 올려 «소켓마다 재생성»을 깬다 — 원본 주석(`:119-120`)이 경고하는 버그 모양 그대로.
- 결과: 수리안이 **`waitFor timeout: 재접속 뒤 새 논스 관측`** (4553ms) 으로 실패 — 재생성이 깨지면 새 기준이 잡는다 (`.moai/reports/t36/t36-mutation-run.log`, exit=1).
- 복원 확인: `git hash-object channel/src/gateway-client.ts` — 변이 전후 모두 `392855623ffdc2f645fad7401006eb6d4e29d04a`.

### 2.6 수리 후

- 수리: `transport-auth.test.ts` 대기 조건을 `stub.connections() === 2` → `stub.nonceSeen() !== nonce1` 로 교체(주석에 원인·증거 인용), 단언·상한 유지.
- 20회 연속: **20 pass / 0 fail** (`.moai/reports/t36/fixed-20runs.txt`).
- channel 스위트 전체: **126 passed, exit=0** (`.moai/reports/t36/t36-channel-suite.log`).

## 3. Baseline 귀속

- 로컬 실행 전부: 이 나무 `WT-nonce-flake` (기준선 `c60e9c9` + 본 수리 변경분), macOS 로컬, `npm ci` 직후.
- CI 실패 로그: head `a489378` 트리(수리 이전) — 구형 기준의 실패 증거로만 인용.
- 보고서의 모든 수치는 명령 재실행으로 다시 얻을 수 있다 (명령줄 본문 기재).

## 4. 단서 (3) — server 스위트 404 건 판단 (리드 처분 요청)

t37 sync-audit(`.moai/reports/t37/sync-audit.md:179-194`)의 기록과 이번 코드 판독을 맞춰 본 결과:

1. **«서버가 서기 전에 붙는다» 는 부류 명칭과 이 시험 구조가 맞지 않는다.** `server/test/gateway.test.ts:54` 은 `await app.listen({ port: 0 })` — 리슨 완료를 기다린 뒤 포트를 돌려주고, 실패한 시험(`:713-717`)도 그 포트로 접속한다.
2. **404 는 «안 떠 있음» 의 반대 증거다.** 안 떠 있는 포트에 연결하면 ECONNREFUSED 다. 404 는 «떠 있는 HTTP 서버가 이 경로를 모른다» 는 응답이다. t37 이 적은 «즉시 404 (서버가 아직 듣지 않는 상태)» 해석(`:192`)과 긴장한다.
3. **404 응답자 후보.** `server/src/gateway.ts:98` 은 `new WebSocketServer({ server: app.server, path: '/bot' })` — ws 는 경로 미스 시 응답 없이 무시하므로(라이브러리 동작 기준, 가설 등급) 404 응답자는 다른 무엇이다. 후보: 닫힌 앱의 포트를 되살아 있는 재접속 클라이언트(채널 자식 프로세스의 backoff 재접속 등)가 치는 포트 재할당 경합 — 병렬 실행(`moai gate`)에서만 관측된 t37 실측과 방향이 맞는다.

**권고**: t36 에 흡수하지 말고 별도 카드(예: t38)로 «병렬 실행 하 server 스위트 404» 를 규명할 것. 이유: (ⅰ) 실패 서명이 다르다(값 동일 vs 404), (ⅱ) t36 에서 검증한 기제(관측 사건≠대기 사건)가 server 건에는 성립하지 않은 채다 — 404 응답자 규명이 먼저다, (ⅲ) 한 커밋에 닫힌 수리와 열린 규명을 섞지 않는다. 위 1-3 은 코드 판독에 바탕한 가설이며 검증된 결함 주장이 아니다 — 처분은 리드 몫.

## 5. Gaps (미검증)

- **부하를 인위적으로 걸은 대조는 없다.** 리드의 «배경 부하 스폰 금지» 지시와, 무부하에서 이미 2/20 이 터져 부하 가설이 불필요해진 실측에 근거해 생략했다. «부하가 끼임 확률을 얼마나 넓히는지»의 정량 값은 없다.
- CI 재실행(attempt 2)은 목록·요약 줄로만 확인했고 전체 로그는 수집하지 않았다 (통과 줄 1428ms 만 인용).
- server 404 건은 규명하지 않았다 (§4 권고대로 별도 카드 항목).
- 결정적 재현 시험을 회귀 스위트로 남기지 않았다 — 기록(§6 부록)으로만 보존. 이 상태를 영구 잡는 스위트가 필요하면 후속 카드로.

## 6. 부록 — 재현 시험 전문 (커밋하지 않음)

```ts
// t36 재현 시험 — 구형 기준 «waitFor(connections===2) 직후 nonceSeen 읽기» 가 깨지는 상태를
// 결정적으로 만든다. «늦은 hello» 의 극한형: 붙기만 하고 hello 를 보내지 않는 둘째 소켓.
import { describe, it, expect, afterEach } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import { wire } from '../src/index.js'

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) await c() })

async function waitFor(pred: () => boolean, label: string, ms = 4500): Promise<void> {
  const t0 = Date.now()
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`waitFor timeout: ${label}`)
    await new Promise(r => setTimeout(r, 5))
  }
}

describe('t36 nonce flake reproduction', () => {
  it('connection count reaching 2 does not imply the second hello has arrived', async () => {
    const wss = new WebSocketServer({ port: 0 })
    let connections = 0
    let nonceSeen = ''
    wss.on('connection', ws => {
      connections++
      ws.on('message', d => {
        const m = JSON.parse(String(d))
        if (m.type === 'hello') nonceSeen = m.client_nonce
      })
    })
    cleanups.push(() => new Promise<void>(r => wss.close(() => r())))
    const port = (wss.address() as { port: number }).port

    const { gw } = wire({ url: `ws://127.0.0.1:${port}/bot`, token: 'tok' })
    cleanups.push(() => gw.stop())
    gw.start()
    await waitFor(() => nonceSeen !== '', '첫 hello')
    const nonce1 = nonceSeen

    const late = new WebSocket(`ws://127.0.0.1:${port}/bot`)
    cleanups.push(() => late.close())
    await new Promise<void>(r => late.on('open', () => r()))
    await waitFor(() => connections === 2, '둘째 연결')

    expect(connections).toBe(2)
    expect(nonceSeen).toBe(nonce1)     // ← 구형 기준이 여기서 «값 동일» 로 깨진다 (CI 실측과 같은 상태)

    late.send(JSON.stringify({ type: 'hello', pub: 'unobserved', client_nonce: 'f'.repeat(64) }))
    await waitFor(() => nonceSeen !== nonce1, '재접속 뒤 새 논스 관측')
    expect(nonceSeen).not.toBe(nonce1)
  })
})
```
