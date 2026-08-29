---
name: scope-check-is-not-a-regression-test
description: minidiscord SPEC의 "범위 경계" AC(기준 SHA 대비 git diff 파일집합)는 카드 1회용 검사라 다른 카드의 형제 비회귀 목록에 넣으면 정의상 실패한다
metadata:
  type: project
---

각 SPEC의 마지막 AC 두 개는 회귀 테스트가 아니다.

- `범위 경계` AC (`AC-CHANPERM-011`, `AC-CHANCLIENT-015`, `AC-CHANAUTH-012` …) — 그 SPEC 자신의 `.spec-base-sha` 대비 `git diff --name-only` 파일 집합을 단언한다.
- `RED→GREEN 전이` AC (`AC-*-012`, `AC-*-016` …) — 마일스톤 전이 기록이며 vitest 테스트가 아니다.

**Why:** 후속 카드가 같은 패키지의 다른 파일을 고치면 첫 부류는 **정의상 실패**하고(파일 집합이 늘어난다), 둘째 부류는 `--reporter=verbose` 출력에 `✓` 줄이 아예 없다. t9 2회차 감사에서 확인: `git diff --name-only <CHANPERM base>` 는 이미 3줄(`gateway-client.ts` 포함)이라 `AC-CHANPERM-011` 이 HEAD에서 이미 실패 중인데, t9의 품질 게이트가 `AC-CHANPERM-001..012` 전건 `✓` 를 요구했다.

**How to apply:** SPEC이 "형제 비회귀 목록"에 `AC-XXX-001..N` 처럼 범위로 적으면 끝 번호 두 개를 반드시 열어 본다. 그리고 이 저장소의 테스트 이름에는 AC 번호가 들어 있지 않으므로("`✓` 줄" 이라는 표현이 어느 기준에도 글자 그대로 성립하지 않는다) 대응을 AC 본문의 `it(...)` 코드로 되짚어야 한다는 점도 함께 지적한다.

관련: [[correction-may-not-cover-whole-card]], [[criteria-outside-the-regression-suite]]
