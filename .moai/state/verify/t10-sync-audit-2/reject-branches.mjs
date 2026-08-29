// [AUDIT] dist 진입점의 거부 갈래 세 가지를 실제 자식 프로세스로 띄워 stderr 원문을 관측한다.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../../../../channel/dist/index.js', import.meta.url))

const CASES = [
  ['(i) 해석 불가', 'not a url'],
  ['(ii) 루프백 + 비 ws 스킴 (http)', 'http://127.0.0.1:3000/bot'],
  ['(ii) 루프백 + 비 ws 스킴 (https, localhost)', 'https://localhost:3000/bot'],
  ['(ii) 루프백 + 비 ws 스킴 (IPv6)', 'http://[::1]:3000/bot'],
  ['(iii) 비루프백 평문', 'ws://example.com:3000/bot'],
]

for (const [label, url] of CASES) {
  const env = { ...process.env }
  delete env.MINIDISCORD_SERVER
  env.MINIDISCORD_TOKEN = 't'
  env.MINIDISCORD_SERVER = url
  const child = spawn(process.execPath, [DIST], { env, stdio: ['pipe', 'pipe', 'pipe'] })
  let out = '', err = ''
  child.stdout.on('data', d => { out += String(d) })
  child.stderr.on('data', d => { err += String(d) })
  await new Promise(r => setTimeout(r, 900))
  console.log('CASE>>>' + label)
  console.log('URL>>>' + url)
  console.log('EXITCODE>>>' + child.exitCode)
  console.log('STDOUT_LEN>>>' + out.length)
  console.log('STDERR>>>' + JSON.stringify(err))
  console.log('STDERR_LINES>>>' + err.split('\n').filter(Boolean).length)
  console.log('---')
  child.kill('SIGKILL')
}
process.exit(0)
