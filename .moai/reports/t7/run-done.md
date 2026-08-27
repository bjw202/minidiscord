# t7 런 단계 완료 보고 — 권한 릴레이 request_id 결함 2건 수정

> **2026-08-27 정정 라운드 추가**: 이 보고서는 라운드 1 기록이며, sync 감사(T7-F-01~05) 이후의 정정은 **§7** 에 있다. §5 Gaps 는 라운드 1 시점 기록이다.
> **2026-08-28 정정 라운드 2 추가**: 재감사(sync-audit §R3·§R4) 이후의 정정은 **§8** 에 있으며, **카드 전체 상태는 §8.4 범위 대장이 최신이다.** §7.4 대장과 §7.6 첫 머리글(줄 없는 description 잔여 — §8.6 이 닫음)은 역사 기록으로 남고 이번 대장이 대신한다.

| 항목 | 값 |
|------|-----|
| 카드 | `t7` (F-04·F-05 → **디스패치 교정 기술로 수정**) |
| 워크트리 | `.claude/worktrees/t7` (브랜치 `WT-perm-request-id`, 로컬 — 미푸시, 워크트리가 유일 사본) |
| 기준 트리 | `WT-msg-gateway-relay`(`b9eed4b`, t1·t2 포함 확인) 병합 |
| 수정 커밋 | `c2e9d9d` (본 보고 커밋은 별도) |
| 근거 | 디스패치 교정 기술: `.moai/reports/t4/run-done.md` §3 + `SPEC-CHANPERM-001` §3.1 가정-2·가정-3 (t4 워크트리) — 카드 원문의 F-04 기술(형식 검증·문구 일치)이 아니라 이쪽을 따름 |
| 완료일 | 2026-08-27 |
| 특이사항 | 첫 에이전트 스폰이 Agent Teams 계층 오류로 실패(`team file not found`) → 이름 없는 일반 위임으로 전환. 구현은 general-purpose 서브에이전트에 manager-develop 역할로 위임, 리드(본 세션)가 RED·GREEN 전 과정을 직접 재관측 |

## 1. 결함 요약 (교정된 기술 — SPEC-CHANPERM-001 §3.1)

- **결함-1 (가정-2, 대기 항목 유실 — 전역 키 충돌)**: 대기 맵 `open`이 `request_id` 단독 키(`permissions.ts:21,33`). 서로 다른 두 방이 같은 `request_id`를 동시에 대기시키면 뒤엣것이 앞엣것의 `ConnInfo`를 덮어써 앞 방의 승인 요청이 영구히 고아가 된다. 앞 방 사용자가 안내대로 `yes <id>`를 쳐도 아무 일이 일어나지 않는다. 방 대조 자체는 `:49`에 이미 존재했으므로 결함은 누출이 아니라 **유실**이다.
- **결함-2 (가정-3, 판정 미전송 — 원본 등록/소문자 조회 불일치)**: 등록은 원본 대소문자 그대로(`:33`), 조회는 소문자로(`:46-47`) 한다. 대문자가 섞인 id는 조회가 빗나가 `tryHandleUserReply`가 `false`를 돌려주므로 판정이 아예 전송되지 않고, 사용자가 친 `yes AbC12`는 평범한 대화 메시지로 저장된다(`✅`/`⚠️` 안내 어느 쪽도 뜨지 않음).

## 2. 재현 (RED) — 재현 테스트 선행, 명령과 원문 출력

재현 테스트 2건을 **수정 이전에** `server/test/permissions.test.ts`에 먼저 추가했다(기존 하네스 `build`/`seedRoomAndBot`/`wsConnect`/`nextMessage`/`post` 그대로 사용):

- `same request_id in two rooms keeps both requests resolvable` — A·B 두 방에 같은 `abcde` 등록 후 양쪽 승인이 각각 소비·전송되는지 검증
- `mixed-case request_id resolves and the verdict carries the lowercase id` — `AbCdE` 등록 후 `yes AbCdE` 답이 소비되고 판정 id가 소문자(`abcde`, REQ-PERM-006)로 나가는지 검증

명령:

```
npm test -w server -- permissions
```

원문 출력 — **리드가 수정 되돌림 트리에서 직접 재관측**한 것(`git apply -R`로 수정만 되돌린 뒤 재실행, 재적용 완료). 구현자 관측과 동일:

```
 ❯ test/permissions.test.ts (17 tests | 2 failed) 6958ms
⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯
 FAIL  test/permissions.test.ts > permission relay > same request_id in two rooms keeps both requests resolvable
AssertionError: expected undefined to be 'permission' // Object.is equality
 ❯ test/permissions.test.ts:345:37
 FAIL  test/permissions.test.ts > permission relay > mixed-case request_id resolves and the verdict carries the lowercase id
AssertionError: expected undefined to be 'permission' // Object.is equality
 ❯ test/permissions.test.ts:362:36
 Test Files  1 failed (1)
      Tests  2 failed | 15 passed (17)
RED_EXIT=1
```

두 실패 모두 예측된 실패 모드다 — 답변이 판정으로 소비되지 못하고 일반 채팅으로 흘렀다(`consumed_by` 없음). 기존 15개 테스트는 모두 통과했다. 기준선(테스트 추가 전)은 **104/104 통과**를 본 트리에서 사전 관측했다.

## 3. 수정 (최소 — `server/src/permissions.ts`, +7/-4)

```diff
   const open = new Map<string, ConnInfo>()
+  // 합성키 — 키에 방 번호가 박혀 있으므로 다른 방의 답은 맵 조회 자체가 놓친다. 소비·전송 없이 대기 항목이 살아 남는 것이 곧 REQ-PERM-011 이다
+  const keyOf = (roomId: number, requestId: string) => `${roomId}:${requestId.toLowerCase()}`
...
-      open.set(params.request_id, info)
+      open.set(keyOf(info.roomId, params.request_id), info)
...
-      const info = open.get(requestId)
+      const info = open.get(keyOf(roomId, requestId))
       if (!info) return false                    // 모르는 ID — 재시작 직후와 같은 경로다 (REQ-PERM-003·010)
-      if (info.roomId !== roomId) return false   // 다른 방의 답은 소비도 전송도 하지 않고 항목을 남긴다 (REQ-PERM-011)
-      open.delete(requestId)                     // 해제는 전송 시도 직후 — 성공 여부와 무관 (plan.md §B). 남기면 같은 답을 무한 재시도할 수 있다
+      open.delete(keyOf(roomId, requestId))      // 해제는 전송 시도 직후 — 성공 여부와 무관 (plan.md §B). 남기면 같은 답을 무한 재시도할 수 있다
```

설계 판정과 계약 준수:

- 키를 `방:소문자id` 복합키로 통일 — 등록·조회 양쪽이 같은 기준(`keyOf`)을 경유하므로 **가정-2·가정-3이 구조적으로 참**이 된다(SPEC-CHANPERM-001 §121이 예측한 해소 경로 그대로).
- 방 가드 라인은 키에 방 번호가 포함되며 구조적으로 죽어 제거했다. 의도(REQ-PERM-011 방 격리)는 `keyOf` 주석으로 옮겼고, 다른 방의 답은 조회 미스로 소비되지 않고 대기 항목이 살아남는다(기존 테스트 `never resolves a request from a different room` 통과로 유지 확인).
- **무변경**: `PermissionBroker` 인터페이스(REQ-PERM-004), 판정 페이로드, 판정 `request_id`의 소문자 정규화(REQ-PERM-006 — "소문자로 정규화해서 보낸다" 계약 유지), `PERMISSION_REPLY_RE`, DB 스키마(REQ-PERM-014), 시스템 메시지 문구.

## 4. 재검증 (GREEN) — 리드가 이 트리에서 직접 재실행한 원문

```
$ npm test -w server
 Test Files  10 passed (10)
      Tests  106 passed (106)
TEST_EXIT=0

$ npm run typecheck -w server
TYPECHECK_EXIT=0

$ npm test -w server -- permissions   (파일 단위)
 Test Files  1 passed (1)
      Tests  17 passed (17)
GREEN_EXIT=0
```

세부 관측: verbose 실행에서 수용 기준 관련 기존 테스트 `never resolves a request from a different room`, `accepts all four verdict words, normalizes case, and rejects ids containing l` 모두 통과(구현자 관측, 리드는 파일 단위 17/17로 확인).

## 5. Gaps / Residual-risk

- **같은 방 안 서로 다른 봇의 동일 `request_id` 충돌**은 여전히 이론상 가능하다 — 방 단위 네임스페이스가 SPEC이 정한 보상 범위며(§121 "방별로 키잉"), 프로세스(세션) 단위 유일성은 채널 아키텍처가 보장하는 영역이다(가정-2 전문).
- **대문자 섞인 id는 공식 형식(`l` 제외 소문자 5자) 밖의 입력**이다 — 본 수정은 방어적 견고성이며, 실제 Claude Code 는 소문자 id만 보낸다.
- `package-lock.json` 드리프트(`@types/node` `peer` 제거, `better-sqlite3` `hasInstallScript` 추가)가 작업나무에 있음 — npm 정규화 부산물로 판단, **커밋에서 제외**했다(커밋 `c2e9d9d`은 코드 2파일만 스테이징).
- typecheck가 테스트 파일을 검사하지 않는다(전 카드들과 동일 구조) — 테스트 타입 오류는 vitest 실행 시에만 드러난다.
- 채널 쪽 `SPEC-CHANPERM-001`은 이 수정으로 가정-2·3가 참이 되었으므로 본문 수정이 필요 없다(그 SPEC §121이 명시).
- 실환경 결합(실 게이트웨이·실 토큰)은 t6 E2E 카드 소관.

## 6. 리드 후속 액션 참고

- 증거 원문: 본 보고서 §2·§4 (재현 명령·출력, 재검증 원문 — 전부 이 트리에서의 직접 실행).
- 통합: 브랜치 `WT-perm-request-id` (미푸시). t5(승인 UI)는 본 수정 이후 착수 권고였던 카드 순서상 선행 완료 상태.
- sync 디스패치 시 렌즈 제안: 이 카드는 서버 권한 릴레이의 키 정규화 수정 — 기존 `permissions.test.ts` 전체(17건)가 회귀 방어막이다.

---

## 7. 정정 라운드 — T7-F-01·02·03 종결 (2026-08-27 디스패치 · 2026-08-28 관측 완료)

sync 감사(`.moai/reports/t7/sync-audit.md`) FAIL 판정에 따른 정정. 운영자 결정 A — 이 카드 안에서 감사 권고("검사 한 곳(`onGatewayRequest` 진입부 형식 검증 + 본문 줄바꿈 중화)")대로 닫는다.

| 항목 | 값 |
|------|-----|
| 커밋 (순서대로) | `5afcd38` 테스트(RED 관측 선행) → `0e24196` 테스트 측정 교정 → `18bcc2d` 소스 수정 |
| 변경 파일 | `server/src/permissions.ts` (+22/−5), `server/test/permissions.test.ts` (17→20건) |
| 증거 디렉터리 | `.moai/state/verify/t7/` — `correction-test-full.txt`, `correction-typecheck.txt`, `correction-red-reobserve.txt`, `correction-fix.diff` |
| 무변경 | `PERMISSION_REPLY_RE`(SPEC §6 — 완화·강화 모두 금지), `tryHandleUserReply`, `keyOf`, gateway.ts, routes-messages.ts, index.ts, db.ts |

### 7.1 수정 내용 (설계)

- **등록 형식 검사** — `PERMISSION_REQUEST_ID_RE = /^[a-km-z]{5}$/` (대소문자 **구분이 의도**). 봇→서버 등록 원본만 공식 형식을 요구하고, 사람 답변 방향의 대문자 흡수는 기존 `PERMISSION_REPLY_RE` 의 `/i` 가 그대로 담당한다. 형식이 어긋나면 등록하지 않고 거절 안내 system 메시지 한 줄을 남긴다 — 거절 안내에 표기하는 id 자체도 줄바꿈 중화 + 24자 절단을 거쳐 거부 문구가 새 위조 경로가 되지 않게 한다.
- **줄바꿈 중화** — `tool_name`·`description`·`input_preview` 의 `\r\n?|\n` 을 ` ⏎ ` 표식으로 눌러 담는다. REQ-PERM-002 의 네 줄 구조는 유지되고, 봇 텍스트는 어느 줄의 시작도 차지할 수 없다.
- **라운드 1 관용의 철회 (명시)** — 라운드 1 이 방어적으로 허용했던 대소문자 섞인 원본 등록("mixed-case request_id resolves")을 **거부로 뒤집었다**. 근거: 감사 §2.3 이 이 부류의 소멸을 "대문자 id 자체가 등록되지 않는" 조건으로 예측했고, 카드 원문 F-04 의 공식 형식이 소문자이며, 실제 Claude Code 는 소문자 id 만 보낸다(라운드 1 보고 §5 가 스스로 "방어적 견고성"이라 기록한 바 있다). 답변 쪽 대소문자 관용(`Y ABCDE` 소비, REQ-PERM-006)은 그대로다.
- **테스트 교정 커밋(`0e24196`)의 근거** — 중화 설계가 가둬진 봇 텍스트를 ` ⏎ ` 와 함께 한 줄 안에 남기므로, `includes('승인하려면')` 필터는 **올바른 구현**도 실패시켰다. `startsWith` 로 좁히면 "안내 문구로 시작하는 줄은 서버가 쓴 한 줄뿐"이라는 실제 보안 성질을 재고, 위조 줄은 줄바꿈이 차단돼 줄의 시작이 될 수 없으므로 이 판정이 성질을 더 정확히 잡는다. 구현을 테스트에 맞춘 약화가 아니라 측정 도구를 성질에 맞춘 교정이다.

### 7.2 Claim → Evidence (감사 재판정용)

| # | 주장 | 증거 (명령 → 관측 원문, 레인 직접 실행) |
|---|------|------------------------------------------|
| C1 | `T7-F-01` 종결 — 진입부 형식 검사 + 본문 줄바꿈 중화 | `unset MOAI_KANBAN … && npm test -w server` → `Test Files 10 passed (10) / Tests 109 passed (109)`, `TEST_EXIT=0` (`correction-test-full.txt`). 신규 회귀: 형식 밖 원본 거부(AbCdE·hello), 줄바꿈 위조 줄 부재(네 줄 단언 + `startsWith` 안내 유일성), 대소문자 충돌 불가 — 4건 모두 GREEN |
| C2 | `T7-F-02` 종결 — 같은 검사 한 곳 | 위 C1 의 `refuses to register an id the reply format can never match`('hello' — l 포함). 길이≠5 도 동일 검사가 거부한다 (`/^[a-km-z]{5}$/`) |
| C3 | `T7-F-03` 동반 소멸 — 감사 예측대로 | 위 C1 의 `same-room case variants cannot collide…` — ABCDE 등록이 거부되어 먼저 등록한 `abcde` 가 살아 `consumed_by='permission'` |
| C4 | 변이 감별력 — 수정을 되돌리면 실패한다 | `git apply -R correction-fix.diff` 후 `npm test -w server -- permissions` → `Tests 4 failed \| 16 passed (20)`, `RED_EXIT=1`; 재적용 후 `git diff HEAD -- server/src/permissions.ts` 빈 출력(완전 복원) (`correction-red-reobserve.txt`) |
| C5 | 기존 계약 무손상 | 전체 109/109(라운드 1 기준선 106 − 17 + 20), `npm run typecheck -w server` → `TYPECHECK_EXIT=0` (`correction-typecheck.txt`). REQ-PERM-001..014 대응 기존 16건 전부 통과 |

### 7.3 Baseline-attribution

- 트리 `.claude/worktrees/t7`, 브랜치 `WT-perm-request-id`, HEAD `18bcc2d` (증거는 이 커밋 상태에서 실행; 보고 커밋은 본 절 추가만 함)
- 실행 주체: run 레인 세션이 직접 실행·관측 (구현은 general-purpose 서브에이전트 `t7-impl` 위임 — RED 순서는 커밋 `5afcd38` → `18bcc2d` 로 남고, 레인이 C4 로 재관측)
- 실행 시점: 2026-08-27 23:59 ~ 2026-08-28 (스위트·타입·RED 재관측 전부 이 트리에서 직접 실행)

### 7.4 카드 전체 범위 대장 (감사 F-05 정정 — §5 만 읽고 닫힌 걸로 읽는 일을 막는다)

| 감사 항목 | 상태 | 근거 |
|---|---|---|
| `T7-F-01` 승인 안내문 위조 (High, blocking) | **종결** | §7.2 C1 — 등록 거부 + 줄바꿈 중화 |
| `T7-F-02` 판정 불가능한 요청 (Medium, blocking) | **종결** | §7.2 C2 — 같은 검사 한 곳 |
| `T7-F-03` 대소문자 충돌 (Low, optional) | **동반 소멸** | §7.2 C3 — 감사 §2.3 예측대로 |
| `T7-F-04` 대기 맵 무한 증가 (Low, optional, 미재현 가설) | **카드 밖 — 후속 카드로 이관됨** | 큐 카드 `t12` 가 이미 같은 항목으로 등록돼 있다 (착수 시 재현 선행 권고 포함). 이 카드에서 손대지 않음 |
| `T7-F-05` 잔여 범위 미보고 (Low, optional) | **본 절로 정정** | §7.4 가 범위 대장이고, 파일 머리에 §7 안내 포인터를 추가했다 |

### 7.5 Gaps — 이번 정정이 관측하지 않은 것

- 커버리지 미측정(감사와 동일 Gap). 새 검사 경로의 커버리지 수치는 확인하지 않았다.
- 거절 안내 **문구 고정 단언** — 테스트가 `'형식에 맞지 않아 등록하지 않았습니다'` 부분 문자열에 의존한다. 문구를 고치면 테스트 한 줄을 함께 고쳐야 한다(동작 계약이 아니라 표기 계약).
- 실환경 결합(실 게이트웨이·실 토큰) — 여전히 t6 E2E 소관.

### 7.6 Residual-risk — 남는 위험

- **줄 없는 단일 행 description** 이 안내 문구처럼 읽히는 것은 중화로 막지 않는다 — 감사가 준 두 대안 중 "줄바꿈 제거"를 채택했고, "인용 블록 감싸기"는 미채택이다. 필요하면 별도 카드에서 표기 계약으로 다룰 일이다.
- **「봇을 신뢰하는가」 전제는 운영자가 아직 확정하지 않았다**(감사 §7) — 이번 정정은 전제와 무관하게 입력 형식을 강제하므로 등급 논쟁과 독립적으로 유효하다.
- 브랜치 미푸시, 워크트리가 유일 사본 — 라운드 1 과 동일하다.
- CHANGELOG·README 는 의도적으로 미갱신 — 감사 §6 권고대로 판정 PASS 확정 뒤 sync 단계에서 함께 처리한다.

### 7.7 리드 후속 액션 참고

- 재감사 디스패치 시 렌즈: `--security` 유지 권장. 탐침 부류(P1·P2·P3)는 각각 거부·거부+중화·거부 테스트로 승격돼 회귀 방어막에 합류했다.
- 라운드 1 보고 §6 의 렌즈 제안(permissions.test.ts 전체를 방어막으로)은 이번에 17→20건으로 갱신된 것 외에 동일하다.

---

## 8. 정정 라운드 2 — T7-F-01 잔여·T7-F-07 종결 (2026-08-28 디스패치)

재감사(`.moai/reports/t7/sync-audit.md` §R3·§R4) FAIL 유지 판정에 따른 정정. 운영자 결정 A′ — §R3 이 제시한 두 수정 경로 중 **접두 분리** 쪽(SPEC 개정 없이 `permissions.ts` 안에서 끝나는 길)으로 잔여 High 를 닫는다.

| 항목 | 값 |
|------|-----|
| 커밋 (순서대로) | `5d3e58a` 테스트(RED 관측 선행) → `b57d6ab` 소스 수정 + §R4 주석 정정 |
| 변경 파일 | `server/src/permissions.ts` (+11/−4), `server/test/permissions.test.ts` (라운드 2 합계 +39/−2, 20→22건) |
| 증거 디렉터리 | `.moai/state/verify/t7/` — `correction2-red.txt`, `correction2-test-full.txt`, `correction2-typecheck.txt` |
| 무변경 | `PERMISSION_REPLY_RE`(SPEC §6 — 완화·강화 모두 금지), `tryHandleUserReply`, `keyOf`, `PERMISSION_REQUEST_ID_RE`, gateway.ts, db.ts, REQ-PERM-002 네 줄 구조(줄 수·순서 유지 — 봇 두 줄 선두에 접두만 붙는다) |

### 8.1 수정 내용 (설계)

- **접두 분리 (`BOT_MARK = '│ '`)** — 봇이 채우는 두 줄(`description`·`input_preview`) 선두에 고정 접두를 붙인다. 불변식: **접두가 붙은 줄은 봇이 쓴 줄, 접두 없는 줄만 서버가 쓴 줄**이다. 1번째 줄(머리글은 서버가 쓰되 `tool_name` 이 줄 중간에 들어감)과 4번째 줄(판정 안내)에는 접두를 붙이지 않는다 — 접두 없는 줄이 곧 서버 줄이라는 불변식의 나머지 절반이다.
- **표식 문자 중화** — `oneLine` 이 줄바꿈 중화(라운드 1, `\r\n?|\n` → ` ⏎ `)에 이어 `│` 도 `/` 로 중화한다. 중화가 없으면 봇 텍스트가 줄 중간에 `│` 를 새겨 서버가 접두를 단 것처럼 위장할 수 있고, 그러면 접두 자체가 봇이 쓸 수 있는 문자가 되어 분리가 무의미해진다.
- **`T7-F-07` 주석 정정** — 라운드 1 테스트 주석이 "안내 문구로 시작하는 줄은 서버가 쓴 한 줄뿐"이라는 구현보다 강한 보증을 주장했다(재감사 §R4). 접두 도입으로 불변식 전체가 이제 참이 되었으므로, 주석을 실제 불변식 + "이 테스트가 재는 절반(줄바꿈 경로)" + "새 테스트 2건이 재는 나머지(줄 없는 위조·표식 주입)"로 나눠 고쳤다.

### 8.2 Claim → Evidence (재판정용)

| # | 주장 | 증거 (명령 → 관측 원문, 레인 직접 실행) |
|---|------|------------------------------------------|
| C1 | RED — 수정 전에 잔여 두 경로가 모두 재현된다 | `unset MOAI_KANBAN … && npm test -w server -- permissions` → `a newline-free description mimicking the guidance line…` **AssertionError: expected 2 to be 1**(안내 문구로 시작하는 줄 2개 — 재감사 탐침 R1 과 동일 실패), `bot text cannot inject the bot-content marker` **AssertionError: expected 6 to be +0**(표식 `│` 가 줄 중간에 생존). 파일 단위 `Tests 2 failed \| 20 passed (22)`, 전체 스위트 `Tests 2 failed \| 109 passed (111)` (`correction2-red.txt`) |
| C2 | GREEN — `T7-F-01` 잔여 종결 | `unset MOAI_KANBAN … && npm test -w server` → `Test Files 10 passed (10) / Tests 111 passed (111)`, `TEST_EXIT=0` (`correction2-test-full.txt`). 신규 2건 GREEN, 기존 109건 무손상 — 기존 테스트 중 봇 줄 내용을 정확히 단언하던 것은 없어 수정·완화한 테스트는 없다 |
| C3 | 타입 검사 | `npm run typecheck -w server` → `TYPECHECK_EXIT=0` (`correction2-typecheck.txt`) |

참고: C1 의 RED 커밋은 의도적으로 실패하는 테스트를 담으므로 pre-commit 품질 게이트(moai gate)가 막았고, 훅이 안내하는 문서화된 오버라이드(`SKIP_MOAI_PRECOMMIT=1`)로 커밋했다 — RED 선행 순서를 커밋 역사에 남기기 위함이다. GREEN 커밋(`b57d6ab`)은 오버라이드 없이 게이트를 통과했다.

### 8.3 Baseline-attribution

- 트리 `.claude/worktrees/t7`, 브랜치 `WT-perm-request-id`, HEAD `b57d6ab` (fix 커밋 직후. 증거 3건은 이 커밋 상태의 소스·테스트에 대해 실행 — RED 증거만 `5d3e58a` 직전, 즉 소스 미수정 상태다)
- 실행 주체: run 레인 세션(본 정정)이 직접 실행·관측
- 실행 시점: 2026-08-28 (RED → GREEN → typecheck 전부 이 트리에서 직접 실행)

### 8.4 카드 전체 범위 대장 (§7.4 갱신 — 이 표가 최신이다)

| 감사 항목 | 상태 | 근거 |
|---|---|---|
| `T7-F-01` 승인 안내문 위조 (High, blocking) | **종결 (접두 분리)** | §8.2 C1·C2 — 라운드 1 의 줄바꿈 중화(§7.1)에 이어 줄 없는 안내 줄 위조까지 `│ ` 접두로 차단. §R3 의 단일 봇 공격 경로(무해한 요청 B 의 description 으로 파괴적 요청 A 를 승인하게 만들기) 소멸 |
| `T7-F-02` 판정 불가능한 요청 (Medium, blocking) | **종결** (라운드 1 유지) | §7.2 C2 |
| `T7-F-03` 대소문자 충돌 (Low, optional) | **동반 소멸** (라운드 1 유지) | §7.2 C3 |
| `T7-F-04` 대기 맵 무한 증가 (Low, optional, 미재현 가설) | **카드 밖 — t12 이관 유지** | 라운드 1 과 동일. 이번 정정이 악화시키지도 개선하지도 않음 |
| `T7-F-05` 잔여 범위 미보고 (Low, optional) | **종결** (라운드 1 유지) | §7.4 로 정정됨 — §7.4·§8.4 대장이 그 후속이다 |
| `T7-F-06` 유니코드 줄 구분자 U+2028·U+2029 미중화 (Low, 미검증) | **t5 이관 유지** | 재감사 §R4 — 소비자(웹 UI)가 없어 판정 보류. 이번 정정 범위에서 명시적으로 제외됐다 |
| `T7-F-07` 테스트 주석 과대 보증 (Low) | **종결 (주석 정정 + 새 회귀 테스트)** | §8.1 세 번째 항목 — 불변식 전체가 참이 된 뒤 주석을 실측 범위와 함께 정정. 새 회귀 2건이 주석이 주장하는 성질을 실제로 잰다 |

### 8.5 Gaps — 이번 정정이 관측하지 않은 것

- 커버리지 미측정(감사·라운드 1과 동일 Gap). 접두 경로의 커버리지 수치는 확인하지 않았다.
- **변이 감별력 미재관측** — 완성된 트리에서 접두를 되돌렸을 때 새 테스트 2건이 실패하는지는 이번 라운드에서 실행하지 않았다. 다만 RED 가 소스 미수정 상태에서 관측됐으므로(§8.2 C1) 두 테스트의 실패 모드 자체는 직접 관측됐다.
- 렌더러 표시 — `│` 가 실제 화면에서 접두로 **보이는지**는 웹 UI(카드 t5)가 정한다. 이 나무에는 소비자가 없다.
- 실환경 결합(실 게이트웨이·실 토큰) — 여전히 t6 E2E 소관.

### 8.6 Residual-risk — 남는 위험 (§7.6 첫 머리글을 대신한다)

- §7.6 첫 머리글("줄 없는 단일 행 description 이 안내 문구처럼 읽히는 것은 중화로 막지 않는다")은 **이번 정정으로 닫혔다** — 접두 분리가 그 잔여를 차단했다. 아래는 그 뒤로 남는 것들이고, §7.6 본문은 역사 기록으로 보존한다.
- **시각적 표식의 한계** — `│ ` 접두는 사람이 눈으로 구분하는 장치다. 렌더러가 표식을 그대로 보여 준다는 전제 위에 서며, 좁은 폭에서 줄이 접히면(soft wrap) 이어지는 줄이 접두 없이 시작해 구분력이 약해질 수 있다. 한편 "서버가 줄의 시작을 기계적으로 보장한다"는 성질(테스트로 잰 불변식)은 그 전제와 무관하게 유지된다.
- **「봇을 신뢰하는가」 전제는 운영자가 아직 확정하지 않았다**(감사 §7) — 라운드 1 과 동일.
- 브랜치 미푸시, 워크트리가 유일 사본 — 라운드 1 과 동일하다.
- CHANGELOG·README 는 의도적으로 미갱신 — 판정 PASS 확정 뒤 sync 단계에서 함께 처리한다.

### 8.7 리드 후속 액션 참고

- 재판정 디스패치 시 렌즈: `--security` 유지 권장. 재감사 탐침 R1 부류가 회귀 테스트로 승격됐다(permissions.test.ts 20→22건).
- 변이 감별력 재관측(§8.5 두 번째 Gap)은 재판정 감사자가 접두 제거 한 줄 되돌림으로 확인할 수 있다 — 라운드 1 C4 와 같은 방법(`git apply -R` 후 파일 단위 실행).
