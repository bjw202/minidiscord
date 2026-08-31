#!/bin/sh
# J-03 재측정 — plan.md §B-0d 부류 훑기의 재현 명령 (M1, v0.4.1 나무).
# 측정 규칙: 개수 단위는 «적중 자리»(grep -o 출현 수), 범위는 이 SPEC 의 다섯 문서.
# 이 값들은 자기 포함(self-inclusive)이다 — §B-0b·§B-0d 표 자신의 행이 어간을 포함하면 그것도 센다.
F1=".moai/specs/SPEC-GWAUTH-002/spec.md"
F2=".moai/specs/SPEC-GWAUTH-002/plan.md"
F3=".moai/specs/SPEC-GWAUTH-002/acceptance.md"
F4=".moai/specs/SPEC-GWAUTH-002/design.md"
F5=".moai/specs/SPEC-GWAUTH-002/research.md"
ALL="$F1 $F2 $F3 $F4 $F5"

echo "== c1 발신 경로 열거 =="
grep -oh 'sendToBot' $ALL | wc -l
echo "== c2 §5 표 행 서수 =="
grep -oh '째 행' $ALL | wc -l
echo "== c3 AC/REQ ID 범위 =="
grep -ohE '00[0-9]~0' $ALL | wc -l
echo "== c4 개수 서술 =="
grep -ohE '스물|열여덟|기준 [0-9]*건' $ALL | wc -l
echo "== c5 열쇠 유도 헬퍼 =="
grep -ohE 'challengeProof|authSig|sessKey|envOf' $ALL | wc -l
echo "== c6 하네스 접근자 =="
grep -ohE 'channelBinding|serverBinding|stderrLines|readIds' $ALL | wc -l
echo "== c7 절 포인터 =="
grep -ohE '§2\.8\.[0-9]' $ALL | wc -l
echo "== c8 후속 카드 포인터 =="
grep -ohE '후속 카드|별도 카드|t23' $ALL | wc -l
echo "== c9 변이표 letter 범위 =="
grep -ohE 'A~Y' $ALL | wc -l
echo "== c11 대응 주장 (id 와 방어 동사가 같은 줄 — id 출현 수) =="
grep -hE '(AC|REQ)-GWAUTH2?-[0-9]{3}' $ALL | grep -E '지킨|잰다|재는|막는|닫는다|닫힌다|종결한|보장|커버|대신한|잡는|붉히' | grep -oE '(AC|REQ)-GWAUTH2?-[0-9]{3}' | wc -l
echo "== c11 부수: 좁은 어간(잡는·붉히 없음) 버전 =="
grep -hE '(AC|REQ)-GWAUTH2?-[0-9]{3}' $ALL | grep -E '지킨|잰다|재는|막는|닫는다|닫힌다|종결한|보장|커버|대신한' | grep -oE '(AC|REQ)-GWAUTH2?-[0-9]{3}' | wc -l
echo "== DONE =="
