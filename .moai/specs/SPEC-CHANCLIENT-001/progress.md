# SPEC-CHANCLIENT-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CHANCLIENT-001` |
| 칸반 카드 | `t4` (마일스톤 M4) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 12 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B (채널 계약) |
| 워크트리 | `.claude/worktrees/t4` |
| 코드 의존 | 없음 (원본 Task 12 `Consumes: 없음(독립)`) — 형제 SPEC 의 어떤 심볼도 import 하지 않는다 |
| 선행 SPEC | `SPEC-CHANNEL-001` — `channel/` 워크스페이스 스캐폴드 (코드 import 가 아닌 착수 가능 조건) |
| 현재 상태 | `in-progress` — run 단계 완료 (§E.2 증거·§E.3 audit-ready), AC 16/16 통과 |

---

## §E.1 Plan-phase Audit-Ready Signal

```yaml
plan_status: audit-ready
plan_complete_at: 2026-08-27
spec_id: SPEC-CHANCLIENT-001
tier: M
card: t4
depends_on: [SPEC-CHANNEL-001]   # 코드 import 가 아니라 channel/ 패키지 스캐폴드 선행
related_specs: [SPEC-GATEWAY-001, SPEC-CHANWIRE-001, SPEC-CHANPERM-001]
source_plan: .moai/plan/2026-08-26-minidiscord/plan-v2.md (Task 12)
source_spec: .moai/plan/2026-08-26-minidiscord/spec-v2.md (4-B)
spec_version: "0.2.1"
plan_audit: .moai/reports/t4/plan-audit.md
plan_audit_verdict: "CONDITIONAL PASS — 주요 1건(M5, depends_on) 반영 완료"
plan_reaudit_verdict: "PASS — 사소 1건(m3, missed_after_id 근거 문장) 반영 완료"
req_count: 14
ac_count: 16
tier_budget: "16 REQ / 16 AC"
spec_base_sha: "7b286923d69366a67b748e35d434a6222d2f88f4"
open_questions: 0   # M5 반영으로 depends_on 판단 종결
```

`spec_base_sha` 는 run 단계 첫 동작으로 채웠다:

```bash
git rev-parse HEAD > .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha
# → 7b286923d69366a67b748e35d434a6222d2f88f4
```

같은 값을 위 필드에도 옮겨 적었다. 이 SPEC 에서는 그 기준점 위에 검사 **세 개**가 올라간다 — 두 산출물 파일의 존재, `server/` 무변경, 형제 SPEC 소유 파일 무변경(AC-CHANCLIENT-015).

### 작성한 산출물

| 파일 | 내용 |
|------|------|
| `.moai/specs/SPEC-CHANCLIENT-001/spec.md` | GEARS 요구사항 14개 (REQ-CHANCLIENT-001..014), 범위 밖 6개 절, 제약, HISTORY 0.2.1 |
| `.moai/specs/SPEC-CHANCLIENT-001/plan.md` | 의존과 실행 전제, 되돌리기 어려운 결정(백오프 산술 / 프레임 계약), 원본 모순 6건(1·2·3번 차단급·5번 의도적 이탈), 위험 16건, 마일스톤 M1-M2, 안티패턴 25건 |
| `.moai/specs/SPEC-CHANCLIENT-001/acceptance.md` | 수용 기준 16개 (AC-CHANCLIENT-001..016), 공통 테스트 하네스, Given-When-Then 시나리오, 엣지 케이스 8건, 품질 게이트, Definition of Done |
| `.moai/specs/SPEC-CHANCLIENT-001/progress.md` | 이 파일 |

### SPEC-ID 검증

```
$ ID="SPEC-CHANCLIENT-001"; [[ "$ID" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]] && echo PASS || echo FAIL
PASS
```

### REQ → AC 커버리지

14개 REQ 전부가 하나 이상의 AC 에 매핑됐다.

| REQ | 주제 | 대응 AC |
|-----|------|---------|
| REQ-CHANCLIENT-001 | `start()` → 연결 → 첫 프레임 `hello` | AC-CHANCLIENT-001, AC-CHANCLIENT-011 (재접속 후 재전송) |
| REQ-CHANCLIENT-002 | `UrlRef` 매 시도 재평가 + `opts` 노출 | AC-CHANCLIENT-011 (문자열 교체), AC-CHANCLIENT-013 (함수 재평가) |
| REQ-CHANCLIENT-003 | `welcome` 을 프레임 그대로 전달 | AC-CHANCLIENT-002 |
| REQ-CHANCLIENT-004 | `message`/`permission_verdict` 를 프레임 그대로 전달 | AC-CHANCLIENT-003, AC-CHANCLIENT-004 |
| REQ-CHANCLIENT-005 | `history_response` → rid 조회 → 프레임 전체로 resolve | AC-CHANCLIENT-008 |
| REQ-CHANCLIENT-006 | 모르는 `type` 은 어떤 콜백에도 가지 않음, 콜백 부재 시 무해 | AC-CHANCLIENT-005 |
| REQ-CHANCLIENT-007 | `send` 는 OPEN 일 때만 전송하고 `true` | AC-CHANCLIENT-006 |
| REQ-CHANCLIENT-008 | `history_request` 프레임 모양, 다섯 키 최상위 | AC-CHANCLIENT-007 |
| REQ-CHANCLIENT-009 | `rid` 유일성과 rid 기반 매칭 | AC-CHANCLIENT-008 |
| REQ-CHANCLIENT-010 | 미연결 시 즉시 reject, 흔적 없음 | AC-CHANCLIENT-010 |
| REQ-CHANCLIENT-011 | 10초 타임아웃 | AC-CHANCLIENT-009 |
| REQ-CHANCLIENT-012 | `close` → `sleep(backoff)` → 재연결, `error` 는 던지지 않음 | AC-CHANCLIENT-011, AC-CHANCLIENT-012 (죽은 주소에서 시작) |
| REQ-CHANCLIENT-013 | 1000 시작·두 배 증가·30000 상한·open 시 리셋 | AC-CHANCLIENT-012, AC-CHANCLIENT-013 |
| REQ-CHANCLIENT-014 | `stop()` 뒤 재접속 없음 | AC-CHANCLIENT-014 |
| (범위 경계·무상태) | `spec.md` §5·§6 | AC-CHANCLIENT-015 |
| (전 구간) | RED→GREEN 전이 | AC-CHANCLIENT-016 |

### 검증 강도 자기 점검 (스텁 통과 여부)

작성 지시서가 지목한 결함 부류 — "구현 본문이 비어 있어도 통과하는 기준" — 를 개별이 아니라 **부류로** 훑었다. 16개 기준 각각에 대해 "이 기준을 통과시키는 가장 게으른 구현은 무엇인가"를 적고, 그 구현이 어느 기준에 걸리는지 확인했다.

| 게으른 구현 | 걸리는 기준 |
|------------|------------|
| `start()` 가 연결만 하고 hello 를 안 보냄 | AC-CHANCLIENT-001 (`messages[0]` 부재 → `waitFor` 타임아웃) |
| hello 에 필드를 더 얹음 (`{ type, token, version }`) | AC-CHANCLIENT-001 (`toEqual` 은 초과 필드에 실패) |
| hello 를 다른 프레임 뒤에 보냄 | AC-CHANCLIENT-001 (`messages[0]` 이 다른 프레임) |
| `welcome` 을 세 필드만 추려 새 객체로 넘김 | AC-CHANCLIENT-002 (`missed_after_id` 소실) |
| `message` 에서 `files` 를 빠뜨림 | AC-CHANCLIENT-003 (`toEqual` 실패) |
| `behavior` 를 읽지 않고 늘 `'allow'` 로 넘김 | AC-CHANCLIENT-004 (`'deny'` 단언) |
| 분배 마지막 갈래를 `else → onMessage` 로 둠 | AC-CHANCLIENT-005 (`seen` 이 `['message','message']`) |
| 콜백 미지정 시 예외로 죽음 | AC-CHANCLIENT-005 둘째 테스트 (이후 `send` 가 성립하지 않음) |
| `send` 가 상태를 보지 않고 늘 `true` | AC-CHANCLIENT-006 (`too_late` 단언) |
| 보내지 못한 payload 를 큐에 쌓아 open 때 전송 | AC-CHANCLIENT-006 (`too_early` 가 `marker` 보다 먼저 도착) |
| 파라미터를 `{ params: {...} }` 로 감쌈 / `since_id` 누락 / `sinceId` 로 개명 | AC-CHANCLIENT-007 (`rest` 의 `toEqual`) |
| `rid` 를 고정값으로 둠 | AC-CHANCLIENT-008 (두 rid 가 같음) |
| 대기 자리를 하나만 둬 두 번째 요청이 첫 번째를 덮어씀 | AC-CHANCLIENT-008 (한쪽이 영영 미결 → 테스트 타임아웃) |
| `rid` 를 보지 않고 도착 순서로 매칭 | AC-CHANCLIENT-008 (응답을 역순으로 보냄) |
| `messages` 만 꺼내 resolve | AC-CHANCLIENT-008 (프레임 전체 `toEqual`) |
| 타임아웃을 걸지 않음 | AC-CHANCLIENT-009 (10,000ms 에 미결) |
| 타임아웃이 10초보다 짧음(1초·5초) | AC-CHANCLIENT-009 (9,999ms 에 이미 reject) |
| 미연결인데 대기 맵에 등록만 하고 매달림 | AC-CHANCLIENT-010 (즉시 `rejects` 단언) |
| `requestHistory` 가 늘 reject | AC-CHANCLIENT-010 (연결 후 요청이 resolve 되어야 함) |
| 재접속을 시도하지 않고 대기만 함 | AC-CHANCLIENT-011 (두 번째 서버가 연결을 못 받음 → 타임아웃) |
| `url` 을 한 번 평가해 캐시 | AC-CHANCLIENT-011 (죽은 첫 주소로만 시도), AC-CHANCLIENT-013 |
| 백오프 없이 즉시 재시도 | AC-CHANCLIENT-011 (`sleeps[0] !== 1000`), AC-CHANCLIENT-012 |
| 두 배 규칙만 있고 상한 없음 | AC-CHANCLIENT-012 (여섯 번째가 `32000`) |
| 상한만 있고 증가 없음 (늘 1000) | AC-CHANCLIENT-012 (두 번째가 `1000`) |
| `maxBackoffMs` 옵션을 무시하고 30000 하드코딩 | AC-CHANCLIENT-012 둘째 클라이언트 (`[1000,2000,4000,…]`) |
| `open` 에서 백오프를 리셋하지 않음 | AC-CHANCLIENT-013 (`sleeps[before] >= 2000`) |
| `stop()` 이 플래그만 세우고 재접속 가드가 없음 | AC-CHANCLIENT-014 (`sleeps` 에 `1000` 기록) |
| `stop()` 이 소켓을 닫지 않음 | AC-CHANCLIENT-014 (`send` 가 `true`) |
| 형제 SPEC 소유 파일을 함께 만듦 / `process.env` 를 직접 읽음 | AC-CHANCLIENT-015 (변경 목록·`grep` 종료 코드) |

"파일이 존재한다", "함수가 export 돼 있다", "테스트 스위트가 통과한다(이름 없이)" 형태의 기준은 **하나도 쓰지 않았다.** 변경 파일의 **개수**를 세는 기준도 두지 않았다 — AC-CHANCLIENT-015 는 있어야 할 두 파일과 있어서는 안 되는 파일 집합을 보므로, 형제 SPEC 의 착지에 흔들리지 않는다.

**반대 방향(정상 구현을 거짓 실패시키는 기준)도 함께 훑었다.** 이 SPEC 에서 그 위험은 전부 시간에 몰려 있다.

| 거짓 실패를 부르는 형태 | 이 문서의 처리 |
|---|---|
| 고정 시간 대기 뒤 단언 (원본의 `setTimeout(r, 100)` × 9곳) | 전부 조건 폴링 `waitFor` 로 대체 (`plan.md` §D 1번) |
| `wss.close()` 하나로 절단을 기대 | 소켓을 먼저 `terminate()` 하는 `stopServer` (§D 2번) |
| 실제로 30초를 기다려 상한 확인 | 주입된 `sleep` 의 **인자값** 수열로 관측 (AC-CHANCLIENT-012) |
| 실제로 10초를 기다려 타임아웃 확인 | 가짜 타이머 9,999 / 10,000 경계 (AC-CHANCLIENT-009) |
| 가짜 타이머 위에서 서버 종료를 기다림 | `afterEach` 가 `vi.useRealTimers()` 를 정리보다 먼저 실행 |
| 부정 관측을 "잠깐 기다렸다"로 재기 | 대조군의 양성 사건을 기준선으로 (AC-CHANCLIENT-014), 뒤에 보낸 프레임의 도착을 기준선으로 (AC-CHANCLIENT-005·006) |

### 이 단계에서 하지 않은 것 (Gaps)

- 이 SPEC 의 산출물 코드는 한 줄도 작성하지 않았다. `channel/src/gateway-client.ts` 와 `channel/test/gateway-client.test.ts` 모두 미생성 — run 단계 소관이다.
- `acceptance.md` 의 어떤 명령도 실행하지 않았다. **`channel/` 워크스페이스가 아직 존재하지 않으므로** `npm test -w channel` 은 현재 실행 자체가 불가능하다(작성 시점 워크트리에 `channel/` 디렉터리 없음, 루트 `package.json` 의 `workspaces` 에는 이름만 등록돼 있음). 이 전제의 충족 여부는 run 단계 진입 전 `plan.md` §A 의 세 명령으로 확인한다.
- 형제 SPEC(`SPEC-CHANNEL-001`, `SPEC-CHANWIRE-001`, `SPEC-CHANPERM-001`)의 산출물을 읽지 않았다. 셋이 이 세션과 **동시에** 작성되고 있어, 경계는 원본 `plan-v2.md` Task 11·13·14 의 파일 목록에서 직접 인용했다. 형제 SPEC 이 원본에서 벗어난 파일 분할을 했다면 AC-CHANCLIENT-015 의 금지 파일 목록을 다시 맞춰야 한다.
- **[v0.2.0 에서 닫힘 — M5]** `spec.md` 의 `depends_on` 은 v0.1.0 에서 원본 Task 12 의 `Consumes: 없음(독립)` 을 그대로 따라 비어 있었다. plan-auditor 가 이를 주요 결함으로 지적했고(`.moai/reports/t4/plan-audit.md` M5), `depends_on: [SPEC-CHANNEL-001]` 로 고쳤다. "코드 의존이 아니라 실행 전제"라는 구분 자체는 유효하므로 `spec.md` §3 과 `plan.md` §A 에 그대로 남겼다 — 다만 `depends_on` 이 표현하는 것은 import 그래프가 아니라 **착수 가능 조건**이다. 요구사항·수용 기준은 영향받지 않았다.
- `plan.md` §D 5번(`this.send` → 지역 함수)은 원본으로부터의 **의도적 이탈**이다. 이탈 범위는 함수의 위치 하나이며 공개 계약은 그대로다. 되돌리기로 하면 "소비자는 구조 분해를 쓰지 않는다"는 제약이 `SPEC-CHANWIRE-001` 로 전파돼야 한다.
- 원본 Task 12 의 테스트 네 개 중 **두 개(첫 테스트, 마지막 재접속 테스트)는 검증력이 없다**고 판정했다(`plan.md` §D 3번). 회귀 방지선으로 파일에 남길 수는 있으나 판정은 새 기준이 진다 — 원본을 그대로 옮기면 재접속 결함이 통과한다.
- 엣지 케이스 표의 두 줄("JSON 이 아닌 프레임", "`start()` 중복 호출")은 의도적으로 **미검증**으로 남겼다. 근거는 `plan.md` §E 에 있다.

---

## §E.2 Run-phase Evidence

모든 명령은 워크트리 `.claude/worktrees/t4` (branch `WT-channel-plugin`) 에서 실행했다.
run 시작 시 HEAD `7b28692` → M1 커밋 `ec0faf2` → M2 커밋 `7483a3f`.

### M1 단계 0 — spec_base_sha 기록과 착수 전 확인

```
$ git rev-parse HEAD > .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha
$ cat .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha
7b286923d69366a67b748e35d434a6222d2f88f4
```

plan.md §A 세 확인 (이 run, 이 트리):

```
$ test -f channel/package.json ; echo "check1=OK"
check1=OK
$ node -e "require('./package.json').workspaces.includes('channel')||process.exit(1)" && echo "check2=OK"
check2=OK
$ npm ls -w channel ws vitest
  ├─┬ @vitest/coverage-v8@4.1.11
  │  └── vitest@4.1.11 deduped
  ├── vitest@4.1.11
  └── ws@8.21.3
```

### AC-CHANCLIENT-016 전이 1 (RED) — M1 테스트 작성 직후

```
$ npm test -w channel
FAIL  test/gateway-client.test.ts [ test/gateway-client.test.ts ]
Error: Cannot find module '../src/gateway-client.js' imported from /Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/t4/channel/test/gateway-client.test.ts
 Test Files  1 failed | 1 passed (2)
      Tests  10 passed (10)
exit=1
```

사유는 **모듈 부재** — 전이 1 의 요구와 일치한다.

### AC-CHANCLIENT-016 전이 2 (GREEN) — M1 구현 후

```
$ npm test -w channel -- --reporter=verbose
 ✓ test/gateway-client.test.ts > gateway client > sends hello with the token as the very first frame 10ms
 ✓ test/gateway-client.test.ts > gateway client > passes the welcome frame through untouched, extra fields included 11ms
 ✓ test/gateway-client.test.ts > gateway client > passes the message frame through untouched, files and delivery included 12ms
 ✓ test/gateway-client.test.ts > gateway client > passes a deny verdict through as deny 11ms
 ✓ test/gateway-client.test.ts > gateway client > routes by type only — an unknown frame reaches no callback 12ms
 ✓ test/gateway-client.test.ts > gateway client > survives frames whose callback was not provided 12ms
 ✓ test/gateway-client.test.ts > gateway client > sends only while open, and reports it truthfully 18ms
 Test Files  2 passed (2)
      Tests  17 passed (17)
$ npm run typecheck -w channel
typecheck-exit=0
```

M1 커밋: `ec0faf2` (spec.md frontmatter `draft → in-progress` 동반).

### AC-CHANCLIENT-016 전이 3 (RED) — M2 테스트 작성 직후

```
$ npm test -w channel -- --reporter=verbose
 × test/gateway-client.test.ts > gateway client > puts every history parameter on the frame top level, since_id included 5003ms
 × test/gateway-client.test.ts > gateway client > matches responses by rid, not by arrival order 5001ms
 × test/gateway-client.test.ts > gateway client > rejects a history request at 10 seconds, not before 84ms
 × test/gateway-client.test.ts > gateway client > fails a history request immediately when not connected, and recovers after connecting 6ms
 × test/gateway-client.test.ts > gateway client > waits then reconnects to the replaced opts.url and says hello again 5001ms
 × test/gateway-client.test.ts > gateway client > doubles the backoff and never exceeds the ceiling 5002ms
 × test/gateway-client.test.ts > gateway client > resets the backoff to 1000 after a successful connection 5001ms
 × test/gateway-client.test.ts > gateway client > never reconnects after stop() — measured against a live control client 5001ms
 FAIL  test/gateway-client.test.ts > gateway client > puts every history parameter on the frame top level, since_id included
Error: Test timed out in 5000ms.
exit=1
```

사유는 **단언 실패**(`waitFor` 타임아웃 — `requestHistory` 껍데기가 `history_request` 프레임을 내지 않음)이지 모듈 부재가 아니다 — 전이 3 의 요구와 일치한다.

### AC-CHANCLIENT-016 전이 4 (GREEN) — M2 구현 후

M2 첫 GREEN 실행에서 AC-CHANCLIENT-013 만 실패했다 (`Test timed out in 5000ms`, 24/25). 원인은 구현이 아니라 **하네스 레이스**였다:

- 관측된 오류: `Unhandled Rejection TypeError: Cannot read properties of null (reading 'port')` at `FakeServer.url()` (`wss.address()`).
- `wss.address()` 는 리스닝 전·`close()` 후에 `null` 을 내고, AC-013 의 1차 절단 뒤 재접속 루프가 `opts.url()` 을 평가하는 시점에 하필 그 사이라면 `null.port` 로 `TypeError` 가 나며, 이 예외가 `retry()` 를 죽여 재접속 루프 전체가 멈춘다. 대조적으로 두 번째 서버에 도달해야 하는 `waitFor` 만 타임아웃으로 실패했다.
- 교정: `FakeServer.url()` 이 마지막 유효 주소를 반환하게 했다 (시나리오 본문·단언은 한 글자도 바꾸지 않았다). 대기 시간을 늘리지 않았다 — plan.md §H "간헐 실패를 대기 연장으로 덮기" 금지 준수. 근본 원인·교정을 본 절과 M2 커밋 메시지에 기록했다.

교정 후 최종 관측:

```
$ npm test -w channel -- --reporter=verbose
 ✓ test/gateway-client.test.ts > gateway client > sends hello with the token as the very first frame 8ms
 ✓ test/gateway-client.test.ts > gateway client > passes the welcome frame through untouched, extra fields included 12ms
 ✓ test/gateway-client.test.ts > gateway client > passes the message frame through untouched, files and delivery included 13ms
 ✓ test/gateway-client.test.ts > gateway client > passes a deny verdict through as deny 12ms
 ✓ test/gateway-client.test.ts > gateway client > routes by type only — an unknown frame reaches no callback 11ms
 ✓ test/gateway-client.test.ts > gateway client > survives frames whose callback was not provided 12ms
 ✓ test/gateway-client.test.ts > gateway client > sends only while open, and reports it truthfully 19ms
 ✓ test/gateway-client.test.ts > gateway client > puts every history parameter on the frame top level, since_id included 13ms
 ✓ test/gateway-client.test.ts > gateway client > matches responses by rid, not by arrival order 13ms
 ✓ test/gateway-client.test.ts > gateway client > rejects a history request at 10 seconds, not before 8ms
 ✓ test/gateway-client.test.ts > gateway client > fails a history request immediately when not connected, and recovers after connecting 7ms
 ✓ test/gateway-client.test.ts > gateway client > waits then reconnects to the replaced opts.url and says hello again 10ms
 ✓ test/gateway-client.test.ts > gateway client > doubles the backoff and never exceeds the ceiling 21ms
 ✓ test/gateway-client.test.ts > gateway client > resets the backoff to 1000 after a successful connection 23ms
 ✓ test/gateway-client.test.ts > gateway client > never reconnects after stop() — measured against a live control client 17ms
 Test Files  2 passed (2)
      Tests  25 passed (25)
exit=0
```

exit=0 — 프로세스가 스스로 종료한다 (품질 게이트 "프로세스 종료" 항목). Unhandled 오류 없음.

M2 커밋: `7483a3f`.

### AC 이진 판정 행렬 (전 AC 공통 명령: `npm test -w channel -- --reporter=verbose`, 이 run·이 트리, HEAD `7483a3f`)

| AC | 판정 | 검증 수단 | 대표 관측 |
|----|------|-----------|-----------|
| AC-CHANCLIENT-001 | PASS | verbose ✓ 줄 `sends hello with the token as the very first frame` | `srv.messages[0]` `toEqual({type:'hello', token:'tok123'})` 통과 |
| AC-CHANCLIENT-002 | PASS | verbose ✓ 줄 `passes the welcome frame through untouched...` | `missed_after_id: 42` 포함 프레임 그대로 전달 |
| AC-CHANCLIENT-003 | PASS | verbose ✓ 줄 `passes the message frame through untouched...` | `files`·`delivery:'cc'` 포함 통과 |
| AC-CHANCLIENT-004 | PASS | verbose ✓ 줄 `passes a deny verdict through as deny` | `behavior:'deny'` 그대로 |
| AC-CHANCLIENT-005 | PASS | verbose ✓ 줄 2건 (`routes by type only...`, `survives frames...`) | `seen` `toEqual(['message'])`, 콜백 없이도 `send` true |
| AC-CHANCLIENT-006 | PASS | verbose ✓ 줄 `sends only while open...` | 연결 전 false·미도달, open true·도달, stop 후 false |
| AC-CHANCLIENT-007 | PASS | verbose ✓ 줄 `puts every history parameter...` | rid 제외 `rest` `toEqual` 5키 최상위 |
| AC-CHANCLIENT-008 | PASS | verbose ✓ 줄 `matches responses by rid...` | 역순 응답에도 p1·p2 자기 프레임 전체로 resolve |
| AC-CHANCLIENT-009 | PASS | verbose ✓ 줄 `rejects a history request at 10 seconds, not before` | 가짜 타이머 9,999ms pending → 10,000ms rejected |
| AC-CHANCLIENT-010 | PASS | verbose ✓ 줄 `fails a history request immediately...` | 미연결 즉시 reject·프레임 0건, 연결 후 resolve |
| AC-CHANCLIENT-011 | PASS | verbose ✓ 줄 `waits then reconnects to the replaced opts.url...` | `sleeps[0]===1000`, srv2 `messages[0]` hello |
| AC-CHANCLIENT-012 | PASS | verbose ✓ 줄 `doubles the backoff and never exceeds the ceiling` | `[1000,2000,4000,8000,16000,30000,30000,30000]`, `maxBackoffMs:2500` `[1000,2000,2500,2500]` |
| AC-CHANCLIENT-013 | PASS | verbose ✓ 줄 `resets the backoff to 1000 after a successful connection` | 2차 절단 직후 `sleeps[before]===1000` |
| AC-CHANCLIENT-014 | PASS | verbose ✓ 줄 `never reconnects after stop()...` | 대조군 기준선 시점 `stopped.sleeps` `toEqual([])`, `send` false |
| AC-CHANCLIENT-015 | PASS | 아래 다섯 관측 참조 | 기준 SHA·두 파일 존재·금지 파일 부재·무상태 grep exit 1 |
| AC-CHANCLIENT-016 | PASS | 위 4개 전이 절 참조 | 모듈 부재 RED → GREEN → 단언 실패 RED → 25/25 GREEN |

### AC-CHANCLIENT-015 — 범위 경계·무상태 다섯 관측 (기준 SHA `7b28692`, 이 run·이 트리)

```
$ git rev-parse --verify "$(cat .moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha)^{commit}"
7b286923d69366a67b748e35d434a6222d2f88f4        ← 확인 1: 종료 코드 0 으로 SHA 출력

$ git diff --name-only 7b286923d69366a67b748e35d434a6222d2f88f4
.moai/specs/SPEC-CHANCLIENT-001/.spec-base-sha   ← 확인 2: 산출물 두 파일이 둘 다 있다 (아래 2줄)
channel/src/gateway-client.ts
channel/test/gateway-client.test.ts
                                                  ← 확인 3: server/ 로 시작하는 줄 없음
                                                  ← 확인 4: channel/src/index.ts·channel-server.ts 없음
$ grep -nE "node:fs|from 'fs'|require\('fs'\)|process\.env" channel/src/gateway-client.ts
(출력 없음 — 종료 코드 1)                          ← 확인 5: 무상태
```

diff 의 나머지 두 줄은 이 SPEC 자기 소유 파일이다: `.spec-base-sha`(M1 단계 0 기록, M1 커밋에 포함)와 `spec.md`(frontmatter `status: draft → in-progress` 전환 — 첫 run 커밋 의무, body 미변경).

### 품질 게이트 (이 run·이 트리)

```
$ npm test -w channel -- --coverage
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files          |   97.33 |    93.75 |   89.47 |     100 |
 gateway-client.ts |   96.42 |    92.3  |   85.71 |     100 | 41,67
=============================== Coverage summary ===============================
Statements   : 97.33% ( 73/75 )
Branches     : 93.75% ( 30/32 )
Functions    : 89.47% ( 17/19 )
Lines        : 100% ( 65/65 )
exit=0

$ npm run typecheck -w channel
typecheck-exit=0
```

gateway-client.ts 미커버 지점 2개(41·67행)는 `sleep` 기본 구현(`opts.sleep` 부재 갈래)과 `onWelcome` 미지정 갈래 — 하네스가 항상 `sleep` 을 주입하는데서 오는 간극이며 테스트 시간을 실제로 기다리게 만들어 덮는 것은 §H 금지 사항이다. Lines 100% 로 게이트(≥85%)는 통과.

### 커밋 (push 없음 — 카드 브랜치 로컬 유지)

| SHA | subject |
|-----|---------|
| `ec0faf2` | feat(SPEC-CHANCLIENT-001): M1 게이트웨이 클라이언트 연결·분배·송신 — AC 001~006 통과 (card t4) |
| `7483a3f` | feat(SPEC-CHANCLIENT-001): M2 이력 요청 매칭과 재접속 백오프 — AC 007~015 통과 (card t4) |

### Gaps (미검증 — 명시적 기록)

- **서버가 JSON 이 아닌 프레임을 보내는 경우** — 미검증·수용. 원본과 같은 동작(`JSON.parse` 가 던짐). acceptance.md 엣지 케이스 표의 지정 그대로.
- **`start()` 중복 호출** — 미검증·수용. 가드 없음(소켓 2개 열림). 호출자는 `SPEC-CHANWIRE-001` 조립 지점 하나. acceptance.md 엣지 케이스 표의 지정 그대로.
- **실제 게이트웨이(`server/`)와의 실착지 결합** — 이 SPEC 의 테스트는 가짜 `WebSocketServer` 상대다(§3). 두 쪽의 실제 맞물림은 원본 Task 18 E2E 소관. 단, `hello` 프레임 모양은 `SPEC-GATEWAY-001` 계약(`spec-v2.md` 4-B)과 필드명까지 일치시켰다.
- **커버리지 Functions 85.71%(gateway-client.ts 개별)** — 전체 Lines 100%·게이트 기준 충족이나, 위 두 갈래는 함수 단위로는 덮지 않았다.
- **하네스 url() 교정이 다른 기계에서도 레이스 프리임을 반복 실행으로 확인하지 않았다** — 교정 후 1회 실행(25/25) 관측. 교정의 논리(address() null 시 마지막 유효 주소 반환)가 예외 경로를 원천 제거하므로 반복 의존적이지 않다고 판단한다.

---

## §E.3 Run-phase Audit-Ready Signal

```yaml
run_status: audit-ready
run_complete_at: 2026-08-27
spec_id: SPEC-CHANCLIENT-001
tier: M
card: t4
cycle_type: tdd
spec_base_sha: 7b286923d69366a67b748e35d434a6222d2f88f4
run_commits: [ec0faf2, 7483a3f]
ac_total: 16
ac_passed: 16
ac_failed: 0
tdd_transitions_observed: 4   # 전이 1 모듈부재 RED / 2 M1 GREEN / 3 단언실패 RED / 4 M2 GREEN
tests_total: 25               # gateway-client 15 + channel-server 10 (기존)
tests_passed: 25
typecheck_exit: 0
coverage_lines: "100%"
coverage_branches: "93.75%"
push_attempted: false
deliverables:
  - channel/src/gateway-client.ts
  - channel/test/gateway-client.test.ts
deviations:
  - "하네스 FakeServer.url() 교정 1건 — wss.address() null(리스닝 전·close 후)에서 TypeError 로 재시도 루프가 죽던 레이스. 시나리오·단언 미변경, §E.2 에 원인·근거 기록"
gaps: ["JSON 아닌 프레임 — 수용(지정)", "start() 중복 호출 — 수용(지정)", "실제 게이트웨이 결합 — Task 18 E2E 소관"]
```

---

## §E.4 Sync-phase Audit-Ready Signal

```yaml
sync_status: audit-fail-open
sync_evaluated_at: 2026-08-27
spec_id: SPEC-CHANCLIENT-001
card: t4
sync_head_sha: 651b033
audit_verdict: FAIL
audit_score: 62.1        # 가중 조화평균 (Functionality 82 / Security 38 FAIL / Craft 72 / Consistency 80)
audit_report: .moai/reports/t4/sync-audit.md
tests: "4 files / 50 tests passed"
coverage: "stmts 93.39% (99/106) · branch 84.31% (43/51) · funcs 93.75% (30/32) · lines 95.5% (85/89)"
build_exit: 0
typecheck_exit: 0
remediated_here:
  - "F-05 (High) — JSON 아닌 프레임 한 개로 봇 프로세스가 종료되던 경로를 try/catch 로 봉인 (2a6bf4b, gateway-client.ts:60-64). run 단계가 '계약상 수용'으로 적었던 갭이 실행 재현으로 결함 판정됨"
open_findings:
  - "F-01 (Critical) — welcome 수신 여부를 보지 않고 type 만으로 프레임을 분기: 인증하지 않은 엔드포인트의 permission_verdict{allow}·message 가 그대로 세션에 도달 (gateway-client.ts:60-64)"
  - "F-07 (Medium) — URL 스킴 검증 부재로 원격 지정 시 hello 첫 프레임의 봇 토큰이 평문으로 나감 (gateway-client.ts:53-58)"
  - "F-11 (Medium) — AC-CHANCLIENT-014 의 이름이 주장하는 범위보다 실제 관측 범위가 좁음 (내부 stopped 가드 미검증)"
status_transition: none   # in-progress 유지
```

- 검증 명령과 관측 원문 (본 sync 단계에서 manager-docs 가 이 트리·이 HEAD 에서 직접 실행):
  - `npm test -w channel -- --coverage` → `Test Files 4 passed (4)` / `Tests 50 passed (50)`, `Statements 93.39% (99/106)` · `Branches 84.31% (43/51)` · `Functions 93.75% (30/32)` · `Lines 95.5% (85/89)`
  - `npm run build -w channel` → 종료 코드 0
  - `npm run typecheck -w channel` → 종료 코드 0
  - `channel/dist/index.js` MCP `initialize` 프로브 → `serverInfo.name = minidiscord-channel`, capabilities `experimental["claude/channel"]`·`experimental["claude/channel/permission"]` — **오케스트레이터 관측값**(manager-docs 는 재실행하지 않음)
- 증거 경로: `.moai/state/verify/t4-sync/`, `.moai/state/verify/t4-sync-fix/`, `.moai/state/verify/t4-sync-audit/`, 감사 전문 `.moai/reports/t4/sync-audit.md`
- 상태 전이 없음: 감사 판정이 FAIL 이고 Critical 원인(F-01)이 열려 있어 `status: in-progress` 를 유지한다. `implemented`/`completed` 로 올리면 기록이 사실과 달라진다.
