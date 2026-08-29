# card t13 — sync 단계 독립 감사 (렌즈 `--deep`)

| 항목 | 값 |
|---|---|
| 카드 | t13 — server 커버리지 도구 도입 |
| SPEC | **SPEC-COVERAGE-001** (감사 시점 `version 0.2.0`, `status: completed` — 미커밋) |
| 워크트리 | `.claude/worktrees/t13`, 브랜치 `WT-coverage-tool` |
| HEAD | `4222a5520e229e621ecd882f166b37ea5b58975b` |
| 감사 대상 | 커밋 `9b86dd8`(코드) + `4222a55`(증거 백필) + **미커밋 문서 4파일**(`CHANGELOG.md`·`README.md`·`progress.md` §E.4·`spec.md` frontmatter) |
| 감사자 | sync-auditor (독립·적대적 판정. run 단계 숫자를 옮겨 적지 않고 전부 이 트리에서 다시 재거나 반증을 시도했다) |
| 평가 프로필 | `.moai/config/evaluator-profiles/default.md` (SPEC frontmatter 에 `evaluator_profile` 없음 → `harness.default_profile: "default"`). `evaluator_mode: hierarchical` 미설정 → 평면 가중치 방식 |

---

## 1. 쉬운 말 요약

이 카드가 한 약속은 두 가지였습니다. **첫째, 서버 코드의 테스트 커버리지를 재는 명령을 만들고 85%라는 기준을 말이 아니라 실제 실패로 만들 것.** 둘째, 서버가 형제 프로젝트의 도구를 몰래 빌려 쓰던 상태를 고쳐 자기 이름으로 선언하게 할 것. **둘 다 실제로 지켜졌습니다.** 저는 문서를 믿지 않고 직접 확인했습니다 — 커버리지를 일부러 1.49%까지 떨어뜨려 보니 명령이 종료 코드 1로 실패하면서 `does not meet global threshold (85%)`라는 메시지를 냈고, 이는 설정 파일에 심어 둔 85가 진짜로 작동한다는 뜻입니다.

**문서에 적힌 숫자는 하나도 빠짐없이 재현됐습니다.** 파일 11개·테스트 105개 통과, 라인 커버리지 97.01%(325/335), 형제 프로젝트 5파일·70테스트 통과 — 전부 제가 다시 실행해 같은 값을 봤습니다. 범위도 정확했습니다: 손댄 코드 파일은 선언한 대로 딱 4개이고, 건드리지 않겠다고 한 곳은 정말 안 건드렸습니다.

**다만 한 군데 구멍을 찾았습니다.** 이 카드의 핵심 방어물인 "설정을 지우면 테스트가 빨개진다"는 약속이, 계약 테스트가 **이미 읽고 있는 바로 그 파일 안에서** 한 줄로 우회됩니다. `server/package.json`의 `coverage` 명령 뒤에 제외 옵션을 한 마디 붙이면, 커버리지에서 `index.ts`가 통째로 사라져 숫자가 97.01%에서 98.36%로 부풀어 오르는데도 `npm test -w server`는 11파일·105테스트 전부 초록으로 통과합니다. 이걸 실제로 만들어 확인한 뒤 원상복구했고 해시로 증명했습니다. 이건 오늘 무언가가 고장 났다는 뜻은 아니고, 이 카드가 막겠다고 선언한 부류(t4의 F-10 — 제외 덕분에 숫자만 좋아 보이던 상태)의 문을 하나 열어 둔 채로 뒀다는 뜻입니다. **막는 비용은 단언 한 줄입니다.**

작은 사실 오류도 셋 나왔습니다. 변경 이력이 "GitHub Actions 같은 자동 실행 배선이 없다"고 적었는데 실제로는 `.github/workflows/label-sync.yml`이 있고, 계약 항목을 "일곱 가지"라 해 놓고 여덟 개를 열거했으며, §E.4가 축약 표기 `AC-001`이 "한 번" 나온다고 적었으나 두 번 나옵니다. 셋 다 게이트의 동작에는 영향이 없습니다.

**판정은 PASS(85.2)이며 차단 발견은 없습니다.**

---

## 2. 5-절 증거 형식 — 이 감사 자신에 대하여

### 2.1 Claim (주장)

이 감사는 다음을 주장한다.

1. `server/vitest.config.ts` 의 `thresholds.lines: 85` 는 **실제로 게이트한다** — CLI 오버라이드 없이, 설정 파일의 값이 읽혀 실패를 낸다.
2. `@vitest/coverage-v8` 은 `server` 가 **자기 이름으로 선언**하며 lockfile 에도 기록돼 있다 — 끌어올려진 사본을 트리로 인쇄한 것이 아니다.
3. 회귀 짝의 **미변이 단언 4·7 은 장식이 아니다** — 각각 변이시키면 그 테스트 하나만 빨개진다.
4. **회귀 짝에 실질적 구멍이 있다** — `server/package.json` 의 `coverage` 스크립트에 제외 플래그를 지속시키면, 계약 테스트는 초록인 채 헤드라인 수치가 부풀어 오른다.
5. 문서(`CHANGELOG.md`·`README.md`·§E.4)의 **수치·명령·범위 주장은 재현된다**. 다만 **서술문 3건은 반증된다**(F-03·F-04·F-05).
6. `spec.md` §5 의 여섯 배제 항목은 지켜졌고, **범위 안의 것이 조용히 배제로 옮겨진 흔적은 없다**.
7. **`status: completed` 전이는 정당하다.** 형제 문서 셋의 frontmatter 부재는 이 저장소 **전체 관례**이며 반쪽 전이가 아니다.

### 2.2 Evidence (증거 — 실행 명령과 원문)

#### E-1. 품질 게이트 재실행 (문서 수치 재현)

```
$ npm run typecheck -w server
EXIT=0
> typecheck
> tsc --noEmit
```

```
$ npm run coverage -w server
EXIT=0
 Test Files  11 passed (11)
      Tests  105 passed (105)
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |    96.5 |    89.24 |   97.43 |   97.01 |                   
 auth.ts           |    97.5 |    96.15 |     100 |     100 | 21                
 gateway.ts        |   98.34 |    88.57 |   96.42 |   98.83 | 118               
 index.ts          |   82.35 |       25 |   83.33 |   83.33 | 66-72             
 routes-bots.ts    |     100 |    92.85 |     100 |     100 | 55                
 ...es-messages.ts |   94.44 |    81.25 |     100 |   94.02 | 172-176           
 sse.ts            |   95.65 |       90 |     100 |     100 | 37                
-------------------|---------|----------|---------|---------|-------------------
Statements   : 96.5% ( 387/401 )
Branches     : 89.24% ( 166/186 )
Functions    : 97.43% ( 76/78 )
Lines        : 97.01% ( 325/335 )
```

```
$ npm test -w channel
EXIT=0
 Test Files  5 passed (5)
      Tests  70 passed (70)
```

```
$ node -e "…coverage-summary.json…"
FILE_COUNT=11 HAS_INDEX=true TOTAL_LINES=97.01
  src/auth.ts 100          src/config.ts 100        src/db.ts 100
  src/gateway.ts 98.83     src/index.ts 83.33       src/mention.ts 100
  src/permissions.ts 100   src/routes-bots.ts 100   src/routes-messages.ts 94.02
  src/routes-rooms.ts 100  src/sse.ts 100
```

§E.4·`CHANGELOG.md`·run-done.md 이 적은 모든 수치와 **일치**한다. Claim 5 의 수치 부분이 성립한다.

#### E-2. 임계가 실제로 게이트하는가 — **트리를 건드리지 않은 독립 프로브**

run 단계는 설정 파일을 85→98 로 **변이시켜** 확인했다. 이 감사는 **변이 없이** 반대 방향으로 확인했다 — 측정 대상을 줄여 커버리지를 임계 아래로 떨어뜨리고, 설정 파일의 85 가 그대로 읽히게 뒀다.

```
$ npx vitest run --root server --coverage test/config.test.ts
EXIT=1
 Test Files  1 passed (1)
      Tests  2 passed (2)
All files          |    1.24 |     3.22 |    5.12 |    1.49 |
Lines        : 1.49% ( 5/335 )
ERROR: Coverage for lines (1.49%) does not meet global threshold (85%)
```

세 가지가 한 번에 확인된다 — **(가)** 임계 기능이 살아 있다, **(나)** 판정에 쓰인 값 `85%` 는 **설정 파일에서 온 것**이다(명령줄에 임계를 넘기지 않았다), **(다)** 메시지가 `global threshold` 라고 명시하므로 `perFile` 이 아니다. **실패한 테스트가 0인 상태에서 종료 1** 이므로 비정상 종료를 임계 미달 하나로 귀속할 수 있다. Claim 1 이 성립한다.

#### E-3. 의존성 선언이 진짜인가

```
$ npm ls @vitest/coverage-v8 -w server --depth=0
minidiscord@ /Users/…/t13
└─┬ @minidiscord/server@ -> ./server
  └── @vitest/coverage-v8@4.1.11
EXIT=0
```

트리 인쇄만으로는 부족하므로 lockfile 을 직접 읽었다.

```
$ sed -n '4444,4448p' package-lock.json     # server 워크스페이스 항목
      "devDependencies": {
        …
        "@vitest/coverage-v8": "^4.1.11",
```

```
$ git diff 9b86dd8~1 9b86dd8 -- package-lock.json
-      "peer": true,          (2곳: @vitest/coverage-v8, vitest)
+        "@vitest/coverage-v8": "^4.1.11",   (server devDependencies 1행)
```

lockfile 이 `server` 를 **선언자로 기록**했고, `peer: true` 가 두 곳에서 사라졌다 — 즉 전이/피어 해결이 아니라 직접 선언으로 바뀐 것이 lockfile 수준에서 관측된다. **새 패키지 항목은 하나도 추가되지 않았다**(물리적 사본은 이미 트리에 있던 것을 npm 이 dedupe 한다 — `ls -d server/node_modules/@vitest/coverage-v8` 는 부재, `node_modules/@vitest/coverage-v8` 는 존재). Claim 2 가 성립한다.

#### E-4. 미변이 단언은 장식인가 — 단언 4·7 변이 (트리 복원 증명 포함)

run 단계는 단언 1·6·3b 만 변이시켰다고 자기 Gaps 에 적었다. 남은 것 중 가장 하중이 큰 둘을 이 감사가 직접 쳤다.

**단언 4 (`thresholds.lines === 85`)** — `server/vitest.config.ts` 의 `lines: 85` → `lines: 90`:

```
$ npm test -w server
TEST_EXIT=1
   × coverage tooling contract holds 3ms
 FAIL  test/coverage-contract.test.ts > coverage tooling contract holds
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)
```

**단언 7 (상단 5줄 사유 주석)** — `server/vitest.config.ts` 상단 주석 3줄 삭제:

```
$ npm test -w server
TEST_EXIT=1
 FAIL  test/coverage-contract.test.ts > coverage tooling contract holds
 Test Files  1 failed | 10 passed (11)
      Tests  1 failed | 104 passed (105)
```

두 변이 모두 **계약 테스트 하나만** 실패했다. Claim 3 이 성립한다 — 이 두 단언은 장식이 아니다.

#### E-5. **회귀 짝의 구멍 — 계약 테스트가 이미 읽는 파일 안에 있다**

계약 테스트의 단언 2 는 스크립트의 **포함 여부**만 본다.

```ts
expect(pkg.scripts.coverage).toMatch(/--coverage|coverage\.enabled/)
```

즉 `--coverage` 뒤에 무엇이 붙든 통과한다. `server/package.json` 을 다음으로 바꿔 지속시켰다.

```json
"coverage": "vitest run --coverage --coverage.exclude=src/index.ts"
```

```
$ npm test -w server
TEST_EXIT=0
 Test Files  11 passed (11)
      Tests  105 passed (105)
```

```
$ npm run coverage -w server
COV_EXIT=0
> vitest run --coverage --coverage.exclude=src/index.ts
All files          |   97.82 |    90.65 |   98.61 |   98.36 |
Lines        : 98.36% ( 300/305 )

$ node -e "…coverage-summary.json…"
FILE_COUNT=10 HAS_INDEX=false TOTAL_LINES=98.36
```

**계약 테스트는 완전히 초록인 채, `index.ts` 가 계측에서 사라지고 헤드라인이 97.01% → 98.36% 로 올라갔다.** 이것이 `spec.md` §4.4 와 `CHANGELOG.md` 가 F-10 선례를 들어 막겠다고 선언한 바로 그 상태다. Claim 4 가 성립한다.

run 단계는 이 위험을 «루트 워크스페이스 설정 등 **다른 자리**» 로 서술했다. **실제 구멍은 그보다 가깝다** — 계약 테스트가 `readFileSync` 로 이미 열고 있는 `server/package.json` 안, 그것이 이미 정규식으로 검사하고 있는 바로 그 문자열이다.

#### E-6. 범위 경계

```
$ git diff --name-only 9b86dd8~1 9b86dd8
.moai/reports/t13/run-done.md
.moai/specs/SPEC-COVERAGE-001/.spec-base-sha
.moai/specs/SPEC-COVERAGE-001/progress.md
.moai/specs/SPEC-COVERAGE-001/spec.md
package-lock.json
server/package.json
server/test/coverage-contract.test.ts
server/vitest.config.ts
```

코드 산출물 정확히 넷(`package-lock.json`·`server/package.json`·`server/test/coverage-contract.test.ts`·`server/vitest.config.ts`), 나머지 넷은 `.moai/` 절차 산출물. **`channel/`·`server/src/`·루트 `package.json`·`.gitignore` 는 목록에 없다** — `CHANGELOG.md` 와 §E.3 의 주장이 그대로 성립한다. Claim 6 의 전반부가 성립한다.

#### E-7. §4.4 미커버 구간 표기 — 소프트 스팟 #1 **반증**

sync 레인은 «`spec.md` §4.4 가 `66-68·71-72` 라 쓰는데 리포터는 `66-72` 를 찍는다» 를 결함 후보로 올렸다. 문장 수준 대조가 아니라 계측 데이터를 직접 읽었다.

```
$ npx vitest run --root server --coverage --coverage.reporter=json
$ node -e "…coverage-final.json 의 index.ts 미커버 구문 시작줄…"
uncovered statement start lines: 55,66,67,68,71,72 count=6
```

`server/src/index.ts` 69·70행은 **주석**이므로 계측 대상이 아니다. 즉 실제 미커버 실행 구간은 `66·67·68` 과 `71·72` 이고, 리포터의 `66-72` 는 이를 **연속 범위로 접어 표시한 것**이다. `spec.md` 의 표기가 **더 정확**하며 둘은 모순되지 않는다. 덤으로 §4.4 의 «구문 기준 미커버 6개, 그중 하나는 **55행**으로 블록 밖» 이라는 서술도 위 원문(`55,66,67,68,71,72`)으로 **정확히 확인**된다.

#### E-8. frontmatter 부재 — 소프트 스팟 #6 **반증**

```
$ head -1 .moai/specs/SPEC-AUTH-001/plan.md        → # SPEC-AUTH-001 구현 계획
$ head -1 .moai/specs/SPEC-AUTH-001/acceptance.md  → # SPEC-AUTH-001 수용 기준
$ head -1 .moai/specs/SPEC-CORE-001/plan.md        → # SPEC-CORE-001 구현 계획
$ head -1 .moai/specs/SPEC-GATEWAY-001/acceptance.md → # SPEC-GATEWAY-001 수용 기준
$ head -1 .moai/specs/SPEC-CHANINJECT-001/progress.md → # SPEC-CHANINJECT-001 진행 기록
```

이 저장소의 **모든** SPEC 이 `plan.md`·`acceptance.md`·`progress.md` 에 frontmatter 를 두지 않는다. `spec.md` 단독 frontmatter 가 관례이며, §E.4 의 «없는 필드를 새로 만들지 않았다» 는 관례 준수다. **반쪽 전이가 아니다.** Claim 7 이 성립한다.

#### E-9. 소프트 스팟 #2·#3 — **둘 다 확인(재현)**

```
$ grep -n 'AC-001' .moai/specs/SPEC-COVERAGE-001/acceptance.md
222: … `npm ls --depth=0`(AC-001)은 …
299: … AC-001 은 아직 실패 |

$ grep -oE 'AC-[A-Z0-9-]+' … | sort -u
AC-001 / AC-COVERAGE-001 / …002 / …003 / …004 / …005 / …006      ← 기계적 계수 7
```

축약 표기는 **두 번** 등장하며(§E.4 는 «한 번» 이라 적었다 — F-05), 기계적 AC 계수는 7 로 읽힌다.

```
$ ls server/src | wc -l
      11
```

`AC-COVERAGE-002` 의 `FILE_COUNT=11` 은 `server/src/` 파일 수와 **일대일로 묶여 있다** — 다음 카드가 파일 하나만 더해도 이 기준은 거짓 실패한다. 소프트 스팟 #3 확인.

#### E-10. CI 배선 부재 주장 — **반증**

```
$ find .github -type f
.github/labels.yml
.github/workflows/label-sync.yml
.github/actions/detect-language/action.yml

$ ls .git_hooks
pre-commit
pre-push
```

`.github/workflows/label-sync.yml` 은 `on: push: branches: [main]` 트리거를 가진 실제 GitHub Actions 워크플로다. `.git_hooks/pre-commit` 은 `moai gate`(16개 언어 툴체인 감지 · vet+lint+test)를 호출한다. `CHANGELOG.md` 와 `spec.md` §5 의 «이 저장소에는 아직 GitHub Actions 같은 자동 실행 배선이 없다» 는 **거짓**이다 — 「커버리지를 부르는 CI 가 없다」가 참일 뿐이다.

#### E-11. 트리 무오염 증명

```
$ shasum -a 256 server/package.json server/vitest.config.ts server/test/coverage-contract.test.ts package-lock.json   (감사 전)
93d66587ae419e3d2138e8824e14752cf7e856208c632f8396f4177b37b3431c  server/package.json
8e1d6367705badb9e88383aaf0a4b52156e66f70440f1ff4321d22af2a7dd7ea  server/vitest.config.ts
a70dec5fa8f994e2590f01d3ddaedd5ebb7db364c1fdaa51226b2f8c763ee866  server/test/coverage-contract.test.ts
ab5cba2ef8a593b753751295930bf34e654d2f21f459827df4c56c4fabfb4fa4  package-lock.json

$ diff hash-pre.txt hash-final.txt && echo TREE_INTACT     (변이 3회 전부 되돌린 뒤)
TREE_INTACT
```

`server/package.json` 1회·`server/vitest.config.ts` 2회, 총 3회의 변이를 넣었고 **전부 원본 사본 복사로 되돌려 해시가 감사 전과 바이트 단위로 동일**하다. 미커밋 문서 4파일도 그대로 남아 있다.

```
$ git diff --stat
 .moai/specs/SPEC-COVERAGE-001/progress.md | 36 ++++++++++++++++++++-
 .moai/specs/SPEC-COVERAGE-001/spec.md     |  5 +--
 CHANGELOG.md                              | 53 +++++++++++++++++++++++++++++++
 README.md                                 |  1 +
```

### 2.3 Baseline-attribution (기준선 귀속)

- **트리**: `.claude/worktrees/t13`, 브랜치 `WT-coverage-tool`, HEAD `4222a5520e229e621ecd882f166b37ea5b58975b` — 감사 시작·종료 시 불변(`git rev-parse HEAD` 2회).
- **작업 트리 상태**: 미커밋 수정 4파일(위 `git diff --stat`), 스테이징 0건. 감사 전후 동일.
- **소스 해시**: 위 E-11 의 4행. 감사 전 = 감사 후.
- **재실행 대조**: §E.4 가 적은 세 해시(`8e1d6367…7dd7ea`·`93d66587…3431c`·`a70dec5f…ee866`)와 이 감사가 독립적으로 잰 값이 **일치**한다 — §E.4 의 해시 주장은 이 감사가 재현했다.
- **모든 수치**: run 단계 기록에서 옮긴 것이 하나도 없다. 위 E-1..E-10 은 전부 이 감사 세션에서 실행한 명령의 출력이다.

### 2.4 Gaps (이 감사가 관측하지 않은 것)

1. **`.moai/reports/t7/sync-audit.md` §T5 를 읽지 않았다.** 그 파일은 카드 `t7` 의 워크트리(`WT-perm-request-id`)에 있어 이 워크트리에서 도달하지 않는다. 따라서 «Craft 85% 가 **네 라운드 연속** UNVERIFIED 였다» 는 배경 주장의 **횟수 부분을 검증하지 못했다.** `spec.md` §1.1 과 plan 감사가 같은 갭을 이미 공시했으므로 SPEC 의 결함이 아니라 이 감사의 도달 범위다.
2. **AC-COVERAGE-006(RED→GREEN 세 전이)을 재관측하지 못했다.** 그것은 착지 이전 시점의 역사적 상태이고, 재현하려면 커밋을 되돌려야 한다. `progress.md` §E.2 단계 1·3·5 의 기록을 **읽었을 뿐** 다시 재지 않았다.
3. **계약 테스트의 단언 3(provider·include)과 5(exclude·perFile)는 개별 변이로 확인하지 않았다.** 단언 4·7 만 쳤다. 대신 단언 5 의 **우회 경로**를 E-5 로 확인했으므로, 그 단언이 «지켜 주는 범위» 는 재지 않았어도 «지켜 주지 못하는 범위» 는 실측했다.
4. **`channel` 이 의존성을 빼는 시나리오를 재현하지 않았다.** `acceptance.md` 엣지 케이스 표가 처음부터 재현 대상에서 뺀 항목이고, 이 감사도 재현하지 않았다. 다만 lockfile 이 `server` 를 선언자로 기록한 사실(E-3)은 그 시나리오에서 npm 이 계속 설치한다는 **정황 근거**이지 실행 관측이 아니다.
5. **린트 도구를 돌리지 않았다.** 이 저장소의 JS/TS 워크스페이스에 ESLint·Biome 설정 파일이 없다(`npm run lint` 스크립트 부재). Consistency 차원의 린트 근거는 `tsc --noEmit` 종료 0 하나뿐이다 — **도구 부재이므로 «통과» 가 아니라 갭으로 적는다.**
6. **`moai gate` 를 감사 안에서 실행하지 않았다.** pre-commit 훅이 그것을 부른다는 사실만 파일을 읽어 확인했고(E-10), 그 게이트가 이 트리에서 무엇을 통과시키는지는 재지 않았다.
7. **`server/coverage/` 는 `.gitignore` 대상이라 git 상태로는 검증되지 않는다.** 감사 중 `--coverage.reporter=json` 프로브로 생긴 `coverage-final.json` 은 삭제하고 표준 `npm run coverage -w server` 를 재실행해 `coverage-summary.json` 단독 상태로 복구했으나(`ls server/coverage/` → `coverage-summary.json`), 이 디렉터리는 추적 대상이 아니므로 해시 대조 집합에 넣지 않았다.

### 2.5 Residual-risk (관측했음에도 남는 위험)

1. **E-5 의 구멍은 오늘 닫혀 있지 않다.** 이 감사가 되돌렸을 뿐, 계약 테스트는 여전히 스크립트 뒤에 붙는 어떤 플래그도 막지 않는다. `--coverage.thresholds.lines=0`·`--coverage.exclude=…` 어느 쪽이든 **커밋 가능한 한 줄**로 게이트를 무력화하면서 스위트는 초록으로 남는다.
2. **게이트를 부르는 주체가 여전히 사람이다.** `moai gate`(pre-commit)가 돌리는 것은 `npm test` 계열이지 `npm run coverage -w server` 가 아니므로, 임계 게이트는 자동 호출 경로에 **아직 실려 있지 않다**. `CHANGELOG.md` 가 이 위험을 정직하게 적었으나, 적는 것과 닫는 것은 다르다.
3. **`FILE_COUNT=11` 은 다음 카드에서 반드시 거짓 실패한다.** `server/src/` 에 파일이 하나라도 늘면 AC-COVERAGE-002 가 «환경 탓» 처럼 보이는 실패를 낸다. 갱신 의무를 다음 카드에 지웠으나, 그 카드가 이 계약을 읽는다는 보장이 없다.
4. **전역 임계의 성격상 개별 파일의 급격한 악화는 총계에 묻힌다.** 오늘 여유가 12%p(97.01 vs 85)나 되므로, `index.ts`(30줄) 규모 파일 여럿이 0%가 되어도 게이트는 울지 않는다. 이는 설계 결정이며 문서가 명시했다.
5. **감사 기준의 차원이 저장소 안에서 통일돼 있지 않다.** 이 카드는 **Lines** 에 85 를 건다. 그런데 가장 최근 sync 감사(`.moai/reports/t10/sync-audit.md:60`)는 Craft 를 **Statements** `91.11% (123/135)` 로 판정했다. 오늘은 두 값 모두 85 위라 결과가 갈리지 않지만, «사람이 두 숫자를 따로 기억하지 않게 한다» 는 §4.3 의 목표는 **차원까지 통일해야 달성된다**.

---

## 3. 차원 점수

적용 프로필은 `.moai/config/evaluator-profiles/default.md` — SPEC frontmatter 에 `evaluator_profile` 이 없고 `harness.default_profile: "default"` 이므로 내장 기본값(Functionality 40% / Security 25% / Craft 20% / Consistency 15%, must-pass = Functionality·Security, Security 하한 **80**)을 쓴다. `harness.yaml` 에 `evaluator_mode: hierarchical` 이 없으므로 평면 가중치 방식이다. 종합은 조화평균이다.

| 차원 | 가중 | 점수 | 판정 | 증거 (원문 기반) |
|---|---|---|---|---|
| Functionality | 40% | **92** | PASS | 게이트 실작동 독립 확인 — `ERROR: Coverage for lines (1.49%) does not meet global threshold (85%)`, EXIT=1, **실패 테스트 0** (E-2). 의존성 lockfile 선언 실측 (E-3). 단언 4·7 변이 시 `1 failed \| 10 passed (11)` (E-4). 문서 수치 전건 재현 — `Test Files 11 passed`·`Tests 105 passed`·`Lines 97.01% (325/335)`·`FILE_COUNT=11 HAS_INDEX=true`·channel `5 passed`/`70 passed` (E-1). 범위 정확히 4 코드 파일 (E-6). 감점 요인 없음 — 요구사항 REQ-COVERAGE-001..007 전건 이행 |
| Security | 25% | **88** | PASS (하한 80 충족) | **이 카드에서 Security 가 뜻하는 것**: 런타임 코드 경로가 없으므로 OWASP 취약점 축이 아니라 ① 공급망 유입 ② 기존 방어물 약화 ③ 증거 무결성 셋이다. ① `git diff 9b86dd8~1 9b86dd8 -- package-lock.json` → **새 패키지 항목 0**, `"peer": true` 제거 2행 + 선언 1행뿐, 버전은 이미 트리에 있던 `vitest` 와 동일 릴리스 `4.1.11` (E-3). ② `server/src/**`·`channel/**` 무변경, 기존 테스트 105 중 104 무영향 (E-6). ③ **감점 −12**: 증거 무결성 방어물에 한 줄 우회로가 있다 — 계약 테스트 초록인 채 헤드라인 97.01 → 98.36 부풀림 실증 (E-5, F-01) |
| Craft | 20% | **80** | PASS | 라인 커버리지 `97.01% (325/335)` ≥ 85 실측, `tsc --noEmit` 종료 0 (E-1). 문서가 자기 미검증을 §E.4 Gaps 5건·Residual-risk 3건으로 선제 공시 — 이 저장소 평균 이상. 감점: 단언 2의 정규식이 지나치게 느슨해 스스로 읽는 파일 안에 우회로를 남김(F-01), `FILE_COUNT=11` 구조적 취약(F-02, 공시됨·미해소), §E.4 «한 번» 오기(F-05), `CHANGELOG` 항목 수 불일치(F-04), **린트 도구 부재로 U 축 근거가 `tsc` 하나뿐**(Gap 5 — 통과가 아니라 갭) |
| Consistency | 15% | **82** | PASS | `server/vitest.config.ts` 가 형제 `channel/vitest.config.ts` 형태(`defineConfig` + `test.coverage`) 준수. frontmatter 관례 저장소 전체와 일치 — 반쪽 전이 아님 (E-8). `CHANGELOG` 절 위치가 `t10` 절 **위**, `README` 행 형식이 기존 표와 동일 (git diff 로 확인). 감점: «GitHub Actions 배선 없음» 반증 (F-03, E-10), Craft 차원이 t10 감사는 Statements·이 카드는 Lines 로 갈림 (F-06) |

### 조화평균

```
4 / (1/92 + 1/88 + 1/80 + 1/82)
= 4 / (0.0108696 + 0.0113636 + 0.0125000 + 0.0121951)
= 4 / 0.0469283
= 85.24
```

**종합 85.2**

**must-pass 방화벽**: Functionality 92 ≥ 80 ✓ · Security 88 ≥ **80** ✓ — 둘 다 독립적으로 하한을 넘는다.

---

## 4. 발견 목록

번호·심각도·차단 여부·확신도를 함께 적는다. 확신도는 재현 명령을 실행해 원문을 본 것을 «실측», 근거는 있으나 실행으로 못 민 것을 «추정» 으로 나눈다.

### F-01 — 계약 테스트의 단언 2 가 스크립트 뒤 플래그를 막지 않는다

- **심각도**: Medium · **차단 여부**: 비차단 · **확신도**: 실측
- **위치**: `server/test/coverage-contract.test.ts:15` (`expect(pkg.scripts.coverage).toMatch(/--coverage|coverage\.enabled/)`)
- **관측한 것**: `server/package.json` 의 `coverage` 를 `"vitest run --coverage --coverage.exclude=src/index.ts"` 로 바꾸고 실행하니 `npm test -w server` 는 `TEST_EXIT=0 / Test Files 11 passed (11) / Tests 105 passed (105)` 로 **완전 초록**, 같은 상태에서 `npm run coverage -w server` 는 `COV_EXIT=0`, `All files … 98.36`, `Lines : 98.36% ( 300/305 )`, 요약 JSON 은 `FILE_COUNT=10 HAS_INDEX=false TOTAL_LINES=98.36`. (원본 복사본으로 되돌린 뒤 해시 4행 일치 — E-11)
- **왜 중요한가**: `CHANGELOG.md` 의 소제목이 «설정을 지우면 테스트가 빨개집니다» 이고, `spec.md` §4.4·§4.5 가 이 방어물의 근거로 카드 `t4` 의 F-10(제외 사유가 낡았는데 헤드라인만 계속 좋아 보이던 상태)을 든다. **그 F-10 상태를 정확히 재현하는 경로가, 계약 테스트가 이미 `readFileSync` 로 열고 정규식까지 돌리고 있는 바로 그 파일 안에 열려 있다.** run 단계는 이 위험을 «루트 워크스페이스 설정 등 다른 자리» 로 서술했는데, 실제 거리는 그보다 훨씬 가깝다. 같은 형태로 `--coverage.thresholds.lines=0` 을 붙이면 임계 자체가 무력해지며 이때도 스위트는 초록이다.
- **왜 차단이 아닌가**: `spec.md` 의 REQ-COVERAGE-001..007 중 스크립트를 플래그 오버라이드로부터 지키라고 요구하는 조항이 **없다**. 즉 이행 실패가 아니라 방어 깊이의 미도달이며, 오늘 트리는 정상이다.
- **닫는 방법**: 단언 2 를 «포함» 에서 «형태» 로 좁힌다. 가장 싼 형태는 한 줄이다.
  ```ts
  expect(pkg.scripts.coverage).toBe('vitest run --coverage')
  ```
  더 느슨하게 두고 싶다면 최소한 부정 단언을 더한다 — `expect(pkg.scripts.coverage).not.toMatch(/--coverage\.(exclude|thresholds)/)`.

### F-02 — `AC-COVERAGE-002` 의 `FILE_COUNT=11` 이 `server/src/` 파일 수에 직결돼 있다

- **심각도**: Medium · **차단 여부**: 비차단 · **확신도**: 실측
- **위치**: `.moai/specs/SPEC-COVERAGE-001/acceptance.md:38` (판정표 AC-COVERAGE-002 행, «파일 수 `11`»)
- **관측한 것**: `ls server/src | wc -l` → `11`, 그리고 `coverage-summary.json` 의 비-`total` 키 개수 → `FILE_COUNT=11`. 두 값이 **정의상 같다**.
- **왜 중요한가**: 다음 카드가 `server/src/` 에 모듈 하나만 더해도 이 수용 기준은 구현이 옳은데도 실패한다. 이 저장소는 «정상 구현을 거짓 실패시키는 기준» 부류로 이미 대가를 치렀고(`spec.md` §4.3 이 `perFile` 을 거부한 사유가 바로 그것이다), 같은 부류가 다른 자리에 남았다. 거짓 실패가 반복되면 기준 자체가 «환경 탓» 으로 읽히기 시작하는 것이 진짜 비용이다.
- **왜 차단이 아닌가**: 이 카드의 착지 시점에는 참이며, run·sync 양 단계가 Gaps 에 명시 공시했다. 갱신 의무도 다음 카드로 이관돼 있다.
- **닫는 방법**: 상수를 관계로 바꾼다 — «`FILE_COUNT` 가 `ls server/src/*.ts | wc -l` 과 같다» 로 기준을 다시 쓰거나, 상수를 버리고 `HAS_INDEX=true` 하나만 남긴다(제외 부재를 재는 목적은 그것으로 충분하다).

### F-03 — «GitHub Actions 같은 자동 실행 배선이 없다» 는 서술이 거짓이다

- **심각도**: Low · **차단 여부**: 비차단 · **확신도**: 실측
- **위치**: `CHANGELOG.md` — «이 저장소에는 아직 GitHub Actions 같은 자동 실행 배선이 없고» / 같은 취지가 `spec.md` §5 «Out of Scope — CI 배선» 의 «이 저장소에 아직 그 배선이 없다»
- **관측한 것**: `find .github -type f` → `.github/workflows/label-sync.yml` 존재. 그 파일은 `on: workflow_dispatch` + `on: push: branches: [main]` 트리거와 `runs-on: ubuntu-latest` 잡을 가진 **실제로 도는 워크플로**다. 더해 `.git_hooks/pre-commit` 이 `moai gate`(vet + lint + test, 16개 언어 감지)를 호출한다.
- **왜 중요한가**: 참인 명제는 「**커버리지를 부르는** CI 가 없다」인데, 문서는 「**CI 배선 자체가** 없다」로 넓게 적었다. 후속 카드가 이 문장을 읽고 «워크플로 디렉터리부터 새로 만들어야 한다» 고 판단하면 이미 있는 `.github/workflows/` 를 못 보고 배선을 중복 설계할 수 있다. 이 SPEC 이 스스로 세운 «관측하지 않은 것을 통과로 적지 않는다» 기준을, 부정 명제 쪽에서 어긴 사례이기도 하다.
- **닫는 방법**: 두 자리의 문장을 좁힌다 — «이 저장소의 GitHub Actions 워크플로(`label-sync.yml`)와 git 훅(`moai gate`)은 커버리지 명령을 부르지 않는다» 로.

### F-04 — `CHANGELOG.md` 가 계약을 «일곱 가지» 라 하고 여덟 개를 열거한다

- **심각도**: Low · **차단 여부**: 비차단 · **확신도**: 실측
- **위치**: `CHANGELOG.md` — «계약 일곱 가지를 단언합니다 — 의존성 선언이 있는지, 버전 대역이 …, 제공자가 `v8`인지, 측정 대상이 `src/**`인지, 리포터에 `json-summary`가 있는지, `coverage` 스크립트가 있는지, 임계가 전역 라인 85인지, 제외가 없고 상단 다섯 줄 안에 사유 주석이 있는지.»
- **관측한 것**: 그 문장 안의 «-인지/-있는지» 절을 세면 **여덟 개**다. 근거 코드인 `server/test/coverage-contract.test.ts` 는 주석 번호 `1·2·3·3b·4·5·6·7` 로 **여덟 무리**를 두되 정수 라벨은 일곱이며, `expect()` 호출 자체는 **열한 번**이다.
- **왜 중요한가**: 세 자리(문서 서술·코드 주석 번호·실제 단언 수)가 서로 다른 수를 낸다. 오늘은 무해하지만, 다음 사람이 «일곱 개가 맞나» 를 확인하려고 셋을 대조하는 순간 어느 것이 정본인지 판정할 근거가 없다.
- **닫는 방법**: 문서 서술을 여덟로 고치거나, 열거를 코드 주석 번호와 같은 묶음(제공자와 측정 대상을 한 항목으로)으로 재정렬한다.

### F-05 — §E.4 가 `AC-001` 축약 표기를 «한 번» 이라 적었으나 두 번이다

- **심각도**: Low · **차단 여부**: 비차단 · **확신도**: 실측
- **위치**: `.moai/specs/SPEC-COVERAGE-001/progress.md` §E.4 Residual-risk — «`acceptance.md` 안에 `AC-001` 이라는 축약 표기가 **한 번** 등장한다»
- **관측한 것**: `grep -o 'AC-001' … | wc -l` → `2`. 위치는 `acceptance.md:222`, `acceptance.md:299`.
- **왜 중요한가**: 잔여 위험을 적는 절이 스스로 관측 가능한 수를 틀렸다. 정정 담당자가 «한 군데만 고치면 된다» 고 읽으면 한 자리가 남고, 그때 «정정했다» 는 기록이 다시 거짓이 된다 — 이 저장소가 t10 에서 네 번 겪은 부류다(`correction-leaves-its-own-record-stale`).
- **닫는 방법**: «두 번(`acceptance.md:222`·`:299`)» 으로 고친다. 축약 표기 자체의 정정은 sync 단계 권한 밖이라는 §E.4 의 판단은 타당하므로 유지한다.

### F-06 — Craft 차원이 재는 커버리지 축이 저장소 안에서 갈린다

- **심각도**: Low · **차단 여부**: 비차단 · **확신도**: 실측
- **위치**: `spec.md` §4.3 («값 85 는 sync 단계 감사의 Craft 임계와 **의도적으로 같은 숫자**다 — 도구가 감사 기준을 그대로 강제하게 만들어, 사람이 두 숫자를 따로 기억하지 않게 한다») vs `.moai/reports/t10/sync-audit.md:60`
- **관측한 것**: t10 의 sync 감사는 Craft 를 `Statements : 91.11% ( 123/135 ) ≥ 85%` 로 판정했다. 이 카드는 **Lines** 에 85 를 건다. 오늘 server 트리에서 두 값은 `96.5` / `97.01` 로 모두 85 위이므로 결과는 갈리지 않는다.
- **왜 중요한가**: 「사람이 두 숫자를 따로 기억하지 않게 한다」는 목표는 **숫자만이 아니라 차원까지 같아야** 달성된다. 구문과 라인은 다른 값이며, 어떤 트리에서는 하나가 85 를 넘고 다른 하나가 못 넘는다. 그 트리에서 감사자와 도구가 반대 판정을 낸다.
- **닫는 방법**: 감사 절차 쪽이 Craft 를 어느 축으로 재는지 한 자리에 못 박는다. `spec.md` §5 가 「감사 절차 자체」를 범위 밖으로 뒀으므로 **이 카드의 몫은 아니며**, 후속 카드 후보로 남긴다.

### F-07 — 「Craft 가 네 라운드 연속 UNVERIFIED」를 검증하지 못했다 (가설, 결함 아님)

- **심각도**: Low · **차단 여부**: 비차단 · **확신도**: **미검증 — 가설로 표기**
- **관측한 것**: 근거 문서 `.moai/reports/t7/sync-audit.md` 는 카드 `t7` 워크트리에 있어 이 트리에서 도달하지 않는다. 이 트리에서 도달하는 `.moai/reports/` 를 훑으면 `t10/sync-audit.md:272` 가 «이전 라운드들이 UNVERIFIED 로 넘겼던 85% 임계를 직접 재서 해소했다» 고 적고 있어 **UNVERIFIED 이력이 있었다는 사실 자체는 정황으로 뒷받침**되나, 그것은 `channel` 워크스페이스에 대한 것이고 **횟수 «네 라운드» 는 확인되지 않는다**.
- **판정**: `spec.md` §1.1 이 「이 SPEC 의 작성자는 그 파일을 직접 읽지 않았다」를 **먼저 공시**했고 plan 감사도 같은 갭을 적었다. **문서의 결함이 아니라 이 감사의 도달 범위**이므로 감점하지 않는다. 이 항목은 닫을 대상이 아니라 기록이다.

---

## 5. 판정

> **PASS — 종합 85.2 (조화평균)**
>
> - Functionality **92** (must-pass, 하한 통과)
> - Security **88** (must-pass, 하한 **80** 통과)
> - Craft **80**
> - Consistency **82**
>
> **차단 발견: 없음.**

### 판정 근거

이 카드가 문서로 약속한 것 — 임계 게이트의 실작동, 의존성의 자기 선언, 회귀 짝의 존재, 범위 준수 — 을 **네 가지 모두 독립적인 방법으로 확인했다.** 특히 임계 게이트는 run 단계와 **반대 방향의 프로브**(설정을 변이시키는 대신 측정 대상을 줄이는 방식)로 확인했으므로, run 단계 관측을 그대로 믿은 것이 아니라 **다른 경로로 같은 결론에 도달**했다. 문서에 적힌 숫자는 하나의 예외도 없이 재현됐다.

sync 레인이 스스로 올린 소프트 스팟 셋 중 **둘은 반증**됐다 — §4.4 의 `66-68·71-72` 는 리포터보다 **더 정확한** 표기이고(E-7), 형제 문서 셋의 frontmatter 부재는 **저장소 전체 관례**이지 반쪽 전이가 아니다(E-8). 남은 하나(`FILE_COUNT=11`)는 확인됐고 F-02 로 기록했다.

**Medium 두 건은 차단으로 올리지 않았다.** 둘 다 이행 실패가 아니라 방어 깊이의 미도달이며, `spec.md` 의 어느 요구사항도 그것을 요구하지 않는다. 다만 F-01 은 이 카드가 스스로 인용한 F-10 선례를 정확히 재현하는 경로이므로, **다음에 이 파일을 여는 카드가 반드시 닫아야 할 후보 1번**으로 명시한다 — 비용이 단언 한 줄이라는 점이 그 판단을 쉽게 만든다.

Low 넷은 전부 문서 문언의 정확성 문제이고 게이트 동작에 영향이 없다. 다만 F-03·F-05 는 **관측 가능한 사실을 틀리게 적은** 것이라, 이 저장소가 반복해 대가를 치른 부류(정정이 스스로 낡은 기록을 남긴다)에 해당한다.

### 상태 전이 정당성

`status: in-progress → completed` 전이를 **정당하다고 판정한다.**

- AC-COVERAGE-001·002·005 는 이 감사가 **직접 재현**했다(E-1·E-3·E-6).
- AC-COVERAGE-003 은 **독립적인 등가 기제**로 확인했다(E-2 — 설정 파일의 85 가 읽혀 실패하고, 실패 테스트 0 이므로 귀속이 명확하다).
- AC-COVERAGE-004 는 run 단계가 변이하지 않은 단언 중 둘(4·7)을 이 감사가 쳐서 **작동을 확인**했다(E-4). 남은 단언 3·5 는 재지 않았으나(Gap 3), 단언 5 의 **한계**는 실측했다(E-5).
- AC-COVERAGE-006 은 역사적 전이라 재관측하지 못했다(Gap 2) — 기록을 읽었을 뿐이다. 이 한 건이 「전부 재현」이 아닌 「다섯 재현 + 한 건 기록 판독」이라는 것을 명시한다.
- 형제 문서 셋의 frontmatter 부재는 저장소 관례이므로 전이에 남은 필드가 없다(E-8).
- `sync_commit_sha: pending-backfill-sync` 는 커밋이 자기 SHA 를 모르는 물리적 한계로, D3 관례대로 후속 백필이 채운다. **백필이 실제로 이뤄지는지는 이 감사의 범위 밖이며, 리드가 확인할 항목이다.**

### 권고

| 우선순위 | 항목 | 소유 |
|---|---|---|
| 높음 | **F-01** — 계약 테스트 단언 2 를 `toBe('vitest run --coverage')` 로 좁힌다 (한 줄) | 후속 카드 |
| 높음 | **F-03** — `CHANGELOG.md`·`spec.md` §5 의 CI 부재 문장을 「커버리지를 부르는 CI 가 없다」로 좁힌다 | 이 카드에서 정정 가능 |
| 중간 | **F-05** — §E.4 «한 번» → «두 번(`:222`·`:299`)» | 이 카드에서 정정 가능 |
| 중간 | **F-04** — `CHANGELOG` 항목 수를 코드 주석 번호와 맞춘다 | 이 카드에서 정정 가능 |
| 중간 | **F-02** — `FILE_COUNT=11` 을 관계식으로 바꾸거나 `HAS_INDEX` 만 남긴다 | 후속 카드 |
| 낮음 | CI 배선(`npm run coverage -w server` 자동 호출) — 이미 `.github/workflows/` 가 있으므로 잡 하나를 더하면 된다 | 후속 카드 |
| 낮음 | **F-06** — 감사 Craft 축(Lines vs Statements)을 한 자리에 못 박는다 | 감사 절차 쪽 (이 SPEC 범위 밖) |

**F-03·F-04·F-05 는 문서 문언만 고치면 되고 코드·게이트에 영향이 없으므로, 이 카드 안에서 정정하고 재감사 없이 종결하는 선택이 가능하다.** 셋 다 이 감사가 정확한 위치와 정확한 교체 문언을 명시했다.

---

## 6. 감사 무결성 진술

- 이 감사는 `server/package.json` 에 1회, `server/vitest.config.ts` 에 2회, **총 3회의 변이**를 넣었다. 각 변이 전 원본을 `/tmp` 에 사본으로 뜨고 변이 후 그 사본을 되돌려 복원했다.
- 복원은 **해시로 증명**했다 — 감사 전 4행과 감사 후 4행이 `diff` 로 완전 일치(E-11 `TREE_INTACT`).
- 미커밋 문서 4파일(`CHANGELOG.md`·`README.md`·`progress.md`·`spec.md`)은 **한 글자도 건드리지 않았다** — 감사 전후 `git diff --stat` 이 동일하다.
- **커밋하지 않았고, 스테이징하지 않았다.** 이 보고서(`.moai/reports/t13/sync-audit.md`) 외의 어떤 파일도 새로 쓰지 않았다.
- 프로브 부산물인 `server/coverage/coverage-final.json` 은 삭제하고 표준 `npm run coverage -w server` 를 재실행해 `coverage-summary.json` 단독 상태로 복구했다(`server/coverage/` 는 `.gitignore` 대상).
