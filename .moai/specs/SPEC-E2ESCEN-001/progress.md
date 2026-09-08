# SPEC-E2ESCEN-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-E2ESCEN-001` |
| Tier | M (spec.md + plan.md + acceptance.md; research.md 를 함께 둔다) |
| 선행 SPEC | `SPEC-BOTMODEL-001`·`SPEC-MSG-001`·`SPEC-SSE-001`·`SPEC-PERM-001`·`SPEC-MENTION-001` (전부 completed) |
| 관련 SPEC | (없음 — `SPEC-CHANCLIENT-001`·`SPEC-GATEWAY-001` 은 BOTMODEL-001 로 대체된 스텁, `spec.md` §8) |
| 손대는 파일 | `scripts/e2e-lib.mts`(신설) · `scripts/e2e.mts` · `scripts/e2e-scenario.mts`(신설) · `package.json` · `server/test/e2e-lib.test.ts`(신설) · `ROADMAP.md`(sync) |
| 개발 방식 | TDD — M1 이 RED (`quality.yaml` `development_mode: tdd`) |
| 현재 상태 | `completed` — plan 감사 1회차 FAIL 0.75 → v0.2.0 · 2회차 CONDITIONAL PASS 0.857 → v0.3.0(`.moai/reports/e2escen/plan-audit.md`); run 단계 M1~M6 착지(M7 은 운영자 결정으로 미착수); sync 감사 **PASS 0.865**(차단 0 · F1~F10 전부 비차단, `.moai/reports/e2escen/sync-audit.md`) |
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
- 나무: 이 run 은 `origin/main` 에서 뜬 격리 워크트리에서 돌았다. 커밋 둘 — `56815bc`(M1) · `c4f778e`(M2~M6). 푸시하지 않았다.
- 환경: 새 나무라 `node_modules` 가 없어 `npm ci`(exit 0) 와 `npm run build -w channel`(exit 0) 을 먼저 돌렸다.
  `channel/dist` 는 그 뒤 존재하고, `server/node_modules`·`channel/node_modules` 는 npm workspaces 가 뿌리로 끌어올려 없는 것이 정상이다.

### 주장 (Claim)

AC-E2ESCEN-001~012 · 014 · 015 는 초록이고, AC-013 은 «플래그 없음» 절반만 초록이다(M7 미착수 — `plan.md` §G ⑥).

### 증거 (Evidence) — 명령과 관측 원문

**AC-001 도우미 추출 뒤 첫째 러너 불변**

```
$ diff b.txt a.txt | wc -l                                → 0
$ cat e2e-before.exit e2e-after.exit                      → 0 / 0
$ grep -c "from './e2e-lib.mts'" scripts/e2e.mts          → 1
$ grep -cE '^(export )?(async )?function (api|connect|nextFrame|expectQuiet|pollUntil|closeWs|fail|assert|messageForm|listMessages)\b' scripts/e2e.mts   → 0
$ grep -c '^\[[0-9]*/15\]$' e2e-after.txt                 → 15
$ tail -1 e2e-after.txt   → E2E PASS — 15 단계 전부 통과 (봇 하나 · 방 둘)
```

**AC-002 도우미 인프로세스 시험** — `cd server && npm test` exit 0, `Test Files 18 passed (18)` · `Tests 213 passed (213)`.
`grep -c "^\s*it(" server/test/e2e-lib.test.ts` → `3`. 기준선 210 → 213 (정확히 `it` 셋만큼).

**RED 원문 (E8)** — 도우미가 없던 시점의 실패. `.moai/state/verify/e2escen/m1-red.txt`:

```
 FAIL  test/e2e-lib.test.ts [ test/e2e-lib.test.ts ]
Error: Cannot find module '../../scripts/e2e-lib.mts' imported from …/server/test/e2e-lib.test.ts
 Test Files  1 failed (1)
      Tests  no tests
exit=1
```

**AC-003 둘째 러너 골격** — `.moai/state/verify/e2escen/scenario.txt`:

```
$ cat scenario.exit                                       → 0
$ (표지 사다리 awk)                                        → ladder-ok
$ tail -n 2 scenario.txt
[elapsed] 14098 ms
E2E-SCENARIO PASS — 20 단계 전부 통과 (봇 둘 · 방 둘 · 관측자 하나)
$ E2E_FORCE_PORT=59551 npx tsx scripts/e2e-scenario.mts   → exit 9
$ grep -c '^\[boot-timeout\]$' boot.txt                   → 1
```

**AC-004~009 (G1·G2·G3·G4·G5)** — 표지 `[2/20]`~`[18/20]` 이 찍혔다는 것이 그 단언들이 전부 섰다는 증거다
(표지는 단언 성공 뒤에만 찍는다). 전체 사다리 `[1/20]`…`[20/20]` 이 빠짐·역순 없이 스무 줄.

**AC-010 관측 항목 여덟** — 원문:

```
[observe] history.cursor-walk: {"backlog":504,"limit":100,"steps":1,"missed_ids":404}
[observe] permission.cross-room-outcome-room: {"request_room":1,"reply_room":2,"outcome_in_request_room":1,"outcome_in_reply_room":0}
[observe] permission.no-expiry: {"unanswered":20,"consumed":true,"first_still_resolves":true}
[observe] bots.delete-while-connected-close-ms: {"ms":6}
[observe] mention.duplicate-live-frames: {"frames":1,"deliveries":["to"]}
[observe] mention.duplicate-replay-frames: {"frames":2,"deliveries":["to","cc"]}
[observe] identity.same-token-two-sockets: {"sockets_received":2,"second_hello_rejected":false,"history_reply_to_requester_only":true}
[observe] identity.zero-width-name: {"plain_status":409,"zero_width_status":201,"mention_post_status":400,"mention_error":"B​ 봇은 이 방에 초대되지 않았습니다"}
[observe-summary] 8 items
```

여덟 이름 각각 `grep -c` → 전부 `1`. `grep -c '^\[observe\] '` → `8`. 출력에 «결함»·«bug» 0건.

관측값 읽기 — 전부 `plan.md` §G 가 예상한 방향으로 관측됐다. `history.cursor-walk` 의 `missed_ids: 404` 는
`limit` 을 `since_id` 보다 먼저 적용하는 현행 동작(§G ①)의 실측이고, `mention.duplicate-*` 의 1 대 2 는
실시간 `find` 와 재전송 타깃 행 순회의 비대칭(§G ⑤)이며, `identity.zero-width-name` 의 `zero_width_status: 201` 은
봇 이름에 길이·형식 문자 검사가 없다는 것(§G ④)이다. **어느 것도 단언하지 않았고 종료 코드에 닿지 않았다.**

**AC-011 변이 실측** — 사본은 `scripts/` 밖에 두고 실행 뒤 지웠다(출력은 남겼다).

```
(a) 관측값 뒤집기  npx tsx e2e-mut-a/e2e-scenario.mts   → exit 0 · 표지 20줄 · ladder-ok
    [observe] permission.no-expiry: {"unanswered":20,"consumed":true,"first_still_resolves":false}
(b) 단언 뒤집기    npx tsx e2e-mut-b/e2e-scenario.mts   → exit 1 · [fail] 한 줄 · 표지 [1/20] 에서 멈춤 · ladder-broken
    [fail] step2 G1 (ㄱ) B 가 받은 프레임이 A 의 to 봇 글이 아니다
(c) awk '/function observe\(/,/^}/' scripts/e2e-scenario.mts | grep -c 'assert(\|fail('   → 0
```

출력 원문: `.moai/state/verify/e2escen/mut-a/out.txt` · `mut-b/out.txt`.
사본 경로는 «`scripts/` 밖» 을 지키되 저장소 뿌리 바로 아래(`e2e-mut-a/`·`e2e-mut-b/`)에 두었다 —
`PROJECT_ROOT` 를 파일 위치에서 역산하므로 두 단계 아래(`.moai/state/verify/e2escen/mut-*/`)에 두면
`server/src/index.ts` 를 찾지 못해 기동 시한으로 죽는다(실측: exit 9, `ERR_MODULE_NOT_FOUND`). 실행 뒤 삭제했다.

**AC-012 시한 있는 대기**

```
$ grep -nE 'while \(true\)|for \(;;\)' scripts/e2e-scenario.mts | wc -l          → 0
$ grep -cE 'setTimeout\(' scripts/e2e-scenario.mts                               → 0
$ (도우미 밖 await 검사, \<await 에서 화이트리스트 제외)                          → 0
$ grep -cE '^\[elapsed\] [0-9]+ ms$' scenario.txt                                → 1
$ grep -cE '^\[elapsed\] [0-9]+ ms$' boot.txt                                    → 1
$ grep -nE 'setInterval\(|spawn\(' … | grep -vE 'spawnServer\(|spawnChannel\('   → 0
```

**AC-013 G7** — `grep -c '^\[skip\] G7' scenario.txt` → `1`, 종료 코드 0. 나머지 절반은 **M7 미착수 — §G ⑥**.

**AC-014 보호 경로 무변경**

```
$ git diff --stat d98ad7b -- server/src web channel/src .github | wc -l   → 0
$ git diff --name-only d98ad7b | sort                                     → (아래 규칙을 만족)
```

(1) 보호 경로는 **두 시점에서 모두 0 줄**이었다 — 구현 커밋 뒤와 증거 커밋 뒤.

(2) 는 **고정된 수를 적지 않는다.** 이 절 자신이 `.moai/state/verify/e2escen/` 안의 파일 수를 바꾸므로
«N 줄» 이라고 쓰면 쓰는 순간 낡는다(자기를 세는 계수). 대신 규칙을 적는다 — **모든 줄이 다음 다섯 갈래 안이다**:
`scripts/e2e{-lib,-scenario,}.mts` · `package.json` · `server/test/e2e-lib.test.ts` ·
`.moai/specs/SPEC-E2ESCEN-001/*` · `.moai/state/verify/e2escen/*`. 감사자는 위 명령을 다시 돌려 확인한다.
`ROADMAP.md` 는 sync 단계 몫이라 손대지 않았고, `server/src`·`web`·`channel/src`·`.github` 는 한 줄도 바뀌지 않았다.

**AC-015 회귀 셋** — 차례로 돌렸다(동시에 돌리지 않았다).

```
$ npm test            → exit 0 · server Tests 213 passed (213) · channel Tests 103 passed (103) · failed 0
$ npm run e2e         → exit 0 · E2E PASS — 15 단계 전부 통과 (봇 하나 · 방 둘)
$ npm run e2e:scenario→ exit 0 · E2E-SCENARIO PASS — 20 단계 전부 통과 (봇 둘 · 방 둘 · 관측자 하나)
```

**품질 게이트** — `grep -cE "^import .*server/src"` 는 `e2e.mts`·`e2e-lib.mts`·`e2e-scenario.mts` 각각 `0`.

### 기준 귀속 (Baseline-attribution)

모든 수치는 이 나무(`.claude/worktrees/agent-a71f790b9899a7d67`)에서 이번 run 에 직접 실행한 명령의 출력이다.
- `npm test` 기준선 **server 210 / channel 103** 은 구현 전 `d98ad7b` 에서 직접 재어 `npm-test-before.txt` 에 남겼다(`acceptance.md` 가 적어 둔 210 과 일치).
- `npm run e2e` 기준선 출력은 같은 시점의 `e2e-before.txt` 이고, AC-001 의 diff 는 그 파일과 추출 뒤 `e2e-after.txt` 를 포트만 가려 비교한 것이다.
- `[elapsed]` 는 이 기계의 실측이다 — 정상 경로 **14,098 ms**(회귀 재실행 14,677 ms), 기동 시한 경로 3,427 ms.

### 미검증 (Gaps)

- **M7(`--with-channel`)을 돌리지 않았다.** 운영자 결정(2026-09-08)으로 미착수이며, AC-013 의 나머지 절반
  (잘림 표시·큰 id 먼저 버림·cursor 재수신)은 관측된 바 없다. `e2e-lib.mts` 의 `spawnChannel()` 은 자리만
  마련해 두었고 **한 번도 실행되지 않았다** — 그 함수의 동작은 미검증이다.
- **마일스톤별 RED 를 따로 남기지 못했다.** 둘째 러너는 한 파일이라 M2~M6 을 한 번에 썼고, RED 는
  첫 실행 하나(`m3-red.txt`, 사다리가 `[5/20]` 에서 멈춤)뿐이다. M4·M5·M6 각각의 «첫 실행이 그 자리에서
  멈춤» 증거는 없다.
- **`timeout` 명령이 이 기계에 없다.** AC-003 (4) 가 적은 `timeout 25 node -e …` 대신 같은 node 한 줄을
  **자체 20초 뒤 close** 로 돌리고 PID 를 적어 종료를 확인했다(`kill -0` → 없음). 바깥 시한 대신 안쪽 시한을
  썼다는 점에서 명령이 글자 그대로는 아니다.
- **재실행 안정성(플래키)을 재지 않았다.** 시나리오는 3회 돌아 3회 초록이었지만(첫 RED 제외), 반복 실행으로
  분산을 측정하지는 않았다.
- **CI 에 넣지 않았다** — 운영자 결정. `.github/**` 는 손대지 않았다(AC-014 로 확인).

### 잔여 위험 (Residual-risk)

- **초 넘김 대기(≤ 1,100 ms)** 는 벽시계에 기댄다. 기계가 극단적으로 느리면 `pollUntil` 시한 안에 초가
  넘어가지 않아 step10 이 붉어질 수 있다. 그 경우의 실패는 «채우기 #500 보다 뒤» 단언에서 먼저 잡히도록
  순서를 잡아 두었다 — 조용히 통과하지는 않는다.
- **`expectQuiet` 는 침묵 창(600 ms) 안의 부재만 본다.** 그보다 늦게 오는 프레임은 다음 단계의 큐에 남아
  다른 자리에서 붉어진다 — 관측이 늦는 쪽으로만 틀린다.
- **500개 채우기는 이 기계에서 3초 남짓**이지만 부하가 걸린 기계에서는 `pollUntil` 시한(60초)에 닿을 수 있다.
- **`e2e-lib.mts` 를 두 러너가 나눠 쓴다** — 앞으로 이 파일을 고치면 첫째 러너의 출력이 조용히 갈라질 수
  있다. AC-001 의 diff 검사가 그 그물이지만, 그 검사는 사람이 돌려야 한다(CI 에 없다).
- **`server/tsconfig.json` 의 `outDir` 이 남아 있는 한** `server/test/e2e-lib.test.ts` 의 import 는 `@ts-ignore`
  한 줄에 기댄다. 억제되는 것은 배치(TS6059) 불평 하나이고 도우미의 strict 검사는 그대로 돈다는 것을 타입
  변이로 확인했지만, 그 한 줄이 지워지면 `npm test` 가 붉어진다.

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-09-08T15:52:00+09:00
run_status: audit-ready
run_base_sha: d98ad7b
run_commits:               # main 에 실제로 착지한 다섯 (sync 감사 F2 교정)
  - ee40b40   # M1 공용 도우미 e2e-lib.mts 추출
  - ec4f3c1   # M2~M6 둘째 러너 e2e-scenario.mts
  - b7e94fd   # run 단계 증거와 audit-ready 신호 — §E.2 · §E.3
  - b430cee   # run 단계 검증 증거 — .moai/state/verify/e2escen/
  - 511b149   # AC-014 변경 파일 목록을 고정 수 대신 규칙으로
run_commits_worktree:      # 위 다섯의 원본이 된 격리 워크트리 SHA (미푸시 · main 의 조상이 아니다)
  - 56815bc   # → ee40b40
  - c4f778e   # → ec4f3c1
run_pushed: false          # 격리 워크트리 — main 착지는 오케스트레이터 몫
evidence_dir: .moai/state/verify/e2escen/
ac_pass_count: 14          # AC-001~012 · 014 · 015
ac_partial_count: 1        # AC-013 — 필수 절반만 (M7 미착수)
ac_fail_count: 0
elapsed_ms_scenario: 14098         # ROADMAP OD-6 의 입력값
elapsed_ms_scenario_rerun: 14677
elapsed_ms_boot_timeout: 3427
npm_test_before: "server 210 / channel 103"
npm_test_after: "server 213 / channel 103"
new_it_count: 3
observe_items: 8
protected_paths_diff_lines: 0      # git diff --stat d98ad7b -- server/src web channel/src .github
total_run_phase_files: 6           # e2e-lib.mts · e2e-scenario.mts · e2e.mts · package.json · e2e-lib.test.ts · progress.md(+spec.md frontmatter)
m7_status: "미착수 — §G ⑥"
ci_included: false                 # 운영자 결정 2026-09-08 — .github 무변경
new_warnings_or_lints_introduced: 0
```

**sync 단계로 넘기는 것** — `ROADMAP.md` 의 «후속 후보» 표에 `plan.md` §G ①~⑤ 와 ⑥(M7 미착수)을 더하고,
OD-6 행에 실측 `[elapsed] 14,098 ms` 를 적는다. 이 run 은 `ROADMAP.md` 를 손대지 않았다.

---

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_complete_at: 2026-09-08T17:20:00+09:00
sync_status: audit-ready
sync_audit: ".moai/reports/e2escen/sync-audit.md — PASS 0.865 (차단 0, F1~F10 optional)"
sync_audit_dimensions: "Functionality 0.90 / Security 0.90 / Craft 0.75 / Consistency 0.90"
sync_commit_sha: pending-backfill-sync   # 격리 워크트리 커밋 — main 착지 뒤 오케스트레이터가 채운다
frontmatter_status_transitions:
  spec_md: "in-progress → completed"
docs_touched:
  - README.md            # 명령어 표에 npm run e2e:scenario 행 · 폴더 구조에 e2e-lib.mts·e2e-scenario.mts
  - CHANGELOG.md         # [Unreleased] 2026-09-08 절 맨 위에 둘째 러너 항목 하나
  - ROADMAP.md           # 후속 후보 OD-9~OD-15 추가 · OD-6 에 [elapsed] 실측 · 절 머리글 한 문장
  - .moai/specs/SPEC-E2ESCEN-001/spec.md        # frontmatter status 만
  - .moai/specs/SPEC-E2ESCEN-001/progress.md    # 현재 상태 · §E.3 run_commits · 이 §E.4
```

**감사 발견 처분** (`.moai/reports/e2escen/sync-audit.md` §7)

- **F1** (AC-014 (2) 의 기준 명령이 작업 나무를 본다) — 세션 하네스가 쓰는 파일이 허용 집합 밖에 뜨는 것은 사실이나,
  커밋된 diff(`git diff --name-only d98ad7b HEAD`)는 전부 허용 집합 안이고 보호 경로 diff 는 0 줄이라 기준의 **의도는
  만족**된다. `acceptance.md` 본문은 sync 단계 소유가 아니므로 고치지 않고 여기에 적어 둔다.
- **F2** (`run_commits` 가 워크트리 SHA) — **여기서 닫았다.** §E.3 을 착지 SHA 다섯으로 갱신하고 워크트리 SHA 둘은
  `run_commits_worktree` 로 옮겨 «미푸시·main 의 조상 아님» 을 명시했다.
- **F3 · F10** (`spawnChannel()` 호출부 없음 · `--with-channel` 이 `[skip] G7` 한 줄만 찍음) — ROADMAP **OD-14** 로 올렸다.
- **F4** (소비자 없는 export 다섯) — OD-14 와 같은 자리(M7)의 부수 항목이라 따로 카드를 열지 않았다.
- **F5** (AC-012 (2b) 화이트리스트가 부분 문자열 대조) — 판별력 자체는 있음이 실측됐고 `acceptance.md` 본문 수정은
  sync 단계 소유가 아니라 손대지 않았다.
- **F6** (`@ts-ignore` 안전성의 인용 근거) — §E.2 가 인용한 `QUIET_MS: string` 변이는 오류를 시험 파일에 띄우므로
  «도우미 본문이 strict 로 검사된다» 를 **가르지 못한다.** 가르는 증거는 감사가 도우미 본문에 심은
  `../scripts/e2e-lib.mts(330,9): error TS2322` 다. 주장 자체는 참이고, 근거만 이것으로 읽어야 한다.
- **F7** (eslint/prettier 설정 없음) — 이미 보류 카드 `t35` ②에 있는 항목이라 새 카드를 열지 않았다.
- **F8** (`npm audit` 의 `qs` moderate 2건) — 이 SPEC 이 들여온 것이 아니다(`package-lock.json` 이 `d98ad7b` 대비 무변경).
  별도 카드 몫.
- **F9** (M2~M6 의 RED 증거가 하나) — 감사의 변이 열넷이 사후로 그 공백을 메웠다. 기록만 남긴다.
- **OD-15** (`server/tsconfig.json` 의 `outDir`) — ROADMAP 후속 후보로 새로 올렸다.
