# SPEC-BOTSTAB-001 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-09-01
spec_id: SPEC-BOTSTAB-001
spec_version: "0.7.2"
tier: M
artifacts: [spec.md, plan.md, acceptance.md]
audit_round_1:
  verdict: FAIL
  score: 0.733   # spec.md v0.1.0 트리
  pass_line: 0.80
  report: ".moai/reports/t25/plan-audit.md"
  blocking_closed: [A-01, A-02, A-04]
  partially_closed: [A-03]
  non_blocking_closed: [A-05, A-06, A-07, A-08, A-09]
  declined: []
audit_round_2:
  verdict: FAIL
  score: 0.792   # spec.md v0.2.0 트리
  pass_line: 0.80
  report: ".moai/reports/t25/plan-audit-2.md"
  blocking_closed: [B-01, B-02, B-03]
  non_blocking_closed: [B-04, B-05, B-06]
  declined: [B-07]
audit_round_3:
  verdict: PASS
  score: 0.820   # spec.md v0.3.0 트리
  score_belongs_to_tree: "spec.md v0.3.0"
  note: "차단 셋이 열린 채의 통과 — 점수는 차단을 닫지 않는다. 이 점수는 v0.4.0 트리의 속성이 아니다."
  pass_line: 0.80
  report: ".moai/reports/t25/plan-audit-3.md"
  blocking_closed: [C-01, C-02, C-03]
  non_blocking_closed: [C-04, C-05, C-06, C-07]
  declined: []
audit_round_4:
  verdict: FAIL
  score: 0.761   # spec.md v0.4.0 트리
  score_belongs_to_tree: "spec.md v0.4.0"
  pass_line: 0.80
  report: ".moai/reports/t25/plan-audit-4.md"
  blocking_removed_by_operator_decision: [F-01, F-02]   # 고치지 않고 기제를 걷어냄
  blocking_closed: [F-03, F-04]
  non_blocking_closed: [F-05, F-06]
audit_round_5:
  verdict: FAIL
  score: 0.794   # spec.md v0.5.0 트리
  score_belongs_to_tree: "spec.md v0.5.0"
  pass_line: 0.80
  report: ".moai/reports/t25/plan-audit-5.md"
  blocking_closed: [G-01, G-02, G-04, G-05]
  non_blocking_closed: [G-06, G-07, G-08, G-09, G-10]
  declined: []
  g01_blast_radius:
    measured_by_me: true
    non_empty_lines: 1091
    exempt_lines: 213
    solely_by_finding_id_rule: 113
    of_those_mentioning_ac_id: 54
audit_round_6:
  verdict: FAIL
  score: 0.785   # spec.md v0.6.0 트리
  score_belongs_to_tree: "spec.md v0.6.0"
  pass_line: 0.80
  report: ".moai/reports/t25/plan-audit-6.md"
  blocking_closed_here: [H-01, H-02, H-04]
  blocking_moved_to_t28: [H-03, H-05]
  non_blocking_closed_here: [H-09, H-10]
  non_blocking_moved_to_t28: [H-06, H-07, H-08]
audit_round_7:
  verdict: FAIL
  score: 0.783   # spec.md v0.7.0 트리
  score_belongs_to_tree: "spec.md v0.7.0"
  pass_line: 0.80
  report: ".moai/reports/t25/plan-audit-7.md"
  blocking_closed: [J-01, J-02, J-03, J-04]
  non_blocking_closed: [J-05, J-06, J-07, J-08, J-09]
  declined: []
  carryover_from_round_6: 0   # 감사 확인 — 셋 종결 · 하나 t28 · 하나 절반 종결
  reduction_was_not_the_cause: "감사가 t28 로 옮겨간 문서 훑기 도구를 직접 돌렸고 CLEAN — 남겨 뒀더라도 J-01·J-02·J-03 을 잡지 못했다"
audit_round_8:
  status: none
  reason: "운영자 종결 결정 2026-09-01 — 8회차를 돌지 않고 인수 부채를 안고 닫는다"
  substitute: "리드가 J-01~J-04 네 자리를 직접 읽고, 각 정정 자리의 이웃 어간을 그 부류에 대해 훑는다"
closure_2026_09_01:
  decided_by: operator
  method: "인수된 부채를 안고 종결 (8회차 미실시)"
  rescoring: none
  score_attribution_hard: "0.783 은 spec.md v0.7.0 트리의 값이다. v0.7.1 과 v0.7.2 정정은 **둘 다** 그 채점 뒤에 이루어졌고 재채점하지 않는다 — 어떤 문서도 0.783 을 정정 후 트리의 속성으로 적지 않는다 (t27 정정 커밋·t22 와 같은 처리)"
  accepted_debt:
    statement: "이 문서군을 기계로 지켜보는 것은 이제 없다"
    remaining_defence: ["sync 감사자의 사람 읽기", "저작 규율(산문)"]
    recurrence_count: 8   # v0.7.2 — spec.md §5 를 여덟로 갱신한 같은 편집이 이 필드를 낡게 했고, 다섯 파일 훑기가 잡았다
    recurrence_instances: "B-04(2) · C-01·C-05(3) · F-03·F-04(4) · G-01·G-02(5) · H-01·H-04(6) · J-01·J-02·J-03(7) · progress.md 세 필드(리드 직독 + 필드별 훑기, v0.7.2)"
    self_caught_in_pass: "v0.7.2 에서 §5 를 여덟로 고친 편집이 곧바로 recurrence_count 를 낡게 만들었고, 다섯 파일 훑기가 같은 패스에서 잡았다. 계수 8 에는 넣지 않는다 — 8 은 «남은 채 남이 찾은» 수이고 이것은 «만들어지고 같은 패스에서 잡힌» 것이라 성격이 다르다"
    depends_on: t28
    exposure_window: "t28 이 미뤄지면 그만큼 그대로 길어진다 — 이 SPEC 은 상한을 두지 않는다"
    canonical_site: "spec.md §5 「이 문서군을 기계로 지키는 장치 (인수된 부채)」"
operator_reduction_2026_09_01:
  basis: "여섯 라운드의 차단 발견이 거의 전부 AC-013 과 그 감시 기제에서 났다. 나머지 12개 기준은 다섯 라운드 동안 차단 0건"
  operator_wording: "§M 과 ㉡ 은 남긴다"
  wording_scope: "여기서 §M 은 ④안 확정 당시의 핵심(재실행·착지 확인·기록·미착지면 실패)이며 6회차의 삭제 탐지 확장이 아니다 — 리드 확인"
  ac013_reduced_to: ["㉡ 상수 식별자 적중", "㉣ 스위트 초록", "[HARD] 배치 제약"]
  kept: ["plan.md §M 핵심", "변이 N2", "저작 규율(산문)"]
  split_card: t28
  t28_title: "AC-013 감시 장치·문서 훑기 저작"
  t28_inherits:
    - "doc-stem-sweep.mjs + 자기 시험 + 카나리아"
    - "점수-트리 귀속을 기계로 거는 장치 (SCORES)"
    - "삭제 탐지 기제 (옛 §M-3, git diff 확장)"
    - "H-03 · H-06 · H-07 · H-08 의 처방"
    - "다섯째 재현의 증거 경로와 «주장하지 말고 재라» 방법"
  g04_reverted: "(a) → (b) — §M 핵심은 남고 삭제 탐지 확장은 t28. 리드 승인, manager-spec 동의"
  g04_residual: "«기존 단언이 지워졌는가» 는 t28 착지 전까지 이 카드의 run·sync 에서 열린 채로 남는다 (spec.md §5)"
  # v0.7.2 정정: 이 필드가 v0.7.1 이 철회한 «사람 판단이 대체물» 을 들고 있었다 (리드 직독 발견).
  landing_criterion: "«단언의 존재» — 식별자 존재가 아니다. ㉡(기계)과 §M-2(사람)는 겹치지 않고 층을 이룬다. «단언이 경계를 재는가» 는 §M 도 보증하지 못하며, 대체물은 없다 — 사람의 관측이 기록될 뿐 보증은 아니다 (plan.md §M · plan-done §3k)"
operator_decision_2026_09_01:
  subject: "AC-BOTSTAB-013 자기 감시 기제 제거"
  removed_predicates: ["gapA", "gapA_prime", "gapC"]   # 원문 라벨 ㉠ · ㉠' · ㉢
  removed_mutations: [N, N3, N4]
  in_process_remaining: "㉡ (상한·시길 상수 식별자 적중) + ㉣ (스위트 초록)"
  verdict_moved_to: sync
  sync_obligation:
    # J-05 정정 (7회차): 아래 두 값이 6회차의 확장을 현재형으로 들고 있었다.
    # 산문이 아니라 기계가 읽는 자리라 낡은 값이 더 위험하다.
    spec: "plan.md §M — §M-1 재실행 · §M-2 새 단언 착지(사람 판정) · §M-3 결과 기록 · §M-4 게이트. 삭제 탐지는 포함하지 않는다"
    g04_decision: "(a) §M 확장 → (b) 문언 정정으로 되돌렸다. 삭제 탐지 기제는 t28 소유 — operator_reduction_2026_09_01.g04_reverted 참조"
    spec_ref: "plan.md §M"
    tool: ".moai/state/verify/t25-plan/sibling-sweep.mjs"
    output: ".moai/reports/t25/sync-sibling-assertion-check.md"
    dispatch_route: "sync 디스패치에 실린다 (run 아님) — plan-done.md §4b"
  subject_disjointness:
    claim: "㉡ 의 주어는 다른 파일이다"
    verified_by: ".moai/state/verify/t25-plan/self-reference-probe.mjs"
    result: "조건부 — 자기 참조 경로가 실재한다(모의 C). 배치 제약으로만 성립한다"
    constraint: "AC-013 테스트는 훑기 FILES 밖 파일(일곱째 파일)에 둔다"
  accepted_loss: "sync 와 sync 사이에는 자동 재측정이 없다 — 그 창의 회귀는 다음 sync 까지 신호 0 (spec.md §5)"
  unmeasured_anywhere:
    - "훑기가 실제로 돌았는가 — ㉠ 삭제로 인프로세스에서 사라졌고 §M 은 사람이 돌리는 절차라 자기 부재를 신고하지 못한다"
    - "기존 단언이 지워졌는가 — ㉢ 삭제로 사라졌고, 6회차의 git diff 확장은 t28 로 갔다 (t28 착지 전까지 열린 채)"
    - "단언이 경계를 옳게 재는가 — 어디에서도 보증되지 않는다. §M 의 물음 3 은 기록 항목이지 게이트가 아니다 (7회차 J-04 로 강등). 사람의 관측이 판정 옆에 남을 뿐이며 관측은 보증이 아니다"
  residual_risk: "㉡ 의 정규식이 run 이 정할 상수 이름에 묶여 있고, 어긋나면 인프로세스 방어가 0 이 된다 (plan.md M2 [HARD])"
sibling_amendment:
  decided_by: lead
  decided_on: 2026-09-01
  confirmed_by: operator
  confirmed_on: 2026-09-01
  confirmation: "절충 수용 — 이력 잘림 유지"
  claim_kind: judgment
  sites: [SPEC-CHANINJECT-001 §4.2, AC-CHANINJECT-002]
  execution_phase: sync
  sibling_sweep:
    tool: ".moai/state/verify/t25-plan/sibling-sweep.mjs"
    snapshot_date: 2026-09-01
    is_ceiling: false
    candidate_blocks: 21
    affected_blocks: 13
    affected_assertions: 19
    unaffected_blocks: 8
    title_only: 1
    red: "predicted 0 — confirmed at run phase, not measured at plan"
  mutation_rows: 17   # 표를 세어 얻은 값. (J-07 정정: 이 값을 문서에서 세어 대조하던 doc-stem-sweep.mjs 는 t28 소유이며, 이 카드에는 그것을 거는 항목이 없다)
  defence_observers:
    in_process: "㉡ 상수 적중 (변이 N2 의 falsifier) — 유일한 인프로세스 방어"
    placement_probe_exit_codes: "OK=0 · VIOLATION=1 · UNDECIDED=2 (6회차 H-09 — 셋 다 직접 실행 확인)"
    sync: "plan.md §M — 살아 있는 훑기 출력 대비 착지 확인, 산출물 .moai/reports/t25/sync-sibling-assertion-check.md"
    removed_2026_09_01: ["gapA_prime (자기 참조로 무너짐, F-01)", "gapC (기준선이 감시할 편집에 깨짐, F-02)"]
  doc_stem_sweep:
    tool: ".moai/state/verify/t25-plan/doc-stem-sweep.mjs"
    result: CLEAN
    form: "value(문서에서 센 사실과 대조) + shape(낱말 교집합, 어순 무관)"
    owner: t28   # 운영자 축소 결정 2026-09-01 — 이 카드의 DoD·작업 목록에서 빠졌다. 파일은 제자리에 둔다
    known_defects_for_t28: "H-03(SCORES 가 두 트리분 낡음 · HISTORICAL 이 방어 문언 113줄을 덮음 · removed-predicate 의 unless 가 sync 구역에서 규칙을 끔) · H-06 · H-07 · H-08"
    bite_before_edit: ".moai/state/verify/t25-plan/sweep-before-edit.txt — 편집 전 12건 적중 확인"
    limitation: "RULES 에 모양이 없는 주장 · 여러 줄 주장 · 여러 줄 표의 갈린 열 · 문서 밖 사실은 잡지 못한다"
od_ceilings:
  confirmed_by: operator
  confirmed_on: 2026-09-01
  values: {OD-1: 4000, OD-2: 20, OD-3: 512, OD-4: 16000, OD-5: 256}
  basis: judgment
  note: "확정이 근거를 바꾸지 않는다 — 아무도 재지 않았고 확정도 재지 않았다"
# v0.7.2 정정: 아래 세 필드가 v0.1.0 값에 멈춰 있었다. 2회차·3회차의 갱신 편집이
# **들여쓰기가 어긋난 앵커에 assert 없이** 걸려 조용히 아무 일도 하지 않았다 —
# 6회차에 spec_version 에서 한 번 만난 것과 같은 실패이고, 그때 이 파일을 그 부류로
# 훑지 않아 둘이 남았다. 값은 문서에서 세어 확인했다:
#   grep -c '^\*\*REQ-BOTSTAB-' spec.md      → 12
#   grep -c '^### AC-BOTSTAB-' acceptance.md → 13
#   grep -c '^| \*\*OD-[0-9]\*\* |' spec.md   → 5 (전부 2026-09-01 운영자 확정)
requirements: 12
acceptance_criteria: 13
open_decisions: []   # OD-1~OD-5 는 2026-09-01 운영자 확정 — od_ceilings 참조. 근거는 여전히 판단값이다
baseline:
  tree: "base 2a19d7d / WT-bot-stability"
  command: "npx vitest run --root channel --reporter=dot"
  observed: "95 passed / 6 files"
  source: ".moai/state/verify/t25-plan/mutation-probe.md"
```

## §E.2 Run-phase Evidence

```yaml
run_lane: "kanban card t25 · /moai run SPEC-BOTSTAB-001 · 반자율(마일스톤 단위, 블로커 보고)"
executed_at: 2026-09-01
tree: "base 7c9958b (WT-bot-stability) — run 작업 전부 미커밋(리드 판독·승인 후 커밋, t8/t10 순서)"
suite_final:
  command: "npx vitest run --root channel --reporter=dot"
  observed: "121 passed / 7 files (exit 0)"
  attribution: "2026-09-01 17:33 run 레인 직접 실행 — 이 트리, 미커밋 run 작업 위"
  baseline_arithmetic: "95(계획 기준선) → 98(M1) → 107(M2) → 116(M3) → 119(M4) → 120(M4a) → 121(K 보강) — 각 단계 run 레인 직접 재관측"
typecheck: "tsc --noEmit exit 0 (마일스톤별 재관측)"
src_shasum_at_close:
  gateway-client.ts: "1cb171887b3f69b624a0c06698f9eaa7fc58ec77 — 계획 단계 값과 동일(M1 무변경 계약)"
  channel-server.ts: "1cfd24b2702b3a01e9b5398f7da73205527e3538"
  index.ts: "a9d44572869fcfc1e24d4b54dec6be2d8e0afb06"
  truncate.ts: "ebbfd01d8137eac25657716d5a61fcf97a29263b (신설)"
milestones:
  M1: "가드 ② 기준 신설 3건(AC-001·003·012)+제목 한 자리 교정 — 손 변이 A·B 포착(RED), shasum 복원. 95→98"
  M2: "channel/src/truncate.ts 신설(OD 상수 5·시길 탈출·코드포인트 절단·파생 ㉡ 정규식 수출)+테스트 9건(INV-1/2/3 포함). 98→107"
  M3: "알림 통로 배선(이름·본문·첨부 갈라서, 중화 뒤)+테스트 9건. 107→116"
  M4: "이력 통로 두 단계 절단+cursor=실린 원소 id 최댓값 — TDD(RED 48,079B→GREEN)+테스트 3건. 116→119"
  M4a: "훑기 생출력 33블록 전원 상수 적중 단언(신규 23·보유 10)+AC-013(생 훑기 파싱·일곱째 파일)+PLACEMENT=OK. 119→120 (K 보강 전 캡처 기준)"
  M5: "변이표 17행 전건 실측(일치 16·불일치 1=G 예측 오배정)+K 배선 목격 보강 후 재측정 일치+형제 두 수(빨개지는 것 0·무효화 33/33 — M5 게이트 시점, 생출력 34 기준 34/34). 120→121"
mutation_measurements: ".moai/state/verify/t25-run/m5-mutation-observations.md (통합표) · mutation-{A..N2}.md (행별 전문) · m5-raw/ (원본)"
flake_handover: "transport-auth nonces 논스 테스트 2회 출현·자가소멸 — .moai/state/verify/t25-run/flake-observations.md"
```

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-09-01
spec_id: SPEC-BOTSTAB-001
evidence:
  suite: "121 passed / 7 files — run 레인 직접 실행(2026-09-01 17:33, 이 트리, exit 0)"
  mutation_table: ".moai/state/verify/t25-run/m5-mutation-observations.md — 17행 전건 관측, 빈 행 0, 일치 16 / 불일치 1(G)"
  sibling_two_counts: "빨개지는 것 0건(클린 스위트 관측) · 무효화되는 것 34/34블록 — M5 게이트 시점 33/33 → K 보강(2026-09-01 17:23) 뒤 생출력 34 기준 34/34, 차분 = channel-server.test.ts:547 AC-BOTSTAB-010 배선 목격 — run-done §0 과 동일 공시(AC-013 PASS + 훑기 재실행)"
  placement_probe: "PLACEMENT=OK (self-reference-probe.mjs, exit 0 — run 레인 직접 재실행)"
  regex_coupling: "[HARD] ㉡ 결합 기준 PASS — 파생 정규식(truncate.ts 수출)이 수출 상수 전부에 적중"
  scope_boundaries: "gateway-client.ts diff 0 · server/ 변경 0 · neutralizeEnvelope 무변경 · SPEC-CHANINJECT-001/* 무변경 — git diff --stat + shasum"
  sync_handoff: "plan.md §M 의무 — sync 디스패치 경유(plan-done §4b). 판정 입력: .moai/state/verify/t25-run/{sibling-sweep-run.md, m4a-evidence.md §E2 착지표 33행} — 명시: 33행은 K 보강 이전 캡처, 살아 있는 출력은 34블록, sync 는 생출력으로 판정"
pending_lead_decisions:
  - "커밋 승인(승인 전 미커밋 유지 — t8/t10 순서)"
  - "G 행 예측 오배정·acceptance.md 관측 열 채움·spec.md §3.3 재도출 — SPEC 본문 소유권(manager-spec 회부)"
  - "K 의 index.ts 이력 자리 순서 목격 부재 — 신규 발견, 후속 카드 판정용 관측 데이터 동봉"
uncommitted_note: "run-done.md 포함 전부 미커밋 — 리드 판독·승인 후 커밋(t8 선례: run-done 은 sync 인계 때 흡수)"
```

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-09-02
spec_id: SPEC-BOTSTAB-001
sync_commit_sha: pending-backfill-sync
evidence:
  sibling_assertion_check: "plan.md §M 의무 이행 — 명령 `node .moai/state/verify/t25-plan/sibling-sweep.mjs` exit 0, 생출력 **34블록**. 34/34 착지, 미착지 **0건**, 종합 판정 통과. 정본: .moai/reports/t25/sync-sibling-assertion-check.md (§M-3 네 항목 전부 수록). 원본 출력: .moai/state/verify/t25-sync/{sweep-plain.txt, sweep.json}"
  sweep_snapshot_reconciliation: "§M-1 «출력이 스냅숏과 이기면 출력이 이긴다» 적용 — spec.md §3.3 스냅숏 21 vs 생출력 34, 판정은 34 기준. 차분 13 = M3·M4 신설 12 + AC-BOTSTAB-010 배선 목격 1(channel-server.test.ts:547). m4a-evidence §E2 의 33행은 K 보강 이전 캡처이며 34번째 행을 이 판정이 채웠다"
  suite: "121 passed / 7 files (exit 0) — `npx vitest run --root channel --reporter=dot`, sync 레인 **직접 실행** (2026-09-02 09:27, 이 트리). 원본 .moai/state/verify/t25-sync/suite.txt"
  typecheck: "`npm run typecheck -w channel` (tsc --noEmit) exit 0 — sync 레인 직접 실행. 원본 .moai/state/verify/t25-sync/typecheck.txt"
  sibling_amendment: "AM-1·AM-2 집행 완료 — SPEC-CHANINJECT-001/spec.md 단일 파일(+9/-4). AM-1 §4.2 비파괴 단락(금지를 중화 단계로 한정) · AM-2 REQ-CHANINJECT-002 일반 문언(시길 없음 + 상한 이하로 조건화) · 각 자리에 개정 각주 · HISTORY 0.3.4 행 · frontmatter version/updated. **소유권 경로: 본문은 manager-spec 소유이므로 sync 레인이 manager-spec 에 재위임해 집행**(spec-frontmatter-schema.md § Forbidden ownership crossings 가 정한 경로). 그 SPEC 은 이미 status: in-progress · amendment_of 보유라 완료→개정 전이 불필요"
  docs: "CHANGELOG.md [Unreleased] 최상단에 카드 t25 항목 신설(중복 검사 `grep -c SPEC-BOTSTAB-001 CHANGELOG.md` = 0 선행) · README.md fetch_history 서술 정정 — 절단·표시·새것부터 버리기·커서 계산원을 더했다(개정 전 서술은 중화만 적어 이번 변경으로 낡았다)"
  scope_boundaries: "sync 단계 변경은 문서·SPEC 뿐 — `git diff --stat` 에 channel/src·channel/test 부재. run 커밋 이후 코드 변경 0"
  run_done_absorbed: "run-done.md(미커밋 상태로 인계받음)를 이 sync 커밋에 흡수 — t8 선례"
pending_lead_decisions:
  - "형제 개정이 낡게 만든 8자리(미편집·보고만) — AM 범위가 «두 자리뿐» 이라 손대지 않았다. 후속 카드 여부는 리드 판정. 목록: spec.md:123·:292, acceptance.md:116·:118·:287·:308·:724·:734, plan.md:115"
  - "AM-1 각주의 줄 인용 `:313` 을 헤딩 앵커로 바꿔 적용(«문안 그대로» 에서 벗어난 유일한 자리) — 개정 자신이 줄을 밀어 그 인용이 즉시 거짓이 되기 때문. 바이트 단위 동일이 요구였다면 리드 판정 필요"
  - "§M 이 사지 못하는 넷(단언이 옳게 재는가 · 기존 단언 삭제 · 훑기 실행 여부 자체 · 연속 관측)은 이 판정으로 닫히지 않는다 — plan.md §M 표 그대로, t28 이 일부를 소유"
```

## §F Phase 4 Mode Selection

- Logged by: run lane (card t25 · /moai run SPEC-BOTSTAB-001), before the first run-phase Agent() spawn. Kickoff 승인 2026-09-01 (리드 경유 운영자) — 반자율 모드: 마일스톤 단위 진행, 중대 판단(설계 변경·범위 이탈)은 블로커 보고.
- Input parameters: tier=M · scope≈5-7 files (channel/test 신설·갱신 + channel/src 2곳 배선) · domains=1 (channel 워크스페이스) · file language=TypeScript · concurrency benefit=LOW (coding-heavy) · agent-teams prereqs=N/A
- Mode evaluation:
  - direct — not selected: 다중 마일스톤 구현이지 단일 변경이 아니다
  - serial — SELECTED: 코딩 중심 작업 (Anthropic coding-task parallelism caveat) + 마일스톤 의존 사슬(M2 상수 → M3/M4 배선 → M4a 단언은 상수를 읽음) + 쓰기 가능 에이전트 동시 실행 금지
  - fanout — not selected: 연구 중심이 아니고 사슬이 의존 순서를 가진다
  - sweep — not selected: 파일 수가 기계 일괄 변환 문턱(≈30)에 크게 못 미치고 변환이 균일하지 않다
- Decision: serial
- Justification: 카드 실질은 코딩 작업이고 마일스톤 사이에 상수·배선·단언의 의존이 있다. 하나의 쓰기 가능 구현 에이전트를 마일스톤 단위로 순차 스폰하는 것이 쓰기 경쟁 금지와 캐시·조율 경제 모두에 맞는 유일한 선택이다.
