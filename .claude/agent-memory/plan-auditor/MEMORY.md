# Memory Index

- [범위 경계 AC는 회귀 테스트가 아니다](project_scope-check-is-not-a-regression-test.md) — 기준 SHA 대비 파일집합 검사·전이 기록을 다른 카드의 형제 비회귀 목록에 넣으면 정의상 실패한다 (t9 2회차, 2026-08-28)
- [규칙을 강화하면 모든 행을 다시 도출한다](rule-strengthening-needs-full-rederivation.md) — 표 머리 규칙만 강하게 바꾸고 한 행만 고치면 나머지 행이 새 규칙 아래 조용히 거짓이 된다 (t9 3회차, 2026-08-28)
- [추출한 라우트가 테스트 쪽에서만 측정된다](extracted-route-measured-only-on-test-side.md) — 하네스가 새 함수를 써도 index.ts 가 그것을 부르는지 재는 AC 가 없으면 프로덕션 게이트가 빠져도 전건 초록 (t11, 2026-08-29)
- [대책이 게이트에만 착지한다](countermeasure-lands-only-in-the-gate.md) — 재발 방지책이 완료 정의에만 들어가고 마일스톤 작업 목록·판정 범위 선언은 그대로면, 검사 가능한 조건인데 실행 주체가 없다 (t11 3회차, 2026-08-29)
- [범위 확대가 지난 라운드의 주석을 뒤집는다](widening-falsifies-last-rounds-annotations.md) — 형제 문서에 써 둔 개정 주석이 정반대 거짓이 되는데 "주석이 달렸는가"만 보는 완료 조건은 통과시킨다 (t11 2회차, 2026-08-29)
- [분리 논증이 낡은 구현 위에 서 있다](separation-proved-against-old-implementation.md) — 「형제 게이트를 지워도 통과한다」를 현행 코드로 검산하면 참인데, 계획이 지시한 새 구현이 관계를 뒤집어 착지 순간 거짓이 된다 (t15 1회차, 2026-08-29)
- [실행하지 않은 명령을 인용했다](quoted-a-command-i-did-not-run.md) — 목록을 눈으로 세고 «$ cmd → 44» 로 적었는데 실제 실행값은 67; 인용은 그 형태 그대로 돌린 출력만 붙인다 (t15, 2026-08-29)
- [한 파일만 훑으면 나머지가 낡는다](one-file-sweep-leaves-the-other-two.md) — 같은 자리를 세 문서가 인용하는데 한 곳만 재도출; t15에서 네 라운드 연속 재현, 매번 직전 정정이 다음 인스턴스를 만들었다 (2026-08-29)
- [열쇠를 모른다는 것은 배제 근거가 아니다](not-knowing-the-key-is-not-an-exclusion.md) — 진짜 서버가 오라클이면 열쇠 없이 증명을 얻고, 서명 한 건을 중계하면 세션을 가져간다 (t22, 2026-08-30)
- [훑기 부류 목록은 하한이다](sweep-class-list-is-a-lower-bound.md) — 3회차는 목록 밖에서, 4회차는 새로 더한 그 부류 «안에서» 같은 가족이 났다; 병목은 목록이 아니라 판독 깊이 (t22, 2026-08-30)
- [훑기 표는 자기를 센다](sweep-table-counts-itself.md) — 표 행이 자기 어간을 포함하고 이후 편집이 값을 늘려 여섯 부류 중 다섯이 재현 실패; 명령·자기제외·측정시점을 함께 적어야 귀속이 선다 (t22 4회차, 2026-08-30)
- [부정 단언은 누락에 초록이다](negative-assertion-is-green-on-absence.md) — 「안 왔음」을 재는 기준은 프레임이 아예 생산되지 않아도 통과; 생산 지점은 문서 열거 말고 grep 으로 센다 (t22, 2026-08-30)
