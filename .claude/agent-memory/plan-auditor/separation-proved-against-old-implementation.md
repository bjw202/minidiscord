---
name: separation-proved-against-old-implementation
description: 두 방어의 분리 논증을 «현행 코드» 기준으로 세우면, 새 구현이 그 관계를 뒤집어 논증이 착지 순간 거짓이 된다 (t15 1회차, 2026-08-29)
metadata:
  type: feedback
---

문서가 «형제 게이트를 지워도 우리 기준은 통과한다» 를 논증할 때, 그 논증이 참인지는 **착지 후 코드**에서 판정해야 한다. 현행 코드로 검산하면 통과하는데 새 구현이 관계를 뒤집는 경우가 있다.

t15 실례: 현행 `gateway-client.ts` 는 `welcome` 이 오면 무조건 `established = true` 로 두므로, «스텁이 언제나 welcome 을 보내니 t9 의 `else if (!established)` 게이트는 이미 열려 있다» 가 참이다. 그런데 이 카드의 계획(`plan.md` §F M3-3)은 «증명 대조를 통과할 때만 `established = true`» 로 구현하라고 지시한다. 착지 후에는 증명에 실패한 소켓에서 `established` 가 `false` 로 남고, 뒤따르는 프레임을 버리는 주체가 **바로 그 t9 게이트**가 된다 — 분리 논증이 정반대로 뒤집힌다. 「그 게이트만 지우는」 변이가 이 SPEC 의 기준 다섯을 함께 무너뜨린다.

**Why:** 분리 논증은 «어느 코드 줄이 이 관측을 만들어 내는가» 에 대한 주장이고, 그 줄은 구현이 바뀌면 바뀐다. 현행 코드에서의 검산은 착지 후에 대해 아무것도 증명하지 않는다.

**How to apply:** 「굵은 변이 분리」 「한 기준에 한 방어」 류의 주장을 감사할 때는, 문서가 인용한 현행 코드가 아니라 **계획이 지시한 구현**을 읽어 강제 지점을 다시 세우고 변이 결과를 연역한다. 계획 문서에 그 구현이 명시돼 있지 않으면 그 자체가 결함이다 — 분리 여부가 구현자 재량에 달리기 때문. 관련: [[coarse-mutation-hides-halves]], [[extracted-route-measured-only-on-test-side]]
