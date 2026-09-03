# SPEC-PERMROUTE-001 — 진행 기록

카드 `t34` · Tier M · 요구사항 11개 · 수용 기준 **15개** (`AC-PERMROUTE-001`..`014`, `003` 이 `003a`/`003b` 로 갈림)

---

## §E.1 Plan-phase Audit-Ready Signal

```
plan_status: audit-ready
spec_version: 0.3.0
status: draft
tier: M
artifacts: spec.md + plan.md + acceptance.md + progress.md
req_count: 11
ac_count: 15          # 001..014, 003 분할 반영. 재현: grep -cE '^### AC-PERMROUTE' acceptance.md → 15
tier_ceiling: 16 / 16 — 안쪽 (REQ 11 / AC 15)
open_clarifications: 0   # 초판 2건이 리드 처분으로 닫힘 (.moai/reports/t34/lead-decisions.md)
sibling_amendments: 18행 (spec.md §6.2) — 계약 개정 1~8행 · 주석 1줄 9~12행 · 코드/시험 13~18행
                   # 자리 수는 여기 적지 않는다 — §6.2 행을 세는 것이 유일한 출처다 (0.3.0 규칙)
mutation_count: 6        # M1..M5 재도출 + M6(채널 가드 제거) 신설. 집계 기준(AC-012 전체·AC-007 후반)은 셈에서 제외
plan_audit_round_2: FAIL 0.75 / 통과선 0.80 — .moai/reports/t34/plan-audit-2.md
plan_audit_round_3: 대기 (마지막 회차 — FAIL 이면 4회차 없이 리드 처분)
code_changes_planned: server/src/gateway.ts · server/src/permissions.ts (생산 2파일)
test_changes_planned: server/test/gateway.test.ts · server/test/permissions.test.ts
                      + 개정: server/test/web-rich.test.ts · server/test/room-members.test.ts
                      + 개정: server/test/web-permission-contract.test.ts (실물 문구 재추출용 실행)
channel_changes_planned: 0 (channel/ 무편집이 AC-PERMROUTE-008 의 관측 대상; M6 변이는 되돌린다)
plan_audit_round_1: FAIL 0.6875 / 통과선 0.80 — .moai/reports/t34/plan-audit.md
```

### plan 3회차 — 2회차 감사 판정과 결함 처분표

**2회차 판정: FAIL — 종합 0.75 (통과선 0.80, Tier M).** 네 항목이 전부 0.75(Clarity·Completeness·Testability·Traceability). 회귀 신호는 상승(1회차 0.6875 → 2회차 0.75), STOP 조항 미발동. 보고서: `.moai/reports/t34/plan-audit-2.md`. 차단 다섯: N-01 · N-02 · N-03a · N-03b · N-04. 비차단 셋: N-05 · N-06 · N-07.

**이 회차의 성격 — 수를 다시 세지 않고 수의 자격을 바꿨다.** 1회차 F-01 · 2회차 N-01 · N-03a 는 같은 결함이 세 번 다른 옷을 입은 것이다: **읽어서 얻은 수를 문서에 사실로 적는 것.** 틀린 어림값을 새 어림값으로 갈아 끼우는 것은 세 번째 미귀속 계수이므로, 규칙 자체를 바꿨다 — 남는 수는 **재현 명령과 축자 출력을 달거나, 지워지고 그 자리에 명령만 남는다**(`spec.md` §6.1 [HARD]).

| 발견 | 심각도 | 처분 |
|---|---|---|
| **N-01** 「형제 시험 7자리」가 거짓 | critical · 차단 | **14 로 교체 + 귀속.** 리드 처분(`lead-decisions.md` 「정정 — 회부 방아쇠 «7» 은 거짓」)을 이행했다. 14 는 2회차 감사관의 독립 계수이며 **읽기 추론이고 실행 미검증**임을 세 자리(`spec.md` §6.2 18행 · `plan.md` §D-1 정정 2판 · 아래 Gaps)에 명시했다. 회부 방아쇠도 7 → **14**. 자리 목록 14개의 **실재**는 `grep -n 'onGatewayRequest'` 로 확인했으나 **붉어짐**은 확인하지 못했다 — M1-6 이 실측한다. 훑기로 「7」의 잔존 자리를 전수 확인해 전부 이동(§sweep 참조) |
| **N-02** 변이표가 AC-012 를 M6 에서만 셈 | major · 차단 | **표 머리에 「집계 기준 제외 규칙」을 두고 여섯 행을 새 규칙으로 재도출.** 제외 대상은 `AC-PERMROUTE-012` 전체 + **`AC-PERMROUTE-007` 의 「파일 전체 초록」 절반**(감사가 지목하지 않은 같은 부류 — 한 단계 아래에서 M1·M2·M3·M5 에 같은 결합이 있었다). M6 의 기대 집합은 `008 · 012` → **`008`**. 대안(012 를 다섯 행에 더하기)이 지는 이유 셋을 표 머리에 적었다 |
| **N-03a** §6.1 적중 수가 재현되지 않음 | major · 차단 | **자기 제외(114 파일)와 측정 HEAD 를 명시하고 열 개 어간을 전부 재측정.** `sendToBot` 48 → **60**, `다섯` 48 → **55**(초판은 어간이 괄호 설명이라 돌릴 명령이 없었다 — 좁힘 grep 을 주었다), **실패 문구 13 → 15**(감사가 지목하지 않은 셋째 어긋남). 분류란의 하위 개수는 **전부 삭제**하고 §6.2 행 번호를 가리키게 했다 |
| **N-03b** `발신 지점` 분류란이 문서 하나를 떨어뜨림 | major · 차단 | **`SPEC-LIVEVERIFY-001` 다섯 적중을 §6.1 에 갈래 표로 실었다.** `acceptance.md:140` → §6.2 **12행 신설**(주석 1줄), `:160`·`spec.md:30` → §6.3, `:154`·`spec.md:156` → **새 부류 4「거짓이 되지 않음」**. 부류가 셋뿐이라 「거짓이 아닌데 그때의 기록도 아닌」 자리를 적을 곳이 없어 조용히 떨어졌던 것이 뿌리다 |
| **N-04** 11행의 셋째 자리가 거짓 | major · 차단 | **`SPEC-WEBRICH-001/plan.md:234` 를 뺐다.** 실물 대조 결과 축자 복제가 아니라 위험 표의 동작 산문이고 이 SPEC 이후에도 참이다. **셋 전부를 다시 열었고**(하나가 틀리면 집합을 다시 검증한다), 그 훑기가 실제 축자 자리 `SPEC-WEBRICH-001/spec.md:230` 을 찾아 그 칸을 채웠다. **부수 소득: 살아 있는 코드 결합 발견** — `web/rich.js:67` `RESOLUTION_RE` 가 꼬리 「전달하지 못했습니다 (`<id>`)」만으로 판정 메시지를 인식하므로 새 문구가 그 꼬리를 끊으면 화면 버튼이 되살아난다. REQ-PERMROUTE-007 에 [HARD] 제약으로 실었다 |
| **N-05** REQ↔AC 대응 구멍 셋 | minor | **REQ-003 → AC-002·013 귀속, REQ-006 → AC-009 귀속(`plan.md` §D-5 와 일치시킴), REQ-009 → `AC-PERMROUTE-014` 신설.** 양방향 대조 결과는 아래 §REQ↔AC 표에 있다 |
| **N-06** AC-013 이 틀린 진단을 요구함 | minor | **REQ-PERMROUTE-007 을 갈래 둘로 나눴다** — (ㄱ) `sendToOrigin` 이 `false` → 「세션이 끊겼다」, (ㄴ) `connId` 부재 → 「신원이 기록되지 않았다」. AC-013 클로즈 3 은 (ㄴ) 을 요구하고 (ㄷ) 의 문구와도 다를 것을 요구한다 — **구별할 문구가 셋에서 넷으로 늘었으므로 기준은 약해진 게 아니라 강해졌다** |
| **N-07** 앵커 한 줄 어긋남 | minor | **`:75` → `:74`.** 그리고 §6.2 앵커 **전건**을 인용문 grep 으로 다시 해소했고, 그 과정에서 감사가 지목하지 않은 같은 부류 하나를 더 찾았다 — `server/src/gateway.ts:352-359` → **`:353-360`**(`:352` 는 `sendToBot` 의 `false` 계약을 적은 줄로 제거 대상이 아니고, `:360` 의 `@MX:SPEC` 은 `:359` 와 한 짝이라 함께 지운다) |

### plan 3회차 — 실행한 명령과 관측 출력

귀속: 워크트리 `.claude/worktrees/t34` · 브랜치 `WT-perm-verdict-socket` · HEAD `6a359f8` · 시작·종료 모두 `git status --short -- server/ channel/` 빈 출력. **읽기 전용 명령만 실행했다.**

전문: `.moai/reports/t34/evidence/round3-section6-rederivation.txt`

**(1) 범위 목록**

```
$ ls .moai/specs/*/{spec,plan,acceptance,design,research}.md server/src/*.ts server/test/*.ts channel/src/*.ts > scope-all.txt
$ wc -l < scope-all.txt
     117
$ grep -v 'SPEC-PERMROUTE-001' scope-all.txt > scope-ex-self.txt
$ wc -l < scope-ex-self.txt
     114
```

**(2) 어간별 적중 (자기 제외 114 파일) — §6 자기검사의 입력이자 출력**

| 어간 | 0.2.0 이 적은 값 | 3회차 실측 | 판정 |
|---|---|---|---|
| `ConnInfo` | 25 | **25** | 일치 |
| `sendToBot` | 48 | **60** | 어긋남 (N-03a) |
| `sendToConn` | 26 | **26** | 일치 |
| `onGatewayRequest` | 58 | **58** | 일치 |
| `setPermissionHandler` | 32 | **32** | 일치 |
| `sendEstablished` | 13 | **13** | 일치 |
| `발신 지점` | 11 | **11** | 일치 |
| `@MX:WARN` | 6 | **6** | 일치 |
| `다섯` (좁힘) | 48 | **55** | 초판은 재현 명령 자체가 없었다 |
| 실패 문구 | 13 | **15** | 어긋남 — **감사가 지목하지 않은 셋째 자리** |

**(3) 자기 포함 대조** — `ConnInfo` 57 · `sendToBot` 106 · `sendToConn` 33 · `onGatewayRequest` 65. 자기 제외가 필요함을 보이는 값이다.

**(4) §6 자기검사 — 표가 적은 명령을 그대로 다시 돌렸다**

리드가 명시로 요구한 항목이다(「표가 자기 지시를 따라 다시 도출되는가」). 위 (2)의 「3회차 실측」 열은 `spec.md` §6.1 표에 적힌 값이고, 아래는 그 표를 완성한 **뒤에** 같은 명령을 다시 돌린 출력이다.

```
ConnInfo               25
sendToBot              60
sendToConn             26
onGatewayRequest       58
setPermissionHandler   32
sendEstablished        13
발신 지점              11
@MX:WARN               6
다섯(좁힘)             55
실패문구               15
```

**열 행 전부가 표의 값과 일치한다 — 표가 자기 지시로 재도출된다.** 어긋난 행은 없다.

**(5) `AC-PERMROUTE-014` 세 명령 (착지 전 나무)**

```
$ sed -n '/^export interface PermissionBroker {/,/^}/p' server/src/permissions.ts | grep -cE '^  [a-zA-Z_]+\('
2
$ sed -n '/^export interface Gateway {/,/^}/p' server/src/gateway.ts | grep -cE '^  [a-zA-Z_]+\('
5
$ sed -n "/ws.on('close'/,/})/p" server/src/gateway.ts | grep -icE 'permission|broker|pending'
0
$ sed -n '/function dropConn/,/^  }/p' server/src/gateway.ts | grep -icE 'permission|broker|pending'
0
```

착지 후 기대값 `2 / 6 / 0 / 0`. `Gateway` 메서드만 `5 → 6` 으로 바뀌므로 이 기준은 공허하지 않다.

**(6) `AC` 개수 재현**

```
$ grep -cE '^### AC-PERMROUTE' acceptance.md
15
$ sed -n '/^## §D 기준표/,/^---$/p' acceptance.md | grep -cE '^\| \*{0,2}AC-PERMROUTE'
15
```

### plan 3회차 — 삭제한 수 (고치지 않고 지운 것)

**[HARD] 규칙: 측정이 덮은 자리는 수를 고치고 귀속을 붙이되, 덮지 않은 자리는 수를 지운다.** 새 수를 쓰면 아무도 재지 않은 값을 주장하게 된다.

| 지운 수 | 어디 있었나 | 그 자리에 무엇을 남겼나 |
|---|---|---|
| `ConnInfo` 분류란 「계약 개정 **3자리**」 | `spec.md` §6.1 | §6.2 행 번호 `3 · 5 · 6행` |
| `sendToBot` 분류란 「계약 개정 **4자리**」 | `spec.md` §6.1 | §6.2 행 번호 `2 · 5 · 7 · 8행` |
| `onGatewayRequest` 분류란 「형제 시험 리터럴 30자리 중 **7자리**」 | `spec.md` §6.1 | §6.2 `18행` 포인터 (수는 18행에 귀속과 함께) |
| `setPermissionHandler` 분류란 「계약 개정 **2자리**」 | `spec.md` §6.1 | §6.2 행 번호 `3 · 5행` |
| `다섯` 분류란 「GWAUTH-002 **7자리** · GATEWAY-001/acceptance **4자리** · 코드/시험 **3자리**」 | `spec.md` §6.1 | §6.2 행 번호 `9 · 10 · 12 · 13 · 16행` |
| 실패 문구 분류란 「축자 복제 **3자리** + 생산 문자열 **1자리** + 시험 상수 **1자리**」 | `spec.md` §6.1 | §6.2 행 번호 + 「생산 문자열은 §6.2 대상이 아니다」는 근거 |
| 「(가) 계약 개정 — **8자리**」 | `plan.md` M5 | §6.2 행 범위 `1~8행` |
| 「(나) 주석 1줄 — 본문 무개정, **14자리**」 | `plan.md` M5 | §6.2 행 범위 `9~12행` |
| 「표가 **17행**이 됐다」 | `spec.md` HISTORY 0.1.0 의 정정 괄호 | 「행 수는 여기 적지 않는다; §6.2 머리를 읽을 것」 |

이유는 하나다: 같은 개수를 두 곳에 적으면 한쪽이 조용히 낡는다. 이 SPEC 은 이미 그 부류로 세 라운드를 잃었다.

### plan 3회차 — REQ↔AC 양방향 대조 (N-05)

**요구사항 → 기준 (전건 피복 확인).**

| REQ | 재는 기준 | 상태 |
|---|---|---|
| 001 | AC-001 | ○ |
| 002 | AC-002 | ○ |
| **003** | AC-002(싣는 절반) · AC-013(싣지 않는 절반) | **0.3.0 이 채움** |
| 004 | AC-003a · AC-004 | ○ |
| 005 | AC-003b | ○ |
| **006** | AC-009 (가) 명령 | **0.3.0 이 채움 — `plan.md` §D-5 와 일치시킴** |
| 007 | AC-006 · AC-013 | ○ |
| 008 | AC-005 · AC-013 | ○ |
| **009** | **AC-014 (신설)** | **0.3.0 이 채움** |
| 010 | AC-007 · AC-008 | ○ |
| 011 | AC-009 | ○ |

**피복되지 않은 요구사항 0건.**

**기준 → 요구사항 (고아 기준 확인).** AC-001·002·003a·003b·004·005·006·007·008·009·013·014 는 전부 실재하는 REQ 를 가리키고, 그 REQ 본문이 실제로 그 기준이 주장하는 것을 말한다(원문 대조). AC-010(§6 표 대조)·AC-011(변이 판별력)·AC-012(기준선 비회귀) 셋은 **요구사항이 아니라 이 SPEC 자신의 검증 장치**를 재며, 기준표의 「재는 요구사항」 열이 그렇게 적고 있다. **고아 기준 0건.**

### plan 3회차 — 정정이 낡게 만든 자리 훑기

각 수정 뒤 같은 파일을 훑어 그 수정이 거짓으로 만든 문장을 찾았다.

| 훑은 것 | 찾아 고친 자리 |
|---|---|
| `7자리` · `일곱 자리` | `spec.md` HISTORY 0.2.0(정정 괄호 추가) · §6.1 `onGatewayRequest` 행 · §6.2 18행 · 「타입 검사로 확인한 것」 문단 · `plan.md` §B-3 · §D-1 두 자리 · M4-7 · `progress.md` 처분표 · Gaps |
| `17행` | `spec.md` §6.2 머리 · HISTORY 0.1.0 괄호(수 삭제) · `acceptance.md` AC-010 Given/Then · DoD 3 · `progress.md` 신호 블록 |
| `14개`(AC) | `acceptance.md` 머리 · DoD 1 · `progress.md` 머리 · 신호 블록 |
| `352-359` | `spec.md` §1.2 · §2 표 · §6.2 13행 · `plan.md` M2-5 · M4-5 |
| `1~11행` / `12~17행` | `plan.md` M4 머리 · M5 머리 |
| `:75-81` | `plan.md` M5-3 |
| AC-012 결합 | `acceptance.md` 변이표 M6 행 · 도출 문단 · DoD 2 · `plan.md` M6 |

### plan 2회차 — 1회차 감사 결함 처분표

1회차 판정: **FAIL 0.6875** (통과선 0.80, Tier M). 보고서: `.moai/reports/t34/plan-audit.md`.
차원별: Clarity 0.75 · Completeness 0.75 · Testability 0.50 · Traceability 0.75. 차단 다섯(F-01·F-02·F-03·F-04·F-05) + 비차단 셋(F-06·F-07·F-08).

| 결함 | 심각도 | 이 회차의 수리 | 착지 자리 |
|---|---|---|---|
| **F-01** §6 표가 살아 있는 거짓 넷을 빠뜨림 | critical·차단 | 어간을 둘 → **여덟**로 넓혀 재훑기. 표 9행 → **17행**. §6.1 에 훑기 범위(117 파일)·어간별 적중 수·**분류 규칙 3부류**·리드 범위 상한을 함께 적음. 감사가 지목한 ㉠㉡㉢㉣ 전부 포함 + **넓힌 훑기가 여섯 자리를 더 찾음** | `spec.md` §6.1 · §6.2 |
| **F-02** AC-009 명령이 자기 기준을 집행 못 함 | major·차단 | 필터 두 개를 **파일 경로 배제**로 교체하고, 삭제를 잡는 (나) 명령을 추가. **고친 명령을 현재 나무에서 직접 실행해 출력을 인용**(오늘 (가)는 1건 → FAIL, 착지 후 0건 → PASS 이므로 공허하지 않다) | `acceptance.md` AC-PERMROUTE-009 |
| **F-03** AC-007 이 공허 | major·차단 | 이름을 **비회귀 불변식**으로 낮추고, 「해제」의 측정 책임을 **AC-003b · AC-005** 에 명시 귀속(표로). `plan.md` §E 의 그 위에 서 있던 자기 검증 항목도 다시 씀. **가드 제거 변이 M6 을 신설해 중심 주장의 반증자를 만듦** | `acceptance.md` AC-007 · 변이표 · `plan.md` §E |
| **F-04** 미결 표식 2건 (MP-7) | critical·차단 | **리드 처분으로 둘 다 닫힘** — §D-1 **선택 필드**(조건: AC-013 신설), §D-5 **유지**(조건: REQ-PERMROUTE-006 존치). 표식 제거 + 처분 출처 명시. 필수 갈래의 파급을 **typecheck 로 실측**(30 + 2) | `plan.md` §D-1 · §D-5 · `spec.md` REQ-003 · REQ-011 |
| **F-05** 변이표 3행 과소 계수 | major·차단 | 다섯 행 **전부 재도출** + 도출 근거 명기(뿌리: AC-006 이 라우팅 성패에 종속). M1·M3 의 **정의를 구현 세부에 종속되지 않게 고정**. **M6 신설** | `acceptance.md` 변이표 |
| **F-06** 기준 개수 12 vs 13 | minor | **14개**로 정정(013 신설 반영) + 오기의 원인 명시. `spec.md` HISTORY · `progress.md` 머리 · `ac_count` · DoD 1번 전부 동반 정정 | 4자리 |
| **F-07** 공시된 공백에 기준 없음 | major·비차단 | **AC-PERMROUTE-013 신설** — 리드가 §D-1 처분에 붙인 조건이며, 「도달 불가」 논증으로 닫는 것은 명시적으로 금지. 예상 실패 갈래 항목도 「기준이 잰다」로 갱신 | `acceptance.md` AC-013 · edge cases · `plan.md` M3-5 |
| **F-08** REQ-PERM-001 귀속 오기 | minor | 「§범위 밖의 독립 불릿이며 본문이 참조하는 조항은 REQ-PERM-009」로 정정 + 출처 줄 명시 | `spec.md` REQ-PERMROUTE-009 문단 |

### 이 회차가 실행한 명령과 관측 출력

귀속: 워크트리 `.claude/worktrees/t34` · 브랜치 `WT-perm-verdict-socket` · HEAD `6a359f8`. **생산·시험 트리는 이 회차에서 순변경 0** (스크래치 편집은 측정 후 되돌렸고 되돌림을 관측했다).

**1) §D-1 파급 실측 (스크래치 편집 → typecheck → 되돌림)**

```
$ cp server/src/gateway.ts /tmp/gateway.ts.bak
$ (편집) export interface ConnInfo { roomId: number; botId: number; connId: string }
$ sed -n '20p' server/src/gateway.ts
export interface ConnInfo { roomId: number; botId: number; connId: string }

$ npm run typecheck -w server        → exit 1, 오류 줄 32
   2 src/gateway.ts
  27 test/permissions.test.ts
   2 test/room-members.test.ts
   1 test/web-permission-contract.test.ts

$ cp /tmp/gateway.ts.bak server/src/gateway.ts
$ sed -n '20p' server/src/gateway.ts
export interface ConnInfo { roomId: number; botId: number }
$ git status --short -- server/ channel/      → 빈 출력
$ npm run typecheck -w server                  → exit 0
```

전문: `.moai/reports/t34/evidence/D1-connid-required-typecheck.txt`.
**판독: 형제 시험 30 + 생산 2. 계획의 grep 분모 30 과 일치하므로 리드 재회부 조건은 발동하지 않는다.**

**2) F-02 고친 명령의 현재-나무 실행**

```
$ grep -rn 'sendToBot' server/src | grep -v '^server/src/gateway.ts:'
server/src/permissions.ts:99:      const sent = app.gateway.sendToBot(info.roomId, info.botId, { type: 'permission_verdict', request_id: requestId, behavior })
exit=0                                     ← 오늘은 1건이므로 FAIL. 착지해야 통과한다

$ grep -nE 'sendToBot\(roomId: number|sendToBot\(roomId,' server/src/gateway.ts
28:  sendToBot(roomId: number, botId: number, payload: object): boolean
361:    sendToBot(roomId, botId, payload) {
exit=0                                     ← 정확히 2행
```

**3) F-01 재훑기 — 범위와 어간별 적중**

범위 목록 생성:
```
$ find .moai/specs -name '*.md' ! -name 'progress.md' ! -name 'plan-audit*' \
    ! -name 'sync-audit*' ! -path '*/evidence/*' ! -path '*PERMROUTE*' > /tmp/scope.txt
$ ls server/src/*.ts server/test/*.ts channel/src/*.ts >> /tmp/scope.txt
$ wc -l < /tmp/scope.txt
     117
```

어간별 적중 (`grep -n "<어간>" $(cat /tmp/scope.txt) | sed -E 's/:[0-9]+:.*//' | sort | uniq -c`):

| 어간 | 적중 | 이 어간이 없었다면 놓쳤을 자리 |
|---|---|---|
| `ConnInfo` | 25 | (초판이 이미 쓴 어간) |
| `sendToBot` | 48 | (초판이 이미 쓴 어간) |
| `sendToConn` | 26 | GWAUTH-002 발신 지점 열거 |
| `onGatewayRequest` | 58 | 형제 시험 리터럴 30자리의 위치 |
| `setPermissionHandler` | 32 | PERM-001 §3 의존 계약 블록(㉡) |
| `sendEstablished` | 13 | (거짓이 되는 자리 없음 — 봉투 규칙 승계) |
| `발신 지점` | 11 | `gateway.ts:261` |
| **`다섯`** (발신·메서드·경로·Gateway·send 동반 줄) | **48** | **㉢ ㉣ 전부 + `GATEWAY-001/acceptance.md:928` + `gateway.test.ts:899`** |
| 실패 문구 (`접속해 있지`·`FAILED_BODY`) | 13 | **문구 축자 복제 3자리 + `web-rich.test.ts:19`** |

**`다섯` 어간이 결정적이다** — ㉢·㉣ 의 문장 다수가 `ConnInfo` 도 `sendToBot` 도 담고 있지 않아 초판의 두 어간으로는 원리적으로 잡히지 않았다.

**4) 넓힌 훑기가 감사보다 더 찾은 자리 여섯**

| 자리 | 왜 놓쳤나 |
|---|---|
| `SPEC-GATEWAY-001/acceptance.md:928` | 감사는 ㉢ 에서 `:187`·`:873`·`:888` 셋을 지목했다. `:928` 은 같은 문서의 넷째 자리 |
| `server/src/gateway.ts:261` | 「발신 지점 다섯」 주석. `sendToBot` 을 담고 있으나 초판 표가 `:352-359` 만 적었다 **[3회차 정정 — 그 범위 자체도 어긋났다: 실제는 `:353-360`]** |
| `server/test/gateway.test.ts:899` | 메서드 목록 배열. **포함 검사라 여섯째가 생겨도 초록** — 기계가 신호를 내지 않는 조용한 부류 |
| `server/test/web-rich.test.ts:19` | `FAILED_BODY` 상수. 화면 시험이라 **초록으로 남는** 조용한 부류 |
| 실패 문구 축자 복제 3자리 | `PERM-001/plan.md:70` · `PERM-001/acceptance.md:461` · `WEBRICH-001/plan.md:234` **[3회차 정정 — 셋째는 축자 복제가 아니었다(감사 N-04). `WEBRICH-001/spec.md:230` 으로 교체]** |
| **형제 시험 7자리** **[3회차 정정 — 실제 계수는 14, `spec.md` §6.2 18행 참조]** | `permissions.test.ts:195·323·324·347·348` · `room-members.test.ts:527·549` — **선택 필드에서도 실행으로 붉어진다.** §D-1 의 「30자리 무편집」 전제를 반증한다 |

### 기준선 — plan 레인이 이 워크트리에서 직접 실행한 값

귀속: 워크트리 `.claude/worktrees/t34`, 브랜치 `WT-perm-verdict-socket`, HEAD `6a359f8`.

| 명령 | 관측 출력 |
|---|---|
| `npm run build -w channel` | exit **0** |
| `npm test -w server` | exit **0** · `Test Files 17 passed (17)` · `Tests 210 passed (210)` |
| `npm test -w channel` | exit **0** · `Test Files 7 passed (7)` · `Tests 126 passed (126)` |

이 값은 `SPEC-LIVEVERIFY-001/progress.md` §E.4 가 적은 210·126 과 같으나 **옮겨 적은 것이 아니라 이 레인의 독립 실행 결과**다.

### 훑기 — 계획이 쓴 세 분모 (명령과 함께)

```
grep -rc 'sendToBot' . | grep -v node_modules | grep -v '/dist/' | grep -v '^\./\.git/' | grep -v ':0$'
grep -rc 'ConnInfo'  . | grep -v node_modules | grep -v '/dist/' | grep -v '^\./\.git/' | grep -v ':0$'
grep -rc 'onGatewayRequest({' server/test/*.ts
grep -rn 'info).toEqual' server/test/gateway.test.ts
```

| 값 | 관측 | 어디에 쓰였나 |
|---|---|---|
| `ConnInfo` 생산 소비자 **2파일** | `server/src/gateway.ts`(7) · `server/src/permissions.ts`(3). 그 밖은 전부 문서·보고·검증 로그 | 파급이 `server` 안에 갇힌다 — `plan.md` §D-1 |
| `sendToBot` 생산 호출자 **1** | `server/src/permissions.ts:99`. `gateway.ts` 3건은 선언(`:28`)·주석(`:261`)·구현(`:361`) 자신. 시험 8 · CHANGELOG 산문 1 | `plan.md` §D-5 의 분모 |
| `ConnInfo` 모양 리터럴 **30자리** | `permissions.test.ts` 27 · `room-members.test.ts` 2 · `web-permission-contract.test.ts` 1 | `plan.md` §D-1 의 분모 (필수 필드 시 깨지는 수) |
| `info` 정확 일치 **2자리** | `gateway.test.ts:833` · `:878` | 개정 대상, `spec.md` §6 |

### plan 단계가 확인한 것 (읽어서 확정한 전제)

디스패치가 전한 전제를 받아 적지 않고 파일을 열어 대조했다. **어긋난 것은 없었고, 디스패치가 표시하지 않은 자리 넷을 더 찾았다.**

| 전제 | 결과 |
|---|---|
| `gateway.ts:20` `ConnInfo` 에 소켓 신원 없음 | 확인 |
| `gateway.ts:34` `Established = ConnInfo & {…}` 구조적 상속 | 확인 |
| `gateway.ts:212` 등록 자리가 하나 | 확인 (`conns.set(ws, conn)`) |
| `gateway.ts:142` 요청 소켓이 버려짐 | 확인 |
| `gateway.ts:361-365` 전원 발신 · `:359` `@MX:WARN` | 확인 |
| `permissions.ts:47` `open` 맵 · `:99` `sendToBot` 호출 | 확인 |
| `channel-server.ts:220-221` `emitted` 가드 | 확인 |
| REQ-GW-020 이 **호출 모양과 `sendToBot` 계약 둘 다** 고정 | 확인 — 디스패치의 지적대로 REQ-GW-021 만이 아니라 **020 도 개정 대상**이다 |
| REQ-PERM-004 가 `onGatewayRequest(info: ConnInfo, …)` 를 글자 그대로 고정 + 2026-08-29 개정 주석 1건 존재 | 확인. 이 카드가 **두 번째** 개정 주석을 단다 |
| `t32` 감사 F-04 의 권고 = 「서버 시험에 의존을 명시하라」 | 확인 — 이 카드는 이행 대신 **대체**한다(의존 자체를 제거) |
| 기존 D-5 시험(`:855-884`)의 판별력 | 확인. 다만 **부정 단언이 없어 이 카드의 목표를 재지 못한다** |

**plan 단계가 새로 찾은 것 (디스패치에 없던 것).**

1. **REQ-PERM-009 도 개정 대상이다.** `SPEC-PERM-001/spec.md:144` 는 실패 갈래를 `sendToBot` 의 `false` 로 지목하고 그 뜻을 「그 방·봇의 연결이 없는 경우」라고 **괄호로 정의**한다. 두 자리 모두 이 카드가 거짓으로 만든다. 그래서 개정 대상은 셋이 아니라 **넷**이다.
2. **`sendToConn` 이라는 이름이 이미 쓰이고 있다.** `gateway.ts:324` 의 비공개 함수이며 **전원 발신**이다. 새 메서드를 그 이름으로 지으면 정반대 배달 방식의 동명이인이 된다 — `plan.md` §D-2 가 `sendToOrigin` 으로 고정했다.
3. **`toEqual` 정확 일치 두 자리가 신원 추가에 깨진다.** `gateway.test.ts:833` · `:878`.
4. **같은 부류의 미수리 결함이 하나 더 있다.** `handleHistory` 가 `sendToConn` 을 통해 `history_response` 를 (방, 봇) 전원에게 보낸다(`:316`·`:324`). 판정과 같은 오배달 부류이고, 이 카드의 `connId` 배선이 있으면 수리가 한 줄이다. **이 카드 범위 밖으로 등재**했다(`spec.md` §5) — 소비자 짝(`rid` 대조)의 실태를 재지 않았으므로 같은 근거를 갖지 못한다. 후속 카드 후보.

### D-5(B) 종결의 기록 위치

`SPEC-LIVEVERIFY-001/progress.md:161` 이 「D-9 · D-5(B) 는 카드 `t34` 로 이월」이라 적었다. 그 문서는 `status: completed` 이고 §E.4 는 sync 단계 소유이므로 **손대지 않는다** — 그 진술은 그때의 참이며 지금도 참이다.

**D-5(B) 의 종결은 이 SPEC 이 진다**: 이 `progress.md` §E.3(run) · §E.4(sync) 와 sync 단계의 `CHANGELOG` 항목이 기록 자리다. 완료된 형제 문서에 새 이행 주장을 끼워 넣지 않는다. **D-9 는 이 카드가 닫지 않는다** — 이월 상태 그대로 남으며, 그 사실을 여기 적는다.

### 미검증 (Gaps) — plan 단계가 관측하지 않은 것

- **`randomUUID()` 를 신원 발급에 쓰기로 한 것은 계획이며 아직 코드가 아니다.** 실제 발급 방식(UUID / 단조 증가 카운터 / 소켓 WeakMap 키)은 run 단계가 정한다. 요구사항이 거는 것은 불투명성·유일성·불변성 셋뿐이다
- **`ws.send` 가 닫히는 중인 소켓에서 조용히 실패하는 창**은 재지 않았다. `sendToOrigin` 이 목록에서 찾았으나 소켓이 이미 닫혔으면 `true` 를 돌려주고 사람은 성공 문구를 본다. 이 창은 `sendToBot` 에도 오늘 있으며 이 카드가 좁히지도 넓히지도 않는다
- **`handleHistory` 의 소비자 짝(`rid` 대조)이 채널에 실재하는지 확인하지 않았다.** 위 4번 항목을 「결함」이 아니라 「같은 부류의 자리」로만 적은 이유다
- **[해소됨 — plan 2회차]** ~~`plan.md` §D-1 의 30자리 파급은 `grep` 으로 셌고 타입 검사로 확인하지 않았다.~~ → plan 2회차가 스크래치 편집 + `npm run typecheck -w server` 로 실측했다: **형제 시험 정확히 30 + 생산 2**. 증거 `.moai/reports/t34/evidence/D1-connid-required-typecheck.txt`.
  - **[HARD] run 단계로 넘어가는 재회부 조건 (리드가 건 것).** M1 의 `typecheck` 에서 **형제 시험 파급이 30자리와 다르게 나오면 리드에 재회부한다.** 선택 필드 처분에서는 파급 0이 예상값이므로, 어떤 값이든 0 이 아니면 그 자체가 신호다. 출처: `.moai/reports/t34/lead-decisions.md` §D-1 행.

### plan 3회차가 새로 남기는 미검증 (Gaps)

- **[HARD] 「형제 시험 14자리가 붉어진다」는 실행 관측이 아니다.** 2회차 감사관의 독립 계수이고, 감사관 스스로 그 보고서 §6 Gaps 에 「구현이 없으므로 읽기 추론」이라고 공시했다. 이 회차가 확인한 것은 **그 14 자리가 파일에 실재한다**는 것뿐이며(`grep -n 'onGatewayRequest'`), **붉어지는지는 확인하지 못했다.** run M1 이후 `npm test -w server` 로 실측하고, 14 와 다르면(많든 적든) 리드에 보고한다 — 방아쇠 값은 7 이 아니라 **14** 다.
- **`다섯` 좁힘 grep 의 55 는 새 명령의 첫 측정값이다.** 0.2.0 의 48 과 대조할 동일 명령이 존재하지 않으므로 「48이 틀렸다」가 아니라 **「48은 재현 불가였다」**가 정확한 서술이다. 이 구분을 흐리면 또 한 번 미귀속 계수를 만드는 것이다.
- **`SPEC-WEBRICH-001/spec.md:230` 이 실제로 낡는지는 새 문구가 정해져야 확정된다.** 그 줄이 고정한 것은 「⚠️ … **판정을** 전달하지 못했습니다 (…)」이고, `plan.md` §D-3 이 제안한 새 문구에서는 「판정을」이 앞으로 빠져 그 부분 문자열이 사라진다 — **제안된 문구를 전제로 한 판독**이며, run 이 다른 문구를 고르면 이 행의 처분이 달라진다. run 이 문구를 확정한 직후 이 행을 재판정한다.
- **`AC-PERMROUTE-014` 의 세 명령은 인터페이스 블록의 **표기 관습**에 기댄다.** `^  [a-zA-Z_]+\(` 는 두 칸 들여쓴 메서드 줄을 세므로, 누군가 들여쓰기나 줄바꿈을 바꾸면 값이 틀어진다. 그 경우 붉어지는 것 자체는 옳은 신호이나(누군가 그 블록을 건드렸다는 뜻) 「새 훅이 생겼다」와 구별되지 않는다 — run 이 붉어짐을 만나면 원인을 갈라 보고한다.
- **집계 기준 제외 규칙이 여섯 행을 전부 덮는지는 문서 대조로만 확인했다.** M1..M6 각각에 대해 「어느 기준이 무너지는가」를 실행으로 재지 않았으므로, run 의 M6 단계가 이 규칙 자체의 첫 실측이 된다. 실행에서 집계 기준 둘이 예상대로 함께 붉었는지도 그때 기록한다.
- **`server/src/gateway.ts:353-360` 범위는 이 회차가 `sed` 로 열어 확인했으나, 그 여덟 줄을 지운 뒤 남는 코드가 컴파일되는지는 확인하지 않았다.** 주석만 지우므로 문제될 이유는 없으나 실행하지 않은 것은 실행하지 않은 것이다.

### plan 2회차가 새로 남기는 미검증 (Gaps) — 3회차 정정 표시 포함

- **변이 여섯의 결과는 여전히 실행 관측이 아니다.** 구현이 없으므로 기준 본문 대조로만 도출했다. 특히 **M6(채널 가드 제거)의 「서버 쪽 0건」은 이 SPEC 의 중심 주장 그 자체이므로, run 단계 M6 에서 실행으로 확인되기 전까지는 주장이지 관측이 아니다.**
- ~~**형제 시험 7자리가 붉어진다는 판정은 코드 판독이며 실행이 아니다.**~~ **[3회차 정정 — 「7」은 부분 계수였다. 방아쇠 값은 14 이며 그 성격도 여전히 읽기 추론이다. 위 3회차 Gaps 첫 항목이 이 항목을 대체한다.]** 원문의 나머지는 그때의 판단으로 남긴다: 선택 필드 구현이 아직 없으므로 「`info.connId` 가 `undefined` → 실패 갈래」를 코드 경로로 도출했다. run 단계 M1 이후 실제로 붉어지는 자리 수를 세어 대조해야 확정된다. **7보다 많으면 §D-1 정정의 폭이 더 넓다는 뜻이므로 리드에 보고한다.**
- **`SPEC-GWAUTH-002` 앵커 일곱의 줄 번호는 HEAD `6a359f8` 시점 판독이다.** M5 착지 시점에 인용문 grep 으로 다시 찾는다 — 줄 번호 산술로 이동폭을 추정하지 않는다.
- **주석 1줄 처분(§6.2 9~12행)이 「본문 무개정」으로 충분한지는 이 회차가 판단하지 않았다.** **[3회차 정정: 「14자리」라는 수를 지웠다 — 재현 명령이 없는 계수였고, 3회차가 12행(LIVEVERIFY)을 더해 값도 움직였다. 세려면 §6.2 의 9~12행을 센다.]** 리드 지시를 그대로 이행하며, 그 판단의 근거는 `.moai/reports/t34/lead-decisions.md` 에 있다. AC-PERMROUTE-010 이 착지 형태의 일치를 재므로 과잉도 부족도 run 단계에서 드러난다.
- **`server/test/web-rich.test.ts` 의 `FAILED_BODY` 를 새 문구로 어떻게 맞출지는 실물 추출에 달려 있다.** 새 문구를 손으로 발명하면 상수가 다시 실물과 어긋나므로, `web-permission-contract.test.ts` 의 `WEBSHARED_FAILED_BODY` 출력을 돌려 옮겨 적어야 한다. 그 실행은 run 단계의 일이다.
- **기준선 210 / 126 은 plan 1회차의 관측이며 이 회차가 재실행하지 않았다.** 이 회차가 독립 실행한 것은 `npm run typecheck -w server`(exit 0, 스크래치 되돌림 후) 하나다.

---

### 4회차 — 경계 수리 (v0.4.0). 판정이 아니라 집행이다

**3회차 감사 판정: PASS 0.8625** (`.moai/reports/t34/plan-audit-3.md`, Tier M 통과선 0.80; 궤적 0.6875 → 0.75 → **0.8625**). 필수 통과 7항 전건, 2회차 차단 N-01~N-07 종결. **SPEC 은 통과했고 4회차 감사는 없다.** 감사관 스스로 「4회차를 도는 값어치는 없다」고 적었고, 운영자가 잔여를 부채로 수용하는 대신 **범위를 넷으로 못 박은 수리 1회 → 리드 §6.1 재실행 검산 → 커밋**을 골랐다(`.moai/reports/t34/lead-decisions.md` 마지막 절). 이 회차는 그 집행이다.

**측정 조건 (귀속).** 워크트리 `.claude/worktrees/t34` · 브랜치 `WT-perm-verdict-socket` · **HEAD `6a359f8`**(3회차와 같다 — 생산 코드 무편집) · `server/` `channel/` `web/` 에 추적 변경 없음. 명령·출력 전문: `.moai/reports/t34/evidence/round4-section6-web-scope.txt`.

| 범위 항목 | 처분 |
|---|---|
| ① `web/` 를 §6.1 훑기 범위에 편입 | **완료.** 범위 명령에 `web/*.js` 추가 → `119` / `116` 파일(3회차 `117` / `114`). `grep -c 'web/' scope-ex-self.txt` 는 `0` → **`2`** |
| ② 어간 전부 재실행, 나온 행 착지 | **완료.** 움직인 값은 둘 — 실패 문구 **15 → 17**, 신설 어간 「세 템플릿」 **4**. 나머지 아홉 어간은 `web/` 적중이 0 이라 무변동. 새 §6.2 행은 **19행 하나** |
| ③ 「세 템플릿」 3자리 분류 | **완료 — 감사가 셋을 한 부류로 묶었으나 실제로는 둘로 갈린다.** `:62` 만 §6.2 19행, `:59`·`web-rich.test.ts:150` 은 부류 4 |
| ④ N3-02 · N3-03 | **완료.** 11행 근거 교체 · 제거 범위 `:353-360` → **`:354-360`** |

**③ 의 판정 근거 — 감사가 「갈래 셋」과 「본문 넷」을 합쳤다.** 3회차 감사 N3-01 은 「세 템플릿」 어간의 3자리를 함께 「거짓이 되는데 표에 없다」로 적었다. 이 회차가 `RESOLUTION_RE` **원문을 직접 읽어**(`sed -n '67p' web/rich.js`) 둘을 갈랐다: 정규식의 갈래는 `승인 전송됨` · `거절 전송됨` · `전달하지 못했습니다` **셋**이고, REQ-PERMROUTE-007 이 실패 문구를 (ㄱ)(ㄴ) 둘로 나누어도 **둘 다 꼬리가 같아 셋째 갈래 하나에 함께 걸린다.** 그러므로 정규식이 인식하는 템플릿은 착지 후에도 셋 그대로이고, 넷이 되는 것은 브로커가 내보내는 **본문**뿐이다.

- `web/rich.js:62` — 「브로커의 판정 본문은 세 템플릿 모두 …」는 **본문**을 센다 → 거짓 → **§6.2 19행 신설**
- `web/rich.js:59` — 「판정 결과 세 템플릿에서 ID 를 뽑는다」는 **갈래**를 센다 → 참으로 남음 → **부류 4**
- `server/test/web-rich.test.ts:150` — 「`permissionResolutionId` 가 세 템플릿을 모두 인식한다」도 **갈래** → **부류 4**

**[HARD] 두 자리를 고치지 않은 것은 누락이 아니라 판정이다.** 감사의 독법대로면 §6.2 에 행 셋이 생겨야 하고 실제로 생긴 것은 하나뿐이다. 뒤에 오는 사람이 이 차이를 빠뜨림으로 읽고 되살리지 않도록, 근거(정규식 원문)와 함께 `spec.md` §6.1 「세 템플릿」 절과 `plan.md` M4-8 두 자리에 적었다. `:62` 에서도 **개수 한 글자만** 고친다 — 같은 문장의 「정확히 한 줄이고」는 §4.3 [HARD] 가 요구하는 성질이라 참으로 남으며, 그것이 정규식이 계속 걸리는 조건이다.

**①②가 닫은 것은 낡은 주석 셋이 아니라 구조다.** 3회차 수리 자신이 `web/rich.js:67` 에서 살아 있는 코드 결합을 찾아 §4.3 [HARD] 제약으로 올려 놓고도 그 파일을 훑기 범위에 넣지 않았다. 그래서 「뒤집힌 자리 중 표에 없는 것이 0건」을 재는 `AC-PERMROUTE-010` 이 **이 SPEC 이 의존하는 바로 그 파일에 눈멀어** 있었고, 착지 시 **거짓으로 통과**했을 것이다. 어간을 넓히는 것으로는 닫히지 않는 부류다 — **범위 목록 자체가 상한**이며, 그 교훈을 `plan.md` §B 와 `acceptance.md` AC-010 [HARD] 에 적었다.

**함께 낡은 자리를 훑어 고쳤다** (「정정은 스스로 낡은 기록을 남긴다」 — 이 카드에서 매 회차 재현한 부류):

| 자리 | 내가 무엇을 거짓으로 만들었나 | 처분 |
|---|---|---|
| `spec.md` §6.2 제목 · `acceptance.md:34`·`:181`·`:183`·`:334` · `plan.md:164` | 표 **18행** → 19행 (개수) | 19행으로 갱신 |
| `plan.md:202` | M4 목록 범위 **13~18행** | **13~19행** |
| `spec.md` §6.1 · `plan.md:164`·`:239` · `acceptance.md:182` | 「**여덟** 어간」 — 어간이 늘어 거짓 | **수를 지우고** 「어간 표의 모든 어간」으로 (§6.1 [HARD] 의 (나) 처분) |
| `spec.md` §6.1 훑기 범위 · 측정 조건 · 범위 명령 블록 | **117** / **114** 파일 | **119** / **116** |
| `spec.md:52` (§1.2) · `spec.md:79` (§2 표) · `plan.md:189` · `plan.md:208` | 제거 범위 `:353-360` | §2 표·M2-5·M4-5 는 **`:354-360`**. §1.2 는 「`t32` 가 무엇을 적었나」라 범위를 그대로 두고 **제거 범위가 그보다 좁다는 한 줄을 덧댔다** |
| `spec.md` §3 | 「코드 변경은 두 파일」 — M4-8 이 `web/rich.js` 를 더해 거짓이 됨 | 「**동작이 바뀌는** 생산 코드 두 파일」로 좁히고, 기계적 편집 목록은 §6.2 13~19행을 가리키게 했다(파일을 두 자리에 열거하지 않는다) |
| `evidence/round3-section6-rederivation.txt` | 「목록 사본: t34-scope-*.txt」 — 그 사본을 4회차가 재생성해 119/116 을 담게 됨 | 그 파일에 **[4회차 정정]** 주석을 달아 3회차 값의 재현법을 적었다 |

**HISTORY 행은 손대지 않았다** — 「본문은 지금 참, 이력은 그때 참」. 0.2.0 행의 「여덟」·0.3.0 행의 「114」·「18행」은 그때의 기록이므로 그대로 두고, 0.4.0 행이 현재 값을 적는다.

**이 회차가 실행한 명령과 관측 (전건 재현 가능).**

| 명령 | 출력 |
|---|---|
| `ls … web/*.js > scope-all.txt; wc -l` | `119` |
| `grep -v 'SPEC-PERMROUTE-001' … ; wc -l` | `116` |
| `grep -c 'web/' scope-ex-self.txt` | `2` (3회차 `0`) |
| `grep -n -- 'ConnInfo' $F \| wc -l` | `25` (무변동) |
| `grep -n -- 'sendToBot' $F \| wc -l` | `60` (무변동) |
| `grep -n -- 'sendToConn' $F \| wc -l` | `26` (무변동) |
| `grep -n -- 'onGatewayRequest' $F \| wc -l` | `58` (무변동) |
| `grep -n -- 'setPermissionHandler' $F \| wc -l` | `32` (무변동) |
| `grep -n -- 'sendEstablished' $F \| wc -l` | `13` (무변동) |
| `grep -n -- '발신 지점' $F \| wc -l` | `11` (무변동) |
| `grep -n -- '다섯' $F \| grep -E '발신\|메서드\|경로\|Gateway\|send' \| wc -l` | `55` (무변동) |
| `grep -n -- '@MX:WARN' $F \| wc -l` | `6` (무변동) |
| `grep -nE '전달하지 못했습니다\|접속해 있지\|FAILED_BODY' $F \| wc -l` | **`17`** (3회차 `15`) |
| `grep -nE '세 템플릿\|세 결과 템플릿' $F \| wc -l` | **`4`** (신설 어간) |
| `sed -n '67p' web/rich.js` | `RESOLUTION_RE` 원문 — 갈래 셋 |
| `sed -n '350,362p' server/src/gateway.ts` | `:353` 이 동작 진술임을 확인 |
| `grep -n '전원 발신이 안전한 근거' server/src/gateway.ts` | `:357` (앵커) |

**[HARD] 재현 시 셸 주의.** 위 명령의 `$F` 는 `bash` 의 무인용 단어 분리에 기댄다. **`zsh` 는 무인용 파라미터를 분리하지 않으므로 그대로 돌리면 전 어간이 `0` 으로 나온다** — 「적중 없음」이 아니라 셸이 파일 목록 전체를 한 덩어리 파일 이름으로 넘긴 것이다(이 회차가 실제로 한 번 겪었고, 「할 수 없다/없다」를 관측으로 착각하지 않도록 `spec.md` §6.1 과 증거 파일 머리에 적어 두었다). 재현은 `bash` 로 한다.

**Gaps (이 회차가 관측하지 않은 것).**

- **테스트·타입 검사를 한 번도 돌리지 않았다.** 이 회차의 편집은 전부 문서이며 생산 코드·시험 코드를 한 글자도 고치지 않았다. 기준선 210 / 126 과 `typecheck` 는 이전 회차의 관측 그대로이고 이 회차가 재실행하지 않았다.
- **`web/rich.js:62` 의 실제 편집은 하지 않았다.** 이 회차는 그 자리를 §6.2 19행으로 **싣기만** 했고 편집은 run M4-8 의 일이다 — 이 카드의 지시가 생산 코드 무편집이었다.
- **18행의 「14」는 여전히 읽기 추론값이다.** 이 회차도 실행으로 확인하지 않았다. run M1-6 의 실측이 정하며, 14 와 다르면 리드에 보고한다(재회부 방아쇠, 무변동).
- **`web/` 의 적중이 넷뿐이라는 것은 이 회차의 어간 목록 위에서만 참이다.** 어간 목록은 상한이며, 그 상한이 바로 3회차를 눈멀게 한 구조다 — `web/app.js` 가 전 어간에서 0 이라는 것도 같은 자격의 관측이다.
- **`SPEC-WEBRICH-001` 쪽 형제 문서가 「세 템플릿」 밖에서 개수를 세는지는 이 어간이 재지 못한다.** 이 회차는 `세 템플릿`·`세 결과 템플릿` 두 표현만 잡았다.

**Residual-risk.**

- 어간 목록이 여전히 상한이다. 4회차가 닫은 것은 **범위**(파일 목록)이지 **어간**이 아니며, 「셋/세」 말고 다른 개수 표현(「두 갈래」·「네 가지」)을 세는 문장이 있으면 지금도 잡히지 않는다.
- `:62` 를 run 이 고칠 때 **같은 문장의 「정확히 한 줄이고」까지 지울 위험**이 있다. 그 성질은 참이고 정규식이 걸리는 조건이므로 19행 처분란과 M4-8 에 [HARD] 로 못 박았으나, 집행은 run 의 손에 있다.
- 이 회차에 4회차 감사가 없다. 표가 자기 자신을 빠뜨렸는지를 재는 것은 `AC-PERMROUTE-010` 의 양방향 대조뿐이며, 그것은 **run 착지 뒤**에야 돌아간다.

---

## §E.2 Run-phase Evidence

### M1 — 타입과 공개 계약 (2026-09-03, run 레인)

**귀속.** 워크트리 `.claude/worktrees/t34` · 브랜치 `WT-perm-verdict-socket` · 편집 시점 HEAD `c3d1d09`(plan 종결 — **M1 편집은 미커밋 상태로 리드 확인 대기**) · 코드 변경은 `server/src/gateway.ts` 1파일 (+12/-2).

**편집 내역 (M1-1~3 + plan 밖 최소 해석 둘).**

| 자리 | 편집 |
|---|---|
| `gateway.ts` `ConnInfo` | `connId?: string` **선택 필드** 추가 (§D-1 리드 처분) |
| `gateway.ts` `Established` | `connId: string` **필수로 좁힘** — 발급 누락을 타입이 잡는 비대칭 (§D-1 결론) |
| `Gateway` 인터페이스 | `sendToOrigin(connId: string, payload: object): boolean` 선언 추가 (REQ-PERMROUTE-004) |
| `:204` 구성 자리 | `connId: randomUUID()` 발급 — **plan 밖 판정 (가)**: `Established` 좁힘만으로는 이 자리가 타입 에러가 되어 M1-4 문턱(exit 0)을 통과할 수 없다. M2-2 의 «발급» 이 이로 선행 이행됨 |
| `createGateway` return | `sendToOrigin` 스텁(`return false`) — **plan 밖 판정 (나)**: 선언만 추가하면 return 객체가 `Gateway` 를 만족하지 못해 타입 에러. M2-4 가 진짜 구현으로 대체 |

**M1-4 — typecheck 문턱.**

```
$ npm run typecheck -w server        → exit 0
```

증거: `.moai/reports/t34/evidence/M1-typecheck-optional-field.txt`. 선택 필드이므로 형제 시험 30자리는 타입 검사에서 깨지지 않았다 — §D-1 처분의 전제 유지, 리드 재회부 조건(형제 파급 30 이탈) **미발동**.

**M1-5 — AC-PERMROUTE-014 네 명령.**

```
(ㄱ) PermissionBroker 공개 메서드   → 2
(ㄴ) Gateway 공개 메서드            → 6   (착지 전 5 — sendToOrigin 선언 관측)
(ㄷ) `ws.on('close'` 경로 참조      → 0
(ㄷ) `dropConn` 경로 참조           → 0
```

증거(명령+출력 축자): `.moai/reports/t34/evidence/M1-ac014-commands.txt`. REQ-PERMROUTE-009 (새 훅·장부 금지) 관측 — 넷 전부 기대값.

**M1-6 — 형제 시험 붉은 자리 전수 실측.**

```
$ npm test -w server   → exit 0 · Test Files 17 passed (17) · Tests 210 passed (210)
```

증거 전문: `.moai/reports/t34/evidence/M1-test-baseline-after-m1.txt`.

**[HARD] 실측 0 ≠ 추론값 14 — 리드 회부 (plan M1-6 문자대로).** 실패 자리는 0 이다. 14 는 «M2-3(핸들러 호출에 `connId` 실음)과 M3(`sendToOrigin` 배선 + `undefined` 실패 갈래)이 착지한 뒤»에야 발현되는 붉음이므로, M1 시점(배선 미착지)에서는 발현될 수 없다. plan M1-6 의 «다르면(많든 적든) 리드에 보고한다» 는 문자대로 회부한다 — **리드 판독 대상: 14 실측의 유효 시점.** (plan M4-7 이 «M1-6 의 실측이 먼저 오고 편집 대상은 그 실측이 정한다»고 가리키는 실질 시점은 배선 착지 직후로 읽힌다.) 이 회차는 처분을 리드에 위임하고 **M2 로 진행하지 않는다** — dispatch stop 조건 «M1-6 실측 ≠ 14 → 진행 멈추고 리드 보고» 의 규정 준수다.

**Gaps (이 밀스톤이 관측하지 않은 것).**

- **14 추론값의 실행 검증은 이 밀스톤에서 닫히지 않았다** — 배선이 없어 붉음의 발현 자체가 없다. 리드 판독이 시점을 정하면 그 시점의 전수 실측이 닫는다
- `npm test -w channel`(126)·`typecheck -w channel` 은 실행하지 않았다 — M1 범위 밖이며 AC-PERMROUTE-012 기준선 비회귀는 M6 이 잰다. (stop 조건의 «기준선 210 이탈» 은 이 회차의 210 유지 관측으로 무변동 확인)
- M1 편집을 **커밋하지 않았다** — 리드 확인 후 pathspec 명시 커밋 예정 (푸시 없음)

**Residual-risk.**

- 스텁 `sendToOrigin → false` 는 M2-1 의 RED 시험을 붉게 만든다. M2-1 의 RED 관측에서 «스텁 때문» 인지 «현행 전원 발신 배선 때문» 인지는 구분해 기록해야 한다 — 스텁을 치우면 전원 발신 배선만으로도 M2-1 시험(부정 단언)은 붉다. M2-4 가 스텁을 대체하며 GREEN 시점엔 소멸
- `:204` 발급이 REQ-PERMROUTE-001 의 «발급은 등록 자리 하나에서만» 을 지키는가 — 이 자리가 유일한 `conns.set` 직전 구성 자리라 단일성은 유지되나, AC-PERMROUTE-001·002 시험이 M2 착지 후 이를 실행으로 잰다

### M2 — 게이트웨이 배선, RED 먼저 (2026-09-04, run 레인)

**귀속.** 같은 워크트리·브랜치. 편집 시점 HEAD `f64027d`(M1 커밋). 코드 변경 `server/src/gateway.ts` · `server/test/gateway.test.ts` 2파일 — **미커밋, 리드 확인 대기**.

**편집 내역 (M2-1 · 3 · 4 · 5 — M2-2 «발급» 은 M1 선행 이행, 리드 «run M1 판독» 승인).**

| 항 | 편집 |
|---|---|
| M2-1 (RED) | `gateway.test.ts` 에 부정 단언 시험 신설 — «routes the verdict to the requesting connection only (AC-PERMROUTE-003a + 003b)». 같은 토큰 소켓 둘(A·B), 요청은 B, 브로커 대행 핸들러가 `sendToOrigin` 으로 되돌린다. **B 수신 관측 «뒤에»** `expectNoMessage(A)` 로 부정 절반을 센다 — «아직 안 온 것» 과 «오지 않는 것» 의 갈림 (acceptance AC-003b 관측 방법) |
| M2-3 | `:142` permissionHandler 호출에 `connId: info.connId` 실음 (REQ-PERMROUTE-002) |
| M2-4 | 스텁 대체 — `conns` 를 돌아 `c.connId === connId` 하나만 `sendEstablished` 로 보내고 `true`, 없으면 `false`. 봉투 승계(REQ-GWAUTH2-012)·단일 접속(REQ-PERMROUTE-005) |
| M2-5 | `sendToBot` 위 근거 주석 중 «첫 일치에서…» 3줄 + «전원 발신이 안전한 근거…» 2줄 + `@MX:WARN` + `@MX:SPEC` **제거** (§6.2 13행 처분 — 범위 `:354-360`). `:352`(REQ-GW-020 계약)·`:353`(동작 진술 — REQ-PERMROUTE-011 유지 요구)은 **유지** — N3-03 판정선 그대로. 앵커 `grep -n '전원 발신이 안전한 근거' server/src/gateway.ts` → 0건 (제거 관측) |

**RED 관측 (편집 전).**

```
$ npx vitest run test/gateway.test.ts -t 'routes the verdict to the requesting connection only'
  FAIL  ... > routes the verdict to the requesting connection only (AC-PERMROUTE-003a + 003b)
  Error: timeout waiting ws message
  Tests  1 failed | 34 skipped (35)   · exit 1
```
증거 전문: `.moai/reports/t34/evidence/M2-red-verdict-routing.txt`.

**[HARD] RED 귀속 공시 — plan M2-1 문구와의 어긋남.** plan 은 «현행 전원 발신 코드에서 이 시험이 실제로 붉다» 고 적었으나, 실측 RED 의 원인은 **전원 발신이 아니라 배선 부재**다 — M2-1 시점엔 `sendToOrigin` 이 M1 스텁(항상 `false`)이고 `:142` 가 아직 `connId` 를 안 싣는다(`info.connId` = `undefined`). «전원 발신 때문에 요청하지 않은 소켓이 받는다» 는 부정성은 이미 `t32` 실측(같은 (방, 봇) 소켓 셋)이 지고 있고, 착지 후에는 AC-PERMROUTE-009 의 «`sendToBot` 이 두 소켓 모두에 보냄» 회귀 절반이 그 관측의 자리가 된다. 이 어긋남은 계획 서술의 귀속 오차이지 시험 설계의 결함이 아니다 — 시험은 AC-003a+003b 를 그대로 잰다.

**GREEN 관측 (편집 후).**

```
$ npm run typecheck -w server        → exit 0
$ npx vitest run test/gateway.test.ts -t 'routes the verdict to the requesting connection only'
  Tests  1 passed | 34 skipped (35)   · exit 0
$ npm test -w server                 → exit 1
  Test Files  1 failed | 16 passed (17)
  Tests  2 failed | 209 passed (211)
```
증거: `M2-green-verdict-routing.txt` · **`M2-full-suite-green-after-m4-1.txt`**(처분 (나) 이후 초록 회복 — 211 passed, run 직접 실행. 처분 «이전» 실행 기록 `M2-full-suite-green.txt` 는 머리에 낡음 표기를 달고 보존 — 리드 판독 defect 지시).

**전체 스위트의 2건 붉음은 plan §B-2 가 예고한 예상 자리다.** `gateway.test.ts:833`·`:878` 의 `toEqual` 정확 일치가 `connId` 여분 키로 실패 — §6.2 14행·plan M4-1 이 소유한 개정 대상이며 이 밀스톤에서 고치지 않는다. M1 시점 210 전부 초록 → M2 시점 209 + 붉음 2(예상) + 신규 1 초록: 붉음의 원인이 M2-3 배선임을 편집 전후 대비가 보여 준다. 타깃 시험(AC-003a+003b)은 초록 — M2-6 «GREEN 관측» 의 문은 이것이다.

**[HARD] 처분 — M4-1 두 자리를 M2 로 선행 이행 (리드 처분 (나), 2026-09-04).** 위 실측 직후 pre-commit 게이트의 `npm test` 가 이 붉음 2건으로 M2 커밋을 차단했다 — M2~M4 사이 붉은 상태는 plan 설계상 필연이라 게이트와 구조 충돌이다. 리드가 (가) `SKIP_MOAI_PRECOMMIT=1` 우회 대신 (나) «M4-1 개정을 M2 커밋에 포함» 을 골랐다 — 근거: 우회는 거버넌스 행위이고 붉은 커밋을 이력에 남기며, (나) 는 두 줄이고 게이트가 계속 실제 검사를 한다. 개정 형태는 여분 키 허용이 아니라 **`connId` 명시 단언**(`connId: expect.any(String)`) — 배달 신원이 실렸다는 것을 시험이 스스로 재게. M4-1 자리가 `gateway.test.ts` 라 «14 실측»(permissions·room-members) 대상과 겹치지 않아 M3 직후 대조를 오염시키지 않는다 (리드 판독). plan M4 목록의 «:833·:878» 표기 정정은 **sync 때** 한다. plan §F 순서 변경은 이 처분으로 리드 승인됨.

**Gaps (이 밀스톤이 관측하지 않은 것).**

- AC-PERMROUTE-009 의 «`sendToBot` 이 두 소켓 모두에 보냄» 을 직접 셈하는 시험은 아직 없다 — 기존 D-5 시험은 «second 에 도달» 만 보증한다(옛 첫 일치 `return` 코드는 여기서 붉는다). **first 도 받음을 셈하는 회귀 시험 신설이 필요한지는 리드 판독 대상** (acceptance AC-009 의 회귀 절반)
- M3(브로커 배선·문구)은 미착지 — `permissions.ts` 무변경. «14 실측» 은 리드 판독대로 M3 착지 직후 실시
- §6.1 어간 `@MX:WARN` 의 적중 6 → 5 — M2-5 제거의 예상된 값 이동(spec §6.1 [HARD]: run 편집으로 움직이는 값은 결함이 아님). M5 역방향 훑기 시점 기준값

**Residual-risk.**

- `sendToOrigin` 의 «찾았으나 소켓이 이미 닫힌 상태» 창 — SPEC 범위 밖(acceptance 예상 실패 갈래), unchanged
- M4-1 두 자리는 리드 처분으로 M2 커밋에 선행 이행(위 처분 절) — M3 진행 시 전체 스위트는 초록이 기대값이며, pre-commit 게이트가 그것을 계속 실제 검사한다

### M3 — 브로커 배선과 문구 (2026-09-04, run 레인)

**귀속.** 같은 워크트리·브랜치. 편집 시점 HEAD `2708a7a`(M2 커밋). 코드·시험 변경 `server/src/permissions.ts` · `server/test/permissions.test.ts` · `server/test/gateway.test.ts` 3파일 — **미커밋, 리드 확인 대기**.

**편집 내역 (M3-1~5 + 리드 M2 판독 지시).**

| 항 | 편집 |
|---|---|
| M3-1 | **편집 불필요 관측** — 대기 레지스트리 `open` 이 `Map<string, ConnInfo>` 로 `info` 를 통째로 보관하므로 `connId` 는 자동 보관된다 (`permissions.ts:47`) |
| M3-2 | `permissions.ts:99` `sendToBot(...)` → **`info.connId != null ? sendToOrigin(info.connId, …) : false`** — `undefined` 대기 항목은 `sendToOrigin` 을 부르지 않고 곧바로 (ㄴ) 갈래로 (리드 처분 §D-1 이 연 갈래). 대체 발신 없음 (REQ-PERMROUTE-008). 판정 경로에서 `sendToBot` 호출 소멸 — AC-009 (가) 명령의 통과 조건 |
| M3-3 | 실패 문구 **둘로 갈림** — (ㄱ) «요청한 세션이 끊겨 판정을 전달하지 못했습니다 (id)» · (ㄴ) «요청한 세션의 신원이 기록되지 않아 판정을 전달하지 못했습니다 (id)». 옛 문구 «봇이 접속해 있지 않아…» 소멸. 둘 다 꼬리 «전달하지 못했습니다 (id)» 유지 — `RESOLUTION_RE` 결합 ([HARD]). 본문 넷(승인/거절/ㄱ/ㄴ)이 서로 모두 다름 |
| M3-4 | `permissions.test.ts` — AC-006 시험 신설 «stores three different bodies…»: 같은 토큰 소켓 셋으로 승인·거절·끊김 세 갈래 재현, 본문 셋이 서로 모두 다름 + (ㄷ) 문구가 «봇이 접속해 있지 않» 을 담지 않음을 단언 |
| M3-5 | `permissions.test.ts` — AC-013 시험 신설 «a pending entry without connId…»: 소켓 없이 `onGatewayRequest({roomId, botId}, …)` 직접 호출 + 소켓 둘(A·B) 붙인 배치 — A·B 프레임 0건 + (ㄴ) 문구 저장 + «끊겨»·«봇이 접속해 있지 않» 부정 + 꼬리 정규식 단언 |
| 리드 지시 | `gateway.test.ts` — AC-009 회귀 시험 신설 «sendToBot still reaches every matching connection and reports true»: 소켓 A·B 둘 다 `{type:'ping'}` 수신 + `true` 반환. **AC-009 매핑의 시험 이름 = 이것** (acceptance.md 기준표 «sendToBot 이 두 소켓 모두에 보냄» 절반의 실행 소유자) |

**M3 착지 직후 실측 — typecheck·전체 스위트.**

```
$ npm run typecheck -w server        → exit 0
$ npm test -w server                 → exit 1
  Test Files  2 failed | 15 passed (17)
  Tests  11 failed | 203 passed (214)
```

증거 전문: `.moai/reports/t34/evidence/M3-test-failures-full.txt`. 신규 시험 셋(AC-006·AC-013·AC-009 회귀)은 **전부 초록** — 214 = 211(기준선) + 3(신설), 실패 11건은 전부 형제 자리다.

**[HARD] «14» 실측 대조 — 리드 회부 (plan M1-6·§6.2 18행 방아쇠).** 실패 시험 **11건** — assertion 소스 라인: `permissions.test.ts` `:198·:209·:231·:255·:272·:294·:312·:332·:353` + `room-members.test.ts` `:539·:553`. **단위 변환표**: 추론 14는 «라인» 단위(배달 12 + 문구상이 2), 실측 11은 «시험» 단위다 — 추론 라인 `:303·:304`·`:323·:324`·`:347·:348` 은 같은 시험 안의 연속 라인이라 시험 단위로는 각각 하나로 뭉친다. 대응표: `:195→:198` · `:205→:209` · `:228→:231` · `:246→:255` · `:262→:272` · `:279→:294` · `:303·:304→:312`(한 시험) · `:323·:324→:332`(한 시험) · `:347·:348→:353`(한 시험) · `room-members :527→:539` · `:549→:553` — 호출·단언 라인의 이동은 시험 안에서의 상대 위치다. **추론 밖 붉음 0건 · 추론 내 미발현 0건 — 전건 대응**. 숫자로는 14(라인) ≠ 11(시험) 이므로 plan 문자대로 리드에 회부한다. **M4-7 편집 대상은 이 실측 11 시험이 정한다.**

**[HARD] 처분 — M4-7 을 M3 커밋에 선행 이행 (리드 처분, M2 선례 (나)).** M3 착지만으로는 스위트가 11건 붉어 pre-commit 게이트가 커밋을 막는다. 리드가 **M4-7(11 시험에 살아 있는 connId 심기)을 M3 커밋에 합쳐 초록으로 커밋**하라고 처분했다 — 우회 금지, RED 증거(`M3-test-failures-full.txt`)는 그대로 보존. 심기 방법: broker 직접 호출(소켓을 거치지 않아 connId 부재)을 **소켓 전송**으로 교체해 등록 경로에서 자연히 connId 가 실리게 했다. 예외 둘: «marks an undelivered» 의 off 방 요청(직접 호출 유지 — 소켓 없음이 시험 전제, (ㄴ) 실물이며 이 시험이 재는 것은 «문구 분화» 다)과 «the broker itself» 의 `tryHandleUserReply` 직접 판정(시험 본체 — 등록만 소켓으로). «connId 부재 갈래» 를 재는 시험은 AC-013 하나뿐이며 11 시험 어느 것도 그 용도로 재활용되지 않았다 (plan M4-7 [HARD] 준수). 편집 후 실측: **214 passed (214) 전부 초록** · typecheck 0 — `evidence/M3-full-suite-green-after-m4-7.txt`.

**Gaps (이 밀스톤이 관측하지 않은 것).**

- AC-006 시험의 «끊긴 소켓» 재현은 `ws.close()` + 300ms 대기에 기댄다 — close 이벤트 처리가 300ms 안에 끝난다는 관측은 이 실행에서 성립했으나 타이밍 의존이 남는다 (residual-risk 로도 적음)
- `sendToBot` 회귀 시험(AC-009)은 «전원 발신 유지» 만 재고 «판정 경로에서 안 씀» 을 재지 않는다 — 후자는 acceptance AC-009 (가) grep 명령이 잰다 (착지 후 §E.3 이행 시 재실행)
- M4 의 나머지(주석 개정·`web/rich.js:62`·`gateway.ts:261` «다섯»→여섯·`web-rich.test.ts:19` FAILED_BODY·M4-7 외 M4 항목)·M5·M6 은 미착지

### M4 — 기존 시험·코드 주석 개정 (2026-09-04, run 레인)

**귀속.** 같은 워크트리·브랜치. 편집 시점 HEAD `8e7e7ef`(M3+M4-7 커밋). **미커밋, 리드 확인 대기**. 편집 파일: `server/src/gateway.ts` · `server/test/gateway.test.ts` · `server/test/web-rich.test.ts` · `web/rich.js` 4파일.

| 항 | 편집 |
|---|---|
| M4-1 | **M2 로 선행 이행됨** (리드 처분 — M2 절 처분 절 참조) |
| M4-2 | `gateway.test.ts` D-5 시험 머리 주석 현행화 — 옛 결함 서술은 «실측 배경(이력)» 으로 유지(시제 소급하지 않음)하고 «지금의 배선(SPEC-PERMROUTE-001): 판정은 sendToOrigin 으로 «요청한 접속 하나» 에게만 되돌아간다» 를 단다. 시험 본문·단언 **무변경** (M4-3 회귀 방어선 — sendToBot 발신으로 second 도달을 재는 형태 유지) |
| M4-4 | `:955`(구 `:899`) 메서드 목록 배열에 `'sendToOrigin'` 추가 + 위 주석 «다섯 메서드» → **«여섯 메서드»** |
| M4-5 | `gateway.ts:268`(구 `:261`) «발신 지점 **다섯**(… deliver · sendToBot)» → «발신 지점 **여섯**(… · sendToBot · **sendToOrigin**)» — 열거에 여섯째 추가 |
| M4-6 | `web-rich.test.ts:19` `FAILED_BODY` 를 **실물 출력**으로 교체 — plan 지시대로 손으로 발명하지 않고 `web-permission-contract.test.ts` 를 `--disable-console-intercept` 로 돌려 `WEBSHARED_FAILED_BODY` 관측: `⚠️ 요청한 세션의 신원이 기록되지 않아 판정을 전달하지 못했습니다 (zxvbn)` — 브로커 실물(broker 직접 호출 → deny → DB 관측)이 내어 준 (ㄴ) 문구 그대로 |
| M4-8 | `web/rich.js:62` «브로커의 판정 본문은 **세** 템플릿 모두» → **«네»** — **[HARD] 준수**: 개수 한 글자만, 같은 문장의 «정확히 한 줄이고» 유지, `:59`(정규식 갈래 셋 — 부류 4)·`:60`(줄임표 인용)·`:67`(`RESOLUTION_RE` 원문) **한 글자도 무편집** — grep 원문 재관측으로 확인 |
| (dispatch must) | REQ-PERMROUTE-010 가드 근거 주석(`@MX:WARN`+`@MX:SPEC`) 제거 — **M2-5 로 이행됨**, t32 F-04 흡수 완료 |

**M4 착지 후 실측.**

```
$ npm run typecheck -w server        → exit 0
$ npm test -w server                 → exit 0 · Tests 214 passed (214)
$ git diff --stat -- channel/        → 빈 출력 (AC-008 조건 유지 — channel 무편집)
$ grep -n 'RESOLUTION_RE =' web/rich.js   → :67 원문 무변경
```

증거 전문: `.moai/reports/t34/evidence/M4-full-suite-after-m4.txt`.

**Gaps (이 밀스톤이 관측하지 않은 것).**

- M4-6 의 «실물» 관측 시점은 M3 배선 착지 뒤다 — failedBody 가 (ㄴ) 문구인 것은 현재 트리 기준이며, 그 출처 관측(`--disable-console-intercept` 실행)의 축자 출력은 이 절에 인용했다
- web/rich.js 는 server 스위트의 web-rich.test.ts 로만 재고, 별도 web 패키지 빌드는 돌리지 않았다 — `RESOLUTION_RE` 무편집이 화면 동작 무변경의 근거
- M5(형제 SPEC 개정, 리드 범위 상한)·M6(변이 검증)은 미착지

**Residual-risk.**

- «다섯» 어간은 형제 문서에 여러 자리 남아 있다(§6.2 9·10·12행 — M5 소유). 코드 쪽 «다섯» 은 이 밀스톤으로 소멸했으나 문서 쪽은 M5 까지 거짓인 채로 남는다 — plan §F 의 순서(기계적 형제 정정은 맨 끝)대로다

### M5 — 형제 SPEC 개정 (2026-09-04, run 레인)

**귀속.** 같은 워크트리·브랜치. 편집 시점 HEAD `8ad7e2d`(M4 커밋). **미커밋, 리드 확인 대기**. 편집 10파일 — 전부 `.moai/specs/` 형제 문서 (GATEWAY-001 2 · PERM-001 3 · GWAUTH-002 3 · WEBRICH-001 1 · LIVEVERIFY-001 1 — 1차 보고 «9» 정정, 리드 판독).

**편집 내역 — (가) 계약 개정 6곳 + (나) 주석 1줄 15자리 = 21자리.**

| 자리 (§6.2 행) | 착지 |
|---|---|
| (가) 1·2행 — `SPEC-GATEWAY-001/spec.md` REQ-GW-020·021 | «개정 (2026-09-04, SPEC-PERMROUTE-001)» 인용 블록 2건 — (1) 호출 모양에 `connId` (2) 판정 통로 `sendToOrigin`·`sendToBot` 생산 호출자 0 (3) `ConnInfo.connId?`·`Gateway` 여섯째 메서드. **ROOMAUTHZ-001 선례 형식** — 원문 무삭제 |
| (가) 3행 — `SPEC-PERM-001/spec.md` §3 «축약 없이» 블록 | 인용 블록 1건 — 세 자리(ConnInfo·sendToOrigin 통로·핸들러 connId) 개정 |
| (가) 4행 — `SPEC-PERM-001/spec.md` REQ-PERM-004 | **두 번째 개정 주석** — 첫 개정(2026-08-29 ROOMAUTHZ) 인용 블록 뒤에 이어서. `connId?` + 브로커 보관·`sendToOrigin` 되돌림 + (ㄴ) 갈래 |
| (가) 5행 — `SPEC-PERM-001/spec.md` REQ-PERM-006·007 | 인용 블록 1건 — **두 겹**: 통로(`sendToOrigin`, 판정 경로에서 `sendToBot` 호출 금지)·주소 단위(«접속 하나», 대체 발신 금지) |
| (가) 6행 — `SPEC-PERM-001/spec.md` REQ-PERM-009 | 인용 블록 1건 — 실패 갈래 둘·문구 둘·꼬리 유지·옛 문구 소멸 |
| (나) 7자리 — GWAUTH-002 `design.md` 표·`plan.md` 표+2문단·`acceptance.md` 2문단+변이표 | **행 지목형 주석 1줄씩** — «`SPEC-PERMROUTE-001` 이후 `sendToOrigin` 이 여섯째 발신 지점이다». 표 속 자리는 표 구조 보존을 위해 **표 끝 빈 줄 뒤에 «위 표의 …행» 지목형**으로 두어 표 재구성 금지([HARD])를 지켰다. 본문 무개정 |
| (나) 4자리 — `SPEC-GATEWAY-001/acceptance.md` | 기준표 AC-GW-017 행(표 끝 뒤 지목형)·«다섯 관측» Then 문단 뒤·:888 **코드 블록 내 JS 주석 1줄**(주석 1줄 처분에 정확히 부합)·:928 목록(목록 끝 뒤 지목형) |
| (나) 3자리 — 실패 문구 축자 복제 | `PERM-001/plan.md` 문구 표(표 끝 뒤 지목형)·`PERM-001/acceptance.md` 산문 뒤(«핵심 어절 유지로 양성 단언은 계속 성립» 명시)·`WEBRICH-001/spec.md:230` 문단 뒤(«갈래는 꼬리 공유로 셋 그대로» 명시) |
| (나) 1자리 — `SPEC-LIVEVERIFY-001/acceptance.md:140` | 사실 표 끝 뒤 지목형 주석 1줄 — `:154·:160·spec.md:30·:156` 은 손대지 않음(§6.1 갈래 표와 §6.3 판정 유지) |

**M5 (다) — §6.1 어간 명령 재실행 (bash, 자기 제외 116파일).** plan §6.1 [HARD] 대로 «값은 움직이는 것이 예상»이며 이 수는 HEAD `8ad7e2d`+M5 편집 트리 값이다:

```
ConnInfo 31 · sendToBot 67 · sendToConn 27 · onGatewayRequest 47 · setPermissionHandler 33
sendEstablished 15 · 발신 지점 19 · 다섯(좁힘) 58 · @MX:WARN 5 · 실패문구 26 · 세 템플릿 3
```

plan 값 대비 움직임의 귀속 — **+**: 개정 주석들이 어간을 언급(예: 발신 지점 11→19 은 주석 8자리의 «발신 지점» 언급). **−**: `onGatewayRequest` 58→**47** 은 M4-7 의 broker 직접 호출→소켓 전송 교체 11건, `@MX:WARN` 6→**5** 는 M2-5 제거, `세 템플릿` 4→**3** 은 M4-8 «네» 교체 — 셋 다 예상된 값 이동. 명령·출력 전문: `.moai/reports/t34/evidence/M5-section6-rerun.txt` (scope 목록 동봉).

**표 19행 착지 대조 (AC-PERMROUTE-010 (ㄱ)).** 1·2행→M4-2 제외 전 행이 착지: 1~8행=(가) 6곳 · 9행=주석 7 · 10행=주석 4 · 11행=주석 3 · 12행=주석 1 · 13행=M2-5+M4-5 · 14행=M2(리드 처분) · 15행=M4-2 · 16행=M4-4 · 17행=M4-6 · 18행=M4-7(M3 커밋) · 19행=M4-8 — **19행 전부 착지**. **(ㄴ) 뒤집힌 자리 중 표에 없는 것**: 이 회차가 편집한 SPEC 자리는 전부 표 1~12행의 자리다 — 표 밖 편집 0건. 처분란 일치 — 주석 1줄 처분 자리에 본문 재작성 없음(전부 인용 블록·코드 주석 1줄).

**[HARD] 처분 이행 — :188 «5개 메서드» 고침 (리드 M5 판독 처분, 셋 밖 무편집).** 위 Gaps 에 보고만 했던 자리를 리드가 «같은 부류의 한 줄이고 자리가 실측됐다» 로 **고치는** 쪽으로 처분했다. 이행 셋: (1) `GATEWAY-001/acceptance.md` AC-GW-017 지목 주석 옆에 **AC-GW-018 행 지목형 주석 1줄** 추가 (2) 이 SPEC `spec.md` §6.2 제목 (19행)→**(20행)** + 표 끝에 **20행 신설** (3) §6.1 어간표에 **«`[0-9]개 메서드`» 행 신설** (적중 **1**·분류 동반 — «아라비아 숫자 열거는 어간 «다섯» 이 못 잡는다» 를 표가 스스로 적음). **셋 밖은 손대지 않았다** — `spec.md:112` «§6.2 의 13~19행» 서술·`§6.3` 등은 리드 지시대로 미편집(잔존). §6.2 를 run 이 고친 근거는 리드의 명시적 처분 지시다(소유 규칙의 리드 처분 예외 — 이 문장이 그 근거 기록).

**Gaps (이 밀스톤이 관측하지 않은 것).**

- 표 밖 잔존 «거짓이 되는» 서술이 처분 셋 밖에 남는다 — `spec.md:112` 의 «§6.2 의 13~19행» 이 대표(20행이 늘어 13~20 이 참이 됨). 리드 «셋 밖 손대지 않는다» 지시로 미편집 — sync 감사가 읽을 근거는 이 문단
- 역방향 전수의 «적중 전수 분류표» 작성은 이 회차가 하지 않았다 — 어간별 총수만 재실행했고, 적중 하나하나의 «뒤집힘 여부» 분류는 AC-010 의 최종 대조(sync 직전 §E.3 이행 시)가 진다. 리드 요청 범위(어간별 수 보고+대조)는 충족
- M6(변이 검증)은 미착지

**Residual-risk.**

- «행 지목형» 주석이 표 끝에서 멀어진 자리(design.md 표·plan.md 부류표)는 행이 여럿이라 지목 문자열이 유일한 연결이다 — 지목 문자열이 원문과 일치하는지는 (다) 대조에서 확인했다

### M6-0 — 수용 기준 시험 4건 신설 (2026-09-04, run 레인 · 리드 처분 (가))

**귀속.** 같은 워크트리·브랜치. 편집 시점 HEAD `92a4ca2`(M5 커밋). **미커밋, 리드 확인 대기**. 편집 2파일 — `server/test/gateway.test.ts` · `server/test/permissions.test.ts`. **생산 코드 무변경**.

**발단.** M6 진입 전 run 이 발견한 plan 커버리지 갭 — plan M2·M3 의 시험 신설 항목(003a+003b·006·013·009 회귀)은 착지됐으나 **AC-001·002·004·005 를 개별로 재는 시험이 plan 어디에도 없다**. 영향: DoD 1항(전 AC 관측 인용) 불이행 + 변이 M2·M5 의 관측 집합이 {003a,006} 으로 동일해져 AC-011 «여섯 집합 전부 구별» 이 관측 불가. 리드가 (가) «시험 4건 신설 후 M6» 으로 처분했고 plan 갭 공시는 sync 의 plan.md 공시로 이관.

**신설 4건 — 기존 하니스 재사용, 생산 코드 무변경.**

| AC | 시험 (파일) | 잰 것 |
|---|---|---|
| 001 | gateway.test.ts «issues one stable connId per connection, distinct across connections» | 같은 접속 두 요청의 connId **같음** + 다른 접속 connId **다름** — 두 절반을 한 시험에 |
| 002 | gateway.test.ts «delivers the requesting connection identity to the handler» | roomId·botId 값 + connId 존재·타입(비어 있지 않은 문자열) |
| 004 | gateway.test.ts «returns false and delivers nowhere for a connId no connection owns» | `false` 반환 + 양쪽 소켓 0건 (`expectNoMessage`) |
| 005 | permissions.test.ts «delivers nowhere and stores the broken-session notice when the requesting socket is gone» | 사람의 답 전 경로 — 요청 소켓 끊긴 뒤 답 → 남은 소켓 0건 + (ㄱ) 실패 문구 1행 + 꼬리 |

**실측.** typecheck exit 0 · `npm test -w server` **218 passed (218)** 전부 초록 (214+4). 증거 전문: `.moai/reports/t34/evidence/M6-0-full-suite-green.txt`. (첫 실행에서 AC-002 시험이 `wsConnect` 반환 모양 실수로 1건 실패 — `{ ws, welcome }` 디스트럭처링으로 수리, 재실행 초록. RED 관측 없이 착지 — 구현이 이미 있으므로 무너짐 관측은 변이 M2·M5 가 진다, 리드 판독.)

**AC ↔ 시험/명령 매핑표 — 15개 전부 (DoD 1항 «관측 인용» 의 근거).**

| AC | 재는 시험/명령 |
|---|---|
| 001 | gateway.test.ts «issues one stable connId per connection, distinct across connections (AC-PERMROUTE-001)» |
| 002 | gateway.test.ts «delivers the requesting connection identity to the handler (AC-PERMROUTE-002)» |
| 003a | gateway.test.ts «routes the verdict to the requesting connection only» — B 수신 절반 (`nextMessage` 1건) |
| 003b | 같은 시험 — `expectNoMessage(A)` 부정 절반 |
| 004 | gateway.test.ts «returns false and delivers nowhere for a connId no connection owns (AC-PERMROUTE-004)» |
| 005 | permissions.test.ts «delivers nowhere and stores the broken-session notice when the requesting socket is gone (AC-PERMROUTE-005)» |
| 006 | permissions.test.ts «stores three different bodies for allow, deny and broken-session verdicts» |
| 007 | (가) grep 훑기 명령 (acceptance AC-007) + gateway.test.ts 파일 전체 초록 — 위 시험들 합산 |
| 008 | `npm test -w channel` 126 무변동 + `git diff --stat -- channel/` 빈 출력 (M6 에서 재실행) |
| 009 | gateway.test.ts «sendToBot still reaches every matching connection and reports true» + (가)·(나) grep 명령 |
| 010 | §6.2 표 20행 양방향 대조 (M5 착지 + §E.3 이행 시 전수) |
| 011 | 변이표 여섯 (M6 — 이번 밀스톤) |
| 012 | 세 명령 — build channel · test server(≥210) · test channel(=126) · typecheck ×2 (M6 이후 §E.3 재실행) |
| 013 | permissions.test.ts «a pending entry without connId delivers nowhere and stores the identity-missing notice» |
| 014 | grep 네 명령 — (ㄱ)2·(ㄴ)6·(ㄷ)0·0 (M1 실측, §E.3 이행 시 재실행) |

**Gaps.** — 시험 4건은 구현 존재 하의 초록 착지라 «무너뜨리는 변이» 가 없다(acceptance 의 공통 요구). 이 공백은 변이 M2·M5 가 AC-001·002 를, 변이 M3 가 AC-005 를 붉히는 것으로 닫는다 — M6 의 판정에 포함.

### M6 — 변이 검증 (2026-09-04, run 레인)

**귀속.** 같은 워크트리·브랜치. 편집 시점 HEAD `4f707c2`(M6-0 커밋). 변이는 창 안에서만 존재 — **모든 변이 복원 완료**, `git hash-object` 전·후 대조 일치(gateway `50a50aa4…` · permissions `a6a0c77b…` · channel-server `75360a1e…`). 생산 트리 코드 순변경 0.

**여섯 변이 실측 대조 — AC-PERMROUTE 기준 단위 (집계 기준 제외 규칙 적용: AC-012 전체·AC-007 «파일 초록» 절반은 변이마다 예상대로 함께 붉었고 셈에서 제외).**

| 변이 | 표 예상 | 실측 (AC 집합) | 판정 |
|---|---|---|---|
| M1 | 003b | **003b** (실패 시험 1건) | **일치** |
| M2 | 001·003a·006 | **001·003a·006** (실패 시험 17건 — 그중 14건은 형제 SPEC 기준(AC-GW-017 등 «판정 도달»)의 시험으로 이 SPEC 기준 밖, 셈 밖 — 전건 나열은 evidence/M6-mutation-M2.txt) | **일치** (AC 단위) |
| M3 | 005·006·013 | **005·006·013** (실패 시험 3건) | **정확히 일치** |
| M4 | 006·013 | **006·013 + 005 시험 붉음** (실패 시험 4건) | **어긋남 ①** — 아래 보고 |
| M5 | 001·002·003a·006 | **001·002·003a·006** (+ AC-005 시험 붉음 — 어긋남 ① 과 같은 부류, 실패 시험 22건) | AC 단위 일치 + **어긋남 ① 중복** |
| M6 | 008 — 그리고 **서버 쪽 0건** | channel 실패 5건 중 **4건이 가드를 재는 시험**(AC-CHANPERM-008·AC-CHANAUTH-007 부류) — 나머지 1건(transport-auth)은 단독 재실행 **30 passed** 로 **t36 플레이크 7번째 관측**(변이 무관). **서버 218 passed 전부 초록 — 서버 쪽 붉음 0건** | **일치** — REQ-PERMROUTE-010 반증 없음 |

증거 전문: `.moai/reports/t34/evidence/M6-mutation-M{1,2,3,4,5}.txt` · `M6-mutation-M6-channel.txt` · `M6-mutation-M6-server.txt`.

**[HARD] 어긋남 보고 — M4·M5 에서 AC-005 시험이 붉다 (표에 없음).** 원인: M6-0 이 신설한 AC-005 시험이 «실패 안내 행의 **문구 형태**»(«요청한 세션이 끊겨» 포함 + 꼬리)를 단언한다. M4(실패 문구를 성공 문구와 같게)는 그 문구를 «✅ 승인 전송됨» 으로 바꿔 AC-005 의 «실패 안내 행» 요건 자체를 위반하고, M5(connId 미실음)는 (ㄴ) 문구로 바꿔 같은 단언을 붉힌다. **AC-005 고유의 관측(남은 소켓 0건)은 두 변이 모두 통과** — 붉은 것은 문구 단언 절반이며, 그 단언은 AC-006·013 과 중복되는 «문구 분화» 관측이다. 변이표 도출 시점(M6-0 이전)엔 AC-005 시험이 없어 이 연쇄가 계산에 없었다. **기준을 고치지 않고 어긋남으로 보고한다** (plan M6 지시).

**[HARD] 어긋남 ① 처분 — (나) 확정 (리드 M6 판독).** **AC-005 시험을 완화하지 않는다** — «더 많이 재는 시험을 표에 맞춰 약화시키는 것은 방향이 거꾸로다». 이 어긋남은 **보고된 어긋남**으로 DoD 2항(«어긋남이 보고됨»)을 충족한다: **M4·M5 는 AC-005 시험의 문구 절반도 무너뜨린다(표 도출 시점에 시험 부재).** `acceptance.md` AC-011 표에 이 절반을 반영하는 개정은 본문 소유권상 **sync 에서 manager-spec 재위임** 대상이다(이 run 은 본문을 고치지 않는다).

**M2 의 형제 시험 14건 — «이 SPEC 기준 밖» 판독(리드 수용)의 전건 목록** (공통 단언: «판정 프레임이 봇 소켓에 도달한다» — AC-GW-017 등 형제 SPEC 기준의 재판정이며 AC-PERMROUTE-003a 와 같은 성격을 형제 시험이 다시 재는 것):

| 파일 | 시험 | 붉은 단언 |
|---|---|---|
| `permissions.test.ts` | delivers an allow verdict | 판정 프레임 도달 (`:198`) |
| `permissions.test.ts` | delivers a deny verdict as deny | `deny` 값 도달 (`:209`) |
| `permissions.test.ts` | accepts a verdict once | 첫 판정 도달 (`:231`) |
| `permissions.test.ts` | never resolves a request from a different room | 대조군 proper 배달 (`:255`) |
| `permissions.test.ts` | refuses an unauthenticated verdict | proper 배달 (`:272`) |
| `permissions.test.ts` | falls through non-matching text | real 배달 (`:294`) |
| `permissions.test.ts` | accepts all four verdict words | allow·deny 도달 (`:332`·`:337`) |
| `permissions.test.ts` | same request_id in two rooms | 양방 배달 (`:353`·`:358`) |
| `room-members.test.ts` | never lets a non-member approve | 멤버 판정 도달 (`:539`) |
| `room-members.test.ts` | the broker itself refuses a non-member verdict | 멤버 판정 도달 (`:553`) |
| `web-permission-contract.test.ts` | dumps the real broker bodies | 배달 본문 관측 |
| `web-permission-contract.test.ts` | AC-WEBRICH-001 delivers an approve verdict | 도달 |
| `web-permission-contract.test.ts` | AC-WEBRICH-002 delivers a deny verdict | 도달 |
| `web-permission-contract.test.ts` | AC-WEBRICH-003 extracts the real request_id | 도달 |

**t36 플레이크 7번째 관측.** 변이 M6 채널 스위트에서 `transport-auth.test.ts «the entry point closes a rejected socket…»` 1건 실패 — 변이와 무관한 전송 인증 시험이며 단독 재실행 **30 passed** 자가소멸. t25 2회 · t33 3회 · t34 1회(plan 때) · t34 M6 1회 = 관측 누적 갱신 (pick t36 시 인계).

**Gaps (이 밀스톤이 관측하지 않은 것).**

- M6 변이의 «008» 관측에서 실패한 5건 가운데 가드 재는 시험은 4건이다 — AC-CHANPERM-008·AC-CHANAUTH-007 **자체** 와 시험의 1:1 대응표는 채널 쪽 acceptance 소유로 이 회차가 재편하지 않았다. «가드를 재는 시험들이 붉었다» 는 관측까지가 이 회차의 범위
- 변이 M2·M5 의 형제 시험 붉음(각 14·16건)의 «셈 밖» 처리는 acceptance 변이표 머리의 집계 기준 제외 규칙을 «이 SPEC 의 기준이 아닌 것» 으로 확장 적용한 판독이다 — 그 확장의 적법성은 리드 판독 대상
- AC-PERMROUTE-012(기준선 비회귀)의 최종 재실행은 변이 창 밖의 깨끗한 트리에서 §E.3 이행 시 실시

**Residual-risk.**

- 변이 창 동안 채널 dist 를 재빌드했다 — 복원 뒤 재빌드·126 회복을 관측했으나, dist 는 git 추적 밖이라 «소스=dist» 는 이 재빌드 관측이 유일한 근거다 (불일치 시 서버 시험이 거짓 실패하는 기존 부류)

**Residual-risk.**

- AC-006 시험의 `brokenWs.close()` 후 정리 대기 300ms — 느린 환경에서 (ㄱ) 갈래가 (ㄷ) 로 오인될 이론적 창. 실패 시 타임아웃 상향이 수리
- «14(라인) vs 11(시험)» 단위 차이를 sync 문서 개정에서 어떻게 표기할지 — 리드 판독 후 progress·spec 정정 필요

---

## §E.3 Run-phase Audit-Ready Signal

run_status: audit-ready
run_complete_at: 2026-09-04
run_commit_sha: pending-backfill-run-close
run_lane: 칸반 run 레인 (세션 d76d8c1e) — 커밋 사슬 f64027d(M1) → 2708a7a(M2+M4-1) → 8e7e7ef(M3+M4-7) → 8ad7e2d(M4) → 92a4ca2(M5) → 4f707c2(M6-0) → 4535424(M6 증거) → run 종결 커밋(§E.3 본 커밋)

**AC 15개 ↔ 시험·관측 인용 표 (DoD 1항 근거 — 최종 재실행 귀속: 워크트리 `.claude/worktrees/t34` · 브랜치 `WT-perm-verdict-socket` · 깨끗한 트리, 변이 창 밖).**

| AC | 재는 시험/명령 | 최종 관측 (출처) |
|---|---|---|
| 001 | gateway.test.ts «issues one stable connId per connection, distinct across connections» | 초록 (`M6-0-full-suite-green.txt` 218 passed) — 변이 M2·M5 로 붉음 확인 (`M6-mutation-M2/M5.txt`) |
| 002 | gateway.test.ts «delivers the requesting connection identity to the handler» | 초록 (동상) — 변이 M5 붉음 |
| 003a | gateway.test.ts «routes the verdict to the requesting connection only» — B 수신 절반 | 초록 (동상) — 변이 M2·M5 붉음 |
| 003b | 같은 시험 — `expectNoMessage(A)` 부정 절반 | 초록 (동상) — 변이 M1 에서 **이 시험만** 붉음 (`M6-mutation-M1.txt`) |
| 004 | gateway.test.ts «returns false and delivers nowhere for a connId no connection owns» | 초록 (동상) |
| 005 | permissions.test.ts «delivers nowhere and stores the broken-session notice when the requesting socket is gone» | 초록 (동상) — 변이 M3 붉음 · M4·M5 는 문구 절반 붉음 (**보고된 어긋남**, 처분 (나)) |
| 006 | permissions.test.ts «stores three different bodies for allow, deny and broken-session verdicts» | 초록 (동상) — 변이 M2·M3·M4·M5 붉음 |
| 007 | (가) import 훑기 + gateway.test.ts 파일 전체 초록 | 훑기 **0건·exit 1** + 스위트 218 초록 (`M-final-audit-ready.txt`) |
| 008 | `npm test -w channel` 126 무변동 + `git diff --stat -- channel/` 빈 출력 | **126 passed (126)** + 빈 출력 (`M-final-channel-suite.txt`) — 변이 M6 로 붉음 확인 후 복원·재빌드·회복 관측 |
| 009 | gateway.test.ts «sendToBot still reaches every matching connection and reports true» + (가)·(나) grep | 시험 초록(M6-0 스위트) + (가) **0건**(주석 어간 수리 후 재실행 exit 1)·(나) **2행** (`M-final-audit-ready.txt`) |
| 010 | §6.2 표 양방향 대조 | M5 (다): 표 19행 전부 착지(현 20행 체계)·뒤집힌 자리 표 밖 0건·어간 재실행 (`M5-section6-rerun.txt`) — :188 처분으로 20행·어간 «`[0-9]개 메서드`» 신설 |
| 011 | 변이표 여섯 | M6 — 4일치 + 어긋남 2건 **«보고됨»** (DoD 2항 충족, 처분 (나)) (`M6-mutation-*.txt`) |
| 012 | 세 명령 | build channel **0** · test server **218**(≥210) · test channel **126**(=126) · typecheck ×2 **0** |
| 013 | permissions.test.ts «a pending entry without connId delivers nowhere and stores the identity-missing notice» | 초록 (동상) — 변이 M3 붉음 |
| 014 | grep 네 명령 | **2·6·0·0** (M1 실측과 동일 — `M-final-audit-ready.txt` 재실행) |

**Gaps.**

- AC-010 의 «역방향 전수 분류표» 완전판(적중 전건의 뒤집힘 여부 대조)은 sync-audit 영역이라 run 은 어간 재실행·착지 대조까지 담당했다
- AC-011 의 어긋남 2건은 «보고됨» 상태로 종결 — acceptance AC-011 표 갱신은 sync 의 manager-spec 재위임 대상
- «M1-6» 명칭의 14 실측은 리드 판독대로 M3 착지 직후 실측으로 이행됐고 11 시험과 전건 대응해 종결 (§E.2 M3 절)

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
