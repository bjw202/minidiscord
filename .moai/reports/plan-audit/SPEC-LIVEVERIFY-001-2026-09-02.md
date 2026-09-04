# SPEC-LIVEVERIFY-001 — Run-gate Plan-audit 재실행 (게이트 라운드)

- **성격**: run 게이트 Phase 1 재실행이다. 계획 단계 6차 대립 감사가 **아니다**. 계획 루프는 5회차 판정(PASS 0.837, `plan-audit-5.md`)으로 닫혔고, 그 뒤 종결 편집(v0.7.0)이 착지해 아티팩트 해시가 바뀌어 건너뛰기 계약 조건 3이 깨졌기 때문에 게이트가 기계적으로 재실행됐다.
- **기준선**: `plan-audit-5.md` (5회차, PASS 0.837). 이번 라운드의 공격 노력은 그 판정 이후의 변화분(델타)에 집중했다 — (a) 종결 편집이 주장한 수리가 실제로 착지했는가, (b) 편집이 새 결함을 만들었는가, (c) 5회차 판정이 의지한 것의 의미가 바뀌었는가.
- **맥락 격리(M1)**: 저작자의 추론 맥락은 무시했다. 아티팩트 넷(spec.md · plan.md · acceptance.md · progress.md §E.1)과 5회차 보고서만 읽었다. 이 보고서가 인용하는 모든 명령은 **이 세션에서 직접 실행했고** 출력을 그대로 옮겼다.

## 판정

- **판정: PASS**
- **총점: 0.837** / **통과선 0.80 (Tier M)**
- **통과선 출처(직접 도출)**: `.claude/rules/moai/workflow/spec-workflow.md` § SPEC Complexity Tier 표 — Tier M 행의 plan-auditor PASS threshold = `0.80`. Tier 는 `spec.md` 프런트매터 `tier: M` 에서 직접 읽었다(spec.md:14). 디스패치가 전한 값이 아니라 SSOT 에서 읽어 도출했다.

## baseline 귀속

- 트리: 워크트리 `.claude/worktrees/t32`, HEAD `23624e0`, 브랜치 `WT-m6-real-session` (실행: `git rev-parse --short HEAD` → `23624e0`, `git branch --show-current` → `WT-m6-real-session`).
- SPEC 산출물 넷은 전부 커밋 상태다 (실행: `git status --short -- .moai/specs/SPEC-LIVEVERIFY-001/` → `?? .moai/specs/SPEC-LIVEVERIFY-001/.claude/` 한 줄뿐 — 세션 디렉터리이며 산출물 아님).
- plan.md 의 git 이력은 단일 커밋 `23624e0` (실행: `git log --oneline -- .moai/specs/SPEC-LIVEVERIFY-001/plan.md` → 한 줄). 계획 단계 반복(v0.1.0→v0.7.0)은 커밋으로 남지 않았다.

## Must-pass 결과 (7/7 — N/A 1 포함)

| 게이트 | 판정 | 근거 (이 세션 실행 출력) |
|---|---|---|
| MP-1 REQ 번호 정합 | **PASS** | `grep -o 'REQ-LIVEVERIFY-[0-9]*' spec.md \| sort -u` → `REQ-LIVEVERIFY-001`~`016` 연속 16건, 결번·중복·자릿수 어긋남 0. `grep -o '^### AC-LIVEVERIFY-[0-9]*' acceptance.md \| sort -u` → `001`~`016` 연속 16건 |
| MP-2 GEARS (요구사항 층) | **PASS** | 판정 층은 `spec.md` REQ-XXX 전수(16건 직독): REQ-001~012 `**When**`/`**While**`(부정형 셋은 GEARS 부정 «않는다» 겹침), REQ-013·015·016 은 주어 명시 ubiquitous. REQ-014 는 주어 생략의 관용형(«같은 배치 주장이 … 표로 남긴다») — 16건 중 1건의 관용형 생략으로 1.0/0.75 밴드 경계이나 비공식 문언이 아니고 5회차와 같은 텍스트라 판정 변경 근거 없음(비차단 관찰로 기록). `acceptance.md` 의 Given-When-Then 은 검증 층이라 이 게이트로 재지 않았다 |
| MP-3 프런트매터 | **PASS** | `sed -n '2,16p' spec.md \| cut -d: -f1` → `id title version status created updated author priority phase module lifecycle tags` 12/12 + 선택 `tier depends_on related_specs`. `version: "0.7.0"` 따옴표 semver · `status: draft` · 날짜 둘 다 `2026-09-02`. 거부 별칭(`created_at` 등) 프런트매터 내 0건 — 본문 spec.md:140 의 `created_at` 적중은 웹 화면이 그리는 DB 컬럼 서술이지 프런트매터가 아니다 |
| MP-4 언어 중립 | **N/A** | 단일 언어(TypeScript/Node) 단일 저장소 범위. 다언어 도구 열거 없음 → 자동 통과 |
| MP-5 D7 교차 SPEC | **PASS** | 본문 참조 형제 9건 전부 `.moai/specs/<ID>/spec.md` 실재. `status` 실측: E2E-001·BOTSTAB-001·CHANWIRE-001·GWAUTH-002·WEBCHAT-001·PERM-001·ROOMAUTHZ-001·CHANPERM-001 = `completed`, CHANINJECT-001 = `in-progress`. `retired`/`superseded`/`archived` 0건 → BLOCKING 없음 |
| MP-6 D8 크로스플랫폼 | **PASS** | `grep -c 'syscall' spec.md plan.md acceptance.md` → 세 파일 모두 `0`. 자동 통과 |
| MP-7 명료화 게이트 | **PASS** | `grep -rn 'NEEDS CLARIFICATION' spec.md plan.md acceptance.md progress.md` → 0건. `grep -rn '\[미결\]' spec.md plan.md acceptance.md` → 0건. `research.md` 는 Tier M 산출물이 아니라 부재 (게이트 규약의 N/A 선례 적용). `plan.md` §A 머리의 «미결 0건» 선언과 일치 |

## 축별 점수 (조화평균, 5회차와 동일 산식)

| 축 | 점수 | 밴드 | 5회차 대비 | 근거 |
|---|---|---|---|---|
| 명료성 | 0.75 | 0.75 | 유지 | 5회차 감점 셋 중 둘이 실제로 닫혔다 — F-C1(spec §7 폐기 술어)과 O-C1(죽은 awk 줄). 남은 감점: O-C2(㉣-a 모집단만 자름에 묶여 있음 — closure 셋에 없었고 여전히 열려 있음, acceptance.md:290·301)와 이번 라운드 신규 소견 O-RG-1(DoD 1 문언이 두 면 규칙 이전 형태 — 아래 결함 목록). 둘 다 «엔지니어가 일관되게 해석» 가능한 크기라 밴드 유지 |
| 완전성 | 1.00 | 1.0 | 유지 | HISTORY·§1~§8 전건 존재. `grep -c '^### Out of Scope' spec.md` → `5`, 각 H3 이 구체 `-` 불릿을 갖는다(직독). 프런트매터 12/12. 면 2 운반체 미명명(O-RG-2)은 §3.1 표의 열거 성질을 한 조각 갉지만 절의 부재·빈약은 아님 |
| 검증가능성 | 0.75 | 0.75 | 유지 (질 개선) | O-C6 로 AC-001 ㉣ 의 미관측 교착이 실제로 풀렸다 — 면 2(세션 대화 기록)가 서면 «두 면이 모두 불가능할 때만 미관측»(acceptance.md:108)이고 육안 구분 미확정이 더 이상 판정을 막지 않는다(:149). 남은 감점은 성질이 같다 — 세 기준의 분류 판단 + run 위임 확인 항목(MCP 타입 :106, (ㄱ)~(ㄷ) :107)이 공시된 채 열려 있음 |
| 추적성 | 0.90 | 0.75 밴드 (+0.15) | 유지 | REQ 16 ↔ AC 16 1:1 — 수용 기준 표(acceptance.md:56-71)와 §3.1 증거 표(spec.md:102-118)를 직독 대조, 부속 파일 표기까지 일치. O-C9(위협 표의 줄 번호·앵커 혼용, acceptance.md:120-122) 여전 — 5회차가 실측으로 «세 줄 번호 전부 정확» 판정한 바 있어 감점 아닌 밴드 내 잔여 |

**총점** = 4 ÷ (1/0.75 + 1/1.00 + 1/0.75 + 1/0.90) = 4 ÷ 4.77778 = **0.837** ≥ 0.80 (Tier M).

점수 회귀 없음 (0.837 → 0.837). STOP 조항 불성립.

## 델타 판정 — v0.7.0 종결 편집 6자리 전건 실측

| 편집 | 주장된 자리 | 실측 | 판정 |
|---|---|---|---|
| **F-C1** | `spec.md` §7 의 폐기 술어 → 현행 술어 | spec.md:303 직독: «㉣ **세션이 지어낸 값**이 방 답변과 그 세션의 **`reply` 호출 인자** 양쪽에서 읽힘(**생산**) — 도구 **결과**와 **알림**에 나타난 것은 세지 않는다(§3.4)» — plan.md:208 (R-8) 문언과 일치. **잔존 훑기(어간 기준)**: `grep -n '터미널 양쪽\|방 답변과 터미널' spec.md plan.md acceptance.md progress.md` → 적중 1건뿐, `spec.md:25` (HISTORY 0.7.0 행 — 수리 내용을 적는 «그때 기록», 프로젝트 규약상 옳음). **본문 잔존 0건** | **닫힘, 재현 없음** |
| **F-C2** | `plan.md` M1 첫 단계에 빌드 편입 | plan.md:163: «**[HARD] 첫 단계는 `npm run build -w channel` 이다.**» (직독). 참조하는 acceptance.md:46 §C 하네스 [HARD] 실재 | **닫힘** |
| **O-C6** | ㉣ 인정 증거 면을 둘로 | acceptance.md:103-108 직독 — 면 1(화면 캡처)/면 2(세션 대화 기록 발췌), «어느 하나로 이 항이 선다», MCP 타입 비단정 [HARD](:106), «면 2 가 성립하면 이 항은 선다» [HARD](:108). 잔여 3번 항도 갱신(:149) | **닫힘 — 단, 파생 소견 둘 (O-RG-1·O-RG-2, 비차단)** |
| **O-C5** | 되뇜 잔여를 넷째 항으로 | acceptance.md:150-153 직독 — 경로 서술 + «여전히 서는 것/무너지는 것» 분리 + «공시하고 리드 처분에 맡긴다». progress.md §E.1 공시와 일치 | **닫힘** |
| **O-C1** | 죽은 awk 줄 삭제 | `grep -n 'intro\.txt' acceptance.md` → 0건 (삭제 확인). 남은 `awk … /tmp/sec.txt`(acceptance.md:290)은 바로 다음 줄 grep(:291)이 읽는 **살아 있는** 명령. «㉣-c 덮개는 명령이 아니라 통독이다» 주석(:285)이 대체 서술 | **닫힘** |
| **O-C7** | 표지 대조 절차를 둘 자리에 | `grep -n '세 표지' plan.md acceptance.md` → plan.md:192 (§F M4) + acceptance.md:437 (체크리스트 색인 [HARD]) 양쪽 실재 + DoD 8(acceptance.md:452) «세 개수 전부 … 셋의 합 = 12» | **닫힘** |

**새 결함 여부**: 차단 0건. 비차단 소견 둘이 O-C6 편집의 미완전 전파에서 나왔다(아래 D1·D2). 5회차 판정이 의지한 것(㉯ 경계, 통로 무관성, 16/16 예산, 미관측 처분)의 의미는 변하지 않았다 — REQ/AC 16/16 무변동(위 MP-1 출력), ㉣ 경계 문언은 네 문서에서 한 방향으로 수렴.

**plan.md §A 결정 기록 확인**: A-1 = plan.md:9 «리드 결정 B (확정, 미결 아님)» + progress.md §E.1 «결정 1». A-2 = plan.md §A-2 결정 본문 + progress.md §E.1 «결정 3 — ☑ 표 승인». A-3 = plan.md:75-77 분담 기록 + §A 머리 «미결 0건»(plan.md:7) + 5회차 MP-7 미결 0 판정. 셋 모두 계획 루프의 기록된 종결 상태로 확인 — 새 질문 없음. (관찰: A-3 의 리드 확인이 progress.md 에 별도 행으로 남아 있지는 않다 — §A 머리 선언과 게이트 판정이 이를 운반한다.)

## 결함 목록 (구조화)

차단 결함 없음.

- **D1. O-RG-1** — `acceptance.md:445` (DoD 1) — «AC-001 은 … **`reply` 호출 장면** 넷이 모두 있어야 한다» 문언이 두 면 규칙(acceptance.md:103-108) 이전 형태로 남아 있다. «장면»을 면 1 한정으로 읽으면 «면 2 가 성립하면 이 항은 선다»(:108)와 긴장이 생긴다. — Severity: minor — Class: optional — 방향이 안전하다(더 엄격한 쪽이라 거짓 통과를 만들 수 없고, 면 2 단독 실행을 거짓 실패로 만들 소지). Required fix: DoD 1 의 넷째 항을 «호출 기록(면 1 장면 또는 면 2 발췌 어느 하나)»으로 문언 정렬. 한 줄.
- **D2. O-RG-2** — `spec.md:105`(면 2 발췌)·`acceptance.md:105` — 면 2 산출물(발췌)의 운반체가 §3.1 증거 파일표와 수용 기준 표 어느 쪽에도 명명되어 있지 않다. §3.1 자신이 세운 «고정 파일명이라 디렉터리 목록만으로 드러난다» 근거가 이 한 산출물에만 적용되지 않는다. — Severity: minor — Class: optional — Required fix: 발췌 운반체 이름을 정해 §3.1 A01 행에 부속 파일로 더하거나, «발췌는 A01-liveness 계열 파일 안에 함께 남긴다»고 한 줄 못 박기.
- **D3. O-C2 (5회차에서 이월, 미처분)** — `acceptance.md:290` — ㉣-a 의 모집단만 `/tmp/sec.txt` 자름에 묶여 있고 ㉣-b·㉣-c 는 README 전체다. [HARD] 인용 문구 고정(:308)이 실질 노출을 줄인다. — Severity: minor — Class: optional — 리드 재량.
- **D4. O-C3·O-C4·O-C8·O-C9·O-C10 (5회차에서 이월, 미처분)** — 전부 비차단 소견 그대로 열려 있다. O-C9의 줄 번호 셋은 5회차가 이 트리에서 전부 정확하다고 실측했다. — Class: optional — 리드 재량.
- **D5. 관찰 — REQ-014 주어 생략** — `spec.md:82` — 16건 중 유일하게 주어가 관용 생략형. 비공식 문언은 아니고 5회차와 같은 텍스트라 판정 변경 근거 없음. — Class: optional.
- **D6. 관찰 — HISTORY 0.2.0 의 §A-3 지시** — `spec.md:30` — 체크리스트 결정을 «plan.md §A-3»에 올렸다고 적으나 현행 plan.md 에서 그 결정은 §A-2에 있다. plan.md 이력이 단일 커밋이라 v0.2.0 시점 절 배치를 검증할 길이 없고, HISTORY-true-then 규약(본문은 지금 참, HISTORY 는 그때 참)이 적용되는 영역이다. — Class: optional.

## 회귀 검사 — 5회차 차단 2건

| # | 5회차 결함 | 판정 | 근거 |
|---|---|---|---|
| F-C1 | spec §7 이 폐기 ㉣ 술어를 싣고 있음 [major] | **해소 (회귀 없음)** | spec.md:303 현행 술어 직독 + 어간 훑기 본문 잔존 0건 (위 델타 표) |
| F-C2 | M1 에 빌드 전제 누락 [minor] | **해소 (회귀 없음)** | plan.md:163 [HARD] 첫 단계 직독 |

5회차의 «정체 검사» 결론(AC-001 ㉣ 연쇄 종료)도 유지된다 — 이번 편집은 같은 자리에 새 결함을 만들지 않았고(파생 소견 둘은 문언 정렬 수준), ㉣ 의 판정 경계는 네 문서에서 한 방향이다.

## 내가 재지 못한 것 (Gaps)

이 목록에 있는 것은 이 보고서가 **주장하지 않는** 것이다.

- **`npm test -w channel` 을 돌리지 않았다.** 다섯 라운드와 같은 이유 — 이 감사도 실행하지 않았고, AC-015/016 의 실제 판별력에 대한 실행 관측은 run 단계의 몫이다.
- **§A 열두 항 중 어느 것도 실행하지 않았다.** 실 세션을 띄우지 않았고, 소켓을 둘 붙여 보지도 않았다. 위협 관련 판정은 전부 소스 판독에 의존한 5회차 결과의 인용이지 내 실행이 아니다.
- **변이를 적용하지 않았다.**
- **세션 대화 기록이 MCP 도구 호출(`reply`)을 어떤 타입으로 적는지 재지 못했다** — SPEC 스스로 [HARD] 로 run 첫 실행에 위임한 항목이며(acceptance.md:106), 나도 확인하지 않았다. 내 세션 기록에 `reply` 호출이 없다.
- **README 의 정정 후 상태는 아직 존재하지 않는다** — AC-013/014 의 판정은 전부 plan 단계 문언 검토다.
- **HISTORY 0.2.0 시점의 plan.md §A 절 배치를 검증하지 못했다** — 단일 커밋 이력(위 baseline 귀속).

## 결론

계획 루프의 5회차 PASS 0.837 은 현재 트리에서 유효하다. v0.7.0 종결 편집 여섯 자리는 전부 주장 대로 착지했고, 그중 다섯은 깨끗이 닫혔으며 하나(O-C6)는 두 개의 사소한 문언 정렬 소견을 남겼다 — 둘 다 거짓 통과의 방향이 아니라 거짓 실패·발견성 쪽이고, 비차단이다. 필수 게이트 7/7, 총점 0.837 ≥ 0.80. **run 단계 진입을 승인한다.**
