# t25 손 변이 A 실측 (M1 · DoD 증거 항목) — 2026-09-01

## 변이 내용

- 자리: `channel/src/gateway-client.ts` `connect()` 안 `ws.on('close')` 처리기
- 최소 편집: `if (!stopped) retry()` → `retry()` (가드 ① 삭제, 그 외 무변경)
- 적용 전 shasum: `1cb171887b3f69b624a0c06698f9eaa7fc58ec77  channel/src/gateway-client.ts`
- 적용 후 shasum: `001eed05df54e7c01d2795dbce915242f58320f1  channel/src/gateway-client.ts`
- 복원 후 shasum: `1cb171887b3f69b624a0c06698f9eaa7fc58ec77  channel/src/gateway-client.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 변이 B 는 이 실행 전에 복원·shasum 확인까지 마친 뒤였다 (한 번에 하나씩).

## 실패한 기준 이름 (관측)

```
FAIL  test/gateway-client.test.ts > gateway client > does not enter the retry path when close arrives after stop()
```

- 제목을 고친 그 기준(AC-BOTSTAB-002 귀속, AC-CHANCLIENT-014)이 **실패 목록에 있다** — 예측(plan §J 3)과 정확히 일치한다. 단언은 한 글자도 바뀌지 않았고 제목만 고쳐져 있다.

## 스위트 요약 (관측)

```
 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 97 passed (98)
```

## 실패 상세 (실행 출력 그대로)

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/gateway-client.test.ts > gateway client > does not enter the retry path when close arrives after stop()
AssertionError: expected [ 1000 ] to deeply equal []

- Expected
+ Received

- []
+ [
+   1000,
+ ]

 ❯ test/gateway-client.test.ts:478:28
    476|
    477|     await waitFor(() => control.sleeps.length >= 1)      // 대조군이 재접속 대…
    478|     expect(stopped.sleeps).toEqual([])                   // 멈춘 쪽은 대기조차…
       |                            ^
    479|     expect(stopped.client.send({ type: 'anything' })).toBe(false)
    480|   })
```

`[1000] vs []` 의 뜻: stop() 뒤에 도착한 close 가 재시도 경로에 들어갔고(가드 ① 부재), 그 사실이 `sleeps` 에 기록됐다. 이 기준이 재는 것 — «대기조차 시작하지 않음» — 이 정확히 깨졌다.
