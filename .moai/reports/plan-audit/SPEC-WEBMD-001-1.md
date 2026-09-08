# SPEC 감사 보고서: SPEC-WEBMD-001

Iteration: 1/3
Verdict: **PASS**
Overall Score: **0.879** (Tier M 통과선 0.80)
Blocking 발견: **2건** (run 착수 전 수정 권고) · Non-blocking: 7건

작성자 추론 맥락은 M1 Context Isolation 에 따라 무시했다 (Reasoning context ignored per M1 Context Isolation). 산출물 넷과 저장소의 실제 소스에만 명령을 대서 판정했다. 문서가 적은 줄 번호·개수는 하나도 그대로 받지 않고 전부 다시 실행해 셌다.

---

## 쉬운 말 요약

이 SPEC 은 웹 채팅 본문을 마크다운으로 그리되 `innerHTML` 을 전혀 쓰지 않는 손수 만든 렌더러를 명세한다. 문서가 인용한 코드 자리 **열여섯 곳을 전부 저장소에서 다시 찾아 확인했고, 하나도 틀리지 않았다.** 문서가 스스로 고쳤다고 밝힌 개수 정정(`.msg-body` 단언 자리 여덟)도 명령으로 재현해 정확함을 확인했다. 성능 완화를 일부러 넣지 않은 근거(`LIMIT 200`)도 코드에 실제로 있고, 그것이 이력 조회의 유일한 경로임까지 확인했다 — 이 부재는 결함이 아니라 옳은 판단이다.

문제는 두 가지다. 첫째, 링크 라벨 위장을 막는 요구사항이 「라벨이 URL 처럼 생겼다」는 판별 기준을 정의하지 않았고, 수용 기준도 `https://` 로 시작하는 라벨만 먹인다 — 그래서 가장 흔한 위장 형태인 **스킴 없는 라벨**(`good.example/settings`)만 처리하는 구현이 모든 기준을 통과하면서도 방어에 구멍을 남긴다. 둘째, 계획서가 회귀 없음을 확인하는 데 쓰라고 적은 명령이 **없는 경로(`e2e`)를 가리킨다** — 실제 E2E 코드는 `scripts/` 에 있어서, 그 명령으로는 E2E 쪽을 한 번도 검색하지 못한다(내가 직접 검색해 보니 결론 자체는 참이다).

나머지 일곱 건은 고치면 좋지만 진행을 막지 않는다.

---

## Must-Pass Results

- **[PASS] MP-1 REQ 번호 일관성** — `grep -o "REQ-WEBMD-0[0-9][0-9]" spec.md | sort -u` → `REQ-WEBMD-001 … 015` 연속 15개, 중복·결번 없음, 0 채움 3자리 일관. 선언 헤더 수 `grep -c "^\*\*REQ-WEBMD-"` → `15` 로 일치.
- **[PASS] MP-2 GEARS 형식 준수** — 판정은 **요구사항 층(`REQ-XXX`, spec.md §4)** 에 대고 했다(AC 는 Group 4 에서 별도 채점). 15개 전부 GEARS 다섯 패턴 중 하나: Ubiquitous 9(REQ-001·002·003·006·009·010·012·014 — 「…해야 한다」), Unwanted 4(REQ-004 「만들어서는 안 된다」·005 「써서는 안 된다」·015 「고쳐서는 안 된다」·012 실질), When 4(REQ-007 「`a` 를 만들 때」·008 「라벨이 URL 을 흉내 낼 때」·011 「예외를 던질 때」·013 「상한을 넘을 때」). 비정형 문장 0건. 라벨 오기 1건은 D6(비차단).
- **[PASS] MP-3 YAML frontmatter 유효성** — 12개 정식 필드 전부 존재·형 일치: `id`(문자열) `title` `version: "0.1.0"`(따옴표 semver) `status: draft`(enum) `created`/`updated: 2026-09-08`(ISO) `author` `priority: P2` `phase: "v2.2.0 target"` `module: "web/"` `lifecycle: spec-anchored` `tags`(쉼표 문자열). 거부 별칭(`created_at`·`updated_at`·`labels`·`spec_id`) 0건. `phase` 는 릴리스명이지 생명주기 단계가 아니다 ✓. 추가 필드 `tier: M` · `depends_on` · `related_specs` 는 스키마 밖 허용 항목.
- **[N/A] MP-4 §22 언어 중립성** — 단일 언어(브라우저 바닐라 JS) 프로젝트 범위. 다국어 도구 열거 대상 아님 → 자동 통과.
- **[PASS] MP-5 D7 교차 SPEC 조정** — 본문 참조 SPEC 넷 전부 실재하고 `status` 가 retired/superseded/archived 아님:
  ```
  $ for s in SPEC-WEBCHAT-001 SPEC-WEBRICH-001 SPEC-PERM-001 SPEC-WEBACNAV-001; do
      printf "%-22s %s\n" $s "$(grep -m1 '^status:' .moai/specs/$s/spec.md)"; done
  SPEC-WEBCHAT-001       status: completed
  SPEC-WEBRICH-001       status: completed
  SPEC-PERM-001          status: completed
  SPEC-WEBACNAV-001      status: completed
  ```
  (아래 §「형제 SPEC 상위 규정」에서 인용 정확성까지 별도 검증.) BLOCKING 없음.
- **[PASS] MP-6 D8 크로스 플랫폼 규율** — `grep -c syscall` → spec.md 0 · plan.md 0 · acceptance.md 0. `syscall` 미등장 → D8-4 자동 PASS.
- **[PASS] MP-7 clarification 게이트** — `grep -rn '\[NEEDS CLARIFICATION' plan.md` → 1건 적중이나 그 줄은 `` `[NEEDS CLARIFICATION]` 항목 없음 — 승인된 계획서가 결정을 전부 싣고 있고… `` 라는 **부재 선언**이며 `[NEEDS CLARIFICATION: <topic>>]` 형태의 미해결 마커가 아니다. spec.md·acceptance.md·progress.md 적중 0건. `research.md` 없음(Tier M). 미해결 마커 0건.

---

## Category Scores

| 차원 | 점수 | 루브릭 대역 | 근거 |
|------|------|------------|------|
| Clarity | 0.80 | 0.75~1.0 | 용어표(§2)·문법표(REQ-003)·상한표(REQ-013)가 해석 여지를 좁힌다. 감점 사유 하나: REQ-WEBMD-008 의 「라벨이 URL 처럼 생겼는데」 판별 술어가 미정의라 합리적 엔지니어 둘이 다르게 구현한다(D1) |
| Completeness | 0.95 | 1.0 | HISTORY(25행)·배경(§1)·용어(§2)·요구사항(§4)·범위 밖(§5, `### Out of Scope — …` H3 넷 전부 `-` 항목 보유)·제약(§6)·수용 기준(§7)·참조(§8). frontmatter 12/12. 감점: 노드 트리의 **요소 이름** 경계가 어느 REQ 에도 없다(D3) |
| Testability | 0.80 | 0.75~1.0 | 16기준 전부 이분 판정이고 weasel word 0건(`적절히`·`합리적`·`충분히` 등 적중 0). 「전부 막기」와 「빈 구현」을 양방향으로 배제하는 설계(acceptance.md 상단 표)는 이 저장소에서 본 것 중 가장 강하다. 감점: 안전성 기준 셋의 정의역이 요구사항보다 좁다(D1·D3·D5)와 공허한 부분 단언 1건(D2) |
| Traceability | 1.00 | 1.0 | REQ 15 → 전부 최소 1개 AC 로 덮인다(001→AC-015, 002→016, 003→001·002·003·004, 004→010, 005→007·010, 006→006, 007→007, 008→008, 009→002·009, 010→005·014, 011→012, 012→011, 013→013, 014→004·014, 015→016). 고아 AC 0건, 없는 REQ 를 가리키는 AC 0건 |

집계는 조화평균: `4 / (1/0.80 + 1/0.95 + 1/0.80 + 1/1.00)` = **0.879** ≥ 0.80 (Tier M).

---

## Claim · Evidence · Baseline-attribution · Gaps · Residual-risk

### Claim 1 — 문서가 인용한 코드 앵커가 전부 실재하고 줄 번호가 맞다

**Evidence**

```
$ grep -n "className = 'msg-body'\|body.textContent = m.body" web/app.js
383:  body.className = 'msg-body'
384:  body.textContent = m.body ?? ''

$ grep -n "pre-wrap" web/style.css
309:  white-space: pre-wrap;
$ sed -n '307,311p' web/style.css
.msg-body {
  margin: var(--md-space-1) 0 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
$ grep -n "#invite-command" web/style.css
535:#invite-command {

$ grep -n "REQUEST_LINE_RE\|RESOLUTION_RE\|verdict-row" web/rich.js
53:const REQUEST_LINE_RE = /^승인하려면 "yes ([a-km-z]{5})", 거절하려면 "no \1" 라고 답해주세요\.$/gm
69:const RESOLUTION_RE = /^.*(?:승인 전송됨|거절 전송됨|전달하지 못했습니다) \(([a-km-z]{5})\)$/
130:          row.className = 'verdict-row'

$ grep -n "typecheck -w server" .github/workflows/ci.yml
27:      - run: npm run typecheck -w server

$ grep -n "LIMIT 200" server/src/routes-messages.ts
123:    const rows = db.prepare('SELECT * FROM messages WHERE room_id = ? AND id > ? ORDER BY id ASC LIMIT 200')

$ cat server/tsconfig.json | tail -3
  },
  "include": ["src", "test"]
}                      # allowJs 없음 ✓

$ sed -n '4,5p' web/rich.d.ts
 * server/tsconfig.json 이 include ["src","test"] 에 allowJs 없음이라 ../../web/rich.js import 는
 * 이 선언을 통해 검사된다 (plan.md §C) — 형이 실제로 검사되므로 이음새 시그니처 불일치가 여서 잡힌다.

$ sed -n '265p;445p;466p' web/app.js
  for (const m of history.messages) renderMessage(m)
    renderMessage(m)
      renderMessage(m)
```

`web/design-tokens.css` 토큰 15개(`--md-bg-panel`·`bg-input`·`bg-sidebar`·`divider`·`text-muted`·`text-link`·`radius-input`·`radius-badge`·`font-size-label`·`border-width`·`space-1`~`5`)는 각각 `grep -c "^  <토큰>:"` → 전부 `1`.

**Baseline-attribution** — 2026-09-08 감사 시점의 작업 트리(`main`, 미커밋 변경 포함). SPEC 이 적은 열여섯 자리 전부 **불일치 0건**.

**Gaps** — `.moai/plans/ai-stateless-scroll.md`(승인 원 계획서)는 읽지 않았다. SPEC 이 그 계획서를 「고쳤다」고 적은 대목(§D.2 개수 정정)은 계획서 원문이 아니라 **실제 테스트 파일**에 대고 재현했다(Claim 2).

**Residual-risk** — 줄 번호는 이후 커밋 하나에 낡는다. 다만 SPEC 은 줄 번호와 **내용 앵커**를 함께 적어 재탐색이 가능하다.

### Claim 2 — `.msg-body` 단언 자리 개수 정정(일곱 + 하나 = 여덟)이 정확하다

**Evidence**

```
$ grep -n "msg-body" server/test/web-chat.test.ts
183:    const bodies = $$('#messages .message .msg-body').map(n => n.textContent)
222:    // 구조: .message > .msg-head > (strong + span), .message > .msg-body
226:    expect(first.querySelector('.msg-body')!.textContent).toBe('사람')
269:    expect($$('#messages .message > .msg-body').length).toBe(2)
290:    expect(document.querySelector('#messages .msg-body')!.textContent).toBe('훅 없음')
313:    expect(document.querySelector('#messages .msg-body')!.textContent).toBe(evil)
333:    expect(document.querySelectorAll('#messages .msg-body')[1].textContent).toBe('실시간')
433:    const bodies = $$('#messages .msg-body').map(n => n.textContent)
828:    const bodies = $$('#messages .msg-body').map(n => n.textContent)
$ grep -c "msg-body" server/test/web-chat.test.ts
9
```

적중 9 중 222행은 주석 → 코드 자리 8. 그중 `textContent` 를 읽는 자리 **일곱**(183·226·290·313·333·433·828), 구조 개수를 세는 자리 **하나**(269). SPEC HISTORY 와 plan §D.2 의 목록과 **행 번호까지 완전 일치**.

픽스처가 전부 한 줄임을 직접 읽어 확인했다: `'첫 줄'`·`'둘째 줄'`·`'사람'`·`'훅 없음'`·`evil`(=`<img src=x onerror="window.__pwned=1"><b>굵게</b>`)·`'실시간'`·`['과거','실시간','놓친 것']`·`'방2 메시지'`. 어느 것도 REQ-003 문법표의 마커(`#`·`*`·`~~`·`` ` ``·`>`·`-`·`|`·`[](...)`)를 담지 않는다 — `__pwned` 의 밑줄은 이 SPEC 의 지원 문법이 아니므로(REQ-003 「목록에 없는 마커는 리터럴」) 리터럴로 남는다. 따라서 평문 항등(REQ-010)만 지켜지면 일곱 자리 전부 살아남는다는 판정은 참이다.

269행이 안전하다는 판정도 코드로 확인했다 — `web/rich.js:109 decorate(el, m)` 이 첨부·버튼 노드를 `el`(=`.message` wrap)에 붙이므로 `.message > .msg-body` 는 계속 2다.

**Baseline-attribution** — 위 명령들, 감사 시점 HEAD.

**Gaps** — 새 렌더러가 아직 없으므로 이 판정은 **설계상의 예측**이지 실행 결과가 아니다. 실제 회귀는 run 단계 M5 가 잰다.

**Residual-risk** — REQ-015 가 네 파일을 `diff 0줄` 로 못 박으므로 이 여덟이라는 수는 카드가 도는 동안 고정된다(자기 계수 위험이 계약으로 잠긴다).

### Claim 3 — 형제 SPEC 상위 규정이 「한 항목만」 정확히 겨냥한다

**Evidence** — `.moai/specs/SPEC-WEBCHAT-001/spec.md` §5 「Out of Scope — 시각·상호작용 심화」(312행 제목)는 항목 7개다:

```
$ sed -n '312,322p' .moai/specs/SPEC-WEBCHAT-001/spec.md
### Out of Scope — 시각·상호작용 심화
- 같은 작성자의 연속 메시지 그룹핑…
- 자동완성의 키보드 위/아래 탐색과 하이라이트 이동…
- 마크다운 렌더링, 코드 블록 하이라이트, 이모지 치환, 링크 자동 변환. 본문은 `white-space: pre-wrap` 텍스트로만 보여 준다
- 읽음 표시, 타이핑 인디케이터(사람 쪽), 알림, 사운드
- 메시지 수정·삭제·검색·무한 스크롤(과거 방향 페이지네이션)…
- 시각 문자열의 지역 시간 변환…
- 모바일 반응형 레이아웃…
```

WEBMD §3.1 은 셋째 항목을 **원문 그대로 인용**해 대상을 특정하고, 나머지 여섯을 하나도 빠뜨리지 않고 「그대로 유효」로 재열거한다(그룹핑·키보드 탐색·읽음 표시·타이핑·알림/사운드·수정/삭제/검색·무한 스크롤·지역 시간·모바일). **한 항목보다 넓게도 좁게도 겨냥하지 않았다.**

`REQ-WEBCHAT-004`(165~168행) 원문:

```
구현은 사용자·봇·시스템이 만든 어떤 문자열도 innerHTML 로 DOM 에 넣어서는 안 된다. 메시지 본문,
작성자 이름, 봇 이름, 방 이름은 전부 textContent 로만 넣는다. innerHTML 은 컨테이너를 비우는 용도(= '')로만 쓴다.
```

승계 판정: **축마다 다르다.** 금지 API 축은 강화(`innerHTML` 하나 → `outerHTML`·`insertAdjacentHTML`·`document.write`·`Range.createContextualFragment` 넷 추가), 속성 축은 신설(화이트리스트 다섯), 이름·시각 축은 불변. **메시지 본문 축은 완화**(textContent 전용 → 노드 트리). SPEC 은 이 완화를 §3.2 3번에서 숨기지 않고 명시한다 — 「강화 계승」이라는 표제는 축 넷 중 셋에 대해 참이고 하나에 대해 거짓이지만, 본문이 그 하나를 스스로 적으므로 은폐가 아니다.

완화된 표면의 경계 검증: 마크업 파서 API 는 오늘 `web/` 전체에 0건이고(아래 명령) 잎 텍스트는 `textContent`/`createTextNode` 로 제한되며 속성 이름 다섯·속성 값(href=`safeHref` 통과분, title=그 href, class=고정 접두+검증 토큰, target/rel=상수)이 전부 묶인다. **묶이지 않은 유일한 레버는 요소 이름**이다(D3).

```
$ grep -rn "outerHTML\|insertAdjacentHTML\|document\.write\|createContextualFragment" web/
(출력 없음)
$ grep -rn "innerHTML" web/ | grep -v "^web/app.js:5[0-9][0-9]:\s*//" 
web/app.js:67:  roomList.innerHTML = ''
web/app.js:88:  archivedList.innerHTML = ''
web/app.js:107:  botList.innerHTML = ''
web/app.js:260:  $('messages').innerHTML = ''
web/app.js:412:  box.innerHTML = ''
web/app.js:519:  box.innerHTML = ''
web/app.js:541:  // …innerHTML 은 쓰지 않는다 (REQ-WEBACNAV-002).
web/app.js:686:// innerHTML 로 넣으면 그대로 마크업이 된다(…)
```

전부 `= ''` 이거나 주석이라 AC-010 의 검사식이 **오늘 트리에서 이미 통과**한다(기준선 확인). 주석 둘은 `innerHTML` 뒤에 `=` 가 없어 `/innerHTML\s*=\s*[^\n]*/` 에 걸리지 않는다.

**Gaps** — `SPEC-WEBCHAT-001` 의 `acceptance.md` AC-WEBCHAT-003 원문은 읽지 않고 `web-chat.test.ts:313` 의 실물 단언으로 대신 확인했다.

**Residual-risk** — WEBCHAT §5 본문은 고치지 않고 HISTORY 한 줄만 sync 에서 더한다는 설계라, 그 한 줄이 실제로 착지하지 않으면 형제 문서가 자기를 부정하는 상태로 남는다(plan M7 이 책임 주체다).

### Claim 4 — 권한 릴레이 회귀 논증이 실제 코드 경로에서 성립한다

**Evidence** — `web/app.js` 386~391행:

```
  wrap.appendChild(head)
  wrap.appendChild(body)
  // 장식 훅 — 붙이기 직전에 정확히 한 번 (REQ-WEBCHAT-003)…
  if (roomDecorator) roomDecorator.decorate(wrap, m)
```

`decorate` 는 렌더된 DOM 이 아니라 **봉투 `m`** 을 받고, `web/rich.js:112·127` 이 `permissionResolutionId(m.body)` / `permissionRequestId(m.body)` 로 **원본 문자열**을 읽는다. 계획서 §D.1 의 교체 코드는 `const raw = m.body ?? ''` 로 값을 읽기만 하고 `m` 에 쓰지 않으며 순서를 바꾸지 않는다. 자바스크립트 문자열은 불변이므로 `renderMarkdown(raw, …)` 이 원문을 변형할 물리적 경로가 없다. **논증 성립.**

`REQUEST_LINE_RE` 는 `^…$` + `gm` 이라 코드블록 안에 그려지든 말든 원문 줄에 걸린다 — 「표시-진실 괴리는 생기지만 승인 흐름은 안전」이라는 SPEC 의 서술과 일치한다.

**Gaps** — `verdict-row` 버튼이 실제로 2개 유지되는지는 실행으로 재지 않았다(구현 부재). AC-011 (1)(2)가 run 단계에서 잰다.

**Residual-risk** — AC-011 의 골격이 `web-chat.test.ts:86 loadApp` 을 「같은 모양으로」 복제한다고만 적혀 있다. 그 `loadApp` 은 `vi.resetModules()` + 정적 지정자 `import('../../web/app.js')` 를 쓰므로 AC-012 의 `vi.mock('../../web/markdown.js')` 가 app.js 의 `./markdown.js` 와 같은 해석 경로로 만나 가로채기가 성립할 것으로 보이나, **실행으로 확인하지 않았다.**

### Claim 5 — 성능 완화 부재의 근거가 참이다 (결함 아님)

**Evidence**

```
$ grep -n "app.get('/api/rooms/:id/messages'\|LIMIT" server/src/routes-messages.ts
117:  app.get('/api/rooms/:id/messages', { preHandler: [requireAuth] }, async req => {
123:    const rows = db.prepare('SELECT * FROM messages WHERE room_id = ? AND id > ? ORDER BY id ASC LIMIT 200')
```

이력 조회 라우트는 이 **하나뿐**이고(다른 `SELECT` 는 방·첨부·이름 조회), 초기 적재와 `?after=` 백필이 같은 구문을 지나므로 한 방의 한 번 렌더 대상은 최대 200건이다. SSE 경로(`web/app.js:445`)는 `JSON.parse(e.data)` 한 **완성 메시지 한 건**을 그리며 부분 재렌더가 없다.

**판정: 캐시·가상 스크롤·메모이제이션의 부재는 근거 있는 설계 결정이며 결함으로 채점하지 않는다.** 오히려 §5 「Out of Scope — 성능 완화 (의도적 부재)」가 부재를 누락으로 오독하지 못하게 못 박은 것은 이 저장소의 기록된 실패 부류(「공시된 공백은 기준이 없으면 잠긴다」)를 정면으로 피한 서술이다.

**Gaps** — 200건 × 최대 20,000자(REQ-013 상한) = 최악 4MB 이며 SPEC 이 적은 「100~400KB」는 평균 추정이다. 최악값에서의 단일 패스 소요는 아무도 재지 않았다.

**Residual-risk** — AC-013 의 `Date.now() - t0 < 2000` 은 네 번의 렌더 누적 시간을 재므로 부하 걸린 기계에서 흔들릴 수 있다(D7).

### Claim 6 — 형 선언 파일 필요성 근거 둘이 모두 참이다

**Evidence** — `server/tsconfig.json` 에 `allowJs` 없음(위 인용), `include: ["src","test"]`. CI 27행이 `npm run typecheck -w server` 를 돈다. 선례 `web/rich.d.ts` 4~5행이 **정확히 같은 근거**를 주석으로 적고 있고, 실제로 `server/test/web-rich.test.ts:11` 과 `web-permission-contract.test.ts:25` 가 `from '../../web/rich.js'` 로 그 선언을 소비한다. **두 사실 모두 참.**

한편 `web-chat.test.ts:97` 은 `@ts-expect-error` 로 `web/app.js` 를 선언 없이 들여온다 — `markdown.d.ts` 를 더해도 app.js 쪽 오류는 그대로라 그 `@ts-expect-error` 가 「쓸모없어져 실패」하는 역회귀는 일어나지 않는다(내가 따로 확인한 이음새).

**Gaps** — `.d.ts` 부재 시 실제로 CI 가 붉어지는지는 재현하지 않았다(선례로 갈음).

### Claim 7 — 현재 트리의 `npm test` 는 초록이고 skipped 0 이다 (AC-016 기준선)

**Evidence**

```
$ npm test
EXIT=0
 Test Files  18 passed (18)
      Tests  222 passed (222)
 Test Files  6 passed (6)
      Tests  103 passed (103)
```

**Baseline-attribution** — 감사 시점 작업 트리에서 내가 직접 실행. server 18파일/222건 + channel 6파일/103건, skipped 0.

**Gaps** — `npm run e2e` 는 실행하지 않았다(실서버 프로세스를 띄우는 부하 작업). `npm run typecheck` 도 실행하지 않았다.

**Residual-risk** — skipped 0 은 이 기계에 playwright npx 캐시가 있어서 성립한다(`~/.npm/_npx/e41f203b7505f1fb/node_modules/playwright` 등 3건 확인). `server/test/web-visual.test.ts:51` 은 playwright 부재 시 `{ skip: skipReason !== null }` 로 **의도적으로 skip** 하므로, CI 러너에서는 acceptance.md DoD 의 「`skipped` 0」 항목이 성립하지 않는다(D8).

---

## Defects Found

### Blocking (run 착수 전 수정 권고)

**D1. 라벨 위장 판별 술어 미정의 — 가장 흔한 위장 형태를 어떤 기준도 잡지 못한다**
`spec.md` REQ-WEBMD-008 「**라벨이 URL 처럼 생겼는데** 그 호스트가 href 의 호스트와 다르면」 / `acceptance.md` AC-WEBMD-008 — Severity: **critical** — Class: **blocking**

「URL 처럼 생겼다」의 판정 기준이 문서 어디에도 없다. AC-008 이 먹이는 라벨은 네 개 전부 `https://` 로 시작한다(`https://good.example/settings`, `https://good.example/a`, 자동링크, `https://`). 그래서 **라벨 판별을 `^https?://` 로만 구현한 렌더러가 AC-008 을 전부 통과**하면서, 실제 피싱에서 가장 흔한 스킴 없는 라벨 — `[good.example/settings](https://evil.example/x)` 나 `[www.good.example](https://evil.example)` — 에는 힌트를 한 번도 붙이지 않는다. 양방향 배제(항상 붙임/한 번도 안 붙임)는 잘 설계돼 있으나, **정의역 자체가 실제 위협의 절반을 담지 못한다.** 이 저장소의 기록된 부류 「판별자의 정의역이 도달 불가다」·「가장 약한 허용 증거가 기준의 강도를 정한다」와 같은 형태다.

Required fix — 둘 다 한다:
1. REQ-WEBMD-008 에 판별 술어를 정규식으로 명시한다. 예: 라벨이 `/^\s*(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(?:[:\/?#]|\s*$)/i` 에 맞으면 URL 형 라벨로 본다(스킴 유무 무관). 스킴이 없으면 `https://` 를 덧대어 호스트를 파싱하고, 실패하면 기존대로 fail-loud.
2. AC-WEBMD-008 에 절 두 개를 더한다 — `render('[good.example/settings](https://evil.example/x)')` 에서 `.md-link-host` 1개이고 `evil.example` 를 담을 것, `render('[보고서 보기](https://evil.example/x)')`(URL 형이 아닌 라벨)에서 `.md-link-host` 0개일 것. 후자가 없으면 「모든 링크에 힌트」 구현이 다시 들어온다.

**D2. 계획서의 회귀 확인 명령이 없는 경로를 가리킨다**
`plan.md` §D.2 「`grep -rln "msg-body" server/test e2e   # 다른 파일이 보는지 (지금은 web-chat 하나)`」 및 이를 인용한 `spec.md` REQ-WEBMD-015 문단 — Severity: **major** — Class: **blocking**

`e2e` 디렉터리는 존재하지 않는다.

```
$ ls -d e2e
ls: e2e: No such file or directory
$ grep -rln "msg-body" server/test e2e
ugrep: warning: e2e: No such file or directory
server/test/web-chat.test.ts
$ grep -n '"e2e"' package.json
6:    "e2e": "npx tsx scripts/e2e.mts",
```

E2E 코드는 `scripts/e2e.mts` · `scripts/e2e-scenario.mts` · `scripts/e2e-lib.mts` 에 있다. 즉 문서가 「E2E 스크립트는 `.msg-body` 를 보지 않는다(위 두 번째 명령으로 확인)」라고 적었지만 **그 명령은 E2E 쪽을 한 번도 검색하지 않았다.** 경고 한 줄은 스크롤에 묻히고 종료 코드만 달라지므로, 그대로 실행한 사람은 부재를 확인했다고 오독한다(기록된 부류: 「부재 주장은 그것을 찾았을 명령까지만 선다」).

결론 자체는 참이다 — 내가 `scripts/` 를 직접 검색해 확인했다: `.msg-body` 0건이고 세 스크립트는 전부 HTTP/WS API 층만 단언한다(`sent7.body.message.id`, `frame7.body === body7` 등 서버 페이로드 문자열). 마크다운은 표시층에만 살므로 E2E 는 영향받지 않는다. **틀린 것은 결론이 아니라 증거다.**

Required fix — `plan.md` §D.2 와 `spec.md` REQ-WEBMD-015 의 명령을 `grep -rln "msg-body" server/test scripts` 로 고치고, 확인 결과(적중 `server/test/web-chat.test.ts` 하나)를 그 명령의 출력으로 적는다.

### Non-blocking

**D3. 노드 트리의 «요소 이름» 이 어떤 요구사항에도 묶여 있지 않다**
`spec.md` REQ-WEBMD-005 「새로 허용되는 것은 오직 `.msg-body` 안쪽의 `createElement` + `textContent` 노드 트리」 / AC-WEBMD-007 — Severity: major — Class: optional

속성 **이름** 축은 화이트리스트 다섯으로 묶고 `AC-007` 이 `not.toMatch(/setAttribute\s*\(\s*[^'"`)]/)` 로 기계 검사까지 건다. 그런데 **요소 이름** 축에는 대응물이 없다 — REQ-004 가 `img` 하나만 금지할 뿐, `createElement(변수)` 를 막는 문장도, 그것을 잡는 단언도 없다. `codeLangToken` 이 통과시키는 `script` 같은 토큰이 태그 이름으로 흘러가는 구현은 지금 문서상 규범 위반이 아니다(다른 AC 의 `pre code` 선택자가 우연히 잡을 뿐이다). 속성 축과 대칭을 맞추는 것이 비용 두 줄이다.

Required fix — REQ-WEBMD-005 에 「`createElement` 의 태그 이름은 항상 리터럴이며, 렌더러가 만드는 요소는 REQ-003 산출 표에 열거된 것뿐이다」를 더하고, AC-WEBMD-007 에 `expect(src).not.toMatch(/createElement\s*\(\s*[^'"`)]/)` 한 줄을 더한다.

**D4. AC-WEBMD-011 (3) 은 원리적으로 실패할 수 없는 단언이다**
`acceptance.md` AC-WEBMD-011 「`const before = fenced` … `expect(fenced).toBe(before)`」 — Severity: major — Class: optional

자바스크립트 문자열은 불변이라 이 세 줄은 **어떤 구현에서도 참**이다. 「입력 문자열 비변형」이라는 표제가 붙어 있어 검증한 것처럼 보이지만 잡는 구현이 존재하지 않는다. REQ-012 가 말하는 실제 위험(«메시지 **객체**의 변형»)은 (1)(2)의 버튼 개수 단언이 간접적으로 덮고 있으므로 커버리지 구멍은 아니고, 남은 문제는 **공허한 확신**이다.

Required fix — 그 세 줄을 객체 축으로 바꾼다: `const env = { author_type: 'system', body: fenced }; renderMarkdown(env.body, document); expect(env.body).toBe(fenced)`. 또는 줄을 지우고 「문자열 불변성 때문에 이 축은 검사 대상이 아니다」를 주석으로 남긴다.

**D5. REQ-006 이 정한 사전 정제 집합의 절반을 어떤 기준도 먹이지 않는다**
`spec.md` REQ-WEBMD-006 1번 「제어문자와 보이지 않는 공백·BOM·방향 제어 문자를 제거한다」 / AC-WEBMD-006 — Severity: minor — Class: optional

AC-006 의 적대적 아홉은 TAB·LF 만 담는다. BOM(`﻿`)·제로폭(`​`)·방향 제어(`‮`) 는 한 번도 입력되지 않는다. 다만 **보안 영향은 없다** — 정제를 덜 한 구현이라도 2단계 화이트리스트 `^https?://` 가 그 문자열들을 모두 거부하므로 fail-closed 다. 요구사항과 기준의 정의역 불일치일 뿐이다.

Required fix — AC-006 의 목록에 `'﻿javascript:alert(1)'` · `'java​script:alert(1)'` 둘을 더하거나, REQ-006 의 정제 집합을 실제로 필요한 것(제어문자 + 공백류)으로 좁힌다.

**D6. REQ-WEBMD-012 의 GEARS 라벨이 본문 형태와 어긋난다**
`spec.md` 「**REQ-WEBMD-012** (Ubiquitous — 권한 릴레이 불변)」 본문 「…**변형해서는 안 된다**」 — Severity: minor — Class: optional

`shall not` 은 GEARS Unwanted 패턴이다. 라벨만 고치면 된다(MP-2 판정에는 영향 없음 — 문장 자체는 유효한 GEARS 다).

**D7. 시간 상한 단언이 기계 부하에 흔들린다**
`acceptance.md` AC-WEBMD-013 「`expect(Date.now() - t0).toBeLessThan(2000)`」 — Severity: minor — Class: optional

`t0` 는 네 번의 렌더 **앞**에서 찍히므로 누적 시간을 잰다. 이 저장소는 병렬 세션이 도는 개발 기계에서 부하성 실패를 겪은 기록이 있다. 백트래킹 폭발을 잡는 것이 목적이라면 개별 렌더에 각각 상한을 걸거나, 상한을 5,000ms 로 올리고 「선형성 확인용 여유 상한」임을 명시하는 편이 낫다.

**D8. DoD 의 「skipped 0」이 형제 테스트의 의도된 skip 과 충돌한다**
`acceptance.md` Definition of Done 「`npm test` 종료 코드 0 — **`Tests` 요약에 `skipped` 0, `failed` 0**」 — Severity: minor — Class: optional

`server/test/web-visual.test.ts:51` 은 playwright 부재 시 `{ skip: skipReason !== null }` 로 skip 하며, 그 파일 주석(9~11행)은 그것이 **의도된 설계**임을 밝힌다. 이 기계에서는 npx 캐시에 playwright 가 있어 방금 실행한 `npm test` 가 skipped 0 이었지만(Claim 7), CI 러너에서는 skipped 1 이 정상이다. DoD 를 그대로 CI 에 적용하면 영원히 만족되지 않는다.

Required fix — 「skipped 0」 조건에 「단, `web-visual.test.ts` 의 playwright 부재 skip 은 예외이며 그 경우 skip 사유 출력을 `progress.md` 에 남긴다」를 붙이거나, 판정 환경을 「playwright 캐시가 있는 로컬」로 한정 명시한다.

**D9. 자잘한 문서 불일치 넷**
Severity: minor — Class: optional

- `plan.md` §D.2 가 「자리의 수를 고정 숫자로 적지 않는다」고 선언한 직후 「일곱」·「여덟」이라는 고정 숫자와 8행 표를 싣는다 — 자기 규칙 위반. (실질 위험은 REQ-015 의 `diff 0줄` 계약이 그 수를 잠그므로 낮다.)
- `plan.md` §C.2 `.md-quote` 의 `border-left: 4px solid var(--md-divider)` — REQ-014 는 「색·**간격**·모서리는 전부 `var(--md-*)` 토큰으로만」이라 적었는데 `4px` 는 생 리터럴이다. AC-014 는 16진수 색만 검사하므로 잡히지 않는다.
- `spec.md` §7 AC-009 행은 「`js`·`c++` 는 통과」, `acceptance.md` 매트릭스는 「`js`·`C++` → 토큰」, 실제 테스트는 `codeLangToken('JS')` 와 `codeLangToken('c++')` — 세 자리의 표기가 서로 다르다.
- `acceptance.md` AC-009 가 `codeLangToken(undefined)` 를 먹이는데 REQ-001 의 표면 선언은 `codeLangToken(info)` 로 인자 형을 정하지 않는다. `markdown.d.ts` 가 `info: string` 으로 선언되면 이 줄이 `npm run typecheck -w server`(AC-015 가 종료 코드 0 을 요구)에서 붉어진다 — 두 기준이 서로 충돌할 수 있는 이음새다. REQ-001 에 `codeLangToken(info: string | undefined)` 로 못 박으면 닫힌다.

**D10. AC-010 의 검사 파일 목록이 고정 열거다**
`acceptance.md` AC-WEBMD-010 「`for (const f of ['markdown.js', 'app.js', 'rich.js'])`」 — Severity: minor — Class: optional

REQ-005 는 「`web/` 아래 **어떤 파일도**」라는 전칭인데 기준은 세 이름을 박아 둔다. 오늘은 완전하다(`ls web/` → `app.js` `design-tokens.css` `index.html` `rich.d.ts` `rich.js` `style.css` — `.js` 는 둘뿐이고 `index.html` 의 인라인 모듈은 `import`+`initApp()` 두 줄뿐임을 읽어 확인했다). 다만 넷째 `.js` 가 생기는 순간 조용히 사각이 된다(기록된 부류: 「훑기 부류 목록은 하한이다」).

Required fix — `readdirSync(webDir).filter(f => f.endsWith('.js'))` 로 바꾸고, 목록이 비지 않았음을 먼저 단언한다.

---

## Recommendation

**PASS (0.879 ≥ 0.80).** must-pass 일곱 항목 전부 통과했고, 문서가 인용한 코드 자리 열여섯은 전부 재현됐으며, 이 SPEC 이 스스로 밝힌 개수 정정도 명령으로 확인해 정확했다. 성능 완화의 의도적 부재는 코드에 실재하는 근거 위에 서 있으므로 결함으로 채점하지 않았다. 안전성 기준 넷 가운데 셋(URL 스킴·앵커 속성·언어 토큰)은 「전부 막기」와 「전부 허용」을 **양방향으로** 배제하는 형태라 공허하지 않다.

run 착수 전에 두 건을 고치기를 권고한다.

1. **D1** — REQ-WEBMD-008 에 라벨 판별 술어를 정규식으로 명시하고, AC-WEBMD-008 에 스킴 없는 위장 라벨과 URL 형이 아닌 라벨 두 절을 더한다. 네 안전성 요구사항 가운데 이것만 「정의역이 실제 위협보다 좁은」 상태다.
2. **D2** — `plan.md` §D.2 와 `spec.md` REQ-WEBMD-015 의 확인 명령에서 `e2e` 를 `scripts` 로 고친다. 결론은 참이되 증거가 서지 않는다.

나머지 여덟은 optional 로 분류했다 — 오케스트레이터 재량이다. 그중 **D3**(요소 이름 축)과 **D4**(공허한 단언)는 각각 두 줄이면 닫히고 이 저장소의 재발 부류를 직접 겨냥하므로, 같은 수정 패스에 얹는 것을 권한다.

---

## 감사 방법 기록 (재현용)

판정에 쓴 명령은 전부 이 보고서 본문에 원문으로 실려 있다. 실행 환경은 감사 시점의 작업 트리(브랜치 `main`, 미커밋 변경 포함)이며, 별도 표기가 없는 한 저장소 루트에서 실행했다. `npm run e2e` · `npm run typecheck` 는 실행하지 않았다(§Gaps 에 명시).
