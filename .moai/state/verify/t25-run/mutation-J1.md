# t25 M5 변이 실측 — J1 (2026-09-01)

## 변이 내용

- 행: **J1** — 자리 절단 원시함수, 최소 편집 «시길 탈출 규칙 제거» (acceptance.md 변이표)
- 적용 편집: `channel/src/truncate.ts` truncateToBudget 첫 줄
  `const escaped = escapeSigils(text)` → `const escaped = text`
- 적용 전 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts`
- 적용 후 shasum: `3cc989db42f0b4533eacea999d90e77f1d27ae78  channel/src/truncate.ts`
- 복원 후 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-J1.txt`.

## 예측과 관측

- 예측(변이표): **AC-009 실패**
- 관측: **AC-009 실패 확인** — ㉠(날것 시길 0)·㉡·㉢(표시 한 쌍·비시길 무변형) 모두 실패 목록에 있다. **예측과 일치.** 사람 유래 날것 시길이 «시스템이 붙인 것뿔» 계약을 깨는 전 경로(알림 본문·이름 조각)가 함께 잡혔다.

## 실패한 기준 이름 (관측)

```
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-005 (나) — 정확한 형태와 근사 형태의 시길이 모두 엔티티로, 나머지는 원문 그대로
 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > E-11 — 이름 조각의 시길도 엔티티로 치환된다
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > AC-BOTSTAB-009 ㉠ — 위조 네 형태는 상한 이하에서 전부 탈출되고 날것 시길이 0 이다
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > AC-BOTSTAB-009 ㉡·㉢ — 상한을 넘으면 절단 한 번의 표시 한 쌍만 남고 그 쌍은 끝에 있다
```

## 스위트 요약 (관측)

```
 Test Files  2 failed | 5 passed (7)
      Tests  4 failed | 116 passed (120)
```
