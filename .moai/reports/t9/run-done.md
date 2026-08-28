# SPEC-CHANAUTH-001 run 완료 보고 (카드 t9)

| 항목 | 값 |
|------|-----|
| 대상 | `SPEC-CHANAUTH-001` — 채널 전송 계층 방어(welcome 게이트 · 비루프백 wss 강제 · 발신 id 집합 대조) |
| 브랜치 · 워크트리 | `WT-chanperm-gate` · `.claude/worktrees/t9` (미푸시 — 이 워크트리가 유일 사본) |
| 기준 → 최종 | `7bbecc3` (plan 종료) → `7f83c43` (M3) + 마감 증거 커밋 |
| 마일스톤 커밋 | M1 `0b52b96` · M2 `e511dbc` · M3 `7f83c43` — 전부 pre-commit 훅 통과, 우회 미사용 |
| 최종 스위트 | **61/61 통과** (channel, run 레인 직접 재측정, exit 0) · typecheck exit 0 |
| 커버리지 | stmts **93.75%** (게이트 ≥85%; index.ts 진입점 블록은 AC-CHANAUTH-011 자식 프로세스 기준으로 별도 관측) |
| 변이 | A·B·D·E·F·G·H 표 일치·전건 되돌림. **C 는 실측 `{003(나)}` — 표 예상과 달라 문서 수정 없이 보고만(§11.2)** |
| 범위 증명 | base..HEAD = 8 파일(channel src 3 + test 3 + progress.md + spec.md frontmatter 1행). `server/`·`web/`·`CHANGELOG.md` diff **빈 출력** |
| 증거 본문 | `progress.md` §E.2 (M1/M2/M3 + run 마감 검증) · §E.3 (Run-phase Audit-Ready Signal) |

---

## 1. 주장 (Claim)

plan.md §F 의 세 마일스톤이 지시 순서대로 구현·측정·커밋됐고, 관측 순서가 증거인 세 자리(M1 단계 1b 형제 7건, M3 단계 1.3 개정 전 형제 5건, F-01 프로브 수정 전/후 짝)가 전부 개정·구현 **이전/이후** 원문으로 §E.2 에 남아 있다. AC-CHANAUTH-001..013 전부 통과.

## 2. 증거 (Evidence) — §E.2 요약

- **M1 — welcome 게이트.** RED 4건 단언 실패(001·003(가)·004·005, 002 통과) → 형제 스위트 초록 확인 → 게이트 구현 → 형제 **정확히 7건** 실패 관측(spec.md §3.2 목록 일치) → `autoWelcome`+개정본 → GREEN. 변이 A `{001,003(가),004,005}` · B `{004}` 표 일치. helloAgain() 전제(§11.4)는 AC-003 (나) 통과로 **첫 실측에서 일치 확인**.
- **M2 — wss 강제.** RED 두 사유 구분 기록(010 미수출 TypeError / 011(a) 단언 실패) → `isTransportAllowed` 내보내기(resolveUrl 밖, §D 준수) → 빌드 뒤 자식 프로세스 관측 → 형제 ✓ 4건 + 셸 프로브 3건 원문. 변이 F `{011}` · G `{010}` · H `{010}` 표 일치. `pgrep` 잔존 0.
- **M3 — 발신 집합.** 기존 계약을 건드리지 않은 채 CHANAUTH-006..009 추가 RED(006·008·009 실패, 007 통과) → 게이트 구현 직후 **개정 전 CHANPERM 5건 동시 실패 관측**(v0.1.0 예상은 1건, 5건이 정답 — C-02) → 그 뒤 v0.4.0 교체 → GREEN. 변이 D `{006,008,009,CHANPERM-008}` · E `{CHANPERM-008,CHANAUTH-008}` 표 일치. AC-CHANAUTH-012 네 명령 원문(커밋 후 재실행: channel/src 정확히 3파일).
- **run 마감 검증 (run 레인 직접).** 최종 전체 스위트 61/61(exit 0, 로그 `.moai/state/verify/t9-run/final-verbose.txt`) · **F-01 프로브 수정 후 재실행 `P6_VERDICTS=[] P6_NOTIFICATIONS=[]`**(수정 전 재현 원문과 짝 — §G 요건 완성) · §G 체크리스트 13항 처분표.

## 3. 기준선 귀속 (Baseline-attribution)

모든 측정은 이 run, 이 트리(`.claude/worktrees/t9`, `WT-chanperm-gate`)에서 수행됐다. 마일스톤 증거의 HEAD 귀속: M1 `7bbecc3→0b52b96`, M2 `0b52b96→e511dbc`, M3 `e511dbc→7f83c43`, 마감 검증 `7f83c43`. 이 SPEC 의 테스트는 run 이전에 **단 한 번도 실행된 적이 없다**(plan 3라운드 전부 소스 대조 예측) — 본 보고의 모든 "실패한다/통과한다"는 첫 실측값이다.

## 4. 미검증 (Gaps) — 후속 판정 대기

1. **변이 C 실측 어긋남 (후속 판정 필요).** 실측 `{003(나)}` + 런 수준 uncaught 4건 — 변이표 C 행 예상은 `{005}`±`{003(나)}`였고 **005 는 실패하지 않았다**(throw 는 소켓을 끊지 않고 수신 루프만 죽인다). §11.2 대로 문서를 고치지 않고 원문만 남겼다. acceptance.md 변이표 C 행·F-07 교정 문언의 개정 여부 판정은 **sync 단계(또는 manager-spec)** 의 몫이다.
2. **§E.1 REQ→AC 매핑 표 부재.** §G 요건이나 §E.1 은 plan 단계 산출물이라 run 이 편집하지 않았다. 매핑 실체는 spec.md 본문 각 REQ 의 관측 자리 문장. sync 에서 manager-spec 보충 권고.
3. **감사 F-02·F-03·F-04·F-14 잔존** (§E.2 M3 Gaps).
4. **L-01 sync 인계** — `CHANGELOG.md:15`·`:41` 개정 전 무상태 문언(manager-docs 소유).

## 5. 잔여 위험 (Residual-risk)

- **F-01 의 절반은 열려 있다.** welcome 을 지어낼 수 있는 상대의 사칭 채팅 주입(`message{delivery:'to'}`)과 이력 오염(`history_response`)은 이 카드 어느 겹에도 걸리지 않으며 **카드 `t15` 가 소유한다. 이 카드를 "F-01 을 닫았다"로 보고해서는 안 된다.**
- 128 상한의 실사용 분포 미검증(spec REQ-CHANAUTH-008 근거). 브랜치 미푸시 — 원격 CI 확인은 리드 통합 단계 소관. AC-CHANAUTH-011(a) 절반은 `localhost.example.test` NXDOMAIN 해석에 의존.

---

_작성: run 레인 · 기준 커밋 `7bbecc3` → 최종 `7f83c43` + 마감 증거 · 진입 근거: 리드 디스패치(운영자 카드 pick + plan 3라운드·운영자 최종 처분 plan-done-4)_
