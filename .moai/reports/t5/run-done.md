# 카드 t5 — run 단계 마감 증거

- **카드**: `t5` (마일스톤 M5 "웹 UI") · **레인**: run2 (Claude) · **브랜치**: `WT-web-ui` (미푸시, 이 워크트리가 유일 사본)
- **run 시작**: `0020276` (plan 산출물 커밋) → **run 마감**: `f106c24` — 총 15 커밋 (SPEC 14 + 본 증거 문서 1)
- **SPEC 3종 순차 구현**: SPEC-WEBSHELL-001 → SPEC-WEBCHAT-001 → SPEC-WEBRICH-001 (§8 지정 순서)

## 1. 최종 검증 (오케스트레이터 직접 실행, 2026-08-27 23:02)

```
$ npm test -w server
 Test Files  14 passed (14)
      Tests  149 passed (149)      ← run 전 기준선 10/104 + 웹 UI 3 SPEC 45개

$ npm run typecheck -w server      → exit 0

$ grep -c "registerMessageDecorator(createRichContext)" web/app.js   → 1   (배선 정확히 한 번)
$ grep -cE "innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function" web/rich.js
                                     → 0 일치 (금지 함수 0건)
$ grep -cEi '#([0-9a-f]{3}|[0-9a-f]{6})([^0-9a-z_-]|$)' web/style.css → 0 일치 (원시 16진 0건)
$ git diff --stat 0020276..HEAD — 변경 파일 전수가 세 SPEC 허용 집합 이내
```

**renderMessage 불가침 (이음새 최종 확인)** — WEBRICH 기준점과 HEAD에서 함수 본문을 추출해 비교:

```
$ sed -n '/^export function renderMessage/,/^}/p' web/app.js | md5          → 2111d5a9c31f76f53c68112821c74d86
$ git show 61cd828:web/app.js | sed -n '/^export function renderMessage/,/^}/p' | md5
                                                                             → 2111d5a9c31f76f53c68112821c74d86
```

## 2. SPEC별 §E 자체검증 요약

### SPEC-WEBSHELL-001 (껍데기·공유 계약 소유자) — run_status: audit-ready

- **커밋 4건**: `be971c5`(M1 정적 서빙) `50ccb50`(M2 마크업·토큰 스타일시트) `af631d6`(M3 인증·방·봇 로직) `3e9f3f6`(M4 범위 검증·증거)
- **기계 AC 15/15 통과 + AC-014 MANUAL 유보**. RED(ENOENT 실패)→GREEN 전이 기록, `@fastify/static` v10이 API 라우트를 가리지 않는 것을 AC-002가 확인 (plan §D 7 미확인 항목 해소)
- **§E.2 결정 사항**: DOM 환경 = 파일 단위 도크블록 (vitest.config.ts 불필요), 테스트 11 files/116 tests
- 원문: `.moai/specs/SPEC-WEBSHELL-001/progress.md` §E.2·§E.3

### SPEC-WEBCHAT-001 (채팅 화면·SSE·자동완성·봇 상태) — run_status: audit-ready

- **커밋 5건**: `407d7a1`(M1 마크업·골격) `1ce1b92`(M2 렌더링·SSE·stale) `cfd1c01`(M3 자동완성·전송) `b4ccc6c`(M4 스타일) `61cd828`(증거 기록)
- **기계 AC 15/15 통과 + AC-016 MANUAL 유보** — describe 블록이 AC-001…014와 1:1인 `server/test/web-chat.test.ts`(604줄, 18 테스트)가 판정
- **§E.2 결정 사항**: `#placeholder` 제거(주석으로 근거 남김), 환경 = 도크블록, 배선(`createRichContext`)은 형제 소관대로 없는 채 독립 마감
- **경과**: 구현 에이전트가 M4 도중 API 사용량 한도(429)로 중단 — 재설정 후 오케스트레이터가 잔여 검증·커밋·§E 기록 승계 (§E.2에 명시)
- 원문: `.moai/specs/SPEC-WEBCHAT-001/progress.md` §E.2·§E.3

### SPEC-WEBRICH-001 (첨부·초대 다이얼로그·권한 버튼·배선 소유자) — run_status: audit-ready

- **커밋 5건**: `0605685`(M1 순수 표면·권한 계약 합치) `97f42bf`(M2 DOM 조립·판정 상태) `1f374d4`(M3 초대 다이얼로그·배선) `54a2f4a`(M4 스타일·증거) `6fddd0b`(SHA 백필)
- **기계 AC 15/16 통과 + AC-015 MANUAL 유보(사람 눈 5항목)**. mutation 검사 6/6 RED 전이, RED 원문 `.moai/state/verify/webrich-m{1,2}/red-evidence.txt` 보존
- **배선 계약 이행**: `registerMessageDecorator(createRichContext)` 모듈 최상위 정확히 1회, 팩토리 그 자체 전달(R3-3 오탐 함정 회피), 관측 5(실제 openRoom 경로 행위) 통과
- **server/src 변경 0건** (AC-016 관측 1)
- 원문: `.moai/specs/SPEC-WEBRICH-001/progress.md` §E.2·§E.3

## 3. 사람 확인 유보 항목 (MANUAL AC — 기계 판정 아님)

| AC | 무엇을 볼 것 |
|----|-------------|
| AC-WEBSHELL-014 | Discord 다크 테마 시각 충실도 — 2단 레이아웃·어두운 사이드바·작은 대문자 라벨·무테두리 |
| AC-WEBCHAT-016 | 봇 칩 표시(🟢/⚪·입력 중…·응답 없음?)와 채팅 영역 시각 대조 |
| AC-WEBRICH-015 | 리치 표면 5항목 — 첨부 이미지/링크·초대 다이얼로그·복사 안내 등 |

운영자가 브라우저에서 서버를 열어 확인하는 것으로 유보한다 (`npm test` 밖의 영역).

## 4. 미검증 — 정직하게

- **브라우저 실구동 확인을 하지 않았다.** 모든 검증은 jsdom·`app.inject`·grep이다. MANUAL AC 3건이 그 간극을 명시적으로 남긴다.
- **WEBCHAT M2–M4의 RED 원문 출력은 재현 불가** (에이전트 중단) — 대신 최종 스위트 149/149가 마감 시점 증거다 (§E.2 기재).
- **`channel/` 워크스페이스 테스트는 이 카드가 건드리지 않았다** — `npm test --workspaces` 전수가 아니라 `npm test -w server`만 돌렸다. 채널 카드(t4)와의 통합은 sync 단계/Task 18(E2E) 소관.
- Security Guardian 정적 훈고(dom-injection-xss·path-traversal)는 전수가 `textContent` 할당·컨테이너 비우기·테스트 상대경로 import에 대한 오탐임을 grep으로 확인했다.

## 5. 남는 상태

- 브랜치 `WT-web-ui` **미푸시 — 이 워크트리가 유일 사본**. 릴리스 통합은 리드/레인 절차에 따른다.
- SPEC 3종 frontmatter `status: in-progress` — `implemented → completed` 전이는 sync 단계(manager-docs) 소관.
- 큐에서 카드를 닫는 것(`moai todo done t5`)은 리드의 몫이다.
