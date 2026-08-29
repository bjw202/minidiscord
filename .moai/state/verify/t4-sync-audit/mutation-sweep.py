import subprocess, shutil, os, sys, json, re
SP=os.getcwd()
MUTS=[
 ("M1 CHANNEL: instructions 제거","channel-server.ts","      instructions: INSTRUCTIONS,\n",""),
 ("M2 CHANNEL: delivery 항상 to","channel-server.ts","          delivery: msg.delivery,","          delivery: 'to',"),
 ("M3 CHANNEL: fetch_history 반환 하드코딩","channel-server.ts","      const text = await deps.fetchHistory(args)","      await deps.fetchHistory(args); const text = '(기록 없음)'"),
 ("M4 CHANNEL: claude/channel capability 제거","channel-server.ts","          'claude/channel': {},              // 채널 리스너 등록 (필수)\n",""),
 ("M5 CHANNEL: 모르는 도구 조용히 성공","channel-server.ts","    throw new Error(`unknown tool: ${req.params.name}`)","    return { content: [{ type: 'text', text: 'sent' }] }"),
 ("M6 CHANCLIENT: open 시 백오프 리셋 제거","gateway-client.ts","      backoff = 1000   // 짧게 끊겼다 붙기를 반복해도 대기가 자라지 않게 한다\n",""),
 ("M7 CHANCLIENT: rid 무시하고 도착순 resolve","gateway-client.ts","        const entry = pending.get(msg.rid)","        const k = pending.keys().next().value; const entry = k === undefined ? undefined : pending.get(k); if (k !== undefined) msg = { ...msg, rid: k }"),
 ("M8 CHANCLIENT: stop() 후에도 재접속","gateway-client.ts","    if (stopped) return   // 대기 중에 stop() 이 불렸으면 새 소켓을 열지 않는다\n",""),
 ("M9 CHANCLIENT: send 항상 true","gateway-client.ts","    if (!socket || socket.readyState !== WebSocket.OPEN) return false","    if (!socket || socket.readyState !== WebSocket.OPEN) return true"),
 ("M10 CHANCLIENT: 백오프 상한 무시","gateway-client.ts","    backoff = Math.min(backoff * 2, maxBackoff)","    backoff = backoff * 2"),
 ("M11 CHANPERM: 메서드 리터럴 -> 느슨한 접두 일치","channel-server.ts","  method: z.literal('notifications/claude/channel/permission_request'),","  method: z.string().refine(s => s.startsWith('notifications/claude/channel')),"),
 ("M12 CHANPERM: request_id 소문자 정규화(나가는 쪽)","channel-server.ts","    deps.sendPermissionRequest?.(n.params)","    deps.sendPermissionRequest?.({ ...n.params, request_id: n.params.request_id.toLowerCase() })"),
 ("M13 CHANPERM: 판정 params 에 계약 밖 필드 추가","channel-server.ts","        params: { request_id: v.request_id, behavior: v.behavior },","        params: { request_id: v.request_id, behavior: v.behavior, type: 'permission_verdict' },"),
 ("M14 CHANPERM: 미연결 거부 삼키기 제거(void)","channel-server.ts","      .catch(() => {})",""),
 ("M15 CHANWIRE: idle 을 bot_message 앞으로","index.ts","      gw.send({ type: 'bot_message', body: payload.text, files: (payload.files ?? []).map(local_path => ({ local_path })) })\n      gw.send({ type: 'status', state: 'idle' })","      gw.send({ type: 'status', state: 'idle' })\n      gw.send({ type: 'bot_message', body: payload.text, files: (payload.files ?? []).map(local_path => ({ local_path })) })"),
 ("M16 CHANWIRE: 이력 #번호 접두 제거","index.ts","`#${m.id} [${m.created_at}] ${m.author_name}: ${m.body}`","`[${m.created_at}] ${m.author_name}: ${m.body}`"),
 ("M17 CHANWIRE: 진입점 가드 제거","index.ts","if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {","if (true) {"),
 ("M18 CHANWIRE: 토큰 게이트 제거","index.ts","  if (token) gw.start()","  gw.start()"),
 ("M19 CHANWIRE: DEFAULT_SERVER 포트 변경","index.ts","export const DEFAULT_SERVER = 'ws://127.0.0.1:3000/bot'","export const DEFAULT_SERVER = 'ws://127.0.0.1:3001/bot'"),
 ("M20 CHANPERM: sendPermissionRequest 배선 끊기","index.ts","      gw.send({ type: 'permission_request', ...params })","      void params"),
]
def run():
    p=subprocess.run(["npx","vitest","run","--reporter=json","--outputFile=/tmp/vr.json"],capture_output=True,text=True,cwd=SP)
    try:
        d=json.load(open("/tmp/vr.json"))
    except Exception:
        return None,p.stdout[-400:]+p.stderr[-400:]
    fails=[t["fullName"] for r in d["testResults"] for t in r["assertionResults"] if t["status"]!="passed"]
    return fails,None
out=[]
for name,f,old,new in MUTS:
    shutil.rmtree(f"{SP}/src"); shutil.copytree(f"{SP}/src.orig",f"{SP}/src")
    path=f"{SP}/src/{f}"; s=open(path).read()
    if old not in s:
        out.append((name,"APPLY-FAILED",[])); continue
    open(path,"w").write(s.replace(old,new,1))
    subprocess.run(["npx","tsc"],capture_output=True,cwd=SP)   # dist 갱신 (자식 프로세스 AC 용)
    fails,err=run()
    out.append((name,"OK" if fails is not None else "RUN-ERR:"+str(err), fails or []))
shutil.rmtree(f"{SP}/src"); shutil.copytree(f"{SP}/src.orig",f"{SP}/src")
for name,st,fails in out:
    print(f"### {name} | {st} | 실패 {len(fails)}건")
    for x in fails: print("    -",x)
