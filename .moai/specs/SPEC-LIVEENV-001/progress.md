# SPEC-LIVEENV-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t35` (Class C — plan 필요)
- 작성: manager-spec, 2026-09-06, 워크트리 `.claude/worktrees/t35`
- 산출: `spec.md` · `plan.md` · `acceptance.md` · `progress.md` (Tier M, 4종)
- 요구사항 16건 ↔ 수용 기준 16건 (1:1)
- SPEC ID 정규식 검사: `SPEC-LIVEENV-001` → `PASS` (bash 실행 확인)
- 이름 충돌 검사: `.moai/specs/SPEC-LIVEENV-001` 부재 · `grep -rl "SPEC-LIVEENV" .moai/specs/` → 0
- 실측으로 딛는 전제: `spec.md` §1.2 의 F-1~F-12 **열두 건**
- 열린 물음: **0건.** v0.1.0 의 `[NEEDS CLARIFICATION]` 넷은 전부 닫혔다(v0.2.0).
  1. `status` 의 `principal` 축 (M1) — **리드 처분: 두 면을 함께 읽는다**(`api=` + `conn=`). 세 자리를 동시에 고쳤다: `spec.md` REQ-003 ㉢ · `acceptance.md` AC-003 · `plan.md` M1
  2. 토큰 파일 위치 (M2) — **리드 처분: `data/live-env/token`, 권한 `0600`**. `.gitignore` 편집 불필요(실측 `git check-ignore -v` → `.gitignore:2:data/` · `exit=0`)
  3. 봇 작업 디렉터리 (M3) — **리드 처분: `<wt>/bot-01`**(워크트리 안). `.gitignore` 에 `bot-01/` 한 줄이 필요하다(실측 `git check-ignore` → `exit=1`)
  4. 저장소 밖 디렉터리의 `.mcp.json` 적재 (M3) — **결정이 아니라 사실이었으므로 plan 단계에서 실측했다**(F-12). **적재된다** → `--mcp-config` 대안 분기 제거. 그리고 **첫 사용에 사람 승인**(`⏸ Pending approval`)이 붙는다는 사실이 함께 나와, 카드가 셋이라 적은 사람 손이 **넷**임이 드러났다
- **1회차 plan 감사(FAIL 0.74 / 통과선 0.80) 수리 완료 — v0.2.0.** 차단 12건 대응, 참고 3건 처분. 요구사항 16 · 수용 기준 16 불변(추가 없이 기존 항목 안에서 수리).
- 이 SPEC 은 `SPEC-LIVEVERIFY-001`(completed) 과 `SPEC-E2E-001`(completed) 을 **편집하지 않는다**. 두 울타리를 `AC-LIVEENV-015`·`AC-LIVEENV-016` 이 잰다. 1·2회차 수리 중 두 SPEC 은 **읽기만 했다**.
- **2회차 plan 감사(PASS 0.834 / 통과선 0.80) 권고 정리 완료 — v0.3.0.** 판정은 이미 통과였고 이 회차는 마무리다. 차단 권고 6건(B-1~B-6)·참고 5건(A-1~A-5) 전부 처분했고, **감사가 이름대지 않은 자리 하나를 더 닫았다**(DoD 3 의 대조군 목록에 `AC-006` 누락 — 여섯 → 여덟). 새 리드 처분을 요구하는 항목은 없었다. 요구사항 16 · 수용 기준 16 불변.
- **run 단계로 넘기는 미결 4건은 `plan.md` §E-1 표가 진다** — `status --unmeasured-paths` 의 실제 줄 수(G-1) · 변이 여섯의 실효성(G-2) · 엣지 케이스 셋의 성립 절차(G-3) · `invite` 출력 순서(G-4). 넷 다 스크립트가 없어 plan 단계에서 잴 수 없었고, **각 행이 그것을 닫는 run 단계 증거 파일을 지목한다.** 미관측을 통과로 옮기지 않는다.

## §E.2 Run-phase Evidence

_<run 단계 대기>_

## §E.3 Run-phase Audit-Ready Signal

_<run 단계 대기>_

## §E.4 Sync-phase Audit-Ready Signal

_<sync 단계 대기>_
