#!/bin/bash
# M3 대조 실행 — SPEC-WSUPGRADE-001 (card t39)
# REQ-005: 두 팔은 파일 병렬 스위치 하나만 다르다 (REQ 글자 그대로 이행).
# REQ-006: 각 팔 20회. D-1: 배경 부하 스폰 없음 — 이 스크립트는 §B 의 절차 자체를
#          순차로 돌릴 뿐 인공 경합을 만들지 않는다. 두 팔을 동시에 돌리면 그
#          자체가 인공 부하가 되므로 절대 병렬로 돌리지 않는다.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
# m3 → t39 → reports → .moai → worktree root: 4 단계. (1 차 시도에서 3 단계로
# 잘못 계산해 40 회 전부 cd 실패 — driver-fail1-cd-path.{log,txt} 에 보존했다.)
SRV="$HERE/../../../../server"
[ -f "$SRV/package.json" ] || { echo "server dir not found (no package.json): $SRV" >&2; exit 2; }
SUMMARY="$HERE/summary.txt"

: > "$SUMMARY"
echo "=== parallel arm (npx vitest run) x20 ===" >> "$SUMMARY"
for i in $(seq 1 20); do
  if (cd "$SRV" && npx vitest run > "$HERE/parallel-$i.log" 2>&1); then
    echo "P$i PASS" >> "$SUMMARY"
  else
    echo "P$i FAIL" >> "$SUMMARY"
  fi
done

echo "=== serial arm (npx vitest run --no-file-parallelism) x20 ===" >> "$SUMMARY"
for i in $(seq 1 20); do
  if (cd "$SRV" && npx vitest run --no-file-parallelism > "$HERE/serial-$i.log" 2>&1); then
    echo "S$i PASS" >> "$SUMMARY"
  else
    echo "S$i FAIL" >> "$SUMMARY"
  fi
done

echo "DONE" >> "$SUMMARY"
