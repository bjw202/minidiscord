#!/usr/bin/env bash
# A-0 관측용: 서버 기동 + 사람 로그인 + 방 + 봇 + 초대 → 토큰
set -u
WT=/Users/byunjungwon/Dev/my-project-04/minidiscord/.claude/worktrees/v2-model
SP=$WT/.moai/state/verify/a0
PORT=3777
mkdir -p "$SP/data" "$SP/bot"
cd "$WT" || exit 2
MINIDISCORD_PORT=$PORT MINIDISCORD_HOST=127.0.0.1 MINIDISCORD_DATA_DIR="$SP/data" MINIDISCORD_BOT_FILES_DIR="$SP/bot" \
  nohup npx tsx server/src/index.ts >"$SP/server.log" 2>&1 &
echo $! >"$SP/server.pid"
for i in $(seq 1 15); do sleep 1; curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null && break; done
echo "health=$(curl -s http://127.0.0.1:$PORT/api/health)"
H="$SP/hdr.txt"
curl -s -D "$H" -o /dev/null -H 'content-type: application/json' -d '{"username":"jw-a0"}' "http://127.0.0.1:$PORT/api/auth/login"
COOKIE=$(sed -n 's/.*md_session=\([0-9a-f]*\).*/\1/p' "$H" | head -1)
echo "cookie_head=${COOKIE:0:8}"
api() { curl -s -X "$1" -H "Cookie: md_session=$COOKIE" -H 'content-type: application/json' ${3:+-d "$3"} "http://127.0.0.1:$PORT$2"; }
ROOM=$(api POST /api/rooms '{"name":"a0-room"}'); echo "room=$ROOM"
RID=$(echo "$ROOM" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
BOT=$(api POST /api/bots '{"name":"bot-a0","description":"A-0 probe"}'); echo "bot=$BOT"
BID=$(echo "$BOT" | python3 -c 'import json,sys;print(json.load(sys.stdin)["id"])')
INV=$(api POST "/api/rooms/$RID/invites" "{\"bot_id\":$BID}"); echo "invite=$(echo "$INV" | cut -c1-80)…"
TOKEN=$(echo "$INV" | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')
echo "$COOKIE" >"$SP/cookie"; echo "$RID" >"$SP/room_id"; echo "$TOKEN" >"$SP/token"
python3 - "$SP/bot/mcp.json" "$WT/channel/dist/index.js" "ws://127.0.0.1:$PORT/bot" "$TOKEN" "$SP/args.log" <<'PY'
import json, sys
p, dist, server, token, log = sys.argv[1:6]
doc = {'mcpServers': {'minidiscord-channel': {'command': 'node', 'args': [dist],
       'env': {'MINIDISCORD_SERVER': server, 'MINIDISCORD_TOKEN': token, 'A0_PROBE_LOG': log}}}}
json.dump(doc, open(p, 'w'), indent=2)
PY
echo "mcp_json=$SP/bot/mcp.json"
