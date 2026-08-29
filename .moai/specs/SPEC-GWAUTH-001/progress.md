# SPEC-GWAUTH-001 진행 기록

| 항목 | 값 |
|---|---|
| 카드 | `t15` |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 현재 상태 | `in-progress` v0.4.0 — **run 단계 완료**(M2~M6 착지, 감사 준비 — §E.2·§E.3). plan 감사 궤적: 1회차 FAIL 0.67 → 2회차 PASS 0.89 → 3회차 PASS 0.84 |
| 감사 궤적 | 1회차 **FAIL 0.67** → v0.2.0 → 2회차 **PASS 0.89** → v0.3.0 → 3회차 `plan-audit-3.md` **PASS 0.84**(계약 개정 8자리가 범위에 들어오며 신규 7건 중 5건이 새 범위에서만 발생) → v0.4.0. 감사 §7-1 권고에 따라 **4회차 전체 재감사 없이** 한정 교정 후 run 진입 |
| 인계 출처 | `SPEC-CHANAUTH-001` v0.4.0 §5 «카드 `t15` 소유» |
| base 실측 | `npm test` → 250/250 초록 (server 180 · channel 70), 2026-08-29 이 워크트리에서 실행 |
| spec_base_sha | `b11bdc5a1ddcdfda5fda55812c6f7d041b0370d7` (=`b11bdc5`, `WT-rogue-frame-defense` — run 착수 시점 실측, `plan.md` §C 사전 점검. D5 개정 커밋 포함. AC-GWAUTH-014 의 범위 경계 기준) |

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-29
tier: M
requirements: 13      # REQ-GWAUTH-001..013 (v0.2.0 에서 개수·내용 무변경)
acceptance: 15        # AC-GWAUTH-001..015 (v0.2.0 에서 015 신설 — 1회차 감사 C-04)
open_questions: 0
blocking_before_run: 0   # B-1·B-2 는 D3=(a) 로 plan 단계에서 해소. 남은 §B 항목은 기록/sync 인계뿐
sibling_contracts_amended:
  - "SPEC-CHANCLIENT-001 v0.5.0 → v0.6.0 — 7자리 (REQ-001 :117 · REQ-003 :127 · 필드열거 :129 · 타입선언 :92 · 흐름도 :42 · 용어표 :62 · §4.2 머리주석 · §5 :230)"
  - "SPEC-GATEWAY-001 v0.3.0 → v0.4.0 — 1자리 (REQ-GW-001 welcome 필드 열거)"
  - "SPEC-CHANINJECT-001 v0.3.2 → v0.3.3 — HISTORY 자기정정 (2회차 N-01) + 계수 사본 제거 (3회차 R-04)"
  - "SPEC-CHANCLIENT-001 v0.6.0 → v0.6.1 — onWelcome 선언에 type·missed_after_id 추가, proof? 근거 정정 (3회차 R-07)"
  - "SPEC-CHANPERM-001 v0.5.0 → v0.6.0 — 하네스 명세 주석 (3회차 R-06, M4 코드와 짝)"
  - "SPEC-CHANWIRE-001 v0.4.0 → v0.5.0 — 하네스 명세 주석 + AC-014 Then 2번 주 (3회차 R-06)"
  - "SPEC-CHANNEL-001 v0.3.0 → v0.4.0 — §5 hello 필드 열거 (3회차 R-06)"
  amended_sibling_specs: 6
  r06_site_count: "4는 하한이지 개수가 아니다 — 감사도 통독 없이 welcome/hello grep 만 했다"
  measured_total: 8   # 리드 초기 보고 4 · 레인 실측 7+ · 실제 개정 8 (:230 이 여덟 번째, 운영자 판정으로 C→B)
audit_round_3:
  report: ".moai/reports/t15/plan-audit-3.md"
  verdict: "PASS 0.84 (Tier M 임계 0.80)"
  findings: "R-01~R-06 (Medium, blocking) · R-07 (Low)"
  disposition: "R-01·R-02·R-03·R-04·R-06·R-07 처리. R-05 는 운영자 결정 D4 에 걸려 상위 회부 — 이 라운드 범위 밖"
  root_cause_fix: "plan.md §B-0 [HARD] «정정 후 전역 재도출» 상시 절차 신설 + 이 라운드 마지막에 .moai/specs + .moai/reports/t15 트리 전체에 실행"
  sweep_result: "정지 8자리 발견 — CHANCLIENT 7(내 v0.6.1 HISTORY 행이 밀었다) + CHANWIRE acceptance :507→:509(내 주석 삽입). 다섯 라운드 연속 재현이며, 그중 둘은 내 편집이 남의 카드 문서(CHANINJECT:157 · ROOMAUTHZ:295)의 인용을 깨뜨린 것으로 파일 단위 훑기로는 원리상 잡히지 않는다"
audit_round_2:
  report: ".moai/reports/t15/plan-audit-2.md"
  verdict: "PASS 0.89 (Tier M 임계 0.80)"
  findings: "N-01·N-02·N-03 (Medium, blocking) · N-04·N-05·N-06 (Low)"
  disposition: "6건 전건 처리 — 상세는 spec.md HISTORY v0.3.0"
  rebuttals_upheld: "1회차의 내 반박 셋 전부 인용됨 (§7 무근거 인용 · F-A8 계수 · 44/36 질의 차이)"
  auditor_self_correction: "1회차 §2.6 의 «44줄» 은 실행되지 않은 명령의 출력으로 인용된 값이었고 감사가 철회했다 — 1회차 보고서를 참조할 때 함께 읽어야 한다"
audit_round_1:
  report: ".moai/reports/t15/plan-audit.md"
  verdict: "FAIL 0.67 (Tier M 임계 0.80)"
  findings: "Critical 4 (C-01..C-04) · High 2 (H-01·H-02) · Medium 5 (M-01..M-05) · Low 5 (L-01..L-05)"
  disposition: "차단 11건 전건 처리 + optional 5건 전건 처리. 상세는 spec.md HISTORY v0.2.0"
  auditor_error_found: "감사 §3 C-03 이 정정 대상으로 든 «spec.md §7» 에는 경계 진술이 없다 — 실제 자리는 §1.3·§2.2·§5 와 plan.md §G 이고 그 넷을 고쳤다"
operator_decisions:
  - "D1 (2026-08-29): server/ 변경 허용 — 논스+HMAC 상호 핸드셰이크"
  - "D2 (2026-08-29): 토큰 유출·손상된 서버는 범위 밖. 과장 금지 (spec.md §5)"
sibling_amendments_made:
  - "SPEC-CHANAUTH-001 v0.5.0 — §5 인계 절이 SPEC-GWAUTH-001 과 REQ 번호를 가리키게 개정"
  - "SPEC-CHANINJECT-001 v0.3.2 — §5:466 인계 절 동일 개정"
sibling_amendments_required_but_not_made:
  - "SPEC-CHANCLIENT-001 REQ-001·003·§4.2 주석 (계약 충돌 — plan.md §B-1)"
  - "SPEC-GATEWAY-001 REQ-GW-001 welcome 필드 열거 (plan.md §B-2)"
not_amended_by_decision:
  - "SPEC-CHANAUTH-001 §2.1·§1 세 겹 표·REQ-CHANAUTH-002 — completed SPEC 의 정직성 조항, 소급 수정 금지 (spec.md §3.3 C 부류)"
  - "REQ-CHANAUTH-013 · REQ-CHANINJECT-015 — 자기 SPEC 만 구속하므로 예외 조항 불필요 (spec.md §3.4)"
```

## §E.2 Run-phase Evidence

**구현 커밋**: `82a1fea`(M2~M5 — 코드 2·테스트 5·형제 문서 4·자기 SPEC frontmatter 1 = 13파일, +562/−33). `spec_base_sha = b11bdc5`. 증거 원문 전체는 `.moai/state/verify/t15-run/` 아래에 있다(이 커밋 범위 밖의 관측 파일 — AC-GWAUTH-014 의 diff 집합과 무관).

### 1. AC-GWAUTH-001~015 판정 — **전부 PASS**

판정 명령: `npm test`(exit 0) + `--reporter=verbose` 로 it() 이름 확인(기본 리포터는 이름을 내지 않는다). 각 it() 을 무너뜨리는 변이를 넣었을 때 실제로 무너짐이 관측됐다(아래 4·5번).

| AC | it() 이름 (매트릭스 그대로) | 판정 |
|---|---|---|
| 001 | welcome carries a proof bound to the nonce, room and bot, keyed on the stored token hash | ✓ |
| 002 | a hello without a nonce is still welcomed, and that welcome carries no proof | ✓ |
| 003 | no frame ever carries the plaintext token or its stored hash | ✓ |
| 004 | hello carries a 64-hex nonce and exactly three fields | ✓ |
| 005 | the nonce is regenerated per socket and a replayed proof is refused | ✓ |
| 006 | a forged welcome with no proof opens nothing: no chat, no verdict, no history | ✓ |
| 007 | a welcome with a valid proof establishes the session and the same frames arrive once each | ✓ |
| 008 | a proof of the right length and the wrong value is refused | ✓ |
| 009 | a valid proof does not authenticate a different room_id | ✓ |
| 010 | the entry point closes a proofless socket, says one line on stderr and nothing on stdout | ✓ |
| 011 | a forged verdict neither reaches the session nor consumes the id the real verdict needs | ✓ |
| 012 | a proof of the wrong length is refused without throwing | ✓ |
| 013 | the real server and the real channel agree on the proof end to end | ✓ |
| 014 | (경계 확인 — 이 절 7번) | ✓ |
| 015 | passes a proof-bearing welcome through untouched, proof field included | ✓ |

### 2. `npm test` 원문 — base 250 대비 +14

`.moai/state/verify/t15-run/gate-npm-test.txt`(오케스트레이터 직접 실행, exit 0) 말미:

```
 Test Files  15 passed (15)          ← server
      Tests  183 passed (183)
 Test Files  6 passed (6)            ← channel
      Tests  81 passed (81)
```

base(server 180 + channel 70 = 250) 대비 **server +3(AC-001~003) · channel +11(AC-004~013·015)** = **264 전부 초록**. 품질 게이트의 «250 이상 초록» 충족. B-3 로 붉어졌던 형제 29건은 M4 하네스 착지로 전부 회복됐고, 개정된 세 건(AC-CHANCLIENT-001·002·011)은 개정 후 본문으로 초록이다.

### 3. 타입 검사 원문 — 양쪽 오류 0

`npm run typecheck -w server` → exit 0, `npm run typecheck -w channel` → exit 0 (`gate-typecheck-server.txt` · `gate-typecheck-channel.txt`). `npm run build -w channel` → exit 0.

### 4. 변이표 A~M 실행 결과 — **전부 스위트에 포착됨, 표 행별 예측은 13행 중 6행만 완전 일치**

실행자: 변이 전용 관측 레인(기준선 `82a1fea` 초록을 직접 재확인한 뒤 15개를 직렬 실행, 매번 되돌리고 `git status`·HEAD 복원을 검증). 증거: `mutation-A.txt` ~ `mutation-O.txt` + `mutation-baseline.txt`.

- **완전 일치 6행**: A(001·013) · B(001·013) · D(002) · E(003) · K(012) · L(010).
- **결합 차이 7행 — 방어 구멍은 없다.** 각 변이가 무너뜨린 기준이 표보다 **많거나**(coupling 미문서화: H+{005·010} · I+{005·012} · J+{005·015} · M+{012} · G+{AC-CHANCLIENT-011}), 표가 예측한 기준이 **생존**했다(C-009 — 양쪽을 함께 바꾸면 009 가 «전체 규칙 불일치» 라는 잘못된 이유로 통과; I-011 — 011 의 위조 welcome 은 proof 가 아예 없어 존재 검사에도 거절됨). **어느 변이도 자기 표 행의 기준을 전부 지키지 못한 경우는 C·I 두 행**이며, 둘 다 다른 기준이 그 변이를 잡는다(C → ~~001·013~~ **001** — 아래 정정, I → 008·009·012). 즉 **15개 변이 전부 스위트 어느 기준에는 걸린다** — 표의 «무엇이 무엇을 잡는가» 귀속 지도가 부분적으로 틀렸을 뿐이다. 표 행은 plan-done §5 가 인정한 대로 **연역**이었고, 이 실측이 그 연역의 오차를 처음 재었다. **표 자체의 교정은 acceptance.md 본문 소유(manager-spec)이므로 run 이 고치지 않고 sync 인계로 넘긴다.**
- F 의 «광범위» 주석은 실측보다 넓게 적혀 있었다 — 006·008·009·010·012 는 확립이 아니라 **거절**을 재므로 논스 부재에도 생존한다.

> **정정 — 변이 C 를 잡는 기준에 `AC-GWAUTH-013` 은 들어가지 않는다 (sync 단계, 증거 재판독).** 위 «C → 001·013» 은 거짓이다. 증거 원문 `.moai/state/verify/t15-run/mutation-C.txt` 를 다시 읽으면, 변이 C 에서 붉어진 채널 테스트 파일은 **permission-relay · index-wiring · transport-auth · gateway-client 넷뿐**이고 `AC-GWAUTH-013` 이 사는 `channel/test/gateway-mutual-auth.test.ts` 는 그 목록에 **없다**(같은 파일에서 문자열 `gateway-mutual-auth` 의 출현 0회). 즉 **013 은 변이 C 에서 생존했다.** C 를 실제로 잡은 것은 **서버 쪽 `AC-GWAUTH-001` 하나**다 — 같은 원문의 서버 스위트가 `Tests 1 failed | 182 passed`, 그 한 건이 `test/gateway.test.ts > … welcome carries a proof bound to the nonce, room and bot, keyed on the stored token hash` 다. 원래 주장을 지우지 않고 위 줄에 취소선으로 남긴다. `acceptance.md` 변이표 v0.5.0 의 C 행이 이 실측을 반영해 `001 · 005 · 007 · 011 · 015` (009·013 생존)로 개정됐다(커밋 `26b2f71`, 감사 F-03).

### 5. 변이 N·O 짝 관측 — **성립 (이 카드의 굵은-변이 방어)**

- **N**(`} else if (!established)` → `} else if (false)`): 실패 5건 — AC-CHANAUTH-001·003·004·005 + **AC-CHANINJECT-007**(같은 게이트를 공유하는 형제 기준, 표의 «만» 절이 세지 못한 하나). **AC-GWAUTH-* 는 하나도 무너지지 않았다** — ①(`proofRejected`)이 먼저 반환하므로 ②를 지워도 이 SPEC 의 기준은 서 있다. `mutation-N.txt` 원문.
- **O**(①을 체인 밖 독립 문장으로 체인 뒤로 이동 — [HARD] 형태 그대로) **+ N 재적용**: 실패 11건 = N 의 5건 + **AC-GWAUTH-005·006·008·009·011·012**. 표가 요구한 뒤집힘(006·008·009·011·012)이 **정확히** 일어났다. **분리는 호칭이 아니라 구조에서 나온다는 것이 실측됐다.** `mutation-O.txt` 원문.

### 6. B-3 실측치 — 29 (상한 55 이내)

하네스 수정 전 상태에서 구현만 넣었을 때의 붕괴 수: **29건**(gateway-client 15 · index-wiring 11 · permission-relay 1 · transport-auth 2 — `b3-collapse-count.txt` 원문). 상한 55 는 네 하네스 파일의 it() 총합이고, §3.2 가 예측한 대로 확립에 의존하지 않는 기준은 살아 남았다. 문서가 예측한 본문-개정 3건(AC-CHANCLIENT-001·002·011)이 전부 실패 목록에 있었다 — 예측과 실측이 일치한 부분.

### 7. AC-GWAUTH-014 경계 확인 — PASS

`git diff --name-only <spec_base_sha=b11bdc5>..HEAD`(문서 커밋 포함 최종 측정, `ac014-boundary.txt` 원문): **집합 안의 14파일뿐** — `server/src/gateway.ts` · `channel/src/gateway-client.ts` · `server/test/gateway.test.ts` · `channel/test/transport-auth.test.ts` · `channel/test/gateway-mutual-auth.test.ts`(신설) · `channel/test/gateway-client.test.ts` · `channel/test/permission-relay.test.ts` · `channel/test/index-wiring.test.ts` · `.moai/specs/**` 6파일. ① `server/package.json`·`channel/package.json` diff **빈 문자열**(의존성 무변경) ② `channel/src` 의 `node:fs` import **0건** ③ 게이트웨이 메시지 **타입 집합 불변**(hello·welcome 에 필드 둘만 추가).

### 8. 경계 진술 (spec.md §5 그대로 — **v0.5.0 개정본**)

**«그 소켓의 `hello` 를 읽을 수 없고 토큰도 그 저장 해시도 모르는 상대를 배제했다. `hello` 를 받는 자리에 있는 상대는 닫지 못하며(후속 카드 `t22`), `bot_tokens.token_hash` 가 읽기 전용으로 유출된 배치도 닫지 않는다.»**

줄여 적으면 완료가 아니다(`acceptance.md` Definition of Done, v0.5.0). 증명 열쇠는 평문 토큰이 아니라 저장 해시이므로 해시 보유자는 토큰을 모르면서 증명을 위조하고, `hello` 를 받는 자리는 그 프레임에 실려 온 평문 토큰에서 열쇠를 그 자리에서 만든다 — 둘 다 `spec.md` §5 의 표대로 배제되지 않는다.

> **정정 기록 — 이 자리에 있던 문장은 거짓이었다.** run 단계가 여기에 적은 것은 **«토큰 또는 그 저장 해시를 모르는 상대를 배제했다. `bot_tokens.token_hash` 가 읽기 전용으로 유출된 배치는 닫지 않는다.»** 였다. sync 단계 독립 감사의 **F-01(Critical)** 이 그 문장을 반증했다 — 채널이 `hello` 에 평문 토큰을 함께 싣고(`channel/src/gateway-client.ts:82`) 증명 열쇠가 그 토큰의 해시이므로(`:45`), 토큰을 **미리 모르는** 위조 게이트웨이도 그 프레임을 받는 즉시 유효한 증명을 만든다. 실행으로 확인했다(`.moai/state/verify/t15-sync/probe-token-echo.mts` → `PROBE_TOKEN_SEEN_BY_ROGUE` · `PROBE_SESSION_ESTABLISHED>>>true`). `spec.md` §5 개정(커밋 `26b2f71`)이 배제표 1행을 둘로 갈랐고, 위 개정본이 그 결과다. 옛 문장은 지우지 않고 이 인용 안에 남긴다 — 무엇이 언제 왜 거짓이 됐는지가 정정 자체보다 오래 쓰인다.

### 9. 블로커 보고

없다. 다만 세 가지를 sync 인계로 남긴다 — ① 변이표 7행의 실측 교정(acceptance.md 본문 소유) ② plan §F M3-5 후반부(routes-bots.ts:9-10 주석에 «그리고 채널 사본» 추가)의 **의도적 미수행** — §A PRESERVE 와 AC-GWAUTH-014 집합이 그 파일을 배제하므로 기계적으로 검증되는 쪽을 따랐다; 채널 쪽 @MX:ANCHOR(`gateway-client.ts` 의 증명 계산 자리 → `routes-bots.ts:11`·`gateway.ts`)는 착지했다 ③ M4/M5 코드 편집으로 `SPEC-GWAUTH-001` 자기 문서의 테스트 파일 줄 인용이 밀렸다(실행 레인이 실측한 새 앵커: `spec.md` 의 `:105→:114`·`:297→:307`·`:108-117→:126-140`·하네스 네 자리 `:40→:47`·`:86→:93`·`:47→:54`·`:50,65→:47,106`, `acceptance.md` 의 `transport-auth.test.ts:191-212→:252-273`·`gateway-client.test.ts:86→:97`·`:112→:129`, `plan.md:262-263·:274`). `spec.md:246` 이 두 형제 acceptance 블록을 `:136`·`:89` 로 인용하는 것은 R-06 이전부터 낡은 값이다(실제 `:149`·`:162`).

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-29
implementation_commit: 82a1fea   # M2~M5 (13파일). 이후 문서 커밋은 .moai/specs/** 만 건드린다
spec_base_sha: b11bdc5           # §C 사전 점검에서 기록한 AC-GWAUTH-014 기준
suite: "server 183/183 + channel 81/81 = 264 초록 (base 250 대비 +14) — exit 0, gate-npm-test.txt"
typecheck: "server 0 오류 · channel 0 오류 · channel build exit 0"
requirements_implemented: "REQ-GWAUTH-001..013 전부 (M2 서버 증명 · M3 채널 논스+대조+[HARD] 구조 · M4 하네스+명세 짝 · M5 신규 기준 11건)"
acceptance_pass: "AC-GWAUTH-001..015 = 15/15 PASS (§E.2.1 표)"
mutation_table: "A~O 15개 직렬 실행·되돌림 완료. 완전 일치 6행(A·B·D·E·K·L), 결합 차이 7행(C·F·G·H·I·J·M — 전부 스위트에 포착, 표 귀속 지도의 오차). 방어 구멍 0"
thick_mutation_defense: "N: AC-GWAUTH-* 붕괴 0 (형제 AC-CHANAUTH-001·003·004·005 + AC-CHANINJECT-007 만) / O+N: AC-GWAUTH-005·006·008·009·011·012 붕괴 — 표가 요구한 뒤집힘 정확히 성립, mutation-N.txt·mutation-O.txt"
b3_collapse_measured: "29 (상한 55 이내) — b3-collapse-count.txt"
boundary_check: "AC-GWAUTH-014 PASS — diff 가 집합 내 14파일, 의존성 diff 빈 값, channel/src node:fs 0건, 메시지 타입 집합 불변 — ac014-boundary.txt"
boundary_statement: "«그 소켓의 hello 를 읽을 수 없고 토큰도 그 저장 해시도 모르는 상대를 배제했다. hello 를 받는 자리에 있는 상대는 닫지 못하며(후속 카드 t22), bot_tokens.token_hash 가 읽기 전용으로 유출된 배치도 닫지 않는다.» — §E.2.8 에 그대로 기록"
boundary_statement_superseded: "run 이 적었던 «토큰 또는 그 저장 해시를 모르는 상대를 배제했다…» 는 거짓이며 sync 감사 F-01(Critical)이 실행으로 반증했다. spec.md §5 개정 커밋 26b2f71 이 배제표 1행을 갈랐고 위 문장이 그 결과다 — 옛 문장은 §E.2.8 의 정정 기록에 남겨 둔다"
sibling_contracts_landed:
  - "SPEC-CHANPERM-001 v0.7.0 — M4 명세 짝 (하네스 코드 착지에 맞춘 현재형 개정 + HISTORY)"
  - "SPEC-CHANWIRE-001 v0.6.0 — M4 명세 짝 (동일 treatment)"
  - "AC-CHANCLIENT-001·002·011 — 개정된 계약(v0.6.0/v0.6.1) 본문으로 초록"
sync_handoffs:
  - "변이표 7행 실측 교정 — acceptance.md 본문( manager-spec 소유). §E.2.4 의 행별 실측값이 원본"
  - "plan §F M3-5 후반부 미수행 기록 — routes-bots.ts:9-10 주석 («그리고 채널 사본»). §A PRESERVE + AC-GWAUTH-014 가 이겼다; 채널 쪽 ANCHOR 는 착지"
  - "SPEC-GWAUTH-001 자기 문서의 낡은 줄 인용 목록 — §E.2.9 ③ (M4/M5 코드 편집으로 발생, §B-0 훑기 결과)"
  - "plan §B-7 F-A8 포인터 — 카드 종료 전 도달성 실측 또는 «소유 카드 종료·후속 소유자 없음» 기록 (sync 단계 조치)"
  - "AC-GWAUTH-005 의 발신 한 단계 — 판정 중계가 발신 집합 대조를 지나려면 sendRequest 선행이 필요(테스트 내 근거 주석 있음). 기준 본문과 모순 아님"
deviations_accepted:
  - "server/test/gateway.test.ts 의 wsConnect 헬퍼에 extra 선택 인자 추가 — 기존 호출자 바이트 동일, nonce 실린 hello 를 기존 테스트가 보낼 수 있게 하는 하네스 손잡이"
blockers: 0
```

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-failed        # 그대로 둔다 — 재감사가 아직 돌지 않았다. 처분을 이행했다고 통과로 바꾸지 않는다
sync_attempted_at: 2026-08-30
sync_commit: none                # sync_commit_sha 필드는 일부러 적지 않는다 — 재감사 전이므로
                                 # 그 이름을 쓰면 종료된 카드로 오독된다
operator_disposition:
  chosen: "(b) 정직 정정 + 후속 카드 t22"
  decided_at: 2026-08-30
  meaning: "코드는 되돌리지 않는다. 거짓이던 방어 주장을 실측에 맞춰 좁혀 적고, 실질 종결(평문 토큰 제거 + 검증자 저장 + 확립 후 프레임 인증)은 후속 카드 t22 가 가져간다"
plan_lane_amendment:
  commit: 26b2f71
  closed: "F-01(Critical) · F-03(High) · S-01(High) · F-07(Low) — spec.md §1.2·§1.3·§5 배제표 개정, acceptance.md 변이표 13행 실측 재도출, AC-GWAUTH-003 제목 정정, 낡은 줄 인용 갱신"
  ac_014_amended: "측정 끝점을 움직이는 HEAD 에서 구현 HEAD 2d7c1ef 에 고정. 허용 집합에 .moai/reports/** 와 .moai/state/verify/** 추가 — 증거·보고서 커밋이 통과 중인 기준을 붉히던 충돌(open_conflict)이 이로써 해소됐다"
sync_lane_corrections:            # 이 커밋에서 sync 레인이 한 일
  - "§E.2.8 경계 진술 — 거짓 문장을 v0.5.0 개정본으로 교체하고 옛 문장을 정정 기록에 보존 (F-01)"
  - "§E.3 boundary_statement — 같은 교체 + boundary_statement_superseded 로 사유 기록"
  - "§E.2.4 변이 C — «C → 001·013» 정정. mutation-C.txt 재판독으로 013 생존 확인, 잡는 기준은 서버 쪽 001 하나"
  - "CHANGELOG.md [Unreleased] 항목 신설 · README.md 네 자리(현재 상태·게이트웨이 프로토콜·F-01·F-07) 갱신 — 잔여 범위를 그대로 옮겼다"
audit:
  report: ".moai/reports/t15/sync-audit.md"
  verdict: "FAIL 0.70 (Tier M 임계 0.80)"
  dimensions: "Functionality 0.76 · Security 0.55(must-pass, 독립 미달) · Craft 0.85 · Consistency 0.70"
  lens: "--security --deep"
blocking_findings:
  - "F-01 [Critical] spec.md §5 배제표 1행이 거짓 — hello 를 받는 자리가 방금 건네받은 평문 토큰에서 증명 열쇠를 만든다. 처방은 문서 정정뿐이며 코드 변경을 요구하지 않는다"
  - "F-02 [High] 부정 기준 다섯(AC-GWAUTH-006·008·009·011·012)이 §1.1 이 지목한 상대보다 엄격히 약한 상대를 잰다"
  - "F-03 [High] Definition of Done «변이표와 정확히 일치» 미충족 — 13행 중 7행이 어긋났다"
  - "F-04 [Medium] 이 §E.4 의 공백 자체 — 비어 있으면 F-A8 포인터가 카드와 함께 조용히 사라진다"
sync_lane_finding:
  - "S-01 [High] AC-GWAUTH-003 의 제목은 «어떤 프레임도» 라 적지만 본문은 그 접속이 받은 프레임만 잰다. 내보내는 hello 는 평문 토큰을 싣는다. 소유 manager-spec, plan 이월"
suite: "server 183/183 + channel 81/81 = 264 초록 — npm test exit 0, sync 레인이 이 HEAD 에서 직접 실행 (.moai/state/verify/t15-sync-npm-test.txt)"
suite_final: "server 183/183 + channel 81/81 = 264 초록, exit 0 — 감사용 토큰 되받기 프로브를 스위트 밖으로 옮긴 뒤 재측정 (.moai/state/verify/t15-sync/npm-test-final.txt). 프로브는 .moai/state/verify/t15-sync/probe-token-echo.mts 로 남아 증거로만 쓰인다"
typecheck: "npm run typecheck --workspaces exit 0 — 양쪽 오류 0 (.moai/state/verify/t15-sync-typecheck.txt)"
code_state: "무변경. 착지한 구현은 옳고 되돌릴 이유가 없다 — 이 판정은 코드가 아니라 코드가 무엇을 했는지에 대한 서술을 겨눈다"
probe_evidence:
  file: ".moai/state/verify/t15-sync-probe-token-echo.txt"
  output: "PROBE_TOKEN_SEEN_BY_ROGUE>>>secret-token-the-rogue-never-knew / PROBE_SESSION_ESTABLISHED>>>true"
f_a8_reachability:
  status: "미실측 — 리드 수행 대기"
  meaning: "발신 집합 128 축출의 도달성을 아직 아무도 재지 않았다. 이 줄이 F-04 의 실질이다"
  owner: "칸반 리드 — done 판정 전에 직접 수행한다"
  if_skipped: "실측 없이 카드를 닫으면 이 항목은 소유 카드와 함께 사라진다. 재개하려면 도달성을 먼저 실측할 것"
carried_to_plan:                 # 전부 manager-spec 소유 본문. sync 는 한 자도 고치지 않았다
  - "acceptance.md 변이표 7행 실측 교정 — 원본은 §E.2.4 의 행별 실측"
  - "spec.md 자기 문서의 낡은 줄 인용 — 목록은 §E.2.9 ③"
  - "S-01 — AC-GWAUTH-003 제목이 본문보다 넓다"
  - "AC-GWAUTH-014 허용 집합 개정 요청 — .moai/reports/** 와 .moai/state/verify/** 를 더할 것"
open_conflict:
  item: "증거 파일 커밋과 AC-GWAUTH-014 의 충돌 — **해소됨** (커밋 26b2f71 의 AC-014 개정)"
  detail: "끝점이 구현 HEAD 2d7c1ef 에 고정되고 허용 집합이 .moai/reports/** · .moai/state/verify/** 를 포함하므로, sync 단계 증거·보고서 커밋은 이 기준의 측정 밖이다"
re_audit_owed:
  scope: "F-01~F-04 델타 + 회귀 3건 (감사 §8)"
  state: "미실시 — 이 커밋 시점에 재감사는 돌지 않았다. 그래서 sync_status 가 audit-failed 로 남는다"
blockers: 4                       # 처분은 이행했으나 재감사 전이므로 숫자를 내리지 않는다
disposition:
  card: "닫지 않았다"
  operator_choice: "(b) 문서를 정직하게 정정하고 후속 카드 t22 를 연다 — 2026-08-30 결정"
```

**§E.4 를 남기는 이유.** 이 절이 비어 있는 것 자체가 감사의 차단 결함 F-04 였다. 위 `f_a8_reachability` 블록이 그 처방이다 — F-A8 도달성은 아직 실측되지 않았고, 그 실측은 칸반 리드가 done 판정 전에 수행한다. 기록이 없으면 이 항목은 카드가 닫히는 순간 소유자 없이 사라진다.

**문서 동기화를 미뤘던 이유와, 지금 쓴 이유.** 이 SPEC 의 중심 방어 주장이 실행으로 반증됐으므로(F-01), 처분이 서기 전에는 CHANGELOG·README 를 쓰지 않았다 — 「게이트웨이 상호 인증 추가」로만 적히는 순간 독자는 서지 않은 방어가 섰다고 읽기 때문이다. 운영자가 (b)를 골랐고 `spec.md` §5 가 개정됐으므로, 이제 그 절의 잔여 범위를 **그대로 옮긴** 문안으로 두 문서를 썼다. 두 문서 어디에도 F-01 이 닫혔다고 적지 않았고, README 의 채널 플러그인 판정은 **FAIL 그대로**다.

**아직 남은 것 둘.** ① `f_a8_reachability` — 발신 집합 128 축출의 도달성은 여전히 **미실측이며 칸반 리드 수행 대기**다. 실측 없이 카드를 닫으면 이 항목은 소유 카드와 함께 사라진다. ② **재감사 미실시** — F-01~F-04 델타 + 회귀 3건이 아직 재측정되지 않았으므로 `sync_status` 는 `audit-failed` 로 남고, 네 SPEC 산출물의 `status:` 는 `in-progress` 에서 움직이지 않았다.
