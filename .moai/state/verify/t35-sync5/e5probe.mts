import { runExtract } from '../../../../server/test/live-extract-lib.ts'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TOKEN = '0123456789abcdef'.repeat(4)
const out = mkdtempSync(path.join(os.tmpdir(), 'e5probe-'))
writeFileSync(path.join(out, 'manifest.json'),
  JSON.stringify({ mcpServers: { 'minidiscord-channel': { env: { MINIDISCORD_TOKEN: TOKEN } } } }))
const code = runExtract({ out, db: null, transcriptDir: null, globalConfig: path.join(out, 'manifest.json'), processes: null })
const notes = readFileSync(path.join(out, 'extract-notes.txt'), 'utf8')
console.log('exit=' + code)
console.log('e5_branch_reached=' + notes.includes('unmeasured_path=e5_global_entry_changed'))
console.log('leaks_full_token=' + notes.includes(TOKEN))
console.log(notes.split('\n').filter(l => l.startsWith('entry_')).join('\n'))
