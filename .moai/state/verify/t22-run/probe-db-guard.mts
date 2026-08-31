// M1 실측 프로브 — §D-3 판정(개발용 DB 재생성 + 옛 모양 거절)이 실제로 그렇게 동작하는가.
// 1) 새 DB: bot_tokens 에 verifier_pub·server_confirm_key 가 있고 token_hash 는 없다
// 2) v1 모양 DB: openDb 가 큰 소리로 거절한다
// 3) 발급 INSERT 모양(room_id, bot_id, verifier_pub, server_confirm_key)이 새 스키마에 들어간다
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { openDb } from '../../../../server/src/db.ts'

const dir = mkdtempSync(join(tmpdir(), 't22-m1-'))

// 1) 새 DB
const fresh = openDb(join(dir, 'fresh.db'))
const cols = (fresh.prepare('PRAGMA table_info(bot_tokens)').all() as { name: string }[]).map(c => c.name)
console.log('fresh columns:', JSON.stringify(cols.sort()))
if (!cols.includes('verifier_pub') || !cols.includes('server_confirm_key')) throw new Error('fresh DB missing v2 columns')
if (cols.includes('token_hash')) throw new Error('token_hash survived in fresh DB')

// 2) v1 모양 DB — 스키마를 v1 그대로 수동으로 만든 뒤 openDb
const oldPath = join(dir, 'v1.db')
const legacy = new Database(oldPath)
legacy.exec(`CREATE TABLE bot_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  bot_id INTEGER NOT NULL REFERENCES bots(id),
  token_hash TEXT UNIQUE NOT NULL,
  last_delivered_id INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT, revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`)
legacy.close()
let rejected = 'NOT REJECTED'
try { openDb(oldPath) } catch (e) { rejected = String((e as Error).message) }
console.log('v1-shaped DB rejection:', rejected)
if (!rejected.includes('SPEC-GWAUTH-002')) throw new Error('v1-shaped DB was not rejected')

// 3) 발급 INSERT 모양
const room = fresh.prepare("INSERT INTO rooms (name) VALUES ('r')").run()
const bot = fresh.prepare("INSERT INTO bots (name) VALUES ('b')").run()
fresh.prepare('INSERT INTO bot_tokens (room_id, bot_id, verifier_pub, server_confirm_key) VALUES (?, ?, ?, ?)')
  .run(room.lastInsertRowid, bot.lastInsertRowid, 'ab'.repeat(32), 'cd'.repeat(32))
const row = fresh.prepare('SELECT verifier_pub, server_confirm_key FROM bot_tokens').get() as { verifier_pub_unused?: string }
console.log('issuance INSERT shape: OK, row keys:', JSON.stringify(Object.keys(row)))
console.log('PROBE PASS')
