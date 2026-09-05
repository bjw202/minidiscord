#!/usr/bin/env bash
# AC-LIVEENV-003 — status 가 응답 코드가 아니라 세 축으로 판정한다.
# 음성 대조군은 합성한 가짜가 아니라 실제로 일어났던 사고를 재현한다:
# 무관한 프로세스가 같은 포트를 잡은 상태(SPEC-LIVEVERIFY-001/progress.md:135).
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
LE="$WT/scripts/live-env.sh"
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
STATE="$WT/data/live-env/state.json"
mkdir -p "$EV"
E03="$EV/E03-status-axes.txt"

{
  echo "# AC-LIVEENV-003 — status 의 세 축"
  echo "# head=$(git -C "$WT" rev-parse --short HEAD)"
} > "$E03"

"$LE" down >/dev/null 2>&1 || true
"$LE" up >/dev/null 2>&1
"$LE" invite 1 pm >/dev/null 2>&1

PORT=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['port'])" "$STATE")

{
  echo ""
  echo "# --- ㉠ 통과 실행: 서버가 떠 있고 방·봇·초대가 세워진 상태 ---"
  echo '$ scripts/live-env.sh status'
  "$LE" status 2>&1; echo "exit=$?"
} >> "$E03"

# ── [HARD] 음성 대조군 — 실제 사고의 재현 ───────────────────────────
cp "$STATE" "$STATE.keep"
"$LE" down >/dev/null 2>&1
cp "$STATE.keep" "$STATE"
rm -f "$STATE.keep"

( cd /tmp && exec python3 -m http.server "$PORT" --bind 127.0.0.1 ) >/dev/null 2>&1 &
THIEF=$!
sleep 1

{
  echo ""
  echo "# --- ㉡ 음성 대조군: 서버를 내리고 같은 포트($PORT)를 무관한 프로세스($THIEF)가 잡았다 ---"
  echo '$ ( cd /tmp && python3 -m http.server <포트> --bind 127.0.0.1 ) &'
  echo '$ scripts/live-env.sh status'
  "$LE" status 2>&1
  NEG=$?
  echo "exit=$NEG"
  if [ "$NEG" -eq 0 ]; then
    echo "VERDICT=FAIL (음성 대조군이 통과를 냈다 — 응답 코드 판정으로 되돌아간 것이다)"
  else
    echo "VERDICT=PASS (음성 대조군이 $NEG 를 냈다 — 통과가 아니다)"
  fi
} >> "$E03"

kill "$THIEF" 2>/dev/null
wait "$THIEF" 2>/dev/null
sleep 0.5
{
  echo '$ kill <대조군>; ps -p <대조군> >/dev/null; echo "exit=$?"'
  ps -p "$THIEF" >/dev/null 2>&1; echo "대조군 종료 확인 exit=$?"
} >> "$E03"

echo "E03 작성 완료"
