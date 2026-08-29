// 감사 프로브 A — 실제 조립된 서버의 라우트 전수 열거
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const dir = mkdtempSync(join(tmpdir(), 'authz-probe-'))
process.env.MINIDISCORD_DATA_DIR = dir
process.env.MINIDISCORD_UPLOADS_DIR = join(dir, 'up')
const { buildServer } = await import('../../../../server/src/index.js')
const app = await buildServer()
await app.ready()
console.log('ROUTES>>>')
console.log(app.printRoutes({ commonPrefix: false }))
await app.close()
