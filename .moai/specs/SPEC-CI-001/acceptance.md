# SPEC-CI-001 — 수용 기준

> **원칙 [HARD]**: 어떤 명령으로도 반증할 수 없는 기준은 이 파일에 실리지 못한다. 각 기준은 ① 증거를 만드는 **명령**과 ② 그 출력이 무엇이면 통과인지를 함께 적는다.
>
> 이 카드가 특히 경계하는 두 형태:
> - **「검증하지 않는 수용 기준」** — 기준이 이름 붙인 동작을 통째로 지워도 초록으로 남는 기준.
> - **「초록이면 통과」** — CI 기준을 «워크플로가 성공했다» 로 적으면 **아무것도 실행하지 않는 워크플로**가 그 기준을 만족시킨다. 그래서 §D 의 변별 기준(AC-CI-004·005)이 이 집합의 무게 중심이다.

용어: 아래에서 `<WF>` 는 run 단계가 만드는 워크플로 파일 경로(`.github/workflows/` 아래 한 파일, 기본 후보 `ci.yml`), `<SHA>` 는 그 시점 브랜치 head 의 전체 SHA, `<REPO>` 는 `bjw202/minidiscord` 를 가리킨다.

---

## A. 워크플로 파일 자체

### AC-CI-001 — 파일이 존재하고, 파싱되고, 두 트리거를 선언한다

- **Given** run 단계가 워크플로 파일을 저작했고,
- **When** 아래 명령을 저장소 루트에서 실행하면,
- **Then** 종료 코드 0 이며 출력의 마지막 줄이 정확히 `TRIGGERS OK` 다.

```bash
python3 - <<'PY'
import sys, yaml
d = yaml.safe_load(open('.github/workflows/ci.yml'))
# 주의(실측): PyYAML 은 YAML 1.1 규칙으로 `on:` 키를 불리언 True 로 읽는다.
# 이 나무에서 label-sync.yml 로 확인했다 → keys: ['name', True, 'permissions', 'jobs']
trig = d.get('on', d.get(True))
keys = sorted(trig.keys())
print('triggers:', keys)
assert 'push' in keys and 'pull_request' in keys, keys
print('TRIGGERS OK')
PY
```

- 검증 대상 요구사항: REQ-CI-001 · REQ-CI-002 · REQ-CI-003.
- **반증 가능성**: 파일을 지우면 `FileNotFoundError`, 트리거 하나를 빼면 `AssertionError`. 둘 다 종료 코드 0 이 아니다.

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
assert str(w.get('node-version')).startswith('24'), w
assert w.get('cache') == 'npm', w
print('runs-on/timeout/permissions/concurrency/node/cache 모두 고정됨')
print('HYGIENE OK')
PY
```

- 검증 대상 요구사항: REQ-CI-008 · REQ-CI-009 · REQ-CI-010.
- **주의**: Node 메이저 버전 `24` 는 §D OD-2 의 리드 결정 결과에 따라 값이 바뀔 수 있다. 결정이 다른 값으로 내려지면 이 기준의 `startswith('24')` 를 그 값으로 함께 고친다 — **기준을 고치지 않으면 이 자리가 곧 낡은 기록이 된다.**

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

---

## C. 게이트가 붉어질 수 있음의 관측 — 이 집합의 하중 지지점

두 기준은 **고의 파괴 → 관측 → 되돌림**의 절차를 밟는다. 절차의 공통 규칙:

- 파괴는 **임시 커밋 하나**로 하고, 그 커밋은 **병합되지 않는다**.
- 관측이 끝나면 즉시 `git revert` 또는 임시 브랜치 삭제로 되돌린다.
- 되돌림 후 `git log --oneline` 과 AC-CI-005 재실행으로 원상 복구를 확인한다.
- 임시 커밋은 `scratch:` 접두를 붙여 `main` 병합 대상이 아님을 표시한다.

### AC-CI-006 — 테스트가 깨지면 결론이 `failure` 다 (변별 기준)

- **Given** AC-CI-005 가 통과한 head 가 원격에 있고,
- **When** 아래 절차를 실행하면,
- **Then** 파괴 SHA 의 결론이 `failure` 이고, 되돌림 뒤 head SHA 의 결론이 다시 `success` 다.

```bash
# 1) 파괴: 서버 스위트의 아무 단언 하나가 반드시 실패하도록 임시 테스트를 더한다.
#    변이 대상: 새 파일 server/test/zz-scratch-fail.test.ts 하나만 추가한다(기존 파일 무수정).
#    내용: it('scratch: CI 변별용 의도적 실패', () => { expect(1).toBe(2) })
git add server/test/zz-scratch-fail.test.ts
git commit -m "scratch: CI 변별 — 의도적 실패 (병합 금지)"
git push origin WT-ci-test-wiring
BAD=$(git rev-parse HEAD)

# 2) 관측: 결론이 failure 여야 한다.
gh run list --repo bjw202/minidiscord --commit "$BAD" --workflow ci.yml \
  --json conclusion,status --jq '.[0] | select(.status=="completed") | .conclusion'   # → failure

# 3) 되돌림: 임시 커밋을 되돌리고 다시 push 한다.
git revert --no-edit "$BAD"
git push origin WT-ci-test-wiring
GOOD=$(git rev-parse HEAD)

# 4) 원상 확인: 결론이 다시 success 여야 한다.
gh run list --repo bjw202/minidiscord --commit "$GOOD" --workflow ci.yml \
  --json conclusion,status --jq '.[0] | select(.status=="completed") | .conclusion'   # → success
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
# 1) 파괴: 워크플로에서 `npm run build -w channel` 단계만 주석 처리한다.
git commit -am "scratch: CI 변별 — channel 빌드 단계 제거 (병합 금지)"
git push origin WT-ci-test-wiring
BAD=$(git rev-parse HEAD)

# 2) 관측: 결론 + 실패 개수.
gh run list --repo bjw202/minidiscord --commit "$BAD" --workflow ci.yml \
  --json conclusion,status,databaseId --jq '.[0] | select(.status=="completed") | "\(.conclusion) \(.databaseId)"'
gh run view <databaseId> --repo bjw202/minidiscord --log | grep -E "Tests +6 failed|gateway-mutual-auth|index-wiring|transport-auth"

# 3) 되돌림 + 원상 확인: AC-CI-006 의 3)·4) 와 동일.
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
- **Then** 출력이 정확히 `3` 다 (OD-1 · OD-2 · OD-3).

```bash
sed -n '/^## D\./,/^## E\./p' .moai/specs/SPEC-CI-001/plan.md \
  | grep '^결정됨:' | grep -v '(대기)' | wc -l | tr -d ' '
```

- 검증 대상: `spec.md` §4 · `plan.md` §D.
- **왜 이 형태인가**: 「미결 표시가 없다」를 문서 전체 grep 으로 재면 §F·§G 의 정당한 **참조**까지 걸려 **영원히 통과할 수 없는 기준**이 된다. 그래서 판정 자리를 §D 안의 `결정됨:` 두 줄로 좁히고, 그 사실을 `plan.md` §D 끝에 함께 적었다.
- **반증 가능성**: 두 결정만 닫으면 `2`, 하나면 `1`, 전부 미결이면 `0` 이 나온다. `(대기)` 를 지우기만 하고 값을 적지 않으면 그 줄은 `결정됨:` 뒤가 비므로 사람이 읽을 때 드러난다.
- **[HARD] OD-3 의 파급**: OD-3 이 (b) 또는 (c) 로 결정되면 **이 기준만 닫아서는 부족하다.** `plan.md` §D OD-3 이 적은 대로 AC-CI-002(단계 순서 단언)와 AC-CI-007(변이 대상)을 같은 커밋에서 함께 고쳐야 한다 — (b) 에서 워크플로가 빌드 단계를 빼면 AC-CI-007 이 겨누던 변이 대상 자체가 사라지기 때문이다.
- **의미**: OD-1·OD-2 는 이 SPEC 이 스스로 정하지 않는다. 리드가 결정하면 `plan.md` §D 의 각 항목에 `결정됨: <값> — <근거>` 를 적고, 그 결정이 워크플로 내용을 바꾸면 AC-CI-002·AC-CI-004 를 함께 고친다.
- **[HARD]** 미결인 채 run 으로 넘어가면, 구현이 결정을 대신 내리게 된다.

---

## E. 완료의 정의 (Definition of Done)

아래를 **전부** 만족할 때만 이 SPEC 은 run 단계를 종료한다.

1. AC-CI-001 ~ AC-CI-009 아홉 건이 전부 통과하고, 각 기준의 명령 출력이 `progress.md` §E.2 에 **원문으로** 기록됐다.
2. AC-CI-006 · AC-CI-007 의 파괴 커밋이 **되돌려졌고**, 되돌림 이후 head 에서 결론 `success` 가 다시 관측됐다.
3. 변경된 파일이 결정된 범위와 정확히 일치한다 — `git diff --stat main...HEAD` 가 `.github/workflows/` 아래 한 파일 + `.moai/` 문서·증거만 보인다. 여기에 더해질 수 있는 파일은 **결정에 의해서만** 늘어난다: OD-2 가 (b) 면 `.nvmrc`, **OD-3 이 (b)/(c) 면 `channel/package.json`**. 결정되지 않은 파일이 보이면 범위 이탈이다.
4. `spec.md` §2.6 의 흔들림에 대해 **어떤 재시도 장치도 추가되지 않았음**이 AC-CI-003 으로 확인됐다.

### 통과 판정에서 명시적으로 **제외**되는 것

- 커버리지 수치·임계 — `spec.md` §5 에서 배제됐다. 어떤 커버리지 값도 이 카드의 통과 근거가 아니다.
- `spec.md` §2.6 흔들림의 실패율 — **미측정**이며, 이 카드는 그것을 측정하지 않는다.
- 브랜치 보호(required status checks) 적용 여부 — 배제됐다.
