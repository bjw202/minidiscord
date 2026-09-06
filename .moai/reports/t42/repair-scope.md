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
