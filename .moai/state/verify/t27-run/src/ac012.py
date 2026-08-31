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
