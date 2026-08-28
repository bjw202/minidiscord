// M4 재진입 프로브 — 구현된 dist 진입점의 세 거부 갈래 stderr 원문 포착 (§G «거부 사유 세 갈래» 행).
// dist 자식을 세 개 띄워 각각의 stderr를 모으고 finally 에서 확실히 거둔다 (수거 보장).
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../channel/dist/index.js')
const CASES = [
  ['(i) 해석 불가', 'not a url'],
  ['(ii) 루프백 + http:', 'http://127.0.0.1:3000/bot'],
  ['(iii) 비루프백 평문 ws:', 'ws://remote.example.test/bot'],
]

const children = []
for (const [label, server] of CASES) {
  const p = spawn(process.execPath, [DIST], {
    env: { ...process.env, MINIDISCORD_TOKEN: 't', MINIDISCORD_SERVER: server },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  children.push(p)
  let err = ''
  p.stderr.on('data', d => { err += String(d) })
  await new Promise(r => setTimeout(r, 700))
  console.log(`${label} MINIDISCORD_SERVER=${JSON.stringify(server)}`)
  console.log(`STDERR>>>"${err}"`)
  console.log(`STDERR_LINES>>>${err.split('\n').filter(Boolean).length}`)
  console.log(`HAS_WS>>>${err.includes('ws://')}  HAS_WSS>>>${err.includes('wss://')}  HAS_NONLOOPBACK_WORD>>>${err.includes('비루프백')}`)
  console.log('---')
}
for (const p of children) p.kill('SIGKILL')
