# SPEC 감사 보고서: SPEC-BOTMODEL-001

Iteration: 2/3
Verdict: PASS
Overall Score: 0.889 (Tier L 통과선 0.85)

작성자 추론 맥락은 M1 Context Isolation 에 따라 무시했다 (Reasoning context ignored per M1 Context Isolation). 판정은 `.moai/specs/SPEC-BOTMODEL-001/` 의 산출물, 출처 보고서 원문, 저장소의 실제 소스·테스트 파일에서만 세웠다. 개정을 「고쳤다는 주장」으로 받지 않고 D1~D10 열 건을 각각 현재 파일에 명령으로 다시 댔다.

---

## 쉬운 말 요약

1회차에서 막았던 열 가지를 전부 다시 재 봤더니 **열 건 모두 실제로 닫혀 있었다.** 특히 걱정했던 두 가지 — 도달 불가능했던 수용 기준(AC-004)과 실행할 하네스가 없던 간판 기준(AC-001·002) — 은 고친 문안이 저장소에 실재하는 하네스(`wsConnect`, `stub.sent`, `obs.callTool`, `notified[0].params.meta.chat_id`)를 정확히 가리키고 있음을 소스에서 확인했다. 기준 개수도 25/25 그대로고, 「글자 그대로」 옮겼다는 계약 16줄은 여전히 md5 가 같다.

그런데 **수리 회차가 새로 만든 결함 두 개**를 찾았다. 첫째, 지시문 문장을 지웠는지 재는 셸 검사(`grep "since_id 로"`)가 **옳게 구현해도 빨개진다** — 그 검사에 걸리는 자리가 지금 트리에 둘인데 SPEC 은 하나만 지우라고 하고, 나머지 하나는 출처 보고서가 「이미 맞게 고쳐진 문장」이라고 적어 둔 자리다. 둘째, 이번에 「하나만 붉어진다」에서 「집합이 정확히 같다」로 **강화한** 변이 판정 규칙이, 전체 스위트를 재는 AC-025 를 계산에 넣지 않아 어떤 변이를 넣어도 그 표대로 관측될 수 없게 됐다.

점수는 0.71 → 0.889 로 올라 통과선 0.85 를 넘었고 필수 관문 일곱도 전부 통과라 판정은 PASS 다. 다만 위 두 건은 차단(blocking)이므로 **run 단계에 들어가기 전에 닫아야 한다** — 둘 다 문장 한두 줄 수정이다.

---

## Must-Pass Results

| 관문 | 판정 | 근거 (이번 회차 실행) |
|---|---|---|
| MP-1 REQ 번호 일관성 | **PASS** | `grep -oE 'REQ-BOTMODEL-[0-9]{3}' spec.md \| sort -u` → 001~025 연속, 결번·중복 0. 정의 줄 계수 `grep -cE '^- \*\*REQ-BOTMODEL-[0-9]{3}\*\*' spec.md` → **25**, `uniq -d` 적중 0. zero-padding 3자리 균일 |
| MP-2 GEARS 형식 준수 | **PASS** | **요구사항 계층(`spec.md` §6 의 REQ-BOTMODEL-001~025)에 대해 판정했다.** 25개 전부 GEARS 주절을 하나씩 가진다 — 예: spec.md:172 `…`room_id` 가 없을 때, 게이트웨이는 … 버려야 한다`(event-driven), spec.md:156 `…만들지도 실행하지도 않아야 하며, 대신 … 거절해야 한다`(unwanted+ubiquitous 한 문장). 1회차 D6(REQ-003 서법 혼재)이 shall 형 한 문장으로 합쳐진 것을 확인. **검증 계층(`acceptance.md` 의 AC-BOTMODEL-001~025)의 Given-When-Then 은 M3 §Scope 에 따라 이 관문에서 채점하지 않았고 Group 4 에서 채점했다** |
| MP-3 YAML frontmatter 유효성 | **PASS** | spec.md:1-16. canonical 12필드 전부 존재·형식 적합. `version: "0.2.0"`(따옴표 semver, 1회차 0.1.0 에서 상향) · `status: draft` · `created`/`updated: 2026-09-07`(ISO) · `priority: P0` · `lifecycle: spec-anchored` · `tags` 쉼표 구분. 거부 별칭(`created_at`·`updated_at`·`labels`·`spec_id`) 0건. 선택 필드 `tier: L` · `depends_on`(13개) 적법 |
| MP-4 §22 언어 중립성 | **N/A** | TypeScript/Node 단일 언어 저장소(`server/` · `channel/` · `web/`) 한정. 다국어 툴링 표면 없음 → 자동 통과 |
| MP-5 D7 cross-SPEC 조정 | **PASS** | `grep -oE 'SPEC-[A-Z][A-Z0-9]+-[0-9]+' spec.md \| sort -u` → **14건**. 각각 `.moai/specs/<ID>/spec.md` 존재 확인(부재 0) + `status:` 판독 → 자기 자신만 `draft`, 나머지 13개 전부 `completed`. `retired`/`superseded`/`archived` **0건**. BLOCKING 없음 |
| MP-6 D8 크로스플랫폼 규율 | **PASS** | `grep -rc syscall` 을 spec/plan/acceptance/design/research 다섯에 실행 → **전부 0**. D8-4 자동 통과 |
| MP-7 clarification 게이트 | **PASS** | `grep -rn "NEEDS CLARIFICATION" plan.md research.md` → **출력 없음**. 미해결 마커 0건 |

**필수 관문 일곱 전부 통과.**

---

## Category Scores (0.0-1.0, 루브릭 앵커)

| 차원 | 점수 | 밴드 | 근거 |
|---|---|---|---|
| Clarity | 0.90 | 1.0 밴드 근접 | 1회차 D5·D6·D7 이 전부 닫혔다. §3 머리(spec.md:57)에 **[HARD] 우선순위** 문단이 서고 §3.3 뒤(spec.md:81)에 각주가 붙어 「해석 금지」와 REQ-014 의 좁힘이 충돌하지 않는다. 「취지/뜻」 셋이 전부 판정 문자열로 교체됐다(spec.md:156·193, acceptance.md:95·113). 감점: D13(변이 ㉠ 의 서술이 AC-003 의 괄호 한정 없이 DoD 표에 옮겨져 두 뜻으로 읽힌다) |
| Completeness | 0.95 | 1.0 밴드 | HISTORY · §1 배경(WHY) · §2·§3(WHAT) · §6 REQUIREMENTS · acceptance.md · §5 Out of Scope 전부 존재. Out of Scope 는 `### Out of Scope — <주제>` H3 **셋**(spec.md:127·134·142)에 각각 `-` 항목이 붙어 `OutOfScopeRule` 만족. frontmatter 12/12. plan.md §B.7 이 신설돼 마일스톤 판정 합집합을 표로 못 박았다 |
| Testability | 0.78 | 0.75 밴드 상단 | 25 기준 중 23개가 명령 또는 인프로세스 단언으로 정확히 이분 판정한다. 약속 어휘(`적절`·`합리적`·`적당`) 훑기 **0건**. AC-001·002 가 판정 파일·하네스·단언을 표로 명시하고 AC-025 넷째가 「종료 코드 ≠ 0」 이분으로 바뀌었다. 감점: **D11**(AC-008 셸 팔이 옳은 구현에서도 붉어진다 — 거짓 양성), **D12**(DoD 변이 집합 일치 판정이 AC-025 를 셈에 넣지 않아 어떤 변이로도 관측 불가) |
| Traceability | 0.95 | 1.0 밴드 | 양방향 기계 검증. REQ→AC: 25개 REQ 각각 `grep -c` 로 acceptance.md 적중 확인, **미대응 0건**. AC→REQ: `grep -E '^### AC-BOTMODEL-' \| grep -vc 'REQ-BOTMODEL-'` → **0** — 25 제목 전부가 대응 REQ 를 인용한다(1회차 D9 는 0개였다). plan.md 마일스톤 합집합 25/25 |

**집계(비가중 조화평균, `agent-common-protocol.md` § Skeptical Evaluation Stance)**: 4 ÷ (1/0.90 + 1/0.95 + 1/0.78 + 1/0.95) = **0.8892**. 산술평균 0.895 도 같은 결론. Tier L 통과선 **0.85** 초과.

**점수 회귀 없음**: 0.710(1회차) → 0.889(2회차). LEAN STOP 조건(iter(N+1) < iter(N)) 미해당.

---

## D1–D10 해소 대조표 (1회차 결함, 현재 파일 재측정)

| # | 1회차 결함 | 판정 | 이번 회차 증거 |
|---|---|---|---|
| **D1** | AC-004 의 전제가 AC-024 에 의해 도달 불가 | **RESOLVED** | acceptance.md:51 에 「왜 사람 라우트로 타깃 행을 만들지 않는가」 인용 블록이 신설돼 AC-024 와의 관계를 명시. 배치가 **참여했다가 `DELETE` 로 빠지는** 두 갈래(㉮ 재전송 · ㉯ 실시간 `deliver`)로 교체됐다. 타깃 행이 정당하게 생기므로 두 변이(`JOIN room_bots` 제거 · `deliver` 참여 검사 제거)가 실제로 발동한다. **원리적 미발동 해소 확인** |
| **D2** | AC-001·002 를 실행할 하네스 부재 | **RESOLVED** | AC-001 이 3행 판정표(①서버 `gateway.test.ts` ②채널 `channel-server.test.ts` ③이음매 `index-wiring.test.ts`), AC-002 가 2행 판정표를 갖췄고 각 행이 판정 명령까지 적는다. **명명된 하네스가 실재함을 소스에서 확인**: `wsConnect` (`server/test/permissions.test.ts:78` · `web-permission-contract.test.ts:81`), `pushChatMessage` (`channel/src/channel-server.ts:174`), `stub.sent`·`obs.callTool`·`notified[0].params.meta.chat_id` (`channel/test/index-wiring.test.ts:178·189·259·261`). acceptance.md:7·15 에 `scripts/e2e.mts` 를 판정에서 배제하는 선언 추가. **기준 수 증가 없음(25 유지)** |
| **D3** | plan.md 마일스톤이 AC 넷을 미배정 | **RESOLVED** | 표를 믿지 않고 독립 계산: `grep '^판정: ' plan.md \| grep -oE '[0-9]{3}' \| sort -n \| uniq -c` → **001~025 전부 적중, 서로 다른 25개**, 중복은 `016` 하나(M2·M3). 신설된 §B.7 표(plan.md:89-100)의 마일스톤별 개수(2·3·6·8·4·3)가 내 독립 계산과 일치 |
| **D4** | acceptance.md:5 의 자기 계수 오류 | **RESOLVED** | 현재 문안: 「셸 grep 으로만 서는 기준은 **AC-007·AC-008 둘**」 + 짝을 AC 번호에 귀속 + 「**AC-009 는 이 규칙의 대상이 아니다**」 근거 명시(`PRAGMA table_info` 는 처음부터 인프로세스) |
| **D5** | §3 「해석 금지」 대 REQ-014 충돌 | **RESOLVED** | spec.md:57 에 `[HARD] 우선순위 — §3 과 §6 이 어긋나면 §6 이 이긴다` 문단 + spec.md:81 각주. **좁힘이 한 곳뿐임을 명시**하고 나머지 네 덩어리에 좁힘이 없다고 전칭을 닫았다 |
| **D6** | REQ-003 이 한 요구 안에 두 서법 혼재 | **RESOLVED** | spec.md:156 이 「…만들지도 실행하지도 않아야 하며, **대신 v2 표 존재 검사 한 줄로 옛 DB 파일을 거절해야 한다**」 한 문장 두 절 shall 형. 예외 메시지 부분문자열까지 못 박았다 |
| **D7** | 「취지를 담는다」류 해석 판정 셋 | **RESOLVED** | 셋 다 문자열 일치로 교체. AC-010(acceptance.md:113) → `expect(err.message).toContain('개발용 DB 파일을 지우고 새로 만드세요')`. AC-008 짝(acceptance.md:94-95) → 양성/음성 두 `includes()`. REQ-025(spec.md:193) → 지울 문자열·넣을 문자열을 글자 그대로. **음성 단언의 사실성 확인**: 그 문자열이 `channel/src/channel-server.ts:30` 에 실재하고 `channel/test/channel-server.test.ts:240·340` 이 현재 단언한다 |
| **D8** | AC-025 넷째 명령에 이분 판정 없음 | **RESOLVED** | acceptance.md:223 「네 명령 모두 **이분 판정**이 선다 — … ④는 종료 코드가 **0 이 아니다**」. 초록이면 「알아야 할 사실」로 보고 경로까지 지정. plan.md:148 도 같은 문안으로 동기화됨 |
| **D9** | 25 AC 중 REQ 인용 0개 (optional) | **RESOLVED** | `grep -E '^### AC-BOTMODEL-' acceptance.md \| grep -vc 'REQ-BOTMODEL-'` → **0**. 25 제목 전부 인용 |
| **D10** | REQ-021 이 구현 세부를 못 박음 (optional) | **RESOLVED** | acceptance.md:179 에 **기제 교체 시 단서** 추가 — 다른 기제를 고르면 두 변이도 함께 다시 쓴다고 명시. 요구사항 본문은 행동 보존 리팩토링 특성상 그대로 두는 것이 옳다 |

**열 건 전부 해소.** 미해소 0건 → 정체(stagnation) 신호 없음.

---

## 지시받은 확인 두 가지

### ① §3 계약 문안이 출처와 여전히 글자 그대로 같은가 — **참**

D5 수리가 §3 에 문단 하나와 각주 하나를 **더했으므로** 원 문안이 훼손됐을 위험이 있었다. 다시 쟀다.

```bash
sed -n '80,106p' .moai/reports/v2-refactoring-guide.md | grep -v '^\*\*' | grep -v '^```' | grep -v '^$' > /tmp/aud2/guide.txt
sed -n '59,93p'  .moai/specs/SPEC-BOTMODEL-001/spec.md   | grep -v '^###' | grep -v '^```' | grep -v '^>' | grep -v '^$' > /tmp/aud2/spec.txt
wc -l /tmp/aud2/guide.txt /tmp/aud2/spec.txt   # → 16  16
diff /tmp/aud2/guide.txt /tmp/aud2/spec.txt     # → 출력 없음 (exit 0)
md5 -q /tmp/aud2/guide.txt /tmp/aud2/spec.txt
# → a8d475781ed067de9b921d675b06aeab
#    a8d475781ed067de9b921d675b06aeab
```

**계약 16줄 md5 동일.** DDL 두 줄, HTTP 세 줄, 프레임 두 줄, MCP 세 줄, 게이트웨이 규칙 세 줄, `role` 괄호 주석, 재전송 SQL 포함. 새로 붙은 우선순위 문단(§3 머리)과 각주(§3.3 뒤)는 **계약 줄 바깥**에 있어 「글자 그대로」 주장을 깨지 않는다 — 각주 자신이 「원 문안은 그대로 두고 붙인다」고 적은 대로다.

### ② REQ/AC 개수가 25 이하인가 — **참, 정확히 25/25**

```bash
grep -oE 'REQ-BOTMODEL-[0-9]{3}' spec.md | sort -u | wc -l         # → 25
grep -cE '^- \*\*REQ-BOTMODEL-[0-9]{3}\*\*' spec.md                # → 25 (정의 줄)
grep -cE '^### AC-BOTMODEL-' acceptance.md                          # → 25
grep -oE 'AC-BOTMODEL-[0-9]+' acceptance.md | sort -u | wc -l       # → 25
```

Tier L 상한 25/25 에 정확히 닿아 있고 초과 없음. **1회차 이후 새 번호가 하나도 만들어지지 않았다** — D1·D2 수리가 기존 기준 본문 안에서 이뤄졌음을 개수로 확인.

---

## 그 밖에 다시 잰 것 (개정이 낡히지 않았는지)

- **17 불변식 표**: `sed -n '197,218p' spec.md | grep -c '^| [0-9]'` → **17**. 개수 유지.
- **표가 지목한 파일 16개**: `server/test/{messages,web-permission-contract,permissions,restart-persistence,health,web-chat,web-rich,db}.test.ts` · `channel/test/{channel-server,truncate,index-wiring,permission-relay,gateway-client}.test.ts` · `server/test/gateway-v2.ts` · `channel/test/gateway-mutual-auth.test.ts` · `.moai/state/verify/t25-plan/sibling-sweep.mjs` → **부재 0건**.
- **DoD 변이표의 재도출**: D1 이 AC-004 를 두 갈래로 바꿨으므로 변이표가 낡을 위험이 있었다. 실제로는 **함께 다시 도출됐다** — ㉠ 행이 「AC-003 **그리고** AC-004 갈래 ㉮」로, ㉡ 행이 「AC-004 갈래 ㉯ **만**」으로 갈라져 있다(acceptance.md:241-242). 「한 줄만 고치고 형제 행을 낡게 두는」 부류는 여기서 재현되지 않았다. (다만 아래 D12 를 볼 것 — 표의 *다른* 열이 새 규칙 아래 거짓이 됐다.)

---

## Defects Found (구조화 결함 목록)

1회차 D1~D10 은 전부 해소됐다. 아래 셋은 **이번 회차에 새로 발견**한 것이다.

### D11 — `acceptance.md:90` · `acceptance.md:228` · `plan.md:144` · `spec-compact.md:92` — 「`since_id 로` 0건」 셸 기준이 옳은 구현에서도 붉어진다 — Severity: major — Class: **blocking**

AC-BOTMODEL-008 의 When/Then:

> **When** `grep -rn "since_id 로" channel/src` 를 실행한다 · **Then** 출력이 0건이다.

현재 트리에서 그 명령을 그대로 돌렸다:

```bash
$ grep -rn "since_id 로" channel/src | wc -l
2
$ grep -rn "since_id 로" channel/src
channel/src/channel-server.ts:30:  '커서로는 chat_id 를 쓰세요. 마지막으로 본 chat_id 를 기억해 두고 다음에 since_id 로 넘기면 그 다음부터만 옵니다.'
channel/src/channel-server.ts:145:        description: '… 결과는 JSON 한 건이고, 다음 요청의 since_id 로는 결과 JSON 의 cursor 필드 값을 그대로 넘긴다.'
```

**적중이 둘인데 REQ-BOTMODEL-025 는 하나만 지우라고 한다.** spec.md:193 이 명령하는 것은 `INSTRUCTIONS` 안의 `:30` 문자열 교체뿐이다. `:145` 는 `fetch_history` **도구 설명**이고 `INSTRUCTIONS` 가 아니다. spec.md·acceptance.md·plan.md 어디에도 `:145` 를 고치라는 요구가 없음을 확인했다(`grep -rn "145\|도구 설명\|fetch_history"` → 해당 지시 0건).

더 결정적인 것은 출처 보고서가 `:145` 를 **이미 옳은 문장**이라고 적어 둔 점이다:

> 이 문장은 지금도 `:145` 의 «cursor 필드를 넘긴다» 와 모순인 채 남아 있는데(카드 t10 이 도구 설명만 고쳤다) … 이 문장은 v2 첫 커밋에서 지워야 한다. — `.moai/reports/v2-review.md:288`

즉 출처는 「`:30` 을 지워 `:145` 에 맞춰라」고 말하는데, SPEC 이 옮겨 온 끝 조건은 「`:145` 까지 사라져야 통과」로 읽힌다. 결과: REQ-025 를 정확히 이행한 트리에서 AC-008 의 셸 팔이 **거짓 양성으로 붉어진다.** 구현자는 (a) 요구되지 않은 문장을 손대거나 (b) 옳은 문장을 지워 도구 설명을 망가뜨리거나 (c) 회차를 하나 태워 이 모순을 보고하게 된다.

`research.md` 를 훑었으나 `:145` 를 관측한 기록이 없다 — SPEC 이 가이드의 끝 조건을 **현재 트리에 대고 다시 재지 않은 채** 옮겨 왔다. 같은 조건이 네 자리에 실려 있으므로(위 파일:줄) **한 자리만 고치면 나머지 셋이 낡는다.**

**Required fix**: 네 자리의 grep 패턴을 실제로 지울 문장에만 걸리게 좁힌다 — 예 `grep -rn "since_id 로 넘기면" channel/src` (`:145` 는 「since_id 로**는**」이라 걸리지 않는다), 또는 `grep -rn "마지막으로 본 chat_id" channel/src`. 어느 쪽이든 **고친 뒤 현재 트리에서 실행해 1건(=:30)만 적중하는지 확인하고 그 출력을 근거로 남긴다.** 함께 고칠 자리: `acceptance.md:90`(AC-008 When) · `acceptance.md:228`(AC-025 ③) · `plan.md:144`(§D) · `spec-compact.md:92`.

---

### D12 — `acceptance.md:239-243` — 변이 판정을 「집합 일치」로 강화하면서 AC-025 를 셈에 넣지 않았다 — Severity: major — Class: **blocking**

DoD 둘째 항목이 이번 회차에 강화됐다:

> 변이 시험 넷을 각각 넣고, **아래 표가 적은 붉음 집합과 정확히 같은지** 관측했다. 「하나만 붉어진다」가 아니라 **집합 일치**로 판정한다.

| 변이 | 붉어져야 하는 것 | 초록으로 남아야 하는 것 |
|---|---|---|
| ㉠ | AC-003 **그리고** AC-004 갈래 ㉮ | **나머지 23 기준** |
| ㉡ | AC-004 갈래 ㉯ **만** | **AC-003 포함 나머지** |
| ㉢ | AC-019 **만** | **나머지** |
| ㉣ | AC-019 **만** | **나머지** |

「나머지」에는 **AC-BOTMODEL-025** 가 들어간다. 그런데 AC-025 의 첫째 명령은 `npm test`(종료 코드 0)이고, 이는 루트 `npm test --workspaces` 로 `server`·`channel` 두 워크스페이스의 스위트를 **전부** 돈다. AC-003·004·019 의 판정 파일(`server/test/gateway.test.ts`)은 그 안에 있다.

따라서 네 변이 **어느 것을 넣어도** 대상 기준이 붉어지는 순간 AC-025 도 함께 붉어진다. 표가 「초록으로 남아야 한다」고 적은 집합이 원리적으로 성립하지 않으므로, **이 DoD 체크박스는 어떤 관측으로도 참이 될 수 없다.** 강화 이전의 「하나만 붉어진다」 문안에서는 이 문제가 드러나지 않았다 — 규칙을 강하게 바꾸면서 표의 모든 행을 새 규칙 아래 다시 도출하지 않은 결과다.

실무적 파급: run 단계는 (a) 체크박스를 못 채워 막히거나, (b) 조용히 「하나만 붉어진다」로 되돌려 방금 강화한 것을 무효화한다. 후자가 더 위험하다 — 강화의 근거였던 「변이 ㉠ 은 둘을 붉게 만드는 것이 옳다」는 판별이 함께 사라진다.

**Required fix**: 표 머리 또는 「초록으로 남아야 하는 것」 열에 **집계 기준 제외**를 한 줄로 명시한다 — 예: 「AC-BOTMODEL-025 는 전체 스위트를 재는 **집계 기준**이므로 이 집합 판정에서 제외한다. 변이를 넣은 상태에서 AC-025 가 붉어지는 것은 정상이며, 판정 대상은 개별 기준 24개다.」 그리고 ㉠ 행의 「나머지 23 기준」을 「나머지 22 기준(AC-025 제외)」으로 다시 센다 — **개수를 손으로 적었으므로 제외를 도입하면 그 값도 함께 바뀐다.**

---

### D13 — `acceptance.md:241` — 변이 ㉠ 의 서술이 AC-003 의 한정을 잃었다 — Severity: minor — Class: optional

DoD 표 ㉠ 행은 변이를 「재전송 쿼리의 `JOIN room_bots` 절 제거」라고만 적는다. 그러나 같은 문서 AC-003(acceptance.md:47)은 같은 변이를 **괄호 한정과 함께** 적는다: 「`JOIN room_bots` 절을 지우면(**전역 커서 하나로 되돌리면**)」.

한정이 없으면 두 뜻으로 읽힌다. `JOIN` 절만 문자 그대로 지우면 `WHERE m.id > rb.last_delivered_id` 의 `rb` 별칭이 미정의가 되어 **SQL 자체가 깨진다** — 그러면 훨씬 많은 기준이 붉어져 ㉠ 행의 집합 판정이 다른 이유로 어긋난다. 의도된 것은 AC-003 이 적은 「전역 커서로 되돌리기」다.

**Required fix(선택)**: ㉠ 행 대상 칸에 AC-003 과 같은 괄호 한정을 붙인다 — 「재전송 쿼리의 `JOIN room_bots` 절 제거(전역 커서 하나로 되돌리기)」. AC-004 의 변이 확인 줄(acceptance.md:61)도 같은 한정을 갖고 있지 않으므로 함께 보면 좋다.

---

## Regression Check (1회차 결함)

| 결함 | 상태 | 증거 |
|---|---|---|
| D1 AC-004 도달 불가 | **RESOLVED** | acceptance.md:51-61 배치 교체, 두 갈래 신설 |
| D2 AC-001·002 하네스 부재 | **RESOLVED** | acceptance.md:17-40 판정표 + 하네스 실재 소스 확인 |
| D3 마일스톤 AC 미배정 | **RESOLVED** | 독립 계산으로 합집합 25/25 |
| D4 머리말 계수 오류 | **RESOLVED** | acceptance.md:5 |
| D5 §3/§6 우선순위 부재 | **RESOLVED** | spec.md:57 + :81 |
| D6 REQ-003 서법 혼재 | **RESOLVED** | spec.md:156 |
| D7 「취지」 판정 셋 | **RESOLVED** | acceptance.md:95·113, spec.md:193 |
| D8 AC-025 넷째 비이분 | **RESOLVED** | acceptance.md:223 |
| D9 AC→REQ 인용 0개 | **RESOLVED** | 25/25 인용 |
| D10 REQ-021 구현 세부 | **RESOLVED** | acceptance.md:179 단서 |

**미해소 0건. 세 회차 반복 결함 없음 → 정체(stagnation) 신호 없음. 점수 회귀 없음(0.710 → 0.889) → LEAN STOP 미발동.**

---

## Recommendation

**PASS.** 필수 관문 일곱 전부 통과, 조화평균 0.889 로 Tier L 통과선 0.85 초과, 1회차 결함 열 건 전부 해소, 점수 회귀 없음.

다만 이 PASS 는 **깨끗한 통과가 아니다.** 새로 찾은 D11·D12 는 M6 분류상 **blocking**(SPEC 이 실제로 선언한 기준의 내부 정합성을 해친다)이므로, run 단계 진입 전에 닫아야 한다. 판정은 M5 필수 통과 방화벽과 루브릭 점수에 못박혀 있으므로(M6) 두 건이 판정을 FAIL 로 뒤집지는 않지만, 고치지 않고 run 에 넘기면 구현자가 즉시 부딪힌다 — 둘 다 문장 한두 줄이다.

수리 순서:

1. **D11** — `acceptance.md:90` · `acceptance.md:228` · `plan.md:144` · `spec-compact.md:92` **네 자리 모두**의 grep 패턴을 `:30` 문장에만 걸리게 좁히고, **고친 패턴을 현재 트리에서 실행해 적중이 1건인지 확인한 출력을 근거로 남긴다.** 한 자리만 고치면 나머지 셋이 낡는다.
2. **D12** — `acceptance.md:239` 표 머리에 「AC-BOTMODEL-025 는 집계 기준이므로 집합 판정에서 제외」 한 줄을 넣고, ㉠ 행의 「나머지 23 기준」을 제외 반영해 다시 센다.
3. **D13(선택)** — ㉠ 행에 「전역 커서 하나로 되돌리기」 괄호 한정 추가. 리드 재량이며, 고치지 않아도 AC-003 이 같은 문서에서 뜻을 정한다.

**과잉 설계 제동**: 위 셋 말고 새 요구사항이나 새 기준을 만들지 말 것(`moai-constitution.md` § Agent Core Behaviors #4). 기준 수가 이미 Tier L 상한 25/25 에 정확히 닿아 있어 **새 번호를 하나라도 만들면 상한 위반**이고, 그때는 tier up 이 아니라 SPEC 분할 신호다. D11·D12 는 전부 기존 문장 수정으로 닫힌다.

3회차를 돌린다면 범위는 D11·D12·D13 세 건의 delta 로 한정하고, 이번 회차에 기계 검증한 것(계약 16줄 md5·마일스톤 합집합 25·양방향 추적성·필수 관문 일곱)은 해당 자리가 실제로 바뀐 경우에만 다시 잰다.

---

**감사 방법 주기**: 이 보고서의 모든 수치는 워크트리 `.claude/worktrees/v2-model` 에서 실행한 명령의 출력이다. 인용한 명령은 전부 그 형태 그대로 돌렸고, 계수는 축약 옵션(`sort -u`·`head`) 없이 냈다 — `sort -u` 를 쓴 자리는 「서로 다른 번호의 개수」를 재려는 의도가 명시된 곳뿐이며, 등장 횟수를 잴 때는 `grep -c` 를 썼다. D1~D10 은 1회차 보고서의 서술을 받지 않고 각각 현재 파일에 대고 다시 쟀다.
