# SPEC-E2E-001 개정 1차 — 1회차 감사 FAIL 0.67 대응

- 대상: `.moai/specs/SPEC-E2E-001/` — `spec.md` v0.1.0 → **v0.2.0**, `plan.md`, `acceptance.md`, `progress.md`
- 근거 보고: `.moai/reports/t6/plan-audit.md` (1회차, FAIL 0.67 / 통과선 0.80 Tier M)
- 나무: `.claude/worktrees/t6` · 브랜치 `WT-e2e-persist-readme` · 기준 `2a19d7d` · **커밋하지 않음** · `status: draft` 유지
- 처리 순서: 감사 §8 우선순위 1~8 을 그대로 따랐다
- **요구사항 16 · 수용 기준 16 — 변동 없음.** 리드 [HARD] 제약대로 새로 만들지 않고 **기존 것의 절을 넓히거나 뒤집었다**. 실행 확인: `grep -c '^- \*\*REQ-E2E-' spec.md` → `16`, `grep -c '^### AC-E2E-' acceptance.md` → `16`

---

## 0. 쉬운 말 요약

감사는 요구사항 쪽은 괜찮다고 봤고, **검증 기준 쪽 열 자리**를 문제 삼았습니다. 요지는 하나입니다 — **「지워도 초록인 검사」**. 예를 들어 「`git diff` 로 확인한다」는 검사는 커밋을 하고 나면 항상 빈 출력이라 무엇을 고쳤든 통과합니다. 이런 형태가 넷이었습니다. 감사 지적은 **열 건 전부 참**이었고, 재현해서 확인했습니다.

전부 고쳤습니다. 다만 **한 건은 부분 반박**했습니다 — 감사가 「`recordSocket` 이라는 도구로 재라」고 처방했는데, 그 도구는 같은 프로세스 안에서만 쓸 수 있고 우리 E2E 는 서버를 **별도 프로세스**로 띄웁니다. 그래서 문제 지적은 받아들이되 도구는 다른 것을 골랐고, 그 이유를 실측과 함께 적었습니다.

그리고 **감사가 못 읽은 정본 문서를 직접 열어 보다가 범위 문제를 하나 찾았습니다.** README 의 「내 PC」 문구 정정을 이전 판은 t6 이 하기로 했는데, 정본은 그것을 `config.ts` 와 묶어 **t26** 에 넣고 있었습니다. 정본을 따라 t6 에서 뺐습니다 — 리드 확인이 필요한 항목입니다.

---

## 1. 차단 발견 처리표 (감사 §8 우선순위 순)

| 우선 | 발견 | 처리 | 닫은 자리 |
|---|---|---|---|
| 1 | **D-02** [Critical] 기준선 없는 `git diff` | **수정 — 부류로 훑음** | `acceptance.md:7`(규약)·`:134`·`:163`·`:165`·`:238`, `plan.md:5`(규약)·`:72`·`:132`·`:139` |
| 2 | **D-01** [Critical] AC-E2E-002 측정 대상 부재 | **수정 + 기제 부분 반박** | `acceptance.md` AC-E2E-002 전면 재작성, `spec.md` §3 D1 반박 근거, §7.1 측정 8·11 |
| 3 | **D-05** [High] 명령 없는 자기 신고 | **수정** | `acceptance.md` AC-E2E-016 측정 ①·①-b |
| 4 | **D-04** [High] 「3자리 각각」 미측정 | **수정** | `acceptance.md` AC-E2E-012, `spec.md` §7.2 |
| 4 | **D-03** [High] 사전 상태로 2/3 충족 | **수정** | `acceptance.md` AC-E2E-014, `spec.md` §7.2 |
| 5 | **D-06** [High] 부정 단언 + Given 기제 부재 | **수정 — REQ 절로 흡수** | `spec.md` REQ-E2E-006, `acceptance.md` AC-E2E-006, `plan.md` §D-3·M1 |
| 6 | **D-07** [Medium] `:173` → `:163` | **수정 + 정정 이력 기록** | `spec.md` §5 t8 절, §7.1 측정 12 |
| 7 | **D-08 / D-15** [Medium] 시험 이름 grep · 변이 정밀도 | **수정** | `acceptance.md` AC-E2E-009, DoD 2항 |
| 8 | **D-09** [Medium] 판단을 요구함 | **수정 — 기준 방향 자체가 바뀜** | `acceptance.md` AC-E2E-013 |
| 8 | **D-10** [Medium] 표지가 「하는 것」을 안 잼 + 파이프가 종료 코드 버림 | **수정** | `spec.md` REQ-E2E-007 [HARD], `acceptance.md` AC-E2E-007 |
| — | **D-11** [권고] `sha256sum` 호스트 의존 | **수용·수정** | `acceptance.md` AC-E2E-005, `spec.md` §7.1 측정 17 |
| — | **D-12** [권고] 조건절과 무조건 선언 어긋남 | **수용·수정** | `spec.md` REQ-E2E-016 (전반절 무조건 / 후반절 조건부), §3 D3 |
| — | **D-13** [권고] `close()` 만으로는 재시작이 아님 | **수용·수정** | `spec.md` REQ-E2E-009 [HARD], `plan.md` §D-6·M3, `acceptance.md` AC-E2E-009 측정 ③ |
| — | **D-14** [권고] 재시작에 표지 없음 | **수용·수정 — 13단계 → 15단계** | `spec.md` REQ-E2E-007 ⑭, §6, `acceptance.md` AC-E2E-007 |
| — | **D-16** [권고] REQ-E2E-001 후반절 미측정 | **수용 — 기존 기준에 흡수** | `spec.md` REQ-E2E-001 [HARD], `acceptance.md` AC-E2E-016 측정 ② |
| — | **D-17** [정보] `-w server` 는 결함 아님 | **재제기하지 않음** | — |

**차단 10건 전건 처리. 반박은 1건(D-01 의 기제만, 발견 자체는 수용).**

---

## 2. 각 발견의 상세

### D-02 [Critical] — 기준선 없는 `git diff` (우선 1)

**감사 주장을 재현했다.** `git diff --name-only` 와 `git diff -- package.json` 은 인자 없이 쓰면 워킹트리 대 인덱스를 비교하므로 커밋 뒤 항상 빈 출력이고, 그 위의 `grep -c` 는 언제나 `0` 이다 — 무엇을 고쳤든 통과한다.

**개별이 아니라 부류로 훑었다** (리드 지시). 저장소의 모든 `git diff` 출현을 세어 기준선 유무를 확인했다:

```
$ grep -n 'git diff' .moai/specs/SPEC-E2E-001/acceptance.md .moai/specs/SPEC-E2E-001/plan.md
```
→ 적중 11건. 그중 **기준선 있는 명령 7건** (`acceptance.md:134`·`:163`·`:165`·`:238`, `plan.md:72`·`:132` + 규약), 나머지 4건은 **「기준선 없는 형태를 금지한다」고 말하는 산문**(`acceptance.md:7`·`:138`·`:167`, `plan.md:5`·`:139`)이다. **기준선 없이 실행되는 명령은 0건.**

두 문서 머리에 규약을 [HARD] 로 세웠다 — `BASE=2a19d7d`, 형태는 `git diff --name-only "$BASE"..HEAD`.

**울타리를 다시 세웠다** (감사 §6 8행의 지적). AC-E2E-013 은 이제 세 측정을 갖는다: ① `config.ts` 부재(기준선 있는 name-only) ② `grep -c "내 PC" README.md` → `2`(사전 상태 유지) ③ `git diff "$BASE"..HEAD -- README.md | grep -c "내 PC"` → `0`. ②만으로는 「고쳐 쓰되 같은 글자를 남김」을 못 잡아 ③을 함께 두었다.

### D-01 [Critical] — AC-E2E-002 측정 대상 부재 (우선 2) · **기제 부분 반박**

**발견은 전건 수용한다.** D1(a) 재사용을 고르면 `'hello'` 문자열은 공유 하네스 안에 있고 스크립트에는 없다 — 재현:

```
$ grep -n "type: 'hello'" server/test/gateway-v2.ts
35:      ws.send(JSON.stringify({ type: 'hello', pub: pubOf(token), client_nonce: clientNonce }))
```

**그러나 감사가 처방한 `recordSocket` 기제는 채택할 수 없다.** 근거는 실측이다:

```
$ grep -n "onConnection" server/src/gateway.ts
85:// onConnection: 하네스가 서버 쪽 소켓을 관측하는 유일한 창구 (…)
87:export function createGateway(app: FastifyInstance, opts: { …; onConnection?: (ws: WebSocket) => void }): Gateway {
103:    opts.onConnection?.(ws)
$ sed -n '47p' server/src/index.ts
  const gateway = createGateway(app, { uploadsDir: config.uploadsDir, botFilesDir: config.botFilesDir })
```

`recordSocket(ws)` 은 **서버 쪽 `WebSocket` 객체의 `send` 를 교체**한다(`gateway-v2.ts:108-119`). 그 객체는 `createGateway` 의 `onConnection` 으로만 나오는데, ① **E2E 는 서버를 별도 프로세스로 띄우므로**(REQ-E2E-001·plan §D-1) 다른 프로세스의 객체를 감쌀 방법이 없고, ② `buildServer()` 는 `onConnection` 을 넘기지 않아 인프로세스 짝에서도 앱을 손으로 조립해야 한다.

**대신 같은 것을 전선에서 잰다** (감사의 「소스가 아니라 전선을 재라」는 방향은 그대로 따른다):

- **양성** — `connectV2` 의 해소 자체가 v2 성립의 증거다. 그 함수가 `server_proof` 를 상수 시간 대조하고 봉투 `mac`·`seq` 를 검증한 뒤에만 해소한다(`gateway-v2.ts:40-73`). 표지 `[5/15]`.
- **음성 대조군** — 별도 소켓 하나가 `{type:'hello', token}` 을 보내고 **프레임 0건 수신 후 닫힘**을 단언한다. 표지 `[6/15]`. 관측 근거:
  ```
  $ grep -n "function dropConn" -A 6 server/src/gateway.ts
  118:  function dropConn(ws: WebSocket): void {
  119-    handshakes.delete(ws)
  120-    conns.delete(ws)
  121-    ws.close()
  ```
  **send 가 없다** — 닫을 때 아무것도 보내지 않으므로 「0건 수신」은 실재하는 관측이다.

**이 대안이 감사의 두 번째 지적(「변이가 공유 하네스를 건드려 지나치게 굵다」)도 함께 닫는다** — 두 측정 모두 `scripts/e2e.mts` 안에서만 이뤄지고 `server/test/gateway-v2.ts` 를 편집하지 않는다.

**재지 않는 것을 적어 두었다**: 이 기준은 auth 서명 검증 층(`gateway.ts:191`)을 재지 않는다. 그 층을 지워도 양성 측정은 통과한다 — 그 층은 `SPEC-GWAUTH-002` 의 기준이 소유한다. (`acceptance.md` AC-E2E-002 「잡는 변이」 ②)

### D-05 [High] — 명령 없는 자기 신고 (우선 3)

측정 ①을 금지어 grep 으로 바꿨다. **개정 중 실행해 보니 기준이 자기 정의문에 걸렸다** — 적중 6건이 전부 이 SPEC 자신의 「금지한다」는 문장이었다:

```
$ grep -rEn "수동 검증(을)? ?(수행|완료)|실 세션으로 (확인|검증)|사람이 (직접 )?확인했" README.md .moai/specs/SPEC-E2E-001/
(적중 6건 — plan.md:152, spec.md:45·77·106, acceptance.md:198·214)
```

금지어를 **정의하는 문장**은 금지어를 포함할 수밖에 없으므로, 필터 없이는 기준이 영구히 빨갛다. **줄 단위 면제 표지 `[AC-016-EXEMPT]`** 를 그 6줄에 붙이고, 필터를 건 뒤 재실행:

```
$ grep -rEn "<같은 패턴>" README.md .moai/specs/SPEC-E2E-001/ | grep -v 'AC-016-EXEMPT'; echo "exit=$?"
exit=1
```

**면제가 조용히 불어나지 않도록 개수를 못박았다** (측정 ①-b):

```
$ grep -rc 'AC-016-EXEMPT' .moai/specs/SPEC-E2E-001/{spec,plan,acceptance}.md
spec.md:3   plan.md:1   acceptance.md:2      (합 6)
```

`README.md` 와 `scripts/` 에는 면제 표지를 쓰지 않는다 — 그 둘은 거짓 주장이 실제로 오독을 낳는 표면이다. 사전 상태 README 단독 적중 **0**.

### D-04 [High] — 「3자리 각각」 미측정 (우선 4)

전역 개수를 **자리별 앵커**로 바꿨다. 세 앵커가 사전 상태에서 각각 정확히 1회만 나오고, 셋 다 현재 「생산 배치」와 같은 줄에 있음을 확인했다:

```
$ grep -c "지금 상태.*생산 배치" README.md   → 1
$ grep -c "열린 갈래.*생산 배치" README.md   → 1
$ grep -c "배포 경계.*생산 배치" README.md   → 1
$ grep -c "지금 상태" / "열린 갈래" / "배포 경계" README.md  → 각 1  (앵커 유일성)
$ grep -c "지금 상태.*서비스화" / "열린 갈래.*서비스화" / "배포 경계.*서비스화"  → 각 0  (갱신 후 측정의 사전 상태)
```

새 측정은 ①(어간 소멸, 3→0) + ②㉠㉡㉢(자리별 0→1) 넷이다. **감사가 지적한 「셋 중 둘을 지우면 아무 측정도 못 잡는다」가 닫혔다** — 문장을 통째로 지우면 ①은 초록이지만 ②㉠㉡㉢ 이 전부 `0` 으로 빨개진다.

**v0.1.0 의 측정 ③(`grep -c "배포 경계"` ≥ 1)은 폐기했다** — 사전 상태가 이미 `1` 이라 아무것도 재지 못했다. 이제 「배포 경계」는 앵커와 결합해서만 쓴다.

### D-03 [High] — 사전 상태로 2/3 충족 (우선 4)

**감사의 사전 상태 `2` 를 재현했다.** 원인은 `t23` 이 그 절에 이미 두 번 나오기 때문이다:

```
$ awk '/^## 보안에 대해 알아둘 점/,/^## 명령어/' README.md > /tmp/t6sec.txt; wc -l < /tmp/t6sec.txt
53
$ grep -c "t23" /tmp/t6sec.txt     → 2      ← v0.1.0 이 이 값 위에 기준을 세웠다
$ grep -c "서비스화" /tmp/t6sec.txt → 0
$ grep -c "t12"     /tmp/t6sec.txt → 0
$ grep -c "N5"      /tmp/t6sec.txt → 0
```

**`t23` 을 어간에서 뺐고**, 사전 상태가 **셋 다 0** 인 어간 셋(`서비스화` / `t12` / `N5`)을 골라 트리거마다 독립 측정을 두었다. 이제 **세 줄 중 어느 하나만 빠져도 그 줄의 측정이 빨개진다.**

### D-06 [High] — 부정 단언 + Given 기제 부재 (우선 5)

**REQ 를 늘리지 않고 REQ-E2E-006 의 절로 흡수했다** (리드 [HARD] 제약). 그 요구사항이 이제 셋을 함께 명령한다: 시한 초과 시 ① 고정 표지 `[boot-timeout]` 출력 ② **전용 종료 코드 `9`** ③ 환경변수 `E2E_FORCE_PORT` 로 포트를 밖에서 주입할 수 있게 함.

AC-E2E-006 은 양성으로 바뀌었다 — `exit=9` **그리고** `grep -c '\[boot-timeout\]'` = `1`. 감사가 지적한 새는 경로(「의존성 부재 안내」 exit 1)는 종료 코드가 다르므로 더는 초록으로 새지 않는다. `acceptance.md` §B 와 `plan.md` §C 에 「의존성 부재 경로의 exit 은 `9` 가 아니어야 한다」를 못박았다.

사전 상태 확인 — 두 표지 모두 코드에 없다:
```
$ grep -rn "E2E_FORCE_PORT" README.md package.json server channel | wc -l   → 0
$ grep -rn "boot-timeout"   README.md package.json server channel | wc -l   → 0
```

### D-07 [Medium] — 줄 인용 오류 (우선 6)

**재현하고 정정했다.**
```
$ sed -n '163p;173p' server/src/routes-messages.ts
    return reply.send(createReadStream(att.stored_path))
  if (m.author_type === 'user') {
$ grep -c existsSync server/src/routes-messages.ts   → 0
```
`spec.md` §5 t8 절을 `:163` 으로 고치고, **정정 이력을 그 자리에 남겼다** — 「v0.1.0 은 `:173` 으로 적었고, 그 줄은 `displayName()` 안이며 첨부와 무관하다. 결함 자체는 참이고 앵커만 틀렸다.」 기록 없는 비수정은 다음 라운드에서 누락과 구분되지 않는다.

§7.1 측정 12 에도 두 명령을 함께 실었다.

### D-08 / D-15 [Medium] — 시험 이름 grep · 변이 정밀도 (우선 7)

이름 grep(`| grep -c "restart"`)을 셋으로 바꿨다: ① 파일 존재(`test -f server/test/restart-persistence.test.ts`) ② 그 파일만 지정해 vitest 실행(빈 파일은 «No test found» 로 실패한다) ③ `app.db.close()` 존재(D-13 과 겸함).

**D-15 대응 — 변이를 DoD 필수 1건으로 못박았다**: `openDb(config.dbPath)` → `openDb(':memory:')` 는 8건 안에 **반드시** 들어가고, 변이표에 **「빨개진 시험·기준 목록」 열**을 신설해 그 변이가 신규 시험만 잡는지 스위트 전반을 잡는지가 기록되게 했다. 후자면 굵은 변이라 AC-E2E-009 의 존재 이유가 증명되지 않으므로 그 사실을 적고 기준을 좁히도록 했다.

사전 상태: `grep -rn "restart" server/test/ | wc -l` → **0**.

### D-09 [Medium] — 판단을 요구함 (우선 8)

D5 결정(아래 §3)으로 **기준의 방향 자체가 뒤집혔다** — 「고쳐졌는가」가 아니라 「건드리지 않았는가」를 잰다. 「류의 다른 뜻」 같은 판단 문구가 사라지고 수로 못박혔다: `grep -c "내 PC" README.md` → **`2`**(사전 상태 2, 유지되어야 함).

### D-10 [Medium] — 표지·파이프 (우선 8)

`spec.md` REQ-E2E-007 에 [HARD] 로 「표지는 그 단계의 단언이 모두 성공한 **뒤에** 찍는다」를 넣고, `plan.md` §D-8·M1 에 반복했다. AC-E2E-007 은 출력을 파일로 받아 **종료 코드를 따로 읽고**(`set -o pipefail` 포함) 그다음 표지 열을 대조한다 — `tr` 의 종료 코드를 읽던 형태를 폐기했다.

### 권고 5건 (D-11·D-12·D-13·D-14·D-16) — 전건 수용

- **D-11**: `sha256sum` → `shasum -a 256`(`which shasum` → `/usr/bin/shasum`, macOS 기본). `ls -laR` 의 시각을 빼고 `find … | sort | xargs shasum` 으로 바꿨다.
- **D-12**: REQ-E2E-016 을 전반절(무조건 금지) / 후반절(조건부 면책)로 갈랐다. 체크리스트를 싣지 않아도 금지 검사 ①②는 그대로 돈다.
- **D-13**: REQ-E2E-009 에 [HARD] 로 `app.db.close()` 를 넣고 `plan.md` §D-6·M3, AC-E2E-009 측정 ③이 각각 잰다.
- **D-14**: 13단계 → **15단계**로 넓혀 재시작(⑭)과 v1 음성 대조군(⑥)이 순서 증거를 갖게 했다. AC-E2E-007 의 대조 문자열도 `[1/15]…[15/15]` 로 함께 고쳤다.
- **D-16**: 새 기준을 만들지 않고 AC-E2E-016 측정 ②로 흡수했다(리드 [HARD] 제약). REQ-E2E-001 에는 [HARD] 절을 더해 「이 무호출 성질은 주장이 아니라 기계 검사로 뒷받침한다」를 명시했다. 사전 상태 `grep -rEn "anthropic|claude\.ai|api\.anthropic|spawn\(['\"]claude" README.md package.json` → `exit=1`(적중 없음).

---

## 3. 감사가 못 읽은 정본을 대조해 찾은 범위 문제 — **리드 결정 필요**

감사 §7 이 「가장 큰 미검증 항목」으로 남긴 것이 정본 대조였다(`proposal.md` 는 원본 체크아웃에만 있는 미추적 산출물이라 이 나무에 없다). **읽기만 하고 복사하지 않았다** — 절대 경로로 열었다.

정본 §5 마지막 문장:

> «README·`config.ts:5` 주석의 «내 PC 에서만 도는 서버» 도 «사내망 전용» 으로 같이 고친다(**N3 에 포함**).»

**정본은 README 와 `config.ts:5` 를 한 문장으로 묶어 N3(=카드 `t26`)에 넣는다.** v0.1.0 은 리드 디스패치의 「`config.ts:5` 는 t26, README 는 네가 정하라」를 근거로 README 를 t6 으로 가져왔으나, 정본을 직접 읽으니 **그 분리는 정본에 없다.**

**정본을 따랐다.** 이유 둘. ① 범위의 SSOT 는 정본이고, 디스패치 요약이 정본과 갈리면 정본이 이긴다 — 이 프로젝트가 t22 에서 겪은 「디스패치가 전한 값은 SSOT 가 아니다」의 같은 형태다. ② 두 카드가 같은 자리를 청구하는 것이 리드가 명시한 최대 위험인데, **t6 이 물러나면 그 위험이 0** 이 된다(t26 이 물러나는 쪽은 t6 이 통제할 수 없다).

**바뀐 것**: REQ-E2E-013 이 do-요구 → **울타리 요구**로 뒤집혔고, AC-E2E-013 이 존재 검사 → **부재 검사**가 되었으며, `spec.md` §5 의 t26 절과 `plan.md` M5 가 함께 바뀌었다. **REQ·AC 개수는 그대로다.**

**비용을 숨기지 않는다**: t6 이 더하는 트리거 첫 줄은 「이 서버는 사내망 전용이다」로 시작하는데 README 3·190행은 여전히 「내 PC에서만」이라 말한다. **t26 이 닫을 때까지 README 안에 과도기적 어긋남이 남는다.** 정본이 그 과도기를 수용하는 구조라 이 SPEC 도 수용하되 `spec.md` §3 D5 에 공시했다.

**리드가 「t6 이 함께 고친다」로 뒤집으면** REQ-E2E-013 을 되돌리고 AC-E2E-013 의 방향을 바꾸면 된다 — 한 자리 수정이며 `plan.md` §A 표에 그 절차를 적어 두었다.

---

## 4. Tier 재확인 — **M 유지 (통과선 0.80)**

리드 [HARD] 제약을 지켰다. 감사가 「REQ 를 최소 둘 늘릴 여지가 있다」고 경고한 항목 둘을 **새 REQ 로 만들지 않고 흡수**했다:

| 감사가 예상한 새 REQ | 실제 처리 |
|---|---|
| 포트 주입 기제 | **REQ-E2E-006 의 절로 흡수** — 「환경변수 `E2E_FORCE_PORT` 가 있으면 그 포트를 그대로 서버에 넘긴다」 |
| 유료 API 무호출 검사 | **REQ-E2E-001 의 [HARD] 절 + AC-E2E-016 측정 ②로 흡수** — 새 기준도 만들지 않았다 |

실행 확인:
```
$ grep -c '^- \*\*REQ-E2E-' spec.md        → 16
$ grep -c '^### AC-E2E-' acceptance.md      → 16
$ grep -c '^### Out of Scope — ' spec.md    → 6
```

---

## 5. 정정 뒤 어간 재훑기 (이 프로젝트에서 네 번 재현된 부류)

이번 개정이 고친 값들의 **옛 형태**가 문서에 낡은 채 남아 있는지 훑었다.

| 훑은 어간 | 적중 | 판정 |
|---|---|---|
| `/13]` (옛 표지 폭) | **0** | 깨끗 — 전부 `/15]` 로 바뀜 |
| `열세 / 13단계 / 열셋` | 1 | `spec.md:183` — **의도된 이력 기술**(「이전 판은 13단계였고…」). 본문 규범은 아니다 |
| `:173` | 2 | `spec.md:25`(HISTORY)·`:150`(정정 이력) — **둘 다 「v0.1.0 이 이렇게 적었고 틀렸다」는 기록.** 살아 있는 인용 0건 |
| `sha256sum` | 2 | `acceptance.md:61`·`spec.md:209` — 둘 다 「기본이 아니라 쓰지 않는다」는 설명. 명령으로 쓰이는 자리 0건 |
| `124` | 3 | 전부 「이 부정 단언은 폐기했다」는 기록. 살아 있는 측정 0건 |

**규범 문장에 남은 낡은 값은 0건이다.** 적중은 전부 HISTORY 또는 「v0.1.0 은 이랬다」는 이력 기술이며, 이 저장소의 규약(「본문은 지금 참, HISTORY 는 그때 참」)에 맞는다.

추가로 절 참조 오류 하나를 자체 발견해 고쳤다 — `§3.5` → `§3 D5` (2자리).

---

## 6. 실행한 검증 명령과 출력 (요약)

| # | 명령 | 출력 |
|---|---|---|
| 1 | `grep -c '^- \*\*REQ-E2E-' spec.md` | `16` |
| 2 | `grep -c '^### AC-E2E-' acceptance.md` | `16` |
| 3 | `grep -c '^### Out of Scope — ' spec.md` | `6` |
| 4 | `grep -n 'git diff' acceptance.md plan.md` | 11건 — 실행 명령 7건 전부 기준선 있음, 나머지 4건은 금지 산문 |
| 5 | `sed -n '163p;173p' server/src/routes-messages.ts` | `163`=`createReadStream(...)`, `173`=`if (m.author_type === 'user') {` |
| 6 | `grep -c existsSync server/src/routes-messages.ts` | `0` |
| 7 | `grep -n "type: 'hello'" server/test/gateway-v2.ts` | `35:` (스크립트가 아니라 하네스 안 — D-01 재현) |
| 8 | `grep -n "function dropConn" -A 6 server/src/gateway.ts` | `118-122` — `send` 없이 `ws.close()` |
| 9 | `grep -n "onConnection" server/src/gateway.ts` | `85`·`87`·`103` |
| 10 | `sed -n '47p' server/src/index.ts` | `createGateway(app, { uploadsDir…, botFilesDir… })` — `onConnection` 없음 |
| 11 | `grep -c "지금 상태.*생산 배치" / "열린 갈래.*생산 배치" / "배포 경계.*생산 배치" README.md` | `1` / `1` / `1` |
| 12 | `grep -c "지금 상태" / "열린 갈래" / "배포 경계" README.md` | `1` / `1` / `1` (앵커 유일성) |
| 13 | `grep -c "지금 상태.*서비스화" / "열린 갈래.*서비스화" / "배포 경계.*서비스화" README.md` | `0` / `0` / `0` |
| 14 | `awk '보안절' > /tmp/t6sec.txt; wc -l` | `53` |
| 15 | `grep -c "서비스화" / "t12" / "N5" / "t23" /tmp/t6sec.txt` | `0` / `0` / `0` / **`2`** |
| 16 | `grep -c "생산 배치" / "내 PC" / "배포 경계" README.md` | `3` / `2` / `1` |
| 17 | `grep -rn "restart" server/test/ \| wc -l` | `0` |
| 18 | `which shasum` | `/usr/bin/shasum` |
| 19 | `grep -rn "E2E_FORCE_PORT" / "boot-timeout" README.md package.json server channel \| wc -l` | `0` / `0` |
| 20 | 금지어 grep (면제 필터 전) | 적중 **6** — 전부 자기 정의문 |
| 21 | 금지어 grep `\| grep -v 'AC-016-EXEMPT'` | `exit=1` (적중 없음) |
| 22 | `grep -rc 'AC-016-EXEMPT' {spec,plan,acceptance}.md` | `3` / `1` / `2` (합 6) |
| 23 | `grep -rEn "anthropic\|claude\.ai\|api\.anthropic\|spawn\(['\"]claude" README.md package.json` | `exit=1` |
| 24 | 낡은 값 훑기 (`/13]`·`:173`·`sha256sum`·`124`) | 규범 문장 적중 **0** |

---

## 7. 미검증 (Gaps) — 이 개정이 재지 않은 것

- **아무것도 실행하지 않았다 — E2E 도, 서버도, 시험도.** 이 나무에 `node_modules` 가 없다. 1회차 감사와 같은 한계이며, 이 개정도 **정적 판독**이다.
- **`openDb(':memory:')` 변이를 돌리지 않았다** — 신규 시험만 빨개지는지 스위트 전반인지 모른다(D-15). DoD 가 그 구분을 run 단계에서 기록하게 했을 뿐이다.
- **`scripts/e2e.mts` → `../server/test/gateway-v2.ts` 의 `tsx` 해소를 실행 확인하지 않았다.** D1(a) 채택의 잔여 위험이며 plan §C 가 처음 잰다.
- **음성 대조군이 실제로 「프레임 0건 후 close」로 관측되는지 돌려보지 않았다.** `dropConn` 코드를 읽어 추론한 것이다 — 코드는 send 를 하지 않지만, `ws` 라이브러리가 close 프레임 외에 무엇을 올리는지는 실행으로 확인하지 않았다.
- **README 갱신 후 상태를 재지 않았다** — 모든 README 측정의 「갱신 후 기대」는 예측이다.
- **AC-E2E-006 의 Given(점유된 포트)을 실제로 만들어 보지 않았다** — `E2E_FORCE_PORT` 는 아직 존재하지 않는 기제다.
- **`channel/src/gateway-client.ts` 와 `.github/workflows/` 는 이번에도 열지 않았다** — t25·t27 경계는 카드 기록과 정본 §7 인용에 기댄다.
- **정본의 다른 절(§1~§4·§6~§7)을 t6 관점에서 전수 대조하지 않았다** — §2 t6 행과 §5 만 읽었다. 다른 절에 t6 범위를 건드리는 문장이 더 있을 가능성은 배제하지 못한다.
