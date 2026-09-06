#!/usr/bin/env bash
# AC-LIVEENV-013 — Playwright 부재가 조용한 통과도 조용한 실패도 아니다.
# 이 기준은 서로 무관한 의무 둘을 지므로 재는 자리도 둘이다 — 다섯 실행이 그 둘을 함께 덮는다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
D="$WT/data/live-env"
SC="$D/e13"
rm -rf "$SC"; mkdir -p "$SC/out" "$SC/tdir" "$SC/no-browsers" "$EV"
cd "$WT" || exit 1
E13="$EV/E13-playwright-absence.txt"

manifest_line() { # manifest_line <항 이름>
  python3 - "$SC/out/manifest.json" "$1" <<'PY' 2>/dev/null || echo "(manifest 를 읽지 못했다)"
import json, sys
try:
    m = json.load(open(sys.argv[1]))
except Exception:
    raise SystemExit(1)
for i in m['items']:
    if i['name'] == sys.argv[2]:
        print(json.dumps(i, ensure_ascii=False))
        break
PY
}

{
  echo "# AC-LIVEENV-013 — 부재가 조용한 통과도 조용한 실패도 아니다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo "# [HARD] 부재는 정의상 «재지 못함» 이므로 2 다. 1 을 내면 상위 판정이 「쟀고 실패」로 오독한다."
} > "$E13"

# ── ① Playwright 부재 ────────────────────────────────────────────────
{
  echo ""
  echo "## 실행 1 — Playwright 부재"
  echo '$ PLAYWRIGHT_BROWSERS_PATH=<빈 경로> npx tsx scripts/live-extract.mts capture'
  PLAYWRIGHT_BROWSERS_PATH="$SC/no-browsers/absent" \
    npx tsx scripts/live-extract.mts capture --out "$SC/out" 2>&1
  echo "exit=$?"
  echo "# capture-status.txt:"; cat "$SC/out/capture-status.txt" 2>/dev/null
} >> "$E13"

# ── ② Playwright 존재 (양성 대조군) ──────────────────────────────────
{
  echo ""
  echo "## 실행 2 — Playwright 존재 (양성 대조군)"
  echo "# 없으면 「부재 관용」과 「캡처 기능이 아예 없다」가 구별되지 않는다."
  echo '$ npx tsx scripts/live-extract.mts capture'
  npx tsx scripts/live-extract.mts capture --out "$SC/out" 2>&1
  echo "exit=$?"
  echo "# capture-status.txt:"; cat "$SC/out/capture-status.txt" 2>/dev/null
} >> "$E13"

# ── ③ E-2 승인 프롬프트 정지 ─────────────────────────────────────────
printf '%s\n' '{"type":"user","sessionId":"aaa","cwd":"/tmp/bot-01","message":{"role":"user","content":[{"type":"text","text":"승인 대기 중"}]}}' > "$SC/tdir/one.jsonl"
cp "$HOME/.claude.json" "$SC/global.json" 2>/dev/null || echo '{"mcpServers":{}}' > "$SC/global.json"
{
  echo ""
  echo "## 실행 3 — E-2 승인 프롬프트에서 멈춤"
  echo "# 성립: 봇 디렉터리의 항목이 승인되지 않아 채널 도구 왕복 짝이 생기지 않은 상태를"
  echo "#       대화 기록으로 재현했다 — tool_use/tool_result 짝이 0건이다."
  echo '$ npx tsx scripts/live-extract.mts extract --transcript-dir <왕복 0건>'
  npx tsx scripts/live-extract.mts extract --out "$SC/out" --db "$D/minidiscord.db" \
    --transcript-dir "$SC/tdir" --global-config "$SC/global.json" 2>&1
  echo "exit=$?"
  echo "# manifest 해당 줄 (A01 ㉣):"; manifest_line 'A01 ㉣'
  echo "# extract-notes.txt:"; cat "$SC/out/extract-notes.txt" 2>/dev/null
} >> "$E13"

# ── ④ E-3 대화 기록 후보 다수 ────────────────────────────────────────
printf '%s\n' '{"type":"user","sessionId":"bbb","cwd":"/tmp/bot-01","message":{"role":"user","content":[{"type":"text","text":"이전 세션"}]}}' > "$SC/tdir/two.jsonl"
{
  echo ""
  echo "## 실행 4 — E-3 대화 기록 후보 다수"
  echo "# 성립: 대상 슬러그 디렉터리에 jsonl 두 개를 놓았다 — 세션 하나당 파일 하나 전제가 깨졌다."
  echo '$ npx tsx scripts/live-extract.mts extract --transcript-dir <후보 2개>'
  npx tsx scripts/live-extract.mts extract --out "$SC/out" --db "$D/minidiscord.db" \
    --transcript-dir "$SC/tdir" --global-config "$SC/global.json" 2>&1
  echo "exit=$?"
  echo "# manifest 해당 줄 (A01 ㉣):"; manifest_line 'A01 ㉣'
  echo "# extract-notes.txt:"; cat "$SC/out/extract-notes.txt" 2>/dev/null
} >> "$E13"
rm -f "$SC/tdir/two.jsonl"

# ── ⑤ E-5 실행 중 전역 항목 변경 ─────────────────────────────────────
# [HARD] 원본 ~/.claude.json 은 건드리지 않는다 — 사본만 바꾼다 (운영자 결정).
# 창을 열어 두는 수단으로 큰 대화 기록을 쓴다. 판별자는 «항목 내용» 이지 수정 시각이 아니다.
BIGT="$SC/big-transcript"; mkdir -p "$BIGT"
python3 - "$BIGT/one.jsonl" <<'PY'
import json, sys
rec = {"type": "user", "sessionId": "aaa", "cwd": "/tmp/bot-01",
       "message": {"role": "user", "content": [{"type": "text", "text": "승인 대기 중 " + "x" * 120}]}}
line = json.dumps(rec, ensure_ascii=False) + "\n"
with open(sys.argv[1], "w") as f:
    for _ in range(400000):
        f.write(line)
PY
python3 - "$SC/global.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d.setdefault('mcpServers', {})['minidiscord-channel'] = {'command': 'node', 'args': ['/before/path'], 'env': {}}
json.dump(d, open(sys.argv[1], 'w'), indent=2)
PY
python3 - "$SC/global.json" "$SC/global-after.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
d['mcpServers']['minidiscord-channel']['args'] = ['/after/path']
json.dump(d, open(sys.argv[2], 'w'), indent=2)
PY
( sleep 0.5; cp "$SC/global-after.json" "$SC/global.json" ) &
CHANGER=$!
{
  echo ""
  echo "## 실행 5 — E-5 실행 중 전역 항목 변경"
  echo "# 성립: 추출기가 큰 대화 기록을 파싱하는 «동안» 항목 사본의 args[0] 을 바꿨다."
  echo "#       (실측: 추출 전체가 약 0.96초이고 두 읽기 사이 창이 0.25~0.95초다)"
  echo '$ npx tsx scripts/live-extract.mts extract --global-config <실행 중 내용이 바뀌는 사본>'
  npx tsx scripts/live-extract.mts extract --out "$SC/out" --db "$D/minidiscord.db" \
    --transcript-dir "$BIGT" --global-config "$SC/global.json" 2>&1
  echo "exit=$?"
  echo "# extract-notes.txt:"; cat "$SC/out/extract-notes.txt" 2>/dev/null
} >> "$E13"
wait "$CHANGER" 2>/dev/null

# ── 의존 추가 금지 확인 ──────────────────────────────────────────────
{
  echo ""
  echo "## 의존 추가 금지 확인"
  echo '$ git diff -- package.json server/package.json channel/package.json | grep -c playwright   # → 0'
  git diff -- package.json server/package.json channel/package.json | grep -c playwright
} >> "$E13"

# ── 판정 ─────────────────────────────────────────────────────────────
{
  echo ""
  echo "## 판정"
  echo "# 실행 수 (다섯이어야 한다):"; grep -c '^## 실행 ' "$E13"
  echo "# exit=2 인 실행 수 (①③④⑤ — 넷):"; grep -c '^exit=2$' "$E13"
  echo "# exit=0 인 실행 수 (② 하나):"; grep -c '^exit=0$' "$E13"
  echo "# exit=1 인 실행 수 (0 이어야 한다):"; grep -c '^exit=1$' "$E13"
} >> "$E13"

echo "E13 작성 완료"
