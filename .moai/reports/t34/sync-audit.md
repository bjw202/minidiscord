# t34 sync 감사 — SPEC-PERMROUTE-001

**판정: FAIL — 0.776 (Tier M 통과선 0.80)**

렌즈 `--security --deep`. 감사관 `sync-auditor`(독립·회의적 평가). 판정 귀속: 워크트리
`/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t34` · 브랜치 `WT-perm-verdict-socket` ·
HEAD `dbee7b0` · **커밋되지 않은 sync 편집이 얹힌 작업 트리**(감사 대상은 HEAD 가 아니라 이 트리다).

통과선은 SSOT 에서 직접 읽었다 — `.claude/rules/moai/workflow/spec-workflow.md:330`
「Tier S `0.75`, Tier M `0.80`, Tier L `0.85`」. 디스패치가 전한 값과 일치한다.

---

## 1. 차원 점수

| 차원 | 점수 | 판정 | 증거 (실행한 명령의 축자 출력) |
|---|---|---|---|
| Functionality (40%) | **0.78** | **FAIL** (must-pass) | `npm test -w server` → `Test Files 17 passed (17) / Tests 218 passed (218)` `EXIT=0`; `npm test -w channel` → `Test Files 7 passed (7) / Tests 126 passed (126)` `EXIT=0`; typecheck `server EXIT=0` `channel EXIT=0`. AC 15 중 14 재현. **AC-PERMROUTE-010 이 무너진다 (F-01·F-02·F-03)** |
| Security (25%) | **0.88** | PASS (must-pass) | `grep -rn 'sendToBot' server/src \| grep -v '^server/src/gateway.ts:'` → 무출력 `exit=1` (생산 호출자 0 확증); `connId: randomUUID()` + `import … randomUUID … from 'node:crypto'`; `conns.delete(ws)` 이 `ws.on('close')`·`dropConn` 두 자리에 실재 |
| Craft (20%) | **0.80** | PASS | 변이 여섯 실측 증거 8파일 실재·M1 `1 failed/217` · M3 `3 failed/215` · M4 `4 failed/214` · M5 `22 failed` — 판별 단언이 줄 단위로 갈림 (`:586` vs `:589`) |
| Consistency (15%) | **0.62** | FAIL | 이 SPEC 자신의 §6.1 [HARD]「아무 데도 적히지 않은 적중은 누락」이 **23자리**에서 어겨짐; 표 행수 `20` 인데 기준·DoD 다섯 자리가 `19행` 이라 적음 |

**가중 조화평균 = 0.776** (`1 / (0.40/0.78 + 0.25/0.88 + 0.20/0.80 + 0.15/0.62)`).
산술평균이라면 0.785 로 역시 미달이지만, 판정은 조화평균을 쓴다.

### must-pass 방화벽

`Functionality` 는 must-pass 차원이고 `0.78 < 0.80` 이다. **다른 차원 점수와 무관하게 전체 판정은
FAIL 이다.** 조화평균 0.776 도 독립적으로 통과선 아래이므로 두 경로 모두 같은 결론에 닿는다.

---

## 2. must-pass 점검표

| 항목 | 결과 | 근거 |
|---|---|---|
| SPEC 수용 기준 전건 충족 | **불충족** | AC-PERMROUTE-010 (ㄴ) 실패 — F-02 |
| Security: Critical/High 무발생 | **충족** | 판정이 요청하지 않은 접속에 닿는 경로가 코드 어디에도 없음 (아래 §4) |
| 회귀 비파괴 | 충족 | server 218 · channel 126 **무변동** · typecheck 0 — 전부 직접 재실행 |
| `channel/` 무편집 | 충족 | `git diff --stat -- server/ channel/ web/` → 무출력 |
| 변이 판별력 보고 (AC-011 DoD 2항) | 충족(형식) | 어긋남 2건이 `progress.md` §E.2 에 「보고됨」으로 남음. 다만 M6 은 공허 — F-04 |

---

## 3. 발견 (Findings)

각 항목은 **[심각도] [blocking|optional]** 과 재현 명령·축자 출력을 함께 싣는다.

---

### F-01 [Medium] [blocking] — AC-010 (ㄴ) 은 측정된 적이 없다. §E.3 은 측정하지 않은 값을 관측으로 적었다

`progress.md` §E.3 의 AC-010 행은 이렇게 적는다:

```
| 010 | §6.2 표 양방향 대조 | M5 (다): 표 19행 전부 착지(현 20행 체계)·뒤집힌 자리 표 밖 0건·어간 재실행 …
```

「뒤집힌 자리 표 밖 **0건**」은 관측으로 적혀 있다. 그러나 같은 절의 Gaps 가 스스로 반증한다:

```
- AC-010 의 «역방향 전수 분류표» 완전판(적중 전건의 뒤집힘 여부 대조)은 sync-audit 영역이라
  run 은 어간 재실행·착지 대조까지 담당했다
```

§E.4 도 같은 말을 한다 — 「run 은 어간 재실행과 착지 대조까지만 했고, 적중 하나하나의 「뒤집힘 여부」
전수 분류는 감사 몫으로 남아 있다」.

**두 진술은 함께 참일 수 없다.** 그리고 `progress.md:645` 를 읽으면 무엇이 일어났는지가 드러난다:

```
**(ㄴ) 뒤집힌 자리 중 표에 없는 것**: 이 회차가 편집한 SPEC 자리는 전부 표 1~12행의 자리다 — 표 밖 편집 0건.
```

이것은 **다른 질문에 답한 것이다.** (ㄴ) 이 묻는 것은 「거짓이 된 자리 가운데 표에 없는 것이 몇인가」
— 즉 **탐지 누락**이다. run 이 잰 것은 「내가 편집한 자리 가운데 표 밖이 몇인가」 — 즉 **과잉 편집**이다.
전자는 under-detection, 후자는 over-editing 이고, 후자가 0 이어도 전자에 대해서는 아무것도 말하지 않는다.
표 밖을 한 자리도 편집하지 않는 가장 쉬운 방법은 표 밖을 아예 보지 않는 것이다.

`verification-claim-integrity.md` §1.1 surface 2 의 미관측 주장이다.

**필요한 수리**: §E.3 AC-010 행에서 「뒤집힌 자리 표 밖 0건」을 삭제하고, 이 보고서 §5 의 역방향
분류 결과로 대체한다. 그 값은 0 이 아니다.

---

### F-02 [High] [blocking] — AC-010 (ㄴ) 은 실제로 무너진다. 거짓이 되었으나 표에 없는 자리 **23**

§6.1 이 [HARD] 로 못 박은 규칙:

> **[HARD] 어간에 걸린 자리는 넷 중 하나로 반드시 간다.** … 적중은 §6.2 의 행이 되거나, §6.3 의
> 제외 항목이 되거나, 부류 4 로 이름 붙여지거나 셋 중 하나여야 하며 **아무 데도 적히지 않은 적중은 누락**이다.

전수 분류(§5)에서 이 규칙을 어기는 자리 **23**을 찾았다. 두 부류로 갈린다.

#### (가) 형제 시험 본문의 축자 복제 — **10자리**

`SPEC-PERM-001/acceptance.md` 와 `SPEC-ROOMAUTHZ-001/acceptance.md` 는 시험 본문을 축자로 싣고
「**Then** 테스트가 통과한다」고 단언한다. run 은 M4-7 에서 그 시험 **11자리**를 고쳐야 했다 —
`broker.onGatewayRequest({ roomId, botId }, …)` 직접 호출은 `connId` 가 없어 (ㄴ) 실패 갈래로 빠져
배달 단언이 무너지기 때문이다. 그런데 **그 시험을 축자로 싣고 있는 형제 문서는 한 자리도 고쳐지지 않았다.**

§6.2 18행은 `server/test/permissions.test.ts` 등 **시험 파일**만 싣는다. 그 시험의 **문서 사본**은
표 어디에도 없다. §6.2 11행이 「실패 문구 축자 복제」를 부류로 세운 것과 **정확히 같은 부류**인데
시험 본문 쪽만 빠졌다.

재현:

```
$ bash -c 'A=.moai/specs/SPEC-PERM-001/acceptance.md; …'
title | in acceptance.md? | doc has ws.send(permission_request)?
delivers an allow verdict to the connected bot                 | :251   | NO
delivers a deny verdict as deny, not as allow                  | :270   | NO
accepts a verdict once and lets a repeat fall through as chat  | :313   | NO
never resolves a request from a different room                 | :339   | NO
refuses an unauthenticated verdict and leaves the request pending | :367 | NO
falls through non-matching text and unknown ids without touching the pending request | :397 | NO
marks an undelivered verdict differently from a delivered one  | :436   | NO
accepts all four verdict words, normalizes case, and rejects ids containing l | :473 | NO
same request_id in two rooms keeps both requests resolvable    | ABSENT | -
```

`NO` 는 「문서 사본에 소켓 등록 줄이 없다」는 뜻이고, 소켓 등록이 없으면 그 시험은 붉다. 실물 시험이
어떻게 고쳐졌는지가 그 증거다:

```
$ sed -n '190,200p' server/test/permissions.test.ts
  it('delivers an allow verdict to the connected bot', async () => {
    …
    // SPEC-PERMROUTE-001 (M4-7, 리드 처분) — 요청을 소켓으로 보내 대기 항목에 «살아 있는 connId» 가 실리게 한다.
    // broker 직접 호출은 소켓을 거치지 않아 connId 가 없고, 판정이 (ㄴ) 실패 갈래로 빠져 배달 단언이 무너진다.
    ws.send(JSON.stringify({ type: 'permission_request', … }))
```

같은 부류가 `SPEC-ROOMAUTHZ-001/acceptance.md:700`·`:726` 에 둘 더 있다(실물은
`room-members.test.ts` 의 M4-7 주석 두 자리로 고쳐졌다).

**8 + 2 = 10자리.**

#### (나) 형제 산문·계약의 낡은 진술 — **13자리**

| # | 자리 | 지금 무엇을 주장하는가 | 왜 거짓이 되는가 |
|---|---|---|---|
| 1 | `SPEC-PERM-001/spec.md:41` | 흐름도 `→ Gateway.sendToBot → 채널 → …` | 판정 통로가 `sendToOrigin` 이다. 시제 표지 없는 본문 도해 |
| 2 | `SPEC-PERM-001/spec.md:71` | 의존표 「`SPEC-GATEWAY-001` 에서 받아 쓰는 것: … `Gateway.sendToBot` …」 | 이제 `sendToBot` 을 받아 쓰지 않고 `sendToOrigin` 을 쓴다 |
| 3 | `SPEC-PERM-001/plan.md:24` | 「`sendToBot(...)` \| 판정 전송. **반환값을 읽는다**」 | 판정 전송이 아니고 그 반환값을 읽지 않는다 |
| 4 | `SPEC-PERM-001/plan.md:201` | 구현 단계 「… → `sendToBot` 호출과 **반환값 수신** → …」 | 같은 이유 |
| 5 | `SPEC-PERM-001/acceptance.md:262` | 「`sendToBot` 호출을 빠뜨린 구현에서는 `seen` 이 `null` 이라 …」 | 판별자가 `sendToOrigin` 이다 |
| 6 | `SPEC-PERM-001/acceptance.md:545` | 위험표 「봇이 판정 직전에 끊긴다 \| `sendToBot` 이 `false` → …」 | 갈래가 `sendToOrigin` 의 `false` + `connId` 부재 둘로 바뀜 (REQ-PERMROUTE-007) |
| 7 | `SPEC-GATEWAY-001/spec.md:234` | 「이 SPEC 은 `sendToBot` 이라는 전송 창구와 `setPermissionHandler` 라는 수신 창구**만** 제공한다」 | `sendToOrigin` 이 셋째 창구로 늘었다 |
| 8 | `SPEC-GATEWAY-001/plan.md:41` | 「`sendToBot(...)` \| 다음 카드의 `permissions.ts` \| 반환값 불리언이 … **유일한 신호**다」 | 소비자가 사라졌고 유일한 신호가 아니다 |
| 9 | `SPEC-GWAUTH-002/spec.md:203` | 「서버가 보내는 모든 경로(`welcome`·재전송·`sendToConn`·`deliver`·`sendToBot`)」 | 여섯째 `sendToOrigin` 이 빠졌다 |
| 10 | `SPEC-GWAUTH-002/spec.md:624` | 「`gateway.ts` 의 **발신 지점 다섯** — `:109` · `:123` · `:202` · …」 | 여섯이다 |
| 11 | `SPEC-GWAUTH-002/acceptance.md:937` | 「**다섯 경로** 각각에 양성 …」 | 여섯이다 |
| 12 | `SPEC-CHANPERM-001/spec.md:210` | 소유 목록 「… `PERMISSION_REPLY_RE` 판정 파싱, **`sendToBot` 호출**과 전달 실패 문구」 | 판정 경로가 `sendToBot` 을 부르지 않는다 (REQ-PERMROUTE-006 이 금지) |
| 13 | `server/test/permissions.test.ts:170` | 주석 「`sendToBot`가 실제로 가는지는 게이트웨이 연결이 없으므로 false(전송 실패)지만 …」 | 통로도 실패 사유도 바뀌었다. AC-009 (가) 어간 수리가 `server/src` 만 훑어 `server/test` 를 놓쳤다 |

**9~11 은 리드 처분의 전제를 반증한다.** `lead-decisions.md` 「추가 처분 — 형제 개정 범위 제한」은
「`SPEC-GWAUTH-002` **열거 7자리**는 본문 재작성 금지, 자리당 한 줄 개정 주석만」이라 적었고, §6.2 9행이
그 앵커 일곱을 싣는다. 일곱은 전부 착지했다(확인함). 그러나 **일곱이 전부가 아니다** — 위 셋이 더 있고
개정 주석이 없다. 리드가 상한을 건 대상 자체가 과소 계수였다.

이 카드는 같은 부류를 이미 두 번 겪었다(「형제 시험 7 → 14」·「어간 둘 → 열둘」). 이것이 세 번째다.

**필요한 수리**: 23자리 각각을 §6.2 의 행으로 싣거나, §6.3 으로 보내거나, 부류 4 로 이름 붙인다
(셋 중 하나 — §6.1 [HARD]). 리드 상한이 「주석 1줄」이면 그대로 적용하되, **적히지 않은 채 남겨서는 안 된다.**

---

### F-03 [Medium] [blocking] — AC-010 의 기준 본문이 자기가 재는 표를 한 행 적게 센다

`spec.md` §6.2 의 실제 행수:

```
$ awk '/^### 6.2 /,/^### 6.3 /' .moai/specs/SPEC-PERMROUTE-001/spec.md | grep -cE '^\| [0-9]+ \|'
20
```

그런데 그 표를 재는 기준과 DoD 는 `19행` 이라 적는다:

```
$ grep -nE '19행|13~19' .moai/specs/SPEC-PERMROUTE-001/{acceptance,plan,spec}.md
acceptance.md:34 : | AC-PERMROUTE-010 | … | 개정 대조표 **19행** 각각이 …
acceptance.md:181: **Given** `spec.md` §6.2 의 개정 대조표 **19행**.
acceptance.md:183: **Then** (ㄱ) 19행 전부가 대상 문서에서 **실제로** 착지했고 …
acceptance.md:359: 3. `spec.md` §6.2 개정 **19행**이 양방향 대조를 통과 (AC-PERMROUTE-010) …
plan.md:164      : … 표는 **19행**이다. …
plan.md:208      : `spec.md` §6.2 의 **13~19행**이 이 단계의 목록이다. …
spec.md:112      : … 그 목록은 §6.2 의 13~19행이 전부다 …
```

**「19행 전부가 착지했다」는 20행 표에서 20행이 착지하지 않아도 참이다.** 기준에 정확히 한 행 크기의
구멍이 있고, 그 구멍은 run 이 스스로 더한 행(20행)의 자리다. 이번에는 20행도 실제로 착지했으므로
(`SPEC-GATEWAY-001/acceptance.md:192` 확인) 실해는 없다. 그러나 기준이 재는 대상과 어긋나 있다는
사실은 남는다.

**부수 발견 — 공시 자체가 틀렸다.** `progress.md:651` 은 잔존 자리의 「대표」로 `spec.md:112`
(「§6.2 의 13~19행」)를 지목하고 「20행이 늘어 13~20 이 참이 됨」이라 적는다. 그러나 20행은
`SPEC-GATEWAY-001/acceptance.md` — **문서 행**이지 「낡은 주석·상수·단언의 기계적 편집」 행이 아니다
(13~19행은 전부 `server/`·`web/` 코드다). 즉 `spec.md:112` 는 **여전히 참**이고, 정작 거짓이 된
`acceptance.md:34`·`:181`·`:183`·`:359`·`plan.md:164` 다섯은 공시가 이름 붙이지 않았다.
리드의 「셋 밖 손대지 않는다」 지시가 덮는 범위를 판단하려면 이 정정이 먼저 필요하다.

---

### F-04 [Medium] [blocking] — 변이 M6 은 REQ-PERMROUTE-010 에 대해 판별력이 0 이다

`acceptance.md:358` 은 M6 의 판정값을 이렇게 고정한다:

> **M6 은 「서버 쪽 0건」이 판정값**이며, 어겨지면 REQ-PERMROUTE-010 이 반증된 것으로 보고한다

그런데 서버 패키지는 `channel/` 을 **한 줄도 import 하지 않는다**:

```
$ grep -rn "from .*channel" server/src server/test
(무출력)
```

따라서 `channel/src/channel-server.ts` 의 두 줄을 지우는 변이가 서버 기준을 무너뜨리는 것은
**모듈 위상 때문에 애초에 불가능하다.** 「서버 쪽 0건」은 변이를 돌리기 전에 이미 결정돼 있었다.
M6 은 실패할 수 없는 변이이고, 실패할 수 없는 변이는 아무것도 재지 않는다.

`spec.md` §7 성공의 정의 2번도 같은 모양이다 — 「서버 패키지 안에서만 측정되고, 그 측정이 채널 가드의
존재와 무관하게 성립한다」. 서버가 가드를 볼 수 없으므로 이 문장은 **구성상 반증 불가능**이다.

**다만 결론 자체는 참이다.** REQ-PERMROUTE-010(판정 전달의 정확성이 `emitted` 가드에 의존하지 않는다)은
독립적으로 성립하며, 그 근거는 M6 이 아니라 §4 의 라우팅 관측이다 — `sendToOrigin` 이 유일한 `connId`
하나에만 보내고, `sendToBot` 의 생산 호출자가 0 이므로, 요청하지 않은 접속에 판정 프레임이 **도착하는
사건 자체가 없다.** 도착하지 않는 프레임은 버릴 가드가 필요 없다.

즉 **주장은 옳고 인용된 증거가 공허하다.** 이 프로젝트가 이미 두 번 기록한 부류다
(`spec-criteria-that-verify-nothing` · `criterion-rogue-weaker-than-real-attacker`).

**필요한 수리**: M6 의 판정값에서 「서버 쪽 0건」을 빼거나, 그것이 위상적으로 자명함을 표 안에 공시하고
REQ-PERMROUTE-010 의 측정 책임을 AC-003b(요청하지 않은 소켓 0건 수신)와 AC-009(가)(생산 호출자 0)에
명시 귀속한다. 채널 쪽 5 failed 관측은 「가드가 채널 기준에 대해 살아 있다」를 재므로 그대로 유효하다.

---

### F-05 [Low] [blocking] — 감사 전에 `status: completed` 가 설정됐다

```
$ git diff -- .moai/specs/SPEC-PERMROUTE-001/spec.md | grep -E '^[+-](status|updated)'
-status: in-progress
+status: completed
```

같은 커밋의 §E.4 는 스스로 이렇게 적는다 — 「**sync-audit 판정 없음.** 이 신호는 「감사 받을 준비가
됐다」는 뜻이지 「통과했다」가 아니다」. 프론트매터와 본문이 정면으로 충돌한다. 이 감사가 FAIL 이므로
`completed` 는 지금 거짓이다.

**필요한 수리**: `status` 를 `in-progress` 로 되돌리고, 감사 PASS 뒤에 전이한다.

---

### F-06 [Low] [optional] — AC-011 의 제외 규칙이 실제로 제외한 것을 덮지 못한다

변이표 머리는 **집계 기준**(AC-012 전체 · AC-007 의 절반) 제외 규칙을 [HARD] 로 적고 「표 전체에
적용되는 규칙」이라 선언한다. 그러나 실측에서 함께 제외된 것이 하나 더 있다 — **형제 SPEC 의 기준**이다.

```
$ grep -c '^ *× ' .moai/reports/t34/evidence/M6-mutation-M5.txt   (발췌)
M5: Failed Tests 22 — never lets a non-member approve … / relays permission_request … / dumps the real broker bodies …
```

M5 는 22건을 무너뜨렸고 그 다수가 `SPEC-ROOMAUTHZ-001`·`SPEC-GATEWAY-001`·골격 B 의 기준이다.
표의 M5 행은 다섯 원소만 적는다. 리드가 M2 에 대해 「형제 시험 14건 붉음 «기준 밖» 수용」이라 처분한
기록은 있으나(`lead-decisions.md`), **표의 [HARD] 제외 규칙에는 그 부류가 없다.** 「한 행만 고치면
나머지가 조용히 거짓이 된다」를 막으려고 만든 규칙이 정작 자기 적용 범위를 빠뜨렸다.

---

### F-07 [Low] [optional] — M3·M4 판별자가 줄 번호 하나이고 기계적 집행이 없다

개정된 표에서 M3 = `005 전부 · 006 · 013`, M4 = `006 · 013 · 005 문구 절반` 이므로 두 행을 가르는
것은 오직 「AC-005 시험의 어느 절반이 붉었는가」다. 실측은 그것을 지지한다:

```
M3: ❯ test/permissions.test.ts:586:38     (고유 관측 — 남은 소켓 0건)
M4: ❯ test/permissions.test.ts:589:22     (문구 절반)
```

판별은 **관측으로 뒷받침되며 재현 가능하다** — 이 점은 건전하다. 약점은 내구성이다. `permissions.test.ts`
에 줄 하나가 들어가는 순간 `:586`·`:589` 는 다른 것을 가리키고, 그때 표는 조용히 틀린다. 보완으로 더한
[HARD]「비교 보고는 시험 이름이 아니라 앵커를 인용한다」는 **관례일 뿐 집행자가 없다** — 이를 검사하는
시험도, 린트도, 명령도 없다. `spec.md` §6.2 가 줄 번호에 대해 「앵커로 다시 찾는다」를 [HARD] 로 둔 것과
같은 처방이 필요하다(단언 텍스트를 앵커로 삼는 형태).

---

### F-08 [Info] [optional] — (ㄴ) 실패 문구의 정보 노출

`REQ-PERMROUTE-007` (ㄴ) 문구 「⚠️ 요청한 세션의 신원이 기록되지 않아 판정을 전달하지 못했습니다」는
방 system 메시지로 저장·발행되므로 **그 방의 모든 멤버**가 읽는다. 노출되는 것은 「요청이 소켓을 거치지
않고 만들어졌다」는 서버 내부 상태다.

노출 가치는 낮다고 판단한다 — 봇의 접속 여부는 초대 목록 `online` 으로 이미 멤버에게 보이고
(`SPEC-GATEWAY-001` AC-GW-018), (ㄴ) 갈래는 실제 운용에서 소켓 없는 직접 호출(시험 경로)에서만
발생한다. 판정을 바꾸지 않는 정보성 관측으로 남긴다. 방 멤버가 신뢰 경계 밖이 아니라는 전제에 기대고
있으므로, 그 전제가 바뀌면 재검토 대상이다.

---

## 4. Security 렌즈 — 상세

디스패치가 지목한 항목을 하나씩 잰다. **판정: Critical/High 무발생.** 이 카드의 무게중심은 실제로 서 있다.

### 4.1 판정이 요청하지 않은 접속에 닿는 경로가 있는가 — **없다**

경로를 전수로 짚었다.

- **`sendToOrigin`** — `for (const [ws, c] of conns) if (c.connId === connId) { sendEstablished(c, ws, payload); return true }`.
  `connId` 는 접속마다 유일하므로 「첫 일치」가 곧 「유일 일치」다. 다른 어떤 접속에도 프레임이 가지 않는다
  (REQ-PERMROUTE-005 충족).
- **`sendToBot`(전원 발신)** — **생산 호출자 0.** 기계로 확인:
  ```
  $ grep -rn 'sendToBot' server/src | grep -v '^server/src/gateway.ts:'
  (무출력)  exit=1
  $ grep -nE 'sendToBot\(roomId: number|sendToBot\(roomId,' server/src/gateway.ts
  29:  sendToBot(roomId: number, botId: number, payload: object): boolean
  361:    sendToBot(roomId, botId, payload) {
  ```
  선언과 구현 두 행만 남고 호출부가 없다. REQ-PERMROUTE-011 의 「생산 호출자 0」 주장은 **참이다.**
- **대체 발신(fallback)** — 없다. 브로커는 `info.connId != null ? sendToOrigin(...) : false` 이고
  `false` 갈래에서 곧장 문구 생성으로 간다. `sendToBot` 대체 호출이 코드에 존재하지 않는다
  (REQ-PERMROUTE-008 충족).
- **재접속(같은 봇, 새 소켓)** — 새 소켓은 `randomUUID()` 로 **새 `connId`** 를 받는다. 낡은 대기 항목의
  `connId` 는 어떤 접속에도 맞지 않아 `sendToOrigin` 이 `false` 를 돌려주고 (ㄱ) 문구로 끝난다.
  **오배달이 아니라 미배달이 된다** — 이 SPEC 이 의도한 갈래 그대로다.
- **`connId` 충돌·재사용** — `randomUUID()` 는 v4(122비트 CSPRNG)이고 재사용 경로가 없다.
- **죽은 소켓 잔존** — 없다. `conns.delete(ws)` 가 `ws.on('close')`(`:115`)와 `dropConn`(`:124`)
  **두 자리**에 있다. 따라서 `sendToOrigin` 이 이미 끊긴 소켓을 맞힐 수 없다.

### 4.2 `connId` 는 추측 불가·열거 불가인가 — **그렇다**

```
$ grep -n 'randomUUID' server/src/gateway.ts
6:import { createHmac, createPublicKey, randomBytes, randomUUID, verify } from 'node:crypto'
212:      connId: randomUUID(),
```

`node:crypto` 의 CSPRNG 이다. 값에서 방·봇·순서·시각 어느 것도 읽히지 않고, 연속 발급값 사이에 관계가
없어 열거가 불가능하다(REQ-PERMROUTE-001 의 「불투명」 충족). 발급은 `conns.set(ws, conn)` 직전
구성 자리 **하나**에서만 일어난다.

### 4.3 `connId` 가 새는 곳이 있는가 — **없다**

- **프레임** — 나가는 판정 payload 는 `{ type: 'permission_verdict', request_id, behavior }` 이고
  `connId` 를 담지 않는다.
- **저장 메시지** — `postSystem(info.roomId, body)` 의 `body` 는 네 문구 중 하나이며 전부
  `(${requestId})` 만 싣는다. `connId` 는 어느 문구에도 없다.
- **웹 UI** — `web/` 에 `connId` 어간 적중 0.
- **핸들러** — `permissionHandler?.({ roomId, botId, connId }, msg)` 는 프로세스 내부 호출이고
  브로커의 `Map<string, ConnInfo>` 에만 머문다.

`connId` 는 서버 프로세스 밖으로 나가지 않는다. 값 자체가 권한을 주지 않으므로(게이트웨이의 접속 목록
안에서만 접속으로 해석된다) 유출되더라도 인가 상승은 없으나, 유출 자체가 없는 편이 낫고 실제로 없다.

### 4.4 재생산 방지 조항은 집행되는가 — **기계로 집행된다**

REQ-PERMROUTE-006 의 「판정 경로에서 `Gateway.sendToBot` 을 호출해서는 안 된다」는 산문에만 있지 않다.
`AC-PERMROUTE-009` (가) 가 그것을 명령으로 집행하고, 그 명령은 **오늘 실제로 판별력이 있다** —
착지 전에는 1건을 돌려주어 붉었고 지금은 0건이다. 내가 직접 재실행해 `exit=1` 을 확인했다(§4.1).
「유지하되 죽은 메서드」라는 위험한 조합에 대해 이것은 적절한 방어다.

다만 **훑기 범위가 `server/src` 뿐**이다. 그래서 `server/test/permissions.test.ts:170` 의 낡은
`sendToBot` 주석이 살아남았다(F-02 #13). 다음 사람이 그 주석을 읽고 통로를 오해할 여지가 남는다.

### 4.5 lifecycle·경합·무한 증식 (deep 렌즈)

- **판정 배달과 끊김의 경합** — `open.delete(...)` 가 발신 **시도보다 먼저** 일어난다. 그래서 발신
  직전에 소켓이 죽어도 대기 항목은 이미 소모됐고 (ㄱ) 문구가 저장된다. 같은 답을 무한 재시도할 수 없다는
  뜻이며 설계 의도와 맞다. **다만 그 자리의 주석은 「해제는 전송 시도 **직후**」라 적는다 — 코드는 직전이다.**
  `SPEC-PERM-001` 시절부터의 선재 결함이고 이 카드가 만든 것이 아니라 범위 밖으로 남기되, 기록해 둔다.
- **무한 증식** — 대기 레지스트리 `open` 은 접속 종료로 정리되지 않는다. 이것은 REQ-PERMROUTE-009 가
  **명시적으로 요구한 성질**이며(`SPEC-PERM-001` REQ-PERM-003 승계), AC-014 (ㄷ) 가 「접속 종료 두 경로에
  브로커·대기 레지스트리 참조 0건」으로 그것을 재고 내가 `0`·`0` 을 재현했다. 이 카드가 더한 것은 항목당
  문자열 하나(`connId`)뿐이다. **선재 잔여 위험이지 t34 의 결함이 아니다.**
- **조용히 삼켜지는 배달 실패** — 없다. `sendToOrigin` 의 반환값이 `sent` 로 읽히고 세 갈래 문구로
  갈라져 방에 저장·발행된다. 실패가 화면상 성공으로 보이는 경로가 없다.
- **`conns` 증식** — 두 자리 삭제로 정리된다(§4.1).

---

## 5. AC-PERMROUTE-010 역방향 전수 분류

리드가 이 감사에 명시 배정한 항목이다.

### 5.1 재현 조건과 [HARD] 두 함정

**범위를 먼저 재현했다** — §6.1 의 119 / 116 과 정확히 일치한다:

```
$ bash -c 'ls .moai/specs/*/{spec,plan,acceptance,design,research}.md; ls server/src/*.ts server/test/*.ts channel/src/*.ts web/*.js' | sort -u | wc -l
119
$ … | grep -v SPEC-PERMROUTE-001 | wc -l
116
$ diff .moai/reports/t34/evidence/M5-scope-ex-self.txt <재구성본>
IDENTICAL
```

**함정 ① `bash` 로 돌려야 한다.** §6.1 의 [HARD] 경고를 확인했다 — 사실이다:

```
$ zsh -c 'F=$(cat scope-ex-self.txt); grep -n -- "sendToBot" $F | wc -l'
web/app.js
web/rich.js: File name too long
       0
$ bash 로 같은 명령 → 67
```

`zsh` 는 `$F` 를 분할하지 않아 파일 목록 전체를 파일명 하나로 넘긴다. `0` 은 「적중 없음」이 아니라
**셸이 명령을 망가뜨린 것**이다. 이 경고는 잘 쓰였다.

**함정 ② 기록된 수는 움직인다.** 기록값은 HEAD `6a359f8` 기준이고 지금은 `dbee7b0` + sync 편집이다.
**움직인 것은 결함이 아니다.**

### 5.2 어간별 적중 — 현재값 (HEAD `dbee7b0` + sync 작업 트리, `bash`, 116 파일)

| 어간 | 현재 적중 | `M5-section6-rerun.txt` 기록값 | 차이 | 설명 |
|---|---|---|---|---|
| `ConnInfo` | 31 | 31 | 0 | |
| `sendToBot` | 67 | 67 | 0 | |
| `sendToConn` | 27 | 27 | 0 | |
| `onGatewayRequest` | 47 | 47 | 0 | |
| `setPermissionHandler` | **35** | 33 | **+2** | sync 의 `acceptance.md`·`plan.md` 편집 |
| `sendEstablished` | 15 | 15 | 0 | |
| `발신 지점` | 19 | 19 | 0 | |
| `다섯`(좁힘) | 58 | 58 | 0 | |
| `@MX:WARN` | 5 | 5 | 0 | 6 → 5 는 13행 착지(gateway.ts 에서 제거, `exit=1` 확인) |
| 실패 문구 | **27** | 26 | **+1** | 같은 사유 |
| 세 템플릿 | 3 | 3 | 0 | 4 → 3 은 19행 착지(`web/rich.js:62` 세→네, 확인) |
| `[0-9]개 메서드` | 2 | 2 | 0 | 20행 착지로 1 → 2 |

**합계 336 적중 / 중복 제거 264 자리.** 세 자리의 이동(+3)은 전부 이 sync 단계가 편집한 파일에서
나왔고 run 의 기록된 편집으로 설명된다 — **드리프트 결함 아님.**

### 5.3 역방향 분류 — 264 자리 전건

각 자리를 읽고 셋으로 갈랐다. **표본이 아니라 전건이다** — 264 자리를 파일별로 전부 출력해 읽었고,
증거는 `.moai/reports/t34/evidence/audit/audit-unique-hits.txt` 와 그 파일별 본문 덤프다.

| 부류 | 자리 수 | 뜻 |
|---|---|---|
| **(i) 거짓이 되었고 §6.2 표에 있다** | 41 | 20행이 덮는 앵커 전건. 개정 주석 22개가 형제 문서에 실재함을 확인 |
| **(ii) 거짓이 되었는데 표에 없다** | **23** | **AC-010 이 잡으라고 존재하는 결함 부류 — F-02** |
| **(iii) 거짓이 되지 않는다 (부류 3·4)** | 200 | 아래 |

**(iii) 의 내역** — 무관한 「다섯」(`SPEC-ROOM-001` 다섯 경로 · `SPEC-WEBCHAT-001` 다섯 export ·
`SPEC-CHANAUTH-001` 다섯 타입 · `SPEC-GWAUTH-001` 다섯 필드 · `SPEC-GATEWAY-001` 다섯 거절 경로),
HISTORY 행과 감사 보고서 인용(부류 3), 규칙 선언(`SPEC-LIVEVERIFY-001/spec.md:156` ·
`acceptance.md:154`·`:160`), 줄임표 인용(`SPEC-WEBRICH-001/acceptance.md:615` ·
`SPEC-CHANPERM-001/spec.md:124`), 정규식 갈래를 세는 자리(`web/rich.js:59` ·
`server/test/web-rich.test.ts:150` — §6.1 이 부류 4 로 이름 붙인 판정에 **동의한다**;
`RESOLUTION_RE` 원문을 직접 읽어 갈래가 셋 그대로임을 확인했다), 이 카드가 직접 편집한 생산 코드·시험,
`sendEstablished` 승계 자리.

**§6.1 의 두 판정을 상대로 이의 없음.** `web/rich.js:59`·`server/test/web-rich.test.ts:150` 을 부류 4 로
둔 것은 옳다 — 실패 문구가 (ㄱ)(ㄴ) 둘로 갈려도 꼬리 「전달하지 못했습니다」가 같아 정규식 갈래는 셋이다.
`SPEC-WEBRICH-001/plan.md:234` 를 뺀 N-04 판정에도 동의한다.

### 5.4 (ii) 23자리 — F-02 의 표를 참조

(가) 시험 본문 축자 복제 10 + (나) 형제 산문·계약 13. 전체 목록·재현 명령·축자 출력은 F-02 에 있다.

### 5.5 정방향 (ㄱ) — 통과

20행 전부가 대상 문서에서 착지했다. 형제 문서의 개정 주석 22개를 기계로 확인했다:

```
$ grep -rn "SPEC-PERMROUTE-001" .moai/specs/ --include="*.md" | grep -v "specs/SPEC-PERMROUTE-001/" | wc -l
22
```

처분란 일치도 확인했다 — 주석 1줄 처분 자리에 본문 재작성이 없다. **(ㄱ) 은 PASS 이고, 실패하는 것은
(ㄴ) 뿐이다.**

---

## 6. 디스패치가 지목한 다섯 주장의 검증 결과

| # | 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | server 218 · channel 126 · typecheck 0 | **참** | 직접 재실행. `Tests 218 passed (218)` `EXIT=0` · `Tests 126 passed (126)` `EXIT=0` · `server EXIT=0` `channel EXIT=0`. **`transport-auth.test.ts` 플레이크는 이번 회차에 재현되지 않았다** — 두 스위트 모두 1회차 실행에서 초록 |
| 2 | §E.3 AC 15 관측 표 | **표본 4행 전부 참** | AC-007 `0건 exit 1` · AC-009 `(가) 0건 exit 1` `(나) 2행` · AC-012 `218·126·0` · AC-014 `2·6·0·0` — 전부 인용값과 정확히 일치. **재현 실패 행 없음.** 단 AC-010 행은 관측이 아니다(F-01) |
| 3 | AC-011 표 개정의 정당화 | **대체로 건전, 조건부 수용** | 아래 |
| 4 | M3·M4 판별자 | **관측 뒷받침 있음, 내구성 없음** | F-07 |
| 5 | 감사 전 `status: completed` | **시기상조** | F-05 |

### 6.1 주장 3 을 적대적으로 검증한 결과

정당화의 사실 전제를 먼저 확인했다 — **참이다:**

```
$ git log --oneline -S "남은 소켓" -- server/test/permissions.test.ts
4f707c2 test(SPEC-PERMROUTE-001): M6-0 수용 기준 시험 4건 신설 — AC-001·002·004·005 (card t34)
```

AC-005 시험은 `4f707c2` 에서 처음 태어났고, 변이표는 그보다 앞선 plan 단계에서 도출됐다. 따라서
그 표의 M4·M5 행은 **존재하지 않는 시험에 대해 아무 예측도 하지 않았다.** 나중에 생긴 시험을 상대로
행을 다시 내는 것은 완화가 아니라 재도출이다. 여기까지는 논증이 선다.

**세 가지를 더 확인해 보강한다.**

1. **방향이 완화가 아니다.** 개정은 M4·M5 의 「무너져야 하는 기준」 집합을 **넓힌다**. 완화는 집합을
   좁혀 통과를 쉽게 만드는 것이고, 이 개정은 반대로 표를 **더 엄격하게** 만든다. AC-011 의 [HARD]
   가 금지하는 부류가 아니다.
2. **원 어긋남이 보존됐다.** `progress.md` §E.2 M6 절과 `lead-decisions.md` 「run M6 판독 … 어긋남 ①
   처분 (나)」에 원문이 살아 있다. DoD 2항의 충족 근거가 표가 아니라 그 보고라는 서술도 정확하다.
3. **절반의 지목이 추론이 아니라 관측이다.** 이것이 결정적이었다. 개정은 M4·M5 가 「문구 절반」만
   무너뜨렸다고 특정하는데, 증거가 그것을 직접 지지한다:
   ```
   M4: ❯ test/permissions.test.ts:589:22   (문구 절반)
   M3: ❯ test/permissions.test.ts:586:38   (고유 관측)
   ```
   서로 다른 줄이 붉었다. 「어느 절반인지」를 사후에 골라 맞춘 것이 아니라 **출력에 적혀 있었다.**

**결론: 합리화가 아니다. 수용한다.** 붙이는 조건 둘 — (ㄱ) 개정된 표를 상대로 M4·M5 를 **재실행하지
않았다.** 지금 표는 「기존 증거를 다시 읽어 맞다」이지 「개정 후 다시 돌려 맞다」가 아니다. 이것은 Gap 으로
남는다(§8). (ㄴ) 판별자의 내구성 문제는 별건으로 남는다(F-07).

---

## 7. 권고

**차단 다섯을 닫아야 재판정 대상이 된다.**

1. **F-02** — (ii) 23자리를 §6.2 행 / §6.3 / 부류 4 셋 중 하나로 처분한다. 리드 상한이 「주석 1줄」이면
   그대로 적용한다. **처분 없이 남겨서는 안 된다** — §6.1 [HARD] 가 그것을 누락으로 정의한다.
   특히 GWAUTH-002 셋(9·10·11번)은 리드의 「열거 7자리」 전제를 반증하므로 **리드 재처분 사안**이다.
2. **F-03** — `19행` 다섯 자리를 `20행` 으로 맞춘다(`acceptance.md:34`·`:181`·`:183`·`:359` ·
   `plan.md:164`). `progress.md:651` 의 공시도 함께 정정한다 — 지목된 `spec.md:112` 는 실제로는 참이다.
3. **F-01** — §E.3 AC-010 행에서 「뒤집힌 자리 표 밖 0건」을 삭제하고 이 보고서 §5 로 대체한다.
4. **F-04** — M6 의 판정값에서 「서버 쪽 0건」을 빼거나 위상적 자명성을 공시하고, REQ-PERMROUTE-010 의
   측정을 AC-003b·AC-009(가)에 명시 귀속한다.
5. **F-05** — `status` 를 `in-progress` 로 되돌린다.

**선택 사항** — F-06(형제 기준 제외 규칙 명문화) · F-07(판별자를 앵커로) · F-02 #13(`permissions.test.ts:170`
주석, AC-009 (가) 훑기 범위에 `server/test` 추가) · §4.5 의 선재 주석 오류(「직후」→「직전」, 범위 밖).

**재감사 범위는 위 다섯의 델타로 한정한다.** 정방향 (ㄱ), Security 렌즈 전건, AC 14행 재현, 스위트·타입검사는
이 회차에 통과했으므로 다시 열지 않는다.

**이 카드가 잘한 것도 기록한다** — 판정을 요청한 접속에만 되돌린다는 무게중심은 실제로 서 있고,
생산 호출자 0 이 기계로 집행되며, 변이 여섯의 증거가 축자로 남아 있고, `zsh` 함정을 [HARD] 로 미리
경고한 것은 이 감사가 그대로 덕을 봤다. FAIL 은 구현이 아니라 **장부**에 대한 것이다.

---

## 8. 5절 블록

### Claim (주장)

SPEC-PERMROUTE-001 의 sync 단계 산출물은 Tier M 통과선 0.80 에 **미달한다(0.776)**. 구현과 보안 성질은
건전하나, 수용 기준 AC-PERMROUTE-010 의 역방향 절반이 **측정된 적 없고 실제로 무너지며**(표에 없는
거짓 자리 23), 그 기준의 본문이 재는 대상을 한 행 적게 세고, REQ-PERMROUTE-010 에 인용된 변이 M6 은
판별력이 0 이다.

### Evidence (증거)

이 회차에 실행한 명령과 축자 출력. 전문은 `.moai/reports/t34/evidence/audit/` 에 있다.

- `npm test -w server` → `Test Files 17 passed (17)` `Tests 218 passed (218)` `EXIT=0`
  (`audit/audit-server-test.txt`)
- `npm test -w channel` → `Test Files 7 passed (7)` `Tests 126 passed (126)` `EXIT=0`
  (`audit/audit-channel-test.txt`)
- `npm run typecheck -w server|channel` → `server EXIT=0` `channel EXIT=0` (`audit/audit-typecheck.txt`)
- 범위 재구성 → `119` / `116`, `diff … IDENTICAL` (`audit/audit-scope-{all,ex-self}.txt`)
- 어간 12 재실행(bash) → §5.2 표 (`audit/audit-stem-counts.txt`)
- 적중 전건 → `336` / 중복 제거 `264` (`audit/audit-all-hits.txt` · `audit/audit-unique-hits.txt`)
- `grep -rn 'sendToBot' server/src | grep -v '^server/src/gateway.ts:'` → 무출력 `exit=1`
- `grep -nE 'sendToBot\(roomId: number|sendToBot\(roomId,' server/src/gateway.ts` → `29:` · `361:` (2행)
- `sed -n '/^export interface Gateway {/,/^}/p' … | grep -cE '^  [a-zA-Z_]+\('` → `6`
- `sed -n "/ws.on('close'/,/})/p" … | grep -icE 'permission|broker|pending'` → `0`; `dropConn` → `0`
- `grep -rn "from .*channel" server/src server/test` → 무출력 (F-04 의 근거)
- `awk '/^### 6.2 /,/^### 6.3 /' spec.md | grep -cE '^\| [0-9]+ \|'` → `20`
- `git log -S "남은 소켓" -- server/test/permissions.test.ts` → `4f707c2`
- 8개 시험 블록 대조표 (`audit/audit-ac010-perm001-blocks.txt`)
- `zsh` 함정 재현 → `File name too long` / `0` (bash 는 `67`)

### Baseline-attribution (baseline 귀속)

전 명령을 워크트리 `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t34`,
브랜치 `WT-perm-verdict-socket`, HEAD `dbee7b0`, **커밋되지 않은 sync 편집이 얹힌 작업 트리**에 대해
2026-09-04 이 감사 회차에 실행했다. §5.2 의 대조 기준선은 `evidence/M5-section6-rerun.txt`
(run M5 회차, HEAD 는 그 시점 값)이며, 차이 +3 은 이 sync 가 편집한 두 파일로 귀속된다.
`M6-mutation-M{1..6}*.txt` 는 run 이 남긴 파일을 **읽었고 재현하지 않았다**(변이 금지 지시).
통과선 0.80 은 `.claude/rules/moai/workflow/spec-workflow.md:330` 에서 직접 읽었다.
어떤 수치도 이전 카드·이전 회차에서 옮겨 오지 않았다.

### Gaps (미검증)

- **변이 여섯을 재현하지 않았다.** 디스패치의 「생산 코드 변이 금지」 지시를 따랐다. M1~M6 에 대한
  모든 진술은 run 이 남긴 증거 파일을 **읽은 것**이고 내가 관측한 것이 아니다. 변이 증거의 진정성은
  리드의 복원 확인(`hash-object` 전후 일치 · `git status` 빈 출력)에 기대고 있다.
- **개정된 AC-011 표를 상대로 M4·M5 를 재실행하지 않았다** (§6.1 조건 ㄱ). 개정 후 「정확히 일치」는
  기존 증거의 재해석이지 새 관측이 아니다.
- **(iii) 200 자리의 분류는 읽어서 확정했다.** 「거짓이 되지 않는다」는 판단이므로 명령으로 재는 대상이
  아니다. 다만 판단이고 관측이 아니라는 사실을 여기 공시한다. **(ii) 23 자리는 다르다** — 전부 원문을
  열어 확인했고 10자리는 실물 시험과 대조해 기계적으로 뒷받침했다.
- **`web/` 화면 동작을 실행하지 않았다.** `RESOLUTION_RE` 가 새 문구 넷을 실제로 인식하는지는
  `server/test/web-rich.test.ts` 의 단위 시험(초록)에 기대고 있고, 브라우저에서 재현하지 않았다.
- **채널 패키지의 `emitted` 가드를 직접 재지 않았다.** AC-008 의 `126 무변동` 은 재현했으나
  가드 제거 변이는 재현하지 않았다(위 첫 항목과 같은 사유).
- **`transport-auth.test.ts` 플레이크는 이번 회차에 나타나지 않았다.** 1회 실행 초록이므로 「플레이크가
  고쳐졌다」는 주장은 하지 않는다 — 관측하지 못했을 뿐이다.
- **커버리지 수치를 재지 않았다.** 이 프로젝트에 커버리지 게이트가 배선돼 있지 않아 Craft 점수는
  시험 수·변이 판별력·오류 경로로 대신 세웠다.

### Residual-risk (잔여 위험)

- **대기 레지스트리 `open` 은 상한이 없다.** REQ-PERMROUTE-009 가 명시적으로 요구한 성질이고
  `SPEC-PERM-001` REQ-PERM-003 이 수용한 설계이므로 이 카드의 결함이 아니지만, 답하지 않은 권한 요청이
  프로세스 수명 동안 쌓인다. 재시작이 유일한 회수 경로다. 만료 타임아웃은 §5 범위 밖에 있다.
- **`connId` 는 선택 필드다.** 타입이 아니라 관례가 생산 경로의 `connId` 존재를 지킨다. `Established`
  가 필수로 좁혀 발급 누락을 타입에서 잡지만, **브로커에 도달하는 `ConnInfo` 는 여전히 선택**이므로
  새 호출부가 `connId` 없이 브로커를 부르면 조용히 (ㄴ) 갈래로 떨어진다. AC-013 이 그 갈래를 재고
  있으나, 「새 생산 호출부가 `connId` 를 싣는가」를 재는 기준은 없다.
- **F-07 의 줄 번호 판별자**는 `permissions.test.ts` 의 다음 편집에서 조용히 틀린다.
- **F-02 를 닫는 편집이 새 낡음을 만들 수 있다.** 이 카드가 이미 두 번 겪은 부류다
(`correction-leaves-its-own-record-stale`). 23자리를 고칠 때 개수를 적는 자리(§6.2 제목 · AC-010 ·
  DoD · `plan.md`)를 **함께** 옮겨야 하며, 한 자리만 고치면 나머지가 거짓이 된다.
- **감사 시점의 작업 트리는 커밋되지 않았다.** 이 판정은 디스크의 현재 상태에 귀속되며, 스테이징 결정이
  이 트리를 바꾸면 판정도 다시 서야 한다.
- **브랜치 `WT-perm-verdict-socket` 은 미푸시이고 이 작업의 유일한 사본이다.** 워크트리를 폐기하면
  카드 전체가 사라진다.
