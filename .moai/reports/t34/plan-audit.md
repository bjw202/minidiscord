# SPEC-PERMROUTE-001 계획 감사 보고서 — 1회차

- 대상: `.moai/specs/SPEC-PERMROUTE-001/{spec.md, plan.md, acceptance.md, progress.md}`
- 나무: `.claude/worktrees/t34` — `git branch --show-current` → `WT-perm-verdict-socket`, `git rev-parse --short HEAD` → `6a359f8` (직접 실행 확인)
- 감사 회차: 1 / 최대 3
- **판정: FAIL**
- **총점: 0.6875** (통과선 **0.80** 미달)

M1 맥락 격리 적용: 디스패치가 전한 배경은 **검증할 주장**으로 다뤘고 근거로 쓰지 않았다. 카드 본문이 전한 「AC-PERMROUTE-007 이 해제를 잰다」·「M1 이 003b 하나만 무너뜨린다」·「~30 형제 시험」 같은 전제는 전부 직접 실행·판독으로 재확인했으며, 그 중 둘이 반증됐다.

---

## 0. 통과선을 어디서 읽었는가

디스패치가 준 값을 쓰지 않고 규칙 원본에서 직접 읽었다.

| 항목 | 값 | 출처 (파일:줄) | 인용 |
|---|---|---|---|
| Tier | **M** | `.moai/specs/SPEC-PERMROUTE-001/spec.md:14` | `tier: M` |
| 통과선 | **0.80** | `.claude/rules/moai/workflow/spec-workflow.md:141` | `\| M (Medium) \| 300 - 1000 LOC \| 5 - 15 files \| **3 files**: spec.md + plan.md + acceptance.md \| 0.80 \|` |
| 통과선 (교차 확인) | **0.80** | `.claude/rules/moai/workflow/spec-workflow.md:329-330` | `**Overall score ≥ the SPEC's per-tier PASS threshold** — Tier S \`0.75\`, Tier M \`0.80\`, Tier L \`0.85\`` |
| REQ/AC 상한 | 16 / 16 | `.claude/rules/moai/workflow/spec-workflow.md:150` | `\| M \| 16 \| 16 \|` |

실행 명령: `sed -n '132,155p' .claude/rules/moai/workflow/spec-workflow.md` · `sed -n '326,334p' …`.
REQ 11개 · AC 13개(003 분할 반영)로 상한 16/16 안이다 — 상한 위반은 없다.

---

## 1. 필수 통과 항목

| 항목 | 판정 | 근거 |
|---|---|---|
| MP-1 REQ 번호 일관성 | **PASS** | `grep -o 'REQ-PERMROUTE-[0-9]*' spec.md \| sort -u` → `001 002 003 004 005 006 007 008 009 010 011` 연속·중복 0·자릿수 일관. `grep -c '^\*\*REQ-PERMROUTE-'` → `11` |
| MP-2 GEARS 형식 | **PASS** | 요구사항 층(`spec.md` §4)에 대해 판정함. 11개 전부 다섯 패턴 중 하나를 라벨과 함께 붙임 — Ubiquitous 6(001·003·004·009·010·011) · When 3(002·006·007) · Unwanted 2(005·008). 예: `:139` `**REQ-PERMROUTE-005** (Unwanted — shall not)` + 「보내서는 안 된다」. 검증 층(`acceptance.md` Given-When-Then)은 이 항목으로 채점하지 않았다 |
| MP-3 프런트매터 | **PASS** | `spec.md:1-17` 에 12개 정식 필드 전건 존재·타입 정합 — `id`·`title`·`version: "0.1.0"`(따옴표 semver)·`status: draft`·`created: 2026-09-03`·`updated: 2026-09-03`·`author`·`priority: P1`·`phase`·`module`·`lifecycle: spec-anchored`·`tags`(쉼표 문자열). 거부 별칭(`created_at`·`updated_at`·`labels`·`spec_id`) 0건 |
| MP-4 언어 중립성 | **N/A** | 단일 언어(TypeScript) 프로젝트 범위. 자동 통과 |
| MP-5 D7 형제 상태 | **PASS** | 참조된 7개 SPEC 전부 실재하며 status 전건 `completed` (retired·superseded·archived 0건). 명령: `grep -Eoh 'SPEC-([A-Z][A-Z0-9]+-)+[0-9]+' spec.md \| sort -u` → 각 `grep -m1 '^status:'`. 출력: CHANAUTH-001·CHANPERM-001·GATEWAY-001·GWAUTH-002·LIVEVERIFY-001·PERM-001·ROOMAUTHZ-001 = `completed`, 자기 자신 = `draft` |
| MP-6 D8 교차 플랫폼 | **N/A** | `grep -c 'syscall' .moai/specs/SPEC-PERMROUTE-001/*.md` → 네 파일 전부 `0`. 검증 동사가 발동할 대상 없음 |
| **MP-7 미결 표식 게이트** | **FAIL** | `grep -rn '\[NEEDS CLARIFICATION' .moai/specs/SPEC-PERMROUTE-001/` → **적중 2건**, `plan.md:54`(`ConnInfo.connId` 선택/필수) · `plan.md:103`(`sendToBot` 처분). 이 게이트는 점수와 무관하며, 미결이 열린 채로는 Implementation Kickoff 게이트를 넘을 수 없다 |

MP-7 하나만으로도 판정은 FAIL이다. **다만 판정이 이 게이트에만 기대지 않는다** — 총점 0.6875 역시 통과선 0.80 미달이며, 아래 차단 결함 다섯은 표식을 닫아도 남는다.

---

## 2. 항목별 점수

| 차원 | 점수 | 밴드 근거 | 증거 |
|---|---|---|---|
| Clarity (명료성) | **0.75** | 「하나둘 요구사항에 사소한 모호」 밴드. 문장 수준의 정밀도는 이 프로젝트 상위권이나, 변이 M1 의 정의(F-05)와 AC-009 의 명령/산문 불일치(F-02)가 두 자리의 해석 여지를 남긴다 | `acceptance.md:137` · `:115-117` |
| Completeness (완전성) | **0.75** | 필수 절 전건 존재(HISTORY·배경·범위·요구사항·수용 기준·범위 밖 H3 4개 + 불릿) + 프런트매터 완전 → 1.0 조건은 충족. 그러나 SPEC 이 **스스로 「완전하다」고 선언한** §6 개정 대조표가 네 부류를 빠뜨렸다(F-01) → 한 절이 실질 미완인 0.75 밴드 | `spec.md:186·191·196·200` (범위 밖 H3) / `spec.md:211-221` (미완 표) |
| Testability (검증 가능성) | **0.50** | 「여러 기준이 판단을 요하거나 공허하다」 밴드. 13개 중 4개가 결함 — AC-007 공허(실행으로 확정), AC-009 명령이 자기 기준을 집행하지 못함(실행으로 확정), AC-011 변이표 5행 중 3행이 과소 계수, AC-010 의 「9행」이 미결에 종속 | F-02·F-03·F-05·F-06 |
| Traceability (추적성) | **0.75** | 「한 REQ 가 미포함이거나 한 매핑이 간접」 밴드. REQ-PERMROUTE-009(정리 훅 금지)는 **어떤 기준도 재지 않는다**. REQ-003·REQ-006 은 매핑표에 자기 행이 없고 각각 AC-002 · AC-003a/003b/005 가 간접으로 잰다 | `acceptance.md:9-23` 매핑 열 |

**총점 = (0.75 + 0.75 + 0.50 + 0.75) / 4 = 0.6875** · 통과선 0.80 → **미달**.

---

## 3. 결함표

| id | 자리 | 내용 | 심각도 | 분류 |
|---|---|---|---|---|
| F-01 | `spec.md:211-221` | §6 개정 대조표 9행이 **살아 있는 거짓 진술 네 부류**를 빠뜨림 | critical | **차단** |
| F-02 | `acceptance.md:113-117` | AC-009 의 검증 명령이 자기 통과 조건을 집행하지 못함 (실행으로 확정) | major | **차단** |
| F-03 | `acceptance.md:85-97` | AC-007 이 **변경 이전 나무에서 이미 통과** — 아무것도 재지 않음 (실행으로 확정) | major | **차단** |
| F-04 | `plan.md:54` · `:103` | 미결 표식 2건 (MP-7). 그중 D-1 은 같은 절의 **결론이 이미 답한** 질문이다 | critical | **차단** |
| F-05 | `acceptance.md:135-143` | 변이표 5행 중 **3행이 과소 계수** — 세 변이가 AC-006 도 함께 무너뜨린다 | major | **차단** |
| F-06 | `acceptance.md:3` · `spec.md:25` | 기준 개수 자기 진술 「12개」가 실제 13개(003a/003b)와 어긋남 | minor | 비차단 |
| F-07 | `acceptance.md:168` | 「미결이 풀리기 전에는 이 갈래의 기준을 쓰지 않는다」 — 공시된 공백에 기준이 없다 | major | 비차단 |
| F-08 | `spec.md:166` | REQ-PERM-001 귀속 오기 — 해당 범위 밖 항목은 REQ-PERM-001 에 매달려 있지 않다 | minor | 비차단 |

### F-01 (critical, 차단) — §6 표가 빠뜨린 네 부류

명령(어간 훑기, 관용구 아님):

```
grep -n 'ConnInfo\|sendToBot\|setPermissionHandler\|onGatewayRequest\|sendToConn' \
  .moai/specs/SPEC-{GATEWAY-001,PERM-001,ROOMAUTHZ-001,GWAUTH-002}/{spec,plan,acceptance}.md
```

표는 `SPEC-GATEWAY-001/spec.md` 두 조항과 `SPEC-PERM-001/spec.md` 두 조항, 코드 세 자리 = 9행이다. 훑기 적중을 「이 SPEC 착지 후 거짓이 되는가」로 분류한 결과, **표에도 없고 §6.1 제외 목록에도 없는 살아 있는 거짓** 네 부류가 남았다.

**㉠ `SPEC-PERM-001` REQ-PERM-006 (`spec.md:133`) · REQ-PERM-007 (`:136`)** — 가장 무겁다.

> `:133` 「서버는 그 `request_id` 를 등록한 **(방, 봇) 에게만** … `Gateway.sendToBot` 으로 보내야 한다」

두 겹으로 거짓이 된다. 전송 메서드가 `sendToOrigin` 으로 바뀌고, 주소 단위가 (방, 봇)에서 접속 하나로 좁아진다. REQ-PERMROUTE-006 은 「판정 경로에서 `Gateway.sendToBot` 을 호출해서는 안 된다」로 **정면 충돌**하는데, 표는 이 조항을 한 행도 적지 않았다. REQ-PERM-007 은 「같은 경로로」라 자동 승계된다. `SPEC-PERM-001` 은 `depends_on` 에 적힌 SPEC 이며 status 는 `completed` 다.

**㉡ `SPEC-PERM-001` §3 의존 계약 블록 (`spec.md:77`·`:80-81`)** — 그 절은 스스로 「축약 없이 그대로 옮긴다」(`:75`)고 선언한 뒤 `export interface ConnInfo { roomId: number; botId: number }` 를 글자 그대로 복제한다. REQ-PERMROUTE-003 이 이 정의를 뒤집는다. 표 5행은 REQ-PERM-004 의 코드 블록만 덮고 이 **두 번째 축자 고정**을 놓쳤다.

**㉢ `SPEC-GATEWAY-001/acceptance.md` 세 자리** — 표는 `spec.md` 만 훑고 형제 **수용 기준 문서**를 통째로 빠뜨렸다.

- `:187` AC-GW-017 판정 열: 「핸들러가 `{roomId, botId}` 로 호출됨」 → 인자가 늘어 거짓
- `:873` 「다섯 관측(… `ConnInfo` 일치 …)」 → 거짓
- `:890` 「// Gateway 계약: **다섯 메서드**가 전부 함수다 (REQ-GW-021)」 → `sendToOrigin` 으로 여섯이 됨

㉢ 의 마지막 항목은 특히 **조용한** 부류다. 실제 시험(`server/test/gateway.test.ts:901`)은 포함 검사(`for (const m of [...]) expect(typeof gw[m]).toBe('function')`)라 여섯째 메서드가 생겨도 **초록으로 남는다** — 문서의 「다섯」만 거짓이 되고 기계는 아무 신호도 내지 않는다. 그리고 `gateway.test.ts` 는 §6 표 9행이 `:833`·`:878` 두 자리만 적은 파일인데, `:900-901` 이 **세 번째 낡는 자리**다.

**㉣ `SPEC-GWAUTH-002` 「발신 지점 다섯」** — 표에 이 SPEC 의 행이 하나도 없다.

- `spec.md:203` 「서버가 보내는 모든 경로(… `sendToBot` — **넷이 아니라 다섯이다**, §8)」
- `spec.md:624` 「`server/src/gateway.ts` 의 **발신 지점 다섯** — … 앵커: `grep -n 'send(ws\|sendToConn' server/src/gateway.ts`」
- `design.md:24` 「`send(ws, …)` 호출 지점 — **다섯**」
- `acceptance.md:931` 「**다섯 경로 각각에 양성 기준이 걸린다**」

`plan.md` §F M2-4 는 `sendToOrigin` 을 「`sendEstablished` 를 통해」 구현하라고 지시하고, REQ-PERMROUTE-004 는 봉투 규칙(REQ-GWAUTH2-012)을 명시적으로 승계한다. 즉 **여섯째 발신 지점이 생긴다.** 위 넷은 그 SPEC 의 본문·설계·기준 문서로, 「본문은 지금 참, 이력은 그때 참」 규칙상 개정 대상이다(`progress.md`·`plan.md` §C 의 실측 기록은 그때의 관측이므로 정당하게 제외된다 — 이 구분은 SPEC 이 §6.1 에서 옳게 세운 원칙이고, 다만 그 원칙을 이 SPEC 에 적용하지 않았다).

`SPEC-GWAUTH-002/acceptance.md:931` 은 스스로 이 사태를 예고했다: 「**앞으로 새로 생기는 발신 경로를 자동으로 감지하는 기준은 여전히 없다**」. 이 SPEC 이 정확히 그 새 경로다.

**§6.1 제외 목록의 경계 판정.** CHANGELOG 지난 항목 · `SPEC-LIVEVERIFY-001` 감사·증거 궤적 · `t32` 감사 보고서 · LIVEVERIFY `progress.md` — 이 넷의 제외는 **옳게 그어졌다.** 전부 그 시점의 기록이고, 살아 있는 거짓을 감추지 않는다. 문제는 제외가 넓은 것이 아니라 **포함이 좁은 것**이다.

**부수 관측 — AC-PERMROUTE-010 이 이것을 잡는가.** 잡을 수 있다. 그 기준의 (ㄴ) 방향(「실제로 뒤집힌 자리 중 표에 없는 것이 0건」)이 정확히 이 검사다. 그러나 그것은 **run 단계에서 실패로 드러난다**는 뜻이고, 계획 단계에서 이미 반증 가능한 표를 그대로 내려보내는 것과는 다르다. 게다가 AC-010 은 「9행」을 고정 수로 적어(`acceptance.md:21`·`:123`) 표가 늘어나야 한다는 결론과 자기 문언이 충돌한다.

### F-02 (major, 차단) — AC-009 의 명령이 자기 기준을 집행하지 못한다

`acceptance.md:115-117` 이 통과 조건의 집행자로 적은 명령을 **그대로** 현재 나무에서 돌렸다.

```
$ grep -rn 'sendToBot' server/src | grep -v 'interface Gateway' | grep -v '^\s*//'
server/src/permissions.ts:99:      const sent = app.gateway.sendToBot(info.roomId, info.botId, { type: 'permission_verdict', … })
server/src/gateway.ts:28:  sendToBot(roomId: number, botId: number, payload: object): boolean
server/src/gateway.ts:261:  // 발신 지점 다섯(welcome · sendStoredMessage · sendToConn/history_response · deliver · sendToBot)이 전부
server/src/gateway.ts:361:    sendToBot(roomId, botId, payload) {
exit=0
```

두 필터가 **하나도 걸러내지 못한다.**

- `grep -v 'interface Gateway'` — `:28` 은 `interface Gateway` **블록 안**에 있지만 그 줄 자체에는 그 문자열이 없다. 필터는 줄 단위이므로 통과한다.
- `grep -v '^\s*//'` — `grep -rn` 출력의 줄은 `server/src/gateway.ts:261:  // …` 로 **파일명부터** 시작한다. `^` 앵커가 주석이 아니라 파일명에 걸리므로 영원히 일치하지 않는다.

산문은 「`gateway.ts` 의 선언·구현·주석 **밖에** 적중이 0건」이라 옳게 적었는데(`:117`), 명령은 착지 후에도 3건을 돌려준다. 이 프로젝트의 기록된 두 부류가 겹친 자리다 — 「실패는 도구가 아니라 호출에 산다」와 「산문은 검사 범위를 좁혀 주지 않는다」. 통과선을 명령으로 못 박은 기준이 그 명령으로는 판정 불가다.

수리 방향(지시가 아니라 방향): 파일 경로를 함께 좁히거나(`grep -rn 'sendToBot' server/src --include='permissions.ts'`) 적중을 파일별로 세어 `gateway.ts` 3 · 그 외 0 을 단언하는 형태. 기제는 레인에 맡긴다.

### F-03 (major, 차단) — AC-007 은 변경 이전에 이미 통과한다

`acceptance.md:95` 이 적은 훑기 명령을 그대로 돌렸다.

```
$ grep -n "from '\.\./\.\./channel\|from 'channel\|channel/src" server/test/gateway.test.ts
exit=1
```

적중 0건 — 즉 **오늘, 아무 변경 없이 이미 통과다.** 나아가 서버 시험 디렉터리 전체에도 채널 import 가 없다.

```
$ grep -rn "channel" server/test/*.ts | grep -i "import\|require\|from '"
exit=1
```

기준의 나머지 절반(「그 파일이 전부 초록이다」)도 현재 나무에서 참이다. 그러므로 AC-007 은 **이 SPEC 의 변경 전후로 값이 바뀌지 않으며**, 이 SPEC 이 무엇을 했는지 하나도 측정하지 않는다. `acceptance.md:91` 이 「이것이 「해제했다」를 **재는** 방식이다」라 선언하고 `plan.md:110` §E 자기 검증이 「주장 대신 측정 가능한 성질을 잰다」로 그 위에 서 있으므로, 공허한 기준이 계획의 자기 검증 한 항목을 떠받치는 모양이다.

**과잉 지적 방지 — 해제 자체는 측정되는가.** 측정된다. AC-PERMROUTE-003b(요청하지 않은 소켓 0건)와 AC-PERMROUTE-005(대체 발신 없음)가 서버가 남의 소켓에 판정을 보내지 않음을 직접 재고, 그것이 곧 가드가 불필요해지는 근거다. 따라서 카드가 요구한 (b)의 **실질은 덮여 있다.** F-03 은 「해제가 안 재진다」가 아니라 **「해제를 잰다고 이름 붙은 기준이 실제로는 아무것도 재지 않으며, 계획이 그것에 기대고 있다」**이다. AC-007 은 유지하되 「비회귀 불변식」으로 이름을 낮추고, 해제의 측정 책임은 003b·005 에 명시적으로 귀속시키는 것이 정직한 형태다.

덧붙여 **변이표에 `emitted` 가드를 제거하는 변이가 없다.** 「가드를 지워도 결과가 바뀌지 않는다」는 이 SPEC 의 중심 주장인데, 그것을 반증할 변이가 다섯 중 하나도 없다. §5 가 `channel/` 편집을 금지하므로 변이로 세우기 어렵다는 사정은 이해하나, 그렇다면 **잔여 위험으로 이름 붙여 공시**되어야 하고 지금은 그 자리가 없다.

### F-04 (critical, 차단) — 미결 표식 둘, 그중 하나는 이미 답이 나와 있다

```
$ grep -rn '\[NEEDS CLARIFICATION' .moai/specs/SPEC-PERMROUTE-001/
plan.md:54: [NEEDS CLARIFICATION: `ConnInfo.connId` 를 선택 필드로 둘 것인가 … 필수로 할 것인가]
plan.md:103:[NEEDS CLARIFICATION: 생산 호출자가 0 이 되는 `sendToBot` 의 처분 — 유지할 것인가 이 카드에서 제거할 것인가]
```

**§D-5(`sendToBot` 처분)는 정당한 리드 처분 자리다.** 되돌리기 비용이 비대칭이고(`plan.md:103`), 어느 쪽도 증거로 결정되지 않는 정책 선택이다. 계획이 기본값과 근거를 함께 올린 형태가 옳다.

**§D-1(`connId` 선택/필수)은 다르다.** 같은 절의 **결론이 이미 답했다.**

> `plan.md:52` 「비용은 전부 반대편 — 30자리 시험 리터럴 — 에 있고, 그래서 **`ConnInfo` 쪽을 선택으로 두고 `Established` 쪽에서만 좁히는 비대칭이 나온다**」

결론이 「선택」으로 확정하고 그 근거(30자리 무편집 + `Established` 좁힘으로 발급 누락을 타입이 잡음 + AC-002 가 생산 자리 하나를 직접 잼)까지 제시한 뒤, 두 줄 아래에서 같은 질문을 미결로 올린다. 계획이 가진 증거로 닫히는 질문을 닫지 않은 것이다.

**그리고 이 미결은 §6 표의 완전성을 결정한다.** 「필수」로 풀리면 형제 시험 30자리(아래 실측 확인)와 그 30자리를 축자 재현하는 형제 수용 기준 문서 약 15자리가 모두 개정 대상이 되어 표는 9행일 수 없다. 즉 **AC-PERMROUTE-010 의 「9행」이라는 고정 수는 미결의 한쪽 갈래에서만 참이다.** 미결과 기준이 서로를 인질로 잡고 있다.

### F-05 (major, 차단) — 변이표 5행 중 3행이 과소 계수

AC-PERMROUTE-011 은 「무너져야 하는 기준 (**정확히**)」을 요구하고, 어긋나면 기준을 고치지 말고 보고하라고 [HARD] 로 못 박는다(`acceptance.md:133`). 표를 기준 본문과 대조한 결과 3행이 어긋난다. **뿌리는 하나다 — AC-PERMROUTE-006(세 문구가 갈린다)이 라우팅 성공/실패에 종속되는데, 표가 그 결합을 계산에 넣지 않았다.**

| 변이 | 표의 주장 | 대조 결과 | 어긋남 |
|---|---|---|---|
| M1 (전원 발신 복원) | 003b | 003b | 일치 ✓ |
| M2 (프레임마다 새 `connId`) | 001 · 003a | 001 · 003a · **006** | 과소 |
| M3 (실패 시 `sendToBot` 대체) | 005 | 005 · **006** | 과소 |
| M4 (실패 문구 = 성공 문구) | 006 | 006 | 일치 ✓ |
| M5 (핸들러 호출에서 `connId` 제거) | 002 · 003a | **001** · 002 · 003a · **006** | 과소 |

도출(문서 대조로 확정 — 구현이 아직 없으므로 실행 관측이 아니다):

- **M2·M5 → AC-006 추가.** 두 변이 모두 브로커가 쥔 `connId` 가 어떤 접속에도 맞지 않게 만든다 → 모든 판정이 REQ-PERMROUTE-007 실패 갈래로 떨어진다 → (ㄱ)`yes` 와 (ㄴ)`no` 가 **같은 실패 문구**를 저장한다 → AC-006 의 「세 본문이 서로 모두 다르다」가 무너진다.
- **M5 → AC-001 추가.** AC-001 은 핸들러가 받은 `info.connId` 로 판정한다(`acceptance.md:33`). M5 가 그 인자를 제거하면 세 값이 전부 `undefined` 가 되어 「B 의 `connId` 는 그 값과 다르다」가 거짓이 된다.
- **M3 → AC-006 추가.** 대체 발신으로 (ㄷ) 갈래가 성공하면 (ㄷ)가 성공 문구를 저장해 (ㄱ)과 같아진다.

`acceptance.md:143` 은 「M3 이 003b 를 무너뜨리지 **않는** 것도 의도된 값이다」라며 한 행의 정밀도를 자랑하는데, 같은 행의 006 누락은 보지 못했다. 이 프로젝트의 기록된 부류 「규칙을 강화하면 모든 행을 다시 도출한다」의 재현이다.

M1 행은 **결과적으로** 맞지만 정의가 모호하다: `sendToOrigin(connId)` 은 (방, 봇)을 인자로 받지 않으므로 「(roomId, botId) 전원 발신으로 되돌린다」가 두 갈래로 읽힌다 — ⑴ `connId` 로 접속을 찾아 그 (방, 봇)의 전원에게 보낸다(→ 003b 만 무너짐, 표와 일치), ⑵ 대기 항목의 `ConnInfo` 에 든 (방, 봇)으로 보낸다(→ 죽은 소켓의 항목도 배달되어 **005 도 무너짐**, 표와 불일치). 「정확히 일치」를 요구하는 기준이 변이의 구현 세부에 종속되어 결정적이지 않다.

### F-06 (minor, 비차단) — 기준 개수 자기 진술

`acceptance.md:3` 「기준은 **12개**다」 · `spec.md:25` HISTORY 「수용 기준 **12개**」 · `acceptance.md:174` DoD 「AC-PERMROUTE-001..012」. 실제 기준은 **13개**다(003 이 003a/003b 로 분할). 게다가 분할된 003b 는 SPEC 스스로 「이 SPEC 의 무게중심」(`acceptance.md:51`)이라 부르는 기준이므로, 그것을 절반으로 세는 회계는 무게를 반대로 표현한다. Tier M 상한 16 은 어느 쪽으로 세도 안전하므로 상한 위반은 아니다. 「장부는 두 번째 출처가 있어야 한다」 부류.

### F-07 (major, 비차단) — 공시된 공백에 기준이 없다

`acceptance.md:168` 「**대기 항목에 `connId` 가 없는 경우**(선택 필드일 때) — `plan.md` §D-1 의 미결이 정한다. **미결이 풀리기 전에는 이 갈래의 기준을 쓰지 않는다**」.

미결의 기본값(선택 필드)이 채택되면 `open: Map<string, ConnInfo>` 의 값에서 `connId` 가 `string | undefined` 가 되고, `permissions.ts:99` 는 `sendToOrigin(connId: string, …)` 앞에서 반드시 좁히기 분기를 갖는다. **그 분기를 재는 기준이 하나도 없다.** AC-PERMROUTE-004 는 「어느 접속의 것도 아닌 `connId`」를 재지 `undefined` 를 재지 않는다. 계획 스스로 「선택 필드는 생산 코드에서 조용히 빠질 수 있고, 그때 판정은 … **사용자에게 보이는 오작동**이 된다」(`plan.md:54`)고 적은 갈래인데, 그 갈래에 기준이 없다.

정직하게 공시된 점은 인정한다 — 이 프로젝트가 기록한 「공시된 공백은 기준이 없으면 잠긴다」가 경고하는 정확한 모양이므로 비차단이되 명시적 처분이 필요하다.

### F-08 (minor, 비차단) — REQ-PERM-001 귀속 오기

`spec.md:166` 「REQ-PERM-001 의 「봇 연결 해제 시 대기 항목 정리」는 그 SPEC 이 명시적으로 범위 밖에 둔 항목이다」.

`SPEC-PERM-001/spec.md:188` 을 열어 확인했다. 그 항목은 실재하고 범위 밖인 것도 맞으나(따라서 **주장의 실질은 참**), REQ-PERM-001 에 매달린 항목이 아니라 §범위 밖의 독립 불릿이며 본문은 REQ-PERM-009 를 참조한다. 조항 번호 귀속만 부정확하다.

**검증한 앵커 중 정확했던 것들** (이 SPEC 의 인용 규율은 전반적으로 높다):

| SPEC 의 인용 | 판독 결과 |
|---|---|
| REQ-GW-020 `:174-176` 호출 모양 · `sendToBot` 통로 | ✓ `:175`·`:176` 축자 일치 |
| REQ-GW-021 `ConnInfo` 축자 고정 · `Gateway` **다섯** 메서드 | ✓ `:191`·`:192-198`, 메서드 정확히 5개 |
| REQ-PERM-004 축자 고정 + **2026-08-29 ROOMAUTHZ 개정 주석 선례** | ✓ `:106` + `:113-119` 주석 실재 |
| REQ-PERM-009 `:144` + 괄호 「그 방·봇의 연결이 없는 경우」 | ✓ 축자 일치 |
| REQ-PERM-003 「재시작으로 사라지며 수용된 설계」 | ✓ `:99` |
| `t32` sync-audit `:45` 요약 · `:118-137` 상세, 인용 두 줄 | ✓ 축자 일치 |
| `AC-CHANPERM-008` @ `CHANPERM-001/acceptance.md:166` | ✓ 정확히 그 행 |
| REQ-CHANAUTH-007 재생 방어 @ `:227-238` | ✓ |
| `LIVEVERIFY-001/progress.md:161` D-5(B) 이월 | ✓ 정확히 그 줄 |
| ROOMAUTHZ `:313-322`·`:378` 개정 형식 선례 | ✓ |

**실측으로 확인한 수치 주장** (전건 정확 — 이 SPEC 은 수를 옮겨 적지 않았다):

```
$ grep -rn 'sendToBot' server/src channel/src
→ 생산 호출자 1 (permissions.ts:99) · 자기 자신 3 (gateway.ts :28 선언 · :261 주석 · :361 구현)
$ grep -rc 'sendToBot' . | (제외 필터) → 시험 8 (gateway.test.ts 6 · room-members 1 · permissions 1) · CHANGELOG 1
$ grep -rn 'ConnInfo' server/src → gateway.ts 7 · permissions.ts 3
$ grep -c 'onGatewayRequest({' → permissions.test.ts 27 · room-members.test.ts 2 · web-permission-contract.test.ts 1 = 30
$ grep -rn "info).toEqual({ roomId" server/test/ → 정확히 2 (:833 · :878)
$ npm run typecheck -w server → exit 0
```

「~30 형제 시험」·「생산 호출자 정확히 하나」·「`ConnInfo` 소비자 정확히 둘」·「`toEqual` 두 자리」 전부 **내 명령으로 재현했고 일치했다.** 이 SPEC 이 typecheck 로 확인하지 않았다고 스스로 공시한 점도 정직하다. 다만 `onGatewayRequest(info, params)` 형태의 통과 호출 3자리(각 시험 파일 1개씩)가 추가로 존재한다 — 편집 대상은 아니나 소비자 목록에는 든다.

### 범위 밖 판정 — `handleHistory` 를 제외한 것은 방어 가능한가

**방어 가능하다.** `spec.md:193` 은 같은 부류임을 인정하고, 수리가 한 줄이 됨도 인정하고, 하지 않는 이유를 「소비자 짝(`rid` 대조)의 실태를 아직 재지 않았으므로 같은 근거를 갖지 못한다」로 댄다. 근거 없이 확대하지 않는다는 판단이며 후속 후보로 등재도 했다. 카드 t34 의 「보여줄 것」은 판정 경로 하나이므로 카드 의도보다 좁지 않다.

**다만 한 가지가 어긋난다.** `spec.md:237` 성공의 정의 2번은 「판정 전달의 정확성이 `channel/` 의 어떤 코드에도 기대지 않는다」로 판정에 한정해 옳게 썼으나, 카드 요약 수준에서 「판정이 그 출처에만 닿는다」가 「게이트웨이가 그 출처에만 답한다」로 읽히면 `history_response` 가 반례가 된다. F-01 ㉣ 와 겹치는 자리이기도 하다 — `sendToConn` 은 GWAUTH-002 가 「다섯째 발신 경로」로 이름 붙인 그 자리다.

### 내 쪽의 과잉 지적 (스스로 판정)

- **F-08(REQ-PERM-001 귀속)** 은 과잉에 가깝다. 주장의 실질은 참이고 조항 번호만 부정확하다. minor·비차단으로 낮췄고, 수리하지 않아도 오독을 낳지 않는다.
- **F-06(12개/13개)** 도 경계선이다. 상한 위반이 아니고 어떤 기준의 판정도 바꾸지 않는다. 다만 이 프로젝트가 자기 회계 오류로 반복해 데었으므로 남긴다.
- **AC-008 을 공허로 적지 않았다.** 착지 전 나무에서 통과한다는 점은 AC-007 과 같으나, AC-008 은 **비회귀 불변식**으로 자기 성격을 옳게 선언했고 그 자리에서는 공허가 아니다. AC-007 과 다르게 취급한 이유를 여기 적어 둔다.
- **변이표에 `emitted` 제거 변이가 없다**는 지적(F-03 말미)은 §5 의 `channel/` 편집 금지와 충돌하므로 「변이를 추가하라」는 처방이 아니라 「잔여 위험으로 공시하라」는 방향으로만 적었다.

---

## 4. 수리 방향 (지시가 아니라 방향 — 기제는 레인이 정한다)

우선순위 순.

1. **F-01** — §6 표를 어간 훑기로 다시 도출한다. 최소한 ㉠~㉣ 네 부류가 들어와야 하며, 그 결과 표는 9행일 수 없다. `AC-PERMROUTE-010` 의 「9행」 고정 수도 함께 재도출 대상이다. 훑기 명령과 자기 제외 여부, 측정 시점을 기준 본문에 함께 적을 것.
2. **F-04 §D-1** — 계획이 이미 가진 증거로 닫을 수 있는지 재판단한다. 닫으면 F-01 의 표 크기와 F-07 의 공백이 함께 결정된다. **§D-5 는 리드 처분으로 남기는 것이 옳다.**
3. **F-05** — 변이표 다섯 행을 기준 본문과 다시 대조해 전부 재도출한다. 한 행만 고치면 나머지가 새 규칙 아래 조용히 거짓이 된다. M1 의 정의도 구현 세부에 종속되지 않게 좁힌다.
4. **F-02** — AC-009 의 명령이 산문의 통과 조건을 실제로 집행하게 고친다. 고친 명령을 **그 형태 그대로 돌린 출력**을 인용할 것.
5. **F-03** — AC-007 의 이름과 역할을 「비회귀 불변식」으로 낮추고, 「가드 해제」의 측정 책임을 AC-003b·005 에 명시 귀속한다. `emitted` 제거를 재는 변이가 없다는 사실을 잔여 위험으로 공시한다.
6. **F-07** — 미결이 「선택」으로 닫히면 `info.connId === undefined` 갈래의 기준을 세운다.
7. **F-06 · F-08** — 개수 진술과 조항 귀속을 정정한다.

**주의 — 정정이 자기 기록을 낡게 만든다.** 위 수리는 대부분 「§6 표는 9행」·「기준은 12개」·「형제 넷을 개정한다」를 여러 자리에서 참조한다. 최소 다음 자리가 함께 움직인다: `spec.md:25`(HISTORY) · `spec.md:211-221`(표) · `acceptance.md:3`(개수) · `:21`(AC-010 행) · `:123`(9행) · `:174-176`(DoD) · `plan.md:111`(§E 자기 검증) · `plan.md:148-156`(M5 마일스톤). 한 자리만 고치면 나머지가 거짓이 된다.

---

## 5. 감사 자신의 미검증 (Gaps)

빈 §Gaps 는 강한 주장이므로 이름 붙여 적는다.

- **기준선 210/126 을 재실행하지 않았다.** `plan.md:14-15` 의 실측 주장은 그 레인의 관측이며, 나는 `npm run typecheck -w server`(exit 0)만 독립 실행했다. 시험 통과 수는 검증하지 않았다.
- **F-05 의 변이 결과는 실행 관측이 아니다.** 구현이 존재하지 않으므로 기준 본문 대조로만 도출했다. run 단계에서 실제 변이로 재확인해야 확정된다.
- **`SPEC-GWAUTH-002` 의 「다섯」 적중 전수를 세지 않았다.** `spec.md`·`design.md`·`acceptance.md` 에서 살아 있는 자리 넷을 확인했고, `plan.md`·`progress.md` 의 적중은 그때의 실측 기록으로 분류했다. 그 분류가 자리별로 정확한지는 개정 시점에 다시 판독해야 한다.
- **`channel/` 쪽 126 기준의 내용을 열어보지 않았다.** `AC-CHANPERM-008` 이 acceptance 문서에 있음만 확인했고, 그 시험이 실제로 스위트 안에서 초록인지는 실행하지 않았다.
- **`web-permission-contract.test.ts` 의 내용을 읽지 않았다.** 리터럴 1자리만 셌다.

## 6. 잔여 위험

- F-01 을 닫으면 개정 대상이 두 배 가까이 늘어 M5 마일스톤의 크기가 바뀐다. Tier M(5-15 파일) 경계에 압력이 생길 수 있으며, 그 경우 Tier 재판정이 필요할 수 있다.
- §D-1 이 「필수」로 닫히면 형제 시험 30자리 + 형제 수용 기준 문서 약 15자리가 함께 움직여 이 카드가 Tier M 상한을 넘길 가능성이 있다.
- 이 감사는 1회차다. 2회차는 위 결함 델타에 한정해 재판정하며, 미해소 결함은 다른 점수와 무관하게 자동 FAIL이다.

---

## 7. 재판정 조건

- MP-7 표식 2건이 리드 처분으로 닫힐 것 (§D-5 는 「처분했다」는 기록으로 닫히고, §D-1 은 증거로 닫히거나 처분으로 닫힘)
- 차단 결함 F-01·F-02·F-03·F-05 가 해소될 것
- 총점 **0.80 이상** (`.claude/rules/moai/workflow/spec-workflow.md:141`)

2회차는 이 결함표의 델타 + 회귀 검사로 범위를 좁혀 수행한다.
