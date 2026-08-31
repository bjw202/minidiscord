#!/bin/sh
# J-03 — 부류별 적중 위치 (분류표 작성용). c1·c2·c4·c9·c11 셀프캐치와 c4 의 −2 원인을 판독한다.
ALL=".moai/specs/SPEC-GWAUTH-002/spec.md .moai/specs/SPEC-GWAUTH-002/plan.md .moai/specs/SPEC-GWAUTH-002/acceptance.md .moai/specs/SPEC-GWAUTH-002/design.md .moai/specs/SPEC-GWAUTH-002/research.md"
echo "== c4 개수 서술 적중 =="
grep -onE '스물|열여덟|기준 [0-9]*건' $ALL
echo "== c1 sendToBot 적중 =="
grep -on 'sendToBot' $ALL
echo "== c2 째 행 적중 =="
grep -on '째 행' $ALL
echo "== c9 A~Y 적중 =="
grep -onE 'A~Y' $ALL
echo "== c11 적중 줄 수 (라인 단위 비교용) =="
grep -hE '(AC|REQ)-GWAUTH2?-[0-9]{3}' $ALL | grep -cE '지킨|잰다|재는|막는|닫는다|닫힌다|종결한|보장|커버|대신한|잡는|붉히'
echo "== DONE =="
