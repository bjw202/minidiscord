# t25 M5 — 변이표 전건 관측 통합표 (2026-09-01, run 단계 소유 증거)

**행수는 표를 직접 세어 17행이다** — A·B·C·D·E·F1·F2·G·H·I·J1·J2·K·L·M·M2·N2. (acceptance.md 변이표 §변이표, v0.5.0 이후 현재형 — 문서에 박힌 수를 인용하지 않고 셌다.)

- 실행 명령(전 행 공통): `npx vitest run --root channel --reporter=dot` (전체 채널 스위트, 변이 적용 상태 그대로)
- 한 번에 하나씩: 적용 → shasum → 실행 → 복원 → shasum 대조. 복원 불일치 0건.
- A·B 는 M1 기록을 재사용(mutation-A.md·mutation-B.md, 재적용하지 않았다). H·I 는 M4 관측이 있었으나(단일 파일 실행) **전체 스위트 관측으로 통일하기 위해 재적용해 쟀다**.
- 17행 전부의 원본 전문: `m5-raw/mutation-<행>.txt` (A·B 제외 — 그들의 원본은 M1 증거에 있다)
- 행별 상세: `mutation-<행>.md` (17개, A·B 포함)

## 통합표

| 행 | 자리 | 편집 | 예측 | 관측(실패한 기준 이름들) | 일치 여부 | shasum 복원 쌍 |
|----|------|------|------|--------------------------|-----------|----------------|
| A | `ws.on('close')` (gateway-client.ts) | `if (!stopped) retry()` → `retry()` | AC-002 실패 | `does not enter the retry path when close arrives after stop()` 1건 (1 failed / 97 passed) | **일치** | M1 기록: 1cb17188…→001eed05…→1cb17188… ✓ |
| B | `retry()` 안 `await sleep` 직후 (gateway-client.ts) | `if (stopped) return` 삭제 | AC-001 실패 | **AC-001 실패** + AC-012 (같은 결함의 두 번째 관측) — 2 failed / 96 passed (98) | **일치** — 계획 단계 «생존» 이 사라짐 (DoD 증거) | M1 기록: 1cb17188…→…→1cb17188… ✓ |
| C | `retry()` 첫 줄 (gateway-client.ts) | 무조건 `return` 삽입 | AC-003 실패 | **AC-003 실패** + 재접속 의존 형제 15건 — 계 16 failed / 104 passed | **일치** (부수 15건 — retry() 사망의 광역) | f74146f5… → 1cb17188… ✓ |
| D | `pushChatMessage` 본문 조각 (channel-server.ts) | 절단 호출 제거 | AC-004 실패 | **AC-004 (가) 실패** + AC-005 (나)·E-10 — 계 3 failed | **일치** (부수 — 절단 제거가 시길 탈출도 함께 제거) | a8a2176b… → 1cfd24b2… ✓ |
| E | 절단 원시함수 (truncate.ts) | 모든 값에 표시 덧붙임 (`+ formatMarker(0)`) | AC-005 실패 | **AC-005 (가)·(나) 실패** + 004 (가)·(나), 006 (가), E-9·E-11, 형제 등식 8건, AC-009 ㉠, E-2 — 계 17 failed / 103 passed | **일치** (부수 — «모든 값» 이 문자 그대로 전 조각에 적용) | 095fa387… → ebbfd01d… ✓ |
| F1 | 첨부 조각 (channel-server.ts) | 원소당 길이 절단 제거 (`frags = kept`) | AC-006 실패 | **AC-006 (나) 실패** 정확히 1건 | **일치** (갈래 정밀 — (가) 는 생존) | 469fb4c5… → 1cfd24b2… ✓ |
| F2 | 첨부 조각 (channel-server.ts) | 원소 수 상한 제거 (`slice(0, 0)`) | AC-006 실패 | **AC-006 (가) 실패** 정확히 1건 | **일치** (갈래 정밀 — (나) 는 생존) | 878f0128… → 1cfd24b2… ✓ |
| G | `fetchHistory` (index.ts) | 총 바이트 검사(while 루프) 제거 | AC-007 실패 | **AC-008 실패** 2실행 모두 — AC-007 은 통과 | **불일치** — 1단계 원소별 절단이 단일 원소 시나리오(AC-007)를 이미 지킴(plan §E 두 단계 + INV-2). 총바이트 검사의 실제 표면은 다중 원소 총합인 AC-008. **리드 회부** | ba4bea24… → a9d44572… ✓ |
| H | `fetchHistory` (index.ts) | 버리는 방향 반전 (부등호 `>`→`<`) | AC-008 실패 | **AC-008 실패** 정확히 1건 | **일치** | 5bfa227b… → a9d44572… ✓ |
| I | `fetchHistory` (index.ts) | cursor 를 응답 전체 최댓값으로 (반환 1줄 교체) | AC-008 실패 | **AC-008 실패** 정확히 1건 | **일치** | ad13bbd3… → a9d44572… ✓ |
| J1 | 절단 원시함수 (truncate.ts) | 시길 탈출 규칙 제거 (`escaped = text`) | AC-009 실패 | **AC-009 ㉠·㉡·㉢ 실패** + AC-005 (나)·E-11 — 계 4 failed | **일치** | 3cc989db… → ebbfd01d… ✓ |
| J2 | 절단 원시함수 (truncate.ts) | 방아쇠를 리터럴 `⟪잘림:` 로 좁힘 | AC-009 ㉠ 실패 (근사 형태 통과) | **AC-009 ㉠ 실패** + ㉡·㉢·AC-005 (나)·E-11 — 근사 형태의 탈출과, 정확한 형태조차 닫는 시길이 남는 두 결함이 관측됨 | **일치** | 608b87ae… → ebbfd01d… ✓ |
| K | 렌더 지점 (1차: channel-server.ts + index.ts 두 자리 완전 적용 / **정정 재측정: channel-server.ts 알림 통로 자리**) | 절단·중화 순서 맞바꿈 | AC-010 실패 | 1차 **실패 0건 — 변이 생존** (AC-010 테스트가 원시함수를 직접 불러 배선을 지나지 않음, 1차 원본 `m5-raw/mutation-K.txt`) → **배선 목격 기준 추가 후 재측정: `AC-BOTSTAB-010 — 배선에서도 중화 뒤 절단이 성립한다 (변이 K 목격 기준)` 실패 1건** (1 failed / 120 passed — 121 기준 스위트, RED 전문 mutation-K.md) | **일치 (강화 후)** — 이 행은 처음에 배선 목격 기준의 결핍을 드러냈고 이 run 이 그 결핍을 닫았다: 같은 Given 을 pushChatMessage 배선으로 흘려 «중화 전 이하 ∧ 중화 뒤 초과» fixture 로 순서를 관측 가능한 결과로 잰다. **잔여: index.ts 이력 통로 자리는 재측정 미적용·무목격 — 리드 회부 유지** | 재측정: e07a5b47… → 1cfd24b2… ✓ / 1차 두 자리 쌍: e07a5b47…/13ba66c3… → 1cfd24b2…/a9d44572… ✓ |
| L | 절단 원시함수 (truncate.ts) | 코드포인트 순회 → `Buffer.subarray` 바이트 슬라이스 | AC-011 실패 | **AC-011·AC-011 ㉣ 실패** + AC-009 ㉡·㉢ — 계 3 failed | **일치** | 45f3f614… → ebbfd01d… ✓ |
| M | `pushChatMessage` 이름 조각 (channel-server.ts) | 이름 절단 호출만 제거 | AC-004 ㉣ 실패 | **AC-004 (나) ㉣ 실패** + E-10·E-11 — 계 3 failed | **일치** (부수 — 이름 절단 제거가 이름 시길 탈출도 제거) | 169eb1a5… → 1cfd24b2… ✓ |
| M2 | AC-001 의 술어 (gateway-client.test.ts — 테스트 변이) | 술어를 «내부 `stopped` 값» 으로 교체 (㉠ 지점 + 대역 노출) | AC-012 ㉠ 실패 | **AC-012 실패** 2실행 모두 — `expected true to be false` (대역도 stopped=true) | **일치** — 술어가 약해져도 술어 자신은 모른다는 AC-012 존재 이유의 실측 | 3f1cd3b9… → bc8ae9fc… ✓ |
| N2 | 갱신한 형제 블록 1개 (channel-server.test.ts :414 «AC-005 (가)» — 테스트 변이) | 경계 단언 상수 → 숫자 리터럴 `4000` | AC-013 ㉡ 실패 (정규식이 적중할 때만 — G-09) | **AC-013 ㉡ 실패** — 변이 블록을 파일:줄:제목으로 정확히 지목. 사전 적중 1회 확인(G-09 조건 성립 — «잴 수 없었다» 아님). 부수 실패 0 — ㉡ 이 유일 포착자 | **일치** | 960d8efa… → b753d220… ✓ |

## 요약 판정

- **일치 16행 / 불일치 1행(G)** — **K 는 1차 불일치(변이 생존)였으나 배선 목격 기준 추가·재측정으로 일치로 정정됐다**(1차 원본 `m5-raw/mutation-K.txt` · 정정 실측 `mutation-K.md`). G 는 «못 잡은 결함» 이 아니라 **예측이 공허·오배정인 관측값**이다. G 의 acceptance.md 관측 열 처리와 K 의 index.ts 이력 통로 잔여는 **리드 회부** 사항이다(run 은 관측 데이터를 이 표와 행별 파일로 남겼다).
- 간헐 실패: 변이 G·M2 의 1회차 실행에서 `transport auth > both nonces are regenerated per socket and a replayed challenge is refused` 가 각 1회씩 출현, 재실행에서 소멸 — `flake-observations.md` (누적 2회).
- 복원 불일치: **0건** — 8개 파일 전부 실행 시작 시점 shasum 으로 복원 확인(아래 E2).
