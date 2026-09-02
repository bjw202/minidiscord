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
