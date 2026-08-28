// sync-audit probe: does the built entry point actually refuse a non-ws scheme on loopback,
// stay alive, print exactly one stderr line, and write nothing to stdout?
import { spawn } from 'node:child_process'
const DIST = process.argv[2]
const url = process.argv[3]
const env = { ...process.env, MINIDISCORD_TOKEN: 't', MINIDISCORD_SERVER: url }
const c = spawn(process.execPath, [DIST], { env, stdio: ['pipe', 'pipe', 'pipe'] })
let out = '', err = ''
c.stdout.on('data', d => { out += d })
c.stderr.on('data', d => { err += d })
setTimeout(() => {
  console.log('URL>>>' + url)
  console.log('EXITCODE>>>' + c.exitCode)
  console.log('STDOUT_LEN>>>' + out.length)
  console.log('STDERR>>>' + JSON.stringify(err))
  console.log('STDERR_LINES>>>' + err.split('\n').filter(Boolean).length)
  c.kill('SIGKILL')
}, 1500)
