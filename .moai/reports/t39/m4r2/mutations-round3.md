# SPEC-WSUPGRADE-001 3회차 M4 — 변이 실행 기록 (AC-001~014, `.moai/reports/t39/m4r2/`)

판별식은 1·2회차와 같다: 변이를 걸었는데 기준이 초록이면 그 기준은 아무것도 재지 않는 것이고,
그 사실 자체가 실패다(acceptance §1-3). 본 기록의 모든 값은 이 나무(WT-server-404)에서 실행한
명령의 실측 출력이며, 기록 시점 HEAD `843c22f`(AC-012 복원 커밋 — §12), baseline `620af7a` 다.
하네스는 3회차 수리 커밋 `b7f22d0`(기록 뒤 실패 재수립 + 본문 전체 수집) 상태에서 쟀다.

**트리거**: 1·2회차와 같다 — 하네스 접속 경로를 `/bot` → `/nope` 로 임시 바꿔 게이트웨이 ws 서버의
**경로 미스 400**(비(非)101)을 결정적으로 일으킨다. 트리거 응답은 400 이지 404 가 아니다 — 이
기준들이 재는 것은 «기록»이지 코드 404 가 아니므로 대용이다(1회차 `m4/mutations.md` 머리말과 같은 근거).
각 변이 뒤 복원은 `git checkout -- <path>` 후 `git diff --stat -- server/` 무출력으로 확인했고,
그 증명은 아래 표의 «복원» 칸이다. 계측기 중 이번에 새로 만든 것: `ac005-verdict.mjs`(AC-005 세 조항
판정기) · `ac013-check.mjs`(AC-013 두 조항 판정기) · `ac010-check.sh`(AC-010 세 조항 판정기).
1회차 도구(`m4/judge-record.mjs` · `m4/ac004-reachability.mjs` · `m4/ac002-ac004-cofail.mjs` ·
`m4/ac006-argv/compare.sh`)는 바꾸지 않고 그대로 다시 돌렸다.

## 변이 행렬 (AC · 자리 · 변이 · 전 · 후 · 복원)

| AC | 자리 (파일+앵커) | 변이 | 판정 전 (기준선) | 판정 후 | 복원 증명 |
|---|---|---|---|---|---|
| AC-001 본 | `gateway.test.ts` `wsConnect` — `ws.on('unexpected-response', …)` 블록 전체 | 리스너 삭제 + 트리거 | 트리거 기준선: 포획 1건·`judge-record --trigger` PASS·실패 76ms(`ac001-trigger-baseline.log`·`ac001-baseline-judgment.txt`·`ac001-baseline-capture.json`) | 포획 **0건**(captures 디렉터리 미생성) → **RED**. 부수: `Unexpected server response: 400` 즉시 실패(`ac001-main-mutated.log`) | `git checkout` → server/ diff 0 |
| AC-001 보조 | 같은 리스너 — persist 의 `headers` 필드 | `res.rawHeaders` 기록만 `[]` 로 + 트리거 | (위 기준선) | 포획 존재, 판정기 **FAIL — «AC-001 headers 전건 누락 또는 빈 배열»**(딱 그 필드 하나) → **RED**(`ac001-aux-mutated.log`·`ac001-aux-judgment.txt`·`ac001-aux-capture.json`) | 같음 |
| AC-002 (a) 귀속 | `wsConnect` — `attributionHits: hits` / `attributionHitCount: hits.length` | 귀속 대조 삭제, 개수-only 로 + 트리거 | (위 기준선) | **FAIL — «귀속 적중 0 …» + «attributionHitCount 불일치»** → **RED**(`ac002a-mutated.log`·`ac002a-judgment.txt`·`ac002a-capture.json`) | 같음 |
| AC-002 (b) 창1 | `build()` — `app.server.on('upgrade', …)` 등록 | 창1 리스너만 삭제(빈 배열은 남김) + 트리거 | (위 기준선) | **FAIL — «창1(upgrade) 관측 누락 …»** → **RED**(`ac002b-mutated.log`·`ac002b-judgment.txt`·`ac002b-capture.json`) | 같음 |
| AC-002 (c) 창 경계 | `wsConnect` — persist 의 `tOpen,` `tClose,` | 두 필드만 기록에서 삭제 + 트리거 | (위 기준선) | **FAIL — «AC-002 tOpen/tClose 누락»** → **RED**(`ac002c-mutated.log`·`ac002c-judgment.txt`·`ac002c-capture.json`) | 같음 |
| AC-002 (d) 보유 상태 | `wsConnect` — persist 의 `portPossession` | 항상 `null` 로 + 트리거 | (위 기준선) | **FAIL — «포트 보유 상태 null …»** → **RED**(`ac002d-mutated.log`·`ac002d-judgment.txt`·`ac002d-capture.json`) | 같음 |
| AC-004 공동 붕괴 | (모듈 원본 + 변이 모양 입력 — `m4/ac002-ac004-cofail.mjs`) | (a) 개수-only 기록 / (d) 보유 상태 없는 기록 | (1회차 실측과 같은 도구) | (a)→**H-2**(H-3 불도달) · (d)→**미분류**(H-1/H-2 붕괴) — `ac002-ac004-cofail-out.txt` | 트리 무변경(순수 실행) |
| AC-003 본 | `wsupgrade-judgment.ts` — `isFastify404Shape` | 상수 `true` 로 | 8 passed(`ac003-baseline.log`) | **2 failed**(다섯 입력 분별·모양 술어 둘 다) → **RED**(`ac003-main-mutated.log`) | `git checkout` → diff 0 |
| AC-003 보조 | 같은 파일 — `fingerprint` 최종 반환 | `미분류` → 만능 catch-all | (위) | **2 failed**(다섯째 입력이 이름을 받음) → **RED**(`ac003-aux-mutated.log`) | 같음 |
| AC-004 (1) | 같은 파일 — `secondVerdict` 의 `return holding ? 'H-2' : 'H-1'` | 보유 비교 삭제, 무조건 H-1 | 8 passed | **1 failed** — «적중 0 + 포트 보유 → H-2 (㉰)» → **RED**(`ac004-main-mutated.log`) | 같음 |
| AC-004 (2) 이빨 | (도구 — `m4/ac004-reachability.mjs`) | 귀속 없는 포획 기록·존재하지 않는 경로를 근거로 계상 | — | 둘 다 **기각** — «귀속 적중 항목이 없는 포획 기록 … 근거 아님» · «경로가 존재하지 않는다»(`ac004-teeth.txt`·`ac004-teeth-claims.json`) | 트리 무변경 |
| AC-004 (2) 실제 | (같은 도구) | — (변이 아님 — H-1·H-3 은 여전히 근거 없음을 «재지 않고 기록»한다) | — | **H-2 만 근거 있음**(probe-coexist.log·probe-upgrade-window.log) → 1/3 미충족 → **통과 아님(미관측)**(`ac004-real-verdict.txt`·`ac004-real-claims.json`) | 트리 무변경 |
| AC-005 본(삼킴) | `wsConnect` — 리스너 끝의 `res.socket.destroy()` + `ws.emit('error', …)` 두 줄 | **재수립 두 줄만 삭제**(기록은 산다) + 트리거 | 세 조항 **전부 PASS** — 포획 1건·시험 failed·«Unexpected server response: 400»(`ac005-baseline-verdict.txt`, 실패 메시지는 `ac001-trigger-baseline.log`) | 포획 **존재**(1)·시험 **failed**(2)지만 실패가 **«Test timed out in 5000ms»** 로 바뀜 → **(3) FAIL → RED**(`ac005-primary-mutated.log`·`ac005-primary-capture.json`·`ac005-primary-verdict.txt`) | `git checkout` → server/ diff 0 |
| AC-005 보조(은폐) | `wsConnect` — 리스너 블록 전체 | **리스너 통째로 삭제** + 트리거 | (위 기준선) | 실패는 «Unexpected server response: 400» 로 즉시 나지만 포획 **0건** → **(1) FAIL → RED**(`ac005-aux-mutated.log`·`ac005-aux-verdict.txt`) | 같음 |
| AC-005 두 변이의 방향 | — | — | — | **본 변이는 (3)에서, 보조 변이는 (1)에서 어긋났다 — 서로 다른 조항.** «기록을 지키려다 실패를 삼키는» 쪽과 «실패를 지키려다 기록을 잃는» 쪽을 각각 잡았고, 1회차가 샌 바로 그 자리(삼킴)가 이제 잡힌다 | — |
| AC-006 녹색 | `m4/ac006-argv/compare.sh` + 각 팔 1회 실실행(`bash -x` xtrace) | — (기준선) | — | 대칭 차집합 **1 토큰**(`--no-file-parallelism`) → PASS(`ac006-argv/verdict-green.txt`) | 트리 무변경 |
| AC-006 본 | 직렬 팔 argv | `--reporter=dot` 을 더해 **실제 실행** | (위) | 차집합 **2** → **RED**(`ac006-argv/verdict-mutated-red.txt`·`mutated-serial-xtrace.log`·`mutated-serial-run.log`) | 트리 무변경 |
| AC-006 보조(출처) | 같은 도구 | 손작성 배열 2종(표지 없음 / 표지만 흉내) | — | **PROVENANCE-FAIL ×2** — «xtrace 표지가 없다» · «실행 문맥(+ cd …/server)이 없다»(`ac006-argv/verdict-aux-reject-plain.txt`·`verdict-aux-reject-mimic.txt`·`hand-typed-*.txt`) | 트리 무변경 |
| AC-007 본 | `gateway.test.ts` `wsConnect` 직후 | `spawn('node', …)` 부하 한 줄(미커밋) | 깨끗한 트리: 목록 297·**적중 0**(`ac007-clean-verdict.txt`) | **적중 1**(해당 줄 — `ac007-hits-union.txt`) → **RED**(`ac007-main-mutated-verdict.txt`) | `git checkout` → diff 0, 재훑기 **0**(`ac007-restored-verdict.txt`) |
| AC-007 보조 넷 | (1회차 도구의 목록 생성 축) | — (재실행하지 않고 1회차 기록 인용) | 1회차: `--diff-filter=A`·diff-only·디렉터리 접힘·허용 목록 넷 모두 «잘못된 초록» 실측 — `m4/ac007-aux-*.txt` | 부류가 같은 축(목록 생성 논리)이고 트리 상태와 무관하므로 실질 불변 — 1회차 기록을 그대로 근거로 센다 | — |
| AC-008 본 | `plan.md` 끝 | 반증된 부류 명칭 원문을 **토큰 없이** 한 줄 추가(원문은 `ac008-hits-token.txt` 에만 — 이 기록에 옮기면 이 줄 자신이 적중이 되기 때문) | 깨끗한 트리: 목록 298·토큰 없는 적중 **0**(`ac008-clean-verdict.txt`) | **적중 1**(정확히 plan.md) → **RED**(`ac008-main-mutated-verdict.txt`) | `git checkout` → specs/ diff 0, 재훑기 **0**(`ac008-restored-verdict.txt`) |
| AC-008 보조 둘 | (1회차 도구 모드 word·no-plan) | — (재실행 없이 1회차 인용) | 1회차: 낱말 술어·plan.md 제외 모두 «잘못된 초록» 실측 — `m4/ac008-aux-*.txt` | 같은 축의 실질 불변 — 1회차 기록을 근거로 센다 | — |
| AC-009 본 | `wsupgrade-judgment.ts` — `classifyComparison` | `(0,0)` → `PASS` 재사상 | 8 passed | **1 failed** — «(0,0) 은 PASS 가 아니라 미관측이다» → **RED**(`ac009-main-mutated.log`) | `git checkout` → diff 0 |
| AC-009 보조 | 같은 함수 최종 반환 | `(0,1)` 뒤집힘을 `미관측` 으로 접기 | (위) | **1 failed** → **RED**(`ac009-aux-mutated.log`) | 같음 |
| AC-010 (1) | `spec.md` §4 표 — H-3 행 | 행 삭제 | 세 조항 **전부 PASS** — 집합 {H-1,H-2,H-3}·빈칸 0·awk 0(`ac010-clean-value.txt`) | 집합 **{H-1, H-2}** → **(1) RED**(`ac010-i-branchset.txt`) | `git checkout` → specs/ diff 0 |
| AC-010 (2) | 같은 표 — H-1 행의 관측 칸 | 칸을 빈칸으로 | (위) | 빈칸 **1** → **(2) RED**(`ac010-ii-cells.txt`) | 같음 |
| AC-010 (3) | `spec.md` §4 본문(표 밖 문단) | 단정 문장 한 줄 추가 | (위) | awk **0 → 1** → **(3) RED**(`ac010-iii-awk.txt`) | 같음 |
| AC-011 기준선 | `m4r2/ac011-aggregate.sh` → `m3r2/summary.txt` | — (3회차 실제 요약) | — | 병렬 20/20·N+M=20, 직렬 20/20·N+M=20 → **PASS**(`ac011-clean-verdict.txt`) | 읽기 전용 |
| AC-011 본 | (직렬 팔 12회) | 1회차에 **실제로 돌린** 12회 로그(`m4/serial-12x-{1..12}.log`, 무결 확인: 12로그·집계기 커밋 `90632e5` 뒤 무변경)로 20P+12S 요약 재조립 → 집계기 재실행 | — | 직렬 trials=**12**·N+M=**12** → **RED**(`ac011-mutated-verdict.txt`·`ac011-12run-summary.txt`) | 읽기 전용 |
| AC-011 보조 | 요약 사본 | P21 행 추가(부풀리기) | — | 병렬 trials=**21**·N+M=**21** → **RED**(`ac011-aux-inflated-verdict.txt`·`ac011-inflated-summary.txt`) | 사본만(원본 무변경) |
| AC-012 | `server/src/gateway.ts` 첫 머리 | 변이 주석 한 줄을 **커밋**(`d9150aa`) | 기준 명령 무출력(0줄) | `git diff --name-only 620af7a..HEAD -- server/src/ channel/src/` → **1줄** → **RED**(`ac012-red-output.txt`·`ac012-commit-output.txt`) | `git revert` → `843c22f`, 같은 명령 **0줄**(`ac012-restored-output.txt`) |
| AC-013 실측 | `m4r2/ac013-check.mjs` → `m6/summary.txt` | — (3회차 실제 복제 기록) | — | **(1) PASS(시행 20)** / **(2) 전제 불성실 — 포획 0건** → «PASS(조항 (1)만) — 공허 통과 주의» 출력(`ac013-real-verdict.txt`). 리드 지시대로 두 조항을 따로 적는다 | 읽기 전용 |
| AC-013 본 | 요약 사본 — `ac013-primary-earlystop-summary.txt` | 다섯째 시행에 포획 합성 + 그 뒤 시행 행 삭제(조기 정지 흉내; 변이는 판정기를 잰다 — 데이터가 아니다) | (위 실측) | 시행 수 **5**(1) **FAIL** · 마지막 포획 5 == 마지막 시행 5 < 20 (2) **FAIL** → **양쪽 RED**(`ac013-primary-verdict.txt`) | 사본만 |
| AC-013 보조 | 요약 사본 — `ac013-aux-capture-last-summary.txt` | 합성 포획을 **마지막(20) 줄**로 이동 | — | 시행 20·마지막 포획 20 → **PASS** — 이 기준은 정지 규칙을 재지 포획 위치를 재지 않는다(`ac013-aux-verdict.txt`) | 사본만 |
| AC-014 (a) 기준선 | 대상 시험 단독 실행(트리거 없음) | — | — | 시험 **1 passed** · captures 디렉터리 **부재** → **PASS**(`ac014-clean-run.log` + ls 부재) | 트리 무변경 |
| AC-014 (a) 본 | `wsConnect` 머리 | 포획 디렉터리 **미리 만들기** | (위) | 시험은 통과해도 디렉터리가 **존재**(빈 디렉터리도 실패) → **RED**(`ac014-mutated-run.log` + test -d 실측) | `git checkout` + 빈 디렉터리 삭제 → diff 0 |
| AC-014 (b) | 트리거 실행(비(非)101 **있음**) | — (변이 아님 — 전제 불성실 갈래의 확인) | — | 포획물이 생기는 실행에서는 이 기준이 **적용되지 않는다**(전제 불성립) — 포획을 벌하지 않는다. 실측: 트리거 기준선 실행(`ac001-trigger-baseline.log`)에서 captures 디렉터리 생성 확인 | — |

## 최종 상태 (깨끗한 트리 값, 기록 작성 직전 실측)

- AC-007: 목록 **333**·적중 **0**(`ac007-final-verdict.txt` — 본 기록 파일까지 목록에 들어간 뒤의 값).
- AC-008: 목록 **329**·토큰 없는 적중 **0**(`ac008-final-verdict.txt` — 같은 시점 값).
- AC-010: 세 조항 PASS·awk **0**(`ac010-final-value.txt`).
- 복원 후 대상 시험 단독 재실행 **1 passed**·captures 부재(`post-restore-sanity.log`).
- `git status --short -- server/` 무출력 · `git diff --name-only 620af7a..HEAD -- server/src/ channel/src/` 무출력.

## CRITERION-FAILURE

**0건.** 14 기준의 변이가 전부 자기 기준을 빨갛게 만들었다 — 1회차의 AC-005 기준 실패는
v0.6.0 의 재설계(반대 방향 변이 둘)와 `b7f22d0` 의 하네스 수리(재수립)로 닫혔다.

## AC-013 공허 통과 (리드 지시문의 기록)

**AC-013 의 시행 수 조항은 이번 실행에서 통과했지만, 정지 규칙 조항의 전제(포획 ≥ 1건)가
불성실해서 그 조항의 중심 물음 — «첫 포획 이후에도 시행이 이어졌는가» — 는 실행으로
행해지지 않았다.** 즉 AC-013 은 이번 회차에서 **공허하게(hollow) 통과**했다. 그 이빨은
실행이 아니라 `m4r2/` 의 두 변이(본: 양쪽 조항 RED · 보조: 마지막 줄 포획 PASS)로만
확인된다 — 위 표의 AC-013 세 행이 그 실측이다.
