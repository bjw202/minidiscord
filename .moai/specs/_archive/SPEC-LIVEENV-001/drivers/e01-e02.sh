#!/usr/bin/env bash
# AC-LIVEENV-001 · AC-LIVEENV-002 의 증거를 만든다.
# 경로는 이 파일 위치가 아니라 git 트리에서 유도한다 — 상대 경로 깊이 실수를 원천에서 없앤다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
LE="$WT/scripts/live-env.sh"
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
mkdir -p "$EV"

# ── AC-LIVEENV-001 ───────────────────────────────────────────────────
E01="$EV/E01-tree-pin.txt"
{
  echo "# AC-LIVEENV-001 — 스크립트가 자기 트리에 고정된다"
  echo "# tree=$WT"
  echo "# head=$(git -C "$WT" rev-parse --short HEAD)"
  echo "# 호출 셸의 작업 디렉터리(실행 전): $(pwd -P)"
} > "$E01"

CWD_BEFORE=$(pwd -P)
echo '$ ( cd /tmp && "$WT/scripts/live-env.sh" paths )' >> "$E01"
( cd /tmp && "$LE" paths ) >> "$E01" 2>&1
# [HARD] 이 파일 안에서 ^[a-z_]+= 에 걸리는 줄은 paths 출력뿐이어야 한다 — 분모가 그것이기 때문이다.
# 드라이버가 적는 값 줄은 전부 '# ' 로 시작시킨다.
echo "# exit=$?" >> "$E01"
CWD_AFTER=$(pwd -P)

DEN=$(grep -cE '^[a-z_]+=' "$E01")
NUM=$(grep -cE "^[a-z_]+=$WT" "$E01")
OUTSIDE=$(grep -cE "^[a-z_]+=/Users/byunjungwon/Dev/my-project-04/minidiscord/scripts" "$E01")
{
  echo "# 호출 셸의 작업 디렉터리(실행 후): $CWD_AFTER"
  echo '$ grep -cE ''^[a-z_]+='' E01-tree-pin.txt   # 분모 — 출력된 경로 줄 수'
  echo "$DEN"
  echo '$ grep -cE "^[a-z_]+=$WT" E01-tree-pin.txt  # 분자 — 이 트리 아래인 줄 수'
  echo "$NUM"
  echo '$ grep -cE "^[a-z_]+=<기본 체크아웃>/scripts" E01-tree-pin.txt  # → 0'
  echo "$OUTSIDE"
  echo "# cwd_unchanged=$([ "$CWD_BEFORE" = "$CWD_AFTER" ] && echo yes || echo no)"
  # [HARD] 분모가 0 이면 분자도 0 이라 우연히 「같다」가 성립한다 — 그때는 통과가 아니라 미관측이다.
  if [ "$DEN" -eq 0 ]; then
    echo "VERDICT=UNMEASURED (분모가 0 — paths 가 아무 것도 찍지 못했다)"
  elif [ "$DEN" -eq "$NUM" ] && [ "$OUTSIDE" -eq 0 ] && [ "$CWD_BEFORE" = "$CWD_AFTER" ]; then
    echo "VERDICT=PASS (분모=$DEN 분자=$NUM 바깥=0 cwd 불변)"
  else
    echo "VERDICT=FAIL (분모=$DEN 분자=$NUM 바깥=$OUTSIDE)"
  fi
} >> "$E01"

# ── AC-LIVEENV-002 ───────────────────────────────────────────────────
E02="$EV/E02-lifecycle.txt"
STATE="$WT/data/live-env/state.json"
{
  echo "# AC-LIVEENV-002 — up/down 이 자기 프로세스만 다룬다"
  echo "# head=$(git -C "$WT" rev-parse --short HEAD)"
} > "$E02"

# 앞선 실행이 남아 있으면 먼저 내린다 (기준선을 「서버가 떠 있지 않다」로 맞춘다).
"$LE" down >/dev/null 2>&1 || true

{
  echo '$ scripts/live-env.sh up'
  "$LE" up 2>&1; echo "exit=$?"
  echo '$ cat data/live-env/state.json   # port·data_dir·bot_files_dir·pid·db_path'
  cat "$STATE" 2>&1
} >> "$E02"

PID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['pid'])" "$STATE" 2>/dev/null || echo "")
{
  echo '$ ps -p "$PID" -o pid,command'
  ps -p "$PID" -o pid,command 2>&1
} >> "$E02"

# ── [HARD] 양성 대조군: 남의 프로세스에는 신호를 보내지 않는다 ────────
# 상태 파일의 pid 를 «살아 있는 무관한 프로세스» 의 것으로 바꾼 뒤 down 을 부른다.
( cd /tmp && exec sleep 600 ) >/dev/null 2>&1 &
DECOY=$!
sleep 0.3
cp "$STATE" "$WT/data/live-env/state.json.real"
python3 - "$STATE" "$DECOY" <<'PY'
import json, sys
p, pid = sys.argv[1], int(sys.argv[2])
d = json.load(open(p)); d['pid'] = pid
json.dump(d, open(p, 'w'), indent=2)
PY
{
  echo ""
  echo "# --- 양성 대조군: 상태 파일의 pid 를 무관한 살아 있는 프로세스($DECOY)로 바꿨다 ---"
  echo '$ scripts/live-env.sh down'
  "$LE" down 2>&1; echo "exit=$?"
  echo '$ ps -p <decoy> -o pid,command   # 여전히 살아 있어야 한다'
  ps -p "$DECOY" -o pid,command 2>&1
  echo "decoy_alive=$(kill -0 "$DECOY" 2>/dev/null && echo yes || echo no)"
} >> "$E02"
kill "$DECOY" 2>/dev/null
mv "$WT/data/live-env/state.json.real" "$STATE"

{
  echo ""
  echo "# --- 본 실행: 상태 파일을 되돌린 뒤 down ---"
  echo '$ scripts/live-env.sh down'
  "$LE" down 2>&1; echo "exit=$?"
  echo '$ ps -p "$PID" >/dev/null; echo "after-down exit=$?"'
  ps -p "$PID" >/dev/null 2>&1; echo "after-down exit=$?"
} >> "$E02"

echo "E01/E02 작성 완료"
