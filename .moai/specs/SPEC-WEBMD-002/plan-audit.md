# SPEC-WEBMD-002 감사 보고 (plan-audit)

- 감사자: plan-auditor (단일 패스 · Tier S — PASS 면 확정)
- 대상: `.moai/specs/SPEC-WEBMD-002/` (spec.md · plan.md · progress.md §E.1)
- 날짜: 2026-09-11
- 판정: **PASS** — 조화평균 **0.9231** (Tier S 통과선 0.75)

근거 요약: 필수 통과 일곱 전부 통과. SPEC 이 주장한 실측 전부 이 감사에서 재실행해 재현했다(DB 5개 수치 · 정규식 · CSS 규칙 · export 다섯 · 기존 시험 17개 초록). 차단 결함 0건, 비차단 2건(F-1 diff 기준선 미명시 · F-2 타임아웃 수치 무근거).

## 필수 통과 (Must-Pass)

| 항목 | 판정 | 근거 |
|------|------|------|
| MP-1 REQ 번호 일관성 | PASS | `REQ-WEBMD2-001`~`008` 순차·무공백·무중복 (spec.md §3.1; grep uniq -c로 각 1회 정의, 나머지는 교차 참조) |
| MP-2 GEARS 형식 | PASS | 8요구 전부 형식 부합 — When 5개(001·002·005·008 + 007의 조건 서술), Ubiquitous 3개(003·006·007), Unwanted 1개(004 «~해서는 안 된다»). 판정 대상은 요구 계층만 — §3.2의 Given-When-Then은 Tier S 수용 기준의 올바른 형식이며 감점하지 않는다 |
| MP-3 frontmatter | PASS | 12 정규 필드 전부 존재·타입 올바름(spec.md:1-17). `phase: "v2.2.0 target"` 은 릴리스 라벨(plan/run/sync/mx 아님). `tier: S` 명시. snake_case 별칭 없음 |
| MP-4 언어 중립성 | N/A | 단일 표면(바닐라 JS 웹) SPEC — 다중 언어 도구 나열 아님. 자동 통과 |
| MP-5 D7 교차 SPEC | PASS | 참조 3종 전부 실재·전부 `completed`(retired/superseded/archived 아님): SPEC-WEBMD-001 · SPEC-WEBACNAV-001 · SPEC-MENTION-001. depends_on 2종도 전부 completed. 누락 참조 0건 → BLOCKING 없음 |
| MP-6 D8 syscall | PASS | `syscall` 등장 0건(spec.md·plan.md grep -c = 0, 0) → 자동 통과 |
| MP-7 clarification gate | PASS | plan.md에 `[NEEDS CLARIFICATION]` 0건. research.md 부재는 Tier S 설계상 정상(기입 계약: spec.md+plan.md) |

## 차원 점수 (비가중 조화평균)

| 차원 | 점수 | 근거 |
|------|------|------|
| Clarity | 1.0 | 8요구 각각 한 가지 해석. 자격 문법이 정규식 축자로 못박힘(REQ-003 = mention.ts:3 `MENTION_RE`). §2 용어표, §1.1 판단 근거가 전부 실측 인용 |
| Completeness | 1.0 | HISTORY(0.1.0) · 배경/목적(§1) · 용어(§2) · 요구(§3.1) · 수용기준(§3.2) · 범위 밖 H3 셋(§4 — 각 `-` 불릿 다수) · 제약(§5) · 참조(§6). Tier S 산출물 집합 정확(2 + progress 기록). REQ 8/AC 8 = Tier S 상한 내 |
| Testability | 0.75 | AC 8개 중 6개는 완전 이분 판정. AC-007의 «git diff 0줄»(및 AC-006의 «변경 전과 동일»)이 diff 기준선(ref)을 명시하지 않아 해석 여지 1건 — 측정은 가능하나 약한 판정 수단(F-1) |
| Traceability | 1.0 | 8↔8 완전 대응·고아 없음: REQ-001(AC-001·005) 002(AC-002) 003(AC-002·003·005) 004(AC-004) 005(AC-003) 006(AC-006) 007(AC-007) 008(AC-008). 모든 AC가 실재 REQ를 가리킴 |

조화평균 = 4 / (1/1.0 + 1/1.0 + 1/0.75 + 1/1.0) = **0.9231**

## 운영자 지적 5건 판정

1. **D1 범위 상향 — 타당**. `server/src/mention.ts`:3 재확인: `MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g`, `parseMentions` 가 원문 전역 `matchAll` — 위치 제한 없음. DB 수치 재실행으로 전부 재현: `@TO(` 시작 128 · 포함 133 · `@CC(` 0건 · 줄 시작 미닫힘 0건; 차이 5건의 분해도 재현(나중 줄 시작 3건 id 2·8·13, 문장 중간·표 2건 id 7·15). 줄 시작 한정이면 실제 라우팅되는 id 7·15 토큰이 배지 없이 남는다. «서버 문법과 동일(코드 표면 제외)» 이 라우팅 진실에 가장 가까운 표시 규칙이고, 잔여 괴리 한 곳(코드 표면)은 REQ-004 가 알려진 괴리로 명시·AC-004 가 봉쇄한다.
2. **`WEBMD2` 접두 — 정당**. SPEC-WEBMD-001 이 `REQ-WEBMD-001`~`015` 를 소유(15개 전수 확인)하고 공유 시험 파일에 이미 `AC-WEBMD-001`~`016` describe 가 있으므로 무접두 001~008 은 실제로 충돌한다. 접두는 이 SPEC 의 REQ 8·AC 8·plan 마일스톤 전부에서 일관 사용; 형제 계약 인용(WEBMD-001 의 REQ/AC)은 무접두로 정확히 구분.
3. **REQ-WEBMD-010 예외 개방 — 올바름**. 평문 항등 조항이 WEBMD-001 REQ-WEBMD-010 불릿에 축자 존재(«마크다운 마커가 없는 한 줄 입력에 대해 `renderMarkdown(src).textContent === src`»). `git status`/`git diff`/`git diff --cached` — SPEC-WEBMD-001 파일 무변경(미커밋·스테이징 0줄). HISTORY 한 줄이 예외와 «형제 무수정» 이유를 모두 기록 — completed-spec-semantics 관례(«A replacement is recorded as ONE HISTORY line in the new SPEC»)와 정확히 일치.
4. **코드 표면 괴리(REQ-004) — 은폐 없음**. REQ-004 가 괴리를 사실로 기록한다(«서버는 원문을 파싱하므로 코드 표면의 토큰도 라우팅되지만 표시는 배지를 붙이지 않는다»). AC-004 가 코드스팬 리터럴(`@TO(b) 예시` 축자)과 `pre` 내 `.md-mention` 부재를 강제 — 배지화 거부 기준 존재. 구조적 근거도 실측 확인: renderInline 의 코드스팬 분기가 스캔 최선두(markdown.js:390), 펜스는 `buildFence` 가 textContent 직행(:306)이라 renderInline 을 지나지 않는다.
5. **AC-007 diff 수단 — 실행 가능하나 미명시**. §E 명령(`git diff --stat -- web/app.js …`)은 실행되어 줄 수를 돌려주지만 기준선 ref 가 없다 — working-tree 대 HEAD 비교라, PRESERVE 파일을 «커밋한» 위반은 초록으로 통과한다(미커밋 위반만 잡음). §C 사전 점검이 시작 HEAD 를 기록하므로 정확 판정이 한 줄로 가능한데 §E 가 그것을 소비하지 않는다(F-1).

## 이 감사의 재실행 증거 (VCI §2 귀속)

- `sqlite3 -readonly server/data/minidiscord.db "SELECT COUNT(*) …"`: 시작 128 / 포함 133 / `@CC(` 0 / 시작 `@CC(` 0 — GLOB 대소문자 구분(문법 = 대문자)로 SPEC §1.1 표와 전건 일치. 차이 5건 본문 반출·분해 일치. AC-005 픽스처 «…(3/4)\n@TO(reporter) 너만 남았다» 가 id 8 실데이터 축자.
- `server/src/mention.ts` 열람: 3행 정규식 SPEC 인용과 축자 동일.
- `web/style.css`: `.ac-kind`(421) · `.ac-kind.to`(432) · `.ac-kind.cc`(438) 세 규칙 — REQ-006 색 토큰 대응과 축자 동일. `md-mention` 등장 0건(markdown.js·style.css) — §C 중복 구현 부재 주장의 현재 시점 재현.
- `grep -c '^export function' web/markdown.js` = 5 — export 다섯(REQ-WEBMD2-007). `web/app.js`:576 `body.appendChild(renderMarkdown(raw, document))` — D2 호출부 주장 축자 동일.
- `npx vitest run server/test/web-markdown.test.ts` → **Test Files 1 passed · Tests 17 passed** (이 감사 실행, 708ms) — §C «기존 블록 전부 녹색» 전제의 실측. 기존 픽스처에 `@TO(`/`@CC(` 0건(grep) — B-4 주장 재현.

## 결함 목록

- **F-1** — spec.md §3.2 AC-006·AC-007 / plan.md §E — diff 판정의 기준선 미명시: «git diff 0줄»·«변경 전과 동일» 은 ref 없는 working-tree diff 로 관측하도록 되어 있어, PRESERVE 파일·`.ac-kind` 블록을 «커밋한» 수정은 전건 초록으로 통과한다. 심각도: minor — 분류: optional (2차 방어망 존재: REQ-007 export 다섯 + AC-WEBMD-015 typecheck + 기존 16 describe 초록이 같은 위반 부류의 대부분을 따로 잡음; 형제 SPEC-WEBMD-001 AC-016 도 같은 형식으로 감사를 통과한 가족 관례). 수리: §C 사전 점검이 남기는 시작 HEAD 를 §E 가 소비하게 한다 — `git log --oneline <사전점검 HEAD>..HEAD -- web/app.js web/rich.js web/markdown.d.ts server/src` 공백(또는 `git diff <시작 HEAD>..HEAD -- …` 0줄)으로 기준선을 못박는다.
- **F-2** — spec.md §3.2 AC-008 — «러너 타임아웃(20초 — AC-WEBMD-013 관례)» 의 20초에 근거지 없음: WEBMD-001 acceptance.md:64 의 관례는 «판정자는 러너 타임아웃» 이고 숫자가 없으며, 저장소에 vitest 설정 파일·testTimeout 이 없어 실효 기본값은 20초가 아니다. 기준 자체는 이분 판정으로 살아 있다(러너 타임아웃이 종료를 판정). 심각도: minor — 분류: optional. 수리: 새 describe 에 `it(..., { timeout: 20_000 })` 를 명시하고 그것을 인용하거나, 숫자를 빼고 «러너 타임아웃» 만 쓴다.

## 규모·예산 검토 (Tier S)

- REQ 8 / AC 8 — 상한(8/8) 이내. 산출물 {spec.md, plan.md} + progress 기록 — 정확. 변경 파일 3개(< 5). spec.md 166행 — 8요구+8기준 인라인 대비 적정. 구현 규모(렌더 분기 + CSS 블록 + 시험)는 < 300 LOC 관측 범위. Tier S 분류에 과소·과대 없음.

## 권고

PASS 이므로 다음 단계(Implementation Kickoff Approval 게이트)로 진행 가능하다. F-1·F-2 는 모두 optional — 실행 단계에서 §E 명령 한 줄과 AC-008 수식어 한 줄로 닫을 수 있고, 판정을 되돌릴 만한 성질이 아니다.

**PASS**

---

# 부록 — 재실행 #2 (델타 범위 재감사, 2026-09-11)

운영자 조정자 통보: 저자가 F-1·F-2 를 반영해 산출물이 바뀜(AC-006·007·008 및 plan.md §C). 런 게이트 계약상 해시 변화는 감사 재실행 1회를 요구 — 델타 범위로 재감사하고 판정 권한은 감사관에게 있다.

- 판정: **PASS** — 조화평균 **1.0** (Tier S 통과선 0.75)
- 이전 대비: 0.9231 → 1.0 (상승; STOP 신호 없음)

## 델타 검증

### F-1 — 해결 (RESOLVED)

- **AC-006 (spec.md:123)**: `.ac-kind` 세 규칙 비교가 «변경 전과 동일» 의 문구 대신 `git show <plan.md §C 에 기록한 pre-flight HEAD>:web/style.css` 에서 뽑은 규칙과의 글자 단위 비교로 못박혔다. 커밋된 위반·작업 나무 위반이 모두 잡힌다.
- **AC-007 (spec.md:126)**: 3부 구조로 교체 — (1) `git log --oneline <§C 의 pre-flight HEAD>..HEAD -- web/app.js web/rich.js web/markdown.d.ts server/src` 출력 없음(커밋된 PRESERVE 위반 봉쇄), (2) 작업 나무 `git diff --stat` 0줄(미커밋 위반 봉쇄), (3) 시험 파일 `git diff <§C 의 pre-flight HEAD> --` 추가 라인만(제거·변경 0줄 — 기존 describe 무수정; 수정은 -/+ 쌍이므로 «제거 0줄» 이 단언 변경을 잡는다).
- **plan.md §C (56-65행)**: 기준선 명명 절이 신설 — «첫 줄이 찍는 SHA 가 pre-flight HEAD — AC-WEBMD2-006·007 의 모든 diff/show 비교가 도는 기준선» + `git rev-parse HEAD` 줄에 기록 주석. §E 보고에 SHA 를 그대로 인용하라는 VCI 귀속 지시도 있다.
- **기준선 결속 검증**: 플레이스홀더는 매달려 있지 않다 — 값이 §C 첫 명령의 출력으로 확정되고(구현 첫 커밋 전에 고정), §C 가 그 산출·기록 절차를 정의한다. AC 문구의 «§C 에 기록한» 과 §C 스스로의 기록지 «§E» 사이에 표현상 흔들림이 있으나 두 독해 모두 대체할 SHA 값은 동일하므로(§C 첫 줄 출력) 치환에는 모호함이 없다. 잔여 관찰(optional, 재작업 불요): 다음 개정에서 «§C 가 정하고 §E 에 기록하는 pre-flight HEAD» 로 한 표현으로 모으면 된다.
- **명령 형식 실측** (이 재감사 실행, 기준 cf946830a03b0341385128f7211430d9f0872c97): `git show <SHA>:web/style.css | grep -c '^\.ac-kind'` → **3** (기준선에서 세 규칙 추출 성공); `git log --oneline <SHA>..HEAD -- <PRESERVE 4종+server/src>` → **0줄**; `git diff <SHA> --stat -- server/test/web-markdown.test.ts` → **0줄**. 세 형식 전부 실행 가능.

### F-2 — 해결 (RESOLVED)

- **AC-008 (spec.md:129)**: 타임아웃이 산문 수치에서 시험 자체의 `it` 옵션 `{ timeout: 20_000 }` 으로 자가 무장했다 — 수치가 선언이 아니라 실행 장치가 됐다.
- **선례 인용 실측**: `AC-WEBMD-013` 의 `}, 20_000)` 형식이 실재한다 — `server/test/web-markdown.test.ts`:171 (AC-WEBMD-013 describe 블록 안, «이 값이 「유한 시간」의 판정자다» 주석과 함께). 인용은 사실로 확인.
- **감사관 자기 정정**: 1회차 F-2 에서 «저장소에 20초 근거지가 없다» 라고 적었으나, 근거지는 `it` 옵션 수준에 존재했고 1회차 grep 패턴(`20000`)이 밑줄 형식 `20_000` 을 놓쳤다. 지적의 실질(산문 수치 «20초 — AC-WEBMD-013 관례» 가 acceptance.md 관례 문구를 가리키고 거기엔 숫자가 없음)은 유효했지만, 보고의 근거지 부재 서술은 과도했다. 수정본은 이보다 낫다 — 근거지를 코드에서 인용하고 AC 안에서 자가 무장한다.

### 무변경 확인 (요청 항목 3)

전문 대조(1회차 감사 시독 사본 대비)로 확인: REQ 8개·AC 8개 그대로, REQ-WEBMD2-001~008 본문·HISTORY 0.1.0 행·frontmatter 12필드(+tier·depends_on·related_specs) 전부 축자 동일. 바뀐 것은 AC-006·007·008 세 문단과 plan.md §C 절뿐. MP-1·MP-2·MP-3 는 델타가 건드리지 않는 표면이라 1회차 판정이 그대로 유효하고, MP-4~7 도 새 참조·syscall·표지가 없어 변함없다.

## 재채점 (접촉 절만)

| 차원 | 1회차 | 2회차 | 근거 |
|------|-------|-------|------|
| Clarity | 1.0 | 1.0 | 새 AC 문단 단일 해석(기준선 SHA 치환은 두 독해가 같은 값) |
| Completeness | 1.0 | 1.0 | 구조 불변, 델타는 두 결함 치료로 국한 |
| Testability | 0.75 | **1.0** | F-1·F-2 로 «기준선 미명시»·«수치 무근거» 해소 — 8개 AC 전부 명명된 기준선으로 이분 판정 |
| Traceability | 1.0 | 1.0 | AC-006→REQ-006 · 007→REQ-007 · 008→REQ-008 대응 불변, 8↔8 |

조화평균 = 4 / (1+1+1+1) = **1.0** (통과선 0.75 초과, 이전 회차 0.9231 대비 상승 — STOP 조건 없음)

## 잔여

- 잔여 결함 없음. 관찰 1건(optional): AC-006·007 의 «§C 에 기록한» 표현과 §C 의 기록지 §E 를 한 표현으로 통일하면 더 정확하나, SHA 값 귀속에는 영향이 없어 재작업을 요구하지 않는다.

**PASS**
