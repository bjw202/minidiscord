# SPEC 감사 보고서: SPEC-BOTMODEL-001

Iteration: 3/3 (최종, 상한)
Verdict: **PASS**
Overall Score: **0.940** (Tier L 통과선 0.85)

작성자 추론 맥락은 M1 Context Isolation 에 따라 무시했다 (Reasoning context ignored per M1 Context Isolation). 판정은 `.moai/specs/SPEC-BOTMODEL-001/` 의 산출물, 출처 보고서 원문, 저장소의 실제 소스 파일에 명령을 대서 세웠다. 「고쳤다」는 서술은 근거로 받지 않았다 — 2회차가 남긴 D11·D12·D13 세 건을 각각 현재 파일에서 다시 쟀다.

---

## 쉬운 말 요약

2회차에서 새로 찾았던 결함 세 개를 현재 파일에 명령을 대서 다시 확인했더니 **세 건 모두 실제로 닫혀 있었다.**

가장 중요했던 것은 「옳게 고쳐도 검사가 빨개지는」 문제였다. SPEC 이 쓰던 검사 문구가 너무 성겨서, 지워야 할 문장 하나뿐 아니라 **건드리면 안 되는 옳은 문장까지** 걸렸었다. 이번에 문구를 좁혔고, 그 좁힌 문구를 실제 소스에 돌려 보니 **정확히 한 건**만 걸린다 — 바로 REQ-025 가 지우라고 지목한 그 문장이다. 좁힌 문구는 네 자리(수용 기준 두 곳, 계획서, 요약본)에 **글자 하나 다르지 않게** 같이 들어가 있어서, 한 곳만 고치고 나머지가 낡는 일이 이번엔 일어나지 않았다.

두 번째는 「어떤 시험을 해도 통과할 수 없는 표」였다. 전체 시험을 한 번에 도는 기준 하나가 계산에 섞여 있어서, 무엇을 망가뜨려도 그 기준이 함께 빨개졌기 때문이다. 이번에 그 기준을 계산에서 빼고 나머지 24개로 다시 셌는데, 표의 네 줄 숫자(22·23·23·23)가 그 규칙에서 손으로 다시 도출된다. 세 번째(작은 것)도 고쳐졌다.

필수 관문 일곱은 전부 통과했고, 「글자 그대로 옮겼다」는 계약 16줄은 출처 보고서와 여전히 md5 가 같다. 점수는 0.71 → 0.889 → **0.940** 으로 올랐다. **차단 결함 0건**이라 run 단계로 넘어가도 좋다. 새로 찾은 두 건은 둘 다 작고 선택 사항이라 리드 재량이다.

---

## Must-Pass Results

| 관문 | 판정 | 이번 회차에 실행한 근거 |
|---|---|---|
| **MP-1** REQ 번호 일관성 | **PASS** | `grep -oE 'REQ-BOTMODEL-[0-9]{3}' spec.md \| sort -u \| wc -l` → **25**. 정의 줄 `grep -cE '^- \*\*REQ-BOTMODEL-[0-9]{3}\*\*' spec.md` → **25**. 번호 나열 → `001 002 … 025` 연속, `uniq -d` 적중 **0**(결번·중복 없음). zero-padding 3자리 균일 |
| **MP-2** GEARS 형식 준수 | **PASS** | **요구사항 계층(`spec.md` §6 의 REQ-BOTMODEL-001~025)에 대고 판정했다.** 25개 정의 줄 전부를 훑어 shall 형 주절 보유를 확인 — 어간 훑기로 17줄이 걸렸고, **걸리지 않은 8줄(008·010·012·013·016·017·022·023)은 개별로 읽어** 전부 shall 형임을 확인했다(「지워야 한다」·「불러야 한다」·「닫아야 한다」·「버려야 한다」·「보내야 한다」·「올려야 한다」·「와야 한다」·「찾아야 한다» — 내 첫 어간 집합이 좁았던 것이지 문안 결함이 아니다). **검증 계층(`acceptance.md` 의 AC-BOTMODEL-001~025)의 Given-When-Then 은 M3 §Scope 에 따라 이 관문에서 채점하지 않고 Group 4 에서 채점했다** |
| **MP-3** YAML frontmatter 유효성 | **PASS** | spec.md:1-16. canonical 12필드 전부 존재·형식 적합 — `id`·`title`·`version: "0.2.0"`(따옴표 semver)·`status: draft`·`created`/`updated: 2026-09-07`(ISO)·`author`·`priority: P0`·`phase`·`module`·`lifecycle: spec-anchored`·`tags`(쉼표 구분 문자열). 거부 별칭 훑기 `grep -nE '^(created_at\|updated_at\|labels\|spec_id):' spec.md` → **0건**. 선택 필드 `tier: L`·`depends_on`(13개) 적법 |
| **MP-4** §22 언어 중립성 | **N/A** | TypeScript/Node 단일 언어 저장소(`server/`·`channel/`·`web/`) 한정. 다국어 툴링 표면 없음 → MP-4 선례에 따라 자동 통과 |
| **MP-5** D7 cross-SPEC 조정 | **PASS** | `grep -oE 'SPEC-([A-Z][A-Z0-9]+-)+[0-9]+' spec.md \| sort -u` → **14건**. 14건 전부 `.moai/specs/<ID>/spec.md` 존재(부재 0) + `status:` 판독 완료 → 자기 자신만 `draft`, 나머지 **13개 전부 `completed`**. `retired`/`superseded`/`archived` **0건** → BLOCKING 없음 |
| **MP-6** D8 크로스플랫폼 규율 | **PASS** | `grep -c syscall` 을 spec·plan·acceptance·design·research·spec-compact 여섯에 실행 → **전부 0**. D8-4 자동 통과 |
| **MP-7** clarification 게이트 | **PASS** | `grep -rn '\[NEEDS CLARIFICATION' plan.md research.md` → **출력 없음**. 미해결 마커 0건 |

**필수 관문 일곱 전부 통과. 차단 등가(MP-5·MP-6·MP-7) 위반 0건.**

---

## Category Scores (0.0-1.0, 루브릭 앵커)

| 차원 | 점수 | 밴드 | 근거 |
|---|---|---|---|
| **Clarity** | **0.93** | 1.0 밴드 근접 | 2회차 감점 사유였던 D13(변이 ㉠ 의 한정 상실)이 닫혔다 — `acceptance.md:248` ㉠ 행이 「재전송 쿼리의 `JOIN room_bots` 절 제거(**전역 커서 하나로 되돌리기**)」로, `acceptance.md:61` AC-004 변이 확인 줄도 같은 괄호 한정을 갖췄다. `acceptance.md:252` 에 한정이 필요한 이유(별칭 `rb` 미정의로 SQL 자체가 깨짐)까지 명시. 1회차 D5·D6·D7 도 유지 확인. 감점: **D14**(변이 붉음/초록을 파일 종료코드로 읽을지 개별 단언으로 읽을지 한 줄이 두 뜻으로 읽힌다 — 선택) |
| **Completeness** | **0.93** | 1.0 밴드 | HISTORY·§1 배경(WHY)·§2·§3(WHAT)·§6 REQUIREMENTS·acceptance.md·§5 Out of Scope 전부 존재(`grep -nE '^## ' spec.md` 로 8절 확인). Out of Scope 는 `### Out of Scope — <주제>` H3 **셋**(spec.md:127·134·142)에 각각 `-` 항목 → `OutOfScopeRule` 만족. frontmatter 12/12. plan.md §B.7 마일스톤 합집합 표 유지. 감점: **D15**(3회차 수리가 `progress.md` 에만 기록되고 spec.md HISTORY 에 행이 없다 — 선택) |
| **Testability** | **0.95** | 1.0 밴드 | 2회차의 두 감점(D11 거짓 양성·D12 관측 불가)이 **둘 다 실측으로 닫혔다**(아래 §해소 대조표 D11·D12 참조). 25 기준 전부가 명령 또는 인프로세스 단언으로 이분 판정한다. 약속 어휘 훑기 `grep -nE '적절\|합리적\|적당\|알맞' acceptance.md spec.md plan.md` → **0건**. AC-025 넷째의 「종료 코드 ≠ 0」 이분 유지. 감점 잔여는 D14 한 건뿐 |
| **Traceability** | **0.95** | 1.0 밴드 | 양방향 기계 검증. **REQ→AC**: 25개 REQ 각각 `grep -c` 로 acceptance.md 적중 확인 → **미대응 0건**. **AC→REQ**: `grep -E '^### AC-BOTMODEL-' acceptance.md \| grep -vc 'REQ-BOTMODEL-'` → **0**(25 제목 전부가 대응 REQ 인용). **마일스톤 합집합**: 표를 믿지 않고 독립 계산 `grep '^판정: ' plan.md \| grep -oE '[0-9]{3}' \| sort -n \| uniq -c` → 001~025 전부 적중, 겹침은 `016` 하나(M2·M3) → 서로 다른 25개. §B.7 표의 개수(2·3·6·8·4·3)와 일치 |

**집계(비가중 조화평균, `agent-common-protocol.md` § Skeptical Evaluation Stance)**:
`4 ÷ (1/0.93 + 1/0.93 + 1/0.95 + 1/0.95)` = **0.9399**. 산술평균 0.940 도 같은 결론.

**Tier L 통과선 0.85 초과.**

**점수 회귀 없음**: 0.710(1회차) → 0.889(2회차) → **0.940(3회차)**. LEAN STOP 조건(iter(N+1) < iter(N)) 미해당 → STOP 신호를 내지 않는다.

---

## D1–D13 해소 대조표

D1~D10 은 2회차에서 현재 파일에 대고 각각 재측정해 전부 RESOLVED 로 확정됐고, 그 근거가 된 파일 자리는 이번 회차에도 바뀌지 않았다(`spec.md` mtime 14:23 < 2회차 보고서 14:32). Retry Loop Contract 의 delta 범위 규정에 따라 **D11·D12·D13 은 전수 재측정**했고, D1~D10 은 회귀 여부만 확인했다.

| # | 결함 요지 | 판정 | 이번 회차 증거 |
|---|---|---|---|
| **D1** | AC-004 전제가 AC-024 에 의해 도달 불가 | **RESOLVED (유지)** | `acceptance.md:51` 인용 블록 + 두 갈래 ㉮·㉯ 배치 현존 확인. 회귀 없음 |
| **D2** | AC-001·002 를 실행할 하네스 부재 | **RESOLVED (유지)** | `acceptance.md:26`·`:40` 판정 명령 행 현존. 명명 하네스(`wsConnect`·`stub.sent`·`obs.callTool`) 2회차 소스 확인분 유지 |
| **D3** | plan.md 마일스톤이 AC 넷 미배정 | **RESOLVED (재측정)** | 독립 계산으로 합집합 **25/25** 재확인(위 Traceability 행) |
| **D4** | acceptance.md 머리말 자기 계수 오류 | **RESOLVED (재측정)** | `acceptance.md:5` 현재 문안 「셸 grep 으로만 서는 기준은 **AC-007·AC-008 둘**」 + AC-009 제외 근거 명시 |
| **D5** | §3 「해석 금지」 대 REQ-014 충돌 | **RESOLVED (유지)** | spec.md:57 우선순위 문단 + :81 각주 현존 |
| **D6** | REQ-003 서법 혼재 | **RESOLVED (유지)** | spec.md:156 shall 형 한 문장 두 절 |
| **D7** | 「취지를 담는다」류 해석 판정 셋 | **RESOLVED (유지)** | acceptance.md:97 양성/음성 두 `includes()` 현존, spec.md:193 글자 그대로 문자열 |
| **D8** | AC-025 넷째 비이분 판정 | **RESOLVED (재측정)** | `acceptance.md:225` 「네 명령 모두 **이분 판정**이 선다 — … ④는 종료 코드가 **0 이 아니다**」 |
| **D9** | AC→REQ 인용 0개 | **RESOLVED (재측정)** | `grep -vc 'REQ-BOTMODEL-'` → **0** (25/25 인용) |
| **D10** | REQ-021 구현 세부 (선택) | **RESOLVED (유지)** | `acceptance.md:182` 「기제 교체 시 단서」 현존 |
| **D11** | 끝 조건 셸 grep 이 옳은 구현에서도 붉어짐 (차단) | **RESOLVED (실측)** | 아래 §D11 검산 |
| **D12** | 변이 집합 판정이 AC-025 를 셈에 넣지 않아 관측 불가 (차단) | **RESOLVED (재도출)** | 아래 §D12 검산 |
| **D13** | 변이 ㉠ 서술이 AC-003 의 한정을 잃음 (선택) | **RESOLVED (실측)** | 아래 §D13 검산 |

**13건 전부 해소. 미해소 0건 → 세 회차 반복 결함 없음 → 정체(stagnation) 신호 없음.**

---

## 지시받은 검산 넷

### ① D11 — 좁힌 grep 패턴을 현재 트리에 직접 실행 → **적중 정확히 1건**

SPEC 이 지금 쓰는 패턴을 그 형태 그대로 돌렸다.

```bash
$ grep -rn "다음에 since_id 로 넘기면" channel/src
channel/src/channel-server.ts:30:  '커서로는 chat_id 를 쓰세요. 마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.',
$ grep -rn "다음에 since_id 로 넘기면" channel/src | wc -l
1
```

**적중 1건이고 그 한 건이 `channel-server.ts:30` — REQ-BOTMODEL-025 가 지우라고 지목한 바로 그 `INSTRUCTIONS` 문장이다.** 2회차가 붉게 만들던 `:145`(`fetch_history` 도구 설명, 이 SPEC 이 건드리지 않는 옳은 문장)는 이제 걸리지 않는다 — 그 줄은 「since_id 로**는**」이라 「다음에 since_id 로 넘기면」에 적중하지 않는다.

대조군으로 옛 성긴 패턴도 함께 돌려 좁힘이 실제로 작동했음을 확인했다.

```bash
$ grep -rn "since_id 로" channel/src | wc -l
2
```

**즉 2 → 1 로 좁혀졌고, 남은 1건이 지울 대상이다.** 구현이 REQ-025 를 이행하면 AC-008 의 셸 팔은 0건이 되어 참이 된다 — 2회차의 거짓 양성이 사라졌다.

### ② D11 — 네 자리가 글자 그대로 같은가 → **참**

같은 끝 조건이 실려 있는 자리를 고정 문자열로 찾았다. 고정 문자열 하나가 네 자리 모두에 적중했다는 사실 자체가 그 명령 문자열이 네 자리에서 **바이트 동일**하다는 증거다.

```bash
$ grep -n 'grep -rn "다음에 since_id 로 넘기면" channel/src' acceptance.md plan.md spec-compact.md
plan.md:144:grep -rn "다음에 since_id 로 넘기면" channel/src                # 0건
spec-compact.md:92:grep -rn "다음에 since_id 로 넘기면" channel/src         # 0건
acceptance.md:90:**When** `grep -rn "다음에 since_id 로 넘기면" channel/src` 를 실행한다
acceptance.md:230:grep -rn "다음에 since_id 로 넘기면" channel/src           # 0건
```

**네 자리(acceptance.md AC-008 When · acceptance.md AC-025 ③ · plan.md §D · spec-compact.md) 전부 좁힌 형태.** 2회차가 지목한 「한 자리만 고치면 나머지 셋이 낡는」 부류는 재현되지 않았다.

성긴 옛 패턴(`"since_id 로"`)이 남은 자리도 전수로 훑었다 — `plan.md:148`·`acceptance.md:93`·`spec-compact.md:96`·`research.md:64` 넷인데, **모두 「가이드는 이렇게 적지만 그 형태는 적중이 둘이라 좁혔다」고 설명하는 산문**이지 판정 명령이 아니다. 낡은 끝 조건 잔여 **0건**.

덧붙여 `research.md:64` 에 **좁힘의 근거가 관측으로 기록**돼 있다 — 2회차가 지적한 「현재 트리에 대고 다시 재지 않고 가이드를 옮겨 왔다」가 이번에 실측으로 메워졌다.

### ③ D12 — 변이표 네 행이 명시된 규칙에서 다시 도출되는가 → **참, 네 행 전부**

현재 규칙(`acceptance.md:243`):

> **AC-BOTMODEL-025 는 전체 스위트를 재는 집계 기준이므로 이 집합 판정에서 제외한다** … 따라서 이 집합 판정의 대상은 개별 기준 **24개(AC-001~024)** 다.

이 규칙 아래 네 행을 손으로 다시 셌다. 기준선 **24**.

| 변이 | 붉음(표) | 붉음 개수 | 24 − 붉음 | 표의 초록 값 | 도출 |
|---|---|---|---|---|---|
| ㉠ | AC-003 **그리고** AC-004 갈래 ㉮ | 2 | **22** | 「나머지 **22 기준**」 | ✅ 일치 |
| ㉡ | AC-004 갈래 ㉯ **만** | 1 | **23** | 「AC-003 포함 나머지 **23 기준**」 | ✅ 일치 |
| ㉢ | AC-019 **만** | 1 | **23** | 「나머지 **23 기준**」 | ✅ 일치 |
| ㉣ | AC-019 **만** | 1 | **23** | 「나머지 **23 기준**」 | ✅ 일치 |

**네 행 전부가 명시된 24 기준선에서 다시 도출된다.** 2회차가 지적한 「강화된 규칙 아래 모든 행을 다시 도출하지 않았다」가 닫혔다 — ㉠ 의 「23」이 「22」로 함께 움직였고(제외 도입이 손으로 적은 값을 바꾼 자리), 나머지 셋도 새 기준선에서 참이다.

규칙이 자기 근거도 함께 적는다: AC-025 의 첫째 명령 `npm test` 가 루트에서 두 워크스페이스를 전부 돌아 개별 기준의 판정 파일을 포함하므로 어떤 변이에도 함께 붉어진다는 것, 그리고 **AC-025 는 변이를 넣지 않은 트리에서만 판정한다**는 것.

**형제 사본 훑기**: 같은 표가 실린 다른 자리를 전수로 찾았다(`grep -n '하나만 붉어진다\|집합 일치\|나머지 2[0-9] 기준\|변이 시험 넷'`). `progress.md:35-41` 에 사본이 하나 있는데 **24 기준선·22/23/23/23·㉠ 괄호 한정까지 acceptance.md 와 동기화**돼 있다. 「한 파일만 훑고 형제를 낡게 두는」 부류 재현 없음.

### ④ D13 — 변이 ㉠ 의 괄호 한정 복원

`acceptance.md:248` ㉠ 행 대상 칸: 「재전송 쿼리의 `JOIN room_bots` 절 제거(**전역 커서 하나로 되돌리기**)」. AC-003(`acceptance.md:47`)·AC-004 변이 확인(`acceptance.md:61`) 셋이 같은 한정을 갖는다. `acceptance.md:252` 에 한정이 없으면 SQL 이 깨져 다른 이유로 집합 판정이 어긋난다는 설명까지 붙었다. **해소.**

### ⑤ 계약 문안 verbatim md5 (`v2-refactoring-guide.md` §2 A-1)

```bash
$ sed -n '80,106p' .moai/reports/v2-refactoring-guide.md | grep -v '^\*\*' | grep -v '^```' | grep -v '^$' > /tmp/aud3/guide.txt
$ sed -n '59,93p'  .moai/specs/SPEC-BOTMODEL-001/spec.md  | grep -v '^###' | grep -v '^```' | grep -v '^>' | grep -v '^$' > /tmp/aud3/spec.txt
$ wc -l /tmp/aud3/guide.txt /tmp/aud3/spec.txt
      16 /tmp/aud3/guide.txt
      16 /tmp/aud3/spec.txt
$ diff /tmp/aud3/guide.txt /tmp/aud3/spec.txt; echo "exit=$?"
exit=0
$ md5 -q /tmp/aud3/guide.txt; md5 -q /tmp/aud3/spec.txt
a8d475781ed067de9b921d675b06aeab
a8d475781ed067de9b921d675b06aeab
```

**계약 16줄 md5 동일**, 2회차와 같은 값(`a8d4757…`). DDL 두 줄·HTTP 세 줄·프레임 두 줄·MCP 세 줄·게이트웨이 규칙 세 줄·`role` 괄호 주석·재전송 SQL 포함. 3회차 수리가 `acceptance.md`·`plan.md`·`spec-compact.md`·`research.md` 넷만 건드리고 `spec.md` §3 을 건드리지 않았음이 md5 로 확인된다.

### ⑥ 기준 개수 상한 (Tier L 25)

```bash
$ grep -cE '^### AC-BOTMODEL-' acceptance.md                     # 25
$ grep -oE 'AC-BOTMODEL-[0-9]+' acceptance.md | sort -u | wc -l   # 25
$ grep -cE '^- \*\*REQ-BOTMODEL-[0-9]{3}\*\*' spec.md             # 25
```

**REQ 25 / AC 25 — Tier L 상한에 정확히 닿고 초과 없음. 3회차 수리가 새 번호를 하나도 만들지 않았다**(2회차 25/25 대비 증감 0). 「D11·D12·D13 은 전부 기존 문장 수정으로 닫힌다」는 2회차 과잉 설계 제동이 지켜졌다.

---

## Defects Found (구조화 결함 목록)

**차단(blocking) 결함 0건.** D1~D13 전부 해소. 아래 둘은 이번 회차에 새로 관측한 것이며 **둘 다 선택(optional)** 이다 — M6 분류상 SPEC 이 실제로 선언한 기준의 정합성을 깨지 않고, 루브릭 점수에도 각각 0.02 만큼만 반영했다. 리드 재량으로 닫지 않고 run 에 넘겨도 구현자가 막히지 않는다.

### D14 — `acceptance.md:243` — 변이 판정의 「붉음」을 파일 종료코드로 읽을지 개별 단언으로 읽을지 한 줄이 두 뜻으로 읽힌다 — Severity: minor — Class: **optional**

D12 수리가 도입한 판정 규칙은 이렇게 적는다.

> 변이 판정은 **표가 지목한 파일별 실행**(`npm test -w server -- gateway.test.ts` 처럼 기준이 적은 판정 명령)으로만 잰다.

「파일별 실행으로만 잰다」를 **그 명령의 종료 코드**로 읽으면 표 ㉡ 행이 성립하지 않을 수 있다. AC-004 의 판정 파일은 `server/test/gateway.test.ts`(`acceptance.md:61`)이고, AC-003 은 판정 파일을 따로 적지 않지만 같은 재접속·재전송 경로를 재므로 실무상 같은 파일에 놓인다 — 실제로 SPEC 자신이 ㉠ 을 「한 줄을 두 기준이 함께 지키는 자리」라고 적는다. 그렇다면 변이 ㉡ 이 AC-004 ㉯ 를 붉게 만드는 순간 그 파일의 종료 코드가 0 이 아니게 되고, ㉡ 행이 「AC-003 은 초록」이라고 적은 것이 종료코드 독법에서는 관측되지 않는다. **이것은 D12 가 AC-025 에 대해 고친 것과 같은 모양이 한 단계 아래에서 반복되는 형태다.**

다만 **다른 독법에서는 표가 성립한다.** `acceptance.md:3` 이 「각 기준은 **명령 하나 또는 인프로세스 단언 하나**로 판정한다」고 못 박으므로, 인프로세스 단언을 가진 기준의 붉음/초록은 파일 종료코드가 아니라 **그 기준의 단언 결과**로 읽는 것이 이 문서의 판정 단위와 맞는다. vitest 는 `it()` 단위로 결과를 내므로 실무적으로도 가능하다. 그 독법에서 AC-025 만 특별한 이유도 분명해진다 — AC-025 에는 자기 몫의 인프로세스 단언이 없고 집계 종료코드가 곧 그 기준이기 때문이다.

**두 독법 중 어느 쪽인지 문서가 한 줄로 정하지 않았다는 것이 이 항목의 전부다.** 원리적 관측 불가를 확인한 것이 아니므로 차단으로 올리지 않았다.

**Required fix(선택)**: `acceptance.md:243` 규칙 문단에 판정 단위를 한 문장으로 못 박는다 — 예: 「붉음/초록은 판정 명령의 종료 코드가 아니라 **그 기준이 적은 단언의 결과**로 읽는다. 한 파일에 여러 기준의 단언이 함께 있을 때, 한 기준이 붉어져도 같은 파일의 다른 기준은 자기 단언이 통과하면 초록이다.」 고치면 `progress.md:35` 의 사본도 함께 본다.

### D15 — `spec.md:20-27`(HISTORY) — 3회차 수리가 HISTORY 에 기록되지 않았다 — Severity: minor — Class: **optional**

D11·D12·D13 수리는 `acceptance.md`·`plan.md`·`spec-compact.md`·`research.md` 넷을 실제로 바꿨다(mtime 14:35). 그러나 `spec.md` 의 HISTORY 표는 여전히 **두 행(0.1.0 · 0.2.0)** 뿐이고 `version:` 도 `"0.2.0"` 그대로다(`grep -c '^| 0\.' spec.md` → 2). 수리 기록은 `progress.md:21-22` 에만 남아 있다.

수리가 `spec.md` 본문을 건드리지 않았다는 점에서 `version` 유지에는 일리가 있고, 감사 궤적 자체는 `progress.md` 와 이 보고서 3부에 보존돼 있다. Group 2 SC-1 은 「HISTORY 절 존재」만 요구하므로 관문 위반도 아니다. 다만 2회차 수리는 같은 성격이었는데도 0.2.0 행을 받았으므로 **기록 관행이 회차 간에 일관되지 않다.**

**Required fix(선택)**: HISTORY 에 `0.2.1` 한 행을 더해 D11·D12·D13 을 무엇으로 닫았는지 적고 `version:` 을 맞춘다. 또는 「본문 미변경 회차는 HISTORY 에 남기지 않고 `progress.md` 가 정본」이라는 규칙을 한 줄로 명시해 관행을 고정한다. 어느 쪽이든 다음 회차가 다시 세지 않게 된다.

---

## Regression Check (1·2회차 결함 전체)

| 결함 | 상태 | 근거 |
|---|---|---|
| D1 AC-004 도달 불가 | **RESOLVED** | acceptance.md:51-61 두 갈래 현존 |
| D2 AC-001·002 하네스 부재 | **RESOLVED** | acceptance.md:26·40 판정 명령 행 |
| D3 마일스톤 AC 미배정 | **RESOLVED** | 독립 계산 합집합 25/25 (재측정) |
| D4 머리말 계수 오류 | **RESOLVED** | acceptance.md:5 (재측정) |
| D5 §3/§6 우선순위 부재 | **RESOLVED** | spec.md:57 + :81 |
| D6 REQ-003 서법 혼재 | **RESOLVED** | spec.md:156 |
| D7 「취지」 판정 셋 | **RESOLVED** | acceptance.md:97, spec.md:193 |
| D8 AC-025 넷째 비이분 | **RESOLVED** | acceptance.md:225 (재측정) |
| D9 AC→REQ 인용 0개 | **RESOLVED** | 25/25 (재측정) |
| D10 REQ-021 구현 세부 | **RESOLVED** | acceptance.md:182 |
| **D11** 끝 조건 거짓 양성 | **RESOLVED** | 좁힌 패턴 실행 → **적중 1건**(=지울 문장), 옛 패턴 2건. 네 자리 바이트 동일 |
| **D12** 변이 집합 관측 불가 | **RESOLVED** | AC-025 제외 규칙 신설 + **네 행 22/23/23/23 이 24 기준선에서 재도출됨**. progress.md 사본 동기 |
| **D13** ㉠ 한정 상실 | **RESOLVED** | acceptance.md:248 괄호 한정 + :252 근거 |

**미해소 0건. 세 회차 모두에 같은 모습으로 나타난 결함 없음 → 정체(stagnation) 신호 없음.**
**점수 회귀 없음: 0.710 → 0.889 → 0.940 → LEAN STOP 미발동.**

---

## Recommendation

**PASS.** 판정 근거는 다음 넷이다.

1. **필수 관문 일곱 전부 통과** — MP-1·2·3·5·6·7 이 PASS, MP-4 는 단일 언어 SPEC 으로 N/A(선례에 따라 자동 통과). 차단 등가 위반(D7·D8·clarification) **0건**.
2. **집계 0.940 이 Tier L 통과선 0.85 를 넘는다** — 조화평균 0.9399, 산술평균 0.940 으로 두 방식이 같은 결론.
3. **차단(blocking) 결함 0건** — 1·2회차의 13건이 전부 닫혔고, 새로 찾은 둘은 모두 선택 등급이다.
4. **점수 회귀 없음** — 세 회차 단조 상승(0.710 → 0.889 → 0.940).

3회차는 상한 회차이지만 **PASS-with-debt 로 닫는 것이 아니라 깨끗한 통과다.** 열려 있는 차단 항목이 없으므로 사용자 개입(scope-reduction / 상한 연장)을 권고하지 않는다. Implementation Kickoff Approval 게이트는 이 판정과 별개로 그대로 필요하다 — 감사 PASS 는 승인이 아니다.

### run 단계로 넘기기 전 남는 것 (전부 선택)

- **D14** — `acceptance.md:243` 에 「붉음은 종료 코드가 아니라 기준의 단언 결과로 읽는다」 한 문장 추가. 고치면 `progress.md:35` 사본도 함께.
- **D15** — HISTORY 에 3회차 행을 더하거나, 「본문 미변경 회차는 `progress.md` 가 정본」이라는 관행을 한 줄로 고정.

### 과잉 설계 제동

위 둘 말고 **새 요구사항이나 새 기준을 만들지 말 것**(`moai-constitution.md` § Agent Core Behaviors #4). REQ 25 / AC 25 가 Tier L 상한에 정확히 닿아 있어 **새 번호를 하나라도 만들면 상한 위반**이고, 그때는 tier up 이 아니라 SPEC 분할 신호다. D14·D15 는 둘 다 기존 문장에 한 줄을 더하는 것으로 닫히며, 닫지 않고 넘겨도 구현자가 막히지 않는다.

---

## 감사 방법 주기

이 보고서의 모든 수치는 워크트리 `.claude/worktrees/v2-model` 에서 실행한 명령의 출력이다. 인용한 명령은 전부 그 형태 그대로 돌렸고, 계수는 축약 옵션 없이 냈다 — `sort -u` 를 쓴 자리는 「서로 다른 번호의 개수」를 재려는 의도가 명시된 곳뿐이고, 등장 횟수는 `grep -c` 또는 `wc -l` 로 냈다.

Retry Loop Contract 의 delta 규정에 따라 **D11·D12·D13 은 현재 파일에 전수 재측정**했고, D1~D10 은 해당 자리가 실제로 바뀌지 않았음을 확인한 뒤 회귀 여부만 봤다(`spec.md` mtime 14:23 이 2회차 보고서 14:32 보다 앞선다). 필수 관문 일곱과 계약 md5·개수 상한은 delta 와 무관하게 전부 다시 실행했다.

한 가지 자기 정정을 적어 둔다. MP-2 를 어간(`해야|하여야|않아야|어야 `)으로 훑었더니 25줄 중 8줄이 걸리지 않아 처음엔 결함으로 읽힐 뻔했다. 여덟 줄을 열어 보니 전부 shall 형이었고(「지워야 한다」·「닫아야 한다」 등), 걸리지 않은 이유는 **내 어간 집합이 좁았기 때문**이지 문안 결함이 아니었다. 어간 훑기의 미적중은 결함의 증거가 아니라 개별 판독의 신호로 다뤘다.
