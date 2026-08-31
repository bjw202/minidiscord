# 카드 `t22` — sync 단계 감사 보고 (`SPEC-GWAUTH-002`)

- **감사관**: sync-auditor (독립·회의적 판정자)
- **대상 나무**: `.claude/worktrees/t22`, 브랜치 `WT-gateway-mutual-auth`, HEAD `bc265a4` + 미커밋 sync 문서 편집 6건
- **렌즈**: `--security --deep`
- **일자**: 2026-08-31
- **판정**: **FAIL** — 조화평균 **0.836** < 통과선 **0.85**

> 이 보고의 모든 수치와 인용은 이 감사가 이 나무에서 **직접 실행해 관측한 것**이다. run 레인·sync 레인의 보고를 근거로 옮겨 적은 값은 하나도 없다.

---

## 0. 통과선 — 내가 읽은 자리

디스패치가 전한 값을 쓰지 않고 규정 원본에서 직접 읽었다.

| 근거 | 파일 : 줄 | 읽은 내용 |
|---|---|---|
| 티어 | `.moai/specs/SPEC-GWAUTH-002/spec.md:15` | `tier: L` |
| 티어별 통과선 | `.claude/rules/moai/workflow/spec-workflow.md:142` | Tier L → **0.85** |
| 같은 값의 재진술 | `.claude/rules/moai/workflow/spec-workflow.md:330` | Tier S `0.75` · Tier M `0.80` · **Tier L `0.85`** |
| sync 4차원 조화평균 판정의 기계 정본 | `.claude/workflows/sync-audit-4dim.js:63` | `const THRESHOLD = … : 0.85` (기본값) |
| 판정식 | `.claude/workflows/sync-audit-4dim.js:224` | `harmonicMean >= THRESHOLD ? 'PASS' : 'FAIL'` |

**두 계통이 같은 값 0.85 로 수렴한다.** 하나는 티어 규칙(`spec-workflow.md:142`), 하나는 sync 조화평균 판정을 실제로 계산하는 스크립트의 기본 임계값(`sync-audit-4dim.js:63`)이다.

**평가 프로파일**: `spec.md` frontmatter(`:1-17`)에 `evaluator_profile` 필드가 **없다**. 따라서 `.moai/config/sections/harness.yaml:7` 의 `default_profile: "default"` 가 적용되고, 정본은 `.moai/config/evaluator-profiles/default.md` 다 — 가중치 40/25/20/15, must-pass 는 Functionality·Security, hard threshold 는 「Security FAIL = 전체 FAIL」과 「커버리지 85% 미만 = Craft FAIL」이다.

> `harness.yaml:171` 의 `levels.thorough.evaluator_profile: "strict"` 와의 관계를 적어 둔다. `sync-auditor` 의 프로파일 결정 순서는 ① SPEC frontmatter → ② `harness.default_profile` → ③ 내장 기본값이며 harness **레벨**의 프로파일은 그 순서에 없다. 그래서 `default` 로 채점했다. 참고로 `strict` 로 채점하면 「어떤 심각도의 보안 발견이든 1건 = 전체 FAIL」(`strict.md:23`)이라 아래 F1 만으로도 즉시 FAIL 이므로, 프로파일 선택은 이 판정의 방향을 바꾸지 않는다.

---

## 1. 판정 요약

| 차원 | 가중 | 점수 | 판정 | 증거(직접 실행) |
|---|---|---|---|---|
| Functionality | 40% | **0.88** | PASS | `npm test` → `Tests 188 passed (188)` + `Tests 95 passed (95)`, `EXIT=0` |
| Security | 25% | **0.85** | PASS | `grep -rc "https" server/src/*.ts` → 13개 파일 전건 `0`; `gateway.ts:56` `if (!(sock instanceof TLSSocket)) return 'unbound'` |
| Craft | 20% | **0.82** | PASS | `npx vitest run --coverage` → server `Statements 93.78%`, channel `Statements 88.62%` (둘 다 85% 초과) |
| Consistency | 15% | **0.80** | PASS | `npm run typecheck --workspaces` → `EXIT=0`; 명명·MX 태그 grep 20건 |

**조화평균** = 4 / (1/0.88 + 1/0.85 + 1/0.82 + 1/0.80) = 4 / 4.78235 = **0.83641**

**0.83641 < 0.85 → FAIL.**

must-pass 방화벽(Functionality·Security)은 **통과**한다 — Critical/High 발견이 없다. 판정을 뒤집는 것은 방화벽이 아니라 **조화평균**이며, 조화평균을 끌어내린 것은 Craft·Consistency 두 낮은 차원이다. 이것이 조화평균을 쓰는 이유 그대로다 — 산술평균이면 0.8375 로 같은 자리지만, 낮은 쪽이 둘이라는 사실이 가려진다.

---

## 2. 발견 (구조화 결함 목록)

각 발견은 `파일:줄` 과 **내가 실행한 명령**을 함께 적는다. grep 적중만으로는 가설이며, 전용 도구가 있는 자리는 그 도구를 돌렸다.

### F1 — [Medium] [**blocking**] `CHANGELOG.md:370` 이 지금 거짓인 저장 방식을 현재형으로 적고 있다

**위치**: `CHANGELOG.md:370`

> `- **봇 초대 API** — … 서버에는 sha256 해시만 저장합니다. … (SPEC-BOT-001)`

**실행한 명령과 관측**:

```
$ grep -n 'sha256 해시만 저장\|해시만 저장' CHANGELOG.md
370:- **봇 초대 API** — `POST /api/rooms/:id/invites`가 1회용 토큰과 세션 실행 명령을 돌려주고, 서버에는 sha256 해시만 저장합니다. …
CHANGELOG EXIT=0

$ grep -n "token_hash\|verifier_pub\|server_confirm_key" server/src/db.ts
35:  verifier_pub TEXT UNIQUE NOT NULL,   -- 조회 열쇠이자 검증자 — Ed25519 공개키 64자 hex …
36:  server_confirm_key TEXT NOT NULL,    -- 서버가 자신을 증명하는 대칭 비밀 …

$ grep -n "verifier_pub" server/src/routes-bots.ts
90:    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')…
```

`token_hash` 컬럼은 스키마에 없고 INSERT 도 하지 않는다. 그러므로 `:370` 은 **거짓**이다.

**왜 이것이 이 카드의 결함인가.** 같은 sync 패스가 **README 의 쌍둥이 문장을 고쳤다** — `git diff README.md` 의 `:114` 헝크가 「이 토큰의 sha256 해시만 저장하기 때문에」를 「토큰 자체도, 그 해시도 저장하지 않고 검증자와 서버 확인 열쇠만 저장하기 때문에」로 바꾼다. 즉 이 패스는 그 주장이 거짓임을 **알고 있었고**, 한 파일에서만 고쳤다.

**뿌리 — 훑기 패턴 집합이 파일마다 달랐다.** 레인 자신의 기록 `.moai/specs/SPEC-GWAUTH-002/progress.md:451-453` 이 그 사실을 적고 있다.

```
- grep -n '후속 카드 `t22`\|토큰 해시\|sha256 해시만 저장\|하위 호환은 유지\|예전 그대로 환영' README.md → EXIT=1, 출력 0줄
- grep -n '하위 호환은 유지\|token_hash' CHANGELOG.md → 4줄
```

README 에는 **다섯 어간**을, CHANGELOG 에는 **두 어간**을 걸었다. `sha256 해시만 저장` 은 CHANGELOG 쪽 집합에 없었고, 그래서 살아남았다.

내가 README 쪽 집합을 재현했더니 그대로다 — `grep -n 'sha256 해시만 저장\|하위 호환은 유지\|토큰 해시\|예전 그대로 환영' README.md` → `EXIT=1`(0줄). README 훑기는 정확했다. 결함은 **훑기의 대칭성**에 있다.

**정정이 자기 형제를 남긴다** — 이 저장소가 t7·t9·t10·t15·t21 에서 반복해 온 바로 그 형태이며, 이번에는 「고친 파일」과 「안 고친 파일」 사이에서 났다.

**보강 관측**: `:370` 이 서술하는 헬퍼 자체도 죽어 있다(F2 참조).

**요구되는 수정**: `:370` 의 문장을 현재 저장 방식으로 고치거나, `t2` 항목 머리에 이 패스가 `t15` 항목에 붙인 것과 **같은 형태의 교체 공시**(`CHANGELOG.md:70`)를 붙인다. 그리고 **양쪽 파일에 같은 어간 집합을 걸어** 다시 훑는다.

---

### F2 — [Low] [non-blocking] `sha256Hex` 가 호출자 0인 채로 export 되어 남아 있다

**위치**: `server/src/routes-bots.ts:16-18`

**실행한 명령과 관측**:

```
$ grep -rn "sha256Hex" server/src server/test
server/src/routes-bots.ts:16:export function sha256Hex(s: string): string {
server/test/gateway.test.ts:182:// … 구현이 쓰는 코드(sha256Hex)를 부르지 않고
```

정의 1건과 **「부르지 않는다」고 적은 주석** 1건뿐이다. 실제 호출자는 없다.

**전용 도구로 확인**: `npx vitest run --coverage`(server) 의 출력이 `routes-bots.ts | 95.91 | … | 17` 로 **17행을 미커버**로 짚는다 — `sha256Hex` 의 본문 줄이다. grep 가설을 커버리지 도구가 확인해 준 자리다.

`export` 되어 있어 TypeScript 미사용 경고에도 걸리지 않는다. v1 저장 방식의 잔해이며, F1 이 서술하던 바로 그 해싱이다.

**요구되는 수정**: 함수를 제거한다. (제거하면 F1 의 문장이 가리킬 대상도 함께 사라져 두 발견이 한 번에 닫힌다.)

---

### F3 — [Medium] [**blocking**] `onWelcome` 선언이 **같은 패스가 방금 고친 SPEC 의 API 표면**보다 좁다

**위치**: `channel/src/gateway-client.ts:15` vs `.moai/specs/SPEC-CHANCLIENT-001/spec.md:96`

**실행한 명령과 관측**:

```
$ grep -n "onWelcome\|missed_after_id" channel/src/*.ts server/src/gateway.ts
server/src/gateway.ts:215:    sendEstablished(conn, ws, { type: 'welcome', room_id: …, bot_id: …, bot_name: …, missed_after_id: … })
channel/src/gateway-client.ts:15:  onWelcome?: (w: { room_id: number; bot_id: number; bot_name: string }) => void
channel/src/gateway-client.ts:194:          if (inner.type === 'welcome') opts.onWelcome?.(inner)
```

서버는 **다섯 필드**를 보내고, 채널은 `inner` 를 통째로 넘기며(`:194` — 동작은 옳다), 타입 선언만 **세 필드**다. 빠진 것은 `type` 과 `missed_after_id` 다.

그런데 이 패스가 편집한 `spec.md` 의 API 표면은 다섯 필드를 선언한다. `git diff .moai/specs/SPEC-CHANCLIENT-001/spec.md` 헝크:

```
-  onWelcome?: (w: { type: 'welcome'; …; missed_after_id?: number; proof?: string }) => void
+  onWelcome?: (w: { type: 'welcome'; …; missed_after_id?: number }) => void
```

즉 이 패스는 그 줄에서 `proof?` **하나만** 걷어냈고, 코드가 `type`·`missed_after_id` 둘을 결여한다는 사실은 보지 않았다.

**이것이 재발임을 이력으로 확인했다.**

```
$ git log --oneline -L 15,15:channel/src/gateway-client.ts
ec0faf2 feat(SPEC-CHANCLIENT-001): M1 … (card t4)
+  onWelcome?: (w: { room_id: number; bot_id: number; bot_name: string }) => void
```

`t4` 의 M1 이래 코드는 한 번도 넓어진 적이 없다. `spec.md:27` 의 v0.6.1 HISTORY 가 「v0.6.0 은 `type`·`missed_after_id` 를 빠뜨렸다 — 선언이 실제 프레임보다 좁으면 그 자체가 계약과 어긋난다. 둘을 더했다」고 적지만, **더해진 곳은 SPEC 문서뿐이고 코드는 아니었다.** v0.6.1 이 명시적으로 이름 붙인 결함이 코드 쪽에서는 한 번도 닫히지 않은 채 살아 있다.

**계약 위반의 성격**: `REQ-CHANCLIENT-003` 이 「**프레임 객체 그대로**」를 명령하고, `acceptance.md` 의 AC-CHANCLIENT-002 가 「`onWelcome` 인자가 `missed_after_id` 를 포함해 서버가 보낸 객체와 완전히 같음」을 단언한다. **동작은 그 단언을 통과한다** — 내가 돌린 채널 스위트 95/95 초록이 그것을 포함한다. 어긋나 있는 것은 **선언**이며, 그래서 소비자는 `missed_after_id` 를 캐스트 없이 볼 수 없고 `plan.md:184`·`:242` 가 경고한 「세 필드로 추려 넘기기」와 **같은 모양의 타입**을 API 표면에 노출한다.

**요구되는 수정**: `channel/src/gateway-client.ts:15` 를 `spec.md:96` 과 글자 그대로 맞춘다 — `(w: { type: 'welcome'; room_id: number; bot_id: number; bot_name: string; missed_after_id?: number })`. 한 줄이다.

---

### F4 — [Low] [non-blocking] `SPEC-CHANCLIENT-001/plan.md` 가 v1 프레임 계약을 현재형 표로 이고 있다 — **결함으로 세우지 않는다**

**위치**: `.moai/specs/SPEC-CHANCLIENT-001/plan.md:60`, `:68`, `:91`

**실행한 명령과 관측**:

```
$ grep -n "hello\|token\|welcome\|missed_after_id\|HISTORY_TIMEOUT" .moai/specs/SPEC-CHANCLIENT-001/plan.md
60:| 소켓 `open` 직후, 첫 프레임 | `{ "type": "hello", "token": "<opts.token>" }` |
68:| `welcome` | `onWelcome(msg)` — 객체 그대로. `missed_after_id` 를 포함한다 |
77:const HISTORY_TIMEOUT_MS = 10_000
91:expect(srv.messages[0]).toEqual({ type: 'hello', token: 'tok123' })
```

절 제목은 「§C 되돌리기 어려운 결정 — 프레임 계약」이고, 도입부는 「이 SPEC 은 계약을 **정하지 않고 따른다**」라고 적는다.

**판정 — 남겨 둔 것은 옳다.** 세 가지 근거다. ① `plan.md` 는 **완료된 SPEC 의 plan 단계 산출물**이며, 「그때 어떤 계약을 따라 만들었는가」의 기록이다. ② 그 절 스스로 자기가 **원본에서 옮겨 온 종속 기록**임을 밝히고 있어, 독자가 이것을 「지금의 계약」으로 오인할 유인이 `spec.md` 본문보다 낮다. ③ `:91` 은 **원본 테스트의 안티패턴 예시**로 인용된 코드이며 계약 주장이 아니다 — 고치면 오히려 그 절의 논증이 깨진다.

다만 이 패스가 `CHANGELOG.md:70` 과 `spec.md` §4.2·§5 에서 **교체 공시를 붙이는 관행**을 스스로 세웠으므로, 그 관행을 여기에만 적용하지 않은 것은 비대칭이다.

**권고(요구 아님)**: §C 머리에 한 줄 포인터 — 「이 표는 v1 계약이며 `SPEC-GWAUTH-002` 가 교체했다」.

---

### F5 — [Low] [non-blocking] `acceptance.md` 의 하네스는 손으로 뜬 스냅숏이다 — **사본 자체는 충실함을 기계로 확인했다**

**위치**: `.moai/specs/SPEC-CHANCLIENT-001/acceptance.md` §공통 테스트 하네스

**실행한 검증**(눈으로 보지 않고 스크립트로 대조했다):

```
$ python3 …  # acceptance.md 의 첫 ```ts 블록을 추출해 channel/test/gateway-client.test.ts 와 대조
doc harness lines: 136
MISSING LINES: 0
ordering violations: 0
src line of last doc line: 137
total src lines: 432
```

문서 블록의 **모든 비어 있지 않은 줄이 실제 테스트 파일에 글자 그대로 존재**하고, **순서도 어긋나지 않으며**, 실제 파일의 1~137행(하네스 구간)을 덮는다. **사본은 충실하다.**

**손으로 뜬 스냅숏이 수용 가능한가 — 판정: 조건부 수용.** 이 하네스는 시나리오 본문이 읽히려면 문서 안에 있어야 하고, 「구현을 부르지 않는 자체 계산」이라는 사본 원칙(`plan.md` §D-9)이 이 중복을 의도한다. 그러나 **기계적 대조 장치가 없어** 다음 편집에서 조용히 갈릴 수 있다 — 갈렸을 때 그것을 잡는 것은 지금 감사관의 손뿐이다.

**권고**: 이 두 자리가 일치함을 재는 기준을 하나 세우거나, 문서가 파일·행 범위를 가리키게 바꾼다.

---

### F6 — [Medium] [non-blocking] `npm test` 에 빌드 단계가 없는데 채널 시험 셋이 `dist` 자식을 띄운다

**실행한 명령과 관측**:

```
$ cat package.json
"scripts": { "test": "npm test --workspaces --if-present" }

$ python3 -c "…json.load(open('channel/package.json'))['scripts']"
{'dev': …, 'build': 'tsc', 'test': 'vitest run', 'typecheck': 'tsc --noEmit'}      ← pretest 없음

$ grep -rn "dist" channel/test/*.ts
channel/test/transport-auth.test.ts:35:const DIST = fileURLToPath(new URL('../dist/index.js', import.meta.url))
channel/test/gateway-mutual-auth.test.ts:355:    const DIST = …
channel/test/index-wiring.test.ts:104:const DIST = …

$ grep -n "dist" .gitignore
3:dist/

$ git ls-files channel/dist
(빈 출력 — 추적되지 않음)
```

세 시험 파일이 **빌드 산출물을 자식 프로세스로 띄우는데**, 그 산출물을 만드는 단계가 시험 명령 안에 없고 산출물은 git 에 없다. 즉 **깨끗한 체크아웃에서 `npm test` 는 이 카드가 인용한 283/0 을 재현하지 못한다.**

**주장 자체는 거짓이 아니다** — 내가 빌드된 나무에서 재현했고(§4), CHANGELOG 의 283 은 참이다. 결함은 **재현 절차의 불완전성**이며, 이 저장소는 같은 함정을 이미 한 번 밟았다(카드 `t10` — 빌드 없이 테스트해 거짓 실패 3건).

**권고**: `channel/package.json` 에 `"pretest": "tsc"` 를 넣는다. 한 줄로 재현 가능성이 닫힌다.

---

### F7 — [Medium] [non-blocking] 간헐 실패의 원인 판정: **부하 민감 타이밍 흔들림이며, 낡은 `dist` 가 아니다**

디스패치가 관측한 1회 실패는 `channel/test/transport-auth.test.ts` 의 `both nonces are regenerated per socket and a replayed challenge is refused`(`waitFor` 3초 초과)였고, `npm run build -w channel` 후 재현되지 않았으며 **변수 둘이 함께 바뀌어 원인이 분리되지 않았다.**

**분리했다.** 그 시험은 `dist` 를 쓰지 않는다.

```
$ grep -n "^import\|from '\.\./" channel/test/transport-auth.test.ts
14:import { wire, isTransportAllowed, resolveUrl } from '../src/index.js'      ← src, dist 아님

$ grep -n "function attachWireTo" -A 25 channel/test/transport-auth.test.ts
246:async function attachWireTo(stub: Rogue) {
247-  const { channel, gw } = wire({ url: …, token: 'tok' })                    ← 인프로세스
…257-  await waitFor(() => stub.sent.some(m => m.type === 'hello'), 'hello 도착')
```

실패한 시험(`:707`)은 `attachWireTo` 로 들어가고, 그 경로는 **전 구간 인프로세스**이며 `DIST` 상수를 한 번도 건드리지 않는다(`DIST` 사용처는 `:547·555·563·592·594·596·891` — 전부 다른 시험이다). vitest 가 `src` 를 그때그때 변환하므로 **`channel/dist` 의 신선도는 이 시험의 결과에 인과적으로 닿을 수 없다.** 빌드는 함께 바뀐 무관한 변수였다.

**그러면 남는 설명은 타이밍이고, 그 기준은 실제로 부하에 민감하다.**

```
$ grep -n "waitFor" channel/test/transport-auth.test.ts
261:async function waitFor(pred: () => boolean, label: string, ms = 3000): Promise<void> {

716:    await waitFor(() => w.notes.length === 1 && w.verdicts.length === 1, '첫 소켓 기준선')      ← 기본 3000ms
721:    await waitFor(() => stub.connections() === 2, '재접속', 4500)                              ← 의도적으로 4500
```

**같은 시험 안에서** `:721` 은 3000 이 모자라다고 판단해 4500 으로 올렸는데, 실패한 `:716` 은 기본값 3000 그대로다. 저자가 이 파일에서 3000 의 부족을 **이미 한 번 겪고도 형제 자리를 훑지 않은** 자국이며, 이 카드가 반복해 온 「정정이 자기 형제를 남긴다」의 테스트 코드판이다.

**부하 여유를 측정했다**(부하를 새로 만들지 않고, 격리 실행 시간과 스위트 시간을 비교하는 방식으로):

```
$ cd channel && time npx vitest run test/transport-auth.test.ts
   Test Files  1 passed (1)   Tests  30 passed (30)   Duration  65.51s
   … 37% cpu 1:05.81 total

(전체 채널 스위트: Duration 65.32s / 6 files)
```

이 한 파일이 채널 스위트 전체 시간을 **혼자 채운다**. 한가한 기계에서는 3000ms 가 넉넉하지만, 이 저장소는 병렬 세션 과부하 이력(load 413)을 가지고 있고 그 조건에서 3000ms 는 실제로 넘어간다.

**판정**: 낡은 `dist` 가설은 **기각**한다(경로로 반증). 부하 민감 타이밍 흔들림이며, **AC-GWAUTH2-011 을 재는 이 시험은 지금 형태로는 신뢰할 수 있는 증거가 아니다** — 붉어져도 방어가 무너졌다는 뜻이 아니기 때문이다.

**권고**: `:716` 의 대기를 `:721` 과 같은 넓이로 올리고, 이 파일의 나머지 기본값 `waitFor` 를 **어간으로 훑어** 함께 처리한다.

---

### F8 — [Low] [non-blocking] 첫 유효 봉투는 `inner.type` 과 무관하게 세션을 확립한다

**위치**: `channel/src/gateway-client.ts:188-196`

```
        if (!established) {
          established = true   // 확립 — 봉투 welcome 이 왔을 때만이다 …
          …
          if (inner.type === 'welcome') opts.onWelcome?.(inner)
          return
        }
```

주석은 「봉투 `welcome` 이 왔을 때만」이라고 적지만, 실제 제어 흐름은 **mac·seq 를 통과한 첫 봉투이기만 하면** `established = true` 로 간다. 내부 종류가 `welcome` 이 아니면 그 프레임은 조용히 버려지고 세션만 선다.

**보안 영향 없음** — 유효한 봉투를 만들려면 세션 열쇠가 필요하고, 세션 열쇠는 `auth` 검증을 통과한 서버만 가진다(`server/src/gateway.ts:205-210`). 상대가 여기 도달했다면 이미 정당한 서버다. **주석이 코드보다 좁다**는 문서 정확성 항목으로만 기록한다.

---

## 3. 디스패치가 지목한 공격 지점에 대한 판정

### ① 감사 점수 귀속 (0.86) — **통과**

```
$ grep -rn "0\.86" .moai/specs/SPEC-GWAUTH-002/ .moai/reports/t22/run-done.md README.md CHANGELOG.md
.moai/specs/SPEC-GWAUTH-002/spec.md:25:   … PASS 0.86 ≥ Tier L 통과선 0.85 … 0.86 은 이 수정 **이전** 나무에서 측정된 4회차 판정이고 …
.moai/specs/SPEC-GWAUTH-002/progress.md:181: … 사전 정리 수정 이전 트리(v0.4.0) 측정값이고 … 최종 나무(v0.4.1) 재채점은 없음
.moai/specs/SPEC-GWAUTH-002/progress.md:474: … 이 값을 최종 트리의 점수로 읽으면 안 된다.
.moai/reports/t22/run-done.md:31: … 최종 나무의 재채점은 없다 …
.moai/reports/t22/run-done.md:57: … sync 감사가 최종 트리 점수로 오독하지 않게 한다.
```

**네 자리에서 일관되게 「v0.4.0 사전 정리 이전 트리 측정값·재채점 없음」으로 귀속**한다. 최종 트리 점수로 제시하는 자리는 하나도 없다. 더해서 **`README.md`·`CHANGELOG.md` 에는 `0.86` 이 한 번도 나오지 않는다** — 사용자 대면 문서가 감사 점수를 주장하지 않는다는 뜻이며, 이 자리에서 가장 위험한 오독 경로가 애초에 없다.

### ② 사용자 대면 문서의 과장 — **통과**

**F-01 처분이 코드에서 성립하는가.**

- *위조 종단 갈래가 닫혔는가*: `server_proof` 의 열쇠는 `server_confirm_key` 이고(`server/src/gateway.ts:205-208` 의 `hs.confirmKey`), 그 값은 토큰에서 유도된다(`routes-bots.ts:33` — `createHmac('sha256', token).update(CONFIRM_LABEL)`). `hello` 를 받기만 하는 상대가 얻는 것은 `pub` 과 `client_nonce` 뿐이고, `pub` 은 토큰의 단방향 파생물이다(`routes-bots.ts:30-31`). 따라서 **k_srv 를 만들 수 없다 → 증명도 봉투도 만들 수 없다.** 문서의 「닫혔다」는 참이다.
- *중계 갈래가 열려 있는가*: ③에서 실측으로 확인했다. 참이다.

**「F-01 이 닫혔다」로 읽힐 수 있는가 — 없다.** 세 자리가 모두 갈래를 명시적으로 가른다.

- `README.md:5` — 「**v2로 F-01의 «위조 종단» 갈래는 닫혔지만, «중계형 중간자» 갈래는 지금 어떤 배치에서도 배제되지 않습니다**」 … 「판정도 아직 FAIL이고」
- `README.md:222` — 소제목 자체가 「**갈래 하나는 닫혔고, 갈래 하나는 지금 어떤 배치에서도 열려 있습니다.**」
- `README.md:225` — 항목 말미 태그가 「**(F-01, Critical — 중계 갈래 미종결)**」

심각도 표기(`Critical`)를 낮추지 않았고 채널 플러그인의 전체 판정을 `FAIL` 로 유지했다.

**`t23` 배포 경고 — 있고, 정확하고, 배포자가 보는 자리에 있다.**

```
$ grep -n 't23' README.md   → :5(상태 문단) · :225(F-01 중계 갈래) · :236(배포 경계 블록 인용)
$ grep -n 't23' CHANGELOG.md → :57(배포 경계 절)
```

`README.md:236` 의 블록 인용은 「그래서 지금 권하는 사용법은 하나입니다」 **바로 다음 줄**에 있다 — 배치 방법을 읽으러 온 독자의 시선 경로 위다. 내용도 정확하다: 「배포를 막는 조건은 카드 `t22` 의 미종결이 아니라 `t23` 의 미종결」이라고 **막는 주체를 바르게 지목**하고, 「"상호 인증이 완성됐으니 올려도 된다"로 읽으면 안 됩니다」로 오독까지 선제 차단한다.

### ③ `unbound` 채널 바인딩 주장 — **인용을 믿지 않고 실측했다. 참이다.**

```
$ grep -rc "https" server/src/*.ts
server/src/auth.ts:0        server/src/gateway.ts:0      server/src/db.ts:0
server/src/config.ts:0      server/src/room-members.ts:0 server/src/index.ts:0
server/src/permissions.ts:0 server/src/mention.ts:0      server/src/routes-bots.ts:0
server/src/routes-messages.ts:0 server/src/routes-rooms.ts:0
server/src/sse.ts:0         server/src/routes-events.ts:0
```

**13개 파일 전건 0.** 서버 소스 어디에도 `https` 라는 문자열조차 없다.

```
$ sed -n '1,40p' server/src/index.ts
33:  const app = Fastify({ logger: false })      ← https 옵션 없음
74:  await app.listen({ port: config.port, host: config.host })
```

Fastify 를 TLS 옵션 없이 만들고 평문으로 listen 한다. 그러므로 게이트웨이가 얹히는 소켓은 `TLSSocket` 이 아니고,

```
$ sed -n '50,65p' server/src/gateway.ts
56:    if (!(sock instanceof TLSSocket)) return 'unbound'
```

는 **언제나** `'unbound'` 를 반환한다.

**독립 도구의 교차 확인**: server 커버리지 출력이 `gateway.ts | … | 60-64` 를 미커버로 짚는다 — `channelBinding` 의 **TLS exporter 갈래**(57-64행 중 실행되지 않는 구간)다. 즉 「TLS 경로가 한 번도 실행되지 않는다」를 커버리지 도구가 독립적으로 증언한다.

문서의 「어떤 배치에서도 `unbound`」는 참이다.

### ④ 형제 SPEC 정정 품질

**(a) 날짜 박힌 정정 블록을 보존하고 덧붙인 것 — 옳다.**

v0.6.0 이 세운 판단 기준은 「자기 설계 결정·자기 카드 미이행 기록은 보존하고(D4), **시스템의 현재 상태 서술**은 고친다」이다(`spec.md:29` 의 ⑧ 근거). 이 패스는 그 기준을 **양쪽으로 정확히 적용했다**.

- *고친 자리(현재 상태 서술)*: `spec.md` §1 흐름도(`:45-46`), 용어표 `handshake`(`:66`), `GatewayClientOpts` API 표면(`:96`), REQ-CHANCLIENT-001(`:121`), REQ-CHANCLIENT-003(`:133-137`), §5 범위 밖(`:239`) — 전부 본문이며 전부 다시 쓰였다.
- *보존하고 덧붙인 자리*: §4.2 머리 주석(`:150-156`)과 §5 상대 인증 절(`:253-257`) — 둘 다 「**v0.6.0 정정**」이라는 **날짜가 박힌 정정 기록**이다. 새 블록은 「위 두 문단은 v1 트리에서 참이었고 그 날짜에 대해서는 그대로 둔다. 지금 참인 것은 이렇다」로 시작해 현재 사실을 **자신이 진다**.

핵심은 v0.6.0 이 「고쳐야 한다」고 판정한 대상이 **살아 있는 본문의 현재 상태 서술**이었지 **정정 기록 자체**가 아니었다는 점이다. 정정 기록을 덮어쓰면 「그때 무엇을 왜 틀렸는가」가 사라지고, 다음 라운드의 훑기가 그 자리를 다시 밟는다. **보존+추가는 원칙의 오용이 아니라 정확한 적용이다.**

**(b) 하네스 사본** — F5 참조. **사본은 기계 대조로 충실함을 확인**했고(누락 0줄·순서 위반 0), 스냅숏 방식은 대조 장치 부재를 조건으로 수용한다.

### ⑤ 미종결 항목이 조용히 사라지지 않았는가 — **다섯 항목 전건 공시 유지**

| 항목 | 확인한 자리 |
|---|---|
| 채널→서버 방향 프레임 무결성 | `README.md:224` 뒤 항목 · `CHANGELOG.md:47` — 「관문 하나에 의존한다」로 「닫혔다」와 구별해 적음 |
| 선택적 억제 미탐지 | `README.md:226` · `CHANGELOG.md:48` — 「누락은 흔적을 남기지 않습니다」 + 「이번에 확인하지 않았다는 사실 자체를 적어 둡니다」 |
| 억제 후속 카드 미등록(운영자 2026-08-30 결정) | `progress.md:430` — 「(3) 억제 미탐지 공백 — 운영자 미등록 결정 유지」로 **결정 자체가 기록으로 남음** |
| 타이밍 비상수성 | `README.md:228` · `CHANGELOG.md:49` · `acceptance.md:562` — 「요구하지만 재지 않습니다… 그 자리는 코드 리뷰가 지킵니다」 |
| F-A8 처분 문언 | `progress.md:418` — 「**도달 범위가 좁아졌고 기각하지 않았으며 128 상한 자체는 별도 카드가 필요하다**」 |

**F-A8 문언 검증**: `grep -rn "F-A8"` 로 6개 자리를 전건 확인했다. 「도달 불가」로 읽힐 문장은 **하나도 없고**, 오히려 `plan.md:495`·`acceptance.md:917`·`progress.md:161` 세 자리가 「«도달 불가» 로 적으면 미충족이다」를 금지 조항으로 세워 둔다. **요구를 넘어 스스로 감시 장치를 걸었다.**

**「관측 불가」 변이 넷**: `progress.md:401` 이 네 행(L·M·N1 의 013/015, S 의 004, U·P 의 022, AA 의 009)을 각각 **왜 관측되지 않는지의 기제와 함께** 적고, `:430`·`run-done.md:36` 이 「기준 신설은 본 카드 범위 밖 → 상위 회부」로 처분을 남긴다. 조용히 지워지지 않았다.

### ⑥ 두 미결 발견 — F3(코드 선언), F4(plan.md v1 계약) 참조

### ⑦ 낡은 정정 훑기 — **F1 이 생존자다**

어간(관용구 아님) 기준으로 네 파일을 훑었다: `token_hash` · `해시만 저장` · `하위 호환` · `nonce` · `proof`.

- `README.md` — 생존자 0. (`:147-149`·`:155`·`:224` 의 적중은 전부 v2 를 서술하거나 v1 부재를 선언하는 자리다.)
- `.moai/specs/SPEC-CHANCLIENT-001/{spec,acceptance}.md` — 생존자 0.
- `CHANGELOG.md` — **생존자 1건 → F1(`:370`)**. `:85`·`:87` 의 v1 서술은 `:70` 의 교체 공시가 덮으므로 결함이 아니다.

### ⑧ 시험 무결성 — §4 참조

---

## 4. 5절 증거

### 4.1 주장 (Claim)

1. `npm test` 가 서버 188 · 채널 95 = **283건 전건 통과**, 종료 코드 0.
2. `npm run typecheck --workspaces` 종료 코드 0.
3. 커버리지가 두 워크스페이스 모두 85% 기준을 넘는다.
4. 서버는 TLS 를 종단하지 않으며 채널 바인딩은 언제나 `unbound` 다.
5. `CHANGELOG.md:370` 이 현재 코드에 대해 거짓이다.
6. `channel/src/gateway-client.ts:15` 가 `spec.md:96` 보다 좁다.
7. 디스패치가 본 간헐 실패는 낡은 `dist` 가 아니라 부하 민감 타이밍이다.

### 4.2 증거 (Evidence) — 명령과 출력 원문

```
$ npm test ; echo "EXIT=$?"
 RUN  v4.1.11 …/worktrees/t22/server
 Test Files  15 passed (15)
      Tests  188 passed (188)
   Duration  7.94s

 RUN  v4.1.11 …/worktrees/t22/channel
 Test Files  6 passed (6)
      Tests  95 passed (95)
   Duration  65.32s
EXIT=0
$ grep -in "fail\|✕\|✗" <출력>      → 적중 0줄
```

```
$ npm run typecheck --workspaces ; echo "EXIT=$?"
> typecheck
> tsc --noEmit
> @minidiscord/channel@0.1.0 typecheck
> tsc --noEmit
EXIT=0
```

```
$ cd server && npx vitest run --coverage
All files          |   93.78 |    86.13 |   96.36 |   95.61 |
 gateway.ts        |   94.88 |    86.95 |   96.87 |   96.12 | 60-64,233
 routes-bots.ts    |   95.91 |    85.71 |      90 |   97.61 | 17
Statements   : 93.78% ( 573/611 )     Lines : 95.61% ( 480/502 )

$ cd channel && npx vitest run --coverage
All files          |   88.62 |    80.17 |   97.77 |      90 |
 gateway-client.ts |   93.93 |    88.73 |     100 |   95.53 | 74-78,215
 index.ts          |   63.63 |    54.83 |     100 |   64.86 | 98-123
Statements   : 88.62% ( 187/211 )     Lines : 90% ( 162/180 )
```

```
$ grep -rc "https" server/src/*.ts        → 13개 파일 전건 0
$ sed -n '33p' server/src/index.ts        → const app = Fastify({ logger: false })
$ sed -n '56p' server/src/gateway.ts      → if (!(sock instanceof TLSSocket)) return 'unbound'
```

```
$ grep -n 'sha256 해시만 저장\|해시만 저장' CHANGELOG.md
370:… 서버에는 sha256 해시만 저장합니다. … (`SPEC-BOT-001`)
EXIT=0
$ grep -n 'sha256 해시만 저장\|하위 호환은 유지\|토큰 해시\|예전 그대로 환영' README.md
EXIT=1        ← 0줄
```

```
$ git rev-parse HEAD    → bc265a4021f9cbf7fde721f78aff23a807f3e6e3
$ git branch --show-current → WT-gateway-mutual-auth
$ git status --short    → M 6건 (CHANCLIENT spec/acceptance, GWAUTH-002 progress/spec, CHANGELOG, README)
```

### 4.3 Baseline 귀속

- 283/0 · typecheck 0 · 커버리지 수치는 전부 **이 나무(`.claude/worktrees/t22`), HEAD `bc265a4` + 미커밋 문서 편집 6건**의 상태에서 **이 감사가 이 실행으로** 낸 값이다. run 레인의 `m6-final-test.txt` 나 sync 레인의 `sync-test.txt` 를 옮겨 적지 않았다(두 파일의 존재는 `ls` 로 확인했으나, 내 주장의 근거로는 쓰지 않았다).
- 커버리지는 **이 감사가 처음 측정한 값**이다 — run·sync 어느 보고도 커버리지 수치를 제시하지 않았고, 기본 프로파일의 hard threshold(85%)를 미측정으로 통과 처리할 수 없어 직접 돌렸다.
- 코드 인용은 전부 이 나무의 파일을 `sed`/`grep` 으로 직접 읽은 것이다. 이력 주장(F3 의 `ec0faf2`)은 `git log -L` 로 확인했다.
- **plan 감사 `PASS 0.86` 은 이 판정의 입력이 아니다.** 그것은 v0.4.0 사전 정리 이전 트리의 plan 단계 값이며, 이 sync 판정 0.836 은 **최종 트리에서 이 감사가 독립적으로 매긴 별개의 값**이다. 두 수를 비교하거나 이어 읽어서는 안 된다.

### 4.4 Gaps (미검증)

- **린터가 존재하지 않는다.** `.moai/state/verify/t22-sync/gate-lint.txt` 가 `Missing script: "lint"` 를 두 워크스페이스 모두에서 기록한다. 나도 재확인했다. `quality.yaml` 의 `lsp_quality_gates.sync.require_clean_lsp: true`·`max_warnings: 10` 을 **잴 도구가 이 저장소에 없다** — 통과가 아니라 공백이다. Craft 점수에 반영했다.
- **뮤테이션 32건을 재실행하지 않았다.** `mutation-*.txt` 원문의 존재는 확인했으나 변이를 다시 코드에 넣어 재현하지 않았다. 감사 중 변이 실험은 이 저장소의 명시적 금지 사항이다.
- **게이트웨이를 실제로 띄워 프레임을 눈으로 보지 않았다.** 프레임 모양·전사 구성·순번 규칙은 소스와 스위트로 확인했고, 실환경 왕복은 run M2 프로브와 스위트가 진다.
- **`server/test/fixtures/tls-test-key.pem` 의 키 재질을 열어 보지 않았다.** 추적 범위가 `server/test/fixtures/` 안이고 `server/src` 에서 참조되지 않음만 확인했다(`grep -rn "fixtures" server/src` → 0줄).
- **`t10`·`t11`·`t16` 소유 문장의 정확성은 재지 않았다.** 이 감사의 훑기는 `t22` 가 낡게 만든 자리를 겨눴다.
- **`ROADMAP.md` 는 sync 레인이 미검증 gap 으로 남겼는데, 나는 확인했다** — `grep -n "t15\|token_hash\|상호 인증\|hello" ROADMAP.md` → **0줄**. 낡은 v1 서술이 없다. 이 gap 은 실제로는 비어 있다.

### 4.5 잔여 위험 (Residual-risk)

- **F7 이 남긴 흔들림은 계속 붉어질 수 있다.** `:716` 을 고치지 않으면 부하가 걸린 기계에서 AC-GWAUTH2-011 이 간헐 실패하고, 그때마다 「방어가 무너졌나」를 사람이 손으로 가려야 한다. 잘못된 방향의 비용이다 — 공허한 기준의 반대편, 정상 구현을 거짓 실패시키는 기준이다.
- **F6 이 남아 있는 한 CI·새 체크아웃의 첫 실행은 실패한다.** 이 저장소는 같은 함정을 이미 밟았다.
- **배치 위험은 이 감사가 줄이지 않았다.** 채널 바인딩은 여전히 모든 배치에서 `unbound` 이고, 중계형 중간자는 배제되지 않는다. **`t23` 이 닫히기 전 생산 배치 불가**는 유효하다.
- **`server_confirm_key` 를 쥔 상대의 게이트웨이 사칭**은 v2 의 가장 큰 잔여이고 소유 카드가 없다 — `README.md:227` 이 「그 범위는 지금 어느 카드도 소유하지 않습니다」로 적는다. **소유자 없는 잔여는 다음 라운드에서 잊힌다.**
- **이 나무는 미푸시 유일 사본이다.** 원격이 없어 sync 편집도 커밋되지 않은 채 리드 게이트로 간다. 나무를 폐기하면 유일 사본이 사라진다.

---

## 5. 판정과 되돌리는 최소 변경

### 판정: **FAIL** — 조화평균 0.836 < Tier L 통과선 0.85 (`spec-workflow.md:142`)

must-pass 방화벽은 통과했다(Critical/High 0건). FAIL 은 **차단 발견 2건이 Consistency·Security 를 끌어내렸고, 조화평균이 낮은 쪽을 벌하기 때문**이다.

### PASS 로 뒤집는 최소 집합 (차단 2건)

1. **F1** — `CHANGELOG.md:370` 의 「서버에는 sha256 해시만 저장합니다」를 고치거나, `t2` 항목 머리에 `:70` 과 같은 형태의 교체 공시를 붙인다. **그리고 README 에 건 다섯 어간을 CHANGELOG 에도 걸어 다시 훑는다**(반대 방향도 한 번).
2. **F3** — `channel/src/gateway-client.ts:15` 를 `spec.md:96` 과 맞춘다: `(w: { type: 'welcome'; room_id: number; bot_id: number; bot_name: string; missed_after_id?: number }) => void`. 한 줄이다.

이 둘만으로 Security 0.85→0.90, Consistency 0.80→0.90 이 되어 조화평균은 **0.874** — 통과선을 넘는다.

### 함께 처리하기를 강하게 권하지만 판정 조건은 아닌 것

- **F6** — `channel/package.json` 에 `"pretest": "tsc"`. 한 줄로 「깨끗한 체크아웃에서 재현 불가」가 닫힌다.
- **F7** — `transport-auth.test.ts:716` 의 대기를 `:721` 과 같은 넓이로. **어간으로 훑어** 형제 자리를 함께 본다.
- **F2** — `sha256Hex` 제거(F1 과 한 몸이다).
- **F4·F5·F8** — 포인터 한 줄 / 대조 장치 / 주석 정정.

### PASS 였다면 무엇이 그것을 막았을까 — 뒤집어 적는다

이 카드의 **실질**은 훌륭하다. 암호 설계가 옳고(형식 검사 선행 → `timingSafeEqual` → 검증 후 등록), 커버리지가 두 워크스페이스 모두 기준을 넘고, 무엇보다 **잔여 위험 공시가 이 저장소에서 본 가장 정확한 수준**이다 — 「TLS 배치 조건부 종결」이라는 자기 범위 규정, F-01 을 갈래로 가른 처분, `AC-GWAUTH2-024` 가 「평문 연결에서는 중계자가 이긴다」를 **양성으로** 매 실행 기록하게 한 설계는 전부 모범이다. 「닫았다」고 말하고 싶은 유혹을 네 자리에서 이겼다.

FAIL 은 그 실질이 아니라 **문서 정확성의 마지막 한 걸음**에서 났다. 두 발견 모두 **한 줄 수정**이고, 두 발견 모두 같은 형태다 — **정정이 자기 형제를 남긴다.** F1 은 「README 는 고치고 CHANGELOG 는 안 고쳤다」, F3 은 「SPEC 은 고치고 코드는 안 고쳤다」. 훑기 자체는 실행됐고 기록도 남았다. 다만 **훑기의 어간 집합이 파일마다 달랐고, 훑기의 범위가 문서에서 멈추고 코드로 내려가지 않았다.**

다음 라운드에 넘길 한 줄: **훑기는 대상 파일이 아니라 어간으로 정의하고, 같은 어간을 문서와 코드 양쪽에 건다.**

---

*판정자: sync-auditor. 이 판정은 구속력이 있으며, 여기 인용된 모든 명령은 이 감사가 이 나무에서 직접 실행했다.*
