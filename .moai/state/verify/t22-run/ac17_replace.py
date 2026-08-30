p = 'channel/test/transport-auth.test.ts'
lines = open(p).read().split('\n')
start = 808 - 1
end = 878
new_block = r'''  it('the three gates are separate: each mutation breaks a different set', { timeout: 300000 }, async () => {
    // 자식 스위트 안에서 이 기준이 다시 실행되면 변이 러너가 무한 재귀한다 — 자식은 여서 건너뛴다
    if (process.env.AC17_CHILD) return
    const source = readFileSync(CLIENT_SRC, 'utf8')
    // N1·N2·N3 는 각 강제 지점(① 봉투 mac·seq / ② 서버 증명 대조 / ③ 확립 게이트) 의 판정을 지운다.
    // O 는 ①·②(challenge·env 처리) 를 ③ 체인 «뒤로» 옮긴다 — 본문이 금지한 형태의 문자 그대로 재현:
    // 옮겨진 블록은 확립 전 프레임이 ③ 에 먹혀 도달조차 하지 않게 된다.
    const apply: Record<string, (src: string) => string> = {
      N1: s => s.replace(/\(!keysOk \|\| !macOk \|\| !seqOk\)/, '(false) /* N1 */'),
      N2: s => s.replace(/if \(!macOk\) return rejectChallenge\(ws\)/, 'if (false) return rejectChallenge(ws) /* N2 */'),
      N3: s => s.replace(/else if \(!established\) \{/, 'else if (false) { /* N3 */'),
      O: s => {
        const cut = s.indexOf("if (msg.type === 'challenge') {")
        const chain = s.indexOf('else if (!established) {')
        if (cut < 0 || chain < 0 || chain < cut) throw new Error('O 앵커가 소스에 없다')
        const blocks = s.slice(cut, chain)   // challenge 블록 + env 블록
        const close = s.indexOf('\n      }\n', chain) + '\n      }\n'.length   // ③ 분기의 닫힘
        return s.slice(0, cut) + s.slice(chain, close) + '\n' + blocks + s.slice(close)
      },
    }

    // 자식이 돌릴 최소 프로브 — 세 삼각형으로 세 강제 지점을 관측한다. 변이된 클라이언트 소스를
    // 자식이 import 하므로, «어느 프로브가 죽는가» 가 곧 «어느 강제 지점이 깨졌는가» 다.
    //   P_proof      ↔ ② (서버 증명 대조) — 위조 증명을 받아들이면 auth 가 나간다
    //   P_env        ↔ ① (봉투 mac·seq)   — 변조 봉투가 콜백에 도착한다
    //   P_establish  ↔ ③/핸드셰이크       — 유효 challenge·auth·welcome 로도 확립되지 않는다
    const probeSource = `
import { describe, it, expect, afterEach } from 'vitest'
import { WebSocketServer, WebSocket } from 'ws'
import { createHmac, createPrivateKey, createPublicKey, randomBytes } from 'node:crypto'
import { createGatewayClient } from '../src/gateway-client.js'
const skOf = t => createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), createHmac('sha256', t).update('minidiscord/v2/sign').digest()]), format: 'der', type: 'pkcs8' })
const pubOf = t => createPublicKey(skOf(t)).export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
const ksrvOf = t => createHmac('sha256', t).update('minidiscord/v2/server-confirm').digest()
const cleanups: (() => void)[] = []
afterEach(() => { for (const c of cleanups.splice(0).reverse()) c() })
function stubServer(opts: { proof?: string | null; envAfterAuth?: boolean; envSeq?: number; envBadMac?: boolean }) {
  const wss = new WebSocketServer({ port: 0 })
  const sent: any[] = []
  let sn = ''
  let sessKey: Buffer | null = null
  cleanups.push(() => wss.close())
  wss.on('connection', ws => {
    ws.on('message', d => {
      const m = JSON.parse(String(d))
      sent.push(m)
      if (m.type === 'hello') {
        sn = randomBytes(32).toString('hex')
        const frame: Record<string, unknown> = { type: 'challenge', server_nonce: sn, room_id: 1, bot_id: 2 }
        if (opts.proof !== null) {
          const valid = createHmac('sha256', ksrvOf('tok')).update(\`challenge|\${m.client_nonce}|\${sn}|1|2|\${m.pub}|unbound\`).digest('hex')
          frame.server_proof = opts.proof === 'wrong' ? (valid[0] === '0' ? '1' : '0') + valid.slice(1) : valid
        }
        ws.send(JSON.stringify(frame))
      }
      if (m.type === 'auth' && opts.envAfterAuth) {
        sessKey = createHmac('sha256', ksrvOf('tok')).update(\`session|\${sent.find(x => x.type === 'hello').client_nonce}|\${sn}|1|2|unbound\`).digest()
        const seq = opts.envSeq ?? 1
        const inner = { type: 'message', id: 1, author_name: 'alice', delivery: 'to', body: 'probe' }
        const payload = JSON.stringify(inner)
        let mac = createHmac('sha256', sessKey).update(\`\${seq}|\${payload}\`).digest('hex')
        if (opts.envBadMac) mac = (mac[0] === '0' ? '1' : '0') + mac.slice(1)
        ws.send(JSON.stringify({ type: 'env', seq, payload, mac }))
      }
    })
  })
  return { port: () => (wss.address() as { port: number }).port, sent }
}
describe('AC17 probes', () => {
  it('P_proof', async () => {
    const srv = stubServer({ proof: 'wrong', envAfterAuth: false })
    const client = createGatewayClient({ url: \`ws://127.0.0.1:\${srv.port()}/bot\`, token: 'tok', sleep: async () => {} })
    cleanups.push(() => client.stop())
    client.start()
    await new Promise(r => setTimeout(r, 700))
    const auths = srv.sent.filter(m => m.type === 'auth')
    expect(auths.length).toBe(0)   // ② 가 산다 — 위조 증명 뒤 auth 가 나가지 않는다
  })
  it('P_env', async () => {
    const notes: unknown[] = []
    const srv = stubServer({ proof: 'valid', envAfterAuth: true, envSeq: 2, envBadMac: true })
    const client = createGatewayClient({ url: \`ws://127.0.0.1:\${srv.port()}/bot\`, token: 'tok', sleep: async () => {}, onMessage: m => notes.push(m) })
    cleanups.push(() => client.stop())
    client.start()
    await new Promise(r => setTimeout(r, 900))
    expect(notes).toEqual([])      // ① 이 산다 — 변조 봉투가 콜백에 도착하지 않는다
  })
  it('P_establish', async () => {
    const got: unknown[] = []
    const srv = stubServer({ proof: 'valid', envAfterAuth: true, envSeq: 1 })
    const client = createGatewayClient({ url: \`ws://127.0.0.1:\${srv.port()}/bot\`, token: 'tok', sleep: async () => {}, onMessage: m => got.push(m) })
    cleanups.push(() => client.stop())
    client.start()
    await new Promise(r => setTimeout(r, 900))
    expect(got.length).toBe(1)     // 핸드셰이크가 산다 — 유효 왕복 뒤 내부 프레임이 도착한다
  })
})
`
    const probePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'zz-ac17-probe.test.ts')
    const runSuite = async (mutated: string): Promise<string[]> => {
      writeFileSync(CLIENT_SRC, mutated)
      writeFileSync(probePath, probeSource)
      try {
        const out = spawn(
          'npx',
          ['vitest', 'run', 'zz-ac17-probe.test.ts', '--reporter=json', '--testTimeout=5000'],
          { cwd: path.dirname(fileURLToPath(import.meta.url)), env: { ...process.env, AC17_CHILD: '1' } },
        )
        let buf = ''
        out.stdout.on('data', d => { buf += String(d) })
        await new Promise<void>(r => out.on('close', () => r()))
        const jsonLine = buf.split('\n').reverse().find(l => l.startsWith('{'))
        const parsed = JSON.parse(jsonLine!) as { testResults: { assertionResults: { fullName: string; status: string }[] }[] }
        return parsed.testResults.flatMap(r => r.assertionResults).filter(a => a.status === 'failed').map(a => a.fullName).map(n => n.split('> ').pop()!)
      } finally { rmSync(probePath, { force: true }) }
    }

    const base = await runSuite(source)
    expect(base).toEqual([])                                     // 변이 없는 프로브 셋은 초록이다
    const n1 = await runSuite(apply.N1(source))
    const n2 = await runSuite(apply.N2(source))
    const n3 = await runSuite(apply.N3(source))
    const o = await runSuite(apply.O(source))
    const oN3 = await runSuite(apply.N3(apply.O(source)))

    // 세 집합이 서로 다르다 — 굵은 변이 하나로 세 방어를 가르지 못한다
    expect(new Set(n1)).not.toEqual(new Set(n2))
    expect(new Set(n2)).not.toEqual(new Set(n3))
    expect(new Set(n1)).not.toEqual(new Set(n3))
    expect(n1).toContain('P_env')          // N1 → ① 붕괴: 변조 봉투가 통과한다
    expect(n2).toContain('P_proof')        // N2 → ② 붕괴: 위조 증명 뒤 auth 가 나간다
    // N3 은 이 SPEC(SPEC-GWAUTH2)의 기준을 하나도 무너뜨리지 않는다 — ①·② 가 먼저 반환한다
    expect(n3).toEqual([])
    // O 를 넣으면 ③ 뒤로 옮겨진 challenge 가 확립 전에 먹혀 P_proof·P_establish 가 무너지고,
    // O 를 넣은 뒤 N3 을 다시 넣으면 ③ 이 열려 블록이 도달해 그 무너뜨림이 사라진다 — 기대값 반전
    expect(o).toContain('P_proof')
    expect(o).toContain('P_establish')
    expect(new Set(oN3)).not.toEqual(new Set(o))

    // 복원 확인 — 변이의 흔적이 남지 않았다 (AC-GWAUTH2-017 본문의 요구)
    expect(readFileSync(CLIENT_SRC, 'utf8')).toBe(source)
  })'''
lines[start:end] = new_block.split('\n')
open(p, 'w').write('\n'.join(lines))
print('replaced')
