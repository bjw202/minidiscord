# M6 변이표 실측 드라이버 — 카드 t22 (SPEC-GWAUTH-002 plan.md §F M6, §E 4·4b·5)
# 규율: 기준선은 git 객체에서 잡는다(HEAD blob). 적용 → npm test → 복원 → hash-object 대조.
# 한 행이라도 오염 흔적이 남으면 그 배치는 거기서 멈춘다(다음 행을 넘어가지 않는다).
import json, os, re, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
EV = os.path.join(ROOT, '.moai', 'state', 'verify', 't22-run')
os.chdir(ROOT)

GW = 'server/src/gateway.ts'
GC = 'channel/src/gateway-client.ts'
RB = 'server/src/routes-bots.ts'
DB = 'server/src/db.ts'

def patch(old, new):
    return (old, new)

ROWS = {
 'A': {GW: [patch(
    "    send(ws, { type: 'challenge', server_nonce: serverNonce, room_id: row.room_id, bot_id: row.bot_id, server_proof: serverProof })",
    "    send(ws, { type: 'challenge', server_nonce: serverNonce, room_id: row.room_id, bot_id: row.bot_id }) /* A */")]},
 'B': {GW: [patch(
    "    const serverProof = createHmac('sha256', handshake.confirmKey)\n      .update(handshakeTranscript('challenge', clientNonce, serverNonce, row.room_id, row.bot_id, pub, cb))\n      .digest('hex')",
    "    const serverProof = 'b'.repeat(64) /* B */")]},
 'C': {GW: [
    patch("  if (kind === 'session') return `session${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${cb}`",
          "  if (kind === 'session') return `session${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${cb}` /* C */"),
    patch("  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
          "  return `${kind}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}` /* C */")],
  GC: [
    patch("    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
          "    `${label}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}` /* C */"),
    patch("    createHmac('sha256', ksrvOf(t)).update(`session${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${cb}`).digest()",
          "    createHmac('sha256', ksrvOf(t)).update(`session${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${cb}`).digest() /* C */")]},
 'D': {GW: [
    patch("  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
          "  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${cb}` /* D */")],
  GC: [
    patch("    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
          "    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${cb}` /* D */")]},
 'E': {GW: [patch(
    "    const serverProof = createHmac('sha256', handshake.confirmKey)",
    "    const serverProof = createHmac('sha256', Buffer.from(pub, 'hex')) /* E */")],
  GC: [patch(
    "        const expected = createHmac('sha256', rules.ksrvOf(opts.token))",
    "        const expected = createHmac('sha256', Buffer.from(pub, 'hex')) /* E */")]},
 'F': {GW: [patch(
    "    handshakes.set(ws, handshake)",
    "    handshakes.set(ws, handshake)\n    conns.set(ws, { roomId: row.room_id, botId: row.bot_id, tokenRowId: row.token_row_id, sessKey: createHmac('sha256', handshake.confirmKey).update(handshakeTranscript('session', clientNonce, serverNonce, row.room_id, row.bot_id, pub, cb)).digest(), seq: 1 }) /* F */")]},
 'G': {RB: [patch(
    "    const { verifierPub, serverConfirmKey } = deriveBotKeys(token)\n    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)').run(roomId, bot.id, verifierPub, serverConfirmKey)",
    "    const { serverConfirmKey } = deriveBotKeys(token)\n    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)').run(roomId, bot.id, sha256Hex(token), serverConfirmKey) /* G */")]},
 'H': {DB: [patch(
    "  bot_id INTEGER NOT NULL REFERENCES bots(id),\n  verifier_pub TEXT UNIQUE NOT NULL,",
    "  bot_id INTEGER NOT NULL REFERENCES bots(id),\n  token_hash TEXT, /* H */\n  verifier_pub TEXT UNIQUE NOT NULL,")],
  RB: [patch(
    "    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)').run(roomId, bot.id, verifierPub, serverConfirmKey)",
    "    db.prepare('INSERT INTO bot_tokens (room_id, bot_id, token_hash, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?, ?)').run(roomId, bot.id, sha256Hex(token), verifierPub, serverConfirmKey) /* H */")]},
 'I': {GW: [
    patch("import { copyFileSync, statSync, realpathSync } from 'node:fs'",
          "import { copyFileSync, statSync, realpathSync } from 'node:fs'\nimport { deriveBotKeys } from './routes-bots.js' /* I */"),
    patch("    if (!/^[0-9a-f]{64}$/.test(pub) || !/^[0-9a-f]{64}$/.test(clientNonce)) { dropConn(ws); return }",
          "    const pubI = /^[0-9a-f]{64}$/.test(pub) ? pub : (typeof msg.token === 'string' && msg.token.length > 0 ? deriveBotKeys(msg.token).verifierPub : '') /* I */\n    const nonceI = /^[0-9a-f]{64}$/.test(clientNonce) ? clientNonce : (typeof msg.nonce === 'string' && msg.nonce.length > 0 ? msg.nonce : '') /* I */\n    if (!/^[0-9a-f]{64}$/.test(pubI) || !/^[0-9a-f]{64}$/.test(nonceI)) { dropConn(ws); return }"),
    patch("    ).get(pub) as",
          "    ).get(pubI) as /* I */"),
    patch("      verifierPub: pub, clientNonce, serverNonce,",
          "      verifierPub: pubI, clientNonce: nonceI, serverNonce, /* I */"),
    patch("      .update(handshakeTranscript('challenge', clientNonce, serverNonce, row.room_id, row.bot_id, pub, cb))",
          "      .update(handshakeTranscript('challenge', nonceI, serverNonce, row.room_id, row.bot_id, pubI, cb)) /* I */")]},
 'J': {GW: [patch(
    "  function sendEstablished(c: Established, ws: WebSocket, inner: object): void {\n    const payload = JSON.stringify(inner)   // 서버가 만든 문자열 그대로 MAC 한다 — 정규화 규칙이 존재하지 않는다 (plan.md §D-6)\n    const seq = c.seq++\n    const mac = createHmac('sha256', c.sessKey).update(`${seq}|${payload}`).digest('hex')\n    send(ws, { type: 'env', seq, payload, mac })\n  }",
    "  function sendEstablished(c: Established, ws: WebSocket, inner: object): void {\n    void c\n    send(ws, inner) /* J */\n  }")]},
 'K': {GW: [patch(
    "    const seq = c.seq++",
    "    const seq = 1 /* K */\n    void c")]},
 'L': {GC: [patch(
    "        const macOk = keysOk && sessKey !== null && (() => {\n          const expected = createHmac('sha256', sessKey!).update(`${msg.seq}|${msg.payload}`).digest('hex')\n          return msg.mac.length === expected.length && timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.mac, 'hex'))\n        })()",
    "        const macOk = keysOk && sessKey !== null /* L */")]},
 'M': {GC: [patch(
    "        const seqOk = keysOk && macOk && msg.seq > lastSeq",
    "        const seqOk = keysOk && macOk /* M */")]},
 'N1': {GC: [patch(
    "        if (!keysOk || !macOk || !seqOk) {",
    "        if (false) { /* N1 */")]},
 'N2': {GC: [patch(
    "        if (!macOk) return rejectChallenge(ws)",
    "        if (false) return rejectChallenge(ws) /* N2 */")]},
 'N3': {GC: [patch(
    "      else if (!established) {",
    "      else if (false) { /* N3 */")]},
 'O': {'__move_O__': True, GC: []},
 'O+N3': {'__move_O__': True, '__then_N3__': True, GC: []},
 'P': {GW: [patch(
    "      sessKey: createHmac('sha256', hs.confirmKey)\n        .update(handshakeTranscript('session', hs.clientNonce, hs.serverNonce, hs.roomId, hs.botId, hs.verifierPub, hs.cb))\n        .digest(),",
    "      sessKey: createHmac('sha256', `${hs.clientNonce}${hs.serverNonce}`).update('session').digest(), /* P */")],
  GC: [patch(
    "        sessKey = rules.sessKeyOf(opts.token, clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, cb)",
    "        sessKey = createHmac('sha256', `${clientNonce}${msg.server_nonce}`).update('session').digest() /* P */")]},
 'Q': {GC: [patch(
    "        const macOk = msg.server_proof.length === expected.length &&\n          timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.server_proof, 'hex'))",
    "        const macOk = timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(msg.server_proof, 'hex')) /* Q */")]},
 'R': {GC: [patch(
    "      console.error('minidiscord-channel: challenge 를 거절한다 — 서버 증명이 형식 또는 값 대조를 통과하지 못해 세션을 확립하지 않고 소켓을 닫는다')",
    "      console.log('minidiscord-channel: challenge 를 거절한다 — 서버 증명이 형식 또는 값 대조를 통과하지 못해 세션을 확립하지 않고 소켓을 닫는다') /* R */")],
  '__rebuild_dist__': True},
 'S': {GC: [patch(
    "      ws.send(JSON.stringify({ type: 'hello', pub, client_nonce: clientNonce }))",
    "      ws.send(JSON.stringify({ type: 'hello', pub, client_nonce: clientNonce, token: opts.token })) /* S */")]},
 'T': {GW: [
    patch("  if (kind === 'session') return `session${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${cb}`",
          "  if (kind === 'session') return `session${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}` /* T */"),
    patch("  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
          "  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}` /* T */")],
  GC: [
    patch("    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
          "    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}` /* T */"),
    patch("    createHmac('sha256', ksrvOf(t)).update(`session${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${cb}`).digest()",
          "    createHmac('sha256', ksrvOf(t)).update(`session${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}`).digest() /* T */")]},
 'U': {GC: [
    patch("      ws.send(JSON.stringify({ type: 'hello', pub, client_nonce: clientNonce }))",
          "      ws.send(JSON.stringify({ type: 'hello', pub, client_nonce: clientNonce, cb })) /* U */"),
    patch("        sessKey = rules.sessKeyOf(opts.token, clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, cb)",
          "        const peerCbU = typeof msg.cb === 'string' ? msg.cb : cb /* U */\n        sessKey = rules.sessKeyOf(opts.token, clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, peerCbU)"),
    patch("        const signature = sign(null, Buffer.from(rules.transcriptOf('auth', clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, pub, cb)), sk).toString('hex')",
          "        const signature = sign(null, Buffer.from(rules.transcriptOf('auth', clientNonce, msg.server_nonce, msg.room_id, msg.bot_id, pub, peerCbU)), sk).toString('hex') /* U */")],
  GW: [
    patch("    const serverProof = createHmac('sha256', handshake.confirmKey)\n      .update(handshakeTranscript('challenge', clientNonce, serverNonce, row.room_id, row.bot_id, pub, cb))",
          "    const effCbU = typeof msg.cb === 'string' ? msg.cb : cb /* U */\n    const serverProof = createHmac('sha256', handshake.confirmKey)\n      .update(handshakeTranscript('challenge', clientNonce, serverNonce, row.room_id, row.bot_id, pub, effCbU))"),
    patch("    send(ws, { type: 'challenge', server_nonce: serverNonce, room_id: row.room_id, bot_id: row.bot_id, server_proof: serverProof })",
          "    send(ws, { type: 'challenge', server_nonce: serverNonce, room_id: row.room_id, bot_id: row.bot_id, server_proof: serverProof, cb }) /* U */")]},
 'U2': {GC: [patch(
    "      ws.send(JSON.stringify({ type: 'hello', pub, client_nonce: clientNonce }))",
    "      ws.send(JSON.stringify({ type: 'hello', pub, client_nonce: clientNonce, cb })) /* U2 */")],
  GW: [patch(
    "    send(ws, { type: 'challenge', server_nonce: serverNonce, room_id: row.room_id, bot_id: row.bot_id, server_proof: serverProof })",
    "    send(ws, { type: 'challenge', server_nonce: serverNonce, room_id: row.room_id, bot_id: row.bot_id, server_proof: serverProof, cb }) /* U2 */")]},
 'AA': {GC: [patch(
    "  const skOf = (t: string) => createPrivateKey({\n    key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, 'hex'), createHmac('sha256', t).update(SIGN_LABEL).digest()]),\n    format: 'der', type: 'pkcs8',\n  })",
    "  const skOf = (t: string) => createPrivateKey({\n    key: Buffer.concat([Buffer.from(PKCS8_ED25519_PREFIX, 'hex'), createHmac('sha256', t).update(CONFIRM_LABEL).digest()]), /* AA */\n    format: 'der', type: 'pkcs8',\n  })")],
  RB: [patch(
    "  const seed = createHmac('sha256', token).update(SIGN_LABEL).digest()",
    "  const seed = createHmac('sha256', token).update(CONFIRM_LABEL).digest() /* AA */")]},
 'V': {GW: [patch(
    "  if (kind === 'session') return `session${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${cb}`",
    "  if (kind === 'session') return `session${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}` /* V */")],
  GC: [patch(
    "    createHmac('sha256', ksrvOf(t)).update(`session${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${cb}`).digest()",
    "    createHmac('sha256', ksrvOf(t)).update(`session${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}`).digest() /* V */")]},
 'W': {GW: [
    patch("    if (!(sock instanceof TLSSocket)) return 'unbound'",
          "    if (!(sock instanceof TLSSocket)) return 'w'.repeat(64) /* W */"),
    patch("    if (typeof exporter.exportKeyingMaterial !== 'function') return 'unbound'",
          "    if (typeof exporter.exportKeyingMaterial !== 'function') return 'w'.repeat(64) /* W */"),
    patch("  } catch {\n    return 'unbound'\n  }\n}",
          "  } catch {\n    return 'w'.repeat(64) /* W */\n  }\n}")],
  GC: [
    patch("    if (!(sock instanceof TLSSocket)) return 'unbound'",
          "    if (!(sock instanceof TLSSocket)) return 'w'.repeat(64) /* W */"),
    patch("    if (typeof exporter.exportKeyingMaterial !== 'function') return 'unbound'",
          "    if (typeof exporter.exportKeyingMaterial !== 'function') return 'w'.repeat(64) /* W */"),
    patch("  } catch {\n    return 'unbound'\n  }\n}",
          "  } catch {\n    return 'w'.repeat(64) /* W */\n  }\n}")]},
 'X': {GW: [patch(
    "    for (const [ws, c] of conns) if (c.roomId === info.roomId && c.botId === info.botId) sendEstablished(c, ws, payload)",
    "    for (const [ws, c] of conns) if (c.roomId === info.roomId && c.botId === info.botId) send(ws, payload) /* X */")]},
 'Z1': {GW: [patch(
    "  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
    "  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${kind === 'challenge' ? '' : SEP + cb}` /* Z1 */")],
  GC: [patch(
    "    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
    "    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${label === 'challenge' ? '' : SEP + cb}` /* Z1 */")]},
 'Z2': {GW: [patch(
    "  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
    "  return `${kind}${SEP}${clientNonce}${SEP}${serverNonce}${SEP}${room}${SEP}${bot}${SEP}${pub}${kind === 'auth' ? '' : SEP + cb}` /* Z2 */")],
  GC: [patch(
    "    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${SEP}${cb}`",
    "    `${label}${SEP}${cn}${SEP}${sn}${SEP}${room}${SEP}${bot}${SEP}${pub}${label === 'auth' ? '' : SEP + cb}` /* Z2 */")]},
 'Y': {GC: [patch(
    "        if (!formatOk) return rejectChallenge(ws)",
    "        void formatOk /* Y */\n        if (false) return rejectChallenge(ws) /* Y */")]},
}

def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

def blob_head(path):
    r = sh(f"git cat-file blob HEAD:{path}")
    if r.returncode != 0: raise RuntimeError(f"blob read fail {path}: {r.stderr}")
    return r.stdout

def head_blob_sha(path):
    r = sh(f"git rev-parse HEAD:{path}")
    if r.returncode != 0: raise RuntimeError(f"rev-parse fail {path}")
    return r.stdout.strip()

def worktree_hash(path):
    r = sh(f"git hash-object {path}")
    return r.stdout.strip()

def apply_O(src):
    # AC-GWAUTH2-017 러너의 apply.O 와 동일한 변형 — ①·② 블록을 ③ 체인 «뒤로» 옮긴다
    cut = src.find("      if (msg.type === 'challenge') {")
    chain = src.find('      else if (!established) {')
    if cut < 0 or chain < 0 or chain < cut: raise RuntimeError('O anchor missing')
    blocks = src[cut:chain]
    marker = '\n      }\n'
    close = src.find(marker, chain) + len(marker)
    return src[:cut] + src[chain:close] + '\n' + blocks + src[close:]

def parse_summary(txt):
    out = {'workspace_lines': [], 'fail_names': [], 'fail_files': []}
    for m in re.finditer(r'Tests\s+(\d+) failed(?:\s*\|\s*(\d+) passed)?\s*\((\d+)\)', txt):
        out['workspace_lines'].append(m.group(0).strip())
    for m in re.finditer(r'^\s*FAIL\s+(\S+)\s*>\s*(.+)$', txt, re.M):
        out['fail_files'].append(m.group(1)); out['fail_names'].append(m.group(2).strip())
    if not out['fail_names']:
        for m in re.finditer(r'^\s*[×x✕]\s+(.+)$', txt, re.M):
            nm = m.group(1).strip()
            if nm and not nm.startswith(('server/', 'channel/')): out['fail_names'].append(nm)
    return out

def run_row(rid):
    spec = ROWS[rid]
    t0 = time.time()
    rec = {'row': rid, 'head': sh('git rev-parse --short HEAD').stdout.strip(), 'files': sorted(
        [f for f in spec if not f.startswith('__')]), 'status': 'ok'}
    baselines = {}
    head_shas = {}
    for f in rec['files']:
        baselines[f] = blob_head(f); head_shas[f] = head_blob_sha(f)
        if worktree_hash(f) != head_shas[f]:
            rec['status'] = 'ABORT: pre-mutation tree dirty vs HEAD for ' + f
            return rec
    # 적용
    try:
        if spec.get('__move_O__'):
            p = os.path.join(ROOT, GC)
            src = open(p).read()
            moved = apply_O(src)
            if spec.get('__then_N3__'):
                anchor = '      else if (!established) {'
                if moved.count(anchor) != 1: raise RuntimeError('O+N3: N3 anchor count != 1 after move')
                moved = moved.replace(anchor, '      else if (false) { /* N3 under O */')
            open(p, 'w').write(moved + '\n/* O applied */\n')
        for f, patches in spec.items():
            if f.startswith('__'): continue
            p = os.path.join(ROOT, f)
            src = open(p).read()
            for old, new in patches:
                n = src.count(old)
                if n != 1: raise RuntimeError(f'{rid}: anchor count {n} != 1 in {f}: {old[:60]!r}')
                src = src.replace(old, new)
            open(p, 'w').write(src)
    except Exception as e:
        for f, content in baselines.items(): open(os.path.join(ROOT, f), 'w').write(content)
        rec['status'] = f'ABORT apply: {e}'
        return rec
    # dist 재빌드가 필요한 행(R)
    if spec.get('__rebuild_dist__'):
        rb = sh('npm run build -w channel')
        rec['dist_rebuild_apply_exit'] = rb.returncode
    # 스위트 실행
    out_path = os.path.join(EV, f'mutation-{rid}.txt')
    with open(out_path, 'w') as fh:
        r = sh('npm test 2>&1')
        fh.write(r.stdout)
        if r.stderr: fh.write(r.stderr)
        fh.write(f'\n[exit={r.returncode}]\n')
    rec['test_exit'] = r.returncode
    rec['summary'] = parse_summary(r.stdout)
    rec['evidence'] = f'.moai/state/verify/t22-run/mutation-{rid}.txt'
    # 복원 — dist 재빌드는 소스 복원 «뒤에» 와야 한다: 재빌드가 복원을 앞서면 변이된 소스를
    # 다시 컴파일해 오염이 dist 에 남는다 (R 행에서 실제로 일어난 사고 — S·T 재측정의 원인)
    for f, content in baselines.items():
        open(os.path.join(ROOT, f), 'w').write(content)
    if spec.get('__rebuild_dist__'):
        rb2 = sh('npm run build -w channel')
        rec['dist_rebuild_restore_exit'] = rb2.returncode
    # 오염 검증 — hash-object 가 HEAD blob 과 같고 git diff 가 비어 있어야 한다
    dirty = []
    for f in rec['files']:
        if worktree_hash(f) != head_shas[f]: dirty.append(f)
    st = sh('git status --porcelain')
    tracked_dirty = [l for l in st.stdout.splitlines() if l.strip() and not l.startswith('??')]
    rec['dirty_files'] = dirty
    rec['tracked_dirty'] = tracked_dirty
    if dirty or tracked_dirty:
        rec['status'] = 'ABORT: contamination after revert'
        return rec
    rec['secs'] = round(time.time() - t0, 1)
    return rec

def main():
    ids = sys.argv[1:]
    results_path = os.path.join(EV, 'm6-mutation-results.jsonl')
    for rid in ids:
        rec = run_row(rid)
        print('REC:', json.dumps({k: rec[k] for k in rec if k != 'summary'}, ensure_ascii=False))
        with open(results_path, 'a') as fh:
            fh.write(json.dumps(rec, ensure_ascii=False) + '\n')
        s = rec.get('summary', {})
        print(f"[{rid}] {rec['status']} exit={rec.get('test_exit')} "
              f"fails={len(s.get('fail_names', []))} secs={rec.get('secs')} files={rec['files']}")
        for n in s.get('fail_names', [])[:40]:
            print(f"    × {n}")
        if rec['status'] != 'ok':
            print('CONTAMINATION OR FAILURE — stopping batch'); sys.exit(2)

if __name__ == '__main__':
    main()
