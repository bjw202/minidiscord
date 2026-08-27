# SPEC-CORE-001 수용 기준

각 기준은 **명령 하나 + 관측 가능한 결과 하나**로 이루어진다. 판정은 이분법이다 — 통과 아니면 실패이고, 그 사이는 없다.

모든 명령은 별도 언급이 없는 한 워크스페이스 루트에서 실행한다.

---

## AC 매트릭스

| ID | 요구사항 | 명령 | 관측할 결과 |
|----|----------|------|-------------|
| AC-CORE-001 | REQ-CORE-001 | `node -e "const p=require('./package.json');console.log(p.private,JSON.stringify(p.workspaces))"` | `true ["server","channel"]` |
| AC-CORE-002 | REQ-CORE-003 | `npm run typecheck -w server` | 종료 코드 `0` |
| AC-CORE-003 | REQ-CORE-004 | `git check-ignore -q node_modules/ && git check-ignore -q data/ && git check-ignore -q dist/; echo $?` | `0` |
| AC-CORE-004 | REQ-CORE-009 | `npm test -w server` | `health.test.ts` 의 `GET /api/health returns ok` 통과 |
| AC-CORE-005 | REQ-CORE-012 | `npm test -w server` | `db.test.ts` 의 `creates all tables` 통과 |
| AC-CORE-006 | REQ-CORE-013 | `npm test -w server` | `db.test.ts` 의 `is idempotent (reopen same file)` 통과 |
| AC-CORE-007 | REQ-CORE-005..007 | 아래 AC-CORE-007 본문 참조 | 기본값과 환경변수 재정의가 모두 관측됨 |
| AC-CORE-008 | REQ-CORE-008 | `node -e "import('./server/src/index.ts')"` 대신 typecheck + 테스트 통과로 간접 확인 | `buildServer` 를 이름으로 가져오는 `health.test.ts` 가 통과 |
| AC-CORE-009 | REQ-CORE-011 | `grep -c "export function openDb" server/src/db.ts` | `1` |
| AC-CORE-010 | REQ-CORE-014 | 아래 AC-CORE-010 본문 참조 | `wal` |
| AC-CORE-011 | REQ-CORE-012 | 아래 AC-CORE-011 본문 참조 | 인덱스 2개 존재 |
| AC-CORE-012 | REQ-CORE-015 | `ls server/src` | 정확히 `config.ts`, `db.ts`, `index.ts` 세 파일만 |
| AC-CORE-013 | REQ-CORE-002 | `node -e "const p=require('./server/package.json');console.log(p.type,Object.keys(p.scripts).sort().join(','))"` | `module dev,test,typecheck` |
| AC-CORE-014 | RED→GREEN 전이 | 아래 AC-CORE-014 본문 참조 | 구현 전 실패, 구현 후 통과 |
| AC-CORE-015 | REQ-CORE-010 | 아래 AC-CORE-015 본문 참조 | 직접 실행 시 `{"ok":true}` 관측, 가져오기만 할 때 종료 출력 `0`, 기본 호스트 `127.0.0.1` 과 `MINIDISCORD_HOST` 재정의가 모두 관측됨 |

---

## Given-When-Then 시나리오

### AC-CORE-001 — 워크스페이스 루트

**Given** 저장소 루트에 `package.json` 이 있다.
**When** `node -e "const p=require('./package.json');console.log(p.private,JSON.stringify(p.workspaces))"` 를 실행한다.
**Then** 출력이 `true ["server","channel"]` 이다.

### AC-CORE-002 — 타입 검사 통과

**Given** `server/tsconfig.json` 이 strict + NodeNext 로 설정되어 있고 `src` 와 `test` 를 포함한다.
**When** `npm run typecheck -w server` 를 실행한다.
**Then** 종료 코드가 `0` 이고 어떤 타입 오류도 출력되지 않는다.

### AC-CORE-003 — 데이터가 추적되지 않음

**Given** `.gitignore` 가 저장소 루트에 있다.
**When** `git check-ignore -q node_modules/ && git check-ignore -q data/ && git check-ignore -q dist/; echo $?` 를 실행한다.
**Then** 출력이 `0` 이다 (세 경로를 각각 확인하여 모두 무시 대상 — 인자 끝에 슬래시를 붙인 형태라 디렉터리가 디스크에 없어도 패턴 매칭이 성립한다. 어느 하나라도 무시되지 않으면 체인이 끊겨 `1`).

### AC-CORE-004 — 헬스 체크 응답

**Given** `buildServer()` 로 조립한 Fastify 인스턴스가 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `health.test.ts` 의 테스트 `GET /api/health returns ok` 가 통과한다. 이 테스트는 `app.inject({ method: 'GET', url: '/api/health' })` 의 `statusCode` 가 `200`, `json()` 이 `{ ok: true }` 임을 단언한다.

### AC-CORE-005 — 여덟 개 테이블 생성

**Given** 빈 임시 디렉터리의 새 DB 경로가 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `db.test.ts` 의 테스트 `creates all tables` 가 통과한다. 이 테스트는 `sqlite_master` 조회 결과에 `users`, `sessions`, `rooms`, `bots`, `bot_tokens`, `messages`, `message_targets`, `attachments` 여덟 이름이 모두 포함됨을 단언한다.

### AC-CORE-006 — 재열기 멱등성

**Given** `rooms` 테이블에 이름 `r1` 인 행 하나가 들어 있는 DB 파일이 있고, 그 연결은 닫혀 있다.
**When** `npm test -w server` 를 실행한다.
**Then** `db.test.ts` 의 테스트 `is idempotent (reopen same file)` 가 통과한다. 같은 경로로 `openDb` 를 다시 호출한 뒤 `SELECT name FROM rooms` 결과가 정확히 `[{ name: 'r1' }]` 이다.

### AC-CORE-007 — 설정 기본값과 환경변수 재정의

**Given** `server/src/config.ts` 가 있다.
**When** 다음 두 명령을 차례로 실행한다.

```bash
npx -w server tsx -e "import {config} from './server/src/config.js'; console.log(config.port, config.dataDir, config.dbPath, config.uploadsDir)"
MINIDISCORD_PORT=4100 MINIDISCORD_DATA_DIR=/tmp/md npx -w server tsx -e "import {config} from './server/src/config.js'; console.log(config.port, config.dataDir, config.dbPath, config.uploadsDir)"
```

**Then** 첫 출력이 `3000 ./data ./data/minidiscord.db ./data/uploads` 이고, 둘째 출력이 `4100 /tmp/md /tmp/md/minidiscord.db /tmp/md/uploads` 이다.

> 구현자 주: 위 인라인 실행 형태가 워크스페이스 해석 문제로 동작하지 않으면, 동등한 단언을 담은 `server/test/config.test.ts` 를 추가하고 `npm test -w server` 통과로 대체한다. 대체 시 관측 대상 값 여덟 개는 그대로 유지한다.

### AC-CORE-008 — `buildServer` 이름 붙은 내보내기

**Given** `server/test/health.test.ts` 가 `import { buildServer } from '../src/index.js'` 로 시작한다.
**When** `npm test -w server` 를 실행한다.
**Then** 모듈 해석 오류 없이 테스트가 통과한다 (이름 붙은 내보내기가 존재한다는 증거).

### AC-CORE-009 — `openDb` 내보내기

**Given** `server/src/db.ts` 가 있다.
**When** `grep -c "export function openDb" server/src/db.ts` 를 실행한다.
**Then** 출력이 `1` 이다.

### AC-CORE-010 — WAL 저널 모드

**Given** `openDb` 로 연 DB 연결이 있다.
**When** 다음을 실행한다.

```bash
npx -w server tsx -e "import {openDb} from './server/src/db.js'; const d=openDb('/tmp/md-wal.db'); console.log(d.pragma('journal_mode',{simple:true}))"
```

**Then** 출력이 `wal` 이다.

### AC-CORE-011 — 인덱스 두 개

**Given** `openDb` 로 스키마가 생성된 DB가 있다.
**When** 다음을 실행한다.

```bash
npx -w server tsx -e "import {openDb} from './server/src/db.js'; const d=openDb('/tmp/md-idx.db'); console.log(d.prepare(\"SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name\").all().map(r=>r.name).join(','))"
```

**Then** 출력이 `idx_messages_room,idx_targets_bot` 이다.

### AC-CORE-012 — 범위 경계 유지

**Given** 이 SPEC의 구현이 끝났다.
**When** `ls server/src` 를 실행한다.
**Then** 출력이 정확히 `config.ts`, `db.ts`, `index.ts` 세 항목이다. `auth.ts`, `routes-*.ts`, `mention.ts`, `sse.ts`, `gateway.ts`, `permissions.ts` 중 어느 것도 존재하지 않는다.

### AC-CORE-013 — 서버 패키지 스크립트

**Given** `server/package.json` 이 있다.
**When** `node -e "const p=require('./server/package.json');console.log(p.type,Object.keys(p.scripts).sort().join(','))"` 를 실행한다.
**Then** 출력이 `module dev,test,typecheck` 이다.

### AC-CORE-014 — RED → GREEN 전이 증거

**Given** 테스트 파일은 작성했지만 대응하는 구현 파일은 아직 없다.
**When** 각 단계에서 `npm test -w server` 를 실행한다.
**Then** 다음 네 전이가 순서대로 관측된다.

| 단계 | 상태 | 관측 |
|------|------|------|
| 1 | RED | `health.test.ts` 실패, 메시지에 `Cannot find module '../src/index.js'` 포함 |
| 2 | GREEN | `config.ts` + `index.ts` 구현 후 `health.test.ts` 통과 (1 test) |
| 3 | RED | `db.test.ts` 추가 후 실패, 메시지에 `Cannot find module '../src/db.js'` 포함 |
| 4 | GREEN | `db.ts` 구현 후 `db.test.ts` 2개 테스트 모두 통과 |

각 전이의 실제 명령 출력을 `progress.md` `§E.2 Run-phase Evidence` 에 기록한다.

### AC-CORE-015 — 진입점 직접 실행 시에만 수신, 그리고 루프백 기본 바인드

**Given** M1 이 끝나 `server/src/index.ts` 구현과 `dev` 스크립트(`tsx src/index.ts`)가 갖춰져 있다.

**When** 다음 세 단계를 차례로 실행한다.

1단계 — 진입점으로 직접 실행 (비기본 포트에서 수신 시작):

```bash
MINIDISCORD_PORT=4199 perl -e '$t=shift; $pid=fork(); if(!$pid){ setpgrp(0,0); exec(@ARGV) or exit(127) } $SIG{ALRM}=sub{ kill q(ALRM), -$pid }; alarm $t; waitpid($pid,0); exit(($? & 127) ? 128+($? & 127) : ($? >> 8))' 15 npm run dev -w server &
S=$!
for i in $(seq 1 20); do curl -fsS http://127.0.0.1:4199/api/health 2>/dev/null && break; sleep 0.5; done
wait $S
```

2단계 — 모듈을 가져오기만 함 (수신 없음). 먼저 `server/test/no-listen.ts` 를 아래 내용으로 작성한다 (vitest 실행 대상이 아닌 검증 보조 파일 — 파일명이 `*.test.ts` 가 아니므로 `npm test` 의 테스트 수는 그대로 3개다):

```ts
// AC-CORE-015 검증 보조 — 가져오기만 하고 스스로 종료해야 한다 (vitest 실행 대상 아님)
import '../src/index.js'
```

이어서 다음을 실행한다:

```bash
perl -e '$t=shift; $pid=fork(); if(!$pid){ setpgrp(0,0); exec(@ARGV) or exit(127) } $SIG{ALRM}=sub{ kill q(ALRM), -$pid }; alarm $t; waitpid($pid,0); exit(($? & 127) ? 128+($? & 127) : ($? >> 8))' 10 npx -w server tsx test/no-listen.ts; echo $?
```

3단계 — 수신 호스트 확인 (기본값과 환경변수 재정의):

```bash
npx -w server tsx -e "import(process.cwd()+'/src/config.ts').then(m=>console.log(m.config.host))"
MINIDISCORD_HOST=0.0.0.0 npx -w server tsx -e "import(process.cwd()+'/src/config.ts').then(m=>console.log(m.config.host))"
```

> 형태 주: `-w server` 가 작업 디렉터리를 `server/` 로 옮기므로 `process.cwd()` 기준 절대 경로로 동적 임포트한다. 정적 `import ... from './server/src/config.js'` 형태는 `[eval]` 모듈에서 상대 경로가 풀리지 않아 `MODULE_NOT_FOUND` 로 실패한다(이 머신 실측). 위 두 명령은 이 트리에서 실제로 실행해 각각 `127.0.0.1` 과 `0.0.0.0` 을 출력하는 것을 확인했다.

**Then** 1단계에서 `curl` 이 `{"ok":true}` 를 출력한다 — 비기본 포트 `4199` 로 응답한다는 점이 수신 포트가 `config.port` 에서 왔다는 증거다. 2단계의 출력이 `0` 이다 — 리스너가 이벤트 루프를 붙잡고 있었다면 프로세스는 스스로 종료하지 못하고 상한 시점에 `SIGALRM` 으로 죽어 출력이 `0` 이 아닌 값(이 머신 실측 `142`)이 된다. 판정은 이분법이다 — 출력이 `0` 이면 통과, 그 외에는 실패. 3단계의 첫 출력이 `127.0.0.1` 이고 둘째 출력이 `0.0.0.0` 이다 — 기본이 루프백이고 `MINIDISCORD_HOST` 로만 넓어진다는 증거다(REQ-CORE-010). 셋 중 하나라도 어긋나면 실패다.

띄운 프로세스의 상한은 전부 perl 알람 셸이 보장한다 — 셸은 자식을 새 프로세스 그룹으로 띄우고(`setpgrp`) 알람 시점에 그 그룹 전체에 `SIGALRM` 을 보낸다. 리스너가 `npm` 의 손자 프로세스여도 그룹째로 죽는다(이 머신에서 실측 — exec 만 하는 단순 알람 셸은 `npm` 만 죽고 손자 node 리스너가 포트를 붙잡은 채 살아남는다). trailing `kill` 을 쓰지 않는다 — 1단계의 `wait $S` 는 알람이 서버를 회수하는 것을 기다리기만 한다.

전제: macOS 에는 GNU `timeout` 이 없다(이 머신 실측 — 실행 시 exit `127`, `gtimeout` 도 없음). GNU `timeout`/`gtimeout` 이 있는 환경은 그것으로 동등하게 대체 가능하다 (`command -v gtimeout || command -v timeout` 이 있으면 사용, 없으면 위 perl 셸 — macOS 기본 perl 사용, 추가 설치 불필요).

> 구현자 주: 진입점 가드(`process.argv[1]?.includes('index.ts')`)가 tsx runner 아래에서 발동하는지가 1단계의 전제다. `curl` 이 응답하지 않으면 가드 조건부터 확인한다.

---

## 엣지 케이스

| 케이스 | 기대 동작 | 검증 |
|--------|-----------|------|
| `MINIDISCORD_PORT` 가 비어 있는 문자열 | `Number('')` 은 `0` 이 되므로, `??` 기본값이 적용되지 않는다. 이 SPEC은 현재 동작을 그대로 두되 AC-CORE-007 에는 포함하지 않는다 | 범위 밖 — 이후 카드에서 검증 강화 |
| `dataDir` 경로에 후행 슬래시 | `dbPath` 에 이중 슬래시가 생길 수 있다. 문자열 연결 방식이므로 허용한다 | 범위 밖 |
| DB 파일이 있는 디렉터리가 없음 | `better-sqlite3` 가 오류를 던진다. 이 SPEC은 디렉터리 생성 책임을 지지 않는다 | 범위 밖 — 데이터 디렉터리 준비는 이후 카드 |
| `openDb` 를 같은 경로로 동시에 두 번 호출 | WAL 모드에서 다중 연결이 허용된다 | AC-CORE-006 이 순차 재열기까지만 다룬다 |

---

## 품질 게이트

| 게이트 | 기준 | 명령 |
|--------|------|------|
| Tested | `server/test/` 의 테스트 3개(health 1 + db 2)가 모두 통과 | `npm test -w server` |
| Readable | 코드 주석은 한국어(`code_comments: ko`), 파일당 단일 책임 | 리뷰 |
| Unified | TypeScript strict, NodeNext 일관 적용 | `npm run typecheck -w server` |
| Secured | 데이터가 코드 디렉터리 밖(`data/`)에 있고 `.gitignore` 로 추적 제외 | AC-CORE-003 |
| Trackable | 커밋 메시지가 Conventional Commits (`chore:`, `feat:`) | `git log --oneline` |

---

## Definition of Done

- [ ] AC-CORE-001 부터 AC-CORE-015 까지 전부 통과, 각 항목의 명령 출력이 `progress.md` `§E.2` 에 기록됨
- [ ] `npm test -w server` 가 3개 테스트 통과로 종료 코드 `0`
- [ ] `npm run typecheck -w server` 가 종료 코드 `0`
- [ ] `server/src` 에 `config.ts`, `db.ts`, `index.ts` 외의 파일이 없음 (범위 경계 유지)
- [ ] `channel/`, `web/`, `scripts/` 아래 어떤 파일도 생성되지 않음
- [ ] 커밋 2개 (`chore: scaffold workspace with server health endpoint`, `feat: sqlite schema for users/rooms/bots/tokens/messages`)
