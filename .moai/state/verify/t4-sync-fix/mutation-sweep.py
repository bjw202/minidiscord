import json, subprocess, os, sys, shutil
root = os.getcwd()
OUT = os.path.join(root, '.moai/state/verify/t4-sync-fix')
os.makedirs(OUT, exist_ok=True)

MUT = [
 ("M-F05 revert try/catch", 'channel/src/gateway-client.ts',
  """      let msg: any
      try { msg = JSON.parse(String(d)) } catch { return }""",
  """      const msg = JSON.parse(String(d))"""),
 ("M-F06 revert rejection swallow", 'channel/src/index.ts',
  """      await channel.pushChatMessage(m).catch(() => {})""",
  """      await channel.pushChatMessage(m)"""),
 ("M-CAP delete experimental['claude/channel']", 'channel/src/channel-server.ts',
  """          'claude/channel': {},              // 채널 리스너 등록 (필수)\n""",
  """"""),
 ("M-INSTR delete INSTRUCTIONS block", 'channel/src/channel-server.ts',
  """      instructions: INSTRUCTIONS,\n""",
  """"""),
 ("M-PERM delete experimental['claude/channel/permission']", 'channel/src/channel-server.ts',
  """          'claude/channel/permission': {},   // 권한 릴레이 옵트인\n""",
  """"""),
]

def run_tests(tag):
    jf = os.path.join(OUT, f'mut-{tag}.json')
    r = subprocess.run(['npx','vitest','run','--reporter=json',f'--outputFile={jf}'],
                       cwd=os.path.join(root,'channel'), capture_output=True, text=True)
    failed=[]
    try:
        data=json.load(open(jf))
        for res in data.get('testResults',[]):
            for a in res.get('assertionResults',[]):
                if a.get('status')=='failed':
                    failed.append(a.get('fullName') or a.get('title'))
    except Exception as e:
        failed.append(f'<json parse failed: {e}>')
    return r.returncode, failed, r.stdout[-1500:]+r.stderr[-1500:]

report=[]
for i,(name,path,orig,mut) in enumerate(MUT,1):
    s=open(path,encoding='utf-8').read()
    assert s.count(orig)==1, (name, s.count(orig))
    open(path,'w',encoding='utf-8').write(s.replace(orig,mut))
    code, failed, raw = run_tests(f'{i}')
    open(path,'w',encoding='utf-8').write(s)
    clean = subprocess.run(['git','diff','--stat','--','channel/src'],capture_output=True,text=True).stdout.strip()
    report.append({'mutation':name,'exit':code,'failed':failed,'reverted_src_diff_after':clean})
    print(f'--- {name}: exit={code} failed={len(failed)}')
    for f in failed: print(f'      {f}')
    print(f'      revert check (git diff --stat channel/src): {clean!r}')

json.dump(report, open(os.path.join(OUT,'mutation-report.json'),'w'), ensure_ascii=False, indent=2)
