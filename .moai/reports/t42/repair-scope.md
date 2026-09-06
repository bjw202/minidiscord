# t42 — 수리 회차 1차 보고: 동결 주장 관측 결과와 SPEC 규모 판단

- 카드: t42 (감사 4차원 루브릭의 채점 공백) — **수리 회차, 착수 전 보고**
- 나무: `.claude/worktrees/t42`, 브랜치 `WT-audit-rubric`
- 귀속 SHA: **`94e7e9b`** (= 앞 회차 `97b403c` + `origin/main` `20c7177` 병합)
- 이 회차에 `.claude/` 아래 수정: **아직 0건.** 리드가 「SPEC 규모인지부터 판단해 보고」라고 지시했으므로 판단을 내기 전까지 편집을 보류했습니다
- 신규 파일: 이 보고서와 `evidence/coupling.js` · `evidence/coupling.out` 뿐

---

## 0. 쉬운 말 요약

리드가 제안한 관측 — 「`sync-audit-4dim.js` 의 목록에 다섯째 차원 이름을 넣어 보면 강제 여부가 갈린다」 — 을 실제로 재 봤더니, **그 실험은 묻고자 한 것을 가르지 못합니다.** 이름 목록만 늘리면 스크립트가 바깥의 어떤 강제 때문이 아니라 **자기 안의 배열 두 개가 어긋나서** 먼저 깨집니다. 그대로 돌렸다면 「무언가가 넷을 강제한다」는 거짓 결론이 나왔을 자리입니다.

대신 그 어긋남을 에이전트 없이 node 로 직접 재서, 진짜 제약이 무엇인지 확정했습니다. 차원 넷을 묶는 것은 헌법도 Go 도 아니고, **한 파일 안에 손으로 쓰인 세 자리**입니다. 그리고 그 파일은 템플릿이 관리해서 `moai update` 가 덮어씁니다 — 즉 「다섯째 차원 신설」을 코드로 하는 길은 이 저장소에서 오래 못 갑니다.

`sync-auditor.md` 의 동결 인용은 **한 문장 건너뛴 인용**이었습니다. 같은 절 L42 의 「필수 통과 방화벽이 동결」은 인용처와 맞고, 네 줄 아래 L46 의 「차원 목록이 동결」은 맞지 않습니다.

그리고 앞 회차 보고서의 표현 하나를 좁혀야 합니다: 「점수도 차단도 없다」는 여섯 줄이 **판정에 전혀 닿지 않는다**는 뜻은 아닙니다. 규약은 blocking 분류에 「판정을 다시 보기 전에 고친다」는 경로를 줍니다 — 점수를 못 움직일 뿐 재작업은 시킵니다.

SPEC 은 필요 없다고 봅니다(§4).

---

## 1. 관측 M-1 — 리드가 제안한 실험은 판별력이 없다

### 무엇을 물었나

`sync-auditor.md:46` 은 차원 목록이 「FROZEN」이라고 적습니다. 앞 회차가 헌법·Go 바이너리·프로파일 로더에서 강제의 증거를 찾지 못했고, 남은 물음은 「그래도 어딘가 강제가 있는가」였습니다. 리드의 제안은 다섯째 이름을 실제로 넣어 보는 것이었습니다.

### 왜 그 실험이 갈라 주지 못하는가

스크립트를 읽으면 판정자 호출이 이름 목록에서 생성되지 않습니다. **손으로 쓴 네 개짜리 배열 리터럴**입니다.

```
.claude/workflows/sync-audit-4dim.js:67   const DIMENSIONS = ['Functionality', 'Security', 'Craft', 'Consistency']
.claude/workflows/sync-audit-4dim.js:105        enum: ['Functionality', 'Security', 'Craft', 'Consistency'],
.claude/workflows/sync-audit-4dim.js:187  const judges = await parallel([      ← 아래 네 줄이 손으로 쓰인 리터럴
.claude/workflows/sync-audit-4dim.js:175  Dimension focus for "${dimension}":  ← 프롬프트 안 네 줄 설명 목록
```

`DIMENSIONS` 는 판정자를 만드는 데 쓰이지 않고, 결과를 **번호로 맞춰 읽는 데만** 쓰입니다(`judges[i]` ↔ `DIMENSIONS[i]`). 그래서 이름만 다섯 개로 늘리면 다섯째 자리의 판정자가 `undefined` 가 되고, 스크립트 자신의 결측 가드가 `INCOMPLETE` 를 냅니다.

### 실측 (에이전트 0개)

판정 블록(L207–232)을 축자로 떼어 내 대조군과 함께 돌렸습니다.

```
$ node .moai/reports/t42/evidence/coupling.js
control  (4 dims, 4 judges): {"verdict":"PASS","harmonic_mean":0.8999999999999999}
mutation (5 dims, 4 judges): {"verdict":"INCOMPLETE","missing":["Rigor"]}
repaired (5 dims, 5 judges): {"verdict":"PASS","harmonic_mean":0.9}
```

세 줄이 함께 있어야 읽힙니다. 대조군이 PASS 이므로 발판은 정상이고, 변이가 INCOMPLETE 인 것은 **다섯째 이름 때문이 아니라 다섯째 판정자가 없기 때문**이며, 판정자를 같이 넣으면(세 번째 줄) 다섯 차원으로 아무 저항 없이 PASS 가 납니다.

**즉 강제는 없습니다.** 있는 것은 한 파일 안 세 자리(+프롬프트 설명 목록)의 손 맞춤입니다. 넷을 지키는 것은 규약이 아니라 **결합**입니다.

증거 파일: `.moai/reports/t42/evidence/coupling.js` · `coupling.out`.

### 새로 걸린 제약 — 그 파일은 여기서 못 고친다

```
.claude/rules/moai/workflow/dynamic-workflows.md:115
  "plan-research-fanout.js, sync-audit-4dim.js, and codemaps-extract.js ship with the
   template and are template-managed. moai update overwrites their local copies, so a
   local edit to one of them is lost on the next update; edit the template source instead."
```

이 저장소에는 템플릿 원본이 없습니다(상류 MoAI-ADK). 따라서 **「다섯째 차원 신설」을 이 카드에서 코드로 착지시키는 길은 없습니다** — 넣어도 다음 `moai update` 가 지웁니다. 수리 선택지 셋 중 하나가 이 관측으로 탈락합니다.

---

## 2. 동결 인용의 확정 — 한 문장 건너뛴 인용

같은 절에 FROZEN 이 두 번 나오고, 둘의 처지가 다릅니다.

| 자리 | 주장 | 인용처 원문이 뒷받침하는가 |
|---|---|---|
| `sync-auditor.md:42` | **필수 통과 방화벽**이 동결 | **예.** `constitution.md:366` §12 Mechanism 3 = "Must-Pass Firewall … This is FROZEN and cannot be evolved" |
| `sync-auditor.md:46` | **차원 목록(enum)** 이 동결 | **아니오.** 같은 절이 차원 목록을 말하지 않음 |

인용 자체가 틀린 게 아니라 **인용이 네 줄 아래 다른 주장까지 따라간 것**입니다. 그리고 L46 은 스스로 반대 증거를 담고 있습니다 — "a non-canonical dimension name in a profile is loaded best-effort (**unknown dims skipped**)". 건너뛰기는 거부가 아니므로, 같은 문장이 「동결」과 「관대한 로딩」을 함께 주장합니다.

수리안(작성 전, 리드 확인용):

> 현행: The dimension enum is FROZEN (design-constitution §12 Mechanism 3) at exactly `Functionality`, `Security`, `Craft`, `Consistency`; …
>
> 수리: The four dimension names are not frozen by the design constitution — §12 Mechanism 3 freezes the must-pass firewall (L42), not the dimension set. They are pinned by coupling instead: `.claude/workflows/sync-audit-4dim.js` hardcodes them at three sites (`DIMENSIONS` L67, the judge schema `enum` L105, and the hand-written four-thunk `judges` literal L187) plus the judge-prompt focus list (L175). Changing the set means changing all four sites together — and that file is template-managed, so a local edit is overwritten by `moai update`. A non-canonical dimension name in a profile is loaded best-effort (unknown dims skipped).

---

## 3. 앞 회차 표현 하나를 좁힙니다 — 「차단도 없다」의 뜻

앞 회차 §3.2 는 RQ-3 · RQ-4 · AC-1 · CN-1 · CN-2 · CN-3 여섯을 「점수도 차단도 없다」로 적었습니다. 점수 쪽은 맞습니다. 차단 쪽은 **판정을 기계적으로 움직이지 못한다**까지가 정확하고, 「아무 결과가 없다」는 아닙니다. `plan-auditor.md` M6 원문:

- `plan-auditor.md:160` — "blocking findings are **fixed before the verdict is revisited**; optional findings are surfaced and left to the orchestrator's discretion."
- `plan-auditor.md:162` — "The verdict remains **anchored to the M5 must-pass firewall and the rubric scores**."

두 줄을 함께 읽으면: blocking 분류는 **재작업을 시키는 경로는 갖고 점수를 움직이는 경로는 갖지 않습니다.** 그래서 여섯 줄은 「죽은 검사」가 아니라 「판정 산술 밖에서 도는 검사」입니다.

이 구분이 수리 선택을 바꿉니다. 「차단 전용이라고 명시한다」는 안이 공허하지 않고, **이미 사실인 것을 처음으로 적는 일**이 됩니다.

---

## 4. SPEC 규모 판단 — 필요 없다고 봅니다

카드는 C급(설계 변경)으로 올라왔습니다. 조사가 끝난 지금 남은 일의 모양은 이렇습니다.

| 일 | 성격 | 대상 |
|---|---|---|
| 1. 동결 인용 정정 | 사실 정정 | `sync-auditor.md` 한 문단 |
| 2. 간극 여덟을 명시 | 설계 의도 기록 | `plan-auditor.md` 한 절 신설 |
| 3. 계정 넷 정리(죽은 표 표시) | 사실 정정 | `evaluator-profiles/default.md` 한 절 |
| 4. 집계식 자리 가리키기 | 상호참조 추가 | `plan-auditor.md` 한 줄 |

**SPEC 이 필요 없다고 보는 근거 셋:**

1. **코드 변경이 0줄입니다.** §1 이 재서 확정했듯 유일한 코드 자리(`sync-audit-4dim.js`)는 템플릿 관리라 이 저장소에서 고칠 수 없습니다. 남는 것은 전부 harness 문서입니다.
2. **수용 기준을 걸 대상이 없습니다.** 네 일 모두 「문서가 사실과 맞는가」이고, 그 판정은 `grep` 한 줄로 끝납니다. 시험이 붙을 동작이 생기지 않으므로 acceptance.md 가 셀 것이 없습니다.
3. **설계 결정 하나는 운영자 처분과 §3 이 이미 좁혀 놨습니다.** 남은 선택은 「blocking 전용임을 적는다」이고, 이는 새 동작을 만드는 게 아니라 **현재 동작을 처음으로 문서화**하는 일입니다.

다만 A급(직접 종결)도 아닙니다 — 파일이 셋이고 §3 의 판단이 하나 들어갑니다. **B급 모양의 문서 수리**로 보고, 근거를 수리 자체에 남기고 이 보고서로 궤적을 잇는 것이 맞다고 봅니다.

---

## 5. 리드 확인이 필요한 자리 하나

§4 대로 진행하면 2번 항목에서 제가 이렇게 적게 됩니다:

> 이 여섯 검사(RQ-3 · RQ-4 · AC-1 · CN-1 · CN-2 · CN-3)와 사실 정확성은 루브릭 점수 칸을 갖지 않는다. 이는 누락이 아니라 설계다: 이들은 M6 blocking 분류로 흘러 재작업을 강제하되, 판정 산술(M5 필수 통과 + 루브릭 점수)에는 들어가지 않는다. 과대주장을 명료성 점수에서 깎지 않는 것과 같은 이유다 — 명료함과 참임은 다른 술어이고, 하나를 다른 하나의 점수로 대신 재면 둘 다 흐려진다.

이것은 **「지금 이런 상태다」를 적는 문장이자 「앞으로도 이렇게 둔다」는 선언**입니다. 뒤쪽이 리드/운영자 처분 자리라고 봅니다. 반대 방향(여섯을 필수 통과로 올려 판정을 실제로 움직이게 함)은 감사 게이트의 동작 변경이라 제 재량 밖으로 읽었습니다.

**질문은 하나입니다: 위 문장을 「설계로 확정」으로 적어도 되는지, 아니면 「현재 상태 기술 + 미결 표시」로 적어야 하는지.** 어느 쪽이든 나머지 세 항목은 영향받지 않습니다.

---

## 6. 미검증으로 남는 것

1. **상류 MoAI-ADK 템플릿 원본을 열람하지 못했습니다.** §1 의 「템플릿이 덮는다」는 `dynamic-workflows.md:115` 의 진술을 근거로 하며, 실제 덮어쓰기를 재현하지 않았습니다(`moai update` 미실행 — 나무를 오염시킵니다).
2. **Go 측 강제의 부재는 여전히 「증거를 찾지 못함」입니다.** 앞 회차 §5.1 의 방법적 한계가 그대로 남습니다. 이번 회차는 그 축을 다시 재지 않았습니다.
3. **`sync-audit-4dim.js` 를 실제로 실행하지 않았습니다.** §1 의 실측은 판정 블록을 축자로 떼어 낸 재현이며, 워크플로 런타임의 스키마 검증 동작은 재지 않았습니다. 따라서 「런타임이 다섯째 이름을 거부하지 않는다」는 세우지 **않습니다** — 세운 것은 「스크립트 자신의 산술이 판정자 배열 길이에서 먼저 깨진다」입니다.
4. **t40 의 실제 차단 경로(과대주장이 두 번 차단된 길)는 이번에도 열지 않았습니다.** `20c7177` 에서 읽을 수 있게 됐지만 §1~§3 의 결론이 그것에 의존하지 않아 미룹니다.

---

## 7. 회차 규율 확인

- `.claude/` 아래 수정: **0건** (`git status --short` 에 `.claude/` 경로 없음)
- 배경 부하 프로세스: 없음. 실행한 것은 `node` 한 번(즉시 종료)과 읽기 명령들
- 남의 관측 인용: `dynamic-workflows.md:115` 는 원문 축자 인용이고, 그 진술의 재현은 §6-1 에 미검증으로 적었습니다
- 계수: 이 보고서는 훑기 범위(`.claude/`) 밖에 있으므로 자기 계수 문제 없음. 그래도 §1 의 자리 수는 값이 아니라 `grep` 앵커로 적었습니다

---

## 8. 리드 지시 재측정 — 「내 산출물도 날아가는가」

리드가 착수 전에 재라고 한 물음입니다. **재 봤고, 위험이 실재합니다.** 그리고 살아남는 자리도 찾았습니다.

### 8.1 표적 넷은 전부 템플릿 관리입니다

`.moai/manifest.json`(`version 3.1.2`, `deployed_at 2026-08-26`)에 네 표적이 모두 등재돼 있고 provenance 가 같습니다.

```
$ jq -r --arg f "<path>" '.files[$f].provenance' .moai/manifest.json
.claude/agents/moai/sync-auditor.md            → template_managed
.claude/agents/moai/plan-auditor.md            → template_managed
.moai/config/evaluator-profiles/default.md     → template_managed
.claude/rules/moai/core/agent-common-protocol.md → template_managed
```

매니페스트 전체에 다른 provenance 값이 **없습니다**:

```
$ jq -r '.files | to_entries[] | .value.provenance' .moai/manifest.json | sort | uniq -c
   466 template_managed
```

그리고 규약이 두 자리에서 이 영역을 얼립니다:

- `.claude/rules/moai/development/skill-authoring.md:364` **[HARD]** — "The `moai-*` namespace (all prefixes) is template-distributed. If the user modifies it directly, the next `moai update` **overwrites it — user customizations are lost**."
- `.claude/skills/moai/workflows/harness.md:185` — "`.claude/agents/moai/` (template-managed agents are **FROZEN**; `.claude/agents/harness/` is a user-owned allowed-write target, NOT frozen)"

`moai update` 는 실재합니다(`moai update --help`, rc=0) — 최상위 도움말 목록에는 안 보이지만 명령은 있습니다.

**즉 리드의 우려가 맞습니다.** 1·3·4번 항목을 그 파일들 안에 적으면 다음 `moai update` 에 사라집니다. 더 나쁜 것은 **조용히** 사라진다는 점입니다 — 되돌아온 파일은 다시 「FROZEN (design-constitution §12 Mechanism 3)」이라고 적혀 있고, 그것이 틀렸다는 기록은 남지 않습니다.

### 8.2 이 저장소는 실제로 그 영역을 거의 안 건드렸습니다

매니페스트 등재분 전부를 디스크와 대조했습니다.

```
$ jq -r '.files | to_entries[] | .key' .moai/manifest.json > /tmp/mf.txt
$ while IFS= read -r f; do [ -f "$f" ] || continue
    real=$(shasum -a 256 "$f" | awk '{print $1}')
    rec=$(jq -r --arg f "$f" '.files[$f].current_hash' .moai/manifest.json | sed 's/^sha256://')
    [ "$real" = "$rec" ] || echo "$f"
  done < /tmp/mf.txt
```
→ HEAD `8cc8207` 시점에 어긋난 것 여덟, 없는 것 넷, 나머지는 일치.

어긋난 여덟 중 일곱은 `.moai/config/sections/*.yaml` 여섯과 `.gitignore` — 프로젝트 설정이라 원래 사용자가 정하는 자리입니다. **문서는 정확히 하나뿐입니다:**

```
.claude/rules/moai/workflow/spec-workflow.md   ← card t37 (aef8108) 이 고침
```

그리고 `.claude/agents/moai/` 아래는 **한 건도 어긋나 있지 않습니다.** 제 편집이 첫 표류가 됩니다.

> 이 계수는 시점에 귀속됩니다(HEAD `8cc8207`). 제가 파일을 하나라도 더하면 값이 바뀌므로, 판정에 쓸 때는 위 명령을 다시 돌리십시오.

### 8.3 살아남는 자리 — 매니페스트 밖에 사는 것들

`.claude/` 아래 파일 중 매니페스트에 없는 것을 뽑았습니다(= `moai update` 가 덮을 대상이 아예 없는 것).

```
$ find .claude -type f \( -name '*.md' -o -name '*.js' -o -name '*.sh' -o -name '*.json' \) \
    | sed 's|^\./||' | sort | comm -23 - <(jq -r '.files|keys[]' .moai/manifest.json | sort)
```

`.claude/agent-memory/**` 를 뺀 나머지는 둘뿐입니다:

```
.claude/rules/moai/workflow/completed-spec-semantics.md
.claude/settings.local.json
```

**첫 줄이 이 카드가 찾던 선례입니다.** card t37 이 `aef8108` 에서 **새 규약 파일을 신설**했고, 그 파일은 매니페스트에 없으므로 `moai update` 가 덮을 것이 없습니다. 즉 **기존 템플릿 문서를 고치는 것은 날아가지만, 새 규약 파일을 더하는 것은 남습니다.** 그 파일은 frontmatter 에 `paths: ".moai/specs/**"` 를 달아 SPEC 산출물을 읽을 때만 적재되게 해 뒀습니다.

두 번째 자리는 **감사관 자신의 기억**입니다. 두 감사관 모두 frontmatter 에 `memory: project` 를 선언합니다(`plan-auditor.md:12`, `sync-auditor.md:14`), 그리고 그 저장 위치는 `agent-authoring.md:123` 이 `.claude/agent-memory/<name>/` 로 못박습니다 — 매니페스트 밖이고, 이 저장소가 이미 `plan-auditor/`·`manager-spec/` 밑을 쓰고 있습니다.

### 8.4 그래서 어디에 적어야 하는가 — 제안

| 항목 | 원래 적으려던 자리 | 그러면 | 제안하는 자리 |
|---|---|---|---|
| 1. 동결 인용 정정 | `sync-auditor.md` 본문 | **날아감(조용히)** | 새 규약 파일 + `agent-memory/sync-auditor/` |
| 2. 간극 여덟 명시(처분 19 형태) | `plan-auditor.md` 새 절 | **날아감** | 새 규약 파일 + `agent-memory/plan-auditor/` |
| 3. 계정 넷 정리 | `evaluator-profiles/default.md` | **날아감** | 새 규약 파일 |
| 4. 집계식 자리 가리키기 | `plan-auditor.md` 한 줄 | **날아감** | 새 규약 파일 |

즉 **네 항목이 하나의 새 규약 파일로 모입니다.** 형태는 t37 선례를 그대로 따릅니다 — `.claude/rules/moai/` 아래 새 파일, `paths:` 로 감사 표면에 한정, 머리말에 출처와 근거 커밋을 적음.

그리고 정정 자체가 **감사관이 일할 때 손에 들려 있어야** 하므로, 두 감사관의 `agent-memory` 에 각각 한 장씩 남깁니다. 규약 파일은 「무엇이 사실인가」를 세우고, 기억 파일은 「이 감사관이 이 문장을 만나면 이렇게 읽어라」를 세웁니다.

**템플릿 원본 쪽 수리는 이 저장소에서 못 합니다.** 대신 보고서가 상류에 낼 수 있는 형태로 자리를 적어 둡니다 — `sync-auditor.md:46` 한 문장, `plan-auditor.md` 한 절, `default.md` L79-L90 한 표.

### 8.5 이 절이 세우지 못한 것 (미검증)

1. **`moai update` 를 실제로 돌려 덮어쓰기를 재현하지 않았습니다.** 근거는 규약 두 자리(하나는 [HARD])와 매니페스트의 provenance 단일값입니다. **이 나무가 미푸시 유일 사본이라, 파일을 만지는 도구를 여기서 돌리지 않았습니다.**
2. **`--dry-run --templates-only` 도 돌리지 않았습니다.** 플래그가 "without modifying the filesystem" 이라고 적지만 그 진술 자체가 미검증이고, 유일 사본에서 시험할 만한 가치보다 위험이 큽니다. 안전한 사본이 있으면 이것이 8.5-1 을 닫는 관측입니다.
3. **덮어쓰기인지 3방향 병합인지 확정하지 못했습니다.** `moai update --verbose` 도움말은 "3-way merge fallback notices" 를 언급하고 `constitution.md:94` 는 「user file is preserved」 경로를 적는 반면, `skill-authoring.md:364` 는 「overwrites … lost」라고 [HARD] 로 적습니다. **두 진술이 겹치는 자리를 규명하지 못했습니다.** 제 제안은 더 나쁜 쪽(덮어쓰기)을 가정합니다 — 병합이더라도 새 파일을 쓰는 쪽이 손해가 없기 때문입니다.
4. **새 규약 파일이 감사관에게 실제로 적재되는지 재현하지 않았습니다.** 근거는 t37 선례와 `paths:` 규약이며, 적재를 관측하지는 않았습니다.

---

## 9. 착지 — 처분 21·22 집행 결과

### 9.1 방향을 튼 핵심 근거 (리드 지시로 눈에 띄게 적음)

이 카드는 원래 `plan-auditor.md` · `sync-auditor.md` · `default.md` 본문을 고칠 계획이었습니다. 그것을 그만둔 근거는 **한 문장으로 서는 관측**입니다:

> **`.claude/agents/moai/` 아래는 이 저장소에서 한 건도 어긋나 있지 않고, 제 편집이 첫 표류가 됩니다.**

매니페스트 등재분 전부를 디스크 해시와 대조했을 때 어긋난 것은 여덟이고, 그중 일곱은 `.moai/config/sections/*.yaml` 여섯 + `.gitignore` — 원래 사용자가 정하는 자리입니다. **문서는 정확히 하나뿐입니다:** `.claude/rules/moai/workflow/spec-workflow.md`(card t37 `aef8108`).

즉 이 저장소는 템플릿 관리 문서를 사실상 건드리지 않고 살아 왔고, 감사관 정의 파일은 완전히 원본 그대로입니다. 그 영역에 첫 표류를 만들면서 **되돌아올 때 조용히 사라질 정정**을 심는 것이 이 카드가 피한 결과입니다.

계수는 HEAD 귀속입니다. 그리고 이 회차가 `.claude/` 아래에 파일을 더했으므로 **값을 그대로 인용하지 말고 명령을 다시 돌리십시오**:

```
$ jq -r '.files | to_entries[] | .key' .moai/manifest.json > /tmp/mf.txt
$ while IFS= read -r f; do [ -f "$f" ] || continue
    real=$(shasum -a 256 "$f" | awk '{print $1}')
    rec=$(jq -r --arg f "$f" '.files[$f].current_hash' .moai/manifest.json | sed 's/^sha256://')
    [ "$real" = "$rec" ] || echo "$f"
  done < /tmp/mf.txt
```

### 9.2 착지한 것 셋

| 산출물 | 무엇이 들어갔나 |
|---|---|
| `.claude/rules/moai/core/audit-rubric-scope.md` (신규) | 항목 1·2·3·4 전부. §1 계정 넷 · §2 동결 인용 반증 + 결합 실측 · §3 집계식 자리 · §4 점수 칸 없는 여덟을 (a)관측/(b)미결/(c)대조 로 나눠 적음 · §5 상류 자리 셋 · §6 열린 미검증 셋 |
| `.claude/agent-memory/plan-auditor/rubric-has-no-cell-for-factual-accuracy.md` (신규) | 과대주장을 Clarity 에서 깎지 말 것 + 여덟의 (a)(b)(c) + 조화평균 + 죽은 표 |
| `.claude/agent-memory/sync-auditor/frozen-citation-followed-the-wrong-claim.md` (신규) | 동결 인용 반증 + 「이름만 늘려 보는」 변이가 판별력 없다는 함정 |

각 디렉터리의 `MEMORY.md` 에 색인 한 줄씩 더했습니다.

**규약 파일은 `paths: ".moai/specs/**,.moai/reports/**"` 로 한정했습니다** — 감사가 SPEC 산출물이나 감사 보고서를 읽고 쓸 때만 적재되고, 항상 적재되는 표면에는 들어가지 않습니다. t37 선례와 같은 형태입니다.

### 9.3 템플릿 관리 파일을 하나도 안 건드렸음 — 실측

```
$ git status --short
 M .claude/agent-memory/plan-auditor/MEMORY.md
 M .claude/agent-memory/sync-auditor/MEMORY.md
?? .claude/agent-memory/plan-auditor/rubric-has-no-cell-for-factual-accuracy.md
?? .claude/agent-memory/sync-auditor/frozen-citation-followed-the-wrong-claim.md
?? .claude/rules/moai/core/audit-rubric-scope.md
```
다섯 자리 각각을 매니페스트에 조회한 결과 **전부 `absent`** 입니다 — `moai update` 가 덮을 대상이 없습니다.

인용 앵커는 전수 검사했습니다. 규약 파일이 쓰는 앵커 20개를 `grep -cF` 로 대조해 전부 1건 이상(`never be silently absorbed…` 만 2건 — MP-5·MP-6 둘)을 확인했고, **하나가 틀려 고쳤습니다**: `M3 Rubric Anchoring` → 실제 제목은 `M3: Rubric Anchoring`. 줄 번호 대신 앵커로 인용한 이유는 템플릿이 갱신되면 줄이 밀리기 때문입니다.

### 9.4 상류에 낼 자리 (여기서 고치지 않음 — 적기만 함)

| 자리 | 무엇을 |
|---|---|
| `sync-auditor.md` § Scoring Model (앵커: "The dimension enum is FROZEN") | 차원 목록 동결 주장 한 문장 |
| `plan-auditor.md` | 집계식 자리를 가리키는 한 줄 + 점수 칸 없는 여덟을 적는 한 절 |
| `default.md` § D7/D8 Plan-Phase Dimensions | 죽은 표 한 개 |

### 9.5 부수 관측 — agent-memory 형식이 규약과 어긋납니다 (수리 안 함)

`moai-memory.md` § Agent Memory Taxonomy 는 frontmatter 를 평평한 `type:` 으로 적으라 하고, CLAUDE.md §9 는 memory 파일을 항상 영어로 쓰라고 합니다. **그런데 이 저장소의 실제 관행은 둘 다 다릅니다:**

```
$ grep -l "^metadata:" .claude/agent-memory/*/*.md | wc -l              → 중첩 metadata: 형태
$ grep -lE "^type: (user|feedback|project|reference)" .claude/agent-memory/*/*.md | wc -l  → 평평한 type: 형태
$ grep -lP '[\x{AC00}-\x{D7A3}]' .claude/agent-memory/plan-auditor/*.md | wc -l           → 한글 포함
```
(HEAD 귀속 — 제가 파일을 더했으므로 값 대신 명령을 남깁니다. 측정 시점에 중첩 형태가 다수였고 한국어가 관행이었습니다.)

**형제를 따랐습니다** — 중첩 `metadata:` + 한국어. 디렉터리 안의 일관성이 제 선호보다 우선하고, 세 번째 형태를 새로 만들면 관행이 더 갈라집니다. 감사 훅은 비차단 경고만 낸다고 `moai-memory.md` 가 적습니다. **이 어긋남 자체는 이 카드 범위 밖이고 `moai-memory.md` 는 템플릿 관리이므로 고치지 않았습니다** — 관측으로만 남깁니다.

### 9.6 열린 채로 두는 미검증 (처분 22 — 지금 닫지 않음)

1. **`moai update` 를 실제로 돌려 덮어쓰기를 재현하지 않았습니다.**
2. **`--dry-run --templates-only` 도 돌리지 않았습니다.** 검사 대상이 「dry-run 이 정말 아무것도 안 건드리는가」인데 그것을 확인하려고 dry-run 을 돌리는 것은 순환이고, 이 도구는 `~/.claude` 같은 워크트리 밖 공유 자리까지 쓸 수 있어 버리는 나무를 만들어도 격리가 서지 않습니다.
3. **덮어쓰기인지 3방향 병합인지 확정하지 못했습니다.** `moai update --verbose` 도움말의 "3-way merge fallback notices" 와 `constitution.md` 의 「user file is preserved」 경로가, `skill-authoring.md` [HARD] 의 「overwrites … lost」와 겹치는 자리를 규명하지 못했습니다.

**1·2·3 을 닫는 경로:** 이 저장소 **밖 별도 클론**에서 template_managed 파일에 로컬 편집을 넣고 `moai update` 를 실제로 돌려 결과를 관측하는 것. 이 나무에서는 돌리지 않습니다.

**이 미검증이 결론을 바꾸지 않는 이유:** 병합이든 덮어쓰기든 **새 파일을 쓰는 쪽은 손해가 없습니다.** 더 나쁜 쪽을 가정한 설계이므로, 실제가 더 관대하더라도 이 회차의 산출물은 그대로 유효합니다.

4. **새 규약 파일이 감사관에게 실제로 적재되는지 관측하지 않았습니다.** 근거는 t37 선례(`completed-spec-semantics.md` 가 같은 형태로 살아 있음)와 `paths:` 규약입니다.
