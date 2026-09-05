# Memory Index

- [역방향 훑기가 다른 질문에 답한다](reverse-sweep-answers-a-different-question.md) — "내가 편집한 자리는 전부 표 안"은 과잉 편집을 잴 뿐 탐지 누락을 재지 않음; t34 에서 23자리 발견 (2026-09-04)
- [패키지 경계를 넘는 변이는 실패할 수 없다](mutation-across-a-package-boundary-cannot-fail.md) — 판정 스위트가 변이 대상을 import 하지 않으면 "0건"은 위상 사실; import 검사를 먼저 (2026-09-04)
- [하네스가 능력 하나를 필드별로 가른다](harness-splits-one-capability-across-fields.md) — 위조자에게 nonce·request_id 는 읽게 하고 token 만 못 읽게 하면 부정 기준 다섯이 통째로 공허해진다; 능력 단위로 셀 것 (t15)
- [훑기는 값으로, 편집한 대상으로 하지 말 것](sweep-by-the-value-not-the-object.md) — 정정이 숫자를 바꾸면 그 숫자로 훑을 것; t15 는 「O 행」으로 훑어 같은 파일의 다른 표를 3라운드 연속 놓쳤다
- [어간 집합은 바뀐 것에서 도출한다](stem-set-comes-from-what-changed.md) — t22: 집합이 저장 형태만 겨눠 프레임 형태를 놓쳤고 문서 2곳·테스트 1곳이 함께 살아남았다
- [커버리지는 src × 시험이다](coverage-is-src-times-tests.md) — 「src 를 안 건드렸으니 커버리지 불변」은 논거가 아니다; 시험만 바뀌어도 실행 경로가 바뀐다 (t22 3회차)
- [실패한 명령을 통째로 다시 돌린다](rerun-the-failed-command-not-a-subset.md) — 실패한 파일만 격리 재실행한 초록은 증거가 아니다; t22 에서 그 흔들림이 다른 자리로 재출현
- [삽입은 자기 앵커를 낡게 만든다 — 그러나 귀속은 별개 주장이다](insertion-invalidates-its-own-anchors.md) — 「낡았다」≠「이 수리가 낡게 했다」; 상대 변위 말고 기준선 시점의 내용 일치로 판정할 것 (t34 3회차: 2회차의 35 중 16 이 오귀속)
- [문서에 실린 명령이 조용히 0 을 낸다](documented-command-can-return-a-silent-zero.md) — zsh 는 `$F` 를 낱말 분리하지 않아 훑기 전체가 종료 코드 0·빈 출력; 인용된 명령은 인용된 형태 그대로 돌려 볼 것 (t34 H-01)
- [형제 기준이 기준 하나를 공허하게 만든다](sibling-criterion-makes-a-criterion-vacuous.md) — 사전 상태 0 을 통과해도, 같은 범위에 형제 기준의 의무 편집이 같은 어간을 심으면 그 줄을 지워도 초록이다 (t6 AC-E2E-014 ㉠)
- [대체값이 이분 판정을 뒤집는다](fallback-value-flips-the-binary-judgment.md) — 내가 권고한 `?? 0` 이 「필드 있고 안 비었으면 통과」를 통과시켰을 것; 수리 권고 전에 기준의 통과 조건부터 (t39 2회차, 2026-09-05)
- [「이미 옳다」 딱지가 붙은 인용은 훑기를 빠져나간다](quoted-canon-labeled-correct-escapes-sweeps.md) — t38: README:242 수정이 LIVEVERIFY:228 의 정본 인용을 낡게 했는데 그 칸엔 「이미 옳다」가 적혀 있었다; 훑기 근거와 결론은 따로 판정 (2026-09-06)
