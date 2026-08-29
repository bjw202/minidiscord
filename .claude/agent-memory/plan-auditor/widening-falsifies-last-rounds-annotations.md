---
name: widening-falsifies-last-rounds-annotations
description: When a later round widens scope, the amendment annotations the SPEC wrote into sibling docs in the earlier round become false in the opposite direction — and the "what I amended" table certifies them as done
metadata:
  type: project
---

한 SPEC 이 형제 문서에 「개정 주석」을 달아 두고, 다음 라운드에 운영자가 범위를 넓히면 **그 주석이 정반대의 거짓**이 된다. 그런데 완료 조건은 보통 "주석이 달렸는가"만 보므로, 거짓인 주석이 통과 판정을 받는다.

관측 (t11 2회차, 2026-08-29): SPEC-ROOMAUTHZ-001 이 1차에 `SPEC-BOT-001/spec.md:47`·`:172` 에 "봇 초대 라우트에는 게이트가 걸리지 않았다 — 후속 카드 필요"라고 써 넣었다. 2차에 운영자가 D2 를 넓혀 그 라우트를 범위에 넣었고, ROOMAUTHZ §6 표는 "그 문장은 뒤집혔다"라고 적었다. 그러나 `git diff` 상 SPEC-BOT-001 은 한 글자도 바뀌지 않았다. 주석이 가리키던 "§7·§9 에 잔여 위험으로 기록돼 있다"도 함께 거짓이 됐다(§7 은 취소선, §9 는 「부분 해소」).

**Why:** 범위 확대 때 저자는 「새로 추가할 것」을 훑지, 「지난 라운드에 내가 쓴 것 중 무엇이 뒤집혔는가」를 훑지 않는다. 그리고 개정 주석은 형제 문서에 흩어져 있어 자기 SPEC 을 다시 읽어도 보이지 않는다.

**How to apply:** 범위 확대(D-결정 v2, 게이트 추가, 요구사항 신설)가 있는 라운드를 감사할 때는 `grep -rn "<SPEC-ID>" .moai/specs --exclude-dir=<자기 디렉터리>` 로 **이 SPEC 이 이전 라운드에 형제에 써 넣은 주석 전부**를 뽑아, 각 주석이 확대 이후에도 참인지 한 줄씩 판정한다. 「~하지 않는다」·「범위 밖이다」·「후속 카드가 필요하다」로 끝나는 문장이 1순위다. 그리고 §6 표(무엇을 손댔는가의 목차)와 `git diff --stat` 을 대조해, 표가 주장하는 개정이 실제 diff 에 있는지 본다 — 표는 판정 기준이므로 표의 거짓은 판정의 거짓이 된다.

관련: [[extracted-route-measured-only-on-test-side]], [[rule-strengthening-needs-full-rederivation]]
