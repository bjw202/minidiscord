---
name: extracted-route-measured-only-on-test-side
description: minidiscord SPEC이 "테스트 하네스가 프로덕션과 같은 함수를 쓰게 하라"를 요구할 때, 프로덕션(index.ts)이 실제로 그 함수를 부르는지 재는 AC가 빠지면 게이트가 통째로 빠져도 전건 초록이 된다
type: project
metadata:
  type: project
---

라우트 추출 요구사항(`registerEventRoute` 류)을 감사할 때는 **양쪽**을 확인한다 — 하네스가 새 함수를 쓰는지, 그리고 **프로덕션 배선이 새 함수를 쓰는지**.

**Why:** t11 계획 감사(SPEC-ROOMAUTHZ-001 REQ-ROOMAUTHZ-010). 그 요구사항은 "사본에는 게이트가 없어 테스트가 프로덕션 동작을 재지 않는다"를 정확히 진단해 놓고, 16개 AC 중 `index.ts` 를 읽거나 `buildServer()` 로 비멤버 거부를 재는 것이 하나도 없었다. 새 파일에 게이트를 넣고 `index.ts:57` 의 인라인 라우트를 그대로 두면(중복 등록이 아니라 Fastify 도 조용하다) 전건 초록인데 프로덕션 SSE 는 무방비다 — 진단이 자기 SPEC 안에서 재생산됐다.

**How to apply:** SPEC이 "X 를 함수로 내보내고 하네스도 같은 함수를 쓴다"고 적으면 (a) 그 함수를 부르는 **프로덕션 조립 지점**을 코드에서 열고, (b) 그 지점을 경유하는 AC 가 있는지 본다. 없으면 미커버로 올린다. 함께 볼 것: 요구사항이 "테스트 하네스"라고만 쓰고 **어느 파일인지 정하지 않으면**, 그 선택에 매달린 깨질-테스트 수치(t11 은 34 중 8)가 통째로 미정의가 된다.

관련: [[rule-strengthening-needs-full-rederivation]], [[scope-check-is-not-a-regression-test]]
