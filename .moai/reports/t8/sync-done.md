# t8 sync-done — N-07·N-09 검증 종결

card: t8 | branch: WT-attachment-guard | HEAD: b929503
review lens: --security --deep

## Claim (주장)

run 레인의 run-done.md 주장(N-07 가드 정상 동작, N-09 문서 개정 정확, 스위트 189 통과,
typecheck 오류 0)이 이 나무·이 커밋 기준으로 재현된다.

## Evidence (증거)

- `git -C <wt> show b929503` — diff 4파일(acceptance.md, spec.md, routes-messages.ts,
  messages.test.ts) 확인, 코드 diff 가 run-done.md 서술과 일치.
- `npx vitest run` (server/) — `Test Files 15 passed (15) / Tests 189 passed (189)`
  (직접 재실행 확인, run 레인 주장과 동일 수치).
- `npm run typecheck -w server` (`tsc --noEmit`) — exit 0, 오류 출력 없음.
- 변이 검증 재현 — N-07 가드 블록 제거 후 `npx vitest run test/messages.test.ts -t
  "disappeared"` → `Tests 1 failed | 14 skipped (15)` (가드가 실제로 방어 효과를
  낸다는 것을 직접 확인). 원본 파일 복원 후 `git diff --stat`로 무변경 확인.
- 보안 렌즈 — `grep -rn "createReadStream|stored_path" server/src/*.ts` 로
  stored_path 를 다루는 자리 전수 확인. HTTP 로 파일을 스트리밍하는 곳은
  routes-messages.ts 한 곳뿐이고 이제 존재 검사로 막혀 있음. gateway.ts 의
  `local_path: a.stored_path` 는 방을 구독하는 인증된 봇 소켓 전용 프레임
  (`sendStoredMessage`/`deliver`)에만 실리며, 로그인 사용자 전체에게 가는
  `hub.publish` 프레임에는 의도적으로 빠져 있음(코드 주석 296-297행, sync-reaudit
  N-01 근거) — 이 카드의 diff 범위 밖의 기존 설계이며 새 결함 아님.

## Baseline-attribution (baseline 귀속)

이 런·이 나무, HEAD `b929503`(server 코드는 무변경, run 레인이 만든 그대로).
테스트·타입체크·변이 검증 모두 이 세션이 직접 실행해 관측.

## Gaps (미검증)

- e2e 스위트 미실행(run 레인과 동일 판단 — server 라우트 변경이라 lane-local 원칙상
  server 스위트로 충분, 전체 스위트는 CI 가 돌림).
- channel 빌드는 run-done.md 의 기존 관측(exit 0)을 재실행하지 않고 그대로 인용함.

## Residual-risk (잔여 위험)

- N-07 의 Low 심각도 근거(원격 공격자가 파일 삭제 상태를 유발할 수 없음)는 run-done.md
  서술과 동일하게 유지 — 이번 검증은 정보 노출 봉쇄를 재확인했을 뿐 상태 발생 원인을
  다루지 않음.
- AC-CORE-012 가 고정한 커밋 SHA `a97d36c` 는 히스토리 리라이트가 일어나면 깨짐
  (run-done.md 와 동일 한계).

## 판정

PASS — run 레인 주장 전건 재현 확인, 신규 결함 없음. 커밋 대기 없이 곧바로 진행
(run-done.md·sync-done.md 커밋 후 origin 백업 푸시).
