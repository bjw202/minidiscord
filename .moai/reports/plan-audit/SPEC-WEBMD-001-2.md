# SPEC 감사 보고서: SPEC-WEBMD-001 (2회차 — 수리 검증 패스)

Iteration: 2/3 · 범위: **좁은 검증 패스**(전면 재감사 아님)
Verdict: **PASS**
Overall Score: **0.936** (1회차 0.879 에서 상승, Tier M 통과선 0.80)
남은 차단: **0건**

작성자 추론 맥락은 M1 Context Isolation 에 따라 무시했다 (Reasoning context ignored per M1 Context Isolation). 1회차 보고서의 발견 목록과 현재 산출물 넷, 그리고 저장소 실물에만 명령을 대서 판정했다. SPEC 을 쓴 주체가 수리도 하고 검증도 했으므로, 이 패스가 닫는 것은 그 자기검증 구간이다.

---

## 쉬운 말 요약

1회차가 막았던 두 건은 **둘 다 실제로 닫혔다.** 링크 라벨 위장 판별식은 이제 정규식으로 못박혀 있고, 내가 그 정규식을 직접 실행해 보니 1회차가 지적한 「스킴 없는 라벨」을 실제로 잡는다. 없는 경로를 가리켰던 확인 명령도 고쳐졌고, 문서가 실어 둔 출력이 내가 다시 돌린 출력과 한 글자도 다르지 않았다.

수리자가 1회차 권고를 **일부러 따르지 않은 두 자리**는 판정 결과 **수리자가 옳다.** D4 에서 1회차가 제안한 대체 단언도 여전히 공허했고(수리자가 그걸 피해 `doc` 축으로 옮긴 것이 맞다), D5 에서 1회차가 요구한 음성 입력은 어떤 구현도 가르지 못한다는 수리자의 주장을 실행으로 확인했다 — 양성 방향으로 옮긴 판단이 옳다. **이 두 자리는 1회차가 틀렸다.**

새로 생긴 문제는 작다. 판별 정규식이 ASCII 만 보므로 키릴 문자 위장 라벨은 힌트를 못 받고, DoD 에 새로 붙은 한 문장이 자기가 막지 못하는 것을 막는다고 적었다. 둘 다 진행을 막지 않는다.

---

## 발견별 판정

| # | 판정 | 한 줄 |
|---|------|-------|
| D1 | **verified-fixed** (잔여 사소 2건) | 정규식 실행 결과 스킴 없는 라벨 전 형태를 잡는다 |
| D2 | **verified-fixed** | 명령 재실행 출력이 문서 기재와 완전 일치 |
| D3 | **verified-fixed** | REQ-005 요소 이름 조항 + AC-007 기계 검사 |
| D4 | **verified-fixed — 1회차가 틀렸다** | 수리자 논거 성립. 1회차 대체안도 공허했다 |
| D5 | **verified-fixed — 1회차가 틀렸다** | 음성 입력은 판별력 0 임을 실행으로 확인 |
| D6 | verified-fixed | 라벨 Unwanted 로 정정 |
| D7 | verified-fixed | 러너 타임아웃 판정으로 교체 |
| D8 | **fixed-but-introduces-new-defect** | 예외 명시는 옳으나 새 문장 하나가 거짓 |
| D9 | verified-fixed (넷 전부) | |
| D10 | verified-fixed | `readdirSync` + 빈 목록 가드 + `markdown.js` 포함 단언 |

---

### D1 — 라벨 위장 판별 술어 · **verified-fixed**

`spec.md:173` 이 술어를 못박았다.

```js
const URL_LIKE_LABEL_RE = /^\s*(https?:\/\/|[a-z0-9-]+(\.[a-z0-9-]+)+(?=[:\/?#]|\s*$))/i
```

이 정규식을 **직접 실행**했다.

```
$ node /tmp/d1.mjs
--- AC-008 이 실제로 먹이는 라벨
"https://good.example/settings"    MATCH
"https://good.example/a"           MATCH
"https://good.example/x"           MATCH
"good.example/settings"            MATCH
"www.good.example"                 MATCH
"보고서 보기"                           no
"https://"                         MATCH
"a‮b"                         no
--- AC-008 이 먹이지 않는 현실 라벨
"good.example"                     MATCH
"GOOD.EXAMPLE"                     MATCH
"good.example:8080"                MATCH
"good.example?a=1"                 MATCH
"good.example#x"                   MATCH
"good.example/settings 로 이동"       MATCH
"good-example.co.kr"               MATCH
"xn--80ak6aa92e.com"               MATCH
"mail.google.com"                  MATCH
"1.2.3.4"                          MATCH
"  good.example/settings"          MATCH
"секьюрити.example"                no
"localhost"                        no
"good.example."                    no
"좋은 사이트 good.example"              no
"**good.example**"                 no
```

**1회차가 지적한 구멍은 닫혔다.** 스킴 없는 호스트 형태 — 맨호스트(`good.example`), 경로 있는 형태, 포트·질의·조각, 다단 도메인, punycode, IP — 가 전부 술어에 걸리고, 평범한 문장(`보고서 보기`)은 걸리지 않는다. 양방향 배제가 정의역과 함께 선다.

**「모든 절을 통과하면서 현실적 위장을 놓치는 구현이 있는가」** — 규범 위반을 감수하면 있다. AC-008 이 스킴 없는 방향으로 먹이는 라벨은 `good.example/settings`(슬래시 있음)와 `www.good.example`(`www.` 접두) 둘뿐이라, 술어를 `/^(https?:\/\/|www\.|[a-z0-9-]+(\.[a-z0-9-]+)+\/)/i` 로 좁힌 구현이 여덟 절을 전부 통과하면서 **맨호스트 라벨** `[good.example](https://evil.example)` 을 놓친다. 다만 이것은 1회차 상황과 격이 다르다 — 그때는 `^https?://` 구현이 **규범 위반조차 아니었고**, 지금은 REQ-008 이 정규식을 못박았으므로 그런 구현은 명백한 REQ 위반이다. 기계 검출이 안 될 뿐이다. 한 줄이면 닫힌다(아래 잔여 #1).

**호스트 비교 규칙의 일의성** — `spec.md:178` 「스킴이 없으면 `https://` 를 앞에 덧대어 `new URL()` 로 파싱」. `host` 를 쓴다고 명시하므로 포트 축은 일의적이다. 다만 앞공백 축은 두 갈래로 읽힌다(잔여 #2).

```
$ node  (host 비교 실측)
"good.example"               -> good.example
"www.good.example"           -> www.good.example
"  good.example/settings"    -> THROW: TypeError
"good.example:8080"          -> good.example:8080
```

정규식은 `^\s*` 로 앞공백을 허용해 `"  good.example/settings"` 를 URL 형으로 판정하는데, 그 라벨을 그대로 덧대 파싱하면 `new URL` 이 던진다 → fail-loud 로 힌트가 붙는다. 라벨을 먼저 trim 하는 구현은 파싱에 성공해 호스트를 견주므로, 같은 호스트인 경우 **힌트가 안 붙는다.** 관측 결과가 갈리는데 이를 가르는 절이 없다.

**잔여 (둘 다 optional·minor)**
1. AC-008 에 맨호스트 절 한 줄: `render('[good.example](https://evil.example)')` → `.md-link-host` 1개.
2. REQ-008 에 「라벨은 trim 한 뒤 덧댄다」(또는 「trim 하지 않는다」) 한 구절.
3. 술어가 ASCII `[a-z0-9-]` 만 보므로 `секьюрити.example` 같은 비ASCII 동형이의 라벨은 URL 형으로 판정되지 않아 힌트가 없다(위 실측). 표시층 방어의 대표 위협 하나가 정의역 밖이다 — 문자류를 넓히거나 §5 에 명시적 제외로 적으면 닫힌다.

### D2 — 거짓 증거 경로 · **verified-fixed**

문서가 싣는 명령을 **그대로 다시 돌렸다.**

```
$ grep -rln "msg-body" server/test scripts
server/test/web-chat.test.ts
exit=0
```

경고 한 줄도 없고 종료 코드 0 이다. `spec.md:238` · `plan.md:163` 이 실어 둔 출력 블록과 **바이트 단위로 같다.** 세 자리(`spec.md:238`, `plan.md:157`, `plan.md:163`) 전부 `server/test scripts` 로 고쳐졌고 `e2e` 잔존 0건이다.

**부류 훑기 — 네 산출물이 인용한 저장소 경로 전수.** 1회차 발견이 「한 번도 실행된 적 없는 명령」이었으므로 사례가 아니라 부류를 검사했다.

```
$ grep -rhoE '`?(web|server|scripts|\.github|\.moai)/[A-Za-z0-9_./-]+' *.md | ... | while read p; do [ -e "$p" ] && echo OK || echo MISS; done
OK   .github/workflows/ci.yml          OK   web/app.js
OK   .moai/plans/ai-stateless-scroll.md OK   web/design-tokens.css
OK   .moai/project/codemaps/overview.md OK   web/index.html
OK   .moai/project/design-dna-discord.md OK  web/rich.d.ts
OK   .moai/project/structure.md         OK   web/rich.js
OK   .moai/reports/plan-audit/SPEC-WEBMD-001-1.md  OK web/style.css
OK   .moai/specs/SPEC-PERM-001/spec.md  OK   server/src/routes-messages.ts
OK   .moai/specs/SPEC-WEBCHAT-001/spec.md OK server/test/web-chat.test.ts
OK   .moai/specs/SPEC-WEBRICH-001/plan.md OK server/test/web-permission-contract.test.ts
OK   scripts/e2e.mts                    OK   server/test/web-rich.test.ts
OK   scripts/e2e-lib.mts                OK   server/test/web-shell.test.ts
OK   scripts/e2e-scenario.mts           OK   server/test/web-visual.test.ts
OK   server/tsconfig.json
MISS server/test/web-markdown.test.ts
MISS web/markdown.d.ts
MISS web/markdown.js
```

**MISS 셋은 전부 이 SPEC 이 만들 산출물이다** — 부재가 정상이다. 그 밖에 해소되지 않는 경로는 0건이다.

### D3 — 요소 이름 축 · verified-fixed

`spec.md:151` 이 REQ-005 에 조항을 신설했다(「`createElement` 에 넘기는 태그 이름은 항상 문자열 리터럴」 + 허용 요소 열거 + `img`·`script`·`iframe`·`object`·`embed`·`style`·`form` 금지). `acceptance.md` AC-007 이 `expect(src).not.toMatch(/createElement\s*\(\s*[^'"`)]/)` 와 금지 요소 7종 루프를 더했다. 속성 이름 축과 대칭이 맞았다.

### D4 — 공허한 단언 · **verified-fixed, 그리고 1회차 권고가 틀렸다**

수리자의 논거를 판정한다: **성립한다.** `const before = fenced; expect(fenced).toBe(before)` 는 `x === x` 이므로 `renderMarkdown` 을 한 번도 부르지 않는 구현에서도 참이다.

**더 나아가 1회차가 제안한 대체안도 공허하다.** 1회차는 `const env = { body: fenced }; renderMarkdown(env.body, document); expect(env.body).toBe(fenced)` 를 권했는데, `renderMarkdown` 은 `env` 가 아니라 **문자열 값**을 받으므로 `env.body` 를 건드릴 물리적 경로가 없다 — 첫 단언과 똑같이 어떤 구현에서도 참이다. 수리자가 이를 따르지 않고 `doc` 축으로 옮긴 것은 옳은 판단이다.

대체 절이 실제로 실패할 수 있는지 확인했다 — `acceptance.md` AC-011 (3):

```ts
const bodyChildrenBefore = document.body.childElementCount
const frag = renderMarkdown('# 제목\n\n본문 [링크](https://good.example/x)', document)
expect(document.body.childElementCount).toBe(bodyChildrenBefore)
expect(document.getElementById('md-doc-probe')!.childElementCount).toBe(0)
expect(frag.childNodes.length).toBeGreaterThan(0)
```

노드를 `doc` 에 먼저 붙였다가 옮기는 구현은 첫 단언에서, 빈 fragment 를 돌려주는 구현은 셋째에서 떨어진다. **잡는 구현이 존재한다** — 공허하지 않다. (커버리지는 부분적이다: `body` 의 **요소** 수만 보므로 텍스트 노드 추가나 probe 밖 기존 요소 안쪽 삽입은 놓친다. 그러나 「실패할 수 없다」는 성질은 사라졌다.)

### D5 — 정제 집합의 판별력 · **verified-fixed, 그리고 1회차 권고가 틀렸다**

수리자의 논거 — 「음성 입력은 2단계 화이트리스트가 정제 유무와 무관하게 막으므로 가르지 못한다」 — 를 실행으로 검증했다.

```
$ node  (판별력 실측)
anchored ^https?:// on "﻿https://good.example/a" : false
BOM+https  : THROW        (new URL('﻿https://good.example/a'))
ZWSP+https : THROW
RLO+https  : THROW
```

- **음성 방향**: `'﻿javascript:alert(1)'` 은 정제해도(→`javascript:`) 안 해도 `^https?://` 에 안 걸려 `null` 이다. **정제 유무를 가르지 못한다 — 수리자가 옳다.**
- **양성 방향**: `safeHref('﻿https://good.example/a')` 는 정제하지 않으면 `^https?://` 에 걸리지 않아 `null` 이 되어 단언이 **실패한다.** 게다가 2단계를 느슨한 비앵커 `/https?:\/\//` 로 우회한 구현조차 3단계 `new URL` 이 **던지므로**(위 THROW 셋) 빠져나가지 못한다. **어떤 구현 경로로도 정제 없이는 통과할 수 없다.**

1회차가 요구한 음성 입력 셋도 여전히 AC-006 에 남아 있으므로 권고 자체가 삭제되지도 않았다. **판별력을 실제로 갖는 것은 수리자가 더한 양성 절 셋이다 — 1회차의 진단은 틀렸다.**

### D6 · D7 · D9 · D10 — verified-fixed

- **D6**: `spec.md:206` → `**REQ-WEBMD-012** (Unwanted — 권한 릴레이 불변)`. 정정됨.
- **D7**: AC-013 이 누적 `Date.now()` 상한을 없애고 `}, 20_000)` 러너 타임아웃을 판정자로 삼았다. 길이 상한(`<= 20100`)·표 열 상한은 그대로 이분 판정이고, 백트래킹 폭발은 20초로 돌아오지 못하므로 판별력을 잃지 않았다. 부하 민감성만 제거됐다.
- **D9-1**: `plan.md:106` `border-left: var(--md-space-1) solid var(--md-divider)`. 토큰 값 실측 — `web/design-tokens.css:44` → `--md-space-1: 4px;` 근거 참. 네 산출물의 생 `px` 리터럴은 이 설명 문장 하나뿐이고 CSS 규칙에는 0건.
- **D9-2**: `spec.md:113` `codeLangToken(info: string | undefined)` + `:116` 이 AC-009 와 AC-015 의 충돌 이음새를 명시적으로 닫는다.
- **D9-3**: 세 자리 표기 통일 확인 — `spec.md:311` 「`JS`→`js`·`c++` 는 통과」 / `acceptance.md:60` 「`JS`→`js` · `c++`→`c++`」 / 실제 단언 `codeLangToken('JS')).toBe('js')` · `codeLangToken('c++')).toBe('c++')`. 일치.
- **D9-4**: `plan.md` §D.2 가 「자리의 수는 **그것을 센 명령과 함께** 적는다」로 바뀌고 명령 둘을 실제로 싣는다. 자기 규칙 위반 해소.
- **D10**: AC-010 이 `readdirSync(webDir).filter(f => f.endsWith('.js'))` 도출 + `length > 0` 빈 목록 가드 + `toContain('markdown.js')` 범위 못박기. 1회차 권고보다 한 단계 강하다.

**D10 회귀 확인 — 새로 조인 단언이 오늘 트리를 깨지 않는가.** 수리가 `innerHTML` 검사에 `$` 앵커를 새로 붙였으므로 기계로 돌렸다.

```
$ node /tmp/ac010.mjs
violations = 0
```

`web/app.js` 의 `innerHTML` 여덟 자리(67·88·107·260·412·519 = `= ''`, 541·686 = 주석) 전부 통과한다. 회귀 없음.

### D8 — **fixed-but-introduces-new-defect (minor)**

예외 명시 자체는 1회차 권고보다 낫다 — 「환경 한정」으로 좁히지 않고 CI 를 판정에 남긴 이유까지 적었고, 목록 밖 skip 은 실패라는 절차를 붙였다.

**그러나 새로 쓴 한 문장이 거짓이다.** `acceptance.md:622`:

> **`Tests` 요약에 `failed` 0, 그리고 `skipped` 는 «의도된 skip» 뿐**. 테스트가 하나도 실행되지 않아도 종료 코드가 0 이 되는 경로를 이 조건이 막는다.

한 건도 실행되지 않은 run 은 `failed 0` 이고 `skipped` 도 비어 있으므로 **이 조건을 그대로 만족한다.** 그 경로를 실제로 막는 것은 이 조건이 아니라 vitest 의 기본 동작(테스트 파일 0개면 비영 종료)이다. 조건이 하지 못하는 일을 한다고 적은 과대주장이다.

실질 위험은 낮다 — DoD 첫 항목(AC-001~016 전부 초록)과 AC-001~013 이 실제 요소를 세므로 0건 실행은 다른 자리에서 떨어진다. **Class: optional · Severity: minor.**

Required fix — 그 문장을 지우거나, 「`Tests` 요약의 통과 건수가 이전 기준선(server 222 + channel 103) 이상」처럼 실제로 그 경로를 막는 조건으로 바꾼다.

---

## 예산 · 스키마 재계수 (내 명령으로)

```
$ grep -o "REQ-WEBMD-0[0-9][0-9]" spec.md | sort -u | wc -l      → 15
$ grep -c "^\*\*REQ-WEBMD-" spec.md                              → 15
$ grep -o "AC-WEBMD-0[0-9][0-9]" acceptance.md | sort -u | wc -l → 16
$ grep -c "^### AC-WEBMD-" acceptance.md                         → 16
$ grep -c "^| AC-WEBMD-" spec.md                                 → 16
```

REQ 15 / AC 16 — Tier M 상한 16/16 을 **각각 독립으로** 지킨다(합산 아님). 1회차 대비 불변이므로 D1 의 두 절이 새 기준이 아니라 AC-008 **안의** 절로 들어갔다는 HISTORY 기재도 참이다.

**frontmatter 12필드** — `id` `title` `version: "0.2.0"` `status: draft` `created`/`updated: 2026-09-08` `author` `priority: P2` `phase: "v2.2.0 target"` `module: "web/"` `lifecycle: spec-anchored` `tags` 전부 존재·형 일치. 거부 별칭 0건. 스키마 밖 허용 항목 `tier: M` · `depends_on` · `related_specs`.

**version 승격** — `0.1.0` → `"0.2.0"` ✓. **HISTORY 에 감사 회차 기록** — `spec.md:26` 이 「plan 감사 1회차(PASS 0.879, Tier M 통과선 0.80) 의 차단 2건과 비차단 8건 수리」로 시작해 D1~D10 각각의 처리를 적는다 ✓.

## Must-Pass 재확인

- **[PASS] MP-1** — REQ-WEBMD-001…015 연속 15, 결번·중복 0, 0채움 일관.
- **[PASS] MP-2** — 요구사항 층 판정. REQ-012 라벨 정정으로 1회차 D6 도 해소. 비정형 0건.
- **[PASS] MP-3** — 12/12, 위 참조.
- **[N/A] MP-4** — 단일 언어(브라우저 바닐라 JS) 범위.
- **[PASS] MP-5** — `SPEC-PERM-001`·`SPEC-WEBACNAV-001`·`SPEC-WEBCHAT-001`·`SPEC-WEBRICH-001` 전부 `status: completed`. retired/superseded/archived 0건.
- **[PASS] MP-6** — `grep -c syscall` → spec 0 · plan 0 · acceptance 0 · progress 0.
- **[PASS] MP-7** — 적중 둘 다 **부재 선언문**(`plan.md:265` 「`[NEEDS CLARIFICATION]` 항목 없음」, `progress.md:30` 「미해결 … 0건」). `[NEEDS CLARIFICATION: <topic>]` 형태 미해결 마커 0건.

## Category Scores

| 차원 | 1회차 | 2회차 | 근거 |
|------|-------|-------|------|
| Clarity | 0.80 | **0.90** | 판별 술어가 정규식으로 못박혀 D1 감점 사유 소멸. 잔여: 앞공백 trim 축이 두 갈래로 읽힘(D1 잔여 #2) |
| Completeness | 0.95 | **0.95** | 불변. `### Out of Scope —` H3 넷 · frontmatter 12/12 |
| Testability | 0.80 | **0.90** | D4·D5·D7·D10 이 전부 판별력을 **더한** 방향. 잔여: 맨호스트·비ASCII 라벨을 먹이는 절 부재 |
| Traceability | 1.00 | **1.00** | REQ 15 → 전부 AC 로 덮임, 고아 AC 0 |

집계(비가중 조화평균): `4 / (1/0.90 + 1/0.95 + 1/0.90 + 1/1.00)` = **0.9357** → **0.936**

## Defects Found

D1-r1. `acceptance.md` AC-WEBMD-008 — 스킴 없는 방향으로 먹이는 라벨이 슬래시형·`www.`형 둘뿐이라, 술어를 그 둘로 좁힌 구현이 맨호스트 위장 `[good.example](https://evil.example)` 을 놓치면서 전 절을 통과한다(REQ-008 위반이지만 기계 미검출) — Severity: minor — Class: optional — Required fix: 절 한 줄 추가 `expect(render('[good.example](https://evil.example)').querySelectorAll('.md-link-host').length).toBe(1)`.

D1-r2. `spec.md:173,178` — 술어는 `^\s*` 로 앞공백을 허용하는데 호스트 비교 규칙은 trim 여부를 정하지 않는다. 실측상 두 읽기의 관측 결과가 갈린다(비trim → `new URL` THROW → fail-loud 힌트 / trim → 같은 호스트면 힌트 없음) — Severity: minor — Class: optional — Required fix: REQ-008 에 「라벨은 trim 한 뒤 `https://` 를 덧댄다」 한 구절.

D1-r3. `spec.md:173` — `[a-z0-9-]` 가 ASCII 만 보므로 비ASCII 동형이의 라벨(`секьюрити.example`, 실측 미적중)은 URL 형 판정을 못 받아 힌트가 없다. 표시층 방어의 대표 위협 하나가 정의역 밖 — Severity: minor — Class: optional — Required fix: 문자류를 넓히거나 §5 에 명시적 제외로 적는다.

D8-new. `acceptance.md:622` — 「테스트가 하나도 실행되지 않아도 종료 코드가 0 이 되는 경로를 이 조건이 막는다」는 거짓이다(0건 실행은 `failed 0` + 의도된 skip 조건을 그대로 만족). 조건이 못 하는 일을 한다고 적은 과대주장 — Severity: minor — Class: optional — Required fix: 문장을 지우거나 통과 건수 하한 조건으로 교체.

**차단(blocking) 0건.**

## 수리 자체의 회귀 검사

- **불가검 절이 새로 생겼는가** — 아니다. AC-011 (3)·AC-006 양성 셋·AC-007 요소 이름·AC-010 `readdirSync` 전부 실패시키는 구현을 특정할 수 있음을 위에서 각각 보였다.
- **발견을 없애려고 요구사항을 약화했는가** — 아니다. 1회차가 D5 에 준 두 선택지(기준 보강 / REQ-006 정제 집합 축소) 중 **강한 쪽**을 골랐고, REQ-005·REQ-008·REQ-001 은 모두 조항이 **늘었다**. 다만 v0.1.0 원문이 디스크에 남아 있지 않아(`git status` → `?? .moai/specs/SPEC-WEBMD-001/`, 추적 이력 0) **기계 diff 로는 확인하지 못했다** — 1회차 보고서가 인용한 v0.1.0 문장들과의 대조로만 판정했다(§Gaps).
- **자기 훑기 범위 안의 고정 숫자** — `plan.md` §D.2 의 행 번호 표는 `server/test` 를 세므로 자기 계수가 아니고, REQ-015 의 `diff 0줄` 계약이 그 수를 잠근다. spec.md 의 「REQ 15 / AC 16」은 선언 헤더 앵커 계수와 충돌하지 않음을 재계수로 확인했다. **자기 계수 위반 0건.**

## Gaps (이 패스가 관측하지 않은 것)

- `npm test` · `npm run typecheck` · `npm run e2e` 를 실행하지 않았다(1회차가 `npm test` 를 실행해 초록·skipped 0 을 관측했고, 그 뒤 이 SPEC 은 코드를 한 줄도 바꾸지 않았다 — 산출물 넷은 전부 untracked 마크다운이다).
- v0.1.0 ↔ v0.2.0 기계 diff 를 뜨지 못했다(위 참조). 「요구사항 약화 없음」은 1회차 인용문 대조에 근거한 판정이지 diff 관측이 아니다.
- AC-011 골격이 `web-chat.test.ts:86 loadApp` 과 실제로 같은 해석 경로로 만나는지는 1회차와 마찬가지로 실행으로 확인하지 않았다(구현 부재).

## Residual-risk

- 이 패스의 D1 판정은 **정규식의 동작**을 실행으로 확인한 것이지, 구현자가 그 정규식을 그대로 쓸 것이라는 보장이 아니다. AC 가 술어 자체를 직접 관측하지 않으므로(렌더 결과로만 본다) REQ-008 의 정규식은 run 단계에서 **문헌적 규범**으로 남는다.
- D8-new 는 문서가 스스로 지어낸 방어 주장이다. 이런 문장은 다음 독자가 그 조건을 신뢰해 다른 가드를 빼는 방식으로 뒤늦게 값을 치른다.

## Recommendation

**PASS 0.936.** 1회차 차단 두 건은 실제로 닫혔고, 그 사실을 문서 기재가 아니라 명령 재실행과 정규식 직접 실행으로 확인했다. 1회차 권고를 일부러 따르지 않은 두 자리(D4·D5)는 **수리자가 옳고 1회차가 틀렸다** — 두 경우 모두 1회차의 대체안이 여전히 판별력 0 이었고, 수리자가 옮긴 축이 실제로 구현을 가른다.

run 착수를 막을 이유는 없다. 네 건 전부 optional 이며, 그중 **D1-r1(맨호스트 절 한 줄)** 만은 비용이 한 줄이고 이 SPEC 의 핵심 방어선을 기계 검출 범위 안으로 넣으므로 같은 패스에 얹기를 권한다.
