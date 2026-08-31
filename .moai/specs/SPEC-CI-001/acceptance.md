# SPEC-CI-001 — 수용 기준

> **원칙 [HARD]**: 어떤 명령으로도 반증할 수 없는 기준은 이 파일에 실리지 못한다. 각 기준은 ① 증거를 만드는 **명령**과 ② 그 출력이 무엇이면 통과인지를 함께 적는다.
>
> 이 카드가 특히 경계하는 두 형태:
> - **「검증하지 않는 수용 기준」** — 기준이 이름 붙인 동작을 통째로 지워도 초록으로 남는 기준.
> - **「초록이면 통과」** — CI 기준을 «워크플로가 성공했다» 로 적으면 **아무것도 실행하지 않는 워크플로**가 그 기준을 만족시킨다. 그래서 §D 의 변별 기준(AC-CI-004·005)이 이 집합의 무게 중심이다.

용어: 워크플로 파일 경로는 **`.github/workflows/ci.yml` 로 고정**돼 있다(`plan.md` §E — 미결 결정이 아니라 고정 기본값). v0.2.0 의 `<WF>` 대리 표기는 폐기했다 — 「기본 후보」라 적어 놓고 기준들이 리터럴을 하드코딩해 파일명이 사실상 네 번째 미결 결정이 돼 있었다(감사 O2). 저장소는 `bjw202/minidiscord` 다.

---

## A. 워크플로 파일 자체

### AC-CI-001 — 파일이 존재하고, 파싱되고, 두 트리거를 선언한다

- **Given** run 단계가 워크플로 파일을 저작했고,
- **When** 아래 명령을 저장소 루트에서 실행하면,
- **Then** 종료 코드 0 이며 출력의 마지막 줄이 정확히 `TRIGGERS OK` 다.

```bash
python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.github/workflows/ci.yml'))
# 주의(실측): PyYAML 은 YAML 1.1 규칙으로 `on:` 키를 불리언 True 로 읽는다.
# 이 나무에서 label-sync.yml 로 확인했다 → keys: ['name', True, 'permissions', 'jobs']
trig = d.get('on', d.get(True))
keys = sorted(trig.keys())
print('triggers:', keys)
assert 'push' in keys and 'pull_request' in keys, keys

# 필터 무력화 부재 (감사 D5). 트리거 키의 존재만 재면
#   pull_request: {paths: ['no-such/**']}
# 같은 워크플로가 통과하면서 PR 에서는 한 번도 실행되지 않는다.
for t in ('push', 'pull_request'):
    cfg = trig[t] or {}
    for f in ('paths', 'branches', 'paths-ignore', 'branches-ignore'):
        assert f not in cfg, (t, f, cfg)
    print(t, 'filter-free:', cfg)
print('TRIGGERS OK')
PY
```

- 검증 대상 요구사항: REQ-CI-001 · REQ-CI-002 · REQ-CI-003.
- **반증 가능성**: 파일을 지우면 `FileNotFoundError`, 트리거 하나를 빼면 `AssertionError`, **어느 트리거든 `paths`/`branches` 필터를 달면 `AssertionError`**. 셋 다 종료 코드 0 이 아니다.
- **[HARD] 이 기준은 선언만 잰다.** 실제로 실행되는지는 AC-CI-005(push)와 **AC-CI-010(pull_request)** 의 원격 관측이 잰다. 필터 단언은 그 사이의 가장 흔한 무력화 형태를 막을 뿐이며, **원격 관측을 대체하지 않는다.**

### AC-CI-002 — 세 명령이 선언된 순서로 존재한다

- **Given** 워크플로 파일이 AC-CI-001 을 통과했고,
- **When** 아래 명령으로 작업 단계의 `run` 문자열을 순서대로 뽑으면,
- **Then** `npm ci` 를 담은 단계의 인덱스 < `npm run build -w channel` 을 담은 단계의 인덱스 < `npm test` 를 담은 단계의 인덱스이며, 출력의 마지막 줄이 `ORDER OK` 다.

```bash
python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.github/workflows/ci.yml'))
job = next(iter(d['jobs'].values()))
runs = [s.get('run', '') for s in job['steps']]
def idx(needle):
    hits = [i for i, r in enumerate(runs) if needle in r]
    assert len(hits) == 1, (needle, hits)
    return hits[0]
i_ci, i_build, i_test = idx('npm ci'), idx('npm run build -w channel'), idx('npm test')
print('indices:', i_ci, i_build, i_test)
assert i_ci < i_build < i_test, (i_ci, i_build, i_test)
print('ORDER OK')
PY
```

- 검증 대상 요구사항: REQ-CI-004 · REQ-CI-005.
- **반증 가능성**: 빌드 단계를 지우면 `assert len(hits) == 1` 이 깨지고, 순서를 뒤집으면 마지막 `assert` 가 깨진다.
- **[HARD] 이 기준은 요구보다 좁다 — 그 좁음을 요구 쪽에 명시했다** (감사 O3). `idx()` 는 각 바늘의 적중이 **정확히 1회**임을 요구하고 세 인덱스의 **강한 부등호**를 단언한다. 그래서 REQ-CI-004 를 만족하는 다른 구현들이 이 기준에 떨어진다:
  - 세 명령을 **한 `run: |` 블록**에 순서대로 넣으면 세 인덱스가 모두 같아져 `0 < 0 < 0` 이 거짓이 된다.
  - `npm run build --workspace channel`(같은 뜻, 다른 표기)은 `'npm run build -w channel'` 문자열에 걸리지 않아 적중 0 이 된다.
  
  **해소 방향은 기준 완화가 아니라 요구 명시다**: run 단계는 세 명령을 **세 개의 분리된 단계**로, **위 리터럴 표기 그대로** 작성한다. 표기 변형을 허용하려면 이 기준을 정규식으로 완화하는 것이 아니라 REQ-CI-004 를 먼저 고쳐야 한다 — 기준을 조용히 넓히면 「순서대로 세 단계」라는 관측 가능성 자체가 사라진다.

### AC-CI-003 — 재시도·실패 억제 장치가 하나도 없다

- **Given** 워크플로 파일이 존재하고,
- **When** 아래 명령을 실행하면,
- **Then** 출력의 마지막 줄이 `NO SUPPRESSION` 이다.

```bash
python3 - <<'PY'
import yaml, json
d = yaml.safe_load(open('.github/workflows/ci.yml'))
blob = json.dumps(d).lower()
banned = ['continue-on-error', 'nick-fields/retry', 'retry-on', '|| true', 'set +e']
hits = [b for b in banned if b in blob]
print('hits:', hits)
assert not hits, hits
print('NO SUPPRESSION')
PY
```

- 검증 대상 요구사항: REQ-CI-006.
- **반증 가능성**: 어느 단계에든 `continue-on-error: true` 를 넣으면 `hits` 가 비지 않아 실패한다.
- **한계 공시**: 이 기준은 **열거한 형태**만 잡는다. 열거되지 않은 새 억제 수단은 잡지 못하며, 실제 붉어짐의 관측은 AC-CI-004 가 담당한다.

### AC-CI-004 — 실행 환경·권한·동시성·시간 제한이 명시적으로 고정돼 있다

- **Given** 워크플로 파일이 존재하고,
- **When** 아래 명령을 실행하면,
- **Then** 출력의 마지막 줄이 `HYGIENE OK` 다.

```bash
python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.github/workflows/ci.yml'))
job = next(iter(d['jobs'].values()))
assert job['runs-on'] == 'ubuntu-latest', job['runs-on']
assert isinstance(job.get('timeout-minutes'), int), job.get('timeout-minutes')
perms = d.get('permissions') or job.get('permissions')
assert perms == {'contents': 'read'}, perms
conc = d.get('concurrency') or job.get('concurrency')
assert conc and conc.get('cancel-in-progress') is True, conc
setup = [s for s in job['steps'] if 'setup-node' in str(s.get('uses', ''))]
assert len(setup) == 1, setup
w = setup[0]['with']
assert w.get('cache') == 'npm', w

# Node 버전 고정 — OD-2 의 두 형태를 모두 수용한다 (감사 D6).
#   (a) 워크플로에만 고정  → node-version: '24'
#   (b) .nvmrc 단일 출처   → node-version-file: .nvmrc  (node-version 키가 아예 없다)
# v0.2.0 은 (a) 만 가정해 str(None).startswith('24') 로 깨졌다.
nv, nvf = w.get('node-version'), w.get('node-version-file')
assert (nv is None) != (nvf is None), ('정확히 한 형태만 쓸 것', w)
if nv is not None:
    assert str(nv).startswith('24'), w
    print('node pin: node-version =', nv)
else:
    import pathlib
    body = pathlib.Path(nvf).read_text().strip()
    assert body.lstrip('v').startswith('24'), (nvf, body)
    print('node pin:', nvf, '->', body)
print('runs-on/timeout/permissions/concurrency/node/cache 모두 고정됨')
print('HYGIENE OK')
PY
```

- 검증 대상 요구사항: REQ-CI-008 · REQ-CI-009 · REQ-CI-010 · REQ-CI-011 · REQ-CI-012.
- **[HARD] 두 형태를 모두 수용하되 배타적으로 단언한다** (감사 D6). OD-2 (b) 는 값을 바꾸는 것이 아니라 **`node-version` 키를 없앤다** — v0.2.0 의 공시 두 자리는 「값이 바뀔 수 있다」만 말했고 키 제거를 예고하지 못했다. `!=` 배타 단언은 두 키를 동시에 쓰는 모호한 형태도 함께 막는다.
- **남은 결합**: 메이저 버전 `24` 자체는 여전히 이 기준에 리터럴로 박혀 있다. 리드가 다른 메이저를 고르면 **이 자리 두 곳**(`startswith('24')` ×2)을 함께 고친다 — `plan.md` §D-2 파급표 OD-2 행이 그 의무를 진다.

---

## B. 원격에서 실제로 돌아갔다는 관측

### AC-CI-005 — 이 브랜치 head SHA 에서 결론이 `success` 다

- **Given** 워크플로 파일이 커밋되어 `WT-ci-test-wiring` 브랜치가 원격에 push 됐고,
- **When** 아래 명령을 실행하면,
- **Then** 출력이 `success` 한 줄이다.

```bash
SHA=$(git rev-parse HEAD)
gh run list --repo bjw202/minidiscord --commit "$SHA" --workflow ci.yml \
  --json conclusion,headSha,status --jq '.[0] | select(.status=="completed") | .conclusion'
```

- 보조(사람이 읽는 근거): `gh run view <run-id> --repo bjw202/minidiscord --log` 의 마지막 단계 출력에 `283` 통과가 보인다.
- 검증 대상 요구사항: REQ-CI-002 · REQ-CI-004.
- **[HARD] 증거의 귀속**: 통과 판정은 **이 명령의 출력**이며, 「push 했으니 돌았을 것」은 증거가 아니다. 출력이 비어 있으면(실행이 없거나 아직 completed 가 아니면) 그것은 **미관측**이지 통과가 아니다.
- **이 기준은 push 트리거만 잰다.** pull_request 트리거는 AC-CI-010 이 별도로 잰다.

### AC-CI-010 — pull_request 트리거에서도 실행이 관측된다

- **Given** AC-CI-005 가 통과했고,
- **When** 아래 절차를 실행하면,
- **Then** PR head SHA 에서 `pull_request` 이벤트로 뜬 실행의 결론이 `success` 다.

```bash
# 1) draft PR 을 연다 (병합하지 않는다).
gh pr create --repo bjw202/minidiscord --draft \
  --base main --head WT-ci-test-wiring \
  --title "chore(SPEC-CI-001): CI 트리거 관측용 draft (병합 금지)" \
  --body "AC-CI-010 관측 전용. 관측 후 닫는다."

PR=$(gh pr view --repo bjw202/minidiscord --json number --jq .number)
SHA=$(gh pr view "$PR" --repo bjw202/minidiscord --json headRefOid --jq .headRefOid)

# 2) 관측: 그 SHA 에서 event 가 pull_request 인 실행의 결론.
gh run list --repo bjw202/minidiscord --commit "$SHA" --workflow ci.yml \
  --json conclusion,status,event \
  --jq '.[] | select(.event=="pull_request" and .status=="completed") | .conclusion'   # → success

# 3) 정리: PR 을 닫는다 (병합하지 않는다).
gh pr close "$PR" --repo bjw202/minidiscord
```

- 검증 대상 요구사항: **REQ-CI-003** (v0.2.0 에서 이 요구를 겨누는 행위 기준이 **하나도 없었다**).
- **[HARD] 왜 이 기준이 필요한가** (감사 D5). AC-CI-001 은 트리거 **선언**만 재므로 아래 워크플로가 통과한다:
  ```yaml
  on:
    push:
    pull_request:
      paths: ['no-such-directory/**']
  ```
  `pull_request` 키가 있으니 초록이고, PR 실행은 **한 번도 일어나지 않는다.** push 쪽은 AC-CI-005 가 이 구멍을 막지만 pull_request 쪽에는 대응하는 원격 관측이 없었다 — 이 SPEC 이 스스로 이름 붙인 「초록이면 통과」가 기준 집합 **안에서** 재현된 자리였다.
- **`event=="pull_request"` 필터가 하중을 진다.** 그 필터 없이 SHA 로만 조회하면 push 이벤트 실행이 잡혀 **PR 트리거가 죽어 있어도 초록**이 된다 — 이 기준을 무력화하는 가장 쉬운 방법이므로 명시한다.
- **[HARD] PR 생성 권한이 없으면 이 기준은 미관측이다.** 이 카드의 plan 세션은 PR 을 열지 않는다(제약). run 단계가 위 명령을 실행하며, 리드가 PR 생성을 보류하면 그것은 **면제가 아니라 공백(gap)** 이고 `progress.md` §E.2 에 그렇게 기록한다. 대체 경로가 필요하면 AC-CI-001 의 필터 단언이 **부분적** 방어일 뿐임을 함께 적는다.

---

## C. 게이트가 붉어질 수 있음의 관측 — 이 집합의 하중 지지점

두 기준은 **고의 파괴 → 관측 → 되돌림**의 절차를 밟는다. 절차의 공통 규칙:

- 파괴는 **임시 커밋 하나**로 하고, 그 커밋은 **병합되지 않는다**. `scratch:` 접두로 표시한다.
- 관측이 끝나면 즉시 `git revert` 로 되돌리고, `git log --oneline` 과 AC-CI-005 재실행으로 원상 복구를 확인한다.
- **[HARD] `git commit -a` 금지 — 경로를 명시해 스테이징한다** (감사 D2). `-a` 는 추적 중 수정 파일을 **전부** 쓸어담는다. 이 시점에 `progress.md` 는 DoD 1 이 요구하는 기준 출력 기록으로 수정 상태일 개연성이 높고, 그러면 **진짜 증거가 「병합 금지」 파괴 커밋에 실려 `git revert` 가 그것까지 되돌린다.** 이 프로젝트는 `kanban-dispatch.md` § 쓸어담기 금지에서 같은 이유로 `-a` 를 금한다.
- **[HARD] 증거 기록은 되돌림 밖에 착지시킨다.** 아래 절차의 관측 출력은 먼저 `.moai/state/verify/t27-run/` 아래 파일로 받고, `progress.md` §E.2 기록과 그 커밋은 **revert 가 끝난 뒤 별도 커밋**으로 한다.
- **[HARD] 파괴 단계는 명령이다.** v0.2.0 은 파일 생성을 `# 내용: …` 주석으로, 워크플로 편집을 「주석 처리한다」는 산문으로 적어 두고 바로 `git add`/`git commit -am` 을 이었다 — 적힌 대로 실행하면 `git add` 는 없는 파일을 가리켜 실패하고 `git commit -am` 은 담을 것이 없어 비영 종료한다(감사관이 이 나무에서 `git commit -a --dry-run` 으로 확인). 아래는 그대로 실행되는 명령열이다.

### AC-CI-006 — 테스트가 깨지면 결론이 `failure` 다 (변별 기준)

- **Given** AC-CI-005 가 통과한 head 가 원격에 있고,
- **When** 아래 절차를 실행하면,
- **Then** 파괴 SHA 의 결론이 `failure` 이고, 되돌림 뒤 head SHA 의 결론이 다시 `success` 다.

```bash
mkdir -p .moai/state/verify/t27-run

# 1) 파괴: 반드시 실패하는 임시 테스트 파일 하나를 만든다 (기존 파일 무수정).
cat > server/test/zz-scratch-fail.test.ts <<'EOF'
import { describe, it, expect } from 'vitest'

describe('scratch', () => {
  it('scratch: CI 변별용 의도적 실패 — 병합 금지', () => {
    expect(1).toBe(2)
  })
})
EOF
git add server/test/zz-scratch-fail.test.ts          # 경로 명시. -a 금지
git commit -m "scratch: CI 변별 — 의도적 실패 (병합 금지)"
git push origin WT-ci-test-wiring
BAD=$(git rev-parse HEAD); echo "BAD=$BAD" | tee .moai/state/verify/t27-run/ac006-sha.txt

# 2) 관측: 결론이 failure 여야 한다. (CI 완료까지 폴링)
gh run list --repo bjw202/minidiscord --commit "$BAD" --workflow ci.yml \
  --json conclusion,status --jq '.[0] | select(.status=="completed") | .conclusion' \
  | tee -a .moai/state/verify/t27-run/ac006-bad.txt      # → failure

# 3) 되돌림: 파괴 커밋을 되돌린다. revert 는 그 커밋이 담은 파일만 되돌린다 —
#    2)의 관측 출력은 위 파일에 이미 있고 아직 커밋되지 않았으므로 되돌림 대상이 아니다.
git revert --no-edit "$BAD"
git push origin WT-ci-test-wiring
GOOD=$(git rev-parse HEAD); echo "GOOD=$GOOD" | tee -a .moai/state/verify/t27-run/ac006-sha.txt

# 4) 원상 확인: 결론이 다시 success 여야 한다.
gh run list --repo bjw202/minidiscord --commit "$GOOD" --workflow ci.yml \
  --json conclusion,status --jq '.[0] | select(.status=="completed") | .conclusion' \
  | tee -a .moai/state/verify/t27-run/ac006-good.txt     # → success

# 5) 증거 기록은 여기서, 되돌림이 끝난 뒤에 (별도 커밋).
#    progress.md §E.2 에 위 파일들의 내용을 원문으로 옮긴 뒤:
git add .moai/specs/SPEC-CI-001/progress.md .moai/state/verify/t27-run/
git commit -m "docs(SPEC-CI-001): M4 AC-CI-006 변별 증거 (card t27)"
```

- 검증 대상 요구사항: REQ-CI-006 · REQ-CI-007.
- **무엇이 변이되는가**: 새 테스트 파일 하나(`server/test/zz-scratch-fail.test.ts`)의 추가. 기존 코드·기존 테스트는 건드리지 않는다.
- **기대**: `failure` → 되돌림 → `success`.
- **병합 금지**: 파괴 커밋과 그 revert 는 이 브랜치 안에서만 살고, 리드의 통합 대상은 **되돌림 이후의 head** 다.
- **이 기준이 없으면 무엇이 무너지는가**: `npm test` 단계를 통째로 지운 워크플로도 AC-CI-005 를 통과한다. 이 기준만이 그것을 배제한다.

### AC-CI-007 — 빌드 단계를 빼면 채널 6건이 실패한다 (순서 요구의 변별)

- **Given** AC-CI-006 이 통과했고,
- **When** 아래 절차를 실행하면,
- **Then** 파괴 SHA 의 결론이 `failure` 이며, 그 실행 로그에 채널 워크스페이스 실패 **6건**과 세 파일 이름(`gateway-mutual-auth` · `index-wiring` · `transport-auth`)이 보인다. 되돌림 뒤 결론은 다시 `success` 다.

```bash
# 1) 파괴: 워크플로에서 빌드 단계를 제거한다. 편집을 명령으로 표현한다 —
#    PyYAML 로 읽어 해당 step 을 지우면 들여쓰기 실수 없이 재현 가능하다.
python3 - <<'PY'
import re, pathlib
p = pathlib.Path('.github/workflows/ci.yml')
lines = p.read_text().splitlines(keepends=True)
# 'npm run build -w channel' 을 담은 step 블록(그 앞의 '- name:' 부터 다음 '- name:' 전까지)을 지운다.
hit = next(i for i, l in enumerate(lines) if 'npm run build -w channel' in l)
start = max(i for i in range(hit + 1) if re.match(r'\s*- (name|run):', lines[i]))
indent = len(lines[start]) - len(lines[start].lstrip())
end = next((i for i in range(start + 1, len(lines))
            if re.match(r'\s*- (name|run):', lines[i])
            and len(lines[i]) - len(lines[i].lstrip()) == indent), len(lines))
p.write_text(''.join(lines[:start] + lines[end:]))
print('removed lines', start, '..', end)
PY
grep -c 'npm run build -w channel' .github/workflows/ci.yml   # → 0 (제거 확인)

git add .github/workflows/ci.yml                     # 경로 명시. -a 금지
git commit -m "scratch: CI 변별 — channel 빌드 단계 제거 (병합 금지)"
git push origin WT-ci-test-wiring
BAD=$(git rev-parse HEAD); echo "BAD=$BAD" | tee .moai/state/verify/t27-run/ac007-sha.txt

# 2) 관측: 결론 + 실패 개수 + 실패 파일 이름.
RUN_ID=$(gh run list --repo bjw202/minidiscord --commit "$BAD" --workflow ci.yml \
  --json conclusion,status,databaseId \
  --jq '.[0] | select(.status=="completed") | "\(.conclusion) \(.databaseId)"' \
  | tee -a .moai/state/verify/t27-run/ac007-bad.txt | awk '{print $2}')   # 결론 → failure
gh run view "$RUN_ID" --repo bjw202/minidiscord --log \
  | grep -E "Tests +6 failed|gateway-mutual-auth|index-wiring|transport-auth" \
  | tee -a .moai/state/verify/t27-run/ac007-bad.txt

# 3) 되돌림 + 원상 확인 + 증거 커밋: AC-CI-006 의 3)~5) 와 같은 형태
#    (`git revert --no-edit "$BAD"` → push → success 재관측 → 되돌림 뒤 별도 증거 커밋).
```

- 검증 대상 요구사항: REQ-CI-005.
- **로컬 절반은 이미 측정됐다**: 빌드 없이 돌린 로컬 실행이 `Tests 6 failed | 89 passed (95)`, exit 1 을 냈다(`.moai/state/verify/t27-plan/test-no-build.log`, `spec.md` §2.2). 이 기준은 그 **원격 절반**을 채운다.
- **[HARD] 두 절반은 서로를 대체하지 않는다.** 로컬 실측만으로는 «CI 도 그럴 것» 이 추정이고, 원격 관측만으로는 실패 원인이 빌드 순서임이 확정되지 않는다.

---

## D. 위생

### AC-CI-008 — 스위트 실행이 작업 트리를 더럽히지 않는다

- **Given** 깨끗한 체크아웃이고,
- **When** 아래를 실행하면,
- **Then** `git status --porcelain` 출력에 `server/data` · `channel/dist` · `coverage` 가 **한 줄도 없다**.

```bash
npm run build -w channel
npm test
git status --porcelain
```

- 검증 대상 요구사항: REQ-CI-004 (CI 가 산출물을 커밋하지 않고, 권한도 `contents: read` 라 커밋할 수 없다는 것의 로컬 대응물).
- **근거**: `server/src/config.ts:8` 이 `MINIDISCORD_DATA_DIR ?? './data'` 를 읽어 `server/data` 를 만들고, `.gitignore` 가 `data/` · `dist/` · `coverage/` 를 이미 무시한다(`spec.md` §2.5).
- **반증 가능성**: `.gitignore` 에서 `data/` 를 빼면 이 기준이 즉시 붉어진다.

### AC-CI-009 — 열려 있는 리드 결정이 run 진입 전에 닫혔다

- **Given** run 단계 진입 직전이고,
- **When** 아래를 실행하면,
- **Then** 출력의 마지막 줄이 정확히 `CLOSED 3` 다 (OD-1 · OD-2 · OD-3).

```bash
python3 - <<'PY'
import re
lines = open('.moai/specs/SPEC-CI-001/plan.md').read().splitlines()

# 판정 자리는 각 '### OD-N' 헤딩부터 다음 헤딩(어떤 수준이든 '#' 로 시작) 직전까지다.
# 범위를 '## D.'~'## E.' 로 잡으면 그 사이의 다른 하위절까지 삼킨다 — 감사 D1 이 그 경로로
# 미끼 3줄을 심어 OD 셋이 전부 (대기) 인 채로 기준을 통과시켰다.
starts = [i for i, l in enumerate(lines) if re.match(r'^### OD-\d', l)]
assert len(starts) == 3, ('OD 절이 정확히 셋이어야 한다', starts)

closed = 0
for s in starts:
    e = next((j for j in range(s + 1, len(lines)) if lines[j].startswith('#')), len(lines))
    hits = [l for l in lines[s:e] if l.startswith('결정됨:')]
    assert len(hits) == 1, ('각 OD 절에 결정됨: 은 정확히 1줄', lines[s], hits)
    v = hits[0][len('결정됨:'):].strip()
    print(lines[s][:40].strip(), '->', v)
    if re.match(r'^\((a|b|c)\)\s*\S', v):
        closed += 1
print('CLOSED', closed)
PY
```

- 검증 대상: `spec.md` §4 · `plan.md` §D · §D-2 파급표.
- **[HARD] 이 기준에는 대응 `REQ-CI-*` 가 없다 — 의도된 것이며 여기 공시한다** (감사 O11). AC-CI-001~008·010 은 전부 요구를 겨누지만 이것은 **절차 기준**이다: 「결정이 닫혔는가」는 CI 워크플로의 성질이 아니라 이 SPEC 의 진행 조건이므로 요구 집합에 대응물이 없다. DoD 1 이 열 건을 동등하게 다루므로, 성질이 다른 한 건이 섞여 있다는 사실을 적어 둔다.
- **[HARD] 왜 이 형태인가 — v0.2.0 의 이 기준은 아무 결정도 닫지 않고 통과했다** (감사 D1, 기계적으로 입증됨). 이전 형태는 `sed '/^## D\./,/^## E\./p'` 로 범위를 잡았는데 그 범위가 `#### 형제 카드 제약` 하위절까지 삼켰다. 감사관이 그 하위절에 OD 와 무관한 `결정됨:` 3줄을 심자 **OD 셋이 전부 `(대기)` 인 채로 기준이 `3` 을 냈다.** 「위 세 줄이 유일한 판정 자리다」라는 `plan.md` 의 산문은 **아무 명령도 강제하지 않는 의도 선언**이었다 — 이 프로젝트가 반복 기록한 「검증하지 않는 수용 기준」 부류다.
- **새 형태가 그것을 막는 세 가지**:
  1. **범위가 아니라 헤딩에 앵커한다.** 각 `### OD-N` 부터 다음 `#` 헤딩 직전까지만 본다 — 다른 절의 `결정됨:` 문자열은 어떤 절에도 속하지 않아 세지 않는다.
  2. **절당 정확히 1줄을 단언한다.** OD 절 **안에** 미끼를 심어도 `len(hits) == 1` 이 깨진다.
  3. **값의 형태를 단언한다.** `(a)`/`(b)`/`(c)` 뒤에 실제 근거 문자가 있어야 센다 — `결정됨:` 뒤를 비우거나 `(대기)` 를 지우기만 하는 우회가 막힌다(v0.2.0 은 이 구멍을 공시만 하고 닫지 않아 사람 눈에 의존했다).
- **반증 가능성**: 전부 미결이면 `CLOSED 0`, 둘만 닫으면 `CLOSED 2`. OD 절이 늘거나 줄면 첫 `assert` 가 깨진다.
- **[HARD] 이 기준만 닫아서는 부족하다.** 결정을 닫는 커밋은 `plan.md` §D-2 **결정 파급표에서 그 행의 모든 열**(요구·수용 기준·§5 배제·DoD)을 함께 고쳐야 한다. 특히 OD-3 (b) 는 REQ-CI-004·005 를 거짓으로 만들고, OD-1 (b) 는 DoD 1 의 기준 개수를 바꾼다.
- **의미**: OD-1·OD-2 는 이 SPEC 이 스스로 정하지 않는다. 리드가 결정하면 `plan.md` §D 의 각 항목에 `결정됨: <값> — <근거>` 를 적고, 그 결정이 워크플로 내용을 바꾸면 AC-CI-002·AC-CI-004 를 함께 고친다.
- **[HARD]** 미결인 채 run 으로 넘어가면, 구현이 결정을 대신 내리게 된다.

---

## E. 완료의 정의 (Definition of Done)

아래를 **전부** 만족할 때만 이 SPEC 은 run 단계를 종료한다.

1. AC-CI-001 ~ AC-CI-010 **열 건**이 전부 통과하고, 각 기준의 명령 출력이 `progress.md` §E.2 에 **원문으로** 기록됐다.
   - **[HARD] 이 개수는 OD-1 에 종속된다** (감사 D6 후단). OD-1 이 (b)(typecheck 편입)로 결정되면 AC 가 1건 늘어 **열한 건**이 된다. v0.2.0 은 이 연동을 어느 문서에도 적지 않았다. `plan.md` §D-2 파급표 OD-1 행이 그 의무를 진다. 반면 **AC-CI-009 의 기대값 `CLOSED 3` 은 어떤 결정에서도 변하지 않는다** — 결정의 *수*는 늘지 않기 때문이다. 두 수가 서로 다른 것에 매여 있음을 여기 적는다.
2. AC-CI-006 · AC-CI-007 의 파괴 커밋이 **되돌려졌고**, 되돌림 이후 head 에서 결론 `success` 가 다시 관측됐다. **증거 기록 커밋이 되돌림 뒤에 있다**(파괴 커밋에 실리지 않았다) — `git log --oneline` 으로 순서를 확인한다.
3. AC-CI-010 의 draft PR 이 **닫혔고 병합되지 않았다** (`gh pr view <PR> --json state,merged`).
4. 변경된 파일이 결정된 범위와 정확히 일치한다 — `git diff --stat main...HEAD` 가 `.github/workflows/` 아래 한 파일 + `.moai/` 문서·증거만 보인다. 여기에 더해질 수 있는 파일은 **결정에 의해서만** 늘어난다: OD-2 가 (b) 면 `.nvmrc`, **OD-3 이 (b)/(c) 면 `channel/package.json`**. 결정되지 않은 파일이 보이면 범위 이탈이다.
5. `spec.md` §2.6 의 흔들림에 대해 **어떤 재시도 장치도 추가되지 않았음**이 AC-CI-003 으로 확인됐다.
6. **AC-CI-009 가 `CLOSED 3` 을 낸다** — 세 리드 결정이 전부 닫혔고, `plan.md` §D-2 파급표에서 각 결정 행의 네 열이 함께 반영됐다.

### 통과 판정에서 명시적으로 **제외**되는 것

- 커버리지 수치·임계 — `spec.md` §5 에서 배제됐다. 어떤 커버리지 값도 이 카드의 통과 근거가 아니다.
- `spec.md` §2.6 흔들림의 실패율 — **미측정**이며, 이 카드는 그것을 측정하지 않는다.
- 브랜치 보호(required status checks) 적용 여부 — 배제됐다.
