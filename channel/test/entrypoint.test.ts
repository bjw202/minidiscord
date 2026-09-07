// 채널 진입점 기준 — 옛 transport-auth.test.ts 에서 전송 스킴 판정과 무관한 것만 옮겨 왔다 (v2 C1).
// 전송 판정(루프백 밖은 wss 만)은 사라졌으므로 여기서 재는 것은 넷이다: 토큰 게이트, stdout 침묵,
// stdio 는 접속과 무관하게 살아 있음, 그리고 채널 소스가 파일시스템을 읽지 않음.
import { describe, it, expect, afterEach } from 'vitest'
import { WebSocketServer } from 'ws'
import { spawn } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { resolveUrl } from '../src/index.js'

const cleanups: (() => Promise<void> | void)[] = []
afterEach(async () => { for (const c of cleanups.splice(0).reverse()) await c() })

// 빌드 산출물의 절대 경로. vitest 의 cwd 는 channel/ 이므로 상대 경로는 channel/channel/… 로 풀린다 —
// 자식이 아예 뜨지 않아 «접속 0건» 이 잘못된 이유로 통과한다. 형제 하네스(index-wiring.test.ts)와 같은 형태로 고정한다.
const DIST = fileURLToPath(new URL('../dist/index.js', import.meta.url))

// channel/src 의 모든 .ts 파일 절대 경로. 파일 목록을 하드코딩하지 않는다 —
// «파일이 정확히 N 개다» 는 시점에 묶여 썩는 기준이고, 새 파일이 생기면 조용히 검사를 벗어난다.
const SRC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')
const SRC_FILES = readdirSync(SRC_DIR).filter(f => f.endsWith('.ts')).map(f => path.join(SRC_DIR, f))

// 접속만 세는 스텁 서버 — 악수에는 답하지 않는다. 진입점이 «붙는가, 안 붙는가» 만 재기 때문이다.
// listen 은 비동기라 'listening' 뒤에야 address() 가 포트를 준다.
async function stubGateway() {
  const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 })
  await new Promise<void>(r => wss.once('listening', () => r()))
  let connections = 0
  const frames: Record<string, unknown>[] = []
  wss.on('connection', ws => {
    connections++
    ws.on('message', d => { try { frames.push(JSON.parse(String(d))) } catch { /* JSON 아님 — 무시 */ } })
  })
  cleanups.push(() => new Promise<void>(r => wss.close(() => r())))
  return {
    port: () => (wss.address() as { port: number }).port,
    connections: () => connections,
    frames,
  }
}

// 자식 프로세스. spawn 직후 수거를 등록한다 — 명령 끝의 kill 은 일찍 끝나는 경로에 닿지 않는다.
// stdout 도 함께 모은다 — stdout 은 MCP 전송 통로라 진단 한 글자도 실리면 안 된다.
function spawnChild(env: NodeJS.ProcessEnv) {
  const p = spawn(process.execPath, [DIST], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] })
  cleanups.push(() => { p.kill('SIGKILL') })
  let err = ''
  let out = ''
  p.stderr.on('data', d => { err += String(d) })
  p.stdout.on('data', d => { out += String(d) })
  return { proc: p, stderr: () => err, stdout: () => out }
}

async function waitFor(pred: () => boolean, label: string, ms = 3000): Promise<void> {
  const t0 = Date.now()
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`waitFor timeout: ${label}`)
    await new Promise(r => setTimeout(r, 10))
  }
}

// 부정 관측 전용 대기. 짝이 되는 양성 기준이 같은 하네스에서 수십 ms 안에 통과하므로 그 여러 배를 기다린 뒤 «오지 않았다» 를 잰다.
const settle = () => new Promise<void>(r => setTimeout(r, 400))

const INITIALIZE = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 't', version: '0' } },
}) + '\n'

describe('channel entry point', () => {
  it('imports no filesystem module anywhere under channel/src', () => {
    const offenders = SRC_FILES.filter(f => {
      const s = readFileSync(f, 'utf8')
      return /from\s+['"](node:)?fs(\/promises)?['"]/.test(s) || /require\(\s*['"](node:)?fs/.test(s)
    })
    expect(offenders).toEqual([])
    expect(SRC_FILES.length).toBeGreaterThan(0)   // 목록이 비면 검사가 공허해진다
  })

  it('resolveUrl reads the address without judging it', () => {
    expect(resolveUrl({ MINIDISCORD_SERVER: 'ws://192.168.0.7:3000/bot' } as NodeJS.ProcessEnv)).toBe('ws://192.168.0.7:3000/bot')
    expect(resolveUrl({} as NodeJS.ProcessEnv)).toBe('ws://127.0.0.1:3000/bot')
  })

  it('with a token it connects, sends hello, and keeps stdout silent', async () => {
    const stub = await stubGateway()
    const child = spawnChild({ MINIDISCORD_TOKEN: 't', MINIDISCORD_SERVER: `ws://127.0.0.1:${stub.port()}/bot` })
    await waitFor(() => stub.connections() === 1, '접속')
    await waitFor(() => stub.frames.some(f => f.type === 'hello'), 'hello 도착')
    expect(child.stdout()).toBe('')
    expect(child.proc.exitCode).toBeNull()
  })

  it('without a token it opens no connection but still answers over stdio', async () => {
    const stub = await stubGateway()
    const child = spawnChild({ MINIDISCORD_TOKEN: '', MINIDISCORD_SERVER: `ws://127.0.0.1:${stub.port()}/bot` })
    child.proc.stdin.write(INITIALIZE)
    await waitFor(() => child.stdout().includes('"result"'), 'stdio initialize 응답')
    await settle()
    expect(stub.connections()).toBe(0)
    expect(child.proc.exitCode).toBeNull()
  })

  it('with a token it answers over stdio while connected', async () => {
    const stub = await stubGateway()
    const child = spawnChild({ MINIDISCORD_TOKEN: 't', MINIDISCORD_SERVER: `ws://127.0.0.1:${stub.port()}/bot` })
    child.proc.stdin.write(INITIALIZE)
    await waitFor(() => child.stdout().includes('"result"'), 'stdio initialize 응답')
    await waitFor(() => stub.connections() === 1, '접속')
    // stdout 에는 MCP 응답만 있다 — 줄마다 JSON 이어야 한다
    for (const line of child.stdout().split('\n').filter(Boolean)) expect(() => JSON.parse(line)).not.toThrow()
  })

  it('an unreachable gateway does not kill the process; stdio still answers', async () => {
    // 아무도 듣지 않는 포트 — 먼저 열어 번호를 받고 곧장 닫는다
    const probe = new WebSocketServer({ host: '127.0.0.1', port: 0 })
    await new Promise<void>(r => probe.once('listening', () => r()))
    const port = (probe.address() as { port: number }).port
    await new Promise<void>(r => probe.close(() => r()))
    const child = spawnChild({ MINIDISCORD_TOKEN: 't', MINIDISCORD_SERVER: `ws://127.0.0.1:${port}/bot` })
    child.proc.stdin.write(INITIALIZE)
    await waitFor(() => child.stdout().includes('"result"'), 'stdio initialize 응답')
    await settle()
    expect(child.proc.exitCode).toBeNull()
    for (const line of child.stdout().split('\n').filter(Boolean)) expect(() => JSON.parse(line)).not.toThrow()
  })
})
