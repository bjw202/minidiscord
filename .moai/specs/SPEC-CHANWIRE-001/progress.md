# SPEC-CHANWIRE-001 진행 기록

| 항목 | 값 |
|------|-----|
| SPEC-ID | `SPEC-CHANWIRE-001` |
| 칸반 카드 | `t4` (마일스톤 M4) |
| Tier | M (spec.md + plan.md + acceptance.md) |
| 원본 계획 | `.moai/plan/2026-08-26-minidiscord/plan-v2.md` Task 13 |
| 원본 스펙 | `.moai/plan/2026-08-26-minidiscord/spec-v2.md` 4-B |
| 워크트리 | `.claude/worktrees/t4` |
| 선행 SPEC | `SPEC-CHANNEL-001` → `SPEC-CHANCLIENT-001` → (이 SPEC) |
| 후행 SPEC | `SPEC-CHANPERM-001` (이 SPEC 의 `wire()` 를 확장) |
| 요구사항 / 수용 기준 | 13 / 14 |

---

## §E.1 Plan-phase Audit-Ready Signal

| 항목 | 값 |
|------|-----|
| 작성 단계 | plan (manager-spec) |
| 산출물 | `spec.md`, `plan.md`, `acceptance.md`, `progress.md` |
| SPEC ID 정규식 검사 | `PASS` (`[[ "SPEC-CHANWIRE-001" =~ ^SPEC(-[A-Z][A-Z0-9]*)+-[0-9]{3}$ ]]` 실행 결과) |
| 원본 모순 | 7건 기록 (`plan.md` §D 1..7), 그중 1건(토큰 없는 실행의 진단 문구)은 리드 판정 대기 |
| plan-audit 교정 | `.moai/reports/t4/plan-audit.md` 의 B1·M1·M6 (차단급 1 + 주요 2) + 사소 m2·m4·m5 를 v0.2.0 에서 닫음 |
| 계약 개정 | REQ-CHANWIRE-003·004 — stdio 연결은 토큰과 무관, 토큰은 게이트웨이 접속만 잠근다 (`plan.md` §D 3) |
| REQ↔AC 매핑표 | 아래 표 (run 단계 진입 시 작성 — manager-develop) |

### REQ↔AC 매핑표 (run 단계)

| REQ | 매핑 AC | 비고 |
|-----|---------|------|
| REQ-CHANWIRE-001 | AC-001, AC-014 | `connected()` 하네스 자체가 두 핸들 반환을 전제로 성립 |
| REQ-CHANWIRE-002 | AC-010 | 임포트 부작용 부정 사례 — 자식 프로세스 관측 |
| REQ-CHANWIRE-003 | AC-011, AC-014(a) | 기본 주소·진입점 가드·hello 실제 도착 |
| REQ-CHANWIRE-004 | AC-014(b) | 토큰 없음: initialize 응답 + 게이트웨이 연결 0건 |
| REQ-CHANWIRE-005 | AC-012 (관측 4) | porcelain 에 테스트 제작 파일 없음 |
| REQ-CHANWIRE-006 | AC-001, AC-009(변이 A) | 알림 1건 + meta 보존 |
| REQ-CHANWIRE-007 | AC-002 | cc 전달 + working 부재 부정 단언 |
| REQ-CHANWIRE-008 | AC-003, AC-009(변이 D) | TO → working 프레임 |
| REQ-CHANWIRE-009 | AC-005, AC-009(변이 B) | idle 인덱스 > bot_message 인덱스 |
| REQ-CHANWIRE-010 | AC-002 | cc 의 working 프레임 수 불변 |
| REQ-CHANWIRE-011 | AC-004, AC-009(변이 B) | files → `{ local_path }` 매핑 + 빈 배열 |
| REQ-CHANWIRE-012 | AC-006, AC-007, AC-008, AC-009(변이 C) | 파라미터 통과 + 렌더링 + 빈 결과 문구 |
| REQ-CHANWIRE-013 | AC-012 | 관측 1~3 (SHA·선행 파일·정확히 두 파일) |

## §E.2 Run-phase Evidence

> 증거 기준 트리플: (a) 명령 (b) 원문 출력 (c) 이 실행·이 트리. 증거 캡처 시점 HEAD = `79fc17f`(M1 커밋) 위의 M2 작업 트리. 최종 커밋 SHA 는 커밋 자기지시 불가로 `pending-backfill-m2` — run 완료 보고서에 실제 SHA 기재.

### M1 단계 0 — 전제 확인

- (a) `git rev-parse HEAD | tee .moai/specs/SPEC-CHANWIRE-001/.spec-base-sha`
- (b) `9376264bd6534c6990b452f1eca9732ccca8fc67` + `node --version` → `v24.12.0` (하한선 20 이상)
- (c) 이 트리, 카드 t4 워크트리, run 시작 시점 (2026-08-27)
- 선행 계약 실측: `createChannelServer(deps): ChannelHandle`·`createGatewayClient(opts): GatewayClient` 모두 spec.md §3 과 일치 (파일 직독 확인). `requestHistory` 는 `history_response` 프레임 전체(`messages` 포함)로 resolve 함을 확인하고 렌더링에 반영.
- §D 1 부류 점검: 기존 테스트의 `as any` 4곳은 전부 도구 스키마 읽기(결과 형 캐스트)이며 SDK 객체에 형태를 가정한 자리 없음. 새 하네스의 `setNotificationHandler` 는 zod 스키마 사용.

### M1 단계 1 (RED) — 원문

- (a) `npm test -w channel`
- (b) 원문:
```
 FAIL  test/index-wiring.test.ts > channel wiring > idle status follows the bot_message, not precedes it
TypeError: wire is not a function
 ❯ connected test/index-wiring.test.ts:62:27
 Test Files  1 failed | 2 passed (3)
      Tests  5 failed | 25 passed (30)
```
- (c) 이 실행·이 트리 (AC-013 전이 1 — 사유 `wire` 미수출 계열, 5건 전부 동일 사유)

### M1 단계 3 (GREEN) — 원문

- (a) `npm test -w channel` / `npm run typecheck -w channel`
- (b) 원문:
```
 Test Files  3 passed (3)
      Tests  30 passed (30)
   Duration  564ms
```
typecheck: 종료 코드 `0` (출력 없음).
- (c) 이 실행·이 트리 (AC-013 전이 2)

### M1 단계 4 — 커밋

`79fc17f` `feat(SPEC-CHANWIRE-001): M1 wire() 세 갈래(수신·상태·송신) — AC 5/14 통과 (card t4)` — frontmatter `draft → in-progress` 동반.

### M2 단계 1 (RED) — 원문

- (a) `npm test -w channel -- --reporter=verbose`
- (b) 원문 (실패 5건 — 전부 단언 실패/waitFor 타임아웃, 수출·모듈 부재 아님):
```
 × test/index-wiring.test.ts > channel wiring > history lines carry the #id cursor prefix 16ms
   → expected '{"type":"history_response","rid":"f7a…' to be '#1 [2026-08-01] alice: 과거' // Object.is equality
 × test/index-wiring.test.ts > channel wiring > empty history renders the Korean placeholder 13ms
   → expected '{"type":"history_response","rid":"417…' to be '(기록 없음)' // Object.is equality
 × test/index-wiring.test.ts > channel wiring > importing the module opens no connection 3014ms
   → waitFor timeout: 자식 프로세스 종료
 × test/index-wiring.test.ts > channel wiring > resolveUrl falls back to the documented default 1ms
   → expected undefined to be 'ws://127.0.0.1:3000/bot' // Object.is equality
 × test/index-wiring.test.ts > channel wiring > the built artifact speaks MCP; the token gates only the gateway 3111ms
   → waitFor timeout: (a) hello 도착
```
통과: `fetch_history forwards since_id and limit verbatim`(AC-006) — M1 단계 2 의 파라미터 통과 설계로 첫 실행부터 통과 (plan.md §F M1 단계 2 명시 분배; RED 를 꾸며내지 않고 상속 통과로 기록).
- (c) 이 실행·이 트리 (AC-013 전이 3 — AC-010·014 의 실패는 당시 dist 가 배선 전 산출물이어서이며, 빌드 후 재실행으로 전환됨. AC-011 은 동적 import 로 `undefined` 단언 실패를 냄 — 정적 import 라면 파일 로드 실패(수출 부재)가 되어 전이 3 위반)

### M2 단계 3 (GREEN) — 원문

- (a) `npm run typecheck -w channel` → 종료 `0` / `npm run build -w channel` → 종료 `0` (`channel/dist/index.js` 갱신) / `npm test -w channel`
- (b) 원문:
```
 Test Files  3 passed (3)
      Tests  36 passed (36)
   Duration  1.18s
```
- (c) 이 실행·이 트리, 빌드 직후 (AC-013 전이 4)

### M2 단계 3b — 프로세스 위생

- (a) `pgrep -f 'channel/dist/index.js'`
- (b) 빈 출력, `PGREP_EXIT=1` (매칭 없음)
- (c) 이 실행·이 트리 — 테스트 직후 2회(중간·최종) 모두 동일

### M2 단계 4 — AC-CHANWIRE-009 변이 검증 (원문)

각 변이 적용 후 `npm test -w channel -- --reporter=verbose` 실행, 실패한 테스트 이름 집합 원문:

| 변이 | 실패 테스트 (원문 이름) | 표 예측 | 판정 |
|------|------------------------|---------|------|
| A (`pushChatMessage` 한 줄 제거) | `gateway message becomes exactly one session notification` / `cc message is delivered but raises no working status` / `a TO message reports working to the gateway` | AC-001, AC-002 | **불일치(+AC-003)** — 아래 판정 기록 |
| B (`bot_message` 전송 한 줄 제거) | `reply tool sends a bot_message with mapped file paths` / `idle status follows the bot_message, not precedes it` | AC-004, AC-005 | 일치 |
| C (`requestHistory({})` 파라미터 버림) | `fetch_history forwards since_id and limit verbatim` (`expected undefined to be 41`) | AC-006 | 일치 |
| D (`status working` 한 줄 제거) | `a TO message reports working to the gateway` (`waitFor timeout: working 프레임`) | AC-003 | 일치 |

나머지 테스트는 네 실행 모두 `✓` 로 관측됨 (원문 verbose 출력 캡처: 변이 A 3 failed/33 passed, B·C·D 각 1·2 failed).

**변이 A 판정 (plan.md §F M2 단계 4 의 '어긋나면 판정 후 진행' 조항에 따름).** 실제 실패 집합은 표보다 AC-003 을 하나 더 포함한다. 원인은 구현이 아니라 AC-003 테스트 본문 자체에 있다 — 이 테스트는 working 프레임 관측 뒤 `waitFor(() => notified.length === 1, '알림 도착')` 라는 **수신 갈래 단언을 두 번째로 포함**하고 있어, 수신 갈래를 끊으면 상태 갈래 기준까지 함께 무너진다. 표의 A행은 갈래별로 작성되며 이 묶음을 계상하지 않았다(과소계상). 갈래 독립성이 보호하려는 성질 — "끊긴 갈래의 기준은 반드시 무너진다"(4개 변이 모두 성립)와 "무관 갈래의 기준이 근거 없이 무너지지 않는다"(유일한 이탈인 AC-003 은 테스트 본문에 적힌 단언으로 설명됨) — 은 모두 성립한다. 구현 결함 아님. 표의 A행 계정은 본 SPEC 수정 불가(바디 불변)로 여기에 기록하고 리드 보고에 명시한다.

되돌림 증명: 변이 전후 `shasum -a 256 channel/src/index.ts` = `ff5dafaaac9009eae8441ca58288410bc06188a86ff9e3d28d3c2e57d9a314a9` 일치 (네 변이 완전 되돌림). 최종 실행 36/36 통과.

### M2 단계 5 — AC-CHANWIRE-012 범위 경계 (원문)

- (a) 네 명령 순차 실행 (SHA = `.spec-base-sha` 값)
- (b) 원문:
```
$ git rev-parse --verify "$SHA^{commit}"
9376264bd6534c6990b452f1eca9732ccca8fc67          # 관측 1: 종료 0 ✓

$ git diff --stat "$SHA" -- channel/src/channel-server.ts channel/src/gateway-client.ts server
(빈 출력)                                            # 관측 2: 선행 소유 파일·server 무변경 ✓

$ git diff --name-only "$SHA" -- channel
channel/src/index.ts
channel/test/index-wiring.test.ts                    # 관측 3: 정확히 두 줄 ✓

$ git status --porcelain
 M channel/src/index.ts
 M channel/test/index-wiring.test.ts
 ?? .moai/logs/trace-*.jsonl (7건) / .moai/reports/session-*.md (2건)
 ?? .moai/state/{config-cache.json,context-usage.json,github/,routing-pending-*}
 ?? channel/coverage/
```
- (c) 이 실행·이 트리 (관측 시점 = M2 커밋 전 작업 트리)
- 관측 4 판정: 테스트/봇 실행이 **새로 만든** 파일은 없음. ` M` 두 줄은 이 SPEC 의 소스 편집(미커밋 M2 변경). `??` 항목은 전부 선재 런타임 산출 — `.moai/logs|state|reports` 는 MoAI 런타임, `channel/coverage/` 는 커버리지 도구 산출물(선재 untracked, 오케스트레이터 gitignore 예정 — 커밋 금지 목록 B8). 채널 패키지 자체는 무상태 유지.

### 품질 게이트 — 커버리지 (원문)

- (a) `npm test -w channel -- --coverage` (기본 설정 — `channel/vitest.config.ts`, v8 provider)
- (b) 원문:
```
 All files          |   97.33 |    93.75 |   89.47 |     100
  gateway-client.ts |   96.42 |    92.3  |   85.71 |     100 | 41,67
```
`coverage-final.json` 확인: `channel-server.ts` 포함(전 항목 100%, 텍스트 리포터가 완전 커버 파일 행을 표시하지 않았을 뿐). 전 차원 ≥85% ✓.
- CLI 오버라이드 측정 (`--coverage.exclude=src/__dummy__.ts` — index.ts 포함 시도, 측정만 위한 실행·설정 파일 무변경):
```
  gateway-client.ts |   96.42 |    92.3  |   85.71 |     100 | 41,67
  index.ts          |   78.26 |   68.42 |     100 |  77.77 | 53-58
```
미커버 53-58행 = 진입점 가드 블록(직접 실행 시에만 동작 — AC-010·014 가 자식 프로세스로 기능 검증하나 in-process v8 카운터에 잡히지 않음). `wire()` 본체·렌더링·`resolveUrl` 은 전부 커버(함수 100%).
- (c) 이 실행·이 트리

### plan.md §D 원본 모순 처리 결과

| §D | 처리 |
|----|------|
| 1 (하네스 setNotificationHandler) | zod 스키마로 작성 — 형제 관례(명시적 meta 객체 + passthrough) 채택. `z.record(z.any())` 는 zod 4(^4.4.3)에서 단일 인자 형태를 쓸 수 없어 acceptance 하네스 스니펫에서 등가 형태로 조정 (동일 등록 키 도출, `as any` 없음) |
| 2 (cc 부재 미측정) | AC-002 부정 단언 그대로 구현 — 변이 D 로 cc 갈래와 상태 갈래가 독립임을 추가 확인 |
| 3 (토큰 게이트 무력화) | 계약 개정대로 구현: stdio 무조건 연결, gw.start() 만 토큰 게이트. AC-014(b) 매 실행 확인. **진단 문구 신설은 리드 판정 대기로 이번 run 에서 하지 않음** — 토큰 없이 띄운 프로세스는 침묵하고 stdio 를 잡은 채 남는다 (수용된 귀결) |
| 4 (고정 setTimeout) | 하네스 `waitFor(조건, 라벨)` 사용. 고정 대기는 AC-002(200ms), AC-014(b)(300ms) 의 부정 단언/여유만 — 계획이 명시한 예외 |
| 5 (onMessage 거부 미처리) | 원본 형태 유지 (주석으로 위험 명시). 엣지 키이스 '미검증' 그대로 |
| 6 (send 반환값 무시) | 원본 형태 유지 — §E 위험으로 기록 |
| 7 (TDZ) | 실측 안전 확인 (선행 시그니처 직독) — 콜백은 호출 시점에만 상호 참조 |

### Gaps (미검증 명시)

1. **typecheck 이 `channel/test/**` 를 덮지 않음** — `channel/tsconfig.json` 이 `include: ["src"]` (SPEC-CHANNEL-001 소유, plan §E 예견 m5). 하네스의 타입 오류는 vitest 변환(esbuild, 타입 검사 없음)을 지나 조용히 남을 수 있다. 본 run 은 실행으로 전 기준을 관측했으나 타입 수준 보증은 없다.
2. **`src/index.ts` 가 기본 커버리지 설정에서 제외됨** — `channel/vitest.config.ts` 소유권한(SPEC-CHANNEL-001) 이유로 exclude 유지 (REQ-CHANWIRE-013 두 파일 제한). CLI 오버라이드로 별도 측정해 기록했으나 게이트 통과 판정의 공식 수치는 아니다. 해당 exclude 의 원래 사유(임포트 시 stdio 잡음)는 본 SPEC 의 진입점 가드로 소멸 — sync 단계에서 설정 되돌림 제안.
3. **`working` 이 세션 알림보다 먼저 나가는 순서 (REQ-CHANWIRE-008 순서 조항)** — 두 사건이 다른 전송로(실제 소켓/인프로세스)를 타 도착 시각 비교가 경쟁 조건이 되어 측정하지 않음 (감사 m4). 코드 리뷰로만 확인: `gw.send(working)` 이 `await pushChatMessage` 앞에 있다.
4. **기본 주소 경로가 실제 접속에 쓰이는 것** — `resolveUrl` 호출 지점이 진입점 한 곳뿐임에 기댐 (AC-011 Gap 원문 그대로).
5. **엣지 케이스 표 '미검증' 여섯 줄** (게이트웨이 끊김 중 reply / pushChatMessage 거부 / requestHistory 타임아웃 / 중복 TO 재전송 / 존재하지 않는 files 경로 — 서버 기존 동작 / 이력 여러 건 줄바꿈) — 계획이 명시적으로 미검증으로 남김.
6. **AC-009 변이 A의 표 불일치** — 위 변이 검증 절에 원문·판정 기록. 표의 A행이 AC-003 을 계상하지 않은 것(과소계상)이며 구현 결함 아님.
7. **AC-011 테스트의 동적 import 조정** — 정적 최상위 import 로는 M2 RED 가 파일 로드 실패(수출 부재)가 되어 AC-013 전이 3("사유가 단언 실패")를 위반하므로, 테스트 내 `await import()` 로 `undefined` 단언 실패를 내도록 조정. 단언 내용·값은 acceptance 본문 그대로.

## §E.3 Run-phase Audit-Ready Signal

| 항목 | 값 |
|------|-----|
| run 수행 | manager-develop, cycle_type=tdd, M1+M2 완료 (2026-08-27) |
| AC 판정 | AC-CHANWIRE-001~008, 010~014 PASS · AC-009 PASS(변이 A 표 불일치 판정 동반 — §E.2 상기) — 14/14 |
| RED→GREEN 전이 | 4회 모두 원문 캡처 (§E.2 M1 RED/GREEN, M2 RED/GREEN) |
| 품질 게이트 | typecheck 종료 0 · build 종료 0 · 테스트 36/36 · pgrep 빈 출력 · 커버리지 전 차원 ≥85% (기본 설정; index.ts 별도 측정 78.26% — Gaps 2) |
| 범위 경계 | 변경 파일 정확히 2 (`channel/src/index.ts`, `channel/test/index-wiring.test.ts`) · 선행 소유 파일·`server/` diff 빈 출력 · 무상태(테스트 제작 파일 없음) |
| 커밋 | M1 `79fc17f` (frontmatter draft→in-progress 동반) · M2 `pending-backfill-m2` (보고서에 실제 SHA 기재) · 푸시 없음 |
| 형제 계약 | AC-014(b) 통과 — SPEC-CHANNEL-001 의 토큰 없는 dist 프로브(AC-CHANNEL-002·004·005) 전제 유지 |
| 리드 판정 대기 | 토큰 없는 실행의 진단 문구 신설 (plan §D 3 잔여 — 별도 카드) |
| run_commit_sha | pending-backfill-m2 |

## §E.4 Sync-phase Audit-Ready Signal

_<pending sync-phase>_
