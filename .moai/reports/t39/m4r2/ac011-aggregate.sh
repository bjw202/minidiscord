#!/bin/bash
# SPEC-WSUPGRADE-001 M4 — AC-WSUPGRADE-011 집계 도구(.moai/reports/t39/m4/).
# 요약 파일(팔별 실행 결과 "P<n> PASS|FAIL" / "S<n> PASS|FAIL" 행)에서 팔별 시행 수와
# N(PASS)+M(FAIL)을 명령으로 세어, 두 팔 모두 시행 수 20 · N+M=20 이 아니면 실패로 끝난다.
# 이 도구가 재는 것은 분모이지 결과가 아니다 — Mp=Ms=0 이어도 시행 수 20 이면 통과다(AC-011).
#
# 용법: bash ac011-aggregate.sh <summary-file>
set -u
f="${1:?용법: ac011-aggregate.sh <summary-file>}"
[ -f "$f" ] || { echo "요약 파일이 없다: $f" >&2; exit 2; }

arm() { # $1=파일 $2=팔 접두(P|S) → "시행수 PASS수 FAIL수"
  awk -v p="$2" '
    $1 ~ ("^" p "[0-9]+$") {
      n++
      if ($2 == "PASS") pass++
      else if ($2 == "FAIL") fail++
      else other++
    }
    END { printf "%d %d %d %d", n + 0, pass + 0, fail + 0, other + 0 }
  ' "$1"
}

read -r pN pPass pFail pOther <<< "$(arm "$f" P)"
read -r sN sPass sFail sOther <<< "$(arm "$f" S)"
echo "parallel: trials=$pN PASS=$pPass FAIL=$pFail 기타=$pOther N+M=$((pPass + pFail))"
echo "serial:   trials=$sN PASS=$sPass FAIL=$sFail 기타=$sOther N+M=$((sPass + sFail))"

rc=0
if [ "$pN" -ne 20 ] || [ $((pPass + pFail)) -ne 20 ] || [ "$pOther" -ne 0 ]; then
  echo "AC-011 RED: 병렬 팔 분모 어긋남(시행 수 20 · N+M=20 · 판정 없는 행 0 이어야 한다)"
  rc=1
fi
if [ "$sN" -ne 20 ] || [ $((sPass + sFail)) -ne 20 ] || [ "$sOther" -ne 0 ]; then
  echo "AC-011 RED: 직렬 팔 분모 어긋남(시행 수 20 · N+M=20 · 판정 없는 행 0 이어야 한다)"
  rc=1
fi
[ "$rc" -eq 0 ] && echo "AC-011: PASS — 두 팔 모두 시행 수 20 · N+M=20"
exit "$rc"
