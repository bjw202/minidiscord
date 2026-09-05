# SPEC-WSUPGRADE-001 sync 감사 — card t39 (독립 감사, 1회차)

감사자: sync-auditor (독립). 측정 나무: `.claude/worktrees/t39`(`WT-server-404`), HEAD `0540b5d`,
baseline `620af7a`. 감사 시각 2026-09-05. 평가 프로필: `default`(spec.md frontmatter 에
`evaluator_profile` 없음 → `harness.default_profile: "default"`). 통과선: **Tier M `0.80`**
(`spec.md` frontmatter `tier: M` × `.claude/rules/moai/workflow/spec-workflow.md:335` —
Tier S `0.75` / Tier M `0.80` / Tier L `0.85`. 전달받은 값을 쓰지 않고 SSOT 에서 직접 읽었다).

**이 감사가 재는 것.** 이 카드는 `spec_kind: investigation` 이고 현상이 재현되지 않은 채
(`미관측`) 닫힌다 — 그것은 `plan.md` §D-2(운영자 확정)와 `acceptance.md` AC-WSUPGRADE-009 가
미리 정해 둔 종결 모양이며 **결함이 아니다.** 그래서 이 감사가 묻는 것은 «현상을 잡았는가»가
아니라 **«잡을 장치가 실제로 서 있는가, 그리고 기록이 정직한가»** 둘이다.

---

## 1. 판정

| 항목 | 값 |
|---|---|
| 가중 조화평균 | **0.859** |
| 통과선(Tier M) | 0.80 |
| 필수 통과(Functionality · Security) | **둘 다 통과** |
| 차단 결함 | **1건 (F1)** |
| **최종 판정** | **FAIL — 차단 결함 F1 하나 때문이며, 점수 때문도 `미관측` 때문도 아니다** |

**FAIL 의 범위는 두 줄이다.** 점수(0.859)는 통과선을 넘고, 필수 통과 두 축도 선다. 판정을
뒤집는 것은 F1 하나 — 이 카드가 실어 보내는 시험 파일 둘에 **TypeScript 오류 2건이 새로
생겼고**, 그것이 sync 단계의 상시 게이트(`quality.yaml` `lsp_quality_gates.sync.max_errors: 0`
· `require_clean_lsp: true` · CLAUDE.md §6)를 어긴다. 수리는 각 1줄이고, 재감사는 그 델타만
보면 된다.

**`미관측`에 대해서는 감점하지 않았다.** 복제 0/20 · 병렬 0/20 · 직렬 0/20 은 SPEC 이 요구한
종결 모양이고, 세 기록 전부가 `PASS` 가 아니라 `미관측`으로 사상돼 있다(verdict.md §6 ·
progress.md §E.3·§E.4 · CHANGELOG). 이 자리에서 감점하는 판정은 SPEC 오독이다.

---

## 2. 차원 점수

| 차원 | 점수 | 판정 | 증거(기계 검증 출력 그대로) |
|---|---|---|---|
| Functionality (40%) | **90**/100 | PASS | `npx vitest run` → `Test Files 18 passed (18)` / `Tests 228 passed (228)`, exit 0 — `progress.md` §E.4 `suite_verification` 과 정확히 일치. 시행 수 실측: `grep -c '^trial' m6/summary.txt` → `20`; `ls m3r2 \| grep -c '^parallel-'` → `20`, `serial-` → `20`. 생산 코드: `git diff --name-only 620af7a..HEAD -- server/src/ channel/src/` → 무출력 |
| Security (25%) | **92**/100 | PASS | 부하 스폰 훑기(카드가 더하거나 고친 비-`.md` 파일 전건): `spawn\|execSync\|child_process\|\bfork(` 적중 **0건**. 비밀값 훑기(`server/test/wsupgrade-judgment.ts`): 적중 0건. 포획 파일명은 ISO 시각 + 카운터에서 만들고 `replace(/[:.]/g,'-')` 로 정규화 — 원격 입력이 경로에 닿지 않는다 |
| Craft (20%) | **72**/100 | **FAIL** | `npx tsc --noEmit` → **오류 2건**: `test/gateway.test.ts(223,11) error TS2322` · `test/wsupgrade-judgment.test.ts(104,26) error TS2345`. `git blame` 로 두 줄 모두 이 카드 저작 확인(`71307ca`·`8f421f3`) |
| Consistency (15%) | **88**/100 | PASS | `moai gate` 1회 독립 재현: `rc=0 dur=81s bytes=0` — `m6/summary.txt` 의 «81초» 열과 정확히 일치(80초 1회·81초 14회·82초 5회 실측 재계산으로 verdict.md §1 의 세 수 그대로 확인). 커밋 규약·증거 경로 표기·CHANGELOG 위치 모두 저장소 관례 준수 |

가중 조화평균 = `1 / (0.40/0.90 + 0.25/0.92 + 0.20/0.72 + 0.15/0.88)` = `1 / 1.164416` = **0.8588**.

---

## 3. 결함 목록

### F1 [High] [blocking] — 실어 보내는 시험 파일 둘에 타입 오류 2건이 새로 생겼다

`server/test/gateway.test.ts:223` · `server/test/wsupgrade-judgment.test.ts:104`

```
test/gateway.test.ts(223,11): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
test/wsupgrade-judgment.test.ts(104,26): error TS2345: … Types of property 'collision' are incompatible.
    Type 'string' is not assignable to type '"없음" | "있음"'.
```

- `:223` — `statusCode: res.statusCode` 인데 node 의 `IncomingMessage.statusCode` 는
  `number | undefined` 이고 `CaptureRecord.statusCode`(`wsupgrade-judgment.ts:31`)는 `number` 다.
- `:104` — `collision: '있음'` 이 넓은 `string` 으로 추론되는데 `CaptureRecord.collision`
  (`wsupgrade-judgment.ts:51`)은 `'있음' | '없음'` 이다.

**왜 차단인가.** (1) `server/package.json` 에 `typecheck: tsc --noEmit` 이 선언돼 있다.
(2) sync 단계의 상시 게이트가 오류 0 을 요구한다(`quality.yaml` `lsp_quality_gates.sync`).
(3) **이 하네스는 `REQ-WSUPGRADE-013` 으로 스위트에 영구히 남는다** — 임시 계측기가 아니라
상주물이므로 타입 불결 상태로 착지하면 그대로 굳는다. (4) `moai gate` 는 이것을 잡지 못한다
(F7 — 독립 실행에서 오류 2건이 서 있는데도 `rc=0`), 즉 **다른 어떤 것도 이것을 잡아 주지 않는다.**

**필요한 수리(각 1줄).**
- `gateway.test.ts:223` → `statusCode: res.statusCode ?? 0` (또는 `CaptureRecord.statusCode` 를
  `number | undefined` 로 넓히고 지문 술어의 비교를 그에 맞춘다. 앞쪽이 좁고 싸다).
- `wsupgrade-judgment.test.ts:104` → `collision: '있음' as const`.
- 수리 뒤 `cd server && npx tsc --noEmit` 무출력 확인.

**기준선 귀속.** 이 감사는 baseline 트리에서 `tsc` 를 돌리지 않았다. 대신 이렇게 세운다 —
보고된 오류가 정확히 2건이고 **둘 다 이 카드가 저작한 줄**이며(blame 확인), 그 밖의 파일은
baseline 과 바이트 동일한데 오류가 하나도 보고되지 않았다. 그러므로 baseline 의 server
typecheck 는 0 이었다고 본다. 이것은 **추론이며 측정이 아니다**(§Gaps 에 다시 적는다).

---

### F2 [Medium] [optional] — AC-014 의 문구가 실제로 잰 것보다 강하게 읽힌다

`acceptance.md` AC-WSUPGRADE-014 의 Then 은 「**비-101 응답이 한 건도 없는** 실행이 끝나면
포획 기록물이 생성되지 않는다」이다. 그런데 서버 스위트는 **의도적으로 비-101 을 만든다** —
`server/test/gateway.test.ts:381` 의 `new WebSocket(.../nope)`(경로 격리 시험)이 그것이다.

- `verdict.md` §3 AC-014 행은 정직하다: **「단독 실행」**으로 한정해 적었다(`ac014-clean-run.log`).
- 그러나 `progress.md` §E.4 는 **전체 스위트 실행**(228 시험)의 `captures_dir_after_run: absent`
  에 `# (AC-014 평상시 비용 0)` 주석을 달아 AC-014 의 증거로 인용한다. 그 실행은 `:381` 때문에
  **비-101 이 0건이 아니므로**, AC-014 의 문자 그대로의 전제가 성립하지 않는 실행이다.

기준이 실제로 세우는 명제는 「비-101 0건일 때」가 아니라 **「관측되는 경로에 비-101 이 0건일 때」**다.
기준이 통과하는 이유가 관측자가 `:381` 에 붙어 있지 않기 때문이라는 사실이 문구에 없다.

**필요한 수리.** AC-014 본문(또는 `progress.md` §E.4 의 그 주석)에 전제를 **「관측 경로 기준」**
으로 명시한다. SPEC 본문 수정 권한은 manager-spec 에 있으므로, 최소 수리는 §E.4 주석을
「단독 실행 근거는 `ac014-clean-run.log`; 이 전수 실행은 `:381` 의 비-101 때문에 AC-014 의
전제가 성립하지 않는다」로 고치는 것이다.

---

### F3 [Medium] [optional] — 관측자의 범위가 「파일」로 적혀 있으나 실제 경계는 `wsConnect` 함수다

실측(`grep -n "unexpected-response\|new WebSocket("`):

- `ws.on('unexpected-response', …)` 는 **정확히 한 곳** — `server/test/gateway.test.ts:190`,
  `wsConnect` 안(접속 자리는 `:183`).
- 같은 파일의 **다른 `new WebSocket(...)` 자리 11곳**: `:381, :407, :418, :1260, :1301, :1373,
  :1452, :1472, :1497, :1531, :1569`.
- 그리고 `server/test/gateway-v2.ts:30`(`connectV2`) 1곳. **관측되지 않는 접속 자리 합계 12곳.**

**좁은 범위 자체는 결함이 아니다 — 이것은 검증했다.** `plan.md` §A-1 이 A-1=(a) 를 결정으로
적었고(리드 처분 2026-09-04), 「고른 이유 · 버린 안의 이유 · **받아들인 대가**」를 함께 달았다.
`progress.md` §E.2 M1 도 그 결정을 인용한다. 그리고 `:381` 은 **일부러** 비-101 을 만드는
경로 격리 시험이므로, 거기에 관측자를 달면 거짓 포획을 제조한다 — 붙이지 않는 것이 옳다.

**결함은 대가 문장이 그은 경계가 실제 경계보다 넓다는 것이다.** `plan.md` §A-1 의 대가는
「**이 파일 밖의** 접속(다른 시험 파일)은 안 잰다」로 적혀 있는데, 실제로는 **같은 파일 안의 11곳**도
재지 않는다. 같은 과장이 사용자 표면까지 간다 — `CHANGELOG.md` 는 「**서버 시험이 WebSocket 으로
접속할 때** 101 이 아닌 응답이 오면 … 기록합니다」라고 적어, 모든 서버 시험 접속이 시행인 것처럼
읽힌다. `REQ-WSUPGRADE-013` 의 「이후 모든 gate·CI 실행이 자동 시행」도 같은 폭을 물려받는다.

**필요한 수리.** 대가 문장과 CHANGELOG 의 해당 문장을 **「`wsConnect` 를 통과하는 접속만」**
으로 좁힌다(같은 파일의 다른 접속 자리 11곳 + `gateway-v2.ts` 의 1곳은 관측 밖임을 함께 적는다).

---

### F4 [Medium] [optional] — `progress.md` §E.2 M1 이 반증된 기제를 낡음 표시 없이 싣고 있다

`progress.md` §E.2 「M1 — 관측 하네스」의 포획 항목이 이렇게 적혀 있다:

> 리스너가 기록만 하고 아무 값도 돌려주지 않는다(`emit` 거짓 → ws 의 `abortHandshake` 그대로 던짐 …)

이 기제는 **3회차가 실측으로 반증했다** — `EventEmitter.emit` 은 리스너 존재만으로 참을 돌린다
(`spec.md` §7-12 · `plan.md` §C 교체본 · 같은 파일 §E.2 「3회차」 절). 실제 착지 코드의 주석
(`gateway.test.ts:184~189`)은 **정정돼 있다**(확인함). 그런데 §E.2 M1 항목에는 낡음 표시가 없어서,
그 절만 읽는 사람은 **현재 하네스의 설명으로 읽는다.** §E.2 M1 은 사건 기록이 아니라 **착지물의
서술**이므로 이 저장소의 「본문은 지금 참, HISTORY 는 그때 참」 규약에서 본문 쪽에 가깝다.

**필요한 수리.** 해당 항목 머리에 `[1회차 기록 — 3회차에 반증됨, 아래 「3회차」 절 참조]` 한 줄
표시를 단다(내용은 지우지 않는다 — 감사 궤적).

---

### F5 [Low] [optional] — 본문 수집 경로에 상한이 없다

`gateway.test.ts:190~270` 의 리스너는 `res.on('data')` 로 모으고 `end`·`error`·`close` 셋 중
먼저 오는 것에서 `finish()` 한다(`settled` 가드로 한 번만). **시각 상한(timeout)이 없다.**
헤더만 보내고 `end` 도 `close` 도 하지 않는 응답자를 만나면 `finish` 가 영영 안 돌고, 그 접속은
vitest 의 5초 시험 시간 초과까지 매달린다.

**새로 생긴 모양인가 — 그렇다.** baseline 에는 이 리스너가 없었고, 리스너가 없으면 `emit` 이
거짓이라 `ws` 의 `abortHandshake` 가 **즉시** 던진다. 즉 이 지연 경로는 이 카드가 만들었다.

**왜 그럼에도 Low 인가.** (1) vitest 5초가 바깥에서 경계 짓는다. (2) 원 관측된 404 는 헤더와
본문이 7ms 안에 온 정상 응답이었다 — 이 병리적 응답자는 가정이지 관측이 아니다.

**그럼에도 적는 이유.** 그 경로에서는 `settled` 가 끝내 참이 되지 않아 **포획도 남지 않고**,
실패는 정확히 `Test timed out` — AC-005 조항 (3)이 금지하는 바로 그 모양 — 이 된다. 상주
관측자가 정작 이상한 응답자를 만난 순간 아무것도 남기지 못하는 갈래다.

**필요한 수리(선택).** `finish` 에 `setTimeout(finish, N).unref()` 한 줄을 더해 위쪽에서
경계 짓는다(모은 만큼만 기록하고 재수립). 배경 프로세스 스폰이 아니므로 §D-1 과 무관하다.

---

### F6 [Low] [optional] — 상주 관측자가 닫히는 카드의 보고 디렉터리에, 무시되지 않는 경로로 쓴다

`gateway.test.ts:81` 의 기록 자리는 `.moai/reports/t39/captures/` 로 **카드 번호가 박혀 있다.**
그런데 이 관측자는 `REQ-WSUPGRADE-013` 으로 **카드가 닫힌 뒤에도 영구히** 산다. 그리고
`git check-ignore .moai/reports/t39/captures/x.json` → `rc=1`(무시 대상 아님)이므로, 앞으로
어느 실행이 포획을 남기면 그것은 **닫힌 카드의 디렉터리에** 추적 대상 파일로 나타난다.

저장소의 「일괄 스테이징 금지」 규약이 사고를 막아 주지만, 상주물의 쓰기 자리가 종결된 카드에
매여 있는 것은 그 자체로 어긋남이다.

**필요한 수리(선택).** 후속 카드에서 기록 자리를 카드 중립 경로(예: `.moai/state/wsupgrade-captures/`)
로 옮기고 `.gitignore` 에 넣거나, 지금 자리를 명시로 무시 대상에 넣는다.

---

### F7 [Low] [optional] — `moai gate` 로그 20개가 전부 0바이트인데 그 한정이 기록에 없다

`ls -l m6/gate-*.log` → **20개 전부 크기 0**. 즉 20회 시행의 로그에는 «무엇이 돌았는지»가
한 글자도 없고, 「정상 gate 였다」의 근거는 **소요 시간 열 하나뿐**이다.

**이 감사는 그 시간 근거를 독립으로 재현했다** — 이 나무에서 `moai gate` 를 1회 돌려
`rc=0 dur=81s bytes=0`. 그래서 (가) 81초라는 값은 진짜이고 `m6` 의 열과 일치하며, (나) **0바이트
로그는 이 명령의 정상 거동**이지 드라이버 결함이 아니다. verdict.md §1 의 세 수(80×1·81×14·82×5)도
재계산으로 그대로 맞았다.

**남는 것 둘.** (1) 기록이 「로그가 비어 있어 어떤 검사가 돌았는지는 확인할 수 없다」를 한정으로
적지 않았다 — 시간만이 근거임을 적었을 뿐이다. (2) 더 중요한 파생 사실: 타입 오류 2건(F1)이 서
있는 상태에서 `moai gate` 가 `rc=0` 을 낸다. **`moai gate` 초록은 typecheck 초록의 증거가 아니다.**

**필요한 수리(선택).** verdict.md §1 에 「gate 로그는 전부 0바이트 — 검사 구성은 미확인, 근거는
소요 시간뿐」 한 줄을 더한다.

---

### F8 [Info] — 인계된 자리 수가 하나 어긋난다

디스패치가 「같은 파일의 다른 bare `new WebSocket` 자리 12곳」이라 전했으나 실측은 **11곳**이다
(`gateway.test.ts`). `gateway-v2.ts:30` 을 더해야 12가 된다. 판정에 영향 없음 — F3 에 바로잡아 적었다.

---

## 4. 검증한 인계 사항 (전달값을 그대로 받지 않고 다시 잰 것)

| 확인 대상 | 결과 |
|---|---|
| 생산 코드 0줄 | `git diff --name-only 620af7a..HEAD -- server/src/ channel/src/` → **무출력**. `git diff --stat` 도 `server/src`·`channel/src` 항목 없음 |
| 실패 재수립이 `try` **밖** | 확인. `} catch { … }` 로 포획 블록이 닫힌 **뒤** `res.socket.destroy()` + `ws.emit('error', new Error(\`Unexpected server response: ${res.statusCode}\`))` 두 줄이 온다(`gateway.test.ts` 리스너 말미). 포획이 실패해도 실패는 선다 — 1회차 CRITERION-FAILURE 의 닫힘 |
| 시행 수 | `m6/summary.txt` trial 행 **20** · `m3r2` `parallel-*` **20** · `serial-*` **20** — verdict.md §1·§2 및 progress §E.4 `trials_total: 60` 과 일치 |
| M6 시간 열 | 80초 1회 · 81초 14회 · 82초 5회 — verdict.md §1 의 세 수와 **정확히 일치**(`DONE` 행을 빼고 재계산) |
| AC-013 공허 통과의 분리 | **정직하다.** verdict.md §5 가 조항 (1) 통과 / 조항 (2) 전제 불성실을 갈라 적고 「AC-013 의 중심 물음은 이번 실행으로 행해지지 않았다」를 명시. progress §E.4 `ac013_hollow_pass:` 가 `clause_1_trial_count: PASS` / `clause_2_stop_rule: premise-unmet` 로 기계 판독 가능하게 갈랐고, CHANGELOG 도 「공허하게 통과했습니다」로 적었다. **평평한 “AC-013 PASS” 로 읽히는 자리를 찾지 못했다** |
| `미관측`·상한의 정직성 | **정직하다.** verdict.md §6 · progress §E.3 `comparison_verdict: 미관측` · §E.4 `terminal_state: 미관측` + `ceiling_scope: 나무 환경 … 한정` + `ceiling_not: p ≤ 1% 에는 161회` · CHANGELOG 제목이 「60회를 더 돌려도 다시 나오지 않았습니다」이고 본문 첫 줄이 **「이것은 수리가 아닙니다」**. 훑어 읽는 사람이 «고쳤다»로 읽을 자리를 찾지 못했다 |
| AC-007/008 의 목록 수 차이 | 어긋남 아님. `ac007-clean-verdict.txt`(297) → `ac007-final-verdict.txt`(333), `ac008` 298 → 329 이고, `mutations-round3.md` §최종 상태가 **「본 기록 파일까지 목록에 들어간 뒤의 값」**이라고 귀속을 달아 두 시점을 갈랐다 |
| 스위트 초록 | `Test Files 18 passed (18)` / `Tests 228 passed (228)`, exit 0 — progress §E.4 `suite_verification.observed` 와 **문자 그대로 일치** |
| 포획물 부재 | `ls .moai/reports/t39/captures` → `No such file or directory`(전수 실행 뒤). AC-014 (a) 성립 — 다만 전제 한정은 F2 |

---

## 5. 권고

1. **F1 을 고치고 재감사한다(차단).** 두 줄 + `npx tsc --noEmit` 무출력 확인. 재감사 범위는
   이 델타 하나로 좁힌다 — 나머지 판정은 이 회차에서 이미 섰다.
2. **F2·F3 을 함께 처리한다(권장, 비차단).** 둘 다 「기준·문서가 실제 잰 것보다 넓게 읽힌다」는
   같은 부류이고, 고칠 자리는 문장 셋(AC-014 전제 · `plan.md` §A-1 대가 · CHANGELOG 한 문장)이다.
   `REQ-WSUPGRADE-013` 의 값이 «앞으로의 모든 실행이 시행» 이라는 주장에 걸려 있으므로,
   그 주장의 폭을 정확히 적는 것이 이 카드의 유산을 지키는 일이다.
3. **F4 는 한 줄 표시로 끝난다(권장, 비차단).** 반증된 기제가 표시 없이 남는 것은 이 저장소가
   이미 여러 번 대가를 치른 부류다.
4. **F5·F6 은 후속 카드의 씨앗으로만 적는다(선택).** 이 카드는 수리를 설계하지 않는다
   (`REQ-WSUPGRADE-010`) — 상주 관측자의 상한과 기록 자리는 그 관측자를 손보는 별도 카드의 몫이다.
5. **F7 은 verdict.md 한 줄(선택).** 다만 파생 사실 — 「`moai gate` 초록은 typecheck 초록이
   아니다」 — 은 이 저장소 전체에 걸리는 값이므로 교훈으로 남길 만하다.

---

## 6. 이 감사가 재지 못한 것 (Gaps)

- **baseline 의 `tsc` 를 직접 돌리지 않았다.** F1 의 «새로 생겼다»는 blame + 「그 밖의 파일에
  오류 보고 없음」에서 세운 **추론**이다.
- **`moai gate` 가 무슨 검사를 도는지 확인하지 못했다.** 출력이 0바이트라 안을 볼 수 없었고,
  구성 파일을 추적하지 않았다. 확인한 것은 «81초 걸리고 `rc=0` 이며 typecheck 오류를 안 잡는다»뿐이다.
- **복제·대조를 다시 돌리지 않았다.** 60회를 재실행하지 않고 기록 파일의 행 수·시간 열을 셌다.
  `moai gate` 는 1회만 재현했다.
- **주 체크아웃 구성에 대해서는 아무것도 재지 않았다.** `p ≤ 13.9%` 의 나무 한정(§7-15 차3)은
  이 감사도 닫지 못한다.
- **F5 의 병리적 응답자를 만들어 보지 않았다.** 코드 독해에 의한 판단이며 실행 재현이 아니다.
- **채널 워크스페이스는 보지 않았다.** 이 카드의 착지물이 `server/test/` 셋뿐이기 때문이다.

## 7. 잔여 위험

- **관측된 것을 관측했다고 말할 수 있는 폭이 좁다.** 상주 관측자는 `wsConnect` 경로 하나만
  본다(F3). 원 실패가 그 경로에서 났으므로 현재로선 맞지만, 다른 자리에서 같은 서명이 나면
  관측자는 침묵한다 — 그리고 그 침묵은 「안 났다」와 구별되지 않는다.
- **`p ≤ 13.9%` 는 느슨하고 나무에 한정된다.** 이 카드가 그것을 명시로 적었다는 것이 이
  감사의 발견이지, 상한이 충분하다는 뜻이 아니다.
- **F1 을 고치는 커밋이 관측 코드를 건드린다.** `gateway.test.ts:223` 은 포획 경로 안이므로,
  수리 뒤에는 최소한 대상 시험 단독 실행 + 전수 스위트를 다시 초록으로 확인해야 한다.
- **`moai gate` 가 조용하다.** 0바이트·`rc=0`·타입 오류 미검출이 겹치면, 앞으로 이 게이트를
  근거로 인용하는 모든 주장이 실제보다 강하게 읽힐 수 있다.
