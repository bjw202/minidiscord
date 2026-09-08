# SPEC-E2ESCEN-001 sync 감사 보고서

| 항목 | 값 |
|------|-----|
| SPEC | `SPEC-E2ESCEN-001` (Tier M, 통과선 0.80) |
| 감사 시점 나무 | `main` @ `511b149` (run_base_sha `d98ad7b` 위 커밋 다섯) |
| 감사자 | sync-auditor (독립 재실행 — 구현자 증거를 인용하지 않고 전부 다시 돌렸다) |
| 감사 증거 디렉터리 | `.moai/state/verify/e2escen/audit/` |
| **총평 판정** | **PASS — 가중 조화평균 0.865** (통과선 0.80) |
| 차단 결함 | **0건** |
| 비차단·선택 결함 | 10건 (F1~F10) |

---

## 0. 쉬운 말 요약

이 SPEC 이 만든 것은 **서버를 실제로 띄워 놓고 봇 둘·방 둘·웹 관측자 하나를 흉내 내며 20단계를 밟는 두 번째 시험 러너**와, 두 러너가 나눠 쓰는 **공용 도우미 파일** 하나입니다. 저는 구현자가 적어 둔 증거를 믿지 않고 수용 기준 열다섯 개의 명령을 전부 제 손으로 다시 돌렸고, 결과는 **열다섯 개 모두 기준을 만족**했습니다(`npm test` 213/103 통과, 첫째 러너 15단계 통과, 둘째 러너 20단계 통과, 세 종료 코드 모두 0).

그런데 «단계 표지가 스무 줄 찍혔다» 는 것만으로는 **단언이 비어 있는 껍데기 러너**와 구분되지 않습니다. 그래서 러너의 단언 열네 곳을 일부러 틀리게 바꾼 사본을 만들어 돌려 봤습니다(변이 시험). **열한 곳은 즉시 붉어졌고**, 붉어지지 않은 세 곳은 붉어지지 않는 것이 정상인 자리였습니다. 즉 이 러너의 판정은 실제로 서버 동작에 닿아 있습니다.

구현자가 스스로 «미검증» 이라 밝힌 것 중 가장 중요한 주장 — «`@ts-ignore` 한 줄이 도우미의 타입 검사를 가리지 않는다» — 은 제가 도우미 파일 본문에 타입 오류를 심어 직접 확인했습니다. 오류가 **도우미 파일 자리에 그대로** 잡혔으므로 주장은 참입니다. 다만 구현자가 근거로 든 변이는 그 주장을 가르지 못하는 것이었고, 제 변이가 가릅니다(F6).

막힌 것은 없습니다. 남은 것은 문서·부기 성격의 자잘한 열 건이고, 그 중 어느 것도 병합을 막지 않습니다.

---

## 1. 차원 점수

채점 모드는 평면 가중치(profile `default`, `evaluator_mode: hierarchical` 미설정)입니다. 집계는 프로토콜에 따라 **가중 조화평균**입니다.

| 차원 | 점수 | 판정 | 증거 (명령 + 관측 원문) |
|------|------|------|--------------------------|
| Functionality (40%) | 90/100 | **PASS** (필수 통과) | `npm run e2e:scenario; echo $?` → `0` · 마지막 줄 `E2E-SCENARIO PASS — 20 단계 전부 통과 (봇 둘 · 방 둘 · 관측자 하나)` · 사다리 `ladder-ok` · 변이 14건 중 11건 사살 |
| Security (25%) | 90/100 | **PASS** (필수 통과) | `git diff --stat d98ad7b -- server/src web channel/src .github \| wc -l` → `0` · 비밀값·`shell: true`·`eval` grep 0건 · `npm audit --omit=dev` moderate 1건(기존) |
| Craft (20%) | 75/100 | PASS(임계 아님) | 두 러너 합산 함수 커버리지 `e2e-lib.mts` **80.6%** (50/62), `e2e-scenario.mts` 95.7% (111/116) · `tsc --noEmit` strict 종료 0 |
| Consistency (15%) | 90/100 | PASS | `runScenarios`~파일끝 217줄이 `d98ad7b` 와 **바이트 동일**(`diff` 종료 0) · `step()` md5 동일 · `package-lock.json` 무변경 |

**집계** — 1 / (0.40/0.90 + 0.25/0.90 + 0.20/0.75 + 0.15/0.90) = 1 / 1.15556 = **0.8654**

**필수 통과 방화벽** — Functionality·Security 두 차원이 각자 통과선을 독립으로 넘었고 Critical/High 결함이 0건이므로 방화벽에 걸리지 않습니다.

### 1.1 감도표 (어느 점수가 판정을 뒤집는가)

Craft 가 이 카드의 지렛대이므로 미리 밝힙니다.

| 가정 | 집계 | 판정 |
|------|------|------|
| 지금 값 (F .90 / S .90 / C **.75** / Cons .90) | 0.865 | PASS |
| Craft 를 0.50 으로 내리면 | 0.776 | **FAIL** |
| Functionality 를 0.75 로 내리면 | 0.812 | PASS(가까스로) |
| Functionality 0.75 **그리고** Craft 0.50 | 0.729 | FAIL |

즉 판정은 **Craft 를 0.75 로 볼 것인가 0.50 으로 볼 것인가**에 걸려 있습니다. 근거는 §4.3 에 따로 적었습니다 — 앵커 «Coverage >= 80%» 를 만족하는 실측치(80.6%)가 있어서 0.75 로 두었고, 만약 블록(분기 포함) 수치 71.4% 를 기준 삼으면 앵커는 0.50 이 되어 판정이 뒤집힙니다. 이 갈림을 감추지 않고 드러냅니다.

---

## 2. 수용 기준 재실행 결과 (AC-001~015)

모든 명령은 제가 이 나무(`511b149`)에서 직접 돌렸고 출력은 `.moai/state/verify/e2escen/audit/` 에 남아 있습니다.

| AC | 판정 | 명령과 관측 원문 |
|----|------|------------------|
| AC-001 | PASS | `diff b.txt a.txt \| wc -l` → `0` (구현자 baseline `e2e-before.txt` 대 **내가 새로 돌린** `e2e-after.txt`, 포트 가림) · `cat before.exit after.exit` → `0` `0` · `grep -c "from './e2e-lib.mts'"` → `1` · 지역 도우미 정의 → `0` · `grep -c '^\[[0-9]*/15\]$'` → `15` · 마지막 줄 `E2E PASS — 15 단계 전부 통과 (봇 하나 · 방 둘)` |
| AC-002 | PASS | `cd server && npx vitest run test/e2e-lib.test.ts` → 종료 0, `Test Files 1 passed (1)` / `Tests 3 passed (3)` · `grep -c "^\s*it(" server/test/e2e-lib.test.ts` → `3` |
| AC-003 | PASS | `npm run e2e:scenario; echo $?` → `0` · 사다리 `ladder-ok` · `tail -n 2` → `[elapsed] 13815 ms` / `E2E-SCENARIO PASS — 20 단계 전부 통과 (봇 둘 · 방 둘 · 관측자 하나)` · 점유 포트 강제 → 종료 `9` · `grep -c '^\[boot-timeout\]$' boot.txt` → `1` |
| AC-004 | PASS | 표지 `[2/20]`~`[5/20]` 착지 + 변이 M1(§3) 이 (ㄱ) 단언을 사살로 확인 · (ㄷ) 의 `expectQuiet` 는 역방향 탐침 M8 로 비공허성 확인 |
| AC-005 | PASS | 표지 `[6/20]`~`[8/20]` · `e2e-scenario.mts:206-209` 에 전달 열 `['to','to','to','to','to','cc']` 와 소켓별 `A=to,to,cc`·`B=to,to,to` 단언 실재 · 봇 글 6·강등 안내 1 단언 실재 · 변이 M2 사살 |
| AC-006 | PASS | 표지 `[9/20]` · `:270-291` 에 글마다 `hits.length === 1`·작성자 대조·첨부 `[{id,filename}]`·`stored_path` 부재·`bot_status` 순서 단언 실재 · 변이 M5 사살 |
| AC-007 | PASS | 표지 `[11/20]`~`[15/20]` · (ㄱ)~(ㅁ) 각 라벨의 `assert` 실재(§증거 `audit/assert-inventory.txt`) · 변이 M12 사살 · (ㅂ) 관측 항목 1줄 |
| AC-008 | PASS | 표지 `[10/20]` · 다섯 필터 상수 499·499·10·3·500 단언 실재 · 변이 M3·M4·M9·M10 네 건 전부 사살 |
| AC-009 | PASS | 표지 `[16/20]`~`[18/20]` · `nB` 실측 **4** (SPEC 이 예고한 «G1 B 답 1 + G2 ②④⑥ = 4» 와 일치, 변이 M13 의 실패 문구 `«(삭제된 봇)» 이 4 이 아니다 — 4 · B 0` 가 그 수를 노출) · 변이 M14 사살 |
| AC-010 | PASS | `grep -c '^\[observe\] '` → `8` · 여덟 이름 각각 `1` · `grep -c '^\[observe-summary\] 8 items$'` → `1` · 출력에 «결함»·«bug» → `0` |
| AC-011 | PASS | (a) 관측값 부정 변이 → 종료 `0` · 표지 20줄 · `ladder-ok` · `[observe] permission.no-expiry: {"unanswered":20,"consumed":true,"first_still_resolves":false}` · (b) G1 (ㄱ) `'to'`→`'cc'` 변이 → 종료 `1` · `[fail]` 정확히 1줄 · 표지 `[1/20]` 에서 멈춤 · (c) `awk '/function observe\(/,/^}/' … \| grep -c 'assert(\|fail('` → `0` |
| AC-012 | PASS | (1) `0` · (2a) `0` · (2b) `0` · (3) `1` · (4) `1`(실패 종료 `boot.txt` 에서도) · (5) `0` |
| AC-013 | PASS(필수 절반) | `grep -c '^\[skip\] G7' scenario.txt` → `1`, 종료 코드 `0`. 나머지 절반은 **M7 미착수 — §G ⑥**(운영자 결정 2026-09-08)로 `progress.md` 에 기록돼 있음 — DoD 가 허용한 형태 |
| AC-014 | **조건부 PASS** | (0) `run_base_sha` 있음 · (1) `git diff --stat d98ad7b -- server/src web channel/src .github \| wc -l` → **`0`** · (2) **문자 그대로는 초록이 아님** — 나무에 허용 집합 밖 9줄. 커밋된 diff(`git diff --name-only d98ad7b HEAD`)는 전부 허용 집합 안. → **F1** |
| AC-015 | PASS | `npm test` → 종료 `0`, server `Tests 213 passed (213)`, channel `Tests 103 passed (103)` · `npm run e2e` → `0` · `npm run e2e:scenario` → `0`. 셋을 **차례로** 돌렸음(동시 실행 없음). 기준선 210 → 213 = `it` 셋만큼 정확히 증가 |

### 2.1 감사자 자신의 오류 하나 (기록)

AC-003 (2) 의 사다리 검사를 저는 처음에 `awk -F'[/\[\]]'` 로 옮겨 적었고 `ladder-broken` 이 나왔습니다. `acceptance.md` 에 실린 **원문 그대로**(`-F'[/\\[\\]]'`) 돌리면 `ladder-ok` 이고, 문서와 무관한 독립 검사(`tr -d '[]' | awk -F/ …`)도 `ladder-ok rows=20 N=20` 입니다. 러너의 결함이 아니라 제 옮겨 적기의 결함입니다 — 인용된 명령은 인용된 형태 그대로 돌려야 한다는 것을 다시 확인했습니다.

---

## 3. 변이 시험 — 표지 사다리가 껍데기가 아님을 잰다

사본은 저장소 뿌리 **바로 아래** `audit-mut/` 에 두고(러너가 자기 파일 위치에서 `PROJECT_ROOT` 를 역산하므로 두 단계 아래에 두면 서버를 못 찾습니다), 실행 뒤 지웠습니다. 원본은 한 글자도 건드리지 않았고, 마무리 뒤 `git status --short -- scripts server package.json` 이 **비어 있음**을 확인했습니다.

| # | 변이 | 결과 | 판독 |
|---|------|------|------|
| M1 | G1 (ㄱ) `f2.delivery === 'to'` → `'cc'` | 종료 `1` · 표지 1 · `[fail] step2 G1 (ㄱ) B 가 받은 프레임이 A 의 to 봇 글이 아니다` | **사살** (= AC-011 (b) 독립 재현) |
| M2 | G2 ⑦ `f7.delivery === 'cc'` → `'to'` | 종료 `1` · 표지 6 · `[fail] step7 G2 ⑦ 이 cc 로 내려가지 않았다 — system 글이 연속을 끊었다` | **사살** |
| M3 | since_id 기대를 `baseMsgs.slice(-10)` → `slice(-11)` | 종료 `1` · 표지 9 · `[fail] step10 (ㄴ) since_id 필터가 마지막 10 과 다르다 — 10` | **사살** (`sameIds` 가 살아 있음 — 길이만 보는 단언이 아니다) |
| M4 | `speaker:'A'` 기대 499 → 500 | 종료 `1` · 표지 9 · `[fail] … speaker A 가 499 가 아니다 — 499` | **사살** |
| M5 | SSE `includes('stored_path') === false` → `true` | 종료 `1` · 표지 8 · `[fail] step9 G3 (ㄷ) 관측자 기록에 stored_path 가 실렸다` | **사살** |
| M6 | `humanRow.created_at > fillLast.created_at` 단언 제거 | 종료 `0` · 표지 20 | **생존 — 설계대로.** 이 단언은 «초 넘김이 실패했을 때 조용히 통과하지 않게» 하는 진단 그물이라, 초 넘김이 성공한 정상 실행에서는 가를 것이 없다 |
| M7 | G1 (ㄷ) 의 `expectQuiet(A.ws, …)` 한 줄 삭제 | 종료 `0` · 표지 20 | **생존 — 구조적.** 부재 관측은 규약을 지키는 서버 위에서는 지워도 붉어질 수 없다. 비공허성은 아래 M8 이 잰다 |
| M8 | 같은 자리를 `nextFrame(…, 700ms)` 로 **뒤집음**(프레임이 와야 통과) | 종료 `1` · 표지 3 · `[fail] AUDIT converse step4 A frame — 시한 안에 해당 프레임이 오지 않았다` | **사살(역방향).** 그 자리의 침묵은 실재하며 `expectQuiet` 가 진짜 빈 통로를 보고 있다 |
| M9 | 걸음 첫 응답 480 → 479 | 종료 `1` · 표지 9 · `[fail] … 밀린 480 걸음의 첫 응답이 480 이 아니다 — 480` | **사살** |
| M10 | `byLimitHuge.messages[499]` → `[498]` | 종료 `1` · 표지 9 · `[fail] step10 (ㄴ) limit 9999 가 500 으로 잘리지 않았다 — 500` | **사살** |
| M11 | `first_still_resolves: firstStillResolves` → `!firstStillResolves` | 종료 `0` · 표지 20 · `ladder-ok` | **생존 — 의도된 것** (= AC-011 (a) 독립 재현: 관측 항목은 판정에 닿지 않는다) |
| M12 | G4 (ㄱ) deny 판정 수 `=== 1` → `=== 2` | 종료 `1` · 표지 10 · `[fail] step11 G4 (ㄱ) B 의 deny 판정이 정확히 하나가 아니다` | **사살** |
| M13 | 봇 삭제 뒤 «(삭제된 봇)» 수 `=== nB` → `=== nB + 1` | 종료 `1` · 표지 16 · `[fail] … «(삭제된 봇)» 이 4 이 아니다 — 4 · B 0` | **사살** |
| M14 | 재전송 id 열 `[replay1, replay2]` → `[replay2, replay1]` | 종료 `1` · 표지 17 · `[fail] step18 (ㄷ) 재전송 두 프레임의 id 열이 저장된 둘과 다르다` | **사살** |

**합계 — 14건 중 11건 사살, 3건 생존(전부 생존이 정답인 자리).** 변이의 축은 여덟 단계(2·7·9·10·11·16~17·18)와 여섯 종류(전달 구분·필터 상수·집합 동일성·SSE 기록·권한 판정 수·재전송 순서)에 걸쳐 있습니다. 이 축 목록이 곧 «러너의 판정이 실제로 서버에 닿는다» 는 주장의 범위입니다 — 축 밖(예: G3 (ㅁ) 되찾기, G6 관측 셋)은 이 감사에서 변이로 재지 않았습니다.

구현자가 남긴 변이 두 건(`mut-a/mutation.diff`·`mut-b/mutation.diff`)은 제 M11·M1 과 **같은 자리·같은 형태**였고, 결과도 재현됐습니다.

---

## 4. 지목된 편차 넷의 검증

### 4.1 `@ts-ignore` 가 도우미의 strict 검사를 가리는가 — **가리지 않는다 (직접 확인)**

`server/tsconfig.json` 은 `outDir: "dist"` 를 두고 `include: ["src","test"]` 이므로 `rootDir` 이 `server/` 로 추론되고, `server/test/e2e-lib.test.ts` 가 `../../scripts/e2e-lib.mjs` 를 import 하는 자리에 TS6059 가 뜹니다. 그래서 그 줄에 `@ts-ignore` 가 붙어 있습니다.

억제되는 것이 «배치 불평 하나» 인지, «도우미 파일 전체» 인지가 쟁점입니다. **도우미 본문에 타입 오류를 심어** 갈랐습니다.

```
$ perl -0pi -e "…listMessages 본문 첫 줄에 const auditProbe: number = 'not a number' 삽입…" scripts/e2e-lib.mts
$ cd server && npm run typecheck
../scripts/e2e-lib.mts(330,9): error TS2322: Type 'string' is not assignable to type 'number'.
npm error code 1
```

오류가 **도우미 파일 자신의 좌표**(`../scripts/e2e-lib.mts(330,9)`)에 잡혔습니다 → `pretest` 는 도우미 본문을 strict 로 검사합니다. **구현자의 주장은 참입니다.** 기준선(`npm run typecheck` 무변이) 은 종료 0 이고, 변이 뒤 원본을 되돌려 `git diff --stat -- scripts/e2e-lib.mts` 가 비어 있음을 확인했습니다.

다만 구현자가 근거로 인용한 변이(`QUIET_MS: string`)는 이 주장을 **가르지 못합니다** — 제가 같은 변이를 돌리자 오류가 도우미가 아니라 시험 파일에 떴습니다:

```
$ (QUIET_MS 를 string 으로) cd server && npm run typecheck
test/e2e-lib.test.ts(31,34): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number | bigint'.
```

즉 그 변이는 «export 된 타입이 시험 파일로 흐른다» 만 보이고 «도우미 본문이 검사된다» 는 보이지 않습니다. → **F6** (주장은 참이나 인용된 근거가 판별력이 없음).

### 4.2 M2~M6 의 RED 가 하나뿐인 것 — 사실이며, 사후로 메워졌다

`.moai/state/verify/e2escen/` 안의 RED 증거는 `m1-red.txt`·`m3-red.txt`·`m3b-red.txt` 뿐이고 M4·M5·M6 각각의 «첫 실행이 그 자리에서 멈춤» 기록은 없습니다. 구현자가 자진 신고한 그대로입니다. 다만 §3 의 변이 열넷이 M4(step9)·M5(step11)·M6(step10·16~18) 구간의 단언이 실제로 붉어진다는 것을 **사후 실측**으로 보였으므로, «그 단계의 단언이 비어 있을 위험» 은 남지 않습니다. → **F9** (정보)

### 4.3 `timeout` 부재 — 재현되며, 대체 형태가 바깥 시한을 준다

```
$ command -v timeout gtimeout
(출력 없음)
$ ls /opt/homebrew/opt/coreutils/libexec/gnubin/timeout
ls: … No such file or directory
```

이 기계에 `timeout` 이 없다는 구현자 신고는 재현됩니다. 저도 같은 우회(node 내부 자체 종료 타이머)를 쓰되 **60초 자체 종료 + 실행 뒤 명시적 `kill` + `kill -0` 로 소멸 확인**을 붙였습니다. 결과 `AC-003(4) exit=9`·`(5) 1`·`AC-012(4) 1`. 점유 프로세스는 감사 종료 시점에 존재하지 않습니다(`kill: no such process`). 배경 부하를 남기지 않았습니다.

### 4.4 `spawnChannel()` 미실행 — 사실이며, 그 함수는 **도달 불가**다

```
$ grep -rn "spawnChannel" --include='*.mts' --include='*.ts' . | grep -v node_modules
scripts/e2e-lib.mts:80:export function spawnChannel(token: string, serverUrl: string): ChildProcess {
```

코드에서 이 함수를 **부르는 자리가 하나도 없습니다**. `e2e-scenario.mts` 의 import 목록에도 없고, `--with-channel` 을 주어도 다음 한 줄만 찍고 지나갑니다:

```
scripts/e2e-scenario.mts:661:  if (process.argv.includes('--with-channel')) {
scripts/e2e-scenario.mts:662:    console.log('[skip] G7 — --with-channel 은 M7 미착수 (plan.md §G ⑥)')
```

따라서 AC-012 (5) 의 `grep -v 'spawnChannel('` 예외는 **지금은 공허**하고(시나리오 파일에 그 이름 자체가 없다), `plan.md` §B.6 이 적은 «시나리오 파일에 `spawn(` 이 나타나지 않게 하려고 `spawnChannel` 을 `e2e-lib.mts` 에 둔다» 는 설계 근거는 아직 시험된 바 없습니다. → **F3**, **F10**

---

## 5. plan.md §B 결정 대 코드 대조

| 결정 | 대조 결과 |
|------|-----------|
| §B.1 배치 (채우기 전 셋 → 500 → 초 넘김 → 사람 1) | **일치.** `FILL = 500` (`:31`), 초 넘김은 `pollUntil` 시한 1,100 ms(`'step10 벽시계 초가 1,100ms 안에 넘어가지 않았다'`), 기준 집합 500 단언(`:362`), 방 전체 `roomTotal = 3 + FILL + 1` = 504. 관측 `history.cursor-walk` 가 `{"backlog":504,"limit":100,"steps":1,"missed_ids":404}` 로 §G ① 의 입력을 실측 |
| §B.4 관측 격리 | **일치.** `observe()` 본문 `assert(`·`fail(` **0건**, 변이 M11 이 종료 코드에 닿지 않음을 실증 |
| §B.5 되먹임 수 표 | **일치.** `:206-209` 가 `['to','to','to','to','to','cc']` 와 소켓별 `A=to,to,cc`·`B=to,to,to` 를 단언하고, `:216-217` 이 봇 글 6·강등 안내 1 을 단언. ⑦ 뒤 안내 2 도 `:229` |
| §B.6 `step` 은 뽑지 않는다 | **일치.** `grep -cE 'function step\(' scripts/e2e-lib.mts` → `0`. 두 러너가 각자 `step` 을 든다 |
| AC-012 시한 규율 | **일치.** 시나리오 파일 `while (true)`/`for (;;)` 0 · 날것 `setTimeout(` 0 · `setInterval(`/`spawn(` (허용 밖) 0 · `server/src` import 0(세 파일 모두) |

`scripts/e2e.mts` 불변 검사:

```
$ git diff --stat d98ad7b -- scripts/e2e.mts
 scripts/e2e.mts | 237 +++----------------------------
 1 file changed, 10 insertions(+), 227 deletions(-)
$ diff <(git show d98ad7b:scripts/e2e.mts | awk '/^async function runScenarios\(/,0') \
       <(awk '/^async function runScenarios\(/,0' scripts/e2e.mts)
(차이 없음, 종료 0 — 양쪽 217줄)
$ (step 함수 md5)  7ef37a14a5338789496d72d215aeb65b  /  7ef37a14a5338789496d72d215aeb65b
```

추가 10줄은 **import 블록 + 재수출 한 줄**뿐이고, `runScenarios`·`step`·`main`·마지막 줄은 바이트 동일합니다.

---

## 6. progress.md §E.2 / §E.3 주장 대조

| 주장 | 내 관측 | 판정 |
|------|---------|------|
| `npm test` server 213 / channel 103, failed 0 | 동일 (`Tests 213 passed (213)` / `Tests 103 passed (103)`, 종료 0) | 일치 |
| 기준선 210 → 213, `it` 셋 | `it` 3개 확인, 증가분 3 | 일치 |
| 관측 항목 8 · `[observe-summary] 8 items` | 동일 | 일치 |
| `[elapsed]` 14,098 ms (재실행 14,677) | 내 실행 **13,815 ms** | 기계 실측 차이 — 일치로 본다 |
| `bots.delete-while-connected-close-ms` 6 ms | 내 실행 **5 ms** | 관측 항목(단언 아님) — 일치 |
| `protected_paths_diff_lines: 0` | `0` | 일치 |
| `ac_pass_count: 14` / `ac_partial_count: 1` / `ac_fail_count: 0` | 동일 | 일치 |
| `run_commits: [56815bc, c4f778e]` | **불일치.** 두 SHA 는 객체로는 존재하나 `git merge-base --is-ancestor <sha> HEAD` 가 **NO**(워크트리 커밋). main 에 착지한 것은 `ee40b40`·`ec4f3c1` 이고 `run_base_sha` 위 커밋은 **다섯**(`+ b7e94fd`·`b430cee`·`511b149`) | → **F2** |
| `total_run_phase_files: 6` | 커밋된 코드·설정 파일은 5(`e2e-lib.mts`·`e2e-scenario.mts`·`e2e.mts`·`package.json`·`e2e-lib.test.ts`) + SPEC 문서 5 + 증거 파일 다수 | 세는 기준이 다를 뿐 — 결함 아님 |
| `.moai/state/verify/e2escen/` 안 파일 수를 «규칙» 으로만 적었다 | 옳은 처리(자기를 세는 계수를 피함) | 좋음 |

---

## 7. 결함 목록 (구조화된 defect-list)

차단 결함은 없습니다. 아래는 전부 비차단이며, 확신도와 추정 심각도를 함께 적었습니다.

- **F1** [medium] [optional] [확신 high] `.moai/specs/SPEC-E2ESCEN-001/acceptance.md:AC-E2ESCEN-014 (2)` — 기준 명령 `git diff --name-only d98ad7b | sort` 가 **작업 나무**를 보므로, 세션 하네스가 쓰는 파일 9줄이 허용 집합 밖에 뜬다: `.claude/agent-memory/{manager-spec,plan-auditor,sync-auditor}/MEMORY.md` · `.claude/settings.json` · `.moai/config/sections/llm.yaml` · `.moai/harness/usage-log.jsonl` · `.moai/lessons-inbox.jsonl` · `.moai/logs/agent-model-audit.jsonl` · `.moai/logs/trace-*.jsonl`. 커밋된 diff(`git diff --name-only d98ad7b HEAD`)는 **전부 허용 집합 안**이고 보호 경로 diff 는 0 줄이므로 기준의 **의도**는 만족된다. — **필요한 수리**: 기준 명령을 `git diff --name-only <base> HEAD` 로 좁히거나, 허용 갈래에 `.claude/**`·`.moai/logs/**`·`.moai/harness/**`·`.moai/lessons-inbox.jsonl` 같은 «세션 부기» 경로를 명시할 것.
- **F2** [low] [optional] [확신 high] `.moai/specs/SPEC-E2ESCEN-001/progress.md` §E.3 `run_commits` — 워크트리 SHA 둘을 적었으나 둘 다 `HEAD` 의 조상이 아니고, 실제 착지 커밋은 다섯이다. 재현하려는 사람이 그 SHA 를 `main` 에서 풀 수 없다. — **필요한 수리**: `ee40b40`·`ec4f3c1`·`b7e94fd`·`b430cee`·`511b149` 다섯으로 갱신하거나 «워크트리 SHA(미푸시)» 라고 명시할 것.
- **F3** [low] [optional] [확신 high] `scripts/e2e-lib.mts:80` `spawnChannel()` — 저장소 어디에서도 호출되지 않는 도달 불가 코드. 그 결과 `acceptance.md:203` 의 `grep -v 'spawnChannel('` 예외가 현재 공허하고, 함수의 런타임 동작이 미검증이다. — **필요한 수리**: M7 카드(§G ⑥)에 «호출부 없음·미실행» 을 명시하거나, M7 착수 시점까지 함수를 지우고 그때 도입할 것.
- **F4** [low] [optional] [확신 high] `scripts/e2e-lib.mts` — 외부 소비자가 없는 export 다섯: `PROJECT_ROOT`(`:16`)·`BOOT_TIMEOUT_MS`(`:18`)·`POLL_INTERVAL_MS`(`:19`)·`EXIT_BOOT_TIMEOUT`(`:24`)·`spawnChannel`(`:80`). 모듈 안에서만 쓰인다. — **필요한 수리**: 내부 상수는 `export` 를 떼거나, 둘째 러너가 앞으로 쓸 자리를 주석으로 남길 것.
- **F5** [low] [optional] [확신 medium] `.moai/specs/SPEC-E2ESCEN-001/acceptance.md:200` AC-012 (2b) — 화이트리스트가 부분 문자열 대조라 이름이 화이트리스트 토큰으로 끝나는 도우미(`await capi(x)` 형태)가 조용히 빠져나간다(실측: `await capi(x)` 는 필터에서 사라지고 `await unguarded(y)` 만 남았다). 판별력 자체는 있다 — 사본에 `await unguardedThing()` 을 심으면 1건으로 잡힌다. — **필요한 수리**: 화이트리스트를 `await (withDeadline|nextFrame|…)\(` 로 앵커하거나 휴리스틱임을 문서에 적을 것.
- **F6** [low] [optional] [확신 high] `server/test/e2e-lib.test.ts:10` 주석 / `progress.md` §E.2 잔여 위험 — 인용된 타입 변이(`QUIET_MS: string`)는 «도우미 본문이 strict 로 검사된다» 를 가르지 못한다(오류가 시험 파일에 TS2345 로 뜬다). 주장 자체는 참이며 근거는 도우미 본문 변이(`../scripts/e2e-lib.mts(330,9): error TS2322`)다. — **필요한 수리**: 주석과 §E.2 의 인용 변이를 «도우미 본문에 심은 오류» 로 바꿀 것.
- **F7** [low] [optional] [확신 high] 저장소에 eslint/prettier 설정이 없다(`ls .eslintrc* eslint.config.* .prettierrc*` → 없음). 일관성의 기계적 근거가 `tsc --noEmit` 하나뿐이다. — **필요한 수리**: 이 SPEC 범위 밖. ROADMAP 후속 후보로 올릴지 별도 판단.
- **F8** [low] [optional] [확신 high] `npm audit --omit=dev --audit-level=high` → `qs 2.2.5 - 6.15.3` moderate 2건(1 moderate severity vulnerability). **이 SPEC 이 들여온 것이 아니다** — `package-lock.json` 은 `d98ad7b` 대비 무변경. — **필요한 수리**: 별도 카드.
- **F9** [info] [optional] [확신 high] M2~M6 의 RED 증거가 `m3-red.txt` 하나뿐. §3 의 변이 열넷이 사후로 그 공백을 메운다. — **필요한 수리**: 없음(기록).
- **F10** [info] [optional] [확신 high] `scripts/e2e-scenario.mts:661-662` — `--with-channel` 플래그를 주면 «M7 미착수» 한 줄만 찍고 종료 코드 0. 플래그가 받아들여지지만 아무 일도 하지 않는다(정직한 표기이나, 플래그 유무 두 경로가 같은 `[skip] G7` 접두를 쓰므로 AC-013 의 `grep -c '^\[skip\] G7'` 는 두 경로를 가르지 못한다). — **필요한 수리**: M7 착수 시 플래그 경로를 실제 동작으로 바꾸고 AC-013 의 나머지 절반을 열 것.

---

## 8. 미검증 (Gaps) — 명시적으로 재지 않은 것

1. **M7(`--with-channel`) 절반 전체** — 잘림 표시·큰 id 먼저 버림·cursor 재수신은 관측된 바 없다(운영자 결정으로 미착수).
2. **`spawnChannel()` 의 런타임 동작** — 한 번도 실행되지 않았고 호출부도 없다(F3).
3. **statement/line 커버리지** — `c8 report` 가 tsx 전사 소스와 매핑되지 않아 `0/0` 을 냈다(두 번 시도). 대체로 raw V8 기록에서 **함수·블록** 수치를 직접 계산했다(§4.3·아래). 이 SPEC 의 커버리지 수치는 «statement» 가 아니라 «함수/블록» 임을 밝힌다.
4. **서버 프로세스 쪽 커버리지** — 러너가 띄운 별도 서버 프로세스의 실행 커버리지는 측정하지 않았다. 다만 이 SPEC 은 `server/src` 를 0 줄 바꿨다.
5. **재실행 분산(플래키)** — 이 감사에서 둘째 러너의 전체 초록을 **5회** 관측했지만(본 실행 1 + 변이 M6·M7·M11 각 1 + 커버리지 실행 1) 통계적 분산은 재지 않았다.
6. **CI 편입 없음**(운영자 결정) — 따라서 AC-001 의 diff 그물(도우미 수정이 첫째 러너 출력을 조용히 가르는 것을 잡는 유일한 장치)은 **사람이 돌려야만** 작동한다.
7. **부하 걸린 기계에서의 시간 의존 단계** — 초 넘김(≤1,100 ms)·침묵 창(600 ms)·500개 채우기의 `pollUntil`(60초)은 한산한 기계에서만 쟀다.
8. **변이 축 밖의 단언** — G3 (ㅁ) 되찾기, G4 (ㄴ)(ㄷ)(ㅁ), G6 관측 셋의 주변 단언은 변이로 재지 않았다(라벨 실재만 확인).
9. **sync 단계 몫의 DoD 셋** — `ROADMAP.md` 에 §G ①~⑥ 이 아직 없고(`grep -n '후속 후보' ROADMAP.md` → `177`행 표만 존재), OD-6 행(`ROADMAP.md:186`)에 `[elapsed]` 실측값이 없으며, `spec.md` frontmatter `status` 가 아직 `in-progress` 다. run 단계는 «ROADMAP 은 sync 몫» 이라 손대지 않았다고 명시했으므로 **run 산출물의 결함이 아니라 남은 sync 작업**으로 분류한다.

**커버리지 실측 원문** (raw V8 기록, 두 러너 합산):

```
e2e-lib.mts       functions 50/62   80.6%   |  blocks 75/105  71.4%
e2e-scenario.mts  functions 111/116 95.7%   |  blocks 162/196 82.7%
e2e.mts           functions 35/40   87.5%   |  blocks 36/49   73.5%
(인프로세스 시험 단독:  e2e-lib.mts  functions 14/58 24.1% · statements 53/209 25.4%)
```

---

## 9. 잔여 위험 (Residual-risk)

- **`e2e-lib.mts` 공유가 첫째 러너를 조용히 가를 수 있다.** AC-001 의 diff 검사가 그물이지만 CI 에 없다(Gap 6). 앞으로 도우미를 고치는 사람이 이 검사를 돌리는 것을 잊으면, 첫째 러너의 출력 변화가 아무 신호 없이 지나간다.
- **시계 의존 단계.** 초 넘김이 1,100 ms 안에 일어나지 않으면 step10 이 붉어진다. 실패가 «채우기 #500 보다 뒤» 단언에서 먼저 잡히도록 순서가 잡혀 있어 조용히 통과하지는 않는다(변이 M6 이 그 단언이 정상 경로에서는 가르지 않음을 보였고, 이는 설계와 일치한다).
- **`expectQuiet` 는 600 ms 창 안의 부재만 본다.** 늦게 오는 프레임은 다음 단계 큐에 남아 다른 자리에서 붉어진다 — 관측이 늦는 쪽으로만 틀린다.
- **부하 상태의 500개 채우기**가 `pollUntil` 시한(60초)에 닿을 수 있다.
- **커버리지 지표의 해석 폭.** 함수 80.6% 와 블록 71.4% 사이에서 Craft 앵커가 0.75 와 0.50 으로 갈리고, 그 갈림이 총평을 PASS(0.865)와 FAIL(0.776)로 가른다(§1.1). 이 카드는 그 경계 근처에 있다.

---

## 10. 권고

1. **F1 을 먼저 닫을 것** — AC-014 (2) 의 기준 명령에 `HEAD` 를 붙이거나 허용 갈래에 세션 부기 경로를 더한다. 지금 형태로는 이 기준이 **다음 감사에서도 반드시 붉게** 나오며, «붉은데 무시해도 되는 기준» 은 시간이 지나면 진짜 위반을 가린다.
2. **F2 를 닫을 것** — §E.3 의 `run_commits` 를 착지 SHA 다섯으로 갱신한다(재현 가능성).
3. **F6 을 닫을 것** — `@ts-ignore` 의 안전성 근거를 «도우미 본문 변이» 로 교체한다. 지금 인용된 근거는 그 주장을 가르지 못한다.
4. **sync 단계 잔여 작업 셋** — `ROADMAP.md` 후속 후보 표에 §G ①~⑥ 추가, OD-6 행에 `[elapsed]` 실측(이 감사 실측 **13,815 ms**, 구현자 실측 14,098 ms — 어느 쪽을 적든 «어느 기계·어느 실행» 을 함께 적을 것), `spec.md` `status: completed`.
5. **F3·F4 는 M7 카드와 함께 처리** — 지금 지우든 그때 도입하든, «호출부 없는 export» 상태를 문서에 명시한다.
6. **CI 편입 판단의 입력값** — 둘째 러너 13.8~14.7초, 첫째 러너와 합쳐도 30초 미만. Gap 6 이 지적한 그물의 부재를 감안하면 CI 편입은 비용 대비 효익이 큰 쪽으로 보이나, 이는 운영자 결정 사항이며 이 감사는 권고에 그친다.

---

*이 보고서의 모든 수치는 감사자가 `main` @ `511b149` 에서 직접 실행한 명령의 출력이다. 원문은 `.moai/state/verify/e2escen/audit/` 에 있다. 감사 중 추적 대상 파일은 한 건도 변경되지 않았다 — 변이 실험은 전부 사본에서 돌렸고, 마무리 시점 `git status --short -- scripts server package.json ROADMAP.md .moai/specs` 가 비어 있음을 확인했다.*
