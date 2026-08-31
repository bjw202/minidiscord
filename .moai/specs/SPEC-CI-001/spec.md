---
id: SPEC-CI-001
title: "CI 테스트 배선 — push·pull_request 에서 npm ci → channel 빌드 → npm test 를 자동 실행"
version: "0.1.0"
status: draft
created: 2026-08-31
updated: 2026-08-31
author: manager-spec
priority: P2
phase: "v0.4.0 target"
module: ".github/workflows/"
lifecycle: spec-anchored
tags: "ci, github-actions, test-automation, npm-workspaces, build-order, quality-gate"
tier: M
related_specs: [SPEC-GWAUTH-002]
---

# SPEC-CI-001 — CI 테스트 배선

## HISTORY

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|-----------|--------|
| 0.1.0 | 2026-08-31 | 최초 작성 (칸반 카드 `t27` = 큐 재구성 N4). 카드 `t24`(N1)로 원격 저장소가 생기면서 CI 가 설 자리가 처음으로 존재하게 됐다. 이 SPEC 은 **테스트 워크플로 하나**를 세워 카드마다 사람이 `npm test` 를 돌리던 비용을 걷어낸다. 범위는 카드가 적은 세 명령(`npm ci` → `npm run build -w channel` → `npm test`)이며, 커버리지 임계·다중 러너·다중 Node 버전은 배제한다(§5). **빌드 선행 요구는 기억이 아니라 실측이다** — 빌드 없이 돌리면 채널 6건이 실패한다(§2.2). 요구사항 10건 · 수용 기준 9건. | manager-spec |

---

## 1. 배경과 목적

### 1.1 지금 무엇이 없는가 (실측)

이 나무에서 `.github/workflows/` 를 나열하면 파일은 **`label-sync.yml` 하나뿐**이다. 라벨 동기화 워크플로이며, 테스트를 돌리는 워크플로는 **없다**.

그 결과 지금까지 모든 카드에서 **사람이 손으로** `npm test` 를 돌리고 그 출력을 증거로 인용해 왔다. 카드 `t22`·`t24`·`t6` 의 판정이 전부 그 방식이었다. 사람이 돌리는 판정에는 두 가지 비용이 붙는다.

- **반복 비용**: 카드마다, 커밋마다 같은 명령을 사람이 다시 친다.
- **누락 위험**: 돌리지 않은 실행은 아무 신호도 남기지 않는다. 「부재는 통과가 아니다」라는 이 프로젝트의 원칙이 사람 손에만 걸려 있다.

### 1.2 원격이 생겼으므로 이제 설 수 있다

카드 `t24`(N1)가 원격 저장소를 만들었다 — `origin https://github.com/bjw202/minidiscord.git`(비공개), `main` 은 `2a19d7d`. GitHub Actions 는 원격이 있어야 실행된다. 즉 **이 SPEC 의 선행 조건은 `t24` 로 이미 충족됐다.**

### 1.3 목적

push 와 pull_request 마다 **저장소 스스로** 전체 스위트를 돌리고, 그 결론을 원격에 기록하게 만든다. 사람의 판정은 「내가 돌렸다」가 아니라 「원격 실행이 이 SHA 에서 success 였다」가 된다.

---

## 2. 측정한 사실 (이 나무에서 직접 실행한 것)

원문 로그는 `.moai/state/verify/t27-plan/` 아래에 있다. 아래 값은 전부 그 실행의 관측이며 추정이 아니다.

### 2.1 저장소 형태

- npm workspaces 루트다. 루트 `package.json` 의 `workspaces` 는 `["server", "channel"]`.
- 루트 스크립트는 `test: npm test --workspaces --if-present` 하나뿐이다.
- 루트에 `package-lock.json` 이 있다 → **`npm ci` 가 유효**하다. `npm ci` 는 깨끗한 나무에서 exit 0 (`npm-ci.log`).

### 2.2 빌드 선행은 요구가 아니라 관측이다 [HARD]

`npm run build -w channel` **없이** `npm test` 를 돌리면 — 로그 `test-no-build.log`:

```
Test Files  3 failed | 3 passed (6)
     Tests  6 failed | 89 passed (95)
npm error code 1
```

실패 6건은 전부 channel 워크스페이스이며, 파일은 `gateway-mutual-auth.test.ts` · `index-wiring.test.ts` · `transport-auth.test.ts` 셋이다. 원인은 이 기준들이 **빌드 산출물 `channel/dist` 를 실행**하는데 그 디렉터리가 `.gitignore` 대상이라 깨끗한 체크아웃에 존재하지 않는다는 것이다.

`npm run build -w channel`(exit 0, `build.log`)을 **먼저** 돌리면 — `test-with-build.log`:

```
server : Test Files 15 passed (15) · Tests 188 passed (188)
channel: Test Files  6 passed (6)  · Tests  95 passed  (95)
합계 283 통과, exit 0
```

즉 **283 = 188 + 95** 이고, 빌드 단계를 빼면 CI 는 붉게 물든다. 이 SPEC 이 순서를 못 박는 이유가 이것이다.

### 2.3 도구 사슬

- 로컬 실측: node **v24.12.0**, npm **11.6.2**.
- `.nvmrc` **없음**, 어떤 `package.json` 에도 `engines` 필드 **없음** → CI 가 고르는 Node 버전을 강제하는 저장소 내 근거가 현재 **존재하지 않는다**(§4 OD-2 가 이것을 다룬다).
- `npm run typecheck -w server` exit 0, `npm run typecheck -w channel` exit 0 (`typecheck-server.log` · `typecheck-channel.log`) — 둘 다 초록이지만 카드 범위 밖이다(§4 OD-1).

### 2.4 네이티브 의존성

`better-sqlite3@13.0.3` 이 `linux-x64.node` · `linux-arm64.node` 를 포함한 prebuilt 바이너리를 함께 배포한다(`node_modules/better-sqlite3/prebuilds` 나열로 확인). 따라서 **`ubuntu-latest` 에 컴파일 도구 사슬을 따로 깔 필요가 없다.**

### 2.5 테스트가 만드는 상태

`server/src/config.ts:8` 이 `process.env.MINIDISCORD_DATA_DIR ?? './data'` 를 읽는다. 스위트를 돌리면 `server/data` 가 생긴다. `.gitignore` 가 `data/` · `dist/` · `coverage/` · `node_modules/` 를 이미 무시하므로, 실행 뒤에도 트리는 깨끗했다(`git status --short` 에 세션 상태 파일만 남음).

### 2.6 알려진 흔들림 — 재현되지 않았고, 비율은 **미측정**

카드 `t6` 의 인계 기록(`.claude/worktrees/t6/.moai/reports/t6/run-done.md` §5-4)이 `channel/test/transport-auth.test.ts` 의 «both nonces are regenerated per socket and a replayed challenge is refused»(719행, timeout 20000)가 **과거 두 번 실패**했다고 적는다.

이 나무에서 **네 번 더** 돌렸다(전체 스위트 1회 + 단독 3회, `flake-run1..3.log`) — **전부 초록**. 그러므로:

> [HARD] 이 흔들림은 **고쳐졌다고 주장하지 않으며, 실패율이 정량화되지도 않았다.** 재현 실패는 부재의 증거가 아니다. 이 SPEC 이 재시도를 금지하는 이유(§3 REQ-CI-006)가 여기에 있다 — 재시도를 넣으면 이 항목은 영원히 측정되지 않는다.

---

## 3. 요구사항 (GEARS)

### 3.1 워크플로의 존재와 트리거

**REQ-CI-001** (Ubiquitous) — 저장소는 `.github/workflows/` 아래에 테스트를 실행하는 워크플로 파일 하나를 가져야 한다.

**REQ-CI-002** (Event-driven) — **When** 커밋이 원격의 어느 브랜치로든 push 되면, CI 워크플로는 테스트 작업을 실행해야 한다.

**REQ-CI-003** (Event-driven) — **When** pull request 가 열리거나 그 head 가 갱신되면, CI 워크플로는 테스트 작업을 실행해야 한다.

### 3.2 실행 내용과 순서

**REQ-CI-004** (Ubiquitous) — CI 작업은 `npm ci` → `npm run build -w channel` → `npm test` 를 **이 순서로** 실행해야 한다.

**REQ-CI-005** (Ubiquitous) — CI 작업은 `npm run build -w channel` 단계를 `npm test` 단계보다 **앞에** 두어야 한다. 순서가 뒤집히거나 빌드 단계가 없으면 채널 기준 6건이 실패한다(§2.2).

### 3.3 판정의 무결성

**REQ-CI-006** (Unwanted) — CI 워크플로는 실패한 단계를 **재시도해서는 안 되며**, 실패를 억제하는 어떤 장치(`continue-on-error`, 재시도 액션, 실패 무시 플래그)도 두어서는 안 된다. 붉은 실행은 붉은 채로 남아야 한다.

**REQ-CI-007** (Event-detected) — **When** 어느 단계든 0 이 아닌 종료 코드를 반환하면, CI 작업의 결론(conclusion)은 `failure` 여야 한다.

### 3.4 실행 환경과 위생

**REQ-CI-008** (Ubiquitous) — CI 작업은 단일 러너 `ubuntu-latest` 와 단일 Node 메이저 버전 위에서 실행되어야 하며, 그 Node 버전은 워크플로 파일에 명시적으로 고정되어야 한다.

**REQ-CI-009** (Where) — **Where** `actions/setup-node` 가 npm 캐시를 지원하는 한, CI 작업은 `package-lock.json` 을 키로 하는 npm 캐시를 사용해야 한다.

**REQ-CI-010** (Ubiquitous) — CI 워크플로는 ① `permissions` 를 `contents: read` 로 명시하고, ② ref 단위 `concurrency` 그룹에 `cancel-in-progress: true` 를 두고, ③ 작업에 `timeout-minutes` 를 명시해야 한다. 형식은 이미 있는 `label-sync.yml`(권한을 명시적으로 고정하는 방식)을 따른다.

---

## 4. 리드 결정 대기 (이 SPEC 은 스스로 정하지 않는다)

두 항목은 **의도적으로 미결**이며, 리드가 결정하기 전에는 run 단계로 넘어가서는 안 된다. 상세와 각 선택지의 귀결은 `plan.md` §D 에 적었다.

- **OD-1 — `npm run typecheck` 를 워크플로에 넣는가?** 두 워크스페이스 모두 로컬에서 초록으로 실측됐다(§2.3). 그러나 카드의 문언은 세 명령뿐이다.
- **OD-2 — 고정한 Node 버전을 `.nvmrc` 또는 `engines` 로도 커밋하는가?** 현재 저장소에는 둘 다 없어(§2.3) 로컬과 CI 가 조용히 갈라질 수 있다.

---

## 5. 배제 (out of scope)

이 SPEC 이 **만들지 않는 것**을 여기 적는다. 아래 항목을 이 카드에서 구현하면 범위 이탈이다.

### Out of Scope — 커버리지 게이트

- 커버리지 하드 임계 배선. 카드 `t6` 의 sync 기록이 **이 저장소에 커버리지 하드 임계 배선이 존재하지 않음**을 확인했다. 없는 게이트를 CI 에 얹는 것은 별개의 카드다.
- 커버리지 리포트 업로드(Codecov 등) 및 그에 필요한 비밀 값 배선.

### Out of Scope — 실행 행렬

- 다중 러너(macOS · Windows) 확장. 카드는 P2 소형이고, 러너를 늘리면 실행 시간과 흔들림 표면이 함께 늘어난다.
- 다중 Node 버전 매트릭스. 단일 고정 버전으로 시작한다(REQ-CI-008).

### Out of Scope — 배포와 릴리스

- 빌드 산출물의 아티팩트 업로드, 릴리스 생성, 어떤 형태의 배포도 하지 않는다.
- 브랜치 보호 규칙(required status checks) 설정. 이는 저장소 관리자 설정이며 워크플로 파일이 아니다. 이 CI 가 신뢰할 만하다고 관측된 **뒤에** 별도로 결정한다.

### Out of Scope — 흔들림 대응

- §2.6 의 알려진 흔들림을 고치거나, 그 실패율을 정량화하는 일. 이 SPEC 은 그것을 **드러나게** 할 뿐이다(REQ-CI-006).
- 어떤 형태의 테스트 재시도·격리(quarantine)·flaky 표시 장치도 도입하지 않는다.

### Out of Scope — 워크플로 파일 이외의 변경

- 테스트 코드, 소스 코드, `package.json` 스크립트의 수정. 이 카드는 기존 명령을 **호출**할 뿐 바꾸지 않는다.
- `label-sync.yml` 의 수정.

---

## 6. 성공의 정의

이 SPEC 은 다음 셋이 **관측될 때** 종결된다.

1. 워크플로 파일이 존재하고, GitHub 이 그것을 파싱해 등록했으며, 두 트리거를 선언한다.
2. **원격에서 실제로 돌아간 실행**이 이 브랜치의 head SHA 에서 결론 `success` 를 기록했다.
3. **그 게이트가 붉어질 수 있음이 실행으로 보였다** — 고의로 깨뜨린 커밋에서 결론이 `failure` 였고, 되돌려졌다.

셋째가 이 SPEC 의 핵심이다. 「워크플로가 초록이다」는 **아무것도 실행하지 않는 워크플로도 만족시킨다.** 판정은 붉어질 능력의 관측을 포함해야 한다. 측정 명령은 `acceptance.md` 가 각 기준마다 적는다.
