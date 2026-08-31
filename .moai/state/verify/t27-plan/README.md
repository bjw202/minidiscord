# t27 plan 단계 증거 로그

각 로그는 카드 t27 의 plan 세션이 워크트리 `.claude/worktrees/t27`(브랜치 `WT-ci-test-wiring`, 기준 `2a19d7d`)에서 직접 실행한 명령의 출력이다.
`npm-ci.log` · `build.log` · `typecheck-*.log` · `test-*.log` 는 **마지막 줄에 `exit=<코드>` 가 붙어 있다**(plan-audit D7 정정 — 1차 기록에는 종료 코드가 없어 「exit 0」 주장이 오류 블록의 부재에만 기대고 있었다).

| 파일 | 명령 | 관측 |
|---|---|---|
| `npm-ci.log` | `npm ci` | exit 0 |
| `test-no-build.log` | `npm test` (channel 빌드 **전**) | exit 1 · 채널 6건 실패 (`npm error code 1`) |
| `build.log` | `npm run build -w channel` | exit 0 |
| `test-with-build.log` | `npm test` (빌드 **후**) | exit 0 · 283 통과 = server 188 + channel 95 |
| `typecheck-server.log` | `npm run typecheck -w server` | exit 0 |
| `typecheck-channel.log` | `npm run typecheck -w channel` | exit 0 |
| `flake-run1..3.log` | `npm test -w channel -- test/transport-auth.test.ts` 단독 3회 | 3회 모두 exit 0 |

## `flake-repeat.log` 은 측정이 아니다

`--repeats=9` 로 반복 실행을 시도했으나 **vitest 가 그 플래그를 모른다**(`CACError: Unknown option --repeats`). 즉 이 파일은 **실행에 실패한 시도의 기록**이며 반복 측정 결과가 아니다. 어떤 수치의 근거로도 인용해서는 안 된다. 흔들림(`transport-auth.test.ts:719`)의 실패율은 **측정되지 않았다** — 이 디렉터리에 있는 관측은 `flake-run1..3` 의 초록 3회와 `test-with-build` 안의 초록 1회뿐이고, 과거 실패 2회는 카드 t6 의 인계 기록이지 이 디렉터리의 관측이 아니다.
