"""R2-3 재훑기 — 어간 기준. 관용구가 아니라 어간으로 잡아 수식어 변형을 놓치지 않는다.

[HARD] 자기제외 (감사 R3-3): `plan.md` §G-3 의 적중표는 **훑기 대상 파일 안에** 있고
각 행이 자기 어간을 문자로 담는다. 제외하지 않으면 표가 자기를 세어 수가 재현되지
않는다 — 이 프로젝트가 「훑기 표는 자기를 센다」로 이미 기록한 형태다.
아래 SKIP_SECTIONS 가 그 절을 스캔에서 뺀다.

사용:  python3 sweep.py            # 어간 적중 (자기제외 적용)
       python3 sweep.py --refs     # 절 번호 참조의 실재 검사 (어간 J)
"""
import re, sys, pathlib

BASE = pathlib.Path('.moai/specs/SPEC-CI-001')
FILES = ['spec.md', 'plan.md', 'acceptance.md', 'progress.md']

# 자기제외: (파일, 시작 헤딩, 끝 헤딩) — 이 구간은 스캔하지 않는다.
SKIP_SECTIONS = [('plan.md', r'^## G-3\.', r'^## H\.')]

STEMS = {
    'A. DoD 번호 참조':      r'DoD\s*\d',
    'B. 요구 개수':          r'요구(?:사항)?\s*\d+\s*건|REQ\s*\d+\s*건|REQ\s+\d+\s*·',
    'C. 기준 개수':          r'수용\s*기준\s*\d+\s*건|AC\s*\d+\s*건|기준\s*\d+\s*건',
    'D. 한글 수량사(기준)':  r'(?:여덟|아홉|열|열한|열두)\s*(?:개|건|기준)',
    'E. 결정 수량사':        r'(?:두|세|네)\s*결정|아래\s*(?:둘|셋)',
    'F. 층 수량사':          r'(?:세|네|다섯)\s*층',
    'G. AC 범위 표기':       r'AC-CI-0\d\d\s*~\s*AC-CI-0\d\d',
    'H. 변별기준 오지목':    r'AC-CI-004[·,]\s*005|AC-CI-004\s*가\s*담당',
    'I. OD 개수':            r'(?:세|네)\s*번째\s*미결|OD\s*\d\s*·\s*OD',
    # J 는 --refs 로 별도 검사한다(단순 적중 수보다 「실재하는가」가 관심사다).
}


def scannable(fn):
    """자기제외 구간을 뺀 (줄번호, 줄) 목록."""
    lines = (BASE / fn).read_text().splitlines()
    skip = [False] * len(lines)
    for f, start, end in SKIP_SECTIONS:
        if f != fn:
            continue
        on = False
        for i, l in enumerate(lines):
            if re.match(start, l):
                on = True
            elif on and re.match(end, l):
                on = False
            skip[i] = skip[i] or on
    return [(i + 1, l) for i, l in enumerate(lines) if not skip[i]]


def stems():
    total = {}
    for label, pat in STEMS.items():
        print(f'--- {label}  /{pat}/')
        hits = 0
        for fn in FILES:
            for ln, line in scannable(fn):
                for m in re.finditer(pat, line):
                    hits += 1
                    ctx = line.strip()
                    ctx = ctx[:100] + ('…' if len(ctx) > 100 else '')
                    print(f'    {fn}:{ln}  «{m.group(0)}»  {ctx}')
        total[label] = hits
        if hits == 0:
            print('    (적중 0)')
    print('\n=== 어간별 적중 수 (자기제외 적용) ===')
    for k, v in total.items():
        print(f'    {k:24s} {v}')


def refs():
    """어간 J — 절 번호 참조가 실재하는 절을 가리키는지 검사한다 (감사 R3-4)."""
    headings = {}
    for fn in FILES:
        hs = set()
        for _, l in [(0, x) for x in (BASE / fn).read_text().splitlines()]:
            m = re.match(r'^#{2,4}\s+(§?)([0-9A-Z][-.0-9A-Z]*)\.?\s', l)
            if m:
                hs.add(m.group(2).rstrip('.'))
        headings[fn] = hs
    known = set().union(*headings.values())
    print('실재 절:', ' '.join(sorted(known)))
    bad = 0
    for fn in FILES:
        for ln, line in scannable(fn):
            # 외부 문서의 절을 가리키는 참조는 이 문서 집합의 절이 아니다.
            # (예: `.../t6/run-done.md` §5-4) — 같은 줄에 외부 경로가 있으면 건너뛴다.
            if re.search(r'\.(md|ts|yml|yaml|json)`?\s*§', line) or 'worktrees/' in line or 'reports/' in line:
                continue
            # 백틱 코드 스팬 안의 `§X` 는 **인용된 토큰**이지 살아 있는 상호 참조가 아니다
            # (예: 폐기된 참조를 기록으로 남길 때). 코드 스팬을 지운 뒤 검사한다.
            probe = re.sub(r'`[^`]*`', '', line)
            for m in re.finditer(r'§\s*([0-9A-Z][-.0-9A-Z]*)', probe):
                ref = m.group(1).rstrip('.')
                root = re.match(r'^[0-9A-Z][-0-9A-Z]*', ref).group(0)
                if root not in known and ref not in known:
                    bad += 1
                    print(f'    DANGLING  {fn}:{ln}  §{ref}  |  {line.strip()[:90]}')
    print(f'\n존재하지 않는 절 참조: {bad}')
    return bad


if __name__ == '__main__':
    if '--refs' in sys.argv:
        sys.exit(1 if refs() else 0)
    stems()
