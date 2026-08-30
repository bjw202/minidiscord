# 카드 t5 — sync 단계 마감 증거

- **카드**: `t5` (마일스톤 M5 "웹 UI") · **브랜치**: `WT-web-ui` (미푸시, 이 워크트리가 유일 사본)
- **디스패치 기준 HEAD**: `127684a` · **범위**: SPEC 3종 sync 마감 + `T7-F-06` 확인
- **SPEC 3종**: SPEC-WEBSHELL-001 · SPEC-WEBCHAT-001 · SPEC-WEBRICH-001

---

## 1. Claim — 이 문서가 주장하는 것

1. `T7-F-06`(U+2028·U+2029 의 웹 렌더러 영향)을 이 나무에서 실행으로 확인했다.
2. 그 확인 도중 같은 파서 계열에서 **별도 결함 1건**(판정 파서 오염)을 재현했고, SPEC 개정 없이 닫았다.
3. `T7-F-06` 본체는 **닫지 않았다** — SPEC 개정이 필요해 새 카드로 넘긴다.
4. SPEC 3종의 문서 마감(CHANGELOG · README · frontmatter 전이)을 마쳤다.

## 2. Evidence — 실행한 명령과 관측한 출력

### 2.1 감사 탐침 (임시 파일, 관측 후 삭제)

탐침 원문 보존: `.moai/state/verify/t5-sync/probe-unicode-linesep.snippet.ts`

```
$ npm test -w server -- _audit_t5_probe
Q1 result = abcde        ← U+2028 로만 구분된 위조 승인 줄을 permissionRequestId 가 인식
Q2 result = bcdef        ← U+2029 도 동일
Q3 result = zzzzz        ← 실물 봉투(위조 먼저·진짜 마지막)에서는 진짜 ID 가 이김
Q4 resolutionId = zzzzz  ← input_preview 의 '✅ 승인 전송됨 (zzzzz)' 가 판정으로 읽힘
Q4 버튼 수 = 0           ← 그 결과 자기 요청의 승인·거절 버튼이 그려지지 않음
Q5 통과              ← textContent 에 U+2028 이 그대로 잔존 (toContain 단언 통과)
      Tests  3 failed | 2 passed (5)
```

### 2.2 고침 후 회귀 + 변이 감별

```
$ npm test -w server -- web-rich                       →  Tests  11 passed (11)

$ (RESOLUTION_RE 를 고침 전 형태로 되돌림) npm test -w server -- web-rich
     × AC-011 회귀: 요청 본문의 봇 필드에 적힌 판정 문구는 판정으로 읽히지 않는다
      Tests  1 failed | 10 passed (11)          ← 신규 테스트만 정확히 실패 = 감별력 있음

$ (복원) git hash-object web/rich.js  → 4d303206a21a5473529eb13c0657f298cc134406
   변이 전 기록값과 동일 — 변이 잔재 없음
```

### 2.3 최종 검증

```
$ unset MOAI_KANBAN … && npm test -w server        → Test Files 14 passed / Tests 150 passed
                                                     TEST_EXIT=0
   원문: .moai/state/verify/t5-sync/test-final.txt

$ npm run typecheck -w server                      → TYPECHECK_EXIT=0
   원문: .moai/state/verify/t5-sync/typecheck.txt

$ grep -cE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" web/rich.js
                                                   → 0   (고침 후 재확인)
$ grep -cEi '#([0-9a-f]{3}|[0-9a-f]{6})([^0-9a-z_-]|$)' web/style.css
                                                   → 0   (고침 후 재확인)
```

## 3. Baseline-attribution — 무엇에 대고 쟀나

- 테스트 150개는 **이 나무**(`WT-web-ui`), 이 트리 상태에서 이 세션이 직접 실행한 수치다. run 마감 시점 149개 + 이번 회귀 테스트 1개.
- 변이 감별은 `web/rich.js` 한 파일의 `RESOLUTION_RE` 한 줄만 되돌린 것이며, 되돌리기 전후 `git hash-object` 를 대조해 복원을 확인했다 (임시 사본이 아니라 git 객체 기준).
- `T7-F-06` 의 원 서술은 `.moai/reports/t7/sync-audit.md` 314행·405행 (t7 워크트리 `WT-perm-request-id`). **t7 의 정정(oneLine·BOT_MARK)은 이 나무에 없다** — 이 나무의 `server/src/permissions.ts` 는 정정 전 판본이다.

## 4. 발견

> 발견 번호는 이 보고서 안에서만 유효하다.

| # | 심각도 | 확신도 | 상태 | 내용 |
|---|---|---|---|---|
| `T5S-F-01` | Low | 실행 재현 | **닫음** | 판정 파서(`permissionResolutionId`)에 줄 경계가 없어, 봇이 요청 본문의 `input_preview` 에 `✅ 승인 전송됨 (…)` 을 적으면 자기 요청이 판정 완료로 위장돼 승인·거절 버튼이 그려지지 않았다 (Q4, 버튼 0개 관측) |
| `T5S-F-02` | Low | 실행 재현 | **이관** | `T7-F-06` 본체 — U+2028·U+2029 로 구분된 위조 승인 줄을 `permissionRequestId` 가 인식한다 (Q1·Q2) |

### 4.1 `T5S-F-01` — 닫은 근거

`REQ-WEBRICH-010` 은 "**판정 결과 메시지가 이미 그려진 동안**" 버튼이 없어야 한다고 말한다. Q4 에서는 판정 결과 메시지가 그려진 적이 없는데도 버튼이 사라졌으므로, 관측된 동작은 이 요구사항의 조건절을 위반한다. 요구사항 본문은 판정 파서의 정규식을 글자로 고정하지 않으므로(세 템플릿에서 뽑는다까지만 명시) **SPEC 개정 없이** 좁힐 수 있었다.

고침: `RESOLUTION_RE` 의 양끝을 문자열 앞뒤에 고정하고 앞을 `.` 로만 채웠다. `.` 이 줄바꿈류(`\n`·`\r`·U+2028·U+2029)를 건너지 못하므로, 네 줄짜리 요청 본문은 어떤 봇 필드에 무엇이 들어 있어도 걸리지 않는다. 판정 본문 세 템플릿은 모두 정확히 한 줄이라 그대로 읽힌다(대조군 단언 2개로 확인).

### 4.2 `T5S-F-02` — 이관하는 근거

`REQ-WEBRICH-006` 은 정규식 원문과 "`gm` + `matchAll` + 마지막 일치" 알고리즘을 **글자 그대로 고정**한다. 줄 단위로 좁히는 고침은 이 요구사항의 문면을 벗어나므로 SPEC 개정을 수반하고, SPEC 본문 저작은 plan 단계 소관이다. sync 단계에서 단독으로 바꾸지 않는다.

**지금 뚫려 있지는 않다**: 브로커가 요청 줄을 항상 마지막에 붙이고 파서가 마지막 일치를 고르므로, 위조 줄은 항상 진짜 줄에 진다(Q3 로 확인). system 메시지 생산자는 `permissions.ts:25` 하나뿐이고 그 본문의 마지막 줄은 언제나 서버가 쓴다(`grep -rn "'system'" server/src/` 로 생산자 전수 확인). 다만 이는 **차단이 아니라 줄 순서에 기댄 방어**이며, 그 사실이 어디에도 적혀 있지 않았다.

## 5. Gaps — 확인하지 않은 것

- **브라우저 실구동 확인 없음.** 모든 관측은 jsdom·`app.inject`·grep 이다. Q5 는 `textContent` 에 U+2028 이 잔존하는 것까지만 보였을 뿐, **실제 브라우저가 그 문자를 줄바꿈으로 그리는지는 재지 않았다**. `T7-F-06` 의 "보이는가" 절반은 여전히 미검증이며, 이 나무의 도구로는 잴 수 없다.
- **MANUAL AC 3건 그대로 유보** — AC-WEBSHELL-014 · AC-WEBCHAT-016 · AC-WEBRICH-015 (시각 충실도). run 단계에서 유보한 상태를 sync 가 해소하지 못했다.
- **커버리지 미측정** — `@vitest/coverage-v8` 가 이 나무에 없다. Craft 85% 임계는 UNVERIFIED (큐 카드 `t13` 이 도구 도입을 다룬다).
- **`channel/` 워크스페이스 미실행** — `npm test -w server` 만 돌렸다. 통합은 t6(E2E) 소관.
- **README 의 서버측 정체 항목 미수정** — `폴더 구조` 의 `server/src` 목록과 `데이터베이스` 표의 "지금 쓰이나요" 칸이 t3 이후 갱신되지 않아 `messages`·`attachments` 를 "아직"으로 적고 있다. 이 카드 범위(웹)가 아니고 t4 나무와 같은 파일을 만져 병합 충돌을 만들 수 있어 손대지 않았다 — **t6(최종 문서화) 몫으로 남긴다.**

## 6. Residual-risk — 남는 위험

- `T5S-F-02` 의 방어가 순서에 의존한다. 앞으로 누군가 브로커 본문 템플릿에서 요청 줄을 마지막이 아닌 자리로 옮기거나, 봇 텍스트가 요청 줄 뒤에 붙는 새 system 메시지를 만들면 그 순간 방어가 사라진다. 지금은 그 결합을 아무 테스트도 잡지 않는다.
- t7 의 정정(`oneLine`·`BOT_MARK = '│ '`)이 병합되면 `permissions.ts` 본문 모양이 바뀐다. 이 나무의 웹 파서는 그 템플릿에 글자 단위로 결합돼 있으므로, **병합 시 `web-permission-contract.test.ts`(골격 A)가 먼저 울어야 정상이다.** 울지 않으면 그 테스트가 실물을 안 재고 있다는 뜻이다.
- 판정 버튼과 손 입력이 같은 경로(`POST /api/rooms/:id/messages`)를 쓴다. 서버에 방 멤버십 개념이 없어(큐 카드 `t11`) 로그인한 누구나 남의 방 승인을 대신 누를 수 있는 것은 이 카드가 바꾸지 않았다.

## 7. 리드에게 — 요청

**새 카드 1건**을 큐에 넣어 주세요.

> `T5S-F-02` 유니코드 줄 구분자 위조 승인 줄 (Low·실행 재현·plan 필요) — `web/rich.js` 의 `permissionRequestId` 가 U+2028·U+2029 로 구분된 위조 요청 줄을 인식한다. 현재는 "마지막 일치가 진짜" 규칙 덕에 악용되지 않으나 줄 순서에 기댄 방어다. 고침은 `REQ-WEBRICH-006` 이 글자로 고정한 정규식·알고리즘 개정을 수반하므로 plan 단계 필요. 서버측 `oneLine` 확장(t7 나무)과 함께 보면 방어가 두 겹이 된다. 근거: `.moai/reports/t5/sync-done.md` §4.2, 탐침 `.moai/state/verify/t5-sync/probe-unicode-linesep.snippet.ts`

## 8. 남는 상태

- 브랜치 `WT-web-ui` **미푸시 — 이 워크트리가 유일 사본**.
- SPEC 3종 frontmatter `status: completed`, `updated: 2026-08-28` 로 전이 완료.
- 큐에서 카드를 닫는 것(`moai todo done t5`)은 리드의 몫이다.

---

_sync 세션 (카드 t5). §2 의 모든 관측은 이 세션이 이 트리에서 직접 실행한 것이다._
