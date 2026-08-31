"""R2-3 재훑기 — 어간 기준. 관용구가 아니라 어간으로 잡아 수식어 변형을 놓치지 않는다."""
import re, pathlib

BASE = pathlib.Path('.moai/specs/SPEC-CI-001')
FILES = ['spec.md', 'plan.md', 'acceptance.md', 'progress.md']

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
}

for label, pat in STEMS.items():
    print(f'--- {label}  /{pat}/')
    hits = 0
    for fn in FILES:
        for i, line in enumerate((BASE / fn).read_text().splitlines(), 1):
            for m in re.finditer(pat, line):
                hits += 1
                ctx = line.strip()
                ctx = ctx[:110] + ('…' if len(ctx) > 110 else '')
                print(f'    {fn}:{i}  «{m.group(0)}»  {ctx}')
    if hits == 0:
        print('    (적중 0)')
