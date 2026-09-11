---
id: SPEC-WEBMD-002
title: "웹 본문 @TO/@CC 배지 — 메시지 몸통의 수신 지시 토큰을 자동완성과 같은 색 언어로 그린다"
version: "0.1.0"
status: draft
created: 2026-09-11
updated: 2026-09-11
author: manager-spec
priority: P2
phase: "v2.2.0 target"
module: "web/, server/test/"
lifecycle: spec-anchored
tags: "web-ui, mention-badge, to-cc, markdown, css-contract, vanilla-js, jsdom"
tier: S
depends_on: [SPEC-WEBMD-001, SPEC-WEBACNAV-001]
related_specs: [SPEC-MENTION-001]
---

# SPEC-WEBMD-002 — 웹 본문 @TO/@CC 배지

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-09-11 | 최초 작성. 운영자가 라이브 UI 검토에서 내린 결정(본문 안 `@TO(…)` 토큰이 평문과 구분 없이 그려진다 + `@CC` 를 대칭으로 함께 덮는다 + 색 언어는 자동완성 배지와 동일하게)을 Tier S 요구사항 8개·수용 기준 8개(인라인)로 옮겼다. 판단 근거는 전부 실측이다 — DB 토큰 분포(§1), 서버 멘션 문법 `server/src/mention.ts` 3행 `MENTION_RE`, 렌더 파이프라인 `web/markdown.js` `renderInline`(인라인 단일 관문 — 코드스팬 분기가 최우선), `web/style.css` `.ac-kind` 규칙(`.ac-kind`/`.ac-kind.to`/`.ac-kind.cc`), 기존 시험 `server/test/web-markdown.test.ts` 전체 회독. 표시 자격을 «줄 시작» 이 아니라 «서버 라우팅 문법과 동일(코드 표면 제외)» 로 정한 근거는 §1.1 D1 이 갖는다. 이 SPEC 은 완결된 `SPEC-WEBMD-001` 의 REQ-WEBMD-010 평문 항등에 «멘션 토큰을 품은 본문» 예외를 여는 상세화다 — 형제 문서는 고치지 않고 이 HISTORY 한 줄로 기록한다(completed-spec-semantics 관례). | manager-spec |

---

## 1. 배경과 목적

운영자가 라이브 UI 를 검토하며 발견했다: 본문을 `@TO(봇이름)` 으로 시작해 수신 봇을 지정하는 것이 이 채팅의 실제 사용 관례인데, 화면은 그 토큰을 평문과 구분 없이 그린다. 지시문과 본문이 시각적으로 섞여 «누구에게 보낸 메시지인가» 가 한눈에 안 보인다.

이 SPEC 이 끝나면 본문 안 `@TO(봇이름)` / `@CC(봇이름)` 토큰이 자동완성 후보의 TO/CC 배지(`SPEC-WEBACNAV-001`)와 같은 색 언어의 칩으로 그려진다 — 칩 안에 종류 글자(TO/CC), 칩 뒤에 봇 이름.

### 1.1 판단 근거 (전부 이번 실측)

**DB 분포** (`sqlite3 server/data/minidiscord.db`, 읽기 전용 조회):

| 관측 | 값 |
|------|----|
| `@TO(` 로 **시작**하는 메시지 | 128 |
| `@TO(` 를 **어디든** 품은 메시지 | 133 |
| 그 차이 5건의 형태 | 3건은 **나중 줄의 줄 시작** 토큰(롤콜), 2건은 문장 중간·표 안 토큰 |
| 같은 줄에 토큰 여러 개 | 실존 — `@TO(a) @TO(b) @TO(c) @TO(d) 출석체크다` (롤콜 줄) |
| `@CC(` 토큰 | 0건 — 운영자 지시로 대칭 포함 |
| 줄 시작 토큰 중 `)` 없는 것 | 0건 |

**서버 라우팅 진실** — `server/src/mention.ts` 3행:

```ts
const MENTION_RE = /@(TO|CC)\(([^()\s]+)\)/g
```

서버는 본문 **원문 전역**에서 문법만 보고 멘션을 판정한다. 위치·줄 제한이 없다. 즉 문장 중간 토큰도 실제로 라우팅된다.

**결정 D1 — 매칭 범위**: 표시 자격을 «줄 시작» 으로 좁히면 실제로 라우팅된 멘션이 배지 없이 평문으로 남는다(롤콜 줄은 첫 토큰만 배지를 받는 반쪽짜리 화면이 된다). 그래서 자격을 **서버 문법과 동일(코드 표면 제외)** 로 정한다 — 표시가 라우팅 진실과 어긋나는 곳을 코드 표면(REQ-WEBMD2-004, 운영자 지시) 한 곳만 남긴다. 문법에 안 맞는 형태(소문자·빈 이름·미닫힘)가 배지를 받지 않는 것이 «과대 매칭 거부»다(AC-WEBMD2-003).

**결정 D2 — 조립 위치**: 배지 노드는 `renderInline`(인라인 단일 관문) 안에서 만든다. `web/app.js` 의 호출부 한 줄(`body.appendChild(renderMarkdown(raw, document))`)은 그대로고, app.js 는 무변경이다(REQ-WEBMD2-007).

**색 언어** — `SPEC-WEBACNAV-001` 이 정한 `.ac-kind` 배지를 그대로 소비한다: TO 는 채운 강조색 배경, CC 는 투명 배경 + 흐린 글자 + 가는 테두리. 새 색을 만들지 않는다.

## 2. 용어

| 용어 | 뜻 |
|------|-----|
| 토큰 | 본문 안 `@TO(이름)` / `@CC(이름)` 문자열. 자격 문법은 REQ-WEBMD2-003 |
| 종류 칩 | 토큰 자리에 그려지는 `span.md-mention` — 안에 `TO`/`CC` 글자만 |
| 배지 | 종류 칩 + 그 뒤 이름 텍스트를 합친 표시 |
| 코드 표면 | 코드스팬(`` `…` ``) 내부와 펜스 코드블록 내부 |
| 리터럴화 | 문법으로 해석하지 않고 원문 글자 그대로 텍스트로 남기는 것 |
| 평문 항등 | 토큰이 없는 입력에서 `renderMarkdown(src).textContent === src` 인 기존 계약(REQ-WEBMD-010) |

## 3. 요구사항 (GEARS) 과 수용 기준

주체 `<본문 렌더러>` 는 `web/markdown.js` 를 가리킨다. 요구사항 번호 접두를 `WEBMD2` 로 쓰는 것은 완결된 `SPEC-WEBMD-001` 이 소유한 `REQ-WEBMD-001`~`015` 와의 충돌을 피하는 선택이다.

### 3.1 요구사항 (8개)

**REQ-WEBMD2-001** (When — TO 토큰)
**When** `.msg-body` 안에 그려지는 텍스트에 자격 있는 `@TO(이름)` 토큰이 나타나면(코드 표면 제외 — REQ-WEBMD2-004), `<본문 렌더러>`는 그 자리에 종류 칩 `span.md-mention.to`(글자 `TO`)를 만들고 칩 뒤에 `이름` 을 텍스트 노드로 붙여야 한다. 토큰 문법(`@TO(`, `)`)은 표시에 남지 않으며, 이름은 다시 인라인 문법으로 해석하지 않는다.

**REQ-WEBMD2-002** (When — CC 토큰)
**When** 자격 있는 `@CC(이름)` 토큰이 나타나면, `<본문 렌더러>`는 같은 형태로 종류 칩 `span.md-mention.cc`(글자 `CC`)와 이름 텍스트를 만들어야 한다. 오늘 데이터에 `@CC(` 는 0건이나 운영자 지시로 TO 와 대칭으로 덮는다.

**REQ-WEBMD2-003** (Ubiquitous — 토큰 문법 = 서버 문법)
토큰의 자격 문법은 `server/src/mention.ts` 의 `MENTION_RE`(`/@(TO|CC)\(([^()\s]+)\)/`)와 같다 — 대문자 `TO`/`CC` 만, 이름은 `(`·`)`·공백이 없는 한 글자 이상, `)` 로 닫힘. 위치·줄·횟수 제한이 없다(같은 줄의 둘째 이후 토큰, 나중 줄의 토큰 전부 자격 있다). 표시 전용 길이 상한을 두지 않는다 — 서버에 없는 상한을 표시에만 두면 «라우팅은 되고 배지는 안 뜌» 괴리가 생긴다.

**REQ-WEBMD2-004** (Unwanted — 코드 표면)
코드스팬 안과 펜스 코드블록 안의 토큰은 배지로 만들어서는 안 된다 — 원문 그대로다(운영자 지시이자 REQ-WEBMD-003 코드스팬 우위의 계승). 알려진 괴리로 기록한다: 서버는 원문을 파싱하므로 코드 표면의 토큰도 라우팅되지만 표시는 배지를 붙이지 않는다.

**REQ-WEBMD2-005** (When 문법에 맞지 않으면 — 즉시 리터럴)
문법에 맞지 않는 `@TO`/`@CC` 계열 입력(소문자 `@to(`, 빈 이름 `@TO()`, 공백 이름 `@TO(이 름)`, 미닫힘 `@TO(안닫힘`, 괄호 포함 `@TO(a(b)`)은 배지 없이 원문 글자 그대로 남아야 하고 한 글자도 삼켜서는 안 된다 — 렌더러의 «즉시 리터럴» 교리(REQ-WEBMD-003)를 따른다.

**REQ-WEBMD2-006** (Ubiquitous — 색 언어)
배지의 색은 자동완성 배지(`SPEC-WEBACNAV-001` 의 `.ac-kind.to`/`.ac-kind.cc`)가 쓰는 토큰만 쓴다 — TO 는 `background: var(--md-accent)` + `color: var(--md-text-primary)`, CC 는 `color: var(--md-text-muted)` + `border: var(--md-border-width) solid var(--md-divider)`. 새 색 토큰 0개, 16진수 색 리터럴 0건. `.ac-kind` 규칙은 한 글자도 고치지 않는다(소비만).

**REQ-WEBMD2-007** (Ubiquitous — DOM 조립·모듈 표면)
배지 노드는 `createElement('span')` 과 `className`·`textContent` 로만 조립한다(REQ-WEBMD-005·010 계승 — 마크업 파싱 API 금지, 태그 이름 리터럸 고정). `web/markdown.js` 의 export 는 기존 다섯 그대로(REQ-WEBMD-001), `web/markdown.d.ts` 도 `web/app.js` 도 바뀌지 않는다 — 진입점 `renderMarkdown` 호출 한 줄이 배지까지 그린다.

**REQ-WEBMD2-008** (When 닫는 괄호를 못 찾으면 — 선형 시간)
토큰 판정은 각 자리에서 고정 문법 한 번만 시도하고 실패하면 즉시 리터럴로 떨어진다 — 되돌아가는 시도가 없다(REQ-WEBMD-013 계승). 닫을 수 없는 토큰 나열 같은 적대적 입력도 유한 시간에 끝난다.

### 3.2 수용 기준 (인라인 8개 — 전부 기계 판정)

시험은 기존 파일 `server/test/web-markdown.test.ts` 에 `AC-WEBMD2-*` describe 블록으로 **추가**한다. 기존 describe 블록(`AC-WEBMD-001`~`016`)은 한 줄도 고치지 않는다.

**AC-WEBMD2-001** (REQ-001)
Given 실측 최다 형태 그대로인 본문 `@TO(orchestrator) 처음 접속이다`, When `renderMarkdown` 이 그리면, Then 문단 첫 노드가 `span.md-mention.to`(textContent `TO`)이고 뒤에 이름 `orchestrator` 와 나머지 문장이 텍스트로 이어지며, `@TO(`·`)` 문법은 textContent 어디에도 없다.

**AC-WEBMD2-002** (REQ-002, REQ-003)
Given 실측 롤콜 줄 형태 `@TO(analyst) @TO(archivist) @CC(researcher) 출석체크다`, When 렌더하면, Then 종류 칩 셋(`.md-mention.to` 둘, `.md-mention.cc` 하나)이 순서대로 나열되고 각 칩 뒤에 이름이 텍스트로 남는다 — 같은 줄의 둘째 이후 토큰도 자격이 있다.

**AC-WEBMD2-003** (REQ-003, REQ-005 — 과대 매칭 거부)
Given 문법 밖 입력 다섯(`@to(bot)`, `@TO()`, `@TO(이 름)`, `@TO(안닫힘`, `@TO(a(b)` — 전부 줄 시작 포함), When 렌더하면, Then `.md-mention` 0개이고 textContent 가 원문과 동일하다.

**AC-WEBMD2-004** (REQ-004)
Given 한 줄 ``@TO(a) 설명 `@TO(b) 예시` `` 과 `@TO(x)` 줄을 품은 펜스 코드블록을 함께 담은 본문, When 렌더하면, Then 칩은 줄의 첫 토큰 하나뿐이고, 코드스팬의 textContent 는 `@TO(b) 예시` 그대로이며, `pre` 안에 `.md-mention` 이 없다.

**AC-WEBMD2-005** (REQ-001, REQ-003)
Given 두 번째 줄이 토큰으로 시작하는 다중 줄 본문(실측 메시지 형태 — `…출석 확인. (3/4)\n@TO(reporter) 너만 남았다`), When 렌더하면, Then `br` 뒤 그 줄의 시작에 칩과 이름이 있다.

**AC-WEBMD2-006** (REQ-006)
Given `web/style.css` 의 `/* SPEC-WEBMD-002 */` 블록, Then `.md-mention.to` 선언이 `var(--md-accent)` 배경과 `var(--md-text-primary)` 글자를, `.md-mention.cc` 선언이 `var(--md-text-muted)` 글자와 `var(--md-border-width) solid var(--md-divider)` 테두리를 담고, 블록 안 16진수 색 리터럴 0건·`var(--md-` 사용 1건 이상이다. `.ac-kind` 세 규칙(`.ac-kind`·`.ac-kind.to`·`.ac-kind.cc`) 본문은 `git show <plan.md §C 에 기록한 pre-flight HEAD>:web/style.css` 에서 뽑은 같은 규칙과 한 글자 차이 없이 동일해야 한다 — 커밋된 위반이 거짓 합격하지 못하게 하는 기준선 지정 비교다.

**AC-WEBMD2-007** (REQ-007 — 통합·회귀)
Given jsdom 앱 통합 경로(`loadApp` 골격)로 본문 `@TO(orchestrator) 출석체크` 메시지를 그리면, Then `#messages .msg-body` 안에 `.md-mention.to` 칩이 있다(앱 경로에서도 `renderMarkdown` 만으로 산다). 함께 — PRESERVE 위반은 **커밋돼도** 잡히게 비교 기준선을 plan.md §C 에 기록한 pre-flight HEAD 로 지정한다: `git log --oneline <§C 의 pre-flight HEAD>..HEAD -- web/app.js web/rich.js web/markdown.d.ts server/src` 가 아무것도 출력하지 않고, 작업 나무의 `git diff --stat -- web/app.js web/rich.js web/markdown.d.ts server/src` 도 0줄이며, `git diff <§C 의 pre-flight HEAD> -- server/test/web-markdown.test.ts` 는 추가 라인만 갖는다(제거·변경 0줄 — 기존 describe 블록 무수정). `web/markdown.js` export 는 다섯 그대로이고 기존 블록 `AC-WEBMD-001`~`016` 은 전부 초록이다.

**AC-WEBMD2-008** (REQ-008)
Given 적대적 입력 `'@TO(x'.repeat(10000)` (닫을 수 없음) 과 `('@TO(a) ').repeat(5000)` (유효 토큰 5,000개), When 렌더하면, Then 시험 `it` 옵션 `{ timeout: 20_000 }` 이 정한 안쪽에 예외 없이 종료한다. 타임아웃 숫자는 저장소 선례(`AC-WEBMD-013` 의 `}, 20_000)`)와 같은 방식으로 `it` 옵션에 못박는다 — 러너 기본 타임아웃 관례가 없는 저장소에서 본문 숫자만으로는 장식이므로, 이렇게 권한을 부여한다.

## 4. 범위 밖 (Exclusions)

### Out of Scope — 배지의 상호작용

- 배지 클릭·호버 카드·봇 프로필 연결 — 표시 전용이다
- 멘션 존재에 따른 알림·메시지 하이라이트 배경
- 살아있는 봇 목록과의 대조 — 존재하지 않는 봇 이름도 문법만 맞으면 배지로 그린다(서버 라우팅 진실과 동일한 규칙)

### Out of Scope — 다른 표면

- 자동완성 배지 `.ac-kind` 규칙 자체 — 소비만 하고 한 줄도 고치지 않는다(REQ-WEBMD2-006)
- 작성기 미리보기(`#msg-input` 쪽), 작성자 이름·머리글·아바타, 첨부·권한 버튼 표면(`web/rich.js`)
- 서버 계층 전체 — `server/src/` 를 한 줄도 고치지 않는다(멘션 파서·라우팅 무변경)

### Out of Scope — 색·토큰 확장

- 새 디자인 토큰 추가, 테마 분기, 배지 애니메이션 — `web/design-tokens.css` 는 무변경

## 5. 제약

| 제약 | 내용 |
|------|------|
| 의존성 | 외부 라이브러리 없음. 빌드 단계 없는 바닐라 ES 모듈 |
| 개발 방식 | TDD(`quality.yaml` `development_mode: tdd`) — AC 블록이 먼저 붉게 실패한다 |
| 테스트 | 기존 파일 `server/test/web-markdown.test.ts` 에 추가. 새 파일을 만들지 않는다 |
| 형 검사 | `npm run typecheck -w server` 종료 코드 0 — `web/markdown.d.ts` 무변경이 전제 |
| 색 | `var(--md-*)` 만. 새 토큰 0개, 16진수 리터럴 0건 |
| 언어 | 코드 주석 한국어. 커밋 메시지 한국어(`language.yaml`) |

## 6. 참조

- 서버 멘션 문법(자격 문법의 원천): `server/src/mention.ts` 3행 `MENTION_RE`, `SPEC-MENTION-001`
- 본문 렌더러 소유자: `SPEC-WEBMD-001` (`renderInline` 단일 관문·코드스팬 우위·마크업 API 금지·export 다섯)
- 색 언어 소유자: `SPEC-WEBACNAV-001` (`.ac-kind` 규칙, `web/style.css`)
- 기존 시험: `server/test/web-markdown.test.ts` (AC-WEBMD-001~016 — 수정 없이 초록 유지가 전제)
