# M6 변이표 실측 추출기 — m6-mutation-results.jsonl 의 마지막 항목(재측정 포함)을 it 이름 → AC 로 매핑한다
import json
AC = {
 'an invite stores only a verifier': '001', 'the server looks the bot up by its verifier': '002',
 'hello carries exactly a pub and a client nonce': '003', 'no frame in either direction carries the token': '004',
 'the challenge proof is bound to both nonces': '005', 'a rogue that reads the hello cannot forge': '006',
 'a challenge from a stub that holds the confirm key': '007', 'no auth signature leaves the channel': '008',
 'a client holding only what the database stores': '009', 'a signature made for another handshake': '010',
 'both nonces are regenerated per socket': '011', 'a malformed or wrong-length proof': '012',
 'a relaying man in the middle': '013', 'an envelope with a broken mac': '014',
 'a replayed envelope is dropped': '015', 'the sequence starts at one per socket': '016',
 'the three gates are separate': '017', 'a v1 hello carrying a plaintext token': '018',
 'the entry point closes a rejected socket': '019', 'the real server and the real channel agree': '020',
 'passes a welcome envelope through untouched': '020(나)', 'a real relay terminating tls': '022',
 'a history response from the real server': '023', 'on an unbound transport the same relay': '024',
}
SIB = ('gateway >','permission relay >','room membership gates >','AC-WEBRICH','gateway client >','channel wiring >',
       'transport auth > an endpoint','transport auth > after welcome','transport auth > a history_response before welcome',
       'transport auth > session establishment','transport auth > gated frames','transport auth > a gated frame raises',
       'transport auth > imports no filesystem','transport auth > decides transport','transport auth > the entry point refuses',
       'transport auth > keeps bracketed','transport auth > refuses an unparseable','dumps the real broker bodies',
       'invites > stores only the verifier')
rows = {}
for l in open('.moai/state/verify/t22-run/m6-mutation-results.jsonl'):
    r = json.loads(l)
    rows[r['row']] = r   # last wins — 재측정 행은 마지막 항목이 본측정
order = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N1','N2','N3','O','O+N3','P','Q','R','S','T','U','U2','AA','V','W','X','Y','Z1','Z2']
for rid in order:
    r = rows.get(rid)
    if not r:
        print(f"{rid}: (no result)")
        continue
    acs, sib, other = [], 0, []
    for n in r['summary']['fail_names']:
        hit = None
        for k, v in AC.items():
            if k in n:
                hit = v
                break
        if hit:
            acs.append(hit)
        elif any(s in n for s in SIB):
            sib += 1
        else:
            other.append(n)
    acu = []
    for a in acs:
        if a not in acu:
            acu.append(a)
    print(f"{rid}: exit={r['test_exit']} secs={r.get('secs')} ACfail={acu or 'none'} sibling={sib} other={len(other)}")
    for o in other[:4]:
        print('      ?', o[:90])
