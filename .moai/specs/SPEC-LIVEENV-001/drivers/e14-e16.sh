#!/usr/bin/env bash
# AC-LIVEENV-014 (예행) · AC-LIVEENV-015 · AC-LIVEENV-016 (울타리) 의 증거를 만든다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
BASE=5edd97f     # progress.md §E.2 가 귀속시킨 리터럴. 변수로 두지 않는다
mkdir -p "$EV"
cd "$WT" || exit 1

# ── AC-LIVEENV-014 ───────────────────────────────────────────────────
E14="$EV/E14-dry-run.txt"
{
  echo "# AC-LIVEENV-014 — 가짜 채널 예행이 실 세션보다 먼저 돈다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo '$ npm run live-dryrun'
} > "$E14"
npm run live-dryrun >> "$E14" 2>&1
echo "# exit=$?" >> "$E14"

{
  echo ""
  echo '$ ls .moai/specs/SPEC-LIVEENV-001/evidence/dryrun/   # 산출 파일 목록'
  ls "$EV/dryrun/"
} >> "$E14"

# ── [HARD] ㉢ 의 양성 대조군 — 판별자가 아무것도 잡지 못하는 형태가 아님을 배제한다 ──
# 좁은 판별자(플래그 문자열)에 걸리는 프로세스를 예행 «밖에서» 하나 띄운다.
( exec -a "node --dangerously-load-development-channels server:probe" sleep 30 ) >/dev/null 2>&1 &
DECOY=$!
sleep 0.5
{
  echo ""
  echo "# --- 양성 대조군 ①: 좁은 판별자에 걸리는 프로세스를 예행 밖에서 띄웠다(pid $DECOY) ---"
  echo '$ pgrep -f ''dangerously-load-development-channels'' | wc -l   # → 1 이상'
  pgrep -f 'dangerously-load-development-channels' | wc -l | tr -d ' '
} >> "$E14"
kill "$DECOY" 2>/dev/null
wait "$DECOY" 2>/dev/null
sleep 0.3
{
  echo '$ kill <대조군>; pgrep -f ... | wc -l   # → 0 (되돌렸다)'
  pgrep -f 'dangerously-load-development-channels' | wc -l | tr -d ' '
  echo "# 양성 대조군 ②(자손 판별자)는 예행 자신이 낸다 — dryrun-report.txt 의"
  echo "#   pgrep_descendant_any 가 1 이상이면 그 명령이 침묵하는 형태가 아님이 배제된다."
  grep '^pgrep_descendant_any=' "$EV/dryrun/dryrun-report.txt"
} >> "$E14"

# ── AC-LIVEENV-015 ───────────────────────────────────────────────────
E15="$EV/E15-fence.txt"
{
  echo "# AC-LIVEENV-015 — SPEC-LIVEVERIFY-001 이 한 글자도 바뀌지 않았다"
  echo "# head=$(git rev-parse --short HEAD) · BASE=$BASE (리터럴)"
  echo '$ git rev-parse --short 5edd97f   # 기준선 생존 가드'
  git rev-parse --short "$BASE" 2>&1
  echo "# 가드 exit=$?"
  echo '$ git diff --name-only 5edd97f..HEAD -- .moai/specs/SPEC-LIVEVERIFY-001/ | wc -l   # → 0'
  git diff --name-only "$BASE"..HEAD -- .moai/specs/SPEC-LIVEVERIFY-001/ | wc -l | tr -d ' '
  echo '$ git status --porcelain -- .moai/specs/SPEC-LIVEVERIFY-001/ | wc -l               # → 0'
  git status --porcelain -- .moai/specs/SPEC-LIVEVERIFY-001/ | wc -l | tr -d ' '
} > "$E15"

# ── AC-LIVEENV-016 ───────────────────────────────────────────────────
E16="$EV/E16-sibling-e2e016.txt"
{
  echo "# AC-LIVEENV-016 — 형제 기준 AC-E2E-016 이 여전히 초록이다"
  echo "# head=$(git rev-parse --short HEAD)"
  echo ""
  echo '# 측정 ①(수행 주장 부재 — 무조건) → exit=1'
  grep -rEn "수동 검증(을)? ?(수행|완료)|실 세션으로 (확인|검증)|사람이 (직접 )?확인했" \
    README.md scripts/ .moai/specs/SPEC-E2E-001/ | grep -v 'AC-016-EXEMPT'
  echo "exit=$?"
  echo ""
  echo '# 측정 ①-b(면제된 주장의 수) → 7 이하'
  grep -rE "수동 검증(을)? ?(수행|완료)|실 세션으로 (확인|검증)|사람이 (직접 )?확인했" \
    README.md scripts/ .moai/specs/SPEC-E2E-001/ | grep -c 'AC-016-EXEMPT'
  echo ""
  echo '# 측정 ①-c(면제 표지 우회 통로 차단) → 합이 0'
  grep -rc 'AC-016-EXEMPT' README.md scripts/ 2>/dev/null
  echo ""
  echo '# 측정 ②(유료 API 무호출 — 무조건) → exit=1'
  grep -rEn "anthropic|claude\.ai|api\.anthropic|spawn\(['\"]claude" scripts/
  echo "exit=$?"
  echo ""
  echo '# 측정 ③ — 해당 없음 (이 카드는 README.md 에 수동 체크리스트를 싣지 않는다)'
  echo ""
  echo '# 루트 package.json — 기존 test·e2e 열쇠의 값이 그대로인가'
  echo '$ git diff -- package.json | grep -cE ''^[-+][[:space:]]*"(test|e2e)":''   # → 0'
  git diff -- package.json | grep -cE '^[-+][[:space:]]*"(test|e2e)":'
  echo '$ git diff --stat -- package.json'
  git diff --stat -- package.json
  echo ""
  echo '$ git status --porcelain -- .moai/specs/SPEC-E2E-001/ | wc -l   # → 0'
  git status --porcelain -- .moai/specs/SPEC-E2E-001/ | wc -l | tr -d ' '
} > "$E16"

echo "E14/E15/E16 작성 완료"
