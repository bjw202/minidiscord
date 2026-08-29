# SPEC-COVERAGE-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-COVERAGE-001` |
| 칸반 카드 | `t13` |
| Tier | S — 산출물 계약에서 **의도적으로 이탈**했다(아래) |
| 워크트리 | `.claude/worktrees/t13` (브랜치 `WT-coverage-tool`) |
| 선행 SPEC | 없음 |
| 요구사항 / 수용 기준 | 7 / 6 |

**Tier S 산출물 계약과의 차이 (명시 이탈).** `.claude/rules/moai/workflow/spec-workflow.md` § SPEC Complexity Tier 의 표는 Tier S 를 **2파일**(`spec.md` + `plan.md`, AC 는 `spec.md` §3 에 인라인)로 정한다. 이 SPEC 은 `acceptance.md` 를 별도 파일로 두어 **3파일**(+ 모든 Tier 공통인 `progress.md`)로 냈다. 사유는 형제 SPEC(`SPEC-CHANNEL-001` 계열)이 전부 별도 `acceptance.md` 를 쓰고 있어 한 저장소 안에서 읽는 자리가 갈리지 않게 하기 위해서다. 같은 규칙의 REQ/AC 상한(Tier S = 8 / 8)은 지켰다 — 이 SPEC 은 7 / 6 이다.

---

## §E.1 Plan-phase Audit-Ready Signal

| 항목 | 값 |
|------|-----|
| 작성 단계 | plan (manager-spec) |
| 산출물 | `spec.md`, `plan.md`, `acceptance.md`, `progress.md` |
| SPEC ID 정규식 검사 | `PASS` (`ID="SPEC-COVERAGE-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` 실행 결과 `PASS`) |
| 운영자 결정 반영 | D1(임계 강제·라인 85) → REQ-COVERAGE-004 · D2(server 한정, 루트 합산 없음, channel 무변경) → REQ-COVERAGE-007 |
| 기준선 실측 출처 | 오케스트레이터가 이 워크트리에서 실행 (`spec.md` §3). plan 단계는 재측정하지 않고 그 값을 인용했다 |
| plan 단계 자체 실측 | `npm ls @vitest/coverage-v8 -w server --depth=0` → `EXIT=1` · `-w channel --depth=0` → `EXIT=0` · `-w server`(depth 제한 없음) → `EXIT=0` (`plan.md` §D 2) |
| 열린 질문 | 없음 — 회귀 짝 파일 추가는 리드 판정으로 **승인**됐다 (2026-08-29. 기록은 `spec.md` §4.5, 대안 비교는 `plan.md` §D 1) |
| plan 감사 반영 | 1회차 감사(`.moai/reports/t13/plan-audit.md`, FAIL 0.62) 의 차단 7건(F-01..F-07)과 비차단 8건(N-01..N-08)을 반영해 네 산출물을 개정했다(v0.1.1). 이어 2회차 감사(`.moai/reports/t13/plan-audit-2.md`, **PASS 0.88**, 궤적 0.62→0.88, 1회차 15건 전부 종결)의 차단 2건(NEW-01 명령 형태 · NEW-02 공허한 관측)과 비차단 1건(NEW-03 선례 인용)을 반영해 다시 개정했다(v0.1.2). NEW-01 교정으로 1회차 N-07 의 «부분» 종결도 닫혔다 |
| REQ↔AC 매핑표 | 아래 표 |

### REQ↔AC 매핑표

| REQ | 매핑 AC | 비고 |
|-----|---------|------|
| REQ-COVERAGE-001 (의존성 선언 + 메이저 대역) | AC-001, AC-004(단언 1, **단언 6**) | `--depth=0` 이 우연한 해결과 직접 선언을 가른다. 대역 조항은 단언 6 + `^3.0.0` 변이가 잰다 |
| REQ-COVERAGE-002 (제공자·측정 대상·**리포터**) | AC-002, AC-004(단언 3, **단언 3b**) | 리포터 조항이 없으면 AC-002 가 읽을 파일이 만들어지지 않는다 |
| REQ-COVERAGE-003 (`coverage` 스크립트) | AC-002, AC-004(단언 2) | |
| REQ-COVERAGE-004 (임계 강제) | AC-003, AC-004(단언 4) | AC-003 은 **설정 파일의** 임계를 임시 변경해 게이트에 이빨이 있는지 직접 관측한다 |
| REQ-COVERAGE-005 (진입점 미제외 + 사유 주석) | AC-002(`HAS_INDEX`·`FILE_COUNT`), AC-004(단언 5, **단언 7**) | 주석 조항은 값으로 읽을 수 없어 단언 7 이 문자열 검사 금지의 명시 예외로 잰다 |
| REQ-COVERAGE-006 (회귀 짝) | AC-004 | 리드 승인으로 확정 — 조건부 아님 |
| REQ-COVERAGE-007 (범위 경계) | AC-005 | 변경 파일 목록은 추적 ∪ 미추적 합집합에서 `.moai/` 를 뺀 것 |
| — (매핑 없음: 절차 관측) | AC-006 | **의도적 무매핑.** RED→GREEN 전이는 완성된 시스템의 성질이 아니라 run 단계가 결함을 지나왔다는 관측이다. 사유 전문은 `acceptance.md` AC-COVERAGE-006 절 머리말 |

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
