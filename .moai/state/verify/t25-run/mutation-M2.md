# t25 M5 변이 실측 — M2 (2026-09-01)

## 변이 내용

- 행: **M2** — 자리 «AC-001 의 술어», 최소 편집 «「서버 쪽 연결 수」 → 「내부 `stopped` 값»» (acceptance.md 변이표) — **테스트 파일 변이**(`channel/test/gateway-client.test.ts`, src 무변경)
- 적용 편집(둘):
  1. `startReplica` 대역이 자기 내부 값을 노출 — `return { stop() { … } }` →
     `return { stop() { … }, stoppedValue: () => stopped }` (약해진 술어를 표현하기 위한 하네스 노출 — 대역은 테스트 파일 안에 있어 src 수정 없이 가능)
  2. AC-012 ㉠ 단언을 약해진 술어로 교체 —
     `expect(srv2.sockets.length).toBe(replicaAtStop + 1)` →
     `expect(replica.stoppedValue()).toBe(false)` («대역이 멈추지 않았어야 한다» — 내부 값 기준)
- 적용 범위 공시: 약해진 술어를 **㉠ 지점에 적용했다**. AC-012 ㉡(진짜 클라이언트 쪽, `:533`)과 AC-001 본문(`:499`)의 술어는 내부 값이 하네스에서 도달할 수 없어(createGatewayClient 가 `stopped` 를 노출하지 않는다 — 노출하려면 src 를 고쳐야 하고 그것은 M1·M5 가 금지한다) 원형을 유지했다. ㉠ 이 이 기준이 지키려는 유일한 판정 지점이다(«대역에 대해 거짓이어야 한다»).
- 적용 전 shasum: `bc8ae9fcc0b15133fe402afd1a3336028e87b774  channel/test/gateway-client.test.ts`
- 적용 후 shasum: `3f1cd3b9e8d5431699d5437a36c1c1bc9d3da7b8  channel/test/gateway-client.test.ts`
- 복원 후 shasum: `bc8ae9fcc0b15133fe402afd1a3336028e87b774  channel/test/gateway-client.test.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

- 1회차: **exit=1 (RED)** — 원본 전문: `m5-raw/mutation-M2.txt`
- 2회차(플레이크 프로토콜 재실행 — 변이 적용 상태 그대로): **exit=1 (RED)** — 원본 전문: `m5-raw/mutation-M2-rerun.txt`

## 예측과 관측

- 예측(변이표): **AC-012 ㉠ 실패**
- 관측: **AC-012 ㉠ 실패 확인** — 두 실행 모두 AC-012 테스트만 실패했다. **예측과 일치.** 실패 상세(실행 출력 그대로):

```
 FAIL  test/gateway-client.test.ts > gateway client > the no-new-connection predicate fails for a replica that omits the stopped check
AssertionError: expected true to be false // Object.is equality
```

  (`replica.stoppedValue()` 가 `true` — 대역도 stop() 이 불리면 내부 값이 참이 된다. 약해진 술어는 대역과 진짜 클라이언트를 가르지 못하고, 그 사실을 술어 자신은 알아채지 못한다 — AC-012 본문이 말한 그대로의 관측이다.)
- 부수: 1회차에 간헐 실패 1건(transport-auth nonces) 동반 — 2회차에서 사라짐. `flake-observations.md` 관측 2 참고.

## 스위트 요약 (관측)

```
1회차: Test Files  2 failed | 5 passed (7)   /   Tests  2 failed | 118 passed (120)
2회차: Test Files  1 failed | 6 passed (7)   /   Tests  1 failed | 119 passed (120)
```
