# t25 M5 변이 실측 — N2 (2026-09-01)

## 변이 내용

- 행: **N2** — 자리 «갱신한 형제 블록 하나», 최소 편집 «경계 단언의 상수를 숫자 리터럴로 교체» (acceptance.md 변이표) — **테스트 파일 변이**, 관측 즉시 복원
- 대상 블록: `channel/test/channel-server.test.ts` `it('AC-BOTSTAB-005 (가) — 상한 이하 본문은 글자 그대로, 표시 없고 meta 무변형')` (414행 시작) — M4a 가 전제 경계 단언을 새로 착지시킨 블록(m4a-evidence.md «:375» 행, 편집 후 줄 이동으로 :414)
- **사전 확인(G-09 조건)**: 변이 전 블록 소스에 ㉡ 정규식 적중 **1회**(`MAX_BODY_BYTES`) — 적중 0 이 아니므로 변이가 잴 수 있는 상태다. 측정은 AC-013 테스트와 같은 경계 규칙(블록 시작 줄 → 다음 `it(` 직전)으로 node 스크립트를 돌려 관측했다.

```
block lines: 414- 431
hits: ["MAX_BODY_BYTES"]
count: 1
```

- 적용 편집: 블록 안의 경계 단언 한 줄
  `expect(Buffer.byteLength(body, 'utf8')).toBeLessThanOrEqual(MAX_BODY_BYTES)` →
  `expect(Buffer.byteLength(body, 'utf8')).toBeLessThanOrEqual(4000)` (값은 같고 식별자만 사라진다 — ㉡ 이 «숫자 리터럴 적중은 인정하지 않는다» 의 판별력을 재는 자리)
- 적용 전 shasum: `b753d2206544230ba7509526194e4babb3101dc9  channel/test/channel-server.test.ts`
- 적용 후 shasum: `960d8efa1b2852715f923f9f18dcfa6cc4a7dba1  channel/test/channel-server.test.ts`
- 복원 후 shasum: `b753d2206544230ba7509526194e4babb3101dc9  channel/test/channel-server.test.ts` — **적용 전 값과 일치 (복원 확인 — 관측 즉시)**

## 명령

```
npx vitest run --root channel --reporter=dot
```

종료 코드: **exit=1 (RED)** — 변이 적용 상태 그대로의 전체 채널 스위트 실행이다. 원본 전문: `m5-raw/mutation-N2.txt`.

## 예측과 관측

- 예측(변이표): **AC-013 ㉡ 실패 — 단, ㉡ 의 정규식이 run 이 실제로 정한 상수 이름에 적중할 때만이다.** (적중했으므로 «잴 수 없었다» 가 아니라 «잡았다» 자리다.)
- 관측: **AC-013 ㉡ 실패 확인 — 예측과 일치.** AC-013 테스트가 변이한 블록을 파일·줄·제목으로 정확히 지목했다. 실패 상세(실행 출력 그대로):

```
 FAIL  test/truncate.test.ts > AC-BOTSTAB-013 — 형제 블록 상수 적중 (SPEC-BOTSTAB-001 M4a) > ㉡ 훑기 출력의 모든 형제 블록 소스에 상한·시길 상수 식별자가 최소 1회 등장한다
AssertionError: 블록 channel/test/channel-server.test.ts:414 «AC-BOTSTAB-005 (가) — 상한 이하 본문은 글자 그대로, 표시 없고 meta 무변형» 에 상한·시길 상수 식별자 적중이 없다: expected false to be true // Object.is equality
```

- 부수 실패 없음 — 식별자 → 리터럴 교체는 값이 같아 다른 기준은 전부 통과했다. ㉡ 이 이 변이를 잡는 **유일한** 기준이라는 것(유일 인프로세스 술어의 실측)이 함께 확인됐다.

## 스위트 요약 (관측)

```
 Test Files  1 failed | 6 passed (7)
      Tests  1 failed | 119 passed (120)
```
