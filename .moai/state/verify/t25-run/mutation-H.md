# t25 M5 변이 실측 — H (2026-09-01)

## 변이 내용

- 행: **H** — 자리 `fetchHistory`, 최소 편집 «버리는 방향을 오래된 것부터로» (acceptance.md 변이표)
- 적용 편집: `channel/src/index.ts` fetchHistory 2단계 버리기 대상 선정의 비교 부등호 반전
  `if (kept[i].id > kept[newest].id) newest = i` → `if (kept[i].id < kept[newest].id) newest = i`
- 적용 전 shasum: `a9d44572869fcfc1e24d4b54dec6be2d8e0afb06  channel/src/index.ts`
- 적용 후 shasum: `5bfa227b1dc842015769bbdac67a969c09f62e9c  channel/src/index.ts`
- 복원 후 shasum: `a9d44572869fcfc1e24d4b54dec6be2d8e0afb06  channel/src/index.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-H.txt`.

## 예측과 관측

- 예측(변이표): **AC-008 실패**
- 관측: **AC-008 실패 확인** — 실패한 기준은 AC-BOTSTAB-008 정확히 한 건. **예측과 일치**, 부수 실패 없음.
- 귀속: 이 변이는 M4 검증에서도 관측됐다(`m4-evidence.md` — 단일 파일 실행, `expected 105 to be less than 105` ← AC-008 ㉢). 본 실행은 **전체 스위트** 기준 관측으로 통일했다.

## 실패한 기준 이름 (관측)

```
 FAIL  test/index-wiring.test.ts > channel wiring > a truncated history derives the cursor from the kept ids only, dropping the newest first (AC-BOTSTAB-008)
```

## 스위트 요약 (관측)

```
 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 119 passed (120)
```
