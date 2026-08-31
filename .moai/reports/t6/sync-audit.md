# t6 sync 감사 — SPEC-E2E-001 @ `0b784c1`

- 카드 `t6` · SPEC `SPEC-E2E-001` v0.3.2 (Tier M) · 브랜치 `WT-e2e-persist-readme`
- 감사 대상 트리: `0b784c1`(sync 종결 커밋) · 기준선 리터럴 `2a19d7d` · run 종결 `8f4d273`
- 감사자: sync-auditor (독립 재실행 · 인도 보고를 근거로 쓰지 않음)

## 0. 쉬운 말 요약

t6 이 만든 검사 16개를 제가 직접 다시 돌렸고, **16개 모두 자기 명령이 요구하는 값을 냅니다.**
테스트 285개(서버 190 + 채널 95)와 E2E 15단계도 제 손으로 다시 돌려 초록을 확인했습니다.
sync 레인이 닫았다고 보고한 차단 **B-01 은 실제로 닫혀 있습니다** — 고친 문장 자신이 다시 걸리지
않고, 면제 상한 7 도 올리지 않고 지켰습니다.

다만 **새로 세 가지를 찾았습니다.** ① 트리거 세 줄 중 첫 줄을 재는 검사(AC-E2E-014 ㉠)는
**아무것도 재지 않습니다** — 그 줄을 지워도 초록입니다(형제 기준 AC-E2E-012 가 같은 절에 같은
낱말을 두 번 심기 때문). ② 완료 정의 4항이 허용한 파일 집합 **밖의 파일 4개**가 이 카드의 변경에
들어 있고, 그 자리를 세어 적은 숫자 셋(18·7·2)이 **전부 실측과 다릅니다**(19·8·3). ③ 회부 보고서가
「이 파일은 아직 커밋 안 됐고 상태는 in-progress 다」라고 적은 채 커밋됐습니다 — 이 저장소가
반복 기록한 「정정이 스스로 낡은 기록을 남긴다」의 재현이며, 이번에는 **sync 레인 자신의 새 글**에서
났습니다.

판정은 **PASS 0.827**(Tier M 통과선 0.80)이나 **통과폭이 0.027 로 얇습니다.** 어느 하나를 다르게
매기면 뒤집히는지는 §7 에 적었습니다.

---

## 1. SSOT 에서 읽은 통과선

| 항목 | 값 | 읽은 자리 |
|---|---|---|
| SPEC tier | `M` | `.moai/specs/SPEC-E2E-001/spec.md:14` (`tier: M`) |
| Tier M 통과선 | **0.80** | `.claude/rules/moai/workflow/spec-workflow.md:141` (표) · `:329-330` (재확인) |
| 평가 프로파일 | `default` | `.moai/config/sections/harness.yaml` `harness.default_profile: "default"` (SPEC frontmatter 에 `evaluator_profile` 없음) |
| 차원 가중·must-pass | Functionality 40% / Security 25% / Craft 20% / Consistency 15%; must-pass = Functionality·Security | `.moai/config/evaluator-profiles/default.md` |

디스패치가 통과선을 전하지 않았고, 위 값은 감사자가 SSOT 에서 직접 읽었다.

---

## 2. 차원 점수와 판정

| 차원 | 점수 | 판정 | 근거(축자 관측) |
|---|---|---|---|
| Functionality (40%) | **0.82** | PASS | `npm test` → `exit=0` · `Tests 190 passed (190)` + `Tests 95 passed (95)` = **285**. `npm run e2e` → `exit=0` · `[1/15][2/15]…[15/15]` · 마지막 줄 «E2E PASS — 15 단계 전부 통과». AC 16건 전건이 자기 측정값을 냄. 감점: F-01(기준 공허)·F-02(DoD 4·5 위반) |
| Security (25%) | **0.92** | PASS | `git diff --name-only 2a19d7d..HEAD \| grep -c "server/src/"` → **`0`**. `spawn('npx', ['tsx', …])` — `shell` 미사용·인자 배열(`scripts/e2e.mts:89`), 자격증명은 시험용 상수뿐, 데이터는 `mkdtempSync` 임시 디렉터리. Critical/High **0건** |
| Craft (20%) | **0.85** | PASS | 회귀 짝의 단언이 동일성 기반(`restart-persistence.test.ts:97-113`)이고, 필수 변이가 **좁음이 실측으로 증명됨**: `mut-A-vitest.log:52` → `Tests  2 failed | 188 passed (190)`. 커버리지 수치는 **미측정**(§6 Gap) |
| Consistency (15%) | **0.70** | PASS(감점) | 이 저장소가 이름 붙인 재발 부류(«정정이 스스로 낡은 기록을 남긴다»)가 **sync 레인 자신의 새 글에서 두 번** 재현(F-02·F-03) |

**가중 조화평균** = 1 / (0.40/0.82 + 0.25/0.92 + 0.20/0.85 + 0.15/0.70)
= 1 / (0.48780 + 0.27174 + 0.23529 + 0.21429) = 1 / 1.20912 = **0.8271**

- must-pass 방화벽: Functionality(전 AC 충족) PASS · Security(Critical/High 0) PASS — 통과.
- **총평: PASS 0.827 (통과선 0.80, 여유 +0.027 — 얇음)**

---

## 3. 제가 직접 재실행한 것 (인도 보고를 근거로 쓰지 않음)

| 기준 | 명령(축자) | 관측 |
|---|---|---|
| DoD 3 스위트 | `npm test` | `exit=0` · `Test Files 16 passed (16)` / `Tests 190 passed (190)` · `Test Files 6 passed (6)` / `Tests 95 passed (95)` → **285** |
| AC-001 | `npm run e2e; echo "exit=$?"` | `exit=0` |
| AC-007 | `grep -o '^\[[0-9]\+/15\]' \| tr -d '\n'` | `[1/15][2/15][3/15][4/15][5/15][6/15][7/15][8/15][9/15][10/15][11/15][12/15][13/15][14/15][15/15]` — 정확 일치 |
| AC-004(잔여 프로세스) | `pgrep -f "tsx server/src/index.ts"; echo "pgrep=$?"` | `pgrep=1` (적중 없음) |
| AC-005 | `ls -la data` | `ls: data: No such file or directory` — e2e 완주 후에도 루트 `./data` 부재 |
| AC-009 ① | `test -f server/test/restart-persistence.test.ts; echo "exit=$?"` | `exit=0` |
| AC-009 ③ | `grep -c "app.db.close()" server/test/restart-persistence.test.ts` | `2` (≥1) |
| AC-011 ① | `git diff 2a19d7d..HEAD -- package.json \| grep '^-' \| grep -c '"test"'` | `0` |
| AC-011 ② | `node -e "…scripts"` | `{"e2e":"npx tsx scripts/e2e.mts","test":"npm test --workspaces --if-present"}` — 비어 있지 않음 |
| AC-011 ③ / 013 ④ | `git rev-parse --verify 2a19d7d >/dev/null; echo "exit=$?"` | `exit=0` |
| AC-012 ① | `grep -c "생산 배치" README.md` | `0` |
| AC-012 ②㉠㉡㉢ | 앵커+문언 결합 grep 3건 | `1` / `1` / `1` |
| AC-013 ① | `git diff --name-only 2a19d7d..HEAD \| grep -c "server/src/config.ts"` | `0` |
| AC-013 ② | `grep -c "내 PC" README.md` | `2` (유지) |
| AC-013 ③ | `git diff 2a19d7d..HEAD -- README.md \| grep -cE '^[-+].*내 PC'` | `0` |
| AC-014 ㉠㉡㉢ | `awk` 보안 절(57행) 추출 후 어간 3 | `3` / `1` / `1` (전부 ≥1) |
| AC-015 | `awk '/^## 명령어/,/^## 폴더 구조/' README.md \| grep -c 'npm run e2e'` | `1` |
| AC-016 ① | verbatim grep + `grep -v 'AC-016-EXEMPT'` | `exit=1` (적중 **0**) |
| AC-016 ①-b | verbatim grep + `grep -c 'AC-016-EXEMPT'` | `7` (상한 7 이내) — 파일별 `spec.md` **3** · `plan.md` **1** · `acceptance.md` **3** · `progress.md` **0** |
| AC-016 ①-c | `grep -rc 'AC-016-EXEMPT' README.md scripts/` | `README.md:0` · `scripts/e2e.mts:0` |
| AC-016 ② | `grep -rEn "anthropic\|claude\.ai\|api\.anthropic\|spawn\(['\"]claude" scripts/` | `exit=1` (적중 0) |
| DoD 7 | `grep '^- 측정' acceptance.md \| grep -c 'BASE'` | `0` |
| DoD 4(핵심 절) | `git diff --name-only 2a19d7d..HEAD \| grep -c "server/src/"` | `0` |
| 트리 오염 | `git status --short` | 낯선 신규 파일 없음(비추적은 세션 로그·`t6-run`/`t6-sync` 증거뿐) |

기준선 붕괴(`HEAD..HEAD`) 부류는 재발하지 않았다 — 기준선은 네 자리 전부 리터럴 `2a19d7d` 이고,
`git rev-parse --verify` 생존 가드가 두 기준 모두에 있으며, DoD 7 이 `0` 이다.

### B-01 종결 공격 (이 감사의 존재 이유)

| 질문 | 관측 | 판정 |
|---|---|---|
| 조정된 `progress.md:195` 가 측정 ①을 만족하나 | 측정 ① `exit=1` · 전체 적중 7건 중 `progress.md` **0건** | **닫힘** |
| 리드가 요구한 뜻(«결정 기록이지 실행 주장이 아니었다»)이 보존됐나 | `git diff 8f4d273..0b784c1` — «수동 검증 수행» 직접 인용 → «금지어 해당 문언» 간접 지칭, «결정 기록이지 실행 주장이 아니었다» 문장 유지 | **보존** |
| §E.4·CHANGELOG·커밋 메시지가 측정 ① 범위에 새 적중을 넣었나 | 측정 ① 범위(`README.md` · `scripts/` · `.moai/specs/SPEC-E2E-001/`) 전체 적중 7건 전부 면제 표지 보유, 신규 0 | **없음** |
| ①-b 가 상한 이내이고 상한을 올리지 않았나 | `7`(=상한). `git show --stat 0b784c1` → `acceptance.md` **미포함** — 기준 문서 무편집 | **상한 준수·미상향** |
| 같은 자기지시 부류가 나무의 다른 자리에 사나 | **산다** — `.moai/reports/t6/sync-blocked.md:25`·`:70` 이 금지어를 축자 인용한 채 커밋됨. 측정 ① 범위 밖(`.moai/reports/`)이라 기준은 잡지 못한다 | **F-04(권고)** |

---

## 4. 발견 (차단 · must-fix)

### F-01 [Medium] [blocking] AC-E2E-014 ㉠ 은 자기 제목이 말하는 것을 재지 않는다

- **주장**(`acceptance.md` AC-E2E-014 «잡는 변이» ①): 「세 줄 중 **어느 하나**를 빼면 그 줄의 측정이 `0` 으로 빨개진다」
- **명령·관측**(트리거 줄 제거를 모사 — README 무편집):
  ```
  $ awk '/^## 보안에 대해 알아둘 점/,/^## 명령어/' README.md \
      | grep -vF '이 서버는 사내망 전용이다' > /tmp/t6sec-mut.txt
  $ grep -c "서비스화" /tmp/t6sec-mut.txt
  2
  $ grep -c "t12" /tmp/t6sec-mut.txt
  1
  $ grep -c "N5" /tmp/t6sec-mut.txt
  1
  ```
  ㉠ 의 판정은 `≥1` 이므로 **트리거 줄(README:240)을 통째로 지워도 `2` 로 초록이다.**
- **원인**: 보안 절 범위는 `README.md:188`–`:243` 이고(`grep -n "^## " README.md`), 형제 기준
  **AC-E2E-012 ②㉡(README:225)·②㉢(README:236)** 이 그 절 **안에** 「서비스화」를 의무적으로 심는다
  (`grep -n "서비스화" README.md` → `5`·`225`·`236`·`240`). 즉 ㉠ 은 사전 상태 0 을 통과했지만,
  **형제 기준의 의무 편집만으로 충족된다.**
- **왜 문제인가**: SPEC 이 v0.2.0 에서 닫은 D-03(「제목이 본문보다 넓다」)의 **결합 축 재현**이다. 사전 상태
  자기 검사로는 이 형태가 걸리지 않는다 — 사전 상태는 0 이었기 때문이다. 변이표 행 H 는 ㉡(t12)만
  실행했고 ㉠ 은 변이로 확인되지 않았다.
- **범위 정정**: 인도물 자체는 옳다 — README:240 의 트리거 줄은 **실재한다**(위 `sed -n '238,243p'` 관측).
  결함은 **기준의 강도**이며, 위험은 회귀 방향이다(누가 240 을 지워도 이 기준은 침묵한다).
- **요구 수정**: ㉠ 의 어간을 그 절에서 **트리거 줄에만 있는 것**으로 바꾼다 — 예: `과제원 밖` 또는
  `사내망 밖으로 내보내기`(현재 보안 절 안에서 각각 1회). 또는 `awk` 범위를 트리거 3줄 블록으로 좁힌다.
  이 카드가 닫힌 뒤라면 `t27`(CI 배선) 또는 신규 카드로 이월하고 그 사실을 SPEC 에 공시한다.

### F-02 [Medium] [blocking] DoD 4 가 문면대로 충족되지 않았고, 그 자리에 적힌 수 셋이 전부 실측과 다르다

- **주장**(`progress.md:196` §E.2): 「`git diff --name-only 2a19d7d..HEAD` → **18파일** 전부 허용 집합
  (… `.moai/reports/t6/*` **7** · plan-auditor 메모리 **2** …)」
- **명령·관측**:
  ```
  $ git diff --name-only 2a19d7d..8f4d273 | wc -l
        19
  $ git diff --name-only 2a19d7d..8f4d273 | grep -c 'reports/t6'
  8
  $ git diff --name-only 2a19d7d..8f4d273 | grep -c 'agent-memory'
  3
  $ git diff --name-only 2a19d7d..HEAD | wc -l
        21
  $ git diff --name-only 2a19d7d..HEAD \
      | grep -vE '^(scripts/e2e\.mts|server/test/restart-persistence\.test\.ts|package\.json|README\.md|\.moai/)'
  .claude/agent-memory/plan-auditor/MEMORY.md
  .claude/agent-memory/plan-auditor/auditor-prescription-can-be-impossible.md
  .claude/agent-memory/plan-auditor/fix-round-reproduces-class-in-its-new-axis.md
  CHANGELOG.md
  ```
- **왜 문제인가**: 셋으로 갈라진다.
  1. **DoD 4 문면 위반** — 허용 집합은 `scripts/e2e.mts` · `server/test/restart-persistence.test.ts` ·
     `package.json` · `README.md` · `.moai/**` 다. `.claude/**` 3건과 `CHANGELOG.md` 는 그 안에 없다.
     (DoD 4 의 **핵심 절**인 «`server/src/**` 0건» 은 충족 — 제가 재실행해 `0` 을 관측했다.)
  2. **DoD 5 위반** — 「어떤 숫자도 재지 않고 쓰지 않았다」. `18`·`7`·`2` 셋 다 인도 시점 트리에서
     실측과 다르다(19·8·3). 재지 않고 적은 수다.
  3. **DoD 6 미이행(sync 단계)** — sync 커밋이 `CHANGELOG.md` 를 **새로 추가**해 변경 집합을 19→21 로
     바꿨는데, 그 집합을 세어 적은 §E.2 문장은 갱신되지 않았고 §E.4 에도 DoD 4 재측정이 없다.
     이것이 이 저장소의 «정정이 스스로 낡은 기록을 남긴다» 재현이다.
- **요구 수정**: §E.2 의 그 한 줄을 **실측 명령 + 실측 출력**으로 교체하고(21파일·범주별 실수),
  `.claude/agent-memory/**` 와 `CHANGELOG.md` 를 DoD 4 허용 집합에 명시적으로 넣거나
  「허용 집합 밖 4건 — 사유: plan-auditor 메모리는 plan 커밋 산출, CHANGELOG 는 sync 산출물」로
  **공시된 예외**로 적는다. 둘 중 무엇이든 **적힌 수는 실행한 명령의 출력이어야 한다.**

### F-03 [Low] [blocking] `sync-blocked.md` §5 가 자기 상태를 거짓으로 말한 채 커밋됐다

- **주장**(`.moai/reports/t6/sync-blocked.md:83-85`): 「파일은 **비추적(untracked)** 이다. sync 레인은 이
  카드에서 **커밋을 만들지 않았고** SPEC status 도 `in-progress` 그대로다」
- **명령·관측**:
  ```
  $ git show 0b784c1 --stat
   .moai/reports/t6/sync-blocked.md     | 87 ++++++++++++++++++++++++++++++++++++
   ...
  $ head -6 .moai/specs/SPEC-E2E-001/spec.md | grep -n status
  5:status: completed
  ```
  그 파일은 `0b784c1` 에 **추적되어 들어갔고**, sync 레인은 커밋을 만들었으며, status 는 `completed` 다.
- **왜 문제인가**: §E.4 는 이 보고서를 「회부 시점 기록 — 이력으로 보존」으로 규정하지만, **그 규정이
  파일 자신에는 없다.** 파일만 여는 독자는 현재형 서술 셋을 참으로 읽는다. 저장소 관례
  (「본문은 지금 참, HISTORY 는 그때 참」)에 따르면 **자기 결정 기록은 두되 현재 상태 서술은 고친다**.
  B-01 이 가르친 「고치고·고쳤다고 적고·그 다음 재실행」의 재훑기(DoD 6)가 sync 자신의 새 글에는
  적용되지 않은 것이 원인이다.
- **요구 수정**: `sync-blocked.md` 머리에 「이 보고는 `8f4d273` 회부 시점의 기록이다 — 이후 `0b784c1`
  에서 처분·커밋·status 전이가 이뤄졌다」 한 줄을 얹거나, §5 의 세 현재형 문장을 과거형·시점 명시로
  고친다(내용 삭제 아님).

---

## 5. 권고 (advisory — 자동 수정 대상 아님)

- **F-04 [Medium]** AC-E2E-016 측정 ①의 범위가 `.moai/reports/` 를 포함하지 않아, B-01 을 낳은 **자기지시
  부류가 그 자리에서 살아 있다**: `grep -nE "…" .moai/reports/t6/sync-blocked.md` → `:25`·`:70` 두 줄이
  금지어를 축자 인용한 채 커밋됐다. 기준 위반은 **아니다**(범위 밖은 SPEC 이 의도한 설계). 다만
  §E.4 «Residual-risk» 가 적은 「문언 검사의 한계」에 **범위의 한계**도 함께 적히는 것이 옳다.
- **F-05 [Low]** §E.2 Gaps ②의 「`./data` 를 만드는 buildServer 시험 7종」은 자리 표기가 느슨하다.
  제 관측: 전 스위트 + e2e 완주 뒤 루트 `data` **부재**, `server/data` **존재**(`.gitignore` 대상,
  `git status --short --ignored` → `!! server/data/`). `t27` 이 이 문장을 읽고 루트 `./data` 를 찾으면
  헛짚는다 — 「`server/` 작업 디렉터리 기준 `server/data`」로 적어야 한다.
- **F-06 [Low]** `CHANGELOG.md:11` 「손댄 것은 `scripts/e2e.mts`·`server/test/restart-persistence.test.ts`
  ·`package.json` 한 줄·`README.md` 뿐」은 문면상 거짓이다(같은 커밋이 CHANGELOG·SPEC·보고서도 고쳤다).
  의도한 뜻(제품 파일 한정)은 참이고, 「`server/src/` 는 한 글자도 고치지 않았습니다」는 제가 실측으로
  확인했다(`grep -c "server/src/"` → `0`). 과장은 아니나 「제품 파일 기준」 한정어가 없다.
- **F-07 [Low]** AC-E2E-005 는 이 나무에서 구조적으로 약하다 — 루트 `./data` 가 없으므로 전·후 해시가
  둘 다 빈 입력 해시다. **공허하지는 않다**(변이 D 가 «사후 `./data` 생성·해시 변화» 로 빨강을 실측했다).
  다만 이 기준은 **생성**만 잡고, 이미 있는 `./data` 의 **내용 변경**은 개발자 기기에서만 재게 된다.
- **F-08 [Info]** `progress.md:110-111` 이 «E2E PASS — **13** 단계 전부 통과» / `[1/15]…[13/15]` 를 담는다.
  M2 마일스톤 시점 기록으로 귀속돼 있어 결함은 아니나, 최종 주장을 찾는 독자에게 혼동 소지가 있다.

## 5.1 확인된 주장 (반증 실패 — 인도 보고가 옳았다)

- **필수 변이의 좁음**: `mut-A-vitest.log:51-52` → `Test Files  1 failed | 15 passed (16)` /
  `Tests  2 failed | 188 passed (190)`. **서버 스위트 전체**를 대상으로 잰 값이며, 빨개진 것은
  `restart-persistence.test.ts` 2건뿐이다. 「신규 재시작 시험만 빨강 = 좁은 변이」 주장은 **기록으로
  검증된다** — Gap 아님. CHANGELOG 의 「새 시험 2건만 … 나머지 188건은 그대로 통과」도 이와 일치한다.
- **회귀 짝이 동작을 단언한다**: `restart-persistence.test.ts` 의 세 동일성은 메시지 id·본문 비교,
  첨부 바이트 `Buffer.compare(...) === 0`, 같은 토큰의 v2 재접속 `welcome.room_id`/`bot_id` 대조다.
  개수 산술 없음(REQ-E2E-010 충족). `closeForRestart()` 가 `app.close()` 뒤 `app.db.close()` 를 부른다.
- **`[n/15]` 표지가 단언 뒤에 찍힌다**: `scripts/e2e.mts:128-132` 의 `step()` 이 `n !== stepsPassed + 1`
  이면 즉시 `E2eError` 를 던진다 — 건너뜀·중복·역순이 조용히 통과하지 않는다.
- **P-06 종결**: `boot-timeout-wired.log` 가 실제 `EADDRINUSE` → `[boot-timeout]` 1회 → `exit=9` 를
  담고 증거 경로가 `.moai/state/verify/`(`/tmp` 아님)다. `sleep 1` 은 준비 신호 폴링으로 대체됐다
  (`scripts/e2e.mts:104-121` 의 `waitForBoot` — 고정 대기 없음).
- **status 전이 소유**: `spec.md` 만 frontmatter `status` 를 갖고(`plan.md`·`acceptance.md` 각 `0`건),
  전이는 단일 sync 커밋이 수행했다.

---

## 6. Gaps — 제가 관측하지 **않은** 것

- **변이 10건 중 9건을 재현하지 않았다.** 재현한 것은 없고, **판독**한 것은 변이 A 의 로그
  (`mut-A-vitest.log`) 하나뿐이다. B~J 는 `progress.md` §E.2 표와 `run-done.md` 의 기록을 **읽었을 뿐**
  실행하지 않았다. 「살아남은 변이 0건」은 **제 관측이 아니다** — run 레인 귀속.
- **커버리지를 재지 않았다.** 이 저장소에는 커버리지 스크립트가 배선돼 있지 않다
  (`grep -rn "coverage" package.json server/package.json` → 적중 없음; `channel/package.json:18` 에
  `@vitest/coverage-v8` 의존성만 존재). `quality.yaml` 의 `test_coverage_target: 85` 는 측정 수단
  없이는 판정할 수 없으므로 Craft 는 **커버리지 수치가 아니라 코드·시험 품질 관측으로** 매겼다.
  프로파일의 「Coverage < 85% = Craft FAIL」 하드 임계는 **적용하지 않았고 미검증으로 남긴다.**
- **AC-E2E-002~004·008·010 을 개별 변이로 재검증하지 않았다.** `npm run e2e` 초록과 표지 열로 **간접**
  확인했다. 특히 AC-E2E-003(봉투 해제)·AC-E2E-004(실패 전파)는 변이 없이는 양성만 관측된다.
- **AC-E2E-006 을 직접 돌리지 않았다.** 점유 포트 블록은 배경 프로세스를 세우므로 「부하를 만들지
  말라」는 감사 제약에 따라 실행하지 않고 run 단계 증거 로그를 **판독**했다.
- **부하 내성·SIGKILL 직후 WAL 복구·Windows·CI 환경**은 재지 않았다(공시된 미측정 그대로).
- **스위트와 e2e 는 각 1회씩만 돌렸다.** `transport-auth.test.ts` flaky 는 제 2회 실행에서 **미재발**
  이나, 1회 관측은 flakiness 부재의 증거가 아니다.

## 6.1 Residual-risk — 관측한 것에도 남는 위험

- 모든 초록은 **이 나무·무부하 macOS·이 노드 판본**의 값이다. CI 의 첫 실행이 다른 값을 낼 수 있고,
  `transport-auth` flaky 는 원인이 제거된 것이 아니라 재발하지 않은 것뿐이다(`t27` 몫).
- **F-01 이 열어 둔 회귀 창**: README:240 트리거 줄이 미래에 삭제돼도 AC-E2E-014 는 침묵한다.
  이 카드가 지금 닫히면 그 창은 열린 채 남는다.
- AC-E2E-016 은 **문언 검사**다. 금지된 주장을 다른 표현으로 쓰면 통과한다(§E.4 자기 공시와 동의).
  여기에 **범위의 한계**(F-04)가 겹친다 — `.moai/reports/` 는 아예 재지 않는다.
- 배포 경고는 유효하다: README:5·225·236 이 「`t23`(서버 TLS 종단)이 닫히기 전까지 서비스화 불가」를
  말하며, 이 카드는 그 상태를 바꾸지 않았다. **t6 종결이 배포 가능을 뜻하지 않는다.**
- README 의 과도기 어긋남(3·190행 「내 PC」 vs 트리거 「사내망 전용」)은 `spec.md:52` 가 공시한
  **`t26` 이월**이며 이 카드의 미결이 아니다 — 감사자 동의.

---

## 7. 얇은 통과의 공시 — 무엇이 뒤집는가

여유는 **+0.027** 이다. 다음 **하나**만 다르게 매겨도 FAIL 로 뒤집힌다.

| 재채점 | 새 조화평균 | 결과 |
|---|---|---|
| Consistency 0.70 → **0.50** (F-02·F-03 을 「명명된 재발 부류의 두 번째·세 번째 재현 + DoD 문면 위반」으로 무겁게 봄) | 0.772 | **FAIL** |
| Functionality 0.82 → **0.70** (F-01 을 「AC-E2E-014 미충족」으로 봄) | 0.775 | **FAIL** — 게다가 must-pass 방화벽(전 AC 충족)이 깨져 점수와 무관하게 FAIL |
| Craft 0.85 → 0.70 (커버리지 미검증을 감점) | 0.803 | PASS(여유 0.003) |

즉 **이 PASS 는 F-01 을 「기준의 강도 결함(인도물은 옳음)」으로, F-02·F-03 을 「기록 결함(기계 사실은
옳음)」으로 읽은 판정에 걸려 있다.** 세 발견 중 어느 하나라도 「인도물 자체의 결함」으로 재분류되면
판정은 뒤집힌다. 리드가 이 분류에 동의하지 않으면 **재판정 근거가 된다.**

---

## 8. 판정

**PASS — 0.827 (Tier M 통과선 0.80, 여유 +0.027)**

- must-pass: Functionality PASS · Security PASS
- 차단 3건(F-01·F-02·F-03)은 **전부 기록·기준 층**이며 인도된 코드의 동작 결함이 아니다. 그러나
  DoD 4·5·6 의 문면 요구이므로 처분 없이 지나갈 수 없다 — 카드 종결 전 수정하거나, **후속 카드로
  이월하고 그 이월을 SPEC 에 공시**해야 한다(어느 쪽인지는 리드 판정).
- 인도물 자체는 튼튼하다: 285 통과·15단계 완주·좁은 변이로 증명된 회귀 짝·`server/src` 무변경 —
  전부 감사자가 직접 재실행하거나 로그를 판독해 확인했다.

---

*이 보고의 모든 수치는 위에 적힌 명령을 이 나무(`0b784c1`)에서 실행해 관측한 값이거나,
관측자를 명시해 귀속한 값이다. 재지 않은 수는 적지 않았다.*
