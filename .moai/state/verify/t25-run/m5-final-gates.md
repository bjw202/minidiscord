# t25 M5 — 최종 게이트 · 형제 회귀 두 수 · §J 자기 검증 (2026-09-01)

## E3 — 형제 회귀 두 수 (acceptance.md §형제 회귀)

### 빨개지는 것 (색으로 관측)

- **0건.** 클린 상태(변이 없음)의 전체 스위트가 전부 통과했다 — 아래 E4 의 실행. 변이 15회 실측 중 예측 밖으로 빨개진 것은 간헐 실패 1종(transport-auth nonces, 2회 출현·재실행 소멸 — `flake-observations.md`)뿐이고, 그것은 클린 상태에서는 통과하는 테스트라 «기존 기준이 빨개졌다» 가 아니라 부하 의존 간헐이다. 모든 변이 복원 뒤 스위트는 초록으로 돌아왔다.
- «상한 이하·시길 없음에서는 무변형»(REQ-012) 의 회귀 신호 — 없음.

### 무효화되는 것 (훑기 출력 대조)

- 훑기(`sibling-sweep.mjs`) 블록 총수: **33** (M5 재실행 확인 — `m5-sweep-rerun.txt`, exit=0, 33행. M4a «그때 출력» 33과 동일)
- 실행되는 상수 단언을 가진 블록: **33 / 33** — M4a 신규 착지 23블록 + 기존 보유 10블록 (m4a-evidence.md E2 표의 블록별 착지)
- AC-BOTSTAB-013 의 관측 판정: **PASS** — 기계 증인(아래 verbose 인용). ㉡ 이 훑기를 스스로 돌려 33블록 전부의 상수 적중을 매 실행 다시 잰다. 변이 N2 가 이 기계의 판별력을 실측으로 증명했다(변이 N2 참고).

## E4 — 최종 게이트

### 1) 클린 전체 스위트

```
$ npm test -w channel
 Test Files  7 passed (7)
      Tests  120 passed (120)
   Start at  17:10:19
   Duration  64.98s (transform 388ms, setup 0ms, import 1.27s, tests 70.18s, environment 0ms)
```
종료 코드: **0**. 원본 전문: `m5-final-clean-test.txt`.

### 2) 통과 수 산술 — 계획 기준선 95 대조

- 기준선 **95** (plan 단계 측정) → 최종 **120** — 델타 **+25**.
- +25 의 구성(관측 기록과 대조 가능): AC 케이스 17 (기준 13건 — AC-002 는 기존 기준의 제목 개정이라 신규 0, AC-004·005·006 은 가/나 분할, AC-009 는 ㉠·㉡㉢ 분할, AC-011 은 본문·㉣ 분할) + INV-1·2·3 테스트 1 + ㉡ 결합 기준 1 + 엣지 6 (E-1·E-2·E-3·E-9·E-10·E-11). 마일스톤별 실측: M1 +3(→98) · M2 +9(→107) · M3 +9(→116) · M4 +3(→119) · M4a +1(→120).
- **델타 +25 = 신설 기준의 테스트 케이스 수와 정확히 맞는다.**

### 3) 타입 검사

```
$ npm run typecheck -w channel
> tsc --noEmit
TYPECHECK_EXIT=0
```
원본 전문: `m5-final-typecheck.txt`.

## E5 — plan.md §J 자기 검증 항목 1~7

1. **`npm test -w channel` 초록 + 산술** — 위 E4 ①②. 120 passed, 기준선 95 대비 +25, 구성 대조 일치.
2. **손 변이 B → 빨강, 기준 이름, shasum 복원** — `mutation-B.md` (M1 실측 재사용). 실패: `does not open a new connection when stop() lands during the backoff wait` (AC-001) + AC-012 재관측. 계획 단계 «생존» 소멸 확인. shasum 복원: 1cb17188… ✓
3. **손 변이 A → 빨강, 기준 이름, shasum 복원** — `mutation-A.md` (M1 실측 재사용). 실패: `does not enter the retry path when close arrives after stop()` — 개정된 제목 그대로 관측. shasum 복원: 1cb17188… ✓
4. **`git diff --stat` 범위** — `channel/src/gateway-client.ts` **부재** (diff 0행 ✓). `.moai/specs/SPEC-CHANINJECT-001/` **변경 0건** ✓. 트래킹 diff 8파일 603+/17- (M1~M4a 누적 — M5 는 변이·복원만 하고 트리에 흔적 없음: 8개 파일 shasum 이 run 시작 값과 전부 동일 — `mutation-*.md` 각 파일의 복원 쌍).
5. **변이표 빈 관측 행 확인** — acceptance.md 변이표의 관측 열은 현재 전 행이 `(run 단계)` 이다. **이 파일은 SPEC 본문이라 run 이 채우지 못한다**(소유권: manager-spec / 본문 수정은 run 에게 금지). run 이 내는 관측 데이터는 전건 존재한다 — 행별 `mutation-<행>.md` 17개 + 통합표 `m5-mutation-observations.md` (17행 전부 예측·관측·일치 여부·shasum 쌍 기록, 빈 행 0). **acceptance.md 본문의 관측 열 충원은 리드가 소유권을 판정할 사항으로 회부한다.**
6. **훑기 재실행 + 전 블록 상수 적중** — 재실행: exit=0, **33블록** (`m5-sweep-rerun.txt`). 전 블록 적중의 기계 증인 = AC-013 테스트 PASS (클린 스위트 안, verbose 인용):
   ```
    ✓ test/truncate.test.ts > AC-BOTSTAB-013 — 형제 블록 상수 적중 (SPEC-BOTSTAB-001 M4a) > ㉡ 훑기 출력의 모든 형제 블록 소스에 상한·시길 상수 식별자가 최소 1회 등장한다 32ms
   ```
   스냅숏 표(21블록)와 어긋나는 부분 없음 — 라이브 출력이 그대로 33 (M4a 와 동일, 출력 이김 원칙상 문제 없음).
6b. **배치 프로브** — 재실행:
   ```
   $ node .moai/state/verify/t25-plan/self-reference-probe.mjs channel/test/truncate.test.ts
   sweep FILES (하드코딩된 대상): 6 개
   channel/test 실재 파일: 7 개
   훑기가 보지 않는 실재 파일: channel/test/truncate.test.ts
   PLACEMENT=OK	channel/test/truncate.test.ts 은 훑기 FILES 밖이다 — ㉡ 의 주어에 자기 파일이 들어올 경로가 없다
   ```
   종료 코드 0 — **PLACEMENT=OK** (UNDECIDED 아님 — G-06).
6c. **㉡ 결합 기준** — 클린 스위트 안에서 PASS (verbose 인용):
   ```
    ✓ test/truncate.test.ts > truncation primitives (SPEC-BOTSTAB-001 M2) > [HARD] ㉡ 결합 — 파생 정규식이 모듈이 수출한 모든 상수 식별자에 적중한다 (plan.md M2) 0ms
   ```
7. **저작 규율(수치·귀속·예측 수정 시 이웃 검토)** — **이 마일스톤은 문서의 수치·귀속·예측을 하나도 고치지 않았다** — 본문(SPEC 문서) 편집 0건이므로 고친 수치가 없고, 따라서 «함께 보아야 할 이웃» 도 없다. 관측 결과에서 나온 문서 정정 후보 2건(G 예측 오배정 · K 예측 공허)은 SPEC 본문 소유권 문제로 리드 회부하며, run 이 본문을 고쳐 규율을 적용할 자리는 없었다. 도구(`doc-stem-sweep.mjs`)는 t28 이 문서대로 물려받는다.

## E6 — Gaps (관측하지 않은 것)

1. **acceptance.md 변이표 본문의 관측 열** — 채우지 않았다(소유권 회부, §J 5 참고). run 소유 증거(17행 상세 + 통합표)는 전건 존재.
2. **§3.3 스냅숏 재도출** — 이전 마일스톤과 동일하게 SPEC 본문 편집 금지로 미수행 (m4a-evidence.md Gaps 1 의 리드 회부 유지).
3. **간헐 실패의 원인 규명** — 이름·재현 조건(전체 스위트 부하 하 확률적)만 확보. 원인 분석은 범위 밖.
4. **변이 A·B 의 M5 재적용** — 디스패치 지시대로 M1 기록을 재사용했다(재적용하지 않음 — 두 기록의 shasum 쌍·출력 원본은 M1 파일에 있다).

## 잔여 위험

- **G·K 두 행의 예측이 관측과 어긋난다**(G: AC-007→실제 AC-008 / K: 생존). 어긋남 자체는 측정값이고, acceptance.md 관측 열·변이표 예측 정정은 SPEC 본문 소유권 문제다. **K 생존은 «배선 순서에 대한 인프로세스 방어가 0» 이라는 현재 상태를 뜻한다** — 계획 §B 의 순서 결정은 코드 주석과 AC-010 의 구조 재현으로만 지켜진다. 후속 판정은 리드 몫.
- **[정정 2026-09-01, M5 후속]** 위 K 항의 «현재 상태» 는 더 이상 참이 아니다 — 배선 목격 기준 1건(`AC-BOTSTAB-010 — 배선에서도 중화 뒤 절단이 성립한다 (변이 K 목격 기준)`, channel-server.test.ts)을 추가하고 같은 변이를 재측정하니 AC-010 배선 목격이 포착했다(1 failed / 120 passed, RED 전문 `mutation-K.md`). 통합표 행 K 는 **일치 (강화 후)** 로 정정됐다. 잔여는 index.ts 이력 통로 자리의 무목격 — 리드 회부 유지. 아래 «120 passed» 귀속도 과거 실행 값이고, 정정 뒤 클린 트리는 **121 passed**(120 + 배선 목격 1건)다.
- 간헐 실패(transport-auth nonces, 누적 2회)는 클린 상태에서 재현되지 않았고 부하 의존으로 보이나, 원인 미규명 상태로 남는다.
- 120 passed 의 산술 귀속: 이 수는 M5 최종 클린 실행의 트리 값이다(HEAD 7c9958b + 미커밋 M1~M4a 작업).
