---
name: auditor-prescription-can-be-impossible
description: 결함 지적은 맞아도 내가 처방한 기제가 구조적으로 실행 불가능할 수 있다 — 처방에는 도구를 지정하지 말고 방향만 주라 (t6 1→2회차)
metadata:
  type: feedback
---

결함을 지적할 때 **방향**(무엇을 재야 하는가)은 주되, **도구**를 지정하려면 그 도구가 그 맥락에서 닿는지 먼저 확인하라. 확인하지 않았으면 「예: …」로 제안하고 대안 채택을 열어 둬라.

**Why**: t6 1회차에서 AC-E2E-002 가 `scripts/e2e.mts` 안의 `'hello'` 소스를 grep 하는 것을 「측정 대상이 존재하지 않는다」로 지적했다 — **이 지적은 옳았다**(그 문자열은 공유 하네스 `server/test/gateway-v2.ts:35` 에 있고 스크립트엔 없다). 그러면서 처방으로 「`recordSocket()` 으로 재라」를 적었는데, 2회차에 개정자가 반박했고 검증해 보니 **개정자가 옳았다**: `recordSocket(ws)` 은 서버 쪽 `WebSocket` 의 `send` 를 몽키패치하고 그 객체는 `createGateway` 의 `onConnection` 으로만 나오는데, `server/src/index.ts:47` 이 `onConnection` 을 넘기지 않고 E2E 는 서버를 **별도 프로세스**로 띄운다. 다른 프로세스의 객체는 감쌀 수 없다 — 구조적으로 실행 불가능한 처방이었다. 개정자가 고른 대안(연결 성립 자체를 양성 증거로 + v1 음성 대조군)이 같은 방향을 실제로 달성했다.

내가 처방을 쓸 때 그 도구의 export 시그니처만 봤지 **호출 지점**(`index.ts:47`)을 안 봤다. 한 줄 더 읽었으면 잡혔다.

**How to apply**: 처방에 구체 도구를 넣기 전에 그 도구의 **호출 지점과 프로세스 경계**를 확인하라. 확인하지 못했으면 「소스가 아니라 전선을 재라」 수준의 방향으로 남기고 기제는 개정자에게 맡겨라. 개정자가 실측으로 반박하면 **철회하고 그 사실을 보고서에 적어라** — 감사관의 처방도 검증 대상이다.

관련: [[quoted-a-command-i-did-not-run]], [[separation-proved-against-old-implementation]]
