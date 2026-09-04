# SPEC-PERMROUTE-001 계획 감사 보고서 — 2회차

- 대상: `.moai/specs/SPEC-PERMROUTE-001/` (`spec.md` v0.2.0 · `plan.md` · `acceptance.md` · `progress.md`)
- 나무: `.claude/worktrees/t34` · 브랜치 `WT-perm-verdict-socket` · HEAD `6a359f8` (`git rev-parse --short HEAD`)
- 반복: 2 / 최대 3
- **판정: FAIL — 종합 0.75 (통과선 0.80)**
- 회귀 신호: 1회차 0.6875 → 2회차 0.75 (상승). STOP 조항 미발동.

**저자 추론 맥락은 M1 Context Isolation 에 따라 무시했다.** 디스패치가 「직접 확인했다」고 전한 다섯 가지(표식 0건 · 기준 14개 · `git status` 빈 출력 · §6.2 17행 · M6 존재)도 주장으로만 받고 전부 다시 실행해 확인했다.

---

## 0. 통과선을 어디서 읽었는가 (디스패치·1회차 인용을 쓰지 않음)

- Tier: `spec.md` 프런트매터 `tier: M`
- 통과선: `.claude/rules/moai/workflow/spec-workflow.md:141`
  ```
  | M (Medium) | 300 - 1000 LOC | 5 - 15 files | **3 files**: spec.md + plan.md + acceptance.md | 0.80 |
  ```
  (`sed -n '132,160p'` 의 10번째 줄 = 141행. 같은 값이 `:330` 「Tier M `0.80`」에서 재확인된다.)
- 1회차가 인용한 `spec-workflow.md:141` 은 **독립 확인 결과 정확하다.**
- REQ/AC 상한: 같은 파일 `:149` — Tier M 은 요구사항 16 · 기준 16. 현재 11 / 14 로 상한 안.

---

## 1. 필수 통과 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| MP-1 REQ 번호 일관성 | PASS | `grep -n '^\*\*REQ-PERMROUTE'` → 001..011 연속, 중복·누락 0, 자릿수 일정 |
| MP-2 GEARS 형식 | PASS | 11개 전부 표기 부착(Ubiquitous 6 · When 3 · Unwanted 2). 부정형은 「…해서는 안 된다」(REQ-005 · 008). **요구사항 층에 대해 판정했다** — Given-When-Then 은 `acceptance.md` 의 검증 층 형식이므로 이 항목으로 감점하지 않았다 |
| MP-3 프런트매터 | PASS | 12 정규 필드 전건 존재(`id·title·version·status·created·updated·author·priority·phase·module·lifecycle·tags`), 거부 별칭(`created_at`·`labels` 등) 0건. `version: "0.2.0"` 인용 문자열 |
| MP-4 언어 중립성 | N/A | 단일 언어(TypeScript) 프로젝트 SPEC |
| MP-5 D7 형제 대조 | PASS | 참조 SPEC 9개 전부 `.moai/specs/` 에 실재, status 는 `completed` 8 + 자기 `draft` 1. retired/superseded/archived 0건 |
| MP-6 D8 교차 플랫폼 | N/A | `grep -c 'syscall' spec.md` → `0` |
| MP-7 미결 표식 | PASS | `grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-PERMROUTE-001/` → 무출력(exit 1) |

필수 항목 실패는 없다. **FAIL 은 종합 점수(0.75 < 0.80)와 차단 결함 넷에서 나온다.**

---

## 2. 1회차 F-01..F-08 종결 현황

| 발견 | 상태 | 근거(실행한 것) |
|---|---|---|
| **F-01** §6 표가 살아 있는 거짓 넷을 빠뜨림 | **부분 종결** | ㉠㉡㉢㉣ 네 부류 전부 착지 확인 — 7행(PERM-001 `:133`·`:136`), 5행(§3 블록 `:77`·`:80`·`:81`), 10행(GATEWAY-001/acceptance `:187`·`:873`·`:888`·`:928`), 9행(GWAUTH-002 앵커 일곱 전부 실재 확인). **그러나 같은 부류가 작은 규모로 재현했다 — N-03·N-04** |
| **F-02** AC-009 명령이 자기 조건을 집행 못함 | **종결** | 새 (가)·(나) 를 **그 형태 그대로** 현재 나무에서 실행: (가) → `server/src/permissions.ts:99` 1건(exit 0), (나) → `28:` · `361:` 2행(exit 0). `acceptance.md:141-147` 이 인용한 출력과 **축자 일치** |
| **F-03** AC-007 공허 | **종결** | AC-007 이 「비회귀 불변식」으로 낮춰짐(`acceptance.md:20`·`:88`), 해제의 측정 책임이 003b·005 로 표에 명시 귀속. **`plan.md` §E 도 다시 쓰였다**(`plan.md:145` — 007 위에 서 있던 자기 검증 항목이 003b·005 로 옮겨짐). 007 을 「해제를 잰다」로 부르는 자리는 `grep -n 'AC-PERMROUTE-007'` 전수에서 0건 |
| **F-04** 미결 표식 2건 | **종결** | 표식 0건(MP-7). 처분이 붙인 조건 둘도 이행됨 — AC-PERMROUTE-013 실재, REQ-PERMROUTE-006 의 금지 조항 존치(`spec.md:145` 이하) |
| **F-05** 변이표 3행 과소 계수 | **부분 종결** | 다섯 행 전부 재도출 + 뿌리(AC-006 이 라우팅 성패에 종속) 명시, M1·M3 정의 고정, M6 신설. **그러나 새 과소 계수가 생겼다 — N-02(AC-012 결합 누락)** |
| **F-06** 기준 개수 자기 진술 | **종결** | `acceptance.md:3` 「14개」, 기준표 14행, DoD 1번 「001..013 전부(14개)」. 「12개」 잔존 0건(HISTORY 0.1.0 행은 그때의 기록이며 정정 주석이 붙어 있음) |
| **F-07** 공시된 공백에 기준 없음 | **종결** | AC-PERMROUTE-013 신설(`acceptance.md:228-244`), 「예상 실패 갈래」의 공시 문장도 갱신(`:248`). 「도달 불가 논증으로 닫는 것 금지」까지 본문에 박음 |
| **F-08** REQ-PERM-001 귀속 오기 | **종결** | `spec.md:166` 이 「§범위 밖의 독립 불릿 + 관측 결과 소유자는 REQ-PERM-009」로 고쳐짐. `SPEC-PERM-001/spec.md:188` 실물과 대조 일치 |

---

## 3. 항목별 점수 (0.25/0.50/0.75/1.0 밴드)

| 항목 | 점수 | 밴드 근거 | 인용 |
|---|---|---|---|
| Clarity | **0.75** | 문장 정밀도는 높다. 다만 변이 M1..M5 의 「정확히 일치」 집합이 AC-012 결합을 두고 두 갈래로 읽히고(N-02), 「형제 시험 7자리」가 확정적으로 적힌 채 거짓이다(N-01) | `acceptance.md` 변이표 · `spec.md` §6.2 17행 |
| Completeness | **0.75** | 필수 절 전건 + 범위 밖 H3 4개 + 프런트매터 완전. 그러나 §6 표가 **자기 규칙으로도** 한 행 모자라고(N-03b) 한 행이 거짓이다(N-04) | `spec.md:186-210`(범위 밖) · `:246-263`(표) |
| Testability | **0.75** | 1회차 0.50 에서 실질 개선 — AC-009 명령이 실제로 집행되고, AC-007 이 정직하게 낮춰졌고, AC-013 은 공허하지 않으며(변이 M3·M4 가 각각 무너뜨린다), M6 이 중심 주장의 반증자를 놓았다. 남은 결함은 AC-011 의 판정 불결정성(N-02)과 AC-010 이 실어 나르는 거짓 자리(N-04) | `acceptance.md:141-160` · `:228-244` |
| Traceability | **0.75** | REQ↔AC 를 양방향으로 셌다. REQ-PERMROUTE-009 를 재는 기준이 0개이고, REQ-003·006 은 기준표에 대응 행이 없으며(암묵 피복), `plan.md` §D-5 와 `acceptance.md` 기준표가 AC-009 의 귀속을 서로 다르게 적는다(N-05) | `acceptance.md:14-28` · `plan.md:136` |

**종합 = (0.75+0.75+0.75+0.75)/4 = 0.75 < 0.80 → FAIL.**

---

## 4. 결함표 (2회차 신규)

| # | 자리 | 요지 | 심각도 | 분류 |
|---|---|---|---|---|
| N-01 | `spec.md` §6.2 17행 · `plan.md:79` · `plan.md` M4-7 | 「형제 시험 **7자리**가 실행으로 붉어진다」가 실측 대비 과소 — 최소 **12자리**(느슨히 세면 14) | critical | **차단** |
| N-02 | `acceptance.md` 변이표 M1..M5 | 「정확히 일치」 집합이 AC-PERMROUTE-012 를 빠뜨림. M6 만 012 를 실어 표가 자기와 불일치 | major | **차단** |
| N-03a | `spec.md` §6.1 어간 표 | 적중 수가 명시된 명령·범위로 재현되지 않음(`sendToBot` 48 vs 실측 **60**), 자기 제외·측정 시점 미기재, `다섯` 행은 돌릴 명령 자체가 없음 | major | **차단** |
| N-03b | `spec.md` §6.1 `발신 지점` 행 · §6.2 · §6.3 | 그 어간의 적중 11 중 5건이 `SPEC-LIVEVERIFY-001` 인데 분류란은 GWAUTH-002·gateway.ts:261 둘만 적는다. 그중 `SPEC-LIVEVERIFY-001/acceptance.md:140` 은 이 SPEC 이 거짓으로 만드는 「발신 지점 다섯」 진술인데 표에도 제외 목록에도 없다 | major | **차단** |
| N-04 | `spec.md` §6.2 11행 | `SPEC-WEBRICH-001/plan.md:234` 이 실패 문구를 축자 고정한다는 주장이 거짓 — 그 문자열은 그 SPEC 어디에도 없고, `:234` 는 이 SPEC 이후에도 참인 산문이다 | major | **차단** |
| N-05 | `acceptance.md:14-28` · `plan.md:136` | REQ-PERMROUTE-009 를 재는 기준 0개, REQ-003·006 은 기준표 대응 없음, AC-009 의 귀속을 plan(REQ-006)과 acceptance(REQ-011)가 다르게 적음 | minor | 비차단 |
| N-06 | `acceptance.md:228-244` · `spec.md:152` | AC-013 이 `connId` 가 **애초에 없던** 항목에도 REQ-007 의 「요청한 세션이 끊겼다」 문구를 요구한다 — 그 갈래에서 그 진단은 거짓이다(이 SPEC 이 낡은 문구를 비판한 것과 같은 부류) | minor | 비차단 |
| N-07 | `spec.md` §6.2 5행 | 앵커 `SPEC-PERM-001/spec.md:75` 는 한 줄 어긋남 — 「축약 없이 그대로 옮긴다」는 `:74` | minor | 비차단 |

---

### N-01 (critical, 차단) — 「7자리」가 실제로는 최소 12자리다

`spec.md` §6.2 17행 · `plan.md:79` [HARD] 정정 · `plan.md` M4-7 이 모두 **같은 일곱**을 이름으로 적는다: `permissions.test.ts:195·323·324·347·348` · `room-members.test.ts:527·549`. 그리고 `plan.md:160`(M1-4)은 「30자리와 다르게 나오면 리드에 재회부」를, `lead-decisions.md` 는 「run M1 이후 실제 붉어지는 자리 수를 세어 **7** 과 대조, 초과 시 리드 보고」를 조건으로 건다. 즉 **7 은 장식이 아니라 회부 방아쇠**다.

전수로 셌다. 판정선은 SPEC 자신의 것 — 「`connId` 없이 브로커를 직접 부른 뒤 **실제 소켓이 판정을 받는다**고 단언한다」.

```
$ grep -n "behavior: 'allow'\|behavior: 'deny'\|behavior).toBe(\|not.toBeNull()\|전달하지 못했습니다" server/test/permissions.test.ts
198:    expect(await seen).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
209:    expect(v).not.toBeNull()
210:    expect(v.behavior).toBe('deny')
231:    expect((await first).behavior).toBe('allow')
255:    expect((await proper).behavior).toBe('allow')
272:    expect((await proper).behavior).toBe('allow')
294:    expect((await seen).behavior).toBe('allow')
313:    expect(dropped.body).toContain('전달하지 못했습니다')
332:    expect(await allow).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
337:    expect(await deny).toEqual({ type: 'permission_verdict', request_id: 'fghij', behavior: 'deny' })
353:    expect(await verdictA).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
358:    expect(await verdictB).toEqual({ type: 'permission_verdict', request_id: 'abcde', behavior: 'allow' })
```

각 단언이 딸린 `broker.onGatewayRequest({ roomId, botId }, …)` 자리를 되짚으면(`grep -n 'onGatewayRequest' server/test/permissions.test.ts`):

| 단언 줄 | 대응 요청 자리 | 표에 있는가 |
|---|---|---|
| 198 | `:195` | ○ |
| 209·210 | `:205` (`delivers a deny verdict as deny`) | **✗** |
| 231 | `:228` (`accepts a verdict once …`) | **✗** |
| 255 | `:246` (`never resolves a request from a different room`) | **✗** |
| 272 | `:262` (`refuses an unauthenticated verdict …`) | **✗** |
| 294 | `:279` (`falls through non-matching text …`) | **✗** |
| 312·313 | `:303`·`:304` (`marks an undelivered verdict differently …`) | **✗** |
| 332·337 | `:323`·`:324` | ○ |
| 353·358 | `:347`·`:348` | ○ |

여기에 `room-members.test.ts:527`(`:537-538` 대조군 단언) · `:549`(`:553` 단언) 둘을 더하면, 실제 소켓 배달을 단언하는 자리는 **12**(permissions 10 + room-members 2)다. `:303`·`:304` 를 포함해 「선택 필드에서 붉어지는 자리」로 세면 **14**다.

`:246`·`:262`·`:279` 는 특히 놓치기 쉬운 모양이다 — 앞쪽 단언은 「가지 않았다(`toBeNull`)」라서 실패 갈래에서도 통과하지만, **뒤에 붙은 대조군**(`const proper = nextMessage(ws)` → `expect((await proper).behavior).toBe('allow')`)이 배달을 요구한다. `:303`·`:304` 는 성공 문구와 실패 문구가 **서로 다름**을 단언하는데(`expect(dropped.body).not.toBe(delivered.body.replace('abcde','fghij'))`), 두 방 모두 `connId` 부재 실패로 떨어지면 같은 틀의 문구가 되어 그 단언이 무너진다.

**이 판정의 성격(정직한 공시).** 구현이 아직 없으므로 실행 관측이 아니라 **읽기 추론**이다. 전제는 `plan.md` M3-2 자신이 지시한 동작 — 「`info.connId` 가 `undefined` 인 대기 항목은 `sendToOrigin` 을 부르지 않고 곧바로 실패 갈래로 보낸다」 — 이며, SPEC 이 자기 「7」을 도출한 것과 **같은 종류의 추론**이다. 같은 방법으로 세면 답이 12(또는 14)다.

**왜 차단인가.** (ㄱ) M4-7 이 편집 대상을 일곱으로 열거하므로 그대로 실행하면 다섯 자리가 붉은 채 남는다. (ㄴ) 리드가 건 재회부 조건의 기준값이 틀려, run 이 12를 세고 「7 초과」로 회부하거나 반대로 조건을 무시하게 된다. (ㄷ) §6.2 17행이 「일곱 자리 **전부** 붉어진다」를 전칭으로 적어 표 자신이 거짓을 실어 나른다.

### N-02 (major, 차단) — 변이표가 AC-PERMROUTE-012 를 M6 에서만 센다

AC-PERMROUTE-012 의 통과 조건은 「`npm test -w server` … **실패 0**」(`acceptance.md:222`)이다. AC-001..006·013 을 재는 시험은 전부 `server/test/` 안에 산다. 그러므로 **서버 기준을 하나라도 무너뜨리는 변이는 AC-012 도 함께 무너뜨린다.**

변이표는 M6 에 대해서만 이 결합을 계산에 넣었다(「008 · **012**」). M1..M5 의 기대 집합에는 012 가 없다.

| 변이 | 표의 기대 | 결합을 넣으면 |
|---|---|---|
| M1 | 003b | 003b · **012** |
| M2 | 001 · 003a · 006 | + **012** |
| M3 | 005 · 006 · 013 | + **012** |
| M4 | 006 · 013 | + **012** |
| M5 | 001 · 002 · 003a · 006 | + **012** |

AC-011 은 「더 무너져도, 덜 무너져도 어긋남이며, **기준을 고치는 것이 아니라 어긋남을 보고한다**」(`acceptance.md:133`)고 못 박았으므로, 현재 문언대로면 run 은 여섯 행 중 **다섯 행을 어긋남으로 보고**하게 된다. 이는 1회차 F-05 와 같은 부류의 과소 계수이며, 이번에는 M6 을 더하면서 결합을 한쪽에만 적용해 생겼다. 닫는 길은 둘 중 하나다 — 012 를 다섯 행에 더하거나, 「변이 판정에서 AC-012 는 셈에서 제외한다(기준선 기준이므로)」를 표 머리에 명시하는 것. 어느 쪽이든 **한 행만 고치면 나머지가 조용히 거짓이 된다.**

### N-03a (major, 차단) — §6.1 적중 수가 명시된 범위·명령으로 재현되지 않는다

§6.1 은 범위(117 파일)와 명령(`grep -n "<어간>" $(cat <범위 목록>)`)과 어간별 적중 수를 함께 적었다 — 옳은 방향이다. 그대로 재현했다.

```
$ ls .moai/specs/*/{spec,plan,acceptance,design,research}.md server/src/*.ts server/test/*.ts channel/src/*.ts > /tmp/t34files.txt
$ wc -l < /tmp/t34files.txt
     117
```

파일 수는 일치한다. 그런데 적중 수는 **자기 자신(`SPEC-PERMROUTE-001` 의 세 문서)을 빼야만** 표와 맞는다 — 그 사실이 §6.1 어디에도 없다.

| 어간 | §6.1 | 자기 포함 | 자기 제외 |
|---|---|---|---|
| `ConnInfo` | 25 | 57 | **25** ✓ |
| `sendToBot` | 48 | 106 | **60** ✗ |
| `sendToConn` | 26 | 33 | **26** ✓ |
| `onGatewayRequest` | 58 | 65 | **58** ✓ |
| `setPermissionHandler` | 32 | 36 | **32** ✓ |
| `sendEstablished` | 13 | 17 | **13** ✓ |
| `발신 지점` | 11 | 19 | **11** ✓ |
| `@MX:WARN` | 6 | 14 | **6** ✓ |

일곱은 자기 제외로 정확히 맞고 `sendToBot` 하나만 **48 vs 60** 으로 어긋난다(파일별 집계는 `xargs grep -c -- 'sendToBot'` 로 확인했고 합이 60이다). `다섯` 행은 어간이 「(발신·메서드·경로·Gateway·send 동반 줄)」이라는 **괄호 설명**이라 돌릴 명령이 없어 재현 자체가 불가능하다.

표 자체가 「뒤에 오는 감사관이 같은 선을 긋도록」 놓인 재현 장치이므로, 재현되지 않는 칸은 그 장치의 목적을 깬다. 이 저장소가 기록한 **「훑기 표는 자기를 센다」** 부류 그대로다 — 자기 제외 여부와 측정 시점(HEAD)을 함께 적어야 귀속이 선다.

### N-03b (major, 차단) — `발신 지점` 분류란이 문서 하나를 통째로 떨어뜨렸고, 그 안에 거짓이 있다

§6.1 은 `발신 지점` 11 적중의 분류를 「`SPEC-GWAUTH-002` 열거 · `server/src/gateway.ts:261`」 둘로 적는다. 실제 분포:

```
$ cat /tmp/t34files_ex.txt | xargs grep -n -- '발신 지점'
SPEC-GWAUTH-002/acceptance.md:931 · plan.md:214 · plan.md:322 · spec.md:203 · spec.md:624
SPEC-LIVEVERIFY-001/acceptance.md:140 · :154 · :160 · spec.md:30 · spec.md:156
server/src/gateway.ts:261
```

**11 중 5건이 `SPEC-LIVEVERIFY-001` 이다.** 분류란은 그 다섯을 한 글자도 언급하지 않는다. 그중 한 자리는 이 SPEC 이 거짓으로 만드는 진술이다.

> `SPEC-LIVEVERIFY-001/acceptance.md:140`
> 「| 발신 지점이 **다섯**이고 배달 방식이 갈린다 — `sendToConn` 과 `deliver` 는 일치하는 **전부**에, `sendToBot` 은 **첫 항목**에 보내고 반환 |」

`sendToOrigin` 이 `sendEstablished` 를 지나므로 「다섯」은 여섯이 된다 — §6.2 9행·12행이 GWAUTH-002 와 `gateway.ts:261` 에 대해 인정한 것과 **정확히 같은 이유**다. 그런데 이 자리는 §6.2 표에도, §6.3 개정 제외 목록에도 없다. §6.3 이 `SPEC-LIVEVERIFY-001` 에 대해 제외한 것은 **HISTORY 행 · `plan-audit-*.md` · `evidence/**` · `progress.md`** 넷뿐이고 `acceptance.md` 는 거기 없다.

(참고로 `:160` 은 「이 SPEC 작성 시점 실측: 5건」이라 그때의 관측으로 정당히 제외할 수 있다. `:140` 은 시제 표지가 없는 본문 단언이라 다르다. 어느 쪽으로 처분하든 **표나 제외 목록 중 한 곳에는 적혀야** §6.1 이 자기 규칙을 지킨다.)

이것이 1회차 F-01 과 같은 부류의 재현이라는 점이 무겁다 — 넓힌 훑기는 적중을 **잡았고**, 떨어진 곳은 그 다음 단계인 **분류**다.

### N-04 (major, 차단) — 11행이 지목한 세 자리 중 하나는 그런 문자열을 갖고 있지 않다

§6.2 11행은 세 자리(`SPEC-PERM-001/plan.md:70` · `SPEC-PERM-001/acceptance.md:461` · `SPEC-WEBRICH-001/plan.md:234`)가 「⚠️ 봇이 접속해 있지 않아 판정을 전달하지 못했습니다 (`<request_id>`)」를 **축자로 고정**한다고 적는다.

```
$ grep -rn '접속해 있지 않아' .moai/specs/SPEC-WEBRICH-001/
(무출력, exit 1)

$ sed -n '234p' .moai/specs/SPEC-WEBRICH-001/plan.md
| 8 | 봇이 접속해 있지 않을 때 승인을 누르면 `⚠️` 결과가 오고 요청은 사라진다 | Low | 서버 설계대로다(`permissions.ts` — 해제는 전송 성공과 무관). UI 는 결과 메시지를 그대로 보여 주고 버튼을 잠근다 |
```

축자 복제가 아니라 **동작 산문**이고, 그 문장은 이 SPEC 이후에도 참이다 — 봇이 실제로 접속해 있지 않으면 `sendToOrigin` 이 `false` 를 돌려주고 여전히 `⚠️` 결과가 온다. 앞 두 자리(`plan.md:70` 의 문구 표 · `acceptance.md:461` 의 축자 인용)는 실물 대조로 정확했다. 따라서 11행의 「3자리」는 **2자리**이고, 셋째 칸은 표가 스스로 만든 거짓이다. AC-PERMROUTE-010 (ㄱ)이 「17행 각각이 대상 문서에서 실제로 착지했는가」를 재므로, run 은 낡지 않은 자리에 개정 주석을 달아 「착지」시키게 된다 — 표가 자기 검사에 통과하면서 문서를 틀리게 만드는 모양이다.

### N-05 (minor, 비차단) — REQ↔AC 양방향 대조

`acceptance.md:14-28` 기준표의 「재는 요구사항」 열을 역으로 세면:

- REQ-PERMROUTE-**003**(`ConnInfo` 가 `connId` 를 담을 수 있다 · 선택) — 대응 행 없음. AC-002(존재)와 AC-013(부재)이 사실상 양쪽을 덮으나 표에 귀속이 없다
- REQ-PERMROUTE-**006**(대기 레지스트리 보관 · 판정 경로에서 `sendToBot` 금지) — 대응 행 없음. 그런데 `plan.md:136` 은 「`AC-PERMROUTE-009` 의 (가) 명령이 **그 조항**을 기계로 잰다」고 적는다. `acceptance.md` 기준표는 009 를 REQ-**011** 에만 건다 — **두 문서가 같은 기준의 귀속을 다르게 적는다**
- REQ-PERMROUTE-**009**(새 훅·장부를 만들지 않는다) — 재는 기준이 하나도 없다. 부정형 설계 조항이지만 「새 훅이 생기지 않았다」는 grep 한 줄로 잴 수 있는 종류다

반대 방향(기준 → 요구사항)은 전건 실재하는 요구사항을 가리킨다. 고아 기준 0건.

### N-06 (minor, 비차단) — AC-013 이 요구하는 문구가 그 갈래에서는 틀린 진단이다

REQ-PERMROUTE-007 은 실패 문구가 「원인이 **「요청한 세션이 끊겼다」**임이 드러나야 한다」고 정한다. AC-013 클로즈 3 은 그 형태를 `connId` 가 **애초에 없던** 대기 항목에도 요구한다. 그 항목은 세션이 끊겨서가 아니라 신원이 기록되지 않아 실패한 것이고, 요청한 세션은 멀쩡히 살아 있을 수 있다. 이 SPEC 이 낡은 문구를 비판한 근거(「낡은 문구는 사람에게 틀린 진단을 준다」, `spec.md:157`)가 그대로 적용된다. AC-013 의 판정선을 AC-006 (ㄷ)과 같게 둔 것이 원인이며, 문구를 갈래별로 나누든 판정선을 「원인이 요청 쪽에 있음」까지만 요구하든 한 번의 결정이 필요하다.

### N-07 (minor, 비차단) — 한 줄 어긋난 앵커

§6.2 5행이 「`:75` 「축약 없이 그대로 옮긴다」」로 적었으나 `grep -n '축약 없이' SPEC-PERM-001/spec.md` → `74:`. 같은 행의 `:77`·`:80`·`:81` 은 정확하다(각각 `ConnInfo`·`sendToBot`·`setPermissionHandler` 축자 블록). 1회차 보고서도 같은 오기를 물려받았다.

---

## 5. 과잉 지적 방지 — 내가 결함으로 **올리지 않은** 것

- **`SPEC-GWAUTH-002` 를 일곱 행이 아니라 한 행으로 실은 것, 주석 1줄 처분** — 리드 지시이며 `lead-decisions.md` 에 근거가 있다. 앵커 일곱을 전부 열어 실재를 확인했고(`design.md:24` · `plan.md:105·322·459` · `acceptance.md:776·873·880` 모두 「다섯」 계열 진술 실재), 상한이 만든 **구체적 거짓은 발견하지 못했다.** 누락으로 보고하지 않는다.
- **M6 과 §5 `channel/` 무편집 금지의 충돌** — 충돌하지 않는다. `acceptance.md:210-216` 과 `plan.md:225`(§G 「예외 아님」)가 「착지하는 편집만 금지, 되돌리는 변이 탐침은 아님」을 양쪽에 적었고, 되돌림 확인을 `git hash-object` + `git diff --stat -- channel/` 로 강제하며 「그 관측이 AC-008 의 재실행」이라고 임무까지 묶었다. run 집행자가 건너뛰거나 가드를 지운 채 둘 위험은 충분히 닫혔다고 판정한다.
- **M6 의 기대 집합(008 · 012 · 서버 0건)** — 옳다. 가드 두 줄 제거 → `git diff -- channel/` 비지 않음(008 파탄) · `AC-CHANPERM-008`·`AC-CHANAUTH-007` 파탄으로 channel 126 붕괴(012 채널 절반). 서버 쪽은 AC-007 의 import 훑기까지 포함해 채널을 참조하는 기준이 없으므로 0건이 맞다. 「서버 0건이 판정값」이라는 비대칭 선언도 명료하다.
- **AC-013 의 공허성** — 공허하지 않다. 변이 M3(대체 발신)이 클로즈 1 을, M4(문구 동일화)가 클로즈 3 을 각각 무너뜨리고, 착지 이전 나무에서는 `sendToBot` 이 실제로 배달하므로 **오늘 이미 붉다.** F-07 의 처방을 실질로 이행했다.
- **`SPEC-CHANPERM-001/spec.md:210`** (범위 밖 불릿의 「`sendToBot` 호출과 전달 실패 문구」) — 소유 경계 열거이고 이 카드 이후에도 「서버가 소유한다」는 요지는 참이다. 표에 없어도 거짓을 만들지 않는다고 판정해 결함으로 올리지 않는다.
- **`SPEC-ROOMAUTHZ-001` 의 `sendToBot` 4자리** — `sendToBot` 이 전원 발신인 채 유지되므로(REQ-PERMROUTE-011) 네 자리 모두 참으로 남는다. 표에 없는 것이 옳다.

---

## 6. 이 감사 자신의 미검증 (Gaps)

- **N-01·N-02 는 실행 관측이 아니다.** 구현이 존재하지 않으므로 시험 본문·`plan.md` M3-2 의 지시 동작·AC 문언 대조로 도출했다. SPEC 이 자기 「7」을 도출한 것과 같은 종류의 추론이며, run 단계의 실제 실행이 최종 판정자다.
- **`connId` 필수 갈래의 typecheck 를 다시 돌리지 않았다.** `evidence/D1-connid-required-typecheck.txt` 를 읽어 32줄(형제 30 + 생산 2)의 파일별 집계가 §D-1 서술과 일치함을 확인했을 뿐이다. 나무를 더럽히지 않기 위해 스크래치 편집을 재현하지 않았다 — 대신 더 무거운 두 번째 주장(7자리)을 직접 셌다.
- **`다섯` 어간 행은 재현하지 못했다.** 돌릴 명령이 명시돼 있지 않다(N-03a). 그 행의 48이 옳은지 틀린지 판정하지 않았다 — 재현 불가라는 사실만 보고한다.
- **나무 상태.** 감사 시작·종료 모두 `git status --short -- server/ channel/` 빈 출력. 읽기 전용 명령만 썼다.

---

## 7. 수리 방향 (지시가 아니라 방향 — 기제는 레인이 정한다)

1. **N-01** — 「7」을 실측으로 다시 세운다. 판정선을 문장으로 고정하고(「배달을 단언하는가」 대 「배달 성패 문구를 가르는가」), 그 선으로 27 자리를 전수 분류해 M4-7 의 편집 목록과 리드 회부 기준값을 함께 갱신한다. `spec.md` §6.2 17행의 「일곱 자리 전부」 전칭도 같이 움직인다.
2. **N-02** — 변이표의 AC-012 결합을 여섯 행에 일관되게 적용하거나, 「AC-012 는 변이 셈에서 제외」를 표 머리에 명시한다. **한 행만 고치지 말 것** — 여섯 행을 새 규칙으로 다시 도출한다.
3. **N-03a** — §6.1 에 자기 제외 여부와 측정 HEAD 를 적고, `sendToBot` 48 을 재측정하며, `다섯` 행에 실제로 돌릴 수 있는 명령을 적는다.
4. **N-03b** — `발신 지점` 분류란에 `SPEC-LIVEVERIFY-001` 다섯 적중을 실어 각각을 세 부류 중 하나로 보낸다. `acceptance.md:140` 은 §6.2 의 행이 되거나 §6.3 의 제외 항목이 되어야 한다(어느 쪽이든 근거와 함께).
5. **N-04** — 11행에서 `SPEC-WEBRICH-001/plan.md:234` 를 빼거나, 그 SPEC 안에서 실제 축자 복제 자리를 찾아 대체한다. 「3자리」 수도 함께.
6. **N-05 · N-06 · N-07** — 기준표에 REQ-003·006·009 귀속을 채우고, `plan.md:136` 과 기준표의 AC-009 귀속을 일치시키며, AC-013 의 문구 요구를 그 갈래의 실제 원인에 맞추고, `:75` → `:74` 를 고친다.

---

## 8. 재판정 조건 (3회차 — 마지막)

- N-01 · N-02 · N-03a · N-03b · N-04 해소
- 3회차는 **이 결함 델타로 범위가 좁혀진다** — 위 여덟 항목의 이행 여부 + 그 수리가 낡게 만든 자리의 회귀 훑기. 전면 재감사가 아니다
- 3회차에서도 FAIL 이면 반복 상한(3)에 걸리므로 리드 처분(부채 수용 / 범위 축소 / 명시적 연장) 없이 4회차는 없다

---

작성: plan-auditor (2회차) · 2026-09-03
