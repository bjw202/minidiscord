# F1 수리 — RED 증거 (수리 전, 소스 변경 0인 상태에서 관측)

- 트리: `.claude/worktrees/t25` @ `4fdfb97` (HEAD), 브랜치 `WT-bot-stability`
- 수정 전 `channel/src/index.ts` shasum: `860d1dac19464d6bea0625d8ec435afc5fcb926818cec3c43fbee61840ce13f8` (HEAD == working tree, shasums.txt 참조)
- 명제: sync 감사 F1 (sync-audit.md §C-6) — 이력 통로 author 무절단 → 혼자 큰 author 원소가 2단계 버리기 루프에서 통째로 버려져 `cursor: null` · 영구 빈 이력 (INV-2 · AC-BOTSTAB-007 ㉢ 진행 보장 위반)
- 두 실행 모두 환경 스크럽(`unset MOAI_KANBAN …`) 후 `npx vitest run --root channel test/index-wiring.test.ts` 로 이 파일만 돌렸다 — 소스 변경은 이 두 RED 가 포착된 뒤에 이루어졌다.

## RED 1차 — E-12 엣지 (author 만 초과, 원소 하나)

- 파일: `red-e12-raw.txt` (전문), 종료 코드 **1**
- 기대 대로의 실패: **원소가 버려졌다** (`h.messages.length` = 0) — ㉠ 단언에서 경색. INV-2 침해의 직접 관측.

```
 RUN  v4.1.11 /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t25/channel

 ❯ test/index-wiring.test.ts (18 tests | 1 failed) 1325ms
     × an element whose author alone exceeds the limits still survives with a progressing cursor (E-12, AC-BOTSTAB-007 ㉢ family) 17ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/index-wiring.test.ts > channel wiring > an element whose author alone exceeds the limits still survives with a progressing cursor (E-12, AC-BOTSTAB-007 ㉢ family)
AssertionError: expected +0 to be 1 // Object.is equality

- Expected
+ Received

- 1
+ 0

 ❯ test/index-wiring.test.ts:553:31
    551|     const h = parsedHistory(res)
    552|     // ㉠ 원소는 버려지지 않고 실린다 — «원소 하나는 반드시 실린다»(진행 보장, AC-BOTSTAB-007 ㉢).
    553|     expect(h.messages.length).toBe(1)
       |                               ^
    554|     // ㉡ cursor 는 null 이 아니라 실린 원소의 id 다 — 이력 따라잡기가 멈추지 않는다.
    555|     expect(h.cursor).toBe(7)

 Test Files  1 failed (1)
      Tests  1 failed | 17 passed (18)
   Start at  10:10:32
   Duration  1.56s (transform 40ms, setup 0ms, import 159ms, tests 1.32s, environment 0ms)

EXIT=1
```

- 산술: 기존 17건 전부 통과(기준선 121 중 이 파일 몫) + 신설 E-12 만 실패 — RED 가 이 테스트 하나에서 나왔다.

## RED 2차 — E-12 + 홍수 회귀 (둘 다, 여전히 수정 전)

- 파일: `red-flood-raw.txt` (전문), 종료 코드 **1**
- 홍수형 실패: **전부 타 없어졌다** (`keptIds.length` = 0) — 감사의 축소 재현(kept=[id1 author 20KB, id2, id3] → kept.length=0, sync-audit §C-6)과 같은 모양. 큰 author 원소를 가장 낮은 id 에 두자 루프가 정상 원소 넷을 먼저 버리고 그 원소까지 버렸다.

```
 ❯ test/index-wiring.test.ts (19 tests | 2 failed) 1358ms
     × an element whose author alone exceeds the limits still survives with a progressing cursor (E-12, AC-BOTSTAB-007 ㉢ family) 17ms
     × a flood where the huge-author element is the oldest keeps every element and progresses the cursor (E-12 flood) 14ms

 FAIL  test/index-wiring.test.ts > channel wiring > a flood where the huge-author element is the oldest keeps every element and progresses the cursor (E-12 flood)
AssertionError: expected 0 to be greater than or equal to 1
 ❯ test/index-wiring.test.ts:585:28
    583|     const keptIds = h.messages.map(m => (m as { id: number }).id)
    584|     // ㉠ 전부 타서 0 개가 되지 않는다 — 수리 후에는 아무것도 버려질 필요가 없어 다섯 개가 모두 실린다.
    585|     expect(keptIds.length).toBeGreaterThanOrEqual(1)
       |                            ^

 Test Files  1 failed (1)
      Tests  2 failed | 17 passed (19)
   Start at  10:11:06
   Duration  1.57s (transform 39ms, setup 0ms, import 141ms, tests 1.36s, environment 0ms)

EXIT=1
```

- E-12 의 1차 RED 에서 ㉡(`cursor`)·㉢(상한)·㉣(표시) 단언은 첫 실패(㉠) 뒤로 실행되지 않았다 — vitest 는 테스트당 첫 경색에서 끝난다. 커서 진행(㉡)의 침해 관측은 홍수형이 대변한다: 전원 소진으로 cursor 는 null 이었다(RED 2차 ㉠ 의 전제).

## 설계 비고 — 디스패치 예시(2×OD-5) 대신 상수로 OD-4 돌파를 택한 이유

디스패치의 예시 크기(~2×MAX_NAME_BYTES ≈ 513바이트, 원소 하나)는 문서 총량이 OD-4(16000) 미만이라 **버리기 루프가 발동하지 않는다** — 그 크기의 RED 는 ㉠·㉡ 이 통과한 채 ㉢·㉣ 만 실패하고, 감사가 차단한 침해(원소 소진·cursor null)를 재지 못한다. 디스패치 자신이 RED 에 기록하라고 명시한 것은 «element dropped, cursor null» 이므로, 테스트는 상수만으로 author 를 `'가'.repeat(MAX_HISTORY_BYTES)`(3×OD-4)로 만들어 감사의 «2만 바이트 이름» 공격과 같은 도달 경로를 재현한다. 크기 판단은 전부 상수 산술이고 숫자 복제는 없다(§F).
