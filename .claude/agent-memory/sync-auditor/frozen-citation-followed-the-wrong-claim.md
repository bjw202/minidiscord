---
name: frozen-citation-followed-the-wrong-claim
description: 「차원 enum 은 헌법이 동결한다」는 자기 문서의 주장은 인용처가 뒷받침하지 않는다 — 헌법이 얼리는 것은 필수 통과 방화벽뿐이고, 넷을 지키는 것은 동결이 아니라 한 스크립트 안의 결합이다
metadata:
  type: feedback
---

`sync-auditor.md` § Scoring Model 의 「The dimension enum is FROZEN (design-constitution §12 Mechanism 3)」은 **인용처가 뒷받침하지 않는다.** `constitution.md` §12 Mechanism 3(앵커: "### Mechanism 3: Must-Pass Firewall")이 얼리는 것은 **필수 통과 방화벽**이며(앵커: "This is FROZEN and cannot be evolved"), 차원 목록을 말하지 않는다. 두 차원 이름은 그 문서에 아예 없다 — `grep -c "Craft"` → 0, `grep -c "Security"` → 0.

**같은 절의 FROZEN 두 개는 처지가 다르다.** 앞의 것(앵커: "HARD must-pass firewall (FROZEN")은 방화벽을 얼리며 인용처와 **맞는다**. 뒤의 것이 주어를 차원 목록으로 바꾸면서 같은 인용을 그대로 가져갔다. 인용이 틀린 게 아니라 **인용이 네 줄 아래 다른 주장까지 따라간 것**이다.

그리고 그 문장은 스스로 반대 증거를 담고 있다 — 같은 줄이 "a non-canonical dimension name in a profile is loaded best-effort (unknown dims skipped)" 라고 적는다. **건너뛰기는 거부가 아니다.** 강제의 반대다.

**Why:** card t42(2026-09-06). 실제로 넷을 지키는 것은 규약이 아니라 **결합**이다 — `.claude/workflows/sync-audit-4dim.js` 가 네 이름을 세 자리에 손으로 적는다(앵커: `const DIMENSIONS`, `enum: ['Functionality'`, `const judges = await parallel(`) + 판정자 프롬프트의 설명 목록(앵커: `Dimension focus for`). 결정적으로 판정자 배열은 `DIMENSIONS.map` 이 아니라 **손으로 쓴 네 개짜리 리터럴**이고, `DIMENSIONS` 는 결과를 번호로 맞춰 읽는 데만 쓰인다.

**여기서 나오는 함정:** 「목록에 다섯째 이름을 넣어 보면 강제 여부가 갈린다」는 실험은 **판별력이 없다.** 이름만 늘리면 다섯째 판정자가 `undefined` 가 되어 스크립트 자신의 결측 가드가 INCOMPLETE 를 낸다 — 바깥의 강제 때문이 아니다. 그 INCOMPLETE 를 「무언가가 넷을 강제한다」로 읽으면 거짓 결론이다. t42 가 판정 블록을 축자로 떼어 대조군과 함께 실측했다(`.moai/reports/t42/evidence/coupling.out`): 4차원+4판정자 → PASS, 5차원+4판정자 → INCOMPLETE, **5차원+5판정자 → PASS(저항 없음)**. 세 번째 줄이 결론이다.

**How to apply:** ① 「다섯째 차원은 헌법이 금지한다」를 전제로 쓰지 마라 — 그 전제는 인용된 자리에서 확인되지 않는다. ② 동시에 차원 목록을 임의로 바꾸지도 마라. 이유는 동결이 아니라 결합이고, 그 스크립트는 `template_managed` 라 로컬 편집이 `moai update` 에 되돌아간다. ③ 어떤 문서가 「FROZEN (근거 §X)」라고 적으면 **그 §X 를 열어 주어가 같은지** 확인하라 — 인용은 주어가 바뀌는 문장 경계를 넘어 딸려 가기 쉽다. 전체 기술은 `.claude/rules/moai/core/audit-rubric-scope.md`. 관련: [[quoted-canon-labeled-correct-escapes-sweeps]], [[harness-splits-one-capability-across-fields]], [[documented-command-can-return-a-silent-zero]]
