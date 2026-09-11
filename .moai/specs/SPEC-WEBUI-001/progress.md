# SPEC-WEBUI-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC | SPEC-WEBUI-001 |
| Tier | M |
| 상태 | draft |
| 방법론 | tdd |

---

## §E.1 Plan-phase Audit-Ready Signal

plan 단계 산출물 넷 + 감사 보고서 둘. **1회차 FAIL(0.52) → 2회차 CONDITIONAL PASS(0.80) → 이 기록은 2회차 조건 넷을 닫은 뒤의 상태다.**

| 항목 | 값 |
|------|-----|
| 요구사항 | 16 (Tier M 상한 16) — 두 교정 라운드에서 **한 번도 늘거나 줄지 않았다** |
| 수용 기준 | 16 (Tier M 상한 16) — 같음. 늘어난 것은 기준의 **단언 수**뿐이다 |
| 감사 1회차 | FAIL 0.52 · `plan-audit.md` — blocking 12 (F1~F12). **전부 닫힌 것으로 2회차가 검증** |
| 감사 2회차 | CONDITIONAL PASS 0.80 · `plan-audit-2.md` — 교정이 만든 새 blocking 4 (N1~N4) + optional 5 |
| 이번 라운드에 닫은 것 | N1·N2·N3·N4 (조건 넷) + M0 의 `expect` import 누락 + N5·N6·N7·N8·N9 + F15 잔여 |
| 가장 중요했던 것 | **N3** — `cssRuleBlock` 이 **첫 매치**를 돌려주는데 §B.6 은 새 선언을 파일 **끝**으로 보냈다. 기존 선택자 셋(`.room-item`·`.room-item.active`·`.archive-btn`)에서 **올바른 구현이 붉어질** 상태였다. 1회차 F3 과 같은 형태이며 원인만 이스케이프에서 매치 순서로 옮겨 갔다 |
| 미결 표시 | 0 |
| 승인된 범위 확장 | `GET /api/auth/me` 1건 (`spec.md` §4.5) |
| 서버 변경 | `server/src/auth.ts` — 라우트 등록 한 곳 + 거짓이 된 `@MX:NOTE` 되쓰기. `requireAuth` 본문 불변 |
| 계약 개정 | 2 (`spec.md` §5). 되쓰기 대상은 **넷** (`web/app.js` 둘 + `server/src/auth.ts` + `server/test/auth-name.test.ts`) |
| Tier | **M 유지** — 파일 9개(공유 헬퍼 포함)·약 600~700 LOC. 2회차 감사도 M 에 동의. 재판정 근거와 Tier L 전환 조건은 `plan.md` §B.8 |
| 마일스톤 | 6 (M0 시험 골격 정비 → M1 메시지 → M2 사이드바 → M3 라우트·배선 → M4 작성기 → M5 마감) |

**부류 단위로 훑은 결과** — 감사가 지목한 인스턴스만 고치지 않고 각 결함의 부류를 기계적으로 훑었다: 선언 중복 0건(**25개** ts 블록 전수 파싱), 타입 미주석 콜백 0건, 널 역참조 0건, `^//` 앵커 0건, 기대값 0 인 맨 `grep -c` 0건, 행 번호 인용 0건. `cssRuleBlock` 대상 선택자 **열넷**(고유 기준)을 전부 `style.css` 와 대조해 기존 규칙 블록이 있는 일곱을 가려냈고, 그중 이 SPEC 이 **고치는 다섯**(선언 추가 넷 + 삭제 하나)을 §B.6 의 제자리 편집 대상으로 못 박았다.

**모집단 수 정정 (3회차 감사 D5).** 위 세 수는 2회차 교정 «도중» 에 잰 값이 그대로 남아 있던 것이다 — 그 뒤 `css-rule.ts` 모듈 예시 블록과 `#new-room-btn, #new-bot-btn` 선택자를 더하면서 24→25, 열셋→열넷으로 늘었고, `plan.md` 에 맨 행 번호 인용 둘이 남아 있었다(이번에 grep 앵커로 바꿨다). **결론(각 부류 잔존 0건)은 그대로이고 모집단 크기만 틀렸다.**

**4회차 재감사 (run-gate 재실행).** 3회차 PASS(1.00) 뒤 0.4.1·0.4.2 두 편집 라운드로 plan-artifact hash 가 바뀌어 skip 조건(③ 산출물 무변경)이 깨졌고, run 게이트 계약에 따라 재감사를 실행했다.

- audit_verdict: PASS
- audit_report: .moai/specs/SPEC-WEBUI-001/plan-audit-4.md
- audit_at: 2026-09-11T00:35:58Z
- auditor_version: plan-auditor (run-gate 재실행 — 3회차 PASS 후 산출물 0.4.1·0.4.2 편집)
- audit_score: 1.00 (Clarity 1.00 · Completeness 1.00 · Testability 1.00 · Traceability 1.00; Tier M 통과선 0.80; must-pass 7/7)
- plan_artifact_hash: e4cd2f0108a388e84b46b3aebecf6cffff3577366a6471f024a900311192fffd
- depends_on 확인 (오케스트레이터 직접 관측): SPEC-WEBSHELL-001 `completed` · SPEC-WEBCHAT-001 `completed` · SPEC-AUTH-001 은 보관용 단일 파일(`SPEC-AUTH-001.md`)로 `status:` 필드 없음 — 미충족 판정, R4-1 블로커로 사용자 처분 대기
- optional_findings: R4-1 (depends_on pre-flight 블로커) · R4-2 (HISTORY 남은 `^//` 셈 표기 — 방치 권고) · R4-3 (§3 requireAuth 출처 표기 부정확 — 방치 가능)

## §E.2 Run-phase Evidence

run 단계 전체를 격리 워크트리(`.claude/worktrees/agent-ad4767d4c67ee092f`)에서 수행했다. Route A(Hybrid Trunk): 마일스톤마다 커밋하고 `git push origin HEAD:main` 로 main 에 직접 반영했다. 기준 SHA(`.spec-base-sha`) = `325e80a`(plan 산출물 커밋).

### 사전 점검 (plan.md §C — 실측)

- `npm test`(baseline): server 19 files / 247 tests + channel 6 files / 103 tests 전부 통과 — 사전 결함 0건
- `npm --prefix server run typecheck`: exit 0
- 기준선 greps: style.css 색 리터럴 **0** · `font-size` 35−24=**11** · `index.html`/`app.js` SVG 색 **0·0** — plan.md §A 와 전부 일치
- 앵커 실측: app.js 64행(방 행 계약)·377행(메시지 계약), auth.ts 20행(@MX:NOTE), auth-name.test.ts 126행 — grep 으로 확인

### M0 — 시험 골격 정비 (commit 9b03ff5)

- `cssRuleBlock` 을 `server/test/css-rule.ts` 로 이동(export + `import { expect } from 'vitest'` 동반), web-shell 호출 세 자리를 import 로 전환. `bootVisual()` 추출 — 기존 `it` 의 단언 넷은 한 글자도 안 바꿨다.
- 검증: `npm --prefix server run typecheck` exit 0 · `npm --prefix server test` **19 files / 247 tests** 전부 통과(골격 이동이 단언 의미를 바꾸지 않았다는 증거).
- **[실행 조정 1건]** vitest 4.1.11 은 `it` 이 없는 describe 를 `Error: No test found in suite` 로 실패시킨다(실측 — 최초 `npm test` 에서 2 파일 실패). plan.md M0 3단계가 말하는 «describe 블록 첫머리 헬퍼 정의»를 모듈 스코프 정의로 바꾸고 describe 는 첫 AC `it` 과 함께 열었다(M1/M2). 의도(그 파일에 없는 헬퍼의 «지역 정의», 타 파일 import 금지)는 그대로 지켰다.

### M1 — 메시지 표면 C2 (commit fc637a4)

**RED**(`npx vitest run test/web-chat.test.ts`, 구현 직전): 새 `it` 4개 전부 붉게 실패.

```
FAIL  SPEC-WEBUI-001 메시지 표면·작성기 > adds an avatar column while keeping head and body as direct children
AssertionError: expected [ 'msg-head', 'msg-body' ] to deeply equal [ Array(3) ]
- Expected / + Received
  [
-   "msg-avatar",
    "msg-head",
    "msg-body",
  ]
FAIL  … > assigns a deterministic role color per author
TypeError: Cannot read properties of undefined (reading 'className')   // .msg-avatar 없음
FAIL  … > marks bots with a non-color badge …
AssertionError: expected +0 to be 1                                     // .bot-badge 0개
FAIL  … > keeps the avatar in the DOM on continuation rows …
AssertionError: expected null not to be null                            // .turn-cont .msg-avatar 없음
      Tests  4 failed | 45 passed (49)
```

**GREEN**: `npm --prefix server run typecheck` exit 0 · J2 **49 passed (49)** · J3(실브라우저) ✓ `keeps a decoration node out of the 40px avatar column (real browser)` **284ms — skip 아님** · `npm test` **252 + 103 전부 통과**.

### M2 — 방 목록·계정 바 C1+C4 (commit 9f7c510)

**RED**(J1): 새 `it` 7개 전부 실패 — `.room-hash`/`.room-name` querySelector null(TypeError), `.room-item` 블록에 `height: 26px` 부재, `aria-label` null, `.room-item.active` 에 inset box-shadow 부재, `#new-room-btn, #new-bot-btn` 규칙 부재(cssRuleBlock 예외), `.account-bar` null. `Tests  7 failed | 18 passed (25)`.
**뒤 겹 RED**(J3 실브라우저): `× renders every room row at the same fixed height (real browser)`.
**GREEN**: J1 **25 passed (25)** · J3 ✓ `renders every room row at the same fixed height (real browser)` **269ms** · 전체 **260 + 103**.
**[§5.3 훑기에서 잡은 실제 회귀 1건]** 첫 풀 런에서 `AC-WEBMD-010 no images no markup APIs` 실패 — `innerHTML = ARCHIVE_ICON` 이 SPEC-WEBMD-010 REQ-WEBMD-005(«web/ 의 .js 는 innerHTML 에 빈 문자열만») 위반. 보관 아이콘을 `createElementNS` 조립으로 고쳐 계약을 준수하게 했다(정적 마크업에도 걸리는 전칭 계약 — 구현 방식 교정이지 기준 완화 아님). 수정 뒤 전체 260+103 초록.

### M3 — 라우트·배선 §4.5 (commit 3a8c147)

**RED**: J5 `expected 404 to be 401`(라우트 없음)·`expected false to be true`(hasRoute false) — 2 it 실패; J1 AC-014 첫 it `expected [] to have a length of 1 but got +0`(/api/auth/me 호출 0회). `Tests  2 failed | 7 passed (9)` / `1 failed | 26 passed (27)`.
- AC-014 둘째 it(`does not put the /me call inside login()`)은 **구현 전 초록이 옳다** — login() 호출 순번의 회귀 가드로, 붉어지는 상태는 «login() 본문에 /me 를 넣는» 변이뿐이다.
**[실행 중 결함 1건]** 첫 GREEN 시도에서 평범한 JS 인 app.js 에 TS 전용 `!` 넌널 단언을 써 `RolldownError: Parse failure`(254:38)로 web-shell 18테스트 실패 — 풀 런에서 잡아 JS null 가드로 교정.
**GREEN**: typecheck exit 0 · J5+J1 합쳐 **36 passed (36)** · 전체 **264 + 103** — 보호 라우트 형제 시험(rooms-bots·messages·permissions·sse) 전부 초록(`requireAuth` 를 읽기만 했다는 증거).

### M4 — 작성기 C3 (commit e31dfba)

**RED**(J2): `#composer-box` null·첨부 svg null·`aria-disabled` null(`expected null to be 'true'`)·전이 it `expected 'false' to be 'true'` — 4 it 실패. 뒤 겹(J3): `× lets the composer container span the chat column (real browser)` — `#composer-box` 대기 30초 시간 초과.
**GREEN**: typecheck exit 0 · J2 **53 passed (53)** · J3 ✓ `lets the composer container span the chat column (real browser)` **226ms** · 전체 **269 + 103**.

### M5 — 마감 검사

AC-015 관측 블록(`bash .moai/state/verify/webui001-m5/ac-015.sh`, acceptance.md 원문 그대로 — 증거 보존):

```
PASS  base-sha
PASS  style.css 색 리터럴  (0)
PASS  index.html SVG 색  (0)
PASS  app.js SVG 색  (0)
PASS  토큰 아닌 font-size 총량  (11 ≤ 11)
PASS  더한 줄의 비-토큰 font-size  (0)
PASS  더한 줄의 색 리터럴  (0)
PASS  끝 블록에 기존 선택자 재정의  (0)
--- server/src·channel 변경 목록 ---  server/src/auth.ts   (한 줄, 기대와 같음)
PASS  requireAuth 본체 변경  (0)
--- 바뀤 파일 ---  server/src/auth.ts · web/app.js · web/index.html · web/style.css  (넷, 기대와 같음)
PASS  id hygiene describe 실재  (1)
web-shell exit=0
```

AC-016 관측 블록(`ac-016.sh`, 원문 그대로):

```
PASS  옛 계약 1 (app.js 방 행)  (0)      PASS  새 계약 1  (1)
PASS  옛 계약 2 (app.js 메시지)  (0)     PASS  새 계약 2  (1)
PASS  옛 계약 3 (auth.ts)  (0)           PASS  새 계약 3  (1)
PASS  옛 계약 4 (auth-name.test.ts)  (0) PASS  새 계약 4  (1)
npm test exit=0
```

J3 종료 시점 재실행(실브라우저, skip 없음): `✓ D-3 … 719ms · ✓ 아바타 칸 … 281ms · ✓ 행 높이 … 218ms · ✓ 컨테이너 폭 … 232ms — Tests 4 passed (4)`. `npm --prefix server run typecheck` exit 0.

### spec.md §5.3 형제 시험 대조표 — 전 행 실행 결과

| 자리 | 결과 |
|------|------|
| web-shell `AC-WEBSHELL-010`(textContent toContain·archive-btn 유무·active) | **통과** — 매 마일스톤 풀 런에서 초록(span 분해에 둔감한 toContain 예측 그대로) |
| web-shell `REQUIRED_IDS`(영속 20, logout-btn 포함) | **통과** — id hygiene describe 실재 1 + web-shell exit=0(AC-015 (7)) |
| web-chat `.msg-head > strong` / `.msg-head > span` | **통과** — 사람 메시지 단언 그대로(배지는 봇에만) |
| web-chat `.message > .msg-head > strong` / `> .msg-body` 개수 | **통과** — 그리드 결정이 이것 때문이다(§B.2) |
| web-chat `bot-color-[1-5]` | **통과** — 이름 색 규칙 무변경 |
| web-markdown `.msg-body` 첫 블록 정규식(pre-wrap 부재) | **통과** — 제자리 편집이 grid-column/grid-row 만 더했다(white-space 미추가) |
| web-visual | **통과** — `bootVisual()` 추출로 구조 변경, 기존 단언 넷 한 글자 미변경 |
| rich.js appendChild + 개수 단언 셋(web-chat·web-markdown) | **통과** — 노드 개수 불변, 렌더 폭은 AC-006 뒤 겹이 잔다 |
| auth-name `'regist'` 단언 | **통과** — 라우트 셋에도 침묵(예측 그대로), AC-016 grep 이 관측을 대신한다 |
| auth.ts 소비 보호 라우트 시험 전부 | **통과** — M3 뒤 풀 런 264+103 초록 |

### tdd 규약 준수 기록과 미관측(정직 목록)

- AC-006 뒤 겹(장식 노드 렌더 폭)은 **구현 전 상태에서 붉을 수 없다** — 그리드가 없으면 탐침이 원래 폭으로 흐른다. 이 관측이 겨누는 것은 «그리드 있음 + catch-all 규칙 없음»의 중간 상태이며, 앞 겹(J2 RED)이 이 기준의 RED 증거다.
- AC-014 둘째 it 도 같은 부류다 — login() 순번이 올바른 지금 초록이 맞으며, 변이 시에만 붉어진다.
- `.message:not(.turn-cont)` 제자리 편집에서 `border-top` 과 함께 짝이던 `padding-top: var(--md-space-3)` 를 함께 걷었다 — 두 선언은 같은 커밋의 구분선 처리였고 REQ-WEBUI-005 의 «메시지 패딩 space-1 space-2» 가 새 기준이다.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-09-11T01:23:22Z
run_commit_sha: pending-backfill-m5
run_status: complete
ac_pass_count: 16
ac_fail_count: 0
preserve_list_post_run_count: 7   # 위임 프롬프트 §D PRESERVE 7건 전부 무변경(design-tokens.css 0줄·requireAuth 본체·app.js 동결 표면·형제 단언·opacity 감춤·aria-disabled·CSS 제자리 편집)
l44_pre_commit_fetch: "git fetch origin main && git rev-list --count --left-right origin/main...HEAD → 0 0 (동기화)"
l44_post_push_fetch: "git push origin HEAD:main 성공 후 origin/main...HEAD → 0 0"
new_warnings_or_lints_introduced: 0   # 이 저장소 게이트는 tsc --noEmit(strict) + vitest — 둘 다 종료 코드 0, 새 진단 없음
cross_platform_build:
  applicable: false
  note: "Node 워크스페이스 — server typecheck(tsc strict)·vitest 가 품질 게이트(별도 lint 스크립트 없음)"
total_run_phase_files: 11   # 구현 9(web/app.js·web/index.html·web/style.css·server/src/auth.ts·시험 4·css-rule.ts) + spec.md frontmatter + progress.md §E.2/§E.3 (그 외 .spec-base-sha 1건 — plan.md §C 가 명령으로 요구)
m1_to_mN_commit_strategy: "마일스톤당 1커밋(M0 9b03ff5·M1 fc637a4·M2 9f7c510·M3 3a8c147·M4 e31dfba·M5 + SHA 백필) — 각 커밋 직후 git push origin HEAD:main (Route A Hybrid Trunk)"
```

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
