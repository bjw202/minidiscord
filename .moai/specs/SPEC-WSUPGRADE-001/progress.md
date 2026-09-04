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

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
