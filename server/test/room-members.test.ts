// SPEC-ROOMAUTHZ-001 M1 — 스키마와 이행 (AC-ROOMAUTHZ-001·002·003)
// 공통 하네스(acceptance.md) 중 이 기준들이 쓰는 부분. 라우트 레벨 하네스
// (signUp/build 등)는 그것을 처음 쓰는 M2 가 이어서 채운다 — registerEventRoute 가
// M3 에서 만들어지므로 지금 통째로 두면 모듈 부재 임포트 실패가 된다.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb, type Db } from '../src/db.js'

let dir: string
let db: Db

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'md-authz-')); db = openDb(join(dir, 't.db')) })
afterEach(() => {
  db.close()
  rmSync(dir, { recursive: true, force: true })
})

function memberCount(roomId: number): number {
  return (db.prepare('SELECT COUNT(*) c FROM room_members WHERE room_id = ?').get(roomId) as { c: number }).c
}

describe('room membership schema and migration', () => {
  // AC-ROOMAUTHZ-001 — 스키마가 중복 멤버십을 표 차원에서 막는다
  it('schema carries room_members with a composite key and rooms.created_by', async () => {
    const cols = db.prepare('PRAGMA table_info(rooms)').all() as { name: string }[]
    expect(cols.map(c => c.name)).toContain('created_by')

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    expect(tables.map(t => t.name)).toEqual(expect.arrayContaining(['room_members', 'schema_migrations']))

    const u = db.prepare("INSERT INTO users (username, password_hash) VALUES ('u','x')").run().lastInsertRowid
    const r = db.prepare("INSERT INTO rooms (name) VALUES ('R')").run().lastInsertRowid
    db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(r, u)
    // 같은 짝을 두 번 넣으면 표가 거부한다 — 응용 코드의 조회-후-삽입에 기대지 않는다
    expect(() => db.prepare('INSERT INTO room_members (room_id, user_id) VALUES (?, ?)').run(r, u)).toThrow()
    expect(memberCount(r as number)).toBe(1)
  })

  // AC-ROOMAUTHZ-002 — 이미 돌고 있던 DB 에도 컬럼이 생긴다
  it('adds created_by to an already-existing rooms table without losing rows', async () => {
    const p = join(dir, 'legacy.db')
    // 옛 모양을 손으로 만든다 — SCHEMA 상수를 쓰지 않는다
    const legacy = new (await import('better-sqlite3')).default(p)
    legacy.exec(`CREATE TABLE rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT (datetime('now')), archived_at TEXT);
      CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));`)
    legacy.prepare("INSERT INTO rooms (name) VALUES ('옛 방')").run()
    legacy.prepare("INSERT INTO users (username, password_hash) VALUES ('old','x')").run()
    legacy.close()

    const up = openDb(p)
    const cols = (up.prepare('PRAGMA table_info(rooms)').all() as { name: string }[]).map(c => c.name)
    expect(cols).toContain('created_by')
    // 기존 행이 살아 있고 새 컬럼은 NULL 이다 — 지어낸 값을 넣지 않는다
    const row = up.prepare('SELECT name, created_by FROM rooms').get() as { name: string; created_by: number | null }
    expect(row.name).toBe('옛 방')
    expect(row.created_by).toBeNull()
    up.close()
  })

  // AC-ROOMAUTHZ-003 — 백필은 한 번만 돌고, 두 번째부터는 아무것도 하지 않는다
  it('backfills every room x user exactly once and never resurrects removed rows', async () => {
    const p = join(dir, 'bf.db')
    const seed = openDb(p)                                     // 먼저 정상 스키마로 열어 둔다
    seed.prepare('DELETE FROM schema_migrations').run()         // 백필이 아직 안 돈 상태로 되돌린다
    seed.prepare('DELETE FROM room_members').run()
    seed.prepare("INSERT INTO rooms (name) VALUES ('A'), ('B')").run()
    seed.prepare("INSERT INTO users (username, password_hash) VALUES ('a','x'), ('b','x')").run()
    seed.close()

    const first = openDb(p)                                    // 1차 개방 — 백필이 돈다
    const all = (first.prepare('SELECT COUNT(*) c FROM room_members').get() as { c: number }).c
    expect(all).toBe(4)                                        // 방 2 × 사람 2
    expect((first.prepare("SELECT COUNT(*) c FROM schema_migrations WHERE name='roomauthz-001-backfill'")
      .get() as { c: number }).c).toBe(1)
    // 한 사람이 한 방을 떠났다고 가정한다
    first.prepare('DELETE FROM room_members WHERE room_id = 1 AND user_id = 2').run()
    first.close()

    const second = openDb(p)                                   // 2차 개방 — 아무것도 하지 않아야 한다
    expect((second.prepare('SELECT COUNT(*) c FROM room_members').get() as { c: number }).c).toBe(3)
    second.close()
  })
})
