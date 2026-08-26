# SPEC-BOT-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-BOT-001` |
| 칸반 카드 | `t2` (마일스톤 M2) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 5 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 5·7·9장 |
| 워크트리 | `.claude/worktrees/t2` (브랜치 `WT-auth-room-bot`) |
| 선행 SPEC | `SPEC-CORE-001` (카드 `t1`) → `SPEC-AUTH-001` → `SPEC-ROOM-001` |
| 실행 순서 | 카드 `t2` 의 세 SPEC 중 **세 번째(마지막)** |
| 현재 상태 | `draft` — plan 단계 완료 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-BOT-001
tier: M
card: t2
depends_on: [SPEC-CORE-001, SPEC-AUTH-001, SPEC-ROOM-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 5)
split_reason: "원본 초안 33 REQ / 27 AC — Tier L 상한 25/25 초과. 운영자 승인 아래 3분할."
spec_version: "0.3.0"
req_count: 9
ac_count: 11
tier_budget: "16 REQ / 16 AC"
spec_base_sha: "<run 단계 진입 시 기록 — M1 단계 0>"
plan_audit: .moai/reports/plan-audit/t2-3spec-audit.md
plan_audit_verdict: "FAIL (0.66) — 1차 교정 라운드 반영 완료"
plan_audit_iter2: .moai/reports/plan-audit/t2-3spec-audit-iter2.md
plan_audit_iter2_verdict: "PASS (0.92) — 남은 중대 2건(R1·R2) 반영 완료"
```

`spec_base_sha` 는 run 단계 첫 동작으로 채운다.

```bash
git rev-parse HEAD > .moai/specs/SPEC-BOT-001/.spec-base-sha
```

같은 값을 위 필드에도 옮겨 적는다. 이 SPEC 에서는 이 기준점 위에 검사 **두 개**가 올라간다 — `db.ts` 불변(REQ-BOT-009)과 "손댄 소스 파일은 `routes-bots.ts` 하나"(REQ-BOT-008). 둘 다 이전 판에서는 무력했다.

### plan-audit 교정 라운드 (v0.2.0)

`.moai/reports/plan-audit/t2-3spec-audit.md` 가 이 SPEC을 **FAIL (0.66 / 기준선 0.80)** 로 판정했다. 차단 2건·중대 4건·경미 3건을 전부 반영했다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| BOT-B1 (차단) | AC-BOT-003 의 `grep -c "SELECT .*token[^_]"` 는 `0` 을 기대하는데 **`0` 이 나올 수 없었다.** 모든 초대 쿼리가 `FROM bot_tokens` 를 읽고, `bot_tokens` 의 `token` 뒤 `s` 가 `[^_]` 에 맞는다. 감사자가 `plan.md` §D 1번이 지시하는 SQL 로 실행해 `1` 을 확인했다. 게다가 이 검사는 토큰 노출이 아니라 **소스의 줄바꿈 위치**를 재는 것이어서, 개행 하나로 통과시킬 수 있었다 | 실행 단언으로 교체했다 — 초대를 발급한 뒤 목록을 조회해 키가 정확히 세 개인지, 응답 본문에 발급 토큰 문자열이 없는지 관측한다. 저장값이 해시라는 나머지 절반은 AC-BOT-011 이 맡아, 두 기준이 REQ-BOT-002 를 함께 덮는다 |
| BOT-B2 (차단) | AC-BOT-009 와 Definition of Done 의 검사가 **실행 시점에 둘 다 무의미**했다. `git diff --stat HEAD -- db.ts` 는 M1 이 커밋한 변경을 못 보고, `--cached` 없는 `git diff --name-only` 는 M2 편집을 `git add` 한 뒤 아무것도 보고하지 않는다. "소스 파일 하나만 고쳤다"는 관문이 한 번도 무언가를 검사한 적이 없었다 | 두 명령 모두 `spec_base_sha` 기준으로 바꿨다. `git diff --name-only <sha> -- server/src` 의 출력이 정확히 `server/src/routes-bots.ts` 한 줄이어야 한다 |
| BOT-M1 (중대) | `spec.md` §1 이 "자기가 만든 활성 방"이라고 썼는데 `rooms` 에는 소유자 컬럼이 없다. 문장대로 구현하려면 스키마를 바꿔야 하는데 REQ-BOT-009 가 그것을 금지한다 — 문장과 제약이 정면 충돌이었다 | "자기가 만든"을 지우고, 왜 소유권 개념이 없는지(소유자 컬럼 없음, `req.user` 두 필드 고정, 방별 권한 YAGNI 배제)를 그 자리에 적었다 |
| BOT-M2 (중대) | `acceptance.md` 가 `build()` 헬퍼를 `SPEC-AUTH-001` 것이라고 적었으나 사실이 아니다. 그 SPEC 의 헬퍼는 `app` 하나만 돌려주고 `auth.test.ts` 안에 있으며 내보내지도 않는다. 이 SPEC 의 모든 시나리오가 쓰는 `{ app, cookie }` 헬퍼는 `SPEC-ROOM-001` 이 `rooms-bots.test.ts` 에 만드는 별개의 것이다 | `acceptance.md` 서두와 `plan.md` §A 를 사실대로 고치고, 두 동명 헬퍼가 다르다는 것을 양쪽에 명시했다. `SPEC-ROOM-001` 쪽에도 "이 헬퍼는 우리가 만든다"를 적어 두 문서가 같은 사실을 말하게 했다 |
| BOT-M3 (중대) | 초대 라우트가 어디에 등록되는지 `spec.md` 가 말하지 않았다. `plan.md` 만 "`registerBotRoutes` 안에"라고 알고 있었고, 그동안 REQ-BOT-008 은 `index.ts` 수정을 금지했다. `spec.md` 만 읽는 실행자가 새 등록 함수를 만들면 자기 SPEC 의 Definition of Done 을 깨뜨리게 돼 있었다 | REQ-BOT-001 에 "세 라우트는 `registerBotRoutes` 안에서 등록되어야 한다"를 명시하고, 그것이 REQ-BOT-008 을 만족 가능하게 만드는 조건임을 적었다. AC-BOT-009 의 세 번째 명령이 `index.ts` 수정을 기계적으로 잡는다 |
| BOT-M4 (중대) | 초대 실패가 없는 방과 보관된 방을 `403` 하나로 합쳐, 클라이언트가 구분할 수 없었다. `403` 은 권한 차원이 없는 이 시스템에서 가리킬 대상이 없고, `404` 의 주어가 보관 라우트와 달랐다 | 리드 판정에 따라 `SPEC-ROOM-001` 과 **같은 편집에서 함께** 고쳤다. `404` = 대상 없음(방/봇을 본문으로 구분), `409` = 상태 충돌. 경위는 `plan.md` §D 5번에 기록했다 |
| BOT-m1 (경미) | `grep -c ... \|\| echo 0` 은 결과가 겹쳐 나온다. `grep -c` 는 일치가 없으면 `0` 을 찍고 종료 코드 `1` 로 끝나므로 `echo 0` 이 한 번 더 붙어 "두 번째 grep 출력"이 무엇인지 불분명했다 | BOT-B1 교정으로 해당 `grep` 자체가 사라졌다. 남은 기준에는 이 형태를 쓰지 않는다 |
| BOT-m2 (경미) | `grep -c "token_hash"` 는 실행만 하고 기대값이 Then 절에 없어, 관측되지 않는 명령이었다 | 함께 삭제했다. 저장값 검증은 AC-BOT-011 이 실행으로 한다 |
| BOT-m3 (경미) | REQ-BOT-003 의 "활성 토큰 수는 정확히 1"에 단서가 없어, 동시 초대 시 2개가 될 수 있다는 엣지 케이스 행과 모순되게 읽혔다 | REQ-BOT-003 에 "단일 요청 처리 기준"을 넣고, 엣지 케이스 행에도 두 서술이 모순이 아님을 적었다 |

### plan-audit 2차 교정 라운드 (v0.3.0)

`.moai/reports/plan-audit/t2-3spec-audit-iter2.md` 가 이 SPEC 을 **PASS (0.92 / 기준선 0.80, 차단 0건)** 로 판정했다. 세 SPEC 가운데 가장 높은 점수이고, 1차 지적 9건은 모두 닫힌 것으로 확인됐다. 이번 라운드는 남은 **중대 2건만** 닫는다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| R1 (중대) | AC-BOT-009 의 `db.ts` diff 관측이 "비어 있음" 하나뿐이었다. M1 단계 0 을 건너뛰면 `$(cat …)` 이 빈 문자열이 되고 git 이 오류를 **표준 오류**로 낸 뒤 표준 출력을 비우므로, 그 관측만 조용히 성립해 버린다(네 번째 관측은 실패로 드러난다). BOT-B2 가 지적한 "관문이 한 번도 검사한 적이 없었다"와 같은 종류다 | AC-BOT-009 와 DoD 를 네 명령으로 나눴다. `git rev-parse --verify "$(cat …)^{commit}"` 이 **종료 코드 `0`** 으로 40자리 SHA 를 내는 것을 먼저 관측하고, 그 SHA 를 직접 넣은 `--stat`·`--name-only` 두 검사 모두 **종료 코드 `0`** 을 관측 조건에 넣었다. `plan.md` §F 단계 5 와 §H 에도 같은 조건을 적었다 |
| R2 (중대) | 이 SPEC 이 `routes-bots.ts` 에 더하는 `config.js` import 가 `rooms-bots.test.ts` 의 정적 import 사슬로 들어오면서, `SPEC-ROOM-001` 의 AC-ROOM-011 이 임시 디렉터리 대신 저장소의 진짜 `data/` 를 열게 될 예정이었다. `config.dataDir` 이 모듈 로드 시점에 굳는 평범한 속성이었기 때문이다 | `server/src/config.ts` 의 `dataDir` 이 게터로 고쳐졌다(카드 교차 수정 — `SPEC-CORE-001` 산출물을 `t2` 에서 수정, 사유는 `AC-ROOM-011` hermetic 보장). 기록은 `SPEC-ROOM-001` `plan.md` §D 8번에 있고, 이 SPEC 은 `plan.md` §E 위험 표·§H 안티패턴·§I 에서 그 의존을 명시한다 |

**이 SPEC 은 `config.port` 를 읽기만 한다.** AC-BOT-002 는 `config.port` 를 import 해 안내 문자열과 대조할 뿐 `MINIDISCORD_PORT` 를 설정하지 않으므로, `port` 가 즉시 평가로 남은 한계에 걸리지 않는다. 그 한계 자체는 `SPEC-ROOM-001` `plan.md` §D 8번과 §E 에 기록돼 있다.

**이번 라운드에서 닫지 않은 것.** 2차 보고서의 R5(AC-BOT-009 매트릭스 행이 REQ-BOT-001 을 빠뜨림)와 `POST` 초대 응답 키 집합 단언 제안은 경미·선택으로 분류돼 있고 이번 지시 범위 밖이라 그대로 둔다 — **미해결**이다.

### plan-audit 3차 교정 라운드 (v0.4.0)

`.moai/reports/plan-audit/t2-3spec-audit-iter3.md` 가 이 SPEC 을 **FAIL (0.90 / 기준선 0.80, 차단 2건)** 로 판정했다. 점수는 기준선을 넘겼고, 실패 사유는 점수가 아니라 차단 결함이다. 리드 지시에 따라 이번 라운드는 **D1 하나만** 닫는다.

| 지적 | 무엇이 문제였나 | 무엇을 고쳤나 |
|------|----------------|--------------|
| D1 (차단) | "이름 붙은 기존 테스트가 통과한다"를 관측 전부로 삼은 기준 두 개(AC-BOT-001·004)가 명령을 `npm test -w server` 로 지정했다. 기본 리포터는 파일 수와 테스트 수만 내보내고 테스트 이름은 한 줄도 내지 않으므로, 그 테스트를 아예 쓰지 않은 실행과 통과한 실행의 출력이 서로 같고 둘 다 종료 코드 `0` 이다. 원문 출력을 `§E.2` 에 그대로 남기는 절차적 보완도 여기서는 듣지 않는다 — 남길 출력 안에 테스트 이름 자체가 없기 때문이다 | 명령을 `npm test -w server -- --reporter=verbose` 로 바꾸고, 관측을 `✓ test/rooms-bots.test.ts > <describe 이름> > <테스트 이름>` 줄이 출력에 나타나는가 하나로 다시 썼다. AC 매트릭스 행과 Given-When-Then 본문을 함께 고쳐 둘이 어긋나지 않게 했다. `acceptance.md` 서두에 공통 조항을, `plan.md` §H 에 안티패턴을 더했다. `-t <이름>` 필터는 대안으로 쓰지 않는다 — 맞는 이름이 없으면 전부 건너뛴 채 종료 코드 `0` 이라 같은 결함이 되살아난다 |

**감사 목록과 실제 교정 범위.** 3차 보고서가 이 SPEC 에서 지목한 대상(AC-BOT-001·004)과 실제 교정 범위가 일치한다 — 두 건이다.

**이번 라운드에서 닫지 않은 것.** D2(원본 `plan-v2.md` 가 이 워크트리에도 git 에도 없는 문제)는 리드 판단 대기라 손대지 않았다 — **미해결**이다. 2차 보고서의 R3·R5 도 리드가 의도적으로 이월한 항목이라 그대로 둔다 — **미해결**이다. 지연 평가되지 않는 `config.port` 잔여 한계도 그대로다 — **미해결**이다.
**범위 밖으로 판단한 것.** `acceptance.md` AC-BOT-003 본문에는 `rooms-bots.test.ts` 의 원본 테스트 `lists invites without token` 도 함께 통과한다는 문장이 딸려 있다. 이 기준의 관측 대상은 그 문장이 아니라 기준이 직접 제시하는 테스트 본문(목록 응답의 키 집합과 평문 토큰 부재 단언)이고, 3차 보고서도 이 기준을 "쓸어도 남는 기준"으로 분류했다. 관측을 바꾸면 이미 건전한 기준을 건드리게 되므로 이번 라운드에서는 손대지 않았다 — 딸린 문장 하나가 **미해결**로 남는다.

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-BOT-001/spec.md` | GEARS 요구사항 9개 (REQ-BOT-001..009), 범위 밖 7개 항목, 제약, HISTORY 0.3.0 |
| `.moai/specs/SPEC-BOT-001/plan.md` | 의존 순서, 되돌리기 어려운 결정(토큰 계약 / 사람이 보는 계약), 원본 모순 5건(3번은 미해결 보존, 5번은 v0.2.0 실패 코드 이탈 기록), 위험 10건, 마일스톤 M1-M2, 안티패턴 14건 |
| `.moai/specs/SPEC-BOT-001/acceptance.md` | 수용 기준 11개 (AC-BOT-001..011), Given-When-Then 시나리오, 엣지 케이스 8건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-BOT-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-BOT-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

9개 REQ 전부가 하나 이상의 AC 에 매핑됐다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-BOT-001 | 초대 발급, 해시만 저장, `201` + 4필드, `registerBotRoutes` 안에서 등록 | AC-BOT-001, AC-BOT-008, AC-BOT-011, AC-BOT-009(등록 위치 — `index.ts` 미수정) |
| REQ-BOT-002 | 평문 토큰 재노출 금지 | AC-BOT-003(목록 응답에 토큰 없음), AC-BOT-011(저장값이 해시) |
| REQ-BOT-003 | 재초대 시 기존 토큰 철회, 활성 토큰 정확히 1 (단일 요청 기준) | AC-BOT-004 |
| REQ-BOT-004 | 실패 경로 — 없는 방 `404` / 보관된 방 `409` / 없는 봇 `404`, 본문으로 구분 | AC-BOT-005 |
| REQ-BOT-005 | 실행 명령 안내 4조각 + `config.port` | AC-BOT-002 |
| REQ-BOT-006 | 초대 목록, `online` 불리언 | AC-BOT-006 |
| REQ-BOT-007 | 철회 멱등 | AC-BOT-007 |
| REQ-BOT-008 | 범위 경계 — 여섯 파일, 새 소스 파일 없음, 손댄 파일은 `routes-bots.ts` 하나 | AC-BOT-009 (`spec_base_sha` 기준 `--name-only`) |
| REQ-BOT-009 | `SCHEMA` 불변 | AC-BOT-009 (`spec_base_sha` 기준 diff — 기준 SHA 확인과 diff 둘 다 종료 코드 `0` 관측) |
| (전 구간) | RED→GREEN 전이 증거 | AC-BOT-010 |

교차 SPEC 검증 하나: **AC-BOT-008** 은 `SPEC-ROOM-001` 의 **REQ-ROOM-005** ("방 보관 시 그 방의 활성 봇 토큰을 한 트랜잭션 안에서 일괄 철회한다")를 검증한다. 그 요구사항의 토큰 철회 절반은 초대가 존재해야만 관측할 수 있고 초대를 만드는 것이 이 SPEC이라, 검증만 여기로 옮겨 왔다. 구현 책임은 `SPEC-ROOM-001` 에 남는다.

**v0.4.0 (3차 교정) — 관측 형태만 바뀌었다.** 위 매핑은 그대로다. 요구사항도 수용 기준도 하나 늘거나 줄지 않았다. 바뀐 것은 두 개 기준(AC-BOT-001·004)이 **무엇을 보고 판정하는가**다 — `npm test -w server` 의 요약 줄과 종료 코드가 아니라, `npm test -w server -- --reporter=verbose` 출력의 `✓ test/rooms-bots.test.ts > <describe 이름> > <테스트 이름>` 줄이다. 이 기준들이 덮는 REQ-BOT-001·003 의 검증 강도가 그만큼 올라간다.

### 이 단계에서 하지 않은 것 (Gaps)

- 이 SPEC 의 산출물 코드는 한 줄도 작성하지 않았다. `server/src/routes-bots.ts` 의 초대 라우트와 대응 테스트 모두 미생성 — run 단계 소관이다. **예외 한 건**: v0.3.0 교정 라운드에서 `server/src/config.ts` 의 `dataDir` 이 게터로 바뀌었다(R2, `SPEC-ROOM-001` `plan.md` §D 8번). 이 SPEC 이 더할 `config.js` import 가 그 수정을 필요하게 만든 원인이다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. `npm test -w server` 가 현재 몇 개 통과하는지 **미검증**이다.
- ~~`SPEC-AUTH-001` 과 `SPEC-ROOM-001` 의 파일을 읽지 않았다~~ — **v0.2.0 교정 라운드에서 해소됨.** 세 SPEC 을 한 세션이 함께 들고 고쳤다. `SPEC-ROOM-001` 의 보관 요구사항 번호는 **REQ-ROOM-005 로 확정**됐고 AC-BOT-008 이 그 번호를 인용한다. 최초 작성 시 상대 문서를 못 본 것이 이번 감사에서 지적된 교차 SPEC 결함(BOT-M2 헬퍼 오기, BOT-M4 실패 코드 불일치)의 원인이었다.
- 원본 `plan-v2.md` Task 6 이후(메시지·멘션·SSE·게이트웨이)는 읽지 않았다. 이 SPEC 범위 밖이다.
- `plan.md` §D 3번(채널 설정 전달 방식: 실행 인자 대 환경변수)은 **의도적으로 미해결**이다. 리드 판정에 따라 Global Constraints 를 따르되 기록을 보존했고, 카드 `t4` 에서 재확인한다.

---

## §E.2 Run-phase Evidence

_<pending run-phase>_

---

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

---

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
