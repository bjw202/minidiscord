# 카드 t5 — plan 단계 마감 증거

- **카드**: `t5` (마일스톤 M5 "웹 UI")
- **워크트리**: `.claude/worktrees/t5` / **브랜치**: `WT-web-ui`
- **기반**: `WT-msg-gateway-relay`(카드 `t3`, M3) 병합 — 병합 커밋 `6e9a167`
- **원본 요구**: `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 15 / 16 / 17 (주 체크아웃의 미커밋 파일)
- **디자인 기준**: `.moai/project/design-dna-discord.md`, `web/design-tokens.css`

## 1. 산출한 SPEC — 3건, Tier M, 각 4산출물

| SPEC | 원본 | 범위 | 버전 | REQ / AC |
|---|---|---|---|---|
| `SPEC-WEBSHELL-001` | Task 15 | 정적 서빙, 로그인·회원가입, 방·봇 목록, `api()`/`state` 기반 | 0.2.0 | 15 / 16 |
| `SPEC-WEBCHAT-001` | Task 16 | 채팅 화면, `openRoom`, `renderMessage`, SSE 수신, `@` 자동완성, 봇 상태 | 0.3.0 | 16 / 16 |
| `SPEC-WEBRICH-001` | Task 17 | 첨부 표시, 봇 초대 모달, 권한 승인 버튼 | 0.3.0 | 16 / 16 |

세 SPEC 모두 Tier M 상한(16 / 16) 이내다.

## 2. plan-audit 판정 — 최종 PASS

최종 판정은 `.moai/reports/t5/plan-audit-c.md`에 있다.

| 대상 | 1차 | 2차 | 3차 (최종) |
|---|---|---|---|
| `SPEC-WEBSHELL-001` | CONDITIONAL PASS | **PASS** | **PASS** |
| `SPEC-WEBCHAT-001` | **FAIL** | CONDITIONAL PASS | **PASS** |
| `SPEC-WEBRICH-001` | CONDITIONAL PASS | **FAIL** | **PASS** |
| 교차 SPEC 통합 표면 | **FAIL** | **FAIL** | **PASS** |

감사 보고서 3종:

- `.moai/reports/t5/plan-audit.md` — 1차. MUST-FIX 8건
- `.moai/reports/t5/plan-audit-b.md` — 2차. MF-9·10·11 신규, MF-5·8 잔여
- `.moai/reports/t5/plan-audit-c.md` — 3차(델타). **MUST-FIX 11건 전부 종결, 미종결 0건**

3차 감사자는 교정 세션의 자기 주장을 근거로 채택하지 않고 산출물 원문과 직접 실행한 명령 출력만으로 판정했음을 명시했다.

## 3. 교정 경과 — 3라운드

1. **1라운드** — `SPEC-WEBSHELL-001`을 공유 계약의 소유자로 먼저 교정(v0.2.0), 이어서 나머지 둘을 병렬 교정. 계약은 `SPEC-WEBSHELL-001/spec.md` §4.8(REQ-WEBSHELL-015) 6조항.
2. **2라운드** — 2차 감사가 이음매의 배선 부재(MF-9)와 공허 붕괴(MF-10)를 적발.
3. **3라운드** — 2차 감사의 권고에 따라 `SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001`을 **한 세션에서 함께** 교정. 앞 두 라운드가 각자 교정 뒤 다시 어긋난 것이 근거.

### 오케스트레이터 결정 1건

**`web/app.js`는 ES 모듈로 확정.** 1차 감사 MF-1(모듈 형식 정면 충돌)의 해소 방향으로, `SPEC-WEBSHELL-001`이 검증 경로 전체를 ES 모듈 위에 세운 반면 `SPEC-WEBCHAT-001`이 쓰려던 `window.eval` 원문 평가 골격은 원래도 깨지기 쉬운 우회였다. plan 단계라 되돌리는 비용이 없다. 각 SPEC의 HISTORY에 이 결정으로 귀속돼 있다.

## 4. 공유 계약 (`SPEC-WEBSHELL-001/spec.md` §4.8, 6조항)

1. **모듈 형식** — `web/app.js`는 ES 모듈. 테스트는 `await import(...)`. `window.eval` 골격 금지
2. **필수 export 18개** — 더해도 되고, 지우거나 시그니처를 바꿀 수 없다. `enterMain()`은 존재하지 않으며 실제 이름은 `showMain()`
3. **`state` 필드 소유** — `SPEC-WEBSHELL-001`이 `rooms`·`bots`·`currentRoomId` 셋만 소유. 그 밖의 모든 필드는 쓰는 SPEC이 스스로 선언·초기화
4. **요소 소유권** — 영속 id 24개 불변 / `#chat` 요소는 WEBSHELL, 내용물은 WEBCHAT / `#bot-list` 직계 자식 수 == `state.bots.length` / 새 `<script>`는 `type="module"`
5. **토큰 로딩 경로** — `web/style.css`의 `@import` 하나뿐. `web/index.html`에는 `design-tokens.css` 문자열이 없다
6. **액션 함수 네트워크 호출 동결** — WEBSHELL 소유 9개 함수 본문에 `fetch`/`api()` 호출을 더하지 않는다

### 배선 계약 (이음매)

`SPEC-WEBCHAT-001`과 `SPEC-WEBRICH-001`이 **바이트 동일한 문단**으로 함께 싣는다 (3차 감사가 md5 `5186e702cf452bc945fcf67beaecd7e7`, 848 B로 재계산 확인).

- **소유자**: `SPEC-WEBRICH-001` — 호출 줄과 `import` 둘 다
- **넘기는 값**: 팩토리 함수 `createRichContext` **그 자체** (호출 결과 `.decorate`가 아니다)
- **자리**: `web/app.js` 모듈 최상위, 정확히 한 번
- **관측**: `AC-WEBRICH-016` 관측 4(정적) · 관측 5(실제 `openRoom` 경로 행위 테스트)

## 5. 원본 계획서 ↔ 실제 서버 코드 드리프트 — 감사가 `server/src/` 대조로 확인한 것

`plan-v2.md`는 서버 코드보다 오래됐다. 아래는 3개 SPEC 작성자가 보고하고 감사가 코드 대조로 사실 확인한 항목이다. 조용한 실패(오류 없이 기능만 죽는 상태) 3건이 포함된다.

1. **권한 요청 ID 오파싱** — 원본의 `/[a-km-z]{5}/`가 본문 앞쪽의 봇 임의 텍스트에서 먼저 일치한다(`input_preview`에 `command`가 있으면 `comma`). 서버는 모르는 ID를 조용히 버리므로 대기 중인 Claude Code 세션이 영영 답을 받지 못한다 → 마지막 줄 템플릿 전체 대조로 교정
2. **`@TO(코드 리뷰어)` 조용한 실패** — `mention.ts`의 파서는 괄호 안 공백을 불허하는데 `routes-bots.ts`는 공백 있는 봇 이름을 허용한다. 멘션 0건으로 읽히면서 미초대 검사에도 걸리지 않아 `200`으로 저장되고 화면에도 뜨지만 봇은 아무것도 받지 못한다 → UI에서 멘션 불가 이름 배제
3. **SSE 재연결 백필 부재** — `SPEC-SSE-001` REQ-SSE-009가 `id:`/`retry:`를 금지해 `Last-Event-ID` 재개 경로가 없고, 끊긴 사이 메시지는 영구 유실 → `?after=` REST 백필 요구사항 신설
4. **첨부 응답에 `mime` 없음** — `routes-messages.ts`가 `stored_path`와 함께 의도적으로 제외(경로 노출 감사의 귀결) → 파일명 확장자 판정으로 전환
5. **`@fastify/static` 미등록** — 의존성은 설치돼 있으나 `buildServer()`에서 등록되지 않은 배선 부재 상태
6. **`POST /api/auth/logout` 실재** — 원본이 언급하지 않아 UI에서 도달 불가능했다
7. 원본 코드 블록의 `id="sidebar-top"` 중복(2989·2999행), 판정 완료 요청에 버튼 부활, 방 세대 경쟁, stale 타이머 누수, 비보안 컨텍스트에서 `navigator.clipboard` 조용한 실패, CSS 원시 16진 색값 하드코딩 등

## 6. 수용 기준 훑기 — 3개 질문 축

이 프로젝트는 "아무것도 검증하지 않는 수용 기준"이 반복 재생산된 이력이 있어, 훑기를 개별이 아니라 **부류 단위**로 수행했다. 축은 라운드를 거치며 셋으로 늘었다.

| 축 | 질문 | 1차 | 2차 | 3차(최종, 감사자 독립 계수) |
|---|---|---|---|---|
| A | 빈/스텁 구현이 통과하는가 | 0 | 1 | **0** |
| B | 형제가 자기 SPEC대로 옳게 구현하면 실패하는가 | 19 | 2 | **1** |
| C | 실패가 아니라 **공허**로 무너지는 입력이 있는가 | — | — | **1** |

- **축 B**는 1차 감사가 발견한 부류다. 세 작성자 모두 축 A만 물었고, 자기 SPEC 안에서만 물었다.
- **축 C**는 3라운드에서 새로 드러난 부류다. 파일 부재·빈 변수·표준 오류로만 나가는 실패 때문에 검사가 "비었으니 문제 없음"으로 읽고 통과한다. 검사가 아예 없는 것보다 나쁘다 — 있다고 믿게 만든다.

## 7. 열린 항목 — 7건, run 진입 차단 0건

3차 감사가 "run 단계로 보내라"고 권고하면서 함께 기록한 잔여 항목이다. 전부 비차단이며, 감사자는 네 줄만 킥오프에서 먼저 고치면 더 깔끔하고 고치지 않고 진입해도 살아남는다고 판정했다.

| # | 항목 | run 단계 비용 |
|---|---|---|
| R3-1 | `AC-WEBRICH-016` 관측 3-c의 경계 오차 — 닫는 중괄호 직후 삽입을 범위 "안"으로 셈 | 배선 줄을 그 자리에 둔 옳은 구현이 한 번 거짓으로 붉어짐. 자가 진단 가능하고 진짜 오배선과 신호가 다름 |
| R3-2 | 앵커 없는 `grep -c` 4개 + `SPEC-WEBCHAT-001` DoD — 주석 안의 인용까지 셈 | `^` 앵커를 붙이면 주석이 빠지고 "모듈 최상위" 계약도 같은 명령이 강제 |
| R3-3 | `SPEC-WEBRICH-001/plan.md` L32에 0.3.0 배선 계약과 어긋나는 `.decorate` 문장 1곳 잔존 | 바로 다음 L64·L69가 반대로 못 박고 `AC-016`이 기계적으로 잡음 |
| R3-4 | `SPEC-WEBSHELL-001`은 축 C 훑기를 받지 못해 DoD에 `--reporter=verbose` + `skipped` 0 가드가 없음 | 일부 `it`을 `.skip`한 구현이 게이트를 통과. 형제 문장 한 줄 복사로 종결 |
| R3-5 | `SPEC-WEBSHELL-001` 계약 6 끝문장이 배선 자리로 두 곳을 지명하나 실제 배선은 세 번째 자리 | 어떤 기준도 그 문장을 관측하지 않고 [HARD] 절 위반 없음. 닫으려면 동결된 PASS 문서를 손대야 함 |
| R3-6 | 관측 5의 동기화가 "`openRoom`이 정착된 promise를 돌려준다"는 미선언 성질에 의존 | 타이밍 흔들림이 배선 실패와 같은 신호로 보일 오진 위험 |
| R3-7 | 배선 계약 문단이 "관측 4가 진다"고 적으나 주변은 4·5로 적음 | 무해 |

**감사자 권고 한 줄**: 배선 한 줄을 파일 상단 `import` 근처에 두면 R3-1과 R3-5를 동시에 피한다. 계약이 자리를 "모듈 최상위"로만 정했으므로 구현자의 자유다.

## 8. run 단계 선행 조건

1. **`npm install`** — 이 워크트리에 `node_modules`가 없다
2. **`npm i -D jsdom -w server`** — `server`는 vitest `^4.1.11`만 있고 jsdom / happy-dom이 없다. `package-lock.json` 대조로 확인
3. **DOM 환경 지정** — 파일 단위 `// @vitest-environment jsdom` 도크블록이 1차 경로. 동작하지 않으면 `server/vitest.config.ts`가 명시된 대체 경로이며 세 SPEC의 허용 파일 집합에 모두 포함돼 있다. 서버 테스트 전체를 jsdom으로 돌리는 선택은 금지 — `better-sqlite3`·`ws`·실서버 `listen`을 쓰는 기존 테스트가 있다
4. **`web/rich.d.ts`** — `server/tsconfig.json`이 `allowJs` 없이 `include: ["src","test"]`라, 없으면 테스트가 `../../web/rich.js`를 import할 때 `tsc --noEmit`이 깨진다
5. **구현 순서** — `SPEC-WEBSHELL-001` → `SPEC-WEBCHAT-001` → `SPEC-WEBRICH-001`. 뒤 SPEC의 일부 기준이 앞 SPEC의 산출물을 요구하며, 그 경우 **실패하지 공허하게 통과하지 않는다**

## 9. 미검증 — 정직하게

- **실행해서 확인한 것은 기반 상태 하나뿐이다.** 이 커밋 직전 `npm install` 후 `npm test --workspaces --if-present`를 실행해 t3에서 넘어온 서버 테스트가 `Test Files 10 passed (10) / Tests 104 passed (104)`로 통과하는 것을 확인했다(vitest 4.1.11). 이는 M5가 얹힐 기반이 초록이라는 사실일 뿐, M5 SPEC의 수용 기준과는 무관하다
- 세 SPEC의 수용 기준은 **한 건도 실행되지 않았다.** 대상 코드(`web/index.html`·`app.js`·`style.css`·`rich.js`)가 아직 존재하지 않고 `node_modules`도 없다. 기준의 문면은 감사가 읽고 판정했으나, 명령의 실제 동작은 run 단계 첫 실행이 처음 판정한다
- `AC-WEBRICH-016` 관측 3-c의 경계 오차는 3차 감사자가 **합성 diff로 직접 실행해** 확인한 것이다(R3-1). 나머지 명령들은 문면 검토다
- 유예된 런타임 전제 5건: vitest 4의 도크블록 환경 지정, `@fastify/static` v10의 `prefix: '/'` 인덱스 폴백, jsdom의 `<dialog>` 지원, `content-disposition` 하 `<img>` 렌더, 로그아웃한 `EventSource`의 종료. 3차 감사는 다섯 건 모두 유예가 안전하다고 판정했다 — 기계 판정 경로나 설계상 회피가 함께 준비돼 있거나, 어떤 수용 기준도 그 성질에 의존하지 않는다
- 이 문서의 커밋 이후 산출물에 가해진 변경은 어떤 감사도 받지 않은 것이다. PASS는 커밋 시점 상태에 대한 판정이다

## 10. 다음 단계

카드 `t5`는 run 단계로 넘어갈 준비가 됐다. 브랜치 `WT-web-ui`는 아직 푸시되지 않았고, 이 워크트리가 유일한 사본이다.
