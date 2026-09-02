"""감사 3회차 R3-1 의 세 공격(epsilon·zeta·alpha)을 확장된 AC-CI-011 에 다시 건다.
원본은 건드리지 않는다 — 사본을 만들어 그 사본을 대상으로 검사기를 돌린다."""
import re, pathlib, shutil, subprocess, sys, tempfile

SRC = pathlib.Path('.moai/specs/SPEC-CI-001')
CHK = pathlib.Path('.moai/state/verify/t27-plan/ac011.py').resolve()

def run(tmp):
    r = subprocess.run([sys.executable, str(CHK)], cwd=tmp, capture_output=True, text=True)
    tail = (r.stdout + r.stderr).strip().splitlines()
    return r.returncode, tail[-1] if tail else '(no output)'

def build(mut):
    tmp = pathlib.Path(tempfile.mkdtemp())
    dst = tmp / '.moai' / 'specs' / 'SPEC-CI-001'
    dst.parent.mkdir(parents=True)
    shutil.copytree(SRC, dst)
    mut(dst)
    return tmp

def epsilon(d):                      # §D-2 파급표 본문을 통째로 삭제
    p = d / 'plan.md'; t = p.read_text()
    p.write_text(re.sub(r'^## D-2\..*?(?=^### D-2\.1)', '', t, flags=re.M | re.S))

def zeta(d):                         # 「그 밖의 자리」 셀을 전부 비움
    p = d / 'plan.md'; t = p.read_text().splitlines(keepends=True)
    out = []
    for l in t:
        if re.match(r'^\|\s*(\*\*OD-\d\*\*)?\s*\|\s*\([abc]\)', l):
            l = re.sub(r'\|[^|]*\|\s*$', '|  |\n', l)
        out.append(l)
    p.write_text(''.join(out))

def alpha(d):                        # 비종속 자리에 마커 + 선언 상향 (표·자리목록 무변경)
    p = d / 'spec.md'; p.write_text('<!-- [OD-DEP:1] 비종속 자리의 미끼 -->\n' + p.read_text())
    q = d / 'plan.md'
    q.write_text(q.read_text().replace('OD-1=5', 'OD-1=6'))

for name, mut in (('epsilon (표 삭제)', epsilon), ('zeta (셀 비움)', zeta), ('alpha (미끼+선언상향)', alpha)):
    tmp = build(mut)
    code, last = run(tmp)
    verdict = 'CAUGHT' if code != 0 else 'PASSED  <-- 못 잡음'
    print(f'{name:24s} exit={code}  {verdict}')
    print(f'    {last}')
    shutil.rmtree(tmp)
