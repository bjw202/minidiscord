# t25 plan — F-11 변이 실측 (재현 선행)

- 나무: `.claude/worktrees/t25` @ base `2a19d7d` (main), 브랜치 `WT-bot-stability`
- 명령: `npx vitest run --root channel --reporter=dot`
- 기준선: **95 passed / 6 files** (변이 전, 직접 실행 확인)

| 변이 | 자리 | 내용 | 결과 |
|---|---|---|---|
| A | `gateway-client.ts:233` (`ws.on('close')`) | `if (!stopped) retry()` → `retry()` | **포착** — 1 failed / 94 passed |
| B | `gateway-client.ts:239` (`retry()` 안, `await sleep` 직후) | `if (stopped) return` 줄 삭제 | **생존** — 95 passed (전건 통과) |

## 읽는 법

t20 F-11 이 말한 «stopped 가드 제거해도 전건 통과» 는 **두 가드 중 하나에만** 참이다.

- close 경로의 가드는 기존 기준이 이미 잰다 (변이 A 포착).
- **재는 기준이 없는 것은 «백오프 대기 중에 stop() 이 불린 경우» 뿐이다** (변이 B 생존) — 이 자리가
  뚫리면 stop() 이 돌아온 뒤에도 대기 타이머가 만료되며 새 소켓이 열린다(유령 소켓).

따라서 신설할 기준의 표적은 «끊김 → 백오프 **대기 중** stop() → 새 소켓 0개» 한 문장이다.
카드 본문이 지목한 `gateway-client.ts:96` 은 base `bc465ac` 시점의 줄 번호이고, 이 나무(`2a19d7d`)에서
같은 자리는 `:239` 다 — 줄 번호가 아니라 «retry() 안 sleep 직후» 라는 앵커로 읽을 것.

## 복원

- `git diff --stat` 출력 없음
- `shasum channel/src/gateway-client.ts` = `1cb171887b3f69b624a0c06698f9eaa7fc58ec77`
