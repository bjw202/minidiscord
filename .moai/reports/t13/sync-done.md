# card t13 — sync 단계 종료 보고

| 항목 | 값 |
|---|---|
| 카드 | t13 — 커버리지 도구 도입 (server) |
| SPEC | **SPEC-COVERAGE-001** (version 0.2.0, status **in-progress → completed** 전이) |
| 워크트리 | `.claude/worktrees/t13`, 브랜치 `WT-coverage-tool` |
| 판독 기준 | run 종료 시점 HEAD `4222a55` (디스패치가 지목한 `9b86dd8` 은 한 커밋 낡은 값이었다 — 아래 §1) |
| sync 커밋 | `1cd94ad1809618b2563ba06392a54ad4524c177c` |
| 감사 판정 | `sync-auditor --deep` → **PASS 85.2**, 차단 0건 (`.moai/reports/t13/sync-audit.md`) |
| 증거 원문 | `.moai/specs/SPEC-COVERAGE-001/progress.md` §E.4 · 로그 `.moai/state/verify/t13-sync/` |

---

## 0. 쉬운 말 요약

`server` 워크스페이스에 커버리지 측정 명령이 서고 85% 임계가 기계로 강제되는 변경이 run 단계에서 착지했고, 이 sync 단계는 그것을 문서에 반영하고 독립 감사를 붙여 카드를 닫았다. 감사는 **PASS 85.2, 차단 0건**을 냈다.

그 과정에서 감사가 이 카드의 핵심 방어물에 뚫린 구멍 하나를 실측으로 찾아냈다 — 계약 테스트가 `coverage` 명령에 `--coverage` 라는 글자가 **들어 있는지만** 보고 있어서, 그 뒤에 제외 플래그를 붙여 두면 테스트가 전부 초록인 채 커버리지 헤드라인만 부풀었다. 이 카드가 막으려던 바로 그 상태였다. 운영자 확정으로 이 카드 안에서 한 줄로 닫았고, 우회를 두 가지 방식으로 실제 시도해 둘 다 잡히는 것을 확인했다.

문서 쪽에서는 감사가 잡은 사실관계 오류 셋을 고쳤고, 감사가 **반증한** 의심 둘은 「위험」이 아니라 「확인된 정상」으로 기록을 바로잡았다.

---

## 1. 판독 기준이 디스패치와 달랐다 — 먼저 적는다

리드 디스패치는 판독 기준을 `run 커밋 9b86dd8` 로 지목했으나, 이 레인이 워크트리에 진입한 직후 그 값은 이미 낡아 있었다.

- 진입 직후(19:20 무렵) `git log` 은 HEAD 를 `9b86dd8` 로 보였다.
- 그 뒤 **19:21:22** 에 백필 커밋 `4222a55` 「run 단계 증거 백필 — §E.3 마커와 커밋 SHA」가 새로 얹혔다.
- 같은 창에서 `run-done.md` 9행의 커밋 SHA 가 `pending-backfill-run` → `9b86dd8963…` 로 바뀌는 것을 **두 번의 읽기 사이에** 직접 관측했다.
- `ListAgents` 에서 세션 `run [980eb6]` 이 **busy** 였다. (`moai session list --json` 은 `[]` 를 냈으나 이는 부재의 증거가 아니다 — 레지스트리는 죽은 PID 를 들고 있을 수 있다.)

이 레인은 그 시점에 **쓰기를 멈추고** 리드에게 보고했다. 리드가 run 산출물 완성을 판정했고(백필 의무까지 이행됨을 직접 관측), 이후 run 세션의 유휴 통지가 도착해 경합이 해소된 것을 확인한 뒤 sync 를 시작했다. 이 단계의 모든 측정은 HEAD `4222a55` 에 귀속된다.

기록의 요점은 «디스패치가 틀렸다» 가 아니라, **디스패치 작성 시점과 레인 진입 시점 사이에 상태가 움직였다**는 것이다. 판독 기준은 디스패치에 적힌 값이 아니라 진입 시점에 다시 읽은 값이어야 한다.

---

## 2. 착지한 것

### 2.1 문서 산출물 3 파일

| 파일 | 변경 |
|---|---|
| `CHANGELOG.md` | `[Unreleased]` 아래 «추가됨 — server 커버리지 도구 (카드 `t13`)» 절 신설 (기존 `t10` 절 **위**). 선언되지 않은 의존성이 왜 더 무거운 결함인지(npm workspaces hoisting 을 처음 보는 독자용으로 풀어 씀), `npm test` 가 임계를 강제하지 **않는다**는 설계 분리, 진입점 미제외 결정과 `index.ts` 83.33% 가 의도인 이유, 회귀 짝이 잠그는 것, `#### 테스트`, `#### 이걸로 닫히지 않는 것` |
| `README.md` | 명령어 표에 한 행 — `npm run coverage -w server` / 「서버 커버리지 측정 (라인 85% 미만이면 실패)」. 그 외 무변경 |
| `.moai/specs/SPEC-COVERAGE-001/progress.md` | §E.4 Sync-phase Audit-Ready Signal 착지 |

### 2.2 코드 산출물 — 집합은 4 파일 그대로다

sync 단계가 `server/test/coverage-contract.test.ts` 를 수정했으나, **그 파일은 이미 run 단계의 네 산출물 중 하나**다. 따라서 코드 산출물 집합의 크기는 늘지 않았고 `AC-COVERAGE-005` 의 「정확히 네 줄」 기준도 그대로 성립한다. 이 단계가 관측 3 을 재실행해 확인했다 — `package-lock.json` · `server/package.json` · `server/test/coverage-contract.test.ts` · `server/vitest.config.ts`.

달라진 것은 집합의 크기가 아니라 **누가 손댔는가**이며, 그래서 「sync 단계는 문서만 건드렸다」는 취지의 문장은 §E.4 안에서 **네 군데** 찾아 고쳤다(§4.3).

### 2.3 상태 전이

`spec.md` frontmatter `status: in-progress → completed`, `version: 0.1.2 → 0.2.0`, HISTORY 한 행. `plan.md`·`acceptance.md`·`progress.md` 에는 frontmatter 블록 자체가 없어 전이할 필드가 없다 — 이것이 반쪽 전이가 아니라 저장소 관례임은 감사가 확인했다(§5).

`spec.md` §1~§8 본문은 한 글자도 바꾸지 않았다.

---

## 3. 검증 — 이 단계가 직접 실행해 관측한 것

run 단계의 숫자를 옮겨 적지 않고 이 트리에서 다시 실행했다. 증거 로그는 `.moai/state/verify/t13-sync/` 에 있다.

| 명령 | 관측 | 로그 |
|---|---|---|
| `npm run typecheck -w server` | 종료 `0` | `typecheck.log` · `typecheck-final.log` |
| `npm run coverage -w server` | 종료 `0` · `Test Files 11 passed (11)` · `Tests 105 passed (105)` · `All files` Stmts 96.5 / Branch 89.24 / Funcs 97.43 / **Lines 97.01** · `index.ts` Lines 83.33 (미커버 66-72) · `Lines : 97.01% ( 325/335 )` | `coverage.log` · `coverage-final.log` |
| `npm test -w channel` | 종료 `0` · `Test Files 5 passed (5)` · `Tests 70 passed (70)` (형제 무회귀) | `channel-test.log` · `channel-final.log` |
| `npm ls @vitest/coverage-v8 -w server --depth=0` | 종료 `0` · `@minidiscord/server@ -> ./server` 의 직접 자식으로 `@vitest/coverage-v8@4.1.11` | (인라인) |

**측정 오염 검사** — 측정 전후로 `server/vitest.config.ts`·`server/package.json`·`server/test/coverage-contract.test.ts` 의 sha256 을 찍어 대조했고 세 줄 모두 일치했다(`hash-before.txt` / `hash-after.txt`). `vitest.config.ts` 의 값 `8e1d6367…7dd7ea` 는 run 단계가 되돌림 증명에 쓴 값과 같다 — 트리가 run 종료 상태 그대로였다는 뜻이다. HEAD 는 전 구간 `4222a55` 로 불변이었다.

run 단계가 §E.2·§E.3 에 적은 수치와 **전건 일치**했다.

---

## 4. 감사 — `sync-auditor --deep`

### 4.1 판정

**PASS 85.2** (가중 조화평균), 차단 0건.

| 차원 | 점수 | 근거 요지 |
|---|---|---|
| Functionality (40%) | 92 | 게이트 실작동을 run 단계와 **반대 방향** 프로브로 독립 확인. 문서 수치 전건 재현 |
| Security (25%) | 88 | must-pass 하한 **80** 통과. 새 패키지 유입 0, 런타임 무변경. 증거 무결성 우회로에서 감점 |
| Craft (20%) | 80 | 97.01% ≥ 85 실측, `tsc` 종료 0. 단언 느슨함·`FILE_COUNT` 취약·린트 도구 부재 |
| Consistency (15%) | 82 | 형제 형식·frontmatter 관례 준수. CI 부재 서술 반증, Craft 축 불일치 |

감사는 이 카드에 런타임 코드 경로가 없으므로 **Security 를 OWASP 축이 아니라** ①공급망 유입 ②기존 방어물 약화 ③증거 무결성 셋으로 정의했다고 명시했다. ①②는 무결(lockfile delta 3행, 새 패키지 0), ③에서만 감점했다.

감사는 변이 3회(`server/package.json` 1 · `server/vitest.config.ts` 2)를 넣고 전부 원본 사본으로 복원했으며, 감사 전후 해시 4행이 완전 일치함을 증명했다(`FINAL_TREE_INTACT`).

### 4.2 F-01 — 이 카드에서 닫았다 (운영자 확정 2026-08-29, 리드 전달)

**결함.** 계약 테스트 단언 2 가 `expect(pkg.scripts.coverage).toMatch(/--coverage|coverage\.enabled/)` 로 **포함 여부만** 봤다. 그래서 `server/package.json` 의 `coverage` 를 `"vitest run --coverage --coverage.exclude=src/index.ts"` 로 커밋해 두면 정규식이 여전히 맞아 `npm test -w server` 는 완전 초록인 채, 헤드라인이 97.01% → **98.36%** 로 부풀고 `FILE_COUNT=10 HAS_INDEX=false` 가 됐다.

이것은 이 SPEC 이 §4.4 에서 「제외로 숫자를 예쁘게 만들지 않겠다」고 정하며 근거로 든 카드 `t4`(`SPEC-CHANWIRE-001`) F-10 — 제외 사유가 낡았는데 헤드라인만 계속 좋아 보이던 상태 — 의 **정확한 재현 경로**였다. run 단계는 이 위험을 「루트 워크스페이스 설정 등 다른 자리」로 서술했으나, 실제 구멍은 계약 테스트가 이미 `readFileSync` 로 열고 정규식까지 돌리는 **바로 그 파일 안**, 설정 파일이 아니라 **스크립트 인자**를 통해 있었다.

**감사가 차단으로 올리지 않은 근거.** `spec.md` 의 REQ-COVERAGE-001..007 중 스크립트를 플래그 오버라이드로부터 지키라고 요구하는 조항이 없다. 이행 실패가 아니라 방어 깊이의 미도달이며, 오늘 트리는 정상이었다.

**조치.** 단언 2 를 완전 일치로 좁혔다.

```ts
expect(pkg.scripts.coverage).toBe('vitest run --coverage')
```

위에 사유 주석 4줄을 붙여, 포함 검사로 두면 무엇이 통과하는지를 코드 옆에 남겼다.

**실효 확인 — 프로브 2종.** 통과만 확인해서는 「그 단언이 살아 있다」의 증거가 되지 않으므로, 우회를 실제로 시도했다.

| 상태 | 명령 | 관측 | 로그 |
|---|---|---|---|
| 강화 후 정상 | `npm test -w server` | 종료 `0` · `Test Files 11 passed (11)` · `Tests 105 passed (105)` | `f01-green.log` |
| 프로브 1 — `coverage` 를 `"vitest run --coverage --coverage.exclude=src/index.ts"` 로 변이 | `npm test -w server` | 종료 **1** · `Test Files 1 failed \| 10 passed (11)` · `Tests 1 failed \| 104 passed (105)` · `AssertionError: expected 'vitest run --coverage --coverage.excl…' to be 'vitest run --coverage'` | `f01-probe.log` |
| 프로브 2 — `"vitest run --coverage --coverage.thresholds.lines=0"` 로 변이 | `npm test -w server` | 종료 **1** · `1 failed \| 104 passed` · `Received: "vitest run --coverage --coverage.thresholds.lines=0"` | `f01-probe2.log` |
| 되돌림 증명 | `shasum -a 256 server/package.json` | 변이 전후 `93d66587ae419e3d2138e8824e14752cf7e856208c632f8396f4177b37b3431c` 일치, `git diff server/package.json` 빈 출력 | (인라인) |

**두 프로브 모두 실패한 것은 계약 테스트 하나뿐**(`1 failed | 104 passed`)이다. 나머지 104개가 통과한 채이므로 비정상 종료를 이 단언 하나에 귀속할 수 있다 — 이것이 「단언이 살아 있다」의 근거이고, 통과 확인만으로는 얻을 수 없는 증거다.

계약 항목 수는 여덟에서 바뀌지 않았다. 항목을 더한 것이 아니라 그중 하나의 **형태**를 좁혔다.

### 4.3 문언 정정 3건 (F-03·F-04·F-05)

셋 다 감사가 정확한 위치와 교체 문언을 명시했고, 이 단계가 **고치기 전에 각각을 직접 다시 재서** 감사 주장이 맞는지 확인했다.

| 발견 | 무엇이 거짓이었나 | 조치 |
|---|---|---|
| **F-03** (Low) | `CHANGELOG.md` 의 「이 저장소에는 아직 GitHub Actions 같은 자동 실행 배선이 없고」. 실제로는 `.github/workflows/label-sync.yml` 이 `workflow_dispatch` + `main` push 트리거로 존재하고 `.git_hooks/pre-commit` 이 `moai gate` 를 부른다 | 「**커버리지를 부르는 CI 가 없습니다**」로 좁히고, 실재하는 배선 둘을 이름으로 적고, 「후속 카드가 할 일은 워크플로 디렉터리를 새로 만드는 것이 아니라 **이미 있는 배선에 명령 한 줄을 얹는 것**」을 명시했다 |
| **F-04** (Low) | `CHANGELOG.md` 가 계약을 「일곱 가지」라 하고 여덟 개를 열거. 세 자리(문서 서술·코드 주석 번호·실제 `expect()` 수)가 서로 다른 수를 냈다 | 서술을 「여덟」로 고치고 열거를 계약 테스트의 주석 번호(`1·2·3·3b·4·5·6·7`) 순서로 재정렬했다. 재정렬만으로는 일곱이 되지 않는다 — 제공자와 측정 대상을 합쳐도 `3b`(리포터)가 별도 묶음이라 여덟이 남고, 일곱은 정수 라벨 개수일 뿐 묶음 수가 아니다 |
| **F-05** (Low) | §E.4 Residual-risk 가 `acceptance.md` 의 `AC-001` 축약 표기를 「한 번」이라 적었으나 실제로는 **두 번**(`:222`·`:299`) | 위치를 명시해 정정하고, 「정정하는 사람은 두 자리를 함께 고쳐야 한다 — 한 자리만 고치고 «정정했다» 고 적으면 그 기록이 다시 거짓이 된다」는 경고를 함께 심었다 |

**정정이 스스로 낡은 기록을 남기는 부류를 함께 훑었다.** F-03 을 고치며 CI 배선의 존재를 실제로 확인한 순간, §E.4 Gaps 에 처음 적혀 있던 「CI 배선은 존재 여부조차 재지 않았다」가 거짓이 됐다. 같은 부류로 §E.4 안에서 **네 군데**를 찾아 고쳤다 — ① 산출물 「문서 3 파일」(코드 1 파일도 손댔다) ② 「변이는 재현하지 않았다」(이 단계가 프로브 2종을 돌렸다) ③ 「위 재실행은 전부 종료 0 인 정상 경로다」(종료 1 을 두 번 봤다) ④ 「위 다섯 명령이 덮는 범위까지만」(실행한 명령이 다섯을 넘었다).

③은 지우지 않고 **두 게이트를 갈라** 적었다. 「빨간불을 봤다」로 뭉뚱그리면 커버리지 임계 게이트가 이 단계에서 실증된 것처럼 읽히는데, 이 단계가 본 빨간불은 **계약 테스트의 실패**이고 **커버리지 임계 게이트의 실패**는 여전히 run 단계 §E.2 단계 6 의 관측이다.

### 4.4 후속 이월

| 항목 | 내용 | 소유 |
|---|---|---|
| **F-02** (Medium) | `AC-COVERAGE-002` 의 `FILE_COUNT=11` 이 `ls server/src \| wc -l` 과 **정의상 동치**라, 다음 카드가 `server/src/` 에 모듈 하나만 더해도 구현이 옳은데 기준이 실패한다. 이 저장소는 「정상 구현을 거짓 실패시키는 기준」 부류로 이미 대가를 치렀다(`spec.md` §4.3 이 `perFile` 을 거부한 사유가 그것이다). 닫는 방법 — 상수를 관계식으로 바꾸거나 `HAS_INDEX=true` 하나만 남긴다 | 후속 카드 |
| **§5 CI 문언** | `spec.md` §5 «Out of Scope — CI 배선» 의 「이 저장소에 아직 그 배선이 없다」가 F-03 과 같은 거짓 문장이다. SPEC 본문이라 manager-spec 소유이므로 이 카드는 손대지 않았다 | 카드 **t21** (운영자 승인 발급) |
| CI 배선 | `npm run coverage -w server` 자동 호출 — 이미 `.github/workflows/` 가 있으므로 잡 하나를 더하면 된다 | 후속 카드 |
| **F-06** (Low) | 감사 Craft 축이 저장소 안에서 갈린다(t10 은 Statements, 이 카드는 Lines). 감사 절차 쪽 문제로 이 SPEC 범위 밖 | 감사 절차 |

---

## 5. 감사가 반증한 것 — 위험이 아니라 확인된 정상

이 레인이 문서 담당의 보고를 받아 소프트 스팟 셋을 감사에 올렸고, **둘이 반증됐다**. 반증도 결과이므로 기록한다.

- **`spec.md` §4.4 의 `66-68·71-72` vs 리포터의 `66-72`** → **반증.** `coverage-final.json` 원문이 미커버 구문 시작줄을 `55,66,67,68,71,72` 로 낸다. 69·70행은 주석이라 계측 대상이 아니고, 리포터의 `66-72` 는 연속 범위로 접은 표시다. **SPEC 쪽이 더 정확하다** — 고칠 이유가 없다.
- **frontmatter 부재 = 반쪽 전이** → **반증.** 이 저장소의 **모든** SPEC 이 plan/acceptance/progress 에 frontmatter 를 두지 않는다(감사가 `SPEC-AUTH-001`·`CORE-001`·`GATEWAY-001`·`CHANINJECT-001` 확인). 관례 준수다.
- **`AC-001` 축약** → **확인**, 다만 「한 번」이 아니라 **두 번**이었다(§4.3 F-05).

한 가지 더, 이 레인이 문서 담당에게 내린 지시 하나가 틀렸고 담당이 반박했다 — 「코드 산출물 4 → 5 파일」. 강화 대상 파일이 이미 그 네 개 집합 안이라 5 로 적으면 같은 파일을 두 번 세는 것이 되고 `AC-COVERAGE-005` 의 「정확히 네 줄」과도 충돌한다. **담당의 반박이 옳았고 그대로 4 로 남겼다.**

---

## 6. Gaps — 이 단계가 관측하지 않은 것

1. **`AC-COVERAGE-006` 의 세 전이(RED→GREEN)를 재관측하지 않았다.** 착지 이전의 역사적 상태라 재현이 불가능하다. 기록 판독만 했다.
2. **커버리지 임계 게이트가 실패하는 것을 이 단계가 직접 보지 않았다.** 이 단계가 본 종료 1 은 **계약 테스트의 실패**이고, 「85 미만이면 `npm run coverage -w server` 가 실패한다」의 근거는 여전히 run 단계 §E.2 단계 6·7 의 프로브 A'·B'·재프로브다. 서로 다른 두 게이트다.
3. **계약 테스트 단언 3·5 는 개별 변이로 치지 않았다.** 감사는 단언 4·7 을 쳤고 둘 다 정상 발화했으며, 단언 5 의 **한계**를 F-01 로 실측했다. 나머지는 스위트 통과로만 덮인다.
4. **린트를 돌리지 않았다** — 이 저장소의 JS/TS 워크스페이스에 ESLint/Biome 설정이 없다. Consistency 근거가 `tsc --noEmit` 하나뿐이며, 이는 통과가 아니라 **도구 부재로 인한 갭**이다.
5. **CI 배선의 존재는 확인했으나 동작은 관측하지 않았다.** 워크플로를 실제로 돌려 보지 않았고, `.git_hooks/pre-commit` 이 `moai gate` 를 부른다는 것도 감사 실측을 인용한 것이지 훅을 발화시켜 본 것이 아니다.
6. **「Craft 85% 가 네 라운드 연속 UNVERIFIED」를 검증하지 못했다.** 근거 문서 `.moai/reports/t7/sync-audit.md` 가 t7 워크트리 안에 있어 도달하지 못했다. SPEC 이 먼저 공시한 갭이라 감사는 감점하지 않았다.
7. **커밋 SHA 자기 참조 불가** — §E.4 의 `sync_commit_sha` 는 D3 관례대로 sync 커밋에 자리표시자로 들어갔고 후속 백필 커밋에서 실제 값 `1cd94ad` 로 채웠다.

---

## 7. Residual-risk — 관측했음에도 남는 위험

- **임계 게이트는 여전히 `npm run coverage -w server` 를 타이핑하는 사람에게만 작동한다.** 커버리지를 부르는 CI 가 없어(범위 밖, `spec.md` §5), 아무도 부르지 않으면 게이트는 소리 없이 대기한다. 배선 자체는 이미 있으므로 후속 카드가 할 일은 명령 한 줄을 얹는 것이다.
  - **각주 (`t21` 정정, 2026-08-29)**: 위 마지막 절 「후속 카드가 할 일은 명령 한 줄을 얹는 것이다」는 **얹을 자리를 지정하지 않아 오독을 부른다.** 카드 `t21` 이 그 처방을 좁혔다 — 얹을 자리는 `.git_hooks/pre-push`(푸시마다 돌아 적합하다) 또는 `.github/workflows/` 의 **새 잡**이고, **`.github/workflows/label-sync.yml` 은 재사용 대상이 아니다**: push 트리거에 `.github/labels.yml`·`.github/workflows/label-sync.yml` 두 파일에 걸린 `paths:` 경로 필터가 있어 `server/` 코드가 바뀌어도 발화하지 않으므로, 거기에 얹으면 이 항목이 경고하는 «소리 없이 대기하는 게이트» 를 그대로 재생산한다. 현행 서술은 `spec.md` §5 `0.2.2` 와 `.moai/reports/t21/` 를 볼 것. 이 행 자체는 그때의 기록이므로 본문은 고치지 않는다.
- **`FILE_COUNT=11` 은 다음 카드에서 거짓 실패한다** (F-02). 갱신 의무가 이관돼 있으나, 거짓 실패가 반복되면 기준 자체가 「환경 탓」으로 읽히기 시작하는 것이 진짜 비용이다.
- **전역 임계의 성격상 개별 파일 악화는 총계로만 흘러든다.** `index.ts` 83.33% 가 계속 계상되는 것은 의도이며, 총계가 85 아래로 내려가는 순간이 진짜 신호다.
- **F-01 을 닫았어도 계약 테스트가 보는 자리는 `server/package.json` 과 `server/vitest.config.ts` 둘뿐이다.** 루트 워크스페이스 설정 등 **제3의 자리**에서 제외가 들어오면 단언 5 는 여전히 못 잡는다. 그 실효 측면은 `AC-COVERAGE-002` 의 `FILE_COUNT`·`HAS_INDEX` 가 덮는다 — 두 기준이 함께 있어야 닫힌다.
- **린트 도구가 없어 Consistency 근거가 얇다.** 형식 일관성은 `tsc --noEmit` 이 잡는 범위까지만 보장된다.
- **이 브랜치는 미푸시이며 이 워크트리가 유일 사본이다.** 원격 병합이 착지하기 전에는 워크트리를 폐기하지 않는다.

---

## 8. 커밋

| 커밋 | 내용 |
|---|---|
| `1cd94ad` | sync 단계 본체 — 문서 4 파일 + 계약 테스트 강화 + 감사 보고서 + 검증 로그 (17 files changed, 806 insertions) |
| (후속) | `sync_commit_sha` 백필 + 이 보고서 |

`server/src/`·`channel/`·`web/` 는 무변경이다.
