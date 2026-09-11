# SPEC-WEBATTACH-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-09-11
spec_version: "0.2.0"
tier: M
artifacts: [spec.md, plan.md, acceptance.md]
requirements: 15
acceptance_criteria: 13
human_observations: 3
plan_audit_round_1:
  verdict: FAIL
  score: 0.71
  report: .moai/reports/plan-audit/SPEC-WEBATTACH-001-2026-09-11.md
  blocking_findings: 8      # B1~B8 — 0.2.0 에서 전부 반영
  run_phase_findings: 11    # R1~R11 — R11 은 「번호를 옮기지 않는다」로 대응(사유는 spec.md 0.2.0 HISTORY 와 보고 요약)
  blocking_human_gate: HO-1 # acceptance.md §D.2 — 미검증인 동안 status: completed 에 이르지 못한다
```

### 0.2.0 재측정 기록 (VCI baseline-attribution)

```
$ cd server && npx vitest run test/<임시 탐침>.test.ts     # @vitest-environment jsdom, 실행 후 삭제
{"ClipboardEvent":"undefined","DataTransfer":"undefined","DragEvent":"undefined",
 "File":"function","Blob":"function","FileList":"function",
 "create":"function","revoke":"function","node":"v24.12.0","jsdom":"29.1.1"}
 called=blob:nodedata:9d1d5dac-25ca-4fe0-9aca-7328fddb41d2 | revoke=ok

# 문서 청취자 누적 — loadApp 2회 흉내 + drop 1회 발화
모듈 플래그 가드 2회 발화 / 문서 표지 가드 1회 발화 (합 3)
```

관측 시각: 2026-09-11. 관측 기준 HEAD: `49bf601`. 탐침 파일은 삭제했고 `git status --short server/test/` 가 빈 출력임을 확인했다.

## §E.2 Run-phase Evidence

### 기준선 (VCI baseline-attribution)

- **pre-flight HEAD**: `49bf601b550c3ef7f17d439ca5c4ea579cc51cd1` — 아래 모든 `git diff` / `git log` 비교가 이 SHA 위에서 돈다
- **run 종료 HEAD**: `a44ecf8f5361b0e5f6435505d2efb8fbcd7b4ee7`
- **작업 위치**: 격리 워크트리 `.claude/worktrees/agent-a8a15ee3b38e6b43e`(브랜치 `worktree-agent-a8a15ee3b38e6b43e`, pre-flight HEAD 는 `main` 과 동일). SPEC 산출물이 `main` 쪽에 커밋되지 않은 untracked 상태였으므로 워크트리로 복사해 함께 커밋했다. 통합은 오케스트레이터 몫이다
- **관측 시각**: 2026-09-11

### pre-flight 실측 (plan.md §C)

```
$ grep -cE "paste|dragover|dragenter|dragleave|createObjectURL" web/app.js
0
$ for p in navigator.platform navigator.userAgent navigator.vendor metaKey ctrlKey; do printf "%-22s %s\n" "$p" "$(grep -c -- "$p" web/app.js)"; done
navigator.platform     0
navigator.userAgent    0
navigator.vendor       0
metaKey                0
ctrlKey                0
$ grep -c "await loadApp(" server/test/web-chat.test.ts
55
```

세 값 모두 `spec.md` §1.1·`plan.md` §C 가 적은 값과 일치한다.

### RED 증거 (E8 — 구현 «전» 에 관측한 실패 출력, 축자)

**M1 RED** — 붙여넣기 경로 부재. `cd server && npx vitest run test/web-chat.test.ts -t 'AC-WEBATT'`

```
 ❯ test/web-chat.test.ts (59 tests | 4 failed | 53 skipped) 65ms
     × appends the pasted file, swallows the paste, and sends exactly one file part 39ms
     × names the pasted capture by local clock and puts it on the File itself 6ms
     × derives the extension from the clipboard MIME (png / jpg / gif) 12ms
     × never silently drops the second paste and never repeats a name 4ms

 FAIL  test/web-chat.test.ts > AC-WEBATT-001 ... > appends the pasted file, ...
AssertionError: expected +0 to be 1 // Object.is equality
- Expected
+ Received
- 1
+ 0
 ❯ test/web-chat.test.ts:1413:33
```

의도한 이유로 붉었다 — 칩이 0개다(붙여넣기를 듣는 곳이 없다). AC-004·005 는 이 시점에도 초록이며 그래야 한다: 둘 다 「아무것도 달라지지 않았다」를 재는 기준선 비교다.

**M2 RED** — 드롭 경로·문서 가드 부재. 같은 명령, `-t 'AC-WEBATT-006'` / `-t 'AC-WEBATT-008'`

```
 FAIL  AC-WEBATT-006 ... > takes text, image and typeless files alike and sends all three
AssertionError: expected +0 to be 3 // Object.is equality
- 3
+ 0
 ❯ test/web-chat.test.ts:1511:33

 FAIL  AC-WEBATT-008 ... > prevents all three events and leaves the list untouched
AssertionError: dragenter 은 막혀야 한다: expected false to be true // Object.is equality
- true
+ false
 ❯ test/web-chat.test.ts:1561:55
```

AC-009(비파일 끌기는 손대지 않는다)는 이 시점에도 초록이다 — 아무것도 가로채지 않는 상태가 정답이기 때문이고, 구현 뒤에도 초록이어야 한다.

**M3 RED** — 썸네일 분기·객체 URL 지도·CSS 규칙 부재. `-t 'AC-WEBATT-01'`

```
 ❯ test/web-chat.test.ts (72 tests | 4 failed | 63 skipped) 81ms
     × ① draws one thumbnail chip and one name chip, and chipNames() ignores the image 46ms
     × ③ keeps an image filename as text in alt — exactly one img, the thumbnail itself 13ms
     × creates once per file and revokes on ✕, on clear, but never on a failed send 3ms
     × styles the three new selectors with design tokens only 1ms

AssertionError: expected +0 to be 1            ← span.file-chip-image 가 0개
AssertionError: expected "vi.fn()" to be called 1 times, but got 0 times   ← createObjectURL 미호출
AssertionError: style.css 에 .file-chip-image 규칙이 있어야 한다: expected -1 to be greater than or equal to 0
```

셋 다 의도한 이유로 붉었다.

### AC 이분 판정표 (13개)

| AC | 판정 | 실행 명령 | 관측된 출력 |
|----|------|-----------|-------------|
| AC-WEBATT-001 | PASS | `npx vitest run test/web-chat.test.ts -t 'AC-WEBATT-001'` | `✓ appends the pasted file, swallows the paste, and sends exactly one file part` |
| AC-WEBATT-002 | PASS | 같음 `-t 'AC-WEBATT-002'` | `✓ names the pasted capture by local clock and puts it on the File itself` · `✓ derives the extension from the clipboard MIME (png / jpg / gif)` |
| AC-WEBATT-003 | PASS | 같음 `-t 'AC-WEBATT-003'` | `✓ never silently drops the second paste and never repeats a name` |
| AC-WEBATT-004 | PASS | 같음 `-t 'AC-WEBATT-004'` | `✓ leaves defaultPrevented false and the attachment list untouched` |
| AC-WEBATT-005 | PASS | 같음 `-t 'AC-WEBATT-005'` + `grep -c` × 5 | `✓ keeps all five stems at zero occurrences in web/app.js` — 다섯 어간 전부 0 (위 pre-flight 블록과 같은 값, 즉 「늘지 않았다」) |
| AC-WEBATT-006 | PASS | 같음 `-t 'AC-WEBATT-006'` | `✓ takes text, image and typeless files alike and sends all three` |
| AC-WEBATT-007 | PASS | 같음 `-t 'AC-WEBATT-007'` | `✓ pairs dragenter and dragleave by depth and clears on drop` |
| AC-WEBATT-008 | PASS | 같음 `-t 'AC-WEBATT-008'` | `✓ prevents all three events and leaves the list untouched` |
| AC-WEBATT-009 | PASS | 같음 `-t 'AC-WEBATT-009'` | `✓ leaves defaultPrevented false on all four events` |
| AC-WEBATT-010 | PASS | 같음 `-t 'AC-WEBATT-010'` | `✓ ①` · `✓ ②` · `✓ ③` 세 갈래 전부 초록 |
| AC-WEBATT-011 | PASS | 같음 `-t 'AC-WEBATT-011'` | `✓ creates once per file and revokes on ✕, on clear, but never on a failed send` |
| AC-WEBATT-012 | PASS | 같음 `-t 'AC-WEBATT-012'` | `✓ falls back to the name chip instead of throwing` |
| AC-WEBATT-013 | **PASS-WITH-DEBT** | 아래 다섯 불릿을 따로 잰다 | 네 불릿 PASS, 「`npm test` 전체 초록」 불릿 **FAIL** — 원인은 이 SPEC 의 변경이 아니라 교차 SPEC 충돌이다(아래 §충돌) |

전체 파일 판정:

```
$ cd server && npx vitest run test/web-chat.test.ts
 Test Files  1 passed (1)
      Tests  72 passed (72)
```

72개 = 기존 53개 + 이 SPEC 이 더한 19개. 기존 53개는 한 번도 붉어지지 않았다.

### AC-WEBATT-013 불릿별 판정

| 불릿 | 판정 | 명령 | 출력 |
|------|------|------|------|
| 기존 describe 초록 + 시험 파일은 **추가 라인만** | PASS | `git diff 49bf601 -- server/test/web-chat.test.ts \| grep '^-' \| grep -v '^---' \| wc -l` | `0` (제거·변경 0줄) |
| PRESERVE 경로 무변경 (작업 나무) | PASS | `git diff --stat -- server/src web/rich.js web/rich.d.ts web/markdown.js web/markdown.d.ts web/design-tokens.css web/index.html` | 빈 출력 |
| PRESERVE 경로 무변경 (커밋까지) | PASS | `git log --oneline 49bf601..HEAD -- <같은 집합>` | 빈 출력 |
| `aria-disabled` 전용 + 문서 배선 1회 + CSS 셀렉터 셋 | PASS | `npx vitest run test/web-chat.test.ts -t 'AC-WEBATT-013'` | 네 `it` 전부 초록 |
| `npm run typecheck -w server` 종료 코드 0 | PASS | `npm run typecheck -w server` | `> tsc --noEmit` 뒤 무출력, `exit=0` |
| `npm test` 전체 초록 | **FAIL** | `npm test` | `Test Files 1 failed \| 18 passed (19)` · `Tests 1 failed \| 297 passed (298)` (channel 워크스페이스는 `6 passed` / `103 passed`) |

보조 관측 — 원문 청취자 세기(결론의 근거가 아니라 옆에 두는 증거):

```
$ for t in paste drop dragover dragenter dragleave; do printf "%-10s %s\n" "$t" "$(grep -c "addEventListener('$t'" web/app.js)"; done
paste      1
drop       1
dragover   1
dragenter  1
dragleave  1
```

### 충돌 — `npm test` 를 붉게 만드는 유일한 실패 (이 SPEC 의 결함이 아니다)

```
 FAIL  test/web-markdown.test.ts > AC-WEBMD2-007 integration and preserve baseline
       > renders the badge through the real app path and keeps every PRESERVE surface intact
AssertionError: expected 'f2c114d feat(SPEC-WEBATTACH-001): M2 …' to be '' // Object.is equality
+ f2c114d feat(SPEC-WEBATTACH-001): M2 작성기에 떨군 파일을 받고, 영역 밖 드롭은 삼킨다
+ bbfda8d feat(SPEC-WEBATTACH-001): M1 캡쳐를 입력칸에 바로 붙여넣는다
 ❯ test/web-markdown.test.ts:803
```

무엇인가: `SPEC-WEBMD-002`(상태 `completed`)가 자기 pre-flight HEAD 를 **영구 시험 파일에 상수로 박고**(`web-markdown.test.ts:728` `PRE_FLIGHT_HEAD = '67db21a…'`), 그 기준선 이후 `web/app.js web/rich.js web/markdown.d.ts server/src` 에 커밋이 **없음**을 단언한다(`:803`). run 단계에서만 참인 명제가 영구 회귀 시험이 된 것이라, `web/app.js` 를 정당하게 고치는 «뒤따르는 모든 SPEC» 이 이 단언을 붉게 만든다. 이 SPEC 이 그 첫 번째다.

왜 여기서 고치지 않았는가: `server/test/` 의 다른 시험 파일은 이 SPEC 의 파일 목록(`plan.md` §A.6, 3개)에도 없고 §A.7 PRESERVE 산문 불릿(「그 밖의 모든 시험 파일」)이 명시적으로 보호한다. 완료된 SPEC 의 run 단계 기준선이 파일 하나를 영구히 얼릴 권한을 갖는가는 **교차 SPEC 정책 판단**이지 구현자의 재량이 아니다. 그래서 고치지 않고 블로커로 올린다.

제안하는 최소 수리(오케스트레이터/운영자 처분 사항): `web-markdown.test.ts:803` 의 경로 집합에서 `web/app.js` 를 뺀다. 그 단언이 원래 지키려던 것(WEBMD-002 가 `app.js` 를 건드리지 않았다)은 이미 그 SPEC 의 sync 로 확정됐고, 남은 것은 미래를 향한 족쇄뿐이다. 같은 함정을 되풀이하지 않도록 `plan.md` §G 에 안티패턴 한 줄을 추가해 두었다.

### 사람 관측 (HO-1~HO-3) — HO-2 관측됨, HO-1 절반, HO-3 미검증

| 항목 | 상태 | 근거 |
|------|------|------|
| **HO-1** 맥·윈도우 실제 캡쳐 붙여넣기 | **부분 관측 — 관문 닫힘 유지** | macOS 에서 관측됨(아래 관측 기록). Windows 는 미관측이므로 다섯 값 중 Windows 항이 비어 있고, **`acceptance.md` §D.2 의 차단 관문은 열리지 않는다** — `status: completed` 로 전이하지 않는다 |
| **HO-2** 드롭 표시·썸네일 생김새 | **관측됨** | 운영자 제출 화면 캡쳐 2장. 이미지 3장이 썸네일로, `잔고증명서_Kiwoom.pdf` 는 `.file-chip` 이름 칩으로 한 줄에 공존. D3(이미지만 썸네일)이 실제 화면에서 성립 |
| **HO-3** 폴더 드롭 | **미검증** | 차단하지 않는다. `spec.md` §6 의 해당 한 줄은 「미확정」으로 남는다 |

#### HO-1 관측 기록 (macOS)

| 값 | 내용 |
|---|---|
| 관측자 | jw |
| 관측일 | 2026-09-11 |
| macOS 증거 | 운영자 제출 화면 캡쳐 2장 (세션 전사; 저장 경로 미기록). 캡쳐 붙여넣기·드래그앤드롭·클립 버튼 세 경로 모두 동작함을 운영자가 진술 |
| Windows 증거 | **없음 — 미관측** |
| 생성된 파일명 | **미기록** — 화면 캡쳐에 썸네일만 보이고 파일명이 드러나지 않았다. 다음 관측에서 이미지 항목의 `img.alt` 또는 `title` 로 확인할 것 |

[HARD] HO-1 을 PASS 로 적지 않았다. 다섯 값 중 둘(Windows 증거·생성된 파일명)이 비어 있고, 부분 관측은 관측이 아니다 (VCI §3.4 Gaps). 관문을 열려면 Windows 브라우저에서 `Ctrl+V` 를 한 번 관측하고 그때 생성된 파일명을 함께 적는다.

### 잔여 위험

- **가장 큰 것은 HO-1.** 기계 기준 13개는 전부 합성 이벤트 위에서 돈다. 실제 브라우저의 `ClipboardEvent.clipboardData` 모양이 `fakeDT` 와 다르면 전건 초록인 채로 캡쳐 붙여넣기가 작동하지 않을 수 있다. 특히 이 구현은 `dt.files` 를 먼저 읽고 비었을 때만 `dt.items` 로 내려가는데, 두 경로 중 어느 쪽이 실제로 쓰이는지는 관측하지 못했다.
- **문서 가드는 첫 배선 당시 모듈 인스턴스의 클로저를 붙든다.** 오늘의 가드는 모듈 상태를 읽지 않아 무해하지만(`transferHasFiles` + `preventDefault` 뿐), 앞으로 가드에 목록을 읽는 로직이 붙으면 이 성질이 조용한 결함이 된다.
- **문서 가드의 사정거리.** 문서 전체의 파일 끌기에 조건 없이 걸린다. 오늘은 무해하다 — 유일한 파일 입력 `#file-input` 이 드롭 영역 «안» 에 있다. 드롭 영역 밖에 파일을 받는 표면이 생기면 이 가드가 그 기본 동작을 조용히 삼킨다(`spec.md` §6 의 알려진 한계, 결정은 「오늘은 예외를 두지 않는다」).
- **`.webp` 갈림은 그대로다.** 작성기에서는 썸네일로 보이지만 서버 MIME 표에 `.webp` 가 없어 보낸 뒤에는 이미지로 그려지지 않는다. 이 SPEC 의 범위 밖(`spec.md` §4·§6).
- **통합 미확인.** 이 작업은 격리 워크트리의 별도 브랜치에 있고 `main` 으로 병합되지 않았다. `main` 쪽 SPEC 산출물이 untracked 사본으로 남아 있으므로 병합 시 경로가 겹친다 — 오케스트레이터가 정리해야 한다.

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_complete_at: 2026-09-11
run_commit_sha: a44ecf8f5361b0e5f6435505d2efb8fbcd7b4ee7
run_preflight_head: 49bf601b550c3ef7f17d439ca5c4ea579cc51cd1
run_branch: worktree-agent-a8a15ee3b38e6b43e
run_status: complete
ac_pass_count: 13                 # AC-WEBATT-001~013 (013 은 블로커 해소 후 초록)
ac_pass_with_debt_count: 0
ac_fail_count: 0
human_observation_unverified: 2   # HO-1(차단 관문, macOS 만 관측 — Windows 미관측) · HO-3
preserve_list_post_run_count: 7   # server/src web/rich.js web/rich.d.ts web/markdown.js web/markdown.d.ts web/design-tokens.css web/index.html — 전부 무변경
new_warnings_or_lints_introduced: 0
typecheck_exit_code: 0
tests_web_chat: "72 passed (72)"
tests_npm_full: "server 298 passed (298); channel 103 passed (103) — main 병합 후 재실행"
resolved_blocker:
  file: server/test/web-markdown.test.ts
  test: AC-WEBMD2-007 integration and preserve baseline
  cause: SPEC-WEBMD-002(completed) 가 영구 시험 파일에 박은 pre-flight HEAD 기준선이 web/app.js 를 영구 동결
  disposition: 운영자 결정(2026-09-11) — PRESERVE 단언 두 줄의 경로 목록에서 web/app.js 만 제거. 나머지 세 경로(web/rich.js · web/markdown.d.ts · server/src)의 보호는 유지. 커밋 c48fee0
  merge_commit: main 에 --no-ff 병합, 병합 후 npm test 전체 초록 재확인
milestone_commit_strategy: M1/M2/M3 각 1커밋 + 산출물 1커밋
audit_corrections_applied: [N1, N2, N3, N4]
blocking_human_gate: HO-1        # acceptance.md §D.2 — 미검증인 동안 status: completed 에 이르지 못한다
```

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
