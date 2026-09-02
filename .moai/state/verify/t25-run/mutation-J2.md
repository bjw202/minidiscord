# t25 M5 변이 실측 — J2 (2026-09-01)

## 변이 내용

- 행: **J2** — 자리 절단 원시함수, 최소 편집 «탈출 방아쇠를 시길 → 리터럴 `⟪잘림:` 으로 되돌림» (acceptance.md 변이표 — 계획 감사 A-04 이전 상태로의 되돌림)
- 적용 편집: `channel/src/truncate.ts` escapeSigils 본문 한 줄
  `return text.replaceAll(SIGIL_OPEN, SIGIL_OPEN_ESCAPE).replaceAll(SIGIL_CLOSE, SIGIL_CLOSE_ESCAPE)` →
  `return text.replaceAll(\`${SIGIL_OPEN}잘림:\`, \`${SIGIL_OPEN_ESCAPE}잘림:\`)`
  (방아쇠가 «시길 한 글자» 에서 «리터럴 ⟪잘림:» 로 좁아진다 — 뒤따르는 낱말을 보게 된다)
- 적용 전 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts`
- 적용 후 shasum: `608b87ae1bc3eb4fbd89c3b1691cabc153c8ddcb  channel/src/truncate.ts`
- 복원 후 shasum: `ebbfd01d8137eac25657716d5a61fcf97a29263b  channel/src/truncate.ts` — **적용 전 값과 일치 (복원 확인)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-J2.txt`.

## 예측과 관측

- 예측(변이표): **AC-009 ㉠ 실패 (근사 형태가 통과)**
- 관측: **AC-009 ㉠ 실패 확인 — 예측과 일치.** 좁아진 방아쇠의 두 결함이 그대로 관측됐다: ① 근사 형태(`⟪잘림 : …⟫`·`⟪ 잘림: …⟫`·`⟪TRUNCATED 500B⟫`)는 리터럴과 어긋나 아예 탈출을 타지 못하고, ② 정확한 형태조차 닫는 시길 `⟫` 이 날것으로 남는다. 실패 상세(실행 출력 그대로):

```
 FAIL  test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > AC-BOTSTAB-009 ㉠ — 위조 네 형태는 상한 이하에서 전부 탈출되고 날것 시길이 0 이다
AssertionError: ⟪잘림: 500바이트 생략⟫: expected 1 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 1
```

  (메시지 앞의 `⟪잘림: 500바이트 생략⟫` 은 테스트가 붙인 fixture 라벨이다 — 네 형태 루프의 첫 형태에서 실패했고, 이 형태의 날것 시길 계수가 1 이 됐다.)
- 부수 관측: AC-005 (나)·E-11 도 함께 실패 — 좁은 방아쇠의 통과가 알림 통로의 시길 계약까지 깬다.

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
