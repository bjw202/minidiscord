# t25 손 변이 B 실측 (M1 · DoD 증거 항목) — 2026-09-01

## 변이 내용

- 자리: `channel/src/gateway-client.ts` `retry()` 안, `await sleep(backoff)` 직후
- 최소 편집: `if (stopped) return   // 대기 중에 stop() 이 불렸으면 새 소켓을 열지 않는다` **한 줄 삭제** (그 외 무변경)
- 적용 전 shasum: `1cb171887b3f69b624a0c06698f9eaa7fc58ec77  channel/src/gateway-client.ts`
- 적용 후 shasum: `13558a2ce08db4d186d1a75d3f2b0eb136edc9a2  channel/src/gateway-client.ts`
- 복원 후 shasum: `1cb171887b3f69b624a0c06698f9eaa7fc58ec77  channel/src/gateway-client.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다.

## 실패한 기준 이름 (관측)

```
FAIL  test/gateway-client.test.ts > gateway client > does not open a new connection when stop() lands during the backoff wait
FAIL  test/gateway-client.test.ts > gateway client > the no-new-connection predicate fails for a replica that omits the stopped check
```

- 첫 줄 = AC-BOTSTAB-001 — 계획 단계 예측과 일치한다. 개정 전 기준(95 passed 기준선)에서는 변이 B 가 **생존**했고, 그 생존이 이 관측으로 사라졌다 (acceptance.md DoD 증거 항목 2).
- 둘째 줄 = AC-BOTSTAB-012 ㉡ — 같은 시나리오의 판별력 측정 단계에서 진짜 클라이언트 쪽이 기대(증가 0)에 실패한 것으로, 같은 결함의 두 번째 관측이다.

## 스위트 요약 (관측)

```
 Test Files  1 failed | 5 passed (6)
      Tests  2 failed | 96 passed (98)
```

## 실패 상세 (실행 출력 그대로)

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/gateway-client.test.ts > gateway client > does not open a new connection when stop() lands during the backoff wait
AssertionError: expected 3 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 3

 ❯ test/gateway-client.test.ts:499:32
    497|     await letWorldTurn(srv)                        // 세계가 돌았음의 증거를 관측한…
    498|     // +1 은 probe 자신 — 클라이언트가 stop() 뒤에 만든 연결은 0 건이어야 한다 (재접속이 있었다면 +2…
    499|     expect(srv.sockets.length).toBe(atStop + 1)
       |                                ^
    500|   })
    501|

⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  test/gateway-client.test.ts > gateway client > the no-new-connection predicate fails for a replica that omits the stopped check
AssertionError: expected 3 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 3

 ❯ test/gateway-client.test.ts:533:32
    531|     await letWorldTurn(srv)
    532|     // ㉡ 같은 술어가 진짜 클라이언트에는 참이다 — +1 은 probe 자신 (술어: stop() 시점 값에서 증가 0)
    533|     expect(srv.sockets.length).toBe(realAtStop + 1)
       |                                ^
    534|

    535|     const srv2 = startServer()

⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯
```

`+3 vs 기대 +2` 의 뜻: stop() 시점 연결 수 1(=atStop) + probe 1 = 기대 2, 실제 3 — stop() 뒤에 클라이언트가 **새 연결 1건을 더** 열었다. 가드 ② 가 지워진 대로다.
