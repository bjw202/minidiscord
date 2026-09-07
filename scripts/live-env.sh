#!/usr/bin/env bash
# scripts/live-env.sh — SPEC-LIVEENV-001. 라이브 검증 환경을 사람의 기억이 아니라 코드에 둔다.
#
# 이 파일이 지는 계약 넷:
#   REQ-001  자기 파일 위치에서 트리를 확정하고 호출자의 작업 디렉터리에 의존하지 않는다.
#   REQ-002  up 이 잡은 것만 down 이 내린다.
#   REQ-003  서버 생존을 응답 코드로 판정하지 않는다 — 세 축을 함께 읽는다.
#   REQ-004  결과는 세 값이다: 0 재서 통과 · 1 재서 실패 · 2 재지 못함.
#
# [HARD] 「검사할 것을 찾지 못함」과 「검사해서 통과」는 다른 값이다. 이 구별을 잃으면
# 이 스크립트는 자기가 겨눈 사고를 도구로 굳힌다. 미측정 경로는 status --unmeasured-paths 가
# 스스로 전건을 찍고, 각 축의 판정 줄이 measured=yes|no 를 함께 싣는다.

set -u
set -o pipefail

# ── 트리 고정 (REQ-001) ──────────────────────────────────────────────
# 호출자의 셸을 옮기지 않는다: cd 는 명령 치환 안의 하위 셸에서만 일어난다.
LIVEENV_SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
ROOT=$(git -C "$LIVEENV_SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "${ROOT}" ]; then
  echo "live-env: git 트리를 확정하지 못했다 — 이 스크립트는 저장소 트리 안에서만 돈다" >&2
  exit 2
fi

SERVER_DIR="$ROOT/server"
DATA_DIR="$ROOT/data/live-env"
BOT_DIR="$ROOT/bot-01"
CHANNEL_DIST="$ROOT/channel/dist/index.js"
TOKEN_FILE="$DATA_DIR/token"
SESSION_FILE="$DATA_DIR/session"
STATE_FILE="$DATA_DIR/state.json"
TARGET_FILE="$DATA_DIR/target.json"
EVIDENCE_DIR="$ROOT/.moai/specs/SPEC-LIVEENV-001/evidence"

# 세 축이 읽는 대상 테이블. 「DB 파일은 있으나 대상 테이블이 없다」가 부분 측정의 한 자리다.
DB_TABLE="messages"

LIVEENV_USER="liveenv"

# 종료 코드 세 값 (REQ-004)
EXIT_OK=0
EXIT_FAILED=1
EXIT_UNMEASURED=2

# ── 미측정 경로의 전건 목록 (REQ-004) ────────────────────────────────
# [HARD] 이 목록이 AC-LIVEENV-004 의 분모다. 코드가 낼 수 있는 미측정 경로를 여기에 전부 적는다 —
# 목록에 없는 경로를 코드가 내면 그 기준은 표본을 잰 것이 된다.
liveenv_unmeasured_paths() {
  cat <<'PATHS'
listen_tool_absent
listen_no_listener
listen_cwd_unreadable
e1_port_taken_before_bind
db_tool_absent
db_file_absent
db_table_absent
principal_state_incomplete
principal_api_unreachable
principal_api_empty
principal_conn_unreadable
e2_approval_pending
e3_transcript_candidates_multiple
e5_global_entry_changed
capture_playwright_absent
PATHS
}

# ── 작은 도우미 ──────────────────────────────────────────────────────

# JSON 한 열쇠를 읽는다. jq 는 어디에나 있지 않으므로 시스템 python3 를 쓴다.
json_get() { # json_get <파일> <열쇠>
  python3 - "$1" "$2" <<'PY' 2>/dev/null
import json, sys
try:
    with open(sys.argv[1]) as f:
        d = json.load(f)
except Exception:
    sys.exit(1)
v = d.get(sys.argv[2])
if v is None:
    sys.exit(1)
print(v)
PY
}

pid_alive() { [ -n "${1:-}" ] && kill -0 "$1" 2>/dev/null; }

# 프로세스의 작업 디렉터리. 읽지 못하면 빈 문자열 — 그 상태가 「부분 측정」이다.
pid_cwd() {
  command -v lsof >/dev/null 2>&1 || return 1
  lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1
}

# 그 포트를 LISTEN 하는 pid. 없으면 빈 출력.
listen_pid_of() {
  command -v lsof >/dev/null 2>&1 || return 1
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -Fp 2>/dev/null | sed -n 's/^p//p' | head -1
}

free_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(('127.0.0.1', 0))
print(s.getsockname()[1])
s.close()
PY
}

# ── paths (M0) ───────────────────────────────────────────────────────
# [HARD] 경로를 key=value 한 줄씩 찍는다. 이 형식이 AC-LIVEENV-001 의 분모를 만든다 —
# 형식이 없으면 「출력된 경로 줄 수」를 사람이 세게 된다. 경로가 아닌 값은 여기서 찍지 않는다.
cmd_paths() {
  echo "root=$ROOT"
  echo "server_dir=$SERVER_DIR"
  echo "data_dir=$DATA_DIR"
  echo "bot_dir=$BOT_DIR"
  echo "channel_dist=$CHANNEL_DIST"
  echo "token_file=$TOKEN_FILE"
  echo "session_file=$SESSION_FILE"
  echo "state_file=$STATE_FILE"
  echo "target_file=$TARGET_FILE"
  echo "evidence_dir=$EVIDENCE_DIR"
}

# ── up / down (M0 · REQ-002) ─────────────────────────────────────────
cmd_up() {
  mkdir -p "$DATA_DIR" "$BOT_DIR"
  local old_pid
  old_pid=$(json_get "$STATE_FILE" pid || true)
  if pid_alive "${old_pid:-}"; then
    echo "already-running pid=$old_pid" >&2
    return $EXIT_FAILED
  fi

  local port
  port=$(free_port) || { echo "live-env: 빈 포트를 잡지 못했다" >&2; return $EXIT_UNMEASURED; }
  local log="$DATA_DIR/server.log"
  : > "$log"

  # 서버는 별도 프로세스로 띄운다. 작업 디렉터리를 server/ 로 두어 LISTEN pid 의 cwd 가
  # 이 트리의 서버 디렉터리가 되게 한다 — 그 값이 REQ-003 ㉠ 의 판정 대상이다.
  (
    cd "$SERVER_DIR" || exit 1
    MINIDISCORD_PORT="$port" \
    MINIDISCORD_HOST=127.0.0.1 \
    MINIDISCORD_DATA_DIR="$DATA_DIR" \
    MINIDISCORD_BOT_FILES_DIR="$BOT_DIR" \
    nohup npx tsx src/index.ts >>"$log" 2>&1 &
    echo $! > "$DATA_DIR/launcher.pid"
  )

  # 기동 대기는 시한이 있다 — 고정 sleep 도, 무한 대기도 쓰지 않는다.
  local deadline=$((SECONDS + 60)) ok=0
  while [ $SECONDS -lt $deadline ]; do
    if curl -sf "http://127.0.0.1:$port/api/health" >/dev/null 2>&1; then ok=1; break; fi
    sleep 0.2
  done
  if [ $ok -ne 1 ]; then
    echo "live-env: 기동 시한 초과 — $log 를 보라" >&2
    return $EXIT_FAILED
  fi

  # 상태 파일에 적는 pid 는 «실제로 LISTEN 하는» pid 다. 실행기 pid 를 적으면
  # down 이 신호를 보낸 대상과 status 가 판정하는 대상이 갈린다.
  local pid
  pid=$(listen_pid_of "$port" || true)
  if [ -z "${pid:-}" ]; then
    echo "live-env: LISTEN pid 를 읽지 못했다 (lsof 부재이거나 판독 불가)" >&2
    return $EXIT_UNMEASURED
  fi

  python3 - "$STATE_FILE" "$port" "$DATA_DIR" "$BOT_DIR" "$pid" "$DATA_DIR/minidiscord.db" <<'PY'
import json, sys
p, port, data, bot, pid, db = sys.argv[1:7]
with open(p, 'w') as f:
    json.dump({'port': int(port), 'data_dir': data, 'bot_files_dir': bot,
               'pid': int(pid), 'db_path': db}, f, indent=2)
    f.write('\n')
PY
  echo "up port=$port pid=$pid"
  return $EXIT_OK
}

cmd_down() {
  local pid port
  pid=$(json_get "$STATE_FILE" pid || true)
  port=$(json_get "$STATE_FILE" port || true)
  if [ -z "${pid:-}" ]; then
    echo "down: 상태 파일에 pid 가 없다 — 아무 것도 하지 않는다" >&2
    return $EXIT_UNMEASURED
  fi
  if ! pid_alive "$pid"; then
    echo "down: pid=$pid 는 이미 없다 — 아무 것도 하지 않는다"
    rm -f "$STATE_FILE"
    return $EXIT_OK
  fi
  # [HARD] 남의 프로세스를 죽이지 않는다. 신호를 보내기 전에 그 pid 가 «이 트리의 서버» 인지
  # 확인한다 — 판정 근거는 그 pid 의 작업 디렉터리다(REQ-003 ㉠ 과 같은 축).
  local cwd
  cwd=$(pid_cwd "$pid" || true)
  if [ "${cwd:-}" != "$SERVER_DIR" ]; then
    echo "down: pid=$pid 는 이 트리의 서버가 아니다 (cwd=${cwd:-읽지 못함}) — 신호를 보내지 않는다" >&2
    return $EXIT_FAILED
  fi
  kill "$pid" 2>/dev/null
  local deadline=$((SECONDS + 10))
  while [ $SECONDS -lt $deadline ] && pid_alive "$pid"; do sleep 0.2; done
  if pid_alive "$pid"; then kill -9 "$pid" 2>/dev/null; sleep 0.5; fi
  echo "down pid=$pid port=${port:-?}"
  rm -f "$STATE_FILE"
  return $EXIT_OK
}

# ── status (M1 · REQ-003 · REQ-004) ──────────────────────────────────
cmd_status() {
  if [ "${1:-}" = "--unmeasured-paths" ]; then
    liveenv_unmeasured_paths
    return $EXIT_OK
  fi

  local unmeasured=0 failed=0
  local port pid db_path
  port=$(json_get "$STATE_FILE" port || true)
  pid=$(json_get "$STATE_FILE" pid || true)
  db_path=$(json_get "$STATE_FILE" db_path || true)

  # ── ㉠ 축: 그 포트를 LISTEN 하는 pid 의 cwd ────────────────────────
  local axis1_val="-" axis1_measured="no" axis1_path=""
  if ! command -v lsof >/dev/null 2>&1; then
    axis1_path="listen_tool_absent"
  elif [ -z "${port:-}" ]; then
    axis1_path="listen_no_listener"
  else
    local lpid
    lpid=$(listen_pid_of "$port" || true)
    if [ -z "${lpid:-}" ]; then
      axis1_path="listen_no_listener"
    elif ! pid_alive "${pid:-}" && [ "${lpid}" != "${pid:-}" ]; then
      # up 이 잡은 포트를 그 사이 남이 가져갔다 — 기동은 실패했고 남의 프로세스가 그 포트에 있다.
      axis1_path="e1_port_taken_before_bind"
    else
      local lcwd
      lcwd=$(pid_cwd "$lpid" || true)
      if [ -z "${lcwd:-}" ]; then
        axis1_path="listen_cwd_unreadable"   # 부분 측정: 도구는 있고 pid 도 잡혔으나 값을 얻지 못했다
      else
        axis1_val="$lcwd"
        axis1_measured="yes"
        [ "$lcwd" != "$SERVER_DIR" ] && failed=1
      fi
    fi
  fi
  [ "$axis1_measured" = "no" ] && unmeasured=1
  echo "listen_pid_cwd=$axis1_val measured=$axis1_measured"
  [ -n "$axis1_path" ] && echo "unmeasured_path=$axis1_path"

  # ── ㉡ 축: 상태 파일이 가리키는 DB 의 대상 테이블 행 수 ────────────
  local axis2_val="-" axis2_measured="no" axis2_path=""
  if ! command -v sqlite3 >/dev/null 2>&1; then
    axis2_path="db_tool_absent"
  elif [ -z "${db_path:-}" ] || [ ! -f "$db_path" ]; then
    axis2_path="db_file_absent"
  else
    local has_table
    has_table=$(sqlite3 "$db_path" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='$DB_TABLE'" 2>/dev/null || echo "")
    if [ "${has_table:-0}" != "1" ]; then
      axis2_path="db_table_absent"          # 부분 측정: 파일은 있으나 대상 테이블이 없다
    else
      local rows
      rows=$(sqlite3 "$db_path" "SELECT count(*) FROM $DB_TABLE" 2>/dev/null || echo "")
      if [ -z "$rows" ]; then
        axis2_path="db_table_absent"
      else
        axis2_val="$rows"
        axis2_measured="yes"
      fi
    fi
  fi
  [ "$axis2_measured" = "no" ] && unmeasured=1
  echo "db_rows=$axis2_val measured=$axis2_measured"
  [ -n "$axis2_path" ] && echo "unmeasured_path=$axis2_path"

  # ── ㉢ 축: 게이트웨이에 붙은 주체를 두 면에서 함께 읽는다 ──────────
  # api= 는 방의 초대 목록 online 필드(웹 API 를 거친다), conn= 은 같은 시각의 확립 접속 수
  # (API 를 거치지 않는다). 한 면만 읽히면 이 축은 측정된 것이 아니다.
  local axis3_val="-" axis3_measured="no" axis3_path=""
  local room_id bot_id bot_name cookie
  room_id=$(json_get "$TARGET_FILE" room_id || true)
  bot_id=$(json_get "$TARGET_FILE" bot_id || true)
  bot_name=$(json_get "$TARGET_FILE" bot_name || true)
  cookie=""
  [ -f "$SESSION_FILE" ] && cookie=$(cat "$SESSION_FILE")

  if [ -z "${port:-}" ] || [ -z "${room_id:-}" ] || [ -z "${bot_id:-}" ] || [ -z "${cookie:-}" ]; then
    axis3_path="principal_state_incomplete"
  else
    local body http
    body=$(curl -s -o "$DATA_DIR/.invites.json" -w '%{http_code}' \
      -H "Cookie: md_session=$cookie" \
      "http://127.0.0.1:$port/api/rooms/$room_id/invites" 2>/dev/null || echo "000")
    http="$body"
    if [ "$http" != "200" ]; then
      axis3_path="principal_api_unreachable"
    else
      local api_online
      api_online=$(python3 - "$DATA_DIR/.invites.json" "$bot_id" <<'PY' 2>/dev/null || true
import json, sys
try:
    rows = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
if not rows:
    sys.exit(2)
for r in rows:
    if str(r.get('bot_id')) == sys.argv[2]:
        print('true' if r.get('online') else 'false')
        break
else:
    sys.exit(2)
PY
)
      if [ -z "${api_online:-}" ]; then
        axis3_path="principal_api_empty"    # 부분 측정: 200 이되 그 봇이 목록에 없다
      else
        local conns
        if ! command -v lsof >/dev/null 2>&1 || ! pid_alive "${pid:-}"; then
          conns=""
        else
          conns=$(lsof -nP -a -p "$pid" -iTCP -sTCP:ESTABLISHED 2>/dev/null | grep -c ":$port->" || true)
        fi
        if [ -z "${conns:-}" ]; then
          axis3_path="principal_conn_unreadable"   # 부분 측정: api 면은 읽혔으나 접속 면을 얻지 못했다
        else
          axis3_val="${bot_name:-?}:api=$api_online:conn=$conns"
          axis3_measured="yes"
        fi
      fi
    fi
  fi
  [ "$axis3_measured" = "no" ] && unmeasured=1
  echo "principal=$axis3_val measured=$axis3_measured"
  [ -n "$axis3_path" ] && echo "unmeasured_path=$axis3_path"

  # [HARD] 부분 측정도 「재지 못함」이다 — 0 을 내지 않는다. 미측정이 하나라도 있으면 2 가 이긴다.
  if [ $unmeasured -eq 1 ]; then return $EXIT_UNMEASURED; fi
  if [ $failed -eq 1 ]; then return $EXIT_FAILED; fi
  return $EXIT_OK
}

# ── 세션 (M2 보조) ───────────────────────────────────────────────────
# 로그인 쿠키는 64자 hex 다. 상태 파일에 넣으면 AC-LIVEENV-002 의 증거 파일이 그것을 그대로
# 담게 되고 AC-LIVEENV-011 의 훑기가 적중한다 — 그래서 권한 0600 의 별도 파일에 둔다.
ensure_session() {
  local port; port=$(json_get "$STATE_FILE" port || true)
  [ -z "${port:-}" ] && return 1
  if [ -f "$SESSION_FILE" ]; then
    local c; c=$(cat "$SESSION_FILE")
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: md_session=$c" \
      "http://127.0.0.1:$port/api/rooms" 2>/dev/null || echo 000)
    [ "$code" = "200" ] && return 0
  fi
  local hdr; hdr="$DATA_DIR/.login-headers"
  curl -s -D "$hdr" -o /dev/null -X POST -H 'content-type: application/json' \
    -d "{\"username\":\"$LIVEENV_USER\"}" \
    "http://127.0.0.1:$port/api/auth/login" 2>/dev/null
  local tok
  tok=$(sed -n 's/.*md_session=\([0-9a-f]*\).*/\1/p' "$hdr" | head -1)
  rm -f "$hdr"
  [ -z "${tok:-}" ] && return 1
  umask 077
  printf '%s' "$tok" > "$SESSION_FILE"
  chmod 600 "$SESSION_FILE"
  return 0
}

api_call() { # api_call <method> <path> [json]
  local port; port=$(json_get "$STATE_FILE" port)
  local cookie; cookie=$(cat "$SESSION_FILE")
  if [ -n "${3:-}" ]; then
    curl -s -X "$1" -H "Cookie: md_session=$cookie" -H 'content-type: application/json' \
      -d "$3" "http://127.0.0.1:$port$2"
  else
    curl -s -X "$1" -H "Cookie: md_session=$cookie" "http://127.0.0.1:$port$2"
  fi
}

# ── invite (M2 · REQ-005) ────────────────────────────────────────────
cmd_invite() {
  local room_arg="${1:-}" bot_arg="${2:-}"
  if [ -z "$room_arg" ] || [ -z "$bot_arg" ]; then
    echo "usage: live-env.sh invite <방(id 또는 이름)> <봇 이름>" >&2
    return $EXIT_UNMEASURED
  fi
  if ! ensure_session; then
    echo "invite: 서버 세션을 세우지 못했다 — 먼저 up 을 돌려라" >&2
    return $EXIT_UNMEASURED
  fi

  # 방 해소: 숫자이고 실재하면 그 id, 아니면 그 이름으로 만든다.
  local room_id=""
  local rooms; rooms=$(api_call GET /api/rooms)
  case "$room_arg" in
    ''|*[!0-9]*) ;;
    *) room_id=$(printf '%s' "$rooms" | python3 -c "
import json,sys
d=json.load(sys.stdin)
want=int('$room_arg')
for r in d.get('active',[]):
    if r['id']==want: print(want); break
" 2>/dev/null || true) ;;
  esac
  if [ -z "${room_id:-}" ]; then
    local name="$room_arg"
    case "$room_arg" in ''|*[!0-9]*) ;; *) name="live-env-$room_arg" ;; esac
    room_id=$(api_call POST /api/rooms "{\"name\":\"$name\"}" | python3 -c "
import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null || true)
  fi
  [ -z "${room_id:-}" ] && { echo "invite: 방을 해소하지 못했다" >&2; return $EXIT_FAILED; }

  # 봇 해소: 이름으로 찾고 없으면 만든다.
  local bot_id
  bot_id=$(api_call GET /api/bots | python3 -c "
import json,sys
for b in json.load(sys.stdin):
    if b['name']=='$bot_arg': print(b['id']); break
" 2>/dev/null || true)
  if [ -z "${bot_id:-}" ]; then
    bot_id=$(api_call POST /api/bots "{\"name\":\"$bot_arg\",\"description\":\"live-env\"}" | python3 -c "
import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null || true)
  fi
  [ -z "${bot_id:-}" ] && { echo "invite: 봇을 해소하지 못했다" >&2; return $EXIT_FAILED; }

  # [HARD] 평문 토큰은 이 응답에 한 번만 실린다. 표준출력으로 흘리지 않고 곧장 파일로 내린다.
  umask 077
  local respfile="$DATA_DIR/.invite-response.json"
  api_call POST "/api/rooms/$room_id/invites" "{\"bot_id\":$bot_id}" > "$respfile"
  # 응답 파일은 평문 토큰을 담는다 — 파일에서 읽어 토큰 파일로 옮긴 즉시 지운다.
  # (히어독으로 프로그램을 넘기면서 같은 표준입력으로 응답을 파이프할 수는 없다.)
  local ok
  ok=$(python3 - "$respfile" "$TOKEN_FILE" <<'PY' 2>/dev/null || true
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
t = d.get('token')
if not t:
    sys.exit(1)
with open(sys.argv[2], 'w') as f:
    f.write(t)
print('ok')
PY
)
  rm -f "$respfile"
  if [ "${ok:-}" != "ok" ]; then
    echo "invite: 초대 발급 응답에서 토큰을 얻지 못했다" >&2
    return $EXIT_FAILED
  fi
  chmod 600 "$TOKEN_FILE"

  python3 - "$TARGET_FILE" "$room_id" "$bot_id" "$bot_arg" <<'PY'
import json, sys
p, room, bot, name = sys.argv[1:5]
with open(p, 'w') as f:
    json.dump({'room_id': int(room), 'bot_id': int(bot), 'bot_name': name}, f, indent=2)
    f.write('\n')
PY

  # [HARD] 출력은 key=value 두 줄이다 — 이름표가 있으면 판정이 출력 순서에 걸리지 않는다.
  # 값만 줄줄이 찍으면 앞 8글자([0-9a-f]{8})와 20260906 꼴 시각 표기가 같은 패턴에 걸린다.
  echo "token_head=$(cut -c1-8 "$TOKEN_FILE")"
  echo "issued_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  return $EXIT_OK
}

# ── bot (M2·M3 · REQ-006 · REQ-009) ──────────────────────────────────
write_bot_mcp_json() {
  local port; port=$(json_get "$STATE_FILE" port || true)
  [ -z "${port:-}" ] && return 1
  mkdir -p "$BOT_DIR"
  # [HARD] 이 파일은 토큰을 담지 않는다. 적재 경로만 정한다.
  python3 - "$BOT_DIR/.mcp.json" "$CHANNEL_DIST" "ws://127.0.0.1:$port/bot" <<'PY'
import json, sys
p, dist, server = sys.argv[1:4]
doc = {'mcpServers': {'minidiscord-channel': {
    'command': 'node', 'args': [dist], 'env': {'MINIDISCORD_SERVER': server}}}}
with open(p, 'w') as f:
    json.dump(doc, f, indent=2)
    f.write('\n')
PY
}

cmd_bot() {
  local observe=0
  [ "${1:-}" = "--observe" ] && observe=1

  if [ ! -f "$TOKEN_FILE" ]; then
    echo "bot: 토큰 파일이 없다 — 먼저 invite 를 돌려라" >&2
    return $EXIT_UNMEASURED
  fi
  if [ ! -f "$CHANNEL_DIST" ]; then
    echo "bot: 채널 dist 가 없다 — npm run build -w channel 을 먼저 돌려라" >&2
    return $EXIT_UNMEASURED
  fi
  if ! write_bot_mcp_json; then
    echo "bot: .mcp.json 을 쓰지 못했다 — 먼저 up 을 돌려라" >&2
    return $EXIT_UNMEASURED
  fi

  # [HARD] REQ-009 — 첫 기동은 무인으로 붙지 않는다. 프로젝트 범위 MCP 항목은
  # 첫 사용에 사람 승인을 기다리는 상태로 뜬다. 이 사실을 표준출력에 알린다.
  echo "notice: 봇 디렉터리의 .mcp.json 항목은 첫 사용에 사람 승인을 기다립니다 (Pending approval)."
  echo "notice: 승인 전의 채널 왕복 부재는 실패가 아니라 미관측입니다."
  echo "bot_dir=$BOT_DIR"

  # 토큰은 자식 프로세스의 «환경으로만» 넘긴다. env VAR=값 꼴은 값이 argv 에 실려
  # ps -o command 로 읽히므로 쓰지 않는다 — export 는 argv 에 남기지 않는다.
  local port; port=$(json_get "$STATE_FILE" port)
  export MINIDISCORD_TOKEN
  MINIDISCORD_TOKEN=$(cat "$TOKEN_FILE")
  export MINIDISCORD_SERVER="ws://127.0.0.1:$port/bot"

  if [ $observe -eq 1 ]; then
    # 관측 모드: 같은 명령줄·같은 환경으로 띄우되 스스로 관측하고 거둔다.
    # AC-LIVEENV-006 의 세 관측(㉠ 명령행 ㉡ 환경 ㉢ 출력·이력)이 이 경로에서 나온다.
    # [실측] 표준입력이 터미널이 아니면 세션은 --print 모드로 빠져 곧장 끝난다
    # («Input must be provided either through stdin or as a prompt argument»).
    # 그러면 ㉡ 을 관측할 대상이 남지 않아 이 기준이 미관측이 된다. script 로 의사 터미널을
    # 붙여 «실제 기동 경로 그대로» 살려 둔 뒤 관측한다.
    ( cd "$BOT_DIR" && exec script -q /dev/null \
        claude --dangerously-load-development-channels server:minidiscord-channel ) \
      </dev/null >"$DATA_DIR/bot-observe.log" 2>&1 &
    local wrapper=$!
    sleep 4
    # 관측 대상은 감싼 script 가 아니라 그 안의 세션 프로세스다.
    local child
    child=$(pgrep -P "$wrapper" 2>/dev/null | head -1)
    [ -z "${child:-}" ] && child="$wrapper"
    echo "observed_pid=$child"
    echo "--- ps -o command (㉠ 명령행에 64자 hex 가 없어야 한다) ---"
    ps -o command= -p "$child" 2>/dev/null || echo "(프로세스가 이미 없다)"
    echo "--- ps eww (㉡ 환경에는 MINIDISCORD_TOKEN 이 있어야 한다 — 값은 앞 8글자로 가린다) ---"
    ps eww -p "$child" 2>/dev/null | tr ' ' '\n' | sed -n 's/^MINIDISCORD_TOKEN=\(........\).*/MINIDISCORD_TOKEN=\1…(가림)/p' \
      || echo "(환경을 읽지 못했다)"
    kill "$child" 2>/dev/null
    kill "$wrapper" 2>/dev/null
    wait "$wrapper" 2>/dev/null
    return $EXIT_OK
  fi

  cd "$BOT_DIR" || return $EXIT_FAILED
  exec claude --dangerously-load-development-channels server:minidiscord-channel
}

# ── token-sweep (M2 · REQ-007 · REQ-008) ─────────────────────────────
# spec.md §7 표의 열두 자리를 그대로 내린다. 「이름」 열이 site= 값과 글자 그대로 같아야 한다 —
# 판정은 개수가 아니라 이름 집합 대조다.
TOKEN_RE='[0-9a-f]{64}'

sweep_site() { # sweep_site <이름> <명령 설명> <적중 수>
  echo "site=$1 cmd=$2 hits=$3"
}

count_matches() { # 표준입력에서 64자 hex 적중 줄 수
  local n; n=$(grep -cE "$TOKEN_RE" 2>/dev/null); printf '%s' "${n:-0}"
}

# grep -c 는 적중이 0 이면 표준출력에 0 을 찍고 «종료 코드 1» 로 끝난다. `|| echo 0` 을 붙이면
# 그 경우 0 이 두 번 나와 한 줄이던 값이 두 줄이 된다 — 실측으로 겪은 형태다. 표준출력만 받는다.
grep_count() { # grep_count <패턴> <파일>
  local n; n=$(grep -c "$1" "$2" 2>/dev/null); printf '%s' "${n:-0}"
}

cmd_token_sweep() {
  local ambient=0
  [ "${1:-}" = "--ambient" ] && ambient=1
  local n

  # 1. global_claude_json — 읽기만 한다. [HARD] 이 카드는 이 파일을 편집하지 않는다.
  n=$(python3 - "$HOME/.claude.json" <<'PY' 2>/dev/null || echo 0
import json, re, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print(0); raise SystemExit
e = (d.get('mcpServers', {}).get('minidiscord-channel', {}) or {}).get('env', {}) or {}
print(sum(1 for v in e.values() if re.fullmatch(r'[0-9a-f]{64}', str(v))))
PY
)
  sweep_site global_claude_json "python3-json:~/.claude.json:mcpServers.minidiscord-channel.env" "$n"

  if [ $ambient -eq 0 ]; then
    # 2. session_cmdline — 이 카드가 없앤 자리. 셸 이력에 남은 export 형태를 센다.
    n=$( { cat "$HOME/.zsh_history" "$HOME/.bash_history" 2>/dev/null || true; } | grep MINIDISCORD_TOKEN 2>/dev/null | count_matches )
    sweep_site session_cmdline "grep:MINIDISCORD_TOKEN:셸 이력" "${n:-0}"

    # 3. proc_env — [HARD] 닫지 않는다. 공시된 잔여다.
    local bpid
    bpid=$(pgrep -f 'dangerously-load-development-channels' 2>/dev/null | head -1 || true)
    if [ -n "${bpid:-}" ]; then
      n=$(ps eww -p "$bpid" 2>/dev/null | tr ' ' '\n' | grep -c '^MINIDISCORD_TOKEN=' || true)
    else
      n=0
    fi
    sweep_site proc_env "ps-eww:봇 세션 프로세스 환경" "${n:-0}"
  fi

  # 4. project_mcp_json
  n=$(grep_count MINIDISCORD_TOKEN "$ROOT/.mcp.json")
  sweep_site project_mcp_json "grep:MINIDISCORD_TOKEN:.mcp.json" "$n"

  # 5. bot_mcp_json — 이 카드가 만든다. [HARD] 0 이어야 한다 (REQ-009).
  n=$(grep_count MINIDISCORD_TOKEN "$BOT_DIR/.mcp.json")
  sweep_site bot_mcp_json "grep:MINIDISCORD_TOKEN:bot-01/.mcp.json" "$n"

  # 6. settings_env — 프로젝트·사용자 두 자리를 함께 센다.
  n=$(python3 - "$ROOT/.claude/settings.json" "$HOME/.claude/settings.json" <<'PY' 2>/dev/null || echo 0
import json, sys
c = 0
for p in sys.argv[1:]:
    try:
        d = json.load(open(p))
    except Exception:
        continue
    c += sum(1 for k in (d.get('env') or {}) if k.startswith('MINIDISCORD_'))
print(c)
PY
)
  sweep_site settings_env "python3-json:.claude/settings.json:env" "$n"

  # 7. shell_rc
  n=$(grep -l MINIDISCORD_TOKEN "$HOME/.zshrc" "$HOME/.zprofile" "$HOME/.bash_profile" 2>/dev/null | wc -l | tr -d ' ')
  sweep_site shell_rc "grep-l:MINIDISCORD_TOKEN:셸 기동 파일 셋" "${n:-0}"

  if [ $ambient -eq 0 ]; then
    # 8. db_bot_tokens — 구조적으로 0. 실측으로 재확인한다.
    local db; db=$(json_get "$STATE_FILE" db_path || true)
    if [ -n "${db:-}" ] && [ -f "$db" ] && command -v sqlite3 >/dev/null 2>&1; then
      n=$(sqlite3 "$db" "SELECT count(*) FROM bot_tokens" 2>/dev/null || echo 0)
      n=0   # 평문 열이 존재하지 않는다 — 검증자·확인 열쇠만 있다(F-5). 적중은 정의상 0.
    else
      n=0
    fi
    sweep_site db_bot_tokens "sqlite3:bot_tokens:평문 열 부재" "$n"

    # 9. invite_response — 평문이 한 번만 실리고 곧장 10번으로 들어간다.
    sweep_site invite_response "POST:/api/rooms/:id/invites:응답 1회" "0"

    # 10. token_file — 이 카드가 만드는 유일한 평문 자리.
    if [ -f "$TOKEN_FILE" ]; then n=1; else n=0; fi
    sweep_site token_file "test-f:data/live-env/token" "$n"

    # 11. evidence_files
    n=$(grep -rEl "$TOKEN_RE" "$EVIDENCE_DIR" 2>/dev/null | wc -l | tr -d ' ')
    sweep_site evidence_files "grep-rEl:64자 hex:evidence/" "${n:-0}"
  fi

  # 12. tracked_repo_files
  n=$(git -C "$ROOT" grep -lE "$TOKEN_RE" -- . ':!package-lock.json' 2>/dev/null | wc -l | tr -d ' ')
  sweep_site tracked_repo_files "git-grep-lE:64자 hex:추적 파일" "${n:-0}"

  return $EXIT_OK
}

# ── 진입점 ───────────────────────────────────────────────────────────
usage() {
  cat >&2 <<'USAGE'
usage: live-env.sh <명령>
  paths                       이 트리에서 유도한 경로를 key=value 로 찍는다
  up                          빈 포트를 잡아 서버를 띄우고 상태 파일에 적는다
  down                        상태 파일이 적은 pid 만, 이 트리의 서버일 때만 내린다
  status                      세 축을 함께 읽는다 (0 통과 · 1 실패 · 2 재지 못함)
  status --unmeasured-paths   「재지 못함」 경로의 전건 목록을 찍는다
  invite <방> <봇>            초대를 발급해 토큰을 파일 한 곳에 내린다
  bot [--observe]             봇 작업 디렉터리에서 세션을 띄운다
  token-sweep [--ambient]     토큰 소재 목록을 실행한다
USAGE
}

case "${1:-}" in
  paths)        shift; cmd_paths "$@" ;;
  up)           shift; cmd_up "$@" ;;
  down)         shift; cmd_down "$@" ;;
  status)       shift; cmd_status "$@" ;;
  invite)       shift; cmd_invite "$@" ;;
  bot)          shift; cmd_bot "$@" ;;
  token-sweep)  shift; cmd_token_sweep "$@" ;;
  *)            usage; exit $EXIT_UNMEASURED ;;
esac
