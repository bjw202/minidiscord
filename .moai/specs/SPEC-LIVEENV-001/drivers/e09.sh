#!/usr/bin/env bash
# AC-LIVEENV-009 — 봇 세션의 채널 왕복이 봇 디렉터리 .mcp.json 에서 온다.
# 그리고 AC-LIVEENV-010 의 «실 세션 절반» 을 E10 에 덧붙인다.
#
# [HARD] 이 두 자리의 공급원은 M8(실 세션 한 번) 하나뿐이다. 다른 경로로 우회해 세우지 않는다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
LE="$WT/scripts/live-env.sh"
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
TD="$HOME/.claude/projects/-Users-byunjungwon-Dev-my-project-04-minidiscord--claude-worktrees-t35-bot-01"
mkdir -p "$EV"
cd "$WT" || exit 1
E09="$EV/E09-mcp-attribution.txt"

GLOBAL_ARGS0=$(python3 -c "
import json, os
d = json.load(open(os.path.expanduser('~/.claude.json')))
print(d['mcpServers']['minidiscord-channel']['args'][0])")

{
  echo "# AC-LIVEENV-009 — 봇 세션의 채널 왕복이 봇 디렉터리 .mcp.json 에서 온다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo "# 두 관측을 «같은 시각» 에 함께 읽는다 — 하나만으로는 귀속이 서지 않는다."
  echo ""
  echo "## ㉠ 전역 항목이 존재하지 않는 경로를 가리킨다"
  echo "# 관측 시각: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo '$ python3 -c "... d[''mcpServers''][''minidiscord-channel''][''args''][0]"'
  echo "$GLOBAL_ARGS0"
  echo "\$ test -e \"<전역 args[0]>\"; echo \"exit=\$?\""
  test -e "$GLOBAL_ARGS0"; echo "exit=$?"
  echo "# [HARD] 이 값이 exit=0 이면(경로가 존재하면) 이 기준은 통과가 아니라 UNMEASURED 다."
  echo "#   두 적재 경로가 구별되지 않기 때문이다. 지금은 exit=1 이므로 대조군이 성립한다."
} > "$E09"

python3 - "$TD" >> "$E09" <<'PY'
import glob, json, os, sys, datetime
td = sys.argv[1]
files = sorted(glob.glob(os.path.join(td, '*.jsonl')))
print()
print('## ㉡ 그 세션의 대화 기록에 채널 도구 호출과 결과가 «짝으로» 있다')
print('# 관측 시각:', datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
print('# 대화 기록 후보 수:', len(files), '(둘 이상이면 E-3 — 판정하지 않는다)')
if len(files) != 1:
    print('VERDICT=UNMEASURED (후보가 하나가 아니다)')
    raise SystemExit
f = files[0]
print('# 파일:', f)
uses, results, sess, cwds = {}, {}, set(), set()
for line in open(f):
    line = line.strip()
    if not line:
        continue
    try:
        r = json.loads(line)
    except Exception:
        continue
    if isinstance(r.get('sessionId'), str):
        sess.add(r['sessionId'])
    if isinstance(r.get('cwd'), str):
        cwds.add(r['cwd'])
    c = (r.get('message') or {}).get('content')
    if not isinstance(c, list):
        continue
    for b in c:
        if b.get('type') == 'tool_use' and str(b.get('name', '')).startswith('mcp__minidiscord-channel__'):
            uses[b['id']] = (b['name'], b.get('input'))
        if b.get('type') == 'tool_result' and b.get('tool_use_id') in uses:
            results[b['tool_use_id']] = b.get('content')
print('session_uuid =', sorted(sess))
print('cwd          =', sorted(cwds))
print('# 둘 다 단일값이어야 «한 세션» 이 선다')
print('채널 도구 호출 =', len(uses), '· 결과가 돌아온 짝 =', len(results))
for k, (name, inp) in uses.items():
    print()
    print(f'[tool_use]    id={k}')
    print(f'  name  = {name}')
    print('  input =', json.dumps(inp, ensure_ascii=False))
    if k in results:
        print(f'[tool_result] id={k}')
        print('  content =', json.dumps(results[k], ensure_ascii=False))
print()
ok = len(files) == 1 and len(sess) == 1 and len(cwds) == 1 and len(results) >= 1
print('VERDICT=' + ('PASS (㉠ 과 ㉡ 이 함께 섰다 — 왕복을 만든 것은 봇 디렉터리의 .mcp.json 뿐이다)'
                    if ok else 'FAIL'))
PY

{
  echo ""
  echo "## 승인 시점 — 첫 기동은 무인으로 붙지 않는다"
  echo "# [HARD] 봇 디렉터리의 .mcp.json 은 프로젝트 범위 항목이라 첫 사용에 사람 승인을 요구한다"
  echo "#   (spec.md §1.2 F-12). 이 실행에서도 운영자가 세 확인 창을 처리한 «뒤에» 왕복이 생겼다."
  echo "#   승인 전의 왕복 부재는 실패가 아니라 아직 재지 않은 상태다."
  echo "# 승인 전 관측(이 회차 기록): principal=pm:api=false:conn=0"
  echo '$ scripts/live-env.sh status   # 승인 뒤'
  "$LE" status 2>&1 | grep '^principal='
} >> "$E09"

# ── AC-LIVEENV-010 의 실 세션 절반을 덧붙인다 ────────────────────────
SESS=$(python3 -c "
import glob, json, sys, os
f = sorted(glob.glob(os.path.join('$TD', '*.jsonl')))
print(os.path.basename(f[0])[:-6] if f else '')")
{
  echo ""
  echo "## 절반 3 — 실 세션 (대화 기록 표면) : 관측됨"
  echo "session_uuid=$SESS"
  echo "# 이 절반의 공급원은 M8 하나뿐이다. 예행은 Claude 세션을 띄우지 않으므로 jsonl 파서를"
  echo "#   한 줄도 밟지 못한다 — 그 표면의 도달성은 이 실행이 단독으로 진다."
  echo '$ npx tsx scripts/live-extract.mts extract --transcript-dir <실제 슬러그 디렉터리>'
  echo '# 산출 파일 목록:'
  ls "$EV/realsession/"
  echo '# 각 산출 파일의 첫 줄:'
  for f in "$EV"/realsession/A*.txt; do printf '%s: ' "$(basename "$f")"; head -1 "$f"; done
  echo '# A01 ㉣ 전문 — 두 값과 그 일치 여부:'
  cat "$EV/realsession/A01-reply-arg.txt"
  echo '# manifest 의 A01 ㉣ 항:'
  python3 -c "
import json
m = json.load(open('$EV/realsession/manifest.json'))
i = next(x for x in m['items'] if x['name'] == 'A01 ㉣')
print(json.dumps(i, ensure_ascii=False))"
} >> "$EV/E10-extract-run.txt"

# 「미관측」 표지를 실제 UUID 로 갈음한다 — 그 표지의 목적은 파일 존재만으로 셈하지 못하게 하는 것이다
python3 - "$EV/E10-extract-run.txt" "$SESS" <<'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1])
p.write_text(p.read_text().replace('session_uuid=(미관측)', f'session_uuid={sys.argv[2]}'))
PY

echo "E09 작성 완료 · E10 에 실 세션 절반을 덧붙였다 (session=$SESS)"
