# SPEC 감사 보고서: SPEC-E2E-001 (카드 `t6`)

- 감사자: plan-auditor (독립 감사) · 회차: 1/3 · 날짜: 2026-08-31
- 나무: `.claude/worktrees/t6` · 브랜치 `WT-e2e-persist-readme` · 기준 `2a19d7d`
- **M1 맥락 격리 고지**: 작성자 보고서 `.moai/reports/t6/plan-done.md` 는 **가설로만** 읽었고, 모든 주장은 이 나무에서 직접 명령을 돌려 다시 확인했다. 임계값은 디스패치에서 받지 않고 SSOT 에서 직접 읽었다.

## 판정

| 항목 | 값 |
|---|---|
| **Tier** | **M** (독립 확인 — §1) |
| **통과선 (SSOT)** | **0.80** — `.claude/rules/moai/workflow/spec-workflow.md:141` (`\| M (Medium) \| 300 - 1000 LOC \| 5 - 15 files \| **3 files**… \| 0.80 \|`) |
| **총점** | **0.67** (조화평균) / 0.69 (산술평균) |
| **판정** | **FAIL** |

**must-pass 실패는 하나도 없다.** FAIL 은 전적으로 **Testability 총점 미달**에서 온다 — 요구사항 층(REQ)은 견고하고, 검증 층(AC)의 열 자리가 「지워도 초록인」 형태이거나 아예 측정 불가다.

---

## 0. 중심 기술 주장 — **전건 확인됨 (작성자가 옳다)**

작성자의 «`plan-v2.md` Task 18 초안이 낡았다» 는 발견은 **네 항목 전부 실측으로 참**이다. 이것이 이 SPEC 의 가장 값나가는 부분이며, 감사가 뒤집을 것은 없다.

| # | 주장 | 감사가 돌린 명령 | 실제 출력 | 판정 |
|---|---|---|---|---|
| F-01 | 초안이 v1 악수 `{type:'hello', token}` 를 보낸다 (`plan-v2.md:3634`) | `sed -n '3634p' .moai/plan/2026-08-26-minidiscord/plan-v2.md` | `  ws.send(JSON.stringify({ type: 'hello', token: invite.token }))` | **참** |
| F-01 | 현행 서버가 그것을 닫는다 | `grep -n "v1 형태\|test(pub)" server/src/gateway.ts` | `153:    // pub 이 없는 hello — v1 형태 { type:'hello', token } 을 포함해 — 형식 검사 하나에서 같이 닫힌다.` / `156:    if (!/^[0-9a-f]{64}$/.test(pub) \|\| !/^[0-9a-f]{64}$/.test(clientNonce)) { dropConn(ws); return }` | **참** — 인용 줄 번호까지 정확 |
| F-02 | 초안이 확립 뒤 프레임을 맨몸 `JSON.parse` 로 읽는다 (`:3610`) | `sed -n '3610p'` | `      const m = JSON.parse(String(d))` | **참** |
| F-02 | 확립 뒤 전 프레임이 봉투다 | `grep -n "welcome 도 봉투" server/src/gateway.ts` | `214:    // welcome 도 봉투 안이다 — 예외 종류를 하나라도 두면 그 종류가 주입 통로가 된다` / `215: sendEstablished(conn, ws, { type: 'welcome', … })` | **참** — `welcome` 조차 봉투 안 |
| F-03 | **구문 오류 ①** — `.mjs` 안의 TS 표기 `(m: any) =>` (`:3670`·`:3675`) | `sed -n '3670p;3675p'` | `3670:    assert(hist.messages.some((m: any) => m.body === '봇 없는 메모'), …)` / `3675:  assert(after.messages.every((m: any) => m.id > cursor), …)` | **참**. 대상이 `.mjs` 임도 확인 — `plan-v2.md:3553` `Create: \`scripts/e2e.mjs\`` |
| F-04 | **구문 오류 ②** — 같은 `main()` 스코프의 `const after` 중복 (`:3674`·`:3704`) | `sed -n '3674p;3704p'`, `main()` 시작 `:3616` | `3674:  const after = await waitForMessage(ws, m => …)` / `3704:  const after = await api(…)` — 둘 다 `main()` 직속 | **참** — `SyntaxError: Identifier 'after' has already been declared`. 초안은 실행 전에 죽는다 |

**결론**: 「초안을 복사해 부분 수정한다」 를 기각하고 「시나리오 목록만 가져와 새로 쓴다」 로 정한 판단은 **근거가 실측으로 뒷받침된다.**

---

## 1. Tier 독립 검증 — **M 확정 (작성자 주장 수용)**

- `grep -o 'REQ-E2E-[0-9]*' spec.md | sort -u` → `REQ-E2E-001 … REQ-E2E-016` — **16건, 결번·중복 0**
- `grep -o '^### AC-E2E-[0-9]*' acceptance.md | sort -u` → `AC-E2E-001 … AC-E2E-016` — **16건, 결번·중복 0**
- Tier M 상한: `spec-workflow.md:149` `| M | 16 | 16 |` — 요구사항과 기준에 **각각 독립** 적용되므로 16/16 은 상한 안이다(초과 아님).
- 파일 수: 이 카드가 건드리는 것은 `scripts/e2e.mts` · `server/test/<신규>.test.ts` · `package.json` · `README.md` = **4개**. Tier S 의 «< 5 files» 에 해당하고 M 의 «5-15 files» 에는 못 미친다. LOC 추정은 M 대역(300-1000).
- Tier L 요건(`> 15 files` 또는 constitutional)은 **성립하지 않는다** — 통과선이 0.85 로 올라가지 않는다.

**Tier M 주장은 자기에게 유리한 쪽이 아니라 불리한 쪽이다** — 파일 수만 보면 S(0.75)로 내려갈 수 있는데 M(0.80)을 골랐다. 감사는 **M / 0.80** 을 채택한다.

---

## 2. Must-Pass 결과

| 기준 | 판정 | 증거 |
|---|---|---|
| **MP-1** REQ 번호 일관성 | **PASS** | `REQ-E2E-001…016` 연속, 결번 0·중복 0, 영자리 채움 일관 (§1) |
| **MP-2** GEARS 형식 (요구사항 층만) | **PASS** | REQ-004·006·008 은 `**When**` 사건형(spec.md:55·57·62), REQ-016 은 `**Where**` 능력관문형(spec.md:76), 나머지는 편재형. 부정 요구(REQ-001·002·005·011)는 GEARS 정칙 부정형. **AC 는 Given-When-Then 이 정답 형식이므로 여기서 감점하지 않았다** — AC 는 §3 Testability 에서 채점 |
| **MP-3** 프론트매터 유효성 | **PASS** | spec.md:2-16 — 12필드 전건(`id·title·version·status·created·updated·author·priority·phase·module·lifecycle·tags`). snake_case 별칭 0건. `phase: "v0.4.0 target"` 은 릴리스 표적이며 금지된 생애주기 이름(`plan/run/sync/mx`)이 아니다 |
| **MP-4** 언어 중립성 | **N/A** | 단일 언어(TypeScript/Node) 프로젝트 — 자동 통과 |
| **MP-5** D7 교차 SPEC 정합 | **PASS** | 참조 8건 전부 실재하고 전부 `status: completed`. 실행: `grep -m1 '^status:' .moai/specs/SPEC-{GWAUTH-002,GATEWAY-001,MSG-001,PERM-001,BOT-001,ROOMAUTHZ-001,CORE-001,CHANCLIENT-001}/spec.md` → 8줄 모두 `status: completed`. retired/superseded/archived 0건 → **BLOCKING 없음** |
| **MP-6** D8 교차 플랫폼 | **N/A** | `grep -c syscall spec.md plan.md` → `0` / `0` — 자동 통과 |
| **MP-7** 해명 관문 | **PASS** | `grep -rn 'NEEDS CLARIFICATION' .moai/specs/SPEC-E2E-001/` → 적중 0 (exit 1). Tier M 이라 `research.md` 는 없다 |

---

## 3. 차원별 점수

| 차원 | 점수 | 루브릭 대역 | 증거 |
|---|---|---|---|
| Clarity | **0.75** | 0.75 (한둘의 경미한 모호) | REQ 층은 단일 해석. 모호는 검증 층에 몰려 있다 — acceptance.md:24 «인접 줄», :116 «「…」 류의 다른 뜻» |
| Completeness | **0.75** | 0.75 (한 절이 성기다) | HISTORY(spec.md:21)·WHY(§1)·WHAT(§2)·HOW(plan §F)·REQUIREMENTS(§2)·AC(acceptance §A) 전건. `### Out of Scope — …` H3 **6개**, 각각 `-` 항목 보유(spec.md:128·133·138·143·148·152). 감점: REQ-E2E-001 의 「유료 API 무호출」 과 AC-E2E-006 의 Given 이 요구하는 포트 강제 지정 기제가 **어느 요구사항에도 없다**(D-06·D-16) |
| Testability | **0.50** | 0.50 (여럿이 판단을 요하거나 공허) | 지배적 실패 영역. 16기준 중 **하나는 측정 불가(D-01)**, **셋은 커밋 뒤 무조건 초록(D-02)**, **하나는 사전 상태로 2/3 충족(D-03)**, **하나는 Then 이 아예 안 재짐(D-04)**, **하나는 명령이 없음(D-05)**, **하나는 부재에 초록(D-06)** |
| Traceability | **0.75** | 0.75 (하나가 미담보) | REQ-E2E-00N ↔ AC-E2E-00N 이 번호로 1:1 대응, 고아 AC 0건. 감점: **REQ-E2E-001 의 후반절**(«어떤 외부 유료 API 도 호출하지 않는다»)을 재는 기준이 없다(D-16) |

**총점 = 조화평균(0.75, 0.75, 0.50, 0.75) = 0.667** → 통과선 0.80 미달. **FAIL.**

---

## 4. 발견 목록 — 차단 (blocking)

### D-01 — [Critical] AC-E2E-002 측정 ① 은 D1(a) 아래에서 **측정 대상이 존재하지 않는다**

- 자리: `acceptance.md:24`
- 기준은 `grep -n "'hello'" scripts/e2e.mts` 의 인접 줄에 `pub`·`client_nonce` 가 있고 `token` 이 없음을 잰다. 그러나 **D1(a) 를 고르면 `scripts/e2e.mts` 에는 `'hello'` 가 등장하지 않는다.**
- 실행 증거:
  ```
  $ grep -n "type: 'hello'" server/test/gateway-v2.ts
  35:      ws.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: clientNonce }))
  $ sed -n '82p' .moai/specs/SPEC-E2E-001/plan.md
  - REQ-E2E-007 의 ①~⑫ 를 순서대로 구현한다. 접속은 `connectV2`, 확립 뒤 프레임은 `innerOf` 로 읽는다.
  ```
  hello 프레임은 `connectV2` **안에서** 만들어진다. E2E 는 `connectV2(port, token)` 만 부른다 → grep 적중 0, 기준은 참·거짓을 낼 수 없다.
- 측정 ②는 더 나쁘다: 「그 프레임을 `{type:'hello', token}` 으로 바꾼다」 는 **`server/test/gateway-v2.ts` 편집**을 뜻하고, 그 파일은 server 시험 스위트 전체가 공유한다 — 이 카드의 선언된 diff(§5) 밖이며 기준이 주장하는 것보다 훨씬 굵은 변이다.
- **이것은 SPEC 내부 모순이다**: spec.md:86 (D1 (a) 재사용)과 acceptance.md:24 (스크립트 안의 hello 소스 검사)가 동시에 참일 수 없다.
- **고칠 것**: 소스가 아니라 **전선**을 재라. `gateway-v2.ts:100` 의 `recordSocket()` 이 이미 그 관측 표면이다 — 인프로세스 짝에서 첫 프레임의 키 집합이 `{type,pub,client_nonce}` 이고 `token` 이 없음을 단언하라. v1 거절은 **음성 대조군**으로 재라: 별도 소켓이 `{type:'hello', token}` 을 보내면 닫힌다는 단언을 E2E 안에 두라(공유 하네스를 건드리지 않는다).

### D-02 — [Critical] `git diff` 를 기준 없이 쓰는 세 측정은 **커밋 직후 무조건 초록**이다

- 자리: `acceptance.md:98`(AC-E2E-011), `acceptance.md:117`(AC-E2E-013 측정 ②), `acceptance.md:164`(DoD 4항), `plan.md:115`(M6)
- `git diff --name-only` 와 `git diff -- package.json` 은 **인자 없이 쓰면 워킹트리 대 인덱스**를 비교한다. run 단계가 커밋을 남기는 순간 둘 다 빈 출력이 되고 `grep -c` 는 `0` 을 낸다 — **`scripts.test` 를 실제로 바꿨든 `config.ts` 를 실제로 고쳤든 관계없이 통과한다.**
- 이 프로젝트가 반복해 밟은 「기준이 아무것도 검증하지 않는다」 부류의 정통 사례이며, 하필 **두 카드가 같은 자리를 청구하지 않게 하는 울타리**(AC-E2E-013 측정 ②)가 그 형태다. 감사 지시 §8 의 물음 «t26 과의 울타리가 실제로 서는가» 의 답은 **서지 않는다**.
- **고칠 것**: 기준선을 명시하라 — `git diff --name-only 2a19d7d..HEAD` 또는 `git diff --name-only $(git merge-base main HEAD)..HEAD`. 세 자리 전부.

### D-03 — [High] AC-E2E-014 는 **사전 상태만으로 2/3 이 이미 충족**되어, 새 줄 **하나**면 통과한다

- 자리: `acceptance.md:125`
- 측정: `awk '/^## 보안에 대해 알아둘 점/,/^## 명령어/' README.md | grep -c "t23\|t12\|N5"` → `3` 이상.
- **갱신 전 실측**:
  ```
  $ awk '/^## 보안에 대해 알아둘 점/,/^## 명령어/' README.md | grep -c "t23\|t12\|N5"
  2
  ```
  적중 두 건은 README:225(«…후속 카드 **`t23`**(서버 TLS 종단)이며…»)와 README:236(«**[배포 경계] `t23`**…»)로, **둘 다 이 카드 이전부터 있던 문장**이다.
- 따라서 제목이 요구하는 «세 줄»(서비스화 트리거 · 승인 적체 관측 트리거 · 다른 PC 봇 트리거) 가운데 **`t23` 을 담은 한 줄만 더해도 3 이 되어 초록**이다. 나머지 두 트리거는 재지 않는다. **제목이 본문보다 넓다.**
- 「잡는 변이」 도 과장이다: «세 줄을 다른 절에 넣으면 빨개진다» 는 맞으나, «한 줄만 넣어도 초록» 이라는 더 흔한 실패는 못 잡는다.
- **고칠 것**: 세 트리거를 **각각 별도 어간으로** 재고, 각 어간의 **사전 상태가 0** 임을 기준 본문에 적어라 — 세 grep 이 각각 ≥1.

### D-04 — [High] AC-E2E-012 의 Then(«그 3자리 각각에»)은 **어느 측정으로도 재지 않는다**

- 자리: `acceptance.md:105-109`
- 세 측정 모두 **파일 전역 개수**다:
  - 측정 ① `grep -c "생산 배치"` → `0` 은 **문장을 지워 버려도** 충족된다.
  - 측정 ② `grep -c "서비스화"` ≥ `3` (사전 상태 실측 `0`)은 **어디에 세 번 나와도** 충족된다 — 세 자리 각각일 필요가 없다.
  - 측정 ③ `grep -c "배포 경계"` ≥ `1` — **사전 상태가 이미 `1`**(실측). 그 토큰은 README:236 한 곳에만 있으므로 **5행과 225행의 경고를 통째로 지워도 초록**이다.
- 즉 기준이 스스로 주장하는 «한 자리만 고치는 것과 **전부 지우는 것**을 각각 다른 측정이 잡는다» 는 **거짓**이다 — 셋 중 둘을 지우는 것은 아무 측정도 잡지 못한다.
- **고칠 것**: 자리별로 재라 — 세 위치를 절 범위(`awk`)나 앵커 문장으로 각각 고정하고, 각 자리에 배포 경계 표지가 남아 있음을 **세 번** 재라.

### D-05 — [High] AC-E2E-016 측정 ① 은 **명령이 없는 자기 신고**다

- 자리: `acceptance.md:141`
- 본문: «…**run 단계 자기 훑기로 확인하고** 그 결과를 `progress.md` §E.2 에 적는다.»
- 이 문서 자신의 머리말(`acceptance.md:3`)이 «기준은 전부 **명령의 종료 코드나 출력이 판정**한다» 고 선언한다. 측정 ①은 그 선언을 위반한다 — 돌릴 명령도, 비교할 출력도 없다.
- 측정 ②(`acceptance.md:142`)에는 탈출구가 있다: «체크리스트를 싣지 않기로 하면 이 측정은 «해당 없음» 으로 명시한다.» 사전 상태 실측 `grep -c "수행하지 않았습니다\|실행하지 않았습니다" README.md` → `0`.
- 결과: **AC-E2E-016 전체가 기계적 증거 0건으로 소화될 수 있다.** 「거짓 수동검증 주장」 을 막으려는 울타리 자체가 검증되지 않는 주장으로 판정된다 — 자기 지시적 결함이다. 감사 지시가 물은 «AC-E2E-016 자체가 잘 형성되었는가» 의 답은 **아니다**.
- **고칠 것**: 금지 문구 목록을 정해 실행 가능한 부재 검사로 바꿔라 —
  `grep -rEn "수동 검증(을)? ?(수행|완료)|실 세션으로 (확인|검증)|사람이 확인했" .moai/specs/SPEC-E2E-001/ README.md` → 적중 `0`.
  면책 문구는 파일 전역이 아니라 **체크리스트 절 범위 안**(`awk`)에서 재라.

### D-06 — [High] AC-E2E-006 은 **부재에 초록인 부정 단언**이고, Given 을 만들 기제가 없다

- 자리: `acceptance.md:54-58`
- 측정: `timeout 120 npm run e2e; echo "exit=$?"` → exit 이 `124` **가 아니어야** 한다.
- 부정 단언이라 **무슨 이유로든 일찍 죽으면 초록**이다. 구체적으로 `plan.md:77` 이 넣기로 한 «의존성 부재 시 안내 한 줄로 끝내는 경로»(exit 1)만 밟아도 통과한다 — **시한 있는 폴링 코드가 한 줄도 실행되지 않은 채로.**
- 게다가 Given «이미 점유된 포트를 **강제 지정**» 을 만들 수단이 없다. `plan.md:48` (D-3)이 **포트 하드코딩을 금지하고 스크립트가 빈 포트를 잡게** 하며, 포트를 밖에서 강제하라는 요구사항이 **어디에도 없다**.
- **고칠 것**: ① 양성으로 재라 — 시한 초과 경로가 고정 표지(예: `[boot-timeout]`)를 찍고 **전용 종료 코드**로 끝나게 하고, `grep -c '\[boot-timeout\]'` = 1 **그리고** exit == 그 코드를 함께 재라. ② 포트 주입 기제(예: `E2E_FORCE_PORT`)를 요구사항으로 명시하라.

### D-07 — [Medium] 줄 인용 오류: `server/src/routes-messages.ts:173` → 실제 **163**

- 자리: `spec.md:130` (§5 t8 항목), 작성자 보고서 `plan-done.md:82`
- 실행 증거:
  ```
  $ grep -n "createReadStream" server/src/routes-messages.ts
  2:import { createReadStream, createWriteStream, mkdirSync, statSync } from 'node:fs'
  163:    return reply.send(createReadStream(att.stored_path))
  $ grep -n "existsSync" server/src/routes-messages.ts
  (적중 없음)
  ```
  **173행은 `displayName()` 함수 안**이며 첨부와 무관하다.
- **결함 자체는 참이다** — `existsSync` 가 없어 파일 부재 시 500 이 난다. 틀린 것은 앵커뿐이다. 그러나 이 프로젝트가 기록한 실패 형태(「줄 인용은 앵커로 다시 찾는다」)의 재현이고, t8 카드가 이 인용을 믿고 173행을 보면 헛수고를 한다.
- **고칠 것**: `server/src/routes-messages.ts:163` 으로 정정.

### D-08 — [Medium] AC-E2E-009 는 **시험의 이름**을 재지 동작을 재지 않는다

- 자리: `acceptance.md:82`
- 측정: `npm test -w server 2>&1 | grep -c "restart"` ≥ 1 **이고** 전체 exit 0.
- `grep "restart"` 는 **시험 제목에 그 글자가 있으면** 충족된다 — 아무것도 단언하지 않는 `it('restart persistence', () => {})` 가 통과한다. 사전 상태 실측 `grep -rn "restart" server/test/` → 적중 0.
- 이 기준의 실질 무게는 전부 「잡는 변이」(`openDb(config.dbPath)` → `openDb(':memory:')`)에 실려 있는데, **그 변이가 DoD 2항의 「최소 8건」 에 반드시 들어간다는 보장이 없다** — 8건을 다른 것으로 채우면 이 기준의 존재 이유가 한 번도 확인되지 않는다.
- **고칠 것**: ① 측정을 신규 시험 파일 경로 + 세 동일성 단언의 존재로 바꾸거나, 더 좋게는 ② **AC-E2E-009 의 변이를 DoD 2항 8건 중 필수 1건으로 못박아라.**

### D-09 — [Medium] AC-E2E-013 측정 ① 은 판단을 요구한다 (이진 아님)

- 자리: `acceptance.md:116` — «적중이 배치 전제 서술이 **아닌 것만 남는다**(0 이거나, 남는 줄이 「봇 세션이 파일을 읽는 로컬 경로」 **류의 다른 뜻**)».
- 「류의 다른 뜻」 은 판정자마다 갈린다 — 이진 검사가 아니다. 사전 상태 실측 `grep -n "내 PC" README.md` → `3`, `190`.
- **고칠 것**: 갱신 후 기대 상태를 수로 못박아라 — `grep -c "내 PC" README.md` → `0`, 혹은 남기기로 한 줄을 열거하고 그 줄만 남았음을 재라.

### D-10 — [Medium] AC-E2E-007 은 **찍는 것**을 재지 **하는 것**을 재지 않고, 파이프가 종료 코드를 버린다

- 자리: `acceptance.md:65` — `npm run e2e | grep -o "^\[[0-9]\+/13\]" | tr -d '\n'`.
- 파이프라인의 종료 상태는 `tr` 의 것이다(`pipefail` 미설정). 라벨을 단계 **앞에서** 찍는 스크립트라면 단언이 줄줄이 실패해도 13개 라벨 문자열이 온전히 나온다.
- **고칠 것**: 각 라벨을 그 단계의 단언이 **성공한 뒤에** 찍도록 요구사항에 명시하고, 측정에 `set -o pipefail` 과 종료 코드 확인을 함께 실으라.

---

## 5. 발견 목록 — 권고 (advisory)

### D-11 — [Medium] AC-E2E-005 의 `sha256sum` 은 호스트 의존이고, `ls -la` 는 시각을 섞는다
`acceptance.md:49`. 실측 `which sha256sum` → `/sbin/sha256sum` (이 기계에는 있다). 그러나 macOS 기본은 `shasum -a 256` 이라 새 CI 러너에서는 명령 부재로 **양쪽이 똑같이 오류 문자열**이 되어 「동일」 로 초록이 될 수 있다 — 또 하나의 부재-초록. 권고: `shasum -a 256` 또는 `find data -type f | sort` + 내용 해시로 바꾸고, 목록에서 시각(`-l`)을 빼라.

### D-12 — [Medium] REQ-E2E-016 의 조건절이 D3 의 무조건 선언과 어긋난다
`spec.md:99` (D3) 는 «**어떤 수용 기준도** «수동 검증을 수행했다» 를 주장하지 않는다» 를 무조건으로 선언한다. 그런데 `spec.md:76` (REQ-E2E-016) 은 `**Where** … 싣는 경우` 조건형이다. 체크리스트를 싣지 않기로 하면 REQ-E2E-016 과 AC-E2E-016 이 **산출물 없이·측정 없이** 소화된다(D-05 와 결합). 권고: (a) 금지는 무조건 요구로 분리(D-05 의 금지어 grep), (b) 면책 문구만 조건 요구로 남겨라.

### D-13 — [Low] 인프로세스 짝은 영속성을 **진짜로** 재지만, `close()` 만으로는 재시작이 아니다
감사 지시가 물은 «재시작 요구가 재시작만 재는 것 아닌가» 의 답은 **아니다, 영속성을 잰다**:
```
$ grep -n "openDb" server/src/index.ts
37:  app.db = openDb(config.dbPath)
$ sed -n '7,9p' server/src/config.ts
  // 지연 평가: 테스트가 import 이후에 MINIDISCORD_DATA_DIR 을 설정해도 반영되도록 게터로 둔다
  get dataDir() { return process.env.MINIDISCORD_DATA_DIR ?? './data' },
  get dbPath() { return `${this.dataDir}/minidiscord.db` },
```
`openDb` 는 모듈 싱글턴이 아니라 함수이고 `dbPath` 는 지연 게터다 → 두 번째 `buildServer()` 는 **파일을 다시 연다**. AC-E2E-008(`acceptance.md:72`)이 메시지 본문·첨부 바이트 해시·토큰 재접속이라는 **동일성**을 재므로 「그냥 재시작됐다」 가 아니라 「남아 있다」 를 잰다. **설계는 건전하다.**
다만 `plan.md:90` 의 `close()` 는 Fastify 의 것이고 **`app.db` 를 닫지 않는다.** 첫 연결이 열린 채 두 번째가 열리므로 엄밀히는 「재시작」 이 아니라 「두 번째 연결 병존」 이다. 권고: plan §F M3 과 §D-6 에 «재구축 전에 `app.db.close()` 를 부른다» 를 명시하라.

### D-14 — [Low] `[n/13]` 라벨 열에 재시작 단계가 없다
`plan.md:88` 이 재시작을 스크립트에 넣지만 REQ-E2E-007 의 13항목에는 재시작이 없다. 결과적으로 이 카드의 두 번째 목적(재시작 영속성)은 **순서 증거를 갖지 않는 유일한 큰 단계**다. 권고: 라벨을 붙이지 않는다는 사실을 명시하거나 `[n/14]` 로 넓혀라(넓히면 AC-E2E-007 의 대조 문자열도 함께 고쳐야 한다).

### D-15 — [Low] AC-E2E-009 변이의 **정밀도**를 확인하지 못했다
`grep -rln buildServer server/test` → 8개 파일이 적중한다. `openDb(':memory:')` 변이가 **신규 재시작 시험만** 빨갛게 하는지 스위트 전반을 빨갛게 하는지는 **돌려보지 않았다**. 후자라면 「굵은 변이는 절반을 가리지 못한다」 부류가 되어 AC-E2E-009 의 존재 이유를 증명하지 못한다. 권고: DoD 2항 변이표에 «**어느 시험이 빨개졌는지**» 열을 넣어 이 구분이 기록되게 하라.

### D-16 — [Medium] REQ-E2E-001 의 후반절을 재는 기준이 없다 (추적성 감점 근거)
`spec.md:52` — «Claude 세션을 띄우지 **않으며**, 어떤 외부 유료 API 도 호출하지 **않는다**». AC-E2E-001 은 정상 경로 통과만 재고, AC-E2E-016 은 **주장**의 부재를 재지 **호출**의 부재를 재지 않는다. 권고: 실행 가능한 부재 검사를 붙여라 — `grep -rEn "anthropic|claude\.ai|api\.anthropic" scripts/e2e.mts` → `0`, 그리고 E2E 가 `claude` 실행 파일을 spawn 하지 않음을 자기 검사로.

### D-17 — [정보] 오탐이 아님을 기록해 둔다
`npm test -w server`(`acceptance.md:82`)의 `-w server` 는 **경로**로 해석되어 정상 동작한다(`server/package.json` 의 name 은 `@minidiscord/server`). npm 워크스페이스 플래그는 이름과 경로를 모두 받는다. **결함 아님** — 재감사에서 다시 제기하지 말 것.

---

## 6. 감사 지시가 지목한 실패 부류별 정산

| # | 부류 | 판정 |
|---|---|---|
| 1 | 구성상 참인 기준 | **적발 4건** — D-02(셋), D-03, D-04(측정③), D-08 |
| 2 | 회귀 스위트 밖의 기준 | **부분 방어 확인.** REQ-E2E-009/AC-E2E-009 가 인프로세스 짝을 [HARD] 로 요구해 이 부류를 정면으로 다룬다(`plan.md:124` 안티패턴에도 명시). **다만 짝의 측정이 이름 기반**(D-08)이라 방어가 완결되지 않았다. 셸 전용으로 남는 나머지(AC-002·004·005·006·007·011·012·013·014·015)는 대상이 스크립트·문서라 인프로세스 짝을 요구하기 어렵다 — 수용 |
| 3 | 실패보다 약한 변이 | **적발 2건** — D-01(변이가 공유 하네스를 건드려 지나치게 굵다), D-15(정밀도 미확인) |
| 4 | 제목이 본문보다 넓음 | **적발 2건** — D-03(«세 줄» vs 어간 3회), D-04(«3자리 각각» vs 전역 개수) |
| 5 | 재지 않은 수 | **위반 없음 — 작성자 주장 확인.** `grep -rn "283" .moai/specs/SPEC-E2E-001/` → 적중 0. spec.md:185 가 «283 은 이 나무에서 재지 않았다» 를 Gap 으로 명시했고 plan.md:40·128 이 승계를 금지한다. **이 축은 모범적이다** |
| 6 | 줄 인용 | **README 인용은 전건 정확** — `grep -n "생산 배치" README.md` → `5`·`225`·`236`; `grep -n "내 PC" README.md` → `3`·`190`. 디스패치 정정도 옳다. **단 코드 인용 1건 오류** — D-07 |
| 7 | 정정이 자기 기록을 낡게 함 | **선제 방어 확인** — `plan.md:27`(§B-4)·`plan.md:107`(M5 어간 재훑기, 0건이면 0건 기록)이 이 부류를 작업 항목으로 갖는다. **SPEC 자신 안에서는** 낡은 형제를 찾지 못했다 |
| 8 | 두 카드가 같은 자리를 청구 | **울타리가 서지 않는다** — 배정(spec.md:141, README=t6 · config.ts=t26)은 명확하나, 그것을 강제하는 유일한 기계 장치인 AC-E2E-013 측정 ②가 **커밋 뒤 무조건 초록**이다(D-02). 배정은 문서로만 서 있다 |

---

## 7. 검증하지 않은 것 (Gaps)

- **아무것도 실행하지 않았다 — E2E 스크립트도, 서버도, 시험도.** 이 나무에 `node_modules` 가 없다(`ls node_modules` → `No such file or directory`; `ls -d server/node_modules` → 없음). `npm test`·`npm run e2e`·`connectV2` 의 실제 접속은 **한 번도 관측하지 않았다**. 이 감사는 전부 **정적 판독**이다.
- **AC-E2E-009 변이(`openDb(':memory:')`)를 실행하지 않았다** — 신규 시험만 빨갛게 하는지 스위트 전반인지 모른다(D-15).
- **`scripts/e2e.mts` 가 `../server/test/gateway-v2.ts` 를 `tsx` 로 실제 해소하는지 실행 확인하지 않았다.** 정적으로는 워크스페이스 경계를 넘는 **상대 경로 import** 이므로 성립할 것으로 보이나(워크스페이스는 npm 의 개념이고 Node 모듈 해소와 무관하다), ESM 확장자 처리와 `ws` 기본 import 가 어긋날 여지는 남는다. **D1(a) 채택의 잔여 위험이며 `plan.md:34`(M1 첫 명령 `npm install`)이 그것을 처음 잰다.**
- **`ws` 의 부모 디렉터리 해소를 재확인만 했다** — `ls -d ../../../node_modules/ws` → 존재. 새 클론·CI 에서의 거동(D4 의 함정)은 **재현하지 않았다**. 작성자가 이 함정을 스스로 공시한 것(`spec.md:105`)은 정직하고 정확하다.
- **README 갱신 후 상태를 재지 않았다** — 모든 README 측정은 **갱신 전 사전 상태**로만 잰 것이고, 그것이 D-03·D-04 의 근거다. 갱신 후 값은 run 단계의 관측이다.
- **`channel/src/gateway-client.ts` 를 읽지 않았다** — t25 경계(spec.md:135)의 타당성은 검증하지 않았다. 작성자도 같은 Gap 을 선언했다(`plan-done.md:119`).
- **`.github/workflows/` 를 열지 않았다** — t27 경계는 문서 대조로만 판단했다.
- **`.moai/plan/2026-08-31-queue-redesign/proposal.md` §2·§5 를 열지 않았다** — 카드 범위의 정본 대조를 하지 못했다. 범위 판단은 감사 지시문이 요약한 범위와 SPEC 본문의 일치로만 했다. **이 감사의 가장 큰 미검증 항목이다** — SPEC 이 정본을 잘못 읽었을 가능성은 배제하지 못했다.

---

## 8. 권고 (manager-spec 에게)

FAIL 이지만 **구조적 결함이 아니다.** REQ 층·범위 경계·발견(§0)·「재지 않은 수」 규율은 모두 좋다. 고칠 것은 **검증 층 열 자리**이고 대부분 한두 줄 수정이다. 우선순위 순:

1. **D-02** — `git diff` 세 자리에 기준선을 붙여라(`2a19d7d..HEAD`). 가장 싸고 가장 큰 효과. `acceptance.md:98`·`:117`·`:164`, `plan.md:115`.
2. **D-01** — AC-E2E-002 를 소스 grep 에서 전선 관측(`recordSocket`) + 음성 대조군으로 다시 써라. `acceptance.md:24-26`. 유일한 **SPEC 내부 모순**이다.
3. **D-05** — AC-E2E-016 측정 ①을 금지어 grep 으로 바꿔라. `acceptance.md:141`.
4. **D-04 / D-03** — AC-E2E-012·014 를 자리별·어간별로 쪼개고, **각 측정의 사전 상태 값을 기준 본문에 적어라**(012③=1, 014=2). 사전 상태를 적어 두면 「이미 초록인 기준」 이 다시 생기지 않는다.
5. **D-06** — AC-E2E-006 을 양성 표지 + 전용 종료 코드로 바꾸고, 포트 주입 기제를 요구사항에 추가하라.
6. **D-07** — `routes-messages.ts:173` → `:163`. `spec.md:130`.
7. **D-08 / D-15** — AC-E2E-009 의 변이를 DoD 2항의 **필수 1건**으로 못박고, 변이표에 「빨개진 시험」 열을 추가하라.
8. **D-09 / D-10 / D-11 / D-16** — 문구·명령 다듬기.

**Tier 경고**: 위 수정은 요구사항을 최소 둘(포트 주입 기제, 유료 API 무호출 검사) 늘릴 여지가 있다. **REQ 는 이미 16/16 상한**이므로 늘리면 Tier L 재산정(통과선 0.85)이 필요하다. 대안은 기존 REQ 안에 절을 흡수하는 것 — 작성자 자신이 `plan-done.md:33` 에서 이 위험을 정확히 예고했다.

**2회차는 D-01~D-16 델타에만 범위를 둔다** (재감사 계약).
