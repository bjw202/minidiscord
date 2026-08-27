# SPEC-MENTION-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-MENTION-001` |
| 칸반 카드 | `t3` (마일스톤 M3) |
| Tier | S (spec.md + plan.md, 이 카드에서는 acceptance.md 도 함께 요구됨) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 6 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 2·6·7·8장 |
| 워크트리 | `.claude/worktrees/t3` (브랜치 `WT-msg-gateway-relay`) |
| 선행 SPEC | `SPEC-CORE-001` (카드 `t1`) |
| 실행 순서 | 카드 `t3` 의 네 태스크 중 **첫 번째** 권장 (Task 8·9 가 이 SPEC 의 타입에 결합) |
| 현재 상태 | `in-progress` — run 단계 완료 (§E.2·§E.3 audit-ready) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-MENTION-001
tier: S
card: t3
milestone: M3
depends_on: [SPEC-CORE-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 6)
source_spec: .moai/plan/2026-08-26-minidiscord/spec-v2.md (2, 6, 7, 8장)
spec_version: "0.1.0"
req_count: 7
ac_count: 8
tier_budget: "8 REQ / 8 AC"
spec_base_sha: 32c20e1da4e774219bb055cf9c52eed6b7a42d3e
plan_audit: .moai/reports/t3-plan-audit-b.md
plan_audit_verdict: "PASS — 수용 기준 8개 중 공허한 것 0건, 필수 수정 없음"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-MENTION-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 기준점 위에 검사 **두 개**가 올라간다 — "손댄 파일은 `mention.ts` 와 `mention.test.ts` 둘뿐"(REQ-MENTION-007)과 "기존 소스가 한 줄도 안 바뀜". 기준 SHA 가 없으면 두 검사의 표준 출력이 모두 비어 있어 **거짓 통과**한다. 그래서 `acceptance.md` AC-MENTION-007 이 `git rev-parse --verify` 를 앞에 두고 종료 코드를 관측 조건에 넣었다.

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `spec.md` | 요구사항 7개(GEARS), 범위 밖 5개 절, 원본 문서 모순 3건과 해소 |
| `plan.md` | §A 의존 · §B 반환 타입 계약 · §C 멘션 문법 · §D 모순 해결 근거 · §E 위험 · §F 마일스톤 M0/M1 · §G 자기 검증 · §H 안티패턴 |
| `acceptance.md` | 수용 기준 8개(Given-When-Then), 판정 규범 2개, 스텁 대조 표, 엣지 케이스 9건, Definition of Done |
| `progress.md` | 이 파일 |

### SPEC-ID 검증

```bash
ID="SPEC-MENTION-001"
[[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
```

관측된 출력: `PASS`

### REQ → AC 커버리지

| 요구사항 | 덮는 수용 기준 |
|----------|----------------|
| REQ-MENTION-001 (형식) | AC-MENTION-004 |
| REQ-MENTION-002 (순서·중복) | AC-MENTION-001, AC-MENTION-003 |
| REQ-MENTION-003 (타입 계약) | AC-MENTION-001, AC-MENTION-002, AC-MENTION-006 |
| REQ-MENTION-004 (배제) | AC-MENTION-004 |
| REQ-MENTION-005 (한국어 이름) | AC-MENTION-005 |
| REQ-MENTION-006 (순수 함수) | AC-MENTION-007 |
| REQ-MENTION-007 (범위 경계) | AC-MENTION-007 |
| (요구사항 아님 — 절차) | AC-MENTION-008 RED→GREEN 전이 |

고아 요구사항 0건, 고아 기준 0건.

### 수용 기준 스텁 대조 — 부류 단위 점검 결과

이 SPEC 의 수용 기준을 개별로 보지 않고 **"이 중 무엇이 `return []` 스텁을 통과시키는가"** 로 한 번에 훑었다. 앞 카드(`t2`)에서 같은 결함 부류가 세 번 재생산된 이력이 있어, 개별 검토로는 부족하다고 판단했다.

| 기준 | 스텁에서 실패하는가 |
|------|---------------------|
| AC-MENTION-001 / 002 / 003 / 005 | 예 — 기대값이 비어 있지 않다 |
| AC-MENTION-004 | 예 — **강화 후에만.** 원본 `plan-v2.md` 의 부정 테스트 두 개는 기대값이 `[]` 이라 스텁을 통과시켰다. 같은 입력에 정상 멘션을 섞어 기대값을 한 원소로 바꿨다 |
| AC-MENTION-008 | 예 — RED-2 단계가 스텁 거부를 직접 관측한다 |
| AC-MENTION-006 | 아니오 — 타입 계약 기준. 잡는 것은 단일 객체 반환·`delivery: string` 확장 |
| AC-MENTION-007 | 아니오 — 경계 기준. 잡는 것은 import 추가·범위 밖 파일 수정 |

동작을 다루는 여섯 기준은 전부 스텁에서 실패한다. 통과시키는 둘은 동작이 아니라 타입과 경계를 관측하며, 그 사실을 `acceptance.md` 「스텁 대조」 표에 명시해 오독을 막았다.

작성 중 **실제로 걸러낸 것**: 원본 테스트 `ignores plain @name without TO/CC parens` 와 `rejects empty or space-containing name (no match)` 를 그대로 기준으로 삼았다면, 그 둘은 빈 스텁·느슨한 정규식·`i` 플래그·`*` 수량자를 **하나도** 잡지 못했다.

### 강화한 테스트의 사전 검증

바꾼 두 테스트의 기대값이 `plan-v2.md` Task 6 의 참조 구현에서 실제로 나오는지 확인했다(문서상 추론이 아니라 실행).

```bash
node -e "
const RE=/@(TO|CC)\(([^()\s]+)\)/g;
const p=b=>[...b.matchAll(RE)].map(m=>({bot:m[2],delivery:m[1].toLowerCase()}));
..."
```

관측된 출력 중 강화한 두 건:

```
"@pm 안녕 @토(pm)도 무시 @to(pm)도 무시 @TO(real) 이건 잡힌다" -> [{"bot":"real","delivery":"to"}]
"@TO( ) @TO() @CC(ok)" -> [{"bot":"ok","delivery":"cc"}]
```

나머지 네 건(원본 그대로)도 원문 기대값과 일치했다. 즉 강화된 기준은 정상 구현을 거절하지 않는다.

### 이 단계에서 하지 않은 것 (Gaps)

- **수용 기준의 명령을 실제로 돌려 보지 않았다.** 이 워크트리에 `node_modules` 가 없다 — `npm test -w server -- --reporter=verbose` 를 실행해 `sh: vitest: command not found` (종료 코드 `127`)를 관측했다. run 단계 M0 의 `npm install` 이 전제다.
- **verbose `✓` 줄의 형식은 이 워크트리에서 관측하지 못했다.** 같은 워크스페이스·같은 vitest 판에서 앞 카드가 남긴 원문 출력(`.moai/specs/SPEC-BOT-001/progress.md` §E.2 190-194행)을 근거로 삼았다. 추정이 아니라 다른 실행의 관측이며, 이 SPEC 의 파일명·describe 이름으로 치환한 것은 미검증이다.
- **plan-audit 을 받지 않았다.** Tier S 기준선은 `0.75`.
- `spec_base_sha` 는 아직 비어 있다.
- Task 7·8·9 의 SPEC 과 대조하지 않았다. 이 SPEC 이 확정한 반환 타입에 그 태스크들이 결합하므로, 병행 작성 중이라면 `spec.md` §4.2 를 대조 대상으로 넘긴다.

### 리드에게 보고할 사항

작성 지시와 `plan-v2.md` 가 두 곳에서 어긋난다. `plan-v2.md` 를 채택했다 — 근거는 `plan.md` §D 3번.

| 항목 | 지시 | 채택 |
|------|------|------|
| 파일명 | `server/src/mentions.ts` | `server/src/mention.ts` |
| 반환 타입 | `{ bot, delivery }` | `Mention[]` |

리드가 다른 판단을 하면 `spec.md` §4.2, `plan.md` §B, `acceptance.md` AC-MENTION-006 세 곳이 함께 바뀐다.

---

## §E.2 Run-phase Evidence

실행 환경: 워크트리 `.claude/worktrees/t3` (브랜치 `WT-msg-gateway-relay`). 기준 SHA `32c20e1da4e774219bb055cf9c52eed6b7a42d3e` (§E.1). 구현 커밋 `36ad9b43b694f703a8e76efa4381f2e273a4d822` (`feat: @TO/@CC mention parser (card t3)`).

귀속 시점 표기: RED-1·RED-2·GREEN 최초 관측은 구현 전 워크트리(HEAD `32c20e1`, 신규 파일 미추적 상태)에서 이뤄졌고, GREEN·TYPE·AC-007 경계 검사는 구현 커밋 직후 동일 워크트리(HEAD `36ad9b4`)에서 재관측했다. RED 상태는 커밋 이전에만 존재할 수 있으므로 RED 증거의 귀속 시점은 `32c20e1` 이다.

### 기준선 (M0.2) — 이 SPEC 이 손대기 전

- 명령: `npm test -w server`
- 관측 (HEAD `32c20e1`, 깨끗한 워크트리):

```
 Test Files  5 passed (5)
      Tests  37 passed (37)
```

- 종료 코드 `0`. 위임 지시의 기준선(5파일 37테스트)과 일치.

### AC 매트릭스 — 전 줄 PASS

각 줄은 (a) 명령, (b) 관측된 원문 출력, (c) 캡처 시점 HEAD 를 함께 적는다.

| AC | 판정 | (a) 명령 | (b) 관측된 원문 출력 | (c) HEAD |
|----|------|----------|---------------------|----------|
| AC-MENTION-001 | **PASS** | `npm test -w server -- --reporter=verbose` | ` ✓ test/mention.test.ts > parseMentions > parses a single TO 1ms` | `36ad9b4` |
| AC-MENTION-002 | **PASS** | 위와 같음 | ` ✓ test/mention.test.ts > parseMentions > parses CC 0ms` | `36ad9b4` |
| AC-MENTION-003 | **PASS** | 위와 같음 | ` ✓ test/mention.test.ts > parseMentions > parses multiple mentions in order, duplicates kept 0ms` | `36ad9b4` |
| AC-MENTION-004 | **PASS** | 위와 같음 | 아래 두 줄 모두 관측:<br>` ✓ test/mention.test.ts > parseMentions > ignores plain @name and non-TO/CC keywords while catching a real mention 0ms`<br>` ✓ test/mention.test.ts > parseMentions > rejects empty and space-containing names while catching a valid one 0ms` | `36ad9b4` |
| AC-MENTION-005 | **PASS** | 위와 같음 | ` ✓ test/mention.test.ts > parseMentions > korean bot names work 0ms` | `36ad9b4` |
| AC-MENTION-006 | **PASS** | `npm run typecheck -w server` | 아래 TYPE 원문 블록. 종료 코드 `0`, 오류 0건 — 타입 고정 3줄(`mention.test.ts` 상단)이 포함된 상태에서 통과 | `36ad9b4` |
| AC-MENTION-007 | **PASS** | 아래 AC-MENTION-007 네 명령 | grep 빈 출력·종료 코드 1 / rev-parse 40자리 SHA·종료 코드 0 / diff 정확히 두 줄·종료 코드 0 / diff-stat 빈 출력·종료 코드 0 | `36ad9b4` |
| AC-MENTION-008 | **PASS** | 아래 네 전이 블록 | RED-1 실패 → RED-2 스텁 거부 × 6 → GREEN ✓ 6 → TYPE 종료 코드 0 순서로 관측 | `32c20e1` → `36ad9b4` |

동작 기준 여섯(001-005, 008)의 `✓`/`×` 줄은 전부 `--reporter=verbose` 출력에서 직접 관측했다(§H 안티패턴 — 요약 줄·종료 코드만으로 판정하지 않음).

### AC-MENTION-008 — RED → GREEN 전이 원문

**RED-1** — `npm test -w server` (구현 파일 없음; HEAD `32c20e1`):

```
 FAIL  test/mention.test.ts [ test/mention.test.ts ]
Error: Cannot find module '../src/mention.js' imported from /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t3/server/test/mention.test.ts
 ❯ test/mention.test.ts:2:1
      1| import { describe, it, expect } from 'vitest'
      2| import { parseMentions } from '../src/mention.js'
       | ^
      3| import type { Mention } from '../src/mention.js'
      4|

 Test Files  1 failed | 5 passed (6)
      Tests  37 passed (37)
```

종료 코드 `1`. 요구대로 `server/src/mention.ts` 부재로 모듈 해석에 실패했다.

**RED-2** — `npm test -w server -- --reporter=verbose` (스텁 `return []` 직후; HEAD `32c20e1`):

```
 × test/mention.test.ts > parseMentions > parses a single TO 5ms
   → expected [] to deeply equal [ { bot: 'pm', delivery: 'to' } ]
 × test/mention.test.ts > parseMentions > parses CC 1ms
   → expected [] to deeply equal [ { bot: 'coder', delivery: 'cc' } ]
 × test/mention.test.ts > parseMentions > parses multiple mentions in order, duplicates kept 1ms
   → expected [] to deeply equal [ { bot: 'pm', delivery: 'to' }, …(2) ]
 × test/mention.test.ts > parseMentions > ignores plain @name and non-TO/CC keywords while catching a real mention 0ms
   → expected [] to deeply equal [ { bot: 'real', delivery: 'to' } ]
 × test/mention.test.ts > parseMentions > rejects empty and space-containing names while catching a valid one 0ms
   → expected [] to deeply equal [ { bot: 'ok', delivery: 'cc' } ]
 × test/mention.test.ts > parseMentions > korean bot names work 1ms
   → expected [] to deeply equal [ { bot: '코드리뷰어', delivery: 'to' } ]

 Test Files  1 failed | 5 passed (6)
      Tests  6 failed | 37 passed (43)
```

종료 코드 `1`. 동작 기준 여섯이 스텁을 전부 거부한다는 직접 관측 — 「판정 규범 2」의 실행 확인. `✓ ... parses a single TO` 줄은 이 시점에 존재하지 않는다.

**GREEN** — `npm test -w server -- --reporter=verbose` (정규식 구현 후; HEAD `36ad9b4` 재관측):

```
 ✓ test/mention.test.ts > parseMentions > parses a single TO 1ms
 ✓ test/mention.test.ts > parseMentions > parses CC 0ms
 ✓ test/mention.test.ts > parseMentions > parses multiple mentions in order, duplicates kept 0ms
 ✓ test/mention.test.ts > parseMentions > ignores plain @name and non-TO/CC keywords while catching a real mention 0ms
 ✓ test/mention.test.ts > parseMentions > rejects empty and space-containing names while catching a valid one 0ms
 ✓ test/mention.test.ts > parseMentions > korean bot names work 0ms
 Test Files  6 passed (6)
      Tests  43 passed (43)
```

종료 코드 `0`. 기존 37테스트 전부 포함해 43/43 통과. (첫 GREEN 관측은 커밋 전 `32c20e1` 워크트리에서 동일하게 43/43·`✓` 6줄을 확인했고, 커밋 후 `36ad9b4` 에서 같은 출력을 재관측해 귀속을 확정했다. 재관측 출력은 verbose 전체에서 `mention.test.ts|Test Files|Tests` 줄만 발췌한 것이다.)

**TYPE** — `npm run typecheck -w server` (HEAD `36ad9b4`):

```
> typecheck
> tsc --noEmit
```

종료 코드 `0`. `@ts-expect-error` 2개가 남아돌지 않았다(계약이 느슨해졌다면 TS2578 로 실패).

### AC-MENTION-007 — 순수성·범위 경계 원문 (HEAD `36ad9b4`)

명령 1 — `grep -nE '(^|[^A-Za-z])(import|require)[ (]' server/src/mention.ts; echo "grep exit: $?"`:

```
grep exit: 1
```

빈 출력 + 종료 코드 `1`. `mention.ts` 는 아무것도 가져오지 않는다(REQ-MENTION-006).

명령 2 — `git rev-parse --verify 32c20e1da4e774219bb055cf9c52eed6b7a42d3e^{commit}`:

```
32c20e1da4e774219bb055cf9c52eed6b7a42d3e
rev-parse exit: 0
```

기준 SHA 가 실제 커밋으로 풀린다 — 3·4번의 전제 성립.

명령 3 — `git diff --name-only 32c20e1da4e774219bb055cf9c52eed6b7a42d3e -- server`:

```
server/src/mention.ts
server/test/mention.test.ts
diff exit: 0
```

정확히 두 줄. (참고: 커밋 전 단계에서 같은 명령을 돌면 신규 파일이 미추적이라 `git diff` 가 이를 보지 못해 빈 출력이 나온다 — 그래서 이 관측은 구현 커밋 후 시점에 확정했다. 빈 출력 상태 그대로 통과 처리했더라면 거짓 통과였을 것이다.)

명령 4 — `git diff --stat 32c20e1da4e774219bb055cf9c52eed6b7a42d3e -- server/src/db.ts server/src/index.ts server/src/auth.ts server/src/config.ts server/src/routes-rooms.ts server/src/routes-bots.ts`:

```
diff-stat exit: 0
```

빈 출력 — 기존 소스 여섯 파일은 한 줄도 바뀌지 않았다.

전체 경계(경로 제한 없음) — `git diff --name-only 32c20e1da4e774219bb055cf9c52eed6b7a42d3e` (HEAD `36ad9b4`):

```
.moai/specs/SPEC-MENTION-001/.spec-base-sha
.moai/specs/SPEC-MENTION-001/progress.md
.moai/specs/SPEC-MENTION-001/spec.md
server/src/mention.ts
server/test/mention.test.ts
exit: 0
```

허용 범위(신규 2파일 + `.moai/specs/SPEC-MENTION-001/` 하위) 외에는 아무것도 없다. `channel/`, `web/`, `scripts/` 하위 생성 파일 0건.

### 테스트 수 변화

| 시점 | 파일 | 테스트 |
|------|------|--------|
| 기준선 (`32c20e1`) | 5 | 37 |
| run 완료 (`36ad9b4`) | 6 | 43 (신규 6) |

### Definition of Done 대조

- [x] AC-MENTION-001~008 전부 통과, 명령 출력 원문 기록 (위 매트릭스·원문 블록)
- [x] `npm test -w server` 종료 코드 `0` (43/43)
- [x] `npm run typecheck -w server` 종료 코드 `0`
- [x] `parseMentions` `✓` 줄 여섯 개 verbose 출력에 모두 관측
- [x] RED-2(스텁 거부) 출력 원문 보존
- [x] `spec_base_sha` 가 §E.1 yaml 과 `.spec-base-sha` 양쪽에 기록
- [x] `git rev-parse --verify "<SHA>^{commit}"` 종료 코드 `0` · 40자리 SHA 출력
- [x] `git diff --name-only <SHA> -- server` 종료 코드 `0` · 정확히 두 줄
- [x] grep 빈 출력 + 종료 코드 `1`
- [x] `channel/`·`web/`·`scripts/` 하위 생성 0건
- [x] 구현 커밋 1개 `feat: @TO/@CC mention parser (card t3)` + 증거 커밋 1개 (본 파일)

### Gaps (미관측)

- **커버리지 수치를 측정하지 않았다.** 이 워크스페이스에 커버리지 도구 배선(vitest coverage provider)이 없고, `acceptance.md` 품질 게이트도 이 SPEC 에 커버리지 명령을 요구하지 않는다. 85% 기준의 기계적 측정값은 없다.
- **verbose 전체 출력(관측 당시 약 45줄)을 그대로 붙이지 않고 관측 대상 줄(`mention.test.ts` `✓` 6줄 + 요약 2줄)만 발췌해 기록했다.** 발췌하지 않은 줄은 전부 이 SPEC 이 손대지 않은 기존 테스트의 `✓` 줄이다.
- **브라우저 자동완성·렌더링 등 UI 표면은 이 SPEC 범위 밖이므로 관측하지 않았다** (§5 — 카드 `t5` 소유).

### Residual-risk (잔여 위험)

- `body` 파라미터를 명시적 `any` 로 바꾸는 변경은 어느 기준도 기계적으로 잡지 못한다 (`acceptance.md` AC-MENTION-006 표에 이미 기록된 공동 수용 항목 — 리뷰로 본다).
- 구현의 `m[1].toLowerCase() as 'to' | 'cc'` 캐스트는 정규식 캡처 그룹이 `TO|CC` 만 잡는다는 사실에 의존한다. 정규식을 느슨하게 바꾸면 캐스트가 오류를 숨길 수 있다 — `plan.md` §C 의 정규식 조각별 대응 표가 이 결합의 이유다.
- 파서는 봇 존재를 검증하지 않는다(설계상). `@TO(없는봇)` 이 그대로 통과하는 것의 거부·안내는 Task 9 메시지 API 가 소유하며, 그 SPEC 이 완결되기 전에는 종단 검증이 없다.
- 컴파일·테스트는 Node 20+ / TypeScript strict / vitest 4.1.11 로 이 워크트리에서만 관측했다. 다른 Node/TS 판에서의 재관측은 하지 않았다.

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-MENTION-001
tier: S
card: t3
milestone: M3
cycle_type: tdd
spec_base_sha: 32c20e1da4e774219bb055cf9c52eed6b7a42d3e
run_commit_sha: 36ad9b43b694f703a8e76efa4381f2e273a4d822
evidence_head_sha: 36ad9b43b694f703a8e76efa4381f2e273a4d822
evidence: .moai/specs/SPEC-MENTION-001/progress.md §E.2 (RED-1·RED-2·GREEN·TYPE 원문 + AC 매트릭스)
files_created:
  - server/src/mention.ts
  - server/test/mention.test.ts
files_touched_outside_new: []        # 기존 소스 0줄 변경 (AC-MENTION-007 명령 4)
test_result: "43 passed / 43 (6 files; 기존 5파일 37테스트 포함, 신규 6)"
typecheck: "exit 0"
boundary: "git diff --name-only <spec_base_sha> -- server → 정확히 2줄"
commits:
  - 36ad9b43b694f703a8e76efa4381f2e273a4d822  # feat: @TO/@CC mention parser (card t3) — 구현+프론트매터 전이
  - d9eb5fd929068562b96a00b4cb39ed9408ea279d  # docs(SPEC-MENTION-001): run-phase 증거 기록 (§E.2·§E.3) — SHA 백필 커밋이 이 줄을 채움
```

---

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-27
sync_commit_sha: "ca8c1a7fcbcada8c50a4fb039a8e95456f1dfc96"
spec_id: SPEC-MENTION-001
card: t3
milestone: M3
worktree: .claude/worktrees/t3 (WT-msg-gateway-relay)
head_at_sync_evidence: "8c4798a"
sync_session: 9d51afd1-8226-4e22-946e-2ed4574a878e
lens: "--security --deep"
docs_updated: [README.md, CHANGELOG.md]
status_transition: "in-progress → implemented → completed (단일 sync 커밋)"
```

### Claim (주장)

`SPEC-MENTION-001` 의 run 단계 산출물이 sync 세션의 **독립 재실행**으로 확인되었다. `parseMentions` 의 테스트 6건이 전부 통과하고 타입 검사가 깨끗하며, 보안 렌즈 검토에서 이 SPEC 범위의 차단 사항이 나오지 않았다.

### Evidence (증거)

sync 세션이 run 세션의 보고를 인용하지 않고 직접 실행해 관측했다. 원문은 `.moai/state/verify/9d51afd1/test-verbose.txt` 에 남겼다.

```
$ npm test -w server -- --run --reporter=verbose
 ✓ test/mention.test.ts > parseMentions > parses a single TO 1ms
 ✓ test/mention.test.ts > parseMentions > parses CC 0ms
 ✓ test/mention.test.ts > parseMentions > parses multiple mentions in order, duplicates kept 0ms
 ✓ test/mention.test.ts > parseMentions > ignores plain @name and non-TO/CC keywords while catching a real mention 0ms
 ✓ test/mention.test.ts > parseMentions > rejects empty and space-containing names while catching a valid one 0ms
 ✓ test/mention.test.ts > parseMentions > korean bot names work 0ms
 Test Files  10 passed (10)
      Tests  98 passed (98)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

### Baseline-attribution (baseline 귀속)

- 측정 트리: 워크트리 `.claude/worktrees/t3`, 분기 `WT-msg-gateway-relay`, HEAD `8c4798a`.
- run 단계 §E.3 은 이 SPEC 시점에서 `43 passed / 43` 을 기록했다. sync 시점 총계 `98` 은 형제 SPEC 4벌(SSE 9·GATEWAY 18·MSG 13·PERM 15)이 그 위에 얹힌 결과이며, `test/mention.test.ts` 자체 건수는 **6 으로 변함이 없다** — run 시점 신규 6건과 일치한다.
- 보안 렌즈: `server/src/mention.ts` 는 순수 함수이고 I/O·네트워크·파일 접근이 없다. 신뢰 경계를 넘지 않으므로 이 SPEC 단독으로는 검토 대상 표면이 없다.

### Gaps (미검증)

- 커버리지 수치는 이번에도 재지 않았다 (`@vitest/coverage-v8` 미설치, 새 의존성 설치 금지). 테스트와 요구사항의 일대일 대조표(§E.2 AC 매트릭스)가 대신이다.
- run 단계에서 관측된 RED → GREEN 전이 원문은 sync 세션이 **재현하지 않았다.** §E.2 의 기록을 그대로 둔다 — sync 가 확인한 것은 최종 GREEN 상태뿐이다.

### Residual-risk (잔여 위험)

- 멘션 문법은 `@TO`/`@CC` 두 키워드에 결합돼 있다. 카드 `t4` 채널 플러그인과 `t5` 웹 UI 자동완성이 같은 문법을 가정하므로, 문법을 바꾸면 세 곳이 함께 움직여야 한다.
- 이 분기는 아직 머지되지 않았다. 워크트리가 유일한 사본이다.

---

## §F Phase 4 Mode Selection

- 입력: tier S / 범위 2개 신규 파일 / 도메인 1 (server) / 언어 TypeScript / 병렬 이득 낮음
- direct: 미선택 — 한 줄 수정이 아닌 신규 코드+테스트 작성
- serial: 선택 — 코딩 중심 구현의 기본값; 형제 SPEC(MENTION→SSE→GATEWAY→MSG→PERM) 순차 의존
- fanout: 미선택 — 단일 도메인 구현 작업 (코딩 병렬성 경고)
- sweep: 미선택 — 30파일 미만, 기계적 일괄 변환 아님

Decision: serial
Implementation Kickoff Approval: 통과 — 리드 디스패치 gate 필드로 운영자 승인 전달됨 (2026-08-27)
기록 시점 HEAD: 32c20e1

---

## §E.5 Sync-audit Response — 감사 FAIL 대응 라운드

sync 단계 독립 감사(`.moai/reports/t3/sync-audit.md`, `--security --deep`)가 **FAIL** 을 냈다
(Security 45/100, 임계 70). 리드가 판정을 채택하고 차단 3건 수정 + 재감사를 지시했다.
그에 따라 `status` 를 `completed` → `in-progress` 로 되돌렸고, §E.4 는 **재감사 PASS 전까지 유효하지 않다.**

### 이 SPEC 에서 바뀐 것

없다. 차단 3건 중 이 SPEC 이 소유한 항목은 없고, `mention.ts` 는 손대지 않았다.
상태를 되돌린 것은 카드 단위 재마감을 위해서다.

### 프로젝트 전역에서 바뀐 것 — F-03 (High)

`server/src/index.ts` 가 `0.0.0.0` 에 바인드했다. README 는 "내 PC에서만 도는 서버"라는 전제 위에서
HTTPS·CSRF·세션 만료·권한 구분을 뺐다고 명시하는데, 코드가 그 전제를 지키지 않았다. 개방 가입과
겹치면 같은 네트워크의 누구나 계정을 만들어 모든 방을 읽고, 쓰고, 봇의 도구 승인까지 할 수 있었다.

수정: `config.host` 를 추가하고 기본을 `127.0.0.1` 로 두었다. 넓히려면 `MINIDISCORD_HOST` 를 명시해야 한다.

### 재실행 결과

```
$ unset MOAI_KANBAN … && npm test -w server -- --run
 Test Files  10 passed (10)
      Tests  100 passed (100)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

진입 98 → 100 (경로 봉인 1건 + 저장 경로 비노출 1건).

### 이 라운드에서 닫지 않은 것

- **비차단 8건(F-04..F-11)** 은 손대지 않았다. 리드가 F-04·F-05 를 별도 백로그 카드로 적립했고
  나머지는 그대로 남는다.
- **방 멤버십 모델**은 여전히 없다. F-03 수정은 그 부재가 기대는 전제(루프백 전용)를 코드로 되돌린
  것이지, 인가를 넣은 것이 아니다.
- **spec.md 본문에 새 요구사항 항목을 추가하지 않았다.** 출처 경로 봉인은 감사 대응으로 들어간
  코드이고 `spec.md` 본문은 manager-spec 소유라, 요구사항 번호 부여는 후속 몫으로 남긴다 —
  현재 근거는 이 §E.5 와 감사 보고서다.
- **재감사를 아직 받지 않았다.** 이 절을 쓰는 시점에 판정은 여전히 FAIL 이다.

---

## §E.6 Re-audit Response — 재감사 CONDITIONAL PASS 대응

재감사(`.moai/reports/t3/sync-reaudit.md`, HEAD `2a3c0fc`)가 **CONDITIONAL PASS** 를 냈다
(가중 조화평균 74.8, 직전 66.8; Functionality 74 / Security 72 / Craft 78 / Consistency 78, 임계 70·70·60·60).
직전 차단 3건 중 F-01·F-03 은 CLOSED, F-02 는 **PARTIALLY CLOSED** 판정이었다.

새 지적 6건(N-01..N-06) 중 5건을 이 라운드에서 닫았다.

| # | 내용 | 처리 |
|---|------|------|
| N-01 | 봇 첨부 메시지의 SSE 발행 프레임이 `stored_path` 를 그대로 내보냄 (`gateway.ts:166`) | 닫음 — SELECT 를 `id, filename` 으로 축소 |
| N-02 | `resolve()` 는 어휘적 정규화라 심볼릭 링크를 따라가지 않는데 `copyFileSync` 는 따라감 → 뿌리 안 링크로 바깥 내용을 끌어옴 | 닫음 — 뿌리와 출처 양쪽을 `realpathSync` 로 비교 |
| N-03 | fail-closed 기본값이 아무 신호 없이 봇 첨부를 끔 | 닫음 — 기동 시 `console.warn` 한 줄 |
| N-04 | `SPEC-CORE-001` REQ-CORE-010 이 여전히 `0.0.0.0` 을 요구 (status 도 `completed`) | **닫지 않음 — 리드 판정 대기.** SPEC 본문 개정은 manager-spec 소유이며 이 카드 범위 밖이다 |
| N-05 | README 한 문장이 코드보다 넓게 약속 | 닫음 — N-01 수정으로 참이 되었고, SSE·봇 프레임의 비대칭을 문장에 명시 |
| N-06 | `2a3c0fc` 이 `.moai/specs/.moai/state/` 잔여물 3개를 **추적 대상으로** 만듦 | 닫음 — `git rm --cached` + `.gitignore` 에 `**/.moai/state/` (루트 `.moai/state/` 는 예외) |

**N-01 은 직전 감사가 이름 붙인 결함 부류가 같은 카드 안에서 재생산된 것이다.** F-02 를 고치면서
`routes-messages.ts` 의 HTTP 응답 두 곳만 보고 `gateway.ts` 의 허브 발행 프레임을 놓쳤다 —
"한 파일 안에서 봉인을 확인하면 그 파일의 입구만 확인된다"는 지적을 읽고도 같은 모양으로 반복했다.
`attachments` 표를 읽어 밖으로 내보내는 자리를 전수 조사하는 것이 옳은 검사였다.

### 재실행 결과

```
$ unset MOAI_KANBAN … && npm test -w server -- --run
      Tests  102 passed (102)
exit=0

$ npm run typecheck -w server
> tsc --noEmit
exit=0
```

98 → 102. 새 테스트 2건(`AC-GW-023` 심볼릭 링크, `AC-GW-024` 허브 프레임)은 **수정을 되돌려
실패하는 것까지 관측했다.**

```
# realpathSync → resolve 로 되돌린 상태
AssertionError: expected [ '겉보기정상.txt', '진짜.txt' ] to deeply equal [ '진짜.txt' ]
# 허브 SELECT 에 stored_path 를 되돌린 상태
AssertionError: expected { id: 1, filename: '첨부.txt', …(1) } to not have property "stored_path"
      Tests  1 failed | 101 skipped (102)
```

### 이 라운드에서 닫지 않은 것

- **N-04 (SPEC-CORE-001 REQ-CORE-010)** — 리드 판정 대기. 코드가 이제 그 요구사항을 위반한다.
- **비차단 F-04..F-11** — 리드가 F-04·F-05 를 별도 백로그 카드로 적립했고 나머지는 그대로다.
- **세 번째 재감사를 받지 않았다.** 이 절을 쓰는 시점의 최신 판정은 CONDITIONAL PASS 이며,
  그 판정이 관측한 트리에는 위 5건의 수정이 아직 들어 있지 않다.
