---
id: SPEC-COVERAGE-001
title: "minidiscord server 커버리지 도구 — 측정 도구를 server 가 직접 선언하고, 85% 임계를 기계가 강제한다"
version: "0.2.2"
status: completed
created: 2026-08-29
updated: 2026-08-29
author: manager-spec
priority: P1
phase: "v0.1.0 target"
module: "server/"
lifecycle: spec-anchored
tags: "coverage, vitest, v8-provider, threshold-enforcement, undeclared-dependency, npm-workspaces, hoisting"
tier: S
---

# SPEC-COVERAGE-001 — server 커버리지 도구 도입

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.2.2 | 2026-08-29 | plan 2회차 개정. `t21` sync 감사(`.moai/reports/t21/sync-audit.md`, PASS 80.1)가 잡은 비차단 5건을 닫았다. **F-01(High)** — §5 «Out of Scope — CI 배선» 이 `label-sync.yml` 의 트리거를 «`workflow_dispatch` + `main` push» 로만 적어 `paths:` 경로 필터를 빠뜨린 채 «이미 있는 배선에 한 줄 얹기만 하면 된다» 고 **처방**했다. 그 처방은 훅 방향에만 참이고 `label-sync.yml` 방향에서는 거짓이다 — 라벨 파일이 바뀔 때만 도는 워크플로라 `server/` 코드 변경으로는 발화하지 않으므로, 거기에 커버리지를 얹으면 이 SPEC 이 스스로 경고한 «소리 없이 대기하는 게이트» 를 새로 만든다. 트리거 서술에 경로 필터를 명시하고 처방 절을 훅·새 잡 방향으로 좁혔다. **F-03** — 배선 열거에 설치된 훅 `.git_hooks/pre-push` 를 더했다(열거가 전수인 것처럼 읽히는데 실제 훅은 둘이었다). **F-04** — `acceptance.md` 엣지 케이스 표에서 «기대 동작» 칸에 현재 사실이 들어가 «상황» 칸을 정면으로 부정하던 행을, 상황 «CI 에 이 명령을 태우려 한다» / 기대 동작 «새 잡·새 훅 단계를 더해야 한다» 로 고쳐 열 의미를 복원했다(«덮는 기준» 칸 무변경). **F-05·F-06** — `0.2.1` 행의 «정정 1건 ↔ 두 자리» 자기모순과 `0.2.0` 행 상호 참조 누락을 그 행에서 정정했다. `0.2.0` 행 자체는 그때 참인 자기 기록이므로 소급 수정하지 않았다. 정정 근거는 이 트리에서 직접 관측했다: `sed -n '22,32p' .github/workflows/label-sync.yml` 로 `paths:` 필터 2행 확인, `ls -la "$(git rev-parse --git-common-dir)/hooks"` 로 `pre-commit`(3245)·`pre-push`(2923) 둘 다 실행권한 설치 확인, `grep -rn "coverage" .github .git_hooks` **적중 0건**. 핵심 명제(«배선은 있으나 어느 것도 커버리지를 부르지 않는다»)는 재측정으로 참이므로 **그대로 뒀다** — 고친 것은 트리거 서술과 처방 절뿐이다. **요구사항·수용 기준·설계 결정·범위 경계는 하나도 바꾸지 않았다.** 상태 `completed` 유지. | manager-spec |
| 0.2.1 | 2026-08-29 | 문언 정정 1건(적용 자리 2곳 — `spec.md` §5, `acceptance.md` 엣지 케이스 표). `t13` sync 감사의 **F-03**(`.moai/reports/t13/sync-audit.md`)이 반증한 «CI 배선이 없다» 서술을, `t13` 이 `CHANGELOG.md` 에서만 좁히고 SPEC 본문(manager-spec 소유)에는 남겨 둔 채 카드 `t21` 로 이월한 건이다. 이 카드가 그 자리를 고쳤다 — §5 «Out of Scope — CI 배선» 의 배제 근거, 그리고 **감사·이월 기록이 지목하지 않았으나 같은 거짓 명제를 담고 있던** `acceptance.md` 엣지 케이스 표의 «배선이 아직 없다» 까지 **두 자리**를 함께 고쳤다(한 자리만 고치면 남은 자리가 «정정 완료» 기록을 곧바로 거짓으로 만든다 — `t13` F-05 와 같은 부류). 정정 근거는 이 카드가 이 트리에서 직접 관측했다: `find .github -type f` 로 `.github/workflows/label-sync.yml` 실재 확인, `.git_hooks/pre-commit:65` 의 `if ! moai gate; then` 확인, `grep -rn coverage .github .git_hooks` **적중 0건**. **설계 결정·요구사항·수용 기준은 하나도 바꾸지 않았다** — 배제 항목의 사유 문언과 엣지 케이스 표의 기대 동작 서술뿐이며, 무엇이 범위 밖인지는 그대로다. (아래 `0.2.0` 행이 같은 **F-03** 을 «닫았다» 고 적은 것은 `CHANGELOG.md` 한 자리에 한정된 서술이었다 — SPEC 본문의 같은 명제는 그때 열려 있었고 이 행이 닫는다.) | manager-spec |
| 0.2.0 | 2026-08-29 | sync 단계 종결. 문서 동기화 — `CHANGELOG.md` `[Unreleased]` 에 «추가됨 — server 커버리지 도구 (카드 `t13`)» 절 신설(선언되지 않은 의존성이 왜 더 무거운 결함인지, `npm test` 가 임계를 강제하지 **않는다**는 설계, 진입점 미제외와 F-10 선례, 닫히지 않은 것 다섯 항목), `README.md` 명령어 표에 `npm run coverage -w server` 한 행 추가. `progress.md` §E.4 착지 — 재실행 검증 표(typecheck 0 · coverage 0 / 11파일 105테스트 / Lines 97.01% 325/335 · channel 0 / 5파일 70테스트 · `npm ls --depth=0` 0 로 직접 자식 확인 · 해시 전후 동일) + Gaps 5건 + Residual-risk 3건, 귀속 기준선 HEAD `4222a55`, `sync_commit_sha` 는 D3 관례대로 `pending-backfill-sync`. **검증은 run 단계 숫자를 옮긴 것이 아니라 이 트리에서 재실행해 같은 값을 관측했다.** **sync 감사(`--deep`) PASS 85.2 · 차단 0건**(`.moai/reports/t13/sync-audit.md`); 비차단 3건(F-03 CI 부재 서술·F-04 단언 개수·F-05 등장 횟수)은 문서 정정으로 닫았다. **비차단이던 F-01 은 운영자 확정(2026-08-29)으로 이 카드에서 코드까지 닫았다** — 계약 테스트 단언 2 를 포함 검사에서 완전 일치(`toBe('vitest run --coverage')`)로 좁혀 `coverage` 스크립트 뒤에 `--coverage.exclude=…`·`--coverage.thresholds.lines=0` 을 덧붙이는 우회를 막았고, 우회 프로브 2종으로 실효를 확인했다(각각 `npm test -w server` 종료 1, 두 번 모두 실패는 계약 테스트 하나뿐 `1 failed | 104 passed`, 되돌림 해시 일치). 강화 후 최종 게이트 typecheck 0 · coverage 0 (11파일/105테스트, Lines 97.01%) · channel 0. 코드 산출물 집합은 4 파일 그대로다(강화 대상이 이미 그 집합 안이다). 상태 `in-progress → completed`. **§1~§8 본문은 한 줄도 바꾸지 않았다** — frontmatter 와 이 HISTORY 행뿐이다. | manager-docs |
| 0.1.2 | 2026-08-29 | plan 감사 2회차(`.moai/reports/t13/plan-audit-2.md`, PASS 0.88) 반영 개정. 차단 2건 — AC-COVERAGE-005 의 관측 2·3 을 워크트리 격리 가드가 거부하지 않는 형태(기준 SHA 를 문자 그대로 박고, 중간 결과를 `/tmp` 파일로 받고, 2단 파이프만 쓴다)로 교체했고 이 개정이 그 블록을 **직접 실행해** 거부되지 않음을 확인했다(NEW-01 — 1회차 N-07 의 부분 종결도 함께 닫힌다). «제외의 무해함» 과 «실패한 테스트 없음» 확인을 단계 7 뒤 **재프로브**에서 하도록 명시해, 계약 테스트가 없는 시점에 자명하게 참이던 관측을 없앴다(NEW-02). 비차단 1건 — 형제 선례를 «그대로 따른다» 에서 «방식을 따르되 주석 내용 요건은 §4.4 가 좁힌다» 로 정정했다(NEW-03). 더해서 `plan.md` §E 의 계약 테스트 위험 행에, **테스트가 실패하면 vitest 가 임계 판정을 아예 하지 않는다**는 2회차 실측(E13)을 근거로 적어 `--exclude` 가 필수 장치임을 남겼다. **설계 결정과 관측 설계는 하나도 바꾸지 않았다.** | manager-spec |
| 0.1.1 | 2026-08-29 | plan 감사 1회차(`.moai/reports/t13/plan-audit.md`, FAIL 0.62) 반영 개정. 차단 7건 — 임계 프로브를 CLI 오버라이드에서 **설정 파일 임시 변경**으로 맞바꿈(F-01), REQ-002 에 리포터 조항 추가(F-02), 회귀 짝 테스트 코드에 `vitest` 임포트 추가(F-03), 범위 경계 관측을 «추적 ∪ 미추적» 합집합 + `.moai/` 제외 규칙으로 교체(F-04), 회귀 짝 파일 추가에 대한 미결 질문을 **승인 기록** 한 줄로 통일하고 조건부 분기 17군데 제거(F-05), REQ-005 주석 조항에 관측 기준 신설(F-06), REQ-001 메이저 대역 조항에 단언과 변이 신설(F-07). 비차단 8건(N-01..N-08)도 함께 정리. **설계 결정 셋(전역 라인 85·진입점 미제외·회귀 짝)은 감사가 실행으로 옳음을 확인했으므로 바꾸지 않았다.** | manager-spec |
| 0.1.0 | 2026-08-29 | 최초 작성. 칸반 카드 `t13` 에서 도출. 근거는 `.moai/reports/t7/sync-audit.md` §T5 (t7 워크트리 `WT-perm-request-id` 안에 있다) 와 운영자 승인(2026-08-28). 요구사항 7개·수용 기준 6개로 Tier S 규모다. 이 카드가 닫는 것은 «측정 명령이 없다» 하나가 아니라 **둘**이다 — 임계 강제(운영자 결정 D1)와 **선언되지 않은 의존성**(§1.2). 후자는 이 워크트리에서 실측으로 확인했다. | manager-spec |

---

## 1. 배경과 목적

### 1.1 Craft 85% 가 네 라운드 연속 UNVERIFIED 였다

이 저장소의 sync 단계 감사는 네 가지 차원(Functionality·Security·Craft·Consistency)을 점수화하는데, 그중 Craft 차원의 85% 커버리지 임계가 **네 라운드 연속 UNVERIFIED** 로 남았다. 감사자가 게을렀던 것이 아니라 **잴 도구가 없었다** — `server` 워크스페이스에 커버리지 명령이 없으므로 감사자가 실행할 수 있는 명령이 하나도 없었고, 관측하지 못한 것을 통과로 적을 수는 없다(`verification-claim-integrity.md`). 원인 규명과 도입 승인은 운영자가 2026-08-28 에 내렸다.

근거 문서: `.moai/reports/t7/sync-audit.md` §T5. 그 보고서는 카드 `t7` 의 워크트리(`WT-perm-request-id`)에 있으며, **이 SPEC 의 작성자는 그 파일을 직접 읽지 않았다** — 카드 본문이 인용한 사실(네 라운드 UNVERIFIED, 원인은 도구 부재)만 근거로 삼는다.

### 1.2 더 중요한 결함 — 선언되지 않은 의존성

측정이 오늘 성공하는 것은 `server` 가 커버리지 도구를 가지고 있어서가 아니다. 형제 워크스페이스 `channel` 이 자기 `devDependencies` 에 `@vitest/coverage-v8` 을 선언했고, npm 워크스페이스가 그것을 저장소 루트의 `node_modules/` 로 끌어올려(hoisting) `server` 가 **우연히** 해결하고 있을 뿐이다. 이 워크트리에서 실측한 값이 그것을 그대로 보여 준다.

```
$ npm ls @vitest/coverage-v8 -w server --depth=0
minidiscord@ .../t13
└── (empty)
EXIT=1                     ← server 자신은 선언한 적이 없다

$ npm ls @vitest/coverage-v8 -w channel --depth=0
└─┬ @minidiscord/channel@0.1.0 -> ./channel
  └── @vitest/coverage-v8@4.1.11
EXIT=0                     ← 선언한 쪽은 channel 이다
```

이 상태의 위험은 **조용하다는 것**이다. `channel` 이 커버리지 도구를 빼거나 버전을 올리면 `server` 의 커버리지는 아무 경고 없이 깨지고, 그 실패는 «server 를 고친 사람» 이 아니라 «channel 을 고친 사람» 의 변경에서 나온다. 그러면 이 카드가 닫으려는 것 — Craft 임계를 실측할 수 있는 상태 — 이 다시 UNVERIFIED 로 되돌아간다.

그래서 이 SPEC 은 «커버리지 스크립트 하나를 더한다» 가 아니다. **`server` 가 자기 측정 도구를 자기 이름으로 선언하게 만들고, 그 선언이 실제로 섰는지를 우연한 해결과 구분해 관측한다.**

### 1.3 이 SPEC 이 끝나면

`npm run coverage -w server` 한 줄로 커버리지를 재고, 라인 커버리지가 85% 아래로 떨어지면 그 명령이 **0 이 아닌 종료 코드**를 낸다. 감사자는 그 명령의 종료 코드와 원문 출력을 증거로 Craft 임계를 판정할 수 있다.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 커버리지 제공자 / provider | 코드 실행을 계측하는 엔진. 이 저장소는 V8 내장 계측(`v8`)을 쓴다 — 형제 `channel` 이 이미 그렇다 |
| 끌어올리기 / hoisting | npm 워크스페이스가 여러 워크스페이스의 공통 패키지를 저장소 루트 `node_modules/` 에 한 벌만 두는 것. 선언하지 않은 워크스페이스도 그 자리에서 해결에 성공한다 |
| 선언되지 않은 의존성 | 코드가 실제로 쓰는데 그 패키지의 `package.json` 에는 적혀 있지 않은 의존성. 해결은 되지만 계약은 없다 |
| 임계 강제 | 커버리지가 정해진 값 아래면 명령이 실패(0 이 아닌 종료 코드)하는 것. 숫자를 **출력만** 하는 것은 강제가 아니다 |
| 전역 임계 / global threshold | 프로젝트 전체 합계에 거는 임계. 파일마다 거는 `perFile` 과 구분된다 (§4.3 이 왜 전역인지 정한다) |
| 진입점 블록 | `server/src/index.ts` 끝의 `if (process.argv[1]?.includes('index.ts'))` 아래 구간(65-74행, 미커버로 잡히는 구간은 66-68·71-72). 프로세스로 직접 구동될 때만 실행된다. 형제 `channel/vitest.config.ts` 가 블록 범위와 미커버 구간을 나누어 적은 형식을 그대로 따른다 |
| Craft 임계 | sync 단계 감사의 Craft 차원이 요구하는 85% 커버리지. 이 SPEC 이 도구 쪽 숫자를 그 값과 **같게** 맞춘다 |

## 3. 현재 상태 (이 워크트리 실측)

아래는 이 워크트리에서 오케스트레이터가 **실제로 실행해 관측한** 값이다. 추정이 아니다. run 단계는 이 값을 기준선으로 삼는다.

```
$ npx vitest run --root server --coverage.enabled --coverage.provider=v8 --coverage.include='src/**'
EXIT=0    Test Files 10 passed    Tests 104 passed
```

| 차원 | 값 |
|------|-----|
| Statements | 96.5% (387/401) |
| Branches | 89.24% (166/186) |
| Functions | 97.43% (76/78) |
| **Lines** | **97.01% (325/335)** |

파일별 라인 커버리지:

| 파일 | lines% |
|------|--------|
| `auth.ts` · `config.ts` · `db.ts` · `mention.ts` · `permissions.ts` · `routes-bots.ts` · `routes-rooms.ts` · `sse.ts` | 100 |
| `gateway.ts` | 98.83 |
| `routes-messages.ts` | 94.02 |
| **`index.ts`** | **83.33** |

두 가지를 함께 적어 둔다. **텍스트 리포터는 100% 파일의 행을 숨긴다** — 위 파일별 목록은 `json-summary` 리포터에서 나왔다. 그리고 **`node_modules` 는 이 워크트리 루트에서 `npm install` 로 설치돼 있다**(233개 패키지, 종료 0). `server` 가 새 devDependency 를 선언하면 `package-lock.json` 이 바뀌며, **그 변경은 run 단계가 소유한다**.

---

## 4. 요구사항 (GEARS)

### 4.1 의존성 선언

**REQ-COVERAGE-001** (Ubiquitous)
`server/package.json` 의 `devDependencies` 는 `@vitest/coverage-v8` 을 자기 이름으로 선언해야 하고, 그 버전 범위는 같은 파일이 선언한 `vitest` 의 범위와 같은 메이저 대역이어야 한다(오늘의 값으로는 `^4.1.11`). 선언 없이 루트 `node_modules` 의 끌어올려진 사본으로 해결되는 상태는 이 조항을 만족하지 않는다.

버전을 `vitest` 와 묶는 이유는 두 패키지가 같은 릴리스에서 함께 나오고 메이저가 어긋나면 제공자 적재가 실패하기 때문이다.

### 4.2 측정 설정과 명령

**REQ-COVERAGE-002** (Ubiquitous)
`server/vitest.config.ts` 는 커버리지 제공자를 `v8` 로, 측정 대상을 `include: ['src/**']` 로, **리포터를 `reporter: ['text', 'json-summary']` 로** 정해야 한다. **제외(`exclude`) 항목을 두어서는 안 된다** — 진입점 처리는 §4.4 가 정한다.

형제 `channel/vitest.config.ts` 와 같은 형태다. 새 형식을 만들지 않는다.

**리포터를 계약에 넣는 이유.** 파일별 관측(AC-COVERAGE-002)은 `server/coverage/coverage-summary.json` 을 읽는데, vitest 의 기본 리포터는 그 파일을 만들지 않는다 — 만드는 것은 `coverage-final.json` 이다. 리포터를 요구하지 않으면 **다른 모든 요구사항을 완전히 만족한 구현에서도 수용 기준이 `Cannot find module` 로 실패한다.** `text` 는 사람이 읽는 요약이고 `json-summary` 는 기계가 읽는 파일별 값이다.

리포터를 `coverage` 스크립트의 플래그로 넣는 형태는 **채택하지 않는다.** 설정 파일에 두어야 회귀 짝(REQ-COVERAGE-006)이 그것을 값으로 읽어 단언할 수 있고, 플래그로 두면 리포터만 계약 밖에 남는다.

**REQ-COVERAGE-003** (Ubiquitous)
`server/package.json` 의 `scripts` 는 `coverage` 를 가져야 하며, 그 명령은 커버리지를 켠 채 테스트 전체를 실행해야 한다. 감사자가 실행하는 명령은 `npm run coverage -w server` 하나다.

`npm test -w server` 는 커버리지를 켜지 않으므로 임계를 강제하지 않는다. 두 명령의 역할이 다르다는 것이 계약이며, 이 SPEC 은 `test` 스크립트를 바꾸지 않는다.

### 4.3 임계 강제

**REQ-COVERAGE-004** (When — 임계 미달 검출)
커버리지 측정에서 **라인 커버리지가 85% 미만인 것이 검출되면**, `npm run coverage -w server` 는 0 이 아닌 종료 코드로 끝나야 한다. 숫자를 출력하기만 하고 종료 코드 0 으로 끝나는 형태는 이 조항을 만족하지 않는다.

임계는 **전역(global)** 이며 `perFile` 이 아니다. 값 85 는 sync 단계 감사의 Craft 임계와 **의도적으로 같은 숫자**다 — 도구가 감사 기준을 그대로 강제하게 만들어, 사람이 두 숫자를 따로 기억하지 않게 한다(운영자 결정 D1).

전역인 이유는 §4.4 가 정하는 진입점 처리와 직결된다. `index.ts` 의 라인 커버리지는 오늘 83.33% 이므로, `perFile` 로 걸면 **정상 트리에서 게이트가 실패한다** — 정상 구현을 거짓 실패시키는 기준은 이 저장소가 이미 여러 번 대가를 치른 부류다. 전역 합계는 오늘 97.01% 로 임계 위에 여유 있게 선다.

라인 외의 세 차원(statements·branches·functions)에는 임계를 걸지 않는다. Craft 기준이 말하는 것이 라인 커버리지 하나이고, 근거 없는 숫자를 더 세우면 그 숫자가 무엇을 지키는지 아무도 설명할 수 없게 된다.

### 4.4 진입점 처리

**REQ-COVERAGE-005** (Ubiquitous)
`server/src/index.ts` 의 진입점 블록(65-74행, 미커버로 잡히는 구간은 66-68·71-72)은 **제외하지 않고, 미커버로 계상된 채 그대로 둔다.** `server/vitest.config.ts` 는 그 사실과 사유를 한국어 주석으로 **파일 상단 다섯 줄 안에** 적어야 하며, 그 주석은 `index.ts` 와 `process.argv` 를 함께 언급해야 한다.

**주석 조항을 계약으로 남긴 이유(F-06 판단).** 감사는 두 갈래를 제시했다 — (가) 주석 조항을 요구사항에서 빼 `plan.md` 의 구현 지침으로 내리거나, (나) 요구사항으로 남기고 그것을 재는 수용 기준을 더하거나. **(나)를 택했다.** 이 주석은 «왜 제외하지 않았는가» 를 담은 유일한 자리이고, 이 저장소가 이미 대가를 치른 부류(F-10 — 제외의 사유가 반증되었는데 숫자만 계속 좋아 보였다)의 반대편 방어물이다. 관례로 내리면 나중에 누가 지워도 아무것도 빨개지지 않는다. 관측 방법과 그 예외 사유는 `acceptance.md` AC-COVERAGE-004 단언 7 에 있다.

**라인 기준과 구문 기준의 차이.** 라인 커버리지 기준으로 `index.ts` 의 미커버 5행(66·67·68·71·72, 25/30)은 **전부 이 블록 안**이다. 다만 구문(statement) 기준으로는 미커버 구문이 6개이고 그중 하나는 **55행**(`setPermissionHandler` 콜백 본문)으로 블록 **밖**이다. 「`index.ts` 의 부족분은 진입점뿐」이라는 서술은 **라인 기준에서만 정확하다.** 이 SPEC 이 임계를 거는 차원은 라인이므로 계약에는 영향이 없고, 이 문단은 그 서술이 구문 수준으로 확대 해석되는 것을 막는다.

**이 선택의 근거.** 그 블록은 `process.argv[1]` 가드 안에 있어 프로세스로 직접 구동될 때만 실행되고, 테스트는 서버를 인프로세스로 세우므로(`server/test/no-listen.ts`) V8 계측에 잡히지 않는다. 형제 `channel/vitest.config.ts` 가 자기 `src/index.ts` 의 같은 상황을 **제외 없이 주석으로** 처리한 선례가 이미 있고, 이 SPEC 은 그 선례의 **방식**(제외를 두지 않고 사유를 주석으로 남긴다)을 따른다. 다만 **주석의 내용 요건은 위 §4.4 의 규범 문장이 그 선례보다 좁힌다** — 형제의 주석 세 줄에는 `index.ts` 는 있으나 `process.argv` 가 **없으므로**(plan 감사 2회차 실측), 그 파일을 글자 그대로 베낀 구현은 AC-COVERAGE-004 단언 7 에서 실패한다. 베낄 것은 문구가 아니라 방식이다.

제외를 쓰지 않는 이유가 하나 더 있다. 카드 `t4` 의 sync 감사가 지적한 F-10 은 **커버리지 제외의 명시 사유가 반증되었는데 헤드라인 숫자는 그 제외 덕에 과대표기된 상태**였다(`.moai/specs/SPEC-CHANWIRE-001/progress.md` §E.4). 제외는 한번 들어가면 그 사유가 낡아도 숫자만 계속 좋아 보인다. 오늘 전역 97.01% 로 임계 85 를 여유 있게 넘으므로 **숫자를 부풀리려고 제외를 만들 이유가 없다** — 여유가 없었더라도 답은 제외가 아니라 테스트였을 것이다.

### 4.5 회귀 짝

**REQ-COVERAGE-006** (Ubiquitous)
`npm test -w server` 가 실행하는 테스트 중 하나는 위 계약 — 의존성 선언과 메이저 대역(REQ-001)·제공자와 측정 대상과 리포터(REQ-002)·`coverage` 스크립트(REQ-003)·임계값 85 와 전역 여부(REQ-004)·제외 부재와 사유 주석(REQ-005) — 을 읽어 단언해야 한다.

**이 조항이 있는 이유.** 위 다섯 조항은 전부 설정 파일의 내용이고, 셸 명령으로만 재는 기준은 **그 설정이 지워져도 테스트 스위트가 초록으로 남는다.** 이 저장소는 그 부류로 이미 대가를 치렀다(`criteria-outside-the-regression-suite`). 누군가 임계를 지우거나 의존성 선언을 빼면 `npm test -w server` 가 즉시 빨개져야 한다.

> **판정 기록 — 승인됨(리드 판정, 2026-08-29).** 이 조항은 `server/test/` 에 **새 파일 한 개**를 더한다. 카드가 건 금지(`server/test/**` 의 동작을 바꾸지 말 것)는 **기존 파일의 동작**에 걸리며 새 파일 추가는 거기에 걸리지 않는다 — 이 독해를 리드 세션이 승인으로 확정했다. 조건부 조항은 남기지 않는다. 대안 비교는 `plan.md` §D 1 에 있다.

### 4.6 범위 경계

**REQ-COVERAGE-007** (Unwanted — shall not)
이 SPEC 의 구현은 다음을 해서는 안 된다.

- 저장소 루트 `package.json` 에 커버리지 합산 스크립트를 만드는 것 (운영자 결정 D2)
- `channel/vitest.config.ts` 또는 `channel/package.json` 을 고치는 것 (운영자 결정 D2)
- `server/src/**` 의 어떤 파일이든 고치는 것
- `server/test/**` 의 **기존** 파일이 하는 일을 바꾸는 것 (REQ-COVERAGE-006 이 더하는 새 파일 하나는 예외이며, 그 예외는 리드 판정으로 승인됐다 — §4.5)
- 커버리지를 올리려고 테스트를 더하거나 소스를 고치는 것 — 이 카드는 **재는 도구**를 들이는 것이지 숫자를 올리는 것이 아니다

**코드 산출물**로 손대는 파일은 정확히 넷이다 — `server/package.json`, `server/vitest.config.ts`(신규), `server/test/coverage-contract.test.ts`(신규), 그리고 의존성 선언의 귀결로 함께 바뀌는 `package-lock.json`. 이 넷이 AC-COVERAGE-005 관측 3 이 «정확히» 일치를 요구하는 집합과 **같은 집합**이며, 두 자리는 같은 낱말(코드 산출물)을 쓴다.

`.moai/` 아래의 SPEC 문서·감사 보고서·트레이스 로그는 **절차 산출물**이지 코드 산출물이 아니므로 이 집합에 넣지 않는다. AC-COVERAGE-005 가 그 경로를 명시 제외 규칙으로 걸러 낸다.

---

## 5. 범위 밖 (Exclusions)

아래 항목은 이 SPEC 에서 **만들지 않는다**. 각 항목에 소유자 또는 배제 근거를 명시한다.

### Out of Scope — 저장소 전체 합산 커버리지

- 루트 `package.json` 의 워크스페이스 합산 `coverage` 스크립트, 두 워크스페이스 리포트를 하나로 합치는 도구
- 배제 근거: 운영자 결정 D2. 합산 숫자는 어느 워크스페이스가 임계를 깼는지 가리므로 진단성이 오히려 낮고, 지금 필요한 것은 `server` 하나의 실측값이다

### Out of Scope — `channel` 워크스페이스

- `channel/vitest.config.ts`·`channel/package.json` 의 어떤 변경도 하지 않는다. 그 파일들은 `SPEC-CHANNEL-001`·`SPEC-CHANWIRE-001` 계열이 소유한다
- `channel` 이 이미 자기 커버리지 도구를 선언하고 있다는 사실은 이 SPEC 의 **관측 대상**일 뿐이다 (§1.2 의 대조군)

### Out of Scope — 커버리지 수치 개선

- 미커버 구간(`routes-messages.ts` 94.02%, `gateway.ts` 98.83%, `index.ts` 83.33%)에 테스트를 더하는 일
- 배제 근거: 이 카드는 도구 도입이다. 숫자를 올리는 일은 그 도구가 선 뒤에 별도 카드가 근거를 갖고 한다

### Out of Scope — 라인 외 차원의 임계

- statements·branches·functions 에 임계를 거는 일 (§4.3 이 사유를 적었다)
- branches 는 오늘 89.24% 로 85 위에 있으나, 임계를 거는 것과 값이 좋은 것은 다른 문제다

### Out of Scope — CI 배선

- GitHub Actions 등에서 `npm run coverage -w server` 를 자동 실행하게 하는 일, 커버리지 리포트를 외부 서비스에 올리는 일
- 배제 근거: 자동 실행 배선 **자체는 이 저장소에 있다** — GitHub Actions 워크플로 `.github/workflows/label-sync.yml`(`workflow_dispatch` + `main` push 트리거. 단 push 에는 `.github/labels.yml`·`.github/workflows/label-sync.yml` 두 파일에 걸린 `paths:` 경로 필터가 있어 **그 둘이 바뀔 때만 발화한다**)과 설치된 git 훅 `.git_hooks/pre-commit`(`moai gate` 호출)·`.git_hooks/pre-push`. **다만 그중 어느 것도 커버리지 명령을 부르지 않는다.** 즉 없는 것은 배선이 아니라 «커버리지를 부르는 CI» 다. 배선 자체는 이미 서 있으므로 이 카드의 선행 조건이 아니다 — 후속 카드가 할 일은 `.git_hooks/pre-push` 에 명령을 한 줄 얹거나(커밋마다가 아니라 푸시마다 돌아 커버리지를 얹기에 적합하다) `.github/workflows/` 에 잡을 새로 더하는 것이다. **`label-sync.yml` 은 재사용 대상이 아니다** — 경로 필터 때문에 `server/` 코드가 아무리 바뀌어도 발화하지 않으므로, 거기에 커버리지 잡을 얹으면 이 SPEC 이 스스로 경고한 «소리 없이 대기하는 게이트» 를 새로 만든다

### Out of Scope — 감사 절차 자체

- sync 단계 감사가 Craft 점수를 매기는 방식, 85 라는 숫자를 정한 근거
- 이 SPEC 은 그 숫자를 **받아 적어 기계에 심을 뿐** 정하지 않는다

---

## 6. 제약

- Node.js 20 이상, TypeScript strict, `type: module`. `server/vitest.config.ts` 는 형제 `channel/vitest.config.ts` 와 같은 형태(`defineConfig` + `test.coverage`)로 쓴다.
- 새 의존성은 `@vitest/coverage-v8` 하나뿐이다. 그 밖의 패키지를 더하지 않는다.
- `coverage/` 는 저장소 `.gitignore` 에 이미 있다 — `server/coverage/` 산출물은 커밋되지 않으며, 이 SPEC 은 `.gitignore` 를 고치지 않는다.
- 문서·주석은 한국어, 커밋 메시지는 영어 관례(`chore:`, `test:`).
- 커버리지 임계값 `85` 는 sync 감사 Craft 임계와 같은 숫자다. 이 SPEC 에서 완화도 강화도 하지 않는다.
- `package-lock.json` 의 변경은 run 단계가 소유한다. 이 워크트리에는 이미 `npm install` 이 끝나 있다(233 패키지, 종료 0).

---

## 7. 수용 기준

수용 기준 전체는 `acceptance.md` 에 있다. 각 기준은 실행할 명령과 관측할 결과로 이루어지며, 판정은 이분법이다.

## 8. 참조

- `.moai/reports/t7/sync-audit.md` §T5 — Craft 임계 UNVERIFIED 의 원인 규명 (카드 `t7` 워크트리 `WT-perm-request-id`. 이 SPEC 은 직접 읽지 않았다)
- `channel/vitest.config.ts` — 제공자·측정 대상·진입점 주석의 선례
- `.moai/specs/SPEC-CHANWIRE-001/progress.md` §E.4 — 커버리지 제외의 사유가 반증된 사례(F-10)
- 칸반 카드 `t13`
