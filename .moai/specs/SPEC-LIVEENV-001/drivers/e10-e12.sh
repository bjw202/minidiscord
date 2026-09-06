#!/usr/bin/env bash
# AC-LIVEENV-010 · AC-LIVEENV-011 · AC-LIVEENV-012 의 증거를 만든다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
BASE=5edd97f     # progress.md §E.2 가 귀속시킨 리터럴
SC="$WT/data/live-env/e11"
rm -rf "$SC"; mkdir -p "$SC" "$EV"
cd "$WT" || exit 1

# ── AC-LIVEENV-010 ───────────────────────────────────────────────────
E10="$EV/E10-extract-run.txt"
{
  echo "# AC-LIVEENV-010 — 추출기가 세 표면에서 다섯 항을 만든다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo ""
  echo "## 절반 1 — 인프로세스 회귀 (대응 관계)"
  echo '$ npm test -w server -- test/live-extract.test.ts'
  ( cd "$WT/server" && npx vitest run test/live-extract.test.ts 2>&1 | tail -6 )
  echo ""
  echo "## 절반 2 — 예행 실행 (DB 면·프로세스 면의 도달성)"
  echo '$ ls .moai/specs/SPEC-LIVEENV-001/evidence/dryrun/'
  ls "$EV/dryrun/"
  echo '# 각 산출 파일의 첫 줄:'
  for f in "$EV"/dryrun/A*.txt; do
    printf '%s: ' "$(basename "$f")"; head -1 "$f"
  done
  echo ""
  echo "## 절반 3 — 실 세션 (대화 기록 표면) : 미관측"
  echo "# [HARD] 이 절반의 공급원은 M8(실 세션 한 번) 하나뿐이고, 이번 회차는 M8 을 돌리지"
  echo "#   않았다(리드 처분 16). 세션 UUID 가 여기 없으므로 이 기준은 통과가 아니라 미관측이다."
  echo "#   예행은 Claude 세션을 띄우지 않으므로 jsonl 파서에 원리적으로 닿지 못한다 —"
  echo "#   합성 fixture 통과와 예행 통과를 도달성 증거로 읽지 않는다."
  echo "session_uuid=(미관측)"
} > "$E10"

# ── AC-LIVEENV-011 ───────────────────────────────────────────────────
E11="$EV/E11-no-full-token.txt"
{
  echo "# AC-LIVEENV-011 — 산출물 어디에도 토큰 전문이 없다"
  echo "# head=$(git rev-parse --short HEAD) · BASE=$BASE (리터럴)"
  echo ""
  echo "## ㉠ 이 카드의 산출 디렉터리 — 절대 0"
  echo '$ grep -rEl ''[0-9a-f]{64}'' .moai/specs/SPEC-LIVEENV-001/evidence/ ; echo "exit=$?"'
  grep -rEl '[0-9a-f]{64}' "$EV/" ; echo "exit=$?"
} > "$E11"

git grep -lE '[0-9a-f]{64}' "$BASE" -- . ':!package-lock.json' 2>/dev/null | sed "s|^$BASE:||" | sort > "$SC/hex-before"
git grep -lE '[0-9a-f]{64}' HEAD    -- . ':!package-lock.json' 2>/dev/null | sed 's|^HEAD:||'   | sort > "$SC/hex-after"
{
  echo ""
  echo "## ㉡ 추적되는 저장소 파일 — 증분 0 (절대값은 판정선이 아니다)"
  echo '$ git grep -lE ''[0-9a-f]{64}'' -- . '':!package-lock.json'' | wc -l   # 절대값'
  git grep -lE '[0-9a-f]{64}' -- . ':!package-lock.json' | wc -l | tr -d ' '
  echo "# 기준선($BASE)의 적중 파일 수: $(wc -l < "$SC/hex-before" | tr -d ' ')"
  echo "# 현재(HEAD)의 적중 파일 수:    $(wc -l < "$SC/hex-after" | tr -d ' ')"
  echo '$ comm -13 hex-before hex-after   # 새로 생긴 적중 파일 — 비어야 한다'
  comm -13 "$SC/hex-before" "$SC/hex-after"
  echo "# 새로 생긴 적중 파일 수: $(comm -13 "$SC/hex-before" "$SC/hex-after" | wc -l | tr -d ' ')"
  echo "# [실측] 기준선의 적중은 전부 정당한 SHA-256 이다 — 매니페스트·검증 스냅숏·CI 로그."
} >> "$E11"

# ── [HARD] 양성 대조군 두 벌 — 정규식이 침묵하는 형태가 아님을 배제한다 ──
echo "fake $(python3 -c "print('a'*64)")" > "$SC/untracked-probe.txt"
{
  echo ""
  echo "## 양성 대조군 ㉠ — 추적되지 않는 임시 파일"
  echo '$ grep -rEl ''[0-9a-f]{64}'' <임시 디렉터리> | wc -l   # → 1 이상'
  grep -rEl '[0-9a-f]{64}' "$SC/" | wc -l | tr -d ' '
} >> "$E11"

# ㉡ 스테이징한 임시 파일 — 이것이 곧 증분 판정의 반대 방향 변이(⑨)다
PROBE="probe-token-control.txt"
echo "fake $(python3 -c "print('b'*64)")" > "$WT/$PROBE"
git add "$WT/$PROBE"
git grep -lE '[0-9a-f]{64}' -- . ':!package-lock.json' 2>/dev/null | sort > "$SC/hex-staged"
{
  echo ""
  echo "## 양성 대조군 ㉡ — git add 로 스테이징한 임시 파일 (= 변이 ⑨)"
  echo '$ git add <임시 파일>; git grep -lE ... | grep <임시 파일>   # → 적중 1건'
  git grep -lE '[0-9a-f]{64}' -- . ':!package-lock.json' | grep "$PROBE" || echo "(적중 없음 — 대조군 실패)"
  echo '$ comm -13 hex-before hex-staged   # 증분 판정도 함께 빨개진다'
  comm -13 "$SC/hex-before" "$SC/hex-staged"
  echo "# 증분 = $(comm -13 "$SC/hex-before" "$SC/hex-staged" | wc -l | tr -d ' ') (0 이 아니어야 한다 — 판정이 상수 함수가 아니다)"
} >> "$E11"
git rm --cached --quiet "$WT/$PROBE"
rm -f "$WT/$PROBE"
{
  echo '$ git rm --cached <임시 파일>; rm <임시 파일>; git status --porcelain | grep probe-token'
  git status --porcelain | grep 'probe-token' || echo "(되돌렸다 — 작업 트리에 남지 않았다)"
} >> "$E11"

# ── AC-LIVEENV-012 ───────────────────────────────────────────────────
E12="$EV/E12-manifest-judge.txt"
{
  echo "# AC-LIVEENV-012 — manifest 가 기계 판정과 사람 판정을 가른다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo ""
  echo '$ cat .moai/specs/SPEC-LIVEENV-001/evidence/dryrun/manifest.json'
  cat "$EV/dryrun/manifest.json"
} > "$E12"
python3 - "$EV/dryrun/manifest.json" <<'PY' >> "$E12"
import json, sys
m = json.load(open(sys.argv[1]))
want = sorted(['A01 ㉣', 'A08', 'A09', 'A11', 'A12', 'A03', 'A10'])
got = sorted({i['name'] for i in m['items']})
print()
print('## ㉣ 항 이름 집합 대조 — 개수가 아니라 이름으로 대조한다')
print('want =', want)
print('got  =', got)
print('names_match =', 'yes' if want == got else 'no')
print()
print('## ㉠ 기계 판정 다섯')
for n in ['A01 ㉣', 'A08', 'A09', 'A11', 'A12']:
    i = next(x for x in m['items'] if x['name'] == n)
    print(f"{n}: judge={i['judge']} status={i['status']}")
print()
print('## ㉡ 사람 판정 둘 — 판정 필드가 아예 없어야 한다')
for n in ['A03', 'A10']:
    i = next(x for x in m['items'] if x['name'] == n)
    print(f"{n}: judge={i['judge']} status={i['status']} has_verdict={'verdict' in i}")
print()
print('## ㉢ Playwright 가 없어 캡처를 못 만든 항의 상태')
print('A03/A10 status =', {x['name']: x['status'] for x in m['items'] if x['name'] in ('A03', 'A10')})
PY
{
  echo ""
  echo "## 변이 ⑥ 의 대상 — 인프로세스 회귀가 그 경계를 진다"
  echo "# server/test/live-extract.test.ts 의 「A03·A10 은 judge=human 이고 판정 필드가 아예 없다」"
  echo "# 단언이 그 자리다. 변이 기록은 M01-mutation.txt 를 보라."
} >> "$E12"

rm -rf "$SC"
echo "E10/E11/E12 작성 완료"
