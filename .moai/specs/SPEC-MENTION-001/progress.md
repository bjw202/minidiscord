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
| 현재 상태 | `draft` — plan 단계 완료 (§E.1 audit-ready) |

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
spec_base_sha: "<run 단계 0단계에서 채운다>"
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

_&lt;pending run-phase&gt;_

---

## §E.3 Run-phase Audit-Ready Signal

_&lt;pending run-phase&gt;_

---

## §E.4 Sync-phase Audit-Ready Signal

_&lt;pending sync-phase&gt;_
