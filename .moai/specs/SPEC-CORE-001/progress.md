# SPEC-CORE-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CORE-001` |
| 칸반 카드 | `t1` (마일스톤 M1) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan.md` Task 1-2 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec.md` 5장 (데이터 모델) |
| 워크트리 | `.claude/worktrees/t1` (브랜치 `WT-scaffold-db-schema`) |
| 현재 상태 | `completed` — sync 단계 완료 (§E.4 audit-ready) |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-26
spec_id: SPEC-CORE-001
tier: M
card: t1
source_plan: .moai/plan/2026-08-26-minidiscord/plan.md (Task 1-2)
```

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-CORE-001/spec.md` | GEARS 요구사항 15개 (REQ-CORE-001..015), 범위 밖 7개 항목, 제약, HISTORY |
| `.moai/specs/SPEC-CORE-001/plan.md` | 되돌리기 어려운 결정(데이터 모델 / 타입 계약) 우선 배치, 마일스톤 M1-M2, 위험 4건, 안티패턴 5건 |
| `.moai/specs/SPEC-CORE-001/acceptance.md` | 수용 기준 14개 (AC-CORE-001..014), Given-When-Then 시나리오, 엣지 케이스, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-CORE-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-CORE-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### 이 단계에서 하지 않은 것 (Gaps)

- 코드는 한 줄도 작성하지 않았다. `server/src/*`, 루트 `package.json`, `.gitignore` 모두 미생성 — run 단계 소관이다.
- 의존성 설치를 시도하지 않았으므로 `better-sqlite3` 네이티브 빌드 가능 여부는 **미검증**이다 (plan.md §D 위험 1번).
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. 전부 run 단계에서 처음 실행된다.

---

## §E.2 Run-phase Evidence

실행 환경: Node v24.12.0, npm 11.6.2, 워크트리 `.claude/worktrees/t1` (브랖치 `WT-scaffold-db-schema`, 시작 HEAD `7e254ff`).
모든 테스트/검증 명령은 `unset MOAI_KANBAN MOAI_KANBAN_ID MOAI_KANBAN_LABEL MOAI_KANBAN_LEAD_ADDR MOAI_KANBAN_SETTINGS_INJECTED && <명령>` 단일 복합 호출로 실행했다 (칸반 환경변수 스크럽).

### M1 — 워크스페이스 스캐폴드와 헬스 체크

의존성 설치 (원본 plan.md §F M1 step 2 명령 그대로):

```
$ npm install -w server fastify @fastify/cookie @fastify/multipart @fastify/static better-sqlite3 ws
added 79 packages, and audited 81 packages in 4s
32 packages are running for funding
found 0 vulnerabilities
EXIT_PROD=0

$ npm install -w server -D typescript tsx vitest @types/node @types/better-sqlite3 @types/ws
added 53 packages, and audited 134 packages in 6s
49 packages are running for funding
found 0 vulnerabilities
EXIT_DEV=0
```

`better-sqlite3` 네이티브 빌드는 사전 빌드 바이너리로 해결되어 plan.md §D 위험 1번은 발생하지 않았다 (설치 4초, 오류 없음).

**RED (AC-CORE-014 전이 1)** — `health.test.ts` 작성 후, 구현 없는 상태:

```
$ npm test -w server
 ❯ test/health.test.ts (0 test)
 FAIL  test/health.test.ts [ test/health.test.ts ]
Error: Cannot find module '../src/index.js' imported from .../server/test/health.test.ts
 Test Files  1 failed (1)
      Tests  no tests
EXIT_CODE=1
```

**GREEN (AC-CORE-014 전이 2)** — `config.ts` + `index.ts` 구현 후:

```
$ npm test -w server
 Test Files  1 passed (1)
      Tests  1 passed (1)
EXIT_CODE=0

$ npm run typecheck -w server
> typecheck
> tsc --noEmit
EXIT_CODE=0
```

### M2 — SQLite 스키마

**RED (AC-CORE-014 전이 3)** — `db.test.ts` 작성 후, 구현 없는 상태:

```
$ npm test -w server
 FAIL  test/db.test.ts [ test/db.test.ts ]
Error: Cannot find module '../src/db.js' imported from .../server/test/db.test.ts
 Test Files  1 failed | 1 passed (2)
      Tests  1 passed (1)
```

(npm error code 1로 종료 — `health.test.ts` 1개는 계속 통과)

**GREEN (AC-CORE-014 전이 4)** — `db.ts` 구현 후:

```
$ npm test -w server
 Test Files  2 passed (2)
      Tests  3 passed (3)
EXIT_CODE=0

$ npm run typecheck -w server
EXIT_CODE=0
```

### AC-CORE-007 fallback 및 관측 (acceptance.md 구현자 주에 따른 대체 경로)

인라인 형태 `npx -w server tsx -e "import {config} from './server/src/config.js'; ..."`는 예고된 대로 실패했다 — `-w server`가 cwd를 `server/`로 옮겨 `./server/src/config.js` 상대 경로가 깨진다:

```
Error: Cannot find module './server/src/config.js'
Require stack:
- .../worktrees/t1/server/[eval]
```

대체: `server/test/config.test.ts` 추가 (관측값 8개 동일). 테스트 수 3 → 5 (delta +2, config 2개):

```
$ npm test -w server
 Test Files  3 passed (3)
      Tests  5 passed (5)
EXIT_CODE=0
```

통과 단언 = 관측값: 기본 `3000 ./data ./data/minidiscord.db ./data/uploads`, 재정의 `4100 /tmp/md /tmp/md/minidiscord.db /tmp/md/uploads`.

### AC-CORE-010/011 관측 (파일 실행 형식)

인라인 `tsx -e`는 `-w server` 유무와 무관하게 `[eval]` 컨텍스트에서 상대 import를 해석하지 못했다 (`Cannot find module './server/src/db.js'`, require stack `[eval]`). AC-CORE-015 2단계가 이미 쓰는 파일 실행 형식과 동일하게 `server/test/probe-db.ts` (vitest 대상 아님)로 관측했다:

```
$ npx -w server tsx test/probe-db.ts
wal
idx_messages_room,idx_targets_bot
EXIT_CODE=0
```

### AC-CORE-015 관측

1단계 — perl supervisor(`setpgrp` + 15초 알람, 명령은 acceptance.md 원문)로 `MINIDISCORD_PORT=4199 npm run dev -w server` 실행, curl 재시도로 관측:

```
$ curl -fsS --retry 20 --retry-delay 1 --retry-connrefused --retry-max-time 12 http://127.0.0.1:4199/api/health
{"ok":true}
CURL_EXIT=0

$ pgrep -f "tsx src/index.ts" || echo "NO_ORPHAN"
NO_ORPHAN
```

supervisor 종료 코드 142 = SIGALRM 회수 (acceptance.md 기재된 이 머신 실측값과 동일, 정상 회수).

2단계 — `server/test/no-listen.ts` (acceptance.md 지정 내용 그대로)를 perl 10초 상한으로 import 실행:

```
$ perl -e '<supervisor>' 10 npx -w server tsx test/no-listen.ts; echo $?
STEP2_EXIT=0
```

### AC 매트릭스 (전 15개)

| AC | 판정 | 근거 (위 출력와 대응) |
|----|------|---------------------|
| AC-CORE-001 | PASS | `node -e "...p.workspaces)"` → `true ["server","channel"]` |
| AC-CORE-002 | PASS | `npm run typecheck -w server` → `EXIT_CODE=0` (최종 tree에서 재확인) |
| AC-CORE-003 | PASS | `git check-ignore -q node_modules/ && git check-ignore -q data/ && git check-ignore -q dist/` → `IGNORE_EXIT=0` |
| AC-CORE-004 | PASS | `npm test -w server`에 `health.test.ts` `GET /api/health returns ok` 포함 통과 (Tests 5 passed에 포함) |
| AC-CORE-005 | PASS | `db.test.ts` `creates all tables` 통과 |
| AC-CORE-006 | PASS | `db.test.ts` `is idempotent (reopen same file)` 통과 |
| AC-CORE-007 | PASS | fallback 경로 — `config.test.ts` 8개 관측값 단언 통과 (위 fallback 절) |
| AC-CORE-008 | PASS | `health.test.ts`가 `import { buildServer } from '../src/index.js'`로 무오류 통과 = 이름 붙은 내보내기 존재 |
| AC-CORE-009 | PASS | `grep -c "export function openDb" server/src/db.ts` → `1` |
| AC-CORE-010 | PASS | `npx -w server tsx test/probe-db.ts` → `wal` |
| AC-CORE-011 | PASS | 동일 명령 → `idx_messages_room,idx_targets_bot` |
| AC-CORE-012 | PASS | `ls server/src` → `config.ts db.ts index.ts` (정확히 세 항목) |
| AC-CORE-013 | PASS | `node -e "...p.scripts)"` → `module dev,test,typecheck` |
| AC-CORE-014 | PASS | 네 전이 원문 출력 (위 M1/M2 절, 순서대로) |
| AC-CORE-015 | PASS | 1단계 `{"ok":true}` + `NO_ORPHAN`, 2단계 `STEP2_EXIT=0` |

### 구현 편차 (원본 대비 변경 4건, 모두 기록 대상)

1. **`server/tsconfig.json`에 `"skipLibCheck": true` 1줄 추가.** 원본 그대로는 typecheck가 `node_modules/thread-stream/index.d.ts(96,73): error TS2694: Namespace '"worker_threads"' has no exported member 'TransferListItem'`로 실패 (Node 24 최신 `@types/node`에서 `TransferListItem` 제거 — fastify→pino→thread-stream 상류 `.d.ts` 호환 문제). REQ-CORE-003의 strict+NodeNext+ES2022+include는 그대로 유지.
2. **`server/test/config.test.ts` 추가 (AC-CORE-007 fallback).** acceptance.md 구현자 주가 명시한 대체 경로. 테스트 수 3 → 5.
3. **`server/test/probe-db.ts`, `server/test/no-listen.ts` 추가 (AC 검증 보조).** no-listen.ts는 acceptance.md가 지정한 내용 그대로, probe-db.ts는 인라인 `tsx -e` 실패를 받아 AC-CORE-015 2단계와 동일한 파일 실행 형식으로 WAL/인덱스를 관측하기 위한 보조. 둘 다 `*.test.ts`가 아니므로 vitest 테스트 수에는 영향 없음.
4. **루트 `package.json`에 `scripts.test`(`npm test --workspaces --if-present`) 추가.** pre-commit `moai gate`가 루트 `npm test`를 실행하는데 원본 루트 package.json(VERBATIM)에는 test 스크립트가 없어 M1 커밋이 차단되었다(§E.2 "커밋 상태 (차단)" 참조). 운영자 승인으로 추가를 확정했고, 원본 plan 어디에도 루트 test 스크립트는 없으므로 구현 편차로 기록한다.

### 커밋 상태 (차단)

M1 커밋 시도(`feat(SPEC-CORE-001): M1 scaffold workspace with server health endpoint (card t1)`)가 pre-commit hook의 `moai gate`에서 차단됐다 — 게이트가 루트 `npm test`를 실행하는데 원본 루트 package.json에는 test 스크립트가 없다(`npm error Missing script: "test"`). 루트 package.json에 test 위임 스크립트 추가는 승인 거부되었고, 게이트 우회(`--no-verify`/`SKIP_MOAI_PRECOMMIT=1`)는 금지되어 있다. M1 9개 파일은 staged 상태로 유지, M2/검증보조 파일은 untracked로 유지 — 커밋은 재위임 시 옵션 확정 후 즉시 가능.

**해결 (2026-08-26 블로커 해제 재개).** 운영자 승인으로 루트 `package.json` `scripts.test` 추가를 확정(구현 편차 4번)했고, 적용 직후 루트 `npm test` → `Test Files 3 passed (3), Tests 5 passed (5), ROOT_TEST_EXIT=0`을 관측했다. 이후 M1(`8d58265`)·M2(`a97d36c`) 커밋 모두 pre-commit 게이트를 통과했다. 커밋 서브젝트는 재시도 형태가 아닌 acceptance.md DoD가 지정한 원문 2개를 그대로 사용했다.

### 이 단계에서 관측하지 못한 것 (Gaps)

- **M1/M2 커밋 SHA — 미검증(불능).** pre-commit 게이트 차단으로 커밋이 존재하지 않는다. 게이트 해결 후 커밋 시 §E.3의 SHA 필드를 갱신해야 한다.
- 원본이 요구한 커밋 메시지 2개(`chore: scaffold...`/`feat: sqlite schema...`)와 acceptance.md DoD의 "커밋 2개" 항목은 이 시점 미충족이다.

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-26
spec_id: SPEC-CORE-001
tier: M
card: t1
m1_commit: 8d58265
m2_commit: a97d36c
head: a97d36c
blocker_resolved: root scripts.test added as deviation #4 (operator-approved); root npm test observed 5 passed, exit 0
code_state: M1+M2 committed on WT-scaffold-db-schema; both pre-commit 'moai gate' runs passed
```

블로컈(pre-commit 게이트) 해제 후 커밋 2개가 게이트를 통과해 `run_status`를 `audit-ready`로 갱신했다. SHA는 `git log --oneline -3` 실측값(`8d58265` M1, `a97d36c` M2)이고, 커밋 서브젝트는 acceptance.md DoD의 원문 2개와 동일하므로 DoD "커밋 2개" 항목이 충족됐다. §E.2의 Gaps 2건(SHA 미검증·커밋 미충족)도 이 시점에 해소됐다.

---

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-ready
sync_complete_at: 2026-08-26
spec_id: SPEC-CORE-001
tier: M
card: t1
worktree: .claude/worktrees/t1 (branch WT-scaffold-db-schema)
base_head: a97d36c
status_transition: in-progress -> completed (spec.md frontmatter)
docs_written: README.md, CHANGELOG.md
```

### 작성한 문서

| 파일 | 내용 | 근거 |
|------|------|------|
| `README.md` (신규) | 프로젝트 소개, 실행 방법, 환경변수 2개, 명령어 4개, 폴더 구조, DB 표 8개 요약 | 코드 실측 — `server/src/{config,db,index}.ts`, `server/package.json` scripts 3개 |
| `CHANGELOG.md` (신규) | `[Unreleased]` — 추가된 산출물, 구현 편차 2건(skipLibCheck / 루트 test 스크립트), 범위 밖 항목 | `§E.2 구현 편차` 1·4번, `spec.md` §5 범위 밖 |

README는 현재 구현된 범위만 기술한다. 원본 `plan.md`가 M6에 배정한 전체 README(전 기능 사용법·E2E 검증 절차)는 이 SPEC의 범위가 아니며, 이 파일은 그 시점에 확장된다.

### 상태 전이

`spec.md` frontmatter `status: in-progress` → `completed` 1건. `plan.md` / `acceptance.md` / 이 파일에는 frontmatter가 없어 전이 대상이 아니다. 세 문서의 본문은 수정하지 않았다 (sync 단계는 SPEC 본문 소유자가 아님).

### 검증 (이 단계에서 실제 실행한 명령과 관측 출력)

모든 명령은 `unset MOAI_KANBAN MOAI_KANBAN_ID MOAI_KANBAN_LABEL MOAI_KANBAN_LEAD_ADDR MOAI_KANBAN_SETTINGS_INJECTED && <명령>` 단일 복합 호출로, 워크트리 루트(`.claude/worktrees/t1`)에서 실행했다.

```
$ npm run typecheck -w server
> tsc --noEmit
TYPECHECK_EXIT=0

$ npm test          # 루트 위임 → server 워크스페이스
 Test Files  3 passed (3)
      Tests  5 passed (5)
ROOT_TEST_EXIT=0
```

`base_head`는 문서 작성 전 tree의 HEAD(`a97d36c`, §E.3 m2_commit과 동일)이고, 위 두 명령은 문서 추가 후 같은 tree에서 실행한 결과다. 문서만 추가했으므로 코드 경로에는 변경이 없다.

### 이 단계에서 관측하지 못한 것 (Gaps)

- **sync 커밋 SHA — 이 파일에 미기재.** SHA는 이 파일을 포함하는 커밋 자신이므로 커밋 시점 이전에는 알 수 없다. 실측 SHA는 lead 보고와 `git log --oneline -1`로 확인한다.
- **서버 실기동 재확인은 하지 않았다.** AC-CORE-015(실기동 + orphan 없음)는 run 단계 §E.2에서 관측됐고, 이 단계는 문서만 추가했으므로 재실행하지 않았다. 이 단계의 근거는 위 typecheck/test 두 건뿐이다.
- **README 링크 대상 실재 확인은 파일 존재 수준까지만 했다.** `ROADMAP.md`·`CHANGELOG.md`·`.moai/specs/SPEC-CORE-001/`는 모두 존재하지만, 링크 렌더링을 브라우저에서 확인하지는 않았다.
- **PR 생성·병합은 하지 않았다.** 카드 지시(`cmd: /moai sync SPEC-CORE-001`)에 PR 항목이 없고, 브랜치 `WT-scaffold-db-schema`는 미푸시 상태다. 통합 판단은 lead 소관이다.

### 잔여 위험

- `skipLibCheck: true`는 상류 타입 선언 오류를 가린다. 지금은 `thread-stream` 한 건 때문이지만, 앞으로 프로젝트 자체 코드의 타입 오류는 아니어도 의존성 타입 문제를 놓칠 수 있다. CHANGELOG에 기록해 두었다.
- 의존성 실제 설치 버전이 원본 plan의 하한선보다 높다(`better-sqlite3 ^13`, `typescript ^7`, `vitest ^4`). plan이 "설치 시점 최신"을 허용하므로 위반은 아니지만, 이후 카드가 하한선 기준으로 작성된 예제를 그대로 쓰면 어긋날 수 있다.
