# t25 M5 — 간헐 실패 관측 기록 (flake-observations)

디스패치 지시: «플레이크한 테스트의 이름이 어떤 실행에서든 보이면 그 이름을 그대로 이 파일에 시각과 함께 기록한다 — run 레인은 그 정체가 필요하다».

## 관측 1

- 시각: 2026-09-01, M5 변이 G 1회차 실행 (전체 채널 스위트, `npx vitest run --root channel --reporter=dot`)
- 실패한 테스트 이름 (그대로):

```
transport auth > both nonces are regenerated per socket and a replayed challenge is refused
```

- 파일: `channel/test/transport-auth.test.ts`
- 맥락: 변이 G(index.ts 총 바이트 검사 제거) 적용 상태의 실행. 이 테스트는 이력 통로와 무관한 핸드셰이크 논스 테스트라 변이 G 의 예측·기제 양쪽과 무관했다 — 플레이크 프로토콜에 따라 **변이를 그대로 둔 채 1회 재실행**했고, 2회차에서는 통과했다(2회차 실패는 AC-BOTSTAB-008 한 건 — 변이 G 의 관측값).
- 판정: **간헐 실패(무관 판정)** — 카드 지시가 예고한 «전체 실행 ~7회 중 1회 관측된 미확인 간헐 실패» 의 **이름이 확보된 첫 사례**다. 원인 규명은 이 마일스톤의 범위가 아니며 run 레인 인계 사항이다.
- 원본 전문: `m5-raw/mutation-G.txt` (1회차) · `m5-raw/mutation-G-rerun.txt` (2회차)

## 관측 2

- 시각: 2026-09-01, M5 변이 M2 1회차 실행 (전체 채널 스위트, `npx vitest run --root channel --reporter=dot`)
- 실패한 테스트 이름 (그대로):

```
transport auth > both nonces are regenerated per socket and a replayed challenge is refused
```

- 파일: `channel/test/transport-auth.test.ts`
- 맥락: 변이 M2(테스트 파일 — AC-012 술어 약화) 적용 상태의 실행. 같은 테스트가 **이번 카드에서 두 번째 출현**(관측 1 — 변이 G 1회차). 플레이크 프로토콜대로 변이를 그대로 둔 채 1회 재실행했고 2회차에서는 통과했다(2회차 실패는 AC-012 한 건 — 변이 M2 의 관측값).
- 판정: **간헐 실패(재현 2회)** — 두 출현 모두 서로 다른 변이·서로 다른 파일의 실행에서 나왔고, 재실행에서 항상 소멸했다. 변이와의 인과는 없다(이 테스트는 게이트웨이 핸드셰이크 논스 테스트로 양 변이의 기제와 무관). 부하 의존 간헐 실패로 기록한다 — 원인 규명은 run 레인 인계 사항.
- 원본 전문: `m5-raw/mutation-M2.txt` (1회차) · `m5-raw/mutation-M2-rerun.txt` (2회차)

## 적용된 프로토콜 문언

«if a run shows a failure NOT matching the row's prediction, re-run the suite once before concluding. If the second run is green, record both runs and mark the row's observation accordingly. If the flaky test's NAME becomes visible in any run, record it verbatim in this file with the timestamp.»
