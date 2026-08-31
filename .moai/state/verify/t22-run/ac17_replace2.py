p = 'channel/test/transport-auth.test.ts'
src = open(p).read()
start = src.index("  it('the three gates are separate")
end = src.index("  it('the entry point closes a rejected socket")
probe_src = open('.moai/state/verify/t22-run/ac17_probe_src.txt').read()

new_block = """  it('the three gates are separate: each mutation breaks a different set', { timeout: 300000 }, async () => {
    // 변이는 «실제 소스에 쓰지 않고» 별도 변이 모듈 파일로 적용한다 — 실패해도 실제 소스가
    // 오염되지 않으며, 러너가 읽은 source 와 파일 상태가 어긋날 여지가 없다 (이전 실행들의 교훈).
    // 자식 스위트 안에서 이 기준이 다시 실행되면 변이 러너가 무한 재귀한다 — 자식은 여서 건너뛴다.
    if (process.env.AC17_CHILD) return
    const source = readFileSync(CLIENT_SRC, 'utf8')
    const variantPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'zz-ac17-variant.ts')
    // N1·N2·N3 는 각 강제 지점(① 봉투 mac·seq / ② 서버 증명 대조 / ③ 확립 게이트) 의 판정을 지운다.
    // O 는 ①·②(challenge·env 처리) 를 ③ 체인 «뒤로» 옮긴다 — 본문이 금지한 형태의 문자 그대로 재현:
    // 옮겨진 블록은 확립 전 프레임이 ③ 에 먹혀 도달조차 하지 않게 된다.
    const apply: Record<string, (src: string) => string> = {
      N1: s => s.replace(/\\(!keysOk \\|\\| !macOk \\|\\| !seqOk\\)/, '(false) /* N1 */'),
      N2: s => s.replace(/if \\(!macOk\\) return rejectChallenge\\(ws\\)/, 'if (false) return rejectChallenge(ws) /* N2 */'),
      N3: s => s.replace(/else if \\(!established\\) \\{/, 'else if (false) { /* N3 */'),
      O: s => {
        const cut = s.indexOf("if (msg.type === 'challenge') {")
        const chain = s.indexOf('else if (!established) {')
        if (cut < 0 || chain < 0 || chain < cut) throw new Error('O 앵커가 소스에 없다')
        const blocks = s.slice(cut, chain)   // challenge 블록 + env 블록
        const close = s.indexOf('\\n      }\\n', chain) + '\\n      }\\n'.length   // ③ 분기의 닫힘
        return s.slice(0, cut) + s.slice(chain, close) + '\\n' + blocks + s.slice(close)
      },
    }

    // 자식이 돌릴 최소 프로브 — 변이 «모듈 파일» 을 import 해 세 삼각형으로 세 강제 지점을 관측한다.
    //   P_proof      ↔ ② (서버 증명 대조) — 위조 증명을 받아들이면 auth 가 나간다
    //   P_env        ↔ ① (봉투 mac·seq)   — 변조 봉투가 콜백에 도착한다
    //   P_establish  ↔ ③/핸드셰이크       — 유효 challenge·auth·welcome 로도 확립되지 않는다
    const probeSource = JSON.parse('"'" + JSON.stringify(JSON.stringify(PROBE_PLACEHOLDER)).slice(1, -1) + '"'"'.replace(/\\\\n/g, '\\n'))

    const runSuite = async (mutated: string): Promise<string[]> => {
      writeFileSync(variantPath, mutated)
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
        const jsonLine = buf.split('\\n').reverse().find(l => l.startsWith('{'))
        const parsed = JSON.parse(jsonLine!) as { testResults: { assertionResults: { fullName: string; status: string }[] }[] }
        return parsed.testResults.flatMap(r => r.assertionResults).filter(a => a.status === 'failed').map(a => a.fullName).map(n => n.split(' ').pop()!)
      } finally {
        rmSync(probePath, { force: true })
        rmSync(variantPath, { force: true })
      }
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
    expect(n1.some(n => n.includes('P_env'))).toBe(true)     // N1 → ① 붕괴: 변조 봉투가 통과한다
    expect(n2.some(n => n.includes('P_proof'))).toBe(true)   // N2 → ② 붕괴: 위조 증명 뒤 auth 가 나간다
    // N3 은 이 SPEC(SPEC-GWAUTH2)의 기준을 하나도 무너뜨리지 않는다 — ①·② 가 먼저 반환한다
    expect(n3).toEqual([])
    // O 를 넣으면 ③ 뒤로 옮겨진 challenge 가 확립 전에 먹혀 P_proof·P_establish 가 무너지고,
    // O 를 넣은 뒤 N3 을 다시 넣으면 ③ 이 열려 블록이 도달해 그 무너뜨림이 사라진다 — 기대값 반전
    expect(o.some(n => n.includes('P_proof'))).toBe(true)
    expect(o.some(n => n.includes('P_establish'))).toBe(true)
    expect(new Set(oN3)).not.toEqual(new Set(o))

    // 실제 소스는 이 기준이 «읽지 만 쓰지 않았다» — 변이의 흔적이 없다 (restore 무관하게 성립)
    expect(readFileSync(CLIENT_SRC, 'utf8')).toBe(source)
  })
"""

new_block = new_block.replace('PROBE_PLACEHOLDER', 'X')
# We embed the probe source directly as a template literal instead:
probe_embedded = open('.moai/state/verify/t22-run/ac17_probe_src.txt').read()
# Escape backticks and ${ for embedding inside a TS template literal
escaped = probe_embedded.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
new_block = new_block.replace("const probeSource = JSON.parse('\"' + JSON.stringify(JSON.stringify(PROBE_PLACEHOLDER)).slice(1, -1) + '\"'.replace(/\\\\n/g, '\\n'))",
                              "const probeSource = `" + escaped + "`")

src = src[:start] + new_block + src[end:]
open(p, 'w').write(src)
print('replaced with variant-file design')
