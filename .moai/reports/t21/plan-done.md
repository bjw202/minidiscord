# 카드 t21 — plan 단계 종료 보고

- **카드**: `t21` — `SPEC-COVERAGE-001` §5 문언 정정 (신설 아님)
- **워크트리**: `.claude/worktrees/t21` · 브랜치 `WT-ci-wiring-words`
- **베이스**: `main` `edd982e` + `WT-coverage-tool`(`c6b826a`) 병합 `0b72d75`
- **정정 커밋**: `9e7280e`
- **근거 원문**: `.moai/reports/t13/sync-audit.md` F-03 · `.moai/reports/t13/sync-done.md` §4.4 「§5 CI 문언」 행

---

## 1. 이 카드가 한 일 (한 문단)

`t13` sync 감사가 F-03 으로 반증한 「이 저장소에 CI 배선이 없다」는 서술 중, `t13` 이 `CHANGELOG.md` 에서만 좁히고 SPEC 본문에는 남겨 둔 자리를 고쳤다. SPEC 본문은 `manager-spec` 소유라 `t13`(manager-docs)이 손댈 수 없었고, 그래서 이 카드로 이월된 건이다. 고친 것은 **문언뿐이며 설계 결정·요구사항·수용 기준·범위 경계는 하나도 바뀌지 않았다.**

## 2. 정정 전에 이 카드가 직접 관측한 것

감사 보고서의 주장을 인용하지 않고 이 트리에서 다시 쟀다.

| 확인한 명제 | 실행한 명령 | 관측한 원문 |
|---|---|---|
| CI 배선이 실재하는가 | `find .github -type f` | `.github/labels.yml` · `.github/branch-protection.json.gtmpl` · **`.github/workflows/label-sync.yml`** · `.github/actions/detect-language/action.yml` |
| 그 워크플로가 실제로 도는 형태인가 | `sed -n '1,20p' .github/workflows/label-sync.yml` | `name: Label Sync` / `on:` / `workflow_dispatch:` (+ 주석이 `push to main` 트리거 명시) |
| git 훅이 게이트를 부르는가 | `grep -n "moai gate\|coverage" .git_hooks/pre-commit` | `:65` `    if ! moai gate; then` |
| **그중 커버리지를 부르는 자리가 있는가** | `grep -rn "coverage" .github .git_hooks` | **적중 0건** (출력 없음) |

→ 「배선 자체가 없다」는 **거짓**, 「커버리지를 부르는 CI 가 없다」는 **참**. F-03 의 주장은 이 카드의 재측정으로도 성립한다.

## 3. 고친 자리 — 카드가 지목한 한 자리가 아니라 두 자리였다

`SPEC-COVERAGE-001` 전체를 `CI|배선|Actions|워크플로|workflow|훅` 으로 훑은 결과, 같은 거짓 명제가 **두 자리**에 있었다. 카드 본문과 `t13` 의 이월 기록은 `spec.md` §5 한 자리만 지목했다.

| 자리 | 정정 전 | 정정 후 |
|---|---|---|
| `spec.md:205→206` (§5 Out of Scope — CI 배선) | 「배제 근거: 이 저장소에 아직 그 배선이 없다」 | 배선 둘을 이름으로 적고, **어느 것도 커버리지 명령을 부르지 않는다**로 좁혔다. 「없는 것은 배선이 아니라 «커버리지를 부르는 CI»」를 명시하고, 후속 카드가 할 일이 새 디렉터리 생성이 아니라 기존 배선에 명령을 얹는 것임을 남겼다 |
| `acceptance.md:317` (엣지 케이스 표) | 「CI 가 이 명령을 부른다 / **배선이 아직 없다** / 범위 밖」 | 「… / 기존 배선(`label-sync.yml`·`pre-commit`)이 커버리지 명령을 부르지 않는다 / 범위 밖」 |

**두 자리를 함께 고친 근거**: 한 자리만 고치면 남은 자리가 「정정 완료」 기록을 곧바로 거짓으로 만든다. 이 저장소는 같은 부류로 이미 대가를 치렀다 — `t13` F-05 가 `AC-001` 축약을 「한 번」이라 적었으나 실제로 두 자리였고, 그 정정 기록 자체가 「두 자리를 함께 고쳐야 한다」는 경고를 남겼다. 범위 확대는 **운영자 승인(2026-08-29, AskUserQuestion)** 을 받고 진행했다.

## 4. 함께 바꾼 것 / 일부러 두고 온 것

- **함께 바꿈**: `spec.md` frontmatter `version: 0.2.0 → 0.2.1`, HISTORY 에 `0.2.1` 한 행. `status: completed` 는 그대로다 — 문언 정정은 SPEC 을 다시 열지 않는다.
- **일부러 둠**: `spec.md` HISTORY `0.2.0` 행의 「§1~§8 본문은 한 줄도 바꾸지 않았다」와 `progress.md:382`·`:401` 의 「«CI 배선이 없다» 를 좁혔다」 기록. 셋 다 **그때 참이었던 자기 행위 기록**이며 현재 상태 서술이 아니다. 본문은 지금 참이어야 하고 HISTORY 는 그때 참이면 된다.

## 5. 검증

| 주장 | 명령 | 관측 |
|---|---|---|
| 거짓 문장이 본문에 남지 않았다 | `grep -rn "배선이 없다\|배선이 아직 없다\|아직 그 배선" .moai/specs/SPEC-COVERAGE-001/` | 적중 2건, **둘 다 과거 기록**(`spec.md:23` 새 HISTORY 행이 정정 사유로 인용, `progress.md:382` 가 t13 행위 기록). 현재 상태를 서술하는 자리에는 **0건** |
| 정정 문언이 착지했다 | `grep -n "배제 근거: 자동 실행 배선" spec.md` / `grep -n "기존 배선(" acceptance.md` | `spec.md:206` · `acceptance.md:317` |
| 변경 규모가 문언에 머물렀다 | `git diff --stat` (커밋 전) | `acceptance.md \| 2 +-` · `spec.md \| 5 +++--` — **2 파일, +4/-3** |
| 커밋 게이트 통과 | `git commit` (pre-commit `moai gate` 발화) | `[WT-ci-wiring-words 9e7280e] … 2 files changed` — 거부 없음. 선행으로 `npm install` + `npm run build -w channel` 종료 0 (`channel/dist` 생성)을 실행했다 |

## 6. 미검증 (Gaps)

- **워크플로를 실제로 돌려 보지 않았다.** `label-sync.yml` 이 실재하고 트리거를 가진 것까지는 파일 내용으로 확인했으나, GitHub Actions 를 발화시켜 보지는 않았다. 「커버리지를 부르지 않는다」의 근거는 `grep` 적중 0건이지 실행 관측이 아니다. (`t13` progress.md:401 이 같은 Gap 을 이미 기록해 두었고, 이 카드도 그것을 좁히지 못했다.)
- **`.git_hooks/pre-commit` 의 `moai gate` 내부가 커버리지를 부르지 않는다는 것은 재지 않았다.** `moai gate` 는 이 저장소 밖 바이너리이고, 이 카드는 훅 파일 본문만 읽었다. `moai gate` 가 내부적으로 커버리지를 호출할 가능성은 배제하지 못했다 — 다만 커밋 시 실제 발화에서 커버리지 리포트가 출력되지 않았다.
- **형제 문서 전수는 훑지 않았다.** 훑은 범위는 `.moai/specs/SPEC-COVERAGE-001/` 4 파일이다. 다른 SPEC 에 같은 거짓 문장이 있는지는 이 카드 범위 밖이다.

## 7. 잔여 위험

- 정정 문언이 `.github/workflows/label-sync.yml` 이라는 **구체적 파일 이름을 박았다.** 그 파일이 나중에 이름이 바뀌거나 삭제되면 이 문장이 다시 거짓이 된다. 이름 대신 「기존 워크플로」로 뭉뚱그리면 이 위험은 없지만, 후속 카드가 배선을 못 찾는 원래 결함이 되살아난다 — 구체성을 택했다.
- 이 브랜치는 **미푸시이고 원격이 없다.** `WT-ci-wiring-words` 워크트리가 이 정정의 유일 사본이다. 리드가 통합하기 전에 나무를 지우면 작업이 사라진다.

## Card Cross-Check

| 마일스톤 | 전달 카드 | 큐 확인 |
|---|---|---|
| `SPEC-COVERAGE-001` §5 CI 문언 정정 | `t21` | 리드가 발급·디스패치한 카드 (`moai todo` 대조는 리드 소유) |
| `acceptance.md:317` 동일 문언 정정 | `t21` (운영자 승인으로 범위 편입) | 신규 카드 불필요 |
| CI 에 커버리지 명령 배선 | **미발급** — `t13` sync-done §4.4 「CI 배선」 행이 후속 카드로 남겨 둔 항목. 이 카드는 문언만 고쳤고 배선은 하지 않았다 | 운영자 결정 필요 |
| `F-02` (`FILE_COUNT=11` 이 정상 구현을 거짓 실패시킨다) | **미발급** — `t13` sync-done §4.4 이월 | 운영자 결정 필요 |
