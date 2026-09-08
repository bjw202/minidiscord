# SPEC Review Report: SPEC-E2ESCEN-001
Iteration: 1/3
Verdict: FAIL
Overall Score: 0.75 (조화평균; 산술평균 0.81) — Tier M 통과선 0.80 (`spec-workflow.md:141`, 직접 읽음)

기준: `main` HEAD `66267ca`, Tier M(`spec.md:14`). 읽은 산출물: spec.md·plan.md·acceptance.md·research.md·progress.md. 위임 프롬프트의 맥락 문장(«두 번째 러너…», «정확히 하나의 NEEDS CLARIFICATION 이 예상된다»)은 M1 격리 원칙에 따라 판정 근거로 쓰지 않았다 — 전부 파일에서 다시 확인했다.

## 쉬운 말 요약

SPEC 자체는 잘 짜여 있다. 요구사항 16개는 전부 GEARS 형식이고 번호가 연속이며, 수용 기준 15개와 양방향으로 빠짐없이 이어진다. 인용한 코드 행 번호는 spec.md·acceptance.md 전수와 research.md 표본을 실제 파일과 대조했고, README 한 자리(526행→실제 620행)를 빼면 전부 맞는다. `history_request` 가 `LIMIT` 을 `since_id` 보다 먼저 적용한다는 핵심 주장도 코드에서 확인했다(`gateway.ts:274` DESC LIMIT → `:277` since_id 필터, 진입은 `:127` `case 'history_request'`).

그런데 수용 기준 넷이 «잘못된 구현도 통과시키는» 모양이다. 가장 큰 것은 AC-008 (ㄹ)이다 — 520개를 채운 뒤 `limit: 500` 으로 걸으면 빠짐 0 을 «단언한다» 고 적었는데, 밀린 수 520 > 500 이라 올바른 서버에서도 이 단언은 실패한다. AC-008 (ㄴ)의 필터 단언은 응답이 비어 있어도 참이고, AC-009 (ㄴ)은 B 가 R2 에 쓴 글이 없으면 «전부 (삭제된 봇)» 이 공허하게 참이며, AC-014 는 Tier M 기본 경로(main 직접 커밋)에서 `git diff main` 이 항상 비어 있어 아무것도 재지 않는다. 여기에 규약상의 반드시-통과 항목 둘이 걸린다: `related_specs` 의 SPEC 둘이 대체된(superseded) 스텁인데 본문에 그 사실이 없고(D7), plan.md 에 `[NEEDS CLARIFICATION]` 표지가 하나 열려 있다(이건 의도된 것이며 Kickoff 전 운영자 결정으로 닫는 자리다).

고칠 것은 전부 문서 몇 줄이다. 아래 D1~D6 을 고치면 2회차에서 통과선을 넘길 것으로 본다.

## Must-Pass Results

- [PASS] MP-1 REQ 번호 일관성: `grep -n '^\*\*REQ-E2ESCEN-' spec.md` → 001~016 연속·중복 없음(`spec.md:84,87,90,93,98,103,108,113,118,121,126,131,134,137,140,143`). Tier M 상한 16/16 정확히 채움.
- [PASS] MP-2 GEARS 형식(요구사항 계층에 대해 판정): Ubiquitous 「…해야 하며/해야 한다」(REQ-001~004·012~014), When(REQ-005·006·008~011), While+When 복합(REQ-007 `spec.md:108`), Where(REQ-015 `spec.md:140`), shall not(REQ-016 `spec.md:143-144` «고쳐서는 안 된다»). AC 의 Given-When-Then 은 검증 계층이라 여기서 감점하지 않았다.
- [PASS] MP-3 YAML frontmatter: 12 필드 전부 존재·형식 일치(`spec.md:2-13` id/title/version "0.1.0"/status draft/created·updated 2026-09-08/author/priority P2/phase/module/lifecycle spec-anchored/tags). 추가 `tier: M`, `depends_on`, `related_specs`(`:14-16`). 거부 별칭 없음.
- [N/A] MP-4 언어 중립성: TypeScript 단일 언어 프로젝트, 도구 이름 열거 없음.
- [FAIL] MP-5 D7 교차 SPEC 조정: `spec.md:16` `related_specs: [SPEC-CHANCLIENT-001, SPEC-GATEWAY-001]` — 두 파일 모두 `.moai/specs/<ID>.md` 스텁이고 둘째 줄이 «대체됨 → SPEC-BOTMODEL-001 …» 이며 본문은 `_archive/` 로 옮겨졌다. spec.md 본문에 이 대체 사실을 적은 자리가 없다(`grep -c CHANCLIENT spec.md` → 1, frontmatter 뿐). `depends_on` 다섯(BOTMODEL·MSG·SSE·PERM·MENTION)과 본문의 SPEC-PERMROUTE-001 은 전부 `status: completed` 확인. → D1.
- [PASS] MP-6 D8 교차 플랫폼: `grep -c syscall` 다섯 파일 전부 0 → 자동 통과.
- [FAIL] MP-7 clarification gate: `grep -rn '\[NEEDS CLARIFICATION' plan.md research.md` → `plan.md:167` 1건(«CI 포함 여부 (OD-6)»), research.md 0건. 정확히 하나·plan.md 에만 있다. 규약상 열린 표지는 점수와 무관하게 게이트를 막는다 — 오케스트레이터가 Kickoff 전에 AskUserQuestion 으로 닫아야 한다. → D2.

## Category Scores (0.0-1.0, rubric-anchored)

| Dimension | Score | Rubric Band | Evidence |
|-----------|-------|-------------|----------|
| Clarity | 0.75 | 0.75 | 대부분 단일 해석. 흐린 자리: AC-008 (ㄷ) 멘션 없는 사람 글의 시점·`limit` 미지정(`acceptance.md:147,153`); AC-012 (5) M7 «예외 주석» 기제 미지정(`:200`); G2 수치 요약이 세 문서에서 다르게 적힘(`spec.md:194` cc 1·system 1 / `acceptance.md:31` cc 2·system 2 / `plan.md:89` 봇 글 7) |
| Completeness | 1.00 | 1.0 | HISTORY(`spec.md:21`)·배경(`:29`)·용어(`:47`)·요구사항(`:80`)·수용 기준(`:184`)·Out of Scope H3 넷 + `-` 항목(`:152-170`)·제약(`:172`)·참조(`:206`). research.md·progress.md 추가 |
| Testability | 0.50 | 0.50 | 15 중 11 은 명령+정수 결과로 이분. 넷이 결함: AC-008 (ㄹ) 자체 모순(`acceptance.md:154`), AC-008 (ㄴ) 공집합에 참(`:152`), AC-009 (ㄴ) 공집합에 참(`:163`), AC-014 Route A 에서 공허(`:218-222`) — D3~D6 |
| Traceability | 1.00 | 1.0 | REQ→AC: 16/16 (spec.md §7 `:190-204` 와 acceptance.md 매트릭스 `:27-41` 일치). AC→REQ: 15/15 전부 실재 REQ. 고아 없음 |

조화평균 = 4 / (1/0.75 + 1/1.0 + 1/0.50 + 1/1.0) = 4 / 5.333 = **0.75**. 산술평균 0.8125. 통과선 0.80 미달.

## 위임 항목별 판정

1. **행 번호 인용** — spec.md §2·§3·§4·§5·§8 전수 + acceptance.md 전수 + research.md 표본(§2.1 전체·§2.2·§2.3·§1.3) 을 `cat -n` 으로 대조. 일치: `gateway.ts` 49·62·75-77·101-103·105-135·109·110-111·114·117·123·127·138-155·143·160-173·179-186·196·202-236·241·246-249·264-269·272-284·289-297·291·311-314; `permissions.ts` 7·13·45-47·48-64·77-83·111-112·119-128·70; `routes-messages.ts` 47·63-65·76-78·94-97·107-109·117-133·144/147/152·173; `routes-bots.ts` 60-76·62·108-123·120-121; `sse.ts` 19-32·25·49; `mention.ts` 3; `auth.ts` 14·18; `routes-events.ts` 11-14; `scripts/e2e.mts` 3-4·10-14·28-35·55-58(`E2E_FORCE_PORT`)·73·89-103·105-112·152(`export async function api`)·162-165·168·214·268·465·484행; `channel/src/index.ts` 78-112·85-86·93-98·104-108; `truncate.ts` 9·12·22-28·40; `ci.yml` 26-29; `ROADMAP.md:186` OD-6; `gateway.test.ts` 1250/1263/1290/1315/1338/1034/875/274-277; `permissions.test.ts` `it` 29·`sse.test.ts` 9(직접 셈). **불일치 1**: `README.md 526행`(`spec.md:212`, `research.md:31`) — 4,000/16,000 문장은 620행. `LIMIT`→`since_id` 순서 주장은 참이고 `history_request` 로 도달 가능(`:127`).
2. **AC 판별력** — 아래 D3~D6·D7·D10. 관측 항목이 판정에 닿지 않는 것은 설계로 명시됨(`spec.md:132`, `acceptance.md:13-14`, AC-011 변이). AC-001 의 정규화: 첫째 러너 stdout 은 `[n/15]`·`[boot-timeout]`·마지막 줄 뿐이고(`grep -n console.log scripts/e2e.mts`), 서버 자식이 `stdio: 'inherit'`(`e2e.mts:76`) 로 찍는 «minidiscord listening on 127.0.0.1:PORT»(`server/src/index.ts:77`, logger false) 만 포트를 실으므로 포트 가림(`acceptance.md:54-55`)으로 충분하다 — 검사 가능.
3. **REQ↔AC 양방향·상한·수 일치** — 16/16·15/15, Tier M 16/16 안. HISTORY(`spec.md:25`) «16개·15개» 와 일치. AC-005 요약 수치만 세 문서가 다르다(D9).
4. **시한·배경 부하** — REQ-013(`spec.md:134-135`) 이 시한 없는 대기·`while(true)`·배경 프로세스를 금지하고 AC-012(`acceptance.md:193-200`) 가 grep 으로 잰다; 러너의 프로세스는 서버(+선택 채널)뿐이고 `finally` 정리(REQ-002 `spec.md:88`, `research.md:124`). AC-003 (4) 의 `node -e … &` 리스너(`acceptance.md:87`) 만 배경 프로세스인데 20초 자체 종료로 유한하다 — 규약의 «정리 보장» 형태(`timeout` 래퍼)로 바꾸면 더 낫다(D11). AC-012 (2) 의 grep 은 `deadline` 낱말이 주석에만 있어도 통과시키는 약한 휴리스틱(D12).
5. **실현 가능성** — (a) `server/tsconfig.json` `include: ["src","test"]`: tsc 는 include 를 뿌리로 삼고 import 를 따라가므로 `scripts/e2e-lib.mts` 가 `pretest` 의 strict 검사를 **받는다** — `research.md:117` «시험 파일만 보고» 는 틀린 전제. 다만 읽기 전용 탐침 `npx tsc --noEmit --ignoreConfig --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --target ES2022 --types node ../scripts/e2e.mts`(server 에서) → 종료 0 이라 현행 코드는 통과한다(D8, 문장만 고치면 됨). (b) SSE 관측자: Node 내장 `fetch` 는 `cookie` 헤더를 허용하고 이미 `api()` 가 그렇게 보낸다(`e2e.mts:152`); `AbortController`·스트림 본문 읽기 모두 표준 — 실현 가능. (c) G7: REQ-015 가 Where 절, M7 우선순위 Low·«미뤄도 닫힌다»(`plan.md:146-150`), AC-013 절반만 필수(`acceptance.md:206`) — 명확히 선택·분리됨. `channel/dist` 부재 대응도 있음(`plan.md:182`).
6. **중복 시험 공시** — 인프로세스 겹침은 `research.md:16-25` 표로 열거하고 «전선에서 봇 둘·관측자와 함께 다시 잰다» 고 명시; 첫째 러너 겹침(재전송·재시작·모르는 토큰)은 `spec.md:160`·`plan.md:138-139` 에 «첫째 러너 ⑥/⑭ 과 같은 방법» 으로 공시. 미공시 재시험 없음.
7. **frontmatter·depends_on·표지** — 위 MP-3·MP-5·MP-7.

## Defects Found (structured defect-list)

D1. D7-SUPERSEDED — `spec.md:16` — `related_specs` 의 SPEC-CHANCLIENT-001·SPEC-GATEWAY-001 은 대체된 스텁(`.moai/specs/SPEC-CHANCLIENT-001.md:2`, `SPEC-GATEWAY-001.md:2` «대체됨 → SPEC-BOTMODEL-001»)인데 본문에 조정 문장이 없다 — Severity: critical(규약상 must-pass) — Class: blocking — Required fix: `related_specs` 에서 둘을 빼거나, §3 표 첫 행 또는 §8 참조에 «CHANCLIENT-001·GATEWAY-001 은 BOTMODEL-001 §3.3~§3.5 로 대체됨(스텁·_archive)» 한 줄을 적는다.

D2. CLARIFICATION-GATE — `plan.md:167` — `[NEEDS CLARIFICATION: CI 포함 여부 (OD-6)]` 열림 — Severity: critical(규약상 must-pass; 의도된 표지) — Class: blocking — Required fix: 오케스트레이터가 Kickoff 전 AskUserQuestion 으로 결정(편입/미편입/실측 뒤 결정)을 받고 표지를 결정문으로 바꾼다. SPEC 본문은 이미 «편입하지 않는다» 쪽으로 일관돼 있어(`spec.md:159`) 문서 변경은 그 한 줄뿐이다.

D3. AC-008(ㄹ)-SELF-CONTRADICTION — `acceptance.md:154` («같은 걸음을 `limit: 500` 으로 하면 `missed_ids === 0` … 단언한다») — Given(`:147`)의 밀린 글은 봇 520 + 사람 1 이상 = 500 초과. `handleHistory`(`gateway.ts:273-277`) 는 `since_id` 이전에 DESC LIMIT 500 을 자르므로 올바른 서버에서도 첫 응답이 가장 오래된 20여 개를 잃어 `missed_ids > 0` — 단언이 코드에 대해 거짓. `plan.md:31` 자신의 규칙 «`limit ≥ 밀린 수` 일 때만» 과도 충돌 — Severity: major — Class: blocking — Required fix: 단언 갈래의 `since_id` 를 밀린 수가 500 이하가 되는 자리(예: 채우기 중간 id, 또는 «채운 뒤 사람 글 1 만 밀린» 자리)로 지정하고 밀린 수를 명시한다; 관측 갈래(limit 100)는 그대로.

D4. AC-008(ㄴ)-VACUOUS-ON-EMPTY — `acceptance.md:152` — `since_id`·`since/until`·`speaker` 단언이 «모든 원소가 술어를 만족» 형태라 응답이 `[]` 여도 참. 필터가 전부를 버리는 구현이 통과한다(`limit:3`·`limit:9999` 만 개수 단언) — Severity: major — Class: blocking — Required fix: 각 필터에 «기대 집합과 id 열이 같다»(러너가 `limit:500` 응답에서 계산) 또는 최소 «원소 수 ≥ 1 이고 기대 수와 같다» 를 더한다.

D5. AC-009(ㄴ)-VACUOUS-ON-EMPTY — `acceptance.md:163` («R2 목록에서 B 가 쓴 글의 `author_name` 이 전부 (삭제된 봇)») — 시나리오상 B 는 R1 에만 글을 쓴다(G1·G2; G4 는 프레임, G5-a 는 A). R2 에 B 의 글이 0 이면 «전부» 가 공허하게 참 — Severity: major — Class: blocking — Required fix: 방을 R1 로 고치거나 삭제 전 B 가 R2 에 글을 남기게 하고, «`author_type:'bot'`·`author_bot_id` 가 B 였던 글 ≥ 1 이고 그 전부가 (삭제된 봇)» 로 개수를 박는다. `spec.md:122` REQ-010 (ㄴ) 은 방을 적지 않아 AC 와 어긋나지 않는다.

D6. AC-014-VACUOUS-UNDER-ROUTE-A — `acceptance.md:214-222`, `spec.md:203`, `plan.md:160` — `git diff … main` 은 구현이 `main` 에 직접 착지하는 Tier M 기본 경로(`spec-workflow.md:25` Route A)에서 항상 비어 (1) 0·(2) 빈 출력이 자동 통과. 워크트리 브랜치에서만 뜻이 있다 — Severity: major — Class: blocking — Required fix: 기준을 `progress.md:12` 의 `spec_base_sha`(66267ca)로 바꾼다: `git diff --stat 66267ca -- server/src web channel/src .github`, `git diff --name-only 66267ca`. 허용 목록에 `.moai/reports/**`(이 감사 보고서 등) 이 없어 커밋되면 (2) 가 붉어진다 — 목록에 넣거나 제외 pathspec 을 적는다.

D7. AC-008(ㄷ)-AMBIGUOUS-TIMING — `acceptance.md:147,153` — 멘션 없는 사람 글을 «그 사이에» 보냈다 하고 `history_response` 의 `limit` 을 안 적음. 520 채우기 전에 보내면 기본 `limit` 100(가장 새로운 100) 밖이라 올바른 구현이 거짓 실패 — Severity: minor — Class: blocking — Required fix: «채운 뒤에 보낸다» 또는 «`limit: 500` 으로 조회» 를 명시.

D8. RESEARCH-FALSE-PREMISE — `research.md:117`, `acceptance.md:244` — «`tsc --noEmit` 은 시험 파일만 보고 import 대상의 타입은 vitest 변환에 맡긴다» 는 틀림(tsc 는 include 를 뿌리로 import 를 따라간다). 실측: 현행 `e2e.mts` 는 strict 로 통과(위 5(a)) — Severity: minor — Class: optional — Required fix: 문장을 «`pretest` 가 `scripts/e2e-lib.mts` 도 strict 로 검사한다 — 추출 코드는 strict-clean 이어야 한다» 로 바꾼다.

D9. G2-COUNT-INCONSISTENT — `spec.md:194`(cc 1·system 1·봇 글 6) vs `acceptance.md:31`(cc 2·system 2) vs `plan.md:89`(봇 글 7) — 시점을 달리 세어 셋 다 참이지만 요약표만 읽는 독자는 다른 수를 본다 — Severity: minor — Class: blocking(문서 내부 일관성) — Required fix: `spec.md:194` 를 acceptance 매트릭스와 같은 «침묵 창 시점 to 5·cc 1·system 1·봇 글 6 → ⑦ 뒤 cc 2·system 2» 로 맞춘다.

D10. CITATION-README — `spec.md:212`, `research.md:31` — «README.md 526행» 은 채널 지시문 첫 항목; 4,000/16,000 문장은 `README.md:620` — Severity: minor — Class: optional — Required fix: 620 으로 고치거나 앵커 «원소 하나의 본문은 4,000바이트» 로 바꾼다.

D11. AC-003(4)-BACKGROUND-LISTENER — `acceptance.md:87` — `node -e … &` 가 배경 프로세스(20초 자체 종료) — Severity: minor — Class: optional — Required fix: `timeout 25 node -e … &` 로 감싸 kanban-dispatch § Verification load 의 «정리 보장» 형태를 맞춘다.

D12. AC-012(2)(5)-WEAK-GREP — `acceptance.md:194,197,200` — (2) 는 `deadline` 낱말이 같은 줄 주석에만 있어도 통과, 여러 줄 `setTimeout(` 는 거짓 실패; (5) 의 M7 «예외 주석» 은 grep 이 주석을 못 읽어 기제가 없다 — Severity: minor — Class: optional — Required fix: (5) 는 채널 spawn 을 `e2e-lib.mts` 의 `spawnChannel` 로 두어 시나리오 파일에 `spawn(` 이 없게 하거나 `grep -v spawnChannel` 을 명시; (2) 는 그대로 두되 휴리스틱임을 적는다.

D13. AC-011-SINGLE-MUTANT — `acceptance.md:184-185`, `plan.md:68` — 관측 항목 하나만 뒤집어 «observe() 가 assert 를 안 부른다» 를 일반화 — Severity: minor — Class: optional — Required fix: `awk '/function observe/,/^}/' scripts/e2e-scenario.mts | grep -c 'assert(\|fail('` → 0 을 AC-011 에 더한다.

## Regression Check (Iteration 2+ only)
해당 없음(1회차).

## Recommendation

1. D1: `spec.md:16` 의 `related_specs` 를 비우거나 §8 에 대체 사실 한 줄.
2. D2: Kickoff 전 OD-6 결정을 AskUserQuestion 으로 받고 `plan.md:167` 표지를 결정문으로 교체.
3. D3: `acceptance.md:154` 단언 갈래의 `since_id` 를 밀린 수 ≤ 500 인 자리로 명시.
4. D4: `acceptance.md:152` 다섯 필터에 기대 집합(또는 개수) 단언 추가.
5. D5: `acceptance.md:163` 방을 R1 로(또는 B 의 R2 글을 만들고) «≥ 1» 개수 박기.
6. D6: `acceptance.md:218-219`·`spec.md:203`·`plan.md:160`·`acceptance.md:253` 의 `main` 을 `66267ca`(spec_base_sha)로; 허용 목록에 `.moai/reports/**`.
7. D7·D9: 시점·`limit` 명시, G2 요약 수치 통일.
8. D8·D10~D13 은 선택 — 2회차 통과 여부에 걸지 않는다.

미검증(Gaps): `npm test` 기준선 210(`spec.md:182`, `acceptance.md:228`) 은 실행하지 않았다 — SPEC 이 run 단계 실측으로 적도록 돼 있어 그대로 둔다. `?after=abc`(NaN 바인딩) 의 실제 동작은 코드 주석(`routes-messages.ts:121`)만 읽었고 실행하지 않았다.

---

# SPEC Review Report: SPEC-E2ESCEN-001 — 2회차
Iteration: 2/3
Verdict: CONDITIONAL PASS (통과선 넘음·must-pass 7/7 해소; 아래 R2-1~R2-3 세 줄을 run 착수 전에 고치는 조건. 무조건 판정이 필요하면 그 셋이 착지할 때까지 FAIL 로 읽을 것)
Overall Score: 0.857 (조화평균; 1회차 0.75 → 상승, 산술평균 0.875) — Tier M 통과선 0.80 (`spec-workflow.md:141`)

기준: SPEC v0.2.0(`spec.md:4`). 작업 나무 HEAD 는 `d98ad7b`(66267ca 뒤 커밋 하나, README.md 만 변경 — `git diff --stat 66267ca d98ad7b -- server/src scripts channel/src` 빈 출력, `gateway.ts` 317행·271~279행 동일 확인). 위임 메시지의 «고쳤다» 주장은 근거로 쓰지 않았고 파일에서 다시 읽었다.

## 쉬운 말 요약

1회차 지적 열셋은 파일에서 전부 닫힌 것을 확인했다 — 대체된 SPEC 참조 삭제, CI 미포함 결정문(표지 0건), 480 걸음, 기대 집합 단언, R1 의 B 글 개수, 기준 SHA, 시점 명시, 요약 수치 통일, README 620행, 배경 리스너 `timeout`, `spawnChannel`, `observe()` 본문 검사. 점수는 0.857 로 통과선을 넘고 반드시-통과 항목도 전부 해소됐다.

다만 고쳐 쓴 AC-008 (ㄴ) 안에 새 어긋남 둘이 생겼다. «`speaker: 'A'` 는 정확히 500» 은 같은 절의 (ㄷ)·`limit: 3`·`limit: 9999` 가 «마지막 사람 글이 가장 새로운 500 안에 있다» 고 못 박은 것과 모순이라 499 여야 하고, «기준 집합» 을 사람 글 전에 받는지 뒤에 받는지에 따라 `since_id` 10 과 480 걸음의 수가 한 칸 어긋난다. `since/until` 은 저자가 걱정한 대로 520개 채우기가 한 초 안에 끝나면 구간이 비어 «1 이상» 이 올바른 서버에서 실패한다. 그리고 AC-014 의 기준 `66267ca` 는 이미 낡았다 — 지금 HEAD 에서 `git diff --name-only 66267ca` 가 README.md 를 내므로 구현 전부터 (2) 가 붉다. 셋 다 한두 줄 수정이다.

## Must-Pass Results (2회차)
- [PASS] MP-1: REQ-001~016 연속(`grep -c '^\*\*REQ-E2ESCEN-'` → 16). MP-2 PASS(REQ 계층, 변경 없음). MP-3 PASS: 12 필드 그대로, `related_specs` 만 제거(`spec.md:2-15`), `version: "0.2.0"`.
- [N/A] MP-4 단일 언어.
- [PASS] MP-5 D7: `related_specs` 삭제 + `spec.md:213` «SPEC-CHANCLIENT-001·SPEC-GATEWAY-001 은 BOTMODEL-001 §3.3~§3.5 로 대체된 스텁 … 참조하지 않는다». 본문 인용은 `depends_on` 다섯 + PERMROUTE-001(전부 completed).
- [PASS] MP-6 D8: `syscall` 0.
- [PASS] MP-7: `grep -rc '\[NEEDS CLARIFICATION' .moai/specs/SPEC-E2ESCEN-001/` → 다섯 파일 합 0. 운영자 결정 «CI 포함 안 함» 이 `plan.md:169`(«운영자 결정 2026-09-08 — 이 SPEC 은 ci.yml 을 손대지 않는다») 와 `spec.md:159`(§5 «운영자 결정(2026-09-08)으로 이 SPEC 은 포함하지 않는다») 에 기록됨. `spec.md:45`·`:214`·`plan.md:205` 의 «OD-6 미결» 은 ROADMAP 행이 열려 있다는 뜻이라 모순 아님.

## Regression Check — 1회차 결함 D1~D13

| # | 판정 | 증거 |
|---|------|------|
| D1 | RESOLVED | `spec.md:15` 에 `related_specs` 없음; `:213` 대체 문장 |
| D2 | RESOLVED | 표지 0건; `plan.md:169`·`spec.md:159` 결정문 |
| D3 | RESOLVED(조건부 — R2-1 참조) | `acceptance.md:159` «밀린 수 480 … `limit: 500` … 첫 응답 480·둘째 0» ; `plan.md:31`·`spec.md:119` 같은 문장. `gateway.ts:274` 최신 500 ⊇ 밀린 480 이라 빠짐 0 이 코드와 일치 |
| D4 | RESOLVED(새 어긋남 R2-1·R2-2 발생) | `:152` «id 열이 기대 집합과 같다(JSON.stringify 대조)», 각 항목 정확한 길이 |
| D5 | RESOLVED | `:168` R1·`nB ≥ 1`(4 예상)·삭제 뒤 «(삭제된 봇)» 정확히 nB·B 0·A 이력 같은 수; `spec.md:122`·`:198` 일치 |
| D6 | RESOLVED(새 문제 R2-3) | `:224-229` `BASE=66267ca`, `.moai/reports/**` 허용; `spec.md:203`·`plan.md:162`·`:260` 일치 |
| D7 | RESOLVED | `:147` «채운 뒤에» · `:158` `limit:500` |
| D8 | RESOLVED | `research.md:117` «tsc 는 include 를 뿌리로 import 를 따라가므로 … strict 로 검사» + 탐침 인용; `acceptance.md:251` |
| D9 | RESOLVED | `spec.md:194` = `acceptance.md:31` = `plan.md:89` 한 문장 |
| D10 | RESOLVED | `spec.md:212`·`research.md:31` 620행 + 앵커 |
| D11 | RESOLVED | `acceptance.md:87` `timeout 25 node -e … &` |
| D12 | RESOLVED | `:199-206` (2a) 날것 `setTimeout` 0 · (2b) 도우미/`withDeadline` 밖 `await` 0 · (5) `spawnChannel` 위치로 가름; `plan.md:95`·`:150` 에 두 도우미 정의 |
| D13 | RESOLVED | `:190` (c) `awk '/function observe\(/,/^}/' … grep -c 'assert(\|fail('` → 0; `spec.md:200` |

미해결 없음. 정체 결함 없음.

## Category Scores (2회차)

| Dimension | Score | Rubric Band | Evidence |
|-----------|-------|-------------|----------|
| Clarity | 0.75 | 0.75 | 남은 흐림 하나: «기준 집합» 을 «채우기 직후» 받는다(`acceptance.md:147`)와 «채운 뒤에 사람 글 하나 더»(같은 줄) 의 선후가 안 정해져 (ㄴ) 의 수가 한 칸 움직인다(R2-1) |
| Completeness | 1.00 | 1.0 | 변화 없음; HISTORY 0.2.0 행이 교정 근거를 적음(`spec.md:25`) |
| Testability | 0.75 | 0.75 | 15 중 13 은 명령+정수로 이분·판별력 있음. AC-008 (ㄴ) 의 상수 둘(`speaker:'A'` 500, `since/until` «1 이상»)과 AC-014 의 낡은 기준 SHA 가 올바른 구현을 붉게 만든다(R2-1~R2-3). 1회차의 공허·모순 부류는 사라짐 |
| Traceability | 1.00 | 1.0 | 16/16·15/15, 매트릭스 셋(`spec.md:190-204`·`acceptance.md:27-41`·`plan.md` §C 완료 기준) 일치 |

조화평균 = 4 / (1/0.75 + 1 + 1/0.75 + 1) = 4 / 4.667 = **0.857** ≥ 0.80.

## 위임 검사 항목

- **AC-008 (ㄴ) `since/until` T1 == T2 위험**: 처리되지 않았다. `acceptance.md:154` 는 T1 = 기준 집합 첫 원소·T2 = 마지막 원소의 `created_at` 으로 두고 «길이 … 1 이상» 을 요구한다. `created_at` 은 초 단위(`db.ts:48` `datetime('now')`)이고 채우기 520 건은 WebSocket + SQLite INSERT 라 한 초 안에 끝날 수 있어 T1 == T2 → `[T1, T2)` 공집합 → 기준 집합에서 센 값 0 = 응답 0 은 맞지만 «1 이상» 이 거짓. 엣지 표(`:244`)는 «같은 초의 글이 여럿» 만 다루고 «구간이 빈다» 는 다루지 않는다. → R2-2.
- **480 걸음 vs `limit: 500` vs `gateway.ts:271-277`**: 일치한다 — `:274` 가 최신 500 을 먼저 자르고 `:277` 이 `id > since_id` 를 거르므로, 밀린 480 이 최신 500 안에 전부 들어 있으면 첫 응답 480·둘째 0. 단, «기준 집합» 이 마지막 사람 글 **뒤** 에 받은 것일 때만 «뒤에서 481번째» 가 밀린 480 을 만든다(앞에 받으면 481). → R2-1 의 시점 고정으로 함께 닫힌다.
- **AC-009 (ㄴ)·AC-011 (c)·AC-012 (2)(5)·AC-014**: 판별력 있음(위 표). AC-014 만 기준 SHA 가 이미 낡음(R2-3).

## Defects Found (2회차)

R2-1. AC-008(ㄴ)-INTERNAL-INCONSISTENCY — `acceptance.md:147,153,155,158` — (ㄷ)·`limit: 3`·`limit: 9999` 는 «마지막 사람 글이 가장 새로운 500 안» 을 전제하는데 `speaker: 'A'` 는 «길이 정확히 500(가장 새로운 500 개는 전부 A 의 채우기 글)» — 사람 글이 안에 있으면 499 다. 또 «기준 집합(채우기 직후)» 과 «채운 뒤 사람 글» 의 선후가 없어, 사람 글 전에 받았다면 `since_id` 기대 10 은 실제 11, 480 걸음은 481 이 된다 — Severity: major — Class: blocking — Required fix: `:147` 을 «기준 집합은 **마지막 사람 글까지 보낸 뒤** 받은 `history_request{limit:500}` 응답(가장 새로운 500 = 채우기 뒤 499 + 사람 글 1)» 로 고정하고, `:155` 를 «`speaker: 'A'` → 길이 정확히 499» 로 고친다.

R2-2. AC-008(ㄴ)-EMPTY-INTERVAL — `acceptance.md:154` — T1 == T2 이면 «1 이상» 이 올바른 서버에서 거짓 — Severity: major — Class: blocking — Required fix(하나 택일): (a) 러너가 채우기 마지막 글과 마지막 사람 글 사이에 초 경계를 넘기게 한다 — `pollUntil` 로 `Date.now()` 의 초가 채우기 마지막 글의 `created_at` 초를 넘을 때까지 기다린 뒤(상한 1,100 ms, 시한 있는 대기) 사람 글을 보내고, `until` = 마지막 사람 글의 `created_at` 으로 두면 기대 = 채우기 499 건 전부, 길이 정확히 499 로 상수화된다; (b) «1 이상» 을 지우고 «기준 집합에서 센 값과 같다(0 일 수 있다)» 만 남긴다 — 이 경우 판별력이 줄어드니 (a) 를 권한다.

R2-3. AC-014-BASE-ALREADY-STALE — `acceptance.md:224,229,260`, `spec.md:203`, `plan.md:162` — 기준 `66267ca` 는 SPEC 작성 시점 HEAD 인데 나무는 이미 `d98ad7b` 로 움직였다: `git diff --name-only 66267ca HEAD` → `README.md`(허용 목록 밖) — 구현 한 줄 없이 (2) 가 붉다. run 착수가 더 늦어지면 더 벌어진다 — Severity: major — Class: blocking — Required fix: `progress.md` 에 `run_base_sha`(run 착수 시점 `git rev-parse --short HEAD`, manager-develop 이 첫 커밋 전에 기록) 행을 두고 AC-014·DoD·plan §D 가 그 값을 읽게 한다(«`BASE=$(grep run_base_sha progress.md …)`»); `spec_base_sha` 는 인용 행 번호의 기준으로만 남긴다.

R2-4. AC-012(2b)-AWAIT-FORM — `acceptance.md:200` — `'^\s*await '` 는 `const m = await …`·`return await …` 형태를 못 잡아 시한 없는 대기가 그 형태로 있으면 통과 — Severity: minor — Class: optional — Required fix: 패턴을 `'\bawait '` 로 넓히고 제외 목록은 그대로.

## Recommendation

1. R2-1·R2-2: `acceptance.md:147,154,155` 세 줄 — 기준 집합 시점 고정, `speaker:'A'` 499, `since/until` 을 초 경계 보장 + 499 상수로.
2. R2-3: `progress.md` 에 `run_base_sha` 행 신설, `acceptance.md:224`·`:260`·`spec.md:203`·`plan.md:162` 가 그것을 읽도록.
3. R2-4 는 선택.
4. 3회차는 위 넷의 델타만 본다. 그 뒤 Kickoff — 열린 표지 없음.

미검증(Gaps, 1회차와 같음): `npm test` 기준선 210 미실행; `?after=abc` NaN 바인딩 미실행; 520 건 채우기의 실제 소요(초 경계 넘김 여부)는 실측 없음 — R2-2 가 그 불확실성을 없애는 처방이다.
