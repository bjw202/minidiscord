# SPEC-GWAUTH-002 진행 기록

## §E.2 Run-phase Evidence (M1 — 스키마와 발급)

> 작성자: manager-develop (카드 `t22` run, M1). 모든 출력은 이 나무(`.claude/worktrees/t22`, 브랜치 `WT-gateway-mutual-auth`)에서 이 실행이 직접 관측한 것이다. 요약 대신 원문을 원칙으로 하고, 50줄을 넘는 출력은 `.moai/state/verify/t22-run/` 아래 파일로 남기고 경로와 일부만 적는다.

### E.2.1 spec_base_sha 와 현재 HEAD

```
$ git rev-parse HEAD   → f89b61cbba248d083a180f4cdff604a26024a4d7   (§C 0 — 예상값 f89b61c 재확인)
$ git branch --show-current → WT-gateway-mutual-auth
```

- `spec_base_sha` = `f89b61c` (AC-GWAUTH2-021 의 한 끝점). M1 은 **커밋하지 않는다** — `impl_head` 는 리드가 커밋을 게이트할 때 그 커밋으로 확정된다.
- 현재 HEAD 도 `f89b61c` (M1 종료 시점까지 커밋 없음 — 전부 작업 트리에 미커밋).

### E.2.2 §C 사전 점검 — 전 단계 출력

**§C 0 — 기준 커밋**: 위 E.2.1 과 같다. 예상과 일치(`f89b61c` / `WT-gateway-mutual-auth`).

**§C 1 — base 실측** (변경 전 나무):

```
$ npm test                      → exit 0
  server : Test Files 15 passed (15) · Tests 183 passed (183)
  channel: Test Files 6 passed (6)  · Tests 81 passed (81)
$ npm run typecheck --workspaces → exit 0   (서버·채널 둘 다 tsc --noEmit 통과)
$ ls channel/dist/index.js       → 존재 (8220 bytes, 08-30 11:33) — 재빌드하지 않았다 (node v24.12.0)
```

원문: `.moai/state/verify/t22-run/c1-base-test.txt` · `c1-base-typecheck.txt`. **base = 264 초록(183+81), 신규 실패 0.**

**§C 2 — 붕괴 규모 네 행 재측정** (plan 값 vs 실측 — `spec.md` §3.3 은 «상한이며 실측이 아니다» 였다):

| 행 | plan 값 | M1 실측 | 판정 |
|---|---|---|---|
| `welcome` 을 보내는 하네스 자리 | 6 (t15 이전 인용) | **7** (`gateway-client` 3 · `index-wiring` 1 · `permission-relay` 1 · `transport-auth` 2; `channel-server`·`gateway-mutual-auth` 0) | **어긋남** — t15 착지 이후 늘었다 |
| 영향 집합 상한 (channel 4개 파일 `it(`) | 55 | **65** (17+14+14+20) | **어긋남** — 상한이 10 늘었다 |
| `SPEC-GWAUTH-001` 의 기준 | 15건 중 대부분 | v1 스위트 26it(`gateway.test.ts`) — 대부분 v1 프로토콜 | plan 서술과 일치 |
| server 쪽 | 미측정 | **21자리** (gateway 14 · web-permission-contract 2 · room-members 1 · permissions 1 · channel 3) | **신규 실측** |

원문: `c2-welcome-rows.txt` · `c2-it-counts.txt` · `c2-server-side.txt`. **AC-GWAUTH2-021 허용 집합 개정 요청**은 E.2.6.

**§C 2b — 서버 발신 지점 [HARD]**: `grep -n 'send(ws\|sendToConn' server/src/gateway.ts` → **예상 다섯 자리와 정확히 일치** (`:109` welcome · `:123` sendStoredMessage · `:202` sendToConn/history_response · `:213` deliver · `:231` sendToBot). 덧걸린 세 적중은 정의행(`:144` send · `:201` sendToConn)과 `:194` handleHistory 호출부로, D-6 표의 «유일한 호출자 :194» 와 일치한다. **개수·위치 델타 0 — AC-GWAUTH2-023 의 대상 경로 재정의 불필요.** 원문: `c2b-send-points.txt`.

**§C 3 — sha256Hex 전 소비자** (`grep -rn 'sha256Hex' server/` + 전나무 보강):

- 생산 코드 3: `routes-bots.ts`(정의·발급 INSERT·주석) · `gateway.ts`(import + hello 조회 유도) · `channel/src/gateway-client.ts`(v1 hello 전송)
- 시험 7: `gateway.test.ts` · `web-permission-contract.test.ts` · `room-members.test.ts` · `permissions.test.ts` · `rooms-bots.test.ts` · `messages.test.ts` · `channel/test/gateway-mutual-auth.test.ts`

처분은 E.2.5. 원문: `c3-sha256hex.txt`(server 한정) · `c3-sha256hex-full.txt`(전나무).

**§C 4 — 스키마 실측**: `token_hash TEXT UNIQUE NOT NULL` 외 나머지 열은 §D-3 의 신설 둘을 제외하면 동일. 원문: `c4-schema.txt`.

**§C 5 — Ed25519 유도**: `node -e …` → **32** (기대값 일치). 원문: `c5-ed25519.txt`.

**§C 6 — 채널 바인딩 전제**: `typeof …TLSSocket.prototype.exportKeyingMaterial` → **`function`** · `grep -rn 'https\|createSecureServer' server/src/*.ts` → **NO_TLS_IN_SERVER**. 둘 다 기대대로 — **중단 조건 해당 없음**. 원문: `c6-tls-proto.txt` · `c6-no-tls.txt`.

### E.2.3 base 대비 스위트 (M1 착지 후)

```
$ npm test                      → exit 1
  server : Tests 73 failed | 110 passed (183)
  channel: Tests 1 failed  | 80 passed (81)
$ npm run typecheck --workspaces → exit 0   (M1 편집 후에도 0)
```

원문: `c1-post-test.txt`(1차 — 옛 개발용 DB 잔존 상태) · `c1-post-test2.txt`(2차 — 아래 참조) · `c1-post-typecheck.txt`.

**74 실패 전건의 귀속 — 전부 v1 저장 계약·v1 프로토콜의 붕괴(문서화된 붕괴, `spec.md` §3.3)다:**

| 파일 | 실패 | 허용 집합 | 오류 부류 |
|---|---|---|---|
| `server/test/gateway.test.ts` | 26 | 안(사전 허용) | v1 시드(token_hash INSERT)·v1 핸드셰이크 |
| `server/test/permissions.test.ts` | 24 | **밖 — 개정 요청** | 같음 |
| `server/test/messages.test.ts` | 13 | **밖 — 개정 요청** | 같음 |
| `server/test/web-permission-contract.test.ts` | 5 | 안(사전 허용) | 같음 |
| `server/test/room-members.test.ts` | 4 | **밖 — 개정 요청** | 같음 |
| `server/test/rooms-bots.test.ts` | 1 | **밖 — 개정 요청** | v1 저장 계약 단언(`:213` SELECT token_hash) |
| `channel/test/gateway-mutual-auth.test.ts` | 1 | 안(사전 허용) | v1 시드(`:70` INSERT token_hash) |

오류 원문 분류: `table bot_tokens has no column named token_hash` 71 · `no such column: token_hash` 2 · `Test timed out`(gateway.test.ts 의 buildServer 배선 관측) 1. **이 세 부류 외의 실패는 0이다** — 가드 오작동·무관한 회귀 없음.

**1차 실행과 2차 실행의 차이**: 1차는 `server/data/minidiscord.db`(gitignore 된 개발용 DB, v1 모양)가 남아 있어 `buildServer()` 류 관측이 전부 **가드 오류**로 실패했다(health.test.ts 등). 이는 §D-3 판정이 설계대로 «큰 소리로 거절»한 것이다. **그 파일을 조사 후 삭제했다**(PRAGMA 확인: v1 열 구성, 행 수 **0** — 삭제로 잃은 데이터 없음). 2차 실행이 위 표다. 판단 기록: 개발용 DB 재생성은 §D-3 판정(아래)의 조작이며 git 추적 대상이 아니다.

**«신규 실패 0» 판정축에 대한 정직한 기술**: 이 74 실패는 §C 1 의 base(264 초록) 대비 **전부 신규 실패다**. 다만 그 부류·파일·원인이 §3.3 이 문서화한 붕괴와 정확히 일치하며, 그 교체가 M4/M5 의 소관이다. M1 단독으로 v1 스위트를 초록으로 되돌릴 방법은 없다 — 시드·조회가 전부 `token_hash` 를 이름으로 부르는 파일들(gateway.ts·시험 6개)은 M1 의 손대는 범위 밖이기 때문이다. «base 대비 붕괴분 외의 신규 실패 0» 이 M1 의 달성값이다.

**[리드 판정축 확정(2026-08-30)]** 이 축을 정본으로 확정한다 — 문자 그대로 «신규 실패 0» 은 보고서 어디에도 쓰지 않는다. 조건 둘: (i) 붕괴 집합(74)은 M2→M5 로 **단조 감소**해야 하고 각 마일스톤 보고가 감소분을 적는다, (ii) M4 가 v1 시드 제거와 함께 timeout 1건(gateway.test.ts 의 buildServer 배선 관측)의 소멸을 확인한다.

### E.2.4 J-03 — §B-0d 훑기 표 재측정과 교정

**측정**: `.moai/state/verify/t22-run/b0d-sweep.sh`(명령 원문 기록) · `b0d-sweep.out` · `b0d-hits.out`(적중 위치 전건). 다섯 문서, 출현 수(`grep -o`), 자기 포함 규약.

| 부류 | 표의 4회차 값 | M1 값 | 차이 이유 |
|---|---|---|---|
| 1 sendToBot | 10 | **11** | +1 = §B-0d 표 자신의 행(셀프캐치) |
| 2 째 행 | 6 | **7** | +1 = 같음 |
| 3 00[0-9]~0 | 6 | **6** | 없음 |
| 4 개수 서술 | 12 | **10** | −1 은 관측(4회차 자체 수정 «스물네 기준» → `grep -c` 0 확인). 나머지 −1 은 **추정** — plan 문서가 단일 커밋 착지라 사후 편집 전 나무 대조 불가 |
| 5 열쇠 유도 헬퍼 | 21 | **21** | 없음 |
| 6 하네스 접근자 | 18 | **18** | 없음 |
| 7 절 포인터 | 37 | **39** | +2 = 표 작성 뒤 편집(HISTORY·§3.1 처분) |
| 8 후속 카드 포인터 | 59 | **67** | +8 = 같음. 4회차가 고친 «t23 빠진 자리 둘» 은 M1 재확인에서 유지됨(`acceptance.md:894` 등이 t23 을 이름으로 지님) |
| 9 A~Y | 2 | **3** | +1 = §B-0d 표 자신의 행(셀프캐치) |
| 10 형제 파일 줄 인용 | 27 | 미재측정 | 인용 파일 개봉이 수반 — 표에 «4회차 값, M1 미재측정» 으로 귀속 명시 |
| 11 대응 주장 | 37 (좁은 어간 19) | **80** (줄 수 54 · 좁은 어간 74) | 4회차 값은 명령·단위 미기록 — **같은 방법 비교 불성립**(J-03 의 지적 그 자체). M1 값은 셀프캐치 행 포함 |

**수정한 자리** (`plan.md`): 표 머리 [HARD] 문장을 «4회차가 다시 실행한 것» → «M1 이 명령 원문과 함께 다시 잰 것, 4회차 값은 재현 실패로 대체» 로. 열 이름 «4회차 재측정» → «M1 재측정». 표 아래 **측정 귀속 문단** 신설 — 명령 원문(부류 11 파이프라인 전문 포함)·자기 포함 규약(셀프캐치 처분 포함)·측정 시점(`f89b61c`, M1 착수)·차이 사유. 표 제목의 «4회차» 서수 삭제(§B-0b 4번 — 낡을 수 있는 형태). «3회차 보고» 열과 «살아 있는 낡은 자리» 열의 성격은 유지.

**셀프캐치 처분**: 어간 선언(`§B-0b` 표·`§B-0d` 표의 행)은 훑기의 정의 자체라 이름을 바꿀 수 없으므로 **알려진 셀프캐치로 기록**이 처분이다(§B-0b 4번의 «이름으로 바꾼다» 를 적용하지 않는 근거를 문단에 적었다).

**미판독 공시**: 부류 11 의 80자리를 기준 본문 개봉 대조까지 전건 재판독하지 않았다 — 4회차가 공시한 같은 한계이며, 이 패스의 임무(J-03)는 값의 **귀속 복원**까지다. 생존 낡은 자리는 0(표 갱신 전 4회차 처분 유지 확인).

### E.2.5 D-3 마이그레이션 판정 · sha256Hex 처분

**D-3 판정 — 마이그레이션 문을 쓰지 않고, 개발용 DB 재생성으로 처리한다.** 근거: (1) 서버는 평문 토큰을 저장한 적이 없어 `token_hash` → `verifier_pub` 변환이 존재하지 않는다(§D-3 [HARD]) — 변환 불가인 마이그레이션은 행을 지우는 일의 다른 이름이다. (2) 운영자 결정 D1 이 «기존 초대 전부 무효» 를 승인했다. (3) 그래도 «조용히 남는» 상태를 막기 위해 **openDb 가 v1 모양 테이블을 큰 소리로 거절하는 검사를 넣었다**(db.ts — 파일이 이미 갖고 있던 `created_by` PRAGMA 검사와 같은 형태의 기존 선례). 실측: `probe-db-guard.mts` — 새 DB 는 v2 열로 생성, v1 모양 DB 는 SPEC-GWAUTH-002 메시지로 거절, 발급 INSERT 모양 수용 — **PROBE PASS**(`probe-db-guard.out`). 이 검사가 처음 걸린 실제 사례가 위 1차 실행의 옛 개발용 DB(행 0)며, 그 삭제로 판정이 그대로 이행됐다.

**sha256Hex 처분 — M1 에서 남기고, 주석을 실제 계약으로 고친다.** 소비자 전건(E.2.2 §C 3) 중 생산 소비자 둘이 M1 이 고칠 수 없는 파일에 산다: `gateway.ts`(M2 가 v2 핸드셰이크로 교체)와 `channel/src/gateway-client.ts`(M3). 지우면 typecheck 가 깨지므로 M1 삭제는 불가능하다. 그래서 **@MX:ANCHOR/@MX:REASON 을 이행기 계약으로 다시 썼다**: 남은 소비자는 v1 조회 경로와 v1 하네스 시드뿐, 마지막 소비자가 M2/M3/M4 에서 떠나면 지운다. v2 저장 계약은 신설 `deriveBotKeys` 가 대신하며 그 앵커가 §D-9 의 정본 위치다(채널 쪽 사본은 M3 에서 같은 형태로 지어 양쪽 앵커가 서로를 가리킨다).

### E.2.6 AC-GWAUTH2-021 허용 집합 — **개정 요청 (차단 항목으로 상위 보고)**

§C 2 실측에서 v1 프로토콜·저장 계약을 재는 하네스 넷이 **허용 집합 밖**에서 깨진다: `server/test/permissions.test.ts`(24) · `server/test/messages.test.ts`(13) · `server/test/room-members.test.ts`(4) · `server/test/rooms-bots.test.ts`(1). v2 착지(M3/M4)는 이 넷의 핸드셰이크·시드를 반드시 고치게 되므로 `git diff --name-only` 가 이 넷을 실제로 품게 된다. **몰래 넓히지 않고 개정을 요청한다** — 위 넷을 허용 집합에 더하는 것은 운영자·리드 결정이다. 이 요청은 M1 이 채운 표(E.2.3)가 그 근거 원문이다.

**[처분] 리드 승인(2026-08-30)** — 요청된 넷 **정확히 그 넷만** 허용 집합에 더하기로 확정됐다. 조건: (i) 이 넷 밖의 추가 넓힘은 또 요청으로, (ii) 승인 귀속을 이 절에 기록(이 문장), (iii) acceptance.md AC-021 본문 개정은 M1 커밋에 포함하고 커밋 메시지에 «개정 승인 리드 결정» 을 명시 — 셋 다 이행한다.

### E.2.7 J-02 — 양방향 프레임 기록 표면 정의

`acceptance.md` 하네스 절에 넷째 항목 **«서버 소켓 프레임 기록»** 을 신설했다: `recordSocket(socket)` → `sentFrames()`·`receivedFrames()`(파싱, 전선 순서)·`rawSent()`·`rawReceived()`(전선 원문 — 비(非)JSON 전송까지 놓치지 않는다). 붙는 곳은 **하네스가 소유한 진짜 서버가 받은 연결의 소켓**(채널은 자기 소켓을 내주지 않으므로 — `wire()` 는 PRESERVE), 소비는 AC-GWAUTH2-004 하나, **표면만 이 라운드가 정의하고 구현은 `plan.md` §F M4** 가 한다(M4 본문에도 그 사실을 적었다). AC-004 본문의 Given 이 표면 이름을 부르게 했고, «필요한 관측 대상이 이미 손 안에 있다» 근거 문장을 «표면은 하네스 절이 정의한다» 로 고쳤다(감사 J-02 처방). 기계 확인: `grep -c 'sentFrames\|receivedFrames\|recordingWire' acceptance.md` → **2** (≥2). J-01·J-05 의 기계 확인도 재실행에서 유지: «프레임 종류 전건» 0 · «내부 프레임» 5 · «전부.*넓이에 맞춰» 0 · REQ 21/AC 24 변동 없음.

### E.2.8 M1 코드 변경 — 파일 목록과 요지

```
$ git status --short  (세션 잔여물 제외)
 M .moai/specs/SPEC-GWAUTH-002/acceptance.md
 M .moai/specs/SPEC-GWAUTH-002/plan.md
 M server/src/db.ts
 M server/src/routes-bots.ts
?? .moai/state/verify/t22-run/
```

- `server/src/db.ts` — bot_tokens: `token_hash` 삭제, `verifier_pub TEXT UNIQUE NOT NULL`·`server_confirm_key TEXT NOT NULL` 신설(§D-3 그대로), v1 모양 테이블 거절 검사 신설(위 판정의 강제).
- `server/src/routes-bots.ts` — `deriveBotKeys(token)` 신설(§D-1·D-2·D-9): 라벨 둘 + PKCS8 접두가 한 함수에 모이고 `@MX:ANCHOR` 가 정본 위치를 선언. 개인키는 돌려주지 않는다(REQ-GWAUTH2-001). 발급 INSERT 가 `verifier_pub`·`server_confirm_key` 를 저장(REQ-GWAUTH2-003). `sha256Hex` 주석 갱신(위 처분). 발급 응답 형태(평문 토큰 일회 노출)와 멤버십 게이트·재초대 철회 로직은 변하지 않는다.
- `deriveBotKeys` 실측 (`probe-derive.mjs` — 상수를 **파일에서 추출해** 검증): pub 64자 소문자 hex · 같은 토큰 같은 값 · 다른 토큰 다른 값 · `k_srv` 와 상이 · SPKI 접두 검증 경로로 서명 64B 왕복 `true`·변조 거절 `true` — **PROBE PASS**(`probe-derive.out`).

### E.2.9 §B-0 상시 훑기 — 이 패스의 편집이 낡게 만든 인용

M1 이 코드를 고친 뒤 어간 훑기(`routes-bots.ts:[0-9]` · `db.ts:[0-9]`)를 다섯 SPEC 문서에 돌렸다 — 적중 여섯:

| 자리 | 내용 | 처분 |
|---|---|---|
| `plan.md` §B-4 | `routes-bots.ts:11-13` · `gateway.ts:7` | **이 패스가 고쳤다** — 앵커 형태로 재도출 + M1 이행 기록을 덧붙임(plan.md 는 J-03 이전의 편집 범위에 있다) |
| `design.md` §A 표 | `routes-bots.ts:62-65` · `:11-13` · `db.ts:31-40` | **고치지 않고 기록한다** — design.md 본문은 run 단계의 손 범위 밖이다. 실제 현재값: 발급 블록 `:62-66`(INSERT 가 두 줄로), `sha256Hex` `:15-17`, `db.ts` bot_tokens `:31-42`. 다음 손주는 design.md 를 여는 단계(sync 또는 M5 의 형제 기준 본문 개정)에서 앵커로 재도출할 것 |
| `spec.md` §3.4·§8 | `routes-bots.ts:11-13` 둘 · `:62-65` · `db.ts:31-40` | 같은 처분 — spec.md 본문은 manager-develop 의 손 범위 밖(소유 행렬). §3.4 의 «run 단계 작업 항목» 예고는 §E.2.5 로 이행됐다 |

**이 절이 존재하는 이유**: §B-0 이 «훑기를 하고 적중을 남겨라» 요구하며, «고치지 않는다» 도 소유자와 함께 적혀야 누락과 구분되기 때문이다(§B-8 의 보고서 처분과 같은 형태).

### E.2.10 이 M1 이 주장하지 않는 것

- **요소 ④(채널 바인딩)·핸드셰이크·봉투의 구현은 아직 없다** — M2/M3 소관. 이 패스는 «검증자 저장» 한 요소의 저장 계약만 착지시켰다.
- **경계 진술**(plan §E 8)은 전체 구현 착지 시 쓰는 것이며 M1 단독으로는 아무 경계 주장도 하지 않는다. 다만 하나는 지금 참으로 적어 둔다: **중계형 중간자의 배제는 이 M1 이 아니라 TLS 배치(t23)의 조건부이며, M1 은 그와 무관하게 저장 값의 성질만 바꿨다.**
- **F-A8 처분**(plan §E 9)은 run 전체 종결 시점의 항목이다 — 이 패스에서 «도달 불가» 로 읽힐 문장을 어디에도 쓰지 않았다.
- **문서 개정 버전(bump) 없음** — J-02·J-03 편집은 v0.4.1 HISTORY 가 미리 선언한 «run 마일스톤 M1 이월»의 이행이며, frontmatter·버전 손은 리드·sync 단계의 것이다. spec.md HISTORY 행 본문은 그때 참 규약대로 손대지 않았다.

## §F Phase 4 Mode Selection

> **작성 시점 공시**: 이 기록은 첫 run 구현 스폰 **이후**에 쓰였다 — 스폰 전 기록 의무를 놓쳤고, 그 시점 차이를 여기 정직하게 적는다. 판정 내용 자체는 스폰 전에 성립해 있던 것이다(아래 근거).

**입력값**: tier L (REQ 21·AC 24) · M1 범위 = 코드 2파일 + SPEC 문서 2 + J-02·J-03 문서 이월 · 도메인 = 2 (server·channel — M1 은 server 한정) · 언어 혼합 = TypeScript + Markdown · 동시성 이득 = 낮음 (코딩 중심) · Agent Teams 전제 = 미요청 (실험적 표면 — 연산자 요청 없음).

**모드 평가**:

| 모드 | 선택 | 근거 |
|---|---|---|
| direct | 아니다 | 다중 파일 의미 변경 — 직접 실행 대상이 아니다 |
| **serial** | **선택** | 코딩 중심 Tier L — Anthropic 코딩 병렬화 경고 적용. M1 쓰기 표면이 좁고 J-03 표 교정 → M1 코드 편집이 순차 의존을 갖는다 |
| fanout | 아니다 | 코딩 중심엔 부적합(연구 병렬이 아님) — 단일 나무에 쓰기 에이전트 병렬은 충돌 위험만 더한다 |
| sweep | 아니다 | 기계적 단일 변환(≥30 파일)이 아니라 의미적 신규 코드 — §C.3 전제 불성립 |

Decision: serial

**근거**: 구현이 의미적 신규 코드이고 스키마→발급→(M2 이후)핸드셰이크가 순차 의존을 갖는다. 단일 워커 위임(general-purpose + manager-develop 역할 프롬프트, 카드 나무 안 — `isolation: worktree` 는 원격 기본 브랜치에서 새 나무를 만드는 회귀가 있어 배제)으로 쓰기 충돌이 구조적으로 배제된다. 이 결정은 리드 디스패치(Kickoff 승인, 반자동 진행)와 일치한다. **run 진입 감사 게이트 귀속**: plan 감사 PASS 0.86 은 4차 판정·사전 정리 수정 이전 트리(v0.4.0) 측정값이고(plan-done §0), 최종 나무(v0.4.1) 재채점은 없음 — run 진입은 연산자 Kickoff 승인(§6.1·§6.2 공시 후)으로 성립하며, artifact-hash 불변 조건은 성립하지 않은 채 운영자 결정으로 진입했다.
