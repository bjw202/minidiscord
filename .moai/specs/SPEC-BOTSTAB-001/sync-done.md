# SPEC-BOTSTAB-001 sync 종결 보고 (카드 `t25`)

> 작성: sync 레인(카드 t25 · `/moai sync SPEC-BOTSTAB-001` · lens `--security --deep`). 2026-09-02.
> 나무 `.claude/worktrees/t25`, 브랜치 `WT-bot-stability`, 인계 시점 HEAD `ee7dd40`.

## 쉬운 말 요약

디스패치가 실은 다섯 가지를 전부 이행했다. 훑기를 다시 돌려 대상 블록 **34개**를 얻었고, 그 34개 전부에서 상한·시길 상수를 쓰는 실행되는 단언을 찾아 **미착지 0건**으로 판정했다. 형제 SPEC 두 자리 개정은 **본문 소유권이 manager-spec 에 있어 재위임해서** 집행했다 — 규칙이 정한 경로이지 우회가 아니다. 스위트 121개와 타입 검사를 직접 돌려 초록을 확인했고, CHANGELOG 항목과 README 정정을 넣었으며, run 단계가 미커밋으로 남긴 `run-done.md` 를 이 커밋에 흡수했다. **리드 판정이 필요한 것은 셋**이고 §5 에 모았다 — 개정이 낡게 만든 형제 8자리(미편집), 각주 줄 인용의 앵커 대체, 그리고 §M 이 원래 사지 못하는 넷.

## §1 디스패치 다섯 항목 이행

| 항목 | 상태 | 근거 |
|------|------|------|
| ① 훑기 재실행 | 이행 | `node .moai/state/verify/t25-plan/sibling-sweep.mjs` exit 0 · 생출력 **34블록** · 원본 `.moai/state/verify/t25-sync/{sweep-plain.txt, sweep.json}` |
| ② 블록별 착지 판정 | 이행 | **34/34 착지 · 미착지 0건.** 기준은 «상수를 인자로 쓰는 실행되는 단언의 존재»(plan.md §M-2), 상수 식별자 존재가 아니다 |
| ③ 결과 기록 | 이행 | `.moai/reports/t25/sync-sibling-assertion-check.md` — §M-3 네 항목(명령·종료 코드·블록 수 / 블록별 표 / 미착지 목록 / 종합 판정) 전부 수록 |
| ④ AM-1·AM-2 집행 | 이행 (재위임) | `SPEC-CHANINJECT-001/spec.md` 단일 파일 `+9/-4` — §2 참조 |
| ⑤ run-done.md 흡수 | 이행 | 이 sync 커밋에 포함(t8 선례) |

**§M-1 스냅숏 대조.** `spec.md` §3.3 스냅숏은 21블록, 살아 있는 출력은 34블록이다. 규정이 «출력이 이긴다» 이므로 34 기준으로 판정했다. 차분 13 = M3·M4 신설 12 + AC-BOTSTAB-010 배선 목격 1(`channel-server.test.ts:547`). 리드가 디스패치에 명시한 「33→34 차분 = :547」과 일치한다.

**§M-4.** 미착지 목록이 비어 있으므로 통과다.

## §2 형제 개정 — 소유권 경로를 밝힌다

디스패치는 «소유권 규칙이 가로막으면 편집하지 말고 블로커 보고» 라고 했다. **가로막지 않았다** — 규칙은 이 일을 금지한 것이 아니라 **경로를 지정**한다. `spec-frontmatter-schema.md` § Forbidden ownership crossings 는 sync 담당(manager-docs)의 SPEC 본문 편집을 금지하면서 그 해결책을 함께 적는다: 오케스트레이터가 `manager-spec` 에 재위임한다. 그대로 했다.

- 대상 `SPEC-CHANINJECT-001` 은 이미 `status: in-progress` · `amendment_of: SPEC-CHANINJECT-001` — 개정 절차가 열려 있어 완료→개정 전이가 불필요했다.
- 착지: **AM-1** `§4.2` 비파괴 단락 — 삭제·절단·마스킹 금지를 **중화 단계**로 한정하고 렌더 예산 절단을 `SPEC-BOTSTAB-001` REQ-BOTSTAB-007·010 소유의 별도 단계로 명시. **AM-2** `REQ-CHANINJECT-002` 일반 문언 — 글자 그대로의 동일성을 «봉투 시퀀스 없음 + 표시 시길 없음 + 렌더 상한 이하» 로 조건화. 두 자리 모두에 개정 각주와 판단 표시 문장.
- 함께: HISTORY `0.3.4` 행, frontmatter `version` `0.3.3→0.3.4` · `updated` `2026-08-29→2026-09-02`.
- 범위: **파일 하나만 바뀌었다.** `git diff --stat` 이 `.moai/specs/SPEC-CHANINJECT-001/spec.md` 한 줄만 낸다 — 다른 SPEC·코드·테스트 무변경.

## §3 직접 관측한 게이트 (sync 레인 실행)

| 항목 | 명령 | 결과 |
|------|------|------|
| 채널 스위트 | `npx vitest run --root channel --reporter=dot` | **121 passed / 7 files**, exit 0 (`.moai/state/verify/t25-sync/suite.txt`) |
| 타입 검사 | `npm run typecheck -w channel` | exit 0 (`.moai/state/verify/t25-sync/typecheck.txt`) |
| 훑기 | `node .moai/state/verify/t25-plan/sibling-sweep.mjs` | exit 0 · 34블록 |

**귀속.** 세 수치는 전부 이 트리에서 sync 레인이 직접 실행해 관측했다. run 단계 보고의 121 과 일치하지만, **일치는 재실행으로 확인한 것이지 인용한 것이 아니다.**

## §4 문서 동기화

- `CHANGELOG.md` — `[Unreleased]` 최상단에 카드 `t25` 항목 신설. 선행 중복 검사 `grep -c "SPEC-BOTSTAB-001" CHANGELOG.md` = **0**. 항목에 적은 상한 다섯 개·표시 문언·코드포인트 경계 절단·커서 계산원은 전부 `channel/src/truncate.ts`·`channel/src/index.ts` 원문으로 대조했다.
- `README.md` — `fetch_history` 서술 정정. 개정 전에는 이력 원소가 «봉투 중화를 거쳐 나온다» 까지만 적혀 있어 이번 변경으로 낡았다. 절단·표시·시길 탈출·새것부터 버리기·커서 계산원을 더했다. 이 저장소가 「정정이 스스로 낡은 기록을 남긴다」로 이름 붙인 부류를 sync 가 자기 차례에서 닫은 자리다.

## §5 리드 판정이 필요한 것 (셋)

1. **형제 개정이 낡게 만든 8자리 — 미편집, 보고만.** AM 범위가 `spec.md` §3.2 문언대로 «두 자리뿐» 이라 손대지 않았다. `SPEC-CHANINJECT-001` `spec.md:123`·`:292`, `acceptance.md:116`·`:118`·`:287`·`:308`·`:724`·`:734`, `plan.md:115`. **성질**: 요구사항 층은 좁아졌는데 그것을 재는 수용 기준 층은 옛 무조건 문언 그대로다 — 스위트는 어느 쪽이든 초록이라 신호를 내지 않는다. 후속 카드 발급 여부는 리드 몫.
2. **AM-1 각주의 줄 인용 대체.** 원 문안은 «이 SPEC `:313` 이 적은 대로» 였는데, 이 개정 자신이 줄을 밀어 그 인용이 즉시 거짓이 된다. 헤딩 앵커(«이 SPEC 이 REQ-CHANINJECT-002 아래에 적은 대로»)로 바꿔 적용했다 — **«문안 그대로» 에서 벗어난 유일한 자리**다. 바이트 단위 동일이 요구였다면 되돌려야 한다.
3. **§M 이 사지 못하는 넷은 이 판정으로 닫히지 않는다.** 단언이 옳게 재는가 · 기존 단언이 지워졌는가 · 훑기가 실제로 돌았는가 · 연속 관측. `plan.md` §M 표 그대로이며 일부는 `t28` 소유다. 이 보고가 «34/34 착지» 로 닫은 것은 **«단언이 있다» 까지**다.

## §6 Gaps (이 sync 가 관측하지 않은 것)

- `server/` 스위트를 돌리지 않았다 — 이 카드는 `server/` 를 건드리지 않았고 채널 게이트가 판정면이다(run-done §7 과 같은 경계).
- `moai spec lint` 등 SPEC 기계 감사를 돌리지 않았다. 이 문서군을 기계로 보는 장치의 부재는 plan 단계가 인수 부채로 적고 `t28` 에 넘긴 항목이다.
- 형제 개정이 낡게 만든 자리를 **`SPEC-CHANINJECT-001` 디렉터리 밖에서는 훑지 않았다** — 위임 범위가 그 디렉터리였다.
- 브랜치를 푸시하지 않았다. 통합은 리드 절차다.

## §7 잔여 위험

- **미푸시 유일 사본.** `WT-bot-stability` 는 원격에 없다. 리드가 통합하기 전에 이 워크트리를 폐기하면 작업이 사라진다.
- §5-1 의 층 어긋남은 문서 층에만 있고 코드 동작에는 영향이 없다. 다만 다음에 이 SPEC 을 읽는 사람은 요구사항과 기준이 다른 말을 하는 상태를 만난다.
- 플레이크(`transport-auth` 논스 테스트)는 이번 sync 실행에서 재현되지 않았다 — 121 전건 초록. 원인은 여전히 미규명이며 run-done §5-6 이 출발점이다.

## §8 sync 이후 — F1 수리 기록 (커밋 `7248e89`)

이 절은 `c544a5c` 로 sync 를 닫은 **뒤에** 일어난 일이다. §1~§7 의 수치(훑기 34블록·스위트 121)는 그때 그 트리(@`ee7dd40`)에서 측정한 값이고 **그대로 둔다** — 지금 참인 값은 이 절이 적는다.

**무엇이 결함이었나 (감사 차단 F1).** 알림 통로는 보내는 사람 이름(`author`)이 너무 길면 잘라 냈지만, **이력 통로는 잘라 내지 않았다.** `server/src/auth.ts:32` 가 사용자 이름 길이를 검사하지 않으므로 큰 이름은 실제로 도달 가능한 입력이고, 이름 하나가 이력 총 상한(OD-4)을 혼자 넘으면 옛 코드의 2단계 루프가 그 원소마저 버려 **`cursor: null` · 빈 이력**을 냈다. 그 뒤로 `fetch_history` 는 영구히 빈 결과만 돌려준다 — 「원소 하나는 반드시 실린다」는 진행 보장(INV-2)이 파탄난 것이다.

**수리.** `channel/src/index.ts:93` 한 줄 — `author: neutralizeEnvelope(m.author_name)` → `author: truncateToBudget(neutralizeEnvelope(m.author_name), MAX_NAME_BYTES)`. 알림 통로와 **같은 OD-5 상수**를 쓰고, `truncate.ts` 에 새 상수·새 함수를 만들지 않았다(기존 원시함수 재사용). 함께 낡아진 주석 두 곳을 갱신했다(`index.ts:86-91`, `index-wiring.test.ts:469`).

**RED → GREEN 증거.** 전문은 `.moai/state/verify/t25-run/f1-repair/` 에 있다.

| 항목 | 값 | 파일 |
|------|-----|------|
| RED (수리 전) | exit 1 — 엣지 E-12 `expected +0 to be 1` · 홍수 회귀 `keptIds.length = 0` | `red.md` · `red-e12-raw.txt` · `red-flood-raw.txt` |
| GREEN 단일 파일 | exit 0 — 19 passed (기존 17 + 신규 2) | `green.md` · `green-raw.txt` |
| GREEN 전체 스위트 | exit 0 — **123 passed / 7 files** (= 121 + 신규 2) | `full-suite.txt` |
| 타입 검사 | exit 0 | `typecheck.txt` |
| 형제 훑기 | exit 0 — **36블록** (= 34 + 신규 2) | `sweep-after.txt` |
| shasum 귀속 | `index.ts` 수리 전 `860d1dac…` → 후 `eec03e23…` | `shasums.txt` |

**§M 보고서 갱신.** `.moai/reports/t25/sync-sibling-assertion-check.md` 를 36블록 기준으로 다시 냈다 — 신규 E-12 두 블록의 착지 판정을 더했고(둘 다 착지), 수리가 `index-wiring.test.ts:466` 아래를 정확히 한 줄씩 밀어 거짓이 된 줄 인용 세 자리를 **원문을 다시 읽어** 고쳤다. 종합 판정은 **36/36 착지 · 미착지 0건**으로 §1 의 판정과 같은 결론이다. 그 갱신의 근거인 훑기는 sync 레인이 `7248e89` 트리에서 직접 재실행했고 출력이 `sweep-after.txt` 와 byte 동일함을 확인했다.

**재감사 예고.** 이 갱신 커밋이 착지하면 리드가 같은 감사관 세션으로 재판정(F1 재판정 + 회귀 + 전체 재채점)을 보낸다. 이 절은 그 판정의 대상이지 판정 자체가 아니다.
