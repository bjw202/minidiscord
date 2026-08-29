# 카드 `t10` plan 단계 완료 보고 — 주입 방어 SPEC 작성과 형제 개정 네 건

| 항목 | 값 |
|------|-----|
| 카드 | `t10` — 감사 F-02·F-03·F-04(주입 부류, High × 3) + 카드 `t9` 이월 여덟 건 |
| 신규 SPEC | `SPEC-CHANINJECT-001` v0.1.0 (`status: draft`, Tier M, REQ 15 / AC 14) |
| 트리 | `.claude/worktrees/t10`, 브랜치 `WT-injection-hardening`, HEAD `124b0f7` |
| 단계 | plan (문서만. `channel/src` 무변경) |
| 작성일 | 2026-08-28 |

---

## 1. Claim (주장)

| # | 주장 |
|---|------|
| C1 | 작업 디렉터리가 지시받은 워크트리이며, `channel/src` 와 `channel/test` 에 아무 변경도 만들지 않았다 |
| C2 | `SPEC-CHANINJECT-001` 세 문서(`spec.md`·`plan.md`·`acceptance.md`)와 `progress.md` 를 작성했고, 프론트매터가 스키마를 만족한다 |
| C3 | SPEC ID `SPEC-CHANINJECT-001` 이 정규 패턴을 만족한다 |
| C4 | 형제 회귀 기준 파손은 **3건**이고, 나머지 **58건**은 무영향이다. 총 61건을 걸어 세었다 |
| C5 | 형제 SPEC **네 건**을 개정했다 — `SPEC-CHANNEL-001` v0.3.0 · `SPEC-CHANWIRE-001` v0.4.0 · `SPEC-CHANCLIENT-001` v0.5.0 · `SPEC-CHANAUTH-001` v0.4.0 |
| C6 | 카드 `t9` 이월 여덟 건이 전부 REQ/AC 또는 명시적 문서 정정으로 착지했다 |
| C7 | 모든 AC 가 인프로세스 회귀 단언을 갖고(예외 1건은 본문에 명시), 변이 15종이 방어 하나씩을 겨냥한다 |
| C8 | `moai spec lint` 가 발견 0건이다 |
| C9 | 감사 §5.4 의 «호스트 봉투 처리 미확정» 을 해소하지 않고 명시적 가정으로 인계했다 |

---

## 2. Evidence (증거 — 실행한 명령과 그 원문 출력)

### E1 — 트리 확인 (C1)

```
$ git rev-parse --show-toplevel && git branch --show-current && git rev-parse --short HEAD
/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t10
WT-injection-hardening
124b0f7
```

```
$ git status --porcelain -- .moai/specs .moai/reports
 M .moai/specs/SPEC-CHANAUTH-001/acceptance.md
 M .moai/specs/SPEC-CHANAUTH-001/plan.md
 M .moai/specs/SPEC-CHANAUTH-001/progress.md
 M .moai/specs/SPEC-CHANAUTH-001/spec.md
 M .moai/specs/SPEC-CHANCLIENT-001/spec.md
 M .moai/specs/SPEC-CHANNEL-001/acceptance.md
 M .moai/specs/SPEC-CHANNEL-001/spec.md
 M .moai/specs/SPEC-CHANWIRE-001/acceptance.md
 M .moai/specs/SPEC-CHANWIRE-001/plan.md
 M .moai/specs/SPEC-CHANWIRE-001/spec.md
?? .moai/specs/SPEC-CHANINJECT-001/
```

`channel/` 항목이 한 줄도 없다 — 소스·테스트 무변경.

### E2 — SPEC ID 정규 검사 (C3)

```
$ ID="SPEC-CHANINJECT-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### E3 — `moai spec lint` (C2 · C8)

```
$ moai spec lint
✓ No findings — all SPEC documents are valid
```

### E4 — 형제 파손을 센 방법과 원문 (C4)

세는 단위를 «SPEC 문서의 AC 번호» 가 아니라 **`channel/test/` 의 `it(` 블록**으로 잡았다. 카드 `t9` 가 «문서는 파손 1건을 인지했는데 실제로는 11건이 깨진» 사례를 남겼고, 그 사례의 원인이 «문서를 세었다» 였기 때문이다.

**① AC ↔ 테스트 대응표를 파일에서 직접 뽑았다.**

```
$ grep -n '// AC-' channel/test/channel-server.test.ts channel/test/index-wiring.test.ts \
        channel/test/gateway-client.test.ts channel/test/permission-relay.test.ts \
        channel/test/transport-auth.test.ts
```

> **[정정 — 계획 감사 F-06, `.moai/reports/t10/plan-audit.md` §2 E8]** 이 자리에 원래 적혀 있던 파일별 수치(`channel-server` 12 · `index-wiring` 11 · `gateway-client` 14 · `permission-relay` 14 · `transport-auth` 10, 합 61)는 **인용한 명령의 출력도 아니었고 스위트 실측도 아니었다.** 아래는 두 값을 각각 이 트리에서 실행해 얻은 원문이다. 정정의 경위는 `.moai/reports/t10/plan-done-2.md` §2 E2 에 있다.
>
> ```
> $ grep -c '// AC-' channel/test/channel-server.test.ts channel/test/gateway-client.test.ts \
>         channel/test/index-wiring.test.ts channel/test/permission-relay.test.ts \
>         channel/test/transport-auth.test.ts
> channel/test/channel-server.test.ts:12
> channel/test/gateway-client.test.ts:14
> channel/test/index-wiring.test.ts:11
> channel/test/permission-relay.test.ts:15
> channel/test/transport-auth.test.ts:8
> (합계 60)
> ```
>
> ```
> $ npm run build -w channel && npm test -w channel -- --reporter=verbose
> channel-server 12 · gateway-client 16 · index-wiring 12 · permission-relay 14 · transport-auth 7   (합계 61)
> ```
>
> **파손을 세는 단위는 `it(` 블록이므로 뒤의 값이 이 SPEC 의 근거다.** `// AC-` 는 «어느 AC 를 재는가» 라벨이지 테스트 수가 아니다. 총계 61 은 두 방식 중 실측 쪽에서 성립하며, 아래 문장이 «인용해 일치를 확인했다» 고 적은 것은 정정 후 **이 트리 실측**으로 대체됐다.

(원래 서술 — 정정 대상) 출력 61행(전문 생략 없이 확인). 파일별 AC 대응: `channel-server.test.ts` 12건 · `index-wiring.test.ts` 11건 · `gateway-client.test.ts` 14건 · `permission-relay.test.ts` 14건 · `transport-auth.test.ts` 10건. 합계는 `SPEC-CHANAUTH-001/progress.md` §E.4 의 `tests: "5 files / 61 tests passed"` 와 일치한다.

**② 이 SPEC 이 바꾸는 네 표면과 대조했다.** (S1) `pushChatMessage` 의 `params.content` · (S2) `INSTRUCTIONS` · (S3) `fetch_history` 도구·파라미터 설명 · (S4) `index.ts` 의 이력 렌더링.

```
$ grep -n 'INSTRUCTIONS\|instructions' channel/test/*.ts
channel/test/channel-server.test.ts:191:  // AC-CHANNEL-005 — initialize 응답의 instructions (인프로세스 회귀 짝)

$ grep -n 'history\|#1 \|기록 없음' channel/test/*.ts        # (관련 행만 발췌)
channel/test/channel-server.test.ts:128:    expect(d).toContain('#번호')
channel/test/index-wiring.test.ts:207:    expect((res.content as any[])[0].text).toBe('#1 [2026-08-01] alice: 과거')
channel/test/index-wiring.test.ts:217:    expect((res.content as any[])[0].text).toBe('(기록 없음)')
channel/test/gateway-client.test.ts:246:    expect(await p1).toEqual({ type: 'history_response', rid: rids[0], messages: [{ id: 1 }] })
channel/test/transport-auth.test.ts:178:    stub.push({ type: 'history_response', rid: rid(), messages: [poisoned] })
```

**깨지는 3건** (전부 `toBe`/`toContain` 으로 옛 계약을 리터럴로 못 박은 자리):

| 위치 | 기준 | 단언 원문 |
|------|------|-----------|
| `channel/test/channel-server.test.ts:128` | AC-CHANNEL-010 | `expect(d).toContain('#번호')` |
| `channel/test/index-wiring.test.ts:207` | AC-CHANWIRE-007 | `toBe('#1 [2026-08-01] alice: 과거')` |
| `channel/test/index-wiring.test.ts:217` | AC-CHANWIRE-008 | `toBe('(기록 없음)')` |

**깨지지 않는 58건** — 근거를 표면별로 원문으로 확인했다.

- **S1 (`content`)**: 중화를 «봉투 시퀀스 부분 문자열» 로 좁혔으므로, 시퀀스가 없는 본문은 글자 그대로 남는다. 가장 엄격한 형제 단언이 `transport-auth.test.ts:162` 의 `expect(notes[0].params.content).toBe('[alice] 안녕')` 인데, 이 문자열에 시퀀스가 없다 — 통과. `AC-CHANNEL-013`(`toContain('alice')`·`toContain('봐줘')`·`toContain('/data/uploads/x.png')`)·`AC-CHANNEL-014`·`AC-CHANWIRE-001·002` 도 같은 이유.
- **S2 (`INSTRUCTIONS`)**: `AC-CHANNEL-005`(b)는 `toContain` 6건이고, 이 개정은 문장을 **더할** 뿐 지우지 않는다. (a) 셸 관측의 `need` 배열도 기존 9개가 그대로 남고 2개가 늘 뿐이다.
- **S3**: `#번호` 를 단언하는 곳은 `channel-server.test.ts:128` **한 곳뿐**이다(위 grep 원문). `AC-CHANNEL-009`(스키마 키 이름)·`AC-CHANNEL-011`(`toBe('H:41:5')`, 하네스 스텁 반환값)은 설명 문자열을 보지 않는다.
- **S4**: 렌더링 문자열을 단언하는 곳은 `index-wiring.test.ts:207`·`:217` **두 곳뿐**이다. `gateway-client.test.ts` 의 이력 3건(`AC-CHANCLIENT-007·008·010`)은 `history_response` **프레임 객체**를 `toEqual` 하고(위 grep `:246` 원문), `transport-auth.test.ts:190` 의 `AC-CHANAUTH-003` 은 `(await p).messages).toEqual([])` 로 프레임을 잰다 — 둘 다 렌더링 이전 층.
- `permission-relay.test.ts` **14건**(실측)은 네 표면 어느 것도 스치지 않는다.

**61 = 3 + 58.** — **[정정 — 계획 감사 F-04]** 이 등식은 «빨개지는 것 3건» 만 센 것이다. 이 카드가 **무효화하는** 형제 수용 기준은 **4건**이며, 넷째 `AC-CHANAUTH-010` 은 12행 표로 **대체되어 사라지므로** 실행으로는 빨개지지 않는다. 정정된 셈은 **61 = 3(빨개짐) + 1(대체로 사라짐) + 57(무영향)** 이다. 근거는 `plan-done-2.md` §2 E3.

### E5 — 이 트리에서 직접 실행한 사실 확인 (C7 · C9)

```
$ node -e "console.log(JSON.stringify([new URL('ws://[::1]:3000/bot').hostname, new URL('http://127.0.0.1:3000/bot').protocol, new URL('ws://127.0.0.1.evil.com/bot').hostname]))"
["[::1]","http:","127.0.0.1.evil.com"]
```

- 첫 값이 **F-A7 을 이 트리에서 재확인**한다 — `URL.hostname` 이 IPv6 를 대괄호째 돌려주므로 맨 `'::1'` 은 도달 불가한 사문이다.
- 둘째 값이 **F-A6 을 재확인**한다 — 루프백 분기가 스킴을 보지 않으면 `http://127.0.0.1` 이 통과한다.

```
$ node -e "console.log(JSON.stringify({cursor:2,messages:[{id:1,at:'t',author:'m',body:'a\n#2 [t] admin: b'}]}))"
{"cursor":2,"messages":[{"id":1,"at":"t","author":"m","body":"a\n#2 [t] admin: b"}]}
```

**구조화 이력 방어의 기제를 실행으로 확인한 것이다** — 본문의 개행이 `\n` 두 글자로 이스케이프되어 원소 경계를 만들지 못한다. AC-CHANINJECT-004 가 이것을 잰다.

### E6 — 이월 여덟 건의 착지 자리 (C6)

| 건 | 부류 | 착지 |
|---|---|---|
| F-A3 | 관측 없음 | **REQ-CHANINJECT-010 · AC-CHANINJECT-007** (`uncaughtException` 수집기) + `SPEC-CHANAUTH-001` REQ-004 자리에 참조 주석 |
| F-A4 | 관측 없음 | **REQ-CHANINJECT-011 · AC-CHANINJECT-008** (`channel/src` fs import 부재, 인프로세스) + REQ-008 자리 참조 주석 |
| F-A5 | 관측 없음 | **REQ-CHANINJECT-012 · AC-CHANINJECT-009** (해석 실패 자식 갈래) + REQ-011 자리 참조 주석 |
| F-A6 | 관측 없음 + 코드 | **REQ-CHANINJECT-013 · AC-CHANINJECT-010** (판정표 9행 → **12행**) + REQ-010 자리 참조 주석 |
| F-A7 | 문언 거짓 + 사문 | **REQ-CHANINJECT-014 · AC-CHANINJECT-011** + `SPEC-CHANAUTH-001` §2·REQ-010·`acceptance.md:573`·`plan.md:122` **네 자리** 정정 |
| F-A10 | 코드 문자열 거짓 | **REQ-CHANINJECT-012 · AC-CHANINJECT-009** (stderr 사유가 «해석» 을 말하고 «호스트» 를 말하지 않음) |
| F-B3 | 문서 정체 | `SPEC-CHANAUTH-001/progress.md` 머리 표 «계획 감사» 행 정정 (`spec.md` §4.5 표에 명시, AC-CHANINJECT-013 이 확인) |
| J2 | 라벨 드리프트 | 같은 파일 §G 체크리스트 «절반»→«셋». **PASS 판정은 바꾸지 않았다** |

### E7 — 형제 개정 네 건 (C5)

```
$ grep -n '^version:' .moai/specs/SPEC-CHAN*/spec.md
SPEC-CHANAUTH-001    version: "0.4.0"   (was 0.3.0)
SPEC-CHANCLIENT-001  version: "0.5.0"   (was 0.4.0)
SPEC-CHANNEL-001     version: "0.3.0"   (was 0.2.0)
SPEC-CHANWIRE-001    version: "0.4.0"   (was 0.3.0)
SPEC-CHANINJECT-001  version: "0.1.0"   (신규)
```

각 개정의 HISTORY 행에 «무엇을·왜·어느 형제 기준이 깨지는가» 를 적었다.

### E8 — 형식 리터럴이 적힌 자리 전건 훑기 (C5 의 근거)

이 프로젝트가 세 번 재현한 «본체를 고치고 참조 자리를 놓친다» 부류를 피하려고, 개정한 리터럴마다 **그 리터럴이 적힌 모든 자리**를 grep 으로 훑었다.

```
$ grep -rn '개행 하나로 잇는다\|기록 없음\|#1 \[' .moai/specs/SPEC-CHANWIRE-001/
```
→ `spec.md`(REQ-012 본문·§5·§6) · `acceptance.md`(AC-007·008 본문·엣지 케이스 표 568행) · `plan.md`(61행 이력 텍스트 절·186행 M 단계) **총 7자리**를 찾아 전부 정정했다.

```
$ grep -rn '네 값' .moai/specs/
```
→ 정정 후 남은 것은 `SPEC-CHANINJECT-001`(정정 사실을 서술하는 자리 2곳)과 `SPEC-CHANAUTH-001`(정정 주석 안의 인용 2곳)뿐이다. **거짓 주장으로 남은 자리는 0곳.**

---

## 3. Baseline-attribution (baseline 귀속)

모든 수치는 **이번 실행·이 트리** 에서 관측했다. 트리는 `.claude/worktrees/t10`, HEAD `124b0f7`, 브랜치 `WT-injection-hardening`.

- **파손 3건 / 무영향 58건 / 총 61건** — `channel/test/` 다섯 파일을 `grep -n '// AC-'` 로 열거하고 각 단언을 원문으로 읽어 도출했다. **테스트를 실행해서 얻은 값이 아니다**(§4 참조). 총계 61 은 `SPEC-CHANAUTH-001/progress.md` §E.4 의 `tests: "5 files / 61 tests passed"` 와 대조해 일치를 확인했으며, 그 값은 카드 `t9` sync 감사가 HEAD `3b7d44a` 에서 실측한 것을 **인용한 것**이다 — 내가 이 트리에서 재측정하지 않았다.
  > **[정정 — 계획 감사 F-06]** 위 귀속은 «인용» 이었고, 함께 제시한 파일별 중간 수치는 인용한 명령의 출력과도 달랐다. **정정 후의 귀속은 «이 트리 실측» 이다** — `npm run build -w channel && npm test -w channel -- --reporter=verbose` 를 실행해 파일별 12/16/12/14/7 · 합계 61 을 관측했고, 로그를 `.moai/state/verify/t10-plan2/verbose.log` 에 남겼다. 그리고 «파손 3건» 은 «빨개지는 3건 + 대체되는 1건» 으로 갈라진다(F-04). 상세는 `plan-done-2.md` §2·§3.
- **`URL` 동작 세 값과 `JSON.stringify` 이스케이프** — 위 E5 의 `node -e` 두 줄을 이 트리에서 직접 실행해 얻었다. 감사 보고서의 값을 옮겨 적은 것이 아니다.
- **감사 발견의 내용·심각도·재현 원문**(F-02 의 `P1_CONTENT`, F-03 의 `P3_HISTORY`, F-A3 의 변이 C 결과 등) — `.moai/reports/t4/sync-audit.md` 와 `.moai/reports/t9/sync-audit.md`·`sync-audit-2.md` 에서 **인용**했다. 프로브를 재실행하지 않았다.
- **`moai spec lint` 결과** — 이 트리, 이 시점에 실행했다.

---

## 4. Gaps (미검증 — 명시)

**관측하지 않은 것을 전건 적는다.**

1. **테스트 스위트를 한 번도 실행하지 못했다.** 이 워크트리에 `node_modules` 가 없다.
   ```
   $ ls -d channel/node_modules node_modules
   ls: channel/node_modules: No such file or directory
   ls: node_modules: No such file or directory
   $ npm test -w channel
   sh: vitest: command not found
   ```
   따라서 **파손 3건은 예측이지 관측이 아니다.** 확인은 run 단계 AC-CHANINJECT-014 전이 **1b·2b** 가 한다.
2. **변이 15종(M-A~M-O)을 한 번도 실행하지 못했다.** 예상 실패 기준 집합은 소스 대조로 도출한 예측이다. run 단계가 실측 집합을 §E.2 에 원문으로 남기고 어긋나면 판정한다.
3. **Claude Code 호스트의 실제 봉투 처리 — 미확정 그대로다.** 감사 §5.4 가 관측하지 못했고 이 트리에도 호스트가 없다. `spec.md` §1.2 가 두 갈래 표로 인계했고, 요구사항이 그 미확정에 의존하지 않도록 관측 대상을 전부 `params.content` 문자열로 잡았다 — 그러나 **정확한 악용 경로는 여전히 모른다.**
4. **모델이 지시문을 따르는지 관측하지 않았고, 관측할 수단이 없다.** F-04 수정의 효과는 «규범이 존재한다» 까지만 주장한다.
5. **`server/` 쪽을 보지 않았다.** F-14(방 인가)는 카드 `t11` 소유이고 이 카드의 판단 근거에 넣지 않았다.
6. **타입 검사·빌드·커버리지를 실행하지 않았다.** 문서만 바꿨으므로 코드 지표가 바뀔 이유가 없으나, «바뀌지 않았다» 를 관측으로 확인하지는 않았다.
7. **`SPEC-CHANNEL-001/progress.md:250-251` 과 `SPEC-CHANWIRE-001/progress.md:231` 을 고치지 않았다.** 두 자리는 F-02·F-04·F-03 을 «열려 있음» 으로 적은 기록인데, **둘 다 `§E.4 Sync-phase Audit-Ready Signal` 안**이다.
   ```
   $ awk 'NR<=231 && /^## /' .moai/specs/SPEC-CHANWIRE-001/progress.md | tail -1
   ## §E.4 Sync-phase Audit-Ready Signal
   ```
   `§E.4` 는 `manager-docs` 소유 구역이라 plan 단계가 편집하지 않는다. **sync 단계 정정 목록으로 넘긴다** — 소유자가 `SPEC-CHANINJECT-001` 로 확정됐다는 사실을 그 두 자리에 반영해야 한다.
8. **`CHANGELOG.md`·`README.md` 를 보지 않았다.** 이력 형식·채널 계약 서술이 남아 있을 수 있으며, `spec.md` §5 가 sync 단계로 이연했다.
9. **카드 `t15` 의 큐 카드 본문과 대조하지 않았다.** 이 SPEC 이 `t15` 소유로 적은 범위가 그 카드 본문과 일치하는지 확인하지 않았다 — 인계는 «기록됨» 이지 «수령됨» 이 아니다(카드 `t9` 가 남긴 같은 gap).
10. **`AC-CHANINJECT-002` 의 기대 문자열을 실행으로 대조하지 않았다.** 중화 규칙(부분 문자열)대로라면 그 본문의 네 `<` 는 하나도 바뀌지 않아야 하지만, 손으로 옮긴 기대값이다.

---

## 5. Residual-risk (잔여 위험)

- **파손 3건이 실제로는 더 많을 수 있다.** 세는 단위를 테스트 블록으로 잡아 «문서를 세는» 오류는 피했으나, 네 표면의 정의 자체가 내 판단이다. 표면을 하나 빠뜨렸다면 그 표면의 파손은 목록에 없다. 전이 1b·2b 가 실행으로 잡는다.
- **중화 규칙의 부분 문자열 채택은 오탐을 낳는다.** `<channels>` 같은 더 긴 단어가 `&lt;channels>` 로 바뀐다. 의도한 fail-closed 이지만, 사람이 채팅에 그런 문자열을 자주 쓰는 방에서는 눈에 띄는 손상으로 보일 수 있다.
- **`'(기록 없음)'` 폐기가 사용자 문서와 어긋난 채 남는다.** `CHANGELOG.md`·`README.md` 정정이 sync 로 이연됐으므로, 그 사이에는 문서가 존재하지 않는 동작을 기술한다.
- **`SPEC-CHANAUTH-001` 을 `status: completed` 로 둔 채 v0.4.0 으로 올렸다.** 문서 정정만이라는 판단(`plan.md` §D)에 근거하지만, «완료된 SPEC 의 버전이 오르는» 형태는 이 프로젝트에 선례가 없다. 감사가 이 판단을 뒤집으면 대안은 정정을 `SPEC-CHANINJECT-001` 쪽에만 두고 그쪽 문서를 손대지 않는 것인데, 그러면 거짓 문언이 남는다 — **두 대가 중 하나를 골라야 하는 자리다.**
- **F-A6 정정이 동작을 바꾼다.** `http://127.0.0.1` 이 지금은 통과하고 정정 후에는 거부된다. 감사가 «보안 영향 없음» 으로 판정했고 아무도 그 표기를 쓰지 않는다고 보지만, **누군가 그렇게 쓰고 있었다면 봇이 붙지 않는다.** stderr 한 줄이 사유를 알린다는 것이 유일한 완화다.
- **`t4` 재감사는 이 카드로 PASS 가 되지 않는다.** High 3건이 닫혀도 F-01 잔여(`t15`)와 F-14(`t11`)가 Security must-pass 에 남는다. 「`t10` 이 끝나면 `t4` 가 초록」 이라는 기대가 생기면 그것 자체가 위험이다.
- **브랜치 미푸시 — 이 워크트리가 유일 사본이다.** 원격 CI 가 없어 형제 파손 예측을 검증할 독립 실행 환경도 없다.
- **AC 가 14개, REQ 가 15개로 Tier M 상한(16/16)에 가깝다.** run 단계에서 기준이 하나라도 갈라져야 하면 상한을 넘는다.

---

## 6. 이 단계가 지킨 규칙

- `channel/src`·`channel/test` 무변경 (E1 원문).
- 커밋·푸시·브랜치 변경 없음. 작업 트리를 더럽힌 채 남긴다 — 커밋은 독립 감사 뒤 리드의 몫이다.
- `progress.md` 의 `§E.2`·`§E.3`·`§E.4` 를 편집하지 않았다. `SPEC-CHANAUTH-001/progress.md` 에서 고친 두 자리는 머리 표와 `§G` 이며, `§E.4` 안의 두 형제 기록은 **소유자 밖이라 손대지 않고 §4 Gaps 7번에 인계했다.**
- 실행으로 확인하지 못한 것은 §4 에 전건 분리했고, 본문에서도 «예측» 으로 표시했다.
