# SPEC-CI-001 — 수용 기준

> **원칙 [HARD]**: 어떤 명령으로도 반증할 수 없는 기준은 이 파일에 실리지 못한다. 각 기준은 ① 증거를 만드는 **명령**과 ② 그 출력이 무엇이면 통과인지를 함께 적는다.
>
> 이 카드가 특히 경계하는 두 형태:
> - **「검증하지 않는 수용 기준」** — 기준이 이름 붙인 동작을 통째로 지워도 초록으로 남는 기준.
> - **「초록이면 통과」** — CI 기준을 «워크플로가 성공했다» 로 적으면 **아무것도 실행하지 않는 워크플로**가 그 기준을 만족시킨다. 그래서 §C 의 변별 기준(AC-CI-006·007)이 이 집합의 무게 중심이다.

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

<!-- [OD-DEP:1] OD-1 (b) 는 단계를 하나 더한다 / [OD-DEP:3] OD-3 (b) 는 세 단계를 두 단계로 줄인다 -->
### AC-CI-002 — 파이프라인이 선언된 순서로 존재하고, 빌드 단계는 워크플로에 없으며, `npm test` 가 자족한다

> **[HARD] 이 기준은 v0.6.0 에서 다시 씌었다 — 원인은 OD-1 = (b) · OD-3 = (b) 다.** v0.5.0 의 이 기준은 「`npm ci` → `npm run build -w channel` → `npm test` 세 단계」를 쟀다. **OD-3 (b) 가 빌드 단계를 워크플로에서 지우고 `channel` 의 `pretest` 로 옮겼으므로 옛 단언은 붉어질 수밖에 없고**, **OD-1 (b) 가 typecheck 두 단계를 더했다.** 그래서 이제 셋을 잰다: ① `npm ci` → typecheck ×2 → `npm test` 의 **강한 순서**, ② 워크플로에 **빌드 단계가 없음**(= 채택된 것이 (c) 가 아니라 (b) 임을 재는 자리), ③ `channel/package.json` 의 **`pretest` 존재**(= REQ-CI-005′ 의 정적 관측).

- **Given** 워크플로 파일이 AC-CI-001 을 통과했고,
- **When** 아래 명령으로 작업 단계의 `run` 문자열을 순서대로 뽑으면,
- **Then** 네 인덱스가 `npm ci` < `typecheck -w server` < `typecheck -w channel` < `npm test` 로 **강하게** 정렬되고, 빌드 단계 적중이 0 이며, `channel` 의 `pretest` 가 존재하고, 출력의 마지막 줄이 `PIPELINE OK` 다.

```bash
python3 - <<'PY'
import yaml, json, pathlib
d = yaml.safe_load(open('.github/workflows/ci.yml'))
job = next(iter(d['jobs'].values()))
runs = [s.get('run', '') for s in job['steps']]

def idx(needle):
    hits = [i for i, r in enumerate(runs) if needle in r]
    assert len(hits) == 1, (needle, hits)
    return hits[0]

i_ci   = idx('npm ci')
i_ts   = idx('npm run typecheck -w server')
i_tc   = idx('npm run typecheck -w channel')
i_test = idx('npm test')
print('indices:', i_ci, i_ts, i_tc, i_test)
assert i_ci < i_ts < i_tc < i_test, (i_ci, i_ts, i_tc, i_test)

# OD-3 (b): 빌드는 워크플로가 아니라 pretest 가 한다. (c) 였다면 이 단언이 깨진다.
build_hits = [i for i, r in enumerate(runs) if 'npm run build -w channel' in r]
assert not build_hits, ('OD-3 (b) — 워크플로에 빌드 단계가 있으면 안 된다', build_hits)

# REQ-CI-005-prime 의 정적 관측: pretest 가 빌드를 수행한다.
pkg = json.loads(pathlib.Path('channel/package.json').read_text())
pre = pkg.get('scripts', {}).get('pretest')
assert pre and 'tsc' in pre, ('REQ-CI-005-prime pretest', pre)
print('channel pretest:', pre)
print('PIPELINE OK')
PY
```

- 검증 대상 요구사항: REQ-CI-004′ · REQ-CI-005′ · REQ-CI-013.
- **반증 가능성**: typecheck 단계를 하나 지우면 `assert len(hits) == 1` 이 깨지고, 순서를 뒤집으면 부등호 단언이 깨지고, 워크플로에 빌드 단계를 되살리면(= (c) 형태) `build_hits` 단언이 깨지고, `channel/package.json` 에서 `pretest` 를 지우면 마지막 단언이 깨진다.
- **[HARD] 이 기준은 요구보다 좁다 — 그 좁음을 요구 쪽에 명시했다** (감사 O3, v0.6.0 에서 네 바늘로 확대). `idx()` 는 각 바늘의 적중이 **정확히 1회**임을 요구하고 네 인덱스의 **강한 부등호**를 단언한다. 그래서 REQ-CI-004′ 를 만족하는 다른 구현들이 이 기준에 떨어진다:
  - 명령들을 **한 `run: |` 블록**에 순서대로 넣으면 인덱스가 모두 같아져 강한 부등호가 거짓이 된다.
  - `npm run typecheck --workspace channel`(같은 뜻, 다른 표기)은 `'npm run typecheck -w channel'` 문자열에 걸리지 않아 적중 0 이 된다.

  **해소 방향은 기준 완화가 아니라 요구 명시다**: run 단계는 네 명령을 **네 개의 분리된 단계**로, **위 리터럴 표기 그대로** 작성한다(`plan.md` §E 「단계 순서」 행이 같은 것을 적는다). 표기 변형을 허용하려면 이 기준을 정규식으로 완화하는 것이 아니라 REQ-CI-004′·REQ-CI-013 을 먼저 고쳐야 한다 — 기준을 조용히 넓히면 「순서대로 분리된 단계」라는 관측 가능성 자체가 사라진다.
- **[HARD] typecheck 가 서는 자리를 여기서 재는 것은 리드의 지정이 아니다.** 리드는 「typecheck 를 넣는다」까지 정했고 **자리를 지정하지 않았다**(`plan.md` §D OD-1 아래 [HARD]). 위 부등호는 plan 레인이 고른 자리를 굳히는 단언이므로, 리드가 자리를 뒤집으면 **이 부등호 · AC-CI-012 · `plan.md` §E 「단계 순서」 행 셋을 함께** 고친다.

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
- **한계 공시**: 이 기준은 **열거한 형태**만 잡는다. 열거되지 않은 새 억제 수단은 잡지 못하며, 실제 붉어짐의 관측은 §C 의 AC-CI-006·007 이 담당한다.

<!-- [OD-DEP:2] OD-2 는 node-version / node-version-file 중 어느 형태가 서는지 정한다 -->
### AC-CI-004 — 실행 환경·권한·동시성·시간 제한이 명시적으로 고정돼 있다

- **Given** 워크플로 파일이 존재하고,
- **When** 아래 명령을 실행하면,
- **Then** 출력의 마지막 줄이 `HYGIENE OK` 다.

```bash
python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.github/workflows/ci.yml'))
job = next(iter(d['jobs'].values()))
# 단언마다 어느 요구를 지키는지 메시지에 적는다 (감사 R2-9). 이 기준 하나가 요구 다섯을
# 겨누므로, 붉어졌을 때 어느 요구가 깨졌는지가 단언 메시지에서 바로 읽혀야 한다.
assert job['runs-on'] == 'ubuntu-latest', ('REQ-CI-008 러너', job['runs-on'])
assert isinstance(job.get('timeout-minutes'), int), ('REQ-CI-012 시간 제한', job.get('timeout-minutes'))
perms = d.get('permissions') or job.get('permissions')
assert perms == {'contents': 'read'}, ('REQ-CI-010 최소 권한', perms)
conc = d.get('concurrency') or job.get('concurrency')
assert conc and conc.get('cancel-in-progress') is True, ('REQ-CI-011 동시성', conc)
setup = [s for s in job['steps'] if 'setup-node' in str(s.get('uses', ''))]
assert len(setup) == 1, ('REQ-CI-008 setup-node 단일', setup)
w = setup[0]['with']
assert w.get('cache') == 'npm', ('REQ-CI-009 npm 캐시', w)

# Node 버전 고정 — OD-2 = (b) 로 닫혔으므로 그 한 형태만 수용한다 (v0.6.0).
#   채택된 형태: node-version-file: .nvmrc  (node-version 키는 아예 없다)
# v0.2.0 은 반대로 (a) 만 가정해 str(None).startswith('24') 로 깨졌다 — 감사 D6.
import pathlib
nv, nvf = w.get('node-version'), w.get('node-version-file')
assert nv is None, ('REQ-CI-008 / OD-2 (b) — node-version 키가 있으면 안 된다', w)
assert nvf == '.nvmrc', ('REQ-CI-008 / OD-2 (b) — node-version-file 은 .nvmrc 여야 한다', w)
body = pathlib.Path(nvf).read_text().strip()
assert body.lstrip('v').startswith('24'), (nvf, body)
print('node pin:', nvf, '->', body)
print('runs-on/timeout/permissions/concurrency/node/cache 모두 고정됨')
print('HYGIENE OK')
PY
```

- 검증 대상 요구사항: REQ-CI-008 · REQ-CI-009 · REQ-CI-010 · REQ-CI-011 · REQ-CI-012.
- **[HARD] v0.6.0 에서 「두 형태 수용」을 「한 형태」로 좁혔다 — 왜 좁히는 것이 옳은가.** v0.3.0 은 감사 D6 에 답하며 이 단언을 **두 형태 모두 수용**(`(nv is None) != (nvf is None)`)으로 넓혔다. 결정이 미결이던 동안 그것은 옳았다 — 어느 쪽으로 닫힐지 몰랐으니 기준이 결정을 앞질러 정할 수 없었다. **결정이 (b) 로 닫힌 지금 같은 단언을 그대로 두면 그 기준은 결정을 재지 못한다**: `node-version: '24'` 로 되돌려 놓아도 초록이므로, OD-2 의 결과가 구현에 실제로 반영됐는지를 아무 명령도 확인하지 않게 된다. 「검증하지 않는 수용 기준」이 **결정 종결이라는 새 국면에서 재현되는** 형태이므로 좁혔다.
  - 좁힌 뒤 잡히는 것: `node-version` 키를 되살리면(그리고 `node-version-file` 을 지우면) 두 단언 중 하나가 반드시 깨진다. `node-version-file` 이 `.nvmrc` 가 아닌 다른 파일을 가리켜도 깨진다.
  - 여전히 재지 못하는 것: `.nvmrc` **파일이 실제로 커밋됐는지**는 이 기준이 `read_text()` 로 읽으므로 확인되지만, **`.gitignore` 에 걸려 원격에 없는** 경우는 로컬 실행으로 잡히지 않는다 — 그 경우 원격 CI 가 `setup-node` 단계에서 붉어지며 AC-CI-005 가 잡는다. 두 절반이 서로를 대체하지 않는다.
- **[HARD] 이 기준 하나가 요구 다섯을 겨눈다 — 기준을 쪼개는 대신 단언 메시지에 요구 이름을 넣었다** (감사 R2-9). O5 가 REQ-CI-010 을 셋으로 쪼갠 이유는 「요구 하나가 위반 하나를 가리키도록」인데, 기준이 쪼개지지 않으면 그 목적이 기준 층에서 절반만 달성된다. **기준을 다섯으로 쪼개지 않은 이유**: 다섯 기준이 전부 같은 파일의 같은 파싱을 반복하게 되고, AC 가 11 → 15 로 늘어 Tier 예산과 감사관의 인지 부담을 함께 밀어 올린다(`plan.md` §0.2.1 이 셈한 것과 같은 대가). 대신 **각 단언 메시지가 자기 요구 이름을 담게** 해서, 붉어졌을 때 `AssertionError: ('REQ-CI-011 동시성', …)` 처럼 어느 요구가 깨졌는지 출력에서 바로 읽힌다. **완전한 1:1 은 아니며 그 차이를 여기 적는다.**
- **남은 결합**: 메이저 버전 `24` 자체는 여전히 이 기준에 리터럴로 박혀 있다. v0.5.0 까지는 두 형태를 수용하느라 `startswith('24')` 가 **두 자리**에 있었으나, 좁히면서 **한 자리**로 줄었다. 리드가 다른 메이저를 고르면 그 한 자리와 `.nvmrc` 의 내용, 그리고 `plan.md` §E 「Node」 행을 함께 고친다 — `plan.md` §D-2 파급표 OD-2 행이 그 의무를 진다.

### AC-CI-012 — typecheck 가 두 워크스페이스를 모두 덮고, 어느 쪽도 억제되지 않는다

> **신설 기준 (v0.6.0) — 원인은 OD-1 = (b) 다.** 리드가 typecheck 편입을 결정하면서 요구 **REQ-CI-013** 이 생겼고, 요구 하나에 그것을 겨누는 기준이 하나 있어야 한다. AC-CI-002 는 **순서**를 재고, 이 기준은 **덮는 범위와 억제 부재**를 잰다 — 순서가 맞아도 한 워크스페이스만 검사하거나 `continue-on-error` 로 실패를 삼키면 REQ-CI-013 은 깨진 채 AC-CI-002 가 초록이기 때문이다.

- **Given** 워크플로 파일이 AC-CI-001 을 통과했고,
- **When** 아래 명령을 실행하면,
- **Then** 두 워크스페이스의 typecheck 단계가 각각 정확히 하나씩 있고, 어느 쪽에도 `if:` · `continue-on-error` 가 없으며, 출력의 마지막 줄이 `TYPECHECK COVERAGE OK` 다.

```bash
python3 - <<'PY'
import yaml
d = yaml.safe_load(open('.github/workflows/ci.yml'))
job = next(iter(d['jobs'].values()))
steps = job['steps']

found = {}
for ws in ('server', 'channel'):
    needle = 'npm run typecheck -w ' + ws
    hits = [s for s in steps if needle in s.get('run', '')]
    assert len(hits) == 1, ('REQ-CI-013 워크스페이스 커버리지', ws, len(hits))
    found[ws] = hits[0]

for ws, s in found.items():
    # 조건부/억제가 붙으면 그 단계는 「실행됐다」를 보장하지 못한다.
    assert 'if' not in s, ('REQ-CI-013 조건부 실행 금지', ws, s.get('if'))
    assert not s.get('continue-on-error'), ('REQ-CI-006 실패 억제 금지', ws, s.get('continue-on-error'))
    print(ws, 'step:', s.get('name') or s.get('run'))

print('TYPECHECK COVERAGE OK')
PY
```

- 검증 대상 요구사항: **REQ-CI-013** (보조로 REQ-CI-006 의 단계 층 확인).
- **반증 가능성**: 두 typecheck 중 하나를 지우면 커버리지 단언이 깨지고, 하나를 `if: false` 나 `continue-on-error: true` 로 무력화하면 나머지 두 단언이 깨진다. 둘을 한 단계로 합쳐도(`npm run typecheck --workspaces`) 리터럴 바늘에 걸리지 않아 적중 0 으로 깨진다.
- **[HARD] AC-CI-002 와 겹치는 부분이 있고, 겹치지 않는 부분이 이 기준의 존재 이유다.** 두 기준 모두 두 typecheck 단계가 각각 하나씩 있음을 확인한다 — 그 중복은 인정한다. **겹치지 않는 것**은 ① `if:` 조건부 무력화, ② 단계 층 `continue-on-error` 억제 두 가지이며, AC-CI-003 은 이것들을 워크플로 **전체 문자열**에서 잡지만 **어느 단계가 억제됐는지는 가리키지 못한다.** 이 기준은 typecheck 단계를 지목해 잰다.
- **한계 공시**: 이 기준은 typecheck 단계가 **선언됐고 억제되지 않았음**만 잰다. 그 단계가 원격에서 실제로 돌아 타입 오류를 잡는지는 **재지 않는다** — 그것은 AC-CI-005 의 원격 초록이 간접적으로만 뒷받침한다. 로컬 실측(`typecheck -w server` exit 0 · `-w channel` exit 0)은 **지금 초록이라는 사실**이지 「CI 에서도 돈다」의 증거가 아니다.
- **[HARD] 이 기준은 리드가 자리를 뒤집으면 함께 고칠 셋 중 하나다** — 나머지 둘은 AC-CI-002 의 부등호와 `plan.md` §E 「단계 순서」 행이다.

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
set -euo pipefail   # [HARD] 어느 단계가 실패하면 멈춘다 — 감사 R3-2 와 같은 규율.
                    # 이 절차는 실패 테스트를 커밋하므로, 중간 실패를 삼키면
                    # 「무엇이 원격에 올라갔는지」가 불확실해진다.

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

# 이 저장소의 pre-commit 훅은 `moai gate` 로 JS 스위트를 돌린다. 방금 만든 실패가
# 게이트를 붉게 만들어 커밋이 거부되므로, 이 한 커밋에서만 공식 우회를 쓴다.
# [HARD] 우회 사실과 이유를 커밋 메시지 본문에 반드시 적는다 — 조용한 우회는 금지.
SKIP_MOAI_PRECOMMIT=1 git commit -m "scratch: CI 변별 — 의도적 실패 (병합 금지)" -m \
"pre-commit 게이트 우회(SKIP_MOAI_PRECOMMIT=1): 이 커밋의 실패는 결함이 아니라
AC-CI-006 의 측정 대상 자체다. 게이트를 통과시키면 잴 것이 사라진다.
이 커밋은 병합되지 않으며 같은 절차의 3) 에서 git revert 로 되돌린다."
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
- **[HARD] 이 절차에서만 pre-commit 게이트를 우회하며, 그 정당성을 여기와 커밋 메시지 두 곳에 공시한다** (감사 R2-1). 이 저장소의 `pre-commit` 훅(`$(git rev-parse --git-common-dir)/hooks/pre-commit`)은 마지막 단계에서 `moai gate` 를 돌리고, 그 게이트가 JS 스위트를 실행한다. **의도적으로 실패하는 테스트를 담은 커밋은 게이트에 막힌다.**
  - **측정으로 확인했다** — 감사관은 이 고리를 가설로 표시했으나, 이 개정에서 직접 쟀다. 같은 나무에서 실패 테스트 하나를 두고 `moai gate` 를 돌린 출력:
    ```
    quality gate failed: npm test
     FAIL  test/zz-gate-probe.test.ts > gate-probe > probe: 의도적 실패
    AssertionError: expected 1 to be 2
    exit=1
    ```
    같은 명령이 실패 테스트 없는 나무에서는 `exit=0`. 원문: `.moai/state/verify/t27-plan/moai-gate-probe.log` · `moai-gate.log`. 탐침 파일은 측정 직후 삭제했다.
  - **왜 여기서만 우회가 옳은가**: 이 커밋의 **붉음이 측정 대상 그 자체**다. 게이트를 통과시키려면 실패를 없애야 하고, 그러면 잴 것이 사라진다. 그리고 이 커밋은 병합되지 않고 같은 절차 안에서 되돌려진다.
  - **조용한 우회는 금지**. 카드 `t22` 가 같은 상황에서 공식 우회 + 커밋 공시를 함께 했고, 이 기준은 그 형식을 따른다. 우회를 명령열에만 넣고 이유를 적지 않으면 그것이 다음 회차의 결함이 된다.
  - **[HARD] 「AC-CI-007 은 우회하지 않는다」는 v0.6.0 에서 철회했다.** v0.5.0 까지 이 자리는 「AC-CI-007 의 파괴 커밋은 `ci.yml` 만 담아 로컬 스위트가 초록이고 게이트를 통과한다」고 단정했다. **OD-3 = (b) 가 그 전제를 무너뜨렸다** — AC-CI-007 의 변이 대상이 `ci.yml` 에서 `channel/package.json` 으로 옮겨졌으므로 그 커밋은 더 이상 「워크플로만 담은 커밋」이 아니다. 게이트 통과 여부는 그 시점 `channel/dist` 의 존재에 달렸고 **우리는 그것을 관측하지 않았다.** 어느 쪽인지 모르는 상태에서 「통과한다」고 계속 적어 두는 것은 미관측 주장이므로 지운다. AC-CI-007 본문이 **두 경로**(우회 없이 시도 → 거부되면 공시와 함께 우회)를 적고 실제로 어느 쪽이었는지 기록하게 한다.
- **무엇이 변이되는가**: 새 테스트 파일 하나(`server/test/zz-scratch-fail.test.ts`)의 추가. 기존 코드·기존 테스트는 건드리지 않는다.
- **기대**: `failure` → 되돌림 → `success`.
- **병합 금지**: 파괴 커밋과 그 revert 는 이 브랜치 안에서만 살고, 리드의 통합 대상은 **되돌림 이후의 head** 다.
- **이 기준이 없으면 무엇이 무너지는가**: `npm test` 단계를 통째로 지운 워크플로도 AC-CI-005 를 통과한다. 이 기준만이 그것을 배제한다.

<!-- [OD-DEP:3] OD-3 (b) 는 이 기준의 변이 대상을 pretest 로 옮긴다 -->
### AC-CI-007 — `pretest` 를 빼면 채널 6건이 실패한다 (자족성 요구의 변별)

> **[HARD] v0.6.0 에서 변이 대상이 옮겨졌다 — 원인은 OD-3 = (b) 다.** v0.5.0 의 이 기준은 **워크플로에서 빌드 단계를 지우는** 변이를 했다. (b) 가 채택되면서 워크플로에는 **지울 빌드 단계가 없어졌고**, 빌드를 수행하는 자리는 `channel/package.json` 의 `pretest` 훅이다. 그러므로 「빌드가 `npm test` 앞에 서지 않으면 붉어진다」를 재려면 **그 훅을 지워야 한다.** 옛 제거 스크립트(경계 정규식·단계 수 단언)는 잴 대상이 사라졌으므로 폐기하고, `package.json` 을 정확히 한 키만 건드리는 변이로 다시 썼다.

- **Given** AC-CI-006 이 통과했고,
- **When** 아래 절차를 실행하면,
- **Then** 파괴 SHA 의 결론이 `failure` 이며, 그 실행 로그에 채널 워크스페이스 실패 **6건**과 세 파일 이름(`gateway-mutual-auth` · `index-wiring` · `transport-auth`)이 보인다. 되돌림 뒤 결론은 다시 `success` 다.

```bash
set -euo pipefail   # [HARD] 단언이 붉어지면 여기서 멈춘다 — 감사 R3-2
                    # (없으면 AssertionError 뒤에도 git add/commit/push 가 그대로 이어져
                    #  잘못 변이된 package.json 이 원격에 올라간다.)

# 1) 파괴: channel/package.json 에서 pretest 키 하나만 지운다.
#    편집을 명령으로 표현한다 — 손편집은 다른 키를 함께 건드릴 수 있다.
python3 - <<'PY'
import json, pathlib
p = pathlib.Path('channel/package.json')
raw = p.read_text()
d = json.loads(raw)
before = dict(d['scripts'])
assert 'pretest' in before, ('지울 pretest 가 없다 — M2 가 넣지 않았다', sorted(before))

removed = d['scripts'].pop('pretest')
p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + '\n')

# [HARD] 변이 폭을 단언한다. 「pretest 가 사라졌다」만으로는
# 「그것만 사라졌다」를 알 수 없다 — 다른 스크립트가 함께 지워지면
# 관측된 failure 의 원인이 pretest 인지 그 스크립트인지 갈리지 않는다
# (「굵은 변이는 절반을 가린다」). 세 단언이 그 주장을 실제로 잰다.
after = json.loads(p.read_text())['scripts']
print('scripts:', len(before), '->', len(after))
assert len(before) - len(after) == 1, ('정확히 한 키만 지워져야 한다', before, after)
assert set(before) - set(after) == {'pretest'}, ('지워진 것이 pretest 여야 한다', set(before) - set(after))
assert after.get('test') == before.get('test'), ('scripts.test 는 글자 그대로 같아야 한다 — 형제 카드 AC-E2E-011', before.get('test'), after.get('test'))
print('removed exactly: pretest =', removed)
print('survivors:', sorted(after))
print('MUTATION EXACT')
PY
# [HARD] `grep -c` 는 적중 0 일 때 종료 코드 1 을 낸다 — set -e 아래에서 그대로 쓰면
# 「제거 확인」 줄이 성공했는데도 블록이 여기서 죽는다(감사 R3-2 에서 재현 확인).
# 부정 검색으로 뒤집어 의도를 유지하면서 종료 코드를 바로잡는다.
! grep -q '"pretest"' channel/package.json   # 적중 0 이어야 통과

git add channel/package.json                 # 경로 명시. -a 금지

# [HARD] 게이트 통과 여부를 **예단하지 않는다** (v0.6.0 정정).
#   이 커밋은 이제 workflow 파일이 아니라 package.json 을 담으므로,
#   로컬 `npm test` 가 붉어질 수 있다 — 그 여부는 이 시점 channel/dist 가
#   남아 있는지에 달렸고 우리는 그것을 관측하지 않았다.
#   그러므로 **우회 없이 먼저 시도하고**, 거부될 때만 공시와 함께 우회한다.
#   어느 경로였는지를 파일로 남긴다 — 다음 회차가 이 자리를 다시 추정하지 않도록.
mkdir -p .moai/state/verify/t27-run
if git commit -m "scratch: CI 변별 — channel pretest 제거 (병합 금지)"; then
  echo "gate=passed (우회 없음)" | tee .moai/state/verify/t27-run/ac007-gate.txt
else
  echo "gate=rejected (SKIP_MOAI_PRECOMMIT=1 우회 사용)" | tee .moai/state/verify/t27-run/ac007-gate.txt
  SKIP_MOAI_PRECOMMIT=1 git commit -m "scratch: CI 변별 — channel pretest 제거 (병합 금지)" -m \
"pre-commit 게이트 우회(SKIP_MOAI_PRECOMMIT=1): 이 커밋의 붉음은 결함이 아니라
AC-CI-007 의 측정 대상 자체다. pretest 를 지우면 깨끗한 상태에서 채널 6건이
실패하며, 게이트를 통과시키려면 그 실패를 없애야 하고 그러면 잴 것이 사라진다.
이 커밋은 병합되지 않으며 같은 절차의 3) 에서 git revert 로 되돌린다."
fi
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

# 3) 되돌림 (산문 참조가 아니라 명령으로 적는다 — 감사 R2-8).
git revert --no-edit "$BAD"
git push origin WT-ci-test-wiring
GOOD=$(git rev-parse HEAD); echo "GOOD=$GOOD" | tee -a .moai/state/verify/t27-run/ac007-sha.txt

# 4) 원상 확인.
gh run list --repo bjw202/minidiscord --commit "$GOOD" --workflow ci.yml \
  --json conclusion,status --jq '.[0] | select(.status=="completed") | .conclusion' \
  | tee -a .moai/state/verify/t27-run/ac007-good.txt     # → success

# 5) 증거 기록은 되돌림 뒤 별도 커밋.
git add .moai/specs/SPEC-CI-001/progress.md .moai/state/verify/t27-run/
git commit -m "docs(SPEC-CI-001): M4 AC-CI-007 변별 증거 (card t27)"
```

- 검증 대상 요구사항: REQ-CI-005′.
- **[HARD] 게이트 우회는 예단하지 않고 관측한다** (v0.6.0 정정 — 이 자리가 이번 개정에서 가장 크게 바뀐 곳이다). v0.5.0 은 「AC-CI-007 은 우회하지 않는다 — `ci.yml` 만 담아 게이트를 통과한다」고 **단정**했고, 그 단정은 변이 대상이 `ci.yml` 이던 시절에만 참이었다. OD-3 (b) 로 변이 대상이 `channel/package.json` 이 되면서 **그 문장은 근거를 잃었다.**
  - **왜 「붉어진다」고도 단정하지 않는가**: 로컬 게이트가 도는 `npm test` 는 `pretest` 가 없어도 `channel/dist` 가 남아 있으면 초록일 수 있다. run 레인의 나무에는 M2 에서 만든 `dist` 가 남아 있을 개연성이 높다. 그러나 **우리는 그 시점의 `dist` 를 관측하지 않았다** — 그러므로 어느 쪽도 주장하지 않고, 명령열이 **실제로 관측해 파일에 적게** 했다(`ac007-gate.txt`).
  - **우회가 필요해질 경우의 정당성은 AC-CI-006 과 같다**: 이 커밋의 붉음이 측정 대상 자체이고, 커밋은 병합되지 않으며 같은 절차 안에서 되돌려진다. **조용한 우회는 금지** — 카드 `t22` 의 선례대로 커밋 메시지 본문에 이유를 적는다(위 명령열이 그 문면을 담는다).
- **[HARD] 변이가 굵어지지 않음을 단언으로 잰다** (감사 R2-2 의 규율을 새 변이 대상으로 이식). 옛 형태는 워크플로 YAML 을 줄 단위로 잘라내며 **인접 단계까지 지울 수 있었고**, 유일한 검사(`grep -c … → 0`)가 과삭제를 보지 못했다. 새 변이는 JSON 키 하나를 지우므로 그 위험이 구조적으로 낮지만, **낮다는 것이 잰다는 뜻은 아니므로** 세 단언을 그대로 세운다: ① 키 수 차이가 정확히 1, ② 지워진 것이 `pretest`, ③ **`scripts.test` 의 값이 글자 그대로 보존**(형제 카드 `SPEC-E2E-001` AC-E2E-011 이 요구하는 성질을 이 변이가 우연히 깨뜨리지 않도록).
- **[HARD] 이 변이는 `json.dumps` 로 파일 전체를 다시 쓴다 — 되돌림이 하중을 진다.** 들여쓰기·키 순서·줄바꿈이 원본과 달라질 수 있으므로, 3) 의 `git revert` 가 원상 복구의 유일한 근거다. revert 뒤 `git status --porcelain` 에 `channel/package.json` 이 남으면 그것은 **미해소**이며 다음 단계로 넘어가지 않는다.
- **로컬 절반은 이미 측정됐다**: 빌드 없이 돌린 로컬 실행이 `Tests 6 failed | 89 passed (95)`, exit 1 을 냈다(`.moai/state/verify/t27-plan/test-no-build.log`, `spec.md` §2.2). 그 실행은 `pretest` 가 없던 시점의 것이므로 **이 변이가 만드는 상태와 같은 상태**다. 이 기준은 그 **원격 절반**을 채운다.
- **[HARD] 두 절반은 서로를 대체하지 않는다.** 로컬 실측만으로는 «CI 도 그럴 것» 이 추정이고, 원격 관측만으로는 실패 원인이 빌드 선행 부재임이 확정되지 않는다.

---

## D. 위생

### AC-CI-008 — 스위트 실행이 작업 트리를 더럽히지 않는다

- **Given** 깨끗한 체크아웃이고,
- **When** 아래를 실행하면,
- **Then** `git status --porcelain` 출력에 `server/data` · `channel/dist` · `coverage` 가 **한 줄도 없다**.

```bash
rm -rf channel/dist        # 깨끗한 체크아웃과 같은 상태로 만든다
npm test                   # pretest 가 빌드를 선행한다 (REQ-CI-005′)
git status --porcelain
```

- 검증 대상 요구사항: REQ-CI-004′ · REQ-CI-005′ (CI 가 산출물을 커밋하지 않고, 권한도 `contents: read` 라 커밋할 수 없다는 것의 로컬 대응물).
- **[HARD] 명령이 v0.6.0 에서 바뀌었다 — 원인은 OD-3 = (b) 다.** v0.5.0 은 `npm run build -w channel` → `npm test` 두 줄이었다. `pretest` 가 생긴 뒤 그 첫 줄은 **중복**이며, 더 나쁘게는 **`pretest` 가 실제로 도는지를 이 기준이 영영 모르게** 만든다(빌드가 이미 끝난 상태로 `npm test` 를 부르므로). `rm -rf channel/dist` 를 앞세워 **`npm test` 한 명령의 자족성**을 이 기준이 함께 관측하게 했다.
- **근거**: `server/src/config.ts:8` 이 `MINIDISCORD_DATA_DIR ?? './data'` 를 읽어 `server/data` 를 만들고, `.gitignore` 가 `data/` · `dist/` · `coverage/` 를 이미 무시한다(`spec.md` §2.5).
- **반증 가능성**: `.gitignore` 에서 `data/` 를 빼면 이 기준이 즉시 붉어진다.

### AC-CI-009 — 열려 있는 리드 결정이 run 진입 전에 닫혔다

- **Given** run 단계 진입 직전이고,
- **When** 아래를 실행하면,
- **Then** 출력의 마지막 줄이 정확히 `CLOSED 3` 다 (OD-1 · OD-2 · OD-3).

```bash
python3 - <<'PY'
import re
raw = open('.moai/specs/SPEC-CI-001/plan.md').read().splitlines()

# 코드펜스 안의 줄은 문서가 아니라 '예시'다. 판정에서 제외한다 (감사 R2-5·R2-7):
#   - R2-5: 펜스 안의 `결정됨: (b) …` 가 진짜 줄 행세를 해 CLOSED 1 이 나왔다.
#   - R2-7: 펜스 안의 `#` 로 시작하는 셸 주석이 절 종결자로 오인돼 절이 잘렸다.
# fenced[i] 가 True 면 그 줄은 펜스 내부다.
fenced, inside = [], False
for l in raw:
    if l.lstrip().startswith('```'):
        fenced.append(True); inside = not inside; continue
    fenced.append(inside)

def is_doc(i):            # 문서 본문 줄인가 (펜스 밖인가)
    return not fenced[i]

# 판정 자리는 각 '### OD-N' 헤딩부터 다음 헤딩(펜스 밖에서 '#' 로 시작) 직전까지다.
# 범위를 '## D.'~'## E.' 로 잡으면 그 사이의 다른 하위절까지 삼킨다 — 감사 D1 이 그 경로로
# 미끼 3줄을 심어 OD 셋이 전부 (대기) 인 채로 기준을 통과시켰다.
starts = [i for i, l in enumerate(raw) if is_doc(i) and re.match(r'^### OD-\d', l)]
assert len(starts) == 3, ('OD 절이 정확히 셋이어야 한다', starts)

MIN_BASIS = 10            # (a)/(b)/(c) 뒤 근거의 최소 길이. 한 글자 대시는 근거가 아니다.
closed = 0
for s in starts:
    e = next((j for j in range(s + 1, len(raw)) if is_doc(j) and raw[j].startswith('#')), len(raw))
    hits = [raw[j] for j in range(s, e) if is_doc(j) and raw[j].startswith('결정됨:')]
    assert len(hits) == 1, ('각 OD 절에 결정됨: 은 정확히 1줄', raw[s], hits)
    v = hits[0][len('결정됨:'):].strip()
    print(raw[s][:40].strip(), '->', v)
    m = re.match(r'^\((a|b|c)\)\s*(\S.*)$', v)
    if m and len(m.group(2).strip()) >= MIN_BASIS:
        closed += 1
print('CLOSED', closed)
PY
```

- 검증 대상: `spec.md` §4 · `plan.md` §D · §D-2 파급표.
- **[HARD] 이 기준에는 대응 `REQ-CI-*` 가 없다 — 의도된 것이며 여기 공시한다** (감사 O11). AC-CI-001~008·010·012 는 전부 요구를 겨누지만 이것과 AC-CI-011 은 **절차 기준**이다: 「결정이 닫혔는가」는 CI 워크플로의 성질이 아니라 이 SPEC 의 진행 조건이므로 요구 집합에 대응물이 없다. DoD 1 이 열두 건을 동등하게 다루므로, 성질이 다른 **두 건**(AC-CI-009·011)이 섞여 있다는 사실을 적어 둔다.
- **[HARD] 왜 이 형태인가 — v0.2.0 의 이 기준은 아무 결정도 닫지 않고 통과했다** (감사 D1, 기계적으로 입증됨). 이전 형태는 `sed '/^## D\./,/^## E\./p'` 로 범위를 잡았는데 그 범위가 `#### 형제 카드 제약` 하위절까지 삼켰다. 감사관이 그 하위절에 OD 와 무관한 `결정됨:` 3줄을 심자 **OD 셋이 전부 `(대기)` 인 채로 기준이 `3` 을 냈다.** 「위 세 줄이 유일한 판정 자리다」라는 `plan.md` 의 산문은 **아무 명령도 강제하지 않는 의도 선언**이었다 — 이 프로젝트가 반복 기록한 「검증하지 않는 수용 기준」 부류다.
- **새 형태가 그것을 막는 세 가지**:
  1. **범위가 아니라 헤딩에 앵커한다.** 각 `### OD-N` 부터 다음 `#` 헤딩 직전까지만 본다 — 다른 절의 `결정됨:` 문자열은 어떤 절에도 속하지 않아 세지 않는다.
  2. **절당 정확히 1줄을 단언한다.** OD 절 **안에** 미끼를 심어도 `len(hits) == 1` 이 깨진다.
  3. **값의 형태와 근거의 길이를 단언한다.** `(a)`/`(b)`/`(c)` 뒤에 **10자 이상의 근거**가 있어야 센다 — `결정됨:` 뒤를 비우거나 `(대기)` 를 지우기만 하는 우회가 막힌다(v0.2.0 은 이 구멍을 공시만 하고 닫지 않아 사람 눈에 의존했다).
  4. **코드펜스 안의 줄을 판정에서 제외한다** (감사 R2-5·R2-7). v0.3.0 의 파서는 펜스를 몰라 두 방향으로 틀렸다 — 펜스 안의 `결정됨: (b) …` 를 진짜 줄로 세어 **`CLOSED 1` 오탐**을 냈고(R2-5), 펜스 안의 `#` 셸 주석을 절 종결자로 오인해 **정당한 편집이 판정 장치를 깨뜨렸다**(R2-7). 토글 한 줄이 두 구멍을 함께 닫는다.
- **[HARD] 「10자」는 자의적 하한이며 근거의 *질*을 재지 않는다** (감사 R2-6 의 정직한 한계). v0.3.0 본문은 「실제 근거 문자」라고 적었으나 명령이 요구한 것은 **비공백 한 자**여서 `결정됨: (a) —` 로 `CLOSED 3` 이 나왔다 — 산문이 명령보다 넓은, 이 SPEC 이 반복해 온 부류였다. 길이 하한은 그 간극을 좁힐 뿐 없애지 못한다: 10자짜리 무의미한 문자열은 여전히 통과한다. **근거가 실제로 근거인지는 리드가 읽어 판단하며, 이 기준은 그 판단을 대신하지 않는다** — 그 사실을 숨기지 않고 여기 적는다.
- **반증 가능성**: 전부 미결이면 `CLOSED 0`, 둘만 닫으면 `CLOSED 2`. OD 절이 늘거나 줄면 첫 `assert` 가 깨진다.
- **[HARD] 이 기준만 닫아서는 부족하다 — 그리고 v0.6.0 이 그 부족분을 실제로 채웠다.** 결정을 닫는 커밋은 `plan.md` §D-2 **결정 파급표에서 그 행이 지목하는 모든 자리**(요구·수용 기준·§5 배제·DoD·그 밖의 자리)를 함께 고쳐야 한다. 실제로 OD-3 (b) 는 REQ-CI-004·005 를 거짓으로 만들어 **REQ-CI-004′·005′ 로 교체**하게 했고, OD-1 (b) 는 DoD 1 의 기준 개수를 **열한 건에서 열두 건으로** 바꿨다. 그 이행 여부는 이 기준이 아니라 **AC-CI-011** 이 잰다.
- **현재 상태 (v0.6.0)**: 세 결정 전부 닫혔다 — **OD-1 = (b) · OD-2 = (b) · OD-3 = (b)**. 이 명령은 `CLOSED 3` 을 낸다.
- **[HARD]** 미결인 채 run 으로 넘어가면 구현이 결정을 대신 내리게 된다. 그 위험은 이 개정으로 **해소됐으나**, 기준 자체는 run 진입 직전에 다시 실행해 확인한다 — 「한 번 닫혔다」는 기억이지 관측이 아니다.

---

### AC-CI-011 — 선언·마커·자리 목록 세 출처가 정합하고, §D-2 파급표가 살아 있다

- **Given** `plan.md` §D-2 파급표가 「그 밖의 자리」 열을 담고, §D-2.1 이 결정별 종속 자리 수를 선언하며 그 자리를 열거하고, 각 종속 자리에 `[OD-DEP:N]` 마커가 심겨 있고,
- **When** 아래 명령을 실행하면,
- **Then** 출력의 마지막 줄이 `FALLOUT TABLE COMPLETE` 다.

```bash
python3 - <<'PY'
import re, pathlib, sys

BASE = pathlib.Path('.moai/specs/SPEC-CI-001')
FILES = ('spec.md', 'plan.md', 'acceptance.md', 'progress.md')   # R3-7: progress.md 포함

def doc_lines(text):
    """코드펜스 안의 줄을 제외한 (인덱스, 줄) 목록 — R3-6: AC-CI-009 와 같은 규율."""
    out, inside = [], False
    for i, l in enumerate(text.splitlines()):
        if l.lstrip().startswith('```'):
            inside = not inside
            continue
        if not inside:
            out.append((i, l))
    return out

plan = (BASE / 'plan.md').read_text()

# ① 선언
m = re.search(r'<!--\s*OD-DEP-EXPECT:\s*(.*?)-->', plan)
assert m, 'OD-DEP-EXPECT 선언이 없다'
declared = {int(k): int(v) for k, v in re.findall(r'OD-(\d)=(\d+)', m.group(1))}

# ② 마커 (펜스 밖만)
actual = {}
for fn in FILES:
    for _, l in doc_lines((BASE / fn).read_text()):
        for n in re.findall(r'\[OD-DEP:(\d)\]', l):
            actual[int(n)] = actual.get(int(n), 0) + 1

# ③ §D-2.1 「자리 목록」 표 — 셀을 ' · '(공백 포함) 로 갈라 자리 수를 센다.
#    공백 없는 '·' 는 이름 안에 쓰인다(REQ-CI-004·005) — 구분자와 충돌하지 않게 띄어쓰기로 가른다.
listed = {}
for _, l in doc_lines(plan):
    mm = re.match(r'^\|\s*OD-(\d)\s*\|\s*\*\*(\d+)\*\*\s*\|(.+?)\|\s*$', l)
    if mm:
        od, sites = int(mm.group(1)), mm.group(3)
        listed[od] = len([s for s in sites.split(' · ') if s.strip()])

# §D-2 파급표가 살아 있는가 (epsilon: 표 삭제 / zeta: 셀 비움)
d2 = re.search(r'^## D-2\..*?^### D-2\.1', plan, re.M | re.S)
assert d2, '§D-2 파급표 절이 없다'
rows = [l for l in d2.group(0).splitlines() if l.startswith('|')]
assert any('그 밖의 자리' in r for r in rows), '§D-2 에 「그 밖의 자리」 열이 없다'
bc = [r for r in rows if re.search(r'\|\s*\(([bc])\)', r)]
assert len(bc) == 5, ('(b)/(c) 행이 다섯이어야 한다', len(bc))
for r in bc:
    last = r.rstrip('|').rsplit('|', 1)[-1].strip()
    assert last and '§' in last, ('(b)/(c) 행의 「그 밖의 자리」 셀이 비었다', r[:60])

print('declared:', dict(sorted(declared.items())))
print('markers :', dict(sorted(actual.items())))
print('listed  :', dict(sorted(listed.items())))
print('§D-2 (b)/(c) rows with non-empty 그 밖의 자리:', len(bc))

assert set(declared) == {1, 2, 3}, ('OD 는 셋이어야 한다', sorted(declared))
assert declared == actual, ('선언 != 마커', declared, actual)
assert declared == listed, ('선언 != 자리 목록', declared, listed)
print('FALLOUT TABLE COMPLETE')
PY
```

- 검증 대상: `plan.md` §D-2 파급표(존재·「그 밖의 자리」 열·(b)/(c) 행의 셀) · §D-2.1 선언과 자리 목록 · 네 문서의 마커.
- **[HARD] 왜 이 기준이 있는가** (감사 R2-4). v0.3.0 의 파급표는 세 자리를 빠뜨렸고 **그중 둘은 이미 거짓이었는데 아무 명령도 잡지 못했다.** 표 자신이 「한 층만 고치면 나머지가 조용히 거짓이 되고, 그 거짓은 아무 명령도 잡지 못한다」고 경고하는 바로 그 상태에 표 자신이 빠져 있었다.
- **[HARD] v0.4.0 의 이 기준은 자기 이름보다 좁았다 — 명령을 넓혀 이름에 맞췄다** (감사 R3-1). v0.4.0 은 제목이 「**결정 파급표의 완전성**」이고 검증 대상이 「§D-2 파급표」였는데, **명령은 §D-2 표를 한 줄도 읽지 않았다.** 그래서 표를 통째로 지워도(`epsilon`), 「그 밖의 자리」 셀을 전부 비워도(`zeta`), 비종속 자리에 마커를 심고 선언을 함께 올려도(`alpha`) 초록이었다. **D1 → R2-4 → R3-1 로 같은 부류의 세 번째 등장**이며, `acceptance.md` 첫머리가 이 문서의 첫 줄에서 경계한다고 선언한 바로 그 형태다.
  - **이름을 좁히는 대신 명령을 넓혔다.** 제목을 「선언과 마커의 정합」으로 낮추는 선택지도 있었으나, 그러면 **R2-4 의 실질이 다시 열린다** — 표의 완전성이 아무 명령의 대상도 아닌 상태로 돌아간다. 이 기준은 R2-4 를 닫으려고 존재하므로, 이름을 지키고 명령이 따라가게 했다.
  - **출처가 둘에서 셋으로 늘었다**: ① 선언(`OD-DEP-EXPECT`) ② 마커(종속 자리 자신) ③ **자리 목록(§D-2.1 표 셀)**. 셋이 서로 다른 자리에 있으므로, 하나만 고치면 어긋남이 드러난다. 여기에 **§D-2 표 자신의 생존 검사**(절 존재 · 「그 밖의 자리」 열 · (b)/(c) 다섯 행의 셀이 비지 않음)가 더해진다.
- **수정 후 세 공격을 다시 걸어 실측했다** (원문: `.moai/state/verify/t27-plan/probe011.py`):

```
epsilon (표 삭제)           exit=1  CAUGHT   AssertionError: §D-2 파급표 절이 없다
zeta (셀 비움)              exit=1  CAUGHT   AssertionError: ('(b)/(c) 행의 「그 밖의 자리」 셀이 비었다', …)
alpha (미끼+선언상향)          exit=1  CAUGHT   AssertionError: ('선언 != 자리 목록', {1: 6, …}, {1: 5, …})
```

  `alpha` 가 이제 잡히는 이유: 마커와 선언을 함께 올려도 **자리 목록이 그대로**라 셋째 출처와 어긋난다. 세 곳을 모두 조작해야 통과하며, 그때는 사람이 읽어도 보이는 편집이 된다.
- **반증 가능성**: 마커 하나를 지우면 `AssertionError`(감사관이 `delta` 로 확인). 선언만 올려도, 자리 목록만 고쳐도, 표를 지워도, 셀을 비워도 붉어진다.
- **[HARD] 한계 공시 — 세 가지를 모두 적는다** (v0.4.0 은 첫째 하나만 적었다):
  1. **마커도 선언도 자리 목록에도 없는 종속**은 잡지 못한다. 이 장치는 「기록 사이의 불일치」를 잡을 뿐 **미지의 종속을 발견하지 않는다.**
  2. **의미의 정확성은 재지 않는다.** 마커가 *올바른* 자리에 있는지, 자리 목록의 서술이 실제 그 자리를 가리키는지는 텍스트로 판정할 수 없다. 세 출처를 **모두 일관되게 조작한** 편집은 통과한다 — 다만 그 편집은 더 이상 우연한 사고가 아니다.
  3. **표 셀의 *내용*이 옳은지는 재지 않는다.** 검사는 셀이 비지 않고 `§` 참조를 담는지까지만 본다. 잘못된 자리를 가리키는 셀은 통과한다.
- **[HARD] 마커 카운터는 코드펜스를 건너뛰고 `progress.md` 도 스캔한다** (감사 R3-6·R3-7). v0.4.0 은 AC-CI-009 만 펜스 토글을 얻고 이 기준은 못 얻었으며(한 자리를 고치고 형제를 빠뜨린 형태), 스캔 대상도 세 파일뿐이라 `progress.md` 의 종속 자리가 생기면 불가시였다. 둘 다 이 개정에서 맞췄다.

---

## E. 완료의 정의 (Definition of Done)

아래를 **전부** 만족할 때만 이 SPEC 은 run 단계를 종료한다.

<!-- [OD-DEP:1] OD-1 (b) 가 이 개수를 열두 건으로 바꿨다 -->
1. AC-CI-001 ~ AC-CI-012 **열두 건**이 전부 통과하고, 각 기준의 명령 출력이 `progress.md` §E.2 에 **원문으로** 기록됐다.
   - **[HARD] 이 개수는 OD-1 에 종속됐고, 그 결정은 닫혔다** (감사 D6 후단 → v0.6.0 이행). v0.5.0 까지 이 줄은 「AC-CI-001 ~ AC-CI-011 **열한 건**」이었다. **OD-1 이 (b)(typecheck 편입)로 결정되면서 AC-CI-012 가 신설돼 열두 건이 됐다.** v0.2.0 은 이 연동을 어느 문서에도 적지 않았고, `plan.md` §D-2 파급표 OD-1 행이 그 의무를 져 이번에 실제로 이행됐다. 반면 **AC-CI-009 의 기대값 `CLOSED 3` 은 어떤 결정에서도 변하지 않았다** — 결정의 *수*는 늘지 않기 때문이다. **두 수가 서로 다른 것에 매여 있다**: 기준 개수는 결정의 *결과*에, `CLOSED 3` 은 결정의 *수*에 매여 있다.
2. AC-CI-006 · AC-CI-007 의 파괴 커밋이 **되돌려졌고**, 되돌림 이후 head 에서 결론 `success` 가 다시 관측됐다. **증거 기록 커밋이 되돌림 뒤에 있다**(파괴 커밋에 실리지 않았다) — `git log --oneline` 으로 순서를 확인한다.
3. AC-CI-010 의 draft PR 이 **닫혔고 병합되지 않았다** (`gh pr view <PR> --json state,merged`).
<!-- [OD-DEP:2] .nvmrc 가 더해진다 / [OD-DEP:3] channel/package.json 이 더해진다 -->
4. 변경된 파일이 **확정된 집합과 정확히 일치**한다 — `git diff --stat main...HEAD` 에 아래 넷만 보인다:
   - `.github/workflows/ci.yml` (한 파일)
   - **`.nvmrc`** — OD-2 = (b) 가 더했다
   - **`channel/package.json`** — OD-3 = (b) 가 더했다. `scripts.pretest` 한 키 추가이며 `scripts.test` 의 값은 기준선과 **글자 그대로 같아야** 한다(형제 카드 `SPEC-E2E-001` AC-E2E-011 — `plan.md` §D-1)
   - `.moai/` 아래의 문서·증거
   
   그 밖의 파일이 보이면 **범위 이탈**이다. v0.5.0 까지 이 항목은 「결정에 의해서만 늘어날 수 있다」는 **조건부**였다 — 세 결정이 닫힌 지금 집합은 **확정**이며, 「늘어날 수 있다」로 남겨 두면 아무 파일이나 「결정 때문」이라 주장할 여지가 남는다.
5. `spec.md` §2.6 의 흔들림에 대해 **어떤 재시도 장치도 추가되지 않았음**이 AC-CI-003 으로 확인됐다.
6. **AC-CI-009 가 `CLOSED 3` 을 내고 AC-CI-011 이 `FALLOUT TABLE COMPLETE` 를 낸다** — 세 리드 결정이 전부 닫혔고, `plan.md` §D-2 파급표에서 각 결정 행의 **다섯 층**(요구 계층 · 수용 기준 · §5 배제 · DoD · 그 밖의 자리)이 함께 반영됐다.
   - **낡은 수 정정 (v0.6.0)**: v0.5.0 까지 이 줄은 「각 결정 행의 **네 열**」이라 적고 있었다. 표는 **v0.4.0 에서 「그 밖의 자리」 열이 더해지며 이미 다섯 층**이 됐고(감사 R2-4), 이 줄만 옛 수를 지고 있었다. 같은 개정이 자기 낡은 기록을 남기는 이 프로젝트의 반복 부류이며, `plan.md` §G-3 어간 F(층 수량사)가 겨누는 자리다.

### 통과 판정에서 명시적으로 **제외**되는 것

- 커버리지 수치·임계 — `spec.md` §5 에서 배제됐다. 어떤 커버리지 값도 이 카드의 통과 근거가 아니다.
- `spec.md` §2.6 흔들림의 실패율 — **미측정**이며, 이 카드는 그것을 측정하지 않는다.
- 브랜치 보호(required status checks) 적용 여부 — 배제됐다.
