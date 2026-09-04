# t33 sync 감사 — 사용자 이름 상한 (보안 렌즈)

- **대상**: `f5cb336..9f15d96` 전체 diff + 미커밋 sync 문서 편집(`CHANGELOG.md`, `README.md`)
- **나무**: `.claude/worktrees/t33`, 브랜치 `WT-username-length`
- **SPEC**: SPEC-AUTH-001 v0.6.0 (`status: completed`)
- **감사 렌즈**: `--security`
- **감사 일자**: 2026-09-03

---

## 0. 통과선 — 내가 직접 읽은 자리

디스패치가 준 값을 쓰지 않고 SSOT 두 자리를 직접 읽었다.

**Claim**: 이 SPEC 의 통과선은 **0.80** 이다.

**Evidence** (원문 그대로):

```
$ sed -n '1,16p' .moai/specs/SPEC-AUTH-001/spec.md
---
id: SPEC-AUTH-001
...
tier: M
depends_on: [SPEC-CORE-001]
---
```

```
$ grep -n -E "tier|threshold" .claude/rules/moai/workflow/spec-workflow.md
138:| Tier | Scope guidance (LOC) | Files affected | Artifact set | plan-auditor PASS threshold |
140:| S (Simple) | < 300 LOC | < 5 files | **2 files**: spec.md + plan.md (AC inline in spec.md §3) | 0.75 |
141:| M (Medium) | 300 - 1000 LOC | 5 - 15 files | **3 files**: spec.md + plan.md + acceptance.md | 0.80 |
142:| L (Large) | > 1000 LOC or constitutional | > 15 files | **5 files**: ... | 0.85 |
...
329:    2. **Overall score ≥ the SPEC's per-tier PASS threshold** — Tier S `0.75`,
330:       Tier M `0.80`, Tier L `0.85` (matching § SPEC Complexity Tier). The flat
```

**읽은 자리**: `.moai/specs/SPEC-AUTH-001/spec.md` 프런트매터 `tier: M` (15행) + `.claude/rules/moai/workflow/spec-workflow.md:141` 및 `:329-330`.
**결론**: Tier M → **0.80**. 디스패치가 제시한 「Tier M / 0.80」 읽기와 **일치**한다 — 이견 없음.

**프로필**: `spec.md` 프런트매터에 `evaluator_profile` 없음 → `harness.yaml` `default_profile: "default"` → `.moai/config/evaluator-profiles/default.md`.
가중치 40/25/20/15, must-pass = Functionality + Security, Craft 하드 임계 = 커버리지 85%.
`harness.yaml` 에 `evaluator_mode: hierarchical` 없음 → **평면 가중 백분율 모드**.

---

## 1. 종합 판정

**Overall Verdict: PASS (0.891 / 통과선 0.80)**

- must-pass 두 축 모두 독립 통과: Functionality 92 (모든 AC 충족), Security 84 (Critical/High 0건 — 최고 심각도 Medium).
- 차단 발견 **1건**(F1, 문서 정확성), 선택 발견 7건.
- 차단 1건은 코드가 아니라 **이 phase 가 편집한 바로 그 파일(`CHANGELOG.md`)의 다른 절**이 수리 이전 상태를 계속 단언하는 문제다.

**귀속 [HARD]**: 0.891 은 작업 트리 `9f15d96` + 미커밋 `CHANGELOG.md`·`README.md` 편집 시점의 값이다. F1 을 고친 뒤 재채점하지 않았다.

---

## 2. 차원 점수

| 차원 | 점수 | 판정 | Evidence (원문) |
|---|---|---|---|
| Functionality (40%) | 92/100 | PASS | `npm test -w server` → `Test Files  16 passed (16)` / `Tests  192 passed (192)`<br>`npm test -w channel` → `Test Files  7 passed (7)` / `Tests  123 passed (123)`<br>`npm run typecheck -w server` → `> tsc --noEmit` (종료 0) · `npm run typecheck -w channel` → `> tsc --noEmit` (종료 0)<br>변이 M1(길이 조건 도달 불가) → `AssertionError: username length 20000: expected 201 to be 400` / `Tests  1 failed \| 11 passed (12)` |
| Security (25%) | 84/100 | PASS | 하위 가드 4개 전부 변이로 사살 — M1b `AssertionError: username length 33: expected 201 to be 400`, M2 `username length 8`, M3 `username length 6`, M4 `username length 8` (각 `Tests  1 failed \| 11 passed (12)`)<br>생산자 실측: `routes-bots.ts:59` → `if (!name?.trim()) return reply.code(400)...` (상한 없음), `channel-server.ts:187` → `sender: msg.author_name` (무중화)<br>생 프로브 → `{"label":"U+202E RTL override (interior)","status":201,"stored":true}`, `{"label":"closing tag payload </channel>","status":201,"stored":true}` |
| Craft (20%) | 88/100 | PASS | `npx vitest run --coverage --coverage.provider=v8` → `auth.ts \| 97.82 \| 96.87 \| 100 \| 100 \| 21` · 전체 `Statements : 93.85% ( 580/618 )` / `Lines : 95.68% ( 488/510 )` — 하드 임계 85% 상회<br>린터 스크립트 부재: `{"dev":"tsx src/index.ts","test":"vitest run","typecheck":"tsc --noEmit"}` (server), `{"dev":...,"build":"tsc","pretest":"tsc","test":"vitest run","typecheck":"tsc --noEmit"}` (channel) |
| Consistency (15%) | 92/100 | PASS | 형식/명명 grep: `USERNAME_MAX_LENGTH` 는 형제 `channel/src/truncate.ts:13 export const MAX_NAME_BYTES = 256` 과 같은 「테스트가 import 하는 export const 상한」 관행<br>거절 형식은 파일 관행 그대로 `return reply.code(400).send({ error: ... })` (auth.ts:38 기존 · :42·:45 신규)<br>주석 언어 한국어 = `language.yaml` `code_comments: ko` |

### 가중 조화평균

`1 / (0.40/0.92 + 0.25/0.84 + 0.20/0.88 + 0.15/0.92)` = `1 / 1.12272` = **0.891**

---

## 3. 디스패치가 물은 여섯 질문 — 실행으로 답한다

### Q1. 상한은 실제로 하중을 받는가 — 예, 네 하위 절 전부

`server/src/auth.ts` 를 `/tmp` 로 복사해 기준선을 잡고(`git hash-object` → `88bc3316...`, sha256 `f03b55e7...`) 변이 다섯을 돌린 뒤 복원했다. 복원 후 sha256 이 기준선과 동일함을 확인했다.

| 변이 | 무엇을 죽였나 | 결과 |
|---|---|---|
| M1 `> USERNAME_MAX_LENGTH` → `> 1000000000` | 길이 가드 도달 불가 | `AssertionError: username length 20000: expected 201 to be 400` → **RED** |
| M1b `> USERNAME_MAX_LENGTH` → `> 10000` | 경계값만 무력화 | `AssertionError: username length 33: expected 201 to be 400` → **RED** |
| M2 `if (FORBIDDEN.test \|\| !== trim)` → `if (false)` | 글자 가드 통째 | `AssertionError: username length 8` (NUL) → **RED** |
| M3 trim 절 제거 (정규식 유지) | 앞뒤 공백만 무력화 | `AssertionError: username length 6` (`' alice'`) → **RED** |
| M4 정규식 절 제거 (trim 유지) | 제어문자만 무력화 | `AssertionError: username length 8` (NUL) → **RED** |

복원 후: `Tests  192 passed (192)`, `git diff --stat -- server/src/auth.ts` 빈 출력.

**판정**: 길이 상한·경계값·제어문자·앞뒤 공백 **네 하위 절이 각각 독립으로** 테스트에 붙들려 있다. 「어느 테스트도 죽일 수 없는 가드」가 아니다.

### Q2. 코드 포인트 vs 바이트 vs UTF-16 — 최악 저장 바이트는 128, 하류 예산은 256

```
{"name":"ASCII a x32","cp":32,"utf16":32,"utf8_bytes":32,"passes_cap":true}
{"name":"Hangul precomposed U+D64D x32","cp":32,"utf16":32,"utf8_bytes":96,"passes_cap":true}
{"name":"Emoji U+1F600 x32cp","cp":32,"utf16":64,"utf8_bytes":128,"passes_cap":true}
{"name":"CJK extB U+20000 x32cp","cp":32,"utf16":64,"utf8_bytes":128,"passes_cap":true}
{"name":"NFD Hangul jamo 30cp + aa","cp":32,"utf16":32,"utf8_bytes":92,"passes_cap":true}
```

생 프로브도 같은 값을 실제 저장에서 확인했다 — `{"label":"emoji x32cp (128 utf8 bytes)","status":201,"stored":true,"stored_utf8_bytes":128}`.

**공격자가 실제로 저장할 수 있는 최악치**: 코드 포인트 32 = **UTF-16 코드 유닛 64 · UTF-8 128바이트**(astral 4바이트 문자 32개). 결합 문자는 각각 한 코드 포인트로 세므로 별도 증폭이 없다.

**하류가 더 작은 경계를 가정하는가 — 아니다.** 유일한 하류 예산은 `channel/src/truncate.ts:13 export const MAX_NAME_BYTES = 256 // OD-5 작성자 이름 상한` 이고, `channel-server.ts:176` 이 `truncateToBudget(neutralizeEnvelope(msg.author_name), MAX_NAME_BYTES)` 로 쓴다. 중화 팽창까지 최악으로 잡아도(`<` 1바이트 → `&lt;` 4바이트, ASCII 32자 = 128바이트) **128 ≤ 256** 이라 예산을 깨지 않는다. DB 쪽도 `db.ts:9 username TEXT UNIQUE NOT NULL` 로 길이 제약이 없다.

### Q3. `params.meta.sender` 주입 통로 — 좁아졌으나 닫히지 않았다 (문서 서술이 정확하다)

생산자 둘을 직접 읽었다.

- `channel/src/channel-server.ts:176` — `content` 쪽 이름 조각은 **중화 + 절단**된다.
- `channel/src/channel-server.ts:187` — `sender: msg.author_name` 은 **원문 그대로**. 같은 파일 168–170행 주석이 REQ-CHANINJECT-002 를 근거로 이를 설계로 명시한다.
- `server/src/routes-bots.ts:59` — `if (!name?.trim()) return reply.code(400).send({ error: '봇 이름이 필요합니다' })`. **비어 있지 않은지만** 본다. 길이·글자 검사 0건.
- `author_name` 이 사용자 이름 **또는** 봇 이름인 것은 `gateway.ts:231 author_name: authorName(m)` · `routes-messages.ts:139 author_name: displayName(db, m)` 로 확인.

생 프로브로 32자 이내 주입 페이로드가 실제로 저장됨을 확인했다:

```
{"label":"closing tag payload </channel>","status":201,"stored":true,"stored_utf8_bytes":10}
{"label":"opening tag payload <channel x=1>","status":201,"stored":true,"stored_utf8_bytes":13}
```

**판정**: 새 README/CHANGELOG 산문은 **과장하지도 축소하지도 않았다.** 「좁혔지만 닫지 못했다」와 그 세 이유(짧은 페이로드가 32자 안에 든다 / 봇 이름 무상한 / 이 자리 이름은 둘 중 어느 쪽도 될 수 있다)는 셋 다 위 실측으로 확인된다.

### Q4. 검증 사슬의 순서와 완전성 — 순서는 옳고, 빈 문자열 검사는 여전히 하중을 받는다. 다만 내부 서식 제어문자는 통과한다

**순서**: `typeof username !== 'string'` (auth.ts:37) 가 `[...username].length` (:41) 보다 앞선다. 비문자열이 스프레드에 닿지 않으므로 강제 변환 경로가 없다.

**기존 빈 문자열 검사는 잉여가 아니다.** `''` 은 코드 포인트 0 ≤ 32 이고, 제어문자 0건이고, `'' === ''.trim()` 이라 t33 가드 **어느 것도 잡지 못한다**. `:37` 의 `username === ''` 이 없으면 빈 이름이 그대로 저장된다. 새로 도달 가능해진 것도 없다 — 공백만 있는 `' '` 은 trim 절이 잡는다.

**그러나 DB insert 에 도달하는 위반 입력이 있다.** 생 프로브 원문:

```
{"label":"U+200B zero-width space (interior)","status":201,"stored":true,"stored_utf8_bytes":8}
{"label":"U+202E RTL override (interior)","status":201,"stored":true,"stored_utf8_bytes":8}
{"label":"U+00A0 NBSP (interior)","status":201,"stored":true,"stored_utf8_bytes":7}
{"label":"U+3000 ideographic space (interior)","status":201,"stored":true,"stored_utf8_bytes":8}
{"label":"U+2028 line separator (interior)","status":201,"stored":true,"stored_utf8_bytes":8}
{"label":"NFC e-acute cafe","status":201,"stored":true,"stored_utf8_bytes":5}
{"label":"NFD e-acute cafe (look-alike twin)","status":201,"stored":true,"stored_utf8_bytes":6}
{"label":"Cyrillic homoglyph alice","status":201,"stored":true,"stored_utf8_bytes":6}
{"total_rows_created":11}
```

정규식/`trim()` 의 실제 덮개 범위:

```
{"ws":"U+0009","interior_blocked":true,"leading_blocked":true}
{"ws":"U+0020","interior_blocked":false,"leading_blocked":true}
{"ws":"U+00A0","interior_blocked":false,"leading_blocked":true}
{"ws":"U+2028","interior_blocked":false,"leading_blocked":true}
{"ws":"U+3000","interior_blocked":false,"leading_blocked":true}
{"ws":"U+FEFF","interior_blocked":false,"leading_blocked":true}
```

`trim()` 의 앞뒤 덮개는 넉넉하다(JS `trim` 은 NBSP·U+3000·BOM 까지 자른다) — 앞뒤 방향은 견고하다. 빈 자리는 **내부**다. → F2, F3.

**정규화 없음**:

```
{"label":"e-acute NFC vs NFD","nfc_cp":1,"nfd_cp":2,"strictly_equal":false,"after_NFC_equal":true}
```

### Q5. 로그인 비대칭 — 실재하고, 의도이며, 문서화되어 있다

프로브:

```
{"label":"legacy 20000-char row: login reachable?","status":401}
{"label":"re-register same 20000-char name","status":400}
```

`POST /api/auth/login` (auth.ts:55-72) 은 길이 검사가 없어 20000자 이름이 `SELECT ... WHERE username = ?` 까지 도달한다(위 `401` 은 프로브가 심은 해시가 유효하지 않아서다 — 유효한 해시를 가진 기존 긴 이름 계정은 그대로 로그인된다). 즉 **register 가 더 이상 만들 수 없는 상태에 login 이 도달할 수 있다.**

이것은 결함이 아니라 명시된 결정이다 — `.moai/specs/SPEC-AUTH-001/spec.md:93` 「로그인은 상한을 넘는 이름으로도 저장된 행이 있으면 그대로 성립한다」. 증폭 경로도 없다: `!row || !verifyPassword(...)` 의 단락 평가 때문에 없는 사용자에게는 scrypt 가 돌지 않으므로, 긴 이름 반복 로그인 시도가 CPU 증폭기가 되지 않는다. (F8 로 기록만 남긴다.)

### Q6. 기존 행 — 마이그레이션·백필 없음, 그리고 전건 불변식을 가정하는 코드 경로도 없음

`server/src/db.ts` 에 마이그레이션 기구는 **있다**(`schema_migrations` 표 `:70`, `ALTER TABLE rooms ADD COLUMN created_by` `:101`, `ROOMAUTHZ_BACKFILL_MARKER` 백필 `:79`·`:109-117`) — 즉 「할 줄 몰라서 안 한 것」이 아니라 하지 않기로 한 것이다. t33 용 마커·백필·`ALTER` 는 diff 에 0건이고, `db.ts` 는 이번 diff 에 포함되지도 않았다.

`users.username` 이 32자 이하라고 가정하는 코드 경로를 찾지 못했다 — 유일한 하류 예산인 `MAX_NAME_BYTES = 256` 은 절단으로 자기 방어하고, 다른 소비자(`routes-messages.ts:179-180`, `gateway.ts:240-241`)는 길이를 가정하지 않는다. **기존 긴 이름 행이 깨뜨리는 불변식은 없다.**

---

## 4. 문서 주장 검증

### CHANGELOG.md — 새 `### 고쳐짐 — 사용자 이름에 상한이 생겼습니다 (카드 t33)` 절

| # | 주장 | 판정 | 근거 |
|---|---|---|---|
| 1 | 2만 글자 이름이 `201` 로 통과해 저장됐다 | **확인** | 변이 M1 로 등가 재현: 길이 가드 도달 불가 시 `expected 201 to be 400` (즉 수리 전 동작은 201). run-done §1 원문과 일치 |
| 2 | 수리 후 같은 요청이 `400` 으로 바뀐다 | **확인** | 현재 트리 `Tests  192 passed` 중 해당 기준이 20000자에 400 을 단언 |
| 3 | `USERNAME_MAX_LENGTH = 32` (코드 포인트) + 메시지 문구 | **확인** | `auth.ts:28`·`:41-42` 원문 |
| 4 | 제어문자 C0·C1 금지, 앞뒤 공백 금지 + 메시지 문구 | **확인** | `auth.ts:30`·`:44-45` 원문 |
| 5 | 실사용 이름 `alice`·`e2e-user`·`restart-user` 를 모두 담는다 | **확인** | `alice`·`restart-user` = server/test, `e2e-user` = `scripts/e2e.mts:250`. 셋 다 ≤ 32 |
| 6 | 문자 집합 허용 목록 없음 — `홍길동` 은 가입된다 | **확인** | 기준 통과 목록에 `'홍길동'` → 201, 스위트 초록 |
| 7 | 기존 계정은 그대로 (되돌리거나 지우지 않는다) | **확인** | diff 에 마이그레이션·백필·`ALTER` 0건. Q6 참조 |
| 8 | 봇 이름에는 아직 상한이 없다 | **확인** | `routes-bots.ts:59` 원문 |
| 9 | `</channel>` 같은 짧은 문자열은 32자 안에 들어간다 | **확인** | 생 프로브 `status 201, stored true` |
| 10 | `meta.sender` 이름은 사용자 이름일 수도 봇 이름일 수도 | **확인** | `channel-server.ts:187` + `gateway.ts:231` / `routes-messages.ts:139` |
| 11 | 거절 6가지·통과 3가지·거절 시 `users` 0행 | **확인** | `auth.test.ts` 신규 기준 본문 — 거절 배열 6원소, 통과 배열 3원소, `COUNT(*)` 를 0 과 3 으로 각각 단언 |
| 12 | SPEC-AUTH-001 v0.6.0 — REQ-AUTH-016·AC-AUTH-015 | **확인** | `spec.md:29`·`:84`, `acceptance.md:280` |

**검증 불가 0건.** 다만 #1 의 원 재현 파일(`server/test/t33-red.test.ts`)은 run 레인이 삭제해 **그 실행 자체는 재현할 수 없다** — 나는 변이로 등가를 세웠다(Gaps 참조).

### README.md — 두 자리

- **`POST /api/auth/register` 표 행 (`:74`)**: 「`username`은 32자 이하」 — 정확하다. 단위가 코드 포인트라는 점은 표에 없지만 `acceptance.md:308` 이 이미 기록하고 있고, 한국어 「32자」는 코드 포인트의 자연스러운 표현이다. 결함 아님.
- **t10 절 (`:232`) 의 좁히기**: 정확하다. 삭제된 절(「사용자 이름에 글자 제한이 없어서」) 자리에 t33 문장이 들어갔고 그 문장이 드는 세 이유를 전부 실측으로 확인했다(Q3). **그 문단 안에 남은 거짓 절은 없다.**

### 훑기 — 어간(`제한`/`상한`/`무제한`/`길이`)으로 전 트리

`.moai/reports/` (역사 기록)를 제외하고 훑었다. run-done §4-F 가 주석을 단 다섯 자리는 전부 `.moai/specs/` 안이다(`SPEC-CHANINJECT-001/spec.md:469`, `SPEC-BOTSTAB-001/spec.md:83`·`:304`, `SPEC-BOTSTAB-001/plan.md:191`·`:237`) — 전부 「t33 정정」 문구를 달고 있음을 원문으로 확인했다.

**살아남은 자리 하나** — `CHANGELOG.md:322` → **F1**.

---

## 5. 발견 (구조화 결함 목록)

- **F1** [Medium] [**blocking**] `CHANGELOG.md:322` — t10 절이 여전히 「회원가입은 누구나 할 수 있고 사용자 이름에 **글자 종류·길이 제한이 없어서**(`server/src/auth.ts`)」라고 현재형으로 단언한다. 길이 제한은 이제 있다. **Required fix**: 이 절을 `README.md:232` 와 같은 방식으로 좁힌다 — 절을 지우지 말고, 상한이 섰다는 사실과 그럼에도 통로가 열려 있는 세 이유(짧은 페이로드가 32자 안에 든다 / 봇 이름 무상한 / `author_name` 은 둘 중 어느 쪽도 될 수 있다)를 덧붙인다. `README.md:232` 와 같은 파일 쌍의 두 자리이므로 문언을 맞출 것. *(확신 높음 — 원문 직독. 이 phase 가 편집한 바로 그 파일이고, 형제 자리는 이미 좁혔다.)*

- **F2** [Medium] [optional] `server/src/auth.ts:30` — 정규식이 C0/C1 만 덮어 **내부** 서식·양방향 제어문자가 저장까지 도달한다: U+200B(zero-width), U+202E(RTL override), U+2028(line separator), U+00A0/U+3000(비ASCII 공백). 전부 `status 201, stored true`. 이 가드 자신의 근거 주석이 「제어문자는 표시·로그를 깨뜨리고」인데, 표시를 실제로 깨뜨리는 U+202E·U+2028 이 통과한다. **Required fix**(선택): 정규식을 유니코드 속성으로 넓힌다 — `/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u` (제어 + 서식 + 줄/문단 분리자). 내부 비ASCII 공백까지 막을지는 별도 결정. *(확신 높음(통과 사실은 실측) / 중간(심각도 — `meta.sender` 통로 자체가 t16 소유라 이 카드가 닫을 범위인지는 판단 사안))*

- **F3** [Low] [optional] `server/src/auth.ts:41-46` — 유니코드 정규화 없음. `café`(NFC)와 `café`(NFD)가 서로 다른 행으로 둘 다 등록된다(`strictly_equal:false`, `after_NFC_equal:true`). 키릴 동형이의어 `аlice` 도 등록된다. 변경의 자기 근거가 「닮은꼴 중복 계정을 만든다」인데 앞뒤 공백만 닫고 더 큰 닮은꼴 부류는 열려 있으며, 그 사실이 어느 문서에도 없다. **Required fix**(선택): 최소한 CHANGELOG 의 「이 상한이 닫지 못하는 것」 목록에 「닮은꼴 이름(정규화 형태 차이·동형이의어)은 여전히 별개 계정이 됩니다」 한 줄을 더한다. 정규화 도입 자체는 기존 행 충돌 가능성이 있어 별도 카드감. *(확신 높음(기전) / 낮음(의도된 범위 밖일 가능성))*

- **F4** [Low] [optional] `server/test/auth.test.ts:90-113` — 두 가드의 **서로 다른 오류 메시지**가 어떤 테스트에도 붙들려 있지 않다. 기준은 `statusCode` 만 단언하고, `acceptance.md:295` 가 「응답 본문은 이 테스트가 단언하지 않으므로 여기서 관측 조건으로 두지 않는다」라고 스스로 적었다. 그런데 같은 줄이 두 메시지 문자열을 **규범으로** 든다. 두 메시지를 뒤바꾸거나 하나로 합치는 변이를 스위트가 죽이지 못한다. **Required fix**(선택): 거절 케이스를 `[username, expectedError]` 쌍으로 바꿔 본문까지 단언하거나, `acceptance.md:295` 의 규범 문구를 「코드 원문에서 읽는다」로 명확히 격하한다. *(확신 높음)*

- **F5** [Low] [optional] `server/src/auth.ts:28` — `USERNAME_MAX_LENGTH` 는 새 export 상수인데 `@MX` 주석이 없다(평문 주석만). `mx-tag-protocol.md` 는 「Magic constant encountered → `@MX:NOTE`」를 든다. 같은 파일의 다른 export 셋은 모두 `@MX:NOTE`/`@MX:ANCHOR` 를 달고 있다. **Required fix**(선택): 기존 평문 주석을 `@MX:NOTE: [AUTO]` 형태로 승격. *(확신 중간 — 규칙은 함수를 예로 들고 이것은 상수다)*

- **F6** [Info] [optional] `README.md:41` — 「가입 자체에는 아무 제한이 없고」. 문맥상 **가입 자격**(초대 코드·승인 없음)을 말하는 것으로 읽히고 그 뜻이라면 여전히 참이다(`README.md:198` 이 같은 뜻으로 반복). 다만 「가입 입력에 아무 제한이 없다」로 읽힐 여지가 있다. **Required fix**: 없음 — 판정 후 유지 권고. *(확신 낮음 — 결함이라고 보지 않는다)*

- **F7** [Low] [optional] 워크스페이스 어디에도 린터가 없다 — `package.json` `scripts` 는 `dev`/`build`/`pretest`/`test`/`typecheck` 뿐이다. TRUST 5 의 「lint clean」 게이트를 이 저장소에서 기계로 잴 수단이 없고, 정적 게이트는 `tsc --noEmit` 하나다. **이 카드가 만든 문제가 아니다** — 기록만 남긴다. **Required fix**(선택): 별도 카드로 eslint 배선. *(확신 높음)*

- **F8** [Info] [optional] `server/src/auth.ts:55-72` — 로그인 경로에 길이 상한이 없어, register 가 더 이상 만들 수 없는 상태(32자 초과 이름)에 login 이 도달한다. **결함이 아니라 명시된 결정**(`spec.md:93`)이고 증폭 경로도 없다(`!row ||` 단락 평가로 없는 사용자에게 scrypt 미실행). **Required fix**: 없음 — 나중에 「빠뜨린 것」으로 오독되지 않도록 기록만 한다. *(확신 높음)*

**차단 1건 / 선택 7건.** 전건이 optional 이었다면 판정은 그대로 PASS 였을 것이고, F1 하나도 must-pass 축(Functionality·Security)을 무너뜨리지 않아 판정을 뒤집지 않는다 — 다만 sync phase 의 산출물 자체에 대한 차단 결함이므로 done 전에 닫아야 한다.

---

## 6. 권고

1. **F1 을 먼저 닫는다.** `README.md:232` 와 문언을 맞춘 한 문장이면 된다. 이 카드가 이미 같은 작업을 옆 파일에서 했으므로 새 판단이 필요 없다.
2. **F2 는 리드 결정 사안이다.** 유니코드 속성으로 정규식을 넓히는 것은 한 줄이지만, `meta.sender` 통로 자체가 `t16` 소유라 「이 카드가 어디까지 닫는가」의 경계 결정이다. 넓히지 않기로 한다면 그 결정을 CHANGELOG 「닫지 못하는 것」 목록에 적어 F3 와 함께 처리하는 편이 값싸다.
3. **F4 는 값싸다** — 거절 배열을 쌍으로 바꾸는 편집 한 번으로 두 메시지가 측정 대상이 된다. `acceptance.md` 를 고칠 수 없는 이 감사 범위에서는 권고만 남긴다.
4. **재감사 범위**: F1 을 고친 뒤에는 이 목록의 델타(F1 한 자리 + 같은 어간 재훑기)만 다시 보면 된다. 코드 차원 셋은 재실행 불필요 — 코드가 바뀌지 않는다면.

---

## 7. Gaps — 내가 확인하지 **않은** 것

- **원 RED 재현 실행 자체를 재현하지 않았다.** `server/test/t33-red.test.ts` 는 run 레인이 삭제했다. CHANGELOG 의 「`[RED] status = 201` / `stored username length = 20000`」 원문은 `.moai/reports/t33/run-done.md` §1 **귀속**이고, 나는 변이 M1 로 **등가**를 세웠을 뿐 같은 파일을 돌리지 않았다.
- **E2E 를 돌리지 않았다.** `npm run e2e`(`scripts/e2e.mts`)는 실행하지 않았다 — `e2e-user` 가 32자 이하라는 사실은 원문 판독으로만 확인했고, E2E 전 과정이 상한 도입 후에도 초록인지는 관측하지 않았다.
- **CI 를 보지 않았다.** 이 브랜치는 미푸시라 원격 실행이 없다. 「깨끗한 환경에서의 전건 통과」는 미관측이고, 내 측정은 전부 로컬 이 나무에서 나왔다.
- **커버리지를 채널 워크스페이스에서는 재지 않았다.** `--coverage` 는 server 에만 돌렸다. Craft 하드 임계 판정은 server 수치(`93.85%` stmts)에 귀속된다.
- **`meta.sender` 가 실제 모델 컨텍스트에서 어떻게 렌더링되는지 관측하지 않았다.** 이 프로젝트가 관측할 수 없는 대상이라고 `SPEC-CHANINJECT-001:469` 이 적었고, 나도 관측하지 않았다.
- **SQLite 의 실제 디스크 저장 형태(인코딩·페이지 점유)를 재지 않았다.** 바이트 수는 `Buffer.byteLength(..., "utf8")` 로 잰 값이고 SQLite 내부 표현이 아니다.
- **기존 프로덕션 DB 에 32자 초과 행이 실제로 있는지 세지 않았다.** 이 나무에 프로덕션 데이터가 없다. 「기존 행은 그대로」는 코드·마이그레이션 부재로만 확인했고, 영향 받는 행 수는 미측정이다.
- **README·CHANGELOG 외의 사용자 문서를 훑지 않았다** — `docs/` 디렉터리가 이 트리에 없음을 확인했으나(grep 무적중), 저장소 밖 배포 문서가 있다면 범위 밖이다.
- **`.moai/specs/**/spec.md`·`acceptance.md` 를 편집하지 않았다** (디스패치 제약). F4 가 `acceptance.md:295` 를 지목하지만 편집이 아니라 권고로 남겼다.

## 8. Residual-risk — 관측했음에도 남는 위험

- **F2 의 실질 심각도가 내 판단보다 클 수 있다.** U+202E 가 실린 이름이 `meta.sender` 로 원문 그대로 나가고, 호스트가 그것을 어떻게 렌더링하는지 이 프로젝트는 관측할 수 없다. 즉 「Medium」은 렌더링 결과를 못 본 상태의 추정이다.
- **변이 검증은 첫 실패에서 루프가 끊긴다.** 기준의 거절 배열은 `for` 안에서 단언하므로 첫 실패가 나머지를 가린다. 그래서 하위 절마다 별도 변이를 돌렸지만(M1b/M3/M4), 그 방식으로도 「두 가드가 동시에 죽는 변이」의 상호작용은 재지 않았다.
- **로컬 측정은 부하가 있는 개발 기계에서 나왔다.** channel 스위트가 64.86초로 server(7.86초)보다 훨씬 길다 — 타이밍 의존 기준이 있다면 흔들릴 여지가 있고, 나는 각 스위트를 한 번씩만 돌렸다.
- **미푸시 유일 사본.** 이 나무의 브랜치는 원격에 없다. 감사 중 `server/src/auth.ts` 를 다섯 번 변이했다가 복원했고 sha256 일치로 확인했지만, 그 창 동안 다른 세션이 같은 파일을 읽었다면 오염된 값을 봤을 수 있다.
- **점수 0.891 은 F1 이 열린 상태의 값이다.** F1 을 닫으면 Functionality 가 오르지만 재채점하지 않았다.


---

# 재판정 (2026-09-03, F2 수리 착지 후)

리드 지시로 sync 레인이 재채점했다. **1차 감사와 성격이 다르다**: 1차는 독립 `sync-auditor` 의 판정이고, 이 재판정은 **델타를 sync 레인이 스스로 잰 것**이다. 자기 산출물(CHANGELOG·README)을 자기가 채점하는 축이 섞여 있으므로 1차보다 약한 증거다 — 리드가 독립 재감사를 원하면 그렇게 하는 편이 낫다. 이 한계를 먼저 적는다.

**재판정: PASS — 0.911 / 통과선 0.80.** 통과선은 1차와 같은 자리에서 다시 읽었다(`SPEC-AUTH-001/spec.md` `tier: M` × `spec-workflow.md:141` → `0.80`). SPEC 판번호가 `0.6.1` 로 올랐으나 tier 는 `M` 그대로다.

**귀속 [HARD]**: 0.911 은 **현재 트리**(HEAD `9f15d96` + 미커밋 8파일, F2 수리 및 R1 정정 포함) 값이다. 1차의 `0.891` 은 F2 수리 이전 트리 값이며 폐기하지 않고 그대로 둔다 — 두 수는 서로 다른 트리를 잰 값이다.

## 게이트 재실행 — 이전 192/123 은 낡았다

| 검사 | 명령 | 종료 코드 | 관측 |
|---|---|---|---|
| 채널 빌드 | `npm run build -w channel` | **0** | — |
| 타입 (server) | `npm run typecheck -w server` | **0** | — |
| 타입 (channel) | `npm run typecheck -w channel` | **0** | — |
| 서버 스위트 | `npm test -w server` | **0** | `Test Files  16 passed (16)` / `Tests  193 passed (193)` |
| 채널 스위트 | `npm test -w channel` | **0** | `Test Files  7 passed (7)` / `Tests  123 passed (123)` |

서버가 `192 → 193` 으로 하나 늘었다 — run 이 더한 「이름 안쪽 보이지 않는 문자」 테스트다. 로그 원문은 `verify-server.txt`·`verify-channel.txt` 를 이 실행으로 덮어썼다.

## F2 닫힘 — 리드 관측을 받아 적지 않고 자체 재현

`server/src/auth.ts:32` 를 직독했다 — `const USERNAME_FORBIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u`.

임시 프로브(`server/test/zz-t33-sync-probe.test.ts`)로 13개 입력을 실제 라우트에 보내고 응답과 `users` 저장 여부를 함께 쟀다. 관측 원문:

| 입력 (이름 **안쪽**) | status | 저장 | 오류 본문 |
|---|---|---|---|
| `U+202E` 방향 뒤집기 | **400** | 아니오 | `username에 제어문자나 앞뒤 공백을 쓸 수 없습니다` |
| `U+2028` 줄 구분자 | **400** | 아니오 | 〃 |
| `U+2029` 문단 구분자 | **400** | 아니오 | 〃 |
| `U+200B` 폭 0 공백 | **400** | 아니오 | 〃 |
| `U+FEFF` BOM | **400** | 아니오 | 〃 |
| `U+0000` NUL | **400** | 아니오 | 〃 |
| `U+0085` NEL (C1) | **400** | 아니오 | 〃 |
| `U+00A0` NBSP | `201` | **예** | — |
| `U+3000` 한자 공백 | `201` | **예** | — |
| 앞 공백 | **400** | 아니오 | 〃 |
| 33자 (경계+1) | **400** | 아니오 | `username은 32자 이하여야 합니다` |
| 32자 (경계) | `201` | 예 | — |
| 평범한 ASCII 이름 | `201` | 예 | — |

**F2 가 지목한 셋(`U+202E`·`U+2028`·`U+200B`)은 전부 거절되고 저장되지 않는다 — 닫혔다.** 1차 감사가 통과를 관측했던 `U+FEFF`·`U+0085` 도 함께 닫혔다.

**여전히 통과하는 둘(`U+00A0`·`U+3000`)은 결함이 아니다** — `acceptance.md:316` 이 「Zs 는 글자를 재정렬하거나 숨기지 않아 금지 근거 밖이고, 내부 ASCII 공백은 v0.6.0 부터 허용이었다」로 **의도를 명시**하고 있고, 같은 줄이 「검증 없음 — 관측하지 않는 것」이라 적었다. 이 프로브가 그 관측을 처음 제공한 셈이며, 관측 결과가 문서화된 의도와 **일치**한다. 잔여로만 기재한다.

**프로브 파일은 삭제했다** — `rm -f server/test/zz-t33-sync-probe.test.ts`, `git status --short` 에 `zz-t33` 적중 0건. t24 때 untracked 유물 2건이 병합을 막은 선례를 따라 커밋 전에 지웠다. (리드가 물은 `channel/test/zz-ac17-probe.test.ts`·`zz-ac17-variant.ts` 는 **sync 것이 아니고**, 이 나무에도 원 체크아웃에도 t7·t32 나무에도 존재하지 않는다 — 전 나무 탐색으로 확인.)

## 이번 라운드에 찾은 결함

- **R1** [Low] [**blocking**] [**닫음**] `CHANGELOG.md` 새 절 마무리 줄이 `SPEC-AUTH-001 v0.6.0` 만 인용하고 있었다. SPEC 은 이 라운드에 `0.6.1` 로 올랐고(금지 문자 범위 확장), 같은 문단의 표와 기준 서술은 run 이 갱신했으나 판번호 인용만 남았다. `v0.6.0 + v0.6.1` 로 고쳤다. — **정정이 스스로 낡은 기록을 남기는** 부류의 재현이다.
- **R2** [Info] [optional] CHANGELOG 「이 상한이 닫지 못하는 것」 세 항목에 **내부 Zs 공백(`U+00A0`·`U+3000`) 통과**가 없다. `acceptance.md:316` 이 SPEC 쪽에서 덮고 있어 거짓은 아니지만, 그 절의 선언이 「경계를 넓혀 적지 않겠습니다」라 한 줄 더할 값은 있다. **sync 가 임의로 더하지 않았다** — F3(정규화)·거절 메시지 문언과 같은 잔여 묶음이고 리드 처분 자리다.

## 어간 훑기 — 잔여 재확인

패턴(어간): `무제한` · `제한이 없` · `상한이 없` · `제한 없` · `길이 제한` · `글자 제한`. 범위: `README.md` · `CHANGELOG.md` · `server/src` · `channel/src`.

적중 6건 전수 판독 결과 **낡은 단언 0건**:

| 자리 | 판정 |
|---|---|
| `CHANGELOG.md:27` 「봇 이름에는 아직 상한이 없습니다」 | **참** — `routes-bots.ts:58` 은 `!name?.trim()` 만 본다 |
| `CHANGELOG.md:322` | run 이 좁힘 — 참 |
| `README.md:41` 「가입 자체에는 아무 제한이 없고」 | 가입 **자격**을 뜻하고 그 뜻이면 참 (1차 F6, 수정 불필요) |
| `README.md:232` | sync 가 좁힘 — 참 |
| `server/src/auth.ts:27` 「상한이 없으면 …」 | 가정법 — 참 |
| `channel/src/channel-server.ts:174` 「이름에는 원래 길이 제한이 없어」 | **참** — 「원래」로 과거를 지시하고, `author_name` 은 봇 이름일 수 있어 절단은 여전히 하중을 받는다 |

## 차원 점수 (재채점)

| 차원 | 1차 | 재판정 | 근거 |
|---|---|---|---|
| Functionality (40%) | 92 | **93** | 스위트 `193 passed` (+1) · 타입·빌드 전부 0 · 경계값 32/33 프로브 확인 |
| Security (25%) | 84 | **90** | F2 닫힘 자체 재현(7종 거절·미저장). 잔여: 봇 이름 무상한(범위 밖·문서화) · 내부 Zs(의도 명시) · 거절 메시지 문언(리드 이월) |
| Craft (20%) | 88 | **88** | 재측정 없음 — 1차 귀속 유지. 린터 부재(F7)도 그대로 |
| Consistency (15%) | 92 | **92** | SPEC v0.6.1 이 코드·테스트·문서와 일치. 판번호 인용 하나(R1)는 닫음 |

산식: `1 / (0.40/93 + 0.25/90 + 0.20/88 + 0.15/92)` = `1/0.010982` = **91.058 → 0.911**. must-pass 두 축(Functionality·Security) 독립 통과.

## Gaps — 이 재판정이 확인하지 **않은** 것

- **독립성** — 1차와 달리 이 재판정은 sync 레인의 자기 채점이다. Craft 는 재측정조차 하지 않고 1차 값을 귀속했다
- **원 RED 실행은 여전히 재현 불가** — `t33-red.test.ts` 가 없다. `[RED] status = 201` 은 run-done §1 귀속으로 남는다
- **CI 미관측** — 브랜치 미푸시. 모든 측정이 로컬 이 나무 값이다
- **E2E 미실행** (`npm run e2e`)
- **커버리지 미측정** — 1차 `server` 수치를 귀속했고 이번에 다시 재지 않았다
- **run 이 만진 SPEC 3파일의 내용 감사는 하지 않았다** — 판번호·AC 식별자·`:316` 의도 명시 세 자리만 판독했다. 편집 금지 제약이 있어 판독에 그쳤다
- **`.moai/state/**`·`.moai/logs/**` 미추적물의 유래를 추적하지 않았다** — 스테이징 제외로만 처리
