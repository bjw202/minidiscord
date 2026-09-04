# card t37 — main 통합 + SPEC 정리 증거 (integration.md)

| 항목 | 값 |
|---|---|
| 나무 | `.claude/worktrees/t37` (브랜치 `WT-spec-triage-merge`, 기준 `f5cb336` + 분류표 `98f2116`) |
| 집행 | run 레인, 세션 `646efb0d` (2026-09-04) |
| PR | https://github.com/bjw202/minidiscord/pull/2 (base `main` ← head `WT-spec-triage-merge`) |
| 브랜치 커밋 | `556dfd1`(병합 1/3) → `a489378`(2/3) → `b8658ba`(3/3) → `960b56d`(②) → `aef8108`(③) |

---

## 1. 주장 (Claim)

1. 미병합 셋(t32·t33·t34)이 순서대로 `WT-spec-triage-merge` 에 병합됐고, 병합마다 server·channel 스위트 통과 + push + 전체 SHA 기준 CI success 를 관측했다.
2. `SPEC-GWAUTH-001` 만 `_archive` 로 이동됐고(삭제 0건), 구자리에 묘비 한 줄이 생겼다.
3. 완료 SPEC 의미 규약이 `paths:` 범위 규칙 파일로 착지했고, ROADMAP 에 OD-3 만 등재됐으며, 분류표 25·26행이 (c)종결 확정으로 갱신됐다.

## 2. 증거 (Evidence)

### ① 병합 1/3 — t32 (`WT-m6-real-session` → `556dfd1`)

- 병합: 무충돌. `git log --oneline -2` → `556dfd1 merge: t32 실시간 검증 나무… (card t37)`
- 스위트 (`unset MOAI_KANBAN … && npm test --workspaces --if-present`, exit=0):
  ```
  Test Files  17 passed (17)
       Tests  210 passed (210)      ← server
  Test Files  7 passed (7)
       Tests  126 passed (126)      ← channel
  ```
- push: `* [new branch] WT-spec-triage-merge -> WT-spec-triage-merge`
- CI (`gh run list --commit 556dfd17cbfb6cb91acf4565dccb85a829f23464`):
  `{"conclusion":"success","status":"completed","workflowName":"CI"}`

### ① 병합 2/3 — t33 (`WT-username-length` → `a489378`)

- 병합: `CONFLICT (content): Merge conflict in CHANGELOG.md` (이 파일 1건만; README·channel-server.ts·index-wiring.test.ts 는 자동 병합 — 리드 merge-tree 예측과 일치)
- 해석: 양쪽 카드 절을 원문 그대로 보존, t32→t33 순(리드 지시). 표식 검사:
  ```
  $ grep -n '<<<<<<<\|=======\|>>>>>>>' CHANGELOG.md ; echo "exit=$?"
  grep exit=1 (표식 0건)
  $ grep -n '### 확인됨 — 진짜 Claude Code\|### 고쳐짐 — 사용자 이름에 상한' CHANGELOG.md
  7:### 확인됨 — 진짜 Claude Code 세션이 방에서 답하는 것을 사람이 직접 봤습니다 (카드 `t32`)
  79:### 고쳐짐 — 사용자 이름에 상한이 생겼습니다 (카드 `t33`)
  ```
- 스위트: exit=0 — server 212통과(17파일, t33 인증 시험 +2) · channel 126통과(7파일)
- push: `556dfd1..a489378 WT-spec-triage-merge -> WT-spec-triage-merge`
- CI: 1차 **failure** (§4 참조) → 재실행 후 `{"conclusion":"success","status":"completed","workflowName":"CI"}` (전체 SHA `a4893780d390fbf9315f6ace89b65b4027c95312`)

### ① 병합 3/3 — t34 (`WT-perm-verdict-socket` → `b8658ba`)

- 병합: 무충돌 (사전 `git merge-tree --write-tree --name-only HEAD WT-perm-verdict-socket` exit=0)
- CHANGELOG: 자연 병합 결과가 t34→t32→t33 순이라 리드 규칙(t32→t33→t34)에 맞춰 절 이동(원본 7~66행 → t27 절 앞) + 이음매 이중 빈 줄 1건 정리. **내용 무변경 기계 검증**:
  ```
  빈 줄 제외 행 수 — index(병합 원본): 429 / 작업트리(재배열 후): 429
  내용 해시(순서 무관, sort|md5) — 양쪽 모두 aeac621a995941c530904a3a9295a6a0
  ```
  표식 검사: `grep exit=1 (표식 0건)`. 최종 절 순서: `7:t32 → 81:t33 → 106:t34 → 166:t27`
- 커밋 이력 주의사항: 첫 `git commit --no-edit` 이 pre-commit 훅에 1회 거부(출력을 `tail -2` 로 잘라 사유 유실 — 원인 미규명), **override 없이** 재시도로 통과(`f8cad5d`). `--no-commit` 병합에 `-m` 을 못 넣어 기본 메시지로 착지한 것을 (card t37) 추적성 보완을 위해 amend → `b8658ba` (트리 불변, 메시지 변경만).
- 스위트: exit=0 — server 220통과(t34 시험 +8) · channel 126통과
- push: `a489378..b8658ba` → CI `{"conclusion":"success","status":"completed","workflowName":"CI"}` (전체 SHA `b8658ba7697e346126eb0093750afaf26b3ebeef`)

### ① PR

```
https://github.com/bjw202/minidiscord/pull/2  (gh pr create --base main --head WT-spec-triage-merge)
```

### ② `_archive` 이동 (`960b56d`)

```
$ git mv .moai/specs/SPEC-GWAUTH-001 .moai/specs/_archive/SPEC-GWAUTH-001
rename … (100%) × 4  (acceptance·plan·progress·spec.md — 삭제 0건)
$ Write .moai/specs/SPEC-GWAUTH-001.md
대체됨 → SPEC-GWAUTH-002 (REQ-GWAUTH2-017 이 REQ-GWAUTH-004 를 폐기)
```
나머지 SPEC 25개는 손대지 않았다 (커밋 통계로 검증 가능: `git show --stat 960b56d` = rename 4 + 신규 1).

### ③ 규약·ROADMAP·분류표 (`aef8108`, 4파일 +40/−4)

- **규약 착지 판단(리드 위임 사항)**: 새 규칙 파일 `.claude/rules/moai/workflow/completed-spec-semantics.md` 에 `paths: ".moai/specs/**"` 로 신설. 근거 — (ㄱ) 규약이 필요한 순간은 SPEC 파일을 읽거나 고치는 순간이고, (ㄴ) `rule-authoring.md` duty (d) 가 «먼저 paths 범위로 둘 수 없는지» 를 요구하며, (ㄷ) `spec-workflow.md` 안에 새 `##` 절로 넣으면 ~2.5KB 항상 적재 성장으로 duty (b) 가 발동한다. 그래서 본문에는 포인터 한 줄만 추가(~230B, 임계 미만). 항상 적재 비용 증가: **0바이트**(규칙 파일) + ~230바이트(포인터).
- ROADMAP: «후속 후보» 절 신설 후 **OD-3 만** 등재(그 외 후보 등재 안 함 — 리드 지시). OD-3 내용: `SPEC-CHANAUTH-001` 본문이 현재형으로 거짓(현재 조건은 `SPEC-GWAUTH-002`, `REQ-GWAUTH2-017`), 오독 방지 포인터 필요.
- 분류표(§2): 25행 `SPEC-PERMROUTE-001`·26행 `SPEC-LIVEVERIFY-001` 을 **(c) 종결 확정**으로 갱신(§4.3 재분류 조건 충족 — 각각 병합 `b8658ba`·`556dfd1` 로 main 계통 편입). 집계 → (a)0 · (b)1 · (c)24 · 미정1. §7 갱신 기록 신설, §6 OD 처분 기록 한 줄. §1 의 plan 시점 집계(22/3)는 작성 시점 기록으로 원문 보존.
- `SPEC-CHANINJECT-001` 은 미정 그대로 — 후속 카드 `t38` 소유.

## 3. CI 1회 실패·재실행 기록 (병합 2/3)

```
run 33838590462 (a489378) 1차: conclusion failure — 실패 단계 «Run npm test»
  (typecheck server·channel 은 통과)
실패 시험 1건: channel test/transport-auth.test.ts >
  "both nonces are regenerated per socket and a replayed challenge is refused"
  AssertionError: expected '81cd7894…' not to be '81cd7894…'
CI 집계: server 16파일 211통과/1스킵(212) · channel 1실패/125통과(126)
같은 커밋 로컬 스위트: 두 번 모두 전건 통과 (212+126)
리드 판독(회귀 부정): git diff 98f2116..HEAD -- channel/src 의 nonce·randomBytes 적중 0건,
  시험 파일 변경(cdc94c6)도 nonce 무관 2추가/1삭제, 병합 1 CI 는 success
처분(리드 A 채택): gh run rerun 33838590462 --failed → 재실행 등록 관측(status=in_progress)
  → 재실행 conclusion: success (비재현)
```

## 4. t36 인계 — 이 카드가 마주친 관측 2건

1. **이번이 그 시험의 첫 CI 노출이며, t36 카드의 가설(«5초 시간 상한과 동시 세션 부하»)을 약화시킨다.** 앞선 5회는 전부 부하 걸린 로컬이었는데 이번은 단일 테넌트 CI다. 부하 경합만으로는 설명되지 않는다.
2. **시험 본문에 경합 후보가 보인다(가설 — 리드가 시험 본문만 읽고 세운 것, stub 구현은 미확인).** 해당 시험은 `await waitFor(() => stub.connections() === 2, '재접속', 4500)` 로 기다린 «직후» `stub.nonceSeen()` 을 읽는데, «연결이 섰다» 와 «그 소켓의 hello 가 도착해 새 논스가 관측됐다» 는 서로 다른 사건이다. 둘째 소켓이 붙었지만 hello 전이면 `nonceSeen()` 은 여전히 nonce1 을 돌려 단언이 «두 값이 같다» 로 깨진다 — 관측된 증상(시간 초과가 아닌 값 동일)·자가소멸·느린 환경에서 잦아지는 것이 전부 이 모양에 맞다. **지금 기준은 «연결 수» 를 재지 «새 논스 도착» 을 재지 않는다** — 상한을 늘리는 수리가 금지된 이유이기도 하다.

(ROADMAP 등재는 하지 않았다 — OD-3 만 등재하기로 확정. 이 절이 t36 의 인계 자리다.)

## 5. 미검증 (Gaps)

- **PR 머지 자체는 관측하지 않았다** — 리드·운영자 몫이다. 머지 착지 전까지 세 카드 나무(t32·t33·t34)는 폐기 금지가 유지된다.
- **CodeRabbit 리뷰 상태는 확인하지 않았다** — sync 게이트 소관이다.
- **세 카드 브랜치 자체는 미푸시 로컬 브랜치로 남는다**(의도된 설계 — 내용은 통합 브랜치 경유로 origin 에 존재).
- **병합 3/3 의 첫 pre-commit 훅 거부 사유는 미규명**이다(출력 절단으로 유실). 재시도가 override 없이 통과했고 작업 트리는 깨끗했으나, 원인 기록은 없다.
- **`npm run e2e` 는 이 카드 범위 밖이라 돌리지 않았다**(디스패치 검증 범위는 server·channel 스위트 + CI).
- **주 체크아웃에 미커밋 ROADMAP 개편(카드 표 확장 등 45줄 추가)이 있다.** 본 PR 이 main 에 들어가면 그 작업 디렉터리 변경과 텍스트 충돌이 날 수 있다 — 운영자·리드 정리 필요, 본 카드 범위 밖.

## 6. 잔여 위험 (Residual risk)

- transport-auth 논스 시험은 «1회 실패 → 재실행 통과» 관측 한 쌍일 뿐이다. 재발하면 t36 의 소유 문제다(§4 인계).
- CHANGELOG 절 순서 정규화는 이 PR 고유의 편집이라, 주 체크아웃의 미커밋 ROADMAP·CHANGELOG 작업과 머지 후 재결합할 때 손대는 자리가 될 수 있다.
- `channel/dist` 는 gitignored 상태로 나무에 존재했으나, channel `pretest: tsc` 가 매 스위트마다 재빌드하므로 낡은 빌드물이 판정에 끼어들 여지는 없었다.

---
*카드 `t37` run 단계 증거. 집행 세션 `646efb0d`, 리드 판독 대기.*
