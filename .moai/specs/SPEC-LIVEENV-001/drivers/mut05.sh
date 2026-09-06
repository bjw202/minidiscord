#!/usr/bin/env bash
# 변이 ⑤ (AC-LIVEENV-009) 의 기록을 M01-mutation.txt 에 채워 넣는다.
# 이 변이는 실 세션이 있어야만 갈리므로 M8 에서만 실행할 수 있다 — 앞 회차에는 미관측이었다.
set -u
set -o pipefail
WT=$(git -C "$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)" rev-parse --show-toplevel)
EV="$WT/.moai/specs/SPEC-LIVEENV-001/evidence"
M="$EV/M01-mutation.txt"
cd "$WT" || exit 1

BLOCK=$(cat <<'TXT'
## 변이 ⑤ — AC-LIVEENV-009 (봇 디렉터리 .mcp.json 귀속)
# 조작: bot-01/.mcp.json 을 지우고 같은 절차를 반복했다.
#   [주의] 지우기만 하면 `bot` 이 그 파일을 다시 써서 변이가 스스로 되돌아간다. 그래서
#   write_bot_mcp_json 을 «쓰지 않고 성공으로 돌아가게» 함께 막았다. 두 조작이 함께
#   「파일이 없는 채로 세션이 뜬다」 하나의 상태를 만든다.
# [HARD] 이 변이가 이 기준의 유일한 판별 근거다 — 없으면 「원래 붙던 것이 붙었다」와
#   구별되지 않는다. 그리고 실 세션 말고는 만들 수 있는 경로가 없어 M8 에서만 실행된다.

### 변이 전 (초록) — .mcp.json 이 있는 세션
$ scripts/live-env.sh status | grep principal
principal=pm:api=true:conn=1 measured=yes
# 방 메시지 1번(@TO)에 봇이 답했다:
#   2|bot|무작위 영숫자 8자리입니다: q7Rm2XbK
# 그 세션의 대화 기록에 채널 호출과 결과가 짝으로 있다 — 전문은 E09-mcp-attribution.txt.
# 운영자 관측: minidiscord-channel 승인 창이 «떴다».

### 변이 상태 (빨강) — .mcp.json 이 없는 세션
# 운영자 관측: 같은 명령을 같은 자리에서 실행했으나 minidiscord-channel 승인 창이 «뜨지 않았다».
#   승인할 설정 파일 자체가 없기 때문이다.
$ scripts/live-env.sh status | grep principal
principal=pm:api=false:conn=0 measured=yes
# 두 면이 함께 거짓이다 — 웹 API 의 online 도, API 를 거치지 않는 확립 접속 수도 0 이다.
# 방 메시지 3번(@TO)을 넣고 30초를 기다렸으나 봇 메시지가 생기지 않았다:
#   3|user|@TO(pm) 변이 확인용 — 무작위 영숫자 8자리를 지어내 답 끝에 붙여줘
#   (이 시점에 4번은 없었다)
# 그리고 이 세션은 대화 기록 파일을 «한 개도» 남기지 않았다 — 채널 왕복이 없으니
#   ㉡ 이 성립하지 않는다. AC-LIVEENV-009 가 빨개진다.

### 복원 후 (초록) — 파일과 스크립트를 되돌리고 같은 절차를 반복
# 운영자 관측: 승인 창이 «다시 떴다».
$ scripts/live-env.sh status | grep principal
principal=pm:api=true:conn=1 measured=yes
# [HARD] 원인이 그 파일 하나로 좁혀지는 근거 — 변이 중에 «답하지 못했던 바로 그 메시지»(3번)가
#   복원 뒤에 답을 받았다:
#   4|bot|변이 확인 요청 받았어요 … 7Kq3ZmR8
#   메시지를 새로 넣은 것이 아니라 같은 메시지가 처리됐으므로, 달라진 것은 .mcp.json 의
#   존재 여부 하나뿐이다.

### 복원 확인 (바이트 대조)
TXT
)

# [HARD] 해시 «전문» 을 증거에 적지 않는다 — 64자 hex 는 AC-LIVEENV-011 ㉠ 의 훑기 패턴과
# 글자 그대로 같아서, 적는 순간 이 카드의 산출 디렉터리가 절대 0 을 어긴다(실측으로 겪었다).
# 앞 16글자만 적어도 「복원됐는가」 판정은 그대로 선다 — 우연히 앞 16글자가 같으면서 내용이
# 다를 일은 이 용도에서 고려 대상이 아니다. 판정은 아래 restored= 줄이 전문 대조로 낸다.
SH_NOW=$(shasum -a 256 scripts/live-env.sh | cut -d' ' -f1)
SH_PRE=$(shasum -a 256 data/live-env/live-env.sh.premut | cut -d' ' -f1)
MJ_NOW=$(shasum -a 256 bot-01/.mcp.json | cut -d' ' -f1)
MJ_PRE=$(shasum -a 256 data/live-env/mcp.json.premut | cut -d' ' -f1)
SH_NOW_S=$(printf '%s' "$SH_NOW" | cut -c1-16)
SH_PRE_S=$(printf '%s' "$SH_PRE" | cut -c1-16)
MJ_NOW_S=$(printf '%s' "$MJ_NOW" | cut -c1-16)
MJ_PRE_S=$(printf '%s' "$MJ_PRE" | cut -c1-16)

TAIL=$(cat <<TXT
\$ shasum -a 256 scripts/live-env.sh   # 변이 전과 같아야 한다
$SH_NOW_S…(앞 16글자만 적는다)
$SH_PRE_S…  (변이 직전 사본)
restored=$([ "$SH_NOW" = "$SH_PRE" ] && echo yes || echo NO)
\$ shasum -a 256 bot-01/.mcp.json
$MJ_NOW_S…(앞 16글자만 적는다)
$MJ_PRE_S…  (변이 직전 사본)
restored=$([ "$MJ_NOW" = "$MJ_PRE" ] && echo yes || echo NO)
\$ grep -c '변이 5' scripts/live-env.sh   # → 0 (변이 주석이 남지 않았다)
$(grep -c '변이 5' scripts/live-env.sh || true)

### 이 변이가 남긴 상태 — 다음 회차가 오해하지 않도록 적는다
# 이 변이는 세션을 두 번 더 띄웠으므로 봇 디렉터리의 대화 기록 «후보» 가 1개에서 2개로 늘었다
# (변이 전 세션 + 복원 후 세션. 변이 세션 자신은 아무 기록도 남기지 않았다).
# 따라서 지금 같은 디렉터리에 추출기를 걸면 E-3(후보 다수)로 exit=2 가 나온다 — 그것이 옳은
# 거동이며 회귀가 아니다. E09-mcp-attribution.txt 의 측정은 «후보가 정확히 하나» 이던 시점에
# 귀속돼 있고, 그 사실을 그 파일이 스스로 적고 있다(후보 수 = 1).
TXT
)

python3 - "$M" "$BLOCK
$TAIL" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
s = p.read_text()
start = s.index('## 변이 ⑤')
end = s.index('## 변이 ⑥')
p.write_text(s[:start] + sys.argv[2].rstrip() + '\n\n' + s[end:])
print('변이 ⑤ 기록을 채웠다')
PY
