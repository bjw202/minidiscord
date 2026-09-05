# t39 2회차 plan — 실측 기록과 미결 하나

작성: plan 단계(manager-spec), 2026-09-05. 나무 `.claude/worktrees/t39`(WT-server-404), 편집 전 HEAD `90632e5`.
이 문서가 하는 일은 **2회차 지시 셋 각각의 근거를 재고, 그 결과를 그대로 적는 것**이다. 판정을 고르지 않는다.

## 1. 지시별 결과 요약

| 지시 | 근거 검증 | 처리 |
|---|---|---|
| (1) §C 기제가 거짓 — 정정 | **확인됨** (§2) | 집행: `plan.md` §C 교체 · `REQ-WSUPGRADE-004` 보강 · `spec.md` §7-12 |
| (2) AC-005 기준 재설계 | **확인됨** (§3) | 집행: `acceptance.md` AC-005 전면 재작성 + 기준표 행 |
| (3) §B 축을 워크스페이스 동시성으로 이동 | **반증됨** (§4) | **집행하지 않음** — §B 두 팔 그대로. 실측을 `spec.md` §7-14 에 싣고 처분을 리드에 올림 |
| 부수 — D-1 과의 구분 명시 | 축과 무관하게 유효 | 집행: `plan.md` §D-1 에 구분 조항 추가 |

## 2. 지시 (1) — `emit` 은 리스너 존재만으로 참이다 [확인됨]

**명령과 관측.**

```
$ sed -n '925,935p' node_modules/ws/lib/websocket.js
    } else if (!websocket.emit('unexpected-response', req, res)) {
      abortHandshake(
        websocket,
        req,
        `Unexpected server response: ${res.statusCode}`
      );
    }

$ node -e '...EventEmitter 세 경우...'
리스너 없음 emit => false
리스너 있고 undefined 반환 => true
리스너 있고 false 반환 => true
```

**뜻.** `emit` 의 반환은 **리스너의 반환값을 보지 않는다** — 리스너가 하나라도 등록돼 있으면 참이다. 따라서 관측 리스너를 다는 순간 `abortHandshake` 는 이미 건너뛰어지고, 0.5.0 까지 `plan.md` §C 가 세운 「값을 돌려주지 않게 두어 `emit` 이 거짓」은 성립하지 않는다. 1회차 실측(`m4/mutations.md` §5 · `m4/ac001-baseline-trigger.log` · `m4/ac005-mutated.log`)과 정확히 일치한다.

## 3. 지시 (2) — 기준이 재는 축이 틀렸다 [확인됨]

1회차 기록(`m4/mutations.md` §5): 기준선(트리거+현행 리스너) → `failed — Test timed out in 5000ms`. 변이(기록 후 `return true`) → **같은** 시간 초과. 기준이 재는 것이 «실패했는가»뿐이라, **실패의 모양만 바뀌는** 이 삼킴을 가르지 못했다.

새 기준은 셋을 함께 요구한다 — 포획 1건 이상 · 실패 · 그 실패가 **관측된 상태 코드를 실은 응답자 오류**(시간 초과 어간 부재). 변이 둘이 **반대 방향**으로 붙는다: 재수립 생략 → 모양 조항 RED, 리스너 제거 → 포획 조항 RED.

## 4. 지시 (3) — 축 이동의 근거 둘이 모두 반증됐다 [반증됨]

### (가) 「남의 앱」은 1회차 두 팔에 **있었다**

```
$ grep -c 'Fastify|buildApp|build(' server/test/sse.test.ts   -> 2
$ grep -c 'listen('              server/test/sse.test.ts      -> 2
$ grep -c 'gateway'              server/test/sse.test.ts      -> 0
```

`server/test/sse.test.ts` 는 **server 워크스페이스 안**의 파일이고, Fastify 앱을 세워 포트를 잡으며 게이트웨이를 붙이지 않는다 — `spec.md` F3 가 말한 「업그레이드 리스너 0개」 부류이자 §5.4 ②(Fastify 기본 404)를 낼 수 있는 후보다. 1회차 병렬 팔은 파일 병렬성이 켜진 채 돌았으므로 이 앱은 대상 시험과 **같은 창에서** 살아 있었다.

즉 「이 축에는 경합 상대가 없었다」는 진단은 성립하지 않는다. 병렬 팔에는 H-1·H-2 가 요구하는 상대가 실재했고, 그럼에도 20회에서 포획이 0건이었다.

### (나) 워크스페이스는 **순차로** 돈다 — 옮겨도 동시성이 생기지 않는다

`moai gate` 의 뿌리는 루트 `npm test` = `npm test --workspaces --if-present` 이고 두 워크스페이스 모두 `vitest run` 이다. npm 11.6.2 에서 실행 창을 두 번 쟀다.

```
[이 저장소]  server  START 1788574680003 / END 1788574681507
             channel START 1788574681536 / END 1788574683038      → 창 사이 29ms, 겹침 없음
[같은 동사 체인을 임시 프로젝트로 재현]
             a START 1788574704429 / END 1788574705933
             b START 1788574705967 / END 1788574707472            → 창 사이 34ms, 겹침 없음
```

두 창이 겹치지 않으므로, server 스위트가 도는 동안 `channel` 의 앱들(포트를 잡는 파일 5건: permission-relay · index-wiring · transport-auth · gateway-mutual-auth · gateway-client)은 **살아 있지 않다.** 축을 워크스페이스 동시성으로 옮겨도 새 경합 상대는 생기지 않는다.

> 참고로 그 5건 중 Fastify 앱을 세우는 것은 둘이다(`transport-auth.test.ts:370,377` · `gateway-mutual-auth.test.ts:8,86`); 나머지 셋은 맨 `WebSocketServer({ port: 0 })` 이라 지문표상 ①(400) 쪽이다. 그러나 (나) 때문에 이 구분은 이 축에서 쓰이지 않는다.

### (다) 그래서 남은 차이

원 관측(`moai gate`)과 1회차 두 팔 사이에 **확인된** 차이는 하나다: gate 는 lint·format·type-check 를 시험과 **동시에** 돌린다(`.claude/skills/moai/workflows/gate.md:4,31`). 그것이 이 실패를 넓히는지는 **재지 않았다.** 그 밖의 열린 축은 회수 상향 · 다른 기계 · CI 이며, 1회차 판정 기록(`verdict.md` §2)이 이미 나열해 둔 것들이다.

**이 문서는 어느 축도 고르지 않는다.** §B 의 두 팔 정의는 SPEC 의 소유이고 그 처분은 리드의 자리다.

## 5. 이 회차가 재지 않은 것

- 고친 리스너가 **실제 스위트에서** 응답자 오류 모양을 내는지 — 이 나무는 의존성이 없어 스위트를 돌리지 못한다(`spec.md` C-3). run 단계의 관측이다.
- gate 의 동시 검사 셋이 이 실패의 빈도를 바꾸는지 — 재지 않았다.
- §4 (가)의 `sse.test.ts` 앱이 실제로 **관측된 404 본문**을 내는지 — 여전히 추론이다(`spec.md` §7-8 그대로).
