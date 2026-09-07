# SPEC-BOTMODEL-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_authored_at: 2026-09-07
plan_revised_at: 2026-09-07      # 감사 2회차 교정 (spec.md 는 안 바뀌어 v0.2.0 유지)
plan_audit_iterations: 2
plan_audit_history:
  - iteration: 1
    verdict: FAIL
    score: 0.71                  # Tier L 통과선 0.85
    report: .moai/reports/plan-audit/SPEC-BOTMODEL-001-review-1.md
    closed: "D1~D7 (차단 전부) + D8·D9·D10 (선택 전부)"
    new_numbers_added: 0         # REQ·AC 번호를 하나도 새로 만들지 않았다
  - iteration: 2
    verdict: PASS
    score: 0.889                 # Tier L 통과선 0.85 초과
    report: .moai/reports/plan-audit/SPEC-BOTMODEL-001-review-2.md
    found: "D11·D12 (차단) + D13 (선택) — 1회차 D1~D10 은 전부 해소 확인"
    closed: "D11 (끝 조건 grep 을 네 자리 모두 «다음에 since_id 로 넘기면» 으로 좁힘) · D12 (변이 집합 판정에서 AC-025 제외 + 네 행 재도출) · D13 (변이 ㉠ 에 «전역 커서로 되돌리기» 한정 복원)"
    new_numbers_added: 0         # REQ·AC 번호를 하나도 새로 만들지 않았다 (25/25 유지)
    spec_md_changed: false       # spec.md 는 grep 을 싣지 않아 이번 회차에 바뀌지 않았다 → version·HISTORY 불변
spec_id: SPEC-BOTMODEL-001
stage: "v2 리팩토링 A 단계"
plan_head_sha: 1b4e918
branch: WT-v2-model
worktree: .claude/worktrees/v2-model
predecessor: "C1 단계 착지 2f6cd3f"
tier: L
requirements: 25        # REQ-BOTMODEL-001..025 (Tier L 상한 25)
acceptance_criteria: 25 # AC-BOTMODEL-001..025 (Tier L 상한 25)
mutations: 4            # ㉠ 재전송 JOIN room_bots 제거 · ㉡ deliver 참여 검사 제거 · ㉢ realpathSync→resolve · ㉣ "+ sep" 제거
mutation_expectation:   # 집합 일치로 판정하되 판정 대상은 개별 기준 24개(AC-001~024)다 (acceptance.md DoD 표)
  rule: "AC-BOTMODEL-025 는 전체 스위트를 재는 집계 기준이므로 변이 집합 판정에서 제외한다. 변이 판정은 기준이 적은 파일별 판정 명령으로만 재고, AC-025 는 변이를 넣지 않은 트리에서만 판정한다. 변이 중 AC-025 가 붉어지는 것은 정상이다"
  rows:
    - "㉠(전역 커서 하나로 되돌리기) → 붉음: AC-003 그리고 AC-004 갈래 ㉮ / 초록: 나머지 22 기준"
    - "㉡ → 붉음: AC-004 갈래 ㉯ 만 / 초록: AC-003 포함 나머지 23 기준"
    - "㉢ → 붉음: AC-019 만 / 초록: 나머지 23 기준"
    - "㉣ → 붉음: AC-019 만 / 초록: 나머지 23 기준"
ac004_branch_b_reachability:
  status: "확인됨"
  note: "갈래 ㉯ 는 실제 사람 라우트로는 만들 수 없다 — server/src/routes-messages.ts 의 POST 메시지 핸들러(주석 «팬아웃 — 저장이 끝나면 SSE 발행과 게이트웨이 전달을 각각 정확히 한 번»)가 message_targets 행을 루프로 INSERT 한 뒤 같은 핸들러 안에서 req.server.gateway.deliver(roomId, message, targets) 를 동기로 부르며 그 사이에 await 가 없다. 따라서 저장과 deliver 사이에 DELETE 를 끼워 넣을 틈이 없고, 테스트는 deliver 를 직접 호출해 그 순서를 만든다(acceptance.md AC-004 갈래 ㉯ 가 적은 대로)"
milestone_ac_union: 25  # M1 2 · M2 3 · M3 6 · M4 8 · M5 4 · M6 3 (016 이 M2·M3 에 겹침) — plan.md §B.7
artifacts:
  - .moai/specs/SPEC-BOTMODEL-001/spec.md
  - .moai/specs/SPEC-BOTMODEL-001/plan.md
  - .moai/specs/SPEC-BOTMODEL-001/acceptance.md
  - .moai/specs/SPEC-BOTMODEL-001/design.md
  - .moai/specs/SPEC-BOTMODEL-001/research.md
  - .moai/specs/SPEC-BOTMODEL-001/spec-compact.md
  - .moai/specs/SPEC-BOTMODEL-001/progress.md
source_materials:
  - ".moai/reports/v2-refactoring-guide.md §0 · §2 · §6"
  - ".moai/reports/v2-review.md §1 · §4 · §5 · §6(위험 1~7) · §7"
  - ".moai/state/verify/a0/result.md (결정 ② 실측)"
settled_decisions:
  - "① 권한 요청 방 — 채널이 «마지막 to 방» 을 room_id 로 싣고, 서버 대기 맵은 방:id 와 봇:id 두 색인"
  - "② chat_id — A-0 실측으로 «세션이 채움» 확정(2/2). 채널 보충·서버 거부 두 겹은 관측 한정 때문에 유지"
  - "③ 연속 봇 글 N=6 되먹임 차단은 B 단계 것 — role 열만 여기서 만들고 강제는 하지 않는다"
  - "④ 비공개 방 삭제는 C1 에서 완료 — 이 SPEC 은 전제로만 쓴다"
needs_clarification: []   # 남은 [NEEDS CLARIFICATION] 없음
sibling_breakage:
  measured_by: "미측정 — 보고서 §5 의 처분표는 읽기 판단이며 어떤 기제도 변이시켜 npm test 를 돌리지 않았다(그 보고서 «확인 못 한 것» 1번). run 단계 M6 진입 시 npm test -- --reporter=verbose 로 파일별 it( 수를 실측한다"
  rewritten: 3            # gateway.test.ts · gateway-client.test.ts · rooms-bots.test.ts
  fixed: 9
  deleted: 2              # gateway-v2.ts · gateway-mutual-auth.test.ts (+ fixtures/tls-*)
  coupled_cleanup: ".moai/state/verify/t25-plan/sibling-sweep.mjs 의 'channel/test/gateway-mutual-auth.test.ts' 줄 (직접 확인)"
carried_forward_unresolved:
  - "GET /api/attachments/:id 의 방 검사 부재 — 보류 카드 t17. C1 에서 방 검사 자체가 사라졌으므로 새 구멍이 아니다"
  - "대기 맵의 상한·만료·속도 제한 부재 — 기존 @MX:DEBT, 보류 카드 t12"
  - "web/style.css 의 죽은 규칙(#register-form 계열) — 세지 않았다"
  - "npx tsx scripts/e2e.mts 는 이 SPEC 종료 시점에 빨갛다 — C2 소유"
```

## §E.2 Run-phase Evidence

_\<pending run-phase\>_

## §E.3 Run-phase Audit-Ready Signal

_\<pending run-phase\>_

## §E.4 Sync-phase Audit-Ready Signal

_\<pending sync-phase\>_

## §F Phase 4 Mode Selection

### §F.1 모드 판정

| 항목 | 값 |
|------|-----|
| 기록 시점 | 2026-09-07 — plan 작성 (v2 리팩토링 A 단계) |
| 티어 | L |
| scope (파일 수) | 소스 14 (새로 씀 4 · 조금 고침 10) + 테스트 14 (다시 씀 3 · 고침 9 · 삭제 2) |
| 도메인 수 | 3 (server/ · channel/ · web/) |
| 언어 혼합 | TypeScript + JavaScript + Markdown |
| 동시성 이득 | 낮음 — coding-heavy 이고 세 파일이 **같은 프레임 계약 위에 서야 한다** |
| Kickoff 승인 | **미승인 — plan 감사 통과 뒤 운영자 승인이 필요하다** |

| 모드 | 선택 | 근거 |
|------|------|------|
| `direct` | 미선택 | 25 REQ · 6 마일스톤 · 파일 28개 — 한 줄 수정이 아니다 |
| `serial` | **선택됨** | 게이트웨이·클라이언트·채널 셋이 같은 프레임 모양 위에 서야 하고, M2(계약)가 M3~M5 의 전제다. 프레임 계약이 확정되기 전에 소비자를 병렬로 고치면 세 파일이 서로 다른 모양을 가정한다 |
| `fanout` | 미선택 | 병렬 스폰이 «같은 프레임 계약» 이라는 이 SPEC 의 축을 깬다. 조사 단계(읽기 전용)는 이미 끝났다 |
| `sweep` | 미선택 | 균일 기계 변형이 아니다 — `gateway.ts` 는 빈 파일에서 다시 쓴다 |

**Decision: serial**

근거: 이 SPEC 을 하나로 묶은 이유 자체가 «세 파일이 같은 프레임 모양 위에 서야 한다» 는 것이다(가이드 §2 도입부). M2 가 계약을 확정하기 전에는 M3~M5 를 시작할 수 없고, M1(표)은 그보다도 앞선다. 병렬화 이득이 있는 자리는 M6(테스트 정리)뿐인데 그 자리는 앞 마일스톤 전부의 착지 뒤에 온다.

### §F.2 감사 상한

- **plan 감사**: 통과까지. FAIL 이면 차단 항목만 고쳐 재감사.
- **sync 감사**: **2회차 상한** (가이드 §2 A-3). FAIL 이면 차단 항목만 고치고 2회차에서 닫는다 — 3회차 이상 돌리지 않는다.
