# SPEC-WEBMD-002 — 실행 계획 (Tier S)

## §A Context

### A.1 배경 요약

본문 안 `@TO(봇이름)`/`@CC(봇이름)` 토큰이 평문과 구분 없이 그려진다(`spec.md` §1). 이 계획은 렌더러 한 파일·스타일 한 블록·시험 한 파일로 배지를 만든다. 관례·색·안전 계약은 전부 완결된 형제 SPEC 이 소유하고 있어 이 계획은 소비만 한다.

### A.2 검토할 결정 — D1 매칭 범위 (가장 뒤집히기 쉬운 결정)

셋을 비교했다:

| 안 | 커버 | 롤콜 줄 `@TO(a) @TO(b) @TO(c)` 의 화면 | 판정 |
|----|------|----------------------------------------|------|
| 메시지 시작 한정 | 128/133 | 배지 0개 — 나머지 전부 평문 | 기각: 실측 5건이 실제 지시문인데 못 그린다 |
| 줄 시작 한정 | 131/133 | 첫 토큰만 배지, 뒤 셋은 평문 — 반쪽 화면 | 기각: 서버는 전부 라우팅한다(표시-진실 괴리) |
| **서버 문법 전역(코드 표면 제외)** — 채택 | 133/133 | 칩 셋 전부 배지 | `mention.ts` 3행 `MENTION_RE` 와 자격이 1:1 — 문법을 새로 발명하지 않는다 |

채택안의 과대 매칭은 «문법 밖 형태가 배지를 받지 않는 것»으로 거부한다(AC-WEBMD2-003). 코드 표면 제외는 운영자 지시이며, 그 한 곳의 원문-표시 괴리(서버는 코드 안 토큰도 라우팅)는 `spec.md` REQ-WEBMD2-004 에 알려진 괴리로 기록했다.

### A.3 검토할 결정 — D2 배지 노드 조립 위치

`renderInline`(`web/markdown.js`, 인라인 단일 관문 @MX:ANCHOR) 안에 `@TO(`/`@CC(` 분기를 더한다. 근거:

- 코드스팬 분기가 같은 스캔의 앞순서라 **코드스팬 우위가 구조적으로 성립**한다 — 코드 내부 위치는 스캔이 도달하기 전에 소비된다.
- 펜스는 `renderInline` 을 지나지 않으므로(`buildFence` 가 `textContent` 직행) 자동 제외.
- `@` 는 기존 어떤 인라인 분기의 마커도 아니어서 분기 추가가 기존 우선순위를 흔들지 않는다.
- 기각한 대안: `app.js` 의 `registerMessageDecorator` 장식 훅 — 장식 노드는 `.msg-body` **밖 형제**여야 한다는 계약(AC-WEBMD-016)때문에 본문 안쪽을 못 바꾼다.

### A.4 파일 목록 (3개 — Tier S 상한 4 이내)

| 파일 | 변경 |
|------|------|
| `web/markdown.js` | `renderInline` 에 토큰 판정·칩 조립 분기 추가 (export 무변경) |
| `web/style.css` | `/* SPEC-WEBMD-002 */` 블록 신설 (`.md-mention`·`.md-mention.to`·`.md-mention.cc`) |
| `server/test/web-markdown.test.ts` | `AC-WEBMD2-001`~`008` describe 블록 추가 (기존 블록 무변경) |

### A.5 PRESERVE 목록 (한 줄도 고치지 않는다)

- `web/app.js` 전체 — 특히 `renderMessage` 안 `body.appendChild(renderMarkdown(raw, document))` 호출부
- `web/rich.js`, `web/rich.d.ts`, `web/markdown.d.ts`, `web/design-tokens.css`, `web/index.html`
- `server/src/` 전체 (`mention.ts` 포함 — 문법을 읽기만 한다)
- `web/style.css` 의 `/* SPEC-WEBMD-001 */` 블록과 `.ac-kind` 세 규칙 — 소비만
- `server/test/web-markdown.test.ts` 기존 describe 블록 전부, 그 외 모든 시험 파일
- `renderInline` 기존 분기의 순서와 우선순위(코드스팬 → 링크 → 취소선 → 굵게 → 기울임 → 자동링크)

## §B Known Issues (Tier S 필터)

- **B-1 소스 스캔 시험이 전 파일을 다시 훑는다** — AC-WEBMD-007·010 은 `web/` 아래 모든 `.js`(readdirSync 도출)에서 리터럴 아닌 `createElement` 태그·`setAttribute` 첫 인자·마크업 API 를 금지한다. 칩은 `createElement('span')` + `className`/`textContent` 로만 만든다.
- **B-2 export 다섯 고정** — REQ-WEBMD-001. 토큰 판정 헬퍼를 export 로 밖으로 꺼내면 AC-WEBMD-015 가 깨진다. 모듈 내부 함수로 둔다.
- **B-3 클래스 주입 부류** — `className` 에 들어가는 종류 값은 내부 고정 리터럴 `'to'`/`'cc'` 뿐이어야 한다(이름·입문 문자열은 `textContent` 로만). REQ-WEBMD-009 가 막은 부류의 재발이다.
- **B-4 평문 항등의 예외 발생** — 토큰을 품은 본문은 이제 `renderMarkdown(src).textContent !== src` 다. 기존 시험 픽스처에 `@TO(`/`@CC(` 는 없음을 확인했다(grep 회독) — 기존 단언은 안전하다. 예외 개방은 HISTORY 한 줄로 기록했다.
- **B-5 CSS 블록 경계** — AC-WEBMD-014 의 16진수 색 검사는 `/* SPEC-WEBMD-001 */` 블록에 한정된다. 새 블록은 그 밖에 두고 같은 규율(토큰만·hex 0)을 AC-WEBMD2-006 이 이 SPEC 몫으로 검사한다.
- **B-6 describe 이름 충돌** — 기존 `AC-WEBMD-001`~`016` 과 번호가 겹치지 않게 접두 `WEBMD2` 를 쓴다(기존 파일과의 공존).

## §C Pre-flight (구현 시작 전 실행)

첫 줄이 찍는 SHA 가 **pre-flight HEAD** — AC-WEBMD2-006·007 의 모든 diff/show 비교가 도는 기준선이다. 이 SHA 를 §E 보고에 그대로 인용한다(VCI baseline-attribution). 작업 나무 대 HEAD 비교만으로는 **이미 커밋된** PRESERVE 위반을 못 잡으므로 기준선을 이렇게 명명한다.

```bash
git branch --show-current && git rev-parse HEAD   # ← 이 SHA 를 pre-flight HEAD 로 §E 에 기록
npm run typecheck -w server        # 베이스라인 녹색 확인
npx vitest run server/test/web-markdown.test.ts   # 기존 블록 전부 녹색 확인
grep -c 'md-mention' web/markdown.js web/style.css # 0, 0 — 중복 구현 부재 확인
```

## §D Constraints

- §A.5 PRESERVE 목록의 파일은 무변경. `git add` 는 명시적 경로로만.
- 색은 `var(--md-*)` 만 — 새 토큰·16진수 리터럴 금지(REQ-WEBMD2-006).
- 마크업 파싱 API 금지(`innerHTML = ''` 예외는 기존 그대로, 이번엔 쓸 일도 없음).
- 커밋 주제: `feat(SPEC-WEBMD-002): M{N} …` 관례. `--no-verify` 금지.

## §E Self-Verification (manager-develop 보고 서약)

AC-WEBMD2-001~008 의 이분 PASS/FAIL 표. 각 행에 (a) 실행 명령 (b) 관측된 출력 (c) HEAD SHA 의 귀속 세 쌍을 VCI 5단 형식으로 붙인다. 판정 명령:

```bash
npx vitest run server/test/web-markdown.test.ts
npm run typecheck -w server
npm test
git diff --stat -- web/app.js web/rich.js web/markdown.d.ts server/src   # 0줄이어야 함
```

TDD 이므로 RED 실패 출력(구현 전)을 그대로 보여야 한다(E8).

## §F Milestones (3개 — 뒤집히기 쉬운 결정부터)

- **M1 렌더러 (D1·D2 가 살아 있는 곳)** — RED: AC-WEBMD2-001~005·008 describe 추가 후 실패 확인 → `renderInline` 에 토큰 분기(고정 문법 한 번 시도, 실패 즉시 리터럴) → GREEN. 파일: `web/markdown.js`, 시험 파일.
- **M2 스타일** — RED: AC-WEBMD2-006 → `style.css` 에 `/* SPEC-WEBMD-002 */` 블록(`.md-mention` 공통 + `.to`/`.cc` 색; `.ac-kind` 의 비색 속성을 같은 토큰으로 미러) → GREEN.
- **M3 회귀·통합** — AC-WEBMD2-007: `loadApp` 통합 경로 관측 + PRESERVE 파일 diff 0줄 + `npm test` 전체 초록 + typecheck 0.

## §G Anti-Patterns

- 칩을 문자열 조립·`innerHTML` 로 만들기 — REQ-WEBMD2-007 위반.
- 이름이나 입력 문자열을 `className` 에 섞기 — B-3(클래스 주입).
- 표시 전용 상한(예: 이름 64자)·«줄 시작» 제한을 덧대기 — 서버 문법과의 괴리를 만든다(§A.2).
- 토큰 판정에 되돌리기·이중 정규식 — REQ-WEBMD2-008 위반(선형 시간 계약).
- 기존 describe 블록의 단언을 고쳐 통과시키기 — REQ-WEBMD2-007 위반, 설계 오류 신호.

## §H Cross-References

- 요구사항·수용 기준 전문: `.moai/specs/SPEC-WEBMD-002/spec.md` §3
- 서버 멘션 문법: `server/src/mention.ts` 3행, `SPEC-MENTION-001`
- 렌더러·색 언어 소유자: `SPEC-WEBMD-001`, `SPEC-WEBACNAV-001`
