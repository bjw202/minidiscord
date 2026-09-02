# t25 M5 변이 실측 — M (2026-09-01)

## 변이 내용

- 행: **M** — 자리 `pushChatMessage` 이름 조각, 최소 편집 «이름 절단 호출만 제거» (acceptance.md 변이표)
- 적용 편집: `channel/src/channel-server.ts` pushChatMessage 안
  `const nameFrag = truncateToBudget(neutralizeEnvelope(msg.author_name), MAX_NAME_BYTES)` →
  `const nameFrag = neutralizeEnvelope(msg.author_name)` (본문 절단은 그대로 둠 — 행 문언 «이름 절단 호출만»)
- 적용 전 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538  channel/src/channel-server.ts`
- 적용 후 shasum: `169eb1a59d0c433b0eddcfb1ef6978b5b9742c86  channel/src/channel-server.ts`
- 복원 후 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538  channel/src/channel-server.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-M.txt`.

## 예측과 관측

- 예측(변이표): **AC-004 ㉣ 실패**
- 관측: **AC-004 ㉣ 실패 확인** — 실패 목록에 `AC-BOTSTAB-004 (나) ㉣ — 이름 조각만 잘리고 본문 조각은 원문과 글자 그대로 같다` 가 있다. **예측과 일치.** 본문 절단을 남긴 채 이름만 뚫었는데 (나) 가 잡혔다 — «이름 조각만 잘린다» 단언의 변별력이 실측됐다.
- 부수 관측: 이름 절단 제거가 **이름 조각의 시길 탈출도 함께 걷어낸다**(escapeSigils 는 truncateToBudget 안에 산다) — E-11 이 함께 실패했고, 이름 무한 초과로 총상한이 깨진 E-10 도 함께 실패했다.

## 실패한 기준 이름 (관측)

```
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-004 (나) ㉣ — 이름 조각만 잘리고 본문 조각은 원문과 글자 그대로 같다
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > E-10 — 둘 다 초과하면 표시 두 개, content 는 파생 총상한 이하
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > E-11 — 이름 조각의 시길도 엔티티로 치환된다
```

## 스위트 요약 (관측)

```
 Test Files  1 failed | 6 passed (7)
      Tests  3 failed | 117 passed (120)
```
