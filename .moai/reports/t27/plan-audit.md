# SPEC 계획 감사 보고서: SPEC-CI-001 (카드 t27)

- 회차: 1/3
- 대상 트리: `.claude/worktrees/t27`, 브랜치 `WT-ci-test-wiring`, HEAD `f0124e6` (감사 시작 시 `git rev-parse --short HEAD` 로 확인)
- 대상 문서: `.moai/specs/SPEC-CI-001/{spec.md,plan.md,acceptance.md,progress.md}`
- **판정: FAIL**
- **종합 점수: 0.761** (차원 조화평균)

> 저작자의 추론 맥락은 M1 컨텍스트 격리에 따라 무시했다. 디스패치가 전한 「실측값」은 증거가 아니라 **검증 대상 주장**으로 다뤘다.

---

## 0. 통과선 — 내가 직접 읽은 자리

| 항목 | 값 | 읽은 자리 |
|---|---|---|
| Tier S 통과선 | **0.75** | `.claude/rules/moai/workflow/spec-workflow.md:140` |
| Tier M 통과선 | **0.80** | `.claude/rules/moai/workflow/spec-workflow.md:141` |
| Tier L 통과선 | **0.85** | `.claude/rules/moai/workflow/spec-workflow.md:142` |
| 재확인 | 같은 값이 skip 정책에도 | `spec-workflow.md:329-330` |
| Tier 판정 기준 | S = < 300 LOC **AND** < 5 파일 / M = 300~1000 LOC, 5~15 파일 | `spec-workflow.md:138-142` |
| REQ/AC 상한 | M = 16 / 16 (합이 아니라 **각각**) | `spec-workflow.md:146-152` |

디스패치나 SPEC 이 말한 값을 쓰지 않았다. `tier: M` 이 frontmatter 에 있으므로 **0.80** 을 적용한다.

### 0.1 Tier 배정 자체에 대한 판정 (지시받은 항목)

이 카드의 산출물은 워크플로 **파일 1개**(결정에 따라 `.nvmrc` 또는 `channel/package.json` 이 더해져 최대 3개), 분량은 40~60행 YAML 수준이다. `spec-workflow.md:140` 의 Tier S 요건(< 300 LOC AND < 5 파일)을 양쪽 다 만족한다. **SSOT 표대로면 Tier S 다.**

다만 `spec-workflow.md:154` 는 「LOC 임계는 강제가 아니라 지침」이라고 적는다. 그리고 이 오분류는 **자기에게 불리한 방향**이다 — 통과선을 0.75 에서 0.80 으로 스스로 올렸고, Tier S 라면 spec.md §3 에 인라인했을 수용 기준을 별도 파일로 뽑았다. 부담을 줄이려는 오분류(`spec-workflow.md:162` 가 경고하는 반대 방향)가 아니므로 **비차단 findings** 로 둔다(O1).

**[HARD] 귀속**: 종합 0.761 은 **Tier M 의 0.80 에 못 미쳐 FAIL** 이다. 같은 점수를 Tier S 의 0.75 에 대면 **+0.011 의 초박빙 통과**가 된다. 이 사실을 숨기지 않고 적는다. 그러나 아래 §3 의 **차단 findings 7건은 점수와 무관하게 존재**하며, 이 판정의 근거는 산술이 아니라 그 7건이다. Tier 를 S 로 정정한다 해도 차단 findings 가 닫히기 전에는 FAIL 이다.

---

## 1. 반드시 통과 (Must-Pass) 결과

- **[PASS] MP-1 REQ 번호 일관성**
  `grep -o 'REQ-CI-[0-9]\{3\}' spec.md | sort -u` → `REQ-CI-001 … REQ-CI-010` 연속 10건, 결번·중복·자리수 불일치 없음. AC 는 `grep -n '^### AC-CI-'` → acceptance.md:15/38/64/87/121/148/183/211/227 로 AC-CI-001~009 연속 9건.

- **[PASS] MP-2 GEARS 형식 준수 — 판정 계층: `spec.md` §3 의 `REQ-XXX` 요구 계층**
  10건 전부 GEARS 다섯 패턴 중 하나의 **문형**에 든다: Ubiquitous 5(001·004·005·008·010), Event-driven 2(002·003), Unwanted 1(006 — 「…해서는 안 되며」 = `shall not` 정준형), Where 1(009 — 「`actions/setup-node` 가 npm 캐시를 지원하는 한」 = 능력 게이트), 그리고 007.
  `acceptance.md` 의 Given-When-Then 항목은 **검증 계층(AC)** 이므로 이 기준으로 감점하지 않았다(§2 Testability 에서 따로 채점).
  라벨 결함 1건은 비차단으로 분리(O4): REQ-CI-007 이 `(Event-detected)` 로 표기됐는데 이는 GEARS 패턴 이름이 아니다. 본문 「**When** 어느 단계든 0 이 아닌 종료 코드를 반환하면 … `failure` 여야 한다」는 Event-driven 정형이므로 **형식은 통과**, 라벨만 틀렸다.

- **[PASS] MP-3 YAML frontmatter 유효성**
  정준 12필드 전부 존재·타입 일치(spec.md:2-13): `id`(`SPEC-CI-001`, `^SPEC-[A-Z][A-Z0-9]+-[0-9]{3}$` 만족)·`title`·`version:"0.2.0"`·`status:draft`·`created`/`updated:2026-08-31`·`author`·`priority:P2`·`phase:"v0.4.0 target"`·`module`·`lifecycle:spec-anchored`·`tags`. 거부되는 snake_case 별칭(`created_at`/`updated_at`/`labels`/`spec_id`) **없음**. `phase` 는 금지된 생명주기 토큰(`plan`/`run`/`sync`/`mx`)이 아니다.

- **[N/A] MP-4 언어 중립성**
  단일 언어(TypeScript/npm workspaces) 프로젝트에 한정된 SPEC 이며 다중 언어 도구 사슬을 다루지 않는다. 기준상 자동 통과.

- **[PASS] MP-5 D7 교차 SPEC 조정**
  본문 참조 SPEC 은 둘. `SPEC-GWAUTH-002` → `.moai/specs/SPEC-GWAUTH-002/spec.md` 존재, `grep -m1 '^status:'` → `status: completed`. `{retired, superseded, archived}` 에 들지 않으므로 조정 요구 발생하지 않음.
  `SPEC-E2E-001` 은 이 나무의 `.moai/specs/` 에 **없다**(`ls .moai/specs/` 22개 목록에 부재). 규정상 D7-5 의 SHOULD 이나, SPEC 이 「미병합 `WT-e2e-persist-readme` 브랜치에 있다」고 **경로까지 명시해 공시**했으므로(plan.md:96) 오타·유령 참조가 아니다. 정보성으로만 기록. **BLOCKING 없음.**

- **[PASS] MP-6 D8 교차 플랫폼 규율**
  `grep -c syscall` → spec.md `0` · plan.md `0` · acceptance.md `0`. 문자열 부재로 자동 통과.

- **[PASS] MP-7 해명 게이트**
  `grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-CI-001/` → 적중 없음. `research.md` 는 Tier M 이라 부재하며, `plan.md` 에 미해결 표지 없음.

**must-pass 7항목 전부 통과.** 따라서 FAIL 은 방화벽이 아니라 아래 차단 findings + 종합 점수에서 나온다.

---

## 2. 차원 점수 (0.0-1.0, 루브릭 기준)

| 차원 | 점수 | 루브릭 대역 | 근거 |
|---|---|---|---|
| Clarity | 0.80 | 0.75 (상단) | `<WF>` 파일명이 acceptance.md:9 에서 「기본 후보 `ci.yml`」인데 정적 기준 4개는 `'.github/workflows/ci.yml'` 을 **하드코딩**(acceptance.md:24·47·73·95) — 합리적 엔지니어가 다르게 구현할 여지(O2). REQ-CI-010(spec.md:136)은 ①②③ 3항 복합. REQ-CI-007 라벨 오류. 그 외 요구는 단일 해석. |
| Completeness | 0.85 | 0.75~1.0 | HISTORY·배경·범위·요구·수용·성공정의 전부 존재. `### Out of Scope —` H3 **5개**(spec.md:154·159·164·169·174) 각각 구체 `-` 항목 보유. frontmatter 완전. 증거 로그 10개 추적 확인. 감점: **결정 파급 분석의 불완전**(D3·D4·D6) 과 DoD 1 의 「아홉 건」 열거가 OD-1(b) 의 AC 추가와 연동되지 않음. |
| Testability | 0.62 | 0.75 미만 | 기준 4건이 이름 붙인 동작 없이도 초록이 되거나(**D1 기계적으로 입증**, D5) 적힌 명령 그대로는 실행되지 않는다(D2). 그 둘이 SPEC 스스로 「이 집합의 하중 지지점」이라 부른 AC-CI-006·007 과 AC-CI-009 다. |
| Traceability | 0.82 | 0.75~1.0 | REQ 10건 전부 최소 1개 AC 보유, AC 9건 전부 대상 REQ 를 명시. 감점: REQ-CI-003 은 **정적 선언 검사 하나뿐**(D5); AC-CI-009 는 대응 REQ-CI-* 가 없다(spec §4 로만 추적); AC-CI-008 의 REQ-CI-004 대응은 본문이 스스로 「로컬 대응물」이라 인정하는 약한 연결. |

**종합 = 조화평균(0.80, 0.85, 0.62, 0.82) = 0.761** (`agent-common-protocol.md` § Skeptical Evaluation Stance 의 「산술평균이 아닌 조화평균」 규정 적용). 산술평균은 0.7725 로, 어느 쪽을 써도 Tier M 0.80 에 미달한다.

---

## 3. 발견 (구조화 목록)

### 차단 (blocking)

**D1 — AC-CI-009 는 이름 붙인 동작 없이 초록이 된다 [기계적으로 입증]**
`.moai/specs/SPEC-CI-001/acceptance.md:234` — Severity: critical — Class: blocking

기준 명령을 원문 그대로 돌렸다:
```
$ sed -n '/^## D\./,/^## E\./p' .moai/specs/SPEC-CI-001/plan.md | grep '^결정됨:' | grep -v '(대기)' | wc -l | tr -d ' '
0
```
그 다음 `sed` 범위의 실제 경계를 쟀다:
```
$ sed -n '/^## D\./,/^## E\./p' .moai/specs/SPEC-CI-001/plan.md | grep -n '^####\|^###\|^## '
1:## D. 리드 결정 대기 [HARD — 이 절이 닫히기 전에는 run 진입 금지]
5:### OD-1 …
16:### OD-2 …
28:### OD-3 …
51:#### 형제 카드 제약 — `SPEC-E2E-001` AC-E2E-011 (공시)
69:## E. 워크플로의 형태 (기본값과 그 근거)
```
범위가 **`#### 형제 카드 제약` 하위절까지 포함**한다. 그래서 `plan.md` 를 스크래치패드 사본으로 떠서 그 하위절에 OD 와 무관한 `결정됨:` 3줄을 넣고 같은 명령을 돌렸다(원본 미수정):
```
$ sed -n '/^## D\./,/^## E\./p' probe.md | grep '^결정됨:' | grep -v '(대기)' | wc -l | tr -d ' '
3
$ grep -n '^결정됨: (대기)' probe.md
57:결정됨: (대기)
69:결정됨: (대기)
92:결정됨: (대기)
```
**OD-1·OD-2·OD-3 이 셋 다 `(대기)` 인 채로 기준이 `3` 을 낸다.** 즉 「열려 있는 리드 결정이 닫혔다」를 재는 기준이 **아무 결정도 닫지 않고** 만족된다. `plan.md:108` 의 「위 세 `결정됨:` 줄이 이 절의 **유일한 판정 자리**다」는 의도 선언일 뿐 명령이 강제하지 않는다. 이것이 이 프로젝트가 반복 기록한 「검증하지 않는 수용 기준」 부류다.

또 `grep -v '(대기)'` 는 `결정됨:` 뒤가 빈 줄을 통과시킨다 — acceptance.md:240 이 이를 공시하지만, 공시했다는 사실이 **이진 판정 가능성**을 복구하지는 않는다(사람의 눈이 필요해진다).

**필요한 수정**: 세 자리를 각각 앵커로 세도록 바꾼다. OD 별로 하위절 범위를 좁혀 세 개의 독립 단언으로 나누고(각 `### OD-N` ~ 다음 `###`/`####` 사이에서 정확히 1줄), 값이 `(a)`/`(b)`/`(c)` 중 하나임을 함께 단언한다. 그리고 `#### 형제 카드 제약` 을 §D 밖(새 절 또는 §E 앞)으로 옮기거나 판정 범위에서 제외한다.

---

**D2 — AC-CI-006·AC-CI-007 의 파괴 단계가 명령이 아니라 주석이며, 적힌 대로면 실행되지 않는다**
`acceptance.md:155-160`(006) · `acceptance.md:190-193`(007) — Severity: critical — Class: blocking

acceptance.md:3 은 [HARD] 로 「각 기준은 ① 증거를 만드는 **명령**과 ② 통과 조건을 함께 적는다」를 선언한다. 두 기준의 **1) 파괴** 단계가 이를 어긴다.

- AC-CI-006: 파일 생성이 `# 내용: it('scratch: …', () => { expect(1).toBe(2) })` 라는 **주석**으로만 있고, 바로 다음 줄이 `git add server/test/zz-scratch-fail.test.ts` 다. 파일이 없으므로 `git add` 가 `pathspec … did not match any files` 로 실패한다.
- AC-CI-007: 파괴가 「워크플로에서 `npm run build -w channel` 단계만 **주석 처리한다**」는 산문뿐이고, 이어지는 명령은 `git commit -am "…"` 이다. 선행 편집 명령이 없으므로 **커밋할 것이 없어 비영 종료**한다. 지금 이 트리에서 확인했다:

```
$ git commit -a --dry-run --short
?? .moai/logs/trace-8e506da8-….jsonl
?? .moai/state/config-cache.json
?? .moai/state/context-usage.json
```
(추적 중 수정 파일 0건 → `-a` 가 담을 것이 없다.)

부수 위험 하나 더: `git commit -am` 의 `-a` 는 **추적 중인 수정 파일 전부를 쓸어 담는다.** DoD 1(acceptance.md:251)이 「아홉 기준의 출력을 `progress.md` §E.2 에 원문으로 기록」하도록 요구하므로, M4 수행 시점에 `progress.md` 가 수정 상태일 개연성이 높다. 그러면 「병합 금지」 파괴 커밋에 진짜 증거 기록이 함께 실리고, 절차가 지시하는 `git revert` 가 **그 증거까지 되돌린다.** 이 프로젝트는 `kanban-dispatch.md` § 쓸어담기 금지에서 `git commit -a` 를 명시적으로 금한다(문언상 기본 체크아웃 대상이나, 위험의 성질은 워크트리에서도 동일하다).

**필요한 수정**: 두 파괴 단계를 실행 가능한 명령으로 적는다. 006 은 heredoc 으로 파일을 만들고, 007 은 편집을 명령으로 표현한 뒤 경로를 명시한 `git add` + `git commit -m` 으로 바꾼다(`-a` 금지).

---

**D3 — OD-3 (b)/(c) 는 REQ-CI-004·REQ-CI-005 를 거짓으로 만드는데, 요구 계층의 파급이 어디에도 열거돼 있지 않다**
`plan.md:90` · `spec.md:24` · `acceptance.md:241` — Severity: critical — Class: blocking

세 문서가 OD-3 (b)/(c) 의 파급으로 **오직 AC-CI-002 와 AC-CI-007** 만 열거한다(plan.md:90 `[HARD]`, spec.md:24 HISTORY ①, acceptance.md:241 `[HARD]`, plan.md:142 M1). 그러나 (b) 는 plan.md:87 이 명시하듯 「워크플로는 별도 빌드 단계를 **뺄 수 있다**」이다. 빌드 단계를 빼면:

- `spec.md:120` **REQ-CI-004** — 「CI 작업은 `npm ci` → `npm run build -w channel` → `npm test` 를 **이 순서로** 실행해야 한다」 → 구현이 이 요구를 위반한다.
- `spec.md:122` **REQ-CI-005** — 「CI 작업은 `npm run build -w channel` 단계를 `npm test` 단계보다 **앞에** 두어야 한다」 → 앞에 둘 단계 자체가 없어져 요구가 무의미해진다.

수용 기준만 고치고 요구를 그대로 두면, **구현이 자기 SPEC 의 요구 둘을 위반한 채 모든 AC 를 통과한다.** plan.md §G 가 스스로 경고하는 「정정이 스스로 낡은 기록을 남긴다」가 요구 계층에서 재현된다.

**필요한 수정**: plan.md:90 의 `[HARD]` 파급 목록과 acceptance.md:241, spec.md HISTORY 에 **REQ-CI-004·REQ-CI-005** 를 추가하고, (b) 채택 시 두 요구를 어떻게 다시 쓰는지(예: 주체를 워크플로에서 `npm test` 로 옮김) 미리 적는다.

---

**D4 — OD-3 (b)/(c) 가 이 SPEC 자신의 배제 항목과 정면으로 충돌하는데 그 충돌이 적혀 있지 않다**
`spec.md:176` vs `plan.md:87-88` — Severity: critical — Class: blocking

`spec.md:176`, §5 「Out of Scope — 워크플로 파일 이외의 변경」:

> - 테스트 코드, 소스 코드, `package.json` 스크립트의 수정. 이 카드는 기존 명령을 **호출**할 뿐 바꾸지 않는다.

OD-3 (b)/(c) 는 `channel/package.json` 의 `scripts` 에 `pretest` 를 **추가**하는 선택지다. 이는 위 배제 문언에 정확히 걸린다.

비교 대상이 있어 더 분명하다: **OD-2 (c)** 는 같은 성질의 충돌을 `plan.md:65` 에서 스스로 적었다 — 「`package.json` 수정이 §5 배제와 부딪힌다」. **OD-3 은 그 문장을 쓰지 않았다.** 같은 문서 안에서 같은 종류의 충돌 하나는 공시되고 하나는 누락됐다 — 내부 모순이며, 누락된 쪽이 훨씬 채택 가능성이 높은 선택지다.

**필요한 수정**: OD-3 표(plan.md:84-88)에 (b)/(c) 가 `spec.md` §5 배제를 건드린다는 행을 넣고, 채택 시 §5 의 해당 항목을 어떻게 좁힐지(예: 「루트 `package.json` 스크립트」로 한정) 함께 적는다. 결정 없이 이대로 (b) 로 가면 DoD 3 의 「범위 이탈」 판정과 §5 가 서로 다른 답을 낸다.

---

**D5 — REQ-CI-003(pull_request)에는 행위 기준이 없다. 선언만 재는 AC-CI-001 은 PR 에서 아무것도 실행하지 않는 워크플로를 통과시킨다**
`spec.md:116` · `acceptance.md:22-32` — Severity: critical — Class: blocking

추적을 세면 REQ-CI-003 을 겨누는 기준은 **AC-CI-001 하나**뿐이고, 그 명령이 하는 일은 파싱된 트리거 사전의 키 집합에 `pull_request` 문자열이 있는지 보는 것이다:

```python
trig = d.get('on', d.get(True)); keys = sorted(trig.keys())
assert 'push' in keys and 'pull_request' in keys, keys
```

따라서 다음 워크플로가 AC-CI-001 을 통과한다:

```yaml
on:
  push:
  pull_request:
    paths: ['no-such-directory/**']
```

`pull_request` 키는 존재하므로 초록이고, PR 실행은 **한 번도 일어나지 않는다.** push 쪽은 AC-CI-005 의 원격 관측이 이 구멍을 막지만 **pull_request 쪽에는 대응하는 원격 관측이 없다.**

이는 이 SPEC 이 acceptance.md:6-7 에서 스스로 이름 붙인 두 형태(「검증하지 않는 수용 기준」·「초록이면 통과」)가 기준 집합 **안에서** 재현된 것이다. spec.md:189 는 「『워크플로가 초록이다』는 아무것도 실행하지 않는 워크플로도 만족시킨다」고 적으면서, 정작 PR 트리거에는 그 원칙을 적용하지 않았다. 카드 문언이 「push **와** pull_request」이므로 이는 카드가 진짜로 소유한 범위의 누락이다.

**필요한 수정**: AC 하나를 추가한다 — 이 브랜치로 PR 을 열고(`gh pr create --draft`) 그 PR head SHA 에서 `gh run list --commit <sha> --workflow ci.yml` 의 결론이 `success` 임을 관측한 뒤 PR 을 닫는다. 또는 최소한 AC-CI-001 에 `trig['pull_request']` 가 `branches`/`paths` 필터로 무력화돼 있지 않음을 단언하는 줄을 더한다.

---

**D6 — OD-2 (b) 는 `node-version` 키를 없애는데, 공시된 파급은 「값이 바뀐다」뿐이다**
`plan.md:64` vs `acceptance.md:107,115` · `plan.md:178` — Severity: major — Class: blocking

AC-CI-004 의 단언(acceptance.md:107):

```python
assert str(w.get('node-version')).startswith('24'), w
```

OD-2 (b) 는 `plan.md:64` 가 명시하듯 「워크플로는 `node-version-file: .nvmrc` 로 가리켜 **단일 출처**가 된다」이다. 그 형태에는 `node-version` 키가 **존재하지 않는다**. 그러면 `w.get('node-version')` 은 `None`, `str(None)` 은 `'None'`, `'None'.startswith('24')` 는 `False` → 단언 실패.

공시된 두 자리는 이 경우를 말하지 않는다:

- `acceptance.md:115` — 「Node 메이저 버전 `24` 는 … **값이 바뀔 수 있다**. 결정이 다른 값으로 내려지면 이 기준의 `startswith('24')` 를 **그 값으로** 함께 고친다」 → 값 치환만 상정.
- `plan.md:178` §G 2행 — 「OD-2 로 Node 값이 바뀌면 AC-CI-004 의 `startswith('24')` 가 거짓이 된다」 → 역시 값 치환.

**키 제거는 값 치환이 아니다.** 「OD-1·OD-2 는 OD-3 보다 주의를 덜 받았다」고 지목된 자리에서 실제로 나온 결함이다.

**필요한 수정**: acceptance.md:115 의 주의문과 plan.md §G 2행을 「(b) 를 고르면 `node-version` 키가 사라지므로 단언을 `node-version-file` 존재 + `.nvmrc` 내용 검사로 **교체**한다」로 확장한다. 아울러 OD-1 (b) 채택 시 AC 가 1건 늘어나므로(plan.md:53 이 인정) DoD 1(acceptance.md:251)의 「AC-CI-001 ~ AC-CI-009 **아홉 건**」 열거와 AC-CI-009 가 세는 `3` 의 관계도 함께 갱신 대상임을 M1 에 적는다 — 현재 어느 문서도 이 둘을 연결하지 않는다.

---

**D7 — 「exit 0」 주장 넷을 증거 로그가 뒷받침하지 못한다**
`spec.md:52,58,72,86` · `plan.md:23,25,27` · `.moai/state/verify/t27-plan/{npm-ci,build,typecheck-server,typecheck-channel}.log` — Severity: major — Class: blocking

`spec.md:52` 는 절 전체에 대해 「아래 값은 **전부 그 실행의 관측이며 추정이 아니다**」라고 선언한다. 그런데 네 로그를 열면 종료 코드가 **어디에도 없다**:

```
$ head -100 npm-ci.log build.log typecheck-server.log typecheck-channel.log
==> npm-ci.log <==   added 269 packages, and audited 272 packages in 2s … found 0 vulnerabilities
==> build.log <==    > @minidiscord/channel@0.1.0 build   > tsc
==> typecheck-server.log <==   > typecheck   > tsc --noEmit
==> typecheck-channel.log <==  > @minidiscord/channel@0.1.0 typecheck   > tsc --noEmit
```

세 로그는 npm 배너 두 줄이 전부다. 「exit 0」을 지지하는 것은 **`npm error` 블록의 부재**뿐인데, 이 프로젝트의 원칙(`verification-claim-integrity.md` §1, spec.md:38 이 스스로 인용)이 정확히 **부재는 통과의 증거가 아니다**라고 말한다. 대조군이 같은 디렉터리 안에 있다 — `test-no-build.log` 는 `npm error code 1` 을 담고 `test-with-build.log` 는 전건 통과 요약을 담는다. 즉 **하중이 큰 둘은 귀속이 서고, 나머지 넷은 서지 않는다.**

**필요한 수정**: 네 명령을 `… ; echo "exit=$?"` 형태로 다시 돌려 로그에 종료 코드를 남기거나, spec.md §2 의 해당 줄에서 「exit 0」을 지우고 로그가 실제로 보여 주는 것만 적는다. 「수를 고칠 자리와 지울 자리」 원칙을 적용하면 후자가 안전하다 — 새 수를 쓰지 말 것.

### 비차단 (optional)

- **O1** `spec.md:14` — `tier: M` 자기 배정. SSOT 표(`spec-workflow.md:140`) 기준 산출물 1파일 / < 300 LOC 은 **Tier S** 다. 방향이 자기에게 불리하므로(통과선 0.75→0.80) 범위 회피가 아니다. Severity: minor — Class: optional — 수정: Tier S 로 내리고 통과선 0.75 를 적용하거나, M 유지 근거(원격 CI 라는 새 표면의 위험도)를 §0 에 한 줄로 적는다.
- **O2** `acceptance.md:9,24,47,73,95,129,164,196` — `<WF>` 를 「기본 후보 `ci.yml`」이라 정의해 놓고 정적 기준 4개와 원격 기준 3개가 `ci.yml` 을 하드코딩. `plan.md:114` 는 §E 전체가 「리드가 뒤집을 수 있다」고 적으므로 **파일명은 네 번째 미결 결정**인데 파급 목록에 없다. Severity: major — Class: optional — 수정: 파일명을 §D 의 결정으로 승격하거나, §E 표의 파일명 행에 「변경 시 AC-CI-001~007 일곱 자리를 함께 고친다」를 못 박는다.
- **O3** `acceptance.md:50-56` — AC-CI-002 의 `idx()` 가 각 바늘에 대해 적중 **정확히 1회**를 요구하고 세 인덱스의 강한 부등호를 단언한다. 그래서 REQ-CI-004 를 만족하는 단일 `run: |` 블록(세 명령을 한 단계에 순서대로)은 `0 < 0 < 0` 으로 **떨어진다**. `npm run build --workspace channel` 표기도 마찬가지로 떨어진다. 기준이 요구보다 좁다. Severity: minor — Class: optional — 수정: REQ-CI-004 에 「세 단계로 분리한다」를 명시하거나 기준을 표기 변형에 견디게 완화.
- **O4** `spec.md:128` — REQ-CI-007 의 `(Event-detected)` 라벨은 GEARS 패턴 이름이 아니다(형식 자체는 Event-driven 으로 정상). Severity: minor — Class: optional.
- **O5** `spec.md:136` — REQ-CI-010 이 ①권한 ②동시성 ③시간제한 3항 복합. 셋 중 하나만 어겨도 어느 요구가 깨졌는지 지목되지 않는다. Severity: minor — Class: optional.
- **O6** `spec.md:185` — 성공의 정의 1번이 「GitHub 이 그것을 파싱해 **등록했으며**」라고 적지만, 이를 재는 AC-CI-001 은 **로컬 PyYAML 파싱**만 한다. GitHub 이 거부하는 스키마 오류(예: 잘못된 `uses:` 형태)는 로컬 파싱을 통과한다. 등록의 실제 증거는 AC-CI-005 에 있다. `actionlint` 부재(내가 확인: `which actionlint` → not found)가 이유이고 그 부재는 plan.md:32 에 공시돼 있으나, §6-1 의 **문언이 자기 기준보다 넓다.** Severity: minor — Class: optional — 수정: §6-1 을 「로컬 파싱이 성공하고, 원격 실행이 발생했다(AC-CI-005)」로 좁힌다.
- **O7** `plan.md:98-99` — 형제 기준 인용이 AC-E2E-011 의 **측정 ① 하나만** 옮기면서 그것이 부분 인용임을 밝히지 않는다. §4 참조 — 결론은 세 측정 전체에 대해 성립하므로 판정에 영향은 없다. Severity: minor — Class: optional.
- **O8** `.moai/state/verify/t27-plan/flake-repeat.log` — 9회 반복 시도가 `CACError: Unknown option --repeats` 로 **실행되지 못한** 기록인데, 세 문서 어디에도 이 파일이 언급되지 않는다. spec.md §2.6 이 실패율 미측정을 정직하게 [HARD] 로 공시하므로 거짓 주장은 아니나, 「반복 측정을 시도했다가 도구 옵션 부재로 접었다」는 사실이 추적에서 사라진다. Severity: minor — Class: optional — 수정: §2.6 에 한 줄 추가.
- **O9** `spec.md:15` — `related_specs:` 는 frontmatter 스키마의 선택 필드 목록(`spec-frontmatter-schema.md` § Optional Fields)에 없다. 필수 필드 위반은 아니며 lint 는 추가 필드를 거부하지 않는다. Severity: minor — Class: optional.
- **O10** `acceptance.md:223` — AC-CI-008 의 REQ-CI-004 대응이 본문 스스로 「로컬 대응물」이라 인정하는 간접 연결. Severity: minor — Class: optional.
- **O11** `acceptance.md:238` — AC-CI-009 는 대상이 `spec.md §4`·`plan.md §D` 이고 대응 `REQ-CI-*` 가 없다(요구 집합에 대한 고아 AC). 절차 기준이라 성질상 자연스럽지만, DoD 1 이 아홉 건을 동등하게 다루므로 명시가 낫다. Severity: minor — Class: optional.
- **O12 (범위)** REQ-CI-009(npm 캐시)·REQ-CI-010(권한·동시성·시간제한)은 카드 문언의 세 명령을 넘어선다. 위생으로서 방어 가능하고 §5 가 매트릭스·커버리지·배포를 제대로 배제하고 있으므로 **조용한 팽창은 아니다.** 다만 AC-CI-004 의 8개 단언 중 6개가 이 둘에서 나온다. Severity: minor — Class: optional — 판정: 팽창으로 보지 않음, 기록만.

---

## 4. 형제 제약 공시의 정확성 (별도 판정)

`.claude/worktrees/t6/.moai/specs/SPEC-E2E-001/acceptance.md` 의 AC-E2E-011 을 **직접 읽었다**(읽기 전용, 수정하지 않음). 원문 측정 셋:

```
- 측정 ①: git diff 2a19d7d..HEAD -- package.json | grep '^-' | grep -c '"test"'  → 0
- 측정 ②: node -e "console.log(require('./package.json').scripts.e2e)"           → 비어 있지 않음
- 측정 ③: git rev-parse --verify 2a19d7d >/dev/null; echo "exit=$?"              → exit=0
```

`plan.md:103-104` 의 주장을 각각 판정한다.

1. **「측정 ①이 루트 `package.json` 만 보므로 문언 위반이 아니다」 → 정확하다.**
   `git diff -- package.json` 의 pathspec 은 저장소 루트의 그 경로에만 걸리며 `channel/package.json` 은 매치하지 않는다. 측정 ②·③ 도 루트 파일과 기준선 SHA 만 본다. **셋 다 `channel` 의 `pretest` 에 영향받지 않는다** — SPEC 이 ① 만 인용했지만 결론은 세 측정 전체에 대해 성립한다.

2. **「`pretest` 는 `scripts.test` 리터럴을 두면서 `npm test` 동작을 바꾸므로 취지에는 압력을 준다」 → 정확하다. 과장도 축소도 아니다.**
   AC-E2E-011 의 제목은 「배선이 기존 `test` 를 **건드리지 않는다**」이고, 그 「잡는 변이」는 `test` 값을 `… && npm run e2e` 로 바꾸는 것이다. 제목(동작)이 측정(리터럴)보다 넓고, `pretest` 는 정확히 그 간극에 들어앉는다. SPEC 의 「문언은 만족하고 취지는 건드린다」는 이 관계를 정확히 기술한다.
   굳이 말하면 **미세하게 축소** 쪽이다 — 「압력을 준다」보다 「제목이 선언한 것을 실제로 위반하되 측정이 그것을 못 잡는다」가 더 정확하다. 그러나 SPEC 은 그 판단을 리드에게 넘긴다고 명시했고 방향을 왜곡하지 않았으므로 **결함으로 세지 않는다.**

3. **병합 순서 주의(`plan.md:105`) → 정확하다.** 두 카드가 건드리는 파일이 겹치지 않는다는 진술은 맞다(t6 = 루트 `package.json`, t27 = `channel/package.json` 또는 없음).

**형제 공시 종합 판정: 정확. 결함은 「셋 중 하나만 인용하고 그 사실을 밝히지 않음」(O7) 하나뿐이며, 이는 결론을 바꾸지 않는다.**

---

## 5. 내가 재현한 명령 / 재현하지 못한 것

### 재현했다 (이 나무에서 직접 실행, 출력 확인)

| # | 명령 | 관측 | SPEC 주장과 |
|---|---|---|---|
| 1 | `ls -la .github/workflows/` | `label-sync.yml` 1개뿐 | 일치 (spec.md:33) |
| 2 | `python3 -c "…yaml.safe_load('label-sync.yml')…"` | `keys: ['name', True, 'permissions', 'jobs']` | **문자 그대로 일치** (spec.md:26 주석) |
| 3 | `ls node_modules/better-sqlite3/prebuilds/` | `linux-x64.node`·`linux-arm64.node` 포함(총 8개) | 일치 (spec.md:90) |
| 4 | `python3 -c "…better-sqlite3 package.json['version']"` | `13.0.3` | 일치 |
| 5 | `sed -n '1,12p' server/src/config.ts` | **8행**이 `get dataDir() { return process.env.MINIDISCORD_DATA_DIR ?? './data' }` | 행번호까지 일치 (spec.md:94) |
| 6 | `ls -d server/data data` | 루트 `data` **부재**, `server/data` **존재** | 일치 (spec.md:94 — t6 F-05 경고 반영이 옳다) |
| 7 | `git ls-files .moai/state/verify/t27-plan/` | 로그 10개 전부 추적 중 | HISTORY ⑤ 주장 성립 (`.gitignore` 의 `!/.moai/state/` 가 실제로 작동) |
| 8 | `which python3 gh actionlint yq` + `yaml.__version__` + `gh --version` | python3 O, PyYAML **6.0.3**, gh **2.83.2**, actionlint **X**, yq **X** | 일치 (plan.md:32) |
| 9 | `gh run list --help \| grep -- '--commit\|--workflow\|--json'` | `-c/--commit`, `-w/--workflow`, `--json` 전부 존재 | AC-CI-005·006·007 의 `gh` 호출은 **플래그상 유효** |
| 10 | `node -v` / `npm -v` | `v24.12.0` / `11.6.2` | 일치 (spec.md:84) |
| 11 | AC-CI-009 명령 원문 | `0` | 일치 (progress.md 「현재 `0`」) |
| 12 | AC-CI-009 오탐 탐침 (스크래치 사본) | **`3`** — OD 셋이 전부 `(대기)` 인 채로 | **D1 입증** |
| 13 | `cat test-no-build.log` | `Tests 6 failed \| 89 passed (95)`, `npm error code 1`, 실패 파일이 `gateway-mutual-auth`·`index-wiring`·`transport-auth` 정확히 셋 (2+1+3=6) | 일치 (spec.md:65-70) |
| 14 | `grep -l "dist/index.js" channel/test/*.ts` | 그 세 파일이 정확히 적중 | 원인 설명(spec.md:70) 지지 |
| 15 | `git commit -a --dry-run --short` | 추적 중 수정 0건(미추적 3건뿐) | **D2 의 「커밋할 것 없음」 입증** |
| 16 | `cat package.json` / `cat channel/package.json` | workspaces `["server","channel"]`, 루트 스크립트 `test` 하나, channel scripts 에 **`pretest` 없음** | 일치 (spec.md:56-57, plan.md:77) |
| 17 | `grep -m1 '^status:' .moai/specs/SPEC-GWAUTH-002/spec.md` | `completed` | D7 게이트 판정 근거 |
| 18 | t22 `sync-audit.md:200-215` · t22 `sync-done.md:65-75` · t6 `sync-audit.md:195-201` | F6 절, 리드 인계 4번, `./data` 경고(F-05) 전부 인용 위치에 실재 | 이월 출처 인용 정확 |
| 19 | t6 `SPEC-E2E-001/acceptance.md` 해당 구간 | AC-E2E-011 원문 3측정 확인 | §4 판정 근거 |
| 20 | REQ/AC 열거 grep | REQ 10 연속 · AC 9 연속 · `### Out of Scope —` 5개 | MP-1 / 구조 점검 근거 |

### 재현하지 못했다 (로그 귀속으로만 읽음 — 미관측)

- **`npm ci` exit 0** — `npm-ci.log` 에 종료 코드 없음. 재실행하면 `node_modules` 를 감사 도중 바꾸므로 돌리지 않았다. → D7.
- **`npm run build -w channel` exit 0** — `build.log` 는 배너 2줄, 종료 코드 없음. 산출물 `channel/dist` 를 다시 쓰게 되므로 돌리지 않았다. → D7.
- **`npm run typecheck -w {server,channel}` exit 0** — 두 로그 모두 배너뿐, 종료 코드 없음. → D7.
- **빌드 후 `npm test` = 283 (188+95)** — `test-with-build.log` 의 요약은 읽었고 내부 산술(15파일 188 + 6파일 95 = 283)은 맞다. 그러나 **내가 스위트를 다시 돌리지는 않았다**(약 75초 + `server/data` 재생성 + 감사 중 트리 변경). 로그 귀속으로만 인정한다.
- **흔들림의 「과거 2회 실패」** — 출처가 `.claude/worktrees/t6/.moai/reports/t6/run-done.md` §5-4 인데 그 파일을 열지 않았다. 미검증.
- **「이 나무에서 네 번 더 돌려 전부 초록」** — `flake-run1..3.log` 3회의 `Test Files 1 passed (1) / Tests 30 passed (30)` 는 읽었고, 네 번째는 `test-with-build.log` 의 전체 스위트로 셈이 맞는다. 다만 내가 직접 반복 실행하지는 않았다. spec.md:104 의 [HARD] 자기 제한(「고쳐졌다고 주장하지 않으며 실패율도 정량화되지 않았다」)은 **정직하고 오히려 자기에게 불리한 쪽**으로 적혀 있어, 이 항목에서는 과장도 축소도 발견하지 못했다.
- **AC-CI-005·006·007 의 원격 절반** — 원격 실행이 아직 없고 push/commit 이 금지돼 있어 실행 불가. 설계상 run 단계의 몫이다.

---

## 6. 권고 (FAIL — manager-spec 수정 지시)

우선순위 순. 1~5 는 차단이며 닫히기 전 run 진입 불가.

1. **AC-CI-009 를 다시 쓴다** (`acceptance.md:227-243`). 판정 자리를 `### OD-N` 하위절 **각각**으로 좁혀 세 개의 독립 단언으로 나누고, 각 자리에서 `결정됨:` 이 정확히 1줄이며 값이 `(a)`/`(b)`/`(c)` 중 하나임을 함께 단언한다. 아울러 `#### 형제 카드 제약`(plan.md:94-106)을 §D 밖으로 옮기거나 `sed` 범위에서 제외해 오탐 경로를 물리적으로 없앤다. **수정 후 반드시 오탐 탐침을 재실행해 `3` 이 나오지 않음을 원문 출력으로 남긴다.**
2. **AC-CI-006·AC-CI-007 의 파괴 단계를 실행 가능한 명령으로 바꾼다** (`acceptance.md:155-160`, `190-193`). 006 은 heredoc 파일 생성 명령을 넣고, 007 은 편집을 명령으로 표현한 뒤 `git commit -am` 을 **경로 명시 `git add` + `git commit -m`** 으로 교체한다(`-a` 금지 — 되돌림이 무관한 증거 기록까지 되돌린다).
3. **OD-3 의 파급 목록에 요구 계층과 배제 항목을 넣는다.** `plan.md:90`·`acceptance.md:241`·`spec.md` HISTORY 세 자리에 **REQ-CI-004·REQ-CI-005**(D3)와 **`spec.md:176` §5 배제 충돌**(D4)을 추가하고, (b) 채택 시 두 요구와 그 배제 항목을 각각 어떻게 다시 쓰는지 미리 적는다. OD-2 (c) 가 `plan.md:65` 에서 같은 충돌을 이미 공시했으므로 형식은 그대로 따르면 된다.
4. **REQ-CI-003 에 행위 기준을 붙인다**(D5). 새 AC 로 PR head SHA 의 `gh run list` 결론 `success` 를 관측하거나, 최소한 AC-CI-001 에 `pull_request` 트리거가 `branches`/`paths` 필터로 무력화돼 있지 않음을 단언하는 줄을 더한다. 지금 상태는 이 SPEC 이 스스로 금지한 형태다.
5. **OD-2 (b) 의 키 제거를 공시한다**(D6). `acceptance.md:115` 와 `plan.md:178` §G 2행을 「값이 바뀐다」에서 「(b) 는 `node-version` 키를 없애므로 단언을 `node-version-file` + `.nvmrc` 검사로 **교체**한다」로 확장한다. 같은 커밋에서 OD-1 (b) 가 AC 를 1건 늘릴 때 DoD 1 의 「아홉 건」과 AC-CI-009 의 기대값이 함께 움직인다는 사실도 M1(`plan.md:139-144`)에 적는다.
6. **exit 0 주장의 귀속을 세운다**(D7). 네 명령을 `; echo "exit=$?"` 로 다시 돌려 로그에 종료 코드를 남기거나, spec.md §2 에서 「exit 0」을 **지우고** 로그가 실제로 보여 주는 것만 적는다.
7. **파일명을 결정으로 승격한다**(O2). `ci.yml` 이 §E 의 뒤집을 수 있는 제안인 한, 그것은 네 번째 미결 결정이며 AC 일곱 자리를 움직인다. §D 로 올리거나 §E 표에 파급을 못 박는다.
8. **Tier 재판단**(O1). SSOT 표대로면 S 다. 내리면 통과선이 0.75 가 된다 — 이 사실이 판정에 미치는 영향은 §0.1 에 적었다.

### 다음 회차에 대한 메모

이 보고서의 D1~D7 · O1~O12 가 **2회차 재감사의 범위**다. 2회차는 백지 전면 재감사가 아니라 이 열거된 결함 델타 + 회귀 점검으로 수행한다. 미해결 항목은 다른 점수와 무관하게 자동 FAIL 이다.
