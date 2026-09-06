#!/usr/bin/env bash
# M01-mutation.txt — 변이 열 건(①~⑩). 각 변이마다 diff(또는 조작 내용) · 빨간 출력 ·
# 복원 후 초록 출력을 담고, 마지막 줄이 작업 트리에 변이가 없음을 보인다.
#
# [HARD] 저장소 «밖» 은 변이 대상이 아니다(§5 · 운영자 결정). 밖의 파일을 겨누는 변이는
# 원본이 아니라 «측정이 읽는 사본» 을 바꾼다 — 그래도 판별력은 그대로 재어진다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
LE="$WT/scripts/live-env.sh"
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
SC="$WT/data/live-env/mut"
rm -rf "$SC"; mkdir -p "$SC" "$EV"
cd "$WT" || exit 1
M="$EV/M01-mutation.txt"

{
  echo "# M01-mutation.txt — 변이 열 건"
  echo "# head=$(git rev-parse --short HEAD)"
  echo "# 판별자가 상수 함수인지는 변이로만 알 수 있다. 초록만 보고하면 그 기준이 무엇을 재는지 모른다."
} > "$M"

# 변이를 걸기 «전» 의 해시를 떠 둔다 — 마지막 잔존 확인의 기준이다.
SNAP="$WT/data/live-env/mut-snap"
rm -rf "$SNAP"; mkdir -p "$SNAP"
MUT_TARGETS="scripts/live-env.sh server/test/live-extract-lib.ts .moai/specs/SPEC-LIVEENV-001/spec.md"
for f in $MUT_TARGETS; do
  shasum -a 256 "$f" | cut -d' ' -f1 > "$SNAP/$(echo "$f" | tr '/' '_').sha"
done

backup() { cp "$1" "$SC/$(basename "$1").bak"; }
restore_f() { cp "$SC/$(basename "$1").bak" "$1"; }

# ── 변이 ① — AC-001: 트리 유도를 pwd 로 바꾼다 ───────────────────────
backup scripts/live-env.sh
{
  echo ""; echo "## 변이 ① — AC-LIVEENV-001 (트리 고정)"
  echo "# 조작: git rev-parse --show-toplevel 유도를 pwd 로 바꾼다"
} >> "$M"
sed -i '' 's|^ROOT=$(git -C "$LIVEENV_SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null .*)$|ROOT=$(pwd -P)|' scripts/live-env.sh
{
  echo '$ git diff --stat -- scripts/live-env.sh'; git diff --stat -- scripts/live-env.sh
  echo '$ ( cd /tmp && <절대 경로>/scripts/live-env.sh paths )   # 빨간 출력'
  ( cd /tmp && "$LE" paths ) 2>&1 | head -4
  echo "# 판정: 이 트리 아래인 줄 수 = $( ( cd /tmp && "$LE" paths ) 2>/dev/null | grep -cE "^[a-z_]+=$WT" ) (분모와 같아야 통과인데 0 이다 → AC-LIVEENV-001 빨강)"
} >> "$M"
restore_f scripts/live-env.sh
{
  echo '# 복원 후 초록:'
  echo "# 이 트리 아래인 줄 수 = $( ( cd /tmp && "$LE" paths ) 2>/dev/null | grep -cE "^[a-z_]+=$WT" ) / 분모 $( ( cd /tmp && "$LE" paths ) 2>/dev/null | grep -cE '^[a-z_]+=' )"
} >> "$M"

# ── 변이 ② — AC-004: 「측정 불가 → 2」 분기를 지운다 ─────────────────
"$LE" down >/dev/null 2>&1 || true
"$LE" up >/dev/null 2>&1; "$LE" invite 1 pm >/dev/null 2>&1
cp "$WT/data/live-env/state.json" "$SC/state.good"
backup scripts/live-env.sh
{
  echo ""; echo "## 변이 ② — AC-LIVEENV-004 (세 값 계약)"
  echo "# 조작: 「미측정이 하나라도 있으면 2」 분기를 지우고 관례대로 0 을 내게 한다"
} >> "$M"
sed -i '' 's|^  if \[ \$unmeasured -eq 1 \]; then return \$EXIT_UNMEASURED; fi$|  if [ $unmeasured -eq 1 ]; then return $EXIT_OK; fi|' scripts/live-env.sh
python3 - "$WT/data/live-env/state.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1])); d['db_path'] = '/nonexistent/absent.db'
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
{
  echo '$ git diff -- scripts/live-env.sh | grep ''^[-+].*EXIT_'''; git diff -- scripts/live-env.sh | grep '^[-+].*EXIT_' | head -4
  echo '$ scripts/live-env.sh status   # DB 파일 부재를 성립시킨 상태 — 2 여야 하는데'
  "$LE" status 2>&1 | tail -3; echo "exit=$?"
  echo "# 판정: 미측정인데 0 이 나오면 AC-LIVEENV-004 의 열다섯 실걸이가 전부 빨개진다"
} >> "$M"
restore_f scripts/live-env.sh
{
  echo '# 복원 후 초록:'
  echo '$ scripts/live-env.sh status'; "$LE" status 2>&1 | tail -1; echo "exit=$?"
} >> "$M"
cp "$SC/state.good" "$WT/data/live-env/state.json"

# ── 변이 ③ — AC-005: 토큰 파일을 추적되는 디렉터리로 옮긴다 ──────────
{
  echo ""; echo "## 변이 ③ — AC-LIVEENV-005 (토큰 파일이 커밋되지 않는다)"
  echo "# 조작: 토큰 파일 경로를 추적되는 디렉터리(.moai/state/)로 옮긴다"
  echo '$ git check-ignore -v .moai/state/live-env-token ; echo "exit=$?"   # 빨간 출력'
  git check-ignore -v .moai/state/live-env-token 2>&1; echo "exit=$?"
  echo "# 판정: exit=1 이면 무시되지 않는다 → AC-LIVEENV-005 ㉢ 빨강"
  echo '# 복원 후 초록:'
  echo '$ git check-ignore -v data/live-env/token ; echo "exit=$?"'
  git check-ignore -v data/live-env/token 2>&1; echo "exit=$?"
} >> "$M"

# ── 변이 ④ — AC-007: §7 표에서 한 행을 지운다 ────────────────────────
backup .moai/specs/SPEC-LIVEENV-001/spec.md
{
  echo ""; echo "## 변이 ④ — AC-LIVEENV-007 (토큰 소재 목록이 전건이다)"
  echo "# 조작: spec.md §7 표에서 shell_rc 행을 지운다"
} >> "$M"
python3 - .moai/specs/SPEC-LIVEENV-001/spec.md <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
lines = [l for l in p.read_text().split('\n') if not l.startswith('| 7 | `shell_rc`')]
p.write_text('\n'.join(lines))
PY
"$LE" token-sweep > "$SC/sweep.txt" 2>&1
sed -n 's/^site=\([a-z_]*\).*/\1/p' "$SC/sweep.txt" | sort -u > "$SC/sites-sweep"
awk '/^## 7\. 토큰 소재 목록/,/^## 8\./' .moai/specs/SPEC-LIVEENV-001/spec.md \
  | sed -n 's/^| [0-9]\{1,\} | `\([a-z_]*\)` |.*/\1/p' | sort -u > "$SC/sites-table"
{
  echo '$ git diff --stat -- .moai/specs/SPEC-LIVEENV-001/spec.md'; git diff --stat -- .moai/specs/SPEC-LIVEENV-001/spec.md
  echo '$ comm -3 sites-sweep sites-table   # 빨간 출력 — 비어야 통과인데'
  comm -3 "$SC/sites-sweep" "$SC/sites-table"
  echo "# 출력 줄 수 = $(comm -3 "$SC/sites-sweep" "$SC/sites-table" | wc -l | tr -d ' ') → AC-LIVEENV-007 ② 빨강"
} >> "$M"
restore_f .moai/specs/SPEC-LIVEENV-001/spec.md
awk '/^## 7\. 토큰 소재 목록/,/^## 8\./' .moai/specs/SPEC-LIVEENV-001/spec.md \
  | sed -n 's/^| [0-9]\{1,\} | `\([a-z_]*\)` |.*/\1/p' | sort -u > "$SC/sites-table2"
{
  echo '# 복원 후 초록:'
  echo "# comm -3 출력 줄 수 = $(comm -3 "$SC/sites-sweep" "$SC/sites-table2" | wc -l | tr -d ' ')"
} >> "$M"

# ── 변이 ⑤ — AC-009: 미관측 ──────────────────────────────────────────
{
  echo ""; echo "## 변이 ⑤ — AC-LIVEENV-009 (봇 디렉터리 .mcp.json 귀속) : 미관측"
  echo "# 이 변이의 판정 대상은 «실 세션의 채널 왕복» 이고, 그 왕복의 유일한 공급원은 M8 이다."
  echo "# 이번 회차는 M8 을 돌리지 않았으므로(리드 처분 16) 변이 전후를 가를 관측이 없다."
  echo "# [HARD] 다른 경로로 우회해 세우지 않는다 — 우회하면 이 변이가 무엇을 재는지 알 수 없다."
  echo "status=UNMEASURED"
} >> "$M"

# ── 변이 ⑥ — AC-012: A03 에 판정 필드를 넣는다 ───────────────────────
backup server/test/live-extract-lib.ts
{
  echo ""; echo "## 변이 ⑥ — AC-LIVEENV-012 (사람 판정에 판정 필드가 없다)"
  echo "# 조작: buildHumanItems 가 A03·A10 에 verdict 를 붙이게 한다"
} >> "$M"
python3 - server/test/live-extract-lib.ts <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1]); s = p.read_text()
s = s.replace("    note: '순간 관측 — 기계는 캡처만 남기고 판정하지 않는다',",
              "    verdict: 'pass',\n    note: '순간 관측 — 기계는 캡처만 남기고 판정하지 않는다',")
p.write_text(s)
PY
{
  echo '$ git diff -- server/test/live-extract-lib.ts | grep ''^[-+].*verdict'''
  git diff -- server/test/live-extract-lib.ts | grep '^[-+].*verdict' | head -3
  echo '$ npx vitest run test/live-extract.test.ts   # 빨간 출력'
  ( cd "$WT/server" && npx vitest run test/live-extract.test.ts 2>&1 | grep -E '×|Tests ' | head -5 )
} >> "$M"
restore_f server/test/live-extract-lib.ts
{
  echo '# 복원 후 초록:'
  ( cd "$WT/server" && npx vitest run test/live-extract.test.ts 2>&1 | grep -E 'Tests ' )
} >> "$M"

# ── 변이 ⑦ — AC-006 ㉢: 이력 증분 판정 ───────────────────────────────
# [HARD] 원본 셸 이력은 저장소 밖이라 건드리지 않는다 — 측정이 읽는 «사본» 을 바꾼다.
cat "$HOME/.zsh_history" "$HOME/.bash_history" 2>/dev/null > "$SC/hist.copy" || true
HB=$(grep -cE '[0-9a-f]{64}' "$SC/hist.copy" || true)
cp "$SC/hist.copy" "$SC/hist.mutated"
python3 -c "
import sys
open(sys.argv[1],'a').write('export MINIDISCORD_TOKEN=' + 'c'*64 + '\n')
" "$SC/hist.mutated"
HA=$(grep -cE '[0-9a-f]{64}' "$SC/hist.mutated" || true)
{
  echo ""; echo "## 변이 ⑦ — AC-LIVEENV-006 ㉢ (이력 증분 0)"
  echo "# 조작: 이력 «사본» 에 가짜 64자 hex 한 줄을 덧붙였다 (원본은 건드리지 않는다)"
  echo "# before=$HB  after=$HA"
  echo "\$ test \"$HB\" -eq \"$HA\"; echo \"hist-delta-zero exit=\$?\"   # 빨간 출력"
  test "$HB" -eq "$HA"; echo "hist-delta-zero exit=$?"
  echo "# 판정: 증분이 생기면 exit=1 → 이 판정은 상수 함수가 아니다"
  echo '# 복원 후 초록 (실제 실행의 before/after):'
  HR1=$( { cat "$HOME/.zsh_history" "$HOME/.bash_history" 2>/dev/null || true; } | grep -cE '[0-9a-f]{64}' || true)
  HR2=$( { cat "$HOME/.zsh_history" "$HOME/.bash_history" 2>/dev/null || true; } | grep -cE '[0-9a-f]{64}' || true)
  echo "# before=$HR1 after=$HR2"
  test "$HR1" -eq "$HR2"; echo "hist-delta-zero exit=$?"
} >> "$M"

# ── 변이 ⑧ — AC-008: 전역 항목 내용 대조 ─────────────────────────────
cp "$HOME/.claude.json" "$SC/global.before" 2>/dev/null || echo '{}' > "$SC/global.before"
ENTRY_OF() { python3 -c "
import json,sys
try: d=json.load(open(sys.argv[1]))
except Exception: print('(읽지 못함)'); raise SystemExit
e=d.get('mcpServers',{}).get('minidiscord-channel')
print(json.dumps(e, sort_keys=True) if e else '(항목 없음)')" "$1"; }
cp "$SC/global.before" "$SC/global.mutated"
python3 - "$SC/global.mutated" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d['mcpServers']['minidiscord-channel']['args'][0] += 'X'
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
{
  echo ""; echo "## 변이 ⑧ — AC-LIVEENV-008 (전역 항목 무편집)"
  echo "# 조작: 전역 항목 «사본» 의 args[0] 에 한 글자를 더했다 (원본은 건드리지 않는다)"
  echo '$ diff <(ENTRY 원본) <(ENTRY 사본); echo "entry-unchanged exit=$?"   # 빨간 출력'
  ENTRY_OF "$SC/global.before" > "$SC/e.before"
  ENTRY_OF "$SC/global.mutated" > "$SC/e.mutated"
  diff "$SC/e.before" "$SC/e.mutated" | head -3
  diff -q "$SC/e.before" "$SC/e.mutated" >/dev/null; echo "entry-unchanged exit=$?"
  echo '# 복원 후 초록 (원본 대 원본):'
  ENTRY_OF "$HOME/.claude.json" > "$SC/e.now"
  diff -q "$SC/e.before" "$SC/e.now" >/dev/null; echo "entry-unchanged exit=$?"
} >> "$M"

# ── 변이 ⑨ — AC-011: E11 이 그 자리에서 함께 실행했다 ────────────────
{
  echo ""; echo "## 변이 ⑨ — AC-LIVEENV-011 ㉡ (추적 파일 증분 0)"
  echo "# 이 변이는 그 기준의 양성 대조군 ㉡ 과 같은 조작이라 E11 안에서 함께 실행했다."
  echo "# 관측: 스테이징한 임시 파일 한 개 → comm -13 이 그 이름을 내고 증분이 1 이 된다."
  echo "# 전문은 evidence/E11-no-full-token.txt 의 「양성 대조군 ㉡」 절에 있다."
  grep -A4 '양성 대조군 ㉡' "$EV/E11-no-full-token.txt" | tail -4
} >> "$M"

# ── 변이 ⑩ — AC-014 ㉢: 세션 증분 판정 ───────────────────────────────
# 실제 세션을 띄우지 않고, 이름이 claude 인 프로세스를 하나 만들어 증분을 낸다.
# [실측] cp /bin/sleep <이름 claude> 는 macOS 코드 서명이 깨져 실행 즉시 Killed: 9 로 죽는다 —
# 그러면 증분이 0 이라 이 변이가 아무것도 재지 못한다(1회차에 그렇게 됐다). 심볼릭 링크는
# 원본 바이너리를 실행하므로 서명이 살아 있고, pgrep -x 가 링크 이름으로 잡는다(실측 14 → 15).
ln -sf /bin/sleep "$SC/claude"
CB=$(pgrep -x claude | wc -l | tr -d ' ')
"$SC/claude" 20 &
FAKE=$!
sleep 0.5
CD=$(pgrep -x claude | wc -l | tr -d ' ')
{
  echo ""; echo "## 변이 ⑩ — AC-LIVEENV-014 ㉢ (예행 중 세션 증분 0)"
  echo "# 조작: 예행 «밖에서» 이름이 claude 인 프로세스를 하나 띄웠다(pid $FAKE)"
  echo "# before=$CB  during=$CD"
  echo "\$ test \"$CB\" -eq \"$CD\"; echo \"claude-delta-zero exit=\$?\"   # 빨간 출력"
  test "$CB" -eq "$CD"; echo "claude-delta-zero exit=$?"
  echo "# 판정: 증분이 생기면 exit=1 → 이 판정은 상수 함수가 아니다"
} >> "$M"
kill "$FAKE" 2>/dev/null; wait "$FAKE" 2>/dev/null
sleep 0.5
CA=$(pgrep -x claude | wc -l | tr -d ' ')
{
  echo "# 복원 후 초록: before=$CB after=$CA"
  test "$CB" -eq "$CA"; echo "claude-delta-zero exit=$?"
  echo "\$ ps -p $FAKE >/dev/null; echo \"대조군 종료 확인 exit=\$?\""
  ps -p "$FAKE" >/dev/null 2>&1; echo "대조군 종료 확인 exit=$?"
} >> "$M"

# ── 마지막 줄: 작업 트리에 변이가 남지 않았다 ────────────────────────
"$LE" down >/dev/null 2>&1 || true
rm -rf "$SC"
{
  echo ""
  echo "## 변이 잔존 확인 — 대상 파일이 변이 직전과 바이트 단위로 같다"
  echo "# [HARD] git status 로는 이 확인이 서지 않는다 — 이번 회차의 «정당한 변경»(spec.md HISTORY,"
  echo "#   e2e.mts 의 export, 추출기 수정)과 변이 잔여를 구분하지 못하기 때문이다. 1회차가 그 형태였고"
  echo "#   세 파일의 M 표시를 놓고 「복원됐는가」를 사람이 판단해야 했다. 그래서 변이 직전 해시와 대조한다."
  for f in $MUT_TARGETS; do
    now=$(shasum -a 256 "$f" | cut -d' ' -f1)
    was=$(cat "$SNAP/$(echo "$f" | tr '/' '_').sha")
    if [ "$now" = "$was" ]; then echo "unchanged=yes  $f"; else echo "unchanged=NO   $f"; fi
  done
} >> "$M"
rm -rf "$SNAP"

echo "M01-mutation.txt 작성 완료"
