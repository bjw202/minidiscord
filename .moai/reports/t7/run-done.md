# t7 런 단계 완료 보고 — 권한 릴레이 request_id 결함 2건 수정

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
