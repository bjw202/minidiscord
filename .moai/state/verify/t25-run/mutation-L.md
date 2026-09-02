# t25 M5 변이 실측 — L (2026-09-01)

## 변이 내용

- 행: **L** — 자리 절단 원시함수, 최소 편집 «코드포인트 순회 → 바이트 슬라이스» (acceptance.md 변이표; plan.md §D 가 금지한 `Buffer.subarray` 형태 그대로)
- 적용 편집: `channel/src/truncate.ts` truncateToBudget 의 절단 루프 여섯 줄
  ```
  let kept = ''
  let keptBytes = 0
  for (const ch of escaped) { const b = Buffer.byteLength(ch, 'utf8'); if (keptBytes + b > keptBudget) break; kept += ch; keptBytes += b }
  ```
  →
  ```
  const kept = Buffer.from(escaped, 'utf8').subarray(0, keptBudget).toString('utf8')
  const keptBytes = Buffer.byteLength(kept, 'utf8')
  ```
- 적용 전 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts`
- 적용 후 shasum: `45f3f61417c1ccad8ca01e13027de8310aa21a6a  channel/src/truncate.ts`
- 복원 후 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-L.txt`.

## 예측과 관측

- 예측(변이표): **AC-011 실패**
- 관측: **AC-011 실패 확인** — ㉠~㉣ 를 재는 두 기준(순수 한국어 · 서로게이트 쌍 경계)이 모두 실패했다. **예측과 일치.** 코드포인트 경계 절단(plan.md §D)이 사라지면 대체 문자와 왕복 비동일이 관측된다는 설계가 실측됐다.
- 부수 관측: AC-009 ㉡·㉢ 도 함께 실패 — 쪼개진 바이트열이 위조 형태 선두 보존 단언도 깨뜨린다.

## 실패한 기준 이름 (관측)

```
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > AC-BOTSTAB-009 ㉡·㉢ — 상한을 넘으면 절단 한 번의 표시 한 쌍만 남고 그 쌍은 끝에 있다
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > AC-BOTSTAB-011 — 순수 한국어 절단은 코드포인트를 쪼개지 않는다
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > AC-BOTSTAB-011 ㉣ — 예산 경계가 서로게이트 쌍 한가운데에 와도 쪼개지지 않는다
```

## 스위트 요약 (관측)

```
 Test Files  1 failed | 6 passed (7)
      Tests  3 failed | 117 passed (120)
```
