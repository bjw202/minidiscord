"""AC-CI-011 — 결정 파급표의 완전성 검사 (v0.5.0, 감사 R3-1 로 확장).

세 출처를 서로 대조한다:
  ① plan.md §D-2.1 의 선언   `OD-DEP-EXPECT`
  ② 세 문서 + progress.md 에 심긴 마커 `[OD-DEP:N]`   (펜스 밖만)
  ③ plan.md §D-2.1 의 「자리 목록」 표 셀에 열거된 자리 수
그리고 §D-2 파급표 자신이 살아 있고 「그 밖의 자리」 열이 채워져 있는지 본다.

v0.4.0 은 ①②만 봤고 §D-2 표를 한 줄도 읽지 않아, 표를 통째로 지워도(epsilon)
「그 밖의 자리」 셀을 전부 비워도(zeta) 초록이었다 — 이름이 명령보다 넓었다.
"""
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
