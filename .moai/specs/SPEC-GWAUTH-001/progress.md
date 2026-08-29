# SPEC-GWAUTH-001 진행 기록

| 항목 | 값 |
|---|---|
| 카드 | `t15` |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 현재 상태 | `draft` v0.4.0 — 3회차 감사 PASS 후 한정 교정(R-01~R-04·R-06·R-07) + §B-0 전역 재도출 절차 신설·실행 완료 |
| 감사 궤적 | 1회차 **FAIL 0.67** → v0.2.0 → 2회차 **PASS 0.89** → v0.3.0 → 3회차 `plan-audit-3.md` **PASS 0.84**(계약 개정 8자리가 범위에 들어오며 신규 7건 중 5건이 새 범위에서만 발생) → v0.4.0. 감사 §7-1 권고에 따라 **4회차 전체 재감사 없이** 한정 교정 후 run 진입 |
| 인계 출처 | `SPEC-CHANAUTH-001` v0.4.0 §5 «카드 `t15` 소유» |
| base 실측 | `npm test` → 250/250 초록 (server 180 · channel 70), 2026-08-29 이 워크트리에서 실행 |
| spec_base_sha | _<`plan.md` §C 사전 점검이 run 착수 시점에 기록>_ |

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-29
tier: M
requirements: 13      # REQ-GWAUTH-001..013 (v0.2.0 에서 개수·내용 무변경)
acceptance: 15        # AC-GWAUTH-001..015 (v0.2.0 에서 015 신설 — 1회차 감사 C-04)
open_questions: 0
blocking_before_run: 0   # B-1·B-2 는 D3=(a) 로 plan 단계에서 해소. 남은 §B 항목은 기록/sync 인계뿐
sibling_contracts_amended:
  - "SPEC-CHANCLIENT-001 v0.5.0 → v0.6.0 — 7자리 (REQ-001 :117 · REQ-003 :127 · 필드열거 :129 · 타입선언 :92 · 흐름도 :42 · 용어표 :62 · §4.2 머리주석 · §5 :230)"
  - "SPEC-GATEWAY-001 v0.3.0 → v0.4.0 — 1자리 (REQ-GW-001 welcome 필드 열거)"
  - "SPEC-CHANINJECT-001 v0.3.2 → v0.3.3 — HISTORY 자기정정 (2회차 N-01) + 계수 사본 제거 (3회차 R-04)"
  - "SPEC-CHANCLIENT-001 v0.6.0 → v0.6.1 — onWelcome 선언에 type·missed_after_id 추가, proof? 근거 정정 (3회차 R-07)"
  - "SPEC-CHANPERM-001 v0.5.0 → v0.6.0 — 하네스 명세 주석 (3회차 R-06, M4 코드와 짝)"
  - "SPEC-CHANWIRE-001 v0.4.0 → v0.5.0 — 하네스 명세 주석 + AC-014 Then 2번 주 (3회차 R-06)"
  - "SPEC-CHANNEL-001 v0.3.0 → v0.4.0 — §5 hello 필드 열거 (3회차 R-06)"
  amended_sibling_specs: 6
  r06_site_count: "4는 하한이지 개수가 아니다 — 감사도 통독 없이 welcome/hello grep 만 했다"
  measured_total: 8   # 리드 초기 보고 4 · 레인 실측 7+ · 실제 개정 8 (:230 이 여덟 번째, 운영자 판정으로 C→B)
audit_round_3:
  report: ".moai/reports/t15/plan-audit-3.md"
  verdict: "PASS 0.84 (Tier M 임계 0.80)"
  findings: "R-01~R-06 (Medium, blocking) · R-07 (Low)"
  disposition: "R-01·R-02·R-03·R-04·R-06·R-07 처리. R-05 는 운영자 결정 D4 에 걸려 상위 회부 — 이 라운드 범위 밖"
  root_cause_fix: "plan.md §B-0 [HARD] «정정 후 전역 재도출» 상시 절차 신설 + 이 라운드 마지막에 .moai/specs + .moai/reports/t15 트리 전체에 실행"
  sweep_result: "정지 8자리 발견 — CHANCLIENT 7(내 v0.6.1 HISTORY 행이 밀었다) + CHANWIRE acceptance :507→:509(내 주석 삽입). 다섯 라운드 연속 재현이며, 그중 둘은 내 편집이 남의 카드 문서(CHANINJECT:157 · ROOMAUTHZ:295)의 인용을 깨뜨린 것으로 파일 단위 훑기로는 원리상 잡히지 않는다"
audit_round_2:
  report: ".moai/reports/t15/plan-audit-2.md"
  verdict: "PASS 0.89 (Tier M 임계 0.80)"
  findings: "N-01·N-02·N-03 (Medium, blocking) · N-04·N-05·N-06 (Low)"
  disposition: "6건 전건 처리 — 상세는 spec.md HISTORY v0.3.0"
  rebuttals_upheld: "1회차의 내 반박 셋 전부 인용됨 (§7 무근거 인용 · F-A8 계수 · 44/36 질의 차이)"
  auditor_self_correction: "1회차 §2.6 의 «44줄» 은 실행되지 않은 명령의 출력으로 인용된 값이었고 감사가 철회했다 — 1회차 보고서를 참조할 때 함께 읽어야 한다"
audit_round_1:
  report: ".moai/reports/t15/plan-audit.md"
  verdict: "FAIL 0.67 (Tier M 임계 0.80)"
  findings: "Critical 4 (C-01..C-04) · High 2 (H-01·H-02) · Medium 5 (M-01..M-05) · Low 5 (L-01..L-05)"
  disposition: "차단 11건 전건 처리 + optional 5건 전건 처리. 상세는 spec.md HISTORY v0.2.0"
  auditor_error_found: "감사 §3 C-03 이 정정 대상으로 든 «spec.md §7» 에는 경계 진술이 없다 — 실제 자리는 §1.3·§2.2·§5 와 plan.md §G 이고 그 넷을 고쳤다"
operator_decisions:
  - "D1 (2026-08-29): server/ 변경 허용 — 논스+HMAC 상호 핸드셰이크"
  - "D2 (2026-08-29): 토큰 유출·손상된 서버는 범위 밖. 과장 금지 (spec.md §5)"
sibling_amendments_made:
  - "SPEC-CHANAUTH-001 v0.5.0 — §5 인계 절이 SPEC-GWAUTH-001 과 REQ 번호를 가리키게 개정"
  - "SPEC-CHANINJECT-001 v0.3.2 — §5:466 인계 절 동일 개정"
sibling_amendments_required_but_not_made:
  - "SPEC-CHANCLIENT-001 REQ-001·003·§4.2 주석 (계약 충돌 — plan.md §B-1)"
  - "SPEC-GATEWAY-001 REQ-GW-001 welcome 필드 열거 (plan.md §B-2)"
not_amended_by_decision:
  - "SPEC-CHANAUTH-001 §2.1·§1 세 겹 표·REQ-CHANAUTH-002 — completed SPEC 의 정직성 조항, 소급 수정 금지 (spec.md §3.3 C 부류)"
  - "REQ-CHANAUTH-013 · REQ-CHANINJECT-015 — 자기 SPEC 만 구속하므로 예외 조항 불필요 (spec.md §3.4)"
```

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
