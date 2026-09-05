#!/bin/bash
# SPEC-WSUPGRADE-001 M4 — AC-WSUPGRADE-008 훑기 도구(.moai/reports/t39/m4/).
# 범위: SPEC 디렉터리 전건 + .moai/reports/t39/ 기록물에서 감사 보고서 부류(plan-audit*)를 뺀 것
# (면제가 아니라 범위 재작도 — acceptance AC-008 본문).
# 술어: 어간 적중 줄 가운데 같은 줄에 고정 리터럴 토큰이 없는 줄을 센다. 0 건이면 통과.
# 어간은 이 파일 안에서 조립해 쓴다("서버가 아직 ""듣지 않는" 따위) — 도구 자신이 술어 원문을
# 한 줄에 담아 자기에게 적중하는 자기측정을 막기 위해서다. 도구의 패턴 문자열은 반증된 판독을
# 전제로 쓴 문서가 아니라 기록물이다.
#
# 용법: ac008-sweep.sh [token|word|no-plan]
#   token    (기본) 토큰 없는 적중을 센다 — 본 기준의 술어.
#   word     보조 변이(토큰이 하중을 지는지): 술어를 «낱말 '반증' 이 있는가»로 바꾼 판정.
#   no-plan  보조 변이(훑기 자신을 잰다): 파일 목록에서 plan.md 를 뺀 판정.
set -u
MODE="${1:-token}"
OUTDIR="$(cd "$(dirname "$0")" && pwd)"
STEMS="$(printf '%s|%s' "서버가 아직 ""듣지 않는" "서버가 서기 ""전")"
TOKEN="[반증된-선행-판독]"

LIST="$OUTDIR/ac008-list.txt"
{
  find .moai/specs/SPEC-WSUPGRADE-001 .moai/reports/t39 -type f
} | grep -v '/plan-audit' | grep -v '/ac008-hits-' | grep -v '/ac008-list\.txt$' > "$LIST"

case "$MODE" in
  no-plan) grep -v '/plan\.md$' "$LIST" > "$LIST.tmp" && mv "$LIST.tmp" "$LIST" ;;
esac

case "$MODE" in
  word) EXEMPT='반증' ;;
  *)    EXEMPT="$TOKEN" ;;
esac

HITS="$OUTDIR/ac008-hits-$MODE.txt"
: > "$HITS"
while IFS= read -r f; do
  [ -n "$f" ] || continue
  [ -f "$f" ] || continue
  grep -nE -- "$STEMS" "$f" 2>/dev/null | grep -vF -- "$EXEMPT" | sed "s|^|$f:|" >> "$HITS"
done < "$LIST"

n=$(grep -c . "$HITS")
echo "ac008-sweep mode=$MODE list-files=$(grep -c . "$LIST") tokenless-hits=$n"
[ "$n" -eq 0 ]
