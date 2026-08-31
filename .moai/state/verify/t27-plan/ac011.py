import re, pathlib
base = pathlib.Path('.moai/specs/SPEC-CI-001')

decl_src = (base / 'plan.md').read_text()
m = re.search(r'<!--\s*OD-DEP-EXPECT:\s*(.*?)-->', decl_src)
assert m, 'OD-DEP-EXPECT 선언이 없다'
declared = {int(k): int(v) for k, v in re.findall(r'OD-(\d)=(\d+)', m.group(1))}

actual = {}
for fn in ('spec.md', 'plan.md', 'acceptance.md'):
    for n in re.findall(r'\[OD-DEP:(\d)\]', (base / fn).read_text()):
        actual[int(n)] = actual.get(int(n), 0) + 1

print('declared:', dict(sorted(declared.items())))
print('actual  :', dict(sorted(actual.items())))
assert declared == actual, ('선언과 마커가 어긋난다', declared, actual)
assert set(declared) == {1, 2, 3}, ('OD 는 셋이어야 한다', sorted(declared))
print('FALLOUT TABLE COMPLETE')
