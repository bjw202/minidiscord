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
| 현재 상태 | `draft` — plan 단계 산출물 작성 완료, **감사 교정 라운드 반영(0.2.0)** |
| `spec.md` 판 | 0.2.0 |
| 감사 보고서 | `.moai/reports/t5/plan-audit.md` (2026-08-27, HEAD `6e9a167`) |
| 감사 판정 | 이 SPEC **CONDITIONAL PASS** / 카드 `t5` 통합 표면 **FAIL** |
| spec_base_sha | (run 단계 첫 동작으로 채운다) |

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

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
