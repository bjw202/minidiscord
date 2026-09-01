# t25 M5 변이 실측 — D (2026-09-01)

## 변이 내용

- 행: **D** — 자리 `pushChatMessage` 본문 조각, 최소 편집 «절단 호출 제거» (acceptance.md 변이표)
- 적용 편집: `channel/src/channel-server.ts` pushChatMessage 안
  `const bodyFrag = truncateToBudget(neutralizeEnvelope(msg.body), MAX_BODY_BYTES)` →
  `const bodyFrag = neutralizeEnvelope(msg.body)` (그 외 무변경)
- 적용 전 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538  channel/src/channel-server.ts`
- 적용 후 shasum: `a8a2176bff581bad6b4ca54be2af5a51d6956412  channel/src/channel-server.ts`
- 복원 후 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538  channel/src/channel-server.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-D.txt`.

## 예측과 관측

- 예측(변이표): **AC-004 실패**
- 관측: **AC-004 실패 확인** — 실패 목록에 `AC-BOTSTAB-004 (가) — 본문 2배는 잘리고 표시가 붙고 앞부분은 살아 있다` 가 있다. **예측과 일치.**
- 부수 관측: 절단 호출 제거가 **시길 탈출도 함께 걷어낸다**(escapeSigils 는 truncateToBudget 안에 산다 — plan.md §C-4) — 사람이 타이핑한 시길이 날것으로 통과해 AC-005 (나) 가 함께 실패했고, 이름·본문 둘 다 초과 시나리오 E-10 도 함께 실패했다.

## 실패한 기준 이름 (관측)

```
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-004 (가) — 본문 2배는 잘리고 표시가 붙고 앞부분은 살아 있다
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-005 (나) — 정확한 형태와 근사 형태의 시길이 모두 엔티티로, 나머지는 원문 그대로
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > E-10 — 둘 다 초과하면 표시 두 개, content 는 파생 총상한 이하
```

## 스위트 요약 (관측)

```
 Test Files  1 failed | 6 passed (7)
      Tests  3 failed | 117 passed (120)
```
