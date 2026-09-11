# SPEC-WEBUI-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC | SPEC-WEBUI-001 |
| Tier | M |
| 상태 | draft |
| 방법론 | tdd |

---

## §E.1 Plan-phase Audit-Ready Signal

plan 단계 산출물 넷 + 감사 보고서 둘. **1회차 FAIL(0.52) → 2회차 CONDITIONAL PASS(0.80) → 이 기록은 2회차 조건 넷을 닫은 뒤의 상태다.**

| 항목 | 값 |
|------|-----|
| 요구사항 | 16 (Tier M 상한 16) — 두 교정 라운드에서 **한 번도 늘거나 줄지 않았다** |
| 수용 기준 | 16 (Tier M 상한 16) — 같음. 늘어난 것은 기준의 **단언 수**뿐이다 |
| 감사 1회차 | FAIL 0.52 · `plan-audit.md` — blocking 12 (F1~F12). **전부 닫힌 것으로 2회차가 검증** |
| 감사 2회차 | CONDITIONAL PASS 0.80 · `plan-audit-2.md` — 교정이 만든 새 blocking 4 (N1~N4) + optional 5 |
| 이번 라운드에 닫은 것 | N1·N2·N3·N4 (조건 넷) + M0 의 `expect` import 누락 + N5·N6·N7·N8·N9 + F15 잔여 |
| 가장 중요했던 것 | **N3** — `cssRuleBlock` 이 **첫 매치**를 돌려주는데 §B.6 은 새 선언을 파일 **끝**으로 보냈다. 기존 선택자 셋(`.room-item`·`.room-item.active`·`.archive-btn`)에서 **올바른 구현이 붉어질** 상태였다. 1회차 F3 과 같은 형태이며 원인만 이스케이프에서 매치 순서로 옮겨 갔다 |
| 미결 표시 | 0 |
| 승인된 범위 확장 | `GET /api/auth/me` 1건 (`spec.md` §4.5) |
| 서버 변경 | `server/src/auth.ts` — 라우트 등록 한 곳 + 거짓이 된 `@MX:NOTE` 되쓰기. `requireAuth` 본문 불변 |
| 계약 개정 | 2 (`spec.md` §5). 되쓰기 대상은 **넷** (`web/app.js` 둘 + `server/src/auth.ts` + `server/test/auth-name.test.ts`) |
| Tier | **M 유지** — 파일 9개(공유 헬퍼 포함)·약 600~700 LOC. 2회차 감사도 M 에 동의. 재판정 근거와 Tier L 전환 조건은 `plan.md` §B.8 |
| 마일스톤 | 6 (M0 시험 골격 정비 → M1 메시지 → M2 사이드바 → M3 라우트·배선 → M4 작성기 → M5 마감) |

**부류 단위로 훑은 결과** — 감사가 지목한 인스턴스만 고치지 않고 각 결함의 부류를 기계적으로 훑었다: 선언 중복 0건(**25개** ts 블록 전수 파싱), 타입 미주석 콜백 0건, 널 역참조 0건, `^//` 앵커 0건, 기대값 0 인 맨 `grep -c` 0건, 행 번호 인용 0건. `cssRuleBlock` 대상 선택자 **열넷**(고유 기준)을 전부 `style.css` 와 대조해 기존 규칙 블록이 있는 일곱을 가려냈고, 그중 이 SPEC 이 **고치는 다섯**(선언 추가 넷 + 삭제 하나)을 §B.6 의 제자리 편집 대상으로 못 박았다.

**모집단 수 정정 (3회차 감사 D5).** 위 세 수는 2회차 교정 «도중» 에 잰 값이 그대로 남아 있던 것이다 — 그 뒤 `css-rule.ts` 모듈 예시 블록과 `#new-room-btn, #new-bot-btn` 선택자를 더하면서 24→25, 열셋→열넷으로 늘었고, `plan.md` 에 맨 행 번호 인용 둘이 남아 있었다(이번에 grep 앵커로 바꿨다). **결론(각 부류 잔존 0건)은 그대로이고 모집단 크기만 틀렸다.**

**4회차 재감사 (run-gate 재실행).** 3회차 PASS(1.00) 뒤 0.4.1·0.4.2 두 편집 라운드로 plan-artifact hash 가 바뀌어 skip 조건(③ 산출물 무변경)이 깨졌고, run 게이트 계약에 따라 재감사를 실행했다.

- audit_verdict: PASS
- audit_report: .moai/specs/SPEC-WEBUI-001/plan-audit-4.md
- audit_at: 2026-09-11T00:35:58Z
- auditor_version: plan-auditor (run-gate 재실행 — 3회차 PASS 후 산출물 0.4.1·0.4.2 편집)
- audit_score: 1.00 (Clarity 1.00 · Completeness 1.00 · Testability 1.00 · Traceability 1.00; Tier M 통과선 0.80; must-pass 7/7)
- plan_artifact_hash: e4cd2f0108a388e84b46b3aebecf6cffff3577366a6471f024a900311192fffd
- depends_on 확인 (오케스트레이터 직접 관측): SPEC-WEBSHELL-001 `completed` · SPEC-WEBCHAT-001 `completed` · SPEC-AUTH-001 은 보관용 단일 파일(`SPEC-AUTH-001.md`)로 `status:` 필드 없음 — 미충족 판정, R4-1 블로커로 사용자 처분 대기
- optional_findings: R4-1 (depends_on pre-flight 블로커) · R4-2 (HISTORY 남은 `^//` 셈 표기 — 방치 권고) · R4-3 (§3 requireAuth 출처 표기 부정확 — 방치 가능)

## §E.2 Run-phase Evidence

_<pending run-phase>_

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
