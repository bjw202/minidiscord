# SPEC-E2E-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t6` (ROADMAP M6, 운영자 축소 범위)
- 워크트리: `.claude/worktrees/t6` · 브랜치 `WT-e2e-persist-readme` · 기준 `2a19d7d`
- 산출물: `spec.md` · `plan.md` · `acceptance.md` · `progress.md` (Tier M)
- **판 v0.3.1 — 3회차 델타 감사(PASS 0.911) 이후의 마지막 정리 라운드.** 보고: `.moai/reports/t6/plan-revision-3.md`
- **4회차 감사는 없다** — 재감사 계약 상한 3회 도달 · 판정 PASS · 범위가 `spec.md` §7.3 한 표로 한정 · 리드 결정

### 감사 궤적과 점수 귀속

| 회차 | 판정 | 대상 트리 | 보고 |
|---|---|---|---|
| 1차 | **FAIL 0.67** (임계 0.80) | v0.1.0 | `plan-audit.md` |
| 개정 1차 | 차단 10건 전건 처리 | → v0.2.0 | `plan-revision-1.md` |
| 2차 (델타) | **PASS 0.829** — 얇은 통과(+0.03) · 감사관 자기 공시 | **v0.2.0** | `plan-audit-2.md` |
| 개정 2차 (정리) | 차단 4건 전건 수정 | → **v0.3.0** | `plan-revision-2.md` |
| 3차 (델타) | **PASS 0.911** — 여유 있는 통과(한 등급으로도 두 차원 동시로도 안 뒤집힘) · 차단 **0건** | **v0.3.0** | `plan-audit-3.md` |
| 개정 3차 (마지막 정리) | P-01~P-05 수정 · P-06 run 이월 · **AC/REQ/Tier 무변경** | → **v0.3.1** | `plan-revision-3.md` |

> **[HARD] `0.911` 은 v0.3.0 트리 값이고, 이 정리 이후 트리는 재채점되지 않는다.** 정리 내용은 **§7.3 증거 칸 정정 · AC/REQ/Tier 무변경**이며, 사후 검증은 **리드의 기계 확인(grep 표본)이고 재점수가 아니다.** 「정리 이후 트리가 0.911 을 받았다」로 읽히는 문장을 쓰지 않는다. 이전 회차도 같은 규칙 — **0.829 는 v0.2.0**, **0.67 은 v0.1.0** 트리 값이다.

### 개수·상태 (실행 확인)

- 요구사항 16 · 수용 기준 16 — **세 판 모두 변동 없음** (Tier M 상한 16/16)
  - `grep -c '^- \*\*REQ-E2E-' spec.md` → `16`
  - `grep -c '^### AC-E2E-' acceptance.md` → `16`
  - `grep -c '^### Out of Scope — ' spec.md` → `6`
- `grep -m1 '^version:' spec.md` → `version: "0.3.1"` · `grep -m1 '^status:' spec.md` → `status: draft`
- SPEC ID 정규식: `[[ "SPEC-E2E-001" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` → `PASS`

### 정리 라운드가 세운 자기 검사 (DoD 6·7항)

| 검사 | 명령 | 값 |
|---|---|---|
| 기준선 변수 잔존 | `grep '^- 측정' acceptance.md \| grep -c 'BASE'` | `0` (측정 줄 총 `34`) |
| 면제된 주장 수 | `grep -rE "<금지어>" README.md .moai/specs/SPEC-E2E-001/ \| grep -c 'AC-016-EXEMPT'` | `7` (편집 불변 확인) |
| 면제 우회 통로 | `grep -rc 'AC-016-EXEMPT' README.md` | `README.md:0` |
| 금지어 주장 부재 | 위 패턴 `\| grep -v 'AC-016-EXEMPT'` | `exit=1` |
| **§7.3 명제 축 — 옛 형태** | `grep -n "어긋나지 않" spec.md plan.md acceptance.md \| grep -vc 'SWEEP-ROW'` | `1` |
| **§7.3 명제 축 — 선언 자리** | `grep -n "종결 정의\|종결 조건" spec.md \| grep -vc 'SWEEP-ROW'` | `3` |
| **§7.3 값 축 — 옛 표지 폭** | `grep -rn '/13\]' .moai/specs/SPEC-E2E-001/ \| wc -l` | `0` |

> **[HARD] 위 세 행은 개정 3차의 모든 편집(HISTORY 0.3.1 추가·[HARD] 문단 추가·앵커 재작성) 뒤에 다시 돌린 값이다** — 표가 자기를 세지 않음을 실행으로 확인했다. 값 축·명제 축 모두 **제외가 명령 안에** 있다.

### 리드 확정 사항

| 항목 | 결정 |
|---|---|
| **D5** README 「내 PC」 소유 | **t26 확정** (리드 결정). 정본 인용은 레인 직독 대조로 확인 — 2회차 감사의 「최대 미검증」을 메웠다 |
| **D-01 기제 반박** | **수용** — 감사관이 자기 1회차 처방을 철회 |
| **N-04 문언** | 리드가 형태 지정: «트리거는 t6, 「내 PC」 문구는 t26 이월 · 과도기 공시» |
| **N-06·N-07** | 고치지 않음 — REQ 상한 제약의 대가로 판정, 제약이 풀릴 때 처리 |
| D1·D2·D3·D4 | 잠정 선택 유지 (M1 착수 전 확인) |

- 커밋하지 않음 · `status: draft` 유지 · 회차별 감사 보고서는 덮어쓰지 않고 파일을 나눈다

_다음: 3회차 델타 감사(N-01~N-04 범위) → Kickoff 승인 → run 진입_

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
