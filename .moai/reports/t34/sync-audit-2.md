# t34 sync 감사 2회차 (델타) — SPEC-PERMROUTE-001

**판정: FAIL — 0.819 (Tier M 통과선 0.80)**

**점수는 통과선 위이고, 판정은 차단 발견 G-01 이 끌어내린다.** 이 둘이 어긋나 있다는 사실 자체가
이 회차의 핵심 보고 내용이므로 숨기지 않고 앞에 적는다 — 리드는 G-01 의 차단 여부를 상대로
이의를 제기하면 되고, 점수를 상대로 제기할 필요가 없다.

렌즈 `--security --deep`. 감사관 `sync-auditor`(독립·회의적 평가). 범위: 1회차 차단 다섯의 델타.

**귀속.** 워크트리 `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t34` ·
브랜치 `WT-perm-verdict-socket` · HEAD `dbee7b0` · 커밋되지 않은 sync 편집이 얹힌 작업 트리.
동결 baseline 을 직접 확인했다:

```
$ git rev-parse --short HEAD && git branch --show-current
dbee7b0
WT-perm-verdict-socket
$ git diff --stat | tail -1
 18 files changed, 463 insertions(+), 40 deletions(-)
$ git diff --cached --stat
(무출력 — staged 없음)
```

디스패치가 전한 「18파일 +463/-40」과 일치한다. 통과선은 SSOT 에서 직접 읽었다 —
`.claude/rules/moai/workflow/spec-workflow.md:330` 「Tier S `0.75`, Tier M `0.80`, Tier L `0.85`」.

---

## 1. 차원 점수

| 차원 | 1회차 | 2회차 | 판정 | 증거 (실행한 명령의 축자 출력) |
|---|---|---|---|---|
| Functionality (40%) | 0.78 | **0.86** | PASS (must-pass) | `npm test -w server` → `Test Files 17 passed (17) / Tests 218 passed (218)` `EXIT=0`; `npm test -w channel` → `Test Files 7 passed (7) / Tests 126 passed (126)` `EXIT=0`; `npx tsc --noEmit` → `server EXIT=0` `channel EXIT=0`. **AC-010 (ㄴ) 이 닫혔다** — 23자리 전건이 §6.2 행·부류 4 로 기록됨 |
| Security (25%) | 0.88 | **0.88** | PASS (must-pass) | `grep -rn 'sendToBot' server/src \| grep -v '^server/src/gateway.ts:'` → 무출력 `EXIT=1`. 수리는 주석과 시험 주석만 건드려 보안 표면 무변동 |
| Craft (20%) | 0.80 | **0.82** | PASS | F-04 수리가 원소 제거에 그치지 않고 **열다섯 쌍 판별을 다시 냈다**(`acceptance.md:261`) — 형제 하네스 재계산 규율 적용. 수치는 계수 명령으로 대체 |
| Consistency (15%) | 0.62 | **0.66** | FAIL | 23자리 미기록은 해소. 그러나 **HEAD 에서 유효했던 §6.2 앵커 35개가 이 수리로 낡았다 (G-01)** |

**가중 조화평균 = 0.819**
(`1 / (0.40/0.86 + 0.25/0.88 + 0.20/0.82 + 0.15/0.66)` = `1 / 1.2204`).

### must-pass 방화벽

`Functionality 0.86` · `Security 0.88` — 둘 다 통과선 위다. **방화벽은 이번에 걸리지 않는다.**
전체 FAIL 은 방화벽도 조화평균도 아니고 **차단 발견 G-01 하나**가 낸다.

---

## 2. F-01 ~ F-05 종결 대조표

| # | 결과 | 재현 명령과 축자 출력 |
|---|---|---|
| **F-01** | **닫힘** | `grep -n "\| 010 \|" progress.md` → `:797 \| 010 \| §6.2 표 양방향 대조 \| **정방향 (ㄱ)만 run 의 관측이다** … 「뒤집힌 자리 표 밖 0건」은 관측이 아니었으므로 **삭제한다** … (ㄴ)을 실제로 처음 잰 것은 sync-audit 이며 그 값은 **0건이 아니라 23자리**다`. 미관측 주장 삭제·(ㄱ) 보존·§5 귀속 전부 착지. 둘째 절반 `progress.md:645` 는 제목에 시점 표지 착지 — `**표 19행 착지 대조 (AC-PERMROUTE-010 (ㄱ)) — M5 시점 · 당시 20행 체계(§E.3 참조).**` |
| **F-02** | **닫힘** | `awk '/^### 6.2 /,/^### 6.3 /' spec.md \| grep -cE '^\\\| [0-9]+ \\\|'` → `25`. 23자리 배분 실측: 21행 앵커 10(=(가) 10) · 22행 앵커 6(=(나) #1~#6) · 23행 앵커 2(#7·#8) · 24행 1(#12) · 25행 1(#13) · 9행 앵커 7→10(#9~#11) = **10+6+2+1+1+3 = 23**. 개정 주석 22줄이 형제 문서에 실재함을 내용 대조로 확인(`evidence/audit2/delta-content.txt`) |
| **F-03** | **닫힘** | `grep -nE '19행\|13~19' acceptance.md plan.md spec.md` → 1회차가 지목한 다섯 자리(`acceptance.md:34·181·183·359` · `plan.md:164`) **전부 소멸**. 남은 적중은 HISTORY 행·행번호 지시(「§6.2 19행」=19**번** 행)·F-03 자체 서술뿐. 후속 범위 포인터도 계수 명령으로 교체됐고 그 명령을 재실행해 확인: `awk … \| grep -cE '\`server/\|\`web/'` → `8`, 행 `13 14 15 16 17 18 19 25` — 본문이 적은 값과 정확히 일치 |
| **F-04** | **닫힘** | `acceptance.md:238` → `**M6** … \| **008** (이 하나가 전부다. 「서버 쪽 0건」은 **판정값이 아니다**)`. `acceptance.md:271-278` 이 위상 자명성을 grep 과 함께 공시. `:379` 가 REQ-PERMROUTE-010 측정을 `AC-PERMROUTE-003b`·`AC-PERMROUTE-009 (가)` 에 재귀속. **추가로 `:261` 이 「전건 서로 다르다」를 원소 제거 후 다시 도출** — 삭제가 형제 단언을 공허하게 만들지 않았는지 스스로 확인한 것이며, 이 카드가 반복해 놓쳤던 부류를 이번에는 잡았다 |
| **F-05** | **닫힘** | `sed -n '1,8p' spec.md` → `status: in-progress`. `git diff -- spec.md \| grep -E '^[+-](status\|updated)'` → `-updated: 2026-09-03` / `+updated: 2026-09-04` 뿐 — status 는 HEAD 값과 동일. `git show dbee7b0:…spec.md` → `status: in-progress` 확인. `progress.md:814` `sync_status: reaudit-pending` + `:821` 이 `audit-ready` 로 적지 않는 이유를 명시 |

**다섯 전부 닫혔다.** 형식적 삭제가 아니라 근거를 동반한 수리이며, F-04 는 요구된 것보다 한 걸음
더 갔다(열다섯 쌍 재도출).

---

## 3. 새 발견

### G-01 [Medium] [blocking] — 수리가 §6.2 앵커 35개를 스스로 낡게 만들었다

이 수리는 형제 문서에 개정 주석 22줄을 **끼워 넣었고**, 그 삽입이 아래 줄들을 밀어냈다. 밀려난
자리를 가리키던 §6.2 앵커는 갱신되지 않았다. **35개 전부 HEAD `dbee7b0` 에서는 유효했다** —
즉 이 수리가 만든 낡음이다.

기계 대조 (각 앵커의 HEAD 내용과 현재 내용을 같은 줄 번호에서 비교):

```
$ git show dbee7b0:.moai/specs/SPEC-PERM-001/acceptance.md | grep -nE "delivers an allow verdict|delivers a deny verdict as deny|accepts a verdict once|never resolves a request|refuses an unauthenticated|falls through non-matching|marks an undelivered|accepts all four verdict"
251:it('delivers an allow verdict to the connected bot', async () => {
270:it('delivers a deny verdict as deny, not as allow', async () => {
313:it('accepts a verdict once and lets a repeat fall through as chat'
339:it('never resolves a request from a different room', async () => {
367:it('refuses an unauthenticated verdict and leaves the request pend
397:it('falls through non-matching text and unknown ids without touchi
436:it('marks an undelivered verdict differently from a delivered one'
473:it('accepts all four verdict words, normalizes case, and rejects i

$ grep -nE "(같은 여덟 제목)" .moai/specs/SPEC-PERM-001/acceptance.md
251 · 274 · 319 · 347 · 377 · 409 · 450 · 489
```

21행이 싣는 앵커 여덟 가운데 **`:251` 하나만 살아 있다.**

**자리별 실측** (증거: `evidence/audit2/anchor-drift-full.txt` · `delta-places.txt`):

| §6.2 행 | 낡은 앵커 | 개수 | 확인 |
|---|---|---|---|
| 5 | `SPEC-PERM-001/spec.md` `:74`·`:77`·`:80`·`:81` | 4 | 「축약 없이」는 이제 `:78` |
| 6 | 같은 파일 `:106` | 1 | HEAD `:106`=```` ```ts ````, 지금 `:80` |
| 7 | 같은 파일 `:133`·`:136` | 2 | HEAD `:136`=`**REQ-PERM-006**`, 지금 `:140` |
| 8 | 같은 파일 `:144` | 1 | HEAD `:144`=`**REQ-PERM-008**`, 지금 `:148` |
| 9 | `SPEC-GWAUTH-002/spec.md:624` | 1 | 「발신 지점 다섯」은 이제 `:626` |
| 11 | `SPEC-PERM-001/plan.md:70` · `acceptance.md:461` | 2 | HEAD 내용과 불일치 |
| 18 | `server/test/permissions.test.ts` 앵커 12 | 12 | 전건 +1 이동 (`:195`→`:196` 등) |
| 21 | `SPEC-PERM-001/acceptance.md` 7 + `SPEC-ROOMAUTHZ-001/acceptance.md:726` | 8 | 위 대조 |
| 22 | `spec.md:71` · `plan.md:201` · `acceptance.md:262` · `acceptance.md:545` | 4 | 전건 HEAD 에서 유효했음 |
| | **합계** | **35** | |

**두 자리는 단순 이동이 아니라 「거짓 확인」을 낸다.**

- 21행 `:473` — 지금 그 줄은 **다른 시험**(«marks an undelivered verdict»)의 개정 주석이다.
  21행을 따라가 확인하는 사람은 개정 주석을 보고 「착지했다」고 판단하지만, 그것은 자기가
  확인하려던 시험의 주석이 아니다.
- 22행 `acceptance.md:262` — 지금 그 줄은 «delivers an allow verdict» 개정 주석이며, 22행이
  말하는 「판별자 산문」이 아니다(그것은 `:264`).

**왜 차단인가.** 이 SPEC 의 §6 산출물은 장부 자체다. AC-PERMROUTE-010 (ㄱ)「표 전 행이 대상
문서에서 **실제로** 착지했다」의 확인 경로가 앵커이고, 그 앵커 35개가 이 편집 하나로 무효가 됐다.
이 프로젝트는 **한 줄 어긋남을 이미 두 번 결함으로 판정한 선례**를 갖는다 — 5행의 처분란이
「2회차 감사 N-07 정정: 초판·1회차 보고서가 물려받은 `:75` 는 한 줄 어긋났다」고 적는다. 그 기준을
그대로 적용하면 35개는 선택 사항이 될 수 없다.

**같은 수리가 이 위험을 절반만 인식했다.** `spec.md:114` 는 이번에 새로 [HARD] 를 세웠다 —
「**범위 포인터는 계수와 똑같이 낡는다**(F-03 과 같은 부류의 네 번째 재발이 될 뻔했다)」. 범위
포인터는 고쳤고 **점 포인터는 같은 편집에서 35개를 낡게 만들었다.** 부류는 하나인데 형태 하나만
막았다.

**이미 있는 완화책이 답을 보여 준다.** 3·4·5·19행은 grep 앵커를 함께 싣고 있고
(`앵커 grep -n 'export interface ConnInfo'` · `앵커 grep -n '축약 없이'` 등) **그 넷은 지금도
해결된다.** 5행이 줄 번호 넷을 잃고도 읽히는 이유가 그 grep 앵커다.

**필요한 수리**: 35개를 새 숫자로 갈아 끼우지 말 것 — 다음 삽입에서 또 낡는다(`spec.md:114`
자신의 논거다). 3·4·5·19행이 이미 쓰는 **grep 앵커 형식으로 바꾼다.**

### G-02 [Low] [optional] — 14·16행의 앵커 낡음은 이 수리 이전부터 있었다

`server/test/gateway.test.ts` 는 이 수리가 건드리지 않았다(`git diff --name-only -- server/test/gateway.test.ts` → 무출력).
그런데:

```
$ sed -n '899p' server/test/gateway.test.ts
    const room = seedRoom()
$ grep -n "for (const m of" server/test/gateway.test.ts
761:    for (const m of res.messages) {
1032:    for (const m of ['deliver', 'closeRoom', 'isOnline', 'sendToBot', 'sendToOrigin', 'setPermi
```

16행은 `:899` 에 그 `for` 루프가 있다고 적지만 실제로는 `:1032` 다. 14행의 `:878` 도
`await new Promise(r => setTimeout(r, 200))` 로 설명과 맞지 않는다. **이 수리가 만든 것이 아니고
1회차에도 있었으며 내가 놓쳤다.** 리드 처분이 「차단 델타 한정」이므로 범위를 넓히지 않고
관측으로만 올린다.

### G-03 [Low] [optional] — `lead-decisions.md:137` 의 「+462」가 트리와 다르다

```
$ git diff --stat | tail -1
 18 files changed, 463 insertions(+), 40 deletions(-)
$ grep -n "462" .moai/reports/t34/lead-decisions.md
137:… 수리 전건 착지 18파일 +462/-40 · HEAD dbee7b0 불변 · 2회차 델타 재감사 진입.
```

**그 줄을 쓰는 행위가 그 수를 바꿨다** — `lead-decisions.md` 자신이 18파일 중 하나다. 재발 부류
「정정이 스스로 낡은 기록을 남긴다」의 가장 작은 형태이며, 명령을 다시 돌리지 않고 적은 수다.

### G-04 [Low] [optional] — `progress.md` 안에서 F-06·F-07·F-08 이 두 보고서를 동시에 가리킨다

`progress.md:192~194` 는 **plan 감사**의 F-06·F-07·F-08(기준 개수 12 vs 13 · 공백에 기준 없음 ·
REQ-PERM-001 귀속 오기)을 싣고, `:931` 은 **sync 감사**의 F-06·F-07·F-08 을 보고서 이름 없이
가리킨다. 내용이 전혀 다른 두 묶음이 한 파일에서 같은 이름을 쓴다.

---

## 4. 디스패치가 지목한 확인 항목

### 4.1 §6.1 훑기 재실행 (`bash`) — 움직인 수는 전부 설명된다

```
$ scope-all = 119 · scope-ex-self = 116 · web in ex-self = 2   (§6.1 기재값과 일치)
```

| 어간 | 1회차 실측 | 2회차 실측 | 차 |
|---|---|---|---|
| `ConnInfo` | 31 | 32 | +1 |
| `sendToBot` | 67 | 74 | +7 |
| `sendToConn` | 27 | 27 | 0 |
| `onGatewayRequest` | 47 | 57 | +10 |
| `setPermissionHandler` | 35 | 36 | +1 |
| `sendEstablished` | 15 | 15 | 0 |
| `발신 지점` | 19 | 22 | +3 |
| `다섯`(좁힘) | 58 | 61 | +3 |
| `@MX:WARN` | 5 | 5 | 0 |
| 실패 문구 | 27 | 27 | 0 |
| 세 템플릿 | 3 | 3 | 0 |
| `[0-9]개 메서드` | 2 | 2 | 0 |

**감소는 하나도 없다.** 내용 단위 대조에서 새 적중 **22줄은 전부 이번 개정 주석**이고, 사라진
것은 **하나뿐**이다 — `permissions.test.ts` 의 `// sendToBot가 실제로 가는지는 …`, 곧 F-02 #13 의
어간 제거다. 예상된 이동이며 결함 아님.

> **내 오독 하나를 공시한다.** 나는 처음에 §6.1 표의 기재값(HEAD `6a359f8` 고정값)과 비교해
> 네 어간이 「감소」한 것으로 읽었다. 델타의 기준선은 1회차 실측값이며, 그 기준으로는 감소가
> 없다. 표 자신이 「이 수는 HEAD 고정값이다 … 수를 믿지 말고 명령을 다시 돌린다」고 경고한
> 자리였다.

### 4.2 AC-010 역방향 분류 — 델타

- **1회차의 23자리**: 전건이 §6.2 행으로 착지(§2 F-02 참조). **미기록 0.**
- **개정 주석 22줄이 만든 새 적중**: 각 주석은 §6.2 가 지목한 앵커 바로 아래에 놓였고, 그 행이
  그 자리의 기록이다. 1회차가 run 단계 주석 22개에 대해 쓴 것과 **같은 독법**이며(§5.3 (i)
  「20행이 덮는 앵커 전건. 개정 주석 22개가 형제 문서에 실재함을 확인」), 회차마다 기준을 바꾸지
  않는다. **새로 미기록이 된 적중 0.**
- 다만 §6.1 이 이 부류에 **일반 규칙을 세우지 않았다** — `[0-9]개 메서드` 칸 하나만 「주석 자체는
  부류 3」이라 적는다. 지금은 문제를 내지 않지만, 다음 회차가 다른 독법을 고르면 같은 자리에서
  논쟁이 난다. 권고에 적는다.

### 4.3 `sync-changgu-sweep.txt` 재실행 — 결과와 그 한계 모두 타당

```
$ grep -rn "창구" .moai/specs | wc -l
16
```

기록된 출력과 일치한다. 살아 있는 「창구 둘」 전제는 **0건**이라는 결론에 동의한다:
`GATEWAY-001/spec.md:180` 「이 SPEC 은 **창구만** 만든다」는 개수가 아니라 범위 서술이라 셋이 돼도
참이고, `:234` 는 R-1 로 개정됐으며(`:236` 인용 블록 확인), 나머지는 `onConnection` 을 가리키는
다른 주제이거나 이 카드 자신의 처분 기록이다.

**한계 공시도 정직하다.** 파일이 스스로 「어간 「창구」 하나에 기댄다 … 「메서드 둘」·「진입점 둘」은
잡히지 않는다」고 적는다. 내가 그 빈틈을 따로 찔러 봤다:

```
$ grep -rn "둘만\|두 메서드\|메서드 둘\|두 개의 창구\|전송·수신\|수신 창구" .moai/specs/SPEC-GATEWAY-001/
:46(다른 주제) · :234(개정됨) · :236(개정 주석)
```

대체 낱말로 적힌 살아 있는 전제는 **찾지 못했다.** 종결에 동의한다.

### 4.4 리드가 철회한 처분 — 철회가 옳다

```
$ grep -rn "sendToBot" server/test | wc -l
12
```

AC-PERMROUTE-009 (가) 의 통과 조건은 **0건**이다. 열둘 가운데 `gateway.test.ts:932`·`:940` 은
`REQ-PERMROUTE-011` 이 요구하는 **유지 회귀**라 `sendToBot` 을 반드시 부르고, `:1032` 는 AC-014 의
메서드 열거다. 훑기에 `server/test` 를 더하면 이 기준은 **영구히 만족 불가능**해진다.
**철회는 옳다** — 명령을 다시 돌려 확인했고, 기준 본문은 그대로다:

```
$ grep -rn 'sendToBot' server/src | grep -v '^server/src/gateway.ts:'
(무출력)  EXIT=1
```

**열둘 전건이 기록돼 있는가 — 그렇다.** 부류 4 열 10자리(`spec.md:291` 의 `:575` + `:293` 의 아홉,
`:882` 포함) + `gateway.test.ts:857` → 15행(`:855-862` 범위 안, 앵커 유효 확인) +
`gateway.test.ts:1032` → 16행. §6.1 [HARD] 충족. (16행 앵커가 낡은 것은 G-02.)

### 4.5 이 레인이 공시한 자기 오류 둘 — 정정이 정확하다

1. **12 보고 / 11 열거** — `spec.md:293` 이 지금 `gateway.test.ts:882` 를 싣는다(확인). 실측 12 와
   열거 12 가 일치한다.
2. **`spec.md:112` 낡음의 원인** — 「20행」이 아니라 「25행」이라는 정정에 **동의한다.** 계수 명령을
   재실행하면 그 부류의 출력은 `13 14 15 16 17 18 19 25` 이고 **20행은 들어 있지 않다**(20행은
   `SPEC-GATEWAY-001/acceptance.md`, 곧 형제 문서 행). 그리고 **내 1회차 판정 「`spec.md:112` 는
   여전히 참」도 그대로 선다** — 25행은 이 수리가 만든 행이므로 1회차 시점에는 존재하지 않았다.
   결론과 근거가 이번에는 둘 다 맞다.

### 4.6 §E.4 의 미처리 공시 — 정직하다

`progress.md:931` 이 F-06·F-07·F-08 과 §4.5 「직후→직전」 넷을 미처리로 명시하고, 이유(리드 처분
「차단 델타 한정」)와 §4.5 의 ROADMAP 등재를 함께 적는다. **숨기지 않았고 이유가 실재한다.**
「범위를 넓히지 않는 것이 처분의 내용이다」는 서술도 참이다. 다만 어느 보고서의 F-06 인지 적지
않은 것은 G-04.

---

## 5. 권고

1. **[차단] G-01** — §6.2 의 낡은 앵커 35개를 **grep 앵커로 교체한다.** 새 줄 번호로 갈아 끼우면
   다음 삽입에서 같은 일이 반복된다. 3·4·5·19행이 이미 그 형식을 쓰고 있으며 그 넷만 이번 삽입을
   견뎠다 — 형식이 답을 이미 보여 줬다.
2. **[권고]** §6.1 에 **일반 규칙 한 줄**을 세운다 — 「개정 주석 자신의 적중은 그 주석이 붙은 §6.2
   행이 덮는다」. 지금은 `[0-9]개 메서드` 칸 하나만 이 문제를 다루고 나머지는 관행에 기댄다.
3. **[권고] G-03** — `lead-decisions.md:137` 의 `+462` 를 명령 재실행값으로 정정하거나 지운다.
4. **[선택] G-04** — `progress.md:931` 에 보고서 이름(`sync-audit.md`)을 붙인다.
5. **[선택] G-02** — 14·16행 앵커는 리드 처분 범위 밖이므로 ROADMAP 후속 후보로.

---

## 6. 5절 블록

### Claim (주장)

(1) 1회차 차단 F-01~F-05 **다섯 전부 닫혔다.** (2) 회귀 없음 — server 218 · channel 126 ·
typecheck 0. (3) 수리가 **새 결함 하나를 만들었다** — HEAD 에서 유효했던 §6.2 앵커 35개가 낡았고
그중 둘은 거짓 확인을 낸다. (4) 그 결함 때문에 판정은 FAIL 이며, 조화평균 0.819 는 통과선 위다.

### Evidence (증거)

- `npm test -w server` → `Test Files 17 passed (17) / Tests 218 passed (218)` `EXIT=0`
  (`evidence/audit2/server-suite.txt`)
- `npm test -w channel` → `Test Files 7 passed (7) / Tests 126 passed (126)` `EXIT=0`
  (`evidence/audit2/channel-suite.txt`) — **`transport-auth.test.ts` 플레이크 재현되지 않음.
  1회차 실행으로 끝났고 단일 파일 재실행은 필요하지 않았다.**
- `npx tsc --noEmit` → server `EXIT=0` · channel `EXIT=0`, 출력 0줄
- `awk … | grep -cE '^\| [0-9]+ \|'` → `25` (§6.2 행 수)
- `awk … | grep -cE '\`server/|\`web/'` → `8`, 행 `13 14 15 16 17 18 19 25`
- `grep -rn 'sendToBot' server/src | grep -v gateway.ts` → 무출력 `EXIT=1`
- `grep -rn 'sendToBot' server/test | wc -l` → `12`
- `grep -rn "창구" .moai/specs | wc -l` → `16`
- 앵커 대조: `git show dbee7b0:<file> | sed -n '<N>p'` vs `sed -n '<N>p' <file>` 전건
  (`evidence/audit2/anchor-drift-full.txt`)
- 적중 델타: `evidence/audit2/delta-content.txt`(내용 단위) · `delta-places.txt`(자리 단위) ·
  `section6-sweep-round2.txt`(어간별 수)

### Baseline-attribution (baseline 귀속)

모든 수는 **HEAD `dbee7b0` + 커밋되지 않은 sync 편집이 얹힌 이 작업 트리**에서 이번 회차에 직접
실행해 얻었다. 1회차 값은 `sync-audit.md` §5.2 의 실측표에서 가져와 **델타 기준선으로만** 썼고
판정에는 쓰지 않았다. 앵커 낡음의 「이전 상태」는 기억이 아니라 `git show dbee7b0:` 로 읽었다.
§6.1 표의 기재값(HEAD `6a359f8`)은 기준선으로 쓰지 않았다 — 그것을 기준선으로 오인한 내 첫
판독은 §4.1 에 공시했다.

### Gaps (미검증)

1. **35 라는 수는 하한이다.** 이 수리가 건드린 파일 안의 앵커만 셌다. `§6.2` 전체 앵커에 대한
   전수 자동 대조는 시도했으나 추출기가 `REQ-GW-020` 의 `020` 같은 가짜 토큰을 잡아 **그 자동
   계수는 폐기했다.** 35 는 손으로 내용 대조한 것만이고, 세지 않은 자리가 더 있을 수 있다.
2. **§6.2 1~4·10·12·13·17·19·20·23·24·25행의 앵커 전건 유효성**은 확인하지 않았다. 표본으로
   확인한 것(1~4·23·24·25 등)은 유효했으나 **표본은 목록 크기를 세우지 않는다.**
3. **1회차가 이미 종결한 것은 다시 세우지 않았다** — 보안 렌즈 4.1~4.4, AC-011 개정 근거,
   218/126/typecheck 의 최초 도출. 이번에는 재실행 결과만 대조했다.
4. **변이 M1~M6 을 다시 돌리지 않았다.** 제약상 금지됐고(활성 변이 금지), run 의 증거 파일을
   읽었을 뿐 재현하지 않았다.
5. **F-06·F-07·F-08 과 §4.5 「직후→직전」**은 리드 처분에 따라 평가하지 않았다. 공시의 정직성만
   판단했다.
6. **CI 를 관측하지 않았다.** 브랜치는 미푸시이며 원격 실행이 없다.
7. **`web/`·`channel/` 안의 앵커**는 이 수리가 건드리지 않아 대조 대상에서 뺐다.

### Residual-risk (잔여 위험)

1. **G-01 을 「새 숫자로 갈아 끼우는」 방식으로 고치면 다음 편집에서 그대로 재발한다.** 이 카드의
   재발 이력(다섯 번)이 그 예측의 근거다.
2. **개정 주석의 자기 적중에 일반 규칙이 없다.** 지금은 1회차와 같은 독법으로 넘어가지만,
   다음 감사관이 「주석 줄도 독립 적중」이라 읽으면 22자리가 한꺼번에 미기록으로 재분류된다 —
   규칙 한 줄이 없어서 생기는 위험이다.
3. **`transport-auth.test.ts` 플레이크는 이번에 나오지 않았을 뿐 사라지지 않았다**(7회 관측 이력).
   1회 초록이 플레이크의 부재를 세우지 못한다.
4. **G-02 가 시사하는 것** — 앵커 낡음은 이 수리 이전에도 있었고 1회차가 놓쳤다. 지금 세지 않은
   자리에 더 있을 가능성이 Gaps 1·2 와 함께 남는다.
5. **판정과 점수가 갈린다.** G-01 을 선택 발견으로 보는 리드 판단이 서면 이 카드는 0.819 로
   통과한다. 내가 차단으로 둔 근거는 §3 에 적었고, 이의는 그 근거를 상대로 제기하면 된다.
