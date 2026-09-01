# M4 검증 증거 — SPEC-BOTSTAB-001 AC-BOTSTAB-007·008 + 엣지 E-1 (2026-09-01)

## RED (배선 전) — `npx vitest run test/index-wiring.test.ts`

```
Tests  2 failed | 15 passed (17)
  × history result stays under the total byte limit and carries the truncation marker (AC-BOTSTAB-007)
  × a truncated history derives the cursor from the kept ids only, dropping the newest first (AC-BOTSTAB-008)
```

- AC-007 ㉠: `AssertionError: expected 48079 to be less than or equal to 16000`
- AC-008 ㉠: `AssertionError: expected 5 to be less than 5`
- E-1 은 회귀 가드 — 배선 전에도 통과(예측대로).

## GREEN (배선 후) — `npx vitest run test/index-wiring.test.ts`

```
Test Files  1 passed (1)
Tests  17 passed (17)
```

## 변이 실측 — AC-008 의 변별력

기준 shasum `a9d44572869fcfc1e24d4b54dec6be2d8e0afb06`(channel/src/index.ts) — 두 변이 각각 적용 후 원본 복원, 복원 뒤 동일 shasum 확인.

- 변이 H(오래된 것부터 버림 — 비교 부등호 반전): `Tests  1 failed | 16 skipped (17)` — `AssertionError: expected 105 to be less than 105` ← AC-008 ㉢ 에서 실패
- 변이 I(cursor 를 응답 전체 최댓값으로): `Tests  1 failed | 16 skipped (17)` — `AssertionError: expected 105 to be 103` ← AC-008 ㉡ 에서 실패

## 전체 스위트 — `npm test -w channel`

```
Test Files  7 passed (7)
Tests  119 passed (119)
```

산술: 기준선 116 + 신규 3(AC-007·AC-008·E-1) = 119. 기존 기준 실패 0.

## 타입검사 — `npm run typecheck -w channel`

```
tsc --noEmit → exit 0
```

## diff 범위 — `git diff --stat`(이 마일스톤 분)

```
channel/src/index.ts               |  38 ++++--
channel/test/index-wiring.test.ts  |  85 +++++++++++++
```

그 외 변경( progress.md·channel-server.ts·channel-server.test.ts·gateway-client.test.ts·truncate.ts·truncate.test.ts )은 M1–M3 의 기존 미커밋 작업 — 이 마일스톤이 만진 것은 위 두 파일뿐이다.
