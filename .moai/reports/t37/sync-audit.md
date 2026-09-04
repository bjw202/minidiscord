# card t37 — sync 감사 (sync-audit.md)

| 항목 | 값 |
|---|---|
| 대상 | 브랜치 `WT-spec-triage-merge`, HEAD `5e23703` (PR #2, base `main`) |
| 나무 | `.claude/worktrees/t37` |
| 렌즈 | `--deep` — 범위는 **t37 이 스스로 결정한 것**(아카이브 이동·묘비·규약 문구·분류표 갱신). 병합분(t32·t33·t34) 재감사는 범위 밖(각 카드 sync 가 이미 수행) |
| 집행 | sync 레인, 세션 `b37a0568` (2026-09-04) |
| 판정 | **FAIL — 머지 보류.** 차단 2건(BLOCKER-1 CodeRabbit 미연결 · F-01 규약 파일 범위 지정 미구현) |

---

## 1. 주장 (Claim)

1. **CodeRabbit 통과 조건은 현재 충족될 수 없다** — 이 저장소에 CodeRabbit 이 연결돼 있지 않다.
2. **새 규약 파일이 `paths:` 범위 지정을 갖고 있지 않다** — 커밋 본문·파일 자기 서술·`spec-workflow.md` 포인터 세 자리가 모두 «paths 범위» 를 주장하지만 frontmatter 가 없어 실제로는 항상 적재 표면에 들어간다.
3. **아카이브 이동이 살아 있는 문서 포인터 13자리를 끊었다** — 묘비는 옮겨간 자리를 적지 않는다.
4. **묘비 문구와 아카이브 이동의 되돌릴 수 있음은 정확하다** — 실측으로 통과.
5. **분류표 25·26행 갱신은 사전 선언된 조건을 충족한다** — 다만 «main 통합 완료» 는 아직 참이 아니다.
6. **run 이 미규명으로 넘긴 pre-commit 거부 사유 (ㄱ) 를 규명했다** — `moai gate` 의 부하성 시험 실패이며, t36 논스 건과 **다른** 시험이다.

---

## 2. 증거 (Evidence)

### BLOCKER-1 — CodeRabbit 이 이 저장소에 없다

디스패치 조건 1은 «조합 상태가 `success` 이고 description 이 `Review completed`» 였다. 실측:

```
$ gh api repos/bjw202/minidiscord/commits/5e2370389213f4125bac31abf6400b9afaa154d2/status
{"state":"pending","statuses":[]}          ← 상태가 0개. CodeRabbit 이 «대기» 인 게 아니라 아무 상태도 없다

$ gh api .../commits/<origin/main 최근 5개>/status
f5cb336: pending contexts=0    7f0b02a: pending contexts=0    ee77c84: pending contexts=0
d06ce97: pending contexts=0    3c84023: pending contexts=0     ← 이력 전체에 status 채널 사용 0

$ gh pr view 1 --json headRefOid  → eb682571…  (닫힌 PR #1)
$ gh api .../commits/eb682571…/status  → {"contexts":[],"state":"pending"}   ← PR #1 도 동일

$ gh api .../commits/5e23703…/check-runs
{"total":2, "runs":[{"app":"github-actions","name":"test","conclusion":"success"} ×2]}
                                            ← check-runs 채널에도 github-actions 뿐

$ gh api repos/bjw202/minidiscord/issues/2/timeline  → actor 는 null(committed) 하나뿐, coderabbitai 없음
$ ls .coderabbit.yaml .coderabbit.yml  → 둘 다 No such file
```

**해석**: `state: "pending"` + `statuses: []` 는 GitHub 이 «커밋 상태가 하나도 없는 커밋» 에 돌려주는 기본값이다. 리뷰가 도는 중이라는 뜻이 아니다. 다섯 갈래(현재 PR head · main 이력 5커밋 · 닫힌 PR #1 · check-runs · 타임라인)가 전부 CodeRabbit 부재를 가리키고, 설정 파일도 없다. **기다려서 해결될 상태가 아니다.**

### F-01 (High) — 규약 파일에 `paths:` frontmatter 가 없다

```
$ head -3 .claude/rules/moai/workflow/completed-spec-semantics.md | od -c
0000000    #       C   o   m   p   l   e   t   e   d       S   P   E   C
0000020        S   e   m   a   n   t   i   c   s  \n  \n   >       L   o
                                    ↑ 파일이 «# 제목» 으로 시작한다. --- frontmatter 없음
```

같은 디렉터리 트리의 실제 paths 범위 규칙은 전부 frontmatter 를 쓴다:

```
$ head -3 .claude/rules/moai/NOTICE.md
---
paths: "**/NOTICE.md"
---
$ head -4 .claude/rules/moai/design/constitution.md
---
description: "…"
paths: ".moai/specs/SPEC-*-DESIGN-*/**,.moai/project/brand/**,…"
---
```

프로젝트 SSOT 가 판정 기준을 직접 적는다:

```
$ sed -n '14p' .claude/rules/moai/development/rule-authoring.md
1. Rule files under `.claude/rules/` that lack a top-level `paths:` frontmatter key
   ↑ 「항상 적재 표면」 4슬롯 중 1번의 정의. paths 키가 없으면 항상 적재다.
```

**어긋나는 자리 셋** — 모두 같은 거짓 주장을 편다:

| 자리 | 문구 | 실제 |
|---|---|---|
| 커밋 `aef8108` 본문 | «paths: .moai/specs/** 범위로 신설 — 항상 적재 표면 성장 0바이트» | 1,269바이트 항상 적재 증가 |
| 규약 파일 자기 서술 2행 | «`paths:`-scoped to `.moai/specs/**` … excluded from the always-loaded surface» | 제외되지 않는다 |
| `spec-workflow.md` 포인터 | «(paths-scoped to `.moai/specs/**`)» | 아니다 |

**부수 귀결**: `rule-authoring.md` duty (a)(신규 항상 적재 파일은 바이트 크기 + 비용 정당화 진술 필요)와 duty (c)(그 파일을 쓰지 않는 세션이 무엇을 지불하는지 명시)가 발동한다. 커밋 본문은 duty (d)(범위 우선)를 **충족했다고 적었으므로** (a)·(c) 진술을 하지 않았다. 즉 진술 의무가 미이행 상태다.

**수리 규모**: 파일 맨 앞 3줄 추가. 이것으로 커밋 본문의 주장이 참이 되고 duty (a)·(c) 도 발동하지 않는다.

### F-02 (Medium) — 아카이브 이동이 살아 있는 포인터 13자리를 끊었다

```
$ grep -rn 'specs/SPEC-GWAUTH-001/' --include='*.md' . | grep -v '_archive/' | grep -v '.moai/logs/'
CHANGELOG.md:362                          ← 사용자 대면 문서
.moai/specs/SPEC-GWAUTH-002/spec.md:111, 307, 550, 616, 617, 618   ← 「근거 문서」 목록
.moai/specs/SPEC-GWAUTH-002/plan.md:14, 514, 515
.moai/specs/SPEC-CHANAUTH-001/spec.md:26, 393
.moai/specs/SPEC-CHANINJECT-001/spec.md:551
$ ls .moai/specs/SPEC-GWAUTH-001/    → 없음 (디렉터리는 _archive/ 로 이동)
$ cat .moai/specs/SPEC-GWAUTH-001.md
대체됨 → SPEC-GWAUTH-002 (REQ-GWAUTH2-017 이 REQ-GWAUTH-004 를 폐기)
                          ↑ 옮겨간 자리(_archive/)를 적지 않는다
```

**설계상의 긴장을 함께 적는다**: 이 카드가 같은 커밋에서 만든 규약이 «완료 SPEC 본문의 형제 개정을 금지» 한다. 그러므로 끊긴 포인터를 형제 SPEC 본문을 고쳐 잇는 것은 **이 카드가 방금 만든 규약을 어기는 수리**다. 규약과 충돌하지 않는 최소 수리는 묘비 한 절 확장뿐이다 — 묘비는 t37 자신의 파일이고 완료 SPEC 본문이 아니다.

### F-03 (Low) — 분류표의 «main 통합 완료» 는 아직 참이 아니다

```
$ sed -n '76,77p' .moai/reports/t37/spec-triage.md
| 25 | SPEC-PERMROUTE-001 | completed | **(c) 종결 확정** | main 통합 완료(병합 `b8658ba`) … |
| 26 | SPEC-LIVEVERIFY-001 | completed | **(c) 종결 확정** | main 통합 완료(병합 `556dfd1`) … |

$ git merge-base --is-ancestor b8658ba origin/main; echo $?
1        ← main 의 조상이 아니다. 병합은 WT-spec-triage-merge 에 착지했을 뿐
```

§4.3 이 사전 선언한 재분류 조건(«카드 t37 ① main 통합이 끝나면 (c)종결로 재분류»)의 근거 자체는 정당하다 — 다만 조건의 성취 시점이 PR #2 머지이고, 표는 그보다 먼저 완료형으로 적혔다. **PR #2 가 머지되면 저절로 참이 된다.**

### 통과한 것 — 실측 (Claim 4·5)

**묘비 정확성 — 통과.** 대체 SPEC 과 두 요구사항이 모두 실재하고, 폐기 관계를 원문이 직접 명문화한다:

```
$ ls -d .moai/specs/SPEC-GWAUTH-002    → 존재
$ sed -n '468,470p' .moai/specs/SPEC-GWAUTH-002/spec.md
**REQ-GWAUTH2-017** (Unwanted — shall not)
서버는 `pub` 이 없는 `hello` … 를 환영해서는 안 되고, 그 접속을 닫아야 한다.
**`SPEC-GWAUTH-001` REQ-GWAUTH-004 는 이 조항으로 폐기된다.**     ← 묘비 문구와 축자 일치
$ grep -n -A2 'REQ-GWAUTH-004' .moai/specs/_archive/SPEC-GWAUTH-001/spec.md
316:**REQ-GWAUTH-004** (When — 논스 없는 `hello`)
317:`hello` 에 문자열 `nonce` 가 없으면 서버는 `proof` 를 싣지 않은 `welcome` 을 … 보내야 하고 …
```

**되돌릴 수 있음 — 통과.** 이동은 100% rename 4건 + 신규 1, 삭제 0:

```
$ git show --stat 960b56d
 .moai/specs/SPEC-GWAUTH-001.md                           | 1 +
 .moai/specs/{ => _archive}/SPEC-GWAUTH-001/acceptance.md | 0
 .moai/specs/{ => _archive}/SPEC-GWAUTH-001/plan.md       | 0
 .moai/specs/{ => _archive}/SPEC-GWAUTH-001/progress.md   | 0
 .moai/specs/{ => _archive}/SPEC-GWAUTH-001/spec.md       | 0
 5 files changed, 1 insertion(+)
```
되돌리기는 `git mv` 역방향 + 묘비 삭제. 내용 손실 경로 없음.

**t37 자체 커밋은 생산 코드를 만지지 않았다 — 통과.**

```
$ git diff --name-only 98f2116^ 98f2116 ; git diff --name-only b8658ba 5e23703
.moai/reports/t37/spec-triage.md · .claude/rules/moai/workflow/completed-spec-semantics.md
.claude/rules/moai/workflow/spec-workflow.md · .moai/reports/t37/integration.md
.moai/specs/SPEC-GWAUTH-001.md · .moai/specs/_archive/SPEC-GWAUTH-001/{4개} · ROADMAP.md
     ↑ server/ channel/ web/ 적중 0건
```

### F-04 (Info) — run 이 남긴 (ㄱ) pre-commit 거부 사유 규명

**① 기계적 좁힘 — 실패 분기는 하나뿐이다.**

```
$ cat "$(git rev-parse --git-common-dir)/hooks/pre-commit"
  분기 1: gofmt (staged .go 있을 때)      분기 2: go vet (staged .go 있을 때)
  분기 3: moai gate                       ← 이것만 남는다
$ git ls-files '*.go' | wc -l  → 0        ← .go 파일이 저장소에 0개. 분기 1·2 는 도달 불가
$ command -v moai → /Users/byunjungwon/.local/bin/moai   ← 분기 3 은 활성
```

**② 재현 — 같은 나무에서 게이트가 실제로 거부했다.**

```
$ moai gate > .moai/state/verify/t37-sync/gate.log 2>&1 ; echo exit=$?
exit=1
FAIL  server/test/gateway.test.ts > gateway > history_request applies limit before
      since_id, speaker, since and until
Error: Unexpected server response: 404          ← WebSocket 연결이 7ms 만에 404
Tests  1 failed | 219 passed (220)              ← channel 은 126/126 통과
```

**③ 부하성임을 실측.**

```
$ (server) npx vitest run test/gateway.test.ts   ×3    → run1/2/3 전부 exit=0, 39 passed (39)
$ moai gate  (2회차, 전체 워크스페이스)                  → exit=0
```

**판정**: 단독 3/3 초록, 게이트 2회차 초록, 같은 head 의 CI 2건 SUCCESS + run 의 로컬 2회 초록. 전체 워크스페이스 병렬 실행에서만 나타나며 즉시 404 (서버가 아직 듣지 않는 상태) 형태다 — **부하 경합성 실패이지 병합이 들여온 회귀가 아니다.** run 이 override 없이 재시도로 통과한 것이 이 모양과 일치한다.

**t36 인계 보강**: 이 실패는 t36 이 좇던 `channel/test/transport-auth.test.ts` 논스 건과 **다른 시험·다른 워크스페이스**다. t36 의 «5초 상한과 동시 세션 부하» 가설이 서버 스위트에도 같은 모양으로 재현된다는 뜻이므로, t36 의 범위를 «channel 논스 1건» 이 아니라 «부하 하에서 서버가 서기 전에 붙는 시험들» 로 넓혀 볼 근거가 하나 늘었다.

### (ㄴ) — 주 체크아웃 미커밋 ROADMAP: 손대지 않았고 리드에게 보고했다

**충돌 가능성은 가설이 아니라 실재한다** — t37 도 `ROADMAP.md` 를 고친다(`aef8108`, «후속 후보» 절 +8줄, 파일 끝에 추가). 주 체크아웃의 미커밋 개편 45줄과 같은 파일이다. 다만 t37 의 추가는 파일 **맨 끝**이라 텍스트 충돌 가능성은 낮은 편이다. 운영자 소유물이므로 sync 는 열람만 했다.

---

## 3. Baseline 귀속

| 주장 | 명령 | 관측 트리 |
|---|---|---|
| CodeRabbit 부재 | `gh api …/status`, `…/check-runs`, `…/timeline`, `gh pr view 1` | 원격 `bjw202/minidiscord`, head `5e23703` (2026-09-04 15:0x) |
| frontmatter 부재 | `head -3 … | od -c` | 나무 `t37` @ `5e23703` |
| 항상 적재 판정 기준 | `sed -n '14p' rule-authoring.md` | 같은 트리 |
| 끊긴 포인터 13자리 | `grep -rn 'specs/SPEC-GWAUTH-001/'` | 같은 트리 |
| main 미포함 | `git merge-base --is-ancestor b8658ba origin/main` → 1 | `git fetch origin main` 직후 |
| 게이트 재현·간헐성 | `moai gate` ×2 (exit=1 → exit=0), `vitest run test/gateway.test.ts` ×3 | 같은 트리, 로그 `.moai/state/verify/t37-sync/gate.log`·`gate2.log` |

점수는 이 트리(`5e23703`) 값이며, 수리 후 재채점은 이 문서를 덮지 않고 새 회차로 적는다.

## 4. 미검증 (Gaps)

- **PR #2 머지를 하지 않았다** — BLOCKER-1 이 미해소이고 F-01 이 미수리다. 머지는 리드 처분 후.
- **병합분(t32·t33·t34)의 코드는 재감사하지 않았다** — 디스패치가 범위 밖으로 지정했고 각 카드 sync 가 이미 수행했다.
- **`npm run e2e` 는 돌리지 않았다** — 이 카드는 생산 코드를 바꾸지 않았고 디스패치 범위에도 없다.
- **CodeRabbit 앱 설치 여부를 관리자 API 로 직접 조회하지는 못했다** — 권한 밖이다. 다섯 갈래 간접 증거가 전부 부재를 가리키지만, 「설치돼 있으나 이 저장소에 미배정」과 「미설치」를 이 자리에서 갈라내지는 못한다. 어느 쪽이든 **현재 통과 신호를 낼 수 없다**는 결론은 같다.
- **F-01 을 수리하지 않았다** — 리드 처분 대기. 수리 자체는 3줄이다.
- **분류표 26개 분모의 옳고 그름은 판정하지 않았다** — 분류표 §1 이 이미 «운영자·리드 몫» 으로 남긴 자리다.

## 5. 잔여 위험 (Residual risk)

- **부하성 시험 실패가 두 워크스페이스에 걸쳐 있다.** 다음 게이트·CI 가 다시 붉어질 수 있고, 그때마다 «회귀인가 플레이크인가» 를 사람이 다시 갈라야 한다. t36 이 닫기 전까지 남는 비용이다.
- **F-01 을 수리하면 항상 적재 표면이 1,269바이트 줄어드는 게 아니라, 애초에 늘지 않게 된다.** 반대로 수리하지 않고 머지하면 이 저장소의 모든 세션이 매 턴·매 `/clear` 마다 그 비용을 지불하며, 그 사실을 세 자리의 문서가 «0바이트» 라고 적고 있어 다음 사람이 알아채기 어렵다.
- **끊긴 포인터는 조용히 낡는다.** 빌드도 시험도 잡지 않으며, `SPEC-GWAUTH-002` 의 「근거 문서」 목록을 따라가는 사람이 빈손으로 돌아올 때에만 드러난다.

---

## 6. 4차원 점수

통과선 SSOT: `spec-workflow.md:141-142`·`:334-335` (Tier S 0.75 · M 0.80 · L 0.85). **t37 은 SPEC 없는 카드라 기록된 Tier 가 없다** — SSOT 의 규모 밴드로는 Tier S(자체 변경 6파일·~50줄)이나, 「constitutional」 은 Tier L 의 한정어다. 즉 티어 선택에 따라 통과·미달이 갈린다. **그래서 판정을 티어 논쟁에 걸지 않는다** — 아래 두 건은 어느 티어에서도 머지 전 처리 대상이다.

| 차원 | 점수 | 근거 |
|---|---|---|
| Functionality | 0.72 | 병합·이동·ROADMAP·분류표는 착지. 그러나 이 카드의 중심 산출물인 규약 파일의 범위 지정 기제가 작동하지 않는다(F-01) |
| Security | 0.95 | 생산 코드 무변경, 비밀 없음, 이동은 이력 보존형 rename |
| Craft | 0.78 | CHANGELOG 재배열을 해시+행수로 기계 검증한 것은 모범. F-01 frontmatter 누락·F-02 포인터 파손이 감점 |
| Consistency | 0.70 | 같은 거짓 주장이 세 자리(커밋 본문·파일 자기 서술·포인터)에 퍼져 있고, 분류표는 아직 참이 아닌 완료형을 쓴다(F-03) |

**조화 평균 = 0.776**

## 7. 판정

**FAIL — 머지 보류.** 근거 둘:

1. **BLOCKER-1** — 디스패치 조건 1(CodeRabbit 통과)이 **충족 불가능**하다. 기다림으로 풀리지 않으므로 리드 처분이 필요하다.
2. **F-01** — 카드의 중심 산출물이 자기 기제에 대해 세 자리에서 거짓을 적는다. 수리는 3줄이며, 머지 전에 하는 것이 사후 정정보다 싸다.

F-02·F-03 은 머지 차단 사유로 올리지 않는다 — F-03 은 PR #2 머지로 저절로 참이 되고, F-02 는 묘비 한 절 확장으로 닫힌다.

---
*카드 `t37` sync 단계 감사. 집행 세션 `b37a0568`, 리드 처분 대기.*

---

# 2차 판정 — 수리 후 재감사 (2026-09-04)

> **1차(FAIL 0.776) 기록은 위에 그대로 둔다.** 회차마다 그 트리의 값이고, 지운 회차는 나중에 재구성되지 않는다. 이 절은 수리 커밋 `6896b79` 를 얹은 트리에 대한 별개 회차다.

| 항목 | 값 |
|---|---|
| 대상 트리 | `WT-spec-triage-merge` @ `6896b79` (1차는 `10ab0b0`) |
| 수리 커밋 | `6896b79` — 4파일 13추가 6삭제 |
| 리드 처분 | BLOCKER-1 면제(운영자) · F-01·F-02·F-03 수리 지시 · F-02 형제 16자리 보존 |
| 판정 | **PASS 0.906** (Tier S 통과선 0.75 / Tier M 0.80 / Tier L 0.85 — **세 선 모두 상회**) |

## 1. 주장 (Claim)

1. BLOCKER-1 은 **운영자 처분으로 이 카드에 한해 면제**됐고, 면제 근거(이 저장소는 CodeRabbit 이 돈 적이 없다)를 sync 가 독립 재현했다.
2. F-01·F-02·F-03 수리가 착지했고, 각 수리가 원래 지적을 실제로 닫는지 실측했다.
3. F-02 의 형제 SPEC 16자리는 **판단으로 남긴 것이지 누락이 아니다.**
4. 수리된 트리에서 품질 게이트가 통과한다.

## 2. 증거 (Evidence)

### BLOCKER-1 — 면제와 그 근거의 독립 재현

리드가 제시한 근거를 전제로 받지 않고 sync 가 직접 실행했다:

```
$ for s in f5cb336 7f0b02a ee77c84; do gh api …/commits/$(git rev-parse $s)/status --jq '…'; done
f5cb336 (f5cb336e5e8d): state=pending contexts=0
7f0b02a (7f0b02a65160): state=pending contexts=0
ee77c84 (ee77c84cf316): state=pending contexts=0
```

이 셋은 **main 의 최근 병합 커밋**이다 — 즉 `t31` 통합을 포함해 이 저장소의 기존 병합들이 **CodeRabbit 상태 없이 갔다.** 그러므로 이 카드의 면제는 관행에서 벗어난 예외가 아니라 **기존 관행 그대로**다. 그 자리는 `--deep` 렌즈가 대신했고, 렌즈가 실제로 High 1건·Medium 1건·Low 1건을 잡아 수리로 이어졌다.

### F-01 — 수리가 지적을 닫는다

```
$ head -4 .claude/rules/moai/workflow/completed-spec-semantics.md
---
paths: ".moai/specs/**"
---
                        ← 1차에서 부재를 확인했던 바로 그 자리
$ grep -c '^paths:' …/completed-spec-semantics.md → 1
```

`rule-authoring.md:14` 의 판정 기준(「paths 키가 없는 `.claude/rules/` 파일 = 항상 적재 슬롯 1」)에 따라 이 파일은 **더 이상 항상 적재가 아니다.** 따라서 1차에서 거짓이던 세 자리가 전부 참이 됐다:

| 자리 | 문구 | 수리 후 |
|---|---|---|
| 커밋 `aef8108` 본문 | «항상 적재 표면 성장 0바이트» | **참** |
| 규약 파일 자기 서술 2행 | «excluded from the always-loaded surface» | **참** |
| `spec-workflow.md` 포인터 | «paths-scoped to `.moai/specs/**`» | **참** |

**duty (a)·(c) 재검토 결과 — 발동하지 않는다.** duty (a) 는 «항상 적재 파일 신설» 에 걸리는데 이 파일은 이제 항상 적재가 아니다. duty (d)(범위 우선)가 **주장이 아니라 실제로** 충족됐으므로, 1차에서 지적한 «(d) 충족을 근거로 (a)·(c) 진술 생략» 상태가 해소됐다 — 생략이 아니라 미해당이 됐다. `spec-workflow.md` 포인터 증가분 ~230B 는 duty (b) 임계 1,000B 미만으로 종전과 같다.

### F-02 — 묘비·CHANGELOG 수리, 형제 16자리는 판단으로 보존

```
$ cat .moai/specs/SPEC-GWAUTH-001.md
대체됨 → SPEC-GWAUTH-002 (REQ-GWAUTH2-017 이 REQ-GWAUTH-004 를 폐기)

본문은 `.moai/specs/_archive/SPEC-GWAUTH-001/` 로 옮겼다 (…네 파일 그대로).
**`.moai/specs/SPEC-GWAUTH-001/…` 를 가리키는 인용을 따라와 빈손이 됐다면,
같은 파일이름을 `_archive/` 아래에서 찾으면 된다** — …내용은 한 글자도 바뀌지 않았다.

$ sed -n '362p' CHANGELOG.md | grep -o '\.moai/specs/[^`]*'
.moai/specs/_archive/SPEC-GWAUTH-001/spec.md      ← 정정됨
$ grep -c 'specs/SPEC-GWAUTH-001/' CHANGELOG.md → 0
```

묘비 문구가 **디렉터리 안쪽 파일을 가리키는 인용**을 겨냥한다는 점이 중요하다. 끊긴 포인터들은 `…/SPEC-GWAUTH-001/spec.md` 처럼 파일을 지목하므로 묘비 파일로 자동 회수되지 않는다 — 그래서 «따라온 경로가 비어 있으면 여기를 보라» 형태로 적었다.

**형제 SPEC 안의 16자리는 두었다 — 판단이지 누락이 아니다.** 근거 셋:

1. **같은 커밋의 규약과 충돌한다.** `completed-spec-semantics.md` 가 완료 SPEC 본문의 형제 개정을 금지한다. 16자리 중 다수(`SPEC-CHANAUTH-001`·`SPEC-GWAUTH-002`)가 완료·진행 SPEC 본문이며, 이를 고치는 것은 이 카드가 방금 세운 규약을 그 자리에서 어기는 것이다.
2. **이 카드가 끊으려는 고리가 바로 그것이다.** 경로 하나가 바뀌었다는 이유로 문서 다섯 개를 고치고, 그 고침이 또 다른 HISTORY 행을 낳는 «문서가 문서를 낳는 고리» — 규약 신설의 동기 자체다.
3. **회수 경로가 이미 있다.** 묘비가 행선지를 적었으므로 빈손이 된 독자는 한 번의 조회로 원문에 닿는다. 인용의 의미(무엇을 근거로 삼았는가)는 손상되지 않는다.

**남은 자리 실측**(의도적 보존):

```
$ grep -rn 'specs/SPEC-GWAUTH-001/' --include='*.md' . | grep -v '_archive/' | grep -v '.moai/logs/' \
  | grep -v '.moai/reports/t37/' | wc -l → 63건 (파일 15개)
  살아 있는 SPEC 본문 16자리 + 나머지는 t15·t22 의 과거 감사 보고서(역사 기록, 손대지 않는다)
```

### F-03 — 조건형 전환 + 같은 단언의 다른 자리까지 정정

```
$ sed -n '76,77p' .moai/reports/t37/spec-triage.md
| 25 | … | **(c) 종결 — PR #2 머지로 확정** | … **main 편입은 PR #2 가 머지되는 시점에 성립** …
       — 이 행이 쓰인 시점에는 `git merge-base --is-ancestor b8658ba origin/main` 이 exit 1 이었다 |
| 26 | … | (동형) |
```

**표만 고치면 §7 이 거짓으로 남는다** — §7 갱신 기록이 «재분류 조건이 충족됐다»·«main 계통에 편입» 을 세 자리에 적고 있었다. 네 자리를 함께 조건형으로 옮기고, 정정 주체·근거를 한 줄 추가했다.

```
$ grep -rn 'main 계통에 편입\|main 통합 완료' .moai/reports/t37/ → 4건
  전부 sync-audit.md 1차 절이 **수리 전 원문을 증거로 인용한 자리** — 보존이 맞다
```

### 게이트 — 수리된 트리

```
$ moai gate  (트리 6896b79)  → exit=0        로그: .moai/state/verify/t37-sync/gate3.log
```

## 3. Baseline 귀속

| 주장 | 명령 | 트리 |
|---|---|---|
| 면제 근거 재현 | `gh api …/commits/{f5cb336,7f0b02a,ee77c84}/status` → 전부 contexts=0 | 원격 main, 2026-09-04 |
| F-01 닫힘 | `head -4`, `grep -c '^paths:'` → 1 | `6896b79` |
| F-02 닫힘 | `cat` 묘비, `sed -n '362p'`, `grep -c` → 0 | `6896b79` |
| F-03 닫힘 | `sed -n '76,77p'`, `grep -rn` 재훑기 | `6896b79` |
| 게이트 | `moai gate` → exit=0 (`gate3.log`) | `6896b79` |

## 4. 미검증 (Gaps) — 2차

- **「CodeRabbit 미설치」와 「설치됐으나 이 저장소 미배정」을 여전히 가르지 못했다.** 관리자 API 권한 밖이다. 두 경우 모두 «지금 통과 신호가 나올 수 없다» 는 결론은 같지만, **관측 한계는 관측 한계로 남긴다** — 리드 지시. 이 저장소에 CodeRabbit 을 붙일 계획이 생기면 이 자리가 먼저 확인돼야 한다.
- **PR #2 머지 자체는 이 절을 쓰는 시점에 아직 관측되지 않았다.** 머지 후 F-03 의 조건이 참이 되며, 그 확정은 머지 SHA 로 귀속된다.
- **형제 SPEC 16자리는 고치지 않았다** — 위 §2 의 판단에 따른 보존이며, 이후 그 자리를 «누락» 으로 재발견하지 않도록 여기에 명시해 둔다.
- **병합분(t32·t33·t34) 코드 재감사는 2차에서도 하지 않았다** — 범위 밖.

## 5. 잔여 위험 — 2차

- **부하성 시험 실패는 그대로 남아 있다** — 1차의 F-04. 다음 게이트·CI 가 다시 붉어질 수 있고 그때마다 «회귀인가 플레이크인가» 를 사람이 갈라야 한다. t36 소유.
- **묘비 회수 경로는 사람이 읽어야 작동한다.** 기계 검사가 끊긴 인용을 잡지 않으므로, 다음에 SPEC 을 아카이브할 때 같은 상황이 재발할 수 있다. 규약이 이를 다루지는 않는다(범위 밖 — 규약은 «본문을 고치지 마라» 를 다루지 «옮길 때 무엇을 남겨라» 를 다루지 않는다).

## 6. 4차원 재채점

| 차원 | 1차 | 2차 | 변화 근거 |
|---|---|---|---|
| Functionality | 0.72 | **0.92** | 규약 파일의 범위 지정 기제가 실제로 작동한다(F-01 닫힘). 병합·이동·ROADMAP·분류표 전부 착지 |
| Security | 0.95 | **0.95** | 변화 없음 — 생산 코드 무변경 |
| Craft | 0.78 | **0.90** | 묘비가 회수 경로를 세우고, CHANGELOG 정정이 사용자 대면 파손을 닫음. 형제 보존이 근거와 함께 명시됨 |
| Consistency | 0.70 | **0.88** | 세 자리 거짓이 참이 됨. 분류표·§7 이 조건형으로 일치. 잔여 감점은 형제 16자리가 여전히 구경로를 가리키는 것(판단으로 수용) |

**조화 평균 = 0.906**

## 7. 판정 — 2차

**PASS 0.906.** 통과선은 `spec-workflow.md:141-142`·`:334-335` 가 SSOT 이며 Tier S 0.75 · M 0.80 · L 0.85 이다. t37 은 SPEC 없는 카드라 기록된 Tier 가 없으나, **0.906 은 세 선을 모두 상회하므로 티어 선택과 무관하게 통과**다 — 1차에서 판정이 티어에 걸렸던 문제가 해소됐다.

1차의 차단 2건 처분: **BLOCKER-1 은 운영자 면제**(근거 §2 에서 독립 재현), **F-01 은 수리로 닫힘**. F-02·F-03 도 처분대로 닫혔다. **PR #2 머지 조건 충족.**

---
*카드 `t37` sync 2차 판정. 집행 세션 `b37a0568`, 트리 `6896b79`.*
