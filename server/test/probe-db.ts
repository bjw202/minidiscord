// AC-CORE-010/011 검증 보조 — 인라인 `tsx -e` 형태가 [eval] 컨텍스트에서 상대 import를
// 해석하지 못해(no-listen.ts와 동일한 파일 실행 형식으로 대체) WAL 저널 모드와 idx_ 인덱스를
// 관측한다 (vitest 실행 대상 아님).
import { openDb } from '../src/db.js'

const wal = openDb('/tmp/md-wal.db')
console.log(wal.pragma('journal_mode', { simple: true }))

const idx = openDb('/tmp/md-idx.db')
const rows = idx
  .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name")
  .all() as { name: string }[]
console.log(rows.map(r => r.name).join(','))
