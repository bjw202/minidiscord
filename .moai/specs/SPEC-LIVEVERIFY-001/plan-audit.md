# SPEC-LIVEVERIFY-001 계획 감사 — 1회차

- **판정: FAIL**
- **총점 0.750** (4개 축의 조화평균)
- **통과선 0.80** — Tier M. 출처: `.claude/rules/moai/workflow/spec-workflow.md` § SPEC Complexity Tier, 표 「plan-auditor PASS threshold」 행 `M (Medium) … 0.80`. 같은 표의 REQ/AC 상한도 여기서 읽었다(Tier M = 16 / 16).
- **Tier 근거**: `spec.md` 프런트매터 `tier: M`. 산출물 3종(spec·plan·acceptance)이 Tier M 규정과 맞는다.
- 감사 대상 트리: `.claude/worktrees/t32`, 브랜치 `WT-m6-real-session`, base `f5cb336`.
- 디스패치가 넘긴 전제·수치는 전부 다시 도출했다. 아래 §5 에 재도출 결과를, §6 에 **내가 재지 못한 것**을 적는다.

---

## 1. Must-pass 결과

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| MP-1 | REQ 번호 일관성 | **PASS** | `grep -o 'REQ-LIVEVERIFY-[0-9]\{3\}' spec.md \| sort -u \| wc -l` → `16`, `grep -c '^- \*\*REQ-LIVEVERIFY-' spec.md` → `16`. `001`~`016` 연속, 결번·중복 0, 세 자리 패딩 일관 |
| MP-2 | GEARS 형식 | **PASS** (요구사항 층에 대해서만 판정) | REQ-001~012 는 `**When**` / `**While**` 절을 명시적으로 단다(예: REQ-003 「**While** 봇이 그 메시지를 처리하는 동안, 그 봇 칩은 `(입력 중…)` 꼬리를 단다」). REQ-013·015·016 은 주어를 가진 ubiquitous 서술(REQ-015 「`fetchHistory` 배선이 지키는 … 순서는 … 회귀 기준을 갖는다」), REQ-016 후반은 unwanted 형(「숫자 리터럴을 테스트에 복제하지 **않는다**」). `acceptance.md` 의 Given-When-Then 은 **검증 층**이므로 이 판정의 대상이 아니다 |
| MP-3 | 프런트매터 | **PASS** | 12 필드 전건 존재·형 일치: `id: SPEC-LIVEVERIFY-001`(정규식 적합)·`title`(따옴표)·`version: "0.1.0"`·`status: draft`(enum)·`created`/`updated: 2026-09-02`(ISO)·`author`·`priority: P1`·`phase: "v0.4.0 target"`(단계명 아님 — 금지값 회피)·`module`·`lifecycle: spec-anchored`·`tags`. snake_case 별칭(`created_at`/`updated_at`/`labels`/`spec_id`) 0건 |
| MP-4 | 언어 중립성 | **N/A** | 단일 프로젝트(TypeScript/Node) 범위. 16개 언어 도구 열거 의무가 걸리는 템플릿 바인드 내용이 아니다 → 자동 통과 |
| MP-5 | D7 교차 SPEC | **PASS** | 본문이 참조하는 SPEC 9건 전부 `.moai/specs/` 에 실재. status 판독: BOTSTAB-001 `completed` · CHANINJECT-001 `in-progress` · CHANPERM-001 `completed` · CHANWIRE-001 `completed` · E2E-001 `completed` · GWAUTH-002 `completed` · PERM-001 `completed` · ROOMAUTHZ-001 `completed` · WEBCHAT-001 `completed`. `retired/superseded/archived` 0건 → BLOCKING 없음 |
| MP-6 | D8 교차 플랫폼 | **PASS** | `grep -c syscall spec.md plan.md acceptance.md` → `0 / 0 / 0`. 해당 사항 없음(자동 통과) |
| MP-7 | 해소 안 된 명료화 표시 | **FAIL** | `grep -rn '\[NEEDS CLARIFICATION' .moai/specs/SPEC-LIVEVERIFY-001/` → `plan.md:11` (`§A-1`) 와 `progress.md:7`. **아래 D1** |

**MP-7 하나만으로 판정은 FAIL 이다** — 이 게이트는 점수와 무관하다. 총점도 통과선 아래이므로 두 축이 독립으로 같은 판정을 낸다.

---

## 2. 축별 점수

| 축 | 점수 | 밴드 | 근거 |
|---|---|---|---|
| 명료성(Clarity) | 0.75 | 0.75 | 관측 대상을 「화면에 보이는 모양」으로 적는 규약(`spec.md` §3.2, 「봇이 접속됨은 관측 대상이 아니다」)이 대부분의 기준에서 지켜진다. 감점은 두 자리 — AC-013 ㉠ 의 「적중 중 **배치 전제를 서술하는 것**이 0건」은 기계 검사 안에 판단을 넣었고, AC-002 의 「그 본문이 앞 문장에 답하는 **자기소개**다」는 미리 정한 문자열이 아니라 판정자의 해석에 걸린다(형제 AC-006·008·009 는 「미리 정한 고유 문자열」을 쓴다 — 같은 문서 안에서 강도가 갈린다) |
| 완전성(Completeness) | 1.00 | 1.0 | HISTORY(§HISTORY 표) · 배경(§1) · 범위(§1.2) · 요구사항(§2) · 수용 기준(`acceptance.md` 표 + GWT 16건) · 범위 밖(§7) 전부 존재. `### Out of Scope — …` H3 가 5개이고 각각 `-` 불릿을 가진다. 프런트매터 12/12 |
| 검증가능성(Testability) | 0.60 | 0.50 밴드 (+0.10) | 0.50 밴드의 정의(「여러 기준이 판단을 요구한다」)에 해당한다 — D4·D5·D6·D7 이 각각 다른 기준을 친다. 다만 **미관측을 통과로 셈하지 않는 규칙**(`acceptance.md` §품질 게이트 「미관측은 통과로 셈하지 않으며 … 「12/12」는 K = 0 일 때만」)과 기준마다 증거 파일·읽어야 할 것을 못 박은 설계는 0.50 밴드의 통상 문서보다 뚜렷이 낫다. 그 차이만큼 +0.10 |
| 추적성(Traceability) | 0.75 | 0.75 | REQ 16 ↔ AC 16 이 1:1 이고 고아 없음(`acceptance.md` §수용 기준 표에서 전건 대조). 감점은 **본문 의무가 기준을 못 가진 두 자리** — `spec.md` §1.2 종결 정의 2번(「**저장소 안**의 같은 주장이 남은 자리가 전건 열거되었다」)을 재는 기준이 3파일로 좁혀져 있고(D2), §5 의 `[HARD]` 실패 원칙은 REQ 가 아니라 DoD 7 로만 걸린다 |

**총점** = 조화평균(0.75, 1.00, 0.60, 0.75) = 4 ÷ (1.3333 + 1.0000 + 1.6667 + 1.3333) = 4 ÷ 5.3333 = **0.750**.

---

## 3. 차단 결함 (blocking)

### D1 — 해소 안 된 `[NEEDS CLARIFICATION]` (MP-7)
- **자리** `plan.md` §A-1 훑기 정정 범위 — `[NEEDS CLARIFICATION: §B 어간 훑기의 정정 범위 — README 밖 네 자리를 고칠 것인가]` (같은 표시가 `progress.md` §E.1 「미결 1건」에도 있다)
- **심각도** critical · **부류** blocking
- **왜** 이 표시가 열려 있는 동안은 Implementation Kickoff Approval 로 갈 수 없다. 점수가 높아도 자동 해소되지 않는다.
- **고칠 것** 오케스트레이터가 `AskUserQuestion` 으로 (a)/(b) 를 리드에게 물어 확정하고, 표시를 **결정 기록으로 대체**한다. 잠정 (a) 를 그대로 채택하더라도 표시는 남기지 않는다. — 단, **D2 를 먼저 읽고 물을 것.** 지금 (a)/(b) 는 「6건 중 4건」의 선택지인데, 실제 모집단은 6건이 아니다.

### D2 — 종결 정의는 「저장소 안」인데 기준은 3파일에 못 박혀 있다
- **자리** `spec.md` §1.2 종결 정의 2번 「**저장소 안**의 같은 주장이 남은 자리가 전건 열거되었다」 ↔ `acceptance.md` AC-LIVEVERIFY-014 의 고정 명령 「`grep -n "내 PC" README.md .moai/project/product.md ROADMAP.md`」 + 「행 수와 적중 총수가 같다」
- **심각도** major · **부류** blocking
- **근거(실행함)** 3파일 훑기는 확실히 6건이다. 그러나 추적 파일 전체로 넓히면:

  ```
  $ git grep -c "내 PC" -- . ':!.moai/specs'
  .moai/plan/2026-08-26-minidiscord/plan-v2.md:5
  .moai/plan/2026-08-26-minidiscord/plan.md:5
  .moai/plan/2026-08-26-minidiscord/spec-v2.md:5
  .moai/plan/2026-08-26-minidiscord/spec.md:5
  .moai/project/product.md:3
  .moai/project/structure.md:2
  … (reports 9파일) …
  CHANGELOG.md:3
  README.md:2
  ROADMAP.md:1
  channel/src/channel-server.ts:2
  docs/design-evolution.html:2
  server/src/config.ts:1
  ```

  `.moai/specs` 를 뺀 추적 파일만 33개 자리다. 그중 **AC-014 가 보는 것은 3파일 6건**뿐이다. 「행 수 = 적중 수」 검사는 **자기가 정한 3파일 안에서만** 성립하므로, 부분 정정을 막겠다는 그 검사의 목적(「README 만 고치고 나머지는 못 본 척」)이 파일 목록 한 줄로 우회된다.
- **특히 놓친 것** `CHANGELOG.md:509` 「`minidiscord`는 내 PC에서만 도는 서버를 전제로 합니다」 — 현재형 배치 전제 서술이고, `README.md:192` 와 같은 주장이다. 그리고 `CHANGELOG.md:110` 은 「지금 README 에는 어긋남이 하나 남아 있습니다 … `t26` 이 닫습니다」라고 적는다 — **REQ-013 이 착지하는 순간 거짓이 되는 문장**이며, 이 SPEC 의 어떤 기준도 그 자리를 보지 않는다.
- **고칠 것** ㉠ §1.2-2 를 AC-014 가 실제로 재는 범위로 좁히거나, ㉡ AC-014 의 훑기 대상을 「추적 파일 전체(문서·주석·코드), `.moai/specs` 와 `.moai/reports` 는 시점 기록으로 제외」로 넓히고 분류표를 그 모집단에 대해 만든다. 둘 중 하나를 고르지 않으면 종결 정의가 기준으로 내려오지 않는다. REQ-014 의 「최소한 셋」이라는 문언은 AC 가 셋으로 고정해 버려 무력하다.

### D3 — `server/src/config.ts:4` 가 지워질 README 문장을 인용하고 있고, 아무 카드도 그 자리를 갖지 않는다
- **자리** `server/src/config.ts:4` — 「기본은 루프백이다. **README 가 선언한 '내 PC에서만 도는 서버' 전제**를 코드가 지키게 한다」
- **심각도** major · **부류** blocking
- **근거(실행함)** `git grep -n "내 PC에서만 도는" -- . ':!.moai/specs'` 가 `README.md:192` 와 `server/src/config.ts:4` 를 함께 낸다. 두 자리는 **같은 배정에서 한 묶음이었다** — `.moai/specs/SPEC-E2E-001/spec.md:173` 「따라서 **README:3·190 의 배치 전제 서술도, `server/src/config.ts` 주석도** 이 카드가 고치지 않는다」, `.moai/reports/t6/plan-done.md:84` 「`server/src/config.ts:4` 의 «내 PC» 주석 | **t26 / N3**」. 카드 `t32` 본문은 그 묶음의 「**옛 t26 일부**」만 흡수했다고 적고, 후속 카드 `t33` 본문의 「옛 t26 나머지 문서·주석 정정」 열거에도 `config.ts` 는 이름이 없다(`moai todo list` 실행으로 두 카드 본문 확인).
- **결과** REQ-013 이 `README.md:192` 를 「사내망 전용」으로 바꾸는 순간, `config.ts:4` 는 **존재하지 않는 README 선언을 인용하는 주석**이 된다. 이 SPEC 은 그것을 열거하지도, 「정정 불필요」로 분류하지도 못한다(3파일 훑기가 `.ts` 를 보지 않는다).
- **고칠 것** `config.ts:4` 를 AC-014 의 분류표 행으로 끌어들이고(§B 범위에 코드 주석을 포함), 정정하거나 「t33 소유」로 사유와 함께 분류한다. 후자를 고르면 **그 배정이 실재하는지**를 확인해야 한다 — 지금 t33 본문은 그것을 열거하지 않는다.

### D4 — AC-013 은 「내 PC」가 0 이 되어도 **같은 절 안에서** 배치 전제가 살아남는 것을 막지 못한다
- **자리** `acceptance.md` AC-LIVEVERIFY-013 「㉠ 의 적중 중 배치 전제를 서술하는 것이 **0건**」
- **심각도** major · **부류** blocking
- **근거(실행함)** 어간 `내 PC` 가 못 잡는 배치 전제 서술이 **README 안에** 남는다.
  - `README.md:200` 「**이것들을 뺄 수 있는 근거가 바로 `MINIDISCORD_HOST`의 기본값 `127.0.0.1`입니다.** 주소를 넓히는 순간 이 전제가 사라지므로 …」 — `:192` 를 「사내망 전용」으로 바꾸면 **여덟 줄 아래의 이 문장이 그 정정을 되돌린다**(사내망 ≠ 루프백). 같은 `## 보안에 대해 알아둘 점` 절 안이다.
  - `README.md:41` 「`MINIDISCORD_HOST`는 기본이 `127.0.0.1`이라 **이 PC에서만** 접속됩니다」 — 「이 PC」는 어간에 안 걸린다.
  - (`README.md:240` 「서버와 봇 세션을 **같은 PC에서** 돌리고」 는 사내망 전용보다 **더 좁은** 권고라 모순이 아니다 — 정정 대상 아님을 여기 적어 둔다.)
  - 검증: `git grep -n -e "이 PC에서만" -e "내 PC에서만 도는" -- . ':!.moai/specs'` 실행함.
- **고칠 것** AC-013 ㉠ 의 어간을 「내 PC」 하나에서 **「PC 배치 전제 어간 집합」**(`내 PC` · `이 PC` · `같은 PC` · `127.0.0.1` + 「전제/근거」 동반)으로 넓히고, 적중을 자리별로 분류한다. 아니면 ㉡ 처럼 **양성 방향**으로 재라 — 「`## 보안에 대해 알아둘 점` 절 안에 배치 전제를 진술하는 문장이 정확히 하나이고 그것이 사내망 전용을 말한다」. 지금 형태는 어간 하나의 부재만 재므로 「글자만 지우고 뜻은 남기기」를 통과시킨다.

### D5 — AC-005 의 양성 대조군이 **다른 증거 파일**에 있다 (SPEC 자신의 규약 위반)
- **자리** `acceptance.md` AC-LIVEVERIFY-005 「대조군은 `A09-since-id-catchup.png` 가 잇는다」 ↔ `spec.md` §3.3 「**같은 증거 안에서**, 같은 세션이 응답할 수 있는 상태였음을 보이는 관측」 ↔ `acceptance.md` 원칙 2 「대조군은 **같은 증거 안에서** 그 세션이 응답 가능한 상태였음을 보인다」
- **심각도** major · **부류** blocking
- **왜** 두 파일은 서로 다른 시점에 찍힐 수 있고, 무엇도 「A09 가 A05 의 침묵 구간 **뒤**에, **같은 세션**으로 찍혔다」를 강제하지 않는다. 그러면 대조군이 하려던 일 — 「침묵이 세션 사망 때문이 아님」 — 을 증거가 정하지 못한다. 그리고 DoD 2 「부정형 세 항의 **증거에** 대기 상한 관측과 양성 대조군이 **모두 들어 있다**」는 AC-005 에 대해 **글자 그대로 만족 불가능**하다.
- **고칠 것** A05 와 A09 를 **한 화면·한 파일**로 합치거나(⑤ 의 두 줄 → 침묵 구간 → ⑨ 의 `@TO` 와 답변이 같은 캡처에 순서대로 읽히게), A05 의 증거에 「그 침묵 직후 같은 세션이 응답한 왕복」을 자체 포함시킨다. `spec.md` §4 실행 순서상 ⑤ 와 ⑨ 사이에 네 항이 끼어 있으므로, 합치려면 순서도 함께 손봐야 한다 — 그것이 이 결함의 실비용이다.

### D6 — 「120초」가 명명된 증거에서 **읽히지 않는다**
- **자리** `acceptance.md` AC-004 「그 120초 동안 … 새 메시지가 **0건**」 / AC-005 동일 / AC-012 「120초 안에 봇 칩이 `🟢` 로 돌아오지 않는다」, 증거는 각각 정지 이미지 한 장(`A04-cc-silent.png` · `A05-nomention-silent.png` · `A12-archived.png`)
- **심각도** major · **부류** blocking
- **왜** 정지 화면 한 장은 「120초가 흘렀다」를 그 자체로 말하지 않는다. 세 기준 어느 것도 **무엇을 읽어 시간 경과를 판정하는지**를 적지 않았다. 그러면 대기 상한은 운영자의 기억에만 존재하고, 제3자는 「기다렸다」를 검증할 수 없다 — 이 SPEC 이 §3.2 에서 스스로 금지한 「운영자가 됐다고 말했다」가 시간 축에서 되살아난다.
- **구성 가능함(확인함)** 웹 화면은 메시지마다 시각을 그린다 — `web/app.js:336-338` (`const time = …; time.className = 'msg-time'; time.textContent = m.created_at ?? ''`). 그러므로 고치는 비용은 작다.
- **고칠 것** 세 기준의 「증거」 절에 「침묵 구간을 **감싸는 두 메시지의 `msg-time` 이 읽히고 그 차이가 120초 이상**이어야 한다」를 넣는다. AC-012 는 방 화면이 아니라 재접속 시도 쪽이므로 `A12-reconnect.txt` 에 시각이 찍힌 시작·종료 두 줄을 요구한다.

### D7 — §A 의 어느 기준도 「봇이 **진짜 Claude Code 세션**이다」를 증거로 가르지 못한다
- **자리** `acceptance.md` AC-LIVEVERIFY-001 「증거 `A01-bot-online.png` — 방 화면 한 장. 그 안에서 봇 칩 `🟢 pm` 과 방 제목이 함께 읽혀야 한다」
- **심각도** major · **부류** blocking
- **왜** `🟢 pm` 칩은 게이트웨이에 붙은 것이 **무엇이든** 똑같이 뜬다. 형제 `SPEC-E2E-001` 의 가짜 채널(`scripts/e2e.mts`, 평범한 WebSocket 클라이언트)이 붙어도 이 화면은 글자 하나 다르지 않다. 그런데 이 SPEC 이 형제와 갈리는 **유일한 지점**이 바로 그것이다 — `spec.md` §7 이 스스로 적는다: 「경계는 **누가 봇인가**다 — 저쪽은 가짜 채널, 이쪽은 실 Claude Code 세션.» 그 경계가 §A 증거에서 관측되지 않는다.
- 터미널 쪽 증거는 `A08-clear-terminal.png` 하나뿐이고, 그것은 `/clear` 를 보이는 부속 자료다. §3.1 의 고정 파일명 목록에도 없다.
- **고칠 것** AC-001 의 증거에 **터미널 아티팩트**를 필수로 더한다 — 초대 명령으로 세션이 뜬 화면(Claude Code 배너 + MCP 서버 `minidiscord-channel` 이 붙은 표시)과, 그 세션 프로세스가 그 방에 붙어 있음을 보이는 한 줄. 그렇게 해야 「제3자가 그것만 보고 판정할 수 있다」(§1.2-1)가 이 SPEC 의 중심 주장에 대해서도 성립한다.

### D8 — 카드가 요구한 산출물(「체크리스트 11줄 전부 ☑」)을 계획이 금지하는데, 그 뒤집기가 결정으로 올라가지 않았다
- **자리** `plan.md` §H 안티패턴 「**`plan-v2.md` 의 체크박스를 이 카드가 체크하기.** 그 문서는 그때의 계획 기록이다」 ↔ 카드 `t32` 본문 「[보여줄 것] 체크리스트 11줄 전부 ☑ 와 화면 캡처」(`moai todo list` 실행으로 확인)
- **심각도** major · **부류** blocking
- **왜** 같은 문서가 카드와 정본의 **다른 어긋남**(11줄 vs 12줄)은 HISTORY 에 명시적으로 올려 리드가 볼 수 있게 했다. 그런데 카드의 **산출물 정의**를 뒤집는 이 결정은 §H 안티패턴 목록 안에 조용히 들어 있다. 판단 자체는 옳을 수 있으나(그 문서는 시점 기록이다), 운영자가 「☑ 를 보겠다」고 적은 것을 계획이 거부하는 이상 그것은 결정이지 안티패턴이 아니다.
- **고칠 것** §H 에서 빼서 `plan.md` §A 미결(또는 `spec.md` HISTORY)로 올리고, 「정본 체크박스는 그대로 두고 `evidence/` + 종결 보고의 `통과 N / 실패 M / 미관측 K` 가 ☑ 를 대신한다」를 리드가 확인하는 형태로 만든다.

### D9 — `spec.md` §6.2 의 `$ grep` 블록은 그 명령의 실제 출력이 아니다
- **자리** `spec.md` §6.2, 코드 블록 「`$ grep -n "내 PC" README.md .moai/project/product.md ROADMAP.md`」 아래의 `README.md:3 · README.md:192` / `.moai/project/product.md:12 · :17 · :24` / `ROADMAP.md:7`
- **심각도** minor · **부류** blocking
- **근거(실행함)** 같은 명령의 실제 출력은 `FILE:LINE:본문` 세 조각이며, 이 트리에서는 파일 순서도 인자 순서와 다르게 나온다:

  ```
  ROADMAP.md:7:내 PC에서 도는 채팅 서버를 만들고, …
  .moai/project/product.md:12:그대로 활용하지 못한다. minidiscord는 "내 PC에서 도는 나만의 디스코드"를 …
  …
  README.md:192:이건 **내 PC에서만 도는** 서버라는 전제로 만들어졌어요. …
  ```

  **수치(6건/3파일)는 참이다** — `grep -c` 로 재확인했다(product 3 · ROADMAP 1 · README 2). 문제는 편집한 요약을 프롬프트 기호 아래 두어 출력으로 읽히게 한 것이다. 같은 §의 §6.1 두 명령은 내가 그대로 돌려 값이 일치했으므로, 이 한 자리만 형태가 다르다.
- **고칠 것** 출력을 그대로 붙이거나, 프롬프트 기호를 떼고 「명령: … / 요약: 6건 3파일」로 표기한다.

---

## 4. 비차단 소견 (optional — 리드 재량)

| # | 자리 | 내용 |
|---|---|---|
| O1 | `acceptance.md` AC-012 「양성 대조군 AC-001 이 대조군이다 — **같은 토큰**이 보관 전에는 세션을 확립했다」 | 대조군이 열한 항 **앞**에 있고, 그 사이에 `A11` 서버 재시작이 끼어 있다. 재시작은 접속 자체에 영향을 주는 사건이라 「보관이 거부했다」와 「재시작 뒤로 이미 못 붙고 있었다」가 완전히 갈리지 않는다. 값싼 보강: 보관 **직전**에 재접속을 한 번 성립시켜 같은 파일에 남기기. (설계 자체는 방어된다 — `server/src/routes-rooms.ts:80` 이 보관 트랜잭션 안에서 그 방 `bot_tokens` 를 철회하므로 인과는 실재한다) |
| O2 | `spec.md` §3.1 「이름이 고정이라 §A 의 어느 항이 비었는지 **디렉터리 목록만으로** 드러난다」 | 목록에 없는 부속 파일이 여섯이다 — `A03-working-1/2.png` · `A07-download.txt` · `A08-clear-terminal.png` · `A11-before.png` · `A12-reconnect.txt`. 개별 기준 안에서만 도입되므로 §3.1 의 주장이 그만큼 약하다 |
| O3 | `spec.md` §6.2 표, 3·4행의 자리 이름 「`README.md` 「보안에 대해 알아둘 점」 절 뒤쪽 / 같은 절」 | 실제로 `README.md:242`·`:244` 는 중첩 소제목 `### 채널 플러그인을 붙이기 전에`(`:219`) 아래다. AC-013 의 「자리 지목 규약」이 헤딩 앵커로 자리를 잡으므로 run 이 잘못된 앵커를 찾는다 |
| O4 | `acceptance.md` AC-015 ㉢ 「결과 문자열 전체에 날것 봉투 시퀀스가 0건」 | 이미 `channel/test/index-wiring.test.ts:318-319` (`expect(raw).not.toContain('<channel')` · `'</channel'`)가 같은 것을 잰다. 순서 판별에 기여하지 않는 중복이며, 성격상 `SPEC-CHANINJECT-001` 영역이다. ㉡ 만이 순서를 가른다 |
| O5 | `spec.md` REQ-LIVEVERIFY-014 | 주어가 생략돼 있다(누가 훑고 누가 표를 남기는가). 실행 주체는 AC-014 가 「run 단계」로 밝히므로 실무 영향은 없다 |
| O6 | `acceptance.md` AC-002 | 「자기소개인가」를 판정자에게 맡긴다. 형제 AC-006·008·009 처럼 미리 정한 고유 문자열을 요구하면 같은 비용으로 이진이 된다 |
| O7 | `spec.md` 프런트매터 `depends_on: [… SPEC-CHANINJECT-001 …]` | 그 SPEC 의 status 는 `in-progress` 다. §C 가 기대는 중화 계약이 아직 닫히지 않은 문서 위에 서 있다 — D7 차단 사유는 아니지만 run 이 알아야 한다 |
| O8 | `plan.md` §E 「여유가 0 이라는 사실은 그 자체로 제약이다」 | 상한 정확 일치의 **실제 비용**이 이미 문서에 나타나 있다: `spec.md` §5 의 `[HARD]` 실패 원칙이 REQ 가 되지 못하고 DoD 7 로만 걸리고, REQ-016 이 서로 다른 두 의무(상수 파생 / 변이 판별력)를 한 항에 묶었다. run 이 기준을 하나라도 더해야 하면 즉시 Tier 재분류다 — 이 SPEC 은 그것을 알고 적었으므로 결함이 아니라 인수해야 할 제약이다 |

---

## 5. 내가 다시 도출해 **참으로 확인한** 전제

디스패치가 넘긴 주장과 저작 에이전트의 자기 보고를 전부 파일에서 다시 뽑았다. 아래는 **살아남은 것들**이다 — run 단계가 다시 재지 않아도 된다.

1. **체크리스트는 12줄이다.** `grep -c '^#   \[ \]' .moai/plan/2026-08-26-minidiscord/plan-v2.md` → `12`. `grep -n` 으로 자리를 보면 `3842`~`3853` 연속이고, Step 2 코드블록(`3838` 부근 시작) 과 `Step 3: 커밋`(`3855` 부근) 사이에 전부 들어 있다. `awk 'NR>=3840 && NR<=3856' … | grep -c` → `12` 도 재현됐다. 카드 본문의 「11줄」이 어긋난 쪽이 맞다.
2. **REQ-001~012 는 정본 열두 줄과 순서·내용이 일치한다.** 정본 순서(🟢 → @TO 답변 → 입력 중 → @CC 무응답 → 멘션 없음 → 첨부 업로드 → 봇 첨부 → `/clear` 복구 → 두 줄 따라잡기 → 🔒 승인 → 재시작 → 보관)와 REQ 번호가 1:1 로 맞는다.
3. **3파일 훑기는 6건이다.** `grep -c "내 PC" README.md .moai/project/product.md ROADMAP.md` → `README.md:2` · `.moai/project/product.md:3` · `ROADMAP.md:1`. 수치는 참이다(출력 **형태**만 D9).
4. **`channel/src/index.ts:95-96` 의 순서는 옳다.** `grep -n "truncateToBudget(neutralizeEnvelope" channel/src/index.ts` → `95` · `96`. 중화가 안쪽, 절단이 바깥쪽.
5. **`AC-BOTSTAB-010` 은 배선을 잴 수 없다.** `channel/test/truncate.test.ts:109` 이 `truncateToBudget(neutralized, budget)` 이라는 합성을 **테스트 안에서** 만든다. 배선을 뒤집어도 이 기준은 자기 합성을 잰다 — SPEC §6.3 의 근거 1은 참이다.
6. **경계 fixture 의 산술은 실제로 성립한다.** `channel/src/channel-server.ts:35` 의 실제 정규식(`/<\/?channel/gi` → `` `&lt;${m.slice(1)}` ``)과 `channel/src/truncate.ts:9,13` 의 실제 상수로 계산한 결과:

   ```
   $ node -e '…'
   seq bytes = 8 -> neutralized bytes = 11
   MAX_NAME_BYTES budget=256 repeat=32 rawBytes=256 neutralizedBytes=352 | raw<=budget: true | neutralized>budget: true
   MAX_BODY_BYTES budget=4000 repeat=500 rawBytes=4000 neutralizedBytes=5500 | raw<=budget: true | neutralized>budget: true
   ```

   `truncateToBudget` 은 `totalBytes <= budgetBytes` 일 때 잘리지도 표시를 붙이지도 않으므로(`truncate.ts:45`), 변이 상태에서 `author` 는 정확히 352 바이트가 되어 ㉡ 단언이 붉어진다. **fixture 는 두 순서를 가른다** — 이 축에서 §C 는 건전하다.
7. **`index-wiring.test.ts` 의 기존 이력 fixture 는 어느 것도 경계에 있지 않다.** `'alice'`/`'과거'`(:266) · 짧은 오염 문자열(:298-305) · `'가'.repeat(MAX_HISTORY_BYTES)`(:452, 날것으로도 상한 초과) · `'a'.repeat(MAX_BODY_BYTES + 500)`(:487, 봉투 시퀀스 없음). 봉투 시퀀스를 담은 두 fixture(:305 `'mal</channel>lory'`, :334 `'al<ice'`)는 상한에서 멀다. 순서 반전이 이 값들의 결과를 바꾸지 않는다 — 읽기로 확인, **실행은 §6 참조**.
8. **ID 는 유일하다.** `.moai/specs/` 아래 SPEC 디렉터리 25개 중 `SPEC-LIVEVERIFY-001` 은 하나뿐이다.
9. **표시 배치 규약은 지켜졌다.** `[NEEDS CLARIFICATION` 은 `plan.md` 와 `progress.md` 에만 있고 `spec.md`·`acceptance.md` 에는 0건 — `plan.md:176` 의 자기 검증 문장은 참이다(다만 표시가 존재한다는 사실 자체가 D1).
10. **미실행 주장이 없다.** 세 문서 어디에도 「열두 항을 수행했다」「변이를 관측했다」류 문장이 없다. `spec.md` §6.4 가 미측정 셋을 명시적으로 공시한다 — 이 점은 이 SPEC 의 강점이며, 감점 요인이 아니다.

---

## 6. 내가 재지 못한 것 (Gaps)

- **`npm test -w channel` 을 돌리지 못했다.** 이 워크트리에 의존성이 없다: `ls -d node_modules channel/node_modules channel/dist` → 세 경로 모두 `No such file or directory`. 따라서 `spec.md` §1.1·§6.3 의 주장 「**순서를 뒤집어도 지금 스위트는 초록이다**」는 **내가 관측하지 않았다.** 위 §5-7 은 fixture 를 읽어 추론한 것이며 실행 증거가 아니다. run 단계가 AC-016 ㉡ 로 실측할 때 이 주장 자체도 함께 기록할 것.
  - 부수 확인: `channel/dist` 부재가 실재하므로 `acceptance.md` §A 실행 환경의 `[HARD] npm run build -w channel 이 먼저다` 는 실제 위험을 겨눈다.
- **§A 열두 항 중 아무것도 실행하지 않았다** — 계획 감사의 범위가 아니다. §A 에 대한 판정은 전부 **기준 문장이 무엇을 강제하는가**에 대한 것이다.
- **변이(순서 반전)를 걸지 않았다.** 감사 중 작업 트리를 변경하지 않는다는 원칙과, 그것이 AC-016 의 소유라는 이유 둘 다다.
- **`docs/design-evolution.html:203,233` 과 `channel/src/channel-server.ts:19,125`** 의 「내 PC」 적중이 배치 전제 서술인지 다른 뜻인지는 판정하지 않았다(채널 지시문의 「내 PC 로컬 경로」는 명백히 다른 뜻으로 보이나, 분류는 §B 의 일이다). D2 의 모집단 문제로 넘긴다.

---

## 7. 권고 — run 으로 가기 전에 고칠 순서

1. **D1 을 먼저 닫되, D2 를 함께 물어라.** 지금의 (a)/(b) 선택지는 「6건 중 넷」을 전제하는데 모집단이 틀렸다. 리드에게 물을 것은 실질적으로 셋이다 — ㉠ 훑기 모집단(3파일 / 추적 파일 전체) ㉡ `server/src/config.ts:4` 의 소유(t32 / t33) ㉢ README 밖 문서(`product.md`·`ROADMAP.md`·`CHANGELOG.md`)의 처분.
2. **D5·D6·D7 은 `acceptance.md` 만 고치면 닫힌다** — 증거 절에 각각 (D5) 대조군을 같은 파일로, (D6) 감싸는 두 메시지의 `msg-time` 판독, (D7) 세션 터미널 아티팩트를 더한다. 요구사항은 건드리지 않으므로 **REQ/AC 수는 16/16 그대로**다(상한 여유 0 을 지킨다).
3. **D4 는 AC-013 ㉠ 의 형태를 바꾼다** — 어간 부재 검사에서 「그 절 안에 배치 전제를 진술하는 문장이 정확히 하나」라는 양성 검사로. 이것도 기준 수를 늘리지 않는다.
4. **D3 은 D2 의 결정에 따라온다.** 분류표에 코드 주석 행을 넣기로 하면 그 자리에서 닫힌다.
5. **D8·D9 는 한 줄 편집이다.**
6. 위를 반영한 뒤 2회차 감사를 요청하라. 2회차는 **여기 열거된 결함 델타 + 회귀 검사**로 범위가 좁혀진다.

**긍정 기록.** 이 SPEC 은 수동 수용 실행을 다루면서 「미관측을 통과로 셈하지 않는다」·「대기 상한 + 양성 대조군」·「합성 금지」·「변이로 판별력 확인」·「계획 시점 값을 옮겨 적지 말 것」을 스스로 규약으로 세웠고, §6.4 에서 재지 않은 것을 먼저 공시했다. 위 차단 결함들은 **그 규약이 개별 기준에 끝까지 내려오지 못한 자리들**이지, 규약이 없어서 생긴 것이 아니다. 그래서 고치는 비용이 작다 — 아홉 건 중 여섯이 `acceptance.md` 편집으로 닫힌다.

---

_1회차 · 감사자: plan-auditor · 대상 트리 `.claude/worktrees/t32` @ `f5cb336` · `spec.md`·`plan.md`·`acceptance.md` 무변경_
