#!/bin/bash
# SPEC-WSUPGRADE-001 3회차 M4 — AC-WSUPGRADE-010 세 조항 판정기(.moai/reports/t39/m4r2/).
# (1) §4 표의 갈래 집합이 {H-1,H-2,H-3} 을 포함한다(초과 허용).
# (2) 「이것을 참으로 만드는 관측」 칸의 빈칸이 0 이다.
# (3) §4 본문 줄(제목·표 제외)의 단정 어간 적중이 0 건이다 — acceptance 의 판정 명령 그대로.
# 용법: bash ac010-check.sh   (spec.md 는 저장소 루트 기준 상대경로로 읽는다)
set -u
SPEC=".moai/specs/SPEC-WSUPGRADE-001/spec.md"
rc=0

# (1) 갈래 집합
branches=$(grep -oE '^\| \*\*H-[0-9]' "$SPEC" | grep -oE 'H-[0-9]' | sort -u)
echo "갈래 집합(§4 표): {$branches}"
for b in H-1 H-2 H-3; do
  if ! grep -qx "$b" <<<"$branches"; then
    echo "AC-010 (1) RED: 갈래 $b 가 §4 표에 없다 — 집합 포함 파괴"
    rc=1
  fi
done

# (2) 관측 칸 빈칸 — 갈래 행의 셋째 칸이 비었으면 적중
empty=$(awk -F'|' '/^\| \*\*H-/ { gsub(/^[ \t]+|[ \t]+$/, "", $4); if ($4 == "") c++ } END { print c+0 }' "$SPEC")
echo "관측 칸 빈칸: $empty"
if [ "$empty" -ne 0 ]; then
  echo "AC-010 (2) RED: 빈 관측 칸 $empty 건"
  rc=1
fi

# (3) 단정 어간 — acceptance AC-010 의 판정 명령 그대로
awkval=$(awk '/^## 4\./{f=1;next} /^## /{f=0} f && $0 !~ /^\|/ && $0 !~ /^#/' "$SPEC" \
  | grep -c '원인은\|임이 밝혀졌다\|로 확정\|하나로 좁')
echo "§4 본문 단정 어간 적중(awk): $awkval"
if [ "$awkval" -ne 0 ]; then
  echo "AC-010 (3) RED: 단정 어간 적중 $awkval 건"
  rc=1
fi

if [ "$rc" -eq 0 ]; then
  echo "AC-010: PASS — 세 조항 모두 성립"
else
  echo "AC-010: RED — 위에 적힌 조항이 어긋났다"
fi
exit "$rc"
