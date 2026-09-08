# SPEC-E2ESCEN-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-E2ESCEN-001` |
| Tier | M (spec.md + plan.md + acceptance.md; research.md 를 함께 둔다) |
| 선행 SPEC | `SPEC-BOTMODEL-001`·`SPEC-MSG-001`·`SPEC-SSE-001`·`SPEC-PERM-001`·`SPEC-MENTION-001` (전부 completed) |
| 관련 SPEC | (없음 — `SPEC-CHANCLIENT-001`·`SPEC-GATEWAY-001` 은 BOTMODEL-001 로 대체된 스텁, `spec.md` §8) |
| 손대는 파일 | `scripts/e2e-lib.mts`(신설) · `scripts/e2e.mts` · `scripts/e2e-scenario.mts`(신설) · `package.json` · `server/test/e2e-lib.test.ts`(신설) · `ROADMAP.md`(sync) |
| 개발 방식 | TDD — M1 이 RED (`quality.yaml` `development_mode: tdd`) |
| 현재 상태 | `in-progress` — plan 감사 1회차 FAIL 0.75 → v0.2.0 · 2회차 CONDITIONAL PASS 0.857 → v0.3.0(`.moai/reports/e2escen/plan-audit.md`); run 단계 M1 착수 |
| spec_base_sha | `66267ca` — plan 단계 작성 시점 HEAD. **행 번호 인용의 닻으로만 쓴다** (diff 기준이 아니다) |
| run_base_sha | `d98ad7b` — run 단계 첫 행동으로 `git rev-parse --short HEAD` 를 읽어 적었다 (AC-014·DoD·`plan.md` §D 의 diff 기준) |

---

## §E.1 Plan-phase Audit-Ready Signal

- plan_complete_at: 2026-09-08T15:10:00+09:00
- plan_status: audit-ready
- plan_audit: `.moai/reports/e2escen/plan-audit.md` — 1회차 FAIL 0.75 → v0.2.0 교정(D1~D13 + 운영자 결정 «CI 포함 안 함») → 2회차 CONDITIONAL PASS 0.857(Tier M 통과선 0.80) → 조건 R2-1~R2-4 를 v0.3.0 에서 착지
- verified_by_orchestrator: `moai spec lint` → «No findings»; REQ 16 / AC 15 / NEEDS CLARIFICATION 0 / version 0.3.0; R2-1(speaker A 499·배치 한 문장)·R2-2(초 넘김 pollUntil 1,100 ms)·R2-3(run_base_sha 기준)·R2-4(`\<await `) 를 grep 으로 직접 확인 (HEAD d98ad7b)

---

## §E.2 Run-phase Evidence

- run_base_sha: `d98ad7b` (`git rev-parse --short HEAD`, run 단계 첫 행동)
- 증거 디렉터리: `.moai/state/verify/e2escen/`

_(M2~M6 진행 중 — 마일스톤이 끝날 때마다 이 절에 원문 증거를 덧붙인다)_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
