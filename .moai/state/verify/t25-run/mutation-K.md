# t25 M5 변이 실측 — K (2026-09-01, 정정 재측정)

> **1차 관측은 변이 생존이었다** — 당시 AC-010 테스트는 원시함수를 직접 불러 배선을 지나지 않아 배선 순서 반전을 아무 기준도 보지 못했다. 1차 전문과 생존 사유는 `m5-mutation-observations.md` 행 K 이력과 아래 «1차와의 차이» 절에 남긴다. 이 파일은 배선 목격 기준 추가 «뒤»의 정정 재측정이다.

## 변이 내용

- 행: **K** — 자리 렌더 지점, 최소 편집 «절단·중화 순서 맞바꿈» (acceptance.md 변이표)
- 적용 편집(이번 재측정은 **channel-server.ts 알림 통로 자리 한 곳** — 새 목격 기준이 지키는 통로):
  - `channel/src/channel-server.ts` pushChatMessage :173-174:
    `truncateToBudget(neutralizeEnvelope(x), 상한)` → `neutralizeEnvelope(truncateToBudget(x, 상한))` (이름·본문 두 줄)
  - `channel/src/index.ts` 이력 통로는 이번 재측정에서 재적용하지 않았다 — 그 자리의 단독 반전을 잣대는 기준은 이번에도 없다(잔여는 통합표 행 K 비고와 리드 회부 참조).
- 적용 전 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538  channel/src/channel-server.ts`
- 적용 후 shasum: `e07a5b471d5c65e6a718d945be03e93acbd59553  channel/src/channel-server.ts` — **1차 실측의 적용 후 값과 바이트 단위로 같은 변이임이 확인됐다**
- 복원 후 shasum: `1cfd24b2702b3a01e9b5398f7da73205527e3538` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED — 변이 포착)**. 실패 1 / 통과 120 (121).

## RED 원본 (그대로 인용)

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/channel-server.test.ts > pushChatMessage truncation wiring (SPEC-BOTSTAB-001 M3) > AC-BOTSTAB-010 — 배선에서도 중화 뒤 절단이 성립한다 (변이 K 목격 기준)
AssertionError: expected 4400 to be less than or equal to 4000
 ❯ test/channel-server.test.ts:572:49
    570|     // 총상한을 넘지 못하므로, 순서가 부러지는 지점인 조각 상한을 나란히 재야 변이 K 가 잡힌다.
    571|     const bodyFrag = content.slice(content.indexOf('] ') + 2) // 이름에 «…
    572|     expect(Buffer.byteLength(bodyFrag, 'utf8')).toBeLessThanOrEqual(MA…
       |                                                 ^
    573|     // ㉡ — 날것 봉투 시퀀스는 하나도 없다 (중화는 여전히 유효하다)
    574|     expect(content).not.toMatch(/<\/?channel/i)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 120 passed (121)
   Start at  17:24:58
   Duration  65.21s (transform 434ms, setup 0ms, import 1.22s, tests 70.39s, environment 0ms)
```

- **실패한 기준 이름(전수 — 1건뿐)**: `AC-BOTSTAB-010 — 배선에서도 중화 뒤 절단이 성립한다 (변이 K 목격 기준)` (`test/channel-server.test.ts`, M3 배선 블록)
- 실패 문언이 변이의 본질을 그대로 보여 준다: 절단이 먼저 돌아 중화 전 3,200바이트를 자르지 않았고, 뒤이은 중화가 본문 조각을 4,400바이트로 팽창시켜 본문 상한 4,000바이트를 깼다. 표시(㉢)도 없었다 — 자를 근거가 절단 시점에 없었기 때문이다.

## 예측과 관측

- 예측(변이표): **AC-010 실패**
- 관측: **예측과 일치 — AC-010 배선 목격 기준이 변이를 포착했다.** 실패한 기준은 새 배선 목격 기준 단 하나, 부수 실패 0.

## 1차와의 차이 (이 파일이 갈아엎인 이유)

| | 1차 (m5-raw/mutation-K.txt) | 정정 재측정 (이 파일) |
|---|---|---|
| 변이 범위 | channel-server.ts + index.ts 두 자리 완전 적용 | channel-server.ts 알림 통로 자리 한 곳 |
| 스위트 | 120 (배선 목격 없음) | 121 (배선 목격 +1) |
| 관측 | **실패 0 — 변이 생존 (exit=0)** | **실패 1 — AC-010 배선 목격 포착 (exit=1)** |

- 1차 생존 사유: AC-010 테스트(`channel/test/truncate.test.ts`)가 `truncateToBudget(neutralized, budget)` 를 원시함수에 직접 불러 배선을 지나지 않았고, 기존 배선 fixture 는 «예산 초과 ∧ 봉투 시퀀스 포함» 을 동시에 담은 입력이 하나도 없어 순서 반전이 산출 바이트를 한 곳도 바꾸지 못했다.
- 정정 수단: `channel/test/channel-server.test.ts` 에 배선 목격 기준 1건 추가(부가적 — 기존 기준 손대지 않았다). 같은 Given 을 `pushChatMessage` 배선으로 흘려 «중화 전 이하 ∧ 중화 뒤 초과» fixture 로 순서를 결과로 잰다. 총상한(≈14.5K)만으로는 11/8 팽창이 잡히지 않아, 순서가 부러지는 지점인 **본문 조각 상한(OD-1)** 을 나란히 단언한다.
- 스위트 수: 120 → 121 (추가된 기준 = AC-BOTSTAB-010 배선 목격 1건)
