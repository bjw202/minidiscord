# t11 sync 감사 증거 (SPEC-ROOMAUTHZ-001)

`.moai/reports/t11/sync-audit.md` 가 인용하는 원문. 감사자(sync-auditor)가 워크트리
`.claude/worktrees/t11` @ `c87cbc1` + 미커밋 sync 델타에서 직접 실행했다.

## 프로브 — vitest 수집 대상이 아니다

다섯 프로브는 **`.mts` 확장자**라 vitest 기본 수집 패턴(`**/*.{test,spec}.?(c|m)[jt]s`)에
걸리지 않는다. 루트 `npx vitest list --dir .` 이 16파일/195건만 수집하고 로드 오류 0인 것을
감사 종료 시 확인했다. 실행은 `npx vitest` 가 아니라 `npx tsx <파일>` 이다.

| 파일 | 무엇을 재는가 |
|---|---|
| `probe-a-routes.mts` | `buildServer()` 조립 후 `app.printRoutes()` — 라우트 전수 열거 |
| `probe-b-leak.mts` | 게이트 7 + 보관 + HEAD 2 에서 비멤버 vs 없는 방 바이트 대조, 극단 room id, `isRoomMember(NaN)` |
| `probe-c-escalation.mts` | 자가 승급·사용자 존재 오라클·릴레이 교란·첨부 누출·목록 축소·백필 재실행 |
| `probe-d-http-relay.mts` | HTTP(정식 multipart) 릴레이 교란·SSE 구독 누수·보관의 파급 |
| `probe-e-archived.mts` | 보관된 방에서 비멤버 vs 없는 방 재대조 (REQ-013 순서 계약) |

프로브는 전부 **읽기 전용**이다 — `server/src` 를 한 글자도 바꾸지 않았고, 각자 `mkdtemp`
임시 디렉터리에 자기 DB 를 연다. 감사 종료 시 `git status --short server channel web` 빈 출력.

## 로그

| 파일 | 명령 |
|---|---|
| `audit-server-test.log` | `npm test -w server -- --reporter=verbose` → 125/125, 종료 0 |
| `audit-typecheck.log` | `npm run typecheck -w server` → 종료 0 |
| `audit-channel-test.log` | `npm test -w channel` → 70/70, 종료 0 |
| `probe-*.log` | 위 프로브 다섯의 표준 출력 |
