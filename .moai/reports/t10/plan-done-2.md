# 카드 `t10` 계획 감사 1회차 교정 대장 — `SPEC-CHANINJECT-001`

| 항목 | 값 |
|------|-----|
| 대상 | `.moai/reports/t10/plan-audit.md` — **FAIL, 종합 0.75** (Tier M 임계 0.80), 차단 8건 · 비차단 5건 |
| 트리 | `.claude/worktrees/t10`, 브랜치 `WT-injection-hardening`, HEAD `124b0f7` + 미커밋 작업 트리 |
| 단계 | plan 교정 (문서만. `channel/` 무변경) |
| 작성일 | 2026-08-28 |
| 다음 | 2회차 감사 — 감사 §10 이 «위 8건의 델타로 한정» 으로 범위를 정했다 |

---

## 0. 쉬운 말 요약

감사가 막아 세운 여덟 가지를 전부 고쳤습니다. 가장 중요한 것은 두 가지입니다. 첫째, **자기가 지키겠다고 한 것을 실제로는 재지 않던 수용 기준**을 옮겨 붙였습니다 — 봉투 속성(`meta`)이 그대로 남는지 재는 단언이 봉투 시퀀스가 하나도 없는 메시지에 붙어 있어서 아무것도 잡지 못했는데, 시퀀스가 실제로 들어 있는 기준으로 옮겼습니다. 둘째, **이 카드가 무효화하는 형제 기준이 셋이 아니라 넷**이라는 사실을 관련 문서 전체에 반영했습니다 — 넷째는 실패하는 것이 아니라 지워져 사라지기 때문에 테스트를 아무리 돌려도 보이지 않고, 그래서 위험합니다.

숫자도 다시 쟀습니다. 지난 보고서가 «걸어 세었다» 며 적은 파일별 수치가 인용한 명령의 출력과도 테스트 실측과도 맞지 않았는데, 이번에는 실제로 빌드하고 테스트를 돌려 얻은 값으로 바꿨고 원래 보고서에도 정정 표시를 남겼습니다. 실행 불가능하던 기준 코드 세 자리(없는 함수 이름, 없는 메서드 이름, 잘못 가정한 반환 모양)도 실제 테스트 하네스 원문을 읽어 고쳤습니다.

마지막으로 `moai spec lint` 는 발견 0건이고 테스트는 61건 전부 통과합니다(직접 실행 확인). 코드는 한 글자도 건드리지 않았습니다.

---

## 1. Claim (주장)

| # | 주장 |
|---|------|
| C1 | 차단 8건(F-01~F-08)을 전부 산출물에 반영했고, 각 정정에 감사 발견 번호를 본문에 적어 추적 가능하게 했다 |
| C2 | 비차단 5건(F-09~F-13)을 전부 처리했다 — F-09·F-11·F-12·F-13 은 정정, F-10 은 «리드 조치 항목» 으로 구조화 인계 |
| C3 | 파일별 테스트 수를 **이 트리에서 실행해** 실측했고, `spec.md` §3.5 와 `plan-done.md` §2 E4 를 그 값으로 정정했다 |
| C4 | 이 카드가 **무효화하는 형제 수용 기준은 4건**, **스위트가 빨개지는 것은 3건**이며, 두 수와 그 차이의 이유를 관련 문서에 갈라 적었다 |
| C5 | `AC-CHANINJECT-012` 를 **부분집합 + 대체 예외 + 하한** 형태로 다시 세웠고, 그 형태가 뒤 카드의 테스트 추가에도 썩지 않는 이유를 본문에 적었다 |
| C6 | `channel/` 아래를 한 글자도 바꾸지 않았다 |
| C7 | `moai spec lint` 발견 0건, `npm test -w channel` 61/61 통과 |

---

## 2. Evidence (증거 — 실행한 명령과 그 원문 출력)

### E1 — 트리 확인 (C6)

```
$ git rev-parse --show-toplevel && git rev-parse --short HEAD && git branch --show-current
/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t10
124b0f7
WT-injection-hardening
```

교정 전후로 `channel/` 은 빈 출력이다 — 소스·테스트 무변경. **변이 실험을 하나도 실행하지 않았으므로 복구할 대상도 없다.**

```
$ git status --short -- channel/
(빈 출력)
```

### E2 — 파일별 테스트 수 실측 (C3 · F-06)

F-06 이 요구한 재측정이다. 두 값을 각각 실행했다.

```
$ npm run build -w channel                     # exit 0
$ npm test -w channel -- --reporter=verbose    # exit 0, 로그: .moai/state/verify/t10-plan2/verbose.log
$ grep -c '✓' .moai/state/verify/t10-plan2/verbose.log
61
$ grep -c "✓ test/channel-server.test.ts >"   .moai/state/verify/t10-plan2/verbose.log
12
$ grep -c "✓ test/gateway-client.test.ts >"   .moai/state/verify/t10-plan2/verbose.log
16
$ grep -c "✓ test/index-wiring.test.ts >"     .moai/state/verify/t10-plan2/verbose.log
12
$ grep -c "✓ test/permission-relay.test.ts >" .moai/state/verify/t10-plan2/verbose.log
14
$ grep -c "✓ test/transport-auth.test.ts >"   .moai/state/verify/t10-plan2/verbose.log
7
```

```
$ grep -c '// AC-' channel/test/channel-server.test.ts channel/test/gateway-client.test.ts \
        channel/test/index-wiring.test.ts channel/test/permission-relay.test.ts \
        channel/test/transport-auth.test.ts
channel/test/channel-server.test.ts:12
channel/test/gateway-client.test.ts:14
channel/test/permission-relay.test.ts:15
channel/test/transport-auth.test.ts:8
channel/test/index-wiring.test.ts:11
```

| 파일 | `it(` 블록 (실측) | `// AC-` 마커 | `plan-done.md` 이 적었던 값 |
|------|------------------|--------------|---------------------------|
| `channel-server.test.ts` | **12** | 12 | 12 |
| `gateway-client.test.ts` | **16** | 14 | 14 |
| `index-wiring.test.ts` | **12** | 11 | 11 |
| `permission-relay.test.ts` | **14** | 15 | 14 ← 어느 쪽과도 불일치 |
| `transport-auth.test.ts` | **7** | 8 | 10 ← 어느 쪽과도 불일치 |
| **합계** | **61** | 60 | 61 |

**감사 §2 E8 의 판정이 맞다.** 제시됐던 열거는 인용한 명령(`grep -n '// AC-'`)의 출력도 아니고 스위트 실측도 아니었다. 파손을 세는 단위는 `it(` 블록이므로 **왼쪽 열이 정본**이며, `// AC-` 는 «어느 AC 를 재는가» 라벨이라 한 주석 아래 `it(` 이 여럿이거나 한 `it(` 위에 주석이 둘 붙을 수 있다 — 두 열이 다른 것 자체가 그 근거다.

### E3 — 무효화 4건 대 빨개짐 3건 (C4 · F-04)

빨개지는 3건은 **계획 감사 1회차가 실행으로 확인했다**(`plan-audit.md` §2 E3 — 네 표면을 소스에 적용하고 `3 failed | 58 passed (61)` 를 관측). 이 교정 패스는 그 변이를 **재실행하지 않았고**, 그 사실을 §4 Gaps 2번에 적는다.

넷째 자리는 실행으로 잡히지 않는다. 대상 원문을 직접 읽어 확인했다.

```
$ sed -n '236,250p' channel/test/transport-auth.test.ts
  // AC-CHANAUTH-010 — 전송 판정표 (9행, 계획 감사 M-01·M-02 확정분 포함)
  it('isTransportAllowed decides by scheme and host only', () => {
    const table: [string, boolean][] = [
      ['ws://127.0.0.1:3000/bot', true],
      ['ws://localhost:3000/bot', true],
      ['ws://[::1]:3000/bot', true],
      ['wss://example.com/bot', true],
      ['ws://example.com/bot', false],
      ['ws://10.0.0.5:3000/bot', false],
      ['wss://127.0.0.1:3000/bot', true],
      ['ws://127.0.0.1.evil.com/bot', false],
      ['not a url', false],
    ]
    expect(table.map(([u]) => [u, isTransportAllowed(u)])).toEqual(table)
  })
```

이 9행에는 **루프백 + 비 ws 스킴 행이 없다.** 그러므로 `REQ-CHANINJECT-013`(루프백 분기도 스킴을 본다)이 착지해도 9행의 기대값은 전부 그대로 옳고, 이 `it(` 는 **실패하지 않는다** — `AC-CHANINJECT-010` 이 그 자리를 12행 표로 대체하면서 **조용히 사라질 뿐이다.**

**따라서 이 카드가 무효화하는 형제 수용 기준은 4건, 빨개지는 것은 3건이다.** 스위트에서 사라지는 `it(` 이름은 넷이다.

```
documents the #번호 numbering and the since_id cursor in the tool description   ← channel-server.test.ts:124
history lines carry the #id cursor prefix                                        ← index-wiring.test.ts:198
empty history renders the Korean placeholder                                     ← index-wiring.test.ts:211
isTransportAllowed decides by scheme and host only                               ← transport-auth.test.ts:237
```

앞 셋은 실패한 뒤 교체되고, 넷째는 실패 없이 교체된다. **«대체되는 기준은 실행 증거가 원리적으로 닿지 못하는 사각» 이라는 것이 이 발견의 핵심이며, 그 사각을 메우도록 `AC-CHANINJECT-012` 를 다시 세웠다(§2.2).**

### E4 — 하네스 원문 대조 (F-02 · F-03)

기준 코드가 부르는 이름이 실제로 존재하는지 원문에서 확인했다.

```
$ grep -n "^function \|^const " channel/test/transport-auth.test.ts
34:function rogueGateway(opts: { welcome: boolean }) {
71:const attachWire = (gwOpts: { welcome: boolean }) => attachWireTo(rogueGateway(gwOpts))
99:const settle = () => new Promise<void>(r => setTimeout(r, 400))
110:function collectUnhandled() {
120:function spawnChild(args: string[], env: NodeJS.ProcessEnv) {
127:  return { proc: p, stderr: () => err, stdout: () => out }

$ sed -n '89p' channel/test/transport-auth.test.ts
async function waitFor(pred: () => boolean, label: string, ms = 3000): Promise<void> {
```

`stubGateway` 는 **없다**. `spawnChild` 의 반환 객체에 `exitCode` 필드는 **없고** `stdout` 은 **함수**다.

```
$ grep -n "onFrame" channel/test/index-wiring.test.ts
56:    onFrame: (h: (ws: WebSocket, m: any) => void) => hooks.push(h),
188:    stub.onFrame((ws, m) => {
200:    stub.onFrame((ws, m) => {
213:    stub.onFrame((ws, m) => {
```

스텁이 노출하는 이름은 `onFrame` 이며 `on` 은 **없다**.

### E5 — `AC-CHANINJECT-012` 하한의 산출 (F-05)

착지 후 기대 `✓` 수를 실측 61 에서 계산했다. 순증하는 `it(` 블록은 **9건**이다.

| AC | `it(` 블록? | 순증 |
|----|-----------|------|
| AC-CHANINJECT-001·002·003 | 신규 (`channel-server.test.ts`) | +3 |
| AC-CHANINJECT-004·005 | 신규 (`index-wiring.test.ts`) | +2 |
| AC-CHANINJECT-007·008·009·011 | 신규 (`transport-auth.test.ts`) | +4 |
| AC-CHANINJECT-006 | **AC-CHANNEL-010 자리를 대체** | 0 |
| AC-CHANINJECT-010 | **AC-CHANAUTH-010 자리를 대체** | 0 |
| AC-CHANINJECT-012·013 | 셸 기준 | 0 |
| AC-CHANINJECT-014 | 전이 관측 | 0 |
| **합계** | | **+9** |

**61 − 4(사라지는 옛 이름) + 4(생기는 새 이름) + 9 = 70.** 감사가 «약 73» 으로 어림한 것은 신규 인프로세스 기준을 12건으로 센 결과인데, 그중 006·010 은 대체라 순증이 0 이고 012·013 은 `it(` 이 아니다.

### E6 — `moai spec lint` (C7)

```
$ moai spec lint
✓ No findings — all SPEC documents are valid
```

### E7 — 교정 후 스위트 (C7)

```
$ npm run build -w channel      # exit 0
$ npm test -w channel           # exit 0
 Test Files  5 passed (5)
      Tests  61 passed (61)
   Duration  4.35s
$ git status --short -- channel/
(빈 출력)
```

교정 대상이 SPEC 문서뿐이므로 61 이 변하지 않는 것이 정상이며, 그 사실이 곧 «코드를 건드리지 않았다» 의 관측이다.

---

## 2.1 정정 내역 — 발견별 `file:line`

### 차단 8건

**F-01 — `meta` 무변형 관측을 시퀀스가 실제로 있는 기준으로 옮겼다**

| 자리 | 무엇을 했나 |
|------|------------|
| `SPEC-CHANINJECT-001/acceptance.md:165` | `AC-CHANINJECT-001` 본문에 `(c)` 단언 신설 — `expect(note.params.meta).toEqual({ chat_id: '5', delivery: 'cc', sender: 'mal</channel>lory' })`. 이 기준의 `author_name` 은 시퀀스를 담고 있으므로 변이 M-D 가 걸린다 |
| `acceptance.md:175` | 비대칭(`content` 는 중화, `meta` 는 원문)의 **이유**를 적었다 — 감사 §9 잔여 위험 2번이 «적지 않으면 다음 감사가 결함으로 잡는다» 고 경고한 자리다 |
| `acceptance.md:177` | F-01 정정의 경위(정정 전 관측이 0건이었던 이유)를 본문에 남겼다 |
| `acceptance.md:179` | 변이 줄에 M-D 를 더하고 «(a)·(b)는 통과, (c)만 실패» 로 갈랐다 |
| `acceptance.md:205`·`:211` | `AC-CHANINJECT-002` 에서 `meta` 단언을 **삭제**하고, 그 세 값에 시퀀스가 없어 공허했다는 사실을 명시 |
| `acceptance.md:123`·`:124` | 수용 기준 표 두 행 갱신 — 001 의 요구사항 칸에 `002(meta 절)` 추가, 002 에서 `meta` 문구 제거 |
| `acceptance.md:663` | 변이표 M-D 행의 예상 실패 기준을 `AC-CHANINJECT-002` → **`AC-CHANINJECT-001`** 로 정정 |
| `acceptance.md:676` | 「되돌려서는 안 된다」 잠금 목록에 M-D 를 **남기되 근거를 바꿨다** — 정정 전에는 «틀린 예측을 잠그는» 잘못된 잠금이었고, 정정 후에는 AC-001 (c)가 실제로 잡으므로 «옳은 예측을 지키는» 잠금이다 |

**F-02 — `AC-CHANINJECT-009` 를 실제 하네스에 맞춰 다시 썼다**

`acceptance.md:409-436`(코드 블록) + `:439-452`(정정 내역 표와 한계). 네 자리 전부:

| 정정 전 | 정정 후 |
|---|---|
| `await stubGateway()` | `rogueGateway({ welcome: true })` — 존재하는 헬퍼, 동기 |
| `child.stdout.on('data', …)` | `bad.stdout()` · `bad.stderr()` — 반환값은 누적 문자열을 주는 **함수** |
| `expect(child.exitCode).toBeNull()` | `expect(bad.proc.exitCode).toBeNull()` — 반환 객체에 `exitCode` 가 없어 정정 전 형태는 **정상 구현에서도 실패**했다 |
| `expect(stub.connections()).toBe(0)` (공허) | 같은 스텁을 겨냥한 정상 갈래 (나)를 함께 띄우고 `toBe(1)` — 스텁이 접속을 실제로 받는다는 것과 (가)가 아무것도 열지 않았다는 것이 한 수치로 성립 |

`:452` 에 **남는 한계**를 적었다 — 해석되지 않는 주소에는 겨냥할 호스트가 없으므로 «접속 시도를 하지 않았다» 는 원리적으로 «(나)의 접속만 세어진다» 로만 관측된다. 스킴 거부 갈래의 «접속 0건» 은 형제 `AC-CHANAUTH-011` (a)가 소유한다.

**F-03 — `stub.on(` → `stub.onFrame(`**

`acceptance.md:252`(AC-004) · `:291`·`:306`(AC-005 의 `stub`·`s2` 두 자리). 감사는 두 자리를 지목했으나 실제로는 **세 자리**였다 — `AC-CHANINJECT-005` 가 빈 이력 갈래에서 두 번째 스텁 `s2` 를 쓴다. 재발 방지로 `acceptance.md:63-70` 에 **기존 하네스 시그니처 표**를 신설했다.

**F-04 — 형제 `AC-CHANAUTH-010` 을 함께 개정하고, «무효화 4 / 빨개짐 3» 을 갈라 적었다**

| 자리 | 무엇을 했나 |
|------|------------|
| `SPEC-CHANAUTH-001/acceptance.md:207` | 수용 기준 표 행 «**9행**» → «**12행** … v0.4.0 개정, 카드 `t10`» |
| `SPEC-CHANAUTH-001/acceptance.md:546-562` | 본문 코드를 새 `it()` 이름(`decides transport by scheme and host in every branch, loopback included`)과 12행 표로 교체 |
| `SPEC-CHANAUTH-001/acceptance.md:568-572` | 개정 주석 — «이 기준은 «대체» 되고 «실패» 하지 않는다», 그래서 문서를 함께 고쳐야 한다는 근거 |
| `SPEC-CHANAUTH-001/spec.md:25` | HISTORY 0.4.0 행에 **④ 형제 수용 기준 1건 개정** 추가 |
| `SPEC-CHANAUTH-001/spec.md:250` · `plan.md:120` · `progress.md:89` | 잔여 «9행» 서술 세 자리에 v0.4.0 시점 표시 |
| `SPEC-CHANINJECT-001/spec.md:188`·`:211-219` | §3.5 에 «대체되어 사라지는 기준 1건» 소절 신설 + 두 수를 갈라 적음 |
| `SPEC-CHANINJECT-001/spec.md:223` | 합계 문장을 «61 = 3(빨개짐) + 1(대체) + 57(무영향)» 로 |
| `SPEC-CHANINJECT-001/plan.md:140`·`:141` | M3 에 단계 3(대체 전 통과 원문 기록)과 **3b(문서 개정 착지)** 추가 |
| `SPEC-CHANINJECT-001/plan.md:95` | §E 위험표에 «대체는 실행으로 잡히지 않는다» 행 신설 |
| `SPEC-CHANINJECT-001/plan.md:160` | §G 자기 검증에 «두 수가 갈라 기록되었는지» 행 신설 |
| `SPEC-CHANINJECT-001/acceptance.md:42`·`:619`·`:682` | 검증 원칙 5 · AC-014 · 완료 조건에서 각각 갈라 적음 |
| `SPEC-CHANINJECT-001/progress.md:45-59` | `sibling_breakage` 를 `total/red/replaced/invalidated/unaffected` + `red_items`/`replaced_items` 로 재구조화 |

**F-05 — `AC-CHANINJECT-012` 를 부분집합 + 대체 예외 + 하한으로 다시 세웠다**

`acceptance.md:522-583` 전면 재작성. 형태와 그 선택 이유는 §2.2 에 따로 적는다.

**F-06 — 파일별 수치를 실측으로 교체하고 귀속을 바꿨다**

| 자리 | 무엇을 했나 |
|------|------------|
| `SPEC-CHANINJECT-001/spec.md:175-186` | «세는 방법» 문단을 실측 서술로 바꾸고 **실측 표**(12/16/12/14/7 + `// AC-` 참고 열)를 신설. 두 열이 다른 이유를 적었다 |
| `SPEC-CHANINJECT-001/spec.md:207` | «`permission-relay.test.ts` 전 13건» → «전 **14건** (실측)» |
| `SPEC-CHANINJECT-001/spec.md:223` | 합계 문장 정정 |
| `.moai/reports/t10/plan-done.md` §2 E4 | **원문을 지우지 않고** 정정 블록을 앞에 붙였다 — 두 명령의 실제 출력을 원문으로 싣고, 원래 서술을 «(원래 서술 — 정정 대상)» 으로 표시 |
| `plan-done.md` §2 E4 말미 | «61 = 3 + 58» 에 정정 주 추가 — «61 = 3 + 1 + 57» |
| `plan-done.md` §3 | baseline 귀속을 «인용» → «이 트리 실측» 으로 바꾸는 정정 주 추가 |

**F-07 — 변이 M-H·M-I 의 예상 실패 집합에 `(개정된) AC-CHANWIRE-007` 추가**

`acceptance.md:667`·`:668`. 근거는 개정된 그 기준이 `cursor: 1` 을 단언한다는 것(`SPEC-CHANWIRE-001/acceptance.md:332`) — 커서를 오염시키는 M-H 도, 죽이는 M-I 도 그 자리를 함께 어긋나게 한다. `:676` 잠금 주에도 그 사실을 적었다.

**F-08 — 동작 변경 문장을 구현자·운영자가 읽는 자리에 넣었다**

| 자리 | 무엇을 했나 |
|------|------------|
| `SPEC-CHANINJECT-001/spec.md:331` | `REQ-CHANINJECT-013` 본문에 «`http://127.0.0.1` 로 구성한 기존 봇은 정정 후 접속하지 않고 stderr 한 줄로 사유를 알린다» + 운영자가 취할 조치 |
| `SPEC-CHANINJECT-001/spec.md:333` | «보안 영향 없음» 문장을 «대가는 보안이 아니라 구성 호환성이며 그 대가를 알고 치른다» 로 다시 씀 |
| `SPEC-CHANINJECT-001/spec.md:408-410` | §5 `CHANGELOG` 이연 항목에 **sync 가 반드시 적을 두 문언**을 리터럴로 못 박음(구성 파손 + 도구 결과 형식 변경) |
| `SPEC-CHANINJECT-001/plan.md:97` | §E 위험표에 «`http://127.0.0.1` 구성이 끊긴다» 행 신설 |

### 비차단 5건 — 전건 처리, 각각 사유 기록

| 발견 | 처리 | 자리와 사유 |
|------|------|------------|
| **F-09** — 완료된 SPEC 이 미이행 관측에 의존 | **정정** | `SPEC-CHANAUTH-001/spec.md:25` HISTORY 0.4.0 에 ⑤ 신설 — «이 SPEC 은 `SPEC-CHANINJECT-001` 착지 전까지 `REQ-CHANAUTH-004`·`008`·`010`·`011` 네 조항의 회귀 관측을 갖지 않는다» 를 명시. `status` 는 바꾸지 않았다 — 이행된 것은 **구현**이고(감사 실측으로 구현 자체는 옳다), 없는 것은 그것을 지키는 **회귀 기준**이며 그 책임은 이 카드에 있다. 다만 그 상태가 그 사이 실재하므로 감추지 않고 적었다 |
| **F-10** — `t15` 카드 본문과 인계 범위 불일치 | **인계 (SPEC 이 닫을 수 없음)** | `SPEC-CHANINJECT-001/spec.md:384` 에 불일치 사실과 «리드 조치» 임을 명시. `progress.md` §E.1 에 `lead_action_required` 블록 신설(무엇이 다른지·왜 SPEC 이 닫을 수 없는지·소유자). **지시대로 `moai todo` 를 실행하지 않았다** |
| **F-11** — `spec.md:174` 가 카드 본문에 관해 거짓 | **정정** | `spec.md:136` — «카드 본문은 어떤 SPEC 도 지목하지 않았다» + 실제 판정 근거(`SPEC-CHANCLIENT-001/spec.md:208` 의 Out of Scope 헤더 + `REQ-CHANWIRE-012` + 코드 위치)로 교체. 감사 §4 F-11 이 제시한 문안을 따랐고, 정정 뒤 중복이 된 뒷문장 한 절을 함께 정리했다 |
| **F-12** — `REQ-CHANINJECT-014` 가 처방 두 개를 섞음 | **정정** | `spec.md:336` — 행동 조항 하나(«어떤 입력도 만나지 못하는 항목을 포함해서는 안 된다»)로 좁히고, 문서 정정 지시는 `spec.md:361` §4.5 표에 **F-A7 (문서 절반)** 행으로 옮겼다. 소스 리터럴(`'::1'`) 지목은 «오늘 이 조항에 걸리는 유일한 항목» 이라는 근거 문단으로 강등 |
| **F-13** — `AC-CHANINJECT-013` 표 행과 본문의 조건 수 불일치 | **정정** | `acceptance.md:125` 표 행을 본문과 같은 **다섯 조건**으로 열거(누락됐던 `package.json` diff 조건 포함) |

---

## 2.2 `AC-CHANINJECT-012` 에 고른 형태와 그 근거

감사 §9 잔여 위험 2번이 이 자리의 긴장을 정확히 지목했다 — **정확 수치는 뒤 카드가 테스트 하나만 더해도 썩고, 자연스러운 형태인 «옛 이름 집합이 새 집합의 부분집합» 은 이 카드가 셋(실제로는 넷)을 대체한다는 사실과 충돌한다.** 그 긴장을 덮지 않고 형태로 풀었다.

**고른 형태: 부분집합 조건 + 대체 예외 리터럴 + 하한.** 네 조건이다(`acceptance.md:560-570`).

1. 종료 코드 `0`
2. **부분집합** — 개정 전 이름 61개에서 **대체 예외 4건을 뺀 57개**가 전부 새 집합에 있다 (`comm -23` 출력이 비어야 한다)
3. **대체** — 예외 4건의 **옛** 이름이 새 집합에 0건이고, 새 이름 넷이 전부 있다
4. **하한** — `✓` 줄 수가 **70 이상** (산출식 `61 − 4 + 4 + 9`, §2 E5)

**왜 이 형태가 뒤 카드의 테스트 추가에 썩지 않는가.** 조건 2 는 **한 방향의 포함 관계만** 본다 — 옛 집합이 새 집합 안에 있는가. 뒤 카드가 테스트를 더하면 새 집합이 커질 뿐이고, 커진 집합은 여전히 옛 집합을 포함하므로 판정이 뒤집히지 않는다. 조건 4 를 «정확히 70» 이 아니라 «70 이상» 으로 둔 것도 같은 이유다 — 정확 수치는 다음 카드에게 «이 숫자를 올려라» 라는 잡일을 남기고, 그 잡일은 결국 «임계를 낮춰 초록을 만든다» 로 끝난다.

**그런데 하한만 두면 F-05 의 구멍이 그대로 돌아온다** — 임계 61 에 실제 70 이면 여유 9건만큼 삭제해도 통과했던 것이 그 구멍이었다. **그래서 삭제 탐지를 수치가 아니라 조건 2 에 맡겼다.** 조건 2 는 **이름 단위**라 여유가 없다: 형제 기준이 하나라도 사라지면 그 이름이 `comm` 출력에 뜨고, 뒤에 몇 건이 새로 더해졌든 그 사실이 가려지지 않는다. 조건 4 의 하한은 보조이며, 착지 시점에 여유를 0 으로 만들어 «이 카드가 신규 기준을 실제로 다 넣었는가» 를 함께 잰다.

**대체 예외 4건을 리터럴로 못 박았다** — 이것이 부분집합 조건에 뚫는 유일한 구멍이므로, 늘어나면 «기준을 지우고 예외 목록에 이름을 적는» 우회가 된다.

```
documents the #번호 numbering and the since_id cursor in the tool description
history lines carry the #id cursor prefix
empty history renders the Korean placeholder
isTransportAllowed decides by scheme and host only
```

**넷째가 특히 위험하다는 사실을 본문에 적었다** — 앞 셋은 실패한 뒤 교체되지만 넷째는 실패 없이 사라지므로, 조건 3(옛 이름 0건 + 새 이름 존재)이 그 소멸을 잡는 유일한 자리다.

**감사 §10 권고와 다른 점을 밝힌다.** 감사는 «조건 2 를 정확 수치로» 를 권고했다. 정확 수치가 썩는다는 것은 같은 감사의 §9 가 스스로 경고한 바이므로 **하한 + 부분집합**으로 바꾸었고, 그 이유를 `acceptance.md:569-571` 에 적었다. 판정 강도는 낮아지지 않는다 — 삭제 탐지는 수치보다 이름 대조가 더 엄격하다.

**좌변을 뜨는 단계를 계획에 배치했다.** 개정 전 이름 집합은 `plan.md` M1 **단계 0b** 에서 `.moai/state/verify/t10-run/names-before.txt` 로 뜨고 61줄임을 확인한다. 그 파일이 없으면 AC-CHANINJECT-012 는 통과가 아니라 **실패**다(`plan.md:113`).

---

## 3. Baseline-attribution (baseline 귀속)

모든 수치는 **이 트리 · 이번 실행**에서 얻었다. 트리 `.claude/worktrees/t10`, HEAD `124b0f7` + 미커밋 작업 트리, 브랜치 `WT-injection-hardening`.

- **파일별 테스트 수 12/16/12/14/7 · 합계 61** — `npm run build -w channel && npm test -w channel -- --reporter=verbose` 를 이 트리에서 실행해 관측했다. 로그 `.moai/state/verify/t10-plan2/verbose.log`. 인용이 아니다.
- **`// AC-` 마커 수 12/14/11/15/8 · 합계 60** — `grep -c '// AC-'` 를 이 트리에서 실행해 얻었다.
- **하네스 시그니처** (`rogueGateway`·`spawnChild` 반환·`waitFor`·`settle`·`onFrame`) — `channel/test/transport-auth.test.ts:34`·`:89`·`:99`·`:120-128` 과 `index-wiring.test.ts:56` 을 직접 읽었다.
- **`AC-CHANAUTH-010` 의 9행 표 원문과 그 행 구성** — `channel/test/transport-auth.test.ts:236-250` 을 직접 읽었다. «루프백 + 비 ws 스킴 행이 없다» 는 판정은 그 원문에서 도출했다.
- **사라지는 `it(` 이름 4개** — 네 자리의 `it('…')` 원문을 직접 읽어 옮겼다.
- **`AC-CHANWIRE-007` 의 `cursor: 1` 단언** — `.moai/specs/SPEC-CHANWIRE-001/acceptance.md:332` 를 직접 읽었다.
- **`moai spec lint` · 교정 후 스위트 61/61 · `git status --short -- channel/` 빈 출력** — 이 시점에 실행했다.
- **빨개지는 3건** — `.moai/reports/t10/plan-audit.md` §2 E3 에서 **인용**했다. 이 패스가 변이를 재실행하지 않았다.
- **감사 발견의 내용·심각도** — `plan-audit.md` 에서 인용했다.

---

## 4. Gaps (미검증 — 전건 명시)

1. **변이 15종(M-A~M-O)을 하나도 실행하지 않았다.** 겨냥하는 신규 기준이 아직 코드로 존재하지 않아 적용할 대상이 없다. F-01 의 정정(«M-D 가 AC-001 (c)를 실패시킨다»)도 **소스 대조로 도출한 예측**이지 실행 관측이 아니다. 근거의 강도는 높다 — AC-001 의 `author_name` 이 `mal</channel>lory` 이고 §2 의 중화 규칙이 그 시퀀스를 바꾼다는 것은 문자열 검사로 확정적이다 — 그러나 실행은 아니다.
2. **빨개지는 3건을 이 패스가 재실행하지 않았다.** 감사 §2 E3 의 관측을 인용했다. 감사가 적용한 네 표면 구현은 «감사가 이해한 대로» 이므로, run 단계의 실제 구현이 다르면 다른 기준이 걸릴 수 있다.
3. **정정한 AC 코드를 실제 테스트 파일에 넣어 컴파일·실행하지 않았다.** `rogueGateway`·`bad.proc.exitCode`·`stub.onFrame` 이 존재한다는 것은 원문으로 확인했으나, 그 코드를 vitest 안에서 돌려 초록을 본 것은 아니다. 특히 `AC-CHANINJECT-009` 의 대조 갈래 (나)가 `waitFor(() => stub.connections() === 1, …)` 로 기본 3초 안에 붙는지는 실행으로 확인하지 않았다.
4. **`AC-CHANINJECT-012` 의 하한 70 은 산출식으로 얻은 예측이다.** 실측은 run 단계 착지 후에만 가능하다. 산출식의 각 항(61·4·4·9)은 각각 실측 또는 원문 대조로 얻었으나, 합이 실제 스위트와 같은지는 확인하지 않았다.
5. **`AC-CHANINJECT-012` 의 셸 파이프라인(`grep -oE … | sed … | sort`, `comm -23`)을 실행해 보지 않았다.** 개정 전 이름 집합을 실제로 떠서 61줄이 나오는지 확인하지 않았다 — 그 단계는 `plan.md` M1 단계 0b 에 배치했다.
6. **타입 검사(`npm run typecheck -w channel`)와 커버리지를 실행하지 않았다.** 빌드와 테스트만 돌렸다.
7. **`SPEC-CHANNEL-001`·`SPEC-CHANWIRE-001`·`SPEC-CHANCLIENT-001` 의 개정 전문을 다시 읽지 않았다.** 감사 §8-8 이 남긴 같은 gap 이며, 이 패스도 F-07 이 요구한 `AC-CHANWIRE-007` 한 자리만 확인했다.
8. **`.moai/reports/t4/`·`t9/` 감사 보고서 원문을 읽지 않았다.** 인용의 충실성을 대조하지 않았다.
9. **`plan-done.md` 의 나머지 절을 정정하지 않았다.** F-06 이 지목한 §2 E4 와 §3 두 자리만 정정 표시했다. §5 의 «누군가 그렇게 쓰고 있었다면 봇이 붙지 않는다» 서술은 그대로 두었다 — 그 문장 자체는 참이고, F-08 은 그것을 SPEC 으로 **옮기라**는 요구였지 보고서에서 지우라는 요구가 아니었다.
10. **카드 `t15`·`t11` 의 큐 본문을 갱신하지 않았다.** 지시대로 `moai todo` 를 실행하지 않았고, F-10 을 인계 항목으로만 기록했다.
11. **커밋하지 않았다.** 작업 트리를 더럽힌 채 남긴다.

---

## 5. Residual-risk (잔여 위험)

- **F-01 정정이 만든 비대칭이 다음 감사에 다시 걸릴 수 있다.** `AC-CHANINJECT-001` 한 기준 안에서 같은 이름이 `content` 에서는 중화되고 `meta` 에서는 원문이다. 그 이유를 `acceptance.md:175` 에 적었으나, 읽는 사람에게는 여전히 모순처럼 보일 수 있다.
- **`AC-CHANINJECT-012` 의 셸 파이프라인이 조용히 좌변을 줄일 수 있다.** `grep -oE '✓ test/[a-z-]+\.test\.ts > .*'` 는 파일 이름이 소문자·하이픈이라는 가정에 기댄다. 새 테스트 파일 이름이 그 패턴을 벗어나면 이름 집합이 줄고, **그 감소가 부분집합 조건을 거짓 실패시키는 것이 아니라 거짓 통과시킬 수 있다**(좌변이 함께 줄기 때문). M1 단계 0b 의 «61줄» 확인이 그 자리를 막는 유일한 방어다.
- **대체 예외 4건 목록이 늘어나는 압력.** run 단계에서 형제 기준 하나가 예상 밖으로 사라지면, 그것을 예외에 더하는 것이 가장 값싼 해결이 된다. 문서가 «예외를 늘리는 것은 우회다» 라고 적었으나 그 문장은 규범이지 기계적 차단이 아니다.
- **`AC-CHANINJECT-009` 의 대조 갈래가 시간에 기댄다.** 자식 프로세스 둘을 동시에 띄우고 `waitFor` 로 접속을 기다린다. 부하가 높은 기계에서는 3초 안에 붙지 않아 **결함이 아닌 사유로** 실패할 수 있다. 형제 `AC-CHANAUTH-011` (b)가 같은 형태를 이미 쓰고 있으므로 새로 들이는 위험은 아니다.
- **`SPEC-CHANAUTH-001` 을 이 카드가 두 번째로 실질 개정했다.** 감사 §9 가 «세 번째부터는 «완료» 라벨이 의미를 잃는다» 고 경고한 자리이며, 이번 교정이 그 두 번째다.
- **AC 14 · REQ 15 로 Tier M 상한(16/16)에 근접해 있다.** 이 교정은 기준을 신설하지 않고 **기존 기준을 강화**해 풀었으므로 수는 그대로다. 다음 교정이 신설을 요구하면 상한을 넘는다.
- **브랜치 미푸시 — 이 워크트리가 유일 사본이다.** 원격 CI 가 없어 이 보고의 실행 증거를 독립 환경에서 재현할 수단이 없다.
- **`t4` 재감사는 이 카드로 PASS 가 되지 않는다.** F-01 잔여(`t15`)와 F-14(`t11`)가 Security must-pass 에 남는다.

---

## 6. 이 패스가 지킨 규칙

- `channel/src`·`channel/test` 무변경 (§2 E1·E7 원문). 변이 실험을 하지 않았으므로 복구할 대상이 없다.
- 커밋·푸시·브랜치 변경 없음. 작업 트리를 더럽힌 채 남긴다.
- `progress.md` 의 `§E.2`·`§E.3`·`§E.4` 를 편집하지 않았다. 고친 것은 머리 표와 `§E.1`(manager-spec 소유)뿐이다.
- `moai todo` 를 실행하지 않았다 — F-10 은 리드 조치 항목으로만 기록했다.
- `plan-done.md` 를 조용히 고치지 않았다 — 원래 서술을 남기고 정정 블록을 병기했으며, 경위는 이 보고 §2 E2 와 §2.1 F-06 에 적었다.
- 실행으로 확인하지 못한 것은 §4 에 전건 분리했고, 본문에서도 «예측» 또는 «인용» 으로 표시했다.
