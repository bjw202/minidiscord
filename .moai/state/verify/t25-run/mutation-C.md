# t25 M5 변이 실측 — C (2026-09-01)

## 변이 내용

- 행: **C** — 자리 `retry()` 첫 줄, 최소 편집 «무조건 `return`» (acceptance.md 변이표)
- 자리 구조 앵커: `channel/src/gateway-client.ts` `async function retry() {` 의 첫 문장 위치
- 적용 편집: `async function retry() {` 바로 다음 줄에 `return` 한 줄 삽입 (그 외 무변경)
- 적용 전 shasum: `1cb171887b3f69b624a0c06698f9eaa7fc58ec77  channel/src/gateway-client.ts`
- 적용 후 shasum: `f74146f5744e9d18b06c5494d6c6820313bf3d11  channel/src/gateway-client.ts`
- 복원 후 shasum: `1cb171887b3f69b624a0c06698f9eaa7fc58ec77  channel/src/gateway-client.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-C.txt`.

## 예측과 관측

- 예측(변이표): **AC-003 실패**
- 관측: **AC-003 실패 확인** — 실패 목록에 `reconnects exactly once when stop() is not called` (AC-BOTSTAB-003) 이 있다. **예측과 일치.**
- 부수 관측: retry() 가 죽으면 재접속이 필요한 형제 기준이 함께 빨개진다 — 총 **16 failed | 104 passed**. 실패한 기준 이름 전부:

```
 FAIL  test/gateway-client.test.ts > gateway client > waits then reconnects to the replaced opts.url and says hello again
 FAIL  test/gateway-client.test.ts > gateway client > doubles the backoff and never exceeds the ceiling
 FAIL  test/gateway-client.test.ts > gateway client > resets the backoff to 1000 after a successful connection
 FAIL  test/gateway-client.test.ts > gateway client > does not enter the retry path when close arrives after stop()
 FAIL  test/gateway-client.test.ts > gateway client > does not open a new connection when stop() lands during the backoff wait
 FAIL  test/gateway-client.test.ts > gateway client > reconnects exactly once when stop() is not called
 FAIL  test/gateway-client.test.ts > gateway client > the no-new-connection predicate fails for a replica that omits the stopped check
 FAIL  test/transport-auth.test.ts > transport auth > a history_response before welcome resolves nothing; after welcome it resolves
 FAIL  test/transport-auth.test.ts > transport auth > session establishment does not survive a reconnect
 FAIL  test/transport-auth.test.ts > transport auth > both nonces are regenerated per socket and a replayed challenge is refused
 FAIL  test/transport-auth.test.ts > transport auth > a malformed or wrong-length proof is refused without throwing (wrong)
 FAIL  test/transport-auth.test.ts > transport auth > a malformed or wrong-length proof is refused without throwing (short)
 FAIL  test/transport-auth.test.ts > transport auth > a malformed or wrong-length proof is refused without throwing (omit)
 FAIL  test/transport-auth.test.ts > transport auth > a malformed or wrong-length proof is refused without throwing (other-room)
 FAIL  test/transport-auth.test.ts > transport auth > a malformed or wrong-length proof is refused without throwing (bad-nonce)
 FAIL  test/transport-auth.test.ts > transport auth > a malformed or wrong-length proof is refused without throwing (pipe-nonce)
```

## 스위트 요약 (관측)

```
 Test Files  2 failed | 5 passed (7)
      Tests  16 failed | 104 passed (120)
```
