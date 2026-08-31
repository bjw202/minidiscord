# SPEC-CI-001 — 구현 계획

> 순서 원칙: **되돌리기 어려운 결정을 먼저** 놓는다. §D 의 미결 결정과 §E 의 워크플로 형태가 앞에 오고, 기계적인 절차(§F 의 후반 마일스톤)가 뒤로 간다. 리드의 검토 주의는 바뀔 가능성이 큰 자리에 쓰여야 한다.

---

## A. 맥락

- 카드: `t27` (큐 재구성 N4, P2 소형). 상세: `.moai/plan/2026-08-31-queue-redesign/proposal.md` §3 N4.
- 나무: `.claude/worktrees/t27`, 브랜치 `WT-ci-test-wiring`, 기준 `main @2a19d7d`.
- 선행 조건: 카드 `t24`(N1)가 원격 `bjw202/minidiscord` 를 만들었다 — **충족됨**.
- 산출물: `.github/workflows/` 아래 **워크플로 파일 하나**. 그 외 소스·테스트 무변경.

---

## B. 알려진 사실과 그 출처

전부 이 나무에서 실행한 관측이다. 원문은 `.moai/state/verify/t27-plan/`.

| 사실 | 값 | 로그 |
|---|---|---|
| 기존 워크플로 | `label-sync.yml` **하나뿐** (테스트 워크플로 부재) | `ls` |
| `npm ci` (깨끗한 나무) | exit 0 | `npm-ci.log` |
| 빌드 **없이** `npm test` | **exit 1, 6 failed / 89 passed (channel)** | `test-no-build.log` |
| `npm run build -w channel` | exit 0 | `build.log` |
| 빌드 **후** `npm test` | **exit 0, 283 통과** (server 188 / 15파일 + channel 95 / 6파일) | `test-with-build.log` |
| typecheck (server / channel) | 둘 다 exit 0 | `typecheck-*.log` |
| 로컬 도구 사슬 | node v24.12.0, npm 11.6.2 · `.nvmrc` 없음 · `engines` 없음 | 직접 실행 |
| `better-sqlite3@13.0.3` | `linux-x64.node`·`linux-arm64.node` prebuilt 동봉 | `prebuilds` 나열 |
| 흔들림 (transport-auth:719) | 과거 2회 실패 기록 · **이 나무에서 4회 전부 초록** · 실패율 **미측정** | `flake-run1..3.log` |
| PyYAML 동작 | `on:` 키를 불리언 `True` 로 읽음 (label-sync.yml 로 확인) | 직접 실행 |
| 도구 가용성 | `python3`+PyYAML 6.0.3 O · `gh` 2.83.2 O · `actionlint` X · `yq` X | 직접 실행 |

---

## C. 사전 점검 (run 단계 첫 작업)

1. `git rev-parse HEAD` · `git branch --show-current` → 이 계획이 가정한 나무인지 확인.
2. `.github/workflows/` 재나열 → 여전히 `label-sync.yml` 하나인지 확인(그 사이 누가 추가했을 수 있다).
3. §D 의 두 결정이 닫혔는지 확인 — **닫히지 않았으면 워크플로를 쓰지 말고 리드에게 되돌린다**(AC-CI-009).

---

## D. 리드 결정 대기 [HARD — 이 절이 닫히기 전에는 run 진입 금지]

이 SPEC 은 아래 둘을 **스스로 정하지 않는다**. 리드가 정한 뒤 각 항목에 `결정됨: <값> — <근거>` 를 적고, 결정이 워크플로 내용을 바꾸면 `acceptance.md` AC-CI-002·AC-CI-004 를 **함께** 고친다.

### OD-1 — `npm run typecheck` 를 워크플로에 넣는가?

| 선택지 | 귀결 |
|---|---|
| (a) 넣지 않는다 — 카드 문언 그대로 세 명령 | 범위가 카드와 정확히 일치. 타입 회귀는 CI 가 잡지 못하고 사람이 잡는다. |
| (b) 넣는다 — `npm test` 앞 또는 뒤에 typecheck 단계 추가 | 두 워크스페이스 모두 지금 초록으로 실측됐으니 즉시 붉어지지 않는다. 다만 카드 범위를 스스로 넓히는 것이며, 실행 시간이 늘고 AC 가 하나 더 필요하다. |

**관측된 사실만 적는다**: `npm run typecheck -w server` exit 0, `npm run typecheck -w channel` exit 0. 이 값이 (b) 를 **권하지는 않는다** — 넣을지 말지는 범위 결정이다.

결정됨: (대기)

### OD-2 — 고정한 Node 버전을 저장소에도 커밋하는가?

| 선택지 | 귀결 |
|---|---|
| (a) 워크플로에만 고정 | 파일 추가 없음. 로컬(v24.12.0)과 CI 가 나중에 조용히 갈라질 수 있고, 그 갈라짐을 알려 주는 것이 아무것도 없다. |
| (b) `.nvmrc` 추가 | 로컬 도구(nvm/fnm)가 같은 값을 읽는다. 워크플로는 `node-version-file: .nvmrc` 로 가리켜 **단일 출처**가 된다. 파일 1개 추가. |
| (c) 루트 `package.json` 에 `engines` 추가 | `npm` 이 경고/거부한다. 워크스페이스 전체에 영향을 주며 `package.json` 수정이 §5 배제와 부딪힌다. |

**관측된 사실**: 현재 `.nvmrc` 없음, 어떤 `package.json` 에도 `engines` 없음. 즉 지금은 로컬·CI 를 묶는 근거가 **저장소 안에 존재하지 않는다**.

결정됨: (대기)

### OD-3 — `channel/package.json` 에 `pretest` 를 넣어 `npm test` 자체를 자족하게 만드는가?

**출처 — 카드 `t22` 가 이 카드로 넘긴 이월 항목이다.** `.moai/reports/t22/sync-audit.md:207`(F6, Medium·non-blocking)과 `.moai/reports/t22/sync-done.md:70`(리드 인계 4번). F6 의 관측을 그대로 옮긴다.

```
$ python3 -c "…json.load(open('channel/package.json'))['scripts']"
{'dev': …, 'build': 'tsc', 'test': 'vitest run', 'typecheck': 'tsc --noEmit'}      ← pretest 없음
```

F6 의 판정: 세 시험 파일이 `../dist/index.js` 를 자식 프로세스로 띄우는데 그 산출물을 만드는 단계가 시험 명령 안에 없고 산출물은 git 에 없다. 그래서 **깨끗한 체크아웃에서 `npm test` 는 283/0 을 재현하지 못한다.** 인계 문서는 이를 «CI 배선 후속 카드의 실범위 후보» 로 지목했다. F6 의 권고문은 `"pretest": "tsc"` 한 줄이다.

**이 카드가 가정한 형태와 F6 의 형태는 다르다** — 표면적 차이가 아니다.

| 선택지 | 고쳐지는 범위 | 귀결 |
|---|---|---|
| (a) 카드 문언 그대로 — **워크플로가** 테스트 앞에 빌드를 돌린다 | **CI 만** | 깨끗한 체크아웃에서 시작하는 모든 사람과 모든 에이전트는 여전히 같은 거짓 실패 6건을 만난다. 이는 증거 5번(`test-no-build.log`)이 재현한 바로 그 증상이고, 프로젝트 기억 `fresh-worktree-needs-channel-build` 가 **반복 발생**으로 기록한 형태다. |
| (b) F6 형태 — `channel/package.json` 에 `pretest` 추가 | **CI + 모든 깨끗한 체크아웃** | `npm test` 한 명령이 자족해진다. 워크플로는 별도 빌드 단계를 **뺄 수 있다**. 대신 `npm test` 의 동작이 바뀐다(§형제 카드 제약). |
| (c) 둘 다 | CI + 체크아웃 (빌드 2회) | 중복 실행이지만 워크플로가 `pretest` 존재에 의존하지 않는다. |

**[HARD] (b) 또는 (c) 를 고르면 수용 기준이 함께 움직인다.** (b) 에서 워크플로가 빌드 단계를 빼면 **AC-CI-007 의 변이 대상(그 단계)이 사라진다** — 그 경우 AC-CI-007 은 「`pretest` 를 지우면 채널 6건이 실패한다」로 변이 대상을 옮겨 다시 써야 하고, AC-CI-002 의 세 단계 순서 단언도 두 단계로 줄여야 한다. **기준을 함께 고치지 않으면 그 자리가 곧 낡은 기록이 된다**(§G 두 번째 행과 같은 부류).

결정됨: (대기)

#### 형제 카드 제약 — `SPEC-E2E-001` AC-E2E-011 (공시)

카드 `t6` 의 `SPEC-E2E-001` 은 **`WT-e2e-persist-readme` 브랜치에 있고 `main` 에 병합되지 않았다.** 그 `acceptance.md:143-152` 가 **AC-E2E-011 — 배선이 기존 `test` 를 건드리지 않는다** 를 담는다. 원문에서 옮긴다.

> - **Then** `scripts.e2e` 가 **추가**되었고 `scripts.test` 의 값은 기준선과 **글자 그대로 같다**.
> - 측정 ①: `git diff 2a19d7d..HEAD -- package.json | grep '^-' | grep -c '"test"'` → `0`

**어느 방향으로도 과장하지 않고 정확히 적는다.**

1. **문자 그대로는 저촉하지 않는다.** 측정 ①은 **루트** `package.json` 의 diff 만 본다. `pretest` 를 `channel/package.json` 에 넣는 것은 루트를 전혀 건드리지 않으므로 측정 ①은 `0` 을 유지한다 — **AC-E2E-011 위반이 아니다.**
2. **다만 의도에는 압력을 준다.** AC-E2E-011 의 취지는 「이 카드의 배선이 `npm test` 가 하는 일을 조용히 바꾸지 않는다」이다. `pretest` 는 `scripts.test` 의 리터럴 값을 그대로 두면서 **`npm test` 의 동작은 바꾼다.** 즉 (b) 는 **문언은 만족하고 취지는 건드린다.** 그 간극을 어떻게 볼지는 **리드의 판단**이며 이 SPEC 이 정하지 않는다.
3. **병합 순서 주의.** 두 카드 모두 `2a19d7d` 에서 갈라졌고 **둘 다 루트 `package.json` 을 건드릴 수 있다**(`t6` 는 `scripts.e2e` 를 더한다). OD-3 이 (b)·(c) 로 가더라도 이 카드는 `channel/package.json` 만 건드리므로 **파일이 겹치지 않는다** — 다만 `t6` 가 먼저 병합되면 AC-E2E-011 의 기준선 `2a19d7d` 대비 diff 에 이 카드의 변경이 섞이지 않는지 병합 시점에 한 번 확인한다.
4. **`.claude/worktrees/t6/` 는 다른 카드의 나무이며 이 카드에게 읽기 전용이다.** 인용만 하고 수정하지 않았다.

> 위 세 `결정됨:` 줄이 이 절의 **유일한 판정 자리**다. 리드 결정이 내려지면 `(대기)` 를 `<선택지> — <근거>` 로 바꾼다. AC-CI-009 는 이 절 안의 이 세 줄만 센다 — §F·§G 가 OD 를 참조하는 것은 판정에 영향을 주지 않는다.

---

## E. 워크플로의 형태 (기본값과 그 근거)

아래는 이 계획이 **제안하는** 형태이며, 리드가 뒤집을 수 있다. 각 항목에 근거를 붙인다.

| 결정 | 값 | 근거 |
|---|---|---|
| 파일명 | `.github/workflows/ci.yml` | 관례. 기존 `label-sync.yml` 과 이름이 겹치지 않는다. |
| 러너 | `ubuntu-latest` **단일** | `better-sqlite3` 가 리눅스 prebuilt 를 동봉하므로 컴파일 도구 사슬 불필요(§B). 카드가 P2 소형이라 매트릭스는 §5 에서 배제. |
| Node | 메이저 **24** 고정 | 로컬 실측 v24.12.0 과 일치. 다른 버전을 고르면 CI 가 로컬에서 한 번도 재보지 않은 조합을 측정하게 된다. |
| 캐시 | `actions/setup-node` 의 `cache: npm`, 키는 `package-lock.json` | 락 파일이 루트에 있고 `npm ci` 가 그것을 읽는다. |
| 동시성 | `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` | 같은 ref 에 새 push 가 오면 낡은 실행을 죽여 큐를 비운다. |
| 시간 제한 | `timeout-minutes` 명시 (제안 20) | 로컬 전체 실행이 대략 1분대(빌드 후)였으나 CI 는 느리다. 무한 대기를 막는다. |
| 권한 | `permissions: { contents: read }` | 최소 권한. 기존 `label-sync.yml` 이 권한을 명시적으로 고정하는 방식을 따른다. |
| 재시도 | **없음** | §F0 참조 — 이 카드에서 가장 되돌리기 어려운 결정이다. |

### E.1 재시도를 넣지 않는 이유 [HARD]

`spec.md` §2.6 의 흔들림은 **실패율이 측정되지 않았다.** 재시도를 넣으면 그 항목은 앞으로도 영원히 측정되지 않는다 — 재시도는 신호를 지우는 장치이기 때문이다.

붉은 실행이 붉게 남아야, 흔들림이 실제로 얼마나 자주 나는지에 대한 데이터가 처음으로 쌓인다. 그 데이터가 쌓인 **뒤에** 흔들림을 고칠지 격리할지 결정하는 것이 순서이며, 그것은 이 카드가 아니다(`spec.md` §5).

---

## F. 마일스톤

되돌리기 어려운 순서로 놓았다.

### M1 — 결정 확정 (§D)

- OD-1 · OD-2 · **OD-3** 에 대한 리드 결정을 받아 `plan.md` §D 에 기록한다.
- 결정이 워크플로 내용을 바꾸면 `acceptance.md` 를 **같은 커밋에서** 함께 고친다 — OD-2 는 AC-CI-004, **OD-3 (b)/(c) 는 AC-CI-002 와 AC-CI-007**.
- OD-3 이 (b)/(c) 면 이 카드의 변경 파일이 워크플로 1개에서 **`channel/package.json` 을 포함해 2개**로 늘어난다. §F M5 의 `git diff --stat` 확인과 `acceptance.md` DoD 3번을 그에 맞춰 고친다.
- 산출: `plan.md` §D 의 `결정됨:` 줄 3개.

### M2 — 워크플로 저작

- §E 의 형태로 `.github/workflows/ci.yml` 을 쓴다. 다른 파일은 건드리지 않는다.
- 로컬 정적 검증: AC-CI-001 · AC-CI-002 · AC-CI-003 · AC-CI-004 네 명령을 돌리고 출력을 원문으로 남긴다.
- 산출: 워크플로 파일 1개 + 네 기준의 출력.

### M3 — 원격 초록의 관측

- 커밋 후 `git push origin WT-ci-test-wiring`.
- AC-CI-005 명령으로 결론 `success` 를 관측한다. 출력이 비면 **미관측**이며 통과가 아니다.
- 산출: `gh run list` 출력 원문 + run id.

### M4 — 변별 (붉어질 수 있음의 관측)

- AC-CI-006: 임시 실패 테스트 → `failure` 관측 → revert → `success` 재관측.
- AC-CI-007: 빌드 단계 제거 → `failure` + 채널 6건 실패 관측 → revert → `success` 재관측.
- **[HARD]** 두 파괴 커밋과 그 revert 는 이 브랜치 안에만 존재하며 리드의 통합 대상은 되돌림 이후의 head 다.
- 산출: 파괴 SHA · 되돌림 SHA · 각각의 결론 출력.

### M5 — 위생과 기록

- AC-CI-008(트리 청결) · AC-CI-009(결정 닫힘) 확인.
- `progress.md` §E.2 에 아홉 기준의 명령과 출력을 **원문으로** 기록한다.
- `git diff --stat main...HEAD` 로 변경 파일이 워크플로 1개 + `.moai/` 문서(+OD-2 결정 시 `.nvmrc`)뿐임을 확인한다.

---

## G. 피해야 할 형태 (이 프로젝트의 반복 부류)

| 형태 | 이 카드에서의 모습 | 방어 |
|---|---|---|
| **검증하지 않는 수용 기준** | 「CI 가 초록이다」로 끝내면 아무것도 실행하지 않는 워크플로가 통과한다 | AC-CI-006 · AC-CI-007 (변별) |
| **정정이 스스로 낡은 기록을 남긴다** | OD-2 로 Node 값이 바뀌면 AC-CI-004 의 `startswith('24')` 가 거짓이 된다 | M1 이 두 파일을 **한 커밋에서** 고치도록 못 박음 |
| **「할 수 없다」도 미관측 주장이다** | 「CI 에서는 안 될 것」류의 추정 | 모든 판정은 `gh run list` 출력에 귀속 |
| **부재를 통과로 읽기** | `gh run list` 출력이 비었는데 통과로 처리 | AC-CI-005 가 «빈 출력 = 미관측» 을 명시 |
| **굵은 변이는 절반을 가린다** | 워크플로 전체를 지우는 파괴는 무엇이 측정됐는지 못 가른다 | AC-CI-006 은 테스트 하나만, AC-CI-007 은 빌드 단계 하나만 변이 |

---

## H. 상호 참조

- `spec.md` — 요구사항 10건, 배제 목록, 성공의 정의.
- `acceptance.md` — 수용 기준 9건과 각각의 측정 명령.
- `progress.md` — 단계별 증거가 착지하는 자리.
- `.moai/state/verify/t27-plan/` — 이 계획이 인용한 모든 실측의 원문.
- `.moai/plan/2026-08-31-queue-redesign/proposal.md` §3 N4 — 카드의 출처.
