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
