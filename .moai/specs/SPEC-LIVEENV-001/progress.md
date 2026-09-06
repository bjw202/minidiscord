# SPEC-LIVEENV-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t35` (Class C — plan 필요)
- 작성: manager-spec, 2026-09-06, 워크트리 `.claude/worktrees/t35`
- 산출: `spec.md` · `plan.md` · `acceptance.md` · `progress.md` (Tier M, 4종)
- 요구사항 16건 ↔ 수용 기준 16건 (1:1)
- SPEC ID 정규식 검사: `SPEC-LIVEENV-001` → `PASS` (bash 실행 확인)
- 이름 충돌 검사: `.moai/specs/SPEC-LIVEENV-001` 부재 · `grep -rl "SPEC-LIVEENV" .moai/specs/` → 0
- 실측으로 딛는 전제: `spec.md` §1.2 의 F-1~F-12 **열두 건**
- 열린 물음: **0건.** v0.1.0 의 `[NEEDS CLARIFICATION]` 넷은 전부 닫혔다(v0.2.0).
  1. `status` 의 `principal` 축 (M1) — **리드 처분: 두 면을 함께 읽는다**(`api=` + `conn=`). 세 자리를 동시에 고쳤다: `spec.md` REQ-003 ㉢ · `acceptance.md` AC-003 · `plan.md` M1
  2. 토큰 파일 위치 (M2) — **리드 처분: `data/live-env/token`, 권한 `0600`**. `.gitignore` 편집 불필요(실측 `git check-ignore -v` → `.gitignore:2:data/` · `exit=0`)
  3. 봇 작업 디렉터리 (M3) — **리드 처분: `<wt>/bot-01`**(워크트리 안). `.gitignore` 에 `bot-01/` 한 줄이 필요하다(실측 `git check-ignore` → `exit=1`)
  4. 저장소 밖 디렉터리의 `.mcp.json` 적재 (M3) — **결정이 아니라 사실이었으므로 plan 단계에서 실측했다**(F-12). **적재된다** → `--mcp-config` 대안 분기 제거. 그리고 **첫 사용에 사람 승인**(`⏸ Pending approval`)이 붙는다는 사실이 함께 나와, 카드가 셋이라 적은 사람 손이 **넷**임이 드러났다
- **1회차 plan 감사(FAIL 0.74 / 통과선 0.80) 수리 완료 — v0.2.0.** 차단 12건 대응, 참고 3건 처분. 요구사항 16 · 수용 기준 16 불변(추가 없이 기존 항목 안에서 수리).
- 이 SPEC 은 `SPEC-LIVEVERIFY-001`(completed) 과 `SPEC-E2E-001`(completed) 을 **편집하지 않는다**. 두 울타리를 `AC-LIVEENV-015`·`AC-LIVEENV-016` 이 잰다. 1·2회차 수리 중 두 SPEC 은 **읽기만 했다**.
- **2회차 plan 감사(PASS 0.834 / 통과선 0.80) 권고 정리 완료 — v0.3.0.** 판정은 이미 통과였고 이 회차는 마무리다. 차단 권고 6건(B-1~B-6)·참고 5건(A-1~A-5) 전부 처분했고, **감사가 이름대지 않은 자리 하나를 더 닫았다**(DoD 3 의 대조군 목록에 `AC-006` 누락 — 여섯 → 여덟). 새 리드 처분을 요구하는 항목은 없었다. 요구사항 16 · 수용 기준 16 불변.
- **run 단계로 넘기는 미결 4건은 `plan.md` §E-1 표가 진다** — `status --unmeasured-paths` 의 실제 줄 수(G-1) · 변이 여섯의 실효성(G-2) · 엣지 케이스 셋의 성립 절차(G-3) · `invite` 출력 순서(G-4). 넷 다 스크립트가 없어 plan 단계에서 잴 수 없었고, **각 행이 그것을 닫는 run 단계 증거 파일을 지목한다.** 미관측을 통과로 옮기지 않는다.

## §E.2 Run-phase Evidence

**기준선 `<BASE>` = `5edd97f`** (착수 직전 커밋, `git rev-parse --short HEAD` 로 실측). `acceptance.md`
`AC-LIVEENV-015` 의 `<BASE>` 자리에 쓸 리터럴이 이 값이다. `plan.md` §C 는 그 값을 `acceptance.md` 에
적으라고 지시하지만, `acceptance.md` 본문은 plan 단계 소유라 run 단계가 고치지 않는다 — 대신 그
리터럴을 여기에 귀속시키고 이후 모든 측정이 변수가 아니라 이 값을 쓴다(빈 변수가 `HEAD..HEAD` 로
해석돼 무조건 초록이 되는 결함을 피하는 것이 그 지시의 목적이며, 리터럴 사용으로 그 목적은 지켜진다).

### 착수 전 확인 (pre-flight)

| 확인 | 실행 · 관측 |
|---|---|
| `node_modules` | 존재 (`ls node_modules` → 있음) |
| `channel/dist/index.js` | 존재 (11,120 바이트) |
| 도구 | `sqlite3`(/usr/bin) · `lsof`(/usr/sbin) · `python3`(/usr/bin) · `curl` · `npx` · `pgrep` · `stat` 전부 있음 |
| HEAD | `5edd97fd795f72798dea73e6f46edad59ff29a1e` |

### 착지한 산출물

| 파일 | 무엇 |
|---|---|
| `scripts/live-env.sh` | M0~M3 — `paths`·`up`·`down`·`status`(3값)·`invite`·`bot`·`token-sweep` |
| `scripts/live-extract.mts` | M4 추출기 CLI (`extract`·`capture`) |
| `server/test/live-extract-lib.ts` | M4 순수 함수. **배치 근거**: `server/` 타입 검사가 rootDir 밖 `.mts` 를 거절한다(실측 TS6059·TS5097). 형제 `gateway-v2.ts` 와 같은 자리 |
| `server/test/live-extract.test.ts` | M4 인프로세스 회귀 15건 |
| `server/test/fixtures/live-extract/{positive,negative}.jsonl` | 합성 fixture + **음성 fixture 짝**(같은 값을 `tool_result`·알림에 심었다) |
| `.gitignore` `bot-01/` 한 줄 | M3. 이 카드가 편집하는 저장소 설정 파일 둘 가운데 첫째 |
| `.moai/specs/SPEC-LIVEENV-001/drivers/*.sh` | 증거 드라이버 여섯 |
| `scripts/live-dryrun.mts` | M6 가짜 채널 예행 (`npm run live-dryrun`) |
| 루트 `package.json` `live-dryrun` 한 줄 | M6. 이 카드가 편집하는 저장소 설정 파일 둘 가운데 둘째 |
| `scripts/e2e.mts` 의 `export` 다섯 | 예행이 헬퍼를 사본 없이 가져다 쓰게 한 최소 변경. 시나리오 수와 `[n/15]` 표지는 건드리지 않았다 |

### 증거와 판정

| 기준 | 증거 | 판정 | 관측 |
|---|---|---|---|
| `AC-001` | `E01-tree-pin.txt` | **PASS** | 분모 10 = 분자 10 · 기본 체크아웃 경로 0 · 호출 셸 cwd 불변 |
| `AC-002` | `E02-lifecycle.txt` | **PASS** | 양성 대조군(`sleep 600`, cwd `/private/tmp`)이 살아남고 `down` 이 「이 트리의 서버가 아니다」로 거부(`exit=1`); 본 실행은 기록된 pid 만 내림(`after-down exit=1`) |
| `AC-003` | `E03-status-axes.txt` | **PASS** | 통과 실행 세 축 `measured=yes`·`exit=0`; 음성 대조군(실제 사고 재현 — 무관한 프로세스가 같은 포트 점유)에서 `exit=2` |
| `AC-004` | `E04-tristate.txt` | **PASS** | 분모 `N=15` = 실행 15건 · **전부 `exit=2`** · `exit=1` **0건** · 양성 기준선만 `exit=0` |
| `AC-005` | `E05-token-file.txt` | **PASS** | 표준출력 64자 hex 0건 · 권한 `600` · `check-ignore exit=0` · `token_head` 한 줄 · `diff exit=0` · `bot-01/` `check-ignore exit=0` |
| `AC-006` | `E06-bot-launch.txt` | **PASS** | ㉠ 명령행에 토큰 없음 · ㉡ 환경에 `MINIDISCORD_TOKEN` 있음(앞 8글자로 가림 — 양성 대조군) · ㉢ 실행 출력 0건 + 이력 **증분 0**(19 → 19) |
| `AC-007` | `E07-inventory.txt` | **PASS** | `site=` 12줄 = §7 표 12행 · `comm -3` 출력 0줄(이름 집합 일치) |
| `AC-008` | `E08-ambient-sweep.txt` | **PASS** | 상시 여섯이 이 카드 기준 0건 · 양성 대조군(`principal` 줄) 있음 · 전역 **항목 내용 불변** |
| `AC-009` | `E09-mcp-attribution.txt` | **PASS** | ㉠ 전역 항목의 `args[0]` 에 `test -e` 가 `exit=1` · ㉡ 같은 시각 세션(`3dabf75d…`)의 대화 기록에 `mcp__minidiscord-channel__reply` 호출과 `tool_result` 가 **짝으로** 있음 · `sessionId`·`cwd` 단일값 · 승인 뒤 `api=true:conn=1` |
| `AC-010` | 회귀 15/15 · `E10-extract-run.txt` | **PASS** | 대응 관계(회귀) + DB·프로세스 면 도달성(예행) + **대화 기록 면 도달성(M8)** 세 공급원이 모두 섰다. 실 세션 산출에서 `reply_arg=q7Rm2XbK` · `db_row=q7Rm2XbK` · `agree=yes`, manifest 의 `A01 ㉣` 이 `machine`/`ok`. `session_uuid=3dabf75d-cd20-4371-85cc-503ee2531af9` |
| `AC-011` | `E11-no-full-token.txt` | **PASS** | ㉠ 산출 디렉터리 절대 0(`exit=1`) · ㉡ 추적 파일 **증분 0**(기준선 36 = 현재 36, `comm -13` 0줄) · 양성 대조군 두 벌 모두 적중 |
| `AC-012` | `E12-manifest-judge.txt` | **PASS** | 항 이름 집합이 정확히 그 일곱(`names_match=yes`) · `A03`·`A10` `has_verdict=False` |
| `AC-013` | `E13-playwright-absence.txt` | **PASS** | 다섯 실행 · ①③④⑤ `exit=2` · ②(Playwright 있음) `exit=0` · **`exit=1` 0건** · 의존 추가 0 |
| `AC-014` | `E14-dry-run.txt` | **PASS** | 예행 `VERDICT=PASS` — 기대 파일 집합 완비 · 대화 기록 유래 산출 부재 · `A01 ㉣` `UNMEASURED`(정상값) · 좁은/자손 판별자 0 · 세션 **증분 0** · 대조군 두 벌 |
| `AC-015` | `E15-fence.txt` | **PASS** | 기준선 가드 해소 · `git diff` 0줄 · `git status` 0줄 |
| `AC-016` | `E16-sibling-e2e016.txt` | **PASS** | ① `exit=1` · ①-b `7`(상한 이하) · ①-c 전부 `0` · ② `exit=1` · ③ 「해당 없음」 · 루트 `package.json` 의 기존 `test`·`e2e` 값 불변(diff 0), 더해진 줄 1 |
| 변이 | `M01-mutation.txt` | **10/10** | 열 건 각각 빨간 출력 + 복원 후 초록. **⑤ 도 M8 에서 실행됐다** — `.mcp.json` 부재에서 `api=false:conn=0`·답 없음, 복원 뒤 **같은 메시지**가 답을 받음 · 잔존 확인은 해시 대조로 전부 동일 |
| 품질 게이트 | `npm test` · `tsc` | **PASS** | server 243 + channel 126 = **369건 통과**, 실패 0 · `tsc --noEmit -p server` 오류 0 · `npm run typecheck -w channel` 오류 0 · `bash -n scripts/live-env.sh` OK |

**셈**: `acceptance.md` 의 「미관측의 처분」이 요구하는 형태로 — **통과 16 / 실패 0 / 미관측 0**(합 16).
`K = 0` 이므로 이제 `16/16` 을 쓸 수 있다. 앞 회차에 미관측이던 셋(`AC-009` · `AC-010` 의 대화 기록
표면 · 변이 ⑤)은 **전부 M8 에서 실제로 관측해 닫았다** — 우회로 세우지 않았다.

### plan 이 넘긴 미결 넷의 최종 상태

| # | 상태 | 근거 |
|---|---|---|
| G-1 | **닫힘** | `status --unmeasured-paths` 출력이 **15줄**. `E04-tristate.txt` 가 그 15건을 각각 성립시켜 전부 `exit=2` 를 관측했다 |
| G-2 | **닫힘(10/10)** | `M01-mutation.txt` 가 열 변이 각각의 diff(또는 조작 내용)·빨간 출력·복원 후 초록을 담는다. ⑤ 는 M8 에서 실행됐다 |
| G-3 | **닫힘** | `E13-playwright-absence.txt` 가 다섯 실행 각각의 명령·표준오류·manifest 줄·종료 코드를 담는다. 성립 절차가 실제로 그 상태를 만든다 |
| G-4 | **닫힘** | `invite` 표준출력 실측 순서는 `token_head=` → `issued_at=`. 이름표로 고르므로 판정은 순서에 걸리지 않는다 |

### 리드 처분 집행 기록

| 처분 | 집행 |
|---|---|
| **14** — 넷을 「증분」 판정으로 개정 | `acceptance.md` `AC-006 ㉢`·`AC-008`·`AC-011 ㉡`·`AC-014 ㉢` + 엣지 `E-5` + DoD 2·3·5 개정. 판별자 둘은 형태를 바꿨다(기계 전체 `claude` → `pgrep -P` 자손, 파일 수정 시각 → 항목 내용). 반대 방향 변이 ⑦~⑩ 을 붙여 증분 판정이 무뎌지지 않았음을 실행으로 보였다. **REQ 16 · AC 16 불변** |
| **15** — 포트 3000 사실 기록 | `spec.md` §1.2 **F-13** 에 실었다(두 LISTEN 의 정체·기동 시각·운영자 종료). §1.1 표의 첫 두 행이 추측이 아니라 이 기계에서 살아 있던 상태였음을 그 줄이 뒷받침한다 |
| **16** — M5·M6·M7 까지 하고 멈춤 | M5(캡처 두 갈래)·M6(예행 + `package.json` 한 줄)·M7(울타리 둘) 착지. 그 회차에는 M8 을 돌리지 않고 `AC-009`·`AC-010`·변이 ⑤ 를 미관측으로 두었다 |
| **26** — M8 진행 | 운영자가 자리를 지키는 동안 실 세션을 세 번 띄워 셋을 전부 닫았다. 조작 요청은 한 단계에 한 번, 필요한 조작을 한 메시지에 담아 보냈고, **승인 대기 중에는 아무 명령도 돌리지 않았다**(그 자체가 `E-2` 를 오염시킨다). 그 과정에서 §1.2 **F-15** 가 나왔다 — 사람 손은 넷이 아니라 다섯이고 다섯째는 매 기동마다 뜬다 |

### run 단계가 실측한 것 (spec.md §1.2 F-13·F-14 에 실었다)

- **F-13** 전역 MCP 항목이 가리키던 3000 번을 두 프로세스가 잡고 있었다. `pid 64479` 는 삭제된 `worktrees/t32/server` 를 cwd 로 2026-09-03 부터, `pid 94851` 은 이 저장소와 무관한 `remotion still --help` 가 2026-07-18 부터. **둘 다 이 카드의 것이 아니어서 죽이지 않았고**, 운영자 처분으로 종료됐다.
- **F-14** 「기계 전체의 절대 0」을 요구하던 네 자리의 기준선은 0 이 아니었다 — 적중 36 · 이력 19 · `pgrep -x claude` 14 · 수정 시각이 세션 기동에 흔들림. 처분 14 가 그 넷의 판정선을 증분으로 옮겼다.
- **F-15** **사람 손은 넷이 아니라 다섯이다.** M8 에서 세션을 세 번 띄우며 관측했다 — 카드가 센 넷 밖에 `--dangerously-load-development-channels` 확인 창(`1. I am using this for local development / 2. Exit`)이 있고, MCP 항목 승인이 첫 사용에만 붙는 것과 달리 **이 창은 세 번 다 떴다**. 반복 실행의 사람 손 비용은 이 자리가 더 크다. F-12 가 넷째를 드러낸 것과 같은 부류이며, **줄이지 못한 것을 줄였다고 적지 않는다**.

### 규율 준수

- 저장소 밖 편집 **0건**. `~/.claude.json`·셸 이력은 읽기만 했고, 그것들을 겨누는 변이(⑦·⑧)는 **사본**에만 걸었다.
- 요구사항 16 · 수용 기준 16 **불변**.
- `SPEC-LIVEVERIFY-001`·`SPEC-E2E-001` 은 **읽기만** 했다(`E15`·`E16` 이 diff 로 잰다).
- `status --unmeasured-paths` **존치**.
- 배경 부하 **없음**. 변이·대조군이 띄운 프로세스는 전부 종료를 같은 증거 파일에서 확인했다.
- 남은 사람 손은 **넷에서 출발해 다섯이 됐다** — 전건 열거는 §E.3 의 DoD 9 표에 있다. **줄었다고 적지 않는다.**
- M8 의 조작 규율을 지켰다 — 한 단계에 한 번, 필요한 조작을 한 메시지에 담아 보냈고, **승인 대기 중에는 아무 명령도 돌리지 않았다**(그 자체가 `E-2` 를 오염시킨다).

## §E.3 Run-phase Audit-Ready Signal

- `run_status: audit-ready` — **M0~M8 전부 실행됐다**(리드 처분 26 으로 M8 진행).
- **통과 16 / 실패 0 / 미관측 0** — 합 16. `K = 0` 이므로 `16/16` 을 쓸 수 있다.
- 변이 **10/10** — 열 건 각각 빨간 출력과 복원 후 초록을 담는다.
- 품질 게이트: `npm test` 369건 통과 · `tsc --noEmit -p server` 오류 0 · `npm run typecheck -w channel` 오류 0 · `bash -n scripts/live-env.sh` OK
- 울타리: `SPEC-LIVEVERIFY-001` 변경 0줄 · `SPEC-E2E-001` 변경 0줄 · 형제 `AC-E2E-016` 무조건 측정 넷 그대로
- 저장소 밖 편집 **0건** · 요구사항 16 · 수용 기준 16 **불변** · 배경 부하 **없음**

### DoD 9 — 남은 사람 손을 전건 열거한다 (줄이지 못한 것을 줄였다고 적지 않는다)

**넷에서 출발했고, 실측으로 다섯이 됐다.**

| # | 자리 | 이번 회차 관측 |
|---|---|---|
| ① | `A10` 의 🔒 승인 클릭 (방 화면에서 사람이 누르는 그 클릭) | 이 카드가 겨누는 §A 항이 아니어서 이번 회차에는 발생시키지 않았다 |
| ② | `A08` 의 `/clear` | 같음 — 이번 회차의 실 세션은 `A01 ㉣` 왕복만 만들었다 |
| ③ | `A03`·`A10` 의 눈검사 | 같음. 이 둘은 manifest 에 `judge: human` 으로 남고 기계가 판정하지 않는다 |
| ④ | 봇 세션 첫 기동의 **MCP 항목 승인** | **관측됨.** `.mcp.json` 이 있을 때 승인 창이 떴고, 지웠을 때는 뜨지 않았으며, 되돌린 뒤 다시 떴다(변이 ⑤ 의 세 관측) |
| ⑤ | **`--dangerously-load-development-channels` 확인 창** | **관측됨 — 카드가 세지 않은 자리다.** 세 번의 기동에서 세 번 다 떴다. ④ 와 달리 «첫 사용에만» 이 아니라 **매 기동마다** 붙으므로 반복 실행의 사람 손 비용은 이 자리가 더 크다 (`spec.md` §1.2 F-15) |

**이 카드는 사람 손을 줄이지 못했고, 줄였다고 적지 않는다.** 한 자리를 더 «찾아낸» 것이 이번 회차의
결과다 — 그리고 그것이 이 카드의 중심 주장(사람 손을 정직하게 센다)이 실제로 작동한 형태다.

## §E.4 Sync-phase Audit-Ready Signal

_&lt;sync 단계 대기&gt;_
