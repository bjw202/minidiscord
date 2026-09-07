# A-0 실세션 관측 — 결정 ② (2026-09-07)

질문: Claude Code 가 `reply` 를 부를 때 알림 `meta.chat_id` 를 인자로 되돌리는가.

방법: `channel-server.ts` 의 `reply` inputSchema 에 선택 인자 `chat_id`(설명 «답하는 메시지의 chat_id») 를 임시로 더하고 호출 인자를 `args.log` 에 기록. 서버 v1(C1 나무 2f6cd3f, 포트 3777, 새 DB) + 봇 bot-a0 을 tmux 세션(claude 2.1.263, Fable 5.1, `--dangerously-load-development-channels --mcp-config --strict-mcp-config --allowedTools reply,fetch_history`) 으로 붙이고 사람이 `@TO(bot-a0)` 두 번.
패치는 관측 뒤 되돌렸고 dist 재빌드 — `git diff | wc -l` = 0, `grep -c A0-PROBE channel/dist/channel-server.js channel/src/channel-server.ts` = 0·0.

관측 (`args.log` 원문; 세션 기록 `~/.claude/projects/-Users-byunjungwon-Dev-my-project-04-minidiscord--claude-worktrees-v2-model--moai-state-verify-a0-bot/3e57209e-f1cd-42a2-9b24-e874f0900973.jsonl` 의 `tool_use.input` 과 글자 그대로 동일):
- 알림 chat_id="1" (사람 글 id 1, 방 id 1) → reply {chat_id:"1", text:"안녕하세요, jw-a0! …"}
- 알림 chat_id="3" (사람 글 id 3, 방 id 1) → reply {chat_id:"3", text:"오늘은 2026년 9월 7일이에요."}

판정: **세션이 채움** — 스키마에 `chat_id` 선택 인자가 있으면 세션이 알림의 값을 그대로 되돌린다 (2/2; 둘째 값 3 이 방 id 1 과 달라 «방 번호 추측» 이 아니라 «알림 값 되돌림» 으로 구별됨).

한정:
- 세션 하나·모델 하나(Fable 5.1)·2회. 다른 모델·긴 대화·방 여럿의 알림이 섞인 상황은 재지 않았다.
- v1 스키마에는 `chat_id` 인자가 없어 넘길 길 자체가 없다 — SPEC-A 가 인자를 정의해야 관측이 성립한다.
- 되돌리지 않는 경우의 안전망(채널이 «마지막 to 방» 으로 채움, 가이드 §0 ②)은 그대로 둔다.
