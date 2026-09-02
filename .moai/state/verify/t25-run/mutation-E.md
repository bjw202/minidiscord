# t25 M5 변이 실측 — E (2026-09-01)

## 변이 내용

- 행: **E** — 자리 절단 원시함수, 최소 편집 «모든 값에 표시 덧붙임» (acceptance.md 변이표; «/공백을 정규화한다» 대신 첫 갈래를 택했다)
- 적용 편집: `channel/src/truncate.ts` truncateToBudget 의 예산 이하 분기
  `if (totalBytes <= budgetBytes) return escaped` →
  `if (totalBytes <= budgetBytes) return escaped + formatMarker(0)`
- 적용 전 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts`
- 적용 후 shasum: `095fa387b0ed93119900d48277b1e56ae7bed97f  channel/src/truncate.ts`
- 복원 후 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-E.txt`.

## 예측과 관측

- 예측(변이표): **AC-005 실패**
- 관측: **AC-005 실패 확인** — (가)·(나) 둘 다 실패 목록에 있다. **예측과 일치.**
- 부수 관측: «모든 값» 에는 이름 조각·첨부 경로 조각도 포함되므로 파괴가 광역이다 — 상한 이하로 지나가는 모든 렌더 조각에 `⟪잘림: 0바이트 생략⟫` 이 붙어 등식·시길 개수 단언이 깨졌다. 17건 실패의 전부:

```
 FAIL  test/channel-server.test.ts > channel server > neutralizes channel envelope sequences in the body, the author name and the file path
 FAIL  test/channel-server.test.ts > channel server > leaves a body without envelope sequences byte-identical, and never touches meta
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-004 (가) — 본문 2배는 잘리고 표시가 붙고 앞부분은 살아 있다
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-004 (나) ㉣ — 이름 조각만 잘리고 본문 조각은 원문과 글자 그대로 같다
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-005 (가) — 상한 이하 본문은 글자 그대로, 표시 없고 meta 무변형
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-005 (나) — 정확한 형태와 근사 형태의 시길이 모두 엔티티로, 나머지는 원문 그대로
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-006 (가) — 짧은 경로가 많으면 OD-2 개만 실리고 표시가 있다
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > E-9 — 이름이 정확히 상한 바이트면 접두가 원문 그대로다
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > E-11 — 이름 조각의 시길도 엔티티로 치환된다
 FAIL  test/gateway-mutual-auth.test.ts > gateway mutual auth > the real server and the real channel agree end to end, envelope included
 FAIL  test/gateway-mutual-auth.test.ts > gateway mutual auth > a relaying man in the middle passes the handshake and still injects nothing
 FAIL  test/gateway-mutual-auth.test.ts > gateway mutual auth > on an unbound transport the same relay does take over, and the channel says so
 FAIL  test/index-wiring.test.ts > channel wiring > history renders as one structured JSON document
 FAIL  test/index-wiring.test.ts > channel wiring > a single poisoned message stays a single element and carries no live envelope sequence
 FAIL  test/transport-auth.test.ts > transport auth > after welcome, the same two frames reach the session exactly once each
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > AC-BOTSTAB-009 ㉠ — 위조 네 형태는 상한 이하에서 전부 탈출되고 날것 시길이 0 이다
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > E-2 — 예산과 정확히 같은 입력은 자르지도 표시도 붙이지 않는다
```

- (가) 가 실패한 기계적 이유 보충: 본문이 초과여도 **이름 조각 'alice' 가 예산 이하**라 표시가 덧붙어 `rawOpens(content) = 2` 가 됐다 — «모든 값» 이 문자 그대로 전 조각에 적용됨의 관측이다.

## 스위트 요약 (관측)

```
 Test Files  5 failed | 2 passed (7)
      Tests  17 failed | 103 passed (120)
```
