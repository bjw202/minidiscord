# SPEC-WSUPGRADE-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-09-04
spec_version: "0.5.0"
tier: M
requirements: 11
acceptance_criteria: 12
criteria_with_mutation: 12
open_decisions: []            # A-1=(a) wsConnect 한 곳 / A-2=(a) 개발 기계 — 리드 처분 2026-09-04, plan.md §A
spec_kind: investigation   # 규명 카드 — 수리 설계 없음
audit_rounds:
  - iteration: 1
    verdict: FAIL
    score: 0.58
    threshold: 0.80
    report: .moai/reports/t39/plan-audit.md
    must_pass_violations: 0
    repaired_in: "spec.md/plan.md/acceptance.md v0.2.0 (D1~D10 + P2)"
  - iteration: 2
    verdict: FAIL
    score: 0.761
    threshold: 0.80
    report: .moai/reports/t39/plan-audit-2.md
    must_pass_violations: 0
    closed_from_round_1: 7          # D1~D10 중 D3·D4·D6·D7·D8·D9·D10 종결 / D1·D2·D5 부분 종결
    partially_closed_from_round_1: 3
    regressions_from_round_1: 0
    repaired_in: "spec.md/plan.md/acceptance.md v0.3.0 (N1~N6)"
    new_evidence: .moai/reports/t39/probe-upgrade-window.{mjs,log}
  - iteration: 3
    verdict: PASS
    score: 0.84
    threshold: 0.80
    report: .moai/reports/t39/plan-audit-3.md
    must_pass_violations: 0
    closed_from_round_2: 6          # N1~N6 전건 종결
    regressions: 0
    repaired_in: "spec.md/plan.md/acceptance.md v0.4.0 (D1 ㉮ 창별 분리 · D2 포획 창 정의 · 충돌 탐지 조항 · §A 미결 2건 결정화)"
  - iteration: 4
    kind: post-audit-amendment      # 감사 회차 아님 — 기준 실측에 따른 범위 재작도
    verdict: n/a                    # 4회차 감사를 돌리지 않았다 (미실시, 통과 아님)
    trigger: "AC-WSUPGRADE-008 이 변이 없는 깨끗한 트리에서 빨감 — 토큰 없는 적중 1건 .moai/reports/t39/plan-audit.md:236 (566b87a 시점 기존)"
    change: "AC-008 범위를 부류로 재작도 — 감사 보고서 부류 plan-audit*.md 제외 / .moai/reports/t39/ 통째 제외는 거부(변이 C 실측)"
    sibling_rederivation: 4         # 「면제 0건」 → 「범위 안 줄 단위 면제 0건」 (spec.md §2.1 · REQ-011 · acceptance.md AC-008 · plan.md DoD)
    scope_note: "REQ-011 「모든 줄」에 §2.1 정의역을 붙임 — 한 조항보다 한 걸음 넓은 의도적 확장(리드 승인 2026-09-05)"
    residual: "제외 경계가 파일명 패턴 — 다른 이름의 감사 문서는 범위 안에 남아 기준을 다시 빨갛게 만든다(의도된 시끄러운 실패)"
    branches_unchanged: [H-1, H-2, H-3]
    commits: [4218429]              # 본문 변경 커밋. 이 §E.1 항목·version·HISTORY 를 담은 기록 마감 커밋이 뒤따른다
    repaired_in: "spec.md/plan.md/acceptance.md v0.5.0 (기록 마감: version·HISTORY·progress §E.1)"
```

## §F Phase 4 Mode Selection

```yaml
tier: M
scope_files: "2-3 (test harness in server/test/gateway.test.ts + judgment test + records)"
domain_count: 1          # server/test 만 — 생산 코드 무수정(AC-012)
language_mix: typescript-only
concurrency_benefit: LOW # 코딩 중심(Anthropic coding-task caveat) + 마일스톤 순서 의존(M1→M2→M3→M4→M5)
agent_team_prereqs: n/a
mode_evaluation:
  direct: not selected   # 다중 마일스톤 구현 — 자명 단순 변경 아님
  serial: SELECTED
  fanout: not selected   # 코딩 중심 + 쓰기 가능 에이전트 동시 실행 금지
  sweep: not selected    # 기계적 대량 변환 아님
decision: serial
justification: >
  관측 하네스·판정 시험 구현은 코딩 중심이고 마일스톤에 엄격한 순서 의존이 있다
  (M4 변이는 M3 대조 실행 창과 겹치면 인공 실패가 기록에 섞인다 — plan.md §F 각주).
  서브에이전트 하나를 마일스톤 순서로 직렬 위임한다.
kickoff_approval: "칸반 카드 t39 run 디스패치(리드, 2026-09-05)로 plan→run 진입 승인 완료"
```

## §E.2 Run-phase Evidence

### M1 — 관측 하네스 (plan.md §F M1)

- **착지 자리** — `server/test/gateway.test.ts` 의 `build()`(:28 부근)와 `wsConnect`(:177 부근). A-1=(a) 결정(하네스는 `wsConnect` 한 곳)을 따른다.
- **창 둘** — 창1 `app.server.on('upgrade', …)` 소비하지 않는 리스너(createGateway 뒤, listen 전 — probe-upgrade-window.log 배열1 의 실측 배치), 창2 Fastify `onRequest` 훅(라우트 등록 전). 두 창 모두 `build()` 안에서 attach 되어 이 파일의 모든 접속이 균일하게 관측된다. 창1 은 소켓을 쓰지도 닫지도 않는다(G-1).
- **포획** — `wsConnect` 의 `unexpected-response` 리스너가 기록만 하고 아무 값도 돌려주지 않는다(`emit` 거짓 → ws 의 `abortHandshake` 그대로 던짐 — ws 8.21.3 `websocket.js:929` 소스 확인, plan.md §C, AC-005). 기록 전체는 try/catch 로 싸여 기록 실패가 원래 실패를 가리지 않는다.
- **기록 14 항목** — AC-001 넷(상태 코드·상태 줄 원문·헤더 전건(rawHeaders 쌍 보존)·본문 동기 판독) + AC-002 열(소켓 양끝 넷+계열 둘, 두 창 로그 전건, 귀속 적중 항목 전건+건수, t_open·t_close, 충돌 유무, 포트 보유 상태). JSON 1포획 1파일로 `.moai/reports/t39/captures/` 에 남긴다 — 루트는 시험 파일 위치에서 두 단계 위(`import.meta.url`), 디렉터리는 첫 포획 때만 생성(포획 0건인 실행은 흔적 없음).
- **귀속·충돌** — 귀속 대조(localPort·경로·포획 창 삼중)와 충돌 탐지는 순수 모듈 `server/test/wsupgrade-judgment.ts`(신설 — M1 은 기록 형태+귀속 대조, M2 가 같은 파일에 지문표·판정을 더함)로 뺐다. 하네스와 M2 시험이 같은 조각을 쓴다.
- **AC-007 사전 점검** — 이 카드가 더하거나 고친 실행 부류 파일(`gateway.test.ts`·`wsupgrade-judgment.ts`)의 훑기 어간(`spawn`/`exec`/`execSync`/`fork`/`child_process`) 적중 0건(커밋 전 grep 확인).
- **GATE 증거(하네스 부착 상태)** — `cd server && npx vitest run -t "history_request applies limit before since_id, speaker, since and until"` → `Test Files  1 passed | 16 skipped (17)` / `Tests  1 passed | 219 skipped (220)`, exit 0. 포획 0건으로 captures 디렉터리 미생성 확인.
- **Gaps** — 포획 경로의 실제 착지(비(非)101 포획 JSON)는 첫 실포획(M3)까지 미관측이다. 설계는 probe-upgrade-window.{mjs,log} 가 잰 값(무손상·귀속 적중)을 그대로 따르지만, 하네스 본문의 그 경로는 아직 실행으로 쟀지 않다.

### M2 — 지문표·2차 판정·세 갈래 사상 (plan.md §F M2)

- **착지 자리** — `server/test/wsupgrade-judgment.ts`(M1 이 만든 같은 파일에 추가)의 `fingerprint`(지문표 §5.4 ①→⑤ 첫 적중)·`secondVerdict`(2차 판정 ㉮→㉮′→㉯→㉰, ㉱·충돌은 앞 가드)·`classifyComparison`(§5.5 네 조합) — 전부 순수 함수다.
- **합성 입력만** — 실제 404 포획을 기다리지 않는다(AC-003·AC-004(1)·AC-009). AC-004 의 (2) 정의역 도달성은 이 시험의 범위가 아니다 — plan.md §F M2 대로 M5 가 실제 포획/탐침 출력으로 채운다(현재: H-2 재현됨 · H-1·H-3 근거 없음 — 갈래 셋 그대로 열려 있다).
- **AC-003** — 다섯 합성 입력(400+Sec-WebSocket-Version+빈 본문 / Fastify JSON / `plain-404` 맨 서버 모양 / text/html / 502) → 다섯 다른 이름(미분류 포함, 이름 지어 주지 않음). content-type 이 json 이어도 본문 모양이 Fastify 가 아니면 미분류 — «모양» 술어의 이빨 시험 추가.
- **AC-004(1)** — 창2 적중→H-3, 적중 0+보유 없음(listening false·address 포트 불일치 둘 다)→H-1, 적중 0+보유→H-2, **창1 단독 적중→미분류(㉮′, H-3 이 아님)**, 귀속 대조 불가(㉱)→미분류, 충돌→미분류, 지문 ② 밖→미분류.
- **AC-009** — `(1,0)→병렬에서만 실패` · `(≥1,≥1)→항상 실패` · `(0,0)→미관측(PASS 아님, REQ-008)` · `(0,1)→뒤집힘`.
- **GATE 증거** — `cd server && npx vitest run test/wsupgrade-judgment.test.ts` → `Test Files  1 passed (1)` / `Tests  8 passed (8)`, exit 0.
- **AC-007 사전 점검** — M2 파일 둘의 훑기 어간 적중 0건(커밋 전 grep 확인).

### 실행 환경 Gaps — node_modules 해석 경로 (리드 지시 2026-09-05, 기록만 하고 환경은 고치지 않음)

- **관측된 사실** — 이 나무의 `server/node_modules` 에는 `.vite` 캐시 1개만 있고 패키지는 없다. 모든 패키지는 디렉터리 올라가기로 **주 체크아웃**(`/Users/byunjungwon/Dev/my-project-04/minidiscord/node_modules`, ws 8.21.3·vitest 4.1.11 확인)에서 해석된다. 즉 이 카드가 재는 환경은 「나무 안의 격리된 트리」가 아니라 **「나무의 소스 + 주 체크아웃의 패키지」 혼합**이다.
- **측정 범위** — 이 카드의 모든 실행(M1 GATE·M2·M3 40회)은 그 혼합 환경에서 돈다. 「효과 동일」은 실행 3회 성공에서 **추론한 것이지 측정한 동치가 아니다** — 격리 나무에서의 결과와의 비교는 시도하지 않았다.
- **처분** — 리드 지시로 **환경을 고치지 않는다**(고치면 지금까지의 측정이 무효가 되고 재현되던 조건을 잃는다). 이 관측의 조건을 다시 만들 사람은 이 문단에서 환경 조합을 읽는다. 포트 재할당 경합 가설(H-1)과 관련해, 어느 프로세스들이 같은 기계에서 함께 도는지도 이 환경 기술의 일부다 — M3 실행 창에는 이 카드의 vitest 프로세스 하나와 주 체크아웃·레인 세션들이 있다.

### M3 — 대조 실행 (plan.md §F M3) — 판정 `미관측`, 카드 열린 채

- **실행** — §B(acceptance) 두 팔을 각각 20회, 순차(m3/run-comparison.sh, 부하 스폰 없음 D-1). 병렬 20/20 PASS · 직렬 20/20 PASS(`m3/summary.txt` · `m3/parallel-{1..20}.log` · `m3/serial-{1..20}.log`).
- **판정** — `Mp = 0`, `Ms = 0` → §5.5 사상 **`미관측`**(PASS 아님 — REQ-008·AC-009). **포획 0건** — `.moai/reports/t39/captures/` 가 한 번도 생성되지 않았다(ls 부재 확인).
- **(ㄱ) 이번 회차가 원 조건을 재현하지 못한 이유(리드 재판독 2026-09-05).** 이번 두 팔은 **서버 스위트 안의 파일 병렬성만** 갈린다(SPEC §B 정의 그대로의 실행 — run 의 이탈 아님). 그러나 원 관측은 `moai gate`, 그 뿌리 `npm test --workspaces --if-present` 가 **server 와 channel 을 함께** 도는 창에서 나왔다. channel/test 에는 서버·포트를 띄우는 파일이 다섯 있다(permission-relay · index-wiring · transport-auth · gateway-mutual-auth · gateway-client — 전부 gateway/WebSocket 계열). 갈래 H-1·H-2 는 «같은 127.0.0.1 포트를 쥔 다른 앱»을 요구하는데 이번 두 팔에는 그 외부 앱이 **없었다** — 경합 상대는 서버의 자기 시험들뿐. 즉 **M3 는 원 조건을 갖고 돌지 않았고, 이것은 SPEC §B 설계의 갭이다.**
- **(ㄴ) 판정의 뜻** — 이번 미관측은 «현상이 없다»가 아니라 **«조건이 재현되지 않았다»**다. 카드가 열린 채인 것은 그 이유 때문이다.
- **(ㄷ) 다음 회차 조건 — 제안으로만 기록(실행 안 함; 팔 정의의 소유는 SPEC §B, 본문 수정은 manager-spec).** 대조 축을 «서버 안 파일 병렬성»에서 **«워크스페이스 동시 실행»**으로: 병렬 팔 = `moai gate`(또는 `npm test --workspaces`), 직렬 팔 = 워크스페이스 순차, 나머지 동일. **D-1 구분 명시** — D-1 은 **인공 배경 부하 스폰**을 금지한다. 이 제안은 관측된 실패가 나온 **실제 명령을 그대로 도는 것**으로 빠진 기존 조건을 채우는 것이지 부하를 발명하는 것이 아니다 — 축이 다르다.

### M4 — 변이로 이빨 확인 (plan.md §F M4) — 12건 전부 실걸이, 이빨 11건·기준 실패 1건

- **전체 기록** — `m4/mutations.md`(기준별 자리·변이·전후 판정·복원 증명 전건). 각 변이 복원 확인: `git diff --stat` 이 progress.md(기존 6줄)만 — spec.md·plan.md·acceptance.md·server/·channel/ 순 변경 0.
- **트리거** — AC-001/002/005 계열은 404 가 수요에 재현되지 않으므로(Mp=0) 접속 경로를 `/nope` 로 임시 바꿔 **ws 의 경로 미스 400**(비(非)101, spec.md F1 실측과 같은 응답자)을 결정적으로 일으켰다. 트리거 응답은 400 이지 404 가 아니다 — 이 기준들이 재는 것은 «기록»이지 코드 404 가 아니므로 대용. 트리거 기준선 포획이 `judge-record.mjs --trigger` 14항목 전부 통과(`m4/ac001-baseline-capture.json`).
- **이빨 확인(RED 실측)** — AC-001(리스너 삭제→포획 0건·헤더 빈 배열→헤더 필드만 RED) · AC-002(네 아변형이 각자의 필드 RED + AC-004 동반 붕괴 실측 `m4/ac002-ac004-cofail-out.txt`) · AC-003(술어 상수화·catch-all → 시험 RED) · AC-004(보유 비교 삭제 → H-1/H-2 붕괴 RED · 근거 검증기가 혼입 기록·존재하지 않는 경로 기각) · AC-006(dot 실실행 → 차집합 2 RED · 손작성 배열 2종 출처 거절) · AC-007(부하 1줄 → 훑기 RED · 범위 축소 4종은 «잘못된 초록»으로 실측 — 범위가 집행을 지운다는 반증) · AC-008(plan.md 변이 줄 → 1건 RED · 낱말 술어·목록 제외는 «잘못된 초록» 실측) · AC-009((0,0)→PASS·(0,1) 접기 RED) · AC-010(H-3 행 삭제·관측 칸 비움·본문 단정 줄 → 세 조항 각각 RED) · AC-011(실제 12회 실행 → 분모 RED · 행 부풀리기·합 불일치 RED) · AC-012(변이 커밋 52a8b60 → 기준 1줄 RED · 복원 후 무출력).
- **기준 실패 1건(CRITERION-FAILURE, 블로커 보고 대상)** — **AC-005**: 변이(기록 후 참 반환)를 걸어도 시험이 여전히 failed(시간 초과) → 기준이 변이를 잡지 못했다. 뿌리는 실행으로 확정했다 — `websocket.js:929` 의 `!websocket.emit(...)` 은 **리스너 존재만으로 참**이라(리스너 반환값 무관), 현행 하네스는 이미 던짐 경로를 삼킨 채였고 실패는 5초 시험 시간 초과로만 살아남는다(리스너 삭제 시 `Unexpected server response: 400` 즉시 실패 — 두 모드 실측 대비). plan.md §C 의 «emit 이 거짓» 기제는 EventEmitter 성질과 어긋난다. 기준·§C 의 수정은 manager-spec 몫 — sync 이월.
- **AC-004 (2) 정의역 도달성** — H-2 만 탐침 출력 근거(probe-coexist.log · probe-upgrade-window.log 배열2), H-1·H-3 근거 없음 → **1/3 미충족(통과 아님, 미관측)** — `m4/ac004-real-verdict.txt` · `ac004-claims.json`.
- **AC-012 복원 특기** — 변이 커밋 되돌림의 `git reset --hard` 가 이 세션에서 **권한 시스템에 의해 거부**됨(우회하지 않음) → 자기 커밋에 대한 `git revert`(6965bec)로 복원. 최종 `git diff --name-only 620af7a..HEAD -- server/src/ channel/src/` **무출력**.
- **깨끗한 트리 값(최종)** — AC-007 훑기: 목록 144·적중 0. AC-008: 토큰 없는 적중 0(범위 126). AC-010 awk: 0. 복원 후 대상 시험 단독 재실행 1 passed(`m4/post-restore-sanity.log`).

### M5 — 판정과 기록 (plan.md §F M5)

- **판정 기록물** — `.moai/reports/t39/verdict.md` (리드가 읽을 단일 기록: 포획 0건 명시 · §5.5 미관측과 (ㄱ)(ㄴ)(ㄷ) · AC 12행 판정 행렬 · «아무것도의 지문» · 후속 씨앗 · 환경 기록 · §7 미갱신 공시).
- **§7 미검증 목록 갱신은 하지 않았다** — SPEC 본문 수정은 run 단계 금지(manager-develop 소유권 경계). 이월 항목 넷: 포획 0건 · 팔 축의 갭((ㄱ)) · AC-005 기준 실패와 plan.md §C 기제 오류 · 하네스 삼킴 관측(리스너 존재가 던짐 경로를 지운다). sync 단계에서 manager-spec 이 반영해야 한다.
- **수리를 제안하지 않았다** — 후속 씨앗은 verdict.md §5 까지다.

### 3회차 — 하네스 수리 (b7f22d0) · M6 복제 · M3 재실행 · M4 재실행 · M5 최종 (§D-2 종결 회차)

- **하네스 수리(커밋 `b7f22d0`, 1회차 CRITERION-FAILURE 의 닫힘)** — `unexpected-response` 리스너가 기록 뒤 **관측된 상태 코드를 실은 응답자 오류로 실패를 스스로 세운다**(REQ-004 개정본 — ws 는 리스너 존재만으로 abortHandshake 를 건너뛴다). 본문은 `end` 까지 모아 온전히 기록(동기 판독은 본문이 별도 세그먼트로 올 때 빈 본문을 남김 — 실측 `m4/ac005-repair/`), 거짓 기제 주석 두 자리 정정. 트리거 실측: 포획 1건 · 시험 failed · «Unexpected server response: 400» 76ms.
- **M6 복제 — 포획 0건 / 시행 20** (`m6/summary.txt`): rc=0 20행·captures=0 20행. **양성 증거** — 시행당 t0·t1: 80초 1회·81초 14회·82초 5회(무효 ~1초 실행과 같은 exit 0 이 아님). 1회 시도 무효 기록은 `m6/summary-invalid-root-path.txt` 로 보존·판정 입력에서 제외. **상한 `p ≤ 13.9%`(95% 단측) — «나무 환경의 gate 구성» 한정**(§7-15 차3 미종결; «닫혔다» 수준 p ≤ 1% 에는 161회 필요).
- **M3 재실행** (`m3r2/`): 병렬 20/20 PASS · 직렬 20/20 PASS · 포획 0건 → §5.5 `미관측`(PASS 아님). 1회차 (ㄱ) 판독 불변 — 이 팔 설계에는 원 조건(같은 포트를 쥔 다른 앱)이 없다.
- **M4 변이 재실행 — 14 기준 전부 실걸이, CRITERION-FAILURE 0건** (`m4r2/mutations-round3.md` 행렬): AC-001(리스너 삭제·헤더 빈 배열) · AC-002 네 아변형(각자 필드 FAIL + AC-004 동반 붕괴 재실측) · AC-003(상수 true·catch-all) · AC-004(보유 비교 삭제 RED · (2) H-1/H-3 근거 없음 미관측 유지 — 이빨 재실측 `ac004-teeth.txt`) · **AC-005 재설계 이빨** — 반대 방향 변이 둘이 **서로 다른 조항**에서 RED: 삼킴(재수립만 삭제) → 조항 (3) RED(«Test timed out»), 은폐(리스너 삭제) → 조항 (1) RED(포획 0건). 1회차가 샌 자리가 이제 잡힌다 — `ac005-{baseline,primary,aux}-verdict.txt` · AC-006(xtrace 차집합 1·dot 실실행 2·손작성 2종 거절) · AC-007(깨끗한 트리 333개 0적중·부하 1줄 RED·복원 0; 보조 넷은 1회차 인용) · AC-008(329개 0적중·변이 줄 RED·복원 0; 보조 둘 1회차 인용) · AC-009((0,0)→PASS·(0,1) 접기 RED) · AC-010(세 조항 각각 RED — awk 0→1 실측) · AC-011(m3r2 양팔 20/20 PASS·12회 RED·부풀리기 RED) · AC-012(변이 커밋 `d9150aa` → 1줄 RED → revert `843c22f` → 0줄) · **AC-013 공허 통과 — 리드 지시문대로 두 조항 분리 기록**: 시행 수 조항 통과(20행), 정지 규칙 조항은 **전제 불성실**(포획 0건이라 «첫 포획 이후 지속»을 잴 사건 없음) — **AC-013 의 중심 물음은 이번 실행으로 행해지지 않았고 이빨은 변이에서만 확인**(본 변이 조기 정지 → 양쪽 RED, 보조 마지막 줄 포획 → PASS — 정지 규칙을 잰다는 실측) · AC-014(단독 실행 후 captures 부재 PASS·미리 만들기 변이 RED·트리거 실행 갈래는 전제 불성실로 적용 안 됨 명시).
- **M5 최종 판정** — `verdict.md` 3회차 판본: 세 기록 전부 `미관측`(PASS 아님)·**§D-2 로 카드 종결** — «이 비용대에서는 여기까지», 남는 표집은 REQ-013 상시 관측자(수리된 하네스가 스위트에 상주). 수리 설계 없음.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-09-05        # 3회차 최종 — §D-2 종결 규약(운영자 확정)으로 카드 닫음
round: 3                           # 최종 회차 — 결과와 무관하게 종결(§D-2)
captures: 0                        # 복제 0/20 + 병렬 0/20 + 직렬 0/20 — 명시(침묵은 통과가 아니다)
replication_trials: 20             # moai gate 고정 20회·중도 정지 없음(시행당 80~82초 양성 증거)
comparison_verdict: 미관측         # Mp=0·Ms=0 → §5.5 — PASS 아님
ceiling: "p ≤ 13.9% (95% 단측) — 나무 환경의 gate 구성에 한정(§7-15 차3 미종결)"
termination: "§D-2 — 남는 표집은 REQ-013 상시 관측자로(비용 0·하네스 b7f22d0 상주)"
ac_matrix: "14 기준 전부 변이 실걸이 — CRITERION-FAILURE 0건(1회차 AC-005 기준 실패는 재설계+하네스 수리로 닫힘)"
ac013_verdict: "(1) 시행 수 20 PASS / (2) 정지 규칙 전제 불성실(포획 0건) — 공허 통과·이빨은 m4r2 변이에서만 실측"
head_at_record: 843c22f            # 기록 시점 HEAD(AC-012 변이 복원 커밋) — 기록 커밋은 이후 착지
verdict_record: .moai/reports/t39/verdict.md          # 3회차 최종 판본
mutation_record: .moai/reports/t39/m4r2/mutations-round3.md
```

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-09-05
sync_commit_sha: 0540b5d                        # 문서 마감 커밋. 이 줄과 아래 typecheck·감사 항목은 뒤따른 마감 커밋이 채웠다
head_at_sync_entry: facce4b                     # sync 진입 시점 HEAD(3회차 증거 보존 커밋)
baseline: 620af7a
worktree: .claude/worktrees/t39 (WT-server-404) # 미푸시 — 이 나무가 이 작업의 유일한 사본

spec_kind: investigation                        # 규명 카드 — 수리 설계 없음(REQ-WSUPGRADE-010)
production_code_lines: 0                        # git diff --stat 620af7a..HEAD -- server/src channel/src → 무출력(sync 단계 재확인)
shipped_files:                                  # 이 카드가 실어 보내는 것은 시험 하네스 셋뿐이다
  - server/test/gateway.test.ts                 # +174 — 비(非)101 업그레이드 응답 상시 관측자(REQ-WSUPGRADE-013)
  - server/test/wsupgrade-judgment.ts           # +188 — 지문표·2차 판정·세 갈래 사상(순수 함수)
  - server/test/wsupgrade-judgment.test.ts      # +123 — 위 판정 모듈의 합성 입력 시험

suite_verification:                             # sync 단계에서 직접 실행해 관측한 값(전달받은 값이 아니다)
  command: "unset MOAI_KANBAN MOAI_KANBAN_ID MOAI_KANBAN_LABEL MOAI_KANBAN_LEAD_ADDR MOAI_KANBAN_SETTINGS_INJECTED && cd <worktree>/server && npx vitest run"
  observed: "Test Files  18 passed (18) / Tests  228 passed (228)"
  exit_code: 0
  captures_dir_after_run: absent                # ls .moai/reports/t39/captures → No such file or directory (AC-014 평상시 비용 0)

typecheck_verification:                         # sync 감사 F1(차단) 수리 뒤 직접 실행해 관측한 값
  command: "unset MOAI_KANBAN … && cd <worktree>/server && npx tsc --noEmit"
  before_repair: "오류 2건 — gateway.test.ts(223,11) TS2322 · wsupgrade-judgment.test.ts(104,26) TS2345 (둘 다 이 카드 저작 — git blame 71307ca·8f421f3)"
  after_repair: "무출력 (rc=0)"
  repair: "statusCode 는 as number 로 좁히고 대체값을 심지 않았다(?? 0 은 존재하지 않는 상태 코드를 기록에 심으므로 기각) · collision 리터럴에 as const"
  suite_after_repair: "Test Files 18 passed (18) / Tests 228 passed (228)"

terminal_state: 미관측                           # PASS 아님 — 침묵은 통과가 아니다(REQ-008·AC-009)
trials_total: 60                                # 복제 20 + 병렬 20 + 직렬 20
captures_total: 0
  # m6/summary.txt: trial 20행 전원 rc=0·captures=0 (시행당 80~82초 — 무효 실행이 아니라는 양성 증거)
  # m3r2/summary.txt: 병렬 P1~P20 PASS · 직렬 S1~S20 PASS · 포획 0건
ceiling: "p ≤ 13.9% (95% 단측)"
ceiling_scope: "나무 환경의 gate 구성에 한정 — 주 체크아웃 구성에 대한 상한이 아니다(spec.md §7-15 차3 미종결)"
ceiling_not: "«닫혔다» 수준(p ≤ 1%)에는 161회가 필요하다(spec.md §5.6)"
termination: "plan.md §D-2 — 3회차 뒤 결과와 무관하게 종결(운영자 확정 2026-09-05). 남는 표집은 REQ-WSUPGRADE-013 상시 관측자가 비용 0으로 이어받는다"

ac_matrix: "14 기준 전부 변이 실걸이 — CRITERION-FAILURE 0건 (1회차 AC-005 기준 실패는 v0.6.0 재설계 + 하네스 수리 b7f22d0 으로 닫힘)"
ac013_hollow_pass:                              # 리드 지시대로 두 조항을 갈라 적는다
  clause_1_trial_count: PASS                    # m6/summary.txt trial 행 정확히 20, 중도 종료 흔적 없음
  clause_2_stop_rule: premise-unmet             # 포획 0건이라 «첫 포획 이후 지속»을 잴 사건이 없다 — 중심 물음은 이번 실행으로 행해지지 않았다
  teeth_source: .moai/reports/t39/m4r2/mutations-round3.md   # 이 기준의 이빨은 변이에서만 실측됐다

b12_self_test_a: "사전 훑기 grep -c 'SPEC-WSUPGRADE-001' CHANGELOG.md → 0 (중복 항목 없음, 배출 진행)"
b12_self_test_b: "AC 수 대조 — acceptance.md 의 정식 식별자 AC-WSUPGRADE-001~014 = 14건, CHANGELOG 서술과 일치(짧은 형태 AC-001~014 는 같은 기준의 본문 약칭)"
b12_self_test_c: "CHANGELOG 가 이름 대는 경로 전건 ls 확인 — gateway.test.ts · wsupgrade-judgment.ts · wsupgrade-judgment.test.ts · verdict.md 모두 실재"

changelog_entry_position: "CHANGELOG.md [Unreleased] 최상단 — 카드 t34 항목 앞(최신 우선 관례)"
readme_touched: false                           # 이 카드는 명령·동작·사용자 표면을 하나도 더하지 않는다. README 「문서」 목록은 SPEC 전수 목록이 아니라 선별 목록이며(디스크의 27개 중 15개만 등재) 누락이 관례다
frontmatter_status_transitions:
  spec.md: "in-progress → completed (updated: 2026-09-05)"
  plan.md: n/a                                  # frontmatter 없음(본문이 # 제목으로 시작)
  acceptance.md: n/a                            # frontmatter 없음
  progress.md: n/a                              # frontmatter 없음
canary_compliance_check: n/a                    # 이 SPEC 은 자기 sync 가 시험할 전방 정책을 정의하지 않는다

ci_verification:                                # PR #4 head 에서 직접 관측
  pr: 4
  head: d4da5f48817702aa812338292585ee590c8cf4ed
  checks: "test pass · test pass (gh pr checks 4)"
  typecheck_ran_in_ci: true                     # gh run view 33967813656 --log 에 「Run npm run typecheck -w server」 단계 실재 · conclusion success
  coderabbit: "미연결 — /commits/<head>/status 가 state pending · statuses [] · 컨텍스트 0개(t36·t37 과 같은 근거로 운영자 면제)"

carry_over:                                     # 이 단계에서 SPEC 본문에 반영하지 않았다 — 본문 소유권은 manager-spec
  - "[미검증 후보] 「moai gate 가 type-check 를 빠뜨린다」 — 감사관이 gate 를 1회 돌려 «타입 오류 2건이 서 있는데 rc=0» 을 관측했다. 그러나 리드도 sync 도 이것을 재현하지 않았다. 도구 결함으로 확정하지 말 것(리드 지시 2026-09-05). 당장의 위험은 CI 가 덮는다 — ci.yml:27 이 typecheck 를 돌고 PR #4 에서 실행이 확인됐다"
  - "[F5 Low] 포획 본문 수집에 명시적 상한이 없다 — end/error/close 폴백만 있어 헤더만 보내고 끝내지도 끊지도 않는 응답자에서는 vitest 5초 타임아웃에 의존한다"
  - "[F3 Medium] 상시 관측자의 실제 경계는 wsConnect 한 자리 — 설계는 리드 처분(A-1=(a))이 맞고, 고칠 것은 REQ-013·AC-014 의 «적힌 경계»가 실제보다 넓게 읽히는 것이다"
  - "spec.md §7 미검증 목록 갱신(3회차 신규 넷: 복제 상한과 나무 한정 · AC-013 공허 통과 · AC-005 재설계 이빨 실측 · 차3 미종결)"
  - "§B 팔 축의 갭 — 서버 안 파일 병렬성만 가르는 설계에 원 조건(같은 포트를 쥔 다른 앱과의 경합)이 없다"
sync_audit_rounds:
  - iteration: 1
    verdict: FAIL
    score: 0.859                                # 통과선 0.80(Tier M) 을 넘었으나 차단 결함 F1 하나로 FAIL
    threshold: 0.80
    report: .moai/reports/t39/sync-audit.md
    dimensions: "Functionality 90 / Security 92 / Craft 72(FAIL) / Consistency 88"
    blocking: "F1 — 실어 보내는 시험 파일 둘의 타입 오류 2건(moai gate 가 잡지 못함 · 상시 관측자라 불결한 채 굳는다)"
    repaired_in: "이 마감 커밋 — 위 typecheck_verification 참조"
    non_blocking: "F2 AC-014 전제 문구 · F3 관측 경계 과장 · F4 §E.2 M1 반증된 기제 무표시 · F5 본문 수집 상한 없음 · F6 포획 자리가 닫히는 카드에 묶임 · F7 gate 로그 0바이트 · F8 자리 수 11 vs 12"

verdict_record: .moai/reports/t39/verdict.md    # 3회차 최종 판본
```
