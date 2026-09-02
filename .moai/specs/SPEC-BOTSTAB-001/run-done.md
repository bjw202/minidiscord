# SPEC-BOTSTAB-001 run 종결 보고 (카드 `t25`)

> 작성: run 레인(카드 t25 · `/moai run SPEC-BOTSTAB-001` · 반자율). 2026-09-01.
> **이 문서를 포함한 run 작업 전부 미커밋** — 리드 판독·승인 후 커밋한다(t8·t10 순서 준수).
> §M 훑기 대조는 sync 디스패치 몫이다(plan-done §4b) — 이 run 은 그 입력만 준비했다.

## 쉬운 말 요약

봇의 재접속 안전(F-11 — 접속이 끊긴 뒤 멈춤 명령을 받으면 더 이상 재접속하지 않는 동작을 아무 테스트도 재고 있지 않던 결함)과 모델 컨텍스트로 나가는 렌더 바이트 상한(F-09 — 알림·이력이 너무 크면 잘라 표시를 붙이는 기능)을 구현하고, 그 방어 각각을 겨냥한 회귀 기준을 세웠다. 채널 스위트는 계획 기준선 95 에서 **121** 로 늘었고(전부 인프로세스), 변이 실험 17행을 전부 직접 적용해 방어의 판별력을 관측했다. 소스 보호 대상(`gateway-client.ts`·`neutralizeEnvelope`·형제 SPEC 문서·`server/`)은 한 글자도 바뀌지 않았다. 발견한 것 중 리드 판정이 필요한 것은 §5 에 모았다 — 변이 예측 오배정 1건(G), 배선 순서 목격 결핍을 찾아 보강한 1건(K), 그리고 SPEC 본문 소유권 회부 셋.

## §0 귀속 — 이 문서의 모든 수치가 어디에서 나왔는가

| 항목 | 값 | 나온 자리 |
|------|-----|-----------|
| 나무 | `.claude/worktrees/t25` @ `7c9958b`(plan 커밋), 브랜치 `WT-bot-stability` — run 내내 HEAD 불변 | `git rev-parse --short HEAD` (run 레인 직접 실행, 여러 차례) |
| 최종 스위트 | **121 passed / 7 files (exit 0)** | `npx vitest run --root channel --reporter=dot` — 2026-09-01 17:33 run 레인 **직접 실행**(미커밋 run 작업 위 이 트리) |
| 단계별 스위트 | 95→98→107→116→119→120→121 | 각 마일스톤 종료 시 run 레인 직접 실행(전부 이 트리) |
| 타입 검사 | `tsc --noEmit` exit 0 | `npm run typecheck -w channel` (마일스톤별 재관측) |
| 소스 shasum 종결값 | `gateway-client 1cb17188…` · `channel-server 1cfd24b2…` · `index a9d44572…` · `truncate ebbfd01d…` | `shasum channel/src/*.ts` — run 레인 직접 실행. gateway-client 는 **계획 단계 기록값과 byte 동일**(M1 무변경 계약) |
| 변이 실측 | 17행 — 일치 16 / 불일치 1(G), 복원 불일치 0건 | `.moai/state/verify/t25-run/m5-mutation-observations.md` + 행별 `mutation-*.md` + 원본 `m5-raw/` |
| 형제 두 수 | 빨개지는 것 **0**(클린 스위트 관측) · 무효화되는 것 **33/33(M5 시점) → 생출력 34블록 기준 34/34** | 클린 전체 스위트 + 훑기 재실행. M5 게이트 시점 33블록이었고 K 보강(17:23) 뒤 34블록 — 34번째(AC-010 배선 목격, `channel-server.test.ts:547`)도 상수 보유라 AC-013 은 121 스위트에서 계속 PASS(run 레인·리드 재측정 일치) |
| 배치 프로브 | **PLACEMENT=OK** (exit 0) | `node .moai/state/verify/t25-plan/self-reference-probe.mjs channel/test/truncate.test.ts` — run 레인 직접 재실행 |
| 훑기 생출력 | **34블록** — 스냅숏 21 + M3·M4 신설 12 + AC-010 배선 목격 1(K 보강) | 훑기 스크립트 직접 실행 — run 레인 재관측 34 · 리드 재측정(2026-09-01 17:40–43) 34, 일치. 1차 보고의 «33» 은 K 보강(17:23) **이전** 캡처(`sibling-sweep-run-after.txt` 16:15 · `m5-sweep-rerun.txt` 17:11)의 낡은 수였다 |
| 플레이크 | `transport auth > both nonces are regenerated per socket and a replayed challenge is refused` 2회 출현·자가소멸 | `.moai/state/verify/t25-run/flake-observations.md` + 원본 `m5-raw/` |

**이 문서에 없는 수치.** 토큰 수·커버리지 백분율·LOC — 재지 않았으므로 쓰지 않는다.

## §1 착지시킨 것 (전부 미커밋)

| 파일 | 몫 | 내용 |
|------|-----|------|
| `channel/src/truncate.ts` (신설) | M2 | OD-1~5 상수 한 곳 · 시길 탈출 · UTF-8 바이트 측정·코드포인트 경계 절단 · 끝 표시 · **파생 ㉡ 정규식 수출**(`SIBLING_SWEEP_ASSERT_REGEX` — plan M2 [HARD] «문자열 두 곳 금지» 이행) |
| `channel/src/channel-server.ts` | M3 | `pushChatMessage` 이름·본문 조각 `truncateToBudget(neutralizeEnvelope(…), MAX_*)` — 중화 뒤 절단 · `buildAttachmentNote` 개수/경로당 갈라서 |
| `channel/src/index.ts` | M4 | `fetchHistory` 두 단계(원소별 절단 → 새것부터 버리기) · `cursor` = 실린 원소 id 최댓값(`doc(kept)`) |
| `channel/test/gateway-client.test.ts` | M1 | AC-001·003·012 신설 + `:416` 제목 교정(단언 무변경) |
| `channel/test/truncate.test.ts` (신설) | M2·M4a | AC-009·010·011 + INV-1/2/3 + [HARD] ㉡ 결합 + **AC-013**(생 훑기 파싱·빈 출력 실패 가드) |
| `channel/test/channel-server.test.ts` | M3·M4a·K | AC-004·005·006 + 엣지 + **AC-010 배선 목격**(K 보강) + M4a 경계 단언 |
| `channel/test/index-wiring.test.ts` | M4·M4a | AC-007·008 + E-1 + M4a 경계 단언 |
| `channel/test/gateway-mutual-auth.test.ts` · `transport-auth.test.ts` | M4a | 경계 단언 (추가만, 기존 단언 무삭제 — numstat 15/0 · 12/0) |
| `.moai/state/verify/t25-run/` | 전체 | 증거 26파일(행별 변이·통합표·훑기 출력·플레이크·최종 게이트) |
| `.moai/specs/.../progress.md` | run | §E.2·§E.3 완결 + §F 모드 선택(serial) |
| `.moai/specs/.../spec.md` | 소유 전이 | frontmatter `status: draft → in-progress` (본문 무변경) |
| `.moai/specs/.../run-done.md` | run | 이 문서 |

## §2 수용 기준 판정

- **AC-BOTSTAB-001~013 전건 PASS** — 각 기준의 명령·관측은 progress.md §E.2 와 행별 증거 파일 참조. AC-002 는 제목 교정된 기존 기준이 소유.
- **INV-1·2·3 PASS** — 우변 전부 런타임 계산값(INV-2 관측값: 16000 ≥ 4000 + 64 + 35).
- **[HARD] 배치 제약** — PLACEMENT=OK (run 레인 직접 재실행, exit 0).
- **[HARD] ㉡ 결합** — 파생 정규식이 모듈 수출 상수 11개 전부에 적중하는 기준이 스위트 안에서 매번 재실행됨.
- **실행 게이트** — `npm test -w channel` 초록(121), typecheck 0, 산술: 95 + 신설 26 = 121.

## §3 범위 경계 (전부 run 레인 직접 관측)

`git diff --stat` 에 `channel/src/gateway-client.ts` **부재** · `server/` 변경 **0건** · `neutralizeEnvelope` 본문 무변경 · `.moai/specs/SPEC-CHANINJECT-001/*` 무변경 · `truncate.ts` 제외 src 는 배선 최소 변경. 갱신은 훑기 생출력 안에 머묾 — M4a 는 그 시점 생출력 33블록에 수행했고, K 보강으로 늘어난 34블록째(AC-010 배선 목격)는 태어날 때부터 상수를 담았다(기존 단언 삭제 0건 — index-wiring 의 캡처 줄 1건 분리만 있고 의미 동일, 단언 `cursor === 42` 보존).

## §4 변이표 실측 — 요지

17행 전건 직접 적용(한 번에 하나, shasum 복원 쌍 기록, 복원 불일치 0). **일치 16 / 불일치 1**:

- **G (불일치 — 예측 오배정)**: 예측 «AC-007 실패» → 관측 «AC-008 실패». 1단계 원소별 절단이 단일 원소 시나리오를 이미 지켜 총바이트 검사의 실제 표면은 다중 원소(AC-008)였다. **방어는 잡힌다 — 예측이 잘못 붙은 것.** 본문 정정은 manager-spec 몫.
- **K (1차 생존 → 보강 후 일치)**: 1차 실측에서 변이가 아무 기준도 못 잡았다 — AC-010 이 원시함수 합성만 재고 배선(렌더 지점, 변이표 K행의 자리)을 지나지 않았기 때문. **배선 목격 기준 1건을 보강**하고 같은 변이를 재측정하니 정확히 그 기준 하나가 잡았다(`expected 4400 to be less than or equal to 4000` — 절단 먼저 → 중화 팽창이 그대로 노출). 1차 기록은 삭제하지 않고 이력으로 보존(`m5-raw/mutation-K.txt`).
- **N2**: 변이 블록을 `channel-server.test.ts:414` 로 정확히 지목 — ㉡ 의 판별력 확인(G-09 조건 사전 확인, «잴 수 없었다» 아님).

## §5 리드 판독 포인트 & 회부 사항

1. **M1 구현 판단 둘 (승인 또는 되돌림 — 각 수 분 비용)**: ① AC-001 의 sleep 을 «1ms 관용» 대신 **게이트형**(시험이 만료를 결정)으로 만듦 — 1ms 형태로는 «stop() 이 만료 전» 전제가 간헐적으로 깨지고, 깨진 전제에선 변이 B 도 통과하는 공허 통과가 됨을 확인. 계획의 실제 요구(주입 sleep·인자 수집·서버 쪽 술어·고정 setTimeout 금지)는 전부 유지. ② 교정한 제목 위의 옛 주석 한 줄도 같은 취지로 고침(단언 무변경).
2. **G 행 예측 오배정** — acceptance.md 변이표 예측 열 정정은 SPEC 본문 소유권(manager-spec). 관측 데이터는 통합표·행별 파일에 완비.
3. **K 의 잔여 — index.ts 이력 통로 자리의 순서 목격은 여전히 0** — 이번 보강은 알림 통로만 닫았다. 이력 자리는 «truncate 먼저 → 중화 나중»으로 바꿔도 총상한(OD-4 16,000)이 여유가 커서 결과 등식이 안 깨진다. **처방 스케치**(후속 카드 감): 이력 원소 `body` 의 `byteLength ≤ MAX_BODY_BYTES` 단언 + 봉투 팽창 fixture(알림 쪽과 같은 11/8 기제). SPEC 예측 밖의 신규 발견이라 run 이 멋대로 범위를 늘리지 않았다.
4. **acceptance.md 변이표 «관측» 열 채움 주체** — 본문이라 run 이 채울 수 없다. run 소유 데이터는 전 행 채움 상태(통합표). 채움 주체와 시점 리드 결정 필요.
5. **spec.md §3.3 스냅숏 낡음** — «21/13/8/19» 는 M3·M4 신설 12블록을 덧대기 전 값(생출력 34블록 — K 보강 1블록 포함). 재도출은 manager-spec 회부.
6. **플레이크 인계** — `transport-auth` 논스 테스트, 서로 다른 변이 실행에서 2회 출현·재실행마다 소멸(변이와 무관). M2 때 관측된 미특정 1회 실패도 같은 테스트로 추정(시점·빈도 일관). 원인 규명은 본 카드 밖.
7. **관찰** — 이 나무(base `2a19d7d`)의 `channel/package.json` 에는 `pretest` 가 없다(t27 의 pretest 는 미병합). 게이트 명령은 빌드 없이 vitest 만 돌았고 dist 가 있어 무영향.
8. **커밋 대기** — 승인 시 제안: 단일 run 커밋(`feat(SPEC-BOTSTAB-001): run 종결 — F-11 기준·F-09 절단 배선·변이표 전건 실측 (card t25)`)에 코드·테스트·frontmatter 전이·progress.md·`.moai/state/verify/t25-run/` 포함, **run-done.md 는 미커밋으로 두고 sync 인계 때 흡수**(t8 선례). 커밋 메시지 규약(`git_commit_messages: ko` · 🗿 MoAI 트레일러) 준수.

## §6 sync 인계

- `plan.md` §M 의무는 **sync 디스패치**로 간다(plan-done §4b 기록). 전달 3줄: ① `node .moai/state/verify/t25-plan/sibling-sweep.mjs` 재실행 ② 생출력 블록마다 단언 착지 확인 ③ 결과를 `.moai/reports/t25/sync-sibling-assertion-check.md` 에 기록·미착지 있으면 통과 아님.
- 판정 입력: `.moai/state/verify/t25-run/sibling-sweep-run.md`(갱신 전 생출력) · `m4a-evidence.md` §E2(블록별 착지표 33행). **명시: 착지표 33행은 K 보강(17:23) 이전 캡처 기준이고, 살아 있는 출력은 34블록이다 — 차분 1블록 = `channel-server.test.ts:547` AC-BOTSTAB-010 배선 목격(상수 보유·㉡ 적중). sync §M-1 은 «출력이 스냅숏과 다르면 출력이 이긴다» — sync 는 생출력 34블록으로 판정하며, 34번째 행의 착지 근거가 이 줄이다.**

## §7 Gaps (이 run 이 관측하지 않은 것)

- index.ts 이력 자리의 순서 반전 목격(§5-3 — 의도적 미착지, 리드 회부).
- 이름 조각 자리의 단독 순서 반전(짧은 fixture 탓에 관측 불가 — §5-1 ①의 게이트형과 무관한 자리).
- 플레이크 원인(§5-6 — 규명은 카드 밖).
- `server/` 스위트(95건)는 본 카드 변경이 server 를 건드리지 않아 실행하지 않았다 — 채널 게이트가 본 카드의 판정면이다.
- acceptance.md 본문의 예측·관측 열·§3.3 은 run 이 고치지 않았다(소유권 — §5-2·4·5).

## §8 잔여 위험

- 변이 실행 중 스위트는 여러 번 붉어졌지만 그 전부가 변이 상태의 예상 실패였고, 클린 상태에서의 실패는 플레이크 2회뿐(자가소멸). 다만 플레이크의 근본 원인은 미규명 — CI 에서 재현되면 §5-6 기록이 출발점이다.
- ㉡ 은 «식별자 적중»만 재고 «단언의 존재»·«경계의 옳음»은 재지 못한다 — plan.md §M-2(sync)와 acceptance 공시 한계 그대로다. 이 run 이 남긴 착지표(33행 + 34번째 블록 = AC-010 배선 목격, §6 명시 줄)가 sync 사람 판정의 근거다.
