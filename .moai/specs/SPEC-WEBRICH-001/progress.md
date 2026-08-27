# SPEC-WEBRICH-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-WEBRICH-001` |
| 칸반 카드 | `t5` (마일스톤 M5) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 17 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-C·7장(봇 초대·권한 릴레이)·9장 |
| 워크트리 | `.claude/worktrees/t5` (브랜치 `WT-web-ui`) |
| 선행 SPEC | `SPEC-WEBSHELL-001` → `SPEC-WEBCHAT-001` (같은 카드) / `SPEC-MSG-001`·`SPEC-PERM-001`·`SPEC-BOT-001`·`SPEC-GATEWAY-001` (카드 `t2`·`t3`, 완료) |
| 실행 순서 | 카드 `t5` 의 세 번째 SPEC |
| 현재 상태 | `in-progress` — run 단계 완료 (audit-ready, §E.2·§E.3 참조) |
| `spec.md` 판 | 0.3.0 |
| 감사 보고서 | `.moai/reports/t5/plan-audit.md` · `.moai/reports/t5/plan-audit-b.md` (2026-08-27) |
| 감사 판정 | 0.3.0 교정 완료 — MF-5·7·8·9·10·11 반영 |
| spec_base_sha | `61cd828ec6d4c84a1909167969f8ec2619fa14f1` |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-WEBRICH-001
tier: M
card: t5
depends_on: [SPEC-WEBSHELL-001, SPEC-WEBCHAT-001, SPEC-MSG-001, SPEC-PERM-001, SPEC-BOT-001, SPEC-GATEWAY-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 17)
spec_version: "0.2.0"
req_count: 16
ac_count: 16
tier_budget: "16 REQ / 16 AC"
deviations_recorded: 10   # plan.md §D
manual_criteria: 1        # AC-WEBRICH-015
audit_report: .moai/reports/t5/plan-audit.md
audit_verdict: CONDITIONAL_PASS
must_fix_assigned: [MF-5, MF-7, MF-8]
must_fix_resolved: [MF-5, MF-7, MF-8, MF-9, MF-10, MF-11]
observations_resolved: [O-2, O-3, O-5, O-6, O-10, O-11, O-13]
contract_owner: SPEC-WEBSHELL-001 spec.md §4.8 (REQ-WEBSHELL-015)
```

### 감사 교정 라운드 (0.2.0) — 무엇을 고쳤나

| 항목 | 고친 자리 |
|------|-----------|
| MF-5 — 한쪽만 아는 `decorate` 이음매 | `spec.md` §2 용어 2행, §3 의존 표, REQ-001(형 여덟 개 + `RichContext.decorate` 시그니처), REQ-002(요소 계약 전문), 범위 밖 절 / `plan.md` §A, §B 1, §D 1 |
| MF-7 — AC-014 가 잘못된 파일을 본다 | `acceptance.md` AC-014 (대상 `web/index.html` → `web/style.css`, 반대 경로 봉인, `@import` 뒤 위치 관측 추가) |
| MF-8 — REQ-002 를 관측하는 기준 없음 | `acceptance.md` AC-016 관측 3 추가, AC 매트릭스 / `plan.md` §G 변이 4번 |
| `<script type="module">` 자기모순 (O-2) | `plan.md` §F M3 항목 삭제, §E 위험 3 삭제 / `spec.md` 범위 밖 절에 소관 명시 |
| §4.8 계약 합치 | `spec.md` §3 계약 대조표(계약 1·2·3·4·6), §4.5 REQ-016(계약 5), §6 제약 |
| O-3 정규식 플래그 | `spec.md` REQ-006 (`m` → `gm` + `matchAll`) |
| O-5 `vitest.config.ts` 금지 문구 | `plan.md` §H 8 |
| O-6 형 불일치 | `spec.md` REQ-001 `InviteNodes` 구조적 형 / `acceptance.md` 골격 B `att()` 헬퍼, AC-004·007·008·009 |

### 두 방향 훑기 — 실시했다

[HARD] 열여섯 기준을 **카드 전체 범위에서** 두 방향으로 다시 훑었고, 관측되지 않는 요구사항을 찾는 축을 하나 더했다. 표와 근거는 `plan.md` §E.2 에 있다.

| 방향 / 축 | 질문 수 | 적발 |
|-----------|--------|------|
| A — 빈/스텁 구현이 통과하는가 | 16 | 0 |
| B — 형제의 옳은 구현이 이 기준을 실패시키는가 | 16 | 1 결함(AC-014) + 4 잠재 위험(AC-004·007·008·009) |
| 두 방향 합계 | **32** | **5** |
| C — 매핑된 REQ 를 실제로 관측하는가 | 16 | 1 (REQ-002 → AC-016 강화) |

적발 6건은 전부 이번 라운드에서 반영했다. Tier M 예산은 **16 REQ / 16 AC 그대로** — 새 AC 를 만들지 않고 이미 REQ-002 에 매핑돼 있던 AC-016 을 강화했으므로 은퇴시키거나 합칠 기준이 없었다.

### 감사 교정 라운드 3 (0.3.0) — 무엇을 고쳤나

근거: `.moai/reports/t5/plan-audit-b.md` — plan-auditor 독립 재감사. 이 SPEC **FAIL**, 카드 `t5` 통합 표면 **FAIL**. 감사가 델타로 범위를 좁혔고(형식 검사 7항목·방향 A·B 45건·이음매 아홉 항목 중 여덟은 통과), 이 라운드는 그 델타만 손댔다.

| 항목 | 무엇이 틀렸나 | 무엇을 고쳤나 |
|------|--------------|--------------|
| **MF-9** (BLOCKING) | 이 문서 세 곳(`spec.md` 소유표, `plan.md` §B 1·§F M3, `acceptance.md` AC-016 해설)이 등록 지점에 **`createRichContext({ api, doc }).decorate`** 를 넘긴다고 적었다. 형제는 **팩토리**를 요구한다 — 그대로 구현하면 `decorate({api, doc}, undefined)` 가 불려 첫 메시지에서 죽거나 첨부·권한 버튼이 조용히 안 뜬다. 게다가 배선 한 줄을 **어느 SPEC 의 요구사항도 수용 기준도 규정·관측하지 않았다** | 넘기는 값을 `createRichContext` **그 자체**로 정정. `spec.md` REQ-WEBRICH-002 에 「배선 계약」 신설(소유자·자리·값·관측자), `AC-WEBRICH-016` 에 관측 4(정적 grep 넷)·관측 5(실제 `openRoom` 경로 행위 테스트) 추가. **같은 문단을 `SPEC-WEBCHAT-001` v0.3.0 §4.6 이 글자 그대로 싣는다** — md5 대조로 동일 확인 |
| **MF-10** | `AC-WEBRICH-016` 이 기준 SHA 없이 **조용히 통과**했다. `.spec-base-sha` 부재 시 `git diff` 가 `fatal:` 을 표준 오류로 내고 표준 출력은 비어 세 관측이 전부 성립한다. 둘째 경로 — 형제보다 먼저 실행되면 base 에 `web/app.js` 가 없어 관측 3이 다시 공허해진다 | 관측 0(`git rev-parse --verify`)을 맨 앞으로, 3-a(base 파일 비어 있지 않음)·3-b(범위가 두 수)를 관측 3의 선행 조건으로. awk 패턴을 넓히고(O-11), 주석만 있고 없던 계수 명령(O-10)을 3-c 로 채웠다. 형제 둘이 이미 쓰던 가드와 같은 형태다 |
| **MF-11** | 허용 집합에 `server/vitest.config.ts` 가 빠져 있었다. 이 SPEC 은 두 환경(`node`·`jsdom`)을 동시에 쓰는 유일한 SPEC 이라 그 파일을 손댈 가능성이 형제보다 높은데, 손대면 **옳은 구현이 자기 기준에서 실패**했다 | 허용 집합에 추가(형제 둘과 동일). `spec.md` §6 DOM 환경 행에 대체 경로 명시, §4.7 손대는 파일 목록과 `plan.md` §H 8 도 함께 정렬 |
| **O-13** | `grep -c "design-tokens.css" web/index.html` 은 옳은 구현에서 종료 코드 `1` 이고, 파일이 없으면 **아무것도 출력하지 않는다** | AC-014 에 `test -s web/index.html` 선행 검사 + 종료 코드 표기 추가 |

### 공허 훑기 — 실시했다

[HARD] 감사 권고 3에 따라 세 번째 물음으로 열여섯 기준을 전수 훑었다: **이 기준이 실패가 아니라 *공허*로 무너지는 입력이 있는가?** 표와 근거는 `plan.md` §E.3 에 있다.

| 물음 | 질문 수 | 적발 |
|------|--------|------|
| C — 공허로 무너지는 입력 (기준별) | 16 | **3** — AC-014 1건, AC-016 2건 |
| C — 횡단 (전 기준 공통 실행 경로) | 1 | **1** — 테스트 파일 부재·`it.skip` 시 `npm test` 가 종료 코드 `0` |
| 합계 | **17** | **4** |

네 건 전부 이번 라운드에서 반영했다. Tier M 예산은 **16 REQ / 16 AC 그대로** — 배선은 새 REQ 가 아니라 REQ-002 본문 확장으로, 배선 관측은 새 AC 가 아니라 AC-016 강화로 흡수했으므로 은퇴시키거나 합칠 항목이 없었다.

**세 라운드를 관통한 사실 하나**: 방향 A 0건 → 방향 B 결함이 AC-016 에 잔류 → 방향 C 적발 3건 중 2건이 AC-016. 적발은 세 라운드 모두 같은 기준 하나에 몰렸다. 가장 얇은 경계(`web/app.js` 안의 `renderMessage`)를 재는 기준이라 그렇고, 얇은 경계를 재는 기준일수록 선행 조건을 함께 적어야 한다는 것이 남은 규율이다.

### 유지한 drift 주장 (감사가 코드로 확인함)

| 주장 | 확인 근거 (감사 보고서) |
|------|------------------------|
| 권한 `request_id` 파서가 본문 아무 데서나 다섯 글자를 집어 `comma` 를 보낸다 | `server/src/permissions.ts:38` 템플릿 4줄, 문자 단위 대조 |
| 첨부 응답에 `mime` 이 없다 | `routes-messages.ts:92-98`, `:136` (`SELECT id, filename`) |
| 판정 결과 메시지 재렌더로 이미 끝난 요청에 살아 있는 버튼이 다시 뜬다 | `permissions.ts:54-56` 결과 템플릿 세 종 + 방 재입장 REST 이력 경로 |
| 비보안 오리진에서 `navigator.clipboard` 가 없어 조용히 실패한다 | `routes-bots.ts:15-25`·`:59` (64 hex 토큰) + 보안 컨텍스트 성질 |

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-WEBRICH-001/.spec-base-sha
```

같은 값을 위 표에도 옮겨 적는다. 이 기준점 위에 AC-WEBRICH-016(범위 경계)이 올라간다.

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-WEBRICH-001/spec.md` | GEARS 요구사항 16개 (REQ-WEBRICH-001..016), 범위 밖 5개 항목, 제약, HISTORY 0.1.0 |
| `.moai/specs/SPEC-WEBRICH-001/plan.md` | 의존·실행 순서, 되돌리기 어려운 결정(모듈 경계·상태의 자리 / 검증 방식·개발 환경), 원본 모순 10건, 공허한 기준 부류 훑기, 위험 10건, 마일스톤 M1-M4, 자기 검증·변이 검증, 안티패턴 14건 |
| `.moai/specs/SPEC-WEBRICH-001/acceptance.md` | 수용 기준 16개 (AC-WEBRICH-001..016), 공통 테스트 골격 2종, 엣지 케이스 7건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-WEBRICH-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-WEBRICH-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

| REQ | 검증 AC |
|-----|---------|
| REQ-WEBRICH-001 (모듈 표면) | 골격 A·B 의 모든 기준 (import 실패로 전멸) |
| REQ-WEBRICH-002 (`renderMessage` 불가침) | AC-016 **관측 3** (0.2.0 에서 신설 — 0.1.0 은 매핑만 있고 관측이 없었다) |
| REQ-WEBRICH-003 (첨부 분기) | AC-007, AC-008, AC-015 |
| REQ-WEBRICH-004 (URL 검증) | AC-009 |
| REQ-WEBRICH-005 (주입 금지) | AC-009 |
| REQ-WEBRICH-006 (템플릿 일치 파서) | AC-003 |
| REQ-WEBRICH-007 (임의 위치 매칭 금지) | AC-003 |
| REQ-WEBRICH-008 (판정 페이로드) | AC-001, AC-002 |
| REQ-WEBRICH-009 (이중 전송 금지) | AC-010 |
| REQ-WEBRICH-010 (판정 완료 상태) | AC-011 |
| REQ-WEBRICH-011 (버튼 부착 경계) | AC-012 |
| REQ-WEBRICH-012 (초대 명령 표시) | AC-004, AC-015 |
| REQ-WEBRICH-013 (토큰 비영속) | AC-005 |
| REQ-WEBRICH-014 (복사 전체성·실패 통지) | AC-006, AC-015 |
| REQ-WEBRICH-015 (닫기 시 제거) | AC-013 |
| REQ-WEBRICH-016 (토큰 스타일·범위) | AC-014, AC-016 |

빠진 REQ 없음. 어떤 AC 도 대응 REQ 없이 떠 있지 않음.

### run 단계 선행 조건 (블로커 후보)

1. `npm install` — 이 워크트리에 `node_modules` 가 없다.
2. `npm i -D jsdom -w server` — vitest 4 의 `environment: 'jsdom'` 은 `jsdom` 패키지를 따로 요구한다.
3. `SPEC-WEBSHELL-001`·`SPEC-WEBCHAT-001` 의 산출물(`web/index.html`·`web/app.js`·`web/style.css`) 존재. 없으면 M1·M2 까지 진행하고 훅 배선은 블로커로 보고 (`plan.md` §A). 0.2.0 에서 호출 자리·등록 지점의 소유가 `SPEC-WEBCHAT-001` 로 넘어갔으므로, 그 SPEC 이 마감돼 있으면 이 블로커는 발생하지 않는다.
4. **배선 한 줄** — `web/app.js` 모듈 최상위에 `import { createRichContext } from './rich.js'` 와 `registerMessageDecorator(createRichContext)` 를 정확히 한 번 둔다. 넘기는 값은 **팩토리 그 자체**이며 호출 결과(`.decorate`)가 아니다. 전문은 `spec.md` REQ-WEBRICH-002 「배선 계약」이고, `SPEC-WEBCHAT-001` `spec.md` §4.6 이 같은 문단을 싣는다 — 두 문장이 갈라져 있으면 그 자체가 블로커다. 관측은 `AC-WEBRICH-016` 관측 4·5.

---

## §E.2 Run-phase Evidence

run 단계 수행: 2026-08-27, HEAD `61cd828` 시작 → `1f374d4` (M1 `0605685` · M2 `97f42bf` · M3 `1f374d4` · M4 스타일+본 기록). `spec_base_sha = 61cd828ec6d4c84a1909167969f8ec2619fa14f1` (run 첫 동작으로 기록).

### AC 매트릭스 (원문 출력)

| AC | 상태 | 명령 | 관측된 출력 (원문) |
|----|------|------|--------------------|
| AC-001 | PASS | `npx vitest run test/web-permission-contract.test.ts` | `✓ AC-001 delivers an approve verdict to the bot with the exact request_id 97ms` |
| AC-002 | PASS | 〃 | `✓ AC-002 delivers a deny verdict 79ms` |
| AC-003 | PASS | 〃 | `✓ AC-003 extracts the real request_id even when the preview contains lookalike runs 95ms` |
| AC-004 | PASS | 〃 | `✓ AC-004 shows an invite command whose token actually authenticates 61ms` |
| AC-005 | PASS | `npx vitest run test/web-rich.test.ts` | `✓ AC-005 keeps the one-time token in the DOM and nowhere else 8ms` + `grep -nE "localStorage\|…" web/rich.js` → exit 1 (일치 없음) |
| AC-006 | PASS | 〃 | `✓ AC-006 copies the whole command and reports failure when clipboard is absent 1ms` |
| AC-007 | PASS | 〃 | `✓ AC-007 renders an image attachment inline 1ms` |
| AC-008 | PASS | 〃 | `✓ AC-008 renders a non-image attachment as a download link 0ms` |
| AC-009 | PASS | 〃 | `✓ AC-009 never lets a filename or id become markup or a foreign URL 2ms` + 주입 경로 grep exit 1 |
| AC-010 | PASS | 〃 | `✓ AC-010 sends exactly one verdict per request and locks both buttons 10ms` |
| AC-011 | PASS | 〃 | `✓ AC-011 locks buttons whichever order the resolution arrives 2ms` (⚠️ 실패 본문 형태 포함) |
| AC-012 | PASS | 〃 | `✓ AC-012 attaches verdict buttons only to real permission requests 2ms` |
| AC-013 | PASS | 〃 | `✓ AC-013 wipes the command when the dialog closes 3ms` |
| AC-014 | PASS | 아래 AC-014 블록 | 존재축 128줄·`var(--md-` 52 · `index.html` grep 값 `0` · hex exit 1 |
| AC-015 | **보류 [MANUAL]** | 사람 눈 (아래 기록) | 브라우저 미실행 환경 — 자동 위장 금지 (§H 14) |
| AC-016 | PASS | 아래 AC-016 블록 | 관측 0·1·2·3·4·5 전부 성립 |

### AC-014 원문 출력

```
$ awk '/SPEC-WEBRICH-001 \*\//,/\/SPEC-WEBRICH-001/' web/style.css > /tmp/webrich-css.txt && wc -l < /tmp/webrich-css.txt
128
$ grep -c "var(--md-" /tmp/webrich-css.txt
52
$ grep -n '@import' web/style.css | head -1
6:@import url('./design-tokens.css');
$ grep -n 'SPEC-WEBRICH-001 \*/' web/style.css | head -1
344:/* SPEC-WEBRICH-001 */
→ 6 < 344 — 계약 5-1 성립 (@import 뒤에 위치)
$ test -s web/index.html && echo exists ; grep -c "design-tokens.css" web/index.html ; echo exit=$?
exists
0
exit=1          ← 값 0, 종료 코드 1 — 값으로 읽음 (0.3.0 표기)
$ grep -nE "#[0-9a-fA-F]{3,8}\b" /tmp/webrich-css.txt ; echo exit=$?
exit=1          ← 블록 안 원시 hex 없음
```

### AC-016 원문 출력

```
$ git rev-parse --verify "$(cat .moai/specs/SPEC-WEBRICH-001/.spec-base-sha)^{commit}"   # 관측 0
61cd828ec6d4c84a1909167969f8ec2619fa14f1        ← 40자리, exit 0

$ git diff --name-only 61cd828… -- server/src | wc -l                                   # 관측 1
0                                               ← 빈 출력

$ git diff --name-only 61cd828… | sort                                                  # 관측 2
web/app.js
web/index.html
web/style.css
(tracked 변경 — 전부 허용 집합 안. untracked 신규: web/rich.js, web/rich.d.ts,
 server/test/web-rich.test.ts, server/test/web-permission-contract.test.ts,
 .moai/specs/SPEC-WEBRICH-001/* — 전부 허용 집합 안)

$ git show 61cd828…:web/app.js > /tmp/webrich-app-base.js && wc -l < …                  # 관측 3-a
554                                             ← 0보다 큼
$ awk '/^(export…)?(function…renderMessage…|\(?const…renderMessage…=)/{s=NR} …'        # 관측 3-b
323,353                                          ← 두 수로 잡힘
$ git diff -U0 61cd828… -- web/app.js > /tmp/webrich-app.diff && awk -v range="323,353" … # 관측 3-c
add=0 del=0                                      ← renderMessage 불가침

$ grep -c "registerMessageDecorator(createRichContext)" web/app.js                      # 관측 4
1
$ grep -c "registerMessageDecorator(createRichContext(" web/app.js
0
$ grep -c "registerMessageDecorator(" web/app.js
2                                                ← 형제 정의 1 + 이 SPEC 배선 1
$ grep -c "createRichContext" web/app.js
3                                                ← 2 이상 (import 1 + 배선 1 + 주석 언급 1)

관측 5 — `✓ AC-WEBRICH-016 observation 5 wiring > web/app.js 가 registerMessageDecorator 에
createRichContext 를 실제로 등록한다 18ms` (nodes 1개, href /api/attachments/9)
```

### 전체 스위트·타입 게이트 (원문)

```
$ npm test -w server
 Test Files  14 passed (14)
      Tests  149 passed (149)
$ npm run typecheck -w server
(exit 0, 출력 없음)
$ npx vitest run --reporter=verbose   (server)
 Test Files  14 passed (14)
      Tests  149 passed (149)          ← skipped·todo 표시 없음 = 0. 이 SPEC 의 두 테스트 파일
                                         이름(web-permission-contract·web-rich)이 ✓ 목록에 나타남
```

기준선 대비: 12 files/134 tests → 14 files/149 tests (선행 web-shell·web-chat 포함 전부 GREEN).

### TDD RED 증거 (원문, 구현 전 캡처)

골격 A — rich.js 스텁(export 만 존재) 상태 (`/.moai/state/verify/webrich-m1/red-evidence.txt`):

```
 Test Files  1 failed (1)
      Tests  5 failed (5)
 FAIL … AC-001 … expected 'qwerz' … Received: null
 FAIL … AC-004 … expected 404 to be 201   ← 하네스에 초대 라우트 부재도 이 단계에서 발견
```

골격 B — rich.js 실구현 후·**배선 전** 상태 (`/.moai/state/verify/webrich-m2/red-evidence.txt`):

```
 Test Files  1 failed (1)
      Tests  1 failed | 9 passed (10)
 FAIL … AC-WEBRICH-016 observation 5 wiring … expect(nodes).toHaveLength(1)
 Received: length 0                        ← 배선 없으면 첨부 노드 0개 (MF-9 시나리오)
```

배선(M3) 후 동일 테스트 10/10 GREEN — RED→GREEN 전이가 배선 계약 자체를 검증했다.

### 변이 검증 (plan.md §G, 6건 전부 RED 전이)

| # | 변이 | 기대 | 관측된 출력 |
|---|------|------|-------------|
| 1 | `permissionRequestId` → `/[a-km-z]{5}/.exec(body)?.[0]` | AC-003 울음 | `FAIL … AC-003 … 1 failed \| 4 passed` |
| 2 | `decorate` 안 `resolved` 추적 제거 | AC-011 울음 | `FAIL … AC-011 … 1 failed \| 9 passed` |
| 3 | `attachmentUrl` 정수 검사 제거 | AC-009 울음 | `FAIL … AC-009 … 1 failed \| 9 passed` |
| 4 | `renderMessage` 통째 교체 | 관측 3 양수 | `add=4 del=2` |
| 5 | 배선 → `createRichContext({…}).decorate` 넘김 | 관측 4 둘째=1 + 관측 5 울음 | grep `0`/`1` + `FAIL … observation 5 wiring … 1 failed` |
| 6 | `.spec-base-sha` 삭제 | 관측 0 울음 | `fatal: Needed a single revision`, exit 128 |

변이 적용 후 전부 백업본으로 원복 — `diff /tmp/rich-backup.js web/rich.js`·`diff /tmp/app-backup.js web/app.js` 무차등 확인 후 최종 스위트 재GREEN.

### AC-015 [MANUAL] — 사람 눈 확인 (보류)

자동 검사 환경에서 브라우저를 띄울 수 없어 다섯 항목 모두 **미확인**. 시각 기준을 자동처럼 위장하지 않는다(§H 14). 운영자가 `npm run dev -w server` + 브라우저로 확인할 항목: (1) png 인라인 이미지 (2) pdf 칩 다운로드 (3) 칩 배경/링크색 (4) 명령 상자 `--md-bg-sidebar`·줄바꿈 4줄+ (5) 복사 전체성. **1번이 아니오이면 블로커** (서버 `content-disposition` 조정은 범위 밖 — plan.md §C·§E 위험 7). jsdom 검증 한계 내에서 근거가 되는 간접 확인: `#invite-command` 은 `white-space: pre` + `--md-bg-sidebar`, `.attachment` 칩은 `--md-bg-panel` + `--md-text-link` (AC-014 존재축 52개 토큰 참조).

### 골격 대비 조정 기록 (acceptance.md 제안본을 실행하며 고친 자리)

1. **골격 A `build()`에 `registerBotRoutes(app)` 추가** — permissions.test.ts 하네스는 초대 라우트를 등록하지 않아 AC-004 가 404 로 실패 (RED 단계에서 발견). 계약 검사가 실제 라우트를 지나야 하므로 하네스에 등록했다.
2. **`nextBotFrame` 은 원시 프레임 문자열 반환** — 골격의 `JSON.parse(await c.nextBotFrame())` 형태와 맞춤 (파싱은 호출처).
3. **jsdom 29 타입 충돌 회피** — jsdom 29 의 `HTMLElement.hidden` 타입이 `string | boolean`으로 넓혀져 `InviteNodes`의 `{ hidden: boolean }` 반공변 위치에서 TS2322. 골격 B의 `createElement('div')` 결과를 `as HTMLElement & { hidden: boolean }` 교차형으로 좁혔다. 구조적 형 계약 자체는 그대로.
4. **`permissionRequestId` 반환 `string | null`의 non-null 단언** — 사용처 직전 expect가 null 아님을 실질 보장; `!` + 주석으로 근거 명시 (tsc strict).
5. **JSON POST 헬퍼 `postJson` 별도** — permissions.test.ts의 `post()`는 FormData 전용이라 초대 발급(JSON 본문)에 재사용 불가.
6. **관측 5의 app.js 적재는 web-shell.test.ts 선례采用** — 쿼리스트링 URL 방식 대신 `vi.resetModules()` + `await import('../../web/app.js')` + `@ts-expect-error`(§4.8 계약 1 주석). 이미 두 선행 SPEC 테스트가 통과시킨 형태.
7. **REQUEST_BODY·RESOLVED_BODY·FAILED_BODY 상수의 출처** — 골격 A의 덤프 it 실행으로 브로커 실물을 콘솔에 출력(`--disableConsoleIntercept`)하고 그 값을 옮겨 적었다. 서버 템플릿이 바뀌면 덤프 it 출력이 달라져 상수 낡음을 실행으로 확인할 수 있다. FAILED_BODY(⚠️ 형태)를 AC-011 에 추가 반영(엣지 케이스 표).
8. **`server/vitest.config.ts`는 만들지 않았다** — 파일 단위 도크블록이 그대로 통과(14 files GREEN)하여 대체 경로 불필요.

### 환경 경로

- RED 증거: `.moai/state/verify/webrich-m1/red-evidence.txt`, `.moai/state/verify/webrich-m2/red-evidence.txt`
- AC-014 임시 추출: `/tmp/webrich-css.txt`, `/tmp/webrich-app-base.js`, `/tmp/webrich-range.txt`, `/tmp/webrich-app.diff`
- 선행 설치(`npm install`·`npm i -D jsdom`)는 워크트리 공유 작업으로 이미 완료 상태에서 시작 (server/package.json `jsdom ^29.1.1` 확인)

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-WEBRICH-001
spec_base_sha: 61cd828ec6d4c84a1909167969f8ec2619fa14f1
run_commits: [0605685, 97f42bf, 1f374d4, <M4>]
cycle_type: tdd
ac_total: 16
ac_pass: 15
ac_manual_pending: 1        # AC-015 — 사람 눈 5항목, 운영자 브라우저 확인 보류
ac_fail: 0
mutation_checks: 6/6 RED 전이
red_evidence: [.moai/state/verify/webrich-m1/red-evidence.txt, .moai/state/verify/webrich-m2/red-evidence.txt]
test_suite: "14 files / 149 tests GREEN (기준선 12/134 + 이 SPEC 2 files/15 tests)"
typecheck: exit 0
notes: >
  server/src 변경 0 (AC-016 관측 1). renderMessage 불가침 관측 3 add=0 del=0.
  배선 관측 4 네 수 1·0·2·3 + 관측 5 통과 — 이음새 마지막 한 줄이 실제 openRoom 경로에서
  첨부 노드를 만드는 것을 행위로 확인. AC-015 만 사람 손에 남는다.
```

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
