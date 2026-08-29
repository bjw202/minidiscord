# SPEC-COVERAGE-001 수용 기준

각 기준은 **실행할 명령과 관측할 결과**로 이루어진다. 명령이 하나인 기준도 있고 여럿인 기준도 있으나(AC-COVERAGE-003·005), 어느 쪽이든 관측할 결과가 빠짐없이 열거돼 있고 **판정은 이분법**이다 — 열거된 것이 전부 성립하면 통과, 하나라도 아니면 실패이며 그 사이는 없다.

모든 명령은 워크스페이스 루트(`.claude/worktrees/t13`)에서 실행한다.

## 이 문서가 지키는 검증 원칙

이 SPEC 이 다루는 것은 **설정**이다. 설정 기준은 특유의 함정이 둘 있고, 아래 표가 그 둘을 자리마다 명시한다.

**함정 1 — 우연한 성공을 실력으로 읽는다.** 커버리지 측정은 `server` 가 도구를 선언하기 **전에도 성공한다**(§ 배경, 끌어올리기). 그래서 "커버리지가 측정된다"는 단언은 이 카드가 고치려는 결함이 **그대로 남아 있어도 통과한다.**

**함정 2 — 설정이 지워져도 아무것도 빨개지지 않는다.** 임계값 한 줄을 지우면 게이트는 조용히 무력해지고 테스트 스위트는 계속 초록이다. 셸 명령으로만 재는 기준은 이 상태를 잡지 못한다.

| 위험한 자리 | 순진한 기준이 왜 무의미한가 | 이 문서가 대신 관측하는 것 |
|---|---|---|
| 의존성 선언 | `npm ls @vitest/coverage-v8 -w server` 는 **오늘 이미 종료 0 이다** — 끌어올려진 사본을 `vitest` 아래 전이 의존성으로 찾아 준다. 이 명령을 기준으로 삼으면 아무것도 재지 않는다 | `--depth=0` 을 붙여 **직접 선언만** 본다. 오늘 종료 `1`, 선언 후 종료 `0` (AC-COVERAGE-001) |
| 커버리지 측정 | "명령이 종료 0 으로 끝났다"는 임계가 아예 없는 설정도 통과시킨다. 한 겹 더 있다 — 임계를 **명령줄로 넘겨** 재면 vitest 는 넘겨받은 값으로 판정하므로, `server/vitest.config.ts` 가 아예 없어도 같은 결과가 나온다 | **설정 파일의** 임계를 실측값 위로 올린 프로브가 **실패하는가** — 오버라이드 없이, 이 카드가 심은 값을 직접 읽혀 확인 (AC-COVERAGE-003) |
| 진입점 제외 부재 | 리포트 총계만 보면 `index.ts` 를 통째로 제외한 설정이 **더 좋은 숫자**로 통과한다 | 파일별 리포트에 `src/index.ts` 항목이 **존재하는가** (AC-COVERAGE-002) |
| 설정의 영속성 | 셸로만 재면 설정이 지워진 뒤에도 `npm test -w server` 는 초록이다 | 계약을 읽어 단언하는 테스트가 스위트 안에 있고, **선언을 지우면 그 테스트가 빨개지는가** (AC-COVERAGE-004) |
| 범위 경계 | "변경이 작다"는 관측이 아니다 | 기준 SHA 대비 변경 파일 목록이 선언한 집합과 **정확히** 같은가 (AC-COVERAGE-005) |

같은 이유로 다음 형태는 이 문서에서 금지한다 — "`server/vitest.config.ts` 가 존재한다", "커버리지 명령이 있다", "테스트가 통과한다(이름 없이)", "커버리지가 85% 이상이다(측정 명령을 밝히지 않고)", 그리고 설정 본문을 지워도 참인 단언.

**설정 파일에 대한 문자열 검사 금지 — 그리고 그 유일한 예외.** 아래 두 자리(AC-COVERAGE-002 사유 문단, AC-COVERAGE-004 사유 문단)가 설정 파일을 문자열로 검사하는 것을 금지한다. 예외는 **하나**뿐이다 — REQ-COVERAGE-005 의 «진입점을 제외하지 않는 사유를 한국어 주석으로 적는다» 조항. 주석은 정의상 **값으로 읽을 수 없으므로**(설정 객체를 임포트해도 주석은 사라진다) 문자열이 유일한 관측 수단이다. 그 예외는 AC-COVERAGE-004 단언 7 한 자리에만 있고, 범위는 **파일 상단 다섯 줄**과 **낱말 두 개**(`index.ts`·`process.argv`)로 좁혀 두었다 — 서식이나 문장 표현이 바뀌어도 거짓 실패하지 않을 만큼 좁고, 주석을 통째로 지우면 빨개질 만큼은 넓다. 이 예외를 다른 조항으로 확대하지 않는다.

**반대 방향도 막는다.** 잘못 쓴 기준은 정상 구현을 거짓 실패시킨다. 이 SPEC 에서 그 위험이 있는 자리는 둘이다 — (1) 임계를 `perFile` 로 걸면 `index.ts`(83.33%)가 정상 트리에서 게이트를 깬다(`spec.md` §4.3 이 전역으로 못 박은 이유), (2) 파일별 관측을 텍스트 리포터로 하면 **100% 파일의 행이 숨겨져** 존재 여부 판정이 뒤집힌다 — 그래서 파일별 관측은 `json-summary` 로만 한다.

`spec_base_sha` 는 이 SPEC 의 run 단계 진입 시점 커밋이다. M1 단계 0 에서 `git rev-parse HEAD` 로 기록하며, 범위 경계 검사는 `HEAD` 가 아니라 그 값을 기준으로 비교한다. 기준 SHA 가 없으면 범위 경계 기준은 통과가 아니라 **실패**다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-COVERAGE-001 | REQ-COVERAGE-001 | `npm ls @vitest/coverage-v8 -w server --depth=0` | 종료 코드 `0`, 출력에 `@minidiscord/server` 의 **직접 자식**으로 `@vitest/coverage-v8` 이 나타남 |
| AC-COVERAGE-002 | REQ-COVERAGE-002, REQ-COVERAGE-003, REQ-COVERAGE-005 | `npm run coverage -w server` | 종료 코드 `0`, `coverage-summary.json` 의 총 라인 ≥ 85, 파일별 항목에 `src/index.ts` 존재, 파일 수 `11`(= 제외 부재의 직접 관측) |
| AC-COVERAGE-003 | REQ-COVERAGE-004 | **설정 파일** 임계를 임시로 98 로 바꿔 오버라이드 없이 2회 실행(단계 6) + 계약 테스트가 생긴 뒤 **재프로브** 1회(단계 7 뒤) | 임계 98 → **0 이 아닌 종료 코드** + 임계 미달 메시지 / 되돌린 뒤(85) → 종료 `0`, 그리고 해시 대조로 복원 증명 |
| AC-COVERAGE-004 | REQ-COVERAGE-001(대역), REQ-COVERAGE-002(리포터), REQ-COVERAGE-005(주석), REQ-COVERAGE-006 | `npm test -w server -- --reporter=verbose` + 변이 3회 | 이름 붙은 테스트의 `✓` 줄이 나타나고, 변이 셋 각각에서 **그 테스트만** 실패 |
| AC-COVERAGE-005 | REQ-COVERAGE-007 | 아래 본문의 네 관측(명령 여덟 줄) | 기준 SHA 확인 종료 `0`, `channel`·`server/src` 무변경, **추적 ∪ 미추적** 변경 파일 목록이 선언한 코드 산출물 집합과 정확히 일치 |
| AC-COVERAGE-006 | — (절차 관측. 사유는 아래 AC-COVERAGE-006 절 머리말) | 아래 본문 | 세 전이가 순서대로 관측됨 |

---

## Given-When-Then 시나리오

### AC-COVERAGE-001 — 커버리지 도구를 server 가 자기 이름으로 선언한다

**Given** 워크트리 루트에 `npm install` 이 끝나 있다(233 패키지, 종료 0).
**When** 다음을 실행한다.

```bash
npm ls @vitest/coverage-v8 -w server --depth=0; echo "EXIT=$?"
npm ls @vitest/coverage-v8 -w channel --depth=0; echo "EXIT=$?"   # 대조군
```

**Then** 첫 명령이 `EXIT=0` 으로 끝나고, 출력에서 `@vitest/coverage-v8@…` 이 `@minidiscord/server@ -> ./server` 의 **직접 자식**(`└──`)으로 나타난다. `vitest@…` 아래에 중첩된 형태(`└─┬ vitest@… / └── @vitest/coverage-v8@…`)만 보이면 **실패**다 — 그것이 오늘의 상태이며 이 카드가 고치려는 것이다.

**이 기준이 왜 이 형태인가.** `--depth=0` 없이 같은 명령을 돌리면 **오늘 이미 종료 0** 이다. 끌어올려진 사본을 `vitest` 의 전이 의존성으로 찾아 주기 때문이다. 그 형태를 기준으로 쓰면 결함이 그대로 있는 채로 통과한다. `--depth=0` 은 직접 선언만 보므로 두 상태를 가른다. 두 값 모두 이 워크트리에서 실측했다.

```
# 오케스트레이터 실측 (2026-08-29, 이 워크트리, 구현 전)
$ npm ls @vitest/coverage-v8 -w server --depth=0
minidiscord@ .../t13
└── (empty)
EXIT=1                                     ← 이 기준이 오늘 실패한다는 증거

$ npm ls @vitest/coverage-v8 -w channel --depth=0
└─┬ @minidiscord/channel@0.1.0 -> ./channel
  └── @vitest/coverage-v8@4.1.11
EXIT=0                                     ← 선언된 상태의 대조군
```

대조군을 함께 실행하는 이유는 `EXIT=1` 이 «선언 안 됨» 이 아니라 «명령 형식이 틀림» 이어서 나오는 경우를 배제하기 위해서다. 같은 명령이 `channel` 에서 `0` 이면 명령 형식은 옳다.

### AC-COVERAGE-002 — 커버리지 명령이 서고, 진입점이 제외되지 않았다

**Given** AC-COVERAGE-001 이 통과했다.
**When** 다음을 실행한다.

```bash
npm run coverage -w server; echo "EXIT=$?"
node -e "const s=require('./server/coverage/coverage-summary.json');
  console.log('LINES_PCT=' + s.total.lines.pct);
  console.log('HAS_INDEX=' + Object.keys(s).some(k => k.endsWith('src/index.ts')));
  console.log('FILE_COUNT=' + (Object.keys(s).length - 1));"
```

**Then** 두 가지가 모두 성립한다.

1. `EXIT=0` 이다.
2. `LINES_PCT` 가 85 이상이고, `HAS_INDEX=true` 이며, `FILE_COUNT` 가 `11`(오늘 `server/src/` 의 파일 수)이다.

둘 중 하나라도 아니면 **실패**다.

**제외 부재를 설정 파일의 문자열로 재지 않는 이유.** `grep exclude server/vitest.config.ts` 같은 형태는 두 방향으로 틀린다 — 한국어 주석이 그 낱말을 지나가듯 언급하기만 해도 정상 설정이 거짓 실패하고, 반대로 제외를 다른 형태(`coverage.all`, 리포터 필터)로 넣으면 문자열 검사를 지나간다. **파일 수와 `index.ts` 의 존재가 제외 부재의 직접 관측**이며, 문자열 검사는 그 대용이 아니다.

**`HAS_INDEX` 와 `FILE_COUNT` 가 이 기준의 핵심이다.** 총계만 보면 `index.ts` 를 제외한 설정이 **더 좋은 숫자**로 통과한다 — 제외는 언제나 헤드라인을 좋아 보이게 만든다. 파일별 목록에서 그 파일의 **존재**를 직접 확인해야 제외 부재가 관측된다. 그리고 이 관측은 반드시 `coverage-summary.json` 으로 한다 — 텍스트 리포터는 100% 파일의 행을 표시하지 않으므로, 텍스트 출력에서 파일을 세면 **정상 설정이 거짓 실패한다**(오케스트레이터가 기준선 측정에서 실제로 마주친 함정이다).

`LINES_PCT` 를 `≥ 85` 로만 재고 오늘의 `97.01` 을 못 박지 않는 이유는, 정상적인 코드 변경마다 그 숫자가 움직이는데 그때마다 기준이 거짓 실패하면 기준이 «환경 탓» 으로 무시되기 때문이다. 계약은 임계이지 오늘의 값이 아니다.

**`coverage-summary.json` 은 저절로 생기지 않는다.** vitest 의 기본 리포터는 `coverage-final.json` 만 만든다. 이 기준이 도는 것은 REQ-COVERAGE-002 가 `reporter: ['text', 'json-summary']` 를 **계약으로** 요구하기 때문이다. 리포터 조항이 없으면 다른 모든 요구사항을 만족한 구현에서도 이 기준이 `Cannot find module` 로 실패한다. 리포터가 지워지는 경우는 AC-COVERAGE-004 단언 3b 가 따로 잡는다.

**`FILE_COUNT=11` 이 왜 오늘 값에 못 박혀 있는가 — 그리고 언제 갱신하는가.** 위 `LINES_PCT` 와 달리 이 값은 오늘의 숫자다. 파일 수는 제외 부재를 **직접** 재는 유일한 관측이라(제외가 들어가면 목록에서 파일이 사라진다) 범위를 두면 관측력이 사라진다. 대신 그 대가가 있다 — **다음 카드가 `server/src/` 에 파일을 하나만 더해도 이 기준은 거짓 실패한다.** 그때 고칠 대상은 이 기준이 아니라 그 카드다: 파일을 더한 카드가 이 숫자를 자기 변경의 일부로 갱신하고, 갱신 사실을 자기 진행 기록에 남긴다. 이 문단이 그 계약을 `acceptance.md` 본문에 둔 이유는, 나중에 이 기준만 읽는 사람이 `plan.md` §E 를 열어 보지 않아도 이유를 알 수 있게 하기 위해서다.

### AC-COVERAGE-003 — 85% 게이트에 실제로 이빨이 있다

**Given** AC-COVERAGE-002 가 통과했다(오늘 라인 커버리지 97.01%).
**When** **설정 파일의 임계값 자체**를 임시로 바꿔 실행한다 — 단계 6 에서 두 번(프로브 A'·B'), 그리고 계약 테스트가 생긴 뒤 재프로브로 한 번 더(아래 참조). 모든 실행이 **명령줄로 임계를 넘기지 않는다** — 이 카드가 `server/vitest.config.ts` 에 심은 값이 실제로 읽히는지가 이 기준이 재는 것이다.

```bash
# 변이 전 해시를 먼저 잡는다 (되돌림 증명의 기준값)
shasum -a 256 server/vitest.config.ts

# 프로브 A' (주경로) — 설정의 lines: 85 를 98 로 바꾼 뒤, 오버라이드 없이 실행한다. 실패해야 한다.
#   계약 테스트는 lines === 85 를 단언하므로 이 상태에서 함께 실패한다.
#   그 실패가 임계 판정을 가리지 않도록 프로브 실행에서만 그 파일을 뺀다.
npm run coverage -w server -- --exclude 'test/coverage-contract.test.ts'; echo "PROBE_A_EXIT=$?"

# 설정을 85 로 되돌린다.

# 프로브 B' — 되돌린 상태에서, 역시 오버라이드 없이 실행한다. 통과해야 한다.
npm run coverage -w server; echo "PROBE_B_EXIT=$?"

# 되돌림 증명 — 변이 전 값과 같아야 한다.
shasum -a 256 server/vitest.config.ts

# 재프로브 — 단계 7(계약 테스트 생성)이 끝난 뒤, 위 프로브 A' 를 같은 형태로 한 번 더 돌린다.
#   이번에는 제외 대상 파일이 실제로 존재하므로 --exclude 가 동작하고,
#   그 출력으로 아래 관측 2 와 「Lines : 가 기준선과 같다」를 판정한다. 끝나면 다시 85 로 되돌리고 해시를 대조한다.
```

**Then** 넷이 모두 성립한다.

1. `PROBE_A_EXIT` 가 `0` 이 아니고, 그 출력에 임계 미달을 밝히는 메시지가 있다 — 문자열은 `does not meet global threshold (98%)` 다(plan 감사가 실행으로 확인한 원문). `global` 이라는 낱말이 나오는 것 자체가 임계가 **전역**으로 걸렸다는 부수 관측이다.
2. 프로브 A' 의 실행에서 **실패한 테스트가 없다.** 테스트가 실패했다면 종료 코드가 0 이 아닌 이유를 임계 미달로 귀속할 수 없으므로, 그 관측은 통과가 아니라 **Gap** 이다. **이 항목은 재프로브에서 판정한다** — 단계 6 시점에는 계약 테스트가 아직 없어 «실패한 테스트가 없다» 가 자명하게 참이고, 이 항목이 잡으려는 상태(계약 테스트가 프로브를 오염시킴)는 그 파일이 존재할 때에만 생긴다.
3. `PROBE_B_EXIT` 가 `0` 이다.
4. 되돌린 뒤의 해시가 변이 전 해시와 **같다.**

프로브 A'·B' 와 재프로브 — 세 실행 모두의 출력 **원문**을 `progress.md` §E.2 에 남긴다.

**왜 설정 파일이고 명령줄이 아닌가 (plan 감사 F-01).** 초안은 `--coverage.thresholds.lines=98` 을 명령줄로 넘겼다. 감사가 실행으로 보인 결과는 두 겹이다. 그 형식은 **인식된다** — 그래서 초안의 `plan.md` §E 가 «미확인» 으로 적어 두었던 위험은 해소됐다(그 행은 지금의 사실로 다시 쓰였다). 그런데 바로 그 때문에 vitest 는 **넘겨받은 값**으로 판정하고, 이 카드가 설정에 심을 `85` 는 한 번도 읽히지 않는다. 감사가 `server/vitest.config.ts` 가 **존재하지도 않는** 트리에서 그 두 프로브를 돌렸더니 A 는 exit 1, B 는 exit 0 — 이 카드가 착지하기 **전에 이미** 둘 다 «통과» 였다. REQ-COVERAGE-004 를 통째로 지워도 초록인 기준이며, 이 문서가 스스로 세운 원칙(«게이트에 이빨이 있는지 직접 확인»)을 정면으로 어긴다. 설정 파일을 고쳐 재는 경로만이 이 카드가 만드는 것을 잰다.

**CLI 오버라이드는 보조 관측으로만 남는다.** run 단계는 참고로 `npm run coverage -w server -- --coverage.thresholds.lines=98` 을 한 번 돌려 원문을 남겨도 좋다. 그것이 말해 주는 것은 «vitest 의 임계 기능 자체가 이 버전에서 살아 있다» 하나뿐이다. **이 관측은 REQ-COVERAGE-004 의 근거가 아니며, 프로브 A' 를 대체하지 않는다.** 프로브 A' 를 건너뛰고 이 보조 관측만으로 통과를 적는 것은 허용하지 않는다.

**계약 테스트를 프로브에서 빼는 이유와 그 대가.** 프로브 A' 의 상태(설정 `lines: 98`)는 AC-COVERAGE-004 단언 4(`lines === 85`)를 필연적으로 깬다. 그대로 두면 «종료 코드가 0 이 아니다» 가 임계 미달 때문인지 계약 테스트 실패 때문인지 가려지지 않는다 — plan 감사가 실제로 마주친 자리다. 그래서 프로브 **실행에서만** 그 파일을 뺀다. 제외되는 파일은 `server/src/**` 의 어떤 모듈도 임포트하지 않으므로 커버리지 총계에 영향이 없어야 하며, 그것은 가정이 아니라 **관측 대상**이다 — 프로브 출력의 `Lines :` 값이 기준선 `97.01% (325/335)` 와 같은지 함께 확인하고, 다르면 멈추고 진단한다. **그리고 이 확인은 계약 테스트가 존재하는 상태에서 한다** (plan 감사 2회차 NEW-02). `plan.md` §F 는 임계 프로브를 단계 6 에, 계약 테스트 생성을 단계 7 에 두므로, 단계 6 시점에는 제외 대상 파일이 **아직 없다** — 없는 파일을 뺀 총계가 같은 것은 자명하게 참이라 아무것도 재지 못한다. 그래서 **단계 순서는 그대로 두고, 단계 7 뒤에 프로브 A' 를 한 번 더 돌려(재프로브) 그 출력으로 이 확인과 위 관측 2 를 판정한다.** 단계 6 의 프로브가 재는 것은 관측 1·3·4 다. 두 실행의 원문을 **모두** `progress.md` §E.2 에 남긴다. (사실 자체는 참이다 — 2회차 감사가 계약 테스트가 있는 상태에서 제외 유무 양쪽을 재어 `Lines : 97.01% (325/335)` 로 동일함을 확인했다. 이 개정이 고친 것은 그 사실이 아니라 **문서가 재겠다고 선언한 자리에서 재지 못하던 것**이다.) 이 제외는 프로브 A'·B' 와 재프로브에만 적용하며 품질 게이트의 `npm test -w server` 에는 적용하지 않는다.

**임계값 98 을 고른 이유.** 실측값 97.01 **바로 위**다. 큰 숫자(예: 100)로 재면 «어떤 숫자든 실패시키는 설정» 과 «실측값을 실제로 비교하는 설정» 이 구분되지 않는다. 98 은 경계가 측정값에 붙어 있음을 함께 보인다.

**관측을 건너뛰고 통과로 적는 것은 허용하지 않는다.** 프로브 A' 가 실패하지 않으면 게이트가 서지 않은 것이므로, run 단계는 멈추고 진단한다.

### AC-COVERAGE-004 — 설정이 지워지면 테스트 스위트가 빨개진다

> 이 기준이 요구하는 새 테스트 파일 한 개(`server/test/coverage-contract.test.ts`)는 **리드 판정으로 승인됐다(2026-08-29)** — `spec.md` §4.5. 조건부 조항이 아니다.

**Given** `server/test/coverage-contract.test.ts` 가 계약을 읽어 단언한다.
**When** 다음을 실행한다.

```bash
npm test -w server -- --reporter=verbose
```

**Then** 출력에 `✓ test/coverage-contract.test.ts > ` 로 시작하는 줄이 나타나고, 그 테스트가 다음 일곱을 모두 단언한다.

```ts
import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
// 설정 파일을 **텍스트가 아니라 값으로** 읽는다 — 아래 사유 참조
import viteConfig from '../vitest.config.js'

const major = (range: string) => range.replace(/^[^\d]*/, '').split('.')[0]

it('coverage tooling contract holds', async () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const cov = (viteConfig as any).test.coverage

  // 1. 의존성을 server 자신이 선언한다 (끌어올리기에 기대지 않는다)
  expect(pkg.devDependencies['@vitest/coverage-v8']).toBeTruthy()
  // 2. coverage 스크립트가 있고 커버리지를 켠다
  expect(pkg.scripts.coverage).toMatch(/--coverage|coverage\.enabled/)
  // 3. 제공자와 측정 대상
  expect(cov.provider).toBe('v8')
  expect(cov.include).toEqual(['src/**'])
  // 3b. 리포터 — json-summary 가 없으면 AC-COVERAGE-002 가 읽을 파일이 만들어지지 않는다
  expect(cov.reporter).toContain('json-summary')
  // 4. 임계값 85 (라인) — 숫자가 계약이다
  expect(cov.thresholds.lines).toBe(85)
  // 5. 제외 없음, 전역 임계 (perFile 아님)
  expect(cov.exclude).toBeUndefined()
  expect(cov.thresholds.perFile).toBeFalsy()
  // 6. 제공자와 vitest 가 같은 메이저 대역이다 (어긋나면 제공자 적재가 실패한다)
  expect(major(pkg.devDependencies['@vitest/coverage-v8']))
    .toBe(major(pkg.devDependencies.vitest))
  // 7. 진입점을 제외하지 않은 사유가 파일 상단 주석에 남아 있다
  //    — 주석은 값으로 읽을 수 없으므로 문자열 검사 금지의 유일한 명시 예외다 (§ 검증 원칙)
  const head = readFileSync(new URL('../vitest.config.ts', import.meta.url), 'utf8')
    .split('\n').slice(0, 5).join('\n')
  expect(head).toContain('index.ts')
  expect(head).toContain('process.argv')
})
```

**첫 줄의 임포트는 생략할 수 없다.** `server` 에는 `globals: true` 설정이 없고 기존 테스트 10개가 전부 명시 임포트를 쓴다. 임포트 없이 두면 `ReferenceError: it is not defined` 로 **스위트 자체가 실패**하고 «테스트 0개» 가 되어, 위의 `✓` 줄도 아래의 변이 조준 판정도 성립하지 않는다. plan 감사가 초안 코드를 그대로 실행해 그 실패를 관측했고, 이 한 줄을 더하자 통과했다.

**설정을 텍스트가 아니라 값으로 읽는 이유.** 문자열 검사(`expect(cfg).not.toContain('exclude')`)는 두 방향으로 틀린다 — 진입점 사유를 적은 한국어 주석이 그 낱말을 지나가듯 담기만 해도 정상 설정이 거짓 실패하고, 반대로 서식만 다르게 쓴 제외(`exclude : [...]`)는 검사를 지나간다. 설정 객체를 임포트해 **값**을 보면 그 두 방향이 닫힌다.

**다만 «값으로 읽으면 모든 방향이 닫힌다» 고 말할 수는 없다.** 단언 3~6 이 읽는 것은 이 파일이 **내보낸 원본 설정 객체**이지 vitest 가 실제로 적용하는 «해석된» 설정이 아니다. 제외가 다른 자리(루트 워크스페이스 설정 등)에서 들어오면 이 단언들은 그대로 통과한다. 그 실효 측면은 AC-COVERAGE-002 의 `FILE_COUNT`·`HAS_INDEX` 가 덮으므로 잔여 위험은 작지만, **두 기준이 함께 있어야 닫히는 것**이지 이 단언 하나로 닫히는 것이 아니다.

**변이로 조준을 확인한다.** 다음 셋을 각각 따로 돌린다. 매번 `npm test -w server -- --reporter=verbose` 를 다시 실행하고, 되돌린 뒤 해시 대조로 복원을 증명한다.

| 변이 | 조준하는 단언 | 되돌림 증명 |
|------|---------------|-------------|
| `server/package.json` 의 `devDependencies` 에서 `@vitest/coverage-v8` 줄 **하나만** 삭제 | 단언 1 (의존성 선언) | `shasum -a 256 server/package.json` |
| 같은 파일에서 `"@vitest/coverage-v8"` 의 범위를 `"^3.0.0"` 으로 변경 | 단언 6 (메이저 대역 일치) | 같은 파일 해시 |
| `server/vitest.config.ts` 의 `reporter` 배열에서 `'json-summary'` **하나만** 삭제 | 단언 3b (리포터) | `shasum -a 256 server/vitest.config.ts` |

세 변이 각각에서 실패하는 테스트가 **이 테스트 하나뿐**이어야 한다 — 실패가 없으면 그 단언이 아무것도 재지 않는 것이고, 다른 테스트까지 무너지면 기준이 이 계약이 아니라 다른 것을 재고 있는 것이다. 실패 테스트 이름 집합의 **원문**을 변이마다 `progress.md` §E.2 에 남긴다.

**이 변이들은 굵지 않다.** 파일 전체를 되돌리는 변이는 일곱 단언 중 어느 것이 살아 있는지 가르지 못한다(`coarse-mutation-hides-halves`). 한 줄씩만 건드리면 단언 하나씩이 조준된다.

두 번째 변이(`^3.0.0`)를 넣은 이유: 대역 조항은 REQ-COVERAGE-001 의 절반인데, `npm ls --depth=0`(AC-001)은 해결되기만 하면 어떤 범위든 종료 0 이고 단언 1 의 `toBeTruthy()` 는 값의 존재만 본다 — 즉 그 조항은 계약에만 있고 관측에는 없었다(plan 감사 F-07). 세 번째 변이는 리포터 조항에 같은 일이 생기지 않게 한다(F-02).

**개별 변이로 확인하지 않는 단언.** 단언 2·3·4·5·7 의 조준은 이 카드에서 변이로 확인하지 않는다. 그 사실을 `progress.md` §E.2 Gaps 에 적는다.

### AC-COVERAGE-005 — 범위 경계

**Given** M1 단계 0 이 `.moai/specs/SPEC-COVERAGE-001/.spec-base-sha` 에 기준 SHA 를 기록했다.
**When** 네 관측을 아래 블록 그대로 순차 실행한다. `<BASE_SHA>` 는 그 파일의 값으로 **문자 그대로 치환**한다.

```bash
# `<BASE_SHA>` 는 아래 파일의 값을 **문자 그대로 박아 넣는다** — 셸 변수로 잡지 않는다(사유는 아래).
cat .moai/specs/SPEC-COVERAGE-001/.spec-base-sha

# 관측 1 — 기준 SHA 가 실재하는 커밋인가
git rev-parse --verify "<BASE_SHA>^{commit}"; echo "EXIT=$?"

# 관측 2 — `channel/` 과 `server/src/` 가 무변경인가 (두 줄)
git diff --stat <BASE_SHA> -- channel server/src > /tmp/t13_untouched.txt
test -s /tmp/t13_untouched.txt; echo "NONEMPTY=$?"

# 관측 3 — 변경 파일 목록 (세 줄. 첫 줄의 `>` 가 이전 실행의 잔재를 지운다)
git diff --name-only <BASE_SHA> > /tmp/t13_scope.txt
git ls-files --others --exclude-standard >> /tmp/t13_scope.txt
grep -v '^\.moai/' /tmp/t13_scope.txt | sort -u

# 관측 4 — 산출물이 작업 트리로 새어 나오지 않았는가
git status --porcelain
```

**Then** 네 가지가 모두 성립한다.

1. 관측 1 이 종료 코드 `0` 이다. 기준 SHA 가 없으면 이 기준은 통과가 아니라 **실패**다.
2. 관측 2 의 `NONEMPTY` 가 `1` 이다 — `git diff --stat` 의 출력 파일이 **비어 있다**는 뜻이고, 곧 `channel/` 전체와 `server/src/` 전체가 무변경이다(운영자 결정 D2 + REQ-COVERAGE-007). `0` 이면 무언가 변경된 것이므로 **실패**다.
3. 관측 3 의 출력이 **정확히** 다음 네 줄이다(정렬된 순서 그대로).

   ```
   package-lock.json
   server/package.json
   server/test/coverage-contract.test.ts
   server/vitest.config.ts
   ```

   한 줄이라도 더 있거나 빠지면 **실패**다. 특히 루트 `package.json` 이 나타나면 실패다(운영자 결정 D2).
4. 관측 4 에 `server/coverage/` 가 나타나지 않는다 — `.gitignore` 의 `coverage/` 가 이미 덮으므로, 나타나면 무언가 잘못된 것이다.

**왜 명령을 쪼개 두었는가 (plan 감사 2회차 NEW-01, 함께 N-07 종결).** 초안은 관측 2 를 `test -z "$(git diff --stat "$SHA" …)"` 로, 관측 3 을 `{ …; …; } | grep | sort` 중괄호 그룹 파이프라인으로 적었다. 두 형태 **모두 워크트리 격리 세션의 가드가 실행 자체를 거부한다** — 2회차 감사가 이 워크트리에서 세 번 재현했고, git 을 전혀 쓰지 않는 `{ echo a; echo b; } | grep -v x | sort -u` 도 똑같이 거부되므로 원인은 git 이 아니라 **복합 형태 자체**다. 기준 SHA 를 `SHA=$(…)` 로 잡아 쓰는 형태도 같은 이유로 거부된다. 그래서 위 블록은 (a) 기준 SHA 를 문자 그대로 박고, (b) 명령 치환과 중괄호 그룹을 쓰지 않으며, (c) 중간 결과를 파일로 받는다. 2단 파이프(`grep … | sort -u`)는 허용되므로 그대로 쓴다.

**형태를 산문으로 설명하지 않고 실행 가능한 블록으로 못 박은 이유**는 아래 «제외 규칙» 문단과 같다 — run 단계가 거부당한 자리에서 즉석으로 형태를 지어내면, 이 기준이 막으려던 «매번 다르게 해석» 이 형태 층위에서 그대로 재발한다. 위 블록의 모든 줄은 이 개정이 이 워크트리에서 직접 실행해 **거부되지 않음과 기대 출력**을 확인한 것이다.

**중간 파일을 저장소 밖(`/tmp`)에 두는 이유.** 저장소 안에 두면 그 파일 자신이 관측 3 의 `git ls-files --others` 와 관측 4 의 `git status --porcelain` 에 나타나 관측이 스스로를 오염시킨다.

**이 분해가 N-07 을 닫는다.** 1회차 비차단 N-07(«`git diff --stat` 은 내용 유무와 무관하게 종료 0 이므로 `echo "EXIT=$?"` 가 아무것도 재지 않는다»)은 2회차에서 «의미는 교정됐으나 그 형태가 실행 거부된다» 로 **부분 종결**에 머물렀다. 관측 2 를 «출력을 파일로 받아 `test -s` 로 크기를 판정» 으로 바꾸면 의미와 형태가 함께 성립하므로 그 부분 종결이 닫힌다 — 지금 이 기준은 종료 코드가 아니라 **출력의 유무**를 잰다.

**관측 3 이 두 명령의 합집합인 이유 (plan 감사 F-04).** `git diff --name-only <BASE_SHA>` 는 **추적 중인 파일의 변경만** 나열한다. 이 카드가 만드는 파일 넷 중 둘(`server/vitest.config.ts`, `server/test/coverage-contract.test.ts`)은 **신규 미추적**이므로 그 명령에 보이지 않는다. plan 감사가 같은 상태를 만들어 실행했더니 목록은 `server/package.json` 한 줄뿐이었다 — 즉 초안 형태는 **올바른 구현을 거짓 실패**시킨다. `git ls-files --others --exclude-standard` 를 합집합으로 더해 미추적 신규 파일을 함께 잡는다. `--exclude-standard` 가 `.gitignore` 를 존중하므로 `server/coverage/` 는 이 목록에 애초에 나타나지 않는다.

**제외 규칙 — 이것 하나뿐이고, 다른 어떤 것도 제외하지 않는다.**

> 합집합의 각 줄 중 **경로 문자열이 `.moai/` 여섯 글자로 시작하는 줄을 버린다.** 그 외에는 아무것도 버리지 않는다.

`grep -v '^\.moai/'` 가 그 규칙 전부다. 근거: `.moai/` 아래에 있는 것(SPEC 문서, 감사 보고서, 트레이스 로그, 상태 파일)은 **절차 산출물**이고, 이 기준이 «정확히» 로 재는 대상은 **코드 산출물**이다. 절차 산출물은 카드가 도는 동안 계속 늘어나므로 집합에 넣으면 매 실행마다 목록이 달라져 기준이 무의미해진다. 반대로 제외를 `.moai/` 보다 넓게 잡으면(예: 미추적 전부) 이 기준이 재려는 신규 파일 둘이 함께 사라진다. 그래서 규칙을 경로 접두 한 줄로 못 박았다 — run 단계가 «어디까지 빼야 하나» 를 매번 다르게 해석할 여지를 남기지 않기 위해서다.

이 네 줄 집합은 `spec.md` §4.6 이 «코드 산출물» 로 적은 집합과 **같은 집합**이며, 두 자리는 같은 낱말을 쓴다.

**관측 시점.** `plan.md` §F 는 이 기준(단계 8)을 커밋(단계 9)보다 **먼저** 둔다. 즉 관측 시점에 새 파일 둘은 아직 미추적이며, 위 합집합은 그 상태를 전제로 쓰였다. 커밋 후에 재면 미추적 목록이 비고 대신 `git diff --name-only <BASE_SHA> HEAD` 가 넷을 전부 보이므로, 같은 제외 규칙 아래 같은 네 줄이 나온다 — 어느 시점에 재든 결과가 같다는 것이 이 형태의 장점이다.

관측 3 의 목록을 «정확히» 로 재는 이유는, 「작은 변경이었다」는 서술이 관측이 아니기 때문이다. 목록이 곧 관측이다.

### AC-COVERAGE-006 — RED→GREEN 전이

> **이 기준은 의도적으로 어떤 REQ 에도 매핑되지 않는다.** 재는 것이 «완성된 시스템이 무엇을 하는가» 가 아니라 «run 단계가 결함을 실제로 지나왔는가» 이기 때문이다 — 요구사항이 아니라 **절차의 관측**이다. 요구사항으로 올리면 «구현이 만족해야 할 상태» 가 아닌 것을 요구사항 집합에 섞게 되고, `plan.md` §F 의 실행 절차로만 내리면 그 절차를 건너뛰어도 아무 기준도 빨개지지 않는다(전이 2 가 잡으려는 것이 정확히 그 «건너뜀» 이다). 그래서 REQ 없는 기준으로 남기고, 그 사실을 여기와 `progress.md` §E.1 매핑표에 **명시**한다. 이것은 누락이 아니라 기록된 선택이다.

**Given** run 단계가 M1 을 수행한다.
**When** 아래 세 시점에서 명령을 실행하고 원문을 기록한다.

| 전이 | 시점 | 관측할 것 |
|------|------|-----------|
| 1 (RED) | `server/vitest.config.ts` 를 만들기 전 | `npm run coverage -w server` 가 **스크립트 부재**로 실패 (`npm error Missing script: "coverage"` — 이 워크트리의 npm 이 내는 실제 원문. `npm ERR!` 접두는 구버전 형식이다) |
| 2 (RED) | 스크립트와 설정을 만든 직후, 의존성 선언 전 | `npm ls @vitest/coverage-v8 -w server --depth=0` 이 종료 `1` — 즉 커버리지가 **돌더라도** AC-001 은 아직 실패 |
| 3 (GREEN) | 의존성 선언 후 | AC-COVERAGE-001·002·003·004 가 모두 통과 |

**Then** 세 전이의 원문 출력이 `progress.md` §E.2 에 순서대로 남는다.

**전이 2 를 따로 두는 이유가 이 기준의 핵심이다.** 커버리지 명령이 돌기 시작한 순간 «다 됐다» 고 느껴지는데, 그 시점의 성공은 여전히 `channel` 의 선언에 얹혀 있는 우연한 성공이다(`spec.md` §1.2). 전이 2 는 «돌지만 아직 결함이 남은» 중간 상태를 명시적으로 관측해, 그 상태를 완료로 착각하지 못하게 한다.

---

## 엣지 케이스

| 상황 | 기대 동작 | 덮는 기준 |
|------|-----------|-----------|
| `channel` 이 나중에 `@vitest/coverage-v8` 을 뺀다 | `server` 는 자기 선언으로 계속 해결된다 | AC-COVERAGE-001 (선언 자체를 관측) — 다만 **그 시나리오를 실제로 재현해 보지는 않는다**(§ Gaps) |
| 커버리지가 85 아래로 떨어진다 | `npm run coverage -w server` 가 0 이 아닌 종료 코드 | AC-COVERAGE-003 프로브 A' (설정의 임계를 올려 같은 조건을 만든다) |
| `index.ts` 진입점 블록이 계속 미커버다 | 전역 임계는 유지된다. 제외하지 않는다 | AC-COVERAGE-002 (`HAS_INDEX=true`) |
| 누군가 임계를 `perFile` 로 바꾼다 | 정상 트리에서 게이트가 깨진다(`index.ts` 83.33%) | AC-COVERAGE-004 단언 5 (`thresholds.perFile` 값 검사) |
| `npm test -w server` 만 돌린다 | 커버리지가 꺼져 있어 임계를 강제하지 않는다 (설계대로) | 미검증 — `spec.md` §4.2 가 계약으로 밝혔다 |
| CI 가 이 명령을 부른다 | 배선이 아직 없다 | 범위 밖 (`spec.md` §5) |

## 품질 게이트

| 항목 | 기준 |
|------|------|
| 타입 검사 | `npm run typecheck -w server` 종료 코드 `0` |
| 테스트 | `npm test -w server` 전체 통과. 착지 **전** 10 파일 / 104 테스트, 회귀 짝이 더해진 **뒤** 11 파일 / 105 테스트 |
| 커버리지 | `npm run coverage -w server` 종료 코드 `0`, 총 라인 ≥ 85 |
| 형제 워크스페이스 무회귀 | `npm test -w channel` 종료 코드 `0` — 루트 `npm install` 이 잠금 파일을 건드리므로 형제도 한 번 확인한다 |
| 범위 경계 | AC-COVERAGE-005 의 네 관측 모두 통과 |
| 커밋 | `chore:` / `test:` 관례, 마일스톤마다 한 번 |

## Definition of Done

- AC-COVERAGE-001 부터 AC-COVERAGE-006 까지 **전부** 통과했고, 각 명령의 원문 출력이 `progress.md` §E.2 에 남았다.
- 요구사항 REQ-COVERAGE-001..007 각각이 최소 하나의 AC 에 매핑돼 있고, 그 매핑이 `progress.md` §E.1 에 표로 남았다.
- AC-COVERAGE-003 의 프로브 A'·B'(설정 파일 경로)가 **실행**됐고, 프로브 A' 가 임계 미달 메시지를 동반해 실패했으며, 되돌림이 해시 대조로 증명됐다. 단계 7 뒤의 **재프로브**도 실행됐고, 그 출력으로 관측 2(실패한 테스트 없음)와 «제외해도 `Lines :` 가 기준선과 같다» 를 판정했다. CLI 오버라이드 보조 관측만으로 이 항목을 채우지 않았다.
- AC-COVERAGE-004 의 변이 **셋**이 각각 실행됐고, 매번 실패한 테스트가 계약 테스트 하나뿐이었으며, 되돌림이 해시 대조로 증명됐다.
- 미검증 항목(엣지 케이스 표의 "미검증" 줄, AC-COVERAGE-004 의 개별 변이 없는 단언 포함)이 §E.2 Gaps 절에 명시적으로 기록됐다.
