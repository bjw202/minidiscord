#!/usr/bin/env bash
# AC-LIVEENV-004 — 「재지 못함」이 「통과」와 다른 값으로 나온다.
#
# [HARD] 분모는 이 문서가 손으로 고른 표본이 아니라 스크립트가 스스로 찍은 전건 목록이다.
# `status --unmeasured-paths` 의 줄 수를 N 이라 하면 이 파일은 N 건의 실행을 담아야 한다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
LE="$WT/scripts/live-env.sh"
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
D="$WT/data/live-env"
STATE="$D/state.json"
TARGET="$D/target.json"
SCRATCH="$D/e04"
mkdir -p "$EV" "$SCRATCH"
cd "$WT" || exit 1
E04="$EV/E04-tristate.txt"

# 도구 하나를 뺀 PATH 를 만든다 — «도구 부재» 를 진짜로 성립시키는 유일한 방법이다.
# PATH 에서 골라 뺄 수는 없으므로, 필요한 것만 심볼릭 링크로 모은 디렉터리를 만든다.
TOOLS="git python3 curl lsof sqlite3 grep sed head cat ps pgrep wc tr mkdir rm chmod sleep date cut env sh bash dirname basename kill"
mkstub() { # mkstub <제외할 도구...>
  local dir="$SCRATCH/stub-$$-$RANDOM"
  mkdir -p "$dir"
  local t skip
  for t in $TOOLS; do
    skip=0
    for x in "$@"; do [ "$t" = "$x" ] && skip=1; done
    [ $skip -eq 1 ] && continue
    local src; src=$(command -v "$t" 2>/dev/null) || continue
    ln -sf "$src" "$dir/$t"
  done
  echo "$dir"
}

RUN=0
record() { # record <경로 이름> <성립 방법 한 줄> ; 표준입력으로 실행 출력을 받는다
  RUN=$((RUN + 1))
  { echo ""
    echo "## 실행 $RUN — $1"
    echo "# 성립: $2"
  } >> "$E04"
}

{
  echo "# AC-LIVEENV-004 — 「재지 못함」이 「통과」와 다른 값으로 나온다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo ""
  echo '$ scripts/live-env.sh status --unmeasured-paths   # 분모 N'
  "$LE" status --unmeasured-paths
  echo "# N=$("$LE" status --unmeasured-paths | wc -l | tr -d ' ')"
} > "$E04"
N=$("$LE" status --unmeasured-paths | wc -l | tr -d ' ')

# ── 양성 기준선: 세 축이 모두 서면 0 이다 ────────────────────────────
"$LE" down >/dev/null 2>&1 || true
"$LE" up   >/dev/null 2>&1
"$LE" invite 1 pm >/dev/null 2>&1
{
  echo ""
  echo "## 양성 기준선 — 세 축이 모두 measured=yes 이면 0 이다"
  echo '$ scripts/live-env.sh status'
  "$LE" status 2>&1; echo "exit=$?"
} >> "$E04"
cp "$STATE" "$SCRATCH/state.good"
cp "$TARGET" "$SCRATCH/target.good"
GOOD_PORT=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['port'])" "$STATE")

restore() { cp "$SCRATCH/state.good" "$STATE"; cp "$SCRATCH/target.good" "$TARGET"; }

# ── 1. listen_tool_absent ────────────────────────────────────────────
STUB=$(mkstub lsof)
record listen_tool_absent "PATH 를 lsof 가 없는 디렉터리 하나로 좁혔다"
{ echo '$ PATH=<lsof 없는 stub> scripts/live-env.sh status'
  PATH="$STUB" "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"

# ── 2. listen_no_listener ────────────────────────────────────────────
python3 - "$STATE" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d['port'] = 1   # 아무도 LISTEN 하지 않는 포트
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
record listen_no_listener "상태 파일의 포트를 아무도 LISTEN 하지 않는 값(1)으로 바꿨다"
{ echo '$ scripts/live-env.sh status'; "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"
restore

# ── 3. listen_cwd_unreadable (부분 측정) ─────────────────────────────
STUB3=$(mkstub lsof)
cat > "$STUB3/lsof" <<PY
#!/usr/bin/env python3
# lsof 대역 — LISTEN pid 는 돌려주되 «cwd 는 읽지 못한다». 도구는 있고 값을 못 얻는 상태다.
import sys, subprocess
a = sys.argv[1:]
if '-d' in a and 'cwd' in a:
    sys.exit(1)
sys.exit(subprocess.call(['$(command -v lsof)'] + a))
PY
chmod +x "$STUB3/lsof"
record listen_cwd_unreadable "lsof 대역이 LISTEN pid 는 주되 cwd 질의에는 실패한다 (부분 측정)"
{ echo '$ PATH=<cwd 를 못 읽는 lsof 대역> scripts/live-env.sh status'
  PATH="$STUB3" "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"

# ── 4. e1_port_taken_before_bind ─────────────────────────────────────
cp "$SCRATCH/state.good" "$STATE"
"$LE" down >/dev/null 2>&1
cp "$SCRATCH/state.good" "$STATE"
( cd /tmp && exec python3 -m http.server "$GOOD_PORT" --bind 127.0.0.1 ) >/dev/null 2>&1 &
THIEF=$!
sleep 1
record e1_port_taken_before_bind "서버를 내리고 같은 포트를 무관한 프로세스가 잡게 했다 (엣지 E-1)"
{ echo '$ scripts/live-env.sh status'; "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"
kill "$THIEF" 2>/dev/null; wait "$THIEF" 2>/dev/null
"$LE" up >/dev/null 2>&1
"$LE" invite 1 pm >/dev/null 2>&1
cp "$STATE" "$SCRATCH/state.good"; cp "$TARGET" "$SCRATCH/target.good"

# ── 5. db_tool_absent ────────────────────────────────────────────────
STUB5=$(mkstub sqlite3)
record db_tool_absent "PATH 를 sqlite3 가 없는 디렉터리 하나로 좁혔다"
{ echo '$ PATH=<sqlite3 없는 stub> scripts/live-env.sh status'
  PATH="$STUB5" "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"

# ── 6. db_file_absent ────────────────────────────────────────────────
python3 - "$STATE" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d['db_path'] = '/nonexistent/live-env/absent.db'
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
record db_file_absent "상태 파일의 DB 경로를 존재하지 않는 경로로 바꿨다"
{ echo '$ scripts/live-env.sh status'; "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"
restore

# ── 7. db_table_absent (부분 측정) ───────────────────────────────────
EMPTYDB="$SCRATCH/no-messages.db"
rm -f "$EMPTYDB"
sqlite3 "$EMPTYDB" "CREATE TABLE other (id INTEGER);" >/dev/null 2>&1
python3 - "$STATE" "$EMPTYDB" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d['db_path'] = sys.argv[2]
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
record db_table_absent "DB 파일은 있으나 대상 테이블이 없는 파일로 바꿨다 (부분 측정)"
{ echo '$ scripts/live-env.sh status'; "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"
restore

# ── 8. principal_state_incomplete ────────────────────────────────────
mv "$TARGET" "$SCRATCH/target.away"
record principal_state_incomplete "방·봇을 적은 대상 파일을 치웠다"
{ echo '$ scripts/live-env.sh status'; "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"
mv "$SCRATCH/target.away" "$TARGET"

# ── 9. principal_api_unreachable ─────────────────────────────────────
python3 - "$TARGET" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d['room_id'] = 999999   # 없는 방 → 404
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
record principal_api_unreachable "대상 방을 존재하지 않는 방으로 바꿔 초대 목록 조회가 실패하게 했다"
{ echo '$ scripts/live-env.sh status'; "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"
restore

# ── 10. principal_api_empty (부분 측정) ──────────────────────────────
python3 - "$TARGET" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d['bot_id'] = 999999   # 200 이되 그 봇이 목록에 없다
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
record principal_api_empty "초대 목록은 200 으로 오되 그 봇이 실리지 않게 했다 (부분 측정)"
{ echo '$ scripts/live-env.sh status'; "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"
restore

# ── 11. principal_conn_unreadable (부분 측정) ────────────────────────
record principal_conn_unreadable "lsof 가 없어 api 면은 읽히되 접속 면을 얻지 못한다 (부분 측정 · 같은 실행에서 listen_tool_absent 도 함께 신고된다)"
{ echo '$ PATH=<lsof 없는 stub> scripts/live-env.sh status'
  PATH="$STUB" "$LE" status 2>&1; echo "exit=$?"; } >> "$E04"

# ── 12~15. 추출기·캡처 단계의 미측정 경로 ────────────────────────────
OUT="$SCRATCH/extract-out"
TDIR="$SCRATCH/transcripts"
GLOBAL_COPY="$SCRATCH/global-copy.json"
mkdir -p "$OUT" "$TDIR"
cp "$HOME/.claude.json" "$GLOBAL_COPY" 2>/dev/null || echo '{"mcpServers":{}}' > "$GLOBAL_COPY"

# 12. e2_approval_pending — 승인 전에는 채널 도구 왕복 짝이 생기지 않는다
rm -f "$TDIR"/*.jsonl
printf '%s\n' '{"type":"user","sessionId":"aaa","cwd":"/tmp/bot-01","message":{"role":"user","content":[{"type":"text","text":"승인 대기 중"}]}}' > "$TDIR/one.jsonl"
record e2_approval_pending "대화 기록에 채널 도구 왕복 짝이 없는 상태로 추출기를 돌렸다 (엣지 E-2)"
{ echo '$ npx tsx scripts/live-extract.mts extract --transcript-dir <후보 1개, 왕복 0건>'
  npx tsx scripts/live-extract.mts extract --out "$OUT" --db "$D/minidiscord.db" \
    --transcript-dir "$TDIR" --global-config "$GLOBAL_COPY" 2>&1; echo "exit=$?"; } >> "$E04"

# 13. e3_transcript_candidates_multiple
printf '%s\n' '{"type":"user","sessionId":"bbb","cwd":"/tmp/bot-01","message":{"role":"user","content":[{"type":"text","text":"이전 세션"}]}}' > "$TDIR/two.jsonl"
record e3_transcript_candidates_multiple "대화 기록 후보를 둘로 만들었다 — 세션 하나당 파일 하나 전제가 깨졌다 (엣지 E-3)"
{ echo '$ npx tsx scripts/live-extract.mts extract --transcript-dir <후보 2개>'
  npx tsx scripts/live-extract.mts extract --out "$OUT" --db "$D/minidiscord.db" \
    --transcript-dir "$TDIR" --global-config "$GLOBAL_COPY" 2>&1; echo "exit=$?"; } >> "$E04"
rm -f "$TDIR/two.jsonl"

# 14. e5_global_entry_changed — [HARD] 원본을 편집하지 않는다. 사본만 건드린다
python3 - "$GLOBAL_COPY" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d.setdefault('mcpServers', {})['minidiscord-channel'] = {'command': 'node', 'args': ['/before/path'], 'env': {}}
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
# [실측] 두 읽기 사이의 창을 «실제로 있는 작업» 으로 연다 — 경주를 없앤다.
# 1회차: 고정 sleep 0.15 → 못 맞춤. 2회차: 큰 DB → 추출 전체가 0.32초라 여전히 못 맞춤(실측).
# 3회차: 두 읽기 사이에 놓인 작업은 «대화 기록 파싱» 이므로, 큰 jsonl 을 읽게 해 그 구간을
# 초 단위로 벌린다. 파일 크기는 창을 열어 두는 수단일 뿐 판정 대상이 아니다.
BIGT="$SCRATCH/big-transcript"
rm -rf "$BIGT"; mkdir -p "$BIGT"
python3 - "$BIGT/one.jsonl" <<'PY2'
import json, sys
rec = {"type": "user", "sessionId": "aaa", "cwd": "/tmp/bot-01",
       "message": {"role": "user", "content": [{"type": "text", "text": "승인 대기 중 " + "x" * 120}]}}
line = json.dumps(rec, ensure_ascii=False) + "\n"
with open(sys.argv[1], "w") as f:
    for _ in range(400000):
        f.write(line)
PY2

# before 값을 명시적으로 심는다 — 대조가 무엇과 무엇 사이인지 분명해진다.
python3 - "$GLOBAL_COPY" <<'PY3'
import json, sys
d = json.load(open(sys.argv[1]))
d.setdefault('mcpServers', {})['minidiscord-channel'] = {'command': 'node', 'args': ['/before/path'], 'env': {}}
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY3

# 바꿔 넣을 내용을 미리 파일로 만들어 둔다 — 창 안에서는 cp 한 번만 한다.
python3 - "$GLOBAL_COPY" "$SCRATCH/global-after.json" <<'PY2'
import json, sys
d = json.load(open(sys.argv[1]))
d['mcpServers']['minidiscord-channel']['args'] = ['/after/path']
json.dump(d, open(sys.argv[2], 'w'), indent=2)
PY2

# [실측] 이 실행의 창은 대략 0.25~0.95초다(추출 전체 0.96초 — 시간 측정으로 확인).
# 1초는 창 «뒤» 라 못 맞췄다. 0.5초는 창 한가운데다.
( sleep 0.5; cp "$SCRATCH/global-after.json" "$GLOBAL_COPY" ) &
CHANGER=$!
record e5_global_entry_changed "추출기가 큰 대화 기록을 파싱하는 동안 전역 항목 «사본» 의 args[0] 을 바꿨다 (엣지 E-5 · 원본은 건드리지 않는다)"
{ echo '$ npx tsx scripts/live-extract.mts extract --transcript-dir <큰 jsonl> --global-config <실행 중 내용이 바뀌는 사본>'
  npx tsx scripts/live-extract.mts extract --out "$OUT" --db "$D/minidiscord.db" \
    --transcript-dir "$BIGT" --global-config "$GLOBAL_COPY" 2>&1; echo "exit=$?"
  echo "# extract-notes.txt:"; cat "$OUT/extract-notes.txt" 2>/dev/null; } >> "$E04"
wait "$CHANGER" 2>/dev/null

# 15. capture_playwright_absent
record capture_playwright_absent "PLAYWRIGHT_BROWSERS_PATH 를 빈 디렉터리로 지정해 캡처 단계를 돌렸다"
{ echo '$ PLAYWRIGHT_BROWSERS_PATH=<빈 경로> npx tsx scripts/live-extract.mts capture'
  PLAYWRIGHT_BROWSERS_PATH="$SCRATCH/no-browsers" \
    npx tsx scripts/live-extract.mts capture --out "$OUT" 2>&1; echo "exit=$?"; } >> "$E04"

# ── 판정 ─────────────────────────────────────────────────────────────
{
  echo ""
  echo "## 판정"
  echo "# 분모 N = $N"
  echo "# 실행 건수 = $RUN"
  echo "# 모든 실행의 종료 코드가 2 인가 (0 이나 1 이 하나라도 있으면 실패):"
  grep -c '^exit=2$' "$E04"
  echo "# exit=0 인 실행 수 (양성 기준선 1건만 허용):"
  grep -c '^exit=0$' "$E04"
  echo "# exit=1 인 실행 수 (0 이어야 한다 — 1 은 「쟀고 틀렸다」라 사실을 잘못 말한다):"
  grep -c '^exit=1$' "$E04"
  if [ "$RUN" -lt "$N" ]; then
    echo "VERDICT=UNMEASURED (실행 $RUN 건 < 분모 $N)"
  else
    echo "VERDICT=실행 건수는 분모를 채웠다 — 종료 코드 계수를 함께 읽을 것"
  fi
} >> "$E04"

"$LE" down >/dev/null 2>&1 || true
rm -rf "$SCRATCH"/stub-*
echo "E04 작성 완료 (N=$N, 실행 $RUN)"
