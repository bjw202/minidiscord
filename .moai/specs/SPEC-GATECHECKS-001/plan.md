# SPEC-GATECHECKS-001 — 실행 계획

> 순서는 **되돌리기 어려운 결정을 앞**에 둔다. §A 의 미결 결정이 §C 의 기계적 단계보다 먼저 검토되어야 한다 — 뒤에서 형태가 바뀌면 앞 단계를 다시 해야 하기 때문이다.

## §A 결정 (리드 처분으로 종결 — 2026-09-05)

> **[처분 완료] OD-1 = (a) · OD-2 = (a).** 리드 처분 7 (card t40). 둘 다 계획 감사
> (`.moai/reports/t40/plan-audit.md`)의 실측을 근거로 닫혔다. 아래 각 항의 **처분** 블록을 보라.
> 이 절은 더 이상 착수를 막지 않는다.

### OD-1 — `server` 의 `pretest` 형태 → **(a) 확정**

이것이 이 카드의 **유일한 설계 결정**이다. 셋 다 REQ-GATECHECKS-001·REQ-GATECHECKS-002 를 만족하지만 결과가 다르다.

| 안 | 값 | 결과 |
|---|---|---|
| **(a) 권장** | `"pretest": "npm run typecheck"` | 기존 `typecheck` 스크립트를 **재사용**한다. 게이트와 CI(`ci.yml:27` 이 `npm run typecheck -w server` 를 돈다)가 **같은 문자열 하나를 참조**하므로 한쪽만 바뀌는 표류가 구조적으로 불가능하다(REQ-GATECHECKS-006). 비용은 npm 프로세스 한 겹. |
| (b) | `"pretest": "tsc --noEmit"` | 동작은 같다. `typecheck` 와 **같은 내용을 두 자리에 적는다** — 한쪽만 고치면 게이트와 CI 가 갈린다. |
| (c) 배제 권고 | `"pretest": "tsc"` | `channel` 을 **문자 그대로** 모방한 형태. `server/tsconfig.json` 이 `outDir: "dist"` · `include: ["src","test"]` 이므로 **시험 파일까지 `dist/` 로 컴파일**한다. server 에는 빌드가 없어 그 산출물은 전부 쓰레기다. AC-GATECHECKS-004 가 이 안을 떨어뜨린다. |

**[처분] (a) `"pretest": "npm run typecheck"` 로 확정한다** (리드 처분 7, 2026-09-05). 두 근거:
① 감사관이 (a) 의 **재지 않은 위험** — 중첩 `npm run` 의 종료 코드 전파 — 을 임시 워크스페이스에서
직접 돌려 확인했다(RC=1 전파 · 실패 워크스페이스의 `test` 건너뜀 · 다른 워크스페이스는 계속 돎).
② REQ-GATECHECKS-005 가 (c) 를, REQ-GATECHECKS-006 이 (b) 를 이미 떨어뜨리므로 **실질적으로 열린
선택이 아니었다** — 감사 §OD-1 판정.

**리드 지시와의 차이 — 보고 대상.** 리드 지시문은 「`channel` 을 mirroring」이라고 적었다. **효과는 모방하되 문자는 모방하지 않는다**는 것이 위 판단이다. `channel` 의 `pretest: tsc` 는 `bin: ./dist/index.js` 를 만드는 **진짜 빌드**이고 server 에는 그 필요가 없다. 이 차이를 리드에 보고했다.

### OD-2 — AC-GATECHECKS-001 역변이의 실행 시점 → **(a) 확정**

- **(a) 권장** — 정방향 통과 직후, 같은 회차에서 `pretest` 를 임시 제거해 역변이를 재고 즉시 복원한다. 두 값이 **같은 트리·같은 회차**에서 나온다.
- (b) — 계획 단계 실측(`gate-typeerror.*`, RC=0)을 역변이 증거로 **인용**하고 재실행하지 않는다. 81초를 아끼지만 귀속이 다른 회차의 값이 된다.

**[처분] (a) 같은 회차·같은 트리로 확정한다** (리드 처분 7, 2026-09-05).
작성자가 든 이유(양쪽 팔이 같은 회차에서 나와야 한다)보다 **강한 이유**가 감사에서 나왔다:
(b) 가 인용하려는 역변이 RC=0 이 **어떤 증거 파일에도 남아 있지 않다** — `gate-typeerror.out` 과
`gate-typeerror.err` 는 둘 다 0바이트이고, RC 값은 재현 보고서의 **산문에만** 있다(리드가 앞 회차에
직접 확인). 따라서 (b) 는 미귀속 값 인용이 되며 `verification-claim-integrity.md` §2 를 어긴다.

---

## §B 착수 전 확인 (전제 검증)

전제를 기억이 아니라 명령으로 확인한다. 다음 넷이 참이어야 계획이 성립한다.

| # | 확인 | 명령 | 기대 |
|---|---|---|---|
| 1 | `server` 에 `pretest` 가 없다 | `grep -c '"pretest"' server/package.json` | `0` |
| 2 | `channel` 에는 있다 | `grep -c '"pretest"' channel/package.json` | `1` |
| 3 | `typecheck` 스크립트가 존재한다 | `grep -n '"typecheck"' server/package.json` | 적중 1 |
| 4 | 깨끗한 트리에서 게이트가 초록이다 | `moai gate; echo RC=$?` | `RC=0` |

**측정 완료(계획 단계, 이 나무 `05fef76`):** 1·2·3 확인됨. 4 는 기준선 실측 `RC=0 · 81초`.

### 확인된 기제 — npm 워크스페이스는 pretest 실패를 종료 코드로 옮긴다

AC-GATECHECKS-001 은 「server 의 `pretest` 가 실패하면 `npm test --workspaces` 가 RC≠0 을 낸다」에 의존한다. 이 기제는 계획 단계에 **장난감 워크스페이스로 직접 측정**했다(저장소 밖 임시 트리, 측정 후 제거·`git status` 로 확인):

```
pkga: pretest 가 exit 1 · test 는 정상
pkgb: test 만
$ npm test --workspaces --if-present --passWithNoTests
RC=1
stdout: pkga 의 test 는 실행되지 않음 · pkgb 의 test 는 실행됨
stderr: npm error workspace pkga@1.0.0 / npm error Lifecycle script `test` failed
```

두 가지가 함께 확인됐다 — **① pretest 실패는 그 워크스페이스의 test 를 막고 전체 RC 를 1 로 만든다. ② 다른 워크스페이스는 계속 돈다**(첫 실패에서 멈추지 않는다).

부수 관측 하나: 같은 실행에서 npm 이 `npm warn Unknown cli config "--passWithNoTests"` 를 냈다. **이 카드 범위 밖**이며 §5 에 미검증으로 기록했다.

---

## §C 기계적 단계 (§A 처분 후)

### M1 — `pretest` 착지

`server/package.json` 의 `scripts` 에 OD-1 처분값 한 줄을 넣는다. **편집은 이 한 줄뿐이다.**

### M2 — AC-GATECHECKS-001 정방향

`server/test/` 에 타입 오류 2건 주입 → `npm run typecheck -w server` 로 주입이 실제 타입 오류임을 확인(RC=1) → `moai gate` 측정 → stderr 보존.

### M3 — AC-GATECHECKS-001 역변이 (OD-2=(a) 인 경우)

같은 주입 상태에서 `pretest` 줄만 제거 → `moai gate` 측정(기대 RC=0) → `pretest` 복원 → 주입 제거 → `npm run typecheck -w server` 가 RC=0 으로 돌아옴을 확인.

### M4 — 나머지 기준

AC-GATECHECKS-002(회귀 가드·경과 시간 포함) → AC-GATECHECKS-003(출력 변별) → AC-GATECHECKS-004(dist 미생성) → AC-GATECHECKS-005(양방향 쌍) → AC-GATECHECKS-006(CI 불변).

### M5 — 문서 기준

AC-GATECHECKS-007(세 자리 경고 + 조상 관계) → AC-GATECHECKS-008(완결 SPEC 0줄) → AC-GATECHECKS-009(자리 수 서술 규율, 적중 목록 보존).

### M6 — 정리

탐침 제거 확인(`git status --short` 에 런타임 산출물 외 없음) → `progress.md` §E.2·§E.3 에 증거 착지.

---

## §D 제약

- **[HARD] 완결 SPEC 본문 불변.** `SPEC-PERMROUTE-001` 을 포함해 `status: completed` 인 어떤 SPEC 의 본문도 편집하지 않는다(REQ-GATECHECKS-008 · AC-GATECHECKS-008).
- **[HARD] B 를 설계하지 않는다.** `.git_hooks/pre-commit` 래퍼는 t41 이다. 여기서 「부분적으로라도」 손대지 않는다.
- **[HARD] t41 을 건드리지 않는다.**
- **[HARD] 자리 수를 정의 없이 쓰지 않는다**(REQ-GATECHECKS-009 · AC-GATECHECKS-009).
- **[HARD] 게이트 측정은 파일로 캡처한다.** 게이트 출력을 보려고 관측용 커밋을 만들지 않는다 — 이 프로젝트에 관측용 커밋이 착지한 기록이 있다.
- 이 나무(`WT-quiet-green`)는 미푸시다. 브랜치 상태를 바꾸지 않는다.

## §E 위험

| 위험 | 대응 |
|---|---|
| 게이트 1회가 81초 — M2·M3·M4 에서 여러 번 돈다 | 순서를 묶어 재실행을 줄인다. 각 실행의 출력을 파일로 남겨 재실행 대신 인용한다 |
| 주입한 타입 오류가 남는다 | M3 말미와 M6 에서 두 번 확인한다. `npm run typecheck -w server` RC=0 이 복원 신호 |
| `pretest` 가 `npm test` 외의 경로(예: `npm run test:watch`)를 느리게 만든다 | server 의 스크립트는 `dev`·`test`·`typecheck` 셋뿐이다. `pretest` 는 `test` 에만 걸린다 |
| AC-GATECHECKS-001 이 정방향만 통과하고 끝난다 | Definition of Done 이 양쪽 팔을 요구한다. 한쪽만이면 미완 |

## §F 안티 패턴 (이 프로젝트의 재발 기록)

- **굵은 변이** — diff 전체를 되돌리는 변이는 어느 방어가 측정되는지 못 가른다. AC-GATECHECKS-001 의 주입은 타입 오류로 한정한다.
- **공허한 기준** — 수리 유무와 무관하게 통과하는 기준. `acceptance.md` §0 의 표가 각 기준의 변별 대상을 명시한다.
- **줄 번호 인용** — `spec.md:255` 류는 한 줄만 들어가도 어긋난다. AC-GATECHECKS-007 이 내용 앵커를 쓰는 이유.
- **자른 출력을 전건으로 읽기** — 판정의 분모가 될 목록은 `head` 로 자르지 않는다.
- **정의 없는 계수** — 「37자리」 단독 서술 금지(REQ-GATECHECKS-009).

## §G 교차 참조

- `.moai/reports/t40/reproduction.md` @`05fef76` — 실측 출처
- `.moai/reports/t40/evidence/` — 원본 출력(`gate-baseline` · `gate-typeerror` · `gate-failtest` · `gate-p3`)
- `spec.md` §5 — 닫지 않는 위험 목록
- 카드 t41 — B 와 게이트 종료 코드
