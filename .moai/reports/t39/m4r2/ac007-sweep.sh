#!/bin/bash
# SPEC-WSUPGRADE-001 M4 — AC-WSUPGRADE-007 훑기 도구(.moai/reports/t39/m4/).
# 목록은 두 명령의 합집합이다: git diff --name-only 620af7a (추적 변경) ∪
# git status --porcelain --untracked-files=all 의 ?? 항목(미추적 전체 — 디렉터리를 접지 않는다).
# .md 는 부류 제외다 — 「이 문서는 면제」가 아니라 「마크다운은 실행되지 않는다」(acceptance AC-007).
# 술어 어간은 이 파일 안에서 조립해 쓴다("sp""awn" 따위) — 훑기 도구 자신이 술어 원문을
# 한 줄에 담아 자기에게 적중하는 자기측정을 막기 위해서다. 도구의 패턴 문자열은 스폰 자리가
# 아니라 기록물이므로, 조립은 면제가 아니라 자기측정 방지다.
#
# 용법: bash ac007-sweep.sh            → 깨끗한 트리 훑기(적중 0 건이면 exit 0)
#       목록·적중은 같은 디렉터리의 ac007-list.txt·ac007-hits.txt 에 남긴다.
set -u
BASE="620af7a"
MODE="${1:-union}"
OUTDIR="$(cd "$(dirname "$0")" && pwd)"
PAT="$(printf '%s|%s|%s|%s|%s' "sp""awn" "ex""ec" "ex""ecS""ync" "fo""rk" "child_""proce""ss")"

case "$MODE" in
  union)    # 본 기준 — 두 명령의 합집합
    {
      git diff --name-only "$BASE"
      git status --porcelain --untracked-files=all | sed -n 's/^?? //p'
    } | sort -u > "$OUTDIR/ac007-list.txt" ;;
  diffA)    # 보조 변이(범위를 잰다) — 새로 추가된 파일만, git status 항 없음
    git diff --name-only --diff-filter=A "$BASE" > "$OUTDIR/ac007-list.txt" ;;
  diffony)  # 보조 변이(합집합을 잰다) — git diff 항만
    git diff --name-only "$BASE" > "$OUTDIR/ac007-list.txt" ;;
  no-ufall) # 보조 변이(합집합을 잰다) — --untracked-files=all 없이(디렉터리가 접힌다)
    {
      git diff --name-only "$BASE"
      git status --porcelain | sed -n 's/^?? //p'
    } | sort -u > "$OUTDIR/ac007-list.txt" ;;
  allow-ts) # 보조 변이(필터의 방향을 잰다) — 부류 제외(.md 뺌)를 허용 목록(.ts 만)으로 뒤집음
    {
      git diff --name-only "$BASE"
      git status --porcelain --untracked-files=all | sed -n 's/^?? //p'
    } | sort -u | grep '\.ts$' > "$OUTDIR/ac007-list.txt" ;;
  *) echo "unknown mode: $MODE" >&2; exit 2 ;;
esac

HITS="$OUTDIR/ac007-hits-$MODE.txt"
: > "$HITS"
list_n=0
hit_n=0
while IFS= read -r f; do
  [ -n "$f" ] || continue
  if [ "$MODE" != "allow-ts" ]; then
    case "$f" in *.md) continue ;; esac   # 부류 제외 — 마크다운은 실행되지 않는다
  fi
  list_n=$((list_n + 1))
  [ -f "$f" ] || continue   # 기준 SHA 대비 지워진 파일 — 훑을 수 없어 적중도 아니다
  if grep -nE -- "$PAT" "$f" >> "$HITS"; then
    hit_n=$((hit_n + 1))
  fi
done < "$OUTDIR/ac007-list.txt"

echo "ac007-sweep mode=$MODE list(non-md)=$list_n hit-files=$hit_n"
[ "$hit_n" -eq 0 ]
