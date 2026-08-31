# SPEC-E2E-001 — 진행 기록

## §E.1 Plan-phase Audit-Ready Signal

- 카드: `t6` (ROADMAP M6, 운영자 축소 범위)
- 워크트리: `.claude/worktrees/t6` · 브랜치 `WT-e2e-persist-readme` · 기준 `2a19d7d`
- 산출물: `spec.md` · `plan.md` · `acceptance.md` · `progress.md` (Tier M)
- **판 v0.3.1 — 3회차 델타 감사(PASS 0.911) 이후의 마지막 정리 라운드.** 보고: `.moai/reports/t6/plan-revision-3.md`
- **4회차 감사는 없다** — 재감사 계약 상한 3회 도달 · 판정 PASS · 범위가 `spec.md` §7.3 한 표로 한정 · 리드 결정

### 감사 궤적과 점수 귀속

| 회차 | 판정 | 대상 트리 | 보고 |
|---|---|---|---|
| 1차 | **FAIL 0.67** (임계 0.80) | v0.1.0 | `plan-audit.md` |
| 개정 1차 | 차단 10건 전건 처리 | → v0.2.0 | `plan-revision-1.md` |
| 2차 (델타) | **PASS 0.829** — 얇은 통과(+0.03) · 감사관 자기 공시 | **v0.2.0** | `plan-audit-2.md` |
| 개정 2차 (정리) | 차단 4건 전건 수정 | → **v0.3.0** | `plan-revision-2.md` |
| 3차 (델타) | **PASS 0.911** — 여유 있는 통과(한 등급으로도 두 차원 동시로도 안 뒤집힘) · 차단 **0건** | **v0.3.0** | `plan-audit-3.md` |
| 개정 3차 (마지막 정리) | P-01~P-05 수정 · P-06 run 이월 · **AC/REQ/Tier 무변경** | → **v0.3.1** | `plan-revision-3.md` |

> **[HARD] `0.911` 은 v0.3.0 트리 값이고, 이 정리 이후 트리는 재채점되지 않는다.** 정리 내용은 **§7.3 증거 칸 정정 · AC/REQ/Tier 무변경**이며, 사후 검증은 **리드의 기계 확인(grep 표본)이고 재점수가 아니다.** 「정리 이후 트리가 0.911 을 받았다」로 읽히는 문장을 쓰지 않는다. 이전 회차도 같은 규칙 — **0.829 는 v0.2.0**, **0.67 은 v0.1.0** 트리 값이다.

### 개수·상태 (실행 확인)

- 요구사항 16 · 수용 기준 16 — **세 판 모두 변동 없음** (Tier M 상한 16/16)
  - `grep -c '^- \*\*REQ-E2E-' spec.md` → `16`
  - `grep -c '^### AC-E2E-' acceptance.md` → `16`
  - `grep -c '^### Out of Scope — ' spec.md` → `6`
- `grep -m1 '^version:' spec.md` → `version: "0.3.1"` · `grep -m1 '^status:' spec.md` → `status: draft`
- SPEC ID 정규식: `[[ "SPEC-E2E-001" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` → `PASS`

### 정리 라운드가 세운 자기 검사 (DoD 6·7항)

| 검사 | 명령 | 값 |
|---|---|---|
| 기준선 변수 잔존 | `grep '^- 측정' acceptance.md \| grep -c 'BASE'` | `0` (측정 줄 총 `34`) |
| 면제된 주장 수 | `grep -rE "<금지어>" README.md .moai/specs/SPEC-E2E-001/ \| grep -c 'AC-016-EXEMPT'` | `7` (편집 불변 확인) |
| 면제 우회 통로 | `grep -rc 'AC-016-EXEMPT' README.md` | `README.md:0` |
| 금지어 주장 부재 | 위 패턴 `\| grep -v 'AC-016-EXEMPT'` | `exit=1` |
| **§7.3 명제 축 — 옛 형태** | `grep -n "어긋나지 않" spec.md plan.md acceptance.md \| grep -vc 'SWEEP-ROW'` | `1` |
| **§7.3 명제 축 — 선언 자리** | `grep -n "종결 정의\|종결 조건" spec.md \| grep -vc 'SWEEP-ROW'` | `3` |
| **§7.3 값 축 — 옛 표지 폭** | `grep -rn '/13\]' .moai/specs/SPEC-E2E-001/ \| wc -l` | `0` |

> **[HARD] 위 세 행은 개정 3차의 모든 편집(HISTORY 0.3.1 추가·[HARD] 문단 추가·앵커 재작성) 뒤에 다시 돌린 값이다** — 표가 자기를 세지 않음을 실행으로 확인했다. 값 축·명제 축 모두 **제외가 명령 안에** 있다.

### 리드 확정 사항

| 항목 | 결정 |
|---|---|
| **D5** README 「내 PC」 소유 | **t26 확정** (리드 결정). 정본 인용은 레인 직독 대조로 확인 — 2회차 감사의 「최대 미검증」을 메웠다 |
| **D-01 기제 반박** | **수용** — 감사관이 자기 1회차 처방을 철회 |
| **N-04 문언** | 리드가 형태 지정: «트리거는 t6, 「내 PC」 문구는 t26 이월 · 과도기 공시» |
| **N-06·N-07** | 고치지 않음 — REQ 상한 제약의 대가로 판정, 제약이 풀릴 때 처리 |
| D1·D2·D3·D4 | 잠정 선택 유지 (M1 착수 전 확인) |

- 커밋하지 않음 · `status: draft` 유지 · 회차별 감사 보고서는 덮어쓰지 않고 파일을 나눈다

_다음: 3회차 델타 감사(N-01~N-04 범위) → Kickoff 승인 → run 진입_

## §E.2 Run-phase Evidence

### M1 — 결정 확정과 골격

**리드 D1·D2·D3 확정 (M1 착수 전 확인 — plan.md §A [HARD] 이행)**
- 리드 회신 (2026-08-31): «D1·D2·D3 확인 — 셋 모두 잠정대로 확정. 뒤집을 것 없음. 3회차 감사 PASS 0.911 이 그 선택을 받은 트리에서 나왔다 — 재판정 근거 없음»
- ① D1 = 재사용 (`scripts/e2e.mts` + `npx tsx`, `server/test/gateway-v2.ts` 의 `connectV2`/`innerOf` import, 셋째 사본 금지)
- ② D2 = 별도 `npm run e2e`, 루트 `scripts.test` 값 불변 (CI 배선은 t27)
- ③ D3 = 문서로만·실행 안 함, «수동 검증 수행» 주장 금지 유지
- D5 = t26 이월·과도기 공시 — §E.1 확정 기록 유지 (재판정 없음)

**§C 착수 전 확인 (run 레인 직접 실행 출력)**

- `npm install` → `INSTALL_EXIT=0`, `found 0 vulnerabilities` (로그: `.moai/state/verify/t6-run/npm-install.log`)
- `node -e "console.log(require.resolve('ws/package.json'))"` → `/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t6/node_modules/ws/package.json` · 버전 `8.21.3` — **npm install 후에는 이 나무 로컬 해소** (npm install 전에는 부모 체크아웃 해소였다; D4 가 공시한 함정이 run 환경에서는 해소됨 — CI·새 클론 대비 의존성 부재 안내 경로는 유지)
- `npx --no-install tsx --version` → `tsx v4.23.12` / `node v24.12.0` (§7.1 측정 6 값과 동일)
- 기준선 생존 가드: `git rev-parse --verify 2a19d7d >/dev/null; echo "GUARD_EXIT=$?"` → `GUARD_EXIT=0` · HEAD `4cd0a85`
- `npm run build -w channel` → `BUILD_EXIT=0` (pre-commit 게이트 대비 — 로그: `.moai/state/verify/t6-run/build.log`)
- 기준선 `npm test` (npm install **전**): `188 passed (188) + 95 passed (95)` = **283 passed, exit 0** (`.moai/state/verify/t6-run/baseline.log` — plan 레인 기준선과 일치)
- 기준선 `npm test` (npm install **후** 재측정): `188 passed (188) + 95 passed (95)` = **283 passed, exit 0** (`.moai/state/verify/t6-run/baseline-after-install.log` — 설치 전 값과 동일. 이 카드의 모든 변이·E2E 실행은 이 환경 기준)

**M1 골격 측정 (구현 위임 — 익명 스폰 opus/high · 레인 표본 재현 포함)**

산출물: `scripts/e2e.mts` (신규, 172행, 미추적). 구성: 포트 확보(`E2E_FORCE_PORT` verbatim 우선, 빈 문자열은 미설정 취급) → `mkdtemp` 임시 데이터 디렉터리 → 서버 spawn(`MINIDISCORD_PORT`·`HOST`·`DATA_DIR`·`BOT_FILES_DIR` 네 env 주입, config.ts:3·6·8·13 실측 근거 주석) → `/api/health` **준비 신호 폴링**(조기 사망 감지 포함 → `[boot-timeout]` 정확히 1회 + exit 9) → 정상·단언 실패·예외 3경로 `finally` 정리(SIGTERM 그룹 → 3초 유예 → SIGKILL → `rmSync`) → `step(n)` 단언-성공-뒤 계약(역순·중복·건너뜀 호출 즉시 실패). MX: `@MX:TODO`(M2 ①~⑮ 충전)·`@MX:NOTE`(D1(a) 상대 import 근거).

| 검사 | 명령(축자) | 관측 |
|---|---|---|
| E1 초록 실행 | `npx tsx scripts/e2e.mts; echo "exit=$?"` | `exit=0` — 스폰 1회 + 레인 직접 재현 2회 = **3회 전부 초록** |
| E1 잔여 프로세스 | `pgrep -f "tsx server/src/index.ts"; echo "pgrep=$?"` | `pgrep=1` (적중 없음) — 3회 전부 |
| E1 임시 디렉터리 | tmpdir 내 `minidiscord-e2e-*` 나열 | `tmp-leftovers=0` |
| E2 AC-E2E-006 (P-06 형태) | 실제 점유자(node one-liner — 포트·pid를 `.moai/state/verify/t6-run/port-holder.txt`에 기록, `setInterval` 유지) + 폴링 대기(파일 존재 + TCP 접수, 200ms) 후 `E2E_FORCE_PORT=<점유> npx tsx scripts/e2e.mts > boot-timeout.log 2>&1` | `exit=9` · `grep -c '\[boot-timeout\]'` → `1` · 로그에 서버 `EADDRINUSE` 조기 사망 흔적(「프로세스 조기 사망 → 시한 경로」 분기 실밟) · 점유자 `kill` 회수(exit 143) |
| E3 AC-E2E-005 | `find data -type f 2>/dev/null \| sort \| xargs -r shasum -a 256 \| shasum -a 256` 전/후 | 동일(빈 입력 해시) · `./data` 부재 유지 |
| E4 실패 경로 잔여물 | E2 직후 `pgrep` + tmpdir 나열 | `pgrep=1` · `tmp-leftovers=0` |
| E5 의존성 부재 | 실제 파일을 바이트동일 사본으로 워크트리 밖에서 실행(가드 분기) | 한 줄 안내(스택 없음) + `exit=1`(9 아님) · 해소-성공 쪽 `tsx -e` import → `deps-ok` |

**P-06 이월 작업 — run 에서 정해진 최종 형태**: `sleep 1` → **준비 신호 폴링**(포트 파일 존재 + TCP 접수, 200ms 간격) · `/tmp` 증거 경로 → `.moai/state/verify/t6-run/`. AC-E2E-006 이 공시한 취약점 둘(`sleep 1` 경주·`/tmp` 경로)이 모두 이 형태로 닫혔다.

**레인 재검증에서 발견·수정한 결함 1건**: 첫 E1 재현 출력에서 서버 경고 «MINIDISCORD_BOT_FILES_DIR 이 없어 봇 첨부를 받지 않습니다» 를 관측 — `config.ts:13` 은 fail-closed(미설정 시 봇 첨부 전부 거부)인데 골격이 이 env 를 주입하지 않았다. M2 ⑧첨부 저장·⑨내려받기 단계가 그대로 밟을 결함이라, 스폰에 지시해 `spawnServer` 에 `MINIDISCORD_BOT_FILES_DIR`(dataDir 안 `bot-files` 하위, `mkdirSync` 생성 — cleanup 은 dataDir 재귀 삭제로 함께 정리) 주입을 완성하고 재실행으로 경고 소멸을 확인했다(레인 직접 재현 `exit=0`).

**Gaps (M1 종료 시점)**: ① `npm run e2e` 형태는 미측정 — 배선은 M4 가 만들며, M4 착지 후 AC-E2E-005·006 을 배선 형태로 한 번 더 잰다 ② AC-E2E-004 본 측정(단언 조작 변이)은 M6 변이표 몫 — M1 은 부팅-시한 경로로 같은 성질(잔여물 0)만 확인 ③ 빈 포트 탐침의 닫힘→재사용 TOCTOU 미측정(발생 시 exit 9 의 안전 방향으로 실패) ④ `process.kill(-pid)` 그룹 정리는 POSIX 전용 — Windows 미측정(이 카드의 관측 규약도 macOS 기준, `shasum`) ⑤ E5 사본 재현 증거는 env 주입 수정 **이전** 파일 기준 — 가드 로직과 수정 영역(spawnServer·main 배선)은 겹치지 않는다.

**Residual-risk**: 모든 측정은 이 나무(npm install 완료·로컬 해소) 기준 — 신규 클론에서의 가드 동작은 사본 재현으로만 검증됐다. 러너의 자연 종료(`exitCode` 방식)는 3회 전부 즉시 종료가 관측됐으나 이벤트 루프 고착의 스트레스 시험은 없다.

### M2 — 시나리오 본체 ①~⑬

산출물: `scripts/e2e.mts` 422행(수정, 미커밋 상태로 측정 — 커밋은 이 §E 기록 직후). 13단계의 URL·멘션 문법(`@TO(봇이름)`, mention.ts:2)·권한 답 형식(`yes <5자 id>`)은 **서버 라우트 원문 대조로 확정**(`routes-*` 추측 없음). ⑤ `connectV2`, 확립 뒤 전 프레임 `innerOf` 봉투 검증(mac + seq 단조) 후 소비. ⑥ 음성 대조군: 별도 소켓이 `{type:'hello', token}` → close까지 수신 0건. ⑧은 M1에서 주입한 `botFilesDir` 사용. 구현 중 스폰이 스스로 발견·복원: **M2 의 정적 import 가 M1 의존성 부재 «한 줄 안내» 계약을 깨는 것을 재현으로 발견** → `ws`·하네스를 `checkDependencies` 내 **늦은 적재**로 옮겨 계약 복원(사샌드박스 재검증: 한 줄 + `exit=1`, 스택 없음).

| 검사 | 명령(축자) | 관측 | 누가 재현했나 |
|---|---|---|---|
| AC-E2E-001 전체 통과 | `npx tsx scripts/e2e.mts > e2e.log; echo "exit=$?"` | `exit=0` + 마지막 줄 «E2E PASS — 13 단계 전부 통과» | 스폰 3회 + **레인 직접 재현 1회** |
| AC-E2E-007 표지 순서 | `grep -o '^\[[0-9]\+/15\]' \| tr -d '\n'` | `[1/15]…[13/15]` 정확 일치 | 스폰 + **레인 직접 재현** |
| AC-E2E-002 ㉠㉡ | e2e.log 표지 관측 | `[5/15]`(v2 성립 양성)·`[6/15]`(v1 음성 close) | 스폰 + 레인(표지 열 전체 재현에 포함) |
| AC-E2E-003 봉투 변이 | innerOf→원문 JSON.parse 치환 **사본**을 verify 디렉터리에서 실행, 실행 뒤 사본 삭제 | `exit=1` · 실패가 `[6/15]` 뒤 step7 영역(«시한 10000ms 안에 해당 프레임이 오지 않았다») — 봉투가 실재함의 증거 | 스폰 실측 + **레인이 mutant.log 직접 판독** · 나무 오염 없음(사본 정리 확인) |

- 측정 환경 귀속: 브랜치 `WT-e2e-persist-readme` @ `dc7343c`(M1 커밋) — `npm run e2e` 배선 형태의 값이 **아니라** 직접 실행 형태(배선은 M4).
- **M6 이월(스폰 Gap 4 수용)**: AC-E2E-003 변이는 늦은-적재 리팩터 **이전 세대(418행)** 파일 기준 — 변이 앵커는 현재 422행에도 그대로 적중하므로 **M6 변이표에서 현재 세대로 재측정**한다.
- **⑬ 의 증거 사슬(전선 미관측 공시)**: 재접속 프레임 재전송은 welcome 과 같은 쓰기로 붙어 나와(gateway.ts:215-224) 리스너 장착 경주가 있어, (a) 재접속 1 `welcome.missed_after_id === ⑦ id` · (b) 이력 조회 동일성 · (c) 재접속 2 커서 상승으로 잰다 — 커서 갱신은 재전송 루프가 잡은 것이 있을 때만 일어난다(gateway.ts:222-224). 재전송 프레임의 전선 내용 자체는 미관측.
- AC-E2E-002 ㉠ 은 auth 서명 검증 층(gateway.ts:191)을 재지 않는다 — 기준 본문이 공시한 대로 그 층은 SPEC-GWAUTH-002 소유.
- **Residual-risk**: 초록은 무부하 상태의 이 기기 값(프레임 시한 10초·폴링 150ms 여유의 부하 내성 미시험). 스폰 제안 수용 — **gateway.ts:216-224 재전송 루프 삭제 변이를 M6 변이표 필수 행 후보로 기록**(예상: ⑬ 의 (c) 가 거짓이 되어 빨개짐).

### M3 — 재시작 영속성 ⑭⑮ + 인프로세스 회귀 짝

산출물 둘: `scripts/e2e.mts` 489행(⑭⑮ 충전) · `server/test/restart-persistence.test.ts` 137행 신규(회귀 짝, 2시험). ⑭ 재시작: 재시작 전 기록(메시지 id·본문, 첨부 id·바이트, 토큰, 커서) → kill → **같은 데이터 디렉터리**로 재기동 → 세 동일성 대조(`GET /api/rooms/:id/messages` 에서 id 로 본문 대조 · `GET /api/attachments/:id` 바이트 `Buffer.compare` · 같은 토큰 `connectV2` welcome — 커서는 DB·세션은 메모리라 `missed_after_id` 의 차이까지 관측) → step(14). ⑮ 방 보관: `POST /api/rooms/:id/archive` → **서버가 닫는 것**을 대기(closeRoom 훅 — gateway.ts:339-341) → 새 `connectV2` 거절 관측 → step(15). **설계 결정(스폰, 레인 승인)**: 재기동 포트는 매 기동 새 빈 포트 — 죽은 포트 즉시 재사용은 가로채기 경주이고 영속성의 실체는 포트가 아니라 데이터 디렉터리이기 때문(코드 주석에도 기록). 회귀 짝의 `[HARD]` 배경 실측: better-sqlite3 13.x 이중 close 는 no-throw(측정 `second-close=no-throw`), `index.ts:61` onClose 훅이 db 를 닫는 형태라 명시 닫기는 벨트·서스펜더 — 근거 주석 포함.

| 검사 | 명령(축자) | 관측 | 누가 재현했나 |
|---|---|---|---|
| AC-E2E-008 + 전체 15단계 | `npx tsx scripts/e2e.mts > e2e-m3.log; echo "exit=$?"` | `exit=0` · 두 번의 기동(재시작 흔적) · `[14/15]`·`[15/15]` · «E2E PASS — 15 단계 전부 통과» | 스폰 2회 + **레인 직접 재현 1회** |
| 표지 순서 | `grep -o '^\[[0-9]\+/15\]' \| tr -d '\n'` | `[1/15]…[15/15]` 15개 정확 일치 | 스폰 + **레인 직접 재현** |
| AC-E2E-009 ① | `test -f server/test/restart-persistence.test.ts; echo "exit=$?"` | `exit=0` | 스폰 |
| AC-E2E-009 ② | `npx vitest run --root server restart-persistence` | `Test Files 1 passed` · `Tests 2 passed (2)` · `exit=0` | 스폰 (npm test 전체 재관측에서도 190 에 포함) |
| AC-E2E-009 ③ | `grep -c "app.db.close()" restart-persistence.test.ts` | `2` (closeForRestart + afterEach) | 스폰 + **레인 직접 재현** |
| AC-E2E-010 재단언 | 위 vitest 의 두 번째 시험 | «재시작 이후 무관한 메시지를 더 써도 같은 세 동일성이 다시 성립한다 (AC-E2E-010)» 통과 — 재시작 → 새 메시지 1건 → 세 동일성 재단언 | 스폰 |
| `npm test` 전체 | `npm test > <verify>; echo "exit=$?"` | **285 passed (190+95), exit 0** — 기준선 283 + 회귀 짝 2 | 스폰 2회 + **레인 1회** |

- **우연 실패 관측 이력 (지우지 않고 보존)**: 스폰의 첫 전체 실행에서 channel `transport-auth.test.ts` «both nonces are regenerated per socket and a replayed challenge is refused» **1건 실패 관측**(`.moai/state/verify/t6-run/npm-test-m3.log` — 레인이 직접 판독해 확인). 같은 파일 단독 재실행 30/30 통과 + 이후 전체 실행 2회(스폰·레인) 전부 초록 — **flaky 성향**. 변경 접점 없는 채널 영역(카드 t25 경계)이며 **CI 배선(카드 t27)이 이 파일의 flaky 성향을 알아야 한다**.
- 측정 환경 귀속: @ `860c063`(M2 커밋) — 직접 실행 형태(`npm run e2e` 배선은 M4 대기).
- **Gaps**: ① 배선 형태 미측정(M4 에서 동일 기준 재측정) ② ⑭ 는 SIGTERM 재시작만 재었다 — 정리 함수의 SIGKILL 경로(비정상 종료 직후 WAL 복구)는 재시작 흐름에서 미측정 ③ ⑭ 동일성 표적은 1메시지·1첨부·1토큰(REQ-E2E-008 요구 셋은 충족, 전 유형 영속은 미재) ④ AC-E2E-010 재단언 케이스는 plan 배정대로 회귀 짝에만 있고 스크립트에는 없음.
- **Residual-risk**: `E2E_FORCE_PORT` 사용 시 재기동이 같은 포트를 쓰게 되는데, 재바인드 실패는 exit 9(안전 방향). 타이밍 여유는 무부하 기준 — 부하 재시험 없음.

### M4 — 배선

산출물: `package.json` **순수 삽입 +1행** — `"e2e": "npx tsx scripts/e2e.mts"` 를 scripts 블록 앞쪽에. **편집 경로 실측 이력(스폰 공시)**: 첫 편집은 e2e 줄을 test **뒤**에 넣었다 — test 줄 끝 쉼표가 diff 에 `- "test": …` / `+ "test": …,` 를 만들어 AC-E2E-011 ① 이 `1` 로 빨개지는 것을 **실측**했고, e2e 줄을 블록 앞쪽에 두는 순수 삽입으로 고쳐 두 형태 모두 `0` 을 확인. npm 스크립트 나열 순서는 동작에 무관. **M2/M3 이월 — 배선 형태 재측정 전건 관측**: AC-E2E-001 `npm run e2e` → `exit=0` + `[1/15]…[15/15]` + «E2E PASS — 15 단계 전부 통과» · AC-E2E-005 배선 형태 해시 전후 동일(`./data` 부재 유지) · AC-E2E-006 배선 형태(점유 포트 64846 → `EADDRINUSE` → `[boot-timeout]` 1회 + `exit=9`, P-06 폴링 형태 유지, 점유자 `kill` 회수).

| 검사 | 명령(축자) | 관측 | 누가 재현했나 |
|---|---|---|---|
| AC-E2E-011 ① | `git diff 2a19d7d..HEAD -- package.json \| grep '^-' \| grep -c '"test"'` | 커밋 전 워킹트리 형태 `0` — **커밋 뒤 재관측은 커밋 직후 레인 수행(아래 행)** | 스폰 + 레인 |
| AC-E2E-011 ② | `node -e "console.log(require('./package.json').scripts.e2e)"` | `npx tsx scripts/e2e.mts` (비어 있지 않음) | 스폰 + **레인 직접 재현** |
| AC-E2E-011 ③ | `git rev-parse --verify 2a19d7d` | `exit=0` | 스폰 + **레인 직접 재현** |
| diff 실물 | `git diff 2a19d7d -- package.json` | `+ "e2e": …` 한 줄만 — `test` 값 `npm test --workspaces --if-present` 무변경 | **레인 직접 판독** |
| 배선 AC-E2E-001·005·006 | `npm run e2e` 형태 3건 | 전부 초록 (스폰 각 1회 — 세부 위 표 밖) | 스폰 |

- 측정 환경 귀속: @ `cdf55c0`(M3 커밋).
- **Gaps**: ① 커밋 뒤 형태의 AC-E2E-011 ① 은 레인 커밋 직후 재관측으로 최종 판정(순수 삽입이므로 0 예측 — 관측은 §E.3 직전 수행) ② AC-E2E-012~016(README)은 M5 몫 ③ 이번 마일스톤에서 `npm test` 전체 재실행 없음 — test 값 무변경은 diff 로 잠김(M3 의 285 가 최신 스위트 값).
- **Residual-risk**: `npx tsx` 형태는 npm 실행마다 npx 해소를 거친다 — 오프라인 신규 클론의 tsx 부재 시 npx 가 설치 시도로 빠질 수 있다는 D4 계열 공시는 유효(스크립트 자체의 의존성 한 줄 가드는 별도 실측됨). 배선 형태 3건은 각 1회 관측.

### M5 — README 갱신 (리드 검토 게이트 통과)

산출물: `README.md` (8+/3−). ㉠ 경고 세 자리(5·225·236 — 앵커 «지금 상태»/«열린 갈래»/«배포 경계») «생산 배치»→«서비스화» **문언만** 교체(경고 문장 삭제 없음) ㉡ 보안 절 끝에 **정본 §5 문면 그대로** 트리거 세 줄(㉠ 서비스화 — t23·t17·t16-b·t20-F08 명시 · ㉡ 승인 적체 → t12 · ㉢ 다른 PC 봇 → N5) ㉢ 명령어 표에 `npm run e2e` 행. **울타리 유지 실측**: «내 PC» 2건(3·190)·`server/src/config.ts` 무변경·`fetch_history` 서술은 채널 코드 대조로 일치 확인(`channel-server.ts:100·104`) — 신규 작성 없음.

| 검사 | 명령(축자) | 관측 |
|---|---|---|
| AC-E2E-012 ① | `grep -c "생산 배치" README.md` | `0` *(사전 상태 3)* |
| AC-E2E-012 ②㉠㉡㉢ | 앵커+문언 결합 grep 3건 | `1`/`1`/`1` *(사전 상태 각 0)* |
| AC-E2E-013 ① | `git diff --name-only 2a19d7d..HEAD \| grep -c "server/src/config.ts"` | `0` |
| AC-E2E-013 ② | `grep -c "내 PC" README.md` | `2` — 유지 |
| AC-E2E-013 ③ | `git diff 2a19d7d..HEAD -- README.md \| grep -cE '^[-+].*내 PC'` (v0.3.2 정정 형태) | **커밋 뒤 직접 실행 `0`** (grep exit 1) — 아래 정정 기록 |
| AC-E2E-013 ④ | 기준선 생존 가드 | `exit=0` |
| AC-E2E-014 | awk 보안 절 추출 후 서비스화·t12·N5 | `3`/`1`/`1` — 각 ≥1 *(사전 상태 각 0)* |
| AC-E2E-015 | 명령어 절 내 `npm run e2e` | `1` |

- **어간 재훑기 분류표**: «생산 배치» — **적중 0건**. `t23` — 4건(5·225·236·240): 5·225·236 은 사전부터 있던 자리(교체와 무관), 240 은 이번에 더한 트리거 첫 줄(정본 §5 문면)로 **교체가 만든 거짓 자리가 아니라 계획된 추가**. «서비스화» — 4줄(교체 3 + 트리거 첫 줄 1).
- **리드 검토 게이트(2026-08-31) — 3건 판정**: ① **diff 승인**(리드 직접 재현 — 문장 삭제 없음·트리거 정본 문면·울타리 유지 확인) ② **«서비스화에서» 문언 정본 글자 충실 유지 확정**(자연독 개선 «서비스화한 배치에서» 는 N3 문서 정정 묶음 이월 후보로만 기록 — t6 에서 결정 넓히지 않음) ③ **AC-E2E-013 ③ 정정 승인**(아래).
- **AC-E2E-013 ③ 결함 발견→정정 전체 경로**: 스폰이 실측 발견 — 구 명령 `grep -c "내 PC"` 는 **컨텍스트 행도 세어**, AC-E2E-012 ②㉠ 의무 편집(5행)의 diff hunk 가 3행 «내 PC» 를 문맥 행으로 반드시 나르므로(작업트리 형태 실측 `1` — 적중 줄 3행 원문·공백 접두) 커밋 뒤 **무조건 빨강**이 예정돼 있었다(D-02 무조건 초록의 쌍대). 추가·삭제행만 세는 의도 형태는 `0`. 레인이 리드에 판정 요청 → 리드 재현·승인 → **manager-spec 재위임 경로로 정정**(spec.md **v0.3.2** — HISTORY 0.3.2 행: 결함 본질·쌍대 귀속·«완화 아님» 근거·AC·REQ·Tier 무변경) → **정정 커밋 `346a077`** → 정정 후 측정 ③ 커밋 형태 직접 실행 **`0`** (위 표).
- 측정 환경 귀속: 스폰 측정 @ `cb3c665`, 측정 ③ 최종 관측은 정정 커밋 `346a077` 뒤.
- **Gaps**: ① AC-E2E-016(금지어 검사)과 변이표는 M6 몫 ② 트리거 세 줄의 «절 안 배치» 는 014 의 awk 범위로만 검증됐고 사람이 읽는 위치 적절성은 문언 판단 영역(리드가 diff 승인으로 닫음).
- **Residual-risk**: 트리거 줄 추가로 README 의 t23 언급이 3→4 — t23 관련 후속 카드가 이 증가를 알아야 한다. 과도기 어긋남(트리거 ㉠ «사내망 전용» vs 3·190행 «내 PC»)은 공시된 t26 이월 — 이 카드의 미결이 아니다.

## §E.3 Run-phase Audit-Ready Signal

_<pending run-phase>_

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
