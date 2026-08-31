# SPEC-CI-001 run-done 보고 (card t27)

- 카드: `t27` (N4 — CI 테스트 배선, P2) · SPEC `SPEC-CI-001` · Tier M.
- 나무: `.claude/worktrees/t27` · 브랜치: `WT-ci-test-wiring` · 기준: `main @2a19d7d` (= `origin/main`).
- 종료 head: 본 보고서를 담는 M5 커밋 (커밋 이전 head `014ed37`; 커밋 자신의 해시는 착지 후 `git log` 로 확정된다). 커밋 직후 `origin/WT-ci-test-wiring` 으로 푸시해 run 단계를 닫는다 — 푸시 사실의 확인은 `git ls-remote origin WT-ci-test-wiring` 이 본 커밋 해시를 가리키는 것으로 한다.
- 원문 증거 뿌리: `.moai/state/verify/t27-run/` (run) · `.moai/state/verify/t27-plan/` (plan 실측) · 기준별 원문 기록: `.moai/specs/SPEC-CI-001/progress.md` §E.2.

## 마일스톤 요약 (M2–M5)

| 마일스톤 | 커밋 | 내용 | 증거 |
|---|---|---|---|
| M2 워크플로 저작 | `eb68257` | `ci.yml` 저작(트리거·네 단계·빌드 단계 부재·위생 고정) + `.nvmrc`(OD-2 b) + `channel` `pretest`(OD-3 b) | `m2-ac001.log` `m2-ac002.log` `m2-ac003.log` `m2-ac004.log` `m2-ac012.log` `m2-selfsufficiency.log` |
| M3 원격 초록 관측 | 커밋 없음(`eb68257` push 관측) | push 트리거 run `33392889584` `success` · pull_request 트리거 run `33393227672` `success` · draft PR #1 개설 후 **닫음·비병합** | `m3-ac005.log` `m3-ac010.log` `m3-ac005-log-tail.log` |
| M4 변별 (붉어질 수 있음) | `b6ec899`/`89cc137` + 증거 `e321368` · `cd7e983`/`e296163` + 증거 `014ed37` | AC-CI-006(실패 테스트 → `failure` → revert → `success`) · AC-CI-007(pretest 제거 → `failure`+채널 6건 → revert → `success`) | `ac006-sha.txt` `ac006-bad.txt` `ac006-good.txt` · `ac007-sha.txt` `ac007-mutation.txt` `ac007-gate.txt` `ac007-bad.txt` `ac007-good.txt` |
| M5 위생·기록 | 본 커밋 | AC-CI-008/009/011 재실행 + §E.2 열두 기준 원문 기록 완성 + §E.3 신호 + DoD 4 집합 검사 + 본 보고서 | `m5-ac008.log` `m5-ac009.log` `m5-ac011.log` `m5-dod4.txt` |

(M1 — 리드 결정 확정 OD-1/2/3 = (b) — 은 plan 단계 커밋 `2e76f8a` 로 이미 이행돼 있었고, run 진입 게이트 AC-CI-009 `CLOSED 3` 이 그것을 확인했다: `ac009-entry-gate.log`.)

## Card Cross-Check

| 마일스톤 | card | 비고 |
|---|---|---|
| M2 워크플로 저작 | t27 | `eb68257` |
| M3 원격 초록 관측 | t27 | 커밋 없음 — `eb68257` 원격 관측 마일스톤 |
| M4 변별 | t27 | 파괴 2커밋 + revert 2커밋 + 증거 2커밋, 전부 t27 |
| M5 위생·기록 | t27 | 본 커밋 |

마일스톤 4건 → 카드 1건(`t27`) — 신규 카드 없음. 큐 대조는 리드가 `moai todo` 로 확인한다.

## Claim (주장)

1. **SPEC-CI-001 의 수용 기준 열두 건(AC-CI-001~012)이 전부 통과했고**, 각 기준의 명령과 출력이 `progress.md` §E.2 에 원문으로 기록됐다.
2. **DoD 1–6 이 전부 성립한다** — 아래 Evidence 와 DoD 체크리스트가 그 근거다.
3. 파괴 커밋 두 쌍은 되돌려졌고, 증거 커밋은 되돌림 뒤에 착지했으며, draft PR #1 은 닫혔고 병합되지 않았다.
4. 변경 파일 집합이 확정 집합(`ci.yml` + `.nvmrc` + `channel/package.json` + `.moai/` 문서·증거)과 **정확히** 일치한다.

## Evidence (증거)

### M5 재실행 세 건 (이 나무, 이번 회차, head `014ed37` + M5 문서 편집 상태)

**AC-CI-008** (`m5-ac008.log`) — `rm -rf channel/dist` → exit 0 · `npm test` → **exit 0**(서버 188 + 채널 95 = 283, pretest 빌드 선행) · `git status --porcelain` 출력에 `server/data`·`channel/dist`·`coverage` 한 줄 없음. 기계 판정 `grep -E "server/data|channel/dist|coverage" | wc -l` → `0`. (porcelain 에 잡힌 9줄은 전부 세션 산출물과 이 증거 파일 자신이다.)

**AC-CI-009** (`m5-ac009.log`) — 명령 출력의 마지막 줄:

```
CLOSED 3
```

**AC-CI-011** (`m5-ac011.log`) — 두 번 실행했다. 1차는 §E.2/§E.3 편집 반영 상태, 2차는 AC-CI-011 절 자체가 삽입된 최종 문서 상태. 양쪽 모두:

```
declared: {1: 5, 2: 5, 3: 7}
markers : {1: 5, 2: 5, 3: 7}
listed  : {1: 5, 2: 5, 3: 7}
§D-2 (b)/(c) rows with non-empty 그 밖의 자리: 5
FALLOUT TABLE COMPLETE
```

### DoD 4 — 변경 파일 집합 (`m5-dod4.txt`)

`git diff --name-only main...HEAD`(main == origin/main == `2a19d7d` 확인 후) + M5 예정 스테이지 집합의 합집합에서 `.moai/` 밖 파일은 정확히 셋 — `diff` 명령 대조가 `SET EXACT — 범위 이탈 없음` 을 냈다:

```
.github/workflows/ci.yml
.nvmrc
channel/package.json
```

### DoD 체크리스트 1–6

| DoD | 상태 | 근거 |
|---|---|---|
| 1. 열두 기준 통과 + §E.2 원문 기록 | 성립 | `progress.md` §E.2 전체 + §E.3 판정표 12행 |
| 2. 파괴 커밋 되돌림 + success 재관측 + 증거 커밋이 revert 뒤 | 성립 | `git log`: `e321368` 은 `89cc137` 뒤, `014ed37` 은 `e296163` 뒤 · `ac006-good.txt`=`success` · `ac007-good.txt`=`success` |
| 3. draft PR 닫힘·비병합 | 성립 | `m3-ac010.log` — PR #1 `{"isDraft":true,"mergeCommit":null,"mergedAt":null,"state":"CLOSED"}` |
| 4. 변경 파일 집합 일치 | 성립 | `m5-dod4.txt` — `SET EXACT` |
| 5. 재시도 장치 부재 | 성립 | `m2-ac003.log` — `NO SUPPRESSION` (AC-CI-003) |
| 6. `CLOSED 3` + `FALLOUT TABLE COMPLETE` | 성립 | `m5-ac009.log` · `m5-ac011.log` |

### 귀속 공시 (attribution notes)

- **게이트 우회는 AC-CI-006 단 한 곳**이다. 파괴 커밋 `b6ec899` 에서만 `SKIP_MOAI_PRECOMMIT=1` 을 썼고, 사유(붉음이 측정 대상 자체)를 커밋 메시지 본문과 `progress.md` §E.2 AC-CI-006 절 두 곳에 적었다. **AC-CI-007 은 우회를 쓰지 않았다** — 우회 없이 시도한 커밋이 게이트를 통과했고(`cd7e983`), 그 관측이 `ac007-gate.txt` 의 `gate=passed (우회 없음)` 으로 남는다. acceptance.md 가 예고한 두 경로 중 통과 쪽이 실측됐다. 그 밖의 모든 커밋은 게이트를 통과했다.
- **M2 작업 나무 이동 사고와 재귀속**: M2 스폰 에이전트가 자기 L1 나무에 산출을 착지시키는 사고가 있었고, 리드가 그 산출을 카드 나무로 cherry-pick 하여 `eb68257` 로 확정했다(해시 대조로 바이트 동일 확인 — 인계 기록). 그 뒤 다섯 정적 기준(AC-CI-001~004·012)과 자족성 확인을 **이 나무에서 다시 실행**해 재귀속했다 — `m2-*.log` 의 실행 경로가 `.claude/worktrees/t27` 임이 그 증거다(직접 관측). cherry-pick 당시의 해시 대조 자체는 이 세션이 본 것이 아니라 인계 기록임을 구분해 적는다.
- **원격 관측의 귀속**: AC-CI-005/010 의 통과 판정은 `gh run list` 출력 자체다(`eb682571…` SHA, run `33392889584` push / `33393227672` pull_request). 폴링 초반의 빈 출력들은 통과로 세지 않고 미관측으로 기록했다.

## Baseline-attribution (baseline 귀속)

모든 M5 측정은 **이 나무(`.claude/worktrees/t27`) · 브랜치 `WT-ci-test-wiring` · 이번 회차**(2026-08-31 22:25–22:41 KST)에 수행됐다. AC-CI-008/009 는 head `014ed37` 트리에서, AC-CI-011 은 같은 트리에 M5 문서 편집(§E.2 전체 기록·§E.3·AC-CI-011 절)이 반영된 상태 — 곧 본 커밋이 담는 내용과 동일한 문서 상태 — 에서 쟀다. M2 기준 출력은 `eb68257` 트리 상태에서 이 나무로 재실행해 귀속했고, M3 원격 관측은 push 된 SHA `eb682571d953e5a7679cbfe848f838e3b6076b77` 에 귀속된다. 원격 트리거 관측에 쓰인 head 는 `eb68257` 이며, 그 뒤의 파괴/revert/증거/M5 커밋은 이 브랜치에만 더해졌다 — AC-CI-006·007 의 GOOD 관측(`89cc137`·`e296163`)이 그 이후 커밋들의 초록을 대신 증명하지는 않으며, M5 종료 head 의 원격 초록은 푸시 후 CI 실행으로 새로 관측된다(sync 단계 확인 사항).

## Gaps (미검증)

- **흔들림(flake) 실패율은 측정돼 있지 않다** — `spec.md` §2.6·§5 배제 공시대로 이 카드가 재지 않는다. plan 단계의 3회 반복 실행이 깨끗했음(`t27-plan/flake-run1~3.log`)은 측정이지 실패율이 아니다.
- **M5 종료 head 의 원격 CI 실행은 아직 관측되지 않았다** — 본 커밋 푸시 후 `gh run list --commit <본커밋>` 으로 `success` 를 새로 관측해야 하며, 이는 sync 단계의 첫 확인 사항으로 남긴다.
- **AC-CI-011 은 커밋 전 작업 나무 상태를 쟀다** — 커밋이 담는 내용과 동일하므로 등가이지만, 커밋 착지 이후 트리에 대한 별도 재실행은 하지 않았다.
- **cherry-pick 당시의 바이트 동일 해시 대조는 인계 기록**이다 — 이 세션은 `eb68257` 의 존재와 m2 로그의 실행 경로만 직접 확인했다.
- 본 보고서 안에는 **푸시 확인 출력이 없다** — 푸시는 본 문서를 담는 커밋 이후의 행위라서다. 확인은 `git ls-remote origin WT-ci-test-wiring` 이 본 커밋을 가리키는 것으로 한다.

## Residual-risk (잔여 위험)

- `ac007-bad.txt` 에 **ANSI 색상 이스케이프가 원문 보존을 위해 그대로 남아 있다** — 이 파일을 grep 으로 다룰 때 이스케이프가 매칭을 가릴 수 있다(§E.2 AC-CI-007 절의 공시와 같다).
- AC-CI-006·007 의 **파괴 커밋과 그 revert 넷이 브랜치 이력에 남는 것은 설계대로다** — 리드의 통합 대상은 revert 이후 head이며, 통합 시 스쿼시 여부 판단은 리드의 몫이다.
- 흔들림이 실제로 있으면 향후 CI 가 간헐적으로 붉어질 수 있고, 그때 판단에 쓸 실패율 데이터가 없다(위 Gaps 첫 항과 같은 뿌리).
- 원격 CI 관측 두 건(AC-CI-005/010)은 GitHub Actions 의 실행 이력에 의존한다 — run 이력 보존 기간이 지나면 재확인은 `git log` 와 본 기록으로만 가능해진다.
