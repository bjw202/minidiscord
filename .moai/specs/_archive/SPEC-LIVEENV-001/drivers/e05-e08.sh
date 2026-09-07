#!/usr/bin/env bash
# AC-LIVEENV-005 ~ AC-LIVEENV-008 의 증거를 만든다 (M2).
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
LE="$WT/scripts/live-env.sh"
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
TMP="${TMPDIR:-/private/tmp/}le-driver"
mkdir -p "$EV" "$TMP"
cd "$WT" || exit 1

"$LE" down >/dev/null 2>&1 || true
"$LE" up >/dev/null 2>&1

# ── AC-LIVEENV-005 ───────────────────────────────────────────────────
E05="$EV/E05-token-file.txt"
{
  echo "# AC-LIVEENV-005 — 토큰이 파일 한 곳에만 놓이고 그 파일은 커밋되지 않는다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo '$ scripts/live-env.sh invite 1 pm'
} > "$E05"
"$LE" invite 1 pm >> "$E05" 2>&1
echo "# exit=$?" >> "$E05"

{
  echo '$ grep -cE ''[0-9a-f]{64}'' E05-token-file.txt   # → 0'
  grep -cE '[0-9a-f]{64}' "$E05"
  echo '$ stat -f ''%Lp'' data/live-env/token            # → 600'
  stat -f '%Lp' data/live-env/token 2>&1
  echo '$ git check-ignore -v data/live-env/token'
  git check-ignore -v data/live-env/token 2>&1; echo "# exit=$?"
} >> "$E05"

# ㉣ 양성 대조군 — 이름표로 고르고 앞 8글자끼리만 맞댄다. 위치로 고르지 않는다.
cut -c1-8 data/live-env/token > "$TMP/le-head-file"
sed -n 's/^token_head=//p' "$E05" > "$TMP/le-head-out"
{
  echo '$ cut -c1-8 data/live-env/token > le-head-file'
  echo '$ sed -n ''s/^token_head=//p'' E05-token-file.txt > le-head-out'
  echo '$ test "$(wc -l < le-head-out)" -eq 1; echo "head-lines exit=$?"'
  test "$(wc -l < "$TMP/le-head-out")" -eq 1; echo "head-lines exit=$?"
  echo '$ diff le-head-file le-head-out; echo "exit=$?"'
  diff "$TMP/le-head-file" "$TMP/le-head-out" 2>&1; echo "# diff exit=$?"
  echo '$ git check-ignore -v bot-01/.mcp.json'
  git check-ignore -v bot-01/.mcp.json 2>&1; echo "# exit=$?"
} >> "$E05"
rm -f "$TMP/le-head-file" "$TMP/le-head-out"

# ── AC-LIVEENV-006 ───────────────────────────────────────────────────
E06="$EV/E06-bot-launch.txt"
HIST_BEFORE=$( { cat "$HOME/.zsh_history" "$HOME/.bash_history" 2>/dev/null || true; } | grep -cE '[0-9a-f]{64}' || true)
{
  echo "# AC-LIVEENV-006 — 세션 실행이 토큰을 명령행·이력·표준출력에 남기지 않는다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo "# 셸 이력의 64자 hex 줄 수 (실행 전): $HIST_BEFORE"
  echo "# [실측 · 미결] 이 값은 이 카드 이전부터 0 이 아니다 — t32 시절의 export 줄이 남아 있다."
  echo "#   따라서 ㉢ 을 «이력에 64자 hex 가 0» 으로 읽으면 기준선에서 이미 거짓이다."
  echo "#   이 파일은 절대값과 «이 실행이 만든 증분» 을 함께 남긴다. 처분은 리드의 몫이다."
  echo '$ scripts/live-env.sh bot --observe'
} > "$E06"
"$LE" bot --observe >> "$E06" 2>&1
echo "# exit=$?" >> "$E06"

HIST_AFTER=$( { cat "$HOME/.zsh_history" "$HOME/.bash_history" 2>/dev/null || true; } | grep -cE '[0-9a-f]{64}' || true)
{
  echo "# 셸 이력의 64자 hex 줄 수 (실행 후): $HIST_AFTER"
  echo "# 이 실행이 만든 증분: $((HIST_AFTER - HIST_BEFORE))"
  echo '$ grep -cE ''[0-9a-f]{64}'' E06-bot-launch.txt   # 실행 출력의 전문 노출 → 0'
  grep -cE '[0-9a-f]{64}' "$E06"
} >> "$E06"

# ── AC-LIVEENV-007 ───────────────────────────────────────────────────
E07="$EV/E07-inventory.txt"
{
  echo "# AC-LIVEENV-007 — 토큰 소재 목록이 전건이고 실행된다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo '$ scripts/live-env.sh token-sweep'
} > "$E07"
"$LE" token-sweep >> "$E07" 2>&1

SWEEP_N=$(grep -c '^site=' "$E07")
TABLE_N=$(awk '/^## 7\. 토큰 소재 목록/,/^## 8\./' .moai/specs/SPEC-LIVEENV-001/spec.md | grep -cE '^\| [0-9]+ \|')
sed -n 's/^site=\([a-z_]*\).*/\1/p' "$E07" | sort -u > "$TMP/le-sites-sweep"
awk '/^## 7\. 토큰 소재 목록/,/^## 8\./' .moai/specs/SPEC-LIVEENV-001/spec.md \
  | sed -n 's/^| [0-9]\{1,\} | `\([a-z_]*\)` |.*/\1/p' | sort -u > "$TMP/le-sites-table"
DIFF_LINES=$(comm -3 "$TMP/le-sites-sweep" "$TMP/le-sites-table" | tee "$TMP/le-sites-diff" | wc -l | tr -d ' ')
{
  echo "# ① 개수 — 진단용"
  echo "# 훑기의 site= 줄 수: $SWEEP_N"
  echo "# spec.md §7 표의 행 수: $TABLE_N"
  echo "# ② 이름 집합 — 판정. comm -3 출력이 비어야 통과다"
  cat "$TMP/le-sites-diff"
  echo "# comm -3 출력 줄 수: $DIFF_LINES"
  if [ "$DIFF_LINES" -eq 0 ]; then echo "VERDICT=PASS (이름 집합이 같다)"; else echo "VERDICT=FAIL (이름 집합이 갈렸다)"; fi
} >> "$E07"
rm -f "$TMP/le-sites-sweep" "$TMP/le-sites-table" "$TMP/le-sites-diff"

# ── AC-LIVEENV-008 ───────────────────────────────────────────────────
E08="$EV/E08-ambient-sweep.txt"
GLOBAL="$HOME/.claude.json"
MT_BEFORE=$(stat -f %m "$GLOBAL" 2>/dev/null || echo "-")
{
  echo "# AC-LIVEENV-008 — 상시 소재의 평문 토큰이 0건이다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo "# ~/.claude.json 수정 시각 (실행 전): $MT_BEFORE"
  echo '$ scripts/live-env.sh token-sweep --ambient'
} > "$E08"
"$LE" token-sweep --ambient >> "$E08" 2>&1
{
  echo '$ scripts/live-env.sh status   # 양성 대조군 — 그 시각의 principal 줄'
  "$LE" status 2>&1 | grep '^principal='
  echo "# ~/.claude.json 수정 시각 (실행 후): $(stat -f %m "$GLOBAL" 2>/dev/null || echo '-')"
  echo "# 두 값이 같으면 이 카드가 그 파일을 편집하지 않았다는 뜻이다."
  echo "# [실측 · 미결] tracked_repo_files 의 적중은 이 카드 이전부터 0 이 아니다 —"
  echo "#   전부 정당한 SHA-256(매니페스트·검증 증거·변이 기록)이며 토큰이 아니다."
} >> "$E08"

echo "E05~E08 작성 완료"
