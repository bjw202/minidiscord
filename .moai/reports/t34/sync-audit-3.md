# t34 sync 감사 3회차 (최종 델타) — SPEC-PERMROUTE-001

**판정: PASS — 0.871 (Tier M 통과선 0.80)**

렌즈 `--security --deep`. 감사관 `sync-auditor`(독립·회의적 평가). 범위: 2회차 차단 발견 G-01 의
수리 델타. 4회차는 없다.

**차단 발견 0건.** 2회차의 유일한 차단 G-01 이 닫혔고, 그 수리가 회귀를 내지 않았다. 새 발견
일곱은 전부 **비차단**이며 그중 셋은 이 수리 이전부터 있던 것이다.

**귀속.** 워크트리 `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t34` ·
브랜치 `WT-perm-verdict-socket` · HEAD `dbee7b0` · 커밋되지 않은 sync 편집이 얹힌 작업 트리.
동결 baseline 을 직접 확인했다:

```
$ git rev-parse --abbrev-ref HEAD && git rev-parse HEAD
WT-perm-verdict-socket
dbee7b0093772d9f1c0c5ae0217e9328565d5889
$ git diff --stat | tail -1
 20 files changed, 490 insertions(+), 53 deletions(-)
$ git diff --cached --stat
(무출력 — staged 없음)
$ git status --porcelain | grep -c '^??'
21
```

디스패치가 전한 「20파일 +490/-53 · staged 없음 · untracked 21」과 정확히 일치한다.

통과선은 SSOT 에서 직접 읽었다 — `.claude/rules/moai/workflow/spec-workflow.md:329-330`
「Tier S `0.75`, Tier M `0.80`, Tier L `0.85`」.

**이 회차가 실제로 편집된 파일** (2회차 보고서보다 새 것만):

```
$ for f in $(git diff --name-only); do find "$f" -newer .moai/reports/t34/sync-audit-2.md; done
.claude/agent-memory/manager-spec/MEMORY.md
.claude/agent-memory/sync-auditor/MEMORY.md
.moai/reports/t34/lead-decisions.md
.moai/specs/SPEC-PERMROUTE-001/spec.md
```

**「형제 문서 본문 무편집·코드 무편집」 이라는 범위 주장은 기계로 참이다** — 추적 대상 중
`spec.md` 하나만 이 회차에 바뀌었다. `sync-auditor/MEMORY.md` 는 내 2회차 기록이고,
`lead-decisions.md` 는 다른 세션의 쓰기다(디스패치 공시).

---

## 1. 차원 점수

| 차원 | 2회차 | 3회차 | 판정 | 증거 (실행한 명령의 축자 출력) |
|---|---|---|---|---|
| Functionality (40%) | 0.86 | **0.90** | PASS (must-pass) | `npm test -w server` → `Test Files 17 passed (17) / Tests 218 passed (218)` `EXIT=0`; `npm test -w channel` → `Test Files 7 passed (7) / Tests 126 passed (126)` `EXIT=0`; `npx tsc --noEmit -p server` `EXIT=0` 0줄 · `-p channel` `EXIT=0` 0줄. 앵커 55/55 가 정확히 1건, 왕복 55/55, 거짓 확인 두 자리 해소, §6.2 25행·파이프 7 전 행 일치 |
| Security (25%) | 0.88 | **0.88** | PASS (must-pass) | `grep -rn 'sendToBot' server/src \| grep -v '^server/src/gateway.ts:'` → 무출력 `EXIT=1`. 이 회차는 `spec.md` 한 파일만 건드렸고 코드·시험은 무편집이라 보안 표면 무변동 |
| Craft (20%) | 0.82 | **0.86** | PASS | 수리가 요구된 35 를 넘어 79자리 전수 열거로 갔고, 왕복 검사·표 무결성 검사·0건 함정 공시·범위 밖 쓰기 공시를 스스로 했다. 감점은 H-02·H-03·H-04·H-05 |
| Consistency (15%) | 0.66 | **0.80** | PASS | G-01 닫힘. §6.1 일반 규칙(권고 2) 착지. 잔여: 줄 번호 9행(전부 현재 유효·공시됨) · G-02 2자리 · H-01 · H-05 |

**가중 조화평균 = 0.871**

```
$ python3 -c "
w={'Functionality':(0.40,0.90),'Security':(0.25,0.88),'Craft':(0.20,0.86),'Consistency':(0.15,0.80)}
s=sum(a/b for a,b in w.values()); print(round(s,6), round(1/s,4))"
1.148593 0.8706
```

### must-pass 방화벽

`Functionality 0.90` · `Security 0.88` — 둘 다 통과선 위다. 방화벽 미발동.
차단 발견도 0건이므로 **점수와 판정이 이번에는 갈리지 않는다.**

---

## 2. G-01 닫힘 — 재현

### 2.1 앵커 55개 전건을 다시 돌렸다 (증거 파일의 주장을 읽지 않고)

증거 파일에서 명령 55줄을 뽑아 이 트리에서 그대로 재실행했다:

```
$ grep -c '^  \$ grep -cF ' .moai/reports/t34/evidence/audit3/anchor-verification.txt
55
$ (55개 명령 전건 재실행)
TOTAL=55 PASS(=1 hit)=55 NOT-1=0
```

전문: `.moai/reports/t34/evidence/audit3/RERUN-anchors.txt`.
**0건도 2건 이상도 없다.** 55/55 가 정확히 1건에 적중한다.

### 2.2 왕복 — 그 55개가 §6.2 본문에 실제로 실려 있는가

증거 파일의 패턴이 §6.2 에 없으면 재현은 증거 파일만 검증하고 산출물은 검증하지 않는다.
그래서 반대 방향을 따로 돌렸다:

```
$ awk 'NR>=338 && NR<=384' spec.md > sec62.txt   (§6.2 전체 47줄)
$ (55개 패턴 각각을 grep -qF 로 sec62.txt 에서 확인)
checked=55  not-found-in-6.2=0
```

**55/55 가 §6.2 본문에 축자로 실려 있다.** 전사 오류 0건.

### 2.3 반대 방향 — §6.2 가 싣는데 검증되지 않은 앵커

§6.2 에서 `grep -n`/`grep -nF` 호출 42건을 전수 추출해 검증 목록과 대조했다:

```
$ (§6.2 의 grep 호출 42건 = 구체 38 + 템플릿 4, 템플릿은 시험 이름 21개로 전개)
IN-6.2-BUT-NOT-VERIFIED: '축약 없이'                  → 5행이 «옛 앵커» 로 공시한 폐기본
IN-6.2-BUT-NOT-VERIFIED: '전원 발신이 안전한 근거'      → 13행의 의도된 0건 (§C 공시)
IN-6.2-BUT-NOT-VERIFIED: '브로커의 판정 본문은'         → 19행. 살아 있는 앵커인데 검증 목록에 없다 (H-04)
```

앞의 둘은 정당한 제외다. 셋째는 내가 직접 쟀다:

```
$ grep -nF '브로커의 판정 본문은' web/rich.js
62:// 양끝을 문자열 앞뒤에 고정하고 `.` 로만 앞을 채운다. 브로커의 판정 본문은 네 템플릿 모두
$ grep -cF '브로커의 판정 본문은' web/rich.js
1
```

**유효하다.** 결함이 아니라 검증 범위의 빈틈이다 — H-04.

### 2.4 거짓 확인 두 자리 — 둘 다 자기 주제로 해소된다

2회차가 「단순 이동이 아니라 거짓 확인을 낸다」고 지목한 두 자리를 각각 확인했다.

**21행 (옛 `:473`)**:

```
$ grep -nF "it('accepts all four verdict words, normalizes case, and rejects ids containing l'" \
    .moai/specs/SPEC-PERM-001/acceptance.md
489:it('accepts all four verdict words, normalizes case, and rejects ids containing l', async () => {
$ sed -n '473p' .moai/specs/SPEC-PERM-001/acceptance.md
> 2026-09-04 개정 — 위 시험 «marks an undelivered verdict differently from a delivered one»: …
```

앵커는 `:489`, 곧 **그 시험 자신의 본문**으로 간다. `:473` 은 여전히 다른 시험의 개정 주석이며
2회차 관측이 그대로 재현된다. 거짓 확인 경로가 끊겼다.

**22행 (옛 `acceptance.md:262`)**:

```
$ grep -nF '호출을 빠뜨린 구현에서는' .moai/specs/SPEC-PERM-001/acceptance.md
264:**Then** 테스트가 통과한다. … `sendToBot` 호출을 빠뜨린 구현에서는 `seen` 이 `null` 이라 …
$ sed -n '262p' .moai/specs/SPEC-PERM-001/acceptance.md
> 2026-09-04 개정 — 위 시험 «delivers an allow verdict to the connected bot»: …
```

앵커가 `:264` — 2회차가 「그것은 `:264` 다」라고 적은 바로 그 자리다. 해소.

**시험 이름 앵커의 `it('` 접두가 실제로 판별한다** — 22행이 그 이유로 든 것이 참인지 쟀다:

```
marks an undelivered verdict differently from a delivered one          bare=2  with-prefix=1
accepts all four verdict words, normalizes case, and rejects ids …     bare=2  with-prefix=1
```

접두 없이는 2건(개정 주석이 « » 안에 이름을 다시 적는다), 접두를 붙이면 1건. 근거가 기계로 참이다.

### 2.5 §6.2 표 무결성

```
$ awk '/^### 6.2 /,/^### 6.3 /' spec.md | grep -cE '^\| [0-9]+ \|'
25
$ (데이터 25행 각각의 이스케이프되지 않은 | 개수)
전 25행 = 7   (18행 raw=9 escaped=2 → 7 · 25행 raw=10 escaped=3 → 7)
$ (헤더·구분선)
7 fields / 7 fields
```

**25행 전부가 헤더와 같은 7 파이프**다. 수리가 보고한 「행 깨짐 하나를 잡아 고쳤다」가 착지했고,
표는 지금 구조적으로 성하다.

### 2.6 회귀 — §6.1 훑기가 움직이지 않았다

수리가 §6.2 에 심은 앵커 패턴에는 `sendToBot(roomId: number` · `의 **발신 지점 다섯**` 처럼
§6.1 이 세는 어간이 그대로 들어 있다. 이것이 `AC-PERMROUTE-010` (ㄴ) 계수를 흔들지 확인했다.
§6.1 훑기는 `grep -v 'SPEC-PERMROUTE-001'` 로 **자기 자신을 뺀다**. 명령을 다시 돌렸다:

```
$ ls .moai/specs/*/{spec,plan,acceptance,design,research}.md server/src/*.ts server/test/*.ts \
     channel/src/*.ts web/*.js > scope-all.txt ; wc -l < scope-all.txt
119
$ grep -v 'SPEC-PERMROUTE-001' scope-all.txt > scope-ex-self.txt ; wc -l < scope-ex-self.txt
116
$ grep -c 'web/' scope-ex-self.txt
2
```

어간별 수(전부 `scope-ex-self.txt` 대상):

| 어간 | 2회차 | 3회차 | 차 |
|---|---|---|---|
| `ConnInfo` | 32 | 32 | 0 |
| `sendToBot` | 74 | 74 | 0 |
| `sendToConn` | 27 | 27 | 0 |
| `onGatewayRequest` | 57 | 57 | 0 |
| `setPermissionHandler` | 36 | 36 | 0 |
| `sendEstablished` | 15 | 15 | 0 |
| `발신 지점` | 22 | 22 | 0 |
| `@MX:WARN` | 5 | 5 | 0 |

**여덟 전부 무변동.** 「창구」도 그대로다 (`grep -rn "창구" .moai/specs | wc -l` → `16`).
자기 제외 덕분에 앵커 55개가 훑기 밖에 있고, AC-010 회귀가 없다. 증거:
`evidence/audit3/RERUN-section61-sweep.txt`.

### 2.7 남은 줄 번호 9행 — 지금 전부 유효하다

수리가 「1·2·12·17·19·20·23·24·25행은 줄 번호로 남았다(전수 열거에서 유효했다)」고 공시했다.
표본이 아니라 전건을 쟀다:

| 행 | 자리 | 그 줄에 있는 것 | 판정 |
|---|---|---|---|
| 1 | `GATEWAY-001/spec.md:174-176` | `**REQ-GW-020**` / 핸들러 호출 / `sendToBot(...)` 계약 | 유효 |
| 2 | 같은 파일 `:176` | `sendToBot(roomId, botId, payload)` 계약 | 유효 |
| 11 | `WEBRICH-001/spec.md:230` | 「브로커의 세 결과 템플릿」 열거 | 유효 |
| 12 | `LIVEVERIFY-001/acceptance.md:140` | 「발신 지점이 **다섯**이고」 | 유효 |
| 17 | `web-rich.test.ts:19` (`:151`·`:197`) | `const FAILED_BODY = …` / 두 사용처 | 유효 |
| 19 | `web/rich.js:62` | 「브로커의 판정 본문은」 | 유효 (grep 앵커와 일치) |
| 20 | `GATEWAY-001/acceptance.md:188` | `AC-GW-018` 행 | 유효 |
| 23 | `GATEWAY-001/spec.md:234` · `plan.md:41` | 범위 밖 절 「창구…만」 / 고정 이유 표 | 유효 |
| 24 | `CHANPERM-001/spec.md:210` | 「`sendToBot` 호출과 전달 실패 문구」 | 유효 |
| 25 | `permissions.test.ts:170` | 시험 머리 주석 | 유효 |

**공시가 정확하다.** 다만 이 자리들은 다음 삽입에서 낡는다 — 판단은 §4 H-06.

### 2.8 G-02(14·16행)는 그대로 낡아 있다 — 범위 밖 처분이 참이다

```
$ sed -n '878p' server/test/gateway.test.ts
    await new Promise(r => setTimeout(r, 200))
$ sed -n '899p' server/test/gateway.test.ts
    const room = seedRoom()
$ grep -nF "for (const m of [" server/test/gateway.test.ts
1032:    for (const m of ['deliver', 'closeRoom', 'isOnline', 'sendToBot', 'sendToOrigin', …
```

§6.2 14·16행이 「선재 낡음 · ROADMAP 이관 · 이번 회차 범위 밖」이라 명시한 것과 일치한다.

### 2.9 13행의 의도된 0건 — 공시는 충분하고, 설계는 한 칸 모자라다

```
$ grep -cF '전원 발신이 안전한 근거' server/src/gateway.ts
0        (EXIT=1)
```

**0건이 정답이라는 공시는 두 자리에 있다** — §6.2 13행 본문(「처분이 «제거» 이므로 착지 뒤에는
0건이 정답이고 실제로 0건이다」)과 증거 파일 §C. 사람이 읽는 한 오독할 여지가 없다.

**그러나 기계가 읽을 자리는 없다.** 「모든 앵커는 1건」이라는 규칙 하나로 55개를 검사하는 검사기는
이 한 자리를 FAIL 로 읽는다. 지금은 검사기가 없으니 손해가 없지만, 이 SPEC 이 지향하는 방향
(수를 적지 말고 명령으로 세라)에서 보면 **기대 적중 수를 행이 스스로 싣지 않는 것은 같은 부류의
작은 형태**다. 비차단이며 H-07 로 올린다.

---

## 3. 2회차 귀속에 대한 판정 — **부분적으로 선다** (35 중 19 는 참, 16 은 거짓)

2회차 G-01 은 이렇게 적었다: 「**35개 전부 HEAD `dbee7b0` 에서는 유효했다** — 즉 이 수리가 만든
낡음이다.」 디스패치는 18행의 열둘에 대해 그것이 거짓이라고 지적했다. **지적이 맞고, 범위가
그보다 넓다.** 표본으로 끝내지 않고 35 전건을 세 기준선에서 쟀다.

### 3.1 18행 열둘 — 전건 거짓

HEAD 의 §6.2 18행이 싣던 열두 줄 번호는 `:195 :205 :228 :246 :262 :279 :303 :304 :323 :324
:347 :348` 이다. 셋을 나란히 읽었다:

```
$ git show 6a359f8:server/test/permissions.test.ts | sed -n '195p'
    broker.onGatewayRequest({ roomId, botId }, { request_id: 'abcde', … })
$ git show dbee7b0:server/test/permissions.test.ts | sed -n '195p'
    // SPEC-PERMROUTE-001 (M4-7, 리드 처분) — 요청을 소켓으로 보내 …
$ sed -n '195p' server/test/permissions.test.ts
    const ws = await wsConnect(port, token)
```

열둘 전건에 같은 대조를 돌린 결과: **§6.2 가 고정한 base `6a359f8` 에서는 열둘 모두가
`broker.onGatewayRequest(...)`, 곧 18행의 주제다. HEAD `dbee7b0` 에서는 열둘 중 단 하나도 그
주제를 싣지 않는다** — 주석·빈 줄·`const` 선언·닫는 괄호·무관한 `expect` 다.

**M4-7(run 단계)이 밀어냈고, sync 수리는 그것을 한 번 더 밀었을 뿐이다.**

### 3.2 그리고 넷이 더 있다 — 6·7·8행

같은 대조를 나머지 스물셋에 돌렸더니 세 행이 더 나왔다:

```
$ git show 6a359f8:SPEC-PERM-001/spec.md | sed -n '106p'
  onGatewayRequest(info: ConnInfo, params: { request_id: string; … })
$ git show dbee7b0:SPEC-PERM-001/spec.md | sed -n '106p'
```ts
```

| §6.2 행 | 자리 | `6a359f8` | `dbee7b0` | 귀속 |
|---|---|---|---|---|
| 6 | `PERM-001/spec.md:106` | 주제 | ```` ```ts ```` | **선재** |
| 7 | 같은 파일 `:133` | 주제 | (빈 줄) | **선재** |
| 7 | 같은 파일 `:136` | 주제 | `**REQ-PERM-006**` | **선재** |
| 8 | 같은 파일 `:144` | 주제 | `**REQ-PERM-008**` | **선재** |

**2회차 보고서는 이 셋의 HEAD 내용을 자기 표에 인용해 놓고도** (「HEAD `:106`=```` ```ts ````」·
「HEAD `:136`=`**REQ-PERM-006**`」·「HEAD `:144`=`**REQ-PERM-008**`」) **바로 위 산문에서 「35개
전부 HEAD 에서 유효했다」고 적었다.** 반증 증거를 손에 쥐고도 주장을 고치지 않은 것이며, 표와
머리글이 서로를 부정한다. 이것이 이 회차에서 내가 스스로에게 내리는 가장 무거운 판정이다.

### 3.3 반대 방향의 오류도 있다 — 11행

2회차는 11행의 둘(`plan.md:70` · `acceptance.md:461`)을 「HEAD 내용과 불일치」로 적었다.
쟀더니 **둘 다 HEAD 에서 유효했다** — 곧 sync 수리가 낡게 만든 것이 맞다. 2회차는 같은 표에서
한쪽 방향으로도 반대 방향으로도 틀렸다.

### 3.4 최종 귀속 — 35 의 내역

| §6.2 행 | 개수 | `dbee7b0` 에서 유효? | 밀어낸 것 |
|---|---|---|---|
| 5 | 4 | 예 | **sync 수리** |
| 6 | 1 | 아니오 | run (M-커밋) |
| 7 | 2 | 아니오 | run (M-커밋) |
| 8 | 1 | 아니오 | run (M-커밋) |
| 9 | 1 | 예 | **sync 수리** |
| 11 | 2 | 예 | **sync 수리** |
| 18 | 12 | 아니오 | run (M4-7) |
| 21 | 8 | 예 | **sync 수리** |
| 22 | 4 | 예 | **sync 수리** |
| | **35** | | **sync 19 · run 16** |

**판정: 2회차의 귀속은 부분적으로 선다.** 35 중 **19 는 참**(sync 수리가 만든 낡음), **16 은
거짓**(HEAD 시점에 이미 낡아 있었다). 2회차의 오류는 **방법**에 있었다 — 「+1 이동」이라는 상대
변위만 보고 **HEAD 시점의 내용 일치를 확인하지 않았다.** 자기 표의 다른 칸에서는 그 확인을 했고,
18행에서만 하지 않았으며, 하고도 결론에 반영하지 않은 자리가 셋 더 있었다.

### 3.5 이 판정이 G-01 의 차단 성격을 바꾸는가 — 바꾸지 않는다

- **수리 필요성은 그대로다.** 누가 밀었든 35(실제로는 52)개가 낡아 있었고, 앵커는 `AC-PERMROUTE-010`
  (ㄱ)의 확인 경로다. 고쳐야 했다.
- **바뀌는 것은 책임의 비중이다.** 「이 수리가 스스로 낸 회귀」라는 틀은 19/35 에만 맞는다.
  나머지 16 은 **1회차와 2회차가 함께 놓친 선재 결함**이며, 그쪽이 오히려 오래 살아남았다는
  점에서 산출물에는 더 나쁘고 이 수리에는 덜 나쁘다.
- **2회차 Consistency 0.66 의 근거 절반이 잘못 세워져 있었다.** 이번 0.80 은 G-01 이 닫혔기
  때문이기도 하지만, 그 감점의 전제가 절반만 참이었기 때문이기도 하다.

### 3.6 수리 자신의 귀속표에도 오차가 셋 있다 (H-02)

증거 §E 의 79자리 열거를 독립 재계수했다 — **총계·유효·낡음 셋 다 일치한다**:

```
$ (§E 표를 파싱해 데이터 행과 판정을 셈)
data rows: 79   유효: 27   낡음: 52
```

그러나 귀속 칸에서 셋이 어긋난다. §E 는 「선재/사후」를 base `6a359f8` 기준으로 판정하는데,
**21~25행은 sync 편집이 신설한 행**이라 그 번호가 `6a359f8` 에 고정된 적이 없다. 세 자리를 쟀다:

```
$ git show 6a359f8:SPEC-PERM-001/plan.md | sed -n '201p'
5. **GREEN 확인**: `npm test -w server` → 전체 통과. …
$ git show dbee7b0:SPEC-PERM-001/plan.md | sed -n '201p'
3. `permissions.ts` 의 `tryHandleUserReply` 를 구현한다 — 정규식 판정 → …
```

`plan.md:201` · `acceptance.md:545` · `acceptance.md:473` — 셋 다 **`dbee7b0` 에서 유효했다.**
sync 가 스스로 쓰고 스스로 밀어낸 자리이므로 「선재 낡음 + 이번 sync 가 재이동」이 아니라
「이번 sync 수리」다. 바로잡으면 **sync 19 · 선재+재이동 16 · 선재 17 = 52** 이고, 내가 35 에
대해 따로 낸 19/16 과 같은 갈래로 수렴한다.

---

## 4. 새 발견 (전부 비차단)

### H-01 [Medium] [optional] — §6.1 자신의 재현 명령이 이 프로젝트의 기본 셸에서 조용히 `0` 을 낸다

§6.1 훑기 표는 재현 명령을 `F=$(cat scope-ex-self.txt)` + `grep -n -- '<어간>' $F | wc -l`
형식으로 싣는다. 이 셸에서 그대로 돌리면:

```
$ F=$(cat scope-ex.txt); echo "arg count = $(set -- $F; echo $#)"
arg count = 1
$ grep -n -- 'ConnInfo' $F 2>&1 | head -1
ugrep: warning: .moai/specs/SPEC-AUTH-001/acceptance.md
$ grep -n -- 'ConnInfo' $F 2>/dev/null | wc -l
0            ← 종료 코드 0. 오류 표시 없음.
```

원인은 셸이다. 이 환경의 셸은 zsh(`ZSH_VERSION=5.9`)이고 **zsh 는 따옴표 없는 매개변수 확장을
낱말 분리하지 않는다** — 116개 경로가 파일 이름 **하나**로 넘어간다. bash 에서는 정상이다:

```
$ /bin/bash -c 'F=$(cat scope-ex.txt); set -- $F; echo "bash arg count = $#"; grep -n -- "ConnInfo" $F | wc -l'
bash arg count = 116
32
```

**왜 위험한가.** 실패 신호가 없다 — 종료 코드 0, 빈 출력, 경고는 `2>/dev/null` 로 흔히 가려진다.
`AC-PERMROUTE-010` 을 확인하려고 §6.1 의 명령을 붙여 넣는 다음 사람은 **모든 어간에서 `0`** 을
보고 「뒤집힌 자리가 없다」고 읽는다. 「신호의 부재는 통과가 아니다」의 교과서적 형태이며, 이
SPEC 이 세우려는 규율의 정반대다.

**선재다** — 이 명령 형식은 HEAD 에 이미 있다:

```
$ git show dbee7b0:.moai/specs/SPEC-PERMROUTE-001/spec.md | grep -cF 'F=$(cat scope-ex-self.txt)'
1
```

이 수리가 만든 것이 아니고 리드 처분 범위 밖이라 **비차단**으로 올린다. 고치는 법은 한 줄이다 —
`xargs grep -n -- '<어간>' < scope-ex-self.txt | wc -l`(셸 무관, 이 회차의 §2.6 수치를 낸 형식).
**G-02 와 같은 ROADMAP 후속으로 묶기를 권한다. 우선순위는 G-02 보다 높다** — G-02 는 두 자리가
잘못된 곳을 가리키는 것이고, 이것은 SPEC 의 대표 훑기 전체가 조용히 비는 것이다.

### H-02 [Low] [optional] — 증거 §E 의 귀속 셋이 sync 저작 자리를 선재로 적는다

§3.6 참조. 총계 79/27/52 는 재계수로 일치하며, 어긋난 것은 세 자리의 귀속 칸뿐이다.
방향은 **책임을 이 수리에서 run 쪽으로 옮기는** 쪽이므로 고쳐 두는 편이 낫다.

### H-03 [Low] [optional] — 「전환한 앵커는 55개」와 「50 전환」이 서로 다르다

`spec.md` §6.2 서문은 「전환한 앵커는 **55개**」라고 적는다. 그런데 HEAD 의 §6.2 는 이미 grep
앵커 다섯을 싣고 있었다:

```
$ (HEAD 의 §6.2 에서 grep 앵커 전수 추출)
HEAD 6.2 grep anchors: 5
    export interface ConnInfo / export interface Gateway / 축약 없이 /
    전원 발신이 안전한 근거 / 브로커의 판정 본문은
```

이 중 3·4행의 두 패턴은 **글자 그대로 55 안에 들어 있다** — 바뀐 것은 낡은 `:191`·`:192` 를 뗀
것과 `-n`→`-nF`, 파일 경로 추가이지 패턴 자체는 신설이 아니다. 수리 자신의 계산(52 낡음 − 2
범위 밖 = **50 전환**)과도 어긋난다. 관대하게 읽으면 「행을 전환했다」는 뜻이지만, **이 카드에서
계수 오차가 이미 여섯 번 났다.** 「전환 50 · 검증 55」로 갈라 적기를 권한다.

### H-04 [Low] [optional] — 19행 앵커가 검증 목록에 없다

§2.3 참조. 내가 직접 재서 유효함(`web/rich.js:62`, 1건)을 확인했으므로 산출물에는 결함이 없다.
검증이 「전환한 것」만 덮고 「§6.2 가 싣는 것 전부」를 덮지 않았다는 범위 문제다. 다음 회차의
검사기는 후자를 기준으로 삼아야 한다.

### H-05 [Low] [optional] — 새 §6.1 [HARD] 가 부류 하나 중 형태 하나만 덮는다

권고 2 로 들어온 규칙의 본문은 「**개정 주석** 자신의 적중은 그 주석이 붙은 §6.2 행이 덮는다」다.
그런데 23행의 처분은 개정 주석이 아니라 **본문 개정 + 인용 블록**이고, 그 블록도 어간을 다시 적는다:

```
$ sed -n '236p' .moai/specs/SPEC-GATEWAY-001/spec.md | grep -oE 'sendToBot|창구|sendToOrigin' | sort | uniq -c
   2 sendToBot
   2 sendToOrigin
   3 창구
```

지금은 손해가 없다 — 창구 16·sendToBot 74 가 2회차와 같고, 2회차가 `:236` 을 이미 덮인 것으로
분류했다. 그러나 **규칙 문언은 이 형태를 이름으로 부르지 않는다.** 2회차가 G-01 을 두고 「부류는
하나인데 형태 하나만 막았다」고 적은 것과 정확히 같은 모양이 한 단계 낮은 심각도로 재현한다.
「개정 주석·인용 블록 등 §6.2 행이 지시한 편집이 남기는 적중」으로 넓히면 닫힌다.

### H-06 [Low] [optional] — 줄 번호 9행은 공시됐지만 여섯 번째 재발을 예약한다

수리는 이 아홉을 「전환하지 않고 공시」로 처리했고, 근거(리드 범위가 「낡은 앵커」였다)는 실재한다.
전건이 지금 유효함도 내가 확인했다(§2.7). **판정: 이번 회차의 처리로는 받아들일 만하다** — 범위를
스스로 넓히지 않은 것은 규율이지 태만이 아니고, 공시가 정확하다.

**그러나 이것이 이 부류의 재발을 막지는 않는다.** 이 카드에서 「줄 번호가 삽입으로 낡는다」는
부류는 이미 다섯 번 났다. 아홉 자리가 남아 있고 형제 문서는 앞으로도 편집된다 — 여섯 번째는
가능성이 아니라 일정이다. 공시는 다음 사람이 **알고** 밟게 할 뿐 밟지 않게 하지는 않는다.
**리드에게: 이 아홉의 전환을 별도 카드로 세우거나, 세우지 않기로 명시 결정하기를 권한다.**
「공시했으니 됐다」로 두면 그 결정이 내려진 적 없이 재발한다.

### H-07 [Low] [optional] — 13행의 0건이 기계가 읽을 형태로 실려 있지 않다

§2.9 참조. 사람 대상 공시는 충분하다. 「이 행의 기대 적중 = 0」을 행 자체가 싣게 하면
「전 앵커 1건」 검사기가 그대로 돌아간다.

### 범위 밖 쓰기 — 판단

수리가 지시 밖에서 agent-memory 둘(`manager-spec/MEMORY.md` + 토픽 파일 하나)을 쓰고 공시했다.

**범위 안으로 본다.** 산출물·형제 문서·코드 어디도 건드리지 않고, 어떤 수용 기준에도 걸리지 않으며,
에이전트 기억 갱신은 그 에이전트의 상시 행위다. 공시가 있었다는 점이 결정적이다 —
**공시 없이 했다면 범위 이탈로 올렸을 것이다.** 다만 「이 수리는 `spec.md` 만 건드렸다」는 서술과
파일 계수가 어긋나므로, 범위 주장에는 그 둘을 함께 적는 편이 정확하다.

---

## 5. 디스패치 지목 항목 — 대조표

| 항목 | 결과 |
|---|---|
| 앵커 55개 전건 재실행 | **55/55 정확히 1건** (§2.1) |
| 13행 0건 함정의 공시 적정성 | 공시 충분 · 설계 한 칸 모자람 → H-07 (§2.9) |
| 새 앵커가 제 주제를 가리키는가 (`:473`·`:262`) | **둘 다 해소** (§2.4) |
| 앵커 내구성 분류 (43 durable / 12 prose / 1 weakest) | **동의.** 「`총계 7 — 형제 6`」은 수를 품어 가장 약하나 **0건으로 크게 실패**하지 조용히 오지목하지 않는다 — 낡은 줄 번호와 결정적으로 다른 성질이고, 이 수리가 그 차이를 정확히 이름 붙였다 |
| 줄 번호 9행을 남긴 판단 | 이번 처리로는 수용 · 재발은 예약됨 → H-06 (§2.7) |
| §6.2 표 무결성 (25행 · 파이프) | **25행 · 전 행 7 파이프** (§2.5) |
| 권고 2 (§6.1 일반 규칙) | 착지 · 고리를 닫는다 · 형태 하나 누락 → H-05 |
| 회귀 (server · channel · typecheck) | 218/218 · 126/126 · 0/0 전부 `EXIT=0` |
| 2회차 귀속 반증 | **부분적으로 선다 — 19 참 / 16 거짓** (§3) |
| agent-memory 범위 밖 쓰기 | 범위 안 (공시가 결정적) |

---

## 6. 5절 블록

### Claim (주장)

(1) 2회차의 유일한 차단 **G-01 이 닫혔다** — §6.2 앵커 55개가 전건 정확히 1건에 적중하고,
왕복 55/55 로 §6.2 본문에 축자로 실려 있으며, 거짓 확인을 내던 두 자리가 각각 제 주제로 간다.
(2) 수리는 **회귀를 내지 않았다** — server 218 · channel 126 · typecheck 0 · §6.1 어간 여덟 무변동 ·
§6.2 25행 파이프 무결.
(3) **2회차의 귀속은 부분적으로 거짓이다** — 35 중 19 는 sync 수리가 만든 낡음이고 **16 은 HEAD
시점에 이미 낡아 있었다**(18행 열둘 + 6·7·8행 넷).
(4) 새 발견 일곱은 **전부 비차단**이고 그중 H-01·H-06 은 선재이며, 최고 심각도는 Medium 하나다.
(5) 조화평균 **0.871** · Tier M 통과선 0.80 · must-pass 둘 다 통과 · 차단 0건 → **PASS**.

### Evidence (증거)

- 앵커 55건 재실행 → `TOTAL=55 PASS(=1 hit)=55 NOT-1=0` (`evidence/audit3/RERUN-anchors.txt`)
- 왕복 → `checked=55  not-found-in-6.2=0`
- 역방향 → `IN-6.2-BUT-NOT-VERIFIED:` 셋(폐기본 1 · 의도된 0건 1 · 19행 1) ; 19행은 직접 재서 `1`
- `npm test -w server` → `Test Files 17 passed (17) / Tests 218 passed (218)` `EXIT=0`
  (`evidence/audit3/RERUN-server.txt`)
- `npm test -w channel` → `Test Files 7 passed (7) / Tests 126 passed (126)` `EXIT=0`
  (`evidence/audit3/RERUN-channel.txt`)
- `npx tsc --noEmit -p server` → `EXIT=0` 0줄 · `-p channel` → `EXIT=0` 0줄
  (`RERUN-tsc-server.txt` · `RERUN-tsc-channel.txt`)
- `awk … | grep -cE '^\| [0-9]+ \|'` → `25` ; 데이터 25행 전부 미이스케이프 파이프 `7`
- §6.1 훑기 → `119 / 116 / 2` + 어간 여덟 `32 74 27 57 36 15 22 5` (2회차와 전건 동일)
  (`evidence/audit3/RERUN-section61-sweep.txt`)
- `grep -rn 'sendToBot' server/src | grep -v gateway.ts` → 무출력 `EXIT=1`
- 3자 기준선 대조 `git show 6a359f8:<f> | sed -n '<N>p'` · `git show dbee7b0:<f> | sed -n '<N>p'` ·
  `sed -n '<N>p' <f>` — 18행 열둘 + 5·6·7·8·9·11·21·22행 전건 (§3.1~3.4 에 축자)
- §E 79자리 독립 재계수 → `data rows: 79 · 유효 27 · 낡음 52` (파일 기재값과 일치)
- zsh/bash 낱말 분리 대조 → `arg count = 1` (zsh, 0 hits) vs `bash arg count = 116` (32 hits)
- 이 회차 편집 파일 → `find <f> -newer sync-audit-2.md` 로 넷 (spec.md 외 셋은 메모리·타 세션)
- 점수 산술 → `sum of w/s = 1.148593` · `weighted harmonic mean = 0.8706`
  (`evidence/audit3/RERUN-score.txt`)

### Baseline-attribution (baseline 귀속)

모든 수는 **HEAD `dbee7b0` + 커밋되지 않은 sync 편집이 얹힌 이 작업 트리**에서 이번 회차에 직접
실행해 얻었다. **증거 파일 `anchor-verification.txt` 의 판정값은 baseline 으로 쓰지 않았다** —
그 파일에서 뽑은 것은 명령 55줄뿐이고 결과는 전부 재실행값이다. 2회차 값은 델타 기준선으로만
썼고 판정에는 쓰지 않았다. 「HEAD 에서 유효했는가」는 기억이나 인용이 아니라 `git show
6a359f8:` · `git show dbee7b0:` 두 객체를 직접 읽어 판정했다. 통과선 `0.80` 은
`spec-workflow.md:329-330` 에서 직접 읽었다. §E 의 79/27/52 는 파일 기재값을 믿지 않고 파서로
재계수해 일치를 확인했다.

### Gaps (미검증)

1. **1회차·2회차가 종결한 것은 다시 세우지 않았다** — F-01~F-05, 보안 렌즈 4.1~4.4, AC-011 개정
   근거, 218/126 의 최초 도출. 이번에는 재실행 결과만 대조했다.
2. **변이 M1~M6 을 다시 돌리지 않았다.** 제약상 금지됐고(소스 변이 금지), run 의 증거 파일을
   읽었을 뿐 재현하지 않았다. 따라서 **각 앵커가 가리키는 시험이 실제로 판별력을 갖는지**는
   이 회차의 관측이 아니다 — 앵커가 옳은 줄을 가리킨다는 것만 쟀다.
3. **§6.2 24행 밖의 형제 문서 전체에 대한 앵커 전수 유효성**은 세우지 않았다. 내가 전수로 센 것은
   §6.2 가 싣는 앵커(55 + 줄 번호 79자리)이며, **형제 문서가 §6.2 밖에서 가리키는 포인터**는
   범위에 없었다.
4. **`web/`·`channel/` 내부의 앵커**는 19행 하나만 쟀다. 나머지는 §6.2 가 싣지 않는다.
5. **20행 `:188` 의 «5개» 문자열 자체**는 행 식별자(`AC-GW-018`)까지만 확인했고 그 칸의 「5개」
   문자열을 축자로 재지 않았다 — 행이 옳은 행임은 확인했다.
6. **CI 를 관측하지 않았다.** 브랜치는 미푸시이며 원격 실행이 없다.
7. **H-01 의 영향 범위**를 세지 않았다 — §6.1 말고 다른 문서가 같은 `$F` 형식을 쓰는지 훑지
   않았다. 같은 부류가 더 있을 수 있다.
8. **`lead-decisions.md` 의 내용을 감사하지 않았다.** 다른 세션이 쓴 것이고 이 회차 범위 밖이다.
   2회차 G-03(`+462`)이 지금 어떤 상태인지도 재지 않았다.

### Residual-risk (잔여 위험)

1. **H-01 이 가장 큰 잔여 위험이다.** SPEC 의 대표 훑기가 이 프로젝트의 기본 셸에서 조용히 `0` 을
   낸다. `AC-PERMROUTE-010` 을 그 명령으로 확인하는 다음 사람은 **전 어간 0건**을 보고 통과로
   읽는다. 이번 판정은 내가 동작하는 형식으로 다시 돌려 얻은 값에 선다 — 그러나 **문서에 실린
   명령은 그 값을 재현하지 못한다.**
2. **줄 번호 9행의 여섯 번째 재발은 일정이다** (H-06). 공시는 알고 밟게 할 뿐이다.
3. **`transport-auth.test.ts` 플레이크는 두 회차 연속 나오지 않았을 뿐 사라지지 않았다**
   (7회 관측 이력). 2회차에 이어 이번에도 초록이지만 **두 번의 초록도 부재를 세우지 못한다.**
   단일 파일 재실행은 실패가 없었으므로 하지 않았다.
4. **G-02(14·16행)와 H-01 이 함께 시사하는 것** — 앵커·명령의 낡음은 이 카드의 감사 세 회차가
   반복해 늦게 잡은 부류다. §E 의 79자리 열거가 처음으로 그 부류를 전수로 봤고, 그 결과 2회차의
   35 가 하한이었음이 드러났다. **다른 SPEC 의 §6 류 표에도 같은 부류가 있을 개연성**이 남는다.
5. **2회차 귀속의 절반이 거짓이었다는 사실 자체가 잔여 위험이다.** 같은 감사관이 같은 방법
   (상대 변위만 보고 내용 일치를 확인하지 않음)을 다른 자리에 적용했을 수 있다. 이번 회차는
   35 전건을 세 기준선에서 다시 쟀지만, **1회차 보고서의 유사 주장은 재검하지 않았다.**
6. **판정과 점수가 이번에는 갈리지 않는다** — 차단 0건이므로 리드가 이의를 제기할 어긋남이 없다.
   대신 비차단 일곱의 처분(특히 H-01 의 ROADMAP 우선순위)이 리드 결정으로 남는다.
