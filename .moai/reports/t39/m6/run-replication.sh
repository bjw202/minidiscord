#!/bin/bash
# M6 복제 — SPEC-WSUPGRADE-001 v0.7.0 acceptance §B-2 (card t39)
# REQ-012: 사전 선언 고정 20회·중도 정지 없음(첫 포획에서 멈추면 분모가 무너진다).
# 사상은 «포획 N건 / 시행 20» — §5.5 세 갈래는 대조의 규칙이라 복제에 쓰지 않는다.
# D-1 위반 아님 — 관측된 명령(moai gate)이 스스로 띄우는 것을 그대로 도는 것이다.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# m6 → t39 → reports → .moai → worktree root: 4 단계. (1 차 시도에서 3 단계로
# 잘못 계산해 ROOT 가 .moai 를 가리켰고, gate 는 설정·툴체인을 못 찾아 20 회 전부
# 조용히 exit 0 — summary-invalid-root-path.txt 와 /tmp/t39-invalid-gate/ 에 보존.)
ROOT="$(cd "$HERE/../../../.." && pwd)"
CAPDIR="$HERE/../captures"                     # 하네스가 첫 포획 때 만드는 자리
SUMMARY="$HERE/summary.txt"
# 내용 기반 검증 — 디렉터리 존재만으로는 .moai 같은 엉뚱한 곳을 못 걸러냈다.
[ -f "$ROOT/package.json" ] || { echo "project root not found (no package.json): $ROOT" >&2; exit 2; }

capcount() { ls "$CAPDIR" 2>/dev/null | wc -l | tr -d ' '; }

: > "$SUMMARY"
for i in $(seq 1 20); do
  BEFORE=$(capcount)
  # t0·t1 — 시행이 실제로 무언가를 돌았다는 양성 증거(리드 지시 2026-09-05). «초록»은
  # «돌고 통과했다»와 «돌 것을 못 찾아 할 일이 없었다»가 같은 exit 0 을 내므로, 정상
  # gate ~82초 대 무효 ~1초가 이 두 열로 사후 판독된다.
  T0=$(date +%s)
  if (cd "$ROOT" && moai gate > "$HERE/gate-$i.log" 2>&1); then
    RC=0
  else
    RC=$?
  fi
  T1=$(date +%s)
  AFTER=$(capcount)
  CAPS=$((AFTER - BEFORE))
  # 포획 디렉터리가 이 시행에 처음 만들어진 경우(이전 0) 감산이 음수로 흐르지 않게
  if [ "$CAPS" -lt 0 ]; then CAPS=$AFTER; fi
  echo "trial=$i rc=$RC captures=$CAPS t0=$T0 t1=$T1" >> "$SUMMARY"
done
echo "DONE" >> "$SUMMARY"
