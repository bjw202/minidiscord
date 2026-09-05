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
| `.moai/specs/SPEC-LIVEENV-001/drivers/*.sh` | 증거 드라이버 셋 |

### 증거와 판정 (지금까지)

| 기준 | 증거 | 판정 | 관측 |
|---|---|---|---|
| `AC-001` | `E01-tree-pin.txt` | **PASS** | 분모 10 = 분자 10 · 기본 체크아웃 경로 0 · 호출 셸 cwd 불변 |
| `AC-002` | `E02-lifecycle.txt` | **PASS** | 양성 대조군(`sleep 600`, cwd `/private/tmp`)이 살아남고 `down` 이 「이 트리의 서버가 아니다」로 거부(`exit=1`); 본 실행은 기록된 pid 만 내림(`after-down exit=1`) |
| `AC-003` | `E03-status-axes.txt` | **PASS** | 통과 실행 세 축 `measured=yes`·`exit=0`; 음성 대조군(실제 사고 재현 — 무관한 프로세스가 같은 포트 점유)에서 `exit=2` |
| `AC-004` | — | **미관측** | `status --unmeasured-paths` 는 `N=15` 를 냄(G-1 닫힘). **15건 실걸이 미실행** |
| `AC-005` | `E05-token-file.txt` | **PASS** | 표준출력 64자 hex 0건 · 권한 `600` · `check-ignore exit=0` · `token_head` 한 줄 · `diff exit=0` · `bot-01/` `check-ignore exit=0` |
| `AC-006` | `E06-bot-launch.txt` | **부분** | ㉠ 명령행에 토큰 없음 ✓ · ㉡ 환경에 `MINIDISCORD_TOKEN` 있음(앞 8글자로 가림) ✓ · **㉢ 은 F-2 를 보라** |
| `AC-007` | `E07-inventory.txt` | **PASS** | `site=` 12줄 = §7 표 12행 · `comm -3` 출력 0줄(이름 집합 일치) |
| `AC-008` | `E08-ambient-sweep.txt` | **부분** | 상시 여섯 가운데 다섯이 0건 · 양성 대조군(`principal` 줄) 있음 · **`tracked_repo_files` 는 F-1 을 보라** |
| `AC-010` | 회귀 15/15 통과 | **부분** | 대응 관계는 섰다. **도달성 절반(대화 기록 표면)은 M8 대기** |
| `AC-012` | 회귀 + `manifest.json` | **PASS(대응)** | 항 이름 집합이 정확히 그 일곱 · `A03`·`A10` 에 판정 필드 부재 · 여덟째/누락 둘 다 빨개짐 |
| `AC-013` | — | **부분** | 양성 대조군(Playwright 있음 → `exit=0`)·부재(→ `exit=2`, `1` 아님) 실측. **엣지 셋(E-2·E-3·E-5) 실행 미실시** |
| `AC-016` | 아래 재실행 | **PASS(네 측정)** | ① `exit=1` · ①-b `7`(상한 이하) · ①-c 전부 `0` · ② `exit=1`. ③ 은 「해당 없음」 |
| 품질 게이트 | `npm test` | **PASS** | server 243 + channel 126 = **369건 통과**, 실패 0. `tsc --noEmit -p server` 오류 0 |

**미관측 · 미실행**: `AC-004`(15건 실걸이) · `AC-009`(M8) · `AC-011`(F-1) · `AC-014`(M6 미구현 + F-3) ·
`AC-015`(M7 미실행) · `M01-mutation.txt` 변이 여섯 전부 미실행.

### plan 이 넘긴 미결 넷의 현재 상태

| # | 상태 | 근거 |
|---|---|---|
| G-1 | **닫힘** | `status --unmeasured-paths` 실행 출력이 **15줄**. `AC-004` 의 분모 `N=15` 다 |
| G-2 | **열림** | 변이 여섯 미실행 |
| G-3 | **부분** | Playwright 두 갈래는 실측(`exit=0`/`exit=2`). 엣지 셋은 미실행 |
| G-4 | **닫힘** | `invite` 표준출력 실측 순서는 `token_head=` → `issued_at=`. 이름표로 고르므로 판정은 순서에 걸리지 않는다 |

### run 단계가 새로 실측한 것 — 리드 처분이 필요한 넷

| # | 사실 (실행으로 관측) | 왜 처분이 필요한가 |
|---|---|---|
| **F-1** | `git grep -lE '[0-9a-f]{64}' -- . ':!package-lock.json'` 가 **36건** 적중. 전건 열거해 확인한 결과 **전부 정당한 SHA-256**(`.moai/manifest.json` 의 `template_hash` 꼴 · `.moai/state/verify/**` 의 변이·검증 기록 · `.moai/reports/**` 의 CI 로그). 토큰은 하나도 없다 | `AC-011` 의 둘째 측정은 `exit=1`(적중 0건)을 요구한다 — **이 카드가 한 줄도 쓰기 전에 이미 빨갛다.** 「제외는 부류이지 자기 면제가 아니다」는 원칙은 지키되, `package-lock.json` 과 같은 부류(정당한 해시)가 `.moai/` 아래에 더 있다는 사실이 plan 단계에 없었다 |
| **F-2** | 셸 이력(`~/.zsh_history`)에 64자 hex 를 담은 줄이 **19건**. 이 카드의 실행 전후 값이 같아 **증분은 0** | `AC-006 ㉢` 은 「셸 이력 파일에 64자 hex 가 없다」를 요구한다 — t32 시절의 `export` 줄 때문에 기준선에서 이미 거짓이다. 증분 0 은 이 카드가 새로 남기지 않았음을 보인다 |
| **F-3** | `pgrep -x claude` 가 **14** 를 낸다(운영자의 세션들 — 이 레인 세션 포함). `pgrep -f 'dangerously-load-development-channels'` 는 `0` | `AC-014 ㉢` 은 예행 중 두 판별자가 **모두 `0`** 이어야 한다고 못박는다. 넓은 판별자는 예행이 아니라 **기계 전체**를 재므로, 운영자가 Claude 를 한 창이라도 열어 둔 동안 이 기준은 원리적으로 초록이 될 수 없다 |
| **F-4** | `~/.claude.json` 의 수정 시각은 평소 고정이나 **`bot` 이 세션을 띄우는 순간 바뀐다**(1788630392 → 1788630396). Claude Code 자신이 그 파일에 쓴다. 항목 **내용**(`args[0]`·`env`)은 불변이고 `args[0]` 은 여전히 존재하지 않는 t32 경로(`test -e` 실패 — D5 의 대조군이 성립) | `AC-008` 의 무편집 증명(실행 전후 `stat -f %m` 동일)과 엣지 `E-5` 의 판별자가 둘 다 **시각**이다. 시각은 「항목이 바뀌었다」가 아니라 「세션이 떴다」를 잰다. 추출기 쪽은 판별자를 **항목 내용 대조**로 이미 바꿨다(코드 수정 완료). `AC-008`·`E-5` 의 문언은 plan 소유라 손대지 않았다 |

**넷의 공통 형태**: `AC-011`·`AC-006 ㉢`·`AC-014 ㉢` 은 「기계 전체의 절대 0」을 요구하는데, 그 상태는
이 카드 이전부터 0 이 아니다. `AC-008`·`E-5` 는 공유 파일의 **시각**을 판별자로 쓴다. 넷 다 처방의
모양이 같다 — **이 카드가 만든 증분을 재고, 기계의 절대 상태를 재지 않는다.** 증거 파일에는 절대값과
증분을 **둘 다** 남겨 두었으므로, 리드가 어느 쪽으로 처분하든 재실행 없이 판정할 수 있다.

### 규율 준수

- 저장소 밖 편집 **0건** — `~/.claude.json` 은 읽기만 했고 항목 내용이 불변임을 대조로 보였다.
- 요구사항 16 · 수용 기준 16 **불변** — 한 건도 늘리지 않았다.
- `SPEC-LIVEVERIFY-001`·`SPEC-E2E-001` 은 **읽기만** 했다.
- `status --unmeasured-paths` 는 존치 — 되돌리지 않았다.

## §E.3 Run-phase Audit-Ready Signal

_<run 단계 대기>_

## §E.4 Sync-phase Audit-Ready Signal

_<sync 단계 대기>_
