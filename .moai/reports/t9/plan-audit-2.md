# SPEC-CHANAUTH-001 계획 감사 보고 2회차 (카드 t9)

| 항목 | 값 |
|------|-----|
| 감사 대상 | `.moai/specs/SPEC-CHANAUTH-001/` v0.2.0 + 형제 개정 `SPEC-CHANPERM-001` v0.4.0 · `SPEC-CHANCLIENT-001` v0.4.0 |
| 감사 대상 커밋 | `a7dbeea` (브랜치 `WT-chanperm-gate`, 워크트리 `.claude/worktrees/t9`) |
| 1차 판정 | `b90d8fe` — FAIL 0.55, 11건(Critical 3 / High 3 / Medium 3 / Low 2), 차단 7건 |
| 작성자 처리 대장 | `.moai/reports/t9/plan-done-2.md` — 정정 10 · 이연 1 · 반박 0 (**주장으로만 읽었다**) |
| 반복 회차 | 2 / 3 |
| **판정** | **FAIL** |
| 종합 점수 | 0.74 (1차 0.55 → 상승, 점수 퇴행 없음) |

---

## 1. 주장 (Claim)

교정 라운드의 **핵심은 옳게 착지했다.** 가장 큰 결함이던 C-01 의 근거 문장은 실제로 철회됐고, 형제 SPEC 두 건의 개정도 실재하며, 작성자가 열거한 "깨지는 12건"은 내가 병합 트리를 직접 훑어 **같은 12건으로 재현했다** — 과잉도 누락도 없다. 1차 11건 중 **7건은 진짜로 닫혔고 1건(L-01)은 운영자 결정대로 올바르게 이연**됐다.

그러나 **네 건은 절반만 덮였다.** 이 프로젝트의 특징적 실패 형태가 이번에도 나왔다 — 교정이 *본체*를 고치고 그 본체를 *참조하거나 측정하는 자리*를 따라가지 않았다.

- **C-01** — `spec.md` 는 "welcome 을 인증의 증거로 쓰지 않는다"로 다시 썼는데, run 단계가 실제로 읽는 `plan.md` §E 위험표 **첫 줄이 v0.1.0 문언 그대로 살아 있다**: "`welcome` 을 **인증 증거로 쓰는** 것이 완전한 상호 인증이 아니다 … **토큰이 유출되면** 게이트가 통째로 무의미해진다". 철회된 두 문장이 같은 커밋 안에서 그대로 재진술돼 있다.
- **C-02 · C-03** — 개정된 형제 기준을 **품질 게이트가 만족 불가능한 형태로 요구한다.** `AC-CHANPERM-011` 과 `AC-CHANCLIENT-015` 는 **지금 이 트리(HEAD)에서 이미 실패한다**(내가 git 으로 직접 실행해 관측했다). 그 둘을 포함한 전건 `✓` 를 t9 의 품질 게이트와 DoD 가 요구한다.
- **H-02** — 자기부정 문단은 사라졌지만, 확정됐다는 AC-CHANAUTH-002 의 코드가 **존재하지 않는 심볼**(`channel.pushPermissionRequest`)을 부른다. 그리고 AC-CHANAUTH-013(RED→GREEN 전이)은 개정된 `plan.md` §F 와 **세 자리에서 충돌한다** — 교정이 계획을 고치고 그 계획을 측정하는 기준을 고치지 않았다.

그리고 **교정 자체가 남긴 자국이 셋 더 있다**: 변이표를 6종에서 8종으로 늘리고 그것을 소비하는 세 줄을 6종으로 남겼고(새로 넣은 G·H 는 M-01·M-02 교정을 조준하는 바로 그 두 변이다), 변이 A 의 예상 실패 집합이 H-01·H-02 교정으로 넓어졌는데 표는 그대로이며, AC-CHANAUTH-011 머리글은 여전히 "세 갈래"인데 본문은 네 갈래다.

마지막으로 **1차가 놓친 기계적 결함 하나**를 새로 보고한다 — AC-CHANAUTH-009 는 정상 구현에서도 vitest 기본 타임아웃을 넘긴다.

## 2. 증거 (Evidence)

관측은 전부 `a7dbeea` 의 작업 트리에서 직접 읽거나 실행했다. `node_modules` 가 없어 테스트는 **한 번도 실행하지 못했다** — "깨진다/통과한다"는 전부 **소스 대조 판정**이며, 실행으로 관측한 것은 git 명령 결과뿐이다(§3·§4).

### 2.1 철회된 전제가 `plan.md` §E 에 살아 있다 (C-01 미이행 잔여 — N-1)

`spec.md:96` 은 이렇게 못 박는다.

> **①은 인증 장치가 아니다.** … 실재하는 서버 인증은 §4.3 의 `wss://` 강제 한 겹뿐이고

`spec.md:306` (§5)은 한발 더 나간다.

> v0.1.0 은 이것을 "토큰 지식에 기반한 약한 상호 인증"이라 적고 **"토큰이 유출되면 무력해진다"**고 위험을 기술했으나 … **두 문장 모두 철회한다.**

그런데 같은 커밋의 `plan.md:82` 위험표 첫 줄:

```
| `welcome` 을 인증 증거로 쓰는 것이 완전한 상호 인증이 아니다
| 토큰이 유출되면 게이트가 통째로 무의미해진다
| 완화하지 않는다. 그 경우의 방어는 발신 집합 대조 한 겹뿐이며, 이 한계를 `spec.md` §2·§5 에 명시했다 |
```

세 칸이 모두 철회된 서술이다. (1) "인증 증거로 쓰는" — §2 용어표가 "인증의 증거로 쓰지 않는다"로 고친 바로 그 표현. (2) "토큰이 유출되면" — §5 가 명시적으로 철회한 문장의 재진술이며, 게이트 무력화에 유출이 **필요하다**는 잘못된 조건을 다시 심는다. (3) "그 경우의 방어는 발신 집합 대조 한 겹뿐" — 사칭 채팅·이력 오염 축에는 그 한 겹도 걸리지 않는다는 것이 이 라운드 교정의 핵심인데, 그 사실이 이 줄에는 없다.

작성자 보고 `plan-done-2.md` §6 은 `plan.md` §E 를 개정 파일로 적었다. 실제로는 **아래에 새 줄을 더했을 뿐 첫 줄을 손대지 않았다**(위험표 행 8개 중 새 행 2개가 맨 아래에 추가됨, `git show a7dbeea -- …/plan.md` 로 확인). run 단계가 §E 위험표를 읽는 순간 철회 전 위협 모델을 그대로 받는다.

### 2.2 형제 비회귀 게이트가 구조적으로 만족 불가능하다 (C-02·C-03 미이행 잔여 — N-2)

`acceptance.md:653` 품질 게이트와 `plan.md:169` §G 체크리스트, DoD 두 줄이 요구하는 것:

> `--reporter=verbose` 출력에 … **AC-CHANPERM-001..012 (v0.4.0 개정본)**, **AC-CHANCLIENT-001..016 (v0.4.0 개정본)** 의 `✓` 줄이 모두 있다

네 기준이 이 요구를 만족할 수 없다. 둘은 **실행으로 확인**했다.

**(a) `AC-CHANPERM-011` — 지금 이미 실패한다.** 그 기준(`SPEC-CHANPERM-001/acceptance.md:470-489`)은 3번·4번 관측으로 "`git diff --name-only <base> -- channel/src` 가 정확히 두 줄이고 `gateway-client.ts` 가 **없다**"를 요구한다. 이 워크트리에서 직접 실행:

```
$ cat .moai/specs/SPEC-CHANPERM-001/.spec-base-sha
323df7ff7025226f8ee658e150f71f05f7565211
$ git diff --name-only 323df7ff... -- channel/src
channel/src/channel-server.ts
channel/src/gateway-client.ts     ← 있어서는 안 되는 파일
channel/src/index.ts
```

세 줄이고 `gateway-client.ts` 가 있다. t9 의 run 단계는 그 파일을 **반드시** 고치므로(REQ-CHANAUTH-001) 이 상태는 개선되지 않는다.

**(b) `AC-CHANCLIENT-015` — 지금 이미 실패한다.** 그 기준(4번 관측)은 "`channel/src/index.ts` 와 `channel/src/channel-server.ts` 가 목록에 **없다**"를 요구한다.

```
$ cat .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha
7b286923d69366a67b748e35d434a6222d2f88f4
$ git diff --name-only 7b28692... | grep '^channel/'
channel/src/channel-server.ts     ← 있어서는 안 되는 파일
channel/src/gateway-client.ts
channel/src/index.ts              ← 있어서는 안 되는 파일
…
```

**(c) `AC-CHANPERM-012` · `AC-CHANCLIENT-016` — `✓` 줄이 존재할 수 없다.** 둘 다 RED→GREEN 전이 기록이지 vitest 테스트가 아니다. 덧붙여, `channel/test/` 의 어떤 `it(...)` 이름에도 AC 번호가 들어 있지 않다(`grep -n "it(" channel/test/*.ts` 로 전건 확인) — "AC-… 의 `✓` 줄"이라는 표현은 어느 기준에도 글자 그대로 성립하지 않으며, 나머지는 AC 본문의 `it` 코드로 대응을 되짚을 수 있는 반면 이 넷은 되짚을 대상 자체가 없다.

즉 t9 의 DoD 는 **원리상 체크할 수 없는 항목**을 담고 있다. 이 자리는 1차 감사가 C-02 의 증거로 인용했던 바로 그 줄이고(당시 지적은 "깨진 4건이 있는데 12건 전건 ✓ 를 요구한다"), 교정은 4건을 고쳤을 뿐 **줄 자체는 손대지 않은 채 `AC-CHANCLIENT-001..016` 을 같은 형태로 덧붙였다** — 결함 부류가 확대됐다.

> 범주 오류로 정리하면 이렇다. `AC-CHANPERM-011` · `AC-CHANCLIENT-015` 는 **각 SPEC 자신의 기준 SHA 대비 파일 집합 검사**다. 그것은 그 카드 한 번의 경계 확인이지 회귀 테스트가 아니며(`SPEC-CHANAUTH-001/acceptance.md:30` 이 자기 AC-012 에 대해 정확히 그렇게 적었다), 다른 카드의 비회귀 목록에 넣으면 정의상 실패한다.

### 2.3 변이표 8종, 그것을 소비하는 세 줄은 6종 (N-3)

`grep -rn "변이 [0-9]종\|아래 6종" .moai/specs/SPEC-CHANAUTH-001/` 결과 원문:

```
acceptance.md:654 | 변이 관측 | 아래 6종을 하나씩 적용·실행·되돌리고 …
acceptance.md:660 **변이 8종** (각 변이는 오른쪽 기준 하나만 무너뜨려야 한다). G·H 는 v0.2.0 에서 더해졌다
acceptance.md:679 - 변이 6종의 실패 기준 집합이 위 표와 일치하고, 모든 변이가 되돌려졌다.
plan.md:167      - [ ] 변이 6종의 실패 기준 집합이 `acceptance.md` 의 표와 일치하고 …
```

표는 A~H 여덟 행이다. 소비하는 세 줄(품질 게이트 한 줄·DoD 한 줄·§G 체크리스트 한 줄)은 전부 6종이다. **구체적 실패 시나리오**: run 단계가 DoD 를 글자대로 따르면 A~F 여섯 개만 적용하고 **G·H 를 건너뛴다**. 그런데 G·H 는 M-01(`[::1]`)·M-02(`127.0.0.1.evil.com`) 교정이 실제로 조준되는지를 확인하려고 이번 라운드에 넣은 바로 그 두 변이다 — 교정의 검증 장치가 교정과 같은 커밋에서 무력화됐다.

### 2.4 AC-CHANAUTH-013 이 개정된 `plan.md` 와 세 자리에서 충돌한다 (N-4)

`acceptance.md:615-632` (AC-CHANAUTH-013)은 이번 라운드에 **한 글자도 바뀌지 않았다**(`git show a7dbeea -- …/acceptance.md` 의 hunk 목록에 이 범위가 없다). 그런데 `plan.md` §F 는 바뀌었다.

| 자리 | `acceptance.md` AC-013 | 개정된 `plan.md` §F |
|---|---|---|
| M1 전이 1 | "001·003·004·005 가 단언 실패로 실패한다. **002 는 통과한다**" | "001·**003(가)**·004·005 가 실패. **002 와 003(나)는 이 시점에 통과하지 않아도 정상이다** … 최종 판정은 M3 GREEN 에서" (`plan.md:105`) |
| M1 전이 2 | "다섯 기준 전부 통과" | 위와 같은 이유로 M1 시점에 다섯 전건 통과를 요구하지 않는다 |
| M3 전이 5 | "**기존 AC-CHANPERM-008 도 함께 실패한다**" | "기존 AC-CHANPERM-**005·006·007·008·009 다섯 건이 함께 실패**하는 것을 관측 … **다섯 건이 아니면 멈추고 보고한다**" (`plan.md:138`) |
| M1 단계 1b | 대응 전이 없음 | `gateway-client.test.ts` 일곱 건의 실패 원문을 §E.2 에 남기는 것이 §G 완료 조건 (`plan.md:163`) |

DoD 는 "AC-CHANAUTH-001..013 **전부** 통과"를 요구한다. 전이 5 를 글자대로 따르면 하나만 실패하기를 기대하는데 계획은 다섯을 요구하므로, run 단계는 두 문서 중 하나를 어긴 채로만 완료할 수 있다. **C-02·C-03 교정이 바로 이 기준을 갱신했어야 했다** — 다섯 건·일곱 건이라는 새 사실을 만들어 낸 것이 그 교정이기 때문이다.

### 2.5 확정됐다는 AC-CHANAUTH-002 가 존재하지 않는 심볼을 부른다 (H-02 잔여 — N-5)

`acceptance.md` AC-CHANAUTH-002 코드:

```ts
channel.pushPermissionRequest(REQ)   // 배선의 sendPermissionRequest 로 나간다
```

병합 트리에서 이 이름을 찾았다 — 없다.

```
$ grep -rn "pushPermissionRequest" channel/src channel/test
(일치 없음)
```

`ChannelHandle` 의 멤버는 정확히 셋이다(`channel/src/channel-server.ts:33-37`): `server` · `pushChatMessage` · `handlePermissionVerdict`. 그리고 `attachWireTo` 가 돌려주는 `channel` 은 `wire()` 의 반환값이므로(`channel/src/index.ts:20`) 그 세 멤버가 전부다.

문서는 바로 아래 하네스 주석으로 "이것은 축약이며 run 단계가 형제 헬퍼 `sendRequest(client, REQ)` 를 재사용한다"고 적어 완화한다. 그러나 같은 문서의 DoD 는 이렇게 요구한다 — "AC-CHANAUTH-002 의 왕복 형태가 **계획 단계에서 확정된 그대로** 실행됐다 (v0.2.0 이후 run 단계가 이 형태를 다시 정하지 않는다)". **"그대로"가 불가능한 코드**다. H-02 의 본체(자기부정 문단·run 이연)는 닫혔으나, "형태를 run 이 다시 정하지 않는다"는 약속은 이 한 줄에서 지켜지지 않는다.

### 2.6 변이 A 의 예상 실패 집합이 교정으로 넓어졌는데 표는 그대로다 (N-6)

변이표: `A. 프레임 분배의 세션 확립 검사 제거 → AC-CHANAUTH-001 (002 는 통과)`. 표 머리글은 "각 변이는 오른쪽 기준 **하나만** 무너뜨려야 한다"이다.

이번 라운드에 추가된 두 단언이 A 의 사정거리 안에 들어왔다.

- **AC-CHANAUTH-003 (가)** (H-02 로 확정된 두 갈래 중 앞) — `expect(settled).toBe('pending')`. 게이트를 지우면 `history_response` 가 대기를 해소하므로 `'resolved'` 가 되어 실패한다.
- **AC-CHANAUTH-004 의 `notes` 단언** (H-01 정정) — `expect(w.notes.length).toBe(notesBefore)`. 게이트를 지우면 사칭 `message` 가 분배되어 실패한다.

즉 변이 A 는 이제 **001·003·004 셋을 무너뜨린다.** "표와 어긋나면 기준이나 구현 중 어느 쪽이 틀렸는지 판정한 뒤 진행한다"는 문장 때문에 run 단계는 정상 상황에서 판정 작업을 한 번 더 하게 되고, 그 자리에서 "기준이 틀렸다"로 결론 내면 H-01 정정이 되돌려질 수 있다.

(대조 확인: 변이 B 는 여전히 004 하나만 무너뜨린다 — AC-003 의 스텁은 `welcome:false` 로 시작하므로 클라이언트 단위 플래그가 서지 않는다. G·H 도 010 하나씩이다.)

### 2.7 AC-CHANAUTH-009 는 정상 구현에서도 시간 초과한다 (1차 누락 — N-7)

```ts
for (let n = 0; n < 129; n++) await sendRequest(client, { ...REQ, request_id: id(n) })
```

형제 하네스의 `sendRequest` 는 매 호출마다 `tick()` 을 **await 한다**(`channel/test/permission-relay.test.ts:47-50`), 그리고 `const tick = () => new Promise(r => setTimeout(r, 50))` 이다(같은 파일 :55). 129 × 50ms = **6,450ms** 가 단언에 닿기도 전에 흐른다. `channel/vitest.config.ts` 에는 `testTimeout` 설정이 없고 `channel/package.json` 의 `test` 는 `vitest run` 이므로 기본값 5,000ms 가 적용된다.

귀결: 발신 집합 상한이 정확히 128 로 구현돼도 이 기준은 **타임아웃으로 실패**하며, 그 실패는 상한 결함과 구분되지 않는다. 이 기준은 이번 라운드의 교정 대상이 아니었고 1차 감사도 짚지 않았다 — 새 발견이다.

### 2.8 정직성 핀 — 실제로 하중을 받는다 (검증 결과: 성립)

"run·sync 보고가 이 카드를 «F-01 을 닫았다»로 적지 못하게 한다"는 주장을 자리마다 확인했다. 네 곳에 있고, **읽히는 시점이 맞다.**

| 자리 | 원문 | 읽히는 시점 |
|---|---|---|
| `spec.md:262-283` §5 | `### Out of Scope — 13개 요구사항을 전부 구현해도 살아남는 F-01 절반 (카드 `t15` 소유)` + 두 축 표 + `t15` 소유 항목 3개 | plan 승인·run 착수 |
| `plan.md:88` §E 위험표 | "**이 카드의 성과를 «F-01 을 닫았다»로 보고해서는 안 된다**" | run 착수 |
| `plan.md:163` §G | "[ ] F-01 의 절반 … 이 항목이 없으면 **완료가 아니다**" | **run 완료 판정** |
| `progress.md:41-45` §E.1 `handoff:` | `card: t15` + scope + reason (기계 판독 블록) | sync·후속 카드 |

`t15` 는 네 곳 모두에서 **문자 그대로** 적혀 있고 "별도 카드" 류의 미지정 표현은 없다(`grep -n "t15"`). 이 항목은 닫힘으로 판정한다.

### 2.9 형제 붕괴 12건 — 열거를 직접 재현했다 (C-03 본체: 성립)

작성자 열거를 믿지 않고 병합 트리의 `channel/test/` 네 파일을 직접 훑었다.

`gateway-client.test.ts` 의 `startServer()` 는 `welcome` 을 보내지 않는다(`:23-51`, `ws.on('message')` 가 `messages.push` 와 훅 호출만 한다). 게이트가 서면 게이트 대상 프레임(`message`·`permission_verdict`·`history_response`)의 도달을 단언하는 블록이 깨진다. 16개 `it` 블록을 하나씩 판정한 결과:

| 행 | 게이트 대상 프레임 | 판정 |
|---|---|---|
| `:111` `:125` `:135` `:162` | message / verdict / message / message | **깨진다** (4) |
| `:200` `:220` `:257` | history_response | **깨진다** (3) |
| `:93` `:100` `:150` `:177` `:240` `:276` `:290` `:314` `:340` | hello·welcome 만 관측하거나 콜백을 단언하지 않음 | 깨지지 않는다 (9) |

**정확히 일곱 건**이며 작성자 표(`spec.md` §3.2)와 행 번호·프레임·AC 대응이 일치한다. 1차 감사 §2.3 의 행↔기준 대응 네 자리가 어긋났다는 작성자의 정밀 교정도 옳다 — `it` 블록 위 주석을 직접 대조해 `:162`=AC-005 셋째 갈래, `:200`=AC-007, `:220`=AC-008, `:257`=AC-010 임을 확인했다.

나머지 두 파일도 훑었다. `index-wiring.test.ts:47` 의 스텁은 `hello` 에 `welcome` 으로 답하고 모든 주소가 루프백이므로(`:107 :226 :248 :278 :287`) 게이트에도 전송 검사에도 걸리지 않는다. `channel-server.test.ts` 에는 `welcome`·`permission_verdict` 가 한 번도 나오지 않는다. **12건(7+5) 밖의 붕괴는 없다** — 열거는 과잉도 누락도 아니다.

`autoWelcome` 설계도 성립한다. 특히 AC-CHANCLIENT-005 의 대기 조건을 `seen.length >= 1` 에서 `>= 2` 로 함께 고친 것이 중요하다 — 그대로 뒀다면 `welcome` 하나만 도착한 시점에 `waitFor` 가 풀려 `toEqual(['welcome','message'])` 가 간헐 실패했을 것이다.

### 2.10 H-01 정정은 실제로 조준된다

AC-CHANAUTH-004 에 더해진 `expect(w.notes.length).toBe(notesBefore)` 가 변이 B 를 잡는지 갈래를 따라갔다. 첫 소켓은 `welcome:true` 로 확립되고, 재접속 뒤 스텁은 `welcome:false` 다. 세션 확립 상태를 클라이언트 단위로 둔 구현에서는 첫 소켓의 확립이 살아남아 사칭 `message` 가 `onMessage` 로 분배되고 `notes` 가 1 이 되어 **이 단언에서만** 걸린다. `verdicts` 축은 ②(발신 집합)가 먼저 버리므로 구분력이 없다는 1차 지적이 정확히 해소됐다.

### 2.11 M-01·M-02 정정 확인

- `spec.md:79` 루프백 정의가 네 값(`127.0.0.1`·`localhost`·`::1`·`[::1]`)이고, `plan.md:120` M2 단계 2 처방도 "`hostname` 이 루프백 **네 값**"으로 함께 고쳐졌다 — 1차가 지적한 처방↔기준 불일치가 사라졌다.
- AC-CHANAUTH-010 판정표가 9행이고 `['ws://127.0.0.1.evil.com/bot', false]` 가 실려 있다. "M2 단계 1 에서 확정한다"는 이연 문구는 `plan.md:119` 와 `acceptance.md` 양쪽에서 사라졌다(`grep` 으로 잔여 없음 확인).
- 다만 이 두 정정을 조준하는 변이 G·H 가 §2.3 의 6종/8종 불일치로 건너뛰어질 수 있다.

### 2.12 사소 잔여 (N-8·N-9·N-10)

- **N-8** — AC-CHANAUTH-003 (나) 갈래의 `await waitFor(() => settled === 'pending', 'welcome 처리')` 는 호출 시점에 이미 참이므로 **즉시 반환한다**. `welcome` 처리를 기다리는 동기화 지점처럼 읽히지만 아무것도 기다리지 않고, 어떤 구현에서도 실패할 수 없다. (프레임 순서가 소켓 위에서 보존되므로 결과적 해악은 없다.)
- **N-9** — AC-CHANAUTH-007 본문 "**정규화는 두 방향 어디에 넣어도 이 기준에서 걸린다**"와 `SPEC-CHANPERM-001` AC-007 의 같은 취지 문장은 과잉 주장이다. 발신 기록과 조회 **양쪽에** `.toLowerCase()` 를 넣되 알림에는 받은 값을 그대로 싣는 구현은 조회가 맞아떨어지고 마지막 `toEqual` 도 `'Ab-C12'` 로 통과한다. (해당 구현은 REQ 를 어기지 않으므로 기준 자체는 건전하다 — 틀린 것은 설명이다.) 표에 적힌 변이 "**어느 한쪽에** `.toLowerCase()`"는 실제로 잡힌다.
- **N-10** — 표기 불일치 둘. `acceptance.md:555` 는 "다음 **세 갈래**를 추가하고"인데 본문은 (a)(b)(c)**(d)** 네 갈래다(M-03 정정이 (d)를 더하며 머리글을 놓쳤다). `progress.md:37` `coupled_revision[0]` 은 `version: 0.4.0` 아래 `items` 에 `REQ-CHANPERM-008` 을 실었는데, `SPEC-CHANPERM-001` v0.4.0 HISTORY 는 "**REQ 는 한 건도 바뀌지 않았다** — 이번 개정은 검증 층에서만 일어났다"고 적는다(REQ-008 은 v0.3.0 변경분이다). 기계 판독 블록과 본문이 어긋난다.

## 3. 기준선 귀속 (Baseline-attribution)

| 관측 | 명령 / 방법 | 기준 |
|---|---|---|
| 감사 대상 트리 | `git log --oneline -8`, `git show --stat a7dbeea` | `a7dbeea`, 브랜치 `WT-chanperm-gate`, 9파일 +522/−95 |
| 교정 diff 전문 | `git show a7dbeea -- <경로>` × 4 (spec/plan/progress/acceptance, 형제 2건) | 같은 커밋 |
| AC-013 무변경 | `git show a7dbeea -- …/acceptance.md \| grep '^@@'` — hunk 범위에 615-632 없음 | 같은 커밋 |
| 형제 붕괴 12건 | `grep -n "it(\|// AC" channel/test/gateway-client.test.ts` + 16블록 전문 읽기, `grep -rn "handlePermissionVerdict\|permission_verdict" channel/test/`, `grep -n "welcome" channel/test/{channel-server,index-wiring}.test.ts` | 같은 커밋의 작업 트리 |
| `AC-CHANPERM-011` 현재 실패 | `cat …/SPEC-CHANPERM-001/.spec-base-sha` → `git rev-parse --verify` (종료 0) → `git diff --name-only 323df7f… -- channel/src` → **3줄, `gateway-client.ts` 포함** | HEAD `a7dbeea` |
| `AC-CHANCLIENT-015` 현재 실패 | 같은 절차, `7b28692…` → `index.ts`·`channel-server.ts` **포함** | HEAD `a7dbeea` |
| `✓` 줄에 AC 번호 부재 | `grep -n "it(" channel/test/*.ts` — 전 테스트 이름이 영문 문장, AC 번호 없음 | 같은 커밋 |
| `pushPermissionRequest` 부재 | `grep -rn "pushPermissionRequest" channel/src channel/test` (일치 없음) + `ChannelHandle` 정의 직접 읽기(`channel-server.ts:33-37`) | 같은 커밋 |
| 타임아웃 산술 | `permission-relay.test.ts:47-55`(`sendRequest` 가 `tick()` await, `tick`=50ms) + `channel/vitest.config.ts`(testTimeout 미설정) + `package.json`(`vitest run`) 직접 읽기 | 같은 커밋 |
| 6종/8종 | `grep -rn "변이 [0-9]종\|아래 6종" .moai/specs/SPEC-CHANAUTH-001/` — 4건, 그중 3건이 6종 | 같은 커밋 |
| MP-1 | `grep -o "REQ-CHANAUTH-[0-9]*" … \| sort -u` → 001..013 연속, `^\*\*REQ-CHANAUTH-` 13건 | 같은 커밋 |
| MP-7 | `grep -rn "NEEDS CLARIFICATION" .moai/specs/SPEC-CHANAUTH-001/` → 종료 코드 1 | 같은 커밋 |
| D7 | `grep -m1 '^status:'` × 6 참조 SPEC | `in-progress` 4 · `completed` 2 — retired/superseded/archived 없음 |
| D8 | `grep -c syscall` × 3 아티팩트 | 전부 `0` |

## 4. 미검증 (Gaps)

통과로 읽어서는 안 되는 것들이다.

1. **테스트 실행 결과 전부.** `node_modules` 가 없어 `npm test -w channel` 을 한 번도 실행하지 않았다. §2.3·§2.6·§2.7·§2.9·§2.10 의 "깨진다/통과한다/타임아웃한다"는 **소스 대조 판정**이며 실행 관측이 아니다. 근거가 되는 사실(프레임 종류, `it` 블록 위치, `tick` 값, vitest 설정 부재)은 파일에서 직접 읽었다.
2. **§2.2 의 (a)(b)만 실행 관측이다.** 두 `git diff` 는 실제로 돌렸다. (c)의 "`✓` 줄이 존재할 수 없다"는 테스트 이름 목록에서 도출한 판정이지 verbose 출력을 본 것이 아니다.
3. **`helloAgain()` 의 실제 동작.** 같은 소켓 위에서 `welcome` 재전송이 클라이언트 상태를 뒤집는지는 구현이 없으므로 확인 불가. AC-003 (나) 전체가 이 전제 위에 있다.
4. **AC-CHANAUTH-011 (d)의 stdio `initialize` 왕복.** 자식이 `"result"` 를 돌려주는지 실행 미확인. 형제 AC-CHANWIRE-014 가 같은 부류를 통과했다는 것이 근거이지 관측은 아니다.
5. **`welcome` 위조의 실행 재현.** C-01 판정은 프로토콜 구조에서 도출한 것이고, 감사 중 변이·프로브 실행은 하지 않았다(읽기 전용 규칙).
6. **`SPEC-CHANNEL-001`·`SPEC-CHANWIRE-001` 의 계약 충돌 여부.** 1차와 마찬가지로 두 SPEC 의 REQ 전문을 읽지 않았다. 테스트 층의 부수 피해가 없다는 것은 §2.9 로 확인했으나, 요구사항 문언 차원의 완전한 배제는 아니다.
7. **커버리지·타입 검사·lint.** 실행 불가.
8. **Tier M 의 PASS 임계값 수치.** `spec-workflow.md` SSOT 표를 열지 않았다. 판정은 임계값이 아니라 차단 결함 7건에 근거하므로 이 미검증이 결론을 바꾸지 않는다.

## 5. 잔여 위험 (Residual-risk)

- **`plan.md` §E 첫 줄이 가장 비싼 잔여물이다.** 문서가 문장을 철회하고도 그 문장으로 계속 추론하는 형태이며, run 단계는 `spec.md` §2.1 보다 `plan.md` §E 를 더 자주 읽는다. 이 줄을 고치지 않으면 §5 의 `t15` 인계가 "토큰만 안 새면 괜찮다"로 재해석될 여지가 남는다.
- **만족 불가능한 DoD 항목의 처리 방식이 다음 감사의 쟁점이 된다.** run 단계가 §2.2 의 넷을 만나면 두 갈래뿐이다 — 멈추고 보고하거나, "실질적으로 통과"라고 적고 넘어가거나. 후자는 관측하지 않은 완료 주장이며, 이 프로젝트가 이미 한 번 겪은 형태다.
- **12건이 한꺼번에 붉어지는 구간의 순서 규율은 여전히 유효하다.** 마일스톤 분리(M1 단계 1b / M3 단계 1)는 잘 설계됐으나, AC-013 이 그 순서를 반영하지 않아 **증거 요구가 두 문서에서 다르게 적혀 있다**. 개정본을 먼저 넣는 지름길이 가장 유혹적인 자리라는 1차의 지적은 그대로 남는다.
- **`AC-CHANPERM-011`·`AC-CHANCLIENT-015` 는 t9 가 손대는 문제가 아닐 수도 있다.** 두 기준은 각자의 SPEC 이 소유하며, "카드 경계 검사를 다른 카드의 비회귀 목록에 넣지 않는다"로 t9 쪽 목록만 좁히는 것이 최소 교정이다. 형제 SPEC 의 기준 본문을 고치는 쪽을 고르면 그 SPEC 의 완료 기록과 충돌한다 — 어느 쪽이든 **결정이 필요하고, 지금 결정하지 않으면 run 이 임의로 정하게 된다.**
- **AC-CHANAUTH-009 의 타임아웃은 run 단계에서 "테스트를 조금 고치면 되는 일"로 처리되기 쉽다.** `tick()` 을 줄이거나 `testTimeout` 을 늘리는 것은 다른 기준의 왕복 여유에 영향을 주므로, 기준 본문 개정으로 다루는 편이 안전하다(예: 발신 루프만 `tick` 없이 돌리는 형태).

---

## 6. 1차 발견 처리 검증표

| ID | 심각도 | 작성자 주장 | 나의 검증 결과 | 상태 |
|----|--------|-------------|----------------|------|
| **C-01** | Critical | 정정 — "위조할 수 없다" 철회, 세 겹 성과 재작성, 용어 4곳 교체 | `spec.md` §2.1·§2 용어표·§4.1·§4.3·§5 는 **모두 확인됨**(§2 본문 인용). 그러나 `plan.md:82` §E 위험표 첫 줄이 v0.1.0 문언 그대로 살아 있어 **철회된 두 문장을 재진술**한다 (§2.1) | **열림** (본체 닫힘, 참조 자리 미이행) |
| **C-01(b)** | Critical | 정정 — §5 신설, `t15` 문자 그대로 명시, 3중 핀 | 네 자리 전부 확인, `t15` 문자 그대로, 읽히는 시점도 적절 (§2.8) | **닫힘** |
| **C-02** | Critical | 정정 — `SPEC-CHANPERM-001` v0.4.0, AC-005·006·009 발신 한 줄, AC-007 설계 변경 | 네 기준 개정 **확인됨**. AC-007 재설계도 발신 집합 대조와 양립하고 `t7` 소유 명시도 있다. 그러나 (i) 1차가 모순의 증거로 인용한 **품질 게이트 줄이 그대로**이고 `AC-CHANPERM-011` 은 HEAD 에서 이미 실패한다(관측, §2.2), (ii) **AC-CHANAUTH-013 전이 5** 가 여전히 008 하나만 실패한다고 적어 개정된 `plan.md` 와 충돌한다(§2.4) | **열림** (기준 4건 닫힘, 측정 자리 2곳 미이행) |
| **C-03** | Critical | 정정 — `SPEC-CHANCLIENT-001` v0.4.0, `autoWelcome`, 7건 전건 열거 | 열거를 **직접 재현해 일치 확인**(7건, 12건 전체, 과잉·누락 없음 §2.9). REQ-004·005 전제 추가와 하네스 설계 건전, AC-005 대기 조건 수정도 적절. 그러나 새로 넣은 `AC-CHANCLIENT-001..016` 비회귀 요구에서 **AC-CHANCLIENT-015 는 HEAD 에서 이미 실패**하고 016 은 `✓` 줄이 존재할 수 없다(관측, §2.2). M1 단계 1b 에 대응하는 AC-013 전이도 없다 | **열림** (개정 본체 닫힘, 게이트 신설분이 새 모순) |
| **H-01** | High | 정정 — AC-004 에 `notes` 단언 + 사칭 `message` push, 변이표 B 갱신 | 갈래를 따라가 **변이 B 를 실제로 구분함**을 확인 (§2.10). 검증 원칙 표 행도 함께 갱신됨 | **닫힘** |
| **H-02** | High | 정정 — AC-002 왕복 최종 확정, AC-003 (나) 신설, `open_questions: 0` 을 참으로 | 자기부정 문단·"미검증으로 남기는 것" 문단 **삭제 확인**. 그러나 확정됐다는 AC-002 코드가 **존재하지 않는 심볼**을 부르고 DoD 는 "그대로 실행"을 요구한다(§2.5). AC-003 (나)의 대기 한 줄은 무동작(§2.12 N-8). AC-013 전이 1·2 가 개정된 계획과 충돌(§2.4) | **열림** (본체 닫힘, 실행 가능성 미달) |
| **H-03** | High | 정정 — `DIST` 절대 경로, `isTransportAllowed`·`resolveUrl` import 추가 | `acceptance.md:65·71` 에서 둘 다 확인. 형제 `index-wiring.test.ts:62` 와 동형. 감사가 짚지 않은 "잘못된 이유의 통과" 위험을 본문에 적은 것도 확인 | **닫힘** |
| **M-01** | Medium | 정정 — 루프백 네 값, `plan.md` 처방 동시 수정, 변이 G | `spec.md:79`·`plan.md:120`·AC-010 3자 일치 확인 (§2.11) | **닫힘** |
| **M-02** | Medium | 정정 — 판정표 9행, 이연 문구 양쪽 삭제, 변이 H | 9행·문구 삭제 확인 (§2.11). 단 조준 변이 G·H 가 6종/8종 불일치로 건너뛰어질 수 있음(별건 N-3) | **닫힘** |
| **M-03** | Medium | 정정 — AC-011 (a)(b) stdout 단언, (d) 갈래 신설, REQ 본문에 "관측 자리" | 셋 다 확인. `spawnChild` 가 stdout 을 모으도록 확장된 것도 확인 | **닫힘** (머리글 "세 갈래" 잔여 — N-10) |
| **L-01** | Low | 이연 (sync) — 운영자 결정 | `spec.md` §5 이연 절·`plan.md` §G·`progress.md` `deferred:` 블록 3자 기록 확인. 제외한 둘(코드 주석·완료 카드 이력)의 사유도 적절 | **닫힘(이연)** |
| **L-02** | Low | 정정 — H-02 정정에 흡수, 10초 타이머 회수 | AC-003 (나)가 같은 `rid` 를 해소하므로 `clearTimeout` 이 걸린다 — 논리 확인 | **닫힘** |

**집계: 진짜로 닫힘 7건 · 올바른 이연 1건 · 여전히 열림 4건**(C-01 · C-02 · C-03 · H-02 — 전부 "본체는 고쳤고 그것을 참조·측정하는 자리를 따라가지 않은" 같은 형태다).

## 7. 새 발견 목록

| ID | 위치 | 내용 | 심각도 | 분류 |
|----|------|------|--------|------|
| **N-1** | `plan.md:82` vs `spec.md:96·306` | 철회된 두 문장("welcome 을 인증 증거로 쓴다", "토큰이 유출되면")이 §E 위험표 첫 줄에 그대로 살아 있다. run 단계가 읽는 자리이며, 남은 공격면을 "발신 집합 대조 한 겹"으로 축소 기술한다. **정정**: 이 행을 §5 의 두 축 서술과 일치하도록 다시 쓰거나, 아래 신설 행(`F-01 의 절반이 열린 채 남는다`)에 흡수해 삭제한다 | **High** | blocking |
| **N-2** | `acceptance.md:653`, `plan.md:169`, DoD 2줄 | 형제 비회귀 게이트가 만족 불가능한 항목 넷을 요구한다 — `AC-CHANPERM-011`·`AC-CHANCLIENT-015` 는 **HEAD 에서 이미 실패**(git 으로 관측), `AC-CHANPERM-012`·`AC-CHANCLIENT-016` 은 vitest 기준이 아니어서 `✓` 줄이 없다. 카드 경계 검사를 다른 카드의 회귀 목록에 넣은 범주 오류 | **High** | blocking |
| **N-3** | `acceptance.md:654·679`, `plan.md:167` (vs `:660`) | 변이표는 8종인데 그것을 소비하는 세 줄이 6종이다. 글자대로 따르면 **G·H 를 건너뛴다** — M-01·M-02 교정을 조준하는 바로 그 두 변이다 | **High** | blocking |
| **N-4** | `acceptance.md:615-632` (AC-CHANAUTH-013) vs `plan.md:105·138·163` | 개정되지 않은 RED→GREEN 기준이 개정된 계획과 세 자리에서 충돌한다(전이 1 의 "002 는 통과", 전이 5 의 CHANPERM-008 단독, M1 단계 1b 전이 부재). DoD 는 013 통과를 요구하므로 run 은 두 문서 중 하나를 어겨야 완료된다 | **High** | blocking |
| **N-5** | `acceptance.md` AC-CHANAUTH-002 코드 블록 | `channel.pushPermissionRequest(REQ)` 는 트리에 존재하지 않는다(`ChannelHandle` 멤버 3개 확인). DoD 는 "계획 단계에서 확정된 **그대로** 실행"을 요구한다. **정정**: 하네스가 이미 들고 있는 `client` 로 `await sendRequest(client, REQ)` 형태를 코드에 직접 적는다 | **Medium** | blocking |
| **N-6** | `acceptance.md:663` 변이표 A 행 | H-01·H-02 정정으로 변이 A 의 실패 집합이 001 → 001·003(가)·004 로 넓어졌는데 표는 그대로다. "하나만 무너뜨려야 한다"는 머리글과 어긋나며, run 이 "기준이 틀렸다"로 판정하면 H-01 정정이 되돌려진다 | **Medium** | blocking |
| **N-7** | `acceptance.md` AC-CHANAUTH-009 (1차 누락, 교정 대상 아님) | 129 × `sendRequest`(각 `tick()` 50ms await) ≈ 6,450ms 로 vitest 기본 `testTimeout` 5,000ms 를 넘긴다(`vitest.config.ts` 에 설정 없음). 상한이 정확히 128 이어도 타임아웃으로 실패하며 그 실패가 상한 결함과 구분되지 않는다 | **Medium** | blocking |
| **N-8** | `acceptance.md` AC-CHANAUTH-003 (나) | `await waitFor(() => settled === 'pending', 'welcome 처리')` 는 호출 시점에 이미 참이라 아무것도 기다리지 않는다. 동기화 지점처럼 읽히지만 어떤 구현에서도 실패할 수 없다 | **Low** | optional |
| **N-9** | `acceptance.md` AC-CHANAUTH-007, `SPEC-CHANPERM-001/acceptance.md` AC-007 | "정규화는 두 방향 어디에 넣어도 걸린다"는 과잉 주장 — 양쪽 정규화 + 원본 전달 구현은 통과한다. 기준 자체는 건전하고 표의 변이도 잡히므로 설명만 정정하면 된다 | **Low** | optional |
| **N-10** | `acceptance.md:555`, `progress.md:37` | (a) AC-011 머리글이 "세 갈래"인데 본문은 네 갈래((d) 신설분 누락). (b) `coupled_revision[0]` 이 `version: 0.4.0` 아래 `items` 에 `REQ-CHANPERM-008` 을 실어, 같은 커밋의 HISTORY "REQ 는 한 건도 바뀌지 않았다"와 어긋난다 | **Low** | optional |

집계: **Critical 0 · High 4 · Medium 3 · Low 3** (총 10건, 그중 blocking 7건).

## 8. Must-Pass 판정

| 항목 | 결과 | 근거 |
|------|------|------|
| MP-1 REQ 번호 일관성 | PASS | `REQ-CHANAUTH-001..013` 연속·중복 없음, 정의 블록 13건 (`grep -o … \| sort -u`, `grep -c "^\*\*REQ-CHANAUTH-"`) |
| MP-2 GEARS 형식 (요구사항 층) | PASS | 13개 REQ 전부 패턴 라벨(While/When/Unwanted/Ubiquitous)과 본문이 일치. 개정된 형제 `REQ-CHANCLIENT-004·005` 의 `(While + When)` 복합절도 GEARS 복합 형태로 적격. 검증 층(Given-When-Then)은 이 항목에서 채점하지 않았다 |
| MP-3 YAML frontmatter | PASS | 12개 정규 필드 전부 존재·타입 일치(`spec.md:2-13`, `version: "0.2.0"`, `updated: 2026-08-28`). snake_case 별칭 없음. 형제 두 SPEC 도 동일 |
| MP-4 언어 중립성 | N/A | 단일 언어(TypeScript/Node) 범위 — 자동 통과 |
| MP-5 D7 교차 SPEC | PASS | 참조 6개 SPEC 전부 존재, `in-progress` 4 · `completed` 2. retired/superseded/archived 없음 |
| MP-6 D8 크로스 플랫폼 | N/A | 세 아티팩트에서 `syscall` 0건 — 자동 통과 |
| MP-7 clarification 마커 | PASS | `grep -rn "NEEDS CLARIFICATION" .moai/specs/SPEC-CHANAUTH-001/` 종료 코드 1. `progress.md` 의 `open_questions: 0` 은 H-02 정정으로 대체로 참이 됐으나 AC-002 하네스 심볼 확정이 실질적으로 열려 있다(N-5) — 마커 게이트와는 별개 |

Must-Pass 는 전부 통과했다. **판정 FAIL 은 Must-Pass 실패가 아니라 차단 결함 7건(1차 잔여 4건 + 새 발견 7건 중 blocking)에 근거한다.**

## 9. 차원 점수

| 차원 | 점수 | 대역 | 근거 |
|------|------|------|------|
| 명확성 (Clarity) | 0.75 | 0.75 | 문장은 대체로 한 가지로만 읽힌다. C-01 교정으로 §1·§2 의 과장이 사라진 것이 큰 개선. 감점은 `plan.md` §E 첫 줄이 같은 문서 안에서 정반대를 말하는 자리(N-1) |
| 완전성 (Completeness) | 0.75 | 0.75 | 필수 절 전부 존재, `### Out of Scope — …` H3 여섯 개에 구체 항목. 형제 개정 두 건이 실재. 감점은 개정이 그 개정을 측정하는 기준(AC-013)과 게이트를 따라가지 않은 것 |
| 검증가능성 (Testability) | 0.65 | 0.50 대역 상단 | 13개 중 셋이 문제다 — AC-002(존재하지 않는 심볼), AC-009(정상 구현도 타임아웃), AC-013(개정된 계획과 충돌). 1차의 네 건(002 자기부정·003 절반 미검증·004 무력·011 경로)은 모두 해소됐으므로 0.50 → 0.65 로 올린다 |
| 추적성 (Traceability) | 0.85 | 0.75~1.0 | 13 REQ ↔ 13 AC 매트릭스가 완전하고 양방향 고아가 없다(REQ-001..013 전건 피복 확인). 감점은 형제 비회귀 목록이 존재할 수 없는 대상을 가리키는 것(N-2) |

종합(조화 평균): **0.74** — 1차 0.55 대비 상승. 점수 퇴행이 없으므로 STOP 신호는 발하지 않는다.

## 10. 권고 — 3회차 진입 전 처리 순서

차단 7건이며, 앞의 넷이 서로 얽혀 있으므로 순서를 지키는 편이 싸다.

1. **N-1 을 먼저 고친다.** `plan.md:82` 위험표 첫 줄을 §5 의 두 축 서술과 일치시키거나 신설 행에 흡수해 삭제한다. C-01 은 이 한 줄로 열려 있다.
2. **N-2 의 결정.** t9 의 형제 비회귀 목록에서 **카드 경계 검사와 전이 기록 넷**(`AC-CHANPERM-011·012`, `AC-CHANCLIENT-015·016`)을 제외하고, 남는 대상을 "vitest 로 실행되는 기준"으로 한정해 다시 적는다. 겸사겸사 "`✓` 줄" 이라는 표현이 어떤 기준에도 글자 그대로 성립하지 않는다는 사실(테스트 이름에 AC 번호가 없다)을 어떻게 다룰지 한 줄로 정한다.
3. **N-4 정정.** AC-CHANAUTH-013 을 개정된 `plan.md` §F 에 맞춘다 — 전이 1 의 002·003(나) 서술, 전이 5 의 다섯 건, 그리고 M1 단계 1b(형제 7건) 전이 신설.
4. **N-3 정정.** `acceptance.md:654`·`:679`, `plan.md:167` 세 곳을 8종으로 고친다.
5. **N-6 정정.** 변이 A 의 예상 실패 기준을 `AC-CHANAUTH-001 · 003(가) · 004` 로 고치거나, "하나만 무너뜨려야 한다"를 "표에 적힌 집합과 정확히 일치해야 한다"로 완화한다.
6. **N-5 정정.** AC-002 의 `channel.pushPermissionRequest(REQ)` 를 `await sendRequest(client, REQ)` 형태로 코드에 직접 적는다(하네스가 이미 `client` 를 돌려준다).
7. **N-7 정정.** AC-CHANAUTH-009 의 129회 루프가 기본 타임아웃을 넘지 않도록 기준 본문을 고친다 — 발신 루프에서만 `tick()` 을 걷어내거나, 이 기준에 한해 명시적 타임아웃을 적는다. run 단계 임의 수정에 맡기지 않는다.

optional 3건(N-8·N-9·N-10)은 오케스트레이터 재량이다. blocking 7건이 닫히기 전에는 run 진입을 권하지 않는다.

---

_감사자: plan-auditor · 반복 2/3 · 대상 커밋 `a7dbeea` · 작성자 추론 맥락 배제(M1 Context Isolation) — `plan-done-2.md` 는 감사 근거가 아니라 감사 대상으로만 읽었다_
