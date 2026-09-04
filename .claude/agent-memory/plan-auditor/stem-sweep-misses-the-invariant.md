---
name: stem-sweep-misses-the-invariant
description: 바뀌는 심볼의 어간으로만 훑으면, 그 심볼이 참여하는 «불변식 문장»(개수 열거·집합 단언)이 어간을 하나도 안 담아 통째로 빠진다 (t34 1회차, 2026-09-03)
metadata:
  type: feedback
---

개정 대조표를 검산할 때, **바뀌는 심볼의 어간**(`ConnInfo`·`sendToBot`·`sendToConn`)으로만 훑지 말 것. 그 심볼이 **참여하는 불변식을 서술한 문장**은 어간을 하나도 담지 않아 훑기에서 통째로 빠진다.

**Why:** t34 에서 SPEC 이 `sendToOrigin` 이라는 새 발신 메서드를 만드는데, 형제 `SPEC-GWAUTH-002` 가 여러 자리에 적은 「서버의 **발신 지점은 다섯**이다」가 여섯이 되어 거짓이 된다. 그런데 그 문장들에는 `ConnInfo` 도 `sendToOrigin` 도 없다 — 「다섯」과 `send(ws` 만 있다. SPEC 의 §6 표는 그 형제 SPEC 을 **한 행도** 적지 않았고, 정작 `related_specs` 에 그 SPEC 을 올려 두고 REQ 하나가 그 SPEC 의 봉투 조항을 명시적으로 승계까지 하고 있었다. 같은 라운드에서 형제 **수용 기준 문서**(`SPEC-GATEWAY-001/acceptance.md` AC-GW-017·「다섯 메서드」)도 빠졌다 — 표가 `spec.md` 들만 훑었기 때문이다.

가장 조용한 자리: `server/test/gateway.test.ts:901` 의 메서드 집합 검사가 **포함 검사**(`for (const m of [...]) expect(typeof gw[m]).toBe('function')`)라, 여섯째 메서드가 생겨도 초록으로 남고 주석의 「다섯」만 거짓이 된다. 기계가 아무 신호도 내지 않는다.

**How to apply:** 개정 대조표를 검산할 때 두 축으로 훑는다.
1. **심볼 축** — 바뀌는 식별자의 어간 (기존 습관)
2. **불변식 축** — 그 심볼이 원소로 들어가는 열거·개수·집합을 서술한 문장. 「N개다」·「전부」·「다섯 경로 각각에」 같은 **수와 전칭**을 어간으로 잡고, 그 목록에 이번 변경이 원소를 더하거나 빼는지 본다.

그리고 문서 종류 축: 훑기 대상에 형제의 `spec.md` 뿐 아니라 `acceptance.md`·`design.md` 를 반드시 넣는다. 계약을 축자 재현하는 곳은 대개 수용 기준 문서다.

관련: [[contract-amendment-misses-test-harnesses]] · [[one-file-sweep-leaves-the-other-two]] · [[sweep-by-stem-not-by-phrase]] (이 항목은 그 셋의 상위 축을 하나 더한다 — 어간이 옳아도 불변식 문장은 어간을 안 담는다)
