# t22 sync 단계 보고 — SPEC-GWAUTH-002, 감사 3회차 PASS 0.854

카드 `t22` — 게이트웨이 상호 인증 v2. sync 단계가 끝났다. 본 보고는 **초안**이며 커밋은 리드 게이트의 몫이다.

- 워크트리 `.claude/worktrees/t22` · 브랜치 `WT-gateway-mutual-auth` · HEAD `bc265a4` · **sync 편집 12건 전부 미커밋**
- 감사 궤적: **1회차 FAIL 0.836 → 2회차 FAIL 0.8216 → 3회차 PASS 0.854** (통과선 Tier L 0.85)
- 보고서: `sync-audit.md` · `sync-audit-2.md` · `sync-audit-3.md` · 증거 원문 `.moai/state/verify/t22-sync/` · `.moai/state/verify/t22-audit3/`

---

## 1. 주장 (Claim)

1. **sync 감사가 통과했다** — 3회차 PASS 0.854, 차단 발견 0건, must-pass(Functionality 0.90 · Security 0.86) 통과.
2. **문서 동기화가 착지했다** — `CHANGELOG.md` t22 항목 신설 + 과거 절 교체 공시 7건, `README.md` 낡은 현재 상태 서술 6자리 정정, `t23` 배포 경고 4자리.
3. **형제 SPEC(SPEC-CHANCLIENT-001) 본문이 v2 로 갱신됐다** — `spec.md` 6자리 + `acceptance.md` 하네스 절·시나리오 본문. 날짜 박힌 정정 기록은 보존하고 덧붙였다.
4. **감사가 잡은 결함 4건이 닫혔다** — F1·F3(1회차), R1·R2(2회차). 3회차 비차단 F-11 도 판정 후 닫았다.
5. **상태 전이는 `implemented` 까지만 했다** — `completed` 전이는 리드 판독의 몫으로 남긴다.

## 2. 증거 (Evidence)

- `npm test` — 이 sync 가 직접 실행한 전체 스위트 **총 9회**(레인 4 + 수정 에이전트 4 + 감사관 3 중복 제외), 마지막 실행 `final-test.txt` **EXIT=0 / 283 통과**(server 188 + channel 95).
- `npm run typecheck --workspaces` — **EXIT=0** (`gate-typecheck.txt`, `fix-typecheck.txt`, `r1-typecheck.txt`).
- 커버리지 — 3회차 감사관 실측 server **93.78%** / channel **88.62%** (둘 다 기준 초과).
- `unbound` 주장 실측 — `grep -rc "https" server/src/*.ts` 13개 파일 **전건 0**. 서버가 TLS 를 종단하지 않는다는 문서 주장이 코드로 확인됐다.
- 하네스 문서 쌍둥이 — `diff` **exit 0**, 147줄 완전 일치(3회차가 확정; 2회차의 미결은 방법의 인공물이었다).

### 바뀐 파일 12건

| 파일 | 무엇 |
|---|---|
| `README.md` | 낡은 현재 상태 서술 6자리 + `t23` 배포 경고 |
| `CHANGELOG.md` | t22 항목 신설 + 과거 절 교체 공시 7건 |
| `.moai/specs/SPEC-GWAUTH-002/spec.md` | frontmatter `status: implemented`, `updated: 2026-08-31` |
| `.moai/specs/SPEC-GWAUTH-002/progress.md` | §F.3 Sync-phase · §F.4 감사 라운드 기록 |
| `.moai/specs/SPEC-CHANCLIENT-001/{spec,acceptance}.md` | v2 계약 갱신 + 하네스 절 원문 교체 |
| `channel/src/gateway-client.ts` | `onWelcome` 선언 확장 (F3) |
| `channel/test/{gateway-client,transport-auth,index-wiring,permission-relay}.test.ts` | 확립 술어 교체 5자리 (R1) + F7 완화 |
| `.claude/agent-memory/sync-auditor/*` | 감사관 자체 학습 기록 |

## 3. Baseline-attribution (baseline 귀속)

- 모든 수치는 이 나무·브랜치 `WT-gateway-mutual-auth`·HEAD `bc265a4` + 미커밋 트리에서 각 실행이 직접 관측한 값이다.
- **[HARD] `PASS 0.854` 는 F-11 공시(`CHANGELOG.md` 카드 `t11` 절)와 `progress.md` §F.4 를 쓰기 이전 트리의 값이며 재채점은 없다.** 두 편집은 문서뿐이고 코드에 닿지 않았으며, 편집 후 `npm test` 283 초록을 관측했다. plan 단계의 `PASS 0.86` 이 같은 성질을 가진 것과 동일한 귀속이다.
- **통과는 얇다.** 3회차 감사관 자신이 공시했다 — Craft 를 2회차 값 0.80 으로 봤다면 0.848 FAIL, Consistency 를 0.82 로 봤다면 0.846 FAIL, F-11 을 차단으로 세웠다면 즉시 FAIL. 셋째 갈래는 위에서 닫았고 앞의 둘은 감사관의 실측 근거(사본 완전 일치 확정 · 경합이 타임아웃 상향이 아니라 술어 교체로 닫힘)에 얹혀 있다.
- **plan 감사 `PASS 0.86` 귀속은 사용자 문서에 한 번도 등장하지 않는다** — 3회차가 실측으로 확인했다.

## 4. Gaps (미검증)

- **`completed` 전이를 하지 않았다** — 리드 판독의 몫이다.
- **생존 비차단 10건**: F2(`sha256Hex` 사체) · **F4(`SPEC-CHANCLIENT-001/plan.md` v1 프레임 계약표 3자리 — 디스패치 범위 밖이라 손대지 않음)** · F5(하네스 사본의 기계적 대조 장치 부재) · **F6(`pretest` 부재 — 깨끗한 체크아웃의 첫 실행은 여전히 `dist` 부재로 흔들린다)** · F8 · F-10 · F-12 · F-13 · **F-14(`transport-auth.test.ts:450` 만 기본 3000ms 잔존)** · F-15. 하나도 지우지 않았다.
- **린터가 없다** — `npm run lint` 는 두 워크스페이스 모두 `Missing script`. 잴 도구가 없는 공백이다.
- **게이트웨이를 실제로 띄워 프레임을 눈으로 보지 않았다** — 문서 문안은 SPEC 본문·소스 대조로만 확인했다.
- **`web/` 는 어간 훑기 범위 밖이었다.**
- **변이 32건을 재실행하지 않았다** — run 단계 M6 의 실측이 정본이다.

## 5. Residual-risk (잔여 위험)

- **배포 경계는 `t23` 이다** — 「서버 TLS 종단이 닫히기 전까지 생산 배치 불가」. 이 PASS 는 그 조건을 조금도 완화하지 않는다. 채널 바인딩은 모든 배치에서 `unbound` 이고 AC-GWAUTH2-024 가 매 실행 「평문에서 중계자가 이긴다」를 기록한다.
- **하네스 사본은 손뜬 사본이다**(F5) — 시험 파일이 다시 바뀌면 `acceptance.md` 절이 다시 낡는다.
- **여섯 번째 확립-대용 술어가 없다고 단언하지 않는다** — 훑기는 「대기 술어가 `hello` 를 본다」는 어간으로 걸었고, 연결 수로 확립을 대용하는 술어는 걸리지 않는다.
- **이 나무는 미푸시 유일 사본이다.** 원격이 없고 sync 편집도 미커밋이다. 어느 워크트리도 폐기하면 안 된다.

---

## 6. 리드 인계 (Lead-Handoff)

1. **`completed` 전이 판단** — sync 감사 PASS 는 났으나 `spec.md` frontmatter 는 `implemented` 에 멈춰 있다. 리드가 판독 후 전이할 자리다.
2. **PASS 0.854 의 귀속** — §3 의 [HARD] 항목. 최종 트리 점수로 읽으면 안 된다. 재채점을 원하면 4회차가 필요하다.
3. **F4 — `SPEC-CHANCLIENT-001/plan.md` v1 프레임 계약표 3자리**(`:60` `:68` `:91`). 형제 SPEC 정정 디스패치의 FILES IN SCOPE 밖이라 손대지 않았다. 「구현 계획」 문서라 역사 기록으로 볼 여지가 있으나 **표 형태의 계약 서술**이므로 처분이 필요하다.
4. **F6 — `pretest` 부재**. `npm test` 를 깨끗한 체크아웃에서 처음 돌리면 `channel/dist` 부재로 거짓 실패가 난다(이 sync 의 첫 게이트 실행이 그 증상을 겪었다). CI 배선 후속 카드의 실범위 후보다.
5. **F-14 — `transport-auth.test.ts:450` 만 기본 3000ms**. 형제들은 4500~5000 이다. 부하 민감 대기의 남은 자리다.
6. **떠도는 워크트리** `.claude/worktrees/agent-a448b5b2e00e411bb` — 3회차 감사가 확인했다: main 위 희소 체크아웃이고 `channel/`·`server/` 를 담지 않는다. **split-brain 중복본 없고 유일 사본은 안전하다.** 정리는 리드 판단.
7. **첫 게이트 실패의 처분** — 이 sync 의 첫 `npm test` 가 `transport-auth.test.ts` 1건 실패로 나왔다. 1회차 감사가 **낡은 dist 를 기각**하고 부하 민감 타이밍으로 판정했으며, 2회차가 그 뿌리(R1 확립 술어)를 잡아 술어 교체로 닫았다. 원인이 규명돼 종결됐다.
8. **억제 미탐지 카드 미등록** — run 인계 §6-3 그대로. 운영자 확인(2026-08-30)으로 **등록하지 않기로 확정**됐고, 공백은 `spec.md` §0-7 · AC-015 본문 주석 · `m5-suppression-disclosure.md` 로만 산다. 「등록됐다」로 읽으면 안 된다.

---

**카드 `t22` sync 단계 종료(초안).** 최종 판정 — `completed` 전이와 병합 — 은 리드의 몫이다.
