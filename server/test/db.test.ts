import { describe, it, expect } from 'vitest'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { openDb } from '../src/db.js'

function testDb() {
  return openDb(join(mkdtempSync(join(tmpdir(), 'md-')), 'test.db'))
}

type Col = { name: string; notnull: number; dflt_value: string | null; pk: number }

describe('openDb', () => {
  // AC-BOTMODEL-007 인프로세스 짝 — 표 목록에 bot_tokens 가 없고 bots·room_bots 가 있다 (REQ-BOTMODEL-003)
  it('creates all tables — bots and room_bots, never bot_tokens', () => {
    const db = testDb()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    const names = tables.map(t => t.name)
    for (const t of ['users', 'sessions', 'rooms', 'bots', 'room_bots', 'messages', 'message_targets', 'attachments']) {
      expect(names).toContain(t)
    }
    expect(names).not.toContain('bot_tokens')
  })

  // AC-BOTMODEL-009 — bots·room_bots 표 모양 (REQ-BOTMODEL-001 · REQ-BOTMODEL-002)
  it('AC-BOTMODEL-009: bots carries token UNIQUE NOT NULL and role DEFAULT worker; room_bots keys (room_id, bot_id) with a cursor', () => {
    const db = testDb()
    const bots = db.prepare('PRAGMA table_info(bots)').all() as Col[]
    const token = bots.find(c => c.name === 'token')
    const role = bots.find(c => c.name === 'role')
    expect(token).toBeDefined()
    expect(token!.notnull).toBe(1)
    expect(role).toBeDefined()
    expect(role!.notnull).toBe(1)
    expect(role!.dflt_value).toBe("'worker'")
    // UNIQUE 는 PRAGMA table_info 에 나오지 않는다 — 같은 토큰 두 번 INSERT 가 던지는가로 잰다
    db.prepare("INSERT INTO bots (name, token) VALUES ('a', 'tok')").run()
    expect(() => db.prepare("INSERT INTO bots (name, token) VALUES ('b', 'tok')").run()).toThrow()

    const rb = db.prepare('PRAGMA table_info(room_bots)').all() as Col[]
    expect(rb.map(c => c.name).sort()).toEqual(['bot_id', 'last_delivered_id', 'room_id'])
    const cursor = rb.find(c => c.name === 'last_delivered_id')!
    expect(cursor.notnull).toBe(1)
    expect(cursor.dflt_value).toBe('0')
    // 복합 기본키 — pk 열은 1-based 위치다: room_id 가 1, bot_id 가 2
    expect(rb.find(c => c.name === 'room_id')!.pk).toBe(1)
    expect(rb.find(c => c.name === 'bot_id')!.pk).toBe(2)
    // 같은 (room_id, bot_id) 는 두 번 들어가지 않는다 — INSERT OR IGNORE 가 멱등의 근거다
    const roomId = db.prepare("INSERT INTO rooms (name) VALUES ('r')").run().lastInsertRowid
    const botId = db.prepare("INSERT INTO bots (name, token) VALUES ('c', 'tok2')").run().lastInsertRowid
    db.prepare('INSERT OR IGNORE INTO room_bots (room_id, bot_id) VALUES (?, ?)').run(roomId, botId)
    db.prepare('INSERT OR IGNORE INTO room_bots (room_id, bot_id) VALUES (?, ?)').run(roomId, botId)
    expect((db.prepare('SELECT COUNT(*) c FROM room_bots').get() as { c: number }).c).toBe(1)
  })

  // AC-BOTMODEL-010 — bot_tokens 를 가진 v1 파일은 큰 소리로 거절된다 (REQ-BOTMODEL-003)
  it('AC-BOTMODEL-010: refuses a v1 file that carries bot_tokens and a token-less bots table', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'md-')), 'v1.db')
    const v1 = new Database(path)
    v1.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE bots (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')));
      CREATE TABLE bot_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, bot_id INTEGER NOT NULL, verifier_pub TEXT UNIQUE NOT NULL, server_confirm_key TEXT NOT NULL, last_delivered_id INTEGER NOT NULL DEFAULT 0, last_seen_at TEXT, revoked_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    `)
    v1.close()
    let err: Error | null = null
    try { openDb(path) } catch (e) { err = e as Error }
    expect(err).not.toBeNull()
    expect(err!.message).toContain('개발용 DB 파일을 지우고 새로 만드세요')
  })

  it('is idempotent (reopen same file)', () => {
    const db = testDb()
    db.prepare("INSERT INTO rooms (name) VALUES ('r1')").run()
    const path = db.name
    db.close()
    const db2 = openDb(path)
    const rows = db2.prepare('SELECT name FROM rooms').all() as { name: string }[]
    expect(rows).toEqual([{ name: 'r1' }])
  })
})
