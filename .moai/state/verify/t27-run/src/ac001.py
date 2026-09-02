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
