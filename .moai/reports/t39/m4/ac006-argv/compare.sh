#!/bin/bash
# SPEC-WSUPGRADE-001 M4 — AC-WSUPGRADE-006 측정 도구(.moai/reports/t39/m4/ac006-argv/).
# 기록된 argv 는 bash -x xtrace(실행 주체인 셸이 실제 실행한 명령의 기록)에서만 뽑는다.
# 출처 검증(기준 조건 (1)) — 세 층:
#   (a) xtrace 표지: '+ ' 접두 행이 있어야 한다.
#   (b) 실행 문맥: xtrace 안에 '+ cd …/server' 행이 있어야 한다 — 대상 스위트를 띄운
#       셸의 자취다. 손으로 쓴 배열에는 이 문맥이 없다.
#   (c) 동반 실행 출력: xtrace 와 같은 어간의 run 로그(<어간>-run.log)가 존재하고 vitest
#       배너(RUN v)를 담고 있어야 한다 — 기록과 실행이 같은 한 번의 실행에서 나왔음의
#       짝이다. 손으로 쓴 배열은 이 짝이 없다.
# 잔여: 세 층을 전부 흉내 낸 완벽한 위조는 형식 검사로는 가르지 못한다 — 기록의 «생성
# 과정»까지는 기계가 볼 수 없고, 그 한계는 기록에 잔여로 적는다(기준이 재는 것은 형식이지
# 위조 방지 스캐너가 아니다).
# 판정(기준 조건 (2)): 두 배열의 토큰 대칭 차집합이 정확히 1 이어야 통과(0·2 이상은 실패).
#
# 용법: compare.sh <parallel-xtrace.log> <serial-xtrace.log>
set -u

fail() { echo "PROVENANCE-FAIL[$2]: $1" >&2; exit 2; }

extract() { # $1 = xtrace 파일, $2 = 라벨
  local f="$1" label="$2" line stem runlog
  [ -f "$f" ] || fail "xtrace 파일이 없다: $f" "$label"
  grep -q '^+ ' "$f" || fail "xtrace 표지(+ 접두)가 없다 — 실행 주체의 기록이 아니다: $f" "$label"
  grep -q '^+ cd .*server$' "$f" || fail "실행 문맥(+ cd …/server)이 없다 — 스위트를 띄운 셸의 자취가 아니다: $f" "$label"
  stem="${f%-xtrace.log}"
  runlog="$stem-run.log"
  [ -f "$runlog" ] || fail "동반 실행 출력이 없다: $runlog" "$label"
  grep -qE 'RUN +v[0-9]' "$runlog" || fail "동반 실행 출력에 vitest 배너가 없다: $runlog" "$label"
  line=$(grep '^+ npx vitest' "$f" | tail -1)
  [ -n "$line" ] || fail "xtrace 안에 실행된 vitest 명령이 없다: $f" "$label"
  printf '%s\n' "${line#+ }"
}

A=$(extract "$1" parallel) || exit 2
B=$(extract "$2" serial)   || exit 2
echo "parallel-argv: $A"
echo "serial-argv:   $B"

# 토큰 대칭 차집합 — comm 으로 계산한다(정렬·유일화 후 양쪽 어느 한쪽에만 있는 토큰).
T="$(dirname "$0")"
tr ' ' '\n' <<<"$A" | sed '/^$/d' | sort -u > "$T/tmp-tokens-a.txt"
tr ' ' '\n' <<<"$B" | sed '/^$/d' | sort -u > "$T/tmp-tokens-b.txt"
sym=$(comm -3 "$T/tmp-tokens-a.txt" "$T/tmp-tokens-b.txt" | sed '/^$/d' | grep -c .)
symtok=$(comm -3 "$T/tmp-tokens-a.txt" "$T/tmp-tokens-b.txt" | sed '/^$/d' | tr '\n' ' ')
rm -f "$T/tmp-tokens-a.txt" "$T/tmp-tokens-b.txt"
echo "symmetric-difference: $sym tokens [$symtok]"
if [ "$sym" -eq 1 ]; then
  echo "AC-006: PASS — 차이가 단일 스위치 토큰 하나다"
  exit 0
fi
echo "AC-006: RED — 차이가 1 이 아니다(0=같음, 2 이상=스위치 외 차이)"
exit 1
