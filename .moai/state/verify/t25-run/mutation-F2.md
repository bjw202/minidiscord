# t25 M5 변이 실측 — F2 (2026-09-01)

## 변이 내용

- 행: **F2** — 자리 첨부 조각, 최소 편집 «원소 수 상한 제거» (acceptance.md 변이표)
- 적용 편집: `channel/src/channel-server.ts` buildAttachmentNote 안
  `const dropped = paths.slice(MAX_ATTACHMENTS)` →
  `const dropped = paths.slice(0, 0)` (버려짐이 없어진다 — 원소 수 상한 제거, 원소당 길이 절단은 그대로)
- 적용 전 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538  channel/src/channel-server.ts`
- 적용 후 shasum: `878f0128b7ee63244900fa73ac2538205d5abc99  channel/src/channel-server.ts`
- 복원 후 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538  channel/src/channel-server.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-F2.txt`.

## 예측과 관측

- 예측(변이표): **AC-006 실패**
- 관측: **AC-006 실패 확인** — 실패한 기준은 `AC-BOTSTAB-006 (가) — 짧은 경로가 많으면 OD-2 개만 실리고 표시가 있다` 정확히 한 건이다. **예측과 일치**, 부수 실패 없음. F1 이 (나) 를, F2 가 (가) 를 잡아 두 갈래가 갈라져 섬이 변이 실측으로 확인됐다.

## 실패한 기준 이름 (관측)

```
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-006 (가) — 짧은 경로가 많으면 OD-2 개만 실리고 표시가 있다
```

## 스위트 요약 (관측)

```
 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 119 passed (120)
```
