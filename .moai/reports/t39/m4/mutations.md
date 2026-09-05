# SPEC-WSUPGRADE-001 M4 — 변이 실행 기록 (AC-001~012)

판별식: 변이를 걸었는데 기준이 초록이면 그 기준은 아무것도 재지 않는 것이고, 그 사실 자체가 실패다(acceptance §1-3).
본 기록의 모든 값은 이 나무(HEAD 8f421f3 시점, baseline 620af7a)에서 실행한 명령의 실측 출력이다.
트리거: AC-001/002/005 계열은 404 가 수요에 재현되지 않으므로(Mp=0), 하네스 접속 경로를 `/bot` → `/nope` 로 임시 바꾸어
**ws 의 경로 미스 400**(비(非)101, `unexpected-response` 발화 — spec.md F1, probe-upgrade-window.log 배열1)을 결정적으로 일으켰다.
트리거 응답은 400 이지 404 가 아니다 — 이 기준들이 재는 것은 «기록이 남는가»이지 코드 404 가 아니므로 대용한다.
각 변이 뒤의 복원 확인은 `git diff --stat` 이 progress.md(기존 6줄)만 가리키는 것으로 뱄고, 최종 상태는 본 파일 §14 이다.

## 1. AC-001 — 비(非)101 응답의 원문 포획

| 항목 | 값 |
|---|---|
| 자리 | `server/test/gateway.test.ts` 의 `wsConnect` — `ws.on('unexpected-response', …)` 리스너 블록 전체 |
| 본 변이 | 리스너 블록 삭제(트리거 활성) |
| 판정 전 | 트리거 실행 → 포획 1건 생성(`m4/ac001-baseline-capture.json`), `judge-record.mjs --trigger` **PASS**(상태 코드·상태 줄·헤더 전건·본문 전부 기록). 단 본문은 ws 400 의 성질상 빈 문자열로 기록(원문이 빈 것이다) — «본문 비어 있지 않음» 조항은 400 트리거로는 재지 못한다(404 본문은 비어 있지 않음 — 잔여로 기록) |
| 판정 후 | 포획이 **전혀 생기지 않음**(`captures/` 디렉터리 미생성) → 기준 **RED**. 부수 관측: 실패 모드가 `Unexpected server response: 400`(던짐 경로)로 즉시 실패 |
| 보조 변이 | 리스너 유지, `res.rawHeaders` 기록만 빈 배열로 → 포획 존재, `RECORD-JUDGE: FAIL — AC-001 headers 전건 누락 또는 빈 배열`(헤더 필드 하나만 정확히) → 기준 **RED** |
| 복원 | `git checkout -- server/test/gateway.test.ts` 후 diff 없음 |
| 증거 | `m4/ac001-baseline-trigger.log` · `ac001-baseline-judgment.txt` · `ac001-main-mutated.log` · `ac001-aux-mutated.log` · `ac001-aux-judgment.txt` · `ac001-baseline-capture.json` · `ac001-aux-capture.json` |

## 2. AC-002 — 소켓 양끝 · 귀속된 수신 관측 · 포트 보유 상태 (네 아변형 전부 실측)

판정기: `m4/judge-record.mjs <capture> --trigger`(명시된 0·없음과 누락을 가르고, 트리거 모드에서는 «그 요청이 창1 에 잡혀 귀속 적중 ≥1 이어야 한다»는 단서를 건다 — probe-upgrade-window.log 배열1 실측과 같은 값).

| 아변형 | 자리 | 변이 | 판정 (기록 판정기) |
|---|---|---|---|
| (a) 귀속 | `wsConnect` — `attributeHits(…)` 호출 | 귀속 대조 삭제, `attributionHitCount` 를 창 항목 수로(앞 판본의 개수 모양) | **FAIL** — «귀속 적중 0 — 트리거된 자기 앱 요청이 귀속 대조에서 사라졌다» + «attributionHitCount 가 항목 배열과 불일치» |
| (b) 창1 | `build()` — `app.server.on('upgrade', …)` 블록 | 창1 만 삭제, 창2 유지 | **FAIL** — «창1(upgrade) 관측 누락 — 포획된 그 요청이 창1 에 잡히지 않았다(명시된 0 이 아니라 못 잡은 0)» |
| (c) 창 경계 | `wsConnect` — persist 객체의 `tOpen, tClose` 두 필드 | 기록에서만 삭제 | **FAIL** — «AC-002 tOpen/tClose 누락» |
| (d) 보유 상태 | `wsConnect` — persist 의 `portPossession` | 항상 `null` 로 | **FAIL** — «포트 보유 상태 null — 트리거된 자기 앱 포획인데 보유 상태가 기록되지 않았다» |

**AC-004 동반 붕괴(acceptance 가 요구한 공동 실패)** — `m4/ac002-ac004-cofail.mjs` 실행(원본 판정 모듈 + 변이 모양 입력):
(a) 개수-only 기록(창2 관측이 «3건» 있어도 항목이 없으면) → `secondVerdict` **H-2**(H-3 불도달 — 귀속 없이 «이 요청»에 설 수 없다),
(d) 보유 상태 없는 기록 → **미분류**(H-1·H-2 가 같은 출력으로 붕괴). 출력: `m4/ac002-ac004-cofail-out.txt`.
복원: 각 아변형 후 `git checkout` → diff 없음. 증거: `m4/ac002{a,b,c,d}-mutated.log` · `ac002{a,b,c,d}-judgment.txt` · `ac002{a,b,c,d}-capture.json`.

## 3. AC-003 — 지문표의 부류 분별

| 항목 | 값 |
|---|---|
| 자리 | `server/test/wsupgrade-judgment.ts` — `isFastify404Shape` |
| 본 변이 | Fastify 술어를 상수 `true` 로 |
| 판정 전 | `npx vitest run test/wsupgrade-judgment.test.ts` → 8 passed(`ac003-baseline.log`) |
| 판정 후 | **2 failed** — «다섯 합성 입력…» · «content-type 이 json 이어도…» (둘째 입력 이후가 Fastify 로 뭉개짐) → 기준 **RED** |
| 보조 변이 | 미분류 갈래를 만능 catch-all 로 → **2 failed**(다섯째 입력이 이름을 받음 + 이름 충돌) → 기준 **RED** |
| 복원 | `git checkout` ×2 → diff 없음 |
| 증거 | `m4/ac003-{baseline,main-mutated,aux-mutated}.log` |

## 4. AC-004 — 2차 판정의 갈래 분리와 정의역 도달성

**본 변이 (1)**: `secondVerdict` 의 포트 보유 비교 삭제(`holding ? 'H-2' : 'H-1'` → 무조건 H-1) → 시험 «적중 0 + 포트 보유 → H-2 (㉰)» **1 failed** → 기준 **RED**(`ac004-main-mutated.log`).

**보조 변이 (2)의 이빨 — `m4/ac004-reachability.mjs`(도달성 근거 검증기)로 실측**:

| 변이 | 넣은 주장 | 검증기 출력 |
|---|---|---|
| 귀속을 잰다 | H-3 근거 = 귀속 적중 항목이 없는(창 개수만 오른) 포획 기록 | **기각** — «귀속 적중 항목이 없는 포획 기록(창 단위 개수만 있는 모양) — 혼입 위험, 근거 아님» (plan-audit-2 N1 의 자기 인증 차단) |
| 경로를 잰다 | H-1 근거 = 존재하지 않는 탐침 출력 경로 | **기각** — «경로가 존재하지 않는다» |

실제 근거 판정(`m4/ac004-claims.json` → `ac004-real-verdict.txt`): **H-2 만 탐침 출력 근거 있음**(probe-coexist.log · probe-upgrade-window.log), H-1·H-3 은 도달성 근거 없음 → (2) **1/3 미충족 → 통과 아님(미관측)** — acceptance 「포획 0건일 때의 처분」 대로.

## 5. AC-005 — 관측이 실패를 삼키지 않는다 → **기준 실패(CRITERION-FAILURE)**

| 항목 | 값 |
|---|---|
| 자리 | `wsConnect` 리스너 본문 끝 |
| 변이 | 기록 후 `return true` 추가(트리거 활성) |
| 판정 전(기준선) | 트리거 + 현행 리스너 → 시험 **failed — «Test timed out in 5000ms»**(`ac001-baseline-trigger.log`) |
| 판정 후 | 시험 **여전히 failed — 같은 시간 초과**(`ac005-mutated.log`) → 기준이 변이를 붉게 만들지 못했다 → **CRITERION-FAILURE** |
| 뿌리(실행으로 확인) | `node_modules/ws/lib/websocket.js:929` — `} else if (!websocket.emit('unexpected-response', req, res)) { abortHandshake(…) }`. EventEmitter.emit 은 **리스너의 반환값과 무관하게, 리스너가 존재하면 참**을 돌린다. 따라서 리스너를 다는 순간 던짐 경로(abortHandshake)는 이미 건너뛰어진다 — «리스너가 값을 돌려주지 않게 두어 emit 이 거짓»이라는 plan.md §C 의 기제는 성립하지 않는다. 실패는 던짐이 아니라 **5초 시험 시간 초과로만** 살아남고, 리스너가 없으면 `Unexpected server response: 400` 로 즉시 실패한다(두 모드 모두 본 기록에 실측). |
| 복원 | `git checkout` → diff 없음, 복원 후 대상 시험 단독 재실행 **1 passed**(`post-restore-sanity.log`) |

## 6. AC-006 — 두 팔이 스위치 하나만 다르다

| 항목 | 값 |
|---|---|
| 계측 | `m4/ac006-argv/compare.sh` — argv 를 **실행 주체 기록(`bash -x` xtrace)** 에서만 뽑는다. 출처 검증 3층: `+ ` 표지 · `+ cd …/server` 실행 문맥 · 동반 run 로그의 vitest 배너 |
| 녹색 | 병렬 `npx vitest run` / 직렬 `npx vitest run --no-file-parallelism` — 대칭 차집합 **1 토큰**(`--no-file-parallelism`) → PASS(`verdict-green.txt` · `parallel-argv.txt` · `serial-argv.txt` · `symmetric-difference.txt`) |
| 본 변이 | 직렬 팔에 `--reporter=dot` 을 더해 **실제 실행** → 차집합 **2**(`--no-file-parallelism --reporter=dot`) → **RED**(`verdict-mutated-red.txt` · `mutated-serial-xtrace.log`) |
| 보조 변이(출처) | (가) 손으로 쓴 배열(표지 없음) → `PROVENANCE-FAIL: xtrace 표지가 없다`; (나) 표지만 흉내 낸 손작성 파일 → `PROVENANCE-FAIL: 실행 문맥(+ cd …/server)이 없다` — 둘 다 거절(exit 2, `verdict-aux-reject.txt`) → 기준 (1) **RED** |
| 잔여 | 세 층을 전부 흉내 낸 완벽 위조는 형식 검사로 가르지 못한다 — 기록의 생성 과정까지는 기계가 볼 수 없다 |

## 7. AC-007 — 배경 부하 스폰이 없다

훑기 도구: `m4/ac007-sweep.sh`(모드: union 본기준 · diffA · diffony · no-ufall · allow-ts). 어간은 도구 안에서 조립한다("sp""awn" 따위) — 도구가 술어 원문을 한 줄에 담아 자기에게 적중하는 자기측정 방지(면제가 아니다).

| 실행 | 목록 | 적중 | 판정 |
|---|---|---|---|
| 깨끗한 트리 (E2) | union 95개 → 최종 144개(기록물이 늘며 목록이 명령에서 다시 자람) | **0** | PASS |
| 본 변이 — 하네스 파일(`gateway.test.ts:178`)에 부하 한 줄 | union 136 | **1**(해당 줄) | **RED** |
| 보조(범위) — `--diff-filter=A` 만 | 12개, gateway.test.ts **목록에 0회** | 0 | 초록(잘못된 통과 — 범위 축소가 집행을 무력화) |
| 보조(합집합) — git diff 항만 + **미추적 새 디렉터리** 부하 | 13 | 0 | 초록(잘못된 통과) |
| 동일 트리 union | 140 | **1** | **RED**(합집합이 부하를 진다) |
| 보조(합집합) — `--untracked-files=all` 생략(디렉터리 접힘) | 19, newdir 경로 **목록에 0회** | 0 | 초록(잘못된 통과) |
| 보조(필터 방향) — 허용 목록(.ts 만) | 3, load.mjs **목록에 0회** | 0 | 초록(잘못된 통과 — 허용 목록이 감시 공간을 삼킴) |
| 스크래치 삭제 후 union (E2 재실행) | 144 | **0** | PASS |

보조 변이 넷의 «초록»은 각 조항이 정한 **통과 조건 그 자체**(초록으로 남으면 그 축소가 집행을 무력화함이 보인 것)다. 스크래치 부하 파일은 `m4/tmp/` 아래 만들고 판정 후 `rm -rf` 로 삭제했다.

## 8. AC-008 — 반증된 판독 원문 인용의 표지

훑기 도구: `m4/ac008-sweep.sh`(모드: token 본기준 · word · no-plan). 어간은 도구 안에서 조립(자기측정 방지). 도구 자신의 출력 파일(ac008-hits-*, ac008-list)은 목록에서 이름으로 뺀다 — 측정 출력은 반증된 판독을 전제로 쓴 문서가 아니라 기록이기 때문이다(그러나 그 출력에 변이 줄 원문이 남는다는 사실은 §12 에 정직하게 남는다).

| 실행 | 판정 |
|---|---|
| 깨끗한 트리 (E3) | 목록 122 → 최종 126, 토큰 없는 적중 **0** → PASS |
| 본 변이 — plan.md:199 에 변이 줄(어간 원문, 토큰 없음) 추가 | 토큰 없는 적중 **1**(정확히 plan.md:199) → **RED** |
| 보조(토큰의 하중) — 같은 줄에 낱말을 곁들인 뒤: token 술어 | 적중 **1** → RED (토큰이 없으면 여전히 잡는다) |
| 같은 줄: word 술어(«반증» 있으면 통과) | 적중 **0** → 초록(**잘못된 통과** — 낱말 판정은 샌다, 토큰이 실제로 하중을 진다) |
| 보조(훑기 자신) — 목록에서 plan.md 제외 | 적중 **0** → 초록(**잘못된 통과** — 목록이 명령에서 나오지 않으면 변이가 보이지 않는다) |
| 복원 후 token | **0** → PASS, plan.md diff 없음 |

변이 줄의 원문은 이 기록에 옮기지 않는다 — 옮기면 이 줄 자신이 토큰 없는 적중이 된다(acceptance AC-008 변이 조항과 같은 근거). 원문은 `ac008-hits-token.txt` 에 기록돼 있다(도구 출력 제외 규칙 위 문단 참조).

## 9. AC-009 — 포획 0건은 미관측이다

| 변이 | 자리 | 판정 |
|---|---|---|
| 본 — (0,0) 을 PASS 로 | `classifyComparison` | 시험 «네 조합…(0,0) 은 PASS 가 아니라 미관측이다» **1 failed** → **RED** |
| 보조 — (0,1) 을 미관측으로 접음 | 같은 함수 마지막 반환 | 같은 시험 **1 failed**((0,1)≠뒤집힘) → **RED** |

복원 ×2 → diff 없음. 증거: `m4/ac009-{main,aux}-mutated.log`.

## 10. AC-010 — 경쟁 설명이 열려 있고 갈라진다 (세 조항 전부)

깨끗한 트리 값 (E4): 갈래 집합 {H-1,H-2,H-3} · 관측 빈칸 0 · **awk 값 0**(`ac010-clean-value.txt` — 판정 명령 그대로).

| 변이 | 자리 | 조항 | 판정 |
|---|---|---|---|
| (i) H-3 행 삭제 | spec.md §4 표 | (1) 집합 포함 | 갈래 집합 **{H-1, H-2}**(H-3 누락, `ac010-i-branchset.txt`) → **RED** |
| (ii) H-3 행의 관측 칸을 빈칸으로 | 같은 표 | (2) 빈칸 0 | 빈 관측 칸 **1**(`ac010-ii-cells.txt`) → **RED** |
| (iii) §4 본문 줄로 단정 문장 한 줄 추가 | spec.md §4 본문 | (3) 단정 어간 0 | awk 값 **0 → 1**(`ac010-iii-awk.txt`) → **RED** |

복원 ×3 → spec.md diff 없음.

## 11. AC-011 — 두 팔이 각각 20회, N+M=20

집계 도구: `m4/ac011-aggregate.sh`(시행 수·N·M·판정 없는 행을 명령으로 센다).

| 실행 | 값 | 판정 |
|---|---|---|
| m3 요약 (E6) | 병렬 20/20·N+M=20, 직렬 20/20·N+M=20 | **PASS** |
| 본 변이 — 직렬 팔을 **실제로 12회** 실행(`m4/serial-12x-{1..12}.log`, 요약 `serial-12x-summary.txt`)하고 병렬 20 + 직렬 12 요약으로 집계 | 직렬 trials=**12**·N+M=**12** | **RED** — «직렬 팔 분모 어긋남» |
| 보조 — 행 하나 부풀리기(P21 추가) | 병렬 trials=**21**·N+M=**21** | **RED** |
| 보조 — 시행 20 유지, 한 행의 판정을 PASS/FAIL 밖으로 | 직렬 N+M=**19**(판정 없는 행 1) | **RED**(합 검사가 회수와 독립으로 작동함) |

## 12. AC-012 — 수리 커밋이 0건이다

| 항목 | 값 |
|---|---|
| 변이 | `server/src/gateway.ts` 첫 줄을 변이 주석 줄로 바꾼 **커밋 52a8b60** 작성(pathspec 스테이징) |
| 판정 후 | `git diff --name-only 620af7a..HEAD -- server/src/ channel/src/` → **1줄**(`server/src/gateway.ts`, `ac012-red-output.txt`) → 기준 **RED** |
| 복원 | `git reset --hard HEAD~1` 이 **권한 시스템에서 거부**됨(세션 가드 아님 — 우회하지 않고 기록). 대신 자기 커밋에 대한 `git revert` → **6965bec** 착지 |
| 복원 확인 | 같은 명령 → **0줄**(`ac012-restored-output.txt`) → 기준 다시 **PASS**. 서버·채널 생산 코드 순 변경 0 |
| SHA 장부 | 변이 전 HEAD **8f421f3**(M2) → 변이 커밋 **52a8b60** → 복원 커밋 **6965bec**. 계획서가 정한 «HEAD 가 8f421f3 로 돌아온다» 는 reset 거부로 대신 «트리 내용이 8f421f3 과 동일·이력에 변이와 복원이 모두 남는» 상태로 달성됐다 |

## 13. 계측기 목록(모두 이 디렉터리)

`ac007-sweep.sh` · `ac008-sweep.sh` · `ac011-aggregate.sh` · `ac006-argv/compare.sh` · `judge-record.mjs` · `ac004-reachability.mjs` · `ac002-ac004-cofail.mjs`.

## 14. 최종 상태

- 12 기준 변이 **전부 실제로 걸어 돌렸다** — 이빨 확인 11건, **기준 실패 1건(AC-005)** 은 숨기지 않고 §5 에 실측과 뿌리까지 적었다.
- `git diff --stat` = progress.md(기존 실행-환경 Gaps 6줄)만. spec.md·plan.md·acceptance.md·server/·channel/ 순 변경 0.
- AC-012 기준 명령(`620af7a..HEAD -- server/src/ channel/src/`) 무출력.
